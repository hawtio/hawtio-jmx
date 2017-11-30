namespace RBAC {

  export class JmxTreeProcessor {

    constructor(
      private jolokia: Jolokia.IJolokia,
      private jolokiaStatus: JVM.JolokiaStatus,
      private rbacTasks: RBACTasks,
      private workspace: Jmx.Workspace) {
    }

    process(tree: any): void {
      this.rbacTasks.getACLMBean().then((aclMBean) => {
        let mbeans = {};
        flattenMBeanTree(mbeans, tree);
        switch (this.jolokiaStatus.listMethod) {
          case JVM.JolokiaListMethod.LIST_WITH_RBAC:
            // we already have everything related to RBAC in place, except 'addClass' property
            log.debug("Process JMX tree: list with RBAC mode");
            this.processWithRBAC(mbeans);
            break;
          case JVM.JolokiaListMethod.LIST_GENERAL:
          case JVM.JolokiaListMethod.LIST_CANT_DETERMINE:
          default:
            log.debug("Process JMX tree: general mode");
            this.processGeneral(aclMBean, mbeans);
            break;
        }
      });
    }

    private processWithRBAC(mbeans: any): void {
      _.forEach(mbeans, (mbean, mbeanName) => {
        let toAdd = mbean.mbean && mbean.mbean.canInvoke ? "can-invoke" : "cant-invoke";
        mbeans[mbeanName]['addClass'] = stripClasses(mbeans[mbeanName]['addClass']);
        mbeans[mbeanName]['addClass'] = addClass(mbeans[mbeanName]['addClass'], toAdd);
      });
    }

    private processGeneral(aclMBean: string, mbeans: any): void {
      let requests = [];
      let bulkRequest = {};
      _.forEach(mbeans, (mbean, mbeanName) => {
        if (!('canInvoke' in mbean)) {
          requests.push({
            type: 'exec',
            mbean: aclMBean,
            operation: 'canInvoke(java.lang.String)',
            arguments: [mbeanName]
          });
          if (mbean.mbean && mbean.mbean.op) {
            let ops = mbean.mbean.op as Core.JMXOperations;
            mbean.mbean.opByString = {};
            let opList: string[] = [];
            _.forEach(ops, (op: any, opName: string) => {
              if (_.isArray(op)) {
                _.forEach(op, (op) => this.addOperation(mbean, opList, opName, op));
              } else {
                this.addOperation(mbean, opList, opName, op);
              }
            });
            bulkRequest[mbeanName] = opList;
          }
        }
      });
      requests.push({
        type: 'exec',
        mbean: aclMBean,
        operation: 'canInvoke(java.util.Map)',
        arguments: [bulkRequest]
      });
      this.jolokia.request(requests, Core.onSuccess(
        (response) => {
          let mbean = response.request.arguments[0];
          if (mbean && _.isString(mbean)) {
            mbeans[mbean]['canInvoke'] = response.value;
            let toAdd = response.value ? "can-invoke" : "cant-invoke";
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
        },
        { error: (response) => { /* silently ignore */ } }));
    }

    private addOperation(mbean: any, opList: string[], opName: string, op: Core.JMXOperation) {
      let operationString = Core.operationToString(opName, op.args);
      // enrich the mbean by indexing the full operation string so we can easily look it up later
      mbean.mbean.opByString[operationString] = op;
      opList.push(operationString);
    }
  }

}
