-- CreateEnum
CREATE TYPE "PaymentTiming" AS ENUM ('UPFRONT', 'AFTER_SERVICE');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "paid" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "PaymentSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "timing" "PaymentTiming" NOT NULL DEFAULT 'UPFRONT',

    CONSTRAINT "PaymentSettings_pkey" PRIMARY KEY ("id")
);
