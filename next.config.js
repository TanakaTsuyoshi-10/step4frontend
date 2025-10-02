const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV !== 'production',
});

const config = {
  reactStrictMode: true,
  eslint: {
    // 本番ビルドでは ESLint エラーで失敗させない
    ignoreDuringBuilds: true,
  },
  images: {
    domains: ['localhost'],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  },
};

module.exports = withPWA(config);