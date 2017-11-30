/// <reference path="../workspace.ts"/>
/// <reference path="operations.service.ts"/>
/// <reference path="operation.ts"/>

namespace Jmx {

  export class OperationsController {

    config: any;
    menuActions: { name: string, actionFn: (any, Operation) => void }[];
    operations: Operation[];

    constructor(private $scope, private $location, private workspace: Workspace, private jolokiaUrl: string,
      private operationsService: OperationsService) {
      'ngInject';
    }

    $onInit() {
      this.configureListView();
      this.fetchOperations();
    }

    private configureListView() {
      this.config = {
        showSelectBox: false,
        useExpandingRows: true
      };
      this.menuActions = [
        {
          name: 'Copy method name',
          actionFn: (action, item: Operation) => {
            let clipboard = new window.Clipboard('.jmx-operations-list-view .dropdown-menu a', {
              text: (trigger) => item.readableName
            });
            setTimeout(() => clipboard.destroy(), 1000);
          }
        },
        {
          name: 'Copy Jolokia URL',
          actionFn: (action, item: Operation) => {
            let clipboard = new window.Clipboard('.jmx-operations-list-view .dropdown-menu a', {
              text: (trigger) => this.buildJolokiaUrl(item)
            });
            setTimeout(() => clipboard.destroy(), 1000);
          }
        }
      ];
    }

    private buildJolokiaUrl(operation: Operation): string {
      let mbeanName = Core.escapeMBean(this.workspace.getSelectedMBeanName());
      return `${this.jolokiaUrl}/exec/${mbeanName}/${operation.name}`;
    }

    private fetchOperations() {
      let objectName = this.workspace.getSelectedMBeanName();
      if (objectName) {
        this.operationsService.getOperations(objectName)
          .then(operations => this.operations = operations);
      }
    }

  }

}
