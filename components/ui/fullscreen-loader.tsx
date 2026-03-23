'use client'

import Image from 'next/image'

interface FullscreenLoaderProps {
  /** Controla la visibilidad del loader */
  visible: boolean
  /** Título principal */
  title?: string
  /** Descripción debajo del título */
  description?: string
  /** Ruta del logo (default: /logo/logounamad.png) */
  logoSrc?: string
}

export function FullscreenLoader({
  visible,
  title = 'Procesando',
  description = 'Por favor espera un momento...',
  logoSrc = '/logo/logounamad.png',
}: FullscreenLoaderProps) {
  if (!visible) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="flex flex-col items-center gap-6 animate-in zoom-in-95 fade-in duration-500">
        {/* Logo con animación de pulso */}
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping [animation-duration:2s]" />
          <div className="relative w-24 h-24 rounded-full bg-white dark:bg-card shadow-2xl flex items-center justify-center ring-4 ring-primary/10">
            <Image
              src={logoSrc}
              alt="Logo"
              width={64}
              height={64}
              className="rounded-full animate-pulse [animation-duration:2s]"
            />
          </div>
        </div>

        {/* Texto */}
        <div className="flex flex-col items-center gap-3">
          <h3 className="text-xl font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground text-center max-w-xs">
            {description}
          </p>
        </div>

        {/* Barra de progreso animada */}
        <div className="w-64 h-1.5 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-primary rounded-full animate-[loading-bar_2s_ease-in-out_infinite]" />
        </div>

        <style jsx>{`
          @keyframes loading-bar {
            0% { width: 0%; margin-left: 0%; }
            50% { width: 60%; margin-left: 20%; }
            100% { width: 0%; margin-left: 100%; }
          }
        `}</style>
      </div>
    </div>
  )
}
