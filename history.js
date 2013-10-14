var Xui = Xui || {};
var History = Xui.History = function() {
  this.handlers = [];
  _.bindAll(this, 'checkUrl');

  if (typeof window !== 'undefined') {
    this.location = window.location;
    this.history = window.history;
  }
};

var routeStripper = /^[#\/]|\s+$/g;
var rootStripper = /^\/+|\/+$/g;
var trailingSlash = /\/$/;
var pathStripper = /[?#].*$/;

History.started = false;

_.extend(History.prototype, Events, {
  getHash: function(window) {
    var match = (window || this).location.href.match(/#(.*)$/)
    return match ? match[1] : '';
  },

  getFragment: function(fragment, forcePushState) {
    if (fragment == null) {
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

  start: function(options) {
    if (History.started) throw new Error("History has started already");
    History.started = true;

    this.options = _.extend({root: '/'}, this.options, options);
    this.root = this.options.root;
    this._wantsHashChange = this.options.hashChange !== false;
    this._wantsPushState = !!this.options.pushState;
    this._hasPushState = !!(this.options.pushState && this.history && this.history.pushState);
    var fragment = this.getFragment();

    this.root = ('/' + this.root + '/').replace(rootStripper, '/');

    if (this._hashPushState) {
      Xui.$(window).on('popstate', this.checkUrl);
    } else if (this._wantsHashChange && ('onhashchange' in window)) {
      Xui.$(window).on('hashchange', this.checkUrl);
    }

    this.fragment = fragment;
    var loc = this.location;
    var atRoot = loc.pathname.replace(/[^\/]$/, '$&/') === this.root;

    if (this._wantsHashChange && this._wantsPushState) {
      this.fragment = this.getFragment(null, true);
      this.location.replace(this.root + this.location.search + '#' + this.fragment);
      return true;
    } else if (this._hasPushState && atRoot && loc.hash) {
      this.fragment = this.getHash().replace(routeStripper, '');
      this.history.replaceState({}, document.title, this.root + this.fragment + loc.search);
    }

    if (!this.options.silent) return this.loadUrl();
  },

  route: function(route, callback) {
    this.handlers.unshift({route: route, callback: callback});
  },

  checkUrl: function(e) {
    var current = this.getFragment();
    if (current === this.fragment) return false;
    this.loadUrl();
  },

  loadUrl: function(fragment) {
    fragment = this.fragment = this.getFragment(fragment);
    return _.any(this.handlers, function(handler) {
      if (handler.route.test(fragment)) {
        handler.callback(fragment);
        return true;
      }
    });
  },

  navigate: function(fragment, options) {
    if (!History.started) return false;
    if (!options || options === true) options = {trigger: !!options};

    fragment = this.getFragment(fragment);
    var url = this.root + fragment;
    fragment = fragment.replace(pathStripper, '');
    if (this.fragment === fragment) return;
    this.fragment = fragment;
    
    if (fragment === '' && url === '/') url = url.slice(0, -1);

    if (this._hasPushState) {
      if (options.replace) {
        this.history.replaceState({}, document.title, url);
      } else {
        this.history.pushState({}, document.title, url);
      }
    } else if (this._wantsHashChange) {
      this._updateHash(this.location, fragment, options.replace);
    } else {
      return this.location.assign(url);
    }

    if (options.trigger) this.loadUrl(fragment);
  },

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