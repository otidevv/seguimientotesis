# Spec: Sistema de Desistimiento de Tesis

**Fecha:** 2026-04-18
**Autor:** Brainstorming con Claude Code
**Alcance:** Fase de gestión de proyecto de tesis (hasta `PROYECTO_APROBADO`)

---

## 1. Contexto

En el sistema de seguimiento de tesis de la UNAMAD, durante la fase de gestión de proyecto los estudiantes a veces **desisten voluntariamente** de continuar con su tesis. Existen dos escenarios:

1. **Tesis con dos autores** — uno desiste y el otro continúa como autor único.
2. **Tesis con un único autor** — la tesis pasa a estado `DESISTIDA`.

Cuando ya se emitió una **resolución administrativa** (de conformación de jurado o de aprobación del proyecto) antes del desistimiento, mesa de partes debe emitir una **resolución modificatoria** con los datos actualizados del (los) tesista(s) restante(s).

Actualmente existe un endpoint self-service (`POST /api/tesis/[id]/desistir`) que marca al autor como `DESISTIDO` y guarda el motivo como texto libre en `ThesisAuthor.motivoRechazo`. No hay:

- Flujo de aprobación oficial por mesa de partes.
- Tabla estructurada para reportes ("cuántos desistieron en el año y por qué motivo").
- Mecanismo formal para reemplazar resoluciones (solo una alerta UI que avisa al operador de mesa de partes).

## 2. Objetivos

1. Introducir **flujo de aprobación**: el tesista solicita desistimiento → mesa de partes revisa → aprueba (subiendo resolución modificatoria si aplica) o rechaza.
2. Crear **tabla estructurada `ThesisWithdrawal`** para historial y reportes.
3. Estandarizar **categorías de motivo** (10 opciones + descripción libre).
4. **Versionar** documentos de resolución (`esModificatoria`, `reemplazaDocumentoId`).
5. Habilitar **reportes** agregables: por motivo, por facultad/carrera, por fase de la tesis, y listado exportable a Excel con filtros.

## 3. Estado actual (código existente relevante)

| Archivo | Rol |
|---|---|
| `prisma/schema.prisma` | Ya tiene `EstadoAutor.DESISTIDO` y `EstadoTesis.DESISTIDA` |
| `app/api/tesis/[id]/desistir/route.ts` | Endpoint self-service, estados permitidos `BORRADOR`…`PROYECTO_APROBADO` |
| `app/(dashboard)/mis-tesis/[id]/page.tsx` | UI del tesista con botón "Desistir" |
| `app/(dashboard)/mesa-partes/[id]/page.tsx` | Alerta por string-matching ("Resoluciones requieren actualización") |
| `app/(dashboard)/mesa-partes/reportes/page.tsx` | Reporte Excel genérico por facultad/año (no específico) |

La lógica actual de retroceso de estado (`ESTADOS_RETROCEDE_BORRADOR`, `ESTADOS_RETROCEDE_JURADOS`) se reutiliza dentro del nuevo flujo de aprobación.

## 4. Cambios al schema de base de datos

