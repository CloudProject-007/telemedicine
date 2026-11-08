import type { Request, Response } from 'express';
import { sendData, sendPaginated } from '../../shared/http/respond';
import { idParamSchema } from '../../shared/http/validation';
import { requireUser } from '../../shared/middleware/authenticate';
import {
  createDoctorBodySchema,
  listDoctorsQuerySchema,
  updateDoctorProfileBodySchema,
} from './doctors.schemas';
import * as doctorsService from './doctors.service';

export async function list(req: Request, res: Response): Promise<void> {
  sendPaginated(res, await doctorsService.listDoctors(listDoctorsQuerySchema.parse(req.query)));
}

export async function specialties(_req: Request, res: Response): Promise<void> {
  sendData(res, await doctorsService.listSpecialties());
}

export async function getById(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  sendData(res, await doctorsService.getDoctor(id));
}

export async function create(req: Request, res: Response): Promise<void> {
  const doctor = await doctorsService.createDoctor(createDoctorBodySchema.parse(req.body));
  sendData(res, doctor, 201);
}

export async function updateMe(req: Request, res: Response): Promise<void> {
  const doctor = await doctorsService.updateOwnProfile(
    requireUser(req).id,
    updateDoctorProfileBodySchema.parse(req.body),
  );
  sendData(res, doctor);
}
