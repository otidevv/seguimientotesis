'use client'

import { useState, useCallback } from 'react'
import { api } from '@/lib/api'
import type { RoleResponse, RoleWithPermissions, ModulePermission } from '@/lib/admin/services/role.service'

interface RoleFilters {
  search?: string
  isActive?: string
  isSystem?: string
}

interface SystemModule {
  id: string
  nombre: string
  codigo: string
  descripcion: string | null
  icono: string | null
  ruta: string | null
  orden: number
  parentId: string | null
}

export function useRoles() {
  const [roles, setRoles] = useState<RoleResponse[]>([])
  const [modules, setModules] = useState<SystemModule[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchRoles = useCallback(async (filters: RoleFilters = {}) => {
    setIsLoading(true)
    setError(null)

    try {
      const data = await api.get<{ data: RoleResponse[] }>('/api/admin/roles', { params: filters })
      setRoles(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const fetchModules = useCallback(async () => {
    try {
      const data = await api.get<{ data: SystemModule[] }>('/api/admin/modules')
      setModules(data.data)
      return data.data
    } catch (err) {
      console.error('Error loading modules:', err)
      return []
    }
  }, [])

  const getRole = useCallback(async (id: string): Promise<RoleWithPermissions> => {
    const data = await api.get<{ data: RoleWithPermissions }>(`/api/admin/roles/${id}`)
    return data.data
  }, [])

  const createRole = useCallback(async (roleData: {
    nombre: string
    codigo: string
    descripcion?: string
    color?: string
  }) => {
    const data = await api.post<{ data: RoleResponse }>('/api/admin/roles', roleData)
    return data.data
  }, [])

  const updateRole = useCallback(async (id: string, roleData: {
    nombre?: string
    descripcion?: string
    color?: string
  }) => {
    const data = await api.put<{ data: RoleResponse }>(`/api/admin/roles/${id}`, roleData)
    return data.data
  }, [])

  const duplicateRole = useCallback(async (id: string) => {
    const data = await api.post<{ data: RoleResponse }>(`/api/admin/roles/${id}/duplicate`, {})
    return data.data
  }, [])

  const deleteRole = useCallback(async (id: string) => {
    return await api.delete(`/api/admin/roles/${id}`)
  }, [])

  const toggleActive = useCallback(async (id: string) => {
    const data = await api.post<{ data: RoleResponse }>(`/api/admin/roles/${id}/toggle-active`, {})
    return data.data
  }, [])

  const getPermissions = useCallback(async (roleId: string): Promise<ModulePermission[]> => {
    const data = await api.get<{ data: ModulePermission[] }>(`/api/admin/roles/${roleId}/permissions`)
    return data.data
  }, [])

  const updatePermissions = useCallback(async (
    roleId: string,
    permissions: Array<{
      moduleId: string
      canView: boolean
      canCreate: boolean
      canEdit: boolean
      canDelete: boolean
    }>
  ) => {
    const data = await api.put<{ data: ModulePermission[] }>(`/api/admin/roles/${roleId}/permissions`, { permissions })
    return data.data
  }, [])

  return {
    roles,
    modules,
    isLoading,
    error,
    fetchRoles,
    fetchModules,
    getRole,
    createRole,
    duplicateRole,
    updateRole,
    deleteRole,
    toggleActive,
    getPermissions,
    updatePermissions,
  }
}
