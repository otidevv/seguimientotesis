'use client';

/**
 * Componente para inicializar los callbacks de Firma Perú (PCM)
 *
 * Este componente define los callbacks globales que Firma Perú necesita.
 * El script de Firma Perú se carga dinámicamente en el hook useFirmaPeru
 * cuando el usuario intenta firmar, evitando errores de DOM no disponible.
 */

import { useEffect } from 'react';
import Script from 'next/script';

// Declarar las funciones globales que Firma Perú espera
declare global {
  interface Window {
    signatureInit?: () => void;
    signatureOk?: () => void;
    signatureCancel?: () => void;
    startSignature?: (port: number, params: string) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jqFirmaPeru?: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jQuery?: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    $?: any;
  }
}

export function FirmaPeruScripts() {
  useEffect(() => {
    // Definir callbacks globales que Firma Perú espera
    window.signatureInit = () => {
      console.log('[Firma Perú] Proceso iniciado');
      window.dispatchEvent(new CustomEvent('firma-peru-init'));
    };

    window.signatureOk = () => {
      console.log('[Firma Perú] Firma completada exitosamente');
      window.dispatchEvent(new CustomEvent('firma-peru-success'));
    };

    window.signatureCancel = () => {
      console.log('[Firma Perú] Firma cancelada por el usuario');
      window.dispatchEvent(new CustomEvent('firma-peru-cancel'));
    };

    // Asegurar que jQuery está disponible globalmente para Firma Perú
    if (window.jqFirmaPeru && !window.$) {
      window.$ = window.jqFirmaPeru;
    }

    console.log('[Firma Perú] Callbacks inicializados');

    return () => {
      // Limpiar al desmontar
      delete window.signatureInit;
      delete window.signatureOk;
      delete window.signatureCancel;
    };
  }, []);

  // jQuery + init solo se carga cuando este componente está montado (ruta firma-peru)
  return (
    <>
      <Script
        src="https://ajax.googleapis.com/ajax/libs/jquery/3.6.0/jquery.min.js"
        strategy="lazyOnload"
        id="jquery-firma-peru"
      />
      <Script id="jquery-init-firma-peru" strategy="lazyOnload">{`
        (function check(){
          if(typeof jQuery!=='undefined'){
            var jq=jQuery.noConflict(true);window.jqFirmaPeru=jq;
          } else { setTimeout(check,100); }
        })();
      `}</Script>
    </>
  );
}
