const { override, addWebpackAlias, addWebpackResolve } = require('customize-cra');
const path = require('path');

module.exports = override(
  addWebpackAlias({
    'os': path.resolve(__dirname, 'node_modules/os-browserify/browser')
  }),
  addWebpackResolve({
    fallback: {
      "os": require.resolve("os-browserify/browser")
    }
  })
); 