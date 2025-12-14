import { startServer } from './server';
import { connectDb } from './db';
import { AccountManager } from './accountManager';

async function main() {
  await connectDb();

  const accountManager = new AccountManager();
  await accountManager.bootstrap();

  // For account mode, server exposes login endpoints; nothing to start here.
  startServer(accountManager);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
