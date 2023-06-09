import { StacheElement, type, ObservableObject } from "//unpkg.com/can@6/core.mjs";
import graph from "./graph.js";
import {saveJSONToUrl} from "./shared/state-storage.js";
import {getEndDateFromUTCStartDateAndBusinessDays} from "./shared/dateUtils.js";

const formInput = "shadow border rounded py-1 px-1 text-gray-700  focus:outline-none focus:shadow-outline"

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

		<details class='bg-sky-100 p-3 mt-6'>
			<summary>Configure estimation units</summary>

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

					<label for="sprintWorkingDays"  class="font-bold">Sprint length in working days:</label>

					<div><input id="sprintWorkingDays"
					type="number" valueAsNumber:bind="this.sprintWorkingDays" class="${formInput} w-16" /></div>

					<p  class='help-text'>Specify how many working days are in your team's sprints. For example, if you have
					a two week sprint, you should enter 10.</p>

					<label for="velocity"  class="font-bold">Sprint velocity in story points:</label>
					<div><input id="velocity"
						type="number" valueAsNumber:bind="this.velocity" class="${formInput} w-16" /></div>

					<p class='help-text'>Specify how many sprints your team completes a sprint.</p>

				{{/ eq }}

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
							valueAsDate:bind="this.startDate"/>
				</div>
				<p class='help-text'>Setting <code class="font-mono">Start Date</code> lets you see
				the estimated completion date of your work.
				</p>

			</div>

		</details>

			<div class="pt-6">
					<label for="estimate" class="block">What is your raw estimate in {{this.estimateUnit}}?</label>

					<div class="flex gap-3">
						<input type="range" min="1" max="300" step="1" id="estimate" class="flex-grow"
							on:input:valueAsNumber:bind="this.estimate"/>
						<input type="number" valueAsNumber:bind="this.estimate" class="${formInput} w-16" />
					</div>

			</div>

			{{# eq(this.spreadUnit, "standard deviations") }}
				<div class="py-3">
						<label for="estimate" class="block">How many standard deviations?</label>

						<div class="flex gap-3">
							<input type="range" min="{{this.highConfidenceStds}}" max="{{this.lowConfidenceStds}}" step="0.1" id="estimate" class="flex-grow"
								on:input:valueAsNumber:bind="this.standardDeviations"/>
							<input type="number" valueAsNumber:bind="this.standardDeviations" class="${formInput} w-16" />
						</div>

				</div>
			{{/ eq }}

			{{# eq(this.spreadUnit, "confidence") }}
				<div class="py-3">
						<label for="estimate" class="block">How confident are you about your estimate?</label>

						<div class="flex gap-3">
							<input type="range" min="{{this.lowConfidence}}" max="{{this.highConfidence}}" step="5"
								id="estimate" class="flex-grow"
								on:input:valueAsNumber:bind="this.confidence"/>
							<input type="number" valueAsNumber:bind="this.confidence" class="${formInput} w-16" />
						</div>

				</div>
			{{/ eq }}


			<p class='pt-3'>On average, work will complete in {{this.prettyAdjustedMean}}{{# if(this.startDate) }}
				on {{this.prettyEndDateOfMeanEstimate}}.
				{{ else }}.{{/ if}}
			</p>
			<p class=''>It's 70% likely work will complete in {{this.prettyAdjustedEstimate70}}{{# if(this.startDate) }}
				on {{this.prettyEndDateOfAdjustedEstimate70}}.
				{{ else }}.{{/ if}}
			</p>
			<p class=''>It's 80% likely work will complete in {{this.prettyAdjustedEstimate80}}{{# if(this.startDate) }}
				on {{this.prettyEndDateOfAdjustedEstimate80}}.
				{{ else }}.{{/ if}}
			</p>
			<p class='pb-3'>It's 90% likely work will complete in {{this.prettyAdjustedEstimate90}}{{# if(this.startDate) }}
				on {{this.prettyEndDateOfAdjustedEstimate90}}.
				{{ else }}.{{/ if}}
			</p>

			<div id="chartdiv"></div>
	`;

	static props = {
		estimateUnit: saveJSONToUrl("estimateUnit", "days", String, stringParse),
		spreadUnit: saveJSONToUrl("spreadUnit", "confidence", String, stringParse),
		outputUnit: saveJSONToUrl("outputUnit", "days", String, stringParse),
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
				outputUnit: this.outputUnit
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
