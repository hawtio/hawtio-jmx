/// <reference path="../../includes.ts"/>
/**
 * @module Core
 */

module Core {

  export function d3ForceGraph(scope, nodes, links, canvasElement) {
    // lets remove the old graph first
    if (scope.graphForce) {
      scope.graphForce.stop();
    }
    if (!canvasElement) {
      canvasElement = $("#canvas")[0];
    }
    var canvasDiv = $(canvasElement);
    canvasDiv.children("svg").remove();

    if (nodes.length) {
      var width  = canvasDiv.parent().width();
      var height = canvasDiv.parent().height();

      if (height < 100) {
        //console.log("browse thinks the height is only " + height + " so calculating offset from doc height");
        var offset = canvasDiv.offset();
        height     = $(document).height() - 5;
        if (offset) {
          height -= offset['top'];
        }
      }
      //console.log("Using width " + width + " and height " + height);

      var svg = d3.select(canvasDiv[0]).append("svg")
        .attr("width", width)
        .attr("height", height);

      var force = d3.layout.force()
        //.gravity(.05)
        .distance(100)
        .charge(-120 * 10)
        .linkDistance(50)
        .size([width, height]);

      scope.graphForce = force;

      /*
       var force = d3.layout.force()
       .gravity(.05)
       .distance(100)
       .charge(-100)
       .size([width, height]);
       */

      // prepare the arrows
      svg.append("svg:defs").selectAll("marker")
        .data(["from"])
        .enter().append("svg:marker")
        .attr("id", String)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 25)
        .attr("refY", -1.5)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("svg:path")
        .attr("d", "M0,-5L10,0L0,5");

      force.nodes(nodes)
        .links(links)
        .start();

      var link = svg.selectAll(".link")
        .data(links)
        .enter().append("line")
        .attr("class", "link");

      // draw the arrow
      link.attr("class", "link from");

      // end marker
      link.attr("marker-end", "url(#from)");

      var node = svg.selectAll(".node")
        .data(nodes)
        .enter().append("g")
        .attr("class", "node")
        .call(force.drag);

      node.append("image")
        .attr("xlink:href", d => d.imageUrl)
        .attr("x", -15)
        .attr("y", -15)
        .attr("width", 30)
        .attr("height", 30);

      node.append("text")
        .attr("dx", 20)
        .attr("dy", ".35em")
        .text(d => d.label);

      force.on("tick", function () {
        link.attr("x1", d => d.source.x)
          .attr("y1", d => d.source.y)
          .attr("x2", d => d.target.x)
          .attr("y2", d => d.target.y);

        node.attr("transform", d => "translate(" + d.x + "," + d.y + ")");
      });
    }
  }
}
