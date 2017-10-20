/// <reference path="../jvmHelpers.ts"/>

namespace JVM {

  export class ConnectService {
    
    constructor(private $q: ng.IQService) {
      'ngInject';
    }

    testConnection(connection: Core.ConnectOptions): ng.IPromise<boolean> {
      return this.$q((resolve, reject) => {
        new Jolokia().version({
          url: Core.createServerConnectionUrl(connection),
          username: connection.userName ? connection.userName.toString() : '',
          password: connection.password ? connection.password.toString() : '',
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
