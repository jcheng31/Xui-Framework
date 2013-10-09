var Xui = Xui || {};

Xui.Model = function(attributes, options) {
	// Check if we actually received any parameters.
	var newAttributes = attributes || {};
	options = options || {};

	this.attributes = {};
	
	// Options that should be attached to the model (if given in the options map.)
	var optionsToAttach = ['url', 'urlRoot', 'collection'];
	var modelOptions = _.pick(options, optionsToAttach);
	_.extend(this, modelOptions);

	// If we have a parse method, use it.
	if (options.parse) {
		newAttributes = this.parse(newAttributes, options) || {};
	}

	// Fill in the blanks with our default values.
	var defaults = _.result(this, 'defaults');
	if (defaults) {
		newAttributes = _.defaults({}, newAttributes, defaults);
	}

	this.set(newAttributes, options);
	this.clientId = _.uniqueId('model');

	// Call our initialize method.
	this.initialize.apply(this, arguments);
};
