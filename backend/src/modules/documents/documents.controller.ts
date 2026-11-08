import type { Request, Response } from 'express';
import { sendData, sendNoContent, sendPaginated } from '../../shared/http/respond';
import { idParamSchema } from '../../shared/http/validation';
import { requireUser } from '../../shared/middleware/authenticate';
import {
  listDocumentsQuerySchema,
  registerDocumentBodySchema,
  requestUploadUrlBodySchema,
} from './documents.schemas';
import * as documentsService from './documents.service';

export async function requestUploadUrl(req: Request, res: Response): Promise<void> {
  const ticket = await documentsService.createUploadTicket(
    requireUser(req),
    requestUploadUrlBodySchema.parse(req.body),
  );
  sendData(res, ticket, 201);
}

export async function register(req: Request, res: Response): Promise<void> {
  const document = await documentsService.registerDocument(
    requireUser(req),
    registerDocumentBodySchema.parse(req.body),
  );
  sendData(res, document, 201);
}

export async function list(req: Request, res: Response): Promise<void> {
  const result = await documentsService.listDocuments(
    requireUser(req),
    listDocumentsQuerySchema.parse(req.query),
  );
  sendPaginated(res, result);
}

export async function downloadUrl(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  sendData(res, await documentsService.createDownloadUrl(requireUser(req), id));
}

export async function remove(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  await documentsService.deleteDocument(requireUser(req), id);
  sendNoContent(res);
}
