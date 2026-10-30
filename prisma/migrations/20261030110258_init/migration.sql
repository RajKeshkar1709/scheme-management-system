-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STATE_REVIEWER', 'CENTRAL_REVIEWER');

-- CreateEnum
CREATE TYPE "SchemeStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'PUBLISHED', 'SENT_BACK');

-- CreateEnum
CREATE TYPE "ReviewAction" AS ENUM ('APPROVED', 'SENT_BACK');

-- CreateEnum
CREATE TYPE "ReviewFlagStatus" AS ENUM ('PENDING', 'RESOLVED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schemes" (
    "id" TEXT NOT NULL,
    "schemeCode" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "currentPublishedVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schemes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheme_versions" (
    "id" TEXT NOT NULL,
    "schemeId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "schemeName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "applicationDeadline" TIMESTAMP(3) NOT NULL,
    "status" "SchemeStatus" NOT NULL DEFAULT 'DRAFT',
    "createdBy" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scheme_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eligibility_rules" (
    "id" TEXT NOT NULL,
    "ruleCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "latestVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "eligibility_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eligibility_rule_versions" (
    "id" TEXT NOT NULL,
    "eligibilityRuleId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "ruleDefinition" JSONB NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eligibility_rule_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheme_version_eligibility_rules" (
    "id" TEXT NOT NULL,
    "schemeVersionId" TEXT NOT NULL,
    "eligibilityRuleId" TEXT NOT NULL,
    "eligibilityRuleVersionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scheme_version_eligibility_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "schemeVersionId" TEXT,
    "fieldName" TEXT NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "changedBy" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_comments" (
    "id" TEXT NOT NULL,
    "schemeVersionId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "action" "ReviewAction" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheme_review_flags" (
    "id" TEXT NOT NULL,
    "schemeId" TEXT NOT NULL,
    "eligibilityRuleId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "ReviewFlagStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "scheme_review_flags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE UNIQUE INDEX "schemes_schemeCode_key" ON "schemes"("schemeCode");

-- CreateIndex
CREATE UNIQUE INDEX "schemes_currentPublishedVersionId_key" ON "schemes"("currentPublishedVersionId");

-- CreateIndex
CREATE INDEX "schemes_createdBy_idx" ON "schemes"("createdBy");

-- CreateIndex
CREATE INDEX "schemes_createdAt_idx" ON "schemes"("createdAt");

-- CreateIndex
CREATE INDEX "scheme_versions_schemeId_idx" ON "scheme_versions"("schemeId");

-- CreateIndex
CREATE INDEX "scheme_versions_status_idx" ON "scheme_versions"("status");

-- CreateIndex
CREATE INDEX "scheme_versions_createdBy_idx" ON "scheme_versions"("createdBy");

-- CreateIndex
CREATE INDEX "scheme_versions_createdAt_idx" ON "scheme_versions"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "scheme_versions_schemeId_versionNumber_key" ON "scheme_versions"("schemeId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "eligibility_rules_ruleCode_key" ON "eligibility_rules"("ruleCode");

-- CreateIndex
CREATE INDEX "eligibility_rule_versions_eligibilityRuleId_idx" ON "eligibility_rule_versions"("eligibilityRuleId");

-- CreateIndex
CREATE INDEX "eligibility_rule_versions_createdBy_idx" ON "eligibility_rule_versions"("createdBy");

-- CreateIndex
CREATE UNIQUE INDEX "eligibility_rule_versions_eligibilityRuleId_versionNumber_key" ON "eligibility_rule_versions"("eligibilityRuleId", "versionNumber");

-- CreateIndex
CREATE INDEX "scheme_version_eligibility_rules_schemeVersionId_idx" ON "scheme_version_eligibility_rules"("schemeVersionId");

-- CreateIndex
CREATE INDEX "scheme_version_eligibility_rules_eligibilityRuleId_idx" ON "scheme_version_eligibility_rules"("eligibilityRuleId");

-- CreateIndex
CREATE INDEX "scheme_version_eligibility_rules_eligibilityRuleVersionId_idx" ON "scheme_version_eligibility_rules"("eligibilityRuleVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "scheme_version_eligibility_rules_schemeVersionId_eligibilit_key" ON "scheme_version_eligibility_rules"("schemeVersionId", "eligibilityRuleId");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_schemeVersionId_idx" ON "audit_logs"("schemeVersionId");

-- CreateIndex
CREATE INDEX "audit_logs_changedBy_idx" ON "audit_logs"("changedBy");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "review_comments_schemeVersionId_idx" ON "review_comments"("schemeVersionId");

-- CreateIndex
CREATE INDEX "review_comments_reviewerId_idx" ON "review_comments"("reviewerId");

-- CreateIndex
CREATE INDEX "review_comments_createdAt_idx" ON "review_comments"("createdAt");

-- CreateIndex
CREATE INDEX "scheme_review_flags_schemeId_idx" ON "scheme_review_flags"("schemeId");

-- CreateIndex
CREATE INDEX "scheme_review_flags_eligibilityRuleId_idx" ON "scheme_review_flags"("eligibilityRuleId");

-- CreateIndex
CREATE INDEX "scheme_review_flags_status_idx" ON "scheme_review_flags"("status");

-- AddForeignKey
ALTER TABLE "schemes" ADD CONSTRAINT "schemes_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schemes" ADD CONSTRAINT "schemes_currentPublishedVersionId_fkey" FOREIGN KEY ("currentPublishedVersionId") REFERENCES "scheme_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheme_versions" ADD CONSTRAINT "scheme_versions_schemeId_fkey" FOREIGN KEY ("schemeId") REFERENCES "schemes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheme_versions" ADD CONSTRAINT "scheme_versions_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eligibility_rule_versions" ADD CONSTRAINT "eligibility_rule_versions_eligibilityRuleId_fkey" FOREIGN KEY ("eligibilityRuleId") REFERENCES "eligibility_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eligibility_rule_versions" ADD CONSTRAINT "eligibility_rule_versions_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheme_version_eligibility_rules" ADD CONSTRAINT "scheme_version_eligibility_rules_schemeVersionId_fkey" FOREIGN KEY ("schemeVersionId") REFERENCES "scheme_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheme_version_eligibility_rules" ADD CONSTRAINT "scheme_version_eligibility_rules_eligibilityRuleId_fkey" FOREIGN KEY ("eligibilityRuleId") REFERENCES "eligibility_rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheme_version_eligibility_rules" ADD CONSTRAINT "scheme_version_eligibility_rules_eligibilityRuleVersionId_fkey" FOREIGN KEY ("eligibilityRuleVersionId") REFERENCES "eligibility_rule_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "schemes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_schemeVersionId_fkey" FOREIGN KEY ("schemeVersionId") REFERENCES "scheme_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_comments" ADD CONSTRAINT "review_comments_schemeVersionId_fkey" FOREIGN KEY ("schemeVersionId") REFERENCES "scheme_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_comments" ADD CONSTRAINT "review_comments_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheme_review_flags" ADD CONSTRAINT "scheme_review_flags_schemeId_fkey" FOREIGN KEY ("schemeId") REFERENCES "schemes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheme_review_flags" ADD CONSTRAINT "scheme_review_flags_eligibilityRuleId_fkey" FOREIGN KEY ("eligibilityRuleId") REFERENCES "eligibility_rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
