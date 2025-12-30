// =============================================================================
// REQUEST LOGGER MIDDLEWARE
// =============================================================================

import { Request, Response, NextFunction } from 'express';

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent')?.substring(0, 50),
    };

    // Color-coded logging based on status
    if (res.statusCode >= 500) {
      console.error('🔴', JSON.stringify(logData));
    } else if (res.statusCode >= 400) {
      console.warn('🟡', JSON.stringify(logData));
    } else {
      console.log('🟢', JSON.stringify(logData));
    }
  });

  next();
}
