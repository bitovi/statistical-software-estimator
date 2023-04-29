var ESTIMATE = 10;
var MEAN = 0;
var STD = .25;
var Confidence = 10;
var Velocity = 1;
var LikelyEstimate = 0;
var EstimateCertanityWeeks = 0;
var EstimateCertanityDays = 0;
var Weeks = 0;


function d3_go(){
    var bisectX = d3.bisector(function(d) {
        return d.x;
    }).left;
    var pct = d3.format('02.2f');
    function updateProbabilities()
    {
        //document.getElementById("probability_50_text").innerHTML = "50% confidence = " +Math.round(pct(jStat.lognormal.inv(.5, MEAN, STD))*ESTIMATE) + " hours";
        //document.getElementById("probability_60_text").innerHTML = "60% confidence = " +Math.round(pct(jStat.lognormal.inv(.6, MEAN, STD))*ESTIMATE) + " hours";
        //document.getElementById("probability_70_text").innerHTML = "80% confidence = " +Math.round(pct(jStat.lognormal.inv(.8, MEAN, STD))*ESTIMATE) + " hours";
        Velocity = document.getElementById("txt_velocity").value; 
        Weeks = Math.round(pct(jStat.lognormal.inv(.9, MEAN, STD))*ESTIMATE)/Velocity ;
        EstimateCertanityWeeks = Math.trunc(Weeks);
        EstimateCertanityDays = Weeks - Math.floor(Weeks);
                        
        document.getElementById("probability_50_text").innerHTML = EstimateCertanityWeeks;
        document.getElementById("probability_60_text").innerHTML = Math.round(EstimateCertanityDays * 5);
        
                                 
      
    }

    var numDataPoints = 1000;
    var interval = 0.05;
    var upper_bound = 3.1;
    var lower_bound = 0;
    var mean = MEAN;
    var std = STD;
    

    var margin = {
        top: 50,
        right: 20,
        bottom: 50,
        left: 50
    };

    var width = 960 - margin.left - margin.right,
        height = 500 - margin.top - margin.bottom;

    var svg = d3.select("#chartdiv");
    svg.selectAll("*").remove();
    var svg = d3.select("#chartdiv").append("svg")
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
                return d.y;
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


    var xlabels = [0*Weeks, .5*Weeks, 1*Weeks,
        1.5*Weeks, 2*Weeks, 2.5*Weeks, 3*Weeks
    ];
   
    /////// Define Axis //////////////////////////////
    var xAxis = d3.axisBottom()
        .scale(xScale)
        .ticks(xlabels.length)
        .tickFormat(function(d, i) {
            return xlabels[i];
        });

    var yAxis = d3.axisLeft()
        .scale(yScale)
        .ticks(8);



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
    svg.append("path")
        .data([dataset.slice(0, Math.floor(dataset.length / 2))])
        .attr("clip-path", "url(#chart-area)")
        .attr("class", "area")
        .attr("fill", "steelblue")
        .attr("d", area);

    svg.append("text")
        .attr("id", "pdisplay")
        .attr("x", 760)
        .attr("y", 50)
        .style("text-anchor", "middle")
        .text("p(X \u2264 x) = 0.50");

    var focus = svg.append("g")
        .attr("class", "focus")
        .style("display", "inline");

    focus.append("circle")
        .attr("r", 4.5);


    //  Set up focus (container for vertical guiding line)
    var center_point = dataset[Math.floor(dataset.length / 2) - 1];
    focus.attr("transform", "translate(" + xScale(center_point.x) +
        "," + yScale(center_point.y) + ")");

    focus.append("line")
        .attr('x1', 0)
        .attr('x2', 0)
        .attr('y1', 0)
        .attr('y2', height - yScale(center_point.y));;
    // rect for tracking mouse (active over dimensions of svg )
    svg.append("rect")
        .attr("class", "overlay")
        .attr("width", width)
        .attr("height", height)
        .on("mouseover", function() {
            focus.style("display", null);
        })
        .on("mouseout", function() {
            focus.style("display", "inline");
        })
        .on("mousemove", mousemove);

    // append Axes ///////////////////////////
    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis)
        .append("text")
        .attr("y", 16)
        .attr("x", 30)
        .attr("dy", "0.71em")
        .attr("fill", "#000")
        .text("Weeks");;


    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis)
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("x", -10)
        .attr("dy", "0.71em")
        .attr("fill", "#000")
        .text("Probability Density");;


    function mousemove() {
        var x0 = xScale.invert(d3.mouse(this)[0]),
            i = bisectX(dataset, x0, 1),
            d0 = dataset[i - 1],
            d1 = dataset[i],
            d = x0 - d0.x > d1.x - x0 ? d1 : d0;

        focus.attr("transform", "translate(" + xScale(d.x) + "," + yScale(d.y) + ")");
        focus.select('line')
            .attr('x1', 0)
            .attr('x2', 0)
            .attr('y1', 0)
            .attr('y2', height - yScale(d.y));

        // //  Update the 'area to go with the line'
        svg.select("path")
            .data([dataset.slice(0, dataset.indexOf(d) + 1)])
            .attr("d", area);
        // Update center display
        // svg.select("#pdisplay").text('p(X \u2264 x) = ' + pct(jStat.lognormal.cdf(d.x, mean, std)));
        svg.select("#pdisplay").text('p(X \u2264 '+ Math.round(d.x*Weeks) + ' Weeks) = ' + pct(jStat.lognormal.cdf(d.x, mean, std)));


    }

    function create_data(interval, upper_bound, lower_bound, mean, std) {
        var n = Math.ceil((upper_bound - lower_bound) / interval)
        var data = [];

        x_position = lower_bound;
        for (i = 0; i < n; i++) {
            data.push({
                "y": jStat.lognormal.pdf( x_position, mean, std ),
                // "y": jStat.normal.pdf(x_position, mean, std),
                "x": x_position
            })
            x_position += interval
        }
        return (data);
    }
    updateProbabilities()
}

// SLIDERS


// First let's set the colors of our sliders
const settings={
    fill: '#1abc9c',
    background: '#d7dcdf'
}

var stdSlider = document.getElementById("std_input");
var estimateSlider = document.getElementById("estimate_input");
              
// Look inside our slider for our input add an event listener
//   ... the input inside addEventListener() is looking for the input action, we could change it to something like change
stdSlider.querySelector('input').addEventListener('input', (event)=>{
    // 1. apply our value to the span
    stdSlider.querySelector('span').innerHTML = +event.target.value;
    // 2. apply our fill to the input
    applyFill(event.target);

    Confidence = event.target.value;

    
    STD =  (100 - Confidence) * 1.28 * (1/.9) / 100;
                          

    d3_go()
});

estimateSlider.querySelector('input').addEventListener('input', (event)=>{
    // 1. apply our value to the span
    estimateSlider.querySelector('span').innerHTML = +event.target.value;
    // 2. apply our fill to the input
    applyFill(event.target);

    ESTIMATE = event.target.value
    d3_go()
});

          // Don't wait for the listener, apply it now!

    // This function applies the fill to our sliders by using a linear gradient background
function applyFill(slider) {
    // Let's turn our value into a percentage to figure out how far it is in between the min and max of our input
   
    const percentage = 100*(slider.value-slider.min)/(slider.max-slider.min);
    // now we'll create a linear gradient that separates at the above point
    // Our background color will change here
    const bg = `linear-gradient(90deg, ${settings.fill} ${percentage}%, ${settings.background} ${percentage+0.1}%)`;
    slider.style.background = bg;
}


d3_go()

applyFill(stdSlider.querySelector('input'));
applyFill(estimateSlider.querySelector('input'));