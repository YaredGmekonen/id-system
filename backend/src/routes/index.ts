import { Router } from 'express';
import personsRoutes from './persons.routes.js';
import batchesRoutes from './batches.routes.js';
import templatesRoutes from './templates.routes.js';
import jobsRoutes from './jobs.routes.js';
import storageRoutes from './storage.routes.js';
import workersRoutes from './workers.routes.js';
import healthRoutes from './health.routes.js';
import { authRouter } from './auth.routes.js';
import { analyticsRouter } from './analytics.routes.js';
import { usersRouter } from './users.routes.js';
import { auditRouter } from './audit.routes.js';
import { syncRouter } from './sync.routes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/sync', syncRouter);
router.use('/auth', authRouter);
router.use('/analytics', analyticsRouter);
router.use('/users', usersRouter);
router.use('/audit', auditRouter);
router.use('/persons', personsRoutes);
router.use('/batches', batchesRoutes);
router.use('/templates', templatesRoutes);
router.use('/jobs', jobsRoutes);
router.use('/storage', storageRoutes);
router.use('/workers', workersRoutes);

export default router;
