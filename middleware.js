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
  // 権限ポリシー（camera/microphone許可）
  res.headers.set('Permissions-Policy', "camera=(self), microphone=(self), geolocation=(self), fullscreen=(self), usb=(), payment=()")
  // COOP/ CORP
  res.headers.set('Cross-Origin-Opener-Policy', 'same-origin')
  res.headers.set('Cross-Origin-Resource-Policy', 'same-origin')
  // CSP（必要に応じて緩めてください）
  const connectSrc = "https://api.example.com https://app-002-gen10-step3-1-node-oshima30.azurewebsites.net"
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
