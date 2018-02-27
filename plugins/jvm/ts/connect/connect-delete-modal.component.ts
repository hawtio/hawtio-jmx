namespace JVM {

  export class ConnectDeleteModalController {
    modalInstance: any;

    cancel() {
      this.modalInstance.dismiss();
    }

    deleteConnection() {
      this.modalInstance.close();
    }
  }

  export const connectDeleteModalComponent: angular.IComponentOptions = {
    bindings: {
      modalInstance: '<'
    },
    template: `
      <div class="modal-header">
        <button type="button" class="close" aria-label="Close" ng-click="$ctrl.cancel()">
          <span class="pficon pficon-close" aria-hidden="true"></span>
        </button>
        <h4>Are you sure?</h4>
      </div>
      <div class="modal-body">
        <p>You are about to delete this connection.</p>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-default" ng-click="$ctrl.cancel()">Cancel</button>
        <button type="button" class="btn btn-danger" ng-click="$ctrl.deleteConnection()">Delete</button>
      </div>
    `,
    controller: ConnectDeleteModalController
  };

}
