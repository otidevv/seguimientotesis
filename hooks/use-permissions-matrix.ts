'use client'

import { useState, useCallback, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'

export interface MatrixRole {
  id: string
  codigo: string
  nombre: string
  color: string | null
  isSystem: boolean
}

export interface MatrixModule {
  id: string
  codigo: string
  nombre: string
  icono: string | null
  parentId: string | null
  orden: number
}

export interface MatrixPermission {
  roleId: string
  moduleId: string
  canView: boolean
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
}

export interface PermissionsMatrix {
  roles: MatrixRole[]
  modules: MatrixModule[]
  permissions: MatrixPermission[]
}

export interface PermissionChange {
  roleId: string
  moduleId: string
  canView: boolean
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
}

interface UsePermissionsMatrixReturn {
  // Data
  roles: MatrixRole[]
  modules: MatrixModule[]
  permissions: Map<string, MatrixPermission>
  pendingChanges: Map<string, PermissionChange>

  // State
  isLoading: boolean
  isSaving: boolean
  error: string | null
  hasChanges: boolean

  // Actions
  fetchMatrix: () => Promise<void>
  updatePermission: (
    roleId: string,
    moduleId: string,
    field: 'canView' | 'canCreate' | 'canEdit' | 'canDelete',
    value: boolean
  ) => void
  toggleAllForRole: (roleId: string) => void
  toggleAllForModule: (moduleId: string) => void
  saveChanges: () => Promise<boolean>
  discardChanges: () => void
  getPermission: (roleId: string, moduleId: string) => MatrixPermission
}

const createPermissionKey = (roleId: string, moduleId: string) => `${roleId}-${moduleId}`

const defaultPermission = (roleId: string, moduleId: string): MatrixPermission => ({
  roleId,
  moduleId,
  canView: false,
  canCreate: false,
  canEdit: false,
  canDelete: false,
})

export function usePermissionsMatrix(): UsePermissionsMatrixReturn {
  const { user } = useAuth()

  const [roles, setRoles] = useState<MatrixRole[]>([])
  const [modules, setModules] = useState<MatrixModule[]>([])
  const [permissions, setPermissions] = useState<Map<string, MatrixPermission>>(new Map())
  const [pendingChanges, setPendingChanges] = useState<Map<string, PermissionChange>>(new Map())

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasChanges = pendingChanges.size > 0

  // Obtener la matriz completa
  const fetchMatrix = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/permisos', {
        headers: {
          'x-user-id': user?.id || '',
        },
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Error al cargar la matriz de permisos')
      }

      const matrix: PermissionsMatrix = data.data

      setRoles(matrix.roles)
      setModules(matrix.modules)

      // Crear mapa de permisos
      const permMap = new Map<string, MatrixPermission>()
      matrix.permissions.forEach((perm) => {
        const key = createPermissionKey(perm.roleId, perm.moduleId)
        permMap.set(key, perm)
      })
      setPermissions(permMap)
      setPendingChanges(new Map())
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      setError(message)
      console.error('[usePermissionsMatrix] Error fetching matrix:', err)
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  // Obtener un permiso específico (considera los cambios pendientes)
  const getPermission = useCallback((roleId: string, moduleId: string): MatrixPermission => {
    const key = createPermissionKey(roleId, moduleId)

    // Primero buscar en cambios pendientes
    const pending = pendingChanges.get(key)
    if (pending) {
      return pending
    }

    // Luego buscar en permisos originales
    const existing = permissions.get(key)
    if (existing) {
      return existing
    }

    // Si no existe, devolver permiso vacío
    return defaultPermission(roleId, moduleId)
  }, [permissions, pendingChanges])

  // Actualizar un permiso individual
  const updatePermission = useCallback((
    roleId: string,
    moduleId: string,
    field: 'canView' | 'canCreate' | 'canEdit' | 'canDelete',
    value: boolean
  ) => {
    const key = createPermissionKey(roleId, moduleId)
    const current = getPermission(roleId, moduleId)

    let updated: PermissionChange = { ...current }

    // Lógica de dependencias:
    // - Si se activa crear/editar/eliminar, también se activa ver
    // - Si se desactiva ver, se desactivan todos
    if (value && field !== 'canView') {
      updated = { ...updated, [field]: true, canView: true }
    } else if (!value && field === 'canView') {
      updated = {
        ...updated,
        canView: false,
        canCreate: false,
        canEdit: false,
        canDelete: false,
      }
    } else {
      updated = { ...updated, [field]: value }
    }

    setPendingChanges((prev) => {
      const newMap = new Map(prev)

      // Verificar si el cambio es igual al original
      const original = permissions.get(key)
      const isEqualToOriginal = original &&
        original.canView === updated.canView &&
        original.canCreate === updated.canCreate &&
        original.canEdit === updated.canEdit &&
        original.canDelete === updated.canDelete

      // Si no había original y todo es false, también considerarlo igual
      const isEmptyPermission = !original &&
        !updated.canView &&
        !updated.canCreate &&
        !updated.canEdit &&
        !updated.canDelete

      if (isEqualToOriginal || isEmptyPermission) {
        newMap.delete(key)
      } else {
        newMap.set(key, updated)
      }

      return newMap
    })
  }, [getPermission, permissions])

  // Toggle todos los permisos para un rol
  const toggleAllForRole = useCallback((roleId: string) => {
    // Determinar si todos los permisos están activos para este rol
    const allActive = modules.every((mod) => {
      const perm = getPermission(roleId, mod.id)
      return perm.canView && perm.canCreate && perm.canEdit && perm.canDelete
    })

    const newValue = !allActive

    setPendingChanges((prev) => {
      const newMap = new Map(prev)

      modules.forEach((mod) => {
        const key = createPermissionKey(roleId, mod.id)
        const updated: PermissionChange = {
          roleId,
          moduleId: mod.id,
          canView: newValue,
          canCreate: newValue,
          canEdit: newValue,
          canDelete: newValue,
        }

        const original = permissions.get(key)
        const isEqualToOriginal = original &&
          original.canView === updated.canView &&
          original.canCreate === updated.canCreate &&
          original.canEdit === updated.canEdit &&
          original.canDelete === updated.canDelete

        const isEmptyPermission = !original &&
          !updated.canView &&
          !updated.canCreate &&
          !updated.canEdit &&
          !updated.canDelete

        if (isEqualToOriginal || isEmptyPermission) {
          newMap.delete(key)
        } else {
          newMap.set(key, updated)
        }
      })

      return newMap
    })
  }, [modules, getPermission, permissions])

  // Toggle todos los permisos para un módulo
  const toggleAllForModule = useCallback((moduleId: string) => {
    // Determinar si todos los permisos están activos para este módulo
    const allActive = roles.every((role) => {
      const perm = getPermission(role.id, moduleId)
      return perm.canView && perm.canCreate && perm.canEdit && perm.canDelete
    })

    const newValue = !allActive

    setPendingChanges((prev) => {
      const newMap = new Map(prev)

      roles.forEach((role) => {
        const key = createPermissionKey(role.id, moduleId)
        const updated: PermissionChange = {
          roleId: role.id,
          moduleId,
          canView: newValue,
          canCreate: newValue,
          canEdit: newValue,
          canDelete: newValue,
        }

        const original = permissions.get(key)
        const isEqualToOriginal = original &&
          original.canView === updated.canView &&
          original.canCreate === updated.canCreate &&
          original.canEdit === updated.canEdit &&
          original.canDelete === updated.canDelete

        const isEmptyPermission = !original &&
          !updated.canView &&
          !updated.canCreate &&
          !updated.canEdit &&
          !updated.canDelete

        if (isEqualToOriginal || isEmptyPermission) {
          newMap.delete(key)
        } else {
          newMap.set(key, updated)
        }
      })

      return newMap
    })
  }, [roles, getPermission, permissions])

  // Guardar cambios
  const saveChanges = useCallback(async (): Promise<boolean> => {
    if (pendingChanges.size === 0) {
      return true
    }

    setIsSaving(true)
    setError(null)

    try {
      const changes = Array.from(pendingChanges.values())

      const response = await fetch('/api/admin/permisos', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id || '',
        },
        body: JSON.stringify({ changes }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Error al guardar los cambios')
      }

      // Actualizar permisos locales con los cambios
      setPermissions((prev) => {
        const newMap = new Map(prev)
        pendingChanges.forEach((change, key) => {
          const hasAnyPerm = change.canView || change.canCreate || change.canEdit || change.canDelete
          if (hasAnyPerm) {
            newMap.set(key, change)
          } else {
            newMap.delete(key)
          }
        })
        return newMap
      })

      setPendingChanges(new Map())
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      setError(message)
      console.error('[usePermissionsMatrix] Error saving changes:', err)
      return false
    } finally {
      setIsSaving(false)
    }
  }, [pendingChanges, user?.id])

  // Descartar cambios
  const discardChanges = useCallback(() => {
    setPendingChanges(new Map())
  }, [])

  // Cargar matriz al montar
  useEffect(() => {
    fetchMatrix()
  }, [fetchMatrix])

  return {
    roles,
    modules,
    permissions,
    pendingChanges,
    isLoading,
    isSaving,
    error,
    hasChanges,
    fetchMatrix,
    updatePermission,
    toggleAllForRole,
    toggleAllForModule,
    saveChanges,
    discardChanges,
    getPermission,
  }
}
