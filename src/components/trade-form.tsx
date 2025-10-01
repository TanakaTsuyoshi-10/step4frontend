'use client'

import { useMutation } from '@tanstack/react-query'
import { ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTradeStore } from '@/store/trade-store'
import { useToast } from '@/hooks/use-toast'
import { createTrade } from '@/lib/api'
import type { TradeCreateRequest } from '@/types/api'

export function TradeForm() {
  const { items, total, clearItems } = useTradeStore()
  const { toast } = useToast()

  const tradeMutation = useMutation({
    mutationFn: createTrade,
    onSuccess: (response) => {
      toast({
        title: "購入を登録しました",
        description: `合計: ¥${response.total_amt.toLocaleString()}`,
      })
      clearItems()
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail?.message || '購入登録に失敗しました'
      toast({
        title: "エラー",
        description: message,
        variant: "destructive",
      })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (items.length === 0) {
      toast({
        title: "エラー",
        description: "商品を選択してください",
        variant: "destructive",
      })
      return
    }

    // 固定値でリクエストを組み立て
    const tradeData: TradeCreateRequest = {
      emp_cd: "E001",
      store_cd: "S001",
      pos_no: "P01",
      trade_lines: items.map(item => ({
        prd_id: item.productId,
        qty: item.quantity,
      })),
    }

    tradeMutation.mutate(tradeData)
  }

  const isPending = tradeMutation.isPending
  const hasItems = items.length > 0

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Button
        type="submit"
        className="w-full h-12"
        disabled={!hasItems || isPending}
      >
        {isPending ? (
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            処理中...
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            購入 (¥{total.total.toLocaleString()})
          </div>
        )}
      </Button>

      {hasItems && (
        <div className="text-xs text-gray-500 text-center">
          商品数: {items.length}点 / 合計: ¥{total.total.toLocaleString()}
        </div>
      )}
    </form>
  )
}