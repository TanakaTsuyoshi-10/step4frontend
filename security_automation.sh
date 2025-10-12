#!/usr/bin/env bash
set -euo pipefail

### === 設定（必要に応じて変更） =======================================
REPO_DIR="$HOME/Desktop/POSappfront"                 # リポジトリ
BRANCH="main"                                        # デプロイ元ブランチ
APP_NAME="app-002-gen10-step3-1-node-oshima30"       # Azure WebApp 名
RG_NAME="rg-001-gen10"                               # リソースグループ
APP_URL="https://${APP_NAME}.azurewebsites.net"      # 本番URL

WF_KEEP="redeploy.yml"                                # 残したいYAML（.github/workflows 配下）
WF_PATH=".github/workflows/${WF_KEEP}"               # 既に運用中のyml 想定
REPORT="SECURITY_REPORT.md"

# API 接続先（CSP connect-src 用）：環境変数やnext.config.jsの設定に合わせて調整
CONNECT_SRC="${NEXT_PUBLIC_API_URL:-https://api.example.com https://${APP_NAME}.azurewebsites.net}"
### ===================================================================

cd "$REPO_DIR"

echo "== 0) ブランチ確認 =="
git rev-parse --abbrev-ref HEAD
git fetch origin "$BRANCH" -q
git checkout "$BRANCH" -q

echo "== 1) 現在のレスポンスヘッダを取得して初期レポート生成 =="
TMP_HEADERS=$(mktemp)
curl -sI "$APP_URL" > "$TMP_HEADERS" || true

check_header () {
  local key="$1"; local expect_regex="$2"
  if grep -iE "^${key}:" "$TMP_HEADERS" | grep -Eq "$expect_regex"; then
    echo "- [OK] ${key} : $(grep -iE "^${key}:" "$TMP_HEADERS" | head -n1 | sed 's/\r$//')"
  else
    local cur="$(grep -iE "^${key}:" "$TMP_HEADERS" | head -n1 | sed 's/\r$//' || true)"
    if [ -z "$cur" ]; then
      echo "- [NG] ${key} : （ヘッダ未設定）"
    else
      echo "- [NG] ${key} : ${cur}"
    fi
  fi
}

{
  echo "# セキュリティ対策レポート（自動生成）"
  echo ""
  echo "対象URL: $APP_URL"
  echo "実行時刻: $(date '+%F %T %Z')"
  echo ""
  echo "## 受信ヘッダ診断（デプロイ前）"
  echo ""
  check_header "strict-transport-security" "max-age="
  check_header "content-security-policy" ".+"
  check_header "x-content-type-options" "nosniff"
  check_header "x-frame-options" "DENY|SAMEORIGIN"
  check_header "referrer-policy" ".+"
  check_header "permissions-policy" ".+"
  check_header "cross-origin-opener-policy" ".+"
  check_header "cross-origin-resource-policy" ".+"
  echo ""
  echo "※ NG の項目はこの後の変更で是正を試みます。"
} > "$REPORT"

echo "== 2) Next.js middleware でセキュリティヘッダを付与（既存が無ければ作成） =="
# 既存 middleware.* が無ければ追加（JS/TS いずれか存在すればスキップ）
if ls middleware.* >/dev/null 2>&1; then
  echo "middleware.* が既に存在：ヘッダ追加はスキップ（内容は手動確認推奨）"
else
  cat > middleware.js <<EOF
// 自動生成：グローバルセキュリティヘッダ
import { NextResponse } from 'next/server'

