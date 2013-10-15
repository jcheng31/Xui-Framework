var Xui = Xui || {};

Xui.Sync = function (method, model, options) {
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