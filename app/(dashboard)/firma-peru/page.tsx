'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { FirmaModal } from '@/components/firma-peru';
import {
  FileSignature,
  FileText,
  CheckCircle2,
  Clock,
  Info,
  RefreshCw,
  Loader2,
  Download,
  Chrome,
  Globe,
  ExternalLink,
  ShieldCheck,
  ListChecks,
  Puzzle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Documento {
  id: number;
  nombre: string;
  ruta: string;
  tamano: number;
  estado: 'pendiente' | 'firmado';
}

type Navegador = 'chrome' | 'edge' | 'otro';

const EXTENSION_CONFIG: Record<Navegador, { href: string; label: string; icon: typeof Chrome; nombre: string }> = {
  chrome: {
    href: 'https://chromewebstore.google.com/detail/logalty-clickonce/didfpaehajfbjnamladanbocmdhahfch?hl=es',
    label: 'Extensión para Chrome',
    icon: Chrome,
    nombre: 'Logalty ClickOnce',
  },
  edge: {
    href: 'https://chromewebstore.google.com/detail/cegid-peoplenet-clickonce/jkncabbipkgbconhaajbapbhokpbgkdc',
    label: 'Extensión para Edge',
    icon: Globe,
    nombre: 'ClickOnce',
  },
  otro: {
    href: 'https://chromewebstore.google.com/detail/logalty-clickonce/didfpaehajfbjnamladanbocmdhahfch?hl=es',
    label: 'Extensión para Chrome',
    icon: Chrome,
    nombre: 'Logalty ClickOnce',
  },
};

function SetupStep({
  step,
  icon: Icon,
  title,
  description,
  href,
}: {
  step: number;
  icon: typeof Download;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative flex items-center gap-4 rounded-xl border border-border/60 bg-card p-4 transition-all duration-200 hover:border-primary/40 hover:shadow-md hover:shadow-primary/5"
    >
      <div className="relative flex-shrink-0">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
          <Icon className="h-5 w-5" />
        </div>
        <span className="absolute -top-1.5 -left-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
          {step}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-tight">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <ExternalLink className="h-4 w-4 flex-shrink-0 text-muted-foreground/0 transition-all group-hover:text-muted-foreground" />
    </a>
  );
}

export default function FirmaPeruPage() {
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [seleccionados, setSeleccionados] = useState<number[]>([]);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [navegador, setNavegador] = useState<Navegador>('otro');

  useEffect(() => {
    const ua = navigator.userAgent;
    if (ua.includes('Edg/')) setNavegador('edge');
    else if (ua.includes('Chrome/')) setNavegador('chrome');
  }, []);

  const cargarDocumentos = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const result = await api.get<{ documentos: { id: number; nombre: string; ruta: string; tamano: number }[] }>('/api/firma-peru/documentos');
      setDocumentos(
        result.documentos
          ? result.documentos.map((doc) => ({ ...doc, estado: 'pendiente' as const }))
          : []
      );
    } catch {
      setError('Error al cargar los documentos');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDocumentos();
  }, [cargarDocumentos]);

  useEffect(() => {
    const handleFirmaExitosa = () => {
      setDocumentos((prev) =>
        prev.map((doc) =>
          seleccionados.includes(doc.id) ? { ...doc, estado: 'firmado' } : doc
        )
      );
      setSeleccionados([]);
    };
    window.addEventListener('firma-peru-success', handleFirmaExitosa);
    return () => window.removeEventListener('firma-peru-success', handleFirmaExitosa);
  }, [seleccionados]);

  const toggleSeleccion = (id: number) => {
    setSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const seleccionarTodos = () => {
    setSeleccionados(documentos.filter((d) => d.estado === 'pendiente').map((d) => d.id));
  };

  const pendientes = documentos.filter((d) => d.estado === 'pendiente');
  const firmados = documentos.filter((d) => d.estado === 'firmado');
  const ext = EXTENSION_CONFIG[navegador];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Firma Digital</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Firme documentos digitalmente con Firma Perú (PCM)
          </p>
        </div>

        {/* Stats */}
        <div className="flex gap-3">
          <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
            <Clock className="h-4 w-4 text-amber-500" />
            <div className="text-right">
              <p className="text-lg font-bold leading-none">{pendientes.length}</p>
              <p className="text-[10px] text-muted-foreground">Pendientes</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <div className="text-right">
              <p className="text-lg font-bold leading-none">{firmados.length}</p>
              <p className="text-[10px] text-muted-foreground">Firmados</p>
            </div>
          </div>
        </div>
      </div>

      {/* Setup Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <ShieldCheck className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-sm">Configurar Firma Digital</CardTitle>
                <CardDescription className="text-xs">Instale estos 2 componentes para firmar</CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="hidden text-xs sm:inline-flex">
              {navegador === 'edge' ? 'Microsoft Edge' : navegador === 'chrome' ? 'Google Chrome' : 'Navegador'} detectado
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            <SetupStep
              step={1}
              icon={Download}
              title="Firmador de documentos"
              description="Descargar e instalar para Windows"
              href="https://apps.firmaperu.gob.pe/web/firmador.xhtml"
            />
            <SetupStep
              step={2}
              icon={Puzzle}
              title={ext.label}
              description={`Instalar ${ext.nombre}`}
              href={ext.href}
            />
          </div>
          <p className="mt-3 flex items-start gap-1.5 text-[11px] text-muted-foreground">
            <Info className="mt-0.5 h-3 w-3 flex-shrink-0" />
            Requiere certificado digital vigente (DNIe o certificado emitido por entidad acreditada).
          </p>
        </CardContent>
      </Card>

      {/* Documents Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <ListChecks className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-sm">Documentos</CardTitle>
                <CardDescription className="text-xs">
                  {seleccionados.length > 0
                    ? `${seleccionados.length} de ${pendientes.length} seleccionado${seleccionados.length !== 1 ? 's' : ''}`
                    : 'Seleccione los documentos a firmar'}
                </CardDescription>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={cargarDocumentos}
                disabled={cargando}
                className="h-8"
              >
                {cargando ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                )}
                Actualizar
              </Button>
              {pendientes.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={seleccionarTodos}
                  className="h-8"
                >
                  Seleccionar todo
                </Button>
              )}
              <Button
                size="sm"
                onClick={() => setModalAbierto(true)}
                disabled={seleccionados.length === 0}
                className="h-8"
              >
                <FileSignature className="mr-1.5 h-3.5 w-3.5" />
                Firmar ({seleccionados.length})
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {cargando ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="mt-3 text-sm">Cargando documentos...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-destructive">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <Info className="h-6 w-6" />
              </div>
              <p className="mt-3 text-sm font-medium">{error}</p>
              <Button variant="outline" size="sm" onClick={cargarDocumentos} className="mt-3">
                Reintentar
              </Button>
            </div>
          ) : documentos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                <FileText className="h-7 w-7" />
              </div>
              <p className="mt-3 text-sm font-medium">No hay documentos disponibles</p>
              <p className="mt-1 text-xs">
                Coloca archivos PDF en <code className="rounded bg-muted px-1.5 py-0.5 text-[11px]">public/documentos/</code>
              </p>
            </div>
          ) : (
            <div className="divide-y rounded-lg border">
              {documentos.map((doc) => {
                const selected = seleccionados.includes(doc.id);
                const firmado = doc.estado === 'firmado';

                return (
                  <div
                    key={doc.id}
                    onClick={() => !firmado && toggleSeleccion(doc.id)}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 transition-colors',
                      firmado
                        ? 'bg-muted/30 opacity-60'
                        : 'cursor-pointer hover:bg-accent/50',
                      selected && !firmado && 'bg-primary/5'
                    )}
                  >
                    <Checkbox
                      checked={selected}
                      onCheckedChange={() => toggleSeleccion(doc.id)}
                      disabled={firmado}
                      className="flex-shrink-0"
                    />

                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-red-50 dark:bg-red-950/30">
                      <FileText className="h-4 w-4 text-red-500" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{doc.nombre}</p>
                      <p className="text-xs text-muted-foreground">
                        {doc.tamano >= 1024 * 1024
                          ? `${(doc.tamano / (1024 * 1024)).toFixed(1)} MB`
                          : `${(doc.tamano / 1024).toFixed(1)} KB`}
                      </p>
                    </div>

                    {firmado ? (
                      <Badge variant="outline" className="flex-shrink-0 gap-1 border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" />
                        Firmado
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="flex-shrink-0 gap-1 border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-400">
                        <Clock className="h-3 w-3" />
                        Pendiente
                      </Badge>
                    )}
                  </div>
                );
              })}
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
          .filter((doc) => seleccionados.includes(doc.id))
          .map((doc) => doc.nombre)}
        onSuccess={() => setModalAbierto(false)}
      />
    </div>
  );
}
