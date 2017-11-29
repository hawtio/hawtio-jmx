/// <reference path="../../../rbac/ts/models.ts"/>

namespace Jmx {

  export class AttributesService {

    constructor(
      private $q: ng.IQService,
      private jolokia: Jolokia.IJolokia,
      private rbacACLMBean: ng.IPromise<string>) {
      'ngInject';
    }

    canInvoke(mbeanName: string, attribute: string, type: string): ng.IPromise<boolean> {
      return this.$q<boolean>((resolve, reject) => {
        if (_.isNull(mbeanName) || _.isNull(attribute) || _.isNull(type)) {
          resolve(false);
          return;
        }
        this.rbacACLMBean.then((rbacACLMBean) => {
          this.jolokia.request(
            {
              type: 'exec',
              mbean: rbacACLMBean,
              operation: 'canInvoke(java.lang.String,java.lang.String,[Ljava.lang.String;)',
              arguments: [mbeanName, `set${attribute}`, [type]]
            },
            Core.onSuccess(
              (response) => {
                log.debug("rbacACLMBean canInvoke attribute response:", response);
                let canInvoke = response.value as boolean;
                resolve(canInvoke);
              },
              {
                error: (response) => {
                  log.debug('AttributesService.canInvoke() failed:', response)
                  resolve(false);
                }
              }
            )
          );
        });
      });
    }

  }

}
