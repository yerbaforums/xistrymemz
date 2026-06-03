-- AlterTable: Add backup configuration fields to PlatformSettings
ALTER TABLE "PlatformSettings" ADD COLUMN "enableAutoBackup" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PlatformSettings" ADD COLUMN "backupIntervalHours" INTEGER NOT NULL DEFAULT 24;
ALTER TABLE "PlatformSettings" ADD COLUMN "backupRetentionCount" INTEGER NOT NULL DEFAULT 7;
ALTER TABLE "PlatformSettings" ADD COLUMN "lastBackupAt" TIMESTAMP(3);
ALTER TABLE "PlatformSettings" ADD COLUMN "ipfsGatewayUrl" TEXT DEFAULT 'https://ipfs.io/ipfs/';
