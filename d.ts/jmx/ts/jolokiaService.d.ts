/// <reference path="../../includes.d.ts" />
/// <reference path="jmxPlugin.d.ts" />
/**
 * @module Core
 */
declare module Jmx {
    interface DummyJolokia extends Jolokia.IJolokia {
        running: boolean;
    }
}
