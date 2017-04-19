/// <reference path="../../includes.ts"/>
/// <reference path="jvmPlugin.ts"/>

/**
 * @module JVM
 */
module JVM {

  interface ConnectControllerScope extends ng.IScope {
    disableProxy: boolean;
    connections: Core.ConnectOptions[];
    newConnection: () => void;
    deleteConnection: (connection: Core.ConnectOptions) => void;
    saveConnections: () => void;
    toggleSecondaryActions: (connection: Core.ConnectOptions) => void;
    hideSecondaryActions: (connection: Core.ConnectOptions) => void;
    connect: (connection: Core.ConnectOptions) => void;
  }

  export var ConnectController = _module.controller("JVM.ConnectController", ["$scope", "$location",
      "localStorage", "workspace", "$http", "$timeout", ($scope:ConnectControllerScope,
      $location:ng.ILocationService, localStorage:WindowLocalStorage, workspace:Jmx.Workspace,
      $http:ng.IHttpService, $timeout: ng.ITimeoutService) => {

    JVM.configureScope($scope, $location, workspace);

    $http.get('proxy').then((resp) => {
      if (resp.status === 200 && Core.isBlank(<string>resp.data)) {
        $scope.disableProxy = false;
      } else {
        $scope.disableProxy = true;
      }
    });

    var hasMBeans = false;

    workspace.addNamedTreePostProcessor('ConnectTab', (tree) => {
      hasMBeans = workspace && workspace.tree && workspace.tree.children && workspace.tree.children.length > 0;
      $scope.disableProxy = !hasMBeans || Core.isChromeApp();
      Core.$apply($scope);
    });

    // load connections
    $scope.connections = Core.loadConnections();
    $scope.connections.forEach(connection => connection['expanded'] = false);
    
    $scope.newConnection = () => {
      let connection = Core.createConnectOptions({
        name: 'Untitled connection',
        scheme: 'http',
        host: 'localhost',
        path: 'jolokia',
        port: 8181,
        userName: '',
        password: '',
        expanded: true,
        showSecondaryActions: false
      });
      $scope.connections.unshift(connection);
      $scope.saveConnections();
    };

    $scope.deleteConnection = (connection: Core.ConnectOptions) => {
      $scope.connections.splice($scope.connections.indexOf(connection), 1);
      $scope.saveConnections();
    };

    $scope.saveConnections = () => {
      Core.saveConnections($scope.connections);
    };

    $scope.toggleSecondaryActions = (connection: any) => {
      connection.showSecondaryActions = !connection.showSecondaryActions;
    }

    $scope.hideSecondaryActions = (connection: any) => {
      $timeout(function() { connection.showSecondaryActions = false; }, 200);
    }

    $scope.connect = (connection: Core.ConnectOptions) => {
      // connect to root by default as we do not want to show welcome page
      connection.view = connection.view || '#/';
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

  }]);
}
