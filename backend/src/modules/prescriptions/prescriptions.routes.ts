import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate } from '../../shared/middleware/authenticate';
import { authorize } from '../../shared/middleware/authorize';
import * as controller from './prescriptions.controller';

/** Mounted at /appointments/:appointmentId/prescription */
export const prescriptionsRouter = Router({ mergeParams: true });

prescriptionsRouter.use(authenticate);
prescriptionsRouter.get('/', authorize(Role.PATIENT, Role.DOCTOR), controller.get);
prescriptionsRouter.put('/', authorize(Role.DOCTOR), controller.upsert);
prescriptionsRouter.get('/pdf-url', authorize(Role.PATIENT, Role.DOCTOR), controller.pdfUrl);
