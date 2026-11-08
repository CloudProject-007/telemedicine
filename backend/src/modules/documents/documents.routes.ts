import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate } from '../../shared/middleware/authenticate';
import { authorize } from '../../shared/middleware/authorize';
import * as controller from './documents.controller';

export const documentsRouter = Router();

documentsRouter.use(authenticate);

// Patients manage their own files; doctors may read files of patients they treat.
documentsRouter.get('/', authorize(Role.PATIENT, Role.DOCTOR), controller.list);
documentsRouter.post('/upload-url', authorize(Role.PATIENT), controller.requestUploadUrl);
documentsRouter.post('/', authorize(Role.PATIENT), controller.register);
documentsRouter.get(
  '/:id/download-url',
  authorize(Role.PATIENT, Role.DOCTOR),
  controller.downloadUrl,
);
documentsRouter.delete('/:id', authorize(Role.PATIENT), controller.remove);
