/**
 * Helpers para resolver el scope de un usuario que opera como mesa-partes.
 *
 * Antes (bug #6 de la auditoría): el patrón duplicado en 12+ endpoints permitía
 * que un usuario con rol MESA_PARTES sin `contextId` pasara la validación de
 * facultad — el `if (rolScope)` simplemente no entraba y la operación procedía
 * sin verificar nada. Resultado: privilege escalation involuntaria.
 *
 * Ahora `getMesaPartesScope` devuelve `null` cuando el rol está mal configurado
 * y los endpoints deben tratarlo como 403 (fail-closed).
 */

interface RoleEntry {
  isActive: boolean
  contextType: string | null
  contextId: string | null
  role: { codigo: string }
}

interface UserWithRoles {
  roles?: RoleEntry[] | null
}

export interface MesaPartesScope {
  /** ADMIN / SUPER_ADMIN: ve todas las facultades. */
  esAdmin: boolean
  /** null si esAdmin = true; en otro caso es la facultad asignada al rol. */
  facultadId: string | null
}

/**
 * Resuelve el scope de mesa-partes para un usuario.
 * - ADMIN / SUPER_ADMIN → scope global.
 * - MESA_PARTES con contextType=FACULTAD y contextId → scope estricto a esa facultad.
 * - MESA_PARTES sin contextId / contextType → null (configuración inválida).
 * - Sin rol relevante → null.
 */
export function getMesaPartesScope(user: UserWithRoles): MesaPartesScope | null {
  const esAdmin = user.roles?.some(
    (r) => ['ADMIN', 'SUPER_ADMIN'].includes(r.role.codigo) && r.isActive
  ) ?? false
  if (esAdmin) {
    return { esAdmin: true, facultadId: null }
  }

  const rolMesa = user.roles?.find(
    (r) =>
      r.role.codigo === 'MESA_PARTES' &&
      r.isActive &&
      r.contextType === 'FACULTAD' &&
      r.contextId
  )
  if (rolMesa && rolMesa.contextId) {
    return { esAdmin: false, facultadId: rolMesa.contextId }
  }

  // No es admin ni tiene MESA_PARTES con scope estricto → fail-closed.
  return null
}

/**
 * Devuelve true si la tesis cae fuera del scope del usuario.
 * - Admin: nunca está fuera.
 * - Mesa-partes con facultad: la tesis debe ser de la misma facultad.
 * - Tesis sin facultad asignada: se permite (los listados no la filtran).
 */
export function tesisFueraDeScope(
  scope: MesaPartesScope,
  facultadIdTesis: string | null | undefined,
): boolean {
  if (scope.esAdmin) return false
  if (!facultadIdTesis) return false
  return facultadIdTesis !== scope.facultadId
}
