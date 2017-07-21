namespace Jmx {

  export class DashboardController {

    dashboardUrl: string;

    constructor(private $sce: ng.ISCEService, private workspace: Workspace,
        private dashboardService: DashboardService) {
      'ngInject';
    }

    $onInit() {
      let nodeSelection = this.workspace.getSelectedMBean();
      if (nodeSelection) {
        console.log(nodeSelection['mbean']['attr']);
        this.dashboardService.configureGrafanaDashboard(nodeSelection)
          .then(response => {
            let slug = response.data['meta']['slug'];
            let url = `http://localhost:3000/dashboard/db/${slug}?orgId=1&kiosk=1&theme=light`;
            this.dashboardUrl = this.$sce.trustAsResourceUrl(url);
          })
          .catch(response => console.error(response));
      }
    }

  }

  export const dashboardComponent: angular.IComponentOptions = {
    templateUrl: 'plugins/jmx/html/dashboard.html',
    controller: DashboardController
  };

}
