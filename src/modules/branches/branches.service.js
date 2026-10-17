import { findActiveBranches } from './branches.repository.js';

export function getBranches() {
  return findActiveBranches();
}
