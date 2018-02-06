/// <reference path="libs/hawtio-forms/defs.d.ts" />
/// <reference path="libs/hawtio-utilities/defs.d.ts" />
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
/**
 * @module JVM
 */
declare module JVM {
    /**
     * Adds common properties and functions to the scope
     * @method configureScope
     * @for Jvm
     * @param {*} $scope
     * @param {ng.ILocationService} $location
     * @param {Core.Workspace} workspace
     */
    function configureScope($scope: any, $location: any, workspace: any): void;
    function hasLocalMBean(workspace: any): any;
    function hasDiscoveryMBean(workspace: any): any;
}
declare module Core {
    /**
     * Creates a jolokia object for connecting to the container with the given remote jolokia URL,
     * username and password
     * @method createJolokia
     * @for Core
     * @static
     * @param {String} url
     * @param {String} username
     * @param {String} password
     * @return {Object}
     */
    function createJolokia(url: string, username: string, password: string): Jolokia.IJolokia;
    function getRecentConnections(localStorage: any): any;
    function addRecentConnection(localStorage: any, name: any): void;
    function removeRecentConnection(localStorage: any, name: any): void;
    function clearConnections(): void;
    function isRemoteConnection(): boolean;
    function saveConnection(options: Core.ConnectOptions): void;
    function connectToServer(localStorage: any, options: Core.ConnectToServerOptions): void;
    /**
     * Loads all of the available connections from local storage
     * @returns {Core.ConnectionMap}
     */
    function loadConnectionMap(): Core.ConnectionMap;
    /**
     * Saves the connection map to local storage
     * @param map
     */
    function saveConnectionMap(map: Core.ConnectionMap): void;
    function getConnectionNameParameter(): any;
    /**
     * Returns the connection options for the given connection name from localStorage
     */
    function getConnectOptions(name: string, localStorage?: WindowLocalStorage): ConnectOptions;
    /**
     * Creates the Jolokia URL string for the given connection options
     */
    function createServerConnectionUrl(options: Core.ConnectOptions): string;
}
/**
 * @module JVM
 * @main JVM
 */
declare module JVM {
    var windowJolokia: Jolokia.IJolokia;
    var _module: ng.IModule;
}
/**
 * @module JVM
 */
declare module JVM {
    var skipJolokia: boolean;
    var ConnectionName: string;
    function getConnectionName(reset?: boolean): string;
    function getConnectionOptions(): any;
    function getJolokiaUrl(): any;
    interface DummyJolokia extends Jolokia.IJolokia {
        isDummy: boolean;
        running: boolean;
    }
    var DEFAULT_MAX_DEPTH: number;
    var DEFAULT_MAX_COLLECTION_SIZE: number;
    function getBeforeSend(): (xhr: any) => void;
}
/**
 * @module Core
 */