### 4.1 Nuevos enums

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
  RECHAZADO          // Rechazado por mesa de partes
  CANCELADO          // Cancelado por el propio tesista antes de aprobación

  @@map("estado_solicitud_desistimiento")
}
```

### 4.2 Nuevo valor en `EstadoTesis`

```prisma
// Agregar al enum existente
SOLICITUD_DESISTIMIENTO   // Tesista solicitó, esperando aprobación de mesa de partes
```

### 4.3 Nueva tabla `ThesisWithdrawal`

```prisma
model ThesisWithdrawal {
  id                    String     @id @default(cuid())
  thesisId              String     @map("thesis_id")
  thesisAuthorId        String     @map("thesis_author_id")
  userId                String     @map("user_id")
  studentCareerId       String     @map("student_career_id")

  // Motivo (híbrido: categoría + descripción)
  motivoCategoria       MotivoDesistimiento @map("motivo_categoria")
  motivoDescripcion     String     @map("motivo_descripcion") @db.Text

  // Estado de la solicitud
  estadoSolicitud       EstadoSolicitudDesistimiento @default(PENDIENTE) @map("estado_solicitud")
  solicitadoAt          DateTime   @default(now()) @map("solicitado_at")
  aprobadoPorId         String?    @map("aprobado_por_id")
  aprobadoAt            DateTime?  @map("aprobado_at")
  motivoRechazoMesaPartes String?  @map("motivo_rechazo_mesa_partes") @db.Text
  resolucionDocumentoId String?    @map("resolucion_documento_id")

  // Snapshots del contexto (inmutables, para reportes históricos)
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

Los snapshots (`facultadIdSnapshot`, `carreraNombreSnapshot`, `estadoTesisAlSolicitar`, `teniaCoautor`, `faseActual`) garantizan que los reportes históricos sigan mostrando datos correctos aunque el estudiante cambie de carrera o la tesis cambie de estado después.

### 4.4 Cambios en `ThesisDocument`

```prisma
// Agregar campos para versionado con linaje
esModificatoria        Boolean   @default(false) @map("es_modificatoria")
reemplazaDocumentoId   String?   @map("reemplaza_documento_id")

reemplazaDocumento     ThesisDocument?  @relation("DocumentoModificatorias", fields: [reemplazaDocumentoId], references: [id])
modificatorias         ThesisDocument[] @relation("DocumentoModificatorias")
```

Cuando mesa de partes sube la modificatoria:
- La nueva versión tiene `esModificatoria=true`, `reemplazaDocumentoId` apuntando a la anterior, `esVersionActual=true`, `version = anterior.version + 1`.
- La anterior queda con `esVersionActual=false` pero sigue accesible en el historial.
- Ambos documentos comparten el mismo `tipo` (`RESOLUCION_JURADO` o `RESOLUCION_APROBACION`).

## 5. Flujos del sistema

### 5.1 Flujo A — Solicitud de desistimiento (tesista)

Estados de entrada permitidos: `BORRADOR`, `EN_REVISION`, `OBSERVADA`, `ASIGNANDO_JURADOS`, `EN_EVALUACION_JURADO`, `OBSERVADA_JURADO`, `PROYECTO_APROBADO` (los mismos que hoy).

1. Tesista en `/mis-tesis/[id]` abre modal "Solicitar desistimiento".
2. Modal requiere: categoría (select con las 10 opciones) + descripción (textarea, mínimo 20 caracteres).
3. `POST /api/tesis/[id]/desistir/solicitar` con `{ motivoCategoria, motivoDescripcion }`:
   - Crea `ThesisWithdrawal` con `estadoSolicitud=PENDIENTE` y snapshots.
   - Guarda el estado actual de la tesis en `estadoTesisAlSolicitar`.
   - Cambia `Thesis.estado` → `SOLICITUD_DESISTIMIENTO`.
   - Registra entrada en `ThesisStatusHistory`.
   - Notifica al rol `MESA_PARTES` de la facultad.
4. UI del tesista cambia a estado "Solicitud en trámite". Deshabilita acciones de flujo normal (subir documentos, enviar a revisión) hasta resolver.
5. El tesista puede **cancelar** su solicitud mientras esté `PENDIENTE` → revierte `Thesis.estado` al `estadoTesisAlSolicitar` y marca `ThesisWithdrawal.estadoSolicitud=CANCELADO`. `motivoRechazoMesaPartes` queda `null` (la cancelación no es un rechazo administrativo).

### 5.2 Flujo B — Mesa de partes revisa

1. Mesa de partes ve lista paginada en `/mesa-partes/desistimientos` filtrada por facultad asignada al operador, estado por defecto `PENDIENTE`.
2. Al abrir una solicitud (`/mesa-partes/desistimientos/[id]`):
   - Datos del tesista (nombres, carrera, código).
   - Motivo (categoría + descripción).
   - Estado de la tesis al momento de solicitar.
   - Si hay coautor: tarjeta con datos del coautor que quedaría como autor único.
   - Lista de resoluciones ya emitidas que requerirán modificatoria (detectado por presencia de `RESOLUCION_JURADO` o `RESOLUCION_APROBACION` con `esVersionActual=true`).
3. Dos acciones:

   **Aprobar** (`POST /api/mesa-partes/desistimientos/[id]/aprobar`):
   - Si hay resoluciones vigentes → exige subir archivo(s) modificatoria(s) antes de aprobar. El endpoint acepta `FormData` con el/los archivos + indicación de qué resolución reemplazan.
   - En transacción:
     - Crea nuevos `ThesisDocument` con `esModificatoria=true`, `reemplazaDocumentoId`, `esVersionActual=true`.
     - Marca documentos anteriores como `esVersionActual=false`.
     - Ejecuta la lógica de transición de autor (idéntica a la actual): si hay coautor, promueve; si no, marca tesis como `DESISTIDA`.
     - Determina el estado objetivo: si coautor → `estadoTesisAlSolicitar` retrocedido según reglas `ESTADOS_RETROCEDE_*`; si único autor → `DESISTIDA`.
     - Actualiza `ThesisAuthor` del desistente a `estado=DESISTIDO`, `motivoRechazo = motivoDescripcion`.
     - Actualiza `ThesisWithdrawal`: `estadoSolicitud=APROBADO`, `aprobadoAt`, `aprobadoPorId`, `resolucionDocumentoId` (primera modificatoria creada).
     - Registra en `ThesisStatusHistory`.
   - Notifica al tesista, coautor (si aplica) y asesores.

   **Rechazar** (`POST /api/mesa-partes/desistimientos/[id]/rechazar`):
   - Requiere `motivoRechazoMesaPartes` (mínimo 10 caracteres).
   - Revierte `Thesis.estado` a `ThesisWithdrawal.estadoTesisAlSolicitar`.
   - Marca `ThesisWithdrawal.estadoSolicitud=RECHAZADO`.
   - Notifica al tesista con el motivo.

### 5.3 Flujo C — Reportes

- Solo entradas con `estadoSolicitud=APROBADO` cuentan para reportes de desistimientos efectivos.
- Las `RECHAZADO`, `CANCELADO` y `PENDIENTE` se muestran como métricas operativas separadas (SLA de mesa de partes, tasa de rechazo, tasa de cancelación).

## 6. Reportes

### 6.1 Ubicación

Página: `/mesa-partes/reportes/desistimientos` (reutiliza la subnav de mesa de partes). El reporte también es accesible desde `/reportes/desistimientos` con permisos de admin.

### 6.2 Filtros

- **Rango de fechas** (sobre `aprobadoAt`).
- **Facultad** (sobre `facultadIdSnapshot`).
- **Carrera** (dropdown derivado de `carreraNombreSnapshot` dentro de la facultad).
- **Motivo** (categoría; multi-select).
- **Fase** (PROYECTO / INFORME_FINAL; inicialmente solo PROYECTO).
- **Estado al desistir** (multi-select sobre `estadoTesisAlSolicitar`).
- **Tenía coautor** (sí/no/todos).

### 6.3 Vistas

1. **Dashboard (cards + gráficos)**:
   - Card: total de desistimientos en el rango.
   - Card: % con coautor vs. único autor.
   - Gráfico de torta: distribución por motivo (categoría).
   - Gráfico de barras: desistimientos por facultad.
   - Gráfico de barras: desistimientos por fase/estado al desistir.
2. **Listado**: tabla paginada con columnas — fecha aprobación, estudiante (apellidos, nombres), código, carrera, facultad, motivo (badge), descripción (truncada con tooltip), fase, tenía coautor. Sort por columnas.
3. **Exportar Excel**: `GET /api/mesa-partes/desistimientos/reporte?...filtros...` genera `.xlsx` con columnas completas (incluye descripción íntegra).

### 6.4 Permisos

- `mesa-partes.view` (contextualizado a facultad) → ve y opera solicitudes + reportes de su facultad.
- Rol `ADMIN` o equivalente → reportes globales, sin filtro de facultad.
- Estudiante → ve sólo su propio historial en `/perfil` (sección "Historial de desistimientos").

## 7. Archivos a crear / modificar

### 7.1 Nuevos

| Ruta | Descripción |
|---|---|
| `prisma/migrations/YYYYMMDD_add_thesis_withdrawal/migration.sql` | Enums, tabla, flag modificatoria |
| `lib/constants/motivos-desistimiento.ts` | Labels y descripciones de las 10 categorías |
| `app/api/tesis/[id]/desistir/solicitar/route.ts` | POST: crea solicitud |
| `app/api/tesis/[id]/desistir/cancelar/route.ts` | POST: tesista cancela su propia solicitud |
| `app/api/mesa-partes/desistimientos/route.ts` | GET: lista paginada con filtros |
| `app/api/mesa-partes/desistimientos/[id]/route.ts` | GET: detalle de solicitud |
| `app/api/mesa-partes/desistimientos/[id]/aprobar/route.ts` | POST: aprueba + sube modificatoria |
| `app/api/mesa-partes/desistimientos/[id]/rechazar/route.ts` | POST: rechaza con motivo |
| `app/api/mesa-partes/desistimientos/reporte/route.ts` | GET: datos JSON para dashboard y Excel |
| `app/(dashboard)/mesa-partes/desistimientos/page.tsx` | Lista de solicitudes |
| `app/(dashboard)/mesa-partes/desistimientos/[id]/page.tsx` | Detalle + acciones |
| `app/(dashboard)/mesa-partes/reportes/desistimientos/page.tsx` | Dashboard + listado |
| `components/desistimiento/modal-solicitar-desistimiento.tsx` | Modal del tesista |
| `components/desistimiento/panel-aprobacion.tsx` | Panel de mesa de partes con upload de modificatoria |
| `components/desistimiento/lista-desistimientos.tsx` | Tabla con filtros |
| `components/desistimiento/reporte-dashboard.tsx` | Gráficos (usar lib ya instalada o `recharts`) |
| `lib/excel/reporte-desistimientos.ts` | Generador de Excel |

### 7.2 Modificaciones

| Ruta | Cambio |
|---|---|
| `prisma/schema.prisma` | Enums, modelo `ThesisWithdrawal`, campos en `ThesisDocument`, `Thesis`, `User`, `Faculty`, `StudentCareer`, `ThesisAuthor` (relaciones inversas) |
| `app/api/tesis/[id]/desistir/route.ts` | Deprecar: redirigir a `/solicitar` o responder 410 Gone |
| `app/(dashboard)/mis-tesis/[id]/page.tsx` | Usar nuevo modal; mostrar banner "Solicitud en trámite" cuando `estado=SOLICITUD_DESISTIMIENTO` |
| `app/(dashboard)/mesa-partes/[id]/page.tsx` | Reemplazar alerta por enlace al panel de desistimientos; derivar estado desde `ThesisWithdrawal` en lugar de string-matching |
| `components/tesis/constants.tsx` | Agregar entrada `SOLICITUD_DESISTIMIENTO` a `ESTADO_CONFIG` |
| `components/tesis/thesis-sidebar.tsx` | Mostrar estado si aplica |
| `app/(dashboard)/perfil/page.tsx` | Sección "Mis solicitudes de desistimiento" |

## 8. Migración de datos existentes

Ya hay registros con `ThesisAuthor.estado='DESISTIDO'` y `motivoRechazo` en texto libre (creados por el endpoint actual). El script de migración:

1. Para cada `ThesisAuthor` con `estado='DESISTIDO'`, crea un `ThesisWithdrawal` con:
   - `motivoCategoria='OTRO'`, `motivoDescripcion = motivoRechazo`.
   - `estadoSolicitud='APROBADO'` (asume que ya se ejecutó).
   - `aprobadoAt = fechaRespuesta`, `aprobadoPorId = null` (legacy).
   - `estadoTesisAlSolicitar` = inferido del último `ThesisStatusHistory` antes del desistimiento, o `BORRADOR` por defecto.
   - Snapshots a partir del `studentCareer` actual.

2. Idempotente: si ya existe `ThesisWithdrawal` para ese `thesisAuthorId`, saltarlo.

## 9. Testing / validación

- **Unidad**: validaciones de motivo (longitud, categoría válida), transiciones de estado.
- **Integración**:
  - Caso A: 2 autores, sin resolución → desiste → aprueba → coautor queda solo, tesis sigue.
  - Caso B: 2 autores + `RESOLUCION_JURADO` vigente → desiste → aprueba con upload modificatoria → modificatoria v2 vigente, v1 histórica.
  - Caso C: autor único → desiste → aprueba → tesis `DESISTIDA`.
  - Caso D: mesa-partes rechaza → estado vuelve al previo, notificación.
  - Caso E: tesista cancela → estado vuelve al previo.
  - Caso F: tesista desistido crea nueva tesis exitosamente.
- **Reportes**: filtro por año + motivo + facultad devuelve conteo correcto; Excel se genera sin errores.

## 10. Riesgos y puntos abiertos

1. **Plazo máximo de respuesta de mesa de partes** — no se define SLA en esta fase. Si se requiere, se agrega en fase 2 (auto-expirar solicitudes viejas, recordatorios).
2. **Resoluciones modificatorias en cadena** — un segundo desistimiento después de una modificatoria debería seguir el mismo patrón. `reemplazaDocumentoId` siempre apunta a la versión actual al momento del reemplazo, formando una cadena.
3. **Permiso contextualizado por facultad** — el modelo `UserRole` ya soporta `contextType` + `contextId`; esta funcionalidad aprovecha eso. Confirmar que mesa-partes ya tiene sus roles contextualizados por facultad.
6. **Enum DESISTIDO ya existente y cliente Prisma** — el endpoint actual usa `$executeRawUnsafe` porque el Prisma Client no reconocía `DESISTIDO` tras agregar el enum value. La migración de este spec debe ejecutarse **antes** de `prisma generate` + build, o mantener el mismo fallback con SQL crudo para los valores nuevos (`SOLICITUD_DESISTIMIENTO`, `CANCELADO`, `MotivoDesistimiento`).
4. **Informe final** — el alcance inicial es solo fase proyecto. Extender a informe final es lineal: permitir los estados `EN_REVISION_INFORME`, `EN_EVALUACION_INFORME`, `OBSERVADA_INFORME` y agregar `RESOLUCION_JURADO_INFORME` al listado de resoluciones que pueden requerir modificatoria.
5. **Privacidad en reportes** — ¿la descripción del motivo se muestra en el dashboard o solo el agregado? Por defecto, en dashboard solo agregado; en listado + Excel, sí se muestra (porque el operador de mesa de partes ya tenía acceso al aprobar).

---

**Siguiente paso:** revisar este spec y, si está conforme, pasar a la fase de plan de implementación detallado.
