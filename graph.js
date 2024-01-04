var ESTIMATE = 10;
var MEAN = 0;
var STD = .25;
var Confidence = 50;
var Velocity = 1;
var LikelyEstimate = 0;
var EstimateCertanityWeeks = 0;
var EstimateCertanityDays = 0;
var Weeks = 0;


function create_data(interval, upper_bound, lower_bound, mean, std) {
		var n = Math.ceil((upper_bound - lower_bound) / interval)
		var data = [];

		let x_position = lower_bound;

		for (let i = 0; i < n; i++) {
				data.push({
						"y": jStat.lognormal.cdf( x_position, mean, std ),
						// "y": jStat.normal.pdf(x_position, mean, std),
						"x": x_position
				})
				x_position += interval

			}
		return (data);
}

function makeAreaUnderTheGraph({svg}){
	return svg.append("path")

			.attr("clip-path", "url(#chart-area)")
			.attr("class", "area")
			.attr("fill", "#B3B3B3")

}
function updateAreaUnderTheGraph({areaUnderGraph, area, dataset}) {
	areaUnderGraph.data(dataset).attr("d", area);
}

function makeLine({svg, className}){
	var focus = svg.append("g")
			.attr("class", className)
			.style("display", "inline");

	focus.append("circle")
			.attr("r", 4.5);

	focus.append("line");
	return focus;
}

function updateLineTo({line, xScale, yScale, dataPoint, height}){
	line.attr("transform", "translate(" + xScale(dataPoint.x) + "," + yScale(dataPoint.y) + ")");

	line.select('line')
			.attr('x1', 0)
			.attr('x2', 0)
			.attr('y1', 0)
			.attr('y2', height - yScale(dataPoint.y));
}
const pct = d3.format('02.2f');

function updateHelperText({svg, d, estimate, outputUnit, mean, std}){
	// Update center display
	// svg.select("#pdisplay").text('p(X \u2264 x) = ' + pct(jStat.lognormal.cdf(d.x, mean, std)));
	svg.select("#pdisplay").text('p(X \u2264 '+ Math.round(d.x*estimate) + ' '+outputUnit+') = ' + Math.round(jStat.lognormal.cdf(d.x, mean, std) * 100)+"%"  );
}

const bisectX = d3.bisector(function(d) {
		return d.x;
}).left;


function getClosestDataPointToX({x, dataset, xScale}) {
	var i = bisectX(dataset, x, 1),
			d0 = dataset[i - 1],
			d1 = dataset[i],
			d = x - d0.x > d1.x - x ? d1 : d0;
	return d;
}

function getClosestDataPointToEvent({element, dataset, xScale}){
	var x = xScale.invert(d3.mouse(element)[0]);

	return getClosestDataPointToX({x, dataset, xScale});
}

