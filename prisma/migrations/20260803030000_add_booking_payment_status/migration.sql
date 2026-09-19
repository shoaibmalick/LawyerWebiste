-- AlterEnum
ALTER TYPE "BookingStatus" ADD VALUE 'PENDING_PAYMENT';

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "stripeCheckoutSessionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Booking_stripeCheckoutSessionId_key" ON "Booking"("stripeCheckoutSessionId");
