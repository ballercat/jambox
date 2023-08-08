// @ts-check
import { Router } from 'express';
import { store } from '../store.mjs';
import getConfig from '../../config.mjs';
import getInfo from '../get-info.mjs';

const router = Router();

router.post('/reset', async (req, res, next) => {
  try {
    const { reset, config, watchConfig } = store();
    const setupWatcher = req.body.cwd !== config.value.cwd;
    config.value = getConfig({}, req.body.cwd);

    // Read a config from cwd
    await reset();

    if (setupWatcher) {
      watchConfig();
    }

    res.status(200).send(getInfo());
  } catch (error) {
    next(error);
  }
});

export default router;
