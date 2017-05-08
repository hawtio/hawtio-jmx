/// <reference path="../../includes.ts"/>
/// <reference path="./jvmPlugin.ts"/>

/**
 * @module JVM
 */
module JVM {

  _module.controller("JVM.NavController", ["$scope", "$location", "workspace", ($scope, $location, workspace) => {
    JVM.configureScope($scope, $location, workspace);

    $scope.isLocalEnabled = hasLocalMBean(workspace);
    $scope.isDiscoveryEnabled = hasDiscoveryMBean(workspace);

  }]);

}
