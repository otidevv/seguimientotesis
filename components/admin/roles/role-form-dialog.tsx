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
import { Loader2 } from 'lucide-react'
import type { RoleResponse } from '@/lib/admin/services/role.service'

interface RoleFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  role?: RoleResponse | null
  onSubmit: (data: {
    nombre: string
    codigo: string
    descripcion?: string
    color?: string
  }) => Promise<void>
}

const PRESET_COLORS = [
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#14b8a6', // Teal
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
]

export function RoleFormDialog({
  open,
  onOpenChange,
  role,
  onSubmit,
}: RoleFormDialogProps) {
  const isEditing = !!role
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string[]>>({})

  const [formData, setFormData] = useState({
    nombre: '',
    codigo: '',
    descripcion: '',
    color: '#6366f1',
  })

  useEffect(() => {
    if (role) {
      setFormData({
        nombre: role.nombre,
        codigo: role.codigo,
        descripcion: role.descripcion || '',
        color: role.color || '#6366f1',
      })
    } else {
      setFormData({
        nombre: '',
        codigo: '',
        descripcion: '',
        color: '#6366f1',
      })
    }
    setErrors({})
  }, [role, open])

  // Auto-generar codigo desde nombre
  const handleNombreChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      nombre: value,
      // Solo auto-generar si no estamos editando y el codigo esta vacio o fue auto-generado
      codigo: !isEditing && (prev.codigo === '' || prev.codigo === generateCode(prev.nombre))
        ? generateCode(value)
        : prev.codigo,
    }))
  }

  const generateCode = (text: string) => {
    return text
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remover acentos
      .replace(/[^A-Z0-9\s]/g, '')
      .trim()
      .replace(/\s+/g, '_')
      .substring(0, 30)
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
        color: formData.color || undefined,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Rol' : 'Crear Rol'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Modifica los datos del rol'
              : 'Completa los datos para crear un nuevo rol'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre */}
          <div className="space-y-2">
            <Label>Nombre del Rol</Label>
            <Input
              value={formData.nombre}
              onChange={(e) => handleNombreChange(e.target.value)}
              placeholder="Ej: Coordinador de Tesis"
            />
            {getError('nombre') && (
              <p className="text-xs text-destructive">{getError('nombre')}</p>
            )}
          </div>

          {/* Codigo */}
          <div className="space-y-2">
            <Label>Codigo</Label>
            <Input
              value={formData.codigo}
              onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
              placeholder="Ej: COORDINADOR_TESIS"
              disabled={isEditing}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Solo mayusculas y guiones bajos
            </p>
            {getError('codigo') && (
              <p className="text-xs text-destructive">{getError('codigo')}</p>
            )}
          </div>

          {/* Descripcion */}
          <div className="space-y-2">
            <Label>Descripcion (opcional)</Label>
            <Textarea
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              placeholder="Descripcion del rol..."
              rows={2}
            />
            {getError('descripcion') && (
              <p className="text-xs text-destructive">{getError('descripcion')}</p>
            )}
          </div>

          {/* Color */}
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex items-center gap-2">
              <div className="flex gap-1 flex-wrap">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, color })}
                    className={`h-6 w-6 rounded-full border-2 transition-all ${
                      formData.color === color
                        ? 'border-foreground scale-110'
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <Input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-10 h-8 p-0 border-0"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? 'Guardar Cambios' : 'Crear Rol'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
