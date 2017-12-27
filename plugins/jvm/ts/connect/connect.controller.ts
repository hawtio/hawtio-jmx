/// <reference path="../../../jmx/ts/workspace.ts"/>

namespace JVM {

  export function ConnectController($scope, $location: ng.ILocationService, localStorage: Storage,
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
        test: {ok: false, message: null},
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
      const connection: Core.ConnectOptions = model.connection;
      const originalConnection: Core.ConnectOptions = model.originalConnection;
      
      let errors = validateConnectionForm(connection);
      
      if (Object.keys(errors).length === 0) {
        // save connection without username and password values
        connection.userName = '';
        connection.password = '';

        connectService.testConnection(connection)
        .then(successMesssage => {
          connection.secure = false;
        })
        .catch(errorMesssage => {
          connection.secure = true;
        });
        
        if (model.isAddAction()) {
          $scope.connections.unshift(connection);
        } else {
          angular.extend(originalConnection, connection);
        }
        
        saveConnections($scope.connections);
        
        modalInstance.close();
      } else {
        model.errors = errors;
      }
    }

    $scope.testConnection = function(connection: Core.ConnectOptions) {
      connectService.testConnection(connection)
        .then(successMesssage => {
          $scope.model.test.ok = true;
          $scope.model.test.message = successMesssage;
        })
        .catch(errorMesssage => {
          $scope.model.test.ok = false;
          $scope.model.test.message = errorMesssage;
        });
    };

    $scope.resetTestConnection = function() {
      $scope.model.test.ok = false;
      $scope.model.test.message = null;
    }

    function deleteConnection(action, connection: Core.ConnectOptions) {
      $uibModal.open({
        templateUrl: 'plugins/jvm/html/connect-delete-warning.html'
      })
      .result.then(() => {
        $scope.connections.splice($scope.connections.indexOf(connection), 1);
        saveConnections($scope.connections);
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
      $scope.showErrorMessage = false;
      if (connection.secure) {
        $scope.connection = angular.extend({}, connection);
        modalInstance = $uibModal.open({
          templateUrl: 'plugins/jvm/html/connect-login.html',
          scope: $scope
        });
      } else {
        connectService.connect(connection);
      }
    }

    $scope.login = function(connection: Core.ConnectOptions) {
      connectService.connect(connection);
      connectService.testConnection(connection)
      .then(successMesssage => {
        modalInstance.close();
      })
      .catch(errorMesssage => {
        $scope.showErrorMessage = true;
      });
    }

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

    $scope.connections = loadConnections();    
  }

}
