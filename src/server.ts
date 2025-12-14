import express, { Request, Response } from 'express';
import { config } from './config.js';
import { logger } from './logger.js';
import { TelegramService } from './telegram.js';
import type { SendMessageOptions } from './types.js';
import { AccountManager } from './accountManager.js';

type SendCodeBody = { phone?: string };
type VerifyCodeBody = { phone?: string; code: string; phoneCodeHash: string };
type PasswordBody = { password: string };
type SendMessageBody = { accountId: string; chatId: number; text: string; options?: SendMessageOptions };

const app = express();
app.use(express.json());

export function startServer(accountManager: AccountManager) {
  const tg = new TelegramService();

  // Health
  app.get('/health', (_req: Request, res: Response) => res.json({ ok: true }));

  // Login endpoints for user account
  app.post('/login/sendCode', async (req: Request<unknown, unknown, SendCodeBody>, res: Response) => {
    try {
      await tg.connect();
      const r = await tg.sendCode(req.body?.phone);
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
      const { code, phoneCodeHash, phone } = req.body;
      const r = await tg.signIn({ code, phoneCodeHash, phone });

      const account = await accountManager.addAccount({
        phone: phone ?? config.TELEGRAM_PHONE,
        session: r.session,
        apiId: config.TELEGRAM_API_ID,
        apiHash: config.TELEGRAM_API_HASH,
      });

      res.json({ ok: true, session: r.session, me: r.me, accountId: account.id });
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
      const { password } = req.body;
      const r = await tg.checkPassword(password);

      const account = await accountManager.addAccount({
        phone: config.TELEGRAM_PHONE,
        session: r.session,
        apiId: config.TELEGRAM_API_ID,
        apiHash: config.TELEGRAM_API_HASH,
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
