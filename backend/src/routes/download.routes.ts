// =============================================================================
// DOWNLOAD ROUTES - Authenticated File Downloads
// =============================================================================

import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { authenticate } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/error.middleware.js';

const router = Router();

// Define downloads directory (relative to backend folder)
const DOWNLOADS_DIR = path.resolve(process.cwd(), '..', "EA's");

// Available files for download
const AVAILABLE_FILES = {
  'signal-receiver-ea': {
    filename: 'SignalReceiverEA.ex5',
    displayName: 'Signal Receiver EA',
    description: 'Expert Advisor for receiving trading signals in MetaTrader 5',
  },
} as const;

// =============================================================================
// GET AVAILABLE DOWNLOADS
// =============================================================================

router.get('/', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const downloads = Object.entries(AVAILABLE_FILES).map(([id, file]) => ({
    id,
    name: file.displayName,
    description: file.description,
    filename: file.filename,
  }));

  res.json({ downloads });
}));

// =============================================================================
// DOWNLOAD FILE
// =============================================================================

router.get('/:fileId', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const { fileId } = req.params;

  const fileInfo = AVAILABLE_FILES[fileId as keyof typeof AVAILABLE_FILES];

  if (!fileInfo) {
    return res.status(404).json({ error: 'File not found' });
  }

  const filePath = path.join(DOWNLOADS_DIR, fileInfo.filename);

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    console.error(`Download file not found: ${filePath}`);
    return res.status(404).json({ error: 'File not available' });
  }

  // Get file stats
  const stats = fs.statSync(filePath);

  // Set headers for download
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${fileInfo.filename}"`);
  res.setHeader('Content-Length', stats.size);

  // Stream the file
  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);
}));

export default router;
