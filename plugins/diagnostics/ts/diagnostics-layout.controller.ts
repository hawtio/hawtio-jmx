/// <reference path="diagnostics.service.ts"/>

namespace Diagnostics {

  export function DiagnosticsLayoutController($location, diagnosticsService) {
    'ngInject';

    this.tabs = diagnosticsService.getTabs();
    
    this.goto = (tab: Nav.HawtioTab) => {
      $location.path(tab.path);
    }
  }

}
