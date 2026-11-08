import type { Request, Response } from 'express';
import { z } from 'zod';
import { sendData } from '../../shared/http/respond';
import { uuidSchema } from '../../shared/http/validation';
import { requireUser } from '../../shared/middleware/authenticate';
import { upsertPrescriptionBodySchema } from './prescriptions.schemas';
import * as prescriptionsService from './prescriptions.service';

const paramsSchema = z.object({ appointmentId: uuidSchema });

export async function upsert(req: Request, res: Response): Promise<void> {
  const { appointmentId } = paramsSchema.parse(req.params);
  const prescription = await prescriptionsService.upsertPrescription(
    requireUser(req),
    appointmentId,
    upsertPrescriptionBodySchema.parse(req.body),
  );
  sendData(res, prescription);
}

export async function get(req: Request, res: Response): Promise<void> {
  const { appointmentId } = paramsSchema.parse(req.params);
  sendData(res, await prescriptionsService.getPrescription(requireUser(req), appointmentId));
}

export async function pdfUrl(req: Request, res: Response): Promise<void> {
  const { appointmentId } = paramsSchema.parse(req.params);
  sendData(res, await prescriptionsService.getPrescriptionPdfLink(requireUser(req), appointmentId));
}
