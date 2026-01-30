import { NextResponse } from 'next/server'
import { roleService } from '@/lib/admin/services/role.service'

export async function GET() {
  try {
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
