/// <reference path="../jmxPlugin.ts"/>
/// <reference path="common.controller.ts"/>

namespace Jmx {

  export const headerComponent: angular.IComponentOptions = {
    templateUrl: 'plugins/jmx/html/common/header.html',
    controller: HeaderController
  };

  export const tabComponent: angular.IComponentOptions = {
    templateUrl: 'plugins/jmx/html/common/tab.html',
    controller: TabController
  };

}
