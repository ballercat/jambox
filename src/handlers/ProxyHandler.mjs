// @ts-check
import mockttp from 'mockttp';

export default class ProxyHandler extends mockttp.requestHandlers
  .PassThroughHandler {
  #options;
  constructor(options) {
    super(options);
    this.#options = options;
  }

  explain() {
    return `ProxyHandler ${JSON.stringify(this.#options)}`;
  }
}
