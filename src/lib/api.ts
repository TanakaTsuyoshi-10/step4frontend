import type { Product, TradeCreateRequest, TradeResponse } from '@/types/api'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://app-002-gen10-step3-1-py-oshima30.azurewebsites.net'

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: any
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`

  // デバッグログ
  console.log(`[API] Request: ${options.method || 'GET'} ${url}`)

  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  }

  try {
    const response = await fetch(url, config)

    // デバッグログ
    console.log(`[API] Response: ${response.status} ${response.statusText}`)

    if (!response.ok) {
      let errorData
      try {
        errorData = await response.json()
      } catch {
        errorData = { message: `HTTP ${response.status}: ${response.statusText}` }
      }

      console.error(`[API] Error response:`, errorData)

      // 404の場合は商品未登録エラー
      if (response.status === 404) {
        throw new ApiError(
          errorData.detail?.message || '未登録商品です',
          response.status,
          errorData
        )
      }

      // 500系エラーの場合
      if (response.status >= 500) {
        throw new ApiError(
          'サーバーエラーが発生しました',
          response.status,
          errorData
        )
      }

      throw new ApiError(
        errorData.detail?.message || errorData.message || `HTTP ${response.status}`,
        response.status,
        errorData
      )
    }

    const data = await response.json()
    console.log(`[API] Success response:`, data)
    return data
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }

    // ネットワークエラーなど
    console.error(`[API] Network error:`, error)
    throw new ApiError(
      'ネットワークエラーが発生しました',
      0,
      { originalError: error }
    )
  }
}

export async function searchProduct(code: number): Promise<Product> {
  return fetchApi<Product>(`/api/v1/products/${code}`)
}

export async function getProductByCode(code: string): Promise<Product> {
  // バーコードは文字列として処理
  if (!code || code.trim() === '') {
    throw new ApiError('無効な商品コードです', 400)
  }
  return fetchApi<Product>(`/api/v1/products/${code}`)
}

export async function getProducts(limit = 100, offset = 0): Promise<Product[]> {
  return fetchApi<Product[]>(`/api/v1/products?limit=${limit}&offset=${offset}`)
}

export async function createTrade(data: TradeCreateRequest): Promise<TradeResponse> {
  return fetchApi<TradeResponse>('/api/v1/trades', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function getTrade(tradeId: number) {
  return fetchApi(`/api/v1/trades/${tradeId}`)
}

export async function healthCheck(): Promise<{ status: string }> {
  return fetchApi<{ status: string }>('/health')
}