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
        this.flattenMBeanTree(mbeans, tree);
        switch (this.jolokiaStatus.listMethod) {
          case JVM.JolokiaListMethod.LIST_WITH_RBAC:
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

    private flattenMBeanTree(mbeans: any, tree: any): void {
      if (!Core.isBlank(tree.objectName)) {
        mbeans[tree.objectName] = tree;
      }
      if (tree.children && tree.children.length > 0) {
        tree.children.forEach((child) => this.flattenMBeanTree(mbeans, child));
      }
    }

    private processWithRBAC(mbeans: any): void {
      // we already have everything related to RBAC in place, except 'addClass' property
      _.forEach(mbeans, (mbean, mbeanName) => {
        let toAdd = mbean.mbean && mbean.mbean.canInvoke ? "can-invoke" : "cant-invoke";
        mbeans[mbeanName]['addClass'] = this.stripClasses(mbeans[mbeanName]['addClass']);
        mbeans[mbeanName]['addClass'] = this.addClass(mbeans[mbeanName]['addClass'], toAdd);
      });
      log.debug("Processed tree mbeans with RBAC", mbeans);
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
            mbeans[mbean]['addClass'] = this.stripClasses(mbeans[mbean]['addClass']);
            mbeans[mbean]['addClass'] = this.addClass(mbeans[mbean]['addClass'], toAdd);
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

    private stripClasses(css: string): string {
      if (Core.isBlank(css)) {
        return css;
      }
      let parts = css.split(" ");
      let answer = [];
      parts.forEach((part) => {
        if (part !== "can-invoke" && part !== "cant-invoke") {
          answer.push(part);
        }
      });
      return answer.join(" ").trim();
    }

    private addClass(css: string, _class: string): string {
      if (Core.isBlank(css)) {
        return _class;
      }
      let parts = css.split(" ");
      parts.push(_class);
      return _.uniq(parts).join(" ").trim();
    }

  }

}
