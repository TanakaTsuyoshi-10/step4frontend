#!/bin/bash
# ============================================================
# 🔧 Next.js Standalone 再デプロイ修正スクリプト（server.js 不在を解消）
# ------------------------------------------------------------
# 症状:
#   Error: Cannot find module '/home/site/wwwroot/.next/standalone/server.js'
# 原因:
#   デプロイ物に .next/standalone が含まれていない（= server.js が存在しない）
# 対応:
#   ローカルで standalone ビルド → .next/standalone/.next/static を含むZIPを再作成 → ZIPデプロイ
#   App Service の起動コマンドを "node .next/standalone/server.js" に固定
# 前提:
#   - 実行場所: /Users/tanakatsuyoshi/Desktop/POSappfront
#   - Azure CLI ログイン済み（az login）
#   - <RG_NAME> を自分のリソースグループ名に変更
# ============================================================

set -euo pipefail

APP_NAME="app-002-gen10-step3-1-node-oshima30"
RG_NAME="rg-001-gen10"   # ★リソースグループ名に変更
APP_URL="https://${APP_NAME}.azurewebsites.net"
ZIP_PATH="../pos-frontend-standalone.zip"

echo "===[0] ワーキングディレクトリ移動======================================"
cd /Users/tanakatsuyoshi/Desktop/POSappfront

echo "===[1] Next.js 設定の強制整合（standalone 出力 / 起動コマンド）========="
# next.config.js: output:'standalone' を確実に設定
if [ ! -f next.config.js ]; then
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
  echo "  - next.config.js を新規作成（standalone 有効化）"
else
  # 既存 next.config.js に output:'standalone' が無ければ追記
  if ! grep -q "output:[[:space:]]*'standalone'" next.config.js; then
    # ざっくり末尾の export 直前に差し込む
    tmpfile=$(mktemp)
    awk '
      /module\.exports/ && !inserted {
        print "  output: '\''standalone'\'',"
        inserted=1
      }
      {print}
    ' next.config.js > "$tmpfile" || true
    mv "$tmpfile" next.config.js
    echo "  - next.config.js に output:'standalone' を追加"
  else
    echo "  - next.config.js: output:'standalone' は既に設定済み"
  fi
fi

# package.json: start を standalone server に固定
node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync('package.json','utf8'));p.scripts=p.scripts||{};p.scripts.build='next build';p.scripts.start='node .next/standalone/server.js';p.engines=p.engines||{};p.engines.node='18.x';fs.writeFileSync('package.json',JSON.stringify(p,null,2));console.log('  - package.json: start を standalone に設定');"

# 必要なら PWA manifest を配置（404回避のため）
mkdir -p public
if [ ! -f public/manifest.json ]; then
  cat > public/manifest.json <<'M'
{ "name": "POS App", "short_name":"POS", "start_url": "/", "display": "standalone", "icons": [] }
M
  echo "  - public/manifest.json を作成"
fi

echo "===[2] クリーンビルド（standalone 生成）==============================="
rm -rf node_modules .next
npm ci
NODE_ENV=production npm run build

echo "  - ビルド成果物の存在確認"
test -f .next/standalone/server.js || { echo "❌ .next/standalone/server.js が生成されていません。build 失敗の可能性"; exit 1; }
test -d .next/static || { echo "❌ .next/static が見つかりません。build 失敗の可能性"; exit 1; }

echo "===[3] デプロイ ZIP 再生成（standalone + static + public + package.json）==="
rm -f "$ZIP_PATH"
zip -r "$ZIP_PATH" .next/standalone .next/static public package.json > /dev/null
echo "  - 作成ZIP: $ZIP_PATH"
echo "  - ZIP 同梱確認（先頭10件表示）"
unzip -l "$ZIP_PATH" | sed -n '1,200p' | head -n 50

echo "===[4] Azure 起動コマンド / AppSettings を再設定======================="
az webapp config set \
  --resource-group "$RG_NAME" \
  --name "$APP_NAME" \
  --startup-file "PATH=\"$PATH:/home/site/wwwroot\" node .next/standalone/server.js" >/dev/null
echo "  - startup-file を node .next/standalone/server.js に設定"

az webapp config appsettings set \
  --resource-group "$RG_NAME" \
  --name "$APP_NAME" \
  --settings WEBSITE_NODE_DEFAULT_VERSION=~18 SCM_DO_BUILD_DURING_DEPLOYMENT=false >/dev/null
echo "  - AppSettings: Node18 / サーバ側ビルド無効 を設定"

echo "===[5] ZIP デプロイ（config-zip）====================================="
az webapp deployment source config-zip \
  --resource-group "$RG_NAME" \
  --name "$APP_NAME" \
  --src "$ZIP_PATH" >/dev/null
echo "  - ZIP デプロイ完了"

echo "===[6] 再起動 & 反映待ち ============================================="
az webapp restart \
  --resource-group "$RG_NAME" \
  --name "$APP_NAME" >/dev/null
echo "  - 再起動完了。反映待ち（約20〜40秒）..."
sleep 35

echo "===[7] Kudu 上の実体確認 (.next/standalone / .next/static) ============"
echo "  - SSH での存在確認（エラーは無視可）"
az webapp ssh --resource-group "$RG_NAME" --name "$APP_NAME" --command "ls -al /home/site/wwwroot/.next/standalone /home/site/wwwroot/.next/static | head -n 60" || true

echo "===[8] HTTP/MIME 検証 ================================================"
echo "  - ルート応答"
curl -sI "${APP_URL}" | egrep -i "HTTP/|content-type|strict-transport|x-content-type|x-frame-options|referrer-policy|permissions-policy" || true

echo "  - 代表的なJS/CSSを検証（見つからない場合はワイルドカードで1件試行）"
JS_PATH="$(curl -s ${APP_URL} | grep -oE '/_next/static/chunks/[^\"'"'"']+\.js' | head -n1)"
CSS_PATH="$(curl -s ${APP_URL} | grep -oE '/_next/static/css/[^\"'"'"']+\.css' | head -n1)"

if [ -n "$JS_PATH" ]; then
  echo "    * JS: ${JS_PATH}"
  curl -sI "${APP_URL}${JS_PATH}" | egrep -i "HTTP/|content-type" || true
else
  echo "    * JS: 自動検出できませんでした。"
fi

if [ -n "$CSS_PATH" ]; then
  echo "    * CSS: ${CSS_PATH}"
  curl -sI "${APP_URL}${CSS_PATH}" | egrep -i "HTTP/|content-type" || true
else
  echo "    * CSS: 自動検出できませんでした。"
fi

echo "===[9] 結果サマリ ====================================================="
cat <<EOS

期待される結果:
  - ${APP_URL} : HTTP/2 200
  - ${APP_URL}/_next/static/chunks/*.js : 200 + Content-Type: application/javascript
  - ${APP_URL}/_next/static/css/*.css   : 200 + Content-Type: text/css

もし JS/CSS が 404 や Content-Type: text/html のままなら:
  - Kudu/SSH で /home/site/wwwroot/.next/static の実ファイル数を確認
  - CDN/Front Door 経由の場合はキャッシュをパージ
  - startup-file がポータルに保存されているか再確認（GUIで上書き後、再起動）

✅ 以上で「server.js が見つからない」「/_next/static が 404」問題を同時に解消できます。
EOS