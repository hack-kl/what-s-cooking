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

var _ingredients = [];
var _currentIndex = 0;
var _lastResult = [];


var handlers = {
    //Use LaunchRequest, instead of NewSession if you want to use the one-shot model
    // Alexa, ask [my-skill-invocation-name] to (do something)...
    //'LaunchRequest': function () {
		//console.log(">>> LaunchRequest >>>");
		
    'NewSession': function () {
		console.log(">>> NewSession >>>");
        if(_ingredients.length === 0) {
            _ingredients = ['chicken'];
        }
        this.emit('FindRecipes', this);
    },
	'NewIngredientIntent': function () {
		console.log(">>> NewIngredientIntent >>>");
		
		_currentIndex = 0;
		var ingredients = this.event.request.intent.slots.ingredients;
		if (ingredients && ingredients.value) {
			_ingredients = ingredients.value.split(" ");
		} else {
			_ingredients = ['chicken'];			
		}

        this.emit('FindRecipes', this);
	},
	'AddIngredientIntent': function () {
		console.log(">>> AddIngredientIntent >>>");
		
		_currentIndex = 0;
		
		var newIngredientsList = [];
		var ingredientsToAdd = this.event.request.intent.slots.ingredients;
		if (ingredientsToAdd.value) {
			var ingredientsToAddArray = ingredientsToAdd.value.split(" ");
            newIngredientsList = _ingredients.concat(ingredientsToAddArray);
            newIngredientsList = newIngredientsList.filter(
                function(value, index, self) { 
                    return self.indexOf(value) === index;
                }
            );
			_ingredients = newIngredientsList;
		}

		this.emit('FindRecipes', this);		
	},
	'RemoveIngredientIntent': function () {
		console.log(">>> RemoveIngredientIntent >>>");
		
		_currentIndex = 0;
		
		var newIngredientsList = [];
		var ingredientsToRemove = this.event.request.intent.slots.ingredients;
		if (ingredientsToRemove.value) {
			var ingredientsToRemoveArray = ingredientsToRemove.value.split(" ");
            for (var i = 0; i < _ingredients.length; i++) {
                if (ingredientsToRemoveArray.indexOf(_ingredients[i]) === -1) {
                    newIngredientsList.push(_ingredients[i]);
                }
            }
			_ingredients = newIngredientsList;
		}

		this.emit('FindRecipes', this);
	},
    'AMAZON.HelpIntent': function () {
		console.log(">>> HelpIntent >>>");		

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
		console.log(">>> YesIntent >>>");
		
		this.emit('GetInstructions', this);
    },
	
	// get next recipe from last result
    'AMAZON.NoIntent': function () {
		console.log(">>> NoIntent >>>");
		
		_currentIndex++;
		
		console.log(">>> index >>> " + _currentIndex);
		console.log(">>> result >>> " + _lastResult);
		
		if (!_currentIndex || !_lastResult || !_lastResult.length) {
			this.emit('AMAZON.HelpIntent');
		} else {		
			var speechOutput = '';
			var repromptSpeech = '';
			

			if (_lastResult.length <= _currentIndex) {
				speechOutput = "No additional recipe containing " + _ingredients.join(" ") + "  Try removing an ingredient.";
				repromptSpeech = "Try saying, remove " + _ingredients[0];			
			} else {
				speechOutput = "Do you like " + _lastResult[_currentIndex].title.replace(/&/g, 'and') + "?";
				repromptSpeech = "Or maybe you want to add or remove an ingredient?";			
				
				console.log("speech output -> " + speechOutput);

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
		var url = "https://spoonacular-recipe-food-nutrition-v1.p.mashape.com/recipes/findByIngredients?fillIngredients=false&ingredients=" + _ingredients.join(",") +"&limitLicense=false&number=5&ranking=1";
		
		console.log(">>> FindRecipes >>> " + url);
		
		unirest.get(url).header("X-Mashape-Key", "ZVrobra1Wgmshu4HXd0zXIDreW7wp1Fxv2MjsnbTtMiT0jmH9X")
		.header("Accept", "application/json")
		.end(function (result) {
			console.log(result.status, result.headers, result.body);
		  		  
			var recipes = result.body;
			
			var speechOutput = '';
			var repromptSpeech = '';
			
			if (recipes.length == 0) {	
				speechOutput = "No recipe containing " + _ingredients.join(" ") + "  Try removing an ingredient.";
				repromptSpeech = "Try saying, remove " + _ingredients[0];
			} else {
				_lastResult = recipes;
				
				speechOutput = "Do you like " + recipes[0].title.replace(/&/g, 'and') + "?";
				repromptSpeech = "Or maybe you want to add or remove an ingredient?";
				
				console.log("speech output -> " + speechOutput);
			}
			
			that.emit(':ask', speechOutput, repromptSpeech);
		});
		
	},
	'GetInstructions': function (that) {
		var url = "https://spoonacular-recipe-food-nutrition-v1.p.mashape.com/recipes/" + _lastResult[_currentIndex].id + "/information?includeNutrition=false";
		
		console.log(">>> GetInstructions >>> " + url);
		
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
		
	},
	'Unhandled': function () {
		var message = "Say yes to get recipe instructions, or no to get next recipe.";
		this.emit(':ask', message, message);
	}

};


