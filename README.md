# Statistical Software Estimator

- [Configuration](#configuration)
- [Use](#use)
- [Contributing](#contributing)
- [Thanks](#thanks)

The [Statistical Software Estimator](https://bitovi.github.io/statistical-software-estimator/) provides more accurate software estimates. For the theory behind it, read [Why software projects take longer than you think: a statistical model](https://erikbern.com/2019/04/15/why-software-projects-take-longer-than-you-think-a-statistical-model.html). 

[![Software Estimator Screen Shot](https://github.com/bitovi/statistical-software-estimator/assets/78602/9d40886a-eb4f-4efa-9b4b-99d37cbe087f)](https://bitovi.github.io/statistical-software-estimator/)

Instead of modeling estimates with one value (the estimate), this tool lets you model estimates with probabilities, specifically a [log normal distribution](https://en.wikipedia.org/wiki/Log-normal_distribution) that more accurately models how software development times actually turn out.


## Need help estimating or have questions?

This project is supported by [Bitovi, an agile project management consultancy](https://www.bitovi.com/services/agile-project-management-consulting). You can get help or ask questions on our:

- [Discord Community](https://discord.gg/J7ejFsZnJ4)
- [Twitter](https://twitter.com/bitovi)

Or, you can hire us for training, consulting, or development. [Set up a free consultation.](https://www.bitovi.com/services/agile-project-management-consulting)

## Configuration

If this is your first time using it, you will want to expand the configure estimation units section and make sure its settings matches your team's needs.

![image](https://github.com/bitovi/statistical-software-estimator/assets/78602/dd972356-6d57-42d6-9827-a324ecf4d4bb)

__NOTICE__ as you change the settings from the default, these settings are saved in the URL. This url is convient to bookmark so you don't have to change the settings each time you use it.

![image](https://github.com/bitovi/statistical-software-estimator/assets/78602/aa30e3b1-69c7-4739-900f-f685578706dd)

## Use 

Once you've configured your settings.  It's time to start estimating.  Ask your team for an estimate and how confident they are about their estimate.  Enter the values and see the result.

![Software Estimator Screen Shot](https://github.com/bitovi/statistical-software-estimator/assets/78602/9d40886a-eb4f-4efa-9b4b-99d37cbe087f)

You can move your mouse over the graph to see the probability of achieving your goal for different lengths of time.  The following shows there's an 80% chance of achieving the goal in 18 days:

![Showing likelyhood of achieving goals](https://github.com/bitovi/statistical-software-estimator/assets/78602/c928dbe3-1139-4268-a6d0-f12cee661023)




## Contributing

This is an MIT licensed project. Please fork and improve. 

If you have suggestions for improvements, please create an issue in this repository.


## Thanks

A big shout out to [Jeremiah Sheehy](https://www.linkedin.com/in/jeremiah-sheehy-ba865a18b/) who built the first version of this tool and donated it to us so we could improve it.
