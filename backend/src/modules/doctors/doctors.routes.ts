import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate } from '../../shared/middleware/authenticate';
import { authorize } from '../../shared/middleware/authorize';
import * as controller from './doctors.controller';

export const doctorsRouter = Router();

doctorsRouter.use(authenticate);

doctorsRouter.get('/', controller.list);
doctorsRouter.get('/specialties', controller.specialties);
doctorsRouter.post('/', authorize(Role.ADMIN), controller.create);
// Static paths must be registered before '/:id'.
doctorsRouter.patch('/me', authorize(Role.DOCTOR), controller.updateMe);
doctorsRouter.get('/:id', controller.getById);
