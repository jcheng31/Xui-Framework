var root = this;

var array = [];
var push = array.push;
var slice = array.slice;
var splice = array.splice;

var _ = root._;
if (!_ && (typeof require !== 'undefined')) _ = require('underscore');

Xui = {};

Xui.$ = root.jQuery || root.Zepto || root.ender || root.$;

// Similar to Backbone Events, this is intended
// to be added to any object via _.extend().
var Events = Xui.Events = {
    // A context can be optionally specified.
    on: function (name, callback, context) {
        if (!eventProcessor(this, 'on', name, [callback, context]) || !callback) {
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

    off: function (name, callback, context) {
        // If no name is passed, remove all events.
        if (!name) {
            this._eventsMap = {};
            return this;
        }
        // At this point, we have an event name to be removed.

        if (!this._eventsMap || !this._eventsMap[name] || !eventProcessor(this, 'off', name, [callback, context])) {
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
        // Do nothing if we have no bound events.
        if (!this._eventsMap) {
            return this;
        }

        // Get the arguments to be passed to the callbacks.
        var callbackArgs = Array.prototype.slice.call(arguments, 1);

        // Handle multi-event triggers.
        if (!eventProcessor(this, 'trigger', name, callbackArgs)) {
            return this;
        }

        // This is a single, lone event. Handle it.
        var eventCallbacks = this._eventsMap[name];
        _.each(eventCallbacks, function (callbackObject) {
            var context = callbackObject.context;
            callbackObject.callback.apply(context, callbackArgs);
        });

        // Check if anything's listening for "all" events.
        var allCallbacks = this._eventsMap['all'];
        var originalArguments = arguments;
        _.each(allCallbacks, function (callbackObject) {
            var context = callbackObject.context;
            // Note that we pass all arguments here, so the callback
            // knows what the actual event that was triggered was.
            callbackObject.callback.apply(context, originalArguments);
        });

        return this;
    },

    listenTo: function (target, name, callback) {
        if (target.on) {
            if (!this._listeningTo) {
                this._listeningTo = [];
            }
            this._listeningTo.push({
                target: target,
                name: name,
                callback: callback
            });

            target.on(name, callback, this);
        } else {
            console.log("listenTo: object doesn't support events!");
        }
        return this;
    },

    stopListening: function (target, name) {
        if (!this._listeningTo) {
            // We're not listening to anything, so
            // we're done.
            return this;
        }

        var targetEvents;
        if (!name) {
            targetEvents = _.filter(this._listeningTo, function (callbackMap) {
                return callbackMap.target === target;
            });
        } else {
            targetEvents = _.filter(this._listeningTo, function (callbackMap) {
                return callbackMap.target === target && callbackMap.name === name;
            });
        }

        _.each(targetEvents, function (callbackMap) {
            var callback = callbackMap.callback;
            target.off(name, callback);
        });

        return this;
    }

};

var eventProcessor = function(target, callback, eventName, remaining) {
    if (typeof eventName === 'object') {
        for (var key in eventName) {
            var concatenatedArguments = [key, eventName[key]].concat(remaining);
            target[callback].apply(target, concatenatedArguments);
        }
        return false;
    }

    var spaceSplitter = /\s+/;
    if (spaceSplitter.test(eventName)) {
        var eventNames = eventName.split(spaceSplitter);
        for (var i = 0; i < eventNames.length; i++) {
            target[callback].apply(target, [eventNames[i]].concat(remaining));
        }
        return false;
    }

    return true;
};

var Model = Xui.Model = function (attributes, options) {
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
    initialize: function () {},

    toJSON: function () {
        return _.clone(this.attributes);
    },

    sync: function () {
        return Xui.sync.apply(this, arguments);
    },

    fetch: function (options) {
        var fetchOptions = {};
        if (options) {
            fetchOptions = _.clone(options);
        }

        var model = this;

        var userSpecifiedCallback = fetchOptions.success;
        fetchOptions.success = function (response) {
            var parsedResponse = model.parse(response, fetchOptions);
            var setSuccess = model.set(parsedResponse, fetchOptions);
            if (!setSuccess) {
                return false;
            }

            if (userSpecifiedCallback) {
                userSpecifiedCallback(model, response, fetchOptions);
            }
            model.trigger('sync', model, response, fetchOptions);
        };
        fetchOptions.error = function (a, b, c) {
            console.log("Error");
            console.log(a);
            console.log(b);
            console.log(c);
        };

        return this.sync('read', this, fetchOptions);
    },

    get: function (attribute) {
        return this.attributes[attribute];
    },

    set: function (key, value, options) {
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

    unset: function (attribute, options) {
        return this.set(attribute, undefined, _.extend({}, options, {
            unset: true
        }));
    },

    clear: function (options) {
        // We want to clear everything at once instead
        // of just deferring to unset repeatedly.
        var blankAttributes = {};
        for (var key in this.attributes) {
            blankAttributes[key] = undefined;
        }
        return this.set(blankAttributes, _.extend({}, options, {
            unset: true
        }));
    },

    parse: function (response, options) {
        return response;
    },

    destroy: function (options) {
        var syncOptions = {};
        if (options) {
            syncOptions = _.clone(options);
        }

        var modelToDestroy = this;
        var successCallback = options.success;

        var triggerDestroyEvent = function () {
            modelToDestroy.trigger('destroy', modelToDestroy, modelToDestroy.collection, syncOptions);
        };

        syncOptions.success = function (response) {
            if (syncOptions.wait) {
                triggerDestroyEvent();
            }
            if (successCallback) {
                successCallback(modelToDestroy, response, syncOptions);
            }
            modelToDestroy.trigger('sync', modelToDestroy, response, syncOptions);
        };

        var request = this.sync('delete', this, syncOptions);
        if (!syncOptions.wait) {
            triggerDestroyEvent();
        }
        return request;
    },

    url: function () {
        var urlRoot = _.result(this, 'urlRoot') || _.result(this.collection, 'url');
        if (!urlRoot) {
            throw new Error("url: Model has no URL specified.");
        }

        var url = urlRoot;
        if (this.id !== null) {
            // We can generate a URL for this particular model.
            var shouldPrependSlash = urlRoot.charAt(urlRoot.length - 1) !== '/';
            if (shouldPrependSlash) {
                url = url + '/';
            }
            return url = url + this.get('id');
        } else {
            // We can't. Just return the base URL.
            return urlRoot;
        }
    },

    _validate: function () {
        return true;
    }
});

var Collection = Xui.Collection = function (models, options) {
    if (!options) {
        options = {};
    }

    if (options.url) {
        this.url = options.url;
    }
    if (options.model) {
        this.model = options.model;
    }
    if (!isUndefined(options.comparator)) {
        this.comparator = options.comparator;
    }
    this._reset();
    this.initialize.apply(this, arguments);
    if (models) this.reset(models, _.extend({
        silent: true
    }, options));
};

// Default options for `Collection#set`.
var setOptions = {
    add: true,
    remove: true,
    merge: true
};
var addOptions = {
    add: true,
    merge: false,
    remove: false
};

// Define the Collection's inheritable methods.
_.extend(Collection.prototype, Xui.Events, {
    model: Xui.Model,

    // Initialize is an empty function by default.
    initialize: function () {},

    // The JSON representation of a Collection is an array of the
    // models' attributes.
    toJSON: function (options) {
        return this.map(function (model) {
            return model.toJSON(options);
        });
    },

    sync: function () {
        return Xui.sync.apply(this, arguments);
    },

    // Add a model, or list of models to the set.
    add: function (models, options) {
        return this.set(models, _.defaults(options || {}, addOptions));
    },

    // Remove a model, or a list of models from the set.
    remove: function (models, options) {
        if (_.isArray(models))
            models = models.slice();
        else
            models = [models];
        options = options || {};
        var i, l, index, model;
        for (i = 0, l = models.length; i < l; i++) {
            model = this.get(models[i]);
            if (!model) continue;
            delete this._byId[model.id];
            delete this._byId[model.cid];
            index = this.indexOf(model);
            this.models.splice(index, 1);
            this.length--;
            if (!options.silent) {
                options.index = index;
                model.trigger('remove', model, this, options);
            }
            this._removeReference(model);
        }
        return this;
    },

    // Update a collection by `set`-ing a new list of models, adding new ones,
    // removing models that are no longer present, and merging models that
    // already exist in the collection, as necessary. Similar to **Model#set**,
    // the core operation for updating the data contained by the collection.
    set: function (models, options) {
        options = _.defaults(options || {}, setOptions);
        if (options.parse) models = this.parse(models, options);
        if (!_.isArray(models)) models = models ? [models] : [];
        var i, l, model, attrs, existing, sort;
        var at = options.at;
        var sortable = this.comparator && (at === null) && options.sort !== false;
        var sortAttr = _.isString(this.comparator) ? this.comparator : null;
        var toAdd = [],
            toRemove = [],
            modelMap = {};

        // Turn bare objects into model references, and prevent invalid models
        // from being added.
        for (i = 0, l = models.length; i < l; i++) {
            if (!(model = this._prepareModel(models[i], options))) continue;

            // If a duplicate is found, prevent it from being added and
            // optionally merge it into the existing model.
            existing = this.get(model);
            if (existing) {
                if (options.remove) modelMap[existing.cid] = true;
                if (options.merge) {
                    existing.set(model.attributes, options);
                    if (sortable && !sort && existing.hasChanged(sortAttr)) sort = true;
                }

                // This is a new model, push it to the `toAdd` list.
            } else if (options.add) {
                toAdd.push(model);

                // Listen to added models' events, and index models for lookup by
                // `id` and by `cid`.
                model.on('all', this._onModelEvent, this);
                this._byId[model.cid] = model;
                if (!isNullOrUndefined(model.id || model.get('id'))) {
                    this._byId[model.id || model.get('id')] = model;
                }
            }
        }

        // Remove nonexistent models if appropriate.
        if (options.remove) {
            for (i = 0, l = this.length; i < l; ++i) {
                if (!modelMap[(model = this.models[i]).cid]) toRemove.push(model);
            }
            if (toRemove.length) this.remove(toRemove, options);
        }

        // See if sorting is needed, update `length` and splice in new models.
        if (toAdd.length) {
            if (sortable) sort = true;
            this.length += toAdd.length;
            if (!isNullOrUndefined(at)) {
                splice.apply(this.models, [at, 0].concat(toAdd));
            } else {
                push.apply(this.models, toAdd);
            }
        }

        if (sort) this.sort({
            silent: true
        });

        if (options.silent) return this;

        // Trigger `add` events.
        for (i = 0, l = toAdd.length; i < l; i++) {
            (model = toAdd[i]).trigger('add', model, this, options);
        }

        // Trigger `sort` if the collection was sorted.
        if (sort) this.trigger('sort', this, options);
        return this;
    },

    // When you have more items than you want to add or remove individually,
    // you can reset the entire set with a new list of models, without firing
    // any granular `add` or `remove` events. Fires `reset` when finished.
    // Useful for bulk operations and optimizations.
    reset: function (models, options) {
        if (!options) {
            options = {};
        }
        for (var i = 0, l = this.models.length; i < l; i++) {
            this._removeReference(this.models[i]);
        }
        options.previousModels = this.models;
        this._reset();
        this.add(models, _.extend({
            silent: true
        }, options));
        if (!options.silent) this.trigger('reset', this, options);
        return this;
    },

    // Add a model to the end of the collection.
    push: function (model, options) {
        model = this._prepareModel(model, options);
        this.add(model, _.extend({
            at: this.length
        }, options));
        return model;
    },

    // Remove a model from the end of the collection.
    pop: function (options) {
        var model = this.at(this.length - 1);
        this.remove(model, options);
        return model;
    },

    // Add a model to the beginning of the collection.
    unshift: function (model, options) {
        model = this._prepareModel(model, options);
        this.add(model, _.extend({
            at: 0
        }, options));
        return model;
    },

    // Remove a model from the beginning of the collection.
    shift: function (options) {
        var model = this.at(0);
        this.remove(model, options);
        return model;
    },

    // Slice out a sub-array of models from the collection.
    slice: function (begin, end) {
        return this.models.slice(begin, end);
    },

    // Get a model from the set by id.
    get: function (obj) {
        if (isNullOrUndefined(obj)) {
            return void 0;
        }
        var id = obj.get('id');
        return this._byId[!isNullOrUndefined(id) ? id : obj.cid || obj];
    },

    // Get the model at the given index.
    at: function (index) {
        return this.models[index];
    },

    // Return the first model with matching attributes. Useful for simple cases
    // of `find`.
    findWhere: function (attrs) {
        return this.where(attrs, true);
    },

    // Force the collection to re-sort itself. You don't need to call this under
    // normal circumstances, as the set will maintain sort order as each item
    // is added.
    sort: function (options) {
        if (!this.comparator) throw new Error('Cannot sort a set without a comparator');
        if (!options) {
            options = {};
        }

        // Run sort based on type of `comparator`.
        if (_.isString(this.comparator) || this.comparator.length === 1) {
            this.models = this.sortBy(this.comparator, this);
        } else {
            this.models.sort(_.bind(this.comparator, this));
        }

        if (!options.silent) this.trigger('sort', this, options);
        return this;
    },

    // Figure out the smallest index at which a model should be inserted so as
    // to maintain order.
    sortedIndex: function (model, value, context) {
        if (!value) {
            value = this.comparator;
        }
        var iterator = _.isFunction(value) ? value : function (model) {
            return model.get(value);
        };
        return _.sortedIndex(this.models, model, iterator, context);
    },

    // Pluck an attribute from each model in the collection.
    pluck: function (attr) {
        return _.invoke(this.models, 'get', attr);
    },

    // Fetch the default set of models for this collection, resetting the
    // collection when they arrive. If `reset: true` is passed, the response
    // data will be passed through the `reset` method instead of `set`.
    fetch: function (options) {
        options = options ? _.clone(options) : {};
        if (isUndefined(options.parse)) {
            options.parse = true;
        }
        var success = options.success;
        var collection = this;
        options.success = function (resp) {
            var method = options.reset ? 'reset' : 'set';
            collection[method](resp, options);
            if (success) success(collection, resp, options);
            collection.trigger('sync', collection, resp, options);
        };
        wrapError(this, options);
        return this.sync('read', this, options);
    },

    // Create a new instance of a model in this collection. Add the model to the
    // collection immediately, unless `wait: true` is passed, in which case we
    // wait for the server to agree.
    create: function (model, options) {
        options = options ? _.clone(options) : {};
        if (!(model = this._prepareModel(model, options))) return false;
        if (!options.wait) this.add(model, options);
        var collection = this;
        var success = options.success;
        options.success = function (resp) {
            if (options.wait) collection.add(model, options);
            if (success) success(model, resp, options);
        };
        model.save(null, options);
        return model;
    },

    // **parse** converts a response into a list of models to be added to the
    // collection. The default implementation is just to pass it through.
    parse: function (resp, options) {
        return resp;
    },

    // Private method to reset all internal state. Called when the collection
    // is first initialized or reset.
    _reset: function () {
        this.length = 0;
        this.models = [];
        this._byId = {};
    },

    // Prepare a hash of attributes (or other model) to be added to this
    // collection.
    _prepareModel: function (attrs, options) {
        if (attrs instanceof Model) {
            if (!attrs.collection) attrs.collection = this;
            return attrs;
        }
        if (!options) {
            options = {};
        }
        options.collection = this;
        var model = new this.model(attrs, options);
        if (!model._validate(attrs, options)) {
            this.trigger('invalid', this, attrs, options);
            return false;
        }
        return model;
    },

    // Internal method to sever a model's ties to a collection.
    _removeReference: function (model) {
        if (this === model.collection) delete model.collection;
        model.off('all', this._onModelEvent, this);
    },

    // Internal method called every time a model in the set fires an event.
    // Sets need to update their indexes when models change ids. All other
    // events simply proxy through. "add" and "remove" events that originate
    // in other collections are ignored.
    _onModelEvent: function (event, model, collection, options) {
        if ((event === 'add' || event === 'remove') && collection !== this) return;
        if (event === 'destroy') this.remove(model, options);
        if (model && event === 'change:' + model.idAttribute) {
            delete this._byId[model.previous(model.idAttribute)];
            if (!isNullOrUndefined(model.id)) {
                this._byId[model.id] = model;
            }
        }
        this.trigger.apply(this, arguments);
    }

});

// Underscore methods that we want to implement on the Collection.
var methods = ['forEach', 'each', 'map', 'collect', 'reduce', 'foldl',
    'inject', 'reduceRight', 'foldr', 'find', 'detect', 'filter', 'select',
    'reject', 'every', 'all', 'some', 'any', 'include', 'contains', 'invoke',
    'max', 'min', 'toArray', 'size', 'first', 'head', 'take', 'initial', 'rest',
    'tail', 'drop', 'last', 'without', 'indexOf', 'shuffle', 'lastIndexOf',
    'isEmpty', 'chain'
];

// Mix in each Underscore method as a proxy to `Collection#models`.
_.each(methods, function (method) {
    Collection.prototype[method] = function () {
        var args = slice.call(arguments);
        args.unshift(this.models);
        return _[method].apply(_, args);
    };
});

// Underscore methods that take a property name as an argument.
var attributeMethods = ['groupBy', 'countBy', 'sortBy'];

// Use attributes instead of properties.
_.each(attributeMethods, function (method) {
    Collection.prototype[method] = function (value, context) {
        var iterator = _.isFunction(value) ? value : function (model) {
            return model.get(value);
        };
        return _[method](this.models, iterator, context);
    };
});



// Xui.View
// -------------
// A module that represents an element in the DOM and manages its behaviour.
// Creating a Xui.View creates its initial element outside of the DOM,
// if an existing element is not provided...
var View = Xui.View = function(options) {
    // Assign a unique client id to each view.
    // Useful if we don't have an actual id because the model is not yet persisted on the server
    // or we are saving the model with localStorage
    this.cid = _.uniqueId('view');
    this._configure(options || {});
    this._ensureElement();
    this.initialize.apply(this, arguments);
    this.delegateEvents();
};

// Regex to split keys for `delegate`.
var delegateEventSplitter = /^(\S+)\s*(.*)$/;

// Built-in view properties
var viewOptions = ['model', 'collection', 'el', 'id', 'attributes', 'className', 'tagName', 'events'];

// Set up all inheritable **Xui.View** properties and methods.
_.extend(View.prototype, Events, {

    // default tagName
    tagName: 'div',

    // Element lookup function, delegating it to jQuery
    $: function(selector) {
        return this.$el.find(selector);
    },

    // Initialize function to be overriden by users
    initialize: function(){},

    // Method to be overriden to populate the el with html output
    render: function() {
        return this;
    },

    // Remove this view by taking the element out of the DOM, and removing any
    // applicable Xui.Events listeners.
    remove: function() {
        this.$el.remove();
        this.stopListening();
        return this;
    },

    // Set View's el and delegate events attached to it
    setElement: function(element, delegate) {
        if (this.$el) this.undelegateEvents();
        this.$el = element instanceof Xui.$ ? element : Xui.$(element);
        this.el = this.$el[0];
        if (delegate !== false) this.delegateEvents();
        return this;
    },

    // Set event handlers, where `this.events` is a hash of
    // "event selector" : "handler"
    // Event handlers will be bound to the view, with `this` set properly.
    // Omitting the selector binds the event to `this.el`.
    delegateEvents: function(events) {
        // Check if we have events to delegate.
        // Events can be new events or events previously attached to View
        if (!(events = this.events)) {
            return this;
        }
        // Remove previously delgated events
        this.undelegateEvents();

        for (var key in events) {
            var method = events[key];
            // Check if we have to look deeper for event handlers
            if (typeof method !== 'function') {
                method = this[events[key]];
            }
            if (!method) {
                // No event handler for this event
                continue;
            }

            var match = key.match(delegateEventSplitter);
            var eventName = match[1],
                selector = match[2];
            // Change context of method so that when it is called later
            // this is properly set
            method = method.bind(this);

            eventName += '.delegateEvents' + this.cid;
            if (selector === '') {
                this.$el.on(eventName, method);
            } else {
                this.$el.on(eventName, selector, method);
            }
        }
        return this;
    },

    // Removes all event handlers to view for events created using delegateEvents
    undelegateEvents: function() {
        this.$el.off('.delegateEvents' + this.cid);
        return this;
    },

    // Perform initial configuration for View.
    // Only the options properties that matches the viewOptions become
    // the properties of View.
    _configure: function(options) {
        // that reference this View instance
        var that = this;
        $.each(options, function(key, value) {
            // Check if key matches any in viewOptions
            if ($.inArray(key, viewOptions) >= 0) {
                // Add the property to View
                that[key] = options[key];
            }
        });
    },

    // Make sure that el attached to View is valid.
    // If el is passed as a string,
    // automatically find the correct DOM element if el passed as string.
    // Else use tagName, id and className to construct DOM element for el
    _ensureElement: function() {
        if (!this.el) {
            var attrs = {} || this.attributes;
            attrs.id = this.id;
            attrs.class = this.className;
            var $el = Xui.$('<' + _.result(this, 'tagName') + '>').attr(attrs);
            this.setElement($el, false);
        } else {
            // View already has el property
            this.setElement(_.result(this, 'el'), false);
        }
    },

    // Destroy view to conserve memory
    destroy: function() {
        this.undelegateEvents();
        this.model = null;
        delete this;
    }
});



// Xui.Sync
// -------------
//

Xui.sync = function (method, model, options) {
    // We only support CRUD.
    var methods = {
        'create': 'POST',
        'read': 'GET',
        'update': 'PUT',
        'delete': 'DELETE'
    };

    var type = methods[method];

    var parameters = {
        type: type,
        dataType: 'json'
    };

    if (!options.url) {
        var modelUrl = _.result(model, 'url');
        if (!modelUrl) {
            console.log("Sync: no URL was provided.");
            return;
        }

        parameters.url = modelUrl;
    }
    // We don't need to add options.url to parameters manually,
    // since we'll be extending parameters with options later.

    var isUpdatingServer = method === 'create' || method === 'update';
    var isDataOnModel = options.data === null && model;
    if (isUpdatingServer && isDataOnModel) {
        var isAttributesInOptions = options.attrs;

        var jsonData;
        if (isAttributesInOptions) {
            jsonData = options.attrs;
        } else {
            jsonData = model.toJSON();
        }

        parameters.contentType = 'application/json';
        parameters.data = JSON.stringify(jsonData);
    }

    var requestObject = _.extend(parameters, options);
    var jqueryXhr = $.ajax(requestObject);
    return jqueryXhr;
};

// Xui.Router
var Router = Xui.Router = function (options) {
    if (!options) {
        options = {};
    }
    if (options.routes) this.routes = options.routes;
    this._bindRoutes();
    this.initialize.apply(this, arguments);
};

var optionalParam = /\((.*?)\)/g;
var namedParam = /(\(\?)?:\w+/g;
var splatParam = /\*\w+/g;
var escapeRegExp = /[\-{}\[\]+?.,\\\^$|#\s]/g;

//extend router with Events
_.extend(Router.prototype, Xui.Events, {

    initialize: function () {},

    // this.route('search/:query/p:num', 'search', function(query, num) {
    route: function (route, name, callback) {
        if (!_.isRegExp(route)) route = this._routeToRegExp(route);
        if (_.isFunction(name)) {
            callback = name;
            name = '';
        }
        if (!callback) callback = this[name];
        var router = this;
        Xui.history.route(route, function (fragment) {
            var args = router._extractParameters(route, fragment);
            if (callback) {
                callback.apply(router, args);
            }
            router.trigger.apply(router, ['route:' + name].concat(args));
            router.trigger('route', name, args);
            Xui.history.trigger('route', router, name, args);
        });
        return this;
    },

    // proxy to `Xui.history` to save a fragment into the history.
    navigate: function (fragment, options) {
        Xui.history.navigate(fragment, options);
        return this;
    },

    _bindRoutes: function () {
        if (!this.routes) return;
        this.routes = _.result(this, 'routes');
        var routes = _.keys(this.routes);
        while (!isNullOrUndefined(route = routes.pop())) {
            this.route(route, this.routes[route]);
        }
    },

    _routeToRegExp: function (route) {
        route = route.replace(escapeRegExp, '\\$&')
            .replace(optionalParam, '(?:$1)?')
            .replace(namedParam, function (match, optional) {
                return optional ? match : '([^\/]+)';
            })
            .replace(splatParam, '(.*?)');
        return new RegExp('^' + route + '$');
    },

    _extractParameters: function (route, fragment) {
        var params = route.exec(fragment).slice(1);
        return _.map(params, function (param) {
            return param ? decodeURIComponent(param) : null;
        });
    }

});

var History = Xui.History = function () {
    // Store all handlers for given URL regex
    this.handlers = [];
    _.bindAll(this, 'checkUrl');

    // get the reference to window if possible
    if (typeof window !== 'undefined') {
        this.location = window.location;
        this.history = window.history;
    }
};

// Stripping ONE leading hash/slash and trailling spaces
var routeStripper = /^[#\/]|\s+$/g;

// Stripping leading and trailing slashes
var rootStripper = /^\/+|\/+$/g;

// Removing ONE trailling slash
var trailingSlash = /\/$/;

// Stripping urls of hashes and query params
var pathStripper = /[?#].*$/;

History.started = false;

_.extend(History.prototype, Events, {
    // Get the hash value of url
    getHash: function (window) {
        var match = (window || this).location.href.match(/#(.*)$/);
        return match ? match[1] : '';
    },

    // Get the cross-browser URL fragment from either URL or hash
    getFragment: function (fragment, forcePushState) {
        if (typeof fragment === 'undefined' || fragment === null) {
            if (this._hasPushState || !this._wantsHashChange || forcePushState) {
                fragment = this.location.pathname;
                var root = this.root.replace(trailingSlash, '');
                if (!fragment.indexOf(root)) fragment = fragment.slice(root.length);
            } else {
                fragment = this.getHash();
            }
        }
        return fragment.replace(routeStripper, '');
    },

    // Start the handling whenever hash value changes.
    // Return true if the current URL matches a handler, false otherwise
    start: function (options) {
        if (History.started) throw new Error("History has started already");
        History.started = true;

        // Initial configuration
        this.options = _.extend({
            root: '/'
        }, this.options, options);
        this.root = this.options.root;
        this._wantsHashChange = this.options.hashChange !== false;
        this._wantsPushState = !! this.options.pushState;
        this._hasPushState = !! (this.options.pushState && this.history && this.history.pushState);
        var fragment = this.getFragment();

        // Normalize root to always include a leading and trailing slash.
        this.root = ('/' + this.root + '/').replace(rootStripper, '/');

        if (this._hashPushState) {
            // If support pushstate, listen to popstate event of browser
            Xui.$(window).on('popstate', this.checkUrl);
        } else if (this._wantsHashChange && ('onhashchange' in window)) {
            // Else if support hashed url, listen to hashchange event of browser
            Xui.$(window).on('hashchange', this.checkUrl);
        }

        // Determine if we need to change the current URL if link opened by a non pushstate broswer
        this.fragment = fragment;
        var loc = this.location;
        var atRoot = loc.pathname.replace(/[^\/]$/, '$&/') === this.root;

        // Convert between hashChange and pushState if both are requested
        if (this._wantsHashChange && this._wantsPushState) {
            if (!this._hasPushState && !atRoot) {
                // If pushState is not supproted, change to hash base
                this.fragment = this.getFragment(null, true);
                this.location.replace(this.root + this.location.search + '#' + this.fragment);
                // Return immediately as browser will do redirect to new url
                return true;
            } else if (this._hasPushState && atRoot && loc.hash) {
                // Else if push state is supported and route is hash-based, change to pushState
                this.fragment = this.getHash().replace(routeStripper, '');
                this.history.replaceState({}, document.title, this.root + this.fragment + loc.search);
            }
        }

        if (!this.options.silent) return this.loadUrl();
    },

    // Add a route regex to handlers. May override the old one
    route: function (route, callback) {
        this.handlers.unshift({
            route: route,
            callback: callback
        });
    },

    // Check if the currnet url has changed to call loadUrl
    checkUrl: function (e) {
        var current = this.getFragment();
        if (current === this.fragment) return false;
        this.loadUrl();
    },


    // Find and apply to matched handlers for current fragment
    // Return true if found, false otherwise
    loadUrl: function (fragment) {
        fragment = this.fragment = this.getFragment(fragment);
        return _.any(this.handlers, function (handler) {
            if (handler.route.test(fragment)) {
                handler.callback(fragment);
                return true;
            }
        });
    },

    // Save a fragment into hash history, or replace URL if trigger: true is passed
    navigate: function (fragment, options) {
        if (!History.started) return false;
        if (!options || options === true) options = {
            trigger: !! options
        };


        // If trigger : true, the route callback will fired
        // If replace : true, replace URL without adding into history
        fragment = this.getFragment(fragment || '');
        var url = this.root + fragment;

        // Strip the hash and query path
        fragment = fragment.replace(pathStripper, '');
        if (this.fragment === fragment) return;
        this.fragment = fragment;

        // Remove trailing slash on the root
        if (fragment === '' && url === '/') url = url.slice(0, -1);

        if (this._hasPushState) {
            // If pushState available, replace or push into history
            if (options.replace) {
                this.history.replaceState({}, document.title, url);
            } else {
                if (url === '') url = '/';
                this.history.pushState({}, document.title, url);
            }
        } else if (this._wantsHashChange) {
            // If hash change
            this._updateHash(this.location, fragment, options.replace);
        } else {
            // Last resolve: reload the new url
            return this.location.assign(url);
        }

        if (options.trigger) this.loadUrl(fragment);
    },
    // Update the hash location, either replacing the current entry,
    // or adding a new one to the browser history.
    _updateHash: function (location, fragment, replace) {
        if (replace) {
            var href = location.href.replace(/(javascript:|#).*$/, '');
            location.replace(href + '#' + fragment);
        } else {
            location.hash = '#' + fragment;
        }
    }
});

Xui.history = new History;

Xui._extend = function (instanceProperties, staticProperties) {
    var parent = this;

    var child;
    var isChildConstructorProvided = instanceProperties && _.has(instanceProperties, 'constructor');
    if (isChildConstructorProvided) {
        child = instanceProperties.constructor;
    } else {
        // We don't have a child constructor. Just use the parent's instead.
        child = function () {
            return parent.apply(this, arguments);
        };
    }

    // We "extend" the child with the parent's properties.
    // Doing it the other way around would be overwriting the parent
    // with the child's properties.
    _.extend(child, parent, staticProperties);

    var chainInheriter = function () {
        this.constructor = child;
    };
    chainInheriter.prototype = parent.prototype;
    child.prototype = new chainInheriter();

    if (instanceProperties) {
        _.extend(child.prototype, instanceProperties);
    }

    return child;
};

// Add this to all our components.
Xui.Model.extend = Xui._extend;
Xui.Collection.extend = Xui._extend;
Xui.Router.extend = Xui._extend;
Xui.View.extend = Xui._extend;
Xui.History.extend = Xui._extend;

var urlError = function () {
    throw new Error('A "url" property or function must be specified');
};

// Wrap an optional error callback with a fallback error event.
var wrapError = function (model, options) {
    var error = options.error;
    options.error = function (resp) {
        if (error) error(model, resp, options);
        model.trigger('error', model, resp, options);
    };
};

var isNullOrUndefined = function (x) {
    return typeof x === 'undefined' || x === null;
};
var isUndefined = function (x) {
    return typeof x === 'undefined';
};

/*
 A view designed to map to a collection of items.

 Requirements:
 Options hash consisting of: {
 template: A JST template that contains an element with ID 'subview-container'
 subView: A View constructor to use to render each model in the collection
 }

 */
Xui.CollectionView = Xui.View.extend({
    initialize: function () {
        this.listenTo(this.collection, 'add', this.collectionAddHandler);
        this.listenTo(this.collection, 'change', this.collectionChangeHandler);
        this.listenTo(this.collection, 'remove', this.collectionRemoveHandler);

        this.childViews = [];
        this.render();
    },

    render: function () {
        var selfRendered = this.template({});
        this.$el.html(selfRendered);
        this.renderSubviews();
        return this;
    },

    collectionAddHandler: function (addedItem) {
        var existing = _.find(this.childViews, function(childView) {
            return childView.model.get('id') === addedItem.get('id');
        });

        if (!existing) {
            addedItem.id = addedItem.id || addedItem.get('id');
            var newView = this.createViewForItem(addedItem);
            this.childViews.push(newView);
            this.renderSubviews();
        }
    },

    collectionRemoveHandler: function (removedItem) {
        this.removeModelFromChildViews(removedItem);
        this.renderSubviews();
    },

    collectionChangeHandler: function (changedItem) {
        this.childViews = [];
        var that = this;
        this.collection.each(function (model) {
            that.childViews.push(that.createViewForItem(model));
        });
        this.renderSubviews();
    },

    createViewForItem: function (item) {
        var newView = new this.subView({
            model: item
        });
        return newView;
    },

    removeModelFromChildViews: function (model) {
        this.childViews = this.childViews.filter(function (view) {
            return view.model != model;
        });
    },

    renderSubviews: function () {
        var fragment = document.createDocumentFragment();

        _(this.childViews).each(function (curr) {
            fragment.appendChild(curr.render().el);
        });

        this.$('#subview-container').html(fragment);
    },

    destroy: function() {
        _.each(this.childViews, function(child) {
            child.destroy();
        });
        this.undelegateEvents();
        delete this;
    }
});