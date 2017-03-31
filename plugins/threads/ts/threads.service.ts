/// <reference path="./threadsPlugin.ts"/>

module Threads {

  export class ThreadsService {

    private static STATE_LABELS = {
      BLOCKED: 'Blocked',
      NEW: 'New',
      RUNNABLE: 'Runnable',
      TERMINATED: 'Terminated',
      TIMED_WAITING: 'Timed waiting',
      WAITING: 'Waiting'
    };
    
    constructor(private $q: angular.IQService, private jolokia: Jolokia.IJolokia) {
    }

    getThreads(): angular.IPromise<any[]> {
      return this.$q((resolve, reject) => {
        this.jolokia.execute("java.lang:type=Threading","dumpAllThreads", false, false, {
          success: threads => {
            threads.forEach(thread => {
              thread.threadState = ThreadsService.STATE_LABELS[thread.threadState];
              thread.waitedTime = thread.waitedTime > 0 ? Core.humanizeMilliseconds(thread.waitedTime) : '';
              thread.blockedTime = thread.blockedTime > 0 ? Core.humanizeMilliseconds(thread.blockedTime) : '';
              delete thread.lockMonitors;
            });
            resolve(threads);
          }
        });
      });
    }

  }

  _module.service('threadsService', ['$q', 'jolokia', ThreadsService]);

}