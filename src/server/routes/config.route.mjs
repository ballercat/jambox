// @ts-check
import { Router } from 'express';
import { store } from '../store.mjs';
import getInfo from '../get-info.mjs';
import deepmerge from 'deepmerge';

const router = Router();

router.get('/config', async (_, res) => res.send(getInfo()));
// Bandaid solution (mostly) for testing purposes (does not persist to disk)
router.post('/config', async (req, res, next) => {
  const { setConfig, reset, config } = store();
  try {
    setConfig(deepmerge(config.value, req.body));
    await reset();

    res.sendStatus(200);
  } catch (error) {
    next(error);
  }
});

// Maybe a tad bit unnecessary if /api/config can do the same thing, but it's
// nice to have a specific endpoint for a specific action also :shrug:
router.post('/pause', async (req, res, next) => {
  try {
    const { setConfig, reset, config } = store();
    const { paused } = req.body;
    setConfig({
      ...config.value,
      paused,
    });
    await reset();

    res.sendStatus(200);
  } catch (error) {
    next(error);
  }
});

export default router;
