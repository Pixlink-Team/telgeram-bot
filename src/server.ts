import express from 'express';
import { config } from './config';
import { logger } from './logger';
import { TelegramService } from './telegram';

const app = express();
app.use(express.json());

const tg = new TelegramService();

// Health
app.get('/health', (_req, res) => res.json({ ok: true }));

// Login endpoints for user account
app.post('/login/sendCode', async (req, res) => {
  try {
    await tg.connect();
    const r = await tg.sendCode(req.body?.phone);
    res.json({ ok: true, data: r });
  } catch (e) {
    logger.error(e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.post('/login/verifyCode', async (req, res) => {
  try {
    const { code, phoneCodeHash, phone } = req.body;
    const r = await tg.signIn({ code, phoneCodeHash, phone });
    res.json({ ok: true, session: r.session, me: r.me });
  } catch (e) {
    logger.error(e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.post('/login/password', async (req, res) => {
  try {
    const { password } = req.body;
    const r = await tg.checkPassword(password);
    res.json({ ok: true, session: r.session });
  } catch (e) {
    logger.error(e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Minimal REST to send message
app.post('/send', async (req, res) => {
  try {
    const { chatId, text, options } = req.body;
    await tg.send({ chatId, text, options });
    res.json({ ok: true });
  } catch (e) {
    logger.error(e);
    res.status(500).json({ ok: false });
  }
});

export function startServer() {
  app.listen(config.PORT, () => logger.info(`Server listening on :${config.PORT}`));
}
