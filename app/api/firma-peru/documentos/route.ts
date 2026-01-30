/**
 * API Route: /api/firma-peru/documentos
 *
 * GET: Lista los documentos PDF disponibles en public/documentos
 */

import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export interface DocumentoDisponible {
  id: number;
  nombre: string;
  ruta: string;
  tamano: number;
  fechaModificacion: string;
}

export async function GET() {
  try {
    const documentosDir = path.join(process.cwd(), 'public', 'documentos');

    // Verificar si existe el directorio
    if (!fs.existsSync(documentosDir)) {
      return NextResponse.json({
        documentos: [],
        mensaje: 'La carpeta de documentos no existe',
      });
    }

    // Leer archivos PDF
    const archivos = fs.readdirSync(documentosDir)
      .filter(file => file.toLowerCase().endsWith('.pdf'));

    const documentos: DocumentoDisponible[] = archivos.map((archivo, index) => {
      const rutaCompleta = path.join(documentosDir, archivo);
      const stats = fs.statSync(rutaCompleta);

      return {
        id: index + 1,
        nombre: archivo,
        ruta: `/documentos/${archivo}`,
        tamano: stats.size,
        fechaModificacion: stats.mtime.toISOString(),
      };
    });

    return NextResponse.json({
      documentos,
      total: documentos.length,
    });

  } catch (error) {
    console.error('[Firma Perú] Error al listar documentos:', error);
    return NextResponse.json(
      { message: 'Error al listar documentos' },
      { status: 500 }
    );
  }
}
