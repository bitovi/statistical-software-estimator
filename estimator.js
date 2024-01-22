import { StacheElement, type, ObservableObject } from "./can.min.mjs";
import graph from "./graph.js";
import {saveJSONToUrl} from "./shared/state-storage.js";
import {getEndDateFromUTCStartDateAndBusinessDays} from "./shared/dateUtils.js";

const formInput = "shadow border rounded py-1 px-1 text-gray-700  focus:outline-none focus:shadow-outline"
const linkStyle = "hover:text-sky-500 underline text-blue-400";
const _10_confidence = 1.28; //σ
const _100_confidence = 0; // σ

function roundNearest5(num) {
  return Math.round(num / 5) * 5;
}
const identityEstimate = ({estimate})=> estimate;

const estimateToOutputConverter = {
	"story points": {
		"story points": identityEstimate,
		"days": ({estimate, pointsPerDay})=> estimate / pointsPerDay,
		"weeks":({estimate, pointsPerDay})=> estimate / pointsPerDay / 5
	},
	"days": {
		"story points": ({estimate, pointsPerDay})=> estimate * pointsPerDay,
		"days": identityEstimate,
		"weeks":({estimate})=> estimate / 5
	},
	"weeks": {
		"story points": ({estimate, pointsPerDay})=> estimate * pointsPerDay / 5,
		"days": ({estimate})=> estimate * 5,
		"weeks":identityEstimate
	}
}

function toPrettyValue({value, outputUnit}){
	const rounded = Math.round(value);
	if(outputUnit === "story points") {
		return rounded+ " story points";
	} else if(outputUnit === "days") {
		return rounded+ " days";
	} else  if(outputUnit === "weeks") {
		const totalDays = Math.round(value* 5);
		const weeks = Math.floor(totalDays / 5);
		const days = totalDays % 5;
		return weeks + " weeks and "+days+" days"
	}
}

const stringParse = {parse: x => ""+x, stringify: x => ""+x};
const numberParse = {parse: x => +x, stringify: x => ""+x};
const dateParse = {parse: x => x && new Date(x), stringify: x => x && x.toISOString()};

const dateFormatter = new Intl.DateTimeFormat('en-US',{timeZone: "UTC"})


