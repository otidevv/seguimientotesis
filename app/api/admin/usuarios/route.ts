import { NextRequest, NextResponse } from 'next/server'
import { userService } from '@/lib/admin/services/user.service'
import { AdminError } from '@/lib/admin/types'
import { createUserSchema, userQuerySchema } from '@/lib/validators/user.schema'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Construir objeto solo con valores no nulos
    const rawQuery: Record<string, string> = {}
    const paramKeys = ['page', 'limit', 'search', 'tipoUsuario', 'isActive', 'roleId', 'sortBy', 'sortOrder']

    for (const key of paramKeys) {
      const value = searchParams.get(key)
      if (value !== null) {
        rawQuery[key] = value
      }
    }

    const query = userQuerySchema.safeParse(rawQuery)

    if (!query.success) {
      return NextResponse.json(
        { success: false, error: 'Parámetros inválidos', details: query.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const result = await userService.list(query.data)

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error('[GET /api/admin/usuarios] Error:', error)

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
    const adminId = request.headers.get('x-user-id')

    if (!adminId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const result = createUserSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: result.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const user = await userService.create(result.data, adminId)

    return NextResponse.json({
      success: true,
      data: user,
    }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/admin/usuarios] Error:', error)

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
