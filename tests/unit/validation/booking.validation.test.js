import { describe, expect, it } from '@jest/globals';
import { validateBookingInput } from '../../../src/modules/bookings/validation/booking.validation.js';

const validInput = {
  slotId: '30000000-0000-4000-8000-000000000001',
  departmentId: '20000000-0000-4000-8000-000000000001',
  customerName: 'Alex Morgan',
  customerEmail: 'alex@example.com',
  isCapitecClient: true,
};

describe('validateBookingInput', () => {
  it('accepts and normalizes a booking including the client answer', () => {
    expect(validateBookingInput({ ...validInput, customerEmail: 'ALEX@EXAMPLE.COM' })).toEqual({
      ...validInput,
      customerEmail: 'alex@example.com',
    });
  });

  it('accepts an explicit no answer', () => {
    expect(validateBookingInput({ ...validInput, isCapitecClient: false })?.isCapitecClient).toBe(false);
  });

  it('rejects a missing or non-boolean client answer', () => {
    expect(validateBookingInput({ ...validInput, isCapitecClient: undefined })).toBeNull();
    expect(validateBookingInput({ ...validInput, isCapitecClient: 'yes' })).toBeNull();
  });

  it('requires a valid department id', () => {
    expect(validateBookingInput({ ...validInput, departmentId: undefined })).toBeNull();
    expect(validateBookingInput({ ...validInput, departmentId: 'not-a-uuid' })).toBeNull();
  });

  it('requires a valid slot id', () => {
    expect(validateBookingInput({ ...validInput, slotId: 'not-a-uuid' })).toBeNull();
  });
});
