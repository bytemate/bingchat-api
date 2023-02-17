import axios from "axios";
export interface ConversationInfo {
  conversationId: string;
  clientId: string;
  conversationSignature: string;
  invocationId: number;
}
export interface BingChatResponse {
  conversationSignature: string;
  conversationId: string;
  clientId: string;
  invocationId: number;
  conversationExpiryTime: Date;
  response: string;
  details: Details;
}

export interface Details {
  text: string;
  author: string;
  createdAt: Date;
  timestamp: Date;
  messageId: string;
  requestId: string;
  offense: string;
  adaptiveCards: AdaptiveCard[];
  sourceAttributions: SourceAttribution[];
  feedback: Feedback;
  contentOrigin: string;
  privacy: null;
  suggestedResponses: SuggestedResponse[];
}

export interface AdaptiveCard {
  type: string;
  version: string;
  body: Body[];
}

export interface Body {
  type: string;
  text: string;
  wrap: boolean;
  size?: string;
}

export interface Feedback {
  tag: null;
  updatedOn: null;
  type: string;
}

export interface SourceAttribution {
  providerDisplayName: string;
  seeMoreUrl: string;
  searchQuery: string;
}

export interface SuggestedResponse {
  text: string;
  author: string;
  createdAt: Date;
  timestamp: Date;
  messageId: string;
  messageType: string;
  offense: string;
  feedback: Feedback;
  contentOrigin: string;
  privacy: null;
}

export async function generateMarkdown(response: BingChatResponse) {
  // change `[^Number^]` to markdown link
  const regex = /\[\^(\d+)\^\]/g;
  const markdown = response.details.text.replace(regex, (match, p1) => {
    const sourceAttribution = response.details.sourceAttributions[Number(p1)-1];
    return `[${sourceAttribution.providerDisplayName}](${sourceAttribution.seeMoreUrl})`;
  });
  return markdown;
}
