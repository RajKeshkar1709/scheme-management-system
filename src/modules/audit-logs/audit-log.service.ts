import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { AUDIT_SOURCE } from '../../common/constants';

export interface AuditEntry {
  entityType: string;
  entityId: string;
  schemeVersionId?: string | null;
  fieldName: string;
  oldValue: unknown;
  newValue: unknown;
  changedBy: string;
  source?: string;
}

export class AuditLogService {
  static async recordChanges(tx: Prisma.TransactionClient, entries: AuditEntry[]): Promise<void> {
    if (entries.length === 0) return;

    await tx.auditLog.createMany({
      data: entries.map((entry) => ({
        entityType: entry.entityType,
        entityId: entry.entityId,
        schemeVersionId: entry.schemeVersionId || null,
        fieldName: entry.fieldName,
        oldValue:
          entry.oldValue === undefined
            ? Prisma.JsonNull
            : (entry.oldValue as Prisma.InputJsonValue),
        newValue:
          entry.newValue === undefined
            ? Prisma.JsonNull
            : (entry.newValue as Prisma.InputJsonValue),
        changedBy: entry.changedBy,
        source: entry.source || AUDIT_SOURCE.ADMIN_API,
      })),
    });
  }

  static async getSchemeAuditLogs(schemeId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: { entityId: schemeId },
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where: { entityId: schemeId } }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  static async getAllAuditLogs(
    filters: {
      entityType?: string;
      entityId?: string;
      changedBy?: string;
    },
    page = 1,
    limit = 20,
  ) {
    const skip = (page - 1) * limit;
    const where: Prisma.AuditLogWhereInput = {};

    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.entityId) where.entityId = filters.entityId;
    if (filters.changedBy) where.changedBy = filters.changedBy;

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
