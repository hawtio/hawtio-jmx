/// <reference path="../jvmHelpers.ts"/>

namespace JVM {

  export class ConnectService {

    constructor(private $q: ng.IQService, private $window: ng.IWindowService) {
      'ngInject';
    }

    testConnection(connection: Core.ConnectOptions): ng.IPromise<boolean> {
      return this.$q((resolve, reject) => {
        new Jolokia({
          url: createServerConnectionUrl(connection),
          method: 'post',
          mimeType: 'application/json'
        }).request({
          type: 'version'
        }, {
          success: response => {
            resolve(true);
          },
          error: response => {
            resolve(false);
          },
          ajaxError: response => {
            resolve(response.status === 403 ? true : false);
          }
        });
      });
    };

    connect(connection: Core.ConnectOptions) {
      log.debug("Connecting with options: ", StringHelpers.toString(connection));
      const url = URI('').search({ con: connection.name }).toString();
      const newWindow = this.$window.open(url);
      newWindow['credentials'] = {
        username: connection.userName,
        password: connection.password
      };
    }

  }

}
