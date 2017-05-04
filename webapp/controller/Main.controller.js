jQuery.sap.require("sap/ui/thirdparty/d3");
sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/thirdparty/d3"
], function(Controller, d3) {
	"use strict";

	return Controller.extend("corp.sap.d3sample.controller.Main", {

		onAfterRendering: function() {
			var thisView = this.getView();
			var containerId = thisView.getId() + "--container";
			var containerSelector = '#' + containerId;
			var container = d3.select(containerSelector);
			var containerParent = document.getElementById(containerId).parentElement;
			// 
			var containerParentWidth = containerParent;
			var containerParentHeight = containerParent;

			var data;
			var boxWidth = 150,
				boxHeight = 40,
				boxWidthWPadding = 200,
				boxHeightWPadding = 100,
				duration = 300;

			var svgHeight = 500,
				svgWidth = 1000;

			var div = d3.select('#' + containerId).append("div")
				.attr("class", "tooltip")
				.style("opacity", 1e-6);

			// Setup zoom and pan
			var zoom = d3.behavior.zoom()
				.scaleExtent([.1, 1])
				.on('zoom', function() {
					svg.attr("transform", "translate(" + d3.event.translate + ") scale(" + d3.event.scale + ")");
				})
				// Offset so that first pan and zoom does not jump back to the origin
				.translate([150, 200]);

			var svg = d3.select('#' + containerId).append("svg")
				.attr('width', svgWidth)
				.attr('height', svgHeight)
				.call(zoom)
				.append('g')

			// Left padding of tree so that the whole root node is on the screen.
			// TODO: find a better way
			.attr("transform", "translate(150,200)");

			var tree = d3.layout.tree()

			// Using nodeSize we are able to control
			// the separation between nodes. If we used
			// the size parameter instead then d3 would
			// calculate the separation dynamically to fill
			// the available space.
			.nodeSize([100, 200])

			// By default, cousins are drawn further apart than siblings.
			// By returning the same value in all cases, we draw cousins
			// the same distance apart as siblings.
			.separation(function() {
				return 2;
			})

			// Tell d3 what the child nodes are. Remember, we're drawing
			// a tree so the ancestors are child nodes.
			.children(function(d) {

				// If the person is collapsed then tell d3
				// that they don't have any ancestors.
				if (d.collapsed) {
					return;
				} else {
					return d.nodes;
				}
			});

			d3.json('data/template_plan.json', function(error, json) {

				var idx = 0;

				var give_id = function(node) {
					node.id = ++idx;
					if (node.nodes) {
						node.nodes.forEach(function(node) {
							give_id(node);
						});
					}
				};

				give_id(json);

				// Start with only the first few generations showing
				json.nodes.forEach(function(node) {
					node.nodes.forEach(function(node) {
						collapse(node);
					});
				});

				data = json;

				draw(data);

			});

			function draw(source) {

				var nodes = tree.nodes(data),
					links = tree.links(nodes);

				// Update nodes    
				var node = svg.selectAll("g.node")

				// The function we are passing provides d3 with an id
				// so that it can track when data is being added and removed.
				// This is not necessary if the tree will only be drawn once
				// as in the basic example.
				.data(nodes, function(d) {
					return d.id;
				});

				// Add any new nodes
				var nodeEnter = node.enter().append("g")
					.attr("class", "node")
					.attr('transform', function(d) {
						return 'translate(' + (source.y0 + boxWidth / 2) + ',' + source.x0 + ')';
					})
					.on('click', toggleNode);

				var offsetX = svgWidth / 2 - boxWidth;

				// Draw the rectangle person boxes
				nodeEnter.append("rect")
					.attr({
						width: boxWidth,
						height: boxHeight
					})
					.attr('x', function(d) {
						if (d.parent) {
							return offsetX - (boxWidth / 2) - (d.x - d.parent.x);
						} else {
							return offsetX - (boxWidth / 2);
						}
					})
					.attr('y', function(d) {
						return -(d.parent && (d.y - d.parent.y)) || 0;
					})
					.on('mouseover', function(d) {
						div.transition()
							.duration(300)
							.style("opacity", 1);
					})
					.on("mousemove", function(d) {
						div
							.text("Planning Amount:" + d.planningAmount)
							.style("left", (d3.event.pageX) + "px")
							.style("top", (d3.event.pageY) + "px");
					}).on('mouseout', function(d) {
						div.transition()
							.duration(300)
							.style("opacity", 1e-6);
					});

				// Draw the person's name and position it inside the box
				nodeEnter.append("text")
					.attr('dx', function(d) {
						if (d.parent) {
							return offsetX - (d.x - d.parent.x);
						} else {
							return offsetX;
						}
					})
					.attr('dy', function(d) {
						return -(d.parent && (d.y - d.parent.y)) || 0;
					})
					.style("text-anchor", "middle")
					.text(function(d) {
						return d.text;
					})
					.on('mouseover', function(d) {
						div.transition()
							.duration(300)
							.style("opacity", 1);
					})
					.on("mousemove", function(d) {
						div
							.text("Planning Amount:" + d.planningAmount)
							.style("left", (d3.event.pageX) + "px")
							.style("top", (d3.event.pageY) + "px");
					})
					.on('mouseout', function(d) {
						div.transition()
							.duration(300)
							.style("opacity", 1e-6);
					});

				var nodeUpdate = node.transition()
					.duration(duration)
					.attr("transform", function(d) {
						return "translate(" + d.x + "," + (d.y) + ")";
					});

				nodeUpdate.select('rect')
					.attr({
						x: offsetX - (boxWidth / 2),
						y: -(boxHeight / 2),
						width: boxWidth,
						height: boxHeight
					});

				// Move text to it's proper position
				nodeUpdate.select('text')
					.attr("dx", offsetX)
					.attr("dy", 0)
					.style('fill-opacity', 1);

				// Update the position of both old and new nodes
				node.attr("transform", function(d) {
					return "translate(" + d.x + "," + d.y + ")";
				});

				// Remove nodes we aren't showing anymore
				var NodeExit = node
					.exit()
					.transition()
					.duration(duration)
					.remove();

				NodeExit.select('rect')
					.attr({
						width: 0,
						height: 0
					});

				// Fade out the text as we remove it
				NodeExit
					.select('text')
					.style('fill-opacity', 0)
					.remove();

				// Update links
				var link = svg.selectAll("path.link")
					.data(links, function(d) {
						return d.target.id;
					});

				// Add new links    
				link
					.enter()
					.append("path")
					.attr("class", "link")
					.attr("d", function(d) {
						return "M" + (offsetX + source.x) + "," + (source.y + boxHeight / 2) + "V" + source.y + "H" + (offsetX + source.x) + "V" +
							source.y;
					});

				// Remove any links we don't need anymore
				// if part of the tree was collapsed
				link
					.exit()
					.transition()
					.duration(duration)
					.style("display", "none")
					.remove();

				// Update the links positions (old and new)
				link
					.transition()
					.duration(duration)
					.attr("d", elbow(offsetX));

				nodes.forEach(function(node) {
					node.x0 = node.x;
					node.y0 = node.y;
				});
			}

			/**
			 * Update a person's state when they are clicked.
			 */
			function toggleNode(d) {
				if (d.collapsed) {
					d.collapsed = false;
				} else {
					collapse(d);
				}
				draw(d);
			}

			/**
			 * Collapse person (hide their ancestors). We recursively
			 * collapse the ancestors so that when the person is
			 * expanded it will only reveal one generation. If we don't
			 * recursively collapse the ancestors then when
			 * the person is clicked on again to expand, all ancestors
			 * that were previously showing will be shown again.
			 * If you want that behavior then just remove the recursion
			 * by removing the if block.
			 */
			function collapse(node) {
				node.collapsed = true;
				if (node.nodes) {
					node.nodes.forEach(collapse);
				}
			}

			/**
			 * Custom path function that creates straight connecting lines.
			 * Calculate start and end position of links.
			 * Instead of drawing to the center of the node,
			 * draw to the border of the person profile box.
			 * That way drawing order doesn't matter. In other
			 * words, if we draw to the center of the node
			 * then we have to draw the links first and the
			 * draw the boxes on top of them.
			 */
			function elbow(offsetX) {
				return function(d) {
					var sourceX = d.source.y + boxHeight / 2,
						sourceY = offsetX + d.source.x,
						targetX = d.target.y - boxHeight / 2,
						targetY = offsetX + d.target.x;

					return "M" + sourceY + "," + sourceX + "V" + ((sourceX + (targetX - sourceX) / 2)) + "H" + targetY + "V" + targetX;
				};
			};

		}

	});
});