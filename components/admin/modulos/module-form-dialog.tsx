'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import type { ModuleResponse } from '@/lib/admin/services/module.service'

interface ModuleFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  module?: ModuleResponse | null
  parentModules: { id: string; nombre: string; codigo: string }[]
  onSubmit: (data: {
    nombre: string
    codigo: string
    descripcion?: string
    icono?: string
    ruta?: string
    orden?: number
    parentId?: string | null
  }) => Promise<void>
}

const ICON_OPTIONS = [
  { value: '', label: 'Sin icono' },
  { value: 'users', label: 'Usuarios' },
  { value: 'shield', label: 'Escudo' },
  { value: 'folder', label: 'Carpeta' },
  { value: 'file-text', label: 'Documento' },
  { value: 'settings', label: 'Configuración' },
  { value: 'book', label: 'Libro' },
  { value: 'graduation-cap', label: 'Graduación' },
  { value: 'calendar', label: 'Calendario' },
  { value: 'chart', label: 'Gráfico' },
]

export function ModuleFormDialog({
  open,
  onOpenChange,
  module,
  parentModules,
  onSubmit,
}: ModuleFormDialogProps) {
  const isEditing = !!module
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string[]>>({})

  const [formData, setFormData] = useState({
    nombre: '',
    codigo: '',
    descripcion: '',
    icono: '',
    ruta: '',
    orden: 0,
    parentId: '',
  })

  useEffect(() => {
    if (module) {
      setFormData({
        nombre: module.nombre,
        codigo: module.codigo,
        descripcion: module.descripcion || '',
        icono: module.icono || '',
        ruta: module.ruta || '',
        orden: module.orden,
        parentId: module.parentId || '',
      })
    } else {
      setFormData({
        nombre: '',
        codigo: '',
        descripcion: '',
        icono: '',
        ruta: '',
        orden: 0,
        parentId: '',
      })
    }
    setErrors({})
  }, [module, open])

  // Auto-generar codigo desde nombre
  const handleNombreChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      nombre: value,
      codigo: !isEditing && (prev.codigo === '' || prev.codigo === generateCode(prev.nombre))
        ? generateCode(value)
        : prev.codigo,
    }))
  }

  const generateCode = (text: string) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, '')
      .trim()
      .replace(/\s+/g, '_')
      .substring(0, 50)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setErrors({})

    try {
      await onSubmit({
        nombre: formData.nombre,
        codigo: formData.codigo,
        descripcion: formData.descripcion || undefined,
        icono: formData.icono || undefined,
        ruta: formData.ruta || undefined,
        orden: formData.orden,
        parentId: formData.parentId || null,
      })
      onOpenChange(false)
    } catch (err: any) {
      if (err.details) {
        setErrors(err.details)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const getError = (field: string) => {
    return errors[field]?.[0]
  }

  // Filtrar módulos que no pueden ser padres (el módulo actual y sus hijos)
  const availableParents = parentModules.filter((m) => m.id !== module?.id)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Módulo' : 'Crear Módulo'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Modifica los datos del módulo'
              : 'Completa los datos para crear un nuevo módulo'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre */}
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input
              value={formData.nombre}
              onChange={(e) => handleNombreChange(e.target.value)}
              placeholder="Ej: Gestión de Tesis"
            />
            {getError('nombre') && (
              <p className="text-xs text-destructive">{getError('nombre')}</p>
            )}
          </div>

          {/* Código */}
          <div className="space-y-2">
            <Label>Código</Label>
            <Input
              value={formData.codigo}
              onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toLowerCase() })}
              placeholder="Ej: gestion_tesis"
              disabled={isEditing}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Solo minúsculas y guiones bajos. No se puede cambiar después.
            </p>
            {getError('codigo') && (
              <p className="text-xs text-destructive">{getError('codigo')}</p>
            )}
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <Label>Descripción (opcional)</Label>
            <Textarea
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              placeholder="Descripción del módulo..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Icono */}
            <div className="space-y-2">
              <Label>Icono (opcional)</Label>
              <Input
                value={formData.icono}
                onChange={(e) => setFormData({ ...formData, icono: e.target.value })}
                placeholder="Ej: users"
              />
            </div>

            {/* Orden */}
            <div className="space-y-2">
              <Label>Orden</Label>
              <Input
                type="number"
                min={0}
                value={formData.orden}
                onChange={(e) => setFormData({ ...formData, orden: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          {/* Ruta */}
          <div className="space-y-2">
            <Label>Ruta (opcional)</Label>
            <Input
              value={formData.ruta}
              onChange={(e) => setFormData({ ...formData, ruta: e.target.value })}
              placeholder="Ej: /admin/tesis"
            />
          </div>

          {/* Módulo padre */}
          <div className="space-y-2">
            <Label>Módulo Padre (opcional)</Label>
            <Select
              value={formData.parentId}
              onValueChange={(v) => setFormData({ ...formData, parentId: v === 'none' ? '' : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sin padre (módulo raíz)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin padre (módulo raíz)</SelectItem>
                {availableParents.map((parent) => (
                  <SelectItem key={parent.id} value={parent.id}>
                    {parent.nombre} ({parent.codigo})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? 'Guardar Cambios' : 'Crear Módulo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
