/// <reference path="./threadsPlugin.ts"/>
/// <reference path="./threads.service.ts"/>

module Threads {

  _module.controller('ThreadsController', ['$scope', '$uibModal', 'threadsService', ($scope, $uibModal,
    threadsService: ThreadsService) => {

    const FILTER_FUNCTIONS = {
      state: (threads, state) => threads.filter(thread => thread.threadState === state),
      name: (threads, name) => {
        var re = new RegExp(name, 'i');
        return threads.filter(thread => re.test(thread.threadName));
      }
    };
      
    let allThreads;

    $scope.toolbarConfig = {
      filterConfig: {
        fields: [
          {
            id: 'state',
            title:  'State',
            placeholder: 'Filter by state...',
            filterType: 'select',
            filterValues: ['Blocked', 'New', 'Runnable', 'Terminated', 'Timed waiting', 'Waiting']
          },
          {
            id: 'name',
            title: 'Name',
            placeholder: 'Filter by name...',
            filterType: 'text'
          }
        ],
        onFilterChange: filterChange
      },
      isTableView: true
    };

    $scope.tableConfig = {
      selectionMatchProp: 'threadId',
      showCheckboxes: false
    };

    $scope.tableDtOptions = {
      order: [[0, "desc"]]
    };

    $scope.tableColumns = [
      { header: 'ID', itemField: 'threadId' },
      { header: 'State', itemField: 'threadState' },
      { header: 'Name', itemField: 'threadName', htmlTemplate: 'threadName.html' },
      { header: 'Waited Time', itemField: 'waitedTime' },
      { header: 'Blocked Time', itemField: 'blockedTime' },
      { header: 'Native', itemField: 'inNative', htmlTemplate: 'yesNo.html' },
      { header: 'Suspended', itemField: 'suspended', htmlTemplate: 'yesNo.html' }
    ];

    $scope.tableItems = null;

    $scope.tableActionButtons = [
      {
        name: 'More',
        title: 'View more information about this thread',
        actionFn: viewDetails
      }
    ];

    (function init() {
      loadThreads();
    })();

    function loadThreads() {
      threadsService.getThreads().then(threads => {
        allThreads = threads;
        $scope.filteredThreads = threads;
      });
    }

    function filterChange(filters: any[]) {
      keepOnlyLatestStateFilter(filters);
      applyFilters(filters);
      updateResultCount();
    }

    function keepOnlyLatestStateFilter(filters: any[]) {
      let numStateFilters = filters.reduce((sum, filter) => filter.id === 'state' ? sum + 1 : sum, 0);
      if (numStateFilters > 1) {
        filters.splice(_.findIndex(filters, ['id', 'state']), 1);
      }
    }

    function applyFilters(filters: any[]) {
      let filteredThreads = allThreads;
      filters.forEach(filter => {
        filteredThreads = FILTER_FUNCTIONS[filter.id](filteredThreads, filter.value);
      });
      $scope.filteredThreads = filteredThreads;
    }
    
    function updateResultCount() {
      $scope.toolbarConfig.filterConfig.resultsCount = $scope.filteredThreads.length;
    }
    
    function viewDetails(action, item) {
      $scope.thread = $scope.filteredThreads.find(thread => thread.threadId === item.threadId);
      openModal();
    }

    function openModal() {
      $uibModal.open({
        templateUrl: 'threadModalContent.html',
        scope: $scope,
        size: 'lg'
      });
    }

  }]);

}
