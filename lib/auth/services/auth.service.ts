import { prisma } from '@/lib/prisma'
import { hashPassword, verifyPassword } from './password.service'
import { generateTokens, revokeRefreshToken, verifyRefreshToken, revokeAllUserTokens } from './token.service'
import { validateStudentExternal, validateTeacherExternal } from './external-api.service'
import { sendVerificationEmail } from './email-verification.service'
import { MAX_LOGIN_ATTEMPTS, LOCK_TIME_MINUTES } from '../constants'
import { AuthError } from '../types'
import type {
  LoginInput,
  RegisterInput,
  AuthResponse,
  UserResponse,
  PermissionResponse,
  RequestInfo,
  ExternalStudentData,
  ExternalTeacherData,
} from '../types'
import { TipoDocumento } from '@prisma/client'

/**
 * Mapeo de nombres de facultades antiguas a las actuales
 * Útil cuando la API externa devuelve nombres desactualizados
 */
const FACULTAD_ALIAS: Record<string, string> = {
  'Facultad de Ecoturismo': 'Facultad de Ciencias Empresariales',
  'Ecoturismo': 'Facultad de Ciencias Empresariales',
  // Agregar más alias aquí si es necesario
}

/**
 * Normaliza el nombre de la facultad usando el mapeo de alias
 */
function normalizarNombreFacultad(nombre: string): string {
  // Buscar coincidencia exacta primero
  if (FACULTAD_ALIAS[nombre]) {
    return FACULTAD_ALIAS[nombre]
  }

  // Buscar coincidencia parcial (por si viene con variaciones)
  for (const [alias, nombreReal] of Object.entries(FACULTAD_ALIAS)) {
    if (nombre.toLowerCase().includes(alias.toLowerCase())) {
      return nombreReal
    }
  }

  return nombre
}

/**
 * Servicio principal de autenticación
 */
