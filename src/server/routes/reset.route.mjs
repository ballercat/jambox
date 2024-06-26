// @ts-check
import { Router } from 'express';
import { jambox } from '../../store.mjs';

const router = Router();

router.post('/reset', async (req, res, next) => {
  try {
    if (req.body.cwd !== jambox().config.cwd) {
      // changing a config should reset jambox
      jambox().config.load(req.body.cwd);
    } else {
      // Read a config from cwd
      await jambox().reset();
    }

    res.status(200).send(jambox().config.serialize());
  } catch (error) {
    next(error);
  }
});

export default router;
