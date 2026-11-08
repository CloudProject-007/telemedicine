-- AlterTable
ALTER TABLE "prescriptions" ADD COLUMN     "pdfGeneratedAt" TIMESTAMP(3),
ADD COLUMN     "pdfKey" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "notifyEmail" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notifySms" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "snsEmailSubscriptionArn" TEXT;

-- CreateTable
CREATE TABLE "reminder_logs" (
    "appointmentId" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reminder_logs_pkey" PRIMARY KEY ("appointmentId","kind")
);

-- AddForeignKey
ALTER TABLE "reminder_logs" ADD CONSTRAINT "reminder_logs_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
