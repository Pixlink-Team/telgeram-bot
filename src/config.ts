import dotenv from 'dotenv';
dotenv.config();

export const config = {
  PORT: Number(process.env.PORT ?? 8081),
  MONGODB_URI: process.env.MONGODB_URI ?? 'mongodb://localhost:27017/telegram-bot-api',
  // MTProto (user account)
  TELEGRAM_API_ID: Number(process.env.TELEGRAM_API_ID ?? 0),
  TELEGRAM_API_HASH: process.env.TELEGRAM_API_HASH ?? '',
  TELEGRAM_PHONE: process.env.TELEGRAM_PHONE ?? '', // in E.164 format, e.g., +98912...
  // Optional SOCKS proxy for restricted networks
  TELEGRAM_PROXY_ENABLED: (process.env.TELEGRAM_PROXY_ENABLED ?? '').toLowerCase() === 'true',
  TELEGRAM_PROXY_HOST: process.env.TELEGRAM_PROXY_HOST ?? '',
  TELEGRAM_PROXY_PORT: Number(process.env.TELEGRAM_PROXY_PORT ?? 0),
  TELEGRAM_PROXY_TYPE: (process.env.TELEGRAM_PROXY_TYPE ?? 'socks5').toLowerCase() as 'socks4' | 'socks5',
  TELEGRAM_PROXY_USERNAME: process.env.TELEGRAM_PROXY_USERNAME ?? undefined,
  TELEGRAM_PROXY_PASSWORD: process.env.TELEGRAM_PROXY_PASSWORD ?? undefined,
};
if (!config.TELEGRAM_API_ID || !config.TELEGRAM_API_HASH) {
  console.warn('[config] TELEGRAM_API_ID/TELEGRAM_API_HASH are not set. Set them in .env');
}
