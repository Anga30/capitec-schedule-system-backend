import { getDepartments } from '../services/departments.service.js';

export async function listDepartments(_req, res, next) {
  try {
    res.json(await getDepartments());
  } catch (error) {
    next(error);
  }
}
