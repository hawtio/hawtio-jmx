/// <reference path="connect/connect.module.ts"/>

namespace JVM {

  export const _module = angular
    .module(pluginName, [ConnectModule])
    .config(defineRoutes)
    .constant('mbeanName', 'hawtio:type=JVMList')
    .run(configurePlugin);

  function defineRoutes($provide: ng.auto.IProvideService, $routeProvider: ng.route.IRouteProvider): void {
    'ngInject';
    $routeProvider
      .when('/jvm', { redirectTo: '/jvm/connect' })
      .when('/jvm/welcome', { templateUrl: UrlHelpers.join(templatePath, 'welcome.html') })
      .when('/jvm/discover', { templateUrl: UrlHelpers.join(templatePath, 'discover.html') })
      .when('/jvm/connect', { templateUrl: UrlHelpers.join(templatePath, 'connect.html') })
      .when('/jvm/local', { templateUrl: UrlHelpers.join(templatePath, 'local.html') });
  }

  function configurePlugin(
    HawtioNav: HawtioMainNav.Registry,
    $location: ng.ILocationService,
    viewRegistry,
    helpRegistry: Help.HelpRegistry,
    preferencesRegistry: Core.PreferencesRegistry,
    ConnectOptions: Core.ConnectOptions,
    localStorage: Storage,
    preLogoutTasks: Core.Tasks,
    locationChangeStartTasks: Core.ParameterizedTasks,
    HawtioDashboard,
    HawtioExtension: Core.HawtioExtension,
    $templateCache: ng.ITemplateCacheService,
    $compile: ng.ICompileService): void {
    'ngInject';

    viewRegistry['jvm'] = "plugins/jvm/html/layoutConnect.html";

    HawtioExtension.add('hawtio-header', ($scope) => {
      let template = $templateCache.get<string>(UrlHelpers.join(templatePath, 'navbarHeaderExtension.html'));
      return $compile(template)($scope);
    });

    if (!HawtioDashboard.inDashboard) {
      // ensure that if the connection parameter is present, that we keep it
      locationChangeStartTasks.addTask('ConParam', ($event: ng.IAngularEvent, newUrl: string, oldUrl: string) => {
        // we can't execute until the app is initialized...
        if (!HawtioCore.injector) {
          return;
        }
        if (!ConnectOptions || !ConnectOptions.name || !newUrl) {
          return;
        }
        let newQuery: any = new URI(newUrl).query(true);
        if (!newQuery.con) {
          newQuery['con'] = ConnectOptions.name;
          $location.search(newQuery);
        }
      });
    }

    // clean up local storage upon logout
    preLogoutTasks.addTask('CleanupJvmConnectCredentials', () => {
      log.debug("Clean up credentials from JVM connection settings in local storage");
      let connectionsJson = localStorage[connectionSettingsKey];
      if (!connectionsJson) {
        return;
      }
      let connections: Core.ConnectOptions[] = angular.fromJson(connectionsJson);
      connections.forEach((connection) => {
        delete connection.userName;
        delete connection.password;
      });
    });

    let builder = HawtioNav.builder();
    let tab = builder.id('jvm')
      .href(() => '/jvm')
      .title(() => 'Connect')
      .isValid(() => ConnectOptions == null || ConnectOptions.name == null)
      .build();
    HawtioNav.add(tab);
    helpRegistry.addUserDoc('jvm', 'plugins/jvm/doc/help.md');
    preferencesRegistry.addTab("Connect", 'plugins/jvm/html/reset.html');
    preferencesRegistry.addTab("Jolokia", "plugins/jvm/html/jolokia-preferences.html");
  }

  hawtioPluginLoader.addModule(pluginName);
}
