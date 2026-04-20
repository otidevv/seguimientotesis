/**
 * Dias habiles academicos = dias habiles peruanos (no sabado/domingo/feriado)
 * + que caen dentro de algun periodo academico ACTIVO o PLANIFICADO del scope.
 *
 * Pausa durante vacaciones: si el plazo arranca el 30-jul y agosto es gap
 * entre periodos, los dias se pausan hasta que el siguiente periodo inicie.
 *
 * Incluimos PLANIFICADOS para que admin pueda pre-crear periodos con
 * anticipacion y el calculo los respete desde ya (aunque aun no los active).
 *
 * Fallback multi-nivel:
 *  1. Sin calendario configurado (0 periodos) → usa `agregarDiasHabiles` original.
 *  2. Si el cursor pasa del ultimo periodo conocido sin completar los dias,
 *     terminamos con dias habiles regulares (mejor aproximacion que bloquear).
 */

import { prisma } from '@/lib/prisma'
import { agregarDiasHabiles, esDiaHabil } from '@/lib/business-days'

const MAX_ITER_DIAS = 365 * 3 // safety net: 3 anios de lookahead

export async function agregarDiasHabilesAcademicos(
  desde: Date,
  diasHabiles: number,
  facultadId: string | null | undefined,
): Promise<Date> {
  // Traer periodos que contengan `desde` o esten en el futuro, ACTIVOS o PLANIFICADOS.
  // Los CERRADOS se excluyen: cerrar un periodo equivale a invalidar sus dias.
  const periodos = await prisma.academicPeriod.findMany({
    where: {
      estado: { in: ['ACTIVO', 'PLANIFICADO'] },
      fechaFin: { gte: desde },
      OR: [
        ...(facultadId ? [{ facultadId }] : []),
        { facultadId: null },
      ],
    },
    select: { fechaInicio: true, fechaFin: true, facultadId: true },
    orderBy: { fechaInicio: 'asc' },
  })

  if (periodos.length === 0) {
    // Sin calendario configurado, comportamiento legacy (solo feriados PE).
    return agregarDiasHabiles(desde, diasHabiles)
  }

  // Preferir rangos facultad-especificos si existen; sino usar globales.
  const periodosFacultad = periodos.filter((p) => p.facultadId !== null)
  const rangos = (periodosFacultad.length > 0 ? periodosFacultad : periodos).map((p) => ({
    inicio: p.fechaInicio,
    fin: p.fechaFin,
  }))
  const maxFin = rangos.reduce((m, r) => (r.fin > m ? r.fin : m), rangos[0].fin)
  const cae = (d: Date) => rangos.some((r) => r.inicio <= d && r.fin >= d)

  const cursor = new Date(desde)
  let count = 0
  let iter = 0
  while (count < diasHabiles) {
    cursor.setDate(cursor.getDate() + 1)
    iter++

    // Si salimos del ultimo periodo conocido sin completar, fallback a regular
    // para no bloquear acciones cuando admin aun no configuro el siguiente periodo.
    if (cursor > maxFin) {
      return agregarDiasHabiles(maxFin, diasHabiles - count)
    }

    if (iter > MAX_ITER_DIAS) {
      // No deberia llegar aqui con el fallback de arriba, pero blindamos.
      return agregarDiasHabiles(desde, diasHabiles)
    }
    if (!esDiaHabil(cursor)) continue
    if (!cae(cursor)) continue
    count++
  }
  return cursor
}

/** Version sincronica — requiere rangos pre-cargados. Para tests. */
export function agregarDiasHabilesAcademicosSync(
  desde: Date,
  diasHabiles: number,
  rangos: Array<{ inicio: Date; fin: Date }>,
): Date {
  if (rangos.length === 0) return agregarDiasHabiles(desde, diasHabiles)
  const maxFin = rangos.reduce((m, r) => (r.fin > m ? r.fin : m), rangos[0].fin)
  const cae = (d: Date) => rangos.some((r) => r.inicio <= d && r.fin >= d)
  const cursor = new Date(desde)
  let count = 0
  let iter = 0
  while (count < diasHabiles) {
    cursor.setDate(cursor.getDate() + 1)
    iter++
    if (cursor > maxFin) return agregarDiasHabiles(maxFin, diasHabiles - count)
    if (iter > MAX_ITER_DIAS) return agregarDiasHabiles(desde, diasHabiles)
    if (!esDiaHabil(cursor)) continue
    if (!cae(cursor)) continue
    count++
  }
  return cursor
}
