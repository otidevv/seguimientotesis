import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/mis-evaluaciones/[id] - Detalle de tesis para jurado
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: thesisId } = await params
    const user = await getCurrentUser(request)

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar que el usuario es jurado de esta tesis
    const miJurado = await prisma.thesisJury.findFirst({
      where: { thesisId, userId: user.id, isActive: true },
    })

    if (!miJurado) {
      return NextResponse.json(
        { error: 'No eres jurado de esta tesis' },
        { status: 403 }
      )
    }

    const tesis = await prisma.thesis.findUnique({
      where: { id: thesisId, deletedAt: null },
      include: {
        autores: {
          include: {
            user: {
              select: {
                id: true,
                nombres: true,
                apellidoPaterno: true,
                apellidoMaterno: true,
                email: true,
              },
            },
          },
          orderBy: { orden: 'asc' },
        },
        asesores: {
          include: {
            user: {
              select: {
                id: true,
                nombres: true,
                apellidoPaterno: true,
                apellidoMaterno: true,
                email: true,
              },
            },
          },
        },
        documentos: {
          where: { esVersionActual: true },
          select: {
            id: true,
            tipo: true,
            nombre: true,
            rutaArchivo: true,
            mimeType: true,
            tamano: true,
            version: true,
            firmadoDigitalmente: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        jurados: {
          where: { isActive: true },
          include: {
            user: {
              select: {
                id: true,
                nombres: true,
                apellidoPaterno: true,
                apellidoMaterno: true,
              },
            },
            evaluaciones: {
              orderBy: { ronda: 'desc' },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!tesis) {
      return NextResponse.json({ error: 'Tesis no encontrada' }, { status: 404 })
    }

    // Verificar si el jurado actual ya evaluó en esta ronda
    const miEvalActual = miJurado
      ? await prisma.juryEvaluation.findFirst({
          where: {
            juryMemberId: miJurado.id,
            ronda: tesis.rondaActual,
          },
        })
      : null

    // Calcular progreso de evaluaciones de la ronda actual
    const juradosRequeridos = tesis.jurados.filter(
      (j) => ['PRESIDENTE', 'VOCAL', 'SECRETARIO'].includes(j.tipo)
    )
    const juradosQueEvaluaron = juradosRequeridos.filter((j) =>
      j.evaluaciones.some((e) => e.ronda === tesis.rondaActual)
    )
    const todosJuradosEvaluaron = juradosRequeridos.length > 0 &&
      juradosQueEvaluaron.length === juradosRequeridos.length

    // Verificar si ya existe dictamen para esta ronda
    const dictamenExistente = await prisma.thesisDocument.findFirst({
      where: {
        thesisId,
        tipo: 'DICTAMEN_JURADO',
        esVersionActual: true,
      },
    })

    const resultado = {
      id: tesis.id,
      titulo: tesis.titulo,
      resumen: tesis.resumen,
      palabrasClave: tesis.palabrasClave,
      estado: tesis.estado,
      lineaInvestigacion: tesis.lineaInvestigacion,
      rondaActual: tesis.rondaActual,
      faseActual: tesis.faseActual,
      fechaLimiteEvaluacion: tesis.fechaLimiteEvaluacion,
      fechaLimiteCorreccion: tesis.fechaLimiteCorreccion,
      autores: tesis.autores.map((a) => ({
        nombre: `${a.user.nombres} ${a.user.apellidoPaterno} ${a.user.apellidoMaterno}`,
        email: a.user.email,
      })),
      asesores: tesis.asesores.map((a) => ({
        nombre: `${a.user.nombres} ${a.user.apellidoPaterno} ${a.user.apellidoMaterno}`,
        tipo: a.tipo,
        email: a.user.email,
      })),
      documentos: tesis.documentos.map((d) => ({
        id: d.id,
        tipo: d.tipo,
        nombre: d.nombre,
        url: d.rutaArchivo,
        tamano: d.tamano,
        version: d.version,
      })),
      // Mi info como jurado
      miJurado: {
        id: miJurado.id,
        tipo: miJurado.tipo,
        fase: miJurado.fase,
        yaEvaluo: !!miEvalActual,
        miEvaluacion: miEvalActual ? {
          resultado: miEvalActual.resultado,
          observaciones: miEvalActual.observaciones,
          archivoUrl: miEvalActual.archivoUrl,
          fecha: miEvalActual.createdAt,
        } : null,
      },
      // Evaluaciones de otros jurados (solo visible si ya evalué)
      jurados: tesis.jurados.map((j) => {
        const evalActual = j.evaluaciones.find((e) => e.ronda === tesis.rondaActual)
        return {
          id: j.id,
          tipo: j.tipo,
          nombre: `${j.user.nombres} ${j.user.apellidoPaterno} ${j.user.apellidoMaterno}`,
          esMio: j.userId === user.id,
          // Solo mostrar evaluaciones de otros si el usuario ya evaluó
          evaluacion: miEvalActual && evalActual ? {
            resultado: evalActual.resultado,
            observaciones: evalActual.observaciones,
            archivoUrl: evalActual.archivoUrl,
            fecha: evalActual.createdAt,
          } : (j.userId === user.id && evalActual ? {
            resultado: evalActual.resultado,
            observaciones: evalActual.observaciones,
            archivoUrl: evalActual.archivoUrl,
            fecha: evalActual.createdAt,
          } : null),
          yaEvaluo: !!evalActual,
        }
      }),
      // Progreso de evaluacion
      progresoEvaluacion: {
        evaluados: juradosQueEvaluaron.length,
        total: juradosRequeridos.length,
        todosEvaluaron: todosJuradosEvaluaron,
        dictamenSubido: !!dictamenExistente,
      },
      // Historial de rondas anteriores
      rondasAnteriores: await prisma.juryEvaluation.findMany({
        where: {
          thesisId,
          ronda: { lt: tesis.rondaActual },
        },
        include: {
          juryMember: {
            include: {
              user: {
                select: {
                  nombres: true,
                  apellidoPaterno: true,
                },
              },
            },
          },
        },
        orderBy: [{ ronda: 'desc' }, { createdAt: 'asc' }],
      }),
    }

    return NextResponse.json({ success: true, data: resultado })
  } catch (error) {
    console.error('[GET /api/mis-evaluaciones/[id]] Error:', error)
    return NextResponse.json({ error: 'Error al obtener evaluacion' }, { status: 500 })
  }
}
