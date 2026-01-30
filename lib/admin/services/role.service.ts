import { prisma } from '@/lib/prisma'
import { AdminError } from '../types'
import type {
  CreateRoleInput,
  UpdateRoleInput,
  UpdatePermissionsInput,
  RoleQueryInput,
} from '@/lib/validators/role.schema'

export interface RoleResponse {
  id: string
  nombre: string
  codigo: string
  descripcion: string | null
  color: string | null
  isSystem: boolean
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  _count?: {
    users: number
    permissions: number
  }
}

export interface RoleWithPermissions extends RoleResponse {
  permissions: {
    moduleId: string
    moduleName: string
    moduleCode: string
    canView: boolean
    canCreate: boolean
    canEdit: boolean
    canDelete: boolean
  }[]
}

export interface ModulePermission {
  id: string
  nombre: string
  codigo: string
  descripcion: string | null
  icono: string | null
  orden: number
  parentId: string | null
  canView: boolean
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
}

export class RoleService {
  /**
   * Listar roles con filtros
   */
  async list(query: RoleQueryInput): Promise<RoleResponse[]> {
    const { search, isActive, isSystem } = query

    const where: any = {}

    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: 'insensitive' } },
        { codigo: { contains: search, mode: 'insensitive' } },
        { descripcion: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true'
    }

    if (isSystem !== undefined) {
      where.isSystem = isSystem === 'true'
    }

    const roles = await prisma.role.findMany({
      where,
      include: {
        _count: {
          select: {
            users: {
              where: { isActive: true },
            },
            permissions: true,
          },
        },
      },
      orderBy: [
        { isSystem: 'desc' },
        { nombre: 'asc' },
      ],
    })

    return roles.map(this.formatRoleResponse)
  }

  /**
   * Obtener rol por ID con permisos
   */
  async getById(id: string): Promise<RoleWithPermissions> {
    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        permissions: {
          include: {
            module: true,
          },
        },
        _count: {
          select: {
            users: {
              where: { isActive: true },
            },
            permissions: true,
          },
        },
      },
    })

    if (!role) {
      throw new AdminError('ROLE_NOT_FOUND', 'Rol no encontrado', 404)
    }

    return {
      ...this.formatRoleResponse(role),
      permissions: role.permissions.map((p) => ({
        moduleId: p.moduleId,
        moduleName: p.module.nombre,
        moduleCode: p.module.codigo,
        canView: p.canView,
        canCreate: p.canCreate,
        canEdit: p.canEdit,
        canDelete: p.canDelete,
      })),
    }
  }

  /**
   * Crear nuevo rol
   */
  async create(input: CreateRoleInput, adminId: string): Promise<RoleResponse> {
    // Verificar nombre único
    const existingName = await prisma.role.findUnique({
      where: { nombre: input.nombre },
    })

    if (existingName) {
      throw new AdminError('ROLE_EXISTS', 'Ya existe un rol con este nombre', 409)
    }

    // Verificar código único
    const existingCode = await prisma.role.findUnique({
      where: { codigo: input.codigo },
    })

    if (existingCode) {
      throw new AdminError('ROLE_EXISTS', 'Ya existe un rol con este código', 409)
    }

    const role = await prisma.role.create({
      data: {
        nombre: input.nombre,
        codigo: input.codigo,
        descripcion: input.descripcion || null,
        color: input.color || null,
        isSystem: false,
        isActive: true,
      },
      include: {
        _count: {
          select: {
            users: true,
            permissions: true,
          },
        },
      },
    })

    // Registrar auditoría
    await this.logAudit(adminId, 'ROLE_CREATE', 'Role', role.id, null, {
      nombre: role.nombre,
      codigo: role.codigo,
    })

    return this.formatRoleResponse(role)
  }

  /**
   * Actualizar rol
   */
  async update(id: string, input: UpdateRoleInput, adminId: string): Promise<RoleResponse> {
    const existing = await prisma.role.findUnique({
      where: { id },
    })

    if (!existing) {
      throw new AdminError('ROLE_NOT_FOUND', 'Rol no encontrado', 404)
    }

    if (existing.isSystem) {
      throw new AdminError('CANNOT_MODIFY_SYSTEM_ROLE', 'No se puede modificar un rol del sistema', 403)
    }

    // Verificar nombre único si se actualiza
    if (input.nombre && input.nombre !== existing.nombre) {
      const nameExists = await prisma.role.findFirst({
        where: {
          nombre: input.nombre,
          id: { not: id },
        },
      })

      if (nameExists) {
        throw new AdminError('ROLE_EXISTS', 'Ya existe un rol con este nombre', 409)
      }
    }

    const role = await prisma.role.update({
      where: { id },
      data: {
        ...(input.nombre && { nombre: input.nombre }),
        ...(input.descripcion !== undefined && { descripcion: input.descripcion || null }),
        ...(input.color !== undefined && { color: input.color || null }),
      },
      include: {
        _count: {
          select: {
            users: {
              where: { isActive: true },
            },
            permissions: true,
          },
        },
      },
    })

    // Registrar auditoría
    await this.logAudit(adminId, 'ROLE_UPDATE', 'Role', id, existing, input)

    return this.formatRoleResponse(role)
  }

  /**
   * Eliminar rol
   */
  async delete(id: string, adminId: string): Promise<void> {
    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: {
              where: { isActive: true },
            },
          },
        },
      },
    })

    if (!role) {
      throw new AdminError('ROLE_NOT_FOUND', 'Rol no encontrado', 404)
    }

    if (role.isSystem) {
      throw new AdminError('CANNOT_DELETE_SYSTEM_ROLE', 'No se puede eliminar un rol del sistema', 403)
    }

    if (role._count.users > 0) {
      throw new AdminError(
        'ROLE_HAS_USERS',
        `No se puede eliminar el rol porque tiene ${role._count.users} usuario(s) asignado(s)`,
        400
      )
    }

    // Eliminar permisos primero y luego el rol
    await prisma.$transaction([
      prisma.rolePermission.deleteMany({ where: { roleId: id } }),
      prisma.role.delete({ where: { id } }),
    ])

    // Registrar auditoría
    await this.logAudit(adminId, 'ROLE_DELETE', 'Role', id, { nombre: role.nombre, codigo: role.codigo }, null)
  }

  /**
   * Activar/Desactivar rol
   */
  async toggleActive(id: string, adminId: string): Promise<RoleResponse> {
    const role = await prisma.role.findUnique({
      where: { id },
    })

    if (!role) {
      throw new AdminError('ROLE_NOT_FOUND', 'Rol no encontrado', 404)
    }

    if (role.isSystem) {
      throw new AdminError('CANNOT_MODIFY_SYSTEM_ROLE', 'No se puede modificar un rol del sistema', 403)
    }

    const updated = await prisma.role.update({
      where: { id },
      data: { isActive: !role.isActive },
      include: {
        _count: {
          select: {
            users: {
              where: { isActive: true },
            },
            permissions: true,
          },
        },
      },
    })

    // Registrar auditoría
    await this.logAudit(
      adminId,
      role.isActive ? 'ROLE_DEACTIVATE' : 'ROLE_ACTIVATE',
      'Role',
      id,
      { isActive: role.isActive },
      { isActive: updated.isActive }
    )

    return this.formatRoleResponse(updated)
  }

  /**
   * Obtener matriz de permisos para un rol
   */
  async getPermissions(roleId: string): Promise<ModulePermission[]> {
    const role = await prisma.role.findUnique({
      where: { id: roleId },
    })

    if (!role) {
      throw new AdminError('ROLE_NOT_FOUND', 'Rol no encontrado', 404)
    }

    // Obtener todos los módulos activos
    const modules = await prisma.systemModule.findMany({
      where: { isActive: true },
      orderBy: [
        { parentId: 'asc' },
        { orden: 'asc' },
        { nombre: 'asc' },
      ],
    })

    // Obtener permisos existentes del rol
    const existingPermissions = await prisma.rolePermission.findMany({
      where: { roleId },
    })

    // Crear mapa de permisos
    const permissionMap = new Map(
      existingPermissions.map((p) => [p.moduleId, p])
    )

    // Combinar módulos con permisos
    return modules.map((module) => {
      const permission = permissionMap.get(module.id)
      return {
        id: module.id,
        nombre: module.nombre,
        codigo: module.codigo,
        descripcion: module.descripcion,
        icono: module.icono,
        orden: module.orden,
        parentId: module.parentId,
        canView: permission?.canView ?? false,
        canCreate: permission?.canCreate ?? false,
        canEdit: permission?.canEdit ?? false,
        canDelete: permission?.canDelete ?? false,
      }
    })
  }

  /**
   * Actualizar permisos de un rol
   */
  async updatePermissions(
    roleId: string,
    input: UpdatePermissionsInput,
    adminId: string
  ): Promise<ModulePermission[]> {
    const role = await prisma.role.findUnique({
      where: { id: roleId },
    })

    if (!role) {
      throw new AdminError('ROLE_NOT_FOUND', 'Rol no encontrado', 404)
    }

    // Obtener permisos actuales para auditoría
    const oldPermissions = await prisma.rolePermission.findMany({
      where: { roleId },
      include: { module: true },
    })

    // Actualizar permisos en transacción
    await prisma.$transaction(async (tx) => {
      for (const perm of input.permissions) {
        // Verificar que el módulo existe
        const moduleExists = await tx.systemModule.findUnique({
          where: { id: perm.moduleId },
        })

        if (!moduleExists) {
          continue // Ignorar módulos que no existen
        }

        // Si todos los permisos son false, eliminar el registro
        const hasAnyPermission = perm.canView || perm.canCreate || perm.canEdit || perm.canDelete

        if (!hasAnyPermission) {
          await tx.rolePermission.deleteMany({
            where: {
              roleId,
              moduleId: perm.moduleId,
            },
          })
        } else {
          // Upsert del permiso
          await tx.rolePermission.upsert({
            where: {
              roleId_moduleId: {
                roleId,
                moduleId: perm.moduleId,
              },
            },
            create: {
              roleId,
              moduleId: perm.moduleId,
              canView: perm.canView,
              canCreate: perm.canCreate,
              canEdit: perm.canEdit,
              canDelete: perm.canDelete,
            },
            update: {
              canView: perm.canView,
              canCreate: perm.canCreate,
              canEdit: perm.canEdit,
              canDelete: perm.canDelete,
            },
          })
        }
      }
    })

    // Registrar auditoría
    await this.logAudit(
      adminId,
      'PERMISSIONS_UPDATE',
      'Role',
      roleId,
      oldPermissions.map((p) => ({
        module: p.module.codigo,
        canView: p.canView,
        canCreate: p.canCreate,
        canEdit: p.canEdit,
        canDelete: p.canDelete,
      })),
      input.permissions
    )

    // Retornar permisos actualizados
    return this.getPermissions(roleId)
  }

  /**
   * Obtener todos los módulos del sistema
   */
  async getModules() {
    return prisma.systemModule.findMany({
      where: { isActive: true },
      orderBy: [
        { parentId: 'asc' },
        { orden: 'asc' },
        { nombre: 'asc' },
      ],
    })
  }

  // ==========================================
  // MÉTODOS PRIVADOS
  // ==========================================

  private formatRoleResponse(role: any): RoleResponse {
    return {
      id: role.id,
      nombre: role.nombre,
      codigo: role.codigo,
      descripcion: role.descripcion,
      color: role.color,
      isSystem: role.isSystem,
      isActive: role.isActive,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      _count: role._count,
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
      console.error('[RoleService] Error logging audit:', error)
    }
  }
}

// Singleton
export const roleService = new RoleService()
