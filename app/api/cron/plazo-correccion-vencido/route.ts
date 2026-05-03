/**
 * Cron endpoint: detecta tesis con plazo de corrección VENCIDO en fase
 * de gestión de proyecto y las marca como RECHAZADA.
 *
 * Reglamento UNAMAD: si el tesista no subsana las observaciones dentro
 * del plazo (incluso con la ampliación de 30 días), el trámite se reinicia.
 * El estudiante debe registrar una nueva tesis desde cero.
 *
 * Solo aplica a fase de PROYECTO. Estados elegibles:
 *   - OBSERVADA          (mesa de partes observó proyecto)
 *   - OBSERVADA_JURADO   (jurado observó proyecto)
 *
 * NO aplica a fase de informe final (OBSERVADA_INFORME) — ahí el tesista
 * ya tiene proyecto aprobado y meses de investigación; el rechazo
 * automático sería desproporcionado. Esos casos requieren intervención
 * manual de mesa de partes / comisión.
 *
 * Idempotencia: solo afecta a tesis con estado en la lista elegible.
 * Re-ejecuciones del cron no afectan tesis ya RECHAZADAS.
 *
 * Ejecución sugerida: 1 vez al día (08:00 hora Lima):
 *   0 8 * * 1-5 curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" \
 *     http://localhost:3005/api/cron/plazo-correccion-vencido
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import { crearNotificacion } from '@/lib/notificaciones'
import { buildAutoRechazoComentario } from '@/lib/thesis/auto-rechazo'

const ESTADOS_ELEGIBLES = ['OBSERVADA', 'OBSERVADA_JURADO'] as const

interface ResultadoVencimiento {
  thesisId: string
  codigo: string
  titulo: string
  estadoAnterior: string
  fechaLimite: string
  emailTesista: string | null
  notificadoOk: boolean
  emailOk: boolean
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export async function POST(request: NextRequest) {
  // Verificación obligatoria del secret. Si no está configurado, el endpoint
  // queda inutilizable — preferible que un cron mal configurado falle a que
  // quede expuesto públicamente, ya que rechaza tesis.
  const expectedSecret = process.env.CRON_SECRET
  if (!expectedSecret) {
    return NextResponse.json(
      { error: 'CRON_SECRET no configurado en el servidor' },
      { status: 500 },
    )
  }
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const ahora = new Date()
  const resultados: ResultadoVencimiento[] = []
  let errores = 0

  try {
    const tesisVencidas = await prisma.thesis.findMany({
      where: {
        deletedAt: null,
        estado: { in: [...ESTADOS_ELEGIBLES] },
        fechaLimiteCorreccion: { lt: ahora },
      },
      select: {
        id: true,
        titulo: true,
        estado: true,
        fechaLimiteCorreccion: true,
        autores: {
          where: { estado: 'ACEPTADO' },
          select: {
            userId: true,
            user: { select: { nombres: true, apellidoPaterno: true, apellidoMaterno: true, email: true } },
            studentCareer: {
              select: { facultad: { select: { codigo: true, nombre: true } } },
            },
          },
        },
      },
    })

    console.log(`[cron plazo-vencido] ${tesisVencidas.length} tesis con plazo vencido detectadas`)

    // ChangedById es requerido en thesisStatusHistory. Usamos el primer
    // SUPER_ADMIN como ejecutor de cambios sistémicos, manteniendo el audit trail.
    const sysUser = await prisma.user.findFirst({
      where: {
        roles: { some: { isActive: true, role: { codigo: 'SUPER_ADMIN' } } },
      },
      select: { id: true },
    })
    if (!sysUser) {
      return NextResponse.json(
        { ok: false, error: 'No hay usuario SUPER_ADMIN para registrar la auditoría del cambio.' },
        { status: 500 },
      )
    }

    for (const tesis of tesisVencidas) {
      try {
        // Transacción: cambiar estado + history + (mantener fechaLimite como auditoría histórica)
        await prisma.$transaction([
          prisma.thesis.update({
            where: { id: tesis.id },
            data: {
              estado: 'RECHAZADA',
              // Limpiamos fechaLimiteCorreccion: ya no aplica, la tesis está cerrada.
              fechaLimiteCorreccion: null,
            },
          }),
          prisma.thesisStatusHistory.create({
            data: {
              thesisId: tesis.id,
              estadoAnterior: tesis.estado,
              estadoNuevo: 'RECHAZADA',
              comentario: buildAutoRechazoComentario(tesis.fechaLimiteCorreccion!),
              changedById: sysUser.id,
            },
          }),
        ])

        // Notificar a cada autor activo
        let notificadoOk = false
        let emailOk = false
        let emailTesista: string | null = null

        for (const autor of tesis.autores) {
          if (!autor.user.email) continue
          emailTesista = autor.user.email
          const facCodigo = autor.studentCareer.facultad?.codigo ?? 'FI'

          // Notificación in-app
          try {
            await crearNotificacion({
              userId: autor.userId,
              tipo: 'TESIS_OBSERVADA',
              titulo: 'Trámite cerrado por vencimiento de plazo',
              mensaje: `Tu tesis "${tesis.titulo}" fue rechazada por vencimiento del plazo de subsanación. Puedes registrar una nueva tesis o solicitar reapertura excepcional a mesa de partes.`,
              enlace: `/mis-tesis`,
            })
            notificadoOk = true
          } catch (e) {
            console.error('[cron plazo-vencido] error notificando in-app:', e)
          }

          // Email
          try {
            const nombreCompleto = `${autor.user.nombres} ${autor.user.apellidoPaterno} ${autor.user.apellidoMaterno ?? ''}`.trim()
            const tituloEsc = escapeHtml(tesis.titulo)
            const subject = '[UNAMAD] Trámite de tesis cerrado por vencimiento de plazo'
            const html = `
              <h2>Trámite cerrado</h2>
              <p>Hola ${escapeHtml(nombreCompleto)},</p>
              <p>El plazo para subsanar las observaciones de tu tesis <b>"${tituloEsc}"</b> venció el
                <b>${tesis.fechaLimiteCorreccion!.toLocaleDateString('es-PE', { timeZone: 'America/Lima' })}</b>
                sin que se hayan presentado las correcciones.</p>
              <p>Conforme al reglamento, el trámite se ha cerrado automáticamente y la tesis pasó a estado <b>RECHAZADA</b>.</p>
              <h3>¿Qué puedes hacer?</h3>
              <ul>
                <li><b>Iniciar trámite nuevo</b>: registra una nueva tesis desde tu panel
                  (<a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/mis-tesis/nuevo">/mis-tesis/nuevo</a>).
                  Necesitarás un nuevo voucher de pago.</li>
                <li><b>Solicitar reapertura excepcional</b>: si tu retraso fue por una causa de fuerza mayor
                  (enfermedad, accidente, error administrativo), acércate a mesa de partes con la documentación
                  sustentatoria. Mesa de partes puede reabrir el trámite con un nuevo plazo.</li>
              </ul>
              <p style="color: #666; font-size: 12px; margin-top: 32px;">
                Sistema de Seguimiento de Tesis — Facultad ${facCodigo}
              </p>
            `
            const text = `Trámite cerrado por vencimiento.\n\nHola ${nombreCompleto},\n\nEl plazo para subsanar tu tesis "${tesis.titulo}" venció el ${tesis.fechaLimiteCorreccion!.toLocaleDateString('es-PE', { timeZone: 'America/Lima' })}. Tu tesis pasó a estado RECHAZADA.\n\n¿Qué hacer?\n- Iniciar trámite nuevo: registra otra tesis (necesitarás voucher nuevo).\n- Solicitar reapertura: si fue fuerza mayor, acércate a mesa de partes.\n\n${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/mis-tesis`
            emailOk = await sendEmail({ to: autor.user.email, subject, html, text })
          } catch (e) {
            console.error('[cron plazo-vencido] error email:', e)
          }
        }

        resultados.push({
          thesisId: tesis.id,
          codigo: tesis.id.slice(-8),
          titulo: tesis.titulo,
          estadoAnterior: tesis.estado,
          fechaLimite: tesis.fechaLimiteCorreccion!.toISOString(),
          emailTesista,
          notificadoOk,
          emailOk,
        })
      } catch (e) {
        errores++
        console.error(`[cron plazo-vencido] error procesando tesis ${tesis.id}:`, e)
      }
    }

    return NextResponse.json({
      ok: true,
      procesadas: resultados.length,
      errores,
      resultados,
    })
  } catch (error) {
    console.error('[cron plazo-vencido] error fatal:', error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 },
    )
  }
}
