import { Router } from 'express';
import { templateController } from '../controllers/template.controller.js';
import { validate } from '../middleware/validate.js';
import {
  createTemplateSchema,
  updateTemplateSchema,
} from '../validators/template.validator.js';

const router = Router();

router.get(
  '/',
  templateController.getTemplates.bind(templateController)
);

router.get(
  '/:id',
  templateController.getTemplateById.bind(templateController)
);

router.get(
  '/:id/versions',
  templateController.getTemplateVersions.bind(templateController)
);

router.post(
  '/',
  validate({ body: createTemplateSchema }),
  templateController.createTemplate.bind(templateController)
);

router.put(
  '/:id',
  validate({ body: updateTemplateSchema }),
  templateController.updateTemplate.bind(templateController)
);

router.delete(
  '/:id',
  templateController.deleteTemplate.bind(templateController)
);

export default router;
