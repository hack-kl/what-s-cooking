'use strict';
var Alexa = require("alexa-sdk");
var appId = 'amzn1.echo-sdk-ams.app.your-skill-id';

var unirest = require('unirest');

exports.handler = function(event, context, callback) {
    var alexa = Alexa.handler(event, context);
    alexa.appId = appId;
    alexa.dynamoDBTableName = 'whatsCooking';
    alexa.registerHandlers(handlers);
    alexa.execute();
};

var handlers = {
    //Use LaunchRequest, instead of NewSession if you want to use the one-shot model
    // Alexa, ask [my-skill-invocation-name] to (do something)...
    'LaunchRequest': function () {
    //'NewSession': function () {
        if(Object.keys(this.attributes).length === 0) {
            this.attributes['ingredients'] = ['chicken'];
        }
		//this.attributes['ingredients'] = ['chicken'];			
        this.emit('FindRecipes', this);
    },
	'NewIngredientIntent': function () {
		this.attributes['currentIndex'] = 0;
		var ingredients = this.event.request.intent.slots.ingredients;
		if (ingredients && ingredients.value) {
			this.attributes['ingredients'] = ingredients.value.split(" ");
		} else {
			//this.attributes['ingredients'] = [];			
			this.attributes['ingredients'] = ['chicken'];			
		}

        this.emit('FindRecipes', this);
	},
	'AddIngredientIntent': function () {
		this.attributes['currentIndex'] = 0;
		
		var newIngredientsList = [];
		var ingredientsToAdd = this.event.request.intent.slots.ingredients;
		if (ingredientsToAdd.value) {
			var ingredientsToAddArray = ingredientsToAdd.value.split(" ");
            newIngredientsList = this.attributes['ingredients'].concat(ingredientsToAddArray);
            newIngredientsList = newIngredientsList.filter(
                function(value, index, self) { 
                    return self.indexOf(value) === index;
                }
            );
			this.attributes['ingredients'] = newIngredientsList;
		}

		this.emit('FindRecipes', this);		
	},
	'RemoveIngredientIntent': function () {
		this.attributes['currentIndex'] = 0;
		
		var newIngredientsList = [];
		var ingredientsToRemove = this.event.request.intent.slots.ingredients;
		if (ingredientsToRemove.value) {
			var ingredientsToRemoveArray = ingredientsToRemove.value.split(" ");
            for (var i = 0; i < this.attributes['ingredients'].length; i++) {
                if (ingredientsToRemoveArray.indexOf(this.attributes['ingredients'][i]) === -1) {
                    newIngredientsList.push(this.attributes['ingredients'][i]);
                }
            }
			this.attributes['ingredients'] = newIngredientsList;
		}

		this.emit('FindRecipes', this);
	},
    'AMAZON.HelpIntent': function () {
		var speechOutput = "Ask me what I can make with carrots and cucumbers.  Add some chicken and I will make a recipe suggestion.";
		var repromptSpeech = "Can I help you with a recipe?";
		this.emit(':ask', speechOutput, repromptSpeech);
    },
    'AMAZON.StopIntent': function () {
        this.emit(':tell', "Good-bye");
    },
    'AMAZON.CancelIntent': function () {
        this.emit(':tell', "Good-bye");
    },
	
	// get instructions using rest call
    'AMAZON.YesIntent': function () {
		this.emit('GetInstructions', this);
    },
	
	// get next recipe from last result
    'AMAZON.NoIntent': function () {
		this.attributes['currentIndex']++;
		
		if (!this.attributes['currentIndex'] || !this.attributes['lastResult'] || !this.attributes['lastResult'].length) {
			this.emit('AMAZON.HelpIntent');
		} else {		
			var speechOutput = '';
			var repromptSpeech = '';
			

			if (this.attributes['lastResult'].length <= this.attributes['currentIndex']) {
				speechOutput = "No additional recipe containing " + this.attributes['ingredients'].join(" ") + "  Try removing an ingredient.";
				repromptSpeech = "Try saying, remove " + this.attributes['ingredients'][0];			
			} else {
				speechOutput = "Do you like " + this.attributes['lastResult'][this.attributes['currentIndex']].title.replace(/&/g, 'and') + "?";
				repromptSpeech = "Or maybe you want to add or remove an ingredient?";			
			}
			
			this.emit(':ask', speechOutput, repromptSpeech);
		}
    },
	
    'SessionEndedRequest': function () {
        console.log('session ended!');
        this.emit(':saveState', true);
        this.emit(':tell', "session ended!");
    },
	'FindRecipes': function (that) {
		var url = "https://spoonacular-recipe-food-nutrition-v1.p.mashape.com/recipes/findByIngredients?fillIngredients=false&ingredients=" + this.attributes['ingredients'].join(",") +"&limitLicense=false&number=5&ranking=1";
		
		console.log("url -> " + url);
		
		unirest.get(url).header("X-Mashape-Key", "ZVrobra1Wgmshu4HXd0zXIDreW7wp1Fxv2MjsnbTtMiT0jmH9X")
		.header("Accept", "application/json")
		.end(function (result) {
			console.log(result.status, result.headers, result.body);
		  		  
			var recipes = result.body;
			
			var speechOutput = '';
			var repromptSpeech = '';
			
			if (recipes.length == 0) {	
				speechOutput = "No recipe containing " + that.attributes['ingredients'].join(" ") + "  Try removing an ingredient.";
				repromptSpeech = "Try saying, remove " + that.attributes['ingredients'][0];
			} else {
				that.attributes['lastResult'] = recipes;
				
				speechOutput = "Do you like " + recipes[0].title.replace(/&/g, 'and') + "?";
				repromptSpeech = "Or maybe you want to add or remove an ingredient?";
				
				console.log("speech output -> " + speechOutput);
			}
			
			that.emit(':ask', speechOutput, repromptSpeech);
		});
		
	},
	'GetInstructions': function (that) {
		var url = "https://spoonacular-recipe-food-nutrition-v1.p.mashape.com/recipes/" + that.attributes['lastResult'][that.attributes['currentIndex']].id + "/information?includeNutrition=false";
		
		console.log("url -> " + url);
		
		unirest.get(url).header("X-Mashape-Key", "ZVrobra1Wgmshu4HXd0zXIDreW7wp1Fxv2MjsnbTtMiT0jmH9X")
		.header("Accept", "application/json")
		.end(function (result) {
			console.log(result.status, result.headers, result.body);
		  		  
			var speechOutput = '';
			
			if (!result.body.instructions) {	
				speechOutput = "There is no instruction.  Good-bye.";
			} else {
				speechOutput = "Here are the instructions: " + result.body.instructions;
			}
			
			that.emit(':tell', speechOutput);
		});
		
	}
};


