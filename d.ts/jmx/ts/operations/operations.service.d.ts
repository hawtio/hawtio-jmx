/// <reference path="operation.d.ts" />
declare namespace Jmx {
    class OperationsService {
        private $q;
        private jolokia;
        private rbacACLMBean;
        constructor($q: ng.IQService, jolokia: Jolokia.IJolokia, rbacACLMBean: ng.IPromise<string>);
        getOperations(mbeanName: string): ng.IPromise<Operation[]>;
        private loadOperations(mbeanName);
        getOperation(mbeanName: string, operationName: any): ng.IPromise<Operation>;
        executeOperation(mbeanName: string, operation: Operation, argValues?: any[]): ng.IPromise<string>;
    }
}
