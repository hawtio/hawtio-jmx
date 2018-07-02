/// <reference path="./thread.ts"/>

namespace Runtime {

  export class ThreadsService {

    private static STATE_LABELS = {
      BLOCKED: 'Blocked',
      NEW: 'New',
      RUNNABLE: 'Runnable',
      TERMINATED: 'Terminated',
      TIMED_WAITING: 'Timed waiting',
      WAITING: 'Waiting'
    };
    
    constructor(private jolokiaService: JVM.JolokiaService) {
      'ngInject';
    }

    getThreads(): angular.IPromise<Thread[]> {
      return this.jolokiaService.execute('java.lang:type=Threading', 'dumpAllThreads', false, false)
        .then(threads => {
          threads.forEach(thread => {
            thread.threadState = ThreadsService.STATE_LABELS[thread.threadState];
            thread.waitedTime = thread.waitedTime > 0 ? Core.humanizeMilliseconds(thread.waitedTime) : '';
            thread.blockedTime = thread.blockedTime > 0 ? Core.humanizeMilliseconds(thread.blockedTime) : '';
            delete thread.lockMonitors;
          });
          return threads;
      });
    }
  }

}
