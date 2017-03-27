/**
* @module Jmx
*/
/// <reference path="./jmxPlugin.ts"/>

module Jmx {

  const JAVA_TYPE_DEFAULT_VALUES = {
    'boolean': false,
    'int': 0,
    'long': 0,
    'java.lang.Boolean': false,
    'java.lang.Integer': 0,
    'java.lang.Long': 0,
    'java.lang.String': ''
  }

  // IOperationControllerScope
  _module.controller("Jmx.OperationController", ["$scope", "workspace", "jolokia", "$timeout", "$location", "localStorage", "$browser", ($scope,
    workspace: Workspace,
    jolokia,
    $timeout,
    $location,
    localStorage,
    $browser) => {
    $scope.item = $scope.selectedOperation;
    $scope.desc = $scope.item.desc;
    $scope.operationResult = '';
    $scope.mode = "text";
    $scope.entity = {};
    $scope.formConfig = {
      properties: {}
    };

    var url = $location.protocol() + "://" + $location.host() + ":" + $location.port() + $browser.baseHref();
    $scope.jolokiaUrl = url + localStorage["url"] + "/exec/" + workspace.getSelectedMBeanName() + "/" + $scope.item.name;

    $scope.item.args.forEach((arg) => {
      $scope.formConfig.properties[arg.name] = {
        type: arg.type,
        tooltip: arg.desc,
        help: "Type: " + arg.type
      }
    });

    $timeout(() => {
      $("html, body").animate({ scrollTop: 0 }, "medium");
    }, 250);

    var sanitizeArgs = (args) => {
      if (args) {
        args.forEach(function (arg) {
          switch (arg.type) {
            case "int":
            case "long":
              arg.formType = "number";
              break;
            default:
              arg.formType = "text";
          }
        });
      }

      return args;
    };

    $scope.args = sanitizeArgs($scope.item.args);

    $scope.dump = (data) => {
      console.log(data);
    };


    $scope.ok = () => {
      $scope.operationResult = '';
    };


    $scope.reset = () => {
      $scope.entity = {};
      $scope.operationResult = '';
    };

    $scope.close = () => {
      $scope.$parent.showInvoke = false;
    };


    $scope.handleResponse = (response) => {
      $scope.operationStatus = "success";

      if (response === null || 'null' === response) {
        $scope.operationResult = "Operation Succeeded!";
      } else if (typeof response === 'string') {
        $scope.operationResult = response;
      } else {
        $scope.operationResult = angular.toJson(response, true);
      }

      $scope.mode = CodeEditor.detectTextFormat($scope.operationResult);

      Core.$apply($scope);
    };

    $scope.onSubmit = (json, form) => {
      log.debug("onSubmit: json:", json, " form: ", form);
      log.debug("$scope.item.args: ", $scope.item.args);
      angular.forEach(json, (value, key) => {
        $scope.item.args.find((arg) => {
          return arg['name'] === key;
        }).value = value;
      });
      $scope.execute();
    };


    $scope.execute = () => {
      var node = workspace.selection;

      if (!node) {
        return;
      }

      var objectName = node.objectName;

      if (!objectName) {
        return;
      }

      var args = [objectName, $scope.item.name];
      if ($scope.item.args) {
        $scope.item.args.forEach(function (arg) {
          let value = $scope.entity[arg.name] || JAVA_TYPE_DEFAULT_VALUES[arg.type];
          args.push(value);
        });
      }

      args.push(Core.onSuccess($scope.handleResponse, {
        error: function (response) {
          $scope.operationStatus = "error";
          var error = response.error;
          $scope.operationResult = error;
          var stacktrace = response.stacktrace;
          if (stacktrace) {
            $scope.operationResult = stacktrace;
          }
          Core.$apply($scope);
        }
      }));

      console.log(args);

      var fn = jolokia.execute;
      fn.apply(jolokia, args);
    };

  }]);


