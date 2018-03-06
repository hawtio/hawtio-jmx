/// <reference path="../workspace.ts"/>
/// <reference path="operations.service.ts"/>
/// <reference path="operation.ts"/>

namespace Jmx {

  export class OperationsController {
    operations: Operation[];
    
    config = {
      showSelectBox: false,
      useExpandingRows: true
    };
    
    menuActions = [
      {
        name: 'Copy method name',
        actionFn: (action, item: Operation) => {
          let clipboard = new Clipboard('.jmx-operations-list-view .dropdown-menu a', {
            text: (trigger) => item.readableName
          });
          setTimeout(() => clipboard.destroy(), 1000);
          Core.notification('success', 'Method name copied');
        }
      },
      {
        name: 'Copy Jolokia URL',
        actionFn: (action, item: Operation) => {
          let clipboard = new Clipboard('.jmx-operations-list-view .dropdown-menu a', {
            text: (trigger) => this.buildJolokiaUrl(item)
          });
          setTimeout(() => clipboard.destroy(), 1000);
          Core.notification('success', 'Jolokia URL copied');
        }
      }
    ];

    constructor(private $scope: ng.IScope, private workspace: Jmx.Workspace, private jolokiaUrl: string,
      private operationsService: OperationsService) {
      'ngInject';
    }

    $onInit() {
      let mbeanName = this.workspace.getSelectedMBeanName();
      if (mbeanName) {
        this.loadOperations(mbeanName);
      } else {
        this.$scope.$on('jmxTreeClicked', () => {
          let mbeanName = this.workspace.getSelectedMBeanName();
          this.loadOperations(mbeanName);
        });
      }
    }

    private loadOperations(mbeanName: string): void {
      this.operationsService.getOperations(mbeanName)
      .then(operations => this.operations = operations);
    }
  
    private buildJolokiaUrl(operation: Operation): string {
      let mbeanName = Core.escapeMBean(this.workspace.getSelectedMBeanName());
      return `${this.jolokiaUrl}/exec/${mbeanName}/${operation.name}`;
    }
  }

  export const operationsComponent: angular.IComponentOptions = {
    templateUrl: 'plugins/jmx/html/operations/operations.html',
    controller: OperationsController
  };

}
