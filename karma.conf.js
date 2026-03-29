// Minimal custom config — Angular CLI handles frameworks, plugins, and reporters.
// We only override the browser launcher here.
module.exports = function (config) {
  config.set({
    customLaunchers: {
      ChromeHeadlessCI: {
        base: 'ChromeHeadless',
        flags: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
      },
    },
    browsers: ['ChromeHeadlessCI'],
  });
};
