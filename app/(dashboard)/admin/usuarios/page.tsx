'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useUsers } from '@/hooks/use-users'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PermissionGuard } from '@/components/auth/permission-guard'
import { UserTable } from '@/components/admin/usuarios/user-table'
import { UserFilters } from '@/components/admin/usuarios/user-filters'
import { UserFormDialog } from '@/components/admin/usuarios/user-form-dialog'
import { AssignRoleDialog } from '@/components/admin/usuarios/assign-role-dialog'
import { UserPagination } from '@/components/admin/usuarios/user-pagination'
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
  Users,
  Plus,
  AlertTriangle,
  Loader2,
} from 'lucide-react'
import type { AdminUserResponse } from '@/lib/admin/types'

interface Role {
  id: string
  nombre: string
  codigo: string
  color: string | null
}

export default function UsuariosPage() {
  const { authFetch } = useAuth()
  const {
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
  } = useUsers()

  const [roles, setRoles] = useState<Role[]>([])
  const [filters, setFilters] = useState({})

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [roleDialogOpen, setRoleDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<AdminUserResponse | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Cargar roles
  const loadRoles = async () => {
    try {
      const response = await authFetch('/api/admin/roles')
      const data = await response.json()
      if (data.success) {
        setRoles(data.data)
      }
    } catch (err) {
      console.error('Error loading roles:', err)
    }
  }

  // Cargar usuarios y roles al montar
  useEffect(() => {
    fetchUsers(filters)
    loadRoles()
  }, [])

  // Recargar cuando cambia la página
  useEffect(() => {
    fetchUsers(filters, pagination.page)
  }, [pagination.page])

  const handleFilter = useCallback((newFilters: any) => {
    setFilters(newFilters)
    setPage(1)
    fetchUsers(newFilters, 1)
  }, [setPage, fetchUsers])

  const handleCreate = async (data: any) => {
    try {
      await createUser(data)
      toast.success('Usuario creado correctamente')
      fetchUsers(filters)
    } catch (err: any) {
      toast.error(err.message)
      throw err
    }
  }

  const handleEdit = async (data: any) => {
    if (!selectedUser) return
    try {
      await updateUser(selectedUser.id, data)
      toast.success('Usuario actualizado correctamente')
      fetchUsers(filters)
    } catch (err: any) {
      toast.error(err.message)
      throw err
    }
  }

  const handleDelete = async () => {
    if (!selectedUser) return
    setIsDeleting(true)
    try {
      await deleteUser(selectedUser.id)
      toast.success('Usuario eliminado correctamente')
      setDeleteConfirmOpen(false)
      setSelectedUser(null)
      fetchUsers(filters)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleToggleActive = async (user: AdminUserResponse) => {
    try {
      await toggleActive(user.id)
      toast.success(user.isActive ? 'Usuario desactivado' : 'Usuario activado')
      fetchUsers(filters)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleUnlock = async (user: AdminUserResponse) => {
    try {
      await unlockUser(user.id)
      toast.success('Cuenta desbloqueada')
      fetchUsers(filters)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleAssignRole = async (userId: string, roleId: string, contextType?: string, contextId?: string) => {
    try {
      const roleData: { roleId: string; contextType?: string; contextId?: string } = { roleId }
      if (contextType && contextId) {
        roleData.contextType = contextType
        roleData.contextId = contextId
      }
      const updatedUser = await assignRole(userId, roleData)
      toast.success('Rol asignado correctamente')
      // Actualizar el usuario seleccionado para reflejar los cambios
      setSelectedUser(updatedUser)
      fetchUsers(filters)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleRemoveRole = async (userId: string, roleId: string) => {
    try {
      const updatedUser = await removeRole(userId, roleId)
      toast.success('Rol removido correctamente')
      // Actualizar el usuario seleccionado para reflejar los cambios
      setSelectedUser(updatedUser)
      fetchUsers(filters)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6" />
            Administracion de Usuarios
          </h1>
          <p className="text-muted-foreground">
            Gestiona los usuarios del sistema
          </p>
        </div>

        <PermissionGuard moduleCode="usuarios" action="create">
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Usuario
          </Button>
        </PermissionGuard>
      </div>

      {/* Filtros */}
      <UserFilters onFilter={handleFilter} roles={roles} />

      {/* Tabla */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              Usuarios ({pagination.total})
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
            <UserTable
                users={users}
                onEdit={(user) => {
                  setSelectedUser(user)
                  setEditDialogOpen(true)
                }}
                onDelete={(user) => {
                  setSelectedUser(user)
                  setDeleteConfirmOpen(true)
                }}
                onToggleActive={handleToggleActive}
                onUnlock={handleUnlock}
                onAssignRole={(user) => {
                  setSelectedUser(user)
                  setRoleDialogOpen(true)
                }}
                onView={(user) => {
                  setSelectedUser(user)
                  setEditDialogOpen(true)
                }}
              />
          )}

          {/* Paginacion */}
          <UserPagination
            page={pagination.page}
            limit={pagination.limit}
            total={pagination.total}
            totalPages={pagination.totalPages}
            onPageChange={(page) => {
              setPage(page)
              fetchUsers(filters, page)
            }}
            onLimitChange={(newLimit) => {
              setLimit(newLimit)
              fetchUsers(filters, 1, newLimit)
            }}
          />
        </CardContent>
      </Card>

      {/* Dialog Crear Usuario */}
      <UserFormDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        roles={roles}
        onSubmit={handleCreate}
      />

      {/* Dialog Editar Usuario */}
      <UserFormDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        user={selectedUser}
        onSubmit={handleEdit}
      />

      {/* Dialog Asignar Roles */}
      <AssignRoleDialog
        open={roleDialogOpen}
        onOpenChange={setRoleDialogOpen}
        user={selectedUser}
        roles={roles}
        onAssign={handleAssignRole}
        onRemove={handleRemoveRole}
      />

      {/* Dialog Confirmar Eliminacion */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Eliminacion</DialogTitle>
            <DialogDescription>
              ¿Estas seguro de eliminar a{' '}
              <strong>
                {selectedUser?.nombres} {selectedUser?.apellidoPaterno}
              </strong>
              ? Esta accion no se puede deshacer.
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
