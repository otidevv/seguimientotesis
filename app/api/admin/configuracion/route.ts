import { NextRequest, NextResponse } from 'next/server'
import { settingsService } from '@/lib/admin/services/settings.service'

export async function GET() {
  try {
    const configs = await settingsService.getAll()

    // Agrupar por categoría
    const grouped: Record<string, typeof configs> = {}
    for (const config of configs) {
      if (!grouped[config.category]) {
        grouped[config.category] = []
      }
      grouped[config.category].push(config)
    }

    return NextResponse.json({
      success: true,
      data: grouped,
    })
  } catch (error) {
    console.error('[GET /api/admin/configuracion] Error:', error)
    const message = error instanceof Error ? error.message : 'Error interno del servidor'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const adminId = request.headers.get('x-user-id')

    if (!adminId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()

    if (!body.updates || !Array.isArray(body.updates)) {
      return NextResponse.json(
        { success: false, error: 'Formato inválido: se espera { updates: [{ key, value }] }' },
        { status: 400 }
      )
    }

    // Validar que cada update tenga key y value
    for (const update of body.updates) {
      if (!update.key || update.value === undefined || update.value === null) {
        return NextResponse.json(
          { success: false, error: `Entrada inválida: cada item necesita key y value` },
          { status: 400 }
        )
      }
    }

    const results = await settingsService.updateMany(
      body.updates.map((u: { key: string; value: string }) => ({
        key: u.key,
        value: String(u.value),
      })),
      adminId
    )

    return NextResponse.json({
      success: true,
      data: results,
    })
  } catch (error) {
    console.error('[PUT /api/admin/configuracion] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
