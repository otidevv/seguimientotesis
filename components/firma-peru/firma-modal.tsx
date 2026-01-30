'use client';

/**
 * Modal para configurar y ejecutar la firma de documentos con Firma Perú
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useFirmaPeru } from '@/hooks/use-firma-peru';
import { MOTIVOS_FIRMA, APARIENCIAS_FIRMA } from '@/lib/firma-peru';
import { FileSignature, Loader2, X, AlertCircle, CheckCircle } from 'lucide-react';

interface FirmaModalProps {
  isOpen: boolean;
  onClose: () => void;
  archivoIds: number[];
  archivoNombres?: string[];
  onSuccess?: () => void;
}

export function FirmaModal({ isOpen, onClose, archivoIds, archivoNombres, onSuccess }: FirmaModalProps) {
  const { firmarDocumentos, isLoading, error, clearError } = useFirmaPeru();

  const [nombreLote, setNombreLote] = useState('');
  const [motivo, setMotivo] = useState<string>(MOTIVOS_FIRMA.AUTOR.toString());
  const [apariencia, setApariencia] = useState<string>(APARIENCIAS_FIRMA.HORIZONTAL.toString());
  const [firmaExitosa, setFirmaExitosa] = useState(false);

  // Generar nombre del lote por defecto
  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const formatted = now.toLocaleString('es-PE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
      setNombreLote(`Lote ${formatted}`);
      setFirmaExitosa(false);
      clearError();
    }
  }, [isOpen, clearError]);

  // Escuchar eventos de Firma Perú
  useEffect(() => {
    const handleSuccess = () => {
      setFirmaExitosa(true);
      onSuccess?.();
    };

    const handleCancel = () => {
      // Opcional: mostrar mensaje de cancelación
    };

    window.addEventListener('firma-peru-success', handleSuccess);
    window.addEventListener('firma-peru-cancel', handleCancel);

    return () => {
      window.removeEventListener('firma-peru-success', handleSuccess);
      window.removeEventListener('firma-peru-cancel', handleCancel);
    };
  }, [onSuccess]);

  const handleSubmit = async () => {
    if (archivoIds.length === 0) {
      return;
    }

    await firmarDocumentos({
      archivo_ids: archivoIds,
      archivo_nombres: archivoNombres,
      motivo: parseInt(motivo) as 1 | 2,
      apariencia: parseInt(apariencia) as 1 | 2,
      nombre_lote: nombreLote,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md bg-white dark:bg-gray-900 rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <FileSignature className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold">Firma de Documentos</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {/* Mensaje de éxito */}
          {firmaExitosa && (
            <div className="flex items-center gap-2 p-3 text-green-800 bg-green-100 rounded-lg dark:bg-green-900/30 dark:text-green-400">
              <CheckCircle className="w-5 h-5" />
              <span>Documentos firmados correctamente</span>
            </div>
          )}

          {/* Mensaje de error */}
          {error && (
            <div className="flex items-center gap-2 p-3 text-red-800 bg-red-100 rounded-lg dark:bg-red-900/30 dark:text-red-400">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          )}

          {/* Info de archivos seleccionados */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              <strong>{archivoIds.length}</strong> documento(s) seleccionado(s) para firmar
            </p>
          </div>

          {/* Nombre del lote */}
          <div className="space-y-2">
            <Label htmlFor="nombreLote">Nombre del Lote</Label>
            <Input
              id="nombreLote"
              value={nombreLote}
              onChange={(e) => setNombreLote(e.target.value)}
              placeholder="Ej: Lote de documentos 2025-01"
            />
          </div>

          {/* Motivo de la firma */}
          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo de la firma</Label>
            <Select value={motivo} onValueChange={setMotivo}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccione el motivo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Soy el autor del documento</SelectItem>
                <SelectItem value="2">Doy V° B°</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Apariencia de la firma */}
          <div className="space-y-2">
            <Label htmlFor="apariencia">Apariencia de la firma</Label>
            <Select value={apariencia} onValueChange={setApariencia}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccione la apariencia" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Sello + Descripción Horizontal</SelectItem>
                <SelectItem value="2">Sello + Descripción Vertical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || archivoIds.length === 0}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <FileSignature className="w-4 h-4 mr-2" />
                Iniciar Firma
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
