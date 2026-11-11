ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;
ALTER TABLE "users" ADD COLUMN "apple_user_id" VARCHAR(255);
CREATE UNIQUE INDEX "users_apple_user_id_key" ON "users"("apple_user_id");
