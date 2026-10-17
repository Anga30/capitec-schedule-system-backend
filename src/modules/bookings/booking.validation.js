import { isUuid } from '../../shared/validation.js';

export function validateBookingInput(input) {
  const { slotId, departmentId, customerName, customerEmail, isCapitecClient } = input ?? {};
  if (
    !isUuid(slotId) ||
    !isUuid(departmentId) ||
    typeof customerName !== 'string' ||
    typeof customerEmail !== 'string' ||
    typeof isCapitecClient !== 'boolean' ||
    customerName.trim().length < 2 ||
    customerName.trim().length > 100 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail) ||
    customerEmail.length > 254
  ) {
    return null;
  }

  return {
    slotId,
    departmentId,
    customerName: customerName.trim(),
    customerEmail: customerEmail.trim().toLowerCase(),
    isCapitecClient,
  };
}
