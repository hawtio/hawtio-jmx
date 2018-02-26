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

    checkCredentials(connection: Core.ConnectOptions, username: string, password: string): ng.IPromise<boolean> {
      return this.$q((resolve, reject) => {
        new Jolokia({
          url: createServerConnectionUrl(connection),
          method: 'post',
          mimeType: 'application/json',
          username: username,
          password: password
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
            resolve(false);
          }
        });
      });
    };
    
    connect(connection: Core.ConnectOptions) {
      log.debug("Connecting with options: ", StringHelpers.toString(connection));
      const url = URI('').search({ con: connection.name }).toString();
      this.$window.open(url);
    }

  }

}
