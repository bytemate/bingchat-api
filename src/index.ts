import "dotenv/config";
import { Prisma, PrismaClient } from "@prisma/client";
import crypto from "crypto";
// @ts-ignore
import { ConversationInfo } from "./lib";
import { uuid } from "uuidv4";
import express from "express";
import { generateMarkdown, BingChatResponse } from "./lib";
let bingAIClient: any;
const prisma = new PrismaClient();
const app = express();
import { Queue } from "async-await-queue";
app.use(express.json());
app.get(`/`, async (req, res) => {
  return res.json({
    message: "Hello World",
    info: "BingChat 🎉",
  });
});
// let {
//   conversationSignature,
//   conversationId,
//   clientId,
//   invocationId = 0,
//   onProgress,
// } = opts;
app.post(`/message`, async (req, res) => {
  try {
    const { message } = req.body;
    console.log(`Received message: ${message}`);
    const reply = await sendMessage(message);
    return res.json({
      response: reply,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      message: "Something went wrong",
      error: `${e}`,
    });
  }
});
const getOrCreateConversationInfo = async (
  sessionId?: string
): Promise<ConversationInfo> => {
  sessionId = sessionId || uuid();
  const conversationInfo = await prisma.conversations.findFirst({
    where: {
      sessionId,
    },
  });
  if (conversationInfo) {
    return conversationInfo;
  }
  const newConversationInfo = await bingAIClient.createNewConversation();
  console.log(`Created new conversation: ${newConversationInfo}`);
  console.log(newConversationInfo);
  await prisma.conversations.create({
    data: {
      sessionId,
      jailbreakConversationId: crypto.randomUUID(),
      conversationExpiryTime: newConversationInfo.conversationExpiryTime,
      conversationId: newConversationInfo.conversationId,
      clientId: newConversationInfo.clientId,
      conversationSignature: newConversationInfo.conversationSignature,
      invocationId: 0,
    },
  });
  return newConversationInfo;
};
const sendMessage = async (message: string, sessionId?: string) => {
  let conversationInfo;
  sessionId = sessionId || uuid();
  conversationInfo = await getOrCreateConversationInfo(sessionId);
  const startTime = new Date().getTime();
  const response: BingChatResponse = await bingAIClient.sendMessage(message, {
    jailbreakConversationId: conversationInfo.jailbreakConversationId ?? true,
    systemMessage: process.env.SYSTEM_PROMPT,
    parentMessageId: conversationInfo.messageId,
    // conversationId: conversationInfo.conversationId,
    // clientId: conversationInfo.clientId,
    // conversationSignature: conversationInfo.conversationSignature,
    // invocationId: conversationInfo.invocationId,
  });
  const endTime = new Date().getTime();
  const responseMarkdown = await generateMarkdown(response);
  console.log(responseMarkdown);
  if (sessionId) {
    await prisma.conversations.upsert({
      where: {
        sessionId_conversationId: {
          sessionId,
          conversationId: conversationInfo.conversationId,
        },
      },
      create: {
        sessionId,
        conversationExpiryTime: response.conversationExpiryTime,
        conversationId: conversationInfo.conversationId,
        jailbreakConversationId: response.jailbreakConversationId,
        messageId: response.messageId,
        clientId: response.clientId,
        conversationSignature: response.conversationSignature,
        invocationId: response.invocationId,
      },
      update: {
        conversationExpiryTime: response.conversationExpiryTime,
        jailbreakConversationId: response.jailbreakConversationId,
        clientId: response.clientId,
        messageId: response.messageId,
        conversationSignature: response.conversationSignature,
        invocationId: response.invocationId,
      },
    });
  }
  await prisma.result.create({
    data: {
      request: message,
      response: responseMarkdown,
      conversationsId: conversationInfo.conversationId,
      responseTime: endTime - startTime,
    },
  });
  return responseMarkdown;
};
app.post(`/message/:sessionId`, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { message } = req.body;
    console.log(`Received message: ${message} for session: ${sessionId}`);
    const response = await sendMessage(message, sessionId);
    return res.json({
      response: response,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      message: "Something went wrong",
      error: `${e}`,
    });
  }
});
app.delete(`/message/:sessionId`, async (req, res) => {
  try {
    const { sessionId } = req.params;
    await prisma.conversations.deleteMany({
      where: {
        sessionId,
      },
    });
    return res.json({
      message: "Deleted",
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      message: "Something went wrong",
      error: `${e}`,
    });
  }
});
//conversation ID
app.get(`/conversation`, async (req, res) => {
  const conversationInfo = await bingAIClient.createNewConversation();
  return res.json(conversationInfo);
})
async function main() {
  // @ts-ignore
  const { BingAIClient } = await import("@waylaidwanderer/chatgpt-api");
  const PORT = process.env.PORT || 3000;
  console.log(`Starting server on port: ${PORT}`);
  console.log(
    `Bing AI Client User Token: ${process.env.BING_AI_CLIENT_USER_TOKEN}`
  );
  bingAIClient = new BingAIClient({
    userToken: process.env.BING_AI_CLIENT_USER_TOKEN,
  });
  app.listen(PORT, () => {
    console.log(`🚀 Server ready at: http://:::${PORT}`);
  });
}
main();
