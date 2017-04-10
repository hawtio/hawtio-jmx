/// <reference path="operation.ts"/>

namespace Jmx {

  export class OperationsService {
    
    constructor(private $q: ng.IQService, private jolokia: Jolokia.IJolokia,
      private rbacACLMBean: ng.IPromise<string>) {
      'ngInject';
    }

    getOperations(mbeanName: string): ng.IPromise<Operation[]> {
      return this.loadOperations(mbeanName)
        .then(operations => _.sortBy(operations, operation => operation.simpleName));
    }

    private loadOperations(mbeanName: string): ng.IPromise<Operation[]> {
      return this.$q((resolve, reject) => {
        this.jolokia.request({
          type: 'list',
          path: Core.escapeMBeanPath(mbeanName)
        }, {
          success: function(response) {
            let operations = [];

            angular.forEach(response.value.op, function(value, key) {
              if (angular.isArray(value)) {
                angular.forEach(value, function(item) {
                  operations.push(new Operation(key, item.args, item.desc));
                });
              } else {
                operations.push(new Operation(key, value.args, value.desc));
              }
            });

            resolve(operations);
          }
        }, {
          error: (response) => {
            log.debug('OperationsService.loadOperations() failed: ' + response.error);
          }
        });
      });
    }

    getOperation(mbeanName: string, operationName): ng.IPromise<Operation> {
      return this.getOperations(mbeanName)
        .then(operations => _.find(operations, operation => operation.name === operationName));
    }

    executeOperation(mbeanName: string, operation: Operation, argValues: any[] = []): ng.IPromise<string> {
      return this.$q((resolve, reject) => {
        this.jolokia.execute(mbeanName, operation.name, ...argValues, {
          success: response => {
            if (response === null || response === 'null') {
              resolve('Operation Succeeded!');
            } else if (typeof response === 'string') {
              resolve(response);
            } else {
              resolve(angular.toJson(response, true));
            }
          },
          error: response => reject(response.stacktrace ? response.stacktrace : response.error)
        });
      });
    };

    // TODO
    // private fetchPermissions(operations: Operation[], objectName: string): ng.IPromise<Operation[]> {
    //   return this.$q((resolve, reject) => {
    //     this.rbacACLMBean
    //       .then(rbacACLMBean => {
    //         let map = {};
    //         map[objectName] = operations.map(operation => operation.name);
            
    //         this.jolokia.request({
    //           type: 'exec',
    //           mbean: rbacACLMBean,
    //           operation: 'canInvoke(java.util.Map)',
    //           arguments: [map]
    //         }, {
    //           success: function(response) {
    //             let map = response.value;
    //             angular.forEach(map[objectName], (value, key) => {
    //               operations[key]['canInvoke'] = value['CanInvoke'];
    //             });
    //             resolve(operations);
    //           }
    //         }, {
    //           error: (response) => {
    //             log.debug('OperationsService.fetchPermissions() failed: ' + response.error);
    //           }
    //         });
    //       });
    //   });
    // }

  }

}