'use client'

import { useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, dispatchSessionExpired } from '@/contexts/auth-context'
import { SidebarProvider } from '@/contexts/sidebar-context'
import { DashboardSidebar } from '@/components/layout/sidebar'
import { DashboardHeader } from '@/components/layout/dashboard-header'
import { Toaster } from '@/components/ui/sonner'
import { Loader2 } from 'lucide-react'

// Intervalo de verificación de sesión (5 minutos)
const SESSION_CHECK_INTERVAL = 5 * 60 * 1000

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth()
  const router = useRouter()
  const lastActivityRef = useRef(Date.now())

  // Actualizar última actividad
  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now()
  }, [])

  // Verificar sesión periódicamente (solo en producción o si hay actividad)
  useEffect(() => {
    if (!isAuthenticated) return

    // El middleware ya maneja la redirección cuando el token expira
    // Este check es solo para actualizar el estado del frontend
    const checkSession = async () => {
      // Solo verificar si hubo actividad reciente (últimos 5 minutos)
      const timeSinceActivity = Date.now() - lastActivityRef.current
      if (timeSinceActivity > SESSION_CHECK_INTERVAL) {
        return // No verificar si el usuario está inactivo
      }

      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
        })

        if (!response.ok && response.status === 401) {
          // Solo disparar el evento, el middleware se encarga de redirigir
          // No llamar a dispatchSessionExpired aquí para evitar loops
          console.log('[Session] Token expirado, el middleware redirigirá')
        }
      } catch {
        // Error de red, no hacer nada
      }
    }

    // Verificar sesión periódicamente
    const intervalId = setInterval(checkSession, SESSION_CHECK_INTERVAL)

    // Agregar listeners de actividad
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
    events.forEach(event => {
      window.addEventListener(event, updateActivity, { passive: true })
    })

    return () => {
      clearInterval(intervalId)
      events.forEach(event => {
        window.removeEventListener(event, updateActivity)
      })
    }
  }, [isAuthenticated, updateActivity])

  // Redirigir a login si no está autenticado
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isLoading, isAuthenticated, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return null
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <DashboardHeader />
      <div className="flex">
        <DashboardSidebar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-h-[calc(100vh-4rem)] w-full lg:w-auto overflow-x-hidden">
          {children}
        </main>
      </div>
      <Toaster position="top-right" richColors closeButton />
    </div>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </SidebarProvider>
  )
}
