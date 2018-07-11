namespace JVM {

  export class JolokiaService {

    constructor(private $q: ng.IQService, private jolokia: Jolokia.IJolokia) {
      'ngInject';
    }

    getMBean(objectName: string): ng.IPromise<any> {
      return this.$q((resolve, reject) => {
        this.jolokia.request(
          { type: 'read', mbean: objectName },
          Core.onSuccess(
            response => {
              resolve(response.value)
            }, {
              error: response => {
                log.error(`JolokiaService.getMBean('${objectName}') failed. Error: ${response.error}`);
                reject(response.error);
              }
            }
          )
        );
      });
    }

    getMBeans(objectNames: string[]): ng.IPromise<any[]> {
      return this.$q((resolve, reject) => {
        if (objectNames.length === 0) {
          return resolve([]);
        } else {
          let requests = objectNames.map(mbeanName => ({ type: 'read', mbean: mbeanName }));
          let mbeans = [];
          this.jolokia.request(requests,
            Core.onSuccess(
              response => {
                mbeans.push(response.value);
                if (mbeans.length === requests.length) {
                  resolve(mbeans);
                }
              }, {
                error: response => {
                  log.error(`JolokiaService.getMBeans('${objectNames}') failed. Error: ${response.error}`);
                  reject(response.error);
                }
              }
            )
          );
        }
      });
    }

    getAttribute(objectName: string, attribute: string): ng.IPromise<any> {
      return this.$q((resolve, reject) => {
        this.jolokia.request(
          { type: 'read', mbean: objectName, attribute: attribute },
          Core.onSuccess(
            response => {
              resolve(response.value)
            }, {
              error: response => {
                log.error(`JolokiaService.getAttribute('${objectName}', '${attribute}') failed. Error: ${response.error}`);
                reject(response.error);
              }
            }
          )
        );
      });
    }

    getAttributes(objectName: string, attributes: string[]): ng.IPromise<object> {
      return this.$q((resolve, reject) => {
        this.jolokia.request(
          { type: 'read', mbean: objectName, attribute: attributes },
          Core.onSuccess(
            response => {
              resolve(response.value)
            }, {
              error: response => {
                log.error(`JolokiaService.getAttributes('${objectName}', '${attributes}') failed. Error: ${response.error}`);
                reject(response.error);
              }
            }
          )
        );
      });
    }

    setAttribute(objectName: string, attribute: string, value: any): ng.IPromise<any> {
      return this.$q((resolve, reject) => {
        this.jolokia.request(
          { type: 'write', mbean: objectName, attribute: attribute, value },
          Core.onSuccess(
            response => {
              resolve(response.value)
            }, {
              error: response => {
                log.error(`JolokiaService.setAttribute('${objectName}', '${attribute}', '${value}') failed. Error: ${response.error}`);
                reject(response.error);
              }
            }
          )
        );
      });
    }

    setAttributes(objectName: string, attributes: string[], values: any[]): ng.IPromise<any[]> {
      return this.$q((resolve, reject) => {
        if (attributes.length != values.length) {
          return resolve([]);
        } else {
          const requests = attributes.map((attribute: string, index: number) => ({type: 'write', mbean: objectName, attribute: attribute, value: values[index]}))
          const results = [];
          this.jolokia.request(requests,
            Core.onSuccess(
              response => {
                results.push(response.value);
                if (results.length === requests.length) {
                  resolve(results);
                }
              }, {
                error: response => {
                  log.error(`JolokiaService.setAttributes('${objectName}', '${attributes}', '${values}') failed. Error: ${response.error}`);
                  reject(response.error);
                }
              }
            )
          );
        }
      });
    }

    execute(objectName: string, operation: string, ...args: any[]): ng.IPromise<any> {
      return this.$q((resolve, reject) => {
        this.jolokia.request(
          { type: 'exec', mbean: objectName, operation: operation, arguments: args },
          Core.onSuccess(
            response => {
              resolve(response.value)
            }, {
              error: response => {
                log.error(`JolokiaService.execute('${objectName}', '${operation}', '${args}') failed. Error: ${response.error}`);
                reject(response.error);
              }
            }
          )
        );
      });
    }

    executeMany(objectNames: string[], operation: string, ...args: any[]): ng.IPromise<any[]> {
      return this.$q((resolve, reject) => {
        if (objectNames.length === 0) {
          return resolve([]);
        } else {
          const requests = objectNames.map(objectName => ({ type: 'exec', mbean: objectName, operation: operation, arguments: args }));
          const results = [];
          this.jolokia.request(requests,
            Core.onSuccess(
              response => {
                results.push(response.value);
                if (results.length === requests.length) {
                  resolve(results);
                }
              }, {
                error: response => {
                  log.error(`JolokiaService.executeMany('${objectNames}', '${operation}', '${args}') failed. Error: ${response.error}`);
                  reject(response.error);
                }
              }
            )
          );
        }
      });
    }

    search(mbeanPattern: string): ng.IPromise<any> {
      return this.$q((resolve, reject) => {
        this.jolokia.request(
          { type: 'search', mbean: mbeanPattern },
          Core.onSuccess(
            response => {
              resolve(response.value)
            }, {
              error: response => {
                log.error(`JolokiaService.search('${mbeanPattern}') failed. Error: ${response.error}`);
                reject(response.error);
              }
            }
          )
        );
      });
    }
  }

}
