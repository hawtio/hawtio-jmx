/// <reference path="../libs/hawtio-ui/defs.d.ts"/>
/// <reference path="../libs/hawtio-forms/defs.d.ts"/>

/// <reference path="../../includes.ts"/>
var JVM;
(function (JVM) {
    JVM.rootPath = 'plugins/jvm';
    JVM.templatePath = UrlHelpers.join(JVM.rootPath, '/html');
    JVM.pluginName = 'hawtio-jvm';
    JVM.log = Logger.get(JVM.pluginName);
    JVM.connectControllerKey = "jvmConnectSettings";
    JVM.connectionSettingsKey = Core.connectionSettingsKey;
    JVM.logoPath = 'img/icons/jvm/';
    JVM.logoRegistry = {
        'jetty': JVM.logoPath + 'jetty-logo-80x22.png',
        'tomcat': JVM.logoPath + 'tomcat-logo.gif',
        'generic': JVM.logoPath + 'java-logo.svg'
    };
})(JVM || (JVM = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="jvmGlobals.ts"/>
/**
 * @module JVM
 */
var JVM;
(function (JVM) {
    /**
     * Adds common properties and functions to the scope
     * @method configureScope
     * @for Jvm
     * @param {*} $scope
     * @param {ng.ILocationService} $location
     * @param {Core.Workspace} workspace
     */
    function configureScope($scope, $location, workspace) {
        $scope.isActive = function (href) {
            var tidy = Core.trimLeading(href, "#");
            var loc = $location.path();
            return loc === tidy;
        };
        $scope.isValid = function (link) {
            return link && link.isValid(workspace);
        };
        $scope.hasLocalMBean = function () {
            return JVM.hasLocalMBean(workspace);
        };
    }
    JVM.configureScope = configureScope;
    function hasLocalMBean(workspace) {
        return workspace.treeContainsDomainAndProperties('hawtio', { type: 'JVMList' });
    }
    JVM.hasLocalMBean = hasLocalMBean;
    function hasDiscoveryMBean(workspace) {
        return workspace.treeContainsDomainAndProperties('jolokia', { type: 'Discovery' });
    }
    JVM.hasDiscoveryMBean = hasDiscoveryMBean;
})(JVM || (JVM = {}));
var Core;
(function (Core) {
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
    function createJolokia(url, username, password) {
        var jolokiaParams = {
            url: url,
            username: username,
            password: password,
            canonicalNaming: false, ignoreErrors: true, mimeType: 'application/json'
        };
        return new Jolokia(jolokiaParams);
    }
    Core.createJolokia = createJolokia;
    function getRecentConnections(localStorage) {
        if (Core.isBlank(localStorage['recentConnections'])) {
            Core.clearConnections();
        }
        return angular.fromJson(localStorage['recentConnections']);
    }
    Core.getRecentConnections = getRecentConnections;
    function addRecentConnection(localStorage, name) {
        var recent = getRecentConnections(localStorage);
        recent = recent.add(name).unique().first(5);
        localStorage['recentConnections'] = angular.toJson(recent);
    }
    Core.addRecentConnection = addRecentConnection;
    function removeRecentConnection(localStorage, name) {
        var recent = getRecentConnections(localStorage);
        recent = recent.exclude(function (n) { return n === name; });
        localStorage['recentConnections'] = angular.toJson(recent);
    }
    Core.removeRecentConnection = removeRecentConnection;
    function clearConnections() {
        localStorage['recentConnections'] = '[]';
    }
    Core.clearConnections = clearConnections;
    function isRemoteConnection() {
        return ('con' in new URI().query(true));
    }
    Core.isRemoteConnection = isRemoteConnection;
    function saveConnection(options) {
        var connectionMap = Core.loadConnectionMap();
        // use a copy so we can leave the original one alone
        var clone = angular.extend({}, options);
        delete clone.userName;
        delete clone.password;
        connectionMap[options.name] = clone;
        Core.saveConnectionMap(connectionMap);
    }
    Core.saveConnection = saveConnection;
    function connectToServer(localStorage, options) {
        Core.log.debug("Connecting with options: ", StringHelpers.toString(options));
        addRecentConnection(localStorage, options.name);
        if (!('userName' in options)) {
            var userDetails = HawtioCore.injector.get('userDetails');
            options.userName = userDetails.username;
            options.password = userDetails.password;
        }
        saveConnection(options);
        var $window = HawtioCore.injector.get('$window');
        var url = (options.view || '/') + '?con=' + options.name;
        url = url.replace(/\?/g, "&");
        url = url.replace(/&/, "?");
        var newWindow = $window.open(url);
        newWindow['con'] = options.name;
        newWindow['userDetails'] = {
            username: options.userName,
            password: options.password,
            loginDetails: {}
        };
    }
    Core.connectToServer = connectToServer;
    /**
     * Loads all of the available connections from local storage
     * @returns {Core.ConnectionMap}
     */
    function loadConnectionMap() {
        var localStorage = Core.getLocalStorage();
        try {
            var answer = angular.fromJson(localStorage[Core.connectionSettingsKey]);
            if (!answer) {
                return {};
            }
            else {
                return answer;
            }
        }
        catch (e) {
            // corrupt config
            delete localStorage[Core.connectionSettingsKey];
            return {};
        }
    }
    Core.loadConnectionMap = loadConnectionMap;
    /**
     * Saves the connection map to local storage
     * @param map
     */
    function saveConnectionMap(map) {
        Logger.get("Core").debug("Saving connection map: ", StringHelpers.toString(map));
        localStorage[Core.connectionSettingsKey] = angular.toJson(map);
    }
    Core.saveConnectionMap = saveConnectionMap;
    function getConnectionNameParameter() {
        return new URI().search(true)['con'];
    }
    Core.getConnectionNameParameter = getConnectionNameParameter;
    /**
     * Returns the connection options for the given connection name from localStorage
     */
    function getConnectOptions(name, localStorage) {
        if (localStorage === void 0) { localStorage = Core.getLocalStorage(); }
        if (!name) {
            return null;
        }
        return Core.loadConnectionMap()[name];
    }
    Core.getConnectOptions = getConnectOptions;
    /**
     * Creates the Jolokia URL string for the given connection options
     */
    function createServerConnectionUrl(options) {
        Logger.get("Core").debug("Connect to server, options: ", StringHelpers.toString(options));
        var answer = null;
        if (options.jolokiaUrl) {
            answer = options.jolokiaUrl;
        }
        if (answer === null) {
            var uri = new URI();
            uri.protocol(options.scheme || 'http')
                .host(options.host || 'localhost')
                .port((options.port || '80'))
                .path(options.path);
            if (options.useProxy) {
                answer = UrlHelpers.join('proxy', uri.protocol(), uri.hostname(), uri.port(), uri.path());
            }
            else {
                answer = uri.toString();
            }
        }
        Logger.get(JVM.pluginName).debug("Using URL: ", answer);
        return answer;
    }
    Core.createServerConnectionUrl = createServerConnectionUrl;
})(Core || (Core = {}));

var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
/// <reference path="../../includes.ts"/>
/**
 * @module Core
 */
var Core;
(function (Core) {
    /**
     * @class Folder
     * @uses NodeSelection
     */
    var Folder = (function () {
        function Folder(title) {
            this.title = title;
            this.id = null;
            this.typeName = null;
            this.items = [];
            this.folderNames = [];
            this.domain = null;
            this.objectName = null;
            this.map = {};
            this.entries = {};
            this.addClass = null;
            this.parent = null;
            this.isLazy = false;
            this.icon = null;
            this.tooltip = null;
            this.entity = null;
            this.version = null;
            this.mbean = null;
            this.addClass = Core.escapeTreeCssStyles(title);
        }
        Object.defineProperty(Folder.prototype, "key", {
            get: function () {
                return this.id;
            },
            set: function (key) {
                this.id = key;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Folder.prototype, "children", {
            get: function () {
                return this.items;
            },
            set: function (items) {
                this.items = items;
            },
            enumerable: true,
            configurable: true
        });
        Folder.prototype.get = function (key) {
            return this.map[key];
        };
        Folder.prototype.isFolder = function () {
            return this.children.length > 0;
        };
        /**
         * Navigates the given paths and returns the value there or null if no value could be found
         * @method navigate
         * @for Folder
         * @param {Array} paths
         * @return {NodeSelection}
         */
        Folder.prototype.navigate = function () {
            var paths = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                paths[_i - 0] = arguments[_i];
            }
            var node = this;
            paths.forEach(function (path) {
                if (node) {
                    node = node.get(path);
                }
            });
            return node;
        };
        Folder.prototype.hasEntry = function (key, value) {
            var entries = this.entries;
            if (entries) {
                var actual = entries[key];
                return actual && value === actual;
            }
            return false;
        };
        Folder.prototype.parentHasEntry = function (key, value) {
            if (this.parent) {
                return this.parent.hasEntry(key, value);
            }
            return false;
        };
        Folder.prototype.ancestorHasEntry = function (key, value) {
            var parent = this.parent;
            while (parent) {
                if (parent.hasEntry(key, value))
                    return true;
                parent = parent.parent;
            }
            return false;
        };
        Folder.prototype.ancestorHasType = function (typeName) {
            var parent = this.parent;
            while (parent) {
                if (typeName === parent.typeName)
                    return true;
                parent = parent.parent;
            }
            return false;
        };
        Folder.prototype.getOrElse = function (key, defaultValue) {
            if (defaultValue === void 0) { defaultValue = new Folder(key); }
            var answer = this.map[key];
            if (!answer) {
                answer = defaultValue;
                this.map[key] = answer;
                this.children.push(answer);
                answer.parent = this;
            }
            return answer;
        };
        Folder.prototype.sortChildren = function (recursive) {
            var children = this.children;
            if (children) {
                this.children = _.sortBy(children, "title");
                if (recursive) {
                    angular.forEach(children, function (child) { return child.sortChildren(recursive); });
                }
            }
        };
        Folder.prototype.moveChild = function (child) {
            if (child && child.parent !== this) {
                child.detach();
                child.parent = this;
                this.children.push(child);
            }
        };
        Folder.prototype.insertBefore = function (child, referenceFolder) {
            child.detach();
            child.parent = this;
            var idx = _.indexOf((this.children), referenceFolder);
            if (idx >= 0) {
                this.children.splice(idx, 0, child);
            }
        };
        Folder.prototype.insertAfter = function (child, referenceFolder) {
            child.detach();
            child.parent = this;
            var idx = _.indexOf((this.children), referenceFolder);
            if (idx >= 0) {
                this.children.splice(idx + 1, 0, child);
            }
        };
        /**
         * Removes this node from my parent if I have one
         * @method detach
         * @for Folder
      \   */
        Folder.prototype.detach = function () {
            var _this = this;
            var oldParent = this.parent;
            if (oldParent) {
                var oldParentChildren = oldParent.children;
                if (oldParentChildren) {
                    var idx = oldParentChildren.indexOf(this);
                    if (idx < 0) {
                        _.remove(oldParent.children, function (child) { return child.key === _this.key; });
                    }
                    else {
                        oldParentChildren.splice(idx, 1);
                    }
                }
                this.parent = null;
            }
        };
        /**
         * Searches this folder and all its descendants for the first folder to match the filter
         * @method findDescendant
         * @for Folder
         * @param {Function} filter
         * @return {Folder}
         */
        Folder.prototype.findDescendant = function (filter) {
            if (filter(this)) {
                return this;
            }
            var answer = null;
            angular.forEach(this.children, function (child) {
                if (!answer) {
                    answer = child.findDescendant(filter);
                }
            });
            return answer;
        };
        /**
         * Searches this folder and all its ancestors for the first folder to match the filter
         * @method findDescendant
         * @for Folder
         * @param {Function} filter
         * @return {Folder}
         */
        Folder.prototype.findAncestor = function (filter) {
            if (filter(this)) {
                return this;
            }
            if (this.parent != null) {
                return this.parent.findAncestor(filter);
            }
            else {
                return null;
            }
        };
        return Folder;
    })();
    Core.Folder = Folder;
})(Core || (Core = {}));
;
var Folder = (function (_super) {
    __extends(Folder, _super);
    function Folder() {
        _super.apply(this, arguments);
    }
    return Folder;
})(Core.Folder);
;

/// <reference path="../../includes.ts"/>
/// <reference path="jvmHelpers.ts"/>
/**
 * @module JVM
 * @main JVM
 */
var JVM;
(function (JVM) {
    JVM.windowJolokia = undefined;
    JVM._module = angular.module(JVM.pluginName, []);
    JVM._module.config(["$provide", "$routeProvider", function ($provide, $routeProvider) {
            /*
            $provide.decorator('WelcomePageRegistry', ['$delegate', ($delegate) => {
              return {
        
              }
            }]);
            */
            $routeProvider
                .when('/jvm', { redirectTo: '/jvm/connect' })
                .when('/jvm/welcome', { templateUrl: UrlHelpers.join(JVM.templatePath, 'welcome.html') })
                .when('/jvm/discover', { templateUrl: UrlHelpers.join(JVM.templatePath, 'discover.html') })
                .when('/jvm/connect', { templateUrl: UrlHelpers.join(JVM.templatePath, 'connect.html') })
                .when('/jvm/local', { templateUrl: UrlHelpers.join(JVM.templatePath, 'local.html') });
        }]);
    JVM._module.constant('mbeanName', 'hawtio:type=JVMList');
    JVM._module.run(["HawtioNav", "$location", "workspace", "viewRegistry", "layoutFull", "helpRegistry", "preferencesRegistry", "ConnectOptions", "locationChangeStartTasks", "HawtioDashboard", "HawtioExtension", "$templateCache", "$compile", function (nav, $location, workspace, viewRegistry, layoutFull, helpRegistry, preferencesRegistry, ConnectOptions, locationChangeStartTasks, dash, extensions, $templateCache, $compile) {
            extensions.add('hawtio-header', function ($scope) {
                var template = $templateCache.get(UrlHelpers.join(JVM.templatePath, 'navbarHeaderExtension.html'));
                return $compile(template)($scope);
            });
            if (!dash.inDashboard) {
                // ensure that if the connection parameter is present, that we keep it
                locationChangeStartTasks.addTask('ConParam', function ($event, newUrl, oldUrl) {
                    // we can't execute until the app is initialized...
                    if (!HawtioCore.injector) {
                        return;
                    }
                    //log.debug("ConParam task firing, newUrl: ", newUrl, " oldUrl: ", oldUrl, " ConnectOptions: ", ConnectOptions);
                    if (!ConnectOptions || !ConnectOptions.name || !newUrl) {
                        return;
                    }
                    var newQuery = new URI(newUrl).query(true);
                    if (!newQuery.con) {
                        //log.debug("Lost connection parameter (", ConnectOptions.name, ") from query params: ", newQuery, " resetting");
                        newQuery['con'] = ConnectOptions.name;
                        $location.search(newQuery);
                    }
                });
            }
            var builder = nav.builder();
            var remote = builder.id('jvm-remote')
                .href(function () { return '/jvm/connect'; })
                .title(function () { return 'Remote'; })
                .tooltip(function () { return 'To connect to a remote JVM'; })
                .build();
            var local = builder.id('jvm-local')
                .href(function () { return '/jvm/local'; })
                .title(function () { return 'Local'; })
                .tooltip(function () { return 'To connect to a locale JVM'; })
                .show(function () { return JVM.hasLocalMBean(workspace); })
                .build();
            var discover = builder.id('jvm-discover')
                .href(function () { return '/jvm/discover'; })
                .title(function () { return 'Discover'; })
                .tooltip(function () { return 'To discover JVMs in the network that has Jolokia agent running'; })
                .show(function () { return JVM.hasDiscoveryMBean(workspace); })
                .build();
            var tab = builder.id('jvm')
                .href(function () { return '/jvm'; })
                .title(function () { return 'Connect'; })
                .isValid(function () { return ConnectOptions == null || ConnectOptions.name == null; })
                .tabs(remote, local, discover)
                .build();
            nav.add(tab);
            helpRegistry.addUserDoc('jvm', 'plugins/jvm/doc/help.md');
            preferencesRegistry.addTab("Connect", 'plugins/jvm/html/reset.html');
            preferencesRegistry.addTab("Jolokia", "plugins/jvm/html/jolokiaPreferences.html");
        }]);
    hawtioPluginLoader.addModule(JVM.pluginName);
})(JVM || (JVM = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="jvmPlugin.ts"/>
/**
 * @module JVM
 */
var JVM;
(function (JVM) {
    var urlCandidates = ['/hawtio/jolokia', '/jolokia', 'jolokia'];
    var discoveredUrl = null;
    hawtioPluginLoader.registerPreBootstrapTask({
        name: 'JvmParseLocation',
        task: function (next) {
            var uri = new URI();
            var query = uri.query(true);
            JVM.log.debug("query: ", query);
            var jolokiaUrl = query['jolokiaUrl'];
            if (jolokiaUrl) {
                delete query['sub-tab'];
                delete query['main-tab'];
                jolokiaUrl = URI.decode(jolokiaUrl);
                var jolokiaURI = new URI(jolokiaUrl);
                var name = query['title'] || 'Unknown Connection';
                var token = query['token'] || Core.trimLeading(uri.hash(), '#');
                var options = Core.createConnectOptions({
                    name: name,
                    scheme: jolokiaURI.protocol(),
                    host: jolokiaURI.hostname(),
                    port: Core.parseIntValue(jolokiaURI.port()),
                    path: Core.trimLeading(jolokiaURI.pathname(), '/'),
                    useProxy: false
                });
                if (!Core.isBlank(token)) {
                    options['token'] = token;
                }
                _.merge(options, jolokiaURI.query(true));
                _.assign(options, query);
                JVM.log.debug("options: ", options);
                var connectionMap = Core.loadConnectionMap();
                connectionMap[name] = options;
                Core.saveConnectionMap(connectionMap);
                uri.hash("").query({
                    con: name
                });
                window.location.replace(uri.toString());
                // don't allow bootstrap to continue
                return;
            }
            var connectionName = query['con'];
            if (connectionName) {
                JVM.log.debug("Not discovering jolokia");
                // a connection name is set, no need to discover a jolokia instance
                next();
                return;
            }
            function maybeCheckNext(candidates) {
                if (candidates.length === 0) {
                    next();
                }
                else {
                    checkNext(candidates.pop());
                }
            }
            function checkNext(url) {
                JVM.log.debug("trying URL: ", url);
                $.ajax(url).always(function (data, statusText, jqXHR) {
                    // for $.ajax().always(), the xhr is flipped on fail
                    if (statusText !== 'success') {
                        jqXHR = data;
                    }
                    if (jqXHR.status === 200) {
                        try {
                            var resp = angular.fromJson(data);
                            //log.debug("Got response: ", resp);
                            if ('value' in resp && 'agent' in resp.value) {
                                discoveredUrl = url;
                                JVM.log.debug("Found jolokia agent at: ", url, " version: ", resp.value.agent);
                                next();
                            }
                            else {
                                maybeCheckNext(urlCandidates);
                            }
                        }
                        catch (e) {
                            maybeCheckNext(urlCandidates);
                        }
                    }
                    else if (jqXHR.status === 401 || jqXHR.status === 403) {
                        // I guess this could be it...
                        discoveredUrl = url;
                        JVM.log.debug("Using URL: ", url, " assuming it could be an agent but got return code: ", jqXHR.status);
                        next();
                    }
                    else {
                        maybeCheckNext(urlCandidates);
                    }
                });
            }
            checkNext(urlCandidates.pop());
        }
    });
    JVM.ConnectionName = null;
    function getConnectionName(reset) {
        if (reset === void 0) { reset = false; }
        if (!Core.isBlank(JVM.ConnectionName) && !reset) {
            return JVM.ConnectionName;
        }
        JVM.ConnectionName = '';
        var search = new URI().search(true);
        if ('con' in window) {
            JVM.ConnectionName = window['con'];
            JVM.log.debug("Using connection name from window: ", JVM.ConnectionName);
        }
        else if ('con' in search) {
            JVM.ConnectionName = search['con'];
            JVM.log.debug("Using connection name from URL: ", JVM.ConnectionName);
        }
        else {
            JVM.log.debug("No connection name found, using direct connection to JVM");
        }
        return JVM.ConnectionName;
    }
    JVM.getConnectionName = getConnectionName;
    function getConnectionOptions() {
        var name = getConnectionName();
        if (Core.isBlank(name)) {
            // this will fail any if (ConnectOptions) check
            return false;
        }
        var answer = Core.getConnectOptions(name);
        // search for passed credentials when connecting to remote server
        try {
            if (window.opener && "passUserDetails" in window.opener) {
                answer.userName = window.opener["passUserDetails"].username;
                answer.password = window.opener["passUserDetails"].password;
            }
        }
        catch (securityException) {
        }
        return answer;
    }
    JVM.getConnectionOptions = getConnectionOptions;
    function getJolokiaUrl() {
        var answer = undefined;
        var ConnectOptions = getConnectionOptions();
        var documentBase = HawtioCore.documentBase();
        if (!ConnectOptions || !ConnectOptions.name) {
            JVM.log.debug("Using discovered URL");
            answer = discoveredUrl;
        }
        else {
            answer = Core.createServerConnectionUrl(ConnectOptions);
            JVM.log.debug("Using configured URL");
        }
        if (!answer) {
            // this will force a dummy jolokia instance
            return false;
        }
        // build full URL
        var windowURI = new URI();
        var jolokiaURI = undefined;
        if (_.startsWith(answer, '/') || _.startsWith(answer, 'http')) {
            jolokiaURI = new URI(answer);
        }
        else {
            jolokiaURI = new URI(UrlHelpers.join(documentBase, answer));
        }
        if (!jolokiaURI.protocol()) {
            jolokiaURI.protocol(windowURI.protocol());
        }
        if (!jolokiaURI.hostname()) {
            jolokiaURI.host(windowURI.hostname());
        }
        if (!jolokiaURI.port()) {
            jolokiaURI.port(windowURI.port());
        }
        answer = jolokiaURI.toString();
        JVM.log.debug("Complete jolokia URL: ", answer);
        return answer;
    }
    JVM.getJolokiaUrl = getJolokiaUrl;
    JVM._module.service('ConnectionName', [function () {
            return function (reset) {
                if (reset === void 0) { reset = false; }
                return getConnectionName(reset);
            };
        }]);
    JVM._module.service('ConnectOptions', [function () {
            return getConnectionOptions();
        }]);
    // the jolokia URL we're connected to
    JVM._module.factory('jolokiaUrl', [function () {
            return getJolokiaUrl();
        }]);
    // holds the status returned from the last jolokia call (?)
    JVM._module.factory('jolokiaStatus', function () {
        return {
            xhr: null
        };
    });
    JVM.DEFAULT_MAX_DEPTH = 7;
    JVM.DEFAULT_MAX_COLLECTION_SIZE = 500;
    JVM._module.factory('jolokiaParams', ["jolokiaUrl", "localStorage", function (jolokiaUrl, localStorage) {
            var answer = {
                canonicalNaming: false,
                ignoreErrors: true,
                mimeType: 'application/json',
                maxDepth: JVM.DEFAULT_MAX_DEPTH,
                maxCollectionSize: JVM.DEFAULT_MAX_COLLECTION_SIZE
            };
            if ('jolokiaParams' in localStorage) {
                answer = angular.fromJson(localStorage['jolokiaParams']);
            }
            else {
                localStorage['jolokiaParams'] = angular.toJson(answer);
            }
            answer['url'] = jolokiaUrl;
            return answer;
        }]);
    function getBeforeSend() {
        // Just set Authorization for now...
        var headers = ['Authorization'];
        var connectionOptions = getConnectionOptions();
        if (connectionOptions.token) {
            JVM.log.debug("Setting authorization header to token");
            return function (xhr) {
                headers.forEach(function (header) {
                    xhr.setRequestHeader(header, 'Bearer ' + connectionOptions.token);
                });
            };
        }
        else if (connectionOptions.username && connectionOptions.password) {
            JVM.log.debug("Setting authorization header to username/password");
            return function (xhr) {
                headers.forEach(function (header) {
                    xhr.setRequestHeader(header, Core.getBasicAuthHeader(connectionOptions.username, connectionOptions.password));
                });
            };
        }
        else {
            JVM.log.debug("Not setting any authorization header");
            return function (xhr) {
            };
        }
    }
    JVM.getBeforeSend = getBeforeSend;
    JVM._module.factory('jolokia', ["$location", "localStorage", "jolokiaStatus", "$rootScope", "userDetails", "jolokiaParams", "jolokiaUrl", "ConnectOptions", "HawtioDashboard", "$modal", function ($location, localStorage, jolokiaStatus, $rootScope, userDetails, jolokiaParams, jolokiaUrl, connectionOptions, dash, $modal) {
            if (dash.inDashboard && JVM.windowJolokia) {
                return JVM.windowJolokia;
            }
            if (jolokiaUrl) {
                // pass basic auth credentials down to jolokia if set
                var username = null;
                var password = null;
                if (connectionOptions.userName && connectionOptions.password) {
                    username = connectionOptions.userName;
                    password = connectionOptions.password;
                    userDetails.username = username;
                    userDetails.password = password;
                }
                else if (angular.isDefined(userDetails) &&
                    angular.isDefined(userDetails.username) &&
                    angular.isDefined(userDetails.password)) {
                    username = userDetails.username;
                    password = userDetails.password;
                }
                else {
                    // lets see if they are passed in via request parameter...
                    var search = $location.search();
                    username = search["_user"];
                    password = search["_pwd"];
                    if (angular.isArray(username))
                        username = username[0];
                    if (angular.isArray(password))
                        password = password[0];
                }
                $.ajaxSetup({
                    beforeSend: getBeforeSend()
                });
                var modal = null;
                jolokiaParams['ajaxError'] = jolokiaParams['ajaxError'] ? jolokiaParams['ajaxError'] : function (xhr, textStatus, error) {
                    if (xhr.status === 401 || xhr.status === 403) {
                        userDetails.username = null;
                        userDetails.password = null;
                        delete userDetails.loginDetails;
                        if (window.opener && "passUserDetails" in window.opener) {
                            delete window.opener["passUserDetails"];
                        }
                    }
                    else {
                        jolokiaStatus.xhr = xhr;
                        if (!xhr.responseText && error) {
                            xhr.responseText = error.stack;
                        }
                    }
                    if (!modal) {
                        modal = $modal.open({
                            templateUrl: UrlHelpers.join(JVM.templatePath, 'jolokiaError.html'),
                            controller: ['$scope', '$modalInstance', 'ConnectOptions', 'jolokia', function ($scope, instance, ConnectOptions, jolokia) {
                                    jolokia.stop();
                                    $scope.responseText = xhr.responseText;
                                    $scope.ConnectOptions = ConnectOptions;
                                    $scope.retry = function () {
                                        modal = null;
                                        instance.close();
                                        jolokia.start();
                                    };
                                    $scope.goBack = function () {
                                        if (ConnectOptions.returnTo) {
                                            window.location.href = ConnectOptions.returnTo;
                                        }
                                    };
                                }]
                        });
                        Core.$apply($rootScope);
                    }
                };
                var jolokia = new Jolokia(jolokiaParams);
                jolokia.stop();
                // TODO this should really go away, need to track down any remaining spots where this is used
                //localStorage['url'] = jolokiaUrl;
                if ('updateRate' in localStorage) {
                    if (localStorage['updateRate'] > 0) {
                        jolokia.start(localStorage['updateRate']);
                    }
                }
                JVM.windowJolokia = jolokia;
                return jolokia;
            }
            else {
                var answer = {
                    isDummy: true,
                    running: false,
                    request: function (req, opts) { return null; },
                    register: function (req, opts) { return null; },
                    list: function (path, opts) { return null; },
                    search: function (mBeanPatter, opts) { return null; },
                    getAttribute: function (mbean, attribute, path, opts) { return null; },
                    setAttribute: function (mbean, attribute, value, path, opts) { },
                    version: function (opts) { return null; },
                    execute: function (mbean, operation) {
                        var args = [];
                        for (var _i = 2; _i < arguments.length; _i++) {
                            args[_i - 2] = arguments[_i];
                        }
                        return null;
                    },
                    start: function (period) {
                        answer.running = true;
                    },
                    stop: function () {
                        answer.running = false;
                    },
                    isRunning: function () { return answer.running; },
                    jobs: function () { return []; }
                };
                JVM.windowJolokia = answer;
                // empty jolokia that returns nothing
                return answer;
            }
        }]);
})(JVM || (JVM = {}));

/**
 * @module Core
 */
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
/// <reference path="../../includes.ts"/>
/// <reference path="jmxHelpers.ts"/>
/// <reference path="folder.ts"/>
/// <reference path="../../jvm/ts/jolokiaService.ts"/>
var Core;
(function (Core) {
    var log = Logger.get("workspace");
    Core.tree = null;
    hawtioPluginLoader.registerPreBootstrapTask({
        name: 'JmxLoadTree',
        depends: ['JvmParseLocation'],
        task: function (next) {
            var jolokiaUrl = JVM.getJolokiaUrl();
            if (!jolokiaUrl) {
                log.debug("No jolokia URL set up, not fetching JMX tree");
                next();
                return;
            }
            var uri = new URI(jolokiaUrl);
            uri.segment('list');
            uri.search({
                canonicalNaming: false,
                ignoreErrors: true
            });
            $.ajax(uri.toString(), {
                async: true,
                beforeSend: JVM.getBeforeSend(),
                dataType: 'json',
                cache: false,
                success: function (data) {
                    Core.tree = data;
                    log.debug("Fetched JMX tree: ", Core.tree);
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    log.info("Failed to load JMX tree, status: ", textStatus, " error: ", errorThrown, " jqXHR: ", jqXHR);
                },
                complete: function () {
                    next();
                }
            });
        }
    });
    /**
     * @class Workspace
     */
    var Workspace = (function () {
        function Workspace(jolokia, jolokiaStatus, jmxTreeLazyLoadRegistry, $location, $compile, $templateCache, localStorage, $rootScope, userDetails, HawtioNav) {
            this.jolokia = jolokia;
            this.jolokiaStatus = jolokiaStatus;
            this.jmxTreeLazyLoadRegistry = jmxTreeLazyLoadRegistry;
            this.$location = $location;
            this.$compile = $compile;
            this.$templateCache = $templateCache;
            this.localStorage = localStorage;
            this.$rootScope = $rootScope;
            this.userDetails = userDetails;
            this.HawtioNav = HawtioNav;
            this.operationCounter = 0;
            this.tree = new Core.Folder('MBeans');
            this.mbeanTypesToDomain = {};
            this.mbeanServicesToDomain = {};
            this.attributeColumnDefs = {};
            this.treePostProcessors = {};
            this.topLevelTabs = undefined;
            this.subLevelTabs = [];
            this.keyToNodeMap = {};
            this.pluginRegisterHandle = null;
            this.pluginUpdateCounter = null;
            this.treeWatchRegisterHandle = null;
            this.treeWatcherCounter = null;
            this.treeElement = null;
            this.treeFetched = false;
            // mapData allows to store arbitrary data on the workspace
            this.mapData = {};
            // set defaults
            if (!('autoRefresh' in localStorage)) {
                localStorage['autoRefresh'] = true;
            }
            if (!('updateRate' in localStorage)) {
                localStorage['updateRate'] = 5000;
            }
            var workspace = this;
            this.topLevelTabs = {
                push: function (item) {
                    log.debug("Added menu item: ", item);
                    var tab = {
                        id: item.id,
                        title: function () { return item.content; },
                        isValid: function () { return item.isValid(workspace); },
                        href: function () { return UrlHelpers.noHash(item.href()); },
                    };
                    if (item.isActive) {
                        tab['isSelected'] = function () { return item.isActive(workspace); };
                    }
                    workspace.HawtioNav.add(tab);
                },
                find: function (search) {
                }
            };
        }
        /**
         * Creates a shallow copy child workspace with its own selection and location
         * @method createChildWorkspace
         * @param {ng.ILocationService} location
         * @return {Workspace}
         */
        Workspace.prototype.createChildWorkspace = function (location) {
            var child = new Workspace(this.jolokia, this.jolokiaStatus, this.jmxTreeLazyLoadRegistry, this.$location, this.$compile, this.$templateCache, this.localStorage, this.$rootScope, this.userDetails, this.HawtioNav);
            // lets copy across all the properties just in case
            angular.forEach(this, function (value, key) { return child[key] = value; });
            child.$location = location;
            return child;
        };
        Workspace.prototype.getLocalStorage = function (key) {
            return this.localStorage[key];
        };
        Workspace.prototype.setLocalStorage = function (key, value) {
            this.localStorage[key] = value;
        };
        Workspace.prototype.loadTree = function () {
            var _this = this;
            var workspace = this;
            if (this.jolokia['isDummy']) {
                setTimeout(function () {
                    workspace.treeFetched = true;
                    workspace.populateTree({
                        value: {}
                    });
                }, 10);
                return;
            }
            if (Core.tree) {
                setTimeout(function () {
                    workspace.treeFetched = true;
                    workspace.populateTree(Core.tree);
                    Core.tree = null;
                }, 1);
            }
            else {
                var flags = {
                    ignoreErrors: true,
                    error: function (response) {
                        workspace.treeFetched = true;
                        log.debug("Error fetching JMX tree: ", response);
                    }
                };
                log.debug("jolokia: ", this.jolokia);
                this.jolokia.request({ 'type': 'list' }, Core.onSuccess(function (response) {
                    if (response.value) {
                        _this.jolokiaStatus.xhr = null;
                    }
                    workspace.treeFetched = true;
                    workspace.populateTree(response);
                }, flags));
            }
        };
        /**
         * Adds a post processor of the tree to swizzle the tree metadata after loading
         * such as correcting any typeName values or CSS styles by hand
         * @method addTreePostProcessor
         * @param {Function} processor
         */
        Workspace.prototype.addTreePostProcessor = function (processor) {
            var numKeys = _.keys(this.treePostProcessors).length;
            var nextKey = numKeys + 1;
            return this.addNamedTreePostProcessor(nextKey + '', processor);
        };
        Workspace.prototype.addNamedTreePostProcessor = function (name, processor) {
            this.treePostProcessors[name] = processor;
            var tree = this.tree;
            if (this.treeFetched && tree) {
                // the tree is loaded already so lets process it now :)
                processor(tree);
            }
            return name;
        };
        Workspace.prototype.removeNamedTreePostProcessor = function (name) {
            delete this.treePostProcessors[name];
        };
        Workspace.prototype.maybeMonitorPlugins = function () {
            if (this.treeContainsDomainAndProperties("hawtio", { type: "Registry" })) {
                if (this.pluginRegisterHandle === null) {
                    this.pluginRegisterHandle = this.jolokia.register(angular.bind(this, this.maybeUpdatePlugins), {
                        type: "read",
                        mbean: "hawtio:type=Registry",
                        attribute: "UpdateCounter"
                    });
                }
            }
            else {
                if (this.pluginRegisterHandle !== null) {
                    this.jolokia.unregister(this.pluginRegisterHandle);
                    this.pluginRegisterHandle = null;
                    this.pluginUpdateCounter = null;
                }
            }
            // lets also listen to see if we have a JMX tree watcher
            if (this.treeContainsDomainAndProperties("hawtio", { type: "TreeWatcher" })) {
                if (this.treeWatchRegisterHandle === null) {
                    this.treeWatchRegisterHandle = this.jolokia.register(angular.bind(this, this.maybeReloadTree), {
                        type: "read",
                        mbean: "hawtio:type=TreeWatcher",
                        attribute: "Counter"
                    });
                }
            }
        };
        Workspace.prototype.maybeUpdatePlugins = function (response) {
            if (this.pluginUpdateCounter === null) {
                this.pluginUpdateCounter = response.value;
                return;
            }
            if (this.pluginUpdateCounter !== response.value) {
                if (Core.parseBooleanValue(localStorage['autoRefresh'])) {
                    window.location.reload();
                }
            }
        };
        Workspace.prototype.maybeReloadTree = function (response) {
            var counter = response.value;
            if (this.treeWatcherCounter === null) {
                this.treeWatcherCounter = counter;
                return;
            }
            if (this.treeWatcherCounter !== counter) {
                this.treeWatcherCounter = counter;
                var workspace = this;
                function wrapInValue(response) {
                    var wrapper = {
                        value: response
                    };
                    workspace.populateTree(wrapper);
                }
                this.jolokia.list(null, Core.onSuccess(wrapInValue, { ignoreErrors: true, maxDepth: 2 }));
            }
        };
        Workspace.prototype.folderGetOrElse = function (folder, value) {
            if (folder) {
                try {
                    return folder.getOrElse(value);
                }
                catch (e) {
                    log.warn("Failed to find value " + value + " on folder " + folder);
                }
            }
            return null;
        };
        Workspace.prototype.populateTree = function (response) {
            log.debug("JMX tree has been loaded, data: ", response.value);
            var rootId = 'root';
            var separator = '-';
            this.mbeanTypesToDomain = {};
            this.mbeanServicesToDomain = {};
            this.keyToNodeMap = {};
            var tree = new Core.Folder('MBeans');
            tree.key = rootId;
            var domains = response.value;
            for (var domainName in domains) {
                var domainClass = Core.escapeDots(domainName);
                var domain = domains[domainName];
                for (var mbeanName in domain) {
                    // log.debug("JMX tree mbean name: " + mbeanName);
                    var entries = {};
                    var folder = this.folderGetOrElse(tree, domainName);
                    //if (!folder) continue;
                    folder.domain = domainName;
                    if (!folder.key) {
                        folder.key = rootId + separator + domainName;
                    }
                    var folderNames = [domainName];
                    folder.folderNames = folderNames;
                    folderNames = _.clone(folderNames);
                    var items = mbeanName.split(',');
                    var paths = [];
                    var typeName = null;
                    var serviceName = null;
                    items.forEach(function (item) {
                        // do not use split('=') as it splits wrong when there is a space in the mbean name
                        // var kv = item.split('=');
                        var pos = item.indexOf('=');
                        var kv = [];
                        if (pos > 0) {
                            kv[0] = item.substr(0, pos);
                            kv[1] = item.substr(pos + 1);
                        }
                        else {
                            kv[0] = item;
                        }
                        var key = kv[0];
                        var value = kv[1] || key;
                        entries[key] = value;
                        var moveToFront = false;
                        var lowerKey = key.toLowerCase();
                        if (lowerKey === "type") {
                            typeName = value;
                            // if the type name value already exists in the root node
                            // of the domain then lets move this property around too
                            if (folder.map[value]) {
                                moveToFront = true;
                            }
                        }
                        if (lowerKey === "service") {
                            serviceName = value;
                        }
                        if (moveToFront) {
                            paths.splice(0, 0, value);
                        }
                        else {
                            paths.push(value);
                        }
                    });
                    var configureFolder = function (folder, name) {
                        folder.domain = domainName;
                        if (!folder.key) {
                            folder.key = rootId + separator + folderNames.join(separator);
                        }
                        this.keyToNodeMap[folder.key] = folder;
                        folder.folderNames = _.clone(folderNames);
                        //var classes = escapeDots(folder.key);
                        var classes = "";
                        var entries = folder.entries;
                        var entryKeys = _.filter(_.keys(entries), function (n) { return n.toLowerCase().indexOf("type") >= 0; });
                        if (entryKeys.length) {
                            angular.forEach(entryKeys, function (entryKey) {
                                var entryValue = entries[entryKey];
                                if (!folder.ancestorHasEntry(entryKey, entryValue)) {
                                    classes += " " + domainClass + separator + entryValue;
                                }
                            });
                        }
                        else {
                            var kindName = _.last(folderNames);
                            /*if (folder.parent && folder.parent.title === typeName) {
                               kindName = typeName;
                               } else */
                            if (kindName === name) {
                                kindName += "-folder";
                            }
                            if (kindName) {
                                classes += " " + domainClass + separator + kindName;
                            }
                        }
                        folder.addClass = Core.escapeTreeCssStyles(classes);
                        return folder;
                    };
                    var lastPath = paths.pop();
                    var ws = this;
                    paths.forEach(function (value) {
                        folder = ws.folderGetOrElse(folder, value);
                        if (folder) {
                            folderNames.push(value);
                            angular.bind(ws, configureFolder, folder, value)();
                        }
                    });
                    var key = rootId + separator + folderNames.join(separator) + separator + lastPath;
                    var objectName = domainName + ":" + mbeanName;
                    if (folder) {
                        folder = this.folderGetOrElse(folder, lastPath);
                        if (folder) {
                            // lets add the various data into the folder
                            folder.entries = entries;
                            folder.key = key;
                            angular.bind(this, configureFolder, folder, lastPath)();
                            folder.title = Core.trimQuotes(lastPath);
                            folder.objectName = objectName;
                            folder.mbean = domain[mbeanName];
                            folder.typeName = typeName;
                            var addFolderByDomain = function (owner, typeName) {
                                var map = owner[typeName];
                                if (!map) {
                                    map = {};
                                    owner[typeName] = map;
                                }
                                var value = map[domainName];
                                if (!value) {
                                    map[domainName] = folder;
                                }
                                else {
                                    var array = null;
                                    if (angular.isArray(value)) {
                                        array = value;
                                    }
                                    else {
                                        array = [value];
                                        map[domainName] = array;
                                    }
                                    array.push(folder);
                                }
                            };
                            if (serviceName) {
                                angular.bind(this, addFolderByDomain, this.mbeanServicesToDomain, serviceName)();
                            }
                            if (typeName) {
                                angular.bind(this, addFolderByDomain, this.mbeanTypesToDomain, typeName)();
                            }
                        }
                    }
                    else {
                        log.info("No folder found for lastPath: " + lastPath);
                    }
                }
            }
            tree.sortChildren(true);
            // now lets mark the nodes with no children as lazy loading...
            this.enableLazyLoading(tree);
            this.tree = tree;
            var processors = this.treePostProcessors;
            _.forIn(processors, function (fn, key) {
                log.debug("Running tree post processor: ", key);
                fn(tree);
            });
            this.maybeMonitorPlugins();
            var rootScope = this.$rootScope;
            if (rootScope) {
                rootScope.$broadcast('jmxTreeUpdated');
                Core.$apply(rootScope);
            }
        };
        Workspace.prototype.enableLazyLoading = function (folder) {
            var _this = this;
            var children = folder.children;
            if (children && children.length) {
                angular.forEach(children, function (child) {
                    _this.enableLazyLoading(child);
                });
            }
            else {
                // we have no children so enable lazy loading if we have a custom loader registered
                var lazyFunction = Jmx.findLazyLoadingFunction(this, folder);
                if (lazyFunction) {
                    folder.isLazy = true;
                }
            }
        };
        /**
         * Returns the hash query argument to append to URL links
         * @method hash
         * @return {String}
         */
        Workspace.prototype.hash = function () {
            var hash = this.$location.search();
            var params = Core.hashToString(hash);
            if (params) {
                return "?" + params;
            }
            return "";
        };
        /**
         * Returns the currently active tab
         * @method getActiveTab
         * @return {Boolean}
         */
        Workspace.prototype.getActiveTab = function () {
            var workspace = this;
            return this.topLevelTabs.find(function (tab) {
                if (!angular.isDefined(tab.isActive)) {
                    return workspace.isLinkActive(tab.href());
                }
                else {
                    return tab.isActive(workspace);
                }
            });
        };
        Workspace.prototype.getStrippedPathName = function () {
            var pathName = Core.trimLeading((this.$location.path() || '/'), "#");
            pathName = pathName.replace(/^\//, '');
            return pathName;
        };
        Workspace.prototype.linkContains = function () {
            var words = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                words[_i - 0] = arguments[_i];
            }
            var pathName = this.getStrippedPathName();
            return _.every(words, function (word) { return pathName.indexOf(word) !== 0; });
        };
        /**
         * Returns true if the given link is active. The link can omit the leading # or / if necessary.
         * The query parameters of the URL are ignored in the comparison.
         * @method isLinkActive
         * @param {String} href
         * @return {Boolean} true if the given link is active
         */
        Workspace.prototype.isLinkActive = function (href) {
            // lets trim the leading slash
            var pathName = this.getStrippedPathName();
            var link = Core.trimLeading(href, "#");
            link = link.replace(/^\//, '');
            // strip any query arguments
            var idx = link.indexOf('?');
            if (idx >= 0) {
                link = link.substring(0, idx);
            }
            if (!pathName.length) {
                return link === pathName;
            }
            else {
                return _.startsWith(pathName, link);
            }
        };
        /**
         * Returns true if the given link is active. The link can omit the leading # or / if necessary.
         * The query parameters of the URL are ignored in the comparison.
         * @method isLinkActive
         * @param {String} href
         * @return {Boolean} true if the given link is active
         */
        Workspace.prototype.isLinkPrefixActive = function (href) {
            // lets trim the leading slash
            var pathName = this.getStrippedPathName();
            var link = Core.trimLeading(href, "#");
            link = link.replace(/^\//, '');
            // strip any query arguments
            var idx = link.indexOf('?');
            if (idx >= 0) {
                link = link.substring(0, idx);
            }
            return _.startsWith(pathName, link);
        };
        /**
         * Returns true if the tab query parameter is active or the URL starts with the given path
         * @method isTopTabActive
         * @param {String} path
         * @return {Boolean}
         */
        Workspace.prototype.isTopTabActive = function (path) {
            var tab = this.$location.search()['tab'];
            if (angular.isString(tab)) {
                return tab.startsWith(path);
            }
            return this.isLinkActive(path);
        };
        /**
         * Returns the selected mbean name if there is one
         * @method getSelectedMBeanName
         * @return {String}
         */
        Workspace.prototype.getSelectedMBeanName = function () {
            var selection = this.selection;
            if (selection) {
                return selection.objectName;
            }
            return null;
        };
        Workspace.prototype.getSelectedMBean = function () {
            if (this.selection) {
                return this.selection;
            }
            log.debug("Location: ", this.$location);
            var nid = this.$location.search()['nid'];
            if (nid && this.tree) {
                var answer = this.tree.findDescendant(function (node) {
                    return nid === node.id;
                });
                if (!this.selection) {
                    this.selection = answer;
                }
                return answer;
            }
            return null;
        };
        /**
         * Returns true if the path is valid for the current selection
         * @method validSelection
         * @param {String} uri
         * @return {Boolean}
         */
        Workspace.prototype.validSelection = function (uri) {
            return true;
            /*
            // TODO
            var workspace = this;
            var filter = (t) => {
              var fn = t.href;
              if (fn) {
                var href = fn();
                if (href) {
                  if (href.startsWith("#")) {
                    href = href.substring(1);
                  }
                  return href === uri;
                }
              }
              return false;
            };
            var tab = this.subLevelTabs.find(filter);
            if (!tab) {
              tab = this.topLevelTabs.find(filter);
            }
            if (tab) {
              console.log("Found tab: ", tab);
              var validFn = tab['isValid'];
              return !angular.isDefined(validFn) || validFn(workspace);
            } else {
              log.info("Could not find tab for " + uri);
              return false;
            }
            */
            /*
                var value = this.uriValidations[uri];
                if (value) {
                  if (angular.isFunction(value)) {
                    return value();
                  }
                }
                return true;
            */
        };
        /**
         * In cases where we have just deleted something we typically want to change
         * the selection to the parent node
         * @method removeAndSelectParentNode
         */
        Workspace.prototype.removeAndSelectParentNode = function () {
            var selection = this.selection;
            if (selection) {
                var parent = selection.parent;
                if (parent) {
                    // lets remove the selection from the parent so we don't do any more JMX attribute queries on the children
                    // or include it in table views etc
                    // would be nice to eagerly remove the tree node too?
                    var idx = parent.children.indexOf(selection);
                    if (idx < 0) {
                        idx = _.findIndex(parent.children, function (n) { return n.key === selection.key; });
                    }
                    if (idx >= 0) {
                        parent.children.splice(idx, 1);
                    }
                    this.updateSelectionNode(parent);
                }
            }
        };
        Workspace.prototype.selectParentNode = function () {
            var selection = this.selection;
            if (selection) {
                var parent = selection.parent;
                if (parent) {
                    this.updateSelectionNode(parent);
                }
            }
        };
        /**
         * Returns the view configuration key for the kind of selection
         * for example based on the domain and the node type
         * @method selectionViewConfigKey
         * @return {String}
         */
        Workspace.prototype.selectionViewConfigKey = function () {
            return this.selectionConfigKey("view/");
        };
        /**
         * Returns a configuration key for a node which is usually of the form
         * domain/typeName or for folders with no type, domain/name/folder
         * @method selectionConfigKey
         * @param {String} prefix
         * @return {String}
         */
        Workspace.prototype.selectionConfigKey = function (prefix) {
            if (prefix === void 0) { prefix = ""; }
            var key = null;
            var selection = this.selection;
            if (selection) {
                // lets make a unique string for the kind of select
                key = prefix + selection.domain;
                var typeName = selection.typeName;
                if (!typeName) {
                    typeName = selection.title;
                }
                key += "/" + typeName;
                if (selection.isFolder()) {
                    key += "/folder";
                }
            }
            return key;
        };
        Workspace.prototype.moveIfViewInvalid = function () {
            var workspace = this;
            var uri = Core.trimLeading(this.$location.path(), "/");
            if (this.selection) {
                var key = this.selectionViewConfigKey();
                if (this.validSelection(uri)) {
                    // lets remember the previous selection
                    this.setLocalStorage(key, uri);
                    return false;
                }
                else {
                    log.info("the uri '" + uri + "' is not valid for this selection");
                    // lets look up the previous preferred value for this type
                    var defaultPath = this.getLocalStorage(key);
                    if (!defaultPath || !this.validSelection(defaultPath)) {
                        // lets find the first path we can find which is valid
                        defaultPath = null;
                        angular.forEach(this.subLevelTabs, function (tab) {
                            var fn = tab.isValid;
                            if (!defaultPath && tab.href && angular.isDefined(fn) && fn(workspace)) {
                                defaultPath = tab.href();
                            }
                        });
                    }
                    if (!defaultPath) {
                        defaultPath = "#/jmx/help";
                    }
                    log.info("moving the URL to be " + defaultPath);
                    if (defaultPath.startsWith("#")) {
                        defaultPath = defaultPath.substring(1);
                    }
                    this.$location.path(defaultPath);
                    return true;
                }
            }
            else {
                return false;
            }
        };
        Workspace.prototype.updateSelectionNode = function (node) {
            var originalSelection = this.selection;
            this.selection = node;
            var key = null;
            if (node) {
                key = node['key'];
            }
            if (key) {
                var $location = this.$location;
                var q = $location.search();
                q['nid'] = key;
                $location.search(q);
            }
            // if we have updated the selection (rather than just loaded a page)
            // lets use the previous preferred view - otherwise we may be loading
            // a page from a bookmark so lets not change the view :)
            /*
            if (originalSelection) {
              key = this.selectionViewConfigKey();
              if (key) {
                var defaultPath = this.getLocalStorage(key);
                if (defaultPath) {
                  this.$location.path(defaultPath);
                }
              }
            }*/
        };
        /**
         * Redraws the tree widget
         * @method redrawTree
         */
        Workspace.prototype.redrawTree = function () {
            var treeElement = this.treeElement;
            if (treeElement && angular.isDefined(treeElement.dynatree) && angular.isFunction(treeElement.dynatree)) {
                var node = treeElement.dynatree("getTree");
                if (angular.isDefined(node)) {
                    try {
                        node.reload();
                    }
                    catch (e) {
                    }
                }
            }
        };
        /**
         * Expand / collapse the current active node
         * @method expandSelection
         * @param {Boolean} flag
         */
        Workspace.prototype.expandSelection = function (flag) {
            var treeElement = this.treeElement;
            if (treeElement && angular.isDefined(treeElement.dynatree) && angular.isFunction(treeElement.dynatree)) {
                var node = treeElement.dynatree("getActiveNode");
                if (angular.isDefined(node)) {
                    node.expand(flag);
                }
            }
        };
        Workspace.prototype.matchesProperties = function (entries, properties) {
            if (!entries)
                return false;
            for (var key in properties) {
                var value = properties[key];
                if (!value || entries[key] !== value) {
                    return false;
                }
            }
            return true;
        };
        Workspace.prototype.hasInvokeRightsForName = function (objectName) {
            var methods = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                methods[_i - 1] = arguments[_i];
            }
            // allow invoke by default, same as in hasInvokeRight() below???
            var canInvoke = true;
            if (objectName) {
                var mbean = Core.parseMBean(objectName);
                if (mbean) {
                    var mbeanFolder = this.findMBeanWithProperties(mbean.domain, mbean.attributes);
                    if (mbeanFolder) {
                        return this.hasInvokeRights.apply(this, [mbeanFolder].concat(methods));
                    }
                    else {
                        log.debug("Failed to find mbean folder with name " + objectName);
                    }
                }
                else {
                    log.debug("Failed to parse mbean name " + objectName);
                }
            }
            return canInvoke;
        };
        Workspace.prototype.hasInvokeRights = function (selection) {
            var methods = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                methods[_i - 1] = arguments[_i];
            }
            var canInvoke = true;
            if (selection) {
                var selectionFolder = selection;
                var mbean = selectionFolder.mbean;
                if (mbean) {
                    if (angular.isDefined(mbean.canInvoke)) {
                        canInvoke = mbean.canInvoke;
                    }
                    if (canInvoke && methods && methods.length > 0) {
                        var opsByString = mbean['opByString'];
                        var ops = mbean['op'];
                        if (opsByString && ops) {
                            methods.forEach(function (method) {
                                if (!canInvoke) {
                                    return;
                                }
                                var op = null;
                                if (_.endsWith(method, ')')) {
                                    op = opsByString[method];
                                }
                                else {
                                    op = ops[method];
                                }
                                if (!op) {
                                    log.debug("Could not find method:", method, " to check permissions, skipping");
                                    return;
                                }
                                if (angular.isDefined(op.canInvoke)) {
                                    canInvoke = op.canInvoke;
                                }
                            });
                        }
                    }
                }
            }
            return canInvoke;
        };
        Workspace.prototype.treeContainsDomainAndProperties = function (domainName, properties) {
            var _this = this;
            if (properties === void 0) { properties = null; }
            var workspace = this;
            var tree = workspace.tree;
            if (tree) {
                var folder = tree.get(domainName);
                if (folder) {
                    if (properties) {
                        var children = folder.children || [];
                        var checkProperties = function (node) {
                            if (!_this.matchesProperties(node.entries, properties)) {
                                if (node.domain === domainName && node.children && node.children.length > 0) {
                                    return node.children.some(checkProperties);
                                }
                                else {
                                    return false;
                                }
                            }
                            else {
                                return true;
                            }
                        };
                        return children.some(checkProperties);
                    }
                    return true;
                }
                else {
                }
            }
            else {
            }
            return false;
        };
        Workspace.prototype.matches = function (folder, properties, propertiesCount) {
            if (folder) {
                var entries = folder.entries;
                if (properties) {
                    if (!entries)
                        return false;
                    for (var key in properties) {
                        var value = properties[key];
                        if (!value || entries[key] !== value) {
                            return false;
                        }
                    }
                }
                if (propertiesCount) {
                    return entries && Object.keys(entries).length === propertiesCount;
                }
                return true;
            }
            return false;
        };
        // only display stuff if we have an mbean with the given properties
        Workspace.prototype.hasDomainAndProperties = function (domainName, properties, propertiesCount) {
            if (properties === void 0) { properties = null; }
            if (propertiesCount === void 0) { propertiesCount = null; }
            var node = this.selection;
            if (node) {
                return this.matches(node, properties, propertiesCount) && node.domain === domainName;
            }
            return false;
        };
        // only display stuff if we have an mbean with the given properties
        Workspace.prototype.findMBeanWithProperties = function (domainName, properties, propertiesCount) {
            if (properties === void 0) { properties = null; }
            if (propertiesCount === void 0) { propertiesCount = null; }
            var tree = this.tree;
            if (tree) {
                return this.findChildMBeanWithProperties(tree.get(domainName), properties, propertiesCount);
            }
            return null;
        };
        Workspace.prototype.findChildMBeanWithProperties = function (folder, properties, propertiesCount) {
            var _this = this;
            if (properties === void 0) { properties = null; }
            if (propertiesCount === void 0) { propertiesCount = null; }
            var workspace = this;
            if (folder) {
                var children = folder.children;
                if (children) {
                    var answer = children.find(function (node) { return _this.matches(node, properties, propertiesCount); });
                    if (answer) {
                        return answer;
                    }
                    return children.map(function (node) { return workspace.findChildMBeanWithProperties(node, properties, propertiesCount); }).find(function (node) { return node; });
                }
            }
            return null;
        };
        Workspace.prototype.selectionHasDomainAndLastFolderName = function (objectName, lastName) {
            var lastNameLower = (lastName || "").toLowerCase();
            function isName(name) {
                return (name || "").toLowerCase() === lastNameLower;
            }
            var node = this.selection;
            if (node) {
                if (objectName === node.domain) {
                    var folders = node.folderNames;
                    if (folders) {
                        var last = _.last(folders);
                        return (isName(last) || isName(node.title)) && node.isFolder() && !node.objectName;
                    }
                }
            }
            return false;
        };
        Workspace.prototype.selectionHasDomain = function (domainName) {
            var node = this.selection;
            if (node) {
                return domainName === node.domain;
            }
            return false;
        };
        Workspace.prototype.selectionHasDomainAndType = function (objectName, typeName) {
            var node = this.selection;
            if (node) {
                return objectName === node.domain && typeName === node.typeName;
            }
            return false;
        };
        /**
         * Returns true if this workspace has any mbeans at all
         */
        Workspace.prototype.hasMBeans = function () {
            var answer = false;
            var tree = this.tree;
            if (tree) {
                var children = tree.children;
                if (angular.isArray(children) && children.length > 0) {
                    answer = true;
                }
            }
            return answer;
        };
        Workspace.prototype.hasFabricMBean = function () {
            return this.hasDomainAndProperties('io.fabric8', { type: 'Fabric' });
        };
        Workspace.prototype.isFabricFolder = function () {
            return this.hasDomainAndProperties('io.fabric8');
        };
        Workspace.prototype.isCamelContext = function () {
            return this.hasDomainAndProperties('org.apache.camel', { type: 'context' });
        };
        Workspace.prototype.isCamelFolder = function () {
            return this.hasDomainAndProperties('org.apache.camel');
        };
        Workspace.prototype.isEndpointsFolder = function () {
            return this.selectionHasDomainAndLastFolderName('org.apache.camel', 'endpoints');
        };
        Workspace.prototype.isEndpoint = function () {
            return this.hasDomainAndProperties('org.apache.camel', { type: 'endpoints' });
        };
        Workspace.prototype.isRoutesFolder = function () {
            return this.selectionHasDomainAndLastFolderName('org.apache.camel', 'routes');
        };
        Workspace.prototype.isRoute = function () {
            return this.hasDomainAndProperties('org.apache.camel', { type: 'routes' });
        };
        Workspace.prototype.isComponentsFolder = function () {
            return this.selectionHasDomainAndLastFolderName('org.apache.camel', 'components');
        };
        Workspace.prototype.isComponent = function () {
            return this.hasDomainAndProperties('org.apache.camel', { type: 'components' });
        };
        Workspace.prototype.isDataformatsFolder = function () {
            return this.selectionHasDomainAndLastFolderName('org.apache.camel', 'dataformats');
        };
        Workspace.prototype.isDataformat = function () {
            return this.hasDomainAndProperties('org.apache.camel', { type: 'dataformats' });
        };
        Workspace.prototype.isOsgiFolder = function () {
            return this.hasDomainAndProperties('osgi.core');
        };
        Workspace.prototype.isKarafFolder = function () {
            return this.hasDomainAndProperties('org.apache.karaf');
        };
        Workspace.prototype.isOsgiCompendiumFolder = function () {
            return this.hasDomainAndProperties('osgi.compendium');
        };
        return Workspace;
    })();
    Core.Workspace = Workspace;
})(Core || (Core = {}));
// TODO refactor other code to use Core.Workspace
var Workspace = (function (_super) {
    __extends(Workspace, _super);
    function Workspace() {
        _super.apply(this, arguments);
    }
    return Workspace;
})(Core.Workspace);
;

/// <reference path="../../includes.ts"/>
/// <reference path="folder.ts"/>
/// <reference path="workspace.ts"/>
/**
 * @module Core
 */
var Core;
(function (Core) {
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
    function getMBeanTypeFolder(workspace, domain, typeName) {
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
    Core.getMBeanTypeFolder = getMBeanTypeFolder;
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
    function getMBeanTypeObjectName(workspace, domain, typeName) {
        var folder = Core.getMBeanTypeFolder(workspace, domain, typeName);
        return Core.pathGet(folder, ["objectName"]);
    }
    Core.getMBeanTypeObjectName = getMBeanTypeObjectName;
    /**
     * Creates a remote workspace given a remote jolokia for querying the JMX MBeans inside the jolokia
     * @param remoteJolokia
     * @param $location
     * @param localStorage
     * @return {Core.Workspace|Workspace}
     */
    function createRemoteWorkspace(remoteJolokia, $location, localStorage, $rootScope, $compile, $templateCache, userDetails, HawtioNav) {
        if ($rootScope === void 0) { $rootScope = null; }
        if ($compile === void 0) { $compile = null; }
        if ($templateCache === void 0) { $templateCache = null; }
        if (userDetails === void 0) { userDetails = null; }
        if (HawtioNav === void 0) { HawtioNav = null; }
        // lets create a child workspace object for the remote container
        var jolokiaStatus = {
            xhr: null
        };
        // disable reload notifications
        var jmxTreeLazyLoadRegistry = Core.lazyLoaders;
        var profileWorkspace = new Core.Workspace(remoteJolokia, jolokiaStatus, jmxTreeLazyLoadRegistry, $location, $compile, $templateCache, localStorage, $rootScope, userDetails, HawtioNav);
        Core.log.info("Loading the profile using jolokia: " + remoteJolokia);
        profileWorkspace.loadTree();
        return profileWorkspace;
    }
    Core.createRemoteWorkspace = createRemoteWorkspace;
})(Core || (Core = {}));
/**
 * @module Jmx
 */
var Jmx;
(function (Jmx) {
    Jmx.pluginName = 'hawtio-jmx';
    Jmx.log = Logger.get(Jmx.pluginName);
    Jmx.currentProcessId = '';
    Jmx.templatePath = 'plugins/jmx/html';
    function getUrlForThing(jolokiaUrl, action, mbean, name) {
        var uri = new URI(jolokiaUrl);
        uri.segment(action)
            .segment(mbean)
            .segment(name);
        return uri.toString();
    }
    Jmx.getUrlForThing = getUrlForThing;
    function getNavItems(builder, workspace, $templateCache, prefix) {
        if (prefix === void 0) { prefix = 'jmx'; }
        var attributes = builder.id(prefix + '-attributes')
            .title(function () { return '<i class="fa fa-list"></i> Attributes'; })
            .tooltip(function () { return 'List the attributes on the MBean'; })
            .href(function () { return '/jmx/attributes' + workspace.hash(); })
            .build();
        var operations = builder.id(prefix + '-operations')
            .title(function () { return '<i class="fa fa-leaf"></i> Operations'; })
            .tooltip(function () { return 'List the operations on the MBean'; })
            .href(function () { return '/jmx/operations' + workspace.hash(); })
            .build();
        var chart = builder.id(prefix + '-chart')
            .title(function () { return '<i class="fa fa-bar-chart"></i> Charts'; })
            .tooltip(function () { return 'Real time chart of the attributes from the MBean'; })
            .href(function () { return '/jmx/charts' + workspace.hash(); })
            .build();
        var editChart = builder.id(prefix + '-edit-chart')
            .title(function () { return '<i class="fa fa-cog"></i> Edit Chart'; })
            .tooltip(function () { return 'Edit the chart to choose which attributes to show from the MBean'; })
            .href(function () { return '/jmx/chartEdit' + workspace.hash(); })
            .build();
        var addToDashboard = builder.id(prefix + '-add-dashboard')
            .title(function () { return '<i class="fa fa-share"></i>'; })
            .tooltip(function () { return 'Add current view to dashboard'; })
            .attributes({
            'class': 'pull-right'
        })
            .show(function () {
            if (!HawtioCore.injector) {
                return true;
            }
            var dash = HawtioCore.injector.get('HawtioDashboard');
            return dash && dash.hasDashboard;
        })
            .click(function () {
            if (!HawtioCore.injector) {
                return;
            }
            var dash = HawtioCore.injector.get('HawtioDashboard');
            if (dash) {
                var width = 2;
                var height = 2;
                var title = workspace.getSelectedMBeanName();
                var $location = workspace.$location;
                if ($location.path().has('/jmx/charts')) {
                    width = 4;
                    height = 3;
                }
                var url = dash.getAddLink(title, width, height);
                workspace.$location.url(url.toString());
                Core.$apply(workspace.$rootScope);
            }
            return false;
        })
            .href(function () { return ''; })
            .build();
        editChart.show = function () { return workspace.isLinkActive('jmx/chart'); };
        return [attributes, operations, chart, editChart, addToDashboard];
    }
    Jmx.getNavItems = getNavItems;
    var attributesToolBars = {};
    function findLazyLoadingFunction(workspace, folder) {
        var factories = workspace.jmxTreeLazyLoadRegistry[folder.domain];
        var lazyFunction = null;
        if (factories && factories.length) {
            angular.forEach(factories, function (customLoader) {
                if (!lazyFunction) {
                    lazyFunction = customLoader(folder);
                }
            });
        }
        return lazyFunction;
    }
    Jmx.findLazyLoadingFunction = findLazyLoadingFunction;
    function registerLazyLoadHandler(domain, lazyLoaderFactory) {
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
    Jmx.registerLazyLoadHandler = registerLazyLoadHandler;
    function unregisterLazyLoadHandler(domain, lazyLoaderFactory) {
        if (Core.lazyLoaders) {
            var array = Core.lazyLoaders[domain];
            if (array) {
                array.remove(lazyLoaderFactory);
            }
        }
    }
    Jmx.unregisterLazyLoadHandler = unregisterLazyLoadHandler;
    /**
     * Registers a toolbar template for the given plugin name, jmxDomain.
     * @method addAttributeToolBar
     * @for Jmx
     * @param {String} pluginName used so that we can later on remove this function when the plugin is removed
     * @param {String} jmxDomain the JMX domain to avoid having to evaluate too many functions on each selection
     * @param {Function} fn the function used to decide which attributes tool bar should be used for the given select
     */
    function addAttributeToolBar(pluginName, jmxDomain, fn) {
        var array = attributesToolBars[jmxDomain];
        if (!array) {
            array = [];
            attributesToolBars[jmxDomain] = array;
        }
        array.push(fn);
    }
    Jmx.addAttributeToolBar = addAttributeToolBar;
    /**
     * Try find a custom toolbar HTML template for the given selection or returns the default value
     * @method getAttributeToolbar
     * @for Jmx
     * @param {Core.NodeSelection} node
     * @param {String} defaultValue
     */
    function getAttributeToolBar(node, defaultValue) {
        if (!defaultValue) {
            defaultValue = UrlHelpers.join(Jmx.templatePath, 'attributeToolBar.html');
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
                        if (answer)
                            break;
                    }
                }
            }
        }
        return (answer) ? answer : defaultValue;
    }
    Jmx.getAttributeToolBar = getAttributeToolBar;
    function updateTreeSelectionFromURL($location, treeElement, activateIfNoneSelected) {
        if (activateIfNoneSelected === void 0) { activateIfNoneSelected = false; }
        updateTreeSelectionFromURLAndAutoSelect($location, treeElement, null, activateIfNoneSelected);
    }
    Jmx.updateTreeSelectionFromURL = updateTreeSelectionFromURL;
    function updateTreeSelectionFromURLAndAutoSelect($location, treeElement, autoSelect, activateIfNoneSelected) {
        if (activateIfNoneSelected === void 0) { activateIfNoneSelected = false; }
        var dtree = treeElement.dynatree("getTree");
        if (dtree) {
            var node = null;
            var key = $location.search()['nid'];
            if (key) {
                try {
                    node = dtree.activateKey(key);
                }
                catch (e) {
                }
            }
            if (node) {
                node.expand(true);
            }
            else {
                if (!treeElement.dynatree("getActiveNode")) {
                    // lets expand the first node
                    var root = treeElement.dynatree("getRoot");
                    var children = root ? root.getChildren() : null;
                    if (children && children.length) {
                        var first = children[0];
                        first.expand(true);
                        // invoke any auto select function, and use its result as new first, if any returned
                        if (autoSelect) {
                            var result = autoSelect(first);
                            if (result) {
                                first = result;
                            }
                        }
                        if (activateIfNoneSelected) {
                            first.expand();
                            first.activate();
                        }
                    }
                    else {
                    }
                }
            }
        }
    }
    Jmx.updateTreeSelectionFromURLAndAutoSelect = updateTreeSelectionFromURLAndAutoSelect;
    function getUniqueTypeNames(children) {
        var typeNameMap = {};
        angular.forEach(children, function (mbean) {
            var typeName = mbean.typeName;
            if (typeName) {
                typeNameMap[typeName] = mbean;
            }
        });
        // only query if all the typenames are the same
        var typeNames = Object.keys(typeNameMap);
        return typeNames;
    }
    Jmx.getUniqueTypeNames = getUniqueTypeNames;
    function enableTree($scope, $location, workspace, treeElement, children, redraw, onActivateFn) {
        if (redraw === void 0) { redraw = false; }
        if (onActivateFn === void 0) { onActivateFn = null; }
        //$scope.workspace = workspace;
        if (treeElement.length) {
            if (!onActivateFn) {
                onActivateFn = function (node) {
                    var data = node.data;
                    //$scope.select(data);
                    workspace.updateSelectionNode(data);
                    Core.$apply($scope);
                };
            }
            workspace.treeElement = treeElement;
            treeElement.dynatree({
                /*
                 * The event handler called when a different node in the tree is selected
                 */
                onActivate: onActivateFn,
                onLazyRead: function (treeNode) {
                    var folder = treeNode.data;
                    var plugin = null;
                    if (folder) {
                        plugin = Jmx.findLazyLoadingFunction(workspace, folder);
                    }
                    if (plugin) {
                        console.log("Lazy loading folder " + folder.title);
                        var oldChildren = folder.childen;
                        plugin(workspace, folder, function () {
                            treeNode.setLazyNodeStatus(DTNodeStatus_Ok);
                            var newChildren = folder.children;
                            if (newChildren !== oldChildren) {
                                treeNode.removeChildren();
                                angular.forEach(newChildren, function (newChild) {
                                    treeNode.addChild(newChild);
                                });
                            }
                        });
                    }
                    else {
                        treeNode.setLazyNodeStatus(DTNodeStatus_Ok);
                    }
                },
                onClick: function (node, event) {
                    if (event["metaKey"]) {
                        event.preventDefault();
                        var url = $location.absUrl();
                        if (node && node.data) {
                            var key = node.data["key"];
                            if (key) {
                                var hash = $location.search();
                                hash["nid"] = key;
                                // TODO this could maybe be a generic helper function?
                                // lets trim after the ?
                                var idx = url.indexOf('?');
                                if (idx <= 0) {
                                    url += "?";
                                }
                                else {
                                    url = url.substring(0, idx + 1);
                                }
                                url += $.param(hash);
                            }
                        }
                        window.open(url, '_blank');
                        window.focus();
                        return false;
                    }
                    return true;
                },
                persist: false,
                debugLevel: 0,
                //children: $scope.workspace.tree.children
                children: children
            });
            if (redraw) {
                workspace.redrawTree();
            }
        }
    }
    Jmx.enableTree = enableTree;
})(Jmx || (Jmx = {}));

/**
 * @module Jmx
 */
var Jmx;
(function (Jmx) {
    function createDashboardLink(widgetType, widget) {
        var href = "#" + widgetType.route;
        var routeParams = angular.toJson(widget);
        var title = widget.title;
        var size = angular.toJson({
            size_x: widgetType.size_x,
            size_y: widgetType.size_y
        });
        return "/dashboard/add?tab=dashboard" +
            "&href=" + encodeURIComponent(href) +
            "&size=" + encodeURIComponent(size) +
            "&title=" + encodeURIComponent(title) +
            "&routeParams=" + encodeURIComponent(routeParams);
    }
    Jmx.createDashboardLink = createDashboardLink;
    function getWidgetType(widget) {
        return _.find(Jmx.jmxWidgetTypes, function (type) { return type.type === widget.type; });
    }
    Jmx.getWidgetType = getWidgetType;
    Jmx.jmxWidgetTypes = [
        {
            type: "donut",
            icon: "fa fa-pie-chart",
            route: "/jmx/widget/donut",
            size_x: 2,
            size_y: 2,
            title: "Add Donut chart to Dashboard"
        },
        {
            type: "area",
            icon: "fa fa-bar-chart",
            route: "/jmx/widget/area",
            size_x: 4,
            size_y: 2,
            title: "Add Area chart to Dashboard"
        }
    ];
    Jmx.jmxWidgets = [
        {
            type: "donut",
            title: "Java Heap Memory",
            mbean: "java.lang:type=Memory",
            attribute: "HeapMemoryUsage",
            total: "Max",
            terms: "Used",
            remaining: "Free"
        },
        {
            type: "donut",
            title: "Java Non Heap Memory",
            mbean: "java.lang:type=Memory",
            attribute: "NonHeapMemoryUsage",
            total: "Max",
            terms: "Used",
            remaining: "Free"
        },
        {
            type: "donut",
            title: "File Descriptor Usage",
            mbean: "java.lang:type=OperatingSystem",
            total: "MaxFileDescriptorCount",
            terms: "OpenFileDescriptorCount",
            remaining: "Free"
        },
        {
            type: "donut",
            title: "Loaded Classes",
            mbean: "java.lang:type=ClassLoading",
            total: "TotalLoadedClassCount",
            terms: "LoadedClassCount,UnloadedClassCount",
            remaining: "-"
        },
        {
            type: "donut",
            title: "Swap Size",
            mbean: "java.lang:type=OperatingSystem",
            total: "TotalSwapSpaceSize",
            terms: "FreeSwapSpaceSize",
            remaining: "Used Swap"
        },
        {
            type: "area",
            title: "Process CPU Time",
            mbean: "java.lang:type=OperatingSystem",
            attribute: "ProcessCpuTime"
        },
        {
            type: "area",
            title: "Process CPU Load",
            mbean: "java.lang:type=OperatingSystem",
            attribute: "ProcessCpuLoad"
        },
        {
            type: "area",
            title: "System CPU Load",
            mbean: "java.lang:type=OperatingSystem",
            attribute: "SystemCpuLoad"
        },
        {
            type: "area",
            title: "System CPU Time",
            mbean: "java.lang:type=OperatingSystem",
            attribute: "SystemCpuTime"
        }
    ];
})(Jmx || (Jmx = {}));

/**
 * @module Jmx
 * @main Jmx
 */
/// <reference path="../../includes.ts"/>
/// <reference path="../../jvm/ts/jvmHelpers.ts"/>
/// <reference path="jmxHelpers.ts"/>
/// <reference path="widgetRepository.ts"/>
/// <reference path="workspace.ts"/>
var Jmx;
(function (Jmx) {
    Jmx._module = angular.module(Jmx.pluginName, []);
    Jmx._module.config(['HawtioNavBuilderProvider', "$routeProvider", function (builder, $routeProvider) {
            $routeProvider
                .when('/jmx', { redirectTo: '/jmx/attributes' })
                .when('/jmx/attributes', { templateUrl: UrlHelpers.join(Jmx.templatePath, 'attributes.html') })
                .when('/jmx/operations', { templateUrl: UrlHelpers.join(Jmx.templatePath, 'operations.html') })
                .when('/jmx/charts', { templateUrl: UrlHelpers.join(Jmx.templatePath, 'charts.html') })
                .when('/jmx/chartEdit', { templateUrl: UrlHelpers.join(Jmx.templatePath, 'chartEdit.html') })
                .when('/jmx/help/:tabName', { templateUrl: 'app/core/html/help.html' })
                .when('/jmx/widget/donut', { templateUrl: UrlHelpers.join(Jmx.templatePath, 'donutChart.html') })
                .when('/jmx/widget/area', { templateUrl: UrlHelpers.join(Jmx.templatePath, 'areaChart.html') });
        }]);
    Jmx._module.factory('jmxWidgetTypes', function () {
        return Jmx.jmxWidgetTypes;
    });
    Jmx._module.factory('jmxWidgets', function () {
        return Jmx.jmxWidgets;
    });
    // Create the workspace object used in all kinds of places
    Jmx._module.factory('workspace', ["$location", "jmxTreeLazyLoadRegistry", "$compile", "$templateCache", "localStorage", "jolokia", "jolokiaStatus", "$rootScope", "userDetails", "HawtioNav", function ($location, jmxTreeLazyLoadRegistry, $compile, $templateCache, localStorage, jolokia, jolokiaStatus, $rootScope, userDetails, HawtioNav) {
            var answer = new Workspace(jolokia, jolokiaStatus, jmxTreeLazyLoadRegistry, $location, $compile, $templateCache, localStorage, $rootScope, userDetails, HawtioNav);
            answer.loadTree();
            return answer;
        }]);
    Jmx._module.controller("Jmx.MBeanTreeController", ['$scope', 'workspace', function ($scope, workspace) {
            $scope.node = {};
            workspace.addNamedTreePostProcessor('MBeanTree', function (tree) {
                angular.copy(tree, $scope.node);
                $scope.node.open = true;
                Jmx.log.debug("got tree: ", $scope.node);
            });
            $scope.select = function (node) {
                workspace.updateSelectionNode(node);
            };
        }]);
    Jmx._module.factory('rbacACLMBean', function () {
        return {
            then: function () { }
        };
    });
    Jmx._module.constant('layoutTree', 'plugins/jmx/html/layoutTree.html');
    // holds the status returned from the last jolokia call (?)
    Jmx._module.factory('jolokiaStatus', function () {
        return {
            xhr: null
        };
    });
    Jmx.DEFAULT_MAX_DEPTH = 7;
    Jmx.DEFAULT_MAX_COLLECTION_SIZE = 500;
    Jmx._module.factory('jolokiaParams', ["jolokiaUrl", "localStorage", function (jolokiaUrl, localStorage) {
            var answer = {
                canonicalNaming: false,
                ignoreErrors: true,
                mimeType: 'application/json',
                maxDepth: Jmx.DEFAULT_MAX_DEPTH,
                maxCollectionSize: Jmx.DEFAULT_MAX_COLLECTION_SIZE
            };
            if ('jolokiaParams' in localStorage) {
                answer = angular.fromJson(localStorage['jolokiaParams']);
            }
            else {
                localStorage['jolokiaParams'] = angular.toJson(answer);
            }
            answer['url'] = jolokiaUrl;
            return answer;
        }]);
    Jmx._module.factory('jmxTreeLazyLoadRegistry', function () {
        return Core.lazyLoaders;
    });
    Jmx._module.controller('Jmx.EditChartNav', ['$scope', '$location', function ($scope, $location) {
            $scope.valid = function () {
                return $location.path().startsWith('/jmx/chart');
            };
        }]);
    Jmx._module.run(["HawtioNav", "$location", "workspace", "viewRegistry", "layoutTree", "jolokia", "helpRegistry", "pageTitle", "$templateCache", function (nav, $location, workspace, viewRegistry, layoutTree, jolokia, helpRegistry, pageTitle, $templateCache) {
            Jmx.log.debug('loaded');
            viewRegistry['{ "main-tab": "jmx" }'] = layoutTree;
            helpRegistry.addUserDoc('jmx', 'app/jmx/doc/help.md');
            pageTitle.addTitleElement(function () {
                if (Jmx.currentProcessId === '') {
                    try {
                        Jmx.currentProcessId = jolokia.getAttribute('java.lang:type=Runtime', 'Name');
                    }
                    catch (e) {
                    }
                    if (Jmx.currentProcessId && Jmx.currentProcessId.indexOf("@") !== -1) {
                        Jmx.currentProcessId = "pid:" + Jmx.currentProcessId.split("@")[0];
                    }
                }
                return Jmx.currentProcessId;
            });
            var myUrl = '/jmx/attributes';
            var builder = nav.builder();
            var tab = builder.id('jmx')
                .title(function () { return 'JMX'; })
                .defaultPage({
                rank: 10,
                isValid: function (yes, no) {
                    var name = 'JmxDefaultPage';
                    workspace.addNamedTreePostProcessor(name, function (tree) {
                        workspace.removeNamedTreePostProcessor(name);
                        if (workspace.hasMBeans()) {
                            yes();
                        }
                        else {
                            no();
                        }
                    });
                }
            })
                .isValid(function () { return workspace.hasMBeans(); })
                .href(function () { return myUrl; })
                .build();
            tab.tabs = Jmx.getNavItems(builder, workspace, $templateCache);
            nav.add(tab);
        }]);
    hawtioPluginLoader.addModule(Jmx.pluginName);
    hawtioPluginLoader.addModule('dangle');
})(Jmx || (Jmx = {}));

/**
 * @module Jmx
 */
/// <reference path="./jmxPlugin.ts"/>
var Jmx;
(function (Jmx) {
    Jmx.AreaChartController = Jmx._module.controller("Jmx.AreaChartController", ["$scope", "$routeParams", "jolokia", "$templateCache", "localStorage", function ($scope, $routeParams, jolokia, $templateCache, localStorage) {
            $scope.mbean = $routeParams['mbean'];
            $scope.attribute = $routeParams['attribute'];
            $scope.duration = localStorage['updateRate'];
            $scope.width = 308;
            $scope.height = 296;
            $scope.template = "";
            $scope.entries = [];
            $scope.data = {
                entries: $scope.entries
            };
            $scope.req = [{ type: 'read', mbean: $scope.mbean, attribute: $scope.attribute }];
            $scope.render = function (response) {
                $scope.entries.push({
                    time: response.timestamp,
                    count: response.value
                });
                $scope.entries = $scope.entries.last(15);
                if ($scope.template === "") {
                    $scope.template = $templateCache.get("areaChart");
                }
                $scope.data = {
                    _type: "date_histogram",
                    entries: $scope.entries
                };
                Core.$apply($scope);
            };
            Core.register(jolokia, $scope, $scope.req, Core.onSuccess($scope.render));
        }]);
})(Jmx || (Jmx = {}));

/**
 * @module Jmx
 */
/// <reference path="./jmxPlugin.ts"/>
var Jmx;
(function (Jmx) {
    Jmx._module.controller("Jmx.AttributeController", ["$scope", "jolokia", function ($scope, jolokia) {
            $scope.init = function (mbean, attribute) {
                $scope.mbean = mbean;
                $scope.attribute = attribute;
                if (angular.isDefined($scope.mbean) && angular.isDefined($scope.attribute)) {
                    Core.register(jolokia, $scope, {
                        type: 'read', mbean: $scope.mbean, attribute: $scope.attribute
                    }, Core.onSuccess(render));
                }
            };
            function render(response) {
                if (_.isEqual($scope.data, response.value)) {
                    $scope.data = Core.safeNull(response.value);
                    Core.$apply($scope);
                }
            }
        }]);
    Jmx._module.controller("Jmx.AttributeChartController", ["$scope", "jolokia", "$document", function ($scope, jolokia, $document) {
            $scope.init = function (mbean, attribute) {
                $scope.mbean = mbean;
                $scope.attribute = attribute;
                if (angular.isDefined($scope.mbean) && angular.isDefined($scope.attribute)) {
                    Core.register(jolokia, $scope, {
                        type: 'read', mbean: $scope.mbean, attribute: $scope.attribute
                    }, Core.onSuccess(render));
                }
            };
            function render(response) {
                if (!angular.isDefined($scope.chart)) {
                    $scope.chart = $($document.find("#" + $scope.attribute)[0]);
                    if ($scope.chart) {
                        $scope.width = $scope.chart.width();
                    }
                }
                if (!angular.isDefined($scope.context)) {
                    console.log("Got: ", response);
                    $scope.context = cubism.context()
                        .serverDelay(0)
                        .clientDelay(0)
                        .step(1000)
                        .size($scope.width);
                    $scope.jcontext = $scope.context.jolokia(jolokia);
                    $scope.metrics = [];
                    _.forIn(response.value, function (value, key) {
                        $scope.metrics.push($scope.jcontext.metric({
                            type: 'read',
                            mbean: $scope.mbean,
                            attribute: $scope.attribute,
                            path: key
                        }, $scope.attribute));
                    });
                    d3.select("#" + $scope.attribute).call(function (div) {
                        div.append("div")
                            .data($scope.metrics)
                            .call($scope.context.horizon());
                    });
                    // let cubism take over at this point...
                    Core.unregister(jolokia, $scope);
                    Core.$apply($scope);
                }
            }
        }]);
})(Jmx || (Jmx = {}));

/**
 * @module Jmx
 */
/// <reference path="./jmxPlugin.ts"/>
var Jmx;
(function (Jmx) {
    Jmx.propertiesColumnDefs = [
        {
            field: 'name',
            displayName: 'Property',
            width: "27%",
            cellTemplate: '<div class="ngCellText" title="{{row.entity.attrDesc}}" ' +
                'data-placement="bottom"><div ng-show="!inDashboard" class="inline" compile="row.entity.getDashboardWidgets()"></div><a href="" ng-click="row.entity.onViewAttribute()">{{row.entity.name}}</a></div>' },
        {
            field: 'value',
            displayName: 'Value',
            width: "70%",
            cellTemplate: '<div class="ngCellText mouse-pointer" ng-click="row.entity.onViewAttribute()" title="{{row.entity.tooltip}}" ng-bind-html="row.entity.summary"></div>'
        }
    ];
    Jmx.foldersColumnDefs = [
        {
            displayName: 'Name',
            cellTemplate: '<div class="ngCellText"><a href="{{row.entity.folderHref(row)}}"><i class="{{row.entity.folderIconClass(row)}}"></i> {{row.getProperty("title")}}</a></div>'
        }
    ];
    Jmx.AttributesController = Jmx._module.controller("Jmx.AttributesController", ["$scope", "$element", "$location", "workspace", "jolokia", "jolokiaUrl", "jmxWidgets", "jmxWidgetTypes", "$templateCache", "localStorage", "$browser", "HawtioDashboard", function ($scope, $element, $location, workspace, jolokia, jolokiaUrl, jmxWidgets, jmxWidgetTypes, $templateCache, localStorage, $browser, dash) {
            $scope.searchText = '';
            $scope.nid = 'empty';
            $scope.selectedItems = [];
            $scope.lastKey = null;
            $scope.attributesInfoCache = {};
            $scope.workspace = workspace;
            $scope.entity = {};
            $scope.attributeSchema = {};
            $scope.gridData = [];
            $scope.attributes = "";
            $scope.inDashboard = dash.inDashboard;
            $scope.$watch('gridData.length', function (newValue, oldValue) {
                if (newValue !== oldValue) {
                    if (newValue > 0) {
                        $scope.attributes = $templateCache.get('gridTemplate');
                    }
                    else {
                        $scope.attributes = "";
                    }
                }
            });
            var attributeSchemaBasic = {
                style: HawtioForms.FormStyle.STANDARD,
                mode: HawtioForms.FormMode.VIEW,
                hideLegend: true,
                properties: {
                    'key': {
                        label: 'Key',
                        tooltip: 'Attribute key',
                        type: 'static'
                    },
                    'attrDesc': {
                        label: 'Description',
                        type: 'static'
                    },
                    'type': {
                        label: 'Type',
                        tooltip: 'Attribute type',
                        type: 'static'
                    },
                    'jolokia': {
                        label: 'Jolokia URL',
                        tooltip: 'Jolokia REST URL',
                        type: 'string',
                        'input-attributes': {
                            readonly: true
                        }
                    }
                }
            };
            $scope.gridOptions = {
                scope: $scope,
                selectedItems: [],
                showFilter: false,
                canSelectRows: false,
                enableRowSelection: false,
                enableRowClickSelection: false,
                keepLastSelected: true,
                multiSelect: true,
                showColumnMenu: true,
                displaySelectionCheckbox: false,
                filterOptions: {
                    filterText: ''
                },
                // TODO disabled for now as it causes https://github.com/hawtio/hawtio/issues/262
                //sortInfo: { field: 'name', direction: 'asc'},
                data: 'gridData',
                columnDefs: Jmx.propertiesColumnDefs
            };
            $scope.$watch(function ($scope) {
                return $scope.gridOptions.selectedItems.map(function (item) { return item; });
            }, function (newValue, oldValue) {
                if (newValue !== oldValue) {
                    Jmx.log.debug("Selected items: ", newValue);
                    $scope.selectedItems = newValue;
                }
            }, true);
            var doUpdateTableContents = _.debounce(updateTableContents, 100, { trailing: true });
            $scope.$on("$routeChangeSuccess", function (event, current, previous) {
                // lets do this asynchronously to avoid Error: $digest already in progress
                $scope.nid = $location.search()['nid'];
                setTimeout(function () {
                    doUpdateTableContents();
                }, 10);
            });
            $scope.$watch('workspace.selection', function () {
                if (workspace.moveIfViewInvalid()) {
                    Core.unregister(jolokia, $scope);
                    return;
                }
                setTimeout(function () {
                    doUpdateTableContents();
                }, 10);
            });
            doUpdateTableContents();
            $scope.hasWidget = function (row) {
                return true;
            };
            $scope.onCancelAttribute = function () {
                // clear entity
                $scope.entity = {};
            };
            $scope.onUpdateAttribute = function () {
                var value = $scope.entity["value"];
                var key = $scope.entity["key"];
                // clear entity
                $scope.entity = {};
                // TODO: check if value changed
                // update the attribute on the mbean
                var mbean = workspace.getSelectedMBeanName();
                if (mbean) {
                    jolokia.setAttribute(mbean, key, value, Core.onSuccess(function (response) {
                        Core.notification("success", "Updated attribute " + key);
                    }));
                }
            };
            $scope.onViewAttribute = function (row) {
                if (!row.summary) {
                    return;
                }
                var entity = $scope.entity = _.cloneDeep(row);
                var schema = $scope.attributeSchema = _.cloneDeep(attributeSchemaBasic);
                if (entity.key === "ObjectName") {
                    // ObjectName is calculated locally
                    delete schema.properties.jolokia;
                }
                else {
                    entity.jolokia = Jmx.getUrlForThing(jolokiaUrl, "read", workspace.getSelectedMBeanName(), entity.key);
                }
                schema.properties.value = {
                    formTemplate: '<div class="form-group"><label class="control-label">Value</label><div hawtio-editor="entity.value"></div></div>'
                };
                $scope.showAttributeDialog = true;
            };
            $scope.getDashboardWidgets = function (row) {
                var mbean = workspace.getSelectedMBeanName();
                if (!mbean) {
                    return '';
                }
                var potentialCandidates = jmxWidgets.filter(function (widget) {
                    return mbean === widget.mbean;
                });
                if (potentialCandidates.isEmpty()) {
                    return '';
                }
                potentialCandidates = potentialCandidates.filter(function (widget) {
                    return widget.attribute === row.key || widget.total === row.key;
                });
                if (potentialCandidates.isEmpty()) {
                    return '';
                }
                row.addChartToDashboard = function (type) {
                    $scope.addChartToDashboard(row, type);
                };
                var rc = [];
                potentialCandidates.forEach(function (widget) {
                    var widgetType = Jmx.getWidgetType(widget);
                    rc.push("<i class=\"" + widgetType['icon'] + " clickable\" title=\"" + widgetType['title'] + "\" ng-click=\"row.entity.addChartToDashboard('" + widgetType['type'] + "')\"></i>");
                });
                return rc.join() + "&nbsp;";
            };
            $scope.addChartToDashboard = function (row, widgetType) {
                var mbean = workspace.getSelectedMBeanName();
                var candidates = jmxWidgets.filter(function (widget) {
                    return mbean === widget.mbean;
                });
                candidates = candidates.filter(function (widget) {
                    return widget.attribute === row.key || widget.total === row.key;
                });
                candidates = candidates.filter(function (widget) {
                    return widget.type === widgetType;
                });
                // hmmm, we really should only have one result...
                var widget = candidates.first();
                var type = Jmx.getWidgetType(widget);
                //console.log("widgetType: ", type, " widget: ", widget);
                $location.url(Jmx.createDashboardLink(type, widget));
            };
            /*
             * Returns the toolBar template HTML to use for the current selection
             */
            $scope.toolBarTemplate = function () {
                // lets lookup the list of helpers by domain
                var answer = Jmx.getAttributeToolBar(workspace.selection);
                // TODO - maybe there's a better way to determine when to enable selections
                /*
                 if (answer.startsWith("app/camel") && workspace.selection.children.length > 0) {
                 $scope.selectToggle.setSelect(true);
                 } else {
                 $scope.selectToggle.setSelect(false);
                 }
                 */
                return answer;
            };
            $scope.invokeSelectedMBeans = function (operationName, completeFunction) {
                if (completeFunction === void 0) { completeFunction = null; }
                var queries = [];
                angular.forEach($scope.selectedItems || [], function (item) {
                    var mbean = item["_id"];
                    if (mbean) {
                        var opName = operationName;
                        if (angular.isFunction(operationName)) {
                            opName = operationName(item);
                        }
                        //console.log("Invoking operation " + opName + " on " + mbean);
                        queries.push({ type: "exec", operation: opName, mbean: mbean });
                    }
                });
                if (queries.length) {
                    var callback = function () {
                        if (completeFunction) {
                            completeFunction();
                        }
                        else {
                            operationComplete();
                        }
                    };
                    jolokia.request(queries, Core.onSuccess(callback, { error: callback }));
                }
            };
            $scope.folderHref = function (row) {
                if (!row.getProperty) {
                    return "";
                }
                var key = row.getProperty("key");
                if (key) {
                    return Core.createHref($location, "#" + $location.path() + "?nid=" + key, ["nid"]);
                }
                else {
                    return "";
                }
            };
            $scope.folderIconClass = function (row) {
                // TODO lets ignore the classes property for now
                // as we don't have an easy way to know if there is an icon defined for an icon or not
                // and we want to make sure there always is an icon shown
                /*
                 var classes = (row.getProperty("addClass") || "").trim();
                 if (classes) {
                 return classes;
                 }
                 */
                if (!row.getProperty) {
                    return "";
                }
                return row.getProperty("objectName") ? "fa fa-cog" : "fa fa-folder-close";
            };
            function operationComplete() {
                updateTableContents();
            }
            function updateTableContents() {
                // lets clear any previous queries just in case!
                Core.unregister(jolokia, $scope);
                if (!$scope.gridData) {
                    $scope.gridData = [];
                }
                else {
                    $scope.gridData.length = 0;
                }
                $scope.mbeanIndex = null;
                var mbean = workspace.getSelectedMBeanName();
                var request = null;
                var node = workspace.getSelectedMBean();
                if (node === null || angular.isUndefined(node) || node.key !== $scope.lastKey) {
                    // cache attributes info, so we know if the attribute is read-only or read-write, and also the attribute description
                    $scope.attributesInfoCache = null;
                    if (mbean == null) {
                        // in case of refresh
                        var _key = $location.search()['nid'];
                        var _node = workspace.keyToNodeMap[_key];
                        if (_node) {
                            mbean = _node.objectName;
                        }
                    }
                    if (mbean) {
                        var asQuery = function (node) {
                            var path = Core.escapeMBeanPath(node);
                            var query = {
                                type: "LIST",
                                method: "post",
                                path: path,
                                ignoreErrors: true
                            };
                            return query;
                        };
                        var infoQuery = asQuery(mbean);
                        jolokia.request(infoQuery, Core.onSuccess(function (response) {
                            $scope.attributesInfoCache = response.value;
                            Jmx.log.debug("Updated attributes info cache for mbean " + mbean);
                        }));
                    }
                }
                if (mbean) {
                    request = { type: 'read', mbean: mbean };
                    if (node === null || angular.isUndefined(node) || node.key !== $scope.lastKey) {
                        $scope.gridOptions.columnDefs = Jmx.propertiesColumnDefs;
                        $scope.gridOptions.enableRowClickSelection = false;
                        $scope.gridOptions.enableRowSelection = false;
                        $scope.gridOptions.displaySelectionCheckbox = false;
                        $scope.gridOptions.canSelectRows = false;
                    }
                }
                else if (node) {
                    if (node.key !== $scope.lastKey) {
                        $scope.gridOptions.columnDefs = [];
                        $scope.gridOptions.enableRowClickSelection = true;
                        $scope.gridOptions.enableRowClickSelection = true;
                        $scope.gridOptions.enableRowSelection = true;
                        $scope.gridOptions.displaySelectionCheckbox = true;
                        $scope.gridOptions.canSelectRows = true;
                    }
                    // lets query each child's details
                    var children = node.children;
                    if (children) {
                        var childNodes = children.map(function (child) { return child.objectName; });
                        var mbeans = childNodes.filter(function (mbean) { return mbean !== undefined; });
                        if (mbeans) {
                            var typeNames = Jmx.getUniqueTypeNames(children);
                            if (typeNames.length <= 1) {
                                var query = mbeans.map(function (mbean) {
                                    return { type: "READ", mbean: mbean, ignoreErrors: true };
                                });
                                if (query.length > 0) {
                                    request = query;
                                    // deal with multiple results
                                    $scope.mbeanIndex = {};
                                    $scope.mbeanRowCounter = 0;
                                    $scope.mbeanCount = mbeans.length;
                                }
                            }
                            else {
                                console.log("Too many type names " + typeNames);
                            }
                        }
                    }
                }
                //var callback = Core.onSuccess(render, { error: render });
                var callback = Core.onSuccess(render);
                if (request) {
                    $scope.request = request;
                    Core.register(jolokia, $scope, request, callback);
                }
                else if (node) {
                    if (node.key !== $scope.lastKey) {
                        $scope.gridOptions.columnDefs = Jmx.foldersColumnDefs;
                        $scope.gridOptions.enableRowClickSelection = true;
                    }
                    $scope.gridData = node.children;
                    addHandlerFunctions($scope.gridData);
                    Core.$apply($scope);
                }
                if (node) {
                    $scope.lastKey = node.key;
                }
            }
            function render(response) {
                var data = response.value;
                var mbeanIndex = $scope.mbeanIndex;
                var mbean = response.request['mbean'];
                if (mbean) {
                    // lets store the mbean in the row for later
                    data["_id"] = mbean;
                }
                if (mbeanIndex) {
                    if (mbean) {
                        var idx = mbeanIndex[mbean];
                        if (!angular.isDefined(idx)) {
                            idx = $scope.mbeanRowCounter;
                            mbeanIndex[mbean] = idx;
                            $scope.mbeanRowCounter += 1;
                        }
                        if (idx === 0) {
                            // this is to force the table to repaint
                            $scope.selectedIndices = $scope.selectedItems.map(function (item) { return $scope.gridData.indexOf(item); });
                            $scope.gridData = [];
                            if (!$scope.gridOptions.columnDefs.length) {
                                // lets update the column definitions based on any configured defaults
                                var key = workspace.selectionConfigKey();
                                var defaultDefs = workspace.attributeColumnDefs[key] || [];
                                var defaultSize = defaultDefs.length;
                                var map = {};
                                angular.forEach(defaultDefs, function (value, key) {
                                    var field = value.field;
                                    if (field) {
                                        map[field] = value;
                                    }
                                });
                                var extraDefs = [];
                                angular.forEach(data, function (value, key) {
                                    if (includePropertyValue(key, value)) {
                                        if (!map[key]) {
                                            extraDefs.push({
                                                field: key,
                                                displayName: key === '_id' ? 'Object name' : Core.humanizeValue(key),
                                                visible: defaultSize === 0
                                            });
                                        }
                                    }
                                });
                                // the additional columns (which are not pre-configured), should be sorted
                                // so the column menu has a nice sorted list instead of random ordering
                                extraDefs = extraDefs.sort(function (def, def2) {
                                    // make sure _id is last
                                    if (def.field.startsWith('_')) {
                                        return 1;
                                    }
                                    else if (def2.field.startsWith('_')) {
                                        return -1;
                                    }
                                    return def.field.localeCompare(def2.field);
                                });
                                extraDefs.forEach(function (e) {
                                    defaultDefs.push(e);
                                });
                                // remove all non visible
                                defaultDefs = defaultDefs.remove(function (value) {
                                    if (angular.isDefined(value.visible) && value.visible != null) {
                                        return !value.visible;
                                    }
                                    return false;
                                });
                                $scope.gridOptions.columnDefs = defaultDefs;
                                $scope.gridOptions.enableRowClickSelection = true;
                            }
                        }
                        // assume 1 row of data per mbean
                        $scope.gridData[idx] = data;
                        addHandlerFunctions($scope.gridData);
                        var count = $scope.mbeanCount;
                        if (!count || idx + 1 >= count) {
                            // only cause a refresh on the last row
                            var newSelections = $scope.selectedIndices.map(function (idx) { return $scope.gridData[idx]; }).filter(function (row) { return row; });
                            $scope.selectedItems.splice(0, $scope.selectedItems.length);
                            $scope.selectedItems.push.apply($scope.selectedItems, newSelections);
                            //console.log("Would have selected " + JSON.stringify($scope.selectedItems));
                            Core.$apply($scope);
                        }
                    }
                    else {
                        console.log("No mbean name in request " + JSON.stringify(response.request));
                    }
                }
                else {
                    $scope.gridOptions.columnDefs = Jmx.propertiesColumnDefs;
                    $scope.gridOptions.enableRowClickSelection = false;
                    var showAllAttributes = true;
                    if (angular.isObject(data)) {
                        var properties = Array();
                        angular.forEach(data, function (value, key) {
                            if (showAllAttributes || includePropertyValue(key, value)) {
                                // always skip keys which start with _
                                if (!key.startsWith("_")) {
                                    // lets format the ObjectName nicely dealing with objects with
                                    // nested object names or arrays of object names
                                    if (key === "ObjectName") {
                                        value = unwrapObjectName(value);
                                    }
                                    // lets unwrap any arrays of object names
                                    if (angular.isArray(value)) {
                                        value = value.map(function (v) {
                                            return unwrapObjectName(v);
                                        });
                                    }
                                    // the value must be string as the sorting/filtering of the table relies on that
                                    var type = lookupAttributeType(key);
                                    var data = { key: key, name: Core.humanizeValue(key), value: Core.safeNullAsString(value, type) };
                                    generateSummaryAndDetail(key, data);
                                    properties.push(data);
                                }
                            }
                        });
                        if (!_.any(properties, function (p) {
                            return p['key'] === 'ObjectName';
                        })) {
                            var objectName = {
                                key: "ObjectName",
                                name: "Object Name",
                                value: mbean
                            };
                            generateSummaryAndDetail(objectName.key, objectName);
                            properties.push(objectName);
                        }
                        properties = _.sortBy(properties, 'name');
                        $scope.selectedItems = [data];
                        data = properties;
                    }
                    $scope.gridData = data;
                    addHandlerFunctions($scope.gridData);
                    Core.$apply($scope);
                }
            }
            function addHandlerFunctions(data) {
                data.forEach(function (item) {
                    item['inDashboard'] = $scope.inDashboard;
                    item['getDashboardWidgets'] = function () {
                        return $scope.getDashboardWidgets(item);
                    };
                    item['onViewAttribute'] = function () {
                        $scope.onViewAttribute(item);
                    };
                    item['folderIconClass'] = function (row) {
                        return $scope.folderIconClass(row);
                    };
                    item['folderHref'] = function (row) {
                        return $scope.folderHref(row);
                    };
                });
            }
            function unwrapObjectName(value) {
                if (!angular.isObject(value)) {
                    return value;
                }
                var keys = Object.keys(value);
                if (keys.length === 1 && keys[0] === "objectName") {
                    return value["objectName"];
                }
                return value;
            }
            function generateSummaryAndDetail(key, data) {
                var value = data.value;
                if (!angular.isArray(value) && angular.isObject(value)) {
                    var detailHtml = "<table class='table table-striped'>";
                    var summary = "";
                    var object = value;
                    var keys = Object.keys(value).sort();
                    angular.forEach(keys, function (key) {
                        var value = object[key];
                        detailHtml += "<tr><td>"
                            + Core.humanizeValue(key) + "</td><td>" + value + "</td></tr>";
                        summary += "" + Core.humanizeValue(key) + ": " + value + "  ";
                    });
                    detailHtml += "</table>";
                    data.summary = summary;
                    data.detailHtml = detailHtml;
                    data.tooltip = summary;
                }
                else {
                    var text = value;
                    // if the text is empty then use a no-break-space so the table allows us to click on the row,
                    // otherwise if the text is empty, then you cannot click on the row
                    if (text === '') {
                        text = '&nbsp;';
                        data.tooltip = "";
                    }
                    else {
                        data.tooltip = text;
                    }
                    data.summary = "" + text + "";
                    data.detailHtml = "<pre>" + text + "</pre>";
                    if (angular.isArray(value)) {
                        var html = "<ul>";
                        angular.forEach(value, function (item) {
                            html += "<li>" + item + "</li>";
                        });
                        html += "</ul>";
                        data.detailHtml = html;
                    }
                }
                // enrich the data with information if the attribute is read-only/read-write, and the JMX attribute description (if any)
                data.rw = false;
                data.attrDesc = data.name;
                data.type = "string";
                if ($scope.attributesInfoCache != null && 'attr' in $scope.attributesInfoCache) {
                    var info = $scope.attributesInfoCache.attr[key];
                    if (angular.isDefined(info)) {
                        data.rw = info.rw;
                        data.attrDesc = info.desc;
                        data.type = info.type;
                    }
                }
            }
            function lookupAttributeType(key) {
                if ($scope.attributesInfoCache != null && 'attr' in $scope.attributesInfoCache) {
                    var info = $scope.attributesInfoCache.attr[key];
                    if (angular.isDefined(info)) {
                        return info.type;
                    }
                }
                return null;
            }
            function includePropertyValue(key, value) {
                return !angular.isObject(value);
            }
            function asJsonSchemaType(typeName, id) {
                if (typeName) {
                    var lower = typeName.toLowerCase();
                    if (lower.startsWith("int") || lower === "long" || lower === "short" || lower === "byte" || lower.endsWith("int")) {
                        return "integer";
                    }
                    if (lower === "double" || lower === "float" || lower === "bigdecimal") {
                        return "number";
                    }
                    if (lower === "boolean" || lower === "java.lang.boolean") {
                        return "boolean";
                    }
                    if (lower === "string" || lower === "java.lang.String") {
                        return "string";
                    }
                }
                // fallback as string
                return "string";
            }
        }]);
})(Jmx || (Jmx = {}));

/// <reference path="jmxPlugin.ts"/>
/**
 * @module Jmx
 */
var Jmx;
(function (Jmx) {
    Jmx._module.controller("Jmx.ChartEditController", ["$scope", "$location", "workspace", "jolokia", function ($scope, $location, workspace, jolokia) {
            $scope.selectedAttributes = [];
            $scope.selectedMBeans = [];
            $scope.metrics = {};
            $scope.mbeans = {};
            // TODO move this function to $routeScope
            $scope.size = function (value) {
                if (angular.isObject(value)) {
                    return _.keys(value).length;
                }
                else if (angular.isArray(value)) {
                    return value.length;
                }
                else
                    return 1;
            };
            $scope.canViewChart = function () {
                return $scope.selectedAttributes.length && $scope.selectedMBeans.length &&
                    $scope.size($scope.mbeans) > 0 && $scope.size($scope.metrics) > 0;
            };
            $scope.showAttributes = function () {
                return $scope.canViewChart() && $scope.size($scope.metrics) > 1;
            };
            $scope.showElements = function () {
                return $scope.canViewChart() && $scope.size($scope.mbeans) > 1;
            };
            $scope.viewChart = function () {
                // lets add the attributes and mbeans into the URL so we can navigate back to the charts view
                var search = $location.search();
                // if we have selected all attributes, then lets just remove the attribute
                if ($scope.selectedAttributes.length === $scope.size($scope.metrics)) {
                    delete search["att"];
                }
                else {
                    search["att"] = $scope.selectedAttributes;
                }
                // if we are on an mbean with no children lets discard an unnecessary parameter
                if ($scope.selectedMBeans.length === $scope.size($scope.mbeans) && $scope.size($scope.mbeans) === 1) {
                    delete search["el"];
                }
                else {
                    search["el"] = $scope.selectedMBeans;
                }
                $location.search(search);
                $location.path("jmx/charts");
            };
            $scope.$watch('workspace.selection', render);
            $scope.$on("$routeChangeSuccess", function (event, current, previous) {
                // lets do this asynchronously to avoid Error: $digest already in progress
                setTimeout(render, 50);
            });
            function render() {
                var node = workspace.selection;
                if (!angular.isDefined(node)) {
                    return;
                }
                $scope.selectedAttributes = [];
                $scope.selectedMBeans = [];
                $scope.metrics = {};
                $scope.mbeans = {};
                var mbeanCounter = 0;
                var resultCounter = 0;
                // lets iterate through all the children if the current node is not an mbean
                var children = node.children;
                if (!children || !children.length || node.objectName) {
                    children = [node];
                }
                if (children) {
                    children.forEach(function (mbeanNode) {
                        var mbean = mbeanNode.objectName;
                        var name = mbeanNode.title;
                        if (name && mbean) {
                            mbeanCounter++;
                            $scope.mbeans[name] = name;
                            // use same logic as the JMX attributes page which works better than jolokia.list which has problems with
                            // mbeans with special characters such as ? and query parameters such as Camel endpoint mbeans
                            var asQuery = function (node) {
                                var path = Core.escapeMBeanPath(node);
                                var query = {
                                    type: "list",
                                    path: path,
                                    ignoreErrors: true
                                };
                                return query;
                            };
                            var infoQuery = asQuery(mbean);
                            // must use post, so see further below where we pass in {method: "post"}
                            jolokia.request(infoQuery, Core.onSuccess(function (meta) {
                                var attributes = meta.value.attr;
                                if (attributes) {
                                    for (var key in attributes) {
                                        var value = attributes[key];
                                        if (value) {
                                            var typeName = value['type'];
                                            if (Core.isNumberTypeName(typeName)) {
                                                if (!$scope.metrics[key]) {
                                                    //console.log("Number attribute " + key + " for " + mbean);
                                                    $scope.metrics[key] = key;
                                                }
                                            }
                                        }
                                    }
                                    if (++resultCounter >= mbeanCounter) {
                                        // TODO do we need to sort just in case?
                                        // lets look in the search URI to default the selections
                                        var search = $location.search();
                                        var attributeNames = Core.toSearchArgumentArray(search["att"]);
                                        var elementNames = Core.toSearchArgumentArray(search["el"]);
                                        if (attributeNames && attributeNames.length) {
                                            attributeNames.forEach(function (name) {
                                                if ($scope.metrics[name]) {
                                                    $scope.selectedAttributes.push(name);
                                                }
                                            });
                                        }
                                        if (elementNames && elementNames.length) {
                                            elementNames.forEach(function (name) {
                                                if ($scope.mbeans[name]) {
                                                    $scope.selectedMBeans.push(name);
                                                }
                                            });
                                        }
                                        // default selections if there are none
                                        if ($scope.selectedMBeans.length < 1) {
                                            $scope.selectedMBeans = _.keys($scope.mbeans);
                                        }
                                        if ($scope.selectedAttributes.length < 1) {
                                            var attrKeys = _.keys($scope.metrics).sort();
                                            if ($scope.selectedMBeans.length > 1) {
                                                $scope.selectedAttributes = [_.first(attrKeys)];
                                            }
                                            else {
                                                $scope.selectedAttributes = attrKeys;
                                            }
                                        }
                                        // lets update the sizes using jquery as it seems AngularJS doesn't support it
                                        $("#attributes").attr("size", _.keys($scope.metrics).length);
                                        $("#mbeans").attr("size", _.keys($scope.mbeans).length);
                                        Core.$apply($scope);
                                    }
                                }
                                // update the website
                                Core.$apply($scope);
                            }, { method: "post" }));
                        }
                    });
                }
            }
        }]);
})(Jmx || (Jmx = {}));

/**
 * @module Jmx
 */
/// <reference path="./jmxPlugin.ts"/>
var Jmx;
(function (Jmx) {
    Jmx._module.controller("Jmx.ChartController", ["$scope", "$element", "$location", "workspace", "localStorage", "jolokiaUrl", "jolokiaParams", function ($scope, $element, $location, workspace, localStorage, jolokiaUrl, jolokiaParams) {
            var log = Logger.get("JMX");
            $scope.metrics = [];
            $scope.updateRate = 1000; //parseInt(localStorage['updateRate']);
            $scope.context = null;
            $scope.jolokia = null;
            $scope.charts = null;
            $scope.reset = function () {
                if ($scope.context) {
                    $scope.context.stop();
                    $scope.context = null;
                }
                if ($scope.jolokia) {
                    $scope.jolokia.stop();
                    $scope.jolokia = null;
                }
                if ($scope.charts) {
                    $scope.charts.empty();
                    $scope.charts = null;
                }
            };
            $scope.$on('$destroy', function () {
                try {
                    $scope.deregRouteChange();
                }
                catch (error) {
                }
                try {
                    $scope.dereg();
                }
                catch (error) {
                }
                $scope.reset();
            });
            $scope.errorMessage = function () {
                if ($scope.updateRate === 0) {
                    return "updateRate";
                }
                if ($scope.metrics.length === 0) {
                    return "metrics";
                }
            };
            var doRender = _.debounce(render, 200, { trailing: true });
            $scope.deregRouteChange = $scope.$on("$routeChangeSuccess", function (event, current, previous) {
                // lets do this asynchronously to avoid Error: $digest already in progress
                doRender();
            });
            $scope.dereg = $scope.$watch('workspace.selection', function () {
                if (workspace.moveIfViewInvalid())
                    return;
                doRender();
            });
            doRender();
            function render() {
                var node = workspace.selection || workspace.getSelectedMBean();
                if (node == null) {
                    return;
                }
                if (!angular.isDefined(node) || !angular.isDefined($scope.updateRate) || $scope.updateRate === 0) {
                    // Called render too early, let's retry
                    setTimeout(doRender, 500);
                    Core.$apply($scope);
                    return;
                }
                var width = 594;
                var charts = $element.find('#charts');
                if (charts) {
                    width = charts.width();
                }
                else {
                    // Called render too early, let's retry
                    setTimeout(doRender, 500);
                    Core.$apply($scope);
                    return;
                }
                // clear out any existing context
                $scope.reset();
                $scope.charts = charts;
                $scope.jolokia = new Jolokia(jolokiaParams);
                $scope.jolokia.start($scope.updateRate);
                var mbean = node.objectName;
                $scope.metrics = [];
                var context = cubism.context()
                    .serverDelay($scope.updateRate)
                    .clientDelay($scope.updateRate)
                    .step($scope.updateRate)
                    .size(width);
                $scope.context = context;
                $scope.jolokiaContext = context.jolokia($scope.jolokia);
                var search = $location.search();
                var attributeNames = Core.toSearchArgumentArray(search["att"]);
                if (mbean) {
                    // TODO make generic as we can cache them; they rarely ever change
                    // lets get the attributes for this mbean
                    // use same logic as the JMX attributes page which works better than jolokia.list which has problems with
                    // mbeans with special charachters such as ? and query parameters such as Camel endpoint mbeans
                    var asQuery = function (node) {
                        // we need to escape the mbean path for list
                        var path = Core.escapeMBeanPath(node);
                        var query = {
                            type: "list",
                            path: path,
                            ignoreErrors: true
                        };
                        return query;
                    };
                    var infoQuery = asQuery(mbean);
                    var meta = $scope.jolokia.request(infoQuery, { method: "post" });
                    if (meta) {
                        Core.defaultJolokiaErrorHandler(meta, {});
                        var attributes = meta.value ? meta.value.attr : null;
                        if (attributes) {
                            var foundNames = [];
                            for (var key in attributes) {
                                var value = attributes[key];
                                if (value) {
                                    var typeName = value['type'];
                                    if (Core.isNumberTypeName(typeName)) {
                                        foundNames.push(key);
                                    }
                                }
                            }
                            // lets filter the attributes
                            // if we find none then the att search attribute is invalid
                            // so lets discard the filter - as it must be for some other mbean
                            if (attributeNames.length) {
                                var filtered = foundNames.filter(function (key) { return attributeNames.indexOf(key) >= 0; });
                                if (filtered.length) {
                                    foundNames = filtered;
                                }
                            }
                            // sort the names
                            foundNames = foundNames.sort();
                            angular.forEach(foundNames, function (key) {
                                var metric = $scope.jolokiaContext.metric({
                                    type: 'read',
                                    mbean: mbean,
                                    attribute: key
                                }, Core.humanizeValue(key));
                                if (metric) {
                                    $scope.metrics.push(metric);
                                }
                            });
                        }
                    }
                }
                else {
                    // lets try pull out the attributes and elements from the URI and use those to chart
                    var elementNames = Core.toSearchArgumentArray(search["el"]);
                    if (attributeNames && attributeNames.length && elementNames && elementNames.length) {
                        // first lets map the element names to mbean names to keep the URI small
                        var mbeans = {};
                        elementNames.forEach(function (elementName) {
                            var child = node.get(elementName);
                            if (!child && node.children) {
                                child = _.find(node.children, function (n) { return elementName === n["title"]; });
                            }
                            if (child) {
                                var mbean = child.objectName;
                                if (mbean) {
                                    mbeans[elementName] = mbean;
                                }
                            }
                        });
                        // sort the names
                        attributeNames = attributeNames.sort();
                        // lets create the metrics
                        attributeNames.forEach(function (key) {
                            angular.forEach(mbeans, function (mbean, name) {
                                var attributeTitle = Core.humanizeValue(key);
                                // for now lets always be verbose
                                var title = name + ": " + attributeTitle;
                                var metric = $scope.jolokiaContext.metric({
                                    type: 'read',
                                    mbean: mbean,
                                    attribute: key
                                }, title);
                                if (metric) {
                                    $scope.metrics.push(metric);
                                }
                            });
                        });
                    }
                    // if we've children and none of the query arguments matched any metrics
                    // lets redirect back to the edit view
                    if (node.children.length && !$scope.metrics.length) {
                        // lets forward to the chart selection UI if we have some children; they may have
                        // chartable attributes
                        $location.path("jmx/chartEdit");
                    }
                }
                if ($scope.metrics.length > 0) {
                    var d3Selection = d3.select(charts.get(0));
                    var axisEl = d3Selection.selectAll(".axis");
                    var bail = false;
                    axisEl.data(["top", "bottom"])
                        .enter().append("div")
                        .attr("class", function (d) {
                        return d + " axis";
                    })
                        .each(function (d) {
                        if (bail) {
                            return;
                        }
                        try {
                            d3.select(this).call(context.axis().ticks(12).orient(d));
                        }
                        catch (error) {
                            // still rendering at not the right time...
                            // log.debug("error: ", error);
                            if (!bail) {
                                bail = true;
                            }
                        }
                    });
                    if (bail) {
                        $scope.reset();
                        setTimeout(doRender, 500);
                        Core.$apply($scope);
                        return;
                    }
                    d3Selection.append("div")
                        .attr("class", "rule")
                        .call(context.rule());
                    context.on("focus", function (i) {
                        try {
                            d3Selection.selectAll(".value").style("right", i === null ? null : context.size() - i + "px");
                        }
                        catch (error) {
                            log.info("error: ", error);
                        }
                    });
                    $scope.metrics.forEach(function (metric) {
                        d3Selection.call(function (div) {
                            div.append("div")
                                .data([metric])
                                .attr("class", "horizon")
                                .call(context.horizon());
                        });
                    });
                }
                else {
                    $scope.reset();
                }
                Core.$apply($scope);
            }
            ;
        }]);
})(Jmx || (Jmx = {}));

/// <reference path="jmxPlugin.ts"/>
/**
 * @module Jmx
 */
var Jmx;
(function (Jmx) {
    Jmx.DonutChartController = Jmx._module.controller("Jmx.DonutChartController", ["$scope", "$routeParams", "jolokia", "$templateCache", function ($scope, $routeParams, jolokia, $templateCache) {
            /*
            console.log("routeParams: ", $routeParams);
        
        
            // using multiple attributes
            $scope.mbean = "java.lang:type=OperatingSystem";
            $scope.total = "MaxFileDescriptorCount";
            $scope.terms = "OpenFileDescriptorCount";
            */
            // using a single attribute with multiple paths
            /*
             $scope.mbean = "java.lang:type=Memory";
             $scope.total = "Max";
             $scope.attribute = "HeapMemoryUsage";
             $scope.terms = "Used";
             */
            $scope.mbean = $routeParams['mbean'];
            $scope.total = $routeParams['total'];
            $scope.attribute = $routeParams['attribute'];
            $scope.terms = $routeParams['terms'];
            $scope.remainder = $routeParams['remaining'];
            $scope.template = "";
            $scope.termsArray = $scope.terms.split(",");
            $scope.data = {
                total: 0,
                terms: []
            };
            if (!$scope.attribute) {
                $scope.reqs = [{ type: 'read', mbean: $scope.mbean, attribute: $scope.total }];
                $scope.termsArray.forEach(function (term) {
                    $scope.reqs.push({ type: 'read', mbean: $scope.mbean, attribute: term });
                    $scope.data.terms.push({
                        term: term,
                        count: 0
                    });
                });
            }
            else {
                var terms = $scope.termsArray.include($scope.total);
                $scope.reqs = [{ type: 'read', mbean: $scope.mbean, attribute: $scope.attribute, paths: terms.join(",") }];
                $scope.termsArray.forEach(function (term) {
                    $scope.data.terms.push({
                        term: term,
                        count: 0
                    });
                });
            }
            if ($scope.remainder && $scope.remainder !== "-") {
                $scope.data.terms.push({
                    term: $scope.remainder,
                    count: 0
                });
            }
            /*
            $scope.data = {
              total: 100,
              terms: [{
                term: "One",
                count: 25
              }, {
                term: "Two",
                count: 75
              }]
            };
            */
            $scope.render = function (response) {
                //console.log("got: ", response);
                var freeTerm = null;
                if ($scope.remainder && $scope.remainder !== "-") {
                    freeTerm = $scope.data.terms.find(function (term) {
                        return term.term === $scope.remainder;
                    });
                }
                if (!$scope.attribute) {
                    if (response.request.attribute === $scope.total) {
                        $scope.data.total = response.value;
                    }
                    else {
                        var term = $scope.data.terms.find(function (term) {
                            return term.term === response.request.attribute;
                        });
                        if (term) {
                            term.count = response.value;
                        }
                        if (freeTerm) {
                            freeTerm.count = $scope.data.total;
                            $scope.data.terms.forEach(function (term) {
                                if (term.term !== $scope.remainder) {
                                    freeTerm.count = freeTerm.count - term.count;
                                }
                            });
                        }
                    }
                }
                else {
                    if (response.request.attribute === $scope.attribute) {
                        $scope.data.total = response.value[$scope.total.toLowerCase()];
                        $scope.data.terms.forEach(function (term) {
                            if (term.term !== $scope.remainder) {
                                term.count = response.value[term.term.toLowerCase()];
                            }
                        });
                        if (freeTerm) {
                            freeTerm.count = $scope.data.total;
                            $scope.data.terms.forEach(function (term) {
                                if (term.term !== $scope.remainder) {
                                    freeTerm.count = freeTerm.count - term.count;
                                }
                            });
                        }
                    }
                }
                if ($scope.template === "") {
                    $scope.template = $templateCache.get("donut");
                }
                // console.log("Data: ", $scope.data);
                $scope.data = _.clone($scope.data);
                Core.$apply($scope);
            };
            Core.register(jolokia, $scope, $scope.reqs, Core.onSuccess($scope.render));
        }]);
})(Jmx || (Jmx = {}));

/// <reference path="../../includes.ts"/>
var Core;
(function (Core) {
    function d3ForceGraph(scope, nodes, links, canvasElement) {
        // lets remove the old graph first
        if (scope.graphForce) {
            scope.graphForce.stop();
        }
        if (!canvasElement) {
            canvasElement = $("#canvas")[0];
        }
        var canvasDiv = $(canvasElement);
        canvasDiv.children("svg").remove();
        if (nodes.length) {
            var width = canvasDiv.parent().width();
            var height = canvasDiv.parent().height();
            if (height < 100) {
                //console.log("browse thinks the height is only " + height + " so calculating offset from doc height");
                var offset = canvasDiv.offset();
                height = $(document).height() - 5;
                if (offset) {
                    height -= offset['top'];
                }
            }
            //console.log("Using width " + width + " and height " + height);
            var svg = d3.select(canvasDiv[0]).append("svg")
                .attr("width", width)
                .attr("height", height);
            var force = d3.layout.force()
                .distance(100)
                .charge(-120 * 10)
                .linkDistance(50)
                .size([width, height]);
            scope.graphForce = force;
            /*
             var force = d3.layout.force()
             .gravity(.05)
             .distance(100)
             .charge(-100)
             .size([width, height]);
             */
            // prepare the arrows
            svg.append("svg:defs").selectAll("marker")
                .data(["from"])
                .enter().append("svg:marker")
                .attr("id", String)
                .attr("viewBox", "0 -5 10 10")
                .attr("refX", 25)
                .attr("refY", -1.5)
                .attr("markerWidth", 6)
                .attr("markerHeight", 6)
                .attr("orient", "auto")
                .append("svg:path")
                .attr("d", "M0,-5L10,0L0,5");
            force.nodes(nodes)
                .links(links)
                .start();
            var link = svg.selectAll(".link")
                .data(links)
                .enter().append("line")
                .attr("class", "link");
            // draw the arrow
            link.attr("class", "link from");
            // end marker
            link.attr("marker-end", "url(#from)");
            var node = svg.selectAll(".node")
                .data(nodes)
                .enter().append("g")
                .attr("class", "node")
                .call(force.drag);
            node.append("image")
                .attr("xlink:href", function (d) {
                return d.imageUrl;
            })
                .attr("x", -15)
                .attr("y", -15)
                .attr("width", 30)
                .attr("height", 30);
            node.append("text")
                .attr("dx", 20)
                .attr("dy", ".35em")
                .text(function (d) {
                return d.label;
            });
            force.on("tick", function () {
                link.attr("x1", function (d) {
                    return d.source.x;
                })
                    .attr("y1", function (d) {
                    return d.source.y;
                })
                    .attr("x2", function (d) {
                    return d.target.x;
                })
                    .attr("y2", function (d) {
                    return d.target.y;
                });
                node.attr("transform", function (d) {
                    return "translate(" + d.x + "," + d.y + ")";
                });
            });
        }
    }
    Core.d3ForceGraph = d3ForceGraph;
    function createGraphStates(nodes, links, transitions) {
        var stateKeys = {};
        nodes.forEach(function (node) {
            var idx = node.id;
            if (idx === undefined) {
                console.log("No node found for node " + JSON.stringify(node));
            }
            else {
                if (node.edges === undefined)
                    node.edges = [];
                if (!node.label)
                    node.label = "node " + idx;
                stateKeys[idx] = node;
            }
        });
        var states = d3.values(stateKeys);
        links.forEach(function (d) {
            var source = stateKeys[d.source];
            var target = stateKeys[d.target];
            if (source === undefined || target === undefined) {
                console.log("Bad link!  " + source + " target " + target + " for " + d);
            }
            else {
                var edge = { source: source, target: target };
                transitions.push(edge);
                source.edges.push(edge);
                target.edges.push(edge);
            }
        });
        return states;
    }
    Core.createGraphStates = createGraphStates;
    // TODO Export as a service
    function dagreLayoutGraph(nodes, links, width, height, svgElement, allowDrag, onClick) {
        if (allowDrag === void 0) { allowDrag = false; }
        if (onClick === void 0) { onClick = null; }
        var nodePadding = 10;
        var transitions = [];
        var states = Core.createGraphStates(nodes, links, transitions);
        function spline(e) {
            var points = e.dagre.points.slice(0);
            var source = dagre.util.intersectRect(e.source.dagre, points.length > 0 ? points[0] : e.source.dagre);
            var target = dagre.util.intersectRect(e.target.dagre, points.length > 0 ? points[points.length - 1] : e.source.dagre);
            points.unshift(source);
            points.push(target);
            return d3.svg.line()
                .x(function (d) {
                return d.x;
            })
                .y(function (d) {
                return d.y;
            })
                .interpolate("linear")(points);
        }
        // Translates all points in the edge using `dx` and `dy`.
        function translateEdge(e, dx, dy) {
            e.dagre.points.forEach(function (p) {
                p.x = Math.max(0, Math.min(svgBBox.width, p.x + dx));
                p.y = Math.max(0, Math.min(svgBBox.height, p.y + dy));
            });
        }
        // Now start laying things out
        var svg = svgElement ? d3.select(svgElement) : d3.select("svg");
        // lets remove all the old g elements
        if (svgElement) {
            $(svgElement).children("g").remove();
        }
        $(svg).children("g").remove();
        var svgGroup = svg.append("g").attr("transform", "translate(5, 5)");
        // `nodes` is center positioned for easy layout later
        var nodes = svgGroup
            .selectAll("g .node")
            .data(states)
            .enter()
            .append("g")
            .attr("class", "node")
            .attr("data-cid", function (d) {
            return d.cid;
        })
            .attr("id", function (d) {
            return "node-" + d.label;
        });
        // lets add a tooltip
        nodes.append("title").text(function (d) {
            return d.tooltip || "";
        });
        var edges = svgGroup
            .selectAll("path .edge")
            .data(transitions)
            .enter()
            .append("path")
            .attr("class", "edge")
            .attr("marker-end", "url(#arrowhead)");
        // Append rectangles to the nodes. We do this before laying out the text
        // because we want the text above the rectangle.
        var rects = nodes.append("rect")
            .attr("rx", "4")
            .attr("ry", "4")
            .attr("class", function (d) {
            return d.type;
        });
        var images = nodes.append("image")
            .attr("xlink:href", function (d) {
            return d.imageUrl;
        })
            .attr("x", -12)
            .attr("y", -20)
            .attr("height", 24)
            .attr("width", 24);
        var counters = nodes
            .append("text")
            .attr("text-anchor", "end")
            .attr("class", "counter")
            .attr("x", 0)
            .attr("dy", 0)
            .text(_counterFunction);
        var inflights = nodes
            .append("text")
            .attr("text-anchor", "middle")
            .attr("class", "inflight")
            .attr("x", 10)
            .attr("dy", -32)
            .text(_inflightFunction);
        // Append text
        var labels = nodes
            .append("text")
            .attr("text-anchor", "middle")
            .attr("x", 0);
        labels
            .append("tspan")
            .attr("x", 0)
            .attr("dy", 28)
            .text(function (d) {
            return d.label;
        });
        var labelPadding = 12;
        var minLabelwidth = 80;
        labels.each(function (d) {
            var bbox = this.getBBox();
            d.bbox = bbox;
            if (bbox.width < minLabelwidth) {
                bbox.width = minLabelwidth;
            }
            d.width = bbox.width + 2 * nodePadding;
            d.height = bbox.height + 2 * nodePadding + labelPadding;
        });
        rects
            .attr("x", function (d) {
            return -(d.bbox.width / 2 + nodePadding);
        })
            .attr("y", function (d) {
            return -(d.bbox.height / 2 + nodePadding + (labelPadding / 2));
        })
            .attr("width", function (d) {
            return d.width;
        })
            .attr("height", function (d) {
            return d.height;
        });
        if (onClick != null) {
            rects.on("click", onClick);
        }
        images
            .attr("x", function (d) {
            return -(d.bbox.width) / 2;
        });
        labels
            .attr("x", function (d) {
            return -d.bbox.width / 2;
        })
            .attr("y", function (d) {
            return -d.bbox.height / 2;
        });
        counters.attr("x", function (d) {
            var w = d.bbox.width;
            return w / 2;
        });
        // Create the layout and get the graph
        dagre.layout()
            .nodeSep(50)
            .edgeSep(10)
            .rankSep(50)
            .nodes(states)
            .edges(transitions)
            .debugLevel(1)
            .run();
        nodes.attr("transform", function (d) {
            return 'translate(' + d.dagre.x + ',' + d.dagre.y + ')';
        });
        edges
            .attr('id', function (e) {
            return e.dagre.id;
        })
            .attr("d", function (e) {
            return spline(e);
        });
        // Resize the SVG element
        var svgNode = svg.node();
        if (svgNode) {
            var svgBBox = svgNode.getBBox();
            if (svgBBox) {
                svg.attr("width", svgBBox.width + 10);
                svg.attr("height", svgBBox.height + 10);
            }
        }
        // configure dragging if enabled
        if (allowDrag) {
            // Drag handlers
            var nodeDrag = d3.behavior.drag()
                .origin(function (d) {
                return d.pos ? { x: d.pos.x, y: d.pos.y } : { x: d.dagre.x, y: d.dagre.y };
            })
                .on('drag', function (d, i) {
                var prevX = d.dagre.x, prevY = d.dagre.y;
                // The node must be inside the SVG area
                d.dagre.x = Math.max(d.width / 2, Math.min(svgBBox.width - d.width / 2, d3.event.x));
                d.dagre.y = Math.max(d.height / 2, Math.min(svgBBox.height - d.height / 2, d3.event.y));
                d3.select(this).attr('transform', 'translate(' + d.dagre.x + ',' + d.dagre.y + ')');
                var dx = d.dagre.x - prevX, dy = d.dagre.y - prevY;
                // Edges position (inside SVG area)
                d.edges.forEach(function (e) {
                    translateEdge(e, dx, dy);
                    d3.select('#' + e.dagre.id).attr('d', spline(e));
                });
            });
            var edgeDrag = d3.behavior.drag()
                .on('drag', function (d, i) {
                translateEdge(d, d3.event.dx, d3.event.dy);
                d3.select(this).attr('d', spline(d));
            });
            nodes.call(nodeDrag);
            edges.call(edgeDrag);
        }
        return states;
    }
    Core.dagreLayoutGraph = dagreLayoutGraph;
    // TODO Export as a service
    function dagreUpdateGraphData(data) {
        var svg = d3.select("svg");
        svg.selectAll("text.counter").text(_counterFunction);
        svg.selectAll("text.inflight").text(_inflightFunction);
        // add tooltip
        svg.selectAll("g .node title").text(function (d) {
            return d.tooltip || "";
        });
        /*
         TODO can we reuse twitter bootstrap on an svg title?
         .each(function (d) {
         $(d).tooltip({
         'placement': "bottom"
         });
         });
    
         */
    }
    Core.dagreUpdateGraphData = dagreUpdateGraphData;
    function _counterFunction(d) {
        return d.counter || "";
    }
    function _inflightFunction(d) {
        return d.inflight || "";
    }
})(Core || (Core = {}));

/// <reference path="../../includes.ts"/>
/**
 * @module Tree
 * @main Tree
 */
var Tree;
(function (Tree) {
    Tree.pluginName = 'tree';
    Tree.log = Logger.get("Tree");
    function expandAll(el) {
        treeAction(el, true);
    }
    Tree.expandAll = expandAll;
    function contractAll(el) {
        treeAction(el, false);
    }
    Tree.contractAll = contractAll;
    function treeAction(el, expand) {
        $(el).dynatree("getRoot").visit(function (node) {
            node.expand(expand);
        });
    }
    /**
     * @function sanitize
     * @param tree
     *
     * Use to HTML escape all entries in a tree before passing it
     * over to the dynatree plugin to avoid cross site scripting
     * issues.
     *
     */
    function sanitize(tree) {
        if (!tree) {
            return;
        }
        if (angular.isArray(tree)) {
            tree.forEach(function (folder) {
                Tree.sanitize(folder);
            });
        }
        var title = tree['title'];
        if (title) {
            tree['title'] = title.unescapeHTML(true).escapeHTML();
        }
        if (tree.children) {
            Tree.sanitize(tree.children);
        }
    }
    Tree.sanitize = sanitize;
    Tree._module = angular.module(Tree.pluginName, []);
    Tree._module.directive('hawtioTree', ["workspace", "$timeout", "$location", function (workspace, $timeout, $location) {
            // return the directive link function. (compile function not needed)
            return function (scope, element, attrs) {
                var tree = null;
                var data = null;
                var widget = null;
                var timeoutId = null;
                var onSelectFn = lookupFunction("onselect");
                var onDragStartFn = lookupFunction("ondragstart");
                var onDragEnterFn = lookupFunction("ondragenter");
                var onDropFn = lookupFunction("ondrop");
                function lookupFunction(attrName) {
                    var answer = null;
                    var fnName = attrs[attrName];
                    if (fnName) {
                        answer = Core.pathGet(scope, fnName);
                        if (!angular.isFunction(answer)) {
                            answer = null;
                        }
                    }
                    return answer;
                }
                // watch the expression, and update the UI on change.
                var data = attrs.hawtioTree;
                var queryParam = data;
                scope.$watch(data, onWidgetDataChange);
                // lets add a separate event so we can force updates
                // if we find cases where the delta logic doesn't work
                scope.$on("hawtio.tree." + data, function (args) {
                    var value = Core.pathGet(scope, data);
                    onWidgetDataChange(value);
                });
                // listen on DOM destroy (removal) event, and cancel the next UI update
                // to prevent updating ofter the DOM element was removed.
                element.bind('$destroy', function () {
                    $timeout.cancel(timeoutId);
                });
                updateLater(); // kick off the UI update process.
                // used to update the UI
                function updateWidget() {
                    // console.log("updating the grid!!");
                    Core.$applyNowOrLater(scope);
                }
                function onWidgetDataChange(value) {
                    tree = value;
                    if (tree) {
                        Tree.sanitize(tree);
                    }
                    if (tree && !widget) {
                        // lets find a child table element
                        // or lets add one if there's not one already
                        var treeElement = $(element);
                        var children = Core.asArray(tree);
                        var hideRoot = attrs["hideroot"];
                        if ("true" === hideRoot) {
                            children = tree['children'];
                        }
                        var config = {
                            clickFolderMode: 3,
                            /*
                              * The event handler called when a different node in the tree is selected
                              */
                            onActivate: function (node) {
                                var data = node.data;
                                if (onSelectFn) {
                                    onSelectFn(data, node);
                                }
                                else {
                                    workspace.updateSelectionNode(data);
                                }
                                Core.$apply(scope);
                            },
                            /*
                              onLazyRead: function(treeNode) {
                              var folder = treeNode.data;
                              var plugin = null;
                              if (folder) {
                              plugin = Jmx.findLazyLoadingFunction(workspace, folder);
                              }
                              if (plugin) {
                              console.log("Lazy loading folder " + folder.title);
                              var oldChildren = folder.childen;
                              plugin(workspace, folder, () => {
                              treeNode.setLazyNodeStatus(DTNodeStatus_Ok);
                              var newChildren = folder.children;
                              if (newChildren !== oldChildren) {
                              treeNode.removeChildren();
                              angular.forEach(newChildren, newChild => {
                              treeNode.addChild(newChild);
                              });
                              }
                              });
                              } else {
                              treeNode.setLazyNodeStatus(DTNodeStatus_Ok);
                              }
                              },
                              */
                            onClick: function (node, event) {
                                if (event["metaKey"]) {
                                    event.preventDefault();
                                    var url = $location.absUrl();
                                    if (node && node.data) {
                                        var key = node.data["key"];
                                        if (key) {
                                            var hash = $location.search();
                                            hash[queryParam] = key;
                                            // TODO this could maybe be a generic helper function?
                                            // lets trim after the ?
                                            var idx = url.indexOf('?');
                                            if (idx <= 0) {
                                                url += "?";
                                            }
                                            else {
                                                url = url.substring(0, idx + 1);
                                            }
                                            url += $.param(hash);
                                        }
                                    }
                                    window.open(url, '_blank');
                                    window.focus();
                                    return false;
                                }
                                return true;
                            },
                            persist: false,
                            debugLevel: 0,
                            children: children,
                            dnd: {
                                onDragStart: onDragStartFn ? onDragStartFn : function (node) {
                                    /* This function MUST be defined to enable dragging for the tree.
                                      *  Return false to cancel dragging of node.
                                      */
                                    console.log("onDragStart!");
                                    return true;
                                },
                                onDragEnter: onDragEnterFn ? onDragEnterFn : function (node, sourceNode) {
                                    console.log("onDragEnter!");
                                    return true;
                                },
                                onDrop: onDropFn ? onDropFn : function (node, sourceNode, hitMode) {
                                    console.log("onDrop!");
                                    /* This function MUST be defined to enable dropping of items on
                                      *  the tree.
                                      */
                                    sourceNode.move(node, hitMode);
                                    return true;
                                }
                            }
                        };
                        if (!onDropFn && !onDragEnterFn && !onDragStartFn) {
                            delete config["dnd"];
                        }
                        widget = treeElement.dynatree(config);
                        var activatedNode = false;
                        var activateNodeName = attrs["activatenodes"];
                        if (activateNodeName) {
                            var values = scope[activateNodeName];
                            var tree = treeElement.dynatree("getTree");
                            if (values && tree) {
                                angular.forEach(Core.asArray(values), function (value) {
                                    //tree.selectKey(value, true);
                                    tree.activateKey(value);
                                    activatedNode = true;
                                });
                            }
                        }
                        var root = treeElement.dynatree("getRoot");
                        if (root) {
                            var onRootName = attrs["onroot"];
                            if (onRootName) {
                                var fn = scope[onRootName];
                                if (fn) {
                                    fn(root);
                                }
                            }
                            // select and activate first child if we have not activated any others
                            if (!activatedNode) {
                                var children = root['getChildren']();
                                if (children && children.length) {
                                    var child = children[0];
                                    child.expand(true);
                                    child.activate(true);
                                }
                            }
                        }
                    }
                    updateWidget();
                }
                // schedule update in one second
                function updateLater() {
                    // save the timeoutId for canceling
                    timeoutId = $timeout(function () {
                        updateWidget(); // update DOM
                    }, 300);
                }
            };
        }]);
    Tree._module.run(["helpRegistry", function (helpRegistry) {
            helpRegistry.addDevDoc(Tree.pluginName, 'app/tree/doc/developer.md');
        }]);
    hawtioPluginLoader.addModule(Tree.pluginName);
})(Tree || (Tree = {}));

/// <reference path="jmxPlugin.ts"/>
/// <reference path="../../tree/ts/treePlugin.ts"/>
/**
 * @module Jmx
 */
var Jmx;
(function (Jmx) {
    Jmx._module.controller("Jmx.TreeHeaderController", ["$scope", function ($scope) {
            $scope.expandAll = function () {
                Tree.expandAll("#jmxtree");
            };
            $scope.contractAll = function () {
                Tree.contractAll("#jmxtree");
            };
        }]);
    Jmx._module.controller("Jmx.MBeansController", ["$scope", "$location", "workspace", function ($scope, $location, workspace) {
            $scope.num = 1;
            $scope.$on("$routeChangeSuccess", function (event, current, previous) {
                // lets do this asynchronously to avoid Error: $digest already in progress
                setTimeout(updateSelectionFromURL, 50);
            });
            $scope.select = function (node) {
                $scope.workspace.updateSelectionNode(node);
                Core.$apply($scope);
            };
            function updateSelectionFromURL() {
                Jmx.updateTreeSelectionFromURL($location, $("#jmxtree"));
            }
            $scope.populateTree = function () {
                var treeElement = $("#jmxtree");
                $scope.tree = workspace.tree;
                Jmx.enableTree($scope, $location, workspace, treeElement, $scope.tree.children, true);
                setTimeout(updateSelectionFromURL, 50);
            };
            $scope.$on('jmxTreeUpdated', $scope.populateTree);
            $scope.populateTree();
        }]);
})(Jmx || (Jmx = {}));

/// <reference path="jmxPlugin.ts"/>
var Jmx;
(function (Jmx) {
    Jmx.NavBarController = Jmx._module.controller("Jmx.NavBarController", ["$scope", "$location", "workspace", "$route", "jolokia", "localStorage", function ($scope, $location, workspace, $route, jolokia, localStorage) {
            $scope.hash = workspace.hash();
            $scope.topLevelTabs = [];
            $scope.subLevelTabs = workspace.subLevelTabs;
            $scope.currentPerspective = null;
            $scope.localStorage = localStorage;
            $scope.recentConnections = [];
            $scope.goTo = function (destination) {
                //Logger.debug("going to: " + destination);
                $location.url(destination);
            };
            $scope.$watch('hash', function (newValue, oldValue) {
                if (newValue !== oldValue) {
                    Jmx.log.debug("hash changed from ", oldValue, " to ", newValue);
                }
            });
            // when we change the view/selection lets update the hash so links have the latest stuff
            $scope.$on('$routeChangeSuccess', function () {
                $scope.hash = workspace.hash();
            });
            $scope.isValid = function (nav) {
                if ('isValid' in nav) {
                    return nav.isValid(workspace);
                }
                return true;
            };
            // use includePerspective = false as default as that was the previous behavior
            $scope.link = function (nav, includePerspective) {
                if (includePerspective === void 0) { includePerspective = false; }
                var href;
                if (angular.isString(nav)) {
                    href = nav;
                }
                else {
                    href = angular.isObject(nav) ? nav.href() : null;
                }
                href = href || "";
                var removeParams = ['tab', 'nid', 'chapter', 'pref', 'q'];
                if (!includePerspective && href) {
                    if (href.indexOf("?p=") >= 0 || href.indexOf("&p=") >= 0) {
                        removeParams.push("p");
                    }
                }
                return Core.createHref($location, href, removeParams);
            };
            $scope.fullScreenLink = function () {
                var href = "#" + $location.path() + "?tab=notree";
                return Core.createHref($location, href, ['tab']);
            };
            $scope.addToDashboardLink = function () {
                var href = "#" + $location.path() + workspace.hash();
                var answer = "#/dashboard/add?tab=dashboard&href=" + encodeURIComponent(href);
                if ($location.url().indexOf("/jmx/charts") !== -1) {
                    var size = {
                        size_x: 4,
                        size_y: 3
                    };
                    answer += "&size=" + encodeURIComponent(angular.toJson(size));
                }
                return answer;
            };
            $scope.isActive = function (nav) {
                if (angular.isString(nav))
                    return workspace.isLinkActive(nav);
                var fn = nav.isActive;
                if (fn) {
                    return fn(workspace);
                }
                return workspace.isLinkActive(nav.href());
            };
            $scope.isTopTabActive = function (nav) {
                if (angular.isString(nav))
                    return workspace.isTopTabActive(nav);
                var fn = nav.isActive;
                if (fn) {
                    return fn(workspace);
                }
                return workspace.isTopTabActive(nav.href());
            };
            $scope.activeLink = function () {
                var tabs = $scope.topLevelTabs();
                if (!tabs) {
                    return "Loading...";
                }
                var tab = tabs.find(function (nav) {
                    return $scope.isActive(nav);
                });
                return tab ? tab['content'] : "";
            };
        }]);
})(Jmx || (Jmx = {}));

/// <reference path="jmxPlugin.ts"/>
/**
* @module Jmx
*/
var Jmx;
(function (Jmx) {
    // IOperationControllerScope
    Jmx._module.controller("Jmx.OperationController", ["$scope", "workspace", "jolokia", "jolokiaUrl", "$timeout", "$location", "localStorage", "$browser", function ($scope, workspace, jolokia, jolokiaUrl, $timeout, $location, localStorage, $browser) {
            $scope.item = $scope.selectedOperation;
            $scope.title = $scope.item.humanReadable;
            $scope.desc = $scope.item.desc;
            $scope.operationResult = '';
            $scope.executeIcon = "fa fa-ok";
            $scope.mode = "text";
            $scope.entity = {};
            $scope.formConfig = {
                hideLegend: true,
                properties: {}
            };
            $scope.jolokiaUrl = Jmx.getUrlForThing(jolokiaUrl, 'exec', workspace.getSelectedMBeanName(), $scope.item.name);
            $scope.item.args.forEach(function (arg) {
                var property = {
                    type: arg.type,
                    tooltip: arg.desc,
                    description: "Type: " + arg.type
                };
                if (arg.type.toLowerCase() === 'java.util.list' ||
                    arg.type.toLowerCase() === '[j') {
                    property.type = 'array';
                    property.items = { type: 'string' };
                }
                if (arg.type.toLowerCase() === 'java.util.map') {
                    property.type = 'map';
                    property.items = {
                        key: { type: 'string' },
                        value: { type: 'string' }
                    };
                }
                $scope.formConfig.properties[arg.name] = property;
            });
            Jmx.log.debug("Form config: ", $scope.formConfig);
            $timeout(function () {
                $("html, body").animate({ scrollTop: 0 }, "medium");
            }, 250);
            $scope.dump = function (data) {
                console.log(data);
            };
            $scope.ok = function () {
                $scope.operationResult = '';
            };
            $scope.reset = function () {
                $scope.entity = {};
            };
            $scope.close = function () {
                $scope.$parent.showInvoke = false;
            };
            $scope.handleResponse = function (response) {
                $scope.executeIcon = "fa fa-ok";
                $scope.operationStatus = "success";
                if (response === null || 'null' === response) {
                    $scope.operationResult = "Operation Succeeded!";
                }
                else if (typeof response === 'string') {
                    $scope.operationResult = response;
                }
                else {
                    $scope.operationResult = angular.toJson(response, true);
                }
                $scope.mode = CodeEditor.detectTextFormat($scope.operationResult);
                Core.$apply($scope);
            };
            $scope.onSubmit = function () {
                var json = $scope.entity;
                Jmx.log.debug("onSubmit: json:", json);
                Jmx.log.debug("$scope.item.args: ", $scope.item.args);
                angular.forEach(json, function (value, key) {
                    $scope.item.args.find(function (arg) {
                        return arg['name'] === key;
                    }).value = value;
                });
                $scope.execute();
            };
            $scope.execute = function () {
                var node = workspace.selection;
                if (!node) {
                    return;
                }
                var objectName = node.objectName;
                if (!objectName) {
                    return;
                }
                var args = [objectName, $scope.item.name];
                if ($scope.item.args) {
                    $scope.item.args.forEach(function (arg) {
                        args.push(arg.value);
                    });
                }
                args.push(Core.onSuccess($scope.handleResponse, {
                    error: function (response) {
                        $scope.executeIcon = "fa fa-ok";
                        $scope.operationStatus = "error";
                        var error = response.error;
                        $scope.operationResult = error;
                        var stacktrace = response.stacktrace;
                        if (stacktrace) {
                            $scope.operationResult = stacktrace;
                        }
                        Core.$apply($scope);
                    }
                }));
                $scope.executeIcon = "fa fa-spinner fa fa-spin";
                var fn = jolokia.execute;
                fn.apply(jolokia, args);
            };
        }]);
    Jmx._module.controller("Jmx.OperationsController", ["$scope", "workspace", "jolokia", "rbacACLMBean", "$templateCache", function ($scope, workspace, jolokia, rbacACLMBean, $templateCache) {
            $scope.fetched = false;
            $scope.operations = {};
            $scope.objectName = '';
            $scope.methodFilter = '';
            $scope.workspace = workspace;
            $scope.selectedOperation = null;
            $scope.showInvoke = false;
            $scope.template = "";
            $scope.invokeOp = function (operation) {
                if (!$scope.canInvoke(operation)) {
                    return;
                }
                $scope.selectedOperation = operation;
                $scope.showInvoke = true;
            };
            $scope.getJson = function (operation) {
                return angular.toJson(operation, true);
            };
            $scope.cancel = function () {
                $scope.selectedOperation = null;
                $scope.showInvoke = false;
            };
            $scope.$watch('showInvoke', function (newValue, oldValue) {
                if (newValue !== oldValue) {
                    if (newValue) {
                        $scope.template = $templateCache.get("operationTemplate");
                    }
                    else {
                        $scope.template = "";
                    }
                }
            });
            var fetch = _.debounce(function () {
                var node = workspace.selection || workspace.getSelectedMBean();
                if (!node) {
                    return;
                }
                $scope.objectName = node.objectName;
                if (!$scope.objectName) {
                    return;
                }
                jolokia.request({
                    type: 'list',
                    path: Core.escapeMBeanPath($scope.objectName)
                }, Core.onSuccess(render));
            }, 100, { trailing: true });
            function getArgs(args) {
                return "(" + args.map(function (arg) { return arg.type; }).join() + ")";
            }
            function sanitize(value) {
                for (var item in value) {
                    item = "" + item;
                    value[item].name = item;
                    value[item].humanReadable = Core.humanizeValue(item);
                }
                return value;
            }
            $scope.isOperationsEmpty = function () {
                return $.isEmptyObject($scope.operations);
            };
            $scope.doFilter = function (item) {
                if (Core.isBlank($scope.methodFilter)) {
                    return true;
                }
                if (item.name.toLowerCase().has($scope.methodFilter.toLowerCase())
                    || item.humanReadable.toLowerCase().has($scope.methodFilter.toLowerCase())) {
                    return true;
                }
                return false;
            };
            $scope.canInvoke = function (operation) {
                if (!('canInvoke' in operation)) {
                    return true;
                }
                else {
                    return operation['canInvoke'];
                }
            };
            $scope.getClass = function (operation) {
                if ($scope.canInvoke(operation)) {
                    return 'can-invoke';
                }
                else {
                    return 'cant-invoke';
                }
            };
            $scope.$watch('workspace.selection', function (newValue, oldValue) {
                if (workspace.moveIfViewInvalid()) {
                    return;
                }
                fetch();
            });
            function fetchPermissions(objectName, operations) {
                var map = {};
                map[objectName] = [];
                angular.forEach(operations, function (value, key) {
                    map[objectName].push(value.name);
                });
                rbacACLMBean.then(function (rbacACLMBean) {
                    jolokia.request({
                        type: 'exec',
                        mbean: rbacACLMBean,
                        operation: 'canInvoke(java.util.Map)',
                        arguments: [map]
                    }, Core.onSuccess(function (response) {
                        var map = response.value;
                        angular.forEach(map[objectName], function (value, key) {
                            operations[key]['canInvoke'] = value['CanInvoke'];
                        });
                        Jmx.log.debug("Got operations: ", $scope.operations);
                        Core.$apply($scope);
                    }, {
                        error: function (response) {
                            // silently ignore
                            Jmx.log.debug("Failed to fetch ACL for operations: ", response);
                            Core.$apply($scope);
                        }
                    }));
                });
            }
            function render(response) {
                $scope.fetched = true;
                var ops = response.value.op;
                var answer = {};
                angular.forEach(ops, function (value, key) {
                    if (angular.isArray(value)) {
                        angular.forEach(value, function (value, index) {
                            answer[key + getArgs(value.args)] = value;
                        });
                    }
                    else {
                        answer[key + getArgs(value.args)] = value;
                    }
                });
                $scope.operations = sanitize(answer);
                if ($scope.isOperationsEmpty()) {
                    Core.$apply($scope);
                }
                else {
                    fetchPermissions($scope.objectName, $scope.operations);
                    Core.$apply($scope);
                }
            }
        }]);
})(Jmx || (Jmx = {}));

/**
 * @module Core
 */
/// <reference path="jmxPlugin.ts"/>
var Jmx;
(function (Jmx) {
    // NOTE - $route is brought in here to ensure the factory for that service
    // has been called, otherwise the ng-include directive doesn't show the partial
    // after a refresh until you click a top-level link.
    Jmx.ViewController = Jmx._module.controller("Jmx.ViewController", ["$scope", "$route", "$location", "layoutTree", "layoutFull", "viewRegistry", function ($scope, $route, $location, layoutTree, layoutFull, viewRegistry) {
            findViewPartial();
            $scope.$on("$routeChangeSuccess", function (event, current, previous) {
                findViewPartial();
            });
            function searchRegistry(path) {
                var answer = undefined;
                _.forIn(viewRegistry, function (value, key) {
                    if (!answer) {
                        if (_.startsWith(key, "/") && _.endsWith(key, "/")) {
                            // assume its a regex
                            var text = key.substring(1, key.length - 1);
                            try {
                                var reg = new RegExp(text, "");
                                if (reg.exec(path)) {
                                    answer = value;
                                }
                            }
                            catch (e) {
                                Jmx.log.debug("Invalid RegExp " + text + " for viewRegistry value: " + value);
                            }
                        }
                        else {
                            if (path.startsWith(key)) {
                                answer = value;
                            }
                        }
                    }
                });
                //log.debug("Searching for: " + path + " returning: ", answer);
                return answer;
            }
            function findViewPartial() {
                var answer = null;
                var hash = $location.search();
                var tab = hash['tab'];
                if (angular.isString(tab)) {
                    answer = searchRegistry(tab);
                }
                if (!answer) {
                    var path = $location.path();
                    if (path) {
                        if (_.startsWith(path, "/")) {
                            path = path.substring(1);
                        }
                        answer = searchRegistry(path);
                    }
                }
                if (!answer) {
                    answer = layoutTree;
                }
                $scope.viewPartial = answer;
                Jmx.log.debug("Using view partial: " + answer);
                return answer;
            }
        }]);
})(Jmx || (Jmx = {}));

/// <reference path="../../includes.ts" />
/// <reference path="../../jmx/ts/workspace.ts" />
/**
  * @module Threads
  * @main Threads
  */
var Threads;
(function (Threads) {
    Threads.pluginName = 'threads';
    Threads.templatePath = 'plugins/threads/html/';
    Threads.log = Logger.get("Threads");
    Threads.jmxDomain = 'java.lang';
    Threads.mbeanType = 'Threading';
    Threads.mbean = Threads.jmxDomain + ":type=" + Threads.mbeanType;
    Threads._module = angular.module(Threads.pluginName, []);
    Threads._module.config(["$routeProvider", function ($routeProvider) {
            $routeProvider.
                when('/threads', { templateUrl: UrlHelpers.join(Threads.templatePath, 'index.html') });
        }]);
    Threads._module.run(["$templateCache", "workspace", "viewRegistry", "layoutFull", "helpRegistry", "HawtioNav", function ($templateCache, workspace, viewRegistry, layoutFull, helpRegistry, nav) {
            viewRegistry['threads'] = layoutFull;
            helpRegistry.addUserDoc('threads', 'plugins/threads/doc/help.md');
            var builder = nav.builder();
            var toolbar = builder.id('threads-toolbar')
                .href(function () { return '#'; })
                .template(function () { return $templateCache.get(UrlHelpers.join(Threads.templatePath, 'toolbar.html')); })
                .build();
            var tab = builder.id('threads')
                .href(function () { return '/threads'; })
                .isValid(function () { return workspace.treeContainsDomainAndProperties(Threads.jmxDomain, { type: Threads.mbeanType }); })
                .title(function () { return 'Threads'; })
                .tooltip(function () { return 'View information about the threads in the JVM'; })
                .isSelected(function () { return workspace.isTopTabActive("threads"); })
                .tabs(toolbar)
                .build();
            nav.add(tab);
        }]);
    hawtioPluginLoader.addModule(Threads.pluginName);
})(Threads || (Threads = {}));

/**
 * @module Threads
 */
/// <reference path="./threadsPlugin.ts"/>
var Threads;
(function (Threads) {
    Threads._module.controller("Threads.ToolbarController", ["$scope", "$rootScope", "jolokia", function ($scope, $rootScope, jolokia) {
            $scope.$on('ThreadControllerSupport', function ($event, support) {
                $scope.support = support;
            });
            $scope.$on('ThreadControllerThreads', function ($event, threads) {
                // log.debug("got threads: ", threads);
                $scope.unfilteredThreads = threads;
                $scope.totals = {};
                threads.forEach(function (t) {
                    // calculate totals
                    var state = t.threadState;
                    if (!(state in $scope.totals)) {
                        $scope.totals[state] = 1;
                    }
                    else {
                        $scope.totals[state]++;
                    }
                });
                $scope.threads = threads;
            });
            $scope.stateFilter = 'NONE';
            $scope.filterOn = function (state) {
                $scope.stateFilter = state;
                $rootScope.$broadcast('ThreadsToolbarState', state);
            };
            $scope.selectedFilterClass = function (state) {
                if (state === $scope.stateFilter) {
                    return "active";
                }
                else {
                    return "";
                }
            };
            $scope.getMonitorClass = function (name, value) {
                return value.toString();
            };
            $scope.getMonitorName = function (name) {
                name = name.replace('Supported', '');
                return _.startCase(name);
            };
        }]);
    Threads._module.controller("Threads.ThreadsController", ["$scope", "$rootScope", "$routeParams", "$templateCache", "jolokia", "$element", function ($scope, $rootScope, $routeParams, $templateCache, jolokia, $element) {
            $scope.selectedRowJson = '';
            $scope.lastThreadJson = '';
            $scope.getThreadInfoResponseJson = '';
            $scope.threads = [];
            $scope.totals = {};
            $scope.support = {};
            $scope.row = {};
            $scope.threadSelected = false;
            $scope.selectedRowIndex = -1;
            $scope.stateFilter = 'NONE';
            $scope.showRaw = {
                expanded: false
            };
            $scope.addToDashboardLink = function () {
                var href = "#/threads";
                var size = angular.toJson({
                    size_x: 8,
                    size_y: 2
                });
                var title = "Threads";
                return "#/dashboard/add?tab=dashboard&href=" + encodeURIComponent(href) +
                    "&title=" + encodeURIComponent(title) +
                    "&size=" + encodeURIComponent(size);
            };
            $scope.isInDashboardClass = function () {
                if (angular.isDefined($scope.inDashboard && $scope.inDashboard)) {
                    return "threads-dashboard";
                }
                return "threads logbar";
            };
            $scope.$watch('searchFilter', function (newValue, oldValue) {
                if (newValue !== oldValue) {
                    $scope.threadGridOptions.filterOptions.filterText = newValue;
                }
            });
            $scope.$watch('stateFilter', function (newValue, oldValue) {
                if (newValue !== oldValue) {
                    if ($scope.stateFilter === 'NONE') {
                        $scope.threads = $scope.unfilteredThreads;
                    }
                    else {
                        $scope.threads = $scope.filterThreads($scope.stateFilter, $scope.unfilteredThreads);
                    }
                }
            });
            $scope.threadGridOptions = {
                selectedItems: [],
                data: 'threads',
                showSelectionCheckbox: false,
                enableRowClickSelection: true,
                multiSelect: false,
                primaryKeyFn: function (entity, idx) { return entity.threadId; },
                filterOptions: {
                    filterText: ''
                },
                sortInfo: {
                    sortBy: 'threadId',
                    ascending: false
                },
                columnDefs: [
                    {
                        field: 'threadId',
                        displayName: 'ID'
                    },
                    {
                        field: 'threadState',
                        displayName: 'State',
                        cellTemplate: $templateCache.get("threadStateTemplate")
                    },
                    {
                        field: 'threadName',
                        displayName: 'Name'
                    },
                    {
                        field: 'waitedTime',
                        displayName: 'Waited Time',
                        cellTemplate: '<div class="ngCellText" ng-show="row.entity.waitedTime > 0">{{row.entity.waitedTime | humanizeMs}}</div>'
                    },
                    {
                        field: 'blockedTime',
                        displayName: 'Blocked Time',
                        cellTemplate: '<div class="ngCellText" ng-show="row.entity.blockedTime > 0">{{row.entity.blockedTime | humanizeMs}}</div>'
                    },
                    {
                        field: 'inNative',
                        displayName: 'Native',
                        cellTemplate: '<div class="ngCellText"><span ng-show="row.entity.inNative" class="orange">(in native)</span></div>'
                    },
                    {
                        field: 'suspended',
                        displayName: 'Suspended',
                        cellTemplate: '<div class="ngCellText"><span ng-show="row.entity.suspended" class="red">(suspended)</span></div>'
                    }
                ]
            };
            $scope.$watch('threadGridOptions.selectedItems', function (newValue, oldValue) {
                if (newValue !== oldValue) {
                    if (newValue.length === 0) {
                        $scope.row = {};
                        $scope.threadSelected = false;
                        $scope.selectedRowIndex = -1;
                    }
                    else {
                        $scope.row = newValue.first();
                        $scope.threadSelected = true;
                        $scope.selectedRowIndex = Core.pathGet($scope, ['hawtioSimpleTable', 'threads', 'rows']).findIndex(function (t) { return t.entity['threadId'] === $scope.row['threadId']; });
                    }
                    $scope.selectedRowJson = angular.toJson($scope.row, true);
                }
            }, true);
            $scope.$on('ThreadsToolbarState', function ($event, state) {
                $scope.filterOn(state);
            });
            $scope.filterOn = function (state) {
                $scope.stateFilter = state;
            };
            $scope.filterThreads = function (state, threads) {
                Threads.log.debug("Filtering threads by: ", state);
                if (state === 'NONE') {
                    return threads;
                }
                return threads.filter(function (t) {
                    return t && t['threadState'] === state;
                });
            };
            $scope.deselect = function () {
                $scope.threadGridOptions.selectedItems = [];
            };
            $scope.selectThreadById = function (id) {
                $scope.threadGridOptions.selectedItems = $scope.threads.filter(function (t) { return t.threadId === id; });
            };
            $scope.selectThreadByIndex = function (idx) {
                var selectedThread = Core.pathGet($scope, ['hawtioSimpleTable', 'threads', 'rows'])[idx];
                $scope.threadGridOptions.selectedItems = $scope.threads.filter(function (t) {
                    return t && t['threadId'] == selectedThread.entity['threadId'];
                });
            };
            function render(response) {
                var responseJson = angular.toJson(response.value, true);
                if ($scope.getThreadInfoResponseJson !== responseJson) {
                    $scope.getThreadInfoResponseJson = responseJson;
                    var threads = response.value.exclude(function (t) { return t === null; });
                    $scope.unfilteredThreads = threads;
                    threads = $scope.filterThreads($scope.stateFilter, threads);
                    $scope.threads = threads;
                    $rootScope.$broadcast('ThreadControllerThreads', threads);
                    Core.$apply($scope);
                }
            }
            $scope.init = function () {
                jolokia.request([{
                        type: 'read',
                        mbean: Threads.mbean,
                        attribute: 'ThreadContentionMonitoringSupported'
                    }, {
                        type: 'read',
                        mbean: Threads.mbean,
                        attribute: 'ObjectMonitorUsageSupported'
                    }, {
                        type: 'read',
                        mbean: Threads.mbean,
                        attribute: 'SynchronizerUsageSupported'
                    }], {
                    method: 'post',
                    success: [
                        function (response) {
                            $scope.support.threadContentionMonitoringSupported = response.value;
                            $rootScope.$broadcast('ThreadControllerSupport', $scope.support);
                            Threads.log.debug("ThreadContentionMonitoringSupported: ", $scope.support.threadContentionMonitoringSupported);
                            $scope.maybeRegister();
                        },
                        function (response) {
                            $scope.support.objectMonitorUsageSupported = response.value;
                            $rootScope.$broadcast('ThreadControllerSupport', $scope.support);
                            Threads.log.debug("ObjectMonitorUsageSupported: ", $scope.support.objectMonitorUsageSupported);
                            $scope.maybeRegister();
                        },
                        function (response) {
                            $scope.support.synchronizerUsageSupported = response.value;
                            $rootScope.$broadcast('ThreadControllerSupport', $scope.support);
                            Threads.log.debug("SynchronizerUsageSupported: ", $scope.support.synchronizerUsageSupported);
                            $scope.maybeRegister();
                        }],
                    error: function (response) {
                        Threads.log.error('Failed to query for supported usages: ', response.error);
                    }
                });
            };
            var initFunc = Core.throttled($scope.init, 500);
            $scope.maybeRegister = function () {
                if ('objectMonitorUsageSupported' in $scope.support &&
                    'synchronizerUsageSupported' in $scope.support &&
                    'threadContentionMonitoringSupported' in $scope.support) {
                    Threads.log.debug("Registering dumpAllThreads polling");
                    Core.register(jolokia, $scope, {
                        type: 'exec',
                        mbean: Threads.mbean,
                        operation: 'dumpAllThreads',
                        arguments: [$scope.support.objectMonitorUsageSupported, $scope.support.synchronizerUsageSupported]
                    }, Core.onSuccess(render));
                    if ($scope.support.threadContentionMonitoringSupported) {
                        // check and see if it's actually turned on, if not
                        // enable it
                        jolokia.request({
                            type: 'read',
                            mbean: Threads.mbean,
                            attribute: 'ThreadContentionMonitoringEnabled'
                        }, Core.onSuccess($scope.maybeEnableThreadContentionMonitoring));
                    }
                }
            };
            function disabledContentionMonitoring(response) {
                Threads.log.info("Disabled contention monitoring: ", response);
                Core.$apply($scope);
            }
            function enabledContentionMonitoring(response) {
                $element.on('$destroy', function () {
                    jolokia.setAttribute(Threads.mbean, 'ThreadContentionMonitoringEnabled', false, Core.onSuccess(disabledContentionMonitoring));
                });
                Threads.log.info("Enabled contention monitoring");
                Core.$apply($scope);
            }
            $scope.maybeEnableThreadContentionMonitoring = function (response) {
                if (response.value === false) {
                    Threads.log.info("Thread contention monitoring not enabled, enabling");
                    jolokia.setAttribute(Threads.mbean, 'ThreadContentionMonitoringEnabled', true, Core.onSuccess(enabledContentionMonitoring));
                }
                else {
                    Threads.log.info("Thread contention monitoring already enabled");
                }
                Core.$apply($scope);
            };
            initFunc();
        }]);
})(Threads || (Threads = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="jvmPlugin.ts"/>
/**
 * @module JVM
 */
var JVM;
(function (JVM) {
    JVM.ConnectController = JVM._module.controller("JVM.ConnectController", ["$scope", "$location", "localStorage", "workspace", "$http", function ($scope, $location, localStorage, workspace, $http) {
            JVM.configureScope($scope, $location, workspace);
            function newConfig() {
                return Core.createConnectOptions({
                    scheme: 'http',
                    host: 'localhost',
                    path: 'jolokia',
                    port: 8181,
                    userName: '',
                    password: '',
                    useProxy: !$scope.disableProxy
                });
            }
            ;
            $scope.forms = {};
            $http.get('proxy').then(function (resp) {
                if (resp.status === 200 && Core.isBlank(resp.data)) {
                    $scope.disableProxy = false;
                }
                else {
                    $scope.disableProxy = true;
                }
            });
            var hasMBeans = false;
            workspace.addNamedTreePostProcessor('ConnectTab', function (tree) {
                hasMBeans = workspace && workspace.tree && workspace.tree.children && workspace.tree.children.length > 0;
                $scope.disableProxy = !hasMBeans || Core.isChromeApp();
                Core.$apply($scope);
            });
            $scope.lastConnection = '';
            // load settings like current tab, last used connection
            if (JVM.connectControllerKey in localStorage) {
                try {
                    $scope.lastConnection = angular.fromJson(localStorage[JVM.connectControllerKey]);
                }
                catch (e) {
                    // corrupt config
                    $scope.lastConnection = '';
                    delete localStorage[JVM.connectControllerKey];
                }
            }
            // load connection settings
            $scope.connectionConfigs = Core.loadConnectionMap();
            if (!Core.isBlank($scope.lastConnection)) {
                $scope.currentConfig = $scope.connectionConfigs[$scope.lastConnection];
            }
            else {
                $scope.currentConfig = newConfig();
            }
            /*
            log.debug("Controller settings: ", $scope.settings);
            log.debug("Current config: ", $scope.currentConfig);
            log.debug("All connection settings: ", $scope.connectionConfigs);
            */
            $scope.formConfig = {
                properties: {
                    name: {
                        type: "java.lang.String",
                        tooltip: "Name for this connection",
                        required: true,
                        "input-attributes": {
                            "placeholder": "Unnamed..."
                        }
                    },
                    scheme: {
                        type: "java.lang.String",
                        tooltip: "HTTP or HTTPS",
                        enum: ["http", "https"],
                        required: true
                    },
                    host: {
                        type: "java.lang.String",
                        tooltip: "Target host to connect to",
                        required: true
                    },
                    port: {
                        type: "java.lang.Integer",
                        tooltip: "The HTTP port used to connect to the server",
                        "input-attributes": {
                            "min": "0"
                        },
                        required: true
                    },
                    path: {
                        type: "java.lang.String",
                        tooltip: "The URL path used to connect to Jolokia on the remote server"
                    },
                    userName: {
                        type: "java.lang.String",
                        tooltip: "The user name to be used when connecting to Jolokia"
                    },
                    password: {
                        type: "password",
                        tooltip: "The password to be used when connecting to Jolokia"
                    },
                    useProxy: {
                        type: "java.lang.Boolean",
                        tooltip: "Whether or not we should use a proxy. See more information in the panel to the left.",
                        "control-attributes": {
                            "ng-hide": "disableProxy"
                        }
                    }
                }
            };
            $scope.newConnection = function () {
                $scope.lastConnection = '';
            };
            $scope.deleteConnection = function () {
                delete $scope.connectionConfigs[$scope.lastConnection];
                Core.saveConnectionMap($scope.connectionConfigs);
                var keys = _.keys($scope.connectionConfigs);
                if (keys.length === 0) {
                    $scope.lastConnection = '';
                }
                else {
                    $scope.lastConnection = keys[0];
                }
            };
            $scope.$watch('lastConnection', function (newValue, oldValue) {
                JVM.log.debug("lastConnection: ", newValue);
                if (newValue !== oldValue) {
                    if (Core.isBlank(newValue)) {
                        $scope.currentConfig = newConfig();
                    }
                    else {
                        $scope.currentConfig = $scope.connectionConfigs[newValue];
                    }
                    localStorage[JVM.connectControllerKey] = angular.toJson(newValue);
                }
            }, true);
            $scope.save = function () {
                $scope.gotoServer($scope.currentConfig, null, true);
            };
            $scope.gotoServer = function (connectOptions, form, saveOnly) {
                if (!connectOptions) {
                    connectOptions = Core.getConnectOptions($scope.lastConnection);
                }
                var name = connectOptions.name;
                $scope.connectionConfigs[name] = connectOptions;
                $scope.lastConnection = name;
                if (saveOnly === true) {
                    Core.saveConnectionMap($scope.connectionConfigs);
                    $scope.connectionConfigs = Core.loadConnectionMap();
                    angular.extend($scope.currentConfig, $scope.connectionConfigs[$scope.lastConnection]);
                    Core.$apply($scope);
                    return;
                }
                Core.connectToServer(localStorage, connectOptions);
                $scope.connectionConfigs = Core.loadConnectionMap();
                angular.extend($scope.currentConfig, $scope.connectionConfigs[$scope.lastConnection]);
                Core.$apply($scope);
            };
        }]);
})(JVM || (JVM = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="jvmPlugin.ts"/>
/**
 * @module JVM
 */
var JVM;
(function (JVM) {
    JVM._module.controller("JVM.DiscoveryController", ["$scope", "localStorage", "jolokia", function ($scope, localStorage, jolokia) {
            $scope.discovering = true;
            $scope.agents = undefined;
            $scope.$watch('agents', function (newValue, oldValue) {
                if (newValue !== oldValue) {
                    $scope.selectedAgent = $scope.agents.find(function (a) { return a['selected']; });
                }
            }, true);
            $scope.closePopover = function ($event) {
                $($event.currentTarget).parents('.popover').prev().popover('hide');
            };
            function doConnect(agent) {
                if (!agent.url) {
                    Core.notification('warning', 'No URL available to connect to agent');
                    return;
                }
                var options = Core.createConnectOptions();
                options.name = agent.agent_description;
                var urlObject = Core.parseUrl(agent.url);
                angular.extend(options, urlObject);
                options.userName = agent.username;
                options.password = agent.password;
                Core.connectToServer(localStorage, options);
            }
            ;
            $scope.connectWithCredentials = function ($event, agent) {
                $scope.closePopover($event);
                doConnect(agent);
            };
            $scope.gotoServer = function ($event, agent) {
                if (agent.secured) {
                    $($event.currentTarget).popover('show');
                }
                else {
                    doConnect(agent);
                }
            };
            $scope.getElementId = function (agent) {
                return agent.agent_id.dasherize().replace(/\./g, "-");
            };
            $scope.getLogo = function (agent) {
                if (agent.server_product) {
                    return JVM.logoRegistry[agent.server_product];
                }
                return JVM.logoRegistry['generic'];
            };
            $scope.filterMatches = function (agent) {
                if (Core.isBlank($scope.filter)) {
                    return true;
                }
                else {
                    var needle = $scope.filter.toLowerCase();
                    var haystack = angular.toJson(agent).toLowerCase();
                    return haystack.indexOf(needle) !== 0;
                }
            };
            $scope.getAgentIdClass = function (agent) {
                if ($scope.hasName(agent)) {
                    return "";
                }
                return "strong";
            };
            $scope.hasName = function (agent) {
                if (agent.server_vendor && agent.server_product && agent.server_version) {
                    return true;
                }
                return false;
            };
            $scope.render = function (response) {
                $scope.discovering = false;
                if (response) {
                    var responseJson = angular.toJson(response, true);
                    if ($scope.responseJson !== responseJson) {
                        $scope.responseJson = responseJson;
                        $scope.agents = response;
                    }
                }
                Core.$apply($scope);
            };
            $scope.fetch = function () {
                $scope.discovering = true;
                // use 10 sec timeout
                jolokia.execute('jolokia:type=Discovery', 'lookupAgentsWithTimeout(int)', 10 * 1000, Core.onSuccess($scope.render));
            };
            $scope.fetch();
        }]);
})(JVM || (JVM = {}));

/// <reference path="jvmPlugin.ts"/>
var JVM;
(function (JVM) {
    JVM.HeaderController = JVM._module.controller("JVM.HeaderController", ["$scope", "ConnectOptions", function ($scope, ConnectOptions) {
            if (ConnectOptions) {
                $scope.containerName = ConnectOptions.name || "";
                if (ConnectOptions.returnTo) {
                    $scope.goBack = function () {
                        window.location.href = ConnectOptions.returnTo;
                    };
                }
            }
        }]);
})(JVM || (JVM = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="./jvmPlugin.ts"/>
var JVM;
(function (JVM) {
    JVM._module.controller("JVM.JolokiaPreferences", ["$scope", "localStorage", "jolokiaParams", "$window", function ($scope, localStorage, jolokiaParams, $window) {
            var config = {
                properties: {
                    updateRate: {
                        type: 'number',
                        description: 'The period between polls to jolokia to fetch JMX data',
                        enum: {
                            'Off': 0,
                            '5 Seconds': '5000',
                            '10 Seconds': '10000',
                            '30 Seconds': '30000',
                            '60 seconds': '60000'
                        }
                    },
                    maxDepth: {
                        type: 'number',
                        description: 'The number of levels jolokia will marshal an object to json on the server side before returning'
                    },
                    maxCollectionSize: {
                        type: 'number',
                        description: 'The maximum number of elements in an array that jolokia will marshal in a response'
                    }
                }
            };
            $scope.entity = $scope;
            $scope.config = config;
            Core.initPreferenceScope($scope, localStorage, {
                'updateRate': {
                    'value': 5000,
                    'post': function (newValue) {
                        $scope.$emit('UpdateRate', newValue);
                    }
                },
                'maxDepth': {
                    'value': JVM.DEFAULT_MAX_DEPTH,
                    'converter': parseInt,
                    'formatter': parseInt,
                    'post': function (newValue) {
                        jolokiaParams.maxDepth = newValue;
                        localStorage['jolokiaParams'] = angular.toJson(jolokiaParams);
                    }
                },
                'maxCollectionSize': {
                    'value': JVM.DEFAULT_MAX_COLLECTION_SIZE,
                    'converter': parseInt,
                    'formatter': parseInt,
                    'post': function (newValue) {
                        jolokiaParams.maxCollectionSize = newValue;
                        localStorage['jolokiaParams'] = angular.toJson(jolokiaParams);
                    }
                }
            });
            $scope.reboot = function () {
                $window.location.reload();
            };
        }]);
})(JVM || (JVM = {}));

/// <reference path="jvmPlugin.ts"/>
/**
 * @module JVM
 */
var JVM;
(function (JVM) {
    JVM._module.controller("JVM.JVMsController", ["$scope", "$window", "$location", "localStorage", "workspace", "jolokia", "mbeanName", function ($scope, $window, $location, localStorage, workspace, jolokia, mbeanName) {
            JVM.configureScope($scope, $location, workspace);
            $scope.data = [];
            $scope.deploying = false;
            $scope.status = '';
            $scope.initDone = false;
            $scope.filter = '';
            $scope.filterMatches = function (jvm) {
                if (Core.isBlank($scope.filter)) {
                    return true;
                }
                else {
                    return jvm.alias.toLowerCase().has($scope.filter.toLowerCase());
                }
            };
            $scope.fetch = function () {
                jolokia.request({
                    type: 'exec', mbean: mbeanName,
                    operation: 'listLocalJVMs()',
                    arguments: []
                }, {
                    success: render,
                    error: function (response) {
                        $scope.data = [];
                        $scope.initDone = true;
                        $scope.status = 'Could not discover local JVM processes: ' + response.error;
                        Core.$apply($scope);
                    }
                });
            };
            $scope.stopAgent = function (pid) {
                jolokia.request({
                    type: 'exec', mbean: mbeanName,
                    operation: 'stopAgent(java.lang.String)',
                    arguments: [pid]
                }, Core.onSuccess(function () {
                    $scope.fetch();
                }));
            };
            $scope.startAgent = function (pid) {
                jolokia.request({
                    type: 'exec', mbean: mbeanName,
                    operation: 'startAgent(java.lang.String)',
                    arguments: [pid]
                }, Core.onSuccess(function () {
                    $scope.fetch();
                }));
            };
            $scope.connectTo = function (url, scheme, host, port, path) {
                // we only need the port and path from the url, as we got the rest
                var options = {};
                options["scheme"] = scheme;
                options["host"] = host;
                options["port"] = port;
                options["path"] = path;
                // add empty username as we dont need login
                options["userName"] = "";
                options["password"] = "";
                var con = Core.createConnectToServerOptions(options);
                con.name = "local";
                JVM.log.debug("Connecting to local JVM agent: " + url);
                Core.connectToServer(localStorage, con);
                Core.$apply($scope);
            };
            function render(response) {
                $scope.initDone = true;
                $scope.data = response.value;
                if ($scope.data.length === 0) {
                    $scope.status = 'Could not discover local JVM processes';
                }
                Core.$apply($scope);
            }
            $scope.fetch();
        }]);
})(JVM || (JVM = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="./jvmPlugin.ts"/>
/**
 * @module JVM
 */
var JVM;
(function (JVM) {
    JVM._module.controller("JVM.NavController", ["$scope", "$location", "workspace", function ($scope, $location, workspace) {
            JVM.configureScope($scope, $location, workspace);
        }]);
})(JVM || (JVM = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="./jvmPlugin.ts"/>
/**
 * @module JVM
 */
var JVM;
(function (JVM) {
    JVM._module.controller("JVM.ResetController", ["$scope", "localStorage", function ($scope, localStorage) {
            $scope.doClearConnectSettings = function () {
                var doReset = function () {
                    delete localStorage[JVM.connectControllerKey];
                    delete localStorage[JVM.connectionSettingsKey];
                    setTimeout(function () {
                        window.location.reload();
                    }, 10);
                };
                doReset();
            };
        }]);
})(JVM || (JVM = {}));

angular.module("hawtio-jmx-templates", []).run(["$templateCache", function($templateCache) {$templateCache.put("plugins/jmx/html/areaChart.html","<div ng-controller=\"Jmx.AreaChartController\">\n  <script type=\"text/ng-template\" id=\"areaChart\">\n    <fs-area bind=\"data\" duration=\"250\" interpolate=\"false\" point-radius=\"5\" width=\"width\" height=\"height\" label=\"\"></fs-area>\n  </script>\n  <div compile=\"template\"></div>\n</div>\n");
$templateCache.put("plugins/jmx/html/attributeToolBar.html","<div class=\"pull-right\" ng-hide=\"inDashboard\">\n  <hawtio-filter ng-model=\"gridOptions.filterOptions.filterText\" placeholder=\"Filter...\" save-as=\"{{nid}}-filter-text\"></hawtio-filter>\n</div>\n");
$templateCache.put("plugins/jmx/html/attributes.html","<script type=\"text/ng-template\" id=\"gridTemplate\">\n  <table id=\"attributesGrid\"\n         class=\"table table-condensed table-striped\"\n         hawtio-simple-table=\"gridOptions\">\n  </table>\n</script>\n\n<div ng-controller=\"Jmx.AttributesController\">\n  <div class=\"jmx-attributes-toolbar\" ng-include src=\"toolBarTemplate()\"></div>\n\n  <div class=\"jmx-attributes-wrapper gridStyle\">\n    <div compile=\"attributes\"></div>\n  </div>\n\n  <!-- modal dialog to show/edit the attribute -->\n  <div hawtio-confirm-dialog=\"showAttributeDialog\"\n       ok-button-text=\"Update\" show-ok-button=\"{{entity.rw ? \'true\' : \'false\'}}\" on-ok=\"onUpdateAttribute()\" on-cancel=\"onCancelAttribute()\"\n       cancel-button-text=\"Close\"\n       title=\"Attribute: {{entity.key}}\">\n    <div class=\"dialog-body\">\n      <div hawtio-form-2=\'attributeSchema\' entity=\'entity\'></div>\n    </div>\n  </div>\n\n</div>\n");
$templateCache.put("plugins/jmx/html/chartEdit.html","<div ng-controller=\"Jmx.ChartEditController\">\n  <form>\n    <fieldset>\n      <div class=\"control-group\" ng-show=\"canViewChart()\">\n        <input type=\"submit\" class=\"btn\" value=\"View Chart\" ng-click=\"viewChart()\"\n               ng-disabled=\"!selectedAttributes.length && !selectedMBeans.length\"/>\n      </div>\n      <div class=\"control-group\">\n        <table class=\"table\">\n          <thead>\n          <tr>\n            <th ng-show=\"showAttributes()\">Attributes</th>\n            <th ng-show=\"showElements()\">Elements</th>\n          </tr>\n          </thead>\n          <tbody>\n          <tr>\n            <td ng-show=\"showAttributes()\">\n              <select id=\"attributes\" size=\"20\" multiple ng-multiple=\"true\" ng-model=\"selectedAttributes\"\n                      ng-options=\"name | humanize for (name, value) in metrics\"></select>\n            </td>\n            <td ng-show=\"showElements()\">\n              <select id=\"mbeans\" size=\"20\" multiple ng-multiple=\"true\" ng-model=\"selectedMBeans\"\n                      ng-options=\"name for (name, value) in mbeans\"></select>\n            </td>\n          </tr>\n          </tbody>\n        </table>\n\n        <div class=\"alert\" ng-show=\"!canViewChart()\">\n          <button type=\"button\" class=\"close\" data-dismiss=\"alert\">×</button>\n          <strong>No numeric metrics available!</strong> Try select another item to chart on.\n        </div>\n      </div>\n    </fieldset>\n  </form>\n</div>\n");
$templateCache.put("plugins/jmx/html/charts.html","<div ng-controller=\"Jmx.ChartController\" ng-switch=\"errorMessage()\">\n  <div ng-switch-when=\"metrics\">No valid metrics to show for this mbean.</div>\n  <div ng-switch-when=\"updateRate\">Charts aren\'t available when the update rate is set to \"No refreshes\", go to the <a ng-href=\"#/preferences{{hash}}\">Preferences</a> panel and set a refresh rate to enable charts</div>\n  <div id=\"charts\"></div>\n</div>\n\n");
$templateCache.put("plugins/jmx/html/donutChart.html","<div ng-controller=\"Jmx.DonutChartController\">\n  <script type=\"text/ng-template\" id=\"donut\">\n    <fs-donut bind=\"data\" outer-radius=\"200\" inner-radius=\"75\"></fs-donut>\n  </script>\n  <div compile=\"template\"></div>\n</div>\n");
$templateCache.put("plugins/jmx/html/layoutTree.html","<script type=\"text/ng-template\" id=\"header\">\n  <div class=\"tree-header\" ng-controller=\"Jmx.TreeHeaderController\">\n    <div class=\"left\">\n    </div>\n    <div class=\"right\">\n      <i class=\"fa fa-chevron-down clickable\"\n         title=\"Expand all nodes\"\n         ng-click=\"expandAll()\"></i>\n      <i class=\"fa fa-chevron-up clickable\"\n         title=\"Unexpand all nodes\"\n         ng-click=\"contractAll()\"></i>\n    </div>\n  </div>\n</script>\n\n<hawtio-pane position=\"left\" width=\"300\" header=\"header\">\n  <div id=\"tree-container\"\n       ng-controller=\"Jmx.MBeansController\">\n    <div id=\"jmxtree\"></div>\n  </div>\n</hawtio-pane>\n\n<div class=\"row-fluid\">\n  <!--\n  <ng-include src=\"\'plugins/jmx/html/subLevelTabs.html\'\"></ng-include>\n  -->\n  <div id=\"properties\" ng-view></div>\n</div>\n\n\n");
$templateCache.put("plugins/jmx/html/operations.html","  <script type=\"text/ng-template\" id=\"operationTemplate\">\n    <div>\n      <div ng-controller=\"Jmx.OperationController\">\n        <div ng-show=\"operationResult!=\'\'\">\n          <div class=\"row\">\n            <h3 ng-bind=\"item.name\"></h3>\n            <div hawtio-editor=\"operationResult\" mode=\"mode\"></div>\n            <p></p>\n            <div class=\"control-group pull-right\">\n              <div class=\"controls\">\n                <button class=\"btn cancel\"\n                        title=\"Back to operation list\"\n                        ng-click=\"close()\">\n                        <i class=\"fa fa-list\"></i>\n                </button>\n                <button class=\"btn\"\n                        zero-clipboard\n                        data-clipboard-text=\"{{operationResult}}\"\n                        title=\"Copy value to clipboard\">\n                  <i class=\"fa fa-copy\"></i>\n                </button>\n                <button class=\"btn\"\n                        title=\"Back to operation\"\n                        ng-click=\"ok()\">\n                  <i class=\"fa fa-check\"></i> Invoke Again\n                </button>\n              </div>\n            </div>\n          </div>\n        </div>\n        <div ng-show=\"operationResult==\'\'\">\n          <div class=\"row\">\n            <h3 ng-bind=\"item.name\"></h3>\n            <div ng-hide=\"item.args.length\">\n              This JMX operation requires no arguments.  Click the \'Execute\' button to invoke the operation.\n            </div>\n            <div ng-show=\"item.args.length\">\n              This JMX operation requires some parameters.  Fill in the fields below as necessary and click the \'Execute\' button to invoke the operation.\n            </div>\n            <p></p>\n            <div ng-show=\"item.args.length\" hawtio-form-2=\"formConfig\"\n              entity=\"entity\"\n              name=\"entryForm\"></div>\n            <div class=\"row\">\n              <div class=\"control-group pull-right\">\n                <div class=\"controls\">\n                  <button class=\"btn cancel\"\n                    title=\"Back to list\"\n                    ng-click=\"close()\">\n                    <i class=\"fa fa-list\"></i>\n                  </button>\n                  <button class=\"btn\"\n                    title=\"Clear form\"\n                    ng-click=\"reset()\"\n                    ng-show=\"item.args.length\">\n                    <i class=\"fa fa-undo\"></i>\n                  </button>\n                  <button class=\"btn btn-success execute\"\n                    ng-click=\"onSubmit()\">\n                    <i class=\"{{executeIcon}}\"></i> Execute\n                  </button>\n                </div>\n              </div>\n            </div>\n          </div>\n        </div>\n        <div class=\"row\">\n          <div class=\"expandable closed\">\n            <div class=\"title\">\n              <i class=\"expandable-indicator\"></i> Jolokia REST URL\n            </div>\n            <div class=\"expandable-body well\">\n              <div class=\"input-group\">\n                <span class=\"input-group-addon\" zero-clipboard\n                    data-clipboard-text=\"{{jolokiaUrl}}\"\n                    title=\"Copy Jolokia REST Url to clipboard\">\n                    <i class=\"fa fa-copy\"></i>\n                </span>\n                <input class=\"form-control\" type=\"text\" name=\"jolokiaUrl\" id=\"jolokiaUrl\" value=\"{{jolokiaUrl}}\" readonly>\n              </div>\n            </div>\n          </div>\n        </div>\n      </div>\n    </div>\n  </script>\n\n<div id=\"threadForm\" ng-controller=\"Jmx.OperationsController\">\n  <div ng-show=\"fetched\">\n    <h2 ng-bind=\"objectName\"></h2>\n    <div class=\"row\" ng-hide=\"isOperationsEmpty() || showInvoke\">\n      This MBean supports the following JMX operations.  Click an item in the list to invoke that operation.\n    </div>\n    <div class=\"row\" ng-show=\"isOperationsEmpty()\">\n      This MBean has no JMX operations.\n    </div>\n    <hr>\n    <div class=\"row\" ng-hide=\"isOperationsEmpty() || showInvoke\">\n      <div class=\"pull-right\">\n        <hawtio-filter ng-model=\"methodFilter\" placeholder=\"Filter...\" save-as=\"{{objectName}}-text-filter\"></hawtio-filter>\n      </div>\n    </div>\n\n    <div ng-show=\"showInvoke\">\n      <div compile=\"template\"></div>\n    </div>\n\n    <ul ng-hide=\"showInvoke\" class=\"zebra-list\" ng-hide=\"isOperationsEmpty()\">\n      <li class=\"operation-row\"\n          ng-repeat=\"operation in operations\"\n          ng-show=\"doFilter(operation)\"\n          ng-click=\"invokeOp(operation)\"\n          ng-class=\"getClass(operation)\"\n          title=\"{{operation.desc}}\"\n          data-placement=\"bottom\">\n        <i class=\"fa fa-cog\"\n           ng-class=\"getClass(operation)\"></i>\n        <span>{{operation.name}}</span>\n        <span class=\"operation-actions\">\n          <button class=\"btn\"\n                  zero-clipboard\n                  data-clipboard-text=\"{{operation.name}}\"\n                  title=\"Copy method name to clipboard\">\n            <i class=\"fa fa-copy\"></i>\n          </button>\n        </span>\n      </li>\n    </ul>\n  </div>\n\n</div>\n");
$templateCache.put("plugins/jmx/html/subLevelTabs.html","<ul class=\"nav nav-tabs\" ng-controller=\"Jmx.NavBarController\" hawtio-auto-dropdown>\n  <li ng-repeat=\"nav in subLevelTabs track by $index | orderBy:index\" ng-show=\"isValid(nav)\" ng-class=\"{active : isActive(nav)}\">\n    <a ng-href=\"{{nav.href()}}{{hash}}\" title=\"{{nav.title}}\"\n       data-placement=\"bottom\" ng-bind-html=\"nav.content\">\n    </a>\n  </li>\n\n  <li class=\"pull-right\">\n    <a ng-href=\"{{fullScreenLink()}}\" title=\"Show this view in full screen\" data-placement=\"bottom\">\n      <i class=\"fa fa-fullscreen\"></i>\n    </a>\n  </li>\n  <li class=\"pull-right\">\n    <a ng-href=\"{{addToDashboardLink()}}\" title=\"Add this view to a dashboard\" data-placement=\"bottom\">\n      <i class=\"fa fa-share\"></i>\n    </a>\n  </li>\n  <li class=\"pull-right dropdown overflow\" style=\"visibility: hidden;\">\n    <a href=\"#\" class=\"dropdown-toggle\" data-toggle=\"dropdown\"><i class=\"icon-chevron-down\"></i></a>\n    <ul class=\"dropdown-menu right\"></ul>\n  </li>\n\n\n</ul>\n\n");
$templateCache.put("plugins/jvm/html/connect.html","<div ng-controller=\"JVM.ConnectController\">\n\n  <div class=\"row\">\n    <div class=\"col-md-6\">\n      <div class=\"alert alert-info\">\n        <p>\n          This page allows you to connect to remote processes which <strong>already have a <a\n                href=\"http://jolokia.org/\">jolokia agent</a> running inside them</strong>. You will need to know the\n          host name, port and path of the jolokia agent to be able to connect.\n        </p>\n\n        <p>\n          If the process you wish to connect to does not have a jolokia agent inside, please refer to the <a\n                href=\"http://jolokia.org/agent.html\">jolokia documentation</a> for how to add a JVM, servlet or OSGi\n          based agent inside it.\n        </p>\n\n        <p>\n          If you are using <a href=\"http://fabric8.io/\">Fabric8</a>, <a href=\"http://www.jboss.org/products/fuse\">JBoss Fuse</a>, or <a href=\"http://activemq.apache.org\">Apache ActiveMQ</a>;\n          then a jolokia agent is included by default. Or you can always just deploy hawtio inside the process (which includes the jolokia agent).\n        </p>\n\n        <p>\n          <strong>Use Proxy</strong>:\n          hawtio is running in your browser; usually due to CORS; you cannot open a different host or port from your browser (due to browse security restrictions);\n          so we have to use a proxy servlet inside the hawtio web app to proxy all requests for a different jolokia server - so we can communicate with a different jolokia agent.\n          If you use the hawtio Chrome Extension this isn’t required; since Chrome Extensions are allowed to connect to any host/port.\n        </p>\n\n        <p ng-show=\"hasLocalMBean()\">\n          Use the <strong><a href=\"#/jvm/local\">Local Tab</a></strong> to connect to processes locally on this machine (which will install a jolokia agent automatically if required).\n        </p>\n\n        <p ng-show=\"!hasLocalMBean()\">\n          The <strong>Local Tab</strong> is not currently enabled because either the server side <strong>hawtio-local-jvm-mbean plugin</strong> is not installed or this\n          JVM cannot find the <strong>com.sun.tools.attach.VirtualMachine</strong> API usually found in the <strong>tool.jar</strong>.\n          Please see the <a href=\"http://hawt.io/faq/index.html\">FAQ entry</a> for more details.\n        </p>\n      </div>\n    </div>\n\n    <div class=\"col-md-6\">\n      <dl>\n        <dt>Saved Connections</dt>\n        <dd>\n          <form class=\"form-horizontal no-bottom-margin\">\n            <fieldset>\n              <div class=\"control-group\">\n                <label class=\"control-label\">Connections: </label>\n                <div class=\"controls\">\n                  <select ng-model=\"lastConnection\"\n                          ng-options=\"value.name as key for (key, value) in connectionConfigs\">\n                    <option value=\"\"\n                            ng-hide=\"lastConnection\">New connection...</option>\n                  </select>\n                  <button class=\"btn btn-success\"\n                          title=\"Connect to this server\"\n                          ng-disabled=\"!lastConnection\"\n                          ng-click=\"gotoServer()\"><i class=\"fa fa-share\"></i></button>\n                  <button class=\"btn btn-danger\"\n                          title=\"Delete this connection\"\n                          ng-disabled=\"!lastConnection\"\n                          ng-click=\"deleteConnection()\"><i class=\"fa fa-remove\"></i></button>\n                  <button class=\"btn btn-primary\"\n                          title=\"Create a new connection\"\n                          ng-disabled=\"!lastConnection\"\n                          ng-click=\"newConnection()\"><i class=\"fa fa-plus\"></i></button>\n                </div>\n              </div>\n            </fieldset>\n          </form>\n        </dd>\n      </dl>\n\n      <dl>\n        <dt>Connection Settings</dt>\n        <dd>\n          <div simple-form name=\"connectForm\" data=\"formConfig\" entity=\"currentConfig\" onSubmit=\"gotoServer()\"></div>\n\n          <div class=\"centered\">\n            <button class=\"btn btn-primary\"\n                    ng-disabled=\"!forms.connectForm.$valid\"\n                    hawtio-submit=\"connectForm\"\n                    title=\"Saves the connection and opens a new browser window connecting to the given JVM process via its Jolokia servlet URL\">Connect to remote server</button>\n            <button class=\"btn\"\n                    title=\"Save this configuration but don\'t open a new tab\"\n                    ng-disabled=\"!forms.connectForm.$valid\"\n                    ng-click=\"save()\">Save</button>\n          </div>\n        </dd>\n      </dl>\n\n    </div>\n\n  </div>\n\n</div>\n");
$templateCache.put("plugins/jvm/html/discover.html","<div ng-controller=\"JVM.DiscoveryController\">\n\n  <div class=\"row\">\n\n    <div class=\"pull-right\">\n      <button class=\"btn\" ng-click=\"fetch()\" title=\"Refresh\"><i class=\"fa fa-refresh\"></i></button>\n    </div>\n    <div class=\"pull-right\">\n      <input class=\"search-query\" type=\"text\" ng-model=\"filter\" placeholder=\"Filter...\">\n    </div>\n\n    <script type=\"text/ng-template\" id=\"authPrompt\">\n      <div class=\"auth-form\">\n        <form name=\"authForm\">\n          <input type=\"text\"\n                 class=\"input-sm\"\n                 placeholder=\"Username...\"\n                 ng-model=\"agent.username\"\n                 required>\n          <input type=\"password\"\n                 class=\"input-sm\"\n                 placeholder=\"Password...\"\n                 ng-model=\"agent.password\"\n                 required>\n          <button ng-disabled=\"!authForm.$valid\"\n                  ng-click=\"connectWithCredentials($event, agent)\"\n                  class=\"btn btn-success\">\n            <i class=\"fa fa-share\"></i> Connect\n          </button>\n          <button class=\"btn\" ng-click=\"closePopover($event)\"><i class=\"fa fa-remove\"></i></button>\n        </form>\n      </div>\n    </script>\n\n  </div>\n\n  <div class=\"row\">\n\n    <div ng-show=\"discovering\">\n      <p></p>\n\n      <div class=\"alert alert-info\">\n        <i class=\"fa fa-spinner icon-spin\"></i> Please wait, discovering agents ...\n      </div>\n    </div>\n\n    <div ng-hide=\"discovering\">\n      <div ng-hide=\"agents\">\n        <p></p>\n\n        <div class=\"alert alert-warning\">\n          No agents discovered.\n        </div>\n      </div>\n      <div ng-show=\"agents\">\n        <ul class=\"discovery zebra-list\">\n          <li ng-repeat=\"agent in agents track by $index\" ng-show=\"filterMatches(agent)\">\n\n            <div class=\"inline-block\">\n              <img ng-src=\"{{getLogo(agent)}}\">\n            </div>\n\n            <div class=\"inline-block\">\n              <p ng-hide=\"!hasName(agent)\">\n              <span class=\"strong\"\n                    ng-show=\"agent.server_vendor\">\n                {{agent.server_vendor}} {{_.startCase(agent.server_product)}} {{agent.server_version}}\n              </span>\n              </p>\n            <span ng-class=\"getAgentIdClass(agent)\">\n              <strong ng-show=\"hasName(agent)\">Agent ID: </strong>{{agent.agent_id}}<br/>\n              <strong ng-show=\"hasName(agent)\">Agent Version: </strong><span ng-hide=\"hasName(agent)\"> Version: </span>{{agent.agent_version}}</span><br/>\n              <strong ng-show=\"hasName(agent)\">Agent Description: </strong><span\n                ng-hide=\"hasName(agent)\"> Description: </span>{{agent.agent_description}}</span><br/>\n\n              <p ng-hide=\"!agent.url\"><strong>Agent URL: </strong><a ng-href=\"{{agent.url}}\"\n                                                                     target=\"_blank\">{{agent.url}}</a>\n              </p>\n            </div>\n\n            <div class=\"inline-block lock\" ng-show=\"agent.secured\">\n              <i class=\"fa fa-lock\" title=\"A valid username and password will be required to connect\"></i>\n            </div>\n\n            <div class=\"inline-block\" ng-hide=\"!agent.url\">\n              <div class=\"connect-button\"\n                   ng-click=\"gotoServer($event, agent)\"\n                   hawtio-template-popover\n                   content=\"authPrompt\"\n                   trigger=\"manual\"\n                   placement=\"auto\"\n                   data-title=\"Please enter your username and password\">\n                <i ng-show=\"agent.url\" class=\"icon-play-circle\"></i>\n              </div>\n            </div>\n\n          </li>\n        </ul>\n      </div>\n    </div>\n  </div>\n</div>\n");
$templateCache.put("plugins/jvm/html/jolokiaError.html","<div class=\"modal-header\">\n  <h3 class=\"modal-title\">The connection to jolokia failed!</h3>\n</div>\n<div class=\"modal-body\">\n  <div ng-show=\"responseText\">\n    <p>The connection to jolokia has failed with the following error, also check the javascript console for more details.</p>\n    <div hawtio-editor=\"responseText\" readonly=\"true\"></div>\n  </div>\n  <div ng-hide=\"responseText\">\n    <p>The connection to jolokia has failed for an unknown reason, check the javascript console for more details.</p>\n  </div>\n</div>\n<div class=\"modal-footer\">\n  <button ng-show=\"ConnectOptions.returnTo\" class=\"btn\" ng-click=\"goBack()\">Back</button>\n  <button class=\"btn btn-primary\" ng-click=\"retry()\">Retry</button>\n</div>\n");
$templateCache.put("plugins/jvm/html/jolokiaPreferences.html","<div ng-controller=\"JVM.JolokiaPreferences\">\n  <div hawtio-form-2=\"config\" entity=\"entity\"></div>\n\n  <div class=\"control-group\">\n    <div class=\"controls\">\n      <button class=\"btn btn-primary\" ng-click=\"reboot()\">Apply</button>\n      <span class=\"help-block\">Restart hawtio with the new values in effect</span>\n    </div>\n  </div>\n\n</div>\n");
$templateCache.put("plugins/jvm/html/layoutConnect.html","<ul class=\"nav nav-tabs connected\" ng-controller=\"JVM.NavController\">\n  <li ng-repeat=\"link in breadcrumbs\" ng-show=\"isValid(link)\" ng-class=\'{active : isActive(link.href)}\'>\n    <a ng-href=\"{{link.href}}{{hash}}\" ng-bind-html=\"link.content\"></a>\n  </li>\n</ul>\n<div class=\"row\">\n  <div ng-view></div>\n</div>\n");
$templateCache.put("plugins/jvm/html/local.html","<div ng-controller=\"JVM.JVMsController\">\n\n  <div class=\"row\">\n    <div class=\"pull-right\">\n      <button class=\"btn\" ng-click=\"fetch()\" title=\"Refresh\"><i class=\"fa fa-refresh\"></i></button>\n    </div>\n    <div class=\"pull-right\">\n      <input class=\"search-query\" type=\"text\" ng-model=\"filter\" placeholder=\"Filter...\">\n    </div>\n  </div>\n\n  <div ng-hide=\"initDone\">\n    <div class=\"alert alert-info\">\n      <i class=\"fa fa-spinner icon-spin\"></i> Please wait, discovering local JVM processes ...\n    </div>\n  </div>\n\n  <div ng-hide=\'data.length > 0\' class=\'row\'>\n    {{status}}\n  </div>\n\n  <div ng-show=\'data.length > 0\' class=\"row\">\n    <table class=\'centered table table-bordered table-condensed table-striped\'>\n      <thead>\n      <tr>\n        <th style=\"width: 70px\">PID</th>\n        <th>Name</th>\n        <th style=\"width: 300px\">Agent URL</th>\n        <th style=\"width: 50px\"></th>\n      </tr>\n      </thead>\n      <tbody>\n      <tr ng-repeat=\"jvm in data track by $index\" ng-show=\"filterMatches(jvm)\">\n        <td>{{jvm.id}}</td>\n        <td title=\"{{jvm.displayName}}\">{{jvm.alias}}</td>\n        <td><a href=\'\' title=\"Connect to this agent\"\n               ng-click=\"connectTo(jvm.url, jvm.scheme, jvm.hostname, jvm.port, jvm.path)\">{{jvm.agentUrl}}</a></td>\n        <td>\n          <a class=\'btn control-button\' href=\"\" title=\"Stop agent\" ng-show=\"jvm.agentUrl\"\n             ng-click=\"stopAgent(jvm.id)\"><i class=\"fa fa-off\"></i></a>\n          <a class=\'btn control-button\' href=\"\" title=\"Start agent\" ng-hide=\"jvm.agentUrl\"\n             ng-click=\"startAgent(jvm.id)\"><i class=\"icon-play-circle\"></i></a>\n        </td>\n      </tr>\n\n      </tbody>\n    </table>\n\n  </div>\n\n\n</div>\n");
$templateCache.put("plugins/jvm/html/navbarHeaderExtension.html","<style>\n  .navbar-header-hawtio-jvm {\n    float: left;\n    margin: 0;\n  }\n\n  .navbar-header-hawtio-jvm h4 {\n    color: white;\n    margin: 0px;\n  }\n\n  .navbar-header-hawtio-jvm li {\n    list-style-type: none;\n    display: inline-block;\n    margin-right: 10px;\n    margin-top: 4px;\n  }\n</style>\n<ul class=\"navbar-header-hawtio-jvm\" ng-controller=\"JVM.HeaderController\">\n  <li ng-show=\"containerName\"><h4 ng-bind=\"containerName\"></h4></li>\n  <li ng-show=\"goBack\"><strong><a href=\"\" ng-click=\"goBack()\">Back</a></strong></li>\n</ul>\n");
$templateCache.put("plugins/jvm/html/reset.html","<div ng-controller=\"JVM.ResetController\">\n  <form class=\"form-horizontal\">\n    <fieldset>\n      <div class=\"control-group\">\n        <label class=\"control-label\">\n          <strong>\n            <i class=\'yellow text-shadowed icon-warning-sign\'></i> Clear saved connections\n          </strong>\n        </label>\n        <div class=\"controls\">\n          <button class=\"btn btn-danger\" ng-click=\"doClearConnectSettings()\">Clear saved connections</button>\n          <span class=\"help-block\">Wipe all saved connection settings stored by {{branding.appName}} in your browser\'s local storage</span>\n        </div>\n      </div>\n    </fieldset>\n  </form>\n</div>\n\n");
$templateCache.put("plugins/threads/html/index.html","<div class=\"jmx-threads-page\" ng-controller=\"Threads.ThreadsController\">\n\n  <div>\n    <div class=\"pull-right\">\n      <hawtio-filter ng-model=\"searchFilter\" placeholder=\"Filter...\" save-as=\"threads-text-filter\"></hawtio-filter>\n    </div>\n\n    <p></p>\n\n    <table class=\"table table-condensed table-striped\"\n           hawtio-simple-table=\"threadGridOptions\"></table>\n\n    <div ng-show=\"threadSelected\" class=\"log-info-panel\">\n      <div class=\"log-info-panel-frame\">\n        <div class=\"log-info-panel-header\">\n          <div class=\"row-fluid\">\n            <button class=\"btn\" ng-click=\"deselect()\"><i class=\"icon-remove\"></i> Close</button>\n            <div class=\"btn-group\"\n                 style=\"margin-top: 9px;\"\n                 hawtio-pager=\"hawtioSimpleTable.threads.rows\"\n                 on-index-change=\"selectThreadByIndex\"\n                 row-index=\"selectedRowIndex\">\n            </div>\n\n            <span><strong>Thread ID:</strong> {{row.threadId}}</span>\n          </div>\n\n          <div class=\"row-fluid\">\n            <span><strong>Thread Name:</strong> {{row.threadName}}</span>\n          </div>\n\n        </div>\n        <div class=\"log-info-panel-body\">\n\n          <div class=\"row-fluid\">\n            <span><strong>Waited Count:</strong> {{row.waitedCount}}</span>\n            <span><strong>Waited Time:</strong> {{row.waitedTime}}ms</span>\n          </div>\n\n          <div class=\"row-fluid\">\n            <span><strong>Blocked Count:</strong> {{row.blockedCount}}</span>\n            <span><strong>Blocked Time:</strong> {{row.blockedTime}}ms</span>\n          </div>\n\n          <div class=\"row-fluid\" ng-show=\"row.lockInfo != null\">\n            <span><strong>Lock Name:</strong> {{row.lockName}}</span>\n            <span><strong>Lock Class Name:</strong> {{row.lockInfo.className}}</span>\n            <span><strong>Lock Identity Hash Code:</strong> {{row.lockInfo.identityHashCode}}</span>\n          </div>\n\n          <div class=\"row-fluid\" ng-show=\"row.lockOwnerId > 0\">\n            <span>Waiting for lock owned by <a href=\"\" ng-click=\"selectThreadById(row.lockOwnerId)\">{{row.lockOwnerId}}</a></span>\n            <span><strong>Owner Name:</strong> {{row.lockOwnerName}}</span>\n          </div>\n\n          <dl ng-show=\"row.lockedSynchronizers.length > 0\">\n            <dt>Locked Synchronizers</dt>\n            <dd>\n              <ol class=\"zebra-list\">\n                <li ng-repeat=\"synchronizer in row.lockedSynchronizers\">\n                  <span><strong>Class Name:</strong> {{synchronizer.className}}</span>\n                  <span><strong>Identity Hash Code:</strong> {{synchronizer.identityHashCode}}</span>\n                </li>\n              </ol>\n            </dd>\n          </dl>\n\n          <dl ng-show=\"row.lockedMonitors.length > 0\">\n            <dt>Locked Monitors</dt>\n            <dd>\n              <ol class=\"zebra-list\">\n                <li ng-repeat=\"monitor in row.lockedMonitors\">\n                  Frame: <strong>{{monitor.lockedStackDepth}}</strong>\n                  <span class=\"green\">{{monitor.lockedStackFrame.className}}</span>\n                  <span class=\"bold\">.</span>\n                  <span class=\"blue bold\">{{monitor.lockedStackFrame.methodName}}</span>\n                  &nbsp;({{monitor.lockedStackFrame.fileName}}<span ng-show=\"frame.lineNumber > 0\">:{{monitor.lockedStackFrame.lineNumber}}</span>)\n                  <span class=\"orange\" ng-show=\"monitor.lockedStackFrame.nativeMethod\">(Native)</span>\n                </li>\n              </ol>\n            </dd>\n          </dl>\n\n          <!-- a simple stack trace display, ideally we\n          could show maven links eventually -->\n          <dl>\n            <dt>Stack Trace</dt>\n            <dd>\n              <ol class=\"zebra-list\">\n                <li ng-repeat=\"frame in row.stackTrace\">\n                  <span class=\"green\">{{frame.className}}</span>\n                  <span class=\"bold\">.</span>\n                  <span class=\"blue bold\">{{frame.methodName}}</span>\n                  &nbsp;({{frame.fileName}}<span ng-show=\"frame.lineNumber > 0\">:{{frame.lineNumber}}</span>)\n                  <span class=\"orange\" ng-show=\"frame.nativeMethod\">(Native)</span>\n                </li>\n              </ol>\n            </dd>\n          </dl>\n\n          <!--\n          <div class=\"expandable\" model=\"showRaw\">\n            <div class=\"title\">\n              <i class=\"expandable-indicator\"></i><span> Show JSON</span>\n            </div>\n            <div class=\"expandable-body\">\n              <div hawtio-editor=\"selectedRowJson\" mode=\"javascript\"></div>\n            </div>\n          </div>\n          -->\n\n        </div>\n      </div>\n    </div>\n\n  </div>\n</div>\n\n\n\n");
$templateCache.put("plugins/threads/html/toolbar.html","<div ng-controller=\"Threads.ToolbarController\">\n  <script type=\"text/ng-template\" id=\"threadStateTemplate\">\n    <div class=\"thread-state-indicator\"\n         title=\"{{row.entity.threadState | humanize}}\"\n         ng-switch on=\"row.entity.threadState\">\n      <i ng-switch-when=\"NEW\"\n         class=\"lightgreen icon-bolt\"></i>\n      <i ng-switch-when=\"RUNNABLE\"\n         class=\"green icon-play-circle\"></i>\n      <i ng-switch-when=\"BLOCKED\"\n         class=\"red icon-stop\"></i>\n      <i ng-switch-when=\"WAITING\"\n         class=\"darkgray icon-pause\"></i>\n      <i ng-switch-when=\"TIMED_WAITING\"\n         class=\"orange icon-time\"></i>\n      <i ng-switch-default=\"TERMINATED\"\n         class=\"darkred icon-remove\"></i>\n    </div>\n  </script>\n\n  <div class=\"state-panel inline-block\">\n    <ul class=\"inline\">\n      <li ng-click=\"filterOn(\'NONE\')\"\n          title=\"Clear state filter\"\n          ng-class=\"selectedFilterClass(\'NONE\')\">\n        <span class=\"clickable no-fade total\">Total:</span> {{unfilteredThreads.length}}\n      </li>\n      <li ng-repeat=\"(state, total) in totals track by $index\"\n          ng-click=\"filterOn(state)\"\n          title=\"Filter by {{state}}\"\n          ng-class=\"selectedFilterClass(state)\">\n        <span class=\"clickable no-fade {{state.dasherize()}}\">{{state | humanize}}:</span> {{total}}\n      </li>\n    </ul>\n  </div>\n\n  <div class=\"inline-block support-panel pull-right\">\n    <ul class=\"inline\">\n      <li ng-repeat=\"(name, value) in support track by $index\">\n        <span class=\"monitor-indicator {{getMonitorClass(name, value)}}\" ng-click=\"maybeToggleMonitor(name, value)\">{{getMonitorName(name)}}</span>\n      </li>\n      <li ng-hide=\"inDashboard\">\n        <a ng-href=\"{{addToDashboardLink()}}\" title=\"Add this view to a dashboard\">\n          <i class=\"icon-share\"></i>\n        </a>\n      </li>\n    </ul>\n  </div>\n\n</div>\n\n");}]); hawtioPluginLoader.addModule("hawtio-jmx-templates");