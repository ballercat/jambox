import { Buffer } from 'buffer';

const decodeBuffer = async (buffer, headers) => {
  const encoding = headers['content-encoding'];

  if (!encoding) {
    return buffer;
  }

  return await (await import('http-encoding')).decodeBuffer(buffer, encoding);
};

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
      return decodeBuffer(buffer, headers);
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
