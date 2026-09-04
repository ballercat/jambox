// @ts-nocheck
import { Router } from 'express';
import { jambox } from '../../store.mjs';

const router = Router();

/**
 * GET /api/config
 *
 * Returns the serialized current configuration of the running Jambox instance.
 *
 * @see {@link import('../../Config.mjs').default#serialize}
 */
router.get('/config', async (_, res) => res.send(jambox().config.serialize()));

/**
 * POST /api/config
 *
 * Applies a partial configuration update in-memory (does not persist to disk).
 * Waits for the proxy to complete its reset cycle before responding.
 *
 * Useful for testing: temporarily override forwarding/caching rules without
 * modifying `jambox.config.js`.
 *
 * @example
 * // POST /api/config  { "paused": true }
 */
// Bandaid solution (mostly) for testing purposes (does not persist to disk)
router.post('/config', async (req, res, next) => {
  try {
    jambox().config.update(req.body);
    await jambox().once('jambox.reset');
    res.sendStatus(200);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/pause
 *
 * Convenience endpoint to toggle the proxy's paused state.
 * When paused, the proxy passes all requests through without caching.
 *
 * @example
 * // POST /api/pause  { "paused": true }
 */
// Maybe a tad bit unnecessary if /api/config can do the same thing, but it's
// nice to have a specific endpoint for a specific action also :shrug:
router.post('/pause', async (req, res, next) => {
  try {
    const { paused } = req.body;
    jambox().config.update({ paused });
    await jambox().once('jambox.reset');
    res.sendStatus(200);
  } catch (error) {
    next(error);
  }
});

export default router;
