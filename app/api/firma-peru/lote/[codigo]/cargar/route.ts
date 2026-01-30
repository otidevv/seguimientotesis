/**
 * API Route: /api/firma-peru/lote/[codigo]/cargar
 *
 * POST: Recibe el archivo .7z con los PDFs firmados
 *
 * NOTA: Este endpoint debe ser adaptado para guardar los archivos
 * en tu sistema de almacenamiento y actualizar la base de datos.
 */

import { NextRequest, NextResponse } from 'next/server';
import { findLoteByCode, getLoteTempPath, cleanLoteTempPath } from '@/lib/firma-peru/storage';
import { prisma } from '@/lib/prisma';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

// Interfaz para los parámetros de ruta
interface RouteParams {
  params: Promise<{
    codigo: string;
  }>;
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { codigo } = await params;

    console.log(`[Firma Perú] Cargando lote firmado: ${codigo}`);

    // Buscar el lote por su código
    const loteData = findLoteByCode(codigo);

    if (!loteData) {
      console.error(`[Firma Perú] Lote no encontrado: ${codigo}`);
      return NextResponse.json(
        { message: 'No se encontró información del lote' },
        { status: 404 }
      );
    }

    const { params: loteParams } = loteData;
    const archivoIds = loteParams.archivo_ids;

    // Firma Perú envía el archivo con multipart/form-data pero con formato no estándar
    // Leer el body como raw bytes y extraer el contenido manualmente
    const contentType = request.headers.get('content-type') || '';
    console.log(`[Firma Perú] Content-Type recibido: ${contentType}`);

    // Leer todo el body como bytes
    const rawBody = await request.arrayBuffer();
    let buffer = Buffer.from(rawBody);

    console.log(`[Firma Perú] Body recibido: ${buffer.length} bytes`);

