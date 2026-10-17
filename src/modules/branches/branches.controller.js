import { getBranches } from './branches.service.js';

export async function listBranches(_req, res, next) {
  try {
    res.json(await getBranches());
  } catch (error) {
    next(error);
  }
}
