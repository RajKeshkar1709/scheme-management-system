import { PrismaClient, Role, SchemeStatus, ReviewAction, ReviewFlagStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting idempotent database seed...');

  const passwordHash = await bcrypt.hash('Password@123', 10);

  // 1. Seed Users (2 State Reviewers, 2 Central Reviewers)
  const stateReviewer1 = await prisma.user.upsert({
    where: { email: 'state.reviewer1@example.gov' },
    update: {},
    create: {
      name: 'Priya Sharma (State Reviewer 1)',
      email: 'state.reviewer1@example.gov',
      password: passwordHash,
      role: Role.STATE_REVIEWER,
    },
  });

  const stateReviewer2 = await prisma.user.upsert({
    where: { email: 'state.reviewer2@example.gov' },
    update: {},
    create: {
      name: 'Amit Patel (State Reviewer 2)',
      email: 'state.reviewer2@example.gov',
      password: passwordHash,
      role: Role.STATE_REVIEWER,
    },
  });

  const centralReviewer1 = await prisma.user.upsert({
    where: { email: 'central.reviewer1@example.gov' },
    update: {},
    create: {
      name: 'Dr. Rajesh Verma (Central Reviewer 1)',
      email: 'central.reviewer1@example.gov',
      password: passwordHash,
      role: Role.CENTRAL_REVIEWER,
    },
  });

  const centralReviewer2 = await prisma.user.upsert({
    where: { email: 'central.reviewer2@example.gov' },
    update: {},
    create: {
      name: 'Sunita Rao (Central Reviewer 2)',
      email: 'central.reviewer2@example.gov',
      password: passwordHash,
      role: Role.CENTRAL_REVIEWER,
    },
  });

  console.log('✅ Seeded Users: 2 STATE_REVIEWER, 2 CENTRAL_REVIEWER');

  // 2. Seed Eligibility Rules
  // Rule 1: Annual Family Income
  const incomeRule = await prisma.eligibilityRule.upsert({
    where: { ruleCode: 'RULE_INCOME_250K' },
    update: {},
    create: {
      ruleCode: 'RULE_INCOME_250K',
      name: 'Annual Family Income Limit',
      description: 'Annual family income must be below 2.5 lakh rupees',
    },
  });

  const incomeRuleV1 = await prisma.eligibilityRuleVersion.upsert({
    where: {
      eligibilityRuleId_versionNumber: {
        eligibilityRuleId: incomeRule.id,
        versionNumber: 1,
      },
    },
    update: {},
    create: {
      eligibilityRuleId: incomeRule.id,
      versionNumber: 1,
      ruleDefinition: {
        field: 'annualFamilyIncome',
        operator: 'LESS_THAN',
        value: 250000,
        unit: 'INR',
      },
      createdBy: centralReviewer1.id,
    },
  });

  await prisma.eligibilityRule.update({
    where: { id: incomeRule.id },
    data: { latestVersionId: incomeRuleV1.id },
  });

  // Rule 2: Age above 18
  const ageRule = await prisma.eligibilityRule.upsert({
    where: { ruleCode: 'RULE_AGE_18' },
    update: {},
    create: {
      ruleCode: 'RULE_AGE_18',
      name: 'Adult Age Limit',
      description: 'Applicant age must be 18 years or above',
    },
  });

  const ageRuleV1 = await prisma.eligibilityRuleVersion.upsert({
    where: {
      eligibilityRuleId_versionNumber: {
        eligibilityRuleId: ageRule.id,
        versionNumber: 1,
      },
    },
    update: {},
    create: {
      eligibilityRuleId: ageRule.id,
      versionNumber: 1,
      ruleDefinition: {
        field: 'applicantAge',
        operator: 'GREATER_THAN_EQUAL',
        value: 18,
        unit: 'YEARS',
      },
      createdBy: centralReviewer1.id,
    },
  });

  await prisma.eligibilityRule.update({
    where: { id: ageRule.id },
    data: { latestVersionId: ageRuleV1.id },
  });

  // Rule 3: State Residency
  const residencyRule = await prisma.eligibilityRule.upsert({
    where: { ruleCode: 'RULE_STATE_RESIDENT' },
    update: {},
    create: {
      ruleCode: 'RULE_STATE_RESIDENT',
      name: 'State Domicile Requirement',
      description: 'Applicant must be a permanent resident of the state',
    },
  });

  const residencyRuleV1 = await prisma.eligibilityRuleVersion.upsert({
    where: {
      eligibilityRuleId_versionNumber: {
        eligibilityRuleId: residencyRule.id,
        versionNumber: 1,
      },
    },
    update: {},
    create: {
      eligibilityRuleId: residencyRule.id,
      versionNumber: 1,
      ruleDefinition: {
        field: 'isStateResident',
        operator: 'EQUALS',
        value: true,
      },
      createdBy: centralReviewer1.id,
    },
  });

  await prisma.eligibilityRule.update({
    where: { id: residencyRule.id },
    data: { latestVersionId: residencyRuleV1.id },
  });

  console.log('✅ Seeded 3 Shared Eligibility Rules with Version 1');

  // 3. Seed Schemes (5 Schemes with different realistic statuses and versions)
  // Scheme 1: Education Support Scheme (V1 Published, V2 in review)
  const eduScheme = await prisma.scheme.upsert({
    where: { schemeCode: 'SCHEME_EDU_01' },
    update: {},
    create: {
      schemeCode: 'SCHEME_EDU_01',
      createdBy: stateReviewer1.id,
    },
  });

  const eduV1 = await prisma.schemeVersion.upsert({
    where: {
      schemeId_versionNumber: {
        schemeId: eduScheme.id,
        versionNumber: 1,
      },
    },
    update: {},
    create: {
      schemeId: eduScheme.id,
      versionNumber: 1,
      schemeName: 'Education Support Scheme',
      description: 'Financial assistance for higher secondary students from low-income families.',
      amount: 50000,
      applicationDeadline: new Date('2027-12-31'),
      status: SchemeStatus.PUBLISHED,
      createdBy: stateReviewer1.id,
      submittedAt: new Date('2026-01-10'),
      publishedAt: new Date('2026-01-15'),
    },
  });

  // Link rules to edu V1
  await prisma.schemeVersionEligibilityRule.upsert({
    where: {
      schemeVersionId_eligibilityRuleId: {
        schemeVersionId: eduV1.id,
        eligibilityRuleId: incomeRule.id,
      },
    },
    update: {},
    create: {
      schemeVersionId: eduV1.id,
      eligibilityRuleId: incomeRule.id,
      eligibilityRuleVersionId: incomeRuleV1.id,
    },
  });

  await prisma.schemeVersionEligibilityRule.upsert({
    where: {
      schemeVersionId_eligibilityRuleId: {
        schemeVersionId: eduV1.id,
        eligibilityRuleId: residencyRule.id,
      },
    },
    update: {},
    create: {
      schemeVersionId: eduV1.id,
      eligibilityRuleId: residencyRule.id,
      eligibilityRuleVersionId: residencyRuleV1.id,
    },
  });

  // Set as current published version
  await prisma.scheme.update({
    where: { id: eduScheme.id },
    data: { currentPublishedVersionId: eduV1.id },
  });

  // Edu V2 in IN_REVIEW
  const eduV2 = await prisma.schemeVersion.upsert({
    where: {
      schemeId_versionNumber: {
        schemeId: eduScheme.id,
        versionNumber: 2,
      },
    },
    update: {},
    create: {
      schemeId: eduScheme.id,
      versionNumber: 2,
      schemeName: 'Education Support Scheme - Enhanced',
      description: 'Expanded financial assistance for STEM courses with revised grant.',
      amount: 75000,
      applicationDeadline: new Date('2028-06-30'),
      status: SchemeStatus.IN_REVIEW,
      createdBy: stateReviewer1.id,
      submittedAt: new Date('2026-02-01'),
    },
  });

  // Link rules to edu V2
  await prisma.schemeVersionEligibilityRule.upsert({
    where: {
      schemeVersionId_eligibilityRuleId: {
        schemeVersionId: eduV2.id,
        eligibilityRuleId: incomeRule.id,
      },
    },
    update: {},
    create: {
      schemeVersionId: eduV2.id,
      eligibilityRuleId: incomeRule.id,
      eligibilityRuleVersionId: incomeRuleV1.id,
    },
  });

  // Scheme 2: Health Assistance Scheme (PUBLISHED V1)
  const healthScheme = await prisma.scheme.upsert({
    where: { schemeCode: 'SCHEME_HLT_01' },
    update: {},
    create: {
      schemeCode: 'SCHEME_HLT_01',
      createdBy: stateReviewer2.id,
    },
  });

  const healthV1 = await prisma.schemeVersion.upsert({
    where: {
      schemeId_versionNumber: {
        schemeId: healthScheme.id,
        versionNumber: 1,
      },
    },
    update: {},
    create: {
      schemeId: healthScheme.id,
      versionNumber: 1,
      schemeName: 'Health Assistance Scheme',
      description: 'Critical illness medical coverage for vulnerable households.',
      amount: 100000,
      applicationDeadline: new Date('2027-10-31'),
      status: SchemeStatus.PUBLISHED,
      createdBy: stateReviewer2.id,
      submittedAt: new Date('2026-01-05'),
      publishedAt: new Date('2026-01-12'),
    },
  });

  await prisma.schemeVersionEligibilityRule.upsert({
    where: {
      schemeVersionId_eligibilityRuleId: {
        schemeVersionId: healthV1.id,
        eligibilityRuleId: incomeRule.id,
      },
    },
    update: {},
    create: {
      schemeVersionId: healthV1.id,
      eligibilityRuleId: incomeRule.id,
      eligibilityRuleVersionId: incomeRuleV1.id,
    },
  });

  await prisma.scheme.update({
    where: { id: healthScheme.id },
    data: { currentPublishedVersionId: healthV1.id },
  });

  // Scheme 3: Housing Support Scheme (PUBLISHED V1, with SENT_BACK V2)
  const housingScheme = await prisma.scheme.upsert({
    where: { schemeCode: 'SCHEME_HSG_01' },
    update: {},
    create: {
      schemeCode: 'SCHEME_HSG_01',
      createdBy: stateReviewer1.id,
    },
  });

  const housingV1 = await prisma.schemeVersion.upsert({
    where: {
      schemeId_versionNumber: {
        schemeId: housingScheme.id,
        versionNumber: 1,
      },
    },
    update: {},
    create: {
      schemeId: housingScheme.id,
      versionNumber: 1,
      schemeName: 'Rural Housing Support Scheme',
      description: 'Subsidy for pucca house construction in rural sectors.',
      amount: 150000,
      applicationDeadline: new Date('2028-03-31'),
      status: SchemeStatus.PUBLISHED,
      createdBy: stateReviewer1.id,
      submittedAt: new Date('2026-01-08'),
      publishedAt: new Date('2026-01-18'),
    },
  });

  await prisma.schemeVersionEligibilityRule.upsert({
    where: {
      schemeVersionId_eligibilityRuleId: {
        schemeVersionId: housingV1.id,
        eligibilityRuleId: incomeRule.id,
      },
    },
    update: {},
    create: {
      schemeVersionId: housingV1.id,
      eligibilityRuleId: incomeRule.id,
      eligibilityRuleVersionId: incomeRuleV1.id,
    },
  });

  await prisma.scheme.update({
    where: { id: housingScheme.id },
    data: { currentPublishedVersionId: housingV1.id },
  });

  // Housing V2: SENT_BACK
  const housingV2 = await prisma.schemeVersion.upsert({
    where: {
      schemeId_versionNumber: {
        schemeId: housingScheme.id,
        versionNumber: 2,
      },
    },
    update: {},
    create: {
      schemeId: housingScheme.id,
      versionNumber: 2,
      schemeName: 'Rural Housing Support Scheme 2026',
      description: 'Subsidy for green pucca house construction.',
      amount: 200000,
      applicationDeadline: new Date('2028-12-31'),
      status: SchemeStatus.SENT_BACK,
      createdBy: stateReviewer1.id,
      submittedAt: new Date('2026-02-10'),
    },
  });

  // Review Comment for Sent Back
  await prisma.reviewComment.create({
    data: {
      schemeVersionId: housingV2.id,
      reviewerId: centralReviewer1.id,
      comment:
        'Please clarify the inspection criteria for green housing subsidy before resubmission.',
      action: ReviewAction.SENT_BACK,
    },
  });

  // Scheme 4: Agriculture Support Scheme (DRAFT V1)
  const agriScheme = await prisma.scheme.upsert({
    where: { schemeCode: 'SCHEME_AGR_01' },
    update: {},
    create: {
      schemeCode: 'SCHEME_AGR_01',
      createdBy: stateReviewer2.id,
    },
  });

  await prisma.schemeVersion.upsert({
    where: {
      schemeId_versionNumber: {
        schemeId: agriScheme.id,
        versionNumber: 1,
      },
    },
    update: {},
    create: {
      schemeId: agriScheme.id,
      versionNumber: 1,
      schemeName: 'Agriculture Support Scheme',
      description: 'Direct fertilizer and seeds equipment subsidies for small landholders.',
      amount: 30000,
      applicationDeadline: new Date('2027-05-31'),
      status: SchemeStatus.DRAFT,
      createdBy: stateReviewer2.id,
    },
  });

  // Scheme 5: Women Empowerment Scheme (DRAFT V1)
  const womenScheme = await prisma.scheme.upsert({
    where: { schemeCode: 'SCHEME_WMN_01' },
    update: {},
    create: {
      schemeCode: 'SCHEME_WMN_01',
      createdBy: stateReviewer1.id,
    },
  });

  await prisma.schemeVersion.upsert({
    where: {
      schemeId_versionNumber: {
        schemeId: womenScheme.id,
        versionNumber: 1,
      },
    },
    update: {},
    create: {
      schemeId: womenScheme.id,
      versionNumber: 1,
      schemeName: 'Women Empowerment Scheme',
      description: 'Self-employment grants and micro-credit for female rural entrepreneurs.',
      amount: 60000,
      applicationDeadline: new Date('2027-11-30'),
      status: SchemeStatus.DRAFT,
      createdBy: stateReviewer1.id,
    },
  });

  console.log('✅ Seeded 5 Realistic Schemes (Published, Draft, In-Review, Sent-back)');

  // 4. Sample Review Comments & Review Flags
  await prisma.reviewComment.create({
    data: {
      schemeVersionId: eduV1.id,
      reviewerId: centralReviewer2.id,
      comment: 'Verified documentation and income limits. Approved.',
      action: ReviewAction.APPROVED,
    },
  });

  await prisma.schemeReviewFlag.upsert({
    where: { id: 'flag-seed-sample-01' },
    update: {},
    create: {
      id: 'flag-seed-sample-01',
      schemeId: healthScheme.id,
      eligibilityRuleId: incomeRule.id,
      reason: 'Rule review flag notification for health assistance scheme.',
      status: ReviewFlagStatus.PENDING,
    },
  });

  // 5. Sample Audit Logs
  await prisma.auditLog.create({
    data: {
      entityType: 'SCHEME_VERSION',
      entityId: eduScheme.id,
      schemeVersionId: eduV1.id,
      fieldName: 'status',
      oldValue: 'IN_REVIEW',
      newValue: 'PUBLISHED',
      changedBy: centralReviewer2.id,
      source: 'ADMIN_API',
    },
  });

  console.log('✅ Seed completed successfully with idempotent data.');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
