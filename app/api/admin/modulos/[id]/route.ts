import { NextRequest, NextResponse } from 'next/server'
import { moduleService } from '@/lib/admin/services/module.service'
import { AdminError } from '@/lib/admin/types'
import { updateModuleSchema } from '@/lib/validators/module.schema'
import { requirePermission } from '@/lib/admin/require-permission'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requirePermission(request, 'modulos', 'view')
    if (auth instanceof NextResponse) return auth

    const { id } = await params
    const module = await moduleService.getById(id)

    return NextResponse.json({
      success: true,
      data: module,
    })
  } catch (error) {
    console.error('[GET /api/admin/modulos/[id]] Error:', error)

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
    const auth = await requirePermission(request, 'modulos', 'edit')
    if (auth instanceof NextResponse) return auth

    const { id } = await params
    const body = await request.json()
    const result = updateModuleSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: result.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const module = await moduleService.update(id, result.data, auth.userId)

    return NextResponse.json({
      success: true,
      data: module,
    })
  } catch (error) {
    console.error('[PUT /api/admin/modulos/[id]] Error:', error)

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

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requirePermission(request, 'modulos', 'delete')
    if (auth instanceof NextResponse) return auth

    const { id } = await params
    await moduleService.delete(id, auth.userId)

    return NextResponse.json({
      success: true,
      message: 'Módulo eliminado correctamente',
    })
  } catch (error) {
    console.error('[DELETE /api/admin/modulos/[id]] Error:', error)

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
