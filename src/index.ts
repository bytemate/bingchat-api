import "dotenv/config";
import { Prisma, PrismaClient } from "@prisma/client";
import crypto from "crypto";
// @ts-ignore
import { ConversationInfo } from "./lib";
import { uuid } from "uuidv4";
import express from "express";
import { generateMarkdown, BingChatResponse } from "./lib";
import { fastify } from "fastify";
let bingAIClient: any;
const prisma = new PrismaClient();
const app = fastify();
import cors from '@fastify/cors';
function nextTick() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

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
app.get(`/`, async (req, res) => {
  return res.send({
    message: "Hello World",
    info: "BingChat 🎉",
  });
});
app.post(`/message`, async (req, res) => {
  try {
    const { message } = req.body as any;
    console.log(`Received message: ${message}`);
    const reply = await sendMessage(message);
    return res.send({
      response: reply,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).send({
      message: "Something went wrong",
      error: `${e}`,
    });
  }
});

app.post(`/message/:sessionId`, async (req, res) => {
  try {
    const { sessionId } = req.params as any;
    const { message } = req.body as any;
    console.log(`Received message: ${message} for session: ${sessionId}`);
    const response = await sendMessage(message, sessionId);
    return res.send({
      response: response,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).send({
      message: "Something went wrong",
      error: `${e}`,
    });
  }
});
app.delete(`/message/:sessionId`, async (req, res) => {
  try {
    const { sessionId } = req.params as any;
    await prisma.conversations.deleteMany({
      where: {
        sessionId,
      },
    });
    return res.send({
      message: "Deleted",
    });
  } catch (e) {
    console.error(e);
    return res.status(500).send({
      message: "Something went wrong",
      error: `${e}`,
    });
  }
});
//conversation ID
app.get(`/conversation`, async (req, res) => {
  const conversationInfo = await bingAIClient.createNewConversation();
  return res.send(conversationInfo);
})
app.post('/conversation', async (request, reply) => {
  //@ts-ignore
  const body = request.body || {} as any;
  const abortController = new AbortController();

  reply.raw.on('close', () => {
    if (abortController.signal.aborted === false) {
      abortController.abort();
    }
  });

  let onProgress;
  if (body.stream === true) {
    onProgress = (token: any) => {
      if (token !== '[DONE]') {
        reply.sse({ id: '', data: JSON.stringify(token) });
      }
    };
  } else {
    onProgress = null;
  }

  let result;
  let error;
  try {
    if (!body.message) {
      const invalidError = new Error() as any;
      invalidError.data = {
        code: 400,
        message: 'The message parameter is required.',
      };
      // noinspection ExceptionCaughtLocallyJS
      throw invalidError;
    }

    let clientToUseForMessage = "bing";
    const clientOptions = body.clientOptions

    let { shouldGenerateTitle } = body;

    const messageClient = bingAIClient

    result = await messageClient.sendMessage(body.message, {
      jailbreakConversationId: body.jailbreakConversationId,
      conversationId: body.conversationId ? body.conversationId.toString() : undefined,
      parentMessageId: body.parentMessageId ? body.parentMessageId.toString() : undefined,
      conversationSignature: body.conversationSignature,
      clientId: body.clientId,
      invocationId: body.invocationId,
      shouldGenerateTitle, // only used for ChatGPTClient
      toneStyle: body.toneStyle,
      clientOptions,
      onProgress,
      abortController,
    });
  } catch (e) {
    error = e;
  }

  if (result !== undefined) {
    if (body.stream === true) {
      reply.sse({ event: 'result', id: '', data: JSON.stringify(result) });
      reply.sse({ id: '', data: '[DONE]' });
      await nextTick();
      return reply.raw.end();
    }
    return reply.send(result);
  }
  //@ts-ignore
  const code = error?.data?.code || (error.name === 'UnauthorizedRequest' ? 401 : 503);
  if (code === 503) {
    console.error(error);
  }
    //@ts-ignore
  const message = error?.data?.message || error?.message || `There was an error communicating with`;
  if (body.stream === true) {
    reply.sse({
      id: '',
      event: 'error',
      data: JSON.stringify({
        code,
        error: message,
      }),
    });
    await nextTick();
    return reply.raw.end();
  }
  return reply.code(code).send({ error: message });
});
async function main() {
  // @ts-ignore
  const { BingAIClient } = await import("@waylaidwanderer/chatgpt-api");
  const { FastifySSEPlugin } = await import('@waylaidwanderer/fastify-sse-v2');

  const PORT = process.env.PORT || 3000;
  console.log(`Starting server on port: ${PORT}`);
  console.log(
    `Bing AI Client User Token: ${process.env.BING_AI_CLIENT_USER_TOKEN}`
  );
  bingAIClient = new BingAIClient({
    userToken: process.env.BING_AI_CLIENT_USER_TOKEN,
  });
  await app.register(FastifySSEPlugin);
  await app.register(cors, {
    origin: '*',
  });

  app.listen({
    port: Number(PORT),
    host: "::",
  }, () => {
    console.log(`🚀 Server ready at: http://:::${PORT}`);
  });
}
main();