declare module Core {
    var tree: any;
    /**
     * @class NavMenuItem
     */
    interface NavMenuItem {
        id: string;
        content: string;
        title?: string;
        isValid?: (workspace: Core.Workspace, perspectiveId?: string) => any;
        isActive?: (worksace: Core.Workspace) => boolean;
        href: () => any;
    }
    /**
     * @class Workspace
     */
    class Workspace {
        jolokia: any;
        jolokiaStatus: any;
        jmxTreeLazyLoadRegistry: any;
        $location: any;
        $compile: ng.ICompileService;
        $templateCache: ng.ITemplateCacheService;
        localStorage: WindowLocalStorage;
        $rootScope: any;
        userDetails: any;
        HawtioNav: HawtioMainNav.Registry;
        operationCounter: number;
        selection: NodeSelection;
        tree: Folder;
        mbeanTypesToDomain: {};
        mbeanServicesToDomain: {};
        attributeColumnDefs: {};
        treePostProcessors: {};
        topLevelTabs: any;
        subLevelTabs: any[];
        keyToNodeMap: {};
        pluginRegisterHandle: any;
        pluginUpdateCounter: any;
        treeWatchRegisterHandle: any;
        treeWatcherCounter: any;
        treeElement: any;
        private treeFetched;
        mapData: {};
        constructor(jolokia: any, jolokiaStatus: any, jmxTreeLazyLoadRegistry: any, $location: any, $compile: ng.ICompileService, $templateCache: ng.ITemplateCacheService, localStorage: WindowLocalStorage, $rootScope: any, userDetails: any, HawtioNav: HawtioMainNav.Registry);
        /**
         * Creates a shallow copy child workspace with its own selection and location
         * @method createChildWorkspace
         * @param {ng.ILocationService} location
         * @return {Workspace}
         */
        createChildWorkspace(location: any): Workspace;
        getLocalStorage(key: string): any;
        setLocalStorage(key: string, value: any): void;
        loadTree(): void;
        /**
         * Adds a post processor of the tree to swizzle the tree metadata after loading
         * such as correcting any typeName values or CSS styles by hand
         * @method addTreePostProcessor
         * @param {Function} processor
         */
        addTreePostProcessor(processor: (tree: any) => void): string;
        addNamedTreePostProcessor(name: string, processor: (tree: any) => void): string;
        removeNamedTreePostProcessor(name: string): void;
        maybeMonitorPlugins(): void;
        maybeUpdatePlugins(response: any): void;
        maybeReloadTree(response: any): void;
        folderGetOrElse(folder: any, value: any): any;
        populateTree(response: any): void;
        private enableLazyLoading(folder);
        /**
         * Returns the hash query argument to append to URL links
         * @method hash
         * @return {String}
         */
        hash(): string;
        /**
         * Returns the currently active tab
         * @method getActiveTab
         * @return {Boolean}
         */
        getActiveTab(): {};
        private getStrippedPathName();
        linkContains(...words: String[]): boolean;
        /**
         * Returns true if the given link is active. The link can omit the leading # or / if necessary.
         * The query parameters of the URL are ignored in the comparison.
         * @method isLinkActive
         * @param {String} href
         * @return {Boolean} true if the given link is active
         */
        isLinkActive(href: string): boolean;
        /**
         * Returns true if the given link is active. The link can omit the leading # or / if necessary.
         * The query parameters of the URL are ignored in the comparison.
         * @method isLinkActive
         * @param {String} href
         * @return {Boolean} true if the given link is active
         */
        isLinkPrefixActive(href: string): boolean;
        /**
         * Returns true if the tab query parameter is active or the URL starts with the given path
         * @method isTopTabActive
         * @param {String} path
         * @return {Boolean}
         */
        isTopTabActive(path: string): boolean;
        /**
         * Returns the selected mbean name if there is one
         * @method getSelectedMBeanName
         * @return {String}
         */
        getSelectedMBeanName(): string;
        getSelectedMBean(): NodeSelection;
        /**
         * Returns true if the path is valid for the current selection
         * @method validSelection
         * @param {String} uri
         * @return {Boolean}
         */
        validSelection(uri: string): boolean;
        /**
         * In cases where we have just deleted something we typically want to change
         * the selection to the parent node
         * @method removeAndSelectParentNode
         */
        removeAndSelectParentNode(): void;
        selectParentNode(): void;
        /**
         * Returns the view configuration key for the kind of selection
         * for example based on the domain and the node type
         * @method selectionViewConfigKey
         * @return {String}
         */
        selectionViewConfigKey(): string;
        /**
         * Returns a configuration key for a node which is usually of the form
         * domain/typeName or for folders with no type, domain/name/folder
         * @method selectionConfigKey
         * @param {String} prefix
         * @return {String}
         */
        selectionConfigKey(prefix?: string): string;
        moveIfViewInvalid(): boolean;
        updateSelectionNode(node: any): void;
        /**
         * Redraws the tree widget
         * @method redrawTree
         */
        redrawTree(): void;
        /**
         * Expand / collapse the current active node
         * @method expandSelection
         * @param {Boolean} flag
         */
        expandSelection(flag: any): void;
        private matchesProperties(entries, properties);
        hasInvokeRightsForName(objectName: string, ...methods: Array<string>): any;
        hasInvokeRights(selection: Core.NodeSelection, ...methods: Array<string>): boolean;
        treeContainsDomainAndProperties(domainName: any, properties?: any): boolean;
        private matches(folder, properties, propertiesCount);
        hasDomainAndProperties(domainName: any, properties?: any, propertiesCount?: any): boolean;
        findMBeanWithProperties(domainName: any, properties?: any, propertiesCount?: any): {};
        findChildMBeanWithProperties(folder: any, properties?: any, propertiesCount?: any): {};
        selectionHasDomainAndLastFolderName(objectName: string, lastName: string): boolean;
        selectionHasDomain(domainName: string): boolean;
        selectionHasDomainAndType(objectName: string, typeName: string): boolean;
        /**
         * Returns true if this workspace has any mbeans at all
         */
        hasMBeans(): boolean;
        hasFabricMBean(): boolean;
        isFabricFolder(): boolean;
        isCamelContext(): boolean;
        isCamelFolder(): boolean;
        isEndpointsFolder(): boolean;
        isEndpoint(): boolean;
        isRoutesFolder(): boolean;
        isRoute(): boolean;
        isComponentsFolder(): boolean;
        isComponent(): boolean;
        isDataformatsFolder(): boolean;
        isDataformat(): boolean;
        isOsgiFolder(): boolean;
        isKarafFolder(): boolean;
        isOsgiCompendiumFolder(): boolean;
    }
}
declare class Workspace extends Core.Workspace {
}
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
    function getUrlForThing(jolokiaUrl: any, action: any, mbean: any, name: any): any;
    function getNavItems(builder: any, workspace: any, $templateCache: any, prefix?: string): Array<HawtioMainNav.NavItem>;
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
    function addAttributeToolBar(pluginName: string, jmxDomain: string, fn: (NodeSelection) => string): void;
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
/**
 * @module Jmx
 */
