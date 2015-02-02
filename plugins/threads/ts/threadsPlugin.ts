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

  export var _module = angular.module(pluginName, []);

  _module.config(["$routeProvider", ($routeProvider) => {
    $routeProvider.
        when('/threads', {templateUrl: UrlHelpers.join(templatePath, 'index.html')});
  }]);

  _module.run(["$templateCache", "workspace", "viewRegistry", "layoutFull", "helpRegistry", "HawtioNav", ($templateCache:ng.ITemplateCacheService, workspace:Core.Workspace, viewRegistry, layoutFull, helpRegistry, nav:HawtioMainNav.Registry) => {
    viewRegistry['threads'] = layoutFull;
    helpRegistry.addUserDoc('threads', 'plugins/threads/doc/help.md');

    var builder = nav.builder();
    var toolbar = builder.id('threads-toolbar')
                    .href(() => '#')
                    .template( () => $templateCache.get(UrlHelpers.join(templatePath, 'toolbar.html')) )
                    .build();

    var tab = builder.id('threads')
                .href(() => '/threads')
                .isValid(() => workspace.treeContainsDomainAndProperties(jmxDomain, { type: mbeanType }))
                .title(() => 'Threads')
                .isSelected(() => workspace.isTopTabActive("threads"))
                .tabs(toolbar)
                .build();

    nav.add(tab);
  }]);

  hawtioPluginLoader.addModule(pluginName);
}
