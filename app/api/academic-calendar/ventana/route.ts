/**
 * GET /api/academic-calendar/ventana?tipo=...&thesisId=...
 *
 * Devuelve el estado de la ventana academica para un tramite. Usa el thesisId
 * para resolver la facultad (primer autor) y tambien para verificar overrides
 * especificos de la tesis o del usuario.
 *
 * Respuesta: { ventana: VentanaVigente | null }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getVentanaVigente, type WindowType } from '@/lib/academic-calendar'

const TIPOS_VALIDOS = [
  'PRESENTACION_PROYECTO',
  'REVISION_MESA_PARTES',
  'ASIGNACION_JURADOS',
  'EVALUACION_JURADO',
  'INFORME_FINAL',
  'SUSTENTACION',
  'DESISTIMIENTO',
] as const

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const tipo = searchParams.get('tipo') as WindowType | null
    const thesisId = searchParams.get('thesisId') ?? undefined

    if (!tipo || !TIPOS_VALIDOS.includes(tipo as (typeof TIPOS_VALIDOS)[number])) {
      return NextResponse.json({ error: 'Tipo de ventana invalido' }, { status: 400 })
    }

    // Resolver facultadId:
    //  1) Si hay thesisId, usa la facultad del primer autor (fuente de verdad).
    //  2) Si el usuario es mesa-partes con contexto FACULTAD, usa ese.
    //  3) Si es tesista, usa su studentCareer activo.
    //  4) Sino, null (global).
    let facultadId: string | null = null
    if (thesisId) {
      const autor = await prisma.thesisAuthor.findFirst({
        where: { thesisId, estado: 'ACEPTADO' },
        orderBy: { orden: 'asc' },
        include: { studentCareer: { select: { facultadId: true } } },
      })
      facultadId = autor?.studentCareer.facultadId ?? null
    } else {
      const rolMp = user.roles?.find(
        (r) => r.role.codigo === 'MESA_PARTES' && r.isActive && r.contextType === 'FACULTAD' && r.contextId,
      )
      if (rolMp?.contextId) {
        facultadId = rolMp.contextId
      } else {
        const sc = await prisma.studentCareer.findFirst({
          where: { userId: user.id, isActive: true },
          select: { facultadId: true },
        })
        facultadId = sc?.facultadId ?? null
      }
    }

    const ventana = await getVentanaVigente(tipo, facultadId, {
      thesisId,
      userId: user.id,
    })

    return NextResponse.json({ ventana })
  } catch (error) {
    console.error('[GET /api/academic-calendar/ventana]', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
