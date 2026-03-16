import { NextResponse } from 'next/server'
import { auditService } from '@/lib/admin/services/audit.service'

export async function GET() {
  try {
    const [actions, entityTypes] = await Promise.all([
      auditService.getActions(),
      auditService.getEntityTypes(),
    ])

    return NextResponse.json({
      success: true,
      data: { actions, entityTypes },
    })
  } catch (error) {
    console.error('[GET /api/admin/auditoria/metadata] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
