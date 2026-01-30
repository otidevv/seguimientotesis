import { prisma } from '@/lib/prisma'
import { AdminError } from '../types'
import type {
  CreateModuleInput,
  UpdateModuleInput,
  ModuleQueryInput,
} from '@/lib/validators/module.schema'

export interface ModuleResponse {
  id: string
  nombre: string
  codigo: string
  descripcion: string | null
  icono: string | null
  ruta: string | null
  orden: number
  parentId: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  parent?: {
    id: string
    nombre: string
    codigo: string
  } | null
  _count?: {
    children: number
    permissions: number
  }
}

export interface ModuleWithChildren extends ModuleResponse {
  children: ModuleResponse[]
}

export class ModuleService {
  /**
   * Listar módulos con filtros
   */
  async list(query: ModuleQueryInput): Promise<ModuleResponse[]> {
    const { search, isActive, parentId } = query

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

    if (parentId !== undefined) {
      where.parentId = parentId === '' ? null : parentId
    }

    const modules = await prisma.systemModule.findMany({
      where,
      include: {
        parent: {
          select: {
            id: true,
            nombre: true,
            codigo: true,
          },
        },
        _count: {
          select: {
            children: true,
            permissions: true,
          },
        },
      },
      orderBy: [
        { parentId: 'asc' },
        { orden: 'asc' },
        { nombre: 'asc' },
      ],
    })

    return modules.map(this.formatModuleResponse)
  }

  /**
   * Obtener módulo por ID
   */
  async getById(id: string): Promise<ModuleWithChildren> {
    const module = await prisma.systemModule.findUnique({
      where: { id },
      include: {
        parent: {
          select: {
            id: true,
            nombre: true,
            codigo: true,
          },
        },
        children: {
          include: {
            _count: {
              select: {
                children: true,
                permissions: true,
              },
            },
          },
          orderBy: [
            { orden: 'asc' },
            { nombre: 'asc' },
          ],
        },
        _count: {
          select: {
            children: true,
            permissions: true,
          },
        },
      },
    })

    if (!module) {
      throw new AdminError('MODULE_NOT_FOUND', 'Módulo no encontrado', 404)
    }

    return {
      ...this.formatModuleResponse(module),
      children: module.children.map(this.formatModuleResponse),
    }
  }

  /**
   * Crear nuevo módulo
   */
  async create(input: CreateModuleInput, adminId: string): Promise<ModuleResponse> {
    // Verificar nombre único
    const existingName = await prisma.systemModule.findUnique({
      where: { nombre: input.nombre },
    })

    if (existingName) {
      throw new AdminError('MODULE_EXISTS', 'Ya existe un módulo con este nombre', 409)
    }

    // Verificar código único
    const existingCode = await prisma.systemModule.findUnique({
      where: { codigo: input.codigo },
    })

    if (existingCode) {
      throw new AdminError('MODULE_EXISTS', 'Ya existe un módulo con este código', 409)
    }

    // Verificar que el padre existe si se especifica
    if (input.parentId) {
      const parent = await prisma.systemModule.findUnique({
        where: { id: input.parentId },
      })

      if (!parent) {
        throw new AdminError('MODULE_NOT_FOUND', 'Módulo padre no encontrado', 404)
      }
    }

    const module = await prisma.systemModule.create({
      data: {
        nombre: input.nombre,
        codigo: input.codigo,
        descripcion: input.descripcion || null,
        icono: input.icono || null,
        ruta: input.ruta || null,
        orden: input.orden ?? 0,
        parentId: input.parentId || null,
        isActive: true,
      },
      include: {
        parent: {
          select: {
            id: true,
            nombre: true,
            codigo: true,
          },
        },
        _count: {
          select: {
            children: true,
            permissions: true,
          },
        },
      },
    })

    // Registrar auditoría
    await this.logAudit(adminId, 'MODULE_CREATE', 'SystemModule', module.id, null, {
      nombre: module.nombre,
      codigo: module.codigo,
    })

    return this.formatModuleResponse(module)
  }

