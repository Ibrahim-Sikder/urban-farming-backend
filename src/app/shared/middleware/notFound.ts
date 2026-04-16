import { Request, Response } from 'express';
import { ResponseHandler } from '../utils/response';

export const notFound = (req: Request, res: Response) => {
    ResponseHandler.error(res, `Cannot find ${req.originalUrl} on this server`, 404);
};