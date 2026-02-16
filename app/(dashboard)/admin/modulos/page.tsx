'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useModules } from '@/hooks/use-modules'
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
  Plus,
  AlertTriangle,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ModuleResponse } from '@/lib/admin/services/module.service'

const ITEMS_PER_PAGE_OPTIONS = [5, 10, 20]

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

  // Paginacion
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedModule, setSelectedModule] = useState<ModuleResponse | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Cargar modulos al montar
  useEffect(() => {
    fetchModules()
  }, [])

  // Reset pagina al cambiar datos o items por pagina
  useEffect(() => {
    setPage(1)
  }, [modules.length, itemsPerPage])

  const handleFilter = useCallback((newFilters: any) => {
    setFilters(newFilters)
    setPage(1)
    fetchModules(newFilters)
  }, [fetchModules])

  // Paginacion client-side
  const totalPages = Math.max(1, Math.ceil(modules.length / itemsPerPage))
  const modulesPage = useMemo(() => {
    const start = (page - 1) * itemsPerPage
    return modules.slice(start, start + itemsPerPage)
  }, [modules, page, itemsPerPage])

  const startItem = modules.length === 0 ? 0 : (page - 1) * itemsPerPage + 1
  const endItem = Math.min(page * itemsPerPage, modules.length)

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
      await createModule(data)
      toast.success('Modulo creado correctamente')
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
      toast.success('Modulo actualizado correctamente')
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
      toast.success('Modulo eliminado correctamente')
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
      toast.success(module.isActive ? 'Modulo desactivado' : 'Modulo activado')
      fetchModules(filters)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  // Modulos sin parentId para el selector de padre
  const parentModules = modules
    .filter((m) => !m.parentId)
    .map((m) => ({ id: m.id, nombre: m.nombre, codigo: m.codigo }))

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Modulos del Sistema</h1>
            <p className="text-muted-foreground">
              Gestiona los modulos y su estructura jerarquica
            </p>
          </div>

          <PermissionGuard moduleCode="modulos" action="create">
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Modulo
            </Button>
          </PermissionGuard>
        </div>

        {/* Tabla */}
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-lg flex items-center gap-2">
              Modulos ({modules.length})
              {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </CardTitle>
          </CardHeader>

          {/* Filtros integrados */}
          <div className="p-4 border-b">
            <ModuleFilters onFilter={handleFilter} />
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

                <ModuleTable
                  modules={modulesPage}
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
                      Mostrando {startItem} - {endItem} de {modules.length}
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

        {/* Dialog Crear Modulo */}
        <ModuleFormDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          parentModules={parentModules}
          onSubmit={handleCreate}
        />

        {/* Dialog Editar Modulo */}
        <ModuleFormDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          module={selectedModule}
          parentModules={parentModules}
          onSubmit={handleEdit}
        />

        {/* Dialog Confirmar Eliminacion */}
        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Eliminacion</DialogTitle>
              <DialogDescription>
                ¿Estas seguro de eliminar el modulo{' '}
                <strong>{selectedModule?.nombre}</strong>?
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
