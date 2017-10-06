/// <reference path="tree.controller.ts"/>

namespace Jmx {

  export const tabComponent: angular.IComponentOptions = {
    templateUrl: 'plugins/jmx/html/tree/tab.html',
    controller: TabController
  };

  export const treeHeaderComponent: angular.IComponentOptions = {
    templateUrl: 'plugins/jmx/html/tree/header.html',
    controller: TreeHeaderController
  };

  export const treeComponent: angular.IComponentOptions = {
    templateUrl: 'plugins/jmx/html/tree/content.html',
    controller: TreeController
  };

}
