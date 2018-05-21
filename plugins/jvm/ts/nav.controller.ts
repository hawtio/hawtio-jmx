/// <reference path="./jvmPlugin.ts"/>

namespace JVM {

  export function NavController($scope, $location: ng.ILocationService, workspace: Jmx.Workspace,
    configManager: Core.ConfigManager) {
    'ngInject';

    JVM.configureScope($scope, $location, workspace);
  
    $scope.isLocalEnabled = configManager.isRouteEnabled('/jvm/local') && hasLocalMBean(workspace);
    $scope.isDiscoveryEnabled = configManager.isRouteEnabled('/jvm/discover') && hasDiscoveryMBean(workspace);
  }

}
