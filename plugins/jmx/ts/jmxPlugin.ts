/**
 * @module Jmx
 * @main Jmx
 */
/// <reference path="../../includes.ts"/>
/// <reference path="jmxHelpers.ts"/>
/// <reference path="widgetRepository.ts"/>
/// <reference path="workspace.ts"/>
module Jmx {
  var pluginName = 'jmx';

  export var currentProcessId = '';

  export var _module = angular.module(pluginName, []);

  _module.config(["$routeProvider", ($routeProvider) => {
    $routeProvider.
            when('/jmx/attributes', {templateUrl: 'app/jmx/html/attributes.html'}).
            when('/jmx/operations', {templateUrl: 'app/jmx/html/operations.html'}).
            when('/jmx/charts', {templateUrl: 'app/jmx/html/charts.html'}).
            when('/jmx/chartEdit', {templateUrl: 'app/jmx/html/chartEdit.html'}).
            when('/jmx/help/:tabName', {templateUrl: 'app/core/html/help.html'}).
            when('/jmx/widget/donut', {templateUrl: 'app/jmx/html/donutChart.html'}).
            when('/jmx/widget/area', {templateUrl: 'app/jmx/html/areaChart.html'});
  }]);

  _module.factory('jmxWidgetTypes', () => {
    return Jmx.jmxWidgetTypes;
  });

  _module.factory('jmxWidgets', () => {
    return Jmx.jmxWidgets;
  });

  // Create the workspace object used in all kinds of places
  _module.factory('workspace',["$location", "jmxTreeLazyLoadRegistry","$compile", "$templateCache", "localStorage", "jolokia", "jolokiaStatus", "$rootScope", "userDetails", ($location:ng.ILocationService,jmxTreeLazyLoadRegistry, $compile:ng.ICompileService,$templateCache:ng.ITemplateCacheService, localStorage:WindowLocalStorage, jolokia, jolokiaStatus, $rootScope, userDetails) => {

      var answer = new Workspace(jolokia, jolokiaStatus, jmxTreeLazyLoadRegistry, $location, $compile, $templateCache, localStorage, $rootScope, userDetails);
      answer.loadTree();
      return answer;
  }]);

  _module.service('ConnectOptions', ['$location', ($location:ng.ILocationService) => {
    var connectionName = Core.ConnectionName;
    if (!Core.isBlank(connectionName)) {
      var answer = Core.getConnectOptions(connectionName);
      log.debug("ConnectOptions: ", answer);
      return answer;
    }
    log.debug("No connection options, connected to local JVM");
    return null;
  }]);

  // local storage service to wrap the HTML5 browser storage
  _module.service('localStorage',() => {
    return Core.getLocalStorage();
  });

  // Holds a mapping of plugins to layouts, plugins use this to specify a full width view, tree view or their own custom view
  _module.factory('viewRegistry',() => {
    return {};
  });

  // the jolokia URL we're connected to, could probably be a constant
  _module.factory('jolokiaUrl', () => {
    // TODO
    return '/jolokia';
  });

  // holds the status returned from the last jolokia call (?)
  _module.factory('jolokiaStatus', () => {
    return {
      xhr: null
    };
  });

  export var DEFAULT_MAX_DEPTH = 7;
  export var DEFAULT_MAX_COLLECTION_SIZE = 500;

  _module.factory('jolokiaParams', ["jolokiaUrl", "localStorage", (jolokiaUrl, localStorage) => {
    var answer = {
      canonicalNaming: false,
      ignoreErrors: true,
      mimeType: 'application/json',
      maxDepth: DEFAULT_MAX_DEPTH,
      maxCollectionSize: DEFAULT_MAX_COLLECTION_SIZE
    };
    if ('jolokiaParams' in localStorage) {
      answer = angular.fromJson(localStorage['jolokiaParams']);
    } else {
      localStorage['jolokiaParams'] = angular.toJson(answer);
    }
    answer['url'] = jolokiaUrl;
    return answer;
  }]);

  _module.factory('jmxTreeLazyLoadRegistry', () => {
    return Core.lazyLoaders;
  });

  _module.factory('userDetails', () => {
    return {
      username: '',
      password: ''
    };
  });


  _module.run(["$location", "workspace", "viewRegistry", "layoutTree", "jolokia", "helpRegistry", ($location: ng.ILocationService, workspace:Core.Workspace, viewRegistry, layoutTree, jolokia, helpRegistry) => {
    log.debug('loaded');

    viewRegistry['jmx'] = layoutTree;
    helpRegistry.addUserDoc('jmx', 'app/jmx/doc/help.md');

    /*
    pageTitle.addTitleElement(():string => {
      if (Jmx.currentProcessId === '') {
        try {
          Jmx.currentProcessId = jolokia.getAttribute('java.lang:type=Runtime', 'Name');
        } catch (e) {
          // ignore
        }
        if (Jmx.currentProcessId && Jmx.currentProcessId.has("@")) {
          Jmx.currentProcessId = "pid:" +  Jmx.currentProcessId.split("@")[0];
        }
      }
      return Jmx.currentProcessId;
    });
    */

    workspace.topLevelTabs.push( {
      id: "jmx",
      content: "JMX",
      title: "View the JMX MBeans in this process",
      isValid: (workspace: Workspace) => workspace.hasMBeans(),
      href: () => "#/jmx/attributes",
      isActive: (workspace: Workspace) => workspace.isTopTabActive("jmx")
    });

    // we want attributes to be listed first, so add it at index 0
    workspace.subLevelTabs.add( {
      content: '<i class="icon-list"></i> Attributes',
      title: "View the attribute values on your selection",
      isValid: (workspace: Workspace) => true,
      href: () => "#/jmx/attributes",
      index: -1
    }, 0);
    workspace.subLevelTabs.push( {
      content: '<i class="icon-leaf"></i> Operations',
      title: "Execute operations on your selection",
      isValid: (workspace: Workspace) => true,
      href: () => "#/jmx/operations"
    });
    workspace.subLevelTabs.push( {
      content: '<i class="icon-bar-chart"></i> Chart',
      title: "View a chart of the metrics on your selection",
      isValid: (workspace: Workspace) => true,
      href: () => "#/jmx/charts"
    });
    workspace.subLevelTabs.push( {
      content: '<i class="icon-cog"></i> Edit Chart',
      title: "Edit the chart configuration",
      isValid: (workspace: Workspace) => workspace.isLinkActive("jmx/chart"),
      href: () => "#/jmx/chartEdit"
    });

  }]);

  hawtioPluginLoader.addModule(pluginName);
}
