#!/bin/bash
# ============================================================
# ✅ Next.js Standalone 正しい構成でのクリーン再デプロイ & 検証
# 目的: /_next/static 404 を「静的資産の配置場所修正 + クリーン配置」で必ず解消
# 前提:
#   - 実行場所: /Users/tanakatsuyoshi/Desktop/POSappfront
#   - az login 済み / <RG_NAME> を置換
# ============================================================

set -euo pipefail

APP_NAME="app-002-gen10-step3-1-node-oshima30"
RG_NAME="rg-001-gen10"
APP_URL="https://${APP_NAME}.azurewebsites.net"
ZIP_PATH="../pos-frontend-standalone.zip"

cd /Users/tanakatsuyoshi/Desktop/POSappfront

echo "== 1) ビルド構成の是正（.next/static はルート直下、standalone 配下に置かない） =="
# next.config.js: output:'standalone' は前提。必要なら追記。
if ! grep -q "output:[[:space:]]*'standalone'" next.config.js 2>/dev/null; then
  cat > next.config.js <<'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  output: 'standalone',
};
module.exports = nextConfig;
EOF
fi

# start は node .next/standalone/server.js に固定
node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync('package.json','utf8'));p.scripts=p.scripts||{};p.scripts.build='next build';p.scripts.start='node .next/standalone/server.js';p.engines=p.engines||{};p.engines.node='18.x';fs.writeFileSync('package.json',JSON.stringify(p,null,2));"

# クリーンビルド
rm -rf .next node_modules
npm ci
NODE_ENV=production npm run build

# 念のため、過去に .next/static を standalone 側に入れていたなら削除
if [ -d ".next/standalone/.next/static" ]; then
  echo "⚠️ .next/standalone/.next/static を削除（誤配置）"
  rm -rf .next/standalone/.next/static
fi

test -f .next/standalone/server.js || { echo "❌ server.js 不在。build 失敗の可能性"; exit 1; }
test -d .next/static || { echo "❌ .next/static 不在。build 失敗の可能性"; exit 1; }

echo "== 2) 正しい内容で ZIP 作成（standalone + static + public + package.json） =="
rm -f "$ZIP_PATH"
zip -r "$ZIP_PATH" .next/standalone .next/static public package.json > /dev/null
unzip -l "$ZIP_PATH" | egrep "standalone/|\.next/static" | head -n 20

echo "== 3) App Service をクリーンにしてから ZIP 配置 =="
# 3-1) Kudu API で wwwroot を一旦空にする（古いファイルを残さない）
#  Kudu ベーシック認証が有効な場合は要トークン。簡便化のため az webapp deploy の --clean を使う方法を採用。
#  az webapp deploy は新CLI(2.60+)で利用可。無ければ config-zip の前に Kudu で手動削除してください。

# 3-2) 起動コマンド & AppSettings を明示設定
az webapp config set \
  --resource-group "$RG_NAME" \
  --name "$APP_NAME" \
  --startup-file "PATH=\"$PATH:/home/site/wwwroot\" node .next/standalone/server.js" >/dev/null

az webapp config appsettings set \
  --resource-group "$RG_NAME" \
  --name "$APP_NAME" \
  --settings WEBSITE_NODE_DEFAULT_VERSION=~18 SCM_DO_BUILD_DURING_DEPLOYMENT=false >/dev/null

# 3-3) クリーンデプロイ（可能なら --clean true を使用）
if az webapp deploy --help >/dev/null 2>&1; then
  echo "➡ az webapp deploy (clean) を使用"
  az webapp deploy \
    --resource-group "$RG_NAME" \
    --name "$APP_NAME" \
    --src-path "$ZIP_PATH" \
    --type zip \
    --restart true \
    --clean true >/dev/null
else
  echo "➡ 旧CLI: config-zip を使用（必要なら Kudu で手動削除）"
  az webapp deployment source config-zip \
    --resource-group "$RG_NAME" \
    --name "$APP_NAME" \
    --src "$ZIP_PATH" >/dev/null
  az webapp restart --resource-group "$RG_NAME" --name "$APP_NAME" >/dev/null
fi

echo "== 4) 反映待ち …"
sleep 35

echo "== 5) 検証（/_next/static が 200 & 正しい Content-Type になること） =="
echo "— ルート応答"; curl -sI "${APP_URL}" | egrep -i "HTTP/|content-type"
# 動的に1本拾って検証
JS_PATH="$(curl -s ${APP_URL} | grep -oE '/_next/static/chunks/[^\"'"'"']+\.js' | head -n1)"
CSS_PATH="$(curl -s ${APP_URL} | grep -oE '/_next/static/css/[^\"'"'"']+\.css' | head -n1)"
[ -n "$JS_PATH" ] && { echo "— JS: ${JS_PATH}"; curl -sI "${APP_URL}${JS_PATH}" | egrep -i "HTTP/|content-type"; } || echo "JS 自動検出不可"
[ -n "$CSS_PATH" ] && { echo "— CSS: ${CSS_PATH}"; curl -sI "${APP_URL}${CSS_PATH}" | egrep -i "HTTP/|content-type"; } || echo "CSS 自動検出不可"

echo "== 6) 期待結果 =="
cat <<'EOS'
- / : 200
- /_next/static/chunks/*.js : 200 + Content-Type: application/javascript
- /_next/static/css/*.css   : 200 + Content-Type: text/css
EOS