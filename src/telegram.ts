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
  private apiId: number;
  private apiHash: string;

  constructor(options?: { sessionString?: string; apiId?: number; apiHash?: string }) {
    const sessionString = options?.sessionString ?? process.env.TELEGRAM_SESSION ?? '';
    this.apiId = options?.apiId ?? config.TELEGRAM_API_ID;
    this.apiHash = options?.apiHash ?? config.TELEGRAM_API_HASH;
    
    this.session = new StringSession(sessionString);
    
    // Configure optional proxy (SOCKS or MTProto) if enabled
    let proxy: any = undefined;
    
    if (config.TELEGRAM_PROXY_ENABLED) {
      if (config.TELEGRAM_PROXY_MODE === 'mtproto') {
        // MTProto proxy (Telegram-specific)
        if (config.TELEGRAM_MTPROTO_HOST && config.TELEGRAM_MTPROTO_PORT && config.TELEGRAM_MTPROTO_SECRET) {
          proxy = {
            ip: config.TELEGRAM_MTPROTO_HOST,
            port: config.TELEGRAM_MTPROTO_PORT,
            MTProto: true,
            secret: config.TELEGRAM_MTPROTO_SECRET,
          };
          logger.info({ host: config.TELEGRAM_MTPROTO_HOST, port: config.TELEGRAM_MTPROTO_PORT }, 'Using MTProto proxy');
        } else {
          logger.warn('MTProto proxy enabled but missing host/port/secret');
        }
      } else {
        // SOCKS proxy (SOCKS4/5)
        if (config.TELEGRAM_PROXY_HOST && config.TELEGRAM_PROXY_PORT) {
          proxy = {
            ip: config.TELEGRAM_PROXY_HOST,
            port: config.TELEGRAM_PROXY_PORT,
            socksType: (config.TELEGRAM_PROXY_TYPE === 'socks4' ? 4 : 5) as 4 | 5,
            username: config.TELEGRAM_PROXY_USERNAME,
            password: config.TELEGRAM_PROXY_PASSWORD,
          };
          logger.info({ host: config.TELEGRAM_PROXY_HOST, port: config.TELEGRAM_PROXY_PORT, type: config.TELEGRAM_PROXY_TYPE }, 'Using SOCKS proxy');
        } else {
          logger.warn('SOCKS proxy enabled but missing host/port');
        }
      }
    }

    this.client = new TelegramClient(this.session, this.apiId, this.apiHash, {
      connectionRetries: 5,
      proxy,
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
      apiId: this.apiId,
      apiHash: this.apiHash,
      settings: new Api.CodeSettings({})
    }));
    const sessionStr = this.session.save();
    logger.info({ phone }, 'Sent login code');
    return { ...result, session: sessionStr }; // contains phoneCodeHash + temp session
  }

  async signIn(params: { phone?: string; code: string; phoneCodeHash: string }) {
    const phoneNumber = params.phone ?? config.TELEGRAM_PHONE;
      try {
        const me = await this.client.invoke(new Api.auth.SignIn({
          phoneNumber,
          phoneCode: params.code,
          phoneCodeHash: params.phoneCodeHash,
        }));
        const sessionStr = this.session.save();
        return { me, session: sessionStr };
      } catch (e: any) {
        // If two-factor password is required, surface a friendly flag with current session
        if (e?.code === 401 && typeof e?.message === 'string' && e.message.includes('SESSION_PASSWORD_NEEDED')) {
          const sessionStr = this.session.save();
          logger.warn({ phone: phoneNumber }, 'Two-factor password required');
          return { needPassword: true, session: sessionStr } as any;
        }
        throw e;
      }
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
