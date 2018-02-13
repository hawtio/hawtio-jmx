namespace Runtime {

  export function RuntimeLayoutController($location: ng.ILocationService) {
      'ngInject';

      this.tabs = [
        new Core.HawtioTab('System Properties', '/runtime/sysprops')
      ];

      this.goto = tab => {
        $location.path(tab.path);
      };
    }
  }
