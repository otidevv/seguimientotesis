import { NextRequest, NextResponse } from 'next/server'
import { roleService } from '@/lib/admin/services/role.service'
import { AdminError } from '@/lib/admin/types'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const adminId = request.headers.get('x-user-id')

    if (!adminId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    const { id } = await params
    const role = await roleService.toggleActive(id, adminId)

    return NextResponse.json({
      success: true,
      data: role,
    })
  } catch (error) {
    console.error('[POST /api/admin/roles/[id]/toggle-active] Error:', error)

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
