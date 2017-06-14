/// <reference path="../jvmHelpers.ts"/>

namespace JVM {

  export class ConnectService {
    
    constructor(private $q: ng.IQService, private jolokia: Jolokia.IJolokia) {
      'ngInject';
    }

    testConnection(connection: Core.ConnectOptions): ng.IPromise<boolean> {
      return this.$q((resolve, reject) => {
        let url = Core.createServerConnectionUrl(connection);
        let jolokia = new Jolokia(url);
        jolokia.version({
          success: response => {
            resolve(true);
          },
          ajaxError: response => {
            resolve(false);
          }
        });
      });
    };

  }

}
