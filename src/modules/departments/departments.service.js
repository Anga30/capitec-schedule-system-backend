import { findActiveDepartments } from './departments.repository.js';

export function getDepartments() {
  return findActiveDepartments();
}
