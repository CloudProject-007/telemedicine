import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate } from '../../shared/middleware/authenticate';
import { authorize } from '../../shared/middleware/authorize';
import * as controller from './slots.controller';

/** Mounted at /doctors/:doctorId/slots - browse a doctor's availability. */
export const doctorSlotsRouter = Router({ mergeParams: true });
doctorSlotsRouter.get('/', authenticate, controller.listForDoctor);

/** Mounted at /slots - a doctor manages their own availability. */
export const slotsRouter = Router();
slotsRouter.use(authenticate, authorize(Role.DOCTOR));
slotsRouter.post('/', controller.create);
slotsRouter.delete('/:id', controller.remove);
