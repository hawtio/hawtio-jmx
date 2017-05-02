/// <reference path="../../includes.ts"/>
/// <reference path="folder.ts"/>
/// <reference path="workspace.ts"/>

namespace Jmx {

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
  export function createRemoteWorkspace(remoteJolokia, $location, localStorage, $rootScope = null, $compile = null, $templateCache = null, userDetails = null, HawtioNav = null) {
    // lets create a child workspace object for the remote container
    var jolokiaStatus = {
      xhr: null
    };
    // disable reload notifications
    var jmxTreeLazyLoadRegistry = Core.lazyLoaders;
    var profileWorkspace = new Workspace(remoteJolokia, jolokiaStatus, jmxTreeLazyLoadRegistry, $location, $compile, $templateCache, localStorage, $rootScope, userDetails, HawtioNav);

    log.info("Loading the profile using jolokia: " + remoteJolokia);
    profileWorkspace.loadTree();
    return profileWorkspace;
  }


}
/**
 * @module Jmx
 */
module Jmx {

  export var pluginName = 'hawtio-jmx';
  export var log: Logging.Logger = Logger.get(pluginName);
  export var currentProcessId = '';
  export var templatePath = 'plugins/jmx/html';

  export function getUrlForThing(jolokiaUrl, action, mbean, name) {
    var uri:any = new URI(jolokiaUrl);
    uri.segment(action)
      .segment(mbean)
      .segment(name);
    return uri.toString();
  }

  var attributesToolBars = {};

  export function findLazyLoadingFunction(workspace: Workspace, folder) {
    var factories = workspace.jmxTreeLazyLoadRegistry[folder.domain];
    var lazyFunction = null;
    if (factories && factories.length) {
      angular.forEach(factories, (customLoader) => {
        if (!lazyFunction) {
          lazyFunction = customLoader(folder);
        }
      });
    }
    return lazyFunction;
  }


  export function registerLazyLoadHandler(domain: string, lazyLoaderFactory: (folder: Folder) => any) {
    if (!Core.lazyLoaders) {
      Core.lazyLoaders = {};
    }
    var array = Core.lazyLoaders[domain];
    if (!array) {
      array = [];
      Core.lazyLoaders[domain] = array;
    }
    array.push(lazyLoaderFactory);
  }

  export function unregisterLazyLoadHandler(domain: string, lazyLoaderFactory: (folder: Folder) => any) {
    if (Core.lazyLoaders) {
      var array = Core.lazyLoaders[domain];
      if (array) {
        array.remove(lazyLoaderFactory);
      }
    }
  }

  /**
   * Registers a toolbar template for the given plugin name, jmxDomain.
   * @method addAttributeToolBar
   * @for Jmx
   * @param {String} pluginName used so that we can later on remove this function when the plugin is removed
   * @param {String} jmxDomain the JMX domain to avoid having to evaluate too many functions on each selection
   * @param {Function} fn the function used to decide which attributes tool bar should be used for the given select
   */
  export function addAttributeToolBar(pluginName: string, jmxDomain: string, fn: (NodeSelection) => string) {
    var array = attributesToolBars[jmxDomain];
    if (!array) {
      array = [];
      attributesToolBars[jmxDomain] = array;
    }
    array.push(fn);
  }

  /**
   * Try find a custom toolbar HTML template for the given selection or returns the default value
   * @method getAttributeToolbar
   * @for Jmx
   * @param {Core.NodeSelection} node
   * @param {String} defaultValue
   */
  export function getAttributeToolBar(node: NodeSelection, defaultValue?:string) {
    if (!defaultValue) {
      defaultValue = UrlHelpers.join(templatePath, 'attributeToolBar.html');
    }
    var answer = null;
    var jmxDomain = (node) ? node.domain : null;
    if (jmxDomain) {
      var array = attributesToolBars[jmxDomain];
      if (array) {
        for (var i = 0; i < array.length; i++) {
          var fn = array[i];
          if (fn) {
            answer = fn(node);
            if (answer) break;
          }
        }
      }
    }
    return (answer) ? answer : defaultValue;
  }

  export function updateTreeSelectionFromURL($location, treeElement, activateIfNoneSelected = false) {
    updateTreeSelectionFromURLAndAutoSelect($location, treeElement, null, activateIfNoneSelected);
  }

