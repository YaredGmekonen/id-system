import { Router } from 'express';
import { jobController } from '../controllers/job.controller.js';
import { validate } from '../middleware/validate.js';
import {
  createGenerationJobSchema,
  createPrintJobSchema,
} from '../validators/job.validator.js';

const router = Router();

// Generation Jobs Queue
router.get(
  '/generation',
  jobController.getGenerationJobs.bind(jobController)
);

router.get(
  '/generation/:id',
  jobController.getGenerationJobById.bind(jobController)
);

router.post(
  '/generation',
  validate({ body: createGenerationJobSchema }),
  jobController.dispatchGenerationJob.bind(jobController)
);

router.post(
  '/generation/:id/cancel',
  jobController.cancelGenerationJob.bind(jobController)
);

// Print Jobs
router.post(
  '/print',
  validate({ body: createPrintJobSchema }),
  jobController.createPrintJob.bind(jobController)
);

export default router;
