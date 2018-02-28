namespace Jmx {

  export class NavigationController {

    constructor(private $location: ng.ILocationService) {
      'ngInject';
    }

    tabs = [
      new Nav.HawtioTab('Attributes', '/jmx/attributes'),
      new Nav.HawtioTab('Operations', '/jmx/operations'),
      new Nav.HawtioTab('Chart', '/jmx/charts')
    ];    
    
    goto(tab: Nav.HawtioTab): void {
      this.$location.path(tab.path);
    }
  }

  export const navigationComponent: angular.IComponentOptions = {
    template: '<hawtio-tabs tabs="$ctrl.tabs" on-change="$ctrl.goto(tab)"></hawtio-tabs>',
    controller: NavigationController
  };

}
