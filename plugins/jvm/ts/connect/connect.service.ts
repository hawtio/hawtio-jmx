/// <reference path="../jvmHelpers.ts"/>

namespace JVM {

  export class ConnectService {
    
    constructor(private $q: ng.IQService, private jolokia: Jolokia.IJolokia) {
      'ngInject';
    }

    testConnection(connection: Core.ConnectOptions): ng.IPromise<boolean> {
      return this.$q((resolve, reject) => {
        this.jolokia.version({
          url: Core.createServerConnectionUrl(connection),
          username: connection.userName.toString(),
          password: connection.password.toString(),
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
