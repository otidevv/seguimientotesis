import { NextRequest, NextResponse } from 'next/server'
import { moduleService } from '@/lib/admin/services/module.service'
import { AdminError } from '@/lib/admin/types'
import { requirePermission } from '@/lib/admin/require-permission'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requirePermission(request, 'modulos', 'edit')
    if (auth instanceof NextResponse) return auth

    const { id } = await params
    const module = await moduleService.toggleActive(id, auth.userId)

    return NextResponse.json({
      success: true,
      data: module,
    })
  } catch (error) {
    console.error('[POST /api/admin/modulos/[id]/toggle-active] Error:', error)

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
