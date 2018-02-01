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
    rowNum: number;

}



    export function RuntimeSystemPropertiesController( $scope: SystemPropertiesControllerScope, jolokia: Jolokia.IJolokia, workspace: Jmx.Workspace )  {
        'ngInject';
        $scope.systemProperties = [];
        $scope.rowNum = 0;

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


    let row = 0;
    $scope.tableColumns = [
      {
        header: 'Property',
        itemField: 'name',
        templateFn: value => {
          const id="key-" + value.replace('.','-');
          return '<div class="forceBreakLongLines hardWidthLimitM" id="' + id + ' " hawtio-clipboard="#' + id + '"  data-clipboard-target="#' + id + '">' + value + '</div>';}
      },

      {
          itemField: 'value',
          header: 'Value',
          templateFn: (value, item) => {
            const id="key-" + item.name.replace('.','-');
            return '<div class="forceBreakLongLines hardWidthLimitM" id="' + id + ' " hawtio-clipboard="#' + id + '"  data-clipboard-target="#' + id + '">' + value + '</div>';}
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