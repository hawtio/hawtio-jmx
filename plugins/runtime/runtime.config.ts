namespace Runtime {

  export function configureRoutes($routeProvider: angular.route.IRouteProvider) {
    'ngInject';

    $routeProvider
      .when('/runtime', {redirectTo: '/runtime/sysprops'})
      .when('/runtime/sysprops', {template: '<runtime-system-properties></runtime-system-properties>'})
      .when('/runtime/metrics', {template: '<runtime-metrics></runtime-metrics>'})
      .when('/runtime/threads', {templateUrl: 'plugins/runtime/threads/threads.html'})
  }

  export function configureRuntime($rootScope: ng.IScope,
                                   $templateCache: ng.ITemplateCacheService,
                                   viewRegistry,
                                   helpRegistry: Help.HelpRegistry,
                                   workspace: Jmx.Workspace) {
    'ngInject';

    const templateCacheKey = 'runtime.html';
    $templateCache.put(templateCacheKey, '<runtime></runtime>');
    viewRegistry['runtime'] = templateCacheKey;

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
