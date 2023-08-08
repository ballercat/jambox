// @ts-check
import { Router } from 'express';
import { services } from '../store.mjs';
import { serializeRequest, serializeResponse } from '../../cache.mjs';

const router = Router();

router.get('/cache', async (_, res, next) => {
  try {
    const { cache } = services();
    const raw = cache.all();
    const all = {};
    for (const id in raw) {
      const { request, response, ...rest } = raw[id];
      all[id] = {
        ...rest,
        request: await serializeRequest(request),
        response: await serializeResponse(response),
      };
    }
    res.send(all);
  } catch (error) {
    next(error);
  }
});

router.post('/cache', async (req, res, next) => {
  try {
    const { cache } = services();
    const { action } = req.body;

    if (action.type === 'delete') {
      const errors = await cache.delete(action.payload || []);

      res.status(200).send({ errors });
    } else if (action.type === 'update') {
      await cache.update(action.payload);
      res.sendStatus(200);
    } else if (action.type === 'persist') {
      await cache.persist(action.payload);
      res.sendStatus(200);
    } else {
      res.status(400).send('unknown action');
    }
  } catch (error) {
    next(error);
  }
});

export default router;
