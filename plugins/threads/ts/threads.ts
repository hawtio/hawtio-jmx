/**
 * @module Threads
 */
/// <reference path="./threadsPlugin.ts"/>
module Threads {

  _module.controller("Threads.ToolbarController", ["$scope", "$rootScope", "jolokia", ($scope, $rootScope, jolokia) => {
    $scope.$on('ThreadControllerSupport', ($event, support) => {
      $scope.support = support;
    });
    $scope.getMonitorClass = (name, value) => {
      return value.toString();
    };

    $scope.getMonitorName = (name) => {
      name = name.replace('Supported', '');
      return _.startCase(name);
    };
  }]);

  _module.controller("Threads.ThreadsController", ["$scope", "$rootScope", "$routeParams", "$templateCache", "jolokia", "$element", "$uibModal", ($scope, $rootScope, $routeParams, $templateCache, jolokia, $element, $uibModal) => {

    let modalInstance = null;
    $scope.selectedRowJson = '';
    $scope.lastThreadJson = '';
    $scope.getThreadInfoResponseJson = '';
    $scope.threads = [];
    $scope.unfilteredThreads = [];
    $scope.support = {};
    $scope.row = {};
    $scope.selectedRowIndex = -1;
    $scope.filters = {state: '', name: ''};
    
    $scope.availableStates = [
      {id: 'BLOCKED', name: 'Blocked'},
      {id: 'NEW', name: 'New'},
      {id: 'RUNNABLE', name: 'Runnable'},
      {id: 'TERMINATED', name: 'Terminated'},
      {id: 'TIMED_WAITING', name: 'Timed waiting'},
      {id: 'WAITING', name: 'Waiting'}
    ];

    $scope.showRaw = {
      expanded: false
    };

    $scope.addToDashboardLink = () => {
      var href = "#/threads";
      var size = angular.toJson({
        size_x: 8,
        size_y: 2
      });
      var title = "Threads";
      return "#/dashboard/add?tab=dashboard&href=" + encodeURIComponent(href) +
        "&title=" + encodeURIComponent(title) +
        "&size=" + encodeURIComponent(size);
    };

    $scope.isInDashboardClass = () => {
      if (angular.isDefined($scope.inDashboard && $scope.inDashboard)) {
        return "threads-dashboard";
      }
      return "threads logbar";
    };

    $scope.threadGridOptions = {
      selectedItems: [],
      data: 'threads',
      showSelectionCheckbox: false,
      enableRowClickSelection: true,
      multiSelect: false,
      primaryKeyFn: (entity, idx) => { return entity.threadId; },
      filterOptions: {
        filterText: ''
      },
      sortInfo: {
        sortBy: 'threadId',
        ascending: false
      },
      columnDefs: [
        {
          field: 'threadId',
          displayName: 'ID',
          customSortField: (value) => Number(value.threadId)
        },
        {
          field: 'threadState',
          displayName: 'State',
          cellTemplate: '{{row.entity.threadState | humanize}}'
        },
        {
          field: 'threadName',
          displayName: 'Name'
        },
        {
          field: 'waitedTime',
          displayName: 'Waited Time',
          cellTemplate: '<div ng-show="row.entity.waitedTime > 0">{{row.entity.waitedTime | humanizeMs}}</div>'
        },
        {
          field: 'blockedTime',
          displayName: 'Blocked Time',
          cellTemplate: '<div ng-show="row.entity.blockedTime > 0">{{row.entity.blockedTime | humanizeMs}}</div>'
        },
        {
          field: 'inNative',
          displayName: 'Native',
          cellTemplate: '<div ng-show="row.entity.inNative" class="orange">(in native)</div>'
        },
        {
          field: 'suspended',
          displayName: 'Suspended',
          cellTemplate: '<div ng-show="row.entity.suspended" class="red">(suspended)</div>'
        }
      ]
    };

    $scope.$watchCollection('filters', (newValue, oldValue) => {
      let threads = $scope.unfilteredThreads;
      if ($scope.filters.name) {
        threads = filterByName($scope.filters.name, threads);
      }
      if ($scope.filters.state) {
        threads = filterThreads($scope.filters.state, threads);
      }
      $scope.threads = threads;
    });

    function filterByName(name, threads) {
      log.debug("Filtering threads by name: ", name);
      if (name) {
        return threads.filter(t => t['threadName'].toLowerCase().indexOf(name.toLowerCase()) !== -1);
      } else {
        return threads;
      }
    };

    function filterThreads(state, threads) {
      log.debug("Filtering threads by: ", state);
      if (state) {
        return threads.filter((t) => {
          return t && t['threadState'] === state.id;
        });
      } else {
        return threads;
      }
    };

    $scope.$watch('threadGridOptions.selectedItems', (newValue, oldValue) => {
      if (newValue !== oldValue) {
        if (newValue.length === 0) {
          $scope.row = {};
          $scope.selectedRowIndex = -1;
        } else {
          $scope.row = _.first(newValue);
          $scope.selectedRowIndex = Core.pathGet($scope, ['hawtioSimpleTable', 'threads', 'rows']).findIndex((t) => { return t.entity['threadId'] === $scope.row['threadId']});
          openModal();
        }
        $scope.selectedRowJson = angular.toJson($scope.row, true);
      }
    }, true);

    $scope.deselect = () => {
      $scope.threadGridOptions.selectedItems = [];
    };

    $scope.selectThreadById = (id) => {
      $scope.threadGridOptions.selectedItems = $scope.threads.filter((t) => { return t.threadId === id; });
    };

    $scope.selectThreadByIndex = (idx) => {
      var selectedThread = Core.pathGet($scope, ['hawtioSimpleTable', 'threads', 'rows'])[idx];
      $scope.threadGridOptions.selectedItems = $scope.threads.filter((t) => {
        return t && t['threadId'] == selectedThread.entity['threadId'];
      });
    };

    function render(response) {
      if ($scope.threads.length === 0) {
        var responseJson = angular.toJson(response.value, true);
        if ($scope.getThreadInfoResponseJson !== responseJson) {
          $scope.getThreadInfoResponseJson = responseJson;
          $scope.unfilteredThreads = _.without(response.value, null);
          $scope.threads = filterThreads($scope.stateFilter, $scope.unfilteredThreads);
          Core.$apply($scope);
        }
      }
    }

    $scope.init = () => {

      jolokia.request(
      [{
        type: 'read',
        mbean: Threads.mbean,
        attribute: 'ThreadContentionMonitoringSupported'
      }, {
        type: 'read',
        mbean: Threads.mbean,
        attribute: 'ObjectMonitorUsageSupported'
      }, {
        type: 'read',
        mbean: Threads.mbean,
        attribute: 'SynchronizerUsageSupported'
      }], {
        method: 'post',
        success: [
          (response) => {
            $scope.support.threadContentionMonitoringSupported = response.value;
            $rootScope.$broadcast('ThreadControllerSupport', $scope.support);
            log.debug("ThreadContentionMonitoringSupported: ", $scope.support.threadContentionMonitoringSupported);
            $scope.maybeRegister();
          },
          (response) => {
            $scope.support.objectMonitorUsageSupported = response.value;
            $rootScope.$broadcast('ThreadControllerSupport', $scope.support);
            log.debug("ObjectMonitorUsageSupported: ", $scope.support.objectMonitorUsageSupported);
            $scope.maybeRegister();
          },
          (response) => {
            $scope.support.synchronizerUsageSupported = response.value;
            $rootScope.$broadcast('ThreadControllerSupport', $scope.support);
            log.debug("SynchronizerUsageSupported: ", $scope.support.synchronizerUsageSupported);
            $scope.maybeRegister();
          }],
        error: (response) => {
          log.error('Failed to query for supported usages: ', response.error);
        }
      });
    };

    var initFunc = Core.throttled($scope.init, 500);

    $scope.maybeRegister = () => {
      if ('objectMonitorUsageSupported' in $scope.support &&
          'synchronizerUsageSupported' in $scope.support &&
          'threadContentionMonitoringSupported' in $scope.support) {
        log.debug("Registering dumpAllThreads polling");
        Core.register(jolokia, $scope, {
          type: 'exec',
          mbean: Threads.mbean,
          operation: 'dumpAllThreads',
          arguments: [$scope.support.objectMonitorUsageSupported, $scope.support.synchronizerUsageSupported]
        }, Core.onSuccess(render));

        if ($scope.support.threadContentionMonitoringSupported) {
          // check and see if it's actually turned on, if not
          // enable it
          jolokia.request({
            type: 'read',
            mbean: Threads.mbean,
            attribute: 'ThreadContentionMonitoringEnabled'
          }, Core.onSuccess($scope.maybeEnableThreadContentionMonitoring));

        }
      }
    };

    function disabledContentionMonitoring(response) {
      log.info("Disabled contention monitoring: ", response);
      Core.$apply($scope);
    }

    function enabledContentionMonitoring(response) {
      $element.on('$destroy', () => {
        jolokia.setAttribute(mbean, 'ThreadContentionMonitoringEnabled', false, Core.onSuccess(disabledContentionMonitoring));
      });
      log.info("Enabled contention monitoring");
      Core.$apply($scope);
    }

    $scope.maybeEnableThreadContentionMonitoring = (response) => {
      if (response.value === false) {
        log.info("Thread contention monitoring not enabled, enabling");
        jolokia.setAttribute(mbean, 'ThreadContentionMonitoringEnabled', true, Core.onSuccess(enabledContentionMonitoring));
      } else {
        log.info("Thread contention monitoring already enabled");
      }
      Core.$apply($scope);
    };

    function openModal() {
      if (!modalInstance) {
        modalInstance = $uibModal.open({
          templateUrl: 'plugins/threads/html/thread-modal.html',
          scope: $scope,
          size: 'lg'
        });
        modalInstance.result.finally(function() {
          modalInstance = null;
          $scope.deselect();
        });
      }
    }

    initFunc();

  }]);
}
