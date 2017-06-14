/// <reference path="folder.ts"/>
/// <reference path="workspace.ts"/>

namespace Jmx {

  export var pluginName = 'hawtio-jmx';
  export var log: Logging.Logger = Logger.get(pluginName);
  export var currentProcessId = '';
  export var templatePath = 'plugins/jmx/html';

  // Add a few functions to the Core namespace
  /**
   * Returns the Folder object for the given domain name and type name or null if it can not be found
   * @method getMBeanTypeFolder
   * @for Core
   * @static
   * @param {Workspace} workspace
   * @param {String} domain
   * @param {String} typeName}
   * @return {Folder}
   */
  export function getMBeanTypeFolder(workspace:Workspace, domain: string, typeName: string):Folder {
    if (workspace) {
      var mbeanTypesToDomain = workspace.mbeanTypesToDomain || {};
      var types = mbeanTypesToDomain[typeName] || {};
      var answer = types[domain];
      if (angular.isArray(answer) && answer.length) {
        return answer[0];
      }
      return answer;
    }
    return null;
  }

  /**
   * Returns the JMX objectName for the given jmx domain and type name
   * @method getMBeanTypeObjectName
   * @for Core
   * @static
   * @param {Workspace} workspace
   * @param {String} domain
   * @param {String} typeName
   * @return {String}
   */
  export function getMBeanTypeObjectName(workspace:Workspace, domain: string, typeName: string):string {
    var folder = getMBeanTypeFolder(workspace, domain, typeName);
    return Core.pathGet(folder, ["objectName"]);
  }

  /**
   * Creates a remote workspace given a remote jolokia for querying the JMX MBeans inside the jolokia
   * @param remoteJolokia
   * @param $location
   * @param localStorage
   * @return {Core.Workspace|Workspace}
   */
  export function createRemoteWorkspace(remoteJolokia: Jolokia.IJolokia, $location: ng.ILocationService,
    localStorage: WindowLocalStorage, $rootScope: ng.IRootScopeService = null, $compile: ng.ICompileService = null,
    $templateCache: ng.ITemplateCacheService = null, HawtioNav: HawtioMainNav.Registry = null) {
    // lets create a child workspace object for the remote container
    var jolokiaStatus = {
      xhr: null
    };
    // disable reload notifications
    var jmxTreeLazyLoadRegistry = Core.lazyLoaders;
    var profileWorkspace = new Workspace(remoteJolokia, jolokiaStatus, jmxTreeLazyLoadRegistry, $location, $compile, $templateCache, localStorage, $rootScope, HawtioNav);

    log.info("Loading the profile using jolokia: " + remoteJolokia);
    profileWorkspace.loadTree();
    return profileWorkspace;
  }
}
