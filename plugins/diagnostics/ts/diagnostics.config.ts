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

  export function configureLayout($rootScope: ng.IScope, $templateCache: ng.ITemplateCacheService,
    viewRegistry, helpRegistry, workspace: Jmx.Workspace, diagnosticsService: DiagnosticsService) {
    'ngInject';
    
    const templateCacheKey = 'diagnostics.html';
    $templateCache.put(templateCacheKey, '<diagnostics></diagnostics>');
    viewRegistry['diagnostics'] = templateCacheKey;
    
    helpRegistry.addUserDoc('diagnostics', 'plugins/diagnostics/doc/help.md');

    diagnosticsService.getTabs()
      .then(tabs => {
        workspace.topLevelTabs.push({
          id: "diagnostics",
          content: "Diagnostics",
          title: "JVM Diagnostics",
          isValid: () => tabs.length > 0,
          href: () => tabs[0].path,
          isActive: (workspace: Jmx.Workspace) => workspace.isLinkActive("diagnostics")
        });
      });
}
  
}