import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate } from '../../shared/middleware/authenticate';
import { authorize } from '../../shared/middleware/authorize';
import * as controller from './messages.controller';

/** Mounted at /appointments/:appointmentId/messages (history; sending happens over Socket.IO). */
export const messagesRouter = Router({ mergeParams: true });

messagesRouter.use(authenticate, authorize(Role.PATIENT, Role.DOCTOR));
messagesRouter.get('/', controller.list);
