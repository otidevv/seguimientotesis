'use client';

/**
 * Hook personalizado para integrar Firma Perú
 *
 * Uso:
 * const { firmarDocumentos, isLoading, error } = useFirmaPeru();
 *
 * await firmarDocumentos({
 *   archivo_ids: [1, 2, 3],
 *   motivo: 1,
 *   apariencia: 1,
 *   nombre_lote: 'Mi lote'
 * });
 */

import { useState, useCallback, useRef } from 'react';
import {
  FIRMA_PERU_PORT,
  FIRMA_PERU_STATIC_TOKEN,
  type FirmaLoteRequest,
  type FirmaPeruParams,
} from '@/lib/firma-peru';

// Declarar la función global de Firma Perú
declare global {
  interface Window {
    startSignature?: (port: number, params: string) => void;
  }
}

// Función para preparar el contenedor de ClickOnce
function prepareClickOnceContainer(): void {
  // Asegurar que jQuery está disponible globalmente
  if (window.jqFirmaPeru) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).$ = window.jqFirmaPeru;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).jQuery = window.jqFirmaPeru;
  }

  // El script de Firma Perú necesita un iframe donde cargar ClickOnce
  // Crear varios elementos que el script podría necesitar

  // Iframe principal para ClickOnce
  if (!document.getElementById('FirmaPeruFrame')) {
    const iframe = document.createElement('iframe');
    iframe.id = 'FirmaPeruFrame';
    iframe.name = 'FirmaPeruFrame';
    iframe.style.cssText = 'display:none;width:0;height:0;border:none;position:absolute;';
    document.body.appendChild(iframe);
  }

  // Iframe alternativo que usa el script
  if (!document.getElementById('iframeClickOnce')) {
    const iframe2 = document.createElement('iframe');
    iframe2.id = 'iframeClickOnce';
    iframe2.name = 'iframeClickOnce';
    iframe2.style.cssText = 'display:none;width:0;height:0;border:none;position:absolute;';
    document.body.appendChild(iframe2);
  }

  // Div contenedor
  if (!document.getElementById('FirmaPeruContainer')) {
    const container = document.createElement('div');
    container.id = 'FirmaPeruContainer';
    container.style.cssText = 'display:none;';
    document.body.appendChild(container);
  }

  // Div para el servicio ClickOnce
  if (!document.getElementById('clickOnceDiv')) {
    const clickOnceDiv = document.createElement('div');
    clickOnceDiv.id = 'clickOnceDiv';
    clickOnceDiv.style.cssText = 'display:none;';
    document.body.appendChild(clickOnceDiv);
  }

  console.log('[Firma Perú] Contenedores preparados');
}

// Función para cargar el script de Firma Perú dinámicamente
function loadFirmaPeruScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Preparar contenedores primero
    prepareClickOnceContainer();

    // Si ya está cargado, resolver inmediatamente
    if (window.startSignature) {
      resolve();
      return;
    }

    // Verificar si el script ya existe
    if (document.getElementById('firma-peru-client')) {
      // Esperar a que cargue
      const checkLoaded = setInterval(() => {
        if (window.startSignature) {
          clearInterval(checkLoaded);
          resolve();
        }
      }, 100);

      // Timeout después de 10 segundos
      setTimeout(() => {
        clearInterval(checkLoaded);
        if (window.startSignature) {
          resolve();
        } else {
          reject(new Error('Timeout cargando script de Firma Perú'));
        }
      }, 10000);
      return;
    }

    // Crear y cargar el script
    const script = document.createElement('script');
    script.id = 'firma-peru-client';
    script.src = 'https://apps.firmaperu.gob.pe/web/clienteweb/firmaperu.min.js';
    script.async = true;

    script.onload = () => {
      console.log('[Firma Perú] Script cargado correctamente');
      // Esperar un momento para que el script se inicialice
      setTimeout(() => {
        if (window.startSignature) {
          resolve();
        } else {
          reject(new Error('Script cargado pero startSignature no disponible'));
        }
      }, 500);
    };

    script.onerror = () => {
      reject(new Error('Error al cargar el script de Firma Perú'));
    };

    document.body.appendChild(script);
  });
}

interface UseFirmaPeruReturn {
  firmarDocumentos: (params: FirmaLoteRequest) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

export function useFirmaPeru(): UseFirmaPeruReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scriptLoadedRef = useRef(false);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const firmarDocumentos = useCallback(async (params: FirmaLoteRequest) => {
    setIsLoading(true);
    setError(null);

    try {
      // Cargar el script de Firma Perú si no está disponible
      if (typeof window === 'undefined') {
        throw new Error('Este hook solo funciona en el navegador');
      }

      if (!window.startSignature && !scriptLoadedRef.current) {
        console.log('[Firma Perú] Cargando script...');
        await loadFirmaPeruScript();
        scriptLoadedRef.current = true;
      }

      // Verificar que el cliente de Firma Perú está disponible
      if (!window.startSignature) {
        throw new Error(
          'El cliente de Firma Perú no está disponible. ' +
          'Asegúrese de tener instalado el cliente de Firma Perú y el plugin ClickOnce.'
        );
      }

      // Asegurar que los contenedores existen antes de firmar
      prepareClickOnceContainer();

      // 1. Enviar parámetros al backend
      const response = await fetch('/api/firma-peru/argumentos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al preparar la firma');
      }

      const { token_lote } = await response.json();

      // 2. Construir URL para el cliente de Firma Perú
      const baseUrl = window.location.origin;
      const argumentosUrl = `${baseUrl}/api/firma-peru/argumentos?token_lote=${token_lote}`;

      // 3. Crear parámetros para Firma Perú
      const firmaParams: FirmaPeruParams = {
        param_url: argumentosUrl,
        param_token: FIRMA_PERU_STATIC_TOKEN,
        document_extension: 'pdf',
      };

      // 4. Convertir a Base64
      const paramsString = JSON.stringify(firmaParams);
      const base64Params = btoa(paramsString);

      // 5. Iniciar el cliente de Firma Perú
      console.log('[Firma Perú] Iniciando firma con parámetros:', firmaParams);
      window.startSignature(FIRMA_PERU_PORT, base64Params);

      // Nota: El proceso de firma continúa en el cliente de escritorio
      // El resultado se recibe en /api/firma-peru/lote/[codigo]/cargar

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      console.error('[Firma Perú] Error:', errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    firmarDocumentos,
    isLoading,
    error,
    clearError,
  };
}

/**
 * Funciones de callback para eventos de Firma Perú
 * Estas funciones son llamadas por el cliente de Firma Perú
 */

// Callback cuando se inicia la firma
export function onFirmaInit(): void {
  console.log('[Firma Perú] Proceso de firma iniciado');
}

// Callback cuando la firma es exitosa
export function onFirmaSuccess(): void {
  console.log('[Firma Perú] Documentos firmados correctamente');
  // Aquí puedes disparar una notificación o actualizar el estado
  window.dispatchEvent(new CustomEvent('firma-peru-success'));
}

// Callback cuando se cancela la firma
export function onFirmaCancel(): void {
  console.log('[Firma Perú] Proceso de firma cancelado');
  window.dispatchEvent(new CustomEvent('firma-peru-cancel'));
}

// Callback cuando hay un error
export function onFirmaError(message: string): void {
  console.error('[Firma Perú] Error:', message);
  window.dispatchEvent(new CustomEvent('firma-peru-error', { detail: message }));
}
