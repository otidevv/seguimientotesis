import { prisma } from '@/lib/prisma'

export interface SystemConfigResponse {
  id: string
  key: string
  value: string
  type: string
  category: string
  label: string
  description: string | null
  updatedAt: Date
  updatedBy: string | null
}

// Definición de settings por defecto con sus categorías
const DEFAULT_SETTINGS: Omit<SystemConfigResponse, 'id' | 'updatedAt' | 'updatedBy'>[] = [
  // Plazos
  {
    key: 'DIAS_HABILES_EVALUACION',
    value: '15',
    type: 'number',
    category: 'plazos',
    label: 'Días hábiles para evaluación de jurados',
    description: 'Cantidad de días hábiles que tienen los jurados para evaluar una tesis',
  },
  {
    key: 'DIAS_CALENDARIO_CORRECCION_PROYECTO',
    value: '30',
    type: 'number',
    category: 'plazos',
    label: 'Días calendario para corrección de proyecto',
    description: 'Plazo que tiene el tesista para subsanar observaciones en la fase de gestión de proyecto (ampliable a 30 más a solicitud)',
  },
  {
    key: 'DIAS_HABILES_CORRECCION_INFORME',
    value: '15',
    type: 'number',
    category: 'plazos',
    label: 'Días hábiles para corrección de informe final',
    description: 'Plazo que tiene el tesista para subsanar observaciones en la fase de informe final (Reglamento Art. 89)',
  },
  // Seguridad
  {
    key: 'MAX_LOGIN_ATTEMPTS',
    value: '5',
    type: 'number',
    category: 'seguridad',
    label: 'Máximo de intentos de login',
    description: 'Cantidad máxima de intentos de login fallidos antes de bloquear la cuenta',
  },
  {
    key: 'LOCK_TIME_MINUTES',
    value: '15',
    type: 'number',
    category: 'seguridad',
    label: 'Tiempo de bloqueo (minutos)',
    description: 'Minutos que permanece bloqueada una cuenta tras superar los intentos máximos',
  },
  {
    key: 'JWT_ACCESS_EXPIRES',
    value: '60m',
    type: 'string',
    category: 'seguridad',
    label: 'Duración del token de acceso',
    description: 'Duración del token JWT de acceso (ej: 15m, 1h, 60m)',
  },
  {
    key: 'JWT_REFRESH_EXPIRES',
    value: '7d',
    type: 'string',
    category: 'seguridad',
    label: 'Duración del token de refresco',
    description: 'Duración del token de refresco (ej: 7d, 30d)',
  },
  {
    key: 'JWT_REFRESH_REMEMBER_EXPIRES',
    value: '30d',
    type: 'string',
    category: 'seguridad',
    label: 'Duración del token "Recordarme"',
    description: 'Duración del token de refresco cuando el usuario marca "Recordarme"',
  },
  // Email
  {
    key: 'MAIL_HOST',
    value: 'smtp.gmail.com',
    type: 'string',
    category: 'email',
    label: 'Servidor SMTP',
    description: 'Host del servidor de correo SMTP',
  },
  {
    key: 'MAIL_PORT',
    value: '587',
    type: 'number',
    category: 'email',
    label: 'Puerto SMTP',
    description: 'Puerto del servidor SMTP',
  },
  // General
  {
    key: 'APP_NAME',
    value: 'Sistema de Seguimiento de Tesis - UNAMAD',
    type: 'string',
    category: 'general',
    label: 'Nombre de la aplicación',
    description: 'Nombre que se muestra en el sistema y en los correos electrónicos',
  },
  {
    key: 'APP_URL',
    value: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    type: 'string',
    category: 'general',
    label: 'URL base de la aplicación',
    description: 'URL base utilizada en correos electrónicos y redirecciones',
  },
]

export class SettingsService {
  /**
   * Obtener todas las configuraciones, inicializando defaults si no existen
   */
  async getAll(): Promise<SystemConfigResponse[]> {
    // Asegurar que los defaults existan
    await this.ensureDefaults()

    const configs = await prisma.systemConfig.findMany({
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    })

    return configs
  }

  /**
   * Obtener configuraciones por categoría
   */
  async getByCategory(category: string): Promise<SystemConfigResponse[]> {
    await this.ensureDefaults()

    return prisma.systemConfig.findMany({
      where: { category },
      orderBy: { key: 'asc' },
    })
  }

  /**
   * Obtener un valor de configuración
   */
  async getValue(key: string): Promise<string | null> {
    const config = await prisma.systemConfig.findUnique({ where: { key } })
    return config?.value ?? null
  }

  /**
   * Actualizar una configuración
   */
  async update(
    key: string,
    value: string,
    updatedBy: string
  ): Promise<SystemConfigResponse> {
    const config = await prisma.systemConfig.update({
      where: { key },
      data: { value, updatedBy },
    })
    return config
  }

  /**
   * Actualizar múltiples configuraciones a la vez
   */
  async updateMany(
    updates: { key: string; value: string }[],
    updatedBy: string
  ): Promise<SystemConfigResponse[]> {
    const results = await prisma.$transaction(
      updates.map(({ key, value }) =>
        prisma.systemConfig.update({
          where: { key },
          data: { value, updatedBy },
        })
      )
    )
    return results
  }

  /**
   * Asegurar que existan los defaults en la BD
   */
  private async ensureDefaults(): Promise<void> {
    const existing = await prisma.systemConfig.findMany({
      select: { key: true },
    })
    const existingKeys = new Set(existing.map((c) => c.key))

    const missing = DEFAULT_SETTINGS.filter((s) => !existingKeys.has(s.key))

    if (missing.length > 0) {
      for (const setting of missing) {
        await prisma.systemConfig.upsert({
          where: { key: setting.key },
          update: {},
          create: setting,
        })
      }
    }
  }
}

export const settingsService = new SettingsService()
