import { checkConnection, checkWorkerHeartbeat } from './health.repository.js';

export async function checkDatabase() {
  try {
    await checkConnection();
    return true;
  } catch {
    return false;
  }
}

export async function checkServiceReadiness() {
  try {
    await checkConnection();
    const worker = await checkWorkerHeartbeat();
    return { database: true, worker, available: worker };
  } catch {
    return { database: false, worker: false, available: false };
  }
}
