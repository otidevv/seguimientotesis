/**
 * Cron endpoint: avisa a jurados con plazo de evaluación próximo a vencer y
 * notifica a mesa-partes (resumen) de la facultad correspondiente.
 *
 * Ejecutar 1 vez al día desde el cron del sistema:
 *   0 8 * * 1-5 curl -fsS -H "Authorization: Bearer $CRON_SECRET" \
 *     http://localhost:3005/api/cron/jurado-recordatorios >> /var/log/cron-jurado.log 2>&1
 *
 * Idempotencia:
 *   - jurado_recordatorios   unique (jury_member_id, ronda, fase)
 *   - mesa_partes_recordatorios unique (thesis_id, ronda, fase)
 *   Reintentos en el mismo día son seguros — el unique lanza P2002 y se ignora.
 *
 * Robustez ante cron caído:
 * - DOS_DIAS_ANTES se envía si quedan ≤ 2 días hábiles y no ha vencido.
 * - DIA_LIMITE se envía si quedan ≤ 0 días hábiles (hoy es el día o ya pasó).
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { diasHabilesEntre } from '@/lib/business-days'
import { sendEmail } from '@/lib/email'
import { Prisma } from '@prisma/client'

type Fase = 'DOS_DIAS_ANTES' | 'DIA_LIMITE'

interface ResultadoEnvio {
  thesisId: string
  juryMemberId: string
  email: string
  fase: Fase
  ok: boolean
  motivo?: string
}

interface ResultadoMP {
  thesisId: string
  facultadId: string
  destinatarios: number
  fase: Fase
  ok: boolean
  motivo?: string
}

interface ResultadoEstudiante {
  thesisId: string
  thesisAuthorId: string
  email: string
  fase: Fase
  ok: boolean
  motivo?: string
}

export async function POST(request: NextRequest) {
  // --- Auth ---
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json(
      { error: 'CRON_SECRET no configurado en el servidor' },
      { status: 500 }
    )
  }
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const inicioEjecucion = new Date()
  const resultadosJurados: ResultadoEnvio[] = []
  const resultadosMP: ResultadoMP[] = []
  const resultadosEstudiantes: ResultadoEstudiante[] = []

  try {
    const tesisActivas = await prisma.thesis.findMany({
      where: {
        deletedAt: null,
        estado: { in: ['EN_EVALUACION_JURADO', 'EN_EVALUACION_INFORME'] },
        fechaLimiteEvaluacion: { not: null },
      },
      select: {
        id: true,
        titulo: true,
        estado: true,
        rondaActual: true,
        fechaLimiteEvaluacion: true,
        autores: {
          where: { orden: 1, estado: 'ACEPTADO' },
          select: {
            studentCareer: { select: { facultadId: true } },
          },
        },
        jurados: {
          where: { isActive: true },
          select: {
            id: true,
            fase: true,
            user: { select: { id: true, nombres: true, apellidoPaterno: true, email: true } },
            evaluaciones: { select: { ronda: true } },
          },
        },
      },
    })

    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)

    for (const tesis of tesisActivas) {
      if (!tesis.fechaLimiteEvaluacion) continue

      // Días hábiles desde hoy hasta la fecha límite (0 = hoy es el día límite, <0 = vencido)
      const limite = new Date(tesis.fechaLimiteEvaluacion)
      limite.setHours(0, 0, 0, 0)
      const diasRestantes = calcularDiasRestantes(hoy, limite)

      let fase: Fase | null = null
      if (diasRestantes <= 0) fase = 'DIA_LIMITE'
      else if (diasRestantes <= 2) fase = 'DOS_DIAS_ANTES'
      if (!fase) continue

      const faseJurado = tesis.estado === 'EN_EVALUACION_INFORME' ? 'INFORME_FINAL' : 'PROYECTO'
      const juradosFase = tesis.jurados.filter((j) => j.fase === faseJurado)

      // Quiénes siguen pendientes de evaluar la ronda actual
      const juradosPendientes = juradosFase.filter(
        (j) => !j.evaluaciones.some((e) => e.ronda === tesis.rondaActual)
      )
      if (juradosPendientes.length === 0) continue

      let huboAlertaJurado = false

      for (const j of juradosPendientes) {
        if (!j.user.email) continue

        try {
          await prisma.juradoRecordatorio.create({
            data: { juryMemberId: j.id, ronda: tesis.rondaActual, fase },
          })
        } catch (err) {
          if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
            continue // ya enviado en una ejecución previa
          }
          throw err
        }

        const nombreJurado = `${j.user.nombres} ${j.user.apellidoPaterno}`
        const tpl = buildTemplateJurado({
          nombreJurado,
          tituloTesis: tesis.titulo,
          fechaLimite: tesis.fechaLimiteEvaluacion,
          diasRestantes,
          fase,
          enlace: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3005'}/mis-evaluaciones`,
        })
        const ok = await sendEmail({ to: j.user.email, subject: tpl.subject, html: tpl.html, text: tpl.text })

        if (!ok) {
          await rollbackRecordatorio(
            () => prisma.juradoRecordatorio.deleteMany({
              where: { juryMemberId: j.id, ronda: tesis.rondaActual, fase },
            }),
            'jurado',
          )
        } else {
          huboAlertaJurado = true
        }

        resultadosJurados.push({
          thesisId: tesis.id,
          juryMemberId: j.id,
          email: j.user.email,
          fase,
          ok,
          motivo: ok ? undefined : 'sendEmail returned false',
        })
      }

      // --- Aviso a mesa-partes (resumen por tesis) ---
      // Solo si hubo alguna alerta efectiva a un jurado (evita ruido si todos
      // ya estaban avisados o no tenían email).
      if (!huboAlertaJurado) continue

      const facultadId = tesis.autores[0]?.studentCareer?.facultadId
      if (!facultadId) continue

      // Idempotencia mesa-partes: una sola fila por (tesis, ronda, fase)
      try {
        await prisma.mesaPartesRecordatorio.create({
          data: { thesisId: tesis.id, ronda: tesis.rondaActual, fase },
        })
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          continue
        }
        throw err
      }

      // Destinatarios mesa-partes de la facultad (incluye admins globales sin context)
      const mpRoles = await prisma.userRole.findMany({
        where: {
          role: { codigo: 'MESA_PARTES' },
          isActive: true,
          OR: [
            { contextType: 'FACULTAD', contextId: facultadId },
            { contextType: null },
          ],
        },
        select: { userId: true },
      })
      const userIds = [...new Set(mpRoles.map((r) => r.userId))]
      const mpUsers = await prisma.user.findMany({
        where: { id: { in: userIds }, isActive: true },
        select: { email: true, nombres: true, apellidoPaterno: true },
      })

      if (mpUsers.length === 0) {
        // Si no hay destinatarios, libero el slot para reintentar mañana
        await rollbackRecordatorio(
          () => prisma.mesaPartesRecordatorio.deleteMany({
            where: { thesisId: tesis.id, ronda: tesis.rondaActual, fase },
          }),
          'mesa-partes (sin destinatarios)',
        )
        continue
      }

      const tpl = buildTemplateMesaPartes({
        tituloTesis: tesis.titulo,
        fechaLimite: tesis.fechaLimiteEvaluacion,
        diasRestantes,
        fase,
        juradosPendientes: juradosPendientes.map(
          (j) => `${j.user.nombres} ${j.user.apellidoPaterno}`
        ),
        enlace: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3005'}/mesa-partes/${tesis.id}`,
      })

      let alMenosUnoOk = false
      for (const u of mpUsers) {
        if (!u.email) continue
        const ok = await sendEmail({ to: u.email, subject: tpl.subject, html: tpl.html, text: tpl.text })
        if (ok) alMenosUnoOk = true
      }

      // Si TODOS fallaron, libero el slot para reintentar mañana
      if (!alMenosUnoOk) {
        await rollbackRecordatorio(
          () => prisma.mesaPartesRecordatorio.deleteMany({
            where: { thesisId: tesis.id, ronda: tesis.rondaActual, fase },
          }),
          'mesa-partes (todos fallaron)',
        )
      }

      resultadosMP.push({
        thesisId: tesis.id,
        facultadId,
        destinatarios: mpUsers.length,
        fase,
        ok: alMenosUnoOk,
        motivo: alMenosUnoOk ? undefined : 'todos los envíos fallaron',
      })
    }

    // ============================================================
    // 2) ESTUDIANTES: tesis OBSERVADAS con plazo de corrección
    // ============================================================
    const tesisObservadas = await prisma.thesis.findMany({
      where: {
        deletedAt: null,
        estado: { in: ['OBSERVADA_JURADO', 'OBSERVADA_INFORME'] },
        fechaLimiteCorreccion: { not: null },
      },
      select: {
        id: true,
        titulo: true,
        estado: true,
        rondaActual: true,
        fechaLimiteCorreccion: true,
        autores: {
          where: { estado: 'ACEPTADO' },
          select: {
            id: true,
            user: { select: { nombres: true, apellidoPaterno: true, email: true } },
          },
        },
      },
    })

    for (const tesis of tesisObservadas) {
      if (!tesis.fechaLimiteCorreccion) continue

      const limite = new Date(tesis.fechaLimiteCorreccion)
      limite.setHours(0, 0, 0, 0)
      const diasRestantes = calcularDiasRestantes(hoy, limite)

      let fase: Fase | null = null
      if (diasRestantes <= 0) fase = 'DIA_LIMITE'
      else if (diasRestantes <= 2) fase = 'DOS_DIAS_ANTES'
      if (!fase) continue

      for (const autor of tesis.autores) {
        if (!autor.user.email) continue

        try {
          await prisma.estudianteRecordatorio.create({
            data: { thesisAuthorId: autor.id, ronda: tesis.rondaActual, fase },
          })
        } catch (err) {
          if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
            continue
          }
          throw err
        }

        const nombreEstudiante = `${autor.user.nombres} ${autor.user.apellidoPaterno}`
        const tpl = buildTemplateEstudiante({
          nombreEstudiante,
          tituloTesis: tesis.titulo,
          fechaLimite: tesis.fechaLimiteCorreccion,
          diasRestantes,
          fase,
          esInformeFinal: tesis.estado === 'OBSERVADA_INFORME',
          enlace: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3005'}/mis-tesis/${tesis.id}`,
        })
        const ok = await sendEmail({ to: autor.user.email, subject: tpl.subject, html: tpl.html, text: tpl.text })

        if (!ok) {
          await rollbackRecordatorio(
            () => prisma.estudianteRecordatorio.deleteMany({
              where: { thesisAuthorId: autor.id, ronda: tesis.rondaActual, fase },
            }),
            'estudiante',
          )
        }

        resultadosEstudiantes.push({
          thesisId: tesis.id,
          thesisAuthorId: autor.id,
          email: autor.user.email,
          fase,
          ok,
          motivo: ok ? undefined : 'sendEmail returned false',
        })
      }
    }

    return NextResponse.json({
      ok: true,
      ejecutadoAt: inicioEjecucion.toISOString(),
      duracionMs: Date.now() - inicioEjecucion.getTime(),
      jurados: {
        enviados: resultadosJurados.filter((r) => r.ok).length,
        fallidos: resultadosJurados.filter((r) => !r.ok).length,
        detalle: resultadosJurados,
      },
      mesaPartes: {
        enviados: resultadosMP.filter((r) => r.ok).length,
        fallidos: resultadosMP.filter((r) => !r.ok).length,
        detalle: resultadosMP,
      },
      estudiantes: {
        enviados: resultadosEstudiantes.filter((r) => r.ok).length,
        fallidos: resultadosEstudiantes.filter((r) => !r.ok).length,
        detalle: resultadosEstudiantes,
      },
    })
  } catch (error) {
    console.error('[Cron jurado-recordatorios] Error:', error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Error interno' },
      { status: 500 }
    )
  }
}

// Soporte GET para schedulers que solo emiten GET (curl por defecto es GET)
export async function GET(request: NextRequest) {
  return POST(request)
}

/**
 * Días hábiles entre `hoy` y `limite`, asumiendo ambos a las 00:00.
 *  - >0 si quedan días hábiles antes del límite
 *  - 0 si hoy es exactamente el día límite (todavía válido)
 *  - <0 si ya pasó el plazo (cuenta días hábiles vencidos como negativo)
 */
