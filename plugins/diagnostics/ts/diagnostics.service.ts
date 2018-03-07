/// <reference path="../../jmx/ts/workspace.ts"/>
/// <reference path="../../jmx/ts/tree/tree.service.ts"/>

namespace Diagnostics {

  export class DiagnosticsService {
    
    constructor(private $q: ng.IQService, private treeService: Jmx.TreeService,
      private configManager: Core.ConfigManager) {
      'ngInject';
    }

    getTabs(): ng.IPromise<Nav.HawtioTab[]> {
      return this.$q.all([
        this.hasDiagnosticFunction('jfrCheck'),
        this.hasDiagnosticFunction('gcClassHistogram'),
        this.hasHotspotDiagnostic()])
      .then(results => {
        const tabs = [];
        if (results[0] && this.configManager.isRouteEnabled('/diagnostics/jfr')) {
          tabs.push(new Nav.HawtioTab('Flight Recorder', '/diagnostics/jfr'));
        }
        if (results[1] && this.configManager.isRouteEnabled('/diagnostics/heap')) {
          tabs.push(new Nav.HawtioTab('Class Histogram', '/diagnostics/heap'));
        }
        if (results[2] && this.configManager.isRouteEnabled('/diagnostics/flags')) {
          tabs.push(new Nav.HawtioTab('Hotspot Diagnostic', '/diagnostics/flags'));
        }
        return tabs;
      });
    }
    
    private hasHotspotDiagnostic(): ng.IPromise<boolean> {
      return this.treeService.treeContainsDomainAndProperties('com.sun.management', {type: 'HotSpotDiagnostic'});
    }
  
    private hasDiagnosticFunction(operation: string): ng.IPromise<boolean> {
      return this.treeService.findMBeanWithProperties('com.sun.management', {type: 'DiagnosticCommand'})
        .then((diagnostics: Folder) => diagnostics && diagnostics.mbean && diagnostics.mbean.op && !!diagnostics.mbean.op[operation]);
    }
  
    findMyPid(title) {
      //snatch PID from window title
      const regex = /pid:(\d+)/g;
      const pid = regex.exec(title);
      if (pid && pid[1]) {
        return pid[1];
      } else {
        return null;
      }
    }

  }  

}
