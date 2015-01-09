/**
 * @module Jmx
 */
declare module Jmx {
    function createDashboardLink(widgetType: any, widget: any): string;
    function getWidgetType(widget: any): {
        type: string;
        icon: string;
        route: string;
        size_x: number;
        size_y: number;
        title: string;
    };
    var jmxWidgetTypes: {
        type: string;
        icon: string;
        route: string;
        size_x: number;
        size_y: number;
        title: string;
    }[];
    var jmxWidgets: {}[];
}
