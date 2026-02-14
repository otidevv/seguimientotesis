import { z } from 'zod'

// Schema para datos de estudiante (carreras)
const studentDataSchema = z.object({
  carreras: z.array(z.object({
    codigoEstudiante: z.string(),
    carreraNombre: z.string(),
    facultadNombre: z.string(),
    creditosAprobados: z.number(),
  })),
}).optional()

// Schema para datos de docente
const teacherDataSchema = z.object({
  codigoDocente: z.string(),
  departamentoAcademico: z.string(),
  facultadNombre: z.string(),
}).optional()

// Schema para crear usuario
export const createUserSchema = z.object({
  tipoDocumento: z.enum(['DNI', 'CARNET_EXTRANJERIA', 'PASAPORTE', 'OTRO'], {
    message: 'Tipo de documento inválido',
  }),
  numeroDocumento: z
    .string()
    .min(6, 'El número de documento debe tener al menos 6 caracteres')
    .max(20, 'El número de documento no puede exceder 20 caracteres')
    .regex(/^[a-zA-Z0-9]+$/, 'Solo letras y números'),
  email: z
    .string()
    .min(1, 'El email es requerido')
    .email('Email inválido'),
  emailPersonal: z
    .string()
    .email('Email personal inválido')
    .optional()
    .or(z.literal('')),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres'),
  nombres: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres'),
  apellidoPaterno: z
    .string()
    .min(2, 'El apellido paterno debe tener al menos 2 caracteres')
    .max(100, 'El apellido paterno no puede exceder 100 caracteres'),
  apellidoMaterno: z
    .string()
    .min(2, 'El apellido materno debe tener al menos 2 caracteres')
    .max(100, 'El apellido materno no puede exceder 100 caracteres'),
  telefono: z
    .string()
    .max(20, 'El teléfono no puede exceder 20 caracteres')
    .optional()
    .or(z.literal('')),
  // Support both single roleId and array of roleIds
  roleId: z.string().optional(),
  roleIds: z.array(z.string()).optional(),
  // Roles with context (for MESA_PARTES with facultad)
  rolesWithContext: z.array(z.object({
    roleId: z.string(),
    contextType: z.string().optional(),
    contextId: z.string().optional(),
  })).optional(),
  isActive: z.boolean().optional().default(true),
  isVerified: z.boolean().optional().default(true), // Admin creates verified by default
  // External data for creating student/teacher records
  studentData: studentDataSchema,
  teacherData: teacherDataSchema,
})

// Schema para actualizar usuario
export const updateUserSchema = z.object({
  email: z.string().email('Email inválido').optional(),
  emailPersonal: z.string().email('Email personal inválido').optional().or(z.literal('')),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').optional().or(z.literal('')),
  nombres: z.string().min(2).max(100).optional(),
  apellidoPaterno: z.string().min(2).max(100).optional(),
  apellidoMaterno: z.string().min(2).max(100).optional(),
  telefono: z.string().max(20).optional().or(z.literal('')),
  isActive: z.boolean().optional(),
  isVerified: z.boolean().optional(),
})

// Schema para asignar rol
export const assignRoleSchema = z.object({
  roleId: z.string().min(1, 'El rol es requerido'),
  contextType: z.string().optional(),
  contextId: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
})

// Schema para parámetros de búsqueda
export const userQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().optional(),
  isActive: z.string().optional(),
  roleId: z.string().optional(),
  sortBy: z.enum(['nombres', 'email', 'createdAt', 'lastLoginAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

// Tipos inferidos
export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
export type AssignRoleInput = z.infer<typeof assignRoleSchema>
export type UserQueryInput = z.infer<typeof userQuerySchema>
