'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Header } from '@/components/layout'
import {
  Mail,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Send,
} from 'lucide-react'

export default function RecuperarPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email) {
      setError('Por favor, ingresa tu correo electrónico')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al procesar la solicitud')
      }

      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar la solicitud')
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
              <CardTitle className="text-2xl">Recuperar Contraseña</CardTitle>
              <CardDescription>
                {success
                  ? 'Revisa tu correo electrónico'
                  : 'Ingresa tu correo para recibir instrucciones'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {success ? (
                <div className="space-y-6">
                  <Alert variant="success">
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>
                      Si el correo existe en nuestro sistema, recibirás un enlace para restablecer tu contraseña.
                    </AlertDescription>
                  </Alert>

                  <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                    <p className="text-sm text-muted-foreground">
                      <strong>Revisa tu bandeja de entrada</strong> y también la carpeta de spam.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      El enlace expirará en <strong>1 hora</strong>.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSuccess(false)
                        setEmail('')
                      }}
                    >
                      Enviar a otro correo
                    </Button>
                    <Link href="/login">
                      <Button variant="ghost" className="w-full gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        Volver a iniciar sesión
                      </Button>
                    </Link>
                  </div>
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
                    <Label htmlFor="email">Correo Electrónico</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="usuario@unamad.edu.pe"
                        className="pl-10"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Ingresa el correo con el que te registraste
                    </p>
                  </div>

                  <Button type="submit" className="w-full gap-2" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Enviar enlace de recuperación
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
