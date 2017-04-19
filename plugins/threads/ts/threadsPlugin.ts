/// <reference path="../../includes.ts" />
/// <reference path="../../jmx/ts/workspace.ts" />
/**
 * @module Threads
 * @main Threads
 */
module Threads {

  export var pluginName = 'threads';
  export var templatePath = 'plugins/threads/html/';
  export var log:Logging.Logger = Logger.get("Threads");
  export var jmxDomain = 'java.lang';
  export var mbeanType = 'Threading';
  export var mbean = jmxDomain + ":type=" + mbeanType;

  export var _module = angular.module(pluginName, ['patternfly']);

  _module.config(["$routeProvider", ($routeProvider) => {
    $routeProvider.
        when('/threads', {templateUrl: UrlHelpers.join(templatePath, 'index.html')});
  }]);

  _module.run(["$templateCache", "workspace", "viewRegistry", "layoutFull", "helpRegistry", "HawtioNav",
      ($templateCache: ng.ITemplateCacheService, workspace: Jmx.Workspace, viewRegistry, layoutFull,
      helpRegistry, nav: HawtioMainNav.Registry) => {

    viewRegistry['threads'] = layoutFull;
    helpRegistry.addUserDoc('threads', 'plugins/threads/doc/help.md');

    var tab = nav.builder().id('threads')
                .href(() => '/threads')
                .isValid(() => workspace.treeContainsDomainAndProperties(jmxDomain, { type: mbeanType }))
                .title(() => 'Threads')
                .tooltip(() => 'View information about the threads in the JVM')
                .isSelected(() => workspace.isTopTabActive("threads"))
                .build();

    nav.add(tab);
  }]);

  hawtioPluginLoader.addModule(pluginName);
}
