import { pool } from './db/pool.js';
import { ensureOpenSlots } from './modules/slots/availability.repository.js';

try {
  const insertedSlots = await ensureOpenSlots();
  console.log(`Availability refreshed. ${insertedSlots} new slots created.`);
} catch (error) {
  console.error('Availability refresh failed:', error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
