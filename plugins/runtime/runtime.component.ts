/// <reference path="runtime.service.ts"/>

namespace Runtime {

  export class RuntimeController {
    tabs: Nav.HawtioTab[];

    constructor(private $scope: ng.IScope, private $location: ng.ILocationService, private workspace: Jmx.Workspace,
      private runtimeService: RuntimeService) {
      'ngInject';
    }

    $onInit() {
      if (this.workspace.tree.children.length > 0) {
        this.tabs = this.runtimeService.getTabs();
      } else {
        this.$scope.$on('jmxTreeUpdated', () => {
          this.tabs = this.runtimeService.getTabs();
        });
      }
    }

    goto(tab: Nav.HawtioTab) {
      this.$location.path(tab.path);
    };
  }

  export const runtimeComponent: angular.IComponentOptions = {
    template: `
      <div class="nav-tabs-main">
        <hawtio-tabs tabs="$ctrl.tabs" on-change="$ctrl.goto(tab)"></hawtio-tabs>
        <div class="contents" ng-view></div>
      </div>
    `,
    controller: RuntimeController
  };

}
