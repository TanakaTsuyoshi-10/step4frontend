// 商品情報
export interface Product {
  prd_id: number
  code: string  // stringに変更
  name: string
  price: number
  tax_cd: string
}

// カートアイテム
export interface CartItem {
  prd_id: number
  name: string
  price: number
  tax_cd: '10' | '08' | '00'
  qty: number
}

// 保留中アイテム
export type PendingItem = Product | null

// 取引明細行
export interface TradeLineRequest {
  prd_id: number
  qty: number
}

// 取引登録リクエスト
export interface TradeCreateRequest {
  emp_cd: string
  store_cd: string
  pos_no: string
  trade_lines: TradeLineRequest[]
}

// 取引登録レスポンス
export interface TradeResponse {
  trade_id: number
  total_amt: number
  tax_amt: number
  created_at: string
}

// エラーレスポンス
export interface ErrorResponse {
  error: string
  message: string
  details?: any[]
}

// バリデーションエラーレスポンス
export interface ValidationErrorResponse extends ErrorResponse {
  details: Array<{
    field?: string
    message?: string
    missing_ids?: number[]
  }>
}

// 商品未登録エラーレスポンス
export interface ProductNotFoundResponse extends ErrorResponse {
  code: string  // stringに変更
}

// サーバーエラーレスポンス
export interface InternalServerErrorResponse extends ErrorResponse {
  // 追加フィールドは必要に応じて
}

// ヘルスチェックレスポンス
export interface HealthResponse {
  status: string
  timestamp?: string
  database?: string
}