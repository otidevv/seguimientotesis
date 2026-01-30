/**
 * Tipos para la integración con Firma Perú (PCM)
 */

// Parámetros de configuración de firma
export interface FirmaPeruConfig {
  signatureFormat: 'PAdES' | 'XAdES' | 'CAdES';
  signatureLevel: 'B' | 'T' | 'LT' | 'LTA';
  signaturePackaging: 'enveloped' | 'enveloping' | 'detached';
  documentToSign: string;
  certificateFilter: string;
  webTsa: string;
  userTsa: string;
  passwordTsa: string;
  theme: 'claro' | 'oscuro';
  visiblePosition: boolean;
  contactInfo: string;
  signatureReason: string;
  bachtOperation: boolean;
  oneByOne: boolean;
  signatureStyle: number;
  imageToStamp: string;
  stampTextSize: number;
  stampWordWrap: number;
  role: string;
  stampPage: string;
  positionx: string;
  positiony: string;
  uploadDocumentSigned: string;
  certificationSignature: boolean;
  token: string;
}

// Parámetros enviados al cliente de Firma Perú
export interface FirmaPeruParams {
  param_url: string;
  param_token: string;
  document_extension: string;
}

// Request para iniciar firma por lotes
export interface FirmaLoteRequest {
  archivo_ids: number[];
  archivo_nombres?: string[]; // Nombres de los archivos (para modo local)
  motivo: 1 | 2; // 1: Autor, 2: VoBo
  apariencia: 1 | 2; // 1: Horizontal, 2: Vertical
  nombre_lote: string;
}

// Response del endpoint de argumentos
export interface FirmaLoteResponse {
  message: string;
  token_lote: string;
}

// Información de archivo para firma
export interface ArchivoFirma {
  id: number;
  codigo: string;
  nombre: string;
  formato: string;
  size: number;
  ruta: string;
  estado: number; // 0: pendiente, 1: procesando, 2: firmado
}

// Parámetros del lote guardados temporalmente
export interface LoteParams {
  archivo_ids: number[];
  archivo_nombres?: string[]; // Nombres de los archivos (para modo local)
  motivo: number;
  apariencia: number;
  nombre_lote: string;
  fecha: string;
  codigo_lote?: string;
  // Campos opcionales para documentos de tesis
  tesisId?: string;
  userId?: string;
  tipoAsesor?: string;
  tipoDocumento?: string;
}

// Response de carga de archivos firmados
export interface CargarFirmadoResponse {
  message: string;
  procesados: number;
  total: number;
}

// Motivos de firma
export const MOTIVOS_FIRMA = {
  AUTOR: 1,
  VOBO: 2,
} as const;

export const MOTIVOS_FIRMA_TEXT: Record<number, string> = {
  1: 'Soy el autor del documento',
  2: 'Doy V° B°',
};

// Apariencias de firma
export const APARIENCIAS_FIRMA = {
  HORIZONTAL: 1,
  VERTICAL: 2,
} as const;

// Estados de archivo
export const ESTADOS_ARCHIVO = {
  PENDIENTE: 0,
  PROCESANDO: 1,
  FIRMADO: 2,
  RECHAZADO: 3,
} as const;

// Puerto del cliente de Firma Perú
export const FIRMA_PERU_PORT = 48596;

// Token estático requerido por Firma Perú
export const FIRMA_PERU_STATIC_TOKEN = '1626476967';
