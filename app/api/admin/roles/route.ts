import { NextRequest, NextResponse } from 'next/server'
import { roleService } from '@/lib/admin/services/role.service'
import { AdminError } from '@/lib/admin/types'
import { createRoleSchema, roleQuerySchema } from '@/lib/validators/role.schema'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Construir objeto solo con valores no nulos
    const rawQuery: Record<string, string> = {}
    const paramKeys = ['search', 'isActive', 'isSystem']

    for (const key of paramKeys) {
      const value = searchParams.get(key)
      if (value !== null) {
        rawQuery[key] = value
      }
    }

    const query = roleQuerySchema.safeParse(rawQuery)

    if (!query.success) {
      return NextResponse.json(
        { success: false, error: 'Parámetros inválidos', details: query.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const roles = await roleService.list(query.data)

    return NextResponse.json({
      success: true,
      data: roles,
    })
  } catch (error) {
    console.error('[GET /api/admin/roles] Error:', error)

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
    const result = createRoleSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: result.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const role = await roleService.create(result.data, adminId)

    return NextResponse.json({
      success: true,
      data: role,
    }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/admin/roles] Error:', error)

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
