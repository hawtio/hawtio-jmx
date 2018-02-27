/// <reference path="../jvmHelpers.ts"/>

namespace JVM {

  export class ConnectService {

    constructor(private $q: ng.IQService, private $window: ng.IWindowService) {
      'ngInject';
    }

    getConnections(): ConnectOptions[] {
      const connectionsJson = this.$window.localStorage.getItem(connectionSettingsKey);
      return connectionsJson ? JSON.parse(connectionsJson) : [];
    }

    saveConnections(connections: ConnectOptions[]) {
      this.$window.localStorage.setItem(connectionSettingsKey, JSON.stringify(connections));
    }

    testConnection(connection: ConnectOptions): ng.IPromise<boolean> {
      return this.$q((resolve, reject) => {
        try {
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
        } catch (error) {
          resolve(false);
        }
      });
    };

    checkCredentials(connection: ConnectOptions, username: string, password: string): ng.IPromise<boolean> {
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
    
    connect(connection: ConnectOptions) {
      log.debug("Connecting with options: ", StringHelpers.toString(connection));
      const url = URI('').search({ con: connection.name }).toString();
      this.$window.open(url);
    }

  }

}
