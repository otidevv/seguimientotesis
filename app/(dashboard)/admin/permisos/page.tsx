'use client'

import { useEffect } from 'react'
import { usePermissionsMatrix } from '@/hooks/use-permissions-matrix'
import { PermissionsMatrix } from '@/components/admin/permisos/permissions-matrix'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { toast } from 'sonner'
import { Key, AlertTriangle, Info } from 'lucide-react'

export default function PermisosPage() {
  const {
    roles,
    modules,
    getPermission,
    pendingChanges,
    isLoading,
    isSaving,
    error,
    hasChanges,
    updatePermission,
    toggleAllForRole,
    toggleAllForModule,
    saveChanges,
    discardChanges,
  } = usePermissionsMatrix()

  // Advertir al usuario si intenta salir con cambios pendientes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault()
        e.returnValue = 'Tienes cambios sin guardar. ¿Estás seguro de que quieres salir?'
        return e.returnValue
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasChanges])

  const handleSave = async () => {
    const success = await saveChanges()
    if (success) {
      toast.success('Permisos actualizados correctamente')
    } else {
      toast.error('Error al guardar los permisos')
    }
  }

  const handleDiscard = () => {
    discardChanges()
    toast.info('Cambios descartados')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Key className="h-6 w-6" />
            Matriz de Permisos
          </h1>
          <p className="text-muted-foreground">
            Configura los permisos de acceso para cada rol del sistema
          </p>
        </div>
      </div>

      {/* Información */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Cómo usar la matriz</AlertTitle>
        <AlertDescription>
          <ul className="mt-2 space-y-1 text-sm">
            <li>• Haz click en los checkboxes para activar/desactivar permisos individuales</li>
            <li>• Haz click en el nombre del rol para toggle todos sus permisos</li>
            <li>• Haz click en el nombre del módulo para toggle todos los permisos de ese módulo</li>
            <li>• Los cambios se resaltan en amarillo hasta que los guardes</li>
            <li>• El rol SUPER_ADMIN siempre mantiene todos los permisos activos</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Matriz de permisos */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">
            Roles × Módulos
          </CardTitle>
          <CardDescription>
            {roles.length} roles × {modules.length} módulos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PermissionsMatrix
            roles={roles}
            modules={modules}
            getPermission={getPermission}
            pendingChanges={pendingChanges}
            updatePermission={updatePermission}
            toggleAllForRole={toggleAllForRole}
            toggleAllForModule={toggleAllForModule}
            isLoading={isLoading}
            isSaving={isSaving}
            hasChanges={hasChanges}
            onSave={handleSave}
            onDiscard={handleDiscard}
          />
        </CardContent>
      </Card>
    </div>
  )
}
