import { Router } from 'express';
import authMiddleware from '../../middleware/auth.middleware';
import roleMiddleware from '../../middleware/role.middleware';
import {
  createIssue,
  getAllIssues,
  getIssueById,
  updateIssue,
  deleteIssue,
} from './issues.controller';

const router = Router();

//Public routes (no token needed)
router.get('/', getAllIssues);
router.get('/:id', getIssueById);

//Protected: any authenticated user (contributor or maintainer)
router.post('/', authMiddleware, createIssue);

//Protected: auth required; permission logic is inside controller
router.patch('/:id', authMiddleware, updateIssue);

// ── Protected: maintainer only
router.delete('/:id', authMiddleware, roleMiddleware('maintainer'), deleteIssue);

export default router;
