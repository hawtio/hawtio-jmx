namespace JVM {

  export class ConnectLoginController {

    constructor(private $uibModal, private $location: ng.ILocationService) {
      'ngInject';
    }

    $onInit() {
      this.$uibModal.open({
        backdrop: 'static',
        component: 'connectLoginModal'
      })
      .result.then(credentials => {
        window.opener.credentials = credentials;
        window.location.href = this.$location.search().redirect;
      })
      .catch(error => {
        window.close();
      });
    }
  }

  export const connectLoginComponent: angular.IComponentOptions = {
    controller: ConnectLoginController
  };

}
