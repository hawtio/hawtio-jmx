/// <reference path="header.component.ts"/>

namespace Jmx {

  export const CommonModule = angular
    .module('hawtio-jmx-common', [])
    .component('jmxHeader', headerComponent)
    .name;

}