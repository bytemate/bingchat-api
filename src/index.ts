import { Prisma, PrismaClient } from "@prisma/client";
// @ts-ignore
import { getConversationInfo } from "./lib";
import express from "express";
let bingAIClient: any;
const prisma = new PrismaClient();
const app = express();

app.use(express.json());
app.get(`/`, async (req, res) => {
  return res.json({
    message: "Hello World",
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
    const reply = await sendMesasge(message);
    return res.json({
      message: reply.response,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      message: "Something went wrong",
      error: `${e}`,
    });
  }
});
interface BingAIClientResponse {
  conversationSignature: string;
  conversationId: string;
  clientId: string;
  invocationId: number;
  conversationExpiryTime: string;
  response: string;
  details: {
    text: string;
    type: string;
  };
}

const getOrCreateConversationInfo = async (sessionId: string) => {
  const conversationInfo = await prisma.conversations.findFirst({
    where: {
      sessionId,
    },
  });
  if (conversationInfo) {
    return conversationInfo;
  }
  const newConversationInfo = await getConversationInfo();
  await prisma.conversations.create({
    data: {
      sessionId,
      conversationExpiryTime: "",
      conversationId: newConversationInfo.conversationId,
      clientId: newConversationInfo.clientId,
      conversationSignature: newConversationInfo.conversationSignature,
      invocationId: 0,
    },
  });
  return newConversationInfo;
};
const sendMesasge = async (message: string, sessionId?: string) => {
  let conversationInfo;
  if (sessionId) {
    conversationInfo = await getOrCreateConversationInfo(sessionId);
  } else {
    conversationInfo = await getConversationInfo();
  }
  const startTime = new Date().getTime();
  const response: BingAIClientResponse = await bingAIClient.sendMessage(
    message,
    {
      conversationId: conversationInfo.conversationId,
      clientId: conversationInfo.clientId,
      conversationSignature: conversationInfo.conversationSignature,
    }
  );
  const endTime = new Date().getTime();
  if (sessionId) {
    await prisma.conversations.create({
      data: {
        sessionId,
        conversationExpiryTime: response.conversationExpiryTime,
        conversationId: conversationInfo.conversationId,
        clientId: response.clientId,
        conversationSignature: response.conversationSignature,
        invocationId: response.invocationId,
      },
    });
  }
  await prisma.result.create({
    data: {
      request: message,
      response: response.response,
      conversationsId: conversationInfo.conversationId,
      responseTime: endTime - startTime,
    },
  });
  return response;
};
app.post(`/message/:sessionId`, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { message } = req.body;
    console.log(`Received message: ${message} for session: ${sessionId}`);
    const response = await sendMesasge(message, sessionId);
    return res.json({
      message: response.response,
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
async function main() {
  // @ts-ignore
  const { BingAIClient } = await import("@waylaidwanderer/chatgpt-api");
  const PORT = process.env.PORT || 3000;
  bingAIClient = new BingAIClient({});
  app.listen(PORT, () => {
    console.log(`🚀 Server ready at: http://:::${PORT}`);
  });
}
main();
