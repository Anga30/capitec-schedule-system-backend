import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const query = jest.fn();
const release = jest.fn();
const connect = jest.fn();
const reserveSlot = jest.fn();
const insertBooking = jest.fn();
const insertConfirmationOutboxEvent = jest.fn();
const findBookingDetails = jest.fn();
const isActiveDepartment = jest.fn();
const checkWorkerHeartbeat = jest.fn();
const client = { query, release };

jest.unstable_mockModule('../../db/pool.js', () => ({ pool: { connect } }));
jest.unstable_mockModule('./bookings.repository.js', () => ({
  reserveSlot,
  insertBooking,
  findBookingDetails,
  insertConfirmationOutboxEvent,
}));
jest.unstable_mockModule('../departments/departments.repository.js', () => ({ isActiveDepartment }));
jest.unstable_mockModule('../health/health.repository.js', () => ({ checkWorkerHeartbeat }));

const { makeBooking } = await import('./bookings.service.js');

const input = {
  slotId: '30000000-0000-4000-8000-000000000001',
  departmentId: '20000000-0000-4000-8000-000000000001',
  customerName: 'Alex Morgan',
  customerEmail: 'alex@example.com',
  isCapitecClient: true,
};

describe('makeBooking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    connect.mockResolvedValue(client);
    query.mockResolvedValue({});
    reserveSlot.mockResolvedValue(true);
    isActiveDepartment.mockResolvedValue(true);
    checkWorkerHeartbeat.mockResolvedValue(true);
    insertBooking.mockResolvedValue({ id: 'booking-1', slotId: input.slotId });
    findBookingDetails.mockResolvedValue({ id: 'booking-1', slotId: input.slotId, customerEmail: input.customerEmail });
    insertConfirmationOutboxEvent.mockResolvedValue(undefined);
  });

  it('commits slot reservation, booking, and confirmation event in one transaction', async () => {
    const booking = await makeBooking(input);

    expect(booking).toEqual({ id: 'booking-1', slotId: input.slotId });
    expect(query.mock.calls).toEqual([[ 'BEGIN' ], [ 'COMMIT' ]]);
    expect(reserveSlot).toHaveBeenCalledWith(client, input.slotId);
    expect(isActiveDepartment).toHaveBeenCalledWith(client, input.departmentId);
    expect(insertBooking).toHaveBeenCalledWith(client, input);
    expect(findBookingDetails).toHaveBeenCalledWith(client, 'booking-1');
    expect(insertConfirmationOutboxEvent).toHaveBeenCalledWith(client, { id: 'booking-1', slotId: input.slotId, customerEmail: input.customerEmail });
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('rolls back and returns a conflict when the slot is no longer available', async () => {
    reserveSlot.mockResolvedValue(false);

    await expect(makeBooking(input)).rejects.toMatchObject({
      status: 409,
      message: 'That slot is no longer available. Please choose another time.',
    });

    expect(query.mock.calls).toEqual([[ 'BEGIN' ], [ 'ROLLBACK' ]]);
    expect(insertBooking).not.toHaveBeenCalled();
    expect(insertConfirmationOutboxEvent).not.toHaveBeenCalled();
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('rejects departments that are inactive or missing', async () => {
    isActiveDepartment.mockResolvedValue(false);

    await expect(makeBooking(input)).rejects.toMatchObject({
      status: 400,
      message: 'Choose an available department.',
    });

    expect(query.mock.calls).toEqual([[ 'BEGIN' ], [ 'ROLLBACK' ]]);
    expect(reserveSlot).not.toHaveBeenCalled();
    expect(insertBooking).not.toHaveBeenCalled();
  });

  it('rolls back and rethrows when creating the booking fails', async () => {
    const failure = new Error('database insert failed');
    insertBooking.mockRejectedValue(failure);

    await expect(makeBooking(input)).rejects.toBe(failure);

    expect(query.mock.calls).toEqual([[ 'BEGIN' ], [ 'ROLLBACK' ]]);
    expect(insertConfirmationOutboxEvent).not.toHaveBeenCalled();
    expect(release).toHaveBeenCalledTimes(1);
  });
});
