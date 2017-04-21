/// <reference path="jmxPlugin.ts"/>

namespace Jmx {

  _module.controller("Jmx.TreeHeaderController", ["$scope", ($scope) => {
    $scope.expandAll = () => {
      (<any>$('#jmxtree')).treeview('expandAll', { silent: true });
    };

    $scope.contractAll = () => {
      (<any>$('#jmxtree')).treeview('collapseAll', { silent: true });
    };

    const treeElement: any = $('#jmxtree');
    const search = _.debounce(
      filter => treeElement.treeview('search', [
        filter,
        {
          ignoreCase: true,
          exactMatch: false,
          revealResults: true
        }
      ]), 300, { leading: false, trailing: true });

    $scope.filter = '';
    $scope.$watch('filter', (filter, previous) => {
      if (filter !== previous) {
        search(filter);
      }
    });
  }]);

  _module.controller("Jmx.MBeansController", ["$scope", "$location", "workspace", "$route", ($scope, $location: ng.ILocationService, workspace: Workspace, $route: angular.route.IRouteService) => {

    $scope.num = 1;

    $scope.$on("$routeChangeSuccess", function (event, current, previous) {
      // lets do this asynchronously to avoid Error: $digest already in progress
      setTimeout(updateSelectionFromURL, 50);
    });

    $scope.$on("$routeUpdate", function (ev, params) {
      if (params && params.params && params.params.tab && params.params.tab.match(/notree$/)) {
        $route.reload();
      }
    });

    $scope.select = (node:NodeSelection) => {
      $scope.workspace.updateSelectionNode(node);
      Core.$apply($scope);
    };

    function updateSelectionFromURL() {
      updateTreeSelectionFromURL($location, $('#jmxtree'));
    }

    $scope.populateTree = () => {
      var treeElement = $('#jmxtree');
      $scope.tree = workspace.tree;
      enableTree($scope, $location, workspace, treeElement, $scope.tree.children);
      setTimeout(updateSelectionFromURL, 50);
    };

    $scope.$on('$destroy', () => {
      // Bootstrap tree view leaks the node elements into the data structure
      // so let's clean this up when the user leaves the view
      const cleanTreeFolder = (node:Folder) => {
          delete node['$el'];
          if (node.nodes) node.nodes.forEach(cleanTreeFolder);
      };
      cleanTreeFolder($scope.tree);
      // Then call the tree clean-up method
      const treeElement: any = $('#jmxtree');
      treeElement.treeview('remove');
    });

    $scope.$on('jmxTreeUpdated', $scope.populateTree);

    $scope.populateTree();
  }]);
}
