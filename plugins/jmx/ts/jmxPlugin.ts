/**
 * @module Jmx
 * @main Jmx
 */
/// <reference path="../../includes.ts"/>
/// <reference path="../../jvm/ts/jvmHelpers.ts"/>
/// <reference path="jmxHelpers.ts"/>
/// <reference path="widgetRepository.ts"/>
/// <reference path="workspace.ts"/>
module Jmx {

  export var _module = angular.module(pluginName, []);

  _module.config(['HawtioNavBuilderProvider', "$routeProvider", (builder:HawtioMainNav.BuilderFactory, $routeProvider) => {

    $routeProvider
      .when('/jmx', { redirectTo: '/jmx/attributes' })
      .when('/jmx/attributes', {templateUrl: UrlHelpers.join(templatePath, 'attributes.html')})
      .when('/jmx/operations', {templateUrl: UrlHelpers.join(templatePath, 'operations.html')})
      .when('/jmx/charts', {templateUrl: UrlHelpers.join(templatePath, 'charts.html')})
      .when('/jmx/chartEdit', {templateUrl: UrlHelpers.join(templatePath, 'chartEdit.html')})
      .when('/jmx/help/:tabName', {templateUrl: 'app/core/html/help.html'})
      .when('/jmx/widget/donut', {templateUrl: UrlHelpers.join(templatePath, 'donutChart.html')})
      .when('/jmx/widget/area', {templateUrl: UrlHelpers.join(templatePath, 'areaChart.html')});
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

  // holds the status returned from the last jolokia call (?)
  _module.factory('jolokiaStatus', () => {
    return {
      xhr: null
    };
  });

  export var DEFAULT_MAX_DEPTH = 7;
  export var DEFAULT_MAX_COLLECTION_SIZE = 5000;

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

  _module.controller('Jmx.EditChartNav', ['$scope', '$location', ($scope, $location) => {
    $scope.valid = () => {
      return _.startsWith($location.path(), '/jmx/chart');
    }
  }]);

  _module.run(["HawtioNav", "$location", "workspace", "viewRegistry", "layoutTree", "jolokia", "helpRegistry", "pageTitle", "$templateCache", (nav:HawtioMainNav.Registry, $location: ng.ILocationService, workspace:Core.Workspace, viewRegistry, layoutTree, jolokia, helpRegistry, pageTitle, $templateCache) => {
    log.debug('loaded');

    viewRegistry['{ "main-tab": "jmx" }'] = layoutTree;
    helpRegistry.addUserDoc('jmx', 'app/jmx/doc/help.md');

    pageTitle.addTitleElement(():string => {
      if (Jmx.currentProcessId === '') {
        try {
          Jmx.currentProcessId = jolokia.getAttribute('java.lang:type=Runtime', 'Name');
        } catch (e) {
          // ignore
        }
        if (Jmx.currentProcessId && Jmx.currentProcessId.indexOf("@") !== -1) {
          Jmx.currentProcessId = "pid:" +  Jmx.currentProcessId.split("@")[0];
        }
      }
      return Jmx.currentProcessId;
    });

    var myUrl = '/jmx/attributes';
    var builder = nav.builder();
    var tab = builder.id('jmx')
                .title( () => 'JMX' )
                .defaultPage({
                  rank: 10,
                  isValid: (yes, no) => {
                    var name = 'JmxDefaultPage';
                    workspace.addNamedTreePostProcessor(name, (tree) => {
                      workspace.removeNamedTreePostProcessor(name);
                      if (workspace.hasMBeans()) {
                        yes();
                      } else {
                        no();
                      }
                    });
                  }
                })
                .isValid( () => workspace.hasMBeans() )
                .href( () => myUrl )
                .build();
    tab.tabs = getNavItems(builder, workspace, $templateCache);
    nav.add(tab);

  }]);

  hawtioPluginLoader.addModule(pluginName);
  hawtioPluginLoader.addModule('dangle');

}
