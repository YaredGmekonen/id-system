import { Router } from 'express';
import { personController } from '../controllers/person.controller.js';
import { validate } from '../middleware/validate.js';
import {
  createPersonSchema,
  updatePersonSchema,
  bulkCreatePersonsSchema,
  personQuerySchema,
} from '../validators/person.validator.js';

const router = Router();

router.get(
  '/',
  validate({ query: personQuerySchema }),
  personController.getPersons.bind(personController)
);

router.get(
  '/:id',
  personController.getPersonById.bind(personController)
);

router.post(
  '/',
  validate({ body: createPersonSchema }),
  personController.createPerson.bind(personController)
);

router.post(
  '/bulk',
  validate({ body: bulkCreatePersonsSchema }),
  personController.bulkCreatePersons.bind(personController)
);

router.put(
  '/:id',
  validate({ body: updatePersonSchema }),
  personController.updatePerson.bind(personController)
);

router.delete(
  '/:id',
  personController.deletePerson.bind(personController)
);

router.post(
  '/bulk-delete',
  personController.bulkDeletePersons.bind(personController)
);

export default router;
