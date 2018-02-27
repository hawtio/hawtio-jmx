namespace JVM {

  export class ConnectEditModalController {

    modalInstance: any;
    resolve: { connection:ConnectOptions };
    connection: ConnectOptions;
    errors = {};
    test = {ok: false, message: null};

    constructor(private connectService: ConnectService) {
      'ngInject';
    }

    $onInit() {
      this.connection = this.resolve.connection;
    }

    testConnection(connection: ConnectOptions) {
      this.connectService.testConnection(connection)
        .then(ok => {
          this.test.ok = ok;
          this.test.message = ok ? 'Connected successfully' : 'Connection failed';
        });
    };
    
    cancel() {
      this.modalInstance.dismiss();
    }

    saveConnection(connection) {
      this.errors = this.validateConnection(connection);
      
      if (Object.keys(this.errors).length === 0) {
        this.modalInstance.close(this.connection);
      }
    }

    private validateConnection(connection: ConnectOptions): {} {
      let errors = {};
      if (connection.name === null || connection.name.trim().length === 0) {
        errors['name'] = 'Please fill out this field';
      }
      if (connection.host === null || connection.host.trim().length === 0) {
        errors['host'] = 'Please fill out this field';
      }
      if (connection.port !== null && connection.port < 0 || connection.port > 65535) {
        errors['port'] = 'Please enter a number from 0 to 65535';
      }
      return errors;
    }
  }

  export const connectEditModalComponent: angular.IComponentOptions = {
    bindings: {
      modalInstance: '<',
      resolve: '<'
    },
    templateUrl: 'plugins/jvm/html/connect-edit.html',
    controller: ConnectEditModalController
  };

}
