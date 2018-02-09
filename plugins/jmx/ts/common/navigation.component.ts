namespace Jmx {

  export class NavigationController {

    constructor(private $location: ng.ILocationService) {
      'ngInject';
    }

    tabs = [
      new Core.HawtioTab('Attributes', '/jmx/attributes'),
      new Core.HawtioTab('Operations', '/jmx/operations'),
      new Core.HawtioTab('Chart', '/jmx/charts')
    ];    
    
    goto(tab: Core.HawtioTab): void {
      this.$location.path(tab.path);
    }
  }

  export const navigationComponent: angular.IComponentOptions = {
    template: '<hawtio-tabs tabs="$ctrl.tabs" on-change="$ctrl.goto(tab)"></hawtio-tabs>',
    controller: NavigationController
  };

}
