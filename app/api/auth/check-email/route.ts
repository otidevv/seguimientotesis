import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Verifica si un email ya está registrado. Lo usa el formulario de registro
 * para validación inline.
 *
 * Mitigaciones contra enumeración masiva (bug #2 de la auditoría):
 *   - Same-origin: rechaza requests cuyo Origin/Referer no coincida con la app.
 *     Bloquea curl masivo desde otros dominios; un atacante todavía puede usar
 *     el dominio propio, pero ya no es un endpoint enumerable desde fuera.
 *   - Jitter: 250–650 ms aleatorios. Reduce drásticamente la velocidad de
 *     enumeración sin afectar UX (un humano tipea y espera más que eso).
 *
 * Solución completa requiere rate limiting con store (Redis/BD) — pendiente
 * (bug #3 de la auditoría).
 */

function isSameOrigin(request: NextRequest): boolean {
  const host = request.headers.get('host')
  if (!host) return false

  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')

  // Si Origin está presente, debe coincidir con el host del request.
  if (origin) {
    try {
      return new URL(origin).host === host
    } catch {
      return false
    }
  }
  // Fallback: aceptar si el Referer apunta al mismo host. Algunos browsers
  // no envían Origin en GET/POST same-site.
  if (referer) {
    try {
      return new URL(referer).host === host
    } catch {
      return false
    }
  }
  return false
}

async function jitter(): Promise<void> {
  const ms = 250 + Math.floor(Math.random() * 400)
  await new Promise((resolve) => setTimeout(resolve, ms))
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Origen no permitido' }, { status: 403 })
  }

  await jitter()

  try {
    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email requerido' }, { status: 400 })
    }

    const existing = await prisma.user.findFirst({
      where: { email: email.toLowerCase() },
      select: { id: true },
    })

    return NextResponse.json({ exists: !!existing })
  } catch {
    return NextResponse.json({ exists: false })
  }
}
