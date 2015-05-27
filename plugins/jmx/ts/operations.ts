/// <reference path="jmxPlugin.ts"/>
/**
* @module Jmx
*/
module Jmx {

  // IOperationControllerScope
  _module.controller("Jmx.OperationController", ["$scope", "workspace", "jolokia", "jolokiaUrl", "$timeout", "$location", "localStorage", "$browser", ($scope,
                                      workspace:Workspace,
                                      jolokia,
                                      jolokiaUrl:string,
                                      $timeout,
                                      $location,
                                      localStorage,
                                      $browser) => {
    $scope.item = $scope.selectedOperation;
    $scope.title = $scope.item.humanReadable;
    $scope.desc = $scope.item.desc;
    $scope.operationResult = '';
    $scope.executeIcon = "fa fa-ok";
    $scope.mode = "text";
    $scope.entity = {};
    $scope.formConfig = {
      hideLegend: true,
      properties: {}
      //description: $scope.objectName + "::" + $scope.item.name
    };
    $scope.jolokiaUrl = getUrlForThing(jolokiaUrl, 'exec', workspace.getSelectedMBeanName(), $scope.item.name);

    $scope.item.args.forEach((arg) => {
      var property:any = {
        type: arg.type,
        tooltip: arg.desc,
        description: "Type: " + arg.type
      }
      if (arg.type.toLowerCase() === 'java.util.list' ||
          arg.type.toLowerCase() === '[j') {
        property.type = 'array';
        property.items = { type: 'string' };
      }
      if (arg.type.toLowerCase() === 'java.util.map') {
        property.type = 'map';
        property.items = {
          key: { type: 'string' },
          value: { type: 'string' }
        }
      }
      $scope.formConfig.properties[arg.name] = property;
    });
    log.debug("Form config: ", $scope.formConfig);

    $timeout(() => {
      $("html, body").animate({ scrollTop: 0 }, "medium");
    }, 250);

    $scope.dump = (data) => {
      console.log(data);
    };


    $scope.ok = () => {
      $scope.operationResult = '';
    };


    $scope.reset = () => {
      $scope.entity = {};
    };

    $scope.close = () => {
      $scope.$parent.showInvoke = false;
    };


    $scope.handleResponse = (response) => {
      $scope.executeIcon = "fa fa-ok";
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

    $scope.onSubmit = () => {
      var json = $scope.entity;
      log.debug("onSubmit: json:", json);
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
        $scope.item.args.forEach( function (arg) {
          args.push(arg.value);
        });
      }

      args.push(Core.onSuccess($scope.handleResponse, {
        error: function (response) {
          $scope.executeIcon = "fa fa-ok";
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

      $scope.executeIcon = "fa fa-spinner fa fa-spin";
      var fn = jolokia.execute;
      fn.apply(jolokia, args);
     };


  }]);


  _module.controller("Jmx.OperationsController", ["$scope", "workspace", "jolokia", "rbacACLMBean", "$templateCache", ($scope,
                                       workspace:Workspace,
                                       jolokia,
                                       rbacACLMBean:ng.IPromise<string>,
                                       $templateCache) => {

    $scope.fetched = false;
    $scope.operations = {};
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

    var fetch = <() => void>_.debounce(() => {
      var node = workspace.selection || workspace.getSelectedMBean();
      if (!node) {
        return;
      }

      $scope.objectName = node.objectName;
      if (!$scope.objectName) {
        return;
      }

      jolokia.request({
        type: 'list',
        path:  Core.escapeMBeanPath($scope.objectName)
      }, Core.onSuccess(render));
    }, 100, { trailing: true });

    function getArgs(args) {
      return "(" + args.map(function(arg) {return arg.type}).join() + ")";
    }

    function sanitize (value) {
      for (var item in value) {
        item = "" + item;
        value[item].name = item;
        value[item].humanReadable = Core.humanizeValue(item);
      }
      return value;
    }

    $scope.isOperationsEmpty = () => {
      return $.isEmptyObject($scope.operations);
    };

    $scope.doFilter = (item) => {
      if (Core.isBlank($scope.methodFilter)) {
        return true;
      }
      if (item.name.toLowerCase().has($scope.methodFilter.toLowerCase())
          || item.humanReadable.toLowerCase().has($scope.methodFilter.toLowerCase())) {
        return true;
      }
      return false;
    };

    $scope.canInvoke = (operation) => {
      if (!('canInvoke' in operation)) {
        return true;
      } else {
        return operation['canInvoke'];
      }
    };

    $scope.getClass = (operation) => {
      if ($scope.canInvoke(operation)) {
        return 'can-invoke';
      } else {
        return 'cant-invoke';
      }
    };

    $scope.$watch('workspace.selection', (newValue, oldValue) => {
      if (workspace.moveIfViewInvalid()) {
        return;
      }
      fetch();
    });

    function fetchPermissions(objectName, operations) {
      var map = {};
      map[objectName] = [];

      angular.forEach(operations, (value, key) => {
        map[objectName].push(value.name);
      });

      rbacACLMBean.then((rbacACLMBean) => {
        jolokia.request({
          type: 'exec',
          mbean: rbacACLMBean,
          operation: 'canInvoke(java.util.Map)',
          arguments: [map]
        }, Core.onSuccess((response) => {
          var map = response.value;
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

    function render(response) {
      $scope.fetched = true;
      var ops = response.value.op;
      var answer = {};

      angular.forEach(ops, function(value, key) {
        if (angular.isArray(value)) {
          angular.forEach(value, function(value, index) {
            answer[key + getArgs(value.args)] = value;
          });
        } else {
          answer[key + getArgs(value.args)] = value;
        }
      });
      $scope.operations = sanitize(answer);
      if ($scope.isOperationsEmpty()) {
        Core.$apply($scope);
      } else {
        fetchPermissions($scope.objectName, $scope.operations);
        Core.$apply($scope);
      }
    }

  }]);
}
