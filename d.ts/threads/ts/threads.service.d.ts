/// <reference path="threadsPlugin.d.ts" />
declare module Threads {
    class ThreadsService {
        private $q;
        private jolokia;
        constructor($q: angular.IQService, jolokia: Jolokia.IJolokia);
        getThreads(): angular.IPromise<any[]>;
    }
}
