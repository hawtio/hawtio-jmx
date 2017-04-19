/// <reference path="jmxPlugin.d.ts" />
declare namespace Jmx {
    var propertiesColumnDefs: {
        field: string;
        displayName: string;
        cellTemplate: string;
    }[];
    var foldersColumnDefs: {
        displayName: string;
        cellTemplate: string;
    }[];
    var AttributesController: ng.IModule;
}
