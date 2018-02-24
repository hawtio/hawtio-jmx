/// <reference path="threads.controller.ts"/>
/// <reference path="threads.service.ts"/>

namespace Runtime {

  export const threadsModule = angular
    .module('runtime-threads', [])
    .controller('ThreadsController', ThreadsController)
    .service('threadsService', ThreadsService)
    .name;

}
