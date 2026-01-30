'use client'

import { useState, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import type { AdminUserResponse } from '@/lib/admin/types'

interface UseUsersOptions {
  initialPage?: number
  initialLimit?: number
}

interface UserFilters {
  search?: string
  tipoUsuario?: string
  isActive?: string
  roleId?: string
  sortBy?: string
  sortOrder?: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
  hasMore: boolean
}

export function useUsers(options: UseUsersOptions = {}) {
  const { authFetch } = useAuth()
  const [users, setUsers] = useState<AdminUserResponse[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: options.initialPage || 1,
    limit: options.initialLimit || 10,
    total: 0,
    totalPages: 0,
    hasMore: false,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchUsers = useCallback(async (filters: UserFilters = {}, page?: number, limit?: number) => {
    setIsLoading(true)
    setError(null)

    try {
      const currentPage = page || pagination.page
      const currentLimit = limit || pagination.limit
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: currentLimit.toString(),
      })

      // Agregar filtros que no estén vacíos
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.set(key, value)
        }
      })

      const response = await authFetch(`/api/admin/usuarios?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al cargar usuarios')
      }

      setUsers(data.data)
      setPagination(data.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setIsLoading(false)
    }
  }, [authFetch, pagination.page, pagination.limit])

  const createUser = useCallback(async (userData: any) => {
    const response = await authFetch('/api/admin/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    })

    const data = await response.json()

    if (!response.ok) {
      const error = new Error(data.error || 'Error al crear usuario') as any
      error.details = data.details
      throw error
    }

    return data.data
  }, [authFetch])

  const updateUser = useCallback(async (id: string, userData: any) => {
    const response = await authFetch(`/api/admin/usuarios/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    })

    const data = await response.json()

    if (!response.ok) {
      const error = new Error(data.error || 'Error al actualizar usuario') as any
      error.details = data.details
      throw error
    }

    return data.data
  }, [authFetch])

  const deleteUser = useCallback(async (id: string) => {
    const response = await authFetch(`/api/admin/usuarios/${id}`, {
      method: 'DELETE',
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Error al eliminar usuario')
    }

    return data
  }, [authFetch])

  const toggleActive = useCallback(async (id: string) => {
    const response = await authFetch(`/api/admin/usuarios/${id}/toggle-active`, {
      method: 'POST',
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Error al cambiar estado')
    }

    return data.data
  }, [authFetch])

  const unlockUser = useCallback(async (id: string) => {
    const response = await authFetch(`/api/admin/usuarios/${id}/unlock`, {
      method: 'POST',
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Error al desbloquear usuario')
    }

    return data.data
  }, [authFetch])

  const assignRole = useCallback(async (userId: string, roleData: { roleId: string }) => {
    const response = await authFetch(`/api/admin/usuarios/${userId}/roles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(roleData),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Error al asignar rol')
    }

    return data.data
  }, [authFetch])

  const removeRole = useCallback(async (userId: string, roleId: string) => {
    const response = await authFetch(`/api/admin/usuarios/${userId}/roles/${roleId}`, {
      method: 'DELETE',
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Error al remover rol')
    }

    return data.data
  }, [authFetch])

  const setPage = useCallback((page: number) => {
    setPagination(prev => ({ ...prev, page }))
  }, [])

  const setLimit = useCallback((limit: number) => {
    setPagination(prev => ({ ...prev, limit, page: 1 }))
  }, [])

  return {
    users,
    pagination,
    isLoading,
    error,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    toggleActive,
    unlockUser,
    assignRole,
    removeRole,
    setPage,
    setLimit,
  }
}
