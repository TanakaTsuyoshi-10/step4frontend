#!/usr/bin/env bash
# one-shot fixer for Next.js on Azure Web App (standalone + Actions整理)
# 目的:
#  1) GitHub Actions を 1本(redeploy.yml)に集約、不要yml削除
#  2) 過去レポート等のローカル不要ファイルを整理
#  3) Next.js(standalone)の静的アセット404/MIME不整合を根治
#  4) Azure App Service へ再デプロイ
set -euo pipefail

### ====== 設定（必要に応じて変更）======
APP="app-002-gen10-step3-1-node-oshima30"
RG="rg-001-gen10"
BRANCH="main"
APP_URL="https://${APP}.azurewebsites.net"

# 削除する不要yml（残したいのが redeploy.yml 前提）
UNNEEDED_YML=".github/workflows/deploy-frontend.yml"

# ローカルで削除する不要ファイル/レポート（必要なら調整）
PRUNE_PATTERNS=(
  "REPORT*.md"
  "SECURITY_REPORT*.md"
  "FINAL_DEPLOYMENT_SUMMARY*.md"
  "deployment_summary*.md"
  "REDEPLOY*.md"
)

# Git user（未設定なら軽く入れておく）
GIT_NAME="${GIT_NAME:-TanakaTsuyoshi-10}"
GIT_EMAIL="${GIT_EMAIL:-you@example.com}"
### ====================================

echo "== 0) 位置確認 =="
pwd

echo "== 1) GitHub Actions を 1本化（redeploy.ymlだけ残す）=="
mkdir -p .github/workflows
# 1-1) redeploy.yml を上書き生成（Publish Profile方式／Node18でビルド→ZIP→Deploy）
cat > .github/workflows/redeploy.yml <<'YAML'
name: Deploy Frontend to Azure App Service (standalone-complete)

on:
  workflow_dispatch:
  push:
    branches: [ "main" ]
    paths:
      - "src/**"
      - "public/**"
      - "package.json"
      - "package-lock.json"
      - "next.config.js"
      - "middleware.*"
      - ".github/workflows/redeploy.yml"

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Use Node.js 18 LTS
        uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: 'npm'

      - name: Install deps (clean)
        run: npm ci

      - name: Build (Next.js standalone)
        run: npm run build

      # 静的アセットを確実に解決（server.js と .next が同階層にある前提運用）
      - name: Prepare server.js & static assets layout
        run: |
          set -eux
          # ルートに server.js がなければ .next/standalone から持ってくる
          if [ ! -f server.js ] && [ -f .next/standalone/server.js ]; then
            cp -f .next/standalone/server.js ./server.js
          fi
          # .next/static を二重で持たせる（ルート直下 & standalone側の両方）
          if [ -d .next/static ]; then
            mkdir -p .next/standalone/.next
            rsync -a .next/static/ .next/standalone/.next/static/ || true
          fi

      - name: Make release.zip (server.js + .next + public + package.json)
        run: |
          set -eux
          rm -f release.zip
          zip -r release.zip server.js .next public package.json > /dev/null
          unzip -l release.zip | head -n 50

      - name: Deploy to Azure WebApp (Publish Profile)
        uses: azure/webapps-deploy@v3
        with:
          app-name: app-002-gen10-step3-1-node-oshima30
          publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }}
          package: release.zip

      - name: Post-check (root + one static)
        run: |
          set -eux
          URL="https://app-002-gen10-step3-1-node-oshima30.azurewebsites.net"
          curl -sI "$URL" | egrep -i "HTTP/|content-type" || true
          JS=$(curl -s "$URL" | grep -oE '/_next/static/[^"]+\.js' | head -n1 || true)
          CSS=$(curl -s "$URL" | grep -oE '/_next/static/[^"]+\.css' | head -n1 || true)
          if [ -n "$JS" ]; then curl -sI "$URL$JS" | egrep -i "HTTP/|content-type" || true; fi
          if [ -n "$CSS" ]; then curl -sI "$URL$CSS" | egrep -i "HTTP/|content-type" || true; fi
YAML

