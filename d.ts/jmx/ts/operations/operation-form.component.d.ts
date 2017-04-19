/// <reference path="../workspace.d.ts" />
/// <reference path="operations.service.d.ts" />
/// <reference path="operation.d.ts" />
declare namespace Jmx {
    class OperationFormController {
        private workspace;
        private operationsService;
        operation: any;
        formFields: any;
        editorMode: string;
        operationFailed: boolean;
        operationResult: string;
        constructor(workspace: Workspace, operationsService: OperationsService);
        private static buildHelpText(arg);
        private static convertToHtmlInputType(javaType);
        private static getDefaultValue(javaType);
        execute(): void;
        cancel(): void;
    }
    const operationFormComponent: {
        bindings: {
            operation: string;
        };
        templateUrl: string;
        controller: typeof OperationFormController;
    };
}
