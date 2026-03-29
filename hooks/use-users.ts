'use client'

import { useState, useCallback } from 'react'
import { api } from '@/lib/api'
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

      const data = await api.get<{ data: AdminUserResponse[]; pagination: Pagination }>(
        '/api/admin/usuarios',
        {
          params: {
            page: currentPage,
            limit: currentLimit,
            ...filters,
          },
        }
      )

      setUsers(data.data)
      setPagination(data.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setIsLoading(false)
    }
  }, [pagination.page, pagination.limit])

  const createUser = useCallback(async (userData: any) => {
    const data = await api.post<{ data: AdminUserResponse }>('/api/admin/usuarios', userData)
    return data.data
  }, [])

  const updateUser = useCallback(async (id: string, userData: any) => {
    const data = await api.put<{ data: AdminUserResponse }>(`/api/admin/usuarios/${id}`, userData)
    return data.data
  }, [])

  const deleteUser = useCallback(async (id: string) => {
    return await api.delete(`/api/admin/usuarios/${id}`)
  }, [])

  const toggleActive = useCallback(async (id: string) => {
    const data = await api.post<{ data: AdminUserResponse }>(`/api/admin/usuarios/${id}/toggle-active`, {})
    return data.data
  }, [])

  const unlockUser = useCallback(async (id: string) => {
    const data = await api.post<{ data: AdminUserResponse }>(`/api/admin/usuarios/${id}/unlock`, {})
    return data.data
  }, [])

  const assignRole = useCallback(async (userId: string, roleData: { roleId: string; contextType?: string; contextId?: string }) => {
    const data = await api.post<{ data: AdminUserResponse }>(`/api/admin/usuarios/${userId}/roles`, roleData)
    return data.data
  }, [])

  const removeRole = useCallback(async (userId: string, roleId: string) => {
    const data = await api.delete<{ data: AdminUserResponse }>(`/api/admin/usuarios/${userId}/roles/${roleId}`)
    return data.data
  }, [])

  const updateRoleContext = useCallback(async (userId: string, roleId: string, contextType?: string, contextId?: string) => {
    const data = await api.patch<{ data: AdminUserResponse }>(`/api/admin/usuarios/${userId}/roles/${roleId}`, { contextType, contextId })
    return data.data
  }, [])

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
    updateRoleContext,
    setPage,
    setLimit,
  }
}
