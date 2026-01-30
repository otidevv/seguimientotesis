'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, Eye, Plus, Edit, Trash2, Shield, CheckSquare } from 'lucide-react'
import type { RoleResponse, ModulePermission } from '@/lib/admin/services/role.service'

interface PermissionsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  role: RoleResponse | null
  permissions: ModulePermission[]
  isLoading: boolean
  onSave: (permissions: Array<{
    moduleId: string
    canView: boolean
    canCreate: boolean
    canEdit: boolean
    canDelete: boolean
  }>) => Promise<void>
}

export function PermissionsDialog({
  open,
  onOpenChange,
  role,
  permissions: initialPermissions,
  isLoading,
  onSave,
}: PermissionsDialogProps) {
  const [permissions, setPermissions] = useState<ModulePermission[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    setPermissions(initialPermissions)
    setHasChanges(false)
  }, [initialPermissions])

  const handlePermissionChange = (
    moduleId: string,
    field: 'canView' | 'canCreate' | 'canEdit' | 'canDelete',
    value: boolean
  ) => {
    setPermissions((prev) =>
      prev.map((p) => {
        if (p.id !== moduleId) return p

        if (value && field !== 'canView') {
          return { ...p, [field]: value, canView: true }
        }

        if (!value && field === 'canView') {
          return {
            ...p,
            canView: false,
            canCreate: false,
            canEdit: false,
            canDelete: false,
          }
        }

        return { ...p, [field]: value }
      })
    )
    setHasChanges(true)
  }

  const handleSelectAll = (field: 'canView' | 'canCreate' | 'canEdit' | 'canDelete') => {
    const allChecked = permissions.every((p) => p[field])
    setPermissions((prev) =>
      prev.map((p) => {
        if (!allChecked && field !== 'canView') {
          return { ...p, [field]: true, canView: true }
        }
        if (allChecked && field === 'canView') {
          return {
            ...p,
            canView: false,
            canCreate: false,
            canEdit: false,
            canDelete: false,
          }
        }
        return { ...p, [field]: !allChecked }
      })
    )
    setHasChanges(true)
  }

  const handleSelectAllForModule = (moduleId: string) => {
    setPermissions((prev) =>
      prev.map((p) => {
        if (p.id !== moduleId) return p
        const allChecked = p.canView && p.canCreate && p.canEdit && p.canDelete
        return {
          ...p,
          canView: !allChecked,
          canCreate: !allChecked,
          canEdit: !allChecked,
          canDelete: !allChecked,
        }
      })
    )
    setHasChanges(true)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave(
        permissions.map((p) => ({
          moduleId: p.id,
          canView: p.canView,
          canCreate: p.canCreate,
          canEdit: p.canEdit,
          canDelete: p.canDelete,
        }))
      )
      setHasChanges(false)
      onOpenChange(false)
    } finally {
      setIsSaving(false)
    }
  }

  // Agrupar modulos por padre
  const groupedModules = permissions.reduce((acc, module) => {
    const parentId = module.parentId || 'root'
    if (!acc[parentId]) {
      acc[parentId] = []
    }
    acc[parentId].push(module)
    return acc
  }, {} as Record<string, ModulePermission[]>)

  const rootModules = groupedModules['root'] || []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Shield className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
            <span className="truncate">Permisos - {role?.nombre}</span>
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Configura los permisos de acceso a los modulos del sistema
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full min-w-[480px]">
              <thead className="sticky top-0 bg-background z-10">
                <tr className="border-b">
                  <th className="text-left py-2 sm:py-3 px-2 font-medium text-xs sm:text-sm">
                    Modulo
                  </th>
                  <th className="text-center py-2 sm:py-3 px-1 w-10 sm:w-16">
                    <button
                      type="button"
                      onClick={() => handleSelectAll('canView')}
                      className="flex flex-col items-center gap-0.5 mx-auto text-[10px] sm:text-xs font-medium hover:text-primary"
                      title="Ver"
                    >
                      <Eye className="h-4 w-4" />
                      <span className="hidden sm:inline">Ver</span>
                    </button>
                  </th>
                  <th className="text-center py-2 sm:py-3 px-1 w-10 sm:w-16">
                    <button
                      type="button"
                      onClick={() => handleSelectAll('canCreate')}
                      className="flex flex-col items-center gap-0.5 mx-auto text-[10px] sm:text-xs font-medium hover:text-primary"
                      title="Crear"
                    >
                      <Plus className="h-4 w-4" />
                      <span className="hidden sm:inline">Crear</span>
                    </button>
                  </th>
                  <th className="text-center py-2 sm:py-3 px-1 w-10 sm:w-16">
                    <button
                      type="button"
                      onClick={() => handleSelectAll('canEdit')}
                      className="flex flex-col items-center gap-0.5 mx-auto text-[10px] sm:text-xs font-medium hover:text-primary"
                      title="Editar"
                    >
                      <Edit className="h-4 w-4" />
                      <span className="hidden sm:inline">Editar</span>
                    </button>
                  </th>
                  <th className="text-center py-2 sm:py-3 px-1 w-10 sm:w-16">
                    <button
                      type="button"
                      onClick={() => handleSelectAll('canDelete')}
                      className="flex flex-col items-center gap-0.5 mx-auto text-[10px] sm:text-xs font-medium hover:text-primary"
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="hidden sm:inline">Eliminar</span>
                    </button>
                  </th>
                  <th className="text-center py-2 sm:py-3 px-1 w-10 sm:w-14">
                    <span className="flex flex-col items-center gap-0.5 mx-auto text-[10px] sm:text-xs font-medium" title="Todos">
                      <CheckSquare className="h-4 w-4" />
                      <span className="hidden sm:inline">Todos</span>
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rootModules.map((module) => {
                  const children = groupedModules[module.id] || []
                  const allChecked =
                    module.canView && module.canCreate && module.canEdit && module.canDelete

                  return (
                    <React.Fragment key={module.id}>
                      <tr className="border-b hover:bg-muted/50">
                        <td className="py-2 sm:py-3 px-2">
                          <div className="min-w-0">
                            <p className="font-medium text-xs sm:text-sm truncate">
                              {module.nombre}
                            </p>
                            <p className="text-[10px] sm:text-xs text-muted-foreground">
                              {module.codigo}
                            </p>
                          </div>
                        </td>
                        <td className="text-center py-2 sm:py-3 px-1">
                          <Checkbox
                            checked={module.canView}
                            onCheckedChange={(checked) =>
                              handlePermissionChange(module.id, 'canView', checked === true)
                            }
                          />
                        </td>
                        <td className="text-center py-2 sm:py-3 px-1">
                          <Checkbox
                            checked={module.canCreate}
                            onCheckedChange={(checked) =>
                              handlePermissionChange(module.id, 'canCreate', checked === true)
                            }
                          />
                        </td>
                        <td className="text-center py-2 sm:py-3 px-1">
                          <Checkbox
                            checked={module.canEdit}
                            onCheckedChange={(checked) =>
                              handlePermissionChange(module.id, 'canEdit', checked === true)
                            }
                          />
                        </td>
                        <td className="text-center py-2 sm:py-3 px-1">
                          <Checkbox
                            checked={module.canDelete}
                            onCheckedChange={(checked) =>
                              handlePermissionChange(module.id, 'canDelete', checked === true)
                            }
                          />
                        </td>
                        <td className="text-center py-2 sm:py-3 px-1">
                          <Checkbox
                            checked={allChecked}
                            onCheckedChange={() => handleSelectAllForModule(module.id)}
                          />
                        </td>
                      </tr>
                      {children.map((child) => {
                        const childAllChecked =
                          child.canView && child.canCreate && child.canEdit && child.canDelete

                        return (
                          <tr key={child.id} className="border-b hover:bg-muted/50 bg-muted/20">
                            <td className="py-2 sm:py-3 px-2 pl-4 sm:pl-6">
                              <div className="flex items-start gap-1 min-w-0">
                                <span className="text-muted-foreground text-xs mt-0.5">└</span>
                                <div className="min-w-0">
                                  <p className="text-xs sm:text-sm truncate">
                                    {child.nombre}
                                  </p>
                                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                                    {child.codigo}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="text-center py-2 sm:py-3 px-1">
                              <Checkbox
                                checked={child.canView}
                                onCheckedChange={(checked) =>
                                  handlePermissionChange(child.id, 'canView', checked === true)
                                }
                              />
                            </td>
                            <td className="text-center py-2 sm:py-3 px-1">
                              <Checkbox
                                checked={child.canCreate}
                                onCheckedChange={(checked) =>
                                  handlePermissionChange(child.id, 'canCreate', checked === true)
                                }
                              />
                            </td>
                            <td className="text-center py-2 sm:py-3 px-1">
                              <Checkbox
                                checked={child.canEdit}
                                onCheckedChange={(checked) =>
                                  handlePermissionChange(child.id, 'canEdit', checked === true)
                                }
                              />
                            </td>
                            <td className="text-center py-2 sm:py-3 px-1">
                              <Checkbox
                                checked={child.canDelete}
                                onCheckedChange={(checked) =>
                                  handlePermissionChange(child.id, 'canDelete', checked === true)
                                }
                              />
                            </td>
                            <td className="text-center py-2 sm:py-3 px-1">
                              <Checkbox
                                checked={childAllChecked}
                                onCheckedChange={() => handleSelectAllForModule(child.id)}
                              />
                            </td>
                          </tr>
                        )
                      })}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <DialogFooter className="flex-row gap-2 pt-4 border-t mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 sm:flex-none"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className="flex-1 sm:flex-none"
          >
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
