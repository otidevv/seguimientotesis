'use client'

import React from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PermissionGuard } from '@/components/auth/permission-guard'
import {
  MoreHorizontal,
  Edit,
  Trash2,
  Power,
  FolderTree,
  Link as LinkIcon,
} from 'lucide-react'
import type { ModuleResponse } from '@/lib/admin/services/module.service'

interface ModuleTableProps {
  modules: ModuleResponse[]
  onEdit: (module: ModuleResponse) => void
  onDelete: (module: ModuleResponse) => void
  onToggleActive: (module: ModuleResponse) => void
}

export function ModuleTable({
  modules,
  onEdit,
  onDelete,
  onToggleActive,
}: ModuleTableProps) {
  // Agrupar módulos por padre para mostrar jerarquía
  const groupedModules = modules.reduce((acc, module) => {
    const parentId = module.parentId || 'root'
    if (!acc[parentId]) {
      acc[parentId] = []
    }
    acc[parentId].push(module)
    return acc
  }, {} as Record<string, ModuleResponse[]>)

  const rootModules = groupedModules['root'] || []

  const renderModuleRow = (module: ModuleResponse, isChild = false): React.ReactNode => {
    const children = groupedModules[module.id] || []

    return (
      <React.Fragment key={module.id}>
        <TableRow className={isChild ? 'bg-muted/30' : ''}>
          <TableCell>
            <div className={isChild ? 'pl-6' : ''}>
              {isChild && <span className="text-muted-foreground mr-2">└</span>}
              <span className="font-medium">{module.nombre}</span>
              {module.descripcion && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                  {module.descripcion}
                </p>
              )}
            </div>
          </TableCell>
          <TableCell>
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
              {module.codigo}
            </code>
          </TableCell>
          <TableCell className="hidden md:table-cell">
            {module.icono ? (
              <span className="text-sm">{module.icono}</span>
            ) : (
              <span className="text-muted-foreground text-xs">-</span>
            )}
          </TableCell>
          <TableCell className="hidden lg:table-cell">
            {module.ruta ? (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <LinkIcon className="h-3 w-3" />
                {module.ruta}
              </div>
            ) : (
              <span className="text-muted-foreground text-xs">-</span>
            )}
          </TableCell>
          <TableCell className="hidden md:table-cell text-center">
            {module._count?.children || 0}
          </TableCell>
          <TableCell className="hidden md:table-cell text-center">
            {module._count?.permissions || 0}
          </TableCell>
          <TableCell>
            <Badge variant={module.isActive ? 'default' : 'secondary'}>
              {module.isActive ? 'Activo' : 'Inactivo'}
            </Badge>
          </TableCell>
          <TableCell>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <PermissionGuard moduleCode="modulos" action="edit">
                  <DropdownMenuItem onClick={() => onEdit(module)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                </PermissionGuard>
                <PermissionGuard moduleCode="modulos" action="edit">
                  <DropdownMenuItem onClick={() => onToggleActive(module)}>
                    <Power className="h-4 w-4 mr-2" />
                    {module.isActive ? 'Desactivar' : 'Activar'}
                  </DropdownMenuItem>
                </PermissionGuard>
                <PermissionGuard moduleCode="modulos" action="delete">
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete(module)}
                    className="text-destructive"
                    disabled={(module._count?.children || 0) > 0 || (module._count?.permissions || 0) > 0}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar
                  </DropdownMenuItem>
                </PermissionGuard>
              </DropdownMenuContent>
            </DropdownMenu>
          </TableCell>
        </TableRow>
        {children.map((child) => renderModuleRow(child, true))}
      </React.Fragment>
    )
  }

  if (modules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <FolderTree className="h-12 w-12 mb-4" />
        <p>No hay módulos registrados</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Código</TableHead>
            <TableHead className="hidden md:table-cell">Icono</TableHead>
            <TableHead className="hidden lg:table-cell">Ruta</TableHead>
            <TableHead className="hidden md:table-cell text-center">Hijos</TableHead>
            <TableHead className="hidden md:table-cell text-center">Permisos</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rootModules.map((module) => renderModuleRow(module))}
        </TableBody>
      </Table>
    </div>
  )
}
