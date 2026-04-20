# Desistimiento de Tesis — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar flujo de aprobación de desistimiento con historial estructurado, versionado de resoluciones modificatorias, y reportes agregables (por motivo, facultad/carrera, fase) con export Excel.

**Architecture:** Extender el schema con tabla dedicada `ThesisWithdrawal` + enums `MotivoDesistimiento` y `EstadoSolicitudDesistimiento`. Introducir estado `SOLICITUD_DESISTIMIENTO` entre el pedido del tesista y la decisión de mesa de partes. Reutilizar la lógica de transición de autor ya existente (promover coautor / marcar `DESISTIDA`). Documentos de resolución se versionan con flag `esModificatoria` + `reemplazaDocumentoId`.

**Tech Stack:** Next.js 16 (App Router), React 19, Prisma 7 + PostgreSQL, TypeScript, Tailwind 4, shadcn/ui (Radix), ExcelJS, Recharts, Zod, Sonner.

**Verificación sin framework de tests:** el proyecto no tiene Jest/Vitest. Cada tarea termina con `npx tsc --noEmit`, `npm run lint` y, para tareas de UI, un smoke test manual descrito explícitamente. No instalar framework de tests — está fuera de alcance.

**Convenciones del repo observadas:**
- API routes: `NextRequest` → `NextResponse.json`, usar `getCurrentUser(request)` y `checkPermission(userId, moduleCode, action)` (de `@/lib/auth`).
- Prisma vía `import { prisma } from '@/lib/prisma'`.
- Notificaciones vía `import { crearNotificacion } from '@/lib/notificaciones'`.
- Componentes shadcn/ui ya instalados: `card`, `button`, `badge`, `dialog`, `select`, `input`, `textarea`, `label`, `table`, `tabs`, `alert`, `sonner`, `chart` (recharts wrapper).
- Commit style: se observan mensajes cortos en español (`cambios desisitir`, `roles permision admin dashboard`). Seguir ese estilo.

---

## File map

### Archivos NUEVOS

```
prisma/migrations/20260418120000_add_thesis_withdrawal/migration.sql
prisma/scripts/migrate-withdrawals-legacy.ts
lib/constants/motivos-desistimiento.ts
lib/desistimiento/transiciones.ts
lib/excel/reporte-desistimientos.ts
app/api/tesis/[id]/desistir/solicitar/route.ts
app/api/tesis/[id]/desistir/cancelar/route.ts
app/api/mesa-partes/desistimientos/route.ts
app/api/mesa-partes/desistimientos/[id]/route.ts
app/api/mesa-partes/desistimientos/[id]/aprobar/route.ts
app/api/mesa-partes/desistimientos/[id]/rechazar/route.ts
app/api/mesa-partes/desistimientos/reporte/route.ts
app/(dashboard)/mesa-partes/desistimientos/page.tsx
app/(dashboard)/mesa-partes/desistimientos/[id]/page.tsx
app/(dashboard)/mesa-partes/reportes/desistimientos/page.tsx
components/desistimiento/modal-solicitar-desistimiento.tsx
components/desistimiento/panel-aprobacion.tsx
components/desistimiento/lista-desistimientos.tsx
components/desistimiento/reporte-dashboard.tsx
components/desistimiento/constants.tsx
```

### Archivos MODIFICADOS

```
prisma/schema.prisma
components/tesis/constants.tsx
app/api/tesis/[id]/desistir/route.ts            # redirigir al nuevo flujo
app/(dashboard)/mis-tesis/[id]/page.tsx         # integrar modal + banner
app/(dashboard)/mesa-partes/[id]/page.tsx       # reemplazar alert string-match
app/(dashboard)/perfil/page.tsx                 # link "Mis desistimientos"
```

---

## Task 1: Schema, enums y migración de base de datos

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260418120000_add_thesis_withdrawal/migration.sql`

- [ ] **Step 1: Añadir enums y nuevo valor `SOLICITUD_DESISTIMIENTO` a `EstadoTesis`**

Editar `prisma/schema.prisma`. Localizar el enum `EstadoTesis` (línea ~455) y añadir al final, **antes de `@@map`**:

```prisma
  SOLICITUD_DESISTIMIENTO // Tesista solicitó desistir, esperando mesa de partes
```

Inmediatamente después de `EstadoAutor` (línea ~522), añadir:

```prisma
enum MotivoDesistimiento {
  PERSONAL_FAMILIAR
  ECONOMICO
  SALUD
  LABORAL
  CAMBIO_TEMA
  PROBLEMA_ASESOR
  PROBLEMA_COAUTOR
  FALTA_TIEMPO
  CAMBIO_CARRERA
  OTRO

  @@map("motivo_desistimiento")
}

enum EstadoSolicitudDesistimiento {
  PENDIENTE
  APROBADO
  RECHAZADO
  CANCELADO

  @@map("estado_solicitud_desistimiento")
}
```

- [ ] **Step 2: Añadir campos de linaje a `ThesisDocument`**

En el modelo `ThesisDocument` (línea ~673), dentro del bloque antes de `// Timestamps`, añadir:

```prisma
  // Versionado de modificatorias
  esModificatoria        Boolean   @default(false) @map("es_modificatoria")
  reemplazaDocumentoId   String?   @map("reemplaza_documento_id")
```

Y en la sección `// Relaciones` del mismo modelo, añadir:

```prisma
  reemplazaDocumento     ThesisDocument?  @relation("DocumentoModificatorias", fields: [reemplazaDocumentoId], references: [id])
  modificatorias         ThesisDocument[] @relation("DocumentoModificatorias")
  desistimientosAsociados ThesisWithdrawal[] @relation("ResolucionDesistimiento")
```

- [ ] **Step 3: Añadir modelo `ThesisWithdrawal`**

Inmediatamente después del modelo `ThesisStatusHistory` (línea ~725), añadir:

```prisma
/// Historial estructurado de desistimientos (para reportes)
model ThesisWithdrawal {
  id                    String     @id @default(cuid())
  thesisId              String     @map("thesis_id")
  thesisAuthorId        String     @map("thesis_author_id")
  userId                String     @map("user_id")
  studentCareerId       String     @map("student_career_id")

  // Motivo híbrido
  motivoCategoria       MotivoDesistimiento @map("motivo_categoria")
  motivoDescripcion     String     @map("motivo_descripcion") @db.Text

  // Estado de la solicitud
  estadoSolicitud       EstadoSolicitudDesistimiento @default(PENDIENTE) @map("estado_solicitud")
  solicitadoAt          DateTime   @default(now()) @map("solicitado_at")
  aprobadoPorId         String?    @map("aprobado_por_id")
  aprobadoAt            DateTime?  @map("aprobado_at")
  motivoRechazoMesaPartes String?  @map("motivo_rechazo_mesa_partes") @db.Text
  resolucionDocumentoId String?    @map("resolucion_documento_id")

  // Snapshots inmutables para reportes
  estadoTesisAlSolicitar EstadoTesis @map("estado_tesis_al_solicitar")
  faseActual            String?    @map("fase_actual") @db.VarChar(20)
  teniaCoautor          Boolean    @map("tenia_coautor")
  facultadIdSnapshot    String     @map("facultad_id_snapshot")
  carreraNombreSnapshot String     @map("carrera_nombre_snapshot") @db.VarChar(150)

  createdAt             DateTime   @default(now()) @map("created_at")
  updatedAt             DateTime   @updatedAt @map("updated_at")

  thesis                Thesis          @relation(fields: [thesisId], references: [id], onDelete: Cascade)
  thesisAuthor          ThesisAuthor    @relation(fields: [thesisAuthorId], references: [id])
  user                  User            @relation("DesistimientosUsuario", fields: [userId], references: [id])
  aprobadoPor           User?           @relation("DesistimientosAprobados", fields: [aprobadoPorId], references: [id])
  resolucionDocumento   ThesisDocument? @relation("ResolucionDesistimiento", fields: [resolucionDocumentoId], references: [id])
  studentCareer         StudentCareer   @relation(fields: [studentCareerId], references: [id])
  facultadSnapshot      Faculty         @relation("FacultadDesistimientos", fields: [facultadIdSnapshot], references: [id])

  @@index([userId])
  @@index([thesisId])
  @@index([estadoSolicitud])
  @@index([motivoCategoria])
  @@index([createdAt])
  @@index([facultadIdSnapshot])
  @@map("thesis_withdrawals")
}
```

- [ ] **Step 4: Añadir relaciones inversas a modelos existentes**

En `Thesis` (línea ~606, sección Relaciones), añadir:
```prisma
  desistimientos       ThesisWithdrawal[]
```

En `User` (línea ~85, sección "Relaciones con tesis"), añadir:
```prisma
  desistimientos        ThesisWithdrawal[] @relation("DesistimientosUsuario")
  desistimientosAprobados ThesisWithdrawal[] @relation("DesistimientosAprobados")
```

En `StudentCareer` (línea ~120, sección Relaciones), añadir:
```prisma
  desistimientos    ThesisWithdrawal[]
```

En `Faculty` (línea ~165, sección Relaciones), añadir:
```prisma
  desistimientos  ThesisWithdrawal[] @relation("FacultadDesistimientos")
```

En `ThesisAuthor` (línea ~637, sección Relaciones), añadir:
```prisma
  desistimiento   ThesisWithdrawal?
```

(Se declara como opcional singular: solo puede haber un desistimiento por autor.)

Y añadir la restricción de unicidad al final del bloque `ThesisAuthor`, antes de `@@map`:
```prisma
```
(No hay restricción a nivel Prisma para 1-1 en este caso; el `@@unique([thesisAuthorId])` se añade en la tabla `ThesisWithdrawal`. Editar el modelo `ThesisWithdrawal` añadido arriba para agregar `@@unique([thesisAuthorId])` después de los `@@index`, antes de `@@map("thesis_withdrawals")`.)

- [ ] **Step 5: Crear el archivo de migración SQL manual**

Porque Prisma no regenera bien los enums al usar `migrate dev` cuando mezclan valores nuevos y modelos nuevos, crear manualmente el archivo:

```bash
mkdir -p "prisma/migrations/20260418120000_add_thesis_withdrawal"
```

Crear `prisma/migrations/20260418120000_add_thesis_withdrawal/migration.sql` con el contenido:

