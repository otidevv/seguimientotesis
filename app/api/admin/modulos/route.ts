import { NextRequest, NextResponse } from 'next/server'
import { moduleService } from '@/lib/admin/services/module.service'
import { AdminError } from '@/lib/admin/types'
import { createModuleSchema, moduleQuerySchema } from '@/lib/validators/module.schema'
import { requirePermission } from '@/lib/admin/require-permission'

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'modulos', 'view')
    if (auth instanceof NextResponse) return auth

    const { searchParams } = new URL(request.url)

    const rawQuery: Record<string, string> = {}
    const paramKeys = ['search', 'isActive', 'parentId']

    for (const key of paramKeys) {
      const value = searchParams.get(key)
      if (value !== null) {
        rawQuery[key] = value
      }
    }

    const query = moduleQuerySchema.safeParse(rawQuery)

    if (!query.success) {
      return NextResponse.json(
        { success: false, error: 'Parámetros inválidos', details: query.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const modules = await moduleService.list(query.data)

    return NextResponse.json({
      success: true,
      data: modules,
    })
  } catch (error) {
    console.error('[GET /api/admin/modulos] Error:', error)

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

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'modulos', 'create')
    if (auth instanceof NextResponse) return auth

    const body = await request.json()
    const result = createModuleSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: result.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const module = await moduleService.create(result.data, auth.userId)

    return NextResponse.json({
      success: true,
      data: module,
    }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/admin/modulos] Error:', error)

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
