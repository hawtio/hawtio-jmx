/// <reference path="../jmxPlugin.ts"/>
/// <reference path="../treeHelpers.ts"/>

namespace Jmx {

  export class TreeHeaderController {

    filter: string = '';
    result: any[] = [];

    constructor(private $scope) {
      'ngInject';
    }

    $onInit(): void {
      this.$scope.$watch('filter', (filter, previous) => {
        if (filter !== previous) {
          this.search(filter);
        }
      });
    }

    private search(filter: string): void {
      let doSearch = (filter: string) => {
        const result = this.tree().search(filter, {
          ignoreCase: true,
          exactMatch: false,
          revealResults: true
        });
        this.result.length = 0;
        this.result.push(...result);
        Core.$apply(this.$scope);
      };
      _.debounce(doSearch, 300, { leading: false, trailing: true })(filter);
    }

    // TODO: the tree should ideally be initialised synchronously
    private tree(): any {
      return ($('#jmxtree') as any).treeview(true);
    }

    expandAll(): any {
      return this.tree().expandAll({ silent: true });
    }

    contractAll(): any {
      return this.tree().collapseAll({ silent: true });
    }
  }

  export class TreeController {

    constructor(
      private $scope,
      private $location: ng.ILocationService,
      private workspace: Workspace,
      private $route: angular.route.IRouteService) {
      'ngInject';
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
      setTimeout(() => this.updateSelectionFromURL(), 50);
    }
  }

}
