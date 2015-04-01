/**
 * @module JVM
 */
/// <reference path="../../includes.ts"/>
/// <reference path="jvmPlugin.ts"/>
module JVM {

  var urlCandidates = ['/hawtio/jolokia', '/jolokia', 'jolokia'];
  var discoveredUrl = null;

  hawtioPluginLoader.registerPreBootstrapTask((next) => {
    var uri = new URI();
    var connectionName = uri.query(true)['con'];
    if (connectionName) {
      log.debug("Not discovering jolokia");
      // a connection name is set, no need to discover a jolokia instance
      next();
      return;
    }
    function maybeCheckNext(candidates) {
      if (candidates.length === 0) {
        next();
      } else {
        checkNext(candidates.pop());
      }
    }
    function checkNext(url) {
      log.debug("trying URL: ", url);
      $.ajax(url).always((data, statusText, jqXHR) => {
        if (jqXHR.status === 200) {
          try {
            var resp = angular.fromJson(data);
            log.debug("Got response: ", resp);
            if ('value' in resp && 'agent' in resp.value) {
              discoveredUrl = url;
              log.debug("Using URL: ", url);
              next();
            } else {
              maybeCheckNext(urlCandidates);
            }
          } catch (e) {
            maybeCheckNext(urlCandidates);
          }
        } else if (jqXHR.status === 401 || jqXHR.status === 403) {
          // I guess this could be it...
          discoveredUrl = url;
          log.debug("Using URL: ", url);
          next();
        } else {
          maybeCheckNext(urlCandidates);
        }
      });
    }
    checkNext(urlCandidates.pop());
  });

  export interface DummyJolokia extends Jolokia.IJolokia {
    isDummy: boolean;
    running:boolean;
  }

  _module.service('ConnectionName', ['$location', ($location:ng.ILocationService) => {
    var answer:string = null;
    return (reset = false):string => {
      if (!Core.isBlank(answer) && !reset) {
        return answer;
      } 
      answer = '';
      var search = $location.search();
      if ('con' in window) {
        answer = <string> window['con'];
        log.debug("Using connection name from window: ", answer);
      }
      if ('con' in search) {
        answer = search['con'];
        log.debug("Using connection name from URL: ", answer);
      }
      if (Core.isBlank(answer)) {
        log.debug("No connection name found, using direct connection to JVM");
      }
      return answer;
    }
  }]);

  _module.service('ConnectOptions', ['ConnectionName', (ConnectionName) => {
    if (!Core.isBlank(ConnectionName())) {
      var answer = Core.getConnectOptions(ConnectionName());
      // search for passed credentials when connecting to remote server
      try {
        if (window.opener && "passUserDetails" in window.opener) {
          answer.userName = window.opener["passUserDetails"].username;
          answer.password = window.opener["passUserDetails"].password;
        }
      } catch (securityException) {
        // ignore
      }
      return answer;
    }
    return null;
  }]);

  // the jolokia URL we're connected to, could probably be a constant
  _module.factory('jolokiaUrl', ['ConnectOptions', (ConnectOptions) => {
    if (!ConnectOptions || !ConnectOptions.name) {
      return discoveredUrl;
    }
    return Core.createServerConnectionUrl(ConnectOptions);
  }]);

  // holds the status returned from the last jolokia call (?)
  _module.factory('jolokiaStatus', () => {
    return {
      xhr: null
    };
  });

  export var DEFAULT_MAX_DEPTH = 7;
  export var DEFAULT_MAX_COLLECTION_SIZE = 500;

  _module.factory('jolokiaParams', ["jolokiaUrl", "localStorage", (jolokiaUrl, localStorage) => {
    var answer = {
      canonicalNaming: false,
      ignoreErrors: true,
      mimeType: 'application/json',
      maxDepth: DEFAULT_MAX_DEPTH,
      maxCollectionSize: DEFAULT_MAX_COLLECTION_SIZE
    };
    if ('jolokiaParams' in localStorage) {
      answer = angular.fromJson(localStorage['jolokiaParams']);
    } else {
      localStorage['jolokiaParams'] = angular.toJson(answer);
    }
    answer['url'] = jolokiaUrl;
    return answer;
  }]);

