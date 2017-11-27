/**
 * @namespace RBAC
 */
namespace RBAC {

  export interface RBACTasks extends Core.Tasks {
    initialize(mbean: string): void;
    getACLMBean(): ng.IPromise<string>;
  }

}
