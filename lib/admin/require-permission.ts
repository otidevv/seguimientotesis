import { NextRequest, NextResponse } from 'next/server'
import { checkPermission } from '@/lib/auth/check-permission'

type PermissionAction = 'view' | 'create' | 'edit' | 'delete'

interface AuthResult {
  userId: string
}

/**
 * Verifica que el usuario autenticado tiene permisos sobre un módulo admin.
 * Retorna AuthResult si tiene permiso, o NextResponse 401/403 si no.
 *
 * Uso:
 *   const auth = await requirePermission(request, 'usuarios', 'create')
 *   if (auth instanceof NextResponse) return auth
 *   const { userId } = auth
 */
export async function requirePermission(
  request: NextRequest,
  moduleCode: string,
  action: PermissionAction
): Promise<AuthResult | NextResponse> {
  const userId = request.headers.get('x-user-id')

  if (!userId) {
    return NextResponse.json(
      { success: false, error: 'No autorizado' },
      { status: 401 }
    )
  }

  // SUPER_ADMIN siempre tiene acceso total
  const rolesHeader = request.headers.get('x-user-roles')
  const roles: string[] = rolesHeader ? JSON.parse(rolesHeader) : []

  if (roles.includes('SUPER_ADMIN')) {
    return { userId }
  }

  const has = await checkPermission(userId, moduleCode, action)

  if (!has) {
    return NextResponse.json(
      { success: false, error: 'No tienes permisos para esta acción' },
      { status: 403 }
    )
  }

  return { userId }
}