```sql
-- AlterEnum: añadir SOLICITUD_DESISTIMIENTO al enum estado_tesis
ALTER TYPE "estado_tesis" ADD VALUE IF NOT EXISTS 'SOLICITUD_DESISTIMIENTO';

-- CreateEnum: motivo_desistimiento
DO $$ BEGIN
  CREATE TYPE "motivo_desistimiento" AS ENUM (
    'PERSONAL_FAMILIAR','ECONOMICO','SALUD','LABORAL','CAMBIO_TEMA',
    'PROBLEMA_ASESOR','PROBLEMA_COAUTOR','FALTA_TIEMPO','CAMBIO_CARRERA','OTRO'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- CreateEnum: estado_solicitud_desistimiento
DO $$ BEGIN
  CREATE TYPE "estado_solicitud_desistimiento" AS ENUM (
    'PENDIENTE','APROBADO','RECHAZADO','CANCELADO'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- AlterTable: thesis_documents
ALTER TABLE "thesis_documents"
  ADD COLUMN IF NOT EXISTS "es_modificatoria" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "reemplaza_documento_id" TEXT;

ALTER TABLE "thesis_documents"
  DROP CONSTRAINT IF EXISTS "thesis_documents_reemplaza_documento_id_fkey",
  ADD CONSTRAINT "thesis_documents_reemplaza_documento_id_fkey"
    FOREIGN KEY ("reemplaza_documento_id") REFERENCES "thesis_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: thesis_withdrawals
CREATE TABLE IF NOT EXISTS "thesis_withdrawals" (
  "id" TEXT NOT NULL,
  "thesis_id" TEXT NOT NULL,
  "thesis_author_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "student_career_id" TEXT NOT NULL,
  "motivo_categoria" "motivo_desistimiento" NOT NULL,
  "motivo_descripcion" TEXT NOT NULL,
  "estado_solicitud" "estado_solicitud_desistimiento" NOT NULL DEFAULT 'PENDIENTE',
  "solicitado_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "aprobado_por_id" TEXT,
  "aprobado_at" TIMESTAMP(3),
  "motivo_rechazo_mesa_partes" TEXT,
  "resolucion_documento_id" TEXT,
  "estado_tesis_al_solicitar" "estado_tesis" NOT NULL,
  "fase_actual" VARCHAR(20),
  "tenia_coautor" BOOLEAN NOT NULL,
  "facultad_id_snapshot" TEXT NOT NULL,
  "carrera_nombre_snapshot" VARCHAR(150) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "thesis_withdrawals_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "thesis_withdrawals_thesis_author_id_key"
  ON "thesis_withdrawals"("thesis_author_id");
CREATE INDEX IF NOT EXISTS "thesis_withdrawals_user_id_idx" ON "thesis_withdrawals"("user_id");
CREATE INDEX IF NOT EXISTS "thesis_withdrawals_thesis_id_idx" ON "thesis_withdrawals"("thesis_id");
CREATE INDEX IF NOT EXISTS "thesis_withdrawals_estado_solicitud_idx" ON "thesis_withdrawals"("estado_solicitud");
CREATE INDEX IF NOT EXISTS "thesis_withdrawals_motivo_categoria_idx" ON "thesis_withdrawals"("motivo_categoria");
CREATE INDEX IF NOT EXISTS "thesis_withdrawals_created_at_idx" ON "thesis_withdrawals"("created_at");
CREATE INDEX IF NOT EXISTS "thesis_withdrawals_facultad_id_snapshot_idx" ON "thesis_withdrawals"("facultad_id_snapshot");

ALTER TABLE "thesis_withdrawals"
  ADD CONSTRAINT "thesis_withdrawals_thesis_id_fkey"
    FOREIGN KEY ("thesis_id") REFERENCES "thesis"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "thesis_withdrawals_thesis_author_id_fkey"
    FOREIGN KEY ("thesis_author_id") REFERENCES "thesis_authors"("id"),
  ADD CONSTRAINT "thesis_withdrawals_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id"),
  ADD CONSTRAINT "thesis_withdrawals_aprobado_por_id_fkey"
    FOREIGN KEY ("aprobado_por_id") REFERENCES "users"("id"),
  ADD CONSTRAINT "thesis_withdrawals_resolucion_documento_id_fkey"
    FOREIGN KEY ("resolucion_documento_id") REFERENCES "thesis_documents"("id"),
  ADD CONSTRAINT "thesis_withdrawals_student_career_id_fkey"
    FOREIGN KEY ("student_career_id") REFERENCES "student_careers"("id"),
  ADD CONSTRAINT "thesis_withdrawals_facultad_id_snapshot_fkey"
    FOREIGN KEY ("facultad_id_snapshot") REFERENCES "faculties"("id");
```

- [ ] **Step 6: Aplicar la migración y regenerar el cliente Prisma**

```bash
npx prisma migrate deploy
npx prisma generate
```

Expected output:
- `migrate deploy`: "1 migration applied" o "All migrations have been successfully applied."
- `generate`: "Generated Prisma Client in ... ms"

- [ ] **Step 7: Verificar typecheck**

```bash
npx tsc --noEmit
```

Expected: sin errores (el schema recién generado debe exponer `ThesisWithdrawal`, `MotivoDesistimiento`, `EstadoSolicitudDesistimiento`).

- [ ] **Step 8: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260418120000_add_thesis_withdrawal
git commit -m "db: tabla thesis_withdrawals y enums para desistimiento"
```

---

## Task 2: Constantes de motivos de desistimiento

**Files:**
- Create: `lib/constants/motivos-desistimiento.ts`
- Create: `components/desistimiento/constants.tsx`

- [ ] **Step 1: Crear lista de motivos con labels y descripciones**

`lib/constants/motivos-desistimiento.ts`:

```ts
import type { MotivoDesistimiento } from '@prisma/client'

export interface MotivoInfo {
  codigo: MotivoDesistimiento
  label: string
  descripcion: string
}

export const MOTIVOS_DESISTIMIENTO: MotivoInfo[] = [
  { codigo: 'PERSONAL_FAMILIAR', label: 'Personal / familiar',    descripcion: 'Situaciones personales o familiares' },
  { codigo: 'ECONOMICO',         label: 'Económico',              descripcion: 'Problemas económicos o falta de recursos' },
  { codigo: 'SALUD',             label: 'Salud',                  descripcion: 'Problemas de salud propios o de familiar' },
  { codigo: 'LABORAL',           label: 'Laboral',                descripcion: 'Trabajo que absorbe el tiempo disponible' },
  { codigo: 'CAMBIO_TEMA',       label: 'Cambio de tema',         descripcion: 'Decide cambiar el tema de investigación' },
  { codigo: 'PROBLEMA_ASESOR',   label: 'Problemas con asesor',   descripcion: 'Dificultades con el asesor de tesis' },
  { codigo: 'PROBLEMA_COAUTOR',  label: 'Problemas con coautor',  descripcion: 'Dificultades con el coautor' },
  { codigo: 'FALTA_TIEMPO',      label: 'Falta de tiempo',        descripcion: 'Sobrecarga académica u otros compromisos' },
  { codigo: 'CAMBIO_CARRERA',    label: 'Cambio de carrera',      descripcion: 'Cambio de carrera o de universidad' },
  { codigo: 'OTRO',              label: 'Otro',                   descripcion: 'Otro motivo no listado (describir en detalle)' },
]

export const MOTIVO_LABEL: Record<MotivoDesistimiento, string> =
  Object.fromEntries(MOTIVOS_DESISTIMIENTO.map(m => [m.codigo, m.label])) as Record<MotivoDesistimiento, string>
```

- [ ] **Step 2: Constants de UI (colores/íconos por categoría y estado)**

`components/desistimiento/constants.tsx`:

```tsx
import { Ban, CheckCircle2, Clock, XCircle } from 'lucide-react'
import type { EstadoSolicitudDesistimiento } from '@prisma/client'

