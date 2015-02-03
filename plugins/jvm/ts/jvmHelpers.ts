/**
 * @module JVM
 */
/// <reference path="../../includes.ts"/>
/// <reference path="../../jmx/ts/workspace.ts"/>
module JVM {

  export var log:Logging.Logger = Logger.get("JVM");

  export var connectControllerKey = "jvmConnectSettings";
  export var connectionSettingsKey = Core.connectionSettingsKey;

  export var logoPath = 'img/icons/jvm/';

  export var logoRegistry = {
    'jetty': logoPath + 'jetty-logo-80x22.png',
    'tomcat': logoPath + 'tomcat-logo.gif',
    'generic': logoPath + 'java-logo.svg'
  };

  /**
   * Adds common properties and functions to the scope
   * @method configureScope
   * @for Jvm
   * @param {*} $scope
   * @param {ng.ILocationService} $location
   * @param {Core.Workspace} workspace
   */
  export function configureScope($scope, $location, workspace) {

    $scope.isActive = (href) => {
      var tidy = Core.trimLeading(href, "#");
      var loc = $location.path();
      return loc === tidy;
    };

    $scope.isValid = (link) => {
      return link && link.isValid(workspace);
    };

    $scope.hasLocalMBean = () => {
      return JVM.hasLocalMBean(workspace);
    };

  }

  export function hasLocalMBean(workspace) {
    return workspace.treeContainsDomainAndProperties('hawtio', {type: 'JVMList'});
  }

  export function hasDiscoveryMBean(workspace) {
    return workspace.treeContainsDomainAndProperties('jolokia', {type: 'Discovery'});
  }

}

module Core {

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
  export function createJolokia(url: string, username: string, password: string) {
    var jolokiaParams:Jolokia.IParams = {
      url: url,
      username: username,
      password: password,
      canonicalNaming: false, ignoreErrors: true, mimeType: 'application/json'
    };
    return new Jolokia(jolokiaParams);
  }

  export function getRecentConnections(localStorage) {
    if (Core.isBlank(localStorage['recentConnections'])) {
      Core.clearConnections();
    }
    return angular.fromJson(localStorage['recentConnections']);
  }

  export function addRecentConnection(localStorage, name) {
    var recent = getRecentConnections(localStorage);
    recent = recent.add(name).unique().first(5);
    localStorage['recentConnections'] = angular.toJson(recent);
  }

  export function removeRecentConnection(localStorage, name) {
    var recent = getRecentConnections(localStorage);
    recent = recent.exclude((n) => { return n === name; });
    localStorage['recentConnections'] = angular.toJson(recent);
  }

  export function clearConnections() {
    localStorage['recentConnections'] = '[]';
  }

  export function saveConnection(options: Core.ConnectOptions) {
    var connectionMap = Core.loadConnectionMap();
    // use a copy so we can leave the original one alone
    var clone = angular.extend({}, options);
    delete clone.userName;
    delete clone.password;
    connectionMap[<string>options.name] = clone;
    Core.saveConnectionMap(connectionMap);
  }

  export function connectToServer(localStorage, options:Core.ConnectToServerOptions) {
    log.debug("Connecting with options: ", StringHelpers.toString(options));
    addRecentConnection(localStorage, options.name);
    if (!('userName' in options)) {
      var userDetails = <Core.UserDetails> HawtioCore.injector.get('userDetails');
      options.userName = userDetails.username;
      options.password = userDetails.password;
    }
    saveConnection(options);
    var $window:ng.IWindowService = HawtioCore.injector.get('$window');
    var url = (options.view || '#/welcome') + '?con=' + options.name;
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


  /**
   * Loads all of the available connections from local storage
   * @returns {Core.ConnectionMap}
   */
  export function loadConnectionMap():Core.ConnectionMap {
    var localStorage = Core.getLocalStorage();
    try {
      var answer = <Core.ConnectionMap> angular.fromJson(localStorage[Core.connectionSettingsKey]);
      if (!answer) {
        return <Core.ConnectionMap> {};
      } else {
        return answer;
      }
    } catch (e) {
      // corrupt config
      delete localStorage[Core.connectionSettingsKey];
      return <Core.ConnectionMap> {};
    }
  }

  /**
   * Saves the connection map to local storage
   * @param map
   */
  export function saveConnectionMap(map:Core.ConnectionMap) {
    Logger.get("Core").debug("Saving connection map: ", StringHelpers.toString(map));
    localStorage[Core.connectionSettingsKey] = angular.toJson(map);
  }

  /**
   * Returns the connection options for the given connection name from localStorage
   */
  export function getConnectOptions(name:string, localStorage = Core.getLocalStorage()): ConnectOptions {
    if (!name) {
      return null;
    }
    return Core.loadConnectionMap()[name];
  }

  /**
   * Creates the Jolokia URL string for the given connection options
   */
  export function createServerConnectionUrl(options:Core.ConnectOptions) {
    Logger.get("Core").debug("Connect to server, options: ", StringHelpers.toString(options));
    var answer:String = null;
    if (options.jolokiaUrl) {
      answer = options.jolokiaUrl;
    }
    if (answer === null) {
      answer = options.scheme || 'http';
      answer += '://' + (options.host || 'localhost');
      if (options.port) {
        answer += ':' + options.port;
      }
      if (options.path) {
        answer = UrlHelpers.join(<string>answer, <string>options.path);
      }
    }
    if (options.useProxy) {
      answer = UrlHelpers.join('proxy', <string>answer);
    }
    Logger.get("Core").debug("Using URL: ", answer);
    return answer;
  }

  /**
   * Returns Jolokia URL by checking its availability if not in local mode
   *
   * @returns {*}
   */
  export function getJolokiaUrl():String {
    // TODO
    return '/jolokia';
/*
    var query = UrlHelpers.parseQueryString();
    var localMode = query['localMode'];
    if (localMode) {
      Logger.get("Core").debug("local mode so not using jolokia URL");
      jolokiaUrls = <string[]>[];
      return null;
    }
    var uri:String = null;
    var connectionName = Core.getConnectionNameParameter(query);
    if (connectionName) {
      var connectOptions = Core.getConnectOptions(connectionName);
      if (connectOptions) {
        uri = createServerConnectionUrl(connectOptions);
        Logger.get("Core").debug("Using jolokia URI: ", uri, " from local storage");
      } else {
        Logger.get("Core").debug("Connection parameter found but no stored connections under name: ", connectionName);
      }
    }
    if (!uri) {
      var fakeCredentials = {
        username: 'public',
        password: 'biscuit'
      };
      var localStorage = getLocalStorage();
      if ('userDetails' in window) {
        fakeCredentials = window['userDetails'];
      } else if ('userDetails' in localStorage) {
        // user checked 'rememberMe'
        fakeCredentials = angular.fromJson(localStorage['userDetails']);
      }
      uri = <String> jolokiaUrls.find((url:String):boolean => {
        var jqxhr = (<JQueryStatic>$).ajax(<string>url, {
          async: false,
          username: fakeCredentials.username,
          password: fakeCredentials.password
        });
        return jqxhr.status === 200 || jqxhr.status === 401 || jqxhr.status === 403;
      });
      Logger.get("Core").debug("Using jolokia URI: ", uri, " via discovery");
    }
    return uri;
    */
  }

}
