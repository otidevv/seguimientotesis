/**
 * Almacenamiento temporal para lotes de firma
 * En producción, esto debería usar una base de datos o Redis
 */

import { LoteParams } from './types';
import fs from 'fs';
import path from 'path';

// Directorio para archivos temporales
const TEMP_DIR = path.join(process.cwd(), 'tmp', 'firma-peru');

/**
 * Asegura que el directorio temporal existe
 */
function ensureTempDir(): void {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
}

/**
 * Genera un ID único para el lote
 */
export function generateLoteId(): string {
  return `lote_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Genera un token único para identificar la sesión
 */
export function generateTokenLote(): string {
  return `token_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Guarda los parámetros del lote en un archivo temporal
 */
export function saveLoteParams(tokenLote: string, params: LoteParams): void {
  ensureTempDir();
  const filePath = path.join(TEMP_DIR, `${tokenLote}.json`);
  fs.writeFileSync(filePath, JSON.stringify(params, null, 2));
}

/**
 * Obtiene los parámetros del lote desde el archivo temporal
 */
export function getLoteParams(tokenLote: string): LoteParams | null {
  const filePath = path.join(TEMP_DIR, `${tokenLote}.json`);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as LoteParams;
  } catch {
    return null;
  }
}

/**
 * Actualiza los parámetros del lote
 */
export function updateLoteParams(tokenLote: string, params: Partial<LoteParams>): boolean {
  const currentParams = getLoteParams(tokenLote);
  if (!currentParams) return false;

  const updatedParams = { ...currentParams, ...params };
  saveLoteParams(tokenLote, updatedParams);
  return true;
}

/**
 * Busca un lote por su código
 */
export function findLoteByCode(codigoLote: string): { tokenLote: string; params: LoteParams } | null {
  ensureTempDir();

  const files = fs.readdirSync(TEMP_DIR).filter(f => f.endsWith('.json'));

  for (const file of files) {
    const filePath = path.join(TEMP_DIR, file);
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const params = JSON.parse(content) as LoteParams;

      if (params.codigo_lote === codigoLote) {
        return {
          tokenLote: file.replace('.json', ''),
          params,
        };
      }
    } catch {
      continue;
    }
  }

  return null;
}

/**
 * Elimina los parámetros del lote (limpieza)
 */
export function deleteLoteParams(tokenLote: string): void {
  const filePath = path.join(TEMP_DIR, `${tokenLote}.json`);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

/**
 * Limpia lotes antiguos (más de 24 horas)
 */
export function cleanOldLotes(): void {
  ensureTempDir();

  const files = fs.readdirSync(TEMP_DIR);
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 horas

  for (const file of files) {
    const filePath = path.join(TEMP_DIR, file);
    const stats = fs.statSync(filePath);

    if (now - stats.mtimeMs > maxAge) {
      fs.unlinkSync(filePath);
    }
  }
}

/**
 * Obtiene la ruta del directorio temporal para archivos del lote
 */
export function getLoteTempPath(codigoLote: string): string {
  const lotePath = path.join(TEMP_DIR, 'batch', codigoLote);
  if (!fs.existsSync(lotePath)) {
    fs.mkdirSync(lotePath, { recursive: true });
  }
  return lotePath;
}

/**
 * Limpia el directorio temporal de un lote
 */
export function cleanLoteTempPath(codigoLote: string): void {
  const lotePath = path.join(TEMP_DIR, 'batch', codigoLote);
  if (fs.existsSync(lotePath)) {
    fs.rmSync(lotePath, { recursive: true, force: true });
  }
}
