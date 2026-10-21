import app from './app.js';
import { pool } from './db/pool.js';
import { ensureOpenSlots } from './modules/slots/services/availability.service.js';

const port = Number(process.env.API_PORT || 4000);
const refreshInterval = 24 * 60 * 60 * 1000;
let refreshTimer;

const createdSlots = await ensureOpenSlots();
console.log(`Availability window ready; added ${createdSlots} slots`);
const server = app.listen(port, () => console.log(`Booking API listening on ${port}`));

function scheduleAvailabilityRefresh(delay = refreshInterval) {
  refreshTimer = setTimeout(async () => {
    let retryDelay = refreshInterval;
    try {
      const addedSlots = await ensureOpenSlots();
      console.log(`Availability window refreshed; added ${addedSlots} slots`);
    } catch (error) {
      console.error('Availability window refresh failed:', error);
      retryDelay = 60 * 1000;
    } finally {
      scheduleAvailabilityRefresh(retryDelay);
    }
  }, delay);
}

scheduleAvailabilityRefresh();

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    clearTimeout(refreshTimer);
    server.close(async () => {
    await pool.end();
    process.exit(0);
    });
  });
}
