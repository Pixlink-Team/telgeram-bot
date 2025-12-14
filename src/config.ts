import dotenv from 'dotenv';
dotenv.config();

export const config = {
  PORT: Number(process.env.PORT ?? 8081),
  // MTProto (user account)
  TELEGRAM_API_ID: Number(process.env.TELEGRAM_API_ID ?? 0),
  TELEGRAM_API_HASH: process.env.TELEGRAM_API_HASH ?? '',
  TELEGRAM_PHONE: process.env.TELEGRAM_PHONE ?? '', // in E.164 format, e.g., +98912...
};
if (!config.TELEGRAM_API_ID || !config.TELEGRAM_API_HASH) {
  console.warn('[config] TELEGRAM_API_ID/TELEGRAM_API_HASH are not set. Set them in .env');
}
