'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRoles } from '@/hooks/use-roles'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PermissionGuard } from '@/components/auth/permission-guard'
import { RoleTable } from '@/components/admin/roles/role-table'
import { RoleFilters } from '@/components/admin/roles/role-filters'
import { RoleFormDialog } from '@/components/admin/roles/role-form-dialog'
import { PermissionsDialog } from '@/components/admin/roles/permissions-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  Shield,
  Plus,
  AlertTriangle,
  Loader2,
} from 'lucide-react'
import type { RoleResponse, ModulePermission } from '@/lib/admin/services/role.service'

export default function RolesPage() {
  const {
    roles,
    isLoading,
    error,
    fetchRoles,
    createRole,
    updateRole,
    deleteRole,
    toggleActive,
    getPermissions,
    updatePermissions,
  } = useRoles()

  const [filters, setFilters] = useState({})

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<RoleResponse | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Permissions state
  const [permissions, setPermissions] = useState<ModulePermission[]>([])
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(false)

  // Cargar roles al montar
  useEffect(() => {
    fetchRoles()
  }, [])

  const handleFilter = useCallback((newFilters: any) => {
    setFilters(newFilters)
    fetchRoles(newFilters)
  }, [fetchRoles])

  const handleCreate = async (data: any) => {
    try {
      await createRole(data)
      toast.success('Rol creado correctamente')
      fetchRoles(filters)
    } catch (err: any) {
      toast.error(err.message)
      throw err
    }
  }

  const handleEdit = async (data: any) => {
    if (!selectedRole) return
    try {
      await updateRole(selectedRole.id, data)
      toast.success('Rol actualizado correctamente')
      fetchRoles(filters)
    } catch (err: any) {
      toast.error(err.message)
      throw err
    }
  }

  const handleDelete = async () => {
    if (!selectedRole) return
    setIsDeleting(true)
    try {
      await deleteRole(selectedRole.id)
      toast.success('Rol eliminado correctamente')
      setDeleteConfirmOpen(false)
      setSelectedRole(null)
      fetchRoles(filters)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleToggleActive = async (role: RoleResponse) => {
    try {
      await toggleActive(role.id)
      toast.success(role.isActive ? 'Rol desactivado' : 'Rol activado')
      fetchRoles(filters)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleManagePermissions = async (role: RoleResponse) => {
    setSelectedRole(role)
    setPermissionsDialogOpen(true)
    setIsLoadingPermissions(true)
    try {
      const perms = await getPermissions(role.id)
      setPermissions(perms)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsLoadingPermissions(false)
    }
  }

  const handleSavePermissions = async (perms: Array<{
    moduleId: string
    canView: boolean
    canCreate: boolean
    canEdit: boolean
    canDelete: boolean
  }>) => {
    if (!selectedRole) return
    try {
      await updatePermissions(selectedRole.id, perms)
      toast.success('Permisos actualizados correctamente')
      fetchRoles(filters)
    } catch (err: any) {
      toast.error(err.message)
      throw err
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Administracion de Roles
          </h1>
          <p className="text-muted-foreground">
            Gestiona los roles y permisos del sistema
          </p>
        </div>

        <PermissionGuard moduleCode="roles" action="create">
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Rol
          </Button>
        </PermissionGuard>
      </div>

      {/* Filtros */}
      <RoleFilters onFilter={handleFilter} />

      {/* Tabla */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              Roles ({roles.length})
              {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="flex items-center justify-center py-8 text-destructive">
              <AlertTriangle className="h-5 w-5 mr-2" />
              {error}
            </div>
          ) : (
            <RoleTable
              roles={roles}
              onEdit={(role) => {
                setSelectedRole(role)
                setEditDialogOpen(true)
              }}
              onDelete={(role) => {
                setSelectedRole(role)
                setDeleteConfirmOpen(true)
              }}
              onToggleActive={handleToggleActive}
              onManagePermissions={handleManagePermissions}
            />
          )}
        </CardContent>
      </Card>

      {/* Dialog Crear Rol */}
      <RoleFormDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreate}
      />

      {/* Dialog Editar Rol */}
      <RoleFormDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        role={selectedRole}
        onSubmit={handleEdit}
      />

      {/* Dialog Permisos */}
      <PermissionsDialog
        open={permissionsDialogOpen}
        onOpenChange={setPermissionsDialogOpen}
        role={selectedRole}
        permissions={permissions}
        isLoading={isLoadingPermissions}
        onSave={handleSavePermissions}
      />

      {/* Dialog Confirmar Eliminacion */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Eliminacion</DialogTitle>
            <DialogDescription>
              ¿Estas seguro de eliminar el rol{' '}
              <strong>{selectedRole?.nombre}</strong>?
              Esta accion no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
