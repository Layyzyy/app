const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const path = require('path');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  // Ensure resolve exists
  config.resolve = config.resolve || {};

  // Alias 'app' to the local app directory so imports like 'app/...' resolve correctly
  config.resolve.alias = {
    ...(config.resolve.alias || {}),
    app: path.resolve(__dirname, 'app'),
    // Ensure expo-router's internal entry can be resolved by webpack
    'expo-router/entry-classic': path.resolve(__dirname, 'node_modules', 'expo-router', 'entry-classic.js'),
  // Some expo-router compiled code uses long relative paths to the project's `app` folder.
  // Add aliases for the common relative requests so webpack can resolve them to the real app folder.
  '../../../../../app': path.resolve(__dirname, 'app'),
  '../../../../../../../../app': path.resolve(__dirname, 'app'),
  };

  // Ensure node_modules resolution remains available and prefer resolving modules from the app folder first
  const originalModules = config.resolve.modules || [];
  config.resolve.modules = [path.resolve(__dirname, 'app'), path.resolve(__dirname, 'node_modules'), ...originalModules];

  return config;
};