export function middleware(req) {
  const res = NextResponse.next()
  // HSTS（HTTPS運用前提）
  res.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  // MIME Sniffing 防止
  res.headers.set('X-Content-Type-Options', 'nosniff')
  // クリックジャッキング対策
  res.headers.set('X-Frame-Options', 'DENY')
  // 参照元制御
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  // 権限ポリシー（必要に応じて開放）
  res.headers.set('Permissions-Policy', "geolocation=(), microphone=(), camera=(), usb=(), payment=()")
  // COOP/ CORP
  res.headers.set('Cross-Origin-Opener-Policy', 'same-origin')
  res.headers.set('Cross-Origin-Resource-Policy', 'same-origin')
  // CSP（必要に応じて緩めてください）
  const connectSrc = "${CONNECT_SRC}"
  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "img-src 'self' data: blob:",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    "object-src 'none'",
    "form-action 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
    "connect-src 'self' " + connectSrc
  ].join('; ')
  res.headers.set('Content-Security-Policy', csp)
  return res
}

export const config = {
  matcher: [
    // 静的アセットを除く全リクエストに適用
    '/((?!_next/static|_next/image|favicon.ico|manifest.json).*)',
  ],
}
EOF
  echo "middleware.js を新規作成しました。"
fi

echo "== 3) GitHub Actions の YAML を1本に整理 =="
mkdir -p .github/workflows
if [ ! -f "$WF_PATH" ]; then
  echo "⚠ ${WF_KEEP} が見つからないため、最低限の再デプロイYAMLを作成します。"
  cat > "$WF_PATH" <<'YAML'
name: Redeploy Frontend to Azure App Service
on:
  workflow_dispatch: {}
  push:
    branches: [ "main" ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 18 }
      - run: npm ci
      - run: npm run build
      - name: Create zip
        run: zip -r release.zip .next/standalone .next/static public package.json
      - name: Deploy using Publish Profile
        uses: azure/webapps-deploy@v3
        with:
          app-name: ${{ secrets.AZURE_WEBAPP_NAME }}
          publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }}
          package: release.zip
YAML
fi

# 残すファイル以外を削除
for f in .github/workflows/*.yml .github/workflows/*.yaml; do
  [ -e "$f" ] || continue
  base=$(basename "$f")
  if [ "$base" != "$WF_KEEP" ]; then
    echo "削除: $f"
    git rm -f "$f" >/dev/null 2>&1 || rm -f "$f"
  fi
done

echo "== 4) 変更をコミットして push =="
git add -A
if ! git diff --cached --quiet; then
  git commit -m "chore(security): add global security headers via middleware; cleanup workflows to ${WF_KEEP}"
  git push origin "$BRANCH"
else
  echo "コミット対象の差分なし。"
fi

# gh CLI があれば手動トリガ
if command -v gh >/dev/null 2>&1; then
  echo "== 5) Actions を手動トリガ（任意） =="
  gh workflow run "$WF_KEEP" || gh workflow run "$(basename "$WF_PATH")" || true
fi

echo "== 6) デプロイ完了待ち（90秒）後に再計測 =="
sleep 90 || true
curl -sI "$APP_URL" > "$TMP_HEADERS" || true

{
  echo ""
  echo "## 受信ヘッダ診断（デプロイ後）"
  echo ""
  check_header "strict-transport-security" "max-age="
  check_header "content-security-policy" ".+"
  check_header "x-content-type-options" "nosniff"
  check_header "x-frame-options" "DENY|SAMEORIGIN"
  check_header "referrer-policy" ".+"
  check_header "permissions-policy" ".+"
  check_header "cross-origin-opener-policy" ".+"
  check_header "cross-origin-resource-policy" ".+"
  echo ""
  echo "## 未対応 or 要調整ポイント"
  echo "- CSP の \`connect-src\` は実際のAPIドメインに合わせて \`CONNECT_SRC\` を修正してください。"
  echo "- 画像/フォント/CDN等を使う場合は \`img-src\` \`font-src\` \`script-src\` に許可ドメインを追記してください。"
  echo "- HSTS を有効にしたため HTTP → HTTPS リダイレクトは必須です（Azure 側の強制リダイレクトも推奨）。"
} >> "$REPORT"

echo "== 7) レポート出力 =="
echo "生成: $REPORT"
sed -n '1,200p' "$REPORT"

echo "== 完了 =="
echo "- ブラウザ確認: $APP_URL"
echo "- Actions 確認: GitHub → Actions → 最新の run"