import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/mesa-partes/[id]/jurados - Listar jurados asignados
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const user = await getCurrentUser(request)

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const tieneAcceso = user.roles?.some(
      (r) => ['MESA_PARTES', 'ADMIN', 'SUPER_ADMIN'].includes(r.role.codigo) && r.isActive
    )

    if (!tieneAcceso) {
      return NextResponse.json({ error: 'No tienes permisos' }, { status: 403 })
    }

    const jurados = await prisma.thesisJury.findMany({
      where: { thesisId: id, isActive: true },
      include: {
        user: {
          select: {
            id: true,
            nombres: true,
            apellidoPaterno: true,
            apellidoMaterno: true,
            email: true,
            numeroDocumento: true,
          },
        },
        evaluaciones: {
          orderBy: { ronda: 'desc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    const resultado = jurados.map((j) => ({
      id: j.id,
      tipo: j.tipo,
      fase: j.fase,
      userId: j.user.id,
      nombre: `${j.user.nombres} ${j.user.apellidoPaterno} ${j.user.apellidoMaterno}`,
      email: j.user.email,
      dni: j.user.numeroDocumento,
      evaluaciones: j.evaluaciones.map((e) => ({
        id: e.id,
        ronda: e.ronda,
        resultado: e.resultado,
        observaciones: e.observaciones,
        archivoUrl: e.archivoUrl,
        fecha: e.createdAt,
      })),
    }))

    return NextResponse.json({ success: true, data: resultado })
  } catch (error) {
    console.error('[GET /api/mesa-partes/[id]/jurados] Error:', error)
    return NextResponse.json({ error: 'Error al obtener jurados' }, { status: 500 })
  }
}

// POST /api/mesa-partes/[id]/jurados - Asignar un jurado
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const user = await getCurrentUser(request)

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const isMesaPartes = user.roles?.some(
      (r) => ['MESA_PARTES', 'ADMIN', 'SUPER_ADMIN'].includes(r.role.codigo) && r.isActive
    )

    if (!isMesaPartes) {
      return NextResponse.json({ error: 'No tienes permisos' }, { status: 403 })
    }

    // Verificar que la tesis está en estado ASIGNANDO_JURADOS
    const tesis = await prisma.thesis.findUnique({
      where: { id, deletedAt: null },
      include: {
        autores: { select: { userId: true } },
        asesores: { select: { userId: true } },
      },
    })

    if (!tesis) {
      return NextResponse.json({ error: 'Tesis no encontrada' }, { status: 404 })
    }

    const estadosPermitidos = ['ASIGNANDO_JURADOS', 'INFORME_FINAL']
    if (!estadosPermitidos.includes(tesis.estado)) {
      return NextResponse.json(
        { error: 'Solo se pueden asignar jurados en estado ASIGNANDO_JURADOS o INFORME_FINAL' },
        { status: 400 }
      )
    }

    // Determinar la fase según el estado
    const fase = tesis.estado === 'INFORME_FINAL' ? 'INFORME_FINAL' : 'PROYECTO'

    const body = await request.json()
    const { userId, tipo } = body

    if (!userId || !tipo) {
      return NextResponse.json(
        { error: 'Se requiere userId y tipo de jurado' },
        { status: 400 }
      )
    }

    const tiposValidos = ['PRESIDENTE', 'VOCAL', 'SECRETARIO', 'ACCESITARIO']
    if (!tiposValidos.includes(tipo)) {
      return NextResponse.json(
        { error: 'Tipo de jurado inválido' },
        { status: 400 }
      )
    }

    // Verificar que el usuario no sea autor o asesor de la tesis
    const esAutor = tesis.autores.some((a) => a.userId === userId)
    const esAsesor = tesis.asesores.some((a) => a.userId === userId)

    if (esAutor || esAsesor) {
      return NextResponse.json(
        { error: 'No se puede asignar como jurado a un autor o asesor de la tesis' },
        { status: 400 }
      )
    }

    // Verificar que no haya otro jurado con el mismo tipo (excepto ACCESITARIO)
    if (tipo !== 'ACCESITARIO') {
      const existeTipo = await prisma.thesisJury.findFirst({
        where: { thesisId: id, tipo, isActive: true, fase },
      })

      if (existeTipo) {
        return NextResponse.json(
          { error: `Ya existe un ${tipo.toLowerCase()} asignado` },
          { status: 400 }
        )
      }
    }

    // Verificar que el usuario no esté ya asignado como jurado
    const yaAsignado = await prisma.thesisJury.findFirst({
      where: { thesisId: id, userId, isActive: true, fase },
    })

    if (yaAsignado) {
      return NextResponse.json(
        { error: 'Este usuario ya está asignado como jurado' },
        { status: 400 }
      )
    }

    // Verificar que el usuario existe
    const userJurado = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, nombres: true, apellidoPaterno: true, apellidoMaterno: true },
    })

    if (!userJurado) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const jurado = await prisma.thesisJury.upsert({
      where: {
        thesisId_userId_fase: {
          thesisId: id,
          userId,
          fase,
        },
      },
      update: {
        tipo: tipo as any,
        isActive: true,
      },
      create: {
        thesisId: id,
        userId,
        tipo: tipo as any,
        fase,
      },
      include: {
        user: {
          select: {
            id: true,
            nombres: true,
            apellidoPaterno: true,
            apellidoMaterno: true,
            email: true,
            numeroDocumento: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      message: `${tipo} asignado exitosamente`,
      data: {
        id: jurado.id,
        tipo: jurado.tipo,
        nombre: `${jurado.user.nombres} ${jurado.user.apellidoPaterno} ${jurado.user.apellidoMaterno}`,
        email: jurado.user.email,
      },
    })
  } catch (error) {
    console.error('[POST /api/mesa-partes/[id]/jurados] Error:', error)
    return NextResponse.json({ error: 'Error al asignar jurado' }, { status: 500 })
  }
}

// DELETE /api/mesa-partes/[id]/jurados - Remover un jurado
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const user = await getCurrentUser(request)

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const isMesaPartes = user.roles?.some(
      (r) => ['MESA_PARTES', 'ADMIN', 'SUPER_ADMIN'].includes(r.role.codigo) && r.isActive
    )

    if (!isMesaPartes) {
      return NextResponse.json({ error: 'No tienes permisos' }, { status: 403 })
    }

    const tesis = await prisma.thesis.findUnique({
      where: { id, deletedAt: null },
    })

    if (!tesis) {
      return NextResponse.json({ error: 'Tesis no encontrada' }, { status: 404 })
    }

    const estadosPermitidosRemover = ['ASIGNANDO_JURADOS', 'INFORME_FINAL']
    if (!estadosPermitidosRemover.includes(tesis.estado)) {
      return NextResponse.json(
        { error: 'Solo se pueden remover jurados en estado ASIGNANDO_JURADOS o INFORME_FINAL' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { juradoId } = body

    if (!juradoId) {
      return NextResponse.json({ error: 'Se requiere juradoId' }, { status: 400 })
    }

    const jurado = await prisma.thesisJury.findFirst({
      where: { id: juradoId, thesisId: id, isActive: true },
    })

    if (!jurado) {
      return NextResponse.json({ error: 'Jurado no encontrado' }, { status: 404 })
    }

    await prisma.thesisJury.update({
      where: { id: juradoId },
      data: { isActive: false },
    })

    return NextResponse.json({
      success: true,
      message: 'Jurado removido exitosamente',
    })
  } catch (error) {
    console.error('[DELETE /api/mesa-partes/[id]/jurados] Error:', error)
    return NextResponse.json({ error: 'Error al remover jurado' }, { status: 500 })
  }
}
