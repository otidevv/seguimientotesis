'use client';

/**
 * Página de ejemplo para Firma Perú
 *
 * Esta página demuestra cómo usar los componentes de Firma Perú.
 * Puedes adaptarla a tu flujo de trabajo.
 */

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FirmaModal } from '@/components/firma-peru';
import { FileSignature, FileText, CheckCircle, AlertCircle, Info, RefreshCw, Loader2 } from 'lucide-react';

interface Documento {
  id: number;
  nombre: string;
  ruta: string;
  tamano: number;
  estado: 'pendiente' | 'firmado';
}

export default function FirmaPeruPage() {
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [seleccionados, setSeleccionados] = useState<number[]>([]);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Función para cargar documentos desde la API
  const cargarDocumentos = useCallback(async () => {
    setCargando(true);
    setError(null);

    try {
      const response = await fetch('/api/firma-peru/documentos');
      const data = await response.json();

      if (data.documentos) {
        setDocumentos(
          data.documentos.map((doc: { id: number; nombre: string; ruta: string; tamano: number }) => ({
            ...doc,
            estado: 'pendiente' as const,
          }))
        );
      } else {
        setDocumentos([]);
      }
    } catch (err) {
      console.error('Error al cargar documentos:', err);
      setError('Error al cargar los documentos');
    } finally {
      setCargando(false);
    }
  }, []);

  // Cargar documentos al montar el componente
  useEffect(() => {
    cargarDocumentos();
  }, [cargarDocumentos]);

  // Escuchar evento de firma exitosa
  useEffect(() => {
    const handleFirmaExitosa = () => {
      // Actualizar estado de documentos firmados
      setDocumentos(prev =>
        prev.map(doc =>
          seleccionados.includes(doc.id)
            ? { ...doc, estado: 'firmado' }
            : doc
        )
      );
      setSeleccionados([]);
    };

    window.addEventListener('firma-peru-success', handleFirmaExitosa);
    return () => window.removeEventListener('firma-peru-success', handleFirmaExitosa);
  }, [seleccionados]);

  const toggleSeleccion = (id: number) => {
    setSeleccionados(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : [...prev, id]
    );
  };

  const seleccionarTodos = () => {
    const pendientes = documentos
      .filter(d => d.estado === 'pendiente')
      .map(d => d.id);
    setSeleccionados(pendientes);
  };

  const getEstadoBadge = (estado: string) => {
    if (estado === 'firmado') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
          <CheckCircle className="w-3 h-3 mr-1" />
          Firmado
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
        <AlertCircle className="w-3 h-3 mr-1" />
        Pendiente
      </span>
    );
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <FileSignature className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 flex-shrink-0" />
            <span>Firma Digital - Firma Perú</span>
          </h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">
            Firme sus documentos digitalmente usando el sistema de Firma Perú (PCM).
          </p>
        </div>

        {/* Información */}
        <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/30">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800 dark:text-blue-300">
                <p className="font-medium mb-1">Requisitos para firmar:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Tener instalado el <strong>Cliente de Firma Perú</strong></li>
                  <li>Tener un <strong>certificado digital válido</strong> (DNIe o certificado emitido)</li>
                  <li>Seleccionar los documentos que desea firmar</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Acciones */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={cargarDocumentos}
            disabled={cargando}
            className="w-full sm:w-auto"
          >
            {cargando ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Actualizar lista
          </Button>
          <Button
            variant="outline"
            onClick={seleccionarTodos}
            disabled={documentos.filter(d => d.estado === 'pendiente').length === 0}
            className="w-full sm:w-auto"
          >
            <span className="hidden sm:inline">Seleccionar todos los pendientes</span>
            <span className="sm:hidden">Seleccionar pendientes</span>
          </Button>
          <Button
            onClick={() => setModalAbierto(true)}
            disabled={seleccionados.length === 0}
            className="w-full sm:w-auto"
          >
            <FileSignature className="w-4 h-4 mr-2" />
            Firmar ({seleccionados.length})
          </Button>
        </div>

        {/* Lista de documentos */}
        <Card>
          <CardHeader>
            <CardTitle>Documentos</CardTitle>
            <CardDescription>
              Seleccione los documentos que desea firmar digitalmente.
              Coloca archivos PDF en la carpeta <code className="bg-muted px-1 rounded">public/documentos/</code>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {cargando ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="text-center py-8 text-red-500">
                <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                <p>{error}</p>
              </div>
            ) : documentos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="font-medium">No hay documentos disponibles</p>
                <p className="text-sm mt-1">
                  Coloca archivos PDF en la carpeta <code className="bg-muted px-1 rounded">public/documentos/</code>
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {documentos.map((doc) => (
                  <div
                    key={doc.id}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg border transition-colors ${
                      seleccionados.includes(doc.id)
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                        : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900'
                    } ${doc.estado === 'firmado' ? 'opacity-60' : 'cursor-pointer'}`}
                    onClick={() => doc.estado === 'pendiente' && toggleSeleccion(doc.id)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={seleccionados.includes(doc.id)}
                        onChange={() => toggleSeleccion(doc.id)}
                        disabled={doc.estado === 'firmado'}
                        className="w-4 h-4 rounded border-gray-300 flex-shrink-0"
                      />
                      <FileText className="w-5 h-5 text-red-500 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="font-medium text-sm sm:text-base line-clamp-1">{doc.nombre}</span>
                        <span className="text-xs text-muted-foreground ml-2 whitespace-nowrap">
                          ({(doc.tamano / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-end sm:justify-start ml-7 sm:ml-0">
                      {getEstadoBadge(doc.estado)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal de firma */}
        <FirmaModal
          isOpen={modalAbierto}
          onClose={() => setModalAbierto(false)}
          archivoIds={seleccionados}
          archivoNombres={documentos
            .filter(doc => seleccionados.includes(doc.id))
            .map(doc => doc.nombre)}
          onSuccess={() => {
            setModalAbierto(false);
          }}
        />
      </div>
    </div>
  );
}
