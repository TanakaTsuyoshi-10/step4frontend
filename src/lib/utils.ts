import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return `¥${amount.toLocaleString()}`
}

export function getTaxRate(taxCode: string): number {
  switch (taxCode) {
    case '10':
      return 0.1
    case '8':
      return 0.08
    case '0':
    default:
      return 0
  }
}

export function getTaxDisplayName(taxCode: string): string {
  switch (taxCode) {
    case '10':
      return '10%'
    case '8':
      return '8%'
    case '0':
      return '非課税'
    default:
      return '不明'
  }
}

export function validateProductCode(code: string): boolean {
  const numericCode = parseInt(code)
  return !isNaN(numericCode) && numericCode > 0 && numericCode <= 99999999999999999999999999
}

export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date)
}

export function generateReceiptNumber(): string {
  const now = new Date()
  const timestamp = now.getTime().toString().slice(-6)
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return `${timestamp}${random}`
}

export function calculateLineAmounts(price: number, quantity: number, taxCode: string) {
  const subtotal = price * quantity
  const taxRate = getTaxRate(taxCode)
  const tax = Math.floor(subtotal * taxRate)
  const total = subtotal + tax

  return {
    subtotal,
    tax,
    total,
  }
}