/// <reference path="../../includes.d.ts" />
/**
 * @module Core
 */
declare var dagre: any;
declare module Core {
    function d3ForceGraph(scope: any, nodes: any, links: any, canvasElement: any): void;
    function createGraphStates(nodes: any, links: any, transitions: any): any;
    function dagreLayoutGraph(nodes: any, links: any, width: any, height: any, svgElement: any): any;
    function dagreUpdateGraphData(data: any): void;
}
