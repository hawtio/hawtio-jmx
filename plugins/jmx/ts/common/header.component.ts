/// <reference path="../jmxPlugin.ts"/>

namespace Jmx {

  export class HeaderController {
    title: string;

    constructor($rootScope) {
      'ngInject';
      $rootScope.$on('jmxTreeClicked', (event, selectedNode) => {
        this.title = selectedNode.title;
      });
    }
  }

  export const headerComponent = {
    template: `<h1>{{$ctrl.title}}</h1>`,
    controller: HeaderController
  };

}
