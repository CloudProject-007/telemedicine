import type { Request, Response } from 'express';
import { z } from 'zod';
import { sendData, sendNoContent } from '../../shared/http/respond';
import { idParamSchema, uuidSchema } from '../../shared/http/validation';
import { requireUser } from '../../shared/middleware/authenticate';
import { createSlotsBodySchema, listSlotsQuerySchema } from './slots.schemas';
import * as slotsService from './slots.service';

const doctorIdParamSchema = z.object({ doctorId: uuidSchema });

export async function listForDoctor(req: Request, res: Response): Promise<void> {
  const { doctorId } = doctorIdParamSchema.parse(req.params);
  sendData(
    res,
    await slotsService.listDoctorSlots(doctorId, listSlotsQuerySchema.parse(req.query)),
  );
}

export async function create(req: Request, res: Response): Promise<void> {
  const slots = await slotsService.createSlots(
    requireUser(req).id,
    createSlotsBodySchema.parse(req.body),
  );
  sendData(res, slots, 201);
}

export async function remove(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  await slotsService.deleteSlot(requireUser(req).id, id);
  sendNoContent(res);
}
