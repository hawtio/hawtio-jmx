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

  export function updateTreeSelectionFromURL($location, treeElement, activateIfNoneSelected = false) {
    updateTreeSelectionFromURLAndAutoSelect($location, treeElement, null, activateIfNoneSelected);
  }

  export function updateTreeSelectionFromURLAndAutoSelect($location, treeElement, autoSelect: (Folder) => NodeSelection, activateIfNoneSelected = false) {
    const tree = treeElement.treeview(true);
    let node: NodeSelection;

    // If there is a node id then select that one
    var key = $location.search()['nid'];
    if (key) {
      node = <Folder>_.find(tree.getNodes(), { id: key });
    }

    // Else optionally select the first node if there is no selection
    if (!node && activateIfNoneSelected && tree.getSelected().length === 0) {
      const children = <Folder[]>_.takeWhile(tree.getNodes(), { level: 1 });
      if (children.length > 0) {
        node = children[0];
        // invoke any auto select function, and use its result as new first, if any returned
        if (autoSelect) {
          var result = autoSelect(node);
          if (result) {
            node = result;
          }
        }
      }
    }

    // Finally update the tree with the result node
    if (node) {
      tree.revealNode(node, { silent: true });
      tree.selectNode(node, { silent: false });
      tree.expandNode(node, { levels: 1, silent: true });
    }

    // Word-around to avoid collapsed parent node on re-parenting
    tree.getExpanded().forEach(node => tree.revealNode(node, { silent: true }));
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

  export function enableTree($scope, $location: ng.ILocationService, workspace: Workspace, treeElement, children: Array<NodeSelection>) {
    treeElement.treeview({
      lazyLoad: function (node: Folder, addNodes: (nodes: NodeSelection[]) => void) {
        const plugin = <(workspace: Workspace, folder: Folder, onComplete: (children: NodeSelection[]) => void) => void>Jmx.findLazyLoadingFunction(workspace, node);
        if (plugin) {
          log.debug("Lazy loading folder " + node.text);
          plugin(workspace, node, children => addNodes(children));
        }
        // It seems to be required, as the lazyLoad property deletion done
        // by the treeview component does not seem to work
        node.lazyLoad = false;
      },
      onNodeSelected: function (event, node: Folder) {
        // We need to clear any selected node state that may leave outside
        // this tree element sub-graph so that the current selection is
        // correctly taken into account when leaving for a wider tree graph,
        // like when leaving the ActiveMQ or Camel trees to go to the JMX tree.
        const clearSelection = n => {
          if (n.state && n.id !== node.id) {
            n.state.selected = false;
          }
          if (n.children) {
            n.children.forEach(clearSelection);
          }
        };
        clearSelection(workspace.tree);

        workspace.updateSelectionNode(node);
        Core.$apply($scope);
      },
      levels: 1,
      data: children,
      collapseIcon: 'fa fa-angle-down',
      expandIcon: 'fa fa-angle-right',
      nodeIcon: 'pficon pficon-folder-close',
      highlightSearchResults: true,
      searchResultColor: '#b58100', // pf-gold-500
      searchResultBackColor: '#fbeabc', // pf-gold-100
      preventUnselect: true
    });
  }
}
