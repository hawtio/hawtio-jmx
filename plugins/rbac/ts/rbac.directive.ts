/// <reference path="../../jmx/ts/workspace.ts"/>

namespace RBAC {

  const MBEAN_ONLY = 'canInvoke(java.lang.String)';
  const OVERLOADED_METHOD = 'canInvoke(java.lang.String,java.lang.String)';
  const EXACT_METHOD = 'canInvoke(java.lang.String,java.lang.String,[Ljava.lang.String;)';

  const HIDE = 'hide';
  const REMOVE = 'remove';
  const INVERSE = 'inverse';

  /**
   * Directive that sets an element's visibility to hidden if the user cannot invoke the supplied operation
   */
  export class HawtioShow implements ng.IDirective {

    restrict: string;

    constructor(private workspace: Jmx.Workspace) {
      this.restrict = 'A';
    }

    static factory(workspace: Jmx.Workspace): HawtioShow {
      'ngInject';
      return new HawtioShow(workspace);
    }

    link(scope: ng.IScope, element: ng.IAugmentedJQuery, attr: ng.IAttributes): void {
      let objectName = attr['objectName'];
      if (!objectName) {
        return;
      }
      scope.$watch(() => {
        let methodName = attr['methodName'];
        let argumentTypes = attr['argumentTypes'];
        let mode = attr['mode'] || HIDE;
        let op = this.getOp(objectName, methodName, argumentTypes);
        let args = this.getArguments(op, objectName, methodName, argumentTypes);
        objectName = args[0];
        methodName = args[1];
        if (objectName) {
          let mbean = Core.parseMBean(objectName);
          let folder = this.workspace.findMBeanWithProperties(mbean.domain, mbean.attributes);
          if (folder) {
            let invokeRights;
            if (methodName) {
              invokeRights = this.workspace.hasInvokeRights(folder, methodName);
            } else {
              invokeRights = this.workspace.hasInvokeRights(folder);
            }
            this.applyInvokeRights(element, invokeRights, mode);
          }
        }
      });
    }

    private getOp(objectName: string, methodName: string, argumentTypes: string): string {
      let answer = MBEAN_ONLY;
      if (!Core.isBlank(methodName)) {
        answer = OVERLOADED_METHOD;
      }
      if (!Core.isBlank(argumentTypes)) {
        answer = EXACT_METHOD;
      }
      return answer;
    }

    private getArguments(op: string, objectName: string, methodName: string, argumentTypes: string): Array<string> {
      let args = [];
      if (op === MBEAN_ONLY) {
        args.push(objectName);
      } else if (op === OVERLOADED_METHOD) {
        args.push(objectName);
        args.push(methodName);
      } else if (op === EXACT_METHOD) {
        args.push(objectName);
        args.push(methodName);
        args.push(argumentTypes.split(',').map((s) => s.trim()));
      }
      return args;
    }

    private applyInvokeRights(element: ng.IAugmentedJQuery, value: boolean, mode: string): void {
      if (value) {
        if (mode === INVERSE) {
          element.css({ display: 'none' });
        }
      } else {
        if (mode === REMOVE) {
          element.css({ display: 'none' });
        } else if (mode === HIDE) {
          element.css({ visibility: 'hidden' });
        }
      }
    }
  }

}
