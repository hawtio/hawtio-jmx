/// <reference path="../../../includes.ts"/>
/// <reference path="../../../jmx/ts/workspace.ts"/>

namespace JVM {

  export function ConnectController($scope, $location: ng.ILocationService, localStorage: WindowLocalStorage,
      workspace: Jmx.Workspace, $uibModal, connectService: ConnectService) {
    'ngInject';

    const VALIDATION_ERROR_REQUIRED = 'Please fill out this field';
    let modalInstance;

    $scope.config = {
      selectionMatchProp: 'name',
      selectItems: false,
      showSelectBox: false
    };

    $scope.actionButtons = [
      {
        name: 'Connect',
        actionFn: connect
      }
    ];
    
    $scope.actionDropDown = [
      {
        name: 'Edit',
        actionFn: showEditConnectionModal
      },
      {
        name: 'Delete',
        actionFn: deleteConnection
      }
    ];

    function initModel(connection: Core.ConnectOptions, originalConnection: Core.ConnectOptions = null) {
      $scope.model = {
        connection: connection,
        errors: {},
        showConnectionTestResult: false,
        connectionValid: false,
        originalConnection: originalConnection,
        isAddAction() {
          return this.originalConnection === null;
        }
      };
    }

    $scope.showAddConnectionModal = function() {
      initModel(Core.createConnectOptions({
        host: 'localhost',
        path: 'jolokia',
        port: 8181
      }));
      
      modalInstance = $uibModal.open({
        templateUrl: 'plugins/jvm/html/connect-edit.html',
        scope: $scope
      })
    };

    function showEditConnectionModal(action, connection: Core.ConnectOptions) {
      let clone = angular.extend({}, connection);
      initModel(clone, connection);
      
      modalInstance = $uibModal.open({
        templateUrl: 'plugins/jvm/html/connect-edit.html',
        scope: $scope
      })
    };

    $scope.saveConnection = function(model) {
      let errors = validateConnectionForm(model.connection);
      
      if (Object.keys(errors).length === 0) {
        if (model.isAddAction()) {
          $scope.connections.unshift(model.connection);
        } else {
          angular.extend(model.originalConnection, model.connection);
        }
        Core.saveConnections($scope.connections);
        modalInstance.close();
      } else {
        model.errors = errors;
      }
    }

    $scope.testConnection = function(connection: Core.ConnectOptions) {
      connectService.testConnection(connection)
        .then(result => {
          $scope.model.showConnectionTestResult = true;
          $scope.model.connectionValid = result;
        });
    };

    function deleteConnection(action, connection: Core.ConnectOptions) {
      let modalInstance = $uibModal.open({
        templateUrl: 'plugins/jvm/html/connect-delete-warning.html'
      })
      .result.then(() => {
        $scope.connections.splice($scope.connections.indexOf(connection), 1);
        Core.saveConnections($scope.connections);
      });
    };

    function validateConnectionForm(connection: Core.ConnectOptions): {} {
      let errors = {};
      ['name', 'host'].forEach(fieldName => {
        if (connection[fieldName] === null || connection[fieldName].trim().length === 0) {
          errors[fieldName] = VALIDATION_ERROR_REQUIRED;
        }
      });
      return errors;
    }

    function connect(action, connection: Core.ConnectOptions) {
      // connect to root by default as we do not want to show welcome page
      connection.view = connection.view || '/';
      Core.connectToServer(localStorage, connection);
    };

    var autoconnect = $location.search();
    if (typeof autoconnect != 'undefined' && typeof autoconnect.name != 'undefined') {
      var conOpts = Core.createConnectOptions({
        scheme  : autoconnect.scheme || 'http',
        host    : autoconnect.host,
        path    : autoconnect.path,
        port    : autoconnect.port,
        userName: autoconnect.userName,
        password: autoconnect.password,
        name    : autoconnect.name
      });
      $scope.connect(conOpts);
      window.close();
    }

    $scope.connections = Core.loadConnections();    
  }

}
