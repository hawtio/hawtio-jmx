/// <reference path="../../jmx/ts/folder.ts"/>
/// <reference path="../../jmx/ts/workspace.ts"/>

namespace Runtime {

  export class RuntimeService {

    constructor(private workspace: Jmx.Workspace, private configManager: Core.ConfigManager) {
      'ngInject';
    }

    getTabs() {

      const tabs = [];
      if (this.configManager.isRouteEnabled('/runtime/overview')) {
        tabs.push(new Core.HawtioTab('Overview', '/runtime/overview'));
      }
      if (this.configManager.isRouteEnabled('/runtime/systemProperties')) {
        tabs.push(new Core.HawtioTab('System Properties', '/runtime/systemProperties'));
      }
      if (this.configManager.isRouteEnabled('/runtime/metrics')) {
        tabs.push(new Core.HawtioTab('Metrics', '/runtime/metrics'));
      }
      return tabs;
    }
  }

}