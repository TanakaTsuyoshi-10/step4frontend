'use client'

import { useState } from 'react'
import { ProductSearch } from '@/components/product-search'
import { TradeItems } from '@/components/trade-items'
import { TradeTotal } from '@/components/trade-total'
import { PurchaseButton } from '@/components/purchase-button'
import { useTradeStore } from '@/store/trade-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ShoppingCart, Settings, BarChart3, Search, Calculator } from 'lucide-react'

export default function Home() {
  const { items } = useTradeStore()
  const [, setIsSettingsOpen] = useState(false)

  return (
    <div className="min-h-screen relative">
      {/* Background Image with Overlay */}
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: 'url(/shopping2.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'scroll'
        }}
      />
      <div className="fixed inset-0 z-10 bg-black/50" />

      {/* Content */}
      <div className="relative z-20 pb-24">
        <div className="max-w-6xl mx-auto p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-[rgb(var(--brand-from))]/90 to-[rgb(var(--brand-to))]/90 rounded-xl shadow-lg">
                <ShoppingCart className="h-8 w-8 text-white drop-shadow-sm" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-[rgb(var(--brand-from))] to-[rgb(var(--brand-to))] bg-clip-text text-transparent whitespace-nowrap">
                  POS システム
                </h1>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="border-zinc-300 bg-[rgba(var(--card-bg),0.80)] backdrop-blur-sm hover:bg-[rgba(var(--card-bg),0.90)] text-zinc-800">
                <BarChart3 className="h-4 w-4 mr-2 text-[rgb(var(--brand-from))]" />
                <span className="hidden sm:inline">レポート</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-zinc-300 bg-[rgba(var(--card-bg),0.80)] backdrop-blur-sm hover:bg-[rgba(var(--card-bg),0.90)] text-zinc-800"
                onClick={() => setIsSettingsOpen(true)}
              >
                <Settings className="h-4 w-4 mr-2 text-[rgb(var(--brand-to))]" />
                <span className="hidden sm:inline">設定</span>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
            {/* Left Column: Product Search */}
            <div className="lg:col-span-1">
              <Card className="border-0 shadow-xl bg-[rgba(var(--card-bg),0.70)] backdrop-blur-sm text-zinc-900 hover:bg-[rgba(var(--card-bg),0.78)] transition-colors">
                <CardHeader className="bg-gradient-to-r from-[rgb(var(--brand-from))]/85 to-[rgb(var(--brand-to))]/85 text-white rounded-t-lg py-3 drop-shadow-sm">
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
              <Card className="border-0 shadow-xl bg-[rgba(var(--card-bg),0.70)] backdrop-blur-sm text-zinc-900 hover:bg-[rgba(var(--card-bg),0.78)] transition-colors">
                <CardHeader className="bg-gradient-to-r from-[rgb(var(--brand-from))]/85 to-[rgb(var(--brand-to))]/85 text-white rounded-t-lg py-3 drop-shadow-sm">
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
              <Card className="border-0 shadow-xl bg-[rgba(var(--card-bg),0.70)] backdrop-blur-sm text-zinc-900 hover:bg-[rgba(var(--card-bg),0.78)] transition-colors">
                <CardHeader className="bg-gradient-to-r from-[rgb(var(--brand-from))]/85 to-[rgb(var(--brand-to))]/85 text-white rounded-t-lg py-3 drop-shadow-sm">
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