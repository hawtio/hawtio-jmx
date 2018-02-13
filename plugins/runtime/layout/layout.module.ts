/// <reference path="layout.controller.ts"/>

namespace Runtime {

  export const layoutModule = angular
    .module('runtime-layout', [])
    .controller('RuntimeLayoutController', RuntimeLayoutController)
    .name;
}