export class AuthService {
  /**
   * Iniciar sesión
   */
  async login(input: LoginInput, requestInfo: RequestInfo): Promise<AuthResponse> {
    // Buscar usuario por email
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
      include: {
        roles: {
          where: { isActive: true },
          include: {
            role: {
              include: {
                permissions: {
                  include: { module: true },
                },
              },
            },
          },
        },
      },
    })

    if (!user || user.deletedAt) {
      await this.logAudit(null, 'LOGIN_FAILED', 'User', null, requestInfo, 'FAILURE', 'Usuario no encontrado')
      throw new AuthError('INVALID_CREDENTIALS', 'Credenciales inválidas', 401)
    }

    if (!user.isActive) {
      await this.logAudit(user.id, 'LOGIN_FAILED', 'User', user.id, requestInfo, 'FAILURE', 'Cuenta desactivada')
      throw new AuthError('ACCOUNT_DISABLED', 'Tu cuenta ha sido desactivada', 403)
    }

    // Verificar si está bloqueado
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000)
      throw new AuthError('ACCOUNT_LOCKED', `Cuenta bloqueada. Intenta de nuevo en ${minutesLeft} minutos`, 423)
    }

    // Verificar contraseña
    const isValidPassword = await verifyPassword(input.password, user.passwordHash)

    if (!isValidPassword) {
      await this.handleFailedLogin(user.id)
      await this.logAudit(user.id, 'LOGIN_FAILED', 'User', user.id, requestInfo, 'FAILURE', 'Contraseña incorrecta')
      throw new AuthError('INVALID_CREDENTIALS', 'Credenciales inválidas', 401)
    }

    // Verificar email verificado (solo en producción)
    if (!user.isVerified && process.env.NODE_ENV === 'production') {
      throw new AuthError('EMAIL_NOT_VERIFIED', 'Debes verificar tu email antes de iniciar sesión', 403)
    }

    // Obtener roles del usuario
    const roles = user.roles.map((ur) => ur.role.codigo)

    // Generar tokens
    const tokens = await generateTokens(
      { id: user.id, email: user.email },
      roles,
      input.rememberMe,
      { ipAddress: requestInfo.ip, userAgent: requestInfo.userAgent }
    )

    // Actualizar último login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: requestInfo.ip,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    })

    // Log de auditoría
    await this.logAudit(user.id, 'LOGIN', 'User', user.id, requestInfo, 'SUCCESS')

    // Preparar respuesta
    const userResponse = this.formatUserResponse(user)
    const permissions = this.extractPermissions(user.roles)

    return {
      user: { ...userResponse, permissions },
      ...tokens,
    }
  }

  /**
   * Registrar nuevo usuario
   */
  async register(input: RegisterInput, requestInfo: RequestInfo): Promise<AuthResponse> {
    // Verificar si ya existe
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { email: input.email.toLowerCase() },
          { numeroDocumento: input.numeroDocumento },
        ],
      },
    })

    if (existing) {
      if (existing.email === input.email.toLowerCase()) {
        throw new AuthError('USER_EXISTS', 'Ya existe un usuario con este email', 409)
      }
      throw new AuthError('USER_EXISTS', 'Ya existe un usuario con este número de documento', 409)
    }

    // Validar contra API externa si es estudiante o docente
    let externalData: ExternalStudentData | ExternalTeacherData | null = null

    if (input.roleCode === 'ESTUDIANTE') {
      externalData = await validateStudentExternal(input.numeroDocumento)
      if (!externalData) {
        throw new AuthError('VALIDATION_ERROR', 'No se encontró el estudiante en el sistema universitario', 404)
      }
    } else if (input.roleCode === 'DOCENTE') {
      externalData = await validateTeacherExternal(input.numeroDocumento)
      if (!externalData) {
        throw new AuthError('VALIDATION_ERROR', 'No se encontró el docente en el sistema universitario', 404)
      }
    }

    // Hash de contraseña
    const passwordHash = await hashPassword(input.password)

    // Crear usuario
    const user = await prisma.user.create({
      data: {
        tipoDocumento: input.tipoDocumento as TipoDocumento,
        numeroDocumento: input.numeroDocumento,
        email: input.email.toLowerCase(),
        emailPersonal: input.emailPersonal || null,
        passwordHash,
        nombres: externalData?.nombres || input.nombres,
        apellidoPaterno: externalData?.apellidoPaterno || input.apellidoPaterno,
        apellidoMaterno: externalData?.apellidoMaterno || input.apellidoMaterno,
        externalDataCache: externalData as object || null,
        externalDataSyncAt: externalData ? new Date() : null,
        // Para desarrollo, verificar automáticamente
        isVerified: process.env.NODE_ENV === 'development',
        emailVerifiedAt: process.env.NODE_ENV === 'development' ? new Date() : null,
      },
    })

    // Asignar rol por defecto según código de rol
    const defaultRole = await this.getDefaultRoleByCode(input.roleCode)
    if (defaultRole) {
      await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: defaultRole.id,
        },
      })
    }

    // Si es estudiante, crear registros de carreras
    if (externalData && 'carreras' in externalData && input.roleCode === 'ESTUDIANTE') {
      await this.createStudentCareers(user.id, externalData.carreras)
    }

    // Si es docente, crear info adicional
    if (externalData && 'codigoDocente' in externalData && input.roleCode === 'DOCENTE') {
      await this.createTeacherInfo(user.id, externalData as ExternalTeacherData)
    }

    // Log de auditoría
    await this.logAudit(user.id, 'REGISTER', 'User', user.id, requestInfo, 'SUCCESS')

    // Enviar email de verificación en producción
    if (process.env.NODE_ENV !== 'development') {
      const userName = `${user.nombres} ${user.apellidoPaterno}`
      const emailSent = await sendVerificationEmail(user.id, user.email, userName)

      if (!emailSent) {
        console.error('[Register] Failed to send verification email to:', user.email)
      }
    }

    return {
      message: process.env.NODE_ENV === 'development'
        ? 'Usuario registrado exitosamente. (Verificación automática en desarrollo)'
        : 'Usuario registrado. Por favor, verifica tu email para activar tu cuenta.',
      requiresVerification: process.env.NODE_ENV !== 'development',
    }
  }

  /**
   * Cerrar sesión
   */
  async logout(refreshToken: string, requestInfo: RequestInfo, userId?: string): Promise<void> {
    await revokeRefreshToken(refreshToken, 'User logout')

    if (userId) {
      await this.logAudit(userId, 'LOGOUT', 'User', userId, requestInfo, 'SUCCESS')
    }
  }

  /**
   * Refrescar token
   */
  async refresh(refreshToken: string): Promise<AuthResponse> {
    const payload = await verifyRefreshToken(refreshToken)

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        roles: {
          where: { isActive: true },
          include: {
            role: {
              include: {
                permissions: {
                  include: { module: true },
                },
              },
            },
          },
        },
      },
    })

    if (!user || !user.isActive) {
      throw new AuthError('USER_NOT_FOUND', 'Usuario no encontrado', 404)
    }

    const roles = user.roles.map((ur) => ur.role.codigo)

    const tokens = await generateTokens(
      { id: user.id, email: user.email },
      roles
    )

    const userResponse = this.formatUserResponse(user)
    const permissions = this.extractPermissions(user.roles)

    return {
      user: { ...userResponse, permissions },
      ...tokens,
    }
  }

  /**
   * Obtener usuario actual
   */
  async me(userId: string): Promise<UserResponse & { permissions: PermissionResponse[] }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          where: { isActive: true },
          include: {
            role: {
              include: {
                permissions: {
                  include: { module: true },
                },
              },
            },
          },
        },
      },
    })

    if (!user) {
      throw new AuthError('USER_NOT_FOUND', 'Usuario no encontrado', 404)
    }

    const userResponse = this.formatUserResponse(user)
    const permissions = this.extractPermissions(user.roles)

    return { ...userResponse, permissions }
  }

  /**
   * Cerrar todas las sesiones del usuario
   */
  async logoutAll(userId: string, requestInfo: RequestInfo): Promise<void> {
    await revokeAllUserTokens(userId, 'Logout from all devices')
    await this.logAudit(userId, 'LOGOUT_ALL', 'User', userId, requestInfo, 'SUCCESS')
  }

  // ============================================
  // METODOS PRIVADOS
  // ============================================

  private async handleFailedLogin(userId: string): Promise<void> {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: { increment: 1 },
      },
    })

    if (user.failedLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          lockedUntil: new Date(Date.now() + LOCK_TIME_MINUTES * 60 * 1000),
        },
      })
    }
  }

  private async getDefaultRoleByCode(roleCode: string) {
    const code = roleCode === 'ESTUDIANTE' ? 'ESTUDIANTE'
      : roleCode === 'DOCENTE' ? 'DOCENTE'
      : 'EXTERNO'

    return prisma.role.findUnique({
      where: { codigo: code },
    })
  }

  private async createStudentCareers(userId: string, carreras: ExternalStudentData['carreras']): Promise<void> {
    for (const carrera of carreras) {
      // Normalizar nombre de facultad (mapea nombres antiguos a actuales)
      const facultadNombre = normalizarNombreFacultad(carrera.facultadNombre)

      // Buscar o crear facultad
      let faculty = await prisma.faculty.findFirst({
        where: { nombre: { contains: facultadNombre, mode: 'insensitive' } },
      })

      if (!faculty) {
        // Crear facultad si no existe
        const codigo = facultadNombre.substring(0, 3).toUpperCase()
        faculty = await prisma.faculty.create({
          data: {
            nombre: facultadNombre,
            codigo: `${codigo}_${Date.now()}`,
          },
        })
      }

      await prisma.studentCareer.create({
        data: {
          userId,
          codigoEstudiante: carrera.codigoEstudiante,
          carreraNombre: carrera.carreraNombre,
          facultadId: faculty.id,
          creditosAprobados: carrera.creditosAprobados,
        },
      })
    }
  }

  private async createTeacherInfo(userId: string, data: ExternalTeacherData): Promise<void> {
    // Normalizar nombre de facultad (mapea nombres antiguos a actuales)
    const facultadNombre = normalizarNombreFacultad(data.facultadNombre)

    // Buscar o crear facultad
    let faculty = await prisma.faculty.findFirst({
      where: { nombre: { contains: facultadNombre, mode: 'insensitive' } },
    })

    if (!faculty) {
      const codigo = facultadNombre.substring(0, 3).toUpperCase()
      faculty = await prisma.faculty.create({
        data: {
          nombre: facultadNombre,
          codigo: `${codigo}_${Date.now()}`,
        },
      })
    }

    await prisma.teacherInfo.create({
      data: {
        userId,
        codigoDocente: data.codigoDocente,
        departamentoAcademico: data.departamentoAcademico,
        facultadId: faculty.id,
      },
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private formatUserResponse(user: any): UserResponse {
    return {
      id: user.id,
      tipoDocumento: user.tipoDocumento,
      numeroDocumento: user.numeroDocumento,
      username: user.username,
      email: user.email,
      emailPersonal: user.emailPersonal,
      nombres: user.nombres,
      apellidoPaterno: user.apellidoPaterno,
      apellidoMaterno: user.apellidoMaterno,
      avatarUrl: user.avatarUrl,
      telefono: user.telefono,
      isActive: user.isActive,
      isVerified: user.isVerified,
      roles: user.roles?.map((ur: { role: { id: string; nombre: string; codigo: string; color: string | null } }) => ({
        id: ur.role.id,
        nombre: ur.role.nombre,
        codigo: ur.role.codigo,
        color: ur.role.color,
      })) || [],
      permissions: [],
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private extractPermissions(userRoles: any[]): PermissionResponse[] {
    const permissionMap = new Map<string, PermissionResponse>()

    for (const userRole of userRoles) {
      for (const perm of userRole.role.permissions) {
        const key = perm.module.codigo
        const existing = permissionMap.get(key)

        if (existing) {
          // Combinar permisos (OR lógico)
          existing.canView = existing.canView || perm.canView
          existing.canCreate = existing.canCreate || perm.canCreate
          existing.canEdit = existing.canEdit || perm.canEdit
          existing.canDelete = existing.canDelete || perm.canDelete
        } else {
          permissionMap.set(key, {
            moduleCode: perm.module.codigo,
            moduleName: perm.module.nombre,
            canView: perm.canView,
            canCreate: perm.canCreate,
            canEdit: perm.canEdit,
            canDelete: perm.canDelete,
          })
        }
      }
    }

    return Array.from(permissionMap.values())
  }

  private async logAudit(
    userId: string | null,
    action: string,
    entityType: string,
    entityId: string | null,
    requestInfo: RequestInfo,
    status: 'SUCCESS' | 'FAILURE',
    errorMessage?: string
  ): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action,
          entityType,
          entityId,
          ipAddress: requestInfo.ip,
          userAgent: requestInfo.userAgent,
          requestPath: requestInfo.path,
          requestMethod: requestInfo.method,
          status,
          errorMessage,
        },
      })
    } catch (error) {
      console.error('[Audit] Error logging:', error)
    }
  }
}

// Instancia singleton
export const authService = new AuthService()
