import express from 'express';
import cors from 'cors';
import healthRoutes from './modules/health/health.routes.js';
import branchesRoutes from './modules/branches/branches.routes.js';
import departmentsRoutes from './modules/departments/departments.routes.js';
import slotsRoutes from './modules/slots/slots.routes.js';
import bookingsRoutes from './modules/bookings/bookings.routes.js';
import { errorHandler } from './shared/middleware/error-handler.js';
import { bookingRateLimit, publicReadRateLimit } from './shared/middleware/rate-limit.js';
import { attachRequestId } from './shared/middleware/request-id.js';

const app = express();
app.disable('x-powered-by');
app.use(attachRequestId);
// Set TRUST_PROXY only to the number of trusted reverse proxies in production.
app.set('trust proxy', Number(process.env.TRUST_PROXY || 0));
app.use(cors({ origin: process.env.WEB_ORIGIN || 'http://localhost:3000' }));
app.use('/api/branches', publicReadRateLimit);
app.use('/api/departments', publicReadRateLimit);
app.use('/api/slots', publicReadRateLimit);
app.use('/api/bookings', bookingRateLimit);
app.use(express.json({ limit: '20kb' }));
app.use(healthRoutes);
app.use('/api/branches', branchesRoutes);
app.use('/api/departments', departmentsRoutes);
app.use('/api/slots', slotsRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use(errorHandler);

export default app;
