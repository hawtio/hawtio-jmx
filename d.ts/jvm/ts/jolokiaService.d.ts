/// <reference path="../../includes.d.ts" />
/// <reference path="jvmPlugin.d.ts" />
/**
 * @module JVM
 */
declare module JVM {
    var ConnectionName: string;
    function getConnectionName(reset?: boolean): string;
    function getConnectionOptions(): any;
    function getJolokiaUrl(): any;
    interface DummyJolokia extends Jolokia.IJolokia {
        isDummy: boolean;
        running: boolean;
    }
    var DEFAULT_MAX_DEPTH: number;
    var DEFAULT_MAX_COLLECTION_SIZE: number;
    function getBeforeSend(): (xhr: any) => void;
}
