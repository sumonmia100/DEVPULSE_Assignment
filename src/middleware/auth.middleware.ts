import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { StatusCodes } from 'http-status-codes';
import { sendError } from '../utils/response';
import { UserPayload } from '../types';

const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const token = req.headers['authorization'];

  // No token provided
  if (!token) {
    sendError(res, StatusCodes.UNAUTHORIZED, 'Access denied. No token provided.');
    return;
  }

  try {
    // Verify and decode token
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as UserPayload;
    req.user = decoded;
    next();
  } catch {
    sendError(res, StatusCodes.UNAUTHORIZED, 'Invalid or expired token.');
  }
};

export default authMiddleware;
