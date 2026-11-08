import type { Request, Response } from 'express';
import { sendData, sendPaginated } from '../../shared/http/respond';
import { idParamSchema } from '../../shared/http/validation';
import { requireUser } from '../../shared/middleware/authenticate';
import {
  createAppointmentBodySchema,
  listAppointmentsQuerySchema,
  updateAppointmentStatusBodySchema,
} from './appointments.schemas';
import * as appointmentsService from './appointments.service';

export async function create(req: Request, res: Response): Promise<void> {
  const appointment = await appointmentsService.createAppointment(
    requireUser(req),
    createAppointmentBodySchema.parse(req.body),
  );
  sendData(res, appointment, 201);
}

export async function list(req: Request, res: Response): Promise<void> {
  const result = await appointmentsService.listAppointments(
    requireUser(req),
    listAppointmentsQuerySchema.parse(req.query),
  );
  sendPaginated(res, result);
}

export async function getById(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  sendData(res, await appointmentsService.getAppointment(requireUser(req), id));
}

export async function updateStatus(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  const appointment = await appointmentsService.updateAppointmentStatus(
    requireUser(req),
    id,
    updateAppointmentStatusBodySchema.parse(req.body),
  );
  sendData(res, appointment);
}
