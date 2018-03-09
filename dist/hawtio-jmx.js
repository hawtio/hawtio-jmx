/*! dangle - v1.0.0 - 2013-03-02
* http://www.fullscale.co/dangle
* Copyright (c) 2013 FullScale Labs, LLC; Licensed MIT */

angular.module('dangle', []);

/* 
 * Copyright (c) 2012 FullScale Labs, LLC
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without
 * restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following
 * conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
 */

angular.module('dangle')
    .directive('fsArea', [function() {
        'use strict';

        return {
            restrict: 'E',

            // set up the isolate scope so that we don't clobber parent scope
            scope: {
                onClick:     '=',
                width:       '=',
                height:      '=',
                bind:        '=',
                label:       '@',
                field:       '@',
                duration:    '@',
                delay:       '@',
                plot:        '@',
                pointRadius: '@' 
            },

            link: function(scope, element, attrs) {

                var margin = {
                    top: 20, 
                    right: 20, 
                    bottom: 30, 
                    left: 80
                };

                // default width/height - mainly to create initial aspect ratio
                var width = scope.width || 1280;
                var height = scope.height || 300;

                // are we using interpolation
                var interpolate = attrs.interpolate || 'false';

                var label = attrs.label || 'Frequency';
                var klass = attrs.class || '';

                // add margins (make room for x,y labels)
                width = width - margin.left - margin.right;
                height = height - margin.top - margin.bottom;

                // create x,y sclaes (x is inferred as time)
                var x = d3.time.scale()
                    .range([0, width]);

                var y = d3.scale.linear()
                    .range([height, 0]);

                // create x,y axis 
                var xAxis = d3.svg.axis()
                    .scale(x)
                    .orient('bottom');

                var yAxis = d3.svg.axis()
                    .scale(y)
                    .orient('left');

                // create line generator 
                var line = d3.svg.line()
                    .x(function(d) { return x(d.time); })
                    .y(function(d) { return y(d.count); });

                // create area generator
                var area = d3.svg.area()
                    .x(function(d) { return x(d.time); })
                    .y0(height)
                    .y1(function(d) { return y(d.count); });

                // enable interpolation if specified 
                if (attrs.interpolate == 'true') {
                    line.interpolate('cardinal');
                    area.interpolate('cardinal');
                }

                // create the root SVG node
                var svg = d3.select(element[0])
                    .append('svg')
                        .attr('preserveAspectRatio', 'xMinYMin')
                        .attr('viewBox', '0 0 ' + (width + margin.left + margin.right) + ' ' + (height + margin.top + margin.bottom))
                        .append('g')
                            .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

                // generate the area. Data is empty at link time
                svg.append('path')
                    .datum([])
                    .attr('class', 'area fill ' + klass)
                    .attr('d', area);

                // insert the x axis (no data yet)
                svg.append('g')
                    .attr('class', 'area x axis ' + klass)
                    .attr('transform', 'translate(0,' + height + ')')
                    .call(xAxis);

                // insert the x axis (no data yet)
                svg.append('g')
                    .attr('class', 'area y axis ' + klass)
                    .call(yAxis)
                        .append('text')
                            .attr('transform', 'rotate(-90)')
                            .attr('y', 6)
                            .attr('dy', '.71em')
                            .style('text-anchor', 'end')
                            .text(label);

                // generate the line. Data is empty at link time
                svg.append('path')
                    .datum([])
                    .attr('class', 'area line ' + klass)
                    .attr("d", line);


                // main observer fn called when scope is updated. Data and scope vars are now bound
                scope.$watch('bind', function(data) {

                    // pull info from scope
                    var duration = scope.duration || 0;
                    var delay = scope.delay || 0;
                    var dataPoints = scope.plot || 'true';
                    var pointRadius = scope.pointRadius || 8;
                    var field = scope.field || attrs.bind.split('.').pop().toLowerCase();

                    // just because scope is bound doesn't imply we have data.
                    if (data) {

                        // pull the data array from the facet
                        data = data.entries || [];

                        // use that data to build valid x,y ranges
                        x.domain(d3.extent(data, function(d) { return d.time; }));
                        y.domain([0, d3.max(data, function(d) { return d.count; })]);

                        // create the transition 
                        var t = svg.transition().duration(duration);

                        // feed the current data to our area/line generators
                        t.select('.area').attr('d', area(data));
                        t.select('.line').attr('d', line(data));

                        // does the user want data points to be plotted
                        if (dataPoints == 'true') {

                            // create svg circle for each data point
                            // using Math.random as (optional) key fn ensures old
                            // data values are flushed and all new values inserted
                            var points = svg.selectAll('circle')
                                .data(data.filter(function(d) { 
                                    return d.count; 
                                }), function(d) { 
                                    return Math.random(); 
                                });

                            // d3 enter fn binds each new value to a circle 
                            points.enter()
                                .append('circle')
                                    .attr('class', 'area line points ' + klass)
                                    .attr('cursor', 'pointer')
                                    .attr("cx", line.x())
                                    .attr("cy", line.y())
                                    .style("opacity", 0)
                                    .transition()
                                        .duration(duration)
                                        .style("opacity", 1)
                                        .attr("cx", line.x())
                                        .attr("cy", line.y())
                                        .attr("r", pointRadius);

                            // wire up any events (registers filter callback)
                            points.on('mousedown', function(d) { 
                                scope.$apply(function() {
                                    (scope.onClick || angular.noop)(field, d.time);
                                });
                            });

                            // d3 exit/remove flushes old values (removes old circles)
                            points.exit().remove();
                        }

                        // update our x,y axis based on new data values
                        t.select('.x').call(xAxis);
                        t.select('.y').call(yAxis);

                    }
                })
            }
        };
    }]);

/* 
 * Copyright (c) 2012 FullScale Labs, LLC
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without
 * restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following
 * conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
 */

angular.module('dangle')
    .directive('fsBar', [function() {
        'user strict';

        return {
            restrict: 'E',

            // set up the isolate scope so that we don't clobber parent scope
            scope: {
                onClick:  '=',
                width:    '=',
                height:   '=',
                bind:     '=',
                duration: '@'
            },
			link: function(scope, element, attrs) {

                var margin = {
                    top: 10, 
                    right: 10, 
                    bottom: 10, 
                    left: 10
                };

                var width = scope.width || 300;
                var height = scope.height || 1020;
                
                // add margin
                width = width - margin.left - margin.right;
                height = height - margin.top - margin.bottom;

                var klass = attrs.class || '';
                var align = attrs.align || 'left';

                var viewAlign = align === 'right' ? 'xMaxYMin' : 'xMinYMin';

                var x = d3.scale.linear()
                    .range([0, width]);

                var y = d3.scale.ordinal()
                    .rangeBands([0, height], .1);

                var svg = d3.select(element[0])
                    .append('svg')
                        .attr('preserveAspectRatio', viewAlign + ' meet')
                        .attr('viewBox', '0 0 ' + (width + margin.left + margin.right) + ' ' + (height + margin.top + margin.bottom))
                        .append('g')
                            .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');


                scope.$watch('bind', function(data) {

                    // pull info from scope
                    var duration = scope.duration || 0;
                    var delay = scope.delay || 0;
                    var field = scope.field || attrs.bind.split('.').pop().toLowerCase();

                    if (data) {

                        // pull the data array from the facet 
                        data = data.terms || [];

                        x.domain([0, d3.max(data, function(d) { return d.count; })*2]);
                        y.domain(data.map(function(d) { return d.term; }));

                        // random key here?
                        var bars = svg.selectAll('rect')
                            .data(data, function(d) { return Math.random(); });

                        // d3 enter fn binds each new value to a rect
                        bars.enter()
                            .append('rect')
                                .attr('class', 'bar rect ' + klass)
                                .attr('cursor', 'pointer')
                                .attr('y', function(d) { return y(d.term); })
                                .attr('height', y.rangeBand())
                                .attr('x', function(d) { 
                                    if (align === 'right') {
                                        return width;
                                    } else {
                                        return 0; 
                                    }
                                }) // added
                                .transition()
                                    .duration(duration)
                                        .attr('width', function(d) { return x(d.count); })
                                        .attr('x', function(d) { 
                                            if (align === 'right') {
                                                return width - x(d.count);
                                            } else {
                                                return 0;
                                            }
                                        });

                        // wire up event listeners - (registers filter callback)
                        bars.on('mousedown', function(d) {
                            scope.$apply(function() {
                                (scope.onClick || angular.noop)(field, d.term);
                            });
                        });

                        // d3 exit/remove flushes old values (removes old rects)
                        bars.exit().remove();

                        var labels = svg.selectAll("text")
                            .data(data, function(d) { return Math.random(); });

                        labels.enter()
                            .append('text')
                                .attr('class', 'bar text ' + klass)
                                .attr('cursor', 'pointer')
                                .attr('y', function(d) { return y(d.term) + y.rangeBand() / 2; })
                                .attr('x', function(d) { 
                                    if (align === 'right') {
                                        return width - x(d.count) - 3;
                                    } else {
                                        return x(d.count) + 3;
                                    }
                                })
                                .attr('dy', '.35em')
                                .attr('text-anchor', function(d) {
                                    if (align === 'right') {
                                        return 'end';
                                    } else {
                                        return 'start';
                                    }
                                })

                                .text(function(d) { 
                                    if (align === 'right') {
                                        return '(' + d.count + ') ' + d.term;
                                    } else {
                                        return d.term + ' (' + d.count + ')';
                                    }
                                });

                        // wire up event listeners - (registers filter callback)
                        labels.on('mousedown', function(d) {
                            scope.$apply(function() {
                                (scope.onClick || angular.noop)(field, d.term);
                            });
                        });

                        // d3 exit/remove flushes old values (removes old rects)
                        labels.exit().remove();
                    }
                })
            }
        };
    }]);

/* 
 * Copyright (c) 2012 FullScale Labs, LLC
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without
 * restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following
 * conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
 */

angular.module('dangle')
    .directive('fsColumn', [function() {
        'use strict';

        return {
			restrict: 'E',

            // set up the isolate scope so that we don't clobber parent scope
            scope: {
                fontSize: '=',
                onClick: '=',
                width: '=',
                height: '=',
                bind: '='
            },
			link: function(scope, element, attrs) {

                var margin = {top:20, right: 20, bottom: 30, left: 40};
                var width = scope.width || 960;
                var height = scope.height || 500;
                var color = attrs.color || 'steelblue';
                var fontColor = attrs.fontColor || '#000';
                var fontSize = scope.fontSize || 14;
                var label = attrs.label || 'Frequency';

                // if no field param is set, use the facet name but normalize the case
                if (attrs.field == undefined) {
                    attrs.field = attrs.bind.split('.').pop().toLowerCase();
                }

                width = width - margin.left - margin.right;
                height = height - margin.top - margin.bottom;

                var x = d3.scale.ordinal()
                    .rangeRoundBands([0, width], .1);

                var y = d3.scale.linear()
                    .range([height, 0]);

                var xAxis = d3.svg.axis()
                    .scale(x)
                    .orient('bottom');

                var yAxis = d3.svg.axis()
                    .scale(y)
                    .orient('left');

                var svg = d3.select(element[0])
                    .append('svg')
                        .attr('preserveAspectRatio', 'xMinYMin meet')
                        .attr('viewBox', '0 0 ' + (width + margin.left + margin.right) + ' ' + (height + margin.top + margin.bottom))
                        .append('g')
                            .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');


                scope.$watch('bind', function(data) {

                    if (data) {
                        data = data.terms || [];
                        svg.selectAll('*').remove();

                        x.domain(data.map(function(d) { return d.term; }));
                        y.domain([0, d3.max(data, function(d) { return d.count; })]);

                        svg.append('g')
                            .attr('fill', fontColor)
                            .attr('font-size', fontSize)
                            .attr('class', 'x axis')
                            .attr('transform', 'translate(0,' + height + ')')
                            .call(xAxis);

                        svg.append('g')
                            .attr('class', 'y axis')
                            .attr('font-size', fontSize)
                            .attr('fill', fontColor)
                            .call(yAxis)
                            .append('text')
                                .attr('transform', 'rotate(-90)')
                                .attr('y', 6)
                                .attr('dy', '.51em')
                                .style('text-anchor', 'end')
                                .text(label);

                        svg.selectAll('.bar')
                            .data(data)
                            .enter()
                                .append('rect')
                                    .attr('fill', color)
                                    .attr('x', function(d) { return x(d.term); })
                                    .attr('width', x.rangeBand())
                                    .attr('y', function(d) { return y(d.count); })
                                    .attr('height', function(d) { return height - y(d.count); })
                                    .on('mousedown', function(d) {
                                        scope.$apply(function() {
                                        (scope.onClick || angular.noop)(attrs.field, d.term);
                                    });
                                });
                    }
                })
            }
        };
    }]);

/* 
 * Copyright (c) 2012 FullScale Labs, LLC
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without
 * restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following
 * conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
 */

angular.module('dangle')
    .directive('fsDateHisto', [function() {
        'use strict';

        return {
            restrict: 'E', 

            // sets up the isolate scope so that we don't clobber parent scope
            scope: {
                onClick:   '=',
                width:     '=',
                height:    '=',
                bind:      '=',
                label:     '@',
                field:     '@',
                duration:  '@',
                delay:     '@',
                interval:  '@'
            },

            // angular directives return a link fn
            link: function(scope, element, attrs) {

                var margin = {
                    top:20, 
                    right: 20, 
                    bottom: 30, 
                    left: 80
                };

                // default width/height - mainly to create initial aspect ratio
                var width = scope.width || 1280;
                var height = scope.height || 300;

                var label = attrs.label || 'Frequency';
                var klass = attrs.class || '';

                // add margin (make room for x,y labels)
                width = width - margin.left - margin.right;
                height = height - margin.top - margin.bottom;

                // create x,y scales (x is inferred as time)
                var x = d3.time.scale()
                    .range([0, width]);

                var y = d3.scale.linear()
                    .range([height, 0]);

                // create x,y axis
                var xAxis = d3.svg.axis()
                    .scale(x)
                    .orient('bottom');

                var yAxis = d3.svg.axis()
                    .scale(y)
                    .orient('left');

                // create the root svg node
                var svg = d3.select(element[0])
                    .append('svg')
                        .attr('preserveAspectRatio', 'xMinYMin')
                        .attr('viewBox', '0 0 ' + (width + margin.left + margin.right) + ' ' + (height + margin.top + margin.bottom))
                        .append('g')
                            .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

                // insert the x axis (no data yet)
                svg.append('g')
                    .attr('class', 'histo x axis ' + klass)
                    .attr('transform', 'translate(0,' + height + ')')
                    .call(xAxis);

                // insert the y axis (no data yet)
                svg.append('g')
                    .attr('class', 'histo y axis ' + klass)
                    .call(yAxis)
                        .append('text')
                            .attr('transform', 'rotate(-90)')
                            .attr('y', 6)
                            .attr('dy', '.51em')
                            .style('text-anchor', 'end')
                            .text(label);


                // mainer observer fn called when scope is updated. Data and scope vars are npw bound
                scope.$watch('bind', function(data) {

                    // pull info from scope
                    var duration = scope.duration || 0;
                    var delay = scope.delay || 0;
                    var field = scope.field || attrs.bind.split('.').pop().toLowerCase();
                    var interval = scope.interval || 'day';

                    // just because scope is bound doesn't imply we have data
                    if (data) {

                        // pull the data array from the facet 
                        data = data.entries || [];

                        // calculate the bar width based on the data length leaving
                        // a 2 pixel "gap" between bars.
                        var barWidth = width/data.length - 2;

                        var intervalMsecs = 86400000;

                        // workaround until this pull request is merged
                        // the user can pass in an appropriate interval
                        // https://github.com/elasticsearch/elasticsearch/pull/2559
                        switch(interval.toLowerCase()) {
                            case 'minute':
                                intervalMsecs = 60000;
                                break;
                            case 'hour':
                                intervalMsecs = 3600000;
                                break;
                            case 'day':
                                intervalMsecs = 86400000;
                                break;
                            case 'week':
                                intervalMsecs = 604800000;
                                break;
                            case 'month':
                                intervalMsecs = 2630000000;
                                break;
                            case 'year':
                                intervalMsecs = 31560000000;
                                break;
                        }

                        // recalculate the x and y domains based on the new data.
                        // we have to add our "interval" to the max otherwise 
                        // we don't have enough room to draw the last bar.
                        x.domain([
                            d3.min(data, function(d) { 
                                return d.time;
                            }), 
                            d3.max(data, function(d) { 
                                return d.time;
                            }) + intervalMsecs
                        ]);
                        y.domain([0, d3.max(data, function(d) { return d.count; })]);

                        // create transition (x,y axis)
                        var t = svg.transition().duration(duration);

                        // using a random key function here will cause all nodes to update
                        var bars = svg.selectAll('rect')
                            .data(data, function(d) { return Math.random(); });

                        // d3 enter fn binds each new value to a rect
                        bars.enter()
                            .append('rect')
                                .attr('class', 'histo rect ' + klass)
                                .attr('cursor', 'pointer')
                                .attr('x', function(d) { return x(d.time); })
                                .attr("y", function(d) { return height })
                                .attr('width', barWidth)
                                .transition()
                                    .delay(function (d,i){ return i * delay; })
                                    .duration(duration)
                                        .attr('height', function(d) { return height - y(d.count); })
                                        .attr('y', function(d) { return y(d.count); });

                        // wire up event listeners - (registers filter callback)
                        bars.on('mousedown', function(d) {
                            scope.$apply(function() {
                                (scope.onClick || angular.noop)(field, d.time);
                            });
                        });

                        // d3 exit/remove flushes old values (removes old rects)
                        bars.exit().remove();

                        // update our x,y axis based on new data values
                        t.select('.x').call(xAxis);
                        t.select('.y').call(yAxis);
                    }
                }, true)
            }
        };
    }]);


/* 
 * Copyright (c) 2012 FullScale Labs, LLC
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without
 * restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following
 * conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
 */

angular.module('dangle')
    .directive('fsDonut', [function() {
        'use strict';

        return {
            restrict: 'E',

            // sets up the isolate scope so that we don't clobber parent scope
            scope: {
                outerRadius: '=',
                innerRadius: '=',
                fontSize: '=',
                domain: '=',
                colorMap: '=',
                onClick: '=',
                bind: '=',
                duration: '@'
            },

            link: function(scope, element, attrs) {

                // Setup default parameters.
                var outerRadius = scope.outerRadius || 200;
                var innerRadius = scope.innerRadius || 0;
                var fontSize = scope.fontSize || 14;
                var fontColor = attrs.fontColor || "#fff";
                var color = undefined;

                // if no field param is set, use the facet name but normalize the case
                if (attrs.field == undefined) {
                    attrs.field = attrs.bind.split('.').pop().toLowerCase();
                }

                // User can define a color-map so use look for one.
                // If none is found, then use built-in color pallete
                // but see if user has defined a domain of values.
                if (scope.colorMap === undefined) {
                    color = d3.scale.category20c();
                    if (scope.domain !== undefined) {
                        color.domain(scope.domain);
                    }
                } else {
                    color = function(term) {
                        return scope.colorMap[term];
                    }
                }

                // width/height (based on giveb radius)
                var w = (outerRadius * 3) + 30;
                // ENTESB-2812: DO NOT TOUCH - IE11 hack!
                var h = outerRadius * ((/Trident\/7\./).test(navigator.userAgent) && scope.$parent.inDashboard ? .25 : 3);

                // arc generator
                var arc = d3.svg.arc()
                    .outerRadius(outerRadius - 10)
                    .innerRadius(innerRadius);

                // d3 utility for creating pie charts
                var pie = d3.layout.pie()
                    .sort(null)
                    .value(function(d) { return d.count; });

                // ENTESB-2812: DO NOT TOUCH - IE11 hack!
                var scaling = 'xMinYMin meet';
                if ((/Trident\/7\./).test(navigator.userAgent) && scope.$parent.inDashboard) {
                    scaling = 'xMinYMax meet';
                }

                // root svg element
                var svg = d3.select(element[0])
                    .append('svg')
                        .attr('preserveAspectRatio', scaling)
                        .attr('viewBox', '0 0 ' + w + ' ' + h);

                // group for arcs
                var arcs = svg.append('g')
                    .attr('transform', 'translate(' + w/2 + ',' + h/2 + ') rotate(180) scale(-1, -1)');

                // group for labels
                var labels = svg.append("g")
                    .attr("class", "label_group")
                    .attr("transform", "translate(" + (w/2) + "," + (h/2) + ")");


                // Wrap the main drawing logic in an Angular watch function.
                // This will get called whenever our data attribute changes.
                scope.$watch('bind', function(data) {

                    var duration = scope.duration || 0;

                    // arc tweening
                    function arcTween(d, i) {
                        var i = d3.interpolate(this._current, d);
                        this._current = i(0);
                        return function(t) {
                            return arc(i(t));
                        };
                    }
        
                    // label tweening
                    function textTween(d, i) {
                        var a = (this._current.startAngle + this._current.endAngle - Math.PI)/2;
                        var b = (d.startAngle + d.endAngle - Math.PI)/2;

                        var fn = d3.interpolateNumber(a, b);
                        return function(t) {
                            var val = fn(t);
                            return "translate(" + 
                                Math.cos(val) * (outerRadius + textOffset) + "," + 
                                Math.sin(val) * (outerRadius + textOffset) + ")";
                        };
                    }

                    // determines the anchor point of a label
                    var findAnchor = function(d) {
                        if ((d.startAngle + d.endAngle)/2 < Math.PI ) {
                            return "beginning";
                        } else {
                            return "end";
                        }
                    };

                    var textOffset = 14;

                    // if data is not null
                    if (data) { 

                        // pull out the terms array from the facet
                        data = data.terms || [];
                        var pieData = pie(data);

                        // calculate the sum of the counts for this facet
                        var sum = 0;
                        for (var ii=0; ii < data.length; ii++) {
                            sum += data[ii].count;
                        }

                        // if the sum is 0 then this facet has no valid entries (all counts were zero)
                        if (sum > 0) {

                            // update the arcs
                            var path = arcs.selectAll('path').data(pieData);
                            path.enter()
                                .append('path') 
                                    .attr('d', arc)
                                    .attr('stroke', '#fff')
                                    .attr('stroke-width', '1.5')
                                    .attr('cursor', 'pointer')
                                    .style('fill', function(d) { return color(d.data.term); })
                                    .each(function(d) { this._current = d; })
                                    .on('mousedown', function(d) {
                                        scope.$apply(function() {
                                            (scope.onClick || angular.noop)(attrs.field, d.data.term);
                                        });
                                    });

                            // run the transition
                            path.transition().duration(duration).attrTween('d', arcTween);

                            // update the label ticks
                            var ticks = labels.selectAll('line').data(pieData);
                            ticks.enter().append('line')
                                .attr('x1', 0)
                                .attr('x2', 0)
                                .attr('y1', -outerRadius-3)
                                .attr('y2', -outerRadius-8)
                                .attr('stroke', 'grey')
                                .attr('stroke-width', 2.0)
                                .attr('transform', function(d) {
                                    return 'rotate(' + (d.startAngle + d.endAngle)/2 * (180/Math.PI) + ')'; // radians to degrees
                                })
                                .each(function(d) {this._current = d;});

                            // run the transition
                            ticks.transition()
                                .duration(750)
                                .attr("transform", function(d) {
                                    return "rotate(" + (d.startAngle+d.endAngle)/2 * (180/Math.PI) + ")";
                            });

                            // flush old entries
                            ticks.exit().remove();

                            // update the percent labels
                            var percentLabels = labels.selectAll("text.value").data(pieData)
                                .attr("dy", function(d) {
                                    if ((d.startAngle + d.endAngle)/2 > Math.PI/2 && (d.startAngle + d.endAngle)/2 < Math.PI*1.5 ) {
                                        return 17;
                                    } else {
                                        return -17;
                                    }
                                })
                                .attr('text-anchor', findAnchor)
                                .text(function(d) {
                                    var percentage = (d.value/sum)*100;
                                    return percentage.toFixed(1) + "%";
                                });

                            percentLabels.enter().append("text")
                                .attr("class", "value")
                                .attr('font-size', 20)
                                .attr('font-weight', 'bold')
                                .attr("transform", function(d) {
                                    return "translate(" + 
                                        Math.cos(((d.startAngle + d.endAngle - Math.PI)/2)) * (outerRadius + textOffset) + "," + 
                                        Math.sin((d.startAngle + d.endAngle - Math.PI)/2) * (outerRadius + textOffset) + ")";
                                })
                                .attr("dy", function(d) {
                                    if ((d.startAngle+d.endAngle)/2 > Math.PI/2 && (d.startAngle + d.endAngle)/2 < Math.PI*1.5 ) {
                                        return 17;
                                    } else {
                                        return -17;
                                    }
                                })
                                .attr('text-anchor', findAnchor)
                                .text(function(d){
                                    var percentage = (d.value/sum)*100;
                                    return percentage.toFixed(1) + "%";
                                })
                                .each(function(d) {this._current = d;});
                           
                            // run the transition
                            percentLabels.transition().duration(duration).attrTween("transform", textTween);

                            // flush old entries
                            percentLabels.exit().remove();

                            // update the value labels 
                            var nameLabels = labels.selectAll("text.units").data(pieData)
                                .attr("dy", function(d){
                                    if ((d.startAngle + d.endAngle)/2 > Math.PI/2 && (d.startAngle+d.endAngle)/2 < Math.PI*1.5 ) {
                                        return 36;
                                    } else {
                                        return 2;
                                    }
                                })
                                .attr("text-anchor", function(d){
                                    if ((d.startAngle + d.endAngle)/2 < Math.PI ) {
                                        return "beginning";
                                    } else {
                                        return "end";
                                    }
                                }).text(function(d) {
                                    if (d.data.term === 'T') {
                                        return 'TRUE' + ' (' + d.value + ')';
                                    } else if (d.data.term === 'F') {
                                        return 'FALSE'+ ' (' + d.value + ')';
                                    } else {
                                        return d.data.term + ' (' + d.value + ')';
                                    }
                                });

                            nameLabels.enter().append("text")
                                .attr("class", "units")
                                .attr('font-size', 16)
                                .attr('stroke', 'none')
                                .attr('fill', '#000')
                                .attr("transform", function(d) {
                                    return "translate(" + 
                                        Math.cos(((d.startAngle + d.endAngle - Math.PI)/2)) * (outerRadius + textOffset) + "," + 
                                        Math.sin((d.startAngle + d.endAngle - Math.PI)/2) * (outerRadius + textOffset) + ")";
                                })
                                .attr("dy", function(d){
                                    if ((d.startAngle + d.endAngle)/2 > Math.PI/2 && (d.startAngle + d.endAngle)/2 < Math.PI*1.5 ) {
                                        return 36;
                                    } else {
                                        return 2;
                                    }
                                })
                                .attr('text-anchor', findAnchor)
                                .text(function(d){
                                    if (d.data.term === 'T') {
                                        return 'TRUE' + ' (' + d.value + ')';
                                    } else if (d.data.term === 'F') {
                                        return 'FALSE' + ' (' + d.value + ')';
                                    } else {
                                        return d.data.term + ' (' + d.value + ')';
                                    }
                                })
                                .each(function(d) {this._current = d;});

                            // run the transition
                            nameLabels.transition().duration(duration).attrTween("transform", textTween);
    
                            // flush old entries
                            nameLabels.exit().remove();

                        } else {
                            // if the facet had no valid entries then remove the chart
                            svg.selectAll('path').remove();
                            labels.selectAll('line').remove();
                            labels.selectAll("text.value").remove();
                            labels.selectAll("text.units").remove();
                        }

                    }
                })

            }
        };
    }]);

/* 
 * Copyright (c) 2012 FullScale Labs, LLC
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without
 * restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following
 * conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
 */

angular.module('dangle')
    .directive('fsPie', [function() {
        'use strict';

        return {
            restrict: 'E',

            // sets up the isolate scope so that we don't clobber parent scope
            scope: {
                outerRadius: '=',
                innerRadius: '=',
                fontSize: '=',
                domain: '=',
                colorMap: '=',
                onClick: '=',
                bind: '='
            },

            // angular directives return a link fn
            link: function(scope, element, attrs) {

                // Setup default parameters.
                var outerRadius = scope.outerRadius || 200;
                var innerRadius = scope.innerRadius || 0;
                var fontSize = scope.fontSize || 14;
                var fontColor = attrs.fontColor || "#fff";
                var color = undefined;

                // if no field param is set, use the facet name but normalize the case
                if (attrs.field == undefined) {
                    attrs.field = attrs.bind.split('.').pop().toLowerCase();
                }

                // User can define a color-map so use look for one.
                // If none is found, then use built-in color pallete
                // but see if user has defined a domain of values.
                if (scope.colorMap == undefined) {
                    color = d3.scale.category20c();
                    if (scope.domain !== undefined) {
                        color.domain(scope.domain);
                    }
                } else {
                    color = function(term) {
                        return scope.colorMap[term];
                    }
                }

                var arc = d3.svg.arc()
                    .outerRadius(outerRadius - 10)
                    .innerRadius(innerRadius);

                // create the function for drawing the pie
                var pie = d3.layout.pie()
                    .sort(null)
                    .value(function(d) { return d.count; });

                // create the root svg element
                var svg = d3.select(element[0])
                    .append('svg')
                        .attr('preserveAspectRatio', 'xMinYMin meet')
                        .attr('viewBox', '0 0 ' + outerRadius*2 + ' ' + outerRadius*2)
                        .append('g')
                            .attr('transform', 'translate(' + 
                                outerRadius + ',' + outerRadius + ') rotate(180) scale(-1, -1)');

                // Wrap the main drawing logic in an Angular watch function.
                // This will get called whenever our data attribute changes.
                scope.$watch('bind', function(data) {
                   
                    if (data) { 
                        data = data.terms || [];
                        svg.selectAll('*').remove();

                        var g = svg.selectAll('.arc')
                            .data(pie(data))
                            .enter()
                                .append('g')
                                    .attr('class', 'arc')
                                    .on('mousedown', function(d) {
                                        scope.$apply(function() {
                                            (scope.onClick || angular.noop)(attrs.field, d.data.term);
                                        });
                                    });

                            g.append('path')
                                .attr('d', arc)
                                .style('fill', function(d) {
                                    return color(d.data.term); 
                                });

                            g.append('text')
                                .attr('transform', function(d) { return 'translate(' + arc.centroid(d) + ')'; })
                                .attr('dy', '.55em')
                                .style('text-anchor', 'middle')
                                .attr('fill', fontColor)
                                .attr('font-size', fontSize)
                                .text(function(d) { 
                                    return d.data.term; 
                                }); 
                    }
                })

            }
        };
    }]);

/*
 * Copyright 2009-2012 Roland Huss
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* =================================
 * Jolokia Javascript Client Library
 * =================================
 *
 * Requires jquery.js and json2.js
 * (if no native JSON.stringify() support is available)
 */

(function() {

    var _jolokiaConstructorFunc = function ($) {

        // Default paramerters for GET and POST requests
        var DEFAULT_CLIENT_PARAMS = {
            type:"POST",
            jsonp:false
        };

        var GET_AJAX_PARAMS = {
            type:"GET"
        };

        var POST_AJAX_PARAMS = {
            type:"POST",
            processData:false,
            dataType:"json",
            contentType:"text/json"
        };

        // Processing parameters which are added to the
        // URL as query parameters if given as options
        var PROCESSING_PARAMS = ["maxDepth", "maxCollectionSize", "maxObjects", "ignoreErrors", "canonicalNaming",
                                 "serializeException", "includeStackTrace", "ifModifiedSince"];

        /**
         * Constructor for creating a client to the Jolokia agent.
         *
         * An object containing the default parameters can be provided as argument. For the possible parameters
         * see {@link #request()}.
         *
         * @param param either a string in which case it is used as the URL to the agent or
         *              an object with the default parameters as key-value pairs
         */
        function Jolokia(param) {
            // If called without 'new', we are constructing an object
            // nevertheless
            if (!(this instanceof arguments.callee)) {
                return new Jolokia(param);
            }

            // Jolokia Javascript Client version
            this.CLIENT_VERSION = "1.1.3";

            // Registered requests for fetching periodically
            var jobs = [];

            // Options used for every request
            var agentOptions = {};

            // State of the scheduler
            var pollerIsRunning = false;

            // Allow a single URL parameter as well
            if (typeof param === "string") {
                param = {url:param};
            }
            $.extend(agentOptions, DEFAULT_CLIENT_PARAMS, param);

            // ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
            // Public methods

            /**
             * The request method using one or more JSON requests and sending it to the agent. Beside the
             * request a bunch of options can be given, which are merged with the options provided
             * at the constructor (where the options given here take precedence).
             *
             * Known options are:
             *
             * <dl>
             *   <dt>url</dt>
             *   <dd>Agent URL, which is mandatory</dd>
             *   <dt>method</dt>
             *   <dd>
             *     Either "post" or "get" depending on the desired HTTP method (case does not matter).
             *     Please note, that bulk requests are not possible with "get". On the other
             *     hand, JSONP requests are not possible with "post" (which obviously implies
             *     that bulk request cannot be used with JSONP requests). Also, when using a
             *     <code>read</code> type request for multiple attributes, this also can
             *     only be sent as "post" requests. If not given, a HTTP method is determined
             *     dyamically. If a method is selected which doesn't fit to the request, an error
             *     is raised.
             *   </dd>
             *   <dt>jsonp</dt>
             *   <dd>
             *     Whether the request should be sent via JSONP (a technique for allowing cross
             *     domain request circumventing the infamous "same-origin-policy"). This can be
             *     used only with HTTP "get" requests.
             *    </dd>
             *   <dt>success</dt>
             *   <dd>
             *     Callback function which is called for a successful request. The callback receives
             *     the response as single argument. If no <code>success</code> callback is given, then
             *     the request is performed synchronously and gives back the response as return
             *     value.
             *   </dd>
             *   <dt>error</dt>
             *   <dd>
             *     Callback in case a Jolokia error occurs. A Jolokia error is one, in which the HTTP request
             *     suceeded with a status code of 200, but the response object contains a status other
             *     than OK (200) which happens if the request JMX operation fails. This callback receives
             *     the full Jolokia response object (with a key <code>error</code> set). If no error callback
             *     is given, but an asynchronous operation is performed, the error response is printed
             *     to the Javascript console by default.
             *   </dd>
             *   <dt>ajaxError</dt>
             *   <dd>
             *     Global error callback called when the Ajax request itself failed. It obtains the same arguments
             *     as the error callback given for <code>jQuery.ajax()</code>, i.e. the <code>XmlHttpResonse</code>,
             *     a text status and an error thrown. Refer to the jQuery documentation for more information about
             *     this error handler.
             *   </dd>
             *   <dt>username</dt>
             *   <dd>A username used for HTTP authentication</dd>
             *   <dt>password</dt>
             *   <dd>A password used for HTTP authentication</dd>
             *   <dt>timeout</dt>
             *   <dd>Timeout for the HTTP request</dd>
             *   <dt>maxDepth</dt>
             *   <dd>Maximum traversal depth for serialization of complex return values</dd>
             *   <dt>maxCollectionSize</dt>
             *   <dd>
             *      Maximum size of collections returned during serialization.
             *      If larger, the collection is returned truncated.
             *   </dd>
             *   <dt>maxObjects</dt>
             *   <dd>
             *      Maximum number of objects contained in the response.
             *   </dd>
             *   <dt>ignoreErrors</dt>
             *   <dd>
             *     If set to true, errors during JMX operations and JSON serialization
             *     are ignored. Otherwise if a single deserialization fails, the whole request
             *     returns with an error. This works only for certain operations like pattern reads..
             *   </dd>
             * </dl>
             *
             * @param request the request to send
             * @param params parameters used for sending the request
             * @return the response object if called synchronously or nothing if called for asynchronous operation.
             */
            this.request = function (request, params) {
                var opts = $.extend({}, agentOptions, params);
                assertNotNull(opts.url, "No URL given");

                var ajaxParams = {};

                // Copy over direct params for the jQuery ajax call
                $.each(["username", "password", "timeout"], function (i, key) {
                    if (opts[key]) {
                        ajaxParams[key] = opts[key];
                    }
                });

                if (ajaxParams['username'] && ajaxParams['password']) {
                    // If we have btoa() then we set the authentication preemptively,

                    // Otherwise (e.g. for IE < 10) an extra roundtrip might be necessary
                    // when using 'username' and 'password' in xhr.open(..)
                    // See http://stackoverflow.com/questions/5507234/how-to-use-basic-auth-and-jquery-and-ajax
                    // for details
                    if (window.btoa) {
                        ajaxParams.beforeSend = function (xhr) {
                            var tok = ajaxParams['username'] + ':' + ajaxParams['password'];
                            xhr.setRequestHeader('Authorization', "Basic " + window.btoa(tok));
                        };
                    }

                    // Add appropriate field for CORS access
                    ajaxParams.xhrFields = {
                        // Please note that for CORS access with credentials, the request
                        // must be asynchronous (see https://dvcs.w3.org/hg/xhr/raw-file/tip/Overview.html#the-withcredentials-attribute)
                        // It works synchronously in Chrome nevertheless, but fails in Firefox.
                        withCredentials: true
                    };
                }

                if (extractMethod(request, opts) === "post") {
                    $.extend(ajaxParams, POST_AJAX_PARAMS);
                    ajaxParams.data = JSON.stringify(request);
                    ajaxParams.url = ensureTrailingSlash(opts.url);
                } else {
                    $.extend(ajaxParams, GET_AJAX_PARAMS);
                    ajaxParams.dataType = opts.jsonp ? "jsonp" : "json";
                    ajaxParams.url = opts.url + "/" + constructGetUrlPath(request);
                }

                // Add processing parameters as query parameters
                ajaxParams.url = addProcessingParameters(ajaxParams.url, opts);

                // Global error handler
                if (opts.ajaxError) {
                    ajaxParams.error = opts.ajaxError;
                }

                // Dispatch Callbacks to error and success handlers
                if (opts.success) {
                    var success_callback = constructCallbackDispatcher(opts.success);
                    var error_callback = constructCallbackDispatcher(opts.error);
                    ajaxParams.success = function (data) {
                        var responses = $.isArray(data) ? data : [ data ];
                        for (var idx = 0; idx < responses.length; idx++) {
                            var resp = responses[idx];
                            if (Jolokia.isError(resp)) {
                                error_callback(resp, idx);
                            } else {
                                success_callback(resp, idx);
                            }
                        }
                    };

                    // Perform the request
                    $.ajax(ajaxParams);
                    return null;
                } else {
                    // Synchronous operation requested (i.e. no callbacks provided)
                    if (opts.jsonp) {
                        throw Error("JSONP is not supported for synchronous requests");
                    }
                    ajaxParams.async = false;
                    var xhr = $.ajax(ajaxParams);
                    if (httpSuccess(xhr)) {
                        return JSON.parse(xhr.responseText);
                    } else {
                        return null;
                    }
                }
            };

            // ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
            // Scheduler related methods

            /**
             * Register one or more requests for periodically polling the agent along with a callback to call on receipt
             * of the response.
             *
             * The first argument can be either an object or a function. The remaining arguments are interpreted
             * as Jolokia request objects
             *
             * If a function is given or an object with an attribute <code>callback</code> holding a function, then
             * this function is called with all responses received as argument, regardless whether the individual response
             * indicates a success or error state.
             *
             * If the first argument is an object with two callback attributes <code>success</code> and <code>error</code>,
             * these functions are called for <em>each</em> response separately, depending whether the response
             * indicates success or an error state. If multiple requests have been registered along with this callback object,
             * the callback is called multiple times, one for each request in the same order as the request are given.
             * As second argument, the handle which is returned by this method is given and as third argument the index
             * within the list of requests.
             *
             * If the first argument is an object, an additional 'config' attribute with processing parameters can
             * be given which is used as default for the registered requests.
             * Request with a 'config' section take precedence.
             *
             * @param callback and options specification.
             * @param request, request, .... One or more requests to be registered for this single callback
             * @return handle which can be used for unregistering the request again or for correlation purposes in the callbacks
             */
            this.register = function() {
                if (arguments.length < 2) {
                    throw "At a least one request must be provided";
                }
                var callback = arguments[0],
                    requests = Array.prototype.slice.call(arguments,1),
                    job;
                if (typeof callback === 'object') {
                    if (callback.success && callback.error) {
                        job = {
                            success: callback.success,
                            error: callback.error
                        };
                    } else if (callback.callback) {
                        job = {
                            callback: callback.callback
                        };
                    } else {
                        throw "Either 'callback' or ('success' and 'error') callback must be provided " +
                              "when registering a Jolokia job";
                    }
                    job = $.extend(job,{
                        config: callback.config,
                        onlyIfModified: callback.onlyIfModified
                    });
                } else if (typeof callback === 'function') {
                    // Simplest version without config possibility
                    job = {
                        success: null,
                        error: null,
                        callback: callback
                    };
                } else {
                    throw "First argument must be either a callback func " +
                          "or an object with 'success' and 'error' attributes";
                }
                if (!requests) {
                    throw "No requests given";
                }
                job.requests = requests;
                var idx = jobs.length;
                jobs[idx] = job;
                return idx;
            };

            /**
             * Unregister a one or more request which has been registered with {@link #registerRequest}. As parameter
             * the handle returned during the registration process must be given
             * @param handle
             */
            this.unregister = function(handle) {
                if (handle < jobs.length) {
                    jobs[handle] = undefined;
                }
            };

            /**
             * Return an array of handles for currently registered jobs.
             * @return Array of job handles or an empty array
             */
            this.jobs = function() {
                var ret = [],
                    len = jobs.length;
                for (var i = 0; i < len; i++) {
                    if (jobs[i]) {
                        ret.push(i);
                    }
                }
                return ret;
            };

            /**
             * Start the poller. The interval between two polling attempts can be optionally given or are taken from
             * the parameter <code>fetchInterval</code> given at construction time. If no interval is given at all,
             * 30 seconds is the default.
             *
             * If the poller is already running (i.e. {@link #isRunning()} is <code>true</code> then the scheduler
             * is restarted, but only if the new interval differs from the currently active one.
             *
             * @param interval interval in milliseconds between two polling attempts
             */
            this.start = function(interval) {
                interval = interval || agentOptions.fetchInterval || 30000;
                if (pollerIsRunning) {
                    if (interval === agentOptions.fetchInterval) {
                        // Nothing to do
                        return;
                    }
                    // Re-start with new interval
                    this.stop();
                }
                agentOptions.fetchInterval = interval;
                this.timerId = setInterval(callJolokia(this,jobs), interval);

                pollerIsRunning = true;
            };

            /**
             * Stop the poller. If the poller is not running, no operation is performed.
             */
            this.stop = function() {
                if (!pollerIsRunning && this.timerId != undefined) {
                    return;
                }
                clearInterval(this.timerId);
                this.timerId = null;

                pollerIsRunning = false;
            };

            /**
             * Check whether the poller is running.
             * @return true if the poller is running, false otherwise.
             */
            this.isRunning = function() {
                return pollerIsRunning;
            };

            // ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
        }


        // ========================================================================
        // Private Methods:

        // Create a function called by a timer, which requests the registered requests
        // calling the stored callback on receipt. jolokia and jobs are put into the closure
        function callJolokia(jolokia,jobs) {
            return function() {
                var errorCbs = [],
                    successCbs = [],
                    i, j,
                    len = jobs.length;
                var requests = [];
                for (i = 0; i < len; i++) {
                    var job = jobs[i];
                    // Can happen when job has been deleted
                    // TODO: Can be probably optimized so that only the existing keys of jobs can be visited
                    if (!job) { continue;  }
                    var reqsLen = job.requests.length;
                    if (job.success) {
                        // Success/error pair of callbacks. For multiple request,
                        // these callback will be called multiple times
                        var successCb = cbSuccessClosure(job,i);
                        var errorCb = cbErrorClosure(job,i);
                        for (j = 0; j < reqsLen; j++) {
                            requests.push(prepareRequest(job,j));
                            successCbs.push(successCb);
                            errorCbs.push(errorCb);
                        }
                    } else {
                        // Job should have a single callback (job.callback) which will be
                        // called once with all responses at once as an array
                        var callback = cbCallbackClosure(job,jolokia);
                        // Add callbacks which collect the responses
                        for (j = 0; j < reqsLen - 1; j++) {
                            requests.push(prepareRequest(job,j));
                            successCbs.push(callback.cb);
                            errorCbs.push(callback.cb);
                        }
                        // Add final callback which finally will call the job.callback with all
                        // collected responses.
                        requests.push(prepareRequest(job,reqsLen-1));
                        successCbs.push(callback.lcb);
                        errorCbs.push(callback.lcb);
                    }
                }
                var opts = {
                    // Dispatch to the build up callbacks, request by request
                    success: function(resp, j) {
                        return successCbs[j].apply(jolokia, [resp, j]);
                    },
                    error: function(resp, j) {
                        return errorCbs[j].apply(jolokia, [resp, j]);
                    }
                };
                return jolokia.request(requests, opts);
            };
        }

        // Prepare a request with the proper configuration
        function prepareRequest(job,idx) {
            var request = job.requests[idx],
                config = job.config || {},
                // Add the proper ifModifiedSince parameter if already called at least once
                extra = job.onlyIfModified && job.lastModified ? { ifModifiedSince: job.lastModified } : {};

            request.config = $.extend({}, config, request.config, extra);
            return request;
        }

        // Closure for a full callback which stores the responses in an (closed) array
        // which the finally is feed in to the callback as array
        function cbCallbackClosure(job,jolokia) {
            var responses = [],
                callback = job.callback,
                lastModified = 0;

            return {
                cb : addResponse,
                lcb : function(resp,j) {
                    addResponse(resp);
                    // Callback is called only if at least one non-cached response
                    // is obtained. Update job's timestamp internally
                    if (responses.length > 0) {
                        job.lastModified = lastModified;
                        callback.apply(jolokia,responses);
                    }
                }
            };

            function addResponse(resp,j) {
                // Only remember responses with values and remember lowest timetamp, too.
                if (resp.status != 304) {
                    if (lastModified == 0 || resp.timestamp < lastModified ) {
                        lastModified = resp.timestamp;
                    }
                    responses.push(resp);
                }
            }
        }

        // Own function for creating a closure to avoid reference to mutable state in the loop
        function cbErrorClosure(job, i) {
            var callback = job.error;
            return function(resp,j) {
                // If we get a "304 - Not Modified" 'error', we do nothing
                if (resp.status == 304) {
                    return;
                }
                if (callback) {
                    callback(resp,i,j)
                }
            }
        }

        function cbSuccessClosure(job, i) {
            var callback = job.success;
            return function(resp,j) {
                if (callback) {
                    // Remember last success callback
                    if (job.onlyIfModified) {
                        job.lastModified = resp.timestamp;
                    }
                    callback(resp,i,j)
                }
            }
        }

        // Construct a callback dispatcher for appropriately dispatching
        // to a single callback or within an array of callbacks
        function constructCallbackDispatcher(callback) {
            if (callback == null) {
                return function (response) {
                    console.warn("Ignoring response " + JSON.stringify(response));
                };
            } else if (callback === "ignore") {
                // Ignore the return value
                return function () {
                };
            }
            var callbackArray = $.isArray(callback) ? callback : [ callback ];
            return function (response, idx) {
                callbackArray[idx % callbackArray.length](response, idx);
            }
        }

        // Extract the HTTP-Method to use and make some sanity checks if
        // the method was provided as part of the options, but dont fit
        // to the request given
        function extractMethod(request, opts) {
            var methodGiven = opts && opts.method ? opts.method.toLowerCase() : null,
                    method;
            if (methodGiven) {
                if (methodGiven === "get") {
                    if ($.isArray(request)) {
                        throw new Error("Cannot use GET with bulk requests");
                    }
                    if (request.type.toLowerCase() === "read" && $.isArray(request.attribute)) {
                        throw new Error("Cannot use GET for read with multiple attributes");
                    }
                    if (request.target) {
                        throw new Error("Cannot use GET request with proxy mode");
                    }
                    if (request.config) {
                        throw new Error("Cannot use GET with request specific config");
                    }
                }
                method = methodGiven;
            } else {
                // Determine method dynamically
                method = $.isArray(request) ||
                         request.config ||
                         (request.type.toLowerCase() === "read" && $.isArray(request.attribute)) ||
                         request.target ?
                        "post" : "get";
            }
            if (opts.jsonp && method === "post") {
                throw new Error("Can not use JSONP with POST requests");
            }
            return method;
        }

        // Add processing parameters given as request options
        // to an URL as GET query parameters
        function addProcessingParameters(url, opts) {
            var sep = url.indexOf("?") > 0 ? "&" : "?";
            $.each(PROCESSING_PARAMS, function (i, key) {
                if (opts[key] != null) {
                    url += sep + key + "=" + opts[key];
                    sep = "&";
                }
            });
            return url;
        }

        // ========================================================================
        // GET-Request handling

        // Create the URL used for a GET request
        function constructGetUrlPath(request) {
            var type = request.type;
            assertNotNull(type, "No request type given for building a GET request");
            type = type.toLowerCase();
            var extractor = GET_URL_EXTRACTORS[type];
            assertNotNull(extractor, "Unknown request type " + type);
            var result = extractor(request);
            var parts = result.parts || {};
            var url = type;
            $.each(parts, function (i, v) {
                url += "/" + Jolokia.escape(v)
            });
            if (result.path) {
                url += (result.path[0] == '/' ? "" : "/") + result.path;
            }
            return url;
        }

        // For POST requests it is recommended to have a trailing slash at the URL
        // in order to avoid a redirect which then results in a GET request.
        // See also https://bugs.eclipse.org/bugs/show_bug.cgi?id=331194#c1
        // for an explanation
        function ensureTrailingSlash(url) {
            // Squeeze any URL to a single one, optionally adding one
            return url.replace(/\/*$/, "/");
        }

        // Extractors used for preparing a GET request, i.e. for creating a stack
        // of arguments which gets appended to create the proper access URL
        // key: lowercase request type.
        // The return value is an object with two properties: The 'parts' to glue together, where
        // each part gets escaped and a 'path' which is appended literally
        var GET_URL_EXTRACTORS = {
            "read":function (request) {
                if (request.attribute == null) {
                    // Path gets ignored for multiple attribute fetch
                    return { parts:[ request.mbean ] };
                } else {
                    return { parts:[ request.mbean, request.attribute ], path:request.path };
                }
            },
            "write":function (request) {
                return { parts:[request.mbean, request.attribute, valueToString(request.value)], path:request.path};
            },
            "exec":function (request) {
                var ret = [ request.mbean, request.operation ];
                if (request.arguments && request.arguments.length > 0) {
                    $.each(request.arguments, function (index, value) {
                        ret.push(valueToString(value));
                    });
                }
                return {parts:ret};
            },
            "version":function () {
                return {};
            },
            "search":function (request) {
                return { parts:[request.mbean]};
            },
            "list":function (request) {
                return { path:request.path};
            }
        };

        // Convert a value to a string for passing it to the Jolokia agent via
        // a get request (write, exec). Value can be either a single object or an array
        function valueToString(value) {
            if (value == null) {
                return "[null]";
            }
            if ($.isArray(value)) {
                var ret = "";
                for (var i = 0; i < value.length; i++) {
                    ret += value == null ? "[null]" : singleValueToString(value[i]);
                    if (i < value.length - 1) {
                        ret += ",";
                    }
                }
                return ret;
            } else {
                return singleValueToString(value);
            }
        }

        // Single value conversion for write/exec GET requests
        function singleValueToString(value) {
            if (typeof value === "string" && value.length == 0) {
                return "\"\"";
            } else {
                return value.toString();
            }
        }

        // Check whether a synchronous request was a success or not
        // Taken from jQuery 1.4
        function httpSuccess(xhr) {
            try {
                return !xhr.status && location.protocol === "file:" ||
                       xhr.status >= 200 && xhr.status < 300 ||
                       xhr.status === 304 || xhr.status === 1223;
            } catch (e) {
            }
            return false;
        }

        // ===============================================================================================
        // Utility methods:

        function assertNotNull(object, message) {
            if (object == null) {
                throw new Error(message);
            }
        }

        // ================================================================================================

        // Escape a path part, can be used as a static method outside this function too
        Jolokia.prototype.escape = Jolokia.escape = function (part) {
            return encodeURIComponent(part.replace(/!/g, "!!").replace(/\//g, "!/"));
        };

        /**
         * Utility method which checks whether a response is an error or a success
         * @param resp response to check
         * @return true if response is an error, false otherwise
         */
        Jolokia.prototype.isError = Jolokia.isError = function(resp) {
            return resp.status == null || resp.status != 200;
        };

        // Return back exported function/constructor
        return Jolokia;
    };

    // =====================================================================================================
    // Register either as global or as AMD module

    (function (root, factory) {
        if (typeof define === 'function' && define.amd) {
            // AMD. Register as a named module
            define(["jquery"], factory);
        } else {
            // Browser globals
            root.Jolokia = factory(root.jQuery);
        }
    }(this, function (jQuery) {
        return _jolokiaConstructorFunc(jQuery);
    }));
}());


/*
 * Copyright 2009-2013 Roland Huss
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


/**
 * Simplified access to the Jolokia agent.
 *
 * This script will add convenience methods to <code>Jolokia</code> for
 * simplified access to JMX information. Before including this script, "jolokia.js"
 * must be included.
 *
 * It is recommended to compress this script before using it in production.
 *
 * @author roland
 */

(function() {
    var builder = function($,Jolokia) {
        /**
         * Get one or more attributes
         *
         * @param mbean objectname of MBean to query. Can be a pattern.
         * @param attribute attribute name. If an array, multiple attributes are fetched.
         *                  If <code>null</code>, all attributes are fetched.
         * @param path optional path within the return value. For multi-attribute fetch, the path
         *             is ignored.
         * @param opts options passed to Jolokia.request()
         * @return the value of the attribute, possibly a complex object
         */
        function getAttribute(mbean,attribute,path,opts) {
            if (arguments.length === 3 && $.isPlainObject(path)) {
                opts = path;
                path = null;
            } else if (arguments.length == 2 && $.isPlainObject(attribute)) {
                opts = attribute;
                attribute = null;
                path = null;
            }
            var req = { type: "read", mbean: mbean, attribute: attribute };
            addPath(req,path);
            return extractValue(this.request(req,prepareSucessCallback(opts)),opts);
        }

        /**
         * Set an attribute on a MBean.
         *
         * @param mbean objectname of MBean to set
         * @param attribute the attribute to set
         * @param value the value to set
         * @param path an optional <em>inner path</em> which, when given, is used to determine
         *        an inner object to set the value on
         * @param opts additional options passed to Jolokia.request()
         * @return the previous value
         */
        function setAttribute(mbean,attribute,value,path,opts) {
            if (arguments.length === 4 && $.isPlainObject(path)) {
                opts = path;
                path = null;
            }
            var req = { type: "write", mbean: mbean, attribute: attribute, value: value };
            addPath(req,path);
            return extractValue(this.request(req,prepareSucessCallback(opts)),opts);
        }

        /**
         * Execute a JMX operation and return the result value
         *
         * @param mbean objectname of the MBean to operate on
         * @param operation name of operation to execute. Can contain a signature in case overloaded
         *                  operations are to be called (comma separated fully qualified argument types
         *                  append to the operation name within parentheses)
         * @param arg1, arg2, ..... one or more argument required for executing the operation.
         * @param opts optional options for Jolokia.request() (must be an object)
         * @return the return value of the JMX operation.
         */
        function execute(mbean,operation) {
            var req = { type: "exec", mbean: mbean, operation: operation };
            var opts, end = arguments.length;
            if (arguments.length > 2 && $.isPlainObject(arguments[arguments.length-1])) {
                opts = arguments[arguments.length-1];
                end = arguments.length-1;
            }
            if (end > 2) {
                var args = [];
                for (var i = 2; i < end; i++) {
                    args[i-2] = arguments[i];
                }
                req.arguments = args;
            }
            return extractValue(this.request(req,prepareSucessCallback(opts)),opts);
        }

        /**
         * Search for MBean based on a pattern and return a reference to the list of found
         * MBeans names (as string). If no MBean can be found, <code>null</code> is returned. For
         * example,
         *
         * jolokia.search("*:j2eeType=J2EEServer,*")
         *
         * searches all MBeans whose name are matching this pattern, which are according
         * to JSR77 all application servers in all available domains.
         *
         * @param mbeanPattern pattern to search for
         * @param opts optional options for Jolokia.request()
         * @return an array with ObjectNames as string
         */
        function search(mbeanPattern,opts) {
            var req = { type: "search", mbean: mbeanPattern};
            return extractValue(this.request(req,prepareSucessCallback(opts)),opts);
        }

        /**
         * This method return the version of the agent and the Jolokia protocol
         * version as part of an object. If available, server specific information
         * like the application server's name are returned as wel.
         * A typical response looks like
         *
         * <pre>
         *  {
         *    protocol: "4.0",
         *    agent: "0.82",
         *    info: {
         *       product: "glassfish",
         *       vendor": "Sun",
         *       extraInfo: {
         *          amxBooted: false
         *       }
         *  }
         * </pre>
         *
         * @param opts optional options for Jolokia.request()
         * @param version and other meta information as object
         */
        function version(opts) {
            return extractValue(this.request({type: "version"},prepareSucessCallback(opts)),opts);
        }


        /**
         * Get all MBeans as registered at the specified server. A C<$path> can be
         * specified in order to fetchy only a subset of the information. When no path is
         * given, the returned value has the following format
         *
         * <pre>
         * {
         *     &lt;domain&gt; :
         *     {
         *       &lt;canonical property list&gt; :
         *       {
         *           "attr" :
         *           {
         *              &lt;atrribute name&gt; :
         *              {
         *                 desc : &lt;description of attribute&gt;
         *                 type : &lt;java type&gt;,
         *                 rw : true/false
         *              },
         *              ....
         *           },
         *           "op" :
         *           {
         *              &lt;operation name&gt; :
         *              {
         *                "desc" : &lt;description of operation&gt;
         *                "ret" : &lt;return java type&gt;
         *                "args" :
         *                [
         *                   {
         *                     "desc" : &lt;description&gt;,
         *                     "name" : &lt;name&gt;,
         *                     "type" : &lt;java type&gt;
         *                   },
         *                   ....
         *                ]
         *              },
         *              ....
         *       },
         *       ....
         *     }
         *     ....
         *  }
         * </pre>
         *
         * A complete path has the format &lt;domain&gt;/property
         * list&gt;/("attribute"|"operation")/&lt;index&gt;">
         * (e.g. <code>java.lang/name=Code Cache,type=MemoryPool/attribute/0</code>). A path can be
         * provided partially, in which case the remaining map/array is returned. The path given must
         * be already properly escaped (i.e. slashes must be escaped like <code>!/</code> and exlamation
         * marks like <code>!!</code>.
         * See also the Jolokia Reference Manual for a more detailed discussion of inner paths and escaping.
         *
         *
         * @param path optional path for diving into the list
         * @param opts optional opts passed to Jolokia.request()
         */
        function list(path,opts) {
            if (arguments.length == 1 && !$.isArray(path) && $.isPlainObject(path)) {
                opts = path;
                path = null;
            }
            var req = { type: "list" };
            addPath(req,path);
            return extractValue(this.request(req,prepareSucessCallback(opts)),opts);
        }

        // =======================================================================
        // Private methods:

        // If path is an array, the elements get escaped. If not, it is
        // taken directly
        function addPath(req,path) {
            if (path != null) {
                if ($.isArray(path)) {
                    req.path = $.map(path,Jolokia.escape).join("/");
                } else {
                    req.path = path;
                }
            }
        }

        function extractValue(response,opts) {
            if (response == null) {
                return null;
            }
            if (response.status == 200) {
                return response.value;
            }
            if (opts && opts.error) {
                return opts.error(response);
            } else {
                throw new Error("Jolokia-Error: " + JSON.stringify(response));
            }
        }

        // Prepare callback to receive directly the value (instead of the full blown response)
        function prepareSucessCallback(opts) {
            if (opts && opts.success) {
                var parm = $.extend({},opts);
                parm.success = function(resp) {
                    opts.success(resp.value);
                };
                return parm;
            } else {
                return opts;
            }
        }

        // Extend the Jolokia prototype with new functionality (mixin)
        $.extend(Jolokia.prototype,
                {
                    "getAttribute" : getAttribute,
                    "setAttribute" : setAttribute,
                    "execute": execute,
                    "search": search,
                    "version": version,
                    "list": list
                });
        return Jolokia;
    };

    // =====================================================================================================
    // Register either at the global Jolokia object global or as an AMD module
    (function (root, factory) {
        if (typeof define === 'function' && define.amd) {
            // AMD. Register as a named module
            define(["jquery","jolokia"], factory);
        } else {
            if (root.Jolokia) {
                builder(jQuery,root.Jolokia);
            } else {
                console.error("No Jolokia definition found. Please include jolokia.js before jolokia-simple.js");
            }
        }
    }(this, function (jQuery,Jolokia) {
        return builder(jQuery,Jolokia);
    }));
})();


(function(exports){
var cubism = exports.cubism = {version: "1.6.0"};
var cubism_id = 0;
function cubism_identity(d) { return d; }
cubism.option = function(name, defaultValue) {
  var values = cubism.options(name);
  return values.length ? values[0] : defaultValue;
};

cubism.options = function(name, defaultValues) {
  var options = location.search.substring(1).split("&"),
      values = [],
      i = -1,
      n = options.length,
      o;
  while (++i < n) {
    if ((o = options[i].split("="))[0] == name) {
      values.push(decodeURIComponent(o[1]));
    }
  }
  return values.length || arguments.length < 2 ? values : defaultValues;
};
cubism.context = function() {
  var context = new cubism_context,
      step = 1e4, // ten seconds, in milliseconds
      size = 1440, // four hours at ten seconds, in pixels
      start0, stop0, // the start and stop for the previous change event
      start1, stop1, // the start and stop for the next prepare event
      serverDelay = 5e3,
      clientDelay = 5e3,
      event = d3.dispatch("prepare", "beforechange", "change", "focus"),
      scale = context.scale = d3.time.scale().range([0, size]),
      timeout,
      focus;

  function update() {
    var now = Date.now();
    stop0 = new Date(Math.floor((now - serverDelay - clientDelay) / step) * step);
    start0 = new Date(stop0 - size * step);
    stop1 = new Date(Math.floor((now - serverDelay) / step) * step);
    start1 = new Date(stop1 - size * step);
    scale.domain([start0, stop0]);
    return context;
  }

  context.start = function() {
    if (timeout) clearTimeout(timeout);
    var delay = +stop1 + serverDelay - Date.now();

    // If we're too late for the first prepare event, skip it.
    if (delay < clientDelay) delay += step;

    timeout = setTimeout(function prepare() {
      stop1 = new Date(Math.floor((Date.now() - serverDelay) / step) * step);
      start1 = new Date(stop1 - size * step);
      event.prepare.call(context, start1, stop1);

      setTimeout(function() {
        scale.domain([start0 = start1, stop0 = stop1]);
        event.beforechange.call(context, start1, stop1);
        event.change.call(context, start1, stop1);
        event.focus.call(context, focus);
      }, clientDelay);

      timeout = setTimeout(prepare, step);
    }, delay);
    return context;
  };

  context.stop = function() {
    timeout = clearTimeout(timeout);
    return context;
  };

  timeout = setTimeout(context.start, 10);

  // Set or get the step interval in milliseconds.
  // Defaults to ten seconds.
  context.step = function(_) {
    if (!arguments.length) return step;
    step = +_;
    return update();
  };

  // Set or get the context size (the count of metric values).
  // Defaults to 1440 (four hours at ten seconds).
  context.size = function(_) {
    if (!arguments.length) return size;
    scale.range([0, size = +_]);
    return update();
  };

  // The server delay is the amount of time we wait for the server to compute a
  // metric. This delay may result from clock skew or from delays collecting
  // metrics from various hosts. Defaults to 4 seconds.
  context.serverDelay = function(_) {
    if (!arguments.length) return serverDelay;
    serverDelay = +_;
    return update();
  };

  // The client delay is the amount of additional time we wait to fetch those
  // metrics from the server. The client and server delay combined represent the
  // age of the most recent displayed metric. Defaults to 1 second.
  context.clientDelay = function(_) {
    if (!arguments.length) return clientDelay;
    clientDelay = +_;
    return update();
  };

  // Sets the focus to the specified index, and dispatches a "focus" event.
  context.focus = function(i) {
    event.focus.call(context, focus = i);
    return context;
  };

  // Add, remove or get listeners for events.
  context.on = function(type, listener) {
    if (arguments.length < 2) return event.on(type);

    event.on(type, listener);

    // Notify the listener of the current start and stop time, as appropriate.
    // This way, metrics can make requests for data immediately,
    // and likewise the axis can display itself synchronously.
    if (listener != null) {
      if (/^prepare(\.|$)/.test(type)) listener.call(context, start1, stop1);
      if (/^beforechange(\.|$)/.test(type)) listener.call(context, start0, stop0);
      if (/^change(\.|$)/.test(type)) listener.call(context, start0, stop0);
      if (/^focus(\.|$)/.test(type)) listener.call(context, focus);
    }

    return context;
  };

  d3.select(window).on("keydown.context-" + ++cubism_id, function() {
    switch (!d3.event.metaKey && d3.event.keyCode) {
      case 37: // left
        if (focus == null) focus = size - 1;
        if (focus > 0) context.focus(--focus);
        break;
      case 39: // right
        if (focus == null) focus = size - 2;
        if (focus < size - 1) context.focus(++focus);
        break;
      default: return;
    }
    d3.event.preventDefault();
  });

  return update();
};

function cubism_context() {}

var cubism_contextPrototype = cubism.context.prototype = cubism_context.prototype;

cubism_contextPrototype.constant = function(value) {
  return new cubism_metricConstant(this, +value);
};
cubism_contextPrototype.cube = function(host) {
  if (!arguments.length) host = "";
  var source = {},
      context = this;

  source.metric = function(expression) {
    return context.metric(function(start, stop, step, callback) {
      d3.json(host + "/1.0/metric"
          + "?expression=" + encodeURIComponent(expression)
          + "&start=" + cubism_cubeFormatDate(start)
          + "&stop=" + cubism_cubeFormatDate(stop)
          + "&step=" + step, function(data) {
        if (!data) return callback(new Error("unable to load data"));
        callback(null, data.map(function(d) { return d.value; }));
      });
    }, expression += "");
  };

  // Returns the Cube host.
  source.toString = function() {
    return host;
  };

  return source;
};

var cubism_cubeFormatDate = d3.time.format.iso;
/* librato (http://dev.librato.com/v1/post/metrics) source
 * If you want to see an example of how to use this source, check: https://gist.github.com/drio/5792680
 */
cubism_contextPrototype.librato = function(user, token) {
  var source      = {},
      context     = this;
      auth_string = "Basic " + btoa(user + ":" + token);
      avail_rsts  = [ 1, 60, 900, 3600 ];

  /* Given a step, find the best librato resolution to use.
   *
   * Example:
   *
   * (s) : cubism step
   *
   * avail_rsts   1 --------------- 60 --------------- 900 ---------------- 3600
   *                                |    (s)            |
   *                                |                   |
   *                              [low_res             top_res]
   *
   * return: low_res (60)
   */
  function find_ideal_librato_resolution(step) {
    var highest_res = avail_rsts[0],
        lowest_res  = avail_rsts[avail_rsts.length]; // high and lowest available resolution from librato

    /* If step is outside the highest or lowest librato resolution, pick them and we are done */
    if (step >= lowest_res)
      return lowest_res;

    if (step <= highest_res)
      return highest_res;

    /* If not, find in what resolution interval the step lands. */
    var iof, top_res, i;
    for (i=step; i<=lowest_res; i++) {
      iof = avail_rsts.indexOf(i);
      if (iof > -1) {
        top_res = avail_rsts[iof];
        break;
      }
    }

    var low_res;
    for (i=step; i>=highest_res; i--) {
      iof = avail_rsts.indexOf(i);
      if (iof > -1) {
        low_res = avail_rsts[iof];
        break;
      }
    }

    /* What's the closest librato resolution given the step ? */
    return ((top_res-step) < (step-low_res)) ? top_res : low_res;
  }

  function find_librato_resolution(sdate, edate, step) {
    var i_size      = edate - sdate,                 // interval size
        month       = 2419200,
        week        = 604800,
        two_days    = 172800,
        ideal_res;

    if (i_size > month)
      return 3600;

    ideal_res = find_ideal_librato_resolution(step);

    /*
     * Now we have the ideal resolution, but due to the retention policies at librato, maybe we have
     * to use a higher resolution.
     * http://support.metrics.librato.com/knowledgebase/articles/66838-understanding-metrics-roll-ups-retention-and-grap
     */
    if (i_size > week && ideal_res < 900)
      return 900;
    else if (i_size > two_days && ideal_res < 60)
      return 60;
    else
      return ideal_res;
  }

  /* All the logic to query the librato API is here */
  var librato_request = function(composite) {
    var url_prefix  = "https://metrics-api.librato.com/v1/metrics";

    function make_url(sdate, edate, step) {
      var params    = "compose="     + composite +
                      "&start_time=" + sdate     +
                      "&end_time="   + edate     +
                      "&resolution=" + find_librato_resolution(sdate, edate, step);
      return url_prefix + "?" + params;
    }

    /*
     * We are most likely not going to get the same number of measurements
     * cubism expects for a particular context: We have to perform down/up
     * sampling
     */
    function down_up_sampling(isdate, iedate, step, librato_mm) {
      var av = [];

      for (i=isdate; i<=iedate; i+=step) {
        var int_mes = [];
        while (librato_mm.length && librato_mm[0].measure_time <= i) {
          int_mes.push(librato_mm.shift().value);
        }

        var v;
        if (int_mes.length) { /* Compute the average */
          v = int_mes.reduce(function(a, b) { return a + b }) / int_mes.length;
        } else { /* No librato values on interval */
          v = (av.length) ? av[av.length-1] : 0;
        }
        av.push(v);
      }

      return av;
    }

    request = {};

    request.fire = function(isdate, iedate, step, callback_done) {
      var a_values = []; /* Store partial values from librato */

      /*
       * Librato has a limit in the number of measurements we get back in a request (100).
       * We recursively perform requests to the API to ensure we have all the data points
       * for the interval we are working on.
       */
      function actual_request(full_url) {
        d3.json(full_url)
          .header("X-Requested-With", "XMLHttpRequest")
          .header("Authorization", auth_string)
          .header("Librato-User-Agent", 'cubism/' + cubism.version)
          .get(function (error, data) { /* Callback; data available */
            if (!error) {
              if (data.measurements.length === 0) {
                return
              }
              data.measurements[0].series.forEach(function(o) { a_values.push(o); });

              var still_more_values = 'query' in data && 'next_time' in data.query;
              if (still_more_values) {
                actual_request(make_url(data.query.next_time, iedate, step));
              } else {
                var a_adjusted = down_up_sampling(isdate, iedate, step, a_values);
                callback_done(a_adjusted);
              }
            }
          });
      }

      actual_request(make_url(isdate, iedate, step));
    };

    return request;
  };

  /*
   * The user will use this method to create a cubism source (librato in this case)
   * and call .metric() as necessary to create metrics.
   */
  source.metric = function(m_composite) {
    return context.metric(function(start, stop, step, callback) {
      /* All the librato logic is here; .fire() retrieves the metrics' data */
      librato_request(m_composite)
        .fire(cubism_libratoFormatDate(start),
              cubism_libratoFormatDate(stop),
              cubism_libratoFormatDate(step),
              function(a_values) { callback(null, a_values); });

      }, m_composite += "");
    };

  /* This is not used when the source is librato */
  source.toString = function() {
    return "librato";
  };

  return source;
};

var cubism_libratoFormatDate = function(time) {
  return Math.floor(time / 1000);
};
cubism_contextPrototype.graphite = function(host) {
  if (!arguments.length) host = "";
  var source = {},
      context = this;

  source.metric = function(expression) {
    var sum = "sum";

    var metric = context.metric(function(start, stop, step, callback) {
      var target = expression;

      // Apply the summarize, if necessary.
      if (step !== 1e4) target = "summarize(" + target + ",'"
          + (!(step % 36e5) ? step / 36e5 + "hour" : !(step % 6e4) ? step / 6e4 + "min" : step / 1e3 + "sec")
          + "','" + sum + "')";

      d3.text(host + "/render?format=raw"
          + "&target=" + encodeURIComponent("alias(" + target + ",'')")
          + "&from=" + cubism_graphiteFormatDate(start - 2 * step) // off-by-two?
          + "&until=" + cubism_graphiteFormatDate(stop - 1000), function(text) {
        if (!text) return callback(new Error("unable to load data"));
        callback(null, cubism_graphiteParse(text));
      });
    }, expression += "");

    metric.summarize = function(_) {
      sum = _;
      return metric;
    };

    return metric;
  };

  source.find = function(pattern, callback) {
    d3.json(host + "/metrics/find?format=completer"
        + "&query=" + encodeURIComponent(pattern), function(result) {
      if (!result) return callback(new Error("unable to find metrics"));
      callback(null, result.metrics.map(function(d) { return d.path; }));
    });
  };

  // Returns the graphite host.
  source.toString = function() {
    return host;
  };

  return source;
};

// Graphite understands seconds since UNIX epoch.
function cubism_graphiteFormatDate(time) {
  return Math.floor(time / 1000);
}

// Helper method for parsing graphite's raw format.
function cubism_graphiteParse(text) {
  var i = text.indexOf("|"),
      meta = text.substring(0, i),
      c = meta.lastIndexOf(","),
      b = meta.lastIndexOf(",", c - 1),
      a = meta.lastIndexOf(",", b - 1),
      start = meta.substring(a + 1, b) * 1000,
      step = meta.substring(c + 1) * 1000;
  return text
      .substring(i + 1)
      .split(",")
      .slice(1) // the first value is always None?
      .map(function(d) { return +d; });
}
cubism_contextPrototype.gangliaWeb = function(config) {
  var host = '',
      uriPathPrefix = '/ganglia2/';
 
  if (arguments.length) {
    if (config.host) {
      host = config.host;
    }

    if (config.uriPathPrefix) {
      uriPathPrefix = config.uriPathPrefix;

      /* Add leading and trailing slashes, as appropriate. */
      if( uriPathPrefix[0] != '/' ) {
        uriPathPrefix = '/' + uriPathPrefix;
      }

      if( uriPathPrefix[uriPathPrefix.length - 1] != '/' ) {
        uriPathPrefix += '/';
      }
    }
  }

  var source = {},
      context = this;

  source.metric = function(metricInfo) {

    /* Store the members from metricInfo into local variables. */
    var clusterName = metricInfo.clusterName, 
        metricName = metricInfo.metricName, 
        hostName = metricInfo.hostName,
        isReport = metricInfo.isReport || false,
        titleGenerator = metricInfo.titleGenerator ||
          /* Reasonable (not necessarily pretty) default for titleGenerator. */
          function(unusedMetricInfo) {
            /* unusedMetricInfo is, well, unused in this default case. */
            return ('clusterName:' + clusterName + 
                    ' metricName:' + metricName +
                    (hostName ? ' hostName:' + hostName : ''));
          },
        onChangeCallback = metricInfo.onChangeCallback;
    
    /* Default to plain, simple metrics. */
    var metricKeyName = isReport ? 'g' : 'm';

    var gangliaWebMetric = context.metric(function(start, stop, step, callback) {

      function constructGangliaWebRequestQueryParams() {
        return ('c=' + clusterName +
                '&' + metricKeyName + '=' + metricName + 
                (hostName ? '&h=' + hostName : '') + 
                '&cs=' + start/1000 + '&ce=' + stop/1000 + '&step=' + step/1000 + '&graphlot=1');
      }

      d3.json(host + uriPathPrefix + 'graph.php?' + constructGangliaWebRequestQueryParams(),
        function(result) {
          if( !result ) {
            return callback(new Error("Unable to fetch GangliaWeb data"));
          }

          callback(null, result[0].data);
        });

    }, titleGenerator(metricInfo));

    gangliaWebMetric.toString = function() {
      return titleGenerator(metricInfo);
    };

    /* Allow users to run their custom code each time a gangliaWebMetric changes.
     *
     * TODO Consider abstracting away the naked Cubism call, and instead exposing 
     * a callback that takes in the values array (maybe alongwith the original
     * start and stop 'naked' parameters), since it's handy to have the entire
     * dataset at your disposal (and users will likely implement onChangeCallback
     * primarily to get at this dataset).
     */
    if (onChangeCallback) {
      gangliaWebMetric.on('change', onChangeCallback);
    }

    return gangliaWebMetric;
  };

  // Returns the gangliaWeb host + uriPathPrefix.
  source.toString = function() {
    return host + uriPathPrefix;
  };

  return source;
};

function cubism_metric(context) {
  if (!(context instanceof cubism_context)) throw new Error("invalid context");
  this.context = context;
}

var cubism_metricPrototype = cubism_metric.prototype;

cubism.metric = cubism_metric;

cubism_metricPrototype.valueAt = function() {
  return NaN;
};

cubism_metricPrototype.alias = function(name) {
  this.toString = function() { return name; };
  return this;
};

cubism_metricPrototype.extent = function() {
  var i = 0,
      n = this.context.size(),
      value,
      min = Infinity,
      max = -Infinity;
  while (++i < n) {
    value = this.valueAt(i);
    if (value < min) min = value;
    if (value > max) max = value;
  }
  return [min, max];
};

cubism_metricPrototype.on = function(type, listener) {
  return arguments.length < 2 ? null : this;
};

cubism_metricPrototype.shift = function() {
  return this;
};

cubism_metricPrototype.on = function() {
  return arguments.length < 2 ? null : this;
};

cubism_contextPrototype.metric = function(request, name) {
  var context = this,
      metric = new cubism_metric(context),
      id = ".metric-" + ++cubism_id,
      start = -Infinity,
      stop,
      step = context.step(),
      size = context.size(),
      values = [],
      event = d3.dispatch("change"),
      listening = 0,
      fetching;

  // Prefetch new data into a temporary array.
  function prepare(start1, stop) {
    var steps = Math.min(size, Math.round((start1 - start) / step));
    if (!steps || fetching) return; // already fetched, or fetching!
    fetching = true;
    steps = Math.min(size, steps + cubism_metricOverlap);
    var start0 = new Date(stop - steps * step);
    request(start0, stop, step, function(error, data) {
      fetching = false;
      if (error) return console.warn(error);
      var i = isFinite(start) ? Math.round((start0 - start) / step) : 0;
      for (var j = 0, m = data.length; j < m; ++j) values[j + i] = data[j];
      event.change.call(metric, start, stop);
    });
  }

  // When the context changes, switch to the new data, ready-or-not!
  function beforechange(start1, stop1) {
    if (!isFinite(start)) start = start1;
    values.splice(0, Math.max(0, Math.min(size, Math.round((start1 - start) / step))));
    start = start1;
    stop = stop1;
  }

  //
  metric.valueAt = function(i) {
    return values[i];
  };

  //
  metric.shift = function(offset) {
    return context.metric(cubism_metricShift(request, +offset));
  };

  //
  metric.on = function(type, listener) {
    if (!arguments.length) return event.on(type);

    // If there are no listeners, then stop listening to the context,
    // and avoid unnecessary fetches.
    if (listener == null) {
      if (event.on(type) != null && --listening == 0) {
        context.on("prepare" + id, null).on("beforechange" + id, null);
      }
    } else {
      if (event.on(type) == null && ++listening == 1) {
        context.on("prepare" + id, prepare).on("beforechange" + id, beforechange);
      }
    }

    event.on(type, listener);

    // Notify the listener of the current start and stop time, as appropriate.
    // This way, charts can display synchronous metrics immediately.
    if (listener != null) {
      if (/^change(\.|$)/.test(type)) listener.call(context, start, stop);
    }

    return metric;
  };

  //
  if (arguments.length > 1) metric.toString = function() {
    return name;
  };

  return metric;
};

// Number of metric to refetch each period, in case of lag.
var cubism_metricOverlap = 6;

// Wraps the specified request implementation, and shifts time by the given offset.
function cubism_metricShift(request, offset) {
  return function(start, stop, step, callback) {
    request(new Date(+start + offset), new Date(+stop + offset), step, callback);
  };
}
function cubism_metricConstant(context, value) {
  cubism_metric.call(this, context);
  value = +value;
  var name = value + "";
  this.valueOf = function() { return value; };
  this.toString = function() { return name; };
}

var cubism_metricConstantPrototype = cubism_metricConstant.prototype = Object.create(cubism_metric.prototype);

cubism_metricConstantPrototype.valueAt = function() {
  return +this;
};

cubism_metricConstantPrototype.extent = function() {
  return [+this, +this];
};
function cubism_metricOperator(name, operate) {

  function cubism_metricOperator(left, right) {
    if (!(right instanceof cubism_metric)) right = new cubism_metricConstant(left.context, right);
    else if (left.context !== right.context) throw new Error("mismatch context");
    cubism_metric.call(this, left.context);
    this.left = left;
    this.right = right;
    this.toString = function() { return left + " " + name + " " + right; };
  }

  var cubism_metricOperatorPrototype = cubism_metricOperator.prototype = Object.create(cubism_metric.prototype);

  cubism_metricOperatorPrototype.valueAt = function(i) {
    return operate(this.left.valueAt(i), this.right.valueAt(i));
  };

  cubism_metricOperatorPrototype.shift = function(offset) {
    return new cubism_metricOperator(this.left.shift(offset), this.right.shift(offset));
  };

  cubism_metricOperatorPrototype.on = function(type, listener) {
    if (arguments.length < 2) return this.left.on(type);
    this.left.on(type, listener);
    this.right.on(type, listener);
    return this;
  };

  return function(right) {
    return new cubism_metricOperator(this, right);
  };
}

cubism_metricPrototype.add = cubism_metricOperator("+", function(left, right) {
  return left + right;
});

cubism_metricPrototype.subtract = cubism_metricOperator("-", function(left, right) {
  return left - right;
});

cubism_metricPrototype.multiply = cubism_metricOperator("*", function(left, right) {
  return left * right;
});

cubism_metricPrototype.divide = cubism_metricOperator("/", function(left, right) {
  return left / right;
});
cubism_contextPrototype.horizon = function() {
  var context = this,
      mode = "offset",
      buffer = document.createElement("canvas"),
      width = buffer.width = context.size(),
      height = buffer.height = 30,
      scale = d3.scale.linear().interpolate(d3.interpolateRound),
      metric = cubism_identity,
      extent = null,
      title = cubism_identity,
      format = d3.format(".2s"),
      colors = ["#08519c","#3182bd","#6baed6","#bdd7e7","#bae4b3","#74c476","#31a354","#006d2c"];

  function horizon(selection) {

    selection
        .on("mousemove.horizon", function() { context.focus(Math.round(d3.mouse(this)[0])); })
        .on("mouseout.horizon", function() { context.focus(null); });

    selection.append("canvas")
        .attr("width", width)
        .attr("height", height);

    selection.append("span")
        .attr("class", "title")
        .text(title);

    selection.append("span")
        .attr("class", "value");

    selection.each(function(d, i) {
      var that = this,
          id = ++cubism_id,
          metric_ = typeof metric === "function" ? metric.call(that, d, i) : metric,
          colors_ = typeof colors === "function" ? colors.call(that, d, i) : colors,
          extent_ = typeof extent === "function" ? extent.call(that, d, i) : extent,
          start = -Infinity,
          step = context.step(),
          canvas = d3.select(that).select("canvas"),
          span = d3.select(that).select(".value"),
          max_,
          m = colors_.length >> 1,
          ready;

      canvas.datum({id: id, metric: metric_});
      canvas = canvas.node().getContext("2d");

      function change(start1, stop) {
        canvas.save();

        // compute the new extent and ready flag
        var extent = metric_.extent();
        ready = extent.every(isFinite);
        if (extent_ != null) extent = extent_;

        // if this is an update (with no extent change), copy old values!
        var i0 = 0, max = Math.max(-extent[0], extent[1]);
        if (this === context) {
          if (max == max_) {
            i0 = width - cubism_metricOverlap;
            var dx = (start1 - start) / step;
            if (dx < width) {
              var canvas0 = buffer.getContext("2d");
              canvas0.clearRect(0, 0, width, height);
              canvas0.drawImage(canvas.canvas, dx, 0, width - dx, height, 0, 0, width - dx, height);
              canvas.clearRect(0, 0, width, height);
              canvas.drawImage(canvas0.canvas, 0, 0);
            }
          }
          start = start1;
        }

        // update the domain
        scale.domain([0, max_ = max]);

        // clear for the new data
        canvas.clearRect(i0, 0, width - i0, height);

        // record whether there are negative values to display
        var negative;

        // positive bands
        for (var j = 0; j < m; ++j) {
          canvas.fillStyle = colors_[m + j];

          // Adjust the range based on the current band index.
          var y0 = (j - m + 1) * height;
          scale.range([m * height + y0, y0]);
          y0 = scale(0);

          for (var i = i0, n = width, y1; i < n; ++i) {
            y1 = metric_.valueAt(i);
            if (y1 <= 0) { negative = true; continue; }
            if (y1 === undefined) continue;
            canvas.fillRect(i, y1 = scale(y1), 1, y0 - y1);
          }
        }

        if (negative) {
          // enable offset mode
          if (mode === "offset") {
            canvas.translate(0, height);
            canvas.scale(1, -1);
          }

          // negative bands
          for (var j = 0; j < m; ++j) {
            canvas.fillStyle = colors_[m - 1 - j];

            // Adjust the range based on the current band index.
            var y0 = (j - m + 1) * height;
            scale.range([m * height + y0, y0]);
            y0 = scale(0);

            for (var i = i0, n = width, y1; i < n; ++i) {
              y1 = metric_.valueAt(i);
              if (y1 >= 0) continue;
              canvas.fillRect(i, scale(-y1), 1, y0 - scale(-y1));
            }
          }
        }

        canvas.restore();
      }

      function focus(i) {
        if (i == null) i = width - 1;
        var value = metric_.valueAt(i);
        span.datum(value).text(isNaN(value) ? null : format);
      }

      // Update the chart when the context changes.
      context.on("change.horizon-" + id, change);
      context.on("focus.horizon-" + id, focus);

      // Display the first metric change immediately,
      // but defer subsequent updates to the canvas change.
      // Note that someone still needs to listen to the metric,
      // so that it continues to update automatically.
      metric_.on("change.horizon-" + id, function(start, stop) {
        change(start, stop), focus();
        if (ready) metric_.on("change.horizon-" + id, cubism_identity);
      });
    });
  }

  horizon.remove = function(selection) {

    selection
        .on("mousemove.horizon", null)
        .on("mouseout.horizon", null);

    selection.selectAll("canvas")
        .each(remove)
        .remove();

    selection.selectAll(".title,.value")
        .remove();

    function remove(d) {
      d.metric.on("change.horizon-" + d.id, null);
      context.on("change.horizon-" + d.id, null);
      context.on("focus.horizon-" + d.id, null);
    }
  };

  horizon.mode = function(_) {
    if (!arguments.length) return mode;
    mode = _ + "";
    return horizon;
  };

  horizon.height = function(_) {
    if (!arguments.length) return height;
    buffer.height = height = +_;
    return horizon;
  };

  horizon.metric = function(_) {
    if (!arguments.length) return metric;
    metric = _;
    return horizon;
  };

  horizon.scale = function(_) {
    if (!arguments.length) return scale;
    scale = _;
    return horizon;
  };

  horizon.extent = function(_) {
    if (!arguments.length) return extent;
    extent = _;
    return horizon;
  };

  horizon.title = function(_) {
    if (!arguments.length) return title;
    title = _;
    return horizon;
  };

  horizon.format = function(_) {
    if (!arguments.length) return format;
    format = _;
    return horizon;
  };

  horizon.colors = function(_) {
    if (!arguments.length) return colors;
    colors = _;
    return horizon;
  };

  return horizon;
};
cubism_contextPrototype.comparison = function() {
  var context = this,
      width = context.size(),
      height = 120,
      scale = d3.scale.linear().interpolate(d3.interpolateRound),
      primary = function(d) { return d[0]; },
      secondary = function(d) { return d[1]; },
      extent = null,
      title = cubism_identity,
      formatPrimary = cubism_comparisonPrimaryFormat,
      formatChange = cubism_comparisonChangeFormat,
      colors = ["#9ecae1", "#225b84", "#a1d99b", "#22723a"],
      strokeWidth = 1.5;

  function comparison(selection) {

    selection
        .on("mousemove.comparison", function() { context.focus(Math.round(d3.mouse(this)[0])); })
        .on("mouseout.comparison", function() { context.focus(null); });

    selection.append("canvas")
        .attr("width", width)
        .attr("height", height);

    selection.append("span")
        .attr("class", "title")
        .text(title);

    selection.append("span")
        .attr("class", "value primary");

    selection.append("span")
        .attr("class", "value change");

    selection.each(function(d, i) {
      var that = this,
          id = ++cubism_id,
          primary_ = typeof primary === "function" ? primary.call(that, d, i) : primary,
          secondary_ = typeof secondary === "function" ? secondary.call(that, d, i) : secondary,
          extent_ = typeof extent === "function" ? extent.call(that, d, i) : extent,
          div = d3.select(that),
          canvas = div.select("canvas"),
          spanPrimary = div.select(".value.primary"),
          spanChange = div.select(".value.change"),
          ready;

      canvas.datum({id: id, primary: primary_, secondary: secondary_});
      canvas = canvas.node().getContext("2d");

      function change(start, stop) {
        canvas.save();
        canvas.clearRect(0, 0, width, height);

        // update the scale
        var primaryExtent = primary_.extent(),
            secondaryExtent = secondary_.extent(),
            extent = extent_ == null ? primaryExtent : extent_;
        scale.domain(extent).range([height, 0]);
        ready = primaryExtent.concat(secondaryExtent).every(isFinite);

        // consistent overplotting
        var round = start / context.step() & 1
            ? cubism_comparisonRoundOdd
            : cubism_comparisonRoundEven;

        // positive changes
        canvas.fillStyle = colors[2];
        for (var i = 0, n = width; i < n; ++i) {
          var y0 = scale(primary_.valueAt(i)),
              y1 = scale(secondary_.valueAt(i));
          if (y0 < y1) canvas.fillRect(round(i), y0, 1, y1 - y0);
        }

        // negative changes
        canvas.fillStyle = colors[0];
        for (i = 0; i < n; ++i) {
          var y0 = scale(primary_.valueAt(i)),
              y1 = scale(secondary_.valueAt(i));
          if (y0 > y1) canvas.fillRect(round(i), y1, 1, y0 - y1);
        }

        // positive values
        canvas.fillStyle = colors[3];
        for (i = 0; i < n; ++i) {
          var y0 = scale(primary_.valueAt(i)),
              y1 = scale(secondary_.valueAt(i));
          if (y0 <= y1) canvas.fillRect(round(i), y0, 1, strokeWidth);
        }

        // negative values
        canvas.fillStyle = colors[1];
        for (i = 0; i < n; ++i) {
          var y0 = scale(primary_.valueAt(i)),
              y1 = scale(secondary_.valueAt(i));
          if (y0 > y1) canvas.fillRect(round(i), y0 - strokeWidth, 1, strokeWidth);
        }

        canvas.restore();
      }

      function focus(i) {
        if (i == null) i = width - 1;
        var valuePrimary = primary_.valueAt(i),
            valueSecondary = secondary_.valueAt(i),
            valueChange = (valuePrimary - valueSecondary) / valueSecondary;

        spanPrimary
            .datum(valuePrimary)
            .text(isNaN(valuePrimary) ? null : formatPrimary);

        spanChange
            .datum(valueChange)
            .text(isNaN(valueChange) ? null : formatChange)
            .attr("class", "value change " + (valueChange > 0 ? "positive" : valueChange < 0 ? "negative" : ""));
      }

      // Display the first primary change immediately,
      // but defer subsequent updates to the context change.
      // Note that someone still needs to listen to the metric,
      // so that it continues to update automatically.
      primary_.on("change.comparison-" + id, firstChange);
      secondary_.on("change.comparison-" + id, firstChange);
      function firstChange(start, stop) {
        change(start, stop), focus();
        if (ready) {
          primary_.on("change.comparison-" + id, cubism_identity);
          secondary_.on("change.comparison-" + id, cubism_identity);
        }
      }

      // Update the chart when the context changes.
      context.on("change.comparison-" + id, change);
      context.on("focus.comparison-" + id, focus);
    });
  }

  comparison.remove = function(selection) {

    selection
        .on("mousemove.comparison", null)
        .on("mouseout.comparison", null);

    selection.selectAll("canvas")
        .each(remove)
        .remove();

    selection.selectAll(".title,.value")
        .remove();

    function remove(d) {
      d.primary.on("change.comparison-" + d.id, null);
      d.secondary.on("change.comparison-" + d.id, null);
      context.on("change.comparison-" + d.id, null);
      context.on("focus.comparison-" + d.id, null);
    }
  };

  comparison.height = function(_) {
    if (!arguments.length) return height;
    height = +_;
    return comparison;
  };

  comparison.primary = function(_) {
    if (!arguments.length) return primary;
    primary = _;
    return comparison;
  };

  comparison.secondary = function(_) {
    if (!arguments.length) return secondary;
    secondary = _;
    return comparison;
  };

  comparison.scale = function(_) {
    if (!arguments.length) return scale;
    scale = _;
    return comparison;
  };

  comparison.extent = function(_) {
    if (!arguments.length) return extent;
    extent = _;
    return comparison;
  };

  comparison.title = function(_) {
    if (!arguments.length) return title;
    title = _;
    return comparison;
  };

  comparison.formatPrimary = function(_) {
    if (!arguments.length) return formatPrimary;
    formatPrimary = _;
    return comparison;
  };

  comparison.formatChange = function(_) {
    if (!arguments.length) return formatChange;
    formatChange = _;
    return comparison;
  };

  comparison.colors = function(_) {
    if (!arguments.length) return colors;
    colors = _;
    return comparison;
  };

  comparison.strokeWidth = function(_) {
    if (!arguments.length) return strokeWidth;
    strokeWidth = _;
    return comparison;
  };

  return comparison;
};

var cubism_comparisonPrimaryFormat = d3.format(".2s"),
    cubism_comparisonChangeFormat = d3.format("+.0%");

function cubism_comparisonRoundEven(i) {
  return i & 0xfffffe;
}

function cubism_comparisonRoundOdd(i) {
  return ((i + 1) & 0xfffffe) - 1;
}
cubism_contextPrototype.axis = function() {
  var context = this,
      scale = context.scale,
      axis_ = d3.svg.axis().scale(scale);

  var formatDefault = context.step() < 6e4 ? cubism_axisFormatSeconds
      : context.step() < 864e5 ? cubism_axisFormatMinutes
      : cubism_axisFormatDays;
  var format = formatDefault;

  function axis(selection) {
    var id = ++cubism_id,
        tick;

    var g = selection.append("svg")
        .datum({id: id})
        .attr("width", context.size())
        .attr("height", Math.max(28, -axis.tickSize()))
      .append("g")
        .attr("transform", "translate(0," + (axis_.orient() === "top" ? 27 : 4) + ")")
        .call(axis_);

    context.on("change.axis-" + id, function() {
      g.call(axis_);
      if (!tick) tick = d3.select(g.node().appendChild(g.selectAll("text").node().cloneNode(true)))
          .style("display", "none")
          .text(null);
    });

    context.on("focus.axis-" + id, function(i) {
      if (tick) {
        if (i == null) {
          tick.style("display", "none");
          g.selectAll("text").style("fill-opacity", null);
        } else {
          tick.style("display", null).attr("x", i).text(format(scale.invert(i)));
          var dx = tick.node().getComputedTextLength() + 6;
          g.selectAll("text").style("fill-opacity", function(d) { return Math.abs(scale(d) - i) < dx ? 0 : 1; });
        }
      }
    });
  }

  axis.remove = function(selection) {

    selection.selectAll("svg")
        .each(remove)
        .remove();

    function remove(d) {
      context.on("change.axis-" + d.id, null);
      context.on("focus.axis-" + d.id, null);
    }
  };

  axis.focusFormat = function(_) {
    if (!arguments.length) return format == formatDefault ? null : _;
    format = _ == null ? formatDefault : _;
    return axis;
  };

  return d3.rebind(axis, axis_,
      "orient",
      "ticks",
      "tickSubdivide",
      "tickSize",
      "tickPadding",
      "tickFormat");
};

var cubism_axisFormatSeconds = d3.time.format("%I:%M:%S %p"),
    cubism_axisFormatMinutes = d3.time.format("%I:%M %p"),
    cubism_axisFormatDays = d3.time.format("%B %d");
cubism_contextPrototype.rule = function() {
  var context = this,
      metric = cubism_identity;

  function rule(selection) {
    var id = ++cubism_id;

    var line = selection.append("div")
        .datum({id: id})
        .attr("class", "line")
        .call(cubism_ruleStyle);

    selection.each(function(d, i) {
      var that = this,
          id = ++cubism_id,
          metric_ = typeof metric === "function" ? metric.call(that, d, i) : metric;

      if (!metric_) return;

      function change(start, stop) {
        var values = [];

        for (var i = 0, n = context.size(); i < n; ++i) {
          if (metric_.valueAt(i)) {
            values.push(i);
          }
        }

        var lines = selection.selectAll(".metric").data(values);
        lines.exit().remove();
        lines.enter().append("div").attr("class", "metric line").call(cubism_ruleStyle);
        lines.style("left", cubism_ruleLeft);
      }

      context.on("change.rule-" + id, change);
      metric_.on("change.rule-" + id, change);
    });

    context.on("focus.rule-" + id, function(i) {
      line.datum(i)
          .style("display", i == null ? "none" : null)
          .style("left", i == null ? null : cubism_ruleLeft);
    });
  }

  rule.remove = function(selection) {

    selection.selectAll(".line")
        .each(remove)
        .remove();

    function remove(d) {
      context.on("focus.rule-" + d.id, null);
    }
  };

  rule.metric = function(_) {
    if (!arguments.length) return metric;
    metric = _;
    return rule;
  };

  return rule;
};

function cubism_ruleStyle(line) {
  line
      .style("position", "absolute")
      .style("top", 0)
      .style("bottom", 0)
      .style("width", "1px")
      .style("pointer-events", "none");
}

function cubism_ruleLeft(i) {
  return i + "px";
}
})(this);

/*
 * Copyright 2012 Roland Huss
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Jolokia integration into cubism (http://square.github.com/cubism/)
 *
 * This integration requires the following
 */

(function () {
    var builder = function (cubism,Jolokia) {
        
        var VERSION = "1.1.3";
        
        var ctx_jolokia = function (url, opts) {
            var source = {},
                context = this,
                j4p = createAgent(url, opts),
                step = 5e3;                    // 5 seconds by default

            try
            {
                // Connect to start and stop events
                context.on("start",function() {
                    j4p.start();
                });

                context.on("stop",function() {
                    j4p.stop();
                });
            }
            catch(err)
            {
                // Still waiting for pull request https://github.com/square/cubism/pull/19 for supporting
                // "start" and "stop" events
            }

            /**
             * Factory method for create a metric objects which has various variants.
             *
             * If the first argument is a Jolokia request object (i.e. not a function), this request
             * is used for sending requests periodically.
             *
             * If the first argument is a function, this function is used for calculating the numeric value
             * to be plotted. The rest of the arguments can be one or more request objects, which are registered and their
             * responses are put as arguments to the given callback function.
             *
             * The last argument, if an object but not a Jolokia request (i.e. there is no <code>type</code> key), is
             * taken as an option object with the following possible keys:
             *
             * <ul>
             *   <li><b>name</b>: name used in charts</li>
             *   <li><b>delta</b>: delta value in milliseconds for creating delta (velocity) charts. This is done by
             *            taking the value measured that many milliseconds ago and subtract them from each other.</li>
             *   <li><b>keepDelay</b>: how many seconds back the fetched values should be kept.</li>
             * </ul>
             *
             * Finally, if the last argument is a pure string, then this string is used as name for the chart.
             *
             * @return the metric objects which can be used in Cubism for creating charts.
             */
            source.metric = function () {
                var values = [];
                // If the first argument is a function, this callback function is used for calculating the
                // value of a data point. The remaining arguments should be one or more Jolokia requests objects
                // and the callback function given will be called with as many response objects after each server query.
                // The callback function needs to return a single calculated numerical value
                var name;
                var argsLen = arguments.length;
                var options = {};

                // Create metric upfront so that it can be used in extraction functions. The name defaults to the mbean name
                // but can be given as first argument
                var lastIdx = arguments.length - 1;
                var lastArg = arguments[lastIdx];
                if (typeof lastArg == "string") {
                    name = lastArg;
                    argsLen = lastIdx;
                }
                // Options can be given as an object (but not a request with a 'type' property)
                if (typeof lastArg == "object" && !lastArg.type) {
                    options = lastArg;
                    name = options.name;
                    argsLen = lastIdx;
                }
                if (!name && typeof arguments[0] != "function") {
                    name = arguments[0].mbean;
                }

                // Metric which maps our previously locally stored values to the ones requested by cubism
                var metric = context.metric(mapValuesFunc(values, options.keepDelay, context.width), name);
                if (options.delta) {
                    // Use cubism metric chaining for calculating the difference value and keep care that the
                    // metric keeps old values up to the delta value
                    var prevMetric = metric.shift(-options.delta);
                    metric = metric.subtract(prevMetric);
                    if (name) {
                        metric.toString = function () {
                            return name
                        };
                    }
                }

                // If an extraction function is given, this can be used for fine grained manipulations of
                // the answer
                if (typeof arguments[0] == "function") {
                    var func = arguments[0];
                    var respFunc = function (resp) {
                        var isError = false;
                        for (var i = 0; i < arguments.length; i++) {
                            if (j4p.isError(arguments[i])) {
                                isError = true;
                                break;
                            }
                        }
                        values.unshift(
                            { time:Date.now(), value:isError ? NaN : func.apply(metric, arguments) }
                        );
                    };
                    var args = [ respFunc ];
                    for (var i = 1; i < argsLen; i++) {
                        args.push(arguments[i]);
                    }
                    j4p.register.apply(j4p, args);
                } else {
                    // Register the argument given directly as a Jolokia request. The request must return a single
                    // numerical value
                    var request = arguments[0];
                    j4p.register(function (resp) {
                        values.unshift({
                            time: Date.now(),
                            value:j4p.isError(resp) ? NaN : Number(resp.value)
                        });
                    }, request);
                }

                return metric;
            };

            // Start up fetching of values in the background
            source.start = function (newStep) {
                newStep = newStep || step;
                j4p.start(newStep);
            };

            // Stop fetching of values in the background
            source.stop = function() { j4p.stop() };

            // Check whether the scheduler is running
            source.isRunning = function() { return j4p.isRunning() };

            // Startup poller which will call the agent periodically
            return source;

            // =======================================================================================
            // Private helper method

            // Create a new Jolokia agent or reuse a given one
            function createAgent(url, opts) {
                if (url instanceof Jolokia) {
                    return url;
                } else {
                    var args;
                    if (typeof url == "string") {
                        args = {url:url};
                        if (opts) {
                            for (var key in opts) {
                                if (opts.hasOwnProperty(key)) {
                                    args[key] = opts[key];
                                }
                            }
                        }
                    } else {
                        args = url;
                    }
                    return new Jolokia(args);
                }
            }

            // Generate function which picks the requested values from the values
            // stored periodically by the Jolokia poller.
            function mapValuesFunc(values, keepDelay, width) {
                return function (cStart, cStop, cStep, callback) {
                    cStart = +cStart;
                    cStop = +cStop;
                    var retVals = [],
                        cTime = cStop,
                        vLen = values.length,
                        vIdx = 0,
                        vStart = vLen > 0 ? values[vLen - 1].time : undefined;

                    if (!vLen || cStop < vStart) {
                        // Nothing fetched yet or seeked interval doesn't overlap with stored values --> return only NaNs
                        for (var t = cStart; t <= cStop; t += cStep) {
                            retVals.push(NaN);
                        }
                        return callback(null, retVals);
                    }

                    // Fill up wit NaN until we reach the first stored val
                    while (cTime > values[0].time + cStep) {
                        retVals.unshift(NaN);
                        cTime -= cStep;
                    }

                    while (cTime >= cStart && cTime >= vStart) {
                        // Count down stored values until we find the next best 'fit'
                        // (equals or closest before the step-calculated ime)
                        while (values[vIdx].time > cTime) {
                            vIdx++;
                        }
                        retVals.unshift(values[vIdx].value);
                        cTime -= cStep;
                    }

                    // Finally prepend with 'NaN' for data not yet fetched
                    while (cTime >= cStart) {
                        retVals.unshift(NaN);
                        cTime -= cStep;
                    }

                    // Remove older values
                    if (vLen > width) {
                        if (!keepDelay) {
                            values.length = width;
                        } else {
                            var keepUntil = values[width].time - keepDelay,
                                i = width;
                            while (i < vLen && values[i].time > keepUntil) {
                                i++;
                            }
                            values.length = i;
                        }
                    }
                    callback(null, retVals);
                }
            }
        };
        ctx_jolokia.VERSION = VERSION;

        cubism.context.prototype.jolokia  = ctx_jolokia;
        return ctx_jolokia;
    };

    // =====================================================================================================
    // Register either at the global Jolokia object global or as an AMD module
    (function (root) {
        if (typeof define === 'function' && define.amd) {
            // AMD. Register as a named module
            define(["cubism","jolokia"],function (cubism,Jolokia) {
                return builder(cubism,Jolokia);
            });
        } else {
            if (root.Jolokia && root.cubism) {
                builder(root.cubism,root.Jolokia);
            } else {
                console.error("No " + (root.cubism ? "Cubism" : "Jolokia") + " definition found. " +
                              "Please include jolokia.js and cubism.js before jolokia-cubism.js");
            }
        }
    })(this);
})();




var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var About;
(function (About) {
    var AboutController = /** @class */ (function () {
        AboutController.$inject = ["configManager", "jolokia", "jolokiaService"];
        function AboutController(configManager, jolokia, jolokiaService) {
            'ngInject';
            this.configManager = configManager;
            this.jolokia = jolokia;
            this.jolokiaService = jolokiaService;
        }
        AboutController.prototype.$onInit = function () {
            var _this = this;
            this.title = this.configManager.getBrandingValue('appName');
            this.additionalInfo = this.configManager.getBrandingValue('aboutDescription');
            var version = this.jolokia.version();
            if (version) {
                this.productInfo = [
                    { name: 'Jolokia', value: version.agent }
                ];
                this.jolokiaService.getAttribute('hawtio:type=About', 'HawtioVersion')
                    .then(function (hawtioVersion) { return _this.productInfo.unshift({ name: 'Hawtio', value: hawtioVersion }); });
            }
        };
        AboutController.prototype.onClose = function () {
            this.flags.open = false;
        };
        return AboutController;
    }());
    About.AboutController = AboutController;
    About.aboutComponent = {
        bindings: {
            flags: '<'
        },
        template: "\n      <pf-about-modal is-open=\"$ctrl.flags.open\" on-close=\"$ctrl.onClose()\" title=\"$ctrl.title\"\n          product-info=\"$ctrl.productInfo\" additional-info=\"$ctrl.additionalInfo\"></pf-about-modal>\n    ",
        controller: AboutController
    };
})(About || (About = {}));
var About;
(function (About) {
    configureMenu.$inject = ["HawtioExtension", "$compile"];
    function configureMenu(HawtioExtension, $compile) {
        'ngInject';
        HawtioExtension.add('hawtio-about', function ($scope) {
            var template = "\n        <a ng-init=\"flags = {open: false}\" ng-click=\"flags.open = true\">About</a>\n        <about flags=\"flags\"></about>\n      ";
            return $compile(template)($scope);
        });
    }
    About.configureMenu = configureMenu;
})(About || (About = {}));
/// <reference path="about.component.ts"/>
/// <reference path="about.config.ts"/>
var About;
(function (About) {
    var aboutModule = angular
        .module('hawtio-about', [])
        .run(About.configureMenu)
        .component('about', About.aboutComponent)
        .name;
    hawtioPluginLoader.addModule(aboutModule);
})(About || (About = {}));
var Diagnostics;
(function (Diagnostics) {
    DiagnosticsFlagsController.$inject = ["$scope", "jolokia"];
    function DiagnosticsFlagsController($scope, jolokia) {
        'ngInject';
        var readRequest = {
            type: 'read',
            mbean: 'com.sun.management:type=HotSpotDiagnostic',
            arguments: []
        };
        $scope.flags = [];
        // $scope.tableDef = tableDef();
        Core.register(jolokia, $scope, [readRequest], Core.onSuccess(render));
        function render(response) {
            //remove watches on previous content
            for (var i = 0; i < $scope.flags.length; i++) {
                $scope.flags[i].deregisterWatch();
            }
            $scope.flags = response.value.DiagnosticOptions;
            for (var i = 0; i < $scope.flags.length; i++) {
                var flag = $scope.flags[i];
                flag.value = parseValue(flag.value); //convert to typed value
                if (flag.writeable) {
                    flag.dataType = typeof (flag.value);
                }
                else {
                    flag.dataType = "readonly";
                }
                flag.deregisterWatch = $scope.$watch('flags[' + i + ']', function (newValue, oldValue) {
                    if (newValue.value != oldValue.value) {
                        jolokia.request([{
                                type: 'exec',
                                mbean: 'com.sun.management:type=HotSpotDiagnostic',
                                operation: 'setVMOption(java.lang.String,java.lang.String)',
                                arguments: [newValue.name, newValue.value]
                            }, readRequest], Core.onSuccess(function (response) {
                            if (response.request.type === "read") {
                                render(response);
                            }
                            else {
                                Diagnostics.log.info("Set VM option " + newValue.name + "=" + newValue.value);
                            }
                        }));
                    }
                }, true);
            }
            Core.$apply($scope);
        }
        function parseValue(value) {
            if (typeof (value) === "string") {
                if (value.match(/true/)) {
                    return true;
                }
                else if (value.match(/false/)) {
                    return false;
                }
                else if (value.match(/\d+/)) {
                    return Number(value);
                }
            }
            return value;
        }
        // function tableDef() {
        //   return {
        //     selectedItems: [],
        //     data: 'flags',
        //     showFilter: true,
        //     filterOptions: {
        //       filterText: ''
        //     },
        //     showSelectionCheckbox: false,
        //     enableRowClickSelection: true,
        //     multiSelect: false,
        //     primaryKeyFn: function (entity, idx) {
        //       return entity.name;
        //     },
        //     columnDefs: [
        //       {
        //         field: 'name',
        //         displayName: 'VM Flag',
        //         resizable: true
        //       }, {
        //         field: 'origin',
        //         displayName: 'Origin',
        //         resizable: true
        //       }, {
        //         field: 'value',
        //         displayName: 'Value',
        //         resizable: true,
        //         cellTemplate: '<div ng-switch on="row.entity.dataType"><span ng-switch-when="readonly">{{row.entity.value}}</span><input ng-switch-when="boolean" type="checkbox" ng-model="row.entity.value"></input><input ng-switch-when="string" type="text" ng-model="row.entity.value"></input><input ng-switch-when="number" type="number" ng-model="row.entity.value"></input></div>'
        //       }]
        //   };
        // }
    }
    Diagnostics.DiagnosticsFlagsController = DiagnosticsFlagsController;
})(Diagnostics || (Diagnostics = {}));
var JVM;
(function (JVM) {
    JVM.rootPath = 'plugins/jvm';
    JVM.templatePath = UrlHelpers.join(JVM.rootPath, '/html');
    JVM.pluginName = 'hawtio-jvm';
    JVM.log = Logger.get(JVM.pluginName);
    JVM.connectControllerKey = "jvmConnectSettings";
    JVM.connectionSettingsKey = 'jvmConnect';
    JVM.logoPath = 'img/icons/jvm/';
    JVM.logoRegistry = {
        'jetty': JVM.logoPath + 'jetty-logo-80x22.png',
        'tomcat': JVM.logoPath + 'tomcat-logo.gif',
        'generic': JVM.logoPath + 'java-logo.svg'
    };
})(JVM || (JVM = {}));
/// <reference path="jvmGlobals.ts"/>
var JVM;
(function (JVM) {
    /**
     * Adds common properties and functions to the scope
     * @method configureScope
     * @for Jvm
     * @param {*} $scope
     * @param {ng.ILocationService} $location
     * @param {Core.Workspace} workspace
     */
    function configureScope($scope, $location, workspace) {
        $scope.isActive = function (href) {
            var tidy = Core.trimLeading(href, "#");
            var loc = $location.path();
            return loc === tidy;
        };
        $scope.isValid = function (link) {
            return link && link.isValid(workspace);
        };
        $scope.hasLocalMBean = function () {
            return JVM.hasLocalMBean(workspace);
        };
        $scope.goto = function (path) {
            $location.path(path);
        };
    }
    JVM.configureScope = configureScope;
    function hasLocalMBean(workspace) {
        return workspace.treeContainsDomainAndProperties('hawtio', { type: 'JVMList' });
    }
    JVM.hasLocalMBean = hasLocalMBean;
    function hasDiscoveryMBean(workspace) {
        return workspace.treeContainsDomainAndProperties('jolokia', { type: 'Discovery' });
    }
    JVM.hasDiscoveryMBean = hasDiscoveryMBean;
    /**
     * Creates a jolokia object for connecting to the container with the given remote jolokia URL,
     * username and password
     * @method createJolokia
     * @for Core
     * @static
     * @param {String} url
     * @param {String} username
     * @param {String} password
     * @return {Object}
     */
    function createJolokia(url, username, password) {
        var jolokiaParams = {
            url: url,
            username: username,
            password: password,
            canonicalNaming: false, ignoreErrors: true, mimeType: 'application/json'
        };
        return new Jolokia(jolokiaParams);
    }
    JVM.createJolokia = createJolokia;
    function getRecentConnections(localStorage) {
        if (Core.isBlank(localStorage['recentConnections'])) {
            clearConnections();
        }
        return angular.fromJson(localStorage['recentConnections']);
    }
    JVM.getRecentConnections = getRecentConnections;
    function addRecentConnection(localStorage, name) {
        var recent = getRecentConnections(localStorage);
        recent.push(name);
        recent = _.take(_.uniq(recent), 5);
        localStorage['recentConnections'] = angular.toJson(recent);
    }
    JVM.addRecentConnection = addRecentConnection;
    function removeRecentConnection(localStorage, name) {
        var recent = getRecentConnections(localStorage);
        recent = _.without(recent, name);
        localStorage['recentConnections'] = angular.toJson(recent);
    }
    JVM.removeRecentConnection = removeRecentConnection;
    function clearConnections() {
        localStorage['recentConnections'] = '[]';
    }
    JVM.clearConnections = clearConnections;
    function isRemoteConnection() {
        return ('con' in new URI().query(true));
    }
    JVM.isRemoteConnection = isRemoteConnection;
    function connectToServer(localStorage, options) {
        JVM.log.debug("Connecting with options: ", StringHelpers.toString(options));
        var clone = angular.extend({}, options);
        addRecentConnection(localStorage, clone.name);
        if (!('userName' in clone)) {
            var userDetails = HawtioCore.injector.get('userDetails');
            clone.userName = userDetails.username;
            clone.password = userDetails.password;
        }
        //must save to local storage, to be picked up by new tab
        saveConnection(clone);
        var $window = HawtioCore.injector.get('$window');
        var url = (clone.view || '/') + '?con=' + clone.name;
        url = url.replace(/\?/g, "&");
        url = url.replace(/&/, "?");
        var newWindow = $window.open(url, clone.name);
        newWindow['con'] = clone.name;
        newWindow['userDetails'] = {
            username: clone.userName,
            password: clone.password,
            loginDetails: {}
        };
    }
    JVM.connectToServer = connectToServer;
    function saveConnection(options) {
        var connections = loadConnections();
        var existingIndex = _.findIndex(connections, function (element) { return element.name === options.name; });
        if (existingIndex != -1) {
            connections[existingIndex] = options;
        }
        else {
            connections.unshift(options);
        }
        saveConnections(connections);
    }
    JVM.saveConnection = saveConnection;
    /**
     * Loads all of the available connections from local storage
     */
    function loadConnections() {
        var localStorage = Core.getLocalStorage();
        try {
            var connections = angular.fromJson(localStorage[JVM.connectionSettingsKey]);
            if (!connections) {
                // nothing found on local storage
                return [];
            }
            else if (!_.isArray(connections)) {
                // found the legacy connections map
                delete localStorage[JVM.connectionSettingsKey];
                return [];
            }
            else {
                // found a valid connections array
                return connections;
            }
        }
        catch (e) {
            // corrupt config
            delete localStorage[JVM.connectionSettingsKey];
            return [];
        }
    }
    JVM.loadConnections = loadConnections;
    /**
     * Saves the connection map to local storage
     * @param connections array of all connections to be stored
     */
    function saveConnections(connections) {
        JVM.log.debug("Saving connection array:", StringHelpers.toString(connections));
        localStorage[JVM.connectionSettingsKey] = angular.toJson(connections);
    }
    JVM.saveConnections = saveConnections;
    function getConnectionNameParameter() {
        return new URI().search(true)['con'];
    }
    JVM.getConnectionNameParameter = getConnectionNameParameter;
    /**
     * Returns the connection options for the given connection name from localStorage
     */
    function getConnectOptions(name, localStorage) {
        if (localStorage === void 0) { localStorage = Core.getLocalStorage(); }
        if (!name) {
            return null;
        }
        var connections = loadConnections();
        return _.find(connections, function (connection) { return connection.name === name; });
    }
    JVM.getConnectOptions = getConnectOptions;
    /**
     * Creates the Jolokia URL string for the given connection options
     */
    function createServerConnectionUrl(options) {
        JVM.log.debug("Connect to server, options:", StringHelpers.toString(options));
        var answer = null;
        if (options.jolokiaUrl) {
            answer = options.jolokiaUrl;
        }
        if (answer === null) {
            var uri = new URI();
            uri.protocol(options.scheme || 'http')
                .host(options.host || 'localhost')
                .port(String(options.port || 80))
                .path(options.path);
            answer = UrlHelpers.join('proxy', uri.protocol(), uri.hostname(), uri.port(), uri.path());
        }
        JVM.log.debug("Using URL:", answer);
        return answer;
    }
    JVM.createServerConnectionUrl = createServerConnectionUrl;
})(JVM || (JVM = {}));
/// <reference path="../jvmHelpers.ts"/>
var JVM;
(function (JVM) {
    var ConnectService = /** @class */ (function () {
        ConnectService.$inject = ["$q", "$window"];
        function ConnectService($q, $window) {
            'ngInject';
            this.$q = $q;
            this.$window = $window;
        }
        ConnectService.prototype.getConnections = function () {
            var connectionsJson = this.$window.localStorage.getItem(JVM.connectionSettingsKey);
            return connectionsJson ? JSON.parse(connectionsJson) : [];
        };
        ConnectService.prototype.updateReachableFlags = function (connections) {
            var _this = this;
            var promises = connections.map(function (connection) { return _this.testConnection(connection); });
            return this.$q.all(promises)
                .then(function (reachableFlags) {
                for (var i = 0; i < connections.length; i++) {
                    connections[i].reachable = reachableFlags[i];
                }
                return connections;
            });
        };
        ConnectService.prototype.updateReachableFlag = function (connection) {
            return this.testConnection(connection)
                .then(function (reachable) {
                connection.reachable = reachable;
                return connection;
            });
        };
        ConnectService.prototype.saveConnections = function (connections) {
            this.$window.localStorage.setItem(JVM.connectionSettingsKey, JSON.stringify(connections));
        };
        ConnectService.prototype.testConnection = function (connection) {
            return this.$q(function (resolve, reject) {
                try {
                    new Jolokia({
                        url: JVM.createServerConnectionUrl(connection),
                        method: 'post',
                        mimeType: 'application/json'
                    }).request({
                        type: 'version'
                    }, {
                        success: function (response) {
                            resolve(true);
                        },
                        error: function (response) {
                            resolve(false);
                        },
                        ajaxError: function (response) {
                            resolve(response.status === 403 ? true : false);
                        }
                    });
                }
                catch (error) {
                    resolve(false);
                }
            });
        };
        ;
        ConnectService.prototype.checkCredentials = function (connection, username, password) {
            return this.$q(function (resolve, reject) {
                new Jolokia({
                    url: JVM.createServerConnectionUrl(connection),
                    method: 'post',
                    mimeType: 'application/json',
                    username: username,
                    password: password
                }).request({
                    type: 'version'
                }, {
                    success: function (response) {
                        resolve(true);
                    },
                    error: function (response) {
                        resolve(false);
                    },
                    ajaxError: function (response) {
                        resolve(false);
                    }
                });
            });
        };
        ;
        ConnectService.prototype.connect = function (connection) {
            JVM.log.debug("Connecting with options: ", StringHelpers.toString(connection));
            var url = URI('').search({ con: connection.name }).toString();
            this.$window.open(url);
        };
        return ConnectService;
    }());
    JVM.ConnectService = ConnectService;
})(JVM || (JVM = {}));
/// <reference path="connect.service.ts"/>
var JVM;
(function (JVM) {
    var ConnectController = /** @class */ (function () {
        ConnectController.$inject = ["$timeout", "$uibModal", "connectService"];
        function ConnectController($timeout, $uibModal, connectService) {
            'ngInject';
            var _this = this;
            this.$timeout = $timeout;
            this.$uibModal = $uibModal;
            this.connectService = connectService;
            this.connections = [];
            this.toolbarConfig = {
                actionsConfig: {
                    primaryActions: [
                        { name: 'Add connection', actionFn: function () { return _this.addConnection(); } }
                    ]
                }
            };
            this.listConfig = {
                selectionMatchProp: 'name',
                selectItems: false,
                showSelectBox: false
            };
            this.listActionButtons = [
                { name: 'Connect', actionFn: function (action, connection) { return _this.connect(connection); } }
            ];
            this.listActionDropDown = [
                { name: 'Edit', actionFn: function (action, connection) { return _this.editConnection(connection); } },
                { name: 'Delete', actionFn: function (action, connection) { return _this.deleteConnection(connection); } }
            ];
        }
        ConnectController.prototype.$onInit = function () {
            this.connections = this.connectService.getConnections();
            this.connectService.updateReachableFlags(this.connections);
            this.setTimerToUpdateReachableFlags();
        };
        ConnectController.prototype.$onDestroy = function () {
            this.$timeout.cancel(this.promise);
        };
        ConnectController.prototype.setTimerToUpdateReachableFlags = function () {
            var _this = this;
            this.promise = this.$timeout(function () {
                _this.connectService.updateReachableFlags(_this.connections)
                    .then(function (connections) { return _this.setTimerToUpdateReachableFlags(); });
            }, 20000);
        };
        ConnectController.prototype.addConnection = function () {
            var _this = this;
            this.$uibModal.open({
                component: 'connectEditModal',
                resolve: { connection: function () { return JVM.createConnectOptions({ host: 'localhost', path: 'jolokia', port: 8181 }); } }
            })
                .result.then(function (connection) {
                _this.connections.unshift(connection);
                _this.connectService.saveConnections(_this.connections);
                _this.connectService.updateReachableFlag(connection);
            });
        };
        ConnectController.prototype.editConnection = function (connection) {
            var _this = this;
            var clone = angular.extend({}, connection);
            this.$uibModal.open({
                component: 'connectEditModal',
                resolve: { connection: function () { return clone; } }
            })
                .result.then(function (clone) {
                angular.extend(connection, clone);
                _this.connectService.saveConnections(_this.connections);
                _this.connectService.updateReachableFlag(connection);
            });
        };
        ConnectController.prototype.deleteConnection = function (connection) {
            var _this = this;
            this.$uibModal.open({
                component: 'connectDeleteModal'
            })
                .result.then(function () {
                _this.connections = _.without(_this.connections, connection);
                _this.connectService.saveConnections(_this.connections);
            });
        };
        ConnectController.prototype.connect = function (connection) {
            if (connection.reachable) {
                this.connectService.connect(connection);
            }
            else {
                this.$uibModal.open({
                    component: 'connectUnreachableModal'
                });
            }
        };
        return ConnectController;
    }());
    JVM.ConnectController = ConnectController;
    JVM.connectComponent = {
        templateUrl: 'plugins/jvm/html/connect.html',
        controller: ConnectController
    };
})(JVM || (JVM = {}));
var JVM;
(function (JVM) {
    var ConnectEditModalController = /** @class */ (function () {
        ConnectEditModalController.$inject = ["connectService"];
        function ConnectEditModalController(connectService) {
            'ngInject';
            this.connectService = connectService;
            this.errors = {};
            this.test = { ok: false, message: null };
        }
        ConnectEditModalController.prototype.$onInit = function () {
            this.connection = this.resolve.connection;
        };
        ConnectEditModalController.prototype.testConnection = function (connection) {
            var _this = this;
            this.connectService.testConnection(connection)
                .then(function (ok) {
                _this.test.ok = ok;
                _this.test.message = ok ? 'Connected successfully' : 'Connection failed';
            });
        };
        ;
        ConnectEditModalController.prototype.cancel = function () {
            this.modalInstance.dismiss();
        };
        ConnectEditModalController.prototype.saveConnection = function (connection) {
            this.errors = this.validateConnection(connection);
            if (Object.keys(this.errors).length === 0) {
                this.modalInstance.close(this.connection);
            }
        };
        ConnectEditModalController.prototype.validateConnection = function (connection) {
            var errors = {};
            if (connection.name === null || connection.name.trim().length === 0) {
                errors['name'] = 'Please fill out this field';
            }
            if (connection.host === null || connection.host.trim().length === 0) {
                errors['host'] = 'Please fill out this field';
            }
            if (connection.port !== null && connection.port < 0 || connection.port > 65535) {
                errors['port'] = 'Please enter a number from 0 to 65535';
            }
            return errors;
        };
        return ConnectEditModalController;
    }());
    JVM.ConnectEditModalController = ConnectEditModalController;
    JVM.connectEditModalComponent = {
        bindings: {
            modalInstance: '<',
            resolve: '<'
        },
        templateUrl: 'plugins/jvm/html/connect-edit.html',
        controller: ConnectEditModalController
    };
})(JVM || (JVM = {}));
var JVM;
(function (JVM) {
    var ConnectDeleteModalController = /** @class */ (function () {
        function ConnectDeleteModalController() {
        }
        ConnectDeleteModalController.prototype.cancel = function () {
            this.modalInstance.dismiss();
        };
        ConnectDeleteModalController.prototype.deleteConnection = function () {
            this.modalInstance.close();
        };
        return ConnectDeleteModalController;
    }());
    JVM.ConnectDeleteModalController = ConnectDeleteModalController;
    JVM.connectDeleteModalComponent = {
        bindings: {
            modalInstance: '<'
        },
        template: "\n      <div class=\"modal-header\">\n        <button type=\"button\" class=\"close\" aria-label=\"Close\" ng-click=\"$ctrl.cancel()\">\n          <span class=\"pficon pficon-close\" aria-hidden=\"true\"></span>\n        </button>\n        <h4>Are you sure?</h4>\n      </div>\n      <div class=\"modal-body\">\n        <p>You are about to delete this connection.</p>\n      </div>\n      <div class=\"modal-footer\">\n        <button type=\"button\" class=\"btn btn-default\" ng-click=\"$ctrl.cancel()\">Cancel</button>\n        <button type=\"button\" class=\"btn btn-danger\" ng-click=\"$ctrl.deleteConnection()\">Delete</button>\n      </div>\n    ",
        controller: ConnectDeleteModalController
    };
})(JVM || (JVM = {}));
var JVM;
(function (JVM) {
    var ConnectLoginController = /** @class */ (function () {
        ConnectLoginController.$inject = ["$uibModal", "$location"];
        function ConnectLoginController($uibModal, $location) {
            'ngInject';
            this.$uibModal = $uibModal;
            this.$location = $location;
        }
        ConnectLoginController.prototype.$onInit = function () {
            var _this = this;
            this.$uibModal.open({
                backdrop: 'static',
                component: 'connectLoginModal'
            })
                .result.then(function (credentials) {
                window.opener.credentials = credentials;
                window.location.href = _this.$location.search().redirect;
            })
                .catch(function (error) {
                window.close();
            });
        };
        return ConnectLoginController;
    }());
    JVM.ConnectLoginController = ConnectLoginController;
    JVM.connectLoginComponent = {
        controller: ConnectLoginController
    };
})(JVM || (JVM = {}));
var JVM;
(function (JVM) {
    var ConnectLoginModalController = /** @class */ (function () {
        ConnectLoginModalController.$inject = ["ConnectOptions", "connectService"];
        function ConnectLoginModalController(ConnectOptions, connectService) {
            'ngInject';
            this.ConnectOptions = ConnectOptions;
            this.connectService = connectService;
            this.invalidCredentials = false;
        }
        ConnectLoginModalController.prototype.cancel = function () {
            this.modalInstance.dismiss();
        };
        ConnectLoginModalController.prototype.login = function (username, password) {
            var _this = this;
            this.connectService.checkCredentials(this.ConnectOptions, username, password)
                .then(function (ok) {
                if (ok) {
                    _this.modalInstance.close({ username: username, password: password });
                }
                else {
                    _this.invalidCredentials = true;
                }
            });
        };
        return ConnectLoginModalController;
    }());
    JVM.ConnectLoginModalController = ConnectLoginModalController;
    JVM.connectLoginModalComponent = {
        bindings: {
            modalInstance: '<'
        },
        template: "\n      <div class=\"modal-header\">\n        <button type=\"button\" class=\"close\" aria-label=\"Close\" ng-click=\"$ctrl.cancel()\">\n          <span class=\"pficon pficon-close\" aria-hidden=\"true\"></span>\n        </button>\n        <h4 class=\"modal-title\">Log In</h4>\n      </div>\n      <form name=\"connectForm\" class=\"form-horizontal\" ng-submit=\"$ctrl.login(username, password)\">\n        <div class=\"modal-body\">\n          <div class=\"alert alert-danger\" ng-show=\"$ctrl.invalidCredentials\">\n            <span class=\"pficon pficon-error-circle-o\"></span> Incorrect username or password\n          </div>    \n          <div class=\"form-group\">\n            <label class=\"col-sm-3 control-label\" for=\"connection-username\">Username</label>\n            <div class=\"col-sm-8\">\n              <input type=\"text\" id=\"connection-username\" class=\"form-control\" ng-model=\"username\" pf-focused=\"true\">\n            </div>\n          </div>\n          <div class=\"form-group\">\n            <label class=\"col-sm-3 control-label\" for=\"connection-password\">Password</label>\n            <div class=\"col-sm-8\">\n              <input type=\"password\" id=\"connection-password\" class=\"form-control\" ng-model=\"password\">\n            </div>\n          </div>\n        </div>\n        <div class=\"modal-footer\">\n          <button type=\"button\" class=\"btn btn-default\" ng-click=\"$ctrl.cancel()\">Cancel</button>\n          <button type=\"submit\" class=\"btn btn-primary\">Log In</button>\n        </div>\n      </form>\n    ",
        controller: ConnectLoginModalController
    };
})(JVM || (JVM = {}));
var JVM;
(function (JVM) {
    var ConnectUnreachableModalController = /** @class */ (function () {
        function ConnectUnreachableModalController() {
        }
        ConnectUnreachableModalController.prototype.ok = function () {
            this.modalInstance.close();
        };
        return ConnectUnreachableModalController;
    }());
    JVM.ConnectUnreachableModalController = ConnectUnreachableModalController;
    JVM.connectUnreachableModalComponent = {
        bindings: {
            modalInstance: '<'
        },
        template: "\n      <div class=\"modal-header\">\n        <button type=\"button\" class=\"close\" aria-label=\"Close\" ng-click=\"$ctrl.ok()\">\n          <span class=\"pficon pficon-close\" aria-hidden=\"true\"></span>\n        </button>\n        <h4>Can't connect</h4>\n      </div>\n      <div class=\"modal-body\">\n        <p>This Jolokia endpoint is unreachable. Please check the connection details and try again.</p>\n      </div>\n      <div class=\"modal-footer\">\n        <button type=\"button\" class=\"btn btn-primary\" ng-click=\"$ctrl.ok()\">OK</button>\n      </div>\n    ",
        controller: ConnectUnreachableModalController
    };
})(JVM || (JVM = {}));
var JVM;
(function (JVM) {
    function ConnectionUrlFilter() {
        return function (connection) {
            var url = connection.scheme + "://" + connection.host;
            if (connection.port) {
                url += ":" + connection.port;
            }
            if (connection.path) {
                url += "/" + connection.path;
            }
            return url;
        };
    }
    JVM.ConnectionUrlFilter = ConnectionUrlFilter;
})(JVM || (JVM = {}));
/// <reference path="connect.component.ts"/>
/// <reference path="connect-edit-modal.component.ts"/>
/// <reference path="connect-delete-modal.component.ts"/>
/// <reference path="connect-login.component.ts"/>
/// <reference path="connect-login-modal.component.ts"/>
/// <reference path="connect-unreachable-modal.component.ts"/>
/// <reference path="connect.service.ts"/>
/// <reference path="connection-url.filter.ts"/>
var JVM;
(function (JVM) {
    JVM.ConnectModule = angular
        .module('hawtio-jvm-connect', [])
        .component('connect', JVM.connectComponent)
        .component('connectEditModal', JVM.connectEditModalComponent)
        .component('connectDeleteModal', JVM.connectDeleteModalComponent)
        .component('connectLogin', JVM.connectLoginComponent)
        .component('connectLoginModal', JVM.connectLoginModalComponent)
        .component('connectUnreachableModal', JVM.connectUnreachableModalComponent)
        .service('connectService', JVM.ConnectService)
        .filter('connectionUrl', JVM.ConnectionUrlFilter)
        .name;
})(JVM || (JVM = {}));
/// <reference path="connect/connect.module.ts"/>
var JVM;
(function (JVM) {
    defineRoutes.$inject = ["$provide", "$routeProvider"];
    configurePlugin.$inject = ["HawtioNav", "$location", "viewRegistry", "helpRegistry", "preferencesRegistry", "ConnectOptions", "preLogoutTasks", "locationChangeStartTasks", "HawtioDashboard", "HawtioExtension", "$templateCache", "$compile"];
    JVM._module = angular
        .module(JVM.pluginName, [JVM.ConnectModule])
        .config(defineRoutes)
        .constant('mbeanName', 'hawtio:type=JVMList')
        .run(configurePlugin);
    function defineRoutes($provide, $routeProvider) {
        'ngInject';
        $routeProvider
            .when('/jvm', { redirectTo: '/jvm/connect' })
            .when('/jvm/welcome', { templateUrl: UrlHelpers.join(JVM.templatePath, 'welcome.html') })
            .when('/jvm/discover', { templateUrl: UrlHelpers.join(JVM.templatePath, 'discover.html') })
            .when('/jvm/connect', { template: '<connect></connect>' })
            .when('/jvm/connect-login', { template: '<connect-login></connect-login>' })
            .when('/jvm/local', { templateUrl: UrlHelpers.join(JVM.templatePath, 'local.html') });
    }
    function configurePlugin(HawtioNav, $location, viewRegistry, helpRegistry, preferencesRegistry, ConnectOptions, preLogoutTasks, locationChangeStartTasks, HawtioDashboard, HawtioExtension, $templateCache, $compile) {
        'ngInject';
        viewRegistry['jvm'] = "plugins/jvm/html/layoutConnect.html";
        HawtioExtension.add('hawtio-header', function ($scope) {
            var template = $templateCache.get(UrlHelpers.join(JVM.templatePath, 'navbarHeaderExtension.html'));
            return $compile(template)($scope);
        });
        if (!HawtioDashboard.inDashboard) {
            // ensure that if the connection parameter is present, that we keep it
            locationChangeStartTasks.addTask('ConParam', function ($event, newUrl, oldUrl) {
                // we can't execute until the app is initialized...
                if (!HawtioCore.injector) {
                    return;
                }
                if (!ConnectOptions || !ConnectOptions.name || !newUrl) {
                    return;
                }
                var newQuery = new URI(newUrl).query(true);
                if (!newQuery.con) {
                    newQuery['con'] = ConnectOptions.name;
                    $location.search(newQuery);
                }
            });
        }
        // clean up local storage upon logout
        preLogoutTasks.addTask('CleanupJvmConnectCredentials', function () {
            JVM.log.debug("Clean up credentials from JVM connection settings in local storage");
            var connections = JVM.loadConnections();
            connections.forEach(function (connection) {
                delete connection.userName;
                delete connection.password;
            });
            JVM.saveConnections(connections);
        });
        var builder = HawtioNav.builder();
        var tab = builder.id('jvm')
            .href(function () { return '/jvm'; })
            .title(function () { return 'Connect'; })
            .isValid(function () { return ConnectOptions == null || ConnectOptions.name == null; })
            .build();
        HawtioNav.add(tab);
        helpRegistry.addUserDoc('jvm', 'plugins/jvm/doc/help.md');
        preferencesRegistry.addTab("Connect", 'plugins/jvm/html/reset.html');
        preferencesRegistry.addTab("Jolokia", "plugins/jvm/html/jolokia-preferences.html");
    }
    hawtioPluginLoader.addModule(JVM.pluginName);
})(JVM || (JVM = {}));
/// <reference path="jvmPlugin.ts"/>
var JVM;
(function (JVM) {
    createJolokiaParams.$inject = ["jolokiaUrl", "localStorage"];
    createJolokia.$inject = ["$location", "localStorage", "jolokiaStatus", "jolokiaParams", "jolokiaUrl", "userDetails", "postLoginTasks"];
    var JolokiaListMethod;
    (function (JolokiaListMethod) {
        // constant meaning that general LIST+EXEC Jolokia operations should be used
        JolokiaListMethod["LIST_GENERAL"] = "list";
        // constant meaning that optimized hawtio:type=security,name=RBACRegistry may be used
        JolokiaListMethod["LIST_WITH_RBAC"] = "list_rbac";
        // when we get this status, we have to try checking again after logging in
        JolokiaListMethod["LIST_CANT_DETERMINE"] = "cant_determine";
    })(JolokiaListMethod = JVM.JolokiaListMethod || (JVM.JolokiaListMethod = {}));
    var JOLOKIA_RBAC_LIST_MBEAN = "hawtio:type=security,name=RBACRegistry";
    JVM.DEFAULT_MAX_DEPTH = 7;
    JVM.DEFAULT_MAX_COLLECTION_SIZE = 50000;
    var urlCandidates = ['/hawtio/jolokia', '/jolokia', 'jolokia'];
    var discoveredUrl = null;
    hawtioPluginLoader.registerPreBootstrapTask({
        name: 'JvmParseLocation',
        task: function (next) {
            var uri = new URI();
            var query = uri.query(true);
            JVM.log.debug("query: ", query);
            var jolokiaUrl = query['jolokiaUrl'];
            if (jolokiaUrl) {
                delete query['sub-tab'];
                delete query['main-tab'];
                jolokiaUrl = URI.decode(jolokiaUrl);
                var jolokiaURI = new URI(jolokiaUrl);
                var name_1 = query['title'] || 'Unknown Connection';
                var token = query['token'] || Core.trimLeading(uri.hash(), '#');
                var options = createConnectOptions({
                    jolokiaUrl: jolokiaUrl,
                    name: name_1,
                    scheme: jolokiaURI.protocol(),
                    host: jolokiaURI.hostname(),
                    port: Core.parseIntValue(jolokiaURI.port()),
                    path: Core.trimLeading(jolokiaURI.pathname(), '/')
                });
                if (!Core.isBlank(token)) {
                    options['token'] = token;
                }
                _.merge(options, jolokiaURI.query(true));
                _.assign(options, query);
                JVM.log.debug("options: ", options);
                var connections = JVM.loadConnections().filter(function (connection) { return connection.name !== name_1; });
                connections.push(options);
                JVM.saveConnections(connections);
                uri.hash("").query({
                    con: name_1
                });
                window.location.replace(uri.toString());
                // don't allow bootstrap to continue
                return;
            }
            var connectionName = query['con'];
            if (connectionName) {
                JVM.log.debug("Not discovering jolokia");
                // a connection name is set, no need to discover a jolokia instance
                next();
                return;
            }
            function maybeCheckNext(candidates) {
                if (candidates.length === 0) {
                    next();
                }
                else {
                    checkNext(candidates.pop());
                }
            }
            function checkNext(url) {
                JVM.log.debug("Trying URL:", url);
                $.ajax(url).always(function (data, statusText, jqXHR) {
                    // for $.ajax().always(), the xhr is flipped on fail
                    if (statusText !== 'success') {
                        jqXHR = data;
                    }
                    if (jqXHR.status === 200) {
                        try {
                            var resp = angular.fromJson(data);
                            //log.debug("Got response: ", resp);
                            if ('value' in resp && 'agent' in resp.value) {
                                discoveredUrl = url;
                                JVM.log.debug("Found jolokia agent at:", url, "version:", resp.value.agent);
                                next();
                            }
                            else {
                                maybeCheckNext(urlCandidates);
                            }
                        }
                        catch (e) {
                            maybeCheckNext(urlCandidates);
                        }
                    }
                    else if (jqXHR.status === 401 || jqXHR.status === 403) {
                        // I guess this could be it...
                        discoveredUrl = url;
                        JVM.log.debug("Using URL:", url, "assuming it could be an agent but got return code:", jqXHR.status);
                        next();
                    }
                    else {
                        maybeCheckNext(urlCandidates);
                    }
                });
            }
            checkNext(urlCandidates.pop());
        }
    });
    JVM.ConnectionName = null;
    function getConnectionName(reset) {
        if (reset === void 0) { reset = false; }
        if (!Core.isBlank(JVM.ConnectionName) && !reset) {
            return JVM.ConnectionName;
        }
        JVM.ConnectionName = '';
        var search = new URI().search(true);
        if ('con' in window) {
            JVM.ConnectionName = window['con'];
            JVM.log.debug("Using connection name from window:", JVM.ConnectionName);
        }
        else if ('con' in search) {
            JVM.ConnectionName = search['con'];
            JVM.log.debug("Using connection name from URL:", JVM.ConnectionName);
        }
        else {
            JVM.log.debug("No connection name found, using direct connection to JVM");
        }
        return JVM.ConnectionName;
    }
    JVM.getConnectionName = getConnectionName;
    var connectOptions = (function () {
        var name = getConnectionName();
        if (Core.isBlank(name)) {
            // this will fail any if (ConnectOptions) check
            return null;
        }
        var answer = JVM.getConnectOptions(name);
        // search for passed credentials when connecting to remote server
        if (window.opener && window.opener.credentials) {
            var credentials = window.opener.credentials;
            answer.userName = credentials.username;
            answer.password = credentials.password;
            window.opener.credentials = null;
        }
        return answer;
    })();
    function getJolokiaUrl() {
        var answer = undefined;
        var documentBase = HawtioCore.documentBase();
        if (!connectOptions || !connectOptions.name) {
            JVM.log.debug("Using discovered URL");
            answer = discoveredUrl;
        }
        else {
            answer = JVM.createServerConnectionUrl(connectOptions);
            JVM.log.debug("Using configured URL");
        }
        if (!answer) {
            // this will force a dummy jolokia instance
            return false;
        }
        // build full URL
        var windowURI = new URI();
        var jolokiaURI = undefined;
        if (_.startsWith(answer, '/') || _.startsWith(answer, 'http')) {
            jolokiaURI = new URI(answer);
        }
        else {
            jolokiaURI = new URI(UrlHelpers.join(documentBase, answer));
        }
        if (!connectOptions || !connectOptions.jolokiaUrl) {
            if (!jolokiaURI.protocol()) {
                jolokiaURI.protocol(windowURI.protocol());
            }
            if (!jolokiaURI.hostname()) {
                jolokiaURI.host(windowURI.hostname());
            }
            if (!jolokiaURI.port()) {
                jolokiaURI.port(windowURI.port());
            }
        }
        answer = jolokiaURI.toString();
        JVM.log.debug("Complete jolokia URL: ", answer);
        return answer;
    }
    JVM.getJolokiaUrl = getJolokiaUrl;
    JVM._module.service('ConnectionName', function () { return function (reset) {
        if (reset === void 0) { reset = false; }
        return getConnectionName(reset);
    }; });
    JVM._module.service('ConnectOptions', function () { return connectOptions; });
    // the jolokia URL we're connected to
    JVM._module.factory('jolokiaUrl', function () { return getJolokiaUrl(); });
    // holds the status returned from the last jolokia call and hints for jolokia.list optimization
    JVM._module.factory('jolokiaStatus', createJolokiaStatus);
    JVM._module.factory('jolokiaParams', createJolokiaParams);
    JVM._module.factory('jolokia', createJolokia);
    function createJolokiaStatus() {
        'ngInject';
        return {
            xhr: null,
            listMethod: JolokiaListMethod.LIST_GENERAL,
            listMBean: JOLOKIA_RBAC_LIST_MBEAN
        };
    }
    function createJolokiaParams(jolokiaUrl, localStorage) {
        'ngInject';
        var answer = {
            canonicalNaming: false,
            ignoreErrors: true,
            maxCollectionSize: JVM.DEFAULT_MAX_COLLECTION_SIZE,
            maxDepth: JVM.DEFAULT_MAX_DEPTH,
            method: 'post',
            mimeType: 'application/json'
        };
        if ('jolokiaParams' in localStorage) {
            answer = angular.fromJson(localStorage['jolokiaParams']);
        }
        else {
            localStorage['jolokiaParams'] = angular.toJson(answer);
        }
        answer['url'] = jolokiaUrl;
        return answer;
    }
    function createJolokia($location, localStorage, jolokiaStatus, jolokiaParams, jolokiaUrl, userDetails, postLoginTasks) {
        'ngInject';
        var jolokia = null;
        if (jolokiaUrl) {
            // hawtio-oauth may have already set up jQuery beforeSend
            if (!$.ajaxSettings.beforeSend) {
                JVM.log.debug("Setting up jQuery beforeSend");
                $.ajaxSetup({ beforeSend: getBeforeSend(userDetails) });
            }
            // execute post-login tasks in case they are not yet executed
            // TODO: Where is the right place to execute post-login tasks for unauthenticated hawtio app?
            postLoginTasks.execute();
            if (!jolokiaParams.ajaxError) {
                jolokiaParams.ajaxError = function (xhr, textStatus, error) {
                    if (xhr.status === 403) {
                        // If window was opened to connect to remote Jolokia endpoint
                        if (window.opener) {
                            // ... and not showing the login modal
                            if ($location.path() !== '/jvm/connect-login') {
                                jolokia.stop();
                                var redirectUrl = $location.absUrl();
                                $location.path('/jvm/connect-login').search('redirect', redirectUrl);
                            }
                        }
                        else {
                            // just logout
                            /* Logout here prevents keycloak from working
                            if (userDetails.loggedIn) {
                              userDetails.logout();
                            }
                            */
                        }
                    }
                    else {
                        jolokiaStatus.xhr = xhr;
                    }
                };
            }
            jolokia = new Jolokia(jolokiaParams);
            jolokia.stop();
            if ('updateRate' in localStorage) {
                if (localStorage['updateRate'] > 0) {
                    jolokia.start(localStorage['updateRate']);
                }
            }
            // let's check if we can call faster jolokia.list()
            checkJolokiaOptimization(jolokia, jolokiaStatus);
        }
        else {
            JVM.log.debug("Use dummy Jolokia");
            jolokia = new DummyJolokia();
        }
        return jolokia;
    }
    function getBeforeSend(userDetails) {
        // Just set Authorization for now...
        var header = 'Authorization';
        if (userDetails.loggedIn && userDetails.token) {
            JVM.log.debug("Setting authorization header to token");
            return function (xhr) {
                if (userDetails.token) {
                    xhr.setRequestHeader(header, 'Bearer ' + userDetails.token);
                }
            };
        }
        else if (connectOptions && connectOptions['token']) {
            return function (xhr) { return xhr.setRequestHeader(header, 'Bearer ' + connectOptions['token']); };
        }
        else if (connectOptions && connectOptions.userName && connectOptions.password) {
            JVM.log.debug("Setting authorization header to username/password");
            return function (xhr) {
                return xhr.setRequestHeader(header, Core.getBasicAuthHeader(connectOptions.userName, connectOptions.password));
            };
        }
        else {
            JVM.log.debug("Not setting any authorization header");
            return function (xhr) { };
        }
    }
    /**
     * Queries available server-side MBean to check if we can call optimized jolokia.list() operation
     * @param jolokia {Jolokia.IJolokia}
     * @param jolokiaStatus {JolokiaStatus}
     */
    function checkJolokiaOptimization(jolokia, jolokiaStatus) {
        JVM.log.debug("Checking if we can call optimized jolokia.list() operation");
        // NOTE: Sync XHR call to Jolokia is required here to resolve the available list method immediately
        var response = jolokia.list(Core.escapeMBeanPath(jolokiaStatus.listMBean), Core.onSuccess(null));
        if (response && _.isObject(response['op'])) {
            jolokiaStatus.listMethod = JolokiaListMethod.LIST_WITH_RBAC;
        }
        else {
            // we could get 403 error, mark the method as special case, equal in practice with LIST_GENERAL
            jolokiaStatus.listMethod = JolokiaListMethod.LIST_CANT_DETERMINE;
        }
        JVM.log.debug("Jolokia list method:", jolokiaStatus.listMethod);
    }
    /**
     * Empty jolokia that returns nothing
     */
    var DummyJolokia = /** @class */ (function () {
        function DummyJolokia() {
            this.isDummy = true;
            this.running = false;
        }
        DummyJolokia.prototype.request = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            return null;
        };
        DummyJolokia.prototype.getAttribute = function (mbean, attribute, path, opts) { return null; };
        DummyJolokia.prototype.setAttribute = function (mbean, attribute, value, path, opts) { };
        ;
        DummyJolokia.prototype.execute = function (mbean, operation) {
            var args = [];
            for (var _i = 2; _i < arguments.length; _i++) {
                args[_i - 2] = arguments[_i];
            }
            return null;
        };
        DummyJolokia.prototype.search = function (mBeanPatter, opts) { return null; };
        DummyJolokia.prototype.list = function (path, opts) { return null; };
        DummyJolokia.prototype.version = function (opts) { return null; };
        DummyJolokia.prototype.register = function (params) {
            var request = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                request[_i - 1] = arguments[_i];
            }
            return null;
        };
        DummyJolokia.prototype.unregister = function (handle) { };
        DummyJolokia.prototype.jobs = function () { return []; };
        DummyJolokia.prototype.start = function (period) { this.running = true; };
        DummyJolokia.prototype.stop = function () { this.running = false; };
        DummyJolokia.prototype.isRunning = function () { return this.running; };
        return DummyJolokia;
    }());
    JVM.DummyJolokia = DummyJolokia;
    function createConnectOptions(options) {
        if (options === void 0) { options = {}; }
        var defaults = {
            name: null,
            scheme: 'http',
            host: null,
            port: null,
            path: null,
            useProxy: true,
            jolokiaUrl: null,
            userName: null,
            password: null,
            reachable: true
        };
        return angular.extend(defaults, options);
    }
    JVM.createConnectOptions = createConnectOptions;
})(JVM || (JVM = {}));
var Jmx;
(function (Jmx) {
    /**
     * @class Folder
     * @uses NodeSelection
     */
    var Folder = /** @class */ (function () {
        function Folder(text) {
            this.text = text;
            this.id = null;
            this.typeName = null;
            this.nodes = [];
            this.folderNames = [];
            this.domain = null;
            this.objectName = null;
            this.entries = {};
            this.class = null;
            this.parent = null;
            this.isLazy = false;
            this.icon = null;
            this.image = null;
            this.tooltip = null;
            this.entity = null;
            this.version = null;
            this.mbean = null;
            this.class = Core.escapeTreeCssStyles(text);
        }
        Object.defineProperty(Folder.prototype, "key", {
            get: function () {
                return this.id;
            },
            set: function (key) {
                this.id = key;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Folder.prototype, "title", {
            get: function () {
                return this.text;
            },
            set: function (title) {
                this.text = title;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Folder.prototype, "children", {
            get: function () {
                return this.nodes;
            },
            set: function (items) {
                this.nodes = items;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Folder.prototype, "lazyLoad", {
            get: function () {
                return this.isLazy;
            },
            set: function (isLazy) {
                this.isLazy = isLazy;
            },
            enumerable: true,
            configurable: true
        });
        Folder.prototype.get = function (key) {
            return _.find(this.children, function (child) { return child.text === key; });
        };
        Folder.prototype.isFolder = function () {
            return this.nodes && this.nodes.length > 0;
        };
        /**
         * Navigates the given paths and returns the value there or null if no value could be found
         * @method navigate
         * @for Folder
         * @param {Array} paths
         * @return {NodeSelection}
         */
        Folder.prototype.navigate = function () {
            var paths = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                paths[_i] = arguments[_i];
            }
            return paths.reduce(function (node, path) { return node ? node.get(path) : null; }, this);
        };
        Folder.prototype.hasEntry = function (key, value) {
            var entries = this.entries;
            if (entries) {
                var actual = entries[key];
                return actual && value === actual;
            }
            return false;
        };
        Folder.prototype.parentHasEntry = function (key, value) {
            if (this.parent) {
                return this.parent.hasEntry(key, value);
            }
            return false;
        };
        Folder.prototype.ancestorHasEntry = function (key, value) {
            var parent = this.parent;
            while (parent) {
                if (parent.hasEntry(key, value))
                    return true;
                parent = parent.parent;
            }
            return false;
        };
        Folder.prototype.ancestorHasType = function (typeName) {
            var parent = this.parent;
            while (parent) {
                if (typeName === parent.typeName)
                    return true;
                parent = parent.parent;
            }
            return false;
        };
        Folder.prototype.getOrElse = function (key, defaultValue) {
            if (defaultValue === void 0) { defaultValue = new Folder(key); }
            var answer = this.get(key);
            if (!answer) {
                answer = defaultValue;
                this.children.push(answer);
                answer.parent = this;
            }
            return answer;
        };
        Folder.prototype.sortChildren = function (recursive) {
            var children = this.children;
            if (children) {
                this.children = _.sortBy(children, 'text');
                if (recursive) {
                    angular.forEach(children, function (child) { return child.sortChildren(recursive); });
                }
            }
        };
        Folder.prototype.moveChild = function (child) {
            if (child && child.parent !== this) {
                child.detach();
                child.parent = this;
                this.children.push(child);
            }
        };
        Folder.prototype.insertBefore = function (child, referenceFolder) {
            child.detach();
            child.parent = this;
            var idx = _.indexOf(this.children, referenceFolder);
            if (idx >= 0) {
                this.children.splice(idx, 0, child);
            }
        };
        Folder.prototype.insertAfter = function (child, referenceFolder) {
            child.detach();
            child.parent = this;
            var idx = _.indexOf(this.children, referenceFolder);
            if (idx >= 0) {
                this.children.splice(idx + 1, 0, child);
            }
        };
        /**
         * Removes this node from my parent if I have one
         * @method detach
         * @for Folder
         */
        Folder.prototype.detach = function () {
            var _this = this;
            var oldParent = this.parent;
            if (oldParent) {
                var oldParentChildren = oldParent.children;
                if (oldParentChildren) {
                    var idx = oldParentChildren.indexOf(this);
                    if (idx < 0) {
                        _.remove(oldParent.children, function (child) { return child.key === _this.key; });
                    }
                    else {
                        oldParentChildren.splice(idx, 1);
                    }
                }
                this.parent = null;
            }
        };
        /**
         * Searches this folder and all its descendants for the first folder to match the filter
         * @method findDescendant
         * @for Folder
         * @param {Function} filter
         * @return {Folder}
         */
        Folder.prototype.findDescendant = function (filter) {
            if (filter(this)) {
                return this;
            }
            var answer = null;
            angular.forEach(this.children, function (child) {
                if (!answer) {
                    answer = child.findDescendant(filter);
                }
            });
            return answer;
        };
        /**
         * Searches this folder and all its ancestors for the first folder to match the filter
         * @method findDescendant
         * @for Folder
         * @param {Function} filter
         * @return {Folder}
         */
        Folder.prototype.findAncestor = function (filter) {
            if (filter(this)) {
                return this;
            }
            if (this.parent != null) {
                return this.parent.findAncestor(filter);
            }
            else {
                return null;
            }
        };
        return Folder;
    }());
    Jmx.Folder = Folder;
})(Jmx || (Jmx = {}));
/// <reference path="tree/folder.ts"/>
/// <reference path="workspace.ts"/>
var Jmx;
(function (Jmx) {
    Jmx.pluginName = 'hawtio-jmx';
    Jmx.log = Logger.get(Jmx.pluginName);
    Jmx.currentProcessId = '';
    Jmx.templatePath = 'plugins/jmx/html';
    // Add a few functions to the Core namespace
    /**
     * Returns the Folder object for the given domain name and type name or null if it can not be found
     * @method getMBeanTypeFolder
     * @for Core
     * @static
     * @param {Workspace} workspace
     * @param {String} domain
     * @param {String} typeName}
     * @return {Folder}
     */
    function getMBeanTypeFolder(workspace, domain, typeName) {
        if (workspace) {
            var mbeanTypesToDomain = workspace.mbeanTypesToDomain || {};
            var types = mbeanTypesToDomain[typeName] || {};
            var answer = types[domain];
            if (angular.isArray(answer) && answer.length) {
                return answer[0];
            }
            return answer;
        }
        return null;
    }
    Jmx.getMBeanTypeFolder = getMBeanTypeFolder;
    /**
     * Returns the JMX objectName for the given jmx domain and type name
     * @method getMBeanTypeObjectName
     * @for Core
     * @static
     * @param {Workspace} workspace
     * @param {String} domain
     * @param {String} typeName
     * @return {String}
     */
    function getMBeanTypeObjectName(workspace, domain, typeName) {
        var folder = getMBeanTypeFolder(workspace, domain, typeName);
        return Core.pathGet(folder, ["objectName"]);
    }
    Jmx.getMBeanTypeObjectName = getMBeanTypeObjectName;
    /**
     * Creates a remote workspace given a remote jolokia for querying the JMX MBeans inside the jolokia
     * @param remoteJolokia
     * @param remoteJolokiaStatus
     * @param $location
     * @param localStorage
     * @return {Workspace}
     */
    function createRemoteWorkspace(remoteJolokia, remoteJolokiaStatus, $location, localStorage, $rootScope, $compile, $templateCache, HawtioNav) {
        if ($rootScope === void 0) { $rootScope = null; }
        if ($compile === void 0) { $compile = null; }
        if ($templateCache === void 0) { $templateCache = null; }
        if (HawtioNav === void 0) { HawtioNav = null; }
        // lets create a child workspace object for the remote container
        var jolokiaStatus = {
            xhr: null,
            listMethod: remoteJolokiaStatus.listMethod,
            listMBean: remoteJolokiaStatus.listMBean
        };
        // disable reload notifications
        var jmxTreeLazyLoadRegistry = Core.lazyLoaders;
        var profileWorkspace = new Jmx.Workspace(remoteJolokia, jolokiaStatus, jmxTreeLazyLoadRegistry, $location, $compile, $templateCache, localStorage, $rootScope, HawtioNav);
        Jmx.log.info("Loading the profile using jolokia: " + remoteJolokia);
        profileWorkspace.loadTree();
        return profileWorkspace;
    }
    Jmx.createRemoteWorkspace = createRemoteWorkspace;
})(Jmx || (Jmx = {}));
/// <reference path="../../jvm/ts/jolokiaService.ts"/>
/// <reference path="jmxHelpers.ts"/>
var Jmx;
(function (Jmx) {
    var log = Logger.get("hawtio-jmx-workspace");
    var logTree = Logger.get("hawtio-jmx-workspace-tree");
    var HAWTIO_REGISTRY_MBEAN = "hawtio:type=Registry";
    var HAWTIO_TREE_WATCHER_MBEAN = "hawtio:type=TreeWatcher";
    /**
     * @class Workspace
     */
    var Workspace = /** @class */ (function () {
        function Workspace(jolokia, jolokiaStatus, jmxTreeLazyLoadRegistry, $location, $compile, $templateCache, localStorage, $rootScope, HawtioNav) {
            this.jolokia = jolokia;
            this.jolokiaStatus = jolokiaStatus;
            this.jmxTreeLazyLoadRegistry = jmxTreeLazyLoadRegistry;
            this.$location = $location;
            this.$compile = $compile;
            this.$templateCache = $templateCache;
            this.localStorage = localStorage;
            this.$rootScope = $rootScope;
            this.HawtioNav = HawtioNav;
            this.operationCounter = 0;
            this.tree = new Jmx.Folder('MBeans');
            this.mbeanTypesToDomain = {};
            this.mbeanServicesToDomain = {};
            this.attributeColumnDefs = {};
            this.onClickRowHandlers = {};
            this.treePostProcessors = {};
            this.topLevelTabs = undefined;
            this.subLevelTabs = [];
            this.keyToNodeMap = {};
            this.pluginRegisterHandle = null;
            this.pluginUpdateCounter = null;
            this.treeWatchRegisterHandle = null;
            this.treeWatcherCounter = null;
            this.treeFetched = false;
            // mapData allows to store arbitrary data on the workspace
            this.mapData = {};
            this.rootId = 'root';
            this.separator = '-';
            // set defaults
            if (!('autoRefresh' in localStorage)) {
                localStorage['autoRefresh'] = true;
            }
            if (!('updateRate' in localStorage)) {
                localStorage['updateRate'] = 5000;
            }
            var workspace = this;
            this.topLevelTabs = {
                push: function (item) {
                    log.debug("Added menu item:", item);
                    var tab = {
                        id: item.id,
                        title: function () { return item.content; },
                        isValid: function () { return item.isValid(workspace); },
                        href: function () { return UrlHelpers.noHash(item.href()); },
                    };
                    if (item.isActive) {
                        tab['isSelected'] = function () { return item.isActive(workspace); };
                    }
                    workspace.HawtioNav.add(tab);
                },
                find: function (search) { }
            };
        }
        /**
         * Creates a shallow copy child workspace with its own selection and location
         * @method createChildWorkspace
         * @param {ng.ILocationService} location
         * @return {Workspace}
         */
        Workspace.prototype.createChildWorkspace = function (location) {
            var child = new Workspace(this.jolokia, this.jolokiaStatus, this.jmxTreeLazyLoadRegistry, this.$location, this.$compile, this.$templateCache, this.localStorage, this.$rootScope, this.HawtioNav);
            // lets copy across all the properties just in case
            _.forEach(this, function (value, key) { return child[key] = value; });
            child.$location = location;
            return child;
        };
        Workspace.prototype.getLocalStorage = function (key) {
            return this.localStorage[key];
        };
        Workspace.prototype.setLocalStorage = function (key, value) {
            this.localStorage[key] = value;
        };
        Workspace.prototype.jolokiaList = function (callback, flags) {
            var listMethod = this.jolokiaStatus.listMethod;
            switch (listMethod) {
                case JVM.JolokiaListMethod.LIST_WITH_RBAC:
                    log.debug("Invoking Jolokia list mbean in RBAC mode");
                    flags.maxDepth = 9;
                    this.jolokia.execute(this.jolokiaStatus.listMBean, "list()", Core.onSuccess(callback, flags));
                    break;
                case JVM.JolokiaListMethod.LIST_GENERAL:
                case JVM.JolokiaListMethod.LIST_CANT_DETERMINE:
                default:
                    log.debug("Invoking Jolokia list mbean in general mode");
                    this.jolokia.list(null, Core.onSuccess(callback, flags));
                    break;
            }
        };
        Workspace.prototype.loadTree = function () {
            var _this = this;
            var workspace = this;
            if (this.jolokia['isDummy']) {
                setTimeout(function () {
                    workspace.treeFetched = true;
                    workspace.populateTree({ value: {} });
                }, 10);
                return;
            }
            var flags = {
                ignoreErrors: true,
                error: function (response) {
                    workspace.treeFetched = true;
                    log.debug("Error fetching JMX tree:", response);
                }
            };
            log.debug("Jolokia:", this.jolokia);
            this.jolokiaList(function (response) {
                _this.jolokiaStatus.xhr = null;
                workspace.treeFetched = true;
                workspace.populateTree({ value: _this.unwindResponseWithRBACCache(response) });
            }, flags);
        };
        /**
         * Adds a post processor of the tree to swizzle the tree metadata after loading
         * such as correcting any typeName values or CSS styles by hand
         * @method addTreePostProcessor
         * @param {Function} processor
         */
        Workspace.prototype.addTreePostProcessor = function (processor) {
            var numKeys = _.keys(this.treePostProcessors).length;
            var nextKey = numKeys + 1;
            return this.addNamedTreePostProcessor(nextKey + '', processor);
        };
        Workspace.prototype.addNamedTreePostProcessor = function (name, processor) {
            this.treePostProcessors[name] = processor;
            var tree = this.tree;
            if (this.treeFetched && tree) {
                // the tree is loaded already so lets process it now :)
                processor(tree);
            }
            return name;
        };
        Workspace.prototype.removeNamedTreePostProcessor = function (name) {
            delete this.treePostProcessors[name];
        };
        Workspace.prototype.maybeMonitorPlugins = function () {
            if (this.treeContainsDomainAndProperties("hawtio", { type: "Registry" })) {
                if (this.pluginRegisterHandle === null) {
                    var callback = angular.bind(this, this.maybeUpdatePlugins);
                    this.pluginRegisterHandle = this.jolokia.register(callback, {
                        type: "read",
                        mbean: HAWTIO_REGISTRY_MBEAN,
                        attribute: "UpdateCounter"
                    });
                }
            }
            else {
                if (this.pluginRegisterHandle !== null) {
                    this.jolokia.unregister(this.pluginRegisterHandle);
                    this.pluginRegisterHandle = null;
                    this.pluginUpdateCounter = null;
                }
            }
            // lets also listen to see if we have a JMX tree watcher
            if (this.treeContainsDomainAndProperties("hawtio", { type: "TreeWatcher" })) {
                if (this.treeWatchRegisterHandle === null) {
                    var callback = angular.bind(this, this.maybeReloadTree);
                    this.treeWatchRegisterHandle = this.jolokia.register(callback, {
                        type: "read",
                        mbean: HAWTIO_TREE_WATCHER_MBEAN,
                        attribute: "Counter"
                    });
                }
            }
        };
        Workspace.prototype.maybeUpdatePlugins = function (response) {
            if (this.pluginUpdateCounter === null) {
                this.pluginUpdateCounter = response.value;
                return;
            }
            if (this.pluginUpdateCounter !== response.value) {
                if (Core.parseBooleanValue(localStorage['autoRefresh'])) {
                    window.location.reload();
                }
            }
        };
        Workspace.prototype.maybeReloadTree = function (response) {
            var _this = this;
            var counter = response.value;
            if (this.treeWatcherCounter === null) {
                this.treeWatcherCounter = counter;
                return;
            }
            if (this.treeWatcherCounter !== counter) {
                this.treeWatcherCounter = counter;
                this.jolokiaList(function (response) { return _this.populateTree({ value: _this.unwindResponseWithRBACCache(response) }); }, { ignoreErrors: true, maxDepth: 8 });
            }
        };
        /**
         * Processes response from jolokia list - if it contains "domains" and "cache" properties
         * @param response
         */
        Workspace.prototype.unwindResponseWithRBACCache = function (response) {
            if (response['domains'] && response['cache']) {
                // post process cached RBAC info
                for (var domainName in response['domains']) {
                    var domainClass = Core.escapeDots(domainName);
                    var domain = response['domains'][domainName];
                    for (var mbeanName in domain) {
                        if (_.isString(domain[mbeanName])) {
                            domain[mbeanName] = response['cache']["" + domain[mbeanName]];
                        }
                    }
                }
                return response['domains'];
            }
            return response;
        };
        Workspace.prototype.populateTree = function (response) {
            var _this = this;
            log.debug("JMX tree has been loaded, data:", response.value);
            this.mbeanTypesToDomain = {};
            this.mbeanServicesToDomain = {};
            this.keyToNodeMap = {};
            var newTree = new Jmx.Folder('MBeans');
            newTree.key = this.rootId;
            var domains = response.value;
            _.forEach(domains, function (domain, domainName) {
                // domain name is displayed in the tree, so let's escape it here
                // Core.escapeHtml() and _.escape() cannot be used, as escaping '"' breaks Camel tree...
                _this.populateDomainFolder(newTree, _this.escapeTagOnly(domainName), domain);
            });
            newTree.sortChildren(true);
            // now lets mark the nodes with no children as lazy loading...
            this.enableLazyLoading(newTree);
            this.tree = newTree;
            var processors = this.treePostProcessors;
            _.forIn(processors, function (processor, key) {
                log.debug("Running tree post processor:", key);
                processor(newTree);
            });
            this.maybeMonitorPlugins();
            this.jmxTreeUpdated();
        };
        Workspace.prototype.jmxTreeUpdated = function () {
            var rootScope = this.$rootScope;
            if (rootScope) {
                Core.$apply(rootScope);
                rootScope.$broadcast('jmxTreeUpdated');
            }
        };
        Workspace.prototype.initFolder = function (folder, domain, folderNames) {
            folder.domain = domain;
            if (!folder.key) {
                folder.key = this.rootId + this.separator + folderNames.join(this.separator);
            }
            folder.folderNames = folderNames;
            logTree.debug("    folder: domain=" + folder.domain + ", key=" + folder.key);
        };
        Workspace.prototype.populateDomainFolder = function (tree, domainName, domain) {
            var _this = this;
            logTree.debug("JMX tree domain: " + domainName);
            var domainClass = Core.escapeDots(domainName);
            var folder = this.folderGetOrElse(tree, domainName);
            this.initFolder(folder, domainName, [domainName]);
            _.forEach(domain, function (mbean, mbeanName) {
                _this.populateMBeanFolder(folder, domainClass, mbeanName, mbean);
            });
        };
        /**
         * Escape only '<' and '>' as opposed to Core.escapeHtml() and _.escape()
         *
         * @param {string} str string to be escaped
        */
        Workspace.prototype.escapeTagOnly = function (str) {
            var tagChars = {
                "<": "&lt;",
                ">": "&gt;"
            };
            if (!angular.isString(str)) {
                return str;
            }
            var escaped = "";
            for (var i = 0; i < str.length; i++) {
                var c = str.charAt(i);
                escaped += tagChars[c] || c;
            }
            return escaped;
        };
        Workspace.prototype.populateMBeanFolder = function (domainFolder, domainClass, mbeanName, mbean) {
            var _this = this;
            logTree.debug("  JMX tree mbean: " + mbeanName);
            var entries = {};
            var paths = [];
            var typeName = null;
            var serviceName = null;
            mbeanName.split(',').forEach(function (prop) {
                // do not use split('=') as it splits wrong when there is a space in the mbean name
                var kv = _this.splitMBeanProperty(prop);
                var propKey = kv[0];
                // mbean property value is displayed in the tree, so let's escape it here
                // Core.escapeHtml() and _.escape() cannot be used, as escaping '"' breaks Camel tree...
                var propValue = _this.escapeTagOnly(kv[1] || propKey);
                entries[propKey] = propValue;
                var moveToFront = false;
                var lowerKey = propKey.toLowerCase();
                if (lowerKey === "type") {
                    typeName = propValue;
                    // if the type name value already exists in the root node
                    // of the domain then lets move this property around too
                    if (domainFolder.get(propValue)) {
                        moveToFront = true;
                    }
                }
                if (lowerKey === "service") {
                    serviceName = propValue;
                }
                if (moveToFront) {
                    paths.unshift(propValue);
                }
                else {
                    paths.push(propValue);
                }
            });
            var folder = domainFolder;
            var domainName = domainFolder.domain;
            var folderNames = _.clone(domainFolder.folderNames);
            var lastPath = paths.pop();
            paths.forEach(function (path) {
                folder = _this.folderGetOrElse(folder, path);
                if (folder) {
                    folderNames.push(path);
                    _this.configureFolder(folder, domainName, domainClass, folderNames, path);
                }
            });
            if (folder) {
                folder = this.folderGetOrElse(folder, lastPath);
                if (folder) {
                    // lets add the various data into the folder
                    folder.entries = entries;
                    folderNames.push(lastPath);
                    this.configureFolder(folder, domainName, domainClass, folderNames, lastPath);
                    folder.text = Core.trimQuotes(lastPath);
                    folder.objectName = domainName + ":" + mbeanName;
                    folder.mbean = mbean;
                    folder.typeName = typeName;
                    if (serviceName) {
                        this.addFolderByDomain(folder, domainName, serviceName, this.mbeanServicesToDomain);
                    }
                    if (typeName) {
                        this.addFolderByDomain(folder, domainName, typeName, this.mbeanTypesToDomain);
                    }
                }
            }
            else {
                log.info("No folder found for last path: " + lastPath);
            }
        };
        Workspace.prototype.folderGetOrElse = function (folder, name) {
            return folder ? folder.getOrElse(name) : null;
        };
        Workspace.prototype.splitMBeanProperty = function (property) {
            var pos = property.indexOf('=');
            if (pos > 0) {
                return [property.substr(0, pos), property.substr(pos + 1)];
            }
            else {
                return [property, property];
            }
        };
        Workspace.prototype.configureFolder = function (folder, domainName, domainClass, folderNames, path) {
            var _this = this;
            this.initFolder(folder, domainName, _.clone(folderNames));
            this.keyToNodeMap[folder.key] = folder;
            var classes = "";
            var typeKey = _.filter(_.keys(folder.entries), function (key) { return key.toLowerCase().indexOf("type") >= 0; });
            if (typeKey.length) {
                // last path
                _.forEach(typeKey, function (key) {
                    var typeName = folder.entries[key];
                    if (!folder.ancestorHasEntry(key, typeName)) {
                        classes += " " + domainClass + _this.separator + typeName;
                    }
                });
            }
            else {
                // folder
                var kindName = _.last(folderNames);
                if (kindName === path) {
                    kindName += "-folder";
                }
                if (kindName) {
                    classes += " " + domainClass + this.separator + kindName;
                }
            }
            folder.class = Core.escapeTreeCssStyles(classes);
            return folder;
        };
        Workspace.prototype.addFolderByDomain = function (folder, domainName, typeName, owner) {
            var map = owner[typeName];
            if (!map) {
                map = {};
                owner[typeName] = map;
            }
            var value = map[domainName];
            if (!value) {
                map[domainName] = folder;
            }
            else {
                var array = null;
                if (angular.isArray(value)) {
                    array = value;
                }
                else {
                    array = [value];
                    map[domainName] = array;
                }
                array.push(folder);
            }
        };
        Workspace.prototype.enableLazyLoading = function (folder) {
            var _this = this;
            var children = folder.children;
            if (children && children.length) {
                angular.forEach(children, function (child) { return _this.enableLazyLoading(child); });
            }
            else {
                // we have no children so enable lazy loading if we have a custom loader registered
                var lazyFunction = Jmx.findLazyLoadingFunction(this, folder);
                if (lazyFunction) {
                    folder.lazyLoad = true;
                }
                else {
                    folder.icon = 'fa fa-cube';
                }
            }
        };
        /**
         * Returns the hash query argument to append to URL links
         * @method hash
         * @return {String}
         */
        Workspace.prototype.hash = function () {
            var hash = this.$location.search();
            var params = Core.hashToString(hash);
            if (params) {
                return "?" + params;
            }
            return "";
        };
        /**
         * Returns the currently active tab
         * @method getActiveTab
         * @return {Boolean}
         */
        Workspace.prototype.getActiveTab = function () {
            var workspace = this;
            return _.find(this.topLevelTabs, function (tab) {
                if (!angular.isDefined(tab.isActive)) {
                    return workspace.isLinkActive(tab.href());
                }
                else {
                    return tab.isActive(workspace);
                }
            });
        };
        Workspace.prototype.getStrippedPathName = function () {
            var pathName = Core.trimLeading((this.$location.path() || '/'), "#");
            pathName = pathName.replace(/^\//, '');
            return pathName;
        };
        Workspace.prototype.linkContains = function () {
            var words = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                words[_i] = arguments[_i];
            }
            var pathName = this.getStrippedPathName();
            return _.every(words, function (word) { return pathName.indexOf(word) !== 0; });
        };
        /**
         * Returns true if the given link is active. The link can omit the leading # or / if necessary.
         * The query parameters of the URL are ignored in the comparison.
         * @method isLinkActive
         * @param {String} href
         * @return {Boolean} true if the given link is active
         */
        Workspace.prototype.isLinkActive = function (href) {
            // lets trim the leading slash
            var pathName = this.getStrippedPathName();
            var link = Core.trimLeading(href, "#");
            link = link.replace(/^\//, '');
            // strip any query arguments
            var idx = link.indexOf('?');
            if (idx >= 0) {
                link = link.substring(0, idx);
            }
            if (!pathName.length) {
                return link === pathName;
            }
            else {
                return _.startsWith(pathName, link);
            }
        };
        /**
         * Returns true if the given link is active. The link can omit the leading # or / if necessary.
         * The query parameters of the URL are ignored in the comparison.
         * @method isLinkActive
         * @param {String} href
         * @return {Boolean} true if the given link is active
         */
        Workspace.prototype.isLinkPrefixActive = function (href) {
            // lets trim the leading slash
            var pathName = this.getStrippedPathName();
            var link = Core.trimLeading(href, "#");
            link = link.replace(/^\//, '');
            // strip any query arguments
            var idx = link.indexOf('?');
            if (idx >= 0) {
                link = link.substring(0, idx);
            }
            return _.startsWith(pathName, link);
        };
        /**
         * Returns true if the tab query parameter is active or the URL starts with the given path
         * @method isTopTabActive
         * @param {String} path
         * @return {Boolean}
         */
        Workspace.prototype.isTopTabActive = function (path) {
            var tab = this.$location.search()['tab'];
            if (angular.isString(tab)) {
                return _.startsWith(tab, path);
            }
            return this.isLinkActive(path);
        };
        Workspace.prototype.isMainTabActive = function (path) {
            var tab = this.$location.search()['main-tab'];
            if (angular.isString(tab)) {
                return tab === path;
            }
            return false;
        };
        /**
         * Returns the selected mbean name if there is one
         * @method getSelectedMBeanName
         * @return {String}
         */
        Workspace.prototype.getSelectedMBeanName = function () {
            var selection = this.selection;
            if (selection) {
                return selection.objectName;
            }
            return null;
        };
        Workspace.prototype.getSelectedMBean = function () {
            if (this.selection) {
                return this.selection;
            }
            log.debug("Location:", this.$location);
            var nid = this.$location.search()['nid'];
            if (nid && this.tree) {
                var answer = this.tree.findDescendant(function (node) { return nid === node.key; });
                if (!this.selection) {
                    this.selection = answer;
                }
                return answer;
            }
            return null;
        };
        /**
         * Returns true if the path is valid for the current selection
         * @method validSelection
         * @param {String} uri
         * @return {Boolean}
         */
        Workspace.prototype.validSelection = function (uri) {
            // TODO
            return true;
        };
        /**
         * In cases where we have just deleted something we typically want to change
         * the selection to the parent node
         * @method removeAndSelectParentNode
         */
        Workspace.prototype.removeAndSelectParentNode = function () {
            var selection = this.selection;
            if (selection) {
                var parent_1 = selection.parent;
                if (parent_1) {
                    // lets remove the selection from the parent so we don't do any more JMX attribute queries on the children
                    // or include it in table views etc
                    // would be nice to eagerly remove the tree node too?
                    var idx = parent_1.children.indexOf(selection);
                    if (idx < 0) {
                        idx = _.findIndex(parent_1.children, function (n) { return n.key === selection.key; });
                    }
                    if (idx >= 0) {
                        parent_1.children.splice(idx, 1);
                    }
                    this.updateSelectionNode(parent_1);
                }
            }
        };
        Workspace.prototype.selectParentNode = function () {
            var selection = this.selection;
            if (selection) {
                var parent_2 = selection.parent;
                if (parent_2) {
                    this.updateSelectionNode(parent_2);
                }
            }
        };
        /**
         * Returns the view configuration key for the kind of selection
         * for example based on the domain and the node type
         * @method selectionViewConfigKey
         * @return {String}
         */
        Workspace.prototype.selectionViewConfigKey = function () {
            return this.selectionConfigKey("view/");
        };
        /**
         * Returns a configuration key for a node which is usually of the form
         * domain/typeName or for folders with no type, domain/name/folder
         * @method selectionConfigKey
         * @param {String} prefix
         * @return {String}
         */
        Workspace.prototype.selectionConfigKey = function (prefix) {
            if (prefix === void 0) { prefix = ""; }
            var key = null;
            var selection = this.selection;
            if (selection) {
                // lets make a unique string for the kind of select
                key = prefix + selection.domain;
                var typeName = selection.typeName;
                if (!typeName) {
                    typeName = selection.text;
                }
                key += "/" + typeName;
                if (selection.isFolder()) {
                    key += "/folder";
                }
            }
            return key;
        };
        Workspace.prototype.moveIfViewInvalid = function () {
            var workspace = this;
            var uri = Core.trimLeading(this.$location.path(), "/");
            if (this.selection) {
                var key = this.selectionViewConfigKey();
                if (this.validSelection(uri)) {
                    // lets remember the previous selection
                    this.setLocalStorage(key, uri);
                    return false;
                }
                else {
                    log.info("the uri '" + uri + "' is not valid for this selection");
                    // lets look up the previous preferred value for this type
                    var defaultPath_1 = this.getLocalStorage(key);
                    if (!defaultPath_1 || !this.validSelection(defaultPath_1)) {
                        // lets find the first path we can find which is valid
                        defaultPath_1 = null;
                        angular.forEach(this.subLevelTabs, function (tab) {
                            var fn = tab.isValid;
                            if (!defaultPath_1 && tab.href && angular.isDefined(fn) && fn(workspace)) {
                                defaultPath_1 = tab.href();
                            }
                        });
                    }
                    if (!defaultPath_1) {
                        defaultPath_1 = "#/jmx/help";
                    }
                    log.info("moving the URL to be", defaultPath_1);
                    if (_.startsWith(defaultPath_1, "#")) {
                        defaultPath_1 = defaultPath_1.substring(1);
                    }
                    this.$location.path(defaultPath_1);
                    return true;
                }
            }
            else {
                return false;
            }
        };
        Workspace.prototype.updateSelectionNode = function (node) {
            this.selection = node;
            var key = null;
            if (node) {
                key = node.key;
            }
            if (key) {
                var $location = this.$location;
                var q = $location.search();
                q['nid'] = key;
                $location.search(q);
            }
            // Broadcast an event so other parts of the UI can update accordingly
            this.broadcastSelectionNode();
        };
        Workspace.prototype.broadcastSelectionNode = function () {
            if (this.selection) {
                this.$rootScope.$broadcast('jmxTreeClicked', this.selection);
            }
        };
        Workspace.prototype.matchesProperties = function (entries, properties) {
            if (!entries)
                return false;
            for (var key in properties) {
                var value = properties[key];
                if (!value || entries[key] !== value) {
                    return false;
                }
            }
            return true;
        };
        Workspace.prototype.hasInvokeRightsForName = function (objectName) {
            var methods = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                methods[_i - 1] = arguments[_i];
            }
            // allow invoke by default, same as in hasInvokeRight() below
            if (!objectName) {
                return true;
            }
            var mbean = Core.parseMBean(objectName);
            if (!mbean) {
                log.debug("Failed to parse mbean name", objectName);
                return true;
            }
            var mbeanFolder = this.findMBeanWithProperties(mbean.domain, mbean.attributes);
            if (!mbeanFolder) {
                log.debug("Failed to find mbean folder with name", objectName);
                return true;
            }
            return this.hasInvokeRights.apply(this, [mbeanFolder].concat(methods));
        };
        Workspace.prototype.hasInvokeRights = function (selection) {
            var _this = this;
            var methods = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                methods[_i - 1] = arguments[_i];
            }
            if (!selection) {
                return true;
            }
            var selectionFolder = selection;
            var mbean = selectionFolder.mbean;
            if (!mbean) {
                return true;
            }
            var canInvoke = true;
            if (angular.isDefined(mbean.canInvoke)) {
                canInvoke = mbean.canInvoke;
            }
            if (canInvoke && methods && methods.length > 0) {
                var opsByString_1 = mbean['opByString'];
                var ops_1 = mbean['op'];
                if (opsByString_1 && ops_1) {
                    methods.forEach(function (method) {
                        if (!canInvoke) {
                            return;
                        }
                        var op = null;
                        if (_.endsWith(method, ')')) {
                            op = opsByString_1[method];
                        }
                        else {
                            op = ops_1[method];
                        }
                        if (!op) {
                            log.debug("Could not find method:", method, " to check permissions, skipping");
                            return;
                        }
                        canInvoke = _this.resolveCanInvoke(op);
                    });
                }
            }
            return canInvoke;
        };
        Workspace.prototype.resolveCanInvoke = function (op) {
            // for single method
            if (!angular.isArray(op)) {
                return angular.isDefined(op.canInvoke) ? op.canInvoke : true;
            }
            // for overloaded methods
            // returns true only if all overloaded methods can be invoked (i.e. canInvoke=true)
            var cantInvoke = _.find(op, function (o) {
                return angular.isDefined(o.canInvoke) && !o.canInvoke;
            });
            return !angular.isDefined(cantInvoke);
        };
        Workspace.prototype.treeContainsDomainAndProperties = function (domainName, properties) {
            var _this = this;
            if (properties === void 0) { properties = null; }
            var workspace = this;
            var tree = workspace.tree;
            if (!tree) {
                return false;
            }
            var folder = tree.get(domainName);
            if (!folder) {
                return false;
            }
            if (properties) {
                var children = folder.children || [];
                var checkProperties_1 = function (node) {
                    if (!_this.matchesProperties(node.entries, properties)) {
                        if (node.domain === domainName && node.children && node.children.length > 0) {
                            return node.children.some(checkProperties_1);
                        }
                        else {
                            return false;
                        }
                    }
                    else {
                        return true;
                    }
                };
                return children.some(checkProperties_1);
            }
            return true;
        };
        Workspace.prototype.matches = function (folder, properties, propertiesCount) {
            if (!folder) {
                return false;
            }
            var entries = folder.entries;
            if (properties) {
                if (!entries)
                    return false;
                for (var key in properties) {
                    var value = properties[key];
                    if (!value || entries[key] !== value) {
                        return false;
                    }
                }
            }
            if (propertiesCount) {
                return entries && Object.keys(entries).length === propertiesCount;
            }
            return true;
        };
        // only display stuff if we have an mbean with the given properties
        Workspace.prototype.hasDomainAndProperties = function (domainName, properties, propertiesCount) {
            if (properties === void 0) { properties = null; }
            if (propertiesCount === void 0) { propertiesCount = null; }
            var node = this.selection;
            if (node) {
                return this.matches(node, properties, propertiesCount) && node.domain === domainName;
            }
            return false;
        };
        // only display stuff if we have an mbean with the given properties
        Workspace.prototype.findMBeanWithProperties = function (domainName, properties, propertiesCount) {
            if (properties === void 0) { properties = null; }
            if (propertiesCount === void 0) { propertiesCount = null; }
            var tree = this.tree;
            if (tree) {
                return this.findChildMBeanWithProperties(tree.get(domainName), properties, propertiesCount);
            }
            return null;
        };
        Workspace.prototype.findChildMBeanWithProperties = function (folder, properties, propertiesCount) {
            var _this = this;
            if (properties === void 0) { properties = null; }
            if (propertiesCount === void 0) { propertiesCount = null; }
            var workspace = this;
            if (folder) {
                var children = folder.children;
                if (children) {
                    var answer = _.find(children, function (node) { return _this.matches(node, properties, propertiesCount); });
                    if (answer) {
                        return answer;
                    }
                    return _.find(children.map(function (node) { return workspace.findChildMBeanWithProperties(node, properties, propertiesCount); }), function (node) { return node; });
                }
            }
            return null;
        };
        Workspace.prototype.selectionHasDomainAndLastFolderName = function (objectName, lastName) {
            var lastNameLower = (lastName || "").toLowerCase();
            function isName(name) {
                return (name || "").toLowerCase() === lastNameLower;
            }
            var node = this.selection;
            if (node) {
                if (objectName === node.domain) {
                    var folders = node.folderNames;
                    if (folders) {
                        var last = _.last(folders);
                        return (isName(last) || isName(node.text)) && node.isFolder() && !node.objectName;
                    }
                }
            }
            return false;
        };
        Workspace.prototype.selectionHasDomain = function (domainName) {
            var node = this.selection;
            if (node) {
                return domainName === node.domain;
            }
            return false;
        };
        Workspace.prototype.selectionHasDomainAndType = function (objectName, typeName) {
            var node = this.selection;
            if (node) {
                return objectName === node.domain && typeName === node.typeName;
            }
            return false;
        };
        /**
         * Returns true if this workspace has any mbeans at all
         */
        Workspace.prototype.hasMBeans = function () {
            var answer = false;
            var tree = this.tree;
            if (tree) {
                var children = tree.children;
                if (_.isArray(children) && children.length > 0) {
                    answer = true;
                }
            }
            return answer;
        };
        Workspace.prototype.hasFabricMBean = function () {
            return this.hasDomainAndProperties('io.fabric8', { type: 'Fabric' });
        };
        Workspace.prototype.isFabricFolder = function () {
            return this.hasDomainAndProperties('io.fabric8');
        };
        Workspace.prototype.isCamelContext = function () {
            return this.hasDomainAndProperties('org.apache.camel', { type: 'context' });
        };
        Workspace.prototype.isCamelFolder = function () {
            return this.hasDomainAndProperties('org.apache.camel');
        };
        Workspace.prototype.isEndpointsFolder = function () {
            return this.selectionHasDomainAndLastFolderName('org.apache.camel', 'endpoints');
        };
        Workspace.prototype.isEndpoint = function () {
            return this.hasDomainAndProperties('org.apache.camel', { type: 'endpoints' });
        };
        Workspace.prototype.isRoutesFolder = function () {
            return this.selectionHasDomainAndLastFolderName('org.apache.camel', 'routes');
        };
        Workspace.prototype.isRoute = function () {
            return this.hasDomainAndProperties('org.apache.camel', { type: 'routes' });
        };
        Workspace.prototype.isComponentsFolder = function () {
            return this.selectionHasDomainAndLastFolderName('org.apache.camel', 'components');
        };
        Workspace.prototype.isComponent = function () {
            return this.hasDomainAndProperties('org.apache.camel', { type: 'components' });
        };
        Workspace.prototype.isDataformatsFolder = function () {
            return this.selectionHasDomainAndLastFolderName('org.apache.camel', 'dataformats');
        };
        Workspace.prototype.isDataformat = function () {
            return this.hasDomainAndProperties('org.apache.camel', { type: 'dataformats' });
        };
        Workspace.prototype.isOsgiFolder = function () {
            return this.hasDomainAndProperties('osgi.core');
        };
        Workspace.prototype.isKarafFolder = function () {
            return this.hasDomainAndProperties('org.apache.karaf');
        };
        Workspace.prototype.isOsgiCompendiumFolder = function () {
            return this.hasDomainAndProperties('osgi.compendium');
        };
        return Workspace;
    }());
    Jmx.Workspace = Workspace;
})(Jmx || (Jmx = {}));
/// <reference path="../../jmx/ts/workspace.ts"/>
var Diagnostics;
(function (Diagnostics) {
    var DiagnosticsService = /** @class */ (function () {
        DiagnosticsService.$inject = ["workspace", "configManager"];
        function DiagnosticsService(workspace, configManager) {
            'ngInject';
            this.workspace = workspace;
            this.configManager = configManager;
        }
        DiagnosticsService.prototype.getTabs = function () {
            var tabs = [];
            if (this.hasDiagnosticFunction('jfrCheck') && this.configManager.isRouteEnabled('/diagnostics/jfr')) {
                tabs.push(new Nav.HawtioTab('Flight Recorder', '/diagnostics/jfr'));
            }
            if (this.hasDiagnosticFunction('gcClassHistogram') && this.configManager.isRouteEnabled('/diagnostics/heap')) {
                tabs.push(new Nav.HawtioTab('Class Histogram', '/diagnostics/heap'));
            }
            if (this.hasHotspotDiagnostic() && this.configManager.isRouteEnabled('/diagnostics/flags')) {
                tabs.push(new Nav.HawtioTab('Hotspot Diagnostic', '/diagnostics/flags'));
            }
            return tabs;
        };
        DiagnosticsService.prototype.hasHotspotDiagnostic = function () {
            return this.workspace.treeContainsDomainAndProperties('com.sun.management', { type: 'HotSpotDiagnostic' });
        };
        DiagnosticsService.prototype.hasDiagnosticFunction = function (operation) {
            var diagnostics = this.workspace.findMBeanWithProperties('com.sun.management', { type: 'DiagnosticCommand' });
            return diagnostics && diagnostics.mbean && diagnostics.mbean.op && diagnostics.mbean.op[operation];
        };
        DiagnosticsService.prototype.findMyPid = function (title) {
            //snatch PID from window title
            var regex = /pid:(\d+)/g;
            var pid = regex.exec(title);
            if (pid && pid[1]) {
                return pid[1];
            }
            else {
                return null;
            }
        };
        return DiagnosticsService;
    }());
    Diagnostics.DiagnosticsService = DiagnosticsService;
})(Diagnostics || (Diagnostics = {}));
/// <reference path="./diagnostics.service.ts"/>
var Diagnostics;
(function (Diagnostics) {
    DiagnosticsHeapController.$inject = ["$scope", "jolokia", "diagnosticsService"];
    function DiagnosticsHeapController($scope, jolokia, diagnosticsService) {
        'ngInject';
        var instanceCounts;
        var byteCounts;
        $scope.items = [];
        $scope.loading = false;
        $scope.lastLoaded = null;
        $scope.toolbarConfig = {
            actionsConfig: {
                actionsInclude: true
            },
            isTableView: true
        };
        $scope.tableConfig = {
            selectionMatchProp: 'name',
            showCheckboxes: false
        };
        $scope.tableDtOptions = {
            order: [[1, "desc"]]
        };
        $scope.pageConfig = {
            pageSize: 20
        };
        $scope.tableColumns = [
            {
                header: 'Class Name',
                itemField: 'name'
            },
            {
                header: 'Bytes',
                itemField: 'bytes'
            },
            {
                header: 'Bytes Delta',
                itemField: 'deltaBytes'
            },
            {
                header: 'Instances',
                itemField: 'count'
            },
            {
                header: 'Instances Delta',
                itemField: 'deltaCount'
            }
        ];
        $scope.loadClassStats = function () {
            $scope.loading = true;
            Core.$apply($scope);
            jolokia.request({
                type: 'exec',
                mbean: 'com.sun.management:type=DiagnosticCommand',
                operation: 'gcClassHistogram([Ljava.lang.String;)',
                arguments: ['']
            }, {
                success: render,
                error: function (response) {
                    Diagnostics.log.error('Failed to get class histogram: ' + response.error);
                    $scope.loading = false;
                    Core.$apply($scope);
                }
            });
        };
        function render(response) {
            var classHistogram = response.value;
            var lines = response.value.split('\n');
            var parsed = [];
            var classCounts = {};
            var bytesCounts = {};
            for (var i = 0; i < lines.length; i++) {
                var values = lines[i].match(/\s*(\d+):\s*(\d+)\s*(\d+)\s*(\S+)\s*/);
                if (values && values.length >= 5) {
                    var className = translateJniName(values[4]);
                    var count = values[2];
                    var bytes = values[3];
                    var entry = {
                        count: count,
                        bytes: bytes,
                        name: className,
                        deltaCount: findDelta(instanceCounts, className, count),
                        deltaBytes: findDelta(byteCounts, className, bytes)
                    };
                    parsed.push(entry);
                    classCounts[className] = count;
                    bytesCounts[className] = bytes;
                }
            }
            $scope.items = parsed;
            $scope.lastLoaded = Date.now();
            instanceCounts = classCounts;
            byteCounts = bytesCounts;
            Core.$apply($scope);
            setTimeout(function () {
                $scope.loading = false;
                Core.$apply($scope);
            });
        }
        function findDelta(oldCounts, className, newValue) {
            if (!oldCounts) {
                return '';
            }
            var oldValue = oldCounts[className];
            if (oldValue) {
                return oldValue - newValue;
            }
            else {
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
            }
            else {
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
    }
    Diagnostics.DiagnosticsHeapController = DiagnosticsHeapController;
})(Diagnostics || (Diagnostics = {}));
/// <reference path="diagnostics.service.ts"/>
var Diagnostics;
(function (Diagnostics) {
    DiagnosticsJfrController.$inject = ["$scope", "$location", "workspace", "jolokia", "localStorage", "diagnosticsService"];
    function splitResponse(response) {
        return response.match(/Dumped recording "(.+)",(.+) written to:\r?\n\r?\n(.+)/);
    }
    function buildStartParams(jfrSettings) {
        var params = [];
        if (jfrSettings.name && jfrSettings.name.length > 0) {
            params.push('name="' + jfrSettings.name + '"');
        }
        if (jfrSettings.filename && jfrSettings.filename.length > 0) {
            params.push('filename="' + jfrSettings.filename + '"');
        }
        params.push('dumponexit=' + jfrSettings.dumpOnExit);
        if (jfrSettings.limitType != 'unlimited') {
            params.push(jfrSettings.limitType + '=' + jfrSettings.limitValue);
        }
        return params;
    }
    function buildDumpParams(jfrSettings) {
        return [
            'filename="' + jfrSettings.filename + '"',
            'name="' + jfrSettings.name + '"'
        ];
    }
    function DiagnosticsJfrController($scope, $location, workspace, jolokia, localStorage, diagnosticsService) {
        'ngInject';
        $scope.forms = {};
        $scope.pid = diagnosticsService.findMyPid($scope.pageTitle);
        $scope.recordings = [];
        $scope.settingsVisible = false;
        $scope.jfrSettings = {
            limitType: 'unlimited',
            limitValue: '',
            name: '',
            dumpOnExit: true,
            recordingNumber: '',
            filename: ''
        };
        $scope.formConfig = {
            properties: {
                name: {
                    type: "java.lang.String",
                    tooltip: "Name for this connection",
                    "input-attributes": {
                        "placeholder": "Recording name (optional)..."
                    }
                },
                limitType: {
                    type: "java.lang.String",
                    tooltip: "Duration if any",
                    enum: ['unlimited', 'duration', 'maxsize']
                },
                limitValue: {
                    type: "java.lang.String",
                    tooltip: "Limit value. duration: [val]s/m/h, maxsize: [val]kB/MB/GB",
                    required: false,
                    "input-attributes": {
                        "ng-show": "jfrSettings.limitType != 'unlimited'"
                    }
                },
                dumpOnExit: {
                    type: "java.lang.Boolean",
                    tooltip: "Automatically dump recording on VM exit"
                },
                filename: {
                    type: "java.lang.String",
                    tooltip: "Filename",
                    "input-attributes": {
                        "placeholder": "Specify file name *.jfr (optional)..."
                    }
                },
            }
        };
        $scope.unlock = function () {
            executeDiagnosticFunction('vmUnlockCommercialFeatures()', 'VM.unlock_commercial_features', [], null);
        };
        $scope.startRecording = function () {
            if ($scope.isRecording) {
                $scope.jfrSettings.name = null;
                $scope.jfrSettings.filename = null;
            }
            executeDiagnosticFunction('jfrStart([Ljava.lang.String;)', 'JFR.start', [buildStartParams($scope.jfrSettings)], null);
        };
        $scope.dumpRecording = function () {
            executeDiagnosticFunction('jfrDump([Ljava.lang.String;)', 'JFR.dump', [buildDumpParams($scope.jfrSettings)], function (response) {
                var matches = splitResponse(response);
                Diagnostics.log.debug("response: " + response
                    + " split: " + matches + "split2: "
                    + matches);
                if (matches) {
                    var recordingData = {
                        number: matches[1],
                        size: matches[2],
                        file: matches[3],
                        time: Date.now()
                    };
                    Diagnostics.log.debug("data: "
                        + recordingData);
                    addRecording(recordingData, $scope.recordings);
                }
            });
        };
        $scope.closeMessageForGood = function (key) {
            localStorage[key] = "false";
        };
        $scope.isMessageVisible = function (key) {
            return localStorage[key] !== "false";
        };
        $scope.stopRecording = function () {
            var name = $scope.jfrSettings.name;
            $scope.jfrSettings.filename = '';
            $scope.jfrSettings.name = '';
            executeDiagnosticFunction('jfrStop([Ljava.lang.String;)', 'JFR.stop', ['name="' + name + '"'], null);
        };
        $scope.toggleSettingsVisible = function () {
            $scope.settingsVisible = !$scope.settingsVisible;
            Core.$apply($scope);
        };
        Core.register(jolokia, $scope, [{
                type: 'exec',
                operation: 'jfrCheck([Ljava.lang.String;)',
                mbean: 'com.sun.management:type=DiagnosticCommand',
                arguments: ['']
            }], Core.onSuccess(render));
        function render(response) {
            var statusString = response.value;
            $scope.jfrEnabled = statusString.indexOf("not enabled") == -1;
            $scope.isRunning = statusString.indexOf("(running)") > -1;
            $scope.isRecording = $scope.isRunning || statusString.indexOf("(stopped)") > -1;
            if ((statusString.indexOf("Use JFR.") > -1 || statusString
                .indexOf("Use VM.") > -1)
                && $scope.pid) {
                statusString = statusString.replace("Use ", "Use command line: jcmd " + $scope.pid + " ");
            }
            $scope.jfrStatus = statusString;
            if ($scope.isRecording) {
                var regex = /recording=(\d+) name="(.+?)"/g;
                if ($scope.isRunning) {
                    regex = /recording=(\d+) name="(.+?)".+?\(running\)/g;
                }
                var parsed = regex.exec(statusString);
                $scope.jfrSettings.recordingNumber = parsed[1];
                $scope.jfrSettings.name = parsed[2];
                var parsedFilename = statusString.match(/filename="(.+)"/);
                if (parsedFilename && parsedFilename[1]) {
                    $scope.jfrSettings.filename = parsedFilename[1];
                }
                else {
                    $scope.jfrSettings.filename = 'recording' + parsed[1] + '.jfr';
                }
            }
            Core.$apply($scope);
        }
        function addRecording(recording, recordings) {
            for (var i = 0; i < recordings.length; i++) {
                if (recordings[i].file === recording.file) {
                    recordings[i] = recording;
                    return;
                }
            }
            recordings.push(recording);
        }
        function showArguments(arguments) {
            var result = '';
            var first = true;
            for (var i = 0; i < arguments.length; i++) {
                if (first) {
                    first = false;
                }
                else {
                    result += ',';
                }
                result += arguments[i];
            }
            return result;
        }
        function executeDiagnosticFunction(operation, jcmd, arguments, callback) {
            Diagnostics.log.debug(Date.now() + " Invoking operation "
                + operation + " with arguments" + arguments + " settings: " + JSON.stringify($scope.jfrSettings));
            $scope.jcmd = 'jcmd ' + $scope.pid + ' ' + jcmd + ' ' + showArguments(arguments);
            jolokia.request([{
                    type: "exec",
                    operation: operation,
                    mbean: 'com.sun.management:type=DiagnosticCommand',
                    arguments: arguments
                }, {
                    type: 'exec',
                    operation: 'jfrCheck([Ljava.lang.String;)',
                    mbean: 'com.sun.management:type=DiagnosticCommand',
                    arguments: ['']
                }], Core.onSuccess(function (response) {
                Diagnostics.log.debug("Diagnostic Operation "
                    + operation + " was successful" + response.value);
                if (response.request.operation.indexOf("jfrCheck") > -1) {
                    render(response);
                }
                else {
                    if (callback) {
                        callback(response.value);
                    }
                    Core.$apply($scope);
                }
            }, {
                error: function (response) {
                    Diagnostics.log.warn("Diagnostic Operation "
                        + operation + " failed", response);
                }
            }));
        }
    }
    Diagnostics.DiagnosticsJfrController = DiagnosticsJfrController;
})(Diagnostics || (Diagnostics = {}));
/// <reference path="diagnostics.service.ts"/>
var Diagnostics;
(function (Diagnostics) {
    var DiagnosticsController = /** @class */ (function () {
        DiagnosticsController.$inject = ["$scope", "$location", "workspace", "diagnosticsService"];
        function DiagnosticsController($scope, $location, workspace, diagnosticsService) {
            'ngInject';
            this.$scope = $scope;
            this.$location = $location;
            this.workspace = workspace;
            this.diagnosticsService = diagnosticsService;
        }
        DiagnosticsController.prototype.$onInit = function () {
            var _this = this;
            if (this.workspace.tree.children.length > 0) {
                this.tabs = this.diagnosticsService.getTabs();
            }
            else {
                this.$scope.$on('jmxTreeUpdated', function () {
                    _this.tabs = _this.diagnosticsService.getTabs();
                });
            }
        };
        DiagnosticsController.prototype.goto = function (tab) {
            this.$location.path(tab.path);
        };
        return DiagnosticsController;
    }());
    Diagnostics.DiagnosticsController = DiagnosticsController;
    Diagnostics.diagnosticsComponent = {
        template: "\n      <div class=\"nav-tabs-main\">\n        <hawtio-tabs tabs=\"$ctrl.tabs\" on-change=\"$ctrl.goto(tab)\"></hawtio-tabs>\n        <div class=\"contents\" ng-view></div>\n      </div>\n    ",
        controller: DiagnosticsController
    };
})(Diagnostics || (Diagnostics = {}));
/// <reference path="../../jmx/ts/workspace.ts"/>
/// <reference path="diagnostics.service.ts"/>
var Diagnostics;
(function (Diagnostics) {
    configureRoutes.$inject = ["configManager"];
    configureDiagnostics.$inject = ["$rootScope", "$templateCache", "viewRegistry", "helpRegistry", "workspace", "diagnosticsService"];
    function configureRoutes(configManager) {
        'ngInject';
        configManager
            .addRoute('/diagnostics/jfr', { templateUrl: 'plugins/diagnostics/html/jfr.html' })
            .addRoute('/diagnostics/heap', { templateUrl: 'plugins/diagnostics/html/heap.html' })
            .addRoute('/diagnostics/flags', { templateUrl: 'plugins/diagnostics/html/flags.html' });
    }
    Diagnostics.configureRoutes = configureRoutes;
    function configureDiagnostics($rootScope, $templateCache, viewRegistry, helpRegistry, workspace, diagnosticsService) {
        'ngInject';
        var templateCacheKey = 'diagnostics.html';
        $templateCache.put(templateCacheKey, '<diagnostics></diagnostics>');
        viewRegistry['diagnostics'] = templateCacheKey;
        helpRegistry.addUserDoc('diagnostics', 'plugins/diagnostics/doc/help.md');
        var unsubscribe = $rootScope.$on('jmxTreeUpdated', function () {
            unsubscribe();
            var tabs = diagnosticsService.getTabs();
            workspace.topLevelTabs.push({
                id: "diagnostics",
                content: "Diagnostics",
                title: "JVM Diagnostics",
                isValid: function () { return tabs.length > 0; },
                href: function () { return tabs[0].path; },
                isActive: function (workspace) { return workspace.isLinkActive("diagnostics"); }
            });
        });
    }
    Diagnostics.configureDiagnostics = configureDiagnostics;
})(Diagnostics || (Diagnostics = {}));
/// <reference path="diagnostics.config.ts"/>
/// <reference path="diagnostics.component.ts"/>
/// <reference path="diagnostics-jfr.controller.ts"/>
/// <reference path="diagnostics-heap.controller.ts"/>
/// <reference path="diagnostics-flags.controller.ts"/>
/// <reference path="diagnostics.service.ts"/>
var Diagnostics;
(function (Diagnostics) {
    var pluginName = 'hawtio-diagnostics';
    Diagnostics.log = Logger.get(pluginName);
    Diagnostics._module = angular
        .module(pluginName, [])
        .config(Diagnostics.configureRoutes)
        .run(Diagnostics.configureDiagnostics)
        .component("diagnostics", Diagnostics.diagnosticsComponent)
        .controller("DiagnosticsJfrController", Diagnostics.DiagnosticsJfrController)
        .controller("DiagnosticsHeapController", Diagnostics.DiagnosticsHeapController)
        .controller("DiagnosticsFlagsController", Diagnostics.DiagnosticsFlagsController)
        .service('diagnosticsService', Diagnostics.DiagnosticsService);
    hawtioPluginLoader.addModule(pluginName);
})(Diagnostics || (Diagnostics = {}));
var Jmx;
(function (Jmx) {
    function createDashboardLink(widgetType, widget) {
        var href = "#" + widgetType.route;
        var routeParams = angular.toJson(widget);
        var title = widget.title;
        var size = angular.toJson({
            size_x: widgetType.size_x,
            size_y: widgetType.size_y
        });
        return "/dashboard/add?tab=dashboard" +
            "&href=" + encodeURIComponent(href) +
            "&size=" + encodeURIComponent(size) +
            "&title=" + encodeURIComponent(title) +
            "&routeParams=" + encodeURIComponent(routeParams);
    }
    Jmx.createDashboardLink = createDashboardLink;
    function getWidgetType(widget) {
        return _.find(Jmx.jmxWidgetTypes, function (type) { return type.type === widget.type; });
    }
    Jmx.getWidgetType = getWidgetType;
    Jmx.jmxWidgetTypes = [
        {
            type: "donut",
            icon: "fa fa-pie-chart",
            route: "/jmx/widget/donut",
            size_x: 2,
            size_y: 2,
            title: "Add Donut chart to Dashboard"
        },
        {
            type: "area",
            icon: "fa fa-bar-chart",
            route: "/jmx/widget/area",
            size_x: 4,
            size_y: 2,
            title: "Add Area chart to Dashboard"
        }
    ];
    Jmx.jmxWidgets = [
        {
            type: "donut",
            title: "Java Heap Memory",
            mbean: "java.lang:type=Memory",
            attribute: "HeapMemoryUsage",
            total: "Max",
            terms: "Used",
            remaining: "Free"
        },
        {
            type: "donut",
            title: "Java Non Heap Memory",
            mbean: "java.lang:type=Memory",
            attribute: "NonHeapMemoryUsage",
            total: "Max",
            terms: "Used",
            remaining: "Free"
        },
        {
            type: "donut",
            title: "File Descriptor Usage",
            mbean: "java.lang:type=OperatingSystem",
            total: "MaxFileDescriptorCount",
            terms: "OpenFileDescriptorCount",
            remaining: "Free"
        },
        {
            type: "donut",
            title: "Loaded Classes",
            mbean: "java.lang:type=ClassLoading",
            total: "TotalLoadedClassCount",
            terms: "LoadedClassCount,UnloadedClassCount",
            remaining: "-"
        },
        {
            type: "donut",
            title: "Swap Size",
            mbean: "java.lang:type=OperatingSystem",
            total: "TotalSwapSpaceSize",
            terms: "FreeSwapSpaceSize",
            remaining: "Used Swap"
        },
        {
            type: "area",
            title: "Process CPU Time",
            mbean: "java.lang:type=OperatingSystem",
            attribute: "ProcessCpuTime"
        },
        {
            type: "area",
            title: "Process CPU Load",
            mbean: "java.lang:type=OperatingSystem",
            attribute: "ProcessCpuLoad"
        },
        {
            type: "area",
            title: "System CPU Load",
            mbean: "java.lang:type=OperatingSystem",
            attribute: "SystemCpuLoad"
        },
        {
            type: "area",
            title: "System CPU Time",
            mbean: "java.lang:type=OperatingSystem",
            attribute: "SystemCpuTime"
        }
    ];
})(Jmx || (Jmx = {}));
var Jmx;
(function (Jmx) {
    var HeaderController = /** @class */ (function () {
        HeaderController.$inject = ["$scope"];
        function HeaderController($scope) {
            'ngInject';
            var _this = this;
            $scope.$on('jmxTreeClicked', function (event, selectedNode) {
                _this.title = selectedNode.text;
                _this.objectName = selectedNode.objectName;
            });
        }
        return HeaderController;
    }());
    Jmx.HeaderController = HeaderController;
    Jmx.headerComponent = {
        template: "\n      <div class=\"jmx-header\">\n        <h1>\n          {{$ctrl.title}}\n          <small class=\"text-muted\">{{$ctrl.objectName}}</small>\n        </h1>\n      </div>\n      ",
        controller: HeaderController
    };
})(Jmx || (Jmx = {}));
var Jmx;
(function (Jmx) {
    var NavigationController = /** @class */ (function () {
        NavigationController.$inject = ["$location"];
        function NavigationController($location) {
            'ngInject';
            this.$location = $location;
            this.tabs = [
                new Nav.HawtioTab('Attributes', '/jmx/attributes'),
                new Nav.HawtioTab('Operations', '/jmx/operations'),
                new Nav.HawtioTab('Chart', '/jmx/charts')
            ];
        }
        NavigationController.prototype.goto = function (tab) {
            this.$location.path(tab.path);
        };
        return NavigationController;
    }());
    Jmx.NavigationController = NavigationController;
    Jmx.navigationComponent = {
        template: '<hawtio-tabs tabs="$ctrl.tabs" on-change="$ctrl.goto(tab)"></hawtio-tabs>',
        controller: NavigationController
    };
})(Jmx || (Jmx = {}));
/// <reference path="header.component.ts"/>
/// <reference path="navigation.component.ts"/>
var Jmx;
(function (Jmx) {
    Jmx.commonModule = angular
        .module('hawtio-jmx-common', [])
        .component('jmxHeader', Jmx.headerComponent)
        .component('jmxNavigation', Jmx.navigationComponent)
        .name;
})(Jmx || (Jmx = {}));
/// <reference path="../jmxPlugin.ts"/>
var Jmx;
(function (Jmx) {
    AttributesController.$inject = ["$scope", "$element", "$location", "workspace", "jmxWidgets", "jmxWidgetTypes", "$templateCache", "localStorage", "$browser", "$timeout", "$uibModal", "attributesService"];
    var PROPERTIES_COLUMN_DEFS = [
        {
            field: 'name',
            displayName: 'Attribute',
            cellTemplate: "\n        <div class=\"ngCellText\" title=\"{{row.entity.attrDesc}}\" data-placement=\"bottom\">\n          <div ng-show=\"!inDashboard\" class=\"inline\" compile=\"row.entity.getDashboardWidgets()\"></div>\n          <a href=\"\" ng-click=\"row.entity.onViewAttribute()\">{{row.entity.name}}</a>\n        </div>\n      "
        },
        {
            field: 'value',
            displayName: 'Value',
            cellTemplate: "\n        <div class=\"ngCellText mouse-pointer\"\n             ng-click=\"row.entity.onViewAttribute()\"\n             title=\"{{row.entity.tooltip}}\"\n             ng-bind-html=\"row.entity.summary\"></div>\n      "
        }
    ];
    var FOLDERS_COLUMN_DEFS = [
        {
            displayName: 'Name',
            cellTemplate: "\n        <div class=\"ngCellText\">\n          <a href=\"\" ng-click=\"row.entity.gotoFolder(row)\">\n            <i class=\"{{row.entity.folderIconClass(row)}}\"></i> {{row.getProperty(\"title\")}}\n          </a>\n        </div>\n      "
        }
    ];
    function AttributesController($scope, $element, $location, workspace, jmxWidgets, jmxWidgetTypes, $templateCache, localStorage, $browser, $timeout, $uibModal, attributesService) {
        'ngInject';
        var modalInstance = null;
        $scope.searchText = '';
        $scope.nid = 'empty';
        $scope.selectedItems = [];
        $scope.lastKey = null;
        $scope.attributesInfoCache = {};
        $scope.entity = {};
        $scope.attributeSchema = {};
        $scope.gridData = [];
        $scope.attributes = "";
        $scope.$watch('gridData.length', function (newValue, oldValue) {
            if (newValue !== oldValue) {
                if (newValue > 0) {
                    $scope.attributes = $templateCache.get('gridTemplate');
                }
                else {
                    $scope.attributes = "";
                }
            }
        });
        var ATTRIBUTE_SCHEMA_BASIC = {
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
                    formTemplate: "\n            <div class=\"hawtio-clipboard-container\">\n              <button hawtio-clipboard=\"#attribute-jolokia-url\" class=\"btn btn-default\">\n                <i class=\"fa fa-clipboard\" aria-hidden=\"true\"></i>\n              </button>\n              <input type=\"text\" id=\"attribute-jolokia-url\" class='form-control' style=\"padding-right: 26px\" value=\"{{entity.jolokia}}\" readonly='true'>\n            </div>\n          "
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
            columnDefs: PROPERTIES_COLUMN_DEFS
        };
        $scope.$watch(function (scope) { return scope.gridOptions.selectedItems.map(function (item) { return item.key || item; }); }, function (newValue, oldValue) {
            if (newValue !== oldValue) {
                Jmx.log.debug("Selected items:", newValue);
                $scope.selectedItems = newValue;
            }
        }, true);
        // clear selection if we clicked the jmx nav bar button
        // otherwise we may show data from Camel/ActiveMQ or other plugins that
        // reuse the JMX plugin for showing tables (#884)
        var currentUrl = $location.url();
        if (_.endsWith(currentUrl, "/jmx/attributes")) {
            Jmx.log.debug("Reset selection in JMX plugin");
            workspace.selection = null;
            $scope.lastKey = null;
        }
        $scope.nid = $location.search()['nid'];
        Jmx.log.debug("attribute - nid: ", $scope.nid);
        var updateTable = _.debounce(updateTableContents, 50, { leading: false, trailing: true });
        $scope.$on('jmxTreeUpdated', updateTable);
        $scope.$watch('gridOptions.filterOptions.filterText', function (newValue, oldValue) {
            if (newValue !== oldValue) {
                updateTable();
            }
        });
        updateTable();
        function onViewAttribute(row) {
            if (!row.summary) {
                return;
            }
            if (row.rw) {
                // for writable attribute, we need to check RBAC
                attributesService.canInvoke(workspace.getSelectedMBeanName(), row.key, row.type)
                    .then(function (canInvoke) { return showAttributeDialog(row, canInvoke); });
            }
            else {
                showAttributeDialog(row, false);
            }
        }
        function showAttributeDialog(row, rw) {
            // create entity and populate it with data from the selected row
            $scope.entity = {
                key: row.key,
                description: row.attrDesc,
                type: row.type,
                jolokia: attributesService.buildJolokiaUrl(workspace.getSelectedMBeanName(), row.key),
                rw: rw
            };
            var rows = numberOfRows(row);
            var readOnly = !$scope.entity.rw;
            if (readOnly) {
                // if the value is empty its a &nbsp; as we need this for the table to allow us to click on the empty row
                if (row.summary === '&nbsp;') {
                    $scope.entity["attrValueView"] = '';
                }
                else {
                    $scope.entity["attrValueView"] = row.summary;
                }
                initAttributeSchemaView($scope, rows);
            }
            else {
                // if the value is empty its a &nbsp; as we need this for the table to allow us to click on the empty row
                if (row.summary === '&nbsp;') {
                    $scope.entity["attrValueEdit"] = '';
                }
                else {
                    $scope.entity["attrValueEdit"] = row.summary;
                }
                initAttributeSchemaEdit($scope, rows);
            }
            modalInstance = $uibModal.open({
                templateUrl: 'attributeModal.html',
                scope: $scope,
                size: 'lg'
            })
                .result.then(function () {
                // update the attribute on the mbean
                var mbean = workspace.getSelectedMBeanName();
                if (mbean) {
                    var value = $scope.entity["attrValueEdit"];
                    var key = $scope.entity["key"];
                    attributesService.update(mbean, key, value);
                }
                $scope.entity = {};
            })
                .catch(function () {
                $scope.entity = {};
            });
        }
        function numberOfRows(row) {
            // calculate a textare with X number of rows that usually fit the value to display
            var len = row.summary.length;
            var rows = (len / 40) + 1;
            if (rows > 10) {
                // cap at most 10 rows to not make the dialog too large
                rows = 10;
            }
            return rows;
        }
        function initAttributeSchemaView($scope, rows) {
            // clone from the basic schema to the new schema we create on-the-fly
            // this is needed as the dialog have problems if reusing the schema, and changing the schema afterwards
            // so its safer to create a new schema according to our needs
            $scope.attributeSchemaView = {};
            for (var key in ATTRIBUTE_SCHEMA_BASIC) {
                $scope.attributeSchemaView[key] = ATTRIBUTE_SCHEMA_BASIC[key];
            }
            // and add the new attrValue which is dynamic computed
            $scope.attributeSchemaView.properties.attrValueView = {
                description: 'Value',
                label: "Value",
                type: 'string',
                formTemplate: "<textarea id=\"attribute-value\" class='form-control' style=\"overflow-y: scroll\" rows='" + rows + "' readonly='true'></textarea>\n        "
            };
            // just to be safe, then delete not needed part of the schema
            if ($scope.attributeSchemaView) {
                delete $scope.attributeSchemaView.properties.attrValueEdit;
            }
        }
        function initAttributeSchemaEdit($scope, rows) {
            // clone from the basic schema to the new schema we create on-the-fly
            // this is needed as the dialog have problems if reusing the schema, and changing the schema afterwards
            // so its safer to create a new schema according to our needs
            $scope.attributeSchemaEdit = {};
            for (var key in ATTRIBUTE_SCHEMA_BASIC) {
                $scope.attributeSchemaEdit[key] = ATTRIBUTE_SCHEMA_BASIC[key];
            }
            // and add the new attrValue which is dynamic computed
            $scope.attributeSchemaEdit.properties.attrValueEdit = {
                description: 'Value',
                label: "Value",
                type: 'string',
                formTemplate: "<textarea id=\"attribute-value\" class='form-control' style=\"overflow-y: scroll\" rows='" + rows + "'></textarea>"
            };
            // just to be safe, then delete not needed part of the schema
            if ($scope.attributeSchemaEdit) {
                delete $scope.attributeSchemaEdit.properties.attrValueView;
            }
        }
        function operationComplete() {
            updateTableContents();
        }
        function updateTableContents() {
            // lets clear any previous queries just in case!
            attributesService.unregisterJolokia($scope);
            $scope.gridData = [];
            $scope.mbeanIndex = null;
            var mbean = workspace.getSelectedMBeanName();
            var node = workspace.selection;
            if (_.isNil(node) || node.key !== $scope.lastKey) {
                // cache attributes info, so we know if the attribute is read-only or read-write, and also the attribute description
                $scope.attributesInfoCache = null;
                if (mbean == null) {
                    // in case of refresh
                    var _key = $location.search()['nid'];
                    var _node = workspace.keyToNodeMap[_key];
                    if (_node) {
                        mbean = _node.objectName;
                    }
                }
                if (mbean) {
                    attributesService.listMBean(mbean, Core.onSuccess(function (response) {
                        $scope.attributesInfoCache = response.value;
                        Jmx.log.debug("Updated attributes info cache for mbean", mbean, $scope.attributesInfoCache);
                    }));
                }
            }
            var request = null;
            if (mbean) {
                request = { type: 'read', mbean: mbean };
                if (_.isNil(node) || node.key !== $scope.lastKey) {
                    $scope.gridOptions.columnDefs = PROPERTIES_COLUMN_DEFS;
                    $scope.gridOptions.enableRowClickSelection = false;
                }
            }
            else if (node) {
                if (node.key !== $scope.lastKey) {
                    $scope.gridOptions.columnDefs = [];
                    $scope.gridOptions.enableRowClickSelection = true;
                }
                // lets query each child's details
                var children = node.children;
                if (children) {
                    var childNodes = children.map(function (child) { return child.objectName; });
                    var mbeans = childNodes.filter(function (mbean) { return FilterHelpers.search(mbean, $scope.gridOptions.filterOptions.filterText); });
                    var maxFolderSize = localStorage["jmxMaxFolderSize"];
                    mbeans = mbeans.slice(0, maxFolderSize);
                    if (mbeans) {
                        var typeNames = Jmx.getUniqueTypeNames(children);
                        if (typeNames.length <= 1) {
                            var query = mbeans.map(function (mbean) {
                                return { type: "READ", mbean: mbean, ignoreErrors: true };
                            });
                            if (query.length > 0) {
                                request = query;
                                // deal with multiple results
                                $scope.mbeanIndex = {};
                                $scope.mbeanRowCounter = 0;
                                $scope.mbeanCount = mbeans.length;
                            }
                        }
                        else {
                            Jmx.log.debug("Too many type names ", typeNames);
                        }
                    }
                }
            }
            if (request) {
                $scope.request = request;
                attributesService.registerJolokia($scope, request, Core.onSuccess(render));
            }
            else if (node) {
                if (node.key !== $scope.lastKey) {
                    $scope.gridOptions.columnDefs = FOLDERS_COLUMN_DEFS;
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
                        $scope.selectedIndices = $scope.selectedItems.map(function (item) { return $scope.gridData.indexOf(item); });
                        $scope.gridData = [];
                        if (!$scope.gridOptions.columnDefs.length) {
                            // lets update the column definitions based on any configured defaults
                            var key = workspace.selectionConfigKey();
                            $scope.gridOptions.gridKey = key;
                            $scope.gridOptions.onClickRowHandlers = workspace.onClickRowHandlers;
                            var defaultDefs_1 = _.clone(workspace.attributeColumnDefs[key]) || [];
                            var defaultSize_1 = defaultDefs_1.length;
                            var map_1 = {};
                            angular.forEach(defaultDefs_1, function (value, key) {
                                var field = value.field;
                                if (field) {
                                    map_1[field] = value;
                                }
                            });
                            var extraDefs_1 = [];
                            _.forEach(data, function (value, key) {
                                if (includePropertyValue(key, value)) {
                                    if (!map_1[key]) {
                                        extraDefs_1.push({
                                            field: key,
                                            displayName: key === '_id' ? 'Object name' : Core.humanizeValue(key),
                                            visible: defaultSize_1 === 0
                                        });
                                    }
                                }
                            });
                            // the additional columns (which are not pre-configured), should be sorted
                            // so the column menu has a nice sorted list instead of random ordering
                            extraDefs_1 = extraDefs_1.sort(function (def, def2) {
                                // make sure _id is last
                                if (_.startsWith(def.field, '_')) {
                                    return 1;
                                }
                                else if (_.startsWith(def2.field, '_')) {
                                    return -1;
                                }
                                return def.field.localeCompare(def2.field);
                            });
                            extraDefs_1.forEach(function (e) { return defaultDefs_1.push(e); });
                            if (extraDefs_1.length > 0) {
                                $scope.hasExtraColumns = true;
                            }
                            $scope.gridOptions.columnDefs = defaultDefs_1;
                            $scope.gridOptions.enableRowClickSelection = true;
                        }
                    }
                    // mask attribute read error
                    _.forEach(data, function (value, key) {
                        if (includePropertyValue(key, value)) {
                            data[key] = maskReadError(value);
                        }
                    });
                    // assume 1 row of data per mbean
                    $scope.gridData[idx] = data;
                    addHandlerFunctions($scope.gridData);
                    var count = $scope.mbeanCount;
                    if (!count || idx + 1 >= count) {
                        // only cause a refresh on the last row
                        var newSelections = $scope.selectedIndices.map(function (idx) { return $scope.gridData[idx]; }).filter(function (row) { return row; });
                        $scope.selectedItems.splice(0, $scope.selectedItems.length);
                        $scope.selectedItems.push.apply($scope.selectedItems, newSelections);
                        Core.$apply($scope);
                    }
                    // if the last row, then fire an event
                }
                else {
                    Jmx.log.info("No mbean name in request", JSON.stringify(response.request));
                }
            }
            else {
                $scope.gridOptions.columnDefs = PROPERTIES_COLUMN_DEFS;
                $scope.gridOptions.enableRowClickSelection = false;
                var showAllAttributes_1 = true;
                if (_.isObject(data)) {
                    var properties_1 = [];
                    _.forEach(data, function (value, key) {
                        if (showAllAttributes_1 || includePropertyValue(key, value)) {
                            // always skip keys which start with _
                            if (!_.startsWith(key, "_")) {
                                // lets format the ObjectName nicely dealing with objects with
                                // nested object names or arrays of object names
                                if (key === "ObjectName") {
                                    value = unwrapObjectName(value);
                                }
                                // lets unwrap any arrays of object names
                                if (_.isArray(value)) {
                                    value = value.map(function (v) { return unwrapObjectName(v); });
                                }
                                // the value must be string as the sorting/filtering of the table relies on that
                                var type = lookupAttributeType(key);
                                var data_1 = {
                                    key: key,
                                    name: Core.humanizeValue(key),
                                    value: maskReadError(Core.safeNullAsString(value, type))
                                };
                                generateSummaryAndDetail(key, data_1);
                                properties_1.push(data_1);
                            }
                        }
                    });
                    if (!_.some(properties_1, function (p) {
                        return p['key'] === 'ObjectName';
                    })) {
                        var objectName = {
                            key: "ObjectName",
                            name: "Object Name",
                            value: mbean
                        };
                        generateSummaryAndDetail(objectName.key, objectName);
                        properties_1.push(objectName);
                    }
                    properties_1 = _.sortBy(properties_1, 'name');
                    $scope.selectedItems = [data];
                    data = properties_1;
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
            var forbidden = /^ERROR: Reading attribute .+ \(class java\.lang\.SecurityException\)$/;
            var unsupported = /^ERROR: java\.lang\.UnsupportedOperationException: .+ \(class javax\.management\.RuntimeMBeanException\)$/;
            if (value.match(forbidden)) {
                return "**********";
            }
            else if (value.match(unsupported)) {
                return "(Not supported)";
            }
            else {
                return value;
            }
        }
        function addHandlerFunctions(data) {
            if (!data) {
                return;
            }
            data.forEach(function (item) {
                item['inDashboard'] = $scope.inDashboard;
                item['getDashboardWidgets'] = function () { return getDashboardWidgets(item); };
                item['onViewAttribute'] = function () { return onViewAttribute(item); };
                item['folderIconClass'] = function (row) { return folderIconClass(row); };
                item['gotoFolder'] = function (row) { return gotoFolder(row); };
            });
        }
        function getDashboardWidgets(row) {
            var mbean = workspace.getSelectedMBeanName();
            if (!mbean) {
                return '';
            }
            var potentialCandidates = _.filter(jmxWidgets, function (widget) {
                return mbean === widget.mbean;
            });
            if (potentialCandidates.length === 0) {
                return '';
            }
            potentialCandidates = _.filter(potentialCandidates, function (widget) {
                return widget.attribute === row.key || widget.total === row.key;
            });
            if (potentialCandidates.length === 0) {
                return '';
            }
            row.addChartToDashboard = function (type) { return $scope.addChartToDashboard(row, type); };
            var rc = [];
            potentialCandidates.forEach(function (widget) {
                var widgetType = Jmx.getWidgetType(widget);
                rc.push("\n              <i class=\"" + widgetType['icon'] + " clickable\"\n                 title=\"" + widgetType['title'] + "\"\n                 ng-click=\"row.entity.addChartToDashboard('" + widgetType['type'] + "')\"></i>\n            ");
            });
            return rc.join() + "&nbsp;";
        }
        $scope.addChartToDashboard = function (row, widgetType) {
            var mbean = workspace.getSelectedMBeanName();
            var candidates = jmxWidgets
                .filter(function (widget) { return mbean === widget.mbean; })
                .filter(function (widget) { return widget.attribute === row.key || widget.total === row.key; })
                .filter(function (widget) { return widget.type === widgetType; });
            // hmmm, we really should only have one result...
            var widget = _.first(candidates);
            var type = Jmx.getWidgetType(widget);
            $location.url(Jmx.createDashboardLink(type, widget));
        };
        function folderIconClass(row) {
            if (!row.getProperty) {
                return '';
            }
            if (!row.getProperty('objectName')) {
                return 'pficon pficon-folder-close';
            }
            var mbean = row.getProperty('mbean');
            return _.isNil(mbean) || _.isNil(mbean.canInvoke) || mbean.canInvoke ? 'fa fa-cog' : 'fa fa-lock';
        }
        function gotoFolder(row) {
            if (row.getProperty) {
                var key = row.getProperty('key');
                if (key) {
                    $location.search('nid', key);
                }
            }
        }
        function unwrapObjectName(value) {
            if (!_.isObject(value)) {
                return value;
            }
            var keys = Object.keys(value);
            if (keys.length === 1 && keys[0] === "objectName") {
                return value["objectName"];
            }
            return value;
        }
        function generateSummaryAndDetail(key, data) {
            var value = Core.escapeHtml(data.value);
            if (!angular.isArray(value) && angular.isObject(value)) {
                var detailHtml_1 = "<table class='table table-striped'>";
                var summary_1 = "";
                var object_1 = value;
                var keys = Object.keys(value).sort();
                angular.forEach(keys, function (key) {
                    var value = object_1[key];
                    detailHtml_1 += "<tr><td>" + Core.humanizeValue(key) + "</td><td>" + value + "</td></tr>";
                    summary_1 += Core.humanizeValue(key) + ": " + value + "  ";
                });
                detailHtml_1 += "</table>";
                data.summary = summary_1;
                data.detailHtml = detailHtml_1;
                data.tooltip = summary_1;
            }
            else {
                var text = value;
                // if the text is empty then use a no-break-space so the table allows us to click on the row,
                // otherwise if the text is empty, then you cannot click on the row
                if (text === '') {
                    text = '&nbsp;';
                    data.tooltip = "";
                }
                else {
                    data.tooltip = text;
                }
                data.summary = "" + text;
                data.detailHtml = "<pre>" + text + "</pre>";
                if (angular.isArray(value)) {
                    var html_1 = "<ul>";
                    angular.forEach(value, function (item) { return html_1 += "<li>" + item + "</li>"; });
                    html_1 += "</ul>";
                    data.detailHtml = html_1;
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
        function includePropertyValue(key, value) {
            return !_.isObject(value);
        }
    }
    Jmx.AttributesController = AttributesController;
})(Jmx || (Jmx = {}));
/// <reference path="../../../rbac/ts/models.ts"/>
var Jmx;
(function (Jmx) {
    var AttributesService = /** @class */ (function () {
        AttributesService.$inject = ["$q", "jolokia", "jolokiaUrl", "rbacACLMBean"];
        function AttributesService($q, jolokia, jolokiaUrl, rbacACLMBean) {
            'ngInject';
            this.$q = $q;
            this.jolokia = jolokia;
            this.jolokiaUrl = jolokiaUrl;
            this.rbacACLMBean = rbacACLMBean;
        }
        AttributesService.prototype.registerJolokia = function (scope, request, callback) {
            Core.register(this.jolokia, scope, request, callback);
        };
        AttributesService.prototype.unregisterJolokia = function (scope) {
            Core.unregister(this.jolokia, scope);
        };
        AttributesService.prototype.listMBean = function (mbeanName, callback) {
            this.jolokia.request({
                type: "LIST",
                method: "post",
                path: Core.escapeMBeanPath(mbeanName),
                ignoreErrors: true
            }, callback);
        };
        AttributesService.prototype.canInvoke = function (mbeanName, attribute, type) {
            var _this = this;
            return this.$q(function (resolve, reject) {
                if (_.isNull(mbeanName) || _.isNull(attribute) || _.isNull(type)) {
                    resolve(false);
                    return;
                }
                _this.rbacACLMBean.then(function (rbacACLMBean) {
                    _this.jolokia.request({
                        type: 'exec',
                        mbean: rbacACLMBean,
                        operation: 'canInvoke(java.lang.String,java.lang.String,[Ljava.lang.String;)',
                        arguments: [mbeanName, "set" + attribute, [type]]
                    }, Core.onSuccess(function (response) {
                        Jmx.log.debug("rbacACLMBean canInvoke attribute response:", response);
                        var canInvoke = response.value;
                        resolve(canInvoke);
                    }, {
                        error: function (response) {
                            Jmx.log.debug('AttributesService.canInvoke() failed:', response);
                            resolve(false);
                        }
                    }));
                });
            });
        };
        AttributesService.prototype.buildJolokiaUrl = function (mbeanName, attribute) {
            return this.jolokiaUrl + "/read/" + Core.escapeMBean(mbeanName) + "/" + attribute;
        };
        AttributesService.prototype.update = function (mbeanName, attribute, value) {
            this.jolokia.setAttribute(mbeanName, attribute, value, Core.onSuccess(function (response) {
                Core.notification("success", "Updated attribute " + attribute);
            }, {
                error: function (response) {
                    Jmx.log.debug("Failed to update attribute", response);
                    Core.notification("danger", "Failed to update attribute " + attribute);
                }
            }));
        };
        return AttributesService;
    }());
    Jmx.AttributesService = AttributesService;
})(Jmx || (Jmx = {}));
/// <reference path="../jmxPlugin.ts"/>
/// <reference path="attributes.controller.ts"/>
/// <reference path="attributes.service.ts"/>
var Jmx;
(function (Jmx) {
    Jmx.attributesModule = angular
        .module('hawtio-jmx-attributes', [])
        .controller('Jmx.AttributesController', Jmx.AttributesController)
        .service('attributesService', Jmx.AttributesService)
        .name;
})(Jmx || (Jmx = {}));
var Jmx;
(function (Jmx) {
    var Operation = /** @class */ (function () {
        function Operation(method, args, description) {
            this.args = args;
            this.description = description;
            this.name = Operation.buildName(method, args);
            this.readableName = Operation.buildReadableName(method, args);
            this.canInvoke = true;
        }
        Operation.buildName = function (method, args) {
            return method + "(" + args.map(function (arg) { return arg.type; }).join() + ")";
        };
        Operation.buildReadableName = function (method, args) {
            return method + "(" + args.map(function (arg) { return arg.readableType(); }).join(', ') + ")";
        };
        return Operation;
    }());
    Jmx.Operation = Operation;
    var OperationArgument = /** @class */ (function () {
        function OperationArgument() {
        }
        OperationArgument.prototype.readableType = function () {
            var lastDotIndex = this.type.lastIndexOf('.');
            var answer = lastDotIndex > 0 ? this.type.substr(lastDotIndex + 1) : this.type;
            if (_.startsWith(this.type, '[') && _.endsWith(this.type, ';')) {
                answer = _.trimEnd(answer, ';') + '[]';
            }
            return answer;
        };
        return OperationArgument;
    }());
    Jmx.OperationArgument = OperationArgument;
})(Jmx || (Jmx = {}));
/// <reference path="operation.ts"/>
/// <reference path="../../../rbac/ts/models.ts"/>
var Jmx;
(function (Jmx) {
    var OperationsService = /** @class */ (function () {
        OperationsService.$inject = ["$q", "jolokia", "rbacACLMBean"];
        function OperationsService($q, jolokia, rbacACLMBean) {
            'ngInject';
            this.$q = $q;
            this.jolokia = jolokia;
            this.rbacACLMBean = rbacACLMBean;
        }
        OperationsService.prototype.getOperations = function (mbeanName) {
            return this.loadOperations(mbeanName)
                .then(function (operations) { return _.sortBy(operations, function (operation) { return operation.readableName; }); });
        };
        OperationsService.prototype.loadOperations = function (mbeanName) {
            var _this = this;
            return this.$q(function (resolve, reject) {
                _this.jolokia.request({
                    type: 'list',
                    path: Core.escapeMBeanPath(mbeanName)
                }, Core.onSuccess(function (response) {
                    var operations = [];
                    var operationMap = {};
                    _.forEach(response.value.op, function (op, opName) {
                        if (_.isArray(op)) {
                            _.forEach(op, function (op) {
                                return _this.addOperation(operations, operationMap, opName, op);
                            });
                        }
                        else {
                            _this.addOperation(operations, operationMap, opName, op);
                        }
                    });
                    if (!_.isEmpty(operationMap)) {
                        _this.fetchPermissions(operationMap, mbeanName)
                            .then(function () { return resolve(operations); });
                    }
                    else {
                        resolve(operations);
                    }
                }, {
                    error: function (response) {
                        return Jmx.log.debug('OperationsService.loadOperations() failed:', response);
                    }
                }));
            });
        };
        OperationsService.prototype.addOperation = function (operations, operationMap, opName, op) {
            var operation = new Jmx.Operation(opName, op.args.map(function (arg) { return _.assign(new Jmx.OperationArgument(), arg); }), op.desc);
            operations.push(operation);
            operationMap[operation.name] = operation;
        };
        OperationsService.prototype.fetchPermissions = function (operationMap, mbeanName) {
            var _this = this;
            return this.$q(function (resolve, reject) {
                return _this.rbacACLMBean.then(function (rbacACLMBean) {
                    _this.jolokia.request({
                        type: 'exec',
                        mbean: rbacACLMBean,
                        operation: 'canInvoke(java.util.Map)',
                        arguments: [(_a = {}, _a[mbeanName] = _.values(operationMap).map(function (op) { return op.name; }), _a)]
                    }, Core.onSuccess(function (response) {
                        Jmx.log.debug("rbacACLMBean canInvoke operations response:", response);
                        var ops = response.value;
                        _.forEach(ops[mbeanName], function (canInvoke, opName) {
                            operationMap[opName].canInvoke = canInvoke.CanInvoke;
                        });
                        Jmx.log.debug("Got operations:", operationMap);
                        resolve();
                    }, {
                        error: function (response) {
                            return Jmx.log.debug('OperationsService.fetchPermissions() failed:', response);
                        }
                    }));
                    var _a;
                });
            });
        };
        OperationsService.prototype.getOperation = function (mbeanName, operationName) {
            return this.getOperations(mbeanName)
                .then(function (operations) { return _.find(operations, function (operation) { return operation.name === operationName; }); });
        };
        OperationsService.prototype.executeOperation = function (mbeanName, operation, argValues) {
            var _this = this;
            if (argValues === void 0) { argValues = []; }
            return this.$q(function (resolve, reject) {
                (_a = _this.jolokia).execute.apply(_a, [mbeanName, operation.name].concat(argValues, [{
                        success: function (response) {
                            if (response === null || response === 'null') {
                                resolve('Operation Succeeded!');
                            }
                            else if (typeof response === 'string') {
                                if (response.trim() === '') {
                                    resolve('Empty string');
                                }
                                else {
                                    resolve(response);
                                }
                            }
                            else {
                                resolve(angular.toJson(response, true));
                            }
                        },
                        error: function (response) { return reject(response.stacktrace ? response.stacktrace : response.error); }
                    }]));
                var _a;
            });
        };
        ;
        return OperationsService;
    }());
    Jmx.OperationsService = OperationsService;
})(Jmx || (Jmx = {}));
/// <reference path="../workspace.ts"/>
/// <reference path="operations.service.ts"/>
/// <reference path="operation.ts"/>
var Jmx;
(function (Jmx) {
    var OperationsController = /** @class */ (function () {
        OperationsController.$inject = ["$scope", "workspace", "jolokiaUrl", "operationsService"];
        function OperationsController($scope, workspace, jolokiaUrl, operationsService) {
            'ngInject';
            var _this = this;
            this.$scope = $scope;
            this.workspace = workspace;
            this.jolokiaUrl = jolokiaUrl;
            this.operationsService = operationsService;
            this.config = {
                showSelectBox: false,
                useExpandingRows: true
            };
            this.menuActions = [
                {
                    name: 'Copy method name',
                    actionFn: function (action, item) {
                        var clipboard = new Clipboard('.jmx-operations-list-view .dropdown-menu a', {
                            text: function (trigger) { return item.readableName; }
                        });
                        setTimeout(function () { return clipboard.destroy(); }, 1000);
                        Core.notification('success', 'Method name copied');
                    }
                },
                {
                    name: 'Copy Jolokia URL',
                    actionFn: function (action, item) {
                        var clipboard = new Clipboard('.jmx-operations-list-view .dropdown-menu a', {
                            text: function (trigger) { return _this.buildJolokiaUrl(item); }
                        });
                        setTimeout(function () { return clipboard.destroy(); }, 1000);
                        Core.notification('success', 'Jolokia URL copied');
                    }
                }
            ];
        }
        OperationsController.prototype.$onInit = function () {
            var _this = this;
            var mbeanName = this.workspace.getSelectedMBeanName();
            if (mbeanName) {
                this.loadOperations(mbeanName);
            }
            else {
                this.$scope.$on('jmxTreeClicked', function () {
                    var mbeanName = _this.workspace.getSelectedMBeanName();
                    _this.loadOperations(mbeanName);
                });
            }
        };
        OperationsController.prototype.loadOperations = function (mbeanName) {
            var _this = this;
            this.operationsService.getOperations(mbeanName)
                .then(function (operations) { return _this.operations = operations; });
        };
        OperationsController.prototype.buildJolokiaUrl = function (operation) {
            var mbeanName = Core.escapeMBean(this.workspace.getSelectedMBeanName());
            return this.jolokiaUrl + "/exec/" + mbeanName + "/" + operation.name;
        };
        return OperationsController;
    }());
    Jmx.OperationsController = OperationsController;
    Jmx.operationsComponent = {
        templateUrl: 'plugins/jmx/html/operations/operations.html',
        controller: OperationsController
    };
})(Jmx || (Jmx = {}));
/// <reference path="../workspace.ts"/>
/// <reference path="operations.service.ts"/>
/// <reference path="operation.ts"/>
var Jmx;
(function (Jmx) {
    var OperationFormController = /** @class */ (function () {
        OperationFormController.$inject = ["workspace", "operationsService"];
        function OperationFormController(workspace, operationsService) {
            'ngInject';
            this.workspace = workspace;
            this.operationsService = operationsService;
            this.editorMode = 'text';
            this.isExecuting = false;
        }
        OperationFormController.prototype.$onInit = function () {
            this.formFields = this.operation.args.map(function (arg) { return ({
                label: arg.name,
                type: OperationFormController.convertToHtmlInputType(arg.type),
                helpText: OperationFormController.buildHelpText(arg),
                value: OperationFormController.getDefaultValue(arg.type)
            }); });
        };
        OperationFormController.buildHelpText = function (arg) {
            if (arg.desc && arg.desc !== arg.name) {
                if (arg.desc.charAt(arg.desc.length - 1) !== '.') {
                    arg.desc = arg.desc + '.';
                }
                arg.desc = arg.desc + ' ';
            }
            else {
                arg.desc = '';
            }
            return arg.desc + 'Type: ' + arg.readableType();
        };
        OperationFormController.convertToHtmlInputType = function (javaType) {
            switch (javaType) {
                case 'boolean':
                case 'java.lang.Boolean':
                    return 'checkbox';
                case 'int':
                case 'long':
                case 'java.lang.Integer':
                case 'java.lang.Long':
                    return 'number';
                default:
                    return 'text';
            }
        };
        OperationFormController.getDefaultValue = function (javaType) {
            switch (javaType) {
                case 'boolean':
                case 'java.lang.Boolean':
                    return false;
                case 'int':
                case 'long':
                case 'java.lang.Integer':
                case 'java.lang.Long':
                    return 0;
                default:
                    return '';
            }
        };
        OperationFormController.prototype.execute = function () {
            var _this = this;
            this.isExecuting = true;
            var mbeanName = this.workspace.getSelectedMBeanName();
            var argValues = this.formFields.map(function (formField) { return formField.value; });
            this.operationsService.executeOperation(mbeanName, this.operation, argValues)
                .then(function (result) {
                _this.operationFailed = false;
                _this.operationResult = result.trim();
                _this.isExecuting = false;
            })
                .catch(function (error) {
                _this.operationFailed = true;
                _this.operationResult = error.trim();
                _this.isExecuting = false;
            });
        };
        return OperationFormController;
    }());
    Jmx.OperationFormController = OperationFormController;
    Jmx.operationFormComponent = {
        bindings: {
            operation: '<'
        },
        templateUrl: 'plugins/jmx/html/operations/operation-form.html',
        controller: OperationFormController
    };
})(Jmx || (Jmx = {}));
/// <reference path="../jmxPlugin.ts"/>
/// <reference path="operations.component.ts"/>
/// <reference path="operation-form.component.ts"/>
/// <reference path="operations.service.ts"/>
var Jmx;
(function (Jmx) {
    Jmx.operationsModule = angular
        .module('hawtio-jmx-operations', [])
        .component('operations', Jmx.operationsComponent)
        .component('operationForm', Jmx.operationFormComponent)
        .service('operationsService', Jmx.OperationsService)
        .name;
})(Jmx || (Jmx = {}));
/// <reference path="tree.module.ts"/>
var Jmx;
(function (Jmx) {
    var TreeHeaderController = /** @class */ (function () {
        TreeHeaderController.$inject = ["$scope", "$element"];
        function TreeHeaderController($scope, $element) {
            'ngInject';
            this.$scope = $scope;
            this.$element = $element;
            this.filter = '';
            this.result = [];
            // it's not possible to declare classes to the component host tag in AngularJS
            $element.addClass('tree-nav-sidebar-header');
        }
        TreeHeaderController.prototype.$onInit = function () {
            var _this = this;
            this.$scope.$watch(angular.bind(this, function () { return _this.filter; }), function (filter, previous) {
                if (filter !== previous) {
                    _this.search(filter);
                }
            });
        };
        TreeHeaderController.prototype.search = function (filter) {
            var _this = this;
            var doSearch = function (filter) {
                var result = _this.tree().search(filter, {
                    ignoreCase: true,
                    exactMatch: false,
                    revealResults: true,
                });
                _this.result.length = 0;
                (_a = _this.result).push.apply(_a, result);
                Core.$apply(_this.$scope);
                var _a;
            };
            _.debounce(doSearch, 300, { leading: false, trailing: true })(filter);
        };
        TreeHeaderController.prototype.tree = function () {
            return $(Jmx.treeElementId).treeview(true);
        };
        TreeHeaderController.prototype.expandAll = function () {
            return this.tree().expandAll({ silent: true });
        };
        TreeHeaderController.prototype.contractAll = function () {
            return this.tree().collapseAll({ silent: true });
        };
        return TreeHeaderController;
    }());
    Jmx.TreeHeaderController = TreeHeaderController;
})(Jmx || (Jmx = {}));
/// <reference path="tree-header.controller.ts"/>
var Jmx;
(function (Jmx) {
    Jmx.treeHeaderComponent = {
        templateUrl: 'plugins/jmx/html/tree/header.html',
        controller: Jmx.TreeHeaderController
    };
})(Jmx || (Jmx = {}));
var Jmx;
(function (Jmx) {
    var TreeController = /** @class */ (function () {
        TreeController.$inject = ["$scope", "$location", "workspace", "$element", "$timeout"];
        function TreeController($scope, $location, workspace, $element, $timeout) {
            'ngInject';
            this.$scope = $scope;
            this.$location = $location;
            this.workspace = workspace;
            this.$element = $element;
            this.$timeout = $timeout;
            // it's not possible to declare classes to the component host tag in AngularJS
            $element.addClass('tree-nav-sidebar-content');
        }
        TreeController.prototype.$onInit = function () {
            var _this = this;
            this.$scope.$on('$destroy', function () { return _this.removeTree(); });
            this.$scope.$on('jmxTreeUpdated', function () { return _this.populateTree(); });
            this.$scope.$on('$routeChangeStart', function () { return _this.updateSelectionFromURL(); });
            this.populateTree();
        };
        TreeController.prototype.treeFetched = function () {
            return this.workspace.treeFetched;
        };
        TreeController.prototype.updateSelectionFromURL = function () {
            Jmx.updateTreeSelectionFromURL(this.$location, $(Jmx.treeElementId));
        };
        TreeController.prototype.populateTree = function () {
            var _this = this;
            Jmx.log.debug('TreeController: populateTree');
            this.removeTree();
            Jmx.enableTree(this.$scope, this.$location, this.workspace, $(Jmx.treeElementId), this.workspace.tree.children);
            this.$timeout(function () {
                _this.updateSelectionFromURL();
                _this.workspace.broadcastSelectionNode();
            });
        };
        TreeController.prototype.removeTree = function () {
            var tree = $(Jmx.treeElementId).treeview(true);
            // There is no exposed API to check whether the tree has already been initialized,
            // so let's just check if the methods are presents
            if (tree.clearSearch) {
                tree.clearSearch();
                // Bootstrap tree view leaks the node elements into the data structure
                // so let's clean this up when the user leaves the view
                var cleanTreeFolder_1 = function (node) {
                    delete node['$el'];
                    if (node.nodes)
                        node.nodes.forEach(cleanTreeFolder_1);
                };
                cleanTreeFolder_1(this.workspace.tree);
                // Then call the tree clean-up method
                tree.remove();
            }
        };
        return TreeController;
    }());
    Jmx.TreeController = TreeController;
    Jmx.treeComponent = {
        templateUrl: 'plugins/jmx/html/tree/content.html',
        controller: TreeController,
    };
})(Jmx || (Jmx = {}));
/// <reference path="tree-header.component.ts"/>
/// <reference path="tree.component.ts"/>
var Jmx;
(function (Jmx) {
    Jmx.treeModule = angular
        .module('hawtio-jmx-tree', [])
        .component('treeHeader', Jmx.treeHeaderComponent)
        .component('tree', Jmx.treeComponent)
        .name;
    Jmx.treeElementId = '#jmxtree';
})(Jmx || (Jmx = {}));
/// <reference path="../../jvm/ts/jvmHelpers.ts"/>
/// <reference path="jmxHelpers.ts"/>
/// <reference path="widgetRepository.ts"/>
/// <reference path="workspace.ts"/>
/// <reference path="common/common.module.ts"/>
/// <reference path="attributes/attributes.module.ts"/>
/// <reference path="operations/operations.module.ts"/>
/// <reference path="tree/tree.module.ts"/>
var Jmx;
(function (Jmx) {
    Jmx._module = angular.module(Jmx.pluginName, [
        'angularResizable',
        Jmx.commonModule,
        Jmx.attributesModule,
        Jmx.operationsModule,
        Jmx.treeModule
    ]);
    Jmx._module.config(['HawtioNavBuilderProvider', "$routeProvider", function (builder, $routeProvider) {
            $routeProvider
                .when('/jmx', { redirectTo: '/jmx/attributes' })
                .when('/jmx/attributes', { templateUrl: UrlHelpers.join(Jmx.templatePath, 'attributes/attributes.html') })
                .when('/jmx/operations', { template: '<operations></operations>' })
                .when('/jmx/charts', { templateUrl: UrlHelpers.join(Jmx.templatePath, 'charts.html') })
                .when('/jmx/chartEdit', { templateUrl: UrlHelpers.join(Jmx.templatePath, 'chartEdit.html') })
                .when('/jmx/help/:tabName', { templateUrl: 'app/core/html/help.html' })
                .when('/jmx/widget/donut', { templateUrl: UrlHelpers.join(Jmx.templatePath, 'donutChart.html') })
                .when('/jmx/widget/area', { templateUrl: UrlHelpers.join(Jmx.templatePath, 'areaChart.html') });
        }]);
    Jmx._module.factory('jmxWidgetTypes', function () { return Jmx.jmxWidgetTypes; });
    Jmx._module.factory('jmxWidgets', function () { return Jmx.jmxWidgets; });
    // Create the workspace object used in all kinds of places
    Jmx._module.factory('workspace', ["$location", "jmxTreeLazyLoadRegistry", "$compile", "$templateCache", "localStorage", "jolokia", "jolokiaStatus", "$rootScope", "userDetails", "HawtioNav", function ($location, jmxTreeLazyLoadRegistry, $compile, $templateCache, localStorage, jolokia, jolokiaStatus, $rootScope, userDetails, HawtioNav) {
            var workspace = new Jmx.Workspace(jolokia, jolokiaStatus, jmxTreeLazyLoadRegistry, $location, $compile, $templateCache, localStorage, $rootScope, HawtioNav);
            workspace.loadTree();
            return workspace;
        }]);
    Jmx._module.constant('layoutTree', 'plugins/jmx/html/layoutTree.html');
    Jmx._module.factory('jmxTreeLazyLoadRegistry', function () { return Core.lazyLoaders; });
    Jmx._module.run(["HawtioNav", "$location", "workspace", "viewRegistry", "layoutTree", "layoutFull", "jolokia", "helpRegistry", "pageTitle", "$templateCache", function (nav, $location, workspace, viewRegistry, layoutTree, layoutFull, jolokia, helpRegistry, pageTitle, $templateCache) {
            Jmx.log.debug('JMX plugin loaded');
            viewRegistry['jmx'] = layoutTree;
            viewRegistry['{ "tab": "notree" }'] = layoutFull;
            helpRegistry.addUserDoc('jmx', 'plugins/jmx/doc/help.md');
            pageTitle.addTitleElement(function () {
                if (Jmx.currentProcessId === '') {
                    try {
                        Jmx.currentProcessId = jolokia.getAttribute('java.lang:type=Runtime', 'Name');
                    }
                    catch (e) {
                        // ignore
                    }
                    if (Jmx.currentProcessId && Jmx.currentProcessId.indexOf("@") !== -1) {
                        Jmx.currentProcessId = "pid:" + Jmx.currentProcessId.split("@")[0];
                    }
                }
                return Jmx.currentProcessId;
            });
            var tab = nav.builder().id('jmx')
                .title(function () { return 'JMX'; })
                .defaultPage({
                rank: 10,
                isValid: function (yes, no) { return workspace.hasMBeans() ? yes() : no(); }
            })
                .isValid(function () { return workspace.hasMBeans(); })
                .href(function () { return '/jmx'; })
                .build();
            nav.add(tab);
        }]);
    hawtioPluginLoader.addModule(Jmx.pluginName);
    hawtioPluginLoader.addModule('dangle');
})(Jmx || (Jmx = {}));
/// <reference path="./jmxPlugin.ts"/>
var Jmx;
(function (Jmx) {
    Jmx.AreaChartController = Jmx._module.controller("Jmx.AreaChartController", ["$scope", "$routeParams", "jolokia", "$templateCache", "localStorage", function ($scope, $routeParams, jolokia, $templateCache, localStorage) {
            $scope.mbean = $routeParams['mbean'];
            $scope.attribute = $routeParams['attribute'];
            $scope.duration = localStorage['updateRate'];
            $scope.width = 308;
            $scope.height = 296;
            $scope.template = "";
            $scope.entries = [];
            $scope.data = {
                entries: $scope.entries
            };
            $scope.req = [{ type: 'read', mbean: $scope.mbean, attribute: $scope.attribute }];
            $scope.render = function (response) {
                $scope.entries.push({
                    time: response.timestamp,
                    count: response.value
                });
                $scope.entries = $scope.entries.last(15);
                if ($scope.template === "") {
                    $scope.template = $templateCache.get("areaChart");
                }
                $scope.data = {
                    _type: "date_histogram",
                    entries: $scope.entries
                };
                Core.$apply($scope);
            };
            Core.register(jolokia, $scope, $scope.req, Core.onSuccess($scope.render));
        }]);
})(Jmx || (Jmx = {}));
/// <reference path="jmxPlugin.ts"/>
var Jmx;
(function (Jmx) {
    Jmx._module.controller("Jmx.ChartEditController", ["$scope", "$location", "workspace", "jolokia", function ($scope, $location, workspace, jolokia) {
            $scope.selectedAttributes = [];
            $scope.selectedMBeans = [];
            $scope.metrics = {};
            $scope.mbeans = {};
            // TODO move this function to $routeScope
            $scope.size = function (value) {
                if (angular.isObject(value)) {
                    return _.keys(value).length;
                }
                else if (angular.isArray(value)) {
                    return value.length;
                }
                else
                    return 1;
            };
            $scope.canViewChart = function () {
                return $scope.selectedAttributes.length && $scope.selectedMBeans.length &&
                    $scope.size($scope.mbeans) > 0 && $scope.size($scope.metrics) > 0;
            };
            $scope.canEditChart = function () {
                // Similar to can view chart, although rules are slightly different for parents
                var result;
                if (workspace.selection && workspace.selection.isFolder()) {
                    // For ENTESB-4165. This is a bit hacky but needed to deal with special conditions like
                    // where there is only a single queue or topic
                    result = $scope.selectedAttributes.length && $scope.selectedMBeans.length &&
                        ($scope.size($scope.mbeans) + $scope.size($scope.metrics) > 2);
                }
                else {
                    result = $scope.selectedAttributes.length && $scope.selectedMBeans.length &&
                        $scope.size($scope.mbeans) > 0 && $scope.size($scope.metrics) > 0;
                }
                return result;
            };
            $scope.showAttributes = function () {
                return $scope.canViewChart() && $scope.size($scope.metrics) > 1;
            };
            $scope.showElements = function () {
                return $scope.canViewChart() && $scope.size($scope.mbeans) > 1;
            };
            $scope.viewChart = function () {
                // lets add the attributes and mbeans into the URL so we can navigate back to the charts view
                var search = $location.search();
                // if we have selected all attributes, then lets just remove the attribute
                if ($scope.selectedAttributes.length === $scope.size($scope.metrics)) {
                    delete search["att"];
                }
                else {
                    search["att"] = $scope.selectedAttributes;
                }
                // if we are on an mbean with no children lets discard an unnecessary parameter
                if (!workspace.selection.isFolder() && $scope.selectedMBeans.length === $scope.size($scope.mbeans) && $scope.size($scope.mbeans) === 1) {
                    delete search["el"];
                }
                else {
                    search["el"] = $scope.selectedMBeans;
                }
                search['sub-tab'] = 'jmx-chart';
                $location.search(search);
                $location.path("jmx/charts");
            };
            $scope.$on("$routeChangeSuccess", function (event, current, previous) {
                // lets do this asynchronously to avoid Error: $digest already in progress
                setTimeout(render, 50);
            });
            function render() {
                var node = workspace.selection;
                if (!angular.isDefined(node) || node === null) {
                    return;
                }
                $scope.selectedAttributes = [];
                $scope.selectedMBeans = [];
                $scope.metrics = {};
                $scope.mbeans = {};
                var mbeanCounter = 0;
                var resultCounter = 0;
                // lets iterate through all the children if the current node is not an mbean
                var children = node.children;
                if (!children || !children.length || node.objectName) {
                    children = [node];
                }
                if (children) {
                    children.forEach(function (mbeanNode) {
                        var mbean = mbeanNode.objectName;
                        var name = mbeanNode.text;
                        if (name && mbean) {
                            mbeanCounter++;
                            $scope.mbeans[name] = name;
                            // use same logic as the JMX attributes page which works better than jolokia.list which has problems with
                            // mbeans with special characters such as ? and query parameters such as Camel endpoint mbeans
                            var asQuery = function (node) {
                                var path = Core.escapeMBeanPath(node);
                                var query = {
                                    type: "list",
                                    path: path,
                                    ignoreErrors: true
                                };
                                return query;
                            };
                            var infoQuery = asQuery(mbean);
                            // must use post, so see further below where we pass in {method: "post"}
                            jolokia.request(infoQuery, Core.onSuccess(function (meta) {
                                var attributes = meta.value.attr;
                                if (attributes) {
                                    for (var key in attributes) {
                                        var value = attributes[key];
                                        if (value) {
                                            var typeName = value['type'];
                                            if (Core.isNumberTypeName(typeName)) {
                                                if (!$scope.metrics[key]) {
                                                    //console.log("Number attribute " + key + " for " + mbean);
                                                    $scope.metrics[key] = key;
                                                }
                                            }
                                        }
                                    }
                                    if (++resultCounter >= mbeanCounter) {
                                        // TODO do we need to sort just in case?
                                        // lets look in the search URI to default the selections
                                        var search = $location.search();
                                        var attributeNames = Core.toSearchArgumentArray(search["att"]);
                                        var elementNames = Core.toSearchArgumentArray(search["el"]);
                                        if (attributeNames && attributeNames.length) {
                                            attributeNames.forEach(function (name) {
                                                if ($scope.metrics[name] && !_.some($scope.selectedAttributes, function (el) { return el === name; })) {
                                                    $scope.selectedAttributes.push(name);
                                                }
                                            });
                                        }
                                        if (elementNames && elementNames.length) {
                                            elementNames.forEach(function (name) {
                                                if ($scope.mbeans[name] && !_.some($scope.selectedAttributes, function (el) { return el === name; })) {
                                                    $scope.selectedMBeans.push(name);
                                                }
                                            });
                                        }
                                        // default selections if there are none
                                        if ($scope.selectedMBeans.length < 1) {
                                            $scope.selectedMBeans = _.keys($scope.mbeans);
                                        }
                                        if ($scope.selectedAttributes.length < 1) {
                                            var attrKeys = _.keys($scope.metrics).sort();
                                            if ($scope.selectedMBeans.length > 1) {
                                                $scope.selectedAttributes = [_.first(attrKeys)];
                                            }
                                            else {
                                                $scope.selectedAttributes = attrKeys;
                                            }
                                        }
                                        // lets update the sizes using jquery as it seems AngularJS doesn't support it
                                        $("#attributes").attr("size", _.keys($scope.metrics).length);
                                        $("#mbeans").attr("size", _.keys($scope.mbeans).length);
                                        Core.$apply($scope);
                                    }
                                }
                                // update the website
                                Core.$apply($scope);
                            }, { method: "post" }));
                        }
                    });
                }
            }
        }]);
})(Jmx || (Jmx = {}));
/// <reference path="./jmxPlugin.ts"/>
var Jmx;
(function (Jmx) {
    Jmx._module.controller("Jmx.ChartController", ["$scope", "$element", "$location", "workspace", "localStorage", "jolokiaUrl", "jolokiaParams", function ($scope, $element, $location, workspace, localStorage, jolokiaUrl, jolokiaParams) {
            var log = Logger.get("JMX");
            $scope.title = workspace.selection ? workspace.selection.text : '';
            $scope.metrics = [];
            $scope.updateRate = 1000; //parseInt(localStorage['updateRate']);
            $scope.context = null;
            $scope.jolokia = null;
            $scope.charts = null;
            $scope.toolbarConfig = {
                actionsConfig: {
                    primaryActions: [
                        {
                            name: 'Edit',
                            actionFn: function () { return $location.path('/jmx/chartEdit'); }
                        }
                    ]
                }
            };
            $scope.reset = function () {
                if ($scope.context) {
                    $scope.context.stop();
                    $scope.context = null;
                }
                if ($scope.jolokia) {
                    $scope.jolokia.stop();
                    $scope.jolokia = null;
                }
                if ($scope.charts) {
                    $scope.charts.empty();
                    $scope.charts = null;
                }
            };
            $scope.$on('$destroy', function () {
                try {
                    $scope.deregRouteChange();
                }
                catch (error) {
                    // ignore
                }
                try {
                    $scope.dereg();
                }
                catch (error) {
                    // ignore
                }
                $scope.reset();
            });
            $scope.errorMessage = function () {
                if ($scope.updateRate === 0) {
                    return "updateRate";
                }
                if ($scope.metrics.length === 0) {
                    return "metrics";
                }
            };
            var doRender = _.debounce(render, 200, { trailing: true });
            $scope.deregRouteChange = $scope.$on("$routeChangeSuccess", function (event, current, previous) {
                // lets do this asynchronously to avoid Error: $digest already in progress
                doRender();
            });
            doRender();
            function render() {
                var node = workspace.selection || workspace.getSelectedMBean();
                if (node == null) {
                    return;
                }
                if (!angular.isDefined(node) || !angular.isDefined($scope.updateRate) || $scope.updateRate === 0) {
                    // Called render too early, let's retry
                    setTimeout(doRender, 500);
                    Core.$apply($scope);
                    return;
                }
                var width = 594;
                var charts = $element.find('#charts');
                if (charts) {
                    width = charts.width();
                }
                else {
                    // Called render too early, let's retry
                    setTimeout(doRender, 500);
                    Core.$apply($scope);
                    return;
                }
                // clear out any existing context
                $scope.reset();
                $scope.charts = charts;
                $scope.jolokia = new Jolokia(jolokiaParams);
                $scope.jolokia.start($scope.updateRate);
                var mbean = node.objectName;
                $scope.metrics = [];
                var context = cubism.context()
                    .serverDelay($scope.updateRate)
                    .clientDelay($scope.updateRate)
                    .step($scope.updateRate)
                    .size(width);
                $scope.context = context;
                $scope.jolokiaContext = context.jolokia($scope.jolokia);
                var search = $location.search();
                var attributeNames = Core.toSearchArgumentArray(search["att"]);
                if (mbean) {
                    // TODO make generic as we can cache them; they rarely ever change
                    // lets get the attributes for this mbean
                    // use same logic as the JMX attributes page which works better than jolokia.list which has problems with
                    // mbeans with special characters such as ? and query parameters such as Camel endpoint mbeans
                    var asQuery = function (node) {
                        // we need to escape the mbean path for list
                        var path = Core.escapeMBeanPath(node);
                        var query = {
                            type: "list",
                            path: path,
                            ignoreErrors: true
                        };
                        return query;
                    };
                    var infoQuery = asQuery(mbean);
                    // must use post, so see further below where we pass in {method: "post"}
                    var meta = $scope.jolokia.request(infoQuery, { method: "post" });
                    if (meta) {
                        // in case of error then use the default error handler
                        Core.defaultJolokiaErrorHandler(meta, {});
                        var attributes = meta.value ? meta.value.attr : null;
                        if (attributes) {
                            var foundNames = [];
                            for (var key in attributes) {
                                var value = attributes[key];
                                if (value) {
                                    var typeName = value['type'];
                                    if (Core.isNumberTypeName(typeName)) {
                                        foundNames.push(key);
                                    }
                                }
                            }
                            // lets filter the attributes
                            // if we find none then the att search attribute is invalid
                            // so lets discard the filter - as it must be for some other mbean
                            if (attributeNames.length) {
                                var filtered = foundNames.filter(function (key) { return attributeNames.indexOf(key) >= 0; });
                                if (filtered.length) {
                                    foundNames = filtered;
                                }
                            }
                            // sort the names
                            foundNames = foundNames.sort();
                            angular.forEach(foundNames, function (key) {
                                var metric = $scope.jolokiaContext.metric({
                                    type: 'read',
                                    mbean: mbean,
                                    attribute: key
                                }, Core.humanizeValue(key));
                                if (metric) {
                                    $scope.metrics.push(metric);
                                }
                            });
                        }
                    }
                }
                else {
                    // lets try pull out the attributes and elements from the URI and use those to chart
                    var elementNames = Core.toSearchArgumentArray(search["el"]);
                    if (attributeNames && attributeNames.length && elementNames && elementNames.length) {
                        // first lets map the element names to mbean names to keep the URI small
                        var mbeans = {};
                        elementNames.forEach(function (elementName) {
                            var child = node.get(elementName);
                            if (!child && node.children) {
                                child = _.find(node.children, function (n) { return elementName === n["title"]; });
                            }
                            if (child) {
                                var mbean = child.objectName;
                                if (mbean) {
                                    mbeans[elementName] = mbean;
                                }
                            }
                        });
                        // sort the names
                        attributeNames = attributeNames.sort();
                        // lets create the metrics
                        attributeNames.forEach(function (key) {
                            angular.forEach(mbeans, function (mbean, name) {
                                var attributeTitle = Core.humanizeValue(key);
                                // for now lets always be verbose
                                var title = name + ": " + attributeTitle;
                                var metric = $scope.jolokiaContext.metric({
                                    type: 'read',
                                    mbean: mbean,
                                    attribute: key
                                }, title);
                                if (metric) {
                                    $scope.metrics.push(metric);
                                }
                            });
                        });
                    }
                    // if we've children and none of the query arguments matched any metrics
                    // lets redirect back to the edit view
                    if (node.children.length && !$scope.metrics.length) {
                        // lets forward to the chart selection UI if we have some children; they may have
                        // chartable attributes
                        $location.path("jmx/chartEdit");
                    }
                }
                if ($scope.metrics.length > 0) {
                    var d3Selection = d3.select(charts.get(0));
                    var axisEl = d3Selection.selectAll(".axis");
                    var bail = false;
                    axisEl.data(["top", "bottom"])
                        .enter().append("div")
                        .attr("class", function (d) {
                        return d + " axis";
                    })
                        .each(function (d) {
                        if (bail) {
                            return;
                        }
                        try {
                            d3.select(this).call(context.axis().ticks(12).orient(d));
                        }
                        catch (error) {
                            // still rendering at not the right time...
                            // log.debug("error: ", error);
                            if (!bail) {
                                bail = true;
                            }
                        }
                    });
                    if (bail) {
                        $scope.reset();
                        setTimeout(doRender, 500);
                        Core.$apply($scope);
                        return;
                    }
                    d3Selection.append("div")
                        .attr("class", "rule")
                        .call(context.rule());
                    context.on("focus", function (i) {
                        try {
                            d3Selection.selectAll(".value").style("right", i === null ? null : context.size() - i + "px");
                        }
                        catch (error) {
                            log.info("error: ", error);
                        }
                    });
                    $scope.metrics.forEach(function (metric) {
                        d3Selection.call(function (div) {
                            div.append("div")
                                .data([metric])
                                .attr("class", "horizon")
                                .call(context.horizon());
                        });
                    });
                }
                else {
                    $scope.reset();
                }
                Core.$apply($scope);
            }
            ;
        }]);
})(Jmx || (Jmx = {}));
/// <reference path="jmxPlugin.ts"/>
var Jmx;
(function (Jmx) {
    Jmx.DonutChartController = Jmx._module.controller("Jmx.DonutChartController", ["$scope", "$routeParams", "jolokia", "$templateCache", function ($scope, $routeParams, jolokia, $templateCache) {
            /*
            console.log("routeParams: ", $routeParams);
        
        
            // using multiple attributes
            $scope.mbean = "java.lang:type=OperatingSystem";
            $scope.total = "MaxFileDescriptorCount";
            $scope.terms = "OpenFileDescriptorCount";
            */
            // using a single attribute with multiple paths
            /*
             $scope.mbean = "java.lang:type=Memory";
             $scope.total = "Max";
             $scope.attribute = "HeapMemoryUsage";
             $scope.terms = "Used";
             */
            $scope.mbean = $routeParams['mbean'];
            $scope.total = $routeParams['total'];
            $scope.attribute = $routeParams['attribute'];
            $scope.terms = $routeParams['terms'];
            $scope.remainder = $routeParams['remaining'];
            $scope.template = "";
            $scope.termsArray = $scope.terms.split(",");
            $scope.data = {
                total: 0,
                terms: []
            };
            if (!$scope.attribute) {
                $scope.reqs = [{ type: 'read', mbean: $scope.mbean, attribute: $scope.total }];
                $scope.termsArray.forEach(function (term) {
                    $scope.reqs.push({ type: 'read', mbean: $scope.mbean, attribute: term });
                    $scope.data.terms.push({
                        term: term,
                        count: 0
                    });
                });
            }
            else {
                var terms = $scope.termsArray.include($scope.total);
                $scope.reqs = [{ type: 'read', mbean: $scope.mbean, attribute: $scope.attribute, paths: terms.join(",") }];
                $scope.termsArray.forEach(function (term) {
                    $scope.data.terms.push({
                        term: term,
                        count: 0
                    });
                });
            }
            if ($scope.remainder && $scope.remainder !== "-") {
                $scope.data.terms.push({
                    term: $scope.remainder,
                    count: 0
                });
            }
            /*
            $scope.data = {
              total: 100,
              terms: [{
                term: "One",
                count: 25
              }, {
                term: "Two",
                count: 75
              }]
            };
            */
            $scope.render = function (response) {
                //console.log("got: ", response);
                var freeTerm = null;
                if ($scope.remainder && $scope.remainder !== "-") {
                    freeTerm = _.find($scope.data.terms, function (term) { return term.term === $scope.remainder; });
                }
                if (!$scope.attribute) {
                    if (response.request.attribute === $scope.total) {
                        $scope.data.total = response.value;
                    }
                    else {
                        var term = _.find($scope.data.terms, function (term) { return term.term === response.request.attribute; });
                        if (term) {
                            term.count = response.value;
                        }
                        if (freeTerm) {
                            freeTerm.count = $scope.data.total;
                            $scope.data.terms.forEach(function (term) {
                                if (term.term !== $scope.remainder) {
                                    freeTerm.count = freeTerm.count - term.count;
                                }
                            });
                        }
                    }
                }
                else {
                    if (response.request.attribute === $scope.attribute) {
                        $scope.data.total = response.value[$scope.total.toLowerCase()];
                        $scope.data.terms.forEach(function (term) {
                            if (term.term !== $scope.remainder) {
                                term.count = response.value[term.term.toLowerCase()];
                            }
                        });
                        if (freeTerm) {
                            freeTerm.count = $scope.data.total;
                            $scope.data.terms.forEach(function (term) {
                                if (term.term !== $scope.remainder) {
                                    freeTerm.count = freeTerm.count - term.count;
                                }
                            });
                        }
                    }
                }
                if ($scope.template === "") {
                    $scope.template = $templateCache.get("donut");
                }
                // console.log("Data: ", $scope.data);
                $scope.data = _.clone($scope.data);
                Core.$apply($scope);
            };
            Core.register(jolokia, $scope, $scope.reqs, Core.onSuccess($scope.render));
        }]);
})(Jmx || (Jmx = {}));
/// <reference path="folder.ts"/>
/// <reference path="../workspace.ts"/>
var Jmx;
(function (Jmx) {
    function findLazyLoadingFunction(workspace, folder) {
        var factories = workspace.jmxTreeLazyLoadRegistry[folder.domain];
        var lazyFunction = null;
        if (factories && factories.length) {
            angular.forEach(factories, function (customLoader) {
                if (!lazyFunction) {
                    lazyFunction = customLoader(folder);
                }
            });
        }
        return lazyFunction;
    }
    Jmx.findLazyLoadingFunction = findLazyLoadingFunction;
    function registerLazyLoadHandler(domain, lazyLoaderFactory) {
        var array = Core.lazyLoaders[domain];
        if (!array) {
            array = [];
            Core.lazyLoaders[domain] = array;
        }
        array.push(lazyLoaderFactory);
    }
    Jmx.registerLazyLoadHandler = registerLazyLoadHandler;
    function unregisterLazyLoadHandler(domain, lazyLoaderFactory) {
        if (Core.lazyLoaders) {
            var array = Core.lazyLoaders[domain];
            if (array) {
                array.remove(lazyLoaderFactory);
            }
        }
    }
    Jmx.unregisterLazyLoadHandler = unregisterLazyLoadHandler;
    function updateTreeSelectionFromURL($location, treeElement, activateIfNoneSelected) {
        if (activateIfNoneSelected === void 0) { activateIfNoneSelected = false; }
        updateTreeSelectionFromURLAndAutoSelect($location, treeElement, null, activateIfNoneSelected);
    }
    Jmx.updateTreeSelectionFromURL = updateTreeSelectionFromURL;
    function updateTreeSelectionFromURLAndAutoSelect($location, treeElement, autoSelect, activateIfNoneSelected) {
        if (activateIfNoneSelected === void 0) { activateIfNoneSelected = false; }
        var tree = treeElement.treeview(true);
        var node;
        // If there is a node id then select that one
        var key = $location.search()['nid'];
        if (key) {
            node = _.find(tree.getNodes(), { id: key });
        }
        // Else optionally select the first node if there is no selection
        if (!node && activateIfNoneSelected && tree.getSelected().length === 0) {
            var children = tree.getNodes();
            if (children.length > 0) {
                node = children[0];
                // invoke any auto select function, and use its result as new first, if any returned
                if (autoSelect) {
                    var result = autoSelect(node);
                    if (result) {
                        node = result;
                    }
                }
            }
        }
        // Finally update the tree with the result node
        if (node) {
            tree.revealNode(node, { silent: true });
            tree.selectNode(node, { silent: false });
            tree.expandNode(node, { levels: 1, silent: true });
        }
        // Word-around to avoid collapsed parent node on re-parenting
        tree.getExpanded().forEach(function (node) { return tree.revealNode(node, { silent: true }); });
    }
    Jmx.updateTreeSelectionFromURLAndAutoSelect = updateTreeSelectionFromURLAndAutoSelect;
    function getUniqueTypeNames(children) {
        var typeNameMap = {};
        angular.forEach(children, function (mbean) {
            var typeName = mbean.typeName;
            if (typeName) {
                typeNameMap[typeName] = mbean;
            }
        });
        // only query if all the typenames are the same
        return Object.keys(typeNameMap);
    }
    Jmx.getUniqueTypeNames = getUniqueTypeNames;
    function enableTree($scope, $location, workspace, treeElement, children) {
        treeElement.treeview({
            lazyLoad: function (node, addNodes) {
                var plugin = Jmx.findLazyLoadingFunction(workspace, node);
                if (plugin) {
                    Jmx.log.debug('Lazy loading folder', node.text);
                    plugin(workspace, node, function (children) { return addNodes(children); });
                }
                // It seems to be required, as the lazyLoad property deletion done
                // by the treeview component does not seem to work
                node.lazyLoad = false;
            },
            onNodeSelected: function (event, node) {
                // We need to clear any selected node state that may leave outside
                // this tree element sub-graph so that the current selection is
                // correctly taken into account when leaving for a wider tree graph,
                // like when leaving the ActiveMQ or Camel trees to go to the JMX tree.
                var clearSelection = function (n) {
                    if (n.state && n.id !== node.id) {
                        n.state.selected = false;
                    }
                    if (n.children) {
                        n.children.forEach(clearSelection);
                    }
                };
                clearSelection(workspace.tree);
                // Expand one level down
                // Lazy loaded node are automatically expanded once the children get added
                if (!node.lazyLoad) {
                    treeElement.treeview('expandNode', [node, { levels: 1, silent: true }]);
                }
                // Update the workspace state
                // The treeview component clones the node passed with the event
                // so let's lookup the original one
                var selection = treeElement.treeview('getSelected')[0];
                workspace.updateSelectionNode(selection);
                Core.$apply($scope);
            },
            levels: 1,
            data: children,
            collapseIcon: 'fa fa-angle-down',
            expandIcon: 'fa fa-angle-right',
            nodeIcon: 'pficon pficon-folder-close',
            showImage: true,
            highlightSearchResults: true,
            searchResultColor: '#b58100',
            searchResultBackColor: '#fbeabc',
            preventUnselect: true
        });
    }
    Jmx.enableTree = enableTree;
})(Jmx || (Jmx = {}));
/// <reference path="jvmPlugin.ts"/>
var JVM;
(function (JVM) {
    JVM._module.controller("JVM.DiscoveryController", ["$scope", "localStorage", "jolokia", function ($scope, localStorage, jolokia) {
            $scope.discovering = true;
            $scope.agents = undefined;
            $scope.$watch('agents', function (newValue, oldValue) {
                if (newValue !== oldValue) {
                    $scope.selectedAgent = _.find($scope.agents, function (a) { return a['selected']; });
                }
            }, true);
            $scope.closePopover = function ($event) {
                $($event.currentTarget).parents('.popover').prev().popover('hide');
            };
            function getMoreJvmDetails(agents) {
                for (var key in agents) {
                    var agent = agents[key];
                    if (agent.url && !agent.secured) {
                        var dedicatedJolokia = JVM.createJolokia(agent.url, agent.username, agent.password);
                        agent.startTime = dedicatedJolokia.getAttribute('java.lang:type=Runtime', 'StartTime');
                        if (!$scope.hasName(agent)) {
                            agent.command = dedicatedJolokia.getAttribute('java.lang:type=Runtime', 'SystemProperties', 'sun.java.command');
                        }
                    }
                }
            }
            function doConnect(agent) {
                if (!agent.url) {
                    Core.notification('warning', 'No URL available to connect to agent');
                    return;
                }
                var options = JVM.createConnectOptions();
                options.name = agent.agent_description || 'discover-' + agent.agent_id;
                var urlObject = Core.parseUrl(agent.url);
                angular.extend(options, urlObject);
                options.userName = agent.username;
                options.password = agent.password;
                JVM.connectToServer(localStorage, options);
            }
            $scope.connectWithCredentials = function ($event, agent) {
                $scope.closePopover($event);
                doConnect(agent);
            };
            $scope.gotoServer = function ($event, agent) {
                if (agent.secured) {
                    $($event.currentTarget).popover('show');
                }
                else {
                    doConnect(agent);
                }
            };
            $scope.getElementId = function (agent) {
                return agent.agent_id.dasherize().replace(/\./g, "-");
            };
            $scope.getLogo = function (agent) {
                if (agent.server_product) {
                    return JVM.logoRegistry[agent.server_product];
                }
                return JVM.logoRegistry['generic'];
            };
            $scope.filterMatches = function (agent) {
                if (Core.isBlank($scope.filter)) {
                    return true;
                }
                else {
                    var needle = $scope.filter.toLowerCase();
                    var haystack = angular.toJson(agent).toLowerCase();
                    return haystack.indexOf(needle) !== 0;
                }
            };
            $scope.getAgentIdClass = function (agent) {
                if ($scope.hasName(agent)) {
                    return "";
                }
                return "strong";
            };
            $scope.hasName = function (agent) {
                return !!(agent.server_vendor && agent.server_product && agent.server_version);
            };
            $scope.render = function (response) {
                $scope.discovering = false;
                if (response) {
                    var responseJson = angular.toJson(response, true);
                    if ($scope.responseJson !== responseJson) {
                        $scope.responseJson = responseJson;
                        $scope.agents = response;
                        getMoreJvmDetails($scope.agents);
                    }
                }
                Core.$apply($scope);
            };
            $scope.fetch = function () {
                $scope.discovering = true;
                // use 10 sec timeout
                jolokia.execute('jolokia:type=Discovery', 'lookupAgentsWithTimeout(int)', 10 * 1000, Core.onSuccess($scope.render));
            };
            $scope.fetch();
        }]);
})(JVM || (JVM = {}));
/// <reference path="jvmPlugin.ts"/>
var JVM;
(function (JVM) {
    JVM.HeaderController = JVM._module.controller("JVM.HeaderController", ["$scope", "ConnectOptions", function ($scope, ConnectOptions) {
            if (ConnectOptions) {
                $scope.containerName = ConnectOptions.name || "";
                if (ConnectOptions.returnTo) {
                    $scope.goBack = function () {
                        window.location.href = ConnectOptions.returnTo;
                    };
                }
            }
        }]);
})(JVM || (JVM = {}));
/// <reference path="jvmPlugin.ts"/>
var JVM;
(function (JVM) {
    JolokiaPreferences.$inject = ["$scope", "localStorage", "jolokiaParams", "$window"];
    var SHOW_ALERT = 'showJolokiaPreferencesAlert';
    function JolokiaPreferences($scope, localStorage, jolokiaParams, $window) {
        'ngInject';
        // Initialize tooltips
        $('[data-toggle="tooltip"]').tooltip();
        Core.initPreferenceScope($scope, localStorage, {
            'updateRate': {
                'value': 5000,
                'post': function (newValue) {
                    $scope.$emit('UpdateRate', newValue);
                }
            },
            'maxDepth': {
                'value': JVM.DEFAULT_MAX_DEPTH,
                'converter': parseInt,
                'formatter': parseInt,
                'post': function (newValue) {
                    jolokiaParams.maxDepth = newValue;
                    localStorage['jolokiaParams'] = angular.toJson(jolokiaParams);
                }
            },
            'maxCollectionSize': {
                'value': JVM.DEFAULT_MAX_COLLECTION_SIZE,
                'converter': parseInt,
                'formatter': parseInt,
                'post': function (newValue) {
                    jolokiaParams.maxCollectionSize = newValue;
                    localStorage['jolokiaParams'] = angular.toJson(jolokiaParams);
                }
            }
        });
        $scope.showAlert = !!$window.sessionStorage.getItem(SHOW_ALERT);
        $window.sessionStorage.removeItem(SHOW_ALERT);
        $scope.reboot = function () {
            $window.sessionStorage.setItem(SHOW_ALERT, 'true');
            $window.location.reload();
        };
    }
    JVM.JolokiaPreferences = JolokiaPreferences;
    JVM._module.controller("JVM.JolokiaPreferences", JolokiaPreferences);
})(JVM || (JVM = {}));
var JVM;
(function (JVM) {
    var JolokiaService = /** @class */ (function () {
        JolokiaService.$inject = ["$q", "jolokia"];
        function JolokiaService($q, jolokia) {
            'ngInject';
            this.$q = $q;
            this.jolokia = jolokia;
        }
        JolokiaService.prototype.getAttribute = function (mbean, attribute) {
            var _this = this;
            return this.$q(function (resolve, reject) {
                _this.jolokia.request({ type: 'read', mbean: mbean, attribute: attribute }, Core.onSuccess(function (response) {
                    resolve(response.value);
                }, {
                    error: function (response) {
                        JVM.log.error("JolokiaService.getAttribute('" + mbean + "', '" + attribute + "') failed. Error: " + response.error);
                        reject(response.error);
                    }
                }));
            });
        };
        JolokiaService.prototype.execute = function (mbean, operation) {
            var _this = this;
            var args = [];
            for (var _i = 2; _i < arguments.length; _i++) {
                args[_i - 2] = arguments[_i];
            }
            return this.$q(function (resolve, reject) {
                _this.jolokia.request({ type: 'exec', mbean: mbean, operation: operation, arguments: args }, Core.onSuccess(function (response) {
                    resolve(response.value);
                }, {
                    error: function (response) {
                        JVM.log.error("JolokiaService.execute('" + mbean + "', '" + operation + "', '" + args + "') failed. Error: " + response.error);
                        reject(response.error);
                    }
                }));
            });
        };
        JolokiaService.prototype.readMany = function (mbeans) {
            var _this = this;
            return this.$q(function (resolve, reject) {
                var requests = mbeans.map(function (mbean) { return ({ type: "read", mbean: mbean }); });
                var objects = [];
                _this.jolokia.request(requests, Core.onSuccess(function (response) {
                    objects.push(response.value);
                    if (objects.length === requests.length) {
                        resolve(objects);
                    }
                }, {
                    error: function (response) {
                        JVM.log.error("JolokiaService.readMany('" + mbeans + "') failed. Error: " + response.error);
                        reject(response.error);
                    }
                }));
            });
        };
        return JolokiaService;
    }());
    JVM.JolokiaService = JolokiaService;
    JVM._module.service("jolokiaService", JolokiaService);
})(JVM || (JVM = {}));
/// <reference path="jvmPlugin.ts"/>
/**
 * @module JVM
 */
var JVM;
(function (JVM) {
    JVM._module.controller("JVM.JVMsController", ["$scope", "$location", "localStorage", "workspace", "jolokia", "mbeanName", function ($scope, $location, localStorage, workspace, jolokia, mbeanName) {
            JVM.configureScope($scope, $location, workspace);
            $scope.data = [];
            $scope.deploying = false;
            $scope.status = '';
            $scope.initDone = false;
            $scope.filter = '';
            var listRequest = {
                type: 'exec', mbean: mbeanName,
                operation: 'listLocalJVMs()',
                arguments: []
            };
            $scope.filterMatches = function (jvm) {
                if (Core.isBlank($scope.filter)) {
                    return true;
                }
                else {
                    return jvm.alias.toLowerCase().has($scope.filter.toLowerCase());
                }
            };
            $scope.fetch = function () {
                jolokia.request(listRequest, {
                    success: render,
                    error: function (response) {
                        $scope.data = [];
                        $scope.initDone = true;
                        $scope.status = 'Could not discover local JVM processes: ' + response.error;
                        Core.$apply($scope);
                    }
                });
            };
            $scope.stopAgent = function (pid) {
                jolokia.request([{
                        type: 'exec', mbean: mbeanName,
                        operation: 'stopAgent(java.lang.String)',
                        arguments: [pid]
                    }, listRequest], Core.onSuccess(renderIfList));
            };
            $scope.startAgent = function (pid) {
                jolokia.request([{
                        type: 'exec', mbean: mbeanName,
                        operation: 'startAgent(java.lang.String)',
                        arguments: [pid]
                    }, listRequest], Core.onSuccess(renderIfList));
            };
            $scope.connectTo = function (url, scheme, host, port, path) {
                // we only need the port and path from the url, as we got the rest
                var options = {
                    scheme: scheme,
                    host: host,
                    port: port,
                    path: path
                };
                var con = JVM.createConnectOptions(options);
                con.name = "local-" + port;
                JVM.log.debug("Connecting to local JVM agent: " + url);
                JVM.connectToServer(localStorage, con);
                Core.$apply($scope);
            };
            /**
             * Since the requests are bundled, check the operation in callback to decide on
             * how to respond to success
             */
            function renderIfList(response) {
                if (response.request.operation.indexOf("listLocalJVMs") > -1) {
                    render(response);
                }
            }
            function render(response) {
                $scope.initDone = true;
                $scope.data = response.value;
                if ($scope.data.length === 0) {
                    $scope.status = 'Could not discover local JVM processes';
                }
                Core.$apply($scope);
            }
            $scope.fetch();
        }]);
})(JVM || (JVM = {}));
/// <reference path="./jvmPlugin.ts"/>
var JVM;
(function (JVM) {
    JVM._module.controller("JVM.NavController", ["$scope", "$location", "workspace", function ($scope, $location, workspace) {
            JVM.configureScope($scope, $location, workspace);
            $scope.isLocalEnabled = JVM.hasLocalMBean(workspace);
            $scope.isDiscoveryEnabled = JVM.hasDiscoveryMBean(workspace);
        }]);
})(JVM || (JVM = {}));
/// <reference path="./jvmPlugin.ts"/>
var JVM;
(function (JVM) {
    JVM._module.controller("JVM.ResetController", ["$scope", "localStorage", function ($scope, localStorage) {
            $scope.showAlert = false;
            $scope.doClearConnectSettings = function () {
                delete localStorage[JVM.connectControllerKey];
                delete localStorage[JVM.connectionSettingsKey];
                $scope.showAlert = true;
            };
        }]);
})(JVM || (JVM = {}));
var RBAC;
(function (RBAC) {
    var JmxTreeProcessor = /** @class */ (function () {
        function JmxTreeProcessor(jolokia, jolokiaStatus, rbacTasks, workspace) {
            this.jolokia = jolokia;
            this.jolokiaStatus = jolokiaStatus;
            this.rbacTasks = rbacTasks;
            this.workspace = workspace;
        }
        JmxTreeProcessor.prototype.process = function (tree) {
            var _this = this;
            RBAC.log.debug("Processing tree", tree);
            this.rbacTasks.getACLMBean().then(function (aclMBean) {
                var mbeans = {};
                _this.flattenMBeanTree(mbeans, tree);
                var listMethod = _this.jolokiaStatus.listMethod;
                switch (listMethod) {
                    case JVM.JolokiaListMethod.LIST_WITH_RBAC:
                        RBAC.log.debug("Process JMX tree: list with RBAC mode");
                        _this.processWithRBAC(mbeans);
                        RBAC.log.debug("Processed tree mbeans with RBAC", mbeans);
                        break;
                    case JVM.JolokiaListMethod.LIST_GENERAL:
                    case JVM.JolokiaListMethod.LIST_CANT_DETERMINE:
                    default:
                        RBAC.log.debug("Process JMX tree: general mode");
                        _this.processGeneral(aclMBean, mbeans);
                        RBAC.log.debug("Processed tree mbeans", mbeans);
                        break;
                }
            });
        };
        JmxTreeProcessor.prototype.flattenMBeanTree = function (mbeans, tree) {
            var _this = this;
            if (!Core.isBlank(tree.objectName)) {
                mbeans[tree.objectName] = tree;
            }
            if (tree.isFolder()) {
                tree.children.forEach(function (child) { return _this.flattenMBeanTree(mbeans, child); });
            }
        };
        JmxTreeProcessor.prototype.processWithRBAC = function (mbeans) {
            var _this = this;
            // we already have everything related to RBAC in place, except 'class' property
            _.forEach(mbeans, function (node, mbeanName) {
                var mbean = node.mbean;
                var canInvoke = mbean && (_.isNil(mbean.canInvoke) || mbean.canInvoke);
                _this.addCanInvokeToClass(node, canInvoke);
            });
        };
        JmxTreeProcessor.prototype.processGeneral = function (aclMBean, mbeans) {
            var _this = this;
            var requests = [];
            var bulkRequest = {};
            _.forEach(mbeans, function (mbean, mbeanName) {
                if (!('canInvoke' in mbean)) {
                    requests.push({
                        type: 'exec',
                        mbean: aclMBean,
                        operation: 'canInvoke(java.lang.String)',
                        arguments: [mbeanName]
                    });
                    if (mbean.mbean && mbean.mbean.op) {
                        var ops = mbean.mbean.op;
                        mbean.mbean.opByString = {};
                        var opList_1 = [];
                        _.forEach(ops, function (op, opName) {
                            if (_.isArray(op)) {
                                _.forEach(op, function (op) { return _this.addOperation(mbean, opList_1, opName, op); });
                            }
                            else {
                                _this.addOperation(mbean, opList_1, opName, op);
                            }
                        });
                        bulkRequest[mbeanName] = opList_1;
                    }
                }
            });
            requests.push({
                type: 'exec',
                mbean: aclMBean,
                operation: 'canInvoke(java.util.Map)',
                arguments: [bulkRequest]
            });
            this.jolokia.request(requests, Core.onSuccess(function (response) {
                var mbean = response.request.arguments[0];
                if (mbean && _.isString(mbean)) {
                    var canInvoke = response.value;
                    mbeans[mbean]['canInvoke'] = response.value;
                    _this.addCanInvokeToClass(mbeans[mbean], canInvoke);
                }
                else {
                    var responseMap = response.value;
                    _.forEach(responseMap, function (operations, mbeanName) {
                        _.forEach(operations, function (data, operationName) {
                            mbeans[mbeanName].mbean.opByString[operationName]['canInvoke'] = data['CanInvoke'];
                        });
                    });
                }
            }, { error: function (response) { } }));
        };
        JmxTreeProcessor.prototype.addOperation = function (mbean, opList, opName, op) {
            var operationString = Core.operationToString(opName, op.args);
            // enrich the mbean by indexing the full operation string so we can easily look it up later
            mbean.mbean.opByString[operationString] = op;
            opList.push(operationString);
        };
        JmxTreeProcessor.prototype.addCanInvokeToClass = function (mbean, canInvoke) {
            var toAdd = canInvoke ? "can-invoke" : "cant-invoke";
            mbean['class'] = this.stripClasses(mbean['class']);
            mbean['class'] = this.addClass(mbean['class'], toAdd);
            if (!canInvoke) {
                // change the tree node icon to lock here
                mbean.icon = 'fa fa-lock';
            }
        };
        JmxTreeProcessor.prototype.stripClasses = function (css) {
            if (Core.isBlank(css)) {
                return css;
            }
            var parts = css.split(" ");
            var answer = [];
            parts.forEach(function (part) {
                if (part !== "can-invoke" && part !== "cant-invoke") {
                    answer.push(part);
                }
            });
            return answer.join(" ").trim();
        };
        JmxTreeProcessor.prototype.addClass = function (css, _class) {
            if (Core.isBlank(css)) {
                return _class;
            }
            var parts = css.split(" ");
            parts.push(_class);
            return _.uniq(parts).join(" ").trim();
        };
        return JmxTreeProcessor;
    }());
    RBAC.JmxTreeProcessor = JmxTreeProcessor;
})(RBAC || (RBAC = {}));
/// <reference path="../../jmx/ts/workspace.ts"/>
var RBAC;
(function (RBAC) {
    var MBEAN_ONLY = 'canInvoke(java.lang.String)';
    var OVERLOADED_METHOD = 'canInvoke(java.lang.String,java.lang.String)';
    var EXACT_METHOD = 'canInvoke(java.lang.String,java.lang.String,[Ljava.lang.String;)';
    var HIDE = 'hide';
    var REMOVE = 'remove';
    var INVERSE = 'inverse';
    /**
     * Directive that sets an element's visibility to hidden if the user cannot invoke the supplied operation
     */
    var HawtioShow = /** @class */ (function () {
        function HawtioShow(workspace) {
            this.workspace = workspace;
            this.restrict = 'A';
        }
        HawtioShow.factory = ["workspace", function (workspace) {
            'ngInject';
            return new HawtioShow(workspace);
        }];
        HawtioShow.prototype.link = function (scope, element, attr) {
            var _this = this;
            var objectName = attr['objectName'];
            var objectNameModel = attr['objectNameModel'];
            RBAC.log.debug("hawtio-show: object-name=", objectName, "object-name-model=", objectNameModel);
            if (!objectName && !objectNameModel) {
                return;
            }
            if (objectName) {
                this.applyInvokeRights(element, objectName, attr);
            }
            else {
                scope.$watch(objectNameModel, function (newValue, oldValue) {
                    if (newValue && newValue !== oldValue) {
                        _this.applyInvokeRights(element, newValue, attr);
                    }
                });
            }
        };
        HawtioShow.prototype.applyInvokeRights = function (element, objectName, attr) {
            var methodName = attr['methodName'];
            var argumentTypes = attr['argumentTypes'];
            var mode = attr['mode'] || HIDE;
            var canInvokeOp = this.getCanInvokeOperation(methodName, argumentTypes);
            var args = this.getArguments(canInvokeOp, objectName, methodName, argumentTypes);
            var mbean = Core.parseMBean(objectName);
            var folder = this.workspace.findMBeanWithProperties(mbean.domain, mbean.attributes);
            if (!folder) {
                return;
            }
            var invokeRights = methodName ?
                this.workspace.hasInvokeRights(folder, methodName) :
                this.workspace.hasInvokeRights(folder);
            this.changeDisplay(element, invokeRights, mode);
        };
        HawtioShow.prototype.getCanInvokeOperation = function (methodName, argumentTypes) {
            var answer = MBEAN_ONLY;
            if (!Core.isBlank(methodName)) {
                answer = OVERLOADED_METHOD;
            }
            if (!Core.isBlank(argumentTypes)) {
                answer = EXACT_METHOD;
            }
            return answer;
        };
        HawtioShow.prototype.getArguments = function (canInvokeOp, objectName, methodName, argumentTypes) {
            var args = [];
            if (canInvokeOp === MBEAN_ONLY) {
                args.push(objectName);
            }
            else if (canInvokeOp === OVERLOADED_METHOD) {
                args.push(objectName);
                args.push(methodName);
            }
            else if (canInvokeOp === EXACT_METHOD) {
                args.push(objectName);
                args.push(methodName);
                args.push(argumentTypes.split(',').map(function (s) { return s.trim(); }));
            }
            return args;
        };
        HawtioShow.prototype.changeDisplay = function (element, invokeRights, mode) {
            if (invokeRights) {
                if (mode === INVERSE) {
                    element.css({ display: 'none' });
                }
            }
            else {
                if (mode === REMOVE) {
                    element.css({ display: 'none' });
                }
                else if (mode === HIDE) {
                    element.css({ visibility: 'hidden' });
                }
            }
        };
        return HawtioShow;
    }());
    RBAC.HawtioShow = HawtioShow;
})(RBAC || (RBAC = {}));
/// <reference path="models.ts"/>
var RBAC;
(function (RBAC) {
    var RBACTasksFactory = /** @class */ (function () {
        function RBACTasksFactory() {
        }
        RBACTasksFactory.create = ["postLoginTasks", "jolokia", "$q", function (postLoginTasks, jolokia, $q) {
            'ngInject';
            var rbacTasks = new RBACTasksImpl($q.defer());
            postLoginTasks.addTask("FetchJMXSecurityMBeans", function () { return rbacTasks.fetchJMXSecurityMBeans(jolokia); });
            return rbacTasks;
        }];
        return RBACTasksFactory;
    }());
    RBAC.RBACTasksFactory = RBACTasksFactory;
    var RBACACLMBeanFactory = /** @class */ (function () {
        function RBACACLMBeanFactory() {
        }
        RBACACLMBeanFactory.create = ["rbacTasks", function (rbacTasks) {
            'ngInject';
            return rbacTasks.getACLMBean();
        }];
        return RBACACLMBeanFactory;
    }());
    RBAC.RBACACLMBeanFactory = RBACACLMBeanFactory;
    var RBACTasksImpl = /** @class */ (function (_super) {
        __extends(RBACTasksImpl, _super);
        function RBACTasksImpl(deferred) {
            var _this = _super.call(this, "RBAC") || this;
            _this.deferred = deferred;
            _this.ACLMBean = null;
            return _this;
        }
        RBACTasksImpl.prototype.fetchJMXSecurityMBeans = function (jolokia) {
            var _this = this;
            jolokia.request({ type: 'search', mbean: '*:type=security,area=jmx,*' }, Core.onSuccess(function (response) {
                RBAC.log.debug("Fetching JMXSecurity MBeans...", response);
                var mbeans = response.value;
                var chosen = "";
                if (mbeans.length === 0) {
                    RBAC.log.info("Didn't discover any JMXSecurity mbeans, client-side role based access control is disabled");
                    return;
                }
                else if (mbeans.length === 1) {
                    chosen = mbeans[0];
                }
                else if (mbeans.length > 1) {
                    var picked_1 = false;
                    mbeans.forEach(function (mbean) {
                        if (picked_1) {
                            return;
                        }
                        if (_.includes(mbean, "HawtioDummy")) {
                            return;
                        }
                        if (!_.includes(mbean, "rank=")) {
                            chosen = mbean;
                            picked_1 = true;
                        }
                    });
                }
                if (chosen != null && chosen != "") {
                    RBAC.log.info("Using mbean", chosen, "for client-side role based access control");
                    _this.initialize(chosen);
                }
                else {
                    RBAC.log.info("Didn't discover any effective JMXSecurity mbeans, client-side role based access control is disabled");
                }
            }));
        };
        RBACTasksImpl.prototype.initialize = function (mbean) {
            this.ACLMBean = mbean;
            this.deferred.resolve(this.ACLMBean);
            _super.prototype.execute.call(this);
        };
        RBACTasksImpl.prototype.getACLMBean = function () {
            return this.deferred.promise;
        };
        return RBACTasksImpl;
    }(Core.Tasks));
})(RBAC || (RBAC = {}));
/**
 * @namespace RBAC
 * @main RBAC
 */
/// <reference path="../../jmx/ts/workspace.ts"/>
/// <reference path="../../jvm/ts/jolokiaService.ts"/>
/// <reference path="models.ts"/>
/// <reference path="rbac.directive.ts"/>
/// <reference path="rbac.service.ts"/>
/// <reference path="jmxTreeProcessor.ts"/>
var RBAC;
(function (RBAC) {
    addTreePostProcessor.$inject = ["jolokia", "jolokiaStatus", "rbacTasks", "preLogoutTasks", "workspace"];
    RBAC.pluginName = "hawtio-rbac";
    RBAC.log = Logger.get(RBAC.pluginName);
    angular
        .module(RBAC.pluginName, [])
        .directive('hawtioShow', RBAC.HawtioShow.factory)
        .service('rbacTasks', RBAC.RBACTasksFactory.create)
        .service('rbacACLMBean', RBAC.RBACACLMBeanFactory.create)
        .run(addTreePostProcessor);
    var TREE_POSTPROCESSOR_NAME = "rbacTreePostprocessor";
    function addTreePostProcessor(jolokia, jolokiaStatus, rbacTasks, preLogoutTasks, workspace) {
        'ngInject';
        preLogoutTasks.addTask("ResetRBAC", function () {
            RBAC.log.debug("Resetting RBAC tasks");
            rbacTasks.reset();
            workspace.removeNamedTreePostProcessor(TREE_POSTPROCESSOR_NAME);
        });
        // add info to the JMX tree if we have access to invoke on mbeans or not
        var processor = new RBAC.JmxTreeProcessor(jolokia, jolokiaStatus, rbacTasks, workspace);
        rbacTasks.addTask("JMXTreePostProcess", function () { return workspace.addNamedTreePostProcessor(TREE_POSTPROCESSOR_NAME, function (tree) { return processor.process(tree); }); });
    }
    hawtioPluginLoader.addModule(RBAC.pluginName);
})(RBAC || (RBAC = {}));
var Runtime;
(function (Runtime) {
    var RuntimeService = /** @class */ (function () {
        RuntimeService.$inject = ["workspace"];
        function RuntimeService(workspace) {
            'ngInject';
            this.workspace = workspace;
        }
        RuntimeService.prototype.getTabs = function () {
            var tabs = [
                new Nav.HawtioTab('System Properties', '/runtime/sysprops'),
                new Nav.HawtioTab('Metrics', '/runtime/metrics')
            ];
            if (this.workspace.treeContainsDomainAndProperties('java.lang', { type: 'Threading' })) {
                tabs.push(new Nav.HawtioTab('Threads', '/runtime/threads'));
            }
            return tabs;
        };
        return RuntimeService;
    }());
    Runtime.RuntimeService = RuntimeService;
})(Runtime || (Runtime = {}));
/// <reference path="runtime.service.ts"/>
var Runtime;
(function (Runtime) {
    var RuntimeController = /** @class */ (function () {
        RuntimeController.$inject = ["$scope", "$location", "workspace", "runtimeService"];
        function RuntimeController($scope, $location, workspace, runtimeService) {
            'ngInject';
            this.$scope = $scope;
            this.$location = $location;
            this.workspace = workspace;
            this.runtimeService = runtimeService;
        }
        RuntimeController.prototype.$onInit = function () {
            var _this = this;
            if (this.workspace.tree.children.length > 0) {
                this.tabs = this.runtimeService.getTabs();
            }
            else {
                this.$scope.$on('jmxTreeUpdated', function () {
                    _this.tabs = _this.runtimeService.getTabs();
                });
            }
        };
        RuntimeController.prototype.goto = function (tab) {
            this.$location.path(tab.path);
        };
        ;
        return RuntimeController;
    }());
    Runtime.RuntimeController = RuntimeController;
    Runtime.runtimeComponent = {
        template: "\n      <div class=\"nav-tabs-main\">\n        <hawtio-tabs tabs=\"$ctrl.tabs\" on-change=\"$ctrl.goto(tab)\"></hawtio-tabs>\n        <div class=\"contents\" ng-view></div>\n      </div>\n    ",
        controller: RuntimeController
    };
})(Runtime || (Runtime = {}));
var Runtime;
(function (Runtime) {
    configureRoutes.$inject = ["$routeProvider"];
    configureRuntime.$inject = ["$rootScope", "$templateCache", "viewRegistry", "helpRegistry", "workspace"];
    function configureRoutes($routeProvider) {
        'ngInject';
        $routeProvider
            .when('/runtime', { redirectTo: '/runtime/sysprops' })
            .when('/runtime/sysprops', { template: '<runtime-system-properties></runtime-system-properties>' })
            .when('/runtime/metrics', { template: '<runtime-metrics></runtime-metrics>' })
            .when('/runtime/threads', { templateUrl: 'plugins/runtime/threads/threads.html' });
    }
    Runtime.configureRoutes = configureRoutes;
    function configureRuntime($rootScope, $templateCache, viewRegistry, helpRegistry, workspace) {
        'ngInject';
        var templateCacheKey = 'runtime.html';
        $templateCache.put(templateCacheKey, '<runtime></runtime>');
        viewRegistry['runtime'] = templateCacheKey;
        helpRegistry.addUserDoc('runtime', 'plugins/runtime/doc/help.md');
        var unsubscribe = $rootScope.$on('jmxTreeUpdated', function () {
            unsubscribe();
            workspace.topLevelTabs.push({
                id: "runtime",
                content: "Runtime",
                title: "Runtime",
                isValid: function () { return workspace.treeContainsDomainAndProperties('java.lang'); },
                href: function () { return '/runtime'; },
                isActive: function (workspace) { return workspace.isMainTabActive('runtime'); }
            });
        });
    }
    Runtime.configureRuntime = configureRuntime;
})(Runtime || (Runtime = {}));
/// <reference path="sysprop.ts"/>
var Runtime;
(function (Runtime) {
    var SystemPropertiesService = /** @class */ (function () {
        SystemPropertiesService.$inject = ["jolokiaService"];
        function SystemPropertiesService(jolokiaService) {
            'ngInject';
            this.jolokiaService = jolokiaService;
        }
        SystemPropertiesService.prototype.getSystemProperties = function () {
            return this.jolokiaService.getAttribute('java.lang:type=Runtime', null)
                .then(function (data) {
                var systemProperties = [];
                angular.forEach(data.SystemProperties, function (value, key) {
                    var sysprop = {
                        name: key,
                        value: value
                    };
                    systemProperties.push(sysprop);
                });
                return systemProperties;
            });
        };
        return SystemPropertiesService;
    }());
    Runtime.SystemPropertiesService = SystemPropertiesService;
})(Runtime || (Runtime = {}));
/// <reference path="sysprops.service.ts"/>
/// <reference path="sysprop.ts"/>
var Runtime;
(function (Runtime) {
    var SystemPropertiesController = /** @class */ (function () {
        SystemPropertiesController.$inject = ["systemPropertiesService"];
        function SystemPropertiesController(systemPropertiesService) {
            'ngInject';
            var _this = this;
            this.systemPropertiesService = systemPropertiesService;
            this.toolbarConfig = {
                filterConfig: {
                    fields: [
                        {
                            id: 'name',
                            title: 'Name',
                            placeholder: 'Filter by name...',
                            filterType: 'text'
                        },
                        {
                            id: 'value',
                            title: 'Value',
                            placeholder: 'Filter by value...',
                            filterType: 'text'
                        },
                    ],
                    onFilterChange: function (filters) {
                        _this.applyFilters(filters);
                    },
                    resultsCount: 0
                },
                isTableView: true
            };
            this.tableConfig = {
                selectionMatchProp: 'name',
                showCheckboxes: false
            };
            this.pageConfig = {
                pageSize: 20
            };
            this.tableColumns = [
                {
                    header: 'Property',
                    itemField: 'name',
                },
                {
                    header: 'Value',
                    itemField: 'value',
                }
            ];
            this.tableDtOptions = {
                order: [[0, "asc"]]
            };
            this.sysprops = [];
            this.tableItems = [];
        }
        SystemPropertiesController.prototype.$onInit = function () {
            this.loadData();
        };
        SystemPropertiesController.prototype.loadData = function () {
            var _this = this;
            this.systemPropertiesService.getSystemProperties()
                .then(function (sysprops) {
                _this.sysprops = sysprops;
                _this.tableItems = sysprops;
                _this.toolbarConfig.filterConfig.resultsCount = sysprops.length;
            }).catch(function (error) { return Core.notification('danger', error); });
            ;
        };
        SystemPropertiesController.prototype.applyFilters = function (filters) {
            var filteredSysProps = this.sysprops;
            filters.forEach(function (filter) {
                var regExp = new RegExp(filter.value, 'i');
                switch (filter.id) {
                    case 'name':
                        filteredSysProps = filteredSysProps.filter(function (sysprop) { return sysprop.name.match(regExp) !== null; });
                        break;
                    case 'value':
                        filteredSysProps = filteredSysProps.filter(function (sysprop) { return sysprop.value.match(regExp) !== null; });
                        break;
                }
            });
            this.tableItems = filteredSysProps;
            this.toolbarConfig.filterConfig.resultsCount = filteredSysProps.length;
        };
        return SystemPropertiesController;
    }());
    Runtime.SystemPropertiesController = SystemPropertiesController;
    Runtime.systemPropertiesComponent = {
        template: "\n      <div class=\"table-view runtime-sysprops-main\">\n        <h1>System Properties</h1>\n        <pf-toolbar config=\"$ctrl.toolbarConfig\"></pf-toolbar>\n        <pf-table-view config=\"$ctrl.tableConfig\"\n                       columns=\"$ctrl.tableColumns\"\n                       items=\"$ctrl.tableItems\"\n                       page-config=\"$ctrl.pageConfig\"\n                       dt-options=\"$ctrl.tableDtOptions\">\n        </pf-table-view>\n      </div>\n    ",
        controller: SystemPropertiesController
    };
})(Runtime || (Runtime = {}));
/// <reference path="sysprops.component.ts"/>
/// <reference path="sysprops.service.ts"/>
var Runtime;
(function (Runtime) {
    Runtime.systemPropertiesModule = angular
        .module('runtime-system-properties', [])
        .component('runtimeSystemProperties', Runtime.systemPropertiesComponent)
        .service('systemPropertiesService', Runtime.SystemPropertiesService)
        .name;
})(Runtime || (Runtime = {}));
var Runtime;
(function (Runtime) {
    var MetricsService = /** @class */ (function () {
        MetricsService.$inject = ["jolokia", "workspace"];
        function MetricsService(jolokia, workspace) {
            'ngInject';
            this.jolokia = jolokia;
            this.workspace = workspace;
        }
        MetricsService.prototype.registerJolokiaRequests = function (scope, callback) {
            var requests = [
                this.createMBeanRequest('java.lang:type=Threading'),
                this.createMBeanRequest('java.lang:type=Memory'),
                this.createMBeanRequest('java.lang:type=OperatingSystem'),
                this.createMBeanRequest('java.lang:type=ClassLoading'),
                this.createMBeanRequest('java.lang:type=Runtime'),
                this.createMBeanRequest('org.springframework.boot:type=Endpoint,name=metricsEndpoint')
            ];
            Core.register(this.jolokia, scope, requests, Core.onSuccess(callback));
        };
        MetricsService.prototype.unregisterJolokiaRequests = function (scope) {
            Core.unregister(this.jolokia, scope);
        };
        MetricsService.prototype.createMetric = function (name, value, unit) {
            return new Runtime.Metric(name, value, unit);
        };
        MetricsService.prototype.createUtilizationMetric = function (name, used, total, unit) {
            return new Runtime.UtilizationMetric(name, used, total, unit);
        };
        MetricsService.prototype.createMBeanRequest = function (mbean) {
            return {
                type: 'read',
                mbean: mbean,
                arguments: []
            };
        };
        return MetricsService;
    }());
    Runtime.MetricsService = MetricsService;
})(Runtime || (Runtime = {}));
var Runtime;
(function (Runtime) {
    var MetricType;
    (function (MetricType) {
        MetricType["JVM"] = "JVM";
        MetricType["SYSTEM"] = "System";
        MetricType["SPRING_BOOT"] = "Spring Boot";
    })(MetricType = Runtime.MetricType || (Runtime.MetricType = {}));
    var Metric = /** @class */ (function () {
        function Metric(name, value, unit) {
            this.name = name;
            this.value = value;
            this.unit = unit;
        }
        Metric.prototype.getDescription = function () {
            return this.name + ": " + this.value + (this.unit != null ? " " + this.unit : "");
        };
        return Metric;
    }());
    Runtime.Metric = Metric;
    var UtilizationMetric = /** @class */ (function (_super) {
        __extends(UtilizationMetric, _super);
        function UtilizationMetric(name, value, available, unit) {
            var _this = _super.call(this, name, value, unit) || this;
            _this.name = name;
            _this.value = value;
            _this.available = available;
            _this.unit = unit;
            return _this;
        }
        UtilizationMetric.prototype.getDescription = function () {
            var unitDescription = (this.unit != null ? ' ' + this.unit : '');
            var description = this.name + ": " + this.value;
            description += " " + unitDescription + " of";
            description += " " + this.available + unitDescription;
            return description;
        };
        return UtilizationMetric;
    }(Metric));
    Runtime.UtilizationMetric = UtilizationMetric;
    var MetricGroup = /** @class */ (function () {
        function MetricGroup(type, metrics) {
            if (metrics === void 0) { metrics = []; }
            this.type = type;
            this.metrics = metrics;
        }
        MetricGroup.prototype.updateMetrics = function (metrics) {
            var _this = this;
            metrics.forEach(function (metric) {
                var index = _this.metrics.map(function (m) { return m.name; }).indexOf(metric.name);
                if (index === -1) {
                    _this.metrics.push(metric);
                }
                else {
                    _this.metrics[index] = metric;
                }
            });
        };
        return MetricGroup;
    }());
    Runtime.MetricGroup = MetricGroup;
})(Runtime || (Runtime = {}));
/// <reference path="metrics.service.ts"/>
/// <reference path="metric.ts"/>
var Runtime;
(function (Runtime) {
    var MetricsController = /** @class */ (function () {
        MetricsController.$inject = ["$scope", "metricsService", "$filter", "humanizeService"];
        function MetricsController($scope, metricsService, $filter, humanizeService) {
            'ngInject';
            this.$scope = $scope;
            this.metricsService = metricsService;
            this.$filter = $filter;
            this.humanizeService = humanizeService;
            this.metricGroups = [];
        }
        MetricsController.prototype.$onInit = function () {
            var _this = this;
            this.loading = true;
            this.metricsService.registerJolokiaRequests(this.$scope, function (result) {
                _this.loading = false;
                _this.loadMetrics(result);
            });
        };
        MetricsController.prototype.$onDestroy = function () {
            this.metricsService.unregisterJolokiaRequests(this.$scope);
        };
        MetricsController.prototype.loadMetrics = function (result) {
            var _this = this;
            var metrics = result.value;
            var updates = [];
            var updateType;
            switch (result.request.mbean) {
                case 'java.lang:type=Threading':
                    updateType = Runtime.MetricType.JVM;
                    updates.push(this.metricsService.createMetric('Thread count', metrics.ThreadCount));
                    break;
                case 'java.lang:type=Memory':
                    updateType = Runtime.MetricType.JVM;
                    var heapUsed = this.formatBytes(metrics.HeapMemoryUsage.used);
                    updates.push(this.metricsService.createMetric('Heap used', heapUsed[0], heapUsed[1]));
                    break;
                case 'java.lang:type=OperatingSystem':
                    var filterNumeric = this.$filter('number');
                    var cpuLoad = filterNumeric(metrics.SystemCpuLoad * 100, 2);
                    var loadAverage = filterNumeric(metrics.SystemLoadAverage, 2);
                    var memFree = this.formatBytes(metrics.FreePhysicalMemorySize);
                    var memTotal = this.formatBytes(metrics.TotalPhysicalMemorySize);
                    updateType = Runtime.MetricType.SYSTEM;
                    updates.push(this.metricsService.createMetric('Available processors', metrics.AvailableProcessors));
                    updates.push(this.metricsService.createMetric('CPU load', cpuLoad, '%'));
                    updates.push(this.metricsService.createMetric('Load average', loadAverage));
                    updates.push(this.metricsService.createUtilizationMetric('Memory used', memFree[0], memTotal[0], memFree[1]));
                    updates.push(this.metricsService.createUtilizationMetric('File descriptors used', metrics.OpenFileDescriptorCount, metrics.MaxFileDescriptorCount));
                    break;
                case 'java.lang:type=ClassLoading':
                    updateType = Runtime.MetricType.JVM;
                    updates.push(this.metricsService.createMetric('Classes loaded', metrics.LoadedClassCount));
                    break;
                case 'java.lang:type=Runtime':
                    var filterDate = this.$filter('date');
                    updateType = Runtime.MetricType.JVM;
                    updates.push(this.metricsService.createMetric('Start time', filterDate(metrics.StartTime, 'yyyy-MM-dd HH:mm:ss')));
                    updates.push(this.metricsService.createMetric('Uptime', Core.humanizeMilliseconds(metrics.Uptime)));
                    break;
                case 'org.springframework.boot:type=Endpoint,name=metricsEndpoint':
                    updateType = Runtime.MetricType.SPRING_BOOT;
                    // Filter out metrics that are already shown under JVM & Runtime
                    Object.keys(metrics.Data).filter(function (key) {
                        return !/^(mem|processors|instance|uptime|heap|nonheap|threads|classes|gc|systemload)/.test(key);
                    }).forEach(function (metricName) {
                        updates.push(_this.metricsService.createMetric(_this.humanizeService.toSentenceCase(metricName), metrics.Data[metricName]));
                    });
                    break;
            }
            this.getMetricGroup(updateType).updateMetrics(updates);
            Core.$apply(this.$scope);
        };
        MetricsController.prototype.getMetricGroup = function (type) {
            var match = this.metricGroups.filter(function (group) { return group.type === type; });
            if (match.length > 0) {
                return match[0];
            }
            else {
                var metricGroup = new Runtime.MetricGroup(type);
                this.metricGroups.push(metricGroup);
                return metricGroup;
            }
        };
        MetricsController.prototype.formatBytes = function (bytes) {
            if (bytes == 0) {
                return [0, 'Bytes'];
            }
            var killobyte = 1024;
            var decimalPlaces = 2;
            var units = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
            var i = Math.floor(Math.log(bytes) / Math.log(killobyte));
            var value = parseFloat((bytes / Math.pow(killobyte, i)).toFixed(decimalPlaces));
            var unit = units[i];
            return [value, unit];
        };
        return MetricsController;
    }());
    Runtime.MetricsController = MetricsController;
    Runtime.metricsComponent = {
        template: "\n      <div class=\"runtime-metrics-main\">\n        <h1>Metrics</h1>\n        <div class=\"blank-slate-pf no-border\" ng-if=\"$ctrl.loading === false && $ctrl.metricGroups.length === 0\">\n          <div class=\"blank-slate-pf-icon\">\n            <span class=\"pficon pficon pficon-warning-triangle-o\"></span>\n          </div>\n          <h1>No Metrics</h1>\n          <p>There are no metrics to display.</p>\n          <p>Wait for some metrics to be generated or check your application configuration.</p>\n        </div>\n        <div class=\"cards-pf\" ng-if=\"$ctrl.metricGroups.length > 0\">\n          <div class=\"container-fluid container-cards-pf\">\n            <div class=\"row row-cards-pf\">\n              <div class=\"col-xs-12 col-sm-6 col-md-4 col-lg-3\" ng-repeat=\"group in $ctrl.metricGroups | orderBy: 'type'\">\n                <pf-card\n                  head-title=\"{{group.type}}\"\n                  show-spinner=\"group.metrics.length === 0\"\n                  spinner-text=\"Loading\">\n                  <div class=\"card-pf-info-item\" ng-repeat=\"metric in group.metrics | orderBy: 'name'\">\n                    {{metric.getDescription()}}\n                  </div>\n                </pf-card>\n              </div>\n            </div>\n          </div>\n        </div>\n      </div>\n    ",
        controller: MetricsController
    };
})(Runtime || (Runtime = {}));
/// <reference path="metrics.component.ts"/>
/// <reference path="metrics.service.ts"/>
var Runtime;
(function (Runtime) {
    Runtime.metricsModule = angular
        .module('runtime-metrics', [])
        .component('runtimeMetrics', Runtime.metricsComponent)
        .service('metricsService', Runtime.MetricsService)
        .name;
})(Runtime || (Runtime = {}));
var Runtime;
(function (Runtime) {
    var ThreadsService = /** @class */ (function () {
        ThreadsService.$inject = ["$q", "jolokia"];
        function ThreadsService($q, jolokia) {
            'ngInject';
            this.$q = $q;
            this.jolokia = jolokia;
        }
        ThreadsService.prototype.getThreads = function () {
            var _this = this;
            return this.$q(function (resolve, reject) {
                _this.jolokia.execute("java.lang:type=Threading", "dumpAllThreads", false, false, {
                    success: function (threads) {
                        threads.forEach(function (thread) {
                            thread.threadState = ThreadsService.STATE_LABELS[thread.threadState];
                            thread.waitedTime = thread.waitedTime > 0 ? Core.humanizeMilliseconds(thread.waitedTime) : '';
                            thread.blockedTime = thread.blockedTime > 0 ? Core.humanizeMilliseconds(thread.blockedTime) : '';
                            delete thread.lockMonitors;
                        });
                        resolve(threads);
                    }
                });
            });
        };
        ThreadsService.STATE_LABELS = {
            BLOCKED: 'Blocked',
            NEW: 'New',
            RUNNABLE: 'Runnable',
            TERMINATED: 'Terminated',
            TIMED_WAITING: 'Timed waiting',
            WAITING: 'Waiting'
        };
        return ThreadsService;
    }());
    Runtime.ThreadsService = ThreadsService;
})(Runtime || (Runtime = {}));
/// <reference path="./threads.service.ts"/>
var Runtime;
(function (Runtime) {
    ThreadsController.$inject = ["$scope", "$uibModal", "threadsService"];
    function ThreadsController($scope, $uibModal, threadsService) {
        'ngInject';
        var FILTER_FUNCTIONS = {
            state: function (threads, state) { return threads.filter(function (thread) { return thread.threadState === state; }); },
            name: function (threads, name) {
                var re = new RegExp(name, 'i');
                return threads.filter(function (thread) { return re.test(thread.threadName); });
            }
        };
        var allThreads;
        $scope.toolbarConfig = {
            filterConfig: {
                fields: [
                    {
                        id: 'state',
                        title: 'State',
                        placeholder: 'Filter by state...',
                        filterType: 'select',
                        filterValues: ['Blocked', 'New', 'Runnable', 'Terminated', 'Timed waiting', 'Waiting']
                    },
                    {
                        id: 'name',
                        title: 'Name',
                        placeholder: 'Filter by name...',
                        filterType: 'text'
                    }
                ],
                onFilterChange: filterChange
            },
            isTableView: true
        };
        $scope.tableConfig = {
            selectionMatchProp: 'threadId',
            showCheckboxes: false
        };
        $scope.tableDtOptions = {
            order: [[0, "desc"]]
        };
        $scope.tableColumns = [
            {
                header: 'ID',
                itemField: 'threadId'
            },
            {
                header: 'State',
                itemField: 'threadState'
            },
            {
                header: 'Name',
                itemField: 'threadName',
                templateFn: function (value) { return "<span class=\"table-cell-truncated\" title=\"" + value + "\">" + value + "</span>"; }
            },
            {
                header: 'Waited Time',
                itemField: 'waitedTime'
            },
            {
                header: 'Blocked Time',
                itemField: 'blockedTime'
            },
            {
                header: 'Native',
                itemField: 'inNative',
                templateFn: function (value) { return value ? '<span class="fa fa-circle" aria-hidden="true"></span>' : ''; }
            },
            {
                header: 'Suspended',
                itemField: 'suspended',
                templateFn: function (value) { return value ? '<span class="fa fa-circle" aria-hidden="true"></span>' : ''; }
            }
        ];
        $scope.tableItems = null;
        $scope.tableActionButtons = [
            {
                name: 'More',
                title: 'View more information about this thread',
                actionFn: viewDetails
            }
        ];
        (function init() {
            loadThreads();
        })();
        function loadThreads() {
            threadsService.getThreads().then(function (threads) {
                allThreads = threads;
                $scope.filteredThreads = threads;
                updateResultCount();
            });
        }
        function filterChange(filters) {
            applyFilters(filters);
            updateResultCount();
        }
        function applyFilters(filters) {
            var filteredThreads = allThreads;
            filters.forEach(function (filter) {
                filteredThreads = FILTER_FUNCTIONS[filter.id](filteredThreads, filter.value);
            });
            $scope.filteredThreads = filteredThreads;
        }
        function updateResultCount() {
            $scope.toolbarConfig.filterConfig.resultsCount = $scope.filteredThreads.length;
        }
        function viewDetails(action, item) {
            $scope.thread = _.find($scope.filteredThreads, function (thread) { return thread.threadId === item.threadId; });
            openModal();
        }
        function openModal() {
            $uibModal.open({
                templateUrl: 'threadModalContent.html',
                scope: $scope,
                size: 'lg'
            });
        }
    }
    Runtime.ThreadsController = ThreadsController;
})(Runtime || (Runtime = {}));
/// <reference path="threads.controller.ts"/>
/// <reference path="threads.service.ts"/>
var Runtime;
(function (Runtime) {
    Runtime.threadsModule = angular
        .module('runtime-threads', [])
        .controller('ThreadsController', Runtime.ThreadsController)
        .service('threadsService', Runtime.ThreadsService)
        .name;
})(Runtime || (Runtime = {}));
/// <reference path="sysprops/sysprops.module.ts"/>
/// <reference path="metrics/metrics.module.ts"/>
/// <reference path="threads/threads.module.ts"/>
/// <reference path="runtime.config.ts"/>
/// <reference path="runtime.component.ts"/>
/// <reference path="runtime.service.ts"/>
var Runtime;
(function (Runtime) {
    var runtimeModule = angular
        .module('hawtio-runtime', [
        Runtime.systemPropertiesModule,
        Runtime.metricsModule,
        Runtime.threadsModule
    ])
        .config(Runtime.configureRoutes)
        .run(Runtime.configureRuntime)
        .component('runtime', Runtime.runtimeComponent)
        .service('runtimeService', Runtime.RuntimeService)
        .name;
    hawtioPluginLoader.addModule(runtimeModule);
    Runtime.log = Logger.get(runtimeModule);
})(Runtime || (Runtime = {}));

angular.module('hawtio-jmx-templates', []).run(['$templateCache', function($templateCache) {$templateCache.put('plugins/diagnostics/html/flags.html','<div ng-controller="DiagnosticsFlagsController">\n  <h1>Hotspot Diagnostics</h1>\n  <table class="table table-striped table-bordered">\n    <thead>\n      <tr>\n        <th>VM Flag</th>\n        <th>Origin</th>\n        <th>Value</th>\n      </tr>\n    </thead>\n    <tbody>\n      <tr ng-repeat="flag in flags track by flag.name">\n        <td>{{flag.name}}</td>\n        <td>{{flag.origin}}</td>\n        <td>\n          <div ng-switch on="flag.dataType">\n            <span ng-switch-when="readonly">{{flag.value}}</span>\n            <input ng-switch-when="boolean" type="checkbox" ng-model="flag.value"></input>\n            <input ng-switch-when="string" type="text" ng-model="flag.value"></input>\n            <input ng-switch-when="number" type="number" ng-model="flag.value"></input>\n          </div>\n        </td>\n      </tr>\n    </tbody>\n  </table>  \n</div>');
$templateCache.put('plugins/diagnostics/html/heap.html','<div ng-controller="DiagnosticsHeapController" class="table-view">\n  <h1>Class Histogram</h1>\n  <p>\n    <strong>Please note:</strong> Loading class histogram may be very expensive, depending on the size and\n    layout of the heap. Alternatively, use the <samp>jcmd</samp> utility:<br>\n    <samp>jcmd &lt;process id/main class&gt; GC.class_histogram<samp>\n  </p>\n  <p>\n    <button type="button" class="btn btn-primary" ng-click="loadClassStats()" ng-disabled="loading">\n      Load class histogram\n    </button>\n  </p>\n  <p ng-show="loading">\n    Loading...\n  </p>\n  <div ng-show="!loading && items.length > 0">\n    <pf-toolbar config="toolbarConfig">\n      <span ng-show="lastLoaded">\n        Last loaded: {{lastLoaded | date: \'yyyy-MM-dd hh:mm:ss\'}}\n      </span>\n    </pf-toolbar>\n    <pf-table-view class="diagnostics-class-histogram-table" config="tableConfig" dt-options="tableDtOptions"\n                   page-config="pageConfig" columns="tableColumns" items="items"></pf-table-view>\n  </div>\n</div>\n');
$templateCache.put('plugins/diagnostics/html/jfr.html','<div ng-controller="DiagnosticsJfrController">\n  <h1>Flight Recorder</h1>\n  <div class="row-fluid jfr-column-container"\n       hawtio-auto-columns=".jfr-column">\n\n    <div class="jfr-column">\n      <div class="alert alert-warning alert-dismissable" ng-show="!jfrEnabled && isMessageVisible(\'jfrShowUnlockWarning\')">\n        <button type="button"\n           class="close"\n           data-dismiss="alert"\n           aria-hidden="true" ng-click="closeMessageForGood(\'jfrShowUnlockWarning\')" ><span class="pficon pficon-close"></span></button>\n        <span class="pficon pficon-warning-triangle-o"></span>\n        <strong>Please note:</strong> Running Java Flight Recorder on\n        production systems requires a <a\n        href="http://www.oracle.com/technetwork/java/javaseproducts/overview/index.html"\n        class="alert-link">license</a>.\n      </div>\n      <div class="alert alert-info alert-dismissable" ng-show="isMessageVisible(\'jfrShowJcmd\')">\n        <button type="button"\n                class="close"\n                data-dismiss="alert"\n                aria-hidden="true" ng-click="closeMessageForGood(\'jfrShowJcmd\')"><span class="pficon pficon-close"></span></button>\n        <span class="pficon pficon-info"></span>\n        <strong>Info:</strong>Equivalent command of last action: <code>{{jcmd}}</code>\n      </div>\n      <div class="casettePlayer">\n        <div class="casette">\n          <svg role="img"\n               aria-label="recording indicator"\n               xmlns="http://www.w3.org/2000/svg"\n               version="1.1"\n               viewBox="0 0 24 24"\n               width="25"\n               height="25"\n               id="recordingIndicator">\n            <circle cx="12"\n                    cy="12"\n                    r="11"\n                    fill="red"\n                    ng-show="isRunning">\n              <animate attributeType="XML"\n                       attributeName="fill"\n                       from="#ff0000"\n                       to="#000000"\n                       dur="2s"\n                       repeatCount="indefinite"></animate>\n            </circle>\n          </svg>\n          <div class="cassetteLabelCutCorners"></div>\n          <div class="casetteLabel">\n            {{jfrStatus}}\n            <div class="notLabel">\n              <div class="wrapCog"\n                   ng-class="{\'spinning\': isRunning}">\n                <svg role="img"\n                     aria-label="cassette wheel"\n                     xmlns="http://www.w3.org/2000/svg"\n                     version="1.1"\n                     viewBox="0 0 24 24"\n                     width="50"\n                     height="50"\n                     ng-class="{\'spinning\': isRecording}"\n                     id="leftcog">\n                  <circle cx="12"\n                          cy="12"\n                          r="11"\n                          fill="white"></circle>\n                  <circle cx="12"\n                          cy="12"\n                          r="8"\n                          fill="black"></circle>\n                  <rect x="2"\n                        y="10"\n                        width="20"\n                        height="4"\n                        fill="black"\n                        stroke="none"></rect>\n                  <rect x="2"\n                        y="10"\n                        width="20"\n                        height="4"\n                        fill="black"\n                        stroke="none"\n                        transform="rotate(45,12,12)"></rect>\n                  <rect x="2"\n                        y="10"\n                        width="20"\n                        height="4"\n                        fill="black"\n                        stroke="none"\n                        transform="rotate(90,12,12)"></rect>\n                  <rect x="2"\n                        y="10"\n                        width="20"\n                        height="4"\n                        fill="black"\n                        stroke="none"\n                        transform="rotate(135,12,12)"></rect>\n                </svg>\n              </div>\n              <div class="wrapCog"\n                   ng-class="{\'spinning\': isRunning}"\n                   id="rightCogWrapper">\n                <svg role="img"\n                     aria-label="cassette wheel"\n                     xmlns="http://www.w3.org/2000/svg"\n                     version="1.1"\n                     viewBox="0 0 24 24"\n                     width="50"\n                     height="50"\n                     ng-class="{\'spinning\': isRecording}">\n                  <circle cx="12"\n                          cy="12"\n                          r="11"\n                          fill="white"></circle>\n                  <circle cx="12"\n                          cy="12"\n                          r="8"\n                          fill="black"></circle>\n                  <rect x="2"\n                        y="10"\n                        width="20"\n                        height="4"\n                        fill="black"\n                        stroke="none"></rect>\n                  <rect x="2"\n                        y="10"\n                        width="20"\n                        height="4"\n                        fill="black"\n                        stroke="none"\n                        transform="rotate(45,12,12)"></rect>\n                  <rect x="2"\n                        y="10"\n                        width="20"\n                        height="4"\n                        fill="black"\n                        stroke="none"\n                        transform="rotate(90,12,12)"></rect>\n                  <rect x="2"\n                        y="10"\n                        width="20"\n                        height="4"\n                        fill="black"\n                        stroke="none"\n                        transform="rotate(135,12,12)"></rect>\n                </svg>\n              </div>\n            </div>\n          </div>\n        </div>\n        <div id="casetteButtons">\n\n          <button class="recorderButton btn"\n                  tooltip="Unlock commercial features to be able to record"\n                  ng-click="unlock()"\n                  ng-disabled="jfrEnabled"\n                  ng-class="jfrEnabled ? \'disabledJfrButton\' : \'raisedButton\'">\n            <i class="fa-5x"\n               ng-class="jfrEnabled ? \'pficon-unlocked\' : \'pficon-locked\'"></i>\n          </button>\n          <button class="recorderButton btn"\n                  ng-enabled="!isRunning"\n                  ng-class="!jfrEnabled || isRunning ? \'disabledJfrButton\' : \'raisedButton\'"\n                  tooltip="Start recording"\n                  ng-click="startRecording()"\n                  ng-disabled="isRunning">\n            <div class="recordingSymbol"\n                 id="rec"></div>\n          </button>\n          <button class="recorderButton btn"\n                  title="Dump recording to disk"\n                  ng-class="jfrEnabled && isRecording ? \'raisedButton\' : \'disabledJfrButton\'"\n                  ng-disabled="!isRecording"\n                  tooltip="Dump {{jfrSettings.name}} to disk"\n                  ng-click="dumpRecording()">\n            <i class="pficon-save fa-5x"></i>\n          </button>\n          <button class="recorderButton btn"\n                  ng-disabled="!isRecording"\n                  ng-class="jfrEnabled && isRecording ? \'raisedButton\' : \'disabledJfrButton\'"\n                  tooltip="Stop {{jfrSettings.name}}"\n                  ng-click="stopRecording()">\n            <div class="recordingSymbol"\n                 id="stop"></div>\n          </button>\n          <button class="recorderButton btn"\n                  ng-class="jfrEnabled && !settingsVisible ? \'raisedButton\' : \'disabledJfrButton\'"\n                  tooltip="Show/hide settings"\n                  ng-click="toggleSettingsVisible()">\n            <i class="pficon-settings fa-5x"></i>\n          </button>\n        </div>\n      </div>\n    </div>\n\n    <div class="jfr-column"\n         ng-show="settingsVisible">\n\n\n      <dl>\n        <dt>Recorder Settings</dt>\n        <dd>\n          <div simple-form\n               name="jfrForm"\n               data="formConfig"\n               entity="jfrSettings"></div>\n\n        </dd>\n      </dl>\n\n    </div>\n    <table ng-show="!!recordings.length"\n           class="table table-condensed table-striped">\n      <tr>\n        <th>Rec#</th>\n        <th>Size</th>\n        <th>Time</th>\n        <th>File</th>\n      </tr>\n      <tr ng-repeat="aRecording in recordings">\n        <td>{{aRecording.number}}</td>\n        <td>{{aRecording.size}}</td>\n        <td>{{aRecording.time | date: \'yyyy-MM-dd HH:mm:ss\' }}</td>\n        <td><a href="file://{{aRecording.file}}">{{aRecording.file}}</a></td>\n      </tr>\n    </table>\n\n  </div>\n\n</div>\n');
$templateCache.put('plugins/jmx/html/areaChart.html','<div ng-controller="Jmx.AreaChartController">\n  <script type="text/ng-template" id="areaChart">\n    <fs-area bind="data" duration="250" interpolate="false" point-radius="5" width="width" height="height" label=""></fs-area>\n  </script>\n  <div compile="template"></div>\n</div>\n');
$templateCache.put('plugins/jmx/html/chartEdit.html','<div class="jmx-charts-edit-view" ng-controller="Jmx.ChartEditController">\n  <h2>Chart</h2>\n  <div ng-show="canEditChart()">\n    <p ng-if="showElements() && showAttributes()">\n      Please select the elements and attributes you want to see in the chart.\n    </p>\n    <p ng-if="!showElements() && showAttributes()">\n      Please select the attributes you want to see in the chart.\n    </p>\n    <p ng-if="!showElements() && !showAttributes()">\n      This chart cannot be edited.\n    </p>\n    <form>\n      <div class="row">\n        <div class="form-group col-md-6" ng-show="showElements()">\n          <label for="mbeans">Elements</label>\n          <select id="mbeans" class="form-control" size="20" multiple ng-multiple="true" ng-model="selectedMBeans" ng-options="name for (name, value) in mbeans"></select>\n        </div>\n        <div class="form-group col-md-6" ng-show="showAttributes()">\n          <label for="attributes">Attributes</label>\n          <select id="attributes" class="form-control" size="20" multiple ng-multiple="true" ng-model="selectedAttributes" ng-options="name | humanize for (name, value) in metrics"></select>\n        </div>\n      </div>\n      <div class="form-group">\n        <button type="submit" class="btn btn-primary" ng-click="viewChart()" ng-disabled="!selectedAttributes.length && !selectedMBeans.length">\n          View Chart\n        </button>\n      </div>\n    </form>\n  </div>\n  <p ng-show="!canEditChart()">\n    No numeric metrics available. Please select another item to chart on.\n  </p>\n</div>\n');
$templateCache.put('plugins/jmx/html/charts.html','<div ng-controller="Jmx.ChartController">\n  <h2>Chart</h2>\n  <div ng-switch="errorMessage()">\n    <div ng-switch-when="metrics">No valid metrics to show for this mbean.</div>\n    <div ng-switch-when="updateRate">Charts aren\'t available when the update rate is set to "No refreshes", go to the <a ng-href="#/preferences{{hash}}">Preferences</a> panel and set a refresh rate to enable charts</div>\n    <div ng-switch-default>\n      <pf-toolbar config="toolbarConfig"></pf-toolbar>\n    </div>\n    <div id="charts"></div>\n  </div>\n</div>\n');
$templateCache.put('plugins/jmx/html/donutChart.html','<div ng-controller="Jmx.DonutChartController">\n  <script type="text/ng-template" id="donut">\n    <fs-donut bind="data" outer-radius="200" inner-radius="75"></fs-donut>\n  </script>\n  <div compile="template"></div>\n</div>\n');
$templateCache.put('plugins/jmx/html/layoutTree.html','<div class="tree-nav-layout">\n  <div class="sidebar-pf sidebar-pf-left" resizable r-directions="[\'right\']">\n    <tree-header></tree-header>\n    <tree></tree>\n  </div>\n  <div class="tree-nav-main">\n    <jmx-header></jmx-header>\n    <jmx-navigation></jmx-navigation>\n    <div class="contents" ng-view></div>\n  </div>\n</div>\n');
$templateCache.put('plugins/jvm/html/connect-edit.html','<div class="modal-header">\n  <button type="button" class="close" aria-label="Close" ng-click="$ctrl.cancel()">\n    <span class="pficon pficon-close" aria-hidden="true"></span>\n  </button>\n  <h4 class="modal-title" ng-show="!$ctrl.connection.name">Add Connection</h4>\n  <h4 class="modal-title" ng-show="$ctrl.connection.name">Edit Connection</h4>\n</div>\n<form name="connectForm" class="form-horizontal jvm-connection-form" ng-submit="$ctrl.saveConnection($ctrl.connection)">\n  <div class="modal-body">\n    <p class="fields-status-pf">The fields marked with\n      <span class="required-pf">*</span> are required.</p>\n    <div class="form-group" ng-class="{\'has-error\': $ctrl.errors.name}">\n      <label class="col-sm-3 control-label required-pf" for="connection-name">Name</label>\n      <div class="col-sm-8">\n        <input type="text" id="connection-name" class="form-control" name="name" ng-model="$ctrl.connection.name" pf-focused="!$ctrl.connection.name">\n        <span class="help-block" ng-show="$ctrl.errors.name">{{$ctrl.errors.name}}</span>\n      </div>\n    </div>\n    <div class="form-group">\n      <label class="col-sm-3 control-label required-pf" for="connection-scheme">Scheme</label>\n      <div class="col-sm-8">\n        <select id="connection-scheme" class="form-control" name="scheme" ng-model="$ctrl.connection.scheme">\n          <option>http</option>\n          <option>https</option>\n        </select>\n      </div>\n    </div>\n    <div class="form-group" ng-class="{\'has-error\': $ctrl.errors.host}">\n      <label class="col-sm-3 control-label required-pf" for="connection-host">Host</label>\n      <div class="col-sm-8">\n        <input type="text" id="connection-host" class="form-control" name="host" ng-model="$ctrl.connection.host" ng-change="">\n        <span class="help-block" ng-show="$ctrl.errors.host">{{$ctrl.errors.host}}</span>\n      </div>\n    </div>\n    <div class="form-group" ng-class="{\'has-error\': $ctrl.errors.port}">\n      <label class="col-sm-3 control-label" for="connection-port">Port</label>\n      <div class="col-sm-8">\n        <input type="number" id="connection-port" class="form-control" name="port" ng-model="$ctrl.connection.port" ng-change="resetTestConnection()">\n        <span class="help-block" ng-show="$ctrl.errors.port">{{$ctrl.errors.port}}</span>\n      </div>\n    </div>\n    <div class="form-group">\n      <label class="col-sm-3 control-label" for="connection-path">Path</label>\n      <div class="col-sm-8">\n        <input type="text" id="connection-path" class="form-control" name="path" ng-model="$ctrl.connection.path" ng-change="resetTestConnection()">\n      </div>\n    </div>\n    <div class="form-group">\n      <div class="col-sm-offset-3 col-sm-8">\n        <button type="button" class="btn btn-default" ng-click="$ctrl.testConnection($ctrl.connection)">\n          Test Connection\n        </button>\n        <span class="jvm-connection-test-msg" ng-show="$ctrl.test.message">\n          <span class="pficon" ng-class="{\'pficon-ok\': $ctrl.test.ok, \'pficon-warning-triangle-o\': !$ctrl.test.ok}"></span>\n          {{$ctrl.test.message}}\n        </span>\n      </div>\n    </div>\n  </div>\n  <div class="modal-footer">\n    <button type="button" class="btn btn-default" ng-click="$ctrl.cancel()">Cancel</button>\n    <button type="submit" class="btn btn-primary" ng-show="!$ctrl.connection.name">Add</button>\n    <button type="submit" class="btn btn-primary" ng-show="$ctrl.connection.name">Save</button>\n  </div>\n</form>');
$templateCache.put('plugins/jvm/html/connect.html','<div>\n  <h1>Remote</h1>\n  <div class="row">\n    <div class="col-md-7">\n      <pf-toolbar config="$ctrl.toolbarConfig"></pf-toolbar>\n      <pf-list-view class="jvm-connection-list" items="$ctrl.connections" config="$ctrl.listConfig"\n        action-buttons="$ctrl.listActionButtons" menu-actions="$ctrl.listActionDropDown">\n        <div class="list-view-pf-left">\n          <span class="pficon list-view-pf-icon-sm"\n                ng-class="{\'pficon-plugged\': item.reachable,\n                           \'list-view-pf-icon-success\': item.reachable,\n                           \'pficon-unplugged\': !item.reachable,\n                           \'list-view-pf-icon-danger\': !item.reachable}"\n                title="Endpoint {{item.reachable ? \'reachable\' : \'unreachable\'}}"></span>\n        </div>\n        <div class="list-view-pf-body">\n          <div class="list-view-pf-description">\n            <div class="list-group-item-heading">\n              {{item.name}}\n            </div>\n            <div class="list-group-item-text">\n              {{item | connectionUrl}}\n            </div>\n          </div>\n        </div>    \n      </pf-list-view>\n    </div>\n    <div class="col-md-5">\n      <div class="panel panel-default">\n        <div class="panel-heading">\n          <h3 class="panel-title">Instructions</h3>\n        </div>\n        <div class="panel-body">\n          <p>\n            This page allows you to connect to remote processes which <strong>already have a\n            <a href="http://jolokia.org/" target="_blank">jolokia agent</a> running inside them</strong>. You will need to\n            know the host name, port and path of the jolokia agent to be able to connect.\n          </p>\n          <p>\n            If the process you wish to connect to does not have a jolokia agent inside, please refer to the\n            <a href="http://jolokia.org/agent.html" target="_blank">jolokia documentation</a> for how to add a JVM, servlet\n            or OSGi based agent inside it.\n          </p>\n          <p>\n            If you are using <a href="http://fabric8.io/" target="_blank">Fabric8</a>,\n            <a href="http://www.jboss.org/products/fuse" target="_blank">JBoss Fuse</a>, or <a href="http://activemq.apache.org"\n              target="_blank">Apache ActiveMQ</a>; then a jolokia agent is included by default (use context path of jolokia\n            agent, usually\n            <code>jolokia</code>). Or you can always just deploy hawtio inside the process (which includes the jolokia agent,\n            use Jolokia servlet mapping inside hawtio context path, usually <code>hawtio/jolokia</code>).\n          </p>\n          <p ng-show="hasLocalMBean()">\n            Use the <strong><a href="#/jvm/local">Local Tab</a></strong> to connect to processes locally on this machine\n            (which will install a jolokia agent automatically if required).\n          </p>\n          <p ng-show="!hasLocalMBean()">\n            The <strong>Local Tab</strong> is not currently enabled or visible because either the server side\n            <strong>hawtio-local-jvm-mbean plugin</strong> is not installed or this JVM cannot find the\n            <strong>com.sun.tools.attach.VirtualMachine</strong> API usually found in the <strong>tools.jar</strong>. Please\n            see the <a href="http://hawt.io/faq/index.html" target="_blank">FAQ entry</a> for more details.\n          </p>\n        </div>\n      </div>\n    </div>\n  </div>\n</div>\n');
$templateCache.put('plugins/jvm/html/discover.html','<div ng-controller="JVM.DiscoveryController">\n\n  <h1>Discover</h1>\n\n  <p ng-if="discovering">Please wait, discovering agents...</p>\n  \n  <div ng-if="!discovering">\n    <p ng-show="agents.length === 0">\n      No agents discovered.\n    </p>\n    <div ng-show="agents.length > 0">\n      <div class="row toolbar-pf">\n        <div class="col-sm-12">\n          <form class="toolbar-pf-actions">\n            <div class="form-group">\n              <input type="text" class="form-control" ng-model="filter" placeholder="Filter..." autocomplete="off">\n            </div>\n            <div class="form-group">\n              <button class="btn btn-default" ng-click="fetch()" title="Refresh"><i class="fa fa-refresh"></i> Refresh</button>\n            </div>\n          </form>\n        </div>\n      </div>\n      <ul class="discovery zebra-list">\n        <li ng-repeat="agent in agents track by $index" ng-show="filterMatches(agent)">\n\n          <div class="inline-block">\n            <img ng-src="{{getLogo(agent)}}">\n          </div>\n\n          <div class="inline-block">\n            <p ng-hide="!hasName(agent)">\n            <span class="strong"\n                  ng-show="agent.server_vendor">\n              {{agent.server_vendor}} {{_.startCase(agent.server_product)}} {{agent.server_version}}\n            </span>\n            </p>\n          <span ng-class="getAgentIdClass(agent)">\n            <strong ng-show="hasName(agent)">Agent ID: </strong>{{agent.agent_id}}<br/>\n            <strong ng-show="hasName(agent)">Agent Version: </strong><span ng-hide="hasName(agent)"> Version: </span>{{agent.agent_version}}</span><br/>\n            <strong ng-show="hasName(agent)">Agent Description: </strong><span\n              ng-hide="hasName(agent)"> Description: {{agent.agent_description}}</span><br/>\n                <div ng-hide="!agent.startTime"><strong>JVM Started: </strong>{{agent.startTime | date: \'yyyy-MM-dd HH:mm:ss\'}}</div>\n                <div ng-hide="!agent.command"><strong>Java Command: </strong>{{agent.command}}</div>\n\n            <p ng-hide="!agent.url"><strong>Agent URL: </strong><a ng-href="{{agent.url}}"\n                                                                  target="_blank">{{agent.url}}</a>\n            </p>\n          </div>\n\n          <div class="inline-block lock" ng-show="agent.secured">\n            <i class="fa-4x pficon-locked" title="A valid username and password will be required to connect"></i>\n          </div>\n\n          <div class="inline-block" ng-hide="!agent.url">\n            <div class="connect-button"\n                ng-click="gotoServer($event, agent)"\n                hawtio-template-popover\n                content="authPrompt"\n                trigger="manual"\n                placement="auto"\n                data-title="Please enter your username and password">\n              <i ng-show="agent.url" class="fa-4x pficon-running" tooltip="Connect to process"></i>\n            </div>\n          </div>\n\n        </li>\n      </ul>\n    </div>\n  </div>\n\n  <script type="text/ng-template" id="authPrompt">\n    <div class="auth-form">\n      <form name="authForm">\n        <input type="text"\n                class="input-sm"\n                placeholder="Username..."\n                ng-model="agent.username"\n                required>\n        <input type="password"\n                class="input-sm"\n                placeholder="Password..."\n                ng-model="agent.password"\n                required>\n        <button ng-disabled="!authForm.$valid"\n                ng-click="connectWithCredentials($event, agent)"\n                class="btn btn-success">\n          <i class="fa fa-share"></i> Connect\n        </button>\n        <button class="btn" ng-click="closePopover($event)"><i class="fa fa-remove"></i></button>\n      </form>\n    </div>\n  </script>\n\n</div>\n');
$templateCache.put('plugins/jvm/html/jolokia-preferences.html','<div ng-controller="JVM.JolokiaPreferences">\n  <div class="alert alert-success jvm-jolokia-preferences-alert" ng-if="showAlert">\n    <span class="pficon pficon-ok"></span>\n    Settings applied successfully!\n  </div>\n  <form class="form-horizontal jvm-jolokia-preferences-form">\n    <div class="form-group">\n      <label class="col-md-2 control-label" for="updateRate">\n        Update rate\n        <span class="pficon pficon-info" data-toggle="tooltip" data-placement="top" title="The period between polls to jolokia to fetch JMX data"></span>\n      </label>\n      <div class="col-md-6">\n        <select id="updateRate" class="form-control" ng-model="updateRate">\n          <option value="0">Off</option>\n          <option value="5000">5 Seconds</option>\n          <option value="10000">10 Seconds</option>\n          <option value="30000">30 Seconds</option>\n          <option value="60000">60 seconds</option>\n        </select>\n      </div>\n    </div>\n    <div class="form-group">\n      <label class="col-md-2 control-label" for="maxDepth">\n        Max depth\n        <span class="pficon pficon-info" data-toggle="tooltip" data-placement="top" title="The number of levels jolokia will marshal an object to json on the server side before returning"></span>\n      </label>\n      <div class="col-sm-6">\n        <input type="number" id="maxDepth" class="form-control" ng-model="maxDepth">\n      </div>\n    </div>\n    <div class="form-group">\n      <label class="col-md-2 control-label" for="maxCollectionSize">\n        Max collection size\n        <span class="pficon pficon-info" data-toggle="tooltip" data-placement="top" title="The maximum number of elements in an array that jolokia will marshal in a response"></span>\n      </label>\n      <div class="col-sm-6">\n        <input type="number" id="maxCollectionSize" class="form-control" ng-model="maxCollectionSize">\n      </div>\n    </div>\n    <div class="form-group">\n      <label class="col-md-2">\n      </label>\n      <div class="col-md-6">\n        <button type="button" class="btn btn-primary" ng-click="reboot()">Apply</button>\n        <span class="help-block">Restart hawtio with the new values in effect</span>\n      </div>\n    </div>\n  </form>\n</div>');
$templateCache.put('plugins/jvm/html/jolokiaError.html','<div class="modal-header">\n  <h3 class="modal-title">The connection to jolokia failed!</h3>\n</div>\n<div class="modal-body">\n  <div ng-show="responseText">\n    <p>The connection to jolokia has failed with the following error, also check the javascript console for more details.</p>\n    <div hawtio-editor="responseText" readonly="true"></div>\n  </div>\n  <div ng-hide="responseText">\n    <p>The connection to jolokia has failed for an unknown reason, check the javascript console for more details.</p>\n  </div>\n</div>\n<div class="modal-footer">\n  <button ng-show="ConnectOptions.returnTo" class="btn" ng-click="goBack()">Back</button>\n  <button class="btn btn-primary" ng-click="retry()">Retry</button>\n</div>\n');
$templateCache.put('plugins/jvm/html/layoutConnect.html','<div class="nav-tabs-main">\n  <ul class="nav nav-tabs" ng-controller="JVM.NavController">\n    <li ng-class=\'{active : isActive("/jvm/connect")}\'>\n        <a ng-href="#" ng-click="goto(\'/jvm/connect\')">Remote</a>\n    </li>\n    <li ng-class=\'{active : isActive("/jvm/local")}\' ng-show="isLocalEnabled">\n      <a ng-href="#" ng-click="goto(\'/jvm/local\')">Local</a>\n    </li>\n    <li ng-class=\'{active : isActive("/jvm/discover")}\' ng-show="isDiscoveryEnabled">\n        <a ng-href="#" ng-click="goto(\'/jvm/discover\')">Discover</a>\n    </li>\n  </ul>\n  <div class="contents" ng-view></div>\n</div>\n');
$templateCache.put('plugins/jvm/html/local.html','<div ng-controller="JVM.JVMsController">\n  <h1>Local</h1>\n  <p ng-if="!initDone">\n    Please wait, discovering local JVM processes...\n  </p>\n  <div ng-if="initDone">\n    <p ng-if=\'status\'>\n      {{status}}\n    </p>\n    <div ng-if=\'data.length > 0\'>\n      <div class="row toolbar-pf">\n        <div class="col-sm-12">\n          <form class="toolbar-pf-actions">\n            <div class="form-group">\n              <input type="text" class="form-control" ng-model="filter" placeholder="Filter..." autocomplete="off">\n            </div>  \n            <div class="form-group">\n              <button class="btn btn-default" ng-click="fetch()" title="Refresh"><i class="fa fa-refresh"></i> Refresh</button>\n            </div>  \n          </form>  \n        </div>  \n      </div>  \n      <table class=\'centered table table-bordered table-condensed table-striped\'>\n        <thead>\n        <tr>\n          <th style="width: 70px">PID</th>\n          <th>Name</th>\n          <th style="width: 300px">Agent URL</th>\n          <th style="width: 50px"></th>\n        </tr>\n        </thead>\n        <tbody>\n        <tr ng-repeat="jvm in data track by $index" ng-show="filterMatches(jvm)">\n          <td>{{jvm.id}}</td>\n          <td title="{{jvm.displayName}}">{{jvm.alias}}</td>\n          <td><a href=\'\' title="Connect to this agent"\n                 ng-click="connectTo(jvm.url, jvm.scheme, jvm.hostname, jvm.port, jvm.path)">{{jvm.agentUrl}}</a></td>\n          <td>\n            <a class=\'btn control-button\' href="" title="Stop agent" ng-show="jvm.agentUrl"\n             ng-click="stopAgent(jvm.id)"><i class="pficon-close"></i></a>\n            <a class=\'btn control-button\' href="" title="Start agent" ng-hide="jvm.agentUrl"\n             ng-click="startAgent(jvm.id)"><i class="pficon-running"></i></a>\n          </td>\n        </tr>\n        </tbody>\n      </table>\n    </div>\n  </div>\n</div>\n');
$templateCache.put('plugins/jvm/html/navbarHeaderExtension.html','<style>\n  .navbar-header-hawtio-jvm {\n    float: left;\n    margin: 0;\n  }\n\n  .navbar-header-hawtio-jvm h4 {\n    color: white;\n    margin: 0px;\n  }\n\n  .navbar-header-hawtio-jvm li {\n    list-style-type: none;\n    display: inline-block;\n    margin-right: 10px;\n    margin-top: 4px;\n  }\n</style>\n<ul class="navbar-header-hawtio-jvm" ng-controller="JVM.HeaderController">\n  <li ng-show="containerName"><h4 ng-bind="containerName"></h4></li>\n  <li ng-show="goBack"><strong><a href="" ng-click="goBack()">Back</a></strong></li>\n</ul>\n');
$templateCache.put('plugins/jvm/html/reset.html','<div ng-controller="JVM.ResetController">\n  <div class="alert alert-success jvm-reset-connections-alert" ng-if="showAlert">\n    <span class="pficon pficon-ok"></span>\n    Connections cleared successfully!\n  </div>\n  <h3>Clear saved connections</h3>\n  <p>\n    Clear all saved connection settings stored in your browser\'s local storage.\n  </p>\n  <p>\n    <button class="btn btn-danger" ng-click="doClearConnectSettings()">Clear saved connections</button>\n  </p>\n</div>');
$templateCache.put('plugins/runtime/threads/threads.html','<div id="threads-page" class="table-view" ng-controller="ThreadsController">\n\n  <h1>Threads</h1>\n\n  <pf-toolbar config="toolbarConfig"></pf-toolbar>\n\n  <pf-table-view class="threads-table" config="tableConfig" dt-options="tableDtOptions"\n    columns="tableColumns" items="filteredThreads" action-buttons="tableActionButtons">\n  </pf-table-view>\n\n  <script type="text/ng-template" id="threadModalContent.html">\n    <div class="modal-header">\n      <button type="button" class="close" aria-label="Close" ng-click="$close()">\n        <span class="pficon pficon-close" aria-hidden="true"></span>\n      </button>\n      <h4 class="modal-title">Thread</h4>\n    </div>\n    <div class="modal-body">\n      <div class="row">\n        <div class="col-md-12">\n          <dl class="dl-horizontal">\n            <dt>ID</dt>\n            <dd>{{thread.threadId}}</dd>\n            <dt>Name</dt>\n            <dd>{{thread.threadName}}</dd>\n            <dt>Waited Count</dt>\n            <dd>{{thread.waitedCount}}</dd>\n            <dt>Waited Time</dt>\n            <dd>{{thread.waitedTime}} ms</dd>\n            <dt>Blocked Count</dt>\n            <dd>{{thread.blockedCount}}</dd>\n            <dt>Blocked Time</dt>\n            <dd>{{thread.blockedTime}} ms</dd>\n            <div ng-show="thread.lockInfo != null">\n              <dt>Lock Name</dt>\n              <dd>{{thread.lockName}}</dd>\n              <dt>Lock Class Name</dt>\n              <dd>{{thread.lockInfo.className}}</dd>\n              <dt>Lock Identity Hash Code</dt>\n              <dd>{{thread.lockInfo.identityHashCode}}</dd>\n            </div>\n            <div ng-show="thread.lockOwnerId > 0">\n              <dt>Waiting for lock owned by</dt>\n              <dd><a href="" ng-click="selectThreadById(thread.lockOwnerId)">{{thread.lockOwnerId}} - {{thread.lockOwnerName}}</a></dd>\n            </div>\n            <div ng-show="thread.lockedSynchronizers.length > 0">\n              <dt>Locked Synchronizers</dt>\n              <dd>\n                <ol class="list-unstyled">\n                  <li ng-repeat="synchronizer in thread.lockedSynchronizers">\n                    <span title="Class Name">{{synchronizer.className}}</span> -\n                    <span title="Identity Hash Code">{{synchronizer.identityHashCode}}</span>\n                  </li>\n                </ol>\n              </dd>\n            </div>\n          </dl>\n        </div>\n      </div>\n      <div class="row" ng-show="thread.lockedMonitors.length > 0">\n        <div class="col-md-12">\n          <dl>\n            <dt>Locked Monitors</dt>\n            <dd>\n              <ol class="zebra-list">\n                <li ng-repeat="monitor in thread.lockedMonitors">\n                  Frame: <strong>{{monitor.lockedStackDepth}}</strong>\n                  <span class="green">{{monitor.lockedStackFrame.className}}</span>\n                  <span class="bold">.</span>\n                  <span class="blue bold">{{monitor.lockedStackFrame.methodName}}</span>\n                  &nbsp;({{monitor.lockedStackFrame.fileName}}<span ng-show="frame.lineNumber > 0">:{{monitor.lockedStackFrame.lineNumber}}</span>)\n                  <span class="orange" ng-show="monitor.lockedStackFrame.nativeMethod">(Native)</span>\n                </li>\n              </ol>\n            </dd>\n          </dl>\n        </div>\n      </div>\n      <div class="row">\n        <div class="col-md-12">\n          <dl>\n            <dt>Stack Trace</dt>\n            <dd>\n              <ol class="zebra-list">\n                <li ng-repeat="frame in thread.stackTrace">\n                  <span class="green">{{frame.className}}</span>\n                  <span class="bold">.</span>\n                  <span class="blue bold">{{frame.methodName}}</span>\n                  &nbsp;({{frame.fileName}}<span ng-show="frame.lineNumber > 0">:{{frame.lineNumber}}</span>)\n                  <span class="orange" ng-show="frame.nativeMethod">(Native)</span>\n                </li>\n              </ol>\n            </dd>\n          </dl>\n        </div>\n      </div>\n    </div>\n  </script>\n\n</div>\n');
$templateCache.put('plugins/jmx/html/attributes/attributes.html','<div class="table-view" ng-controller="Jmx.AttributesController">\n  <h2>Attributes</h2>\n  <div ng-if="gridData.length > 0">\n    <div compile="attributes"></div>\n  </div>\n</div>\n\n<script type="text/ng-template" id="gridTemplate">\n  <table class="table table-striped table-bordered table-hover jmx-attributes-table"\n    ng-class="{\'ht-table-extra-columns\': hasExtraColumns}"\n    hawtio-simple-table="gridOptions">\n  </table>\n</script>\n\n<script type="text/ng-template" id="attributeModal.html">\n  <div class="modal-header">\n    <button type="button" class="close" aria-label="Close" ng-click="$dismiss()">\n      <span class="pficon pficon-close" aria-hidden="true"></span>\n    </button>\n    <h4 class="modal-title">Attribute: {{entity.key}}</h4>\n  </div>\n  <div class="modal-body">\n    <div simple-form ng-hide="!entity.rw" name="attributeEditor" mode="edit" entity=\'entity\' data=\'attributeSchemaEdit\'></div>\n    <div simple-form ng-hide="entity.rw" name="attributeViewer" mode="view" entity=\'entity\' data=\'attributeSchemaView\'></div>\n  </div>\n  <div class="modal-footer">\n    <button type="button" class="btn btn-default" ng-click="$dismiss()">Close</button>\n    <button type="button" class="btn btn-primary" ng-show="entity.rw" ng-click="$close()">Update</button>\n  </div>\n</script>\n');
$templateCache.put('plugins/jmx/html/operations/operation-form.html','<p ng-hide="$ctrl.operation.args.length">\n  This JMX operation requires no arguments. Click the \'Execute\' button to invoke the operation.\n</p>\n<p ng-show="$ctrl.operation.args.length">\n  This JMX operation requires some parameters. Fill in the fields below and click the \'Execute\' button\n  to invoke the operation.\n</p>\n\n<form class="form-horizontal" ng-submit="$ctrl.execute()">\n  <div class="form-group" ng-repeat="formField in $ctrl.formFields">\n    <label class="col-sm-2 control-label" for="{{formField.label}}">{{formField.label}}</label>\n    <div class="col-sm-10">\n      <input type="{{formField.type}}" id="{{formField.label}}" ng-class="{\'form-control\': formField.type !== \'checkbox\'}"\n        ng-model="formField.value" ng-disabled="!$ctrl.operation.canInvoke">\n      <span class="help-block">{{formField.helpText}}</span>\n    </div>\n  </div>\n  <div class="form-group">\n    <div ng-class="{\'col-sm-offset-2 col-sm-10\': $ctrl.operation.args.length, \'col-sm-12\': !$ctrl.operation.args.length}">\n      <button type="submit" class="btn btn-primary" ng-disabled="!$ctrl.operation.canInvoke || $ctrl.isExecuting">Execute</button>\n    </div>\n  </div>\n</form>\n\n<form ng-show="$ctrl.operationResult">\n  <div class="form-group">\n    <label>Result</label>\n    <div class="hawtio-clipboard-container">\n      <button hawtio-clipboard="#operation-result" class="btn btn-default btn-lg">\n        <i class="fa fa-clipboard" aria-hidden="true"></i>\n      </button>\n      <pre ng-class="{\'jmx-operation-error\': $ctrl.operationFailed}">{{$ctrl.operationResult}}</pre>\n    </div>\n    <textarea id="operation-result" class="hawtio-clipboard-hidden-target">{{$ctrl.operationResult}}</textarea>\n  </div>\n</form>\n');
$templateCache.put('plugins/jmx/html/operations/operations.html','<h2>Operations</h2>\n<p ng-if="$ctrl.operations.length === 0">\n  This MBean has no JMX operations.\n</p>\n<div ng-if="$ctrl.operations.length > 0">\n  <p>\n    This MBean supports the following JMX operations. Expand an item in the list to invoke that operation.\n  </p>\n  <pf-list-view class="jmx-operations-list-view" items="$ctrl.operations" config="$ctrl.config"\n    menu-actions="$ctrl.menuActions">\n    <div class="list-view-pf-stacked">\n      <div class="list-group-item-heading">\n        <span class="pficon pficon-locked" ng-if="!item.canInvoke"></span>\n        {{item.readableName}}\n      </div>\n      <div class="list-group-item-text">\n        {{item.description}}\n      </div>\n    </div>\n    <list-expanded-content>\n      <operation-form operation="$parent.item"></operation-form>\n    </list-expanded-content>\n  </pf-list-view>\n</div>\n');
$templateCache.put('plugins/jmx/html/tree/content.html','<div class="tree-nav-sidebar-content">\n  <div class="spinner spinner-lg" ng-hide="$ctrl.treeFetched()"></div>\n  <div id="jmxtree" class="treeview-pf-hover treeview-pf-select"></div>\n</div>\n');
$templateCache.put('plugins/jmx/html/tree/header.html','<div class="tree-nav-sidebar-header">\n  <form role="form" class="search-pf has-button">\n    <div class="form-group has-clear">\n      <div class="search-pf-input-group">\n        <label for="input-search" class="sr-only">Search Tree:</label>\n        <input id="input-search" type="search" class="form-control" placeholder="Search tree:"\n          ng-model="$ctrl.filter">\n        <button type="button" class="clear" aria-hidden="true"\n          ng-hide="$ctrl.filter.length === 0"\n          ng-click="$ctrl.filter = \'\'">\n          <span class="pficon pficon-close"></span>\n        </button>\n      </div>\n    </div>\n    <div class="form-group tree-nav-buttons">\n      <span class="badge" ng-class="{positive: $ctrl.result.length > 0}"\n        ng-show="$ctrl.filter.length > 0">\n        {{$ctrl.result.length}}\n      </span>\n      <i class="fa fa-plus-square-o" title="Expand All" ng-click="$ctrl.expandAll()"></i>\n      <i class="fa fa-minus-square-o" title="Collapse All" ng-click="$ctrl.contractAll()"></i>\n    </div>\n  </form>\n</div>\n');
$templateCache.put('plugins/diagnostics/doc/help.md','## Diagnostics\n\nThe Diagnostics plugin provides diagnostic information about the JVM via the JVM DiagnosticCommand and HotspotDiangostic interfaces. The functionality is similar to the Diagnostic Commands view in Java Mission Control (jmc) or the command line tool jcmd. The plugin will provide corresponding jcmd commands in some scenarios.\n\n### Flight recorder\n\nThe Java Flight Recorder can be used to record diagnostics from a running Java process.  \n\n#### Unlock\n\nCommercial features must be enabled in order to use the flight recorder. The padlock will be locked and no operations are available if commercial options are not enabled. Click the padlock to unlock and enable flight recordings. Note: Running commercial options on a production system requires a valid license.\n\n#### Start\n\nStarts a recording. \n\n#### Dump\n\nDumps the contents of the current recording to disk. The file path will be listed in a table below.\n\n#### Stop\n\nStops the current recording.\n\n#### Settings\n\nHide/show the options pane.\n\n### Class Histogram\n\nClass histogram retrieves the number of instances of loaded classes and the amount of bytes they take up. \nIf the operation is repeated it will also show the difference since last run.\n\n### JVM flags\n\nThis table shows the JVM diagnostic flag settings. Your are also able to modify the settings in a running JVM.\n');
$templateCache.put('plugins/jmx/doc/help.md','## JMX\n\nThe [JMX](#/jmx/attributes) plugin in [hawtio](http://hawt.io "hawtio") gives a raw view of the underlying JMX metric data, allowing access to the entire JMX domain tree of MBeans.\n');
$templateCache.put('plugins/jvm/doc/help.md','## Connect\n\nThe Connect tab allows you to connect to local and remote Jolokia instances so you can examine JVMs.\n\nThe "Remote" sub-tab is used to manually add connection details for a Jolokia instance.  You can store connection details and quickly recall the details of a connection and connect.\n\nThe use proxy option should often be enabled, as hawtio is running in your browser; usually due to CORS; you cannot open a different host or port from your browser (due to browse security restrictions); so we have to use a proxy servlet inside the hawtio web app to proxy all requests for a different jolokia server - so we can communicate with a different jolokia agent.\nIf you use the hawtio Chrome Extension this isn\u2019t required; since Chrome Extensions are allowed to connect to any host/port.\n\nThe "Local" sub-tab lists local JVMs running on your machine and allows you to install the Jolokia JVM agent into a running JVM and connect to it.\nFor this to actually work you need to have your JDK\'s "tools.jar" in the classpath, along with Jolokia\'s JVM agent jar.\n\nThe "Discover" sub-tab lists all JVMs which Jolokia could discover in the network, using its built-in discovery.\n');
$templateCache.put('plugins/runtime/doc/help.md','## Runtime\n\nThe Runtime plugin displays information about the JVM runtime.\n\n### System Properties\n\nDisplays a filterable and sortable list of system properties.\n\n### Metrics\n\nDisplays runtime metrics from the JVM, such as memory, CPU, garbage collection and more.\n\n### Threads\n\nInspects the threads running in the JVM.\n');}]); hawtioPluginLoader.addModule("hawtio-jmx-templates");