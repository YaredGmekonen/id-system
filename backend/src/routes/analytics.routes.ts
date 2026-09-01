import { Router } from 'express';
import { analyticsController } from '../controllers/analytics.controller.js';

export const analyticsRouter = Router();

analyticsRouter.get('/overview', (req, res) => analyticsController.getOverviewMetrics(req, res));
