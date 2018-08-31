/// <reference path="../jvmHelpers.ts"/>

namespace JVM {

  export class ConnectService {

    constructor(private $q: ng.IQService, private $window: ng.IWindowService, private $location: ng.ILocationService) {
      'ngInject';
    }

    getConnections(): ConnectOptions[] {
      const connectionsJson = this.$window.localStorage.getItem(connectionSettingsKey);
      return connectionsJson ? JSON.parse(connectionsJson) : [];
    }

    updateReachableFlags(connections: ConnectOptions[]): ng.IPromise<ConnectOptions[]> {
      const promises = connections.map(connection => this.testConnection(connection));
      return this.$q.all(promises)
        .then(reachableFlags => {
          for (let i = 0; i < connections.length; i++) {
            connections[i].reachable = reachableFlags[i];
          }
          return connections;
        });
    }

    updateReachableFlag(connection: ConnectOptions): ng.IPromise<ConnectOptions> {
      return this.testConnection(connection)
        .then(reachable => {
          connection.reachable = reachable;
          return connection;
        });
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

    getDefaultOptions(): ConnectOptions {
      return {
        port: this.getBrowserUrlPortNumber(),
        path: this.getBrowserUrlContextPath() + '/jolokia'
      };
    }

    private getBrowserUrlPortNumber(): number {
      let port = null;
      try {
        const uri = URI(this.$location.absUrl());
        if (uri.port()) {
          port = parseInt(uri.port());
        }
      } catch (error) {
        log.error(error);
      }
      return port;
    }

    private getBrowserUrlContextPath(): string {
      let contextPath = null;
      try {
        const uri = URI(this.$location.absUrl());
        const uriPath = uri.path();
        const locationPath = this.$location.path();
        contextPath = uriPath.slice(0, uriPath.indexOf(locationPath));
      } catch (error) {
        log.error(error);
      }
      return contextPath;
    }

  }

}
