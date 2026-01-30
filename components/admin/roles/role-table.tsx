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
  Shield,
  Lock,
  Users,
} from 'lucide-react'
import type { RoleResponse } from '@/lib/admin/services/role.service'

interface RoleTableProps {
  roles: RoleResponse[]
  onEdit: (role: RoleResponse) => void
  onDelete: (role: RoleResponse) => void
  onToggleActive: (role: RoleResponse) => void
  onManagePermissions: (role: RoleResponse) => void
}

export function RoleTable({
  roles,
  onEdit,
  onDelete,
  onToggleActive,
  onManagePermissions,
}: RoleTableProps) {
  const getStatusBadge = (role: RoleResponse) => {
    if (!role.isActive) {
      return <Badge variant="secondary">Inactivo</Badge>
    }
    return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Activo</Badge>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Rol</TableHead>
          <TableHead>Codigo</TableHead>
          <TableHead>Usuarios</TableHead>
          <TableHead>Permisos</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {roles.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
              No se encontraron roles
            </TableCell>
          </TableRow>
        ) : (
          roles.map((role) => (
            <TableRow key={role.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div
                    className="h-8 w-8 rounded-md flex items-center justify-center"
                    style={{
                      backgroundColor: role.color ? `${role.color}20` : '#6366f120',
                      color: role.color || '#6366f1',
                    }}
                  >
                    {role.isSystem ? (
                      <Lock className="h-4 w-4" />
                    ) : (
                      <Shield className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{role.nombre}</p>
                    {role.descripcion && (
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {role.descripcion}
                      </p>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  {role.codigo}
                </code>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{role._count?.users ?? 0}</span>
                </div>
              </TableCell>
              <TableCell>
                <span className="text-sm">
                  {role._count?.permissions ?? 0} modulos
                </span>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {getStatusBadge(role)}
                  {role.isSystem && (
                    <Badge variant="outline" className="text-xs">
                      Sistema
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <PermissionGuard moduleCode="roles" action="edit">
                      <DropdownMenuItem onClick={() => onManagePermissions(role)}>
                        <Shield className="h-4 w-4 mr-2" />
                        Gestionar permisos
                      </DropdownMenuItem>
                    </PermissionGuard>

                    {!role.isSystem && (
                      <>
                        <PermissionGuard moduleCode="roles" action="edit">
                          <DropdownMenuItem onClick={() => onEdit(role)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                        </PermissionGuard>

                        <DropdownMenuSeparator />

                        <PermissionGuard moduleCode="roles" action="edit">
                          <DropdownMenuItem onClick={() => onToggleActive(role)}>
                            <Power className="h-4 w-4 mr-2" />
                            {role.isActive ? 'Desactivar' : 'Activar'}
                          </DropdownMenuItem>
                        </PermissionGuard>

                        <DropdownMenuSeparator />

                        <PermissionGuard moduleCode="roles" action="delete">
                          <DropdownMenuItem
                            onClick={() => onDelete(role)}
                            className="text-destructive focus:text-destructive"
                            disabled={(role._count?.users ?? 0) > 0}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        </PermissionGuard>
                      </>
                    )}
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
