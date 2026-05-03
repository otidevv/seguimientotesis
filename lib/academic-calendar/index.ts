/**
 * Academic Calendar — API publica del modulo.
 *
 * Exporta el guard (`assertDentroDeVentana`, `getVentanaVigente`) y los tipos
 * usados por endpoints y componentes de UI.
 */

export {
  assertDentroDeVentana,
  getVentanaVigente,
  FueraDeVentanaError,
  type WindowType,
  type VentanaVigente,
  type ProximaApertura,
  type GuardOptions,
} from './guard'

export {
  agregarDiasHabilesAcademicos,
  agregarDiasHabilesAcademicosSync,
} from './business-days'

/**
 * Formatea una fecha como YYYY-MM-DD en zona America/Lima, independiente del
 * TZ del runtime. Úsalo en mensajes que muestran la fecha al usuario para que
 * coincidan con lo que el admin configuró en el calendario.
 */
export function isoDateLima(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(d)
}
