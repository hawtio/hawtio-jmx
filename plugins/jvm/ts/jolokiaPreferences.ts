/// <reference path="../../includes.ts"/>
/// <reference path="./jvmPlugin.ts"/>

module JVM {

  _module.controller("JVM.JolokiaPreferences", ["$scope", "localStorage", "jolokiaParams", "$window", ($scope, localStorage, jolokiaParams, $window) => {

    Core.initPreferenceScope($scope, localStorage, {
      'maxDepth': {
        'value': DEFAULT_MAX_DEPTH,
        'converter': parseInt,
        'formatter': parseInt,
        'post': (newValue) => {
          jolokiaParams.maxDepth = newValue;
          localStorage['jolokiaParams'] = angular.toJson(jolokiaParams);
        }
      },
      'maxCollectionSize': {
        'value': DEFAULT_MAX_COLLECTION_SIZE,
        'converter': parseInt,
        'formatter': parseInt,
        'post': (newValue) => {
          jolokiaParams.maxCollectionSize = newValue;
          localStorage['jolokiaParams'] = angular.toJson(jolokiaParams);
        }
      }
    });

    $scope.reboot = () => {
      $window.location.reload();
    }
  }]);
}
