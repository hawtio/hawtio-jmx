namespace Runtime {

  export function RuntimeLayoutController($location: ng.ILocationService) {
      'ngInject';

      this.tabs = [
        new Core.HawtioTab('System Properties', '/runtime/sysprops'),
        new Core.HawtioTab('Metrics', '/runtime/metrics')
      ];

      this.goto = tab => {
        $location.path(tab.path);
      };
    }
  }