  _module.controller("Jmx.OperationsController", ["$scope", "workspace", "jolokia", "rbacACLMBean", "$templateCache", ($scope,
    workspace: Workspace,
    jolokia,
    rbacACLMBean: ng.IPromise<string>,
    $templateCache) => {

    $scope.fetched = false;
    $scope.operations = [];
    $scope.objectName = '';
    $scope.methodFilter = '';
    $scope.workspace = workspace;
    $scope.selectedOperation = null;
    $scope.showInvoke = false;
    $scope.template = "";

    $scope.invokeOp = (operation) => {
      if (!$scope.canInvoke(operation)) {
        return;
      }
      $scope.selectedOperation = operation;
      $scope.showInvoke = true;
    };

    $scope.getJson = (operation) => {
      return angular.toJson(operation, true);
    };

    $scope.cancel = () => {
      $scope.selectedOperation = null;
      $scope.showInvoke = false;
    };

    $scope.$watch('showInvoke', (newValue, oldValue) => {
      if (newValue !== oldValue) {
        if (newValue) {
          $scope.template = $templateCache.get("operationTemplate");
        } else {
          $scope.template = "";
        }
      }
    });

    var fetch = <() => void>Core.throttled(() => {
      var node = workspace.selection;
      if (!node) {
        return;
      }

      $scope.objectName = node.objectName;
      if (!$scope.objectName) {
        return;
      }

      $scope.title = node.title;

      jolokia.request({
        type: 'list',
        path: Core.escapeMBeanPath($scope.objectName)
      }, Core.onSuccess(render));
    }, 500);

    function getArgs(args) {
      return "(" + args.map(arg => arg.type).join() + ")";
    }

    function getArgType(arg) {
      let lastDotIndex = arg.type.lastIndexOf('.');
      if (lastDotIndex > 0) {
        return arg.type.substr(lastDotIndex + 1);
      } else {
        return arg.type;
      }
    }

    function toDisplayName(operationName: string) {
      let startParamsIndex = operationName.indexOf('(') + 1;
      let endParamsIndex = operationName.indexOf(')');
      if (startParamsIndex === endParamsIndex) {
        return operationName;
      } else {
        let paramsStr = operationName.substring(startParamsIndex, endParamsIndex);
        let params = paramsStr.split(',');
        let simpleParams = params.map(param => {
          let lastDotIndex = param.lastIndexOf('.');
          return lastDotIndex > 0 ? param.substr(lastDotIndex + 1) : param;
        });
        let simpleParamsStr = simpleParams.join(', ');
        let simpleOperationName = operationName.replace(paramsStr, simpleParamsStr);
        return simpleOperationName;
      }
    }

    $scope.doFilter = (item) => {
      let filterTextLowerCase = $scope.methodFilter.toLowerCase();
      return Core.isBlank($scope.methodFilter) ||
        item.name.toLowerCase().indexOf(filterTextLowerCase) !== -1;
    };

    $scope.canInvoke = (operation) => {
      if (!('canInvoke' in operation)) {
        return true;
      } else {
        return operation['canInvoke'];
      }
    };

    $scope.$watch('workspace.selection', (newValue, oldValue) => {
      if (!workspace.selection || workspace.moveIfViewInvalid()) {
        return;
      }
      fetch();
    });

    function fetchPermissions(objectName, operations: any[]) {
      var map = {};
      map[objectName] = [];

      angular.forEach(operations, (operation) => {
        map[objectName].push(operation.name);
      });

      rbacACLMBean.then((rbacACLMBean) => {
        jolokia.request({
          type: 'exec',
          mbean: rbacACLMBean,
          operation: 'canInvoke(java.util.Map)',
          arguments: [map]
        }, Core.onSuccess((response) => {
          var map = response.value;
          console.log(map);
          angular.forEach(map[objectName], (value, key) => {
            operations[key]['canInvoke'] = value['CanInvoke'];
          });
          log.debug("Got operations: ", $scope.operations);
          Core.$apply($scope);
        }, {
            error: (response) => {
              // silently ignore
              log.debug("Failed to fetch ACL for operations: ", response);
              Core.$apply($scope);
            }
          }));
      });

    }

    function createOperation(key, value) {
      let name = key + getArgs(value.args);
      return angular.extend({
        name: name,
        displayName: toDisplayName(name)
      }, value);
    }

    function render(response) {
      $scope.fetched = true;
      var operations = [];

      angular.forEach(response.value.op, function(value, key) {
        if (angular.isArray(value)) {
          angular.forEach(value, function(item) {
            operations.push(createOperation(key, item));
          });
        } else {
          operations.push(createOperation(key, value));
        }
      });
      
      if (operations.length > 0) {
        fetchPermissions($scope.objectName, operations);
      }

      $scope.operations = _.sortBy(operations, operation => operation.displayName);
      Core.$apply($scope);
    }

  }]);
}