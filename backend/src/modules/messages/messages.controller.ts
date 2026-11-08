import type { Request, Response } from 'express';
import { z } from 'zod';
import { sendData } from '../../shared/http/respond';
import { uuidSchema } from '../../shared/http/validation';
import { requireUser } from '../../shared/middleware/authenticate';
import { listMessagesQuerySchema } from './messages.schemas';
import * as messagesService from './messages.service';

const paramsSchema = z.object({ appointmentId: uuidSchema });

export async function list(req: Request, res: Response): Promise<void> {
  const { appointmentId } = paramsSchema.parse(req.params);
  const page = await messagesService.listMessages(
    requireUser(req),
    appointmentId,
    listMessagesQuerySchema.parse(req.query),
  );
  sendData(res, page);
}
