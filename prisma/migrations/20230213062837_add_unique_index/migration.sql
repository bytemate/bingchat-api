/*
  Warnings:

  - A unique constraint covering the columns `[sessionId,conversationId]` on the table `Conversations` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Conversations_sessionId_conversationId_key" ON "Conversations"("sessionId", "conversationId");
