/// <reference path="diagnostics.service.ts"/>

namespace Diagnostics {

  export class DiagnosticsController {
    tabs: Nav.HawtioTab[];

    constructor(private $scope: ng.IScope, private $location: ng.ILocationService,
      private workspace: Jmx.Workspace, private diagnosticsService: DiagnosticsService) {
      'ngInject';
    }

    $onInit() {
      if (this.workspace.tree.children.length > 0) {
        this.tabs = this.diagnosticsService.getTabs();
      } else {
        this.$scope.$on('jmxTreeUpdated', () => {
          this.tabs = this.diagnosticsService.getTabs();
        });
      }
    }

    goto(tab: Nav.HawtioTab) {
      this.$location.path(tab.path);
    }
  }

  export const diagnosticsComponent: angular.IComponentOptions = {
    template: `
      <div class="nav-tabs-main">
        <hawtio-tabs tabs="$ctrl.tabs" on-change="$ctrl.goto(tab)"></hawtio-tabs>
        <div class="contents" ng-view></div>
      </div>
    `,
    controller: DiagnosticsController
  };

}
