/*
  Warnings:

  - Made the column `fuelType` on table `ServiceTemplate` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "ServiceTemplate" ALTER COLUMN "fuelType" SET NOT NULL;
