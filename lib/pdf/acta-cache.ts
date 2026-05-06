/**
 * Cache en disco del acta de desistimiento (snapshot).
 *
 * Antes (bug #10 de la auditoría): el acta se regeneraba on-demand desde
 * datos VIVOS al momento de la descarga. Si tras la aprobación cambiaban los
 * autores, asesores o título de la tesis, el acta reflejaba el estado actual
 * — no el de la aprobación. Inaceptable para un documento legalmente vinculante.
 *
 * Ahora generamos el PDF al momento de aprobar y lo guardamos en disco. El
 * endpoint de descarga lee el archivo cacheado; si no existe (registros
 * antiguos previos a este fix), cae al comportamiento legacy.
 */

import path from 'path'
import fs from 'fs'
import { prisma } from '@/lib/prisma'
import { MOTIVO_LABEL } from '@/lib/constants/motivos-desistimiento'
import { generarActaDesistimiento } from '@/lib/pdf/acta-desistimiento'

const ESTADO_TESIS_LABEL: Record<string, string> = {
  BORRADOR: 'Borrador',
  EN_REVISION: 'En revisión por mesa de partes',
  OBSERVADA: 'Observada por mesa de partes',
  ASIGNANDO_JURADOS: 'Asignando jurados',
  EN_EVALUACION_JURADO: 'En evaluación por jurado',
  OBSERVADA_JURADO: 'Observada por jurado',
  PROYECTO_APROBADO: 'Proyecto aprobado',
}

function actaDir(): string {
  return path.join(process.cwd(), 'public', 'documentos', 'desistimientos', 'actas')
}

export function actaCachePath(withdrawalId: string): string {
  return path.join(actaDir(), `${withdrawalId}.pdf`)
}

export function existeActaCache(withdrawalId: string): boolean {
  return fs.existsSync(actaCachePath(withdrawalId))
}

export function leerActaCache(withdrawalId: string): Buffer {
  return fs.readFileSync(actaCachePath(withdrawalId))
}

/**
 * Genera el acta como PDF y la guarda en disco. Solo debe llamarse JUSTO
 * después de aprobar el desistimiento, cuando los datos vivos coinciden con
 * los del snapshot. Si falla, se loguea — no debe abortar el flujo de
 * aprobación porque éste ya commiteó la transacción.
 */
export async function cachearActaDesistimiento(withdrawalId: string): Promise<void> {
  try {
    const w = await prisma.thesisWithdrawal.findUnique({
      where: { id: withdrawalId },
      include: {
        user: {
          select: {
            id: true,
            nombres: true,
            apellidoPaterno: true,
            apellidoMaterno: true,
            numeroDocumento: true,
          },
        },
        thesis: {
          include: {
            autores: {
              include: {
                user: {
                  select: {
                    id: true,
                    nombres: true,
                    apellidoPaterno: true,
                    apellidoMaterno: true,
                  },
                },
              },
              orderBy: { orden: 'asc' },
            },
          },
        },
        facultadSnapshot: { select: { nombre: true } },
        studentCareer: { select: { codigoEstudiante: true } },
        aprobadoPor: { select: { nombres: true, apellidoPaterno: true } },
      },
    })

    if (!w || w.estadoSolicitud !== 'APROBADO') {
      // No bloquear el flujo si el desistimiento aún no está APROBADO.
      console.warn('[acta-cache] withdrawal no encontrado o no aprobado:', withdrawalId)
      return
    }

    const coautorActivo = w.thesis.autores.find(
      (a) => a.user.id !== w.userId && a.estado === 'ACEPTADO',
    )

    const buffer = await generarActaDesistimiento({
      desistimiento: {
        id: w.id,
        solicitadoAt: w.solicitadoAt,
        aprobadoAt: w.aprobadoAt,
        aprobadoPor: w.aprobadoPor
          ? `${w.aprobadoPor.nombres} ${w.aprobadoPor.apellidoPaterno}`
          : null,
        motivoCategoriaLabel: MOTIVO_LABEL[w.motivoCategoria] ?? w.motivoCategoria,
        motivoDescripcion: w.motivoDescripcion,
        estadoTesisAlSolicitar:
          ESTADO_TESIS_LABEL[w.estadoTesisAlSolicitar] ?? w.estadoTesisAlSolicitar,
        teniaCoautor: w.teniaCoautor,
      },
      estudiante: {
        nombreCompleto: `${w.user.apellidoPaterno} ${w.user.apellidoMaterno}, ${w.user.nombres}`,
        documento: w.user.numeroDocumento,
        codigoEstudiante: w.studentCareer.codigoEstudiante,
        carrera: w.carreraNombreSnapshot,
        facultad: w.facultadSnapshot.nombre,
      },
      tesis: {
        titulo: w.thesis.titulo,
        codigo: w.thesisId.slice(-8).toUpperCase(),
      },
      coautorContinua: coautorActivo
        ? {
            nombreCompleto: `${coautorActivo.user.apellidoPaterno} ${coautorActivo.user.apellidoMaterno}, ${coautorActivo.user.nombres}`,
            codigoEstudiante: null,
          }
        : null,
    })

    const dir = actaDir()
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(actaCachePath(withdrawalId), buffer)
  } catch (error) {
    console.error('[acta-cache] Error al cachear acta:', error)
    // No re-throw: la aprobación del desistimiento ya está commiteada.
  }
}
