import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../common/utils/app-error';
import { AuditLogService, AuditEntry } from '../audit-logs/audit-log.service';
import {
  CreateSchemeInput,
  UpdateSchemeVersionInput,
  SendBackInput,
  ApproveInput,
} from './scheme.validation';
import { SchemeStatus, ReviewAction, ReviewFlagStatus, Role } from '../../common/enums';
import { AuthenticatedUser } from '../../common/types';

export class SchemeService {
  /**
   * Phase 4: Create a new Scheme and initial DRAFT version 1.
   * Only STATE_REVIEWER can create.
   */
  static async createScheme(input: CreateSchemeInput, user: AuthenticatedUser) {
    const existing = await prisma.scheme.findUnique({
      where: { schemeCode: input.schemeCode.trim().toUpperCase() },
    });

    if (existing) {
      throw AppError.conflict(`Scheme with code '${input.schemeCode}' already exists`);
    }

    return prisma.$transaction(async (tx) => {
      const scheme = await tx.scheme.create({
        data: {
          schemeCode: input.schemeCode.trim().toUpperCase(),
          createdBy: user.id,
        },
      });

      const version = await tx.schemeVersion.create({
        data: {
          schemeId: scheme.id,
          versionNumber: 1,
          schemeName: input.schemeName,
          description: input.description,
          amount: new Prisma.Decimal(input.amount),
          applicationDeadline: input.applicationDeadline,
          status: SchemeStatus.DRAFT,
          createdBy: user.id,
        },
      });

      // Link eligibility rules if provided
      if (input.eligibilityRuleIds && input.eligibilityRuleIds.length > 0) {
        for (const ruleId of input.eligibilityRuleIds) {
          const rule = await tx.eligibilityRule.findUnique({
            where: { id: ruleId },
          });

          if (!rule || !rule.latestVersionId) {
            throw AppError.badRequest(`Eligibility rule ${ruleId} not found or has no version`);
          }

          await tx.schemeVersionEligibilityRule.create({
            data: {
              schemeVersionId: version.id,
              eligibilityRuleId: rule.id,
              eligibilityRuleVersionId: rule.latestVersionId,
            },
          });
        }
      }

      // Record initial audit logs
      const auditEntries: AuditEntry[] = [
        {
          entityType: 'SCHEME',
          entityId: scheme.id,
          fieldName: 'schemeCode',
          oldValue: null,
          newValue: scheme.schemeCode,
          changedBy: user.id,
        },
        {
          entityType: 'SCHEME_VERSION',
          entityId: scheme.id,
          schemeVersionId: version.id,
          fieldName: 'schemeName',
          oldValue: null,
          newValue: version.schemeName,
          changedBy: user.id,
        },
        {
          entityType: 'SCHEME_VERSION',
          entityId: scheme.id,
          schemeVersionId: version.id,
          fieldName: 'amount',
          oldValue: null,
          newValue: Number(version.amount),
          changedBy: user.id,
        },
        {
          entityType: 'SCHEME_VERSION',
          entityId: scheme.id,
          schemeVersionId: version.id,
          fieldName: 'status',
          oldValue: null,
          newValue: version.status,
          changedBy: user.id,
        },
      ];

      await AuditLogService.recordChanges(tx, auditEntries);

      return this.fetchVersionWithDetails(tx, version.id);
    });
  }

