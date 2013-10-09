var Xui = Xui || {};

Xui.Model = function(attributes, options) {
	// Check if we actually received any parameters.
	var newAttributes = attributes || {};
	if (!options) {
		options = {};
	}

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

// Add inheritable methods to our prototype.
_.extend(Xui.Model.prototype, Xui.Events, {
	initialize: function() {},

	toJSON: function() {
		return _.clone(this.attributes);
	},

	sync: function() {
		// TODO.
	},

	get: function(attribute) {
		return this.attributes[attribute];
	},

	set: function(key, value, options) {
		if (key === null) {
			return this;
		}

		if (!options) {
			options = {};
		}

		var isSet = !options.unset;

		var attributesToSet = {};

		// Check if we've been given a key-value pair,
		// or an object in the form {key: value}.
		if (typeof key === 'object') {
			attributesToSet = key;
			options = value;
		} else {
			attributesToSet[key] = value;
		}


		// Update all the attributes, keeping track of
		// which ones we changed.
		var changedAttributes = [];
		var newValue;
		for (var attribute in attributesToSet) {
			newValue = attributesToSet[attribute];

			var currentValue = this.attributes[attribute];
			if (!_.isEqual(currentValue, newValue)) {
				changedAttributes.push(attribute);
			}

			if (isSet) {
				this.attributes[attribute] = newValue;
			} else {
				delete this.attributes[attribute];
			}
		}

		// If we're not doing this silently, trigger
		// change events on everything.
		if (!options.silent) {
			for (var i = changedAttributes.length - 1; i >= 0; i--) {
				newValue = this.attributes[changedAttributes[i]];
				this.trigger('change:' + changedAttributes[i], this, newValue, options);
			}
		}

		return this;
	},

	unset: function(attribute, options) {
		return this.set(attribute, undefined, _.extend({}, options, {unset: true}));
	},

	clear: function(options) {
		// We want to clear everything at once instead
		// of just deferring to unset repeatedly.
		var blankAttributes = {};
		for (var key in this.attributes) {
			blankAttributes[key] = undefined;
		}
		return this.set(blankAttributes, _.extend({}, options, {unset: true}));
	},

	parse: function(response, options) {
		return response;
	},

	destroy: function(options) {
		// TODO.
	},

	url: function() {
		var urlRoot = _.result(this, 'urlRoot') || _.result(this.collection, 'url');
		if (!urlRoot) {
			throw new Error("url: Model has no URL specified.");
		}

		var url = urlRoot;
		if (this.id !== null) {
			// We can generate a URL for this particular model.
			var shouldPrependSlash = base.charAt(base.length - 1) !== '/';
			if (shouldPrependSlash) {
				url = url + '/';
			}
			url = url + this.id;
		} else {
			// We can't. Just return the base URL.
			return urlRoot;
		}
	}
});