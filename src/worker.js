import { pool } from './db/pool.js';
import { processNextEmailJob } from './modules/email-outbox/outbox.service.js';

const interval = Number(process.env.POLL_INTERVAL_MS || 2000);
const heartbeatInterval = Number(process.env.WORKER_HEARTBEAT_INTERVAL_MS || 5000);
let stopping = false;

console.log('Email outbox worker started');
async function writeHeartbeat() {
  await pool.query(`
    INSERT INTO worker_heartbeat (id, heartbeat_at)
    VALUES (true, now())
    ON CONFLICT (id) DO UPDATE SET heartbeat_at = EXCLUDED.heartbeat_at
  `);
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => { stopping = true; });
}

try {
  await writeHeartbeat();
} catch (error) {
  console.error('Worker could not write its startup heartbeat:', error);
  await pool.end();
  process.exitCode = 1;
  process.exit();
}

const heartbeatTimer = setInterval(() => {
  writeHeartbeat().catch((error) => console.error('Worker heartbeat failed:', error));
}, heartbeatInterval);

while (!stopping) {
  try {
    if (!await processNextEmailJob()) {
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
  } catch (error) {
    console.error('Worker iteration failed:', error);
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}

clearInterval(heartbeatTimer);
await pool.end();