  export function updateTreeSelectionFromURLAndAutoSelect($location, treeElement, autoSelect: (Folder) => Folder, activateIfNoneSelected = false) {
    const tree = <any>treeElement.treeview(true);
    let node: Folder;
    var key = $location.search()['nid'];
    if (key) {
      node = tree.findNodes(`^${key}$`, 'id');
    }
    if (node) {
      tree.revealNode(node, { silent: true });
      tree.selectNode(node, { silent: true });
      tree.expandNode(node, { levels: 1, silent: true });
    } else {
      if (tree.getSelected().length === 0) {
        var children = tree.findNodes('^1$', 'level');
        if (children.length > 0) {
          var first = children[0];
          // invoke any auto select function, and use its result as new first, if any returned
          if (autoSelect) {
            var result = autoSelect(first);
            if (result) {
              first = result;
            }
          }
          if (activateIfNoneSelected) {
            tree.revealNode(first, { silent: true });
            tree.selectNode(first, { silent: true });
            tree.expandNode(first, { levels: 1, silent: true });
          }
        }
      }
    }
  }

  export function getUniqueTypeNames(children) {
    var typeNameMap = {};
    angular.forEach(children, (mbean) => {
      var typeName = mbean.typeName;
      if (typeName) {
        typeNameMap[typeName] = mbean;
      }
    });
    // only query if all the typenames are the same
    var typeNames = Object.keys(typeNameMap);
    return typeNames;
  }

  export function folderGetOrElse(folder: Folder, name: string): Folder {
    if (folder) {
      try {
        return folder.getOrElse(name);
      } catch (e) {
        log.warn("Failed to find name " + name + " on folder " + folder);
      }
    }
    return null;
  }

  /**
   * Escape only '<' and '>' as opposed to Core.escapeHtml() and _.escape()
   * 
   * @param {string} str string to be escaped
   */
  export function escapeTagOnly(str: string): string {
    var tagChars = {
      "<": "&lt;",
      ">": "&gt;"
    };
    if (!angular.isString(str)) {
      return str;
    }
    var escaped = "";
    for (var i = 0; i < str.length; i++) {
      var c = str.charAt(i);
      escaped += tagChars[c] || c;
    }
    return escaped;
  }

  export function enableTree($scope, $location: ng.ILocationService, workspace: Workspace, treeElement, children: Array<NodeSelection>) {
    if (treeElement.length) {
      treeElement.treeview({
        /*
         * The event handler called when a different node in the tree is selected
         */
        lazyLoad: function(event, data) {
          var folder = data.node;
          var plugin = <(workspace: Workspace, folder: Folder, func:() => void) => void> null;
          if (folder) {
            plugin = Jmx.findLazyLoadingFunction(workspace, folder);
          }
          if (plugin) {
            log.debug("Lazy loading folder " + folder.title);
            var oldChildren = folder.children;
            plugin(workspace, folder, () => {
              var newChildren = folder.children;
              if (newChildren !== oldChildren) {
                data.node.removeChildren();
                angular.forEach(newChildren, newChild => {
                  data.node.addChild(newChild);
                });
              }
            });
          }
        },
        onNodeExpanded: function(event, data:Folder) {
          // reflect the "expand" status from dynatree in Folder structure
          // this will also preserve expand status when redrawin tree!
          // see "this.data = $.extend({}, $.ui.dynatree.nodedatadefaults, data);" in jquery.dynatree. "data" is Folder object
          // const node = data.node;
          data.expand = true;
          // if (data.isFolder()) {
          //   var parent = data.children[0].parent;
          //   if (parent) {
          //     parent.expand = true;
          //   }
          // }
        },
        onNodeSelected: function (event, data:Folder) {
          workspace.updateSelectionNode(data);
          Core.$apply($scope);
        },

        /*onNodeSelected: function (event, data:Folder) {
          console.log('onNodeSelected');
          // const node = data.node;
          console.log('test:', data);
          // if (event["metaKey"]) {
            event.preventDefault();
            var url = $location.absUrl();
            // if (node && node.data) {
              // var key = node.data["key"];
              const key = data.key;
              if (key) {
                var hash = $location.search();
                hash["nid"] = key;

                // TODO this could maybe be a generic helper function?
                // lets trim after the ?
                var idx = url.indexOf('?');
                if (idx <= 0) {
                  url += "?";
                } else {
                  url = url.substring(0, idx + 1);
                }
                url += $.param(hash);
              }
            // }
            window.open(url, '_blank');
            window.focus();
            return false;
          // }
          // return true;
        },*/
        levels: 1,
        data: children,
        collapseIcon: 'fa fa-angle-down',
        expandIcon: 'fa fa-angle-right',
        nodeIcon: 'pficon pficon-folder-close',
        highlightSearchResults: true,
        searchResultColor: '#b58100', // pf-gold-500
        searchResultBackColor: '#fbeabc' // pf-gold-100
      });
    }
  }
}
