/// <reference path="../../includes.ts"/>
/// <reference path="jvmPlugin.ts"/>

/**
 * @module JVM
 */
module JVM {

  _module.controller("JVM.DiscoveryController", ["$scope", "$timeout", "localStorage", "jolokia",
    ($scope, $timeout, localStorage, jolokia) => {

    $scope.discovering = true;
    $scope.agents = <any> undefined;

    $scope.$watch('agents', (newValue, oldValue) => {
      if (newValue !== oldValue) {
        $scope.selectedAgent = $scope.agents.find((a) => a['selected']);
      }
    }, true);

    $scope.closePopover = ($event) => {
      (<any>$)($event.currentTarget).parents('.popover').prev().popover('hide');
    };

    function doConnect(agent) {
      if (!agent.url) {
        $timeout(() => $scope.notification = {type: 'warning', message: 'No URL available to connect to agent'}, 0);
        $timeout(() => $scope.notification = null, 8000);
        return;
      }
      var options:Core.ConnectToServerOptions = Core.createConnectOptions();
      options.name = agent.agent_description;
      var urlObject = Core.parseUrl(agent.url);
      angular.extend(options, urlObject);
      options.userName = agent.username;
      options.password = agent.password;
      Core.connectToServer(localStorage, options);
    };

    $scope.connectWithCredentials = ($event, agent) => {
      $scope.closePopover($event);
      doConnect(agent);
    };

    $scope.gotoServer = ($event, agent) => {
      if (agent.secured) {
        (<any>$)($event.currentTarget).popover('show');
      } else {
        doConnect(agent);
      }
    };

    $scope.getElementId = (agent) => {
      return agent.agent_id.dasherize().replace(/\./g, "-");
    };

    $scope.getLogo = (agent) => {
      if (agent.server_product) {
        return JVM.logoRegistry[agent.server_product];
      }
      return JVM.logoRegistry['generic'];
    };

    $scope.filterMatches = (agent) => {
      if (Core.isBlank($scope.filter)) {
        return true;
      } else {
        var needle = $scope.filter.toLowerCase();
        var haystack = angular.toJson(agent).toLowerCase();
        return haystack.indexOf(needle) !== 0;
      }
    };

    $scope.getAgentIdClass = (agent) => {
      if ($scope.hasName(agent)) {
        return "";
      }
      return "strong";
    };

    $scope.hasName = (agent) => {
      if (agent.server_vendor && agent.server_product && agent.server_version) {
        return true;
      }
      return false;
    };

    $scope.render = (response) => {
      $scope.discovering = false;
      if (response) {
        var responseJson = angular.toJson(response, true);
        if ($scope.responseJson !== responseJson) {
          $scope.responseJson = responseJson;
          $scope.agents = response;
        }
      }
      Core.$apply($scope);
    }

    $scope.fetch = () => {
      $scope.discovering = true;
      // use 10 sec timeout
      jolokia.execute('jolokia:type=Discovery', 'lookupAgentsWithTimeout(int)', 10 * 1000, Core.onSuccess($scope.render));
    };

    $scope.fetch();
  }]);

}
