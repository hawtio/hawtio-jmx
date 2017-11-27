/**
 * @namespace RBAC
 * @main RBAC
 */
/// <reference path="../../jmx/ts/workspace.ts"/>
/// <reference path="../../jvm/ts/jolokiaService.ts"/>
/// <reference path="rbacHelpers.ts"/>
/// <reference path="rbacTasks.ts"/>
/// <reference path="rbac.directive.ts"/>
/// <reference path="rbac.service.ts"/>

namespace RBAC {

  export const _module = angular
    .module(pluginName, [])
    .directive('hawtioShow', HawtioShow.factory)
    .service('rbacTasks', RBACTasksFactory.create)
    .service('rbacACLMBean', RBACACLMBeanFactory.create);

  _module.run(["jolokia", "jolokiaStatus", "rbacTasks", "preLogoutTasks", "workspace", "$rootScope", (
    jolokia: Jolokia.IJolokia,
    jolokiaStatus: JVM.JolokiaStatus,
    rbacTasks: RBACTasks,
    preLogoutTasks: Core.Tasks,
    workspace: Jmx.Workspace,
    $rootScope) => {

    preLogoutTasks.addTask("resetRBAC", () => {
      log.debug("Resetting RBAC tasks");
      rbacTasks.reset();
      workspace.removeNamedTreePostProcessor(TREE_POSTPROCESSOR_NAME);
    });

    // add info to the JMX tree if we have access to invoke on mbeans
    // or not
    rbacTasks.addTask("JMXTreePostProcess", () => {
      workspace.addNamedTreePostProcessor(TREE_POSTPROCESSOR_NAME, (tree) => {
        rbacTasks.getACLMBean().then((mbean) => {
          let mbeans = {};
          flattenMBeanTree(mbeans, tree);
          let requests = [];
          let bulkRequest = {};
          if (jolokiaStatus.listMethod != JVM.JolokiaListMethod.LIST_WITH_RBAC) {
            _.forEach(mbeans, (value, key) => {
              if (!('canInvoke' in value)) {
                requests.push({
                  type: 'exec',
                  mbean: mbean,
                  operation: 'canInvoke(java.lang.String)',
                  arguments: [key]
                });
                if (value.mbean && value.mbean.op) {
                  let ops: Core.JMXOperations = value.mbean.op;
                  value.mbean.opByString = {};
                  let opList = [];
                  _.forEach(ops, (op: any, opName: string) => {

                    function addOp(opName: string, op: Core.JMXOperation) {
                      let operationString = Core.operationToString(opName, op.args);
                      // enrich the mbean by indexing the full operation string so we can easily look it up later
                      value.mbean.opByString[operationString] = op;
                      opList.push(operationString);
                    }
                    if (_.isArray(op)) {
                      _.forEach(op, (op) => addOp(opName, op));
                    } else {
                      addOp(opName, op);
                    }
                  });
                  bulkRequest[key] = opList;
                }
              }
            });
            requests.push({
              type: 'exec',
              mbean: mbean,
              operation: 'canInvoke(java.util.Map)',
              arguments: [bulkRequest]
            });
            jolokia.request(requests, Core.onSuccess((response) => {
              let mbean = response.request.arguments[0];
              if (mbean && _.isString(mbean)) {
                mbeans[mbean]['canInvoke'] = response.value;
                let toAdd: string = "cant-invoke";
                if (response.value) {
                  toAdd = "can-invoke";
                }
                mbeans[mbean]['addClass'] = stripClasses(mbeans[mbean]['addClass']);
                mbeans[mbean]['addClass'] = addClass(mbeans[mbean]['addClass'], toAdd);
              } else {
                let responseMap = response.value;
                _.forEach(responseMap, (operations, mbeanName) => {
                  _.forEach(operations, (data, operationName) => {
                    mbeans[mbeanName].mbean.opByString[operationName]['canInvoke'] = data['CanInvoke'];
                  });
                });
              }
            }, {
                error: (response) => {
                  // silently ignore
                }
              }));
          } else {
            // we already have everything related to RBAC in place, except 'addClass' property
            _.forEach(mbeans, (mbean, mbeanName) => {
              let toAdd: string = "cant-invoke";
              if (mbean.mbean && mbean.mbean.canInvoke) {
                toAdd = "can-invoke";
              }
              mbeans[mbeanName]['addClass'] = stripClasses(mbeans[mbeanName]['addClass']);
              mbeans[mbeanName]['addClass'] = addClass(mbeans[mbeanName]['addClass'], toAdd);
            });
          }
        });
      });
    });
  }]);

  hawtioPluginLoader.addModule(pluginName);
}
