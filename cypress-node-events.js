import fetch from 'node-fetch';
import waitOn from 'wait-on';

export default function nodeEvents(on) {
  on('task', {
    jambox: {
      // Configure Jambox with a dynamic config during a test
      config: async (jamboxConfig) => {
        // When running the service with yarn dev nodemon will restart the server
        // when src/** folders are changed so it's nicer to just wait for half a
        // second before sending the config request
        await waitOn({ resources: [`http://localhost:9000`], timeout: 1500 });
        return fetch(`http://localhost:9000/api/config`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(jamboxConfig),
        });
      },
      reset: async () => {
        await waitOn({ resources: [`http://localhost:9000`], timeout: 1500 });
        return fetch(`http://localhost:9000/api/reset`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ cwd: process.cwd() }),
        });
      },
    },
  });
}
