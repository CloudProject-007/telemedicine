import type { Request, Response } from 'express';
import { requireUser } from '../../shared/middleware/authenticate';
import { sendData, sendNoContent } from '../../shared/http/respond';
import { loginBodySchema, refreshBodySchema, registerBodySchema } from './auth.schemas';
import * as authService from './auth.service';

export async function register(req: Request, res: Response): Promise<void> {
  const result = await authService.register(registerBodySchema.parse(req.body));
  sendData(res, result, 201);
}

export async function login(req: Request, res: Response): Promise<void> {
  sendData(res, await authService.login(loginBodySchema.parse(req.body)));
}

export async function refresh(req: Request, res: Response): Promise<void> {
  sendData(res, await authService.refresh(refreshBodySchema.parse(req.body)));
}

export async function logout(req: Request, res: Response): Promise<void> {
  await authService.logout(refreshBodySchema.parse(req.body));
  sendNoContent(res);
}

export async function me(req: Request, res: Response): Promise<void> {
  sendData(res, await authService.getProfile(requireUser(req).id));
}
