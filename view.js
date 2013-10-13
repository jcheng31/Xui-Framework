// TODO: prob can use Events.js for notifying model
// TODO: do away with Controller?



// create Xui if it doesn't exist
var Xui = Xui || {};

// constructor is passed the id/class of el and template
// items
Xui.View = function(el, template, model) {
    this.el = $(el);
    this.template = $(template).html() || '';
    this.subscribers = [];
    this.model = model || {};
};

Xui.View.prototype = {
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

        for (i = 0; i
            < max; i += 1) {
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
    },

    render: function() {
        this.el.html(_.template(this.template, {items: this.model}));
    }


};

// -------- TEST ------------ //

var items = [
    {name:"Alexander"},
    {name:"Barklay"},
    {name:"Chester"},
    {name:"Domingo"},
    {name:"Edward"},
    {name:"..."},
    {name:"Yolando"},
    {name:"Zachary"}
];

var view = new Xui.View("#content", "#template", items);

var controller = {
    getNotif: function(msg) {
        console.log('message from model: ' + msg);
    }
};

view.subscribe(controller.getNotif);
view.notify('Hi Controller!');