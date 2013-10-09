// Similar to Backbone Events, this is intended
// to be added to any object via _.extend().

var Events = {
	on: function(name, callback) {
		if (!this.eventsMap) {
			// Initialize the map of events.
			this.eventsMap = {};
		}
		
		if (!this.eventsMap[name]) {
			// We don't already have events with this name.
			// Create an array for them.
			this.eventsMap[name] = [];
		}

		this.eventsMap[name].push({callback: callback});
		return this;
	},

	off: function(name, callback) {
		// If no name is passed, remove all events.
		if (!name) {
			this.eventsMap = {};
			return this;
		}
		// At this point, we have an event name to be removed.
		
		if (!this.eventsMap || !this.eventsMap[name]) {
			// We don't need to do anything, since
			// no events have been bound to this name.
			return this;
		}

		// We now know there are events to be removed.
		// If we weren't given a callback, remove all of them.
		if (!callback) {
			this.eventsMap[name] = [];
			return this;
		}

		// We were given a callback. Remove it if it's present.
		this.eventsMap[name] = _.reject(this.eventsMap[name], function(event) {
			return event.callback === callback;
		});
		return this;
	}
};