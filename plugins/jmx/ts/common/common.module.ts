/// <reference path="header.component.ts"/>
/// <reference path="tab.component.ts"/>

namespace Jmx {

  export const commonModule = angular
    .module('hawtio-jmx-common', [])
    .component('jmxHeader', headerComponent)
    .component('tab', tabComponent)
    .name;

}
