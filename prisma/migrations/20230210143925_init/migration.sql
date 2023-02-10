-- CreateTable
CREATE TABLE "Conversations" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "sessionId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "conversationSignature" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "invocationId" INTEGER NOT NULL,
    "conversationExpiryTime" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Result" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "request" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "conversationsId" TEXT NOT NULL,
    "responseTime" INTEGER NOT NULL DEFAULT 0
);
