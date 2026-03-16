import { prisma } from '@/lib/prisma'
import type { PaginatedResponse } from '../types'

export interface AuditLogResponse {
  id: string
  userId: string | null
  action: string
  entityType: string | null
  entityId: string | null
  description: string | null
  oldValues: unknown
  newValues: unknown
  metadata: unknown
  ipAddress: string | null
  userAgent: string | null
  requestPath: string | null
  requestMethod: string | null
  status: string
  errorMessage: string | null
  createdAt: Date
  user: {
    id: string
    nombres: string
    apellidoPaterno: string
    apellidoMaterno: string
    email: string
  } | null
}

export interface AuditQueryInput {
  page: number
  limit: number
  search?: string
  action?: string
  entityType?: string
  status?: string
  userId?: string
  dateFrom?: string
  dateTo?: string
  sortBy?: string
  sortOrder?: string
}

export class AuditService {
  async list(query: AuditQueryInput): Promise<PaginatedResponse<AuditLogResponse>> {
    const {
      page = 1,
      limit = 20,
      search,
      action,
      entityType,
      status,
      userId,
      dateFrom,
      dateTo,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query

    const where: any = {}

    if (search) {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { action: { contains: search, mode: 'insensitive' } },
        { entityId: { contains: search, mode: 'insensitive' } },
        { user: { nombres: { contains: search, mode: 'insensitive' } } },
        { user: { apellidoPaterno: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ]
    }

    if (action) {
      where.action = action
    }

    if (entityType) {
      where.entityType = entityType
    }

    if (status) {
      where.status = status
    }

    if (userId) {
      where.userId = userId
    }

    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom)
      }
      if (dateTo) {
        const endDate = new Date(dateTo)
        endDate.setHours(23, 59, 59, 999)
        where.createdAt.lte = endDate
      }
    }

    const allowedSortFields = ['createdAt', 'action', 'entityType', 'status']
    const orderField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt'
    const orderDir = sortOrder === 'asc' ? 'asc' : 'desc'

    const [data, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              nombres: true,
              apellidoPaterno: true,
              apellidoMaterno: true,
              email: true,
            },
          },
        },
        orderBy: { [orderField]: orderDir },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ])

    const totalPages = Math.ceil(total / limit)

    return {
      data: data as unknown as AuditLogResponse[],
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    }
  }

  async getActions(): Promise<string[]> {
    const actions = await prisma.auditLog.findMany({
      select: { action: true },
      distinct: ['action'],
      orderBy: { action: 'asc' },
    })
    return actions.map((a) => a.action)
  }

  async getEntityTypes(): Promise<string[]> {
    const types = await prisma.auditLog.findMany({
      select: { entityType: true },
      distinct: ['entityType'],
      where: { entityType: { not: null } },
      orderBy: { entityType: 'asc' },
    })
    return types.map((t) => t.entityType).filter(Boolean) as string[]
  }
}

export const auditService = new AuditService()
