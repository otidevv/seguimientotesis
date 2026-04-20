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
  type GuardOptions,
} from './guard'

export {
  agregarDiasHabilesAcademicos,
  agregarDiasHabilesAcademicosSync,
} from './business-days'
