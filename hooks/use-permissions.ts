'use client'

import { useMemo } from 'react'
import { useAuth } from '@/contexts/auth-context'

type Action = 'view' | 'create' | 'edit' | 'delete'

interface PermissionActions {
  canView: boolean
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
  can: (action: Action) => boolean
}

/**
 * Hook para verificar permisos de un módulo específico
 */
export function usePermissions(moduleCode: string): PermissionActions {
  const { permissions } = useAuth()

  const modulePermission = useMemo(() => {
    return permissions.find((p) => p.moduleCode === moduleCode)
  }, [permissions, moduleCode])

  return useMemo(
    () => ({
      canView: modulePermission?.canView ?? false,
      canCreate: modulePermission?.canCreate ?? false,
      canEdit: modulePermission?.canEdit ?? false,
      canDelete: modulePermission?.canDelete ?? false,
      can: (action: Action) => {
        if (!modulePermission) return false
        switch (action) {
          case 'view':
            return modulePermission.canView
          case 'create':
            return modulePermission.canCreate
          case 'edit':
            return modulePermission.canEdit
          case 'delete':
            return modulePermission.canDelete
          default:
            return false
        }
      },
    }),
    [modulePermission]
  )
}

/**
 * Hook para verificar permisos de múltiples módulos
 */
export function useMultiplePermissions(
  moduleCodes: string[]
): Record<string, PermissionActions> {
  const { permissions } = useAuth()

  return useMemo(() => {
    const result: Record<string, PermissionActions> = {}

    for (const code of moduleCodes) {
      const perm = permissions.find((p) => p.moduleCode === code)
      result[code] = {
        canView: perm?.canView ?? false,
        canCreate: perm?.canCreate ?? false,
        canEdit: perm?.canEdit ?? false,
        canDelete: perm?.canDelete ?? false,
        can: (action: Action) => {
          if (!perm) return false
          switch (action) {
            case 'view':
              return perm.canView
            case 'create':
              return perm.canCreate
            case 'edit':
              return perm.canEdit
            case 'delete':
              return perm.canDelete
            default:
              return false
          }
        },
      }
    }

    return result
  }, [permissions, moduleCodes])
}

/**
 * Hook para verificar si el usuario puede acceder a un módulo (tiene al menos permiso de ver)
 */
export function useCanAccess(moduleCode: string): boolean {
  const { canView } = usePermissions(moduleCode)
  return canView
}
