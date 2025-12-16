import express, { Request, Response } from 'express';
import { config } from './config.js';
import { logger } from './logger.js';
import { TelegramService } from './telegram.js';
import type { SendMessageOptions } from './types.js';
import { AccountManager } from './accountManager.js';

type SendCodeBody = { phone?: string; apiId?: number; apiHash?: string };
type VerifyCodeBody = { phone?: string; code: string; phoneCodeHash: string; session?: string; apiId?: number; apiHash?: string };
type PasswordBody = { phone?: string; password: string; session?: string; apiId?: number; apiHash?: string };
type SendMessageBody = { accountId: string; chatId: number; text: string; options?: SendMessageOptions };

const app = express();
app.use(express.json());

export function startServer(accountManager: AccountManager) {
  // Health
  app.get('/health', (_req: Request, res: Response) => res.json({ ok: true }));

  // Login endpoints for user account
  app.post('/login/sendCode', async (req: Request<unknown, unknown, SendCodeBody>, res: Response) => {
    try {
      const { phone, apiId, apiHash } = req.body ?? {};
      const resolvedPhone = phone ?? config.TELEGRAM_PHONE;
      const resolvedApiId = apiId ?? config.TELEGRAM_API_ID;
      const resolvedApiHash = apiHash ?? config.TELEGRAM_API_HASH;

      if (!resolvedPhone) {
        return res.status(400).json({ ok: false, error: 'phone is required' });
      }
      if (!resolvedApiId || !resolvedApiHash) {
        return res.status(400).json({ ok: false, error: 'apiId and apiHash are required' });
      }

      logger.info({ apiId: resolvedApiId, apiHash: resolvedApiHash, phone: resolvedPhone }, 'Creating TelegramService for sendCode');
      const tg = new TelegramService({
        apiId: resolvedApiId,
        apiHash: resolvedApiHash,
      });
      await tg.connect();
      const r = await tg.sendCode(resolvedPhone);
      res.json({ ok: true, data: r });
    } catch (e) {
      logger.error(e);
      res.status(500).json({ ok: false, error: String(e) });
    }
  });
  app.post('/login/verifyCode', async (
    req: Request<unknown, unknown, VerifyCodeBody>,
    res: Response,
  ) => {
    try {
      const { code, phoneCodeHash, phone, session, apiId, apiHash } = req.body;
      const resolvedPhone = phone ?? config.TELEGRAM_PHONE;
      const resolvedApiId = apiId ?? config.TELEGRAM_API_ID;
      const resolvedApiHash = apiHash ?? config.TELEGRAM_API_HASH;

      if (!resolvedPhone) {
        return res.status(400).json({ ok: false, error: 'phone is required' });
      }
      if (!resolvedApiId || !resolvedApiHash) {
        return res.status(400).json({ ok: false, error: 'apiId and apiHash are required' });
      }

      const tg = new TelegramService({
        apiId: resolvedApiId,
        apiHash: resolvedApiHash,
        sessionString: session,
      });
      await tg.connect();
      const r = await tg.signIn({ code, phoneCodeHash, phone: resolvedPhone });

      // If 2FA password is required
      if ((r as any)?.needPassword) {
        return res.json({ ok: false, twoFactorRequired: true, session: (r as any).session });
      }

      const account = await accountManager.addAccount({
        phone: resolvedPhone,
        session: (r as any).session,
        apiId: resolvedApiId,
        apiHash: resolvedApiHash,
      });

      res.json({ ok: true, session: (r as any).session, me: (r as any).me, accountId: account.id });
    } catch (e) {
      logger.error(e);
      res.status(500).json({ ok: false, error: String(e) });
    }
  });

  app.post('/login/password', async (
    req: Request<unknown, unknown, PasswordBody>,
    res: Response,
  ) => {
    try {
      const { password, session, phone, apiId, apiHash } = req.body;
      const resolvedPhone = phone ?? config.TELEGRAM_PHONE;
      const resolvedApiId = apiId ?? config.TELEGRAM_API_ID;
      const resolvedApiHash = apiHash ?? config.TELEGRAM_API_HASH;

      if (!resolvedPhone) {
        return res.status(400).json({ ok: false, error: 'phone is required' });
      }
      if (!resolvedApiId || !resolvedApiHash) {
        return res.status(400).json({ ok: false, error: 'apiId and apiHash are required' });
      }

      const tg = new TelegramService({
        apiId: resolvedApiId,
        apiHash: resolvedApiHash,
        sessionString: session,
      });
      await tg.connect();
      const r = await tg.checkPassword(password);

      const account = await accountManager.addAccount({
        phone: resolvedPhone,
        session: r.session,
        apiId: resolvedApiId,
        apiHash: resolvedApiHash,
      });

      res.json({ ok: true, session: r.session, accountId: account.id });
    } catch (e) {
      logger.error(e);
      res.status(500).json({ ok: false, error: String(e) });
    }
  });

  app.get('/accounts', async (_req: Request, res: Response) => {
    try {
      const accounts = await accountManager.listAccounts();
      res.json({ ok: true, data: accounts });
    } catch (e) {
      logger.error(e);
      res.status(500).json({ ok: false, error: String(e) });
    }
  });

  // Minimal REST to send message
  app.post('/send', async (req: Request<unknown, unknown, SendMessageBody>, res: Response) => {
    try {
      const { accountId, chatId, text, options } = req.body;
      await accountManager.send(accountId, { chatId, text, options });
      res.json({ ok: true });
    } catch (e) {
      logger.error(e);
      res.status(500).json({ ok: false });
    }
  });

  app.listen(config.PORT, () => logger.info(`Server listening on :${config.PORT}`));
}
