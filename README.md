# Telegram Bot API (Node + Telegraf)

A minimal project mirroring the WhatsApp bot API structure, but for Telegram USER ACCOUNT (MTProto), not a bot.

## Features
- MTProto user account via GramJS
- Express HTTP server with `/health`, login endpoints, and `/send`
- Session string support to persist login

## Setup
1. Copy `.env.example` to `.env` and set `TELEGRAM_API_ID`, `TELEGRAM_API_HASH`, `TELEGRAM_PHONE`.
2. Install dependencies.
3. Run in dev mode.

### Using a proxy (Iran / restricted networks)
If your network blocks Telegram, you can use either **SOCKS** or **MTProto** proxy:

#### Option 1: SOCKS proxy (v2ray, Clash, Outline, etc.)
```
TELEGRAM_PROXY_ENABLED=true
TELEGRAM_PROXY_MODE=socks
TELEGRAM_PROXY_HOST=127.0.0.1
TELEGRAM_PROXY_PORT=1080
TELEGRAM_PROXY_TYPE=socks5      # or socks4
TELEGRAM_PROXY_USERNAME=        # optional
TELEGRAM_PROXY_PASSWORD=        # optional
```

#### Option 2: MTProto proxy (Telegram-specific)
```
TELEGRAM_PROXY_ENABLED=true
TELEGRAM_PROXY_MODE=mtproto
TELEGRAM_MTPROTO_HOST=example.com
TELEGRAM_MTPROTO_PORT=443
TELEGRAM_MTPROTO_SECRET=ee1234567890abcdef...  # hex secret from proxy
```

These settings are picked up automatically by the MTProto client.

## Try it
```fish
# from telegram-bot-api folder
pnpm install
pnpm dev
```

Login flow (once per environment):
```fish
# send login code to your phone
curl -X POST http://localhost:8081/login/sendCode \
  -H "Content-Type: application/json" \
  -d '{"phone": "+989123456789"}'

# verify code (replace CODE and PHONE_CODE_HASH from previous response)
curl -X POST http://localhost:8081/login/verifyCode \
  -H "Content-Type: application/json" \
  -d '{"phone": "+989123456789", "code": "12345", "phoneCodeHash": "HASH"}'

# if account has 2FA password, verify it
curl -X POST http://localhost:8081/login/password \
  -H "Content-Type: application/json" \
  -d '{"password": "YOUR_PASSWORD"}'

# Save the returned session string (TELEGRAM_SESSION) into your .env to auto-login next time.
```

Send a message (after login):
```fish
curl -X POST http://localhost:8081/send \
  -H "Content-Type: application/json" \
  -d '{"chatId": "@username_or_numeric_id", "text": "Hello from account"}'
```
