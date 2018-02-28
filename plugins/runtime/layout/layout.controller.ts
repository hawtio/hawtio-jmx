namespace Runtime {

  export function RuntimeLayoutController($location: ng.ILocationService, workspace: Jmx.Workspace) {
      'ngInject';

      this.tabs = [
        new Nav.HawtioTab('System Properties', '/runtime/sysprops'),
        new Nav.HawtioTab('Metrics', '/runtime/metrics')
      ];

      if (workspace.treeContainsDomainAndProperties('java.lang', { type: 'Threading' })) {
        this.tabs.push(new Nav.HawtioTab('Threads', '/runtime/threads'));
      }

      this.goto = tab => {
        $location.path(tab.path);
      };
    }
  }
