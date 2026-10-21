import { ensureOpenSlots as ensureOpenSlotsRepository } from '../repositories/availability.repository.js';

export function ensureOpenSlots() {
  return ensureOpenSlotsRepository();
}
