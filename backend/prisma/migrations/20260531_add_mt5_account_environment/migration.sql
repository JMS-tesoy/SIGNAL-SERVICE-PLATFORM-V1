-- Add explicit demo/live environment classification for MT5 accounts.
CREATE TYPE "MT5AccountEnvironment" AS ENUM ('DEMO', 'LIVE');

ALTER TABLE "MT5Account"
ADD COLUMN "accountEnvironment" "MT5AccountEnvironment" NOT NULL DEFAULT 'DEMO';

CREATE INDEX "MT5Account_accountEnvironment_idx" ON "MT5Account"("accountEnvironment");
