/**
 * @module Jmx
 * @main Jmx
 */
/// <reference path="../../includes.ts"/>
/// <reference path="jmxHelpers.ts"/>
/// <reference path="widgetRepository.ts"/>
/// <reference path="workspace.ts"/>
module Jmx {

  export var _module = angular.module(pluginName, []);

  _module.config(['HawtioNavBuilderProvider', "$routeProvider", (builder:HawtioMainNav.BuilderFactory, $routeProvider) => {

    $routeProvider.
      when('/jmx/attributes', {templateUrl: UrlHelpers.join(templatePath, 'attributes.html')}).
      when('/jmx/operations', {templateUrl: UrlHelpers.join(templatePath, 'operations.html')}).
      when('/jmx/charts', {templateUrl: UrlHelpers.join(templatePath, 'charts.html')}).
      when('/jmx/chartEdit', {templateUrl: UrlHelpers.join(templatePath, 'chartEdit.html')}).
      when('/jmx/help/:tabName', {templateUrl: 'app/core/html/help.html'}).
      when('/jmx/widget/donut', {templateUrl: UrlHelpers.join(templatePath, 'donutChart.html')}).
      when('/jmx/widget/area', {templateUrl: UrlHelpers.join(templatePath, 'areaChart.html')});
  }]);

  _module.factory('jmxWidgetTypes', () => {
    return Jmx.jmxWidgetTypes;
  });

  _module.factory('jmxWidgets', () => {
    return Jmx.jmxWidgets;
  });

  // Create the workspace object used in all kinds of places
  _module.factory('workspace',["$location", "jmxTreeLazyLoadRegistry","$compile", "$templateCache", "localStorage", "jolokia", "jolokiaStatus", "$rootScope", "userDetails", "HawtioNav", ($location:ng.ILocationService,jmxTreeLazyLoadRegistry, $compile:ng.ICompileService,$templateCache:ng.ITemplateCacheService, localStorage:WindowLocalStorage, jolokia, jolokiaStatus, $rootScope, userDetails, HawtioNav) => {

      var answer = new Workspace(jolokia, jolokiaStatus, jmxTreeLazyLoadRegistry, $location, $compile, $templateCache, localStorage, $rootScope, userDetails, HawtioNav);
      answer.loadTree();
      return answer;
  }]);

  _module.controller("Jmx.MBeanTreeController", ['$scope', 'workspace', ($scope, workspace) => {
    $scope.node = {};
    workspace.addNamedTreePostProcessor('MBeanTree', (tree:Core.Folder) => {
      angular.copy(tree, $scope.node);
      $scope.node.open = true;
      log.debug("got tree: ", $scope.node);
    });
    $scope.select = (node) => {
      workspace.updateSelectionNode(node);
    }
  }]);

  _module.factory('rbacACLMBean', function() {
    return {
      then: function() {}
    }
  });

  _module.constant('layoutTree', 'plugins/jmx/html/layoutTree.html');

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

  _module.run(["$location", "workspace", "viewRegistry", "layoutTree", "jolokia", "helpRegistry", "pageTitle", ($location: ng.ILocationService, workspace:Core.Workspace, viewRegistry, layoutTree, jolokia, helpRegistry, pageTitle) => {
    log.debug('loaded');

    viewRegistry['jmx'] = layoutTree;
    helpRegistry.addUserDoc('jmx', 'app/jmx/doc/help.md');

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

    workspace.topLevelTabs.push( {
      id: "jmx",
      content: "JMX",
      title: "View the JMX MBeans in this process",
      isValid: (workspace: Workspace) => workspace.hasMBeans(),
      href: () => "/jmx/attributes",
      isActive: (workspace: Workspace) => workspace.isTopTabActive("jmx")
    });

    // we want attributes to be listed first, so add it at index 0
    workspace.subLevelTabs.add( {
      content: '<i class="fa fa-list"></i> Attributes',
      title: "View the attribute values on your selection",
      isValid: (workspace: Workspace) => true,
      href: () => "/jmx/attributes",
      index: -1
    }, 0);
    workspace.subLevelTabs.push( {
      content: '<i class="fa fa-leaf"></i> Operations',
      title: "Execute operations on your selection",
      isValid: (workspace: Workspace) => true,
      href: () => "/jmx/operations"
    });
    workspace.subLevelTabs.push( {
      content: '<i class="fa fa-bar-chart"></i> Chart',
      title: "View a chart of the metrics on your selection",
      isValid: (workspace: Workspace) => true,
      href: () => "/jmx/charts"
    });
    workspace.subLevelTabs.push( {
      content: '<i class="fa fa-cog"></i> Edit Chart',
      title: "Edit the chart configuration",
      isValid: (workspace: Workspace) => workspace.isLinkActive("jmx/chart"),
      href: () => "/jmx/chartEdit"
    });

  }]);

  hawtioPluginLoader.addModule(pluginName);
  /*
  hawtioPluginLoader.addModule('dotjem.angular.tree');
  */

}
