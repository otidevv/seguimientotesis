'use client'

import { useState, useEffect, useCallback } from 'react'
import { useModules } from '@/hooks/use-modules'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PermissionGuard } from '@/components/auth/permission-guard'
import { ModuleTable } from '@/components/admin/modulos/module-table'
import { ModuleFilters } from '@/components/admin/modulos/module-filters'
import { ModuleFormDialog } from '@/components/admin/modulos/module-form-dialog'
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
  FolderTree,
  Plus,
  AlertTriangle,
  Loader2,
} from 'lucide-react'
import type { ModuleResponse } from '@/lib/admin/services/module.service'

export default function ModulosPage() {
  const {
    modules,
    isLoading,
    error,
    fetchModules,
    createModule,
    updateModule,
    deleteModule,
    toggleActive,
  } = useModules()

  const [filters, setFilters] = useState({})

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedModule, setSelectedModule] = useState<ModuleResponse | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Cargar módulos al montar
  useEffect(() => {
    fetchModules()
  }, [])

  const handleFilter = useCallback((newFilters: any) => {
    setFilters(newFilters)
    fetchModules(newFilters)
  }, [fetchModules])

  const handleCreate = async (data: any) => {
    try {
      await createModule(data)
      toast.success('Módulo creado correctamente')
      fetchModules(filters)
    } catch (err: any) {
      toast.error(err.message)
      throw err
    }
  }

  const handleEdit = async (data: any) => {
    if (!selectedModule) return
    try {
      await updateModule(selectedModule.id, data)
      toast.success('Módulo actualizado correctamente')
      fetchModules(filters)
    } catch (err: any) {
      toast.error(err.message)
      throw err
    }
  }

  const handleDelete = async () => {
    if (!selectedModule) return
    setIsDeleting(true)
    try {
      await deleteModule(selectedModule.id)
      toast.success('Módulo eliminado correctamente')
      setDeleteConfirmOpen(false)
      setSelectedModule(null)
      fetchModules(filters)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleToggleActive = async (module: ModuleResponse) => {
    try {
      await toggleActive(module.id)
      toast.success(module.isActive ? 'Módulo desactivado' : 'Módulo activado')
      fetchModules(filters)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  // Obtener módulos sin parentId para el selector de padre
  const parentModules = modules
    .filter((m) => !m.parentId)
    .map((m) => ({ id: m.id, nombre: m.nombre, codigo: m.codigo }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FolderTree className="h-6 w-6" />
            Módulos del Sistema
          </h1>
          <p className="text-muted-foreground">
            Gestiona los módulos y su estructura jerárquica
          </p>
        </div>

        <PermissionGuard moduleCode="modulos" action="create">
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Módulo
          </Button>
        </PermissionGuard>
      </div>

      {/* Filtros */}
      <ModuleFilters onFilter={handleFilter} />

      {/* Tabla */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              Módulos ({modules.length})
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
            <ModuleTable
              modules={modules}
              onEdit={(module) => {
                setSelectedModule(module)
                setEditDialogOpen(true)
              }}
              onDelete={(module) => {
                setSelectedModule(module)
                setDeleteConfirmOpen(true)
              }}
              onToggleActive={handleToggleActive}
            />
          )}
        </CardContent>
      </Card>

      {/* Dialog Crear Módulo */}
      <ModuleFormDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        parentModules={parentModules}
        onSubmit={handleCreate}
      />

      {/* Dialog Editar Módulo */}
      <ModuleFormDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        module={selectedModule}
        parentModules={parentModules}
        onSubmit={handleEdit}
      />

      {/* Dialog Confirmar Eliminación */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Eliminación</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de eliminar el módulo{' '}
              <strong>{selectedModule?.nombre}</strong>?
              Esta acción no se puede deshacer.
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
