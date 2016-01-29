/// <reference path="../../includes.d.ts" />
declare module JVM {
    var rootPath: string;
    var templatePath: string;
    var pluginName: string;
    var log: Logging.Logger;
    var connectControllerKey: string;
    var connectionSettingsKey: string;
    var logoPath: string;
    var logoRegistry: {
        'jetty': string;
        'tomcat': string;
        'generic': string;
    };
}
