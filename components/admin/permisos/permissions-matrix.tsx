'use client'

import React, { useState, useMemo } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Eye,
  Plus,
  Edit,
  Trash2,
  Search,
  Loader2,
  Save,
  RotateCcw,
  CheckSquare,
  Filter,
} from 'lucide-react'
import type {
  MatrixRole,
  MatrixModule,
  MatrixPermission,
  PermissionChange,
} from '@/hooks/use-permissions-matrix'
import { cn } from '@/lib/utils'

interface PermissionsMatrixProps {
  roles: MatrixRole[]
  modules: MatrixModule[]
  getPermission: (roleId: string, moduleId: string) => MatrixPermission
  pendingChanges: Map<string, PermissionChange>
  updatePermission: (
    roleId: string,
    moduleId: string,
    field: 'canView' | 'canCreate' | 'canEdit' | 'canDelete',
    value: boolean
  ) => void
  toggleAllForRole: (roleId: string) => void
  toggleAllForModule: (moduleId: string) => void
  isLoading: boolean
  isSaving: boolean
  hasChanges: boolean
  onSave: () => void
  onDiscard: () => void
}

export function PermissionsMatrix({
  roles,
  modules,
  getPermission,
  pendingChanges,
  updatePermission,
  toggleAllForRole,
  toggleAllForModule,
  isLoading,
  isSaving,
  hasChanges,
  onSave,
  onDiscard,
}: PermissionsMatrixProps) {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [onlyWithPermissions, setOnlyWithPermissions] = useState(false)

  // Filtrar roles según el filtro seleccionado
  const filteredRoles = useMemo(() => {
    if (roleFilter === 'all') return roles
    return roles.filter((r) => r.id === roleFilter)
  }, [roles, roleFilter])

  // Organizar módulos jerárquicamente y filtrar
  const organizedModules = useMemo(() => {
    // Filtrar por búsqueda
    let filtered = modules
    if (search) {
      const searchLower = search.toLowerCase()
      filtered = modules.filter(
        (m) =>
          m.nombre.toLowerCase().includes(searchLower) ||
          m.codigo.toLowerCase().includes(searchLower)
      )
    }

    // Filtrar por "solo con permisos"
    if (onlyWithPermissions) {
      filtered = filtered.filter((mod) =>
        filteredRoles.some((role) => {
          const perm = getPermission(role.id, mod.id)
          return perm.canView || perm.canCreate || perm.canEdit || perm.canDelete
        })
      )
    }

    // Organizar jerárquicamente
    const rootModules = filtered.filter((m) => !m.parentId)
    const childMap = new Map<string, MatrixModule[]>()

    filtered.forEach((m) => {
      if (m.parentId) {
        const children = childMap.get(m.parentId) || []
        children.push(m)
        childMap.set(m.parentId, children)
      }
    })

    // Construir lista ordenada con hijos después de padres
    const result: { module: MatrixModule; isChild: boolean }[] = []
    rootModules.forEach((parent) => {
      result.push({ module: parent, isChild: false })
      const children = childMap.get(parent.id) || []
      children.sort((a, b) => a.orden - b.orden)
      children.forEach((child) => {
        result.push({ module: child, isChild: true })
      })
    })

    return result
  }, [modules, search, onlyWithPermissions, filteredRoles, getPermission])

  // Verificar si un permiso tiene cambios pendientes
  const hasPendingChange = (roleId: string, moduleId: string) => {
    return pendingChanges.has(`${roleId}-${moduleId}`)
  }

  // Toggle todos los permisos de un módulo para un rol específico
  const toggleAllForModuleAndRole = (roleId: string, moduleId: string) => {
    const perm = getPermission(roleId, moduleId)
    const allActive = perm.canView && perm.canCreate && perm.canEdit && perm.canDelete
    const newValue = !allActive

    // Actualizar todos los permisos a la vez
    updatePermission(roleId, moduleId, 'canView', newValue)
    if (newValue) {
      updatePermission(roleId, moduleId, 'canCreate', true)
      updatePermission(roleId, moduleId, 'canEdit', true)
      updatePermission(roleId, moduleId, 'canDelete', true)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-3 text-muted-foreground">Cargando matriz de permisos...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Barra de herramientas */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between bg-muted/50 p-4 rounded-lg">
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          {/* Búsqueda */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar módulo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-full sm:w-[200px]"
            />
          </div>

          {/* Filtro por rol */}
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filtrar por rol" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los roles</SelectItem>
              {roles.map((role) => (
                <SelectItem key={role.id} value={role.id}>
                  {role.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Toggle solo con permisos */}
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={onlyWithPermissions}
              onCheckedChange={(checked) => setOnlyWithPermissions(checked === true)}
            />
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              Solo con permisos
            </span>
          </label>
        </div>

        {/* Botones de acción */}
        <div className="flex gap-2 w-full sm:w-auto">
          {hasChanges && (
            <>
              <Badge variant="secondary" className="gap-1">
                {pendingChanges.size} cambio{pendingChanges.size !== 1 ? 's' : ''}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={onDiscard}
                disabled={isSaving}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Descartar
              </Button>
            </>
          )}
          <Button
            size="sm"
            onClick={onSave}
            disabled={!hasChanges || isSaving}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Guardar
          </Button>
        </div>
      </div>

      {/* Matriz de permisos */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <TooltipProvider>
            <table className="w-full min-w-[800px]">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-sm sticky left-0 bg-muted/50 z-20 min-w-[200px]">
                    Módulo
                  </th>
                  {filteredRoles.map((role) => (
                    <th
                      key={role.id}
                      className="text-center py-3 px-2 min-w-[140px]"
                      colSpan={1}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={() => toggleAllForRole(role.id)}
                              className="font-medium text-sm hover:text-primary transition-colors flex items-center gap-1"
                              style={{ color: role.color || undefined }}
                            >
                              {role.nombre}
                              {role.isSystem && (
                                <Badge variant="outline" className="text-[10px] px-1 py-0">
                                  Sistema
                                </Badge>
                              )}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            Click para toggle todos los permisos
                          </TooltipContent>
                        </Tooltip>
                        <div className="flex gap-1 text-[10px] text-muted-foreground">
                          <span title="Ver">V</span>
                          <span title="Crear">C</span>
                          <span title="Editar">E</span>
                          <span title="Eliminar">D</span>
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {organizedModules.length === 0 ? (
                  <tr>
                    <td
                      colSpan={filteredRoles.length + 1}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No se encontraron módulos
                    </td>
                  </tr>
                ) : (
                  organizedModules.map(({ module, isChild }) => (
                    <tr
                      key={module.id}
                      className={cn(
                        'border-t hover:bg-muted/30 transition-colors',
                        isChild && 'bg-muted/10'
                      )}
                    >
                      <td className="py-2 px-4 sticky left-0 bg-background z-10">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={() => toggleAllForModule(module.id)}
                              className="flex items-start gap-2 w-full text-left hover:text-primary transition-colors"
                            >
                              {isChild && (
                                <span className="text-muted-foreground text-xs mt-0.5 ml-2">
                                  └
                                </span>
                              )}
                              <div className="min-w-0">
                                <p className="font-medium text-sm truncate">
                                  {module.nombre}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  {module.codigo}
                                </p>
                              </div>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="right">
                            Click para toggle todos los permisos de este módulo
                          </TooltipContent>
                        </Tooltip>
                      </td>
                      {filteredRoles.map((role) => {
                        const perm = getPermission(role.id, module.id)
                        const hasChange = hasPendingChange(role.id, module.id)
                        const allActive =
                          perm.canView && perm.canCreate && perm.canEdit && perm.canDelete

                        return (
                          <td key={role.id} className="py-2 px-2">
                            <div
                              className={cn(
                                'flex items-center justify-center gap-1 p-1 rounded',
                                hasChange && 'bg-yellow-100 dark:bg-yellow-900/30'
                              )}
                            >
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div>
                                    <Checkbox
                                      checked={perm.canView}
                                      onCheckedChange={(checked) =>
                                        updatePermission(role.id, module.id, 'canView', checked === true)
                                      }
                                      className="h-4 w-4"
                                    />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>Ver</TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div>
                                    <Checkbox
                                      checked={perm.canCreate}
                                      onCheckedChange={(checked) =>
                                        updatePermission(role.id, module.id, 'canCreate', checked === true)
                                      }
                                      className="h-4 w-4"
                                    />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>Crear</TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div>
                                    <Checkbox
                                      checked={perm.canEdit}
                                      onCheckedChange={(checked) =>
                                        updatePermission(role.id, module.id, 'canEdit', checked === true)
                                      }
                                      className="h-4 w-4"
                                    />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>Editar</TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div>
                                    <Checkbox
                                      checked={perm.canDelete}
                                      onCheckedChange={(checked) =>
                                        updatePermission(role.id, module.id, 'canDelete', checked === true)
                                      }
                                      className="h-4 w-4"
                                    />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>Eliminar</TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    onClick={() => toggleAllForModuleAndRole(role.id, module.id)}
                                    className={cn(
                                      'ml-1 p-0.5 rounded hover:bg-muted transition-colors',
                                      allActive && 'text-primary'
                                    )}
                                  >
                                    <CheckSquare className="h-3 w-3" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>Toggle todos</TooltipContent>
                              </Tooltip>
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </TooltipProvider>
        </div>
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg">
        <div className="flex items-center gap-2">
          <Eye className="h-3 w-3" />
          <span>V = Ver</span>
        </div>
        <div className="flex items-center gap-2">
          <Plus className="h-3 w-3" />
          <span>C = Crear</span>
        </div>
        <div className="flex items-center gap-2">
          <Edit className="h-3 w-3" />
          <span>E = Editar</span>
        </div>
        <div className="flex items-center gap-2">
          <Trash2 className="h-3 w-3" />
          <span>D = Eliminar</span>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <div className="w-3 h-3 rounded bg-yellow-100 dark:bg-yellow-900/30 border" />
          <span>= Cambio pendiente</span>
        </div>
      </div>
    </div>
  )
}
