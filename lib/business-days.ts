/**
 * Utilidad para calcular días hábiles (excluyendo sábados y domingos).
 *
 * Se usa para calcular fechas límite de evaluación (15 días hábiles)
 * y corrección (30 días hábiles) en el flujo de jurados.
 */

/**
 * Agrega N días hábiles a una fecha.
 * Días hábiles = lunes a viernes (excluye sábados y domingos).
 *
 * @param fecha - Fecha de inicio
 * @param diasHabiles - Cantidad de días hábiles a agregar
 * @returns Nueva fecha con los días hábiles sumados
 */
export function agregarDiasHabiles(fecha: Date, diasHabiles: number): Date {
  const resultado = new Date(fecha)
  let diasAgregados = 0

  while (diasAgregados < diasHabiles) {
    resultado.setDate(resultado.getDate() + 1)
    const diaSemana = resultado.getDay()
    // 0 = domingo, 6 = sábado
    if (diaSemana !== 0 && diaSemana !== 6) {
      diasAgregados++
    }
  }

  return resultado
}

/**
 * Calcula la cantidad de días hábiles entre dos fechas.
 *
 * @param inicio - Fecha de inicio (no se cuenta)
 * @param fin - Fecha de fin (se cuenta si es hábil)
 * @returns Cantidad de días hábiles entre las dos fechas
 */
export function diasHabilesEntre(inicio: Date, fin: Date): number {
  let count = 0
  const current = new Date(inicio)

  while (current < fin) {
    current.setDate(current.getDate() + 1)
    const diaSemana = current.getDay()
    if (diaSemana !== 0 && diaSemana !== 6) {
      count++
    }
  }

  return count
}

/** Días hábiles para evaluación de jurados */
export const DIAS_HABILES_EVALUACION = 15

/** Días hábiles para corrección del estudiante */
export const DIAS_HABILES_CORRECCION = 30
