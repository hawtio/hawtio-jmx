/// <reference types="core" />
/// <reference types="angular" />
/// <reference types="angular-ui-bootstrap" />
/// <reference types="jquery" />
/// <reference types="forms" />
/// <reference types="angular-route" />
declare namespace About {
    class AboutController {
        private configManager;
        private jolokia;
        private jolokiaService;
        flags: {
            open: boolean;
        };
        title: string;
        productInfo: object[];
        additionalInfo: string;
        copyright: string;
        constructor(configManager: Core.ConfigManager, jolokia: Jolokia.IJolokia, jolokiaService: JVM.JolokiaService);
        $onInit(): void;
        onClose(): void;
    }
    const aboutComponent: angular.IComponentOptions;
}
declare namespace About {
    function configureMenu(HawtioExtension: Core.HawtioExtension, $compile: ng.ICompileService): void;
}
declare namespace About {
}
declare namespace Diagnostics {
    interface JvmFlag {
        name: string;
        value: any;
        writeable: boolean;
        origin: string;
        deregisterWatch: any;
        dataType: string;
    }
    interface JvmFlagsScope extends ng.IScope {
        flags: Array<JvmFlag>;
        tableDef: any;
    }
    function DiagnosticsFlagsController($scope: JvmFlagsScope, jolokia: Jolokia.IJolokia): void;
}
declare namespace JVM {
    const rootPath = "plugins/jvm";
    const templatePath: string;
    const pluginName = "hawtio-jmx-jvm";
    const log: Logging.Logger;
    const connectControllerKey = "jvmConnectSettings";
    const connectionSettingsKey = "jvmConnect";
    const logoPath = "img/icons/jvm/";
    const logoRegistry: {
        'jetty': string;
        'tomcat': string;
        'generic': string;
    };
}
declare namespace JVM {
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
    function connectToServer(localStorage: any, options: ConnectOptions): void;
    function saveConnection(options: ConnectOptions): void;
    /**
     * Loads all of the available connections from local storage
     */
    function loadConnections(): ConnectOptions[];
    /**
     * Saves the connection map to local storage
     * @param connections array of all connections to be stored
     */
    function saveConnections(connections: ConnectOptions[]): void;
    function getConnectionNameParameter(): any;
    /**
     * Returns the connection options for the given connection name from localStorage
     */
    function getConnectOptions(name: string, localStorage?: WindowLocalStorage): ConnectOptions;
    /**
     * Creates the Jolokia URL string for the given connection options
     */
    function createServerConnectionUrl(options: ConnectOptions): string;
}
declare namespace JVM {
    class ConnectService {
        private $q;
        private $window;
        constructor($q: ng.IQService, $window: ng.IWindowService);
        getConnections(): ConnectOptions[];
        updateReachableFlags(connections: ConnectOptions[]): ng.IPromise<ConnectOptions[]>;
        updateReachableFlag(connection: ConnectOptions): ng.IPromise<ConnectOptions>;
        saveConnections(connections: ConnectOptions[]): void;
        testConnection(connection: ConnectOptions): ng.IPromise<boolean>;
        checkCredentials(connection: ConnectOptions, username: string, password: string): ng.IPromise<boolean>;
        connect(connection: ConnectOptions): void;
    }
}
declare namespace JVM {
    class ConnectController {
        private $timeout;
        private $uibModal;
        private connectService;
        connections: ConnectOptions[];
        promise: ng.IPromise<any>;
        toolbarConfig: {
            actionsConfig: {
                primaryActions: {
                    name: string;
                    actionFn: () => void;
                }[];
            };
        };
        listConfig: {
            selectionMatchProp: string;
            selectItems: boolean;
            showSelectBox: boolean;
        };
        listActionButtons: {
            name: string;
            actionFn: (action: any, connection: any) => void;
        }[];
        listActionDropDown: {
            name: string;
            actionFn: (action: any, connection: any) => void;
        }[];
        constructor($timeout: ng.ITimeoutService, $uibModal: angular.ui.bootstrap.IModalService, connectService: ConnectService);
        $onInit(): void;
        $onDestroy(): void;
        setTimerToUpdateReachableFlags(): void;
        private addConnection();
        private editConnection(connection);
        private deleteConnection(connection);
        private connect(connection);
    }
    const connectComponent: angular.IComponentOptions;
}
declare namespace JVM {
    class ConnectEditModalController {
        private connectService;
        modalInstance: any;
        resolve: {
            connection: ConnectOptions;
        };
        connection: ConnectOptions;
        errors: {};
        test: {
            ok: boolean;
            message: any;
        };
        constructor(connectService: ConnectService);
        $onInit(): void;
        testConnection(connection: ConnectOptions): void;
        cancel(): void;
        saveConnection(connection: any): void;
        private validateConnection(connection);
    }
    const connectEditModalComponent: angular.IComponentOptions;
}
declare namespace JVM {
    const connectDeleteModalComponent: angular.IComponentOptions;
}
declare namespace JVM {
    class ConnectLoginController {
        private $location;
        private $window;
        private $uibModal;
        private userDetails;
        private postLoginTasks;
        private postLogoutTasks;
        constructor($location: ng.ILocationService, $window: ng.IWindowService, $uibModal: angular.ui.bootstrap.IModalService, userDetails: Core.AuthService, postLoginTasks: Core.Tasks, postLogoutTasks: Core.Tasks);
        $onInit(): void;
        private registerTaskToPersistCredentials(credentials);
    }
    const connectLoginComponent: angular.IComponentOptions;
}
declare namespace JVM {
    class ConnectLoginModalController {
        private ConnectOptions;
        private connectService;
        modalInstance: any;
        invalidCredentials: boolean;
        constructor(ConnectOptions: ConnectOptions, connectService: ConnectService);
        cancel(): void;
        login(username: string, password: string): void;
    }
    const connectLoginModalComponent: angular.IComponentOptions;
}
declare namespace JVM {
    const connectUnreachableModalComponent: angular.IComponentOptions;
}
declare namespace JVM {
    function ConnectionUrlFilter(): (connection: ConnectOptions) => string;
}
declare namespace JVM {
    const ConnectModule: string;
}
declare namespace JVM {
    const _module: angular.IModule;
}
declare namespace JVM {
    enum JolokiaListMethod {
        LIST_GENERAL = "list",
        LIST_WITH_RBAC = "list_rbac",
        LIST_CANT_DETERMINE = "cant_determine",
    }
    const DEFAULT_MAX_DEPTH = 7;
    const DEFAULT_MAX_COLLECTION_SIZE = 50000;
    let ConnectionName: string;
    function getConnectionName(reset?: boolean): string;
    function getJolokiaUrl(): string | boolean;
    interface JolokiaStatus {
        xhr: JQueryXHR;
        listMethod: JolokiaListMethod;
        listMBean: string;
    }
    /**
     * Empty jolokia that returns nothing
     */
    class DummyJolokia implements Jolokia.IJolokia {
        isDummy: boolean;
        private running;
        request(...args: any[]): any;
        getAttribute(mbean: any, attribute: any, path?: any, opts?: any): any;
        setAttribute(mbean: any, attribute: any, value: any, path?: any, opts?: any): void;
        execute(mbean: any, operation: any, ...args: any[]): any;
        search(mBeanPatter: any, opts?: any): any;
        list(path: any, opts?: any): any;
        version(opts?: any): any;
        register(params: any, ...request: any[]): any;
        unregister(handle: any): void;
        jobs(): any[];
        start(period: any): void;
        stop(): void;
        isRunning(): boolean;
    }
    interface ConnectOptions {
        name?: string;
        scheme?: string;
        host?: string;
        port?: number;
        path?: string;
        useProxy?: boolean;
        jolokiaUrl?: string;
        userName?: string;
        password?: string;
        reachable?: boolean;
        returnTo?: string;
    }
    function createConnectOptions(options?: ConnectOptions): ConnectOptions;
}
declare namespace Jmx {
    enum TreeEvent {
        Updated = "jmxTreeUpdated",
        NodeSelected = "jmxTreeClicked",
    }
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
         * @property image
         * @type string
         * @optional
         */
        image?: string;
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
        entries: {};
        class: string;
        parent: Folder;
        isLazy: boolean;
        lazyLoad: boolean;
        icon: string;
        image: string;
        tooltip: string;
        entity: any;
        version: string;
        mbean: Core.JMXMBean & {
            opByString?: {
                [name: string]: any;
            };
        };
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
    const pluginName = "hawtio-jmx";
    const log: Logging.Logger;
    let currentProcessId: string;
    const templatePath = "plugins/jmx/html";
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
     * @param remoteJolokiaStatus
     * @param $location
     * @param localStorage
     * @return {Workspace}
     */
    function createRemoteWorkspace(remoteJolokia: Jolokia.IJolokia, remoteJolokiaStatus: JVM.JolokiaStatus, $location: ng.ILocationService, localStorage: Storage, $rootScope?: ng.IRootScopeService, $compile?: ng.ICompileService, $templateCache?: ng.ITemplateCacheService, HawtioNav?: Nav.Registry): Workspace;
}
declare namespace Jmx {
    /**
     * @class NavMenuItem
     */
    interface NavMenuItem {
        id: string;
        content: string;
        title?: string;
        isValid?(workspace: Workspace, perspectiveId?: string): any;
        isActive?(worksace: Workspace): boolean;
        href(): any;
    }
    /**
     * @class Workspace
     */
    class Workspace {
        jolokia: Jolokia.IJolokia;
        jolokiaStatus: JVM.JolokiaStatus;
        jmxTreeLazyLoadRegistry: any;
        $location: ng.ILocationService;
        $compile: ng.ICompileService;
        $templateCache: ng.ITemplateCacheService;
        localStorage: Storage;
        $rootScope: ng.IRootScopeService;
        HawtioNav: Nav.Registry;
        operationCounter: number;
        selection: NodeSelection;
        tree: Folder;
        mbeanTypesToDomain: {};
        mbeanServicesToDomain: {};
        attributeColumnDefs: {};
        onClickRowHandlers: {};
        treePostProcessors: {
            [name: string]: (tree: Folder) => void;
        };
        topLevelTabs: any;
        subLevelTabs: any[];
        keyToNodeMap: {};
        pluginRegisterHandle: any;
        pluginUpdateCounter: any;
        treeWatchRegisterHandle: any;
        treeWatcherCounter: any;
        treeFetched: boolean;
        mapData: {};
        private rootId;
        private separator;
        constructor(jolokia: Jolokia.IJolokia, jolokiaStatus: JVM.JolokiaStatus, jmxTreeLazyLoadRegistry: any, $location: ng.ILocationService, $compile: ng.ICompileService, $templateCache: ng.ITemplateCacheService, localStorage: Storage, $rootScope: ng.IRootScopeService, HawtioNav: Nav.Registry);
        /**
         * Creates a shallow copy child workspace with its own selection and location
         * @method createChildWorkspace
         * @param {ng.ILocationService} location
         * @return {Workspace}
         */
        createChildWorkspace(location: any): Workspace;
        getLocalStorage(key: string): any;
        setLocalStorage(key: string, value: any): void;
        private jolokiaList(callback, flags);
        loadTree(): void;
        /**
         * Adds a post processor of the tree to swizzle the tree metadata after loading
         * such as correcting any typeName values or CSS styles by hand
         * @method addTreePostProcessor
         * @param {Function} processor
         */
        addTreePostProcessor(processor: (tree: Folder) => void): string;
        addNamedTreePostProcessor(name: string, processor: (tree: Folder) => void): string;
        removeNamedTreePostProcessor(name: string): void;
        maybeMonitorPlugins(): void;
        maybeUpdatePlugins(response: Jolokia.IResponse): void;
        maybeReloadTree(response: Jolokia.IResponse): void;
        /**
         * Processes response from jolokia list - if it contains "domains" and "cache" properties
         * @param response
         */
        unwindResponseWithRBACCache(response: any): Core.JMXDomains;
        populateTree(response: {
            value: Core.JMXDomains;
        }): void;
        jmxTreeUpdated(): void;
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
        configureFolder(folder: Folder, domainName: string, domainClass: string, folderNames: string[], path: string): Folder;
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
        broadcastSelectionNode(): void;
        private matchesProperties(entries, properties);
        hasInvokeRightsForName(objectName: string, ...methods: string[]): boolean;
        hasInvokeRights(selection: NodeSelection, ...methods: string[]): boolean;
        private resolveCanInvoke(op);
        treeContainsDomainAndProperties(domainName: string, properties?: any): boolean;
        private matches(folder, properties, propertiesCount);
        hasDomainAndProperties(domainName: string, properties?: any, propertiesCount?: any): boolean;
        findMBeanWithProperties(domainName: string, properties?: any, propertiesCount?: any): any;
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
    class TreeService {
        private $rootScope;
        private $q;
        private workspace;
        constructor($rootScope: ng.IRootScopeService, $q: ng.IQService, workspace: Jmx.Workspace);
        treeContainsDomainAndProperties(domainName: string, properties?: any): ng.IPromise<boolean>;
        findMBeanWithProperties(domainName: string, properties?: any, propertiesCount?: any): ng.IPromise<any>;
        getSelectedMBean(): ng.IPromise<NodeSelection>;
        getSelectedMBeanName(): ng.IPromise<string>;
        runWhenTreeReady(fn: () => any): ng.IPromise<any>;
        private runWhenTreeSelectionReady(fn);
    }
}
declare namespace Diagnostics {
    class DiagnosticsService {
        private $q;
        private treeService;
        private configManager;
        constructor($q: ng.IQService, treeService: Jmx.TreeService, configManager: Core.ConfigManager);
        getTabs(): ng.IPromise<Nav.HawtioTab[]>;
        private hasHotspotDiagnostic();
        private hasDiagnosticFunction(operation);
        findMyPid(title: any): string;
    }
}
declare namespace Diagnostics {
    interface ClassStats {
        count: string;
        bytes: string;
        name: string;
        deltaCount: string;
        deltaBytes: string;
    }
    interface HeapControllerScope extends ng.IScope {
        items: Array<ClassStats>;
        loading: boolean;
        lastLoaded: any;
        toolbarConfig: any;
        tableConfig: any;
        tableDtOptions: any;
        tableColumns: Array<any>;
        pageConfig: object;
        loadClassStats: () => void;
    }
    function DiagnosticsHeapController($scope: HeapControllerScope, jolokia: Jolokia.IJolokia, diagnosticsService: DiagnosticsService): void;
}
declare namespace Diagnostics {
    interface JfrSettings {
        limitType: string;
        limitValue: string;
        recordingNumber: string;
        dumpOnExit: boolean;
        name: string;
        filename: string;
    }
    interface Recording {
        number: string;
        size: string;
        file: string;
        time: number;
    }
    interface JfrControllerScope extends ng.IScope {
        forms: any;
        jfrEnabled: boolean;
        isRecording: boolean;
        isRunning: boolean;
        jfrSettings: JfrSettings;
        unlock: () => void;
        startRecording: () => void;
        stopRecording: () => void;
        dumpRecording: () => void;
        formConfig: Forms.FormConfiguration;
        recordings: Array<Recording>;
        pid: string;
        jfrStatus: string;
        pageTitle: string;
        settingsVisible: boolean;
        toggleSettingsVisible: () => void;
        jcmd: string;
        closeMessageForGood: (key: string) => void;
        isMessageVisible: (key: string) => boolean;
    }
    function DiagnosticsJfrController($scope: JfrControllerScope, $location: ng.ILocationService, workspace: Jmx.Workspace, jolokia: Jolokia.IJolokia, localStorage: Storage, diagnosticsService: DiagnosticsService): void;
}
declare namespace Diagnostics {
    class DiagnosticsController {
        private $location;
        private diagnosticsService;
        tabs: Nav.HawtioTab[];
        constructor($location: ng.ILocationService, diagnosticsService: DiagnosticsService);
        $onInit(): void;
        goto(tab: Nav.HawtioTab): void;
    }
    const diagnosticsComponent: angular.IComponentOptions;
}
declare namespace Diagnostics {
    function configureRoutes(configManager: Core.ConfigManager): void;
    function configureLayout($rootScope: ng.IScope, $templateCache: ng.ITemplateCacheService, viewRegistry: any, helpRegistry: any, workspace: Jmx.Workspace, diagnosticsService: DiagnosticsService): void;
}
declare namespace Diagnostics {
    const log: Logging.Logger;
    const _module: angular.IModule;
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
declare namespace Jmx {
    class HeaderController {
        title: string;
        objectName: string;
        constructor($scope: any);
    }
    const headerComponent: angular.IComponentOptions;
}
declare namespace Jmx {
    class NavigationController {
        private $location;
        constructor($location: ng.ILocationService);
        tabs: Nav.HawtioTab[];
        goto(tab: Nav.HawtioTab): void;
    }
    const navigationComponent: angular.IComponentOptions;
}
declare namespace Jmx {
    const commonModule: string;
}
declare namespace Jmx {
    function AttributesController($scope: any, $element: any, $location: ng.ILocationService, workspace: Workspace, jmxWidgets: any, jmxWidgetTypes: any, $templateCache: ng.ITemplateCacheService, localStorage: Storage, $browser: any, $timeout: ng.ITimeoutService, $uibModal: angular.ui.bootstrap.IModalService, attributesService: AttributesService): void;
}
/**
 * @namespace RBAC
 */
declare namespace RBAC {
    interface RBACTasks extends Core.Tasks {
        initialize(mbean: string): void;
        getACLMBean(): ng.IPromise<string>;
    }
    interface OperationCanInvoke {
        CanInvoke: boolean;
        Method: string;
        ObjectName: string;
    }
}
declare namespace Jmx {
    class AttributesService {
        private $q;
        private jolokia;
        private jolokiaUrl;
        private rbacACLMBean;
        constructor($q: ng.IQService, jolokia: Jolokia.IJolokia, jolokiaUrl: string, rbacACLMBean: ng.IPromise<string>);
        registerJolokia(scope: any, request: any, callback: any): void;
        unregisterJolokia(scope: any): void;
        listMBean(mbeanName: string, callback: any): void;
        canInvoke(mbeanName: string, attribute: string, type: string): ng.IPromise<boolean>;
        buildJolokiaUrl(mbeanName: string, attribute: string): string;
        update(mbeanName: string, attribute: string, value: any): void;
    }
}
declare namespace Jmx {
    const attributesModule: string;
}
declare namespace Jmx {
    class Operation {
        args: OperationArgument[];
        description: string;
        name: string;
        readableName: string;
        canInvoke: boolean;
        constructor(method: string, args: OperationArgument[], description: string);
        private static buildName(method, args);
        private static buildReadableName(method, args);
    }
    class OperationArgument {
        name: string;
        type: string;
        desc: string;
        constructor();
        readableType(): string;
    }
}
declare namespace Jmx {
    class OperationsService {
        private $q;
        private jolokia;
        private jolokiaUrl;
        private workspace;
        private treeService;
        private rbacACLMBean;
        constructor($q: ng.IQService, jolokia: Jolokia.IJolokia, jolokiaUrl: string, workspace: Jmx.Workspace, treeService: TreeService, rbacACLMBean: ng.IPromise<string>);
        getOperations(): ng.IPromise<Operation[]>;
        private fetchOperations(mbeanName);
        private addOperation(operations, operationMap, opName, op);
        private fetchPermissions(operationMap, mbeanName);
        executeOperation(mbeanName: string, operation: Operation, argValues?: any[]): ng.IPromise<string>;
        buildJolokiaUrl(operation: Operation): string;
    }
}
declare namespace Jmx {
    class OperationsController {
        private operationsService;
        operations: Operation[];
        config: {
            showSelectBox: boolean;
            useExpandingRows: boolean;
        };
        menuActions: {
            name: string;
            actionFn: (action: any, item: Operation) => void;
        }[];
        constructor(operationsService: OperationsService);
        $onInit(): void;
    }
    const operationsComponent: angular.IComponentOptions;
}
declare namespace Jmx {
    class OperationFormController {
        private workspace;
        private operationsService;
        operation: Operation;
        formFields: {
            label: string;
            type: string;
            helpText: string;
            value: any;
        }[];
        editorMode: string;
        operationFailed: boolean;
        operationResult: string;
        isExecuting: boolean;
        constructor(workspace: Workspace, operationsService: OperationsService);
        $onInit(): void;
        private static buildHelpText(arg);
        private static convertToHtmlInputType(javaType);
        private static getDefaultValue(javaType);
        execute(): void;
    }
    const operationFormComponent: angular.IComponentOptions;
}
declare namespace Jmx {
    const operationsModule: string;
}
declare namespace Jmx {
    class TreeHeaderController {
        private $scope;
        private $element;
        filter: string;
        result: any[];
        constructor($scope: any, $element: JQuery);
        $onInit(): void;
        private search(filter);
        private tree();
        expandAll(): any;
        contractAll(): any;
    }
}
declare namespace Jmx {
    const treeHeaderComponent: angular.IComponentOptions;
}
declare namespace Jmx {
    class TreeController {
        private $scope;
        private $location;
        private workspace;
        private $element;
        private $timeout;
        constructor($scope: any, $location: ng.ILocationService, workspace: Workspace, $element: JQuery, $timeout: ng.ITimeoutService);
        $onInit(): void;
        treeFetched(): boolean;
        updateSelectionFromURL(): void;
        private populateTree();
        private removeTree();
    }
    const treeComponent: angular.IComponentOptions;
}
declare namespace Jmx {
    const treeModule: string;
    const treeElementId = "#jmxtree";
}
declare namespace Jmx {
    var _module: angular.IModule;
}
declare namespace Jmx {
    var AreaChartController: angular.IModule;
}
declare namespace Jmx {
}
declare namespace Jmx {
}
declare namespace Jmx {
    var DonutChartController: angular.IModule;
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
declare namespace JVM {
}
declare namespace JVM {
    var HeaderController: angular.IModule;
}
declare namespace JVM {
    function JolokiaPreferences($scope: any, localStorage: any, jolokiaParams: any, $window: any): void;
}
declare namespace JVM {
    class JolokiaService {
        private $q;
        private jolokia;
        constructor($q: ng.IQService, jolokia: Jolokia.IJolokia);
        getMBean(objectName: string): ng.IPromise<any>;
        getMBeans(objectNames: string[]): ng.IPromise<any[]>;
        getAttribute(objectName: string, attribute: string): ng.IPromise<any>;
        getAttributes(objectName: string, attributes: string[]): ng.IPromise<object>;
        setAttribute(objectName: string, attribute: string, value: any): ng.IPromise<any>;
        execute(objectName: string, operation: string, ...args: any[]): ng.IPromise<any>;
        executeMany(objectNames: string[], operation: string, ...args: any[]): ng.IPromise<any[]>;
    }
}
/**
 * @module JVM
 */
declare namespace JVM {
}
declare namespace JVM {
}
declare namespace JVM {
}
declare namespace RBAC {
    class JmxTreeProcessor {
        private jolokia;
        private jolokiaStatus;
        private rbacTasks;
        private workspace;
        constructor(jolokia: Jolokia.IJolokia, jolokiaStatus: JVM.JolokiaStatus, rbacTasks: RBACTasks, workspace: Jmx.Workspace);
        process(tree: Jmx.Folder): void;
        private flattenMBeanTree(mbeans, tree);
        private processWithRBAC(mbeans);
        private processGeneral(aclMBean, mbeans);
        private addOperation(mbean, opList, opName, op);
        private addCanInvokeToClass(mbean, canInvoke);
        private stripClasses(css);
        private addClass(css, _class);
    }
}
declare namespace RBAC {
    /**
     * Directive that sets an element's visibility to hidden if the user cannot invoke the supplied operation
     */
    class HawtioShow implements ng.IDirective {
        private workspace;
        restrict: string;
        constructor(workspace: Jmx.Workspace);
        static factory(workspace: Jmx.Workspace): HawtioShow;
        link(scope: ng.IScope, element: ng.IAugmentedJQuery, attr: ng.IAttributes): void;
        private applyInvokeRights(element, objectName, attr);
        private getCanInvokeOperation(methodName, argumentTypes);
        private getArguments(canInvokeOp, objectName, methodName, argumentTypes);
        private changeDisplay(element, invokeRights, mode);
    }
}
declare namespace RBAC {
    class RBACTasksFactory {
        static create(postLoginTasks: Core.Tasks, jolokia: Jolokia.IJolokia, $q: ng.IQService): RBACTasks;
    }
    class RBACACLMBeanFactory {
        static create(rbacTasks: RBACTasks): ng.IPromise<string>;
    }
}
/**
 * @namespace RBAC
 * @main RBAC
 */
declare namespace RBAC {
    const pluginName: string;
    const log: Logging.Logger;
}
declare namespace Runtime {
    class RuntimeService {
        private treeService;
        constructor(treeService: Jmx.TreeService);
        getTabs(): ng.IPromise<Nav.HawtioTab[]>;
    }
}
declare namespace Runtime {
    class RuntimeController {
        private $location;
        private runtimeService;
        tabs: Nav.HawtioTab[];
        constructor($location: ng.ILocationService, runtimeService: RuntimeService);
        $onInit(): void;
        goto(tab: Nav.HawtioTab): void;
    }
    const runtimeComponent: angular.IComponentOptions;
}
declare namespace Runtime {
    function configureRoutes($routeProvider: angular.route.IRouteProvider): void;
    function configureLayout($templateCache: ng.ITemplateCacheService, viewRegistry: any, helpRegistry: Help.HelpRegistry, treeService: Jmx.TreeService, workspace: Jmx.Workspace): void;
}
declare namespace Runtime {
    interface SystemProperty {
        name: string;
        value: string;
    }
}
declare namespace Runtime {
    class SystemPropertiesService {
        private jolokiaService;
        constructor(jolokiaService: JVM.JolokiaService);
        getSystemProperties(): ng.IPromise<SystemProperty[]>;
    }
}
declare namespace Runtime {
    class SystemPropertiesController {
        private systemPropertiesService;
        private toolbarConfig;
        private tableConfig;
        private pageConfig;
        private tableColumns;
        private tableDtOptions;
        private sysprops;
        private tableItems;
        constructor(systemPropertiesService: SystemPropertiesService);
        $onInit(): void;
        private loadData();
        private applyFilters(filters);
    }
    const systemPropertiesComponent: angular.IComponentOptions;
}
declare namespace Runtime {
    const systemPropertiesModule: string;
}
declare namespace Runtime {
    class MetricsService {
        private jolokia;
        private workspace;
        constructor(jolokia: Jolokia.IJolokia, workspace: Jmx.Workspace);
        registerJolokiaRequests(scope: ng.IScope, callback: any): void;
        unregisterJolokiaRequests(scope: ng.IScope): void;
        createMetric(name: string, value: any, unit?: string): Metric;
        createUtilizationMetric(name: string, used: any, total: any, unit?: string): UtilizationMetric;
        private createMBeanRequest(mbean);
    }
}
declare namespace Runtime {
    enum MetricType {
        JVM = "JVM",
        SYSTEM = "System",
        SPRING_BOOT = "Spring Boot",
    }
    class Metric {
        name: string;
        value: any;
        unit: string;
        constructor(name: string, value: any, unit?: string);
        getDescription(): string;
    }
    class UtilizationMetric extends Metric {
        name: string;
        value: any;
        available: any;
        unit: string;
        constructor(name: string, value: any, available: any, unit: string);
        getDescription(): string;
    }
    class MetricGroup {
        type: MetricType;
        metrics: Metric[];
        constructor(type: MetricType, metrics?: Metric[]);
        updateMetrics(metrics: Metric[]): void;
    }
}
declare namespace Runtime {
    class MetricsController {
        private $scope;
        private metricsService;
        private $filter;
        private humanizeService;
        private loading;
        private metricGroups;
        constructor($scope: any, metricsService: MetricsService, $filter: ng.IFilterService, humanizeService: Core.HumanizeService);
        $onInit(): void;
        $onDestroy(): void;
        private loadMetrics(result);
        private getMetricGroup(type);
        private formatBytes(bytes);
    }
    const metricsComponent: angular.IComponentOptions;
}
declare namespace Runtime {
    const metricsModule: string;
}
declare namespace Runtime {
    class ThreadsService {
        private $q;
        private jolokia;
        private static STATE_LABELS;
        constructor($q: angular.IQService, jolokia: Jolokia.IJolokia);
        getThreads(): angular.IPromise<any[]>;
    }
}
declare namespace Runtime {
    function ThreadsController($scope: any, $uibModal: angular.ui.bootstrap.IModalService, threadsService: ThreadsService): void;
}
declare namespace Runtime {
    const threadsModule: string;
}
declare namespace Runtime {
    const log: Logging.Logger;
}
