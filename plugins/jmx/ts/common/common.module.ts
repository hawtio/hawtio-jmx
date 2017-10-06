/// <reference path="header.component.ts"/>

namespace Jmx {

  export const commonModule = angular
    .module('hawtio-jmx-common', [])
    .component('jmxHeader', headerComponent)
    .name;

}
