'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Plus, X, Shield } from 'lucide-react'
import type { AdminUserResponse } from '@/lib/admin/types'

interface AssignRoleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: AdminUserResponse | null
  roles: { id: string; nombre: string; codigo: string; color: string | null }[]
  onAssign: (userId: string, roleId: string) => Promise<void>
  onRemove: (userId: string, roleId: string) => Promise<void>
}

export function AssignRoleDialog({
  open,
  onOpenChange,
  user,
  roles,
  onAssign,
  onRemove,
}: AssignRoleDialogProps) {
  const [selectedRole, setSelectedRole] = useState('')
  const [isAssigning, setIsAssigning] = useState(false)
  const [removingRoleId, setRemovingRoleId] = useState<string | null>(null)

  const availableRoles = roles.filter(
    (role) => !user?.roles.some((ur) => ur.roleId === role.id)
  )

  const handleAssign = async () => {
    if (!user || !selectedRole) return

    setIsAssigning(true)
    try {
      await onAssign(user.id, selectedRole)
      setSelectedRole('')
    } finally {
      setIsAssigning(false)
    }
  }

  const handleRemove = async (roleId: string) => {
    if (!user) return

    setRemovingRoleId(roleId)
    try {
      await onRemove(user.id, roleId)
    } finally {
      setRemovingRoleId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Gestionar Roles
          </DialogTitle>
          <DialogDescription>
            {user
              ? `Administra los roles de ${user.nombres} ${user.apellidoPaterno}`
              : 'Selecciona un usuario'}
          </DialogDescription>
        </DialogHeader>

        {user && (
          <div className="space-y-4">
            {/* Roles actuales */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Roles actuales</label>
              <div className="flex flex-wrap gap-2 min-h-[40px] p-3 border rounded-lg bg-muted/50">
                {user.roles.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin roles asignados</p>
                ) : (
                  user.roles.map((role) => (
                    <Badge key={role.id} variant="secondary" className="gap-1 pr-1">
                      {role.roleName}
                      <button
                        onClick={() => handleRemove(role.roleId)}
                        disabled={removingRoleId === role.roleId}
                        className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                      >
                        {removingRoleId === role.roleId ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <X className="h-3 w-3" />
                        )}
                      </button>
                    </Badge>
                  ))
                )}
              </div>
            </div>

            {/* Asignar nuevo rol */}
            {availableRoles.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Asignar nuevo rol</label>
                <div className="flex gap-2">
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Seleccionar rol..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRoles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleAssign}
                    disabled={!selectedRole || isAssigning}
                  >
                    {isAssigning ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            )}

            {availableRoles.length === 0 && user.roles.length > 0 && (
              <p className="text-sm text-muted-foreground text-center py-2">
                El usuario ya tiene todos los roles disponibles
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
