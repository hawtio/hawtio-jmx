/// <reference path="../jmxPlugin.ts"/>
/// <reference path="attributes.controller.ts"/>

namespace Jmx {

  export const attributesModule = angular
    .module('hawtio-jmx-attributes', [])
    .controller('Jmx.AttributesController', AttributesController)
    .name;

}
