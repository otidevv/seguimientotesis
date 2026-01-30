import { z } from 'zod'

// Schema para crear rol
export const createRoleSchema = z.object({
  nombre: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(50, 'El nombre no puede exceder 50 caracteres'),
  codigo: z
    .string()
    .min(2, 'El código debe tener al menos 2 caracteres')
    .max(30, 'El código no puede exceder 30 caracteres')
    .regex(/^[A-Z_]+$/, 'El código debe ser en mayúsculas y solo guiones bajos'),
  descripcion: z
    .string()
    .max(255, 'La descripción no puede exceder 255 caracteres')
    .optional()
    .or(z.literal('')),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Color inválido (debe ser formato hex: #RRGGBB)')
    .optional()
    .or(z.literal('')),
})

// Schema para actualizar rol
export const updateRoleSchema = z.object({
  nombre: z.string().min(2).max(50).optional(),
  descripcion: z.string().max(255).optional().or(z.literal('')),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Color inválido')
    .optional()
    .or(z.literal('')),
})

// Schema para permiso individual
export const permissionSchema = z.object({
  moduleId: z.string().min(1, 'El módulo es requerido'),
  canView: z.boolean().default(false),
  canCreate: z.boolean().default(false),
  canEdit: z.boolean().default(false),
  canDelete: z.boolean().default(false),
})

// Schema para actualizar permisos de un rol
export const updatePermissionsSchema = z.object({
  permissions: z.array(permissionSchema),
})

// Schema para query de roles
export const roleQuerySchema = z.object({
  search: z.string().optional(),
  isActive: z.string().optional(),
  isSystem: z.string().optional(),
})

// Tipos inferidos
export type CreateRoleInput = z.infer<typeof createRoleSchema>
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>
export type PermissionInput = z.infer<typeof permissionSchema>
export type UpdatePermissionsInput = z.infer<typeof updatePermissionsSchema>
export type RoleQueryInput = z.infer<typeof roleQuerySchema>
