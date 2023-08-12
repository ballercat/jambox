// @ts-check
import mockttp from 'mockttp';
import Cache from '../Cache.mjs';

export default class CacheHandler extends mockttp.requestHandlers
  .CallbackHandler {
  /**
   * @param svc {object}
   * @param svc.cache {Cache}
   */
  constructor(svc) {
    const callback = async (completedRequest) => {
      try {
        const hash = await Cache.hash(completedRequest);
        const { response } = svc.cache.get(hash);
        return {
          headers: {
            ...response.headers,
            'x-jambox-hash': hash,
          },
          json: response.json,
          rawBody: response.body.buffer,
          status: response.status,
          statusCode: response.statusCode,
          statusMessage: response.statusMessage,
        };
      } catch (e) {
        throw new Error('Error');
      }
    };

    super(callback);
  }
  explain() {
    return `CacheHandler return a response from cache`;
  }
}
