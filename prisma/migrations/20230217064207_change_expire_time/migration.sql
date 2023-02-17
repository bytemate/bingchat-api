/*
  Warnings:

  - The `conversationExpiryTime` column on the `Conversations` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Conversations" DROP COLUMN "conversationExpiryTime",
ADD COLUMN     "conversationExpiryTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
