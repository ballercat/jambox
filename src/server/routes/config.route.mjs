// @ts-check
import { Router } from 'express';
import { store } from '../../store.mjs';

const router = Router();

router.get('/config', async (_, res) => res.send(store().config.serialize()));
// Bandaid solution (mostly) for testing purposes (does not persist to disk)
router.post('/config', async (req, res, next) => {
  const { config } = store();

  try {
    config.update(req.body);
    res.sendStatus(200);
  } catch (error) {
    next(error);
  }
});

// Maybe a tad bit unnecessary if /api/config can do the same thing, but it's
// nice to have a specific endpoint for a specific action also :shrug:
router.post('/pause', async (req, res, next) => {
  try {
    const { config } = store();
    const { paused } = req.body;
    config.update({ paused });
    res.sendStatus(200);
  } catch (error) {
    next(error);
  }
});

export default router;
