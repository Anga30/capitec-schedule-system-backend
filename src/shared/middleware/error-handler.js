export function errorHandler(error, req, res, _next) {
  const status = error.status ?? 500;
  console.error(`Request failed [${req.ticketId}]:`, error.message);
  res.status(status).json({
    error: status >= 500 ? 'Something went wrong. Please try again.' : error.message,
    ...(status >= 500 && { ticketId: req.ticketId }),
  });
}
