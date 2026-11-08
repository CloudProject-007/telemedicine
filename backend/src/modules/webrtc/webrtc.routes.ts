import { Router, type Request, type Response } from 'express';
import { Role } from '@prisma/client';
import { sendData } from '../../shared/http/respond';
import { authenticate, requireUser } from '../../shared/middleware/authenticate';
import { authorize } from '../../shared/middleware/authorize';
import { buildIceServers } from './ice-servers';

export const webrtcRouter = Router();

webrtcRouter.use(authenticate, authorize(Role.PATIENT, Role.DOCTOR));

/** ICE (STUN/TURN) configuration for the browser's RTCPeerConnection. */
webrtcRouter.get('/ice-servers', (req: Request, res: Response) => {
  sendData(res, buildIceServers(requireUser(req).id));
});
