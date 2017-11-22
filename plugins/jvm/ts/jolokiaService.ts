/// <reference path="jvmPlugin.ts"/>

namespace JVM {

  const urlCandidates = ['/hawtio/jolokia', '/jolokia', 'jolokia'];
  let discoveredUrl = null;

  hawtioPluginLoader.registerPreBootstrapTask({
    name: 'JvmParseLocation',
    task: (next) => {
      let uri = new URI();
      let query = uri.query(true);
      log.debug("query: ", query);

      let jolokiaUrl = query['jolokiaUrl'];
      if (jolokiaUrl) {
        delete query['sub-tab'];
        delete query['main-tab'];
        jolokiaUrl = URI.decode(jolokiaUrl);
        let jolokiaURI = new URI(jolokiaUrl);
        let name = query['title'] || 'Unknown Connection';
        let token = query['token'] || Core.trimLeading(uri.hash(), '#');
        let options = Core.createConnectOptions({
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
        log.debug("options: ", options);
        let connections = Core.loadConnections();
        connections.push(options);
        Core.saveConnections(connections);
        uri.hash("").query({
          con: name
        });
        window.location.replace(uri.toString());
        // don't allow bootstrap to continue
        return;
      }

      let connectionName = query['con'];
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
              let resp = angular.fromJson(data);
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

  export let ConnectionName: string = null;

  export function getConnectionName(reset = false) {
    if (!Core.isBlank(ConnectionName) && !reset) {
      return ConnectionName;
    }
    ConnectionName = '';
    let search = new URI().search(true) as any;
    if ('con' in window) {
      ConnectionName = window['con'] as string;
      log.debug("Using connection name from window: ", ConnectionName);
    } else if ('con' in search) {
      ConnectionName = search['con'];
      log.debug("Using connection name from URL: ", ConnectionName);
    } else {
      log.debug("No connection name found, using direct connection to JVM");
    }
    return ConnectionName;
  }

  export function getConnectionOptions(): Core.ConnectOptions {
    let name = getConnectionName();
    if (Core.isBlank(name)) {
      // this will fail any if (ConnectOptions) check
      return null;
    }
    let answer = Core.getConnectOptions(name);
    // search for passed credentials when connecting to remote server
    try {
      if (window['credentials']) {
        answer.userName = window['credentials'].username;
        answer.password = window['credentials'].password;
      }
    } catch (securityException) {
      // ignore
    }
    return answer;
  }

  export function getJolokiaUrl(): string | boolean {
    let answer = undefined;
    let ConnectOptions = getConnectionOptions();
    let documentBase = HawtioCore.documentBase();
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
    let windowURI = new URI();
    let jolokiaURI = undefined;
    if (_.startsWith(answer, '/') || _.startsWith(answer, 'http')) {
      jolokiaURI = new URI(answer);
    } else {
      jolokiaURI = new URI(UrlHelpers.join(documentBase, answer));
    }
    if (!ConnectOptions || !ConnectOptions.jolokiaUrl) {
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
    running: boolean;
  }

  _module.service('ConnectionName', [() => (reset = false) => getConnectionName(reset)]);

  _module.service('ConnectOptions', [(): Core.ConnectOptions => {
    return getConnectionOptions();
  }]);

  // the jolokia URL we're connected to
  _module.factory('jolokiaUrl', [(): string | boolean => getJolokiaUrl()]);

  // holds the status returned from the last jolokia call (?)
  _module.factory('jolokiaStatus', () => {
    return {
      xhr: null
    };
  });

  export let DEFAULT_MAX_DEPTH = 7;
  export let DEFAULT_MAX_COLLECTION_SIZE = 500;

  _module.factory('jolokiaParams', ["jolokiaUrl", "localStorage", (
    jolokiaUrl: string,
    localStorage: WindowLocalStorage) => {
    let answer = {
      canonicalNaming: false,
      ignoreErrors: true,
      maxCollectionSize: DEFAULT_MAX_COLLECTION_SIZE,
      maxDepth: DEFAULT_MAX_DEPTH,
      method: 'post',
      mimeType: 'application/json'
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
    let headers = ['Authorization'];
    let connectionOptions = getConnectionOptions();
    if (connectionOptions && connectionOptions['token']) {
      log.debug("Setting authorization header to token");
      return (xhr) => headers.forEach((header) =>
        xhr.setRequestHeader(header, 'Bearer ' + connectionOptions['token']));
    } else if (connectionOptions && connectionOptions.userName && connectionOptions.password) {
      log.debug("Setting authorization header to username/password");
      return (xhr) => headers.forEach((header) =>
        xhr.setRequestHeader(
          header,
          Core.getBasicAuthHeader(connectionOptions.userName as string, connectionOptions.password as string)));
    } else {
      log.debug("Not setting any authorization header");
      return (xhr) => { };
    }
  }

  _module.factory('jolokia', ["$location", "localStorage", "jolokiaStatus", "$rootScope", "userDetails",
    "jolokiaParams", "jolokiaUrl", "ConnectOptions", "HawtioDashboard", "$uibModal", "$window", (
      $location: ng.ILocationService,
      localStorage: WindowLocalStorage,
      jolokiaStatus,
      $rootScope,
      userDetails: Core.UserDetails,
      jolokiaParams,
      jolokiaUrl: string,
      connectionOptions,
      dash,
      $uibModal,
      $window): Jolokia.IJolokia => {

      let jolokia = null;

      if (jolokiaUrl) {
        $.ajaxSetup({
          beforeSend: getBeforeSend()
        });

        let modal = null;
        jolokiaParams['ajaxError'] = jolokiaParams['ajaxError'] ? jolokiaParams['ajaxError'] : (xhr, textStatus, error) => {
          if (xhr.status === 401 || xhr.status === 403) {
            $window.location.href = 'auth/logout';
          } else {
            jolokiaStatus.xhr = xhr;
            if (!xhr.responseText && error) {
              xhr.responseText = error.stack;
            }
          }
        };

        jolokia = new Jolokia(jolokiaParams) as any;
        jolokia.stop();

        if ('updateRate' in localStorage) {
          if (localStorage['updateRate'] > 0) {
            jolokia.start(localStorage['updateRate']);
          }
        }
      } else {
        // empty jolokia that returns nothing
        jolokia = <DummyJolokia>{
          isDummy: true,
          running: false,
          request: (req: any, opts?: Jolokia.IParams) => null,
          register: (req: any, opts?: Jolokia.IParams) => null as number,
          list: (path, opts?) => null,
          search: (mBeanPatter, opts?) => null,
          getAttribute: (mbean, attribute, path?, opts?) => null,
          setAttribute: (mbean, attribute, value, path?, opts?) => { },
          version: (opts?) => <Jolokia.IVersion>null,
          execute: (mbean, operation, ...args) => null,
          start: (period) => {
            jolokia.running = true;
          },
          stop: () => {
            jolokia.running = false;
          },
          isRunning: () => jolokia.running,
          jobs: () => []
        };
      }

      return jolokia;
    }]);

}
