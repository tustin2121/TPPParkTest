require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],"extend":[function(require,module,exports){
var hasOwn = Object.prototype.hasOwnProperty;
var toString = Object.prototype.toString;
var undefined;

var isPlainObject = function isPlainObject(obj) {
	'use strict';
	if (!obj || toString.call(obj) !== '[object Object]') {
		return false;
	}

	var has_own_constructor = hasOwn.call(obj, 'constructor');
	var has_is_property_of_method = obj.constructor && obj.constructor.prototype && hasOwn.call(obj.constructor.prototype, 'isPrototypeOf');
	// Not own constructor property must be Object
	if (obj.constructor && !has_own_constructor && !has_is_property_of_method) {
		return false;
	}

	// Own properties are enumerated firstly, so to speed up,
	// if last one is own, then all properties are own.
	var key;
	for (key in obj) {}

	return key === undefined || hasOwn.call(obj, key);
};

module.exports = function extend() {
	'use strict';
	var options, name, src, copy, copyIsArray, clone,
		target = arguments[0],
		i = 1,
		length = arguments.length,
		deep = false;

	// Handle a deep copy situation
	if (typeof target === 'boolean') {
		deep = target;
		target = arguments[1] || {};
		// skip the boolean and the target
		i = 2;
	} else if ((typeof target !== 'object' && typeof target !== 'function') || target == null) {
		target = {};
	}

	for (; i < length; ++i) {
		options = arguments[i];
		// Only deal with non-null/undefined values
		if (options != null) {
			// Extend the base object
			for (name in options) {
				src = target[name];
				copy = options[name];

				// Prevent never-ending loop
				if (target === copy) {
					continue;
				}

				// Recurse if we're merging plain objects or arrays
				if (deep && copy && (isPlainObject(copy) || (copyIsArray = Array.isArray(copy)))) {
					if (copyIsArray) {
						copyIsArray = false;
						clone = src && Array.isArray(src) ? src : [];
					} else {
						clone = src && isPlainObject(src) ? src : {};
					}

					// Never move original objects, clone them
					target[name] = extend(deep, clone, copy);

				// Don't bring in undefined values
				} else if (copy !== undefined) {
					target[name] = copy;
				}
			}
		}
	}

	// Return the modified object
	return target;
};


},{}],"inherits":[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],"tpp-actor-animations":[function(require,module,exports){
// actor_animations.js
// A submodule for the Actor event class that deals with animations

var extend = require("extend");

function getSpriteFormat(str) {
	var format = str.split("-");
	var name = format[0];
	var size = format[1].split("x");
	size[1] = size[1] || size[0];
	
	var base = {
		width: size[0], height: size[1], flip: false, 
		//repeatx: 0.25, repeaty: 0.25,
		frames: {
			"u3": "u0", "d3": "d0", "l3": "l0", "r3": "r0",
		},
		anims : getStandardAnimations(),
	};
	
	switch (name) {
		case "pt_horzrow": 
			return extend(true, base, { 
				frames: {
					"u0": [1, 0], "u1": [1, 1], "u2": [1, 2],
					"d0": [0, 0], "d1": [0, 1], "d2": [0, 2],
					"l0": [2, 0], "l1": [2, 1], "l2": [2, 2],
					"r0": [3, 0], "r1": [3, 1], "r2": [3, 2],
				},
			});
		case "pt_vertcol": 
			return extend(true, base, { 
				frames: {
					"u0": [0, 1], "u1": [1, 1], "u2": [2, 1],
					"d0": [0, 0], "d1": [1, 0], "d2": [2, 0],
					"l0": [0, 2], "l1": [1, 2], "l2": [2, 2],
					"r0": [0, 3], "r1": [1, 3], "r2": [2, 3],
				},
			});
		case "hg_vertmix": 
			return extend(true, base, { 
				frames: {
					"u0": [0, 0], "u1": [1, 3], "u2": [2, 0],
					"d0": [2, 1], "d1": [2, 2], "d2": [2, 3],
					"l0": [0, 2], "l1": [0, 1], "l2": [0, 3],
					"r0": [1, 0], "r1": [1, 1], "r2": [1, 2],
				},
			});
		case "hg_pokerow":
			return extend(true, base, { 
				frames: { // pointers to another image indicates that image should be flipped, if flip=true
					"u0": null, "u1": [0, 0], "u2": [1, 0],
					"d0": null, "d1": [0, 1], "d2": [1, 1],
					"l0": null, "l1": [0, 2], "l2": [1, 2],
					"r0": null, "r1": [0, 3], "r2": [1, 3],
				},
				anims: getPokemonAnimations(),
			});
		case "hg_pokerow_reverse":
			return extend(true, base, { 
				frames: { // pointers to another image indicates that image should be flipped, if flip=true
					"u0": null, "u1": [0, 1], "u2": [1, 1],
					"d0": null, "d1": [0, 0], "d2": [1, 0],
					"l0": null, "l1": [0, 3], "l2": [1, 3],
					"r0": null, "r1": [0, 2], "r2": [1, 2],
				},
				anims: getPokemonAnimations(),
			});
		case "hg_pokecol":
			return extend(true, base, { 
				frames: { // pointers to another image indicates that image should be flipped, if flip=true
					"u0": null, "u1": [0, 0], "u2": [0, 1],
					"d0": null, "d1": [0, 2], "d2": [0, 3],
					"l0": null, "l1": [1, 0], "l2": [1, 1],
					"r0": null, "r1": [1, 2], "r2": [1, 3],
				},
				anims: getPokemonAnimations(),
			});
		case "hg_poke_horzcol":
			return extend(true, base, { 
				frames: { // pointers to another image indicates that image should be flipped, if flip=true
					"u0": null, "u1": [1, 0], "u2": [1, 1],
					"d0": null, "d1": [0, 0], "d2": [0, 1],
					"l0": null, "l1": [2, 0], "l2": [2, 1],
					"r0": null, "r1": [3, 0], "r2": [3, 1],
				},
				anims: getPokemonAnimations(),
			});
		case "hg_pokeflip":
			return extend(true, base, { 
				frames: { // pointers to another image indicates that image should be flipped, if flip=true
					"u0": null, "u1": [0, 0], "u2": [1, 0],
					"d0": null, "d1": [0, 1], "d2": [1, 1],
					"l0": null, "l1": [0, 2], "l2": [1, 2],
					"r0": null, "r1": "l1",   "r2": "l2",
				},
				anims: getPokemonAnimations(),
			});
		case "bw_vertrow":
			return extend(true, base, { 
				frames: {
					"u0": [0, 0], "u1": [1, 0], "u2": [2, 0],
					"d0": [0, 1], "d1": [1, 1], "d2": [2, 1],
					"l0": [0, 2], "l1": [1, 2], "l2": [2, 2],
					"r0": [0, 3], "r1": [1, 3], "r2": [2, 3],
				},
			});
		case "bw_horzflip":
			return extend(true, base, { 
				frames: { // pointers to another image indicates that image should be flipped, if flip=true
					"u0": [0, 0], "u1": [1, 0], "u2": "u1",
					"d0": [2, 0], "d1": [3, 0], "d2": "d1",
					"l0": [0, 1], "l1": [1, 1], "l2": [2, 1],
					"r0": "l0",   "r1": "l1",   "r2": "l2",
				},
			});
		default:
			console.error("No such Sprite Format:", name);
			return {};
	}
}
module.exports.getSpriteFormat = getSpriteFormat;


function getStandardAnimations() {
	var anims = {};
	
	anims["stand"] = new SpriteAnimation({ singleFrame: true, }, [
		{ u: "u0", d: "d0", l: "l0", r: "r0", trans: true, pause: true, },
	]);
	anims["walk"] = new SpriteAnimation({ frameLength: 5, keepFrame: true, }, [
		{ u: "u1", d: "d1", l: "l1", r: "r1", },
		{ u: "u3", d: "d3", l: "l3", r: "r3", trans: true, },
		{ u: "u2", d: "d2", l: "l2", r: "r2", },
		{ u: "u3", d: "d3", l: "l3", r: "r3", trans: true, loopTo: 0, },
	]);
	anims["bump"] = new SpriteAnimation({ frameLength: 10, keepFrame: true, }, [
		{ u: "u1", d: "d1", l: "l1", r: "r1", sfx: "walk_bump", },
		{ u: "u0", d: "d0", l: "l0", r: "r0", trans: true, },
		{ u: "u2", d: "d2", l: "l2", r: "r2", sfx: "walk_bump", },
		{ u: "u0", d: "d0", l: "l0", r: "r0", trans: true, loopTo: 0, },
	]);
	anims["warp_away"] = new SpriteAnimation({ singleDir: "d" }, [
		{ d: "d0", frameLength: 8, }, //0
		{ d: "l0", frameLength: 8, },
		{ d: "u0", frameLength: 8, },
		{ d: "r0", frameLength: 8, },
		{ d: "d0", frameLength: 7, }, //4
		{ d: "l0", frameLength: 7, },
		{ d: "u0", frameLength: 7, },
		{ d: "r0", frameLength: 7, },
		{ d: "d0", frameLength: 5, }, //8
		{ d: "l0", frameLength: 5, },
		{ d: "u0", frameLength: 5, },
		{ d: "r0", frameLength: 5, },
		{ d: "d0", frameLength: 3, }, //12
		{ d: "l0", frameLength: 3, },
		{ d: "u0", frameLength: 3, },
		{ d: "r0", frameLength: 3, },
		{ d: "d0", frameLength: 1, }, //16
		{ d: "l0", frameLength: 1, },
		{ d: "u0", frameLength: 1, },
		{ d: "r0", frameLength: 1, },
		{ d: "d0", frameLength: 0, trans: true, }, //20
		{ d: "l0", frameLength: 0, trans: true, },
		{ d: "u0", frameLength: 0, trans: true, },
		{ d: "r0", frameLength: 0, trans: true, loopTo: 20 },
	]);
	anims["warp_in"] = new SpriteAnimation({ singleDir: "d" }, [
		{ d: "d0", frameLength: 1, }, //0
		{ d: "r0", frameLength: 1, },
		{ d: "u0", frameLength: 1, },
		{ d: "l0", frameLength: 1, },
		{ d: "d0", frameLength: 3, }, //4
		{ d: "r0", frameLength: 3, },
		{ d: "u0", frameLength: 3, },
		{ d: "l0", frameLength: 3, },
		{ d: "d0", frameLength: 5, }, //8
		{ d: "r0", frameLength: 5, },
		{ d: "u0", frameLength: 5, },
		{ d: "l0", frameLength: 5, },
		{ d: "d0", frameLength: 7, }, //12
		{ d: "r0", frameLength: 7, },
		{ d: "u0", frameLength: 7, },
		{ d: "l0", frameLength: 7, },
		{ d: "d0", frameLength: 8, }, //16
		{ d: "r0", frameLength: 8, },
		{ d: "u0", frameLength: 9, },
		{ d: "l0", frameLength: 9, },
		{ d: "d0", frameLength: 1, },
	]);
	
	return anims;
}

function getPokemonAnimations() { //Overrides Standard
	var anims = {};
	anims["stand"] = new SpriteAnimation({ singleFrame: true, }, [
		{ u: "u1", d: "d1", l: "l1", r: "r1", trans: true, pause: true, },
	]);
	anims["_flap_stand"] = new SpriteAnimation({ frameLength: 5, keepFrame: true, }, [
		{ u: "u1", d: "d1", l: "l1", r: "r1", trans: true, },
		{ u: "u2", d: "d2", l: "l2", r: "r2", loopTo: 0, },
	]);
	anims["walk"] = new SpriteAnimation({ frameLength: 5, keepFrame: true, }, [
		{ u: "u1", d: "d1", l: "l1", r: "r1", trans: true, },
		{ u: "u2", d: "d2", l: "l2", r: "r2", loopTo: 0, },
	]);
	return anims;
}

///////////////////////////////////////////////////////////////////////

function SpriteAnimation(opts, frames) {
	this.options = opts;
	this.frames = frames;
	
	this.waitTime = this.frames[this.currFrame].frameLength || this.options.frameLength;
}
SpriteAnimation.prototype = {
	options: null,
	frames : null,
	
	waitTime : 0,
	currFrame: 0,
	speed : 1,
	paused : false,
	finished: false,
	
	parent : null,
	
	/** Advanced the animation by the given amount of delta time. */
	advance : function(deltaTime) {
		if (this.options.singleFrame) return;
		if (this.paused) return;
		
		if (this.waitTime > 0) {
			this.waitTime -= (this.speed * (deltaTime * CONFIG.speed.animation));
			return;
		}
		
		var loop = this.frames[this.currFrame].loopTo;
		if (loop !== undefined) this.currFrame = loop;
		else this.currFrame++;
		
		if (this.currFrame >= this.frames.length) {
			this.currFrame = this.frames.length-1;
			this.paused = true;
			this.finished = true;
			console.warn("Animation has completed!");
			if (this.parent) this.parent.emit("anim-end", null); //TODO provide anim name
			return;
		}
		
		//new frame
		
		this.waitTime = this.frames[this.currFrame].frameLength || this.options.frameLength;
		
		if (this.frames[this.currFrame].pause) this.paused = true;
		
		if (this.frames[this.currFrame].sfx) 
			SoundManager.playSound(this.frames[this.currFrame].sfx);
	},
	
	/** If this animation is on a pause frame */
	resume : function() {
		this.paused = false;
	},
	
	/** Reset the animation parameters. Called when this animation is no longer used. */
	reset : function() {
		this.paused = false;
		if (this.options.keepFrame) {
			// if (self.canTransition()) {
			// 	var loop = this.frames[this.currFrame].loopTo;
			// 	if (loop !== undefined) this.currFrame = loop;
			// 	else this.currFrame++;
				
			// 	this.waitTime = this.frames[this.currFrame].frameLength || this.options.frameLength;
				
			// 	if (this.frames[this.currFrame].pause) this.paused = true;
			// }
			return;
		}
		this.finished = false;
		this.currFrame = 0;
		this.waitTime = this.frames[this.currFrame].frameLength || this.options.frameLength;
		this.speed = 1;
	},
	
	/** If this animation is on a frame that can transition to another animation. */
	canTransition : function() {
		return this.finished || this.frames[this.currFrame].trans;
	},
	
	/** Returns the name of the frame to display this frame. */
	getFrameToDisplay : function(dir) {
		if (this.options.singleDir) dir = this.options.singleDir;
		return this.frames[this.currFrame][dir];
	},
};
module.exports.SpriteAnimation = SpriteAnimation;
},{"extend":"extend"}],"tpp-actor":[function(require,module,exports){
// actor.js
// Defines the actor event used throughout the park

var Event = require("tpp-event");
var inherits = require("inherits");
var extend = require("extend");

var CharacterSprite = require("tpp-spritemodel").CharacterSprite;
var SpriteGlowMaterial = require("tpp-spritemodel").SpriteGlowMaterial;
var getSpriteFormat = require("tpp-actor-animations").getSpriteFormat;

var GLOBAL_SCALEUP = 1.65;
var EVENT_PLANE_NORMAL = new THREE.Vector3(0, 1, 0);
/**
 * An actor is any event representing a person, pokemon, or other entity that
 * may move around in the world or face a direction. Actors may have different
 * behaviors, some common ones predefined in this file.
 */
function Actor(base, opts) {
	Event.call(this, base, opts);
	
	this.on("tick", this._actorTick);
	this.on("interacted", this._doBehavior_interact);
	this.on("bumped", this._doBehavior_bump);
	this.on("cant-move", this._actorBump);
	this.facing = new THREE.Vector3(0, 0, 1);
	
	this._initBehaviorStack();
	
	if (this.schedule) {
		this.schedule = ActorScheduler.createSchedule(this.id, this.schedule);
	}
}
inherits(Actor, Event);
extend(Actor.prototype, {
	sprite: null,
	sprite_format: null,
	
	shadow : true,
	
	//////////////// Property Setters /////////////////
	scale: 1,
	scale_shadow: 1,
	offset_sprite_x: 0, 
	offset_sprite_y: 0.3,
	
	setScale : function(scale) {
		this.scale = scale;
		scale *= GLOBAL_SCALEUP;
		this.avatar_sprite.scale.set(scale, scale, scale);
		this._avatar_shadowcaster.scale.set(
			this.scale_shadow * scale,
			this.scale_shadow * scale,
			this.scale_shadow * scale
		);
	},
	
	setShadowScale : function(scale) {
		this.scale_shadow = scale;
		// scale *= GLOBAL_SCALEUP;
		this._avatar_shadowcaster.scale.set(
			this.scale * scale,
			this.scale * scale,
			this.scale * scale
		);
	},
	
	/////////////////////// Avatar //////////////////////
	avatar_node : null,
	avatar_sprite : null,
	avatar_format : null,
	avatar_tex : null,
	_avatar_shadowcaster : null,
	
	getAvatar : function(map, gc){ 
		if (this.avatar_node) return this.avatar_node;
		
		var node = this.avatar_node = new THREE.Object3D();
		
		node.add(this._avatar_createSprite(map, gc));
		node.add(this._avatar_createShadowCaster(map, gc));
		// if (this.glow_color) {
		// 	node.add(this._avatar_createGlowCaster(map, gc));
		// }
		
		return node;
		
	},
	
	getTalkingAnchor : function() {
		return this._avatar_shadowcaster.localToWorld(
			this._avatar_shadowcaster.position.clone()
		);
	},
	
	_avatar_createGlowCaster: function(map, gc) {
		var mat = new SpriteGlowMaterial({
			color: this.glow_color,
		});
		gc.collect(mat);
		
		var geom = new THREE.SphereGeometry(0.8, 21, 10);
		gc.collect(geom);
		
		var mesh = new THREE.Mesh(geom, mat);
		mesh.position.set(0, 0.5, 0);
		
		// self.setScale(self.scale_shadow);
		// mesh.scale.set(
		// 	this.scale_shadow * this.scale, 
		// 	this.scale_shadow * this.scale, 
		// 	this.scale_shadow * this.scale
		// );
		return this._avatar_glowcaster = mesh;
	},
	
	_avatar_createShadowCaster: function(map, gc) {
		var mat = new THREE.MeshBasicMaterial();
		mat.visible = false; //The object won't render, but the shadow still will
		gc.collect(mat);
		
		var geom = new THREE.SphereGeometry(0.3, 7, 3);
		gc.collect(geom);
		
		var mesh = new THREE.Mesh(geom, mat);
		mesh.castShadow = true;
		mesh.position.set(0, 0.5, 0);
		
		// self.setScale(self.scale_shadow);
		mesh.scale.set(
			this.scale_shadow * this.scale, 
			this.scale_shadow * this.scale, 
			this.scale_shadow * this.scale
		);
		return this._avatar_shadowcaster = mesh;
	},
	
	_avatar_createSprite : function(map, gc) {
		var self = this;
		// var img = new Image();
		var texture = self.avatar_tex = new THREE.Texture(DEF_SPRITE_IMG);
		gc.collect(texture);
		
		// Note: not using "this.getSpriteFormat", because the defailt sprite
		// format should not be overidden.
		var spformat = getSpriteFormat(DEF_SPRITE_FORMAT);
		
		this.__onLoadSprite(DEF_SPRITE_IMG, spformat, texture);
		// img.src = DEF_SPRITE;
		
		texture.magFilter = THREE.NearestFilter;
		texture.minFilter = THREE.NearestFilter;
		texture.repeat = new THREE.Vector2(0.25, 0.25);
		texture.offset = new THREE.Vector2(0, 0);
		texture.wrapS = THREE.MirroredRepeatWrapping;
		texture.wrapT = THREE.MirroredRepeatWrapping;
		texture.generateMipmaps = false; //Mipmaps generate undesirable transparency artifacts
		//TODO MirroredRepeatWrapping, and just use a negative x uv value, to flip a sprite
		
		self.avatar_format = spformat;
		
		// var mat /*= self.avatar_mat*/ = new THREE.SpriteMaterial({
		// 	map: texture,
		// 	color: 0xFFFFFF,
		// 	transparent: true,
		// });
		
		currentMap.markLoading("ACTOR_"+self.id);
		this._avatar_loadSprite(map, texture);
		
		//var sprite = self.avatar_sprite = new THREE.Sprite(mat);
		var sprite = self.avatar_sprite = new CharacterSprite({
			map: texture,
			color: 0xFFFFFF,
			offset: new THREE.Vector3(this.offset_sprite_x, this.offset_sprite_y, 0),//0.22),
			gc: gc,
		});
		//self.setScale(self.scale);
		sprite.scale.set(
			self.scale * GLOBAL_SCALEUP, 
			self.scale * GLOBAL_SCALEUP, 
			self.scale * GLOBAL_SCALEUP
		);
		
		return sprite;
	},
	
	_avatar_loadSprite : function(map, texture) {
		var self = this;
		map.loadSprite(self.id, self.sprite, function(err, url){
			if (err) {
				console.error("ERROR LOADING SPRITE: ", err);
				return;
			}
			
			var img = new Image();
			var format = self.sprite_format;
			if ($.isPlainObject(format)) {
				format = self.sprite_format[self.sprite];
			}
			if (typeof format == "function") {
				format = self.sprite_format(self.sprite);
			}
			if (typeof format != "string") {
				console.error("INVALID SPRITE FORMAT! 'sprite_format' must be a string, an object, or a "+
					"function that returns a string! To provide a custom format, override "+
					"getSpriteFormat on the actor instance!");
				format = DEF_SPRITE_FORMAT;
			}
			
			self.__onLoadSprite(img, self.getSpriteFormat(format), texture);
			img.src = url;
		});
	},
	
	__onLoadSprite : function(img, format, texture) {
		var self = this;
		var f = function() {
			texture.image = img;
			
			self.avatar_format = format;
			texture.repeat.set(
				self.avatar_format.width / img.naturalWidth, 
				self.avatar_format.height / img.naturalHeight);
			texture.needsUpdate = true;
			
			self.avatar_sprite.width = self.avatar_format.width;
			self.avatar_sprite.height = self.avatar_format.height;
			
			// self.showAnimationFrame("d0");
			self.playAnimation("stand");
			currentMap.markLoadFinished("ACTOR_"+self.id);
			
			img.removeEventListener("load", f);
			img.removeEventListener("load", e);
		}
		var e = function() {
			console.error("Error while loading texture!", img.src);
			texture.needsUpdate = true; //update the missing texture pre-loaded
			currentMap.markLoadFinished("ACTOR_"+self.id);
			
			img.removeEventListener("load", f);
			img.removeEventListener("load", e);
		}
		img.on("load", f);
		img.on("error", e);
	},
	
	// Override this function to provide a custom sprite format
	getSpriteFormat : function(format) {
		return getSpriteFormat(format);
	},
	
	/////////////////// Animation //////////////////////
	_animationState : null,
	facing : null,
	animationSpeed: 1, //default animation speed
	
	_initAnimationState : function() {
		if (!this._animationState)
			this._animationState = {
				currAnim : null, // Animation object
				currFrame : null, // Currently displayed sprite frame name
				nextAnim : null, // Animation object in queue
				
				stopNextTransition: false, //Stop at the next transition frame, to short-stop the "Bump" animation
			};
		return this._animationState;
	},
	
	getDirectionFacing : function() {
		if (!currentMap || !currentMap.camera) return "d";
		
		var dirvector = this.facing.clone();
		dirvector.applyQuaternion( currentMap.camera.quaternion );
		dirvector.projectOnPlane(EVENT_PLANE_NORMAL).normalize();
		
		var x = dirvector.x, y = dirvector.z;
		// console.log("DIRFACING:", x, y);
		if (Math.abs(x) > Math.abs(y)) { //Direction vector is pointing along x axis
			if (x > 0) return "l";
			else return "r";
		} else { //Direction vector is pointing along y axis
			if (y > 0) return "d";
			else return "u";
		}
		return "d";
	},
	
	showAnimationFrame : function(frame) {
		var state = this._initAnimationState();
		
		var def = this.avatar_format.frames[frame];
		if (!def) {
			console.warn("ERROR ", this.id, ": Animation frame doesn't exist:", frame);
			return;
		}
		state.frameName = frame;
		
		var flip = false;
		if (typeof def == "string") { //redirect
			def = this.avatar_format.frames[def];
			flip = true;
		}
		
		var u = def[0] * this.avatar_tex.repeat.x;
		var v = 1 - ((def[1]+1) * this.avatar_tex.repeat.y);
		//For some reason, offsets are from the BOTTOM left?!
		
		if (flip && this.avatar_format.flip) {
			u = 0 - (def[0]-1) * this.avatar_tex.repeat.x; //TODO test
		}
		
		this.avatar_tex.offset.set(u, v); 
		this.avatar_tex.needsUpdate = true;
	},
	
	playAnimation : function(animName, opts) {
		var state = this._initAnimationState();
		if (!opts) opts = {};
		
		var anim = this.avatar_format.anims[animName];
		if (!anim) {
			console.warn("ERROR", this.id, ": Animation name doesn't exist:", animName);
			return;
		}
		anim.parent = this;
		state.nextAnim = anim;
		anim.speed = (opts.speed == undefined)? this.animationSpeed : opts.speed;
		state.stopNextTransition = opts.stopNextTransition || false;
	},
	
	resumeAnimation: function() {
		var state = this._initAnimationState();
		
		if (state.currAnim)
			state.currAnim.resume();
	},
	
	stopAnimation : function() {
		var state = this._initAnimationState();
		
		// state.running = false;
		// state.queue = null;
		// state.stopFrame = null;
		this.emit("anim-end", state.animName);
	},
	
	showEmote: function(emote, timeout) {
		var e = this.__currEmote;
		if (!e) 
			e = this.__currEmote = UI.getEmoteBubble();
		
		e.setType(emote);
		e.height = this.avatar_sprite.height;
		if (timeout) {
			e.setTimeout(timeout);
		}
		
		this.avatar_sprite.add(e);
		e.show();
	},
	
	hideEmote: function() {
		var e = this.__currEmote;
		e.hide(function(){
			e.release();
		});
		this.__currEmote = null;
	},
	
	_tick_doAnimation: function(delta) {
		var state = this._animationState;
		var CA = state.currAnim;
		if (!CA) CA = state.currAnim = state.nextAnim;
		if (!CA) return;
		
		CA.advance(delta);
		
		if (state.nextAnim && CA.canTransition()) {
			//Switch animations
			CA.reset();
			CA = state.currAnim = state.nextAnim;
			state.nextAnim = null;
			
			// this.emit("anim-end", null); //TODO provide anim name
			
			if (state.stopNextTransition) {
				this.playAnimation("stand");
			}
		}
		
		var dir = this.getDirectionFacing();
		var frame = CA.getFrameToDisplay(dir);
		if (frame != state.currFrame) {
			this.showAnimationFrame(frame);
		}
		
	},
	
	/////////////////// Movement and Pathing //////////////////////
	_pathingState : null,
	
	_initPathingState : function() {
		if (!this._pathingState)
			this._pathingState = {
				queue: [],
				moving: false,
				speed: 1,
				delta: 0, //the delta from src to dest
				jumping : false,
				// dir: "d",
				
				destLocC: new THREE.Vector3().set(this.location), //collision map location
				destLoc3: new THREE.Vector3(), //world space location
				srcLocC: new THREE.Vector3().set(this.location),
				srcLoc3: new THREE.Vector3(),
				midpointOffset: new THREE.Vector3(),
			};
		return this._pathingState;
	},
	
	pathTo : function(x, y) {
		var state = this._initPathingState();
		
		console.error(this.id, ": Pathing has not been implemented yet!");
	},
	
	clearPathing : function() {
		var state = this._initPathingState();
		state.queue.length = 0;
	},
	
	moveDir : function(dir) {
		var x = this.location.x;
		var y = this.location.y;
		var z = this.location.z;
		switch (dir) {
			case "d": case "down":	y += 1; break;
			case "u": case "up":	y -= 1; break;
			case "l": case "left":	x -= 1; break;
			case "r": case "right":	x += 1; break;
		}
		this.moveTo(x, y, z);
	},
	
	faceInteractor : function(vector) {
		this.facing = vector.clone().negate();
	},
	
	faceDir : function(x, y) {
		this.facing.set(-x, 0, y);
	},
	
	moveTo : function(x, y, layer, opts) { //bypass Walkmask Check
		if ($.isPlainObject(layer) && opts === undefined) {
			opts = layer; layer = undefined;
		}
		if (opts === undefined) opts = {};
		
		var state = this._initPathingState();
		var src = this.location;
		layer = (layer == undefined)? this.location.z : layer;
		
		this.facing.set(src.x-x, 0, y-src.y);
		
		var walkmask = currentMap.canWalkBetween(src.x, src.y, x, y);
		if (opts.bypass !== undefined) walkmask = opts.bypass;
		if (!walkmask) {
			this.emit("cant-move", src.x, src.y, x, y);
			currentMap.dispatch(x, y, "bumped", this.facing);
			return;
		}
		if ((walkmask & 0x10) == 0x10) { // Check NoNPC tiles
			if (this.isNPC()) {
				this.emit("cant-move", src.x, src.y, x, y);
				currentMap.dispatch(x, y, "bumped", this.facing);
				return;
			}
		}
		if ((walkmask & 0x8) == 0x8) {
			// Transition now to another layer
			var t = currentMap.getLayerTransition(x, y, this.location.z);
			console.log("Layer Transition: ", t);
			x = t.x; y = t.y; layer = t.layer;
		}
		
		
		var animopts = {};
		state.midpointOffset.set(0, 0, 0);
		state.srcLocC.set(src);
		state.srcLoc3.set(currentMap.get3DTileLocation(src));
		state.destLocC.set(x, y, layer);
		state.destLoc3.set(currentMap.get3DTileLocation(x, y, layer));
		state.delta = 0;
		state.speed = opts.speed || 1;
		state.moving = true;
		animopts.speed = opts.speed || 1;
		
		if ((walkmask & 0x2) === 0x2) {
			state.midpointOffset.setY(0.6);
			state.jumping = true;
			//enforce a jumping speed of based on height. The below should be 1 with a default step of 0.5
			state.speed = 1 / ((state.srcLoc3.y - state.destLoc3.y) * 2); 
			SoundManager.playSound("walk_jump");
			animopts.speed = 1.5;
		}
		
		this.playAnimation("walk", animopts);
		this.emit("moving", state.srcLocC.x, state.srcLocC.y, state.destLocC.x, state.destLocC.y);
	},
	
	_tick_doMovement : function(delta) {
		var state = this._initPathingState();
		
		state.delta += state.speed * (delta * CONFIG.speed.pathing);
		var alpha = Math.clamp(state.delta);
		var beta = Math.sin(alpha * Math.PI);
		this.avatar_node.position.set( 
			//Lerp between src and dest (built in lerp() is destructive, and seems badly done)
			state.srcLoc3.x + ((state.destLoc3.x - state.srcLoc3.x) * alpha) + (state.midpointOffset.x * beta),
			state.srcLoc3.y + ((state.destLoc3.y - state.srcLoc3.y) * alpha) + (state.midpointOffset.y * beta),
			state.srcLoc3.z + ((state.destLoc3.z - state.srcLoc3.z) * alpha) + (state.midpointOffset.z * beta)
		);
		
		if (state.delta > 1) {
			this.emit("moved", state.srcLocC.x, state.srcLocC.y, state.destLocC.x, state.destLocC.y);
			this.location.set( state.destLocC );
			
			if (state.jumping) {
				//TODO particle effects
				SoundManager.playSound("walk_jump_land");
				state.jumping = false;
			}
			
			var next = state.queue.shift();
			if (!next) {
				state.delta = 0;
				state.moving = false;
				// this.stopAnimation();
				this.playAnimation("stand");
			} else {
				this.moveTo(next.x, next.y, next.z);
			}
		}
	},
	
	
	//////////////////////// Behaviors /////////////////////////
	behaviorStack : null,
	
	_initBehaviorStack : function() {
		if (!this.behaviorStack)
			this.behaviorStack = [];
	},
	
	_tick_doBehavior : function(delta) {
		var behav = this.behaviorStack.top;
		if (!behav || !behav._tick) return;
		if (!behav.owner) behav.owner = this;
		behav._tick(this, delta);
	},
	
	_doBehavior_interact : function(fromDir) {
		var behav = this.behaviorStack.top;
		if (!behav || !behav._interact) return;
		behav._interact(this, fromDir);
	},
	
	_doBehavior_bump : function(fromDir) {
		var behav = this.behaviorStack.top;
		if (!behav || !behav._bump) return;
		behav._bump(this, fromDir);
	},
	
	////////////////////////////////////////////////////////////
	
	shouldAppear: function(mapid) {
		if (this.schedule) {
			var timestamp = ActorScheduler.getTimestamp();
			var should = this.schedule[timestamp] == mapid;
			if (!should) console.log("Actor", this.id, "should NOT appear according to scheduler... ", this.schedule[timestamp]);
			return should;
		}
		return true; //no schedule, always appear
	},
	
	schedule: null,
	
	///////////////////// Private Methods //////////////////////
	
	canWalkOn : function(){ return false; },
	isNPC : function(){ return true; },
	
	_normalizeLocation : function() {
		if (this.location == "rand") {
			//Place this actor in a designated random location
			this.location = currentMap.getRandomNPCSpawnPoint();
			return;
		}
		
		var num = Event.prototype._normalizeLocation.call(this);
		if (num != 1 || !this.location)
			throw new Error("Actors can only be in one place at a time! Number of locations: "+num);
	},
	
	_actorTick : function(delta) {
		// Do animation
		if (this._animationState) 
			this._tick_doAnimation(delta);
		
		// Do movement
		if (this._pathingState && this._pathingState.moving)
			this._tick_doMovement(delta);
		
		// Do behavior
		if (this.behaviorStack.length)
			this._tick_doBehavior(delta);
	},
	
	// _actorInteractFace : function(vector) {
	// 	this.facing = vector.clone().negate();
	// },
	
	_actorBump : function(srcx, srcy, x, y, reason) {
		// console.warn(this.id, ": Cannot walk to location", "("+x+","+y+")");
	},
	
});
module.exports = Actor;



function getDirFromLoc(x1, y1, x2, y2) {
	return new THREE.Vector3(x2-x1, 0, y2-y1);
	// var dx = x2 - x1;
	// var dy = y2 - y1;
	// if (Math.abs(dx) > Math.abs(dy)) {
	// 	if (dx > 0) { return "r"; }
	// 	else if (dx < 0) { return "l"; }
	// } else {
	// 	if (dy > 0) { return "d"; }
	// 	else if (dy < 0) { return "u"; }
	// }
	// return "d";
}


},{"extend":"extend","inherits":"inherits","tpp-actor-animations":"tpp-actor-animations","tpp-event":"tpp-event","tpp-spritemodel":"tpp-spritemodel"}],"tpp-behavior":[function(require,module,exports){
// behavior.js
// Defines the based classes for Actor's behaviors

var extend = require("extend");
var inherits = require("inherits");

/** 
 * A Behavior is a script that an actor is following, whether that
 * be walking along a path or around a circle, or following a more
 * complex script of events. Behaviors can be pushed and popped off
 * an actor's stack, and the topmost one will be passed certain events
 * that the actor recieves.
 */

function Behavior(opts) {
	extend(this, opts);
}
extend(Behavior.prototype, {
	faceOnInteract: true,
	talkBehav: null,
	owner: null,
	
	tick : null,
	bump : null,
	interact : function(me, from_dir){
		if (this.talkBehav) {
			me.behaviorStack.push(this.talkBehav);
		}
	},
	
	_tick : function(me, delta) {
		if (this.tick)
			this.tick(me, delta);
	},
	_interact : function(me, from_dir) {
		//TODO do standard stuff here
		if (this.faceOnInteract)
			me.faceInteractor(from_dir);
		
		if (this.interact)
			this.interact(me, from_dir);
	},
	_bump : function(me, from_dir) {
		if (this.bump)
			this.bump(me, from_dir);
	},
});
module.exports = Behavior;


/////////// Common Behaviors ///////////

function Talking(opts) {
	Behavior.call(this, opts);
}
inherits(Talking, Behavior);
extend(Talking.prototype, {
	dialog: null,
	dialog_type: "dialog",
	animation: null,
	owner: null,
	__ui_fired: false,
	
	// reset: function() { this.__ui_fired = false; },
	
	tick: function(me, delta) {
		var self = this;
		if (!this.__ui_fired) {
			UI.showTextBox(this.dialog_type, this.dialog, {
				owner: this.owner,
				complete: function() {
					me.behaviorStack.pop();
					if (this.animation) {
						me.playAnimation("stand", { stopNextTransition: true, });
						me.resumeAnimation();
					}
					self.__ui_fired = false;
				},
			});
			if (this.animation) {
				me.playAnimation(this.animation);
			}
			me.playAnimation()
			this.__ui_fired = true;
		}
	},
});
module.exports.Talking = Talking;



function FaceDirection(x, y, opts) {
	Behavior.call(this, opts);
	this.dir_x = x;
	this.dir_y = y;
}
inherits(FaceDirection, Behavior);
extend(FaceDirection.prototype, {
	dir_x: 0,
	dir_y: 1,
	
	tick: function(me, delta) {
		me.faceDir(this.dir_x, this.dir_y);
	},
});
module.exports.FaceDirection = FaceDirection;



function LookAround(opts) {
	Behavior.call(this, opts);
}
inherits(LookAround, Behavior);
extend(LookAround.prototype, {
	waitTime : 0,
	tick: function(me, delta) {
		if (this.waitTime > 0) {
			this.waitTime -= delta;
			return;
		}
		
		switch( Math.floor(Math.random()*4) ) {
			case 0: me.facing.set( 1,0, 0); break;
			case 1: me.facing.set(-1,0, 0); break;
			case 2: me.facing.set( 0,0, 1); break;
			case 3: me.facing.set( 0,0,-1); break;
		}
		this.waitTime += (Math.random() * 30) + 5;
	},
});
module.exports.LookAround = LookAround;



function Meander(opts) {
	Behavior.call(this, opts);
}
inherits(Meander, Behavior);
extend(Meander.prototype, {
	waitTime : 0,
	tick: function(me, delta) {
		if (this.waitTime > 0) {
			this.waitTime -= delta;
			return;
		}
		
		switch( Math.floor(Math.random()*8) ) {
			case 0: me.facing.set( 1,0, 0); break;
			case 1: me.facing.set(-1,0, 0); break;
			case 2: me.facing.set( 0,0, 1); break;
			case 3: me.facing.set( 0,0,-1); break;
			case 4: me.moveDir("d"); break;
			case 5: me.moveDir("u"); break;
			case 6: me.moveDir("l"); break;
			case 7: me.moveDir("r"); break;
		}
		this.waitTime += (Math.random() * 30) + 5;
	},
});
module.exports.Meander = Meander;


},{"extend":"extend","inherits":"inherits"}],"tpp-controller":[function(require,module,exports){
// controller.js
// This class handles input and converts it to control signals

var inherits = require("inherits");
var extend = require("extend");
var EventEmitter = require("events").EventEmitter;

// TODO https://developer.mozilla.org/en-US/docs/Web/Guide/API/Gamepad

function ControlManager() {
	var self = this;
	this.setKeyConfig();
	
	$(function(){
		$(document).on("keydown", function(e){ self.onKeyDown(e); });
		$(document).on("keyup", function(e){ self.onKeyUp(e); });
		
		$("#chatbox").on("focus", function(e){ 
			console.log("CHAT FOCUS");
			self.inputContext.push("chat"); 
		});
		$("#chatbox").on("blur", function(e){ 
			console.log("CHAT BLUR");
			if (self.inputContext.top == "chat")
				self.inputContext.pop(); 
		});
		
		self.touchManager();
	})
}
inherits(ControlManager, EventEmitter);
extend(ControlManager.prototype, {
	inputContext : ["game"],
	
	keys_config : {
		Up: [38, "Up", 87, "w"], 
		Down: [40, "Down", 83, "s"], 
		Left: [37, "Left", 65, "a"], 
		Right: [39, "Right", 68, "d"],
		Interact: [13, "Enter", 32, " "],
		Cancel: [27, "Escape", 17, "Ctrl"],
		Run: [16, "Shift"],
		Menu: [8, "Backspace", 46, "Delete"],
		FocusChat: [191, "/"],
	},
	
	keys_active : {},
	
	keys_down : {
		Up: false, Down: false,
		Left: false, Right: false,
		Interact: false, FocusChat: false,
		Run: false, Cancel: false,
	},
	
	pushInputContext: function(ctx) {
		this.inputContext.push(ctx);
		this.emit("inputContextChanged");
	},
	popInputContext: function(ctx) {
		if (!ctx || this.inputContext.top == ctx) {
			var c = this.inputContext.pop();
			this.emit("inputContextChanged");
			return c;
		}
	},
	removeInputContext: function(ctx) {
		if (!ctx) return;
		var index = this.inputContext.lastIndexOf(ctx);
		if (index > -1) {
			this.inputContext.splice(index, 1);
			this.emit("inputContextChanged");
			return ctx;
		}
	},
	
	isDown : function(key, ctx) {
		if ($.isArray(ctx)) {
			var go = false;
			for (var i = 0; i < ctx.length; i++) go |= ctx[i];
			if (!go) return;
		} else {
			if (this.inputContext.top != ctx) return;
		}
		
		return this.keys_down[key];
	},
	isDownOnce : function(key, ctx) {
		if ($.isArray(ctx)) {
			var go = false;
			for (var i = 0; i < ctx.length; i++) go |= ctx[i];
			if (!go) return;
		} else {
			if (this.inputContext.top != ctx) return;
		}
		
		return this.keys_down[key] == 1;
	},
	
	setKeyConfig : function() {
		this.keys_active = extend(true, {}, this.keys_config);
	},
	
	onKeyDown : function(e) {
		for (var action in this.keys_active) {
			var keys = this.keys_active[action];
			for (var i = 0; i < keys.length; i++) {
				if (e.which == keys[i]) {
					// Key is now down!
					this.emitKey(action, true);
				}
			}
		}
	},
	onKeyUp : function (e) {
		for (var action in this.keys_active) {
			var keys = this.keys_active[action];
			for (var i = 0; i < keys.length; i++) {
				if (e.which == keys[i]) {
					// Key is now up!
					this.emitKey(action, false);
				}
			}
		}
	},
	
	submitChatKeypress : function(key) {
		switch(key) {
			
		}
	},
	
	emitKey : function(action, down) {
		if (this.keys_down[action] != down) {
			this.keys_down[action] = down;
			this.emit("control-action", action, down);
		}
	},
	
	_tick : function() {
		for (var name in this.keys_down) {
			if (this.keys_down[name] > 0)
				this.keys_down[name]++;
		}
	}
	
});

ControlManager.prototype.touchManager = function() {
	var self = this;
	
	$(document).one("touchstart", function(){
		$("html").addClass("touchmode");
		if (!$("#touchcontrols").length) {
			function __map(btn, key) {
				btn.on("touchstart", function(e){
					console.log("TOUCHSTART: ", key);
					e.preventDefault();
					self.emitKey(key, true);
				});
				btn.on("touchend", function(e){
					console.log("TOUCHEND: ", key);
					e.preventDefault();
					self.emitKey(key, false);
				});
				btn.on("touchcancel", function(e){
					console.log("TOUCHCANCEL: ", key);
					e.preventDefault();
					self.emitKey(key, false);
				});
				btn.on("touchmove", function(e){
					console.log("TOUCHMOVE: ", key);
					e.preventDefault();
				})
				return btn;
			}
			
			$("<div>").attr("id", "touchcontrols")
			.append (
				__map($("<div>").addClass("button").addClass("a"), "Interact")
			).append (
				__map($("<div>").addClass("button").addClass("b"), "Cancel")
			).append (
				__map($("<div>").addClass("button").addClass("menu"), "Menu")
			).append (
				__map($("<div>").addClass("button").addClass("run"), "Run")
			).append (
				$("<div>").addClass("dpad")
				.append (
					__map($("<div>").addClass("button").addClass("up"), "Up")
				).append (
					__map($("<div>").addClass("button").addClass("down"), "Down")
				).append (
					__map($("<div>").addClass("button").addClass("left"), "Left")
				).append (
					__map($("<div>").addClass("button").addClass("right"), "Right")
				)
			).appendTo("body");
		}
	});
}



module.exports = new ControlManager();

},{"events":1,"extend":"extend","inherits":"inherits"}],"tpp-event":[function(require,module,exports){
// event.js
// Defines the base event used throughout the park.

// Fittingly, Event is a subclass of node.js's EventEmitter class.
var EventEmitter = require("events").EventEmitter;
var inherits = require("inherits");
var extend = require("extend");

/**
 * An event is any interactable or animating object in the game.
 * This includes things ranging from signs, to people/pokemon.
 * An event:
 *	- Takes up at least one tile on the map
 *	- Can be interacted with by in-game talking or on-screen click
 *	- May be represented in-game by a sprite
 *	- May decide, upon creation, to not appear on the map.
 */
function Event(base, opts) {
	EventEmitter.call(this);
	
	extend(this, base, opts);
	
	this._normalizeLocation();
	
	if (this.onEvents) {
		var keys = Object.keys(this.onEvents);
		for (var i = 0; i < keys.length; i++) {
			this.on(keys[i], this.onEvents[keys[i]]);
		}
		delete this.onEvents;
	}
}
inherits(Event, EventEmitter);
extend(Event.prototype, {
	id : null,
	enabled : false,
	visible : true,
	
	location : null, // Events with a single location are optimized for it
	locations : null, // Events with multiple locations are optimized for that also
	
	toString : function() {
		if (!this.id) return "<Local or Unnamed Event>";
		return this.id;
	},
	
	shouldAppear : function(mapid){ return true; },
	canWalkOn : function(){ return true; },
	
	/** Returns an object to represent this event in 3D space, or null if there shouldn't be one. */
	getAvatar : function(map, gc){ return null; },
	
	onEvents : null, //a object, event-names -> functions to call, to be registered in constructor
	
	canMove : function() {
		//If we only have 1 location, then we can move
		return !!this.location && !this.locations;
	},
	
	moveTo : function(x, y) {
		if (!this.canMove())
			throw new Error("This event is in several places at once, and cannot moveTo!");
		
		//TODO queue up a move
	},
	
	_normalizeLocation : function() {
		if (this.location) {
			//If we have a singular location set
			if (this.locations) // As long as we don't also have a list, its fine
				throw new Error("Event was initialized with both location and locations! They cannot be both defined!");
			
			var loc = this.location;
			if ($.isFunction(loc)) {
				locs = loc.call(this);
			}
			
			if ($.isArray(loc) && loc.length == 2 && typeof loc[0] == "number" && typeof loc[1] == "number") 
			{
				loc = new THREE.Vector2(loc[0], loc[1]);
			} 
			else if ($.isArray(loc) && loc.length == 3 
				&& typeof loc[0] == "number" && typeof loc[1] == "number" && typeof loc[2] == "number") 
			{
				loc = new THREE.Vector3(loc[0], loc[1], loc[2]);
			} 
			else if (!(loc instanceof THREE.Vector2 || loc instanceof THREE.Vector3)) 
			{
				throw new Error("Could not normalize location of "+this.id+"!");
			}
			this.location = loc;
			return 1;
		}
		var orgloc = this.locations;
		var locs = null;
		
		if ($.isArray(orgloc)) {
			var type = null, newType = null;
			for (var i = 0; i < orgloc.length; i++) {
				if (typeof orgloc[i] == "number")
					newType = "number";
				else if (orgloc[i] instanceof THREE.Vector2)
					newType = "vector";
				else if (orgloc[i] instanceof THREE.Vector3)
					newType = "vector";
				else if ($.isArray(orgloc[i]))
					newType = "array";
				
				if (!type) type = newType;
				if (type != newType) {
					throw new Error("Could not normalize locations of "+this.id+"!");
				}
			}
			if (type == "number") locs = __parseAsNumberArray(orgloc);
			if (type == "array") locs = __parseAsArrayArray(orgloc);
			if (type == "vector") locs = orgloc;
		}
		else if ($.isFunction(orgloc)) {
			locs = orgloc.call(this);
		}
		else if (orgloc instanceof THREE.Vector2) {
			locs = [orgloc];
		}
		
		if (!locs || !$.isArray(locs) || locs.length == 0) 
			throw new Error("Could not normalize locations of "+this.id+"!");
		
		this.locations = locs;
		this._normalizeLocation = function(){ return locs.length; }; //can't normalize twice
		return locs.length;
		
		function __parseAsNumberArray(l) {
			if (l.length == 2) //single point [x, y]
				return [new THREE.Vector2(l[0], l[1])];
			if (l.length == 3) //single point [x, y, z]
				return [new THREE.Vector3(l[0], l[1], l[2])];
			if (l.length == 4) { //rectangle [x, y, w, h]
				var n = [];
				for (var x = l[0]; x < l[0]+l[2]; x++) {
					for (var y = l[1]; y < l[1]+l[3]; y++) {
						n.push(new THREE.Vector2(x, y));
					}
				}
				return n;
			}
			if (l.length == 5) { //rectangle [x, y, z, w, h]
				var n = [];
				for (var x = l[0]; x < l[0]+l[3]; x++) {
					for (var y = l[1]; y < l[1]+l[4]; y++) {
						n.push(new THREE.Vector3(x, y, l[2]));
					}
				}
				return n;
			}
			throw new Error("Could not normalize location(s) of "+this.id+"!");
		}
		function __parseAsArrayArray(l) {
			var n = [];
			for (var i = 0; i < l.length; i++) {
				for (var j = 0; j < l[i].length; j++) {
					if (typeof l[i][j] != "number")
						throw new Error("Could not normalize location(s) of "+this.id+"!");
				}
				n.push(__parseAsNumberArray(l[i]));
			}
			return n;
		}
	},
	
	
	divideFacing: function(dirvector) {
		var x = dirvector.x, y = dirvector.z;
		// console.log("DIRFACING:", x, y);
		if (Math.abs(x) > Math.abs(y)) { //Direction vector is pointing along x axis
			if (x > 0) return "w";
			else return "e";
		} else { //Direction vector is pointing along y axis
			if (y > 0) return "s";
			else return "n";
		}
		return "s";
	}
	
});
module.exports = Event;

Event.prototype.addListener =
Event.prototype.on = function(type, listener) {
	if ($.inArray(type, __EVENT_TYPES__) == -1) {
		console.error("Map Event", this.toString(), "registering emitted event type", 
			type, "which is not a valid emitted event type!");
	}
	EventEmitter.prototype.on.call(this, type, listener);
}

// The following is a list of events the base Event class and library emit
// This list is checked against when registering to catch misspellings.
var __EVENT_TYPES__ = [
	"entering-tile", //(from-dir) 
		//emitted upon the player is given the go ahead to enter the tile this event occupies.
	"entered-tile", //(from-dir)
		//emitted upon the player landing on the tile this event occupies.
	"leaving-tile", //(to-dir)
		//emitted upon the player is given the go ahead to leave the tile this event occupies.
	"left-tile", //(to-dir)
		//emitted upon the player completely leaving the tile this event occupies.
	"bumped", //(from-dir)
		//emitted upon the player is denied entry into the tile this event occupies.
	"interacted", //(from-dir)
		//emitted when the player interacts with this event from an adjacent tile
	"tick", //(delta)
		//emitted every game tick
	"clicked", //(x, y)
		//emitted when the mouse is clicked on this event (and it is determined it is this event)
	"clicked-through", //(x, y)
		//emitted when the mouse is clicked on this event (and the raytrace is passing through 
		// this event during the determining phase)
	"moving", //(srcX, srcY, destX, destY)
		//emitted when this event begins moving to a new tile
	"moved", //(srcX, srcY, destX, destY)
		//emitted when this event finishes moving to a new tile
	"cant-move", //(srcX, srcY, destX, destY, reasonEvent)
		//emitted when this event is denied movement to the requested tile
		// It is passed the event blocking it, or null if it is due to the collision map
	"anim-end", //(animationName)
		//emitted when this event's animation ends
	"created", 
		//emitted when this event is added to the event map
	"destroyed",
		//emitted when this event has been taken out of the event map
	"react", //(id, distance)
		//emitted when another event on the map transmits a reactable event
	"message", //(id, ...)
		//never emitted by the library, this event type can be used for cross-event messages
];

},{"events":1,"extend":"extend","inherits":"inherits"}],"tpp-pc":[function(require,module,exports){
// player-character.js
// Defines the concrete code for a Player Character in the world

var Actor = require("tpp-actor");
var controller = require("tpp-controller");
var inherits = require("inherits");
var extend = require("extend");

/**
 */
function PlayerChar(){
	Actor.call(this, {}, {});
	
	this.on("tick", this.controlCharacter);
	this.on("cant-move", this.animateBump);
}
inherits(PlayerChar, Actor);
extend(PlayerChar.prototype, {
	id : "PLAYERCHAR",
	location : new THREE.Vector3(),
	
	sprite: null,
	
	reset : function() {
		this.location.set(0, 0, 0);
	},
	
	warpAway : function(animType) {
		console.warn("warpAway is not yet implemented!");
	},
	
	warpTo : function(warpdef) {
		var self = this;
		this.location.set(warpdef.loc[0], warpdef.loc[1], warpdef.layer);
		
		if (warpdef.anim)
			controller.pushInputContext("cutscene");
		//TODO warpdef.anim
		
		setTimeout(function(){
			switch(Number(warpdef.anim)) { //Warp animation
				case 1: self.avatar_node.position.z += 1; break; // Walk up
				case 2: self.avatar_node.position.z -= 1; break; // Walk down
				case 3: self.avatar_node.position.x -= 1; break; // Walk left
				case 4: self.avatar_node.position.x += 1; break; // Walk down
				case 5: self.avatar_node.position.y += 15; break; // Warp in
			}
		}, 0);
		
		currentMap.queueForMapStart(function(){
			console.log("WARP DEF", warpdef);
			var animName = null;
			var x = self.location.x;
			var y = self.location.y;
			var layer = self.location.z;
			var y_off = 0;
			var mspd = 1, aspd = 1; //movement speed, animation speed
			var animEndEvent = "moved";
			
			switch(Number(warpdef.anim)) { //Warp animation
				case 0: break; // Appear
				case 1: y++; animName = "walk"; mspd = 0.35; aspd = 0.35; break; // Walk up
				case 2: y--; animName = "walk"; mspd = 0.35; aspd = 0.35; break; // Walk down
				case 3: x--; animName = "walk"; mspd = 0.35; aspd = 0.35; break; // Walk left
				case 4: x++; animName = "walk"; mspd = 0.35; aspd = 0.35; break; // Walk down
				case 5: // Warp in
					animName = "warp_in"; 
					y_off = 15; animEndEvent = "anim-end";
					mspd = 0.25; aspd = 1; 
					break; 
				default: 
					console.warn("ILLEGAL WARP ANIMATION:", warpdef.anim);
			}
			
			var src = self.location;
			var state = self._initPathingState();
			
			if (src.x-x || y-src.y) 
				self.facing.set(x-src.x, 0, src.y-y);
			else
				self.facing.set(0, 0, 1);
			
			state.srcLocC.set(x, y, layer);
			state.srcLoc3.set(currentMap.get3DTileLocation(x, y, layer)).y += y_off;
			state.destLocC.set(src);
			state.destLoc3.set(currentMap.get3DTileLocation(src));
			state.delta = 0;
			state.moving = true;
			state.speed = mspd;
			
			self.playAnimation(animName, { speed: aspd });
			self.once(animEndEvent, function(animationName){
				console.log("Pop!");
				controller.popInputContext("cutscene");
			});
			//self.avatar_node.position.set( currentMap.get3DTileLocation(self.location) );
		});
	},
	
	controlTimeout: 0.0,
	controlCharacter : function(delta) {
		var y = ((controller.isDown("Up", "game"))? -1:0) + ((controller.isDown("Down", "game"))? 1:0);
		var x = ((controller.isDown("Left", "game"))? -1:0) + ((controller.isDown("Right", "game"))? 1:0);
		
		if (controller.isDownOnce("Interact", "game") && !this._initPathingState().moving) {
			currentMap.dispatch(
				this.location.x - this.facing.x, this.location.y + this.facing.z, 
				"interacted", this.facing);
		}
		
		var run = controller.isDown("Run", "game");
		
		if ((y || x) && !(x && y)) { //one, but not both
			if (this.controlTimeout < 1) {
				this.controlTimeout += CONFIG.timeout.walkControl * delta;
				
				if (!this._initPathingState().moving) {
					this.faceDir(x, y);
				}
			} else {
				if (!this._initPathingState().moving) {
					this.moveTo(this.location.x+x, this.location.y+y, {
						speed: (run)? 2 : 1,
					});
				}
			}
		} else {
			//This makes it so you can tap a direction to face, instead of just always walking in said direction
			if (this.controlTimeout > 0)
				this.controlTimeout -= CONFIG.timeout.walkControl * delta;
		}
		
	},
	
	animateBump : function(srcx, srcy, x, y, reason) {
		// console.warn(this.id, ": Cannot walk to location", "("+x+","+y+")");
		this.playAnimation("bump", { stopNextTransition: true });
	},
	
	
	////////////////////////////////////////////////////////////////////////
	isNPC : function(){ return false; },
	
	_avatar_loadSprite : function(map, texture) {
		var url = BASEURL+"/img/pcs/"+ gameState.playerSprite;
		var res = /^([^\[]+)\[([^\]]+)\].png$/.exec(url);
		
		var name = res[1];
		var format = res[2];
		
		var img = new Image();
		format = this.getSpriteFormat(format);
		this.__onLoadSprite(img, format, texture);
		img.src = url;
	},
	
	// Neuter the location normilization for this kind of event
	_normalizeLocation : function() {},
	
});
module.exports = PlayerChar;

},{"extend":"extend","inherits":"inherits","tpp-actor":"tpp-actor","tpp-controller":"tpp-controller"}],"tpp-spritemodel":[function(require,module,exports){
// spritemodel.js
// A redux of the THREE.js sprite, but not using the sprite plugin

var inherits = require("inherits");
var extend = require("extend");

function CharacterSprite(opts) {
	if (!(this instanceof CharacterSprite)) {
		return new CharacterSprite(opts);
	}
	var gc = opts.gc || GC.getBin();
	
	opts = extend({
		transparent: true,
		alphaTest: true,
	}, opts);
	
	if (!opts.offset) opts.offset = new THREE.Vector3(0, 0, 0);
	
	//TODO replace with geometry we can control
	// var geom = new THREE.PlaneBufferGeometry(1, 1);
	var geom = new CharacterPlaneGeometry(opts.offset);
	gc.collect(geom);
	
	var mat = new CharacterSpriteMaterial(opts);
	gc.collect(mat);
	
	THREE.Mesh.call(this, geom, mat);
	this.type = "CharacterSprite";
	
	mat.scale = mat.uniforms.scale.value = this.scale;
	
	Object.defineProperties(this, {
		width: {
			get: function() {
				return Math.floor((this.morphTargetInfluences[0] + 1) * 32);
			},
			set: function(val) {
				this.morphTargetInfluences[0] = (val / 32) - 1;
			},
		},
		height: {
			get: function() {
				return Math.floor((this.morphTargetInfluences[1] + 1) * 32);
			},
			set: function(val) {
				this.morphTargetInfluences[1] = (val / 32) - 1;
			},
		},
	});
}
inherits(CharacterSprite, THREE.Mesh);
module.exports.CharacterSprite = CharacterSprite;


function CharacterSpriteMaterial(opts) {
	if (!(this instanceof CharacterSpriteMaterial)) {
		return new CharacterSpriteMaterial(opts);
	}
	
	//TODO write it so when we replace the values here, we replace the ones in the uniforms
	// Object.defineProperties(this, {
	// 	uvOffset : {}
	// });

	this.map = opts.map || new THREE.Texture();
	
	this.uvOffset = opts.uvOffset || this.map.offset || new THREE.Vector2(0, 0);
	this.uvScale = opts.uvScale || this.map.repeat || new THREE.Vector2(1, 1);
	
	this.rotation = opts.rotation || 0;
	this.scale = opts.scale || new THREE.Vector2(1, 1);
	
	this.color = (opts.color instanceof THREE.Color)? opts.color : new THREE.Color(opts.color);
	this.opacity = opts.opacity || 1;
	
	var params = this._createMatParams(opts);
	THREE.ShaderMaterial.call(this, params);
	this.type = "CharacterSpriteMaterial";
	
	this.transparent = (opts.transparent !== undefined)? opts.transparent : true;
	this.alphaTest = 0.05;
	// this.depthWrite = false;
	this.morphTargets = true;
}
inherits(CharacterSpriteMaterial, THREE.ShaderMaterial);
extend(CharacterSpriteMaterial.prototype, {
	map : null,
	
	_createMatParams : function() {
		sheermat = [
			1, 0, 0, 0,
			0, 1, 0, 0,
			0, 0, 1, -0.009,
			0, 0, 0, 1,
		];
		
		var params = {
			uniforms : {
				uvOffset:	{ type: "v2", value: this.uvOffset },
				uvScale:	{ type: "v2", value: this.uvScale },
				
				rotation:	{ type: "f", value: this.rotation },
				scale:		{ type: "v2", value: this.scale },
				
				color:		{ type: "c", value: this.color },
				map:		{ type: "t", value: this.map },
				opacity:	{ type: "f", value: this.opacity },
				
				zoffset:	{ type: "f", value: -0.009 },
				sheer:		{ type: "m4", value: new THREE.Matrix4() },
				
				morphTargetInfluences : { type: "f", value: 0 },
			},
		};
		
		params.vertexShader = this._vertShader;
		params.fragmentShader = this._fragShader;
		return params;
	},
	
	_vertShader: [
		// 'uniform mat4 modelViewMatrix;',
		// 'uniform mat4 projectionMatrix;',
		'uniform float rotation;',
		'uniform vec2 scale;',
		'uniform vec2 uvOffset;',
		'uniform vec2 uvScale;',
		
		'uniform float zoffset;',
		'uniform mat4 sheer;',
		
		'#ifdef USE_MORPHTARGETS',
		"uniform float morphTargetInfluences[ 8 ];",
		'#endif',

		// 'attribute vec2 position;',
		// 'attribute vec2 uv;',

		'varying vec2 vUV;',

		'void main() {',

			'vUV = uvOffset + uv * uvScale;',

			"vec3 morphed = vec3( 0.0 );",
			
			'#ifdef USE_MORPHTARGETS', 
			"morphed += ( morphTarget0 - position ) * morphTargetInfluences[ 0 ];",
			"morphed += ( morphTarget1 - position ) * morphTargetInfluences[ 1 ];",
			"morphed += ( morphTarget2 - position ) * morphTargetInfluences[ 2 ];",
			"morphed += ( morphTarget3 - position ) * morphTargetInfluences[ 3 ];",
			"morphed += ( morphTarget4 - position ) * morphTargetInfluences[ 4 ];",
			"morphed += ( morphTarget5 - position ) * morphTargetInfluences[ 5 ];",
			"morphed += ( morphTarget6 - position ) * morphTargetInfluences[ 6 ];",
			"morphed += ( morphTarget7 - position ) * morphTargetInfluences[ 7 ];",
			'#endif',
			
			"morphed += position;",

			'vec2 alignedPosition = morphed.xy * scale;',

			'vec2 rotatedPosition;',
			'rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;',
			'rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;',
			
			'mat4 zsheer = mat4(1, 0, 0, 0,',
				               '0, 1, 0, 0,',
				               '0, 0, 1, position.y * zoffset,',
				               '0, 0, 0, 1);',

			'vec4 sheerforce = modelViewMatrix * vec4(0, position.y, position.z, 1);',
			
			'vec4 finalPosition;',

			'finalPosition = modelViewMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );',
			'finalPosition.w += (sheerforce.z - finalPosition.z) * zoffset;',
			'finalPosition.xy += rotatedPosition;',
			'finalPosition = zsheer * finalPosition;',
			'finalPosition = sheer * finalPosition;',
			'finalPosition = projectionMatrix * finalPosition;',
			
			'gl_Position = finalPosition;',

		'}'
	].join( '\n' ),
	
	_fragShader: [
		'uniform vec3 color;',
		'uniform sampler2D map;',
		'uniform float opacity;',

		'uniform vec3 fogColor;',
		'uniform float fogDensity;',
		'uniform float fogNear;',
		'uniform float fogFar;',

		'varying vec2 vUV;',

		'void main() {',

			'vec4 texture = texture2D( map, vUV );',

			'#ifdef ALPHATEST',
				'if ( texture.a < ALPHATEST ) discard;',
			'#endif',

			'gl_FragColor = vec4( color * texture.xyz, texture.a * opacity );',

			'#ifdef USE_FOG',
				'float depth = gl_FragCoord.z / gl_FragCoord.w;',
				'float fogFactor = 0.0;',
				
				'#ifndef FOG_EXP2', //note: NOT defined
				
					'fogFactor = smoothstep( fogNear, fogFar, depth );',
					
				'#else',
				
					'const float LOG2 = 1.442695;',
					'float fogFactor = exp2( - fogDensity * fogDensity * depth * depth * LOG2 );',
					'fogFactor = 1.0 - clamp( fogFactor, 0.0, 1.0 );',

				'#endif',
				
				'gl_FragColor = mix( gl_FragColor, vec4( fogColor, gl_FragColor.w ), fogFactor );',

			'#endif',

		'}'
	].join( '\n' ),
});
module.exports.CharacterSpriteMaterial = CharacterSpriteMaterial;



function CharacterPlaneGeometry(off) {
	THREE.Geometry.call(this);
	
	this.type = "CharacterPlaneGeometry";
	this.vertices = [
		new THREE.Vector3( -0.5 + off.x, -0.5 + off.y, 0 + off.z ),
		new THREE.Vector3(  0.5 + off.x, -0.5 + off.y, 0 + off.z ),
		new THREE.Vector3(  0.5 + off.x,  0.5 + off.y, 0 + off.z ),
		new THREE.Vector3( -0.5 + off.x,  0.5 + off.y, 0 + off.z ),
	];
	
	this.faces.push(new THREE.Face3(0, 1, 2));
	this.faces.push(new THREE.Face3(0, 2, 3));
	
	this.faceVertexUvs[0].push([ uv(0, 0), uv(1, 0), uv(1, 1) ]);
	this.faceVertexUvs[0].push([ uv(0, 0), uv(1, 1), uv(0, 1) ]);
	
	this.morphTargets = [
		{ name: "width", vertices: [
			new THREE.Vector3( -0.5 + off.x - 0.5, -0.5 + off.y, 0 + off.z ),
			new THREE.Vector3(  0.5 + off.x + 0.5, -0.5 + off.y, 0 + off.z ),
			new THREE.Vector3(  0.5 + off.x + 0.5,  0.5 + off.y, 0 + off.z ),
			new THREE.Vector3( -0.5 + off.x - 0.5,  0.5 + off.y, 0 + off.z ),
		] },
		{ name: "height", vertices: [
			new THREE.Vector3( -0.5 + off.x, -0.5 + off.y    , 0 + off.z ),
			new THREE.Vector3(  0.5 + off.x, -0.5 + off.y    , 0 + off.z ),
			new THREE.Vector3(  0.5 + off.x,  0.5 + off.y + 1, 0 + off.z ),
			new THREE.Vector3( -0.5 + off.x,  0.5 + off.y + 1, 0 + off.z ),
		] },
	];
	
	function uv(x, y) { return new THREE.Vector2(x, y); }
}
inherits(CharacterPlaneGeometry, THREE.Geometry);

//////////////////////////////////////////////////////////////////////////////////////



function BubbleSprite() {
	if (!(this instanceof BubbleSprite)) {
		return new BubbleSprite();
	}
	
	//TODO replace with geometry we can control
	// var geom = new THREE.PlaneBufferGeometry(1, 1);
	var geom = new BubblePlaneGeometry(new THREE.Vector3(0, 0, 0));
	
	
	var tex = this._tex = new THREE.Texture();
	tex.magFilter = THREE.NearestFilter;
	tex.minFilter = THREE.NearestFilter;
	tex.anisotropy = 1;
	tex.generateMipmaps = false;
	tex.repeat = new THREE.Vector2(16/128, 16/64);
	tex.offset = new THREE.Vector2(0, 0);
	
	var img = new Image();
	function f(){
		tex.image = img;
		tex.needsUpdate = true;
		img.removeEventListener("load", f);
	}
	img.on("load", f);
	
	img.src = BASEURL+"/img/ui/emote_bubble.png";
	
	var mat = this._mat = new CharacterSpriteMaterial({
		map: tex,
		morphTargets: true,
		transparent: true,
		alphaTest: 0.05,
	});
	mat.uniforms.zoffset.value = -0.02;
	
	
	THREE.Mesh.call(this, geom, mat);
	this.type = "BubbleSprite";
	
	mat.scale = mat.uniforms.scale.value = this.scale;
	
	Object.defineProperties(this, {
		xoff: {
			get: function() {
				return Math.floor((this.morphTargetInfluences[0] + 1) * 32);
			},
			set: function(val) {
				this.morphTargetInfluences[0] = (val / 32) - 1;
			},
		},
		height: {
			get: function() {
				return Math.floor((this.morphTargetInfluences[1] + 1) * 32);
			},
			set: function(val) {
				this.morphTargetInfluences[1] = (val / 32) - 1;
			},
		},
		shrink: {
			get: function() {
				return (this.morphTargetInfluences[2]);
			},
			set: function(val) {
				this.morphTargetInfluences[2] = Math.clamp(val);
			},
		},
	});
	this.shrink = 1;
}
inherits(BubbleSprite, THREE.Mesh);
extend(BubbleSprite.prototype, {
	_tex: null,
	_mat: null,
	type: null,
	__types : {	//	 x1 y1 x2 y2
		"blank":	[ 0, 0, 0, 0],
		"...": 		[ 0, 3, 1, 3],
		"!": 		[ 0, 2, 1, 2], "exclaim" : "!",
		"?": 		[ 0, 1, 1, 1], "question": "?",
		"sing": 	[ 2, 3, 3, 3],
		"<3": 		[ 2, 2, 3, 2], "heart": "<3",
		"posion": 	[ 2, 1, 3, 1],
		":)": 		[ 4, 3, 5, 3], "happy": ":)",
		":D": 		[ 4, 2, 5, 2], "excited": ":D",
		":(": 		[ 4, 1, 5, 1], "sad": ":(",
		">:(":		[ 6, 3, 7, 3], "disagree": ">:(",
		"D:<": 		[ 6, 2, 7, 2], "angry": "D:<",
		">:)": 		[ 6, 1, 7, 1], "evil": ">:)",
	},
	
	setType : function(type) {
		this.type = this.__types[type];
		while (this.type && !$.isArray(this.type)) {
			this.type = this.__types[this.type];
		}
		if (!this.type) {
			this.type = this.__types["blank"];
			this.timeout = 1;
		}
		this._alpha = 0;
		this._frameno = 0;
		this._tick(0);
	},
	
	setTimeout: function(to) {
		this.timeout = to;
	},
	
	_show_callback: null,
	_hide_callback: null,
	_opacity_dest: 0,
	_opacity_curr: 0,
	show: function(callback) {
		// this.visible = true;
		this._opacity_dest = 1;
		this._show_callback = callback;
	},
	hide: function(callback) {
		// this.visible = false;
		this._opacity_dest = 0;
		this._show_callback = callback;
	},
	
	_alpha: 0,
	_frameno: 0,
	_tick: function(delta) {
		if (!this.type) return;
		var self = this;
		this._alpha -= delta;
		
		if (this.timeout > 0) {
			this.timeout -= delta;
			if (this.timeout < 0) {
				this.hide(function(){
					self.release();
				});
			}
		}
		
		if (this._opacity_curr > this._opacity_dest) {
			this._opacity_curr -= (delta * CONFIG.speed.bubblepop);
			this.shrink = 1-this._opacity_curr;
			this._mat.opacity = Math.clamp(this._opacity_curr);
			if (this._opacity_curr <= this._opacity_dest) {
				if (this._hide_callback) {
					this._hide_callback();
					this._hide_callback = null;
				}
				this._opacity_curr = Math.clamp(this._opacity_curr);
			}
		}
		else if (this._opacity_curr < this._opacity_dest) {
			this._opacity_curr += (delta * CONFIG.speed.bubblepop);
			this.shrink = 1-this._opacity_curr;
			this._mat.opacity = Math.clamp(this._opacity_curr);
			if (this._opacity_curr >= this._opacity_dest) {
				if (this._show_callback) {
					this._show_callback();
					this._show_callback = null;
				}
				this._opacity_curr = Math.clamp(this._opacity_curr);
			}
		}
		
		if (this._alpha <= 0) {
			this._alpha = 5;
			
			this._frameno = (this._frameno + 1) % 2;
			var fn = this._frameno * 2;
			
			this._tex.offset.x = this.type[fn  ] * this._tex.repeat.x;
			this._tex.offset.y = this.type[fn+1] * this._tex.repeat.y;
		}
	},
});
module.exports.BubbleSprite = BubbleSprite;


function BubblePlaneGeometry(off) {
	THREE.Geometry.call(this);
	var BSIZE = 0.38;
	
	this.type = "BubblePlaneGeometry";
	this.vertices = [
		new THREE.Vector3( -BSIZE + off.x, 1.5 - BSIZE + off.y, -0.01 + off.z ),
		new THREE.Vector3(  BSIZE + off.x, 1.5 - BSIZE + off.y, -0.01 + off.z ),
		new THREE.Vector3(  BSIZE + off.x, 1.5 + BSIZE + off.y, -0.01 + off.z ),
		new THREE.Vector3( -BSIZE + off.x, 1.5 + BSIZE + off.y, -0.01 + off.z ),
	];
	
	this.faces.push(new THREE.Face3(0, 1, 2));
	this.faces.push(new THREE.Face3(0, 2, 3));
	
	this.faceVertexUvs[0].push([ uv(0.005, 0.005), uv(0.995, 0.005), uv(0.995, 0.995) ]);
	this.faceVertexUvs[0].push([ uv(0.005, 0.005), uv(0.995, 0.995), uv(0.005, 0.995) ]);
	
	this.morphTargets = [
		{ name: "offx", vertices: [
			new THREE.Vector3( -BSIZE + off.x + 1, 1 - BSIZE + off.y, -0.01 + off.z ),
			new THREE.Vector3(  BSIZE + off.x + 1, 1 - BSIZE + off.y, -0.01 + off.z ),
			new THREE.Vector3(  BSIZE + off.x + 1, 1 + BSIZE + off.y, -0.01 + off.z ),
			new THREE.Vector3( -BSIZE + off.x + 1, 1 + BSIZE + off.y, -0.01 + off.z ),
		] },
		{ name: "height", vertices: [
			new THREE.Vector3( -BSIZE + off.x, 1 - BSIZE + off.y + 1, -0.01 + off.z ),
			new THREE.Vector3(  BSIZE + off.x, 1 - BSIZE + off.y + 1, -0.01 + off.z ),
			new THREE.Vector3(  BSIZE + off.x, 1 + BSIZE + off.y + 1, -0.01 + off.z ),
			new THREE.Vector3( -BSIZE + off.x, 1 + BSIZE + off.y + 1, -0.01 + off.z ),
		] },
		{ name: "shrink", vertices: [
			new THREE.Vector3( off.x, 1 + off.y, -0.01 + off.z ),
			new THREE.Vector3( off.x, 1 + off.y, -0.01 + off.z ),
			new THREE.Vector3( off.x, 1 + off.y, -0.01 + off.z ),
			new THREE.Vector3( off.x, 1 + off.y, -0.01 + off.z ),
		] },
	];
	
	function uv(x, y) { return new THREE.Vector2(x, y); }
}
inherits(BubblePlaneGeometry, THREE.Geometry);


//////////////////////////////////////////////////////////////////////////////////


function SpriteGlowMaterial(opts) {
	if (!(this instanceof SpriteGlowMaterial)) {
		return new SpriteGlowMaterial(opts);
	}
	
	//TODO write it so when we replace the values here, we replace the ones in the uniforms
	// Object.defineProperties(this, {
	// 	uvOffset : {}
	// });

	this.color = (opts.color instanceof THREE.Color)? opts.color : new THREE.Color(opts.color);
	// this.opacity = opts.opacity || 1;
	
	var params = this._createMatParams(opts);
	THREE.ShaderMaterial.call(this, params);
	this.type = "SpriteGlowMaterial";
	
	this.transparent = (opts.transparent !== undefined)? opts.transparent : true;
	this.alphaTest = 0.05;
	// this.depthWrite = false;
}
inherits(SpriteGlowMaterial, THREE.ShaderMaterial);
extend(SpriteGlowMaterial.prototype, {
	map : null,
	
	_createMatParams : function() {
		var params = {
			uniforms : {
				"c":   { type: "f", value: 1.0 },
				"p":   { type: "f", value: 1.4 },
				glowColor: { type: "c", value: this.color },//new THREE.Color(0xffff00) },
				// viewVector: { type: "v3", value: camera.position }
			},
		};
		
		params.vertexShader = this._vertShader;
		params.fragmentShader = this._fragShader;
		params.blending = THREE.AdditiveBlending;
		return params;
	},
	
	_vertShader: [
		// "uniform vec3 viewVector;",
		"uniform float c;",
		"uniform float p;",
		"varying float intensity;",
		
		"void main() {",
			"vec3 vNorm = normalize( normalMatrix * normal );",
			// "vec3 vNormCamera = normalize( normalMatrix * viewVector );",
			"vec3 vNormCamera = normalize( normalMatrix * normalize( modelViewMatrix * vec4(0, 0, 1, 1) ).xyz );",
			"intensity = pow( c - dot(vNorm, vNormCamera), p );",
			
			"gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",
		"}",
	].join("\n"),
	
	_fragShader: [
		"uniform vec3 glowColor;",
		"varying float intensity;",
		
		"void main() {",
			"vec3 glow = glowColor * intensity;",
			"gl_FragColor = vec4( glow, 1.0 );",
		"}",
	].join("\n"),
});
module.exports.SpriteGlowMaterial = SpriteGlowMaterial;

},{"extend":"extend","inherits":"inherits"}],"tpp-test-gallery":[function(require,module,exports){
// tGallery.js
// Defines the base event that actors have in the tGallery test map.

var inherits = require("inherits");
var extend = require("extend");

var Actor = require("tpp-actor");
var MeanderBehav = require("tpp-behavior").Meander;
var TalkingBehav = require("tpp-behavior").Talking;

function ActorGala(base, ext) {
	ext = extend({
		location: "rand",
		onEvents: {
			interacted: function() {
				var self = this;
				$("#statusbar").html("This is "+this.name+"! ("+this.id+")<br/>This sprite was created by "+this.sprite_creator+"!");
				var dlog = self.dialog || [
					""+this.name+" waves at you in greeting before continuing to meander about the Gallery."
				];
				
				// UI.showTextBox(self.dialog_type, dlog, { complete: function(){
				// 	self.behaviorStack.pop();
				// }});
				// self.behaviorStack.push(TalkingBehav);
				
				self.behaviorStack.push(new TalkingBehav({
					dialog: dlog,
					dialog_type: self.dialog_type,
					owner: self,
				}));
			},
		},
		
		dialog_type: "text",
		dialog: null,
		
		behaviorStack: [new MeanderBehav()],
		
		shouldAppear: function() { return true; },
		
	}, ext);
	Actor.call(this, base, ext);
}
inherits(ActorGala, Actor);


module.exports = ActorGala;
},{"extend":"extend","inherits":"inherits","tpp-actor":"tpp-actor","tpp-behavior":"tpp-behavior"}],"tpp-trigger":[function(require,module,exports){
// trigger.js
// Defines a trigger tile(s) used throughout the park

var Event = require("tpp-event");
var inherits = require("inherits");
var extend = require("extend");

/**
 * A trigger is a tile that, when stepped upon, will trigger some event.
 * The most common event tiggered is a warping to another map, for which
 * the subclass Warp is designed for.
 *
 * Triggers may take up more than one space.
 */
function Trigger(base, opts) {
	Event.call(this, base, opts);
	
	this.on("entered-tile", this.onTriggerEnter);
	this.on("leaving-tile", this.onTriggerLeave);
}
inherits(Trigger, Event);
extend(Trigger.prototype, {
	
	onTriggerEnter : function(dir) {
		console.log("Triggered!");
	},
	onTriggerLeave : function(dir) {
		
	},
});
module.exports = Trigger;

},{"extend":"extend","inherits":"inherits","tpp-event":"tpp-event"}],"tpp-warp":[function(require,module,exports){
// warp.js
// Defines a warp tile used throughout the park.

var Trigger = require("tpp-trigger");
var inherits = require("inherits");
var extend = require("extend");

/**
 * A warp is an event that, when walked upon, will take the player to another map or
 * area within the same map. Different types of warps exist, ranging from the standard
 * door warp to the teleport warp. Warps can be told to activate upon stepping upon them
 * or activate upon stepping off a certain direction.
 */
function Warp(base, opts) {
	Trigger.call(this, base, opts);
	
}
inherits(Warp, Trigger);
extend(Warp.prototype, {
	sound: "exit_walk",
	exit_to: null,
	
	onTriggerEnter : function(dir) {
		SoundManager.playSound(this.sound);
		if (!this.exit_to) return;
		MapManager.transitionTo(this.exit_to.map, this.exit_to.warp);
	},
});
module.exports = Warp;
},{"extend":"extend","inherits":"inherits","tpp-trigger":"tpp-trigger"}]},{},[])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlc1xcYnJvd3NlcmlmeVxcbm9kZV9tb2R1bGVzXFxicm93c2VyLXBhY2tcXF9wcmVsdWRlLmpzIiwibm9kZV9tb2R1bGVzXFxicm93c2VyaWZ5XFxub2RlX21vZHVsZXNcXGV2ZW50c1xcZXZlbnRzLmpzIiwibm9kZV9tb2R1bGVzXFxleHRlbmRcXGluZGV4LmpzIiwibm9kZV9tb2R1bGVzXFxpbmhlcml0c1xcaW5oZXJpdHNfYnJvd3Nlci5qcyIsInNyY1xcanNcXGV2ZW50c1xcYWN0b3JfYW5pbWF0aW9ucyIsInNyY1xcanNcXGV2ZW50c1xcYWN0b3IiLCJzcmNcXGpzXFxldmVudHNcXGJlaGF2aW9yIiwic3JjXFxqc1xcbWFuYWdlcnNcXGNvbnRyb2xsZXIiLCJzcmNcXGpzXFxldmVudHNcXGV2ZW50Iiwic3JjXFxqc1xcZXZlbnRzXFxwbGF5ZXItY2hhcmFjdGVyIiwic3JjXFxqc1xcbW9kZWxcXHNwcml0ZW1vZGVsIiwic3JjXFxqc1xcZXZlbnRzXFx0R2FsbGVyeSIsInNyY1xcanNcXGV2ZW50c1xcdHJpZ2dlciIsInNyY1xcanNcXGV2ZW50c1xcd2FycCJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN1NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN1NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2b0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3TUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzT0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuZnVuY3Rpb24gRXZlbnRFbWl0dGVyKCkge1xuICB0aGlzLl9ldmVudHMgPSB0aGlzLl9ldmVudHMgfHwge307XG4gIHRoaXMuX21heExpc3RlbmVycyA9IHRoaXMuX21heExpc3RlbmVycyB8fCB1bmRlZmluZWQ7XG59XG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50RW1pdHRlcjtcblxuLy8gQmFja3dhcmRzLWNvbXBhdCB3aXRoIG5vZGUgMC4xMC54XG5FdmVudEVtaXR0ZXIuRXZlbnRFbWl0dGVyID0gRXZlbnRFbWl0dGVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9ldmVudHMgPSB1bmRlZmluZWQ7XG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9tYXhMaXN0ZW5lcnMgPSB1bmRlZmluZWQ7XG5cbi8vIEJ5IGRlZmF1bHQgRXZlbnRFbWl0dGVycyB3aWxsIHByaW50IGEgd2FybmluZyBpZiBtb3JlIHRoYW4gMTAgbGlzdGVuZXJzIGFyZVxuLy8gYWRkZWQgdG8gaXQuIFRoaXMgaXMgYSB1c2VmdWwgZGVmYXVsdCB3aGljaCBoZWxwcyBmaW5kaW5nIG1lbW9yeSBsZWFrcy5cbkV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzID0gMTA7XG5cbi8vIE9idmlvdXNseSBub3QgYWxsIEVtaXR0ZXJzIHNob3VsZCBiZSBsaW1pdGVkIHRvIDEwLiBUaGlzIGZ1bmN0aW9uIGFsbG93c1xuLy8gdGhhdCB0byBiZSBpbmNyZWFzZWQuIFNldCB0byB6ZXJvIGZvciB1bmxpbWl0ZWQuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnNldE1heExpc3RlbmVycyA9IGZ1bmN0aW9uKG4pIHtcbiAgaWYgKCFpc051bWJlcihuKSB8fCBuIDwgMCB8fCBpc05hTihuKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ24gbXVzdCBiZSBhIHBvc2l0aXZlIG51bWJlcicpO1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSBuO1xuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGVyLCBoYW5kbGVyLCBsZW4sIGFyZ3MsIGksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBJZiB0aGVyZSBpcyBubyAnZXJyb3InIGV2ZW50IGxpc3RlbmVyIHRoZW4gdGhyb3cuXG4gIGlmICh0eXBlID09PSAnZXJyb3InKSB7XG4gICAgaWYgKCF0aGlzLl9ldmVudHMuZXJyb3IgfHxcbiAgICAgICAgKGlzT2JqZWN0KHRoaXMuX2V2ZW50cy5lcnJvcikgJiYgIXRoaXMuX2V2ZW50cy5lcnJvci5sZW5ndGgpKSB7XG4gICAgICBlciA9IGFyZ3VtZW50c1sxXTtcbiAgICAgIGlmIChlciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgIHRocm93IGVyOyAvLyBVbmhhbmRsZWQgJ2Vycm9yJyBldmVudFxuICAgICAgfVxuICAgICAgdGhyb3cgVHlwZUVycm9yKCdVbmNhdWdodCwgdW5zcGVjaWZpZWQgXCJlcnJvclwiIGV2ZW50LicpO1xuICAgIH1cbiAgfVxuXG4gIGhhbmRsZXIgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzVW5kZWZpbmVkKGhhbmRsZXIpKVxuICAgIHJldHVybiBmYWxzZTtcblxuICBpZiAoaXNGdW5jdGlvbihoYW5kbGVyKSkge1xuICAgIHN3aXRjaCAoYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgLy8gZmFzdCBjYXNlc1xuICAgICAgY2FzZSAxOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAyOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDM6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgLy8gc2xvd2VyXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgICAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgICAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIGhhbmRsZXIuYXBwbHkodGhpcywgYXJncyk7XG4gICAgfVxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGhhbmRsZXIpKSB7XG4gICAgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuXG4gICAgbGlzdGVuZXJzID0gaGFuZGxlci5zbGljZSgpO1xuICAgIGxlbiA9IGxpc3RlbmVycy5sZW5ndGg7XG4gICAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKVxuICAgICAgbGlzdGVuZXJzW2ldLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIG07XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIFRvIGF2b2lkIHJlY3Vyc2lvbiBpbiB0aGUgY2FzZSB0aGF0IHR5cGUgPT09IFwibmV3TGlzdGVuZXJcIiEgQmVmb3JlXG4gIC8vIGFkZGluZyBpdCB0byB0aGUgbGlzdGVuZXJzLCBmaXJzdCBlbWl0IFwibmV3TGlzdGVuZXJcIi5cbiAgaWYgKHRoaXMuX2V2ZW50cy5uZXdMaXN0ZW5lcilcbiAgICB0aGlzLmVtaXQoJ25ld0xpc3RlbmVyJywgdHlwZSxcbiAgICAgICAgICAgICAgaXNGdW5jdGlvbihsaXN0ZW5lci5saXN0ZW5lcikgP1xuICAgICAgICAgICAgICBsaXN0ZW5lci5saXN0ZW5lciA6IGxpc3RlbmVyKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAvLyBPcHRpbWl6ZSB0aGUgY2FzZSBvZiBvbmUgbGlzdGVuZXIuIERvbid0IG5lZWQgdGhlIGV4dHJhIGFycmF5IG9iamVjdC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBsaXN0ZW5lcjtcbiAgZWxzZSBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICAvLyBJZiB3ZSd2ZSBhbHJlYWR5IGdvdCBhbiBhcnJheSwganVzdCBhcHBlbmQuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdLnB1c2gobGlzdGVuZXIpO1xuICBlbHNlXG4gICAgLy8gQWRkaW5nIHRoZSBzZWNvbmQgZWxlbWVudCwgbmVlZCB0byBjaGFuZ2UgdG8gYXJyYXkuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gW3RoaXMuX2V2ZW50c1t0eXBlXSwgbGlzdGVuZXJdO1xuXG4gIC8vIENoZWNrIGZvciBsaXN0ZW5lciBsZWFrXG4gIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pICYmICF0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkKSB7XG4gICAgdmFyIG07XG4gICAgaWYgKCFpc1VuZGVmaW5lZCh0aGlzLl9tYXhMaXN0ZW5lcnMpKSB7XG4gICAgICBtID0gdGhpcy5fbWF4TGlzdGVuZXJzO1xuICAgIH0gZWxzZSB7XG4gICAgICBtID0gRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnM7XG4gICAgfVxuXG4gICAgaWYgKG0gJiYgbSA+IDAgJiYgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCA+IG0pIHtcbiAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQgPSB0cnVlO1xuICAgICAgY29uc29sZS5lcnJvcignKG5vZGUpIHdhcm5pbmc6IHBvc3NpYmxlIEV2ZW50RW1pdHRlciBtZW1vcnkgJyArXG4gICAgICAgICAgICAgICAgICAgICdsZWFrIGRldGVjdGVkLiAlZCBsaXN0ZW5lcnMgYWRkZWQuICcgK1xuICAgICAgICAgICAgICAgICAgICAnVXNlIGVtaXR0ZXIuc2V0TWF4TGlzdGVuZXJzKCkgdG8gaW5jcmVhc2UgbGltaXQuJyxcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCk7XG4gICAgICBpZiAodHlwZW9mIGNvbnNvbGUudHJhY2UgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgLy8gbm90IHN1cHBvcnRlZCBpbiBJRSAxMFxuICAgICAgICBjb25zb2xlLnRyYWNlKCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbmNlID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIHZhciBmaXJlZCA9IGZhbHNlO1xuXG4gIGZ1bmN0aW9uIGcoKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBnKTtcblxuICAgIGlmICghZmlyZWQpIHtcbiAgICAgIGZpcmVkID0gdHJ1ZTtcbiAgICAgIGxpc3RlbmVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICB9XG5cbiAgZy5saXN0ZW5lciA9IGxpc3RlbmVyO1xuICB0aGlzLm9uKHR5cGUsIGcpO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLy8gZW1pdHMgYSAncmVtb3ZlTGlzdGVuZXInIGV2ZW50IGlmZiB0aGUgbGlzdGVuZXIgd2FzIHJlbW92ZWRcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbGlzdCwgcG9zaXRpb24sIGxlbmd0aCwgaTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXR1cm4gdGhpcztcblxuICBsaXN0ID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuICBsZW5ndGggPSBsaXN0Lmxlbmd0aDtcbiAgcG9zaXRpb24gPSAtMTtcblxuICBpZiAobGlzdCA9PT0gbGlzdGVuZXIgfHxcbiAgICAgIChpc0Z1bmN0aW9uKGxpc3QubGlzdGVuZXIpICYmIGxpc3QubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG5cbiAgfSBlbHNlIGlmIChpc09iamVjdChsaXN0KSkge1xuICAgIGZvciAoaSA9IGxlbmd0aDsgaS0tID4gMDspIHtcbiAgICAgIGlmIChsaXN0W2ldID09PSBsaXN0ZW5lciB8fFxuICAgICAgICAgIChsaXN0W2ldLmxpc3RlbmVyICYmIGxpc3RbaV0ubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgICAgICBwb3NpdGlvbiA9IGk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChwb3NpdGlvbiA8IDApXG4gICAgICByZXR1cm4gdGhpcztcblxuICAgIGlmIChsaXN0Lmxlbmd0aCA9PT0gMSkge1xuICAgICAgbGlzdC5sZW5ndGggPSAwO1xuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGlzdC5zcGxpY2UocG9zaXRpb24sIDEpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUFsbExpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGtleSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIC8vIG5vdCBsaXN0ZW5pbmcgZm9yIHJlbW92ZUxpc3RlbmVyLCBubyBuZWVkIHRvIGVtaXRcbiAgaWYgKCF0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMClcbiAgICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIGVsc2UgaWYgKHRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvLyBlbWl0IHJlbW92ZUxpc3RlbmVyIGZvciBhbGwgbGlzdGVuZXJzIG9uIGFsbCBldmVudHNcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICBmb3IgKGtleSBpbiB0aGlzLl9ldmVudHMpIHtcbiAgICAgIGlmIChrZXkgPT09ICdyZW1vdmVMaXN0ZW5lcicpIGNvbnRpbnVlO1xuICAgICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoa2V5KTtcbiAgICB9XG4gICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoJ3JlbW92ZUxpc3RlbmVyJyk7XG4gICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBsaXN0ZW5lcnMgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzRnVuY3Rpb24obGlzdGVuZXJzKSkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBMSUZPIG9yZGVyXG4gICAgd2hpbGUgKGxpc3RlbmVycy5sZW5ndGgpXG4gICAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVyc1tsaXN0ZW5lcnMubGVuZ3RoIC0gMV0pO1xuICB9XG4gIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSBbXTtcbiAgZWxzZSBpZiAoaXNGdW5jdGlvbih0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IFt0aGlzLl9ldmVudHNbdHlwZV1dO1xuICBlbHNlXG4gICAgcmV0ID0gdGhpcy5fZXZlbnRzW3R5cGVdLnNsaWNlKCk7XG4gIHJldHVybiByZXQ7XG59O1xuXG5FdmVudEVtaXR0ZXIubGlzdGVuZXJDb3VudCA9IGZ1bmN0aW9uKGVtaXR0ZXIsIHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCFlbWl0dGVyLl9ldmVudHMgfHwgIWVtaXR0ZXIuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSAwO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKGVtaXR0ZXIuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gMTtcbiAgZWxzZVxuICAgIHJldCA9IGVtaXR0ZXIuX2V2ZW50c1t0eXBlXS5sZW5ndGg7XG4gIHJldHVybiByZXQ7XG59O1xuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Z1bmN0aW9uJztcbn1cblxuZnVuY3Rpb24gaXNOdW1iZXIoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnbnVtYmVyJztcbn1cblxuZnVuY3Rpb24gaXNPYmplY3QoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiBhcmcgIT09IG51bGw7XG59XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09PSB2b2lkIDA7XG59XG4iLCJ2YXIgaGFzT3duID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcbnZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG52YXIgdW5kZWZpbmVkO1xuXG52YXIgaXNQbGFpbk9iamVjdCA9IGZ1bmN0aW9uIGlzUGxhaW5PYmplY3Qob2JqKSB7XG5cdCd1c2Ugc3RyaWN0Jztcblx0aWYgKCFvYmogfHwgdG9TdHJpbmcuY2FsbChvYmopICE9PSAnW29iamVjdCBPYmplY3RdJykge1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXG5cdHZhciBoYXNfb3duX2NvbnN0cnVjdG9yID0gaGFzT3duLmNhbGwob2JqLCAnY29uc3RydWN0b3InKTtcblx0dmFyIGhhc19pc19wcm9wZXJ0eV9vZl9tZXRob2QgPSBvYmouY29uc3RydWN0b3IgJiYgb2JqLmNvbnN0cnVjdG9yLnByb3RvdHlwZSAmJiBoYXNPd24uY2FsbChvYmouY29uc3RydWN0b3IucHJvdG90eXBlLCAnaXNQcm90b3R5cGVPZicpO1xuXHQvLyBOb3Qgb3duIGNvbnN0cnVjdG9yIHByb3BlcnR5IG11c3QgYmUgT2JqZWN0XG5cdGlmIChvYmouY29uc3RydWN0b3IgJiYgIWhhc19vd25fY29uc3RydWN0b3IgJiYgIWhhc19pc19wcm9wZXJ0eV9vZl9tZXRob2QpIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblxuXHQvLyBPd24gcHJvcGVydGllcyBhcmUgZW51bWVyYXRlZCBmaXJzdGx5LCBzbyB0byBzcGVlZCB1cCxcblx0Ly8gaWYgbGFzdCBvbmUgaXMgb3duLCB0aGVuIGFsbCBwcm9wZXJ0aWVzIGFyZSBvd24uXG5cdHZhciBrZXk7XG5cdGZvciAoa2V5IGluIG9iaikge31cblxuXHRyZXR1cm4ga2V5ID09PSB1bmRlZmluZWQgfHwgaGFzT3duLmNhbGwob2JqLCBrZXkpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBleHRlbmQoKSB7XG5cdCd1c2Ugc3RyaWN0Jztcblx0dmFyIG9wdGlvbnMsIG5hbWUsIHNyYywgY29weSwgY29weUlzQXJyYXksIGNsb25lLFxuXHRcdHRhcmdldCA9IGFyZ3VtZW50c1swXSxcblx0XHRpID0gMSxcblx0XHRsZW5ndGggPSBhcmd1bWVudHMubGVuZ3RoLFxuXHRcdGRlZXAgPSBmYWxzZTtcblxuXHQvLyBIYW5kbGUgYSBkZWVwIGNvcHkgc2l0dWF0aW9uXG5cdGlmICh0eXBlb2YgdGFyZ2V0ID09PSAnYm9vbGVhbicpIHtcblx0XHRkZWVwID0gdGFyZ2V0O1xuXHRcdHRhcmdldCA9IGFyZ3VtZW50c1sxXSB8fCB7fTtcblx0XHQvLyBza2lwIHRoZSBib29sZWFuIGFuZCB0aGUgdGFyZ2V0XG5cdFx0aSA9IDI7XG5cdH0gZWxzZSBpZiAoKHR5cGVvZiB0YXJnZXQgIT09ICdvYmplY3QnICYmIHR5cGVvZiB0YXJnZXQgIT09ICdmdW5jdGlvbicpIHx8IHRhcmdldCA9PSBudWxsKSB7XG5cdFx0dGFyZ2V0ID0ge307XG5cdH1cblxuXHRmb3IgKDsgaSA8IGxlbmd0aDsgKytpKSB7XG5cdFx0b3B0aW9ucyA9IGFyZ3VtZW50c1tpXTtcblx0XHQvLyBPbmx5IGRlYWwgd2l0aCBub24tbnVsbC91bmRlZmluZWQgdmFsdWVzXG5cdFx0aWYgKG9wdGlvbnMgIT0gbnVsbCkge1xuXHRcdFx0Ly8gRXh0ZW5kIHRoZSBiYXNlIG9iamVjdFxuXHRcdFx0Zm9yIChuYW1lIGluIG9wdGlvbnMpIHtcblx0XHRcdFx0c3JjID0gdGFyZ2V0W25hbWVdO1xuXHRcdFx0XHRjb3B5ID0gb3B0aW9uc1tuYW1lXTtcblxuXHRcdFx0XHQvLyBQcmV2ZW50IG5ldmVyLWVuZGluZyBsb29wXG5cdFx0XHRcdGlmICh0YXJnZXQgPT09IGNvcHkpIHtcblx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIFJlY3Vyc2UgaWYgd2UncmUgbWVyZ2luZyBwbGFpbiBvYmplY3RzIG9yIGFycmF5c1xuXHRcdFx0XHRpZiAoZGVlcCAmJiBjb3B5ICYmIChpc1BsYWluT2JqZWN0KGNvcHkpIHx8IChjb3B5SXNBcnJheSA9IEFycmF5LmlzQXJyYXkoY29weSkpKSkge1xuXHRcdFx0XHRcdGlmIChjb3B5SXNBcnJheSkge1xuXHRcdFx0XHRcdFx0Y29weUlzQXJyYXkgPSBmYWxzZTtcblx0XHRcdFx0XHRcdGNsb25lID0gc3JjICYmIEFycmF5LmlzQXJyYXkoc3JjKSA/IHNyYyA6IFtdO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRjbG9uZSA9IHNyYyAmJiBpc1BsYWluT2JqZWN0KHNyYykgPyBzcmMgOiB7fTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHQvLyBOZXZlciBtb3ZlIG9yaWdpbmFsIG9iamVjdHMsIGNsb25lIHRoZW1cblx0XHRcdFx0XHR0YXJnZXRbbmFtZV0gPSBleHRlbmQoZGVlcCwgY2xvbmUsIGNvcHkpO1xuXG5cdFx0XHRcdC8vIERvbid0IGJyaW5nIGluIHVuZGVmaW5lZCB2YWx1ZXNcblx0XHRcdFx0fSBlbHNlIGlmIChjb3B5ICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0XHR0YXJnZXRbbmFtZV0gPSBjb3B5O1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0Ly8gUmV0dXJuIHRoZSBtb2RpZmllZCBvYmplY3Rcblx0cmV0dXJuIHRhcmdldDtcbn07XG5cbiIsImlmICh0eXBlb2YgT2JqZWN0LmNyZWF0ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAvLyBpbXBsZW1lbnRhdGlvbiBmcm9tIHN0YW5kYXJkIG5vZGUuanMgJ3V0aWwnIG1vZHVsZVxuICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGluaGVyaXRzKGN0b3IsIHN1cGVyQ3Rvcikge1xuICAgIGN0b3Iuc3VwZXJfID0gc3VwZXJDdG9yXG4gICAgY3Rvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHN1cGVyQ3Rvci5wcm90b3R5cGUsIHtcbiAgICAgIGNvbnN0cnVjdG9yOiB7XG4gICAgICAgIHZhbHVlOiBjdG9yLFxuICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgd3JpdGFibGU6IHRydWUsXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgICAgfVxuICAgIH0pO1xuICB9O1xufSBlbHNlIHtcbiAgLy8gb2xkIHNjaG9vbCBzaGltIGZvciBvbGQgYnJvd3NlcnNcbiAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpbmhlcml0cyhjdG9yLCBzdXBlckN0b3IpIHtcbiAgICBjdG9yLnN1cGVyXyA9IHN1cGVyQ3RvclxuICAgIHZhciBUZW1wQ3RvciA9IGZ1bmN0aW9uICgpIHt9XG4gICAgVGVtcEN0b3IucHJvdG90eXBlID0gc3VwZXJDdG9yLnByb3RvdHlwZVxuICAgIGN0b3IucHJvdG90eXBlID0gbmV3IFRlbXBDdG9yKClcbiAgICBjdG9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IGN0b3JcbiAgfVxufVxuIiwiLy8gYWN0b3JfYW5pbWF0aW9ucy5qc1xyXG4vLyBBIHN1Ym1vZHVsZSBmb3IgdGhlIEFjdG9yIGV2ZW50IGNsYXNzIHRoYXQgZGVhbHMgd2l0aCBhbmltYXRpb25zXHJcblxyXG52YXIgZXh0ZW5kID0gcmVxdWlyZShcImV4dGVuZFwiKTtcclxuXHJcbmZ1bmN0aW9uIGdldFNwcml0ZUZvcm1hdChzdHIpIHtcclxuXHR2YXIgZm9ybWF0ID0gc3RyLnNwbGl0KFwiLVwiKTtcclxuXHR2YXIgbmFtZSA9IGZvcm1hdFswXTtcclxuXHR2YXIgc2l6ZSA9IGZvcm1hdFsxXS5zcGxpdChcInhcIik7XHJcblx0c2l6ZVsxXSA9IHNpemVbMV0gfHwgc2l6ZVswXTtcclxuXHRcclxuXHR2YXIgYmFzZSA9IHtcclxuXHRcdHdpZHRoOiBzaXplWzBdLCBoZWlnaHQ6IHNpemVbMV0sIGZsaXA6IGZhbHNlLCBcclxuXHRcdC8vcmVwZWF0eDogMC4yNSwgcmVwZWF0eTogMC4yNSxcclxuXHRcdGZyYW1lczoge1xyXG5cdFx0XHRcInUzXCI6IFwidTBcIiwgXCJkM1wiOiBcImQwXCIsIFwibDNcIjogXCJsMFwiLCBcInIzXCI6IFwicjBcIixcclxuXHRcdH0sXHJcblx0XHRhbmltcyA6IGdldFN0YW5kYXJkQW5pbWF0aW9ucygpLFxyXG5cdH07XHJcblx0XHJcblx0c3dpdGNoIChuYW1lKSB7XHJcblx0XHRjYXNlIFwicHRfaG9yenJvd1wiOiBcclxuXHRcdFx0cmV0dXJuIGV4dGVuZCh0cnVlLCBiYXNlLCB7IFxyXG5cdFx0XHRcdGZyYW1lczoge1xyXG5cdFx0XHRcdFx0XCJ1MFwiOiBbMSwgMF0sIFwidTFcIjogWzEsIDFdLCBcInUyXCI6IFsxLCAyXSxcclxuXHRcdFx0XHRcdFwiZDBcIjogWzAsIDBdLCBcImQxXCI6IFswLCAxXSwgXCJkMlwiOiBbMCwgMl0sXHJcblx0XHRcdFx0XHRcImwwXCI6IFsyLCAwXSwgXCJsMVwiOiBbMiwgMV0sIFwibDJcIjogWzIsIDJdLFxyXG5cdFx0XHRcdFx0XCJyMFwiOiBbMywgMF0sIFwicjFcIjogWzMsIDFdLCBcInIyXCI6IFszLCAyXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9KTtcclxuXHRcdGNhc2UgXCJwdF92ZXJ0Y29sXCI6IFxyXG5cdFx0XHRyZXR1cm4gZXh0ZW5kKHRydWUsIGJhc2UsIHsgXHJcblx0XHRcdFx0ZnJhbWVzOiB7XHJcblx0XHRcdFx0XHRcInUwXCI6IFswLCAxXSwgXCJ1MVwiOiBbMSwgMV0sIFwidTJcIjogWzIsIDFdLFxyXG5cdFx0XHRcdFx0XCJkMFwiOiBbMCwgMF0sIFwiZDFcIjogWzEsIDBdLCBcImQyXCI6IFsyLCAwXSxcclxuXHRcdFx0XHRcdFwibDBcIjogWzAsIDJdLCBcImwxXCI6IFsxLCAyXSwgXCJsMlwiOiBbMiwgMl0sXHJcblx0XHRcdFx0XHRcInIwXCI6IFswLCAzXSwgXCJyMVwiOiBbMSwgM10sIFwicjJcIjogWzIsIDNdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH0pO1xyXG5cdFx0Y2FzZSBcImhnX3ZlcnRtaXhcIjogXHJcblx0XHRcdHJldHVybiBleHRlbmQodHJ1ZSwgYmFzZSwgeyBcclxuXHRcdFx0XHRmcmFtZXM6IHtcclxuXHRcdFx0XHRcdFwidTBcIjogWzAsIDBdLCBcInUxXCI6IFsxLCAzXSwgXCJ1MlwiOiBbMiwgMF0sXHJcblx0XHRcdFx0XHRcImQwXCI6IFsyLCAxXSwgXCJkMVwiOiBbMiwgMl0sIFwiZDJcIjogWzIsIDNdLFxyXG5cdFx0XHRcdFx0XCJsMFwiOiBbMCwgMl0sIFwibDFcIjogWzAsIDFdLCBcImwyXCI6IFswLCAzXSxcclxuXHRcdFx0XHRcdFwicjBcIjogWzEsIDBdLCBcInIxXCI6IFsxLCAxXSwgXCJyMlwiOiBbMSwgMl0sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fSk7XHJcblx0XHRjYXNlIFwiaGdfcG9rZXJvd1wiOlxyXG5cdFx0XHRyZXR1cm4gZXh0ZW5kKHRydWUsIGJhc2UsIHsgXHJcblx0XHRcdFx0ZnJhbWVzOiB7IC8vIHBvaW50ZXJzIHRvIGFub3RoZXIgaW1hZ2UgaW5kaWNhdGVzIHRoYXQgaW1hZ2Ugc2hvdWxkIGJlIGZsaXBwZWQsIGlmIGZsaXA9dHJ1ZVxyXG5cdFx0XHRcdFx0XCJ1MFwiOiBudWxsLCBcInUxXCI6IFswLCAwXSwgXCJ1MlwiOiBbMSwgMF0sXHJcblx0XHRcdFx0XHRcImQwXCI6IG51bGwsIFwiZDFcIjogWzAsIDFdLCBcImQyXCI6IFsxLCAxXSxcclxuXHRcdFx0XHRcdFwibDBcIjogbnVsbCwgXCJsMVwiOiBbMCwgMl0sIFwibDJcIjogWzEsIDJdLFxyXG5cdFx0XHRcdFx0XCJyMFwiOiBudWxsLCBcInIxXCI6IFswLCAzXSwgXCJyMlwiOiBbMSwgM10sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRhbmltczogZ2V0UG9rZW1vbkFuaW1hdGlvbnMoKSxcclxuXHRcdFx0fSk7XHJcblx0XHRjYXNlIFwiaGdfcG9rZXJvd19yZXZlcnNlXCI6XHJcblx0XHRcdHJldHVybiBleHRlbmQodHJ1ZSwgYmFzZSwgeyBcclxuXHRcdFx0XHRmcmFtZXM6IHsgLy8gcG9pbnRlcnMgdG8gYW5vdGhlciBpbWFnZSBpbmRpY2F0ZXMgdGhhdCBpbWFnZSBzaG91bGQgYmUgZmxpcHBlZCwgaWYgZmxpcD10cnVlXHJcblx0XHRcdFx0XHRcInUwXCI6IG51bGwsIFwidTFcIjogWzAsIDFdLCBcInUyXCI6IFsxLCAxXSxcclxuXHRcdFx0XHRcdFwiZDBcIjogbnVsbCwgXCJkMVwiOiBbMCwgMF0sIFwiZDJcIjogWzEsIDBdLFxyXG5cdFx0XHRcdFx0XCJsMFwiOiBudWxsLCBcImwxXCI6IFswLCAzXSwgXCJsMlwiOiBbMSwgM10sXHJcblx0XHRcdFx0XHRcInIwXCI6IG51bGwsIFwicjFcIjogWzAsIDJdLCBcInIyXCI6IFsxLCAyXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdGFuaW1zOiBnZXRQb2tlbW9uQW5pbWF0aW9ucygpLFxyXG5cdFx0XHR9KTtcclxuXHRcdGNhc2UgXCJoZ19wb2tlY29sXCI6XHJcblx0XHRcdHJldHVybiBleHRlbmQodHJ1ZSwgYmFzZSwgeyBcclxuXHRcdFx0XHRmcmFtZXM6IHsgLy8gcG9pbnRlcnMgdG8gYW5vdGhlciBpbWFnZSBpbmRpY2F0ZXMgdGhhdCBpbWFnZSBzaG91bGQgYmUgZmxpcHBlZCwgaWYgZmxpcD10cnVlXHJcblx0XHRcdFx0XHRcInUwXCI6IG51bGwsIFwidTFcIjogWzAsIDBdLCBcInUyXCI6IFswLCAxXSxcclxuXHRcdFx0XHRcdFwiZDBcIjogbnVsbCwgXCJkMVwiOiBbMCwgMl0sIFwiZDJcIjogWzAsIDNdLFxyXG5cdFx0XHRcdFx0XCJsMFwiOiBudWxsLCBcImwxXCI6IFsxLCAwXSwgXCJsMlwiOiBbMSwgMV0sXHJcblx0XHRcdFx0XHRcInIwXCI6IG51bGwsIFwicjFcIjogWzEsIDJdLCBcInIyXCI6IFsxLCAzXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdGFuaW1zOiBnZXRQb2tlbW9uQW5pbWF0aW9ucygpLFxyXG5cdFx0XHR9KTtcclxuXHRcdGNhc2UgXCJoZ19wb2tlX2hvcnpjb2xcIjpcclxuXHRcdFx0cmV0dXJuIGV4dGVuZCh0cnVlLCBiYXNlLCB7IFxyXG5cdFx0XHRcdGZyYW1lczogeyAvLyBwb2ludGVycyB0byBhbm90aGVyIGltYWdlIGluZGljYXRlcyB0aGF0IGltYWdlIHNob3VsZCBiZSBmbGlwcGVkLCBpZiBmbGlwPXRydWVcclxuXHRcdFx0XHRcdFwidTBcIjogbnVsbCwgXCJ1MVwiOiBbMSwgMF0sIFwidTJcIjogWzEsIDFdLFxyXG5cdFx0XHRcdFx0XCJkMFwiOiBudWxsLCBcImQxXCI6IFswLCAwXSwgXCJkMlwiOiBbMCwgMV0sXHJcblx0XHRcdFx0XHRcImwwXCI6IG51bGwsIFwibDFcIjogWzIsIDBdLCBcImwyXCI6IFsyLCAxXSxcclxuXHRcdFx0XHRcdFwicjBcIjogbnVsbCwgXCJyMVwiOiBbMywgMF0sIFwicjJcIjogWzMsIDFdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0YW5pbXM6IGdldFBva2Vtb25BbmltYXRpb25zKCksXHJcblx0XHRcdH0pO1xyXG5cdFx0Y2FzZSBcImhnX3Bva2VmbGlwXCI6XHJcblx0XHRcdHJldHVybiBleHRlbmQodHJ1ZSwgYmFzZSwgeyBcclxuXHRcdFx0XHRmcmFtZXM6IHsgLy8gcG9pbnRlcnMgdG8gYW5vdGhlciBpbWFnZSBpbmRpY2F0ZXMgdGhhdCBpbWFnZSBzaG91bGQgYmUgZmxpcHBlZCwgaWYgZmxpcD10cnVlXHJcblx0XHRcdFx0XHRcInUwXCI6IG51bGwsIFwidTFcIjogWzAsIDBdLCBcInUyXCI6IFsxLCAwXSxcclxuXHRcdFx0XHRcdFwiZDBcIjogbnVsbCwgXCJkMVwiOiBbMCwgMV0sIFwiZDJcIjogWzEsIDFdLFxyXG5cdFx0XHRcdFx0XCJsMFwiOiBudWxsLCBcImwxXCI6IFswLCAyXSwgXCJsMlwiOiBbMSwgMl0sXHJcblx0XHRcdFx0XHRcInIwXCI6IG51bGwsIFwicjFcIjogXCJsMVwiLCAgIFwicjJcIjogXCJsMlwiLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0YW5pbXM6IGdldFBva2Vtb25BbmltYXRpb25zKCksXHJcblx0XHRcdH0pO1xyXG5cdFx0Y2FzZSBcImJ3X3ZlcnRyb3dcIjpcclxuXHRcdFx0cmV0dXJuIGV4dGVuZCh0cnVlLCBiYXNlLCB7IFxyXG5cdFx0XHRcdGZyYW1lczoge1xyXG5cdFx0XHRcdFx0XCJ1MFwiOiBbMCwgMF0sIFwidTFcIjogWzEsIDBdLCBcInUyXCI6IFsyLCAwXSxcclxuXHRcdFx0XHRcdFwiZDBcIjogWzAsIDFdLCBcImQxXCI6IFsxLCAxXSwgXCJkMlwiOiBbMiwgMV0sXHJcblx0XHRcdFx0XHRcImwwXCI6IFswLCAyXSwgXCJsMVwiOiBbMSwgMl0sIFwibDJcIjogWzIsIDJdLFxyXG5cdFx0XHRcdFx0XCJyMFwiOiBbMCwgM10sIFwicjFcIjogWzEsIDNdLCBcInIyXCI6IFsyLCAzXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9KTtcclxuXHRcdGNhc2UgXCJid19ob3J6ZmxpcFwiOlxyXG5cdFx0XHRyZXR1cm4gZXh0ZW5kKHRydWUsIGJhc2UsIHsgXHJcblx0XHRcdFx0ZnJhbWVzOiB7IC8vIHBvaW50ZXJzIHRvIGFub3RoZXIgaW1hZ2UgaW5kaWNhdGVzIHRoYXQgaW1hZ2Ugc2hvdWxkIGJlIGZsaXBwZWQsIGlmIGZsaXA9dHJ1ZVxyXG5cdFx0XHRcdFx0XCJ1MFwiOiBbMCwgMF0sIFwidTFcIjogWzEsIDBdLCBcInUyXCI6IFwidTFcIixcclxuXHRcdFx0XHRcdFwiZDBcIjogWzIsIDBdLCBcImQxXCI6IFszLCAwXSwgXCJkMlwiOiBcImQxXCIsXHJcblx0XHRcdFx0XHRcImwwXCI6IFswLCAxXSwgXCJsMVwiOiBbMSwgMV0sIFwibDJcIjogWzIsIDFdLFxyXG5cdFx0XHRcdFx0XCJyMFwiOiBcImwwXCIsICAgXCJyMVwiOiBcImwxXCIsICAgXCJyMlwiOiBcImwyXCIsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fSk7XHJcblx0XHRkZWZhdWx0OlxyXG5cdFx0XHRjb25zb2xlLmVycm9yKFwiTm8gc3VjaCBTcHJpdGUgRm9ybWF0OlwiLCBuYW1lKTtcclxuXHRcdFx0cmV0dXJuIHt9O1xyXG5cdH1cclxufVxyXG5tb2R1bGUuZXhwb3J0cy5nZXRTcHJpdGVGb3JtYXQgPSBnZXRTcHJpdGVGb3JtYXQ7XHJcblxyXG5cclxuZnVuY3Rpb24gZ2V0U3RhbmRhcmRBbmltYXRpb25zKCkge1xyXG5cdHZhciBhbmltcyA9IHt9O1xyXG5cdFxyXG5cdGFuaW1zW1wic3RhbmRcIl0gPSBuZXcgU3ByaXRlQW5pbWF0aW9uKHsgc2luZ2xlRnJhbWU6IHRydWUsIH0sIFtcclxuXHRcdHsgdTogXCJ1MFwiLCBkOiBcImQwXCIsIGw6IFwibDBcIiwgcjogXCJyMFwiLCB0cmFuczogdHJ1ZSwgcGF1c2U6IHRydWUsIH0sXHJcblx0XSk7XHJcblx0YW5pbXNbXCJ3YWxrXCJdID0gbmV3IFNwcml0ZUFuaW1hdGlvbih7IGZyYW1lTGVuZ3RoOiA1LCBrZWVwRnJhbWU6IHRydWUsIH0sIFtcclxuXHRcdHsgdTogXCJ1MVwiLCBkOiBcImQxXCIsIGw6IFwibDFcIiwgcjogXCJyMVwiLCB9LFxyXG5cdFx0eyB1OiBcInUzXCIsIGQ6IFwiZDNcIiwgbDogXCJsM1wiLCByOiBcInIzXCIsIHRyYW5zOiB0cnVlLCB9LFxyXG5cdFx0eyB1OiBcInUyXCIsIGQ6IFwiZDJcIiwgbDogXCJsMlwiLCByOiBcInIyXCIsIH0sXHJcblx0XHR7IHU6IFwidTNcIiwgZDogXCJkM1wiLCBsOiBcImwzXCIsIHI6IFwicjNcIiwgdHJhbnM6IHRydWUsIGxvb3BUbzogMCwgfSxcclxuXHRdKTtcclxuXHRhbmltc1tcImJ1bXBcIl0gPSBuZXcgU3ByaXRlQW5pbWF0aW9uKHsgZnJhbWVMZW5ndGg6IDEwLCBrZWVwRnJhbWU6IHRydWUsIH0sIFtcclxuXHRcdHsgdTogXCJ1MVwiLCBkOiBcImQxXCIsIGw6IFwibDFcIiwgcjogXCJyMVwiLCBzZng6IFwid2Fsa19idW1wXCIsIH0sXHJcblx0XHR7IHU6IFwidTBcIiwgZDogXCJkMFwiLCBsOiBcImwwXCIsIHI6IFwicjBcIiwgdHJhbnM6IHRydWUsIH0sXHJcblx0XHR7IHU6IFwidTJcIiwgZDogXCJkMlwiLCBsOiBcImwyXCIsIHI6IFwicjJcIiwgc2Z4OiBcIndhbGtfYnVtcFwiLCB9LFxyXG5cdFx0eyB1OiBcInUwXCIsIGQ6IFwiZDBcIiwgbDogXCJsMFwiLCByOiBcInIwXCIsIHRyYW5zOiB0cnVlLCBsb29wVG86IDAsIH0sXHJcblx0XSk7XHJcblx0YW5pbXNbXCJ3YXJwX2F3YXlcIl0gPSBuZXcgU3ByaXRlQW5pbWF0aW9uKHsgc2luZ2xlRGlyOiBcImRcIiB9LCBbXHJcblx0XHR7IGQ6IFwiZDBcIiwgZnJhbWVMZW5ndGg6IDgsIH0sIC8vMFxyXG5cdFx0eyBkOiBcImwwXCIsIGZyYW1lTGVuZ3RoOiA4LCB9LFxyXG5cdFx0eyBkOiBcInUwXCIsIGZyYW1lTGVuZ3RoOiA4LCB9LFxyXG5cdFx0eyBkOiBcInIwXCIsIGZyYW1lTGVuZ3RoOiA4LCB9LFxyXG5cdFx0eyBkOiBcImQwXCIsIGZyYW1lTGVuZ3RoOiA3LCB9LCAvLzRcclxuXHRcdHsgZDogXCJsMFwiLCBmcmFtZUxlbmd0aDogNywgfSxcclxuXHRcdHsgZDogXCJ1MFwiLCBmcmFtZUxlbmd0aDogNywgfSxcclxuXHRcdHsgZDogXCJyMFwiLCBmcmFtZUxlbmd0aDogNywgfSxcclxuXHRcdHsgZDogXCJkMFwiLCBmcmFtZUxlbmd0aDogNSwgfSwgLy84XHJcblx0XHR7IGQ6IFwibDBcIiwgZnJhbWVMZW5ndGg6IDUsIH0sXHJcblx0XHR7IGQ6IFwidTBcIiwgZnJhbWVMZW5ndGg6IDUsIH0sXHJcblx0XHR7IGQ6IFwicjBcIiwgZnJhbWVMZW5ndGg6IDUsIH0sXHJcblx0XHR7IGQ6IFwiZDBcIiwgZnJhbWVMZW5ndGg6IDMsIH0sIC8vMTJcclxuXHRcdHsgZDogXCJsMFwiLCBmcmFtZUxlbmd0aDogMywgfSxcclxuXHRcdHsgZDogXCJ1MFwiLCBmcmFtZUxlbmd0aDogMywgfSxcclxuXHRcdHsgZDogXCJyMFwiLCBmcmFtZUxlbmd0aDogMywgfSxcclxuXHRcdHsgZDogXCJkMFwiLCBmcmFtZUxlbmd0aDogMSwgfSwgLy8xNlxyXG5cdFx0eyBkOiBcImwwXCIsIGZyYW1lTGVuZ3RoOiAxLCB9LFxyXG5cdFx0eyBkOiBcInUwXCIsIGZyYW1lTGVuZ3RoOiAxLCB9LFxyXG5cdFx0eyBkOiBcInIwXCIsIGZyYW1lTGVuZ3RoOiAxLCB9LFxyXG5cdFx0eyBkOiBcImQwXCIsIGZyYW1lTGVuZ3RoOiAwLCB0cmFuczogdHJ1ZSwgfSwgLy8yMFxyXG5cdFx0eyBkOiBcImwwXCIsIGZyYW1lTGVuZ3RoOiAwLCB0cmFuczogdHJ1ZSwgfSxcclxuXHRcdHsgZDogXCJ1MFwiLCBmcmFtZUxlbmd0aDogMCwgdHJhbnM6IHRydWUsIH0sXHJcblx0XHR7IGQ6IFwicjBcIiwgZnJhbWVMZW5ndGg6IDAsIHRyYW5zOiB0cnVlLCBsb29wVG86IDIwIH0sXHJcblx0XSk7XHJcblx0YW5pbXNbXCJ3YXJwX2luXCJdID0gbmV3IFNwcml0ZUFuaW1hdGlvbih7IHNpbmdsZURpcjogXCJkXCIgfSwgW1xyXG5cdFx0eyBkOiBcImQwXCIsIGZyYW1lTGVuZ3RoOiAxLCB9LCAvLzBcclxuXHRcdHsgZDogXCJyMFwiLCBmcmFtZUxlbmd0aDogMSwgfSxcclxuXHRcdHsgZDogXCJ1MFwiLCBmcmFtZUxlbmd0aDogMSwgfSxcclxuXHRcdHsgZDogXCJsMFwiLCBmcmFtZUxlbmd0aDogMSwgfSxcclxuXHRcdHsgZDogXCJkMFwiLCBmcmFtZUxlbmd0aDogMywgfSwgLy80XHJcblx0XHR7IGQ6IFwicjBcIiwgZnJhbWVMZW5ndGg6IDMsIH0sXHJcblx0XHR7IGQ6IFwidTBcIiwgZnJhbWVMZW5ndGg6IDMsIH0sXHJcblx0XHR7IGQ6IFwibDBcIiwgZnJhbWVMZW5ndGg6IDMsIH0sXHJcblx0XHR7IGQ6IFwiZDBcIiwgZnJhbWVMZW5ndGg6IDUsIH0sIC8vOFxyXG5cdFx0eyBkOiBcInIwXCIsIGZyYW1lTGVuZ3RoOiA1LCB9LFxyXG5cdFx0eyBkOiBcInUwXCIsIGZyYW1lTGVuZ3RoOiA1LCB9LFxyXG5cdFx0eyBkOiBcImwwXCIsIGZyYW1lTGVuZ3RoOiA1LCB9LFxyXG5cdFx0eyBkOiBcImQwXCIsIGZyYW1lTGVuZ3RoOiA3LCB9LCAvLzEyXHJcblx0XHR7IGQ6IFwicjBcIiwgZnJhbWVMZW5ndGg6IDcsIH0sXHJcblx0XHR7IGQ6IFwidTBcIiwgZnJhbWVMZW5ndGg6IDcsIH0sXHJcblx0XHR7IGQ6IFwibDBcIiwgZnJhbWVMZW5ndGg6IDcsIH0sXHJcblx0XHR7IGQ6IFwiZDBcIiwgZnJhbWVMZW5ndGg6IDgsIH0sIC8vMTZcclxuXHRcdHsgZDogXCJyMFwiLCBmcmFtZUxlbmd0aDogOCwgfSxcclxuXHRcdHsgZDogXCJ1MFwiLCBmcmFtZUxlbmd0aDogOSwgfSxcclxuXHRcdHsgZDogXCJsMFwiLCBmcmFtZUxlbmd0aDogOSwgfSxcclxuXHRcdHsgZDogXCJkMFwiLCBmcmFtZUxlbmd0aDogMSwgfSxcclxuXHRdKTtcclxuXHRcclxuXHRyZXR1cm4gYW5pbXM7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldFBva2Vtb25BbmltYXRpb25zKCkgeyAvL092ZXJyaWRlcyBTdGFuZGFyZFxyXG5cdHZhciBhbmltcyA9IHt9O1xyXG5cdGFuaW1zW1wic3RhbmRcIl0gPSBuZXcgU3ByaXRlQW5pbWF0aW9uKHsgc2luZ2xlRnJhbWU6IHRydWUsIH0sIFtcclxuXHRcdHsgdTogXCJ1MVwiLCBkOiBcImQxXCIsIGw6IFwibDFcIiwgcjogXCJyMVwiLCB0cmFuczogdHJ1ZSwgcGF1c2U6IHRydWUsIH0sXHJcblx0XSk7XHJcblx0YW5pbXNbXCJfZmxhcF9zdGFuZFwiXSA9IG5ldyBTcHJpdGVBbmltYXRpb24oeyBmcmFtZUxlbmd0aDogNSwga2VlcEZyYW1lOiB0cnVlLCB9LCBbXHJcblx0XHR7IHU6IFwidTFcIiwgZDogXCJkMVwiLCBsOiBcImwxXCIsIHI6IFwicjFcIiwgdHJhbnM6IHRydWUsIH0sXHJcblx0XHR7IHU6IFwidTJcIiwgZDogXCJkMlwiLCBsOiBcImwyXCIsIHI6IFwicjJcIiwgbG9vcFRvOiAwLCB9LFxyXG5cdF0pO1xyXG5cdGFuaW1zW1wid2Fsa1wiXSA9IG5ldyBTcHJpdGVBbmltYXRpb24oeyBmcmFtZUxlbmd0aDogNSwga2VlcEZyYW1lOiB0cnVlLCB9LCBbXHJcblx0XHR7IHU6IFwidTFcIiwgZDogXCJkMVwiLCBsOiBcImwxXCIsIHI6IFwicjFcIiwgdHJhbnM6IHRydWUsIH0sXHJcblx0XHR7IHU6IFwidTJcIiwgZDogXCJkMlwiLCBsOiBcImwyXCIsIHI6IFwicjJcIiwgbG9vcFRvOiAwLCB9LFxyXG5cdF0pO1xyXG5cdHJldHVybiBhbmltcztcclxufVxyXG5cclxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHJcbmZ1bmN0aW9uIFNwcml0ZUFuaW1hdGlvbihvcHRzLCBmcmFtZXMpIHtcclxuXHR0aGlzLm9wdGlvbnMgPSBvcHRzO1xyXG5cdHRoaXMuZnJhbWVzID0gZnJhbWVzO1xyXG5cdFxyXG5cdHRoaXMud2FpdFRpbWUgPSB0aGlzLmZyYW1lc1t0aGlzLmN1cnJGcmFtZV0uZnJhbWVMZW5ndGggfHwgdGhpcy5vcHRpb25zLmZyYW1lTGVuZ3RoO1xyXG59XHJcblNwcml0ZUFuaW1hdGlvbi5wcm90b3R5cGUgPSB7XHJcblx0b3B0aW9uczogbnVsbCxcclxuXHRmcmFtZXMgOiBudWxsLFxyXG5cdFxyXG5cdHdhaXRUaW1lIDogMCxcclxuXHRjdXJyRnJhbWU6IDAsXHJcblx0c3BlZWQgOiAxLFxyXG5cdHBhdXNlZCA6IGZhbHNlLFxyXG5cdGZpbmlzaGVkOiBmYWxzZSxcclxuXHRcclxuXHRwYXJlbnQgOiBudWxsLFxyXG5cdFxyXG5cdC8qKiBBZHZhbmNlZCB0aGUgYW5pbWF0aW9uIGJ5IHRoZSBnaXZlbiBhbW91bnQgb2YgZGVsdGEgdGltZS4gKi9cclxuXHRhZHZhbmNlIDogZnVuY3Rpb24oZGVsdGFUaW1lKSB7XHJcblx0XHRpZiAodGhpcy5vcHRpb25zLnNpbmdsZUZyYW1lKSByZXR1cm47XHJcblx0XHRpZiAodGhpcy5wYXVzZWQpIHJldHVybjtcclxuXHRcdFxyXG5cdFx0aWYgKHRoaXMud2FpdFRpbWUgPiAwKSB7XHJcblx0XHRcdHRoaXMud2FpdFRpbWUgLT0gKHRoaXMuc3BlZWQgKiAoZGVsdGFUaW1lICogQ09ORklHLnNwZWVkLmFuaW1hdGlvbikpO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdHZhciBsb29wID0gdGhpcy5mcmFtZXNbdGhpcy5jdXJyRnJhbWVdLmxvb3BUbztcclxuXHRcdGlmIChsb29wICE9PSB1bmRlZmluZWQpIHRoaXMuY3VyckZyYW1lID0gbG9vcDtcclxuXHRcdGVsc2UgdGhpcy5jdXJyRnJhbWUrKztcclxuXHRcdFxyXG5cdFx0aWYgKHRoaXMuY3VyckZyYW1lID49IHRoaXMuZnJhbWVzLmxlbmd0aCkge1xyXG5cdFx0XHR0aGlzLmN1cnJGcmFtZSA9IHRoaXMuZnJhbWVzLmxlbmd0aC0xO1xyXG5cdFx0XHR0aGlzLnBhdXNlZCA9IHRydWU7XHJcblx0XHRcdHRoaXMuZmluaXNoZWQgPSB0cnVlO1xyXG5cdFx0XHRjb25zb2xlLndhcm4oXCJBbmltYXRpb24gaGFzIGNvbXBsZXRlZCFcIik7XHJcblx0XHRcdGlmICh0aGlzLnBhcmVudCkgdGhpcy5wYXJlbnQuZW1pdChcImFuaW0tZW5kXCIsIG51bGwpOyAvL1RPRE8gcHJvdmlkZSBhbmltIG5hbWVcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHQvL25ldyBmcmFtZVxyXG5cdFx0XHJcblx0XHR0aGlzLndhaXRUaW1lID0gdGhpcy5mcmFtZXNbdGhpcy5jdXJyRnJhbWVdLmZyYW1lTGVuZ3RoIHx8IHRoaXMub3B0aW9ucy5mcmFtZUxlbmd0aDtcclxuXHRcdFxyXG5cdFx0aWYgKHRoaXMuZnJhbWVzW3RoaXMuY3VyckZyYW1lXS5wYXVzZSkgdGhpcy5wYXVzZWQgPSB0cnVlO1xyXG5cdFx0XHJcblx0XHRpZiAodGhpcy5mcmFtZXNbdGhpcy5jdXJyRnJhbWVdLnNmeCkgXHJcblx0XHRcdFNvdW5kTWFuYWdlci5wbGF5U291bmQodGhpcy5mcmFtZXNbdGhpcy5jdXJyRnJhbWVdLnNmeCk7XHJcblx0fSxcclxuXHRcclxuXHQvKiogSWYgdGhpcyBhbmltYXRpb24gaXMgb24gYSBwYXVzZSBmcmFtZSAqL1xyXG5cdHJlc3VtZSA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0dGhpcy5wYXVzZWQgPSBmYWxzZTtcclxuXHR9LFxyXG5cdFxyXG5cdC8qKiBSZXNldCB0aGUgYW5pbWF0aW9uIHBhcmFtZXRlcnMuIENhbGxlZCB3aGVuIHRoaXMgYW5pbWF0aW9uIGlzIG5vIGxvbmdlciB1c2VkLiAqL1xyXG5cdHJlc2V0IDogZnVuY3Rpb24oKSB7XHJcblx0XHR0aGlzLnBhdXNlZCA9IGZhbHNlO1xyXG5cdFx0aWYgKHRoaXMub3B0aW9ucy5rZWVwRnJhbWUpIHtcclxuXHRcdFx0Ly8gaWYgKHNlbGYuY2FuVHJhbnNpdGlvbigpKSB7XHJcblx0XHRcdC8vIFx0dmFyIGxvb3AgPSB0aGlzLmZyYW1lc1t0aGlzLmN1cnJGcmFtZV0ubG9vcFRvO1xyXG5cdFx0XHQvLyBcdGlmIChsb29wICE9PSB1bmRlZmluZWQpIHRoaXMuY3VyckZyYW1lID0gbG9vcDtcclxuXHRcdFx0Ly8gXHRlbHNlIHRoaXMuY3VyckZyYW1lKys7XHJcblx0XHRcdFx0XHJcblx0XHRcdC8vIFx0dGhpcy53YWl0VGltZSA9IHRoaXMuZnJhbWVzW3RoaXMuY3VyckZyYW1lXS5mcmFtZUxlbmd0aCB8fCB0aGlzLm9wdGlvbnMuZnJhbWVMZW5ndGg7XHJcblx0XHRcdFx0XHJcblx0XHRcdC8vIFx0aWYgKHRoaXMuZnJhbWVzW3RoaXMuY3VyckZyYW1lXS5wYXVzZSkgdGhpcy5wYXVzZWQgPSB0cnVlO1xyXG5cdFx0XHQvLyB9XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHRcdHRoaXMuZmluaXNoZWQgPSBmYWxzZTtcclxuXHRcdHRoaXMuY3VyckZyYW1lID0gMDtcclxuXHRcdHRoaXMud2FpdFRpbWUgPSB0aGlzLmZyYW1lc1t0aGlzLmN1cnJGcmFtZV0uZnJhbWVMZW5ndGggfHwgdGhpcy5vcHRpb25zLmZyYW1lTGVuZ3RoO1xyXG5cdFx0dGhpcy5zcGVlZCA9IDE7XHJcblx0fSxcclxuXHRcclxuXHQvKiogSWYgdGhpcyBhbmltYXRpb24gaXMgb24gYSBmcmFtZSB0aGF0IGNhbiB0cmFuc2l0aW9uIHRvIGFub3RoZXIgYW5pbWF0aW9uLiAqL1xyXG5cdGNhblRyYW5zaXRpb24gOiBmdW5jdGlvbigpIHtcclxuXHRcdHJldHVybiB0aGlzLmZpbmlzaGVkIHx8IHRoaXMuZnJhbWVzW3RoaXMuY3VyckZyYW1lXS50cmFucztcclxuXHR9LFxyXG5cdFxyXG5cdC8qKiBSZXR1cm5zIHRoZSBuYW1lIG9mIHRoZSBmcmFtZSB0byBkaXNwbGF5IHRoaXMgZnJhbWUuICovXHJcblx0Z2V0RnJhbWVUb0Rpc3BsYXkgOiBmdW5jdGlvbihkaXIpIHtcclxuXHRcdGlmICh0aGlzLm9wdGlvbnMuc2luZ2xlRGlyKSBkaXIgPSB0aGlzLm9wdGlvbnMuc2luZ2xlRGlyO1xyXG5cdFx0cmV0dXJuIHRoaXMuZnJhbWVzW3RoaXMuY3VyckZyYW1lXVtkaXJdO1xyXG5cdH0sXHJcbn07XHJcbm1vZHVsZS5leHBvcnRzLlNwcml0ZUFuaW1hdGlvbiA9IFNwcml0ZUFuaW1hdGlvbjsiLCIvLyBhY3Rvci5qc1xyXG4vLyBEZWZpbmVzIHRoZSBhY3RvciBldmVudCB1c2VkIHRocm91Z2hvdXQgdGhlIHBhcmtcclxuXHJcbnZhciBFdmVudCA9IHJlcXVpcmUoXCJ0cHAtZXZlbnRcIik7XHJcbnZhciBpbmhlcml0cyA9IHJlcXVpcmUoXCJpbmhlcml0c1wiKTtcclxudmFyIGV4dGVuZCA9IHJlcXVpcmUoXCJleHRlbmRcIik7XHJcblxyXG52YXIgQ2hhcmFjdGVyU3ByaXRlID0gcmVxdWlyZShcInRwcC1zcHJpdGVtb2RlbFwiKS5DaGFyYWN0ZXJTcHJpdGU7XHJcbnZhciBTcHJpdGVHbG93TWF0ZXJpYWwgPSByZXF1aXJlKFwidHBwLXNwcml0ZW1vZGVsXCIpLlNwcml0ZUdsb3dNYXRlcmlhbDtcclxudmFyIGdldFNwcml0ZUZvcm1hdCA9IHJlcXVpcmUoXCJ0cHAtYWN0b3ItYW5pbWF0aW9uc1wiKS5nZXRTcHJpdGVGb3JtYXQ7XHJcblxyXG52YXIgR0xPQkFMX1NDQUxFVVAgPSAxLjY1O1xyXG52YXIgRVZFTlRfUExBTkVfTk9STUFMID0gbmV3IFRIUkVFLlZlY3RvcjMoMCwgMSwgMCk7XHJcbi8qKlxyXG4gKiBBbiBhY3RvciBpcyBhbnkgZXZlbnQgcmVwcmVzZW50aW5nIGEgcGVyc29uLCBwb2tlbW9uLCBvciBvdGhlciBlbnRpdHkgdGhhdFxyXG4gKiBtYXkgbW92ZSBhcm91bmQgaW4gdGhlIHdvcmxkIG9yIGZhY2UgYSBkaXJlY3Rpb24uIEFjdG9ycyBtYXkgaGF2ZSBkaWZmZXJlbnRcclxuICogYmVoYXZpb3JzLCBzb21lIGNvbW1vbiBvbmVzIHByZWRlZmluZWQgaW4gdGhpcyBmaWxlLlxyXG4gKi9cclxuZnVuY3Rpb24gQWN0b3IoYmFzZSwgb3B0cykge1xyXG5cdEV2ZW50LmNhbGwodGhpcywgYmFzZSwgb3B0cyk7XHJcblx0XHJcblx0dGhpcy5vbihcInRpY2tcIiwgdGhpcy5fYWN0b3JUaWNrKTtcclxuXHR0aGlzLm9uKFwiaW50ZXJhY3RlZFwiLCB0aGlzLl9kb0JlaGF2aW9yX2ludGVyYWN0KTtcclxuXHR0aGlzLm9uKFwiYnVtcGVkXCIsIHRoaXMuX2RvQmVoYXZpb3JfYnVtcCk7XHJcblx0dGhpcy5vbihcImNhbnQtbW92ZVwiLCB0aGlzLl9hY3RvckJ1bXApO1xyXG5cdHRoaXMuZmFjaW5nID0gbmV3IFRIUkVFLlZlY3RvcjMoMCwgMCwgMSk7XHJcblx0XHJcblx0dGhpcy5faW5pdEJlaGF2aW9yU3RhY2soKTtcclxuXHRcclxuXHRpZiAodGhpcy5zY2hlZHVsZSkge1xyXG5cdFx0dGhpcy5zY2hlZHVsZSA9IEFjdG9yU2NoZWR1bGVyLmNyZWF0ZVNjaGVkdWxlKHRoaXMuaWQsIHRoaXMuc2NoZWR1bGUpO1xyXG5cdH1cclxufVxyXG5pbmhlcml0cyhBY3RvciwgRXZlbnQpO1xyXG5leHRlbmQoQWN0b3IucHJvdG90eXBlLCB7XHJcblx0c3ByaXRlOiBudWxsLFxyXG5cdHNwcml0ZV9mb3JtYXQ6IG51bGwsXHJcblx0XHJcblx0c2hhZG93IDogdHJ1ZSxcclxuXHRcclxuXHQvLy8vLy8vLy8vLy8vLy8vIFByb3BlcnR5IFNldHRlcnMgLy8vLy8vLy8vLy8vLy8vLy9cclxuXHRzY2FsZTogMSxcclxuXHRzY2FsZV9zaGFkb3c6IDEsXHJcblx0b2Zmc2V0X3Nwcml0ZV94OiAwLCBcclxuXHRvZmZzZXRfc3ByaXRlX3k6IDAuMyxcclxuXHRcclxuXHRzZXRTY2FsZSA6IGZ1bmN0aW9uKHNjYWxlKSB7XHJcblx0XHR0aGlzLnNjYWxlID0gc2NhbGU7XHJcblx0XHRzY2FsZSAqPSBHTE9CQUxfU0NBTEVVUDtcclxuXHRcdHRoaXMuYXZhdGFyX3Nwcml0ZS5zY2FsZS5zZXQoc2NhbGUsIHNjYWxlLCBzY2FsZSk7XHJcblx0XHR0aGlzLl9hdmF0YXJfc2hhZG93Y2FzdGVyLnNjYWxlLnNldChcclxuXHRcdFx0dGhpcy5zY2FsZV9zaGFkb3cgKiBzY2FsZSxcclxuXHRcdFx0dGhpcy5zY2FsZV9zaGFkb3cgKiBzY2FsZSxcclxuXHRcdFx0dGhpcy5zY2FsZV9zaGFkb3cgKiBzY2FsZVxyXG5cdFx0KTtcclxuXHR9LFxyXG5cdFxyXG5cdHNldFNoYWRvd1NjYWxlIDogZnVuY3Rpb24oc2NhbGUpIHtcclxuXHRcdHRoaXMuc2NhbGVfc2hhZG93ID0gc2NhbGU7XHJcblx0XHQvLyBzY2FsZSAqPSBHTE9CQUxfU0NBTEVVUDtcclxuXHRcdHRoaXMuX2F2YXRhcl9zaGFkb3djYXN0ZXIuc2NhbGUuc2V0KFxyXG5cdFx0XHR0aGlzLnNjYWxlICogc2NhbGUsXHJcblx0XHRcdHRoaXMuc2NhbGUgKiBzY2FsZSxcclxuXHRcdFx0dGhpcy5zY2FsZSAqIHNjYWxlXHJcblx0XHQpO1xyXG5cdH0sXHJcblx0XHJcblx0Ly8vLy8vLy8vLy8vLy8vLy8vLy8vLy8gQXZhdGFyIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHRhdmF0YXJfbm9kZSA6IG51bGwsXHJcblx0YXZhdGFyX3Nwcml0ZSA6IG51bGwsXHJcblx0YXZhdGFyX2Zvcm1hdCA6IG51bGwsXHJcblx0YXZhdGFyX3RleCA6IG51bGwsXHJcblx0X2F2YXRhcl9zaGFkb3djYXN0ZXIgOiBudWxsLFxyXG5cdFxyXG5cdGdldEF2YXRhciA6IGZ1bmN0aW9uKG1hcCwgZ2MpeyBcclxuXHRcdGlmICh0aGlzLmF2YXRhcl9ub2RlKSByZXR1cm4gdGhpcy5hdmF0YXJfbm9kZTtcclxuXHRcdFxyXG5cdFx0dmFyIG5vZGUgPSB0aGlzLmF2YXRhcl9ub2RlID0gbmV3IFRIUkVFLk9iamVjdDNEKCk7XHJcblx0XHRcclxuXHRcdG5vZGUuYWRkKHRoaXMuX2F2YXRhcl9jcmVhdGVTcHJpdGUobWFwLCBnYykpO1xyXG5cdFx0bm9kZS5hZGQodGhpcy5fYXZhdGFyX2NyZWF0ZVNoYWRvd0Nhc3RlcihtYXAsIGdjKSk7XHJcblx0XHQvLyBpZiAodGhpcy5nbG93X2NvbG9yKSB7XHJcblx0XHQvLyBcdG5vZGUuYWRkKHRoaXMuX2F2YXRhcl9jcmVhdGVHbG93Q2FzdGVyKG1hcCwgZ2MpKTtcclxuXHRcdC8vIH1cclxuXHRcdFxyXG5cdFx0cmV0dXJuIG5vZGU7XHJcblx0XHRcclxuXHR9LFxyXG5cdFxyXG5cdGdldFRhbGtpbmdBbmNob3IgOiBmdW5jdGlvbigpIHtcclxuXHRcdHJldHVybiB0aGlzLl9hdmF0YXJfc2hhZG93Y2FzdGVyLmxvY2FsVG9Xb3JsZChcclxuXHRcdFx0dGhpcy5fYXZhdGFyX3NoYWRvd2Nhc3Rlci5wb3NpdGlvbi5jbG9uZSgpXHJcblx0XHQpO1xyXG5cdH0sXHJcblx0XHJcblx0X2F2YXRhcl9jcmVhdGVHbG93Q2FzdGVyOiBmdW5jdGlvbihtYXAsIGdjKSB7XHJcblx0XHR2YXIgbWF0ID0gbmV3IFNwcml0ZUdsb3dNYXRlcmlhbCh7XHJcblx0XHRcdGNvbG9yOiB0aGlzLmdsb3dfY29sb3IsXHJcblx0XHR9KTtcclxuXHRcdGdjLmNvbGxlY3QobWF0KTtcclxuXHRcdFxyXG5cdFx0dmFyIGdlb20gPSBuZXcgVEhSRUUuU3BoZXJlR2VvbWV0cnkoMC44LCAyMSwgMTApO1xyXG5cdFx0Z2MuY29sbGVjdChnZW9tKTtcclxuXHRcdFxyXG5cdFx0dmFyIG1lc2ggPSBuZXcgVEhSRUUuTWVzaChnZW9tLCBtYXQpO1xyXG5cdFx0bWVzaC5wb3NpdGlvbi5zZXQoMCwgMC41LCAwKTtcclxuXHRcdFxyXG5cdFx0Ly8gc2VsZi5zZXRTY2FsZShzZWxmLnNjYWxlX3NoYWRvdyk7XHJcblx0XHQvLyBtZXNoLnNjYWxlLnNldChcclxuXHRcdC8vIFx0dGhpcy5zY2FsZV9zaGFkb3cgKiB0aGlzLnNjYWxlLCBcclxuXHRcdC8vIFx0dGhpcy5zY2FsZV9zaGFkb3cgKiB0aGlzLnNjYWxlLCBcclxuXHRcdC8vIFx0dGhpcy5zY2FsZV9zaGFkb3cgKiB0aGlzLnNjYWxlXHJcblx0XHQvLyApO1xyXG5cdFx0cmV0dXJuIHRoaXMuX2F2YXRhcl9nbG93Y2FzdGVyID0gbWVzaDtcclxuXHR9LFxyXG5cdFxyXG5cdF9hdmF0YXJfY3JlYXRlU2hhZG93Q2FzdGVyOiBmdW5jdGlvbihtYXAsIGdjKSB7XHJcblx0XHR2YXIgbWF0ID0gbmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKCk7XHJcblx0XHRtYXQudmlzaWJsZSA9IGZhbHNlOyAvL1RoZSBvYmplY3Qgd29uJ3QgcmVuZGVyLCBidXQgdGhlIHNoYWRvdyBzdGlsbCB3aWxsXHJcblx0XHRnYy5jb2xsZWN0KG1hdCk7XHJcblx0XHRcclxuXHRcdHZhciBnZW9tID0gbmV3IFRIUkVFLlNwaGVyZUdlb21ldHJ5KDAuMywgNywgMyk7XHJcblx0XHRnYy5jb2xsZWN0KGdlb20pO1xyXG5cdFx0XHJcblx0XHR2YXIgbWVzaCA9IG5ldyBUSFJFRS5NZXNoKGdlb20sIG1hdCk7XHJcblx0XHRtZXNoLmNhc3RTaGFkb3cgPSB0cnVlO1xyXG5cdFx0bWVzaC5wb3NpdGlvbi5zZXQoMCwgMC41LCAwKTtcclxuXHRcdFxyXG5cdFx0Ly8gc2VsZi5zZXRTY2FsZShzZWxmLnNjYWxlX3NoYWRvdyk7XHJcblx0XHRtZXNoLnNjYWxlLnNldChcclxuXHRcdFx0dGhpcy5zY2FsZV9zaGFkb3cgKiB0aGlzLnNjYWxlLCBcclxuXHRcdFx0dGhpcy5zY2FsZV9zaGFkb3cgKiB0aGlzLnNjYWxlLCBcclxuXHRcdFx0dGhpcy5zY2FsZV9zaGFkb3cgKiB0aGlzLnNjYWxlXHJcblx0XHQpO1xyXG5cdFx0cmV0dXJuIHRoaXMuX2F2YXRhcl9zaGFkb3djYXN0ZXIgPSBtZXNoO1xyXG5cdH0sXHJcblx0XHJcblx0X2F2YXRhcl9jcmVhdGVTcHJpdGUgOiBmdW5jdGlvbihtYXAsIGdjKSB7XHJcblx0XHR2YXIgc2VsZiA9IHRoaXM7XHJcblx0XHQvLyB2YXIgaW1nID0gbmV3IEltYWdlKCk7XHJcblx0XHR2YXIgdGV4dHVyZSA9IHNlbGYuYXZhdGFyX3RleCA9IG5ldyBUSFJFRS5UZXh0dXJlKERFRl9TUFJJVEVfSU1HKTtcclxuXHRcdGdjLmNvbGxlY3QodGV4dHVyZSk7XHJcblx0XHRcclxuXHRcdC8vIE5vdGU6IG5vdCB1c2luZyBcInRoaXMuZ2V0U3ByaXRlRm9ybWF0XCIsIGJlY2F1c2UgdGhlIGRlZmFpbHQgc3ByaXRlXHJcblx0XHQvLyBmb3JtYXQgc2hvdWxkIG5vdCBiZSBvdmVyaWRkZW4uXHJcblx0XHR2YXIgc3Bmb3JtYXQgPSBnZXRTcHJpdGVGb3JtYXQoREVGX1NQUklURV9GT1JNQVQpO1xyXG5cdFx0XHJcblx0XHR0aGlzLl9fb25Mb2FkU3ByaXRlKERFRl9TUFJJVEVfSU1HLCBzcGZvcm1hdCwgdGV4dHVyZSk7XHJcblx0XHQvLyBpbWcuc3JjID0gREVGX1NQUklURTtcclxuXHRcdFxyXG5cdFx0dGV4dHVyZS5tYWdGaWx0ZXIgPSBUSFJFRS5OZWFyZXN0RmlsdGVyO1xyXG5cdFx0dGV4dHVyZS5taW5GaWx0ZXIgPSBUSFJFRS5OZWFyZXN0RmlsdGVyO1xyXG5cdFx0dGV4dHVyZS5yZXBlYXQgPSBuZXcgVEhSRUUuVmVjdG9yMigwLjI1LCAwLjI1KTtcclxuXHRcdHRleHR1cmUub2Zmc2V0ID0gbmV3IFRIUkVFLlZlY3RvcjIoMCwgMCk7XHJcblx0XHR0ZXh0dXJlLndyYXBTID0gVEhSRUUuTWlycm9yZWRSZXBlYXRXcmFwcGluZztcclxuXHRcdHRleHR1cmUud3JhcFQgPSBUSFJFRS5NaXJyb3JlZFJlcGVhdFdyYXBwaW5nO1xyXG5cdFx0dGV4dHVyZS5nZW5lcmF0ZU1pcG1hcHMgPSBmYWxzZTsgLy9NaXBtYXBzIGdlbmVyYXRlIHVuZGVzaXJhYmxlIHRyYW5zcGFyZW5jeSBhcnRpZmFjdHNcclxuXHRcdC8vVE9ETyBNaXJyb3JlZFJlcGVhdFdyYXBwaW5nLCBhbmQganVzdCB1c2UgYSBuZWdhdGl2ZSB4IHV2IHZhbHVlLCB0byBmbGlwIGEgc3ByaXRlXHJcblx0XHRcclxuXHRcdHNlbGYuYXZhdGFyX2Zvcm1hdCA9IHNwZm9ybWF0O1xyXG5cdFx0XHJcblx0XHQvLyB2YXIgbWF0IC8qPSBzZWxmLmF2YXRhcl9tYXQqLyA9IG5ldyBUSFJFRS5TcHJpdGVNYXRlcmlhbCh7XHJcblx0XHQvLyBcdG1hcDogdGV4dHVyZSxcclxuXHRcdC8vIFx0Y29sb3I6IDB4RkZGRkZGLFxyXG5cdFx0Ly8gXHR0cmFuc3BhcmVudDogdHJ1ZSxcclxuXHRcdC8vIH0pO1xyXG5cdFx0XHJcblx0XHRjdXJyZW50TWFwLm1hcmtMb2FkaW5nKFwiQUNUT1JfXCIrc2VsZi5pZCk7XHJcblx0XHR0aGlzLl9hdmF0YXJfbG9hZFNwcml0ZShtYXAsIHRleHR1cmUpO1xyXG5cdFx0XHJcblx0XHQvL3ZhciBzcHJpdGUgPSBzZWxmLmF2YXRhcl9zcHJpdGUgPSBuZXcgVEhSRUUuU3ByaXRlKG1hdCk7XHJcblx0XHR2YXIgc3ByaXRlID0gc2VsZi5hdmF0YXJfc3ByaXRlID0gbmV3IENoYXJhY3RlclNwcml0ZSh7XHJcblx0XHRcdG1hcDogdGV4dHVyZSxcclxuXHRcdFx0Y29sb3I6IDB4RkZGRkZGLFxyXG5cdFx0XHRvZmZzZXQ6IG5ldyBUSFJFRS5WZWN0b3IzKHRoaXMub2Zmc2V0X3Nwcml0ZV94LCB0aGlzLm9mZnNldF9zcHJpdGVfeSwgMCksLy8wLjIyKSxcclxuXHRcdFx0Z2M6IGdjLFxyXG5cdFx0fSk7XHJcblx0XHQvL3NlbGYuc2V0U2NhbGUoc2VsZi5zY2FsZSk7XHJcblx0XHRzcHJpdGUuc2NhbGUuc2V0KFxyXG5cdFx0XHRzZWxmLnNjYWxlICogR0xPQkFMX1NDQUxFVVAsIFxyXG5cdFx0XHRzZWxmLnNjYWxlICogR0xPQkFMX1NDQUxFVVAsIFxyXG5cdFx0XHRzZWxmLnNjYWxlICogR0xPQkFMX1NDQUxFVVBcclxuXHRcdCk7XHJcblx0XHRcclxuXHRcdHJldHVybiBzcHJpdGU7XHJcblx0fSxcclxuXHRcclxuXHRfYXZhdGFyX2xvYWRTcHJpdGUgOiBmdW5jdGlvbihtYXAsIHRleHR1cmUpIHtcclxuXHRcdHZhciBzZWxmID0gdGhpcztcclxuXHRcdG1hcC5sb2FkU3ByaXRlKHNlbGYuaWQsIHNlbGYuc3ByaXRlLCBmdW5jdGlvbihlcnIsIHVybCl7XHJcblx0XHRcdGlmIChlcnIpIHtcclxuXHRcdFx0XHRjb25zb2xlLmVycm9yKFwiRVJST1IgTE9BRElORyBTUFJJVEU6IFwiLCBlcnIpO1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0dmFyIGltZyA9IG5ldyBJbWFnZSgpO1xyXG5cdFx0XHR2YXIgZm9ybWF0ID0gc2VsZi5zcHJpdGVfZm9ybWF0O1xyXG5cdFx0XHRpZiAoJC5pc1BsYWluT2JqZWN0KGZvcm1hdCkpIHtcclxuXHRcdFx0XHRmb3JtYXQgPSBzZWxmLnNwcml0ZV9mb3JtYXRbc2VsZi5zcHJpdGVdO1xyXG5cdFx0XHR9XHJcblx0XHRcdGlmICh0eXBlb2YgZm9ybWF0ID09IFwiZnVuY3Rpb25cIikge1xyXG5cdFx0XHRcdGZvcm1hdCA9IHNlbGYuc3ByaXRlX2Zvcm1hdChzZWxmLnNwcml0ZSk7XHJcblx0XHRcdH1cclxuXHRcdFx0aWYgKHR5cGVvZiBmb3JtYXQgIT0gXCJzdHJpbmdcIikge1xyXG5cdFx0XHRcdGNvbnNvbGUuZXJyb3IoXCJJTlZBTElEIFNQUklURSBGT1JNQVQhICdzcHJpdGVfZm9ybWF0JyBtdXN0IGJlIGEgc3RyaW5nLCBhbiBvYmplY3QsIG9yIGEgXCIrXHJcblx0XHRcdFx0XHRcImZ1bmN0aW9uIHRoYXQgcmV0dXJucyBhIHN0cmluZyEgVG8gcHJvdmlkZSBhIGN1c3RvbSBmb3JtYXQsIG92ZXJyaWRlIFwiK1xyXG5cdFx0XHRcdFx0XCJnZXRTcHJpdGVGb3JtYXQgb24gdGhlIGFjdG9yIGluc3RhbmNlIVwiKTtcclxuXHRcdFx0XHRmb3JtYXQgPSBERUZfU1BSSVRFX0ZPUk1BVDtcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0c2VsZi5fX29uTG9hZFNwcml0ZShpbWcsIHNlbGYuZ2V0U3ByaXRlRm9ybWF0KGZvcm1hdCksIHRleHR1cmUpO1xyXG5cdFx0XHRpbWcuc3JjID0gdXJsO1xyXG5cdFx0fSk7XHJcblx0fSxcclxuXHRcclxuXHRfX29uTG9hZFNwcml0ZSA6IGZ1bmN0aW9uKGltZywgZm9ybWF0LCB0ZXh0dXJlKSB7XHJcblx0XHR2YXIgc2VsZiA9IHRoaXM7XHJcblx0XHR2YXIgZiA9IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHR0ZXh0dXJlLmltYWdlID0gaW1nO1xyXG5cdFx0XHRcclxuXHRcdFx0c2VsZi5hdmF0YXJfZm9ybWF0ID0gZm9ybWF0O1xyXG5cdFx0XHR0ZXh0dXJlLnJlcGVhdC5zZXQoXHJcblx0XHRcdFx0c2VsZi5hdmF0YXJfZm9ybWF0LndpZHRoIC8gaW1nLm5hdHVyYWxXaWR0aCwgXHJcblx0XHRcdFx0c2VsZi5hdmF0YXJfZm9ybWF0LmhlaWdodCAvIGltZy5uYXR1cmFsSGVpZ2h0KTtcclxuXHRcdFx0dGV4dHVyZS5uZWVkc1VwZGF0ZSA9IHRydWU7XHJcblx0XHRcdFxyXG5cdFx0XHRzZWxmLmF2YXRhcl9zcHJpdGUud2lkdGggPSBzZWxmLmF2YXRhcl9mb3JtYXQud2lkdGg7XHJcblx0XHRcdHNlbGYuYXZhdGFyX3Nwcml0ZS5oZWlnaHQgPSBzZWxmLmF2YXRhcl9mb3JtYXQuaGVpZ2h0O1xyXG5cdFx0XHRcclxuXHRcdFx0Ly8gc2VsZi5zaG93QW5pbWF0aW9uRnJhbWUoXCJkMFwiKTtcclxuXHRcdFx0c2VsZi5wbGF5QW5pbWF0aW9uKFwic3RhbmRcIik7XHJcblx0XHRcdGN1cnJlbnRNYXAubWFya0xvYWRGaW5pc2hlZChcIkFDVE9SX1wiK3NlbGYuaWQpO1xyXG5cdFx0XHRcclxuXHRcdFx0aW1nLnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJsb2FkXCIsIGYpO1xyXG5cdFx0XHRpbWcucmVtb3ZlRXZlbnRMaXN0ZW5lcihcImxvYWRcIiwgZSk7XHJcblx0XHR9XHJcblx0XHR2YXIgZSA9IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRjb25zb2xlLmVycm9yKFwiRXJyb3Igd2hpbGUgbG9hZGluZyB0ZXh0dXJlIVwiLCBpbWcuc3JjKTtcclxuXHRcdFx0dGV4dHVyZS5uZWVkc1VwZGF0ZSA9IHRydWU7IC8vdXBkYXRlIHRoZSBtaXNzaW5nIHRleHR1cmUgcHJlLWxvYWRlZFxyXG5cdFx0XHRjdXJyZW50TWFwLm1hcmtMb2FkRmluaXNoZWQoXCJBQ1RPUl9cIitzZWxmLmlkKTtcclxuXHRcdFx0XHJcblx0XHRcdGltZy5yZW1vdmVFdmVudExpc3RlbmVyKFwibG9hZFwiLCBmKTtcclxuXHRcdFx0aW1nLnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJsb2FkXCIsIGUpO1xyXG5cdFx0fVxyXG5cdFx0aW1nLm9uKFwibG9hZFwiLCBmKTtcclxuXHRcdGltZy5vbihcImVycm9yXCIsIGUpO1xyXG5cdH0sXHJcblx0XHJcblx0Ly8gT3ZlcnJpZGUgdGhpcyBmdW5jdGlvbiB0byBwcm92aWRlIGEgY3VzdG9tIHNwcml0ZSBmb3JtYXRcclxuXHRnZXRTcHJpdGVGb3JtYXQgOiBmdW5jdGlvbihmb3JtYXQpIHtcclxuXHRcdHJldHVybiBnZXRTcHJpdGVGb3JtYXQoZm9ybWF0KTtcclxuXHR9LFxyXG5cdFxyXG5cdC8vLy8vLy8vLy8vLy8vLy8vLy8gQW5pbWF0aW9uIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHRfYW5pbWF0aW9uU3RhdGUgOiBudWxsLFxyXG5cdGZhY2luZyA6IG51bGwsXHJcblx0YW5pbWF0aW9uU3BlZWQ6IDEsIC8vZGVmYXVsdCBhbmltYXRpb24gc3BlZWRcclxuXHRcclxuXHRfaW5pdEFuaW1hdGlvblN0YXRlIDogZnVuY3Rpb24oKSB7XHJcblx0XHRpZiAoIXRoaXMuX2FuaW1hdGlvblN0YXRlKVxyXG5cdFx0XHR0aGlzLl9hbmltYXRpb25TdGF0ZSA9IHtcclxuXHRcdFx0XHRjdXJyQW5pbSA6IG51bGwsIC8vIEFuaW1hdGlvbiBvYmplY3RcclxuXHRcdFx0XHRjdXJyRnJhbWUgOiBudWxsLCAvLyBDdXJyZW50bHkgZGlzcGxheWVkIHNwcml0ZSBmcmFtZSBuYW1lXHJcblx0XHRcdFx0bmV4dEFuaW0gOiBudWxsLCAvLyBBbmltYXRpb24gb2JqZWN0IGluIHF1ZXVlXHJcblx0XHRcdFx0XHJcblx0XHRcdFx0c3RvcE5leHRUcmFuc2l0aW9uOiBmYWxzZSwgLy9TdG9wIGF0IHRoZSBuZXh0IHRyYW5zaXRpb24gZnJhbWUsIHRvIHNob3J0LXN0b3AgdGhlIFwiQnVtcFwiIGFuaW1hdGlvblxyXG5cdFx0XHR9O1xyXG5cdFx0cmV0dXJuIHRoaXMuX2FuaW1hdGlvblN0YXRlO1xyXG5cdH0sXHJcblx0XHJcblx0Z2V0RGlyZWN0aW9uRmFjaW5nIDogZnVuY3Rpb24oKSB7XHJcblx0XHRpZiAoIWN1cnJlbnRNYXAgfHwgIWN1cnJlbnRNYXAuY2FtZXJhKSByZXR1cm4gXCJkXCI7XHJcblx0XHRcclxuXHRcdHZhciBkaXJ2ZWN0b3IgPSB0aGlzLmZhY2luZy5jbG9uZSgpO1xyXG5cdFx0ZGlydmVjdG9yLmFwcGx5UXVhdGVybmlvbiggY3VycmVudE1hcC5jYW1lcmEucXVhdGVybmlvbiApO1xyXG5cdFx0ZGlydmVjdG9yLnByb2plY3RPblBsYW5lKEVWRU5UX1BMQU5FX05PUk1BTCkubm9ybWFsaXplKCk7XHJcblx0XHRcclxuXHRcdHZhciB4ID0gZGlydmVjdG9yLngsIHkgPSBkaXJ2ZWN0b3IuejtcclxuXHRcdC8vIGNvbnNvbGUubG9nKFwiRElSRkFDSU5HOlwiLCB4LCB5KTtcclxuXHRcdGlmIChNYXRoLmFicyh4KSA+IE1hdGguYWJzKHkpKSB7IC8vRGlyZWN0aW9uIHZlY3RvciBpcyBwb2ludGluZyBhbG9uZyB4IGF4aXNcclxuXHRcdFx0aWYgKHggPiAwKSByZXR1cm4gXCJsXCI7XHJcblx0XHRcdGVsc2UgcmV0dXJuIFwiclwiO1xyXG5cdFx0fSBlbHNlIHsgLy9EaXJlY3Rpb24gdmVjdG9yIGlzIHBvaW50aW5nIGFsb25nIHkgYXhpc1xyXG5cdFx0XHRpZiAoeSA+IDApIHJldHVybiBcImRcIjtcclxuXHRcdFx0ZWxzZSByZXR1cm4gXCJ1XCI7XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gXCJkXCI7XHJcblx0fSxcclxuXHRcclxuXHRzaG93QW5pbWF0aW9uRnJhbWUgOiBmdW5jdGlvbihmcmFtZSkge1xyXG5cdFx0dmFyIHN0YXRlID0gdGhpcy5faW5pdEFuaW1hdGlvblN0YXRlKCk7XHJcblx0XHRcclxuXHRcdHZhciBkZWYgPSB0aGlzLmF2YXRhcl9mb3JtYXQuZnJhbWVzW2ZyYW1lXTtcclxuXHRcdGlmICghZGVmKSB7XHJcblx0XHRcdGNvbnNvbGUud2FybihcIkVSUk9SIFwiLCB0aGlzLmlkLCBcIjogQW5pbWF0aW9uIGZyYW1lIGRvZXNuJ3QgZXhpc3Q6XCIsIGZyYW1lKTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cdFx0c3RhdGUuZnJhbWVOYW1lID0gZnJhbWU7XHJcblx0XHRcclxuXHRcdHZhciBmbGlwID0gZmFsc2U7XHJcblx0XHRpZiAodHlwZW9mIGRlZiA9PSBcInN0cmluZ1wiKSB7IC8vcmVkaXJlY3RcclxuXHRcdFx0ZGVmID0gdGhpcy5hdmF0YXJfZm9ybWF0LmZyYW1lc1tkZWZdO1xyXG5cdFx0XHRmbGlwID0gdHJ1ZTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0dmFyIHUgPSBkZWZbMF0gKiB0aGlzLmF2YXRhcl90ZXgucmVwZWF0Lng7XHJcblx0XHR2YXIgdiA9IDEgLSAoKGRlZlsxXSsxKSAqIHRoaXMuYXZhdGFyX3RleC5yZXBlYXQueSk7XHJcblx0XHQvL0ZvciBzb21lIHJlYXNvbiwgb2Zmc2V0cyBhcmUgZnJvbSB0aGUgQk9UVE9NIGxlZnQ/IVxyXG5cdFx0XHJcblx0XHRpZiAoZmxpcCAmJiB0aGlzLmF2YXRhcl9mb3JtYXQuZmxpcCkge1xyXG5cdFx0XHR1ID0gMCAtIChkZWZbMF0tMSkgKiB0aGlzLmF2YXRhcl90ZXgucmVwZWF0Lng7IC8vVE9ETyB0ZXN0XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdHRoaXMuYXZhdGFyX3RleC5vZmZzZXQuc2V0KHUsIHYpOyBcclxuXHRcdHRoaXMuYXZhdGFyX3RleC5uZWVkc1VwZGF0ZSA9IHRydWU7XHJcblx0fSxcclxuXHRcclxuXHRwbGF5QW5pbWF0aW9uIDogZnVuY3Rpb24oYW5pbU5hbWUsIG9wdHMpIHtcclxuXHRcdHZhciBzdGF0ZSA9IHRoaXMuX2luaXRBbmltYXRpb25TdGF0ZSgpO1xyXG5cdFx0aWYgKCFvcHRzKSBvcHRzID0ge307XHJcblx0XHRcclxuXHRcdHZhciBhbmltID0gdGhpcy5hdmF0YXJfZm9ybWF0LmFuaW1zW2FuaW1OYW1lXTtcclxuXHRcdGlmICghYW5pbSkge1xyXG5cdFx0XHRjb25zb2xlLndhcm4oXCJFUlJPUlwiLCB0aGlzLmlkLCBcIjogQW5pbWF0aW9uIG5hbWUgZG9lc24ndCBleGlzdDpcIiwgYW5pbU5hbWUpO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblx0XHRhbmltLnBhcmVudCA9IHRoaXM7XHJcblx0XHRzdGF0ZS5uZXh0QW5pbSA9IGFuaW07XHJcblx0XHRhbmltLnNwZWVkID0gKG9wdHMuc3BlZWQgPT0gdW5kZWZpbmVkKT8gdGhpcy5hbmltYXRpb25TcGVlZCA6IG9wdHMuc3BlZWQ7XHJcblx0XHRzdGF0ZS5zdG9wTmV4dFRyYW5zaXRpb24gPSBvcHRzLnN0b3BOZXh0VHJhbnNpdGlvbiB8fCBmYWxzZTtcclxuXHR9LFxyXG5cdFxyXG5cdHJlc3VtZUFuaW1hdGlvbjogZnVuY3Rpb24oKSB7XHJcblx0XHR2YXIgc3RhdGUgPSB0aGlzLl9pbml0QW5pbWF0aW9uU3RhdGUoKTtcclxuXHRcdFxyXG5cdFx0aWYgKHN0YXRlLmN1cnJBbmltKVxyXG5cdFx0XHRzdGF0ZS5jdXJyQW5pbS5yZXN1bWUoKTtcclxuXHR9LFxyXG5cdFxyXG5cdHN0b3BBbmltYXRpb24gOiBmdW5jdGlvbigpIHtcclxuXHRcdHZhciBzdGF0ZSA9IHRoaXMuX2luaXRBbmltYXRpb25TdGF0ZSgpO1xyXG5cdFx0XHJcblx0XHQvLyBzdGF0ZS5ydW5uaW5nID0gZmFsc2U7XHJcblx0XHQvLyBzdGF0ZS5xdWV1ZSA9IG51bGw7XHJcblx0XHQvLyBzdGF0ZS5zdG9wRnJhbWUgPSBudWxsO1xyXG5cdFx0dGhpcy5lbWl0KFwiYW5pbS1lbmRcIiwgc3RhdGUuYW5pbU5hbWUpO1xyXG5cdH0sXHJcblx0XHJcblx0c2hvd0Vtb3RlOiBmdW5jdGlvbihlbW90ZSwgdGltZW91dCkge1xyXG5cdFx0dmFyIGUgPSB0aGlzLl9fY3VyckVtb3RlO1xyXG5cdFx0aWYgKCFlKSBcclxuXHRcdFx0ZSA9IHRoaXMuX19jdXJyRW1vdGUgPSBVSS5nZXRFbW90ZUJ1YmJsZSgpO1xyXG5cdFx0XHJcblx0XHRlLnNldFR5cGUoZW1vdGUpO1xyXG5cdFx0ZS5oZWlnaHQgPSB0aGlzLmF2YXRhcl9zcHJpdGUuaGVpZ2h0O1xyXG5cdFx0aWYgKHRpbWVvdXQpIHtcclxuXHRcdFx0ZS5zZXRUaW1lb3V0KHRpbWVvdXQpO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHR0aGlzLmF2YXRhcl9zcHJpdGUuYWRkKGUpO1xyXG5cdFx0ZS5zaG93KCk7XHJcblx0fSxcclxuXHRcclxuXHRoaWRlRW1vdGU6IGZ1bmN0aW9uKCkge1xyXG5cdFx0dmFyIGUgPSB0aGlzLl9fY3VyckVtb3RlO1xyXG5cdFx0ZS5oaWRlKGZ1bmN0aW9uKCl7XHJcblx0XHRcdGUucmVsZWFzZSgpO1xyXG5cdFx0fSk7XHJcblx0XHR0aGlzLl9fY3VyckVtb3RlID0gbnVsbDtcclxuXHR9LFxyXG5cdFxyXG5cdF90aWNrX2RvQW5pbWF0aW9uOiBmdW5jdGlvbihkZWx0YSkge1xyXG5cdFx0dmFyIHN0YXRlID0gdGhpcy5fYW5pbWF0aW9uU3RhdGU7XHJcblx0XHR2YXIgQ0EgPSBzdGF0ZS5jdXJyQW5pbTtcclxuXHRcdGlmICghQ0EpIENBID0gc3RhdGUuY3VyckFuaW0gPSBzdGF0ZS5uZXh0QW5pbTtcclxuXHRcdGlmICghQ0EpIHJldHVybjtcclxuXHRcdFxyXG5cdFx0Q0EuYWR2YW5jZShkZWx0YSk7XHJcblx0XHRcclxuXHRcdGlmIChzdGF0ZS5uZXh0QW5pbSAmJiBDQS5jYW5UcmFuc2l0aW9uKCkpIHtcclxuXHRcdFx0Ly9Td2l0Y2ggYW5pbWF0aW9uc1xyXG5cdFx0XHRDQS5yZXNldCgpO1xyXG5cdFx0XHRDQSA9IHN0YXRlLmN1cnJBbmltID0gc3RhdGUubmV4dEFuaW07XHJcblx0XHRcdHN0YXRlLm5leHRBbmltID0gbnVsbDtcclxuXHRcdFx0XHJcblx0XHRcdC8vIHRoaXMuZW1pdChcImFuaW0tZW5kXCIsIG51bGwpOyAvL1RPRE8gcHJvdmlkZSBhbmltIG5hbWVcclxuXHRcdFx0XHJcblx0XHRcdGlmIChzdGF0ZS5zdG9wTmV4dFRyYW5zaXRpb24pIHtcclxuXHRcdFx0XHR0aGlzLnBsYXlBbmltYXRpb24oXCJzdGFuZFwiKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHR2YXIgZGlyID0gdGhpcy5nZXREaXJlY3Rpb25GYWNpbmcoKTtcclxuXHRcdHZhciBmcmFtZSA9IENBLmdldEZyYW1lVG9EaXNwbGF5KGRpcik7XHJcblx0XHRpZiAoZnJhbWUgIT0gc3RhdGUuY3VyckZyYW1lKSB7XHJcblx0XHRcdHRoaXMuc2hvd0FuaW1hdGlvbkZyYW1lKGZyYW1lKTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdH0sXHJcblx0XHJcblx0Ly8vLy8vLy8vLy8vLy8vLy8vLyBNb3ZlbWVudCBhbmQgUGF0aGluZyAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblx0X3BhdGhpbmdTdGF0ZSA6IG51bGwsXHJcblx0XHJcblx0X2luaXRQYXRoaW5nU3RhdGUgOiBmdW5jdGlvbigpIHtcclxuXHRcdGlmICghdGhpcy5fcGF0aGluZ1N0YXRlKVxyXG5cdFx0XHR0aGlzLl9wYXRoaW5nU3RhdGUgPSB7XHJcblx0XHRcdFx0cXVldWU6IFtdLFxyXG5cdFx0XHRcdG1vdmluZzogZmFsc2UsXHJcblx0XHRcdFx0c3BlZWQ6IDEsXHJcblx0XHRcdFx0ZGVsdGE6IDAsIC8vdGhlIGRlbHRhIGZyb20gc3JjIHRvIGRlc3RcclxuXHRcdFx0XHRqdW1waW5nIDogZmFsc2UsXHJcblx0XHRcdFx0Ly8gZGlyOiBcImRcIixcclxuXHRcdFx0XHRcclxuXHRcdFx0XHRkZXN0TG9jQzogbmV3IFRIUkVFLlZlY3RvcjMoKS5zZXQodGhpcy5sb2NhdGlvbiksIC8vY29sbGlzaW9uIG1hcCBsb2NhdGlvblxyXG5cdFx0XHRcdGRlc3RMb2MzOiBuZXcgVEhSRUUuVmVjdG9yMygpLCAvL3dvcmxkIHNwYWNlIGxvY2F0aW9uXHJcblx0XHRcdFx0c3JjTG9jQzogbmV3IFRIUkVFLlZlY3RvcjMoKS5zZXQodGhpcy5sb2NhdGlvbiksXHJcblx0XHRcdFx0c3JjTG9jMzogbmV3IFRIUkVFLlZlY3RvcjMoKSxcclxuXHRcdFx0XHRtaWRwb2ludE9mZnNldDogbmV3IFRIUkVFLlZlY3RvcjMoKSxcclxuXHRcdFx0fTtcclxuXHRcdHJldHVybiB0aGlzLl9wYXRoaW5nU3RhdGU7XHJcblx0fSxcclxuXHRcclxuXHRwYXRoVG8gOiBmdW5jdGlvbih4LCB5KSB7XHJcblx0XHR2YXIgc3RhdGUgPSB0aGlzLl9pbml0UGF0aGluZ1N0YXRlKCk7XHJcblx0XHRcclxuXHRcdGNvbnNvbGUuZXJyb3IodGhpcy5pZCwgXCI6IFBhdGhpbmcgaGFzIG5vdCBiZWVuIGltcGxlbWVudGVkIHlldCFcIik7XHJcblx0fSxcclxuXHRcclxuXHRjbGVhclBhdGhpbmcgOiBmdW5jdGlvbigpIHtcclxuXHRcdHZhciBzdGF0ZSA9IHRoaXMuX2luaXRQYXRoaW5nU3RhdGUoKTtcclxuXHRcdHN0YXRlLnF1ZXVlLmxlbmd0aCA9IDA7XHJcblx0fSxcclxuXHRcclxuXHRtb3ZlRGlyIDogZnVuY3Rpb24oZGlyKSB7XHJcblx0XHR2YXIgeCA9IHRoaXMubG9jYXRpb24ueDtcclxuXHRcdHZhciB5ID0gdGhpcy5sb2NhdGlvbi55O1xyXG5cdFx0dmFyIHogPSB0aGlzLmxvY2F0aW9uLno7XHJcblx0XHRzd2l0Y2ggKGRpcikge1xyXG5cdFx0XHRjYXNlIFwiZFwiOiBjYXNlIFwiZG93blwiOlx0eSArPSAxOyBicmVhaztcclxuXHRcdFx0Y2FzZSBcInVcIjogY2FzZSBcInVwXCI6XHR5IC09IDE7IGJyZWFrO1xyXG5cdFx0XHRjYXNlIFwibFwiOiBjYXNlIFwibGVmdFwiOlx0eCAtPSAxOyBicmVhaztcclxuXHRcdFx0Y2FzZSBcInJcIjogY2FzZSBcInJpZ2h0XCI6XHR4ICs9IDE7IGJyZWFrO1xyXG5cdFx0fVxyXG5cdFx0dGhpcy5tb3ZlVG8oeCwgeSwgeik7XHJcblx0fSxcclxuXHRcclxuXHRmYWNlSW50ZXJhY3RvciA6IGZ1bmN0aW9uKHZlY3Rvcikge1xyXG5cdFx0dGhpcy5mYWNpbmcgPSB2ZWN0b3IuY2xvbmUoKS5uZWdhdGUoKTtcclxuXHR9LFxyXG5cdFxyXG5cdGZhY2VEaXIgOiBmdW5jdGlvbih4LCB5KSB7XHJcblx0XHR0aGlzLmZhY2luZy5zZXQoLXgsIDAsIHkpO1xyXG5cdH0sXHJcblx0XHJcblx0bW92ZVRvIDogZnVuY3Rpb24oeCwgeSwgbGF5ZXIsIG9wdHMpIHsgLy9ieXBhc3MgV2Fsa21hc2sgQ2hlY2tcclxuXHRcdGlmICgkLmlzUGxhaW5PYmplY3QobGF5ZXIpICYmIG9wdHMgPT09IHVuZGVmaW5lZCkge1xyXG5cdFx0XHRvcHRzID0gbGF5ZXI7IGxheWVyID0gdW5kZWZpbmVkO1xyXG5cdFx0fVxyXG5cdFx0aWYgKG9wdHMgPT09IHVuZGVmaW5lZCkgb3B0cyA9IHt9O1xyXG5cdFx0XHJcblx0XHR2YXIgc3RhdGUgPSB0aGlzLl9pbml0UGF0aGluZ1N0YXRlKCk7XHJcblx0XHR2YXIgc3JjID0gdGhpcy5sb2NhdGlvbjtcclxuXHRcdGxheWVyID0gKGxheWVyID09IHVuZGVmaW5lZCk/IHRoaXMubG9jYXRpb24ueiA6IGxheWVyO1xyXG5cdFx0XHJcblx0XHR0aGlzLmZhY2luZy5zZXQoc3JjLngteCwgMCwgeS1zcmMueSk7XHJcblx0XHRcclxuXHRcdHZhciB3YWxrbWFzayA9IGN1cnJlbnRNYXAuY2FuV2Fsa0JldHdlZW4oc3JjLngsIHNyYy55LCB4LCB5KTtcclxuXHRcdGlmIChvcHRzLmJ5cGFzcyAhPT0gdW5kZWZpbmVkKSB3YWxrbWFzayA9IG9wdHMuYnlwYXNzO1xyXG5cdFx0aWYgKCF3YWxrbWFzaykge1xyXG5cdFx0XHR0aGlzLmVtaXQoXCJjYW50LW1vdmVcIiwgc3JjLngsIHNyYy55LCB4LCB5KTtcclxuXHRcdFx0Y3VycmVudE1hcC5kaXNwYXRjaCh4LCB5LCBcImJ1bXBlZFwiLCB0aGlzLmZhY2luZyk7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHRcdGlmICgod2Fsa21hc2sgJiAweDEwKSA9PSAweDEwKSB7IC8vIENoZWNrIE5vTlBDIHRpbGVzXHJcblx0XHRcdGlmICh0aGlzLmlzTlBDKCkpIHtcclxuXHRcdFx0XHR0aGlzLmVtaXQoXCJjYW50LW1vdmVcIiwgc3JjLngsIHNyYy55LCB4LCB5KTtcclxuXHRcdFx0XHRjdXJyZW50TWFwLmRpc3BhdGNoKHgsIHksIFwiYnVtcGVkXCIsIHRoaXMuZmFjaW5nKTtcclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdGlmICgod2Fsa21hc2sgJiAweDgpID09IDB4OCkge1xyXG5cdFx0XHQvLyBUcmFuc2l0aW9uIG5vdyB0byBhbm90aGVyIGxheWVyXHJcblx0XHRcdHZhciB0ID0gY3VycmVudE1hcC5nZXRMYXllclRyYW5zaXRpb24oeCwgeSwgdGhpcy5sb2NhdGlvbi56KTtcclxuXHRcdFx0Y29uc29sZS5sb2coXCJMYXllciBUcmFuc2l0aW9uOiBcIiwgdCk7XHJcblx0XHRcdHggPSB0Lng7IHkgPSB0Lnk7IGxheWVyID0gdC5sYXllcjtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0XHJcblx0XHR2YXIgYW5pbW9wdHMgPSB7fTtcclxuXHRcdHN0YXRlLm1pZHBvaW50T2Zmc2V0LnNldCgwLCAwLCAwKTtcclxuXHRcdHN0YXRlLnNyY0xvY0Muc2V0KHNyYyk7XHJcblx0XHRzdGF0ZS5zcmNMb2MzLnNldChjdXJyZW50TWFwLmdldDNEVGlsZUxvY2F0aW9uKHNyYykpO1xyXG5cdFx0c3RhdGUuZGVzdExvY0Muc2V0KHgsIHksIGxheWVyKTtcclxuXHRcdHN0YXRlLmRlc3RMb2MzLnNldChjdXJyZW50TWFwLmdldDNEVGlsZUxvY2F0aW9uKHgsIHksIGxheWVyKSk7XHJcblx0XHRzdGF0ZS5kZWx0YSA9IDA7XHJcblx0XHRzdGF0ZS5zcGVlZCA9IG9wdHMuc3BlZWQgfHwgMTtcclxuXHRcdHN0YXRlLm1vdmluZyA9IHRydWU7XHJcblx0XHRhbmltb3B0cy5zcGVlZCA9IG9wdHMuc3BlZWQgfHwgMTtcclxuXHRcdFxyXG5cdFx0aWYgKCh3YWxrbWFzayAmIDB4MikgPT09IDB4Mikge1xyXG5cdFx0XHRzdGF0ZS5taWRwb2ludE9mZnNldC5zZXRZKDAuNik7XHJcblx0XHRcdHN0YXRlLmp1bXBpbmcgPSB0cnVlO1xyXG5cdFx0XHQvL2VuZm9yY2UgYSBqdW1waW5nIHNwZWVkIG9mIGJhc2VkIG9uIGhlaWdodC4gVGhlIGJlbG93IHNob3VsZCBiZSAxIHdpdGggYSBkZWZhdWx0IHN0ZXAgb2YgMC41XHJcblx0XHRcdHN0YXRlLnNwZWVkID0gMSAvICgoc3RhdGUuc3JjTG9jMy55IC0gc3RhdGUuZGVzdExvYzMueSkgKiAyKTsgXHJcblx0XHRcdFNvdW5kTWFuYWdlci5wbGF5U291bmQoXCJ3YWxrX2p1bXBcIik7XHJcblx0XHRcdGFuaW1vcHRzLnNwZWVkID0gMS41O1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHR0aGlzLnBsYXlBbmltYXRpb24oXCJ3YWxrXCIsIGFuaW1vcHRzKTtcclxuXHRcdHRoaXMuZW1pdChcIm1vdmluZ1wiLCBzdGF0ZS5zcmNMb2NDLngsIHN0YXRlLnNyY0xvY0MueSwgc3RhdGUuZGVzdExvY0MueCwgc3RhdGUuZGVzdExvY0MueSk7XHJcblx0fSxcclxuXHRcclxuXHRfdGlja19kb01vdmVtZW50IDogZnVuY3Rpb24oZGVsdGEpIHtcclxuXHRcdHZhciBzdGF0ZSA9IHRoaXMuX2luaXRQYXRoaW5nU3RhdGUoKTtcclxuXHRcdFxyXG5cdFx0c3RhdGUuZGVsdGEgKz0gc3RhdGUuc3BlZWQgKiAoZGVsdGEgKiBDT05GSUcuc3BlZWQucGF0aGluZyk7XHJcblx0XHR2YXIgYWxwaGEgPSBNYXRoLmNsYW1wKHN0YXRlLmRlbHRhKTtcclxuXHRcdHZhciBiZXRhID0gTWF0aC5zaW4oYWxwaGEgKiBNYXRoLlBJKTtcclxuXHRcdHRoaXMuYXZhdGFyX25vZGUucG9zaXRpb24uc2V0KCBcclxuXHRcdFx0Ly9MZXJwIGJldHdlZW4gc3JjIGFuZCBkZXN0IChidWlsdCBpbiBsZXJwKCkgaXMgZGVzdHJ1Y3RpdmUsIGFuZCBzZWVtcyBiYWRseSBkb25lKVxyXG5cdFx0XHRzdGF0ZS5zcmNMb2MzLnggKyAoKHN0YXRlLmRlc3RMb2MzLnggLSBzdGF0ZS5zcmNMb2MzLngpICogYWxwaGEpICsgKHN0YXRlLm1pZHBvaW50T2Zmc2V0LnggKiBiZXRhKSxcclxuXHRcdFx0c3RhdGUuc3JjTG9jMy55ICsgKChzdGF0ZS5kZXN0TG9jMy55IC0gc3RhdGUuc3JjTG9jMy55KSAqIGFscGhhKSArIChzdGF0ZS5taWRwb2ludE9mZnNldC55ICogYmV0YSksXHJcblx0XHRcdHN0YXRlLnNyY0xvYzMueiArICgoc3RhdGUuZGVzdExvYzMueiAtIHN0YXRlLnNyY0xvYzMueikgKiBhbHBoYSkgKyAoc3RhdGUubWlkcG9pbnRPZmZzZXQueiAqIGJldGEpXHJcblx0XHQpO1xyXG5cdFx0XHJcblx0XHRpZiAoc3RhdGUuZGVsdGEgPiAxKSB7XHJcblx0XHRcdHRoaXMuZW1pdChcIm1vdmVkXCIsIHN0YXRlLnNyY0xvY0MueCwgc3RhdGUuc3JjTG9jQy55LCBzdGF0ZS5kZXN0TG9jQy54LCBzdGF0ZS5kZXN0TG9jQy55KTtcclxuXHRcdFx0dGhpcy5sb2NhdGlvbi5zZXQoIHN0YXRlLmRlc3RMb2NDICk7XHJcblx0XHRcdFxyXG5cdFx0XHRpZiAoc3RhdGUuanVtcGluZykge1xyXG5cdFx0XHRcdC8vVE9ETyBwYXJ0aWNsZSBlZmZlY3RzXHJcblx0XHRcdFx0U291bmRNYW5hZ2VyLnBsYXlTb3VuZChcIndhbGtfanVtcF9sYW5kXCIpO1xyXG5cdFx0XHRcdHN0YXRlLmp1bXBpbmcgPSBmYWxzZTtcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0dmFyIG5leHQgPSBzdGF0ZS5xdWV1ZS5zaGlmdCgpO1xyXG5cdFx0XHRpZiAoIW5leHQpIHtcclxuXHRcdFx0XHRzdGF0ZS5kZWx0YSA9IDA7XHJcblx0XHRcdFx0c3RhdGUubW92aW5nID0gZmFsc2U7XHJcblx0XHRcdFx0Ly8gdGhpcy5zdG9wQW5pbWF0aW9uKCk7XHJcblx0XHRcdFx0dGhpcy5wbGF5QW5pbWF0aW9uKFwic3RhbmRcIik7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0dGhpcy5tb3ZlVG8obmV4dC54LCBuZXh0LnksIG5leHQueik7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9LFxyXG5cdFxyXG5cdFxyXG5cdC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLyBCZWhhdmlvcnMgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cdGJlaGF2aW9yU3RhY2sgOiBudWxsLFxyXG5cdFxyXG5cdF9pbml0QmVoYXZpb3JTdGFjayA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0aWYgKCF0aGlzLmJlaGF2aW9yU3RhY2spXHJcblx0XHRcdHRoaXMuYmVoYXZpb3JTdGFjayA9IFtdO1xyXG5cdH0sXHJcblx0XHJcblx0X3RpY2tfZG9CZWhhdmlvciA6IGZ1bmN0aW9uKGRlbHRhKSB7XHJcblx0XHR2YXIgYmVoYXYgPSB0aGlzLmJlaGF2aW9yU3RhY2sudG9wO1xyXG5cdFx0aWYgKCFiZWhhdiB8fCAhYmVoYXYuX3RpY2spIHJldHVybjtcclxuXHRcdGlmICghYmVoYXYub3duZXIpIGJlaGF2Lm93bmVyID0gdGhpcztcclxuXHRcdGJlaGF2Ll90aWNrKHRoaXMsIGRlbHRhKTtcclxuXHR9LFxyXG5cdFxyXG5cdF9kb0JlaGF2aW9yX2ludGVyYWN0IDogZnVuY3Rpb24oZnJvbURpcikge1xyXG5cdFx0dmFyIGJlaGF2ID0gdGhpcy5iZWhhdmlvclN0YWNrLnRvcDtcclxuXHRcdGlmICghYmVoYXYgfHwgIWJlaGF2Ll9pbnRlcmFjdCkgcmV0dXJuO1xyXG5cdFx0YmVoYXYuX2ludGVyYWN0KHRoaXMsIGZyb21EaXIpO1xyXG5cdH0sXHJcblx0XHJcblx0X2RvQmVoYXZpb3JfYnVtcCA6IGZ1bmN0aW9uKGZyb21EaXIpIHtcclxuXHRcdHZhciBiZWhhdiA9IHRoaXMuYmVoYXZpb3JTdGFjay50b3A7XHJcblx0XHRpZiAoIWJlaGF2IHx8ICFiZWhhdi5fYnVtcCkgcmV0dXJuO1xyXG5cdFx0YmVoYXYuX2J1bXAodGhpcywgZnJvbURpcik7XHJcblx0fSxcclxuXHRcclxuXHQvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHRcclxuXHRzaG91bGRBcHBlYXI6IGZ1bmN0aW9uKG1hcGlkKSB7XHJcblx0XHRpZiAodGhpcy5zY2hlZHVsZSkge1xyXG5cdFx0XHR2YXIgdGltZXN0YW1wID0gQWN0b3JTY2hlZHVsZXIuZ2V0VGltZXN0YW1wKCk7XHJcblx0XHRcdHZhciBzaG91bGQgPSB0aGlzLnNjaGVkdWxlW3RpbWVzdGFtcF0gPT0gbWFwaWQ7XHJcblx0XHRcdGlmICghc2hvdWxkKSBjb25zb2xlLmxvZyhcIkFjdG9yXCIsIHRoaXMuaWQsIFwic2hvdWxkIE5PVCBhcHBlYXIgYWNjb3JkaW5nIHRvIHNjaGVkdWxlci4uLiBcIiwgdGhpcy5zY2hlZHVsZVt0aW1lc3RhbXBdKTtcclxuXHRcdFx0cmV0dXJuIHNob3VsZDtcclxuXHRcdH1cclxuXHRcdHJldHVybiB0cnVlOyAvL25vIHNjaGVkdWxlLCBhbHdheXMgYXBwZWFyXHJcblx0fSxcclxuXHRcclxuXHRzY2hlZHVsZTogbnVsbCxcclxuXHRcclxuXHQvLy8vLy8vLy8vLy8vLy8vLy8vLy8gUHJpdmF0ZSBNZXRob2RzIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHRcclxuXHRjYW5XYWxrT24gOiBmdW5jdGlvbigpeyByZXR1cm4gZmFsc2U7IH0sXHJcblx0aXNOUEMgOiBmdW5jdGlvbigpeyByZXR1cm4gdHJ1ZTsgfSxcclxuXHRcclxuXHRfbm9ybWFsaXplTG9jYXRpb24gOiBmdW5jdGlvbigpIHtcclxuXHRcdGlmICh0aGlzLmxvY2F0aW9uID09IFwicmFuZFwiKSB7XHJcblx0XHRcdC8vUGxhY2UgdGhpcyBhY3RvciBpbiBhIGRlc2lnbmF0ZWQgcmFuZG9tIGxvY2F0aW9uXHJcblx0XHRcdHRoaXMubG9jYXRpb24gPSBjdXJyZW50TWFwLmdldFJhbmRvbU5QQ1NwYXduUG9pbnQoKTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHR2YXIgbnVtID0gRXZlbnQucHJvdG90eXBlLl9ub3JtYWxpemVMb2NhdGlvbi5jYWxsKHRoaXMpO1xyXG5cdFx0aWYgKG51bSAhPSAxIHx8ICF0aGlzLmxvY2F0aW9uKVxyXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJBY3RvcnMgY2FuIG9ubHkgYmUgaW4gb25lIHBsYWNlIGF0IGEgdGltZSEgTnVtYmVyIG9mIGxvY2F0aW9uczogXCIrbnVtKTtcclxuXHR9LFxyXG5cdFxyXG5cdF9hY3RvclRpY2sgOiBmdW5jdGlvbihkZWx0YSkge1xyXG5cdFx0Ly8gRG8gYW5pbWF0aW9uXHJcblx0XHRpZiAodGhpcy5fYW5pbWF0aW9uU3RhdGUpIFxyXG5cdFx0XHR0aGlzLl90aWNrX2RvQW5pbWF0aW9uKGRlbHRhKTtcclxuXHRcdFxyXG5cdFx0Ly8gRG8gbW92ZW1lbnRcclxuXHRcdGlmICh0aGlzLl9wYXRoaW5nU3RhdGUgJiYgdGhpcy5fcGF0aGluZ1N0YXRlLm1vdmluZylcclxuXHRcdFx0dGhpcy5fdGlja19kb01vdmVtZW50KGRlbHRhKTtcclxuXHRcdFxyXG5cdFx0Ly8gRG8gYmVoYXZpb3JcclxuXHRcdGlmICh0aGlzLmJlaGF2aW9yU3RhY2subGVuZ3RoKVxyXG5cdFx0XHR0aGlzLl90aWNrX2RvQmVoYXZpb3IoZGVsdGEpO1xyXG5cdH0sXHJcblx0XHJcblx0Ly8gX2FjdG9ySW50ZXJhY3RGYWNlIDogZnVuY3Rpb24odmVjdG9yKSB7XHJcblx0Ly8gXHR0aGlzLmZhY2luZyA9IHZlY3Rvci5jbG9uZSgpLm5lZ2F0ZSgpO1xyXG5cdC8vIH0sXHJcblx0XHJcblx0X2FjdG9yQnVtcCA6IGZ1bmN0aW9uKHNyY3gsIHNyY3ksIHgsIHksIHJlYXNvbikge1xyXG5cdFx0Ly8gY29uc29sZS53YXJuKHRoaXMuaWQsIFwiOiBDYW5ub3Qgd2FsayB0byBsb2NhdGlvblwiLCBcIihcIit4K1wiLFwiK3krXCIpXCIpO1xyXG5cdH0sXHJcblx0XHJcbn0pO1xyXG5tb2R1bGUuZXhwb3J0cyA9IEFjdG9yO1xyXG5cclxuXHJcblxyXG5mdW5jdGlvbiBnZXREaXJGcm9tTG9jKHgxLCB5MSwgeDIsIHkyKSB7XHJcblx0cmV0dXJuIG5ldyBUSFJFRS5WZWN0b3IzKHgyLXgxLCAwLCB5Mi15MSk7XHJcblx0Ly8gdmFyIGR4ID0geDIgLSB4MTtcclxuXHQvLyB2YXIgZHkgPSB5MiAtIHkxO1xyXG5cdC8vIGlmIChNYXRoLmFicyhkeCkgPiBNYXRoLmFicyhkeSkpIHtcclxuXHQvLyBcdGlmIChkeCA+IDApIHsgcmV0dXJuIFwiclwiOyB9XHJcblx0Ly8gXHRlbHNlIGlmIChkeCA8IDApIHsgcmV0dXJuIFwibFwiOyB9XHJcblx0Ly8gfSBlbHNlIHtcclxuXHQvLyBcdGlmIChkeSA+IDApIHsgcmV0dXJuIFwiZFwiOyB9XHJcblx0Ly8gXHRlbHNlIGlmIChkeSA8IDApIHsgcmV0dXJuIFwidVwiOyB9XHJcblx0Ly8gfVxyXG5cdC8vIHJldHVybiBcImRcIjtcclxufVxyXG5cclxuIiwiLy8gYmVoYXZpb3IuanNcclxuLy8gRGVmaW5lcyB0aGUgYmFzZWQgY2xhc3NlcyBmb3IgQWN0b3IncyBiZWhhdmlvcnNcclxuXHJcbnZhciBleHRlbmQgPSByZXF1aXJlKFwiZXh0ZW5kXCIpO1xyXG52YXIgaW5oZXJpdHMgPSByZXF1aXJlKFwiaW5oZXJpdHNcIik7XHJcblxyXG4vKiogXHJcbiAqIEEgQmVoYXZpb3IgaXMgYSBzY3JpcHQgdGhhdCBhbiBhY3RvciBpcyBmb2xsb3dpbmcsIHdoZXRoZXIgdGhhdFxyXG4gKiBiZSB3YWxraW5nIGFsb25nIGEgcGF0aCBvciBhcm91bmQgYSBjaXJjbGUsIG9yIGZvbGxvd2luZyBhIG1vcmVcclxuICogY29tcGxleCBzY3JpcHQgb2YgZXZlbnRzLiBCZWhhdmlvcnMgY2FuIGJlIHB1c2hlZCBhbmQgcG9wcGVkIG9mZlxyXG4gKiBhbiBhY3RvcidzIHN0YWNrLCBhbmQgdGhlIHRvcG1vc3Qgb25lIHdpbGwgYmUgcGFzc2VkIGNlcnRhaW4gZXZlbnRzXHJcbiAqIHRoYXQgdGhlIGFjdG9yIHJlY2lldmVzLlxyXG4gKi9cclxuXHJcbmZ1bmN0aW9uIEJlaGF2aW9yKG9wdHMpIHtcclxuXHRleHRlbmQodGhpcywgb3B0cyk7XHJcbn1cclxuZXh0ZW5kKEJlaGF2aW9yLnByb3RvdHlwZSwge1xyXG5cdGZhY2VPbkludGVyYWN0OiB0cnVlLFxyXG5cdHRhbGtCZWhhdjogbnVsbCxcclxuXHRvd25lcjogbnVsbCxcclxuXHRcclxuXHR0aWNrIDogbnVsbCxcclxuXHRidW1wIDogbnVsbCxcclxuXHRpbnRlcmFjdCA6IGZ1bmN0aW9uKG1lLCBmcm9tX2Rpcil7XHJcblx0XHRpZiAodGhpcy50YWxrQmVoYXYpIHtcclxuXHRcdFx0bWUuYmVoYXZpb3JTdGFjay5wdXNoKHRoaXMudGFsa0JlaGF2KTtcclxuXHRcdH1cclxuXHR9LFxyXG5cdFxyXG5cdF90aWNrIDogZnVuY3Rpb24obWUsIGRlbHRhKSB7XHJcblx0XHRpZiAodGhpcy50aWNrKVxyXG5cdFx0XHR0aGlzLnRpY2sobWUsIGRlbHRhKTtcclxuXHR9LFxyXG5cdF9pbnRlcmFjdCA6IGZ1bmN0aW9uKG1lLCBmcm9tX2Rpcikge1xyXG5cdFx0Ly9UT0RPIGRvIHN0YW5kYXJkIHN0dWZmIGhlcmVcclxuXHRcdGlmICh0aGlzLmZhY2VPbkludGVyYWN0KVxyXG5cdFx0XHRtZS5mYWNlSW50ZXJhY3Rvcihmcm9tX2Rpcik7XHJcblx0XHRcclxuXHRcdGlmICh0aGlzLmludGVyYWN0KVxyXG5cdFx0XHR0aGlzLmludGVyYWN0KG1lLCBmcm9tX2Rpcik7XHJcblx0fSxcclxuXHRfYnVtcCA6IGZ1bmN0aW9uKG1lLCBmcm9tX2Rpcikge1xyXG5cdFx0aWYgKHRoaXMuYnVtcClcclxuXHRcdFx0dGhpcy5idW1wKG1lLCBmcm9tX2Rpcik7XHJcblx0fSxcclxufSk7XHJcbm1vZHVsZS5leHBvcnRzID0gQmVoYXZpb3I7XHJcblxyXG5cclxuLy8vLy8vLy8vLy8gQ29tbW9uIEJlaGF2aW9ycyAvLy8vLy8vLy8vL1xyXG5cclxuZnVuY3Rpb24gVGFsa2luZyhvcHRzKSB7XHJcblx0QmVoYXZpb3IuY2FsbCh0aGlzLCBvcHRzKTtcclxufVxyXG5pbmhlcml0cyhUYWxraW5nLCBCZWhhdmlvcik7XHJcbmV4dGVuZChUYWxraW5nLnByb3RvdHlwZSwge1xyXG5cdGRpYWxvZzogbnVsbCxcclxuXHRkaWFsb2dfdHlwZTogXCJkaWFsb2dcIixcclxuXHRhbmltYXRpb246IG51bGwsXHJcblx0b3duZXI6IG51bGwsXHJcblx0X191aV9maXJlZDogZmFsc2UsXHJcblx0XHJcblx0Ly8gcmVzZXQ6IGZ1bmN0aW9uKCkgeyB0aGlzLl9fdWlfZmlyZWQgPSBmYWxzZTsgfSxcclxuXHRcclxuXHR0aWNrOiBmdW5jdGlvbihtZSwgZGVsdGEpIHtcclxuXHRcdHZhciBzZWxmID0gdGhpcztcclxuXHRcdGlmICghdGhpcy5fX3VpX2ZpcmVkKSB7XHJcblx0XHRcdFVJLnNob3dUZXh0Qm94KHRoaXMuZGlhbG9nX3R5cGUsIHRoaXMuZGlhbG9nLCB7XHJcblx0XHRcdFx0b3duZXI6IHRoaXMub3duZXIsXHJcblx0XHRcdFx0Y29tcGxldGU6IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRcdFx0bWUuYmVoYXZpb3JTdGFjay5wb3AoKTtcclxuXHRcdFx0XHRcdGlmICh0aGlzLmFuaW1hdGlvbikge1xyXG5cdFx0XHRcdFx0XHRtZS5wbGF5QW5pbWF0aW9uKFwic3RhbmRcIiwgeyBzdG9wTmV4dFRyYW5zaXRpb246IHRydWUsIH0pO1xyXG5cdFx0XHRcdFx0XHRtZS5yZXN1bWVBbmltYXRpb24oKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdHNlbGYuX191aV9maXJlZCA9IGZhbHNlO1xyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH0pO1xyXG5cdFx0XHRpZiAodGhpcy5hbmltYXRpb24pIHtcclxuXHRcdFx0XHRtZS5wbGF5QW5pbWF0aW9uKHRoaXMuYW5pbWF0aW9uKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRtZS5wbGF5QW5pbWF0aW9uKClcclxuXHRcdFx0dGhpcy5fX3VpX2ZpcmVkID0gdHJ1ZTtcclxuXHRcdH1cclxuXHR9LFxyXG59KTtcclxubW9kdWxlLmV4cG9ydHMuVGFsa2luZyA9IFRhbGtpbmc7XHJcblxyXG5cclxuXHJcbmZ1bmN0aW9uIEZhY2VEaXJlY3Rpb24oeCwgeSwgb3B0cykge1xyXG5cdEJlaGF2aW9yLmNhbGwodGhpcywgb3B0cyk7XHJcblx0dGhpcy5kaXJfeCA9IHg7XHJcblx0dGhpcy5kaXJfeSA9IHk7XHJcbn1cclxuaW5oZXJpdHMoRmFjZURpcmVjdGlvbiwgQmVoYXZpb3IpO1xyXG5leHRlbmQoRmFjZURpcmVjdGlvbi5wcm90b3R5cGUsIHtcclxuXHRkaXJfeDogMCxcclxuXHRkaXJfeTogMSxcclxuXHRcclxuXHR0aWNrOiBmdW5jdGlvbihtZSwgZGVsdGEpIHtcclxuXHRcdG1lLmZhY2VEaXIodGhpcy5kaXJfeCwgdGhpcy5kaXJfeSk7XHJcblx0fSxcclxufSk7XHJcbm1vZHVsZS5leHBvcnRzLkZhY2VEaXJlY3Rpb24gPSBGYWNlRGlyZWN0aW9uO1xyXG5cclxuXHJcblxyXG5mdW5jdGlvbiBMb29rQXJvdW5kKG9wdHMpIHtcclxuXHRCZWhhdmlvci5jYWxsKHRoaXMsIG9wdHMpO1xyXG59XHJcbmluaGVyaXRzKExvb2tBcm91bmQsIEJlaGF2aW9yKTtcclxuZXh0ZW5kKExvb2tBcm91bmQucHJvdG90eXBlLCB7XHJcblx0d2FpdFRpbWUgOiAwLFxyXG5cdHRpY2s6IGZ1bmN0aW9uKG1lLCBkZWx0YSkge1xyXG5cdFx0aWYgKHRoaXMud2FpdFRpbWUgPiAwKSB7XHJcblx0XHRcdHRoaXMud2FpdFRpbWUgLT0gZGVsdGE7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0c3dpdGNoKCBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkqNCkgKSB7XHJcblx0XHRcdGNhc2UgMDogbWUuZmFjaW5nLnNldCggMSwwLCAwKTsgYnJlYWs7XHJcblx0XHRcdGNhc2UgMTogbWUuZmFjaW5nLnNldCgtMSwwLCAwKTsgYnJlYWs7XHJcblx0XHRcdGNhc2UgMjogbWUuZmFjaW5nLnNldCggMCwwLCAxKTsgYnJlYWs7XHJcblx0XHRcdGNhc2UgMzogbWUuZmFjaW5nLnNldCggMCwwLC0xKTsgYnJlYWs7XHJcblx0XHR9XHJcblx0XHR0aGlzLndhaXRUaW1lICs9IChNYXRoLnJhbmRvbSgpICogMzApICsgNTtcclxuXHR9LFxyXG59KTtcclxubW9kdWxlLmV4cG9ydHMuTG9va0Fyb3VuZCA9IExvb2tBcm91bmQ7XHJcblxyXG5cclxuXHJcbmZ1bmN0aW9uIE1lYW5kZXIob3B0cykge1xyXG5cdEJlaGF2aW9yLmNhbGwodGhpcywgb3B0cyk7XHJcbn1cclxuaW5oZXJpdHMoTWVhbmRlciwgQmVoYXZpb3IpO1xyXG5leHRlbmQoTWVhbmRlci5wcm90b3R5cGUsIHtcclxuXHR3YWl0VGltZSA6IDAsXHJcblx0dGljazogZnVuY3Rpb24obWUsIGRlbHRhKSB7XHJcblx0XHRpZiAodGhpcy53YWl0VGltZSA+IDApIHtcclxuXHRcdFx0dGhpcy53YWl0VGltZSAtPSBkZWx0YTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHRzd2l0Y2goIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSo4KSApIHtcclxuXHRcdFx0Y2FzZSAwOiBtZS5mYWNpbmcuc2V0KCAxLDAsIDApOyBicmVhaztcclxuXHRcdFx0Y2FzZSAxOiBtZS5mYWNpbmcuc2V0KC0xLDAsIDApOyBicmVhaztcclxuXHRcdFx0Y2FzZSAyOiBtZS5mYWNpbmcuc2V0KCAwLDAsIDEpOyBicmVhaztcclxuXHRcdFx0Y2FzZSAzOiBtZS5mYWNpbmcuc2V0KCAwLDAsLTEpOyBicmVhaztcclxuXHRcdFx0Y2FzZSA0OiBtZS5tb3ZlRGlyKFwiZFwiKTsgYnJlYWs7XHJcblx0XHRcdGNhc2UgNTogbWUubW92ZURpcihcInVcIik7IGJyZWFrO1xyXG5cdFx0XHRjYXNlIDY6IG1lLm1vdmVEaXIoXCJsXCIpOyBicmVhaztcclxuXHRcdFx0Y2FzZSA3OiBtZS5tb3ZlRGlyKFwiclwiKTsgYnJlYWs7XHJcblx0XHR9XHJcblx0XHR0aGlzLndhaXRUaW1lICs9IChNYXRoLnJhbmRvbSgpICogMzApICsgNTtcclxuXHR9LFxyXG59KTtcclxubW9kdWxlLmV4cG9ydHMuTWVhbmRlciA9IE1lYW5kZXI7XHJcblxyXG4iLCIvLyBjb250cm9sbGVyLmpzXHJcbi8vIFRoaXMgY2xhc3MgaGFuZGxlcyBpbnB1dCBhbmQgY29udmVydHMgaXQgdG8gY29udHJvbCBzaWduYWxzXHJcblxyXG52YXIgaW5oZXJpdHMgPSByZXF1aXJlKFwiaW5oZXJpdHNcIik7XHJcbnZhciBleHRlbmQgPSByZXF1aXJlKFwiZXh0ZW5kXCIpO1xyXG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZShcImV2ZW50c1wiKS5FdmVudEVtaXR0ZXI7XHJcblxyXG4vLyBUT0RPIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0d1aWRlL0FQSS9HYW1lcGFkXHJcblxyXG5mdW5jdGlvbiBDb250cm9sTWFuYWdlcigpIHtcclxuXHR2YXIgc2VsZiA9IHRoaXM7XHJcblx0dGhpcy5zZXRLZXlDb25maWcoKTtcclxuXHRcclxuXHQkKGZ1bmN0aW9uKCl7XHJcblx0XHQkKGRvY3VtZW50KS5vbihcImtleWRvd25cIiwgZnVuY3Rpb24oZSl7IHNlbGYub25LZXlEb3duKGUpOyB9KTtcclxuXHRcdCQoZG9jdW1lbnQpLm9uKFwia2V5dXBcIiwgZnVuY3Rpb24oZSl7IHNlbGYub25LZXlVcChlKTsgfSk7XHJcblx0XHRcclxuXHRcdCQoXCIjY2hhdGJveFwiKS5vbihcImZvY3VzXCIsIGZ1bmN0aW9uKGUpeyBcclxuXHRcdFx0Y29uc29sZS5sb2coXCJDSEFUIEZPQ1VTXCIpO1xyXG5cdFx0XHRzZWxmLmlucHV0Q29udGV4dC5wdXNoKFwiY2hhdFwiKTsgXHJcblx0XHR9KTtcclxuXHRcdCQoXCIjY2hhdGJveFwiKS5vbihcImJsdXJcIiwgZnVuY3Rpb24oZSl7IFxyXG5cdFx0XHRjb25zb2xlLmxvZyhcIkNIQVQgQkxVUlwiKTtcclxuXHRcdFx0aWYgKHNlbGYuaW5wdXRDb250ZXh0LnRvcCA9PSBcImNoYXRcIilcclxuXHRcdFx0XHRzZWxmLmlucHV0Q29udGV4dC5wb3AoKTsgXHJcblx0XHR9KTtcclxuXHRcdFxyXG5cdFx0c2VsZi50b3VjaE1hbmFnZXIoKTtcclxuXHR9KVxyXG59XHJcbmluaGVyaXRzKENvbnRyb2xNYW5hZ2VyLCBFdmVudEVtaXR0ZXIpO1xyXG5leHRlbmQoQ29udHJvbE1hbmFnZXIucHJvdG90eXBlLCB7XHJcblx0aW5wdXRDb250ZXh0IDogW1wiZ2FtZVwiXSxcclxuXHRcclxuXHRrZXlzX2NvbmZpZyA6IHtcclxuXHRcdFVwOiBbMzgsIFwiVXBcIiwgODcsIFwid1wiXSwgXHJcblx0XHREb3duOiBbNDAsIFwiRG93blwiLCA4MywgXCJzXCJdLCBcclxuXHRcdExlZnQ6IFszNywgXCJMZWZ0XCIsIDY1LCBcImFcIl0sIFxyXG5cdFx0UmlnaHQ6IFszOSwgXCJSaWdodFwiLCA2OCwgXCJkXCJdLFxyXG5cdFx0SW50ZXJhY3Q6IFsxMywgXCJFbnRlclwiLCAzMiwgXCIgXCJdLFxyXG5cdFx0Q2FuY2VsOiBbMjcsIFwiRXNjYXBlXCIsIDE3LCBcIkN0cmxcIl0sXHJcblx0XHRSdW46IFsxNiwgXCJTaGlmdFwiXSxcclxuXHRcdE1lbnU6IFs4LCBcIkJhY2tzcGFjZVwiLCA0NiwgXCJEZWxldGVcIl0sXHJcblx0XHRGb2N1c0NoYXQ6IFsxOTEsIFwiL1wiXSxcclxuXHR9LFxyXG5cdFxyXG5cdGtleXNfYWN0aXZlIDoge30sXHJcblx0XHJcblx0a2V5c19kb3duIDoge1xyXG5cdFx0VXA6IGZhbHNlLCBEb3duOiBmYWxzZSxcclxuXHRcdExlZnQ6IGZhbHNlLCBSaWdodDogZmFsc2UsXHJcblx0XHRJbnRlcmFjdDogZmFsc2UsIEZvY3VzQ2hhdDogZmFsc2UsXHJcblx0XHRSdW46IGZhbHNlLCBDYW5jZWw6IGZhbHNlLFxyXG5cdH0sXHJcblx0XHJcblx0cHVzaElucHV0Q29udGV4dDogZnVuY3Rpb24oY3R4KSB7XHJcblx0XHR0aGlzLmlucHV0Q29udGV4dC5wdXNoKGN0eCk7XHJcblx0XHR0aGlzLmVtaXQoXCJpbnB1dENvbnRleHRDaGFuZ2VkXCIpO1xyXG5cdH0sXHJcblx0cG9wSW5wdXRDb250ZXh0OiBmdW5jdGlvbihjdHgpIHtcclxuXHRcdGlmICghY3R4IHx8IHRoaXMuaW5wdXRDb250ZXh0LnRvcCA9PSBjdHgpIHtcclxuXHRcdFx0dmFyIGMgPSB0aGlzLmlucHV0Q29udGV4dC5wb3AoKTtcclxuXHRcdFx0dGhpcy5lbWl0KFwiaW5wdXRDb250ZXh0Q2hhbmdlZFwiKTtcclxuXHRcdFx0cmV0dXJuIGM7XHJcblx0XHR9XHJcblx0fSxcclxuXHRyZW1vdmVJbnB1dENvbnRleHQ6IGZ1bmN0aW9uKGN0eCkge1xyXG5cdFx0aWYgKCFjdHgpIHJldHVybjtcclxuXHRcdHZhciBpbmRleCA9IHRoaXMuaW5wdXRDb250ZXh0Lmxhc3RJbmRleE9mKGN0eCk7XHJcblx0XHRpZiAoaW5kZXggPiAtMSkge1xyXG5cdFx0XHR0aGlzLmlucHV0Q29udGV4dC5zcGxpY2UoaW5kZXgsIDEpO1xyXG5cdFx0XHR0aGlzLmVtaXQoXCJpbnB1dENvbnRleHRDaGFuZ2VkXCIpO1xyXG5cdFx0XHRyZXR1cm4gY3R4O1xyXG5cdFx0fVxyXG5cdH0sXHJcblx0XHJcblx0aXNEb3duIDogZnVuY3Rpb24oa2V5LCBjdHgpIHtcclxuXHRcdGlmICgkLmlzQXJyYXkoY3R4KSkge1xyXG5cdFx0XHR2YXIgZ28gPSBmYWxzZTtcclxuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBjdHgubGVuZ3RoOyBpKyspIGdvIHw9IGN0eFtpXTtcclxuXHRcdFx0aWYgKCFnbykgcmV0dXJuO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0aWYgKHRoaXMuaW5wdXRDb250ZXh0LnRvcCAhPSBjdHgpIHJldHVybjtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0cmV0dXJuIHRoaXMua2V5c19kb3duW2tleV07XHJcblx0fSxcclxuXHRpc0Rvd25PbmNlIDogZnVuY3Rpb24oa2V5LCBjdHgpIHtcclxuXHRcdGlmICgkLmlzQXJyYXkoY3R4KSkge1xyXG5cdFx0XHR2YXIgZ28gPSBmYWxzZTtcclxuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBjdHgubGVuZ3RoOyBpKyspIGdvIHw9IGN0eFtpXTtcclxuXHRcdFx0aWYgKCFnbykgcmV0dXJuO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0aWYgKHRoaXMuaW5wdXRDb250ZXh0LnRvcCAhPSBjdHgpIHJldHVybjtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0cmV0dXJuIHRoaXMua2V5c19kb3duW2tleV0gPT0gMTtcclxuXHR9LFxyXG5cdFxyXG5cdHNldEtleUNvbmZpZyA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0dGhpcy5rZXlzX2FjdGl2ZSA9IGV4dGVuZCh0cnVlLCB7fSwgdGhpcy5rZXlzX2NvbmZpZyk7XHJcblx0fSxcclxuXHRcclxuXHRvbktleURvd24gOiBmdW5jdGlvbihlKSB7XHJcblx0XHRmb3IgKHZhciBhY3Rpb24gaW4gdGhpcy5rZXlzX2FjdGl2ZSkge1xyXG5cdFx0XHR2YXIga2V5cyA9IHRoaXMua2V5c19hY3RpdmVbYWN0aW9uXTtcclxuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdFx0aWYgKGUud2hpY2ggPT0ga2V5c1tpXSkge1xyXG5cdFx0XHRcdFx0Ly8gS2V5IGlzIG5vdyBkb3duIVxyXG5cdFx0XHRcdFx0dGhpcy5lbWl0S2V5KGFjdGlvbiwgdHJ1ZSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fSxcclxuXHRvbktleVVwIDogZnVuY3Rpb24gKGUpIHtcclxuXHRcdGZvciAodmFyIGFjdGlvbiBpbiB0aGlzLmtleXNfYWN0aXZlKSB7XHJcblx0XHRcdHZhciBrZXlzID0gdGhpcy5rZXlzX2FjdGl2ZVthY3Rpb25dO1xyXG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGtleXMubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0XHRpZiAoZS53aGljaCA9PSBrZXlzW2ldKSB7XHJcblx0XHRcdFx0XHQvLyBLZXkgaXMgbm93IHVwIVxyXG5cdFx0XHRcdFx0dGhpcy5lbWl0S2V5KGFjdGlvbiwgZmFsc2UpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH0sXHJcblx0XHJcblx0c3VibWl0Q2hhdEtleXByZXNzIDogZnVuY3Rpb24oa2V5KSB7XHJcblx0XHRzd2l0Y2goa2V5KSB7XHJcblx0XHRcdFxyXG5cdFx0fVxyXG5cdH0sXHJcblx0XHJcblx0ZW1pdEtleSA6IGZ1bmN0aW9uKGFjdGlvbiwgZG93bikge1xyXG5cdFx0aWYgKHRoaXMua2V5c19kb3duW2FjdGlvbl0gIT0gZG93bikge1xyXG5cdFx0XHR0aGlzLmtleXNfZG93blthY3Rpb25dID0gZG93bjtcclxuXHRcdFx0dGhpcy5lbWl0KFwiY29udHJvbC1hY3Rpb25cIiwgYWN0aW9uLCBkb3duKTtcclxuXHRcdH1cclxuXHR9LFxyXG5cdFxyXG5cdF90aWNrIDogZnVuY3Rpb24oKSB7XHJcblx0XHRmb3IgKHZhciBuYW1lIGluIHRoaXMua2V5c19kb3duKSB7XHJcblx0XHRcdGlmICh0aGlzLmtleXNfZG93bltuYW1lXSA+IDApXHJcblx0XHRcdFx0dGhpcy5rZXlzX2Rvd25bbmFtZV0rKztcclxuXHRcdH1cclxuXHR9XHJcblx0XHJcbn0pO1xyXG5cclxuQ29udHJvbE1hbmFnZXIucHJvdG90eXBlLnRvdWNoTWFuYWdlciA9IGZ1bmN0aW9uKCkge1xyXG5cdHZhciBzZWxmID0gdGhpcztcclxuXHRcclxuXHQkKGRvY3VtZW50KS5vbmUoXCJ0b3VjaHN0YXJ0XCIsIGZ1bmN0aW9uKCl7XHJcblx0XHQkKFwiaHRtbFwiKS5hZGRDbGFzcyhcInRvdWNobW9kZVwiKTtcclxuXHRcdGlmICghJChcIiN0b3VjaGNvbnRyb2xzXCIpLmxlbmd0aCkge1xyXG5cdFx0XHRmdW5jdGlvbiBfX21hcChidG4sIGtleSkge1xyXG5cdFx0XHRcdGJ0bi5vbihcInRvdWNoc3RhcnRcIiwgZnVuY3Rpb24oZSl7XHJcblx0XHRcdFx0XHRjb25zb2xlLmxvZyhcIlRPVUNIU1RBUlQ6IFwiLCBrZXkpO1xyXG5cdFx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cdFx0XHRcdFx0c2VsZi5lbWl0S2V5KGtleSwgdHJ1ZSk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdFx0YnRuLm9uKFwidG91Y2hlbmRcIiwgZnVuY3Rpb24oZSl7XHJcblx0XHRcdFx0XHRjb25zb2xlLmxvZyhcIlRPVUNIRU5EOiBcIiwga2V5KTtcclxuXHRcdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcclxuXHRcdFx0XHRcdHNlbGYuZW1pdEtleShrZXksIGZhbHNlKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0XHRidG4ub24oXCJ0b3VjaGNhbmNlbFwiLCBmdW5jdGlvbihlKXtcclxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKFwiVE9VQ0hDQU5DRUw6IFwiLCBrZXkpO1xyXG5cdFx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cdFx0XHRcdFx0c2VsZi5lbWl0S2V5KGtleSwgZmFsc2UpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHRcdGJ0bi5vbihcInRvdWNobW92ZVwiLCBmdW5jdGlvbihlKXtcclxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKFwiVE9VQ0hNT1ZFOiBcIiwga2V5KTtcclxuXHRcdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcclxuXHRcdFx0XHR9KVxyXG5cdFx0XHRcdHJldHVybiBidG47XHJcblx0XHRcdH1cclxuXHRcdFx0XHJcblx0XHRcdCQoXCI8ZGl2PlwiKS5hdHRyKFwiaWRcIiwgXCJ0b3VjaGNvbnRyb2xzXCIpXHJcblx0XHRcdC5hcHBlbmQgKFxyXG5cdFx0XHRcdF9fbWFwKCQoXCI8ZGl2PlwiKS5hZGRDbGFzcyhcImJ1dHRvblwiKS5hZGRDbGFzcyhcImFcIiksIFwiSW50ZXJhY3RcIilcclxuXHRcdFx0KS5hcHBlbmQgKFxyXG5cdFx0XHRcdF9fbWFwKCQoXCI8ZGl2PlwiKS5hZGRDbGFzcyhcImJ1dHRvblwiKS5hZGRDbGFzcyhcImJcIiksIFwiQ2FuY2VsXCIpXHJcblx0XHRcdCkuYXBwZW5kIChcclxuXHRcdFx0XHRfX21hcCgkKFwiPGRpdj5cIikuYWRkQ2xhc3MoXCJidXR0b25cIikuYWRkQ2xhc3MoXCJtZW51XCIpLCBcIk1lbnVcIilcclxuXHRcdFx0KS5hcHBlbmQgKFxyXG5cdFx0XHRcdF9fbWFwKCQoXCI8ZGl2PlwiKS5hZGRDbGFzcyhcImJ1dHRvblwiKS5hZGRDbGFzcyhcInJ1blwiKSwgXCJSdW5cIilcclxuXHRcdFx0KS5hcHBlbmQgKFxyXG5cdFx0XHRcdCQoXCI8ZGl2PlwiKS5hZGRDbGFzcyhcImRwYWRcIilcclxuXHRcdFx0XHQuYXBwZW5kIChcclxuXHRcdFx0XHRcdF9fbWFwKCQoXCI8ZGl2PlwiKS5hZGRDbGFzcyhcImJ1dHRvblwiKS5hZGRDbGFzcyhcInVwXCIpLCBcIlVwXCIpXHJcblx0XHRcdFx0KS5hcHBlbmQgKFxyXG5cdFx0XHRcdFx0X19tYXAoJChcIjxkaXY+XCIpLmFkZENsYXNzKFwiYnV0dG9uXCIpLmFkZENsYXNzKFwiZG93blwiKSwgXCJEb3duXCIpXHJcblx0XHRcdFx0KS5hcHBlbmQgKFxyXG5cdFx0XHRcdFx0X19tYXAoJChcIjxkaXY+XCIpLmFkZENsYXNzKFwiYnV0dG9uXCIpLmFkZENsYXNzKFwibGVmdFwiKSwgXCJMZWZ0XCIpXHJcblx0XHRcdFx0KS5hcHBlbmQgKFxyXG5cdFx0XHRcdFx0X19tYXAoJChcIjxkaXY+XCIpLmFkZENsYXNzKFwiYnV0dG9uXCIpLmFkZENsYXNzKFwicmlnaHRcIiksIFwiUmlnaHRcIilcclxuXHRcdFx0XHQpXHJcblx0XHRcdCkuYXBwZW5kVG8oXCJib2R5XCIpO1xyXG5cdFx0fVxyXG5cdH0pO1xyXG59XHJcblxyXG5cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gbmV3IENvbnRyb2xNYW5hZ2VyKCk7XHJcbiIsIi8vIGV2ZW50LmpzXHJcbi8vIERlZmluZXMgdGhlIGJhc2UgZXZlbnQgdXNlZCB0aHJvdWdob3V0IHRoZSBwYXJrLlxyXG5cclxuLy8gRml0dGluZ2x5LCBFdmVudCBpcyBhIHN1YmNsYXNzIG9mIG5vZGUuanMncyBFdmVudEVtaXR0ZXIgY2xhc3MuXHJcbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKFwiZXZlbnRzXCIpLkV2ZW50RW1pdHRlcjtcclxudmFyIGluaGVyaXRzID0gcmVxdWlyZShcImluaGVyaXRzXCIpO1xyXG52YXIgZXh0ZW5kID0gcmVxdWlyZShcImV4dGVuZFwiKTtcclxuXHJcbi8qKlxyXG4gKiBBbiBldmVudCBpcyBhbnkgaW50ZXJhY3RhYmxlIG9yIGFuaW1hdGluZyBvYmplY3QgaW4gdGhlIGdhbWUuXHJcbiAqIFRoaXMgaW5jbHVkZXMgdGhpbmdzIHJhbmdpbmcgZnJvbSBzaWducywgdG8gcGVvcGxlL3Bva2Vtb24uXHJcbiAqIEFuIGV2ZW50OlxyXG4gKlx0LSBUYWtlcyB1cCBhdCBsZWFzdCBvbmUgdGlsZSBvbiB0aGUgbWFwXHJcbiAqXHQtIENhbiBiZSBpbnRlcmFjdGVkIHdpdGggYnkgaW4tZ2FtZSB0YWxraW5nIG9yIG9uLXNjcmVlbiBjbGlja1xyXG4gKlx0LSBNYXkgYmUgcmVwcmVzZW50ZWQgaW4tZ2FtZSBieSBhIHNwcml0ZVxyXG4gKlx0LSBNYXkgZGVjaWRlLCB1cG9uIGNyZWF0aW9uLCB0byBub3QgYXBwZWFyIG9uIHRoZSBtYXAuXHJcbiAqL1xyXG5mdW5jdGlvbiBFdmVudChiYXNlLCBvcHRzKSB7XHJcblx0RXZlbnRFbWl0dGVyLmNhbGwodGhpcyk7XHJcblx0XHJcblx0ZXh0ZW5kKHRoaXMsIGJhc2UsIG9wdHMpO1xyXG5cdFxyXG5cdHRoaXMuX25vcm1hbGl6ZUxvY2F0aW9uKCk7XHJcblx0XHJcblx0aWYgKHRoaXMub25FdmVudHMpIHtcclxuXHRcdHZhciBrZXlzID0gT2JqZWN0LmtleXModGhpcy5vbkV2ZW50cyk7XHJcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGtleXMubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0dGhpcy5vbihrZXlzW2ldLCB0aGlzLm9uRXZlbnRzW2tleXNbaV1dKTtcclxuXHRcdH1cclxuXHRcdGRlbGV0ZSB0aGlzLm9uRXZlbnRzO1xyXG5cdH1cclxufVxyXG5pbmhlcml0cyhFdmVudCwgRXZlbnRFbWl0dGVyKTtcclxuZXh0ZW5kKEV2ZW50LnByb3RvdHlwZSwge1xyXG5cdGlkIDogbnVsbCxcclxuXHRlbmFibGVkIDogZmFsc2UsXHJcblx0dmlzaWJsZSA6IHRydWUsXHJcblx0XHJcblx0bG9jYXRpb24gOiBudWxsLCAvLyBFdmVudHMgd2l0aCBhIHNpbmdsZSBsb2NhdGlvbiBhcmUgb3B0aW1pemVkIGZvciBpdFxyXG5cdGxvY2F0aW9ucyA6IG51bGwsIC8vIEV2ZW50cyB3aXRoIG11bHRpcGxlIGxvY2F0aW9ucyBhcmUgb3B0aW1pemVkIGZvciB0aGF0IGFsc29cclxuXHRcclxuXHR0b1N0cmluZyA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0aWYgKCF0aGlzLmlkKSByZXR1cm4gXCI8TG9jYWwgb3IgVW5uYW1lZCBFdmVudD5cIjtcclxuXHRcdHJldHVybiB0aGlzLmlkO1xyXG5cdH0sXHJcblx0XHJcblx0c2hvdWxkQXBwZWFyIDogZnVuY3Rpb24obWFwaWQpeyByZXR1cm4gdHJ1ZTsgfSxcclxuXHRjYW5XYWxrT24gOiBmdW5jdGlvbigpeyByZXR1cm4gdHJ1ZTsgfSxcclxuXHRcclxuXHQvKiogUmV0dXJucyBhbiBvYmplY3QgdG8gcmVwcmVzZW50IHRoaXMgZXZlbnQgaW4gM0Qgc3BhY2UsIG9yIG51bGwgaWYgdGhlcmUgc2hvdWxkbid0IGJlIG9uZS4gKi9cclxuXHRnZXRBdmF0YXIgOiBmdW5jdGlvbihtYXAsIGdjKXsgcmV0dXJuIG51bGw7IH0sXHJcblx0XHJcblx0b25FdmVudHMgOiBudWxsLCAvL2Egb2JqZWN0LCBldmVudC1uYW1lcyAtPiBmdW5jdGlvbnMgdG8gY2FsbCwgdG8gYmUgcmVnaXN0ZXJlZCBpbiBjb25zdHJ1Y3RvclxyXG5cdFxyXG5cdGNhbk1vdmUgOiBmdW5jdGlvbigpIHtcclxuXHRcdC8vSWYgd2Ugb25seSBoYXZlIDEgbG9jYXRpb24sIHRoZW4gd2UgY2FuIG1vdmVcclxuXHRcdHJldHVybiAhIXRoaXMubG9jYXRpb24gJiYgIXRoaXMubG9jYXRpb25zO1xyXG5cdH0sXHJcblx0XHJcblx0bW92ZVRvIDogZnVuY3Rpb24oeCwgeSkge1xyXG5cdFx0aWYgKCF0aGlzLmNhbk1vdmUoKSlcclxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiVGhpcyBldmVudCBpcyBpbiBzZXZlcmFsIHBsYWNlcyBhdCBvbmNlLCBhbmQgY2Fubm90IG1vdmVUbyFcIik7XHJcblx0XHRcclxuXHRcdC8vVE9ETyBxdWV1ZSB1cCBhIG1vdmVcclxuXHR9LFxyXG5cdFxyXG5cdF9ub3JtYWxpemVMb2NhdGlvbiA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0aWYgKHRoaXMubG9jYXRpb24pIHtcclxuXHRcdFx0Ly9JZiB3ZSBoYXZlIGEgc2luZ3VsYXIgbG9jYXRpb24gc2V0XHJcblx0XHRcdGlmICh0aGlzLmxvY2F0aW9ucykgLy8gQXMgbG9uZyBhcyB3ZSBkb24ndCBhbHNvIGhhdmUgYSBsaXN0LCBpdHMgZmluZVxyXG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcihcIkV2ZW50IHdhcyBpbml0aWFsaXplZCB3aXRoIGJvdGggbG9jYXRpb24gYW5kIGxvY2F0aW9ucyEgVGhleSBjYW5ub3QgYmUgYm90aCBkZWZpbmVkIVwiKTtcclxuXHRcdFx0XHJcblx0XHRcdHZhciBsb2MgPSB0aGlzLmxvY2F0aW9uO1xyXG5cdFx0XHRpZiAoJC5pc0Z1bmN0aW9uKGxvYykpIHtcclxuXHRcdFx0XHRsb2NzID0gbG9jLmNhbGwodGhpcyk7XHJcblx0XHRcdH1cclxuXHRcdFx0XHJcblx0XHRcdGlmICgkLmlzQXJyYXkobG9jKSAmJiBsb2MubGVuZ3RoID09IDIgJiYgdHlwZW9mIGxvY1swXSA9PSBcIm51bWJlclwiICYmIHR5cGVvZiBsb2NbMV0gPT0gXCJudW1iZXJcIikgXHJcblx0XHRcdHtcclxuXHRcdFx0XHRsb2MgPSBuZXcgVEhSRUUuVmVjdG9yMihsb2NbMF0sIGxvY1sxXSk7XHJcblx0XHRcdH0gXHJcblx0XHRcdGVsc2UgaWYgKCQuaXNBcnJheShsb2MpICYmIGxvYy5sZW5ndGggPT0gMyBcclxuXHRcdFx0XHQmJiB0eXBlb2YgbG9jWzBdID09IFwibnVtYmVyXCIgJiYgdHlwZW9mIGxvY1sxXSA9PSBcIm51bWJlclwiICYmIHR5cGVvZiBsb2NbMl0gPT0gXCJudW1iZXJcIikgXHJcblx0XHRcdHtcclxuXHRcdFx0XHRsb2MgPSBuZXcgVEhSRUUuVmVjdG9yMyhsb2NbMF0sIGxvY1sxXSwgbG9jWzJdKTtcclxuXHRcdFx0fSBcclxuXHRcdFx0ZWxzZSBpZiAoIShsb2MgaW5zdGFuY2VvZiBUSFJFRS5WZWN0b3IyIHx8IGxvYyBpbnN0YW5jZW9mIFRIUkVFLlZlY3RvcjMpKSBcclxuXHRcdFx0e1xyXG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcihcIkNvdWxkIG5vdCBub3JtYWxpemUgbG9jYXRpb24gb2YgXCIrdGhpcy5pZCtcIiFcIik7XHJcblx0XHRcdH1cclxuXHRcdFx0dGhpcy5sb2NhdGlvbiA9IGxvYztcclxuXHRcdFx0cmV0dXJuIDE7XHJcblx0XHR9XHJcblx0XHR2YXIgb3JnbG9jID0gdGhpcy5sb2NhdGlvbnM7XHJcblx0XHR2YXIgbG9jcyA9IG51bGw7XHJcblx0XHRcclxuXHRcdGlmICgkLmlzQXJyYXkob3JnbG9jKSkge1xyXG5cdFx0XHR2YXIgdHlwZSA9IG51bGwsIG5ld1R5cGUgPSBudWxsO1xyXG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IG9yZ2xvYy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRcdGlmICh0eXBlb2Ygb3JnbG9jW2ldID09IFwibnVtYmVyXCIpXHJcblx0XHRcdFx0XHRuZXdUeXBlID0gXCJudW1iZXJcIjtcclxuXHRcdFx0XHRlbHNlIGlmIChvcmdsb2NbaV0gaW5zdGFuY2VvZiBUSFJFRS5WZWN0b3IyKVxyXG5cdFx0XHRcdFx0bmV3VHlwZSA9IFwidmVjdG9yXCI7XHJcblx0XHRcdFx0ZWxzZSBpZiAob3JnbG9jW2ldIGluc3RhbmNlb2YgVEhSRUUuVmVjdG9yMylcclxuXHRcdFx0XHRcdG5ld1R5cGUgPSBcInZlY3RvclwiO1xyXG5cdFx0XHRcdGVsc2UgaWYgKCQuaXNBcnJheShvcmdsb2NbaV0pKVxyXG5cdFx0XHRcdFx0bmV3VHlwZSA9IFwiYXJyYXlcIjtcclxuXHRcdFx0XHRcclxuXHRcdFx0XHRpZiAoIXR5cGUpIHR5cGUgPSBuZXdUeXBlO1xyXG5cdFx0XHRcdGlmICh0eXBlICE9IG5ld1R5cGUpIHtcclxuXHRcdFx0XHRcdHRocm93IG5ldyBFcnJvcihcIkNvdWxkIG5vdCBub3JtYWxpemUgbG9jYXRpb25zIG9mIFwiK3RoaXMuaWQrXCIhXCIpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XHRpZiAodHlwZSA9PSBcIm51bWJlclwiKSBsb2NzID0gX19wYXJzZUFzTnVtYmVyQXJyYXkob3JnbG9jKTtcclxuXHRcdFx0aWYgKHR5cGUgPT0gXCJhcnJheVwiKSBsb2NzID0gX19wYXJzZUFzQXJyYXlBcnJheShvcmdsb2MpO1xyXG5cdFx0XHRpZiAodHlwZSA9PSBcInZlY3RvclwiKSBsb2NzID0gb3JnbG9jO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSBpZiAoJC5pc0Z1bmN0aW9uKG9yZ2xvYykpIHtcclxuXHRcdFx0bG9jcyA9IG9yZ2xvYy5jYWxsKHRoaXMpO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSBpZiAob3JnbG9jIGluc3RhbmNlb2YgVEhSRUUuVmVjdG9yMikge1xyXG5cdFx0XHRsb2NzID0gW29yZ2xvY107XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdGlmICghbG9jcyB8fCAhJC5pc0FycmF5KGxvY3MpIHx8IGxvY3MubGVuZ3RoID09IDApIFxyXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJDb3VsZCBub3Qgbm9ybWFsaXplIGxvY2F0aW9ucyBvZiBcIit0aGlzLmlkK1wiIVwiKTtcclxuXHRcdFxyXG5cdFx0dGhpcy5sb2NhdGlvbnMgPSBsb2NzO1xyXG5cdFx0dGhpcy5fbm9ybWFsaXplTG9jYXRpb24gPSBmdW5jdGlvbigpeyByZXR1cm4gbG9jcy5sZW5ndGg7IH07IC8vY2FuJ3Qgbm9ybWFsaXplIHR3aWNlXHJcblx0XHRyZXR1cm4gbG9jcy5sZW5ndGg7XHJcblx0XHRcclxuXHRcdGZ1bmN0aW9uIF9fcGFyc2VBc051bWJlckFycmF5KGwpIHtcclxuXHRcdFx0aWYgKGwubGVuZ3RoID09IDIpIC8vc2luZ2xlIHBvaW50IFt4LCB5XVxyXG5cdFx0XHRcdHJldHVybiBbbmV3IFRIUkVFLlZlY3RvcjIobFswXSwgbFsxXSldO1xyXG5cdFx0XHRpZiAobC5sZW5ndGggPT0gMykgLy9zaW5nbGUgcG9pbnQgW3gsIHksIHpdXHJcblx0XHRcdFx0cmV0dXJuIFtuZXcgVEhSRUUuVmVjdG9yMyhsWzBdLCBsWzFdLCBsWzJdKV07XHJcblx0XHRcdGlmIChsLmxlbmd0aCA9PSA0KSB7IC8vcmVjdGFuZ2xlIFt4LCB5LCB3LCBoXVxyXG5cdFx0XHRcdHZhciBuID0gW107XHJcblx0XHRcdFx0Zm9yICh2YXIgeCA9IGxbMF07IHggPCBsWzBdK2xbMl07IHgrKykge1xyXG5cdFx0XHRcdFx0Zm9yICh2YXIgeSA9IGxbMV07IHkgPCBsWzFdK2xbM107IHkrKykge1xyXG5cdFx0XHRcdFx0XHRuLnB1c2gobmV3IFRIUkVFLlZlY3RvcjIoeCwgeSkpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRyZXR1cm4gbjtcclxuXHRcdFx0fVxyXG5cdFx0XHRpZiAobC5sZW5ndGggPT0gNSkgeyAvL3JlY3RhbmdsZSBbeCwgeSwgeiwgdywgaF1cclxuXHRcdFx0XHR2YXIgbiA9IFtdO1xyXG5cdFx0XHRcdGZvciAodmFyIHggPSBsWzBdOyB4IDwgbFswXStsWzNdOyB4KyspIHtcclxuXHRcdFx0XHRcdGZvciAodmFyIHkgPSBsWzFdOyB5IDwgbFsxXStsWzRdOyB5KyspIHtcclxuXHRcdFx0XHRcdFx0bi5wdXNoKG5ldyBUSFJFRS5WZWN0b3IzKHgsIHksIGxbMl0pKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0cmV0dXJuIG47XHJcblx0XHRcdH1cclxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiQ291bGQgbm90IG5vcm1hbGl6ZSBsb2NhdGlvbihzKSBvZiBcIit0aGlzLmlkK1wiIVwiKTtcclxuXHRcdH1cclxuXHRcdGZ1bmN0aW9uIF9fcGFyc2VBc0FycmF5QXJyYXkobCkge1xyXG5cdFx0XHR2YXIgbiA9IFtdO1xyXG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGwubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0XHRmb3IgKHZhciBqID0gMDsgaiA8IGxbaV0ubGVuZ3RoOyBqKyspIHtcclxuXHRcdFx0XHRcdGlmICh0eXBlb2YgbFtpXVtqXSAhPSBcIm51bWJlclwiKVxyXG5cdFx0XHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJDb3VsZCBub3Qgbm9ybWFsaXplIGxvY2F0aW9uKHMpIG9mIFwiK3RoaXMuaWQrXCIhXCIpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRuLnB1c2goX19wYXJzZUFzTnVtYmVyQXJyYXkobFtpXSkpO1xyXG5cdFx0XHR9XHJcblx0XHRcdHJldHVybiBuO1xyXG5cdFx0fVxyXG5cdH0sXHJcblx0XHJcblx0XHJcblx0ZGl2aWRlRmFjaW5nOiBmdW5jdGlvbihkaXJ2ZWN0b3IpIHtcclxuXHRcdHZhciB4ID0gZGlydmVjdG9yLngsIHkgPSBkaXJ2ZWN0b3IuejtcclxuXHRcdC8vIGNvbnNvbGUubG9nKFwiRElSRkFDSU5HOlwiLCB4LCB5KTtcclxuXHRcdGlmIChNYXRoLmFicyh4KSA+IE1hdGguYWJzKHkpKSB7IC8vRGlyZWN0aW9uIHZlY3RvciBpcyBwb2ludGluZyBhbG9uZyB4IGF4aXNcclxuXHRcdFx0aWYgKHggPiAwKSByZXR1cm4gXCJ3XCI7XHJcblx0XHRcdGVsc2UgcmV0dXJuIFwiZVwiO1xyXG5cdFx0fSBlbHNlIHsgLy9EaXJlY3Rpb24gdmVjdG9yIGlzIHBvaW50aW5nIGFsb25nIHkgYXhpc1xyXG5cdFx0XHRpZiAoeSA+IDApIHJldHVybiBcInNcIjtcclxuXHRcdFx0ZWxzZSByZXR1cm4gXCJuXCI7XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gXCJzXCI7XHJcblx0fVxyXG5cdFxyXG59KTtcclxubW9kdWxlLmV4cG9ydHMgPSBFdmVudDtcclxuXHJcbkV2ZW50LnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9XHJcbkV2ZW50LnByb3RvdHlwZS5vbiA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XHJcblx0aWYgKCQuaW5BcnJheSh0eXBlLCBfX0VWRU5UX1RZUEVTX18pID09IC0xKSB7XHJcblx0XHRjb25zb2xlLmVycm9yKFwiTWFwIEV2ZW50XCIsIHRoaXMudG9TdHJpbmcoKSwgXCJyZWdpc3RlcmluZyBlbWl0dGVkIGV2ZW50IHR5cGVcIiwgXHJcblx0XHRcdHR5cGUsIFwid2hpY2ggaXMgbm90IGEgdmFsaWQgZW1pdHRlZCBldmVudCB0eXBlIVwiKTtcclxuXHR9XHJcblx0RXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbi5jYWxsKHRoaXMsIHR5cGUsIGxpc3RlbmVyKTtcclxufVxyXG5cclxuLy8gVGhlIGZvbGxvd2luZyBpcyBhIGxpc3Qgb2YgZXZlbnRzIHRoZSBiYXNlIEV2ZW50IGNsYXNzIGFuZCBsaWJyYXJ5IGVtaXRcclxuLy8gVGhpcyBsaXN0IGlzIGNoZWNrZWQgYWdhaW5zdCB3aGVuIHJlZ2lzdGVyaW5nIHRvIGNhdGNoIG1pc3NwZWxsaW5ncy5cclxudmFyIF9fRVZFTlRfVFlQRVNfXyA9IFtcclxuXHRcImVudGVyaW5nLXRpbGVcIiwgLy8oZnJvbS1kaXIpIFxyXG5cdFx0Ly9lbWl0dGVkIHVwb24gdGhlIHBsYXllciBpcyBnaXZlbiB0aGUgZ28gYWhlYWQgdG8gZW50ZXIgdGhlIHRpbGUgdGhpcyBldmVudCBvY2N1cGllcy5cclxuXHRcImVudGVyZWQtdGlsZVwiLCAvLyhmcm9tLWRpcilcclxuXHRcdC8vZW1pdHRlZCB1cG9uIHRoZSBwbGF5ZXIgbGFuZGluZyBvbiB0aGUgdGlsZSB0aGlzIGV2ZW50IG9jY3VwaWVzLlxyXG5cdFwibGVhdmluZy10aWxlXCIsIC8vKHRvLWRpcilcclxuXHRcdC8vZW1pdHRlZCB1cG9uIHRoZSBwbGF5ZXIgaXMgZ2l2ZW4gdGhlIGdvIGFoZWFkIHRvIGxlYXZlIHRoZSB0aWxlIHRoaXMgZXZlbnQgb2NjdXBpZXMuXHJcblx0XCJsZWZ0LXRpbGVcIiwgLy8odG8tZGlyKVxyXG5cdFx0Ly9lbWl0dGVkIHVwb24gdGhlIHBsYXllciBjb21wbGV0ZWx5IGxlYXZpbmcgdGhlIHRpbGUgdGhpcyBldmVudCBvY2N1cGllcy5cclxuXHRcImJ1bXBlZFwiLCAvLyhmcm9tLWRpcilcclxuXHRcdC8vZW1pdHRlZCB1cG9uIHRoZSBwbGF5ZXIgaXMgZGVuaWVkIGVudHJ5IGludG8gdGhlIHRpbGUgdGhpcyBldmVudCBvY2N1cGllcy5cclxuXHRcImludGVyYWN0ZWRcIiwgLy8oZnJvbS1kaXIpXHJcblx0XHQvL2VtaXR0ZWQgd2hlbiB0aGUgcGxheWVyIGludGVyYWN0cyB3aXRoIHRoaXMgZXZlbnQgZnJvbSBhbiBhZGphY2VudCB0aWxlXHJcblx0XCJ0aWNrXCIsIC8vKGRlbHRhKVxyXG5cdFx0Ly9lbWl0dGVkIGV2ZXJ5IGdhbWUgdGlja1xyXG5cdFwiY2xpY2tlZFwiLCAvLyh4LCB5KVxyXG5cdFx0Ly9lbWl0dGVkIHdoZW4gdGhlIG1vdXNlIGlzIGNsaWNrZWQgb24gdGhpcyBldmVudCAoYW5kIGl0IGlzIGRldGVybWluZWQgaXQgaXMgdGhpcyBldmVudClcclxuXHRcImNsaWNrZWQtdGhyb3VnaFwiLCAvLyh4LCB5KVxyXG5cdFx0Ly9lbWl0dGVkIHdoZW4gdGhlIG1vdXNlIGlzIGNsaWNrZWQgb24gdGhpcyBldmVudCAoYW5kIHRoZSByYXl0cmFjZSBpcyBwYXNzaW5nIHRocm91Z2ggXHJcblx0XHQvLyB0aGlzIGV2ZW50IGR1cmluZyB0aGUgZGV0ZXJtaW5pbmcgcGhhc2UpXHJcblx0XCJtb3ZpbmdcIiwgLy8oc3JjWCwgc3JjWSwgZGVzdFgsIGRlc3RZKVxyXG5cdFx0Ly9lbWl0dGVkIHdoZW4gdGhpcyBldmVudCBiZWdpbnMgbW92aW5nIHRvIGEgbmV3IHRpbGVcclxuXHRcIm1vdmVkXCIsIC8vKHNyY1gsIHNyY1ksIGRlc3RYLCBkZXN0WSlcclxuXHRcdC8vZW1pdHRlZCB3aGVuIHRoaXMgZXZlbnQgZmluaXNoZXMgbW92aW5nIHRvIGEgbmV3IHRpbGVcclxuXHRcImNhbnQtbW92ZVwiLCAvLyhzcmNYLCBzcmNZLCBkZXN0WCwgZGVzdFksIHJlYXNvbkV2ZW50KVxyXG5cdFx0Ly9lbWl0dGVkIHdoZW4gdGhpcyBldmVudCBpcyBkZW5pZWQgbW92ZW1lbnQgdG8gdGhlIHJlcXVlc3RlZCB0aWxlXHJcblx0XHQvLyBJdCBpcyBwYXNzZWQgdGhlIGV2ZW50IGJsb2NraW5nIGl0LCBvciBudWxsIGlmIGl0IGlzIGR1ZSB0byB0aGUgY29sbGlzaW9uIG1hcFxyXG5cdFwiYW5pbS1lbmRcIiwgLy8oYW5pbWF0aW9uTmFtZSlcclxuXHRcdC8vZW1pdHRlZCB3aGVuIHRoaXMgZXZlbnQncyBhbmltYXRpb24gZW5kc1xyXG5cdFwiY3JlYXRlZFwiLCBcclxuXHRcdC8vZW1pdHRlZCB3aGVuIHRoaXMgZXZlbnQgaXMgYWRkZWQgdG8gdGhlIGV2ZW50IG1hcFxyXG5cdFwiZGVzdHJveWVkXCIsXHJcblx0XHQvL2VtaXR0ZWQgd2hlbiB0aGlzIGV2ZW50IGhhcyBiZWVuIHRha2VuIG91dCBvZiB0aGUgZXZlbnQgbWFwXHJcblx0XCJyZWFjdFwiLCAvLyhpZCwgZGlzdGFuY2UpXHJcblx0XHQvL2VtaXR0ZWQgd2hlbiBhbm90aGVyIGV2ZW50IG9uIHRoZSBtYXAgdHJhbnNtaXRzIGEgcmVhY3RhYmxlIGV2ZW50XHJcblx0XCJtZXNzYWdlXCIsIC8vKGlkLCAuLi4pXHJcblx0XHQvL25ldmVyIGVtaXR0ZWQgYnkgdGhlIGxpYnJhcnksIHRoaXMgZXZlbnQgdHlwZSBjYW4gYmUgdXNlZCBmb3IgY3Jvc3MtZXZlbnQgbWVzc2FnZXNcclxuXTtcclxuIiwiLy8gcGxheWVyLWNoYXJhY3Rlci5qc1xyXG4vLyBEZWZpbmVzIHRoZSBjb25jcmV0ZSBjb2RlIGZvciBhIFBsYXllciBDaGFyYWN0ZXIgaW4gdGhlIHdvcmxkXHJcblxyXG52YXIgQWN0b3IgPSByZXF1aXJlKFwidHBwLWFjdG9yXCIpO1xyXG52YXIgY29udHJvbGxlciA9IHJlcXVpcmUoXCJ0cHAtY29udHJvbGxlclwiKTtcclxudmFyIGluaGVyaXRzID0gcmVxdWlyZShcImluaGVyaXRzXCIpO1xyXG52YXIgZXh0ZW5kID0gcmVxdWlyZShcImV4dGVuZFwiKTtcclxuXHJcbi8qKlxyXG4gKi9cclxuZnVuY3Rpb24gUGxheWVyQ2hhcigpe1xyXG5cdEFjdG9yLmNhbGwodGhpcywge30sIHt9KTtcclxuXHRcclxuXHR0aGlzLm9uKFwidGlja1wiLCB0aGlzLmNvbnRyb2xDaGFyYWN0ZXIpO1xyXG5cdHRoaXMub24oXCJjYW50LW1vdmVcIiwgdGhpcy5hbmltYXRlQnVtcCk7XHJcbn1cclxuaW5oZXJpdHMoUGxheWVyQ2hhciwgQWN0b3IpO1xyXG5leHRlbmQoUGxheWVyQ2hhci5wcm90b3R5cGUsIHtcclxuXHRpZCA6IFwiUExBWUVSQ0hBUlwiLFxyXG5cdGxvY2F0aW9uIDogbmV3IFRIUkVFLlZlY3RvcjMoKSxcclxuXHRcclxuXHRzcHJpdGU6IG51bGwsXHJcblx0XHJcblx0cmVzZXQgOiBmdW5jdGlvbigpIHtcclxuXHRcdHRoaXMubG9jYXRpb24uc2V0KDAsIDAsIDApO1xyXG5cdH0sXHJcblx0XHJcblx0d2FycEF3YXkgOiBmdW5jdGlvbihhbmltVHlwZSkge1xyXG5cdFx0Y29uc29sZS53YXJuKFwid2FycEF3YXkgaXMgbm90IHlldCBpbXBsZW1lbnRlZCFcIik7XHJcblx0fSxcclxuXHRcclxuXHR3YXJwVG8gOiBmdW5jdGlvbih3YXJwZGVmKSB7XHJcblx0XHR2YXIgc2VsZiA9IHRoaXM7XHJcblx0XHR0aGlzLmxvY2F0aW9uLnNldCh3YXJwZGVmLmxvY1swXSwgd2FycGRlZi5sb2NbMV0sIHdhcnBkZWYubGF5ZXIpO1xyXG5cdFx0XHJcblx0XHRpZiAod2FycGRlZi5hbmltKVxyXG5cdFx0XHRjb250cm9sbGVyLnB1c2hJbnB1dENvbnRleHQoXCJjdXRzY2VuZVwiKTtcclxuXHRcdC8vVE9ETyB3YXJwZGVmLmFuaW1cclxuXHRcdFxyXG5cdFx0c2V0VGltZW91dChmdW5jdGlvbigpe1xyXG5cdFx0XHRzd2l0Y2goTnVtYmVyKHdhcnBkZWYuYW5pbSkpIHsgLy9XYXJwIGFuaW1hdGlvblxyXG5cdFx0XHRcdGNhc2UgMTogc2VsZi5hdmF0YXJfbm9kZS5wb3NpdGlvbi56ICs9IDE7IGJyZWFrOyAvLyBXYWxrIHVwXHJcblx0XHRcdFx0Y2FzZSAyOiBzZWxmLmF2YXRhcl9ub2RlLnBvc2l0aW9uLnogLT0gMTsgYnJlYWs7IC8vIFdhbGsgZG93blxyXG5cdFx0XHRcdGNhc2UgMzogc2VsZi5hdmF0YXJfbm9kZS5wb3NpdGlvbi54IC09IDE7IGJyZWFrOyAvLyBXYWxrIGxlZnRcclxuXHRcdFx0XHRjYXNlIDQ6IHNlbGYuYXZhdGFyX25vZGUucG9zaXRpb24ueCArPSAxOyBicmVhazsgLy8gV2FsayBkb3duXHJcblx0XHRcdFx0Y2FzZSA1OiBzZWxmLmF2YXRhcl9ub2RlLnBvc2l0aW9uLnkgKz0gMTU7IGJyZWFrOyAvLyBXYXJwIGluXHJcblx0XHRcdH1cclxuXHRcdH0sIDApO1xyXG5cdFx0XHJcblx0XHRjdXJyZW50TWFwLnF1ZXVlRm9yTWFwU3RhcnQoZnVuY3Rpb24oKXtcclxuXHRcdFx0Y29uc29sZS5sb2coXCJXQVJQIERFRlwiLCB3YXJwZGVmKTtcclxuXHRcdFx0dmFyIGFuaW1OYW1lID0gbnVsbDtcclxuXHRcdFx0dmFyIHggPSBzZWxmLmxvY2F0aW9uLng7XHJcblx0XHRcdHZhciB5ID0gc2VsZi5sb2NhdGlvbi55O1xyXG5cdFx0XHR2YXIgbGF5ZXIgPSBzZWxmLmxvY2F0aW9uLno7XHJcblx0XHRcdHZhciB5X29mZiA9IDA7XHJcblx0XHRcdHZhciBtc3BkID0gMSwgYXNwZCA9IDE7IC8vbW92ZW1lbnQgc3BlZWQsIGFuaW1hdGlvbiBzcGVlZFxyXG5cdFx0XHR2YXIgYW5pbUVuZEV2ZW50ID0gXCJtb3ZlZFwiO1xyXG5cdFx0XHRcclxuXHRcdFx0c3dpdGNoKE51bWJlcih3YXJwZGVmLmFuaW0pKSB7IC8vV2FycCBhbmltYXRpb25cclxuXHRcdFx0XHRjYXNlIDA6IGJyZWFrOyAvLyBBcHBlYXJcclxuXHRcdFx0XHRjYXNlIDE6IHkrKzsgYW5pbU5hbWUgPSBcIndhbGtcIjsgbXNwZCA9IDAuMzU7IGFzcGQgPSAwLjM1OyBicmVhazsgLy8gV2FsayB1cFxyXG5cdFx0XHRcdGNhc2UgMjogeS0tOyBhbmltTmFtZSA9IFwid2Fsa1wiOyBtc3BkID0gMC4zNTsgYXNwZCA9IDAuMzU7IGJyZWFrOyAvLyBXYWxrIGRvd25cclxuXHRcdFx0XHRjYXNlIDM6IHgtLTsgYW5pbU5hbWUgPSBcIndhbGtcIjsgbXNwZCA9IDAuMzU7IGFzcGQgPSAwLjM1OyBicmVhazsgLy8gV2FsayBsZWZ0XHJcblx0XHRcdFx0Y2FzZSA0OiB4Kys7IGFuaW1OYW1lID0gXCJ3YWxrXCI7IG1zcGQgPSAwLjM1OyBhc3BkID0gMC4zNTsgYnJlYWs7IC8vIFdhbGsgZG93blxyXG5cdFx0XHRcdGNhc2UgNTogLy8gV2FycCBpblxyXG5cdFx0XHRcdFx0YW5pbU5hbWUgPSBcIndhcnBfaW5cIjsgXHJcblx0XHRcdFx0XHR5X29mZiA9IDE1OyBhbmltRW5kRXZlbnQgPSBcImFuaW0tZW5kXCI7XHJcblx0XHRcdFx0XHRtc3BkID0gMC4yNTsgYXNwZCA9IDE7IFxyXG5cdFx0XHRcdFx0YnJlYWs7IFxyXG5cdFx0XHRcdGRlZmF1bHQ6IFxyXG5cdFx0XHRcdFx0Y29uc29sZS53YXJuKFwiSUxMRUdBTCBXQVJQIEFOSU1BVElPTjpcIiwgd2FycGRlZi5hbmltKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0dmFyIHNyYyA9IHNlbGYubG9jYXRpb247XHJcblx0XHRcdHZhciBzdGF0ZSA9IHNlbGYuX2luaXRQYXRoaW5nU3RhdGUoKTtcclxuXHRcdFx0XHJcblx0XHRcdGlmIChzcmMueC14IHx8IHktc3JjLnkpIFxyXG5cdFx0XHRcdHNlbGYuZmFjaW5nLnNldCh4LXNyYy54LCAwLCBzcmMueS15KTtcclxuXHRcdFx0ZWxzZVxyXG5cdFx0XHRcdHNlbGYuZmFjaW5nLnNldCgwLCAwLCAxKTtcclxuXHRcdFx0XHJcblx0XHRcdHN0YXRlLnNyY0xvY0Muc2V0KHgsIHksIGxheWVyKTtcclxuXHRcdFx0c3RhdGUuc3JjTG9jMy5zZXQoY3VycmVudE1hcC5nZXQzRFRpbGVMb2NhdGlvbih4LCB5LCBsYXllcikpLnkgKz0geV9vZmY7XHJcblx0XHRcdHN0YXRlLmRlc3RMb2NDLnNldChzcmMpO1xyXG5cdFx0XHRzdGF0ZS5kZXN0TG9jMy5zZXQoY3VycmVudE1hcC5nZXQzRFRpbGVMb2NhdGlvbihzcmMpKTtcclxuXHRcdFx0c3RhdGUuZGVsdGEgPSAwO1xyXG5cdFx0XHRzdGF0ZS5tb3ZpbmcgPSB0cnVlO1xyXG5cdFx0XHRzdGF0ZS5zcGVlZCA9IG1zcGQ7XHJcblx0XHRcdFxyXG5cdFx0XHRzZWxmLnBsYXlBbmltYXRpb24oYW5pbU5hbWUsIHsgc3BlZWQ6IGFzcGQgfSk7XHJcblx0XHRcdHNlbGYub25jZShhbmltRW5kRXZlbnQsIGZ1bmN0aW9uKGFuaW1hdGlvbk5hbWUpe1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKFwiUG9wIVwiKTtcclxuXHRcdFx0XHRjb250cm9sbGVyLnBvcElucHV0Q29udGV4dChcImN1dHNjZW5lXCIpO1xyXG5cdFx0XHR9KTtcclxuXHRcdFx0Ly9zZWxmLmF2YXRhcl9ub2RlLnBvc2l0aW9uLnNldCggY3VycmVudE1hcC5nZXQzRFRpbGVMb2NhdGlvbihzZWxmLmxvY2F0aW9uKSApO1xyXG5cdFx0fSk7XHJcblx0fSxcclxuXHRcclxuXHRjb250cm9sVGltZW91dDogMC4wLFxyXG5cdGNvbnRyb2xDaGFyYWN0ZXIgOiBmdW5jdGlvbihkZWx0YSkge1xyXG5cdFx0dmFyIHkgPSAoKGNvbnRyb2xsZXIuaXNEb3duKFwiVXBcIiwgXCJnYW1lXCIpKT8gLTE6MCkgKyAoKGNvbnRyb2xsZXIuaXNEb3duKFwiRG93blwiLCBcImdhbWVcIikpPyAxOjApO1xyXG5cdFx0dmFyIHggPSAoKGNvbnRyb2xsZXIuaXNEb3duKFwiTGVmdFwiLCBcImdhbWVcIikpPyAtMTowKSArICgoY29udHJvbGxlci5pc0Rvd24oXCJSaWdodFwiLCBcImdhbWVcIikpPyAxOjApO1xyXG5cdFx0XHJcblx0XHRpZiAoY29udHJvbGxlci5pc0Rvd25PbmNlKFwiSW50ZXJhY3RcIiwgXCJnYW1lXCIpICYmICF0aGlzLl9pbml0UGF0aGluZ1N0YXRlKCkubW92aW5nKSB7XHJcblx0XHRcdGN1cnJlbnRNYXAuZGlzcGF0Y2goXHJcblx0XHRcdFx0dGhpcy5sb2NhdGlvbi54IC0gdGhpcy5mYWNpbmcueCwgdGhpcy5sb2NhdGlvbi55ICsgdGhpcy5mYWNpbmcueiwgXHJcblx0XHRcdFx0XCJpbnRlcmFjdGVkXCIsIHRoaXMuZmFjaW5nKTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0dmFyIHJ1biA9IGNvbnRyb2xsZXIuaXNEb3duKFwiUnVuXCIsIFwiZ2FtZVwiKTtcclxuXHRcdFxyXG5cdFx0aWYgKCh5IHx8IHgpICYmICEoeCAmJiB5KSkgeyAvL29uZSwgYnV0IG5vdCBib3RoXHJcblx0XHRcdGlmICh0aGlzLmNvbnRyb2xUaW1lb3V0IDwgMSkge1xyXG5cdFx0XHRcdHRoaXMuY29udHJvbFRpbWVvdXQgKz0gQ09ORklHLnRpbWVvdXQud2Fsa0NvbnRyb2wgKiBkZWx0YTtcclxuXHRcdFx0XHRcclxuXHRcdFx0XHRpZiAoIXRoaXMuX2luaXRQYXRoaW5nU3RhdGUoKS5tb3ZpbmcpIHtcclxuXHRcdFx0XHRcdHRoaXMuZmFjZURpcih4LCB5KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0aWYgKCF0aGlzLl9pbml0UGF0aGluZ1N0YXRlKCkubW92aW5nKSB7XHJcblx0XHRcdFx0XHR0aGlzLm1vdmVUbyh0aGlzLmxvY2F0aW9uLngreCwgdGhpcy5sb2NhdGlvbi55K3ksIHtcclxuXHRcdFx0XHRcdFx0c3BlZWQ6IChydW4pPyAyIDogMSxcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0Ly9UaGlzIG1ha2VzIGl0IHNvIHlvdSBjYW4gdGFwIGEgZGlyZWN0aW9uIHRvIGZhY2UsIGluc3RlYWQgb2YganVzdCBhbHdheXMgd2Fsa2luZyBpbiBzYWlkIGRpcmVjdGlvblxyXG5cdFx0XHRpZiAodGhpcy5jb250cm9sVGltZW91dCA+IDApXHJcblx0XHRcdFx0dGhpcy5jb250cm9sVGltZW91dCAtPSBDT05GSUcudGltZW91dC53YWxrQ29udHJvbCAqIGRlbHRhO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0fSxcclxuXHRcclxuXHRhbmltYXRlQnVtcCA6IGZ1bmN0aW9uKHNyY3gsIHNyY3ksIHgsIHksIHJlYXNvbikge1xyXG5cdFx0Ly8gY29uc29sZS53YXJuKHRoaXMuaWQsIFwiOiBDYW5ub3Qgd2FsayB0byBsb2NhdGlvblwiLCBcIihcIit4K1wiLFwiK3krXCIpXCIpO1xyXG5cdFx0dGhpcy5wbGF5QW5pbWF0aW9uKFwiYnVtcFwiLCB7IHN0b3BOZXh0VHJhbnNpdGlvbjogdHJ1ZSB9KTtcclxuXHR9LFxyXG5cdFxyXG5cdFxyXG5cdC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cdGlzTlBDIDogZnVuY3Rpb24oKXsgcmV0dXJuIGZhbHNlOyB9LFxyXG5cdFxyXG5cdF9hdmF0YXJfbG9hZFNwcml0ZSA6IGZ1bmN0aW9uKG1hcCwgdGV4dHVyZSkge1xyXG5cdFx0dmFyIHVybCA9IEJBU0VVUkwrXCIvaW1nL3Bjcy9cIisgZ2FtZVN0YXRlLnBsYXllclNwcml0ZTtcclxuXHRcdHZhciByZXMgPSAvXihbXlxcW10rKVxcWyhbXlxcXV0rKVxcXS5wbmckLy5leGVjKHVybCk7XHJcblx0XHRcclxuXHRcdHZhciBuYW1lID0gcmVzWzFdO1xyXG5cdFx0dmFyIGZvcm1hdCA9IHJlc1syXTtcclxuXHRcdFxyXG5cdFx0dmFyIGltZyA9IG5ldyBJbWFnZSgpO1xyXG5cdFx0Zm9ybWF0ID0gdGhpcy5nZXRTcHJpdGVGb3JtYXQoZm9ybWF0KTtcclxuXHRcdHRoaXMuX19vbkxvYWRTcHJpdGUoaW1nLCBmb3JtYXQsIHRleHR1cmUpO1xyXG5cdFx0aW1nLnNyYyA9IHVybDtcclxuXHR9LFxyXG5cdFxyXG5cdC8vIE5ldXRlciB0aGUgbG9jYXRpb24gbm9ybWlsaXphdGlvbiBmb3IgdGhpcyBraW5kIG9mIGV2ZW50XHJcblx0X25vcm1hbGl6ZUxvY2F0aW9uIDogZnVuY3Rpb24oKSB7fSxcclxuXHRcclxufSk7XHJcbm1vZHVsZS5leHBvcnRzID0gUGxheWVyQ2hhcjtcclxuIiwiLy8gc3ByaXRlbW9kZWwuanNcclxuLy8gQSByZWR1eCBvZiB0aGUgVEhSRUUuanMgc3ByaXRlLCBidXQgbm90IHVzaW5nIHRoZSBzcHJpdGUgcGx1Z2luXHJcblxyXG52YXIgaW5oZXJpdHMgPSByZXF1aXJlKFwiaW5oZXJpdHNcIik7XHJcbnZhciBleHRlbmQgPSByZXF1aXJlKFwiZXh0ZW5kXCIpO1xyXG5cclxuZnVuY3Rpb24gQ2hhcmFjdGVyU3ByaXRlKG9wdHMpIHtcclxuXHRpZiAoISh0aGlzIGluc3RhbmNlb2YgQ2hhcmFjdGVyU3ByaXRlKSkge1xyXG5cdFx0cmV0dXJuIG5ldyBDaGFyYWN0ZXJTcHJpdGUob3B0cyk7XHJcblx0fVxyXG5cdHZhciBnYyA9IG9wdHMuZ2MgfHwgR0MuZ2V0QmluKCk7XHJcblx0XHJcblx0b3B0cyA9IGV4dGVuZCh7XHJcblx0XHR0cmFuc3BhcmVudDogdHJ1ZSxcclxuXHRcdGFscGhhVGVzdDogdHJ1ZSxcclxuXHR9LCBvcHRzKTtcclxuXHRcclxuXHRpZiAoIW9wdHMub2Zmc2V0KSBvcHRzLm9mZnNldCA9IG5ldyBUSFJFRS5WZWN0b3IzKDAsIDAsIDApO1xyXG5cdFxyXG5cdC8vVE9ETyByZXBsYWNlIHdpdGggZ2VvbWV0cnkgd2UgY2FuIGNvbnRyb2xcclxuXHQvLyB2YXIgZ2VvbSA9IG5ldyBUSFJFRS5QbGFuZUJ1ZmZlckdlb21ldHJ5KDEsIDEpO1xyXG5cdHZhciBnZW9tID0gbmV3IENoYXJhY3RlclBsYW5lR2VvbWV0cnkob3B0cy5vZmZzZXQpO1xyXG5cdGdjLmNvbGxlY3QoZ2VvbSk7XHJcblx0XHJcblx0dmFyIG1hdCA9IG5ldyBDaGFyYWN0ZXJTcHJpdGVNYXRlcmlhbChvcHRzKTtcclxuXHRnYy5jb2xsZWN0KG1hdCk7XHJcblx0XHJcblx0VEhSRUUuTWVzaC5jYWxsKHRoaXMsIGdlb20sIG1hdCk7XHJcblx0dGhpcy50eXBlID0gXCJDaGFyYWN0ZXJTcHJpdGVcIjtcclxuXHRcclxuXHRtYXQuc2NhbGUgPSBtYXQudW5pZm9ybXMuc2NhbGUudmFsdWUgPSB0aGlzLnNjYWxlO1xyXG5cdFxyXG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKHRoaXMsIHtcclxuXHRcdHdpZHRoOiB7XHJcblx0XHRcdGdldDogZnVuY3Rpb24oKSB7XHJcblx0XHRcdFx0cmV0dXJuIE1hdGguZmxvb3IoKHRoaXMubW9ycGhUYXJnZXRJbmZsdWVuY2VzWzBdICsgMSkgKiAzMik7XHJcblx0XHRcdH0sXHJcblx0XHRcdHNldDogZnVuY3Rpb24odmFsKSB7XHJcblx0XHRcdFx0dGhpcy5tb3JwaFRhcmdldEluZmx1ZW5jZXNbMF0gPSAodmFsIC8gMzIpIC0gMTtcclxuXHRcdFx0fSxcclxuXHRcdH0sXHJcblx0XHRoZWlnaHQ6IHtcclxuXHRcdFx0Z2V0OiBmdW5jdGlvbigpIHtcclxuXHRcdFx0XHRyZXR1cm4gTWF0aC5mbG9vcigodGhpcy5tb3JwaFRhcmdldEluZmx1ZW5jZXNbMV0gKyAxKSAqIDMyKTtcclxuXHRcdFx0fSxcclxuXHRcdFx0c2V0OiBmdW5jdGlvbih2YWwpIHtcclxuXHRcdFx0XHR0aGlzLm1vcnBoVGFyZ2V0SW5mbHVlbmNlc1sxXSA9ICh2YWwgLyAzMikgLSAxO1xyXG5cdFx0XHR9LFxyXG5cdFx0fSxcclxuXHR9KTtcclxufVxyXG5pbmhlcml0cyhDaGFyYWN0ZXJTcHJpdGUsIFRIUkVFLk1lc2gpO1xyXG5tb2R1bGUuZXhwb3J0cy5DaGFyYWN0ZXJTcHJpdGUgPSBDaGFyYWN0ZXJTcHJpdGU7XHJcblxyXG5cclxuZnVuY3Rpb24gQ2hhcmFjdGVyU3ByaXRlTWF0ZXJpYWwob3B0cykge1xyXG5cdGlmICghKHRoaXMgaW5zdGFuY2VvZiBDaGFyYWN0ZXJTcHJpdGVNYXRlcmlhbCkpIHtcclxuXHRcdHJldHVybiBuZXcgQ2hhcmFjdGVyU3ByaXRlTWF0ZXJpYWwob3B0cyk7XHJcblx0fVxyXG5cdFxyXG5cdC8vVE9ETyB3cml0ZSBpdCBzbyB3aGVuIHdlIHJlcGxhY2UgdGhlIHZhbHVlcyBoZXJlLCB3ZSByZXBsYWNlIHRoZSBvbmVzIGluIHRoZSB1bmlmb3Jtc1xyXG5cdC8vIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKHRoaXMsIHtcclxuXHQvLyBcdHV2T2Zmc2V0IDoge31cclxuXHQvLyB9KTtcclxuXHJcblx0dGhpcy5tYXAgPSBvcHRzLm1hcCB8fCBuZXcgVEhSRUUuVGV4dHVyZSgpO1xyXG5cdFxyXG5cdHRoaXMudXZPZmZzZXQgPSBvcHRzLnV2T2Zmc2V0IHx8IHRoaXMubWFwLm9mZnNldCB8fCBuZXcgVEhSRUUuVmVjdG9yMigwLCAwKTtcclxuXHR0aGlzLnV2U2NhbGUgPSBvcHRzLnV2U2NhbGUgfHwgdGhpcy5tYXAucmVwZWF0IHx8IG5ldyBUSFJFRS5WZWN0b3IyKDEsIDEpO1xyXG5cdFxyXG5cdHRoaXMucm90YXRpb24gPSBvcHRzLnJvdGF0aW9uIHx8IDA7XHJcblx0dGhpcy5zY2FsZSA9IG9wdHMuc2NhbGUgfHwgbmV3IFRIUkVFLlZlY3RvcjIoMSwgMSk7XHJcblx0XHJcblx0dGhpcy5jb2xvciA9IChvcHRzLmNvbG9yIGluc3RhbmNlb2YgVEhSRUUuQ29sb3IpPyBvcHRzLmNvbG9yIDogbmV3IFRIUkVFLkNvbG9yKG9wdHMuY29sb3IpO1xyXG5cdHRoaXMub3BhY2l0eSA9IG9wdHMub3BhY2l0eSB8fCAxO1xyXG5cdFxyXG5cdHZhciBwYXJhbXMgPSB0aGlzLl9jcmVhdGVNYXRQYXJhbXMob3B0cyk7XHJcblx0VEhSRUUuU2hhZGVyTWF0ZXJpYWwuY2FsbCh0aGlzLCBwYXJhbXMpO1xyXG5cdHRoaXMudHlwZSA9IFwiQ2hhcmFjdGVyU3ByaXRlTWF0ZXJpYWxcIjtcclxuXHRcclxuXHR0aGlzLnRyYW5zcGFyZW50ID0gKG9wdHMudHJhbnNwYXJlbnQgIT09IHVuZGVmaW5lZCk/IG9wdHMudHJhbnNwYXJlbnQgOiB0cnVlO1xyXG5cdHRoaXMuYWxwaGFUZXN0ID0gMC4wNTtcclxuXHQvLyB0aGlzLmRlcHRoV3JpdGUgPSBmYWxzZTtcclxuXHR0aGlzLm1vcnBoVGFyZ2V0cyA9IHRydWU7XHJcbn1cclxuaW5oZXJpdHMoQ2hhcmFjdGVyU3ByaXRlTWF0ZXJpYWwsIFRIUkVFLlNoYWRlck1hdGVyaWFsKTtcclxuZXh0ZW5kKENoYXJhY3RlclNwcml0ZU1hdGVyaWFsLnByb3RvdHlwZSwge1xyXG5cdG1hcCA6IG51bGwsXHJcblx0XHJcblx0X2NyZWF0ZU1hdFBhcmFtcyA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0c2hlZXJtYXQgPSBbXHJcblx0XHRcdDEsIDAsIDAsIDAsXHJcblx0XHRcdDAsIDEsIDAsIDAsXHJcblx0XHRcdDAsIDAsIDEsIC0wLjAwOSxcclxuXHRcdFx0MCwgMCwgMCwgMSxcclxuXHRcdF07XHJcblx0XHRcclxuXHRcdHZhciBwYXJhbXMgPSB7XHJcblx0XHRcdHVuaWZvcm1zIDoge1xyXG5cdFx0XHRcdHV2T2Zmc2V0Olx0eyB0eXBlOiBcInYyXCIsIHZhbHVlOiB0aGlzLnV2T2Zmc2V0IH0sXHJcblx0XHRcdFx0dXZTY2FsZTpcdHsgdHlwZTogXCJ2MlwiLCB2YWx1ZTogdGhpcy51dlNjYWxlIH0sXHJcblx0XHRcdFx0XHJcblx0XHRcdFx0cm90YXRpb246XHR7IHR5cGU6IFwiZlwiLCB2YWx1ZTogdGhpcy5yb3RhdGlvbiB9LFxyXG5cdFx0XHRcdHNjYWxlOlx0XHR7IHR5cGU6IFwidjJcIiwgdmFsdWU6IHRoaXMuc2NhbGUgfSxcclxuXHRcdFx0XHRcclxuXHRcdFx0XHRjb2xvcjpcdFx0eyB0eXBlOiBcImNcIiwgdmFsdWU6IHRoaXMuY29sb3IgfSxcclxuXHRcdFx0XHRtYXA6XHRcdHsgdHlwZTogXCJ0XCIsIHZhbHVlOiB0aGlzLm1hcCB9LFxyXG5cdFx0XHRcdG9wYWNpdHk6XHR7IHR5cGU6IFwiZlwiLCB2YWx1ZTogdGhpcy5vcGFjaXR5IH0sXHJcblx0XHRcdFx0XHJcblx0XHRcdFx0em9mZnNldDpcdHsgdHlwZTogXCJmXCIsIHZhbHVlOiAtMC4wMDkgfSxcclxuXHRcdFx0XHRzaGVlcjpcdFx0eyB0eXBlOiBcIm00XCIsIHZhbHVlOiBuZXcgVEhSRUUuTWF0cml4NCgpIH0sXHJcblx0XHRcdFx0XHJcblx0XHRcdFx0bW9ycGhUYXJnZXRJbmZsdWVuY2VzIDogeyB0eXBlOiBcImZcIiwgdmFsdWU6IDAgfSxcclxuXHRcdFx0fSxcclxuXHRcdH07XHJcblx0XHRcclxuXHRcdHBhcmFtcy52ZXJ0ZXhTaGFkZXIgPSB0aGlzLl92ZXJ0U2hhZGVyO1xyXG5cdFx0cGFyYW1zLmZyYWdtZW50U2hhZGVyID0gdGhpcy5fZnJhZ1NoYWRlcjtcclxuXHRcdHJldHVybiBwYXJhbXM7XHJcblx0fSxcclxuXHRcclxuXHRfdmVydFNoYWRlcjogW1xyXG5cdFx0Ly8gJ3VuaWZvcm0gbWF0NCBtb2RlbFZpZXdNYXRyaXg7JyxcclxuXHRcdC8vICd1bmlmb3JtIG1hdDQgcHJvamVjdGlvbk1hdHJpeDsnLFxyXG5cdFx0J3VuaWZvcm0gZmxvYXQgcm90YXRpb247JyxcclxuXHRcdCd1bmlmb3JtIHZlYzIgc2NhbGU7JyxcclxuXHRcdCd1bmlmb3JtIHZlYzIgdXZPZmZzZXQ7JyxcclxuXHRcdCd1bmlmb3JtIHZlYzIgdXZTY2FsZTsnLFxyXG5cdFx0XHJcblx0XHQndW5pZm9ybSBmbG9hdCB6b2Zmc2V0OycsXHJcblx0XHQndW5pZm9ybSBtYXQ0IHNoZWVyOycsXHJcblx0XHRcclxuXHRcdCcjaWZkZWYgVVNFX01PUlBIVEFSR0VUUycsXHJcblx0XHRcInVuaWZvcm0gZmxvYXQgbW9ycGhUYXJnZXRJbmZsdWVuY2VzWyA4IF07XCIsXHJcblx0XHQnI2VuZGlmJyxcclxuXHJcblx0XHQvLyAnYXR0cmlidXRlIHZlYzIgcG9zaXRpb247JyxcclxuXHRcdC8vICdhdHRyaWJ1dGUgdmVjMiB1djsnLFxyXG5cclxuXHRcdCd2YXJ5aW5nIHZlYzIgdlVWOycsXHJcblxyXG5cdFx0J3ZvaWQgbWFpbigpIHsnLFxyXG5cclxuXHRcdFx0J3ZVViA9IHV2T2Zmc2V0ICsgdXYgKiB1dlNjYWxlOycsXHJcblxyXG5cdFx0XHRcInZlYzMgbW9ycGhlZCA9IHZlYzMoIDAuMCApO1wiLFxyXG5cdFx0XHRcclxuXHRcdFx0JyNpZmRlZiBVU0VfTU9SUEhUQVJHRVRTJywgXHJcblx0XHRcdFwibW9ycGhlZCArPSAoIG1vcnBoVGFyZ2V0MCAtIHBvc2l0aW9uICkgKiBtb3JwaFRhcmdldEluZmx1ZW5jZXNbIDAgXTtcIixcclxuXHRcdFx0XCJtb3JwaGVkICs9ICggbW9ycGhUYXJnZXQxIC0gcG9zaXRpb24gKSAqIG1vcnBoVGFyZ2V0SW5mbHVlbmNlc1sgMSBdO1wiLFxyXG5cdFx0XHRcIm1vcnBoZWQgKz0gKCBtb3JwaFRhcmdldDIgLSBwb3NpdGlvbiApICogbW9ycGhUYXJnZXRJbmZsdWVuY2VzWyAyIF07XCIsXHJcblx0XHRcdFwibW9ycGhlZCArPSAoIG1vcnBoVGFyZ2V0MyAtIHBvc2l0aW9uICkgKiBtb3JwaFRhcmdldEluZmx1ZW5jZXNbIDMgXTtcIixcclxuXHRcdFx0XCJtb3JwaGVkICs9ICggbW9ycGhUYXJnZXQ0IC0gcG9zaXRpb24gKSAqIG1vcnBoVGFyZ2V0SW5mbHVlbmNlc1sgNCBdO1wiLFxyXG5cdFx0XHRcIm1vcnBoZWQgKz0gKCBtb3JwaFRhcmdldDUgLSBwb3NpdGlvbiApICogbW9ycGhUYXJnZXRJbmZsdWVuY2VzWyA1IF07XCIsXHJcblx0XHRcdFwibW9ycGhlZCArPSAoIG1vcnBoVGFyZ2V0NiAtIHBvc2l0aW9uICkgKiBtb3JwaFRhcmdldEluZmx1ZW5jZXNbIDYgXTtcIixcclxuXHRcdFx0XCJtb3JwaGVkICs9ICggbW9ycGhUYXJnZXQ3IC0gcG9zaXRpb24gKSAqIG1vcnBoVGFyZ2V0SW5mbHVlbmNlc1sgNyBdO1wiLFxyXG5cdFx0XHQnI2VuZGlmJyxcclxuXHRcdFx0XHJcblx0XHRcdFwibW9ycGhlZCArPSBwb3NpdGlvbjtcIixcclxuXHJcblx0XHRcdCd2ZWMyIGFsaWduZWRQb3NpdGlvbiA9IG1vcnBoZWQueHkgKiBzY2FsZTsnLFxyXG5cclxuXHRcdFx0J3ZlYzIgcm90YXRlZFBvc2l0aW9uOycsXHJcblx0XHRcdCdyb3RhdGVkUG9zaXRpb24ueCA9IGNvcyggcm90YXRpb24gKSAqIGFsaWduZWRQb3NpdGlvbi54IC0gc2luKCByb3RhdGlvbiApICogYWxpZ25lZFBvc2l0aW9uLnk7JyxcclxuXHRcdFx0J3JvdGF0ZWRQb3NpdGlvbi55ID0gc2luKCByb3RhdGlvbiApICogYWxpZ25lZFBvc2l0aW9uLnggKyBjb3MoIHJvdGF0aW9uICkgKiBhbGlnbmVkUG9zaXRpb24ueTsnLFxyXG5cdFx0XHRcclxuXHRcdFx0J21hdDQgenNoZWVyID0gbWF0NCgxLCAwLCAwLCAwLCcsXHJcblx0XHRcdFx0ICAgICAgICAgICAgICAgJzAsIDEsIDAsIDAsJyxcclxuXHRcdFx0XHQgICAgICAgICAgICAgICAnMCwgMCwgMSwgcG9zaXRpb24ueSAqIHpvZmZzZXQsJyxcclxuXHRcdFx0XHQgICAgICAgICAgICAgICAnMCwgMCwgMCwgMSk7JyxcclxuXHJcblx0XHRcdCd2ZWM0IHNoZWVyZm9yY2UgPSBtb2RlbFZpZXdNYXRyaXggKiB2ZWM0KDAsIHBvc2l0aW9uLnksIHBvc2l0aW9uLnosIDEpOycsXHJcblx0XHRcdFxyXG5cdFx0XHQndmVjNCBmaW5hbFBvc2l0aW9uOycsXHJcblxyXG5cdFx0XHQnZmluYWxQb3NpdGlvbiA9IG1vZGVsVmlld01hdHJpeCAqIHZlYzQoIDAuMCwgMC4wLCAwLjAsIDEuMCApOycsXHJcblx0XHRcdCdmaW5hbFBvc2l0aW9uLncgKz0gKHNoZWVyZm9yY2UueiAtIGZpbmFsUG9zaXRpb24ueikgKiB6b2Zmc2V0OycsXHJcblx0XHRcdCdmaW5hbFBvc2l0aW9uLnh5ICs9IHJvdGF0ZWRQb3NpdGlvbjsnLFxyXG5cdFx0XHQnZmluYWxQb3NpdGlvbiA9IHpzaGVlciAqIGZpbmFsUG9zaXRpb247JyxcclxuXHRcdFx0J2ZpbmFsUG9zaXRpb24gPSBzaGVlciAqIGZpbmFsUG9zaXRpb247JyxcclxuXHRcdFx0J2ZpbmFsUG9zaXRpb24gPSBwcm9qZWN0aW9uTWF0cml4ICogZmluYWxQb3NpdGlvbjsnLFxyXG5cdFx0XHRcclxuXHRcdFx0J2dsX1Bvc2l0aW9uID0gZmluYWxQb3NpdGlvbjsnLFxyXG5cclxuXHRcdCd9J1xyXG5cdF0uam9pbiggJ1xcbicgKSxcclxuXHRcclxuXHRfZnJhZ1NoYWRlcjogW1xyXG5cdFx0J3VuaWZvcm0gdmVjMyBjb2xvcjsnLFxyXG5cdFx0J3VuaWZvcm0gc2FtcGxlcjJEIG1hcDsnLFxyXG5cdFx0J3VuaWZvcm0gZmxvYXQgb3BhY2l0eTsnLFxyXG5cclxuXHRcdCd1bmlmb3JtIHZlYzMgZm9nQ29sb3I7JyxcclxuXHRcdCd1bmlmb3JtIGZsb2F0IGZvZ0RlbnNpdHk7JyxcclxuXHRcdCd1bmlmb3JtIGZsb2F0IGZvZ05lYXI7JyxcclxuXHRcdCd1bmlmb3JtIGZsb2F0IGZvZ0ZhcjsnLFxyXG5cclxuXHRcdCd2YXJ5aW5nIHZlYzIgdlVWOycsXHJcblxyXG5cdFx0J3ZvaWQgbWFpbigpIHsnLFxyXG5cclxuXHRcdFx0J3ZlYzQgdGV4dHVyZSA9IHRleHR1cmUyRCggbWFwLCB2VVYgKTsnLFxyXG5cclxuXHRcdFx0JyNpZmRlZiBBTFBIQVRFU1QnLFxyXG5cdFx0XHRcdCdpZiAoIHRleHR1cmUuYSA8IEFMUEhBVEVTVCApIGRpc2NhcmQ7JyxcclxuXHRcdFx0JyNlbmRpZicsXHJcblxyXG5cdFx0XHQnZ2xfRnJhZ0NvbG9yID0gdmVjNCggY29sb3IgKiB0ZXh0dXJlLnh5eiwgdGV4dHVyZS5hICogb3BhY2l0eSApOycsXHJcblxyXG5cdFx0XHQnI2lmZGVmIFVTRV9GT0cnLFxyXG5cdFx0XHRcdCdmbG9hdCBkZXB0aCA9IGdsX0ZyYWdDb29yZC56IC8gZ2xfRnJhZ0Nvb3JkLnc7JyxcclxuXHRcdFx0XHQnZmxvYXQgZm9nRmFjdG9yID0gMC4wOycsXHJcblx0XHRcdFx0XHJcblx0XHRcdFx0JyNpZm5kZWYgRk9HX0VYUDInLCAvL25vdGU6IE5PVCBkZWZpbmVkXHJcblx0XHRcdFx0XHJcblx0XHRcdFx0XHQnZm9nRmFjdG9yID0gc21vb3Roc3RlcCggZm9nTmVhciwgZm9nRmFyLCBkZXB0aCApOycsXHJcblx0XHRcdFx0XHRcclxuXHRcdFx0XHQnI2Vsc2UnLFxyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdFx0J2NvbnN0IGZsb2F0IExPRzIgPSAxLjQ0MjY5NTsnLFxyXG5cdFx0XHRcdFx0J2Zsb2F0IGZvZ0ZhY3RvciA9IGV4cDIoIC0gZm9nRGVuc2l0eSAqIGZvZ0RlbnNpdHkgKiBkZXB0aCAqIGRlcHRoICogTE9HMiApOycsXHJcblx0XHRcdFx0XHQnZm9nRmFjdG9yID0gMS4wIC0gY2xhbXAoIGZvZ0ZhY3RvciwgMC4wLCAxLjAgKTsnLFxyXG5cclxuXHRcdFx0XHQnI2VuZGlmJyxcclxuXHRcdFx0XHRcclxuXHRcdFx0XHQnZ2xfRnJhZ0NvbG9yID0gbWl4KCBnbF9GcmFnQ29sb3IsIHZlYzQoIGZvZ0NvbG9yLCBnbF9GcmFnQ29sb3IudyApLCBmb2dGYWN0b3IgKTsnLFxyXG5cclxuXHRcdFx0JyNlbmRpZicsXHJcblxyXG5cdFx0J30nXHJcblx0XS5qb2luKCAnXFxuJyApLFxyXG59KTtcclxubW9kdWxlLmV4cG9ydHMuQ2hhcmFjdGVyU3ByaXRlTWF0ZXJpYWwgPSBDaGFyYWN0ZXJTcHJpdGVNYXRlcmlhbDtcclxuXHJcblxyXG5cclxuZnVuY3Rpb24gQ2hhcmFjdGVyUGxhbmVHZW9tZXRyeShvZmYpIHtcclxuXHRUSFJFRS5HZW9tZXRyeS5jYWxsKHRoaXMpO1xyXG5cdFxyXG5cdHRoaXMudHlwZSA9IFwiQ2hhcmFjdGVyUGxhbmVHZW9tZXRyeVwiO1xyXG5cdHRoaXMudmVydGljZXMgPSBbXHJcblx0XHRuZXcgVEhSRUUuVmVjdG9yMyggLTAuNSArIG9mZi54LCAtMC41ICsgb2ZmLnksIDAgKyBvZmYueiApLFxyXG5cdFx0bmV3IFRIUkVFLlZlY3RvcjMoICAwLjUgKyBvZmYueCwgLTAuNSArIG9mZi55LCAwICsgb2ZmLnogKSxcclxuXHRcdG5ldyBUSFJFRS5WZWN0b3IzKCAgMC41ICsgb2ZmLngsICAwLjUgKyBvZmYueSwgMCArIG9mZi56ICksXHJcblx0XHRuZXcgVEhSRUUuVmVjdG9yMyggLTAuNSArIG9mZi54LCAgMC41ICsgb2ZmLnksIDAgKyBvZmYueiApLFxyXG5cdF07XHJcblx0XHJcblx0dGhpcy5mYWNlcy5wdXNoKG5ldyBUSFJFRS5GYWNlMygwLCAxLCAyKSk7XHJcblx0dGhpcy5mYWNlcy5wdXNoKG5ldyBUSFJFRS5GYWNlMygwLCAyLCAzKSk7XHJcblx0XHJcblx0dGhpcy5mYWNlVmVydGV4VXZzWzBdLnB1c2goWyB1digwLCAwKSwgdXYoMSwgMCksIHV2KDEsIDEpIF0pO1xyXG5cdHRoaXMuZmFjZVZlcnRleFV2c1swXS5wdXNoKFsgdXYoMCwgMCksIHV2KDEsIDEpLCB1digwLCAxKSBdKTtcclxuXHRcclxuXHR0aGlzLm1vcnBoVGFyZ2V0cyA9IFtcclxuXHRcdHsgbmFtZTogXCJ3aWR0aFwiLCB2ZXJ0aWNlczogW1xyXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMyggLTAuNSArIG9mZi54IC0gMC41LCAtMC41ICsgb2ZmLnksIDAgKyBvZmYueiApLFxyXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMyggIDAuNSArIG9mZi54ICsgMC41LCAtMC41ICsgb2ZmLnksIDAgKyBvZmYueiApLFxyXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMyggIDAuNSArIG9mZi54ICsgMC41LCAgMC41ICsgb2ZmLnksIDAgKyBvZmYueiApLFxyXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMyggLTAuNSArIG9mZi54IC0gMC41LCAgMC41ICsgb2ZmLnksIDAgKyBvZmYueiApLFxyXG5cdFx0XSB9LFxyXG5cdFx0eyBuYW1lOiBcImhlaWdodFwiLCB2ZXJ0aWNlczogW1xyXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMyggLTAuNSArIG9mZi54LCAtMC41ICsgb2ZmLnkgICAgLCAwICsgb2ZmLnogKSxcclxuXHRcdFx0bmV3IFRIUkVFLlZlY3RvcjMoICAwLjUgKyBvZmYueCwgLTAuNSArIG9mZi55ICAgICwgMCArIG9mZi56ICksXHJcblx0XHRcdG5ldyBUSFJFRS5WZWN0b3IzKCAgMC41ICsgb2ZmLngsICAwLjUgKyBvZmYueSArIDEsIDAgKyBvZmYueiApLFxyXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMyggLTAuNSArIG9mZi54LCAgMC41ICsgb2ZmLnkgKyAxLCAwICsgb2ZmLnogKSxcclxuXHRcdF0gfSxcclxuXHRdO1xyXG5cdFxyXG5cdGZ1bmN0aW9uIHV2KHgsIHkpIHsgcmV0dXJuIG5ldyBUSFJFRS5WZWN0b3IyKHgsIHkpOyB9XHJcbn1cclxuaW5oZXJpdHMoQ2hhcmFjdGVyUGxhbmVHZW9tZXRyeSwgVEhSRUUuR2VvbWV0cnkpO1xyXG5cclxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHJcblxyXG5cclxuZnVuY3Rpb24gQnViYmxlU3ByaXRlKCkge1xyXG5cdGlmICghKHRoaXMgaW5zdGFuY2VvZiBCdWJibGVTcHJpdGUpKSB7XHJcblx0XHRyZXR1cm4gbmV3IEJ1YmJsZVNwcml0ZSgpO1xyXG5cdH1cclxuXHRcclxuXHQvL1RPRE8gcmVwbGFjZSB3aXRoIGdlb21ldHJ5IHdlIGNhbiBjb250cm9sXHJcblx0Ly8gdmFyIGdlb20gPSBuZXcgVEhSRUUuUGxhbmVCdWZmZXJHZW9tZXRyeSgxLCAxKTtcclxuXHR2YXIgZ2VvbSA9IG5ldyBCdWJibGVQbGFuZUdlb21ldHJ5KG5ldyBUSFJFRS5WZWN0b3IzKDAsIDAsIDApKTtcclxuXHRcclxuXHRcclxuXHR2YXIgdGV4ID0gdGhpcy5fdGV4ID0gbmV3IFRIUkVFLlRleHR1cmUoKTtcclxuXHR0ZXgubWFnRmlsdGVyID0gVEhSRUUuTmVhcmVzdEZpbHRlcjtcclxuXHR0ZXgubWluRmlsdGVyID0gVEhSRUUuTmVhcmVzdEZpbHRlcjtcclxuXHR0ZXguYW5pc290cm9weSA9IDE7XHJcblx0dGV4LmdlbmVyYXRlTWlwbWFwcyA9IGZhbHNlO1xyXG5cdHRleC5yZXBlYXQgPSBuZXcgVEhSRUUuVmVjdG9yMigxNi8xMjgsIDE2LzY0KTtcclxuXHR0ZXgub2Zmc2V0ID0gbmV3IFRIUkVFLlZlY3RvcjIoMCwgMCk7XHJcblx0XHJcblx0dmFyIGltZyA9IG5ldyBJbWFnZSgpO1xyXG5cdGZ1bmN0aW9uIGYoKXtcclxuXHRcdHRleC5pbWFnZSA9IGltZztcclxuXHRcdHRleC5uZWVkc1VwZGF0ZSA9IHRydWU7XHJcblx0XHRpbWcucmVtb3ZlRXZlbnRMaXN0ZW5lcihcImxvYWRcIiwgZik7XHJcblx0fVxyXG5cdGltZy5vbihcImxvYWRcIiwgZik7XHJcblx0XHJcblx0aW1nLnNyYyA9IEJBU0VVUkwrXCIvaW1nL3VpL2Vtb3RlX2J1YmJsZS5wbmdcIjtcclxuXHRcclxuXHR2YXIgbWF0ID0gdGhpcy5fbWF0ID0gbmV3IENoYXJhY3RlclNwcml0ZU1hdGVyaWFsKHtcclxuXHRcdG1hcDogdGV4LFxyXG5cdFx0bW9ycGhUYXJnZXRzOiB0cnVlLFxyXG5cdFx0dHJhbnNwYXJlbnQ6IHRydWUsXHJcblx0XHRhbHBoYVRlc3Q6IDAuMDUsXHJcblx0fSk7XHJcblx0bWF0LnVuaWZvcm1zLnpvZmZzZXQudmFsdWUgPSAtMC4wMjtcclxuXHRcclxuXHRcclxuXHRUSFJFRS5NZXNoLmNhbGwodGhpcywgZ2VvbSwgbWF0KTtcclxuXHR0aGlzLnR5cGUgPSBcIkJ1YmJsZVNwcml0ZVwiO1xyXG5cdFxyXG5cdG1hdC5zY2FsZSA9IG1hdC51bmlmb3Jtcy5zY2FsZS52YWx1ZSA9IHRoaXMuc2NhbGU7XHJcblx0XHJcblx0T2JqZWN0LmRlZmluZVByb3BlcnRpZXModGhpcywge1xyXG5cdFx0eG9mZjoge1xyXG5cdFx0XHRnZXQ6IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRcdHJldHVybiBNYXRoLmZsb29yKCh0aGlzLm1vcnBoVGFyZ2V0SW5mbHVlbmNlc1swXSArIDEpICogMzIpO1xyXG5cdFx0XHR9LFxyXG5cdFx0XHRzZXQ6IGZ1bmN0aW9uKHZhbCkge1xyXG5cdFx0XHRcdHRoaXMubW9ycGhUYXJnZXRJbmZsdWVuY2VzWzBdID0gKHZhbCAvIDMyKSAtIDE7XHJcblx0XHRcdH0sXHJcblx0XHR9LFxyXG5cdFx0aGVpZ2h0OiB7XHJcblx0XHRcdGdldDogZnVuY3Rpb24oKSB7XHJcblx0XHRcdFx0cmV0dXJuIE1hdGguZmxvb3IoKHRoaXMubW9ycGhUYXJnZXRJbmZsdWVuY2VzWzFdICsgMSkgKiAzMik7XHJcblx0XHRcdH0sXHJcblx0XHRcdHNldDogZnVuY3Rpb24odmFsKSB7XHJcblx0XHRcdFx0dGhpcy5tb3JwaFRhcmdldEluZmx1ZW5jZXNbMV0gPSAodmFsIC8gMzIpIC0gMTtcclxuXHRcdFx0fSxcclxuXHRcdH0sXHJcblx0XHRzaHJpbms6IHtcclxuXHRcdFx0Z2V0OiBmdW5jdGlvbigpIHtcclxuXHRcdFx0XHRyZXR1cm4gKHRoaXMubW9ycGhUYXJnZXRJbmZsdWVuY2VzWzJdKTtcclxuXHRcdFx0fSxcclxuXHRcdFx0c2V0OiBmdW5jdGlvbih2YWwpIHtcclxuXHRcdFx0XHR0aGlzLm1vcnBoVGFyZ2V0SW5mbHVlbmNlc1syXSA9IE1hdGguY2xhbXAodmFsKTtcclxuXHRcdFx0fSxcclxuXHRcdH0sXHJcblx0fSk7XHJcblx0dGhpcy5zaHJpbmsgPSAxO1xyXG59XHJcbmluaGVyaXRzKEJ1YmJsZVNwcml0ZSwgVEhSRUUuTWVzaCk7XHJcbmV4dGVuZChCdWJibGVTcHJpdGUucHJvdG90eXBlLCB7XHJcblx0X3RleDogbnVsbCxcclxuXHRfbWF0OiBudWxsLFxyXG5cdHR5cGU6IG51bGwsXHJcblx0X190eXBlcyA6IHtcdC8vXHQgeDEgeTEgeDIgeTJcclxuXHRcdFwiYmxhbmtcIjpcdFsgMCwgMCwgMCwgMF0sXHJcblx0XHRcIi4uLlwiOiBcdFx0WyAwLCAzLCAxLCAzXSxcclxuXHRcdFwiIVwiOiBcdFx0WyAwLCAyLCAxLCAyXSwgXCJleGNsYWltXCIgOiBcIiFcIixcclxuXHRcdFwiP1wiOiBcdFx0WyAwLCAxLCAxLCAxXSwgXCJxdWVzdGlvblwiOiBcIj9cIixcclxuXHRcdFwic2luZ1wiOiBcdFsgMiwgMywgMywgM10sXHJcblx0XHRcIjwzXCI6IFx0XHRbIDIsIDIsIDMsIDJdLCBcImhlYXJ0XCI6IFwiPDNcIixcclxuXHRcdFwicG9zaW9uXCI6IFx0WyAyLCAxLCAzLCAxXSxcclxuXHRcdFwiOilcIjogXHRcdFsgNCwgMywgNSwgM10sIFwiaGFwcHlcIjogXCI6KVwiLFxyXG5cdFx0XCI6RFwiOiBcdFx0WyA0LCAyLCA1LCAyXSwgXCJleGNpdGVkXCI6IFwiOkRcIixcclxuXHRcdFwiOihcIjogXHRcdFsgNCwgMSwgNSwgMV0sIFwic2FkXCI6IFwiOihcIixcclxuXHRcdFwiPjooXCI6XHRcdFsgNiwgMywgNywgM10sIFwiZGlzYWdyZWVcIjogXCI+OihcIixcclxuXHRcdFwiRDo8XCI6IFx0XHRbIDYsIDIsIDcsIDJdLCBcImFuZ3J5XCI6IFwiRDo8XCIsXHJcblx0XHRcIj46KVwiOiBcdFx0WyA2LCAxLCA3LCAxXSwgXCJldmlsXCI6IFwiPjopXCIsXHJcblx0fSxcclxuXHRcclxuXHRzZXRUeXBlIDogZnVuY3Rpb24odHlwZSkge1xyXG5cdFx0dGhpcy50eXBlID0gdGhpcy5fX3R5cGVzW3R5cGVdO1xyXG5cdFx0d2hpbGUgKHRoaXMudHlwZSAmJiAhJC5pc0FycmF5KHRoaXMudHlwZSkpIHtcclxuXHRcdFx0dGhpcy50eXBlID0gdGhpcy5fX3R5cGVzW3RoaXMudHlwZV07XHJcblx0XHR9XHJcblx0XHRpZiAoIXRoaXMudHlwZSkge1xyXG5cdFx0XHR0aGlzLnR5cGUgPSB0aGlzLl9fdHlwZXNbXCJibGFua1wiXTtcclxuXHRcdFx0dGhpcy50aW1lb3V0ID0gMTtcclxuXHRcdH1cclxuXHRcdHRoaXMuX2FscGhhID0gMDtcclxuXHRcdHRoaXMuX2ZyYW1lbm8gPSAwO1xyXG5cdFx0dGhpcy5fdGljaygwKTtcclxuXHR9LFxyXG5cdFxyXG5cdHNldFRpbWVvdXQ6IGZ1bmN0aW9uKHRvKSB7XHJcblx0XHR0aGlzLnRpbWVvdXQgPSB0bztcclxuXHR9LFxyXG5cdFxyXG5cdF9zaG93X2NhbGxiYWNrOiBudWxsLFxyXG5cdF9oaWRlX2NhbGxiYWNrOiBudWxsLFxyXG5cdF9vcGFjaXR5X2Rlc3Q6IDAsXHJcblx0X29wYWNpdHlfY3VycjogMCxcclxuXHRzaG93OiBmdW5jdGlvbihjYWxsYmFjaykge1xyXG5cdFx0Ly8gdGhpcy52aXNpYmxlID0gdHJ1ZTtcclxuXHRcdHRoaXMuX29wYWNpdHlfZGVzdCA9IDE7XHJcblx0XHR0aGlzLl9zaG93X2NhbGxiYWNrID0gY2FsbGJhY2s7XHJcblx0fSxcclxuXHRoaWRlOiBmdW5jdGlvbihjYWxsYmFjaykge1xyXG5cdFx0Ly8gdGhpcy52aXNpYmxlID0gZmFsc2U7XHJcblx0XHR0aGlzLl9vcGFjaXR5X2Rlc3QgPSAwO1xyXG5cdFx0dGhpcy5fc2hvd19jYWxsYmFjayA9IGNhbGxiYWNrO1xyXG5cdH0sXHJcblx0XHJcblx0X2FscGhhOiAwLFxyXG5cdF9mcmFtZW5vOiAwLFxyXG5cdF90aWNrOiBmdW5jdGlvbihkZWx0YSkge1xyXG5cdFx0aWYgKCF0aGlzLnR5cGUpIHJldHVybjtcclxuXHRcdHZhciBzZWxmID0gdGhpcztcclxuXHRcdHRoaXMuX2FscGhhIC09IGRlbHRhO1xyXG5cdFx0XHJcblx0XHRpZiAodGhpcy50aW1lb3V0ID4gMCkge1xyXG5cdFx0XHR0aGlzLnRpbWVvdXQgLT0gZGVsdGE7XHJcblx0XHRcdGlmICh0aGlzLnRpbWVvdXQgPCAwKSB7XHJcblx0XHRcdFx0dGhpcy5oaWRlKGZ1bmN0aW9uKCl7XHJcblx0XHRcdFx0XHRzZWxmLnJlbGVhc2UoKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHRpZiAodGhpcy5fb3BhY2l0eV9jdXJyID4gdGhpcy5fb3BhY2l0eV9kZXN0KSB7XHJcblx0XHRcdHRoaXMuX29wYWNpdHlfY3VyciAtPSAoZGVsdGEgKiBDT05GSUcuc3BlZWQuYnViYmxlcG9wKTtcclxuXHRcdFx0dGhpcy5zaHJpbmsgPSAxLXRoaXMuX29wYWNpdHlfY3VycjtcclxuXHRcdFx0dGhpcy5fbWF0Lm9wYWNpdHkgPSBNYXRoLmNsYW1wKHRoaXMuX29wYWNpdHlfY3Vycik7XHJcblx0XHRcdGlmICh0aGlzLl9vcGFjaXR5X2N1cnIgPD0gdGhpcy5fb3BhY2l0eV9kZXN0KSB7XHJcblx0XHRcdFx0aWYgKHRoaXMuX2hpZGVfY2FsbGJhY2spIHtcclxuXHRcdFx0XHRcdHRoaXMuX2hpZGVfY2FsbGJhY2soKTtcclxuXHRcdFx0XHRcdHRoaXMuX2hpZGVfY2FsbGJhY2sgPSBudWxsO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHR0aGlzLl9vcGFjaXR5X2N1cnIgPSBNYXRoLmNsYW1wKHRoaXMuX29wYWNpdHlfY3Vycik7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdGVsc2UgaWYgKHRoaXMuX29wYWNpdHlfY3VyciA8IHRoaXMuX29wYWNpdHlfZGVzdCkge1xyXG5cdFx0XHR0aGlzLl9vcGFjaXR5X2N1cnIgKz0gKGRlbHRhICogQ09ORklHLnNwZWVkLmJ1YmJsZXBvcCk7XHJcblx0XHRcdHRoaXMuc2hyaW5rID0gMS10aGlzLl9vcGFjaXR5X2N1cnI7XHJcblx0XHRcdHRoaXMuX21hdC5vcGFjaXR5ID0gTWF0aC5jbGFtcCh0aGlzLl9vcGFjaXR5X2N1cnIpO1xyXG5cdFx0XHRpZiAodGhpcy5fb3BhY2l0eV9jdXJyID49IHRoaXMuX29wYWNpdHlfZGVzdCkge1xyXG5cdFx0XHRcdGlmICh0aGlzLl9zaG93X2NhbGxiYWNrKSB7XHJcblx0XHRcdFx0XHR0aGlzLl9zaG93X2NhbGxiYWNrKCk7XHJcblx0XHRcdFx0XHR0aGlzLl9zaG93X2NhbGxiYWNrID0gbnVsbDtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0dGhpcy5fb3BhY2l0eV9jdXJyID0gTWF0aC5jbGFtcCh0aGlzLl9vcGFjaXR5X2N1cnIpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdGlmICh0aGlzLl9hbHBoYSA8PSAwKSB7XHJcblx0XHRcdHRoaXMuX2FscGhhID0gNTtcclxuXHRcdFx0XHJcblx0XHRcdHRoaXMuX2ZyYW1lbm8gPSAodGhpcy5fZnJhbWVubyArIDEpICUgMjtcclxuXHRcdFx0dmFyIGZuID0gdGhpcy5fZnJhbWVubyAqIDI7XHJcblx0XHRcdFxyXG5cdFx0XHR0aGlzLl90ZXgub2Zmc2V0LnggPSB0aGlzLnR5cGVbZm4gIF0gKiB0aGlzLl90ZXgucmVwZWF0Lng7XHJcblx0XHRcdHRoaXMuX3RleC5vZmZzZXQueSA9IHRoaXMudHlwZVtmbisxXSAqIHRoaXMuX3RleC5yZXBlYXQueTtcclxuXHRcdH1cclxuXHR9LFxyXG59KTtcclxubW9kdWxlLmV4cG9ydHMuQnViYmxlU3ByaXRlID0gQnViYmxlU3ByaXRlO1xyXG5cclxuXHJcbmZ1bmN0aW9uIEJ1YmJsZVBsYW5lR2VvbWV0cnkob2ZmKSB7XHJcblx0VEhSRUUuR2VvbWV0cnkuY2FsbCh0aGlzKTtcclxuXHR2YXIgQlNJWkUgPSAwLjM4O1xyXG5cdFxyXG5cdHRoaXMudHlwZSA9IFwiQnViYmxlUGxhbmVHZW9tZXRyeVwiO1xyXG5cdHRoaXMudmVydGljZXMgPSBbXHJcblx0XHRuZXcgVEhSRUUuVmVjdG9yMyggLUJTSVpFICsgb2ZmLngsIDEuNSAtIEJTSVpFICsgb2ZmLnksIC0wLjAxICsgb2ZmLnogKSxcclxuXHRcdG5ldyBUSFJFRS5WZWN0b3IzKCAgQlNJWkUgKyBvZmYueCwgMS41IC0gQlNJWkUgKyBvZmYueSwgLTAuMDEgKyBvZmYueiApLFxyXG5cdFx0bmV3IFRIUkVFLlZlY3RvcjMoICBCU0laRSArIG9mZi54LCAxLjUgKyBCU0laRSArIG9mZi55LCAtMC4wMSArIG9mZi56ICksXHJcblx0XHRuZXcgVEhSRUUuVmVjdG9yMyggLUJTSVpFICsgb2ZmLngsIDEuNSArIEJTSVpFICsgb2ZmLnksIC0wLjAxICsgb2ZmLnogKSxcclxuXHRdO1xyXG5cdFxyXG5cdHRoaXMuZmFjZXMucHVzaChuZXcgVEhSRUUuRmFjZTMoMCwgMSwgMikpO1xyXG5cdHRoaXMuZmFjZXMucHVzaChuZXcgVEhSRUUuRmFjZTMoMCwgMiwgMykpO1xyXG5cdFxyXG5cdHRoaXMuZmFjZVZlcnRleFV2c1swXS5wdXNoKFsgdXYoMC4wMDUsIDAuMDA1KSwgdXYoMC45OTUsIDAuMDA1KSwgdXYoMC45OTUsIDAuOTk1KSBdKTtcclxuXHR0aGlzLmZhY2VWZXJ0ZXhVdnNbMF0ucHVzaChbIHV2KDAuMDA1LCAwLjAwNSksIHV2KDAuOTk1LCAwLjk5NSksIHV2KDAuMDA1LCAwLjk5NSkgXSk7XHJcblx0XHJcblx0dGhpcy5tb3JwaFRhcmdldHMgPSBbXHJcblx0XHR7IG5hbWU6IFwib2ZmeFwiLCB2ZXJ0aWNlczogW1xyXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMyggLUJTSVpFICsgb2ZmLnggKyAxLCAxIC0gQlNJWkUgKyBvZmYueSwgLTAuMDEgKyBvZmYueiApLFxyXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMyggIEJTSVpFICsgb2ZmLnggKyAxLCAxIC0gQlNJWkUgKyBvZmYueSwgLTAuMDEgKyBvZmYueiApLFxyXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMyggIEJTSVpFICsgb2ZmLnggKyAxLCAxICsgQlNJWkUgKyBvZmYueSwgLTAuMDEgKyBvZmYueiApLFxyXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMyggLUJTSVpFICsgb2ZmLnggKyAxLCAxICsgQlNJWkUgKyBvZmYueSwgLTAuMDEgKyBvZmYueiApLFxyXG5cdFx0XSB9LFxyXG5cdFx0eyBuYW1lOiBcImhlaWdodFwiLCB2ZXJ0aWNlczogW1xyXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMyggLUJTSVpFICsgb2ZmLngsIDEgLSBCU0laRSArIG9mZi55ICsgMSwgLTAuMDEgKyBvZmYueiApLFxyXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMyggIEJTSVpFICsgb2ZmLngsIDEgLSBCU0laRSArIG9mZi55ICsgMSwgLTAuMDEgKyBvZmYueiApLFxyXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMyggIEJTSVpFICsgb2ZmLngsIDEgKyBCU0laRSArIG9mZi55ICsgMSwgLTAuMDEgKyBvZmYueiApLFxyXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMyggLUJTSVpFICsgb2ZmLngsIDEgKyBCU0laRSArIG9mZi55ICsgMSwgLTAuMDEgKyBvZmYueiApLFxyXG5cdFx0XSB9LFxyXG5cdFx0eyBuYW1lOiBcInNocmlua1wiLCB2ZXJ0aWNlczogW1xyXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMyggb2ZmLngsIDEgKyBvZmYueSwgLTAuMDEgKyBvZmYueiApLFxyXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMyggb2ZmLngsIDEgKyBvZmYueSwgLTAuMDEgKyBvZmYueiApLFxyXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMyggb2ZmLngsIDEgKyBvZmYueSwgLTAuMDEgKyBvZmYueiApLFxyXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMyggb2ZmLngsIDEgKyBvZmYueSwgLTAuMDEgKyBvZmYueiApLFxyXG5cdFx0XSB9LFxyXG5cdF07XHJcblx0XHJcblx0ZnVuY3Rpb24gdXYoeCwgeSkgeyByZXR1cm4gbmV3IFRIUkVFLlZlY3RvcjIoeCwgeSk7IH1cclxufVxyXG5pbmhlcml0cyhCdWJibGVQbGFuZUdlb21ldHJ5LCBUSFJFRS5HZW9tZXRyeSk7XHJcblxyXG5cclxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cclxuXHJcbmZ1bmN0aW9uIFNwcml0ZUdsb3dNYXRlcmlhbChvcHRzKSB7XHJcblx0aWYgKCEodGhpcyBpbnN0YW5jZW9mIFNwcml0ZUdsb3dNYXRlcmlhbCkpIHtcclxuXHRcdHJldHVybiBuZXcgU3ByaXRlR2xvd01hdGVyaWFsKG9wdHMpO1xyXG5cdH1cclxuXHRcclxuXHQvL1RPRE8gd3JpdGUgaXQgc28gd2hlbiB3ZSByZXBsYWNlIHRoZSB2YWx1ZXMgaGVyZSwgd2UgcmVwbGFjZSB0aGUgb25lcyBpbiB0aGUgdW5pZm9ybXNcclxuXHQvLyBPYmplY3QuZGVmaW5lUHJvcGVydGllcyh0aGlzLCB7XHJcblx0Ly8gXHR1dk9mZnNldCA6IHt9XHJcblx0Ly8gfSk7XHJcblxyXG5cdHRoaXMuY29sb3IgPSAob3B0cy5jb2xvciBpbnN0YW5jZW9mIFRIUkVFLkNvbG9yKT8gb3B0cy5jb2xvciA6IG5ldyBUSFJFRS5Db2xvcihvcHRzLmNvbG9yKTtcclxuXHQvLyB0aGlzLm9wYWNpdHkgPSBvcHRzLm9wYWNpdHkgfHwgMTtcclxuXHRcclxuXHR2YXIgcGFyYW1zID0gdGhpcy5fY3JlYXRlTWF0UGFyYW1zKG9wdHMpO1xyXG5cdFRIUkVFLlNoYWRlck1hdGVyaWFsLmNhbGwodGhpcywgcGFyYW1zKTtcclxuXHR0aGlzLnR5cGUgPSBcIlNwcml0ZUdsb3dNYXRlcmlhbFwiO1xyXG5cdFxyXG5cdHRoaXMudHJhbnNwYXJlbnQgPSAob3B0cy50cmFuc3BhcmVudCAhPT0gdW5kZWZpbmVkKT8gb3B0cy50cmFuc3BhcmVudCA6IHRydWU7XHJcblx0dGhpcy5hbHBoYVRlc3QgPSAwLjA1O1xyXG5cdC8vIHRoaXMuZGVwdGhXcml0ZSA9IGZhbHNlO1xyXG59XHJcbmluaGVyaXRzKFNwcml0ZUdsb3dNYXRlcmlhbCwgVEhSRUUuU2hhZGVyTWF0ZXJpYWwpO1xyXG5leHRlbmQoU3ByaXRlR2xvd01hdGVyaWFsLnByb3RvdHlwZSwge1xyXG5cdG1hcCA6IG51bGwsXHJcblx0XHJcblx0X2NyZWF0ZU1hdFBhcmFtcyA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0dmFyIHBhcmFtcyA9IHtcclxuXHRcdFx0dW5pZm9ybXMgOiB7XHJcblx0XHRcdFx0XCJjXCI6ICAgeyB0eXBlOiBcImZcIiwgdmFsdWU6IDEuMCB9LFxyXG5cdFx0XHRcdFwicFwiOiAgIHsgdHlwZTogXCJmXCIsIHZhbHVlOiAxLjQgfSxcclxuXHRcdFx0XHRnbG93Q29sb3I6IHsgdHlwZTogXCJjXCIsIHZhbHVlOiB0aGlzLmNvbG9yIH0sLy9uZXcgVEhSRUUuQ29sb3IoMHhmZmZmMDApIH0sXHJcblx0XHRcdFx0Ly8gdmlld1ZlY3RvcjogeyB0eXBlOiBcInYzXCIsIHZhbHVlOiBjYW1lcmEucG9zaXRpb24gfVxyXG5cdFx0XHR9LFxyXG5cdFx0fTtcclxuXHRcdFxyXG5cdFx0cGFyYW1zLnZlcnRleFNoYWRlciA9IHRoaXMuX3ZlcnRTaGFkZXI7XHJcblx0XHRwYXJhbXMuZnJhZ21lbnRTaGFkZXIgPSB0aGlzLl9mcmFnU2hhZGVyO1xyXG5cdFx0cGFyYW1zLmJsZW5kaW5nID0gVEhSRUUuQWRkaXRpdmVCbGVuZGluZztcclxuXHRcdHJldHVybiBwYXJhbXM7XHJcblx0fSxcclxuXHRcclxuXHRfdmVydFNoYWRlcjogW1xyXG5cdFx0Ly8gXCJ1bmlmb3JtIHZlYzMgdmlld1ZlY3RvcjtcIixcclxuXHRcdFwidW5pZm9ybSBmbG9hdCBjO1wiLFxyXG5cdFx0XCJ1bmlmb3JtIGZsb2F0IHA7XCIsXHJcblx0XHRcInZhcnlpbmcgZmxvYXQgaW50ZW5zaXR5O1wiLFxyXG5cdFx0XHJcblx0XHRcInZvaWQgbWFpbigpIHtcIixcclxuXHRcdFx0XCJ2ZWMzIHZOb3JtID0gbm9ybWFsaXplKCBub3JtYWxNYXRyaXggKiBub3JtYWwgKTtcIixcclxuXHRcdFx0Ly8gXCJ2ZWMzIHZOb3JtQ2FtZXJhID0gbm9ybWFsaXplKCBub3JtYWxNYXRyaXggKiB2aWV3VmVjdG9yICk7XCIsXHJcblx0XHRcdFwidmVjMyB2Tm9ybUNhbWVyYSA9IG5vcm1hbGl6ZSggbm9ybWFsTWF0cml4ICogbm9ybWFsaXplKCBtb2RlbFZpZXdNYXRyaXggKiB2ZWM0KDAsIDAsIDEsIDEpICkueHl6ICk7XCIsXHJcblx0XHRcdFwiaW50ZW5zaXR5ID0gcG93KCBjIC0gZG90KHZOb3JtLCB2Tm9ybUNhbWVyYSksIHAgKTtcIixcclxuXHRcdFx0XHJcblx0XHRcdFwiZ2xfUG9zaXRpb24gPSBwcm9qZWN0aW9uTWF0cml4ICogbW9kZWxWaWV3TWF0cml4ICogdmVjNCggcG9zaXRpb24sIDEuMCApO1wiLFxyXG5cdFx0XCJ9XCIsXHJcblx0XS5qb2luKFwiXFxuXCIpLFxyXG5cdFxyXG5cdF9mcmFnU2hhZGVyOiBbXHJcblx0XHRcInVuaWZvcm0gdmVjMyBnbG93Q29sb3I7XCIsXHJcblx0XHRcInZhcnlpbmcgZmxvYXQgaW50ZW5zaXR5O1wiLFxyXG5cdFx0XHJcblx0XHRcInZvaWQgbWFpbigpIHtcIixcclxuXHRcdFx0XCJ2ZWMzIGdsb3cgPSBnbG93Q29sb3IgKiBpbnRlbnNpdHk7XCIsXHJcblx0XHRcdFwiZ2xfRnJhZ0NvbG9yID0gdmVjNCggZ2xvdywgMS4wICk7XCIsXHJcblx0XHRcIn1cIixcclxuXHRdLmpvaW4oXCJcXG5cIiksXHJcbn0pO1xyXG5tb2R1bGUuZXhwb3J0cy5TcHJpdGVHbG93TWF0ZXJpYWwgPSBTcHJpdGVHbG93TWF0ZXJpYWw7XHJcbiIsIi8vIHRHYWxsZXJ5LmpzXHJcbi8vIERlZmluZXMgdGhlIGJhc2UgZXZlbnQgdGhhdCBhY3RvcnMgaGF2ZSBpbiB0aGUgdEdhbGxlcnkgdGVzdCBtYXAuXHJcblxyXG52YXIgaW5oZXJpdHMgPSByZXF1aXJlKFwiaW5oZXJpdHNcIik7XHJcbnZhciBleHRlbmQgPSByZXF1aXJlKFwiZXh0ZW5kXCIpO1xyXG5cclxudmFyIEFjdG9yID0gcmVxdWlyZShcInRwcC1hY3RvclwiKTtcclxudmFyIE1lYW5kZXJCZWhhdiA9IHJlcXVpcmUoXCJ0cHAtYmVoYXZpb3JcIikuTWVhbmRlcjtcclxudmFyIFRhbGtpbmdCZWhhdiA9IHJlcXVpcmUoXCJ0cHAtYmVoYXZpb3JcIikuVGFsa2luZztcclxuXHJcbmZ1bmN0aW9uIEFjdG9yR2FsYShiYXNlLCBleHQpIHtcclxuXHRleHQgPSBleHRlbmQoe1xyXG5cdFx0bG9jYXRpb246IFwicmFuZFwiLFxyXG5cdFx0b25FdmVudHM6IHtcclxuXHRcdFx0aW50ZXJhY3RlZDogZnVuY3Rpb24oKSB7XHJcblx0XHRcdFx0dmFyIHNlbGYgPSB0aGlzO1xyXG5cdFx0XHRcdCQoXCIjc3RhdHVzYmFyXCIpLmh0bWwoXCJUaGlzIGlzIFwiK3RoaXMubmFtZStcIiEgKFwiK3RoaXMuaWQrXCIpPGJyLz5UaGlzIHNwcml0ZSB3YXMgY3JlYXRlZCBieSBcIit0aGlzLnNwcml0ZV9jcmVhdG9yK1wiIVwiKTtcclxuXHRcdFx0XHR2YXIgZGxvZyA9IHNlbGYuZGlhbG9nIHx8IFtcclxuXHRcdFx0XHRcdFwiXCIrdGhpcy5uYW1lK1wiIHdhdmVzIGF0IHlvdSBpbiBncmVldGluZyBiZWZvcmUgY29udGludWluZyB0byBtZWFuZGVyIGFib3V0IHRoZSBHYWxsZXJ5LlwiXHJcblx0XHRcdFx0XTtcclxuXHRcdFx0XHRcclxuXHRcdFx0XHQvLyBVSS5zaG93VGV4dEJveChzZWxmLmRpYWxvZ190eXBlLCBkbG9nLCB7IGNvbXBsZXRlOiBmdW5jdGlvbigpe1xyXG5cdFx0XHRcdC8vIFx0c2VsZi5iZWhhdmlvclN0YWNrLnBvcCgpO1xyXG5cdFx0XHRcdC8vIH19KTtcclxuXHRcdFx0XHQvLyBzZWxmLmJlaGF2aW9yU3RhY2sucHVzaChUYWxraW5nQmVoYXYpO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdHNlbGYuYmVoYXZpb3JTdGFjay5wdXNoKG5ldyBUYWxraW5nQmVoYXYoe1xyXG5cdFx0XHRcdFx0ZGlhbG9nOiBkbG9nLFxyXG5cdFx0XHRcdFx0ZGlhbG9nX3R5cGU6IHNlbGYuZGlhbG9nX3R5cGUsXHJcblx0XHRcdFx0XHRvd25lcjogc2VsZixcclxuXHRcdFx0XHR9KSk7XHJcblx0XHRcdH0sXHJcblx0XHR9LFxyXG5cdFx0XHJcblx0XHRkaWFsb2dfdHlwZTogXCJ0ZXh0XCIsXHJcblx0XHRkaWFsb2c6IG51bGwsXHJcblx0XHRcclxuXHRcdGJlaGF2aW9yU3RhY2s6IFtuZXcgTWVhbmRlckJlaGF2KCldLFxyXG5cdFx0XHJcblx0XHRzaG91bGRBcHBlYXI6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdHJ1ZTsgfSxcclxuXHRcdFxyXG5cdH0sIGV4dCk7XHJcblx0QWN0b3IuY2FsbCh0aGlzLCBiYXNlLCBleHQpO1xyXG59XHJcbmluaGVyaXRzKEFjdG9yR2FsYSwgQWN0b3IpO1xyXG5cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQWN0b3JHYWxhOyIsIi8vIHRyaWdnZXIuanNcclxuLy8gRGVmaW5lcyBhIHRyaWdnZXIgdGlsZShzKSB1c2VkIHRocm91Z2hvdXQgdGhlIHBhcmtcclxuXHJcbnZhciBFdmVudCA9IHJlcXVpcmUoXCJ0cHAtZXZlbnRcIik7XHJcbnZhciBpbmhlcml0cyA9IHJlcXVpcmUoXCJpbmhlcml0c1wiKTtcclxudmFyIGV4dGVuZCA9IHJlcXVpcmUoXCJleHRlbmRcIik7XHJcblxyXG4vKipcclxuICogQSB0cmlnZ2VyIGlzIGEgdGlsZSB0aGF0LCB3aGVuIHN0ZXBwZWQgdXBvbiwgd2lsbCB0cmlnZ2VyIHNvbWUgZXZlbnQuXHJcbiAqIFRoZSBtb3N0IGNvbW1vbiBldmVudCB0aWdnZXJlZCBpcyBhIHdhcnBpbmcgdG8gYW5vdGhlciBtYXAsIGZvciB3aGljaFxyXG4gKiB0aGUgc3ViY2xhc3MgV2FycCBpcyBkZXNpZ25lZCBmb3IuXHJcbiAqXHJcbiAqIFRyaWdnZXJzIG1heSB0YWtlIHVwIG1vcmUgdGhhbiBvbmUgc3BhY2UuXHJcbiAqL1xyXG5mdW5jdGlvbiBUcmlnZ2VyKGJhc2UsIG9wdHMpIHtcclxuXHRFdmVudC5jYWxsKHRoaXMsIGJhc2UsIG9wdHMpO1xyXG5cdFxyXG5cdHRoaXMub24oXCJlbnRlcmVkLXRpbGVcIiwgdGhpcy5vblRyaWdnZXJFbnRlcik7XHJcblx0dGhpcy5vbihcImxlYXZpbmctdGlsZVwiLCB0aGlzLm9uVHJpZ2dlckxlYXZlKTtcclxufVxyXG5pbmhlcml0cyhUcmlnZ2VyLCBFdmVudCk7XHJcbmV4dGVuZChUcmlnZ2VyLnByb3RvdHlwZSwge1xyXG5cdFxyXG5cdG9uVHJpZ2dlckVudGVyIDogZnVuY3Rpb24oZGlyKSB7XHJcblx0XHRjb25zb2xlLmxvZyhcIlRyaWdnZXJlZCFcIik7XHJcblx0fSxcclxuXHRvblRyaWdnZXJMZWF2ZSA6IGZ1bmN0aW9uKGRpcikge1xyXG5cdFx0XHJcblx0fSxcclxufSk7XHJcbm1vZHVsZS5leHBvcnRzID0gVHJpZ2dlcjtcclxuIiwiLy8gd2FycC5qc1xyXG4vLyBEZWZpbmVzIGEgd2FycCB0aWxlIHVzZWQgdGhyb3VnaG91dCB0aGUgcGFyay5cclxuXHJcbnZhciBUcmlnZ2VyID0gcmVxdWlyZShcInRwcC10cmlnZ2VyXCIpO1xyXG52YXIgaW5oZXJpdHMgPSByZXF1aXJlKFwiaW5oZXJpdHNcIik7XHJcbnZhciBleHRlbmQgPSByZXF1aXJlKFwiZXh0ZW5kXCIpO1xyXG5cclxuLyoqXHJcbiAqIEEgd2FycCBpcyBhbiBldmVudCB0aGF0LCB3aGVuIHdhbGtlZCB1cG9uLCB3aWxsIHRha2UgdGhlIHBsYXllciB0byBhbm90aGVyIG1hcCBvclxyXG4gKiBhcmVhIHdpdGhpbiB0aGUgc2FtZSBtYXAuIERpZmZlcmVudCB0eXBlcyBvZiB3YXJwcyBleGlzdCwgcmFuZ2luZyBmcm9tIHRoZSBzdGFuZGFyZFxyXG4gKiBkb29yIHdhcnAgdG8gdGhlIHRlbGVwb3J0IHdhcnAuIFdhcnBzIGNhbiBiZSB0b2xkIHRvIGFjdGl2YXRlIHVwb24gc3RlcHBpbmcgdXBvbiB0aGVtXHJcbiAqIG9yIGFjdGl2YXRlIHVwb24gc3RlcHBpbmcgb2ZmIGEgY2VydGFpbiBkaXJlY3Rpb24uXHJcbiAqL1xyXG5mdW5jdGlvbiBXYXJwKGJhc2UsIG9wdHMpIHtcclxuXHRUcmlnZ2VyLmNhbGwodGhpcywgYmFzZSwgb3B0cyk7XHJcblx0XHJcbn1cclxuaW5oZXJpdHMoV2FycCwgVHJpZ2dlcik7XHJcbmV4dGVuZChXYXJwLnByb3RvdHlwZSwge1xyXG5cdHNvdW5kOiBcImV4aXRfd2Fsa1wiLFxyXG5cdGV4aXRfdG86IG51bGwsXHJcblx0XHJcblx0b25UcmlnZ2VyRW50ZXIgOiBmdW5jdGlvbihkaXIpIHtcclxuXHRcdFNvdW5kTWFuYWdlci5wbGF5U291bmQodGhpcy5zb3VuZCk7XHJcblx0XHRpZiAoIXRoaXMuZXhpdF90bykgcmV0dXJuO1xyXG5cdFx0TWFwTWFuYWdlci50cmFuc2l0aW9uVG8odGhpcy5leGl0X3RvLm1hcCwgdGhpcy5leGl0X3RvLndhcnApO1xyXG5cdH0sXHJcbn0pO1xyXG5tb2R1bGUuZXhwb3J0cyA9IFdhcnA7Il19
