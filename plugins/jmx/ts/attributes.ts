/**
 * @module Jmx
 */
/// <reference path="./jmxPlugin.ts"/>
module Jmx {

  export var propertiesColumnDefs = [
    {
      field: 'name',
      displayName: 'Property',
      width: "27%",
      cellTemplate: '<div class="ngCellText" title="{{row.entity.attrDesc}}" data-placement="bottom">' +
        '<a href="" ng-click="row.entity.onViewAttribute()">{{row.entity.name}}</a></div>'},
    {
      field: 'value',
      displayName: 'Value',
      width: "70%",
      cellTemplate: '<div class="ngCellText mouse-pointer" ng-click="row.entity.onViewAttribute()" title="{{row.entity.tooltip}}" ng-bind-html="row.entity.summary"></div>'
    }
  ];

  export var foldersColumnDefs = [
    {
      displayName: 'Name',
      cellTemplate: '<div class="ngCellText"><a href="{{row.entity.folderHref(row)}}"><i class="{{row.entity.folderIconClass(row)}}"></i> {{row.getProperty("title")}}</a></div>'
    }
  ];

  export var AttributesController = _module.controller("Jmx.AttributesController", ["$scope", "$element", "$location", "workspace", "jolokia", "jolokiaUrl", "jmxWidgets", "jmxWidgetTypes", "$templateCache", "localStorage", "$browser", "HawtioDashboard", ($scope,
                                       $element,
                                       $location,
                                       workspace:Workspace,
                                       jolokia,
                                       jolokiaUrl,
                                       jmxWidgets,
                                       jmxWidgetTypes,
                                       $templateCache,
                                       localStorage,
                                        $browser, dash) => {
    $scope.searchText = '';
    $scope.nid = 'empty';
    $scope.selectedItems = [];

    $scope.lastKey = null;
    $scope.attributesInfoCache = {};
    $scope.workspace = workspace;

    $scope.entity = {};
    $scope.attributeSchema = {};
    $scope.gridData = [];
    $scope.attributes = "";
    $scope.inDashboard = dash.inDashboard;

    $scope.$watch('gridData.length', (newValue, oldValue) => {
      if (newValue !== oldValue) {
        if (newValue > 0) {
          $scope.attributes = $templateCache.get('gridTemplate');
        } else {
          $scope.attributes = "";
        }
      }
    });

    var attributeSchemaBasic = {
      style: HawtioForms.FormStyle.STANDARD,
      mode: HawtioForms.FormMode.VIEW,
      hideLegend: true,
      properties: {
        'key': {
          label: 'Key',
          tooltip: 'Attribute key',
          type: 'static'
        },
        'attrDesc': {
          label: 'Description',
          type: 'static'
        },
        'type': {
          label: 'Type',
          tooltip: 'Attribute type',
          type: 'static'
        },
        'jolokia': {
          label: 'Jolokia URL',
          tooltip: 'Jolokia REST URL',
          type: 'string',
          'input-attributes': {
            readonly: true
          }
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
      keepLastSelected: true,
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

    $scope.$watch(function($scope) {
      return $scope.gridOptions.selectedItems.map(item => item);
    }, (newValue, oldValue) => {
      if (newValue !== oldValue) {
        log.debug("Selected items: ", newValue);
        $scope.selectedItems = newValue;
      }
    }, true);

    var doUpdateTableContents = _.debounce(updateTableContents, 100, { trailing: true });

    $scope.$on("$routeChangeSuccess", function (event, current, previous) {
      // lets do this asynchronously to avoid Error: $digest already in progress
      $scope.nid = $location.search()['nid'];
      setTimeout(() => {
        doUpdateTableContents();
      }, 10);
    });

    $scope.$watch('workspace.selection', function () {
      if (workspace.moveIfViewInvalid()) {
        Core.unregister(jolokia, $scope);
        return;
      }
      setTimeout(() => {
        doUpdateTableContents();
      }, 10);
    });

    doUpdateTableContents();

    $scope.hasWidget = (row) => {
      return true;
    };

    $scope.onCancelAttribute = () => {
      // clear entity
      $scope.entity = {};
    }

    $scope.onUpdateAttribute = () => {
      var value = $scope.entity["value"];
      var key = $scope.entity["key"];

      // clear entity
      $scope.entity = {};

      // TODO: check if value changed

      // update the attribute on the mbean
      var mbean = workspace.getSelectedMBeanName();
      if (mbean) {
        jolokia.setAttribute(mbean, key, value,
          Core.onSuccess((response) => {
              Core.notification("success", "Updated attribute " + key);
            }
          ));
      }
    };

    $scope.onViewAttribute = (row) => {
      if (!row.summary) {
        return;
      }
      var entity:any = $scope.entity = _.cloneDeep(row);
      var schema:any = $scope.attributeSchema = _.cloneDeep(attributeSchemaBasic);
      if (entity.key === "ObjectName") {
        // ObjectName is calculated locally
        delete schema.properties.jolokia;
      } else {
        entity.jolokia = getUrlForThing(jolokiaUrl, "read", workspace.getSelectedMBeanName(), entity.key);
      }
      schema.properties.value = {
        formTemplate: '<div class="form-group"><label class="control-label">Value</label><div hawtio-editor="entity.value"></div></div>'
      }
      $scope.showAttributeDialog = true;
    }

    $scope.getDashboardWidgets = (row) => {
      var mbean = workspace.getSelectedMBeanName();
      if (!mbean) {
        return '';
      }
      var potentialCandidates = _.filter(jmxWidgets, (widget:any) => {
        return mbean === widget.mbean;
      });

      if (potentialCandidates.length === 0) {
        return '';
      }

      potentialCandidates = _.filter(potentialCandidates, (widget:any) => {
        return widget.attribute === row.key || widget.total === row.key;
      });

      if (potentialCandidates.length === 0) {
        return '';
      }

      row.addChartToDashboard = (type) => {
        $scope.addChartToDashboard(row, type);
      }

      var rc = [];
      potentialCandidates.forEach((widget) => {
        var widgetType = Jmx.getWidgetType(widget);
        rc.push("<i class=\"" + widgetType['icon'] + " clickable\" title=\"" + widgetType['title'] + "\" ng-click=\"row.entity.addChartToDashboard('" + widgetType['type'] + "')\"></i>");

      });
      return rc.join() + "&nbsp;";
    };

    $scope.addChartToDashboard = (row, widgetType) => {
      var mbean = workspace.getSelectedMBeanName();
      var candidates = jmxWidgets.filter((widget) => {
        return mbean === widget.mbean;
      });

      candidates = candidates.filter((widget) => {
        return widget.attribute === row.key || widget.total === row.key;
      });

      candidates = candidates.filter((widget) => {
        return widget.type === widgetType;
      });

      // hmmm, we really should only have one result...
      var widget = _.first(candidates);
      var type = getWidgetType(widget);

      //console.log("widgetType: ", type, " widget: ", widget);

      $location.url(Jmx.createDashboardLink(type, widget));
    };

    /*
     * Returns the toolBar template HTML to use for the current selection
     */
    $scope.toolBarTemplate = () => {
      // lets lookup the list of helpers by domain
      var answer = Jmx.getAttributeToolBar(workspace.selection);

      // TODO - maybe there's a better way to determine when to enable selections

      /*
       if (answer.startsWith("app/camel") && workspace.selection.children.length > 0) {
       $scope.selectToggle.setSelect(true);
       } else {
       $scope.selectToggle.setSelect(false);
       }
       */
      return answer;
    };

    $scope.invokeSelectedMBeans = (operationName, completeFunction:() => any = null) => {
      var queries = [];
      angular.forEach($scope.selectedItems || [], (item) => {
        var mbean = item["_id"];
        if (mbean) {
          var opName = operationName;
          if (angular.isFunction(operationName)) {
            opName = operationName(item);
          }
          //console.log("Invoking operation " + opName + " on " + mbean);
          queries.push({type: "exec", operation: opName, mbean: mbean});
        }
      });
      if (queries.length) {
        var callback = () => {
          if (completeFunction) {
            completeFunction();
          } else {
            operationComplete();
          }
        };
        jolokia.request(queries, Core.onSuccess(callback, {error: callback}));
      }
    };

    $scope.folderHref = (row) => {
      if (!row.getProperty) {
        return "";
      }
      var key = row.getProperty("key");
      if (key) {
        return Core.createHref($location, "#" + $location.path() + "?nid=" + key, ["nid"]);
      } else {
        return "";
      }
    };

    $scope.folderIconClass = (row) => {
      // TODO lets ignore the classes property for now
      // as we don't have an easy way to know if there is an icon defined for an icon or not
      // and we want to make sure there always is an icon shown
      /*
       var classes = (row.getProperty("addClass") || "").trim();
       if (classes) {
       return classes;
       }
       */
      if (!row.getProperty) {
        return "";
      }
      return row.getProperty("objectName") ? "fa fa-cog" : "fa fa-folder-close";
    };

    function operationComplete() {
      updateTableContents();
    }

    function updateTableContents() {
      // lets clear any previous queries just in case!
      Core.unregister(jolokia, $scope);
      if (!$scope.gridData) {
        $scope.gridData = [];
      } else {
        $scope.gridData.length = 0;
      }

      $scope.mbeanIndex = null;
      var mbean = workspace.getSelectedMBeanName();
      var request = <any>null;
      var node = workspace.getSelectedMBean();
      if (node === null || angular.isUndefined(node) || node.key !== $scope.lastKey) {
        // cache attributes info, so we know if the attribute is read-only or read-write, and also the attribute description
        $scope.attributesInfoCache = null;

        if(mbean == null) {
          // in case of refresh
          var _key = $location.search()['nid'];
          var _node = workspace.keyToNodeMap[_key];
          if (_node) {
            mbean = _node.objectName;
          }
        }

        if (mbean) {
          var asQuery = (node) => {
            var path = Core.escapeMBeanPath(node);
            var query = {
              type: "LIST",
              method: "post",
              path: path,
              ignoreErrors: true
            };
            return query;
          };
          var infoQuery = asQuery(mbean);
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
          $scope.gridOptions.enableRowSelection = false;
          $scope.gridOptions.displaySelectionCheckbox = false;
          $scope.gridOptions.canSelectRows = false;
        }
      } else if (node) {
        if (node.key !== $scope.lastKey) {
          $scope.gridOptions.columnDefs = [];
          $scope.gridOptions.enableRowClickSelection = true;
          $scope.gridOptions.enableRowClickSelection = true;
          $scope.gridOptions.enableRowSelection = true;
          $scope.gridOptions.displaySelectionCheckbox = true;
          $scope.gridOptions.canSelectRows = true;
        }
        // lets query each child's details
        var children = node.children;
        if (children) {
          var childNodes = children.map((child) => child.objectName);
          var mbeans = childNodes.filter((mbean) => mbean !== undefined);
          if (mbeans) {
            var typeNames = Jmx.getUniqueTypeNames(children);
            if (typeNames.length <= 1) {
              var query = mbeans.map((mbean) => {
                return { type: "READ", mbean: mbean, ignoreErrors: true};
              });
              if (query.length > 0) {
                request = query;

                // deal with multiple results
                $scope.mbeanIndex = {};
                $scope.mbeanRowCounter = 0;
                $scope.mbeanCount = mbeans.length;
                //$scope.columnDefs = [];
              }
            } else {
              console.log("Too many type names " + typeNames);
            }
          }
        }
      }
      //var callback = Core.onSuccess(render, { error: render });
      var callback = Core.onSuccess(render);
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
        Core.$apply($scope);
      }
      if (node) {
        $scope.lastKey = node.key;
      }
    }

    function render(response) {
      var data = response.value;
      var mbeanIndex = $scope.mbeanIndex;
      var mbean = response.request['mbean'];

      if (mbean) {
        // lets store the mbean in the row for later
        data["_id"] = mbean;
      }
      if (mbeanIndex) {
        if (mbean) {

          var idx = mbeanIndex[mbean];
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
              var key = workspace.selectionConfigKey();
              var defaultDefs = workspace.attributeColumnDefs[key] || [];
              var defaultSize = defaultDefs.length;
              var map = {};
              angular.forEach(defaultDefs, (value, key) => {
                var field = value.field;
                if (field) {
                  map[field] = value
                }
              });

              var extraDefs = [];
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
              extraDefs.forEach(e => {
                defaultDefs.push(e);
              })

              // remove all non visible
              defaultDefs = _.filter(defaultDefs, (value:any) => {
                if (angular.isDefined(value.visible) && value.visible != null) {
                  return value.visible;
                }
                return true;
              });

              $scope.gridOptions.columnDefs = defaultDefs;
              $scope.gridOptions.enableRowClickSelection = true;
            }
          }
          // assume 1 row of data per mbean
          $scope.gridData[idx] = data;
          addHandlerFunctions($scope.gridData);

          var count = $scope.mbeanCount;
          if (!count || idx + 1 >= count) {
            // only cause a refresh on the last row
            var newSelections = $scope.selectedIndices.map((idx) => $scope.gridData[idx]).filter((row) => row);
            $scope.selectedItems.splice(0, $scope.selectedItems.length);
            $scope.selectedItems.push.apply($scope.selectedItems, newSelections);
            //console.log("Would have selected " + JSON.stringify($scope.selectedItems));
            Core.$apply($scope);
          }
        } else {
          console.log("No mbean name in request " + JSON.stringify(response.request));
        }
      } else {
        $scope.gridOptions.columnDefs = propertiesColumnDefs;
        $scope.gridOptions.enableRowClickSelection = false;
        var showAllAttributes = true;
        if (angular.isObject(data)) {
          var properties = Array();
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
                var type = lookupAttributeType(key);
                var data = {key: key, name: Core.humanizeValue(key), value: Core.safeNullAsString(value, type)};

                generateSummaryAndDetail(key, data);
                properties.push(data);
              }
            }
          });
          if (!_.any(properties, (p) => {
            return p['key'] === 'ObjectName';
          })) {
            var objectName = {
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

    function addHandlerFunctions(data) {
      data.forEach((item) => {
        item['inDashboard'] = $scope.inDashboard;
        item['getDashboardWidgets'] = () => {
          return $scope.getDashboardWidgets(item);
        };
        item['onViewAttribute'] = () => {
          $scope.onViewAttribute(item);
        };
        item['folderIconClass'] = (row) => {
          return $scope.folderIconClass(row);
        };
        item['folderHref'] = (row) => {
          return $scope.folderHref(row);
        };
      });
    }

    function unwrapObjectName(value) {
      if (!angular.isObject(value)) {
        return value;
      }
      var keys = Object.keys(value);
      if (keys.length === 1 && keys[0] === "objectName") {
        return value["objectName"];
      }
      return value;
    }

    function generateSummaryAndDetail(key, data) {
      var value = data.value;
      if (!angular.isArray(value) && angular.isObject(value)) {
        var detailHtml = "<table class='table table-striped'>";
        var summary = "";
        var object = value;
        var keys = Object.keys(value).sort();
        angular.forEach(keys, (key) => {
          var value = object[key];
          detailHtml += "<tr><td>"
            + Core.humanizeValue(key) + "</td><td>" + value + "</td></tr>";
          summary += "" + Core.humanizeValue(key) + ": " + value + "  "
        });
        detailHtml += "</table>";
        data.summary = summary;
        data.detailHtml = detailHtml;
        data.tooltip = summary;
      } else {
        var text = value;
        // if the text is empty then use a no-break-space so the table allows us to click on the row,
        // otherwise if the text is empty, then you cannot click on the row
        if (text === '') {
          text = '&nbsp;';
          data.tooltip = "";
        } else {
          data.tooltip = text;
        }
        data.summary = "" + text + "";
        data.detailHtml = "<pre>" + text + "</pre>";
        if (angular.isArray(value)) {
          var html = "<ul>";
          angular.forEach(value, (item) => {
            html += "<li>" + item + "</li>";
          });
          html += "</ul>";
          data.detailHtml = html;
        }
      }

      // enrich the data with information if the attribute is read-only/read-write, and the JMX attribute description (if any)
      data.rw = false;
      data.attrDesc = data.name;
      data.type = "string";
      if ($scope.attributesInfoCache != null && 'attr' in $scope.attributesInfoCache) {
        var info = $scope.attributesInfoCache.attr[key];
        if (angular.isDefined(info)) {
          data.rw = info.rw;
          data.attrDesc = info.desc;
          data.type = info.type;
        }
      }
    }

    function lookupAttributeType(key) {
      if ($scope.attributesInfoCache != null && 'attr' in $scope.attributesInfoCache) {
        var info = $scope.attributesInfoCache.attr[key];
        if (angular.isDefined(info)) {
          return info.type;
        }
      }
      return null;
    }

    function includePropertyValue(key:string, value) {
      return !angular.isObject(value);
    }

    function asJsonSchemaType(typeName, id) {
      if (typeName) {
        var lower = typeName.toLowerCase();
        if (_.startsWith(lower, "int") || lower === "long" || lower === "short" || lower === "byte" || _.endsWith(lower, "int")) {
          return "integer";
        }
        if (lower === "double" || lower === "float" || lower === "bigdecimal") {
          return "number";
        }
        if (lower === "boolean" || lower === "java.lang.boolean") {
          return "boolean";
        }
        if (lower === "string" || lower === "java.lang.String") {
          return "string";
        }
      }
      // fallback as string
      return "string";
    }

  }]);

}
