namespace Runtime {

  export function RuntimeConfig(configManager: Core.ConfigManager) {
    'ngInject';

    configManager
      .addRoute('/runtime/overview', {templateUrl: 'plugins/runtime/html/overview.html'})
      .addRoute('/runtime/systemProperties', {templateUrl: 'plugins/runtime/html/systemProperties.html'})
      .addRoute('/runtime/metrics', {templateUrl: 'plugins/runtime/html/metrics.html'});
  }

}