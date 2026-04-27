# Visualización del estado de tesistas en la vista del asesor

**Fecha:** 2026-04-26
**Ámbito:** `/mis-asesorias/[id]` (vista del asesor sobre una tesis que asesora)
**Tipo:** Mejora de UX / transparencia. Sin cambios de lógica de negocio ni de esquema.

## Problema

Cuando una tesis tiene dos tesistas y el segundo (coautor) aún no acepta su invitación, el asesor ve a ambos en la tarjeta "Tesistas" sin distinción visual alguna. El asesor cree que ambos están firmes en el proyecto y procede a firmar/registrar su carta de aceptación. Cuando el coautor acepta tarde, el sistema invalida automáticamente la carta (porque la carta lista a los tesistas vigentes y la composición cambió) y el asesor recibe la sorpresa de tener que volver a subir una nueva versión.

El sistema ya hace lo correcto a nivel de datos:

- `ThesisAuthor.estado` distingue `PENDIENTE | ACEPTADO | RECHAZADO | DESISTIDO`.
- `lib/cartas-aceptacion/invalidar.ts` marca cartas firmadas como `requiereActualizacion=true` cuando un coautor acepta tarde (`app/api/mis-invitaciones/[id]/responder/route.ts:114-120`) o cuando se aprueba un desistimiento (`app/api/mesa-partes/desistimientos/[id]/aprobar/route.ts:233`).
- `app/api/tesis/[id]/enviar/route.ts:183-197` bloquea el envío a mesa de partes mientras el coautor siga `PENDIENTE`.

El problema es de **visualización y comunicación al asesor**:

1. La API `app/api/mis-asesorias/[id]/route.ts:182-189` no incluye `estado` en `tesistas`.
2. El tipo `Tesista` en `app/(dashboard)/mis-asesorias/[id]/page.tsx:57-70` no tiene `estado`.
3. La tarjeta "Tesistas" (`page.tsx:1066-1079`) no muestra ningún badge de estado, mientras que la tarjeta "Asesores" justo debajo (`page.tsx:1107-1113`) sí lo hace.
4. El bloque de subir carta (`page.tsx:706-880`) no advierte al asesor que un coautor pendiente puede invalidar su carta firmada.

## Decisión

Dos cambios pequeños, ambos en el flujo del asesor:

### 1. Mostrar estado del tesista con badge en la tarjeta "Tesistas"

Replicar el patrón visual ya existente en la tarjeta "Asesores" para coherencia interna.

- **API** `app/api/mis-asesorias/[id]/route.ts:182-189` — agregar `estado` y `fechaRespuesta` al objeto `tesistas`:

  ```ts
  tesistas: tesis.autores.map((a) => ({
    id: a.id,
    tipoParticipante: a.orden === 1 ? 'AUTOR_PRINCIPAL' : 'COAUTOR',
    orden: a.orden,
    user: a.user,
    codigoEstudiante: a.studentCareer?.codigoEstudiante || 'Sin código',
    carrera: a.studentCareer?.carreraNombre || 'Sin carrera',
    estado: a.estado,
    fechaRespuesta: a.fechaRespuesta,
  })),
  ```

- **Tipo** `Tesista` en `app/(dashboard)/mis-asesorias/[id]/page.tsx:57-70` — agregar:

  ```ts
  estado: 'PENDIENTE' | 'ACEPTADO' | 'RECHAZADO' | 'DESISTIDO'
  fechaRespuesta: string | null
  ```

- **Card "Tesistas"** (`page.tsx:1066-1079`) — agregar badge al lado del rol del tesista:
  - `ACEPTADO` → sin badge (estado normal, evita ruido visual)
  - `PENDIENTE` → `border-yellow-500 text-yellow-600`, texto **"Pendiente de aceptar"**
  - `RECHAZADO` → `border-red-500 text-red-600`, texto **"Rechazó"**
  - `DESISTIDO` → `border-gray-400 text-gray-500`, texto **"Desistió"**, además aplicar `text-muted-foreground line-through` al nombre (es histórico)

  Mantener el orden actual (`orderBy: orden asc`).

### 2. Aviso preventivo sobre la futura invalidación de la carta

Dentro de `<CardContent>` del bloque "Carta de Aceptación" (`page.tsx:735`), justo antes del subbloque "Subir Carta de Aceptación" (línea 737), mostrar un alert solo si:

- existe al menos un autor con `orden > 1 && estado === 'PENDIENTE'`, **y**
- el asesor aún no tiene una carta firmada vigente (`!miCartaFirmada` o esté reemplazando).

Texto exacto:

> ⚠️ **Hay un coautor pendiente de aceptar la invitación: <Nombre Apellido>.** Si firmas tu carta ahora y el coautor acepta después, deberás subir una nueva versión que lo incluya. Puedes esperar a que acepte para evitarlo.

Estilo: alert amarillo (`bg-amber-50 border-amber-200 text-amber-900` con `Info` o `AlertTriangle` icon de lucide), consistente con el estilo de "Desactualizada" ya usado en `page.tsx:921-929`.

## Lo que NO se cambia

- `lib/cartas-aceptacion/invalidar.ts` y sus disparadores ya funcionan; no se tocan.
- Bloqueo de `enviar` mientras coautor sigue `PENDIENTE` ya funciona; no se toca.
- `RECHAZADO` y `DESISTIDO`: no se separan en sub-secciones — el badge basta. Caben en el mismo bloque "Tesistas".
- No se modifica `/mis-tesis/*`, `/mesa-partes/*`, ni la generación de PDF de la carta. Esas vistas tienen su propio contexto y ya muestran lo que necesitan.

## Casos a verificar manualmente tras la implementación

1. Tesis con 1 tesista (sin coautor) → tarjeta "Tesistas" se ve igual que antes. Sin badge. Sin alert.
2. Tesis con tesista 1 ACEPTADO + tesista 2 PENDIENTE → tesista 2 muestra badge "Pendiente de aceptar". El alert amarillo aparece en el bloque de subir carta.
3. Tesista 2 acepta → la página recarga, tesista 2 ya no muestra badge, alert desaparece, y (si la carta ya estaba firmada) se ve el badge "Desactualizada" en la carta.
4. Tesista 2 rechaza → badge rojo "Rechazó". Alert ya no aparece (porque solo aplica a `PENDIENTE`).
5. Tesista 1 desiste y tesista 2 queda como autor activo → tesista 1 muestra badge gris "Desistió" tachado. Es histórico esperado.
6. Asesor ya tiene carta firmada vigente y luego un coautor pasa a `PENDIENTE` (no debería pasar en flujo normal, pero defensivo) → no se muestra el alert preventivo (la carta ya está firmada y, si fue invalidada por otro motivo, ya hay un mensaje "Desactualizada" propio).

## Archivos a tocar

- `app/api/mis-asesorias/[id]/route.ts` — agregar `estado` y `fechaRespuesta` a `tesistas`.
- `app/(dashboard)/mis-asesorias/[id]/page.tsx` — extender tipo `Tesista`, agregar badge en card, agregar alert preventivo.

Estimación: ~40 líneas de cambio total.
