import { NextResponse } from 'next/server'

// GONE: este endpoint fue sustituido por /api/tesis/[id]/desistir/solicitar
// con flujo de aprobación por mesa de partes.
// Ver docs/superpowers/specs/2026-04-18-desistimiento-tesis-design.md
export async function POST() {
  return NextResponse.json({
    error: 'Endpoint reemplazado. Usa /api/tesis/[id]/desistir/solicitar.',
    newEndpoint: '/api/tesis/[id]/desistir/solicitar',
  }, { status: 410 })
}
