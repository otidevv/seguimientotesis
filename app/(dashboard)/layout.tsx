'use client'

import { useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, dispatchSessionExpired } from '@/contexts/auth-context'
import { api, ApiError } from '@/lib/api'
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
        await api.get('/api/auth/me')
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          // Solo loguear, el middleware se encarga de redirigir
          console.log('[Session] Token expirado, el middleware redirigirá')
        }
        // Otros errores (red, etc.), no hacer nada
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

  if (!isAuthenticated || !user) {
    if (isLoading) {
      return (
        <div className="flex-1 flex items-center justify-center" role="status" aria-label="Cargando dashboard">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 motion-safe:animate-spin text-primary" />
            <p className="text-muted-foreground">Cargando...</p>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <>
      <DashboardHeader />
      <div className="flex flex-1 overflow-hidden">
        <DashboardSidebar />
        <main id="main-content" className="flex-1 px-3 pt-2 pb-4 sm:p-6 lg:p-8 overflow-y-auto overflow-x-hidden">
          <div className="mx-auto max-w-7xl w-full">
            {children}
          </div>
        </main>
      </div>
    </>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <div className="fixed inset-0 flex flex-col bg-background overflow-hidden z-40">
        <DashboardLayoutContent>{children}</DashboardLayoutContent>
      </div>
      <Toaster position="top-right" richColors closeButton />
    </SidebarProvider>
  )
}
