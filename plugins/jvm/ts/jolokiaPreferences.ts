/// <reference path="../../includes.ts"/>
/// <reference path="./jvmPlugin.ts"/>

module JVM {

  _module.controller("JVM.JolokiaPreferences", ["$scope", "localStorage", "jolokiaParams", "$window", ($scope, localStorage, jolokiaParams, $window) => {

    var config = {
      properties: {
        updateRate: {
          type: 'number',
          description: 'The period between polls to jolokia to fetch JMX data',
          enum: {
            'Off': 0,
            '5 Seconds': '5000',
            '10 Seconds': '10000',
            '30 Seconds': '30000',
            '60 seconds': '60000'
          }
        },
        maxDepth: {
          type: 'number',
          description: 'The number of levels jolokia will marshal an object to json on the server side before returning'
        },
        maxCollectionSize: {
          type: 'number',
          description: 'The maximum number of elements in an array that jolokia will marshal in a response'
        }
      }
    };

    $scope.entity = $scope;
    $scope.config = config;

    Core.initPreferenceScope($scope, localStorage, {
      'updateRate': {
        'value': 5000,
        'post': (newValue) => {
          $scope.$emit('UpdateRate', newValue);
        }
      },
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
