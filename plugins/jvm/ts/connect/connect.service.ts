/// <reference path="../jvmHelpers.ts"/>

namespace JVM {

  export class ConnectService {
    
    constructor(private $q: ng.IQService, private $window: ng.IWindowService) {
      'ngInject';
    }

    testConnection(connection: Core.ConnectOptions): ng.IPromise<string> {
      return this.$q((resolve, reject) => {
        new Jolokia({
          url: Core.createServerConnectionUrl(connection),
          method: 'post',
          mimeType: 'application/json',
          username: connection.userName ? connection.userName.toString() : '',
          password: connection.password ? connection.password.toString() : '',
        }).request({
          type: 'version'
        }, {
          success: response => {
            resolve('Connected successfully');
          },
          ajaxError: response => {
            reject(response.status === 403 ? 'Incorrect username or password' : 'Connection failed');
          }
        });
      });
    };

    connect(connection: Core.ConnectToServerOptions) {
      log.debug("Connecting with options: ", StringHelpers.toString(connection));
      const url = URI('').search({con: connection.name}).toString();
      const newWindow = this.$window.open(url);
      newWindow['credentials'] = {
        username: connection.userName,
        password: connection.password
      };
    }
    
  }

}
