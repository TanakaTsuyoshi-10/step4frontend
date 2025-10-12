#!/bin/bash
set -euo pipefail
APP_NAME="app-002-gen10-step3-1-node-oshima30"
RG_NAME="rg-001-gen10"
APP_URL="https://${APP_NAME}.azurewebsites.net"
ZIP_PATH="$(pwd)/release.zip"

echo "== Clean build =="
rm -rf node_modules .next
npm ci
NODE_ENV=production npm run build
test -f .next/standalone/server.js || { echo "server.js not found"; exit 1; }
test -d .next/static || { echo ".next/static not found"; exit 1; }
rm -rf .next/standalone/.next/static || true

echo "== ZIP =="
rm -f "$ZIP_PATH"
zip -r "$ZIP_PATH" .next/standalone .next/static public package.json > /dev/null
unzip -l "$ZIP_PATH" | egrep "standalone/|\.next/static" | head -n 30

echo "== Azure settings =="
az webapp config set --resource-group "$RG_NAME" --name "$APP_NAME" \
  --startup-file "PATH=\"\$PATH:/home/site/wwwroot\" node .next/standalone/server.js"
az webapp config appsettings set --resource-group "$RG_NAME" --name "$APP_NAME" \
  --settings WEBSITE_NODE_DEFAULT_VERSION=~18 SCM_DO_BUILD_DURING_DEPLOYMENT=false

echo "== Clean deploy =="
if az webapp deploy --help >/dev/null 2>&1; then
  az webapp deploy --resource-group "$RG_NAME" --name "$APP_NAME" \
    --src-path "$ZIP_PATH" --type zip --restart true --clean true
else
  az webapp deployment source config-zip \
    --resource-group "$RG_NAME" --name "$APP_NAME" --src "$ZIP_PATH"
  az webapp restart --resource-group "$RG_NAME" --name "$APP_NAME"
fi

echo "== Verify =="
sleep 35
echo "— Root"; curl -sI "$APP_URL" | egrep -i "HTTP/|content-type"
JS_PATH=$(curl -s $APP_URL | grep -oE '/_next/static/chunks/[^"'"'"']+\.js' | head -n1)
CSS_PATH=$(curl -s $APP_URL | grep -oE '/_next/static/css/[^"'"'"']+\.css' | head -n1)
[ -n "$JS_PATH" ] && echo "— JS: $JS_PATH" && curl -sI "$APP_URL$JS_PATH" | egrep -i "HTTP/|content-type" || echo "⚠️ JS not detected"
[ -n "$CSS_PATH" ] && echo "— CSS: $CSS_PATH" && curl -sI "$APP_URL$CSS_PATH" | egrep -i "HTTP/|content-type" || echo "⚠️ CSS not detected"