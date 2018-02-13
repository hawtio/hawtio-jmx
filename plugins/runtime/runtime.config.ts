namespace Runtime {

  export function configureRoutes($routeProvider: angular.route.IRouteProvider) {
    'ngInject';

    $routeProvider
      .when('/runtime', {redirectTo: '/runtime/sysprops'})
      .when('/runtime/sysprops', {template: '<runtime-system-properties></runtime-system-properties>'})
  }

  export function configureRuntime($rootScope: ng.IScope,
                                   viewRegistry,
                                   helpRegistry: Core.HelpRegistry,
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
        isValid: () => isValid(workspace),
        href: () => '/runtime',
        isActive: (workspace: Jmx.Workspace) => workspace.isMainTabActive('runtime')
      });
    });
  }

  function isValid(workspace: Jmx.Workspace) {
    return workspace.treeContainsDomainAndProperties('java.lang', {type: 'Runtime'}) &&
           workspace.treeContainsDomainAndProperties('java.lang', {type: 'Memory'}) &&
           workspace.treeContainsDomainAndProperties('java.lang', {type: 'ClassLoading'})
  }
}
