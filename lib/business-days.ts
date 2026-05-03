/**
 * Utilidad para calcular días hábiles (excluyendo sábados, domingos y feriados peruanos).
 *
 * Se usa para calcular fechas límite de evaluación (15 días hábiles)
 * y corrección (30 días hábiles) en el flujo de jurados.
 */

/**
 * Feriados oficiales de Perú (fecha fija MM-DD).
 * Fuente: Decreto Legislativo N° 713 y normas complementarias.
 */
const FERIADOS_FIJOS = [
  '01-01', // Año Nuevo
  '05-01', // Día del Trabajo
  '06-29', // San Pedro y San Pablo
  '07-23', // Día de la Fuerza Aérea del Perú
  '07-28', // Fiestas Patrias
  '07-29', // Fiestas Patrias
  '08-06', // Batalla de Junín
  '08-30', // Santa Rosa de Lima
  '10-08', // Combate de Angamos
  '11-01', // Día de Todos los Santos
  '12-08', // Inmaculada Concepción
  '12-09', // Batalla de Ayacucho
  '12-25', // Navidad
]

/**
 * Feriados con fecha variable (se calculan por año).
 * Jueves Santo y Viernes Santo dependen de la Pascua.
 */
function calcularPascua(year: number): Date {
  // Algoritmo de Butcher para calcular Domingo de Pascua
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month - 1, day)
}

function obtenerFeriadosVariables(year: number): string[] {
  const pascua = calcularPascua(year)
  // Jueves Santo: 3 días antes de Pascua
  const juevesSanto = new Date(pascua)
  juevesSanto.setDate(pascua.getDate() - 3)
  // Viernes Santo: 2 días antes de Pascua
  const viernesSanto = new Date(pascua)
  viernesSanto.setDate(pascua.getDate() - 2)

  const fmt = (d: Date) => {
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${mm}-${dd}`
  }

  return [fmt(juevesSanto), fmt(viernesSanto)]
}

function esFeriado(fecha: Date): boolean {
  const mm = String(fecha.getMonth() + 1).padStart(2, '0')
  const dd = String(fecha.getDate()).padStart(2, '0')
  const mmdd = `${mm}-${dd}`

  if (FERIADOS_FIJOS.includes(mmdd)) return true
  if (obtenerFeriadosVariables(fecha.getFullYear()).includes(mmdd)) return true

  return false
}

/**
 * Verifica si una fecha es día hábil (lunes a viernes, no feriado).
 */
export function esDiaHabil(fecha: Date): boolean {
  const dia = fecha.getDay()
  if (dia === 0 || dia === 6) return false
  if (esFeriado(fecha)) return false
  return true
}

/**
 * Agrega N días hábiles a una fecha.
 * Días hábiles = lunes a viernes, excluyendo feriados peruanos.
 */
export function agregarDiasHabiles(fecha: Date, diasHabiles: number): Date {
  const resultado = new Date(fecha)
  let diasAgregados = 0

  while (diasAgregados < diasHabiles) {
    resultado.setDate(resultado.getDate() + 1)
    if (esDiaHabil(resultado)) {
      diasAgregados++
    }
  }

  return resultado
}

/**
 * Calcula la cantidad de días hábiles entre dos fechas.
 */
export function diasHabilesEntre(inicio: Date, fin: Date): number {
  let count = 0
  const current = new Date(inicio)

  while (current < fin) {
    current.setDate(current.getDate() + 1)
    if (esDiaHabil(current)) {
      count++
    }
  }

  return count
}

/**
 * Agrega N días calendario a una fecha (sin saltar fines de semana ni feriados).
 * Equivalente a "días corridos" en el reglamento UNAMAD.
 */
export function agregarDiasCalendario(fecha: Date, dias: number): Date {
  const resultado = new Date(fecha)
  resultado.setDate(resultado.getDate() + dias)
  return resultado
}

/** Art. 88 — Jurado dictamina informe final en 15 días hábiles. */
export const DIAS_HABILES_EVALUACION = 15

/**
 * Reglamento UNAMAD — Fase de gestión de proyecto.
 * Tesista subsana observaciones de mesa de partes / jurado en 30 días
 * CALENDARIO (ampliables a 30 más a solicitud). Si vence: reinicia trámite.
 */
export const DIAS_CALENDARIO_CORRECCION_PROYECTO = 30

/**
 * Reglamento UNAMAD Art. 89 — Fase de informe final.
 * Tesista subsana observaciones del jurado / mesa de partes en 15 días HÁBILES.
 * El jurado verifica la corrección en otros 15 días hábiles.
 */
export const DIAS_HABILES_CORRECCION_INFORME = 15

/**
 * @deprecated Usar DIAS_CALENDARIO_CORRECCION_PROYECTO (proyecto) o
 * DIAS_HABILES_CORRECCION_INFORME (informe) según fase. Esta constante
 * mezclaba unidades incorrectamente y se mantenía solo para evitar romper
 * imports antiguos durante la migración.
 */
export const DIAS_HABILES_CORRECCION = 30
