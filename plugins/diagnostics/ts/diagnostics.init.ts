/// <reference path="../../jmx/ts/workspace.ts"/>
/// <reference path="diagnostics.service.ts"/>

namespace Diagnostics {

  export function DiagnosticsInit($rootScope: ng.IScope, viewRegistry, helpRegistry,
    workspace: Jmx.Workspace, diagnosticsService: DiagnosticsService) {
    'ngInject';
    
    viewRegistry['diagnostics'] = 'plugins/diagnostics/html/layout.html';

    helpRegistry.addUserDoc('diagnostics', 'plugins/diagnostics/doc/help.md');

    const unsubscribe = $rootScope.$on('jmxTreeUpdated', () => {
      unsubscribe();
      const tabs = diagnosticsService.getTabs();
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