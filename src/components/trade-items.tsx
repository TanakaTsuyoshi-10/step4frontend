'use client'

import { Trash2, Plus, Minus, Package, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTradeStore } from '@/store/trade-store'
import { formatCurrency, getTaxRate } from '@/lib/utils'

export function TradeItems() {
  const { items, updateQuantity, removeItem } = useTradeStore()

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-gray-100 to-zinc-200 rounded-full flex items-center justify-center mb-4 border border-zinc-200">
          <ShoppingCart className="h-8 w-8 text-[rgb(var(--brand-from))]" />
        </div>
        <p className="text-zinc-800 font-medium">商品が選択されていません</p>
        <p className="text-sm text-zinc-600 mt-1">左側の商品検索から商品を追加してください</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 max-h-96 overflow-y-auto">
      {items.map((item) => {
        const taxRate = getTaxRate(item.taxCode)
        const lineTotal = item.price * item.quantity
        const lineTax = Math.floor(lineTotal * taxRate)
        const lineTotalWithTax = lineTotal + lineTax

        return (
          <div
            key={item.id}
            className="bg-gradient-to-r from-white to-zinc-50 p-4 rounded-xl border border-zinc-200 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="h-4 w-4 text-[rgb(var(--brand-from))]" />
                  <h4 className="font-semibold text-zinc-900 truncate">{item.name}</h4>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-zinc-700">
                    コード: <span className="font-mono">{item.code}</span>
                  </p>
                  <p className="text-xs text-zinc-800">
                    単価: <span className="font-medium">{formatCurrency(item.price)}</span>
                    <span className="ml-2 px-1.5 py-0.5 bg-white border border-zinc-200 text-zinc-800 rounded text-xs">
                      税率{(taxRate * 100).toFixed(0)}%
                    </span>
                  </p>
                </div>
              </div>
              <Button
                onClick={() => removeItem(item.id)}
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-zinc-500 hover:text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 border-zinc-300 hover:bg-zinc-50"
                  disabled={item.quantity <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-12 text-center text-sm font-semibold bg-white py-1 rounded border border-zinc-200">
                  {item.quantity}
                </span>
                <Button
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 border-zinc-300 hover:bg-zinc-50"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="text-right">
                <div className="text-lg font-bold text-zinc-900">
                  {formatCurrency(lineTotalWithTax)}
                </div>
                <div className="text-xs text-[rgb(var(--brand-to))] font-medium">
                  税込
                </div>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-zinc-200">
              <div className="flex justify-between text-xs text-zinc-700">
                <span>税抜: {formatCurrency(lineTotal)}</span>
                <span>消費税: {formatCurrency(lineTax)}</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}