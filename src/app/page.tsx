'use client'

import { ProductSearch } from '@/components/product-search'
import { TradeItems } from '@/components/trade-items'
import { TradeTotal } from '@/components/trade-total'
import { PurchaseButton } from '@/components/purchase-button'
import { useTradeStore } from '@/store/trade-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ShoppingCart, Search, Calculator } from 'lucide-react'

export default function Home() {
  const { items } = useTradeStore()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Content */}
      <div className="pb-24">
        <div className="max-w-6xl mx-auto p-4">
          {/* Header */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-[rgb(var(--brand-from))] to-[rgb(var(--brand-to))] rounded-xl shadow-lg">
                <ShoppingCart className="h-8 w-8 text-white drop-shadow-sm" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-[rgb(var(--brand-from))] to-[rgb(var(--brand-to))] bg-clip-text text-transparent whitespace-nowrap">
                  POS システム
                </h1>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
            {/* Left Column: Product Search */}
            <div className="lg:col-span-1">
              <Card className="border shadow-lg bg-white text-zinc-900 hover:shadow-xl transition-shadow">
                <CardHeader className="bg-gradient-to-r from-[rgb(var(--brand-from))] to-[rgb(var(--brand-to))] text-white rounded-t-lg py-3">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold tracking-wide">
                    <Search className="h-4 w-4" />
                    商品検索
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <ProductSearch />
                </CardContent>
              </Card>
            </div>

            {/* Middle Column: Shopping Cart */}
            <div className="md:col-span-1 lg:col-span-1">
              <Card className="border shadow-lg bg-white text-zinc-900 hover:shadow-xl transition-shadow">
                <CardHeader className="bg-gradient-to-r from-[rgb(var(--brand-from))] to-[rgb(var(--brand-to))] text-white rounded-t-lg py-3">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold tracking-wide">
                    <ShoppingCart className="h-4 w-4" />
                    カート
                    {items.length > 0 && (
                      <span className="ml-auto bg-white/20 px-2 py-1 rounded-full text-sm">
                        {items.length}点
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <TradeItems />
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Total */}
            <div className="md:col-span-2 lg:col-span-1">
              <Card className="border shadow-lg bg-white text-zinc-900 hover:shadow-xl transition-shadow">
                <CardHeader className="bg-gradient-to-r from-[rgb(var(--brand-from))] to-[rgb(var(--brand-to))] text-white rounded-t-lg py-3">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold tracking-wide">
                    <Calculator className="h-4 w-4" />
                    合計金額
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <TradeTotal />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Purchase Button */}
      <PurchaseButton />
    </div>
  )
}