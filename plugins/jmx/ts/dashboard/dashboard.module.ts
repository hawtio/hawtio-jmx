/// <reference path="dashboard.component.ts"/>
/// <reference path="dashboard.service.ts"/>
/// <reference path="metrics.service.ts"/>

namespace Jmx {

  export const DashboardModule = angular
    .module('hawtio-jmx-dashboard', [])
    .component('dashboard', dashboardComponent)
    .service('dashboardService', DashboardService)
    .service('metricsService', MetricsService)
    .name;

}