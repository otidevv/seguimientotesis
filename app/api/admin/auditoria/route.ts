import { NextRequest, NextResponse } from 'next/server'
import { auditService } from '@/lib/admin/services/audit.service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const query = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
      search: searchParams.get('search') || undefined,
      action: searchParams.get('action') || undefined,
      entityType: searchParams.get('entityType') || undefined,
      status: searchParams.get('status') || undefined,
      userId: searchParams.get('userId') || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      sortBy: searchParams.get('sortBy') || undefined,
      sortOrder: searchParams.get('sortOrder') || undefined,
    }

    if (isNaN(query.page) || query.page < 1) query.page = 1
    if (isNaN(query.limit) || query.limit < 1) query.limit = 20
    if (query.limit > 100) query.limit = 100

    const result = await auditService.list(query)

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error('[GET /api/admin/auditoria] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
