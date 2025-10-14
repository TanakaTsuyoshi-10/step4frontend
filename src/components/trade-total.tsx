'use client'

import { useTradeStore } from '@/store/trade-store'
import { formatCurrency } from '@/lib/utils'
import { TrendingUp, Percent, DollarSign } from 'lucide-react'

export function TradeTotal() {
  const { total } = useTradeStore()

  return (
    <div className="space-y-4">
      {/* Main totals with muted green gradients */}
      <div className="space-y-3">
        <div className="flex justify-between items-center p-3 bg-gradient-to-r from-gray-50 to-zinc-100 rounded-lg border border-zinc-200">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-[rgb(var(--brand-from))]" />
            <span className="text-sm font-medium text-zinc-800">小計（税抜）</span>
          </div>
          <span className="font-semibold text-zinc-900">{formatCurrency(total.subtotal)}</span>
        </div>

        <div className="flex justify-between items-center p-3 bg-gradient-to-r from-gray-50 to-zinc-100 rounded-lg border border-zinc-200">
          <div className="flex items-center gap-2">
            <Percent className="h-4 w-4 text-[rgb(var(--brand-to))]" />
            <span className="text-sm font-medium text-zinc-800">消費税</span>
          </div>
          <span className="font-semibold text-zinc-900">{formatCurrency(total.tax)}</span>
        </div>

        <div className="p-4 bg-gradient-to-r from-[rgb(var(--brand-from))]/85 to-[rgb(var(--brand-to))]/85 rounded-lg text-white shadow-lg drop-shadow-sm">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              <span className="text-lg font-bold">合計</span>
            </div>
            <span className="text-2xl font-bold">{formatCurrency(total.total)}</span>
          </div>
        </div>
      </div>

      {/* Tax breakdown */}
      <div className="bg-gradient-to-r from-gray-50 to-zinc-50 rounded-lg p-4 border border-zinc-200">
        <h4 className="text-xs font-semibold text-zinc-900 mb-3 uppercase tracking-wide">税率別内訳</h4>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[rgb(var(--brand-from))] rounded-full"></div>
              <span className="text-zinc-800">10%対象</span>
            </div>
            <span className="font-medium text-zinc-900">{formatCurrency(total.tax10)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[rgb(var(--brand-to))] rounded-full"></div>
              <span className="text-zinc-800">8%対象</span>
            </div>
            <span className="font-medium text-zinc-900">{formatCurrency(total.tax8)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-zinc-400 rounded-full"></div>
              <span className="text-zinc-800">非課税</span>
            </div>
            <span className="font-medium text-zinc-900">{formatCurrency(total.tax0)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}