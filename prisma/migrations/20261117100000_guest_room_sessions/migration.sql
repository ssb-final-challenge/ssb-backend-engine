ALTER TABLE "room_members" ADD COLUMN "display_name" VARCHAR(100);
ALTER TABLE "room_members" ADD COLUMN "guest_session_id" VARCHAR(100);
CREATE UNIQUE INDEX "room_members_guest_session_id_key" ON "room_members"("guest_session_id");