export class StatisticalEstimator extends StacheElement {
	static view = `
    <!-- LEFT SIDE -->
    <div class='  grow'>
      <div class="pt-5">
          <label for="estimate" class="block text-white leading-5">What is your raw estimate in {{this.estimateUnit}}?</label>

          <div class="flex gap-3">
            <input type="range" min="1" max="100" step="1" id="estimate" class="flex-grow cursor-ew-resize "
              on:input:valueAsNumber:bind="this.estimate"/>
            <input type="number" valueAsNumber:bind="this.estimate" class="${formInput} w-16 text-xl leading-[30px]" />
          </div>

      </div>

      {{# eq(this.spreadUnit, "standard deviations") }}
        <div class="py-5">
            <label for="estimate" class="block text-white leading-5">How many standard deviations?</label>

            <div class="flex gap-3">
              <input type="range" min="{{this.highConfidenceStds}}" max="{{this.lowConfidenceStds}}" step="0.1" id="estimate"
               class="flex-grow cursor-ew-resize"
                on:input:valueAsNumber:bind="this.standardDeviations"/>
              <input type="number" valueAsNumber:bind="this.standardDeviations" class="${formInput} w-16 text-xl leading-[30px]" />
            </div>

        </div>
      {{/ eq }}

      {{# eq(this.spreadUnit, "confidence") }}
        <div class="py-5">
            <label for="estimate" class="block text-white leading-5">How confident are you about your estimate?</label>

            <div class="flex gap-3">
              <input type="range" min="{{this.lowConfidence}}" max="{{this.highConfidence}}" step="5"
                id="estimate" class="flex-grow cursor-ew-resize"
                on:input:valueAsNumber:bind="this.confidence"/>
              <input type="number" valueAsNumber:bind="this.confidence" class="${formInput} w-16 text-xl leading-[30px]" />
            </div>

        </div>
      {{/ eq }}
	
	  <div class="flex gap-2 place-content-between mb-5">
	  	<div class="bg-white rounded text-center p-1 drop-shadow grow shrink">
			
			<h4 class="sm:text-2xl text-base text-orange-400 whitespace-nowrap">{{this.prettyAdjustedMean}}</h4>
			{{# if(this.startDate) }}
				<h5 class="text-sm text-orange-400">due {{this.prettyEndDateOfMeanEstimate}}</h5>
			{{/ if }}
			<p class="text-sm text-orange-400">average</p>
		</div>

		<div class="bg-white rounded text-center p-1 drop-shadow grow shrink">
			<h4 class="sm:text-2xl text-base">{{this.prettyAdjustedEstimate70}}</h4>
			{{# if(this.startDate) }}
				<h5 class="text-sm">due {{this.prettyEndDateOfAdjustedEstimate70}}</h5>
			{{/ if }}
			<p class="text-sm">70% likelihood</p>


		</div>

		<div class="bg-white rounded text-center p-1 drop-shadow grow shrink">
			<h4 class="sm:text-2xl text-base">{{this.prettyAdjustedEstimate80}}</h4>
			{{# if(this.startDate) }}
				<h5 class="text-sm">due {{this.prettyEndDateOfAdjustedEstimate80}}</h5>
			{{/ if }}
			<p class="text-sm">80% likelihood</p>
		</div>

		<div class="bg-white rounded text-center p-1 drop-shadow grow shrink">
			<h4 class="sm:text-2xl text-base">{{this.prettyAdjustedEstimate90}}</h4>
			{{# if(this.startDate) }}
				<h5 class="text-sm">due {{this.prettyEndDateOfAdjustedEstimate90}}</h5>
			{{/ if }}
			<p class="text-sm">90% likelihood</p>	
		</div>
	  </div>

      

      <div id="chartdiv" style="touch-action: none" class='bg-white rounded-t-lg drop-shadow-md'></div>
	  <div class="flex bg-white gap-3">
	  	<span class="p-2">Graph Type:</span>
	  	<button class="bg-white {{#eq(this.graphType, 'cdf')}}underline{{/}}" on:click="this.graphType = 'cdf'">Cumulative Distribution Function</button>
		<button class="bg-white {{#eq(this.graphType, 'pdf')}}underline{{/}}" on:click="this.graphType = 'pdf'">Probability Density Function</button>
	  </div>
    </div>
    <!-- RIGHT SIDE -->
    <div class='shrink xl:max-w-[520px]'>

      <details class='border-color-gray-200 border-solid border rounded-lg bg-white mt-5 group'>
  			<summary class='text-base p-5 bg-gray-100 cursor-pointer rounded-lg group-open:rounded-b-none'>Configure</summary>

  			<div class="grid gap-3 p-3 configure-estimation">
  				<label class="font-bold">Estimate Unit:</label>
  				<div><select value:bind="this.estimateUnit"
  					id="estimateUnit"
  					class="${formInput}">
  					<option value="days">Days</option>
  					<option value="weeks">Weeks</option>
  					<option value="story points">Story Points</option>
  				</select></div>
  				<p class='help-text'>
  					<code class="font-mono">Estimate Unit</code> is the unit your team uses to provide <code class="font-mono">raw estimates</code>.
  				</p>


  				{{# or( eq(this.estimateUnit, "story points"), eq(this.outputUnit, "story points") ) }}

  					<label for="sprintWorkingDays"  class="font-bold">Sprint length:</label>

  					<div><input id="sprintWorkingDays"
  					type="number" valueAsNumber:bind="this.sprintWorkingDays" class="${formInput} w-16" /></div>

  					<p  class='help-text'>Specify how many working days are in your team's sprints. For example, if you have
  					a two week sprint, you should enter 10.</p>

  					<label for="velocity"  class="font-bold">Sprint velocity:</label>
  					<div><input id="velocity"
  						type="number" valueAsNumber:bind="this.velocity" class="${formInput} w-16" /></div>

  					<p class='help-text'>Specify how many story points your team completes a sprint.</p>

  				{{/ or }}

  				<label for="spreadUnit" class="font-bold">Spread Unit:</label>
  				<div>
  						<select value:bind="this.spreadUnit"
  							id="spreadUnit"
  							class="${formInput}">
  							<option value="standard deviations">Standard Deviations</option>
  							<option value="confidence">Confidence</option>
  						</select>
  				</div>
  				<p class='help-text'><code class="font-mono">Spread Unit</code> is the unit your team uses to describe how
  				close or far away the results might be from the <code class="font-mono">raw estimate</code>.
  				</p>

  				<label for="spreadUnit" class="font-bold">Output Unit:</label>
  				<div>
  						<select value:bind="this.outputUnit"
  							id="outputUnit"
  							class="${formInput}">
  							<option value="days">Days</option>
  							<option value="weeks">Weeks</option>
  							{{# eq(this.estimateUnit, "story points") }}
  								<option value="story points">Story Points</option>
  							{{/ eq}}
  						</select>
  				</div>
  				<p class='help-text'><code class="font-mono">Output Unit</code> is the unit you want adjusted times provided in.
  				</p>

  				<label for="startDate" class="font-bold">Start Date:</label>
  				<div>
  					<input type="date"
                class="${formInput}"
  							valueAsDate:bind="this.startDate"/>
  				</div>
  				<p class='help-text'>Setting <code class="font-mono">Start Date</code> lets you see
  				the estimated completion date of your work.
  				</p>

  			</div>

  		</details>

		<p class='text-base mt-5 mb-2 text-white'>This tool provides more accurate software estimates. We suggest using the 80% or 90% 
		  likelihood values for planning. For more information on how to use this tool, read
		  <a class="${linkStyle}" href="https://www.bitovi.com/academy/learn-agile-program-management-with-jira/estimating.html">Agile Program Management - Estimating</a>.  
		</p>

		<p class='text-base mb-2 text-white'>If you are using Jira, the  <a href="https://auto-scheduler.bitovi-jira.com/"
		class="${linkStyle}">Statistical AutoScheduler</a> can adjust epic story points and timing automatically.</p>
		<p class='text-base mb-2 text-white'>
		  For the theory behind the tool, read
		  <a class="${linkStyle}" href="https://erikbern.com/2019/04/15/why-software-projects-take-longer-than-you-think-a-statistical-model.html">Why software projects take longer than you think: a statistical model</a>.
		  A big shout out to
		  <a href="https://www.linkedin.com/in/jeremiah-sheehy-ba865a18b/"  class="${linkStyle}">Jeremiah Sheehy</a> who built the first version of this tool and donated
		  it to us so we could improve it. Find a copy of the source at
		  <a href="https://github.com/bitovi/statistical-software-estimator"  class="${linkStyle}">Github</a>.
		</p>
  
		<p class='text-base mb-2 text-white'>If you like this tool, checkout Bitovi's
		 
		   <a href="https://timeline-report.bitovi-jira.com/"
		   class="${linkStyle}">Timeline Report</a> tool.
		</p>
  
		<p class='text-base mb-8 text-white'>Got questions? Chat with us on
		  <a class="${linkStyle}" href="https://discord.gg/J7ejFsZnJ4">discord</a>.
		</p>

    </div>




	`;

