/**
 * @namespace RBAC
 * @main RBAC
 */
/// <reference path="../../jmx/ts/workspace.ts"/>
/// <reference path="../../jvm/ts/jolokiaService.ts"/>
/// <reference path="models.ts"/>
/// <reference path="rbacHelpers.ts"/>
/// <reference path="rbac.directive.ts"/>
/// <reference path="rbac.service.ts"/>
/// <reference path="jmxTreeProcessor.ts"/>

namespace RBAC {

  export const _module = angular
    .module(pluginName, [])
    .directive('hawtioShow', HawtioShow.factory)
    .service('rbacTasks', RBACTasksFactory.create)
    .service('rbacACLMBean', RBACACLMBeanFactory.create);

  _module.run(["jolokia", "jolokiaStatus", "rbacTasks", "preLogoutTasks", "workspace", (
    jolokia: Jolokia.IJolokia,
    jolokiaStatus: JVM.JolokiaStatus,
    rbacTasks: RBACTasks,
    preLogoutTasks: Core.Tasks,
    workspace: Jmx.Workspace) => {

    preLogoutTasks.addTask("resetRBAC", () => {
      log.debug("Resetting RBAC tasks");
      rbacTasks.reset();
      workspace.removeNamedTreePostProcessor(TREE_POSTPROCESSOR_NAME);
    });

    // add info to the JMX tree if we have access to invoke on mbeans
    // or not
    let processor = new JmxTreeProcessor(jolokia, jolokiaStatus, rbacTasks, workspace);
    rbacTasks.addTask("JMXTreePostProcess",
      () => workspace.addNamedTreePostProcessor(TREE_POSTPROCESSOR_NAME,
        (tree) => processor.process(tree)));
  }]);

  hawtioPluginLoader.addModule(pluginName);
}
