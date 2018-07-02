/// <reference path="./thread.ts"/>

namespace Runtime {

  export class ThreadModalController {
    resolve: {thread: Thread};

    get thread() {
      return this.resolve.thread;
    }
  }

  export const threadModalComponent: angular.IComponentOptions = {
    bindings: {
      resolve: '<',
      close: '&'
    },
    template: `
      <div class="modal-header">
        <button type="button" class="close" aria-label="Close" ng-click="$ctrl.close()">
          <span class="pficon pficon-close" aria-hidden="true"></span>
        </button>
        <h4 class="modal-title">Thread</h4>
      </div>
      <div class="modal-body">
        <div class="row">
          <div class="col-md-12">
            <dl class="dl-horizontal">
              <dt>ID</dt>
              <dd>{{$ctrl.thread.threadId}}</dd>
              <dt>Name</dt>
              <dd>{{$ctrl.thread.threadName}}</dd>
              <dt>Waited Count</dt>
              <dd>{{$ctrl.thread.waitedCount}}</dd>
              <dt>Waited Time</dt>
              <dd>{{$ctrl.thread.waitedTime}}</dd>
              <dt>Blocked Count</dt>
              <dd>{{$ctrl.thread.blockedCount}}</dd>
              <dt>Blocked Time</dt>
              <dd>{{$ctrl.thread.blockedTime}}</dd>
              <div ng-show="$ctrl.thread.lockInfo != null">
                <dt>Lock Name</dt>
                <dd>{{$ctrl.thread.lockName}}</dd>
                <dt>Lock Class Name</dt>
                <dd>{{$ctrl.thread.lockInfo.className}}</dd>
                <dt>Lock Identity Hash Code</dt>
                <dd>{{$ctrl.thread.lockInfo.identityHashCode}}</dd>
              </div>
              <div ng-show="$ctrl.thread.lockOwnerId > 0">
                <dt>Waiting for lock owned by</dt>
                <dd><a href="" ng-click="selectThreadById($ctrl.thread.lockOwnerId)">{{$ctrl.thread.lockOwnerId}} - {{$ctrl.thread.lockOwnerName}}</a></dd>
              </div>
              <div ng-show="$ctrl.thread.lockedSynchronizers.length > 0">
                <dt>Locked Synchronizers</dt>
                <dd>
                  <ol class="list-unstyled">
                    <li ng-repeat="synchronizer in $ctrl.thread.lockedSynchronizers">
                      <span title="Class Name">{{synchronizer.className}}</span> -
                      <span title="Identity Hash Code">{{synchronizer.identityHashCode}}</span>
                    </li>
                  </ol>
                </dd>
              </div>
            </dl>
          </div>
        </div>
        <div class="row" ng-show="$ctrl.thread.lockedMonitors.length > 0">
          <div class="col-md-12">
            <dl>
              <dt>Locked Monitors</dt>
              <dd>
                <ol class="zebra-list">
                  <li ng-repeat="monitor in $ctrl.thread.lockedMonitors">
                    Frame: <strong>{{monitor.lockedStackDepth}}</strong>
                    <span class="green">{{monitor.lockedStackFrame.className}}</span>
                    <span class="bold">.</span>
                    <span class="blue bold">{{monitor.lockedStackFrame.methodName}}</span>
                    &nbsp;({{monitor.lockedStackFrame.fileName}}<span ng-show="frame.lineNumber > 0">:{{monitor.lockedStackFrame.lineNumber}}</span>)
                    <span class="orange" ng-show="monitor.lockedStackFrame.nativeMethod">(Native)</span>
                  </li>
                </ol>
              </dd>
            </dl>
          </div>
        </div>
        <div class="row">
          <div class="col-md-12">
            <dl>
              <dt>Stack Trace</dt>
              <dd>
                <ol class="zebra-list">
                  <li ng-repeat="frame in $ctrl.thread.stackTrace">
                    <span class="green">{{frame.className}}</span>
                    <span class="bold">.</span>
                    <span class="blue bold">{{frame.methodName}}</span>
                    &nbsp;({{frame.fileName}}<span ng-show="frame.lineNumber > 0">:{{frame.lineNumber}}</span>)
                    <span class="orange" ng-show="frame.nativeMethod">(Native)</span>
                  </li>
                </ol>
              </dd>
            </dl>
          </div>
        </div>
      </div>
    `,
    controller: ThreadModalController
  };

}
