import { logger } from './logger.js';
import { config } from './config.js';
import type { OutgoingMessage } from './types.js';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import { Api } from 'telegram';
import { computeCheck } from 'telegram/Password.js';
import { NewMessage } from 'telegram/events/index.js';

export class TelegramService {
  private client: TelegramClient;
  private session: StringSession;

  constructor(sessionString?: string) {
    this.session = new StringSession(sessionString ?? process.env.TELEGRAM_SESSION ?? '');
    this.client = new TelegramClient(this.session, config.TELEGRAM_API_ID, config.TELEGRAM_API_HASH, {
      connectionRetries: 5,
    });
  }

  async connect() {
    await this.client.connect();
    logger.info('Telegram MTProto client connected');
  }

  async isAuthorized(): Promise<boolean> {
    return this.client.isUserAuthorized();
  }

  async sendCode(phone: string = config.TELEGRAM_PHONE) {
    const result = await this.client.invoke(new Api.auth.SendCode({
      phoneNumber: phone,
      settings: new Api.CodeSettings({})
    }));
    logger.info({ phone }, 'Sent login code');
    return result; // contains phoneCodeHash
  }

  async signIn(params: { phone?: string; code: string; phoneCodeHash: string }) {
    const phoneNumber = params.phone ?? config.TELEGRAM_PHONE;
    const me = await this.client.invoke(new Api.auth.SignIn({
      phoneNumber,
      phoneCode: params.code,
      phoneCodeHash: params.phoneCodeHash,
    }));
    // persist session
    const sessionStr = this.session.save();
    return { me, session: sessionStr };
  }

  async checkPassword(password: string) {
    const pwd = await this.client.invoke(new Api.account.GetPassword());
    const passwordSrp = await computeCheck(pwd, password);

    await this.client.invoke(new Api.auth.CheckPassword({ password: passwordSrp }));

    const sessionStr = this.session.save();
    return { session: sessionStr };
  }

  async send(message: OutgoingMessage) {
    await this.client.sendMessage(message.chatId, { message: message.text });
  }

  async startListening(onMessage: (payload: {
    chatId: string;
    messageId: number;
    text?: string;
    fromId?: string;
    date: Date;
    raw: any;
  }) => Promise<void>) {
    this.client.addEventHandler(async (event) => {
      const msg = event.message;
      if (!msg) return;

      await onMessage({
        chatId: String(msg.chatId),
        messageId: msg.id,
        text: msg.message,
        fromId: msg.senderId ? String(msg.senderId) : undefined,
        date: msg.date ? new Date(msg.date * 1000) : new Date(),
        raw: typeof (msg as any)?.toJSON === 'function' ? (msg as any).toJSON() : msg,
      });
    }, new NewMessage({}));
  }
}
