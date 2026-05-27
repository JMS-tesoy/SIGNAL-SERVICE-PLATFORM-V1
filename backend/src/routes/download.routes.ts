// =============================================================================
// DOWNLOAD ROUTES - Authenticated File Downloads
// =============================================================================

import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { authenticate } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import { authRepository } from '../database/repositories/index.js';

const router = Router();

// Railway deploys the backend service from the backend directory, so production
// downloads must live inside the backend deploy context.
const DOWNLOAD_DIRS = [
  process.env.DOWNLOADS_DIR,
  path.resolve(process.cwd(), 'downloads'),
  path.resolve(process.cwd(), '..', "EA's"),
].filter(Boolean) as string[];

// Available files for download
const AVAILABLE_FILES = {
  'signal-receiver-ea': {
    filename: 'SignalReceiverEA.ex5',
    displayName: 'Signal Receiver EA',
    description: 'Expert Advisor for receiving trading signals in MetaTrader 5',
    requiresPaidSubscription: false,
  },
  'signal-sender-ea': {
    filename: 'SignalSenderEA.ex5',
    displayName: 'Signal Sender EA',
    description: 'Expert Advisor for sending trading signals from MetaTrader 5',
    requiresPaidSubscription: true,
  },
} as const;

async function hasActivePaidSubscription(userId: string) {
  const subscription = await authRepository.findActiveSubscriptionByUserId(userId);

  if (!subscription || subscription.status !== 'ACTIVE') {
    return false;
  }

  if (subscription.currentPeriodEnd < new Date()) {
    return false;
  }

  return subscription.tier.name !== 'free';
}

// =============================================================================
// GET AVAILABLE DOWNLOADS
// =============================================================================

router.get('/', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const userHasPaidSubscription = req.user
    ? await hasActivePaidSubscription(req.user.id)
    : false;

  const downloads = Object.entries(AVAILABLE_FILES)
    .filter(([, file]) => !file.requiresPaidSubscription || userHasPaidSubscription)
    .map(([id, file]) => ({
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

  if (fileInfo.requiresPaidSubscription) {
    const userHasPaidSubscription = req.user
      ? await hasActivePaidSubscription(req.user.id)
      : false;

    if (!userHasPaidSubscription) {
      return res.status(403).json({
        error: 'An active paid subscription is required to download this file',
      });
    }
  }

  const filePath = DOWNLOAD_DIRS
    .map((dir) => path.join(dir, fileInfo.filename))
    .find((candidatePath) => fs.existsSync(candidatePath));

  // Check if file exists
  if (!filePath) {
    console.error(
      `Download file not found: ${fileInfo.filename}. Checked: ${DOWNLOAD_DIRS.join(', ')}`
    );
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
