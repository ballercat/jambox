module.exports = {
  name: 'jambox dev helper',
  description: 'Examine and edit proxied requests',
  version: '0.0.2',
  manifest_version: 3,
  permissions: ['scripting', 'proxy', 'debugger', 'notifications'],
  devtools_page: 'devtool.html',
  host_permissions: ['<all_urls>'],
  web_accessible_resources: [
    {
      resources: ['index.js', 'runtime.json'],
      matches: ['<all_urls>'],
    },
  ],
};
