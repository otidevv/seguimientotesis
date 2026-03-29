import { NextRequest, NextResponse } from 'next/server'
import { roleService } from '@/lib/admin/services/role.service'
import { AdminError } from '@/lib/admin/types'
import { updatePermissionsSchema } from '@/lib/validators/role.schema'
import { requirePermission } from '@/lib/admin/require-permission'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requirePermission(request, 'permisos', 'view')
    if (auth instanceof NextResponse) return auth

    const { id } = await params
    const permissions = await roleService.getPermissions(id)

    return NextResponse.json({
      success: true,
      data: permissions,
    })
  } catch (error) {
    console.error('[GET /api/admin/roles/[id]/permissions] Error:', error)

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

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requirePermission(request, 'permisos', 'edit')
    if (auth instanceof NextResponse) return auth

    const { id } = await params
    const body = await request.json()
    const result = updatePermissionsSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: result.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const permissions = await roleService.updatePermissions(id, result.data, auth.userId)

    return NextResponse.json({
      success: true,
      data: permissions,
    })
  } catch (error) {
    console.error('[PUT /api/admin/roles/[id]/permissions] Error:', error)

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
