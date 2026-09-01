import { Router } from 'express';
import { workerController } from '../controllers/worker.controller.js';

const router = Router();

router.get('/', workerController.getWorkers.bind(workerController));
router.get('/:id', workerController.getWorkerById.bind(workerController));
router.put('/:id/telemetry', workerController.updateWorkerTelemetry.bind(workerController));

export default router;