  /**
   * Phase 4 & 6: Public and Reviewer listing.
   * If user is authenticated reviewer, they can see drafts/all versions.
   * For public / unauthenticated or standard public calls, only PUBLISHED current versions are returned!
   */
  static async listSchemes(user?: AuthenticatedUser, page = 1, limit = 10, search?: string) {
    const skip = (page - 1) * limit;

    // Public / default view: Only schemes with a currentPublishedVersionId
    if (!user) {
      const where: Prisma.SchemeWhereInput = {
        currentPublishedVersionId: { not: null },
      };

      if (search) {
        where.currentPublishedVersion = {
          schemeName: { contains: search, mode: 'insensitive' },
        };
      }

      const [items, total] = await Promise.all([
        prisma.scheme.findMany({
          where,
          include: {
            currentPublishedVersion: {
              include: {
                eligibilityRules: {
                  include: {
                    eligibilityRule: true,
                    eligibilityRuleVersion: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.scheme.count({ where }),
      ]);

      return {
        items: items.map((s) => ({
          schemeId: s.id,
          schemeCode: s.schemeCode,
          currentPublishedVersion: s.currentPublishedVersion,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
        })),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }

    // Reviewer view (all schemes)
    const where: Prisma.SchemeWhereInput = {};
    if (search) {
      where.OR = [
        { schemeCode: { contains: search, mode: 'insensitive' } },
        {
          versions: {
            some: { schemeName: { contains: search, mode: 'insensitive' } },
          },
        },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.scheme.findMany({
        where,
        include: {
          currentPublishedVersion: true,
          versions: {
            orderBy: { versionNumber: 'desc' },
            take: 1, // latest version
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.scheme.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Phase 6: Public Read Scheme by ID.
   * MUST use currentPublishedVersionId.
   * Draft, In-Review, or Sent-back versions must never appear in public read API!
   */
  static async getPublicSchemeById(schemeId: string) {
    const scheme = await prisma.scheme.findUnique({
      where: { id: schemeId },
      include: {
        currentPublishedVersion: {
          include: {
            eligibilityRules: {
              include: {
                eligibilityRule: true,
                eligibilityRuleVersion: true,
              },
            },
          },
        },
      },
    });

    if (!scheme || !scheme.currentPublishedVersionId || !scheme.currentPublishedVersion) {
      throw AppError.notFound('Published scheme not found');
    }

    // Safety check: Ensure the status is PUBLISHED
    if (scheme.currentPublishedVersion.status !== SchemeStatus.PUBLISHED) {
      throw AppError.notFound('No published version available for this scheme');
    }

    return {
      schemeId: scheme.id,
      schemeCode: scheme.schemeCode,
      publishedVersion: scheme.currentPublishedVersion,
      createdAt: scheme.createdAt,
      updatedAt: scheme.updatedAt,
    };
  }

  /**
   * Phase 4 & 6: Authorized Reviewer Scheme Details.
   * Returns scheme with its active draft/in-review version and current published version.
   */
  static async getSchemeDetailsForReviewer(schemeId: string) {
    const scheme = await prisma.scheme.findUnique({
      where: { id: schemeId },
      include: {
        currentPublishedVersion: {
          include: {
            eligibilityRules: {
              include: {
                eligibilityRule: true,
                eligibilityRuleVersion: true,
              },
            },
          },
        },
        versions: {
          orderBy: { versionNumber: 'desc' },
          include: {
            creator: {
              select: { id: true, name: true, email: true, role: true },
            },
            eligibilityRules: {
              include: {
                eligibilityRule: true,
                eligibilityRuleVersion: true,
              },
            },
            reviewComments: {
              orderBy: { createdAt: 'desc' },
            },
          },
        },
        reviewFlags: {
          orderBy: { createdAt: 'desc' },
          include: {
            eligibilityRule: true,
          },
        },
      },
    });

    if (!scheme) {
      throw AppError.notFound('Scheme not found');
    }

    return scheme;
  }

  /**
   * Phase 4 & 6: Scheme Version History.
   */
  static async getSchemeHistory(schemeId: string) {
    const scheme = await prisma.scheme.findUnique({
      where: { id: schemeId },
    });

    if (!scheme) {
      throw AppError.notFound('Scheme not found');
    }

    return prisma.schemeVersion.findMany({
      where: { schemeId },
      include: {
        creator: {
          select: { id: true, name: true, email: true, role: true },
        },
        reviewComments: {
          include: {
            reviewer: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        eligibilityRules: {
          include: {
            eligibilityRule: true,
            eligibilityRuleVersion: true,
          },
        },
      },
      orderBy: { versionNumber: 'desc' },
    });
  }

  /**
   * Phase 4: Create a new version for an existing scheme.
   * Requirement 4: Editing a published scheme must create a new version.
   * Requirement 6: Copy the existing published version's data into the new draft.
   * Requirement 7: Assign the next sequential version number.
   * Requirement 8: Keep existing eligibility rule version references unless explicitly changed.
   * Requirement 10: Prevent duplicate active drafts for the same scheme.
   */
  static async createNewVersion(
    schemeId: string,
    user: AuthenticatedUser,
    customData?: UpdateSchemeVersionInput,
  ) {
    if (user.role !== Role.STATE_REVIEWER) {
      throw AppError.forbidden('Only STATE_REVIEWER can create scheme versions');
    }

    const scheme = await prisma.scheme.findUnique({
      where: { id: schemeId },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
        },
        currentPublishedVersion: {
          include: {
            eligibilityRules: true,
          },
        },
      },
    });

    if (!scheme) {
      throw AppError.notFound('Scheme not found');
    }

    // Check for existing active draft or in-review version
    const activeVersion = await prisma.schemeVersion.findFirst({
      where: {
        schemeId,
        status: { in: [SchemeStatus.DRAFT, SchemeStatus.IN_REVIEW] },
      },
    });

    if (activeVersion) {
      throw AppError.conflict(
        `Scheme already has an active version (${activeVersion.versionNumber}) in ${activeVersion.status} status. Complete or delete it before creating a new draft.`,
      );
    }

    const latestVersion = scheme.versions[0];
    const baseVersion = scheme.currentPublishedVersion || latestVersion;

    if (!baseVersion) {
      throw AppError.badRequest('No base version available to branch from');
    }

    const nextVersionNumber = (latestVersion?.versionNumber || 0) + 1;

    return prisma.$transaction(async (tx) => {
      const newVersion = await tx.schemeVersion.create({
        data: {
          schemeId,
          versionNumber: nextVersionNumber,
          schemeName: customData?.schemeName ?? baseVersion.schemeName,
          description: customData?.description ?? baseVersion.description,
          amount: customData?.amount ? new Prisma.Decimal(customData.amount) : baseVersion.amount,
          applicationDeadline: customData?.applicationDeadline ?? baseVersion.applicationDeadline,
          status: SchemeStatus.DRAFT,
          createdBy: user.id,
        },
      });

      // Requirement 8: Keep existing eligibility rule version references unless explicitly changed
      if (customData?.eligibilityRuleIds) {
        for (const ruleId of customData.eligibilityRuleIds) {
          const rule = await tx.eligibilityRule.findUnique({
            where: { id: ruleId },
          });
          if (!rule || !rule.latestVersionId) {
            throw AppError.badRequest(`Eligibility rule ${ruleId} not found`);
          }
          await tx.schemeVersionEligibilityRule.create({
            data: {
              schemeVersionId: newVersion.id,
              eligibilityRuleId: rule.id,
              eligibilityRuleVersionId: rule.latestVersionId,
            },
          });
        }
      } else if (scheme.currentPublishedVersion?.eligibilityRules) {
        for (const ruleLink of scheme.currentPublishedVersion.eligibilityRules) {
          await tx.schemeVersionEligibilityRule.create({
            data: {
              schemeVersionId: newVersion.id,
              eligibilityRuleId: ruleLink.eligibilityRuleId,
              eligibilityRuleVersionId: ruleLink.eligibilityRuleVersionId,
            },
          });
        }
      }

      await AuditLogService.recordChanges(tx, [
        {
          entityType: 'SCHEME_VERSION',
          entityId: schemeId,
          schemeVersionId: newVersion.id,
          fieldName: 'versionNumber',
          oldValue: baseVersion.versionNumber,
          newValue: nextVersionNumber,
          changedBy: user.id,
        },
        {
          entityType: 'SCHEME_VERSION',
          entityId: schemeId,
          schemeVersionId: newVersion.id,
          fieldName: 'status',
          oldValue: null,
          newValue: SchemeStatus.DRAFT,
          changedBy: user.id,
        },
      ]);

      return this.fetchVersionWithDetails(tx, newVersion.id);
    });
  }

  /**
   * Phase 4: Patch/Update an existing Scheme Draft or Sent-back version.
   * Requirement 5: Never update the published version directly.
   * Requirement 3: State Reviewers can edit drafts they are authorized to manage (createdBy).
   */
  static async updateVersion(
    schemeId: string,
    versionId: string,
    input: UpdateSchemeVersionInput,
    user: AuthenticatedUser,
  ) {
    const version = await prisma.schemeVersion.findUnique({
      where: { id: versionId },
      include: {
        eligibilityRules: true,
      },
    });

    if (!version || version.schemeId !== schemeId) {
      throw AppError.notFound('Scheme version not found');
    }

    // Published versions are immutable
    if (version.status === SchemeStatus.PUBLISHED) {
      throw AppError.badRequest(
        'Published versions cannot be modified. Create a new version instead.',
      );
    }

    if (version.status === SchemeStatus.IN_REVIEW) {
      throw AppError.badRequest('Versions currently in review cannot be modified.');
    }

    // Only creator / authorized STATE_REVIEWER can modify
    if (user.role !== Role.STATE_REVIEWER) {
      throw AppError.forbidden('Only State Reviewers can edit scheme drafts');
    }

    if (version.createdBy !== user.id) {
      throw AppError.forbidden(
        'You are not authorized to edit this draft version created by another reviewer',
      );
    }

    return prisma.$transaction(async (tx) => {
      const auditEntries: AuditEntry[] = [];

      // Check field level changes
      if (input.schemeName !== undefined && input.schemeName !== version.schemeName) {
        auditEntries.push({
          entityType: 'SCHEME_VERSION',
          entityId: schemeId,
          schemeVersionId: version.id,
          fieldName: 'schemeName',
          oldValue: version.schemeName,
          newValue: input.schemeName,
          changedBy: user.id,
        });
      }

      if (input.description !== undefined && input.description !== version.description) {
        auditEntries.push({
          entityType: 'SCHEME_VERSION',
          entityId: schemeId,
          schemeVersionId: version.id,
          fieldName: 'description',
          oldValue: version.description,
          newValue: input.description,
          changedBy: user.id,
        });
      }

      if (input.amount !== undefined && Number(version.amount) !== input.amount) {
        auditEntries.push({
          entityType: 'SCHEME_VERSION',
          entityId: schemeId,
          schemeVersionId: version.id,
          fieldName: 'amount',
          oldValue: Number(version.amount),
          newValue: input.amount,
          changedBy: user.id,
        });
      }

      if (
        input.applicationDeadline !== undefined &&
        version.applicationDeadline.getTime() !== input.applicationDeadline.getTime()
      ) {
        auditEntries.push({
          entityType: 'SCHEME_VERSION',
          entityId: schemeId,
          schemeVersionId: version.id,
          fieldName: 'applicationDeadline',
          oldValue: version.applicationDeadline.toISOString(),
          newValue: input.applicationDeadline.toISOString(),
          changedBy: user.id,
        });
      }

      // Update eligibility rules if supplied
      if (input.eligibilityRuleIds !== undefined) {
        const oldRuleIds = version.eligibilityRules.map((r) => r.eligibilityRuleId).sort();
        const newRuleIds = [...input.eligibilityRuleIds].sort();

        const isRulesChanged =
          oldRuleIds.length !== newRuleIds.length ||
          oldRuleIds.some((val, idx) => val !== newRuleIds[idx]);

        if (isRulesChanged) {
          auditEntries.push({
            entityType: 'SCHEME_VERSION',
            entityId: schemeId,
            schemeVersionId: version.id,
            fieldName: 'eligibilityRules',
            oldValue: oldRuleIds,
            newValue: newRuleIds,
            changedBy: user.id,
          });

          await tx.schemeVersionEligibilityRule.deleteMany({
            where: { schemeVersionId: version.id },
          });

          for (const ruleId of input.eligibilityRuleIds) {
            const rule = await tx.eligibilityRule.findUnique({
              where: { id: ruleId },
            });
            if (!rule || !rule.latestVersionId) {
              throw AppError.badRequest(`Eligibility rule ${ruleId} not found`);
            }
            await tx.schemeVersionEligibilityRule.create({
              data: {
                schemeVersionId: version.id,
                eligibilityRuleId: rule.id,
                eligibilityRuleVersionId: rule.latestVersionId,
              },
            });
          }
        }
      }

      // If version was SENT_BACK, editing it keeps or transitions back to editable status
      const updatedVersion = await tx.schemeVersion.update({
        where: { id: versionId },
        data: {
          schemeName: input.schemeName,
          description: input.description,
          amount: input.amount ? new Prisma.Decimal(input.amount) : undefined,
          applicationDeadline: input.applicationDeadline,
        },
      });

      await AuditLogService.recordChanges(tx, auditEntries);

      return this.fetchVersionWithDetails(tx, updatedVersion.id);
    });
  }

  /**
   * Phase 5: Submit for review.
   * Only STATE_REVIEWER can submit.
   * Can submit from DRAFT or SENT_BACK.
   * Changes status to IN_REVIEW, records submittedAt.
   */
  static async submitForReview(schemeId: string, versionId: string, user: AuthenticatedUser) {
    if (user.role !== Role.STATE_REVIEWER) {
      throw AppError.forbidden('Only STATE_REVIEWER can submit a draft for review');
    }

    const version = await prisma.schemeVersion.findUnique({
      where: { id: versionId },
    });

    if (!version || version.schemeId !== schemeId) {
      throw AppError.notFound('Scheme version not found');
    }

    if (version.status !== SchemeStatus.DRAFT && version.status !== SchemeStatus.SENT_BACK) {
      throw AppError.badRequest(
        `Cannot submit version with status '${version.status}'. Must be DRAFT or SENT_BACK.`,
      );
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.schemeVersion.update({
        where: { id: versionId },
        data: {
          status: SchemeStatus.IN_REVIEW,
          submittedAt: new Date(),
        },
      });

      await AuditLogService.recordChanges(tx, [
        {
          entityType: 'SCHEME_VERSION',
          entityId: schemeId,
          schemeVersionId: version.id,
          fieldName: 'status',
          oldValue: version.status,
          newValue: SchemeStatus.IN_REVIEW,
          changedBy: user.id,
        },
      ]);

      return this.fetchVersionWithDetails(tx, updated.id);
    });
  }

  /**
   * Phase 5: Approve and Publish.
   * Only CENTRAL_REVIEWER can approve.
   * CRITICAL RULE: Creator cannot approve their own version!
   * Version must be IN_REVIEW.
   * Atomic transaction:
   * - Update status to PUBLISHED, set publishedAt.
   * - Add ReviewComment with action APPROVED.
   * - Update Scheme.currentPublishedVersionId.
   * - Resolve any pending review flags for this scheme for rules used in this version.
   */
  static async approveAndPublish(
    schemeId: string,
    versionId: string,
    input: ApproveInput,
    user: AuthenticatedUser,
  ) {
    if (user.role !== Role.CENTRAL_REVIEWER) {
      throw AppError.forbidden('Only CENTRAL_REVIEWER can approve and publish a scheme');
    }

    const version = await prisma.schemeVersion.findUnique({
      where: { id: versionId },
      include: {
        eligibilityRules: true,
      },
    });

    if (!version || version.schemeId !== schemeId) {
      throw AppError.notFound('Scheme version not found');
    }

    // Critical Rule: Compare authenticated reviewer's ID with createdBy ID
    if (version.createdBy === user.id) {
      throw AppError.forbidden('You cannot approve your own scheme version');
    }

    if (version.status !== SchemeStatus.IN_REVIEW) {
      throw AppError.badRequest(
        `Cannot approve version with status '${version.status}'. Must be IN_REVIEW.`,
      );
    }

    return prisma.$transaction(async (tx) => {
      const scheme = await tx.scheme.findUnique({
        where: { id: schemeId },
      });

      if (!scheme) {
        throw AppError.notFound('Scheme not found');
      }

      const publishedAt = new Date();

      // 1. Update version to PUBLISHED
      const updatedVersion = await tx.schemeVersion.update({
        where: { id: versionId },
        data: {
          status: SchemeStatus.PUBLISHED,
          publishedAt,
        },
      });

      // 2. Update Scheme pointer
      const oldPublishedId = scheme.currentPublishedVersionId;
      await tx.scheme.update({
        where: { id: schemeId },
        data: {
          currentPublishedVersionId: version.id,
        },
      });

      // 3. Create Review Comment
      await tx.reviewComment.create({
        data: {
          schemeVersionId: version.id,
          reviewerId: user.id,
          comment: input.comment || 'Approved and published.',
          action: ReviewAction.APPROVED,
        },
      });

      // 4. Resolve relevant review flags for this scheme (Phase 8 requirement)
      // When that scheme version is published, resolve its corresponding review flag.
      for (const ruleLink of version.eligibilityRules) {
        const matchingRule = await tx.eligibilityRule.findUnique({
          where: { id: ruleLink.eligibilityRuleId },
        });

        // If the version adopts the latest rule version, resolve the pending flag
        if (matchingRule && matchingRule.latestVersionId === ruleLink.eligibilityRuleVersionId) {
          await tx.schemeReviewFlag.updateMany({
            where: {
              schemeId,
              eligibilityRuleId: ruleLink.eligibilityRuleId,
              status: ReviewFlagStatus.PENDING,
            },
            data: {
              status: ReviewFlagStatus.RESOLVED,
              resolvedAt: new Date(),
            },
          });
        }
      }

      // 5. Audit logs
      await AuditLogService.recordChanges(tx, [
        {
          entityType: 'SCHEME_VERSION',
          entityId: schemeId,
          schemeVersionId: version.id,
          fieldName: 'status',
          oldValue: SchemeStatus.IN_REVIEW,
          newValue: SchemeStatus.PUBLISHED,
          changedBy: user.id,
        },
        {
          entityType: 'SCHEME',
          entityId: schemeId,
          fieldName: 'currentPublishedVersionId',
          oldValue: oldPublishedId,
          newValue: version.id,
          changedBy: user.id,
        },
      ]);

      return this.fetchVersionWithDetails(tx, updatedVersion.id);
    });
  }

  /**
   * Phase 5: Send back.
   * Only CENTRAL_REVIEWER can send back.
   * Comment is mandatory.
   * Transitions to SENT_BACK.
   */
  static async sendBack(
    schemeId: string,
    versionId: string,
    input: SendBackInput,
    user: AuthenticatedUser,
  ) {
    if (user.role !== Role.CENTRAL_REVIEWER) {
      throw AppError.forbidden('Only CENTRAL_REVIEWER can send back a scheme');
    }

    if (!input.comment || input.comment.trim().length === 0) {
      throw AppError.badRequest('A non-empty comment is mandatory when sending back a version');
    }

    const version = await prisma.schemeVersion.findUnique({
      where: { id: versionId },
    });

    if (!version || version.schemeId !== schemeId) {
      throw AppError.notFound('Scheme version not found');
    }

    if (version.status !== SchemeStatus.IN_REVIEW) {
      throw AppError.badRequest(
        `Cannot send back version with status '${version.status}'. Must be IN_REVIEW.`,
      );
    }

    return prisma.$transaction(async (tx) => {
      const updatedVersion = await tx.schemeVersion.update({
        where: { id: versionId },
        data: {
          status: SchemeStatus.SENT_BACK,
        },
      });

      await tx.reviewComment.create({
        data: {
          schemeVersionId: version.id,
          reviewerId: user.id,
          comment: input.comment,
          action: ReviewAction.SENT_BACK,
        },
      });

      await AuditLogService.recordChanges(tx, [
        {
          entityType: 'SCHEME_VERSION',
          entityId: schemeId,
          schemeVersionId: version.id,
          fieldName: 'status',
          oldValue: SchemeStatus.IN_REVIEW,
          newValue: SchemeStatus.SENT_BACK,
          changedBy: user.id,
        },
      ]);

      return this.fetchVersionWithDetails(tx, updatedVersion.id);
    });
  }

  private static async fetchVersionWithDetails(tx: Prisma.TransactionClient, versionId: string) {
    return tx.schemeVersion.findUnique({
      where: { id: versionId },
      include: {
        scheme: true,
        creator: {
          select: { id: true, name: true, email: true, role: true },
        },
        eligibilityRules: {
          include: {
            eligibilityRule: true,
            eligibilityRuleVersion: true,
          },
        },
        reviewComments: {
          orderBy: { createdAt: 'desc' },
          include: {
            reviewer: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
        },
      },
    });
  }
}
