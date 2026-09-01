import { Router } from 'express';
import { batchController } from '../controllers/batch.controller.js';
import { validate } from '../middleware/validate.js';
import {
  createBatchSchema,
  updateBatchSchema,
  batchQuerySchema,
} from '../validators/batch.validator.js';

const router = Router();

router.get(
  '/',
  validate({ query: batchQuerySchema }),
  batchController.getBatches.bind(batchController)
);

router.get(
  '/:id',
  batchController.getBatchById.bind(batchController)
);

router.post(
  '/',
  validate({ body: createBatchSchema }),
  batchController.createBatch.bind(batchController)
);

router.put(
  '/:id',
  validate({ body: updateBatchSchema }),
  batchController.updateBatch.bind(batchController)
);

router.delete(
  '/:id',
  batchController.deleteBatch.bind(batchController)
);

export default router;