    // Si es multipart, necesitamos extraer el contenido del archivo
    if (contentType.includes('multipart/form-data')) {
      // Extraer el boundary del content-type
      const boundaryMatch = contentType.match(/boundary=(.+?)(?:;|$)/);
      if (boundaryMatch) {
        const boundary = boundaryMatch[1].replace(/^["']|["']$/g, '');
        console.log(`[Firma Perú] Boundary: ${boundary}`);

        // Buscar el contenido del archivo entre los boundaries
        const bodyStr = buffer.toString('latin1');
        const boundaryStart = `--${boundary}`;
        const boundaryEnd = `--${boundary}--`;

        // Encontrar el inicio del contenido binario (después de los headers)
        const headerEnd = bodyStr.indexOf('\r\n\r\n');
        if (headerEnd !== -1) {
          const contentStart = headerEnd + 4;
          // Encontrar el final (antes del boundary de cierre)
          const contentEnd = bodyStr.lastIndexOf(boundaryStart) - 2; // -2 para \r\n

          if (contentEnd > contentStart) {
            buffer = Buffer.from(bodyStr.slice(contentStart, contentEnd), 'latin1');
            console.log(`[Firma Perú] Contenido extraído: ${buffer.length} bytes`);
          }
        }
      }
    }

    if (!buffer || buffer.length === 0) {
      console.error('[Firma Perú] No se recibió contenido en el body');
      return NextResponse.json(
        { message: 'No se encontró el archivo firmado' },
        { status: 400 }
      );
    }

    console.log(`[Firma Perú] Archivo procesado: ${buffer.length} bytes`);

    // Directorio temporal para extraer
    const tempDir = getLoteTempPath(codigo);
    const extractDir = path.join(tempDir, 'extracted');

    if (!fs.existsSync(extractDir)) {
      fs.mkdirSync(extractDir, { recursive: true });
    }

    // Guardar el archivo 7z temporalmente
    const tempFilePath = path.join(tempDir, 'firmados.7z');
    fs.writeFileSync(tempFilePath, buffer);

    // Extraer el archivo 7z usando 7-Zip
    const sevenZipPath = process.env.SEVENZIP_PATH || 'C:\\Program Files\\7-Zip\\7z.exe';

    try {
      // Comando: 7z x archivo.7z -o"directorio" -y
      const command = `"${sevenZipPath}" x "${tempFilePath}" -o"${extractDir}" -y`;
      console.log(`[Firma Perú] Ejecutando: ${command}`);

      execSync(command, { stdio: 'pipe' });
      console.log(`[Firma Perú] 7z extraído en: ${extractDir}`);
    } catch (extractError) {
      console.error('[Firma Perú] Error al extraer 7z:', extractError);
      return NextResponse.json(
        { message: 'Error al procesar el archivo comprimido' },
        { status: 500 }
      );
    }

    // Procesar archivos extraídos
    const extractedFiles = fs.readdirSync(extractDir);
    const procesados: number[] = [];
    const errores: { id: string; error: string }[] = [];

    for (const filename of extractedFiles) {
      // El nombre del archivo tiene formato: {id}_{nombre_original}.pdf
      const parts = filename.split('_');

      if (parts.length < 2) {
        console.warn(`[Firma Perú] Archivo con formato incorrecto: ${filename}`);
        errores.push({ id: filename, error: 'Formato de nombre incorrecto' });
        continue;
      }

      const archivoId = parseInt(parts[0], 10);

      if (isNaN(archivoId)) {
        console.warn(`[Firma Perú] ID de archivo inválido: ${filename}`);
        errores.push({ id: filename, error: 'ID de archivo inválido' });
        continue;
      }

      // Verificar que el archivo pertenece al lote
      if (!archivoIds.includes(archivoId)) {
        console.warn(`[Firma Perú] Archivo no pertenece al lote: ${filename}`);
        errores.push({ id: filename, error: 'Archivo no pertenece al lote' });
        continue;
      }

      const filePath = path.join(extractDir, filename);

      // Verificar si es un documento de tesis (carta de aceptación)
      const loteExtendido = loteParams as typeof loteParams & {
        tesisId?: string;
        userId?: string;
        tipoAsesor?: string;
        tipoDocumento?: string;
      };

      if (loteExtendido.tesisId && loteExtendido.tipoDocumento) {
        // Es un documento de tesis - procesarlo específicamente
        const firmadosDir = path.join(
          process.cwd(),
          'public',
          'documentos',
          'cartas-aceptacion',
          'firmadas'
        );
        if (!fs.existsSync(firmadosDir)) {
          fs.mkdirSync(firmadosDir, { recursive: true });
        }

        const tipoDocText = loteExtendido.tipoAsesor === 'ASESOR' ? 'asesor' : 'coasesor';
        const destFileName = `carta_${tipoDocText}_firmada_${Date.now()}_${filename}`;
        const destPath = path.join(firmadosDir, destFileName);

        // Copiar archivo firmado
        fs.copyFileSync(filePath, destPath);

        // Leer el buffer para obtener el tamaño
        const fileBuffer = fs.readFileSync(destPath);

        // Mapear tipo de documento
        const tipoDoc = loteExtendido.tipoAsesor === 'ASESOR'
          ? 'CARTA_ACEPTACION_ASESOR'
          : 'CARTA_ACEPTACION_COASESOR';

        // Desactivar versiones anteriores del mismo tipo de documento
        await prisma.thesisDocument.updateMany({
          where: {
            thesisId: loteExtendido.tesisId,
            tipo: tipoDoc,
            esVersionActual: true,
          },
          data: {
            esVersionActual: false,
          },
        });

        // Crear registro del documento firmado en la base de datos
        await prisma.thesisDocument.create({
          data: {
            thesisId: loteExtendido.tesisId!,
            tipo: tipoDoc,
            nombre: `Carta de Aceptación ${loteExtendido.tipoAsesor === 'ASESOR' ? 'del Asesor' : 'del Coasesor'} (Firmada)`,
            descripcion: 'Carta de aceptación firmada digitalmente con Firma Perú',
            rutaArchivo: `/documentos/cartas-aceptacion/firmadas/${destFileName}`,
            mimeType: 'application/pdf',
            tamano: fileBuffer.length,
            version: 1,
            esVersionActual: true,
            firmadoDigitalmente: true,
            fechaFirma: new Date(),
            uploadedById: loteExtendido.userId!,
          },
        });

        // Actualizar estado del asesor a ACEPTADO
        if (loteExtendido.userId) {
          await prisma.thesisAdvisor.updateMany({
            where: {
              thesisId: loteExtendido.tesisId,
              userId: loteExtendido.userId,
            },
            data: {
              estado: 'ACEPTADO',
              fechaRespuesta: new Date(),
            },
          });
        }

        console.log(`[Firma Perú] Carta de aceptación firmada guardada: ${destFileName}`);
        procesados.push(archivoId);
      } else {
        // Documento genérico - guardar en directorio de firmados
        const firmadosDir = path.join(process.cwd(), 'public', 'firmados');
        if (!fs.existsSync(firmadosDir)) {
          fs.mkdirSync(firmadosDir, { recursive: true });
        }

        const destPath = path.join(firmadosDir, `firmado_${Date.now()}_${filename}`);
        fs.copyFileSync(filePath, destPath);

        procesados.push(archivoId);
        console.log(`[Firma Perú] Archivo procesado: ${archivoId} -> ${destPath}`);
      }
    }

    // Limpiar archivos temporales
    cleanLoteTempPath(codigo);

    console.log(`[Firma Perú] Lote completado: ${procesados.length}/${archivoIds.length} archivos`);

    return NextResponse.json({
      message: 'Lote procesado correctamente',
      procesados: procesados.length,
      total: archivoIds.length,
      errores: errores.length > 0 ? errores : undefined,
    });

  } catch (error) {
    console.error('[Firma Perú] Error al cargar lote firmado:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
