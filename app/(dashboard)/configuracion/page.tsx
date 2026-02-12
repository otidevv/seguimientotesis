'use client'

import { useState } from 'react'
import { useTheme } from 'next-themes'
import { useAuth } from '@/contexts/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
  Palette,
  Sun,
  Moon,
  Monitor,
  Bell,
  Mail,
  FileText,
  MessageSquare,
  Shield,
  LogOut,
  Loader2,
  Check,
} from 'lucide-react'

export default function ConfiguracionPage() {
  const { theme, setTheme } = useTheme()
  const { logout } = useAuth()
  const [isLoggingOutAll, setIsLoggingOutAll] = useState(false)

  // Notification preferences (localStorage for now)
  const [notifEmail, setNotifEmail] = useState(() => {
    if (typeof window === 'undefined') return true
    return localStorage.getItem('pref_notif_email') !== 'false'
  })
  const [notifTesisStatus, setNotifTesisStatus] = useState(() => {
    if (typeof window === 'undefined') return true
    return localStorage.getItem('pref_notif_tesis') !== 'false'
  })
  const [notifComments, setNotifComments] = useState(() => {
    if (typeof window === 'undefined') return true
    return localStorage.getItem('pref_notif_comments') !== 'false'
  })
  const [notifInvitations, setNotifInvitations] = useState(() => {
    if (typeof window === 'undefined') return true
    return localStorage.getItem('pref_notif_invitations') !== 'false'
  })

  const updateNotifPref = (key: string, value: boolean, setter: (v: boolean) => void) => {
    setter(value)
    localStorage.setItem(key, String(value))
    toast.success('Preferencia actualizada')
  }

  const handleLogoutAll = async () => {
    setIsLoggingOutAll(true)
    try {
      const response = await fetch('/api/auth/logout-all', {
        method: 'POST',
        credentials: 'include',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al cerrar sesiones')
      }

      toast.success('Todas las sesiones han sido cerradas')
      // Redirigir al login después de un momento
      setTimeout(() => logout(), 1500)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al cerrar sesiones')
    } finally {
      setIsLoggingOutAll(false)
    }
  }

  const themeOptions = [
    { value: 'light', label: 'Claro', icon: Sun, description: 'Tema claro' },
    { value: 'dark', label: 'Oscuro', icon: Moon, description: 'Tema oscuro' },
    { value: 'system', label: 'Sistema', icon: Monitor, description: 'Según tu dispositivo' },
  ]

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configuración</h1>
        <p className="text-muted-foreground">
          Personaliza tu experiencia en el sistema
        </p>
      </div>

      {/* Apariencia */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Apariencia
          </CardTitle>
          <CardDescription>
            Elige el tema visual del sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {themeOptions.map((option) => {
              const Icon = option.icon
              const isActive = theme === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTheme(option.value)}
                  className={`relative flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors cursor-pointer ${
                    isActive
                      ? 'border-primary bg-primary/5'
                      : 'border-muted hover:border-muted-foreground/25 hover:bg-muted/50'
                  }`}
                >
                  {isActive && (
                    <div className="absolute top-2 right-2">
                      <Check className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div className={`rounded-full p-2.5 ${
                    isActive ? 'bg-primary/10' : 'bg-muted'
                  }`}>
                    <Icon className={`h-5 w-5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>
                  <span className={`text-sm font-medium ${isActive ? 'text-primary' : ''}`}>
                    {option.label}
                  </span>
                  <span className="text-xs text-muted-foreground">{option.description}</span>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Notificaciones */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notificaciones
          </CardTitle>
          <CardDescription>
            Configura qué notificaciones deseas recibir
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label className="font-medium">Notificaciones por correo</Label>
                <p className="text-xs text-muted-foreground">Recibe un resumen de actividad en tu email</p>
              </div>
            </div>
            <Switch
              checked={notifEmail}
              onCheckedChange={(v) => updateNotifPref('pref_notif_email', v, setNotifEmail)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label className="font-medium">Cambios de estado en tesis</Label>
                <p className="text-xs text-muted-foreground">Cuando tu tesis cambia de estado o es revisada</p>
              </div>
            </div>
            <Switch
              checked={notifTesisStatus}
              onCheckedChange={(v) => updateNotifPref('pref_notif_tesis', v, setNotifTesisStatus)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label className="font-medium">Comentarios y observaciones</Label>
                <p className="text-xs text-muted-foreground">Cuando alguien comenta en tu tesis</p>
              </div>
            </div>
            <Switch
              checked={notifComments}
              onCheckedChange={(v) => updateNotifPref('pref_notif_comments', v, setNotifComments)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label className="font-medium">Invitaciones</Label>
                <p className="text-xs text-muted-foreground">Cuando te invitan como coautor o asesor</p>
              </div>
            </div>
            <Switch
              checked={notifInvitations}
              onCheckedChange={(v) => updateNotifPref('pref_notif_invitations', v, setNotifInvitations)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Seguridad y sesiones */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Seguridad
          </CardTitle>
          <CardDescription>
            Gestiona la seguridad de tu cuenta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-red-500/10 p-2">
                <LogOut className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <p className="font-medium text-sm">Cerrar todas las sesiones</p>
                <p className="text-xs text-muted-foreground">
                  Se cerrará la sesión en todos los dispositivos, incluyendo este
                </p>
              </div>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleLogoutAll}
              disabled={isLoggingOutAll}
            >
              {isLoggingOutAll ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Cerrar todo'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
