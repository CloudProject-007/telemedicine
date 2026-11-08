import { Router } from 'express';
import { appointmentsRouter } from '../modules/appointments/appointments.routes';
import { authRouter } from '../modules/auth/auth.routes';
import { doctorsRouter } from '../modules/doctors/doctors.routes';
import { documentsRouter } from '../modules/documents/documents.routes';
import { messagesRouter } from '../modules/messages/messages.routes';
import { notificationsRouter } from '../modules/notifications/notifications.routes';
import { prescriptionsRouter } from '../modules/prescriptions/prescriptions.routes';
import { doctorSlotsRouter, slotsRouter } from '../modules/slots/slots.routes';
import { webrtcRouter } from '../modules/webrtc/webrtc.routes';

/** All versioned API routes. Mounted at /api/v1 by the app. */
export const apiRouter = Router();

apiRouter.use('/auth', authRouter);

// More specific nested paths first, so '/doctors/:id' never swallows '/doctors/:id/slots'.
apiRouter.use('/doctors/:doctorId/slots', doctorSlotsRouter);
apiRouter.use('/doctors', doctorsRouter);
apiRouter.use('/slots', slotsRouter);

apiRouter.use('/appointments/:appointmentId/prescription', prescriptionsRouter);
apiRouter.use('/appointments/:appointmentId/messages', messagesRouter);
apiRouter.use('/appointments', appointmentsRouter);

apiRouter.use('/documents', documentsRouter);
apiRouter.use('/notifications', notificationsRouter);
apiRouter.use('/webrtc', webrtcRouter);
