import { randomUUID } from 'node:crypto';

const ticketIdPattern = /^TKT-[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function attachRequestId(req, res, next) {
  const clientTicketId = req.get('X-Request-ID');
  req.ticketId = typeof clientTicketId === 'string' && ticketIdPattern.test(clientTicketId)
    ? clientTicketId.toUpperCase()
    : `TKT-${randomUUID().toUpperCase()}`;
  res.setHeader('X-Request-ID', req.ticketId);
  next();
}
