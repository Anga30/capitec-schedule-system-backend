import { checkServiceReadiness } from './health.service.js';

export async function getHealth(req, res) {
  const readiness = await checkServiceReadiness();
  res.status(readiness.available ? 200 : 503).json({
    status: readiness.available ? 'ok' : 'unavailable',
    error: readiness.available ? undefined : 'Our service is temporarily unavailable. Please try again shortly.',
    ticketId: readiness.available ? undefined : req.ticketId,
  });
}
