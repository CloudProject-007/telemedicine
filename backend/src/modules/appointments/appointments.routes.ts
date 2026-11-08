import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate } from '../../shared/middleware/authenticate';
import { authorize } from '../../shared/middleware/authorize';
import * as controller from './appointments.controller';

export const appointmentsRouter = Router();

appointmentsRouter.use(authenticate);

appointmentsRouter.get('/', controller.list);
appointmentsRouter.post('/', authorize(Role.PATIENT), controller.create);
appointmentsRouter.get('/:id', controller.getById);
// Patients may cancel; doctors confirm / complete / cancel (rules enforced in the service).
appointmentsRouter.patch(
  '/:id/status',
  authorize(Role.PATIENT, Role.DOCTOR),
  controller.updateStatus,
);
