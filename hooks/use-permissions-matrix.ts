'use client'

import { useState, useCallback, useEffect } from 'react'
import { api } from '@/lib/api'

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
  roles: MatrixRole[]
  modules: MatrixModule[]
  permissions: Map<string, MatrixPermission>
  pendingChanges: Map<string, PermissionChange>
  isLoading: boolean
  isSaving: boolean
  error: string | null
  hasChanges: boolean
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
  const [roles, setRoles] = useState<MatrixRole[]>([])
  const [modules, setModules] = useState<MatrixModule[]>([])
  const [permissions, setPermissions] = useState<Map<string, MatrixPermission>>(new Map())
  const [pendingChanges, setPendingChanges] = useState<Map<string, PermissionChange>>(new Map())

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasChanges = pendingChanges.size > 0

  const fetchMatrix = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await api.get<{ data: PermissionsMatrix }>('/api/admin/permisos')
      const matrix = result.data

      setRoles(matrix.roles)
      setModules(matrix.modules)

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
    } finally {
      setIsLoading(false)
    }
  }, [])

  const getPermission = useCallback((roleId: string, moduleId: string): MatrixPermission => {
    const key = createPermissionKey(roleId, moduleId)
    return pendingChanges.get(key) || permissions.get(key) || defaultPermission(roleId, moduleId)
  }, [permissions, pendingChanges])

  const updatePermission = useCallback((
    roleId: string,
    moduleId: string,
    field: 'canView' | 'canCreate' | 'canEdit' | 'canDelete',
    value: boolean
  ) => {
    const key = createPermissionKey(roleId, moduleId)
    const current = getPermission(roleId, moduleId)

    let updated: PermissionChange = { ...current }

    if (value && field !== 'canView') {
      updated = { ...updated, [field]: true, canView: true }
    } else if (!value && field === 'canView') {
      updated = { ...updated, canView: false, canCreate: false, canEdit: false, canDelete: false }
    } else {
      updated = { ...updated, [field]: value }
    }

    setPendingChanges((prev) => {
      const newMap = new Map(prev)
      const original = permissions.get(key)

      const isEqualToOriginal = original &&
        original.canView === updated.canView &&
        original.canCreate === updated.canCreate &&
        original.canEdit === updated.canEdit &&
        original.canDelete === updated.canDelete

      const isEmptyPermission = !original &&
        !updated.canView && !updated.canCreate && !updated.canEdit && !updated.canDelete

      if (isEqualToOriginal || isEmptyPermission) {
        newMap.delete(key)
      } else {
        newMap.set(key, updated)
      }

      return newMap
    })
  }, [getPermission, permissions])

  const toggleAllForRole = useCallback((roleId: string) => {
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
          roleId, moduleId: mod.id,
          canView: newValue, canCreate: newValue, canEdit: newValue, canDelete: newValue,
        }
        const original = permissions.get(key)
        const isEqual = original &&
          original.canView === newValue && original.canCreate === newValue &&
          original.canEdit === newValue && original.canDelete === newValue
        const isEmpty = !original && !newValue

        if (isEqual || isEmpty) { newMap.delete(key) } else { newMap.set(key, updated) }
      })
      return newMap
    })
  }, [modules, getPermission, permissions])

  const toggleAllForModule = useCallback((moduleId: string) => {
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
          roleId: role.id, moduleId,
          canView: newValue, canCreate: newValue, canEdit: newValue, canDelete: newValue,
        }
        const original = permissions.get(key)
        const isEqual = original &&
          original.canView === newValue && original.canCreate === newValue &&
          original.canEdit === newValue && original.canDelete === newValue
        const isEmpty = !original && !newValue

        if (isEqual || isEmpty) { newMap.delete(key) } else { newMap.set(key, updated) }
      })
      return newMap
    })
  }, [roles, getPermission, permissions])

  const saveChanges = useCallback(async (): Promise<boolean> => {
    if (pendingChanges.size === 0) return true

    setIsSaving(true)
    setError(null)

    try {
      const changes = Array.from(pendingChanges.values())
      await api.put('/api/admin/permisos', { changes })

      setPermissions((prev) => {
        const newMap = new Map(prev)
        pendingChanges.forEach((change, key) => {
          const hasAnyPerm = change.canView || change.canCreate || change.canEdit || change.canDelete
          if (hasAnyPerm) { newMap.set(key, change) } else { newMap.delete(key) }
        })
        return newMap
      })

      setPendingChanges(new Map())
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      return false
    } finally {
      setIsSaving(false)
    }
  }, [pendingChanges])

  const discardChanges = useCallback(() => {
    setPendingChanges(new Map())
  }, [])

  useEffect(() => {
    fetchMatrix()
  }, [fetchMatrix])

  return {
    roles, modules, permissions, pendingChanges,
    isLoading, isSaving, error, hasChanges,
    fetchMatrix, updatePermission, toggleAllForRole, toggleAllForModule,
    saveChanges, discardChanges, getPermission,
  }
}
