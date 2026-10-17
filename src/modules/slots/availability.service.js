import { ensureOpenSlots as ensureOpenSlotsRepository } from './availability.repository.js';

export function ensureOpenSlots() {
  return ensureOpenSlotsRepository();
}
