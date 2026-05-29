-- CreateEnum
CREATE TYPE "MT5AccountStatus" AS ENUM ('ACTIVE', 'BLOCKED', 'REVOKED', 'EXPIRED', 'PENDING');

-- CreateEnum
CREATE TYPE "MT5EaType" AS ENUM ('SENDER', 'RECEIVER');

-- CreateEnum
CREATE TYPE "MT5SessionStatus" AS ENUM ('ACTIVE', 'STALE', 'REVOKED', 'BLOCKED');

-- AlterTable
ALTER TABLE "MT5Account" ADD COLUMN     "allowSignalReceive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "allowSignalSend" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "allowedMasterAccountId" TEXT,
ADD COLUMN     "apiKeyLastUsedAt" TIMESTAMP(3),
ADD COLUMN     "apiKeyPrefix" TEXT,
ADD COLUMN     "apiKeyRevokedAt" TIMESTAMP(3),
ADD COLUMN     "maxDevices" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "minEaVersion" TEXT NOT NULL DEFAULT '1.0.0',
ADD COLUMN     "status" "MT5AccountStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE "MT5LicenseSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mt5AccountId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "broker" TEXT,
    "server" TEXT,
    "terminalFingerprint" TEXT NOT NULL,
    "deviceId" TEXT,
    "terminalId" TEXT,
    "ipAddress" TEXT,
    "eaType" "MT5EaType" NOT NULL,
    "eaVersion" TEXT NOT NULL,
    "status" "MT5SessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3),
    "lastHeartbeatAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MT5LicenseSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MT5LicenseSession_userId_idx" ON "MT5LicenseSession"("userId");

-- CreateIndex
CREATE INDEX "MT5LicenseSession_mt5AccountId_idx" ON "MT5LicenseSession"("mt5AccountId");

-- CreateIndex
CREATE INDEX "MT5LicenseSession_terminalFingerprint_idx" ON "MT5LicenseSession"("terminalFingerprint");

-- CreateIndex
CREATE INDEX "MT5LicenseSession_status_idx" ON "MT5LicenseSession"("status");

-- CreateIndex
CREATE INDEX "MT5LicenseSession_eaType_idx" ON "MT5LicenseSession"("eaType");

-- CreateIndex
CREATE UNIQUE INDEX "MT5LicenseSession_mt5AccountId_eaType_terminalFingerprint_key" ON "MT5LicenseSession"("mt5AccountId", "eaType", "terminalFingerprint");

-- CreateIndex
CREATE INDEX "MT5Account_apiKeyPrefix_idx" ON "MT5Account"("apiKeyPrefix");

-- CreateIndex
CREATE INDEX "MT5Account_status_idx" ON "MT5Account"("status");

-- CreateIndex
CREATE INDEX "MT5Account_allowedMasterAccountId_idx" ON "MT5Account"("allowedMasterAccountId");

-- CreateIndex
CREATE INDEX "SignalExecution_mt5AccountId_idx" ON "SignalExecution"("mt5AccountId");

-- AddForeignKey
ALTER TABLE "MT5Account" ADD CONSTRAINT "MT5Account_allowedMasterAccountId_fkey" FOREIGN KEY ("allowedMasterAccountId") REFERENCES "MT5Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MT5LicenseSession" ADD CONSTRAINT "MT5LicenseSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MT5LicenseSession" ADD CONSTRAINT "MT5LicenseSession_mt5AccountId_fkey" FOREIGN KEY ("mt5AccountId") REFERENCES "MT5Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

