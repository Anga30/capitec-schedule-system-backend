import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const claimNextJob = jest.fn();
const markJobSent = jest.fn();
const retryJob = jest.fn();
const sendBookingConfirmation = jest.fn();

jest.unstable_mockModule('./outbox.repository.js', () => ({ claimNextJob, markJobSent, retryJob }));
jest.unstable_mockModule('./smtp-email.service.js', () => ({ sendBookingConfirmation }));

const { processNextEmailJob } = await import('./outbox.service.js');

describe('processNextEmailJob', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    claimNextJob.mockResolvedValue({ id: 12, payload: { customerEmail: 'alex@example.com' } });
    sendBookingConfirmation.mockResolvedValue(undefined);
    markJobSent.mockResolvedValue(undefined);
    retryJob.mockResolvedValue(undefined);
  });

  it('returns false when no outbox job is available', async () => {
    claimNextJob.mockResolvedValue(null);

    await expect(processNextEmailJob()).resolves.toBe(false);
    expect(sendBookingConfirmation).not.toHaveBeenCalled();
    expect(markJobSent).not.toHaveBeenCalled();
  });

  it('sends the confirmation and marks the job sent', async () => {
    await expect(processNextEmailJob()).resolves.toBe(true);

    expect(sendBookingConfirmation).toHaveBeenCalledWith({ customerEmail: 'alex@example.com' });
    expect(markJobSent).toHaveBeenCalledWith(12);
    expect(retryJob).not.toHaveBeenCalled();
  });

  it('requeues the job when sending fails', async () => {
    sendBookingConfirmation.mockRejectedValue(new Error('SMTP unavailable'));
    const logError = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(processNextEmailJob()).resolves.toBe(true);

    expect(retryJob).toHaveBeenCalledWith(12, 'SMTP unavailable', 8);
    expect(markJobSent).not.toHaveBeenCalled();
    logError.mockRestore();
  });
});