# 1-2) 不要なymlを削除
if [ -f "${UNNEEDED_YML}" ]; then
  git rm -f "${UNNEEDED_YML}" || true
fi

echo "== 2) ローカル不要レポートの整理 =="
for pat in "${PRUNE_PATTERNS[@]}"; do
  find . -maxdepth 1 -name "${pat}" -print -exec rm -f {} \; || true
done

echo "== 3) Node 18 を推奨（nvmがあれば切替） =="
if command -v nvm >/dev/null 2>&1; then
  nvm install 18 >/dev/null
  nvm use 18
fi
node -v
npm -v

echo "== 4) クリーンビルド (standalone) =="
rm -rf .next node_modules release.zip || true
npm ci
npm run build

# server.js とアセットの位置関係を確定
echo "== 5) server.js/静的アセット配置調整 =="
if [ ! -f server.js ] && [ -f .next/standalone/server.js ]; then
  cp -f .next/standalone/server.js ./server.js
fi
if [ -d .next/static ]; then
  mkdir -p .next/standalone/.next
  rsync -a .next/static/ .next/standalone/.next/static/ || true
fi

echo "== 6) Azure 起動コマンド/Nodeバージョン固定 =="
az webapp config set \
  --resource-group "$RG" \
  --name "$APP" \
  --startup-file "PATH=\"\$PATH:/home/site/wwwroot\" node server.js" >/dev/null

az webapp config appsettings set \
  --resource-group "$RG" \
  --name "$APP" \
  --settings WEBSITE_NODE_DEFAULT_VERSION=~18 SCM_DO_BUILD_DURING_DEPLOYMENT=false >/dev/null

echo "== 7) ZIP作成（Azureに置く実体） =="
rm -f release.zip
zip -r release.zip server.js .next public package.json > /dev/null
unzip -l release.zip | head -n 50

echo "== 8) まずローカルから即時デプロイ（検証反映を優先）=="
az webapp deploy \
  --resource-group "$RG" \
  --name "$APP" \
  --src-path release.zip \
  --type zip \
  --restart true \
  --clean true >/dev/null

echo "== 9) 動作検証（ルート＆/_next/static）=="
sleep 5
echo "→ Root"
curl -sI "$APP_URL" | egrep -i "HTTP/|content-type" || true
JS=$(curl -s "$APP_URL" | grep -oE '/_next/static/[^"]+\.js' | head -n1 || true)
CSS=$(curl -s "$APP_URL" | grep -oE '/_next/static/[^"]+\.css' | head -n1 || true)
if [ -n "$JS" ]; then
  echo "→ JS: $JS"
  curl -sI "$APP_URL$JS" | egrep -i "HTTP/|content-type" || true
else
  echo "⚠️ JSが検出できませんでした"
fi
if [ -n "$CSS" ]; then
  echo "→ CSS: $CSS"
  curl -sI "$APP_URL$CSS" | egrep -i "HTTP/|content-type" || true
else
  echo "⚠️ CSSが検出できませんでした"
fi

echo "== 10) 変更をGitにコミット & Push（Actionsを1本化）=="
git config user.name "$GIT_NAME"
git config user.email "$GIT_EMAIL"
git add -A
git commit -m "ci: consolidate to redeploy.yml; clean reports; fix standalone layout; set Azure startup to 'node server.js'"
git push origin "$BRANCH"

cat <<MSG

✅ 完了：
- Actionsは「.github/workflows/redeploy.yml」だけに統一（${UNNEEDED_YML} は削除）
- 過去レポートなど不要ファイルを整理
- server.js と .next/static の並びを調整し、Azure起動を "node server.js" に固定
- ZIPデプロイ済み（即時反映）。GitHub Actions も以後は redeploy.yml が走ります

📌 確認ポイント：
- ルート: ${APP_URL} が 200
- /_next/static の JS/CSS が 200 かつ Content-Type が text/css / application/javascript

問題が残る場合は、直近の `az webapp log tail -n ${APP} -g ${RG}` と
ブラウザの Network タブのレスポンスヘッダーを共有してください。
MSG