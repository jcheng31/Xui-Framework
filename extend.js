var Xui = Xui || {};

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