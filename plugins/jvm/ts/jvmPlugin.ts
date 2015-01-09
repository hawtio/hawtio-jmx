/**
 * @module JVM
 * @main JVM
 */
/// <reference path="jvmHelpers.ts"/>
module JVM {

  export var rootPath = 'plugins/jvm';
  export var templatePath = rootPath + '/html/';
  export var pluginName = 'jvm';

  export var _module = angular.module(pluginName, []);

  _module.config(["$routeProvider", ($routeProvider) => {
    $routeProvider.
            when('/jvm/discover', {templateUrl: templatePath + 'discover.html'}).
            when('/jvm/connect', {templateUrl: templatePath + 'connect.html'}).
            when('/jvm/local', {templateUrl: templatePath + 'local.html'});
  }]);

  _module.constant('mbeanName', 'hawtio:type=JVMList');

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


  _module.run(["$location", "workspace", "viewRegistry", "layoutFull", "helpRegistry", "preferencesRegistry", "ConnectOptions", ($location, workspace:Workspace, viewRegistry, layoutFull, helpRegistry, preferencesRegistry, connectOptions:Core.ConnectOptions) => {

    viewRegistry[pluginName] = templatePath + 'layoutConnect.html';
    helpRegistry.addUserDoc('jvm', 'app/jvm/doc/help.md');

    preferencesRegistry.addTab("Connect", 'app/jvm/html/reset.html');

    workspace.topLevelTabs.push({
      id: "connect",
      content: "Connect",
      title: "Connect to other JVMs",
      isValid: (workspace) => {
        // we only want to be valid if we are not already connected from another hawtio
        return connectOptions == null || connectOptions.name == null
      },
      href: () => {
        return '#/jvm/connect';
      },
      isActive: (workspace:Workspace) => workspace.isLinkActive("jvm")
    });
  }]);

  hawtioPluginLoader.addModule(pluginName);
}