	static props = {
		estimateUnit: saveJSONToUrl("estimateUnit", "days", String, stringParse),
		spreadUnit: saveJSONToUrl("spreadUnit", "confidence", String, stringParse),
		outputUnit: saveJSONToUrl("outputUnit", "days", String, stringParse),
		graphType: saveJSONToUrl("graphType", "cdf", String, stringParse),
		velocity: saveJSONToUrl("velocity", 20, type.convert(Number), numberParse),
		sprintWorkingDays: saveJSONToUrl("sprintWorkingDays", 10, type.convert(Number), numberParse),
		startDate: saveJSONToUrl("startDate", null, type.maybeConvert(Date), dateParse),

		estimate: {default: 10, type: type.convert(Number)},

		standardDeviations: {default: 1, type: type.convert(Number)},

		lowConfidence: 			{default: 10, type: type.convert(Number)},
		// 1.28
		lowConfidenceStds: 	{default: 1.3, type: type.convert(Number)},

		highConfidence: 		{default: 100, type: type.convert(Number)},
		highConfidenceStds: {default: 0, type: type.convert(Number)},

		distributionConfidence: {default: 90, type: type.convert(Number)},

		confidence: {
			default: 50,
			/*get(){
				return roundNearest5( this.toConfidence( this.standardDeviations ) );
			},*/
			set(confidence){
				this.standardDeviations = this.toStandardDeviations(confidence);
				return confidence;
			}
		},
		get estimateInOutput(){
			const pointsPerDay = this.velocity / this.sprintWorkingDays;
			return estimateToOutputConverter[this.estimateUnit][this.outputUnit]({
				estimate: this.estimate, pointsPerDay
			})
		},
		get estimateInDays(){
			const pointsPerDay = this.velocity / this.sprintWorkingDays;
			return estimateToOutputConverter[this.estimateUnit]["days"]({
				estimate: this.estimate, pointsPerDay
			})
		},
		get adjustedEstimate() {
			return this.estimateInOutput * jStat.lognormal.inv(this.distributionConfidence / 100, 0, this.standardDeviations)
		},
		get meanEstimate(){
			return this.estimateInOutput * jStat.lognormal.mean(0, this.standardDeviations)
		},
		get prettyEndDateOfMeanEstimate(){
			if(this.startDate) {
				const days =
					Math.round( this.estimateInDays * jStat.lognormal.mean(0, this.standardDeviations) );
				const endDate =  getEndDateFromUTCStartDateAndBusinessDays(this.startDate, days);
				return dateFormatter.format( endDate );
			}
		},
		get prettyAdjustedEstimate90(){
			return toPrettyValue({value: this.adjustedEstimate, outputUnit: this.outputUnit})
		},
		get prettyEndDateOfAdjustedEstimate90() {
			if(this.startDate) {
				return dateFormatter.format( this.calculateEndDateOfAdjustedEstimate(this.startDate, 90) )
			}
		},
		get prettyAdjustedEstimate70(){
			return toPrettyValue({
				value: this.estimateInOutput * jStat.lognormal.inv(70 / 100, 0, this.standardDeviations),
				outputUnit: this.outputUnit})
		},
		get prettyEndDateOfAdjustedEstimate70() {
			if(this.startDate) {
				return dateFormatter.format( this.calculateEndDateOfAdjustedEstimate(this.startDate, 70) )
			}
		},
		get prettyAdjustedEstimate80(){
			return toPrettyValue({
				value: this.estimateInOutput * jStat.lognormal.inv(80 / 100, 0, this.standardDeviations),
				outputUnit: this.outputUnit})
		},
		get prettyEndDateOfAdjustedEstimate80() {
			if(this.startDate) {
				return dateFormatter.format( this.calculateEndDateOfAdjustedEstimate(this.startDate, 80) )
			}
		},
		get prettyAdjustedMean(){
			return toPrettyValue({value: this.meanEstimate, outputUnit: this.outputUnit})
		},
		get dataForGraph(){
			return {
				std: this.standardDeviations,
				estimate: this.estimateInOutput,
				outputUnit: this.outputUnit,
				graphType: this.graphType
			}
		}
	};

	calculateEndDateOfAdjustedEstimate(startDate, confidenceStandard){
		const days =
			Math.round( this.estimateInDays * jStat.lognormal.inv(confidenceStandard / 100, 0, this.standardDeviations) );
		return getEndDateFromUTCStartDateAndBusinessDays(startDate, days);
	}

	toConfidence(stds){
		const slope = (this.highConfidence - this.lowConfidence) / (this.highConfidenceStds - this.lowConfidenceStds);

		return Math.round( stds*(slope) + this.highConfidence );
	}
	toStandardDeviations(confidence){
		const slope = -1 * (this.highConfidenceStds - this.lowConfidenceStds) / (this.highConfidence - this.lowConfidence)
		const uncertainty = (100 - confidence);
		return  (uncertainty * slope)//.toFixed(1);
	}
	connected(){
    document.getElementById("chartdiv").addEventListener("pointerdown",(ev)=>{
      ev.preventDefault();
    })

		this.listenTo("dataForGraph", ({value})=> {
			graph(value);
		})
		graph(this.dataForGraph);

		this.listenTo(window,"resize", ()=>{
			graph(this.dataForGraph);
		})
	}
}


customElements.define("statistical-estimator", StatisticalEstimator);
