'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { AuditLogResponse } from '@/lib/admin/services/audit.service'

interface AuditDetailDialogProps {
  log: AuditLogResponse | null
  open: boolean
  onOpenChange: (open: boolean) => void
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

function JsonView({ data, label }: { data: unknown; label: string }): React.ReactNode {
  if (!data) return null

  return (
    <div>
      <h4 className="text-sm font-medium mb-2">{label}</h4>
      <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto max-h-[200px]">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  )
}

export function AuditDetailDialog({ log, open, onOpenChange }: AuditDetailDialogProps) {
  if (!log) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Detalle de Auditoría</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]">
          <div className="space-y-4 pr-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-muted-foreground">Fecha</span>
                <p className="text-sm font-medium">{formatDate(log.createdAt)}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Estado</span>
                <div className="mt-0.5">
                  {log.status === 'SUCCESS' && (
                    <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Exitoso</Badge>
                  )}
                  {log.status === 'FAILURE' && <Badge variant="destructive">Fallido</Badge>}
                  {log.status === 'PENDING' && (
                    <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Pendiente</Badge>
                  )}
                </div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Usuario</span>
                <p className="text-sm font-medium">
                  {log.user
                    ? `${log.user.nombres} ${log.user.apellidoPaterno} ${log.user.apellidoMaterno}`
                    : 'Sistema'}
                </p>
                {log.user && (
                  <p className="text-xs text-muted-foreground">{log.user.email}</p>
                )}
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Acción</span>
                <p className="text-sm font-medium">{log.action.replace(/_/g, ' ')}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Tipo de Entidad</span>
                <p className="text-sm font-medium">{log.entityType || '-'}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">ID de Entidad</span>
                <p className="text-sm font-mono text-xs break-all">{log.entityId || '-'}</p>
              </div>
            </div>

            {log.description && (
              <>
                <Separator />
                <div>
                  <span className="text-xs text-muted-foreground">Descripción</span>
                  <p className="text-sm mt-1">{log.description}</p>
                </div>
              </>
            )}

            {log.errorMessage && (
              <>
                <Separator />
                <div>
                  <span className="text-xs text-muted-foreground">Mensaje de Error</span>
                  <p className="text-sm text-red-600 mt-1">{log.errorMessage}</p>
                </div>
              </>
            )}

            {(log.oldValues !== null || log.newValues !== null) && (
              <>
                <Separator />
                <div className="space-y-3">
                  {log.oldValues !== null && <JsonView data={log.oldValues} label="Valores Anteriores" />}
                  {log.newValues !== null && <JsonView data={log.newValues} label="Valores Nuevos" />}
                </div>
              </>
            )}

            {log.metadata !== null && (
              <>
                <Separator />
                <JsonView data={log.metadata} label="Metadata" />
              </>
            )}

            <Separator />
            <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
              <div>
                <span className="block">IP</span>
                <span className="font-mono">{log.ipAddress || '-'}</span>
              </div>
              <div>
                <span className="block">Método</span>
                <span className="font-mono">{log.requestMethod || '-'}</span>
              </div>
              <div className="col-span-2">
                <span className="block">Ruta</span>
                <span className="font-mono break-all">{log.requestPath || '-'}</span>
              </div>
              <div className="col-span-2">
                <span className="block">User Agent</span>
                <span className="font-mono break-all text-[10px]">{log.userAgent || '-'}</span>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
