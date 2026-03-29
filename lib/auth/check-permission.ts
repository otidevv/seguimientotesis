import { prisma } from '@/lib/prisma'

type PermissionAction = 'view' | 'create' | 'edit' | 'delete'

/**
 * Verifica si un usuario tiene un permiso específico sobre un módulo.
 * Consulta directamente la BD (RolePermission → Role → UserRole).
 *
 * Uso en API routes:
 *   const puede = await checkPermission(userId, 'tesis', 'view')
 *   if (!puede) return NextResponse.json({ error: '...' }, { status: 403 })
 */
export async function checkPermission(
  userId: string,
  moduleCode: string,
  action: PermissionAction
): Promise<boolean> {
  const actionField = {
    view: 'canView',
    create: 'canCreate',
    edit: 'canEdit',
    delete: 'canDelete',
  }[action] as 'canView' | 'canCreate' | 'canEdit' | 'canDelete'

  const permission = await prisma.rolePermission.findFirst({
    where: {
      role: {
        users: {
          some: {
            userId,
            isActive: true,
          },
        },
      },
      module: {
        codigo: moduleCode,
        isActive: true,
      },
      [actionField]: true,
    },
  })

  return !!permission
}
