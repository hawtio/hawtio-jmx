/// <reference path="../workspace.ts"/>
/// <reference path="operations.service.ts"/>
/// <reference path="operation.ts"/>

module Jmx {

  export class OperationsController {

    config: any;
    actionButtons: any[];
    menuActions: any[];
    operations: Operation[];

    constructor(private $scope, private $location, private workspace: Core.Workspace, private jolokiaUrl,
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
      this.actionButtons = [
        {
          name: 'Copy',
          class: 'btn-copy',
          title: 'Copy method name',
          actionFn: (action, item) => {
            let clipboard = new window.Clipboard('.btn-copy', {
              text: function(trigger) {
                return item.simpleName;
              }
            });
            setTimeout(() => clipboard.destroy(), 1000);
          }
        }
      ];
      this.menuActions = [
        {
          name: 'Copy Jolokia URL',
          actionFn: (action, item) => {
            let clipboard = new window.Clipboard('.jmx-operations-list-view .dropdown-menu a', {
              text: trigger => this.buildJolokiaUrl(item)
            });
            setTimeout(() => clipboard.destroy(), 1000);
          }
        }
      ];
    }

    private buildJolokiaUrl(operation) {
      return this.jolokiaUrl + '/exec/' + this.workspace.getSelectedMBeanName() + '/' + operation.simpleName;
    }

    private fetchOperations() {
      let objectName = this.workspace.getSelectedMBeanName();
      if (objectName) {
        this.operationsService.getOperations(objectName)
          .then(operations => this.operations = operations);
      }
    }

  }

  export const operationsComponent = {
    templateUrl: 'plugins/jmx/html/operations.html',
    controller: OperationsController
  };

}
