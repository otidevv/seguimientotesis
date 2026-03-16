'use client'

import { useEffect } from 'react'
import { useSettings } from '@/hooks/use-settings'
import { PermissionGuard } from '@/components/auth/permission-guard'
import { SettingsCategory } from '@/components/admin/configuracion/settings-category'
import { Settings, Loader2, Calendar, Shield, Mail, Globe, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

const CATEGORY_META: Record<string, { title: string; description: string; icon: React.ReactNode; order: number }> = {
  general: {
    title: 'General',
    description: 'Configuración general de la aplicación',
    icon: <Globe className="h-5 w-5" />,
    order: 1,
  },
  plazos: {
    title: 'Plazos y Evaluación',
    description: 'Días hábiles para evaluación de jurados y correcciones de estudiantes',
    icon: <Calendar className="h-5 w-5" />,
    order: 2,
  },
  seguridad: {
    title: 'Seguridad',
    description: 'Configuración de autenticación, tokens y bloqueo de cuentas',
    icon: <Shield className="h-5 w-5" />,
    order: 3,
  },
  email: {
    title: 'Correo Electrónico',
    description: 'Configuración del servidor SMTP para el envío de notificaciones',
    icon: <Mail className="h-5 w-5" />,
    order: 4,
  },
}

export default function ConfiguracionAdminPage() {
  const {
    settings,
    isLoading,
    isSaving,
    error,
    fetchSettings,
    saveSettings,
  } = useSettings()

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const handleSave = async (updates: { key: string; value: string }[]) => {
    const success = await saveSettings(updates)
    if (success) {
      toast.success('Configuración guardada correctamente')
    } else {
      toast.error('Error al guardar la configuración')
    }
    return success
  }

  // Ordenar categorías
  const sortedCategories = Object.keys(settings).sort((a, b) => {
    const orderA = CATEGORY_META[a]?.order ?? 99
    const orderB = CATEGORY_META[b]?.order ?? 99
    return orderA - orderB
  })

  return (
    <PermissionGuard
      moduleCode="configuracion"
      action="view"
      fallback={
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">No tienes permisos para ver esta sección.</p>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Settings className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Configuración del Sistema</h1>
            <p className="text-muted-foreground">
              Parámetros generales del sistema de seguimiento de tesis
            </p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-destructive/10 text-destructive p-3 rounded-md text-sm">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 p-3 rounded-md text-sm">
          <strong>Nota:</strong> Los cambios en seguridad y tokens se aplicarán a las nuevas sesiones.
          Las configuraciones de email por facultad se administran desde las variables de entorno del servidor.
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {sortedCategories.map((category) => {
              const meta = CATEGORY_META[category] || {
                title: category,
                description: '',
                icon: <Settings className="h-5 w-5" />,
              }

              return (
                <SettingsCategory
                  key={category}
                  title={meta.title}
                  description={meta.description}
                  icon={meta.icon}
                  settings={settings[category] || []}
                  onSave={handleSave}
                  isSaving={isSaving}
                />
              )
            })}
          </div>
        )}
      </div>
    </PermissionGuard>
  )
}
