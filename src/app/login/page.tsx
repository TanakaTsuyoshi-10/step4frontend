'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ShoppingCart, Shield, Eye, EyeOff } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const redirectPath = searchParams.get('redirect') || '/dashboard'

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!username.trim() || !password.trim()) {
      toast({
        title: "エラー",
        description: "ユーザー名とパスワードを入力してください",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      // In a real application, this would call your authentication API
      // For demo purposes, we'll simulate a login with hardcoded credentials
      if (username === 'admin' && password === 'password') {
        // Create a mock JWT token (in production, this would come from your backend)
        const mockToken = btoa(JSON.stringify({
          sub: username,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
          role: 'admin'
        }))

        // Set HttpOnly cookie (in production, your backend would set this)
        document.cookie = `auth-token=${mockToken}; path=/; secure; samesite=strict; max-age=${24 * 60 * 60}`

        toast({
          title: "ログイン成功",
          description: "ダッシュボードにリダイレクトしています...",
        })

        // Redirect to the requested page or dashboard
        router.push(redirectPath)
      } else {
        toast({
          title: "ログインエラー",
          description: "ユーザー名またはパスワードが間違っています",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Login error:', error)
      toast({
        title: "ログインエラー",
        description: "ログイン処理中にエラーが発生しました",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-lg">
              <ShoppingCart className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent">
              POS システム
            </h1>
          </div>
          <p className="text-gray-600">管理者ダッシュボードにログイン</p>
        </div>

        {/* Login Form */}
        <Card className="border shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5" />
              ログイン
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">ユーザー名</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="ユーザー名を入力"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">パスワード</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="パスワードを入力"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ログイン中...
                  </div>
                ) : (
                  'ログイン'
                )}
              </Button>
            </form>

            {/* Demo Credentials */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">デモ用認証情報</h4>
              <div className="text-sm text-blue-800 space-y-1">
                <p><strong>ユーザー名:</strong> admin</p>
                <p><strong>パスワード:</strong> password</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Back to POS */}
        <div className="text-center mt-6">
          <Button
            variant="outline"
            onClick={() => router.push('/')}
            disabled={loading}
          >
            POSシステムに戻る
          </Button>
        </div>
      </div>
    </div>
  )
}