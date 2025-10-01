'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Scanner, Search, Plus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useTradeStore } from '@/store/trade-store'
import { useToast } from '@/hooks/use-toast'
import { searchProduct } from '@/lib/api'
import type { Product } from '@/types/api'

export function ProductSearch() {
  const [code, setCode] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const addItem = useTradeStore((state) => state.addItem)
  const { toast } = useToast()

  const searchMutation = useMutation({
    mutationFn: searchProduct,
    onSuccess: (product: Product) => {
      addItem({
        productId: product.prd_id,
        code: product.code.toString(),
        name: product.name,
        price: product.price,
        taxCode: product.tax_cd,
        quantity: 1,
      })
      setCode('')
      toast({
        title: "商品を追加しました",
        description: `${product.name} (¥${product.price})`,
      })
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail?.message || '商品が見つかりませんでした'
      toast({
        title: "エラー",
        description: message,
        variant: "destructive",
      })
    },
  })

  const handleSearch = () => {
    if (!code.trim()) {
      toast({
        title: "エラー",
        description: "商品コードを入力してください",
        variant: "destructive",
      })
      return
    }

    const numericCode = parseInt(code.trim())
    if (isNaN(numericCode)) {
      toast({
        title: "エラー",
        description: "有効な商品コードを入力してください",
        variant: "destructive",
      })
      return
    }

    searchMutation.mutate(numericCode)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const startScanning = () => {
    setIsScanning(true)

    // カメラアクセスを試行
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(stream => {
          // スキャン機能の実装（実際のバーコードライブラリを使用）
          toast({
            title: "カメラ起動中",
            description: "バーコードをカメラに向けてください",
          })

          // 5秒後に自動停止（デモ用）
          setTimeout(() => {
            stream.getTracks().forEach(track => track.stop())
            setIsScanning(false)
            toast({
              title: "スキャン終了",
              description: "手動で商品コードを入力してください",
            })
          }, 5000)
        })
        .catch(error => {
          setIsScanning(false)
          toast({
            title: "カメラエラー",
            description: "カメラにアクセスできません。手動で入力してください。",
            variant: "destructive",
          })
        })
    } else {
      setIsScanning(false)
      toast({
        title: "未対応",
        description: "このブラウザはカメラ機能に対応していません",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="product-code">商品コード / JANコード</Label>
        <div className="flex gap-2">
          <Input
            id="product-code"
            type="number"
            placeholder="商品コードを入力"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={searchMutation.isPending || isScanning}
            className="flex-1"
          />
          <Button
            onClick={handleSearch}
            disabled={searchMutation.isPending || isScanning || !code.trim()}
            size="icon"
          >
            {searchMutation.isPending ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={startScanning}
          disabled={isScanning || searchMutation.isPending}
          variant="outline"
          className="flex-1"
        >
          <Scanner className="h-4 w-4 mr-2" />
          {isScanning ? 'スキャン中...' : 'バーコードスキャン'}
        </Button>
      </div>

      {isScanning && (
        <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg text-center">
          <div className="pos-scanner h-32 rounded-lg bg-gray-100 flex items-center justify-center">
            <Scanner className="h-8 w-8 text-gray-400" />
          </div>
          <p className="mt-2 text-sm text-gray-600">
            バーコードをカメラに向けてください
          </p>
        </div>
      )}
    </div>
  )
}