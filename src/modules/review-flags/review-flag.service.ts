import { prisma } from '../../config/database';
import { AppError } from '../../common/utils/app-error';
import { ReviewFlagStatus } from '../../common/enums';

export class ReviewFlagService {
  static async listFlags(schemeId?: string, status?: ReviewFlagStatus) {
    const where: { schemeId?: string; status?: ReviewFlagStatus } = {};
    if (schemeId) where.schemeId = schemeId;
    if (status) where.status = status;

    return prisma.schemeReviewFlag.findMany({
      where,
      include: {
        scheme: {
          select: { id: true, schemeCode: true },
        },
        eligibilityRule: {
          select: { id: true, ruleCode: true, name: true, latestVersionId: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async resolveFlag(flagId: string) {
    const flag = await prisma.schemeReviewFlag.findUnique({
      where: { id: flagId },
    });

    if (!flag) {
      throw AppError.notFound('Review flag not found');
    }

    if (flag.status === ReviewFlagStatus.RESOLVED) {
      return flag;
    }

    return prisma.schemeReviewFlag.update({
      where: { id: flagId },
      data: {
        status: ReviewFlagStatus.RESOLVED,
        resolvedAt: new Date(),
      },
    });
  }
}
