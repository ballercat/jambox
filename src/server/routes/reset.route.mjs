// @ts-nocheck
import { Router } from 'express';
import { jambox } from '../../store.mjs';

const router = Router();

/**
 * POST /api/reset
 *
 * Resets the Jambox proxy, optionally switching to a different working directory.
 *
 * - If `req.body.cwd` differs from the current CWD, the config is reloaded from
 *   the new path and a full proxy reset is triggered.
 * - If the CWD is unchanged, only the proxy rules are reset (cache is reloaded
 *   from the existing tape).
 *
 * Returns the serialized configuration after the reset completes.
 *
 * @example
 * // POST /api/reset  { "cwd": "/path/to/project" }
 * // Response: SerializedConfig
 */
router.post('/reset', async (req, res, next) => {
  try {
    if (req.body.cwd !== jambox().config.cwd) {
      // changing a config should reset jambox
      await jambox().config.load(req.body.cwd);
      await jambox().once('jambox.reset');
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
