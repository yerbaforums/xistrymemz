-- AlterTable
-- Fix deleting followed users: Follow.followed was onDelete SetNull on a
-- NOT NULL column, so Postgres rejected every user.delete for anyone with
-- followers. A follow is meaningless once either endpoint is gone.
ALTER TABLE "Follow" DROP CONSTRAINT "Follow_followedId_fkey";
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followedId_fkey" FOREIGN KEY ("followedId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
