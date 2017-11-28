/// <reference path="./jmxPlugin.ts"/>

namespace Jmx {

  export let propertiesColumnDefs = [
    {
      field: 'name',
      displayName: 'Attribute',
      cellTemplate: `
        <div class="ngCellText" title="{{row.entity.attrDesc}}" data-placement="bottom">
          <div ng-show="!inDashboard" class="inline" compile="row.entity.getDashboardWidgets()"></div>
          <a href="" ng-click="row.entity.onViewAttribute()">{{row.entity.name}}</a>
        </div>
      `
    },
    {
      field: 'value',
      displayName: 'Value',
      cellTemplate: `
        <div class="ngCellText mouse-pointer"
             ng-click="row.entity.onViewAttribute()"
             title="{{row.entity.tooltip}}"
             ng-bind-html="row.entity.summary"></div>
      `
    }
  ];

  export let foldersColumnDefs = [
    {
      displayName: 'Name',
      cellTemplate: `
        <div class="ngCellText">
          <a href="" ng-click="row.entity.gotoFolder(row)">
            <i class="{{row.entity.folderIconClass(row)}}"></i> {{row.getProperty("title")}}
          </a>
        </div>
      `
    }
  ];

  export let AttributesController = _module.controller("Jmx.AttributesController", ["$scope", "$element", "$location", "workspace", "jolokia", "jolokiaUrl", "jmxWidgets", "jmxWidgetTypes", "$templateCache", "localStorage", "$browser", "$timeout", (
      $scope,
      $element,
      $location: ng.ILocationService,
      workspace: Workspace,
      jolokia: Jolokia.IJolokia,
      jolokiaUrl: string,
      jmxWidgets,
      jmxWidgetTypes,
      $templateCache: ng.ITemplateCacheService,
      localStorage: Storage,
      $browser,
      $timeout: ng.ITimeoutService) => {

    $scope.searchText = '';
    $scope.nid = 'empty';
    $scope.selectedItems = [];

    $scope.lastKey = null;
    $scope.attributesInfoCache = {};

    $scope.entity = {};
    $scope.attributeSchema = {};
    $scope.gridData = [];
    $scope.attributes = "";

    $scope.$watch('gridData.length', (newValue, oldValue) => {
      if (newValue !== oldValue) {
        if (newValue > 0) {
          $scope.attributes = $templateCache.get('gridTemplate');
        } else {
          $scope.attributes = "";
        }
      }
    });

    const attributeSchemaBasic = {
      properties: {
        'key': {
          type: 'string',
          readOnly: 'true'
        },
        'description': {
          description: 'Description',
          type: 'string',
          formTemplate: "<textarea class='form-control' rows='2' readonly='true'></textarea>"
        },
        'type': {
          type: 'string',
          readOnly: 'true'
        },
        'jolokia': {
          label: 'Jolokia&nbsp;URL',
          type: 'string',
          readOnly: 'true'
        }
      }
    };

    $scope.gridOptions = {
      scope: $scope,
      selectedItems: [],
      showFilter: false,
      canSelectRows: false,
      enableRowSelection: false,
      enableRowClickSelection: false,
      keepLastSelected: false,
      multiSelect: true,
      showColumnMenu: true,
      displaySelectionCheckbox: false,
      filterOptions: {
        filterText: ''
      },
      // TODO disabled for now as it causes https://github.com/hawtio/hawtio/issues/262
      //sortInfo: { field: 'name', direction: 'asc'},
      data: 'gridData',
      columnDefs: propertiesColumnDefs
    };

    $scope.$watch(
      (scope) => scope.gridOptions.selectedItems.map((item) => item.key || item),
      (newValue, oldValue) => {
        if (newValue !== oldValue) {
          log.debug("Selected items:", newValue);
          $scope.selectedItems = newValue;
        }
      },
      true);

    // clear selection if we clicked the jmx nav bar button
    // otherwise we may show data from Camel/ActiveMQ or other plugins that
    // reuse the JMX plugin for showing tables (#884)
    let currentUrl = $location.url();
    if (_.endsWith(currentUrl, "/jmx/attributes")) {
      log.debug("Reset selection in JMX plugin");
      workspace.selection = null;
      $scope.lastKey = null;
    }
    $scope.nid = $location.search()['nid'];
    log.debug("nid: ", $scope.nid);

    let updateTable = _.debounce(updateTableContents, 50, { leading: false, trailing: true });

    $scope.$on('jmxTreeUpdated', updateTable);

    $scope.$watch('gridOptions.filterOptions.filterText', (newValue, oldValue) => {
      if (newValue !== oldValue) {
        updateTable();
      }
    });

    updateTable();

    $scope.onCancelAttribute = () => {
      // clear entity
      $scope.entity = {};
    };

    $scope.onUpdateAttribute = () => {
      let value = $scope.entity["attrValueEdit"];
      let key = $scope.entity["key"];

      // clear entity
      $scope.entity = {};

      // TODO: check if value changed

      // update the attribute on the mbean
      let mbean = workspace.getSelectedMBeanName();
      if (mbean) {
        jolokia.setAttribute(mbean, key, value,
          Core.onSuccess((response) => {
            Core.notification("success", "Updated attribute " + key);
          }));
      }
    };

    function onViewAttribute(row: any): void {
      if (!row.summary) {
        return;
      }
      // create entity and populate it with data from the selected row
      $scope.entity = {
        key: row.key,
        description: row.attrDesc,
        type: row.type,
        jolokia: buildJolokiaUrl(row.key),
        rw: row.rw
      };

      // calculate a textare with X number of rows that usually fit the value to display
      let len = row.summary.length;
      let rows = (len / 40) + 1;
      if (rows > 10) {
        // cap at most 10 rows to not make the dialog too large
        rows = 10;
      }

      let readOnly = !row.rw;
      if (readOnly) {
        // if the value is empty its a &nbsp; as we need this for the table to allow us to click on the empty row
        if (row.summary === '&nbsp;') {
          $scope.entity["attrValueView"] = '';
        } else {
          $scope.entity["attrValueView"] = row.summary;
        }
        initAttributeSchemaView($scope, rows);
      } else {
        // if the value is empty its a &nbsp; as we need this for the table to allow us to click on the empty row
        if (row.summary === '&nbsp;') {
          $scope.entity["attrValueEdit"] = '';
        } else {
          $scope.entity["attrValueEdit"] = row.summary;
        }
        initAttributeSchemaEdit($scope, rows);
      }

      $scope.showAttributeDialog = true;
    }

    function buildJolokiaUrl(attribute): string {
      let mbeanName = Core.escapeMBean(workspace.getSelectedMBeanName());
      return `${jolokiaUrl}/read/${mbeanName}/${attribute}`;
    }

    function initAttributeSchemaView($scope, rows: number): void {
      // clone from the basic schema to the new schema we create on-the-fly
      // this is needed as the dialog have problems if reusing the schema, and changing the schema afterwards
      // so its safer to create a new schema according to our needs
      $scope.attributeSchemaView = {};
      for (let i in attributeSchemaBasic) {
        $scope.attributeSchemaView[i] = attributeSchemaBasic[i];
      }
      // and add the new attrValue which is dynamic computed
      $scope.attributeSchemaView.properties.attrValueView = {
        description: 'Value',
        label: "Value",
        type: 'string',
        formTemplate: `<textarea class='form-control' rows='${rows}' readonly='true'></textarea>`
      };
      $scope.attributeSchemaView.properties.copyAttrValueViewToClipboard = {
        label: '&nbsp;',
        type: 'string',
        formTemplate: `
          <button class="btn btn-sm btn-default btn-clipboard pull-right" data-clipboard-text="{{entity.attrValueView}}"
                  title="Copy value to clipboard" aria-label="Copy value to clipboard">
            <i class="fa fa-clipboard" aria-hidden="true"></i>
          </button>
        `
      };
      // just to be safe, then delete not needed part of the schema
      if ($scope.attributeSchemaView) {
        delete $scope.attributeSchemaView.properties.attrValueEdit;
        delete $scope.attributeSchemaView.properties.copyAttrValueEditToClipboard;
      }
    }

    function initAttributeSchemaEdit($scope, rows: number): void {
      // clone from the basic schema to the new schema we create on-the-fly
      // this is needed as the dialog have problems if reusing the schema, and changing the schema afterwards
      // so its safer to create a new schema according to our needs
      $scope.attributeSchemaEdit = {};
      for (let i in attributeSchemaBasic) {
        $scope.attributeSchemaEdit[i] = attributeSchemaBasic[i];
      }
      // and add the new attrValue which is dynamic computed
      $scope.attributeSchemaEdit.properties.attrValueEdit = {
        description: 'Value',
        label: "Value",
        type: 'string',
        formTemplate: `<textarea class='form-control' rows='${rows}'></textarea>`
      };
      $scope.attributeSchemaEdit.properties.copyAttrValueEditToClipboard = {
        label: '&nbsp;',
        type: 'string',
        formTemplate: `
          <button class="btn btn-sm btn-default btn-clipboard pull-right" data-clipboard-text="{{entity.attrValueEdit}}"
                  title="Copy value to clipboard" aria-label="Copy value to clipboard">
            <i class="fa fa-clipboard" aria-hidden="true"></i>
          </button>
        `
      };
      // just to be safe, then delete not needed part of the schema
      if ($scope.attributeSchemaEdit) {
        delete $scope.attributeSchemaEdit.properties.attrValueView;
        delete $scope.attributeSchemaEdit.properties.copyAttrValueViewToClipboard;
      }
    }

    $scope.invokeSelectedMBeans = (operationName, completeFunction: () => any = null) => {
      let queries = [];
      angular.forEach($scope.selectedItems || [], (item) => {
        let mbean = item["_id"];
        if (mbean) {
          let opName = operationName;
          if (angular.isFunction(operationName)) {
            opName = operationName(item);
          }
          queries.push({ type: "exec", operation: opName, mbean: mbean });
        }
      });
      if (queries.length) {
        let callback = () => {
          if (completeFunction) {
            completeFunction();
          } else {
            operationComplete();
          }
        };
        jolokia.request(queries, Core.onSuccess(callback, { error: callback }));
      }
    };

    function operationComplete() {
      updateTableContents();
    }

    function updateTableContents() {
      // lets clear any previous queries just in case!
      Core.unregister(jolokia, $scope);

      $scope.gridData = [];
      $scope.mbeanIndex = null;
      let mbean = workspace.getSelectedMBeanName();
      let request = null;
      let node = workspace.selection;
      if (node === null || angular.isUndefined(node) || node.key !== $scope.lastKey) {
        // cache attributes info, so we know if the attribute is read-only or read-write, and also the attribute description
        $scope.attributesInfoCache = null;

        if (mbean == null) {
          // in case of refresh
          let _key = $location.search()['nid'];
          let _node = workspace.keyToNodeMap[_key];
          if (_node) {
            mbean = _node.objectName;
          }
        }

        if (mbean) {
          let asQuery = (node) => {
            let path = Core.escapeMBeanPath(node);
            let query = {
              type: "LIST",
              method: "post",
              path: path,
              ignoreErrors: true
            };
            return query;
          };
          let infoQuery = asQuery(mbean);
          jolokia.request(infoQuery, Core.onSuccess((response) => {
            $scope.attributesInfoCache = response.value;
            log.debug("Updated attributes info cache for mbean " + mbean);
          }));
        }
      }

      if (mbean) {
        request = { type: 'read', mbean: mbean };
        if (node === null || angular.isUndefined(node) || node.key !== $scope.lastKey) {
          $scope.gridOptions.columnDefs = propertiesColumnDefs;
          $scope.gridOptions.enableRowClickSelection = false;
        }
      } else if (node) {
        if (node.key !== $scope.lastKey) {
          $scope.gridOptions.columnDefs = [];
          $scope.gridOptions.enableRowClickSelection = true;
        }
        // lets query each child's details
        let children = node.children;
        if (children) {
          let childNodes = children.map((child) => child.objectName);
          let mbeans = childNodes.filter((mbean) => FilterHelpers.search(mbean, $scope.gridOptions.filterOptions.filterText));
          let maxFolderSize = localStorage["jmxMaxFolderSize"];
          mbeans = mbeans.slice(0, maxFolderSize);
          if (mbeans) {
            let typeNames = Jmx.getUniqueTypeNames(children);
            if (typeNames.length <= 1) {
              let query = mbeans.map((mbean) => {
                return { type: "READ", mbean: mbean, ignoreErrors: true };
              });
              if (query.length > 0) {
                request = query;

                // deal with multiple results
                $scope.mbeanIndex = {};
                $scope.mbeanRowCounter = 0;
                $scope.mbeanCount = mbeans.length;
              }
            } else {
              console.log("Too many type names " + typeNames);
            }
          }
        }
      }
      let callback = Core.onSuccess(render);
      if (request) {
        $scope.request = request;
        Core.register(jolokia, $scope, request, callback);
      } else if (node) {
        if (node.key !== $scope.lastKey) {
          $scope.gridOptions.columnDefs = foldersColumnDefs;
          $scope.gridOptions.enableRowClickSelection = true;
        }
        $scope.gridData = node.children;
        addHandlerFunctions($scope.gridData);
      }
      if (node) {
        $scope.lastKey = node.key;
        $scope.title = node.text;
      }
      Core.$apply($scope);
    }

    function render(response) {
      let data = response.value;
      let mbeanIndex = $scope.mbeanIndex;
      let mbean = response.request['mbean'];

      if (mbean) {
        // lets store the mbean in the row for later
        data["_id"] = mbean;
      }
      if (mbeanIndex) {
        if (mbean) {

          let idx = mbeanIndex[mbean];
          if (!angular.isDefined(idx)) {
            idx = $scope.mbeanRowCounter;
            mbeanIndex[mbean] = idx;
            $scope.mbeanRowCounter += 1;
          }
          if (idx === 0) {
            // this is to force the table to repaint
            $scope.selectedIndices = $scope.selectedItems.map((item) => $scope.gridData.indexOf(item));
            $scope.gridData = [];

            if (!$scope.gridOptions.columnDefs.length) {
              // lets update the column definitions based on any configured defaults

              let key = workspace.selectionConfigKey();
              $scope.gridOptions.gridKey = key;
              $scope.gridOptions.onClickRowHandlers = workspace.onClickRowHandlers;
              let defaultDefs = _.clone(workspace.attributeColumnDefs[key]) || [];
              let defaultSize = defaultDefs.length;
              let map = {};
              angular.forEach(defaultDefs, (value, key) => {
                let field = value.field;
                if (field) {
                  map[field] = value
                }
              });

              let extraDefs = [];
              angular.forEach(data, (value, key) => {
                if (includePropertyValue(key, value)) {
                  if (!map[key]) {
                    extraDefs.push({
                      field: key,
                      displayName: key === '_id' ? 'Object name' : Core.humanizeValue(key),
                      visible: defaultSize === 0
                    });
                  }
                }
              });

              // the additional columns (which are not pre-configured), should be sorted
              // so the column menu has a nice sorted list instead of random ordering
              extraDefs = extraDefs.sort((def, def2) => {
                // make sure _id is last
                if (_.startsWith(def.field, '_')) {
                  return 1;
                } else if (_.startsWith(def2.field, '_')) {
                  return -1;
                }
                return def.field.localeCompare(def2.field);
              });
              extraDefs.forEach(e => defaultDefs.push(e));

              if (extraDefs.length > 0) {
                $scope.hasExtraColumns = true;
              }

              $scope.gridOptions.columnDefs = defaultDefs;
              $scope.gridOptions.enableRowClickSelection = true;
            }
          }
          // mask attribute read error
          angular.forEach(data, (value, key) => {
            if (includePropertyValue(key, value)) {
              data[key] = maskReadError(value);
            }
          });
          // assume 1 row of data per mbean
          $scope.gridData[idx] = data;
          addHandlerFunctions($scope.gridData);

          let count = $scope.mbeanCount;
          if (!count || idx + 1 >= count) {
            // only cause a refresh on the last row
            let newSelections = $scope.selectedIndices.map((idx) => $scope.gridData[idx]).filter((row) => row);
            $scope.selectedItems.splice(0, $scope.selectedItems.length);
            $scope.selectedItems.push.apply($scope.selectedItems, newSelections);
            //console.log("Would have selected " + JSON.stringify($scope.selectedItems));
            Core.$apply($scope);
          }
          // if the last row, then fire an event
        } else {
          console.log("No mbean name in request " + JSON.stringify(response.request));
        }
      } else {
        $scope.gridOptions.columnDefs = propertiesColumnDefs;
        $scope.gridOptions.enableRowClickSelection = false;
        let showAllAttributes = true;
        if (angular.isObject(data)) {
          let properties = Array();
          angular.forEach(data, (value, key) => {
            if (showAllAttributes || includePropertyValue(key, value)) {
              // always skip keys which start with _
              if (!_.startsWith(key, "_")) {
                // lets format the ObjectName nicely dealing with objects with
                // nested object names or arrays of object names
                if (key === "ObjectName") {
                  value = unwrapObjectName(value);
                }
                // lets unwrap any arrays of object names
                if (angular.isArray(value)) {
                  value = value.map((v) => {
                    return unwrapObjectName(v);
                  });
                }
                // the value must be string as the sorting/filtering of the table relies on that
                let type = lookupAttributeType(key);
                let data = {
                  key: key,
                  name: Core.humanizeValue(key),
                  value: maskReadError(Core.safeNullAsString(value, type))
                };

                generateSummaryAndDetail(key, data);
                properties.push(data);
              }
            }
          });
          if (!_.some(properties, (p) => {
            return p['key'] === 'ObjectName';
          })) {
            let objectName = {
              key: "ObjectName",
              name: "Object Name",
              value: mbean
            };
            generateSummaryAndDetail(objectName.key, objectName);
            properties.push(objectName);
          }
          properties = _.sortBy(properties, 'name');
          $scope.selectedItems = [data];
          data = properties;
        }
        $scope.gridData = data;
        addHandlerFunctions($scope.gridData);
        Core.$apply($scope);
      }
    }

    function maskReadError(value) {
      if (typeof value !== 'string') {
        return value;
      }
      let forbidden = /^ERROR: Reading attribute .+ \(class java\.lang\.SecurityException\)$/;
      let unsupported = /^ERROR: java\.lang\.UnsupportedOperationException: .+ \(class javax\.management\.RuntimeMBeanException\)$/;
      if (value.match(forbidden)) {
        return "**********";
      } else if (value.match(unsupported)) {
        return "(Not supported)";
      } else {
        return value;
      }
    }

    function addHandlerFunctions(data) {
      data.forEach((item) => {
        item['inDashboard'] = $scope.inDashboard;
        item['getDashboardWidgets'] = () => getDashboardWidgets(item);
        item['onViewAttribute'] = () => onViewAttribute(item);
        item['folderIconClass'] = (row) => folderIconClass(row);
        item['gotoFolder'] = (row) => gotoFolder(row);
      });
    }

    function getDashboardWidgets(row: any): string {
      let mbean = workspace.getSelectedMBeanName();
      if (!mbean) {
        return '';
      }
      let potentialCandidates = _.filter(jmxWidgets, (widget: any) => {
        return mbean === widget.mbean;
      });

      if (potentialCandidates.length === 0) {
        return '';
      }

      potentialCandidates = _.filter(potentialCandidates, (widget: any) => {
        return widget.attribute === row.key || widget.total === row.key;
      });

      if (potentialCandidates.length === 0) {
        return '';
      }

      row.addChartToDashboard = (type) => $scope.addChartToDashboard(row, type);

      let rc = [];
      potentialCandidates.forEach((widget) => {
        let widgetType = Jmx.getWidgetType(widget);
        rc.push(`
              <i class="${widgetType['icon']} clickable"
                 title="${widgetType['title']}"
                 ng-click="row.entity.addChartToDashboard('${widgetType['type']}')"></i>
            `);
      });
      return rc.join() + "&nbsp;";
    }

    $scope.addChartToDashboard = (row, widgetType) => {
      let mbean = workspace.getSelectedMBeanName();
      let candidates = jmxWidgets
        .filter((widget: any) => mbean === widget.mbean)
        .filter((widget: any) => widget.attribute === row.key || widget.total === row.key)
        .filter((widget: any) => widget.type === widgetType);

      // hmmm, we really should only have one result...
      let widget = _.first(candidates);
      let type = getWidgetType(widget);

      $location.url(Jmx.createDashboardLink(type, widget));
    };

    function folderIconClass(row: any): string {
      // TODO lets ignore the classes property for now
      // as we don't have an easy way to know if there is an icon defined for an icon or not
      // and we want to make sure there always is an icon shown
      /*
       let classes = (row.getProperty("addClass") || "").trim();
       if (classes) {
       return classes;
       }
       */
      if (!row.getProperty) {
        return '';
      }
      return row.getProperty('objectName') ? 'fa fa-cog' : 'pficon pficon-folder-close';
    }

    function gotoFolder(row: any): void {
      if (row.getProperty) {
        let key = row.getProperty('key');
        if (key) {
          $location.search('nid', key);
        }
      }
    }

    function unwrapObjectName(value) {
      if (!angular.isObject(value)) {
        return value;
      }
      let keys = Object.keys(value);
      if (keys.length === 1 && keys[0] === "objectName") {
        return value["objectName"];
      }
      return value;
    }

    function generateSummaryAndDetail(key, data) {
      let value = Core.escapeHtml(data.value);
      if (!angular.isArray(value) && angular.isObject(value)) {
        let detailHtml = "<table class='table table-striped'>";
        let summary = "";
        let object = value;
        let keys = Object.keys(value).sort();
        angular.forEach(keys, (key) => {
          let value = object[key];
          detailHtml += `<tr><td>${Core.humanizeValue(key)}</td><td>${value}</td></tr>`;
          summary += `${Core.humanizeValue(key)}: ${value}  `;
        });
        detailHtml += "</table>";
        data.summary = summary;
        data.detailHtml = detailHtml;
        data.tooltip = summary;
      } else {
        let text = value;
        // if the text is empty then use a no-break-space so the table allows us to click on the row,
        // otherwise if the text is empty, then you cannot click on the row
        if (text === '') {
          text = '&nbsp;';
          data.tooltip = "";
        } else {
          data.tooltip = text;
        }
        data.summary = `${text}`;
        data.detailHtml = `<pre>${text}</pre>`;
        if (angular.isArray(value)) {
          let html = "<ul>";
          angular.forEach(value, (item) => html += `<li>${item}</li>`);
          html += "</ul>";
          data.detailHtml = html;
        }
      }

      // enrich the data with information if the attribute is read-only/read-write, and the JMX attribute description (if any)
      data.rw = false;
      data.attrDesc = data.name;
      data.type = "string";
      if ($scope.attributesInfoCache != null && 'attr' in $scope.attributesInfoCache) {
        let info = $scope.attributesInfoCache.attr[key];
        if (angular.isDefined(info)) {
          data.rw = info.rw;
          data.attrDesc = info.desc;
          data.type = info.type;
        }
      }
    }

    function lookupAttributeType(key) {
      if ($scope.attributesInfoCache != null && 'attr' in $scope.attributesInfoCache) {
        let info = $scope.attributesInfoCache.attr[key];
        if (angular.isDefined(info)) {
          return info.type;
        }
      }
      return null;
    }

    function includePropertyValue(key: string, value) {
      return !angular.isObject(value);
    }

  }]);

}
