/// <reference path="./jvmPlugin.ts"/>

namespace JVM {
  
  _module.controller("JVM.ResetController", ["$scope", "localStorage", ($scope, localStorage) => {
    
    $scope.showAlert = false;

    $scope.doClearConnectSettings = () => {
      delete localStorage[JVM.connectControllerKey];
      delete localStorage[JVM.connectionSettingsKey];
      $scope.showAlert = true;
    };

  }]);

}
