/// <reference path="diagnostics.service.ts"/>

namespace Diagnostics {

  export class DiagnosticsController {
    tabs: Nav.HawtioTab[];

    constructor(private $location: ng.ILocationService, private diagnosticsService: DiagnosticsService) {
      'ngInject';
    }

    $onInit() {
      this.diagnosticsService.getTabs()
        .then(tabs => this.tabs = tabs);
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
