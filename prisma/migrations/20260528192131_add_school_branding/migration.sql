/*
  Warnings:

  - Added the required column `updatedAt` to the `School` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "School" ADD COLUMN     "accentColor" TEXT DEFAULT '#FF3D5E',
ADD COLUMN     "bannerUrl" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();
