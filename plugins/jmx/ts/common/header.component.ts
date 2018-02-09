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
    template: `
      <div class="jmx-header">
        <h1>
          {{$ctrl.title}}
          <small class="text-muted">{{$ctrl.objectName}}</small>
        </h1>
      </div>
      `,
    controller: HeaderController
  };

}
