# POS System Frontend

Next.js 14を使用したモダンなPOSシステムのフロントエンドです。

## 特徴

- **Next.js 14** - App Routerを使用した最新のReactフレームワーク
- **TypeScript** - 型安全性とIntelliSenseサポート
- **Tailwind CSS** - ユーティリティファーストのCSSフレームワーク
- **PWA対応** - オフライン機能とアプリライクな体験
- **バーコードスキャン** - カメラを使用した商品コード読み取り
- **状態管理** - Zustandによる軽量な状態管理
- **API通信** - React Queryによる効率的なデータフェッチ

## 技術スタック

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Zustand (状態管理)
- React Query (データフェッチ)
- Radix UI (UIコンポーネント)
- Lucide React (アイコン)

## セットアップ

### 前提条件

- Node.js 18.17以上
- npm または yarn

### インストール

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev
```

### 環境変数

`.env.local`ファイルを作成し、以下の環境変数を設定してください：

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 利用可能なスクリプト

- `npm run dev` - 開発サーバーの起動
- `npm run build` - 本番用ビルド
- `npm run start` - 本番サーバーの起動
- `npm run lint` - ESLintによるコードチェック
- `npm run type-check` - TypeScriptの型チェック

## ディレクトリ構造

```
src/
├── app/                 # Next.js App Router
├── components/          # Reactコンポーネント
├── hooks/              # カスタムフック
├── lib/                # ユーティリティとAPI
├── store/              # Zustand状態管理
└── types/              # TypeScript型定義
```

## 主要機能

### 商品検索
- 商品コード/JANコードによる検索
- バーコードスキャン機能
- リアルタイム検索結果表示

### 取引管理
- 商品の追加・削除・数量変更
- 税込み・税抜き金額の自動計算
- 取引の登録とレシート印刷

### PWA機能
- オフライン対応
- ホーム画面への追加
- アプリライクなUX

## API連携

バックエンドAPIとの連携により以下の機能を提供：

- `GET /products/{code}` - 商品検索
- `GET /products` - 商品一覧取得
- `POST /trades` - 取引登録
- `GET /health` - ヘルスチェック

## ビルドとデプロイ

```bash
# 本番用ビルド
npm run build

# 本番サーバー起動
npm run start
```

## ライセンス

MIT License