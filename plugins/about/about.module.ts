/// <reference path="about.component.ts"/>
/// <reference path="about.config.ts"/>

namespace About {

  const aboutModule = angular
    .module('hawtio-about', [])
    .run(configureMenu)
    .component('about', aboutComponent)
    .name;

  hawtioPluginLoader.addModule(aboutModule);

}