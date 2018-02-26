/// <reference path="connect.controller.ts"/>
/// <reference path="connect.service.ts"/>
/// <reference path="connection-url.filter.ts"/>
/// <reference path="connect-login.component.ts"/>
/// <reference path="connect-login-modal.component.ts"/>

namespace JVM {

  export const ConnectModule = angular
    .module('hawtio-jvm-connect', [])
    .controller('ConnectController', ConnectController)
    .service('connectService', ConnectService)
    .filter('connectionUrl', ConnectionUrlFilter)
    .component('connectLogin', connectLoginComponent)
    .component('connectLoginModal', connectLoginModalComponent)
    .name;

}