  /**
   * Actualizar módulo
   */
  async update(id: string, input: UpdateModuleInput, adminId: string): Promise<ModuleResponse> {
    const existing = await prisma.systemModule.findUnique({
      where: { id },
    })

    if (!existing) {
      throw new AdminError('MODULE_NOT_FOUND', 'Módulo no encontrado', 404)
    }

    // Verificar nombre único si se actualiza
    if (input.nombre && input.nombre !== existing.nombre) {
      const nameExists = await prisma.systemModule.findFirst({
        where: {
          nombre: input.nombre,
          id: { not: id },
        },
      })

      if (nameExists) {
        throw new AdminError('MODULE_EXISTS', 'Ya existe un módulo con este nombre', 409)
      }
    }

    // Verificar que el padre existe si se especifica
    if (input.parentId) {
      // No puede ser su propio padre
      if (input.parentId === id) {
        throw new AdminError('INVALID_INPUT', 'Un módulo no puede ser su propio padre', 400)
      }

      const parent = await prisma.systemModule.findUnique({
        where: { id: input.parentId },
      })

      if (!parent) {
        throw new AdminError('MODULE_NOT_FOUND', 'Módulo padre no encontrado', 404)
      }

      // Verificar que no sea un hijo (evitar ciclos)
      const isChild = await this.isDescendant(input.parentId, id)
      if (isChild) {
        throw new AdminError('INVALID_INPUT', 'No se puede asignar un hijo como padre', 400)
      }
    }

    const module = await prisma.systemModule.update({
      where: { id },
      data: {
        ...(input.nombre && { nombre: input.nombre }),
        ...(input.descripcion !== undefined && { descripcion: input.descripcion || null }),
        ...(input.icono !== undefined && { icono: input.icono || null }),
        ...(input.ruta !== undefined && { ruta: input.ruta || null }),
        ...(input.orden !== undefined && { orden: input.orden }),
        ...(input.parentId !== undefined && { parentId: input.parentId || null }),
      },
      include: {
        parent: {
          select: {
            id: true,
            nombre: true,
            codigo: true,
          },
        },
        _count: {
          select: {
            children: true,
            permissions: true,
          },
        },
      },
    })

    // Registrar auditoría
    await this.logAudit(adminId, 'MODULE_UPDATE', 'SystemModule', id, existing, input)

    return this.formatModuleResponse(module)
  }

  /**
   * Eliminar módulo
   */
  async delete(id: string, adminId: string): Promise<void> {
    const module = await prisma.systemModule.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            children: true,
            permissions: true,
          },
        },
      },
    })

    if (!module) {
      throw new AdminError('MODULE_NOT_FOUND', 'Módulo no encontrado', 404)
    }

    if (module._count.children > 0) {
      throw new AdminError(
        'MODULE_HAS_CHILDREN',
        `No se puede eliminar el módulo porque tiene ${module._count.children} submódulo(s)`,
        400
      )
    }

    if (module._count.permissions > 0) {
      throw new AdminError(
        'MODULE_HAS_PERMISSIONS',
        `No se puede eliminar el módulo porque tiene ${module._count.permissions} permiso(s) asignado(s)`,
        400
      )
    }

    await prisma.systemModule.delete({ where: { id } })

    // Registrar auditoría
    await this.logAudit(adminId, 'MODULE_DELETE', 'SystemModule', id, {
      nombre: module.nombre,
      codigo: module.codigo,
    }, null)
  }

  /**
   * Activar/Desactivar módulo
   */
  async toggleActive(id: string, adminId: string): Promise<ModuleResponse> {
    const module = await prisma.systemModule.findUnique({
      where: { id },
    })

    if (!module) {
      throw new AdminError('MODULE_NOT_FOUND', 'Módulo no encontrado', 404)
    }

    const updated = await prisma.systemModule.update({
      where: { id },
      data: { isActive: !module.isActive },
      include: {
        parent: {
          select: {
            id: true,
            nombre: true,
            codigo: true,
          },
        },
        _count: {
          select: {
            children: true,
            permissions: true,
          },
        },
      },
    })

    // Registrar auditoría
    await this.logAudit(
      adminId,
      module.isActive ? 'MODULE_DEACTIVATE' : 'MODULE_ACTIVATE',
      'SystemModule',
      id,
      { isActive: module.isActive },
      { isActive: updated.isActive }
    )

    return this.formatModuleResponse(updated)
  }

  /**
   * Obtener módulos para selector (solo activos, estructura plana)
   */
  async getForSelect(): Promise<{ id: string; nombre: string; codigo: string; parentId: string | null }[]> {
    return prisma.systemModule.findMany({
      where: { isActive: true },
      select: {
        id: true,
        nombre: true,
        codigo: true,
        parentId: true,
      },
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

  /**
   * Verificar si un módulo es descendiente de otro
   */
  private async isDescendant(moduleId: string, potentialAncestorId: string): Promise<boolean> {
    const module = await prisma.systemModule.findUnique({
      where: { id: moduleId },
      select: { parentId: true },
    })

    if (!module) return false
    if (!module.parentId) return false
    if (module.parentId === potentialAncestorId) return true

    return this.isDescendant(module.parentId, potentialAncestorId)
  }

  private formatModuleResponse(module: any): ModuleResponse {
    return {
      id: module.id,
      nombre: module.nombre,
      codigo: module.codigo,
      descripcion: module.descripcion,
      icono: module.icono,
      ruta: module.ruta,
      orden: module.orden,
      parentId: module.parentId,
      isActive: module.isActive,
      createdAt: module.createdAt,
      updatedAt: module.updatedAt,
      parent: module.parent,
      _count: module._count,
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
      console.error('[ModuleService] Error logging audit:', error)
    }
  }
}

// Singleton
export const moduleService = new ModuleService()
