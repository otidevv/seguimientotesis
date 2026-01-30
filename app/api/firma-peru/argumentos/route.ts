/**
 * API Route: /api/firma-peru/argumentos
 *
 * POST: Recibe parámetros iniciales del frontend y genera token_lote
 * GET:  Retorna parámetros de firma en Base64 (llamado por cliente Firma Perú)
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  MOTIVOS_FIRMA_TEXT,
  type FirmaLoteRequest,
  type FirmaPeruConfig,
  type LoteParams,
} from '@/lib/firma-peru';
import { getFirmaPeruToken } from '@/lib/firma-peru/token';
import {
  generateTokenLote,
  generateLoteId,
  saveLoteParams,
  getLoteParams,
  updateLoteParams,
} from '@/lib/firma-peru/storage';

/**
 * POST: Recibe parámetros del frontend para iniciar firma por lotes
 * También maneja solicitudes POST del cliente de Firma Perú (form-urlencoded)
 */
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';

    // Si es form-urlencoded, es una solicitud del cliente de Firma Perú
    // Redirigir la lógica al handler GET
    if (contentType.includes('application/x-www-form-urlencoded') ||
        contentType.includes('text/plain') ||
        !contentType.includes('application/json')) {

      // Obtener token_lote del query string
      const { searchParams } = new URL(request.url);
      const tokenLote = searchParams.get('token_lote');

      console.log(`[Firma Perú] POST del cliente Firma Perú detectado, token_lote: ${tokenLote}`);

      // Usar la misma lógica que GET
      return handleGetArgumentos(tokenLote);
    }

    // Si es JSON, es una solicitud del frontend
    const body: FirmaLoteRequest = await request.json();

    // Validar parámetros requeridos
    if (!body.archivo_ids || !Array.isArray(body.archivo_ids) || body.archivo_ids.length === 0) {
      return NextResponse.json(
        { message: 'archivo_ids es requerido y debe ser un array no vacío' },
        { status: 400 }
      );
    }

    if (!body.motivo || ![1, 2].includes(body.motivo)) {
      return NextResponse.json(
        { message: 'motivo es requerido (1: Autor, 2: VoBo)' },
        { status: 400 }
      );
    }

    if (!body.apariencia || ![1, 2].includes(body.apariencia)) {
      return NextResponse.json(
        { message: 'apariencia es requerida (1: Horizontal, 2: Vertical)' },
        { status: 400 }
      );
    }

    if (!body.nombre_lote) {
      return NextResponse.json(
        { message: 'nombre_lote es requerido' },
        { status: 400 }
      );
    }

    // Generar token único para este lote
    const tokenLote = generateTokenLote();

    // Guardar parámetros en almacenamiento temporal
    const params: LoteParams = {
      archivo_ids: body.archivo_ids,
      archivo_nombres: body.archivo_nombres,
      motivo: body.motivo,
      apariencia: body.apariencia,
      nombre_lote: body.nombre_lote,
      fecha: new Date().toISOString(),
    };

    saveLoteParams(tokenLote, params);

    console.log(`[Firma Perú] Lote creado: ${tokenLote} con ${body.archivo_ids.length} archivos`);

    return NextResponse.json({
      message: 'Parámetros recibidos correctamente',
      token_lote: tokenLote,
    });

  } catch (error) {
    console.error('[Firma Perú] Error en POST /argumentos:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * Función compartida para generar los argumentos de firma
 * Usada por GET y POST (cuando viene del cliente Firma Perú)
 */
async function handleGetArgumentos(tokenLote: string | null): Promise<NextResponse> {
  try {
    if (!tokenLote) {
      const errorResponse = { error: 'No se encontró el token del lote' };
      return new NextResponse(
        Buffer.from(JSON.stringify(errorResponse)).toString('base64'),
        { headers: { 'Content-Type': 'text/plain' } }
      );
    }

    // Recuperar parámetros del lote
    const loteParams = getLoteParams(tokenLote);

    if (!loteParams) {
      const errorResponse = { error: 'No se encontró información del lote' };
      return new NextResponse(
        Buffer.from(JSON.stringify(errorResponse)).toString('base64'),
        { headers: { 'Content-Type': 'text/plain' } }
      );
    }

    // Obtener token JWT de Firma Perú
    const token = await getFirmaPeruToken();

    if (!token) {
      const errorResponse = { error: 'No se pudo obtener el token de autenticación' };
      return new NextResponse(
        Buffer.from(JSON.stringify(errorResponse)).toString('base64'),
        { headers: { 'Content-Type': 'text/plain' } }
      );
    }

    // Usar código existente o generar uno nuevo (solo la primera vez)
    let codigoLote = loteParams.codigo_lote;
    if (!codigoLote) {
      codigoLote = generateLoteId();
      // Actualizar params con el código del lote
      updateLoteParams(tokenLote, { codigo_lote: codigoLote });
    }

    console.log(`[Firma Perú] Usando código de lote: ${codigoLote}`);

    // Obtener texto del motivo
    const motivoText = MOTIVOS_FIRMA_TEXT[loteParams.motivo] || 'Soy el autor del documento';

    // URL base de la aplicación
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Construir parámetros de firma para Firma Perú
    const firmaConfig: FirmaPeruConfig = {
      signatureFormat: 'PAdES',
      signatureLevel: 'B',
      signaturePackaging: 'enveloped',
      documentToSign: `${baseUrl}/api/firma-peru/lote/${codigoLote}/descargar`,
      certificateFilter: '.*',
      webTsa: '',
      userTsa: '',
      passwordTsa: '',
      theme: 'claro',
      visiblePosition: true,
      contactInfo: '',
      signatureReason: motivoText,
      bachtOperation: true,
      oneByOne: false,
      signatureStyle: loteParams.apariencia,
      imageToStamp: loteParams.apariencia === 1
        ? `${baseUrl}/images/firma_horizontal.png`
        : `${baseUrl}/images/firma_vertical.png`,
      stampTextSize: 14,
      stampWordWrap: 37,
      role: '',
      stampPage: '1',
      positionx: '20',
      positiony: '20',
      uploadDocumentSigned: `${baseUrl}/api/firma-peru/lote/${codigoLote}/cargar`,
      certificationSignature: false,
      token: token,
    };

    console.log(`[Firma Perú] Argumentos generados para lote: ${codigoLote}`);

    // Retornar en Base64 (requerido por Firma Perú)
    const base64Response = Buffer.from(JSON.stringify(firmaConfig)).toString('base64');

    return new NextResponse(base64Response, {
      headers: { 'Content-Type': 'text/plain' },
    });

  } catch (error) {
    console.error('[Firma Perú] Error en handleGetArgumentos:', error);
    const errorResponse = { error: 'Error interno del servidor' };
    return new NextResponse(
      Buffer.from(JSON.stringify(errorResponse)).toString('base64'),
      { headers: { 'Content-Type': 'text/plain' } }
    );
  }
}

/**
 * GET: Retorna parámetros de firma en Base64 (llamado por cliente Firma Perú)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenLote = searchParams.get('token_lote');
  return handleGetArgumentos(tokenLote);
}
