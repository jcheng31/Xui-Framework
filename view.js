// create Xui if it doesn't exist
var Xui = Xui || {};

// constructor
Xui.model = function(el) {
    this.el = el || {};
    this.subscribers = [];
};

// TODO: call notify when 'el' detects changes
Xui.model.prototype = {
    // subscribe to this model by passing a function to be called (represented by subscriber)
    // when model detects any change
    subscribe: function(subscriber) {
        this.subscribers.push(subscriber);
    },

    unsubscribe: function(subscriber) {
        this.visitSubscribers('unsubscribe', subscriber);
    },

    // notify all subscribers (by calling all the function in subscribers array)
    notify: function(msg) {
      this.visitSubscribers('notify', msg);
    },

    visitSubscribers: function(action, arg) {
        subscribers = this.subscribers;
        var max = subscribers.length;

        for (i = 0; i < max; i += 1) {
            switch(action) {
                case 'notify':
                    subscribers[i](arg);
                    break;
                case 'unsubscribe':
                    if (subscribers[i] === arg) {
                        subscribers.splice(i, 1);
                    }
            }
        }
    }
};

// -------- TEST ------------ //
var model = new Xui.model();

var testController = {
    getNotif: function(msg) {
        console.log('message from model: ' + msg);
    }
};

model.subscribe(testController.getNotif);
model.notify('Hi Controller!');