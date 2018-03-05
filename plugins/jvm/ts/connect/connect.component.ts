/// <reference path="connect.service.ts"/>

namespace JVM {

  export class ConnectController {
    connections: ConnectOptions[] = [];
    promise: ng.IPromise<any>;
    
    toolbarConfig = {
      actionsConfig: {
        primaryActions: [
          { name: 'Add connection', actionFn: () => this.addConnection() }
        ]
      }
    };

    listConfig = {
      selectionMatchProp: 'name',
      selectItems: false,
      showSelectBox: false
    };

    listActionButtons = [
      { name: 'Connect', actionFn: (action, connection) => this.connect(connection) }
    ];
    
    listActionDropDown = [
      { name: 'Edit', actionFn: (action, connection) => this.editConnection(connection) },
      { name: 'Delete', actionFn: (action, connection) => this.deleteConnection(connection) }
    ];

    constructor(private $interval: ng.IIntervalService, private $uibModal, private connectService: ConnectService) {
      'ngInject';
    }

    $onInit() {
      this.connections = this.connectService.getConnections();
      this.connectService.updateReachabilityFlags(this.connections);
      this.promise = this.$interval(() => this.connectService.updateReachabilityFlags(this.connections), 10000);
    }

    $onDestroy() {
      this.$interval.cancel(this.promise);
    }

    private addConnection() {
      this.$uibModal.open({
        component: 'connectEditModal',
        resolve: { connection: () => createConnectOptions({ host: 'localhost', path: 'jolokia', port: 8181 }) }
      })
      .result.then(connection => {
        this.connections.unshift(connection);
        this.connectService.saveConnections(this.connections);
        this.connectService.updateReachabilityFlag(connection);
      });
    }

    private editConnection(connection: ConnectOptions) {
      const clone = angular.extend({}, connection);
      this.$uibModal.open({
        component: 'connectEditModal',
        resolve: { connection: () => clone }
      })
      .result.then(clone => {
        angular.extend(connection, clone);
        this.connectService.saveConnections(this.connections);
        this.connectService.updateReachabilityFlag(connection);
      });
    }

    private deleteConnection(connection: ConnectOptions) {
      this.$uibModal.open({
        component: 'connectDeleteModal'
      })
      .result.then(() => {
        this.connections = _.without(this.connections, connection);
        this.connectService.saveConnections(this.connections);
      });
    }

    private connect(connection: ConnectOptions) {
      if (connection.reachable) {
        this.connectService.connect(connection);
      } else {
        this.$uibModal.open({
          component: 'connectUnreachableModal'
        });
      }
    }
  }

  export const connectComponent: angular.IComponentOptions = {
    templateUrl: 'plugins/jvm/html/connect.html',
    controller: ConnectController
  };

}
