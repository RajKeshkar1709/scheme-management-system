import { Router } from 'express';
import { AuditLogController } from './audit-log.controller';
import { authenticate } from '../../middlewares/authenticate.middleware';

const router = Router();

router.use(authenticate);

router.get('/', AuditLogController.getAllAuditLogs);

export default router;
