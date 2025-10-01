'use client'

import { useMutation } from '@tanstack/react-query'
import { ShoppingCart, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTradeStore } from '@/store/trade-store'
import { useToast } from '@/hooks/use-toast'
import { createTrade } from '@/lib/api'
import type { TradeCreateRequest } from '@/types/api'

export function PurchaseButton() {
  const { items, total, clearItems } = useTradeStore()
  const { toast } = useToast()

  const tradeMutation = useMutation({
    mutationFn: createTrade,
    onSuccess: (response) => {
      toast({
        title: "購入が完了しました",
        description: `合計: ¥${response.total_amt.toLocaleString()}`,
      })
      clearItems()
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail?.message || '購入処理に失敗しました'
      toast({
        title: "エラー",
        description: message,
        variant: "destructive",
      })
    },
  })

  const handlePurchase = () => {
    if (items.length === 0) {
      toast({
        title: "エラー",
        description: "商品を選択してください",
        variant: "destructive",
      })
      return
    }

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
    <div className="fixed bottom-0 left-0 right-0 bg-[rgba(var(--card-bg),0.90)] backdrop-blur-sm border-t border-zinc-300 p-4 shadow-lg z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-0">
        <Button
          onClick={handlePurchase}
          className={`w-full h-16 text-lg font-semibold bg-gradient-to-r from-[rgb(var(--brand-from))]/90 to-[rgb(var(--brand-to))]/90 text-white shadow-lg backdrop-blur-sm hover:from-[rgb(var(--brand-from))]/100 hover:to-[rgb(var(--brand-to))]/100 drop-shadow-sm ${
            !hasItems || isPending ? 'opacity-70 cursor-not-allowed' : ''
          }`}
          disabled={!hasItems || isPending}
        >
          {isPending ? (
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              処理中...
            </div>
          ) : (
            <div className="flex items-center gap-3">
              {hasItems ? (
                <CreditCard className="h-6 w-6" />
              ) : (
                <ShoppingCart className="h-6 w-6" />
              )}
              {hasItems ? (
                <>購入 (¥{total.total.toLocaleString()})</>
              ) : (
                <>商品を選択してください</>
              )}
            </div>
          )}
        </Button>
        {hasItems && (
          <div className="mt-2 text-center text-sm text-zinc-800">
            商品数: {items.length}点 / 税込合計: ¥{total.total.toLocaleString()}
          </div>
        )}
      </div>
    </div>
  )
}