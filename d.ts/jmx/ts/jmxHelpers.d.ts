/// <reference path="../../includes.d.ts" />
/// <reference path="folder.d.ts" />
/// <reference path="workspace.d.ts" />
/**
 * @module Core
 */
declare module Core {
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
    function getMBeanTypeFolder(workspace: Workspace, domain: string, typeName: string): Folder;
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
    function getMBeanTypeObjectName(workspace: Workspace, domain: string, typeName: string): string;
    /**
     * Creates a remote workspace given a remote jolokia for querying the JMX MBeans inside the jolokia
     * @param remoteJolokia
     * @param $location
     * @param localStorage
     * @return {Core.Workspace|Workspace}
     */
    function createRemoteWorkspace(remoteJolokia: any, $location: any, localStorage: any, $rootScope?: any, $compile?: any, $templateCache?: any, userDetails?: any, HawtioNav?: any): Workspace;
}
/**
 * @module Jmx
 */
declare module Jmx {
    var pluginName: string;
    var log: Logging.Logger;
    var currentProcessId: string;
    var templatePath: string;
    function findLazyLoadingFunction(workspace: any, folder: any): any;
    function registerLazyLoadHandler(domain: string, lazyLoaderFactory: (folder: Core.Folder) => any): void;
    function unregisterLazyLoadHandler(domain: string, lazyLoaderFactory: (folder: Core.Folder) => any): void;
    /**
     * Registers a toolbar template for the given plugin name, jmxDomain.
     * @method addAttributeToolBar
     * @for Jmx
     * @param {String} pluginName used so that we can later on remove this function when the plugin is removed
     * @param {String} jmxDomain the JMX domain to avoid having to evaluate too many functions on each selection
     * @param {Function} fn the function used to decide which attributes tool bar should be used for the given select
     */
    function addAttributeToolBar(pluginName: string, jmxDomain: string, fn: (NodeSelection: any) => string): void;
    /**
     * Try find a custom toolbar HTML template for the given selection or returns the default value
     * @method getAttributeToolbar
     * @for Jmx
     * @param {Core.NodeSelection} node
     * @param {String} defaultValue
     */
    function getAttributeToolBar(node: NodeSelection, defaultValue?: string): any;
    function updateTreeSelectionFromURL($location: any, treeElement: any, activateIfNoneSelected?: boolean): void;
    function updateTreeSelectionFromURLAndAutoSelect($location: any, treeElement: any, autoSelect: any, activateIfNoneSelected?: boolean): void;
    function getUniqueTypeNames(children: any): string[];
    function enableTree($scope: any, $location: ng.ILocationService, workspace: Core.Workspace, treeElement: any, children: any, redraw?: boolean, onActivateFn?: any): void;
}
