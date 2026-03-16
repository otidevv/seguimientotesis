'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuditLogs } from '@/hooks/use-audit-logs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PermissionGuard } from '@/components/auth/permission-guard'
import { AuditTable } from '@/components/admin/auditoria/audit-table'
import { AuditFilters } from '@/components/admin/auditoria/audit-filters'
import { AuditDetailDialog } from '@/components/admin/auditoria/audit-detail-dialog'
import { UserPagination } from '@/components/admin/usuarios/user-pagination'
import { ClipboardList, Loader2 } from 'lucide-react'
import type { AuditLogResponse } from '@/lib/admin/services/audit.service'
import type { AuditFilterValues } from '@/components/admin/auditoria/audit-filters'

export default function AuditoriaPage() {
  const {
    logs,
    pagination,
    isLoading,
    error,
    metadata,
    fetchLogs,
    fetchMetadata,
    setPage,
    setLimit,
  } = useAuditLogs()

  const [filters, setFilters] = useState<AuditFilterValues>({})
  const [selectedLog, setSelectedLog] = useState<AuditLogResponse | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  useEffect(() => {
    fetchMetadata()
  }, [fetchMetadata])

  useEffect(() => {
    fetchLogs(filters, pagination.page, pagination.limit)
  }, [pagination.page, pagination.limit])

  const handleFilter = useCallback((newFilters: AuditFilterValues) => {
    setFilters(newFilters)
    fetchLogs(newFilters, 1, pagination.limit)
  }, [fetchLogs, pagination.limit])

  const handleViewDetail = useCallback((log: AuditLogResponse) => {
    setSelectedLog(log)
    setDetailOpen(true)
  }, [])

  const handlePageChange = useCallback((page: number) => {
    setPage(page)
    fetchLogs(filters, page, pagination.limit)
  }, [setPage, fetchLogs, filters, pagination.limit])

  const handleLimitChange = useCallback((limit: number) => {
    setLimit(limit)
    fetchLogs(filters, 1, limit)
  }, [setLimit, fetchLogs, filters])

  return (
    <PermissionGuard
      moduleCode="auditoria"
      action="view"
      fallback={
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">No tienes permisos para ver esta sección.</p>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Auditoría</h1>
            <p className="text-muted-foreground">
              Registro de actividades del sistema
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Registros de Auditoría</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <AuditFilters
              onFilter={handleFilter}
              actions={metadata.actions}
              entityTypes={metadata.entityTypes}
            />

            {error && (
              <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
                {error}
              </div>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <AuditTable logs={logs} onViewDetail={handleViewDetail} />

                <UserPagination
                  page={pagination.page}
                  limit={pagination.limit}
                  total={pagination.total}
                  totalPages={pagination.totalPages}
                  onPageChange={handlePageChange}
                  onLimitChange={handleLimitChange}
                />
              </>
            )}
          </CardContent>
        </Card>

        <AuditDetailDialog
          log={selectedLog}
          open={detailOpen}
          onOpenChange={setDetailOpen}
        />
      </div>
    </PermissionGuard>
  )
}
