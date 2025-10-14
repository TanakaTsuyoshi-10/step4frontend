'use client'

import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 1000 * 60 * 5, // 5分
          retry: (failureCount, error: any) => {
            // 4xxエラーはリトライしない
            if (error?.status >= 400 && error?.status < 500) {
              return false
            }
            // 最大3回リトライ
            return failureCount < 3
          },
          retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        },
        mutations: {
          retry: (failureCount, error: any) => {
            // 4xxエラーはリトライしない
            if (error?.status >= 400 && error?.status < 500) {
              return false
            }
            // ミューテーションは1回だけリトライ
            return failureCount < 1
          },
        },
      },
    })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}