export default function({mean = 0, std = 1, estimate, outputUnit}){

		const capitalizedOutputUnit = outputUnit[0].toUpperCase()+
			outputUnit.substr(1);

		/*
		function updateProbabilities()
		{
				//document.getElementById("probability_50_text").innerHTML = "50% confidence = " +Math.round(pct(jStat.lognormal.inv(.5, MEAN, STD))*ESTIMATE) + " hours";
				//document.getElementById("probability_60_text").innerHTML = "60% confidence = " +Math.round(pct(jStat.lognormal.inv(.6, MEAN, STD))*ESTIMATE) + " hours";
				//document.getElementById("probability_70_text").innerHTML = "80% confidence = " +Math.round(pct(jStat.lognormal.inv(.8, MEAN, STD))*ESTIMATE) + " hours";
				Velocity = document.getElementById("txt_velocity").value;

				Weeks = (ESTIMATE/Velocity).toFixed(2);
				LikelyEstimate = pct(1/(jStat.lognormal.inv(Confidence/100, MEAN, STD)))*Weeks;
				EstimateCertanityWeeks = Math.trunc(LikelyEstimate);
				EstimateCertanityDays = LikelyEstimate - Math.floor(LikelyEstimate);


				document.getElementById("probability_50_text").innerHTML = EstimateCertanityWeeks;
				document.getElementById("probability_60_text").innerHTML = (EstimateCertanityDays * 5).toFixed(1);

				//document.getElementById("probability_70_text").innerHTML = Weeks;

		}*/

		var interval = 0.05;
		var upper_bound = 3.1;
		var lower_bound = 0;


		var margin = {
				top: 50,
				right: 20,
				bottom: 50,
				left: 50
		};
		// Lets not hard-code the chart div eventually
		let svg = d3.select("#chartdiv");
		svg.selectAll("*").remove();

		const parentElement = document.getElementById("chartdiv").parentElement;
		const baseWidth = parentElement.clientWidth,
			baseHeight = document.getElementById("chartdiv").clientHeight;
		
		var width = baseWidth - margin.left - margin.right,
				height = baseHeight - margin.top - margin.bottom;


		svg = d3.select("#chartdiv").append("svg")
				.attr("width", width + margin.left + margin.right)
				.attr("height", height + margin.top + margin.bottom)
				.append("g")
				.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

		var dataset = create_data(interval, upper_bound, lower_bound, mean, std);

		////// Define Scales /////////////////
		var xScale = d3.scaleLinear()
				.domain([d3.min(dataset, function(d) {
						return d.x;
				}), d3.max(dataset, function(d) {
						return d.x;
				})])
				.range([0, width]);

		var yScale = d3.scaleLinear()
				.domain([
						d3.min(dataset, function(d) {
								return (d.y);
						}),
						d3.max(dataset, function(d) {
								return 1;
						})
				])
				.range([height, 0]);

		var area = d3.area()
				.x(function(d) {
						return xScale(d.x);
				})
				.y1(function(d) {
						return yScale(d.y);
				});


		var xlabels = [0*estimate, .5*estimate, 1*estimate,
				1.5*estimate, 2*estimate, 2.5*estimate, 3*estimate
		].map(Math.round);

		/////// Define Axis //////////////////////////////
		var xAxis = d3.axisBottom()
				.scale(xScale)
				.ticks(xlabels.length)
				.tickFormat(function(d, i) {
						return xlabels[i];
				});

		var yAxis = d3.axisLeft()
				.scale(yScale)
				.ticks(8).tickFormat(function(d, i) {
						return Math.round(d*100)
				});



		// append data points
		svg.append("g")
				.attr("id", "circles")
				.selectAll("circle")
				.data(dataset)
				.enter()
				.append("circle")
				.attr("class", "dot")
				.attr("cx", function(d) {
						return xScale(d.x);
				})
				.attr("cy", function(d) {
						return yScale(d.y);
				})
				.attr("r", 3.0)


		area.y0(yScale(0));
		// cut off datapoints that are outside the axis
		svg.append("clipPath")
				.attr("id", "chart-area")
				.append("rect")
				.attr("width", width)
				.attr("height", height);

		// Set area coverage to x-axis 0 position, i.e. 1/2 dataset
		const areaUnderGraph = makeAreaUnderTheGraph({svg});



		svg.append("text")
				.attr("id", "pdisplay")
				.attr("x", 15)
				.attr("y", 0)
				.style("text-anchor", "start");



		//  Set up focus (container for vertical guiding line)
		const focus = makeLine({svg, className: "focus"});
		//const center_point = dataset[Math.floor(dataset.length / 2) - 1];

		const evenOdds = jStat.lognormal.inv(.5, mean, std); // this will always be 1

		const averageTime = jStat.lognormal.mean(0, std);
		const meanPoint = getClosestDataPointToX({x: averageTime, dataset, xScale});

		const estimatePoint = meanPoint //getClosestDataPointToX({x: evenOdds, dataset, xScale});


		updateLineTo({line: focus, xScale, yScale, dataPoint: estimatePoint, height});

		const areaDataset = dataset.slice(0, dataset.indexOf(estimatePoint) + 1)

		updateAreaUnderTheGraph({areaUnderGraph, area,
			dataset: [areaDataset]});

		updateHelperText({svg, d: estimatePoint, estimate, outputUnit, mean, std, });

		const meanLine = makeLine({svg, className: "mean"});


		updateLineTo({line: meanLine, xScale, yScale, dataPoint: meanPoint, height});

		/*
		var center_point = dataset[Math.floor(dataset.length / 2) - 1];
		focus.attr("transform", "translate(" + xScale(center_point.x) +
				"," + yScale(center_point.y) + ")");

		focus.append("line")
				.attr('x1', 0)
				.attr('x2', 0)
				.attr('y1', 0)
				.attr('y2', height - yScale(center_point.y));
		*/


		// rect for tracking mouse (active over dimensions of svg )
		svg.append("rect")
				.attr("class", "overlay")
				.attr("width", width)
				.attr("height", height)
				.on("pointerover", function() {
						focus.style("display", null);
				})
				.on("pointerout", function() {
						focus.style("display", "inline");
				})
				.on("pointermove", mousemove);

		// append Axes ///////////////////////////
		svg.append("g")
				.attr("class", "x axis")
				.attr("transform", "translate(0," + height + ")")
				.call(xAxis)
				.append("text")
				.attr("y", 25)
				.attr("x", "50%")
				.style("text-anchor", "end")
				.attr("dy", "0.71em")
				.attr("fill", "#000")
				.text(capitalizedOutputUnit);


		svg.append("g")
				.attr("class", "y axis")
				.call(yAxis)
				.append("text")
				.attr("transform", "rotate(-90)")
				.attr("y", -40)
				.attr("x", -150)
				.attr("dy", "0.71em")
				.attr("fill", "#000")
				.text("Likelihood of completion");;


		function mousemove(ev) {
				const d = getClosestDataPointToEvent({dataset, element: this, xScale});

				updateLineTo({line: focus, xScale, yScale, dataPoint: d, height});

				//  Update the 'area to go with the line'
				updateAreaUnderTheGraph({areaUnderGraph, area,
					dataset: [dataset.slice(0, dataset.indexOf(d) + 1)]});

				updateHelperText({svg, d, estimate, outputUnit, mean, std});

		}


		//updateProbabilities()
}