function calcularDiasRestantes(hoy: Date, limite: Date): number {
  if (limite.getTime() === hoy.getTime()) return 0
  if (limite > hoy) return diasHabilesEntre(hoy, limite)
  // Límite ya pasó: devolver cuántos días hábiles vencidos en negativo
  const vencidos = diasHabilesEntre(limite, hoy)
  return vencidos > 0 ? -vencidos : -1
}

/** Escapa caracteres especiales HTML para prevenir XSS al interpolar
 *  datos de DB en plantillas de email. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Rollback defensivo de un recordatorio. Si el delete falla (DB hiccup),
 *  log y continúa — no debe tumbar la respuesta del cron. */
async function rollbackRecordatorio(fn: () => Promise<unknown>, contexto: string): Promise<void> {
  try {
    await fn()
  } catch (err) {
    console.error(`[Cron rollback ${contexto}]`, err)
  }
}

interface TplJuradoArgs {
  nombreJurado: string
  tituloTesis: string
  fechaLimite: Date
  diasRestantes: number
  fase: Fase
  enlace: string
}

function buildTemplateJurado(args: TplJuradoArgs): { subject: string; html: string; text: string } {
  const fechaStr = args.fechaLimite.toLocaleDateString('es-PE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  const esLimite = args.fase === 'DIA_LIMITE'
  const tono = esLimite ? '#dc2626' : '#d97706'
  const titulo = esLimite
    ? args.diasRestantes < 0
      ? 'Plazo de evaluación VENCIDO'
      : 'Hoy vence el plazo de evaluación'
    : `Quedan ${args.diasRestantes} día${args.diasRestantes === 1 ? '' : 's'} hábil${args.diasRestantes === 1 ? '' : 'es'} para evaluar`

  const nombreSafe = escapeHtml(args.nombreJurado)
  const tituloTesisSafe = escapeHtml(args.tituloTesis)
  const enlaceSafe = escapeHtml(args.enlace)

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #111;">
      <div style="border-left: 4px solid ${tono}; padding-left: 16px; margin-bottom: 24px;">
        <h2 style="color: ${tono}; margin: 0 0 8px 0;">${titulo}</h2>
        <p style="margin: 0; color: #555;">Estimado/a ${nombreSafe},</p>
      </div>
      <p>Le recordamos que tiene una evaluación pendiente como jurado para la siguiente tesis:</p>
      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <div style="font-size: 13px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Tesis</div>
        <div style="font-size: 16px; font-weight: 600; margin-top: 4px;">${tituloTesisSafe}</div>
        <div style="font-size: 13px; color: #6b7280; margin-top: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Fecha límite</div>
        <div style="font-size: 15px; margin-top: 4px; text-transform: capitalize;">${fechaStr}</div>
      </div>
      <p style="margin-top: 24px;">
        <a href="${enlaceSafe}" style="background: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Ir a mis evaluaciones
        </a>
      </p>
      <p style="font-size: 12px; color: #9ca3af; margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
        Mensaje automático del sistema SeguiTesis UNAMAD. No responda a este correo.
      </p>
    </body>
    </html>
  `.trim()

  const text = `${titulo}

Estimado/a ${args.nombreJurado},

Tiene una evaluación pendiente como jurado para la tesis:
"${args.tituloTesis}"

Fecha límite: ${fechaStr}

Ingrese a sus evaluaciones: ${args.enlace}

— Sistema SeguiTesis UNAMAD (mensaje automático)
`

  const subject = esLimite
    ? `[URGENTE] ${args.diasRestantes < 0 ? 'Plazo vencido' : 'Hoy vence'} — Evaluación de tesis pendiente`
    : `Recordatorio: ${args.diasRestantes} día${args.diasRestantes === 1 ? '' : 's'} para evaluar tesis`

  return { subject, html, text }
}

interface TplMPArgs {
  tituloTesis: string
  fechaLimite: Date
  diasRestantes: number
  fase: Fase
  juradosPendientes: string[]
  enlace: string
}

function buildTemplateMesaPartes(args: TplMPArgs): { subject: string; html: string; text: string } {
  const fechaStr = args.fechaLimite.toLocaleDateString('es-PE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  const esLimite = args.fase === 'DIA_LIMITE'
  const tono = esLimite ? '#dc2626' : '#d97706'
  const tituloEstado = esLimite
    ? args.diasRestantes < 0
      ? `Plazo VENCIDO hace ${Math.abs(args.diasRestantes)} día${Math.abs(args.diasRestantes) === 1 ? '' : 's'}`
      : 'Hoy vence el plazo'
    : `Quedan ${args.diasRestantes} día${args.diasRestantes === 1 ? '' : 's'} hábil${args.diasRestantes === 1 ? '' : 'es'}`

  const listaJurados = args.juradosPendientes
    .map((n) => `<li style="padding: 4px 0;">${escapeHtml(n)}</li>`)
    .join('')
  const tituloTesisSafe = escapeHtml(args.tituloTesis)
  const enlaceSafe = escapeHtml(args.enlace)

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #111;">
      <div style="border-left: 4px solid ${tono}; padding-left: 16px; margin-bottom: 24px;">
        <h2 style="color: ${tono}; margin: 0 0 8px 0;">${tituloEstado} — evaluación de jurado</h2>
        <p style="margin: 0; color: #555;">Aviso a Mesa de Partes</p>
      </div>
      <p>Una tesis tiene jurados que aún no han registrado su evaluación dentro del plazo:</p>
      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <div style="font-size: 13px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Tesis</div>
        <div style="font-size: 16px; font-weight: 600; margin-top: 4px;">${tituloTesisSafe}</div>
        <div style="font-size: 13px; color: #6b7280; margin-top: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Fecha límite</div>
        <div style="font-size: 15px; margin-top: 4px; text-transform: capitalize;">${fechaStr}</div>
        <div style="font-size: 13px; color: #6b7280; margin-top: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Jurados pendientes (${args.juradosPendientes.length})</div>
        <ul style="margin: 8px 0 0 0; padding-left: 20px;">${listaJurados}</ul>
      </div>
      <p style="font-size: 13px; color: #555;">
        El sistema ya envió un recordatorio individual a cada jurado. Esta notificación es para que mesa-partes esté informada y pueda hacer seguimiento si corresponde.
      </p>
      <p style="margin-top: 24px;">
        <a href="${enlaceSafe}" style="background: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Ver expediente
        </a>
      </p>
      <p style="font-size: 12px; color: #9ca3af; margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
        Mensaje automático del sistema SeguiTesis UNAMAD. No responda a este correo.
      </p>
    </body>
    </html>
  `.trim()

  const text = `${tituloEstado} — evaluación de jurado

Aviso a Mesa de Partes:

Tesis: "${args.tituloTesis}"
Fecha límite: ${fechaStr}

Jurados pendientes (${args.juradosPendientes.length}):
${args.juradosPendientes.map((n) => `  • ${n}`).join('\n')}

Cada jurado ya recibió un recordatorio individual. Esta notificación es para que mesa-partes esté informada.

Expediente: ${args.enlace}

— Sistema SeguiTesis UNAMAD (mensaje automático)
`

  const subject = esLimite
    ? `[Mesa-Partes] ${args.diasRestantes < 0 ? 'Plazo VENCIDO' : 'Hoy vence'} — Tesis con jurados pendientes`
    : `[Mesa-Partes] Aviso: ${args.diasRestantes} día${args.diasRestantes === 1 ? '' : 's'} para evaluación de tesis`

  return { subject, html, text }
}

interface TplEstudianteArgs {
  nombreEstudiante: string
  tituloTesis: string
  fechaLimite: Date
  diasRestantes: number
  fase: Fase
  esInformeFinal: boolean
  enlace: string
}

function buildTemplateEstudiante(args: TplEstudianteArgs): { subject: string; html: string; text: string } {
  const fechaStr = args.fechaLimite.toLocaleDateString('es-PE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  const esLimite = args.fase === 'DIA_LIMITE'
  const tono = esLimite ? '#dc2626' : '#d97706'
  const documentoLabel = args.esInformeFinal ? 'informe final' : 'proyecto'
  const titulo = esLimite
    ? args.diasRestantes < 0
      ? 'Plazo de corrección VENCIDO'
      : 'Hoy vence el plazo para subir tus correcciones'
    : `Quedan ${args.diasRestantes} día${args.diasRestantes === 1 ? '' : 's'} hábil${args.diasRestantes === 1 ? '' : 'es'} para subir tus correcciones`

  const nombreSafe = escapeHtml(args.nombreEstudiante)
  const tituloTesisSafe = escapeHtml(args.tituloTesis)
  const enlaceSafe = escapeHtml(args.enlace)

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #111;">
      <div style="border-left: 4px solid ${tono}; padding-left: 16px; margin-bottom: 24px;">
        <h2 style="color: ${tono}; margin: 0 0 8px 0;">${titulo}</h2>
        <p style="margin: 0; color: #555;">Estimado/a ${nombreSafe},</p>
      </div>
      <p>Tu ${documentoLabel} fue <strong>observado por el jurado</strong> y debes subir las correcciones dentro del plazo establecido:</p>
      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <div style="font-size: 13px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Tesis</div>
        <div style="font-size: 16px; font-weight: 600; margin-top: 4px;">${tituloTesisSafe}</div>
        <div style="font-size: 13px; color: #6b7280; margin-top: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Fecha límite de corrección</div>
        <div style="font-size: 15px; margin-top: 4px; text-transform: capitalize;">${fechaStr}</div>
      </div>
      ${esLimite ? `
      <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 12px; margin: 16px 0; font-size: 14px; color: #991b1b;">
        <strong>${args.diasRestantes < 0 ? 'El plazo ya venció.' : 'Hoy es el último día.'}</strong> Si no presentas tus correcciones, mesa de partes podría rechazar tu ${documentoLabel}.
      </div>
      ` : ''}
      <p style="margin-top: 24px;">
        <a href="${enlaceSafe}" style="background: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Ir a mi tesis y subir correcciones
        </a>
      </p>
      <p style="font-size: 12px; color: #9ca3af; margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
        Mensaje automático del sistema SeguiTesis UNAMAD. No responda a este correo.
      </p>
    </body>
    </html>
  `.trim()

  const text = `${titulo}

Estimado/a ${args.nombreEstudiante},

Tu ${documentoLabel} fue observado por el jurado y debes subir las correcciones dentro del plazo:

Tesis: "${args.tituloTesis}"
Fecha límite de corrección: ${fechaStr}

${esLimite ? `${args.diasRestantes < 0 ? 'El plazo ya venció.' : 'Hoy es el último día.'} Si no presentas tus correcciones, mesa de partes podría rechazar tu ${documentoLabel}.\n\n` : ''}Sube tus correcciones aquí: ${args.enlace}

— Sistema SeguiTesis UNAMAD (mensaje automático)
`

  const subject = esLimite
    ? `[URGENTE] ${args.diasRestantes < 0 ? 'Plazo vencido' : 'Hoy vence'} — Sube las correcciones de tu ${documentoLabel}`
    : `Recordatorio: ${args.diasRestantes} día${args.diasRestantes === 1 ? '' : 's'} para subir correcciones de tu ${documentoLabel}`

  return { subject, html, text }
}
