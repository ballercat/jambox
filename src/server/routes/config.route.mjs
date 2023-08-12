// @ts-check
import { Router } from 'express';
import { jambox } from '../../store.mjs';

const router = Router();

router.get('/config', async (_, res) => res.send(jambox().config.serialize()));
// Bandaid solution (mostly) for testing purposes (does not persist to disk)
router.post('/config', async (req, res, next) => {
  try {
    jambox().config.update(req.body);
    res.sendStatus(200);
  } catch (error) {
    next(error);
  }
});

// Maybe a tad bit unnecessary if /api/config can do the same thing, but it's
// nice to have a specific endpoint for a specific action also :shrug:
router.post('/pause', async (req, res, next) => {
  try {
    const { paused } = req.body;
    jambox().config.update({ paused });
    res.sendStatus(200);
  } catch (error) {
    next(error);
  }
});

export default router;
