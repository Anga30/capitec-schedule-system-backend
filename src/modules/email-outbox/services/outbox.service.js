import { claimNextJob, markJobSent, retryJob } from '../repositories/outbox.repository.js';
import { sendBookingConfirmation } from './smtp-email.service.js';

const maxAttempts = Number(process.env.EMAIL_MAX_ATTEMPTS || 8);

export async function processNextEmailJob() {
  const job = await claimNextJob(maxAttempts);
  if (!job) return false;

  try {
    await sendBookingConfirmation(job.payload);
    await markJobSent(job.id);
  } catch (error) {
    console.error(`Email job ${job.id} failed:`, error.message);
    await retryJob(job.id, error.message, maxAttempts);
  }
  return true;
}
