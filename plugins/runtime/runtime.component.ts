/// <reference path="runtime.service.ts"/>

namespace Runtime {

  export class RuntimeController {
    tabs: Nav.HawtioTab[];

    constructor(private $location: ng.ILocationService, private runtimeService: RuntimeService) {
      'ngInject';
    }

    $onInit() {
      this.runtimeService.getTabs()
        .then(tabs => this.tabs = tabs);
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
