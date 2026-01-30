import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AdminError } from '@/lib/admin/types'
import { z } from 'zod'

// Schema de validación para actualizar permisos en batch
const updatePermissionsBatchSchema = z.object({
  changes: z.array(z.object({
    roleId: z.string(),
    moduleId: z.string(),
    canView: z.boolean(),
    canCreate: z.boolean(),
    canEdit: z.boolean(),
    canDelete: z.boolean(),
  }))
})

/**
 * GET /api/admin/permisos
 * Obtiene la matriz completa de permisos (roles × módulos)
 */
export async function GET() {
  try {
    // Obtener todos los roles activos
    const roles = await prisma.role.findMany({
      where: { isActive: true },
      orderBy: [
        { isSystem: 'desc' },
        { nombre: 'asc' },
      ],
      select: {
        id: true,
        codigo: true,
        nombre: true,
        color: true,
        isSystem: true,
      },
    })

    // Obtener todos los módulos activos
    const modules = await prisma.systemModule.findMany({
      where: { isActive: true },
      orderBy: [
        { parentId: 'asc' },
        { orden: 'asc' },
        { nombre: 'asc' },
      ],
      select: {
        id: true,
        codigo: true,
        nombre: true,
        icono: true,
        parentId: true,
        orden: true,
      },
    })

    // Obtener todos los permisos existentes
    const permissions = await prisma.rolePermission.findMany({
      select: {
        roleId: true,
        moduleId: true,
        canView: true,
        canCreate: true,
        canEdit: true,
        canDelete: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        roles,
        modules,
        permissions,
      },
    })
  } catch (error) {
    console.error('[GET /api/admin/permisos] Error:', error)

    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/admin/permisos
 * Actualiza permisos en batch
 */
export async function PUT(request: NextRequest) {
  try {
    const adminId = request.headers.get('x-user-id')

    if (!adminId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const result = updatePermissionsBatchSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: result.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { changes } = result.data

    if (changes.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No hay cambios para guardar',
      })
    }

    // Obtener el rol SUPER_ADMIN para protegerlo
    const superAdminRole = await prisma.role.findFirst({
      where: { codigo: 'SUPER_ADMIN' },
    })

    // Obtener permisos actuales para auditoría
    const currentPermissions = await prisma.rolePermission.findMany({
      where: {
        OR: changes.map(c => ({
          roleId: c.roleId,
          moduleId: c.moduleId,
        })),
      },
      include: {
        role: { select: { codigo: true } },
        module: { select: { codigo: true } },
      },
    })

    // Actualizar permisos en transacción
    await prisma.$transaction(async (tx) => {
      for (const change of changes) {
        // Proteger SUPER_ADMIN: siempre debe tener todos los permisos
        if (superAdminRole && change.roleId === superAdminRole.id) {
          // Para SUPER_ADMIN, siempre establecer todos los permisos en true
          await tx.rolePermission.upsert({
            where: {
              roleId_moduleId: {
                roleId: change.roleId,
                moduleId: change.moduleId,
              },
            },
            create: {
              roleId: change.roleId,
              moduleId: change.moduleId,
              canView: true,
              canCreate: true,
              canEdit: true,
              canDelete: true,
            },
            update: {
              canView: true,
              canCreate: true,
              canEdit: true,
              canDelete: true,
            },
          })
          continue
        }

        // Verificar que el módulo existe
        const moduleExists = await tx.systemModule.findUnique({
          where: { id: change.moduleId },
        })

        if (!moduleExists) {
          continue
        }

        // Si todos los permisos son false, eliminar el registro
        const hasAnyPermission = change.canView || change.canCreate || change.canEdit || change.canDelete

        if (!hasAnyPermission) {
          await tx.rolePermission.deleteMany({
            where: {
              roleId: change.roleId,
              moduleId: change.moduleId,
            },
          })
        } else {
          // Upsert del permiso
          await tx.rolePermission.upsert({
            where: {
              roleId_moduleId: {
                roleId: change.roleId,
                moduleId: change.moduleId,
              },
            },
            create: {
              roleId: change.roleId,
              moduleId: change.moduleId,
              canView: change.canView,
              canCreate: change.canCreate,
              canEdit: change.canEdit,
              canDelete: change.canDelete,
            },
            update: {
              canView: change.canView,
              canCreate: change.canCreate,
              canEdit: change.canEdit,
              canDelete: change.canDelete,
            },
          })
        }
      }
    })

    // Registrar auditoría
    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'PERMISSIONS_BATCH_UPDATE',
        entityType: 'RolePermission',
        entityId: 'batch',
        oldValues: currentPermissions.map(p => ({
          role: p.role.codigo,
          module: p.module.codigo,
          canView: p.canView,
          canCreate: p.canCreate,
          canEdit: p.canEdit,
          canDelete: p.canDelete,
        })),
        newValues: changes,
        status: 'SUCCESS',
      },
    })

    return NextResponse.json({
      success: true,
      message: `Se actualizaron ${changes.length} permisos correctamente`,
    })
  } catch (error) {
    console.error('[PUT /api/admin/permisos] Error:', error)

    if (error instanceof AdminError) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.statusCode }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
