/// <reference path="../workspace.ts"/>
/// <reference path="metrics.service.ts"/>
/// <reference path="jmx.info.ts"/>

namespace Jmx {

  export class DashboardService {

    constructor(private $http: ng.IHttpService, private metricsService: MetricsService) {
      'ngInject';
    }

    configureGrafanaDashboard(nodeSelection: NodeSelection) {
      return this.getDashboard(nodeSelection)
        .then(response => {
          if (response.data['message'] === 'Dashboard not found') {
            return this.createDatasource()
              .then(() => this.defineDashboard(nodeSelection))
              .then(this.createDashboard)
              .then(() => this.getDashboard(nodeSelection));
          } else {
            return response;
          }
        });
    }

    private createDatasource = () => this.$http.post('/grafana/api/datasources', {
      "name": "test",
      "type": "prometheus",
      "url": "http://prometheus-prometheus-example.192.168.42.241.nip.io",
      "access": "direct",
      "basicAuth": false
    });

    private createDashboard = dashboard => this.$http.post('/grafana/api/dashboards/db', {
      "dashboard": dashboard
    });

    private getDashboard = (nodeSelection: NodeSelection) => {
      let jmxInfo = new JmxInfo(nodeSelection);
      return this.$http.get(`/grafana/api/dashboards/db/${jmxInfo.id}`);
    }

    private defineDashboard = (nodeSelection: NodeSelection) => {
      let jmxInfo = new JmxInfo(nodeSelection);
      let metrics = this.metricsService.getMetrics(jmxInfo.type);
      return {
        "title": jmxInfo.id,
        "editable": false,
        "hideControls": true,
        "time": {
          "from": "now-10m",
          "to": "now"
        },
        "refresh": "10s",
        "rows": metrics.map(metric => ({
          "title": metric.title,
          "editable": false,
          "height": "200px",
          "panels": [
            {
              "datasource": "test",
              "title": metric.title,
              "targets": [
                {
                  "expr": `${metric.name}{context="${jmxInfo.context}",instance="test-prometheus-example.192.168.42.241.nip.io:80",job="prometheus-test",name="${jmxInfo.name}",type="${jmxInfo.type}"}`,
                  "format": "time_series",
                  "metric": metric.name
                }
              ],
              "type": "graph",
              "span": 12,
              "legend": {"show": false}
            }
          ]
        }))
      };
    }

  }

}
