namespace Runtime {

  export function RuntimeLayoutController($location: ng.ILocationService, workspace: Jmx.Workspace) {
      'ngInject';

      this.tabs = [
        new Core.HawtioTab('System Properties', '/runtime/sysprops'),
        new Core.HawtioTab('Metrics', '/runtime/metrics')
      ];

      if (workspace.treeContainsDomainAndProperties('java.lang', { type: 'Threading' })) {
        this.tabs.push(new Core.HawtioTab('Threads', '/runtime/threads'));
      }

      this.goto = tab => {
        $location.path(tab.path);
      };
    }
  }
