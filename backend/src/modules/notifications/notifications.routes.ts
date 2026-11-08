import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate } from '../../shared/middleware/authenticate';
import { authorize } from '../../shared/middleware/authorize';
import * as controller from './notifications.controller';

/** Mounted at /notifications. Patients and doctors choose how they are reminded. */
export const notificationsRouter = Router();

notificationsRouter.use(authenticate, authorize(Role.PATIENT, Role.DOCTOR));
notificationsRouter.get('/preferences', controller.get);
notificationsRouter.put('/preferences', controller.update);
