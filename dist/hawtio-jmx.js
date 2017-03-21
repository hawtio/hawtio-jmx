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
        recent = _.take(_.uniq(recent.push(name)), 5);
        localStorage['recentConnections'] = angular.toJson(recent);
    }
    Core.addRecentConnection = addRecentConnection;
    function removeRecentConnection(localStorage, name) {
        var recent = getRecentConnections(localStorage);
        recent = _.without(recent, name);
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
    function connectToServer(localStorage, options) {
        Core.log.debug("Connecting with options: ", StringHelpers.toString(options));
        var clone = angular.extend({}, options);
        addRecentConnection(localStorage, clone.name);
        if (!('userName' in clone)) {
            var userDetails = HawtioCore.injector.get('userDetails');
            clone.userName = userDetails.username;
            clone.password = userDetails.password;
        }
        var $window = HawtioCore.injector.get('$window');
        var url = (clone.view || '/') + '?con=' + clone.name;
        url = url.replace(/\?/g, "&");
        url = url.replace(/&/, "?");
        var newWindow = $window.open(url, 'wnd');
        newWindow['con'] = clone.name;
        newWindow['userDetails'] = {
            username: clone.userName,
            password: clone.password,
            loginDetails: {}
        };
    }
    Core.connectToServer = connectToServer;
    /**
     * Loads all of the available connections from local storage
     * @returns {Core.ConnectionMap}
     */
    function loadConnections() {
        var localStorage = Core.getLocalStorage();
        try {
            var connections = angular.fromJson(localStorage[Core.connectionSettingsKey]);
            if (!connections) {
                // nothing found on local storage
                return [];
            }
            else if (!_.isArray(connections)) {
                // found the legacy connections map
                delete localStorage[Core.connectionSettingsKey];
                return [];
            }
            else {
                // found a valid connections array
                return connections;
            }
        }
        catch (e) {
            // corrupt config
            delete localStorage[Core.connectionSettingsKey];
            return [];
        }
    }
    Core.loadConnections = loadConnections;
    /**
     * Saves the connection map to local storage
     * @param map
     */
    function saveConnections(connections) {
        Logger.get("Core").debug("Saving connection array: ", StringHelpers.toString(connections));
        localStorage[Core.connectionSettingsKey] = angular.toJson(connections);
    }
    Core.saveConnections = saveConnections;
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
        var connections = loadConnections();
        return _.find(connections, function (connection) { return connection.name === name; });
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
            answer = UrlHelpers.join('proxy', uri.protocol(), uri.hostname(), uri.port(), uri.path());
        }
        Logger.get(JVM.pluginName).debug("Using URL: ", answer);
        return answer;
    }
    Core.createServerConnectionUrl = createServerConnectionUrl;
})(Core || (Core = {}));

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
    JVM.skipJolokia = false;
    hawtioPluginLoader.registerPreBootstrapTask({
        name: 'JvmParseLocation',
        task: function (next) {
            if (JVM.skipJolokia) {
                next();
                return;
            }
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
                    jolokiaUrl: jolokiaUrl,
                    name: name,
                    scheme: jolokiaURI.protocol(),
                    host: jolokiaURI.hostname(),
                    port: Core.parseIntValue(jolokiaURI.port()),
                    path: Core.trimLeading(jolokiaURI.pathname(), '/')
                });
                if (!Core.isBlank(token)) {
                    options['token'] = token;
                }
                _.merge(options, jolokiaURI.query(true));
                _.assign(options, query);
                JVM.log.debug("options: ", options);
                var connections = Core.loadConnections();
                connections.push(options);
                Core.saveConnections(connections);
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
        if (JVM.skipJolokia) {
            return false;
        }
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
        if (!ConnectOptions.jolokiaUrl) {
            if (!jolokiaURI.protocol()) {
                jolokiaURI.protocol(windowURI.protocol());
            }
            if (!jolokiaURI.hostname()) {
                jolokiaURI.host(windowURI.hostname());
            }
            if (!jolokiaURI.port()) {
                jolokiaURI.port(windowURI.port());
            }
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
    JVM._module.factory('jolokia', ["$location", "localStorage", "jolokiaStatus", "$rootScope", "userDetails", "jolokiaParams", "jolokiaUrl", "ConnectOptions", "HawtioDashboard", "$uibModal", function ($location, localStorage, jolokiaStatus, $rootScope, userDetails, jolokiaParams, jolokiaUrl, connectionOptions, dash, $uibModal) {
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
                        modal = $uibModal.open({
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
            this.onClickRowHandlers = {};
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
                this.jolokia.list(null, Core.onSuccess(this.wrapInValue, { ignoreErrors: true, maxDepth: 2 }));
            }
        };
        Workspace.prototype.wrapInValue = function (response) {
            this.populateTree({ value: response });
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
            // Emit an event so other parts of the UI can update accordingly
            this.$rootScope.$emit('jmxTreeClicked');
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
    }());
    Core.Workspace = Workspace;
})(Core || (Core = {}));
// TODO refactor other code to use Core.Workspace
var Workspace = (function (_super) {
    __extends(Workspace, _super);
    function Workspace() {
        _super.apply(this, arguments);
    }
    return Workspace;
}(Core.Workspace));
;

/// <reference path="../../includes.ts"/>
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
            .show(function () { return workspace.isLinkActive('jmx/chart'); })
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
                return false;
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
                if ($location.path().startsWith('/jmx/charts')) {
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
                        var oldChildren = folder.children;
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
                onExpand: function (flag, node) {
                    // reflect the "expand" status from dynatree in Folder structure
                    // this will also preserve expand status when redrawin tree!
                    // see "this.data = $.extend({}, $.ui.dynatree.nodedatadefaults, data);" in jquery.dynatree. "data" is Folder object
                    node.data.expand = flag;
                    if (node.data.isFolder()) {
                        var parent = node.data.children[0].parent;
                        if (parent) {
                            parent.expand = flag;
                        }
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
    Jmx._module = angular.module(Jmx.pluginName, ['angularResizable']);
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
    Jmx._module.controller("Jmx.TabController", ["$scope", "$route", "$location", "layoutTree", "layoutFull", "viewRegistry", "workspace", function ($scope, $route, $location, layoutTree, layoutFull, viewRegistry, workspace) {
            $scope.isTabActive = function (path) {
                return path === $location.path();
            };
            $scope.goto = function (path) {
                $location.path(path);
            };
            $scope.editChart = function () { return ($scope.isTabActive('jmx-chart') || $scope.isTabActive('jmx-edit-chart'))
                ? $scope.goto('/jmx/chartEdit', 'jmx-edit-chart') : false; };
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
    Jmx._module.run(["HawtioNav", "$location", "workspace", "viewRegistry", "layoutTree", "layoutFull", "jolokia", "helpRegistry", "pageTitle", "$templateCache", function (nav, $location, workspace, viewRegistry, layoutTree, layoutFull, jolokia, helpRegistry, pageTitle, $templateCache) {
            Jmx.log.debug('loaded');
            viewRegistry['jmx'] = layoutTree;
            viewRegistry['{ "tab": "notree" }'] = layoutFull;
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
            var tab = nav.builder().id('jmx')
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
                .href(function () { return '/jmx'; })
                .build();
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
            cellTemplate: '<div class="ngCellText" title="{{row.entity.attrDesc}}" ' +
                'data-placement="bottom"><div ng-show="!inDashboard" class="inline" compile="row.entity.getDashboardWidgets()"></div><a href="" ng-click="row.entity.onViewAttribute()">{{row.entity.name}}</a></div>' },
        {
            field: 'value',
            displayName: 'Value',
            cellTemplate: '<div class="ngCellText mouse-pointer" ng-click="row.entity.onViewAttribute()" title="{{row.entity.tooltip}}" ng-bind-html="row.entity.summary"></div>'
        }
    ];
    Jmx.foldersColumnDefs = [
        {
            displayName: 'Name',
            cellTemplate: '<div class="ngCellText"><a href="{{row.entity.folderHref(row)}}"><i class="{{row.entity.folderIconClass(row)}}"></i> {{row.getProperty("title")}}</a></div>'
        }
    ];
    Jmx.AttributesController = Jmx._module.controller("Jmx.AttributesController", ["$scope", "$element", "$location", "workspace", "jolokia", "jmxWidgets", "jmxWidgetTypes", "$templateCache", "localStorage", "$browser", function ($scope, $element, $location, workspace, jolokia, jmxWidgets, jmxWidgetTypes, $templateCache, localStorage, $browser) {
            $scope.searchText = '';
            $scope.nid = 'empty';
            $scope.selectedItems = [];
            $scope.lastKey = null;
            $scope.attributesInfoCache = {};
            $scope.entity = {};
            $scope.attributeSchema = {};
            $scope.gridData = [];
            $scope.attributes = "";
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
                properties: {
                    'key': {
                        type: 'string',
                        readOnly: 'true'
                    },
                    'description': {
                        description: 'Description',
                        type: 'string',
                        formTemplate: "<textarea class='form-control' rows='2' readonly='true'></textarea>"
                    },
                    'type': {
                        type: 'string',
                        readOnly: 'true'
                    },
                    'jolokia': {
                        label: 'Jolokia&nbsp;URL',
                        type: 'string',
                        readOnly: 'true'
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
                keepLastSelected: false,
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
                return $scope.gridOptions.selectedItems.map(function (item) {
                    return item.key || item;
                });
            }, function (newValue, oldValue) {
                if (newValue !== oldValue) {
                    Jmx.log.debug("Selected items: ", newValue);
                    $scope.selectedItems = newValue;
                }
            }, true);
            $scope.$on("$routeChangeSuccess", function (event, current, previous) {
                // lets do this asynchronously to avoid Error: $digest already in progress
                // clear selection if we clicked the jmx nav bar button
                // otherwise we may show data from Camel/ActiveMQ or other plugins that
                // reuse the JMX plugin for showing tables (#884)
                var currentUrl = $location.url();
                if (currentUrl.endsWith("/jmx/attributes")) {
                    Jmx.log.debug("Reset selection in JMX plugin");
                    workspace.selection = null;
                    $scope.lastKey = null;
                }
                $scope.nid = $location.search()['nid'];
                Jmx.log.debug("nid: ", $scope.nid);
                pendingUpdate = setTimeout(updateTableContents, 50);
            });
            $scope.$on('jmxTreeUpdated', function () {
                Core.unregister(jolokia, $scope);
                if (pendingUpdate) {
                    clearTimeout(pendingUpdate);
                }
                pendingUpdate = setTimeout(updateTableContents, 500);
            });
            var pendingUpdate = null;
            $scope.$watch('gridOptions.filterOptions.filterText', function (newValue, oldValue) {
                Core.unregister(jolokia, $scope);
                if (pendingUpdate) {
                    clearTimeout(pendingUpdate);
                }
                pendingUpdate = setTimeout(updateTableContents, 500);
            });
            $scope.$watch('workspace.selection', function () {
                if (workspace.moveIfViewInvalid()) {
                    Core.unregister(jolokia, $scope);
                    return;
                }
                if (pendingUpdate) {
                    clearTimeout(pendingUpdate);
                }
                pendingUpdate = setTimeout(function () {
                    $scope.gridData = [];
                    Core.$apply($scope);
                    setTimeout(updateTableContents, 10);
                }, 10);
            });
            $scope.hasWidget = function (row) {
                return true;
            };
            $scope.onCancelAttribute = function () {
                // clear entity
                $scope.entity = {};
            };
            $scope.onUpdateAttribute = function () {
                var value = $scope.entity["attrValueEdit"];
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
                // create entity and populate it with data from the selected row
                $scope.entity = {};
                $scope.entity["key"] = row.key;
                $scope.entity["description"] = row.attrDesc;
                $scope.entity["type"] = row.type;
                var url = $location.protocol() + "://" + $location.host() + ":" + $location.port() + $browser.baseHref();
                $scope.entity["jolokia"] = url + localStorage["url"] + "/read/" + workspace.getSelectedMBeanName() + "/" + $scope.entity["key"];
                $scope.entity["rw"] = row.rw;
                var type = asJsonSchemaType(row.type, row.key);
                var readOnly = !row.rw;
                // calculate a textare with X number of rows that usually fit the value to display
                var len = row.summary.length;
                var rows = (len / 40) + 1;
                if (rows > 10) {
                    // cap at most 10 rows to not make the dialog too large
                    rows = 10;
                }
                if (readOnly) {
                    // if the value is empty its a &nbsp; as we need this for the table to allow us to click on the empty row
                    if (row.summary === '&nbsp;') {
                        $scope.entity["attrValueView"] = '';
                    }
                    else {
                        $scope.entity["attrValueView"] = row.summary;
                    }
                    // clone from the basic schema to the new schema we create on-the-fly
                    // this is needed as the dialog have problems if reusing the schema, and changing the schema afterwards
                    // so its safer to create a new schema according to our needs
                    $scope.attributeSchemaView = {};
                    for (var i in attributeSchemaBasic) {
                        $scope.attributeSchemaView[i] = attributeSchemaBasic[i];
                    }
                    // and add the new attrValue which is dynamic computed
                    $scope.attributeSchemaView.properties.attrValueView = {
                        description: 'Value',
                        label: "Value",
                        type: 'string',
                        formTemplate: "<textarea class='form-control' rows='" + rows + "' readonly='true'></textarea>"
                    };
                    // just to be safe, then delete not needed part of the schema
                    if ($scope.attributeSchemaView) {
                        delete $scope.attributeSchemaView.properties.attrValueEdit;
                    }
                }
                else {
                    // if the value is empty its a &nbsp; as we need this for the table to allow us to click on the empty row
                    if (row.summary === '&nbsp;') {
                        $scope.entity["attrValueEdit"] = '';
                    }
                    else {
                        $scope.entity["attrValueEdit"] = row.summary;
                    }
                    // clone from the basic schema to the new schema we create on-the-fly
                    // this is needed as the dialog have problems if reusing the schema, and changing the schema afterwards
                    // so its safer to create a new schema according to our needs
                    $scope.attributeSchemaEdit = {};
                    for (var i in attributeSchemaBasic) {
                        $scope.attributeSchemaEdit[i] = attributeSchemaBasic[i];
                    }
                    // and add the new attrValue which is dynamic computed
                    $scope.attributeSchemaEdit.properties.attrValueEdit = {
                        description: 'Value',
                        label: "Value",
                        type: 'string',
                        formTemplate: "<textarea class='form-control' rows='" + rows + "'></textarea>"
                    };
                    // just to be safe, then delete not needed part of the schema
                    if ($scope.attributeSchemaEdit) {
                        delete $scope.attributeSchemaEdit.properties.attrValueView;
                    }
                }
                $scope.showAttributeDialog = true;
            };
            $scope.getDashboardWidgets = function (row) {
                var mbean = workspace.getSelectedMBeanName();
                if (!mbean) {
                    return '';
                }
                var potentialCandidates = _.filter(jmxWidgets, function (widget) {
                    return mbean === widget.mbean;
                });
                if (potentialCandidates.length === 0) {
                    return '';
                }
                potentialCandidates = _.filter(potentialCandidates, function (widget) {
                    return widget.attribute === row.key || widget.total === row.key;
                });
                if (potentialCandidates.length === 0) {
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
                var widget = _.first(candidates);
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
                    return Core.url($location.path() + "?nid=" + key);
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
                return row.getProperty("objectName") ? "fa fa-cog" : "pficon pficon-folder-close";
            };
            function operationComplete() {
                updateTableContents();
            }
            function updateTableContents() {
                // lets clear any previous queries just in case!
                Core.unregister(jolokia, $scope);
                $scope.gridData = [];
                $scope.mbeanIndex = null;
                var mbean = workspace.getSelectedMBeanName();
                var request = null;
                var node = workspace.selection;
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
                    }
                }
                else if (node) {
                    if (node.key !== $scope.lastKey) {
                        $scope.gridOptions.columnDefs = [];
                        $scope.gridOptions.enableRowClickSelection = true;
                    }
                    // lets query each child's details
                    var children = node.children;
                    if (children) {
                        var childNodes = children.map(function (child) { return child.objectName; });
                        var mbeans = childNodes.filter(function (mbean) { return FilterHelpers.search(mbean, $scope.gridOptions.filterOptions.filterText); });
                        var maxFolderSize = localStorage["jmxMaxFolderSize"];
                        mbeans = mbeans.slice(0, maxFolderSize);
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
                }
                if (node) {
                    $scope.lastKey = node.key;
                    $scope.title = node.title;
                }
                Core.$apply($scope);
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
                                $scope.gridOptions.gridKey = key;
                                $scope.gridOptions.onClickRowHandlers = workspace.onClickRowHandlers;
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
                                $scope.gridOptions.columnDefs = defaultDefs;
                                $scope.gridOptions.enableRowClickSelection = true;
                            }
                        }
                        // mask attribute read error
                        angular.forEach(data, function (value, key) {
                            if (includePropertyValue(key, value)) {
                                data[key] = maskReadError(value);
                            }
                        });
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
                                    var data = {
                                        key: key,
                                        name: Core.humanizeValue(key),
                                        value: maskReadError(Core.safeNullAsString(value, type))
                                    };
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
            function maskReadError(value) {
                if (typeof value !== 'string') {
                    return value;
                }
                var forbidden = /^ERROR: Reading attribute .+ \(class java\.lang\.SecurityException\)$/;
                var unsupported = /^ERROR: java\.lang\.UnsupportedOperationException: .+ \(class javax\.management\.RuntimeMBeanException\)$/;
                if (value.match(forbidden)) {
                    return "**********";
                }
                else if (value.match(unsupported)) {
                    return "(Not supported)";
                }
                else {
                    return value;
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
                var value = Core.escapeHtml(data.value);
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
            $scope.canEditChart = function () {
                // Similar to can view chart, although rules are slightly different for parents
                var result;
                if (workspace.selection && workspace.selection.isFolder()) {
                    // For ENTESB-4165. This is a bit hacky but needed to deal with special conditions like
                    // where there is only a single queue or topic
                    result = $scope.selectedAttributes.length && $scope.selectedMBeans.length &&
                        ($scope.size($scope.mbeans) + $scope.size($scope.metrics) > 2);
                }
                else {
                    result = $scope.selectedAttributes.length && $scope.selectedMBeans.length &&
                        $scope.size($scope.mbeans) > 0 && $scope.size($scope.metrics) > 0;
                }
                return result;
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
                if (!workspace.selection.isFolder() && $scope.selectedMBeans.length === $scope.size($scope.mbeans) && $scope.size($scope.mbeans) === 1) {
                    delete search["el"];
                }
                else {
                    search["el"] = $scope.selectedMBeans;
                }
                search['sub-tab'] = 'jmx-chart';
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
                if (!angular.isDefined(node) || node === null) {
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
                                                if ($scope.metrics[name] && !_.some($scope.selectedAttributes, function (el) { return el === name; })) {
                                                    $scope.selectedAttributes.push(name);
                                                }
                                            });
                                        }
                                        if (elementNames && elementNames.length) {
                                            elementNames.forEach(function (name) {
                                                if ($scope.mbeans[name] && !_.some($scope.selectedAttributes, function (el) { return el === name; })) {
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
            $scope.title = workspace.selection ? workspace.selection.title : '';
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
                    // mbeans with special characters such as ? and query parameters such as Camel endpoint mbeans
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
                    // must use post, so see further below where we pass in {method: "post"}
                    var meta = $scope.jolokia.request(infoQuery, { method: "post" });
                    if (meta) {
                        // in case of error then use the default error handler
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

/// <reference path="jmxPlugin.ts"/>
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
    Jmx._module.controller("Jmx.MBeansController", ["$scope", "$location", "workspace", "$route", function ($scope, $location, workspace, $route) {
            $scope.num = 1;
            $scope.$on("$routeChangeSuccess", function (event, current, previous) {
                // lets do this asynchronously to avoid Error: $digest already in progress
                setTimeout(updateSelectionFromURL, 50);
            });
            $scope.$on("$routeUpdate", function (ev, params) {
                if (params && params.params && params.params.tab && params.params.tab.match(/notree$/)) {
                    $route.reload();
                }
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

/**
* @module Jmx
*/
/// <reference path="./jmxPlugin.ts"/>
var Jmx;
(function (Jmx) {
    var JAVA_TYPE_DEFAULT_VALUES = {
        'boolean': false,
        'int': 0,
        'long': 0,
        'java.lang.Boolean': false,
        'java.lang.Integer': 0,
        'java.lang.Long': 0,
        'java.lang.String': ''
    };
    // IOperationControllerScope
    Jmx._module.controller("Jmx.OperationController", ["$scope", "workspace", "jolokia", "$timeout", "$location", "localStorage", "$browser", function ($scope, workspace, jolokia, $timeout, $location, localStorage, $browser) {
            $scope.item = $scope.selectedOperation;
            $scope.title = $scope.item.humanReadable;
            $scope.desc = $scope.item.desc;
            $scope.operationResult = '';
            $scope.mode = "text";
            $scope.entity = {};
            $scope.formConfig = {
                properties: {}
            };
            var url = $location.protocol() + "://" + $location.host() + ":" + $location.port() + $browser.baseHref();
            $scope.jolokiaUrl = url + localStorage["url"] + "/exec/" + workspace.getSelectedMBeanName() + "/" + $scope.item.name;
            $scope.item.args.forEach(function (arg) {
                $scope.formConfig.properties[arg.name] = {
                    type: arg.type,
                    tooltip: arg.desc,
                    help: "Type: " + arg.type
                };
            });
            $timeout(function () {
                $("html, body").animate({ scrollTop: 0 }, "medium");
            }, 250);
            var sanitize = function (args) {
                if (args) {
                    args.forEach(function (arg) {
                        switch (arg.type) {
                            case "int":
                            case "long":
                                arg.formType = "number";
                                break;
                            default:
                                arg.formType = "text";
                        }
                    });
                }
                return args;
            };
            $scope.args = sanitize($scope.item.args);
            $scope.dump = function (data) {
                console.log(data);
            };
            $scope.ok = function () {
                $scope.operationResult = '';
            };
            $scope.reset = function () {
                $scope.entity = {};
                $scope.operationResult = '';
            };
            $scope.close = function () {
                $scope.$parent.showInvoke = false;
            };
            $scope.handleResponse = function (response) {
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
            $scope.onSubmit = function (json, form) {
                Jmx.log.debug("onSubmit: json:", json, " form: ", form);
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
                        var value = $scope.entity[arg.name] || JAVA_TYPE_DEFAULT_VALUES[arg.type];
                        args.push(value);
                    });
                }
                args.push(Core.onSuccess($scope.handleResponse, {
                    error: function (response) {
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
                console.log(args);
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
            var fetch = Core.throttled(function () {
                var node = workspace.selection;
                if (!node) {
                    return;
                }
                $scope.objectName = node.objectName;
                if (!$scope.objectName) {
                    return;
                }
                $scope.title = node.title;
                jolokia.request({
                    type: 'list',
                    path: Core.escapeMBeanPath($scope.objectName)
                }, Core.onSuccess(render));
            }, 500);
            function getArgs(args) {
                return "(" + args.map(function (arg) { return arg.type; }).join() + ")";
            }
            function getArgType(arg) {
                var lastDotIndex = arg.type.lastIndexOf('.');
                if (lastDotIndex > 0) {
                    return arg.type.substr(lastDotIndex + 1);
                }
                else {
                    return arg.type;
                }
            }
            function sanitize(operations) {
                for (var operationName in operations) {
                    operationName = "" + operationName;
                    operations[operationName].name = operationName;
                    operations[operationName].humanReadable = Core.humanizeValue(operationName);
                    operations[operationName].displayName = toDisplayName(operationName);
                }
                return operations;
            }
            function toDisplayName(operationName) {
                var startParamsIndex = operationName.indexOf('(') + 1;
                var endParamsIndex = operationName.indexOf(')');
                if (startParamsIndex === endParamsIndex) {
                    return operationName;
                }
                else {
                    var paramsStr = operationName.substring(startParamsIndex, endParamsIndex);
                    var params = paramsStr.split(',');
                    var simpleParams = params.map(function (param) {
                        var lastDotIndex = param.lastIndexOf('.');
                        return lastDotIndex > 0 ? param.substr(lastDotIndex + 1) : param;
                    });
                    var simpleParamsStr = simpleParams.join(', ');
                    var simpleOperationName = operationName.replace(paramsStr, simpleParamsStr);
                    return simpleOperationName;
                }
            }
            $scope.isOperationsEmpty = function () {
                return $.isEmptyObject($scope.operations);
            };
            $scope.doFilter = function (item) {
                var filterTextLowerCase = $scope.methodFilter.toLowerCase();
                return Core.isBlank($scope.methodFilter) ||
                    item.name.toLowerCase().indexOf(filterTextLowerCase) !== -1 ||
                    item.humanReadable.toLowerCase().indexOf(filterTextLowerCase) !== -1;
            };
            $scope.canInvoke = function (operation) {
                if (!('canInvoke' in operation)) {
                    return true;
                }
                else {
                    return operation['canInvoke'];
                }
            };
            $scope.$watch('workspace.selection', function (newValue, oldValue) {
                if (!workspace.selection || workspace.moveIfViewInvalid()) {
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
                var operations = {};
                angular.forEach(ops, function (value, key) {
                    if (angular.isArray(value)) {
                        angular.forEach(value, function (value, index) {
                            operations[key + getArgs(value.args)] = value;
                        });
                    }
                    else {
                        operations[key + getArgs(value.args)] = value;
                    }
                });
                $scope.operations = sanitize(operations);
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

/// <reference path="../../includes.ts"/>
/// <reference path="jvmPlugin.ts"/>
/**
 * @module JVM
 */
var JVM;
(function (JVM) {
    JVM.ConnectController = JVM._module.controller("JVM.ConnectController", ["$scope", "$location",
        "localStorage", "workspace", "$http", "$timeout", function ($scope, $location, localStorage, workspace, $http, $timeout) {
            JVM.configureScope($scope, $location, workspace);
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
            // load connections
            $scope.connections = Core.loadConnections();
            $scope.connections.forEach(function (connection) { return connection['expanded'] = false; });
            $scope.newConnection = function () {
                var connection = Core.createConnectOptions({
                    name: 'Untitled connection',
                    scheme: 'http',
                    host: 'localhost',
                    path: 'jolokia',
                    port: 8181,
                    userName: '',
                    password: '',
                    expanded: true,
                    showSecondaryActions: false
                });
                $scope.connections.unshift(connection);
                $scope.saveConnections();
            };
            $scope.deleteConnection = function (connection) {
                $scope.connections.splice($scope.connections.indexOf(connection), 1);
                $scope.saveConnections();
            };
            $scope.saveConnections = function () {
                Core.saveConnections($scope.connections);
            };
            $scope.toggleSecondaryActions = function (connection) {
                connection.showSecondaryActions = !connection.showSecondaryActions;
            };
            $scope.hideSecondaryActions = function (connection) {
                $timeout(function () { connection.showSecondaryActions = false; }, 200);
            };
            $scope.connect = function (connection) {
                // connect to root by default as we do not want to show welcome page
                connection.view = connection.view || '#/';
                Core.connectToServer(localStorage, connection);
            };
            var autoconnect = $location.search();
            if (typeof autoconnect != 'undefined' && typeof autoconnect.name != 'undefined') {
                var conOpts = Core.createConnectOptions({
                    scheme: autoconnect.scheme || 'http',
                    host: autoconnect.host,
                    path: autoconnect.path,
                    port: autoconnect.port,
                    userName: autoconnect.userName,
                    password: autoconnect.password,
                    name: autoconnect.name
                });
                $scope.connect(conOpts);
                window.close();
            }
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
                // connect to root by default as we do not want to show welcome page
                options["view"] = "#/";
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
    Threads._module = angular.module(Threads.pluginName, ['patternfly']);
    Threads._module.config(["$routeProvider", function ($routeProvider) {
            $routeProvider.
                when('/threads', { templateUrl: UrlHelpers.join(Threads.templatePath, 'index.html') });
        }]);
    Threads._module.run(["$templateCache", "workspace", "viewRegistry", "layoutFull", "helpRegistry", "HawtioNav",
        function ($templateCache, workspace, viewRegistry, layoutFull, helpRegistry, nav) {
            viewRegistry['threads'] = layoutFull;
            helpRegistry.addUserDoc('threads', 'plugins/threads/doc/help.md');
            var tab = nav.builder().id('threads')
                .href(function () { return '/threads'; })
                .isValid(function () { return workspace.treeContainsDomainAndProperties(Threads.jmxDomain, { type: Threads.mbeanType }); })
                .title(function () { return 'Threads'; })
                .tooltip(function () { return 'View information about the threads in the JVM'; })
                .isSelected(function () { return workspace.isTopTabActive("threads"); })
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
            $scope.getMonitorClass = function (name, value) {
                return value.toString();
            };
            $scope.getMonitorName = function (name) {
                name = name.replace('Supported', '');
                return _.startCase(name);
            };
        }]);
    Threads._module.controller("Threads.ThreadsController", ["$scope", "$rootScope", "$routeParams", "$templateCache", "jolokia", "$element", "$uibModal", function ($scope, $rootScope, $routeParams, $templateCache, jolokia, $element, $uibModal) {
            var modalInstance = null;
            $scope.selectedRowJson = '';
            $scope.lastThreadJson = '';
            $scope.getThreadInfoResponseJson = '';
            $scope.threads = [];
            $scope.support = {};
            $scope.row = {};
            $scope.selectedRowIndex = -1;
            $scope.stateFilter = null;
            $scope.availableStates = [
                { id: 'BLOCKED', name: 'Blocked' },
                { id: 'NEW', name: 'New' },
                { id: 'RUNNABLE', name: 'Runnable' },
                { id: 'TERMINATED', name: 'Terminated' },
                { id: 'TIMED_WAITING', name: 'Timed waiting' },
                { id: 'WAITING', name: 'Waiting' }
            ];
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
                    if ($scope.stateFilter) {
                        $scope.threads = filterThreads($scope.stateFilter, $scope.unfilteredThreads);
                    }
                    else {
                        $scope.threads = $scope.unfilteredThreads;
                    }
                    $scope.apply();
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
                        displayName: 'ID',
                        customSortField: function (value) { return Number(value.threadId); }
                    },
                    {
                        field: 'threadState',
                        displayName: 'State',
                        cellTemplate: '{{row.entity.threadState | humanize}}'
                    },
                    {
                        field: 'threadName',
                        displayName: 'Name'
                    },
                    {
                        field: 'waitedTime',
                        displayName: 'Waited Time',
                        cellTemplate: '<div ng-show="row.entity.waitedTime > 0">{{row.entity.waitedTime | humanizeMs}}</div>'
                    },
                    {
                        field: 'blockedTime',
                        displayName: 'Blocked Time',
                        cellTemplate: '<div ng-show="row.entity.blockedTime > 0">{{row.entity.blockedTime | humanizeMs}}</div>'
                    },
                    {
                        field: 'inNative',
                        displayName: 'Native',
                        cellTemplate: '<div ng-show="row.entity.inNative" class="orange">(in native)</div>'
                    },
                    {
                        field: 'suspended',
                        displayName: 'Suspended',
                        cellTemplate: '<div ng-show="row.entity.suspended" class="red">(suspended)</div>'
                    }
                ]
            };
            $scope.$watch('threadGridOptions.selectedItems', function (newValue, oldValue) {
                if (newValue !== oldValue) {
                    if (newValue.length === 0) {
                        $scope.row = {};
                        $scope.selectedRowIndex = -1;
                    }
                    else {
                        $scope.row = _.first(newValue);
                        $scope.selectedRowIndex = Core.pathGet($scope, ['hawtioSimpleTable', 'threads', 'rows']).findIndex(function (t) { return t.entity['threadId'] === $scope.row['threadId']; });
                        openModal();
                    }
                    $scope.selectedRowJson = angular.toJson($scope.row, true);
                }
            }, true);
            $scope.clearStateFilter = function () { return $scope.stateFilter = null; };
            $scope.clearSearchFilter = function () { return $scope.searchFilter = null; };
            $scope.clearAllFilters = function () {
                $scope.clearStateFilter();
                $scope.clearSearchFilter();
            };
            function filterThreads(state, threads) {
                Threads.log.debug("Filtering threads by: ", state);
                if (state) {
                    return threads.filter(function (t) {
                        return t && t['threadState'] === state.id;
                    });
                }
                else {
                    return threads;
                }
            }
            ;
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
                if ($scope.threads.length === 0) {
                    var responseJson = angular.toJson(response.value, true);
                    if ($scope.getThreadInfoResponseJson !== responseJson) {
                        $scope.getThreadInfoResponseJson = responseJson;
                        $scope.unfilteredThreads = _.without(response.value, null);
                        $scope.threads = filterThreads($scope.stateFilter, $scope.unfilteredThreads);
                        Core.$apply($scope);
                    }
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
            function openModal() {
                if (!modalInstance) {
                    modalInstance = $uibModal.open({
                        templateUrl: 'threadModalContent.html',
                        scope: $scope,
                        size: 'lg'
                    });
                    modalInstance.result.finally(function () {
                        modalInstance = null;
                        $scope.deselect();
                    });
                }
            }
            initFunc();
        }]);
})(Threads || (Threads = {}));

angular.module('hawtio-jmx-templates', []).run(['$templateCache', function($templateCache) {$templateCache.put('plugins/jvm/html/connect.html','<div id="jvm-remote" ng-controller="JVM.ConnectController">\n\n  <h1>Remote</h1>\n\n  <div class="row">\n    <div class="col-md-7">\n      <div class="toolbar-pf">\n        <form class="toolbar-pf-actions">\n          <div class="form-group">\n            <button class="btn btn-default" ng-click="newConnection()">\n              Add connection\n            </button>\n          </div>\n        </form>\n      </div>\n      <div class="list-group list-view-pf list-view-pf-view">\n        <div class="list-group-item list-view-pf-stacked" \n             ng-class="{\'list-view-pf-expand-active\': connection.expanded}"\n             ng-repeat="connection in connections track by $index">\n          <div class="list-group-item-header" title="{{connection.expanded ? \'\' : \'Click to edit\'}}"\n               ng-click="connection.expanded = !connection.expanded">\n            <div class="list-view-pf-expand">\n              <span class="fa fa-angle-right" ng-class="{\'fa-angle-down\': connection.expanded}"></span>\n            </div>\n            <div class="list-view-pf-actions">\n              <button class="btn btn-default" title="" ng-click="connect(connection); $event.stopPropagation();">\n                Connect\n              </button>\n              <div class="dropdown pull-right dropdown-kebab-pf" ng-class="{\'open\': connection.showSecondaryActions}">\n                <button type="button" id="dropdown-{{$index}}" class="btn btn-link dropdown-toggle" title=""\n                        data-toggle="dropdown" aria-haspopup="true" aria-expanded="{{connection.showSecondaryActions}}" \n                        ng-click="toggleSecondaryActions(connection); $event.stopPropagation();"\n                        ng-blur="hideSecondaryActions(connection)">\n                  <span class="fa fa-ellipsis-v"></span>\n                </button>\n                <ul class="dropdown-menu dropdown-menu-right" aria-labelledby="dropdown-{{$index}}">\n                  <li><a href="#" ng-click="deleteConnection(connection); $event.preventDefault(); $event.stopPropagation();">Remove</a></li>\n                </ul>\n              </div>\n            </div>\n            <div class="list-view-pf-main-info">\n              <div class="list-view-pf-body">\n                <div class="list-view-pf-description">\n                  <div class="list-group-item-heading">\n                    {{connection.name}}\n                  </div>\n                  <div class="list-group-item-text" ng-show="connection.scheme && connection.host &&\n                      connection.port && connection.path">\n                    {{connection.scheme}}://{{connection.host}}:{{connection.port}}/{{connection.path}}\n                  </div>\n                </div>\n              </div>\n            </div>\n          </div>\n          <div class="list-group-item-container" ng-if="connection.expanded">\n            <div class="close" ng-click="connection.expanded = false">\n              <span class="pficon pficon-close"></span>\n            </div>\n            <form name="connectForm" class="form-horizontal" ng-model-options="{ updateOn: \'change\' }">\n              <div class="form-group">\n                <label class="col-sm-3 control-label" for="name-{{$index}}">Name</label>\n                <div class="col-sm-8">\n                  <input type="text" class="form-control" id="name-{{$index}}" name="name" required\n                         ng-model="connection.name" ng-change="saveConnections()">\n                </div>\n              </div>\n              <div class="form-group">\n                <label class="col-sm-3 control-label" for="scheme-{{$index}}">Scheme</label>\n                <div class="col-sm-8">\n                  <select class="form-control" id="scheme-{{$index}}" name="scheme" required\n                          ng-model="connection.scheme" ng-change="saveConnections()">\n                    <option>http</option>\n                    <option>https</option>\n                  </select>\n                </div>\n              </div>\n              <div class="form-group">\n                <label class="col-sm-3 control-label" for="host-{{$index}}">Host</label>\n                <div class="col-sm-8">\n                  <input type="text" class="form-control" id="host-{{$index}}" name="host" required\n                         ng-model="connection.host"  ng-change="saveConnections()">\n                </div>\n              </div>\n              <div class="form-group">\n                <label class="col-sm-3 control-label" for="port-{{$index}}">Port</label>\n                <div class="col-sm-8">\n                  <input type="number" class="form-control" id="port-{{$index}}" name="port" required\n                         ng-model="connection.port" ng-change="saveConnections()">\n                </div>\n              </div>\n              <div class="form-group">\n                <label class="col-sm-3 control-label" for="path-{{$index}}">Path</label>\n                <div class="col-sm-8">\n                  <input type="text" class="form-control" id="path-{{$index}}" name="path"\n                         ng-model="connection.path" ng-change="saveConnections()">\n                </div>\n              </div>\n            </form>\n          </div>\n        </div>\n      </div>\n    </div>\n    <div class="col-md-5">\n      <div class="panel panel-default">\n        <div class="panel-heading">\n          <h3 class="panel-title">Instructions</h3>\n        </div>\n        <div class="panel-body">\n          <p>\n            This page allows you to connect to remote processes which <strong>already have a\n            <a href="http://jolokia.org/" target="_blank">jolokia agent</a> running inside them</strong>. You will need to\n            know the host name, port and path of the jolokia agent to be able to connect.\n          </p>\n          <p>\n            If the process you wish to connect to does not have a jolokia agent inside, please refer to the\n            <a href="http://jolokia.org/agent.html" target="_blank">jolokia documentation</a> for how to add a JVM, servlet\n            or OSGi based agent inside it.\n          </p>\n          <p>\n            If you are using <a href="http://fabric8.io/" target="_blank">Fabric8</a>,\n            <a href="http://www.jboss.org/products/fuse" target="_blank">JBoss Fuse</a>, or <a href="http://activemq.apache.org"\n              target="_blank">Apache ActiveMQ</a>; then a jolokia agent is included by default (use context path of jolokia\n            agent, usually\n            <code>jolokia</code>). Or you can always just deploy hawtio inside the process (which includes the jolokia agent,\n            use Jolokia servlet mapping inside hawtio context path, usually <code>hawtio/jolokia</code>).\n          </p>\n          <p ng-show="hasLocalMBean()">\n            Use the <strong><a href="#/jvm/local">Local Tab</a></strong> to connect to processes locally on this machine\n            (which will install a jolokia agent automatically if required).\n          </p>\n          <p ng-show="!hasLocalMBean()">\n            The <strong>Local Tab</strong> is not currently enabled because either the server side\n            <strong>hawtio-local-jvm-mbean plugin</strong> is not installed or this JVM cannot find the\n            <strong>com.sun.tools.attach.VirtualMachine</strong> API usually found in the <strong>tool.jar</strong>. Please\n            see the <a href="http://hawt.io/faq/index.html" target="_blank">FAQ entry</a> for more details.\n          </p>\n        </div>\n      </div>\n    </div>\n  </div>\n</div>\n');
$templateCache.put('plugins/jvm/html/discover.html','<div ng-controller="JVM.DiscoveryController">\n\n  <h1>Discover</h1>\n\n  <div class="row toolbar-pf">\n    <div class="col-sm-12">\n      <form class="toolbar-pf-actions">\n        <div class="form-group">\n          <input type="text" class="form-control" ng-model="filter" placeholder="Filter..." autocomplete="off">\n        </div>\n        <div class="form-group">\n          <button class="btn btn-default" ng-click="fetch()" title="Refresh"><i class="fa fa-refresh"></i> Refresh</button>\n        </div>\n      </form>\n    </div>\n  </div>\n\n  <div ng-if="discovering">\n    <div class="spinner spinner-lg loading-page"></div>\n    <div class="row">\n      <div class="col-sm-12">\n        <div class="loading-message">\n          Please wait, discovering agents ...\n        </div>\n      </div>\n    </div>\n  </div>\n\n  <div class="row main-content">\n    <div class="col-sm-12">\n      <div ng-show="!discovering">\n        <div class="loading-message" ng-show="agents.length === 0">\n          No agents discovered.\n        </div>\n        <div ng-show="agents.length > 0">\n          <ul class="discovery zebra-list">\n            <li ng-repeat="agent in agents track by $index" ng-show="filterMatches(agent)">\n\n              <div class="inline-block">\n                <img ng-src="{{getLogo(agent)}}">\n              </div>\n\n              <div class="inline-block">\n                <p ng-hide="!hasName(agent)">\n                <span class="strong"\n                      ng-show="agent.server_vendor">\n                  {{agent.server_vendor}} {{_.startCase(agent.server_product)}} {{agent.server_version}}\n                </span>\n                </p>\n              <span ng-class="getAgentIdClass(agent)">\n                <strong ng-show="hasName(agent)">Agent ID: </strong>{{agent.agent_id}}<br/>\n                <strong ng-show="hasName(agent)">Agent Version: </strong><span ng-hide="hasName(agent)"> Version: </span>{{agent.agent_version}}</span><br/>\n                <strong ng-show="hasName(agent)">Agent Description: </strong><span\n                  ng-hide="hasName(agent)"> Description: </span>{{agent.agent_description}}</span><br/>\n\n                <p ng-hide="!agent.url"><strong>Agent URL: </strong><a ng-href="{{agent.url}}"\n                                                                      target="_blank">{{agent.url}}</a>\n                </p>\n              </div>\n\n              <div class="inline-block lock" ng-show="agent.secured">\n                <i class="fa fa-lock" title="A valid username and password will be required to connect"></i>\n              </div>\n\n              <div class="inline-block" ng-hide="!agent.url">\n                <div class="connect-button"\n                    ng-click="gotoServer($event, agent)"\n                    hawtio-template-popover\n                    content="authPrompt"\n                    trigger="manual"\n                    placement="auto"\n                    data-title="Please enter your username and password">\n                  <i ng-show="agent.url" class="icon-play-circle"></i>\n                </div>\n              </div>\n\n            </li>\n          </ul>\n        </div>\n      </div>\n    </div>\n  </div>\n\n  <script type="text/ng-template" id="authPrompt">\n    <div class="auth-form">\n      <form name="authForm">\n        <input type="text"\n                class="input-sm"\n                placeholder="Username..."\n                ng-model="agent.username"\n                required>\n        <input type="password"\n                class="input-sm"\n                placeholder="Password..."\n                ng-model="agent.password"\n                required>\n        <button ng-disabled="!authForm.$valid"\n                ng-click="connectWithCredentials($event, agent)"\n                class="btn btn-success">\n          <i class="fa fa-share"></i> Connect\n        </button>\n        <button class="btn" ng-click="closePopover($event)"><i class="fa fa-remove"></i></button>\n      </form>\n    </div>\n  </script>\n\n</div>\n');
$templateCache.put('plugins/jvm/html/jolokiaError.html','<div class="modal-header">\n  <h3 class="modal-title">The connection to jolokia failed!</h3>\n</div>\n<div class="modal-body">\n  <div ng-show="responseText">\n    <p>The connection to jolokia has failed with the following error, also check the javascript console for more details.</p>\n    <div hawtio-editor="responseText" readonly="true"></div>\n  </div>\n  <div ng-hide="responseText">\n    <p>The connection to jolokia has failed for an unknown reason, check the javascript console for more details.</p>\n  </div>\n</div>\n<div class="modal-footer">\n  <button ng-show="ConnectOptions.returnTo" class="btn" ng-click="goBack()">Back</button>\n  <button class="btn btn-primary" ng-click="retry()">Retry</button>\n</div>\n');
$templateCache.put('plugins/jvm/html/jolokiaPreferences.html','<div ng-controller="JVM.JolokiaPreferences">\n  <div hawtio-form-2="config" entity="entity"></div>\n\n  <div class="control-group">\n    <div class="controls">\n      <button class="btn btn-primary" ng-click="reboot()">Apply</button>\n      <span class="help-block">Restart hawtio with the new values in effect</span>\n    </div>\n  </div>\n\n</div>\n');
$templateCache.put('plugins/jvm/html/layoutConnect.html','<ul class="nav nav-tabs connected" ng-controller="JVM.NavController">\n  <li ng-repeat="link in breadcrumbs" ng-show="isValid(link)" ng-class=\'{active : isActive(link.href)}\'>\n    <a ng-href="{{link.href}}{{hash}}" ng-bind-html="link.content"></a>\n  </li>\n</ul>\n<div class="row">\n  <div ng-view></div>\n</div>\n');
$templateCache.put('plugins/jvm/html/local.html','<div ng-controller="JVM.JVMsController">\n\n  <div class="row">\n    <div class="pull-right">\n      <button class="btn" ng-click="fetch()" title="Refresh"><i class="fa fa-refresh"></i></button>\n    </div>\n    <div class="pull-right">\n      <input class="search-query" type="text" ng-model="filter" placeholder="Filter...">\n    </div>\n  </div>\n\n  <div ng-hide="initDone">\n    <div class="alert alert-info">\n      <i class="fa fa-spinner icon-spin"></i> Please wait, discovering local JVM processes ...\n    </div>\n  </div>\n\n  <div ng-hide=\'data.length > 0\' class=\'row\'>\n    {{status}}\n  </div>\n\n  <div ng-show=\'data.length > 0\' class="row">\n    <table class=\'centered table table-bordered table-condensed table-striped\'>\n      <thead>\n      <tr>\n        <th style="width: 70px">PID</th>\n        <th>Name</th>\n        <th style="width: 300px">Agent URL</th>\n        <th style="width: 50px"></th>\n      </tr>\n      </thead>\n      <tbody>\n      <tr ng-repeat="jvm in data track by $index" ng-show="filterMatches(jvm)">\n        <td>{{jvm.id}}</td>\n        <td title="{{jvm.displayName}}">{{jvm.alias}}</td>\n        <td><a href=\'\' title="Connect to this agent"\n               ng-click="connectTo(jvm.url, jvm.scheme, jvm.hostname, jvm.port, jvm.path)">{{jvm.agentUrl}}</a></td>\n        <td>\n          <a class=\'btn control-button\' href="" title="Stop agent" ng-show="jvm.agentUrl"\n             ng-click="stopAgent(jvm.id)"><i class="fa fa-off"></i></a>\n          <a class=\'btn control-button\' href="" title="Start agent" ng-hide="jvm.agentUrl"\n             ng-click="startAgent(jvm.id)"><i class="icon-play-circle"></i></a>\n        </td>\n      </tr>\n\n      </tbody>\n    </table>\n\n  </div>\n\n\n</div>\n');
$templateCache.put('plugins/jvm/html/navbarHeaderExtension.html','<style>\n  .navbar-header-hawtio-jvm {\n    float: left;\n    margin: 0;\n  }\n\n  .navbar-header-hawtio-jvm h4 {\n    color: white;\n    margin: 0px;\n  }\n\n  .navbar-header-hawtio-jvm li {\n    list-style-type: none;\n    display: inline-block;\n    margin-right: 10px;\n    margin-top: 4px;\n  }\n</style>\n<ul class="navbar-header-hawtio-jvm" ng-controller="JVM.HeaderController">\n  <li ng-show="containerName"><h4 ng-bind="containerName"></h4></li>\n  <li ng-show="goBack"><strong><a href="" ng-click="goBack()">Back</a></strong></li>\n</ul>\n');
$templateCache.put('plugins/jvm/html/reset.html','<div ng-controller="JVM.ResetController">\n  <form class="form-horizontal">\n    <fieldset>\n      <div class="control-group">\n        <label class="control-label">\n          <strong>\n            <i class=\'yellow text-shadowed icon-warning-sign\'></i> Clear saved connections\n          </strong>\n        </label>\n        <div class="controls">\n          <button class="btn btn-danger" ng-click="doClearConnectSettings()">Clear saved connections</button>\n          <span class="help-block">Wipe all saved connection settings stored by {{branding.appName}} in your browser\'s local storage</span>\n        </div>\n      </div>\n    </fieldset>\n  </form>\n</div>\n\n');
$templateCache.put('plugins/threads/html/index.html','<h1>Threads</h1>\n\n<!--\n<div ng-controller="Threads.ToolbarController">\n\n  <div class="row row-monitor">\n    <div class="col-md-12">\n      <span ng-repeat="(name, value) in support track by $index" class="label" ng-class="{\'label-success\': value, \'label-default\': !value}"\n        ng-click="maybeToggleMonitor(name, value)">\n          {{getMonitorName(name)}}\n        </span>\n    </div>\n  </div>\n\n</div>\n-->\n\n<div id="threads-page" ng-controller="Threads.ThreadsController">\n\n  <!-- Toolbar -->\n  <div class="row toolbar-pf table-view-pf-toolbar">\n    <div class="col-sm-12">\n      <form class="toolbar-pf-actions search-pf">\n        <div class="form-group">\n          <label class="sr-only" for="state-filter">State</label>\n          <select pf-select id="state-filter" title="Filter by State..." ng-model="stateFilter"\n                  ng-options="state.name for state in availableStates track by state.id">\n          </select>\n        </div>\n        <div class="form-group has-clear">\n          <div class="search-pf-input-group">\n            <label for="filterByKeyword" class="sr-only">Filter by keyword</label>\n            <input id="filterByKeyword" type="search" ng-model="searchFilter" class="form-control"\n                   placeholder="Filter by keyword..." autocomplete="off">\n            <button type="button" class="clear" aria-hidden="true" ng-click="clearSearchFilter()">\n              <span class="pficon pficon-close"></span>\n            </button>\n          </div>\n        </div>\n      </form>\n      <div class="row toolbar-pf-results">\n        <div class="col-sm-12">\n          <h5>{{threads.length}} Results</h5>\n          <span ng-if="stateFilter">\n            <p>Active filters:</p>\n            <ul class="list-inline">\n              <li>\n                <span class="label label-info">\n                  State: {{stateFilter.name}}\n                  <a href="#" ng-click="clearStateFilter()"><span class="pficon pficon-close"></span></a>\n                </span>\n              </li>\n            </ul>\n            <p><a href="#" ng-click="clearAllFilters()">Clear All Filters</a></p>\n          </span>\n        </div>\n      </div>\n    </div>\n  </div>\n\n  <!-- Table -->\n  <div class="row">\n    <div class="col-md-12">\n      <table class="table table-striped table-bordered table-hover dataTable" hawtio-simple-table="threadGridOptions"></table>\n    </div>\n  </div>\n\n  <script type="text/ng-template" id="threadModalContent.html">\n    <div class="modal-header">\n      <button type="button" class="close" aria-label="Close" ng-click="$close()">\n        <span class="pficon pficon-close" aria-hidden="true"></span>\n      </button>\n      <div class="row">\n        <div class="col-md-4">\n          <h4 class="modal-title" id="myModalLabel">Thread</h4>\n        </div>\n        <div class="col-md-7">\n          <div class="pagination-container"\n               hawtio-pager="hawtioSimpleTable.threads.rows"\n               on-index-change="selectThreadByIndex"\n               row-index="selectedRowIndex">\n          </div>\n        </div>\n      </div>\n    </div>\n    <div class="modal-body">\n      <div class="row">\n        <div class="col-md-12">\n          <dl class="dl-horizontal">\n            <dt>ID</dt>\n            <dd>{{row.threadId}}</dd>\n            <dt>Name</dt>\n            <dd>{{row.threadName}}</dd>\n            <dt>Waited Count</dt>\n            <dd>{{row.waitedCount}}</dd>\n            <dt>Waited Time</dt>\n            <dd>{{row.waitedTime}} ms</dd>\n            <dt>Blocked Count</dt>\n            <dd>{{row.blockedCount}}</dd>\n            <dt>Blocked Time</dt>\n            <dd>{{row.blockedTime}} ms</dd>\n            <div ng-show="row.lockInfo != null">\n              <dt>Lock Name</dt>\n              <dd>{{row.lockName}}</dd>\n              <dt>Lock Class Name</dt>\n              <dd>{{row.lockInfo.className}}</dd>\n              <dt>Lock Identity Hash Code</dt>\n              <dd>{{row.lockInfo.identityHashCode}}</dd>\n            </div>\n            <div ng-show="row.lockOwnerId > 0">\n              <dt>Waiting for lock owned by</dt>\n              <dd><a href="" ng-click="selectThreadById(row.lockOwnerId)">{{row.lockOwnerId}} - {{row.lockOwnerName}}</a></dd>\n            </div>\n            <div ng-show="row.lockedSynchronizers.length > 0">\n              <dt>Locked Synchronizers</dt>\n              <dd>\n                <ol class="list-unstyled">\n                  <li ng-repeat="synchronizer in row.lockedSynchronizers">\n                    <span title="Class Name">{{synchronizer.className}}</span> -\n                    <span title="Identity Hash Code">{{synchronizer.identityHashCode}}</span>\n                  </li>\n                </ol>\n              </dd>\n            </div>\n          </dl>\n        </div>\n      </div>\n      <div class="row" ng-show="row.lockedMonitors.length > 0">\n        <div class="col-md-12">\n          <dl>\n            <dt>Locked Monitors</dt>\n            <dd>\n              <ol class="zebra-list">\n                <li ng-repeat="monitor in row.lockedMonitors">\n                  Frame: <strong>{{monitor.lockedStackDepth}}</strong>\n                  <span class="green">{{monitor.lockedStackFrame.className}}</span>\n                  <span class="bold">.</span>\n                  <span class="blue bold">{{monitor.lockedStackFrame.methodName}}</span>\n                  &nbsp;({{monitor.lockedStackFrame.fileName}}<span ng-show="frame.lineNumber > 0">:{{monitor.lockedStackFrame.lineNumber}}</span>)\n                  <span class="orange" ng-show="monitor.lockedStackFrame.nativeMethod">(Native)</span>\n                </li>\n              </ol>\n            </dd>\n          </dl>\n        </div>\n      </div>\n      <div class="row">\n        <div class="col-md-12">\n          <dl>\n            <dt>Stack Trace</dt>\n            <dd>\n              <ol class="zebra-list">\n                <li ng-repeat="frame in row.stackTrace">\n                  <span class="green">{{frame.className}}</span>\n                  <span class="bold">.</span>\n                  <span class="blue bold">{{frame.methodName}}</span>\n                  &nbsp;({{frame.fileName}}<span ng-show="frame.lineNumber > 0">:{{frame.lineNumber}}</span>)\n                  <span class="orange" ng-show="frame.nativeMethod">(Native)</span>\n                </li>\n              </ol>\n            </dd>\n          </dl>            \n        </div>\n      </div>\n    </div>\n  </script>\n\n</div>');
$templateCache.put('plugins/jmx/html/areaChart.html','<div ng-controller="Jmx.AreaChartController">\n  <script type="text/ng-template" id="areaChart">\n    <fs-area bind="data" duration="250" interpolate="false" point-radius="5" width="width" height="height" label=""></fs-area>\n  </script>\n  <div compile="template"></div>\n</div>\n');
$templateCache.put('plugins/jmx/html/attributeToolBar.html','<div class="row toolbar-pf table-view-pf-toolbar">\n  <div class="col-sm-12">\n    <form class="toolbar-pf-actions search-pf">\n      <div class="form-group toolbar-pf-filter has-clear">\n        <div class="search-pf-input-group">\n          <label for="jmx-attributes-search" class="sr-only">Filter</label>\n          <input id="jmx-attributes-search" type="search" class="form-control" ng-model="gridOptions.filterOptions.filterText"\n                placeholder="Filter by keyword...">\n          <button type="button" class="clear" aria-hidden="true" ng-click="gridOptions.filterOptions.filterText = \'\'">\n            <span class="pficon pficon-close"></span>\n          </button>\n        </div>\n      </div>\n    </form>\n  </div>\n</div>\n');
$templateCache.put('plugins/jmx/html/attributes.html','<script type="text/ng-template" id="gridTemplate">\n  <table class="table table-striped table-bordered table-hover jmx-attributes-table" hawtio-simple-table="gridOptions"></table>\n</script>\n\n<div class="table-view" ng-controller="Jmx.AttributesController">\n  \n  <h2>Attributes</h2>\n  <h3>{{title}}</h3>\n  \n  <div ng-if="gridData.length > 0">\n    <div ng-include src="toolBarTemplate()"></div>\n    <div compile="attributes"></div>\n  </div>\n\n  <!-- modal dialog to show/edit the attribute -->\n  <div hawtio-confirm-dialog="showAttributeDialog" ok-button-text="Update"\n       show-ok-button="{{entity.rw ? \'true\' : \'false\'}}" on-ok="onUpdateAttribute()" on-cancel="onCancelAttribute()"\n       cancel-button-text="Close" title="Attribute: {{entity.key}}" optional-size="lg">\n    <div class="dialog-body">\n      <!-- have a form for view and another for edit -->\n      <div simple-form ng-hide="!entity.rw" name="attributeEditor" mode="edit" entity=\'entity\' data=\'attributeSchemaEdit\'></div>\n      <div simple-form ng-hide="entity.rw" name="attributeViewer" mode="view" entity=\'entity\' data=\'attributeSchemaView\'></div>\n    </div>\n  </div>\n\n</div>');
$templateCache.put('plugins/jmx/html/chartEdit.html','<div ng-controller="Jmx.ChartEditController">\n  <form>\n    <fieldset>\n      <div class="control-group" ng-show="canEditChart()">\n        <input type="submit" class="btn" value="View Chart" ng-click="viewChart()"\n               ng-disabled="!selectedAttributes.length && !selectedMBeans.length"/>\n      </div>\n      <div class="control-group">\n        <table class="table">\n          <thead>\n          <tr>\n            <th ng-show="showAttributes()">Attributes</th>\n            <th ng-show="showElements()">Elements</th>\n          </tr>\n          </thead>\n          <tbody>\n          <tr>\n            <td ng-show="showAttributes()">\n              <select id="attributes" size="20" multiple ng-multiple="true" ng-model="selectedAttributes"\n                      ng-options="name | humanize for (name, value) in metrics"></select>\n            </td>\n            <td ng-show="showElements()">\n              <select id="mbeans" size="20" multiple ng-multiple="true" ng-model="selectedMBeans"\n                      ng-options="name for (name, value) in mbeans"></select>\n            </td>\n          </tr>\n          </tbody>\n        </table>\n\n        <div class="alert" ng-show="!canEditChart()">\n          <button type="button" class="close" data-dismiss="alert">\xD7</button>\n          <strong>No numeric metrics available!</strong> Try select another item to chart on.\n        </div>\n      </div>\n    </fieldset>\n  </form>\n</div>\n');
$templateCache.put('plugins/jmx/html/charts.html','<div ng-controller="Jmx.ChartController">\n  <h2>Chart</h2>\n  <h3>{{title}}</h3>\n  <div ng-switch="errorMessage()">\n    <div ng-switch-when="metrics">No valid metrics to show for this mbean.</div>\n    <div ng-switch-when="updateRate">Charts aren\'t available when the update rate is set to "No refreshes", go to the <a ng-href="#/preferences{{hash}}">Preferences</a> panel and set a refresh rate to enable charts</div>\n    <div id="charts"></div>\n  </div>\n</div>\n');
$templateCache.put('plugins/jmx/html/donutChart.html','<div ng-controller="Jmx.DonutChartController">\n  <script type="text/ng-template" id="donut">\n    <fs-donut bind="data" outer-radius="200" inner-radius="75"></fs-donut>\n  </script>\n  <div compile="template"></div>\n</div>\n');
$templateCache.put('plugins/jmx/html/layoutTree.html','<div class="tree-nav-layout">\n\n  <div class="sidebar-pf sidebar-pf-left" resizable r-directions="[\'right\']">\n    <div class="tree-nav-sidebar-header" ng-controller="Jmx.TreeHeaderController">\n      <div class="pull-right">\n        <i class="fa fa-plus-square-o" title="Expand All" ng-click="expandAll()"></i>\n        <i class="fa fa-minus-square-o" title="Collapse All" ng-click="contractAll()"></i>\n      </div>\n    </div>\n    <div id="jmxtree" class="tree-nav-sidebar-content" ng-controller="Jmx.MBeansController"></div>\n  </div>\n\n  <div class="tree-nav-main">\n    <ul class="nav nav-tabs" ng-controller="Jmx.TabController">\n      <li ng-class="{active: isTabActive(\'/jmx/attributes\')}">\n        <a href="#" ng-click="goto(\'/jmx/attributes\')">Attributes</a>\n      </li>\n      <li ng-class="{active: isTabActive(\'/jmx/operations\')}">\n        <a href="#" ng-click="goto(\'/jmx/operations\')">Operations</a>\n      </li>\n      <li ng-class="{active: isTabActive(\'/jmx/charts\')}">\n        <a href="#" ng-click="goto(\'/jmx/charts\')">Chart</a>\n      </li>\n    </ul>\n    <div class="contents" ng-view></div>\n  </div>\n</div>\n');
$templateCache.put('plugins/jmx/html/operations.html','<script type="text/ng-template" id="operationTemplate">\n  <div class="jmx-operation-wrapper" ng-controller="Jmx.OperationController">\n    <h3 ng-bind="item.name"></h3>\n    <div>\n      <p ng-hide="item.args.length">\n        This JMX operation requires no arguments. Click the \'Execute\' button to invoke the operation.\n      </p>\n      <p ng-show="item.args.length">\n        This JMX operation requires some parameters. Fill in the fields below as necessary and click the \'Execute\'\n        button to invoke the operation.\n      </p>\n      <div simple-form data="formConfig" entity="entity" name="entryForm"></div>\n      <form class="form-horizontal" ng-submit="onSubmit()">\n        <div class="form-group">\n          <div ng-class="{\'col-sm-offset-2 col-sm-10\': item.args.length, \'col-sm-12\': !item.args.length}">\n            <button type="submit" class="btn btn-primary">Execute</button>\n            <button type="button" class="btn btn-default" ng-click="reset()" ng-show="item.args.length">Reset</button>\n            <button type="button" class="btn btn-default" ng-click="close()">Close</button>\n          </div>\n        </div>\n      </form>\n      <div hawtio-editor="operationResult" mode="mode" read-only="true" ng-show="operationResult !== \'\'"></div>\n    </div>\n    <form class="jolokia-form">\n      <div class="form-group">\n        <label for="jolokia-url-field">Jolokia REST URL</label>\n        <div class="input-group">\n          <input type="text" id="jolokia-url-field" class="form-control" value="{{jolokiaUrl}}" readonly>\n          <div class="input-group-addon input-group-button">\n            <button class="btn btn-sm btn-default btn-clipboard" data-clipboard-target="#jolokia-url-field"\n                    title="Copy to clipboard" aria-label="Copy to clipboard">\n              <i class="fa fa-clipboard" aria-hidden="true"></i>\n            </button>\n          </div>\n        </div>\n      </div>\n    </form>\n  </div>\n</script>\n\n<div ng-controller="Jmx.OperationsController">\n  \n  <h2>Operations</h2>\n  <h3>{{title}}</h3>\n  \n  <div ng-show="fetched">\n    \n    <p ng-hide="isOperationsEmpty() || showInvoke">\n      This MBean supports the following JMX operations.  Click an item in the list to invoke that operation.\n    </p>\n    <p ng-show="isOperationsEmpty()">This MBean has no JMX operations.</p>\n    \n    <div class="row toolbar-pf" ng-hide="isOperationsEmpty() || showInvoke">\n      <div class="col-md-12">\n        <form class="toolbar-pf-actions search-pf">\n          <div class="form-group has-clear">\n            <div class="search-pf-input-group">\n              <label for="search1" class="sr-only">Filter</label>\n              <input id="search1" type="search" class="form-control" ng-model="methodFilter"\n                    placeholder="Search">\n              <button type="button" class="clear" aria-hidden="true" ng-click="methodFilter = \'\'">\n                <span class="pficon pficon-close"></span>\n              </button>\n            </div>\n          </div>\n        </form>\n      </div>\n    </div>    \n    \n    <div ng-show="showInvoke">\n      <div compile="template"></div>\n    </div>\n\n    <ul class="list-group" ng-hide="showInvoke || isOperationsEmpty()">\n      <li class="list-group-item" ng-repeat="operation in operations track by operation.name"\n          ng-show="doFilter(operation)">\n        <a href="" ng-click="invokeOp(operation)" ng-show="canInvoke(operation)">{{operation.displayName}}</a>\n        <span ng-show="!canInvoke(operation)">{{operation.displayName}}</span>\n        <button class="btn btn-sm btn-default btn-clipboard pull-right" data-clipboard-text="{{operation.name}}"\n                title="Copy to clipboard" aria-label="Copy to clipboard">\n          <i class="fa fa-clipboard" aria-hidden="true"></i>\n        </button>\n      </li>\n    </ul>\n  </div>\n</div>\n');}]); hawtioPluginLoader.addModule("hawtio-jmx-templates");