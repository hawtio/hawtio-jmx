/// <reference path="logs.service.ts"/>

namespace Logs {
  
  export function configureLogsRoutes($routeProvider) {
    'ngInject';
    $routeProvider.
      when('/logs', {template: '<logs></logs>'});
  }

  export function configureLogsHelp(helpRegistry, logsService: LogsService) {
    'ngInject';
    helpRegistry.addUserDoc('log', 'plugins/log-jmx/doc/help.md', () => {
      return logsService.hasLogQueryMBean();
    });
  }

  export function configureLogsMainNav(mainNavService: Nav.MainNavService, logsService: LogsService) {
    'ngInject';
    mainNavService.addItem({
      title: 'Logs',
      href: '/logs',
      isValid: () => logsService.hasLogQueryMBean(),
      rank: -1
    });
  }

}
