import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { sendError } from '../utils/response';
import { UserRole } from '../types';

const roleMiddleware = (requiredRole: UserRole) => {
  return (req: Request, res: Response, next: NextFunction): void => {
   
    if (req.user?.role !== requiredRole) {
      sendError(
        res,
        StatusCodes.FORBIDDEN,
        'Access denied. Insufficient permissions.'
      );
      return;
    }
    next();
  };
};

export default roleMiddleware;
