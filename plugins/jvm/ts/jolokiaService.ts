/// <reference path="jvmPlugin.ts"/>

namespace JVM {

  var urlCandidates = ['/hawtio/jolokia', '/jolokia', 'jolokia'];
  var discoveredUrl = null;

  export var skipJolokia = false;

  hawtioPluginLoader.registerPreBootstrapTask({
    name: 'JvmParseLocation',
    task: (next) => {
      if (skipJolokia) {
        next();
        return;
      }
      var uri = new URI();
      var query = uri.query(true);
      log.debug("query: ", query);

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
          name      : name,
          scheme    : jolokiaURI.protocol(),
          host      : jolokiaURI.hostname(),
          port      : Core.parseIntValue(jolokiaURI.port()),
          path      : Core.trimLeading(jolokiaURI.pathname(), '/')
        });
        if (!Core.isBlank(token)) {
          options['token'] = token;
        }
        _.merge(options, jolokiaURI.query(true));
        _.assign(options, query);
        log.debug("options: ", options);
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
                log.debug("Found jolokia agent at: ", url, " version: ", resp.value.agent);
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
            log.debug("Using URL: ", url, " assuming it could be an agent but got return code: ", jqXHR.status);
            next();
          } else {
            maybeCheckNext(urlCandidates);
          }
        });
      }
      checkNext(urlCandidates.pop());
    }
  });


  export var ConnectionName:string = null;

  export function getConnectionName(reset = false) {
    if (!Core.isBlank(ConnectionName) && !reset) {
      return ConnectionName;
    }
    ConnectionName = '';
    var search = <any>new URI().search(true);
    if ('con' in window) {
      ConnectionName = <string> window['con'];
      log.debug("Using connection name from window: ", ConnectionName);
    } else if ('con' in search) {
      ConnectionName = search['con'];
      log.debug("Using connection name from URL: ", ConnectionName);
    } else {
      log.debug("No connection name found, using direct connection to JVM");
    }
    return ConnectionName;
  }

  export function getConnectionOptions():any {
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
    } catch (securityException) {
      // ignore
    }
    return answer;
  }

  export function getJolokiaUrl() {
    if (skipJolokia) {
      return false;
    }
    var answer = undefined;
    var ConnectOptions = getConnectionOptions();
    var documentBase = HawtioCore.documentBase();
    if (!ConnectOptions || !ConnectOptions.name) {
      log.debug("Using discovered URL");
      answer = discoveredUrl;
    } else {
      answer = Core.createServerConnectionUrl(ConnectOptions);
      log.debug("Using configured URL");
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
    } else {
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
    log.debug("Complete jolokia URL: ", answer);
    return answer;
  }

  export interface DummyJolokia extends Jolokia.IJolokia {
    isDummy: boolean;
    running:boolean;
  }

  _module.service('ConnectionName', [() => {
    return (reset = false) => {
      return getConnectionName(reset);
    };
  }]);

  _module.service('ConnectOptions', [():any => {
    return getConnectionOptions();
  }]);

  // the jolokia URL we're connected to
  _module.factory('jolokiaUrl', [() => {
    return getJolokiaUrl();
  }]);

  // holds the status returned from the last jolokia call (?)
  _module.factory('jolokiaStatus', () => {
    return {
      xhr: null
    };
  });

  export var DEFAULT_MAX_DEPTH = 7;
  export var DEFAULT_MAX_COLLECTION_SIZE = 500;

  _module.factory('jolokiaParams', ["jolokiaUrl", "localStorage", (
      jolokiaUrl: string,
      localStorage: WindowLocalStorage) => {
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

  export function getBeforeSend() {
    // Just set Authorization for now...
    var headers = ['Authorization'];
    var connectionOptions = getConnectionOptions();
    if (connectionOptions.token) {
      log.debug("Setting authorization header to token");
      return (xhr) => {
        headers.forEach((header) => {
          xhr.setRequestHeader(header, 'Bearer ' + connectionOptions.token);
        });
      };
    } else if (connectionOptions.username && connectionOptions.password) {
        log.debug("Setting authorization header to username/password");
        return (xhr) => {
          headers.forEach((header) => {
            xhr.setRequestHeader(header, Core.getBasicAuthHeader(<string>connectionOptions.username, <string>connectionOptions.password));
          });
        };
    } else {
        log.debug("Not setting any authorization header");
        return (xhr) => {

        };
    }
  }

  _module.factory('jolokia',["$location", "localStorage", "jolokiaStatus", "$rootScope", "userDetails", "jolokiaParams", "jolokiaUrl", "ConnectOptions", "HawtioDashboard", "$uibModal", (
      $location: ng.ILocationService,
      localStorage: WindowLocalStorage,
      jolokiaStatus,
      $rootScope,
      userDetails: Core.UserDetails,
      jolokiaParams,
      jolokiaUrl: string,
      connectionOptions,
      dash,
      $uibModal): Jolokia.IJolokia => {

    if (dash.inDashboard && windowJolokia) {
      return windowJolokia;
    }

    if (jolokiaUrl) {
      // pass basic auth credentials down to jolokia if set
      var username: String = null;
      var password: String = null;

      if (connectionOptions.userName && connectionOptions.password) {
        username = connectionOptions.userName;
        password = connectionOptions.password;
        userDetails.username = username;
        userDetails.password = password;
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

      $.ajaxSetup({
        beforeSend: getBeforeSend()
      });

      var modal = null;
      jolokiaParams['ajaxError'] = jolokiaParams['ajaxError'] ? jolokiaParams['ajaxError'] : (xhr, textStatus, error) => {
        if (xhr.status === 401 || xhr.status === 403) {
          userDetails.username = null;
          userDetails.password = null;
          delete userDetails.loginDetails;
          if (window.opener && "passUserDetails" in window.opener) {
            delete window.opener["passUserDetails"];
          }
        } else {
          jolokiaStatus.xhr = xhr;
          if (!xhr.responseText && error) {
            xhr.responseText = error.stack;
          }
        }
        if (!modal) {
          modal = $uibModal.open({
            templateUrl: UrlHelpers.join(templatePath, 'jolokiaError.html'),
            controller: ['$scope', '$uibModalInstance', 'ConnectOptions', 'jolokia', ($scope, $uibModalInstance, ConnectOptions, jolokia) => {
              jolokia.stop();
              $scope.responseText = xhr.responseText;
              $scope.ConnectOptions = ConnectOptions;
              $scope.retry = () => {
                modal = null;
                $uibModalInstance.close();
                jolokia.start();
              }
              $scope.goBack = () => {
                if (ConnectOptions.returnTo) {
                  window.location.href = ConnectOptions.returnTo;
                }
              }
            }]
          });
          Core.$apply($rootScope);
        }
      };

      var jolokia = <any> new Jolokia(jolokiaParams);
      jolokia.stop();

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
