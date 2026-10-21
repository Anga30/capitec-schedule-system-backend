import { findActiveDepartments } from '../repositories/departments.repository.js';

export function getDepartments() {
  return findActiveDepartments();
}
