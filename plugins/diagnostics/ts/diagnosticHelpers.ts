/// <reference path="../../jmx/ts/folder.ts"/>
/// <reference path="../../jmx/ts/workspace.ts"/>
namespace Diagnostics {
  export var log: Logging.Logger = Logger.get("Diagnostics");


  /**
   * Adds common properties and functions to the scope
   * @method configureScope
   * @for Diagnostics
   * @param {*} $scope
   * @param {ng.ILocationService} $location
   * @param {Core.Workspace} workspace
   */
  export function configureScope($scope, $location, workspace) {

    $scope.isActive = (href) => {
      const tidy = Core.trimLeading(href, "#");
      const loc = $location.path();
      return loc === tidy;
    };

    $scope.isValid = (link) => {
      return link && link.isValid(workspace);
    };


    $scope.goto = (path) => {
      $location.path(path);
    };

    $scope.isJfrEnabled = hasDiagnosticFunction(workspace, 'jfrCheck');
    $scope.isHeapEnabled = hasDiagnosticFunction(workspace, 'gcClassHistogram');
    $scope.isFlagsEnabled = hasHotspotDiagnostic(workspace);

  }


  export function hasHotspotDiagnostic(workspace) {
    return workspace.treeContainsDomainAndProperties('com.sun.management', {type: 'HotSpotDiagnostic'});
  }

  export function hasDiagnosticFunction(workspace: Jmx.Workspace, operation: string) {
    const diagnostics: Folder = workspace.findMBeanWithProperties('com.sun.management', {type: 'DiagnosticCommand'});
    return diagnostics && diagnostics.mbean && diagnostics.mbean.op && diagnostics.mbean.op[operation];
  }

  export function initialTab(workspace: Jmx.Workspace): string {
    if (hasDiagnosticFunction(workspace, 'jfrCheck')) {
      return '/jfr';
    } else if (hasDiagnosticFunction(workspace, 'gcClassHistogram')) {
      return '/heap';
    } else if (hasHotspotDiagnostic(workspace)) {
      return '/flags';
    } else {
      return '';
    }

  }

  export function findMyPid(title) {
    //snatch PID from window title
    const regex = /pid:(\d+)/g;
    const pid = regex.exec(title);
    if (pid && pid[1]) {
      return pid[1];
    } else {
      return null;
    }
  }

}
