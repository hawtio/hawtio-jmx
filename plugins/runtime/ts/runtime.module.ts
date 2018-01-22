/// <reference path="runtime.config.ts"/>
/// <reference path="overview.controller.ts"/>
/// <reference path="metrics.controller.ts"/>
/// <reference path="systemProperties.controller.ts"/>
/// <reference path="runtime.init.ts"/>
/// <reference path="layout.controller.ts"/>
/// <reference path="runtime.service.ts"/>

namespace Runtime {

  let pluginName = 'hawtio-runtime';

  export const log: Logging.Logger = Logger.get(pluginName);

  export const _module = angular
.module(pluginName, [])
    .config(RuntimeConfig)
    .run(RuntimeInit)
    .controller("RuntimeLayoutController", RuntimeLayoutController)
    .controller("RuntimeOverviewController", RuntimeOverviewController)
    .controller("RuntimeSystemPropertiesController", RuntimeSystemPropertiesController)
    .controller("RuntimeMetricsController", RuntimeMetricsController)
    .service("runtimeService", RuntimeService);

  hawtioPluginLoader.addModule(pluginName);
}