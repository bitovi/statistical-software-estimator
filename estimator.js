import { StacheElement, type, ObservableObject } from "//unpkg.com/can@6/core.mjs";
import graph from "./graph.js";
import {saveJSONToUrl} from "./shared/state-storage.js";

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
		"story points": ({estimate})=> estimate * pointsPerDay,
		"days": identityEstimate,
		"weeks":({estimate})=> estimate / 5
	},
	"weeks": {
		"story points": ({estimate})=> estimate * pointsPerDay / 5,
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

export class StatisticalEstimator extends StacheElement {
	static view = `

		<details class='bg-sky-100 p-3 mt-6'>
			<summary>Configure estimation units</summary>

			<div class="grid gap-3 p-3" style="grid-template-columns: max-content max-content 1fr;">
				<label class="font-bold">Estimate Unit:</label>
				<div><select value:bind="this.estimateUnit"
					id="estimateUnit"
					class="${formInput}">
					<option value="days">Days</option>
					<option value="weeks">Weeks</option>
					<option value="story points">Story Points</option>
				</select></div>
				<div><p>
					<code class="font-mono">Estimate Unit</code> is the unit your team uses to provide <code class="font-mono">raw estimates</code>.
				</p></div>


				{{# eq(this.estimateUnit, "story points")}}

					<label for="sprintWorkingDays"  class="font-bold">Sprint length in working days:</label>

					<div><input id="sprintWorkingDays"
					type="number" valueAsNumber:bind="this.sprintWorkingDays" class="${formInput} w-16" /></div>

					<p>Specify how many working days are in your team's sprints. For example, if you have
					a two week sprint, you should enter 10.</p>

					<label for="velocity"  class="font-bold">Sprint velocity in story points:</label>
					<div><input id="velocity"
						type="number" valueAsNumber:bind="this.velocity" class="${formInput} w-16" /></div>

					<p>Specify how many sprints your team completes a sprint.</p>

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
				<p><code class="font-mono">Spread Unit</code> is the unit your team uses to describe how
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
				<p><code class="font-mono">Output Unit</code> is the unit you want adjusted times provided in.
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


			<p class='pt-3'>On average, the work will complete in {{this.prettyAdjustedMean}}.</p>
			<p class='pb-3'>You are 90% likely to achieve your goal in {{this.prettyAdjustedEstimate}}.</p>

			<div id="chartdiv"></div>
	`;

	static props = {
		estimateUnit: saveJSONToUrl("estimateUnit", "days", String, stringParse),
		spreadUnit: saveJSONToUrl("spreadUnit", "confidence", String, stringParse),
		outputUnit: saveJSONToUrl("outputUnit", "days", String, stringParse),
		velocity: saveJSONToUrl("velocity", 20, type.convert(Number), numberParse),
		sprintWorkingDays: saveJSONToUrl("sprintWorkingDays", 10, type.convert(Number), numberParse),

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
		get adjustedEstimate() {
			return this.estimateInOutput * jStat.lognormal.inv(this.distributionConfidence / 100, 0, this.standardDeviations)
		},
		get meanEstimate(){
			return this.estimateInOutput * jStat.lognormal.mean(0, this.standardDeviations)
		},
		get prettyAdjustedEstimate(){
			return toPrettyValue({value: this.adjustedEstimate, outputUnit: this.outputUnit})
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

	toConfidence(stds){
		const slope = (this.highConfidence - this.lowConfidence) / (this.highConfidenceStds - this.lowConfidenceStds);

		return Math.round( stds*(slope) + this.highConfidence );
	}
	toStandardDeviations(confidence){
		const slope = -1 * (this.highConfidenceStds - this.lowConfidenceStds) / (this.highConfidence - this.lowConfidence)

		const uncertainty = (100 - confidence);
		return  (uncertainty * slope).toFixed(1);
	}
	connected(){
		this.listenTo("dataForGraph", ({value})=> {
			graph(value);
		})
		graph(this.dataForGraph);
	}
}


customElements.define("statistical-estimator", StatisticalEstimator);
