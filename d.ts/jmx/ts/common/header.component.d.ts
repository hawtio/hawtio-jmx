/// <reference path="../jmxPlugin.d.ts" />
/// <reference path="../workspace.d.ts" />
declare namespace Jmx {
    class HeaderController {
        title: string;
        constructor($rootScope: any);
    }
    const headerComponent: {
        template: string;
        controller: typeof HeaderController;
    };
}
