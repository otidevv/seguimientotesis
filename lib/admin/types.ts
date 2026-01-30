import type { TipoDocumento } from '@prisma/client'

export interface AdminUserResponse {
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
  failedLoginAttempts: number
  lockedUntil: Date | null
  lastLoginAt: Date | null
  createdAt: Date
  updatedAt: Date
  roles: AdminRoleResponse[]
}

export interface AdminRoleResponse {
  id: string
  roleId: string
  roleName: string
  roleCode: string
  roleColor: string | null
  contextType: string | null
  contextId: string | null
  assignedAt: Date
  expiresAt: Date | null
  isActive: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasMore: boolean
  }
}

export type AdminErrorCode =
  | 'USER_NOT_FOUND'
  | 'USER_EXISTS'
  | 'ROLE_NOT_FOUND'
  | 'ROLE_EXISTS'
  | 'ROLE_ALREADY_ASSIGNED'
  | 'ROLE_HAS_USERS'
  | 'MODULE_NOT_FOUND'
  | 'MODULE_EXISTS'
  | 'MODULE_HAS_CHILDREN'
  | 'MODULE_HAS_PERMISSIONS'
  | 'CANNOT_DELETE_SELF'
  | 'CANNOT_DEACTIVATE_SELF'
  | 'CANNOT_MODIFY_SYSTEM_ROLE'
  | 'CANNOT_DELETE_SYSTEM_ROLE'
  | 'INVALID_INPUT'

export class AdminError extends Error {
  code: AdminErrorCode
  statusCode: number

  constructor(code: AdminErrorCode, message: string, statusCode: number = 400) {
    super(message)
    this.name = 'AdminError'
    this.code = code
    this.statusCode = statusCode
  }
}
