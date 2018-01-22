/**
 * @module Diagnostics
 */
namespace Runtime {


export function RuntimeLayoutController($location, runtimeService) {
    'ngInject';

    this.tabs = runtimeService.getTabs();

    this.goto = (tab: Core.HawtioTab) => {
      $location.path(tab.path);
    }
  }

}
