import { startServer } from './server';

async function main() {
  // For account mode, server exposes login endpoints; nothing to start here.
  startServer();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
