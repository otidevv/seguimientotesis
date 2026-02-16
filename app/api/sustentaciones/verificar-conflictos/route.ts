import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

const DURACION_SUSTENTACION_MS = 2 * 60 * 60 * 1000 // 2 horas en ms

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const fecha = searchParams.get('fecha')
    const hora = searchParams.get('hora')
    const lugar = searchParams.get('lugar')
    const thesisId = searchParams.get('thesisId') // Para excluir la tesis actual

    if (!fecha || !hora) {
      return NextResponse.json({ error: 'Fecha y hora son requeridas' }, { status: 400 })
    }

    const inicioNueva = new Date(`${fecha}T${hora}:00`)
    const finNueva = new Date(inicioNueva.getTime() + DURACION_SUSTENTACION_MS)

    if (isNaN(inicioNueva.getTime())) {
      return NextResponse.json({ error: 'Fecha u hora inválida' }, { status: 400 })
    }

    // Buscar sustentaciones en el mismo día
    const inicioDia = new Date(`${fecha}T00:00:00`)
    const finDia = new Date(`${fecha}T23:59:59`)

    const sustentacionesDelDia = await prisma.thesis.findMany({
      where: {
        deletedAt: null,
        estado: { in: ['EN_SUSTENTACION', 'SUSTENTADA'] },
        fechaSustentacion: {
          gte: inicioDia,
          lte: finDia,
        },
        ...(thesisId ? { id: { not: thesisId } } : {}),
      },
      select: {
        id: true,
        titulo: true,
        fechaSustentacion: true,
        lugarSustentacion: true,
        modalidadSustentacion: true,
        jurados: {
          where: { isActive: true },
          select: {
            userId: true,
            tipo: true,
            user: {
              select: {
                nombres: true,
                apellidoPaterno: true,
              },
            },
          },
        },
      },
    })

    const conflictos: {
      tipo: 'LUGAR' | 'JURADO' | 'HORARIO'
      mensaje: string
      tesis: string
      horaInicio: string
      horaFin: string
    }[] = []

    // Obtener jurados de la tesis actual (si se proporciona thesisId)
    let juradosActuales: string[] = []
    if (thesisId) {
      const jurados = await prisma.thesisJury.findMany({
        where: { thesisId, isActive: true },
        select: { userId: true },
      })
      juradosActuales = jurados.map(j => j.userId)
    }

    for (const sust of sustentacionesDelDia) {
      if (!sust.fechaSustentacion) continue

      const inicioExistente = new Date(sust.fechaSustentacion)
      const finExistente = new Date(inicioExistente.getTime() + DURACION_SUSTENTACION_MS)

      // Verificar si hay solapamiento de horarios
      const haySolapamiento = inicioNueva < finExistente && finNueva > inicioExistente

      if (!haySolapamiento) continue

      const horaInicioStr = inicioExistente.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false })
      const horaFinStr = finExistente.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false })
      const tituloCorto = sust.titulo.length > 60 ? sust.titulo.substring(0, 60) + '...' : sust.titulo

      // Conflicto por lugar
      if (lugar && sust.lugarSustentacion &&
        sust.lugarSustentacion.toLowerCase().trim() === lugar.toLowerCase().trim()) {
        conflictos.push({
          tipo: 'LUGAR',
          mensaje: `El lugar "${lugar}" ya tiene una sustentación programada de ${horaInicioStr} a ${horaFinStr}`,
          tesis: tituloCorto,
          horaInicio: horaInicioStr,
          horaFin: horaFinStr,
        })
      }

      // Conflicto por jurado
      if (juradosActuales.length > 0) {
        for (const jurado of sust.jurados) {
          if (juradosActuales.includes(jurado.userId)) {
            const nombreJurado = `${jurado.user.nombres} ${jurado.user.apellidoPaterno}`
            conflictos.push({
              tipo: 'JURADO',
              mensaje: `El jurado ${nombreJurado} (${jurado.tipo}) ya tiene otra sustentación de ${horaInicioStr} a ${horaFinStr}`,
              tesis: tituloCorto,
              horaInicio: horaInicioStr,
              horaFin: horaFinStr,
            })
          }
        }
      }
    }

    // También listar todas las sustentaciones del día para referencia
    const sustentacionesDia = sustentacionesDelDia.map(s => {
      const inicio = new Date(s.fechaSustentacion!)
      const fin = new Date(inicio.getTime() + DURACION_SUSTENTACION_MS)
      return {
        titulo: s.titulo.length > 60 ? s.titulo.substring(0, 60) + '...' : s.titulo,
        horaInicio: inicio.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false }),
        horaFin: fin.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false }),
        lugar: s.lugarSustentacion,
        modalidad: s.modalidadSustentacion,
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        conflictos,
        hayConflictos: conflictos.length > 0,
        sustentacionesDia: sustentacionesDia,
        horaInicio: hora,
        horaFin: finNueva.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false }),
      },
    })
  } catch (error) {
    console.error('[GET /api/sustentaciones/verificar-conflictos] Error:', error)
    return NextResponse.json({ error: 'Error al verificar conflictos' }, { status: 500 })
  }
}
