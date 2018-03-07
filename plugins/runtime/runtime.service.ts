namespace Runtime {

  export class RuntimeService {

    constructor(private treeService: Jmx.TreeService) {
      'ngInject';
    }

    getTabs(): ng.IPromise<Nav.HawtioTab[]> {
      return this.treeService.treeContainsDomainAndProperties('java.lang', { type: 'Threading' })
        .then(hasThreads => {
          const tabs = [
            new Nav.HawtioTab('System Properties', '/runtime/sysprops'),
            new Nav.HawtioTab('Metrics', '/runtime/metrics')
          ];
          if (hasThreads) {
            tabs.push(new Nav.HawtioTab('Threads', '/runtime/threads'));
          }
          return tabs;
        });
    }
  }

}
