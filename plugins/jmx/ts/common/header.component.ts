/// <reference path="../folder.ts"/>

namespace Jmx {

  export class HeaderController {
    title: string;
    objectName: string;

    constructor($scope) {
      'ngInject';
      $scope.$on('jmxTreeClicked', (event, selectedNode: NodeSelection) => {
        this.title = selectedNode.text;
        this.objectName = selectedNode.objectName;
      });
    }
  }

  export const headerComponent: angular.IComponentOptions = {
    templateUrl: 'plugins/jmx/html/common/header.html',
    controller: HeaderController
  };

}
