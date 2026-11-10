-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('scheduled', 'active', 'completed');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('pending', 'accepted', 'rejected');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coffee_lots" (
    "id" SERIAL NOT NULL,
    "seller_id" INTEGER NOT NULL,
    "lot_code" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "variety" VARCHAR(100) NOT NULL,
    "origin" VARCHAR(255) NOT NULL,
    "quantity_kg" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coffee_lots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspection_rooms" (
    "id" SERIAL NOT NULL,
    "coffee_lot_id" INTEGER NOT NULL,
    "room_code" VARCHAR(50) NOT NULL,
    "status" "RoomStatus" NOT NULL DEFAULT 'scheduled',
    "scheduled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inspection_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_members" (
    "id" SERIAL NOT NULL,
    "room_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "role" VARCHAR(20) NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspection_requests" (
    "id" SERIAL NOT NULL,
    "room_id" INTEGER NOT NULL,
    "requested_by" INTEGER NOT NULL,
    "request_type" VARCHAR(50) NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'pending',
    "message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inspection_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspections" (
    "id" SERIAL NOT NULL,
    "room_id" INTEGER NOT NULL,
    "captured_by" INTEGER NOT NULL,
    "sample_number" INTEGER NOT NULL,
    "layer" VARCHAR(20) NOT NULL,
    "image_url" VARCHAR(500) NOT NULL,
    "model_version" VARCHAR(50) NOT NULL,
    "quality_score" DECIMAL(5,2) NOT NULL,
    "healthy_percent" DECIMAL(5,2) NOT NULL,
    "damaged_percent" DECIMAL(5,2) NOT NULL,
    "insect_damage_percent" DECIMAL(5,2) NOT NULL,
    "confidence_percent" DECIMAL(5,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inspections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "detections" (
    "id" SERIAL NOT NULL,
    "inspection_id" INTEGER NOT NULL,
    "label" VARCHAR(100) NOT NULL,
    "confidence" DECIMAL(5,4) NOT NULL,
    "x" DECIMAL(8,6) NOT NULL,
    "y" DECIMAL(8,6) NOT NULL,
    "width" DECIMAL(8,6) NOT NULL,
    "height" DECIMAL(8,6) NOT NULL,

    CONSTRAINT "detections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" SERIAL NOT NULL,
    "room_id" INTEGER NOT NULL,
    "generated_by" INTEGER NOT NULL,
    "final_quality_score" DECIMAL(5,2) NOT NULL,
    "summary" TEXT NOT NULL,
    "pdf_url" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "coffee_lots_lot_code_key" ON "coffee_lots"("lot_code");

-- CreateIndex
CREATE UNIQUE INDEX "inspection_rooms_room_code_key" ON "inspection_rooms"("room_code");

-- CreateIndex
CREATE UNIQUE INDEX "room_members_room_id_user_id_key" ON "room_members"("room_id", "user_id");

-- AddForeignKey
ALTER TABLE "coffee_lots" ADD CONSTRAINT "coffee_lots_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_rooms" ADD CONSTRAINT "inspection_rooms_coffee_lot_id_fkey" FOREIGN KEY ("coffee_lot_id") REFERENCES "coffee_lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_members" ADD CONSTRAINT "room_members_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "inspection_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_members" ADD CONSTRAINT "room_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_requests" ADD CONSTRAINT "inspection_requests_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "inspection_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_requests" ADD CONSTRAINT "inspection_requests_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "inspection_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_captured_by_fkey" FOREIGN KEY ("captured_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detections" ADD CONSTRAINT "detections_inspection_id_fkey" FOREIGN KEY ("inspection_id") REFERENCES "inspections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "inspection_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_generated_by_fkey" FOREIGN KEY ("generated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
