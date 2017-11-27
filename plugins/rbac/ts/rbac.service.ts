/// <reference path="rbacTasks.ts"/>

namespace RBAC {

  export const TREE_POSTPROCESSOR_NAME = "rbacTreePostprocessor";

  export class RBACTasksFactory {
    static create(postLoginTasks: Core.Tasks, jolokia: Jolokia.IJolokia, $q: ng.IQService): RBACTasks {
      'ngInject';

      let rbacTasks = new RBACTasksImpl($q.defer());

      postLoginTasks.addTask("FetchJMXSecurityMBeans", () => {
        jolokia.request(
          { type: 'search', mbean: '*:type=security,area=jmx,*' },
          Core.onSuccess((response) => {
            let mbeans = response.value;
            let chosen = "";
            if (mbeans.length === 0) {
              log.info("Didn't discover any JMXSecurity mbeans, client-side role based access control is disabled");
              return;
            } else if (mbeans.length === 1) {
              chosen = mbeans.first();
            } else if (mbeans.length > 1) {
              let picked = false;
              mbeans.forEach((mbean) => {
                if (picked) {
                  return;
                }
                if (mbean.has("HawtioDummy")) {
                  return;
                }
                if (!mbean.has("rank=")) {
                  chosen = mbean;
                  picked = true;
                }
              });
            }
            log.info("Using mbean ", chosen, " for client-side role based access control");
            rbacTasks.initialize(chosen);
          }));
      });

      return rbacTasks;
    }
  }

  export class RBACACLMBeanFactory {
    static create(rbacTasks: RBACTasks): ng.IPromise<string> {
      'ngInject';
      return rbacTasks.getACLMBean();
    }
  }

  class RBACTasksImpl extends Core.TasksImpl implements RBACTasks {

    private ACLMBean: string = null;

    public constructor(private deferred: ng.IDeferred<string>) {
      super();
    }

    public initialize(mbean: string): void {
      this.ACLMBean = mbean;
      this.deferred.resolve(this.ACLMBean);
      super.execute();
    }

    public getACLMBean(): ng.IPromise<string> {
      return this.deferred.promise;
    }
  }

}
