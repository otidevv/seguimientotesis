import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
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
