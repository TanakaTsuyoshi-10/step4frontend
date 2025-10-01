import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { getTaxRate } from '@/lib/utils'
import type { Product, PendingItem } from '@/types/api'

export interface TradeItem {
  id: string
  productId: number
  code: string
  name: string
  price: number
  taxCode: string
  quantity: number
}

export interface TradeTotal {
  subtotal: number
  tax: number
  total: number
  tax10: number
  tax8: number
  tax0: number
}

interface TradeStore {
  items: TradeItem[]
  total: TradeTotal
  pending: PendingItem

  // Actions
  addItem: (item: Omit<TradeItem, 'id'>) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearItems: () => void
  calculateTotal: () => void
  setPending: (product: Product | null) => void
  addPendingToCart: () => void
}

const calculateTradeTotal = (items: TradeItem[]): TradeTotal => {
  let subtotal = 0
  let tax10Total = 0
  let tax8Total = 0
  let tax0Total = 0

  items.forEach(item => {
    const itemSubtotal = item.price * item.quantity
    const taxRate = getTaxRate(item.taxCode)
    const itemTax = Math.floor(itemSubtotal * taxRate)

    subtotal += itemSubtotal

    if (item.taxCode === '10') {
      tax10Total += itemTax
    } else if (item.taxCode === '8') {
      tax8Total += itemTax
    } else {
      tax0Total += itemTax
    }
  })

  const tax = tax10Total + tax8Total + tax0Total
  const total = subtotal + tax

  return {
    subtotal,
    tax,
    total,
    tax10: tax10Total,
    tax8: tax8Total,
    tax0: tax0Total,
  }
}

export const useTradeStore = create<TradeStore>()(
  devtools(
    (set, get) => ({
      items: [],
      total: {
        subtotal: 0,
        tax: 0,
        total: 0,
        tax10: 0,
        tax8: 0,
        tax0: 0,
      },
      pending: null,

      addItem: (newItem) => {
        set((state) => {
          // 既存の商品があるかチェック
          const existingItemIndex = state.items.findIndex(
            item => item.productId === newItem.productId
          )

          let updatedItems: TradeItem[]

          if (existingItemIndex >= 0) {
            // 既存商品の数量を増加
            updatedItems = state.items.map((item, index) =>
              index === existingItemIndex
                ? { ...item, quantity: item.quantity + newItem.quantity }
                : item
            )
          } else {
            // 新しい商品を追加
            const newTradeItem: TradeItem = {
              ...newItem,
              id: crypto.randomUUID(),
            }
            updatedItems = [...state.items, newTradeItem]
          }

          const newTotal = calculateTradeTotal(updatedItems)

          return {
            items: updatedItems,
            total: newTotal,
          }
        })
      },

      removeItem: (id) => {
        set((state) => {
          const updatedItems = state.items.filter(item => item.id !== id)
          const newTotal = calculateTradeTotal(updatedItems)

          return {
            items: updatedItems,
            total: newTotal,
          }
        })
      },

      updateQuantity: (id, quantity) => {
        if (quantity <= 0) return

        set((state) => {
          const updatedItems = state.items.map(item =>
            item.id === id ? { ...item, quantity } : item
          )
          const newTotal = calculateTradeTotal(updatedItems)

          return {
            items: updatedItems,
            total: newTotal,
          }
        })
      },

      clearItems: () => {
        set({
          items: [],
          pending: null,
          total: {
            subtotal: 0,
            tax: 0,
            total: 0,
            tax10: 0,
            tax8: 0,
            tax0: 0,
          },
        })
      },

      calculateTotal: () => {
        set((state) => ({
          total: calculateTradeTotal(state.items),
        }))
      },

      setPending: (product) => {
        set({ pending: product })
      },

      addPendingToCart: () => {
        const state = get()
        if (state.pending) {
          const newItem = {
            productId: state.pending.prd_id,
            code: state.pending.code.toString(),
            name: state.pending.name,
            price: state.pending.price,
            taxCode: state.pending.tax_cd,
            quantity: 1,
          }
          state.addItem(newItem)
          set({ pending: null })
        }
      },
    }),
    {
      name: 'trade-store',
    }
  )
)