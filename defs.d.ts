/// <reference path="libs/hawtio-ui/defs.d.ts" />
/// <reference path="libs/hawtio-forms/defs.d.ts" />
/// <reference path="libs/hawtio-preferences/defs.d.ts" />
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
    function connectToServer(localStorage: any, options: Core.ConnectToServerOptions): void;
    /**
     * Loads all of the available connections from local storage
     * @returns {Core.ConnectionMap}
     */
    function loadConnections(): Core.ConnectOptions[];
    /**
     * Saves the connection map to local storage
     * @param map
     */
    function saveConnections(connections: Core.ConnectOptions[]): void;
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
declare namespace Jmx {
    /**
     * a NodeSelection interface so we can expose things like the objectName and the MBean's entries
     *
     * @class NodeSelection
     */
    interface NodeSelection {
        /**
         * @property text
         * @type string
         */
        text: string;
        /**
         * @property class
         * @type string
         */
        class?: string;
        /**
         * @property key
         * @type string
         * @optional
         */
        key?: string;
        /**
         * @property typeName
         * @type string
         * @optional
         */
        typeName?: string;
        /**
         * @property objectName
         * @type string
         * @optional
         */
        objectName?: string;
        /**
         * @property domain
         * @type string
         * @optional
         */
        domain?: string;
        /**
         * @property entries
         * @type any
         * @optional
         */
        entries?: any;
        /**
         * @property folderNames
         * @type array
         * @optional
         */
        folderNames?: string[];
        /**
         * @property children
         * @type NodeSelection
         * @optional
         */
        children?: Array<NodeSelection>;
        /**
         * @property parent
         * @type NodeSelection
         * @optional
         */
        parent?: NodeSelection;
        /**
         * @property icon
         * @type string
         * @optional
         */
        icon?: string;
        /**
         * @property version
         * @type string
         * @optional
         */
        version?: string;
        /**
         * @method get
         * @param {String} key
         * @return {NodeSelection}
         */
        get(key: string): NodeSelection;
        /**
         * @method isFolder
         * @return {boolean}
         */
        isFolder(): boolean;
        /**
         * @method ancestorHasType
         * @param {String} typeName
         * @return {Boolean}
         */
        ancestorHasType(typeName: string): boolean;
        /**
         * @method ancestorHasEntry
         * @param key
         * @param value
         * @return {Boolean}
         */
        ancestorHasEntry(key: string, value: any): boolean;
        /**
         * @method findDescendant
         * @param {Function} filter
         * @return {NodeSelection}
         */
        findDescendant(filter: (node: NodeSelection) => boolean): NodeSelection | null;
        /**
         * @method findAncestor
         * @param {Function} filter
         * @return {NodeSelection}
         */
        findAncestor(filter: (node: NodeSelection) => boolean): NodeSelection | null;
        /**
         * @method detach
         */
        detach(): any;
    }
    /**
     * @class Folder
     * @uses NodeSelection
     */
    class Folder implements NodeSelection {
        text: string;
        constructor(text: string);
        id: string;
        key: string;
        title: string;
        typeName: string;
        nodes: NodeSelection[];
        children: Array<NodeSelection>;
        folderNames: string[];
        domain: string;
        objectName: string;
        private map;
        entries: {};
        class: string;
        parent: Folder;
        isLazy: boolean;
        lazyLoad: boolean;
        icon: string;
        readonly image: string;
        tooltip: string;
        entity: any;
        version: string;
        mbean: Core.JMXMBean;
        get(key: string): NodeSelection;
        isFolder(): boolean;
        /**
         * Navigates the given paths and returns the value there or null if no value could be found
         * @method navigate
         * @for Folder
         * @param {Array} paths
         * @return {NodeSelection}
         */
        navigate(...paths: string[]): NodeSelection;
        hasEntry(key: string, value: any): boolean;
        parentHasEntry(key: string, value: any): boolean;
        ancestorHasEntry(key: string, value: any): boolean;
        ancestorHasType(typeName: string): boolean;
        getOrElse(key: string, defaultValue?: Folder): Folder;
        sortChildren(recursive: boolean): void;
        moveChild(child: NodeSelection): void;
        insertBefore(child: Folder, referenceFolder: Folder): void;
        insertAfter(child: Folder, referenceFolder: Folder): void;
        /**
         * Removes this node from my parent if I have one
         * @method detach
         * @for Folder
         */
        detach(): void;
        /**
         * Searches this folder and all its descendants for the first folder to match the filter
         * @method findDescendant
         * @for Folder
         * @param {Function} filter
         * @return {Folder}
         */
        findDescendant(filter: (node: NodeSelection) => boolean): NodeSelection | null;
        /**
         * Searches this folder and all its ancestors for the first folder to match the filter
         * @method findDescendant
         * @for Folder
         * @param {Function} filter
         * @return {Folder}
         */
        findAncestor(filter: (node: NodeSelection) => boolean): NodeSelection | null;
    }
}
declare namespace Jmx {
    /**
     * @class NavMenuItem
     */
    interface NavMenuItem {
        id: string;
        content: string;
        title?: string;
        isValid?: (workspace: Workspace, perspectiveId?: string) => any;
        isActive?: (worksace: Workspace) => boolean;
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
        onClickRowHandlers: {};
        treePostProcessors: {};
        topLevelTabs: any;
        subLevelTabs: any[];
        keyToNodeMap: {};
        pluginRegisterHandle: any;
        pluginUpdateCounter: any;
        treeWatchRegisterHandle: any;
        treeWatcherCounter: any;
        private treeFetched;
        mapData: {};
        private rootId;
        private separator;
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
        populateTree(response: any): void;
        private initFolder(folder, domain, folderNames);
        private populateDomainFolder(tree, domainName, domain);
        /**
         * Escape only '<' and '>' as opposed to Core.escapeHtml() and _.escape()
         *
         * @param {string} str string to be escaped
        */
        private escapeTagOnly(str);
        private populateMBeanFolder(domainFolder, domainClass, mbeanName, mbean);
        private folderGetOrElse(folder, name);
        private splitMBeanProperty(property);
        private configureFolder(folder, domainName, domainClass, folderNames, path);
        private addFolderByDomain(folder, domainName, typeName, owner);
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
        getActiveTab(): any;
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
        isMainTabActive(path: string): boolean;
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
        updateSelectionNode(node: NodeSelection): void;
        private matchesProperties(entries, properties);
        hasInvokeRightsForName(objectName: string, ...methods: Array<string>): any;
        hasInvokeRights(selection: NodeSelection, ...methods: Array<string>): boolean;
        treeContainsDomainAndProperties(domainName: any, properties?: any): boolean;
        private matches(folder, properties, propertiesCount);
        hasDomainAndProperties(domainName: any, properties?: any, propertiesCount?: any): boolean;
        findMBeanWithProperties(domainName: any, properties?: any, propertiesCount?: any): any;
        findChildMBeanWithProperties(folder: any, properties?: any, propertiesCount?: any): any;
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
declare namespace Jmx {
    var pluginName: string;
    var log: Logging.Logger;
    var currentProcessId: string;
    var templatePath: string;
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
declare namespace Jmx {
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
    } | {
        type: string;
        title: string;
        mbean: string;
        attribute: string;
    })[];
}
declare namespace Jmx {
    var _module: ng.IModule;
    var DEFAULT_MAX_DEPTH: number;
    var DEFAULT_MAX_COLLECTION_SIZE: number;
}
declare namespace Jmx {
    var AreaChartController: ng.IModule;
}
declare namespace Jmx {
}
declare namespace Jmx {
    var propertiesColumnDefs: {
        field: string;
        displayName: string;
        cellTemplate: string;
    }[];
    var foldersColumnDefs: {
        displayName: string;
        cellTemplate: string;
    }[];
    var AttributesController: ng.IModule;
}
declare namespace Jmx {
}
declare namespace Jmx {
}
declare namespace Jmx {
    var DonutChartController: ng.IModule;
}
declare namespace Jmx {
    function findLazyLoadingFunction(workspace: Workspace, folder: any): (workspace: Workspace, folder: Folder, onComplete: (children: NodeSelection[]) => void) => void;
    function registerLazyLoadHandler(domain: string, lazyLoaderFactory: (folder: Folder) => any): void;
    function unregisterLazyLoadHandler(domain: string, lazyLoaderFactory: (folder: Folder) => any): void;
    function updateTreeSelectionFromURL($location: any, treeElement: any, activateIfNoneSelected?: boolean): void;
    function updateTreeSelectionFromURLAndAutoSelect($location: any, treeElement: any, autoSelect: (Folder) => NodeSelection, activateIfNoneSelected?: boolean): void;
    function getUniqueTypeNames(children: NodeSelection[]): string[];
    function enableTree($scope: any, $location: ng.ILocationService, workspace: Workspace, treeElement: any, children: Array<NodeSelection>): void;
}
declare namespace Jmx {
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
declare namespace JVM {
    function ConnectController($scope: any, $location: ng.ILocationService, localStorage: WindowLocalStorage, workspace: Jmx.Workspace, $uibModal: any, connectService: ConnectService): void;
}
declare namespace JVM {
    class ConnectService {
        private $q;
        private jolokia;
        constructor($q: ng.IQService, jolokia: Jolokia.IJolokia);
        testConnection(connection: Core.ConnectOptions): ng.IPromise<boolean>;
    }
}
declare namespace JVM {
    function ConnectionUrlFilter(): (connection: Core.ConnectOptions) => string;
}
declare namespace JVM {
    const ConnectModule: string;
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
declare namespace Jmx {
    class HeaderController {
        title: string;
        constructor($scope: any);
    }
    const headerComponent: {
        template: string;
        controller: typeof HeaderController;
    };
}
declare namespace Jmx {
}
declare namespace Jmx {
    class Operation {
        args: OperationArgument[];
        description: string;
        name: string;
        simpleName: string;
        constructor(method: string, args: OperationArgument[], description: string);
        private static buildName(method, args);
        private static buildSimpleName(name);
    }
    interface OperationArgument {
        name: string;
        type: string;
        desc: string;
    }
}
declare namespace Jmx {
    class OperationsService {
        private $q;
        private jolokia;
        private rbacACLMBean;
        constructor($q: ng.IQService, jolokia: Jolokia.IJolokia, rbacACLMBean: ng.IPromise<string>);
        getOperations(mbeanName: string): ng.IPromise<Operation[]>;
        private loadOperations(mbeanName);
        getOperation(mbeanName: string, operationName: any): ng.IPromise<Operation>;
        executeOperation(mbeanName: string, operation: Operation, argValues?: any[]): ng.IPromise<string>;
    }
}
declare namespace Jmx {
    class OperationFormController {
        private workspace;
        private operationsService;
        operation: any;
        formFields: any;
        editorMode: string;
        operationFailed: boolean;
        operationResult: string;
        isExecuting: boolean;
        constructor(workspace: Workspace, operationsService: OperationsService);
        private static buildHelpText(arg);
        private static convertToHtmlInputType(javaType);
        private static getDefaultValue(javaType);
        execute(): void;
        cancel(): void;
    }
    const operationFormComponent: {
        bindings: {
            operation: string;
        };
        templateUrl: string;
        controller: typeof OperationFormController;
    };
}
declare namespace Jmx {
    class OperationsController {
        private $scope;
        private $location;
        private workspace;
        private jolokiaUrl;
        private operationsService;
        config: any;
        actionButtons: any[];
        menuActions: any[];
        operations: Operation[];
        constructor($scope: any, $location: any, workspace: Workspace, jolokiaUrl: any, operationsService: OperationsService);
        $onInit(): void;
        private configureListView();
        private buildJolokiaUrl(operation);
        private fetchOperations();
    }
    const operationsComponent: {
        templateUrl: string;
        controller: typeof OperationsController;
    };
}
declare namespace Jmx {
}
