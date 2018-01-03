/// <reference path="./diagnosticsPlugin.ts"/>
/// <reference path="./diagnosticHelpers.ts"/>
namespace Diagnostics {

  interface ClassStats {
    num: string;
    count: string;
    bytes: string;
    name: string;
    deltaCount: string;
    deltaBytes: string;
  }

  interface HeapControllerScope extends ng.IScope {
    classHistogram: string;
    status: string;
    loading: boolean;
    pid: string;
    lastLoaded: any;
    loadClassStats: () => void;
    classes: Array<ClassStats>;
    tableDef: any;
    pageTitle: string;
    instanceCounts: any;
    byteCounts: any;
    tableConfig: any;
    tableDtOptions: any;
    tableColumns : Array<any>;
    closeMessageForGood : (key: string) => void;
    isMessageVisible : (key: string) => boolean;
  }

  _module.controller("Diagnostics.HeapController", ["$scope", "jolokia", ($scope: HeapControllerScope, jolokia: Jolokia.IJolokia) => {

    $scope.classHistogram = '';
    $scope.status = '';
    $scope.classes = [{
      num: null,
      count: null,
      bytes: null,
      deltaBytes: null,
      deltaCount: null,
      name: 'Click refresh to read class histogram'
    }];
    $scope.tableConfig = {
      selectionMatchProp: 'name',
      showCheckboxes: false
    };

    $scope.tableDtOptions = {
      order: [[0, "asc"]]
    };

    $scope.tableColumns = [
      {
        header: '#',
        itemField: 'num'
      },
      {
        header: 'Instances',
        itemField: 'count'
      },
      {
        header: '<delta',
        itemField: 'deltaCount'
      },
      {
        header: 'Bytes',
        itemField: 'bytes'
      },
      {
        header: '<delta',
        itemField: 'deltaBytes'
      },
      {
        header: 'Class name',
        itemField: 'name'
      }
    ];

    $scope.loading = false;
    $scope.lastLoaded = 'n/a';
    $scope.pid = findMyPid($scope.pageTitle);

    $scope.loadClassStats = () => {
      $scope.loading = true;
      Core.$apply($scope);
      jolokia.request({
        type: 'exec',
        mbean: 'com.sun.management:type=DiagnosticCommand',
        operation: 'gcClassHistogram([Ljava.lang.String;)',
        arguments: ['']
      }, {
        success: render,
        error: (response) => {
          $scope.status = 'Could not get class histogram : ' + response.error;
          $scope.loading = false;
          Core.$apply($scope);
        }
      });
    };

    $scope.closeMessageForGood = (key : string) => {
      localStorage[key] = "false";
    };

    $scope.isMessageVisible = (key: string) => {
      return localStorage[key] !== "false";
    };



    function render(response) {
      $scope.classHistogram = response.value;
      const lines = response.value.split('\n');
      const parsed = [];
      const classCounts = {};
      const bytesCounts = {};
      for (let i = 0; i < lines.length; i++) {
        const values = lines[i].match(/\s*(\d+):\s*(\d+)\s*(\d+)\s*(\S+)\s*/);
        if (values && values.length >= 5) {
          const className = translateJniName(values[4]);
          const count = values[2];
          const bytes = values[3];
          const entry = {
            num: values[1],
            count: count,
            bytes: bytes,
            name: className,
            deltaCount: findDelta($scope.instanceCounts, className, count),
            deltaBytes: findDelta($scope.byteCounts, className, bytes)
          };

          parsed.push(entry);
          classCounts[className] = count;
          bytesCounts[className] = bytes;
        }
      }
      $scope.classes = parsed;
      $scope.instanceCounts = classCounts;
      $scope.byteCounts = bytesCounts;
      $scope.loading = false;
      $scope.lastLoaded = Date.now();
      Core.$apply($scope);
    }

    function findDelta(oldCounts, className, newValue) {
      if (!oldCounts) {
        return '';
      }
      const oldValue = oldCounts[className];
      if (oldValue) {
        return oldValue - newValue;
      } else {
        return newValue;
      }
    }

    function translateJniName(name) {
      if (name.length == 1) {
        switch (name.charAt(0)) {
          case 'I':
            return 'int';
          case 'S':
            return 'short';
          case 'C':
            return 'char';
          case 'Z':
            return 'boolean';
          case 'D':
            return 'double';
          case 'F':
            return 'float';
          case 'J':
            return 'long';
          case 'B':
            return 'byte';
        }
      } else {
        switch (name.charAt(0)) {
          case '[':
            return translateJniName(name.substring(1)) + '[]';
          case 'L':
            if (name.endsWith(';')) {
              return translateJniName(name.substring(1, name.indexOf(';')));
            }
          default:
            return name;
        }
      }

    }


  }]);

}
