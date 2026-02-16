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
    // Si se pasa juradoId, usar ese registro específico (permite ver por fase)
    const { searchParams } = new URL(request.url)
    const juradoId = searchParams.get('juradoId')

    const miJurado = juradoId
      ? await prisma.thesisJury.findFirst({
          where: { id: juradoId, thesisId, userId: user.id, isActive: true },
        })
      : await prisma.thesisJury.findFirst({
          where: { thesisId, userId: user.id, isActive: true },
          orderBy: { createdAt: 'desc' }, // Preferir el más reciente (INFORME_FINAL)
        })

    if (!miJurado) {
      return NextResponse.json(
        { error: 'No eres jurado de esta tesis' },
        { status: 403 }
      )
    }

    const faseJurado = miJurado.fase

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
          where: {
            esVersionActual: true,
            // Solo mostrar el documento principal que el jurado debe evaluar
            ...(faseJurado === 'PROYECTO' ? {
              tipo: 'PROYECTO',
            } : faseJurado === 'INFORME_FINAL' ? {
              tipo: 'INFORME_FINAL_DOC',
            } : {}),
          },
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
          where: { isActive: true, fase: faseJurado },
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

    // Determinar si la fase del jurado ya terminó
    const faseTerminada = faseJurado === 'PROYECTO' && (
      tesis.faseActual === 'INFORME_FINAL' ||
      ['INFORME_FINAL', 'EN_EVALUACION_INFORME', 'OBSERVADA_INFORME', 'APROBADA'].includes(tesis.estado)
    )

    // Verificar si el jurado actual ya evaluó
    // Para fases terminadas, buscar la última evaluación; para activas, buscar la de rondaActual
    const miEvalActual = miJurado
      ? await prisma.juryEvaluation.findFirst({
          where: {
            juryMemberId: miJurado.id,
            ...(faseTerminada ? {} : { ronda: tesis.rondaActual }),
          },
          orderBy: { ronda: 'desc' },
        })
      : null

    // Calcular progreso de evaluaciones (solo para la fase del jurado)
    const juradosRequeridos = tesis.jurados.filter(
      (j) => ['PRESIDENTE', 'VOCAL', 'SECRETARIO'].includes(j.tipo)
    )

    // Para fases terminadas, buscar la última ronda evaluada; para activas, usar rondaActual
    const rondaParaProgreso = faseTerminada
      ? (miEvalActual?.ronda || 1)
      : tesis.rondaActual

    const juradosQueEvaluaron = juradosRequeridos.filter((j) =>
      j.evaluaciones.some((e) => e.ronda === rondaParaProgreso)
    )
    const todosJuradosEvaluaron = juradosRequeridos.length > 0 &&
      juradosQueEvaluaron.length === juradosRequeridos.length

    // Verificar si ya existe dictamen para la fase actual
    // Usamos la fecha de la última transición al estado de evaluación actual para filtrar
    let dictamenExistente = null
    if (!faseTerminada) {
      const estadoEvaluacion = faseJurado === 'INFORME_FINAL' ? 'EN_EVALUACION_INFORME' : 'EN_EVALUACION_JURADO'
      const transicionFase = await prisma.thesisStatusHistory.findFirst({
        where: { thesisId, estadoNuevo: estadoEvaluacion },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      })

      dictamenExistente = await prisma.thesisDocument.findFirst({
        where: {
          thesisId,
          tipo: 'DICTAMEN_JURADO',
          esVersionActual: true,
          ...(transicionFase ? { createdAt: { gte: transicionFase.createdAt } } : {}),
        },
      })
    }

    const resultado = {
      id: tesis.id,
      titulo: tesis.titulo,
      resumen: tesis.resumen,
      palabrasClave: tesis.palabrasClave,
      estado: faseTerminada ? 'PROYECTO_APROBADO' : tesis.estado,
      lineaInvestigacion: tesis.lineaInvestigacion,
      rondaActual: faseTerminada ? rondaParaProgreso : tesis.rondaActual,
      faseActual: tesis.faseActual,
      faseTerminada,
      fechaLimiteEvaluacion: faseTerminada ? null : tesis.fechaLimiteEvaluacion,
      fechaLimiteCorreccion: faseTerminada ? null : tesis.fechaLimiteCorreccion,
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
        const evalActual = faseTerminada
          ? (j.evaluaciones.length > 0 ? j.evaluaciones[0] : null) // última evaluación
          : j.evaluaciones.find((e) => e.ronda === tesis.rondaActual)
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
        // Resultado por unanimidad: todos deben aprobar (solo cuando todos evaluaron)
        resultadoMayoria: todosJuradosEvaluaron ? (() => {
          const evaluacionesRonda = juradosRequeridos
            .map((j) => j.evaluaciones.find((e) => e.ronda === rondaParaProgreso))
            .filter(Boolean)
          const observados = evaluacionesRonda.filter((e) => e!.resultado === 'OBSERVADO').length
          return observados === 0 ? 'APROBADO' : 'OBSERVADO'
        })() : null,
      },
      // Historial de rondas anteriores (solo de la fase actual)
      rondasAnteriores: await prisma.juryEvaluation.findMany({
        where: {
          thesisId,
          ronda: { lt: tesis.rondaActual },
          juryMember: { fase: faseJurado },
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
