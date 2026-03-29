import { NextRequest, NextResponse } from 'next/server'
import { roleService } from '@/lib/admin/services/role.service'
import { requirePermission } from '@/lib/admin/require-permission'

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'permisos', 'view')
    if (auth instanceof NextResponse) return auth
    const modules = await roleService.getModules()

    return NextResponse.json({
      success: true,
      data: modules,
    })
  } catch (error) {
    console.error('[GET /api/admin/modules] Error:', error)

    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