declare module Jmx {
    function createDashboardLink(widgetType: any, widget: any): string;
    function getWidgetType(widget: any): {
        type: string;
        icon: string;
        route: string;
        size_x: number;
        size_y: number;
        title: string;
    };
    var jmxWidgetTypes: {
        type: string;
        icon: string;
        route: string;
        size_x: number;
        size_y: number;
        title: string;
    }[];
    var jmxWidgets: ({
        type: string;
        title: string;
        mbean: string;
        attribute: string;
        total: string;
        terms: string;
        remaining: string;
    } | {
        type: string;
        title: string;
        mbean: string;
        total: string;
        terms: string;
        remaining: string;
        attribute?: undefined;
    } | {
        type: string;
        title: string;
        mbean: string;
        attribute: string;
        total?: undefined;
        terms?: undefined;
        remaining?: undefined;
    })[];
}
/**
 * @module Jmx
 * @main Jmx
 */
declare module Jmx {
    var _module: ng.IModule;
    var DEFAULT_MAX_DEPTH: number;
    var DEFAULT_MAX_COLLECTION_SIZE: number;
}
/**
 * @module Jmx
 */
declare module Jmx {
    var AreaChartController: ng.IModule;
}
/**
 * @module Jmx
 */
declare module Jmx {
}
/**
 * @module Jmx
 */
declare module Jmx {
    var propertiesColumnDefs: {
        field: string;
        displayName: string;
        width: string;
        cellTemplate: string;
    }[];
    var foldersColumnDefs: {
        displayName: string;
        cellTemplate: string;
    }[];
    var AttributesController: ng.IModule;
}
/**
 * @module Jmx
 */
declare module Jmx {
}
/**
 * @module Jmx
 */
declare module Jmx {
}
/**
 * @module Jmx
 */
declare module Jmx {
    var DonutChartController: ng.IModule;
}
/**
 * @module Core
 */
declare var dagre: any;
declare module Core {
    function d3ForceGraph(scope: any, nodes: any, links: any, canvasElement: any): void;
    function createGraphStates(nodes: any, links: any, transitions: any): any;
    function dagreLayoutGraph(nodes: any, links: any, width: any, height: any, svgElement: any, allowDrag?: boolean, onClick?: any): any;
    function dagreUpdateGraphData(data: any): void;
}
/**
 * @module Jmx
 */
declare module Jmx {
}
declare module Jmx {
    var NavBarController: ng.IModule;
}
/**
* @module Jmx
*/
declare module Jmx {
}
/**
 * @module Core
 */
declare module Jmx {
    var ViewController: ng.IModule;
}
/**
 * @module JVM
 */
declare module JVM {
    var ConnectController: ng.IModule;
}
/**
 * @module JVM
 */
declare module JVM {
}
declare module JVM {
    var HeaderController: ng.IModule;
}
declare module JVM {
}
/**
 * @module JVM
 */
declare module JVM {
}
/**
 * @module JVM
 */
declare module JVM {
}
/**
 * @module JVM
 */
declare module JVM {
}
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
/**
 * @module Threads
 */
declare module Threads {
}
