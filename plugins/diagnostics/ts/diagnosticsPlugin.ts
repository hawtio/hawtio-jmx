/// <reference path="diagnosticHelpers.ts"/>
namespace Diagnostics {

  let rootPath = 'plugins/diagnostics';
  let templatePath = rootPath + '/html/';
  let pluginName = 'diagnostics';

  export const _module = angular.module(pluginName, ['datatable', 'hawtio-forms']);

  _module.config(["$routeProvider", ($routeProvider) => {
    $routeProvider.when('/diagnostics/jfr', {templateUrl: templatePath + 'jfr.html'}).when('/diagnostics/heap', {templateUrl: templatePath + 'heap.html'}).when('/diagnostics/flags', {templateUrl: templatePath + 'flags.html'});
  }]);

  _module.run(["$location", "workspace", "viewRegistry", "layoutFull", "helpRegistry", "preferencesRegistry", ($location, workspace: Jmx.Workspace, viewRegistry, layoutFull, helpRegistry, preferencesRegistry) => {

    viewRegistry[pluginName] = templatePath + 'layoutDiagnostics.html';
    helpRegistry.addUserDoc('diagnostics', 'plugins/diagnostics/doc/help.md');


    workspace.topLevelTabs.push({
      id: "diagnostics",
      content: "Diagnostics",
      title: "JVM Diagnostics",
      isValid: (workspace) => {
        return workspace.treeContainsDomainAndProperties("com.sun.management") && initialTab(workspace);
      },
      href: () => {
        return '#/diagnostics' + initialTab(workspace);
      },
      isActive: (workspace: Jmx.Workspace) => workspace.isLinkActive("diagnostics")
    });
  }]);

  hawtioPluginLoader.addModule(pluginName);
}
