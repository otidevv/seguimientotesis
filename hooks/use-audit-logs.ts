'use client'

import { useState, useCallback } from 'react'
import { api } from '@/lib/api'
import type { AuditLogResponse } from '@/lib/admin/services/audit.service'

interface AuditFilters {
  search?: string
  action?: string
  entityType?: string
  status?: string
  userId?: string
  dateFrom?: string
  dateTo?: string
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

interface AuditMetadata {
  actions: string[]
  entityTypes: string[]
}

export function useAuditLogs() {
  const [logs, setLogs] = useState<AuditLogResponse[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasMore: false,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [metadata, setMetadata] = useState<AuditMetadata>({ actions: [], entityTypes: [] })

  const fetchLogs = useCallback(async (filters: AuditFilters = {}, page?: number, limit?: number) => {
    setIsLoading(true)
    setError(null)

    try {
      const currentPage = page || pagination.page
      const currentLimit = limit || pagination.limit

      const data = await api.get<{ data: AuditLogResponse[]; pagination: Pagination }>(
        '/api/admin/auditoria',
        {
          params: {
            page: currentPage,
            limit: currentLimit,
            ...filters,
          },
        }
      )

      setLogs(data.data)
      setPagination(data.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setIsLoading(false)
    }
  }, [pagination.page, pagination.limit])

  const fetchMetadata = useCallback(async () => {
    try {
      const data = await api.get<{ data: AuditMetadata }>('/api/admin/auditoria/metadata')
      setMetadata(data.data)
    } catch {
      // Silently fail - metadata is optional
    }
  }, [])

  const setPage = useCallback((page: number) => {
    setPagination((prev) => ({ ...prev, page }))
  }, [])

  const setLimit = useCallback((limit: number) => {
    setPagination((prev) => ({ ...prev, limit, page: 1 }))
  }, [])

  return {
    logs,
    pagination,
    isLoading,
    error,
    metadata,
    fetchLogs,
    fetchMetadata,
    setPage,
    setLimit,
  }
}
