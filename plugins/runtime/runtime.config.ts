namespace Runtime {

  export function configureRoutes($routeProvider: angular.route.IRouteProvider) {
    'ngInject';

    $routeProvider
      .when('/runtime', {redirectTo: '/runtime/sysprops'})
      .when('/runtime/sysprops', {template: '<runtime-system-properties></runtime-system-properties>'})
      .when('/runtime/metrics', {template: '<runtime-metrics></runtime-metrics>'})
  }

  export function configureRuntime($rootScope: ng.IScope,
                                   viewRegistry,
                                   helpRegistry: Help.HelpRegistry,
                                   workspace: Jmx.Workspace) {
    'ngInject';

    viewRegistry['runtime'] = 'plugins/runtime/layout/layout.html';

    helpRegistry.addUserDoc('runtime', 'plugins/runtime/doc/help.md');

    const unsubscribe = $rootScope.$on('jmxTreeUpdated', () => {
      unsubscribe();
      workspace.topLevelTabs.push({
        id: "runtime",
        content: "Runtime",
        title: "Runtime",
        isValid: () => workspace.treeContainsDomainAndProperties('java.lang'),
        href: () => '/runtime',
        isActive: (workspace: Jmx.Workspace) => workspace.isMainTabActive('runtime')
      });
    });
  }
}
