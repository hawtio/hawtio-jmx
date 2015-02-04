/**
 * @module JVM
 * @main JVM
 */
/// <reference path="jvmHelpers.ts"/>
// TODO move this out of here and enable per-logger settings easily in the UI
Logger.get('$templateCache').setLevel(Logger.WARN);
Logger.get('$templateRequest').setLevel(Logger.WARN);

module JVM {

  export var _module = angular.module(pluginName, []);

  _module.config(["$routeProvider", ($routeProvider) => {
    $routeProvider
            .when('/jvm', { redirectTo: '/jvm/connect' })
            .when('/jvm/discover', {templateUrl: UrlHelpers.join(templatePath, 'discover.html')})
            .when('/jvm/connect', {templateUrl: UrlHelpers.join(templatePath, 'connect.html')})
            .when('/jvm/local', {templateUrl: UrlHelpers.join(templatePath, 'local.html')});
  }]);

  _module.constant('mbeanName', 'hawtio:type=JVMList');

  _module.run(["HawtioNav", "$location", "workspace", "viewRegistry", "layoutFull", "helpRegistry", "preferencesRegistry", "ConnectOptions", "locationChangeStartTasks", (nav:HawtioMainNav.Registry, $location, workspace:Workspace, viewRegistry, layoutFull, helpRegistry, preferencesRegistry, ConnectOptions:Core.ConnectOptions, locationChangeStartTasks) => {
    // ensure that if the connection parameter is present, that we keep it
    locationChangeStartTasks.addTask('ConParam', ($event:ng.IAngularEvent, newUrl:string, oldUrl:string) => {
      // we can't execute until the app is initialized...
      if (!HawtioCore.injector) {
        return;
      }
      //log.debug("ConParam task firing, newUrl: ", newUrl, " oldUrl: ", oldUrl, " ConnectOptions: ", ConnectOptions);
      if (!ConnectOptions || !ConnectOptions.name || !newUrl) {
        return;
      }
      var newQuery:any = $location.search();
      if (!newQuery.con) {
        log.debug("Lost connection parameter (", ConnectOptions.name, ") from query params: ", newQuery, " resetting");
        newQuery['con'] = ConnectOptions.name;
        $location.search(newQuery);
      }
    });
    var builder = nav.builder();
    var remote = builder.id('jvm-remote')
                  .href( () => '/jvm/connect' )
                  .title( () => 'Remote' )
                  .build();
    var local = builder.id('jvm-local')
                  .href( () => '/jvm/local' )
                  .title( () => 'Local' )
                  .show( () => hasLocalMBean(workspace) )
                  .build();
    var discover = builder.id('jvm-discover')
                  .href( () => '/jvm/discover' )
                  .title( () => 'Discover' )
                  .show( () => hasDiscoveryMBean(workspace) )
                  .build();
    var tab = builder.id('jvm')
                  .href( () => '/jvm' )
                  .title( () => 'Connect' )
                  .isValid( () => ConnectOptions == null || ConnectOptions.name == null )
                  .tabs(remote, local, discover)
                  .build();
    nav.add(tab);
    helpRegistry.addUserDoc('jvm', 'app/jvm/doc/help.md');
    preferencesRegistry.addTab("Connect", 'app/jvm/html/reset.html');
  }]);

  hawtioPluginLoader.addModule(pluginName);
}
