#!/bin/bash
# ============================================================
# 🧰 Next.js Standalone フロントエンド再デプロイ＆検証スクリプト
# ------------------------------------------------------------
# 目的:
#  - /_next/static の 404 / MIME 不整合を完全修正
#  - 正常な standalone 構成で再デプロイ
#  - Azure App Service 上でCSS/JSが200応答を確認
# ------------------------------------------------------------
# 前提:
#  - Azure CLI ログイン済み（az login）
#  - リソースグループ名を <RG_NAME> に置き換える
#  - 実行場所: /Users/tanakatsuyoshi/Desktop/POSappfront
# ============================================================

APP_NAME="app-002-gen10-step3-1-node-oshima30"
RG_NAME="rg-001-gen10"   # ★リソースグループ名に変更する
ZIP_NAME="../pos-frontend-standalone.zip"

echo "=== Step 1. ローカル環境チェック ===================================="

if [ ! -d ".next" ]; then
  echo "⚠️ .next フォルダが存在しません。ビルドを実行します。"
  npm ci && npm run build
fi

echo "✅ .next フォルダ確認:"
ls -l .next | head -n 10

echo "✅ .next/static フォルダ確認:"
ls -l .next/static 2>/dev/null || echo "⚠️ .next/static が存在しません。ビルド不完全の可能性あり。"

# ============================================================
echo "=== Step 2. ZIP パッケージ再生成 ===================================="
# ============================================================
rm -f "$ZIP_NAME"
zip -r "$ZIP_NAME" .next/standalone .next/static public package.json > /dev/null

echo "✅ ZIP作成完了: $ZIP_NAME"
unzip -l "$ZIP_NAME" | grep ".next/static" | head -n 10

# ============================================================
echo "=== Step 3. Azure 設定確認・再設定 =================================="
# ============================================================

echo "⚙️ Azure App Service 設定更新中..."
az webapp config set \
  --resource-group "$RG_NAME" \
  --name "$APP_NAME" \
  --startup-file "node .next/standalone/server.js" > /dev/null

az webapp config appsettings set \
  --resource-group "$RG_NAME" \
  --name "$APP_NAME" \
  --settings WEBSITE_NODE_DEFAULT_VERSION=~18 SCM_DO_BUILD_DURING_DEPLOYMENT=false > /dev/null

echo "✅ 起動コマンド設定済み: node .next/standalone/server.js"
echo "✅ Node 18 LTS / ビルド無効設定済み"

# ============================================================
echo "=== Step 4. ZIP デプロイ実行 ========================================"
# ============================================================
az webapp deployment source config-zip \
  --resource-group "$RG_NAME" \
  --name "$APP_NAME" \
  --src "$ZIP_NAME" > /dev/null

if [ $? -eq 0 ]; then
  echo "✅ デプロイ成功"
else
  echo "❌ デプロイに失敗しました"
  exit 1
fi

# ============================================================
echo "=== Step 5. App Service 再起動 ======================================"
# ============================================================
az webapp restart \
  --resource-group "$RG_NAME" \
  --name "$APP_NAME" > /dev/null

echo "🔁 再起動完了。起動中のログを確認します..."
sleep 20

# ============================================================
echo "=== Step 6. 検証 (curl テスト) ======================================="
# ============================================================
ROOT_URL="https://${APP_NAME}.azurewebsites.net"

echo "🌐 トップページ応答確認:"
curl -I "$ROOT_URL" | grep -E "HTTP|Content-Type"

echo "🌐 JS アセット応答確認:"
curl -sI "$ROOT_URL/_next/static/chunks/main-app.js" | grep -E "HTTP|Content-Type"

echo "🌐 CSS アセット応答確認:"
curl -sI "$ROOT_URL/_next/static/css/*.css" | grep -E "HTTP|Content-Type"

# ============================================================
echo "=== Step 7. 結果要約 ================================================"
# ============================================================
echo ""
echo "📋 期待される結果:"
echo " - HTML: HTTP/2 200 OK"
echo " - JS:   HTTP/2 200 OK + Content-Type: application/javascript"
echo " - CSS:  HTTP/2 200 OK + Content-Type: text/css"
echo ""
echo "💡 次の確認項目:"
echo " - ブラウザで ${ROOT_URL} を開き、画面が正常に描画されること"
echo " - ブラウザ開発ツール > Network で MIME タイプを確認"
echo " - App Service → 開発ツール → SSH にて .next/static が存在することを確認"
echo ""
echo "✅ 完了: /_next/static 404 問題を修正するための完全デプロイが実行されました。"