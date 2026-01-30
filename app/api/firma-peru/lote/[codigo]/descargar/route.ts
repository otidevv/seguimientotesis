/**
 * API Route: /api/firma-peru/lote/[codigo]/descargar
 *
 * GET: Descarga archivo .zip con los PDFs a firmar
 *
 * NOTA: Este endpoint debe ser adaptado para obtener los archivos
 * desde tu base de datos y sistema de almacenamiento.
 */

import { NextRequest, NextResponse } from 'next/server';
import { findLoteByCode, getLoteTempPath } from '@/lib/firma-peru/storage';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

// Interfaz para los parámetros de ruta
interface RouteParams {
  params: Promise<{
    codigo: string;
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { codigo } = await params;

    console.log(`[Firma Perú] Descargando lote: ${codigo}`);

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
    const archivoNombres = loteParams.archivo_nombres || [];

    // Directorio temporal para preparar el ZIP
    const tempDir = getLoteTempPath(codigo);
    const sourceDir = path.join(tempDir, 'source');

    if (!fs.existsSync(sourceDir)) {
      fs.mkdirSync(sourceDir, { recursive: true });
    }

    // Directorio de documentos
    const publicDir = path.join(process.cwd(), 'public', 'documentos');

    // Verificar si existe el directorio
    if (!fs.existsSync(publicDir)) {
      console.error('[Firma Perú] No existe el directorio de documentos');
      return NextResponse.json(
        { message: 'No se encontró el directorio de documentos' },
        { status: 404 }
      );
    }

    // Si tenemos nombres de archivo, usarlos directamente
    if (archivoNombres.length > 0) {
      for (let i = 0; i < archivoNombres.length; i++) {
        const nombreArchivo = archivoNombres[i];
        const sourceFile = path.join(publicDir, nombreArchivo);

        if (fs.existsSync(sourceFile)) {
          // Usar solo el nombre base del archivo (sin la ruta de subdirectorios)
          const baseFileName = path.basename(nombreArchivo);
          const targetFile = path.join(sourceDir, `${archivoIds[i]}_${baseFileName}`);
          fs.copyFileSync(sourceFile, targetFile);
          console.log(`[Firma Perú] Archivo copiado: ${nombreArchivo} -> ${baseFileName}`);
        } else {
          console.error(`[Firma Perú] Archivo no encontrado: ${sourceFile}`);
        }
      }
    } else {
      // Fallback: usar archivos por posición (comportamiento anterior)
      const files = fs.readdirSync(publicDir).filter(f => f.toLowerCase().endsWith('.pdf'));

      for (let i = 0; i < Math.min(files.length, archivoIds.length); i++) {
        const sourceFile = path.join(publicDir, files[i]);
        const targetFile = path.join(sourceDir, `${archivoIds[i]}_${files[i]}`);
        fs.copyFileSync(sourceFile, targetFile);
      }
    }

    // Verificar que hay archivos para comprimir
    const filesToZip = fs.readdirSync(sourceDir);
    if (filesToZip.length === 0) {
      return NextResponse.json(
        { message: 'No se encontraron archivos para el lote' },
        { status: 404 }
      );
    }

    // Ruta del archivo 7z de salida (Firma Perú requiere formato 7z, NO zip)
    const sevenZipFilePath = path.join(tempDir, `documentos_${codigo}.7z`);

    // Eliminar archivo anterior si existe
    if (fs.existsSync(sevenZipFilePath)) {
      fs.unlinkSync(sevenZipFilePath);
    }

    // Usar 7-Zip para crear el archivo en formato 7z (requerido por Firma Perú)
    const sevenZipPath = process.env.SEVENZIP_PATH || 'C:\\Program Files\\7-Zip\\7z.exe';

    try {
      // Comando: 7z a archivo.7z carpeta/* (sin -tzip para usar formato 7z nativo)
      const command = `"${sevenZipPath}" a "${sevenZipFilePath}" "${sourceDir}\\*"`;
      console.log(`[Firma Perú] Ejecutando: ${command}`);

      execSync(command, { stdio: 'pipe' });
    } catch (zipError) {
      console.error('[Firma Perú] Error al crear 7z con 7-Zip:', zipError);
      return NextResponse.json(
        { message: 'Error al crear archivo 7z. Verifique que 7-Zip esté instalado.' },
        { status: 500 }
      );
    }

    // Leer el archivo 7z generado
    const sevenZipBuffer = fs.readFileSync(sevenZipFilePath);

    console.log(`[Firma Perú] 7z creado: ${sevenZipBuffer.length} bytes, ${filesToZip.length} archivos`);

    // Retornar el archivo 7z
    return new NextResponse(sevenZipBuffer, {
      headers: {
        'Content-Type': 'application/x-7z-compressed',
        'Content-Disposition': `attachment; filename="documentos_${codigo}.7z"`,
        'Content-Length': sevenZipBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('[Firma Perú] Error al descargar lote:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
