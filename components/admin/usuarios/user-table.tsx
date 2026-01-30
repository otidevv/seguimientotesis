'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PermissionGuard } from '@/components/auth/permission-guard'
import {
  MoreHorizontal,
  Edit,
  Trash2,
  Power,
  Unlock,
  Shield,
  Eye,
} from 'lucide-react'
import type { AdminUserResponse } from '@/lib/admin/types'

interface UserTableProps {
  users: AdminUserResponse[]
  onEdit: (user: AdminUserResponse) => void
  onDelete: (user: AdminUserResponse) => void
  onToggleActive: (user: AdminUserResponse) => void
  onUnlock: (user: AdminUserResponse) => void
  onAssignRole: (user: AdminUserResponse) => void
  onView: (user: AdminUserResponse) => void
}

export function UserTable({
  users,
  onEdit,
  onDelete,
  onToggleActive,
  onUnlock,
  onAssignRole,
  onView,
}: UserTableProps) {
  const getInitials = (user: AdminUserResponse) => {
    return `${user.nombres.charAt(0)}${user.apellidoPaterno.charAt(0)}`.toUpperCase()
  }

  const getStatusBadge = (user: AdminUserResponse) => {
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      return <Badge variant="destructive">Bloqueado</Badge>
    }
    if (!user.isActive) {
      return <Badge variant="secondary">Inactivo</Badge>
    }
    if (!user.isVerified) {
      return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Sin verificar</Badge>
    }
    return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Activo</Badge>
  }

  const isLocked = (user: AdminUserResponse) => {
    return user.lockedUntil && new Date(user.lockedUntil) > new Date()
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Usuario</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Roles</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
              No se encontraron usuarios
            </TableCell>
          </TableRow>
        ) : (
          users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    {user.avatarUrl && <AvatarImage src={user.avatarUrl} />}
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {getInitials(user)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      {user.nombres} {user.apellidoPaterno}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {user.numeroDocumento}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-sm">{user.email}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {user.roles.slice(0, 3).map((role) => (
                    <Badge key={role.id} variant="outline" className="text-xs">
                      {role.roleName}
                    </Badge>
                  ))}
                  {user.roles.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{user.roles.length - 3}
                    </Badge>
                  )}
                  {user.roles.length === 0 && (
                    <span className="text-xs text-muted-foreground">Sin roles</span>
                  )}
                </div>
              </TableCell>
              <TableCell>{getStatusBadge(user)}</TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onView(user)}>
                      <Eye className="h-4 w-4 mr-2" />
                      Ver detalles
                    </DropdownMenuItem>

                    <PermissionGuard moduleCode="usuarios" action="edit">
                      <DropdownMenuItem onClick={() => onEdit(user)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                    </PermissionGuard>

                    <PermissionGuard moduleCode="usuarios" action="edit">
                      <DropdownMenuItem onClick={() => onAssignRole(user)}>
                        <Shield className="h-4 w-4 mr-2" />
                        Gestionar roles
                      </DropdownMenuItem>
                    </PermissionGuard>

                    <DropdownMenuSeparator />

                    <PermissionGuard moduleCode="usuarios" action="edit">
                      <DropdownMenuItem onClick={() => onToggleActive(user)}>
                        <Power className="h-4 w-4 mr-2" />
                        {user.isActive ? 'Desactivar' : 'Activar'}
                      </DropdownMenuItem>
                    </PermissionGuard>

                    {isLocked(user) && (
                      <PermissionGuard moduleCode="usuarios" action="edit">
                        <DropdownMenuItem onClick={() => onUnlock(user)}>
                          <Unlock className="h-4 w-4 mr-2" />
                          Desbloquear
                        </DropdownMenuItem>
                      </PermissionGuard>
                    )}

                    <DropdownMenuSeparator />

                    <PermissionGuard moduleCode="usuarios" action="delete">
                      <DropdownMenuItem
                        onClick={() => onDelete(user)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar
                      </DropdownMenuItem>
                    </PermissionGuard>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}
