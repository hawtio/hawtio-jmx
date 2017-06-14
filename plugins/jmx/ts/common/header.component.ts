/// <reference path="../jmxPlugin.ts"/>

namespace Jmx {

  export class HeaderController {
    title: string;

    constructor($scope) {
      'ngInject';
      $scope.$on('jmxTreeClicked', (event, selectedNode: NodeSelection) => {
        this.title = selectedNode.text;
      });
    }
  }

  export const headerComponent = <angular.IComponentOptions>{
    template: `<h1>{{$ctrl.title}}</h1>`,
    controller: HeaderController
  };

}
