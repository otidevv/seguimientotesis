import { z } from 'zod'

// ============================================
// SCHEMAS DE AUTENTICACION
// ============================================

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'El email es requerido')
    .email('Email inválido'),
  password: z
    .string()
    .min(1, 'La contraseña es requerida'),
  rememberMe: z.boolean().optional().default(false),
})

export const registerSchema = z.object({
  tipoDocumento: z.enum(['DNI', 'CARNET_EXTRANJERIA', 'PASAPORTE', 'OTRO'], {
    message: 'Tipo de documento inválido',
  }),
  numeroDocumento: z
    .string()
    .min(6, 'El número de documento debe tener al menos 6 caracteres')
    .max(20, 'El número de documento no puede exceder 20 caracteres')
    .regex(/^[a-zA-Z0-9]+$/, 'El número de documento solo puede contener letras y números'),
  email: z
    .string()
    .min(1, 'El email es requerido')
    .email('Email inválido'),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres'),
  confirmPassword: z.string().min(1, 'Confirma tu contraseña'),
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
  roleCode: z.enum(['ESTUDIANTE', 'DOCENTE', 'EXTERNO'], {
    message: 'Rol inválido',
  }),
  emailPersonal: z
    .string()
    .email('Email personal inválido')
    .optional()
    .or(z.literal('')),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
})

export const validateUserSchema = z.object({
  tipoDocumento: z.enum(['DNI', 'CARNET_EXTRANJERIA', 'PASAPORTE', 'OTRO']),
  numeroDocumento: z
    .string()
    .min(6, 'El número de documento debe tener al menos 6 caracteres')
    .max(20, 'El número de documento no puede exceder 20 caracteres'),
  roleCode: z.enum(['ESTUDIANTE', 'DOCENTE']),
})

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token es requerido'),
})

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'El email es requerido')
    .email('Email inválido'),
})

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token es requerido'),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres'),
  confirmPassword: z.string().min(1, 'Confirma tu contraseña'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'La contraseña actual es requerida'),
  newPassword: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres'),
  confirmPassword: z.string().min(1, 'Confirma tu contraseña'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
}).refine((data) => data.currentPassword !== data.newPassword, {
  message: 'La nueva contraseña debe ser diferente a la actual',
  path: ['newPassword'],
})

// Tipos inferidos de los schemas
export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type ValidateUserInput = z.infer<typeof validateUserSchema>
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