export const ESTADO_SOLICITUD_CONFIG: Record<EstadoSolicitudDesistimiento, {
  label: string
  color: string
  bgColor: string
  icon: React.ReactNode
}> = {
  PENDIENTE:  { label: 'Pendiente',  color: 'text-yellow-700', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30', icon: <Clock className="w-4 h-4" /> },
  APROBADO:   { label: 'Aprobado',   color: 'text-green-700',  bgColor: 'bg-green-100  dark:bg-green-900/30',  icon: <CheckCircle2 className="w-4 h-4" /> },
  RECHAZADO:  { label: 'Rechazado',  color: 'text-red-700',    bgColor: 'bg-red-100    dark:bg-red-900/30',    icon: <XCircle className="w-4 h-4" /> },
  CANCELADO:  { label: 'Cancelado',  color: 'text-slate-700',  bgColor: 'bg-slate-100  dark:bg-slate-800',     icon: <Ban className="w-4 h-4" /> },
}

export const MOTIVO_COLOR: Record<string, string> = {
  PERSONAL_FAMILIAR: 'bg-purple-100 text-purple-800',
  ECONOMICO:         'bg-amber-100  text-amber-800',
  SALUD:             'bg-rose-100   text-rose-800',
  LABORAL:           'bg-blue-100   text-blue-800',
  CAMBIO_TEMA:       'bg-teal-100   text-teal-800',
  PROBLEMA_ASESOR:   'bg-orange-100 text-orange-800',
  PROBLEMA_COAUTOR:  'bg-orange-100 text-orange-800',
  FALTA_TIEMPO:      'bg-indigo-100 text-indigo-800',
  CAMBIO_CARRERA:    'bg-cyan-100   text-cyan-800',
  OTRO:              'bg-gray-100   text-gray-800',
}
```

- [ ] **Step 3: Typecheck + commit**

```bash
npx tsc --noEmit
git add lib/constants/motivos-desistimiento.ts components/desistimiento/constants.tsx
git commit -m "desistimiento: constantes de motivos y estados"
```

---

## Task 3: Helper de transiciones de estado

**Files:**
- Create: `lib/desistimiento/transiciones.ts`

Centraliza la lógica de "¿a qué estado retrocede la tesis cuando se aprueba un desistimiento?" — reutilizable entre el endpoint de solicitud (para snapshot) y el de aprobación.

- [ ] **Step 1: Crear helper**

`lib/desistimiento/transiciones.ts`:

```ts
import type { EstadoTesis } from '@prisma/client'

export const ESTADOS_PERMITIDOS_DESISTIMIENTO: EstadoTesis[] = [
  'BORRADOR',
  'EN_REVISION',
  'OBSERVADA',
  'ASIGNANDO_JURADOS',
  'EN_EVALUACION_JURADO',
  'OBSERVADA_JURADO',
  'PROYECTO_APROBADO',
]

const ESTADOS_RETROCEDE_BORRADOR: EstadoTesis[] = ['EN_REVISION', 'OBSERVADA']
const ESTADOS_RETROCEDE_JURADOS: EstadoTesis[] = [
  'ASIGNANDO_JURADOS', 'EN_EVALUACION_JURADO', 'OBSERVADA_JURADO', 'PROYECTO_APROBADO',
]

/**
 * Dado un estado previo de la tesis, retorna el estado al que debe ir
 * cuando un coautor desiste y el otro continúa solo.
 * - EN_REVISION / OBSERVADA → BORRADOR (reactualiza documentos)
 * - ASIGNANDO_JURADOS+ → ASIGNANDO_JURADOS (nueva resolución)
 * - BORRADOR → BORRADOR (sin cambio)
 */
export function estadoDestinoConCoautor(estadoPrevio: EstadoTesis): EstadoTesis {
  if (ESTADOS_RETROCEDE_BORRADOR.includes(estadoPrevio)) return 'BORRADOR'
  if (ESTADOS_RETROCEDE_JURADOS.includes(estadoPrevio)) return 'ASIGNANDO_JURADOS'
  return estadoPrevio
}

/**
 * True si al aprobar el desistimiento hay resolución vigente que
 * requiere modificatoria.
 */
export function requiereModificatoria(estadoPrevio: EstadoTesis): boolean {
  return ESTADOS_RETROCEDE_JURADOS.includes(estadoPrevio)
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
npx tsc --noEmit
git add lib/desistimiento/transiciones.ts
git commit -m "desistimiento: helper de transiciones de estado"
```

---

## Task 4: API — `POST /api/tesis/[id]/desistir/solicitar`

**Files:**
- Create: `app/api/tesis/[id]/desistir/solicitar/route.ts`

- [ ] **Step 1: Crear endpoint**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { crearNotificacion } from '@/lib/notificaciones'
import { ESTADOS_PERMITIDOS_DESISTIMIENTO } from '@/lib/desistimiento/transiciones'

const Body = z.object({
  motivoCategoria: z.enum([
    'PERSONAL_FAMILIAR','ECONOMICO','SALUD','LABORAL','CAMBIO_TEMA',
    'PROBLEMA_ASESOR','PROBLEMA_COAUTOR','FALTA_TIEMPO','CAMBIO_CARRERA','OTRO',
  ]),
  motivoDescripcion: z.string().min(20, 'La descripción debe tener al menos 20 caracteres').max(2000),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUser(request)
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const json = await request.json()
    const parsed = Body.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 })
    }

    const tesis = await prisma.thesis.findFirst({
      where: {
        id, deletedAt: null,
        autores: { some: { userId: user.id, estado: { in: ['PENDIENTE', 'ACEPTADO'] } } },
      },
      include: {
        autores: {
          include: {
            user: { select: { id: true, nombres: true, apellidoPaterno: true } },
            studentCareer: { include: { facultad: { select: { id: true, nombre: true } } } },
          },
        },
      },
    })
    if (!tesis) return NextResponse.json({ error: 'Tesis no encontrada' }, { status: 404 })

    if (!ESTADOS_PERMITIDOS_DESISTIMIENTO.includes(tesis.estado)) {
      return NextResponse.json({
        error: `No se puede desistir en estado "${tesis.estado}".`
      }, { status: 400 })
    }

    const miAutor = tesis.autores.find(a => a.user.id === user.id && a.estado !== 'DESISTIDO' && a.estado !== 'RECHAZADO')
    if (!miAutor) return NextResponse.json({ error: 'No eres autor activo' }, { status: 404 })

    // Detectar si ya existe solicitud pendiente para este autor
    const existente = await prisma.thesisWithdrawal.findUnique({ where: { thesisAuthorId: miAutor.id } })
    if (existente && existente.estadoSolicitud === 'PENDIENTE') {
      return NextResponse.json({ error: 'Ya tienes una solicitud de desistimiento pendiente' }, { status: 409 })
    }
    if (existente && existente.estadoSolicitud === 'APROBADO') {
      return NextResponse.json({ error: 'Ya existe un desistimiento aprobado' }, { status: 409 })
    }

    const teniaCoautor = tesis.autores.some(a => a.user.id !== user.id && a.estado === 'ACEPTADO')
    const facultadId = miAutor.studentCareer.facultadId
    const carreraNombre = miAutor.studentCareer.carreraNombre

    // Obtener usuarios con rol mesa-partes en la facultad para notificar
    const mesaPartesUsers = await prisma.userRole.findMany({
      where: {
        role: { codigo: 'MESA_PARTES' },
        OR: [
          { contextType: 'FACULTAD', contextId: facultadId },
          { contextType: null },
        ],
        isActive: true,
      },
      select: { userId: true },
    })

    const result = await prisma.$transaction(async (tx) => {
      // Si existe una RECHAZADA/CANCELADA previa, sobreescribimos (upsert lógico)
      const withdrawal = existente
        ? await tx.thesisWithdrawal.update({
            where: { id: existente.id },
            data: {
              motivoCategoria: parsed.data.motivoCategoria,
              motivoDescripcion: parsed.data.motivoDescripcion,
              estadoSolicitud: 'PENDIENTE',
              solicitadoAt: new Date(),
              aprobadoPorId: null,
              aprobadoAt: null,
              motivoRechazoMesaPartes: null,
              resolucionDocumentoId: null,
              estadoTesisAlSolicitar: tesis.estado,
              faseActual: tesis.faseActual ?? null,
              teniaCoautor,
              facultadIdSnapshot: facultadId,
              carreraNombreSnapshot: carreraNombre,
            },
          })
        : await tx.thesisWithdrawal.create({
            data: {
              thesisId: id,
              thesisAuthorId: miAutor.id,
              userId: user.id,
              studentCareerId: miAutor.studentCareerId,
              motivoCategoria: parsed.data.motivoCategoria,
              motivoDescripcion: parsed.data.motivoDescripcion,
              estadoSolicitud: 'PENDIENTE',
              estadoTesisAlSolicitar: tesis.estado,
              faseActual: tesis.faseActual ?? null,
              teniaCoautor,
              facultadIdSnapshot: facultadId,
              carreraNombreSnapshot: carreraNombre,
            },
          })

      // Cambiar estado de la tesis a SOLICITUD_DESISTIMIENTO via raw SQL
      // (el enum value puede no estar en el Prisma Client si se agregó en una migración separada)
      await tx.$executeRawUnsafe(
        `UPDATE thesis SET estado = 'SOLICITUD_DESISTIMIENTO', updated_at = NOW() WHERE id = $1`,
        id
      )

      await tx.thesisStatusHistory.create({
        data: {
          thesisId: id,
          estadoAnterior: tesis.estado,
          estadoNuevo: 'SOLICITUD_DESISTIMIENTO' as any,
          comentario: `Solicitud de desistimiento de ${miAutor.user.nombres} ${miAutor.user.apellidoPaterno}. Motivo: ${parsed.data.motivoCategoria}.`,
          changedById: user.id,
        },
      })

      return withdrawal
    })

    const nombre = `${miAutor.user.nombres} ${miAutor.user.apellidoPaterno}`
    if (mesaPartesUsers.length > 0) {
      await crearNotificacion({
        userId: mesaPartesUsers.map(u => u.userId),
        tipo: 'SOLICITUD_DESISTIMIENTO',
        titulo: 'Nueva solicitud de desistimiento',
        mensaje: `${nombre} solicitó desistir de la tesis "${tesis.titulo}".`,
        enlace: `/mesa-partes/desistimientos/${result.id}`,
      })
    }

    return NextResponse.json({
      message: 'Solicitud enviada. Mesa de partes revisará tu caso.',
      withdrawalId: result.id,
    })
  } catch (error) {
    console.error('[Desistir solicitar] Error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
npx tsc --noEmit
git add app/api/tesis/[id]/desistir/solicitar/route.ts
git commit -m "api: endpoint solicitar desistimiento"
```

---

## Task 5: API — `POST /api/tesis/[id]/desistir/cancelar`

**Files:**
- Create: `app/api/tesis/[id]/desistir/cancelar/route.ts`

- [ ] **Step 1: Crear endpoint**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUser(request)
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const tesis = await prisma.thesis.findFirst({
      where: { id, deletedAt: null },
      include: {
        autores: { where: { userId: user.id } },
        desistimientos: { where: { estadoSolicitud: 'PENDIENTE' }, orderBy: { createdAt: 'desc' }, take: 1 },
      },
    })
    if (!tesis) return NextResponse.json({ error: 'Tesis no encontrada' }, { status: 404 })

    const miAutor = tesis.autores[0]
    if (!miAutor) return NextResponse.json({ error: 'No eres autor de esta tesis' }, { status: 403 })

    const solicitud = tesis.desistimientos.find(d => d.thesisAuthorId === miAutor.id)
    if (!solicitud) {
      return NextResponse.json({ error: 'No tienes una solicitud pendiente' }, { status: 404 })
    }

    await prisma.$transaction(async (tx) => {
      await tx.thesisWithdrawal.update({
        where: { id: solicitud.id },
        data: { estadoSolicitud: 'CANCELADO' },
      })
      // Revertir estado de la tesis al previo (via raw por si el cliente no tiene el enum)
      await tx.$executeRawUnsafe(
        `UPDATE thesis SET estado = $1::"estado_tesis", updated_at = NOW() WHERE id = $2`,
        solicitud.estadoTesisAlSolicitar,
        id
      )
      await tx.thesisStatusHistory.create({
        data: {
          thesisId: id,
          estadoAnterior: 'SOLICITUD_DESISTIMIENTO' as any,
          estadoNuevo: solicitud.estadoTesisAlSolicitar,
          comentario: 'Cancelación de solicitud de desistimiento por el tesista.',
          changedById: user.id,
        },
      })
    })

    return NextResponse.json({ message: 'Solicitud cancelada.' })
  } catch (error) {
    console.error('[Desistir cancelar] Error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
npx tsc --noEmit
git add app/api/tesis/[id]/desistir/cancelar/route.ts
git commit -m "api: cancelar solicitud de desistimiento"
```

---

## Task 6: API — Listado de solicitudes para mesa de partes

**Files:**
- Create: `app/api/mesa-partes/desistimientos/route.ts`

- [ ] **Step 1: Crear endpoint**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, checkPermission } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const puede = await checkPermission(user.id, 'mesa-partes', 'view')
    if (!puede) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const estado = searchParams.get('estado') ?? 'PENDIENTE'
    const facultadId = searchParams.get('facultadId') ?? undefined
    const page = parseInt(searchParams.get('page') ?? '1', 10)
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') ?? '20', 10), 100)

    const where: any = {}
    if (estado !== 'TODOS') where.estadoSolicitud = estado
    if (facultadId) where.facultadIdSnapshot = facultadId

    const [total, items] = await Promise.all([
      prisma.thesisWithdrawal.count({ where }),
      prisma.thesisWithdrawal.findMany({
        where,
        orderBy: { solicitadoAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: { select: { nombres: true, apellidoPaterno: true, apellidoMaterno: true, numeroDocumento: true } },
          thesis: { select: { id: true, titulo: true, estado: true } },
          facultadSnapshot: { select: { nombre: true, codigo: true } },
        },
      }),
    ])

    return NextResponse.json({
      total, page, pageSize,
      items: items.map(w => ({
        id: w.id,
        thesisId: w.thesisId,
        tituloTesis: w.thesis.titulo,
        estudiante: `${w.user.apellidoPaterno} ${w.user.apellidoMaterno}, ${w.user.nombres}`,
        documento: w.user.numeroDocumento,
        carrera: w.carreraNombreSnapshot,
        facultad: w.facultadSnapshot.nombre,
        motivoCategoria: w.motivoCategoria,
        estadoSolicitud: w.estadoSolicitud,
        estadoTesisAlSolicitar: w.estadoTesisAlSolicitar,
        teniaCoautor: w.teniaCoautor,
        solicitadoAt: w.solicitadoAt,
        aprobadoAt: w.aprobadoAt,
      })),
    })
  } catch (error) {
    console.error('[Mesa-partes desistimientos list]', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
npx tsc --noEmit
git add app/api/mesa-partes/desistimientos/route.ts
git commit -m "api: listar solicitudes de desistimiento"
```

---

## Task 7: API — Detalle de solicitud

**Files:**
- Create: `app/api/mesa-partes/desistimientos/[id]/route.ts`

- [ ] **Step 1: Crear endpoint**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, checkPermission } from '@/lib/auth'
import { requiereModificatoria } from '@/lib/desistimiento/transiciones'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUser(request)
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const puede = await checkPermission(user.id, 'mesa-partes', 'view')
    if (!puede) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const w = await prisma.thesisWithdrawal.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, nombres: true, apellidoPaterno: true, apellidoMaterno: true, email: true, numeroDocumento: true } },
        thesis: {
          include: {
            autores: {
              include: {
                user: { select: { id: true, nombres: true, apellidoPaterno: true, apellidoMaterno: true } },
                studentCareer: { select: { codigoEstudiante: true, carreraNombre: true } },
              },
            },
            asesores: {
              include: { user: { select: { id: true, nombres: true, apellidoPaterno: true } } },
            },
            documentos: {
              where: { tipo: { in: ['RESOLUCION_JURADO', 'RESOLUCION_APROBACION'] }, esVersionActual: true },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
        facultadSnapshot: { select: { id: true, nombre: true, codigo: true } },
        resolucionDocumento: true,
        aprobadoPor: { select: { nombres: true, apellidoPaterno: true } },
      },
    })
    if (!w) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    const coautoresActivos = w.thesis.autores.filter(a => a.user.id !== w.userId && a.estado === 'ACEPTADO')

    return NextResponse.json({
      id: w.id,
      estadoSolicitud: w.estadoSolicitud,
      solicitadoAt: w.solicitadoAt,
      aprobadoAt: w.aprobadoAt,
      aprobadoPor: w.aprobadoPor ? `${w.aprobadoPor.nombres} ${w.aprobadoPor.apellidoPaterno}` : null,
      motivoCategoria: w.motivoCategoria,
      motivoDescripcion: w.motivoDescripcion,
      motivoRechazoMesaPartes: w.motivoRechazoMesaPartes,
      estadoTesisAlSolicitar: w.estadoTesisAlSolicitar,
      faseActual: w.faseActual,
      teniaCoautor: w.teniaCoautor,
      requiereModificatoria: requiereModificatoria(w.estadoTesisAlSolicitar),
      estudiante: {
        id: w.user.id,
        nombreCompleto: `${w.user.apellidoPaterno} ${w.user.apellidoMaterno}, ${w.user.nombres}`,
        email: w.user.email,
        documento: w.user.numeroDocumento,
        carrera: w.carreraNombreSnapshot,
        facultad: w.facultadSnapshot.nombre,
      },
      tesis: {
        id: w.thesis.id,
        titulo: w.thesis.titulo,
        estado: w.thesis.estado,
        coautoresActivos: coautoresActivos.map(c => ({
          id: c.user.id,
          nombre: `${c.user.apellidoPaterno} ${c.user.apellidoMaterno}, ${c.user.nombres}`,
          codigo: c.studentCareer.codigoEstudiante,
        })),
        asesores: w.thesis.asesores.map(a => ({
          id: a.user.id,
          nombre: `${a.user.nombres} ${a.user.apellidoPaterno}`,
          tipo: a.tipo,
        })),
        resolucionesVigentes: w.thesis.documentos.map(d => ({
          id: d.id, tipo: d.tipo, nombre: d.nombre, version: d.version, createdAt: d.createdAt,
        })),
      },
      resolucionModificatoria: w.resolucionDocumento ? {
        id: w.resolucionDocumento.id,
        nombre: w.resolucionDocumento.nombre,
      } : null,
    })
  } catch (error) {
    console.error('[Mesa-partes desistimiento detail]', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
npx tsc --noEmit
git add app/api/mesa-partes/desistimientos/[id]/route.ts
git commit -m "api: detalle de solicitud de desistimiento"
```

---

## Task 8: API — Aprobar (con upload de modificatoria + versionado)

**Files:**
- Create: `app/api/mesa-partes/desistimientos/[id]/aprobar/route.ts`

Este es el endpoint más complejo. Acepta `multipart/form-data` con el archivo de la resolución modificatoria (obligatorio si hubo resolución previa) y opcionalmente archivos de aprobación también.

- [ ] **Step 1: Crear endpoint**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, checkPermission } from '@/lib/auth'
import { crearNotificacion } from '@/lib/notificaciones'
import { estadoDestinoConCoautor, requiereModificatoria } from '@/lib/desistimiento/transiciones'
import path from 'path'
import { writeFile, mkdir } from 'fs/promises'
import { randomUUID } from 'crypto'

const UPLOAD_ROOT = path.join(process.cwd(), 'uploads', 'tesis')

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUser(request)
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const puede = await checkPermission(user.id, 'mesa-partes', 'edit')
    if (!puede) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const form = await request.formData()
    const archivoJurado = form.get('resolucionJuradoModificatoria') as File | null
    const archivoAprobacion = form.get('resolucionAprobacionModificatoria') as File | null

    const w = await prisma.thesisWithdrawal.findUnique({
      where: { id },
      include: {
        thesis: {
          include: {
            autores: {
              include: { user: { select: { id: true, nombres: true, apellidoPaterno: true } } },
            },
            asesores: { select: { userId: true } },
            documentos: { where: { esVersionActual: true } },
          },
        },
        thesisAuthor: { include: { user: { select: { nombres: true, apellidoPaterno: true } } } },
      },
    })
    if (!w) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    if (w.estadoSolicitud !== 'PENDIENTE') {
      return NextResponse.json({ error: `Estado actual: ${w.estadoSolicitud}` }, { status: 400 })
    }

    const resolJurado = w.thesis.documentos.find(d => d.tipo === 'RESOLUCION_JURADO')
    const resolAprob = w.thesis.documentos.find(d => d.tipo === 'RESOLUCION_APROBACION')

    if (requiereModificatoria(w.estadoTesisAlSolicitar) && resolJurado && !archivoJurado) {
      return NextResponse.json({
        error: 'Debe subir la resolución modificatoria de conformación de jurado'
      }, { status: 400 })
    }
    if (resolAprob && w.estadoTesisAlSolicitar === 'PROYECTO_APROBADO' && !archivoAprobacion) {
      return NextResponse.json({
        error: 'Debe subir la resolución modificatoria de aprobación de proyecto'
      }, { status: 400 })
    }

    // Guardar archivos en disco antes de la transacción
    async function persistirArchivo(f: File, prefijo: string): Promise<{ ruta: string; mime: string; size: number; nombre: string }> {
      const dir = path.join(UPLOAD_ROOT, w!.thesisId)
      await mkdir(dir, { recursive: true })
      const buffer = Buffer.from(await f.arrayBuffer())
      const nombreArchivo = `${prefijo}-${randomUUID()}${path.extname(f.name) || '.pdf'}`
      const rutaFisica = path.join(dir, nombreArchivo)
      await writeFile(rutaFisica, buffer)
      return {
        ruta: `/uploads/tesis/${w!.thesisId}/${nombreArchivo}`,
        mime: f.type || 'application/pdf',
        size: buffer.length,
        nombre: f.name,
      }
    }

    const nuevoJurado = archivoJurado ? await persistirArchivo(archivoJurado, 'res-jurado-modif') : null
    const nuevoAprob = archivoAprobacion ? await persistirArchivo(archivoAprobacion, 'res-aprob-modif') : null

    const coautoresActivos = w.thesis.autores.filter(
      a => a.user.id !== w.userId && a.estado === 'ACEPTADO'
    )
    const hayCoautor = coautoresActivos.length > 0
    const nuevoPrincipal = hayCoautor ? coautoresActivos[0] : null
    const estadoDestino = hayCoautor ? estadoDestinoConCoautor(w.estadoTesisAlSolicitar) : 'DESISTIDA'

    const nombreDesistente = `${w.thesisAuthor.user.nombres} ${w.thesisAuthor.user.apellidoPaterno}`

    const resolucionPrincipalId = await prisma.$transaction(async (tx) => {
      let resolucionRegistradaId: string | null = null

      // Crear modificatoria de RESOLUCION_JURADO
      if (nuevoJurado && resolJurado) {
        const creado = await tx.thesisDocument.create({
          data: {
            thesisId: w.thesisId,
            uploadedById: user.id,
            tipo: 'RESOLUCION_JURADO',
            nombre: `Modificatoria — ${nuevoJurado.nombre}`,
            rutaArchivo: nuevoJurado.ruta,
            mimeType: nuevoJurado.mime,
            tamano: nuevoJurado.size,
            version: resolJurado.version + 1,
            esVersionActual: true,
            esModificatoria: true,
            reemplazaDocumentoId: resolJurado.id,
          },
        })
        await tx.thesisDocument.update({ where: { id: resolJurado.id }, data: { esVersionActual: false } })
        resolucionRegistradaId = creado.id
      }

      // Crear modificatoria de RESOLUCION_APROBACION
      if (nuevoAprob && resolAprob) {
        const creado = await tx.thesisDocument.create({
          data: {
            thesisId: w.thesisId,
            uploadedById: user.id,
            tipo: 'RESOLUCION_APROBACION',
            nombre: `Modificatoria — ${nuevoAprob.nombre}`,
            rutaArchivo: nuevoAprob.ruta,
            mimeType: nuevoAprob.mime,
            tamano: nuevoAprob.size,
            version: resolAprob.version + 1,
            esVersionActual: true,
            esModificatoria: true,
            reemplazaDocumentoId: resolAprob.id,
          },
        })
        await tx.thesisDocument.update({ where: { id: resolAprob.id }, data: { esVersionActual: false } })
        resolucionRegistradaId = resolucionRegistradaId ?? creado.id
      }

      // Marcar autor como DESISTIDO (raw por compatibilidad con enum values agregados)
      await tx.$executeRawUnsafe(
        `UPDATE thesis_authors SET estado = 'DESISTIDO', orden = 99, fecha_respuesta = NOW(), motivo_rechazo = $1 WHERE id = $2`,
        w.motivoDescripcion,
        w.thesisAuthorId
      )

      // Promover coautor si aplica
      if (nuevoPrincipal) {
        await tx.thesisAuthor.update({ where: { id: nuevoPrincipal.id }, data: { orden: 1 } })
      }

      // Cambiar estado de la tesis
      await tx.$executeRawUnsafe(
        `UPDATE thesis SET estado = $1::"estado_tesis", fecha_limite_evaluacion = NULL, fecha_limite_correccion = NULL, updated_at = NOW() WHERE id = $2`,
        estadoDestino,
        w.thesisId
      )

      // Actualizar registro de desistimiento
      await tx.thesisWithdrawal.update({
        where: { id: w.id },
        data: {
          estadoSolicitud: 'APROBADO',
          aprobadoAt: new Date(),
          aprobadoPorId: user.id,
          resolucionDocumentoId: resolucionRegistradaId,
        },
      })

      // Historial de estado
      await tx.thesisStatusHistory.create({
        data: {
          thesisId: w.thesisId,
          estadoAnterior: 'SOLICITUD_DESISTIMIENTO' as any,
          estadoNuevo: estadoDestino as any,
          comentario: hayCoautor
            ? `Desistimiento aprobado de ${nombreDesistente}. ${nuevoPrincipal!.user.nombres} ${nuevoPrincipal!.user.apellidoPaterno} asume como autor principal.`
            : `Desistimiento aprobado de ${nombreDesistente}. Tesis dada de baja.`,
          changedById: user.id,
        },
      })

      return resolucionRegistradaId
    })

    // Notificar al tesista desistente
    await crearNotificacion({
      userId: w.userId,
      tipo: 'DESISTIMIENTO_APROBADO',
      titulo: 'Desistimiento aprobado',
      mensaje: `Mesa de partes aprobó tu solicitud de desistimiento de "${w.thesis.titulo}".`,
      enlace: `/mis-tesis`,
    })

    // Notificar al nuevo principal y asesores
    if (nuevoPrincipal) {
      await crearNotificacion({
        userId: nuevoPrincipal.user.id,
        tipo: 'DESISTIMIENTO_COAUTOR',
        titulo: 'Ahora eres el autor principal',
        mensaje: `${nombreDesistente} desistió. Ahora eres el autor principal de "${w.thesis.titulo}".`,
        enlace: `/mis-tesis/${w.thesisId}`,
      })
    }
    const asesorIds = w.thesis.asesores.map(a => a.userId)
    if (asesorIds.length > 0) {
      await crearNotificacion({
        userId: asesorIds,
        tipo: 'DESISTIMIENTO_APROBADO',
        titulo: 'Cambio en tesis asesorada',
        mensaje: `Desistimiento aprobado en "${w.thesis.titulo}" (tesista: ${nombreDesistente}).`,
        enlace: `/mis-asesorias`,
      })
    }

    return NextResponse.json({
      message: 'Desistimiento aprobado.',
      estadoDestino,
      resolucionDocumentoId: resolucionPrincipalId,
    })
  } catch (error) {
    console.error('[Aprobar desistimiento]', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
npx tsc --noEmit
git add app/api/mesa-partes/desistimientos/[id]/aprobar/route.ts
git commit -m "api: aprobar desistimiento con modificatoria versionada"
```

---

## Task 9: API — Rechazar

**Files:**
- Create: `app/api/mesa-partes/desistimientos/[id]/rechazar/route.ts`

- [ ] **Step 1: Crear endpoint**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, checkPermission } from '@/lib/auth'
import { crearNotificacion } from '@/lib/notificaciones'

const Body = z.object({
  motivoRechazo: z.string().min(10).max(1000),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUser(request)
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const puede = await checkPermission(user.id, 'mesa-partes', 'edit')
    if (!puede) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const parsed = Body.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 })
    }

    const w = await prisma.thesisWithdrawal.findUnique({
      where: { id },
      include: { thesis: { select: { titulo: true } } },
    })
    if (!w) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    if (w.estadoSolicitud !== 'PENDIENTE') {
      return NextResponse.json({ error: `Estado actual: ${w.estadoSolicitud}` }, { status: 400 })
    }

    await prisma.$transaction(async (tx) => {
      await tx.thesisWithdrawal.update({
        where: { id },
        data: {
          estadoSolicitud: 'RECHAZADO',
          aprobadoPorId: user.id,
          aprobadoAt: new Date(),
          motivoRechazoMesaPartes: parsed.data.motivoRechazo,
        },
      })
      await tx.$executeRawUnsafe(
        `UPDATE thesis SET estado = $1::"estado_tesis", updated_at = NOW() WHERE id = $2`,
        w.estadoTesisAlSolicitar,
        w.thesisId
      )
      await tx.thesisStatusHistory.create({
        data: {
          thesisId: w.thesisId,
          estadoAnterior: 'SOLICITUD_DESISTIMIENTO' as any,
          estadoNuevo: w.estadoTesisAlSolicitar,
          comentario: `Solicitud de desistimiento rechazada por mesa de partes. Motivo: ${parsed.data.motivoRechazo}`,
          changedById: user.id,
        },
      })
    })

    await crearNotificacion({
      userId: w.userId,
      tipo: 'DESISTIMIENTO_RECHAZADO',
      titulo: 'Solicitud de desistimiento rechazada',
      mensaje: `Mesa de partes rechazó tu solicitud: ${parsed.data.motivoRechazo}`,
      enlace: `/mis-tesis/${w.thesisId}`,
    })

    return NextResponse.json({ message: 'Solicitud rechazada.' })
  } catch (error) {
    console.error('[Rechazar desistimiento]', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
npx tsc --noEmit
git add app/api/mesa-partes/desistimientos/[id]/rechazar/route.ts
git commit -m "api: rechazar desistimiento"
```

---

## Task 10: API — Reporte (JSON para dashboard + XLSX)

**Files:**
- Create: `lib/excel/reporte-desistimientos.ts`
- Create: `app/api/mesa-partes/desistimientos/reporte/route.ts`

- [ ] **Step 1: Crear generador Excel**

`lib/excel/reporte-desistimientos.ts`:

```ts
import ExcelJS from 'exceljs'
import { MOTIVO_LABEL } from '@/lib/constants/motivos-desistimiento'
import type { MotivoDesistimiento, EstadoTesis } from '@prisma/client'

export interface DesistimientoRow {
  solicitadoAt: Date
  aprobadoAt: Date | null
  estudiante: string
  codigo: string
  documento: string
  carrera: string
  facultad: string
  tituloTesis: string
  motivoCategoria: MotivoDesistimiento
  motivoDescripcion: string
  estadoTesisAlSolicitar: EstadoTesis
  faseActual: string | null
  teniaCoautor: boolean
}

function fmt(d: Date | null): string {
  return d ? new Date(d).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''
}

export async function generarExcelDesistimientos(rows: DesistimientoRow[], titulo: string): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Sistema de Tesis UNAMAD'
  wb.created = new Date()
  const ws = wb.addWorksheet('Desistimientos', { pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true } })

  ws.mergeCells('A1:M1')
  ws.getCell('A1').value = titulo
  ws.getCell('A1').font = { bold: true, size: 14 }
  ws.getCell('A1').alignment = { horizontal: 'center' }

  const headers = [
    'Fecha solicitud','Fecha aprobación','Estudiante','Código','DNI','Carrera','Facultad',
    'Título tesis','Motivo','Descripción','Estado tesis al solicitar','Fase','Tenía coautor',
  ]
  ws.addRow([]) // fila vacía
  const headerRow = ws.addRow(headers)
  headerRow.eachCell(c => {
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } }
    c.alignment = { horizontal: 'center', vertical: 'middle' }
    c.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
  })

  rows.forEach(r => {
    ws.addRow([
      fmt(r.solicitadoAt), fmt(r.aprobadoAt), r.estudiante, r.codigo, r.documento, r.carrera, r.facultad,
      r.tituloTesis, MOTIVO_LABEL[r.motivoCategoria] ?? r.motivoCategoria, r.motivoDescripcion,
      r.estadoTesisAlSolicitar, r.faseActual ?? '', r.teniaCoautor ? 'Sí' : 'No',
    ])
  })

  ws.columns.forEach(col => { col.width = 22 })
  ws.getColumn(10).width = 50 // descripción

  const buffer = await wb.xlsx.writeBuffer()
  return Buffer.from(buffer)
}
```

- [ ] **Step 2: Crear endpoint**

`app/api/mesa-partes/desistimientos/reporte/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, checkPermission } from '@/lib/auth'
import { generarExcelDesistimientos, type DesistimientoRow } from '@/lib/excel/reporte-desistimientos'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const puede = await checkPermission(user.id, 'mesa-partes', 'view')
    if (!puede) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const formato = searchParams.get('formato') ?? 'json'
    const desde = searchParams.get('desde')
    const hasta = searchParams.get('hasta')
    const facultadId = searchParams.get('facultadId')
    const carrera = searchParams.get('carrera')
    const motivos = searchParams.getAll('motivo')
    const estadosTesis = searchParams.getAll('estadoTesis')
    const teniaCoautor = searchParams.get('teniaCoautor')

    const where: any = { estadoSolicitud: 'APROBADO' }
    if (desde) where.aprobadoAt = { ...(where.aprobadoAt || {}), gte: new Date(desde) }
    if (hasta) where.aprobadoAt = { ...(where.aprobadoAt || {}), lte: new Date(hasta) }
    if (facultadId) where.facultadIdSnapshot = facultadId
    if (carrera) where.carreraNombreSnapshot = carrera
    if (motivos.length > 0) where.motivoCategoria = { in: motivos }
    if (estadosTesis.length > 0) where.estadoTesisAlSolicitar = { in: estadosTesis }
    if (teniaCoautor === 'true') where.teniaCoautor = true
    if (teniaCoautor === 'false') where.teniaCoautor = false

    const items = await prisma.thesisWithdrawal.findMany({
      where,
      orderBy: { aprobadoAt: 'desc' },
      include: {
        user: { select: { nombres: true, apellidoPaterno: true, apellidoMaterno: true, numeroDocumento: true } },
        thesis: { select: { titulo: true } },
        facultadSnapshot: { select: { nombre: true } },
        studentCareer: { select: { codigoEstudiante: true } },
      },
    })

    const rows: DesistimientoRow[] = items.map(i => ({
      solicitadoAt: i.solicitadoAt,
      aprobadoAt: i.aprobadoAt,
      estudiante: `${i.user.apellidoPaterno} ${i.user.apellidoMaterno}, ${i.user.nombres}`,
      codigo: i.studentCareer.codigoEstudiante,
      documento: i.user.numeroDocumento,
      carrera: i.carreraNombreSnapshot,
      facultad: i.facultadSnapshot.nombre,
      tituloTesis: i.thesis.titulo,
      motivoCategoria: i.motivoCategoria,
      motivoDescripcion: i.motivoDescripcion,
      estadoTesisAlSolicitar: i.estadoTesisAlSolicitar,
      faseActual: i.faseActual,
      teniaCoautor: i.teniaCoautor,
    }))

    if (formato === 'xlsx') {
      const buffer = await generarExcelDesistimientos(rows, `Reporte de Desistimientos — UNAMAD`)
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="desistimientos-${Date.now()}.xlsx"`,
        },
      })
    }

    // Formato JSON con agregados para el dashboard
    const porMotivo = new Map<string, number>()
    const porFacultad = new Map<string, number>()
    const porEstadoTesis = new Map<string, number>()
    let conCoautor = 0
    rows.forEach(r => {
      porMotivo.set(r.motivoCategoria, (porMotivo.get(r.motivoCategoria) ?? 0) + 1)
      porFacultad.set(r.facultad, (porFacultad.get(r.facultad) ?? 0) + 1)
      porEstadoTesis.set(r.estadoTesisAlSolicitar, (porEstadoTesis.get(r.estadoTesisAlSolicitar) ?? 0) + 1)
      if (r.teniaCoautor) conCoautor++
    })

    return NextResponse.json({
      total: rows.length,
      conCoautor,
      sinCoautor: rows.length - conCoautor,
      porMotivo: Array.from(porMotivo, ([k, v]) => ({ key: k, count: v })),
      porFacultad: Array.from(porFacultad, ([k, v]) => ({ key: k, count: v })),
      porEstadoTesis: Array.from(porEstadoTesis, ([k, v]) => ({ key: k, count: v })),
      items: rows,
    })
  } catch (error) {
    console.error('[Reporte desistimientos]', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
```

- [ ] **Step 3: Typecheck + commit**

```bash
npx tsc --noEmit
git add lib/excel/reporte-desistimientos.ts app/api/mesa-partes/desistimientos/reporte/route.ts
git commit -m "api: reporte de desistimientos (json + xlsx)"
```

---

## Task 11: Componente — Modal "Solicitar desistimiento"

**Files:**
- Create: `components/desistimiento/modal-solicitar-desistimiento.tsx`

- [ ] **Step 1: Crear componente**

```tsx
'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MOTIVOS_DESISTIMIENTO } from '@/lib/constants/motivos-desistimiento'
import { toast } from 'sonner'
import { Loader2, AlertTriangle } from 'lucide-react'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  thesisId: string
  tituloTesis: string
  onSuccess?: () => void
}

export function ModalSolicitarDesistimiento({ open, onOpenChange, thesisId, tituloTesis, onSuccess }: Props) {
  const [categoria, setCategoria] = useState<string>('')
  const [descripcion, setDescripcion] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    setError(null)
    if (!categoria) { setError('Selecciona un motivo'); return }
    if (descripcion.trim().length < 20) { setError('La descripción debe tener al menos 20 caracteres'); return }

    setLoading(true)
    try {
      const res = await fetch(`/api/tesis/${thesisId}/desistir/solicitar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivoCategoria: categoria, motivoDescripcion: descripcion.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al enviar solicitud')
      toast.success('Solicitud enviada. Mesa de partes revisará tu caso.')
      onOpenChange(false)
      onSuccess?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !loading && onOpenChange(v)}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            Solicitar desistimiento de tesis
          </DialogTitle>
          <DialogDescription>
            "{tituloTesis}" — Tu solicitud será revisada por mesa de partes. Si tienes coautor, él/ella continuará con la tesis; de lo contrario, la tesis quedará dada de baja.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="categoria">Motivo principal</Label>
            <Select value={categoria} onValueChange={setCategoria} disabled={loading}>
              <SelectTrigger id="categoria">
                <SelectValue placeholder="Selecciona un motivo" />
              </SelectTrigger>
              <SelectContent>
                {MOTIVOS_DESISTIMIENTO.map(m => (
                  <SelectItem key={m.codigo} value={m.codigo}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción detallada (mínimo 20 caracteres)</Label>
            <Textarea
              id="descripcion"
              rows={5}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Explica brevemente las razones de tu desistimiento..."
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">{descripcion.length} caracteres</p>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Enviar solicitud
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
npx tsc --noEmit
git add components/desistimiento/modal-solicitar-desistimiento.tsx
git commit -m "ui: modal solicitar desistimiento"
```

---

## Task 12: Integrar modal en `/mis-tesis/[id]`

**Files:**
- Modify: `app/(dashboard)/mis-tesis/[id]/page.tsx`
- Modify: `components/tesis/constants.tsx`

- [ ] **Step 1: Añadir `SOLICITUD_DESISTIMIENTO` a `ESTADO_CONFIG`**

En `components/tesis/constants.tsx`, después de la entrada `DESISTIDA` (~línea 114), añadir:

```tsx
  SOLICITUD_DESISTIMIENTO: {
    label: 'Solicitud de Desistimiento',
    color: 'text-amber-700',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    icon: <Clock className="w-4 h-4" />
  },
```

- [ ] **Step 2: Localizar el botón "Desistir" actual en `mis-tesis/[id]/page.tsx`**

Buscar con grep el componente actual que maneja el desistimiento en el archivo (busca `desistir` en el page.tsx). Reemplazar la lógica que hace POST a `/api/tesis/[id]/desistir` por la apertura del nuevo modal.

Reemplazar la declaración del componente (cerca del estado) para añadir:

```tsx
import { ModalSolicitarDesistimiento } from '@/components/desistimiento/modal-solicitar-desistimiento'
// ...
const [modalDesistirOpen, setModalDesistirOpen] = useState(false)
```

Y el botón/acción debe llamar a `setModalDesistirOpen(true)`. Al final del JSX del componente (antes del cierre principal):

```tsx
<ModalSolicitarDesistimiento
  open={modalDesistirOpen}
  onOpenChange={setModalDesistirOpen}
  thesisId={tesis.id}
  tituloTesis={tesis.titulo}
  onSuccess={() => router.refresh()}
/>
```

- [ ] **Step 3: Añadir banner cuando el estado es `SOLICITUD_DESISTIMIENTO`**

En la parte superior del contenido de la página, después del header de la tesis, añadir:

```tsx
{tesis.estado === 'SOLICITUD_DESISTIMIENTO' && tesis.desistimientoPendiente && (
  <Card className="border-2 border-amber-400 bg-amber-50/80 dark:bg-amber-950/30">
    <CardContent className="py-4 flex items-start gap-3">
      <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
      <div className="flex-1">
        <p className="font-semibold text-amber-800 dark:text-amber-200">
          Solicitud de desistimiento en trámite
        </p>
        <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
          Mesa de partes está revisando tu solicitud. No puedes realizar acciones de flujo normal hasta que se resuelva.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={async () => {
            if (!confirm('¿Cancelar tu solicitud de desistimiento?')) return
            const res = await fetch(`/api/tesis/${tesis.id}/desistir/cancelar`, { method: 'POST' })
            if (res.ok) { toast.success('Solicitud cancelada'); router.refresh() }
            else { const d = await res.json(); toast.error(d.error ?? 'Error') }
          }}
        >
          Cancelar solicitud
        </Button>
      </div>
    </CardContent>
  </Card>
)}
```

Añadir a la query SSR de la tesis el include:

```ts
desistimientos: {
  where: { estadoSolicitud: 'PENDIENTE' },
  orderBy: { createdAt: 'desc' },
  take: 1,
},
```

Y derivar `desistimientoPendiente = tesis.desistimientos[0] ?? null` antes del render.

Deshabilitar los botones de flujo normal (enviar a revisión, subir documentos) cuando `tesis.estado === 'SOLICITUD_DESISTIMIENTO'`.

- [ ] **Step 4: Smoke test manual**

```bash
npm run dev
```

1. Abrir `/mis-tesis/[id]` como tesista con tesis en `BORRADOR`.
2. Click en "Desistir" → modal debe abrir.
3. Seleccionar motivo, escribir descripción de 25+ caracteres → "Enviar solicitud".
4. Verificar: toast de éxito, página refresca, banner ámbar de "Solicitud en trámite" visible.
5. Click en "Cancelar solicitud" → confirm → debe volver al estado previo.

- [ ] **Step 5: Typecheck + commit**

```bash
npx tsc --noEmit
git add app/(dashboard)/mis-tesis/[id]/page.tsx components/tesis/constants.tsx
git commit -m "ui: integrar modal de desistimiento en mis-tesis"
```

---

## Task 13: Componente — Panel de aprobación de mesa de partes

**Files:**
- Create: `components/desistimiento/panel-aprobacion.tsx`

Gestiona los dos botones (Aprobar / Rechazar) con uploads condicionales.

- [ ] **Step 1: Crear componente**

```tsx
'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Loader2, CheckCircle2, XCircle, Upload } from 'lucide-react'
import { toast } from 'sonner'

interface ResolucionVigente { id: string; tipo: string; nombre: string; version: number }

interface Props {
  desistimientoId: string
  thesisId: string
  requiereModificatoria: boolean
  resolucionesVigentes: ResolucionVigente[]
  onDone?: () => void
}

export function PanelAprobacionDesistimiento({ desistimientoId, requiereModificatoria, resolucionesVigentes, onDone }: Props) {
  const [aprobarOpen, setAprobarOpen] = useState(false)
  const [rechazarOpen, setRechazarOpen] = useState(false)
  const [archivoJurado, setArchivoJurado] = useState<File | null>(null)
  const [archivoAprob, setArchivoAprob] = useState<File | null>(null)
  const [motivoRechazo, setMotivoRechazo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const tieneJurado = resolucionesVigentes.some(r => r.tipo === 'RESOLUCION_JURADO')
  const tieneAprob = resolucionesVigentes.some(r => r.tipo === 'RESOLUCION_APROBACION')

  async function aprobar() {
    setError(null)
    if (requiereModificatoria && tieneJurado && !archivoJurado) {
      setError('Sube la resolución modificatoria de conformación de jurado'); return
    }
    setLoading(true)
    try {
      const form = new FormData()
      if (archivoJurado) form.append('resolucionJuradoModificatoria', archivoJurado)
      if (archivoAprob) form.append('resolucionAprobacionModificatoria', archivoAprob)
      const res = await fetch(`/api/mesa-partes/desistimientos/${desistimientoId}/aprobar`, { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error')
      toast.success('Desistimiento aprobado.')
      setAprobarOpen(false)
      onDone?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  async function rechazar() {
    setError(null)
    if (motivoRechazo.trim().length < 10) { setError('Mínimo 10 caracteres'); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/mesa-partes/desistimientos/${desistimientoId}/rechazar`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivoRechazo: motivoRechazo.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error')
      toast.success('Solicitud rechazada.')
      setRechazarOpen(false)
      onDone?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle>Decisión de mesa de partes</CardTitle></CardHeader>
      <CardContent className="flex gap-3">
        <Button onClick={() => setAprobarOpen(true)} className="bg-green-600 hover:bg-green-700">
          <CheckCircle2 className="w-4 h-4 mr-2" />Aprobar
        </Button>
        <Button onClick={() => setRechazarOpen(true)} variant="destructive">
          <XCircle className="w-4 h-4 mr-2" />Rechazar
        </Button>
      </CardContent>

      <Dialog open={aprobarOpen} onOpenChange={(v) => !loading && setAprobarOpen(v)}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Aprobar desistimiento</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {tieneJurado && (
              <div className="space-y-2">
                <Label htmlFor="resJurado">Resolución modificatoria de conformación de jurado (PDF)</Label>
                <Input id="resJurado" type="file" accept="application/pdf" onChange={(e) => setArchivoJurado(e.target.files?.[0] ?? null)} />
                <p className="text-xs text-muted-foreground">Reemplaza la v{resolucionesVigentes.find(r => r.tipo === 'RESOLUCION_JURADO')?.version}.</p>
              </div>
            )}
            {tieneAprob && (
              <div className="space-y-2">
                <Label htmlFor="resAprob">Resolución modificatoria de aprobación (PDF, opcional)</Label>
                <Input id="resAprob" type="file" accept="application/pdf" onChange={(e) => setArchivoAprob(e.target.files?.[0] ?? null)} />
              </div>
            )}
            {!tieneJurado && !tieneAprob && (
              <p className="text-sm text-muted-foreground">No hay resoluciones vigentes que requieran modificatoria.</p>
            )}
            {error && <div className="text-sm text-red-600">{error}</div>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAprobarOpen(false)} disabled={loading}>Cancelar</Button>
            <Button onClick={aprobar} disabled={loading} className="bg-green-600 hover:bg-green-700">
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              Aprobar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rechazarOpen} onOpenChange={(v) => !loading && setRechazarOpen(v)}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Rechazar solicitud</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo del rechazo (mínimo 10 caracteres)</Label>
            <Textarea id="motivo" rows={4} value={motivoRechazo} onChange={(e) => setMotivoRechazo(e.target.value)} />
            {error && <div className="text-sm text-red-600">{error}</div>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRechazarOpen(false)} disabled={loading}>Cancelar</Button>
            <Button variant="destructive" onClick={rechazar} disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Rechazar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
npx tsc --noEmit
git add components/desistimiento/panel-aprobacion.tsx
git commit -m "ui: panel de aprobación de desistimiento con upload de modificatoria"
```

---

## Task 14: Página — Lista de solicitudes (`/mesa-partes/desistimientos`)

**Files:**
- Create: `app/(dashboard)/mesa-partes/desistimientos/page.tsx`
- Create: `components/desistimiento/lista-desistimientos.tsx`

- [ ] **Step 1: Crear componente de lista (client)**

`components/desistimiento/lista-desistimientos.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { ESTADO_SOLICITUD_CONFIG, MOTIVO_COLOR } from '@/components/desistimiento/constants'
import { MOTIVO_LABEL } from '@/lib/constants/motivos-desistimiento'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Item {
  id: string; thesisId: string; tituloTesis: string; estudiante: string; documento: string;
  carrera: string; facultad: string; motivoCategoria: string; estadoSolicitud: keyof typeof ESTADO_SOLICITUD_CONFIG;
  estadoTesisAlSolicitar: string; teniaCoautor: boolean; solicitadoAt: string;
}

export function ListaDesistimientos() {
  const [estado, setEstado] = useState<string>('PENDIENTE')
  const [items, setItems] = useState<Item[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetch(`/api/mesa-partes/desistimientos?estado=${estado}&page=${page}&pageSize=20`)
      .then(r => r.json())
      .then(d => { if (alive) { setItems(d.items); setTotal(d.total) } })
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [estado, page])

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3">
        <div>
          <label className="text-xs font-medium">Estado</label>
          <Select value={estado} onValueChange={(v) => { setPage(1); setEstado(v) }}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="PENDIENTE">Pendientes</SelectItem>
              <SelectItem value="APROBADO">Aprobados</SelectItem>
              <SelectItem value="RECHAZADO">Rechazados</SelectItem>
              <SelectItem value="CANCELADO">Cancelados</SelectItem>
              <SelectItem value="TODOS">Todos</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm text-muted-foreground ml-auto">Total: {total}</div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : items.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">Sin resultados.</div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Estudiante</TableHead>
                <TableHead>Carrera</TableHead>
                <TableHead>Tesis</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Fase</TableHead>
                <TableHead>Coautor</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(i => {
                const cfg = ESTADO_SOLICITUD_CONFIG[i.estadoSolicitud]
                return (
                  <TableRow key={i.id}>
                    <TableCell className="text-xs">{new Date(i.solicitadoAt).toLocaleDateString('es-PE')}</TableCell>
                    <TableCell>
                      <div className="font-medium">{i.estudiante}</div>
                      <div className="text-xs text-muted-foreground">{i.documento}</div>
                    </TableCell>
                    <TableCell className="text-sm">{i.carrera}</TableCell>
                    <TableCell className="max-w-xs truncate" title={i.tituloTesis}>{i.tituloTesis}</TableCell>
                    <TableCell>
                      <Badge className={cn(MOTIVO_COLOR[i.motivoCategoria] ?? 'bg-gray-100 text-gray-800', 'text-xs')}>
                        {MOTIVO_LABEL[i.motivoCategoria as keyof typeof MOTIVO_LABEL] ?? i.motivoCategoria}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{i.estadoTesisAlSolicitar}</TableCell>
                    <TableCell className="text-xs">{i.teniaCoautor ? 'Sí' : 'No'}</TableCell>
                    <TableCell>
                      <Badge className={cn(cfg.bgColor, cfg.color, 'gap-1')}>{cfg.icon}{cfg.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/mesa-partes/desistimientos/${i.id}`}>Ver</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
        <span className="text-sm self-center">Página {page}</span>
        <Button variant="outline" disabled={items.length < 20} onClick={() => setPage(p => p + 1)}>Siguiente</Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Crear la página (server)**

`app/(dashboard)/mesa-partes/desistimientos/page.tsx`:

```tsx
import { ListaDesistimientos } from '@/components/desistimiento/lista-desistimientos'

export const metadata = { title: 'Solicitudes de desistimiento — Mesa de Partes' }

export default function DesistimientosPage() {
  return (
    <div className="container mx-auto py-6 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Solicitudes de desistimiento</h1>
          <p className="text-muted-foreground">Revisa y resuelve las solicitudes de los tesistas.</p>
        </div>
        <ListaDesistimientos />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Smoke test**

```bash
npm run dev
```

1. Con un usuario mesa-partes autenticado, visitar `/mesa-partes/desistimientos`.
2. Debe cargar la lista filtrada por `PENDIENTE`.
3. Cambiar filtro a "Aprobados" → debe recargar.

- [ ] **Step 4: Typecheck + commit**

```bash
npx tsc --noEmit
git add app/(dashboard)/mesa-partes/desistimientos components/desistimiento/lista-desistimientos.tsx
git commit -m "ui: página y componente de lista de desistimientos"
```

---

## Task 15: Página — Detalle de solicitud (`/mesa-partes/desistimientos/[id]`)

**Files:**
- Create: `app/(dashboard)/mesa-partes/desistimientos/[id]/page.tsx`

- [ ] **Step 1: Crear página client**

```tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, FileText, Loader2 } from 'lucide-react'
import { PanelAprobacionDesistimiento } from '@/components/desistimiento/panel-aprobacion'
import { ESTADO_SOLICITUD_CONFIG, MOTIVO_COLOR } from '@/components/desistimiento/constants'
import { MOTIVO_LABEL } from '@/lib/constants/motivos-desistimiento'
import { cn } from '@/lib/utils'

interface Detalle {
  id: string; estadoSolicitud: keyof typeof ESTADO_SOLICITUD_CONFIG;
  solicitadoAt: string; aprobadoAt: string | null; aprobadoPor: string | null;
  motivoCategoria: string; motivoDescripcion: string; motivoRechazoMesaPartes: string | null;
  estadoTesisAlSolicitar: string; faseActual: string | null; teniaCoautor: boolean;
  requiereModificatoria: boolean;
  estudiante: { nombreCompleto: string; email: string; documento: string; carrera: string; facultad: string };
  tesis: {
    id: string; titulo: string; estado: string;
    coautoresActivos: Array<{ id: string; nombre: string; codigo: string }>;
    asesores: Array<{ nombre: string; tipo: string }>;
    resolucionesVigentes: Array<{ id: string; tipo: string; nombre: string; version: number; createdAt: string }>;
  };
  resolucionModificatoria: { id: string; nombre: string } | null;
}

export default function DesistimientoDetallePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [data, setData] = useState<Detalle | null>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/mesa-partes/desistimientos/${id}`)
    if (res.ok) setData(await res.json())
    setLoading(false)
  }
  useEffect(() => { load() }, [id])

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin" /></div>
  if (!data) return <div className="py-20 text-center">No encontrado</div>

  const cfg = ESTADO_SOLICITUD_CONFIG[data.estadoSolicitud]

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-2 text-sm">
          <Link href="/mesa-partes/desistimientos" className="text-muted-foreground hover:text-foreground">← Solicitudes</Link>
        </div>

        <div className="flex items-start gap-4">
          <Button asChild variant="outline" size="icon"><Link href="/mesa-partes/desistimientos"><ArrowLeft className="w-4 h-4" /></Link></Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Badge className={cn(cfg.bgColor, cfg.color, 'gap-1')}>{cfg.icon}{cfg.label}</Badge>
              {data.teniaCoautor && <Badge variant="outline">Con coautor</Badge>}
            </div>
            <h1 className="text-xl font-bold mt-2">{data.tesis.titulo}</h1>
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle>Estudiante que solicita desistimiento</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Nombre:</span> {data.estudiante.nombreCompleto}</div>
            <div><span className="text-muted-foreground">DNI:</span> {data.estudiante.documento}</div>
            <div><span className="text-muted-foreground">Email:</span> {data.estudiante.email}</div>
            <div><span className="text-muted-foreground">Carrera:</span> {data.estudiante.carrera}</div>
            <div><span className="text-muted-foreground">Facultad:</span> {data.estudiante.facultad}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Motivo</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Badge className={cn(MOTIVO_COLOR[data.motivoCategoria] ?? 'bg-gray-100', 'text-sm')}>
              {MOTIVO_LABEL[data.motivoCategoria as keyof typeof MOTIVO_LABEL] ?? data.motivoCategoria}
            </Badge>
            <p className="text-sm whitespace-pre-wrap">{data.motivoDescripcion}</p>
          </CardContent>
        </Card>

        {data.tesis.coautoresActivos.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Coautor(es) que continuarán</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {data.tesis.coautoresActivos.map(c => (
                <div key={c.id}>{c.nombre} <span className="text-muted-foreground">— {c.codigo}</span></div>
              ))}
            </CardContent>
          </Card>
        )}

        {data.tesis.resolucionesVigentes.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Resoluciones vigentes ({data.tesis.resolucionesVigentes.length})</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {data.tesis.resolucionesVigentes.map(r => (
                <div key={r.id} className="flex items-center gap-2 text-sm">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span>{r.tipo}</span>
                  <Badge variant="outline">v{r.version}</Badge>
                  <span className="text-muted-foreground truncate">{r.nombre}</span>
                </div>
              ))}
              {data.requiereModificatoria && (
                <p className="text-xs text-amber-700 mt-2">Al aprobar, deberás subir las modificatorias correspondientes.</p>
              )}
            </CardContent>
          </Card>
        )}

        {data.estadoSolicitud === 'PENDIENTE' && (
          <PanelAprobacionDesistimiento
            desistimientoId={data.id}
            thesisId={data.tesis.id}
            requiereModificatoria={data.requiereModificatoria}
            resolucionesVigentes={data.tesis.resolucionesVigentes}
            onDone={() => router.push('/mesa-partes/desistimientos')}
          />
        )}

        {data.estadoSolicitud === 'APROBADO' && data.aprobadoPor && (
          <Card><CardContent className="py-4 text-sm">
            Aprobado por <b>{data.aprobadoPor}</b> el {new Date(data.aprobadoAt!).toLocaleString('es-PE')}.
            {data.resolucionModificatoria && (<div className="mt-2">Resolución modificatoria: {data.resolucionModificatoria.nombre}</div>)}
          </CardContent></Card>
        )}

        {data.estadoSolicitud === 'RECHAZADO' && data.motivoRechazoMesaPartes && (
          <Card><CardContent className="py-4 text-sm">
            <b>Motivo del rechazo:</b> {data.motivoRechazoMesaPartes}
          </CardContent></Card>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Smoke test**

```bash
npm run dev
```

1. Crear solicitud como tesista (ver Task 12 smoke test).
2. Logear como mesa-partes, abrir la solicitud desde la lista.
3. Probar Aprobar (subiendo PDF si hay resolución) y Rechazar (con motivo).

- [ ] **Step 3: Typecheck + commit**

```bash
npx tsc --noEmit
git add app/(dashboard)/mesa-partes/desistimientos/[id]/page.tsx
git commit -m "ui: página detalle de desistimiento con aprobación"
```

---

## Task 16: Componente — Dashboard de reporte (gráficos + cards)

**Files:**
- Create: `components/desistimiento/reporte-dashboard.tsx`

- [ ] **Step 1: Crear componente**

Usa `recharts` (ya instalado) para gráficos:

```tsx
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts'
import { MOTIVO_LABEL } from '@/lib/constants/motivos-desistimiento'

const COLORS = ['#8b5cf6','#f59e0b','#ef4444','#3b82f6','#14b8a6','#f97316','#6366f1','#0ea5e9','#ec4899','#6b7280']

interface Agregado { key: string; count: number }

interface Props {
  total: number; conCoautor: number; sinCoautor: number;
  porMotivo: Agregado[]; porFacultad: Agregado[]; porEstadoTesis: Agregado[];
}

export function ReporteDesistimientosDashboard({ total, conCoautor, sinCoautor, porMotivo, porFacultad, porEstadoTesis }: Props) {
  const motivoData = porMotivo.map(m => ({ name: MOTIVO_LABEL[m.key as keyof typeof MOTIVO_LABEL] ?? m.key, value: m.count }))
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardHeader><CardTitle className="text-sm">Total</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{total}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Con coautor</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{conCoautor}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Autor único</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{sinCoautor}</CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Por motivo</CardTitle></CardHeader>
          <CardContent style={{ height: 300 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={motivoData} dataKey="value" nameKey="name" outerRadius={100} label>
                  {motivoData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Por facultad</CardTitle></CardHeader>
          <CardContent style={{ height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={porFacultad.map(f => ({ facultad: f.key, total: f.count }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="facultad" fontSize={11} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="total" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Por estado de tesis al desistir</CardTitle></CardHeader>
        <CardContent style={{ height: 280 }}>
          <ResponsiveContainer>
            <BarChart data={porEstadoTesis.map(e => ({ estado: e.key, total: e.count }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="estado" fontSize={10} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="total" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
npx tsc --noEmit
git add components/desistimiento/reporte-dashboard.tsx
git commit -m "ui: dashboard de reporte de desistimientos"
```

---

## Task 17: Página — Reporte (`/mesa-partes/reportes/desistimientos`)

**Files:**
- Create: `app/(dashboard)/mesa-partes/reportes/desistimientos/page.tsx`

- [ ] **Step 1: Crear página con filtros + botón export**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ReporteDesistimientosDashboard } from '@/components/desistimiento/reporte-dashboard'
import { MOTIVOS_DESISTIMIENTO } from '@/lib/constants/motivos-desistimiento'
import { Download, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Facultad { id: string; nombre: string }

interface ReporteData {
  total: number; conCoautor: number; sinCoautor: number;
  porMotivo: Array<{ key: string; count: number }>;
  porFacultad: Array<{ key: string; count: number }>;
  porEstadoTesis: Array<{ key: string; count: number }>;
}

export default function ReporteDesistimientosPage() {
  const [desde, setDesde] = useState(`${new Date().getFullYear()}-01-01`)
  const [hasta, setHasta] = useState(new Date().toISOString().slice(0, 10))
  const [facultadId, setFacultadId] = useState('')
  const [motivo, setMotivo] = useState('')
  const [teniaCoautor, setTeniaCoautor] = useState('all')
  const [facultades, setFacultades] = useState<Facultad[]>([])
  const [data, setData] = useState<ReporteData | null>(null)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    fetch('/api/mesa-partes/reporte').then(r => r.json()).then(d => setFacultades(d.facultades ?? []))
  }, [])

  function buildQS(formato?: 'xlsx') {
    const p = new URLSearchParams()
    if (desde) p.set('desde', desde); if (hasta) p.set('hasta', hasta)
    if (facultadId) p.set('facultadId', facultadId)
    if (motivo) p.append('motivo', motivo)
    if (teniaCoautor !== 'all') p.set('teniaCoautor', teniaCoautor)
    if (formato) p.set('formato', formato)
    return p.toString()
  }

  async function cargar() {
    setLoading(true)
    try {
      const res = await fetch(`/api/mesa-partes/desistimientos/reporte?${buildQS()}`)
      if (!res.ok) throw new Error('Error al cargar')
      setData(await res.json())
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Error') }
    finally { setLoading(false) }
  }

  async function exportar() {
    setExporting(true)
    try {
      const res = await fetch(`/api/mesa-partes/desistimientos/reporte?${buildQS('xlsx')}`)
      if (!res.ok) throw new Error('Error al exportar')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `desistimientos-${Date.now()}.xlsx`
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Error') }
    finally { setExporting(false) }
  }

  useEffect(() => { cargar() /* eslint-disable-next-line */ }, [])

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">Reporte de desistimientos</h1>
            <p className="text-muted-foreground">Métricas agregadas por rango, motivo y facultad.</p>
          </div>
          <Button onClick={exportar} disabled={exporting || !data}>
            {exporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            Exportar Excel
          </Button>
        </div>

        <Card>
          <CardHeader><CardTitle>Filtros</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div><Label>Desde</Label><Input type="date" value={desde} onChange={e => setDesde(e.target.value)} /></div>
            <div><Label>Hasta</Label><Input type="date" value={hasta} onChange={e => setHasta(e.target.value)} /></div>
            <div>
              <Label>Facultad</Label>
              <Select value={facultadId || 'all'} onValueChange={v => setFacultadId(v === 'all' ? '' : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {facultades.map(f => <SelectItem key={f.id} value={f.id}>{f.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Motivo</Label>
              <Select value={motivo || 'all'} onValueChange={v => setMotivo(v === 'all' ? '' : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {MOTIVOS_DESISTIMIENTO.map(m => <SelectItem key={m.codigo} value={m.codigo}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Coautor</Label>
              <Select value={teniaCoautor} onValueChange={setTeniaCoautor}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="true">Con coautor</SelectItem>
                  <SelectItem value="false">Autor único</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-5 flex justify-end">
              <Button onClick={cargar} disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Aplicar filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        {data && <ReporteDesistimientosDashboard {...data} />}
        {!data && loading && (<div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>)}
        {!data && !loading && (<div className="py-12 text-center text-muted-foreground">Aplica filtros para ver el reporte.</div>)}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Smoke test**

```bash
npm run dev
```

1. Visitar `/mesa-partes/reportes/desistimientos`.
2. Aplicar filtros → ver dashboard con números y gráficos.
3. Click en "Exportar Excel" → descarga `desistimientos-*.xlsx`, abrir y verificar columnas.

- [ ] **Step 3: Typecheck + commit**

```bash
npx tsc --noEmit
git add app/(dashboard)/mesa-partes/reportes/desistimientos
git commit -m "ui: página de reporte de desistimientos"
```

---

## Task 18: Actualizar mesa-partes/[id]/page.tsx (reemplazar alert legacy)

**Files:**
- Modify: `app/(dashboard)/mesa-partes/[id]/page.tsx`

La página actual detecta "hubo desistimiento" por string-matching sobre `ThesisStatusHistory`. Sustituir por consulta directa a `ThesisWithdrawal`.

- [ ] **Step 1: Ajustar la query del expediente**

Localizar el bloque donde se obtiene el expediente (`proyecto`) y añadir al include de la tesis:

```ts
desistimientos: {
  where: { estadoSolicitud: { in: ['PENDIENTE', 'APROBADO'] } },
  orderBy: { createdAt: 'desc' },
  include: {
    user: { select: { nombres: true, apellidoPaterno: true } },
    aprobadoPor: { select: { nombres: true, apellidoPaterno: true } },
  },
},
```

- [ ] **Step 2: Reemplazar detección por string**

Reemplazar las líneas ~318-325:

```ts
const desistimientos = proyecto.historial.filter(h => h.comentario?.toLowerCase().includes('desistimiento'))
const huboDesistimiento = desistimientos.length > 0
const ultimoDesistimiento = desistimientos[0]
const resolucionRequiereActualizacion = huboDesistimiento && (docResolucionJurado || docResolucionAprobacion)
```

por:

```ts
const desistimientosEstructurados = proyecto.tesis?.desistimientos ?? []
const desistimientoPendiente = desistimientosEstructurados.find(d => d.estadoSolicitud === 'PENDIENTE')
const desistimientosAprobados = desistimientosEstructurados.filter(d => d.estadoSolicitud === 'APROBADO')
const ultimoAprobado = desistimientosAprobados[0]
const huboDesistimiento = desistimientosAprobados.length > 0
const resolucionRequiereActualizacion = huboDesistimiento && (docResolucionJurado || docResolucionAprobacion)
  && !ultimoAprobado?.resolucionDocumentoId
```

Ajustar según cómo se recupera `proyecto` (ver el archivo real). El campo `proyecto.tesis` puede o no existir — si el query retorna `proyecto` que ya es la tesis, usar `proyecto.desistimientos`.

- [ ] **Step 3: Añadir banner para solicitud pendiente**

En el JSX, antes de la alerta de `resolucionRequiereActualizacion`, añadir:

```tsx
{desistimientoPendiente && (
  <Card className="border-2 border-amber-400 bg-amber-50/80 dark:bg-amber-950/30">
    <CardContent className="py-4 flex items-start gap-3">
      <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
      <div className="flex-1">
        <p className="font-semibold">Solicitud de desistimiento pendiente</p>
        <p className="text-sm mt-1">
          {desistimientoPendiente.user.nombres} {desistimientoPendiente.user.apellidoPaterno} solicitó desistir.
        </p>
        <Button asChild size="sm" variant="outline" className="mt-3">
          <Link href={`/mesa-partes/desistimientos/${desistimientoPendiente.id}`}>Revisar solicitud</Link>
        </Button>
      </div>
    </CardContent>
  </Card>
)}
```

- [ ] **Step 4: Typecheck + commit**

```bash
npx tsc --noEmit
git add app/(dashboard)/mesa-partes/[id]/page.tsx
git commit -m "ui: mesa-partes expediente usa desistimientos estructurados"
```

---

## Task 19: Deprecar endpoint legacy `/api/tesis/[id]/desistir`

**Files:**
- Modify: `app/api/tesis/[id]/desistir/route.ts`

- [ ] **Step 1: Reemplazar contenido por redirect con 410**

Sobrescribir el archivo:

```ts
import { NextResponse } from 'next/server'

// GONE: este endpoint fue sustituido por /api/tesis/[id]/desistir/solicitar
// con flujo de aprobación por mesa de partes. Ver docs/superpowers/specs/2026-04-18-desistimiento-tesis-design.md
export async function POST() {
  return NextResponse.json({
    error: 'Endpoint reemplazado. Usa /api/tesis/[id]/desistir/solicitar.',
    newEndpoint: '/api/tesis/[id]/desistir/solicitar',
  }, { status: 410 })
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
npx tsc --noEmit
git add app/api/tesis/[id]/desistir/route.ts
git commit -m "api: deprecar endpoint desistir legacy (410)"
```

---

## Task 20: Script de migración de datos legacy

**Files:**
- Create: `prisma/scripts/migrate-withdrawals-legacy.ts`

Convierte los `ThesisAuthor.estado='DESISTIDO'` preexistentes en registros `ThesisWithdrawal` aprobados con categoría `OTRO`.

- [ ] **Step 1: Crear script idempotente**

```ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // @ts-expect-error: estado DESISTIDO es enum value añadido manualmente
  const autoresDesistidos = await prisma.thesisAuthor.findMany({
    where: { estado: 'DESISTIDO' as any },
    include: {
      thesis: { include: { historialEstados: { orderBy: { createdAt: 'asc' } } } },
      studentCareer: { include: { facultad: true } },
    },
  })

  let creados = 0
  let saltados = 0

  for (const a of autoresDesistidos) {
    const ya = await prisma.thesisWithdrawal.findUnique({ where: { thesisAuthorId: a.id } })
    if (ya) { saltados++; continue }

    // Derivar estado al solicitar: último estado previo en el historial
    const historial = a.thesis.historialEstados
    const idxDesist = historial.findIndex(h =>
      h.comentario?.toLowerCase().includes('desist') || h.estadoNuevo === 'DESISTIDA'
    )
    const estadoPrevio = idxDesist > 0
      ? historial[idxDesist - 1]?.estadoNuevo ?? 'BORRADOR'
      : 'BORRADOR'

    const teniaCoautor = await prisma.thesisAuthor.count({
      where: { thesisId: a.thesisId, id: { not: a.id }, estado: 'ACEPTADO' },
    }).then(n => n > 0)

    await prisma.thesisWithdrawal.create({
      data: {
        thesisId: a.thesisId,
        thesisAuthorId: a.id,
        userId: a.userId,
        studentCareerId: a.studentCareerId,
        motivoCategoria: 'OTRO',
        motivoDescripcion: a.motivoRechazo ?? '(Sin descripción — migración legacy)',
        estadoSolicitud: 'APROBADO',
        solicitadoAt: a.fechaRespuesta ?? a.createdAt,
        aprobadoAt: a.fechaRespuesta ?? a.createdAt,
        aprobadoPorId: null,
        estadoTesisAlSolicitar: estadoPrevio,
        faseActual: null,
        teniaCoautor,
        facultadIdSnapshot: a.studentCareer.facultadId,
        carreraNombreSnapshot: a.studentCareer.carreraNombre,
      },
    })
    creados++
  }

  console.log(`Migración legacy completada. Creados: ${creados}, saltados (ya existían): ${saltados}.`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
```

- [ ] **Step 2: Ejecutar en local y verificar**

```bash
npx tsx prisma/scripts/migrate-withdrawals-legacy.ts
```

Expected: "Migración legacy completada. Creados: N, saltados: 0." (o números consistentes con los DESISTIDOs preexistentes).

Ejecutar de nuevo:

```bash
npx tsx prisma/scripts/migrate-withdrawals-legacy.ts
```

Expected: "Creados: 0, saltados: N." (idempotente).

- [ ] **Step 3: Commit**

```bash
git add prisma/scripts/migrate-withdrawals-legacy.ts
git commit -m "db: script idempotente migración legacy de desistimientos"
```

---

## Task 21: Enlace "Mis desistimientos" en perfil del estudiante

**Files:**
- Modify: `app/(dashboard)/perfil/page.tsx`

- [ ] **Step 1: Añadir sección al perfil**

En el JSX del perfil, añadir una card que lista los `ThesisWithdrawal` del usuario (query SSR):

```tsx
import { prisma } from '@/lib/prisma'
import { MOTIVO_LABEL } from '@/lib/constants/motivos-desistimiento'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// dentro del componente de página, después de obtener `user`:
const misDesistimientos = await prisma.thesisWithdrawal.findMany({
  where: { userId: user.id },
  orderBy: { createdAt: 'desc' },
  include: { thesis: { select: { titulo: true } } },
})

// en el JSX:
{misDesistimientos.length > 0 && (
  <Card>
    <CardHeader><CardTitle>Mis solicitudes de desistimiento</CardTitle></CardHeader>
    <CardContent className="space-y-3">
      {misDesistimientos.map(d => (
        <div key={d.id} className="flex items-start gap-3 py-2 border-b last:border-0">
          <Badge variant="outline">{d.estadoSolicitud}</Badge>
          <div className="flex-1">
            <div className="font-medium">{d.thesis.titulo}</div>
            <div className="text-xs text-muted-foreground">
              Motivo: {MOTIVO_LABEL[d.motivoCategoria]} · Solicitado: {new Date(d.solicitadoAt).toLocaleDateString('es-PE')}
            </div>
          </div>
        </div>
      ))}
    </CardContent>
  </Card>
)}
```

Ubicar justo antes del cierre de la última columna principal de la página del perfil.

- [ ] **Step 2: Typecheck + commit**

```bash
npx tsc --noEmit
git add app/(dashboard)/perfil/page.tsx
git commit -m "ui: sección mis desistimientos en perfil"
```

---

## Task 22: Verificación integral y ajustes

**Files:**
- Modify: cualquiera que falle

- [ ] **Step 1: Build completo**

```bash
npm run build
```

Expected: build exitoso, sin errores de TypeScript.

- [ ] **Step 2: Lint**

```bash
npm run lint
```

Expected: sin errores. Si hay warnings del proyecto preexistentes, no corregir; solo corregir los que introduzca este plan.

- [ ] **Step 3: Smoke test end-to-end (dev server)**

```bash
npm run dev
```

Ejecutar secuencialmente contra una tesis de prueba con 2 autores y resolución de jurado ya subida:

1. Login como tesista autor 1 → `/mis-tesis/[id]` → "Solicitar desistimiento" → motivo `ECONOMICO` + descripción → enviar.
2. Verificar: toast, banner ámbar "en trámite", botones de flujo normal deshabilitados.
3. Login como mesa-partes → `/mesa-partes/desistimientos` → solicitud visible en PENDIENTES.
4. Abrir detalle → verificar datos del coautor que continuará + resoluciones vigentes listadas.
5. Click "Aprobar" → subir un PDF como modificatoria → aprobar.
6. Verificar: toast, se redirige a la lista, la tesis ahora está en `ASIGNANDO_JURADOS` (o lo que retroceda).
7. Como mesa-partes, visitar `/mesa-partes/reportes/desistimientos` → ver números en el dashboard, aplicar filtros, exportar Excel y abrirlo.
8. Como tesista desistente, visitar `/perfil` → ver sección "Mis solicitudes de desistimiento" con el registro APROBADO.
9. Crear nueva tesis como el tesista desistente → verificar que el sistema lo permita.

Cada paso debe pasar. Si uno falla, registrarlo y corregir.

- [ ] **Step 4: Commit de cierre**

Si hubo correcciones:
```bash
git add -A
git commit -m "desistimiento: ajustes post smoke test e2e"
```

---

## Self-Review Checklist (ejecutado al escribir este plan)

**Spec coverage:**
- ✅ §2.1 Flujo aprobación: Tasks 4, 5, 8, 9.
- ✅ §2.2 Tabla `ThesisWithdrawal`: Task 1.
- ✅ §2.3 Categorías: Task 2.
- ✅ §2.4 Versionado modificatoria: Task 1 + Task 8.
- ✅ §2.5 Reportes por motivo/facultad/fase + Excel + filtros: Tasks 10, 16, 17.
- ✅ §5.1 Flujo solicitud tesista + cancelación: Tasks 4, 5, 11, 12.
- ✅ §5.2 Flujo aprobación mesa-partes: Tasks 8, 9, 13, 15.
- ✅ §6 Reportes + permisos: Tasks 10, 17 (usa `checkPermission('mesa-partes', 'view')`).
- ✅ §8 Migración legacy: Task 20.
- ✅ §10.6 Fallback `$executeRawUnsafe`: usado en Tasks 4, 5, 8, 9.

**Placeholder scan:** revisado. Sin "TBD", "TODO" no-ejecutables, ni "implementar después". Todos los pasos tienen código concreto.

**Type consistency:** `thesisAuthorId` con `@@unique` en Task 1; `ThesisAuthor.desistimiento` relación singular. `estadoSolicitud` consistente entre endpoints y UI. `MotivoDesistimiento` enum usado en endpoints Zod (Task 4) y constants (Task 2).

**Scope:** el plan entrega software funcional end-to-end (solicitud → aprobación → reporte). No incluye extensión a informe final (declarado fuera de alcance en §10.4 del spec).

---

## Execution Handoff

**Plan completo y guardado en** `docs/superpowers/plans/2026-04-18-desistimiento-tesis.md`.

**Dos opciones de ejecución:**

**1. Subagent-Driven (recomendada)** — despacho un subagente fresco por tarea, reviso entre tareas, iteración rápida.

**2. Inline Execution** — ejecuto las tareas en esta misma sesión con checkpoints para revisar lotes.

¿Cuál prefieres?
