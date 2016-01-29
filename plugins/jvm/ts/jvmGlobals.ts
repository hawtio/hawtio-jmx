/// <reference path="../../includes.ts"/>

module JVM {

  export var rootPath = 'plugins/jvm';
  export var templatePath = UrlHelpers.join(rootPath, '/html');
  export var pluginName = 'hawtio-jvm';
  export var log:Logging.Logger = Logger.get(pluginName);
  export var connectControllerKey = "jvmConnectSettings";
  export var connectionSettingsKey = Core.connectionSettingsKey;
  export var logoPath = 'img/icons/jvm/';
  export var logoRegistry = {
    'jetty': logoPath + 'jetty-logo-80x22.png',
    'tomcat': logoPath + 'tomcat-logo.gif',
    'generic': logoPath + 'java-logo.svg'
  };


}
