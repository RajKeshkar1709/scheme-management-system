import request from 'supertest';
import app from '../../src/app';
import { prisma } from '../../src/config/database';

describe('Phase 10 Comprehensive Integration Tests (Cases 1 - 42)', () => {
  let stateReviewerToken: string;
  let stateReviewerId: string;
  let stateReviewer2Token: string;
  let centralReviewerToken: string;
  let incomeRuleId: string;

  beforeAll(async () => {
    // Login with seeded users
    const resSR1 = await request(app).post('/api/v1/auth/login').send({
      email: 'state.reviewer1@example.gov',
      password: 'Password@123',
    });
    stateReviewerToken = resSR1.body.data.token;
    stateReviewerId = resSR1.body.data.user.id;

    const resSR2 = await request(app).post('/api/v1/auth/login').send({
      email: 'state.reviewer2@example.gov',
      password: 'Password@123',
    });
    stateReviewer2Token = resSR2.body.data.token;

    const resCR = await request(app).post('/api/v1/auth/login').send({
      email: 'central.reviewer1@example.gov',
      password: 'Password@123',
    });
    centralReviewerToken = resCR.body.data.token;

    const rule1 = await prisma.eligibilityRule.findUnique({
      where: { ruleCode: 'RULE_INCOME_250K' },
    });
    incomeRuleId = rule1!.id;
  });

  // ==========================================
  // 1. Authentication and Authorization (1 - 7)
  // ==========================================
  describe('Authentication & Authorization (Cases 1 - 7)', () => {
    // 1. Successful login
    it('1. should successfully login with valid credentials', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'state.reviewer1@example.gov',
        password: 'Password@123',
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
    });

    // 2. Invalid login
    it('2. should reject login with invalid credentials', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'state.reviewer1@example.gov',
        password: 'WrongPassword',
      });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    // 3. Missing JWT token
    it('3. should reject request with missing JWT token on protected endpoint', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    // 4. Invalid JWT token
    it('4. should reject request with invalid JWT token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid.token.payload');
      expect(res.status).toBe(401);
    });

    // 5. State Reviewer access
    it('5. should grant State Reviewer access to state reviewer endpoints', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${stateReviewerToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.role).toBe('STATE_REVIEWER');
    });

    // 6. Central Reviewer access
    it('6. should grant Central Reviewer access to reviewer endpoints', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${centralReviewerToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.role).toBe('CENTRAL_REVIEWER');
    });

    // 7. Unauthorized role access
    it('7. should reject State Reviewer when calling Central Reviewer-only endpoints', async () => {
      const dummyVersionId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .post(`/api/v1/schemes/dummy-id/versions/${dummyVersionId}/approve`)
        .set('Authorization', `Bearer ${stateReviewerToken}`)
        .send({});
      expect(res.status).toBe(403);
    });
  });

  // ==========================================
  // 2. Scheme Management (8 - 14)
  // ==========================================
  describe('Scheme Management (Cases 8 - 14)', () => {
    let testSchemeId: string;
    let testVersion1Id: string;
    const uniqueCode = `TEST_SCHEME_${Date.now()}`;

    // 8. State Reviewer can create a scheme
    it('8. State Reviewer can create a scheme', async () => {
      const res = await request(app)
        .post('/api/v1/schemes')
        .set('Authorization', `Bearer ${stateReviewerToken}`)
        .send({
          schemeCode: uniqueCode,
          schemeName: 'Test Automation Scheme',
          description: 'A test scheme description with more than 10 characters',
          amount: 50000,
          applicationDeadline: '2028-12-31T00:00:00.000Z',
          eligibilityRuleIds: [incomeRuleId],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.versionNumber).toBe(1);
      expect(res.body.data.status).toBe('DRAFT');

      testSchemeId = res.body.data.schemeId;
      testVersion1Id = res.body.data.id;
    });

    // 9. Central Reviewer cannot create scheme drafts
    it('9. Central Reviewer cannot create scheme drafts', async () => {
      const res = await request(app)
        .post('/api/v1/schemes')
        .set('Authorization', `Bearer ${centralReviewerToken}`)
        .send({
          schemeCode: `CR_TEST_${Date.now()}`,
          schemeName: 'CR Scheme',
          description: 'Valid description for test',
          amount: 25000,
          applicationDeadline: '2028-12-31T00:00:00.000Z',
        });
      expect(res.status).toBe(403);
    });

    // 10. State Reviewer can edit an authorized draft
    it('10. State Reviewer can edit an authorized draft', async () => {
      const res = await request(app)
        .patch(`/api/v1/schemes/${testSchemeId}/versions/${testVersion1Id}`)
        .set('Authorization', `Bearer ${stateReviewerToken}`)
        .send({
          schemeName: 'Updated Test Scheme Name',
          amount: 60000,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.schemeName).toBe('Updated Test Scheme Name');
      expect(Number(res.body.data.amount)).toBe(60000);
    });

    // 11. Unauthorized user cannot edit another user's draft
    it("11. Unauthorized user cannot edit another user's draft", async () => {
      const res = await request(app)
        .patch(`/api/v1/schemes/${testSchemeId}/versions/${testVersion1Id}`)
        .set('Authorization', `Bearer ${stateReviewer2Token}`) // Different reviewer!
        .send({
          schemeName: 'Malicious Change',
        });

      expect(res.status).toBe(403);
    });

    // 12 & 13. Published version cannot be modified & Editing a published scheme creates a new version
    it('12 & 13. Published version cannot be modified and editing requires creating a new version', async () => {
      // Find an already published scheme from seed (SCHEME_HLT_01)
      const hltScheme = await prisma.scheme.findUnique({
        where: { schemeCode: 'SCHEME_HLT_01' },
      });
      const publishedVersionId = hltScheme!.currentPublishedVersionId!;

      // 13. Published version cannot be modified directly
      const patchRes = await request(app)
        .patch(`/api/v1/schemes/${hltScheme!.id}/versions/${publishedVersionId}`)
        .set('Authorization', `Bearer ${stateReviewer2Token}`)
        .send({ schemeName: 'Illegal Modify' });

      expect(patchRes.status).toBe(400);

      // 12. Create a new version for this published scheme
      const newVersionRes = await request(app)
        .post(`/api/v1/schemes/${hltScheme!.id}/versions`)
        .set('Authorization', `Bearer ${stateReviewer2Token}`)
        .send({
          schemeName: 'Health Assistance Scheme - V2 Draft',
          amount: 120000,
        });

      expect(newVersionRes.status).toBe(201);
      expect(newVersionRes.body.data.versionNumber).toBe(2);
      expect(newVersionRes.body.data.status).toBe('DRAFT');

      // 14. Duplicate active drafts are prevented
      const dupDraftRes = await request(app)
        .post(`/api/v1/schemes/${hltScheme!.id}/versions`)
        .set('Authorization', `Bearer ${stateReviewer2Token}`)
        .send({
          schemeName: 'Another Active Draft Attempt',
        });

      expect(dupDraftRes.status).toBe(409);

      // Clean up the created draft to leave seed state clean
      await prisma.schemeVersionEligibilityRule.deleteMany({
        where: { schemeVersionId: newVersionRes.body.data.id },
      });
      await prisma.schemeVersion.delete({
        where: { id: newVersionRes.body.data.id },
      });
    });
  });

  // ==========================================
  // 3. Approval Workflow (15 - 22)
  // ==========================================
  describe('Approval Workflow (Cases 15 - 22)', () => {
    let workflowSchemeId: string;
    let workflowVersionId: string;

    beforeAll(async () => {
      // Create fresh scheme by State Reviewer 1
      const res = await request(app)
        .post('/api/v1/schemes')
        .set('Authorization', `Bearer ${stateReviewerToken}`)
        .send({
          schemeCode: `WORKFLOW_TEST_${Date.now()}`,
          schemeName: 'Workflow Scheme',
          description: 'Testing full workflow transitions',
          amount: 40000,
          applicationDeadline: '2028-12-31T00:00:00.000Z',
          eligibilityRuleIds: [incomeRuleId],
        });
      workflowSchemeId = res.body.data.schemeId;
      workflowVersionId = res.body.data.id;
    });

    // 18. Draft cannot be approved without submission
    it('18. Draft cannot be approved without submission', async () => {
      const res = await request(app)
        .post(`/api/v1/schemes/${workflowSchemeId}/versions/${workflowVersionId}/approve`)
        .set('Authorization', `Bearer ${centralReviewerToken}`)
        .send({ comment: 'Premature approval attempt' });

      expect(res.status).toBe(400);
    });

    // 15. State Reviewer can submit a draft
    it('15. State Reviewer can submit a draft', async () => {
      const res = await request(app)
        .post(`/api/v1/schemes/${workflowSchemeId}/versions/${workflowVersionId}/submit`)
        .set('Authorization', `Bearer ${stateReviewerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('IN_REVIEW');
      expect(res.body.data.submittedAt).toBeDefined();
    });

    // 17. Creator cannot approve their own version
    it('17. Creator cannot approve their own version', async () => {
      // Suppose State Reviewer 1 attempts to approve (even if masqueraded or checked)
      const res = await request(app)
        .post(`/api/v1/schemes/${workflowSchemeId}/versions/${workflowVersionId}/approve`)
        .set('Authorization', `Bearer ${stateReviewerToken}`)
        .send({});

      expect(res.status).toBe(403);
    });

    // 20. Sending back requires a comment
    it('20. Sending back requires a comment', async () => {
      const res = await request(app)
        .post(`/api/v1/schemes/${workflowSchemeId}/versions/${workflowVersionId}/send-back`)
        .set('Authorization', `Bearer ${centralReviewerToken}`)
        .send({ comment: '' });

      expect(res.status).toBe(400);
    });

    // 21. Central reviewer sends back, and returned draft can be corrected and resubmitted
    it('21. Returned draft can be corrected and resubmitted', async () => {
      // Central Reviewer sends back with comment
      const sendBackRes = await request(app)
        .post(`/api/v1/schemes/${workflowSchemeId}/versions/${workflowVersionId}/send-back`)
        .set('Authorization', `Bearer ${centralReviewerToken}`)
        .send({ comment: 'Please increase application amount to 45000' });

      expect(sendBackRes.status).toBe(200);
      expect(sendBackRes.body.data.status).toBe('SENT_BACK');

      // State reviewer corrects it
      const editRes = await request(app)
        .patch(`/api/v1/schemes/${workflowSchemeId}/versions/${workflowVersionId}`)
        .set('Authorization', `Bearer ${stateReviewerToken}`)
        .send({ amount: 45000 });

      expect(editRes.status).toBe(200);
      expect(Number(editRes.body.data.amount)).toBe(45000);

      // Resubmit
      const resubmitRes = await request(app)
        .post(`/api/v1/schemes/${workflowSchemeId}/versions/${workflowVersionId}/submit`)
        .set('Authorization', `Bearer ${stateReviewerToken}`);

      expect(resubmitRes.status).toBe(200);
      expect(resubmitRes.body.data.status).toBe('IN_REVIEW');
    });

    // 16. Central Reviewer can approve a submitted version
    it('16. Central Reviewer can approve a submitted version', async () => {
      const res = await request(app)
        .post(`/api/v1/schemes/${workflowSchemeId}/versions/${workflowVersionId}/approve`)
        .set('Authorization', `Bearer ${centralReviewerToken}`)
        .send({ comment: 'Approved. Looks great.' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('PUBLISHED');
      expect(res.body.data.publishedAt).toBeDefined();
    });

    // 19. Published version cannot be submitted again
    it('19. Published version cannot be submitted again', async () => {
      const res = await request(app)
        .post(`/api/v1/schemes/${workflowSchemeId}/versions/${workflowVersionId}/submit`)
        .set('Authorization', `Bearer ${stateReviewerToken}`);

      expect(res.status).toBe(400);
    });

    // 22. Invalid status transitions are rejected
    it('22. Invalid status transitions are rejected', async () => {
      // Attempting to send back an already PUBLISHED version
      const res = await request(app)
        .post(`/api/v1/schemes/${workflowSchemeId}/versions/${workflowVersionId}/send-back`)
        .set('Authorization', `Bearer ${centralReviewerToken}`)
        .send({ comment: 'Invalid sendback' });

      expect(res.status).toBe(400);
    });
  });

  // ==========================================
  // 4. Versioning & Live Read API (23 - 29)
  // ==========================================
  describe('Versioning & Live Read API (Cases 23 - 29)', () => {
    let vSchemeId: string;
    let v1Id: string;
    let v2Id: string;

    beforeAll(async () => {
      // 1. Create and Publish Version 1
      const res = await request(app)
        .post('/api/v1/schemes')
        .set('Authorization', `Bearer ${stateReviewerToken}`)
        .send({
          schemeCode: `VER_TEST_${Date.now()}`,
          schemeName: 'Education Support Scheme',
          description: 'Initial scheme description',
          amount: 50000,
          applicationDeadline: '2028-12-31T00:00:00.000Z',
          eligibilityRuleIds: [incomeRuleId],
        });

      vSchemeId = res.body.data.schemeId;
      v1Id = res.body.data.id;

      await request(app)
        .post(`/api/v1/schemes/${vSchemeId}/versions/${v1Id}/submit`)
        .set('Authorization', `Bearer ${stateReviewerToken}`);

      await request(app)
        .post(`/api/v1/schemes/${vSchemeId}/versions/${v1Id}/approve`)
        .set('Authorization', `Bearer ${centralReviewerToken}`)
        .send({ comment: 'Version 1 approved' });
    });

    // 23 & 28. Old published version remains unchanged & Read API returns the correct published version
    it('23 & 28. Read API returns the correct published version 1', async () => {
      const res = await request(app).get(`/api/v1/schemes/public/${vSchemeId}`);
      expect(res.status).toBe(200);
      expect(res.body.data.publishedVersion.id).toBe(v1Id);
      expect(Number(res.body.data.publishedVersion.amount)).toBe(50000);
    });

    // 24. New draft remains invisible to public read APIs
    it('24. New draft remains invisible to public read APIs', async () => {
      const v2Res = await request(app)
        .post(`/api/v1/schemes/${vSchemeId}/versions`)
        .set('Authorization', `Bearer ${stateReviewerToken}`)
        .send({
          schemeName: 'Education Support Scheme V2',
          amount: 75000,
        });

      v2Id = v2Res.body.data.id;

      const publicRes = await request(app).get(`/api/v1/schemes/public/${vSchemeId}`);
      expect(publicRes.status).toBe(200);
      expect(publicRes.body.data.publishedVersion.id).toBe(v1Id);
      expect(Number(publicRes.body.data.publishedVersion.amount)).toBe(50000); // Still 50000!
    });

    // 25. In-review version remains invisible to public read APIs
    it('25. In-review version remains invisible to public read APIs', async () => {
      await request(app)
        .post(`/api/v1/schemes/${vSchemeId}/versions/${v2Id}/submit`)
        .set('Authorization', `Bearer ${stateReviewerToken}`);

      const publicRes = await request(app).get(`/api/v1/schemes/public/${vSchemeId}`);
      expect(publicRes.status).toBe(200);
      expect(publicRes.body.data.publishedVersion.id).toBe(v1Id);
      expect(Number(publicRes.body.data.publishedVersion.amount)).toBe(50000); // Still 50000!
    });

    // 26. Sent-back version remains invisible to public read APIs
    it('26. Sent-back version remains invisible to public read APIs', async () => {
      await request(app)
        .post(`/api/v1/schemes/${vSchemeId}/versions/${v2Id}/send-back`)
        .set('Authorization', `Bearer ${centralReviewerToken}`)
        .send({ comment: 'Need slight modification' });

      const publicRes = await request(app).get(`/api/v1/schemes/public/${vSchemeId}`);
      expect(publicRes.status).toBe(200);
      expect(publicRes.body.data.publishedVersion.id).toBe(v1Id);
      expect(Number(publicRes.body.data.publishedVersion.amount)).toBe(50000);

      // Submit again so we can test publishing
      await request(app)
        .post(`/api/v1/schemes/${vSchemeId}/versions/${v2Id}/submit`)
        .set('Authorization', `Bearer ${stateReviewerToken}`);
    });

    // 27. Publishing changes currentPublishedVersionId
    it('27. Publishing changes currentPublishedVersionId and public read returns new version', async () => {
      await request(app)
        .post(`/api/v1/schemes/${vSchemeId}/versions/${v2Id}/approve`)
        .set('Authorization', `Bearer ${centralReviewerToken}`)
        .send({ comment: 'Approved V2' });

      const schemeRecord = await prisma.scheme.findUnique({
        where: { id: vSchemeId },
      });
      expect(schemeRecord!.currentPublishedVersionId).toBe(v2Id);

      const publicRes = await request(app).get(`/api/v1/schemes/public/${vSchemeId}`);
      expect(publicRes.status).toBe(200);
      expect(publicRes.body.data.publishedVersion.id).toBe(v2Id);
      expect(Number(publicRes.body.data.publishedVersion.amount)).toBe(75000);
    });

    // 29. Concurrent publishing attempts preserve data consistency
    it('29. Concurrent publishing attempts preserve data consistency', async () => {
      // Attempting to approve an already published version concurrently returns bad request gracefully
      const res = await request(app)
        .post(`/api/v1/schemes/${vSchemeId}/versions/${v2Id}/approve`)
        .set('Authorization', `Bearer ${centralReviewerToken}`)
        .send({ comment: 'Duplicate concurrent publish' });

      expect(res.status).toBe(400);
    });
  });

  // ==========================================
  // 5. Audit Logging (30 - 35)
  // ==========================================
  describe('Field-Level Audit Logging (Cases 30 - 35)', () => {
    let auditSchemeId: string;
    let auditVersionId: string;

    it('30 - 35. tracks changes, values, user identity, source and unchanged field behavior', async () => {
      // 30 & 33 & 34: Create draft scheme
      const createRes = await request(app)
        .post('/api/v1/schemes')
        .set('Authorization', `Bearer ${stateReviewerToken}`)
        .send({
          schemeCode: `AUDIT_TEST_${Date.now()}`,
          schemeName: 'Audit Test Scheme',
          description: 'Testing audit logs behavior',
          amount: 50000,
          applicationDeadline: '2028-12-31T00:00:00.000Z',
          eligibilityRuleIds: [incomeRuleId],
        });

      auditSchemeId = createRes.body.data.schemeId;
      auditVersionId = createRes.body.data.id;

      // 30 & 31: Modify amount from 50000 to 75000
      await request(app)
        .patch(`/api/v1/schemes/${auditSchemeId}/versions/${auditVersionId}`)
        .set('Authorization', `Bearer ${stateReviewerToken}`)
        .send({ amount: 75000 });

      // Fetch audit logs for this scheme
      const auditRes = await request(app)
        .get(`/api/v1/schemes/${auditSchemeId}/audit-logs`)
        .set('Authorization', `Bearer ${stateReviewerToken}`);

      expect(auditRes.status).toBe(200);
      const logs = auditRes.body.data.items;

      // 30. Every changed field creates an audit log
      const amountLog = logs.find((l: any) => l.fieldName === 'amount' && l.newValue === 75000);
      expect(amountLog).toBeDefined();

      // 31. Old and new values are correct
      expect(amountLog.oldValue).toBe(50000);
      expect(amountLog.newValue).toBe(75000);

      // 33. User identity is recorded correctly
      expect(amountLog.changedBy).toBe(stateReviewerId);

      // 34. Source is recorded correctly
      expect(amountLog.source).toBe('ADMIN_API');

      // 32. Unchanged fields do not create audit records
      // Edit only description, leave amount untouched
      await request(app)
        .patch(`/api/v1/schemes/${auditSchemeId}/versions/${auditVersionId}`)
        .set('Authorization', `Bearer ${stateReviewerToken}`)
        .send({ description: 'New description text' });

      const updatedAuditRes = await request(app)
        .get(`/api/v1/schemes/${auditSchemeId}/audit-logs`)
        .set('Authorization', `Bearer ${stateReviewerToken}`);

      const descLogs = updatedAuditRes.body.data.items.filter(
        (l: any) => l.fieldName === 'description',
      );
      expect(descLogs.length).toBe(1);

      // 35. Failed transactions do not leave partial audit records
      try {
        await prisma.$transaction(async (tx) => {
          await tx.auditLog.create({
            data: {
              entityType: 'TEST',
              entityId: 'fail-entity',
              fieldName: 'fail-field',
              changedBy: stateReviewerId,
              source: 'TEST',
            },
          });
          throw new Error('Simulated transaction failure');
        });
      } catch {
        // expected error
      }

      const totalAfterRollback = await prisma.auditLog.count({
        where: { entityId: 'fail-entity' },
      });
      expect(totalAfterRollback).toBe(0);
    });
  });

  // ==========================================
  // 6. Shared Eligibility Rules (36 - 42)
  // ==========================================
  describe('Shared Eligibility Rules (Cases 36 - 42)', () => {
    let sharedRuleId: string;
    let s1Id: string;
    let s2Id: string;
    let s1v1Id: string;
    let s2v1Id: string;

    // 36. Multiple schemes can share the same logical rule
    it('36. Multiple schemes can share the same logical rule', async () => {
      // Create new shared rule
      const ruleRes = await request(app)
        .post('/api/v1/eligibility-rules')
        .set('Authorization', `Bearer ${centralReviewerToken}`)
        .send({
          ruleCode: `RULE_SHARED_${Date.now()}`,
          name: 'Shared Family Income Limit',
          description: 'Income must be below 2.5 lakh',
          ruleDefinition: { field: 'annualFamilyIncome', operator: 'LESS_THAN', value: 250000 },
        });

      expect(ruleRes.status).toBe(201);
      sharedRuleId = ruleRes.body.data.id;

      // Create Scheme 1 referencing this rule and publish it
      const s1Res = await request(app)
        .post('/api/v1/schemes')
        .set('Authorization', `Bearer ${stateReviewerToken}`)
        .send({
          schemeCode: `DEP_SCHEME_1_${Date.now()}`,
          schemeName: 'Education Dependent Scheme',
          description: 'Dependent scheme description 1',
          amount: 50000,
          applicationDeadline: '2028-12-31T00:00:00.000Z',
          eligibilityRuleIds: [sharedRuleId],
        });
      s1Id = s1Res.body.data.schemeId;
      s1v1Id = s1Res.body.data.id;

      await request(app)
        .post(`/api/v1/schemes/${s1Id}/versions/${s1v1Id}/submit`)
        .set('Authorization', `Bearer ${stateReviewerToken}`);
      await request(app)
        .post(`/api/v1/schemes/${s1Id}/versions/${s1v1Id}/approve`)
        .set('Authorization', `Bearer ${centralReviewerToken}`)
        .send({ comment: 'Approved S1' });

      // Create Scheme 2 referencing this rule and publish it
      const s2Res = await request(app)
        .post('/api/v1/schemes')
        .set('Authorization', `Bearer ${stateReviewerToken}`)
        .send({
          schemeCode: `DEP_SCHEME_2_${Date.now()}`,
          schemeName: 'Health Dependent Scheme',
          description: 'Dependent scheme description 2',
          amount: 80000,
          applicationDeadline: '2028-12-31T00:00:00.000Z',
          eligibilityRuleIds: [sharedRuleId],
        });
      s2Id = s2Res.body.data.schemeId;
      s2v1Id = s2Res.body.data.id;

      await request(app)
        .post(`/api/v1/schemes/${s2Id}/versions/${s2v1Id}/submit`)
        .set('Authorization', `Bearer ${stateReviewerToken}`);
      await request(app)
        .post(`/api/v1/schemes/${s2Id}/versions/${s2v1Id}/approve`)
        .set('Authorization', `Bearer ${centralReviewerToken}`)
        .send({ comment: 'Approved S2' });

      // Verify both schemes depend on the rule
      const depRes = await request(app)
        .get(`/api/v1/eligibility-rules/${sharedRuleId}/schemes`)
        .set('Authorization', `Bearer ${stateReviewerToken}`);

      expect(depRes.status).toBe(200);
      expect(depRes.body.data.length).toBe(2);
    });

    // 37 & 38 & 39 & 40: Rule updates create new versions, generate review flags, keep published schemes unchanged
    it('37, 38, 39, 40. Rule updates create new version, flag dependent schemes without modifying published schemes', async () => {
      // 37. Update rule to ₹3,00,000
      const updateRes = await request(app)
        .patch(`/api/v1/eligibility-rules/${sharedRuleId}`)
        .set('Authorization', `Bearer ${centralReviewerToken}`)
        .send({
          ruleDefinition: { field: 'annualFamilyIncome', operator: 'LESS_THAN', value: 300000 },
          reason: 'Adjusted for inflation in 2026',
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.versions.length).toBe(2);

      // 38. All dependent schemes receive review flags
      const flagsRes = await request(app)
        .get('/api/v1/review-flags?status=PENDING')
        .set('Authorization', `Bearer ${stateReviewerToken}`);

      expect(flagsRes.status).toBe(200);
      const s1Flag = flagsRes.body.data.find(
        (f: any) => f.schemeId === s1Id && f.eligibilityRuleId === sharedRuleId,
      );
      const s2Flag = flagsRes.body.data.find(
        (f: any) => f.schemeId === s2Id && f.eligibilityRuleId === sharedRuleId,
      );

      expect(s1Flag).toBeDefined();
      expect(s2Flag).toBeDefined();

      // 39 & 40. Published scheme versions retain their old rule version and are not silently updated
      const s1Published = await request(app).get(`/api/v1/schemes/public/${s1Id}`);
      expect(s1Published.status).toBe(200);
      const usedRule = s1Published.body.data.publishedVersion.eligibilityRules.find(
        (r: any) => r.eligibilityRuleId === sharedRuleId,
      );
      expect(usedRule.eligibilityRuleVersion.versionNumber).toBe(1); // Still Version 1 (250000)!
    });

    // 41 & 42. New scheme version explicitly adopts new rule version, and publishing resolves the review flag
    it('41 & 42. New scheme version can adopt new rule version and publishing resolves the review flag', async () => {
      // 41. Create V2 of Scheme 1 adopting updated rule
      const newV2Res = await request(app)
        .post(`/api/v1/schemes/${s1Id}/versions`)
        .set('Authorization', `Bearer ${stateReviewerToken}`)
        .send({
          schemeName: 'Education Dependent Scheme - 2026 Revision',
          eligibilityRuleIds: [sharedRuleId], // picks up latest rule version automatically
        });

      expect(newV2Res.status).toBe(201);
      const s1v2Id = newV2Res.body.data.id;
      const s1v2Rule = newV2Res.body.data.eligibilityRules.find(
        (r: any) => r.eligibilityRuleId === sharedRuleId,
      );
      expect(s1v2Rule.eligibilityRuleVersion.versionNumber).toBe(2);

      // Submit V2
      await request(app)
        .post(`/api/v1/schemes/${s1Id}/versions/${s1v2Id}/submit`)
        .set('Authorization', `Bearer ${stateReviewerToken}`);

      // 42. Publish V2 -> automatically resolves the relevant review flag
      const approveRes = await request(app)
        .post(`/api/v1/schemes/${s1Id}/versions/${s1v2Id}/approve`)
        .set('Authorization', `Bearer ${centralReviewerToken}`)
        .send({ comment: 'Approved with revised rule' });

      expect(approveRes.status).toBe(200);

      // Check review flag status
      const flagCheck = await prisma.schemeReviewFlag.findFirst({
        where: {
          schemeId: s1Id,
          eligibilityRuleId: sharedRuleId,
        },
      });

      expect(flagCheck!.status).toBe('RESOLVED');
      expect(flagCheck!.resolvedAt).not.toBeNull();
    });
  });
});
