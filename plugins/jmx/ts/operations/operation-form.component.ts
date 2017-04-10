/// <reference path="../workspace.ts"/>
/// <reference path="operations.service.ts"/>
/// <reference path="operation.ts"/>

module Jmx {

  export class OperationFormController {

    operation;
    formFields;
    editorMode = 'text';
    operationFailed: boolean;
    operationResult: string;

    constructor(private workspace: Core.Workspace, private operationsService: OperationsService) {
      'ngInject';
      this.formFields = this.operation.args.map(arg => ({
        label: arg.name,
        type: OperationFormController.convertToHtmlInputType(arg.type),
        helpText: OperationFormController.buildHelpText(arg),
        value: OperationFormController.getDefaultValue(arg.type)
      }));
    }

    private static buildHelpText(arg: OperationArgument) {
      if (arg.desc && arg.desc !== arg.name) {
        if (arg.desc.charAt(arg.desc.length - 1) !== '.') {
          arg.desc = arg.desc + '.';
        }
        arg.desc = arg.desc + ' ';
      } else {
        arg.desc = '';
      }
      return arg.desc + 'Type: ' + arg.type;
    }

    private static convertToHtmlInputType(javaType: string): string {
      switch (javaType) {
        case 'boolean':
        case 'java.lang.Boolean':
          return 'checkbox';
        case 'int':
        case 'long':
        case 'java.lang.Integer':
        case 'java.lang.Long':
          return 'number';
        default:
          return 'text';
      }
    }

    private static getDefaultValue(javaType: string): any {
      switch (javaType) {
        case 'boolean':
        case 'java.lang.Boolean':
          return false;
        case 'int':
        case 'long':
        case 'java.lang.Integer':
        case 'java.lang.Long':
          return 0;
        default:
          return '';
      }
    }

    execute() {
      let mbeanName = this.workspace.getSelectedMBeanName();
      let argValues = this.formFields.map(formField => formField.value);
      this.operationsService.executeOperation(mbeanName, this.operation, argValues)
        .then(result => {
          this.operationFailed = false;
          this.operationResult = result.trim();
        })
        .catch(error => {
          this.operationFailed = true;
          this.operationResult = error.trim();
        });
    }

    cancel() {
      this.operation.isExpanded = false;
    }

  }

  export const operationFormComponent = {
    bindings: {
      operation: '<'
    },
    templateUrl: 'plugins/jmx/html/operation-form.html',
    controller: OperationFormController
  };

}
