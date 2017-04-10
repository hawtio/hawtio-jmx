/// <reference path="../workspace.d.ts" />
/// <reference path="operations.service.d.ts" />
/// <reference path="operation.d.ts" />
declare module Jmx {
    class OperationsController {
        private $scope;
        private $location;
        private workspace;
        private jolokiaUrl;
        private operationsService;
        config: any;
        actionButtons: any[];
        menuActions: any[];
        operations: Operation[];
        constructor($scope: any, $location: any, workspace: Core.Workspace, jolokiaUrl: any, operationsService: OperationsService);
        $onInit(): void;
        private configureListView();
        private buildJolokiaUrl(operation);
        private fetchOperations();
        gotoOperation(operation: any): void;
    }
    const operationsComponent: {
        templateUrl: string;
        controller: typeof OperationsController;
    };
}
