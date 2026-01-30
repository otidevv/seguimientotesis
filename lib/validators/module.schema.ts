import { z } from 'zod'

export const createModuleSchema = z.object({
  nombre: z.string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres'),
  codigo: z.string()
    .min(2, 'El código debe tener al menos 2 caracteres')
    .max(50, 'El código no puede exceder 50 caracteres')
    .regex(/^[a-z_]+$/, 'El código solo puede contener letras minúsculas y guiones bajos'),
  descripcion: z.string()
    .max(500, 'La descripción no puede exceder 500 caracteres')
    .optional()
    .or(z.literal('')),
  icono: z.string()
    .max(50, 'El icono no puede exceder 50 caracteres')
    .optional()
    .or(z.literal('')),
  ruta: z.string()
    .max(200, 'La ruta no puede exceder 200 caracteres')
    .optional()
    .or(z.literal('')),
  orden: z.number()
    .int()
    .min(0)
    .optional()
    .default(0),
  parentId: z.string()
    .optional()
    .nullable(),
})

export const updateModuleSchema = z.object({
  nombre: z.string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .optional(),
  descripcion: z.string()
    .max(500, 'La descripción no puede exceder 500 caracteres')
    .optional()
    .or(z.literal('')),
  icono: z.string()
    .max(50, 'El icono no puede exceder 50 caracteres')
    .optional()
    .or(z.literal('')),
  ruta: z.string()
    .max(200, 'La ruta no puede exceder 200 caracteres')
    .optional()
    .or(z.literal('')),
  orden: z.number()
    .int()
    .min(0)
    .optional(),
  parentId: z.string()
    .optional()
    .nullable(),
})

export const moduleQuerySchema = z.object({
  search: z.string().optional(),
  isActive: z.enum(['true', 'false']).optional(),
  parentId: z.string().optional().nullable(),
})

export type CreateModuleInput = z.infer<typeof createModuleSchema>
export type UpdateModuleInput = z.infer<typeof updateModuleSchema>
export type ModuleQueryInput = z.infer<typeof moduleQuerySchema>
