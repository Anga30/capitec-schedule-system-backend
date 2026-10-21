import { findActiveBranches } from '../repositories/branches.repository.js';

export function getBranches() {
  return findActiveBranches();
}
