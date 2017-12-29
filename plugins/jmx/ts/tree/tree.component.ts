namespace Jmx {

  export class TreeController {

    constructor(
      private $scope,
      private $location: ng.ILocationService,
      private workspace: Workspace,
      private $route: angular.route.IRouteService,
      private $element: JQuery,
      private $timeout: ng.ITimeoutService) {
      'ngInject';
      // it's not possible to declare classes to the component host tag in AngularJS
      $element.addClass('tree-nav-sidebar-content');
    }

    $onInit(): void {
      this.$scope.$on('$destroy', () => {
        const tree = ($('#jmxtree') as any).treeview(true);
        tree.clearSearch();
        // Bootstrap tree view leaks the node elements into the data structure
        // so let's clean this up when the user leaves the view
        const cleanTreeFolder = (node: Folder) => {
          delete node['$el'];
          if (node.nodes) node.nodes.forEach(cleanTreeFolder);
        };
        cleanTreeFolder(this.workspace.tree);
        // Then call the tree clean-up method
        tree.remove();
      });

      this.$scope.$on('jmxTreeUpdated', () => this.populateTree());
      this.$scope.$on('$routeChangeStart', () => this.updateSelectionFromURL());

      this.populateTree();
    }

    treeFetched(): boolean {
      return this.workspace.treeFetched;
    }

    updateSelectionFromURL(): void {
      updateTreeSelectionFromURL(this.$location, $('#jmxtree'));
    }

    populateTree(): void {
      log.debug("TreeController: populateTree");
      enableTree(this.$scope, this.$location, this.workspace, $('#jmxtree'),
        this.workspace.tree.children);
      this.$timeout(() => {
        this.updateSelectionFromURL();
        this.workspace.broadcastSelectionNode();
      });
    }
  }

  export const treeComponent: angular.IComponentOptions = {
    templateUrl: 'plugins/jmx/html/tree/content.html',
    controller: TreeController
  };

}
