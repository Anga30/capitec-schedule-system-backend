import { findAvailableDates, findAvailableSlots } from './slots.repository.js';

export function getAvailableSlots(branchId, date) {
  return findAvailableSlots(branchId, date);
}

export function getAvailableDates(branchId) {
  return findAvailableDates(branchId);
}
