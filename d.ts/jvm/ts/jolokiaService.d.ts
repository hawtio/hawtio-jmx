/// <reference path="../../includes.d.ts" />
/// <reference path="jvmPlugin.d.ts" />
/**
 * @module JVM
 */
declare module JVM {
    interface DummyJolokia extends Jolokia.IJolokia {
        running: boolean;
    }
    var DEFAULT_MAX_DEPTH: number;
    var DEFAULT_MAX_COLLECTION_SIZE: number;
}
