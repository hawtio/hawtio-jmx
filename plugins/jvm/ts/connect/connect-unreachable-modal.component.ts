namespace JVM {

  export class ConnectUnreachableModalController {
    modalInstance: any;

    ok() {
      this.modalInstance.close();
    }
  }

  export const connectUnreachableModalComponent: angular.IComponentOptions = {
    bindings: {
      modalInstance: '<'
    },
    template: `
      <div class="modal-header">
        <button type="button" class="close" aria-label="Close" ng-click="$ctrl.ok()">
          <span class="pficon pficon-close" aria-hidden="true"></span>
        </button>
        <h4>Can't connect</h4>
      </div>
      <div class="modal-body">
        <p>This Jolokia endpoint is unreachable. Please check the connection details and try again.</p>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-primary" ng-click="$ctrl.ok()">OK</button>
      </div>
    `,
    controller: ConnectUnreachableModalController
  };

}
