'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRoles } from '@/hooks/use-roles'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RoleResponse, ModulePermission } from '@/lib/admin/services/role.service'

const ITEMS_PER_PAGE_OPTIONS = [5, 10, 20]

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

  // Paginacion
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

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

  // Reset pagina al cambiar filtros o items por pagina
  useEffect(() => {
    setPage(1)
  }, [roles.length, itemsPerPage])

  const handleFilter = useCallback((newFilters: any) => {
    setFilters(newFilters)
    setPage(1)
    fetchRoles(newFilters)
  }, [fetchRoles])

  // Paginacion client-side
  const totalPages = Math.max(1, Math.ceil(roles.length / itemsPerPage))
  const rolesPage = useMemo(() => {
    const start = (page - 1) * itemsPerPage
    return roles.slice(start, start + itemsPerPage)
  }, [roles, page, itemsPerPage])

  const startItem = roles.length === 0 ? 0 : (page - 1) * itemsPerPage + 1
  const endItem = Math.min(page * itemsPerPage, roles.length)

  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      if (page > 3) pages.push('...')
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
        pages.push(i)
      }
      if (page < totalPages - 2) pages.push('...')
      pages.push(totalPages)
    }
    return pages
  }

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
    <div className="container mx-auto py-6 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Administracion de Roles</h1>
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

        {/* Tabla */}
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-lg flex items-center gap-2">
              Roles ({roles.length})
              {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </CardTitle>
          </CardHeader>

          {/* Filtros integrados */}
          <div className="p-4 border-b">
            <RoleFilters onFilter={handleFilter} />
          </div>

          <CardContent className="p-0">
            {error ? (
              <div className="flex items-center justify-center py-8 text-destructive">
                <AlertTriangle className="h-5 w-5 mr-2" />
                {error}
              </div>
            ) : (
              <div className={cn('relative', isLoading && 'opacity-50 pointer-events-none')}>
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center z-10 bg-background/30">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                )}

                <RoleTable
                  roles={rolesPage}
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

                {/* Paginacion */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground whitespace-nowrap">Filas por pagina</span>
                      <Select value={String(itemsPerPage)} onValueChange={(v) => setItemsPerPage(Number(v))}>
                        <SelectTrigger className="w-[70px] h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent position="popper">
                          {ITEMS_PER_PAGE_OPTIONS.map((opt) => (
                            <SelectItem key={opt} value={String(opt)}>
                              {opt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="text-sm text-muted-foreground hidden sm:block">
                      Mostrando {startItem} - {endItem} de {roles.length}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 1}
                      onClick={() => setPage(page - 1)}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <div className="hidden sm:flex items-center gap-1">
                      {getPageNumbers().map((p, i) =>
                        typeof p === 'string' ? (
                          <span key={`ellipsis-${i}`} className="px-2 text-muted-foreground">...</span>
                        ) : (
                          <Button
                            key={p}
                            variant={page === p ? 'default' : 'outline'}
                            size="sm"
                            className="w-8 h-8 p-0"
                            onClick={() => setPage(p)}
                          >
                            {p}
                          </Button>
                        )
                      )}
                    </div>
                    <span className="sm:hidden text-sm text-muted-foreground px-2">
                      {page} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === totalPages}
                      onClick={() => setPage(page + 1)}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
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
    </div>
  )
}
