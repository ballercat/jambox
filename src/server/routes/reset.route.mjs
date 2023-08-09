// @ts-check
import { Router } from 'express';
import { store } from '../../store.mjs';

const router = Router();

router.post('/reset', async (req, res, next) => {
  try {
    const { reset, config } = store();

    if (req.body.cwd !== config.cwd) {
      config.load(req.body.cwd);
    }

    // Read a config from cwd
    await reset();

    res.status(200).send(config.serialize());
  } catch (error) {
    next(error);
  }
});

export default router;
