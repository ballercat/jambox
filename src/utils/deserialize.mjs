import { Buffer } from 'buffer';
import httpEncoder from 'http-encoding';

/**
 * Decode a response body buffer using the `content-encoding` header.
 *
 * @param {Buffer} buffer  - Raw body buffer
 * @param {object} headers - HTTP headers (used to read `content-encoding`)
 * @returns {Promise<Buffer>} Decoded buffer
 */
const decodeBuffer = async (buffer, headers) => {
  const encoding = headers['content-encoding'];

  if (!encoding) {
    return buffer;
  }

  return await httpEncoder.decodeBuffer(buffer, encoding);
};

/**
 * Parse a serialized request or response body into a usable body object.
 *
 * Returns an object with helpers for reading the body as a buffer, decoded
 * buffer, UTF-8 text, or parsed JSON.
 *
 * @param {{ body: { buffer: { data: number[] } }, headers: object }} param0
 * @returns {{ buffer: Buffer, getDecodedBuffer: () => Promise<Buffer>, getText: () => Promise<string>, getJson: () => Promise<any> }}
 */
const parseBody = ({
  body: {
    buffer: { data },
  },
  headers,
}) => {
  const buffer = Buffer.from(data);
  return {
    buffer,
    getDecodedBuffer() {
      return decodeBuffer(this.buffer, headers);
    },
    async getText() {
      return (await this.getDecodedBuffer()).toString();
    },
    async getJson() {
      try {
        return JSON.parse(await this.getText());
      } catch (e) {
        return;
      }
    },
  };
};

/**
 * Deserialize a cached request/response pair from its stored JSON form.
 *
 * Attaches live body accessor helpers to both the `request` and `response`
 * objects so they can be used the same way as live mockttp objects.
 *
 * @param {{ request: object, response: object }} param0 - Cached record from the tape
 * @returns {{ request: object, response: object }} Deserialized pair with body helpers
 */
const deserialize = ({ request, response }) => {
  return {
    request: {
      ...request,
      body: parseBody(request),
    },
    response: {
      ...response,
      body: parseBody(response),
    },
  };
};

export default deserialize;
