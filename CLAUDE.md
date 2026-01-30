# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

Sistema de seguimiento de tesis universitarias.

## Commands

- `npm run dev` - Start development server (http://localhost:3000)
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Architecture

This is a Next.js 16 project using the App Router pattern with:

- **React 19** with Server Components by default
- **TypeScript** with strict mode enabled
- **Tailwind CSS 4** for styling (via @tailwindcss/postcss)
- **ESLint 9** with Next.js core-web-vitals and TypeScript configs

### Project Structure

- `app/` - App Router pages and layouts
  - `layout.tsx` - Root layout with Geist font configuration
  - `page.tsx` - Home page (Server Component)
  - `globals.css` - Global styles and Tailwind imports
- `public/` - Static assets

### Path Alias

Use `@/*` to import from the project root (configured in tsconfig.json).

## Firma Perú (PCM)

Sistema de firma digital integrado con Firma Perú del Estado Peruano.

### Configuración

1. Configurar variables de entorno en `.env.local`:
   - `PCM_CLIENT_ID` - Client ID de Firma Perú
   - `PCM_CLIENT_SECRET` - Client Secret de Firma Perú
   - `NEXT_PUBLIC_APP_URL` - URL base de la aplicación

2. Obtener credenciales en: https://apps.firmaperu.gob.pe

### Estructura de archivos

- `lib/firma-peru/` - Módulo de integración (tipos, token, storage)
- `app/api/firma-peru/` - API Routes para la firma
- `components/firma-peru/` - Componentes de UI
- `hooks/use-firma-peru.ts` - Hook personalizado

### Uso básico

```tsx
import { useFirmaPeru } from '@/hooks/use-firma-peru';
import { FirmaModal } from '@/components/firma-peru';

const { firmarDocumentos, isLoading, error } = useFirmaPeru();

await firmarDocumentos({
  archivo_ids: [1, 2, 3],
  motivo: 1,
  apariencia: 1,
  nombre_lote: 'Mi lote'
});
```

### Página de ejemplo

Visitar `/firma-peru` para ver un ejemplo de implementación.
