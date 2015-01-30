/// <reference path="../../includes.d.ts" />
/// <reference path="../../jmx/ts/workspace.d.ts" />
/**
  * @module Threads
  * @main Threads
  */
declare module Threads {
    var pluginName: string;
    var templatePath: string;
    var log: Logging.Logger;
    var jmxDomain: string;
    var mbeanType: string;
    var mbean: string;
    var _module: ng.IModule;
}
