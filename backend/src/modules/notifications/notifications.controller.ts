import type { Request, Response } from 'express';
import { sendData } from '../../shared/http/respond';
import { requireUser } from '../../shared/middleware/authenticate';
import { updatePreferencesBodySchema } from './notifications.schemas';
import * as notificationsService from './notifications.service';

export async function get(req: Request, res: Response): Promise<void> {
  sendData(res, await notificationsService.getPreferences(requireUser(req)));
}

export async function update(req: Request, res: Response): Promise<void> {
  const input = updatePreferencesBodySchema.parse(req.body);
  sendData(res, await notificationsService.updatePreferences(requireUser(req), input));
}
