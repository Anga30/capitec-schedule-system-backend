import rateLimit from 'express-rate-limit';

const windowMs = 15 * 60 * 1000;

function createRateLimit(max, message) {
  return rateLimit({
    windowMs,
    limit: max,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: message },
  });
}

export const publicReadRateLimit = createRateLimit(
  Number(process.env.PUBLIC_READ_RATE_LIMIT_MAX || 300),
  'Too many requests. Please wait before checking availability again.',
);

export const bookingRateLimit = createRateLimit(
  Number(process.env.BOOKING_RATE_LIMIT_MAX || 5),
  'Too many booking attempts. Please wait before trying again.',
);
