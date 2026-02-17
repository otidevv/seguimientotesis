'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, CheckCheck, FileText, UserCheck, ClipboardCheck, Calendar, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

interface Notification {
  id: string
  tipo: string
  titulo: string
  mensaje: string
  enlace: string | null
  leida: boolean
  createdAt: string
}

const ICON_MAP: Record<string, typeof Bell> = {
  INVITACION_ASESOR: UserCheck,
  INVITACION_COASESOR: UserCheck,
  TESIS_EN_REVISION: FileText,
  TESIS_APROBADA: ClipboardCheck,
  TESIS_OBSERVADA: ClipboardCheck,
  SUSTENTACION_PROGRAMADA: Calendar,
}

function tiempoRelativo(fecha: string): string {
  const ahora = new Date()
  const notif = new Date(fecha)
  const diffMs = ahora.getTime() - notif.getTime()
  const diffMin = Math.floor(diffMs / 60000)

  if (diffMin < 1) return 'Ahora'
  if (diffMin < 60) return `hace ${diffMin} min`
  const diffHoras = Math.floor(diffMin / 60)
  if (diffHoras < 24) return `hace ${diffHoras}h`
  const diffDias = Math.floor(diffHoras / 24)
  if (diffDias < 7) return `hace ${diffDias}d`
  return notif.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })
}

export function NotificationPanel() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [notificaciones, setNotificaciones] = useState<Notification[]>([])
  const [noLeidasCount, setNoLeidasCount] = useState(0)
  const [loading, setLoading] = useState(false)

  const fetchNotificaciones = useCallback(async () => {
    try {
      const res = await fetch('/api/notificaciones?limit=30')
      if (!res.ok) return
      const data = await res.json()
      if (data.success) {
        setNotificaciones(data.data)
        setNoLeidasCount(data.noLeidasCount)
      }
    } catch {
      // silently fail
    }
  }, [])

  // Fetch on mount + polling every 60s
  useEffect(() => {
    fetchNotificaciones()
    const interval = setInterval(fetchNotificaciones, 60000)
    return () => clearInterval(interval)
  }, [fetchNotificaciones])

  // Refetch when sheet opens
  useEffect(() => {
    if (open) {
      fetchNotificaciones()
    }
  }, [open, fetchNotificaciones])

  const marcarTodasLeidas = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/notificaciones', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ todas: true }),
      })
      if (res.ok) {
        setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })))
        setNoLeidasCount(0)
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }

  const handleClick = async (notif: Notification) => {
    // Mark as read
    if (!notif.leida) {
      try {
        await fetch('/api/notificaciones', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: [notif.id] }),
        })
        setNotificaciones(prev =>
          prev.map(n => n.id === notif.id ? { ...n, leida: true } : n)
        )
        setNoLeidasCount(prev => Math.max(0, prev - 1))
      } catch {
        // continue navigation
      }
    }
    // Navigate
    if (notif.enlace) {
      setOpen(false)
      router.push(notif.enlace)
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="sr-only">Notificaciones</span>
          {noLeidasCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 rounded-full bg-red-500 text-[10px] font-medium text-white flex items-center justify-center px-0.5">
              {noLeidasCount > 99 ? '99+' : noLeidasCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex flex-col p-0">
        <SheetHeader className="border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base">Notificaciones</SheetTitle>
            {noLeidasCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={marcarTodasLeidas}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <CheckCheck className="h-3 w-3" />
                )}
                Marcar todas como leídas
              </Button>
            )}
          </div>
          <SheetDescription className="sr-only">
            Panel de notificaciones del sistema
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1">
          {notificaciones.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Bell className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm">No tienes notificaciones</p>
            </div>
          ) : (
            <div className="divide-y">
              {notificaciones.map(notif => {
                const Icon = ICON_MAP[notif.tipo] || Bell
                return (
                  <button
                    key={notif.id}
                    onClick={() => handleClick(notif)}
                    className={cn(
                      'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50 cursor-pointer',
                      !notif.leida && 'bg-blue-50 dark:bg-blue-950/20'
                    )}
                  >
                    <div className={cn(
                      'mt-0.5 rounded-full p-1.5 shrink-0',
                      !notif.leida
                        ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400'
                        : 'bg-muted text-muted-foreground'
                    )}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        'text-sm leading-tight',
                        !notif.leida && 'font-medium'
                      )}>
                        {notif.titulo}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {notif.mensaje}
                      </p>
                      <p className="text-[11px] text-muted-foreground/70 mt-1">
                        {tiempoRelativo(notif.createdAt)}
                      </p>
                    </div>
                    {!notif.leida && (
                      <div className="mt-2 h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
