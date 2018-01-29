///<reference path="./runtimeExports.ts"/>
namespace Runtime {
  export interface SystemProperty {
    name:string;
    value: string;
}

  export interface SystemPropertiesControllerScope extends ng.IScope {
    systemProperties: Array < SystemProperty>;
    filteredProperties: Array < SystemProperty>;
    toolbarConfig: any;
    tableConfig: any;
    tableDtOptions: any;
    tableColumns: Array<any>;

}



    export function RuntimeSystemPropertiesController( $scope: SystemPropertiesControllerScope, jolokia: Jolokia.IJolokia, workspace: Jmx.Workspace )  {
        'ngInject';
        $scope.systemProperties = [];

    const FILTER_FUNCTIONS = {
      name: (systemProperties, name) => {
        var re = new RegExp(name, 'i');
        return systemProperties.filter(property => re.test(property.name));
      },
      value: (systemProperties, value) => {
        var re = new RegExp(value, 'i');
        return systemProperties.filter(property => re.test(property.value));
      }
    };

    function filterChange(filters: any[]) {
      applyFilters(filters);
      updateResultCount();
    }

    function applyFilters(filters: any[]) {
      let filteredProperties = $scope.systemProperties;
      if(filters) {
        filters.forEach(filter => {
          filteredProperties = FILTER_FUNCTIONS[filter.id](filteredProperties, filter.value);
        });
      }
      $scope.filteredProperties = filteredProperties;
    }

    function updateResultCount() {
      $scope.toolbarConfig.filterConfig.resultsCount = $scope.filteredProperties.length;
    }


    $scope.toolbarConfig = {
      filterConfig: {
        fields: [
          {
            id: 'name',
            title: 'Name',
            placeholder: 'Filter by name...',
            filterType: 'text'
          },
          {
            id: 'value',
            title: 'Value',
            placeholder: 'Filter by name...',
            filterType: 'text'
          },

        ],
        onFilterChange: filterChange
      },
      isTableView: true
    };

        function render( response )  {
            var runtime: Runtime = response.value;
            //system property table
            $scope.systemProperties = [];
            for ( var key in runtime.SystemProperties ) {
                $scope.systemProperties.push( { name: key, value: runtime.SystemProperties[key] });
            }
            filterChange($scope.toolbarConfig.filterConfig.appliedFilters);
            Core.$apply($scope);
        }


    $scope.tableConfig = {
      selectionMatchProp: 'name',
      showCheckboxes: false
    };

    $scope.tableDtOptions = {
      order: [[0, "asc"]]
    };


    $scope.tableColumns = [
      {
        header: 'Property',
        itemField: 'name',
        templateFn: value => `<div class="forceBreakLongLines hardWidthLimitM" zero-clipboard data-clipboard-text="${value}">${value}</div>`
      },

      {
          itemField: 'value',
          header: 'Value',
          templateFn: value => `<div class="forceBreakLongLines hardWidthLimitM" zero-clipboard data-clipboard-text="${value}">${value}</div>`
      }

    ];

        
        Core.register( jolokia, $scope, {
            
                type: 'read',
                mbean: runtimeMbean,
                arguments: []
            }
        , Core.onSuccess( render ) );

    }
}