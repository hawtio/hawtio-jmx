/// <reference path="diagnostics.config.ts"/>
/// <reference path="diagnostics.init.ts"/>
/// <reference path="diagnostics-layout.controller.ts"/>
/// <reference path="diagnostics-jfr.controller.ts"/>
/// <reference path="diagnostics-heap.controller.ts"/>
/// <reference path="diagnostics-flags.controller.ts"/>
/// <reference path="diagnostics.service.ts"/>

namespace Diagnostics {

  let pluginName = 'hawtio-diagnostics';

  export const log: Logging.Logger = Logger.get(pluginName);
  
  export const _module = angular
    .module(pluginName, [])
    .config(DiagnosticsConfig)
    .run(DiagnosticsInit)
    .controller("DiagnosticsLayoutController", DiagnosticsLayoutController)
    .controller("DiagnosticsJfrController", DiagnosticsJfrController)
    .controller("DiagnosticsHeapController", DiagnosticsHeapController)
    .controller("DiagnosticsFlagsController", DiagnosticsFlagsController)
    .service('diagnosticsService', DiagnosticsService);

  hawtioPluginLoader.addModule(pluginName);
}
