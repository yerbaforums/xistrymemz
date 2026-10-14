-- AlterTable
-- Opt-in "travels with me" flag: while the owner is in passport Traveling
-- mode, the listing's effective location follows the owner's current location.
ALTER TABLE "Product" ADD COLUMN "travelsWithOwner" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ServiceOffering" ADD COLUMN "travelsWithOwner" BOOLEAN NOT NULL DEFAULT false;
