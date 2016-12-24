/// <reference path="../../includes.ts"/>
/// <reference path="jvmGlobals.ts"/>

/**
 * @module JVM
 */
module JVM {

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
    recent = _.take(_.uniq(recent.push(name)), 5);
    localStorage['recentConnections'] = angular.toJson(recent);
  }

  export function removeRecentConnection(localStorage, name) {
    var recent = getRecentConnections(localStorage);
    recent = _.without(recent, name);
    localStorage['recentConnections'] = angular.toJson(recent);
  }

  export function clearConnections() {
    localStorage['recentConnections'] = '[]';
  }

  export function isRemoteConnection() {
    return ('con' in new URI().query(true));
  }

  export function connectToServer(localStorage, options:Core.ConnectToServerOptions) {
    log.debug("Connecting with options: ", StringHelpers.toString(options));
    var clone = angular.extend({}, options);
    addRecentConnection(localStorage, clone.name);
    if (!('userName' in clone)) {
      var userDetails = <Core.UserDetails> HawtioCore.injector.get('userDetails');
      clone.userName = userDetails.username;
      clone.password = userDetails.password;
    }
    var $window:ng.IWindowService = HawtioCore.injector.get<ng.IWindowService>('$window');
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


  /**
   * Loads all of the available connections from local storage
   * @returns {Core.ConnectionMap}
   */
  export function loadConnections(): Core.ConnectOptions[] {
    var localStorage = Core.getLocalStorage();
    try {
      var connections = <Core.ConnectOptions[]> angular.fromJson(localStorage[Core.connectionSettingsKey]);
      if (!connections) {
        // nothing found on local storage
        return <Core.ConnectOptions[]> [];
      } else if (!_.isArray(connections)) {
        // found the legacy connections map
        delete localStorage[Core.connectionSettingsKey];
        return <Core.ConnectOptions[]> [];
      } else {
        // found a valid connections array
        return connections;
      }
    } catch (e) {
      // corrupt config
      delete localStorage[Core.connectionSettingsKey];
      return <Core.ConnectOptions[]> [];
    }
  }

  /**
   * Saves the connection map to local storage
   * @param map
   */
  export function saveConnections(connections: Core.ConnectOptions[]) {
    Logger.get("Core").debug("Saving connection array: ", StringHelpers.toString(connections));
    localStorage[Core.connectionSettingsKey] = angular.toJson(connections);
  }

  export function getConnectionNameParameter() {
    return new URI().search(true)['con'];
}

  /**
   * Returns the connection options for the given connection name from localStorage
   */
  export function getConnectOptions(name:string, localStorage = Core.getLocalStorage()): ConnectOptions {
    if (!name) {
      return null;
    }
    let connections = loadConnections();
    return _.find(connections, connection => connection.name === name);
  }

  /**
   * Creates the Jolokia URL string for the given connection options
   */
  export function createServerConnectionUrl(options:Core.ConnectOptions) {
    Logger.get("Core").debug("Connect to server, options: ", StringHelpers.toString(options));
    var answer:string = null;
    if (options.jolokiaUrl) {
      answer = <string>options.jolokiaUrl;
    }
    if (answer === null) {
      var uri = new URI();
      uri.protocol(<string> options.scheme || 'http')
         .host(<string> options.host || 'localhost')
         .port(<string> (options.port || '80'))
         .path(<string> options.path);

      answer = UrlHelpers.join('proxy', uri.protocol(), uri.hostname(), uri.port(), uri.path());
    }
    Logger.get(JVM.pluginName).debug("Using URL: ", answer);
    return answer;
  }


}
