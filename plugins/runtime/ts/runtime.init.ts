/// <reference path="../../jmx/ts/workspace.ts"/>
/// <reference path="runtime.service.ts"/>

namespace Runtime {

  export function RuntimeInit($rootScope: ng.IScope, viewRegistry, helpRegistry,
    workspace: Jmx.Workspace, runtimeService: RuntimeService) {
    'ngInject';
    
    viewRegistry['runtime'] = 'plugins/runtime/html/layout.html';

    helpRegistry.addUserDoc('runtime', 'plugins/runtime/doc/help.md');

    const unsubscribe = $rootScope.$on('jmxTreeUpdated', () => {
      unsubscribe();
      const tabs = runtimeService.getTabs();
      workspace.topLevelTabs.push({
        id: "runtime",
        content: "Runtime",
        title: "Runtie",
        isValid: () => tabs.length > 0,
        href: () => tabs[0].path,
        isActive: (workspace: Jmx.Workspace) => workspace.isLinkActive("diagnostics")
      });
    });
  }

}