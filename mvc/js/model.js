// Define Model class that can fetch data from url
var Model = function(url) {
    this.url = url;
    this.observers = [];
    this.data = {};
};

// Class methods
Model.prototype.fetch = function() {
    // Perform GET request and assign the result to model object
    $.get(this.url, $.proxy(setData, this));
};

Model.prototype.addObserver = function(observer) {
    this.observers.push(observer);
};

var setData = function(data) {
    this.data = data;
    notifyObservers.call(this);
};

var notifyObservers = function() {
    var observers = this.observers;
    for (var i = 0; i < observers.length; i++) {
        observers[i].update(this);
    }
};