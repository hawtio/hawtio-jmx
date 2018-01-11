namespace Diagnostics {

  export function DiagnosticsConfig(configManager: Core.ConfigManager) {
    'ngInject';
    
    configManager
      .addRoute('/diagnostics/jfr', {templateUrl: 'plugins/diagnostics/html/jfr.html'})
      .addRoute('/diagnostics/heap', {templateUrl: 'plugins/diagnostics/html/heap.html'})
      .addRoute('/diagnostics/flags', {templateUrl: 'plugins/diagnostics/html/flags.html'});
  }

}