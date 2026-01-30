import { TipoDocumento } from '@prisma/client'

// ============================================
// TIPOS DE AUTENTICACION
// ============================================

export interface LoginInput {
  email: string
  password: string
  rememberMe?: boolean
}

export interface RegisterInput {
  tipoDocumento: TipoDocumento
  numeroDocumento: string
  email: string
  password: string
  confirmPassword: string
  nombres: string
  apellidoPaterno: string
  apellidoMaterno: string
  roleCode: string
  emailPersonal?: string
}

export interface ValidateUserInput {
  tipoDocumento: TipoDocumento
  numeroDocumento: string
  roleCode: 'ESTUDIANTE' | 'DOCENTE'
}

export interface AuthResponse {
  user?: UserResponse
  accessToken?: string
  refreshToken?: string
  expiresIn?: number
  message?: string
  requiresVerification?: boolean
}

export interface UserResponse {
  id: string
  tipoDocumento: TipoDocumento
  numeroDocumento: string
  username: string | null
  email: string
  emailPersonal: string | null
  nombres: string
  apellidoPaterno: string
  apellidoMaterno: string
  avatarUrl: string | null
  telefono: string | null
  isActive: boolean
  isVerified: boolean
  roles: RoleResponse[]
  permissions: PermissionResponse[]
}

export interface RoleResponse {
  id: string
  nombre: string
  codigo: string
  color: string | null
}

export interface PermissionResponse {
  moduleCode: string
  moduleName: string
  canView: boolean
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
}

// ============================================
// TIPOS DE JWT
// ============================================

export interface JwtPayload {
  userId: string
  email: string
  roles: string[]
  iat: number
  exp: number
}

export interface RefreshTokenPayload {
  userId: string
  tokenId: string
  iat: number
  exp: number
}

// ============================================
// TIPOS DE APIS EXTERNAS
// ============================================

export interface ExternalStudentCareer {
  codigoEstudiante: string
  carreraNombre: string
  facultadNombre: string
  creditosAprobados: number
}

export interface ExternalStudentData {
  dni: string
  nombres: string
  apellidoPaterno: string
  apellidoMaterno: string
  email: string
  emailPersonal: string | null
  carreras: ExternalStudentCareer[]
}

export interface ExternalTeacherData {
  dni: string
  codigoDocente: string
  nombres: string
  apellidoPaterno: string
  apellidoMaterno: string
  email: string
  emailPersonal: string | null
  departamentoAcademico: string
  facultadNombre: string
}

// ============================================
// TIPOS DE REQUEST
// ============================================

export interface RequestInfo {
  ip: string
  userAgent: string
  path?: string
  method?: string
}

// ============================================
// ERRORES PERSONALIZADOS
// ============================================

export type AuthErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'USER_EXISTS'
  | 'USER_NOT_FOUND'
  | 'EMAIL_NOT_VERIFIED'
  | 'ACCOUNT_LOCKED'
  | 'ACCOUNT_DISABLED'
  | 'TOKEN_EXPIRED'
  | 'TOKEN_INVALID'
  | 'INVALID_TOKEN'
  | 'RATE_LIMIT_EXCEEDED'
  | 'EXTERNAL_API_ERROR'
  | 'VALIDATION_ERROR'
  | 'VERIFICATION_ERROR'
  | 'ALREADY_VERIFIED'

export class AuthError extends Error {
  code: AuthErrorCode
  statusCode: number

  constructor(code: AuthErrorCode, message: string, statusCode: number = 400) {
    super(message)
    this.name = 'AuthError'
    this.code = code
    this.statusCode = statusCode
  }
}
