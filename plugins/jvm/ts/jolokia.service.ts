namespace JVM {

  export class JolokiaService {

    constructor(private $q: ng.IQService, private jolokia: Jolokia.IJolokia) {
      'ngInject';
    }
    
    getAttribute(mbean: string, attribute: string): ng.IPromise<any> {
      return this.$q((resolve, reject) => {
        this.jolokia.request(
          { type: 'read', mbean: mbean, attribute: attribute },
          { success: response => resolve(response.value) },
          { error: response => {
              log.error(`JolokiaService.getAttribute('${mbean}', '${attribute}') failed. Error: ${response.error}`);
              reject(response.error);
            }
          });
      });
    }

  }

  _module.service("jolokiaService", JolokiaService);

}