import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { AdminError } from '../types'
import type {
  AdminUserResponse,
  PaginatedResponse,
} from '../types'
import type {
  CreateUserInput,
  UpdateUserInput,
  AssignRoleInput,
  UserQueryInput,
} from '@/lib/validators/user.schema'

export class UserService {
  /**
   * Listar usuarios con paginación y filtros
   */
  async list(query: UserQueryInput): Promise<PaginatedResponse<AdminUserResponse>> {
    const { page, limit, search, isActive, roleId, sortBy, sortOrder } = query

    // Construir where clause
    const where: any = {
      deletedAt: null,
    }

    if (search) {
      const searchTerms = search.trim().split(/\s+/).filter(term => term.length > 0)

      if (searchTerms.length === 1) {
        // Búsqueda simple: una sola palabra
        where.OR = [
          { nombres: { contains: search, mode: 'insensitive' } },
          { apellidoPaterno: { contains: search, mode: 'insensitive' } },
          { apellidoMaterno: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { numeroDocumento: { contains: search, mode: 'insensitive' } },
        ]
      } else {
        // Búsqueda múltiple: cada término debe coincidir en algún campo
        where.AND = searchTerms.map(term => ({
          OR: [
            { nombres: { contains: term, mode: 'insensitive' } },
            { apellidoPaterno: { contains: term, mode: 'insensitive' } },
            { apellidoMaterno: { contains: term, mode: 'insensitive' } },
            { email: { contains: term, mode: 'insensitive' } },
            { numeroDocumento: { contains: term, mode: 'insensitive' } },
          ]
        }))
      }
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true'
    }

    if (roleId) {
      where.roles = {
        some: {
          roleId,
          isActive: true,
        },
      }
    }

    // Contar total
    const total = await prisma.user.count({ where })

    // Obtener usuarios
    const users = await prisma.user.findMany({
      where,
      include: {
        roles: {
          where: { isActive: true },
          include: {
            role: true,
          },
        },
      },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    })

    const totalPages = Math.ceil(total / limit)

    return {
      data: users.map(this.formatUserResponse),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    }
  }

  /**
   * Obtener usuario por ID
   */
  async getById(id: string): Promise<AdminUserResponse> {
    const user = await prisma.user.findUnique({
      where: { id, deletedAt: null },
      include: {
        roles: {
          where: { isActive: true },
          include: { role: true },
        },
      },
    })

    if (!user) {
      throw new AdminError('USER_NOT_FOUND', 'Usuario no encontrado', 404)
    }

    return this.formatUserResponse(user)
  }

  /**
   * Crear usuario
   */
  async create(input: CreateUserInput, adminId: string): Promise<AdminUserResponse> {
    // Verificar email y documento únicos
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { email: input.email.toLowerCase() },
          { numeroDocumento: input.numeroDocumento },
        ],
        deletedAt: null,
      },
    })

    if (existing) {
      if (existing.email === input.email.toLowerCase()) {
        throw new AdminError('USER_EXISTS', 'Ya existe un usuario con este email', 409)
      }
      throw new AdminError('USER_EXISTS', 'Ya existe un usuario con este número de documento', 409)
    }

    // Hash password
    const passwordHash = await hashPassword(input.password)

    // Crear usuario
    const user = await prisma.user.create({
      data: {
        tipoDocumento: input.tipoDocumento,
        numeroDocumento: input.numeroDocumento,
        email: input.email.toLowerCase(),
        emailPersonal: input.emailPersonal || null,
        passwordHash,
        nombres: input.nombres,
        apellidoPaterno: input.apellidoPaterno,
        apellidoMaterno: input.apellidoMaterno,
        telefono: input.telefono || null,
        isActive: input.isActive ?? true,
        isVerified: input.isVerified ?? true, // Admin creates verified by default
      },
      include: {
        roles: {
          where: { isActive: true },
          include: { role: true },
        },
      },
    })

    // Asignar roles - soporta roleId (single) o roleIds (array)
    const roleIdsToAssign = input.roleIds?.length ? input.roleIds : (input.roleId ? [input.roleId] : [])

    for (const roleId of roleIdsToAssign) {
      const role = await prisma.role.findUnique({
        where: { id: roleId },
      })

      if (role) {
        await prisma.userRole.create({
          data: {
            userId: user.id,
            roleId: roleId,
            assignedBy: adminId,
          },
        })
      }
    }

    // Crear registros de carreras si hay datos de estudiante
    if (input.studentData?.carreras && input.studentData.carreras.length > 0) {
      await this.createStudentCareers(user.id, input.studentData.carreras)
    }

    // Crear info de docente si hay datos
    if (input.teacherData) {
      await this.createTeacherInfo(user.id, input.teacherData)
    }

    // Obtener usuario actualizado con roles
    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        roles: {
          where: { isActive: true },
          include: { role: true },
        },
      },
    })

    // Registrar auditoría
    await this.logAudit(adminId, 'USER_CREATE', 'User', user.id, null, {
      email: user.email,
      nombres: user.nombres,
      roleIds: roleIdsToAssign,
    })

    return this.formatUserResponse(updatedUser!)
  }

  /**
   * Crear carreras de estudiante
   */
  private async createStudentCareers(
    userId: string,
    carreras: { codigoEstudiante: string; carreraNombre: string; facultadNombre: string; creditosAprobados: number }[]
  ): Promise<void> {
    for (const carrera of carreras) {
      // Buscar o crear facultad
      let faculty = await prisma.faculty.findFirst({
        where: { nombre: { contains: carrera.facultadNombre, mode: 'insensitive' } },
      })

      if (!faculty) {
        const codigo = carrera.facultadNombre.substring(0, 3).toUpperCase()
        faculty = await prisma.faculty.create({
          data: {
            nombre: carrera.facultadNombre,
            codigo: `${codigo}_${Date.now()}`,
          },
        })
      }

      // Verificar si ya existe la carrera para este usuario
      const existingCareer = await prisma.studentCareer.findFirst({
        where: {
          userId,
          codigoEstudiante: carrera.codigoEstudiante,
        },
      })

      if (!existingCareer) {
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
  }

  /**
   * Crear info de docente
   */
  private async createTeacherInfo(
    userId: string,
    data: { codigoDocente: string; departamentoAcademico: string; facultadNombre: string }
  ): Promise<void> {
    // Verificar si ya existe
    const existing = await prisma.teacherInfo.findUnique({
      where: { userId },
    })

    if (existing) return

    // Buscar o crear facultad
    let faculty = await prisma.faculty.findFirst({
      where: { nombre: { contains: data.facultadNombre, mode: 'insensitive' } },
    })

    if (!faculty) {
      const codigo = data.facultadNombre.substring(0, 3).toUpperCase()
      faculty = await prisma.faculty.create({
        data: {
          nombre: data.facultadNombre,
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

  /**
   * Actualizar usuario
   */
  async update(id: string, input: UpdateUserInput, adminId: string): Promise<AdminUserResponse> {
    const existing = await prisma.user.findUnique({
      where: { id, deletedAt: null },
    })

    if (!existing) {
      throw new AdminError('USER_NOT_FOUND', 'Usuario no encontrado', 404)
    }

    // Verificar email único si se actualiza
    if (input.email && input.email.toLowerCase() !== existing.email) {
      const emailExists = await prisma.user.findFirst({
        where: {
          email: input.email.toLowerCase(),
          id: { not: id },
          deletedAt: null,
        },
      })

      if (emailExists) {
        throw new AdminError('USER_EXISTS', 'Ya existe un usuario con este email', 409)
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(input.email && { email: input.email.toLowerCase() }),
        ...(input.emailPersonal !== undefined && { emailPersonal: input.emailPersonal || null }),
        ...(input.nombres && { nombres: input.nombres }),
        ...(input.apellidoPaterno && { apellidoPaterno: input.apellidoPaterno }),
        ...(input.apellidoMaterno && { apellidoMaterno: input.apellidoMaterno }),
        ...(input.telefono !== undefined && { telefono: input.telefono || null }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
        ...(input.isVerified !== undefined && { isVerified: input.isVerified }),
      },
      include: {
        roles: {
          where: { isActive: true },
          include: { role: true },
        },
      },
    })

    // Registrar auditoría
    await this.logAudit(adminId, 'USER_UPDATE', 'User', id, existing, input)

    return this.formatUserResponse(user)
  }

  /**
   * Eliminar usuario (hard delete)
   */
  async delete(id: string, adminId: string): Promise<void> {
    if (id === adminId) {
      throw new AdminError('CANNOT_DELETE_SELF', 'No puedes eliminar tu propia cuenta', 400)
    }

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        roles: { include: { role: true } },
      },
    })

    if (!user) {
      throw new AdminError('USER_NOT_FOUND', 'Usuario no encontrado', 404)
    }

    // Registrar auditoría ANTES de eliminar
    await this.logAudit(adminId, 'USER_DELETE', 'User', id, {
      email: user.email,
      numeroDocumento: user.numeroDocumento,
      nombres: user.nombres,
      apellidoPaterno: user.apellidoPaterno,
      apellidoMaterno: user.apellidoMaterno,
      roles: user.roles.map(r => r.role.codigo),
    }, null)

    // Hard delete - las relaciones se eliminan en cascada
    await prisma.user.delete({
      where: { id },
    })
  }

  /**
   * Activar/Desactivar usuario
   */
  async toggleActive(id: string, adminId: string): Promise<AdminUserResponse> {
    if (id === adminId) {
      throw new AdminError('CANNOT_DEACTIVATE_SELF', 'No puedes desactivar tu propia cuenta', 400)
    }

    const user = await prisma.user.findUnique({
      where: { id, deletedAt: null },
    })

    if (!user) {
      throw new AdminError('USER_NOT_FOUND', 'Usuario no encontrado', 404)
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
      include: {
        roles: {
          where: { isActive: true },
          include: { role: true },
        },
      },
    })

    // Registrar auditoría
    await this.logAudit(
      adminId,
      user.isActive ? 'USER_DEACTIVATE' : 'USER_ACTIVATE',
      'User',
      id,
      { isActive: user.isActive },
      { isActive: updated.isActive }
    )

    return this.formatUserResponse(updated)
  }

  /**
   * Desbloquear cuenta
   */
  async unlock(id: string, adminId: string): Promise<AdminUserResponse> {
    const user = await prisma.user.findUnique({
      where: { id, deletedAt: null },
    })

    if (!user) {
      throw new AdminError('USER_NOT_FOUND', 'Usuario no encontrado', 404)
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
      include: {
        roles: {
          where: { isActive: true },
          include: { role: true },
        },
      },
    })

    // Registrar auditoría
    await this.logAudit(adminId, 'USER_UNLOCK', 'User', id, null, null)

    return this.formatUserResponse(updated)
  }

  /**
   * Asignar rol a usuario
   */
  async assignRole(userId: string, input: AssignRoleInput, adminId: string): Promise<AdminUserResponse> {
    const user = await prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
    })

    if (!user) {
      throw new AdminError('USER_NOT_FOUND', 'Usuario no encontrado', 404)
    }

    const role = await prisma.role.findUnique({
      where: { id: input.roleId },
    })

    if (!role) {
      throw new AdminError('ROLE_NOT_FOUND', 'Rol no encontrado', 404)
    }

    // Verificar si ya tiene el rol
    const existingRole = await prisma.userRole.findFirst({
      where: {
        userId,
        roleId: input.roleId,
        contextType: input.contextType || null,
        contextId: input.contextId || null,
        isActive: true,
      },
    })

    if (existingRole) {
      throw new AdminError('ROLE_ALREADY_ASSIGNED', 'El usuario ya tiene este rol asignado', 409)
    }

    await prisma.userRole.create({
      data: {
        userId,
        roleId: input.roleId,
        contextType: input.contextType || null,
        contextId: input.contextId || null,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        assignedBy: adminId,
      },
    })

    const updated = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          where: { isActive: true },
          include: { role: true },
        },
      },
    })

    // Registrar auditoría
    await this.logAudit(adminId, 'ROLE_ASSIGN', 'UserRole', userId, null, { roleId: input.roleId, roleName: role.nombre })

    return this.formatUserResponse(updated!)
  }

  /**
   * Remover rol de usuario
   */
  async removeRole(userId: string, roleId: string, adminId: string): Promise<AdminUserResponse> {
    const userRole = await prisma.userRole.findFirst({
      where: {
        userId,
        roleId,
        isActive: true,
      },
      include: {
        role: true,
      },
    })

    if (!userRole) {
      throw new AdminError('ROLE_NOT_FOUND', 'El usuario no tiene este rol asignado', 404)
    }

    await prisma.userRole.update({
      where: { id: userRole.id },
      data: { isActive: false },
    })

    const updated = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          where: { isActive: true },
          include: { role: true },
        },
      },
    })

    // Registrar auditoría
    await this.logAudit(adminId, 'ROLE_REMOVE', 'UserRole', userId, { roleId, roleName: userRole.role.nombre }, null)

    return this.formatUserResponse(updated!)
  }

  /**
   * Obtener todos los roles disponibles
   */
  async getRoles() {
    return prisma.role.findMany({
      where: { isActive: true },
      orderBy: { nombre: 'asc' },
    })
  }

  // ==========================================
  // MÉTODOS PRIVADOS
  // ==========================================

  private formatUserResponse(user: any): AdminUserResponse {
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
      failedLoginAttempts: user.failedLoginAttempts,
      lockedUntil: user.lockedUntil,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      roles: user.roles?.map((ur: any) => ({
        id: ur.id,
        roleId: ur.roleId,
        roleName: ur.role.nombre,
        roleCode: ur.role.codigo,
        roleColor: ur.role.color,
        contextType: ur.contextType,
        contextId: ur.contextId,
        assignedAt: ur.assignedAt,
        expiresAt: ur.expiresAt,
        isActive: ur.isActive,
      })) || [],
    }
  }

  private async logAudit(
    userId: string,
    action: string,
    entityType: string,
    entityId: string,
    oldValues: any,
    newValues: any
  ): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action,
          entityType,
          entityId,
          oldValues: oldValues ? JSON.parse(JSON.stringify(oldValues)) : null,
          newValues: newValues ? JSON.parse(JSON.stringify(newValues)) : null,
          status: 'SUCCESS',
        },
      })
    } catch (error) {
      console.error('[UserService] Error logging audit:', error)
    }
  }
}

// Singleton
export const userService = new UserService()
