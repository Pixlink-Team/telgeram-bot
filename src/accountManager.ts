import { AccountModel, AccountDocument } from './models/account';
import { MessageModel } from './models/message';
import { TelegramService } from './telegram';
import type { OutgoingMessage } from './types';
import { logger } from './logger';

export interface AccountInput {
  phone: string;
  session: string;
  apiId: number;
  apiHash: string;
}

export class AccountManager {
  private clients = new Map<string, TelegramService>();

  async bootstrap() {
    const accounts = await AccountModel.find();
    for (const account of accounts) {
      await this.startAccount(account as AccountDocument);
    }
  }

  async addAccount(input: AccountInput) {
    const account = await AccountModel.findOneAndUpdate(
      { phone: input.phone },
      { $set: { session: input.session, apiId: input.apiId, apiHash: input.apiHash } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    await this.startAccount(account);
    return account;
  }

  async send(accountId: string, message: OutgoingMessage) {
    const client = await this.ensureClient(accountId);
    if (!client) throw new Error('Account not found');

    await client.send(message);
  }

  async listAccounts() {
    return AccountModel.find().lean();
  }

  private async ensureClient(accountId: string) {
    if (this.clients.has(accountId)) return this.clients.get(accountId)!;
    const account = await AccountModel.findById(accountId);
    if (!account) return null;
    return this.startAccount(account);
  }

  private async startAccount(account: AccountDocument) {
    if (this.clients.has(account.id)) return this.clients.get(account.id)!;

    const tg = new TelegramService(account.session);
    await tg.connect();
    await tg.startListening(async (payload) => {
      await MessageModel.findOneAndUpdate(
        { account: account._id, chatId: payload.chatId, messageId: payload.messageId },
        {
          $set: {
            account: account._id,
            chatId: payload.chatId,
            messageId: payload.messageId,
            text: payload.text,
            fromId: payload.fromId,
            date: payload.date,
            raw: payload.raw,
          },
        },
        { upsert: true, new: true },
      );
    });

    this.clients.set(account.id, tg);
    logger.info({ phone: account.phone, accountId: account.id }, 'Account connected and listening');
    return tg;
  }
}
