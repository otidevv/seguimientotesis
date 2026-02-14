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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import {
  Users,
  Plus,
  AlertTriangle,
  Eye,
  EyeOff,
  KeyRound,
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
    updateRoleContext,
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
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)

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
      setSelectedUser(updatedUser)
      fetchUsers(filters)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleChangePassword = async () => {
    if (!selectedUser || !newPassword) return
    if (newPassword.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres')
      return
    }
    setIsChangingPassword(true)
    try {
      await updateUser(selectedUser.id, { password: newPassword })
      toast.success(`Contraseña de ${selectedUser.nombres} actualizada`)
      setPasswordDialogOpen(false)
      setNewPassword('')
      setShowPassword(false)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handleUpdateRoleContext = async (userId: string, roleId: string, contextType?: string, contextId?: string) => {
    try {
      const updatedUser = await updateRoleContext(userId, roleId, contextType, contextId)
      toast.success('Facultad actualizada correctamente')
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
                onChangePassword={(user) => {
                  setSelectedUser(user)
                  setNewPassword('')
                  setShowPassword(false)
                  setPasswordDialogOpen(true)
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
        onUpdateContext={handleUpdateRoleContext}
      />

      {/* Dialog Cambiar Contraseña */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Cambiar Contraseña
            </DialogTitle>
            <DialogDescription>
              {selectedUser && (
                <>Nueva contraseña para <strong>{selectedUser.nombres} {selectedUser.apellidoPaterno}</strong></>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nueva contraseña</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="pr-10"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleChangePassword() }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {newPassword.length > 0 && newPassword.length < 8 && (
                <p className="text-xs text-destructive">Mínimo 8 caracteres</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleChangePassword}
              disabled={isChangingPassword || newPassword.length < 8}
            >
              {isChangingPassword && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Cambiar Contraseña
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
