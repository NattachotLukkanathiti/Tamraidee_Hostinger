// Karma config: รัน test ด้วย Chrome headless และออกรายงาน coverage เป็น lcov (ให้ SonarQube อ่าน)
module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
      require('@angular-devkit/build-angular/plugins/karma')
    ],
    client: {
      jasmine: { random: false },
      clearContext: false
    },
    jasmineHtmlReporter: { suppressAll: true },
    coverageReporter: {
      dir: require('path').join(__dirname, './coverage/todo-app'),
      subdir: '.',
      reporters: [{ type: 'html' }, { type: 'lcovonly' }, { type: 'text-summary' }]
    },
    reporters: ['progress', 'kjhtml'],
    browsers: ['Chrome'],
    customLaunchers: {
      ChromeHeadlessCI: {
        base: 'ChromeHeadless',
        flags: ['--no-sandbox', '--disable-gpu']
      }
    },
    restartOnFileChange: true
  });
};
