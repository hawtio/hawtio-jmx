/// <reference path="jmxPlugin.d.ts" />
/**
 * @module Jmx
 */
declare module Jmx {
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
