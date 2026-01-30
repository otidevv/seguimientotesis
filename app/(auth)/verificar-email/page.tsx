'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Header } from '@/components/layout'
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Mail,
  ArrowRight,
  RefreshCw,
} from 'lucide-react'
import Link from 'next/link'

function VerificarEmailContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const token = searchParams.get('token')
  const emailParam = searchParams.get('email')

  const [status, setStatus] = useState<'idle' | 'verifying' | 'success' | 'error' | 'resending'>('idle')
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState(emailParam || '')

  // Si hay token, verificar automáticamente
  useEffect(() => {
    if (token) {
      verifyToken(token)
    }
  }, [token])

  const verifyToken = async (tokenValue: string) => {
    setStatus('verifying')
    setMessage('')

    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenValue }),
      })

      const data = await response.json()

      if (data.success) {
        setStatus('success')
        setMessage(data.message || 'Email verificado correctamente')
      } else {
        setStatus('error')
        setMessage(data.error || 'Error al verificar el email')
      }
    } catch {
      setStatus('error')
      setMessage('Error de conexión. Por favor intenta de nuevo.')
    }
  }

  const resendVerification = async () => {
    if (!email) {
      setMessage('Por favor ingresa tu email')
      return
    }

    setStatus('resending')
    setMessage('')

    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (data.success) {
        setStatus('idle')
        setMessage(data.message || 'Si el email está registrado, recibirás un correo de verificación.')
      } else {
        setStatus('error')
        setMessage(data.error || 'Error al reenviar el email')
      }
    } catch {
      setStatus('error')
      setMessage('Error de conexión. Por favor intenta de nuevo.')
    }
  }

  // Vista de verificación exitosa
  if (status === 'success') {
    return (
      <div className="min-h-screen bg-background bg-grid">
        <Header variant="auth" />
        <main className="container mx-auto px-4 py-12">
          <div className="max-w-md mx-auto">
            <Card className="shadow-lg">
              <CardContent className="pt-8 pb-8 text-center">
                <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Email Verificado</h2>
                <p className="text-muted-foreground mb-6">{message}</p>
                <Button asChild className="w-full">
                  <Link href="/login">
                    Iniciar Sesión
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    )
  }

  // Vista de error de verificación
  if (status === 'error' && token) {
    return (
      <div className="min-h-screen bg-background bg-grid">
        <Header variant="auth" />
        <main className="container mx-auto px-4 py-12">
          <div className="max-w-md mx-auto">
            <Card className="shadow-lg">
              <CardContent className="pt-8 pb-8 text-center">
                <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
                  <XCircle className="h-8 w-8 text-red-600" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Error de Verificación</h2>
                <p className="text-muted-foreground mb-6">{message}</p>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Ingresa tu email para reenviar</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="tu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <Button onClick={resendVerification} className="w-full">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reenviar Email
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    )
  }

  // Vista de verificando
  if (status === 'verifying') {
    return (
      <div className="min-h-screen bg-background bg-grid">
        <Header variant="auth" />
        <main className="container mx-auto px-4 py-12">
          <div className="max-w-md mx-auto">
            <Card className="shadow-lg">
              <CardContent className="pt-8 pb-8 text-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">Verificando email...</h2>
                <p className="text-muted-foreground">Por favor espera un momento</p>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    )
  }

  // Vista principal (esperando verificación o reenvío)
  return (
    <div className="min-h-screen bg-background bg-grid">
      <Header variant="auth" />
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto">
          <Card className="shadow-lg">
            <CardHeader className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Mail className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Verifica tu Email</CardTitle>
              <CardDescription>
                Te hemos enviado un correo de verificación
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {emailParam && (
                <Alert>
                  <Mail className="h-4 w-4" />
                  <AlertDescription>
                    Revisa tu bandeja de entrada en <strong>{emailParam}</strong>
                  </AlertDescription>
                </Alert>
              )}

              {message && (
                <Alert variant={status === 'error' ? 'destructive' : 'default'}>
                  <AlertDescription>{message}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-4 pt-4">
                <p className="text-sm text-muted-foreground text-center">
                  ¿No recibiste el correo? Ingresa tu email para reenviar.
                </p>

                <div className="space-y-2">
                  <Label htmlFor="email-resend">Email</Label>
                  <Input
                    id="email-resend"
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <Button
                  onClick={resendVerification}
                  className="w-full"
                  variant="outline"
                  disabled={status === 'resending'}
                >
                  {status === 'resending' ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Reenviando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Reenviar Email de Verificación
                    </>
                  )}
                </Button>

                <div className="text-center pt-4">
                  <Link href="/login" className="text-sm text-primary hover:underline">
                    Volver a Iniciar Sesión
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-background bg-grid">
      <Header variant="auth" />
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto">
          <Card className="shadow-lg">
            <CardContent className="pt-8 pb-8 text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Cargando...</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

export default function VerificarEmailPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <VerificarEmailContent />
    </Suspense>
  )
}
