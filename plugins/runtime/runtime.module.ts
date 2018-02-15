/// <reference path="runtime.config.ts"/>
/// <reference path="sysprops/sysprops.component.ts"/>
/// <reference path="sysprops/sysprops.module.ts"/>
/// <reference path="metrics/metrics.component.ts"/>
/// <reference path="metrics/metrics.module.ts"/>
/// <reference path="layout/layout.module.ts"/>

namespace Runtime {

  const runtimeModule = angular
    .module('hawtio-runtime', [
      layoutModule,
      systemPropertiesModule,
      metricsModule
    ])
    .config(configureRoutes)
    .run(configureRuntime)
    .name;

  hawtioPluginLoader.addModule(runtimeModule);

  export const log = Logger.get(runtimeModule);
}
