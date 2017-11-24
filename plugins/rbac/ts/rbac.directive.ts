/// <reference path="../../jmx/ts/workspace.ts"/>
/// <reference path="rbacPlugin.ts"/>
namespace RBAC {

  const MBEAN_ONLY = 'canInvoke(java.lang.String)';
  const OVERLOADED_METHOD = 'canInvoke(java.lang.String,java.lang.String)';
  const EXACT_METHOD = 'canInvoke(java.lang.String,java.lang.String,[Ljava.lang.String;)';

  const HIDE = 'hide';
  const REMOVE = 'remove';
  const INVERSE = 'inverse';

  function getOp(objectName: string, methodName: string, argumentTypes: string): string {
    let answer: string = MBEAN_ONLY;
    if (!Core.isBlank(methodName)) {
      answer = OVERLOADED_METHOD;
    }
    if (!Core.isBlank(argumentTypes)) {
      answer = EXACT_METHOD;
    }
    return answer;
  }

  function getArguments(op: string, objectName: string, methodName: string, argumentTypes: string): Array<string> {
    let arguments = [];
    if (op === MBEAN_ONLY) {
      arguments.push(objectName);
    } else if (op === OVERLOADED_METHOD) {
      arguments.push(objectName);
      arguments.push(methodName);
    } else if (op === EXACT_METHOD) {
      arguments.push(objectName);
      arguments.push(methodName);
      arguments.push(argumentTypes.split(',').map((s) => s.trim()));
    }
    return arguments;
  }

  /**
   * Directive that sets an element's visibility to hidden if the user cannot invoke the supplied operation
   * @type {ng.IModule|ng.ICompileProvider}
   */
  export const hawtioShow = _module.directive('hawtioShow', ['workspace', (workspace: Jmx.Workspace) => {
    return {
      restrict: 'A',
      replace: false,
      link: (scope: ng.IScope, element: ng.IAugmentedJQuery, attr: ng.IAttributes) => {
        let objectName = attr['objectName'];
        if (!objectName) {
          return;
        }
        function applyInvokeRights(value: boolean, mode: string) {
          if (value) {
            if (mode === INVERSE) {
              element.css({
                display: 'none'
              });
            }
          } else {
            if (mode === REMOVE) {
              element.css({
                display: 'none'
              });
            } else if (mode === HIDE) {
              element.css({
                visibility: 'hidden'
              });
            }
          }
        };
        scope.$watch(() => {
          let methodName = attr['methodName'];
          let argumentTypes = attr['argumentTypes'];
          let mode = attr['mode'] || HIDE;
          let op = getOp(objectName, methodName, argumentTypes);
          let args = getArguments(op, objectName, methodName, argumentTypes);
          objectName = args[0];
          methodName = args[1];
          if (objectName) {
            let mbean = Core.parseMBean(objectName);
            let folder = workspace.findMBeanWithProperties(mbean.domain, mbean.attributes);
            if (folder) {
              let invokeRights;
              if (methodName) {
                invokeRights = workspace.hasInvokeRights(folder, methodName);
              } else {
                invokeRights = workspace.hasInvokeRights(folder);
              }
              applyInvokeRights(invokeRights, mode);
            }
          }
        });
      }
    };
  }]);

}
