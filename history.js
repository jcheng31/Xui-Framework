var Xui = Xui || {};
var History = Xui.History = function() {
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
  getHash: function(window) {
    var match = (window || this).location.href.match(/#(.*)$/);
    return match ? match[1] : '';
  },

  // Get the cross-browser URL fragment from either URL or hash
  getFragment: function(fragment, forcePushState) {
    if (fragment === null) {
      if (this._hashPushState || !this._wantsHashChange || forcePushState) {
        fragment = this.location.pathname;
        var root = this.root.replace(trailingSlash, "");
        if (!fragment.indexOf(root)) fragment = fragment.slice(root.length);
      } else {
        fragment = this.getHash();
      }
    }
    return fragment.replace(routeStripper, '');
  },

  // Start the handling whenever hash value changes.
  // Return true if the current URL matches a handler, false otherwise
  start: function(options) {
    if (History.started) throw new Error("History has started already");
    History.started = true;

    // Initial configuration
    this.options = _.extend({root: '/'}, this.options, options);
    this.root = this.options.root;
    this._wantsHashChange = this.options.hashChange !== false;
    this._wantsPushState = !!this.options.pushState;
    this._hasPushState = !!(this.options.pushState && this.history && this.history.pushState);
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
  route: function(route, callback) {
    this.handlers.unshift({route: route, callback: callback});
  },

  // Check if the currnet url has changed to call loadUrl
  checkUrl: function(e) {
    var current = this.getFragment();
    if (current === this.fragment) return false;
    this.loadUrl();
  },


  // Find and apply to matched handlers for current fragment
  // Return true if found, false otherwise
  loadUrl: function(fragment) {
    fragment = this.fragment = this.getFragment(fragment);
    return _.any(this.handlers, function(handler) {
      if (handler.route.test(fragment)) {
        handler.callback(fragment);
        return true;
      }
    });
  },

  // Save a fragment into hash history, or replace URL if trigger: true is passed
  navigate: function(fragment, options) {
    if (!History.started) return false;
    if (!options || options === true) options = {trigger: !!options};

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
  _updateHash: function(location, fragment, replace) {
    if (replace) {
      var href = location.href.replace(/(javascript:|#).*$/, '');
      location.replace(href + '#' + fragment);
    } else {
      location.hash = '#' + fragment;
    }
  },
});

Xui.history = new History;