'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Eye } from 'lucide-react'
import type { AuditLogResponse } from '@/lib/admin/services/audit.service'

interface AuditTableProps {
  logs: AuditLogResponse[]
  onViewDetail: (log: AuditLogResponse) => void
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-green-500/10 text-green-600 border-green-500/20',
  UPDATE: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  DELETE: 'bg-red-500/10 text-red-600 border-red-500/20',
  ACTIVATE: 'bg-green-500/10 text-green-600 border-green-500/20',
  DEACTIVATE: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  UNLOCK: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  ASSIGN: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  REMOVE: 'bg-red-500/10 text-red-600 border-red-500/20',
}

function getActionColor(action: string): string {
  for (const [key, color] of Object.entries(ACTION_COLORS)) {
    if (action.includes(key)) return color
  }
  return 'bg-gray-500/10 text-gray-600 border-gray-500/20'
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'SUCCESS':
      return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Exitoso</Badge>
    case 'FAILURE':
      return <Badge variant="destructive">Fallido</Badge>
    case 'PENDING':
      return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Pendiente</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

function formatDate(date: Date | string) {
  return new Date(date).toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function getUserName(log: AuditLogResponse): string {
  if (!log.user) return 'Sistema'
  return `${log.user.nombres} ${log.user.apellidoPaterno}`
}

export function AuditTable({ logs, onViewDetail }: AuditTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Fecha</TableHead>
          <TableHead>Usuario</TableHead>
          <TableHead>Acción</TableHead>
          <TableHead>Entidad</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Descripción</TableHead>
          <TableHead className="text-right">Detalle</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {logs.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
              No se encontraron registros de auditoría
            </TableCell>
          </TableRow>
        ) : (
          logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell className="whitespace-nowrap text-sm">
                {formatDate(log.createdAt)}
              </TableCell>
              <TableCell>
                <div className="text-sm font-medium">{getUserName(log)}</div>
                {log.user && (
                  <div className="text-xs text-muted-foreground">{log.user.email}</div>
                )}
              </TableCell>
              <TableCell>
                <Badge className={getActionColor(log.action)}>
                  {log.action.replace(/_/g, ' ')}
                </Badge>
              </TableCell>
              <TableCell>
                {log.entityType && (
                  <div>
                    <span className="text-sm">{log.entityType}</span>
                    {log.entityId && (
                      <div className="text-xs text-muted-foreground font-mono truncate max-w-[120px]">
                        {log.entityId}
                      </div>
                    )}
                  </div>
                )}
              </TableCell>
              <TableCell>{getStatusBadge(log.status)}</TableCell>
              <TableCell className="max-w-[200px]">
                <span className="text-sm text-muted-foreground truncate block">
                  {log.description || '-'}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onViewDetail(log)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}
