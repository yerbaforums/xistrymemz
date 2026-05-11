-- Add volunteer fields to Event
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "needsVolunteers" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "volunteerRoles" TEXT;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "volunteerDescription" TEXT;

-- Add role to EventJoiner
ALTER TABLE "EventJoiner" ADD COLUMN IF NOT EXISTS "role" TEXT NOT NULL DEFAULT 'ATTENDEE';
