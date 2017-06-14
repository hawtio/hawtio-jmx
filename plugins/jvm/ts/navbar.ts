/// <reference path="./jvmPlugin.ts"/>

namespace JVM {

  _module.controller("JVM.NavController", ["$scope", "$location", "workspace", ($scope, $location, workspace) => {
    JVM.configureScope($scope, $location, workspace);

    $scope.isLocalEnabled = hasLocalMBean(workspace);
    $scope.isDiscoveryEnabled = hasDiscoveryMBean(workspace);

  }]);

}