  _module.factory('jolokia',["$location", "localStorage", "jolokiaStatus", "$rootScope", "userDetails", "jolokiaParams", "jolokiaUrl", "ConnectionName", "ConnectOptions", "HawtioDashboard", ($location:ng.ILocationService, localStorage, jolokiaStatus, $rootScope, userDetails:Core.UserDetails, jolokiaParams, jolokiaUrl, connectionName, connectionOptions, dash):Jolokia.IJolokia => {

    if (dash.inDashboard && windowJolokia) {
      return windowJolokia;
    }

    if (jolokiaUrl) {
      // pass basic auth credentials down to jolokia if set
      var username:String = null;
      var password:String = null;

      if (connectionOptions && connectionOptions.userName && connectionOptions.password) {
        username = connectionOptions.userName;
        password = connectionOptions.password;
      } else if (angular.isDefined(userDetails) &&
          angular.isDefined(userDetails.username) &&
          angular.isDefined(userDetails.password)) {
        username = userDetails.username;
        password = userDetails.password;
      } else {
        // lets see if they are passed in via request parameter...
        var search = $location.search();
        username = search["_user"];
        password = search["_pwd"];
        if (angular.isArray(username)) username = username[0];
        if (angular.isArray(password)) password = password[0];
      }

      if (username && password) {
        userDetails.username = username;
        userDetails.password = password;

        $.ajaxSetup({
          beforeSend: (xhr) => {
            xhr.setRequestHeader('Authorization', Core.getBasicAuthHeader(<string>username, <string>password));
          }
        });

        /*
        var loginUrl = jolokiaUrl.replace("jolokia", "auth/login/");
        $.ajax(loginUrl, {
          type: "POST",
          success: (response) => {
            if (response['credentials'] || response['principals']) {
              userDetails.loginDetails = {
                'credentials': response['credentials'],
                'principals': response['principals']
              };
            } else {
              var doc = Core.pathGet(response, ['children', 0, 'innerHTML']);
                // hmm, maybe we got an XML document, let's log it just in case...
                if (doc) {
                  Core.log.debug("Response is a document (ignoring this): ", doc);
                }
            }
            Core.executePostLoginTasks();
          },
          error: (xhr, textStatus, error) => {
            // silently ignore, we could be using the proxy
            Core.executePostLoginTasks();
          }
        });
        */
      }
      jolokiaParams['ajaxError'] = (xhr, textStatus, error) => {
        if (xhr.status === 401 || xhr.status === 403) {
          userDetails.username = null;
          userDetails.password = null;
          delete userDetails.loginDetails;
          delete window.opener["passUserDetails"];
        } else {
          jolokiaStatus.xhr = xhr;
          if (!xhr.responseText && error) {
            xhr.responseText = error.stack;
          }
        }
        Core.$apply($rootScope);
      };

      var jolokia = new Jolokia(jolokiaParams);
      jolokia.stop();
      localStorage['url'] = jolokiaUrl;
      if ('updateRate' in localStorage) {
        if (localStorage['updateRate'] > 0) {
          jolokia.start(localStorage['updateRate']);
        }
      }
      windowJolokia = jolokia;
      return jolokia;
    } else {
      var answer = <DummyJolokia> {
        isDummy: true,
        running: false,
        request: (req:any, opts?:Jolokia.IParams) => null,
        register: (req:any, opts?:Jolokia.IParams) => <number>null,
        list: (path, opts?) => null,
        search: (mBeanPatter, opts?) => null,
        getAttribute: (mbean, attribute, path?, opts?) => null,
        setAttribute: (mbean, attribute, value, path?, opts?) => {},
        version: (opts?) => <Jolokia.IVersion>null,
        execute: (mbean, operation, ...args) => null,
        start: (period) => {
          answer.running = true;
        },
        stop: () => {
          answer.running = false;
        },
        isRunning: () => answer.running,
        jobs: () => []

      };
      windowJolokia = answer;
      // empty jolokia that returns nothing
      return answer;          
    }
  }]);

}
