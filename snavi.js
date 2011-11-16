/**
 * @class A navigation error
 * @type NavigationError
 * @property {String} message Error message
 * @property {String} layout The layout related to the error
 * @property {String} url The url related to the error
 */
function NavigationError ( message, layout, url ) {
  this.message = message;
  this.layout = layout;
  this.url = url;
}

/**
 * @returns {String} A string representation of this error
 */
NavigationError.prototype.toString = function() {
  return "Navigation error in layout " + this.layout + ": " + this.message + " for target " + this.url;
}

/**
 * To avoid dependency on _.js, we include bind (and dependencies) here
 */
_ = "_" in window ? _ : {};
_.isFunction = "isFunction" in _ ? _.isFunction : 
  function(obj) {
    return toString.call(obj) == '[object Function]';
  }
;
var _ctor = function(){};
_.bind = "bind" in _ ? _.bind : 
  function (func, context) {
    var bound, args;
    if (func.bind === Function.prototype.bind && Function.prototype.bind) return Function.prototype.bind.apply(func, slice.call(arguments, 1));
    if (!_.isFunction(func)) throw new TypeError;
    args = slice.call(arguments, 2);
    return bound = function() {
      if (!(this instanceof bound)) return func.apply(context, args.concat(slice.call(arguments)));
      _ctor.prototype = func.prototype;
      var self = new _ctor;
      var result = func.apply(self, args.concat(slice.call(arguments)));
      if (Object(result) === result) return result;
      return self;
    };
  }
;

var snavi = {
  /**
   * The current layout
   * @private
   * @type String
   */
  _currentLayout: null,

  /**
   * The current page URL
   * @private
   * @type String
   */
  _currentPage: null,

  /**
   * Popstate handler
   *
   * @private 
   * @function
   * @param {PopStateEvent} event The popstate event object
   */
  _popstateHandler: function ( event ) {
    if ( event.state === null ) {
      /**
       * TODO: Handle this *A LOT* better
       */
      window.location.reload(true);
      return;
    }

    this.navigate ( event.state.url, event.state.layout, false );
  },

  /**
   * Record to navigation history
   * 
   * @private
   * @function
   * @param {String} url URL that has been navigated to
   * @param {String} layout Layout associated with current page
   */
  _recordToHistory: function ( url, layout ) {
    window.pushState ( { url: url, layout: layout }, document.title, url );
  },

  /**
   * This function is called whenever a navigation is being performed
   * and the current layout and the target layout differ
   * Called with the name of the layout being navigated to, the template and any data
   *
   * @function
   * @param {String} layout The layout that is being navigated to
   * @param {String} template Layout template
   * @param {Object} data Data retrieved from backend
   */
  setup: null,

  /**
   * This function is called whenever a navigation is being performed
   * and the current layout and the target layout differ
   * Called with the name of the layout being navigated away from
   *
   * @function
   * @param {String} layout The layout being navigated away from
   */
  teardown: null,

  /**
   * If a template is not present in the templates array,
   * this method is called to fetch the template.
   * The returned template is saved in the array for later use
   *
   * If you do not wish the template to be saved between requests,
   * pass false as the second argument to the callback function
   *
   * If the template cannot be fetched, send false as the first
   * argument to the callback function. It will then call the 
   * error handler with an appropriate error message.
   *
   * @function
   * @param {String} layout The layout to fetch the template for
   * @param {String} url The url that triggered this template fetch
   * @param {Function} callback The function to call with the template data
   */
  templater: null,

  /**
   * Template storage
   */
  templates: {
  },

  /**
   * Called whenever something goes wrong
   *
   * @function
   * @param {NavigationError} An object describing the error
   */
  error: function ( error ) {
    if ("console" in window && "error" in console) {
      console.error ( 'An error occured when navigating to "' + error.url + '" using layout ' + error.layout, error.message );
    }
  },

  /**
   * Called when navigating between two pages with the same layout
   *
   * If the function returns false, it is assumed that the current
   * layout cannot be modified on the fly, and teardown + setup is
   * used instead.
   *
   * @function
   * @param {Object} data The view data from the backend
   * @param {String} layout The layout being displayed
   * @returns {Boolean} Whether modification is possible or not
   */
  modify: function ( data, layout ) {
    return false;
  },

  /**
   * Called to retrieve the view data for the given url
   *
   * @function
   * @param {String} url The url being navigated to
   * @param {String} layout The layout being navigated to
   * @params {Function} callback 
   *  The function to call with the data
   *  to be passed to modify or setup
   */
  data: function ( url, layout, callback ) {
  },

  /**
   * Configuration options
   */
  options: {
    /**
     * Should templates be cached to local storage?
     * @type Boolean
     */
    cacheTemplatesInLocalStorage: true
  },

  /**
   * Navigate to the given url, rendering the resulting page using the given layout
   *
   * @param {String} url The url to navigate to
   * @param {String} layout The layout of the target page
   * @param {Boolean} [toHistory=true] Should this navigation be recorded to history?
   */
  navigate: function ( url, layout, toHistory ) {
    this.data ( url, layout, _.bind ( function ( url, layout, data ) {
      if ( layout === this._currentLayout ) {
        // Already on the right layout, attempt to call modifier
        if ( this.modify ( data, layout ) ) {
          this._finalize ( url, layout );
          return;
        }
      }

      // We need to set up the page from scratch
      if ( layout in this.templates ) {
        // Template from cache, just call setup
        this.setup ( layout, this.templates[layout], data );
        this._finalize ( url, layout );
      } else {
        // Fetch template, store to cache unless forbidden and setup
        this.templater ( layout, url, _.bind ( function ( url, layout, template, storeTemplate ) {
          if ( storeTemplate !== false ) {
            this.templates[layout] = template;
          }

          this.setup ( layout, template, data );
          this._finalize ( url, layout );
        }, this, url, layout ) );
      }
    }, this, url, layout ) );
  };

  /**
   * Finalizes a navigation step
   * Records to history and sets _current* properties
   *
   * @private
   * @function
   * @param {String} url The URL navigated to
   * @param {String} layout The layout of the current page
   */
  _finalize: function ( url, layout ) {
    this._recordToHistory ( url, layout );
    this._currentPage = url;
    this._currentLayout = layout;
  }
};
