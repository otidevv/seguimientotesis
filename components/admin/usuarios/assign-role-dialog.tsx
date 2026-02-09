'use client'

import { useState, useEffect } from 'react'
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
import { Label } from '@/components/ui/label'
import { Loader2, Plus, X, Shield, Building2 } from 'lucide-react'
import type { AdminUserResponse } from '@/lib/admin/types'

interface Facultad {
  id: string
  nombre: string
  codigo: string
}

interface AssignRoleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: AdminUserResponse | null
  roles: { id: string; nombre: string; codigo: string; color: string | null }[]
  onAssign: (userId: string, roleId: string, contextType?: string, contextId?: string) => Promise<void>
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
  const [selectedFacultad, setSelectedFacultad] = useState('')
  const [facultades, setFacultades] = useState<Facultad[]>([])
  const [isAssigning, setIsAssigning] = useState(false)
  const [removingRoleId, setRemovingRoleId] = useState<string | null>(null)

  // Cargar facultades al abrir el diálogo
  useEffect(() => {
    if (open) {
      fetch('/api/facultades')
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setFacultades(data.data)
          }
        })
        .catch(console.error)
    }
  }, [open])

  // Verificar si el rol seleccionado es MESA_PARTES
  const selectedRoleData = roles.find(r => r.id === selectedRole)
  const esMesaPartes = selectedRoleData?.codigo === 'MESA_PARTES'

  const availableRoles = roles.filter(
    (role) => !user?.roles.some((ur) => ur.roleId === role.id)
  )

  const handleAssign = async () => {
    if (!user || !selectedRole) return

    setIsAssigning(true)
    try {
      if (esMesaPartes && selectedFacultad) {
        await onAssign(user.id, selectedRole, 'FACULTAD', selectedFacultad)
      } else {
        await onAssign(user.id, selectedRole)
      }
      setSelectedRole('')
      setSelectedFacultad('')
    } finally {
      setIsAssigning(false)
    }
  }

  // Limpiar selección de facultad cuando cambia el rol
  const handleRoleChange = (roleId: string) => {
    setSelectedRole(roleId)
    setSelectedFacultad('')
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
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Asignar nuevo rol</Label>
                  <Select value={selectedRole} onValueChange={handleRoleChange}>
                    <SelectTrigger>
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
                </div>

                {/* Selector de facultad para MESA_PARTES */}
                {esMesaPartes && (
                  <div className="space-y-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                    <Label className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                      <Building2 className="h-4 w-4" />
                      Facultad asignada (opcional)
                    </Label>
                    <Select value={selectedFacultad || 'all'} onValueChange={(v) => setSelectedFacultad(v === 'all' ? '' : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todas las facultades" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas las facultades</SelectItem>
                        {facultades.map((fac) => (
                          <SelectItem key={fac.id} value={fac.id}>
                            {fac.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Si no selecciona una facultad, podrá gestionar proyectos de todas las facultades.
                    </p>
                  </div>
                )}

                <Button
                  onClick={handleAssign}
                  disabled={!selectedRole || isAssigning}
                  className="w-full"
                >
                  {isAssigning ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Asignar rol
                </Button>
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
