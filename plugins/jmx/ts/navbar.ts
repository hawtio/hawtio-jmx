/// <reference path="jmxPlugin.ts"/>
module Jmx {

  export var NavBarController = _module.controller("Jmx.NavBarController", ["$scope", "$location", "workspace", "$route", "jolokia", "localStorage", ($scope, $location:ng.ILocationService, workspace:Workspace, $route, jolokia, localStorage) => {

    $scope.hash = workspace.hash();
    $scope.topLevelTabs = [];
    $scope.subLevelTabs = workspace.subLevelTabs;
    $scope.currentPerspective = null;
    $scope.localStorage = localStorage;
    $scope.recentConnections = [];

    $scope.goTo = (destination) => {
      //Logger.debug("going to: " + destination);
      $location.url(destination);
    };

    $scope.$watch('hash', (newValue, oldValue) => {
      if (newValue !== oldValue) {
        log.debug("hash changed from ", oldValue, " to ", newValue);
      }
    });

    // when we change the view/selection lets update the hash so links have the latest stuff
    $scope.$on('$routeChangeSuccess', function () {
      $scope.hash = workspace.hash();
    });

    $scope.isValid = (nav) => {
      if ('isValid' in nav) {
        return nav.isValid(workspace);
      }
      return true;
    }

    // use includePerspective = false as default as that was the previous behavior
    $scope.link = (nav, includePerspective = false) => {
      var href;
      if (angular.isString(nav)) {
        href = nav;
      } else {
        href = angular.isObject(nav) ? nav.href() : null;
      }
      href = href || "";
      var removeParams = ['tab', 'nid', 'chapter', 'pref', 'q'];
      if (!includePerspective && href) {
        if (href.indexOf("?p=") >= 0 || href.indexOf("&p=") >= 0) {
          removeParams.push("p");
        }
      }
      return Core.createHref($location, href, removeParams);
    };

    $scope.fullScreenLink = () => {
      var href = "#" + $location.path() + "?tab=notree";
      return Core.createHref($location, href, ['tab']);
    };

    $scope.addToDashboardLink = () => {
      var href = "#" + $location.path() + workspace.hash();

      var answer =  "#/dashboard/add?tab=dashboard&href=" + encodeURIComponent(href);

      if ($location.url().has("/jmx/charts")) {
        var size = {
          size_x: 4,
          size_y: 3
        };

        answer += "&size=" + encodeURIComponent(angular.toJson(size));
      }

      return answer;
    };

    $scope.isActive = (nav) => {
      if (angular.isString(nav))
        return workspace.isLinkActive(nav);
      var fn = nav.isActive;
      if (fn) {
        return fn(workspace);
      }
      return workspace.isLinkActive(nav.href());
    };

    $scope.isTopTabActive = (nav) => {
      if (angular.isString(nav))
        return workspace.isTopTabActive(nav);
      var fn = nav.isActive;
      if (fn) {
        return fn(workspace);
      }
      return workspace.isTopTabActive(nav.href());
    };

    $scope.activeLink = () => {
      var tabs = $scope.topLevelTabs();
      if (!tabs) {
        return "Loading...";
      }
      var tab = tabs.find(function(nav) {
        return $scope.isActive(nav);
      });
      return tab ? tab['content'] : "";
    };

  }]);

}
