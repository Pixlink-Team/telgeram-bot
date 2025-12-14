import { logger } from './logger';
import { config } from './config';
import type { OutgoingMessage } from './types';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { Api } from 'telegram';

export class TelegramService {
  private client: TelegramClient;
  private session: StringSession;

  constructor() {
    this.session = new StringSession(process.env.TELEGRAM_SESSION ?? '');
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
    const srp = await this.client.invoke(new Api.auth.CheckPassword({
      password: await this.client.computeCheckPassword(password),
    }));
    const sessionStr = this.session.save();
    return { srp, session: sessionStr };
  }

  async send(message: OutgoingMessage) {
    await this.client.sendMessage(message.chatId, { message: message.text });
  }
}
