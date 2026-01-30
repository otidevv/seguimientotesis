'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Header } from '@/components/layout'
import {
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Key,
} from 'lucide-react'

function RestablecerPasswordForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Verificar que hay token
  useEffect(() => {
    if (!token) {
      setError('Enlace inválido. Solicita un nuevo enlace de recuperación.')
    }
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!password || !confirmPassword) {
      setError('Por favor, completa todos los campos')
      return
    }

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, confirmPassword }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al restablecer la contraseña')
      }

      setSuccess(true)

      // Redirigir a login después de 3 segundos
      setTimeout(() => {
        router.push('/login')
      }, 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al restablecer la contraseña')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background bg-grid">
      <Header variant="auth" />

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto">
          <Card className="shadow-lg">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4">
                <Image
                  src="/logo/logounamad.png"
                  alt="UNAMAD Logo"
                  width={64}
                  height={64}
                  className="rounded-xl"
                />
              </div>
              <CardTitle className="text-2xl">Restablecer Contraseña</CardTitle>
              <CardDescription>
                {success
                  ? 'Tu contraseña ha sido actualizada'
                  : 'Crea una nueva contraseña para tu cuenta'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {success ? (
                <div className="space-y-6">
                  <Alert variant="success">
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>
                      Tu contraseña ha sido restablecida correctamente.
                    </AlertDescription>
                  </Alert>

                  <div className="p-4 rounded-lg bg-muted/50 text-center">
                    <p className="text-sm text-muted-foreground">
                      Serás redirigido a iniciar sesión en unos segundos...
                    </p>
                  </div>

                  <Link href="/login">
                    <Button className="w-full gap-2">
                      <Key className="h-4 w-4" />
                      Ir a iniciar sesión
                    </Button>
                  </Link>
                </div>
              ) : !token ? (
                <div className="space-y-6">
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      El enlace es inválido o ha expirado. Solicita un nuevo enlace de recuperación.
                    </AlertDescription>
                  </Alert>

                  <Link href="/recuperar-password">
                    <Button className="w-full gap-2">
                      Solicitar nuevo enlace
                    </Button>
                  </Link>

                  <Link href="/login">
                    <Button variant="ghost" className="w-full gap-2">
                      <ArrowLeft className="h-4 w-4" />
                      Volver a iniciar sesión
                    </Button>
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="password">Nueva Contraseña</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Mínimo 8 caracteres"
                        className="pl-10 pr-10"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        disabled={isLoading}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Repite la contraseña"
                        className="pl-10 pr-10"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        disabled={isLoading}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full gap-2" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Restableciendo...
                      </>
                    ) : (
                      <>
                        <Key className="h-4 w-4" />
                        Restablecer Contraseña
                      </>
                    )}
                  </Button>

                  <Link href="/login">
                    <Button variant="ghost" className="w-full gap-2">
                      <ArrowLeft className="h-4 w-4" />
                      Volver a iniciar sesión
                    </Button>
                  </Link>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

export default function RestablecerPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <RestablecerPasswordForm />
    </Suspense>
  )
}
