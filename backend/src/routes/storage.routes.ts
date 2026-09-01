import { Router } from 'express';
import multer from 'multer';
import { storageController } from '../controllers/storage.controller.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB max file size
});

const router = Router();

// Upload photo
router.post(
  '/upload-photo',
  upload.single('photo'),
  storageController.uploadPersonPhoto.bind(storageController)
);

// Stream storage file
router.get(
  '/files/*',
  storageController.getFile.bind(storageController)
);

export default router;
