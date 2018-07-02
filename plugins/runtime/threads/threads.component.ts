/// <reference path="./thread.ts"/>
/// <reference path="./threads.service.ts"/>

namespace Runtime {

  export class ThreadsController {
    FILTER_FUNCTIONS = {
      state: (threads, state) => threads.filter(thread => thread.threadState === state),
      name: (threads, name) => {
        var re = new RegExp(name, 'i');
        return threads.filter(thread => re.test(thread.threadName));
      }
    };

    allThreads: Thread[];
    filteredThreads: Thread[];

    toolbarConfig = {
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
        onFilterChange: (filters: any[]) => {
          this.applyFilters(filters);
        },
        resultsCount: 0
      },
      isTableView: true
    };

    tableConfig = {
      selectionMatchProp: 'threadId',
      showCheckboxes: false
    };

    tableDtOptions = {
      order: [[0, "desc"]]
    };

    tableColumns = [
      {
        header: 'ID',
        itemField: 'threadId'
      },
      {
        header: 'State',
        itemField: 'threadState'
      },
      {
        header: 'Name',
        itemField: 'threadName',
        templateFn: value => `<span class="table-cell-truncated" title="${value}">${value}</span>`
      },
      {
        header: 'Waited Time',
        itemField: 'waitedTime'
      },
      {
        header: 'Blocked Time',
        itemField: 'blockedTime'
      },
      {
        header: 'Native',
        itemField: 'inNative',
        templateFn: value => value ? '<span class="fa fa-circle" aria-hidden="true"></span><span class="hidden">b</span>' : '<span class="hidden">a</span>'
      },
      {
        header: 'Suspended',
        itemField: 'suspended',
        templateFn: value => value ? '<span class="fa fa-circle" aria-hidden="true"></span><span class="hidden">b</span>' : '<span class="hidden">a</span>'
      }
    ];

    tableActionButtons = [
      {
        name: 'More',
        title: 'View more information about this thread',
        actionFn: (action, thread) => {
          console.log(thread);
          this.$uibModal.open({
            component: 'threadModal',
            size: 'lg',
            resolve: {thread: thread}
          });
        }
      }
    ];

    constructor(private $uibModal: angular.ui.bootstrap.IModalService, private threadsService: ThreadsService) {
      'ngInject';
    }    

    $onInit() {
      this.loadThreads();
    }

    loadThreads() {
      this.threadsService.getThreads().then(threads => {
        this.allThreads = threads;
        this.applyFilters([]);
      });
    }

    applyFilters(filters: any[]) {
      let filteredThreads = this.allThreads;
      filters.forEach(filter => {
        filteredThreads = this.FILTER_FUNCTIONS[filter.id](filteredThreads, filter.value);
      });
      this.filteredThreads = filteredThreads;
      this.toolbarConfig.filterConfig.resultsCount = filteredThreads.length;
    }
  }

  export const threadsComponent: angular.IComponentOptions = {
    template: `
      <div class="table-view">
        <h1>Threads</h1>
        <pf-toolbar config="$ctrl.toolbarConfig"></pf-toolbar>
        <pf-table-view class="runtime-threads-table"
                       config="$ctrl.tableConfig"
                       dt-options="$ctrl.tableDtOptions"
                       columns="$ctrl.tableColumns"
                       items="$ctrl.filteredThreads"
                       action-buttons="$ctrl.tableActionButtons">
        </pf-table-view>
      </div>
    `,
    controller: ThreadsController
  }

}
