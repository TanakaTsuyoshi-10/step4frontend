'use client'

import { useMutation } from '@tanstack/react-query'
import { Camera, X, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useTradeStore } from '@/store/trade-store'
import { useToast } from '@/hooks/use-toast'
import { getProductByCode } from '@/lib/api'
import { getTaxDisplayName } from '@/lib/utils'
import { useBarcodeScanner } from '@/hooks/use-barcode-scanner'

export function ProductSearch() {
  const { pending, setPending, addPendingToCart } = useTradeStore()
  const { toast } = useToast()

  const { videoRef, isScanning, error, start, stop, clearLast } = useBarcodeScanner()

  const searchMutation = useMutation({
    mutationFn: getProductByCode,
    onSuccess: (product) => {
      setPending(product)
      handleStopScanning()
      toast({
        title: "商品をスキャンしました",
        description: `${product.name} (¥${product.price})`,
      })
    },
    onError: (error: any) => {
      let message = '商品が見つかりませんでした'
      if (error.status === 404) {
        message = '未登録商品です'
      } else if (error.message) {
        message = error.message
      }

      toast({
        title: "エラー",
        description: message,
        variant: "destructive",
      })
      handleStopScanning()
    },
  })

  const handleStartScanning = async () => {
    try {
      clearLast() // 前回の検出結果をクリア
      await start((code) => {
        console.log('Barcode detected:', code)
        searchMutation.mutate(code)
      })

      toast({
        title: "カメラ起動中",
        description: "バーコードをカメラに向けてください",
      })
    } catch (error: any) {
      console.error('Camera error:', error)
      toast({
        title: "カメラエラー",
        description: error?.message || "カメラにアクセスできません。権限を確認してください。",
        variant: "destructive",
      })
    }
  }

  const handleStopScanning = async () => {
    await stop()
  }

  const handleAddToCart = () => {
    addPendingToCart()
    toast({
      title: "商品を追加しました",
      description: `${pending?.name}を購入リストに追加しました`,
    })
  }

  const handleCancel = () => {
    setPending(null)
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>バーコードスキャン</Label>
        <div className="flex gap-2">
          <Button
            onClick={handleStartScanning}
            disabled={isScanning || searchMutation.isPending}
            variant="outline"
            className="flex-1 h-12"
          >
            <Camera className="h-4 w-4 mr-2" />
            {isScanning ? 'スキャン中...' : 'バーコードスキャン'}
          </Button>
          {isScanning && (
            <Button
              onClick={handleStopScanning}
              variant="outline"
              size="icon"
              className="text-red-600 hover:text-red-700 h-12 w-12"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">
            <strong>カメラエラー:</strong> {error}
          </p>
        </div>
      )}

      {/* スキャン結果カード */}
      {pending && (
        <div className="p-4 border rounded-lg bg-blue-50 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-lg">スキャン結果</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-medium">{pending.name}</div>
                <div className="text-sm text-gray-600">コード: {pending.code}</div>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <div className="text-sm">
                <span className="font-medium">単価（税抜）: ¥{pending.price.toLocaleString()}</span>
                <span className="ml-2 text-gray-600">({getTaxDisplayName(pending.tax_cd)})</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleAddToCart}
              className="flex-1 h-12"
              disabled={searchMutation.isPending}
            >
              <Plus className="h-4 w-4 mr-2" />
              追加
            </Button>
            <Button
              onClick={handleCancel}
              variant="outline"
              className="h-12"
              disabled={searchMutation.isPending}
            >
              キャンセル
            </Button>
          </div>
        </div>
      )}

      {isScanning && (
        <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg">
          <div className="relative mx-auto aspect-[3/4] sm:aspect-[4/3] w-full max-w-[640px] rounded-xl overflow-hidden">
            <video
              ref={videoRef}
              className="w-full h-full object-cover rounded-md bg-black/20"
              muted
              playsInline
              autoPlay
            />
            {/* スキャンガイドライン（縦横で比率調整） */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div
                className="relative border-4 border-red-500 rounded-md bg-red-500/10"
                style={{
                  width: '70%',
                  height: window.matchMedia && window.matchMedia('(orientation: portrait)').matches ? '30%' : '60%',
                }}
              >
                {/* コーナーマーカー */}
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-red-500"></div>
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-red-500"></div>
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-red-500"></div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-red-500"></div>
                {/* スキャンライン */}
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-red-500 transform -translate-y-1/2 animate-pulse"></div>
              </div>
            </div>
            {/* ステータス表示 */}
            <div className="absolute top-2 left-2">
              {isScanning && (
                <div className="bg-green-600 text-white px-2 py-1 rounded text-xs animate-pulse">
                  📷 スキャン中...
                </div>
              )}
            </div>
            {searchMutation.isPending && (
              <div className="absolute top-2 right-2 bg-orange-500 text-white px-2 py-1 rounded text-xs animate-bounce">
                🔎 商品検索中...
              </div>
            )}
          </div>
          <div className="mt-3 space-y-2">
            <p className="text-sm text-gray-600 text-center font-medium">
              📱 バーコードを赤い枠内に合わせてください
            </p>
            <div className="text-xs text-gray-700 space-y-1">
              <p className="text-center">💡 <strong>スキャンのコツ：</strong></p>
              <ul className="text-left space-y-1 max-w-sm mx-auto">
                <li>• 明るい場所で使用する</li>
                <li>• バーコードを平行に保つ</li>
                <li>• 15-25cm の距離を保つ</li>
                <li>• 手ブレを避けて安定させる</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}