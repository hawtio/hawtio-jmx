namespace JVM {

  export class ConnectLoginController {

    constructor(private $uibModal, private ConnectOptions: ConnectOptions) {
      'ngInject';
    }

    $onInit() {
      this.$uibModal.open({
        backdrop: 'static',
        component: 'connectLoginModal'
      })
      .result.then(credentials => {
        window.opener.credentials = credentials;
        const url = URI('').search({ con: this.ConnectOptions.name }).toString();
        window.location.href = url;
      })
      .catch((error) => {
        window.close();
      });
    }

  }

  export const connectLoginComponent: angular.IComponentOptions = {
    controller: ConnectLoginController
  };

}
