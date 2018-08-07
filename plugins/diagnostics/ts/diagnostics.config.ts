/// <reference path="../../jmx/ts/workspace.ts"/>
/// <reference path="diagnostics.service.ts"/>

namespace Diagnostics {

  export function configureRoutes(configManager: Core.ConfigManager) {
    'ngInject';
    configManager
      .addRoute('/diagnostics/jfr', {templateUrl: 'plugins/diagnostics/html/jfr.html'})
      .addRoute('/diagnostics/heap', {templateUrl: 'plugins/diagnostics/html/heap.html'})
      .addRoute('/diagnostics/flags', {templateUrl: 'plugins/diagnostics/html/flags.html'});
  }

  export function configureHelp(helpRegistry: Help.HelpRegistry) {
    'ngInject';
    helpRegistry.addUserDoc('diagnostics', 'plugins/diagnostics/doc/help.md');
  }
  
  export function configureMainNav(mainNavService: Nav.MainNavService, diagnosticsService: DiagnosticsService) {
    'ngInject';
    mainNavService.addItem({
      title: 'Diagnostics',
      basePath: '/diagnostics',
      template: '<diagnostics></diagnostics>',
      isValid: () => diagnosticsService.getTabs().length > 0,
      rank: -1
    });
  }
  
}
