export type ChatId = number;

export interface AccountConfig {
  token: string;
  webhookUrl?: string; // optional if using webhook
}

export interface SendMessageOptions {
  parseMode?: 'MarkdownV2' | 'HTML' | undefined;
  disableWebPagePreview?: boolean;
}

export interface OutgoingMessage {
  chatId: ChatId;
  text: string;
  options?: SendMessageOptions;
}

export interface IncomingMessage {
  chatId: ChatId;
  messageId: number;
  text?: string;
  from?: {
    id: number;
    username?: string;
    first_name?: string;
    last_name?: string;
  };
}
