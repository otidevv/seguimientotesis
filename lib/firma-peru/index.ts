/**
 * Módulo de integración con Firma Perú (PCM)
 * Sistema de Firma Digital del Estado Peruano
 *
 * IMPORTANTE: Este archivo solo exporta tipos y constantes
 * que son seguros para usar tanto en cliente como en servidor.
 *
 * Para funciones de servidor (fs, path), importar directamente desde:
 * - '@/lib/firma-peru/token' (solo servidor)
 * - '@/lib/firma-peru/storage' (solo servidor)
 */

// Solo exportamos tipos y constantes (seguros para cliente y servidor)
export * from './types';

// Re-exportar constantes útiles
export {
  MOTIVOS_FIRMA,
  MOTIVOS_FIRMA_TEXT,
  APARIENCIAS_FIRMA,
  ESTADOS_ARCHIVO,
  FIRMA_PERU_PORT,
  FIRMA_PERU_STATIC_TOKEN,
} from './types';
