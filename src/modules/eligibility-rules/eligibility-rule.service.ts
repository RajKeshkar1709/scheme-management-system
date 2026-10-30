import { prisma } from '../../config/database';
import { AppError } from '../../common/utils/app-error';
import { AuditLogService } from '../audit-logs/audit-log.service';
import {
  CreateEligibilityRuleInput,
  UpdateEligibilityRuleInput,
} from './eligibility-rule.validation';
import { ReviewFlagStatus } from '../../common/enums';
import { Prisma } from '@prisma/client';

export class EligibilityRuleService {
  static async createRule(input: CreateEligibilityRuleInput, userId: string) {
    const existing = await prisma.eligibilityRule.findUnique({
      where: { ruleCode: input.ruleCode.trim().toUpperCase() },
    });

    if (existing) {
      throw AppError.conflict(`Eligibility rule with code '${input.ruleCode}' already exists`);
    }

    return prisma.$transaction(async (tx) => {
      const rule = await tx.eligibilityRule.create({
        data: {
          ruleCode: input.ruleCode.trim().toUpperCase(),
          name: input.name,
          description: input.description,
        },
      });

      const ruleVersion = await tx.eligibilityRuleVersion.create({
        data: {
          eligibilityRuleId: rule.id,
          versionNumber: 1,
          ruleDefinition: input.ruleDefinition as Prisma.InputJsonValue,
          createdBy: userId,
        },
      });

      const updatedRule = await tx.eligibilityRule.update({
        where: { id: rule.id },
        data: { latestVersionId: ruleVersion.id },
        include: { versions: true },
      });

      await AuditLogService.recordChanges(tx, [
        {
          entityType: 'ELIGIBILITY_RULE',
          entityId: rule.id,
          fieldName: 'ruleDefinition',
          oldValue: null,
          newValue: input.ruleDefinition,
          changedBy: userId,
        },
      ]);

      return updatedRule;
    });
  }

  static async listRules() {
    return prisma.eligibilityRule.findMany({
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async getRuleById(id: string) {
    const rule = await prisma.eligibilityRule.findUnique({
      where: { id },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          include: {
            creator: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    if (!rule) {
      throw AppError.notFound('Eligibility rule not found');
    }

    return rule;
  }

  static async updateRule(id: string, input: UpdateEligibilityRuleInput, userId: string) {
    const rule = await prisma.eligibilityRule.findUnique({
      where: { id },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
        },
      },
    });

    if (!rule) {
      throw AppError.notFound('Eligibility rule not found');
    }

    const latestVersion = rule.versions[0];
    const nextVersionNumber = (latestVersion?.versionNumber || 0) + 1;

    return prisma.$transaction(async (tx) => {
      const newVersion = await tx.eligibilityRuleVersion.create({
        data: {
          eligibilityRuleId: rule.id,
          versionNumber: nextVersionNumber,
          ruleDefinition: (input.ruleDefinition ||
            latestVersion?.ruleDefinition ||
            {}) as Prisma.InputJsonValue,
          createdBy: userId,
        },
      });

      const updatedRule = await tx.eligibilityRule.update({
        where: { id: rule.id },
        data: {
          name: input.name ?? rule.name,
          description: input.description ?? rule.description,
          latestVersionId: newVersion.id,
        },
        include: {
          versions: {
            orderBy: { versionNumber: 'desc' },
          },
        },
      });

      // Audit the rule update
      await AuditLogService.recordChanges(tx, [
        {
          entityType: 'ELIGIBILITY_RULE',
          entityId: rule.id,
          fieldName: 'ruleVersion',
          oldValue: latestVersion?.versionNumber ?? null,
          newValue: nextVersionNumber,
          changedBy: userId,
        },
        {
          entityType: 'ELIGIBILITY_RULE',
          entityId: rule.id,
          fieldName: 'ruleDefinition',
          oldValue: latestVersion?.ruleDefinition ?? null,
          newValue: newVersion.ruleDefinition,
          changedBy: userId,
        },
      ]);

      // Phase 8 Requirement:
      // Find every scheme that references this logical rule.
      // Create a pending review flag for every affected scheme.
      // Prevent duplicate unresolved flags for the same scheme and rule.
      const referencingSchemes = await tx.schemeVersionEligibilityRule.findMany({
        where: { eligibilityRuleId: rule.id },
        select: {
          schemeVersion: {
            select: { schemeId: true },
          },
        },
        distinct: ['schemeVersionId'],
      });

      const uniqueSchemeIds = Array.from(
        new Set(referencingSchemes.map((r) => r.schemeVersion.schemeId)),
      );

      for (const schemeId of uniqueSchemeIds) {
        const existingPendingFlag = await tx.schemeReviewFlag.findFirst({
          where: {
            schemeId,
            eligibilityRuleId: rule.id,
            status: ReviewFlagStatus.PENDING,
          },
        });

        if (!existingPendingFlag) {
          await tx.schemeReviewFlag.create({
            data: {
              schemeId,
              eligibilityRuleId: rule.id,
              reason: `Eligibility rule '${rule.name}' updated to version ${nextVersionNumber}. Reason: ${input.reason}`,
              status: ReviewFlagStatus.PENDING,
            },
          });
        }
      }

      return updatedRule;
    });
  }

  static async getDependentSchemes(ruleId: string) {
    const rule = await prisma.eligibilityRule.findUnique({
      where: { id: ruleId },
    });

    if (!rule) {
      throw AppError.notFound('Eligibility rule not found');
    }

    const schemeLinks = await prisma.schemeVersionEligibilityRule.findMany({
      where: { eligibilityRuleId: ruleId },
      include: {
        schemeVersion: {
          include: {
            scheme: true,
          },
        },
        eligibilityRuleVersion: true,
      },
    });

    const uniqueSchemesMap = new Map<string, unknown>();

    schemeLinks.forEach((link) => {
      const scheme = link.schemeVersion.scheme;
      if (!uniqueSchemesMap.has(scheme.id)) {
        uniqueSchemesMap.set(scheme.id, {
          schemeId: scheme.id,
          schemeCode: scheme.schemeCode,
          currentPublishedVersionId: scheme.currentPublishedVersionId,
          versionUsingRule: {
            versionId: link.schemeVersion.id,
            versionNumber: link.schemeVersion.versionNumber,
            status: link.schemeVersion.status,
            usedRuleVersion: link.eligibilityRuleVersion.versionNumber,
          },
        });
      }
    });

    return Array.from(uniqueSchemesMap.values());
  }
}
