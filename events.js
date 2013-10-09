// Similar to Backbone Events, this is intended
// to be added to any object via _.extend().

var Events = {
	// A context can be optionally specified.
	on: function (name, callback, context) {
		if (!callback) {
			return this;
		}

		if (!this._eventsMap) {
			// Initialize the map of events.
			this._eventsMap = {};
		}

		if (!this._eventsMap[name]) {
			// We don't already have events with this name.
			// Create an array for them.
			this._eventsMap[name] = [];
		}

		this._eventsMap[name].push({
			callback: callback,
			context: context || this
		});
		return this;
	},

	off: function (name, callback) {
		// If no name is passed, remove all events.
		if (!name) {
			this._eventsMap = {};
			return this;
		}
		// At this point, we have an event name to be removed.

		if (!this._eventsMap || !this._eventsMap[name]) {
			// We don't need to do anything, since
			// no events have been bound to this name.
			return this;
		}

		// We now know there are events to be removed.
		// If we weren't given a callback, remove all of them.
		if (!callback) {
			this._eventsMap[name] = [];
			return this;
		}

		// We were given a callback. Remove it if it's present.
		this._eventsMap[name] = _.reject(this._eventsMap[name], function (event) {
			return event.callback === callback;
		});
		return this;
	},

	trigger: function (name) {
		// Do nothing if we have no name or bound events.
		if (!name || !this._eventsMap) {
			return this;
		}

		// Get the arguments to be passed to the callbacks.
		var callbackArgs = Array.prototype.slice.call(arguments, 1);

		var eventCallbacks = this._eventsMap[name];
		if (eventCallbacks && eventCallbacks.length) {
			_.each(eventCallbacks, function (callbackObject) {
				var context = callbackObject.context;
				callbackObject.callback.apply(context, callbackArgs);
			});
		}

		// Check if anything's listening for "all" events.
		var allCallbacks = this._eventsMap['all'];
		if (allCallbacks && allCallbacks.length) {
			_.each(allCallbacks, function(callbackObject) {
				var context = callbackObject.context;
				// Note that we pass all arguments here, so the callback
				// knows what the actual event that was triggered was.
				callbackObject.callback.apply(context, arguments);
			});
		}

		return this;
	}
};