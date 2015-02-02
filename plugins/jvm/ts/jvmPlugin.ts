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
    $routeProvider
            .when('/jvm', { redirectTo: '/jvm/connect' })
            .when('/jvm/discover', {templateUrl: templatePath + 'discover.html'})
            .when('/jvm/connect', {templateUrl: templatePath + 'connect.html'})
            .when('/jvm/local', {templateUrl: templatePath + 'local.html'});
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


  _module.run(["HawtioNav", "$location", "workspace", "viewRegistry", "layoutFull", "helpRegistry", "preferencesRegistry", "ConnectOptions", (nav:HawtioMainNav.Registry, $location, workspace:Workspace, viewRegistry, layoutFull, helpRegistry, preferencesRegistry, connectOptions:Core.ConnectOptions) => {

    //viewRegistry[pluginName] = templatePath + 'layoutConnect.html';

    var builder = nav.builder();
    var remote = builder.id('jvm-remote')
                  .href( () => '/jvm/connect' )
                  .title( () => 'Remote' )
                  .build();

    var local = builder.id('jvm-local')
                  .href( () => '/jvm/local' )
                  .title( () => 'Local' )
                  .isValid( () => hasLocalMBean(workspace) )
                  .build();

    var discover = builder.id('jvm-discover')
                  .href( () => '/jvm/discover' )
                  .title( () => 'Discover' )
                  .isValid( () => hasDiscoveryMBean(workspace) )
                  .build();

    var tab = builder.id('jvm')
                  .href( () => '/jvm' )
                  .title( () => 'Connect' )
                  .isValid( () => connectOptions == null || connectOptions.name == null )
                  .tabs(remote, local, discover)
                  .build();

    nav.add(tab);


    helpRegistry.addUserDoc('jvm', 'app/jvm/doc/help.md');

    preferencesRegistry.addTab("Connect", 'app/jvm/html/reset.html');

    /*
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
    */
  }]);

  hawtioPluginLoader.addModule(pluginName);
}
