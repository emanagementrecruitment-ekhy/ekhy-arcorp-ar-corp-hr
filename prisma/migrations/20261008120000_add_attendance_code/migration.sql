-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN "code" TEXT;
ALTER TABLE "Attendance" ADD COLUMN "manual" BOOLEAN NOT NULL DEFAULT false;
