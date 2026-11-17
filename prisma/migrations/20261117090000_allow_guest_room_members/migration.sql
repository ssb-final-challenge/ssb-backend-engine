DROP INDEX IF EXISTS "room_members_room_id_user_id_key";
ALTER TABLE "room_members" ALTER COLUMN "user_id" DROP NOT NULL;
