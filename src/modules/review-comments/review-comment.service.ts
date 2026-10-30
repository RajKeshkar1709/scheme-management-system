import { prisma } from '../../config/database';
import { AppError } from '../../common/utils/app-error';
import { ReviewAction } from '../../common/enums';

export class ReviewCommentService {
  static async getCommentsByVersion(schemeVersionId: string) {
    const version = await prisma.schemeVersion.findUnique({
      where: { id: schemeVersionId },
    });

    if (!version) {
      throw AppError.notFound('Scheme version not found');
    }

    return prisma.reviewComment.findMany({
      where: { schemeVersionId },
      include: {
        reviewer: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async addComment(
    schemeVersionId: string,
    reviewerId: string,
    comment: string,
    action: ReviewAction,
  ) {
    const version = await prisma.schemeVersion.findUnique({
      where: { id: schemeVersionId },
    });

    if (!version) {
      throw AppError.notFound('Scheme version not found');
    }

    return prisma.reviewComment.create({
      data: {
        schemeVersionId,
        reviewerId,
        comment,
        action,
      },
      include: {
        reviewer: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });
  }
}
