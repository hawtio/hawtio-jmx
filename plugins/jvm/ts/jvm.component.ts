namespace JVM {

  export class JvmController {
    tabs: Nav.HawtioTab[];

    constructor(private workspace: Jmx.Workspace, configManager: Core.ConfigManager) {
      'ngInject';
      this.tabs = [new Nav.HawtioTab('Remote', '/jvm/connect')];
      if (configManager.isRouteEnabled('/jvm/local') && hasLocalMBean(workspace)) {
        this.tabs.push(new Nav.HawtioTab('Local', '/jvm/local'));
      }
      if (configManager.isRouteEnabled('/jvm/discover') && hasDiscoveryMBean(workspace)) {
        this.tabs.push(new Nav.HawtioTab('Discover', '/jvm/discover'));
      }
    }
  }

  export const jvmComponent: angular.IComponentOptions = {
    template: '<hawtio-tabs-layout tabs="$ctrl.tabs"></hawtio-tabs-layout>',
    controller: JvmController
  };

}
