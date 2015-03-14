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
	this.facing = this.facing || new THREE.Vector3(0, 0, 1);
	
	this._initBehaviorStack();
	
	if (this.schedule) {
		this.schedule = ActorScheduler.createSchedule(this.id, this.schedule);
	}
}
inherits(Actor, Event);
extend(Actor.prototype, {
	sprite: null,
	sprite_format: null,
	
	isLocal: false,
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
		map.loadSprite((this.isLocal)? "_local":self.id, self.sprite, function(err, url){
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
			// console.log("Layer Transition: ", t);
			this.emit("change-layer", this.location.z, t.layer);
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
			state.midpointOffset.setY( ((state.srcLoc3.y - state.destLoc3.y) / 2) + 0.6);
			state.jumping = true;
			//enforce a jumping speed of based on height. The below should be 1 with a default step of 0.5
			state.speed = 1;//((state.srcLoc3.y - state.destLoc3.y)) * 0.5 + 0.75; 
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


},{"extend":"extend","inherits":"inherits","tpp-actor-animations":"tpp-actor-animations","tpp-event":"tpp-event","tpp-spritemodel":"tpp-spritemodel"}],"tpp-animevent":[function(require,module,exports){
// animevent.js
// Defines an AnimEvent, which is a basic event that animates map elements

var Event = require("tpp-event");
var inherits = require("inherits");
var extend = require("extend");

/**
 * An AnimEvent is an convience event for animation objects on the map,
 * be it a texture animation or moving a model in some fashion.
 */
function AnimEvent(base, opts) {
	Event.call(this, base, opts);
	
	this.on("tick", this.onTick);
}
inherits(AnimEvent, Event);
extend(AnimEvent.prototype, {
	location: [0, 0], //default to an inaccessable location, top corner of the map
	
	getAvatar: function(map) {
		return null;
	},
	
	onTick : function(delta) {
	},
});
module.exports = AnimEvent;



function WaterAnimEvent(opts) {
	AnimEvent.call(this, {
		id: "ANIM_Water",
		tex_x : [], //water flow x
		tex_y : [], //water flow y
		tex_b : [], //water flow x and y
		
		name_regex: null, //only collect the named assets
		speed: 0.2,
		yaugment: 1.2,
		
		getAvatar: function(map) {
			var ch = map.mapmodel.children;
			for (var i = 0; i < ch.length; i++) {
				
				if (this.name_regex) {
					// If in named regex mode, skip over things that don't match the name
					if (!this.name_regex.test(ch[i].name)) continue;
				} 
				
				if (/\!WATEX$/.test(ch[i].name)) {
					for (var j = 0; j < ch[i].children.length; j++) {
						var mesh = ch[i].children[j];
						if (!(mesh instanceof THREE.Mesh)) continue;
						
						this.tex_x.push(mesh.material.map);
					}
				}
				if (/\!WATEY$/.test(ch[i].name)) {
					for (var j = 0; j < ch[i].children.length; j++) {
						var mesh = ch[i].children[j];
						if (!(mesh instanceof THREE.Mesh)) continue;
						
						this.tex_y.push(mesh.material.map);
					}
				}
				if (/\!WATEB$/.test(ch[i].name)) {
					for (var j = 0; j < ch[i].children.length; j++) {
						var mesh = ch[i].children[j];
						if (!(mesh instanceof THREE.Mesh)) continue;
						
						this.tex_b.push(mesh.material.map);
					}
				}
			}
		},
		
		onTick: function(delta) {
			for (var i = 0; i < this.tex_b.length; i++) {
				var off = this.tex_b[i].offset.x;
				off += delta * this.speed;
				this.tex_b[i].offset.set(off, off * this.yaugment);
				this.tex_b[i].needsUpdate = true;
			}
			for (var i = 0; i < this.tex_x.length; i++) {
				this.tex_x[i].offset.x += delta * this.speed;
				this.tex_x[i].needsUpdate = true;
			}
			for (var i = 0; i < this.tex_y.length; i++) {
				this.tex_y[i].offset.y += delta * this.speed;
				this.tex_y[i].needsUpdate = true;
			}
		},
		
	}, opts);
}
inherits(WaterAnimEvent, AnimEvent);
module.exports.Water = WaterAnimEvent;

function WaterRippleAnimEvent(opts) {
	AnimEvent.call(this, {
		id: "ANIM_WaterRipple",
		tex_r : [], //water ripple
		
		name_regex: null, //only collect the named assets
		speed: 1,
		yaugment: 1.2,
		amplitude: 0.03,
		
		_delta: 0,
		
		getAvatar: function(map) {
			var ch = map.mapmodel.children;
			for (var i = 0; i < ch.length; i++) {
				
				if (this.name_regex) {
					// If in named regex mode, skip over things that don't match the name
					if (!this.name_regex.test(ch[i].name)) continue;
				} 
				
				if (/\!WATER$/.test(ch[i].name)) {
					for (var j = 0; j < ch[i].children.length; j++) {
						var mesh = ch[i].children[j];
						if (!(mesh instanceof THREE.Mesh)) continue;
						
						this.tex_r.push(mesh.material.map);
					}
				}
			}
		},
		
		onTick: function(delta) {
			this._delta += delta * this.speed;
			for (var i = 0; i < this.tex_r.length; i++) {
				var off = Math.sin(this._delta) * this.amplitude;
				this.tex_r[i].offset.set(off, off * this.yaugment);
				this.tex_r[i].needsUpdate = true;
			}
		},
		
	}, opts);
}
inherits(WaterRippleAnimEvent, AnimEvent);
module.exports.SineRipple = WaterRippleAnimEvent;

},{"extend":"extend","inherits":"inherits","tpp-event":"tpp-event"}],"tpp-behavior":[function(require,module,exports){
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
		this.waitTime += (Math.random() * 3) + 3;
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
		this.waitTime += (Math.random() * 3) + 3;
	},
});
module.exports.Meander = Meander;


},{"extend":"extend","inherits":"inherits"}],"tpp-cameratrigger":[function(require,module,exports){
// camera-trigger.js
// A trigger that changes the camera to another angle or definition

var Event = require("tpp-event");
var Trigger = require("tpp-trigger");
var inherits = require("inherits");
var extend = require("extend");

/**
 * A trigger is a tile that, when stepped upon, will trigger some event.
 * The most common event tiggered is a warping to another map, for which
 * the subclass Warp is designed for.
 *
 * Triggers may take up more than one space.
 */
function CameraTrigger(base, opts) {
	Trigger.call(this, base, opts);
}
inherits(CameraTrigger, Trigger);
extend(CameraTrigger.prototype, {
	cameraId: undefined, //Camera to be triggered when stepping on this event
	nCameraId: undefined, //Cameras to be triggered when stepping off this event in a direction
	wCameraId: undefined,
	sCameraId: undefined,
	eCameraId: undefined,
	
	onEntered : function(dir) {
		if (this.cameraId !== undefined) {
			currentMap.changeCamera(this.cameraId);
		}
	},
	onLeaving : function(dir) {
		var d = this.divideFacing(dir);
		if (this[d+"CameraId"] !== undefined) {
			currentMap.changeCamera(this[d+"CameraId"]);
		}
	},
});
module.exports = CameraTrigger;

},{"extend":"extend","inherits":"inherits","tpp-event":"tpp-event","tpp-trigger":"tpp-trigger"}],"tpp-controller":[function(require,module,exports){
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
		
		if( this.keys_down[key] == 1 ) {
			this.keys_down[key]++; //so no other check may pass this test
			return true;
		}
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
			if (down) {
				this.keys_down[action]++; 
			} else {
				this.keys_down[action] = 0;
			}
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
	"change-layer", //(fromLayer, toLayer)
		//emitted when this event changes layer
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

},{"events":1,"extend":"extend","inherits":"inherits"}],"tpp-model-mods":[function(require,module,exports){
// model-mods.js
// Defining several standard-issue model modiciations to be run in the local event.js for a map

var inherits = require("inherits");
var extend = require("extend");

function Modification(fn, opts) {
	extend(this, opts);
	this.fn = fn;
}
extend(Modification.prototype, {
	name: null,
	prefix: null,
	suffix: null,
	regex: null,
	all: false,
	
	fn: null,
});


function testName(narray, name) {
	if (!$.isArray(narray)) narray = [narray];
	for (var i = 0; i < narray.length; i++) {
		if (name == narray[i]) return true;
	}
	return false;
}
function testPrefix(narray, name){
	if (!$.isArray(narray)) narray = [narray];
	for (var i = 0; i < narray.length; i++) {
		if (name.startsWith(narray[i])) return true;
	}
	return false;
}
function testSuffix(narray, name){
	if (!$.isArray(narray)) narray = [narray];
	for (var i = 0; i < narray.length; i++) {
		if (name.endsWith(narray[i])) return true;
	}
	return false;
}
function testRegex(regex, name) {
	return regex.test(name);
}


module.exports = {
	modify: function (){
		var mods = [];
		for (var p in this) {
			if (!(this[p] instanceof Modification)) continue;
			if (!this[p].name && !this[p].prefix && !this[p].suffix) continue;
			mods.push(this[p]);
		}
		
		var ch = currentMap.mapmodel.children;
		for (var i = 0; i < ch.length; i++) {
			for (var m = 0; m < mods.length; m++) {
				if (mods[m].name && testName(mods[m].name, ch[i].name)) {
					mods[m].fn(ch[i]);
				}
				else if (mods[m].prefix && testPrefix(mods[m].prefix, ch[i].name)) {
					mods[m].fn(ch[i]);
				}
				else if (mods[m].suffix && testSuffix(mods[m].suffix, ch[i].name)) {
					mods[m].fn(ch[i]);
				}
				else if (mods[m].regex && testRegex(mods[m].regex, ch[i].name)) {
					mods[m].fn(ch[i]);
				}
				else if (mods[m].all) {
					mods[m].fn(ch[i]);
				}
			}
		}
		
		for (var m = 0; m < mods.length; m++) {
			mods[m].name = null;
			mods[m].prefix = null;
			mods[m].suffix = null;
			mods[m].regex = null;
			mods[m].all = false;
		}
	},
	
	///////////////////////////////////////////////////////////////////////////////////////
	// Actual modification functions below
	
	hide: new Modification(function(obj){
		obj.visible = false;
	}),
	
	trees: new Modification(function(tree) {
		for (var j = 0; j < tree.children.length; j++) {
			var m = tree.children[j].material;
			if (m.side != THREE.DoubleSide) {
				//Need to gate because the color set at the end is destructive
				m.side = THREE.DoubleSide;
				m.alphaTest = 0.2;
				m.transparent = true;
				m.emissive.set(m.color);
				m.color.set(0);
				m.needsUpdate = true;
			}
			
			tree.children[j].renderDepth = (10+j) * -1;
		}
	}),
	
	renderDepthFix: new Modification(function(obj){
		for (var j = 0; j < obj.children.length; j++) {
			obj.children[j].renderDepth = -50;
		}
	}),
	
	godrays: new Modification(function(rays){
		for (var i = 0; i < rays.children.length; i++) {
			rays.children[i].renderDepth = -100;
			rays.children[i].material.blending = THREE.AdditiveBlending;
			rays.children[i].material.depthWrite = false;
		}
	}),
	
	refreshMaterials: new Modification(function(obj){
		for (var j = 0; j < obj.children.length; j++) {
			var m = obj.children[j].material;
			m.needsUpdate = true;
		}
	}),
};
},{"extend":"extend","inherits":"inherits"}],"tpp-particle":[function(require,module,exports){
// particle-system.js
// Definition for an event that runs a Particle System.
// Adapted from Lee Stemkoski's.   http://www.adelphi.edu/~stemkoski/

var Event = require("tpp-event");
var inherits = require("inherits");
var extend = require("extend");

function ParticleSystemEvent(base, opts) {
	Event.call(this, base, opts);
}
inherits(ParticleSystemEvent, Event);
extend(ParticleSystemEvent.prototype, {
	running: true,
	
	particlesPerSecond: 100,
	particleDeathAge: 1.0,
	particleSys: null,
	blendStyle: THREE.NormalBlending,
	
	boundingSize: null,
	sprite: null,
	
	newParticle: function(p) {
		p.position.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
		p.velocity.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
		p.acceleration.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
		
		p.angle = Math.random() * 360;
		p.angleVelocity = (Math.random() - 0.5) * 180;
		p.angleAcceleration = Math.random() - 0.5;
		
		p.color.set(1, 1, 1);
		p.size = 1;
		p.opacity = 1;
	},
	
	getAvatar : function(map, gc){
		var self = this;
		this.particleSys = new ParticleEngine();
		this.particleSys.parentEvent = this;
		this.particleSys.particlesPerSecond = this.particlesPerSecond;
		this.particleSys.particleDeathAge = this.particleDeathAge;
		this.particleSys.blendStyle = this.blendStyle;
		this.particleSys.particleTexture.image = DEF_TEXTURE_IMG;
		
		gc.collect(this.particleSys.particleTexture);
		gc.collect(this.particleSys.particleGeometry);
		gc.collect(this.particleSys.particleMaterial);
		
		// if ($.isArray(this.boundingSize)) {
		// 	var min = new THREE.Vector3(-this.boundingSize[0], 0, -this.boundingSize[1]);
		// 	var max = new THREE.Vector3( this.boundingSize[0], this.boundingSize[2], this.boundingSize[1]);
		// 	this.particleSys.particleGeometry.computeBoundingBox();
		// 	this.particleSys.particleGeometry.boundingBox.set(min, max);
		// }
		
		this.particleSys.initialize();
		
		map.markLoading("PARTICLE_"+self.id);
		map.loadSprite("_local", this.sprite, function(err, url){
			if (err) {
				console.error("ERROR LOADING PARTICLE: ", err);
				return;
			}
			
			var img = new Image();
			var f = function() {
				self.particleSys.particleTexture.image = img;
				self.particleSys.particleTexture.needsUpdate = true;
				map.markLoadFinished("PARTICLE_"+self.id);
				
				img.removeEventListener("load", f);
				img.removeEventListener("load", e);
			};
			var e = function() {
				console.error("Error while loading texture!", img.src);
				texture.needsUpdate = true; //update the missing texture pre-loaded
				map.markLoadFinished("PARTICLE_"+self.id);
				
				img.removeEventListener("load", f);
				img.removeEventListener("load", e);
			}
			img.on("load", f);
			img.on("error", e);
			
			img.src = url;
		});
		
		return this.particleSys.particleMesh;
	},
	
	onEvents: {
		tick: function(delta) {
			// Discard this tick update entirely if the delta is more than a certain amount
			// Chances are, the browser has limited our tick callbacks, and more than 
			// this threshold will simply cause the particle system to go haywire anyway
			if (delta > 0.1) return;
			
			if (!this.running) {
				//Even if we're not running this, run it until the system is mature
				if (this.particleSys.emitterAge > this.particleSys.particleDeathAge)
					return;
			}
			this.particleSys.update(delta);
		},
	}
});
module.exports = ParticleSystemEvent;


////////////////////
// SHADERS 

var particleVertexShader = [
	"attribute vec3  customColor;",
	"attribute float customOpacity;",
	"attribute float customSize;",
	"attribute float customAngle;",
	"attribute float customVisible;",  // float used as boolean (0 = false, 1 = true)
	"varying vec4  vColor;",
	"varying float vAngle;",
	"void main()",
	"{",
		"if ( customVisible > 0.5 )", 				// true
			"vColor = vec4( customColor, customOpacity );", //     set color associated to vertex; use later in fragment shader.
		"else",							// false
			"vColor = vec4(0.0, 0.0, 0.0, 0.0);", 		//     make particle invisible.
			
		"vAngle = customAngle;",

		"vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );",
		"gl_PointSize = customSize * ( 300.0 / length( mvPosition.xyz ) );",     // scale particles as objects in 3D space
		"gl_Position = projectionMatrix * mvPosition;",
	"}"
].join("\n");

var particleFragmentShader = [
	"uniform sampler2D texture;",
	"varying vec4 vColor;", 	
	"varying float vAngle;",   
	"void main()", 
	"{",
		"gl_FragColor = vColor;",
		
		"float c = cos(vAngle);",
		"float s = sin(vAngle);",
		"vec2 rotatedUV = vec2(c * (      gl_PointCoord.x - 0.5) + s * (1.0 - gl_PointCoord.y - 0.5) + 0.5,", 
		                      "c * (1.0 - gl_PointCoord.y - 0.5) - s * (      gl_PointCoord.x - 0.5) + 0.5);",  // rotate UV coordinates to rotate texture
	    	"vec4 rotatedTexture = texture2D( texture,  rotatedUV );",
		"gl_FragColor = gl_FragColor * rotatedTexture;",    // sets an otherwise white particle texture to desired color
	"}"
].join("\n");

///////////////////////////////////////////////////////////////////////////////

function Tween(timeArray, valueArray) {
	this.times  = timeArray || [];
	this.values = valueArray || [];
}

Tween.prototype.lerp = function(t) {
	var i = 0;
	var n = this.times.length;
	while (i < n && t > this.times[i])  
		i++;
	if (i == 0) return this.values[0];
	if (i == n)	return this.values[n-1];
	var p = (t - this.times[i-1]) / (this.times[i] - this.times[i-1]);
	if (this.values[0] instanceof THREE.Vector3)
		return this.values[i-1].clone().lerp( this.values[i], p );
	else // its a float
		return this.values[i-1] + p * (this.values[i] - this.values[i-1]);
}
ParticleSystemEvent.Tween = Tween;
ParticleSystemEvent.makeTween = function(time, val) {
	return new Tween(time, val);
}

///////////////////////////////////////////////////////////////////////////////

function Particle() {
	this.position     = new THREE.Vector3();
	this.velocity     = new THREE.Vector3(); // units per second
	this.acceleration = new THREE.Vector3();

	this.angle             = 0;
	this.angleVelocity     = 0; // degrees per second
	this.angleAcceleration = 0; // degrees per second, per second
	
	this.size = 1.0;

	this.color   = new THREE.Color();
	this.opacity = 1.0;
			
	this.age   = 0;
	this.alive = 0; // use float instead of boolean for shader purposes	
}
extend(Particle.prototype, {
	sizeTween: new Tween(),
	colorTween: new Tween(),
	opacityTween: new Tween(),
	
	update : function(dt) {
		this.position.x += this.velocity.x * dt;
		this.position.y += this.velocity.y * dt;
		this.position.z += this.velocity.z * dt;
		
		this.velocity.x += this.acceleration.x * dt;
		this.velocity.y += this.acceleration.y * dt;
		this.velocity.z += this.acceleration.z * dt;
		
		// convert from degrees to radians: 0.01745329251 = Math.PI/180
		this.angle         += this.angleVelocity     * 0.01745329251 * dt;
		this.angleVelocity += this.angleAcceleration * 0.01745329251 * dt;

		this.age += dt;
		
		// if the tween for a given attribute is nonempty,
		//  then use it to update the attribute's value

		if (this.sizeTween.times.length > 0)
			this.size = this.sizeTween.lerp( this.age );
					
		if (this.colorTween && this.colorTween.times.length > 0) {
			var colorHSL = this.colorTween.lerp( this.age );
			this.color.setHSL( colorHSL.x, colorHSL.y, colorHSL.z );
		}
		else if (this.colorHTween || this.colorSTween || this.colorLTween) {
			var hsl = this.color.getHSL();
			if (this.colorHTween && this.colorHTween.times.length > 0) {
				hsl.h = this.colorHTween.lerp( this.age );
			}
			if (this.colorSTween && this.colorSTween.times.length > 0) {
				hsl.s = this.colorSTween.lerp( this.age );
			}
			if (this.colorLTween && this.colorLTween.times.length > 0) {
				hsl.l = this.colorLTween.lerp( this.age );
			}
			this.color.setHSL( hsl.h, hsl.s, hsl.l );
		}
		
		
		if (this.opacityTween.times.length > 0)
			this.opacity = this.opacityTween.lerp( this.age );
	}
});


///////////////////////////////////////////////////////////////////////////////

function ParticleEngine() {
	this.particleArray = [];
	
	this.particleGeometry = new THREE.Geometry();
	this.particleTexture = new THREE.Texture();
	this.particleMaterial = new THREE.ShaderMaterial( 
	{
		uniforms: 
		{
			texture:   { type: "t", value: this.particleTexture },
		},
		attributes:     
		{
			customVisible:	{ type: 'f',  value: [] },
			customAngle:	{ type: 'f',  value: [] },
			customSize:		{ type: 'f',  value: [] },
			customColor:	{ type: 'c',  value: [] },
			customOpacity:	{ type: 'f',  value: [] }
		},
		vertexShader:   particleVertexShader,
		fragmentShader: particleFragmentShader,
		transparent: true, //alphaTest: 0.5,  // if having transparency issues, try including: alphaTest: 0.5, 
		blending: THREE.NormalBlending, depthTest: true,
		
	});
}
extend(ParticleEngine.prototype, {
	blendStyle: THREE.NormalBlending,
	
	parentEvent: null,
	
	particleArray: null,
	particlesPerSecond: 100,
	particleDeathAge: 1.0,
	particleCount: 0, // How many particles could be active at any time?
	
	emitterAge : 0.0,
	emitterCreated: 0, //number of particles emited in this system's lifetime
	emitterAlive : true,
	
	particleGeometry: null,
	particleTexture: null,
	particleMaterial: null,
	particleMesh: null,
	
	randomValue: function(base, spread){
		return base + spread * (Math.random() - 0.5);
	},
	randomVector3 : function(base, spread) {
		var rand3 = new THREE.Vector3( Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5 );
		return new THREE.Vector3().addVectors( base, new THREE.Vector3().multiplyVectors( spread, rand3 ) );
	},
	
	// Note: This method is meant to be replaced
	newParticle: function(p) {},
	
	initialize : function() {
		this.particleCount = this.particlesPerSecond * (this.particleDeathAge + 0.5);
		
		// link particle data with geometry/material data
		for (var i = 0; i < this.particleCount; i++)
		{
			// remove duplicate code somehow, here and in update function below.
			this.particleArray[i] = new Particle();
			this.particleGeometry.vertices[i] = this.particleArray[i].position;
			this.particleMaterial.attributes.customVisible.value[i] = this.particleArray[i].alive;
			this.particleMaterial.attributes.customColor.value[i]   = this.particleArray[i].color;
			this.particleMaterial.attributes.customOpacity.value[i] = this.particleArray[i].opacity;
			this.particleMaterial.attributes.customSize.value[i]    = this.particleArray[i].size;
			this.particleMaterial.attributes.customAngle.value[i]   = this.particleArray[i].angle;
		}
		
		this.particleMaterial.blending = this.blendStyle;
		// if ( this.blendStyle != THREE.NormalBlending) 
		// 	this.particleMaterial.depthTest = false;
		
		this.particleMesh = new THREE.PointCloud( this.particleGeometry, this.particleMaterial );
		this.particleMesh.sortParticles = true;
		// if ( this.blendStyle == THREE.NormalBlending) 
			this.particleMesh.renderDepth = -80;
		// scene.add( this.particleMesh );
	},
	
	update : function(dt) {
		var recycleIndices = [];
		
		var numNewParticles = 
			Math.floor(this.particlesPerSecond * (this.emitterAge + dt)) - this.emitterCreated;
			// Math.floor(this.particlesPerSecond * (this.emitterAge + dt)) -
			// Math.floor(this.particlesPerSecond * (this.emitterAge + 0));
		
		// update particle data
		for (var i = 0; i < this.particleCount; i++)
		{
			if ( this.particleArray[i].alive )
			{
				this.particleArray[i].update(dt);

				// check if particle should expire
				// could also use: death by size<0 or alpha<0.
				if (this.particleArray[i].age > this.particleDeathAge
					|| (this.parentEvent.killingFloor && this.particleArray[i].position.y < this.parentEvent.killingFloor)) 
				{
					this.particleArray[i].alive = 0.0;
					if (this.emitterAlive && recycleIndices.length < numNewParticles)
						recycleIndices.push(i);
				}
				// update particle properties in shader
				this.particleMaterial.attributes.customVisible.value[i] = this.particleArray[i].alive;
				this.particleMaterial.attributes.customColor.value[i]   = this.particleArray[i].color;
				this.particleMaterial.attributes.customOpacity.value[i] = this.particleArray[i].opacity;
				this.particleMaterial.attributes.customSize.value[i]    = this.particleArray[i].size;
				this.particleMaterial.attributes.customAngle.value[i]   = this.particleArray[i].angle;
			} else {
				if (this.emitterAlive && recycleIndices.length < numNewParticles)
					recycleIndices.push(i);
			}
		}

		// check if particle emitter is still running
		if ( !this.emitterAlive ) return;

		// activate particles
		for (var j = 0; j < recycleIndices.length; j++)
		{
			var i = recycleIndices[j];
			this.parentEvent.newParticle(this.particleArray[i], this.randomValue); //positions a new particle
			this.particleArray[i].age = 0;
			this.particleArray[i].alive = 1.0; // activate right away
			this.particleGeometry.vertices[i] = this.particleArray[i].position;
			this.emitterCreated++;
		}

		this.emitterAge += dt;
		if ((this.emitterAge > this.particleDeathAge)) {
			// console.log("BOUNDING RESIZE");
			this.particleGeometry.computeBoundingBox();
			this.particleGeometry.computeBoundingSphere();
		}
	}
});





},{"extend":"extend","inherits":"inherits","tpp-event":"tpp-event"}],"tpp-pc":[function(require,module,exports){
// player-character.js
// Defines the concrete code for a Player Character in the world

var Actor = require("tpp-actor");
var controller = require("tpp-controller");
var inherits = require("inherits");
var extend = require("extend");

var EVENT_PLANE_NORMAL = new THREE.Vector3(0, 1, 0);

/**
 */
function PlayerChar(){
	Actor.call(this, {}, {});
	
	this.on("tick", this.controlCharacter);
	this.on("cant-move", this.animateBump);
	this.on("change-layer", this.changedLayer);
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
		currentMap.eventMap.remove(this.location.x, this.location.y, this);
		
		this.location.set(warpdef.loc[0], warpdef.loc[1], warpdef.layer);
		
		if (warpdef.anim)
			controller.pushInputContext("cutscene");
		//TODO warpdef.anim
		
		if (warpdef.camera) { 
			currentMap.changeCamera(warpdef.camera); 
		}
		
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
			self.emit("moving", state.srcLocC.x, state.srcLocC.y, state.destLocC.x, state.destLocC.y);
			//self.avatar_node.position.set( currentMap.get3DTileLocation(self.location) );
			
		});
	},
	
	controlTimeout: 0.0,
	controlLastOrientation: { or: null, x:0, y:0 },
	controlCharacter : function(delta) {
		var y = ((controller.isDown("Up", "game"))? -1:0) + ((controller.isDown("Down", "game"))? 1:0);
		var x = ((controller.isDown("Left", "game"))? -1:0) + ((controller.isDown("Right", "game"))? 1:0);
		
		if (controller.isDownOnce("Interact", "game") && !this._initPathingState().moving) {
			currentMap.dispatch(
				this.location.x - this.facing.x, this.location.y + this.facing.z, 
				"interacted", this.facing);
		}
		
		var run = controller.isDown("Run", "game");
		
		var clo = this.controlLastOrientation;
		if (clo.x != x || clo.y != y) {
			clo.or = null;
			clo.x = x; clo.y = y;
		}
		
		if ((y || x) && !(x && y)) { //one, but not both
			
			clo.or = clo.or || getCamDir();
			
			switch (clo.or) {
				case "n": break; //do nothing
				case "s": x = -x; y = -y; break;
				case "w": 
					var t = x; x = -y; y = t;
					break;
				case "e": 
					var t = x; x = y; y = -t;
					break;
			}
			
			
			if (this.controlTimeout < CONFIG.timeout.walkControl) {
				this.controlTimeout += delta;
				
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
		
		return;
		
		function getCamDir() {
			if (!currentMap || !currentMap.camera) return "n";
			
			var dirvector = new THREE.Vector3(0, 0, 1);
			dirvector.applyQuaternion( currentMap.camera.quaternion );
			dirvector.projectOnPlane(EVENT_PLANE_NORMAL).normalize();
			
			var x = dirvector.x, y = dirvector.z;
			// console.log("DIRFACING:", x, y);
			if (Math.abs(x) > Math.abs(y)) { //Direction vector is pointing along x axis
				if (x > 0) return "e";
				else return "w";
			} else { //Direction vector is pointing along y axis
				if (y > 0) return "n";
				else return "s";
			}
			return "n";
		}
		
	},
	
	animateBump : function(srcx, srcy, x, y, reason) {
		// console.warn(this.id, ": Cannot walk to location", "("+x+","+y+")");
		this.playAnimation("bump", { stopNextTransition: true });
	},
	
	changedLayer : function(fromLayer, toLayer) {
		
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

},{"extend":"extend","inherits":"inherits","tpp-actor":"tpp-actor","tpp-controller":"tpp-controller"}],"tpp-sign":[function(require,module,exports){
// sign.js
// Defines a common Sign event

var Event = require("tpp-event");
var inherits = require("inherits");
var extend = require("extend");

/**
 * A sign is a tile which the player can read information. The sign can be facing any
 * direction (default, down) and can only be read in that direction (configurable)
 */
function Sign(base, opts) {
	Event.call(this, base, opts);
	
	this.on("interacted", this.onInteract);
}
inherits(Sign, Event);
extend(Sign.prototype, {
	frame_type: "text",
	text: "[There is nothing written on this sign!]",
	
	signType: 1, //0 = provided by map geometry (no model), >0 = provide model
	
	facing: new THREE.Vector3(0, 0, 1), //down
	readOnlyFacing: true,
	
	onInteract : function(from) {
		if (this.readOnlyFacing) {
			var f = from.clone().negate();
			if (f.x != this.facing.x || f.y != this.facing.y)
				return; //don't show box if not looking at the sign
		}
		UI.showTextBox(this.frame_type, this.text, { owner: this });
	},
	
	/** If the sign is provided by the map geometry, the map provides the collision as well. */
	canWalkOn : function(){ return this.signType != 0; },
	
	/**  */
	getAvatar : function(map, gc){ 
		if (this.signType == 0) return null;
		
		//TODO
		
		return null; 
	},
	
});
module.exports = Sign;



},{"extend":"extend","inherits":"inherits","tpp-event":"tpp-event"}],"tpp-spritemodel":[function(require,module,exports){
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
			this._alpha = 0.5;
			
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

	this.on("entering-tile", this.onEntering);	
	this.on("entered-tile", this.onEntered);
	this.on("leaving-tile", this.onLeaving);
	this.on("left-tile", this.onLeft);
}
inherits(Trigger, Event);
extend(Trigger.prototype, {
	//convience functions
	onLeaveToNorth: null,
	onLeaveToSouth: null,
	onLeaveToEast: null,
	onLeaveToWest: null,
	
	onEntering : function(dir) {},
	onLeft : function(dir) {},
	
	onEntered : function(dir) {
		if (typeof this.onTriggerEnter == "function")
			this.onTriggerEnter(); //backwards compatibility to rename
	},
	onLeaving : function(dir) {
		if (typeof this.onTriggerLeave == "function")
			this.onTriggerLeave(); //backwards compatibility to rename
		
		var d = this.divideFacing(dir);
		switch (d) {
			case "n": if (typeof this.onLeaveToNorth == "function") this.onLeaveToNorth(); break;
			case "s": if (typeof this.onLeaveToSouth == "function") this.onLeaveToSouth(); break;
			case "e": if (typeof this.onLeaveToEast == "function") this.onLeaveToEast(); break;
			case "w": if (typeof this.onLeaveToWest == "function") this.onLeaveToWest(); break;
		}
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlc1xcYnJvd3NlcmlmeVxcbm9kZV9tb2R1bGVzXFxicm93c2VyLXBhY2tcXF9wcmVsdWRlLmpzIiwibm9kZV9tb2R1bGVzXFxicm93c2VyaWZ5XFxub2RlX21vZHVsZXNcXGV2ZW50c1xcZXZlbnRzLmpzIiwibm9kZV9tb2R1bGVzXFxleHRlbmRcXGluZGV4LmpzIiwibm9kZV9tb2R1bGVzXFxpbmhlcml0c1xcaW5oZXJpdHNfYnJvd3Nlci5qcyIsInNyY1xcanNcXGV2ZW50c1xcYWN0b3JfYW5pbWF0aW9ucyIsInNyY1xcanNcXGV2ZW50c1xcYWN0b3IiLCJzcmNcXGpzXFxldmVudHNcXGFuaW1ldmVudCIsInNyY1xcanNcXGV2ZW50c1xcYmVoYXZpb3IiLCJzcmNcXGpzXFxldmVudHNcXGNhbWVyYS10cmlnZ2VyIiwic3JjXFxqc1xcbWFuYWdlcnNcXGNvbnRyb2xsZXIiLCJzcmNcXGpzXFxldmVudHNcXGV2ZW50Iiwic3JjXFxqc1xcbW9kZWxcXG1vZGVsLW1vZHMiLCJzcmNcXGpzXFxldmVudHNcXHBhcnRpY2xlLXN5c3RlbSIsInNyY1xcanNcXGV2ZW50c1xccGxheWVyLWNoYXJhY3RlciIsInNyY1xcanNcXGV2ZW50c1xcc2lnbiIsInNyY1xcanNcXG1vZGVsXFxzcHJpdGVtb2RlbCIsInNyY1xcanNcXGV2ZW50c1xcdEdhbGxlcnkiLCJzcmNcXGpzXFxldmVudHNcXHRyaWdnZXIiLCJzcmNcXGpzXFxldmVudHNcXHdhcnAiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdTQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdTQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pvQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3T0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNVlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuZnVuY3Rpb24gRXZlbnRFbWl0dGVyKCkge1xuICB0aGlzLl9ldmVudHMgPSB0aGlzLl9ldmVudHMgfHwge307XG4gIHRoaXMuX21heExpc3RlbmVycyA9IHRoaXMuX21heExpc3RlbmVycyB8fCB1bmRlZmluZWQ7XG59XG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50RW1pdHRlcjtcblxuLy8gQmFja3dhcmRzLWNvbXBhdCB3aXRoIG5vZGUgMC4xMC54XG5FdmVudEVtaXR0ZXIuRXZlbnRFbWl0dGVyID0gRXZlbnRFbWl0dGVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9ldmVudHMgPSB1bmRlZmluZWQ7XG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9tYXhMaXN0ZW5lcnMgPSB1bmRlZmluZWQ7XG5cbi8vIEJ5IGRlZmF1bHQgRXZlbnRFbWl0dGVycyB3aWxsIHByaW50IGEgd2FybmluZyBpZiBtb3JlIHRoYW4gMTAgbGlzdGVuZXJzIGFyZVxuLy8gYWRkZWQgdG8gaXQuIFRoaXMgaXMgYSB1c2VmdWwgZGVmYXVsdCB3aGljaCBoZWxwcyBmaW5kaW5nIG1lbW9yeSBsZWFrcy5cbkV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzID0gMTA7XG5cbi8vIE9idmlvdXNseSBub3QgYWxsIEVtaXR0ZXJzIHNob3VsZCBiZSBsaW1pdGVkIHRvIDEwLiBUaGlzIGZ1bmN0aW9uIGFsbG93c1xuLy8gdGhhdCB0byBiZSBpbmNyZWFzZWQuIFNldCB0byB6ZXJvIGZvciB1bmxpbWl0ZWQuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnNldE1heExpc3RlbmVycyA9IGZ1bmN0aW9uKG4pIHtcbiAgaWYgKCFpc051bWJlcihuKSB8fCBuIDwgMCB8fCBpc05hTihuKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ24gbXVzdCBiZSBhIHBvc2l0aXZlIG51bWJlcicpO1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSBuO1xuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGVyLCBoYW5kbGVyLCBsZW4sIGFyZ3MsIGksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBJZiB0aGVyZSBpcyBubyAnZXJyb3InIGV2ZW50IGxpc3RlbmVyIHRoZW4gdGhyb3cuXG4gIGlmICh0eXBlID09PSAnZXJyb3InKSB7XG4gICAgaWYgKCF0aGlzLl9ldmVudHMuZXJyb3IgfHxcbiAgICAgICAgKGlzT2JqZWN0KHRoaXMuX2V2ZW50cy5lcnJvcikgJiYgIXRoaXMuX2V2ZW50cy5lcnJvci5sZW5ndGgpKSB7XG4gICAgICBlciA9IGFyZ3VtZW50c1sxXTtcbiAgICAgIGlmIChlciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgIHRocm93IGVyOyAvLyBVbmhhbmRsZWQgJ2Vycm9yJyBldmVudFxuICAgICAgfVxuICAgICAgdGhyb3cgVHlwZUVycm9yKCdVbmNhdWdodCwgdW5zcGVjaWZpZWQgXCJlcnJvclwiIGV2ZW50LicpO1xuICAgIH1cbiAgfVxuXG4gIGhhbmRsZXIgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzVW5kZWZpbmVkKGhhbmRsZXIpKVxuICAgIHJldHVybiBmYWxzZTtcblxuICBpZiAoaXNGdW5jdGlvbihoYW5kbGVyKSkge1xuICAgIHN3aXRjaCAoYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgLy8gZmFzdCBjYXNlc1xuICAgICAgY2FzZSAxOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAyOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDM6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgLy8gc2xvd2VyXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgICAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgICAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIGhhbmRsZXIuYXBwbHkodGhpcywgYXJncyk7XG4gICAgfVxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGhhbmRsZXIpKSB7XG4gICAgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuXG4gICAgbGlzdGVuZXJzID0gaGFuZGxlci5zbGljZSgpO1xuICAgIGxlbiA9IGxpc3RlbmVycy5sZW5ndGg7XG4gICAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKVxuICAgICAgbGlzdGVuZXJzW2ldLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIG07XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIFRvIGF2b2lkIHJlY3Vyc2lvbiBpbiB0aGUgY2FzZSB0aGF0IHR5cGUgPT09IFwibmV3TGlzdGVuZXJcIiEgQmVmb3JlXG4gIC8vIGFkZGluZyBpdCB0byB0aGUgbGlzdGVuZXJzLCBmaXJzdCBlbWl0IFwibmV3TGlzdGVuZXJcIi5cbiAgaWYgKHRoaXMuX2V2ZW50cy5uZXdMaXN0ZW5lcilcbiAgICB0aGlzLmVtaXQoJ25ld0xpc3RlbmVyJywgdHlwZSxcbiAgICAgICAgICAgICAgaXNGdW5jdGlvbihsaXN0ZW5lci5saXN0ZW5lcikgP1xuICAgICAgICAgICAgICBsaXN0ZW5lci5saXN0ZW5lciA6IGxpc3RlbmVyKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAvLyBPcHRpbWl6ZSB0aGUgY2FzZSBvZiBvbmUgbGlzdGVuZXIuIERvbid0IG5lZWQgdGhlIGV4dHJhIGFycmF5IG9iamVjdC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBsaXN0ZW5lcjtcbiAgZWxzZSBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICAvLyBJZiB3ZSd2ZSBhbHJlYWR5IGdvdCBhbiBhcnJheSwganVzdCBhcHBlbmQuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdLnB1c2gobGlzdGVuZXIpO1xuICBlbHNlXG4gICAgLy8gQWRkaW5nIHRoZSBzZWNvbmQgZWxlbWVudCwgbmVlZCB0byBjaGFuZ2UgdG8gYXJyYXkuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gW3RoaXMuX2V2ZW50c1t0eXBlXSwgbGlzdGVuZXJdO1xuXG4gIC8vIENoZWNrIGZvciBsaXN0ZW5lciBsZWFrXG4gIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pICYmICF0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkKSB7XG4gICAgdmFyIG07XG4gICAgaWYgKCFpc1VuZGVmaW5lZCh0aGlzLl9tYXhMaXN0ZW5lcnMpKSB7XG4gICAgICBtID0gdGhpcy5fbWF4TGlzdGVuZXJzO1xuICAgIH0gZWxzZSB7XG4gICAgICBtID0gRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnM7XG4gICAgfVxuXG4gICAgaWYgKG0gJiYgbSA+IDAgJiYgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCA+IG0pIHtcbiAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQgPSB0cnVlO1xuICAgICAgY29uc29sZS5lcnJvcignKG5vZGUpIHdhcm5pbmc6IHBvc3NpYmxlIEV2ZW50RW1pdHRlciBtZW1vcnkgJyArXG4gICAgICAgICAgICAgICAgICAgICdsZWFrIGRldGVjdGVkLiAlZCBsaXN0ZW5lcnMgYWRkZWQuICcgK1xuICAgICAgICAgICAgICAgICAgICAnVXNlIGVtaXR0ZXIuc2V0TWF4TGlzdGVuZXJzKCkgdG8gaW5jcmVhc2UgbGltaXQuJyxcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCk7XG4gICAgICBpZiAodHlwZW9mIGNvbnNvbGUudHJhY2UgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgLy8gbm90IHN1cHBvcnRlZCBpbiBJRSAxMFxuICAgICAgICBjb25zb2xlLnRyYWNlKCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbmNlID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIHZhciBmaXJlZCA9IGZhbHNlO1xuXG4gIGZ1bmN0aW9uIGcoKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBnKTtcblxuICAgIGlmICghZmlyZWQpIHtcbiAgICAgIGZpcmVkID0gdHJ1ZTtcbiAgICAgIGxpc3RlbmVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICB9XG5cbiAgZy5saXN0ZW5lciA9IGxpc3RlbmVyO1xuICB0aGlzLm9uKHR5cGUsIGcpO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLy8gZW1pdHMgYSAncmVtb3ZlTGlzdGVuZXInIGV2ZW50IGlmZiB0aGUgbGlzdGVuZXIgd2FzIHJlbW92ZWRcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbGlzdCwgcG9zaXRpb24sIGxlbmd0aCwgaTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXR1cm4gdGhpcztcblxuICBsaXN0ID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuICBsZW5ndGggPSBsaXN0Lmxlbmd0aDtcbiAgcG9zaXRpb24gPSAtMTtcblxuICBpZiAobGlzdCA9PT0gbGlzdGVuZXIgfHxcbiAgICAgIChpc0Z1bmN0aW9uKGxpc3QubGlzdGVuZXIpICYmIGxpc3QubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG5cbiAgfSBlbHNlIGlmIChpc09iamVjdChsaXN0KSkge1xuICAgIGZvciAoaSA9IGxlbmd0aDsgaS0tID4gMDspIHtcbiAgICAgIGlmIChsaXN0W2ldID09PSBsaXN0ZW5lciB8fFxuICAgICAgICAgIChsaXN0W2ldLmxpc3RlbmVyICYmIGxpc3RbaV0ubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgICAgICBwb3NpdGlvbiA9IGk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChwb3NpdGlvbiA8IDApXG4gICAgICByZXR1cm4gdGhpcztcblxuICAgIGlmIChsaXN0Lmxlbmd0aCA9PT0gMSkge1xuICAgICAgbGlzdC5sZW5ndGggPSAwO1xuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGlzdC5zcGxpY2UocG9zaXRpb24sIDEpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUFsbExpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGtleSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIC8vIG5vdCBsaXN0ZW5pbmcgZm9yIHJlbW92ZUxpc3RlbmVyLCBubyBuZWVkIHRvIGVtaXRcbiAgaWYgKCF0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMClcbiAgICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIGVsc2UgaWYgKHRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvLyBlbWl0IHJlbW92ZUxpc3RlbmVyIGZvciBhbGwgbGlzdGVuZXJzIG9uIGFsbCBldmVudHNcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICBmb3IgKGtleSBpbiB0aGlzLl9ldmVudHMpIHtcbiAgICAgIGlmIChrZXkgPT09ICdyZW1vdmVMaXN0ZW5lcicpIGNvbnRpbnVlO1xuICAgICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoa2V5KTtcbiAgICB9XG4gICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoJ3JlbW92ZUxpc3RlbmVyJyk7XG4gICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBsaXN0ZW5lcnMgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzRnVuY3Rpb24obGlzdGVuZXJzKSkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBMSUZPIG9yZGVyXG4gICAgd2hpbGUgKGxpc3RlbmVycy5sZW5ndGgpXG4gICAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVyc1tsaXN0ZW5lcnMubGVuZ3RoIC0gMV0pO1xuICB9XG4gIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSBbXTtcbiAgZWxzZSBpZiAoaXNGdW5jdGlvbih0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IFt0aGlzLl9ldmVudHNbdHlwZV1dO1xuICBlbHNlXG4gICAgcmV0ID0gdGhpcy5fZXZlbnRzW3R5cGVdLnNsaWNlKCk7XG4gIHJldHVybiByZXQ7XG59O1xuXG5FdmVudEVtaXR0ZXIubGlzdGVuZXJDb3VudCA9IGZ1bmN0aW9uKGVtaXR0ZXIsIHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCFlbWl0dGVyLl9ldmVudHMgfHwgIWVtaXR0ZXIuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSAwO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKGVtaXR0ZXIuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gMTtcbiAgZWxzZVxuICAgIHJldCA9IGVtaXR0ZXIuX2V2ZW50c1t0eXBlXS5sZW5ndGg7XG4gIHJldHVybiByZXQ7XG59O1xuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Z1bmN0aW9uJztcbn1cblxuZnVuY3Rpb24gaXNOdW1iZXIoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnbnVtYmVyJztcbn1cblxuZnVuY3Rpb24gaXNPYmplY3QoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiBhcmcgIT09IG51bGw7XG59XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09PSB2b2lkIDA7XG59XG4iLCJ2YXIgaGFzT3duID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcbnZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG52YXIgdW5kZWZpbmVkO1xuXG52YXIgaXNQbGFpbk9iamVjdCA9IGZ1bmN0aW9uIGlzUGxhaW5PYmplY3Qob2JqKSB7XG5cdCd1c2Ugc3RyaWN0Jztcblx0aWYgKCFvYmogfHwgdG9TdHJpbmcuY2FsbChvYmopICE9PSAnW29iamVjdCBPYmplY3RdJykge1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXG5cdHZhciBoYXNfb3duX2NvbnN0cnVjdG9yID0gaGFzT3duLmNhbGwob2JqLCAnY29uc3RydWN0b3InKTtcblx0dmFyIGhhc19pc19wcm9wZXJ0eV9vZl9tZXRob2QgPSBvYmouY29uc3RydWN0b3IgJiYgb2JqLmNvbnN0cnVjdG9yLnByb3RvdHlwZSAmJiBoYXNPd24uY2FsbChvYmouY29uc3RydWN0b3IucHJvdG90eXBlLCAnaXNQcm90b3R5cGVPZicpO1xuXHQvLyBOb3Qgb3duIGNvbnN0cnVjdG9yIHByb3BlcnR5IG11c3QgYmUgT2JqZWN0XG5cdGlmIChvYmouY29uc3RydWN0b3IgJiYgIWhhc19vd25fY29uc3RydWN0b3IgJiYgIWhhc19pc19wcm9wZXJ0eV9vZl9tZXRob2QpIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblxuXHQvLyBPd24gcHJvcGVydGllcyBhcmUgZW51bWVyYXRlZCBmaXJzdGx5LCBzbyB0byBzcGVlZCB1cCxcblx0Ly8gaWYgbGFzdCBvbmUgaXMgb3duLCB0aGVuIGFsbCBwcm9wZXJ0aWVzIGFyZSBvd24uXG5cdHZhciBrZXk7XG5cdGZvciAoa2V5IGluIG9iaikge31cblxuXHRyZXR1cm4ga2V5ID09PSB1bmRlZmluZWQgfHwgaGFzT3duLmNhbGwob2JqLCBrZXkpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBleHRlbmQoKSB7XG5cdCd1c2Ugc3RyaWN0Jztcblx0dmFyIG9wdGlvbnMsIG5hbWUsIHNyYywgY29weSwgY29weUlzQXJyYXksIGNsb25lLFxuXHRcdHRhcmdldCA9IGFyZ3VtZW50c1swXSxcblx0XHRpID0gMSxcblx0XHRsZW5ndGggPSBhcmd1bWVudHMubGVuZ3RoLFxuXHRcdGRlZXAgPSBmYWxzZTtcblxuXHQvLyBIYW5kbGUgYSBkZWVwIGNvcHkgc2l0dWF0aW9uXG5cdGlmICh0eXBlb2YgdGFyZ2V0ID09PSAnYm9vbGVhbicpIHtcblx0XHRkZWVwID0gdGFyZ2V0O1xuXHRcdHRhcmdldCA9IGFyZ3VtZW50c1sxXSB8fCB7fTtcblx0XHQvLyBza2lwIHRoZSBib29sZWFuIGFuZCB0aGUgdGFyZ2V0XG5cdFx0aSA9IDI7XG5cdH0gZWxzZSBpZiAoKHR5cGVvZiB0YXJnZXQgIT09ICdvYmplY3QnICYmIHR5cGVvZiB0YXJnZXQgIT09ICdmdW5jdGlvbicpIHx8IHRhcmdldCA9PSBudWxsKSB7XG5cdFx0dGFyZ2V0ID0ge307XG5cdH1cblxuXHRmb3IgKDsgaSA8IGxlbmd0aDsgKytpKSB7XG5cdFx0b3B0aW9ucyA9IGFyZ3VtZW50c1tpXTtcblx0XHQvLyBPbmx5IGRlYWwgd2l0aCBub24tbnVsbC91bmRlZmluZWQgdmFsdWVzXG5cdFx0aWYgKG9wdGlvbnMgIT0gbnVsbCkge1xuXHRcdFx0Ly8gRXh0ZW5kIHRoZSBiYXNlIG9iamVjdFxuXHRcdFx0Zm9yIChuYW1lIGluIG9wdGlvbnMpIHtcblx0XHRcdFx0c3JjID0gdGFyZ2V0W25hbWVdO1xuXHRcdFx0XHRjb3B5ID0gb3B0aW9uc1tuYW1lXTtcblxuXHRcdFx0XHQvLyBQcmV2ZW50IG5ldmVyLWVuZGluZyBsb29wXG5cdFx0XHRcdGlmICh0YXJnZXQgPT09IGNvcHkpIHtcblx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIFJlY3Vyc2UgaWYgd2UncmUgbWVyZ2luZyBwbGFpbiBvYmplY3RzIG9yIGFycmF5c1xuXHRcdFx0XHRpZiAoZGVlcCAmJiBjb3B5ICYmIChpc1BsYWluT2JqZWN0KGNvcHkpIHx8IChjb3B5SXNBcnJheSA9IEFycmF5LmlzQXJyYXkoY29weSkpKSkge1xuXHRcdFx0XHRcdGlmIChjb3B5SXNBcnJheSkge1xuXHRcdFx0XHRcdFx0Y29weUlzQXJyYXkgPSBmYWxzZTtcblx0XHRcdFx0XHRcdGNsb25lID0gc3JjICYmIEFycmF5LmlzQXJyYXkoc3JjKSA/IHNyYyA6IFtdO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRjbG9uZSA9IHNyYyAmJiBpc1BsYWluT2JqZWN0KHNyYykgPyBzcmMgOiB7fTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHQvLyBOZXZlciBtb3ZlIG9yaWdpbmFsIG9iamVjdHMsIGNsb25lIHRoZW1cblx0XHRcdFx0XHR0YXJnZXRbbmFtZV0gPSBleHRlbmQoZGVlcCwgY2xvbmUsIGNvcHkpO1xuXG5cdFx0XHRcdC8vIERvbid0IGJyaW5nIGluIHVuZGVmaW5lZCB2YWx1ZXNcblx0XHRcdFx0fSBlbHNlIGlmIChjb3B5ICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0XHR0YXJnZXRbbmFtZV0gPSBjb3B5O1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0Ly8gUmV0dXJuIHRoZSBtb2RpZmllZCBvYmplY3Rcblx0cmV0dXJuIHRhcmdldDtcbn07XG5cbiIsImlmICh0eXBlb2YgT2JqZWN0LmNyZWF0ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAvLyBpbXBsZW1lbnRhdGlvbiBmcm9tIHN0YW5kYXJkIG5vZGUuanMgJ3V0aWwnIG1vZHVsZVxuICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGluaGVyaXRzKGN0b3IsIHN1cGVyQ3Rvcikge1xuICAgIGN0b3Iuc3VwZXJfID0gc3VwZXJDdG9yXG4gICAgY3Rvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHN1cGVyQ3Rvci5wcm90b3R5cGUsIHtcbiAgICAgIGNvbnN0cnVjdG9yOiB7XG4gICAgICAgIHZhbHVlOiBjdG9yLFxuICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgd3JpdGFibGU6IHRydWUsXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgICAgfVxuICAgIH0pO1xuICB9O1xufSBlbHNlIHtcbiAgLy8gb2xkIHNjaG9vbCBzaGltIGZvciBvbGQgYnJvd3NlcnNcbiAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpbmhlcml0cyhjdG9yLCBzdXBlckN0b3IpIHtcbiAgICBjdG9yLnN1cGVyXyA9IHN1cGVyQ3RvclxuICAgIHZhciBUZW1wQ3RvciA9IGZ1bmN0aW9uICgpIHt9XG4gICAgVGVtcEN0b3IucHJvdG90eXBlID0gc3VwZXJDdG9yLnByb3RvdHlwZVxuICAgIGN0b3IucHJvdG90eXBlID0gbmV3IFRlbXBDdG9yKClcbiAgICBjdG9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IGN0b3JcbiAgfVxufVxuIiwiLy8gYWN0b3JfYW5pbWF0aW9ucy5qc1xyXG4vLyBBIHN1Ym1vZHVsZSBmb3IgdGhlIEFjdG9yIGV2ZW50IGNsYXNzIHRoYXQgZGVhbHMgd2l0aCBhbmltYXRpb25zXHJcblxyXG52YXIgZXh0ZW5kID0gcmVxdWlyZShcImV4dGVuZFwiKTtcclxuXHJcbmZ1bmN0aW9uIGdldFNwcml0ZUZvcm1hdChzdHIpIHtcclxuXHR2YXIgZm9ybWF0ID0gc3RyLnNwbGl0KFwiLVwiKTtcclxuXHR2YXIgbmFtZSA9IGZvcm1hdFswXTtcclxuXHR2YXIgc2l6ZSA9IGZvcm1hdFsxXS5zcGxpdChcInhcIik7XHJcblx0c2l6ZVsxXSA9IHNpemVbMV0gfHwgc2l6ZVswXTtcclxuXHRcclxuXHR2YXIgYmFzZSA9IHtcclxuXHRcdHdpZHRoOiBzaXplWzBdLCBoZWlnaHQ6IHNpemVbMV0sIGZsaXA6IGZhbHNlLCBcclxuXHRcdC8vcmVwZWF0eDogMC4yNSwgcmVwZWF0eTogMC4yNSxcclxuXHRcdGZyYW1lczoge1xyXG5cdFx0XHRcInUzXCI6IFwidTBcIiwgXCJkM1wiOiBcImQwXCIsIFwibDNcIjogXCJsMFwiLCBcInIzXCI6IFwicjBcIixcclxuXHRcdH0sXHJcblx0XHRhbmltcyA6IGdldFN0YW5kYXJkQW5pbWF0aW9ucygpLFxyXG5cdH07XHJcblx0XHJcblx0c3dpdGNoIChuYW1lKSB7XHJcblx0XHRjYXNlIFwicHRfaG9yenJvd1wiOiBcclxuXHRcdFx0cmV0dXJuIGV4dGVuZCh0cnVlLCBiYXNlLCB7IFxyXG5cdFx0XHRcdGZyYW1lczoge1xyXG5cdFx0XHRcdFx0XCJ1MFwiOiBbMSwgMF0sIFwidTFcIjogWzEsIDFdLCBcInUyXCI6IFsxLCAyXSxcclxuXHRcdFx0XHRcdFwiZDBcIjogWzAsIDBdLCBcImQxXCI6IFswLCAxXSwgXCJkMlwiOiBbMCwgMl0sXHJcblx0XHRcdFx0XHRcImwwXCI6IFsyLCAwXSwgXCJsMVwiOiBbMiwgMV0sIFwibDJcIjogWzIsIDJdLFxyXG5cdFx0XHRcdFx0XCJyMFwiOiBbMywgMF0sIFwicjFcIjogWzMsIDFdLCBcInIyXCI6IFszLCAyXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9KTtcclxuXHRcdGNhc2UgXCJwdF92ZXJ0Y29sXCI6IFxyXG5cdFx0XHRyZXR1cm4gZXh0ZW5kKHRydWUsIGJhc2UsIHsgXHJcblx0XHRcdFx0ZnJhbWVzOiB7XHJcblx0XHRcdFx0XHRcInUwXCI6IFswLCAxXSwgXCJ1MVwiOiBbMSwgMV0sIFwidTJcIjogWzIsIDFdLFxyXG5cdFx0XHRcdFx0XCJkMFwiOiBbMCwgMF0sIFwiZDFcIjogWzEsIDBdLCBcImQyXCI6IFsyLCAwXSxcclxuXHRcdFx0XHRcdFwibDBcIjogWzAsIDJdLCBcImwxXCI6IFsxLCAyXSwgXCJsMlwiOiBbMiwgMl0sXHJcblx0XHRcdFx0XHRcInIwXCI6IFswLCAzXSwgXCJyMVwiOiBbMSwgM10sIFwicjJcIjogWzIsIDNdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH0pO1xyXG5cdFx0Y2FzZSBcImhnX3ZlcnRtaXhcIjogXHJcblx0XHRcdHJldHVybiBleHRlbmQodHJ1ZSwgYmFzZSwgeyBcclxuXHRcdFx0XHRmcmFtZXM6IHtcclxuXHRcdFx0XHRcdFwidTBcIjogWzAsIDBdLCBcInUxXCI6IFsxLCAzXSwgXCJ1MlwiOiBbMiwgMF0sXHJcblx0XHRcdFx0XHRcImQwXCI6IFsyLCAxXSwgXCJkMVwiOiBbMiwgMl0sIFwiZDJcIjogWzIsIDNdLFxyXG5cdFx0XHRcdFx0XCJsMFwiOiBbMCwgMl0sIFwibDFcIjogWzAsIDFdLCBcImwyXCI6IFswLCAzXSxcclxuXHRcdFx0XHRcdFwicjBcIjogWzEsIDBdLCBcInIxXCI6IFsxLCAxXSwgXCJyMlwiOiBbMSwgMl0sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fSk7XHJcblx0XHRjYXNlIFwiaGdfcG9rZXJvd1wiOlxyXG5cdFx0XHRyZXR1cm4gZXh0ZW5kKHRydWUsIGJhc2UsIHsgXHJcblx0XHRcdFx0ZnJhbWVzOiB7IC8vIHBvaW50ZXJzIHRvIGFub3RoZXIgaW1hZ2UgaW5kaWNhdGVzIHRoYXQgaW1hZ2Ugc2hvdWxkIGJlIGZsaXBwZWQsIGlmIGZsaXA9dHJ1ZVxyXG5cdFx0XHRcdFx0XCJ1MFwiOiBudWxsLCBcInUxXCI6IFswLCAwXSwgXCJ1MlwiOiBbMSwgMF0sXHJcblx0XHRcdFx0XHRcImQwXCI6IG51bGwsIFwiZDFcIjogWzAsIDFdLCBcImQyXCI6IFsxLCAxXSxcclxuXHRcdFx0XHRcdFwibDBcIjogbnVsbCwgXCJsMVwiOiBbMCwgMl0sIFwibDJcIjogWzEsIDJdLFxyXG5cdFx0XHRcdFx0XCJyMFwiOiBudWxsLCBcInIxXCI6IFswLCAzXSwgXCJyMlwiOiBbMSwgM10sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRhbmltczogZ2V0UG9rZW1vbkFuaW1hdGlvbnMoKSxcclxuXHRcdFx0fSk7XHJcblx0XHRjYXNlIFwiaGdfcG9rZXJvd19yZXZlcnNlXCI6XHJcblx0XHRcdHJldHVybiBleHRlbmQodHJ1ZSwgYmFzZSwgeyBcclxuXHRcdFx0XHRmcmFtZXM6IHsgLy8gcG9pbnRlcnMgdG8gYW5vdGhlciBpbWFnZSBpbmRpY2F0ZXMgdGhhdCBpbWFnZSBzaG91bGQgYmUgZmxpcHBlZCwgaWYgZmxpcD10cnVlXHJcblx0XHRcdFx0XHRcInUwXCI6IG51bGwsIFwidTFcIjogWzAsIDFdLCBcInUyXCI6IFsxLCAxXSxcclxuXHRcdFx0XHRcdFwiZDBcIjogbnVsbCwgXCJkMVwiOiBbMCwgMF0sIFwiZDJcIjogWzEsIDBdLFxyXG5cdFx0XHRcdFx0XCJsMFwiOiBudWxsLCBcImwxXCI6IFswLCAzXSwgXCJsMlwiOiBbMSwgM10sXHJcblx0XHRcdFx0XHRcInIwXCI6IG51bGwsIFwicjFcIjogWzAsIDJdLCBcInIyXCI6IFsxLCAyXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdGFuaW1zOiBnZXRQb2tlbW9uQW5pbWF0aW9ucygpLFxyXG5cdFx0XHR9KTtcclxuXHRcdGNhc2UgXCJoZ19wb2tlY29sXCI6XHJcblx0XHRcdHJldHVybiBleHRlbmQodHJ1ZSwgYmFzZSwgeyBcclxuXHRcdFx0XHRmcmFtZXM6IHsgLy8gcG9pbnRlcnMgdG8gYW5vdGhlciBpbWFnZSBpbmRpY2F0ZXMgdGhhdCBpbWFnZSBzaG91bGQgYmUgZmxpcHBlZCwgaWYgZmxpcD10cnVlXHJcblx0XHRcdFx0XHRcInUwXCI6IG51bGwsIFwidTFcIjogWzAsIDBdLCBcInUyXCI6IFswLCAxXSxcclxuXHRcdFx0XHRcdFwiZDBcIjogbnVsbCwgXCJkMVwiOiBbMCwgMl0sIFwiZDJcIjogWzAsIDNdLFxyXG5cdFx0XHRcdFx0XCJsMFwiOiBudWxsLCBcImwxXCI6IFsxLCAwXSwgXCJsMlwiOiBbMSwgMV0sXHJcblx0XHRcdFx0XHRcInIwXCI6IG51bGwsIFwicjFcIjogWzEsIDJdLCBcInIyXCI6IFsxLCAzXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdGFuaW1zOiBnZXRQb2tlbW9uQW5pbWF0aW9ucygpLFxyXG5cdFx0XHR9KTtcclxuXHRcdGNhc2UgXCJoZ19wb2tlX2hvcnpjb2xcIjpcclxuXHRcdFx0cmV0dXJuIGV4dGVuZCh0cnVlLCBiYXNlLCB7IFxyXG5cdFx0XHRcdGZyYW1lczogeyAvLyBwb2ludGVycyB0byBhbm90aGVyIGltYWdlIGluZGljYXRlcyB0aGF0IGltYWdlIHNob3VsZCBiZSBmbGlwcGVkLCBpZiBmbGlwPXRydWVcclxuXHRcdFx0XHRcdFwidTBcIjogbnVsbCwgXCJ1MVwiOiBbMSwgMF0sIFwidTJcIjogWzEsIDFdLFxyXG5cdFx0XHRcdFx0XCJkMFwiOiBudWxsLCBcImQxXCI6IFswLCAwXSwgXCJkMlwiOiBbMCwgMV0sXHJcblx0XHRcdFx0XHRcImwwXCI6IG51bGwsIFwibDFcIjogWzIsIDBdLCBcImwyXCI6IFsyLCAxXSxcclxuXHRcdFx0XHRcdFwicjBcIjogbnVsbCwgXCJyMVwiOiBbMywgMF0sIFwicjJcIjogWzMsIDFdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0YW5pbXM6IGdldFBva2Vtb25BbmltYXRpb25zKCksXHJcblx0XHRcdH0pO1xyXG5cdFx0Y2FzZSBcImhnX3Bva2VmbGlwXCI6XHJcblx0XHRcdHJldHVybiBleHRlbmQodHJ1ZSwgYmFzZSwgeyBcclxuXHRcdFx0XHRmcmFtZXM6IHsgLy8gcG9pbnRlcnMgdG8gYW5vdGhlciBpbWFnZSBpbmRpY2F0ZXMgdGhhdCBpbWFnZSBzaG91bGQgYmUgZmxpcHBlZCwgaWYgZmxpcD10cnVlXHJcblx0XHRcdFx0XHRcInUwXCI6IG51bGwsIFwidTFcIjogWzAsIDBdLCBcInUyXCI6IFsxLCAwXSxcclxuXHRcdFx0XHRcdFwiZDBcIjogbnVsbCwgXCJkMVwiOiBbMCwgMV0sIFwiZDJcIjogWzEsIDFdLFxyXG5cdFx0XHRcdFx0XCJsMFwiOiBudWxsLCBcImwxXCI6IFswLCAyXSwgXCJsMlwiOiBbMSwgMl0sXHJcblx0XHRcdFx0XHRcInIwXCI6IG51bGwsIFwicjFcIjogXCJsMVwiLCAgIFwicjJcIjogXCJsMlwiLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0YW5pbXM6IGdldFBva2Vtb25BbmltYXRpb25zKCksXHJcblx0XHRcdH0pO1xyXG5cdFx0Y2FzZSBcImJ3X3ZlcnRyb3dcIjpcclxuXHRcdFx0cmV0dXJuIGV4dGVuZCh0cnVlLCBiYXNlLCB7IFxyXG5cdFx0XHRcdGZyYW1lczoge1xyXG5cdFx0XHRcdFx0XCJ1MFwiOiBbMCwgMF0sIFwidTFcIjogWzEsIDBdLCBcInUyXCI6IFsyLCAwXSxcclxuXHRcdFx0XHRcdFwiZDBcIjogWzAsIDFdLCBcImQxXCI6IFsxLCAxXSwgXCJkMlwiOiBbMiwgMV0sXHJcblx0XHRcdFx0XHRcImwwXCI6IFswLCAyXSwgXCJsMVwiOiBbMSwgMl0sIFwibDJcIjogWzIsIDJdLFxyXG5cdFx0XHRcdFx0XCJyMFwiOiBbMCwgM10sIFwicjFcIjogWzEsIDNdLCBcInIyXCI6IFsyLCAzXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9KTtcclxuXHRcdGNhc2UgXCJid19ob3J6ZmxpcFwiOlxyXG5cdFx0XHRyZXR1cm4gZXh0ZW5kKHRydWUsIGJhc2UsIHsgXHJcblx0XHRcdFx0ZnJhbWVzOiB7IC8vIHBvaW50ZXJzIHRvIGFub3RoZXIgaW1hZ2UgaW5kaWNhdGVzIHRoYXQgaW1hZ2Ugc2hvdWxkIGJlIGZsaXBwZWQsIGlmIGZsaXA9dHJ1ZVxyXG5cdFx0XHRcdFx0XCJ1MFwiOiBbMCwgMF0sIFwidTFcIjogWzEsIDBdLCBcInUyXCI6IFwidTFcIixcclxuXHRcdFx0XHRcdFwiZDBcIjogWzIsIDBdLCBcImQxXCI6IFszLCAwXSwgXCJkMlwiOiBcImQxXCIsXHJcblx0XHRcdFx0XHRcImwwXCI6IFswLCAxXSwgXCJsMVwiOiBbMSwgMV0sIFwibDJcIjogWzIsIDFdLFxyXG5cdFx0XHRcdFx0XCJyMFwiOiBcImwwXCIsICAgXCJyMVwiOiBcImwxXCIsICAgXCJyMlwiOiBcImwyXCIsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fSk7XHJcblx0XHRkZWZhdWx0OlxyXG5cdFx0XHRjb25zb2xlLmVycm9yKFwiTm8gc3VjaCBTcHJpdGUgRm9ybWF0OlwiLCBuYW1lKTtcclxuXHRcdFx0cmV0dXJuIHt9O1xyXG5cdH1cclxufVxyXG5tb2R1bGUuZXhwb3J0cy5nZXRTcHJpdGVGb3JtYXQgPSBnZXRTcHJpdGVGb3JtYXQ7XHJcblxyXG5cclxuZnVuY3Rpb24gZ2V0U3RhbmRhcmRBbmltYXRpb25zKCkge1xyXG5cdHZhciBhbmltcyA9IHt9O1xyXG5cdFxyXG5cdGFuaW1zW1wic3RhbmRcIl0gPSBuZXcgU3ByaXRlQW5pbWF0aW9uKHsgc2luZ2xlRnJhbWU6IHRydWUsIH0sIFtcclxuXHRcdHsgdTogXCJ1MFwiLCBkOiBcImQwXCIsIGw6IFwibDBcIiwgcjogXCJyMFwiLCB0cmFuczogdHJ1ZSwgcGF1c2U6IHRydWUsIH0sXHJcblx0XSk7XHJcblx0YW5pbXNbXCJ3YWxrXCJdID0gbmV3IFNwcml0ZUFuaW1hdGlvbih7IGZyYW1lTGVuZ3RoOiA1LCBrZWVwRnJhbWU6IHRydWUsIH0sIFtcclxuXHRcdHsgdTogXCJ1MVwiLCBkOiBcImQxXCIsIGw6IFwibDFcIiwgcjogXCJyMVwiLCB9LFxyXG5cdFx0eyB1OiBcInUzXCIsIGQ6IFwiZDNcIiwgbDogXCJsM1wiLCByOiBcInIzXCIsIHRyYW5zOiB0cnVlLCB9LFxyXG5cdFx0eyB1OiBcInUyXCIsIGQ6IFwiZDJcIiwgbDogXCJsMlwiLCByOiBcInIyXCIsIH0sXHJcblx0XHR7IHU6IFwidTNcIiwgZDogXCJkM1wiLCBsOiBcImwzXCIsIHI6IFwicjNcIiwgdHJhbnM6IHRydWUsIGxvb3BUbzogMCwgfSxcclxuXHRdKTtcclxuXHRhbmltc1tcImJ1bXBcIl0gPSBuZXcgU3ByaXRlQW5pbWF0aW9uKHsgZnJhbWVMZW5ndGg6IDEwLCBrZWVwRnJhbWU6IHRydWUsIH0sIFtcclxuXHRcdHsgdTogXCJ1MVwiLCBkOiBcImQxXCIsIGw6IFwibDFcIiwgcjogXCJyMVwiLCBzZng6IFwid2Fsa19idW1wXCIsIH0sXHJcblx0XHR7IHU6IFwidTBcIiwgZDogXCJkMFwiLCBsOiBcImwwXCIsIHI6IFwicjBcIiwgdHJhbnM6IHRydWUsIH0sXHJcblx0XHR7IHU6IFwidTJcIiwgZDogXCJkMlwiLCBsOiBcImwyXCIsIHI6IFwicjJcIiwgc2Z4OiBcIndhbGtfYnVtcFwiLCB9LFxyXG5cdFx0eyB1OiBcInUwXCIsIGQ6IFwiZDBcIiwgbDogXCJsMFwiLCByOiBcInIwXCIsIHRyYW5zOiB0cnVlLCBsb29wVG86IDAsIH0sXHJcblx0XSk7XHJcblx0YW5pbXNbXCJ3YXJwX2F3YXlcIl0gPSBuZXcgU3ByaXRlQW5pbWF0aW9uKHsgc2luZ2xlRGlyOiBcImRcIiB9LCBbXHJcblx0XHR7IGQ6IFwiZDBcIiwgZnJhbWVMZW5ndGg6IDgsIH0sIC8vMFxyXG5cdFx0eyBkOiBcImwwXCIsIGZyYW1lTGVuZ3RoOiA4LCB9LFxyXG5cdFx0eyBkOiBcInUwXCIsIGZyYW1lTGVuZ3RoOiA4LCB9LFxyXG5cdFx0eyBkOiBcInIwXCIsIGZyYW1lTGVuZ3RoOiA4LCB9LFxyXG5cdFx0eyBkOiBcImQwXCIsIGZyYW1lTGVuZ3RoOiA3LCB9LCAvLzRcclxuXHRcdHsgZDogXCJsMFwiLCBmcmFtZUxlbmd0aDogNywgfSxcclxuXHRcdHsgZDogXCJ1MFwiLCBmcmFtZUxlbmd0aDogNywgfSxcclxuXHRcdHsgZDogXCJyMFwiLCBmcmFtZUxlbmd0aDogNywgfSxcclxuXHRcdHsgZDogXCJkMFwiLCBmcmFtZUxlbmd0aDogNSwgfSwgLy84XHJcblx0XHR7IGQ6IFwibDBcIiwgZnJhbWVMZW5ndGg6IDUsIH0sXHJcblx0XHR7IGQ6IFwidTBcIiwgZnJhbWVMZW5ndGg6IDUsIH0sXHJcblx0XHR7IGQ6IFwicjBcIiwgZnJhbWVMZW5ndGg6IDUsIH0sXHJcblx0XHR7IGQ6IFwiZDBcIiwgZnJhbWVMZW5ndGg6IDMsIH0sIC8vMTJcclxuXHRcdHsgZDogXCJsMFwiLCBmcmFtZUxlbmd0aDogMywgfSxcclxuXHRcdHsgZDogXCJ1MFwiLCBmcmFtZUxlbmd0aDogMywgfSxcclxuXHRcdHsgZDogXCJyMFwiLCBmcmFtZUxlbmd0aDogMywgfSxcclxuXHRcdHsgZDogXCJkMFwiLCBmcmFtZUxlbmd0aDogMSwgfSwgLy8xNlxyXG5cdFx0eyBkOiBcImwwXCIsIGZyYW1lTGVuZ3RoOiAxLCB9LFxyXG5cdFx0eyBkOiBcInUwXCIsIGZyYW1lTGVuZ3RoOiAxLCB9LFxyXG5cdFx0eyBkOiBcInIwXCIsIGZyYW1lTGVuZ3RoOiAxLCB9LFxyXG5cdFx0eyBkOiBcImQwXCIsIGZyYW1lTGVuZ3RoOiAwLCB0cmFuczogdHJ1ZSwgfSwgLy8yMFxyXG5cdFx0eyBkOiBcImwwXCIsIGZyYW1lTGVuZ3RoOiAwLCB0cmFuczogdHJ1ZSwgfSxcclxuXHRcdHsgZDogXCJ1MFwiLCBmcmFtZUxlbmd0aDogMCwgdHJhbnM6IHRydWUsIH0sXHJcblx0XHR7IGQ6IFwicjBcIiwgZnJhbWVMZW5ndGg6IDAsIHRyYW5zOiB0cnVlLCBsb29wVG86IDIwIH0sXHJcblx0XSk7XHJcblx0YW5pbXNbXCJ3YXJwX2luXCJdID0gbmV3IFNwcml0ZUFuaW1hdGlvbih7IHNpbmdsZURpcjogXCJkXCIgfSwgW1xyXG5cdFx0eyBkOiBcImQwXCIsIGZyYW1lTGVuZ3RoOiAxLCB9LCAvLzBcclxuXHRcdHsgZDogXCJyMFwiLCBmcmFtZUxlbmd0aDogMSwgfSxcclxuXHRcdHsgZDogXCJ1MFwiLCBmcmFtZUxlbmd0aDogMSwgfSxcclxuXHRcdHsgZDogXCJsMFwiLCBmcmFtZUxlbmd0aDogMSwgfSxcclxuXHRcdHsgZDogXCJkMFwiLCBmcmFtZUxlbmd0aDogMywgfSwgLy80XHJcblx0XHR7IGQ6IFwicjBcIiwgZnJhbWVMZW5ndGg6IDMsIH0sXHJcblx0XHR7IGQ6IFwidTBcIiwgZnJhbWVMZW5ndGg6IDMsIH0sXHJcblx0XHR7IGQ6IFwibDBcIiwgZnJhbWVMZW5ndGg6IDMsIH0sXHJcblx0XHR7IGQ6IFwiZDBcIiwgZnJhbWVMZW5ndGg6IDUsIH0sIC8vOFxyXG5cdFx0eyBkOiBcInIwXCIsIGZyYW1lTGVuZ3RoOiA1LCB9LFxyXG5cdFx0eyBkOiBcInUwXCIsIGZyYW1lTGVuZ3RoOiA1LCB9LFxyXG5cdFx0eyBkOiBcImwwXCIsIGZyYW1lTGVuZ3RoOiA1LCB9LFxyXG5cdFx0eyBkOiBcImQwXCIsIGZyYW1lTGVuZ3RoOiA3LCB9LCAvLzEyXHJcblx0XHR7IGQ6IFwicjBcIiwgZnJhbWVMZW5ndGg6IDcsIH0sXHJcblx0XHR7IGQ6IFwidTBcIiwgZnJhbWVMZW5ndGg6IDcsIH0sXHJcblx0XHR7IGQ6IFwibDBcIiwgZnJhbWVMZW5ndGg6IDcsIH0sXHJcblx0XHR7IGQ6IFwiZDBcIiwgZnJhbWVMZW5ndGg6IDgsIH0sIC8vMTZcclxuXHRcdHsgZDogXCJyMFwiLCBmcmFtZUxlbmd0aDogOCwgfSxcclxuXHRcdHsgZDogXCJ1MFwiLCBmcmFtZUxlbmd0aDogOSwgfSxcclxuXHRcdHsgZDogXCJsMFwiLCBmcmFtZUxlbmd0aDogOSwgfSxcclxuXHRcdHsgZDogXCJkMFwiLCBmcmFtZUxlbmd0aDogMSwgfSxcclxuXHRdKTtcclxuXHRcclxuXHRyZXR1cm4gYW5pbXM7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldFBva2Vtb25BbmltYXRpb25zKCkgeyAvL092ZXJyaWRlcyBTdGFuZGFyZFxyXG5cdHZhciBhbmltcyA9IHt9O1xyXG5cdGFuaW1zW1wic3RhbmRcIl0gPSBuZXcgU3ByaXRlQW5pbWF0aW9uKHsgc2luZ2xlRnJhbWU6IHRydWUsIH0sIFtcclxuXHRcdHsgdTogXCJ1MVwiLCBkOiBcImQxXCIsIGw6IFwibDFcIiwgcjogXCJyMVwiLCB0cmFuczogdHJ1ZSwgcGF1c2U6IHRydWUsIH0sXHJcblx0XSk7XHJcblx0YW5pbXNbXCJfZmxhcF9zdGFuZFwiXSA9IG5ldyBTcHJpdGVBbmltYXRpb24oeyBmcmFtZUxlbmd0aDogNSwga2VlcEZyYW1lOiB0cnVlLCB9LCBbXHJcblx0XHR7IHU6IFwidTFcIiwgZDogXCJkMVwiLCBsOiBcImwxXCIsIHI6IFwicjFcIiwgdHJhbnM6IHRydWUsIH0sXHJcblx0XHR7IHU6IFwidTJcIiwgZDogXCJkMlwiLCBsOiBcImwyXCIsIHI6IFwicjJcIiwgbG9vcFRvOiAwLCB9LFxyXG5cdF0pO1xyXG5cdGFuaW1zW1wid2Fsa1wiXSA9IG5ldyBTcHJpdGVBbmltYXRpb24oeyBmcmFtZUxlbmd0aDogNSwga2VlcEZyYW1lOiB0cnVlLCB9LCBbXHJcblx0XHR7IHU6IFwidTFcIiwgZDogXCJkMVwiLCBsOiBcImwxXCIsIHI6IFwicjFcIiwgdHJhbnM6IHRydWUsIH0sXHJcblx0XHR7IHU6IFwidTJcIiwgZDogXCJkMlwiLCBsOiBcImwyXCIsIHI6IFwicjJcIiwgbG9vcFRvOiAwLCB9LFxyXG5cdF0pO1xyXG5cdHJldHVybiBhbmltcztcclxufVxyXG5cclxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHJcbmZ1bmN0aW9uIFNwcml0ZUFuaW1hdGlvbihvcHRzLCBmcmFtZXMpIHtcclxuXHR0aGlzLm9wdGlvbnMgPSBvcHRzO1xyXG5cdHRoaXMuZnJhbWVzID0gZnJhbWVzO1xyXG5cdFxyXG5cdHRoaXMud2FpdFRpbWUgPSB0aGlzLmZyYW1lc1t0aGlzLmN1cnJGcmFtZV0uZnJhbWVMZW5ndGggfHwgdGhpcy5vcHRpb25zLmZyYW1lTGVuZ3RoO1xyXG59XHJcblNwcml0ZUFuaW1hdGlvbi5wcm90b3R5cGUgPSB7XHJcblx0b3B0aW9uczogbnVsbCxcclxuXHRmcmFtZXMgOiBudWxsLFxyXG5cdFxyXG5cdHdhaXRUaW1lIDogMCxcclxuXHRjdXJyRnJhbWU6IDAsXHJcblx0c3BlZWQgOiAxLFxyXG5cdHBhdXNlZCA6IGZhbHNlLFxyXG5cdGZpbmlzaGVkOiBmYWxzZSxcclxuXHRcclxuXHRwYXJlbnQgOiBudWxsLFxyXG5cdFxyXG5cdC8qKiBBZHZhbmNlZCB0aGUgYW5pbWF0aW9uIGJ5IHRoZSBnaXZlbiBhbW91bnQgb2YgZGVsdGEgdGltZS4gKi9cclxuXHRhZHZhbmNlIDogZnVuY3Rpb24oZGVsdGFUaW1lKSB7XHJcblx0XHRpZiAodGhpcy5vcHRpb25zLnNpbmdsZUZyYW1lKSByZXR1cm47XHJcblx0XHRpZiAodGhpcy5wYXVzZWQpIHJldHVybjtcclxuXHRcdFxyXG5cdFx0aWYgKHRoaXMud2FpdFRpbWUgPiAwKSB7XHJcblx0XHRcdHRoaXMud2FpdFRpbWUgLT0gKHRoaXMuc3BlZWQgKiAoZGVsdGFUaW1lICogQ09ORklHLnNwZWVkLmFuaW1hdGlvbikpO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdHZhciBsb29wID0gdGhpcy5mcmFtZXNbdGhpcy5jdXJyRnJhbWVdLmxvb3BUbztcclxuXHRcdGlmIChsb29wICE9PSB1bmRlZmluZWQpIHRoaXMuY3VyckZyYW1lID0gbG9vcDtcclxuXHRcdGVsc2UgdGhpcy5jdXJyRnJhbWUrKztcclxuXHRcdFxyXG5cdFx0aWYgKHRoaXMuY3VyckZyYW1lID49IHRoaXMuZnJhbWVzLmxlbmd0aCkge1xyXG5cdFx0XHR0aGlzLmN1cnJGcmFtZSA9IHRoaXMuZnJhbWVzLmxlbmd0aC0xO1xyXG5cdFx0XHR0aGlzLnBhdXNlZCA9IHRydWU7XHJcblx0XHRcdHRoaXMuZmluaXNoZWQgPSB0cnVlO1xyXG5cdFx0XHRjb25zb2xlLndhcm4oXCJBbmltYXRpb24gaGFzIGNvbXBsZXRlZCFcIik7XHJcblx0XHRcdGlmICh0aGlzLnBhcmVudCkgdGhpcy5wYXJlbnQuZW1pdChcImFuaW0tZW5kXCIsIG51bGwpOyAvL1RPRE8gcHJvdmlkZSBhbmltIG5hbWVcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHQvL25ldyBmcmFtZVxyXG5cdFx0XHJcblx0XHR0aGlzLndhaXRUaW1lID0gdGhpcy5mcmFtZXNbdGhpcy5jdXJyRnJhbWVdLmZyYW1lTGVuZ3RoIHx8IHRoaXMub3B0aW9ucy5mcmFtZUxlbmd0aDtcclxuXHRcdFxyXG5cdFx0aWYgKHRoaXMuZnJhbWVzW3RoaXMuY3VyckZyYW1lXS5wYXVzZSkgdGhpcy5wYXVzZWQgPSB0cnVlO1xyXG5cdFx0XHJcblx0XHRpZiAodGhpcy5mcmFtZXNbdGhpcy5jdXJyRnJhbWVdLnNmeCkgXHJcblx0XHRcdFNvdW5kTWFuYWdlci5wbGF5U291bmQodGhpcy5mcmFtZXNbdGhpcy5jdXJyRnJhbWVdLnNmeCk7XHJcblx0fSxcclxuXHRcclxuXHQvKiogSWYgdGhpcyBhbmltYXRpb24gaXMgb24gYSBwYXVzZSBmcmFtZSAqL1xyXG5cdHJlc3VtZSA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0dGhpcy5wYXVzZWQgPSBmYWxzZTtcclxuXHR9LFxyXG5cdFxyXG5cdC8qKiBSZXNldCB0aGUgYW5pbWF0aW9uIHBhcmFtZXRlcnMuIENhbGxlZCB3aGVuIHRoaXMgYW5pbWF0aW9uIGlzIG5vIGxvbmdlciB1c2VkLiAqL1xyXG5cdHJlc2V0IDogZnVuY3Rpb24oKSB7XHJcblx0XHR0aGlzLnBhdXNlZCA9IGZhbHNlO1xyXG5cdFx0aWYgKHRoaXMub3B0aW9ucy5rZWVwRnJhbWUpIHtcclxuXHRcdFx0Ly8gaWYgKHNlbGYuY2FuVHJhbnNpdGlvbigpKSB7XHJcblx0XHRcdC8vIFx0dmFyIGxvb3AgPSB0aGlzLmZyYW1lc1t0aGlzLmN1cnJGcmFtZV0ubG9vcFRvO1xyXG5cdFx0XHQvLyBcdGlmIChsb29wICE9PSB1bmRlZmluZWQpIHRoaXMuY3VyckZyYW1lID0gbG9vcDtcclxuXHRcdFx0Ly8gXHRlbHNlIHRoaXMuY3VyckZyYW1lKys7XHJcblx0XHRcdFx0XHJcblx0XHRcdC8vIFx0dGhpcy53YWl0VGltZSA9IHRoaXMuZnJhbWVzW3RoaXMuY3VyckZyYW1lXS5mcmFtZUxlbmd0aCB8fCB0aGlzLm9wdGlvbnMuZnJhbWVMZW5ndGg7XHJcblx0XHRcdFx0XHJcblx0XHRcdC8vIFx0aWYgKHRoaXMuZnJhbWVzW3RoaXMuY3VyckZyYW1lXS5wYXVzZSkgdGhpcy5wYXVzZWQgPSB0cnVlO1xyXG5cdFx0XHQvLyB9XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHRcdHRoaXMuZmluaXNoZWQgPSBmYWxzZTtcclxuXHRcdHRoaXMuY3VyckZyYW1lID0gMDtcclxuXHRcdHRoaXMud2FpdFRpbWUgPSB0aGlzLmZyYW1lc1t0aGlzLmN1cnJGcmFtZV0uZnJhbWVMZW5ndGggfHwgdGhpcy5vcHRpb25zLmZyYW1lTGVuZ3RoO1xyXG5cdFx0dGhpcy5zcGVlZCA9IDE7XHJcblx0fSxcclxuXHRcclxuXHQvKiogSWYgdGhpcyBhbmltYXRpb24gaXMgb24gYSBmcmFtZSB0aGF0IGNhbiB0cmFuc2l0aW9uIHRvIGFub3RoZXIgYW5pbWF0aW9uLiAqL1xyXG5cdGNhblRyYW5zaXRpb24gOiBmdW5jdGlvbigpIHtcclxuXHRcdHJldHVybiB0aGlzLmZpbmlzaGVkIHx8IHRoaXMuZnJhbWVzW3RoaXMuY3VyckZyYW1lXS50cmFucztcclxuXHR9LFxyXG5cdFxyXG5cdC8qKiBSZXR1cm5zIHRoZSBuYW1lIG9mIHRoZSBmcmFtZSB0byBkaXNwbGF5IHRoaXMgZnJhbWUuICovXHJcblx0Z2V0RnJhbWVUb0Rpc3BsYXkgOiBmdW5jdGlvbihkaXIpIHtcclxuXHRcdGlmICh0aGlzLm9wdGlvbnMuc2luZ2xlRGlyKSBkaXIgPSB0aGlzLm9wdGlvbnMuc2luZ2xlRGlyO1xyXG5cdFx0cmV0dXJuIHRoaXMuZnJhbWVzW3RoaXMuY3VyckZyYW1lXVtkaXJdO1xyXG5cdH0sXHJcbn07XHJcbm1vZHVsZS5leHBvcnRzLlNwcml0ZUFuaW1hdGlvbiA9IFNwcml0ZUFuaW1hdGlvbjsiLCIvLyBhY3Rvci5qc1xyXG4vLyBEZWZpbmVzIHRoZSBhY3RvciBldmVudCB1c2VkIHRocm91Z2hvdXQgdGhlIHBhcmtcclxuXHJcbnZhciBFdmVudCA9IHJlcXVpcmUoXCJ0cHAtZXZlbnRcIik7XHJcbnZhciBpbmhlcml0cyA9IHJlcXVpcmUoXCJpbmhlcml0c1wiKTtcclxudmFyIGV4dGVuZCA9IHJlcXVpcmUoXCJleHRlbmRcIik7XHJcblxyXG52YXIgQ2hhcmFjdGVyU3ByaXRlID0gcmVxdWlyZShcInRwcC1zcHJpdGVtb2RlbFwiKS5DaGFyYWN0ZXJTcHJpdGU7XHJcbnZhciBTcHJpdGVHbG93TWF0ZXJpYWwgPSByZXF1aXJlKFwidHBwLXNwcml0ZW1vZGVsXCIpLlNwcml0ZUdsb3dNYXRlcmlhbDtcclxudmFyIGdldFNwcml0ZUZvcm1hdCA9IHJlcXVpcmUoXCJ0cHAtYWN0b3ItYW5pbWF0aW9uc1wiKS5nZXRTcHJpdGVGb3JtYXQ7XHJcblxyXG52YXIgR0xPQkFMX1NDQUxFVVAgPSAxLjY1O1xyXG52YXIgRVZFTlRfUExBTkVfTk9STUFMID0gbmV3IFRIUkVFLlZlY3RvcjMoMCwgMSwgMCk7XHJcbi8qKlxyXG4gKiBBbiBhY3RvciBpcyBhbnkgZXZlbnQgcmVwcmVzZW50aW5nIGEgcGVyc29uLCBwb2tlbW9uLCBvciBvdGhlciBlbnRpdHkgdGhhdFxyXG4gKiBtYXkgbW92ZSBhcm91bmQgaW4gdGhlIHdvcmxkIG9yIGZhY2UgYSBkaXJlY3Rpb24uIEFjdG9ycyBtYXkgaGF2ZSBkaWZmZXJlbnRcclxuICogYmVoYXZpb3JzLCBzb21lIGNvbW1vbiBvbmVzIHByZWRlZmluZWQgaW4gdGhpcyBmaWxlLlxyXG4gKi9cclxuZnVuY3Rpb24gQWN0b3IoYmFzZSwgb3B0cykge1xyXG5cdEV2ZW50LmNhbGwodGhpcywgYmFzZSwgb3B0cyk7XHJcblx0XHJcblx0dGhpcy5vbihcInRpY2tcIiwgdGhpcy5fYWN0b3JUaWNrKTtcclxuXHR0aGlzLm9uKFwiaW50ZXJhY3RlZFwiLCB0aGlzLl9kb0JlaGF2aW9yX2ludGVyYWN0KTtcclxuXHR0aGlzLm9uKFwiYnVtcGVkXCIsIHRoaXMuX2RvQmVoYXZpb3JfYnVtcCk7XHJcblx0dGhpcy5vbihcImNhbnQtbW92ZVwiLCB0aGlzLl9hY3RvckJ1bXApO1xyXG5cdHRoaXMuZmFjaW5nID0gdGhpcy5mYWNpbmcgfHwgbmV3IFRIUkVFLlZlY3RvcjMoMCwgMCwgMSk7XHJcblx0XHJcblx0dGhpcy5faW5pdEJlaGF2aW9yU3RhY2soKTtcclxuXHRcclxuXHRpZiAodGhpcy5zY2hlZHVsZSkge1xyXG5cdFx0dGhpcy5zY2hlZHVsZSA9IEFjdG9yU2NoZWR1bGVyLmNyZWF0ZVNjaGVkdWxlKHRoaXMuaWQsIHRoaXMuc2NoZWR1bGUpO1xyXG5cdH1cclxufVxyXG5pbmhlcml0cyhBY3RvciwgRXZlbnQpO1xyXG5leHRlbmQoQWN0b3IucHJvdG90eXBlLCB7XHJcblx0c3ByaXRlOiBudWxsLFxyXG5cdHNwcml0ZV9mb3JtYXQ6IG51bGwsXHJcblx0XHJcblx0aXNMb2NhbDogZmFsc2UsXHJcblx0c2hhZG93IDogdHJ1ZSxcclxuXHRcclxuXHQvLy8vLy8vLy8vLy8vLy8vIFByb3BlcnR5IFNldHRlcnMgLy8vLy8vLy8vLy8vLy8vLy9cclxuXHRzY2FsZTogMSxcclxuXHRzY2FsZV9zaGFkb3c6IDEsXHJcblx0b2Zmc2V0X3Nwcml0ZV94OiAwLCBcclxuXHRvZmZzZXRfc3ByaXRlX3k6IDAuMyxcclxuXHRcclxuXHRzZXRTY2FsZSA6IGZ1bmN0aW9uKHNjYWxlKSB7XHJcblx0XHR0aGlzLnNjYWxlID0gc2NhbGU7XHJcblx0XHRzY2FsZSAqPSBHTE9CQUxfU0NBTEVVUDtcclxuXHRcdHRoaXMuYXZhdGFyX3Nwcml0ZS5zY2FsZS5zZXQoc2NhbGUsIHNjYWxlLCBzY2FsZSk7XHJcblx0XHR0aGlzLl9hdmF0YXJfc2hhZG93Y2FzdGVyLnNjYWxlLnNldChcclxuXHRcdFx0dGhpcy5zY2FsZV9zaGFkb3cgKiBzY2FsZSxcclxuXHRcdFx0dGhpcy5zY2FsZV9zaGFkb3cgKiBzY2FsZSxcclxuXHRcdFx0dGhpcy5zY2FsZV9zaGFkb3cgKiBzY2FsZVxyXG5cdFx0KTtcclxuXHR9LFxyXG5cdFxyXG5cdHNldFNoYWRvd1NjYWxlIDogZnVuY3Rpb24oc2NhbGUpIHtcclxuXHRcdHRoaXMuc2NhbGVfc2hhZG93ID0gc2NhbGU7XHJcblx0XHQvLyBzY2FsZSAqPSBHTE9CQUxfU0NBTEVVUDtcclxuXHRcdHRoaXMuX2F2YXRhcl9zaGFkb3djYXN0ZXIuc2NhbGUuc2V0KFxyXG5cdFx0XHR0aGlzLnNjYWxlICogc2NhbGUsXHJcblx0XHRcdHRoaXMuc2NhbGUgKiBzY2FsZSxcclxuXHRcdFx0dGhpcy5zY2FsZSAqIHNjYWxlXHJcblx0XHQpO1xyXG5cdH0sXHJcblx0XHJcblx0Ly8vLy8vLy8vLy8vLy8vLy8vLy8vLy8gQXZhdGFyIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHRhdmF0YXJfbm9kZSA6IG51bGwsXHJcblx0YXZhdGFyX3Nwcml0ZSA6IG51bGwsXHJcblx0YXZhdGFyX2Zvcm1hdCA6IG51bGwsXHJcblx0YXZhdGFyX3RleCA6IG51bGwsXHJcblx0X2F2YXRhcl9zaGFkb3djYXN0ZXIgOiBudWxsLFxyXG5cdFxyXG5cdGdldEF2YXRhciA6IGZ1bmN0aW9uKG1hcCwgZ2MpeyBcclxuXHRcdGlmICh0aGlzLmF2YXRhcl9ub2RlKSByZXR1cm4gdGhpcy5hdmF0YXJfbm9kZTtcclxuXHRcdFxyXG5cdFx0dmFyIG5vZGUgPSB0aGlzLmF2YXRhcl9ub2RlID0gbmV3IFRIUkVFLk9iamVjdDNEKCk7XHJcblx0XHRcclxuXHRcdG5vZGUuYWRkKHRoaXMuX2F2YXRhcl9jcmVhdGVTcHJpdGUobWFwLCBnYykpO1xyXG5cdFx0bm9kZS5hZGQodGhpcy5fYXZhdGFyX2NyZWF0ZVNoYWRvd0Nhc3RlcihtYXAsIGdjKSk7XHJcblx0XHQvLyBpZiAodGhpcy5nbG93X2NvbG9yKSB7XHJcblx0XHQvLyBcdG5vZGUuYWRkKHRoaXMuX2F2YXRhcl9jcmVhdGVHbG93Q2FzdGVyKG1hcCwgZ2MpKTtcclxuXHRcdC8vIH1cclxuXHRcdFxyXG5cdFx0cmV0dXJuIG5vZGU7XHJcblx0XHRcclxuXHR9LFxyXG5cdFxyXG5cdGdldFRhbGtpbmdBbmNob3IgOiBmdW5jdGlvbigpIHtcclxuXHRcdHJldHVybiB0aGlzLl9hdmF0YXJfc2hhZG93Y2FzdGVyLmxvY2FsVG9Xb3JsZChcclxuXHRcdFx0dGhpcy5fYXZhdGFyX3NoYWRvd2Nhc3Rlci5wb3NpdGlvbi5jbG9uZSgpXHJcblx0XHQpO1xyXG5cdH0sXHJcblx0XHJcblx0X2F2YXRhcl9jcmVhdGVHbG93Q2FzdGVyOiBmdW5jdGlvbihtYXAsIGdjKSB7XHJcblx0XHR2YXIgbWF0ID0gbmV3IFNwcml0ZUdsb3dNYXRlcmlhbCh7XHJcblx0XHRcdGNvbG9yOiB0aGlzLmdsb3dfY29sb3IsXHJcblx0XHR9KTtcclxuXHRcdGdjLmNvbGxlY3QobWF0KTtcclxuXHRcdFxyXG5cdFx0dmFyIGdlb20gPSBuZXcgVEhSRUUuU3BoZXJlR2VvbWV0cnkoMC44LCAyMSwgMTApO1xyXG5cdFx0Z2MuY29sbGVjdChnZW9tKTtcclxuXHRcdFxyXG5cdFx0dmFyIG1lc2ggPSBuZXcgVEhSRUUuTWVzaChnZW9tLCBtYXQpO1xyXG5cdFx0bWVzaC5wb3NpdGlvbi5zZXQoMCwgMC41LCAwKTtcclxuXHRcdFxyXG5cdFx0Ly8gc2VsZi5zZXRTY2FsZShzZWxmLnNjYWxlX3NoYWRvdyk7XHJcblx0XHQvLyBtZXNoLnNjYWxlLnNldChcclxuXHRcdC8vIFx0dGhpcy5zY2FsZV9zaGFkb3cgKiB0aGlzLnNjYWxlLCBcclxuXHRcdC8vIFx0dGhpcy5zY2FsZV9zaGFkb3cgKiB0aGlzLnNjYWxlLCBcclxuXHRcdC8vIFx0dGhpcy5zY2FsZV9zaGFkb3cgKiB0aGlzLnNjYWxlXHJcblx0XHQvLyApO1xyXG5cdFx0cmV0dXJuIHRoaXMuX2F2YXRhcl9nbG93Y2FzdGVyID0gbWVzaDtcclxuXHR9LFxyXG5cdFxyXG5cdF9hdmF0YXJfY3JlYXRlU2hhZG93Q2FzdGVyOiBmdW5jdGlvbihtYXAsIGdjKSB7XHJcblx0XHR2YXIgbWF0ID0gbmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKCk7XHJcblx0XHRtYXQudmlzaWJsZSA9IGZhbHNlOyAvL1RoZSBvYmplY3Qgd29uJ3QgcmVuZGVyLCBidXQgdGhlIHNoYWRvdyBzdGlsbCB3aWxsXHJcblx0XHRnYy5jb2xsZWN0KG1hdCk7XHJcblx0XHRcclxuXHRcdHZhciBnZW9tID0gbmV3IFRIUkVFLlNwaGVyZUdlb21ldHJ5KDAuMywgNywgMyk7XHJcblx0XHRnYy5jb2xsZWN0KGdlb20pO1xyXG5cdFx0XHJcblx0XHR2YXIgbWVzaCA9IG5ldyBUSFJFRS5NZXNoKGdlb20sIG1hdCk7XHJcblx0XHRtZXNoLmNhc3RTaGFkb3cgPSB0cnVlO1xyXG5cdFx0bWVzaC5wb3NpdGlvbi5zZXQoMCwgMC41LCAwKTtcclxuXHRcdFxyXG5cdFx0Ly8gc2VsZi5zZXRTY2FsZShzZWxmLnNjYWxlX3NoYWRvdyk7XHJcblx0XHRtZXNoLnNjYWxlLnNldChcclxuXHRcdFx0dGhpcy5zY2FsZV9zaGFkb3cgKiB0aGlzLnNjYWxlLCBcclxuXHRcdFx0dGhpcy5zY2FsZV9zaGFkb3cgKiB0aGlzLnNjYWxlLCBcclxuXHRcdFx0dGhpcy5zY2FsZV9zaGFkb3cgKiB0aGlzLnNjYWxlXHJcblx0XHQpO1xyXG5cdFx0cmV0dXJuIHRoaXMuX2F2YXRhcl9zaGFkb3djYXN0ZXIgPSBtZXNoO1xyXG5cdH0sXHJcblx0XHJcblx0X2F2YXRhcl9jcmVhdGVTcHJpdGUgOiBmdW5jdGlvbihtYXAsIGdjKSB7XHJcblx0XHR2YXIgc2VsZiA9IHRoaXM7XHJcblx0XHQvLyB2YXIgaW1nID0gbmV3IEltYWdlKCk7XHJcblx0XHR2YXIgdGV4dHVyZSA9IHNlbGYuYXZhdGFyX3RleCA9IG5ldyBUSFJFRS5UZXh0dXJlKERFRl9TUFJJVEVfSU1HKTtcclxuXHRcdGdjLmNvbGxlY3QodGV4dHVyZSk7XHJcblx0XHRcclxuXHRcdC8vIE5vdGU6IG5vdCB1c2luZyBcInRoaXMuZ2V0U3ByaXRlRm9ybWF0XCIsIGJlY2F1c2UgdGhlIGRlZmFpbHQgc3ByaXRlXHJcblx0XHQvLyBmb3JtYXQgc2hvdWxkIG5vdCBiZSBvdmVyaWRkZW4uXHJcblx0XHR2YXIgc3Bmb3JtYXQgPSBnZXRTcHJpdGVGb3JtYXQoREVGX1NQUklURV9GT1JNQVQpO1xyXG5cdFx0XHJcblx0XHR0aGlzLl9fb25Mb2FkU3ByaXRlKERFRl9TUFJJVEVfSU1HLCBzcGZvcm1hdCwgdGV4dHVyZSk7XHJcblx0XHQvLyBpbWcuc3JjID0gREVGX1NQUklURTtcclxuXHRcdFxyXG5cdFx0dGV4dHVyZS5tYWdGaWx0ZXIgPSBUSFJFRS5OZWFyZXN0RmlsdGVyO1xyXG5cdFx0dGV4dHVyZS5taW5GaWx0ZXIgPSBUSFJFRS5OZWFyZXN0RmlsdGVyO1xyXG5cdFx0dGV4dHVyZS5yZXBlYXQgPSBuZXcgVEhSRUUuVmVjdG9yMigwLjI1LCAwLjI1KTtcclxuXHRcdHRleHR1cmUub2Zmc2V0ID0gbmV3IFRIUkVFLlZlY3RvcjIoMCwgMCk7XHJcblx0XHR0ZXh0dXJlLndyYXBTID0gVEhSRUUuTWlycm9yZWRSZXBlYXRXcmFwcGluZztcclxuXHRcdHRleHR1cmUud3JhcFQgPSBUSFJFRS5NaXJyb3JlZFJlcGVhdFdyYXBwaW5nO1xyXG5cdFx0dGV4dHVyZS5nZW5lcmF0ZU1pcG1hcHMgPSBmYWxzZTsgLy9NaXBtYXBzIGdlbmVyYXRlIHVuZGVzaXJhYmxlIHRyYW5zcGFyZW5jeSBhcnRpZmFjdHNcclxuXHRcdC8vVE9ETyBNaXJyb3JlZFJlcGVhdFdyYXBwaW5nLCBhbmQganVzdCB1c2UgYSBuZWdhdGl2ZSB4IHV2IHZhbHVlLCB0byBmbGlwIGEgc3ByaXRlXHJcblx0XHRcclxuXHRcdHNlbGYuYXZhdGFyX2Zvcm1hdCA9IHNwZm9ybWF0O1xyXG5cdFx0XHJcblx0XHQvLyB2YXIgbWF0IC8qPSBzZWxmLmF2YXRhcl9tYXQqLyA9IG5ldyBUSFJFRS5TcHJpdGVNYXRlcmlhbCh7XHJcblx0XHQvLyBcdG1hcDogdGV4dHVyZSxcclxuXHRcdC8vIFx0Y29sb3I6IDB4RkZGRkZGLFxyXG5cdFx0Ly8gXHR0cmFuc3BhcmVudDogdHJ1ZSxcclxuXHRcdC8vIH0pO1xyXG5cdFx0XHJcblx0XHRjdXJyZW50TWFwLm1hcmtMb2FkaW5nKFwiQUNUT1JfXCIrc2VsZi5pZCk7XHJcblx0XHR0aGlzLl9hdmF0YXJfbG9hZFNwcml0ZShtYXAsIHRleHR1cmUpO1xyXG5cdFx0XHJcblx0XHQvL3ZhciBzcHJpdGUgPSBzZWxmLmF2YXRhcl9zcHJpdGUgPSBuZXcgVEhSRUUuU3ByaXRlKG1hdCk7XHJcblx0XHR2YXIgc3ByaXRlID0gc2VsZi5hdmF0YXJfc3ByaXRlID0gbmV3IENoYXJhY3RlclNwcml0ZSh7XHJcblx0XHRcdG1hcDogdGV4dHVyZSxcclxuXHRcdFx0Y29sb3I6IDB4RkZGRkZGLFxyXG5cdFx0XHRvZmZzZXQ6IG5ldyBUSFJFRS5WZWN0b3IzKHRoaXMub2Zmc2V0X3Nwcml0ZV94LCB0aGlzLm9mZnNldF9zcHJpdGVfeSwgMCksLy8wLjIyKSxcclxuXHRcdFx0Z2M6IGdjLFxyXG5cdFx0fSk7XHJcblx0XHQvL3NlbGYuc2V0U2NhbGUoc2VsZi5zY2FsZSk7XHJcblx0XHRzcHJpdGUuc2NhbGUuc2V0KFxyXG5cdFx0XHRzZWxmLnNjYWxlICogR0xPQkFMX1NDQUxFVVAsIFxyXG5cdFx0XHRzZWxmLnNjYWxlICogR0xPQkFMX1NDQUxFVVAsIFxyXG5cdFx0XHRzZWxmLnNjYWxlICogR0xPQkFMX1NDQUxFVVBcclxuXHRcdCk7XHJcblx0XHRcclxuXHRcdHJldHVybiBzcHJpdGU7XHJcblx0fSxcclxuXHRcclxuXHRfYXZhdGFyX2xvYWRTcHJpdGUgOiBmdW5jdGlvbihtYXAsIHRleHR1cmUpIHtcclxuXHRcdHZhciBzZWxmID0gdGhpcztcclxuXHRcdG1hcC5sb2FkU3ByaXRlKCh0aGlzLmlzTG9jYWwpPyBcIl9sb2NhbFwiOnNlbGYuaWQsIHNlbGYuc3ByaXRlLCBmdW5jdGlvbihlcnIsIHVybCl7XHJcblx0XHRcdGlmIChlcnIpIHtcclxuXHRcdFx0XHRjb25zb2xlLmVycm9yKFwiRVJST1IgTE9BRElORyBTUFJJVEU6IFwiLCBlcnIpO1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0dmFyIGltZyA9IG5ldyBJbWFnZSgpO1xyXG5cdFx0XHR2YXIgZm9ybWF0ID0gc2VsZi5zcHJpdGVfZm9ybWF0O1xyXG5cdFx0XHRpZiAoJC5pc1BsYWluT2JqZWN0KGZvcm1hdCkpIHtcclxuXHRcdFx0XHRmb3JtYXQgPSBzZWxmLnNwcml0ZV9mb3JtYXRbc2VsZi5zcHJpdGVdO1xyXG5cdFx0XHR9XHJcblx0XHRcdGlmICh0eXBlb2YgZm9ybWF0ID09IFwiZnVuY3Rpb25cIikge1xyXG5cdFx0XHRcdGZvcm1hdCA9IHNlbGYuc3ByaXRlX2Zvcm1hdChzZWxmLnNwcml0ZSk7XHJcblx0XHRcdH1cclxuXHRcdFx0aWYgKHR5cGVvZiBmb3JtYXQgIT0gXCJzdHJpbmdcIikge1xyXG5cdFx0XHRcdGNvbnNvbGUuZXJyb3IoXCJJTlZBTElEIFNQUklURSBGT1JNQVQhICdzcHJpdGVfZm9ybWF0JyBtdXN0IGJlIGEgc3RyaW5nLCBhbiBvYmplY3QsIG9yIGEgXCIrXHJcblx0XHRcdFx0XHRcImZ1bmN0aW9uIHRoYXQgcmV0dXJucyBhIHN0cmluZyEgVG8gcHJvdmlkZSBhIGN1c3RvbSBmb3JtYXQsIG92ZXJyaWRlIFwiK1xyXG5cdFx0XHRcdFx0XCJnZXRTcHJpdGVGb3JtYXQgb24gdGhlIGFjdG9yIGluc3RhbmNlIVwiKTtcclxuXHRcdFx0XHRmb3JtYXQgPSBERUZfU1BSSVRFX0ZPUk1BVDtcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0c2VsZi5fX29uTG9hZFNwcml0ZShpbWcsIHNlbGYuZ2V0U3ByaXRlRm9ybWF0KGZvcm1hdCksIHRleHR1cmUpO1xyXG5cdFx0XHRpbWcuc3JjID0gdXJsO1xyXG5cdFx0fSk7XHJcblx0fSxcclxuXHRcclxuXHRfX29uTG9hZFNwcml0ZSA6IGZ1bmN0aW9uKGltZywgZm9ybWF0LCB0ZXh0dXJlKSB7XHJcblx0XHR2YXIgc2VsZiA9IHRoaXM7XHJcblx0XHR2YXIgZiA9IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHR0ZXh0dXJlLmltYWdlID0gaW1nO1xyXG5cdFx0XHRcclxuXHRcdFx0c2VsZi5hdmF0YXJfZm9ybWF0ID0gZm9ybWF0O1xyXG5cdFx0XHR0ZXh0dXJlLnJlcGVhdC5zZXQoXHJcblx0XHRcdFx0c2VsZi5hdmF0YXJfZm9ybWF0LndpZHRoIC8gaW1nLm5hdHVyYWxXaWR0aCwgXHJcblx0XHRcdFx0c2VsZi5hdmF0YXJfZm9ybWF0LmhlaWdodCAvIGltZy5uYXR1cmFsSGVpZ2h0KTtcclxuXHRcdFx0dGV4dHVyZS5uZWVkc1VwZGF0ZSA9IHRydWU7XHJcblx0XHRcdFxyXG5cdFx0XHRzZWxmLmF2YXRhcl9zcHJpdGUud2lkdGggPSBzZWxmLmF2YXRhcl9mb3JtYXQud2lkdGg7XHJcblx0XHRcdHNlbGYuYXZhdGFyX3Nwcml0ZS5oZWlnaHQgPSBzZWxmLmF2YXRhcl9mb3JtYXQuaGVpZ2h0O1xyXG5cdFx0XHRcclxuXHRcdFx0Ly8gc2VsZi5zaG93QW5pbWF0aW9uRnJhbWUoXCJkMFwiKTtcclxuXHRcdFx0c2VsZi5wbGF5QW5pbWF0aW9uKFwic3RhbmRcIik7XHJcblx0XHRcdGN1cnJlbnRNYXAubWFya0xvYWRGaW5pc2hlZChcIkFDVE9SX1wiK3NlbGYuaWQpO1xyXG5cdFx0XHRcclxuXHRcdFx0aW1nLnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJsb2FkXCIsIGYpO1xyXG5cdFx0XHRpbWcucmVtb3ZlRXZlbnRMaXN0ZW5lcihcImxvYWRcIiwgZSk7XHJcblx0XHR9XHJcblx0XHR2YXIgZSA9IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRjb25zb2xlLmVycm9yKFwiRXJyb3Igd2hpbGUgbG9hZGluZyB0ZXh0dXJlIVwiLCBpbWcuc3JjKTtcclxuXHRcdFx0dGV4dHVyZS5uZWVkc1VwZGF0ZSA9IHRydWU7IC8vdXBkYXRlIHRoZSBtaXNzaW5nIHRleHR1cmUgcHJlLWxvYWRlZFxyXG5cdFx0XHRjdXJyZW50TWFwLm1hcmtMb2FkRmluaXNoZWQoXCJBQ1RPUl9cIitzZWxmLmlkKTtcclxuXHRcdFx0XHJcblx0XHRcdGltZy5yZW1vdmVFdmVudExpc3RlbmVyKFwibG9hZFwiLCBmKTtcclxuXHRcdFx0aW1nLnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJsb2FkXCIsIGUpO1xyXG5cdFx0fVxyXG5cdFx0aW1nLm9uKFwibG9hZFwiLCBmKTtcclxuXHRcdGltZy5vbihcImVycm9yXCIsIGUpO1xyXG5cdH0sXHJcblx0XHJcblx0Ly8gT3ZlcnJpZGUgdGhpcyBmdW5jdGlvbiB0byBwcm92aWRlIGEgY3VzdG9tIHNwcml0ZSBmb3JtYXRcclxuXHRnZXRTcHJpdGVGb3JtYXQgOiBmdW5jdGlvbihmb3JtYXQpIHtcclxuXHRcdHJldHVybiBnZXRTcHJpdGVGb3JtYXQoZm9ybWF0KTtcclxuXHR9LFxyXG5cdFxyXG5cdC8vLy8vLy8vLy8vLy8vLy8vLy8gQW5pbWF0aW9uIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHRfYW5pbWF0aW9uU3RhdGUgOiBudWxsLFxyXG5cdGZhY2luZyA6IG51bGwsXHJcblx0YW5pbWF0aW9uU3BlZWQ6IDEsIC8vZGVmYXVsdCBhbmltYXRpb24gc3BlZWRcclxuXHRcclxuXHRfaW5pdEFuaW1hdGlvblN0YXRlIDogZnVuY3Rpb24oKSB7XHJcblx0XHRpZiAoIXRoaXMuX2FuaW1hdGlvblN0YXRlKVxyXG5cdFx0XHR0aGlzLl9hbmltYXRpb25TdGF0ZSA9IHtcclxuXHRcdFx0XHRjdXJyQW5pbSA6IG51bGwsIC8vIEFuaW1hdGlvbiBvYmplY3RcclxuXHRcdFx0XHRjdXJyRnJhbWUgOiBudWxsLCAvLyBDdXJyZW50bHkgZGlzcGxheWVkIHNwcml0ZSBmcmFtZSBuYW1lXHJcblx0XHRcdFx0bmV4dEFuaW0gOiBudWxsLCAvLyBBbmltYXRpb24gb2JqZWN0IGluIHF1ZXVlXHJcblx0XHRcdFx0XHJcblx0XHRcdFx0c3RvcE5leHRUcmFuc2l0aW9uOiBmYWxzZSwgLy9TdG9wIGF0IHRoZSBuZXh0IHRyYW5zaXRpb24gZnJhbWUsIHRvIHNob3J0LXN0b3AgdGhlIFwiQnVtcFwiIGFuaW1hdGlvblxyXG5cdFx0XHR9O1xyXG5cdFx0cmV0dXJuIHRoaXMuX2FuaW1hdGlvblN0YXRlO1xyXG5cdH0sXHJcblx0XHJcblx0Z2V0RGlyZWN0aW9uRmFjaW5nIDogZnVuY3Rpb24oKSB7XHJcblx0XHRpZiAoIWN1cnJlbnRNYXAgfHwgIWN1cnJlbnRNYXAuY2FtZXJhKSByZXR1cm4gXCJkXCI7XHJcblx0XHRcclxuXHRcdHZhciBkaXJ2ZWN0b3IgPSB0aGlzLmZhY2luZy5jbG9uZSgpO1xyXG5cdFx0ZGlydmVjdG9yLmFwcGx5UXVhdGVybmlvbiggY3VycmVudE1hcC5jYW1lcmEucXVhdGVybmlvbiApO1xyXG5cdFx0ZGlydmVjdG9yLnByb2plY3RPblBsYW5lKEVWRU5UX1BMQU5FX05PUk1BTCkubm9ybWFsaXplKCk7XHJcblx0XHRcclxuXHRcdHZhciB4ID0gZGlydmVjdG9yLngsIHkgPSBkaXJ2ZWN0b3IuejtcclxuXHRcdC8vIGNvbnNvbGUubG9nKFwiRElSRkFDSU5HOlwiLCB4LCB5KTtcclxuXHRcdGlmIChNYXRoLmFicyh4KSA+IE1hdGguYWJzKHkpKSB7IC8vRGlyZWN0aW9uIHZlY3RvciBpcyBwb2ludGluZyBhbG9uZyB4IGF4aXNcclxuXHRcdFx0aWYgKHggPiAwKSByZXR1cm4gXCJsXCI7XHJcblx0XHRcdGVsc2UgcmV0dXJuIFwiclwiO1xyXG5cdFx0fSBlbHNlIHsgLy9EaXJlY3Rpb24gdmVjdG9yIGlzIHBvaW50aW5nIGFsb25nIHkgYXhpc1xyXG5cdFx0XHRpZiAoeSA+IDApIHJldHVybiBcImRcIjtcclxuXHRcdFx0ZWxzZSByZXR1cm4gXCJ1XCI7XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gXCJkXCI7XHJcblx0fSxcclxuXHRcclxuXHRzaG93QW5pbWF0aW9uRnJhbWUgOiBmdW5jdGlvbihmcmFtZSkge1xyXG5cdFx0dmFyIHN0YXRlID0gdGhpcy5faW5pdEFuaW1hdGlvblN0YXRlKCk7XHJcblx0XHRcclxuXHRcdHZhciBkZWYgPSB0aGlzLmF2YXRhcl9mb3JtYXQuZnJhbWVzW2ZyYW1lXTtcclxuXHRcdGlmICghZGVmKSB7XHJcblx0XHRcdGNvbnNvbGUud2FybihcIkVSUk9SIFwiLCB0aGlzLmlkLCBcIjogQW5pbWF0aW9uIGZyYW1lIGRvZXNuJ3QgZXhpc3Q6XCIsIGZyYW1lKTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cdFx0c3RhdGUuZnJhbWVOYW1lID0gZnJhbWU7XHJcblx0XHRcclxuXHRcdHZhciBmbGlwID0gZmFsc2U7XHJcblx0XHRpZiAodHlwZW9mIGRlZiA9PSBcInN0cmluZ1wiKSB7IC8vcmVkaXJlY3RcclxuXHRcdFx0ZGVmID0gdGhpcy5hdmF0YXJfZm9ybWF0LmZyYW1lc1tkZWZdO1xyXG5cdFx0XHRmbGlwID0gdHJ1ZTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0dmFyIHUgPSBkZWZbMF0gKiB0aGlzLmF2YXRhcl90ZXgucmVwZWF0Lng7XHJcblx0XHR2YXIgdiA9IDEgLSAoKGRlZlsxXSsxKSAqIHRoaXMuYXZhdGFyX3RleC5yZXBlYXQueSk7XHJcblx0XHQvL0ZvciBzb21lIHJlYXNvbiwgb2Zmc2V0cyBhcmUgZnJvbSB0aGUgQk9UVE9NIGxlZnQ/IVxyXG5cdFx0XHJcblx0XHRpZiAoZmxpcCAmJiB0aGlzLmF2YXRhcl9mb3JtYXQuZmxpcCkge1xyXG5cdFx0XHR1ID0gMCAtIChkZWZbMF0tMSkgKiB0aGlzLmF2YXRhcl90ZXgucmVwZWF0Lng7IC8vVE9ETyB0ZXN0XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdHRoaXMuYXZhdGFyX3RleC5vZmZzZXQuc2V0KHUsIHYpOyBcclxuXHRcdHRoaXMuYXZhdGFyX3RleC5uZWVkc1VwZGF0ZSA9IHRydWU7XHJcblx0fSxcclxuXHRcclxuXHRwbGF5QW5pbWF0aW9uIDogZnVuY3Rpb24oYW5pbU5hbWUsIG9wdHMpIHtcclxuXHRcdHZhciBzdGF0ZSA9IHRoaXMuX2luaXRBbmltYXRpb25TdGF0ZSgpO1xyXG5cdFx0aWYgKCFvcHRzKSBvcHRzID0ge307XHJcblx0XHRcclxuXHRcdHZhciBhbmltID0gdGhpcy5hdmF0YXJfZm9ybWF0LmFuaW1zW2FuaW1OYW1lXTtcclxuXHRcdGlmICghYW5pbSkge1xyXG5cdFx0XHRjb25zb2xlLndhcm4oXCJFUlJPUlwiLCB0aGlzLmlkLCBcIjogQW5pbWF0aW9uIG5hbWUgZG9lc24ndCBleGlzdDpcIiwgYW5pbU5hbWUpO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblx0XHRhbmltLnBhcmVudCA9IHRoaXM7XHJcblx0XHRzdGF0ZS5uZXh0QW5pbSA9IGFuaW07XHJcblx0XHRhbmltLnNwZWVkID0gKG9wdHMuc3BlZWQgPT0gdW5kZWZpbmVkKT8gdGhpcy5hbmltYXRpb25TcGVlZCA6IG9wdHMuc3BlZWQ7XHJcblx0XHRzdGF0ZS5zdG9wTmV4dFRyYW5zaXRpb24gPSBvcHRzLnN0b3BOZXh0VHJhbnNpdGlvbiB8fCBmYWxzZTtcclxuXHR9LFxyXG5cdFxyXG5cdHJlc3VtZUFuaW1hdGlvbjogZnVuY3Rpb24oKSB7XHJcblx0XHR2YXIgc3RhdGUgPSB0aGlzLl9pbml0QW5pbWF0aW9uU3RhdGUoKTtcclxuXHRcdFxyXG5cdFx0aWYgKHN0YXRlLmN1cnJBbmltKVxyXG5cdFx0XHRzdGF0ZS5jdXJyQW5pbS5yZXN1bWUoKTtcclxuXHR9LFxyXG5cdFxyXG5cdHN0b3BBbmltYXRpb24gOiBmdW5jdGlvbigpIHtcclxuXHRcdHZhciBzdGF0ZSA9IHRoaXMuX2luaXRBbmltYXRpb25TdGF0ZSgpO1xyXG5cdFx0XHJcblx0XHQvLyBzdGF0ZS5ydW5uaW5nID0gZmFsc2U7XHJcblx0XHQvLyBzdGF0ZS5xdWV1ZSA9IG51bGw7XHJcblx0XHQvLyBzdGF0ZS5zdG9wRnJhbWUgPSBudWxsO1xyXG5cdFx0dGhpcy5lbWl0KFwiYW5pbS1lbmRcIiwgc3RhdGUuYW5pbU5hbWUpO1xyXG5cdH0sXHJcblx0XHJcblx0c2hvd0Vtb3RlOiBmdW5jdGlvbihlbW90ZSwgdGltZW91dCkge1xyXG5cdFx0dmFyIGUgPSB0aGlzLl9fY3VyckVtb3RlO1xyXG5cdFx0aWYgKCFlKSBcclxuXHRcdFx0ZSA9IHRoaXMuX19jdXJyRW1vdGUgPSBVSS5nZXRFbW90ZUJ1YmJsZSgpO1xyXG5cdFx0XHJcblx0XHRlLnNldFR5cGUoZW1vdGUpO1xyXG5cdFx0ZS5oZWlnaHQgPSB0aGlzLmF2YXRhcl9zcHJpdGUuaGVpZ2h0O1xyXG5cdFx0aWYgKHRpbWVvdXQpIHtcclxuXHRcdFx0ZS5zZXRUaW1lb3V0KHRpbWVvdXQpO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHR0aGlzLmF2YXRhcl9zcHJpdGUuYWRkKGUpO1xyXG5cdFx0ZS5zaG93KCk7XHJcblx0fSxcclxuXHRcclxuXHRoaWRlRW1vdGU6IGZ1bmN0aW9uKCkge1xyXG5cdFx0dmFyIGUgPSB0aGlzLl9fY3VyckVtb3RlO1xyXG5cdFx0ZS5oaWRlKGZ1bmN0aW9uKCl7XHJcblx0XHRcdGUucmVsZWFzZSgpO1xyXG5cdFx0fSk7XHJcblx0XHR0aGlzLl9fY3VyckVtb3RlID0gbnVsbDtcclxuXHR9LFxyXG5cdFxyXG5cdF90aWNrX2RvQW5pbWF0aW9uOiBmdW5jdGlvbihkZWx0YSkge1xyXG5cdFx0dmFyIHN0YXRlID0gdGhpcy5fYW5pbWF0aW9uU3RhdGU7XHJcblx0XHR2YXIgQ0EgPSBzdGF0ZS5jdXJyQW5pbTtcclxuXHRcdGlmICghQ0EpIENBID0gc3RhdGUuY3VyckFuaW0gPSBzdGF0ZS5uZXh0QW5pbTtcclxuXHRcdGlmICghQ0EpIHJldHVybjtcclxuXHRcdFxyXG5cdFx0Q0EuYWR2YW5jZShkZWx0YSk7XHJcblx0XHRcclxuXHRcdGlmIChzdGF0ZS5uZXh0QW5pbSAmJiBDQS5jYW5UcmFuc2l0aW9uKCkpIHtcclxuXHRcdFx0Ly9Td2l0Y2ggYW5pbWF0aW9uc1xyXG5cdFx0XHRDQS5yZXNldCgpO1xyXG5cdFx0XHRDQSA9IHN0YXRlLmN1cnJBbmltID0gc3RhdGUubmV4dEFuaW07XHJcblx0XHRcdHN0YXRlLm5leHRBbmltID0gbnVsbDtcclxuXHRcdFx0XHJcblx0XHRcdC8vIHRoaXMuZW1pdChcImFuaW0tZW5kXCIsIG51bGwpOyAvL1RPRE8gcHJvdmlkZSBhbmltIG5hbWVcclxuXHRcdFx0XHJcblx0XHRcdGlmIChzdGF0ZS5zdG9wTmV4dFRyYW5zaXRpb24pIHtcclxuXHRcdFx0XHR0aGlzLnBsYXlBbmltYXRpb24oXCJzdGFuZFwiKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHR2YXIgZGlyID0gdGhpcy5nZXREaXJlY3Rpb25GYWNpbmcoKTtcclxuXHRcdHZhciBmcmFtZSA9IENBLmdldEZyYW1lVG9EaXNwbGF5KGRpcik7XHJcblx0XHRpZiAoZnJhbWUgIT0gc3RhdGUuY3VyckZyYW1lKSB7XHJcblx0XHRcdHRoaXMuc2hvd0FuaW1hdGlvbkZyYW1lKGZyYW1lKTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdH0sXHJcblx0XHJcblx0Ly8vLy8vLy8vLy8vLy8vLy8vLyBNb3ZlbWVudCBhbmQgUGF0aGluZyAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblx0X3BhdGhpbmdTdGF0ZSA6IG51bGwsXHJcblx0XHJcblx0X2luaXRQYXRoaW5nU3RhdGUgOiBmdW5jdGlvbigpIHtcclxuXHRcdGlmICghdGhpcy5fcGF0aGluZ1N0YXRlKVxyXG5cdFx0XHR0aGlzLl9wYXRoaW5nU3RhdGUgPSB7XHJcblx0XHRcdFx0cXVldWU6IFtdLFxyXG5cdFx0XHRcdG1vdmluZzogZmFsc2UsXHJcblx0XHRcdFx0c3BlZWQ6IDEsXHJcblx0XHRcdFx0ZGVsdGE6IDAsIC8vdGhlIGRlbHRhIGZyb20gc3JjIHRvIGRlc3RcclxuXHRcdFx0XHRqdW1waW5nIDogZmFsc2UsXHJcblx0XHRcdFx0Ly8gZGlyOiBcImRcIixcclxuXHRcdFx0XHRcclxuXHRcdFx0XHRkZXN0TG9jQzogbmV3IFRIUkVFLlZlY3RvcjMoKS5zZXQodGhpcy5sb2NhdGlvbiksIC8vY29sbGlzaW9uIG1hcCBsb2NhdGlvblxyXG5cdFx0XHRcdGRlc3RMb2MzOiBuZXcgVEhSRUUuVmVjdG9yMygpLCAvL3dvcmxkIHNwYWNlIGxvY2F0aW9uXHJcblx0XHRcdFx0c3JjTG9jQzogbmV3IFRIUkVFLlZlY3RvcjMoKS5zZXQodGhpcy5sb2NhdGlvbiksXHJcblx0XHRcdFx0c3JjTG9jMzogbmV3IFRIUkVFLlZlY3RvcjMoKSxcclxuXHRcdFx0XHRtaWRwb2ludE9mZnNldDogbmV3IFRIUkVFLlZlY3RvcjMoKSxcclxuXHRcdFx0fTtcclxuXHRcdHJldHVybiB0aGlzLl9wYXRoaW5nU3RhdGU7XHJcblx0fSxcclxuXHRcclxuXHRwYXRoVG8gOiBmdW5jdGlvbih4LCB5KSB7XHJcblx0XHR2YXIgc3RhdGUgPSB0aGlzLl9pbml0UGF0aGluZ1N0YXRlKCk7XHJcblx0XHRcclxuXHRcdGNvbnNvbGUuZXJyb3IodGhpcy5pZCwgXCI6IFBhdGhpbmcgaGFzIG5vdCBiZWVuIGltcGxlbWVudGVkIHlldCFcIik7XHJcblx0fSxcclxuXHRcclxuXHRjbGVhclBhdGhpbmcgOiBmdW5jdGlvbigpIHtcclxuXHRcdHZhciBzdGF0ZSA9IHRoaXMuX2luaXRQYXRoaW5nU3RhdGUoKTtcclxuXHRcdHN0YXRlLnF1ZXVlLmxlbmd0aCA9IDA7XHJcblx0fSxcclxuXHRcclxuXHRtb3ZlRGlyIDogZnVuY3Rpb24oZGlyKSB7XHJcblx0XHR2YXIgeCA9IHRoaXMubG9jYXRpb24ueDtcclxuXHRcdHZhciB5ID0gdGhpcy5sb2NhdGlvbi55O1xyXG5cdFx0dmFyIHogPSB0aGlzLmxvY2F0aW9uLno7XHJcblx0XHRzd2l0Y2ggKGRpcikge1xyXG5cdFx0XHRjYXNlIFwiZFwiOiBjYXNlIFwiZG93blwiOlx0eSArPSAxOyBicmVhaztcclxuXHRcdFx0Y2FzZSBcInVcIjogY2FzZSBcInVwXCI6XHR5IC09IDE7IGJyZWFrO1xyXG5cdFx0XHRjYXNlIFwibFwiOiBjYXNlIFwibGVmdFwiOlx0eCAtPSAxOyBicmVhaztcclxuXHRcdFx0Y2FzZSBcInJcIjogY2FzZSBcInJpZ2h0XCI6XHR4ICs9IDE7IGJyZWFrO1xyXG5cdFx0fVxyXG5cdFx0dGhpcy5tb3ZlVG8oeCwgeSwgeik7XHJcblx0fSxcclxuXHRcclxuXHRmYWNlSW50ZXJhY3RvciA6IGZ1bmN0aW9uKHZlY3Rvcikge1xyXG5cdFx0dGhpcy5mYWNpbmcgPSB2ZWN0b3IuY2xvbmUoKS5uZWdhdGUoKTtcclxuXHR9LFxyXG5cdFxyXG5cdGZhY2VEaXIgOiBmdW5jdGlvbih4LCB5KSB7XHJcblx0XHR0aGlzLmZhY2luZy5zZXQoLXgsIDAsIHkpO1xyXG5cdH0sXHJcblx0XHJcblx0bW92ZVRvIDogZnVuY3Rpb24oeCwgeSwgbGF5ZXIsIG9wdHMpIHsgLy9ieXBhc3MgV2Fsa21hc2sgQ2hlY2tcclxuXHRcdGlmICgkLmlzUGxhaW5PYmplY3QobGF5ZXIpICYmIG9wdHMgPT09IHVuZGVmaW5lZCkge1xyXG5cdFx0XHRvcHRzID0gbGF5ZXI7IGxheWVyID0gdW5kZWZpbmVkO1xyXG5cdFx0fVxyXG5cdFx0aWYgKG9wdHMgPT09IHVuZGVmaW5lZCkgb3B0cyA9IHt9O1xyXG5cdFx0XHJcblx0XHR2YXIgc3RhdGUgPSB0aGlzLl9pbml0UGF0aGluZ1N0YXRlKCk7XHJcblx0XHR2YXIgc3JjID0gdGhpcy5sb2NhdGlvbjtcclxuXHRcdGxheWVyID0gKGxheWVyID09IHVuZGVmaW5lZCk/IHRoaXMubG9jYXRpb24ueiA6IGxheWVyO1xyXG5cdFx0XHJcblx0XHR0aGlzLmZhY2luZy5zZXQoc3JjLngteCwgMCwgeS1zcmMueSk7XHJcblx0XHRcclxuXHRcdHZhciB3YWxrbWFzayA9IGN1cnJlbnRNYXAuY2FuV2Fsa0JldHdlZW4oc3JjLngsIHNyYy55LCB4LCB5KTtcclxuXHRcdGlmIChvcHRzLmJ5cGFzcyAhPT0gdW5kZWZpbmVkKSB3YWxrbWFzayA9IG9wdHMuYnlwYXNzO1xyXG5cdFx0aWYgKCF3YWxrbWFzaykge1xyXG5cdFx0XHR0aGlzLmVtaXQoXCJjYW50LW1vdmVcIiwgc3JjLngsIHNyYy55LCB4LCB5KTtcclxuXHRcdFx0Y3VycmVudE1hcC5kaXNwYXRjaCh4LCB5LCBcImJ1bXBlZFwiLCB0aGlzLmZhY2luZyk7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHRcdGlmICgod2Fsa21hc2sgJiAweDEwKSA9PSAweDEwKSB7IC8vIENoZWNrIE5vTlBDIHRpbGVzXHJcblx0XHRcdGlmICh0aGlzLmlzTlBDKCkpIHtcclxuXHRcdFx0XHR0aGlzLmVtaXQoXCJjYW50LW1vdmVcIiwgc3JjLngsIHNyYy55LCB4LCB5KTtcclxuXHRcdFx0XHRjdXJyZW50TWFwLmRpc3BhdGNoKHgsIHksIFwiYnVtcGVkXCIsIHRoaXMuZmFjaW5nKTtcclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdGlmICgod2Fsa21hc2sgJiAweDgpID09IDB4OCkge1xyXG5cdFx0XHQvLyBUcmFuc2l0aW9uIG5vdyB0byBhbm90aGVyIGxheWVyXHJcblx0XHRcdHZhciB0ID0gY3VycmVudE1hcC5nZXRMYXllclRyYW5zaXRpb24oeCwgeSwgdGhpcy5sb2NhdGlvbi56KTtcclxuXHRcdFx0Ly8gY29uc29sZS5sb2coXCJMYXllciBUcmFuc2l0aW9uOiBcIiwgdCk7XHJcblx0XHRcdHRoaXMuZW1pdChcImNoYW5nZS1sYXllclwiLCB0aGlzLmxvY2F0aW9uLnosIHQubGF5ZXIpO1xyXG5cdFx0XHR4ID0gdC54OyB5ID0gdC55OyBsYXllciA9IHQubGF5ZXI7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdFxyXG5cdFx0dmFyIGFuaW1vcHRzID0ge307XHJcblx0XHRzdGF0ZS5taWRwb2ludE9mZnNldC5zZXQoMCwgMCwgMCk7XHJcblx0XHRzdGF0ZS5zcmNMb2NDLnNldChzcmMpO1xyXG5cdFx0c3RhdGUuc3JjTG9jMy5zZXQoY3VycmVudE1hcC5nZXQzRFRpbGVMb2NhdGlvbihzcmMpKTtcclxuXHRcdHN0YXRlLmRlc3RMb2NDLnNldCh4LCB5LCBsYXllcik7XHJcblx0XHRzdGF0ZS5kZXN0TG9jMy5zZXQoY3VycmVudE1hcC5nZXQzRFRpbGVMb2NhdGlvbih4LCB5LCBsYXllcikpO1xyXG5cdFx0c3RhdGUuZGVsdGEgPSAwO1xyXG5cdFx0c3RhdGUuc3BlZWQgPSBvcHRzLnNwZWVkIHx8IDE7XHJcblx0XHRzdGF0ZS5tb3ZpbmcgPSB0cnVlO1xyXG5cdFx0YW5pbW9wdHMuc3BlZWQgPSBvcHRzLnNwZWVkIHx8IDE7XHJcblx0XHRcclxuXHRcdGlmICgod2Fsa21hc2sgJiAweDIpID09PSAweDIpIHtcclxuXHRcdFx0c3RhdGUubWlkcG9pbnRPZmZzZXQuc2V0WSggKChzdGF0ZS5zcmNMb2MzLnkgLSBzdGF0ZS5kZXN0TG9jMy55KSAvIDIpICsgMC42KTtcclxuXHRcdFx0c3RhdGUuanVtcGluZyA9IHRydWU7XHJcblx0XHRcdC8vZW5mb3JjZSBhIGp1bXBpbmcgc3BlZWQgb2YgYmFzZWQgb24gaGVpZ2h0LiBUaGUgYmVsb3cgc2hvdWxkIGJlIDEgd2l0aCBhIGRlZmF1bHQgc3RlcCBvZiAwLjVcclxuXHRcdFx0c3RhdGUuc3BlZWQgPSAxOy8vKChzdGF0ZS5zcmNMb2MzLnkgLSBzdGF0ZS5kZXN0TG9jMy55KSkgKiAwLjUgKyAwLjc1OyBcclxuXHRcdFx0U291bmRNYW5hZ2VyLnBsYXlTb3VuZChcIndhbGtfanVtcFwiKTtcclxuXHRcdFx0YW5pbW9wdHMuc3BlZWQgPSAxLjU7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdHRoaXMucGxheUFuaW1hdGlvbihcIndhbGtcIiwgYW5pbW9wdHMpO1xyXG5cdFx0dGhpcy5lbWl0KFwibW92aW5nXCIsIHN0YXRlLnNyY0xvY0MueCwgc3RhdGUuc3JjTG9jQy55LCBzdGF0ZS5kZXN0TG9jQy54LCBzdGF0ZS5kZXN0TG9jQy55KTtcclxuXHR9LFxyXG5cdFxyXG5cdF90aWNrX2RvTW92ZW1lbnQgOiBmdW5jdGlvbihkZWx0YSkge1xyXG5cdFx0dmFyIHN0YXRlID0gdGhpcy5faW5pdFBhdGhpbmdTdGF0ZSgpO1xyXG5cdFx0XHJcblx0XHRzdGF0ZS5kZWx0YSArPSBzdGF0ZS5zcGVlZCAqIChkZWx0YSAqIENPTkZJRy5zcGVlZC5wYXRoaW5nKTtcclxuXHRcdHZhciBhbHBoYSA9IE1hdGguY2xhbXAoc3RhdGUuZGVsdGEpO1xyXG5cdFx0dmFyIGJldGEgPSBNYXRoLnNpbihhbHBoYSAqIE1hdGguUEkpO1xyXG5cdFx0dGhpcy5hdmF0YXJfbm9kZS5wb3NpdGlvbi5zZXQoIFxyXG5cdFx0XHQvL0xlcnAgYmV0d2VlbiBzcmMgYW5kIGRlc3QgKGJ1aWx0IGluIGxlcnAoKSBpcyBkZXN0cnVjdGl2ZSwgYW5kIHNlZW1zIGJhZGx5IGRvbmUpXHJcblx0XHRcdHN0YXRlLnNyY0xvYzMueCArICgoc3RhdGUuZGVzdExvYzMueCAtIHN0YXRlLnNyY0xvYzMueCkgKiBhbHBoYSkgKyAoc3RhdGUubWlkcG9pbnRPZmZzZXQueCAqIGJldGEpLFxyXG5cdFx0XHRzdGF0ZS5zcmNMb2MzLnkgKyAoKHN0YXRlLmRlc3RMb2MzLnkgLSBzdGF0ZS5zcmNMb2MzLnkpICogYWxwaGEpICsgKHN0YXRlLm1pZHBvaW50T2Zmc2V0LnkgKiBiZXRhKSxcclxuXHRcdFx0c3RhdGUuc3JjTG9jMy56ICsgKChzdGF0ZS5kZXN0TG9jMy56IC0gc3RhdGUuc3JjTG9jMy56KSAqIGFscGhhKSArIChzdGF0ZS5taWRwb2ludE9mZnNldC56ICogYmV0YSlcclxuXHRcdCk7XHJcblx0XHRcclxuXHRcdGlmIChzdGF0ZS5kZWx0YSA+IDEpIHtcclxuXHRcdFx0dGhpcy5lbWl0KFwibW92ZWRcIiwgc3RhdGUuc3JjTG9jQy54LCBzdGF0ZS5zcmNMb2NDLnksIHN0YXRlLmRlc3RMb2NDLngsIHN0YXRlLmRlc3RMb2NDLnkpO1xyXG5cdFx0XHR0aGlzLmxvY2F0aW9uLnNldCggc3RhdGUuZGVzdExvY0MgKTtcclxuXHRcdFx0XHJcblx0XHRcdGlmIChzdGF0ZS5qdW1waW5nKSB7XHJcblx0XHRcdFx0Ly9UT0RPIHBhcnRpY2xlIGVmZmVjdHNcclxuXHRcdFx0XHRTb3VuZE1hbmFnZXIucGxheVNvdW5kKFwid2Fsa19qdW1wX2xhbmRcIik7XHJcblx0XHRcdFx0c3RhdGUuanVtcGluZyA9IGZhbHNlO1xyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHR2YXIgbmV4dCA9IHN0YXRlLnF1ZXVlLnNoaWZ0KCk7XHJcblx0XHRcdGlmICghbmV4dCkge1xyXG5cdFx0XHRcdHN0YXRlLmRlbHRhID0gMDtcclxuXHRcdFx0XHRzdGF0ZS5tb3ZpbmcgPSBmYWxzZTtcclxuXHRcdFx0XHQvLyB0aGlzLnN0b3BBbmltYXRpb24oKTtcclxuXHRcdFx0XHR0aGlzLnBsYXlBbmltYXRpb24oXCJzdGFuZFwiKTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHR0aGlzLm1vdmVUbyhuZXh0LngsIG5leHQueSwgbmV4dC56KTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH0sXHJcblx0XHJcblx0XHJcblx0Ly8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vIEJlaGF2aW9ycyAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblx0YmVoYXZpb3JTdGFjayA6IG51bGwsXHJcblx0XHJcblx0X2luaXRCZWhhdmlvclN0YWNrIDogZnVuY3Rpb24oKSB7XHJcblx0XHRpZiAoIXRoaXMuYmVoYXZpb3JTdGFjaylcclxuXHRcdFx0dGhpcy5iZWhhdmlvclN0YWNrID0gW107XHJcblx0fSxcclxuXHRcclxuXHRfdGlja19kb0JlaGF2aW9yIDogZnVuY3Rpb24oZGVsdGEpIHtcclxuXHRcdHZhciBiZWhhdiA9IHRoaXMuYmVoYXZpb3JTdGFjay50b3A7XHJcblx0XHRpZiAoIWJlaGF2IHx8ICFiZWhhdi5fdGljaykgcmV0dXJuO1xyXG5cdFx0aWYgKCFiZWhhdi5vd25lcikgYmVoYXYub3duZXIgPSB0aGlzO1xyXG5cdFx0YmVoYXYuX3RpY2sodGhpcywgZGVsdGEpO1xyXG5cdH0sXHJcblx0XHJcblx0X2RvQmVoYXZpb3JfaW50ZXJhY3QgOiBmdW5jdGlvbihmcm9tRGlyKSB7XHJcblx0XHR2YXIgYmVoYXYgPSB0aGlzLmJlaGF2aW9yU3RhY2sudG9wO1xyXG5cdFx0aWYgKCFiZWhhdiB8fCAhYmVoYXYuX2ludGVyYWN0KSByZXR1cm47XHJcblx0XHRiZWhhdi5faW50ZXJhY3QodGhpcywgZnJvbURpcik7XHJcblx0fSxcclxuXHRcclxuXHRfZG9CZWhhdmlvcl9idW1wIDogZnVuY3Rpb24oZnJvbURpcikge1xyXG5cdFx0dmFyIGJlaGF2ID0gdGhpcy5iZWhhdmlvclN0YWNrLnRvcDtcclxuXHRcdGlmICghYmVoYXYgfHwgIWJlaGF2Ll9idW1wKSByZXR1cm47XHJcblx0XHRiZWhhdi5fYnVtcCh0aGlzLCBmcm9tRGlyKTtcclxuXHR9LFxyXG5cdFxyXG5cdC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cdFxyXG5cdHNob3VsZEFwcGVhcjogZnVuY3Rpb24obWFwaWQpIHtcclxuXHRcdGlmICh0aGlzLnNjaGVkdWxlKSB7XHJcblx0XHRcdHZhciB0aW1lc3RhbXAgPSBBY3RvclNjaGVkdWxlci5nZXRUaW1lc3RhbXAoKTtcclxuXHRcdFx0dmFyIHNob3VsZCA9IHRoaXMuc2NoZWR1bGVbdGltZXN0YW1wXSA9PSBtYXBpZDtcclxuXHRcdFx0aWYgKCFzaG91bGQpIGNvbnNvbGUubG9nKFwiQWN0b3JcIiwgdGhpcy5pZCwgXCJzaG91bGQgTk9UIGFwcGVhciBhY2NvcmRpbmcgdG8gc2NoZWR1bGVyLi4uIFwiLCB0aGlzLnNjaGVkdWxlW3RpbWVzdGFtcF0pO1xyXG5cdFx0XHRyZXR1cm4gc2hvdWxkO1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIHRydWU7IC8vbm8gc2NoZWR1bGUsIGFsd2F5cyBhcHBlYXJcclxuXHR9LFxyXG5cdFxyXG5cdHNjaGVkdWxlOiBudWxsLFxyXG5cdFxyXG5cdC8vLy8vLy8vLy8vLy8vLy8vLy8vLyBQcml2YXRlIE1ldGhvZHMgLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cdFxyXG5cdGNhbldhbGtPbiA6IGZ1bmN0aW9uKCl7IHJldHVybiBmYWxzZTsgfSxcclxuXHRpc05QQyA6IGZ1bmN0aW9uKCl7IHJldHVybiB0cnVlOyB9LFxyXG5cdFxyXG5cdF9ub3JtYWxpemVMb2NhdGlvbiA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0aWYgKHRoaXMubG9jYXRpb24gPT0gXCJyYW5kXCIpIHtcclxuXHRcdFx0Ly9QbGFjZSB0aGlzIGFjdG9yIGluIGEgZGVzaWduYXRlZCByYW5kb20gbG9jYXRpb25cclxuXHRcdFx0dGhpcy5sb2NhdGlvbiA9IGN1cnJlbnRNYXAuZ2V0UmFuZG9tTlBDU3Bhd25Qb2ludCgpO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdHZhciBudW0gPSBFdmVudC5wcm90b3R5cGUuX25vcm1hbGl6ZUxvY2F0aW9uLmNhbGwodGhpcyk7XHJcblx0XHRpZiAobnVtICE9IDEgfHwgIXRoaXMubG9jYXRpb24pXHJcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIkFjdG9ycyBjYW4gb25seSBiZSBpbiBvbmUgcGxhY2UgYXQgYSB0aW1lISBOdW1iZXIgb2YgbG9jYXRpb25zOiBcIitudW0pO1xyXG5cdH0sXHJcblx0XHJcblx0X2FjdG9yVGljayA6IGZ1bmN0aW9uKGRlbHRhKSB7XHJcblx0XHQvLyBEbyBhbmltYXRpb25cclxuXHRcdGlmICh0aGlzLl9hbmltYXRpb25TdGF0ZSkgXHJcblx0XHRcdHRoaXMuX3RpY2tfZG9BbmltYXRpb24oZGVsdGEpO1xyXG5cdFx0XHJcblx0XHQvLyBEbyBtb3ZlbWVudFxyXG5cdFx0aWYgKHRoaXMuX3BhdGhpbmdTdGF0ZSAmJiB0aGlzLl9wYXRoaW5nU3RhdGUubW92aW5nKVxyXG5cdFx0XHR0aGlzLl90aWNrX2RvTW92ZW1lbnQoZGVsdGEpO1xyXG5cdFx0XHJcblx0XHQvLyBEbyBiZWhhdmlvclxyXG5cdFx0aWYgKHRoaXMuYmVoYXZpb3JTdGFjay5sZW5ndGgpXHJcblx0XHRcdHRoaXMuX3RpY2tfZG9CZWhhdmlvcihkZWx0YSk7XHJcblx0fSxcclxuXHRcclxuXHQvLyBfYWN0b3JJbnRlcmFjdEZhY2UgOiBmdW5jdGlvbih2ZWN0b3IpIHtcclxuXHQvLyBcdHRoaXMuZmFjaW5nID0gdmVjdG9yLmNsb25lKCkubmVnYXRlKCk7XHJcblx0Ly8gfSxcclxuXHRcclxuXHRfYWN0b3JCdW1wIDogZnVuY3Rpb24oc3JjeCwgc3JjeSwgeCwgeSwgcmVhc29uKSB7XHJcblx0XHQvLyBjb25zb2xlLndhcm4odGhpcy5pZCwgXCI6IENhbm5vdCB3YWxrIHRvIGxvY2F0aW9uXCIsIFwiKFwiK3grXCIsXCIreStcIilcIik7XHJcblx0fSxcclxuXHRcclxufSk7XHJcbm1vZHVsZS5leHBvcnRzID0gQWN0b3I7XHJcblxyXG5cclxuXHJcbmZ1bmN0aW9uIGdldERpckZyb21Mb2MoeDEsIHkxLCB4MiwgeTIpIHtcclxuXHRyZXR1cm4gbmV3IFRIUkVFLlZlY3RvcjMoeDIteDEsIDAsIHkyLXkxKTtcclxuXHQvLyB2YXIgZHggPSB4MiAtIHgxO1xyXG5cdC8vIHZhciBkeSA9IHkyIC0geTE7XHJcblx0Ly8gaWYgKE1hdGguYWJzKGR4KSA+IE1hdGguYWJzKGR5KSkge1xyXG5cdC8vIFx0aWYgKGR4ID4gMCkgeyByZXR1cm4gXCJyXCI7IH1cclxuXHQvLyBcdGVsc2UgaWYgKGR4IDwgMCkgeyByZXR1cm4gXCJsXCI7IH1cclxuXHQvLyB9IGVsc2Uge1xyXG5cdC8vIFx0aWYgKGR5ID4gMCkgeyByZXR1cm4gXCJkXCI7IH1cclxuXHQvLyBcdGVsc2UgaWYgKGR5IDwgMCkgeyByZXR1cm4gXCJ1XCI7IH1cclxuXHQvLyB9XHJcblx0Ly8gcmV0dXJuIFwiZFwiO1xyXG59XHJcblxyXG4iLCIvLyBhbmltZXZlbnQuanNcclxuLy8gRGVmaW5lcyBhbiBBbmltRXZlbnQsIHdoaWNoIGlzIGEgYmFzaWMgZXZlbnQgdGhhdCBhbmltYXRlcyBtYXAgZWxlbWVudHNcclxuXHJcbnZhciBFdmVudCA9IHJlcXVpcmUoXCJ0cHAtZXZlbnRcIik7XHJcbnZhciBpbmhlcml0cyA9IHJlcXVpcmUoXCJpbmhlcml0c1wiKTtcclxudmFyIGV4dGVuZCA9IHJlcXVpcmUoXCJleHRlbmRcIik7XHJcblxyXG4vKipcclxuICogQW4gQW5pbUV2ZW50IGlzIGFuIGNvbnZpZW5jZSBldmVudCBmb3IgYW5pbWF0aW9uIG9iamVjdHMgb24gdGhlIG1hcCxcclxuICogYmUgaXQgYSB0ZXh0dXJlIGFuaW1hdGlvbiBvciBtb3ZpbmcgYSBtb2RlbCBpbiBzb21lIGZhc2hpb24uXHJcbiAqL1xyXG5mdW5jdGlvbiBBbmltRXZlbnQoYmFzZSwgb3B0cykge1xyXG5cdEV2ZW50LmNhbGwodGhpcywgYmFzZSwgb3B0cyk7XHJcblx0XHJcblx0dGhpcy5vbihcInRpY2tcIiwgdGhpcy5vblRpY2spO1xyXG59XHJcbmluaGVyaXRzKEFuaW1FdmVudCwgRXZlbnQpO1xyXG5leHRlbmQoQW5pbUV2ZW50LnByb3RvdHlwZSwge1xyXG5cdGxvY2F0aW9uOiBbMCwgMF0sIC8vZGVmYXVsdCB0byBhbiBpbmFjY2Vzc2FibGUgbG9jYXRpb24sIHRvcCBjb3JuZXIgb2YgdGhlIG1hcFxyXG5cdFxyXG5cdGdldEF2YXRhcjogZnVuY3Rpb24obWFwKSB7XHJcblx0XHRyZXR1cm4gbnVsbDtcclxuXHR9LFxyXG5cdFxyXG5cdG9uVGljayA6IGZ1bmN0aW9uKGRlbHRhKSB7XHJcblx0fSxcclxufSk7XHJcbm1vZHVsZS5leHBvcnRzID0gQW5pbUV2ZW50O1xyXG5cclxuXHJcblxyXG5mdW5jdGlvbiBXYXRlckFuaW1FdmVudChvcHRzKSB7XHJcblx0QW5pbUV2ZW50LmNhbGwodGhpcywge1xyXG5cdFx0aWQ6IFwiQU5JTV9XYXRlclwiLFxyXG5cdFx0dGV4X3ggOiBbXSwgLy93YXRlciBmbG93IHhcclxuXHRcdHRleF95IDogW10sIC8vd2F0ZXIgZmxvdyB5XHJcblx0XHR0ZXhfYiA6IFtdLCAvL3dhdGVyIGZsb3cgeCBhbmQgeVxyXG5cdFx0XHJcblx0XHRuYW1lX3JlZ2V4OiBudWxsLCAvL29ubHkgY29sbGVjdCB0aGUgbmFtZWQgYXNzZXRzXHJcblx0XHRzcGVlZDogMC4yLFxyXG5cdFx0eWF1Z21lbnQ6IDEuMixcclxuXHRcdFxyXG5cdFx0Z2V0QXZhdGFyOiBmdW5jdGlvbihtYXApIHtcclxuXHRcdFx0dmFyIGNoID0gbWFwLm1hcG1vZGVsLmNoaWxkcmVuO1xyXG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGNoLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0aWYgKHRoaXMubmFtZV9yZWdleCkge1xyXG5cdFx0XHRcdFx0Ly8gSWYgaW4gbmFtZWQgcmVnZXggbW9kZSwgc2tpcCBvdmVyIHRoaW5ncyB0aGF0IGRvbid0IG1hdGNoIHRoZSBuYW1lXHJcblx0XHRcdFx0XHRpZiAoIXRoaXMubmFtZV9yZWdleC50ZXN0KGNoW2ldLm5hbWUpKSBjb250aW51ZTtcclxuXHRcdFx0XHR9IFxyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdGlmICgvXFwhV0FURVgkLy50ZXN0KGNoW2ldLm5hbWUpKSB7XHJcblx0XHRcdFx0XHRmb3IgKHZhciBqID0gMDsgaiA8IGNoW2ldLmNoaWxkcmVuLmxlbmd0aDsgaisrKSB7XHJcblx0XHRcdFx0XHRcdHZhciBtZXNoID0gY2hbaV0uY2hpbGRyZW5bal07XHJcblx0XHRcdFx0XHRcdGlmICghKG1lc2ggaW5zdGFuY2VvZiBUSFJFRS5NZXNoKSkgY29udGludWU7XHJcblx0XHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0XHR0aGlzLnRleF94LnB1c2gobWVzaC5tYXRlcmlhbC5tYXApO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRpZiAoL1xcIVdBVEVZJC8udGVzdChjaFtpXS5uYW1lKSkge1xyXG5cdFx0XHRcdFx0Zm9yICh2YXIgaiA9IDA7IGogPCBjaFtpXS5jaGlsZHJlbi5sZW5ndGg7IGorKykge1xyXG5cdFx0XHRcdFx0XHR2YXIgbWVzaCA9IGNoW2ldLmNoaWxkcmVuW2pdO1xyXG5cdFx0XHRcdFx0XHRpZiAoIShtZXNoIGluc3RhbmNlb2YgVEhSRUUuTWVzaCkpIGNvbnRpbnVlO1xyXG5cdFx0XHRcdFx0XHRcclxuXHRcdFx0XHRcdFx0dGhpcy50ZXhfeS5wdXNoKG1lc2gubWF0ZXJpYWwubWFwKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0aWYgKC9cXCFXQVRFQiQvLnRlc3QoY2hbaV0ubmFtZSkpIHtcclxuXHRcdFx0XHRcdGZvciAodmFyIGogPSAwOyBqIDwgY2hbaV0uY2hpbGRyZW4ubGVuZ3RoOyBqKyspIHtcclxuXHRcdFx0XHRcdFx0dmFyIG1lc2ggPSBjaFtpXS5jaGlsZHJlbltqXTtcclxuXHRcdFx0XHRcdFx0aWYgKCEobWVzaCBpbnN0YW5jZW9mIFRIUkVFLk1lc2gpKSBjb250aW51ZTtcclxuXHRcdFx0XHRcdFx0XHJcblx0XHRcdFx0XHRcdHRoaXMudGV4X2IucHVzaChtZXNoLm1hdGVyaWFsLm1hcCk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9LFxyXG5cdFx0XHJcblx0XHRvblRpY2s6IGZ1bmN0aW9uKGRlbHRhKSB7XHJcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy50ZXhfYi5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRcdHZhciBvZmYgPSB0aGlzLnRleF9iW2ldLm9mZnNldC54O1xyXG5cdFx0XHRcdG9mZiArPSBkZWx0YSAqIHRoaXMuc3BlZWQ7XHJcblx0XHRcdFx0dGhpcy50ZXhfYltpXS5vZmZzZXQuc2V0KG9mZiwgb2ZmICogdGhpcy55YXVnbWVudCk7XHJcblx0XHRcdFx0dGhpcy50ZXhfYltpXS5uZWVkc1VwZGF0ZSA9IHRydWU7XHJcblx0XHRcdH1cclxuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLnRleF94Lmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdFx0dGhpcy50ZXhfeFtpXS5vZmZzZXQueCArPSBkZWx0YSAqIHRoaXMuc3BlZWQ7XHJcblx0XHRcdFx0dGhpcy50ZXhfeFtpXS5uZWVkc1VwZGF0ZSA9IHRydWU7XHJcblx0XHRcdH1cclxuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLnRleF95Lmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdFx0dGhpcy50ZXhfeVtpXS5vZmZzZXQueSArPSBkZWx0YSAqIHRoaXMuc3BlZWQ7XHJcblx0XHRcdFx0dGhpcy50ZXhfeVtpXS5uZWVkc1VwZGF0ZSA9IHRydWU7XHJcblx0XHRcdH1cclxuXHRcdH0sXHJcblx0XHRcclxuXHR9LCBvcHRzKTtcclxufVxyXG5pbmhlcml0cyhXYXRlckFuaW1FdmVudCwgQW5pbUV2ZW50KTtcclxubW9kdWxlLmV4cG9ydHMuV2F0ZXIgPSBXYXRlckFuaW1FdmVudDtcclxuXHJcbmZ1bmN0aW9uIFdhdGVyUmlwcGxlQW5pbUV2ZW50KG9wdHMpIHtcclxuXHRBbmltRXZlbnQuY2FsbCh0aGlzLCB7XHJcblx0XHRpZDogXCJBTklNX1dhdGVyUmlwcGxlXCIsXHJcblx0XHR0ZXhfciA6IFtdLCAvL3dhdGVyIHJpcHBsZVxyXG5cdFx0XHJcblx0XHRuYW1lX3JlZ2V4OiBudWxsLCAvL29ubHkgY29sbGVjdCB0aGUgbmFtZWQgYXNzZXRzXHJcblx0XHRzcGVlZDogMSxcclxuXHRcdHlhdWdtZW50OiAxLjIsXHJcblx0XHRhbXBsaXR1ZGU6IDAuMDMsXHJcblx0XHRcclxuXHRcdF9kZWx0YTogMCxcclxuXHRcdFxyXG5cdFx0Z2V0QXZhdGFyOiBmdW5jdGlvbihtYXApIHtcclxuXHRcdFx0dmFyIGNoID0gbWFwLm1hcG1vZGVsLmNoaWxkcmVuO1xyXG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGNoLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0aWYgKHRoaXMubmFtZV9yZWdleCkge1xyXG5cdFx0XHRcdFx0Ly8gSWYgaW4gbmFtZWQgcmVnZXggbW9kZSwgc2tpcCBvdmVyIHRoaW5ncyB0aGF0IGRvbid0IG1hdGNoIHRoZSBuYW1lXHJcblx0XHRcdFx0XHRpZiAoIXRoaXMubmFtZV9yZWdleC50ZXN0KGNoW2ldLm5hbWUpKSBjb250aW51ZTtcclxuXHRcdFx0XHR9IFxyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdGlmICgvXFwhV0FURVIkLy50ZXN0KGNoW2ldLm5hbWUpKSB7XHJcblx0XHRcdFx0XHRmb3IgKHZhciBqID0gMDsgaiA8IGNoW2ldLmNoaWxkcmVuLmxlbmd0aDsgaisrKSB7XHJcblx0XHRcdFx0XHRcdHZhciBtZXNoID0gY2hbaV0uY2hpbGRyZW5bal07XHJcblx0XHRcdFx0XHRcdGlmICghKG1lc2ggaW5zdGFuY2VvZiBUSFJFRS5NZXNoKSkgY29udGludWU7XHJcblx0XHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0XHR0aGlzLnRleF9yLnB1c2gobWVzaC5tYXRlcmlhbC5tYXApO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fSxcclxuXHRcdFxyXG5cdFx0b25UaWNrOiBmdW5jdGlvbihkZWx0YSkge1xyXG5cdFx0XHR0aGlzLl9kZWx0YSArPSBkZWx0YSAqIHRoaXMuc3BlZWQ7XHJcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy50ZXhfci5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRcdHZhciBvZmYgPSBNYXRoLnNpbih0aGlzLl9kZWx0YSkgKiB0aGlzLmFtcGxpdHVkZTtcclxuXHRcdFx0XHR0aGlzLnRleF9yW2ldLm9mZnNldC5zZXQob2ZmLCBvZmYgKiB0aGlzLnlhdWdtZW50KTtcclxuXHRcdFx0XHR0aGlzLnRleF9yW2ldLm5lZWRzVXBkYXRlID0gdHJ1ZTtcclxuXHRcdFx0fVxyXG5cdFx0fSxcclxuXHRcdFxyXG5cdH0sIG9wdHMpO1xyXG59XHJcbmluaGVyaXRzKFdhdGVyUmlwcGxlQW5pbUV2ZW50LCBBbmltRXZlbnQpO1xyXG5tb2R1bGUuZXhwb3J0cy5TaW5lUmlwcGxlID0gV2F0ZXJSaXBwbGVBbmltRXZlbnQ7XHJcbiIsIi8vIGJlaGF2aW9yLmpzXHJcbi8vIERlZmluZXMgdGhlIGJhc2VkIGNsYXNzZXMgZm9yIEFjdG9yJ3MgYmVoYXZpb3JzXHJcblxyXG52YXIgZXh0ZW5kID0gcmVxdWlyZShcImV4dGVuZFwiKTtcclxudmFyIGluaGVyaXRzID0gcmVxdWlyZShcImluaGVyaXRzXCIpO1xyXG5cclxuLyoqIFxyXG4gKiBBIEJlaGF2aW9yIGlzIGEgc2NyaXB0IHRoYXQgYW4gYWN0b3IgaXMgZm9sbG93aW5nLCB3aGV0aGVyIHRoYXRcclxuICogYmUgd2Fsa2luZyBhbG9uZyBhIHBhdGggb3IgYXJvdW5kIGEgY2lyY2xlLCBvciBmb2xsb3dpbmcgYSBtb3JlXHJcbiAqIGNvbXBsZXggc2NyaXB0IG9mIGV2ZW50cy4gQmVoYXZpb3JzIGNhbiBiZSBwdXNoZWQgYW5kIHBvcHBlZCBvZmZcclxuICogYW4gYWN0b3IncyBzdGFjaywgYW5kIHRoZSB0b3Btb3N0IG9uZSB3aWxsIGJlIHBhc3NlZCBjZXJ0YWluIGV2ZW50c1xyXG4gKiB0aGF0IHRoZSBhY3RvciByZWNpZXZlcy5cclxuICovXHJcblxyXG5mdW5jdGlvbiBCZWhhdmlvcihvcHRzKSB7XHJcblx0ZXh0ZW5kKHRoaXMsIG9wdHMpO1xyXG59XHJcbmV4dGVuZChCZWhhdmlvci5wcm90b3R5cGUsIHtcclxuXHRmYWNlT25JbnRlcmFjdDogdHJ1ZSxcclxuXHR0YWxrQmVoYXY6IG51bGwsXHJcblx0b3duZXI6IG51bGwsXHJcblx0XHJcblx0dGljayA6IG51bGwsXHJcblx0YnVtcCA6IG51bGwsXHJcblx0aW50ZXJhY3QgOiBmdW5jdGlvbihtZSwgZnJvbV9kaXIpe1xyXG5cdFx0aWYgKHRoaXMudGFsa0JlaGF2KSB7XHJcblx0XHRcdG1lLmJlaGF2aW9yU3RhY2sucHVzaCh0aGlzLnRhbGtCZWhhdik7XHJcblx0XHR9XHJcblx0fSxcclxuXHRcclxuXHRfdGljayA6IGZ1bmN0aW9uKG1lLCBkZWx0YSkge1xyXG5cdFx0aWYgKHRoaXMudGljaylcclxuXHRcdFx0dGhpcy50aWNrKG1lLCBkZWx0YSk7XHJcblx0fSxcclxuXHRfaW50ZXJhY3QgOiBmdW5jdGlvbihtZSwgZnJvbV9kaXIpIHtcclxuXHRcdC8vVE9ETyBkbyBzdGFuZGFyZCBzdHVmZiBoZXJlXHJcblx0XHRpZiAodGhpcy5mYWNlT25JbnRlcmFjdClcclxuXHRcdFx0bWUuZmFjZUludGVyYWN0b3IoZnJvbV9kaXIpO1xyXG5cdFx0XHJcblx0XHRpZiAodGhpcy5pbnRlcmFjdClcclxuXHRcdFx0dGhpcy5pbnRlcmFjdChtZSwgZnJvbV9kaXIpO1xyXG5cdH0sXHJcblx0X2J1bXAgOiBmdW5jdGlvbihtZSwgZnJvbV9kaXIpIHtcclxuXHRcdGlmICh0aGlzLmJ1bXApXHJcblx0XHRcdHRoaXMuYnVtcChtZSwgZnJvbV9kaXIpO1xyXG5cdH0sXHJcbn0pO1xyXG5tb2R1bGUuZXhwb3J0cyA9IEJlaGF2aW9yO1xyXG5cclxuXHJcbi8vLy8vLy8vLy8vIENvbW1vbiBCZWhhdmlvcnMgLy8vLy8vLy8vLy9cclxuXHJcbmZ1bmN0aW9uIFRhbGtpbmcob3B0cykge1xyXG5cdEJlaGF2aW9yLmNhbGwodGhpcywgb3B0cyk7XHJcbn1cclxuaW5oZXJpdHMoVGFsa2luZywgQmVoYXZpb3IpO1xyXG5leHRlbmQoVGFsa2luZy5wcm90b3R5cGUsIHtcclxuXHRkaWFsb2c6IG51bGwsXHJcblx0ZGlhbG9nX3R5cGU6IFwiZGlhbG9nXCIsXHJcblx0YW5pbWF0aW9uOiBudWxsLFxyXG5cdG93bmVyOiBudWxsLFxyXG5cdF9fdWlfZmlyZWQ6IGZhbHNlLFxyXG5cdFxyXG5cdC8vIHJlc2V0OiBmdW5jdGlvbigpIHsgdGhpcy5fX3VpX2ZpcmVkID0gZmFsc2U7IH0sXHJcblx0XHJcblx0dGljazogZnVuY3Rpb24obWUsIGRlbHRhKSB7XHJcblx0XHR2YXIgc2VsZiA9IHRoaXM7XHJcblx0XHRpZiAoIXRoaXMuX191aV9maXJlZCkge1xyXG5cdFx0XHRVSS5zaG93VGV4dEJveCh0aGlzLmRpYWxvZ190eXBlLCB0aGlzLmRpYWxvZywge1xyXG5cdFx0XHRcdG93bmVyOiB0aGlzLm93bmVyLFxyXG5cdFx0XHRcdGNvbXBsZXRlOiBmdW5jdGlvbigpIHtcclxuXHRcdFx0XHRcdG1lLmJlaGF2aW9yU3RhY2sucG9wKCk7XHJcblx0XHRcdFx0XHRpZiAodGhpcy5hbmltYXRpb24pIHtcclxuXHRcdFx0XHRcdFx0bWUucGxheUFuaW1hdGlvbihcInN0YW5kXCIsIHsgc3RvcE5leHRUcmFuc2l0aW9uOiB0cnVlLCB9KTtcclxuXHRcdFx0XHRcdFx0bWUucmVzdW1lQW5pbWF0aW9uKCk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRzZWxmLl9fdWlfZmlyZWQgPSBmYWxzZTtcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0aWYgKHRoaXMuYW5pbWF0aW9uKSB7XHJcblx0XHRcdFx0bWUucGxheUFuaW1hdGlvbih0aGlzLmFuaW1hdGlvbik7XHJcblx0XHRcdH1cclxuXHRcdFx0bWUucGxheUFuaW1hdGlvbigpXHJcblx0XHRcdHRoaXMuX191aV9maXJlZCA9IHRydWU7XHJcblx0XHR9XHJcblx0fSxcclxufSk7XHJcbm1vZHVsZS5leHBvcnRzLlRhbGtpbmcgPSBUYWxraW5nO1xyXG5cclxuXHJcblxyXG5mdW5jdGlvbiBGYWNlRGlyZWN0aW9uKHgsIHksIG9wdHMpIHtcclxuXHRCZWhhdmlvci5jYWxsKHRoaXMsIG9wdHMpO1xyXG5cdHRoaXMuZGlyX3ggPSB4O1xyXG5cdHRoaXMuZGlyX3kgPSB5O1xyXG59XHJcbmluaGVyaXRzKEZhY2VEaXJlY3Rpb24sIEJlaGF2aW9yKTtcclxuZXh0ZW5kKEZhY2VEaXJlY3Rpb24ucHJvdG90eXBlLCB7XHJcblx0ZGlyX3g6IDAsXHJcblx0ZGlyX3k6IDEsXHJcblx0XHJcblx0dGljazogZnVuY3Rpb24obWUsIGRlbHRhKSB7XHJcblx0XHRtZS5mYWNlRGlyKHRoaXMuZGlyX3gsIHRoaXMuZGlyX3kpO1xyXG5cdH0sXHJcbn0pO1xyXG5tb2R1bGUuZXhwb3J0cy5GYWNlRGlyZWN0aW9uID0gRmFjZURpcmVjdGlvbjtcclxuXHJcblxyXG5cclxuZnVuY3Rpb24gTG9va0Fyb3VuZChvcHRzKSB7XHJcblx0QmVoYXZpb3IuY2FsbCh0aGlzLCBvcHRzKTtcclxufVxyXG5pbmhlcml0cyhMb29rQXJvdW5kLCBCZWhhdmlvcik7XHJcbmV4dGVuZChMb29rQXJvdW5kLnByb3RvdHlwZSwge1xyXG5cdHdhaXRUaW1lIDogMCxcclxuXHR0aWNrOiBmdW5jdGlvbihtZSwgZGVsdGEpIHtcclxuXHRcdGlmICh0aGlzLndhaXRUaW1lID4gMCkge1xyXG5cdFx0XHR0aGlzLndhaXRUaW1lIC09IGRlbHRhO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdHN3aXRjaCggTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpKjQpICkge1xyXG5cdFx0XHRjYXNlIDA6IG1lLmZhY2luZy5zZXQoIDEsMCwgMCk7IGJyZWFrO1xyXG5cdFx0XHRjYXNlIDE6IG1lLmZhY2luZy5zZXQoLTEsMCwgMCk7IGJyZWFrO1xyXG5cdFx0XHRjYXNlIDI6IG1lLmZhY2luZy5zZXQoIDAsMCwgMSk7IGJyZWFrO1xyXG5cdFx0XHRjYXNlIDM6IG1lLmZhY2luZy5zZXQoIDAsMCwtMSk7IGJyZWFrO1xyXG5cdFx0fVxyXG5cdFx0dGhpcy53YWl0VGltZSArPSAoTWF0aC5yYW5kb20oKSAqIDMpICsgMztcclxuXHR9LFxyXG59KTtcclxubW9kdWxlLmV4cG9ydHMuTG9va0Fyb3VuZCA9IExvb2tBcm91bmQ7XHJcblxyXG5cclxuXHJcbmZ1bmN0aW9uIE1lYW5kZXIob3B0cykge1xyXG5cdEJlaGF2aW9yLmNhbGwodGhpcywgb3B0cyk7XHJcbn1cclxuaW5oZXJpdHMoTWVhbmRlciwgQmVoYXZpb3IpO1xyXG5leHRlbmQoTWVhbmRlci5wcm90b3R5cGUsIHtcclxuXHR3YWl0VGltZSA6IDAsXHJcblx0dGljazogZnVuY3Rpb24obWUsIGRlbHRhKSB7XHJcblx0XHRpZiAodGhpcy53YWl0VGltZSA+IDApIHtcclxuXHRcdFx0dGhpcy53YWl0VGltZSAtPSBkZWx0YTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHRzd2l0Y2goIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSo4KSApIHtcclxuXHRcdFx0Y2FzZSAwOiBtZS5mYWNpbmcuc2V0KCAxLDAsIDApOyBicmVhaztcclxuXHRcdFx0Y2FzZSAxOiBtZS5mYWNpbmcuc2V0KC0xLDAsIDApOyBicmVhaztcclxuXHRcdFx0Y2FzZSAyOiBtZS5mYWNpbmcuc2V0KCAwLDAsIDEpOyBicmVhaztcclxuXHRcdFx0Y2FzZSAzOiBtZS5mYWNpbmcuc2V0KCAwLDAsLTEpOyBicmVhaztcclxuXHRcdFx0Y2FzZSA0OiBtZS5tb3ZlRGlyKFwiZFwiKTsgYnJlYWs7XHJcblx0XHRcdGNhc2UgNTogbWUubW92ZURpcihcInVcIik7IGJyZWFrO1xyXG5cdFx0XHRjYXNlIDY6IG1lLm1vdmVEaXIoXCJsXCIpOyBicmVhaztcclxuXHRcdFx0Y2FzZSA3OiBtZS5tb3ZlRGlyKFwiclwiKTsgYnJlYWs7XHJcblx0XHR9XHJcblx0XHR0aGlzLndhaXRUaW1lICs9IChNYXRoLnJhbmRvbSgpICogMykgKyAzO1xyXG5cdH0sXHJcbn0pO1xyXG5tb2R1bGUuZXhwb3J0cy5NZWFuZGVyID0gTWVhbmRlcjtcclxuXHJcbiIsIi8vIGNhbWVyYS10cmlnZ2VyLmpzXHJcbi8vIEEgdHJpZ2dlciB0aGF0IGNoYW5nZXMgdGhlIGNhbWVyYSB0byBhbm90aGVyIGFuZ2xlIG9yIGRlZmluaXRpb25cclxuXHJcbnZhciBFdmVudCA9IHJlcXVpcmUoXCJ0cHAtZXZlbnRcIik7XHJcbnZhciBUcmlnZ2VyID0gcmVxdWlyZShcInRwcC10cmlnZ2VyXCIpO1xyXG52YXIgaW5oZXJpdHMgPSByZXF1aXJlKFwiaW5oZXJpdHNcIik7XHJcbnZhciBleHRlbmQgPSByZXF1aXJlKFwiZXh0ZW5kXCIpO1xyXG5cclxuLyoqXHJcbiAqIEEgdHJpZ2dlciBpcyBhIHRpbGUgdGhhdCwgd2hlbiBzdGVwcGVkIHVwb24sIHdpbGwgdHJpZ2dlciBzb21lIGV2ZW50LlxyXG4gKiBUaGUgbW9zdCBjb21tb24gZXZlbnQgdGlnZ2VyZWQgaXMgYSB3YXJwaW5nIHRvIGFub3RoZXIgbWFwLCBmb3Igd2hpY2hcclxuICogdGhlIHN1YmNsYXNzIFdhcnAgaXMgZGVzaWduZWQgZm9yLlxyXG4gKlxyXG4gKiBUcmlnZ2VycyBtYXkgdGFrZSB1cCBtb3JlIHRoYW4gb25lIHNwYWNlLlxyXG4gKi9cclxuZnVuY3Rpb24gQ2FtZXJhVHJpZ2dlcihiYXNlLCBvcHRzKSB7XHJcblx0VHJpZ2dlci5jYWxsKHRoaXMsIGJhc2UsIG9wdHMpO1xyXG59XHJcbmluaGVyaXRzKENhbWVyYVRyaWdnZXIsIFRyaWdnZXIpO1xyXG5leHRlbmQoQ2FtZXJhVHJpZ2dlci5wcm90b3R5cGUsIHtcclxuXHRjYW1lcmFJZDogdW5kZWZpbmVkLCAvL0NhbWVyYSB0byBiZSB0cmlnZ2VyZWQgd2hlbiBzdGVwcGluZyBvbiB0aGlzIGV2ZW50XHJcblx0bkNhbWVyYUlkOiB1bmRlZmluZWQsIC8vQ2FtZXJhcyB0byBiZSB0cmlnZ2VyZWQgd2hlbiBzdGVwcGluZyBvZmYgdGhpcyBldmVudCBpbiBhIGRpcmVjdGlvblxyXG5cdHdDYW1lcmFJZDogdW5kZWZpbmVkLFxyXG5cdHNDYW1lcmFJZDogdW5kZWZpbmVkLFxyXG5cdGVDYW1lcmFJZDogdW5kZWZpbmVkLFxyXG5cdFxyXG5cdG9uRW50ZXJlZCA6IGZ1bmN0aW9uKGRpcikge1xyXG5cdFx0aWYgKHRoaXMuY2FtZXJhSWQgIT09IHVuZGVmaW5lZCkge1xyXG5cdFx0XHRjdXJyZW50TWFwLmNoYW5nZUNhbWVyYSh0aGlzLmNhbWVyYUlkKTtcclxuXHRcdH1cclxuXHR9LFxyXG5cdG9uTGVhdmluZyA6IGZ1bmN0aW9uKGRpcikge1xyXG5cdFx0dmFyIGQgPSB0aGlzLmRpdmlkZUZhY2luZyhkaXIpO1xyXG5cdFx0aWYgKHRoaXNbZCtcIkNhbWVyYUlkXCJdICE9PSB1bmRlZmluZWQpIHtcclxuXHRcdFx0Y3VycmVudE1hcC5jaGFuZ2VDYW1lcmEodGhpc1tkK1wiQ2FtZXJhSWRcIl0pO1xyXG5cdFx0fVxyXG5cdH0sXHJcbn0pO1xyXG5tb2R1bGUuZXhwb3J0cyA9IENhbWVyYVRyaWdnZXI7XHJcbiIsIi8vIGNvbnRyb2xsZXIuanNcclxuLy8gVGhpcyBjbGFzcyBoYW5kbGVzIGlucHV0IGFuZCBjb252ZXJ0cyBpdCB0byBjb250cm9sIHNpZ25hbHNcclxuXHJcbnZhciBpbmhlcml0cyA9IHJlcXVpcmUoXCJpbmhlcml0c1wiKTtcclxudmFyIGV4dGVuZCA9IHJlcXVpcmUoXCJleHRlbmRcIik7XHJcbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKFwiZXZlbnRzXCIpLkV2ZW50RW1pdHRlcjtcclxuXHJcbi8vIFRPRE8gaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvR3VpZGUvQVBJL0dhbWVwYWRcclxuXHJcbmZ1bmN0aW9uIENvbnRyb2xNYW5hZ2VyKCkge1xyXG5cdHZhciBzZWxmID0gdGhpcztcclxuXHR0aGlzLnNldEtleUNvbmZpZygpO1xyXG5cdFxyXG5cdCQoZnVuY3Rpb24oKXtcclxuXHRcdCQoZG9jdW1lbnQpLm9uKFwia2V5ZG93blwiLCBmdW5jdGlvbihlKXsgc2VsZi5vbktleURvd24oZSk7IH0pO1xyXG5cdFx0JChkb2N1bWVudCkub24oXCJrZXl1cFwiLCBmdW5jdGlvbihlKXsgc2VsZi5vbktleVVwKGUpOyB9KTtcclxuXHRcdFxyXG5cdFx0JChcIiNjaGF0Ym94XCIpLm9uKFwiZm9jdXNcIiwgZnVuY3Rpb24oZSl7IFxyXG5cdFx0XHRjb25zb2xlLmxvZyhcIkNIQVQgRk9DVVNcIik7XHJcblx0XHRcdHNlbGYuaW5wdXRDb250ZXh0LnB1c2goXCJjaGF0XCIpOyBcclxuXHRcdH0pO1xyXG5cdFx0JChcIiNjaGF0Ym94XCIpLm9uKFwiYmx1clwiLCBmdW5jdGlvbihlKXsgXHJcblx0XHRcdGNvbnNvbGUubG9nKFwiQ0hBVCBCTFVSXCIpO1xyXG5cdFx0XHRpZiAoc2VsZi5pbnB1dENvbnRleHQudG9wID09IFwiY2hhdFwiKVxyXG5cdFx0XHRcdHNlbGYuaW5wdXRDb250ZXh0LnBvcCgpOyBcclxuXHRcdH0pO1xyXG5cdFx0XHJcblx0XHRzZWxmLnRvdWNoTWFuYWdlcigpO1xyXG5cdH0pXHJcbn1cclxuaW5oZXJpdHMoQ29udHJvbE1hbmFnZXIsIEV2ZW50RW1pdHRlcik7XHJcbmV4dGVuZChDb250cm9sTWFuYWdlci5wcm90b3R5cGUsIHtcclxuXHRpbnB1dENvbnRleHQgOiBbXCJnYW1lXCJdLFxyXG5cdFxyXG5cdGtleXNfY29uZmlnIDoge1xyXG5cdFx0VXA6IFszOCwgXCJVcFwiLCA4NywgXCJ3XCJdLCBcclxuXHRcdERvd246IFs0MCwgXCJEb3duXCIsIDgzLCBcInNcIl0sIFxyXG5cdFx0TGVmdDogWzM3LCBcIkxlZnRcIiwgNjUsIFwiYVwiXSwgXHJcblx0XHRSaWdodDogWzM5LCBcIlJpZ2h0XCIsIDY4LCBcImRcIl0sXHJcblx0XHRJbnRlcmFjdDogWzEzLCBcIkVudGVyXCIsIDMyLCBcIiBcIl0sXHJcblx0XHRDYW5jZWw6IFsyNywgXCJFc2NhcGVcIiwgMTcsIFwiQ3RybFwiXSxcclxuXHRcdFJ1bjogWzE2LCBcIlNoaWZ0XCJdLFxyXG5cdFx0TWVudTogWzgsIFwiQmFja3NwYWNlXCIsIDQ2LCBcIkRlbGV0ZVwiXSxcclxuXHRcdEZvY3VzQ2hhdDogWzE5MSwgXCIvXCJdLFxyXG5cdH0sXHJcblx0XHJcblx0a2V5c19hY3RpdmUgOiB7fSxcclxuXHRcclxuXHRrZXlzX2Rvd24gOiB7XHJcblx0XHRVcDogZmFsc2UsIERvd246IGZhbHNlLFxyXG5cdFx0TGVmdDogZmFsc2UsIFJpZ2h0OiBmYWxzZSxcclxuXHRcdEludGVyYWN0OiBmYWxzZSwgRm9jdXNDaGF0OiBmYWxzZSxcclxuXHRcdFJ1bjogZmFsc2UsIENhbmNlbDogZmFsc2UsXHJcblx0fSxcclxuXHRcclxuXHRwdXNoSW5wdXRDb250ZXh0OiBmdW5jdGlvbihjdHgpIHtcclxuXHRcdHRoaXMuaW5wdXRDb250ZXh0LnB1c2goY3R4KTtcclxuXHRcdHRoaXMuZW1pdChcImlucHV0Q29udGV4dENoYW5nZWRcIik7XHJcblx0fSxcclxuXHRwb3BJbnB1dENvbnRleHQ6IGZ1bmN0aW9uKGN0eCkge1xyXG5cdFx0aWYgKCFjdHggfHwgdGhpcy5pbnB1dENvbnRleHQudG9wID09IGN0eCkge1xyXG5cdFx0XHR2YXIgYyA9IHRoaXMuaW5wdXRDb250ZXh0LnBvcCgpO1xyXG5cdFx0XHR0aGlzLmVtaXQoXCJpbnB1dENvbnRleHRDaGFuZ2VkXCIpO1xyXG5cdFx0XHRyZXR1cm4gYztcclxuXHRcdH1cclxuXHR9LFxyXG5cdHJlbW92ZUlucHV0Q29udGV4dDogZnVuY3Rpb24oY3R4KSB7XHJcblx0XHRpZiAoIWN0eCkgcmV0dXJuO1xyXG5cdFx0dmFyIGluZGV4ID0gdGhpcy5pbnB1dENvbnRleHQubGFzdEluZGV4T2YoY3R4KTtcclxuXHRcdGlmIChpbmRleCA+IC0xKSB7XHJcblx0XHRcdHRoaXMuaW5wdXRDb250ZXh0LnNwbGljZShpbmRleCwgMSk7XHJcblx0XHRcdHRoaXMuZW1pdChcImlucHV0Q29udGV4dENoYW5nZWRcIik7XHJcblx0XHRcdHJldHVybiBjdHg7XHJcblx0XHR9XHJcblx0fSxcclxuXHRcclxuXHRpc0Rvd24gOiBmdW5jdGlvbihrZXksIGN0eCkge1xyXG5cdFx0aWYgKCQuaXNBcnJheShjdHgpKSB7XHJcblx0XHRcdHZhciBnbyA9IGZhbHNlO1xyXG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGN0eC5sZW5ndGg7IGkrKykgZ28gfD0gY3R4W2ldO1xyXG5cdFx0XHRpZiAoIWdvKSByZXR1cm47XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRpZiAodGhpcy5pbnB1dENvbnRleHQudG9wICE9IGN0eCkgcmV0dXJuO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHRyZXR1cm4gdGhpcy5rZXlzX2Rvd25ba2V5XTtcclxuXHR9LFxyXG5cdGlzRG93bk9uY2UgOiBmdW5jdGlvbihrZXksIGN0eCkge1xyXG5cdFx0aWYgKCQuaXNBcnJheShjdHgpKSB7XHJcblx0XHRcdHZhciBnbyA9IGZhbHNlO1xyXG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGN0eC5sZW5ndGg7IGkrKykgZ28gfD0gY3R4W2ldO1xyXG5cdFx0XHRpZiAoIWdvKSByZXR1cm47XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRpZiAodGhpcy5pbnB1dENvbnRleHQudG9wICE9IGN0eCkgcmV0dXJuO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHRpZiggdGhpcy5rZXlzX2Rvd25ba2V5XSA9PSAxICkge1xyXG5cdFx0XHR0aGlzLmtleXNfZG93bltrZXldKys7IC8vc28gbm8gb3RoZXIgY2hlY2sgbWF5IHBhc3MgdGhpcyB0ZXN0XHJcblx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0fVxyXG5cdH0sXHJcblx0XHJcblx0c2V0S2V5Q29uZmlnIDogZnVuY3Rpb24oKSB7XHJcblx0XHR0aGlzLmtleXNfYWN0aXZlID0gZXh0ZW5kKHRydWUsIHt9LCB0aGlzLmtleXNfY29uZmlnKTtcclxuXHR9LFxyXG5cdFxyXG5cdG9uS2V5RG93biA6IGZ1bmN0aW9uKGUpIHtcclxuXHRcdGZvciAodmFyIGFjdGlvbiBpbiB0aGlzLmtleXNfYWN0aXZlKSB7XHJcblx0XHRcdHZhciBrZXlzID0gdGhpcy5rZXlzX2FjdGl2ZVthY3Rpb25dO1xyXG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGtleXMubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0XHRpZiAoZS53aGljaCA9PSBrZXlzW2ldKSB7XHJcblx0XHRcdFx0XHQvLyBLZXkgaXMgbm93IGRvd24hXHJcblx0XHRcdFx0XHR0aGlzLmVtaXRLZXkoYWN0aW9uLCB0cnVlKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9LFxyXG5cdG9uS2V5VXAgOiBmdW5jdGlvbiAoZSkge1xyXG5cdFx0Zm9yICh2YXIgYWN0aW9uIGluIHRoaXMua2V5c19hY3RpdmUpIHtcclxuXHRcdFx0dmFyIGtleXMgPSB0aGlzLmtleXNfYWN0aXZlW2FjdGlvbl07XHJcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRcdGlmIChlLndoaWNoID09IGtleXNbaV0pIHtcclxuXHRcdFx0XHRcdC8vIEtleSBpcyBub3cgdXAhXHJcblx0XHRcdFx0XHR0aGlzLmVtaXRLZXkoYWN0aW9uLCBmYWxzZSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fSxcclxuXHRcclxuXHRzdWJtaXRDaGF0S2V5cHJlc3MgOiBmdW5jdGlvbihrZXkpIHtcclxuXHRcdHN3aXRjaChrZXkpIHtcclxuXHRcdFx0XHJcblx0XHR9XHJcblx0fSxcclxuXHRcclxuXHRlbWl0S2V5IDogZnVuY3Rpb24oYWN0aW9uLCBkb3duKSB7XHJcblx0XHRpZiAodGhpcy5rZXlzX2Rvd25bYWN0aW9uXSAhPSBkb3duKSB7XHJcblx0XHRcdGlmIChkb3duKSB7XHJcblx0XHRcdFx0dGhpcy5rZXlzX2Rvd25bYWN0aW9uXSsrOyBcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHR0aGlzLmtleXNfZG93blthY3Rpb25dID0gMDtcclxuXHRcdFx0fVxyXG5cdFx0XHR0aGlzLmVtaXQoXCJjb250cm9sLWFjdGlvblwiLCBhY3Rpb24sIGRvd24pO1xyXG5cdFx0fVxyXG5cdH0sXHJcblx0XHJcblx0X3RpY2sgOiBmdW5jdGlvbigpIHtcclxuXHRcdGZvciAodmFyIG5hbWUgaW4gdGhpcy5rZXlzX2Rvd24pIHtcclxuXHRcdFx0aWYgKHRoaXMua2V5c19kb3duW25hbWVdID4gMClcclxuXHRcdFx0XHR0aGlzLmtleXNfZG93bltuYW1lXSsrO1xyXG5cdFx0fVxyXG5cdH1cclxuXHRcclxufSk7XHJcblxyXG5Db250cm9sTWFuYWdlci5wcm90b3R5cGUudG91Y2hNYW5hZ2VyID0gZnVuY3Rpb24oKSB7XHJcblx0dmFyIHNlbGYgPSB0aGlzO1xyXG5cdFxyXG5cdCQoZG9jdW1lbnQpLm9uZShcInRvdWNoc3RhcnRcIiwgZnVuY3Rpb24oKXtcclxuXHRcdCQoXCJodG1sXCIpLmFkZENsYXNzKFwidG91Y2htb2RlXCIpO1xyXG5cdFx0aWYgKCEkKFwiI3RvdWNoY29udHJvbHNcIikubGVuZ3RoKSB7XHJcblx0XHRcdGZ1bmN0aW9uIF9fbWFwKGJ0biwga2V5KSB7XHJcblx0XHRcdFx0YnRuLm9uKFwidG91Y2hzdGFydFwiLCBmdW5jdGlvbihlKXtcclxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKFwiVE9VQ0hTVEFSVDogXCIsIGtleSk7XHJcblx0XHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XHJcblx0XHRcdFx0XHRzZWxmLmVtaXRLZXkoa2V5LCB0cnVlKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0XHRidG4ub24oXCJ0b3VjaGVuZFwiLCBmdW5jdGlvbihlKXtcclxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKFwiVE9VQ0hFTkQ6IFwiLCBrZXkpO1xyXG5cdFx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cdFx0XHRcdFx0c2VsZi5lbWl0S2V5KGtleSwgZmFsc2UpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHRcdGJ0bi5vbihcInRvdWNoY2FuY2VsXCIsIGZ1bmN0aW9uKGUpe1xyXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coXCJUT1VDSENBTkNFTDogXCIsIGtleSk7XHJcblx0XHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XHJcblx0XHRcdFx0XHRzZWxmLmVtaXRLZXkoa2V5LCBmYWxzZSk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdFx0YnRuLm9uKFwidG91Y2htb3ZlXCIsIGZ1bmN0aW9uKGUpe1xyXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coXCJUT1VDSE1PVkU6IFwiLCBrZXkpO1xyXG5cdFx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cdFx0XHRcdH0pXHJcblx0XHRcdFx0cmV0dXJuIGJ0bjtcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0JChcIjxkaXY+XCIpLmF0dHIoXCJpZFwiLCBcInRvdWNoY29udHJvbHNcIilcclxuXHRcdFx0LmFwcGVuZCAoXHJcblx0XHRcdFx0X19tYXAoJChcIjxkaXY+XCIpLmFkZENsYXNzKFwiYnV0dG9uXCIpLmFkZENsYXNzKFwiYVwiKSwgXCJJbnRlcmFjdFwiKVxyXG5cdFx0XHQpLmFwcGVuZCAoXHJcblx0XHRcdFx0X19tYXAoJChcIjxkaXY+XCIpLmFkZENsYXNzKFwiYnV0dG9uXCIpLmFkZENsYXNzKFwiYlwiKSwgXCJDYW5jZWxcIilcclxuXHRcdFx0KS5hcHBlbmQgKFxyXG5cdFx0XHRcdF9fbWFwKCQoXCI8ZGl2PlwiKS5hZGRDbGFzcyhcImJ1dHRvblwiKS5hZGRDbGFzcyhcIm1lbnVcIiksIFwiTWVudVwiKVxyXG5cdFx0XHQpLmFwcGVuZCAoXHJcblx0XHRcdFx0X19tYXAoJChcIjxkaXY+XCIpLmFkZENsYXNzKFwiYnV0dG9uXCIpLmFkZENsYXNzKFwicnVuXCIpLCBcIlJ1blwiKVxyXG5cdFx0XHQpLmFwcGVuZCAoXHJcblx0XHRcdFx0JChcIjxkaXY+XCIpLmFkZENsYXNzKFwiZHBhZFwiKVxyXG5cdFx0XHRcdC5hcHBlbmQgKFxyXG5cdFx0XHRcdFx0X19tYXAoJChcIjxkaXY+XCIpLmFkZENsYXNzKFwiYnV0dG9uXCIpLmFkZENsYXNzKFwidXBcIiksIFwiVXBcIilcclxuXHRcdFx0XHQpLmFwcGVuZCAoXHJcblx0XHRcdFx0XHRfX21hcCgkKFwiPGRpdj5cIikuYWRkQ2xhc3MoXCJidXR0b25cIikuYWRkQ2xhc3MoXCJkb3duXCIpLCBcIkRvd25cIilcclxuXHRcdFx0XHQpLmFwcGVuZCAoXHJcblx0XHRcdFx0XHRfX21hcCgkKFwiPGRpdj5cIikuYWRkQ2xhc3MoXCJidXR0b25cIikuYWRkQ2xhc3MoXCJsZWZ0XCIpLCBcIkxlZnRcIilcclxuXHRcdFx0XHQpLmFwcGVuZCAoXHJcblx0XHRcdFx0XHRfX21hcCgkKFwiPGRpdj5cIikuYWRkQ2xhc3MoXCJidXR0b25cIikuYWRkQ2xhc3MoXCJyaWdodFwiKSwgXCJSaWdodFwiKVxyXG5cdFx0XHRcdClcclxuXHRcdFx0KS5hcHBlbmRUbyhcImJvZHlcIik7XHJcblx0XHR9XHJcblx0fSk7XHJcbn1cclxuXHJcblxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBuZXcgQ29udHJvbE1hbmFnZXIoKTtcclxuIiwiLy8gZXZlbnQuanNcclxuLy8gRGVmaW5lcyB0aGUgYmFzZSBldmVudCB1c2VkIHRocm91Z2hvdXQgdGhlIHBhcmsuXHJcblxyXG4vLyBGaXR0aW5nbHksIEV2ZW50IGlzIGEgc3ViY2xhc3Mgb2Ygbm9kZS5qcydzIEV2ZW50RW1pdHRlciBjbGFzcy5cclxudmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoXCJldmVudHNcIikuRXZlbnRFbWl0dGVyO1xyXG52YXIgaW5oZXJpdHMgPSByZXF1aXJlKFwiaW5oZXJpdHNcIik7XHJcbnZhciBleHRlbmQgPSByZXF1aXJlKFwiZXh0ZW5kXCIpO1xyXG5cclxuLyoqXHJcbiAqIEFuIGV2ZW50IGlzIGFueSBpbnRlcmFjdGFibGUgb3IgYW5pbWF0aW5nIG9iamVjdCBpbiB0aGUgZ2FtZS5cclxuICogVGhpcyBpbmNsdWRlcyB0aGluZ3MgcmFuZ2luZyBmcm9tIHNpZ25zLCB0byBwZW9wbGUvcG9rZW1vbi5cclxuICogQW4gZXZlbnQ6XHJcbiAqXHQtIFRha2VzIHVwIGF0IGxlYXN0IG9uZSB0aWxlIG9uIHRoZSBtYXBcclxuICpcdC0gQ2FuIGJlIGludGVyYWN0ZWQgd2l0aCBieSBpbi1nYW1lIHRhbGtpbmcgb3Igb24tc2NyZWVuIGNsaWNrXHJcbiAqXHQtIE1heSBiZSByZXByZXNlbnRlZCBpbi1nYW1lIGJ5IGEgc3ByaXRlXHJcbiAqXHQtIE1heSBkZWNpZGUsIHVwb24gY3JlYXRpb24sIHRvIG5vdCBhcHBlYXIgb24gdGhlIG1hcC5cclxuICovXHJcbmZ1bmN0aW9uIEV2ZW50KGJhc2UsIG9wdHMpIHtcclxuXHRFdmVudEVtaXR0ZXIuY2FsbCh0aGlzKTtcclxuXHRcclxuXHRleHRlbmQodGhpcywgYmFzZSwgb3B0cyk7XHJcblx0XHJcblx0dGhpcy5fbm9ybWFsaXplTG9jYXRpb24oKTtcclxuXHRcclxuXHRpZiAodGhpcy5vbkV2ZW50cykge1xyXG5cdFx0dmFyIGtleXMgPSBPYmplY3Qua2V5cyh0aGlzLm9uRXZlbnRzKTtcclxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHR0aGlzLm9uKGtleXNbaV0sIHRoaXMub25FdmVudHNba2V5c1tpXV0pO1xyXG5cdFx0fVxyXG5cdFx0ZGVsZXRlIHRoaXMub25FdmVudHM7XHJcblx0fVxyXG59XHJcbmluaGVyaXRzKEV2ZW50LCBFdmVudEVtaXR0ZXIpO1xyXG5leHRlbmQoRXZlbnQucHJvdG90eXBlLCB7XHJcblx0aWQgOiBudWxsLFxyXG5cdGVuYWJsZWQgOiBmYWxzZSxcclxuXHR2aXNpYmxlIDogdHJ1ZSxcclxuXHRcclxuXHRsb2NhdGlvbiA6IG51bGwsIC8vIEV2ZW50cyB3aXRoIGEgc2luZ2xlIGxvY2F0aW9uIGFyZSBvcHRpbWl6ZWQgZm9yIGl0XHJcblx0bG9jYXRpb25zIDogbnVsbCwgLy8gRXZlbnRzIHdpdGggbXVsdGlwbGUgbG9jYXRpb25zIGFyZSBvcHRpbWl6ZWQgZm9yIHRoYXQgYWxzb1xyXG5cdFxyXG5cdHRvU3RyaW5nIDogZnVuY3Rpb24oKSB7XHJcblx0XHRpZiAoIXRoaXMuaWQpIHJldHVybiBcIjxMb2NhbCBvciBVbm5hbWVkIEV2ZW50PlwiO1xyXG5cdFx0cmV0dXJuIHRoaXMuaWQ7XHJcblx0fSxcclxuXHRcclxuXHRzaG91bGRBcHBlYXIgOiBmdW5jdGlvbihtYXBpZCl7IHJldHVybiB0cnVlOyB9LFxyXG5cdGNhbldhbGtPbiA6IGZ1bmN0aW9uKCl7IHJldHVybiB0cnVlOyB9LFxyXG5cdFxyXG5cdC8qKiBSZXR1cm5zIGFuIG9iamVjdCB0byByZXByZXNlbnQgdGhpcyBldmVudCBpbiAzRCBzcGFjZSwgb3IgbnVsbCBpZiB0aGVyZSBzaG91bGRuJ3QgYmUgb25lLiAqL1xyXG5cdGdldEF2YXRhciA6IGZ1bmN0aW9uKG1hcCwgZ2MpeyByZXR1cm4gbnVsbDsgfSxcclxuXHRcclxuXHRvbkV2ZW50cyA6IG51bGwsIC8vYSBvYmplY3QsIGV2ZW50LW5hbWVzIC0+IGZ1bmN0aW9ucyB0byBjYWxsLCB0byBiZSByZWdpc3RlcmVkIGluIGNvbnN0cnVjdG9yXHJcblx0XHJcblx0Y2FuTW92ZSA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0Ly9JZiB3ZSBvbmx5IGhhdmUgMSBsb2NhdGlvbiwgdGhlbiB3ZSBjYW4gbW92ZVxyXG5cdFx0cmV0dXJuICEhdGhpcy5sb2NhdGlvbiAmJiAhdGhpcy5sb2NhdGlvbnM7XHJcblx0fSxcclxuXHRcclxuXHRtb3ZlVG8gOiBmdW5jdGlvbih4LCB5KSB7XHJcblx0XHRpZiAoIXRoaXMuY2FuTW92ZSgpKVxyXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJUaGlzIGV2ZW50IGlzIGluIHNldmVyYWwgcGxhY2VzIGF0IG9uY2UsIGFuZCBjYW5ub3QgbW92ZVRvIVwiKTtcclxuXHRcdFxyXG5cdFx0Ly9UT0RPIHF1ZXVlIHVwIGEgbW92ZVxyXG5cdH0sXHJcblx0XHJcblx0X25vcm1hbGl6ZUxvY2F0aW9uIDogZnVuY3Rpb24oKSB7XHJcblx0XHRpZiAodGhpcy5sb2NhdGlvbikge1xyXG5cdFx0XHQvL0lmIHdlIGhhdmUgYSBzaW5ndWxhciBsb2NhdGlvbiBzZXRcclxuXHRcdFx0aWYgKHRoaXMubG9jYXRpb25zKSAvLyBBcyBsb25nIGFzIHdlIGRvbid0IGFsc28gaGF2ZSBhIGxpc3QsIGl0cyBmaW5lXHJcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiRXZlbnQgd2FzIGluaXRpYWxpemVkIHdpdGggYm90aCBsb2NhdGlvbiBhbmQgbG9jYXRpb25zISBUaGV5IGNhbm5vdCBiZSBib3RoIGRlZmluZWQhXCIpO1xyXG5cdFx0XHRcclxuXHRcdFx0dmFyIGxvYyA9IHRoaXMubG9jYXRpb247XHJcblx0XHRcdGlmICgkLmlzRnVuY3Rpb24obG9jKSkge1xyXG5cdFx0XHRcdGxvY3MgPSBsb2MuY2FsbCh0aGlzKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0aWYgKCQuaXNBcnJheShsb2MpICYmIGxvYy5sZW5ndGggPT0gMiAmJiB0eXBlb2YgbG9jWzBdID09IFwibnVtYmVyXCIgJiYgdHlwZW9mIGxvY1sxXSA9PSBcIm51bWJlclwiKSBcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGxvYyA9IG5ldyBUSFJFRS5WZWN0b3IyKGxvY1swXSwgbG9jWzFdKTtcclxuXHRcdFx0fSBcclxuXHRcdFx0ZWxzZSBpZiAoJC5pc0FycmF5KGxvYykgJiYgbG9jLmxlbmd0aCA9PSAzIFxyXG5cdFx0XHRcdCYmIHR5cGVvZiBsb2NbMF0gPT0gXCJudW1iZXJcIiAmJiB0eXBlb2YgbG9jWzFdID09IFwibnVtYmVyXCIgJiYgdHlwZW9mIGxvY1syXSA9PSBcIm51bWJlclwiKSBcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGxvYyA9IG5ldyBUSFJFRS5WZWN0b3IzKGxvY1swXSwgbG9jWzFdLCBsb2NbMl0pO1xyXG5cdFx0XHR9IFxyXG5cdFx0XHRlbHNlIGlmICghKGxvYyBpbnN0YW5jZW9mIFRIUkVFLlZlY3RvcjIgfHwgbG9jIGluc3RhbmNlb2YgVEhSRUUuVmVjdG9yMykpIFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiQ291bGQgbm90IG5vcm1hbGl6ZSBsb2NhdGlvbiBvZiBcIit0aGlzLmlkK1wiIVwiKTtcclxuXHRcdFx0fVxyXG5cdFx0XHR0aGlzLmxvY2F0aW9uID0gbG9jO1xyXG5cdFx0XHRyZXR1cm4gMTtcclxuXHRcdH1cclxuXHRcdHZhciBvcmdsb2MgPSB0aGlzLmxvY2F0aW9ucztcclxuXHRcdHZhciBsb2NzID0gbnVsbDtcclxuXHRcdFxyXG5cdFx0aWYgKCQuaXNBcnJheShvcmdsb2MpKSB7XHJcblx0XHRcdHZhciB0eXBlID0gbnVsbCwgbmV3VHlwZSA9IG51bGw7XHJcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgb3JnbG9jLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdFx0aWYgKHR5cGVvZiBvcmdsb2NbaV0gPT0gXCJudW1iZXJcIilcclxuXHRcdFx0XHRcdG5ld1R5cGUgPSBcIm51bWJlclwiO1xyXG5cdFx0XHRcdGVsc2UgaWYgKG9yZ2xvY1tpXSBpbnN0YW5jZW9mIFRIUkVFLlZlY3RvcjIpXHJcblx0XHRcdFx0XHRuZXdUeXBlID0gXCJ2ZWN0b3JcIjtcclxuXHRcdFx0XHRlbHNlIGlmIChvcmdsb2NbaV0gaW5zdGFuY2VvZiBUSFJFRS5WZWN0b3IzKVxyXG5cdFx0XHRcdFx0bmV3VHlwZSA9IFwidmVjdG9yXCI7XHJcblx0XHRcdFx0ZWxzZSBpZiAoJC5pc0FycmF5KG9yZ2xvY1tpXSkpXHJcblx0XHRcdFx0XHRuZXdUeXBlID0gXCJhcnJheVwiO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdGlmICghdHlwZSkgdHlwZSA9IG5ld1R5cGU7XHJcblx0XHRcdFx0aWYgKHR5cGUgIT0gbmV3VHlwZSkge1xyXG5cdFx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiQ291bGQgbm90IG5vcm1hbGl6ZSBsb2NhdGlvbnMgb2YgXCIrdGhpcy5pZCtcIiFcIik7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHRcdGlmICh0eXBlID09IFwibnVtYmVyXCIpIGxvY3MgPSBfX3BhcnNlQXNOdW1iZXJBcnJheShvcmdsb2MpO1xyXG5cdFx0XHRpZiAodHlwZSA9PSBcImFycmF5XCIpIGxvY3MgPSBfX3BhcnNlQXNBcnJheUFycmF5KG9yZ2xvYyk7XHJcblx0XHRcdGlmICh0eXBlID09IFwidmVjdG9yXCIpIGxvY3MgPSBvcmdsb2M7XHJcblx0XHR9XHJcblx0XHRlbHNlIGlmICgkLmlzRnVuY3Rpb24ob3JnbG9jKSkge1xyXG5cdFx0XHRsb2NzID0gb3JnbG9jLmNhbGwodGhpcyk7XHJcblx0XHR9XHJcblx0XHRlbHNlIGlmIChvcmdsb2MgaW5zdGFuY2VvZiBUSFJFRS5WZWN0b3IyKSB7XHJcblx0XHRcdGxvY3MgPSBbb3JnbG9jXTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0aWYgKCFsb2NzIHx8ICEkLmlzQXJyYXkobG9jcykgfHwgbG9jcy5sZW5ndGggPT0gMCkgXHJcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIkNvdWxkIG5vdCBub3JtYWxpemUgbG9jYXRpb25zIG9mIFwiK3RoaXMuaWQrXCIhXCIpO1xyXG5cdFx0XHJcblx0XHR0aGlzLmxvY2F0aW9ucyA9IGxvY3M7XHJcblx0XHR0aGlzLl9ub3JtYWxpemVMb2NhdGlvbiA9IGZ1bmN0aW9uKCl7IHJldHVybiBsb2NzLmxlbmd0aDsgfTsgLy9jYW4ndCBub3JtYWxpemUgdHdpY2VcclxuXHRcdHJldHVybiBsb2NzLmxlbmd0aDtcclxuXHRcdFxyXG5cdFx0ZnVuY3Rpb24gX19wYXJzZUFzTnVtYmVyQXJyYXkobCkge1xyXG5cdFx0XHRpZiAobC5sZW5ndGggPT0gMikgLy9zaW5nbGUgcG9pbnQgW3gsIHldXHJcblx0XHRcdFx0cmV0dXJuIFtuZXcgVEhSRUUuVmVjdG9yMihsWzBdLCBsWzFdKV07XHJcblx0XHRcdGlmIChsLmxlbmd0aCA9PSAzKSAvL3NpbmdsZSBwb2ludCBbeCwgeSwgel1cclxuXHRcdFx0XHRyZXR1cm4gW25ldyBUSFJFRS5WZWN0b3IzKGxbMF0sIGxbMV0sIGxbMl0pXTtcclxuXHRcdFx0aWYgKGwubGVuZ3RoID09IDQpIHsgLy9yZWN0YW5nbGUgW3gsIHksIHcsIGhdXHJcblx0XHRcdFx0dmFyIG4gPSBbXTtcclxuXHRcdFx0XHRmb3IgKHZhciB4ID0gbFswXTsgeCA8IGxbMF0rbFsyXTsgeCsrKSB7XHJcblx0XHRcdFx0XHRmb3IgKHZhciB5ID0gbFsxXTsgeSA8IGxbMV0rbFszXTsgeSsrKSB7XHJcblx0XHRcdFx0XHRcdG4ucHVzaChuZXcgVEhSRUUuVmVjdG9yMih4LCB5KSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdHJldHVybiBuO1xyXG5cdFx0XHR9XHJcblx0XHRcdGlmIChsLmxlbmd0aCA9PSA1KSB7IC8vcmVjdGFuZ2xlIFt4LCB5LCB6LCB3LCBoXVxyXG5cdFx0XHRcdHZhciBuID0gW107XHJcblx0XHRcdFx0Zm9yICh2YXIgeCA9IGxbMF07IHggPCBsWzBdK2xbM107IHgrKykge1xyXG5cdFx0XHRcdFx0Zm9yICh2YXIgeSA9IGxbMV07IHkgPCBsWzFdK2xbNF07IHkrKykge1xyXG5cdFx0XHRcdFx0XHRuLnB1c2gobmV3IFRIUkVFLlZlY3RvcjMoeCwgeSwgbFsyXSkpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRyZXR1cm4gbjtcclxuXHRcdFx0fVxyXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJDb3VsZCBub3Qgbm9ybWFsaXplIGxvY2F0aW9uKHMpIG9mIFwiK3RoaXMuaWQrXCIhXCIpO1xyXG5cdFx0fVxyXG5cdFx0ZnVuY3Rpb24gX19wYXJzZUFzQXJyYXlBcnJheShsKSB7XHJcblx0XHRcdHZhciBuID0gW107XHJcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgbC5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRcdGZvciAodmFyIGogPSAwOyBqIDwgbFtpXS5sZW5ndGg7IGorKykge1xyXG5cdFx0XHRcdFx0aWYgKHR5cGVvZiBsW2ldW2pdICE9IFwibnVtYmVyXCIpXHJcblx0XHRcdFx0XHRcdHRocm93IG5ldyBFcnJvcihcIkNvdWxkIG5vdCBub3JtYWxpemUgbG9jYXRpb24ocykgb2YgXCIrdGhpcy5pZCtcIiFcIik7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdG4ucHVzaChfX3BhcnNlQXNOdW1iZXJBcnJheShsW2ldKSk7XHJcblx0XHRcdH1cclxuXHRcdFx0cmV0dXJuIG47XHJcblx0XHR9XHJcblx0fSxcclxuXHRcclxuXHRcclxuXHRkaXZpZGVGYWNpbmc6IGZ1bmN0aW9uKGRpcnZlY3Rvcikge1xyXG5cdFx0dmFyIHggPSBkaXJ2ZWN0b3IueCwgeSA9IGRpcnZlY3Rvci56O1xyXG5cdFx0Ly8gY29uc29sZS5sb2coXCJESVJGQUNJTkc6XCIsIHgsIHkpO1xyXG5cdFx0aWYgKE1hdGguYWJzKHgpID4gTWF0aC5hYnMoeSkpIHsgLy9EaXJlY3Rpb24gdmVjdG9yIGlzIHBvaW50aW5nIGFsb25nIHggYXhpc1xyXG5cdFx0XHRpZiAoeCA+IDApIHJldHVybiBcIndcIjtcclxuXHRcdFx0ZWxzZSByZXR1cm4gXCJlXCI7XHJcblx0XHR9IGVsc2UgeyAvL0RpcmVjdGlvbiB2ZWN0b3IgaXMgcG9pbnRpbmcgYWxvbmcgeSBheGlzXHJcblx0XHRcdGlmICh5ID4gMCkgcmV0dXJuIFwic1wiO1xyXG5cdFx0XHRlbHNlIHJldHVybiBcIm5cIjtcclxuXHRcdH1cclxuXHRcdHJldHVybiBcInNcIjtcclxuXHR9XHJcblx0XHJcbn0pO1xyXG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50O1xyXG5cclxuRXZlbnQucHJvdG90eXBlLmFkZExpc3RlbmVyID1cclxuRXZlbnQucHJvdG90eXBlLm9uID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcclxuXHRpZiAoJC5pbkFycmF5KHR5cGUsIF9fRVZFTlRfVFlQRVNfXykgPT0gLTEpIHtcclxuXHRcdGNvbnNvbGUuZXJyb3IoXCJNYXAgRXZlbnRcIiwgdGhpcy50b1N0cmluZygpLCBcInJlZ2lzdGVyaW5nIGVtaXR0ZWQgZXZlbnQgdHlwZVwiLCBcclxuXHRcdFx0dHlwZSwgXCJ3aGljaCBpcyBub3QgYSB2YWxpZCBlbWl0dGVkIGV2ZW50IHR5cGUhXCIpO1xyXG5cdH1cclxuXHRFdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uLmNhbGwodGhpcywgdHlwZSwgbGlzdGVuZXIpO1xyXG59XHJcblxyXG4vLyBUaGUgZm9sbG93aW5nIGlzIGEgbGlzdCBvZiBldmVudHMgdGhlIGJhc2UgRXZlbnQgY2xhc3MgYW5kIGxpYnJhcnkgZW1pdFxyXG4vLyBUaGlzIGxpc3QgaXMgY2hlY2tlZCBhZ2FpbnN0IHdoZW4gcmVnaXN0ZXJpbmcgdG8gY2F0Y2ggbWlzc3BlbGxpbmdzLlxyXG52YXIgX19FVkVOVF9UWVBFU19fID0gW1xyXG5cdFwiZW50ZXJpbmctdGlsZVwiLCAvLyhmcm9tLWRpcikgXHJcblx0XHQvL2VtaXR0ZWQgdXBvbiB0aGUgcGxheWVyIGlzIGdpdmVuIHRoZSBnbyBhaGVhZCB0byBlbnRlciB0aGUgdGlsZSB0aGlzIGV2ZW50IG9jY3VwaWVzLlxyXG5cdFwiZW50ZXJlZC10aWxlXCIsIC8vKGZyb20tZGlyKVxyXG5cdFx0Ly9lbWl0dGVkIHVwb24gdGhlIHBsYXllciBsYW5kaW5nIG9uIHRoZSB0aWxlIHRoaXMgZXZlbnQgb2NjdXBpZXMuXHJcblx0XCJsZWF2aW5nLXRpbGVcIiwgLy8odG8tZGlyKVxyXG5cdFx0Ly9lbWl0dGVkIHVwb24gdGhlIHBsYXllciBpcyBnaXZlbiB0aGUgZ28gYWhlYWQgdG8gbGVhdmUgdGhlIHRpbGUgdGhpcyBldmVudCBvY2N1cGllcy5cclxuXHRcImxlZnQtdGlsZVwiLCAvLyh0by1kaXIpXHJcblx0XHQvL2VtaXR0ZWQgdXBvbiB0aGUgcGxheWVyIGNvbXBsZXRlbHkgbGVhdmluZyB0aGUgdGlsZSB0aGlzIGV2ZW50IG9jY3VwaWVzLlxyXG5cdFwiYnVtcGVkXCIsIC8vKGZyb20tZGlyKVxyXG5cdFx0Ly9lbWl0dGVkIHVwb24gdGhlIHBsYXllciBpcyBkZW5pZWQgZW50cnkgaW50byB0aGUgdGlsZSB0aGlzIGV2ZW50IG9jY3VwaWVzLlxyXG5cdFwiaW50ZXJhY3RlZFwiLCAvLyhmcm9tLWRpcilcclxuXHRcdC8vZW1pdHRlZCB3aGVuIHRoZSBwbGF5ZXIgaW50ZXJhY3RzIHdpdGggdGhpcyBldmVudCBmcm9tIGFuIGFkamFjZW50IHRpbGVcclxuXHRcInRpY2tcIiwgLy8oZGVsdGEpXHJcblx0XHQvL2VtaXR0ZWQgZXZlcnkgZ2FtZSB0aWNrXHJcblx0XCJjbGlja2VkXCIsIC8vKHgsIHkpXHJcblx0XHQvL2VtaXR0ZWQgd2hlbiB0aGUgbW91c2UgaXMgY2xpY2tlZCBvbiB0aGlzIGV2ZW50IChhbmQgaXQgaXMgZGV0ZXJtaW5lZCBpdCBpcyB0aGlzIGV2ZW50KVxyXG5cdFwiY2xpY2tlZC10aHJvdWdoXCIsIC8vKHgsIHkpXHJcblx0XHQvL2VtaXR0ZWQgd2hlbiB0aGUgbW91c2UgaXMgY2xpY2tlZCBvbiB0aGlzIGV2ZW50IChhbmQgdGhlIHJheXRyYWNlIGlzIHBhc3NpbmcgdGhyb3VnaCBcclxuXHRcdC8vIHRoaXMgZXZlbnQgZHVyaW5nIHRoZSBkZXRlcm1pbmluZyBwaGFzZSlcclxuXHRcIm1vdmluZ1wiLCAvLyhzcmNYLCBzcmNZLCBkZXN0WCwgZGVzdFkpXHJcblx0XHQvL2VtaXR0ZWQgd2hlbiB0aGlzIGV2ZW50IGJlZ2lucyBtb3ZpbmcgdG8gYSBuZXcgdGlsZVxyXG5cdFwibW92ZWRcIiwgLy8oc3JjWCwgc3JjWSwgZGVzdFgsIGRlc3RZKVxyXG5cdFx0Ly9lbWl0dGVkIHdoZW4gdGhpcyBldmVudCBmaW5pc2hlcyBtb3ZpbmcgdG8gYSBuZXcgdGlsZVxyXG5cdFwiY2FudC1tb3ZlXCIsIC8vKHNyY1gsIHNyY1ksIGRlc3RYLCBkZXN0WSwgcmVhc29uRXZlbnQpXHJcblx0XHQvL2VtaXR0ZWQgd2hlbiB0aGlzIGV2ZW50IGlzIGRlbmllZCBtb3ZlbWVudCB0byB0aGUgcmVxdWVzdGVkIHRpbGVcclxuXHRcdC8vIEl0IGlzIHBhc3NlZCB0aGUgZXZlbnQgYmxvY2tpbmcgaXQsIG9yIG51bGwgaWYgaXQgaXMgZHVlIHRvIHRoZSBjb2xsaXNpb24gbWFwXHJcblx0XCJjaGFuZ2UtbGF5ZXJcIiwgLy8oZnJvbUxheWVyLCB0b0xheWVyKVxyXG5cdFx0Ly9lbWl0dGVkIHdoZW4gdGhpcyBldmVudCBjaGFuZ2VzIGxheWVyXHJcblx0XCJhbmltLWVuZFwiLCAvLyhhbmltYXRpb25OYW1lKVxyXG5cdFx0Ly9lbWl0dGVkIHdoZW4gdGhpcyBldmVudCdzIGFuaW1hdGlvbiBlbmRzXHJcblx0XCJjcmVhdGVkXCIsIFxyXG5cdFx0Ly9lbWl0dGVkIHdoZW4gdGhpcyBldmVudCBpcyBhZGRlZCB0byB0aGUgZXZlbnQgbWFwXHJcblx0XCJkZXN0cm95ZWRcIixcclxuXHRcdC8vZW1pdHRlZCB3aGVuIHRoaXMgZXZlbnQgaGFzIGJlZW4gdGFrZW4gb3V0IG9mIHRoZSBldmVudCBtYXBcclxuXHRcInJlYWN0XCIsIC8vKGlkLCBkaXN0YW5jZSlcclxuXHRcdC8vZW1pdHRlZCB3aGVuIGFub3RoZXIgZXZlbnQgb24gdGhlIG1hcCB0cmFuc21pdHMgYSByZWFjdGFibGUgZXZlbnRcclxuXHRcIm1lc3NhZ2VcIiwgLy8oaWQsIC4uLilcclxuXHRcdC8vbmV2ZXIgZW1pdHRlZCBieSB0aGUgbGlicmFyeSwgdGhpcyBldmVudCB0eXBlIGNhbiBiZSB1c2VkIGZvciBjcm9zcy1ldmVudCBtZXNzYWdlc1xyXG5dO1xyXG4iLCIvLyBtb2RlbC1tb2RzLmpzXHJcbi8vIERlZmluaW5nIHNldmVyYWwgc3RhbmRhcmQtaXNzdWUgbW9kZWwgbW9kaWNpYXRpb25zIHRvIGJlIHJ1biBpbiB0aGUgbG9jYWwgZXZlbnQuanMgZm9yIGEgbWFwXHJcblxyXG52YXIgaW5oZXJpdHMgPSByZXF1aXJlKFwiaW5oZXJpdHNcIik7XHJcbnZhciBleHRlbmQgPSByZXF1aXJlKFwiZXh0ZW5kXCIpO1xyXG5cclxuZnVuY3Rpb24gTW9kaWZpY2F0aW9uKGZuLCBvcHRzKSB7XHJcblx0ZXh0ZW5kKHRoaXMsIG9wdHMpO1xyXG5cdHRoaXMuZm4gPSBmbjtcclxufVxyXG5leHRlbmQoTW9kaWZpY2F0aW9uLnByb3RvdHlwZSwge1xyXG5cdG5hbWU6IG51bGwsXHJcblx0cHJlZml4OiBudWxsLFxyXG5cdHN1ZmZpeDogbnVsbCxcclxuXHRyZWdleDogbnVsbCxcclxuXHRhbGw6IGZhbHNlLFxyXG5cdFxyXG5cdGZuOiBudWxsLFxyXG59KTtcclxuXHJcblxyXG5mdW5jdGlvbiB0ZXN0TmFtZShuYXJyYXksIG5hbWUpIHtcclxuXHRpZiAoISQuaXNBcnJheShuYXJyYXkpKSBuYXJyYXkgPSBbbmFycmF5XTtcclxuXHRmb3IgKHZhciBpID0gMDsgaSA8IG5hcnJheS5sZW5ndGg7IGkrKykge1xyXG5cdFx0aWYgKG5hbWUgPT0gbmFycmF5W2ldKSByZXR1cm4gdHJ1ZTtcclxuXHR9XHJcblx0cmV0dXJuIGZhbHNlO1xyXG59XHJcbmZ1bmN0aW9uIHRlc3RQcmVmaXgobmFycmF5LCBuYW1lKXtcclxuXHRpZiAoISQuaXNBcnJheShuYXJyYXkpKSBuYXJyYXkgPSBbbmFycmF5XTtcclxuXHRmb3IgKHZhciBpID0gMDsgaSA8IG5hcnJheS5sZW5ndGg7IGkrKykge1xyXG5cdFx0aWYgKG5hbWUuc3RhcnRzV2l0aChuYXJyYXlbaV0pKSByZXR1cm4gdHJ1ZTtcclxuXHR9XHJcblx0cmV0dXJuIGZhbHNlO1xyXG59XHJcbmZ1bmN0aW9uIHRlc3RTdWZmaXgobmFycmF5LCBuYW1lKXtcclxuXHRpZiAoISQuaXNBcnJheShuYXJyYXkpKSBuYXJyYXkgPSBbbmFycmF5XTtcclxuXHRmb3IgKHZhciBpID0gMDsgaSA8IG5hcnJheS5sZW5ndGg7IGkrKykge1xyXG5cdFx0aWYgKG5hbWUuZW5kc1dpdGgobmFycmF5W2ldKSkgcmV0dXJuIHRydWU7XHJcblx0fVxyXG5cdHJldHVybiBmYWxzZTtcclxufVxyXG5mdW5jdGlvbiB0ZXN0UmVnZXgocmVnZXgsIG5hbWUpIHtcclxuXHRyZXR1cm4gcmVnZXgudGVzdChuYW1lKTtcclxufVxyXG5cclxuXHJcbm1vZHVsZS5leHBvcnRzID0ge1xyXG5cdG1vZGlmeTogZnVuY3Rpb24gKCl7XHJcblx0XHR2YXIgbW9kcyA9IFtdO1xyXG5cdFx0Zm9yICh2YXIgcCBpbiB0aGlzKSB7XHJcblx0XHRcdGlmICghKHRoaXNbcF0gaW5zdGFuY2VvZiBNb2RpZmljYXRpb24pKSBjb250aW51ZTtcclxuXHRcdFx0aWYgKCF0aGlzW3BdLm5hbWUgJiYgIXRoaXNbcF0ucHJlZml4ICYmICF0aGlzW3BdLnN1ZmZpeCkgY29udGludWU7XHJcblx0XHRcdG1vZHMucHVzaCh0aGlzW3BdKTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0dmFyIGNoID0gY3VycmVudE1hcC5tYXBtb2RlbC5jaGlsZHJlbjtcclxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgY2gubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0Zm9yICh2YXIgbSA9IDA7IG0gPCBtb2RzLmxlbmd0aDsgbSsrKSB7XHJcblx0XHRcdFx0aWYgKG1vZHNbbV0ubmFtZSAmJiB0ZXN0TmFtZShtb2RzW21dLm5hbWUsIGNoW2ldLm5hbWUpKSB7XHJcblx0XHRcdFx0XHRtb2RzW21dLmZuKGNoW2ldKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0ZWxzZSBpZiAobW9kc1ttXS5wcmVmaXggJiYgdGVzdFByZWZpeChtb2RzW21dLnByZWZpeCwgY2hbaV0ubmFtZSkpIHtcclxuXHRcdFx0XHRcdG1vZHNbbV0uZm4oY2hbaV0pO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRlbHNlIGlmIChtb2RzW21dLnN1ZmZpeCAmJiB0ZXN0U3VmZml4KG1vZHNbbV0uc3VmZml4LCBjaFtpXS5uYW1lKSkge1xyXG5cdFx0XHRcdFx0bW9kc1ttXS5mbihjaFtpXSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGVsc2UgaWYgKG1vZHNbbV0ucmVnZXggJiYgdGVzdFJlZ2V4KG1vZHNbbV0ucmVnZXgsIGNoW2ldLm5hbWUpKSB7XHJcblx0XHRcdFx0XHRtb2RzW21dLmZuKGNoW2ldKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0ZWxzZSBpZiAobW9kc1ttXS5hbGwpIHtcclxuXHRcdFx0XHRcdG1vZHNbbV0uZm4oY2hbaV0pO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHRmb3IgKHZhciBtID0gMDsgbSA8IG1vZHMubGVuZ3RoOyBtKyspIHtcclxuXHRcdFx0bW9kc1ttXS5uYW1lID0gbnVsbDtcclxuXHRcdFx0bW9kc1ttXS5wcmVmaXggPSBudWxsO1xyXG5cdFx0XHRtb2RzW21dLnN1ZmZpeCA9IG51bGw7XHJcblx0XHRcdG1vZHNbbV0ucmVnZXggPSBudWxsO1xyXG5cdFx0XHRtb2RzW21dLmFsbCA9IGZhbHNlO1xyXG5cdFx0fVxyXG5cdH0sXHJcblx0XHJcblx0Ly8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblx0Ly8gQWN0dWFsIG1vZGlmaWNhdGlvbiBmdW5jdGlvbnMgYmVsb3dcclxuXHRcclxuXHRoaWRlOiBuZXcgTW9kaWZpY2F0aW9uKGZ1bmN0aW9uKG9iail7XHJcblx0XHRvYmoudmlzaWJsZSA9IGZhbHNlO1xyXG5cdH0pLFxyXG5cdFxyXG5cdHRyZWVzOiBuZXcgTW9kaWZpY2F0aW9uKGZ1bmN0aW9uKHRyZWUpIHtcclxuXHRcdGZvciAodmFyIGogPSAwOyBqIDwgdHJlZS5jaGlsZHJlbi5sZW5ndGg7IGorKykge1xyXG5cdFx0XHR2YXIgbSA9IHRyZWUuY2hpbGRyZW5bal0ubWF0ZXJpYWw7XHJcblx0XHRcdGlmIChtLnNpZGUgIT0gVEhSRUUuRG91YmxlU2lkZSkge1xyXG5cdFx0XHRcdC8vTmVlZCB0byBnYXRlIGJlY2F1c2UgdGhlIGNvbG9yIHNldCBhdCB0aGUgZW5kIGlzIGRlc3RydWN0aXZlXHJcblx0XHRcdFx0bS5zaWRlID0gVEhSRUUuRG91YmxlU2lkZTtcclxuXHRcdFx0XHRtLmFscGhhVGVzdCA9IDAuMjtcclxuXHRcdFx0XHRtLnRyYW5zcGFyZW50ID0gdHJ1ZTtcclxuXHRcdFx0XHRtLmVtaXNzaXZlLnNldChtLmNvbG9yKTtcclxuXHRcdFx0XHRtLmNvbG9yLnNldCgwKTtcclxuXHRcdFx0XHRtLm5lZWRzVXBkYXRlID0gdHJ1ZTtcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0dHJlZS5jaGlsZHJlbltqXS5yZW5kZXJEZXB0aCA9ICgxMCtqKSAqIC0xO1xyXG5cdFx0fVxyXG5cdH0pLFxyXG5cdFxyXG5cdHJlbmRlckRlcHRoRml4OiBuZXcgTW9kaWZpY2F0aW9uKGZ1bmN0aW9uKG9iail7XHJcblx0XHRmb3IgKHZhciBqID0gMDsgaiA8IG9iai5jaGlsZHJlbi5sZW5ndGg7IGorKykge1xyXG5cdFx0XHRvYmouY2hpbGRyZW5bal0ucmVuZGVyRGVwdGggPSAtNTA7XHJcblx0XHR9XHJcblx0fSksXHJcblx0XHJcblx0Z29kcmF5czogbmV3IE1vZGlmaWNhdGlvbihmdW5jdGlvbihyYXlzKXtcclxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgcmF5cy5jaGlsZHJlbi5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRyYXlzLmNoaWxkcmVuW2ldLnJlbmRlckRlcHRoID0gLTEwMDtcclxuXHRcdFx0cmF5cy5jaGlsZHJlbltpXS5tYXRlcmlhbC5ibGVuZGluZyA9IFRIUkVFLkFkZGl0aXZlQmxlbmRpbmc7XHJcblx0XHRcdHJheXMuY2hpbGRyZW5baV0ubWF0ZXJpYWwuZGVwdGhXcml0ZSA9IGZhbHNlO1xyXG5cdFx0fVxyXG5cdH0pLFxyXG5cdFxyXG5cdHJlZnJlc2hNYXRlcmlhbHM6IG5ldyBNb2RpZmljYXRpb24oZnVuY3Rpb24ob2JqKXtcclxuXHRcdGZvciAodmFyIGogPSAwOyBqIDwgb2JqLmNoaWxkcmVuLmxlbmd0aDsgaisrKSB7XHJcblx0XHRcdHZhciBtID0gb2JqLmNoaWxkcmVuW2pdLm1hdGVyaWFsO1xyXG5cdFx0XHRtLm5lZWRzVXBkYXRlID0gdHJ1ZTtcclxuXHRcdH1cclxuXHR9KSxcclxufTsiLCIvLyBwYXJ0aWNsZS1zeXN0ZW0uanNcclxuLy8gRGVmaW5pdGlvbiBmb3IgYW4gZXZlbnQgdGhhdCBydW5zIGEgUGFydGljbGUgU3lzdGVtLlxyXG4vLyBBZGFwdGVkIGZyb20gTGVlIFN0ZW1rb3NraSdzLiAgIGh0dHA6Ly93d3cuYWRlbHBoaS5lZHUvfnN0ZW1rb3NraS9cclxuXHJcbnZhciBFdmVudCA9IHJlcXVpcmUoXCJ0cHAtZXZlbnRcIik7XHJcbnZhciBpbmhlcml0cyA9IHJlcXVpcmUoXCJpbmhlcml0c1wiKTtcclxudmFyIGV4dGVuZCA9IHJlcXVpcmUoXCJleHRlbmRcIik7XHJcblxyXG5mdW5jdGlvbiBQYXJ0aWNsZVN5c3RlbUV2ZW50KGJhc2UsIG9wdHMpIHtcclxuXHRFdmVudC5jYWxsKHRoaXMsIGJhc2UsIG9wdHMpO1xyXG59XHJcbmluaGVyaXRzKFBhcnRpY2xlU3lzdGVtRXZlbnQsIEV2ZW50KTtcclxuZXh0ZW5kKFBhcnRpY2xlU3lzdGVtRXZlbnQucHJvdG90eXBlLCB7XHJcblx0cnVubmluZzogdHJ1ZSxcclxuXHRcclxuXHRwYXJ0aWNsZXNQZXJTZWNvbmQ6IDEwMCxcclxuXHRwYXJ0aWNsZURlYXRoQWdlOiAxLjAsXHJcblx0cGFydGljbGVTeXM6IG51bGwsXHJcblx0YmxlbmRTdHlsZTogVEhSRUUuTm9ybWFsQmxlbmRpbmcsXHJcblx0XHJcblx0Ym91bmRpbmdTaXplOiBudWxsLFxyXG5cdHNwcml0ZTogbnVsbCxcclxuXHRcclxuXHRuZXdQYXJ0aWNsZTogZnVuY3Rpb24ocCkge1xyXG5cdFx0cC5wb3NpdGlvbi5zZXQoTWF0aC5yYW5kb20oKSAtIDAuNSwgTWF0aC5yYW5kb20oKSAtIDAuNSwgTWF0aC5yYW5kb20oKSAtIDAuNSk7XHJcblx0XHRwLnZlbG9jaXR5LnNldChNYXRoLnJhbmRvbSgpIC0gMC41LCBNYXRoLnJhbmRvbSgpIC0gMC41LCBNYXRoLnJhbmRvbSgpIC0gMC41KTtcclxuXHRcdHAuYWNjZWxlcmF0aW9uLnNldChNYXRoLnJhbmRvbSgpIC0gMC41LCBNYXRoLnJhbmRvbSgpIC0gMC41LCBNYXRoLnJhbmRvbSgpIC0gMC41KTtcclxuXHRcdFxyXG5cdFx0cC5hbmdsZSA9IE1hdGgucmFuZG9tKCkgKiAzNjA7XHJcblx0XHRwLmFuZ2xlVmVsb2NpdHkgPSAoTWF0aC5yYW5kb20oKSAtIDAuNSkgKiAxODA7XHJcblx0XHRwLmFuZ2xlQWNjZWxlcmF0aW9uID0gTWF0aC5yYW5kb20oKSAtIDAuNTtcclxuXHRcdFxyXG5cdFx0cC5jb2xvci5zZXQoMSwgMSwgMSk7XHJcblx0XHRwLnNpemUgPSAxO1xyXG5cdFx0cC5vcGFjaXR5ID0gMTtcclxuXHR9LFxyXG5cdFxyXG5cdGdldEF2YXRhciA6IGZ1bmN0aW9uKG1hcCwgZ2Mpe1xyXG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xyXG5cdFx0dGhpcy5wYXJ0aWNsZVN5cyA9IG5ldyBQYXJ0aWNsZUVuZ2luZSgpO1xyXG5cdFx0dGhpcy5wYXJ0aWNsZVN5cy5wYXJlbnRFdmVudCA9IHRoaXM7XHJcblx0XHR0aGlzLnBhcnRpY2xlU3lzLnBhcnRpY2xlc1BlclNlY29uZCA9IHRoaXMucGFydGljbGVzUGVyU2Vjb25kO1xyXG5cdFx0dGhpcy5wYXJ0aWNsZVN5cy5wYXJ0aWNsZURlYXRoQWdlID0gdGhpcy5wYXJ0aWNsZURlYXRoQWdlO1xyXG5cdFx0dGhpcy5wYXJ0aWNsZVN5cy5ibGVuZFN0eWxlID0gdGhpcy5ibGVuZFN0eWxlO1xyXG5cdFx0dGhpcy5wYXJ0aWNsZVN5cy5wYXJ0aWNsZVRleHR1cmUuaW1hZ2UgPSBERUZfVEVYVFVSRV9JTUc7XHJcblx0XHRcclxuXHRcdGdjLmNvbGxlY3QodGhpcy5wYXJ0aWNsZVN5cy5wYXJ0aWNsZVRleHR1cmUpO1xyXG5cdFx0Z2MuY29sbGVjdCh0aGlzLnBhcnRpY2xlU3lzLnBhcnRpY2xlR2VvbWV0cnkpO1xyXG5cdFx0Z2MuY29sbGVjdCh0aGlzLnBhcnRpY2xlU3lzLnBhcnRpY2xlTWF0ZXJpYWwpO1xyXG5cdFx0XHJcblx0XHQvLyBpZiAoJC5pc0FycmF5KHRoaXMuYm91bmRpbmdTaXplKSkge1xyXG5cdFx0Ly8gXHR2YXIgbWluID0gbmV3IFRIUkVFLlZlY3RvcjMoLXRoaXMuYm91bmRpbmdTaXplWzBdLCAwLCAtdGhpcy5ib3VuZGluZ1NpemVbMV0pO1xyXG5cdFx0Ly8gXHR2YXIgbWF4ID0gbmV3IFRIUkVFLlZlY3RvcjMoIHRoaXMuYm91bmRpbmdTaXplWzBdLCB0aGlzLmJvdW5kaW5nU2l6ZVsyXSwgdGhpcy5ib3VuZGluZ1NpemVbMV0pO1xyXG5cdFx0Ly8gXHR0aGlzLnBhcnRpY2xlU3lzLnBhcnRpY2xlR2VvbWV0cnkuY29tcHV0ZUJvdW5kaW5nQm94KCk7XHJcblx0XHQvLyBcdHRoaXMucGFydGljbGVTeXMucGFydGljbGVHZW9tZXRyeS5ib3VuZGluZ0JveC5zZXQobWluLCBtYXgpO1xyXG5cdFx0Ly8gfVxyXG5cdFx0XHJcblx0XHR0aGlzLnBhcnRpY2xlU3lzLmluaXRpYWxpemUoKTtcclxuXHRcdFxyXG5cdFx0bWFwLm1hcmtMb2FkaW5nKFwiUEFSVElDTEVfXCIrc2VsZi5pZCk7XHJcblx0XHRtYXAubG9hZFNwcml0ZShcIl9sb2NhbFwiLCB0aGlzLnNwcml0ZSwgZnVuY3Rpb24oZXJyLCB1cmwpe1xyXG5cdFx0XHRpZiAoZXJyKSB7XHJcblx0XHRcdFx0Y29uc29sZS5lcnJvcihcIkVSUk9SIExPQURJTkcgUEFSVElDTEU6IFwiLCBlcnIpO1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0dmFyIGltZyA9IG5ldyBJbWFnZSgpO1xyXG5cdFx0XHR2YXIgZiA9IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRcdHNlbGYucGFydGljbGVTeXMucGFydGljbGVUZXh0dXJlLmltYWdlID0gaW1nO1xyXG5cdFx0XHRcdHNlbGYucGFydGljbGVTeXMucGFydGljbGVUZXh0dXJlLm5lZWRzVXBkYXRlID0gdHJ1ZTtcclxuXHRcdFx0XHRtYXAubWFya0xvYWRGaW5pc2hlZChcIlBBUlRJQ0xFX1wiK3NlbGYuaWQpO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdGltZy5yZW1vdmVFdmVudExpc3RlbmVyKFwibG9hZFwiLCBmKTtcclxuXHRcdFx0XHRpbWcucmVtb3ZlRXZlbnRMaXN0ZW5lcihcImxvYWRcIiwgZSk7XHJcblx0XHRcdH07XHJcblx0XHRcdHZhciBlID0gZnVuY3Rpb24oKSB7XHJcblx0XHRcdFx0Y29uc29sZS5lcnJvcihcIkVycm9yIHdoaWxlIGxvYWRpbmcgdGV4dHVyZSFcIiwgaW1nLnNyYyk7XHJcblx0XHRcdFx0dGV4dHVyZS5uZWVkc1VwZGF0ZSA9IHRydWU7IC8vdXBkYXRlIHRoZSBtaXNzaW5nIHRleHR1cmUgcHJlLWxvYWRlZFxyXG5cdFx0XHRcdG1hcC5tYXJrTG9hZEZpbmlzaGVkKFwiUEFSVElDTEVfXCIrc2VsZi5pZCk7XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0aW1nLnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJsb2FkXCIsIGYpO1xyXG5cdFx0XHRcdGltZy5yZW1vdmVFdmVudExpc3RlbmVyKFwibG9hZFwiLCBlKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRpbWcub24oXCJsb2FkXCIsIGYpO1xyXG5cdFx0XHRpbWcub24oXCJlcnJvclwiLCBlKTtcclxuXHRcdFx0XHJcblx0XHRcdGltZy5zcmMgPSB1cmw7XHJcblx0XHR9KTtcclxuXHRcdFxyXG5cdFx0cmV0dXJuIHRoaXMucGFydGljbGVTeXMucGFydGljbGVNZXNoO1xyXG5cdH0sXHJcblx0XHJcblx0b25FdmVudHM6IHtcclxuXHRcdHRpY2s6IGZ1bmN0aW9uKGRlbHRhKSB7XHJcblx0XHRcdC8vIERpc2NhcmQgdGhpcyB0aWNrIHVwZGF0ZSBlbnRpcmVseSBpZiB0aGUgZGVsdGEgaXMgbW9yZSB0aGFuIGEgY2VydGFpbiBhbW91bnRcclxuXHRcdFx0Ly8gQ2hhbmNlcyBhcmUsIHRoZSBicm93c2VyIGhhcyBsaW1pdGVkIG91ciB0aWNrIGNhbGxiYWNrcywgYW5kIG1vcmUgdGhhbiBcclxuXHRcdFx0Ly8gdGhpcyB0aHJlc2hvbGQgd2lsbCBzaW1wbHkgY2F1c2UgdGhlIHBhcnRpY2xlIHN5c3RlbSB0byBnbyBoYXl3aXJlIGFueXdheVxyXG5cdFx0XHRpZiAoZGVsdGEgPiAwLjEpIHJldHVybjtcclxuXHRcdFx0XHJcblx0XHRcdGlmICghdGhpcy5ydW5uaW5nKSB7XHJcblx0XHRcdFx0Ly9FdmVuIGlmIHdlJ3JlIG5vdCBydW5uaW5nIHRoaXMsIHJ1biBpdCB1bnRpbCB0aGUgc3lzdGVtIGlzIG1hdHVyZVxyXG5cdFx0XHRcdGlmICh0aGlzLnBhcnRpY2xlU3lzLmVtaXR0ZXJBZ2UgPiB0aGlzLnBhcnRpY2xlU3lzLnBhcnRpY2xlRGVhdGhBZ2UpXHJcblx0XHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHRcdFx0dGhpcy5wYXJ0aWNsZVN5cy51cGRhdGUoZGVsdGEpO1xyXG5cdFx0fSxcclxuXHR9XHJcbn0pO1xyXG5tb2R1bGUuZXhwb3J0cyA9IFBhcnRpY2xlU3lzdGVtRXZlbnQ7XHJcblxyXG5cclxuLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuLy8gU0hBREVSUyBcclxuXHJcbnZhciBwYXJ0aWNsZVZlcnRleFNoYWRlciA9IFtcclxuXHRcImF0dHJpYnV0ZSB2ZWMzICBjdXN0b21Db2xvcjtcIixcclxuXHRcImF0dHJpYnV0ZSBmbG9hdCBjdXN0b21PcGFjaXR5O1wiLFxyXG5cdFwiYXR0cmlidXRlIGZsb2F0IGN1c3RvbVNpemU7XCIsXHJcblx0XCJhdHRyaWJ1dGUgZmxvYXQgY3VzdG9tQW5nbGU7XCIsXHJcblx0XCJhdHRyaWJ1dGUgZmxvYXQgY3VzdG9tVmlzaWJsZTtcIiwgIC8vIGZsb2F0IHVzZWQgYXMgYm9vbGVhbiAoMCA9IGZhbHNlLCAxID0gdHJ1ZSlcclxuXHRcInZhcnlpbmcgdmVjNCAgdkNvbG9yO1wiLFxyXG5cdFwidmFyeWluZyBmbG9hdCB2QW5nbGU7XCIsXHJcblx0XCJ2b2lkIG1haW4oKVwiLFxyXG5cdFwie1wiLFxyXG5cdFx0XCJpZiAoIGN1c3RvbVZpc2libGUgPiAwLjUgKVwiLCBcdFx0XHRcdC8vIHRydWVcclxuXHRcdFx0XCJ2Q29sb3IgPSB2ZWM0KCBjdXN0b21Db2xvciwgY3VzdG9tT3BhY2l0eSApO1wiLCAvLyAgICAgc2V0IGNvbG9yIGFzc29jaWF0ZWQgdG8gdmVydGV4OyB1c2UgbGF0ZXIgaW4gZnJhZ21lbnQgc2hhZGVyLlxyXG5cdFx0XCJlbHNlXCIsXHRcdFx0XHRcdFx0XHQvLyBmYWxzZVxyXG5cdFx0XHRcInZDb2xvciA9IHZlYzQoMC4wLCAwLjAsIDAuMCwgMC4wKTtcIiwgXHRcdC8vICAgICBtYWtlIHBhcnRpY2xlIGludmlzaWJsZS5cclxuXHRcdFx0XHJcblx0XHRcInZBbmdsZSA9IGN1c3RvbUFuZ2xlO1wiLFxyXG5cclxuXHRcdFwidmVjNCBtdlBvc2l0aW9uID0gbW9kZWxWaWV3TWF0cml4ICogdmVjNCggcG9zaXRpb24sIDEuMCApO1wiLFxyXG5cdFx0XCJnbF9Qb2ludFNpemUgPSBjdXN0b21TaXplICogKCAzMDAuMCAvIGxlbmd0aCggbXZQb3NpdGlvbi54eXogKSApO1wiLCAgICAgLy8gc2NhbGUgcGFydGljbGVzIGFzIG9iamVjdHMgaW4gM0Qgc3BhY2VcclxuXHRcdFwiZ2xfUG9zaXRpb24gPSBwcm9qZWN0aW9uTWF0cml4ICogbXZQb3NpdGlvbjtcIixcclxuXHRcIn1cIlxyXG5dLmpvaW4oXCJcXG5cIik7XHJcblxyXG52YXIgcGFydGljbGVGcmFnbWVudFNoYWRlciA9IFtcclxuXHRcInVuaWZvcm0gc2FtcGxlcjJEIHRleHR1cmU7XCIsXHJcblx0XCJ2YXJ5aW5nIHZlYzQgdkNvbG9yO1wiLCBcdFxyXG5cdFwidmFyeWluZyBmbG9hdCB2QW5nbGU7XCIsICAgXHJcblx0XCJ2b2lkIG1haW4oKVwiLCBcclxuXHRcIntcIixcclxuXHRcdFwiZ2xfRnJhZ0NvbG9yID0gdkNvbG9yO1wiLFxyXG5cdFx0XHJcblx0XHRcImZsb2F0IGMgPSBjb3ModkFuZ2xlKTtcIixcclxuXHRcdFwiZmxvYXQgcyA9IHNpbih2QW5nbGUpO1wiLFxyXG5cdFx0XCJ2ZWMyIHJvdGF0ZWRVViA9IHZlYzIoYyAqICggICAgICBnbF9Qb2ludENvb3JkLnggLSAwLjUpICsgcyAqICgxLjAgLSBnbF9Qb2ludENvb3JkLnkgLSAwLjUpICsgMC41LFwiLCBcclxuXHRcdCAgICAgICAgICAgICAgICAgICAgICBcImMgKiAoMS4wIC0gZ2xfUG9pbnRDb29yZC55IC0gMC41KSAtIHMgKiAoICAgICAgZ2xfUG9pbnRDb29yZC54IC0gMC41KSArIDAuNSk7XCIsICAvLyByb3RhdGUgVVYgY29vcmRpbmF0ZXMgdG8gcm90YXRlIHRleHR1cmVcclxuXHQgICAgXHRcInZlYzQgcm90YXRlZFRleHR1cmUgPSB0ZXh0dXJlMkQoIHRleHR1cmUsICByb3RhdGVkVVYgKTtcIixcclxuXHRcdFwiZ2xfRnJhZ0NvbG9yID0gZ2xfRnJhZ0NvbG9yICogcm90YXRlZFRleHR1cmU7XCIsICAgIC8vIHNldHMgYW4gb3RoZXJ3aXNlIHdoaXRlIHBhcnRpY2xlIHRleHR1cmUgdG8gZGVzaXJlZCBjb2xvclxyXG5cdFwifVwiXHJcbl0uam9pbihcIlxcblwiKTtcclxuXHJcbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHJcbmZ1bmN0aW9uIFR3ZWVuKHRpbWVBcnJheSwgdmFsdWVBcnJheSkge1xyXG5cdHRoaXMudGltZXMgID0gdGltZUFycmF5IHx8IFtdO1xyXG5cdHRoaXMudmFsdWVzID0gdmFsdWVBcnJheSB8fCBbXTtcclxufVxyXG5cclxuVHdlZW4ucHJvdG90eXBlLmxlcnAgPSBmdW5jdGlvbih0KSB7XHJcblx0dmFyIGkgPSAwO1xyXG5cdHZhciBuID0gdGhpcy50aW1lcy5sZW5ndGg7XHJcblx0d2hpbGUgKGkgPCBuICYmIHQgPiB0aGlzLnRpbWVzW2ldKSAgXHJcblx0XHRpKys7XHJcblx0aWYgKGkgPT0gMCkgcmV0dXJuIHRoaXMudmFsdWVzWzBdO1xyXG5cdGlmIChpID09IG4pXHRyZXR1cm4gdGhpcy52YWx1ZXNbbi0xXTtcclxuXHR2YXIgcCA9ICh0IC0gdGhpcy50aW1lc1tpLTFdKSAvICh0aGlzLnRpbWVzW2ldIC0gdGhpcy50aW1lc1tpLTFdKTtcclxuXHRpZiAodGhpcy52YWx1ZXNbMF0gaW5zdGFuY2VvZiBUSFJFRS5WZWN0b3IzKVxyXG5cdFx0cmV0dXJuIHRoaXMudmFsdWVzW2ktMV0uY2xvbmUoKS5sZXJwKCB0aGlzLnZhbHVlc1tpXSwgcCApO1xyXG5cdGVsc2UgLy8gaXRzIGEgZmxvYXRcclxuXHRcdHJldHVybiB0aGlzLnZhbHVlc1tpLTFdICsgcCAqICh0aGlzLnZhbHVlc1tpXSAtIHRoaXMudmFsdWVzW2ktMV0pO1xyXG59XHJcblBhcnRpY2xlU3lzdGVtRXZlbnQuVHdlZW4gPSBUd2VlbjtcclxuUGFydGljbGVTeXN0ZW1FdmVudC5tYWtlVHdlZW4gPSBmdW5jdGlvbih0aW1lLCB2YWwpIHtcclxuXHRyZXR1cm4gbmV3IFR3ZWVuKHRpbWUsIHZhbCk7XHJcbn1cclxuXHJcbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHJcbmZ1bmN0aW9uIFBhcnRpY2xlKCkge1xyXG5cdHRoaXMucG9zaXRpb24gICAgID0gbmV3IFRIUkVFLlZlY3RvcjMoKTtcclxuXHR0aGlzLnZlbG9jaXR5ICAgICA9IG5ldyBUSFJFRS5WZWN0b3IzKCk7IC8vIHVuaXRzIHBlciBzZWNvbmRcclxuXHR0aGlzLmFjY2VsZXJhdGlvbiA9IG5ldyBUSFJFRS5WZWN0b3IzKCk7XHJcblxyXG5cdHRoaXMuYW5nbGUgICAgICAgICAgICAgPSAwO1xyXG5cdHRoaXMuYW5nbGVWZWxvY2l0eSAgICAgPSAwOyAvLyBkZWdyZWVzIHBlciBzZWNvbmRcclxuXHR0aGlzLmFuZ2xlQWNjZWxlcmF0aW9uID0gMDsgLy8gZGVncmVlcyBwZXIgc2Vjb25kLCBwZXIgc2Vjb25kXHJcblx0XHJcblx0dGhpcy5zaXplID0gMS4wO1xyXG5cclxuXHR0aGlzLmNvbG9yICAgPSBuZXcgVEhSRUUuQ29sb3IoKTtcclxuXHR0aGlzLm9wYWNpdHkgPSAxLjA7XHJcblx0XHRcdFxyXG5cdHRoaXMuYWdlICAgPSAwO1xyXG5cdHRoaXMuYWxpdmUgPSAwOyAvLyB1c2UgZmxvYXQgaW5zdGVhZCBvZiBib29sZWFuIGZvciBzaGFkZXIgcHVycG9zZXNcdFxyXG59XHJcbmV4dGVuZChQYXJ0aWNsZS5wcm90b3R5cGUsIHtcclxuXHRzaXplVHdlZW46IG5ldyBUd2VlbigpLFxyXG5cdGNvbG9yVHdlZW46IG5ldyBUd2VlbigpLFxyXG5cdG9wYWNpdHlUd2VlbjogbmV3IFR3ZWVuKCksXHJcblx0XHJcblx0dXBkYXRlIDogZnVuY3Rpb24oZHQpIHtcclxuXHRcdHRoaXMucG9zaXRpb24ueCArPSB0aGlzLnZlbG9jaXR5LnggKiBkdDtcclxuXHRcdHRoaXMucG9zaXRpb24ueSArPSB0aGlzLnZlbG9jaXR5LnkgKiBkdDtcclxuXHRcdHRoaXMucG9zaXRpb24ueiArPSB0aGlzLnZlbG9jaXR5LnogKiBkdDtcclxuXHRcdFxyXG5cdFx0dGhpcy52ZWxvY2l0eS54ICs9IHRoaXMuYWNjZWxlcmF0aW9uLnggKiBkdDtcclxuXHRcdHRoaXMudmVsb2NpdHkueSArPSB0aGlzLmFjY2VsZXJhdGlvbi55ICogZHQ7XHJcblx0XHR0aGlzLnZlbG9jaXR5LnogKz0gdGhpcy5hY2NlbGVyYXRpb24ueiAqIGR0O1xyXG5cdFx0XHJcblx0XHQvLyBjb252ZXJ0IGZyb20gZGVncmVlcyB0byByYWRpYW5zOiAwLjAxNzQ1MzI5MjUxID0gTWF0aC5QSS8xODBcclxuXHRcdHRoaXMuYW5nbGUgICAgICAgICArPSB0aGlzLmFuZ2xlVmVsb2NpdHkgICAgICogMC4wMTc0NTMyOTI1MSAqIGR0O1xyXG5cdFx0dGhpcy5hbmdsZVZlbG9jaXR5ICs9IHRoaXMuYW5nbGVBY2NlbGVyYXRpb24gKiAwLjAxNzQ1MzI5MjUxICogZHQ7XHJcblxyXG5cdFx0dGhpcy5hZ2UgKz0gZHQ7XHJcblx0XHRcclxuXHRcdC8vIGlmIHRoZSB0d2VlbiBmb3IgYSBnaXZlbiBhdHRyaWJ1dGUgaXMgbm9uZW1wdHksXHJcblx0XHQvLyAgdGhlbiB1c2UgaXQgdG8gdXBkYXRlIHRoZSBhdHRyaWJ1dGUncyB2YWx1ZVxyXG5cclxuXHRcdGlmICh0aGlzLnNpemVUd2Vlbi50aW1lcy5sZW5ndGggPiAwKVxyXG5cdFx0XHR0aGlzLnNpemUgPSB0aGlzLnNpemVUd2Vlbi5sZXJwKCB0aGlzLmFnZSApO1xyXG5cdFx0XHRcdFx0XHJcblx0XHRpZiAodGhpcy5jb2xvclR3ZWVuICYmIHRoaXMuY29sb3JUd2Vlbi50aW1lcy5sZW5ndGggPiAwKSB7XHJcblx0XHRcdHZhciBjb2xvckhTTCA9IHRoaXMuY29sb3JUd2Vlbi5sZXJwKCB0aGlzLmFnZSApO1xyXG5cdFx0XHR0aGlzLmNvbG9yLnNldEhTTCggY29sb3JIU0wueCwgY29sb3JIU0wueSwgY29sb3JIU0wueiApO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSBpZiAodGhpcy5jb2xvckhUd2VlbiB8fCB0aGlzLmNvbG9yU1R3ZWVuIHx8IHRoaXMuY29sb3JMVHdlZW4pIHtcclxuXHRcdFx0dmFyIGhzbCA9IHRoaXMuY29sb3IuZ2V0SFNMKCk7XHJcblx0XHRcdGlmICh0aGlzLmNvbG9ySFR3ZWVuICYmIHRoaXMuY29sb3JIVHdlZW4udGltZXMubGVuZ3RoID4gMCkge1xyXG5cdFx0XHRcdGhzbC5oID0gdGhpcy5jb2xvckhUd2Vlbi5sZXJwKCB0aGlzLmFnZSApO1xyXG5cdFx0XHR9XHJcblx0XHRcdGlmICh0aGlzLmNvbG9yU1R3ZWVuICYmIHRoaXMuY29sb3JTVHdlZW4udGltZXMubGVuZ3RoID4gMCkge1xyXG5cdFx0XHRcdGhzbC5zID0gdGhpcy5jb2xvclNUd2Vlbi5sZXJwKCB0aGlzLmFnZSApO1xyXG5cdFx0XHR9XHJcblx0XHRcdGlmICh0aGlzLmNvbG9yTFR3ZWVuICYmIHRoaXMuY29sb3JMVHdlZW4udGltZXMubGVuZ3RoID4gMCkge1xyXG5cdFx0XHRcdGhzbC5sID0gdGhpcy5jb2xvckxUd2Vlbi5sZXJwKCB0aGlzLmFnZSApO1xyXG5cdFx0XHR9XHJcblx0XHRcdHRoaXMuY29sb3Iuc2V0SFNMKCBoc2wuaCwgaHNsLnMsIGhzbC5sICk7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdFxyXG5cdFx0aWYgKHRoaXMub3BhY2l0eVR3ZWVuLnRpbWVzLmxlbmd0aCA+IDApXHJcblx0XHRcdHRoaXMub3BhY2l0eSA9IHRoaXMub3BhY2l0eVR3ZWVuLmxlcnAoIHRoaXMuYWdlICk7XHJcblx0fVxyXG59KTtcclxuXHJcblxyXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblxyXG5mdW5jdGlvbiBQYXJ0aWNsZUVuZ2luZSgpIHtcclxuXHR0aGlzLnBhcnRpY2xlQXJyYXkgPSBbXTtcclxuXHRcclxuXHR0aGlzLnBhcnRpY2xlR2VvbWV0cnkgPSBuZXcgVEhSRUUuR2VvbWV0cnkoKTtcclxuXHR0aGlzLnBhcnRpY2xlVGV4dHVyZSA9IG5ldyBUSFJFRS5UZXh0dXJlKCk7XHJcblx0dGhpcy5wYXJ0aWNsZU1hdGVyaWFsID0gbmV3IFRIUkVFLlNoYWRlck1hdGVyaWFsKCBcclxuXHR7XHJcblx0XHR1bmlmb3JtczogXHJcblx0XHR7XHJcblx0XHRcdHRleHR1cmU6ICAgeyB0eXBlOiBcInRcIiwgdmFsdWU6IHRoaXMucGFydGljbGVUZXh0dXJlIH0sXHJcblx0XHR9LFxyXG5cdFx0YXR0cmlidXRlczogICAgIFxyXG5cdFx0e1xyXG5cdFx0XHRjdXN0b21WaXNpYmxlOlx0eyB0eXBlOiAnZicsICB2YWx1ZTogW10gfSxcclxuXHRcdFx0Y3VzdG9tQW5nbGU6XHR7IHR5cGU6ICdmJywgIHZhbHVlOiBbXSB9LFxyXG5cdFx0XHRjdXN0b21TaXplOlx0XHR7IHR5cGU6ICdmJywgIHZhbHVlOiBbXSB9LFxyXG5cdFx0XHRjdXN0b21Db2xvcjpcdHsgdHlwZTogJ2MnLCAgdmFsdWU6IFtdIH0sXHJcblx0XHRcdGN1c3RvbU9wYWNpdHk6XHR7IHR5cGU6ICdmJywgIHZhbHVlOiBbXSB9XHJcblx0XHR9LFxyXG5cdFx0dmVydGV4U2hhZGVyOiAgIHBhcnRpY2xlVmVydGV4U2hhZGVyLFxyXG5cdFx0ZnJhZ21lbnRTaGFkZXI6IHBhcnRpY2xlRnJhZ21lbnRTaGFkZXIsXHJcblx0XHR0cmFuc3BhcmVudDogdHJ1ZSwgLy9hbHBoYVRlc3Q6IDAuNSwgIC8vIGlmIGhhdmluZyB0cmFuc3BhcmVuY3kgaXNzdWVzLCB0cnkgaW5jbHVkaW5nOiBhbHBoYVRlc3Q6IDAuNSwgXHJcblx0XHRibGVuZGluZzogVEhSRUUuTm9ybWFsQmxlbmRpbmcsIGRlcHRoVGVzdDogdHJ1ZSxcclxuXHRcdFxyXG5cdH0pO1xyXG59XHJcbmV4dGVuZChQYXJ0aWNsZUVuZ2luZS5wcm90b3R5cGUsIHtcclxuXHRibGVuZFN0eWxlOiBUSFJFRS5Ob3JtYWxCbGVuZGluZyxcclxuXHRcclxuXHRwYXJlbnRFdmVudDogbnVsbCxcclxuXHRcclxuXHRwYXJ0aWNsZUFycmF5OiBudWxsLFxyXG5cdHBhcnRpY2xlc1BlclNlY29uZDogMTAwLFxyXG5cdHBhcnRpY2xlRGVhdGhBZ2U6IDEuMCxcclxuXHRwYXJ0aWNsZUNvdW50OiAwLCAvLyBIb3cgbWFueSBwYXJ0aWNsZXMgY291bGQgYmUgYWN0aXZlIGF0IGFueSB0aW1lP1xyXG5cdFxyXG5cdGVtaXR0ZXJBZ2UgOiAwLjAsXHJcblx0ZW1pdHRlckNyZWF0ZWQ6IDAsIC8vbnVtYmVyIG9mIHBhcnRpY2xlcyBlbWl0ZWQgaW4gdGhpcyBzeXN0ZW0ncyBsaWZldGltZVxyXG5cdGVtaXR0ZXJBbGl2ZSA6IHRydWUsXHJcblx0XHJcblx0cGFydGljbGVHZW9tZXRyeTogbnVsbCxcclxuXHRwYXJ0aWNsZVRleHR1cmU6IG51bGwsXHJcblx0cGFydGljbGVNYXRlcmlhbDogbnVsbCxcclxuXHRwYXJ0aWNsZU1lc2g6IG51bGwsXHJcblx0XHJcblx0cmFuZG9tVmFsdWU6IGZ1bmN0aW9uKGJhc2UsIHNwcmVhZCl7XHJcblx0XHRyZXR1cm4gYmFzZSArIHNwcmVhZCAqIChNYXRoLnJhbmRvbSgpIC0gMC41KTtcclxuXHR9LFxyXG5cdHJhbmRvbVZlY3RvcjMgOiBmdW5jdGlvbihiYXNlLCBzcHJlYWQpIHtcclxuXHRcdHZhciByYW5kMyA9IG5ldyBUSFJFRS5WZWN0b3IzKCBNYXRoLnJhbmRvbSgpIC0gMC41LCBNYXRoLnJhbmRvbSgpIC0gMC41LCBNYXRoLnJhbmRvbSgpIC0gMC41ICk7XHJcblx0XHRyZXR1cm4gbmV3IFRIUkVFLlZlY3RvcjMoKS5hZGRWZWN0b3JzKCBiYXNlLCBuZXcgVEhSRUUuVmVjdG9yMygpLm11bHRpcGx5VmVjdG9ycyggc3ByZWFkLCByYW5kMyApICk7XHJcblx0fSxcclxuXHRcclxuXHQvLyBOb3RlOiBUaGlzIG1ldGhvZCBpcyBtZWFudCB0byBiZSByZXBsYWNlZFxyXG5cdG5ld1BhcnRpY2xlOiBmdW5jdGlvbihwKSB7fSxcclxuXHRcclxuXHRpbml0aWFsaXplIDogZnVuY3Rpb24oKSB7XHJcblx0XHR0aGlzLnBhcnRpY2xlQ291bnQgPSB0aGlzLnBhcnRpY2xlc1BlclNlY29uZCAqICh0aGlzLnBhcnRpY2xlRGVhdGhBZ2UgKyAwLjUpO1xyXG5cdFx0XHJcblx0XHQvLyBsaW5rIHBhcnRpY2xlIGRhdGEgd2l0aCBnZW9tZXRyeS9tYXRlcmlhbCBkYXRhXHJcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMucGFydGljbGVDb3VudDsgaSsrKVxyXG5cdFx0e1xyXG5cdFx0XHQvLyByZW1vdmUgZHVwbGljYXRlIGNvZGUgc29tZWhvdywgaGVyZSBhbmQgaW4gdXBkYXRlIGZ1bmN0aW9uIGJlbG93LlxyXG5cdFx0XHR0aGlzLnBhcnRpY2xlQXJyYXlbaV0gPSBuZXcgUGFydGljbGUoKTtcclxuXHRcdFx0dGhpcy5wYXJ0aWNsZUdlb21ldHJ5LnZlcnRpY2VzW2ldID0gdGhpcy5wYXJ0aWNsZUFycmF5W2ldLnBvc2l0aW9uO1xyXG5cdFx0XHR0aGlzLnBhcnRpY2xlTWF0ZXJpYWwuYXR0cmlidXRlcy5jdXN0b21WaXNpYmxlLnZhbHVlW2ldID0gdGhpcy5wYXJ0aWNsZUFycmF5W2ldLmFsaXZlO1xyXG5cdFx0XHR0aGlzLnBhcnRpY2xlTWF0ZXJpYWwuYXR0cmlidXRlcy5jdXN0b21Db2xvci52YWx1ZVtpXSAgID0gdGhpcy5wYXJ0aWNsZUFycmF5W2ldLmNvbG9yO1xyXG5cdFx0XHR0aGlzLnBhcnRpY2xlTWF0ZXJpYWwuYXR0cmlidXRlcy5jdXN0b21PcGFjaXR5LnZhbHVlW2ldID0gdGhpcy5wYXJ0aWNsZUFycmF5W2ldLm9wYWNpdHk7XHJcblx0XHRcdHRoaXMucGFydGljbGVNYXRlcmlhbC5hdHRyaWJ1dGVzLmN1c3RvbVNpemUudmFsdWVbaV0gICAgPSB0aGlzLnBhcnRpY2xlQXJyYXlbaV0uc2l6ZTtcclxuXHRcdFx0dGhpcy5wYXJ0aWNsZU1hdGVyaWFsLmF0dHJpYnV0ZXMuY3VzdG9tQW5nbGUudmFsdWVbaV0gICA9IHRoaXMucGFydGljbGVBcnJheVtpXS5hbmdsZTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0dGhpcy5wYXJ0aWNsZU1hdGVyaWFsLmJsZW5kaW5nID0gdGhpcy5ibGVuZFN0eWxlO1xyXG5cdFx0Ly8gaWYgKCB0aGlzLmJsZW5kU3R5bGUgIT0gVEhSRUUuTm9ybWFsQmxlbmRpbmcpIFxyXG5cdFx0Ly8gXHR0aGlzLnBhcnRpY2xlTWF0ZXJpYWwuZGVwdGhUZXN0ID0gZmFsc2U7XHJcblx0XHRcclxuXHRcdHRoaXMucGFydGljbGVNZXNoID0gbmV3IFRIUkVFLlBvaW50Q2xvdWQoIHRoaXMucGFydGljbGVHZW9tZXRyeSwgdGhpcy5wYXJ0aWNsZU1hdGVyaWFsICk7XHJcblx0XHR0aGlzLnBhcnRpY2xlTWVzaC5zb3J0UGFydGljbGVzID0gdHJ1ZTtcclxuXHRcdC8vIGlmICggdGhpcy5ibGVuZFN0eWxlID09IFRIUkVFLk5vcm1hbEJsZW5kaW5nKSBcclxuXHRcdFx0dGhpcy5wYXJ0aWNsZU1lc2gucmVuZGVyRGVwdGggPSAtODA7XHJcblx0XHQvLyBzY2VuZS5hZGQoIHRoaXMucGFydGljbGVNZXNoICk7XHJcblx0fSxcclxuXHRcclxuXHR1cGRhdGUgOiBmdW5jdGlvbihkdCkge1xyXG5cdFx0dmFyIHJlY3ljbGVJbmRpY2VzID0gW107XHJcblx0XHRcclxuXHRcdHZhciBudW1OZXdQYXJ0aWNsZXMgPSBcclxuXHRcdFx0TWF0aC5mbG9vcih0aGlzLnBhcnRpY2xlc1BlclNlY29uZCAqICh0aGlzLmVtaXR0ZXJBZ2UgKyBkdCkpIC0gdGhpcy5lbWl0dGVyQ3JlYXRlZDtcclxuXHRcdFx0Ly8gTWF0aC5mbG9vcih0aGlzLnBhcnRpY2xlc1BlclNlY29uZCAqICh0aGlzLmVtaXR0ZXJBZ2UgKyBkdCkpIC1cclxuXHRcdFx0Ly8gTWF0aC5mbG9vcih0aGlzLnBhcnRpY2xlc1BlclNlY29uZCAqICh0aGlzLmVtaXR0ZXJBZ2UgKyAwKSk7XHJcblx0XHRcclxuXHRcdC8vIHVwZGF0ZSBwYXJ0aWNsZSBkYXRhXHJcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMucGFydGljbGVDb3VudDsgaSsrKVxyXG5cdFx0e1xyXG5cdFx0XHRpZiAoIHRoaXMucGFydGljbGVBcnJheVtpXS5hbGl2ZSApXHJcblx0XHRcdHtcclxuXHRcdFx0XHR0aGlzLnBhcnRpY2xlQXJyYXlbaV0udXBkYXRlKGR0KTtcclxuXHJcblx0XHRcdFx0Ly8gY2hlY2sgaWYgcGFydGljbGUgc2hvdWxkIGV4cGlyZVxyXG5cdFx0XHRcdC8vIGNvdWxkIGFsc28gdXNlOiBkZWF0aCBieSBzaXplPDAgb3IgYWxwaGE8MC5cclxuXHRcdFx0XHRpZiAodGhpcy5wYXJ0aWNsZUFycmF5W2ldLmFnZSA+IHRoaXMucGFydGljbGVEZWF0aEFnZVxyXG5cdFx0XHRcdFx0fHwgKHRoaXMucGFyZW50RXZlbnQua2lsbGluZ0Zsb29yICYmIHRoaXMucGFydGljbGVBcnJheVtpXS5wb3NpdGlvbi55IDwgdGhpcy5wYXJlbnRFdmVudC5raWxsaW5nRmxvb3IpKSBcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHR0aGlzLnBhcnRpY2xlQXJyYXlbaV0uYWxpdmUgPSAwLjA7XHJcblx0XHRcdFx0XHRpZiAodGhpcy5lbWl0dGVyQWxpdmUgJiYgcmVjeWNsZUluZGljZXMubGVuZ3RoIDwgbnVtTmV3UGFydGljbGVzKVxyXG5cdFx0XHRcdFx0XHRyZWN5Y2xlSW5kaWNlcy5wdXNoKGkpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHQvLyB1cGRhdGUgcGFydGljbGUgcHJvcGVydGllcyBpbiBzaGFkZXJcclxuXHRcdFx0XHR0aGlzLnBhcnRpY2xlTWF0ZXJpYWwuYXR0cmlidXRlcy5jdXN0b21WaXNpYmxlLnZhbHVlW2ldID0gdGhpcy5wYXJ0aWNsZUFycmF5W2ldLmFsaXZlO1xyXG5cdFx0XHRcdHRoaXMucGFydGljbGVNYXRlcmlhbC5hdHRyaWJ1dGVzLmN1c3RvbUNvbG9yLnZhbHVlW2ldICAgPSB0aGlzLnBhcnRpY2xlQXJyYXlbaV0uY29sb3I7XHJcblx0XHRcdFx0dGhpcy5wYXJ0aWNsZU1hdGVyaWFsLmF0dHJpYnV0ZXMuY3VzdG9tT3BhY2l0eS52YWx1ZVtpXSA9IHRoaXMucGFydGljbGVBcnJheVtpXS5vcGFjaXR5O1xyXG5cdFx0XHRcdHRoaXMucGFydGljbGVNYXRlcmlhbC5hdHRyaWJ1dGVzLmN1c3RvbVNpemUudmFsdWVbaV0gICAgPSB0aGlzLnBhcnRpY2xlQXJyYXlbaV0uc2l6ZTtcclxuXHRcdFx0XHR0aGlzLnBhcnRpY2xlTWF0ZXJpYWwuYXR0cmlidXRlcy5jdXN0b21BbmdsZS52YWx1ZVtpXSAgID0gdGhpcy5wYXJ0aWNsZUFycmF5W2ldLmFuZ2xlO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdGlmICh0aGlzLmVtaXR0ZXJBbGl2ZSAmJiByZWN5Y2xlSW5kaWNlcy5sZW5ndGggPCBudW1OZXdQYXJ0aWNsZXMpXHJcblx0XHRcdFx0XHRyZWN5Y2xlSW5kaWNlcy5wdXNoKGkpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gY2hlY2sgaWYgcGFydGljbGUgZW1pdHRlciBpcyBzdGlsbCBydW5uaW5nXHJcblx0XHRpZiAoICF0aGlzLmVtaXR0ZXJBbGl2ZSApIHJldHVybjtcclxuXHJcblx0XHQvLyBhY3RpdmF0ZSBwYXJ0aWNsZXNcclxuXHRcdGZvciAodmFyIGogPSAwOyBqIDwgcmVjeWNsZUluZGljZXMubGVuZ3RoOyBqKyspXHJcblx0XHR7XHJcblx0XHRcdHZhciBpID0gcmVjeWNsZUluZGljZXNbal07XHJcblx0XHRcdHRoaXMucGFyZW50RXZlbnQubmV3UGFydGljbGUodGhpcy5wYXJ0aWNsZUFycmF5W2ldLCB0aGlzLnJhbmRvbVZhbHVlKTsgLy9wb3NpdGlvbnMgYSBuZXcgcGFydGljbGVcclxuXHRcdFx0dGhpcy5wYXJ0aWNsZUFycmF5W2ldLmFnZSA9IDA7XHJcblx0XHRcdHRoaXMucGFydGljbGVBcnJheVtpXS5hbGl2ZSA9IDEuMDsgLy8gYWN0aXZhdGUgcmlnaHQgYXdheVxyXG5cdFx0XHR0aGlzLnBhcnRpY2xlR2VvbWV0cnkudmVydGljZXNbaV0gPSB0aGlzLnBhcnRpY2xlQXJyYXlbaV0ucG9zaXRpb247XHJcblx0XHRcdHRoaXMuZW1pdHRlckNyZWF0ZWQrKztcclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLmVtaXR0ZXJBZ2UgKz0gZHQ7XHJcblx0XHRpZiAoKHRoaXMuZW1pdHRlckFnZSA+IHRoaXMucGFydGljbGVEZWF0aEFnZSkpIHtcclxuXHRcdFx0Ly8gY29uc29sZS5sb2coXCJCT1VORElORyBSRVNJWkVcIik7XHJcblx0XHRcdHRoaXMucGFydGljbGVHZW9tZXRyeS5jb21wdXRlQm91bmRpbmdCb3goKTtcclxuXHRcdFx0dGhpcy5wYXJ0aWNsZUdlb21ldHJ5LmNvbXB1dGVCb3VuZGluZ1NwaGVyZSgpO1xyXG5cdFx0fVxyXG5cdH1cclxufSk7XHJcblxyXG5cclxuXHJcblxyXG4iLCIvLyBwbGF5ZXItY2hhcmFjdGVyLmpzXHJcbi8vIERlZmluZXMgdGhlIGNvbmNyZXRlIGNvZGUgZm9yIGEgUGxheWVyIENoYXJhY3RlciBpbiB0aGUgd29ybGRcclxuXHJcbnZhciBBY3RvciA9IHJlcXVpcmUoXCJ0cHAtYWN0b3JcIik7XHJcbnZhciBjb250cm9sbGVyID0gcmVxdWlyZShcInRwcC1jb250cm9sbGVyXCIpO1xyXG52YXIgaW5oZXJpdHMgPSByZXF1aXJlKFwiaW5oZXJpdHNcIik7XHJcbnZhciBleHRlbmQgPSByZXF1aXJlKFwiZXh0ZW5kXCIpO1xyXG5cclxudmFyIEVWRU5UX1BMQU5FX05PUk1BTCA9IG5ldyBUSFJFRS5WZWN0b3IzKDAsIDEsIDApO1xyXG5cclxuLyoqXHJcbiAqL1xyXG5mdW5jdGlvbiBQbGF5ZXJDaGFyKCl7XHJcblx0QWN0b3IuY2FsbCh0aGlzLCB7fSwge30pO1xyXG5cdFxyXG5cdHRoaXMub24oXCJ0aWNrXCIsIHRoaXMuY29udHJvbENoYXJhY3Rlcik7XHJcblx0dGhpcy5vbihcImNhbnQtbW92ZVwiLCB0aGlzLmFuaW1hdGVCdW1wKTtcclxuXHR0aGlzLm9uKFwiY2hhbmdlLWxheWVyXCIsIHRoaXMuY2hhbmdlZExheWVyKTtcclxufVxyXG5pbmhlcml0cyhQbGF5ZXJDaGFyLCBBY3Rvcik7XHJcbmV4dGVuZChQbGF5ZXJDaGFyLnByb3RvdHlwZSwge1xyXG5cdGlkIDogXCJQTEFZRVJDSEFSXCIsXHJcblx0bG9jYXRpb24gOiBuZXcgVEhSRUUuVmVjdG9yMygpLFxyXG5cdFxyXG5cdHNwcml0ZTogbnVsbCxcclxuXHRcclxuXHRyZXNldCA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0dGhpcy5sb2NhdGlvbi5zZXQoMCwgMCwgMCk7XHJcblx0fSxcclxuXHRcclxuXHR3YXJwQXdheSA6IGZ1bmN0aW9uKGFuaW1UeXBlKSB7XHJcblx0XHRjb25zb2xlLndhcm4oXCJ3YXJwQXdheSBpcyBub3QgeWV0IGltcGxlbWVudGVkIVwiKTtcclxuXHR9LFxyXG5cdFxyXG5cdHdhcnBUbyA6IGZ1bmN0aW9uKHdhcnBkZWYpIHtcclxuXHRcdHZhciBzZWxmID0gdGhpcztcclxuXHRcdGN1cnJlbnRNYXAuZXZlbnRNYXAucmVtb3ZlKHRoaXMubG9jYXRpb24ueCwgdGhpcy5sb2NhdGlvbi55LCB0aGlzKTtcclxuXHRcdFxyXG5cdFx0dGhpcy5sb2NhdGlvbi5zZXQod2FycGRlZi5sb2NbMF0sIHdhcnBkZWYubG9jWzFdLCB3YXJwZGVmLmxheWVyKTtcclxuXHRcdFxyXG5cdFx0aWYgKHdhcnBkZWYuYW5pbSlcclxuXHRcdFx0Y29udHJvbGxlci5wdXNoSW5wdXRDb250ZXh0KFwiY3V0c2NlbmVcIik7XHJcblx0XHQvL1RPRE8gd2FycGRlZi5hbmltXHJcblx0XHRcclxuXHRcdGlmICh3YXJwZGVmLmNhbWVyYSkgeyBcclxuXHRcdFx0Y3VycmVudE1hcC5jaGFuZ2VDYW1lcmEod2FycGRlZi5jYW1lcmEpOyBcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0c2V0VGltZW91dChmdW5jdGlvbigpe1xyXG5cdFx0XHRzd2l0Y2goTnVtYmVyKHdhcnBkZWYuYW5pbSkpIHsgLy9XYXJwIGFuaW1hdGlvblxyXG5cdFx0XHRcdGNhc2UgMTogc2VsZi5hdmF0YXJfbm9kZS5wb3NpdGlvbi56ICs9IDE7IGJyZWFrOyAvLyBXYWxrIHVwXHJcblx0XHRcdFx0Y2FzZSAyOiBzZWxmLmF2YXRhcl9ub2RlLnBvc2l0aW9uLnogLT0gMTsgYnJlYWs7IC8vIFdhbGsgZG93blxyXG5cdFx0XHRcdGNhc2UgMzogc2VsZi5hdmF0YXJfbm9kZS5wb3NpdGlvbi54IC09IDE7IGJyZWFrOyAvLyBXYWxrIGxlZnRcclxuXHRcdFx0XHRjYXNlIDQ6IHNlbGYuYXZhdGFyX25vZGUucG9zaXRpb24ueCArPSAxOyBicmVhazsgLy8gV2FsayBkb3duXHJcblx0XHRcdFx0Y2FzZSA1OiBzZWxmLmF2YXRhcl9ub2RlLnBvc2l0aW9uLnkgKz0gMTU7IGJyZWFrOyAvLyBXYXJwIGluXHJcblx0XHRcdH1cclxuXHRcdH0sIDApO1xyXG5cdFx0XHJcblx0XHRjdXJyZW50TWFwLnF1ZXVlRm9yTWFwU3RhcnQoZnVuY3Rpb24oKXtcclxuXHRcdFx0Y29uc29sZS5sb2coXCJXQVJQIERFRlwiLCB3YXJwZGVmKTtcclxuXHRcdFx0dmFyIGFuaW1OYW1lID0gbnVsbDtcclxuXHRcdFx0dmFyIHggPSBzZWxmLmxvY2F0aW9uLng7XHJcblx0XHRcdHZhciB5ID0gc2VsZi5sb2NhdGlvbi55O1xyXG5cdFx0XHR2YXIgbGF5ZXIgPSBzZWxmLmxvY2F0aW9uLno7XHJcblx0XHRcdHZhciB5X29mZiA9IDA7XHJcblx0XHRcdHZhciBtc3BkID0gMSwgYXNwZCA9IDE7IC8vbW92ZW1lbnQgc3BlZWQsIGFuaW1hdGlvbiBzcGVlZFxyXG5cdFx0XHR2YXIgYW5pbUVuZEV2ZW50ID0gXCJtb3ZlZFwiO1xyXG5cdFx0XHRcclxuXHRcdFx0c3dpdGNoKE51bWJlcih3YXJwZGVmLmFuaW0pKSB7IC8vV2FycCBhbmltYXRpb25cclxuXHRcdFx0XHRjYXNlIDA6IGJyZWFrOyAvLyBBcHBlYXJcclxuXHRcdFx0XHRjYXNlIDE6IHkrKzsgYW5pbU5hbWUgPSBcIndhbGtcIjsgbXNwZCA9IDAuMzU7IGFzcGQgPSAwLjM1OyBicmVhazsgLy8gV2FsayB1cFxyXG5cdFx0XHRcdGNhc2UgMjogeS0tOyBhbmltTmFtZSA9IFwid2Fsa1wiOyBtc3BkID0gMC4zNTsgYXNwZCA9IDAuMzU7IGJyZWFrOyAvLyBXYWxrIGRvd25cclxuXHRcdFx0XHRjYXNlIDM6IHgtLTsgYW5pbU5hbWUgPSBcIndhbGtcIjsgbXNwZCA9IDAuMzU7IGFzcGQgPSAwLjM1OyBicmVhazsgLy8gV2FsayBsZWZ0XHJcblx0XHRcdFx0Y2FzZSA0OiB4Kys7IGFuaW1OYW1lID0gXCJ3YWxrXCI7IG1zcGQgPSAwLjM1OyBhc3BkID0gMC4zNTsgYnJlYWs7IC8vIFdhbGsgZG93blxyXG5cdFx0XHRcdGNhc2UgNTogLy8gV2FycCBpblxyXG5cdFx0XHRcdFx0YW5pbU5hbWUgPSBcIndhcnBfaW5cIjsgXHJcblx0XHRcdFx0XHR5X29mZiA9IDE1OyBhbmltRW5kRXZlbnQgPSBcImFuaW0tZW5kXCI7XHJcblx0XHRcdFx0XHRtc3BkID0gMC4yNTsgYXNwZCA9IDE7IFxyXG5cdFx0XHRcdFx0YnJlYWs7IFxyXG5cdFx0XHRcdGRlZmF1bHQ6IFxyXG5cdFx0XHRcdFx0Y29uc29sZS53YXJuKFwiSUxMRUdBTCBXQVJQIEFOSU1BVElPTjpcIiwgd2FycGRlZi5hbmltKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0dmFyIHNyYyA9IHNlbGYubG9jYXRpb247XHJcblx0XHRcdHZhciBzdGF0ZSA9IHNlbGYuX2luaXRQYXRoaW5nU3RhdGUoKTtcclxuXHRcdFx0XHJcblx0XHRcdGlmIChzcmMueC14IHx8IHktc3JjLnkpIFxyXG5cdFx0XHRcdHNlbGYuZmFjaW5nLnNldCh4LXNyYy54LCAwLCBzcmMueS15KTtcclxuXHRcdFx0ZWxzZVxyXG5cdFx0XHRcdHNlbGYuZmFjaW5nLnNldCgwLCAwLCAxKTtcclxuXHRcdFx0XHJcblx0XHRcdHN0YXRlLnNyY0xvY0Muc2V0KHgsIHksIGxheWVyKTtcclxuXHRcdFx0c3RhdGUuc3JjTG9jMy5zZXQoY3VycmVudE1hcC5nZXQzRFRpbGVMb2NhdGlvbih4LCB5LCBsYXllcikpLnkgKz0geV9vZmY7XHJcblx0XHRcdHN0YXRlLmRlc3RMb2NDLnNldChzcmMpO1xyXG5cdFx0XHRzdGF0ZS5kZXN0TG9jMy5zZXQoY3VycmVudE1hcC5nZXQzRFRpbGVMb2NhdGlvbihzcmMpKTtcclxuXHRcdFx0c3RhdGUuZGVsdGEgPSAwO1xyXG5cdFx0XHRzdGF0ZS5tb3ZpbmcgPSB0cnVlO1xyXG5cdFx0XHRzdGF0ZS5zcGVlZCA9IG1zcGQ7XHJcblx0XHRcdFxyXG5cdFx0XHRzZWxmLnBsYXlBbmltYXRpb24oYW5pbU5hbWUsIHsgc3BlZWQ6IGFzcGQgfSk7XHJcblx0XHRcdHNlbGYub25jZShhbmltRW5kRXZlbnQsIGZ1bmN0aW9uKGFuaW1hdGlvbk5hbWUpe1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKFwiUG9wIVwiKTtcclxuXHRcdFx0XHRjb250cm9sbGVyLnBvcElucHV0Q29udGV4dChcImN1dHNjZW5lXCIpO1xyXG5cdFx0XHR9KTtcclxuXHRcdFx0c2VsZi5lbWl0KFwibW92aW5nXCIsIHN0YXRlLnNyY0xvY0MueCwgc3RhdGUuc3JjTG9jQy55LCBzdGF0ZS5kZXN0TG9jQy54LCBzdGF0ZS5kZXN0TG9jQy55KTtcclxuXHRcdFx0Ly9zZWxmLmF2YXRhcl9ub2RlLnBvc2l0aW9uLnNldCggY3VycmVudE1hcC5nZXQzRFRpbGVMb2NhdGlvbihzZWxmLmxvY2F0aW9uKSApO1xyXG5cdFx0XHRcclxuXHRcdH0pO1xyXG5cdH0sXHJcblx0XHJcblx0Y29udHJvbFRpbWVvdXQ6IDAuMCxcclxuXHRjb250cm9sTGFzdE9yaWVudGF0aW9uOiB7IG9yOiBudWxsLCB4OjAsIHk6MCB9LFxyXG5cdGNvbnRyb2xDaGFyYWN0ZXIgOiBmdW5jdGlvbihkZWx0YSkge1xyXG5cdFx0dmFyIHkgPSAoKGNvbnRyb2xsZXIuaXNEb3duKFwiVXBcIiwgXCJnYW1lXCIpKT8gLTE6MCkgKyAoKGNvbnRyb2xsZXIuaXNEb3duKFwiRG93blwiLCBcImdhbWVcIikpPyAxOjApO1xyXG5cdFx0dmFyIHggPSAoKGNvbnRyb2xsZXIuaXNEb3duKFwiTGVmdFwiLCBcImdhbWVcIikpPyAtMTowKSArICgoY29udHJvbGxlci5pc0Rvd24oXCJSaWdodFwiLCBcImdhbWVcIikpPyAxOjApO1xyXG5cdFx0XHJcblx0XHRpZiAoY29udHJvbGxlci5pc0Rvd25PbmNlKFwiSW50ZXJhY3RcIiwgXCJnYW1lXCIpICYmICF0aGlzLl9pbml0UGF0aGluZ1N0YXRlKCkubW92aW5nKSB7XHJcblx0XHRcdGN1cnJlbnRNYXAuZGlzcGF0Y2goXHJcblx0XHRcdFx0dGhpcy5sb2NhdGlvbi54IC0gdGhpcy5mYWNpbmcueCwgdGhpcy5sb2NhdGlvbi55ICsgdGhpcy5mYWNpbmcueiwgXHJcblx0XHRcdFx0XCJpbnRlcmFjdGVkXCIsIHRoaXMuZmFjaW5nKTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0dmFyIHJ1biA9IGNvbnRyb2xsZXIuaXNEb3duKFwiUnVuXCIsIFwiZ2FtZVwiKTtcclxuXHRcdFxyXG5cdFx0dmFyIGNsbyA9IHRoaXMuY29udHJvbExhc3RPcmllbnRhdGlvbjtcclxuXHRcdGlmIChjbG8ueCAhPSB4IHx8IGNsby55ICE9IHkpIHtcclxuXHRcdFx0Y2xvLm9yID0gbnVsbDtcclxuXHRcdFx0Y2xvLnggPSB4OyBjbG8ueSA9IHk7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdGlmICgoeSB8fCB4KSAmJiAhKHggJiYgeSkpIHsgLy9vbmUsIGJ1dCBub3QgYm90aFxyXG5cdFx0XHRcclxuXHRcdFx0Y2xvLm9yID0gY2xvLm9yIHx8IGdldENhbURpcigpO1xyXG5cdFx0XHRcclxuXHRcdFx0c3dpdGNoIChjbG8ub3IpIHtcclxuXHRcdFx0XHRjYXNlIFwiblwiOiBicmVhazsgLy9kbyBub3RoaW5nXHJcblx0XHRcdFx0Y2FzZSBcInNcIjogeCA9IC14OyB5ID0gLXk7IGJyZWFrO1xyXG5cdFx0XHRcdGNhc2UgXCJ3XCI6IFxyXG5cdFx0XHRcdFx0dmFyIHQgPSB4OyB4ID0gLXk7IHkgPSB0O1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0Y2FzZSBcImVcIjogXHJcblx0XHRcdFx0XHR2YXIgdCA9IHg7IHggPSB5OyB5ID0gLXQ7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0XHJcblx0XHRcdGlmICh0aGlzLmNvbnRyb2xUaW1lb3V0IDwgQ09ORklHLnRpbWVvdXQud2Fsa0NvbnRyb2wpIHtcclxuXHRcdFx0XHR0aGlzLmNvbnRyb2xUaW1lb3V0ICs9IGRlbHRhO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdGlmICghdGhpcy5faW5pdFBhdGhpbmdTdGF0ZSgpLm1vdmluZykge1xyXG5cdFx0XHRcdFx0dGhpcy5mYWNlRGlyKHgsIHkpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRpZiAoIXRoaXMuX2luaXRQYXRoaW5nU3RhdGUoKS5tb3ZpbmcpIHtcclxuXHRcdFx0XHRcdHRoaXMubW92ZVRvKHRoaXMubG9jYXRpb24ueCt4LCB0aGlzLmxvY2F0aW9uLnkreSwge1xyXG5cdFx0XHRcdFx0XHRzcGVlZDogKHJ1bik/IDIgOiAxLFxyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHQvL1RoaXMgbWFrZXMgaXQgc28geW91IGNhbiB0YXAgYSBkaXJlY3Rpb24gdG8gZmFjZSwgaW5zdGVhZCBvZiBqdXN0IGFsd2F5cyB3YWxraW5nIGluIHNhaWQgZGlyZWN0aW9uXHJcblx0XHRcdGlmICh0aGlzLmNvbnRyb2xUaW1lb3V0ID4gMClcclxuXHRcdFx0XHR0aGlzLmNvbnRyb2xUaW1lb3V0IC09IENPTkZJRy50aW1lb3V0LndhbGtDb250cm9sICogZGVsdGE7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdHJldHVybjtcclxuXHRcdFxyXG5cdFx0ZnVuY3Rpb24gZ2V0Q2FtRGlyKCkge1xyXG5cdFx0XHRpZiAoIWN1cnJlbnRNYXAgfHwgIWN1cnJlbnRNYXAuY2FtZXJhKSByZXR1cm4gXCJuXCI7XHJcblx0XHRcdFxyXG5cdFx0XHR2YXIgZGlydmVjdG9yID0gbmV3IFRIUkVFLlZlY3RvcjMoMCwgMCwgMSk7XHJcblx0XHRcdGRpcnZlY3Rvci5hcHBseVF1YXRlcm5pb24oIGN1cnJlbnRNYXAuY2FtZXJhLnF1YXRlcm5pb24gKTtcclxuXHRcdFx0ZGlydmVjdG9yLnByb2plY3RPblBsYW5lKEVWRU5UX1BMQU5FX05PUk1BTCkubm9ybWFsaXplKCk7XHJcblx0XHRcdFxyXG5cdFx0XHR2YXIgeCA9IGRpcnZlY3Rvci54LCB5ID0gZGlydmVjdG9yLno7XHJcblx0XHRcdC8vIGNvbnNvbGUubG9nKFwiRElSRkFDSU5HOlwiLCB4LCB5KTtcclxuXHRcdFx0aWYgKE1hdGguYWJzKHgpID4gTWF0aC5hYnMoeSkpIHsgLy9EaXJlY3Rpb24gdmVjdG9yIGlzIHBvaW50aW5nIGFsb25nIHggYXhpc1xyXG5cdFx0XHRcdGlmICh4ID4gMCkgcmV0dXJuIFwiZVwiO1xyXG5cdFx0XHRcdGVsc2UgcmV0dXJuIFwid1wiO1xyXG5cdFx0XHR9IGVsc2UgeyAvL0RpcmVjdGlvbiB2ZWN0b3IgaXMgcG9pbnRpbmcgYWxvbmcgeSBheGlzXHJcblx0XHRcdFx0aWYgKHkgPiAwKSByZXR1cm4gXCJuXCI7XHJcblx0XHRcdFx0ZWxzZSByZXR1cm4gXCJzXCI7XHJcblx0XHRcdH1cclxuXHRcdFx0cmV0dXJuIFwiblwiO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0fSxcclxuXHRcclxuXHRhbmltYXRlQnVtcCA6IGZ1bmN0aW9uKHNyY3gsIHNyY3ksIHgsIHksIHJlYXNvbikge1xyXG5cdFx0Ly8gY29uc29sZS53YXJuKHRoaXMuaWQsIFwiOiBDYW5ub3Qgd2FsayB0byBsb2NhdGlvblwiLCBcIihcIit4K1wiLFwiK3krXCIpXCIpO1xyXG5cdFx0dGhpcy5wbGF5QW5pbWF0aW9uKFwiYnVtcFwiLCB7IHN0b3BOZXh0VHJhbnNpdGlvbjogdHJ1ZSB9KTtcclxuXHR9LFxyXG5cdFxyXG5cdGNoYW5nZWRMYXllciA6IGZ1bmN0aW9uKGZyb21MYXllciwgdG9MYXllcikge1xyXG5cdFx0XHJcblx0fSxcclxuXHRcclxuXHQvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHRpc05QQyA6IGZ1bmN0aW9uKCl7IHJldHVybiBmYWxzZTsgfSxcclxuXHRcclxuXHRfYXZhdGFyX2xvYWRTcHJpdGUgOiBmdW5jdGlvbihtYXAsIHRleHR1cmUpIHtcclxuXHRcdHZhciB1cmwgPSBCQVNFVVJMK1wiL2ltZy9wY3MvXCIrIGdhbWVTdGF0ZS5wbGF5ZXJTcHJpdGU7XHJcblx0XHR2YXIgcmVzID0gL14oW15cXFtdKylcXFsoW15cXF1dKylcXF0ucG5nJC8uZXhlYyh1cmwpO1xyXG5cdFx0XHJcblx0XHR2YXIgbmFtZSA9IHJlc1sxXTtcclxuXHRcdHZhciBmb3JtYXQgPSByZXNbMl07XHJcblx0XHRcclxuXHRcdHZhciBpbWcgPSBuZXcgSW1hZ2UoKTtcclxuXHRcdGZvcm1hdCA9IHRoaXMuZ2V0U3ByaXRlRm9ybWF0KGZvcm1hdCk7XHJcblx0XHR0aGlzLl9fb25Mb2FkU3ByaXRlKGltZywgZm9ybWF0LCB0ZXh0dXJlKTtcclxuXHRcdGltZy5zcmMgPSB1cmw7XHJcblx0fSxcclxuXHRcclxuXHQvLyBOZXV0ZXIgdGhlIGxvY2F0aW9uIG5vcm1pbGl6YXRpb24gZm9yIHRoaXMga2luZCBvZiBldmVudFxyXG5cdF9ub3JtYWxpemVMb2NhdGlvbiA6IGZ1bmN0aW9uKCkge30sXHJcblx0XHJcbn0pO1xyXG5tb2R1bGUuZXhwb3J0cyA9IFBsYXllckNoYXI7XHJcbiIsIi8vIHNpZ24uanNcclxuLy8gRGVmaW5lcyBhIGNvbW1vbiBTaWduIGV2ZW50XHJcblxyXG52YXIgRXZlbnQgPSByZXF1aXJlKFwidHBwLWV2ZW50XCIpO1xyXG52YXIgaW5oZXJpdHMgPSByZXF1aXJlKFwiaW5oZXJpdHNcIik7XHJcbnZhciBleHRlbmQgPSByZXF1aXJlKFwiZXh0ZW5kXCIpO1xyXG5cclxuLyoqXHJcbiAqIEEgc2lnbiBpcyBhIHRpbGUgd2hpY2ggdGhlIHBsYXllciBjYW4gcmVhZCBpbmZvcm1hdGlvbi4gVGhlIHNpZ24gY2FuIGJlIGZhY2luZyBhbnlcclxuICogZGlyZWN0aW9uIChkZWZhdWx0LCBkb3duKSBhbmQgY2FuIG9ubHkgYmUgcmVhZCBpbiB0aGF0IGRpcmVjdGlvbiAoY29uZmlndXJhYmxlKVxyXG4gKi9cclxuZnVuY3Rpb24gU2lnbihiYXNlLCBvcHRzKSB7XHJcblx0RXZlbnQuY2FsbCh0aGlzLCBiYXNlLCBvcHRzKTtcclxuXHRcclxuXHR0aGlzLm9uKFwiaW50ZXJhY3RlZFwiLCB0aGlzLm9uSW50ZXJhY3QpO1xyXG59XHJcbmluaGVyaXRzKFNpZ24sIEV2ZW50KTtcclxuZXh0ZW5kKFNpZ24ucHJvdG90eXBlLCB7XHJcblx0ZnJhbWVfdHlwZTogXCJ0ZXh0XCIsXHJcblx0dGV4dDogXCJbVGhlcmUgaXMgbm90aGluZyB3cml0dGVuIG9uIHRoaXMgc2lnbiFdXCIsXHJcblx0XHJcblx0c2lnblR5cGU6IDEsIC8vMCA9IHByb3ZpZGVkIGJ5IG1hcCBnZW9tZXRyeSAobm8gbW9kZWwpLCA+MCA9IHByb3ZpZGUgbW9kZWxcclxuXHRcclxuXHRmYWNpbmc6IG5ldyBUSFJFRS5WZWN0b3IzKDAsIDAsIDEpLCAvL2Rvd25cclxuXHRyZWFkT25seUZhY2luZzogdHJ1ZSxcclxuXHRcclxuXHRvbkludGVyYWN0IDogZnVuY3Rpb24oZnJvbSkge1xyXG5cdFx0aWYgKHRoaXMucmVhZE9ubHlGYWNpbmcpIHtcclxuXHRcdFx0dmFyIGYgPSBmcm9tLmNsb25lKCkubmVnYXRlKCk7XHJcblx0XHRcdGlmIChmLnggIT0gdGhpcy5mYWNpbmcueCB8fCBmLnkgIT0gdGhpcy5mYWNpbmcueSlcclxuXHRcdFx0XHRyZXR1cm47IC8vZG9uJ3Qgc2hvdyBib3ggaWYgbm90IGxvb2tpbmcgYXQgdGhlIHNpZ25cclxuXHRcdH1cclxuXHRcdFVJLnNob3dUZXh0Qm94KHRoaXMuZnJhbWVfdHlwZSwgdGhpcy50ZXh0LCB7IG93bmVyOiB0aGlzIH0pO1xyXG5cdH0sXHJcblx0XHJcblx0LyoqIElmIHRoZSBzaWduIGlzIHByb3ZpZGVkIGJ5IHRoZSBtYXAgZ2VvbWV0cnksIHRoZSBtYXAgcHJvdmlkZXMgdGhlIGNvbGxpc2lvbiBhcyB3ZWxsLiAqL1xyXG5cdGNhbldhbGtPbiA6IGZ1bmN0aW9uKCl7IHJldHVybiB0aGlzLnNpZ25UeXBlICE9IDA7IH0sXHJcblx0XHJcblx0LyoqICAqL1xyXG5cdGdldEF2YXRhciA6IGZ1bmN0aW9uKG1hcCwgZ2MpeyBcclxuXHRcdGlmICh0aGlzLnNpZ25UeXBlID09IDApIHJldHVybiBudWxsO1xyXG5cdFx0XHJcblx0XHQvL1RPRE9cclxuXHRcdFxyXG5cdFx0cmV0dXJuIG51bGw7IFxyXG5cdH0sXHJcblx0XHJcbn0pO1xyXG5tb2R1bGUuZXhwb3J0cyA9IFNpZ247XHJcblxyXG5cclxuIiwiLy8gc3ByaXRlbW9kZWwuanNcclxuLy8gQSByZWR1eCBvZiB0aGUgVEhSRUUuanMgc3ByaXRlLCBidXQgbm90IHVzaW5nIHRoZSBzcHJpdGUgcGx1Z2luXHJcblxyXG52YXIgaW5oZXJpdHMgPSByZXF1aXJlKFwiaW5oZXJpdHNcIik7XHJcbnZhciBleHRlbmQgPSByZXF1aXJlKFwiZXh0ZW5kXCIpO1xyXG5cclxuZnVuY3Rpb24gQ2hhcmFjdGVyU3ByaXRlKG9wdHMpIHtcclxuXHRpZiAoISh0aGlzIGluc3RhbmNlb2YgQ2hhcmFjdGVyU3ByaXRlKSkge1xyXG5cdFx0cmV0dXJuIG5ldyBDaGFyYWN0ZXJTcHJpdGUob3B0cyk7XHJcblx0fVxyXG5cdHZhciBnYyA9IG9wdHMuZ2MgfHwgR0MuZ2V0QmluKCk7XHJcblx0XHJcblx0b3B0cyA9IGV4dGVuZCh7XHJcblx0XHR0cmFuc3BhcmVudDogdHJ1ZSxcclxuXHRcdGFscGhhVGVzdDogdHJ1ZSxcclxuXHR9LCBvcHRzKTtcclxuXHRcclxuXHRpZiAoIW9wdHMub2Zmc2V0KSBvcHRzLm9mZnNldCA9IG5ldyBUSFJFRS5WZWN0b3IzKDAsIDAsIDApO1xyXG5cdFxyXG5cdC8vVE9ETyByZXBsYWNlIHdpdGggZ2VvbWV0cnkgd2UgY2FuIGNvbnRyb2xcclxuXHQvLyB2YXIgZ2VvbSA9IG5ldyBUSFJFRS5QbGFuZUJ1ZmZlckdlb21ldHJ5KDEsIDEpO1xyXG5cdHZhciBnZW9tID0gbmV3IENoYXJhY3RlclBsYW5lR2VvbWV0cnkob3B0cy5vZmZzZXQpO1xyXG5cdGdjLmNvbGxlY3QoZ2VvbSk7XHJcblx0XHJcblx0dmFyIG1hdCA9IG5ldyBDaGFyYWN0ZXJTcHJpdGVNYXRlcmlhbChvcHRzKTtcclxuXHRnYy5jb2xsZWN0KG1hdCk7XHJcblx0XHJcblx0VEhSRUUuTWVzaC5jYWxsKHRoaXMsIGdlb20sIG1hdCk7XHJcblx0dGhpcy50eXBlID0gXCJDaGFyYWN0ZXJTcHJpdGVcIjtcclxuXHRcclxuXHRtYXQuc2NhbGUgPSBtYXQudW5pZm9ybXMuc2NhbGUudmFsdWUgPSB0aGlzLnNjYWxlO1xyXG5cdFxyXG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKHRoaXMsIHtcclxuXHRcdHdpZHRoOiB7XHJcblx0XHRcdGdldDogZnVuY3Rpb24oKSB7XHJcblx0XHRcdFx0cmV0dXJuIE1hdGguZmxvb3IoKHRoaXMubW9ycGhUYXJnZXRJbmZsdWVuY2VzWzBdICsgMSkgKiAzMik7XHJcblx0XHRcdH0sXHJcblx0XHRcdHNldDogZnVuY3Rpb24odmFsKSB7XHJcblx0XHRcdFx0dGhpcy5tb3JwaFRhcmdldEluZmx1ZW5jZXNbMF0gPSAodmFsIC8gMzIpIC0gMTtcclxuXHRcdFx0fSxcclxuXHRcdH0sXHJcblx0XHRoZWlnaHQ6IHtcclxuXHRcdFx0Z2V0OiBmdW5jdGlvbigpIHtcclxuXHRcdFx0XHRyZXR1cm4gTWF0aC5mbG9vcigodGhpcy5tb3JwaFRhcmdldEluZmx1ZW5jZXNbMV0gKyAxKSAqIDMyKTtcclxuXHRcdFx0fSxcclxuXHRcdFx0c2V0OiBmdW5jdGlvbih2YWwpIHtcclxuXHRcdFx0XHR0aGlzLm1vcnBoVGFyZ2V0SW5mbHVlbmNlc1sxXSA9ICh2YWwgLyAzMikgLSAxO1xyXG5cdFx0XHR9LFxyXG5cdFx0fSxcclxuXHR9KTtcclxufVxyXG5pbmhlcml0cyhDaGFyYWN0ZXJTcHJpdGUsIFRIUkVFLk1lc2gpO1xyXG5tb2R1bGUuZXhwb3J0cy5DaGFyYWN0ZXJTcHJpdGUgPSBDaGFyYWN0ZXJTcHJpdGU7XHJcblxyXG5cclxuZnVuY3Rpb24gQ2hhcmFjdGVyU3ByaXRlTWF0ZXJpYWwob3B0cykge1xyXG5cdGlmICghKHRoaXMgaW5zdGFuY2VvZiBDaGFyYWN0ZXJTcHJpdGVNYXRlcmlhbCkpIHtcclxuXHRcdHJldHVybiBuZXcgQ2hhcmFjdGVyU3ByaXRlTWF0ZXJpYWwob3B0cyk7XHJcblx0fVxyXG5cdFxyXG5cdC8vVE9ETyB3cml0ZSBpdCBzbyB3aGVuIHdlIHJlcGxhY2UgdGhlIHZhbHVlcyBoZXJlLCB3ZSByZXBsYWNlIHRoZSBvbmVzIGluIHRoZSB1bmlmb3Jtc1xyXG5cdC8vIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKHRoaXMsIHtcclxuXHQvLyBcdHV2T2Zmc2V0IDoge31cclxuXHQvLyB9KTtcclxuXHJcblx0dGhpcy5tYXAgPSBvcHRzLm1hcCB8fCBuZXcgVEhSRUUuVGV4dHVyZSgpO1xyXG5cdFxyXG5cdHRoaXMudXZPZmZzZXQgPSBvcHRzLnV2T2Zmc2V0IHx8IHRoaXMubWFwLm9mZnNldCB8fCBuZXcgVEhSRUUuVmVjdG9yMigwLCAwKTtcclxuXHR0aGlzLnV2U2NhbGUgPSBvcHRzLnV2U2NhbGUgfHwgdGhpcy5tYXAucmVwZWF0IHx8IG5ldyBUSFJFRS5WZWN0b3IyKDEsIDEpO1xyXG5cdFxyXG5cdHRoaXMucm90YXRpb24gPSBvcHRzLnJvdGF0aW9uIHx8IDA7XHJcblx0dGhpcy5zY2FsZSA9IG9wdHMuc2NhbGUgfHwgbmV3IFRIUkVFLlZlY3RvcjIoMSwgMSk7XHJcblx0XHJcblx0dGhpcy5jb2xvciA9IChvcHRzLmNvbG9yIGluc3RhbmNlb2YgVEhSRUUuQ29sb3IpPyBvcHRzLmNvbG9yIDogbmV3IFRIUkVFLkNvbG9yKG9wdHMuY29sb3IpO1xyXG5cdHRoaXMub3BhY2l0eSA9IG9wdHMub3BhY2l0eSB8fCAxO1xyXG5cdFxyXG5cdHZhciBwYXJhbXMgPSB0aGlzLl9jcmVhdGVNYXRQYXJhbXMob3B0cyk7XHJcblx0VEhSRUUuU2hhZGVyTWF0ZXJpYWwuY2FsbCh0aGlzLCBwYXJhbXMpO1xyXG5cdHRoaXMudHlwZSA9IFwiQ2hhcmFjdGVyU3ByaXRlTWF0ZXJpYWxcIjtcclxuXHRcclxuXHR0aGlzLnRyYW5zcGFyZW50ID0gKG9wdHMudHJhbnNwYXJlbnQgIT09IHVuZGVmaW5lZCk/IG9wdHMudHJhbnNwYXJlbnQgOiB0cnVlO1xyXG5cdHRoaXMuYWxwaGFUZXN0ID0gMC4wNTtcclxuXHQvLyB0aGlzLmRlcHRoV3JpdGUgPSBmYWxzZTtcclxuXHR0aGlzLm1vcnBoVGFyZ2V0cyA9IHRydWU7XHJcbn1cclxuaW5oZXJpdHMoQ2hhcmFjdGVyU3ByaXRlTWF0ZXJpYWwsIFRIUkVFLlNoYWRlck1hdGVyaWFsKTtcclxuZXh0ZW5kKENoYXJhY3RlclNwcml0ZU1hdGVyaWFsLnByb3RvdHlwZSwge1xyXG5cdG1hcCA6IG51bGwsXHJcblx0XHJcblx0X2NyZWF0ZU1hdFBhcmFtcyA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0c2hlZXJtYXQgPSBbXHJcblx0XHRcdDEsIDAsIDAsIDAsXHJcblx0XHRcdDAsIDEsIDAsIDAsXHJcblx0XHRcdDAsIDAsIDEsIC0wLjAwOSxcclxuXHRcdFx0MCwgMCwgMCwgMSxcclxuXHRcdF07XHJcblx0XHRcclxuXHRcdHZhciBwYXJhbXMgPSB7XHJcblx0XHRcdHVuaWZvcm1zIDoge1xyXG5cdFx0XHRcdHV2T2Zmc2V0Olx0eyB0eXBlOiBcInYyXCIsIHZhbHVlOiB0aGlzLnV2T2Zmc2V0IH0sXHJcblx0XHRcdFx0dXZTY2FsZTpcdHsgdHlwZTogXCJ2MlwiLCB2YWx1ZTogdGhpcy51dlNjYWxlIH0sXHJcblx0XHRcdFx0XHJcblx0XHRcdFx0cm90YXRpb246XHR7IHR5cGU6IFwiZlwiLCB2YWx1ZTogdGhpcy5yb3RhdGlvbiB9LFxyXG5cdFx0XHRcdHNjYWxlOlx0XHR7IHR5cGU6IFwidjJcIiwgdmFsdWU6IHRoaXMuc2NhbGUgfSxcclxuXHRcdFx0XHRcclxuXHRcdFx0XHRjb2xvcjpcdFx0eyB0eXBlOiBcImNcIiwgdmFsdWU6IHRoaXMuY29sb3IgfSxcclxuXHRcdFx0XHRtYXA6XHRcdHsgdHlwZTogXCJ0XCIsIHZhbHVlOiB0aGlzLm1hcCB9LFxyXG5cdFx0XHRcdG9wYWNpdHk6XHR7IHR5cGU6IFwiZlwiLCB2YWx1ZTogdGhpcy5vcGFjaXR5IH0sXHJcblx0XHRcdFx0XHJcblx0XHRcdFx0em9mZnNldDpcdHsgdHlwZTogXCJmXCIsIHZhbHVlOiAtMC4wMDkgfSxcclxuXHRcdFx0XHRzaGVlcjpcdFx0eyB0eXBlOiBcIm00XCIsIHZhbHVlOiBuZXcgVEhSRUUuTWF0cml4NCgpIH0sXHJcblx0XHRcdFx0XHJcblx0XHRcdFx0bW9ycGhUYXJnZXRJbmZsdWVuY2VzIDogeyB0eXBlOiBcImZcIiwgdmFsdWU6IDAgfSxcclxuXHRcdFx0fSxcclxuXHRcdH07XHJcblx0XHRcclxuXHRcdHBhcmFtcy52ZXJ0ZXhTaGFkZXIgPSB0aGlzLl92ZXJ0U2hhZGVyO1xyXG5cdFx0cGFyYW1zLmZyYWdtZW50U2hhZGVyID0gdGhpcy5fZnJhZ1NoYWRlcjtcclxuXHRcdHJldHVybiBwYXJhbXM7XHJcblx0fSxcclxuXHRcclxuXHRfdmVydFNoYWRlcjogW1xyXG5cdFx0Ly8gJ3VuaWZvcm0gbWF0NCBtb2RlbFZpZXdNYXRyaXg7JyxcclxuXHRcdC8vICd1bmlmb3JtIG1hdDQgcHJvamVjdGlvbk1hdHJpeDsnLFxyXG5cdFx0J3VuaWZvcm0gZmxvYXQgcm90YXRpb247JyxcclxuXHRcdCd1bmlmb3JtIHZlYzIgc2NhbGU7JyxcclxuXHRcdCd1bmlmb3JtIHZlYzIgdXZPZmZzZXQ7JyxcclxuXHRcdCd1bmlmb3JtIHZlYzIgdXZTY2FsZTsnLFxyXG5cdFx0XHJcblx0XHQndW5pZm9ybSBmbG9hdCB6b2Zmc2V0OycsXHJcblx0XHQndW5pZm9ybSBtYXQ0IHNoZWVyOycsXHJcblx0XHRcclxuXHRcdCcjaWZkZWYgVVNFX01PUlBIVEFSR0VUUycsXHJcblx0XHRcInVuaWZvcm0gZmxvYXQgbW9ycGhUYXJnZXRJbmZsdWVuY2VzWyA4IF07XCIsXHJcblx0XHQnI2VuZGlmJyxcclxuXHJcblx0XHQvLyAnYXR0cmlidXRlIHZlYzIgcG9zaXRpb247JyxcclxuXHRcdC8vICdhdHRyaWJ1dGUgdmVjMiB1djsnLFxyXG5cclxuXHRcdCd2YXJ5aW5nIHZlYzIgdlVWOycsXHJcblxyXG5cdFx0J3ZvaWQgbWFpbigpIHsnLFxyXG5cclxuXHRcdFx0J3ZVViA9IHV2T2Zmc2V0ICsgdXYgKiB1dlNjYWxlOycsXHJcblxyXG5cdFx0XHRcInZlYzMgbW9ycGhlZCA9IHZlYzMoIDAuMCApO1wiLFxyXG5cdFx0XHRcclxuXHRcdFx0JyNpZmRlZiBVU0VfTU9SUEhUQVJHRVRTJywgXHJcblx0XHRcdFwibW9ycGhlZCArPSAoIG1vcnBoVGFyZ2V0MCAtIHBvc2l0aW9uICkgKiBtb3JwaFRhcmdldEluZmx1ZW5jZXNbIDAgXTtcIixcclxuXHRcdFx0XCJtb3JwaGVkICs9ICggbW9ycGhUYXJnZXQxIC0gcG9zaXRpb24gKSAqIG1vcnBoVGFyZ2V0SW5mbHVlbmNlc1sgMSBdO1wiLFxyXG5cdFx0XHRcIm1vcnBoZWQgKz0gKCBtb3JwaFRhcmdldDIgLSBwb3NpdGlvbiApICogbW9ycGhUYXJnZXRJbmZsdWVuY2VzWyAyIF07XCIsXHJcblx0XHRcdFwibW9ycGhlZCArPSAoIG1vcnBoVGFyZ2V0MyAtIHBvc2l0aW9uICkgKiBtb3JwaFRhcmdldEluZmx1ZW5jZXNbIDMgXTtcIixcclxuXHRcdFx0XCJtb3JwaGVkICs9ICggbW9ycGhUYXJnZXQ0IC0gcG9zaXRpb24gKSAqIG1vcnBoVGFyZ2V0SW5mbHVlbmNlc1sgNCBdO1wiLFxyXG5cdFx0XHRcIm1vcnBoZWQgKz0gKCBtb3JwaFRhcmdldDUgLSBwb3NpdGlvbiApICogbW9ycGhUYXJnZXRJbmZsdWVuY2VzWyA1IF07XCIsXHJcblx0XHRcdFwibW9ycGhlZCArPSAoIG1vcnBoVGFyZ2V0NiAtIHBvc2l0aW9uICkgKiBtb3JwaFRhcmdldEluZmx1ZW5jZXNbIDYgXTtcIixcclxuXHRcdFx0XCJtb3JwaGVkICs9ICggbW9ycGhUYXJnZXQ3IC0gcG9zaXRpb24gKSAqIG1vcnBoVGFyZ2V0SW5mbHVlbmNlc1sgNyBdO1wiLFxyXG5cdFx0XHQnI2VuZGlmJyxcclxuXHRcdFx0XHJcblx0XHRcdFwibW9ycGhlZCArPSBwb3NpdGlvbjtcIixcclxuXHJcblx0XHRcdCd2ZWMyIGFsaWduZWRQb3NpdGlvbiA9IG1vcnBoZWQueHkgKiBzY2FsZTsnLFxyXG5cclxuXHRcdFx0J3ZlYzIgcm90YXRlZFBvc2l0aW9uOycsXHJcblx0XHRcdCdyb3RhdGVkUG9zaXRpb24ueCA9IGNvcyggcm90YXRpb24gKSAqIGFsaWduZWRQb3NpdGlvbi54IC0gc2luKCByb3RhdGlvbiApICogYWxpZ25lZFBvc2l0aW9uLnk7JyxcclxuXHRcdFx0J3JvdGF0ZWRQb3NpdGlvbi55ID0gc2luKCByb3RhdGlvbiApICogYWxpZ25lZFBvc2l0aW9uLnggKyBjb3MoIHJvdGF0aW9uICkgKiBhbGlnbmVkUG9zaXRpb24ueTsnLFxyXG5cdFx0XHRcclxuXHRcdFx0J21hdDQgenNoZWVyID0gbWF0NCgxLCAwLCAwLCAwLCcsXHJcblx0XHRcdFx0ICAgICAgICAgICAgICAgJzAsIDEsIDAsIDAsJyxcclxuXHRcdFx0XHQgICAgICAgICAgICAgICAnMCwgMCwgMSwgcG9zaXRpb24ueSAqIHpvZmZzZXQsJyxcclxuXHRcdFx0XHQgICAgICAgICAgICAgICAnMCwgMCwgMCwgMSk7JyxcclxuXHJcblx0XHRcdCd2ZWM0IHNoZWVyZm9yY2UgPSBtb2RlbFZpZXdNYXRyaXggKiB2ZWM0KDAsIHBvc2l0aW9uLnksIHBvc2l0aW9uLnosIDEpOycsXHJcblx0XHRcdFxyXG5cdFx0XHQndmVjNCBmaW5hbFBvc2l0aW9uOycsXHJcblxyXG5cdFx0XHQnZmluYWxQb3NpdGlvbiA9IG1vZGVsVmlld01hdHJpeCAqIHZlYzQoIDAuMCwgMC4wLCAwLjAsIDEuMCApOycsXHJcblx0XHRcdCdmaW5hbFBvc2l0aW9uLncgKz0gKHNoZWVyZm9yY2UueiAtIGZpbmFsUG9zaXRpb24ueikgKiB6b2Zmc2V0OycsXHJcblx0XHRcdCdmaW5hbFBvc2l0aW9uLnh5ICs9IHJvdGF0ZWRQb3NpdGlvbjsnLFxyXG5cdFx0XHQnZmluYWxQb3NpdGlvbiA9IHpzaGVlciAqIGZpbmFsUG9zaXRpb247JyxcclxuXHRcdFx0J2ZpbmFsUG9zaXRpb24gPSBzaGVlciAqIGZpbmFsUG9zaXRpb247JyxcclxuXHRcdFx0J2ZpbmFsUG9zaXRpb24gPSBwcm9qZWN0aW9uTWF0cml4ICogZmluYWxQb3NpdGlvbjsnLFxyXG5cdFx0XHRcclxuXHRcdFx0J2dsX1Bvc2l0aW9uID0gZmluYWxQb3NpdGlvbjsnLFxyXG5cclxuXHRcdCd9J1xyXG5cdF0uam9pbiggJ1xcbicgKSxcclxuXHRcclxuXHRfZnJhZ1NoYWRlcjogW1xyXG5cdFx0J3VuaWZvcm0gdmVjMyBjb2xvcjsnLFxyXG5cdFx0J3VuaWZvcm0gc2FtcGxlcjJEIG1hcDsnLFxyXG5cdFx0J3VuaWZvcm0gZmxvYXQgb3BhY2l0eTsnLFxyXG5cclxuXHRcdCd1bmlmb3JtIHZlYzMgZm9nQ29sb3I7JyxcclxuXHRcdCd1bmlmb3JtIGZsb2F0IGZvZ0RlbnNpdHk7JyxcclxuXHRcdCd1bmlmb3JtIGZsb2F0IGZvZ05lYXI7JyxcclxuXHRcdCd1bmlmb3JtIGZsb2F0IGZvZ0ZhcjsnLFxyXG5cclxuXHRcdCd2YXJ5aW5nIHZlYzIgdlVWOycsXHJcblxyXG5cdFx0J3ZvaWQgbWFpbigpIHsnLFxyXG5cclxuXHRcdFx0J3ZlYzQgdGV4dHVyZSA9IHRleHR1cmUyRCggbWFwLCB2VVYgKTsnLFxyXG5cclxuXHRcdFx0JyNpZmRlZiBBTFBIQVRFU1QnLFxyXG5cdFx0XHRcdCdpZiAoIHRleHR1cmUuYSA8IEFMUEhBVEVTVCApIGRpc2NhcmQ7JyxcclxuXHRcdFx0JyNlbmRpZicsXHJcblxyXG5cdFx0XHQnZ2xfRnJhZ0NvbG9yID0gdmVjNCggY29sb3IgKiB0ZXh0dXJlLnh5eiwgdGV4dHVyZS5hICogb3BhY2l0eSApOycsXHJcblxyXG5cdFx0XHQnI2lmZGVmIFVTRV9GT0cnLFxyXG5cdFx0XHRcdCdmbG9hdCBkZXB0aCA9IGdsX0ZyYWdDb29yZC56IC8gZ2xfRnJhZ0Nvb3JkLnc7JyxcclxuXHRcdFx0XHQnZmxvYXQgZm9nRmFjdG9yID0gMC4wOycsXHJcblx0XHRcdFx0XHJcblx0XHRcdFx0JyNpZm5kZWYgRk9HX0VYUDInLCAvL25vdGU6IE5PVCBkZWZpbmVkXHJcblx0XHRcdFx0XHJcblx0XHRcdFx0XHQnZm9nRmFjdG9yID0gc21vb3Roc3RlcCggZm9nTmVhciwgZm9nRmFyLCBkZXB0aCApOycsXHJcblx0XHRcdFx0XHRcclxuXHRcdFx0XHQnI2Vsc2UnLFxyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdFx0J2NvbnN0IGZsb2F0IExPRzIgPSAxLjQ0MjY5NTsnLFxyXG5cdFx0XHRcdFx0J2Zsb2F0IGZvZ0ZhY3RvciA9IGV4cDIoIC0gZm9nRGVuc2l0eSAqIGZvZ0RlbnNpdHkgKiBkZXB0aCAqIGRlcHRoICogTE9HMiApOycsXHJcblx0XHRcdFx0XHQnZm9nRmFjdG9yID0gMS4wIC0gY2xhbXAoIGZvZ0ZhY3RvciwgMC4wLCAxLjAgKTsnLFxyXG5cclxuXHRcdFx0XHQnI2VuZGlmJyxcclxuXHRcdFx0XHRcclxuXHRcdFx0XHQnZ2xfRnJhZ0NvbG9yID0gbWl4KCBnbF9GcmFnQ29sb3IsIHZlYzQoIGZvZ0NvbG9yLCBnbF9GcmFnQ29sb3IudyApLCBmb2dGYWN0b3IgKTsnLFxyXG5cclxuXHRcdFx0JyNlbmRpZicsXHJcblxyXG5cdFx0J30nXHJcblx0XS5qb2luKCAnXFxuJyApLFxyXG59KTtcclxubW9kdWxlLmV4cG9ydHMuQ2hhcmFjdGVyU3ByaXRlTWF0ZXJpYWwgPSBDaGFyYWN0ZXJTcHJpdGVNYXRlcmlhbDtcclxuXHJcblxyXG5cclxuZnVuY3Rpb24gQ2hhcmFjdGVyUGxhbmVHZW9tZXRyeShvZmYpIHtcclxuXHRUSFJFRS5HZW9tZXRyeS5jYWxsKHRoaXMpO1xyXG5cdFxyXG5cdHRoaXMudHlwZSA9IFwiQ2hhcmFjdGVyUGxhbmVHZW9tZXRyeVwiO1xyXG5cdHRoaXMudmVydGljZXMgPSBbXHJcblx0XHRuZXcgVEhSRUUuVmVjdG9yMyggLTAuNSArIG9mZi54LCAtMC41ICsgb2ZmLnksIDAgKyBvZmYueiApLFxyXG5cdFx0bmV3IFRIUkVFLlZlY3RvcjMoICAwLjUgKyBvZmYueCwgLTAuNSArIG9mZi55LCAwICsgb2ZmLnogKSxcclxuXHRcdG5ldyBUSFJFRS5WZWN0b3IzKCAgMC41ICsgb2ZmLngsICAwLjUgKyBvZmYueSwgMCArIG9mZi56ICksXHJcblx0XHRuZXcgVEhSRUUuVmVjdG9yMyggLTAuNSArIG9mZi54LCAgMC41ICsgb2ZmLnksIDAgKyBvZmYueiApLFxyXG5cdF07XHJcblx0XHJcblx0dGhpcy5mYWNlcy5wdXNoKG5ldyBUSFJFRS5GYWNlMygwLCAxLCAyKSk7XHJcblx0dGhpcy5mYWNlcy5wdXNoKG5ldyBUSFJFRS5GYWNlMygwLCAyLCAzKSk7XHJcblx0XHJcblx0dGhpcy5mYWNlVmVydGV4VXZzWzBdLnB1c2goWyB1digwLCAwKSwgdXYoMSwgMCksIHV2KDEsIDEpIF0pO1xyXG5cdHRoaXMuZmFjZVZlcnRleFV2c1swXS5wdXNoKFsgdXYoMCwgMCksIHV2KDEsIDEpLCB1digwLCAxKSBdKTtcclxuXHRcclxuXHR0aGlzLm1vcnBoVGFyZ2V0cyA9IFtcclxuXHRcdHsgbmFtZTogXCJ3aWR0aFwiLCB2ZXJ0aWNlczogW1xyXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMyggLTAuNSArIG9mZi54IC0gMC41LCAtMC41ICsgb2ZmLnksIDAgKyBvZmYueiApLFxyXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMyggIDAuNSArIG9mZi54ICsgMC41LCAtMC41ICsgb2ZmLnksIDAgKyBvZmYueiApLFxyXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMyggIDAuNSArIG9mZi54ICsgMC41LCAgMC41ICsgb2ZmLnksIDAgKyBvZmYueiApLFxyXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMyggLTAuNSArIG9mZi54IC0gMC41LCAgMC41ICsgb2ZmLnksIDAgKyBvZmYueiApLFxyXG5cdFx0XSB9LFxyXG5cdFx0eyBuYW1lOiBcImhlaWdodFwiLCB2ZXJ0aWNlczogW1xyXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMyggLTAuNSArIG9mZi54LCAtMC41ICsgb2ZmLnkgICAgLCAwICsgb2ZmLnogKSxcclxuXHRcdFx0bmV3IFRIUkVFLlZlY3RvcjMoICAwLjUgKyBvZmYueCwgLTAuNSArIG9mZi55ICAgICwgMCArIG9mZi56ICksXHJcblx0XHRcdG5ldyBUSFJFRS5WZWN0b3IzKCAgMC41ICsgb2ZmLngsICAwLjUgKyBvZmYueSArIDEsIDAgKyBvZmYueiApLFxyXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMyggLTAuNSArIG9mZi54LCAgMC41ICsgb2ZmLnkgKyAxLCAwICsgb2ZmLnogKSxcclxuXHRcdF0gfSxcclxuXHRdO1xyXG5cdFxyXG5cdGZ1bmN0aW9uIHV2KHgsIHkpIHsgcmV0dXJuIG5ldyBUSFJFRS5WZWN0b3IyKHgsIHkpOyB9XHJcbn1cclxuaW5oZXJpdHMoQ2hhcmFjdGVyUGxhbmVHZW9tZXRyeSwgVEhSRUUuR2VvbWV0cnkpO1xyXG5cclxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHJcblxyXG5cclxuZnVuY3Rpb24gQnViYmxlU3ByaXRlKCkge1xyXG5cdGlmICghKHRoaXMgaW5zdGFuY2VvZiBCdWJibGVTcHJpdGUpKSB7XHJcblx0XHRyZXR1cm4gbmV3IEJ1YmJsZVNwcml0ZSgpO1xyXG5cdH1cclxuXHRcclxuXHQvL1RPRE8gcmVwbGFjZSB3aXRoIGdlb21ldHJ5IHdlIGNhbiBjb250cm9sXHJcblx0Ly8gdmFyIGdlb20gPSBuZXcgVEhSRUUuUGxhbmVCdWZmZXJHZW9tZXRyeSgxLCAxKTtcclxuXHR2YXIgZ2VvbSA9IG5ldyBCdWJibGVQbGFuZUdlb21ldHJ5KG5ldyBUSFJFRS5WZWN0b3IzKDAsIDAsIDApKTtcclxuXHRcclxuXHRcclxuXHR2YXIgdGV4ID0gdGhpcy5fdGV4ID0gbmV3IFRIUkVFLlRleHR1cmUoKTtcclxuXHR0ZXgubWFnRmlsdGVyID0gVEhSRUUuTmVhcmVzdEZpbHRlcjtcclxuXHR0ZXgubWluRmlsdGVyID0gVEhSRUUuTmVhcmVzdEZpbHRlcjtcclxuXHR0ZXguYW5pc290cm9weSA9IDE7XHJcblx0dGV4LmdlbmVyYXRlTWlwbWFwcyA9IGZhbHNlO1xyXG5cdHRleC5yZXBlYXQgPSBuZXcgVEhSRUUuVmVjdG9yMigxNi8xMjgsIDE2LzY0KTtcclxuXHR0ZXgub2Zmc2V0ID0gbmV3IFRIUkVFLlZlY3RvcjIoMCwgMCk7XHJcblx0XHJcblx0dmFyIGltZyA9IG5ldyBJbWFnZSgpO1xyXG5cdGZ1bmN0aW9uIGYoKXtcclxuXHRcdHRleC5pbWFnZSA9IGltZztcclxuXHRcdHRleC5uZWVkc1VwZGF0ZSA9IHRydWU7XHJcblx0XHRpbWcucmVtb3ZlRXZlbnRMaXN0ZW5lcihcImxvYWRcIiwgZik7XHJcblx0fVxyXG5cdGltZy5vbihcImxvYWRcIiwgZik7XHJcblx0XHJcblx0aW1nLnNyYyA9IEJBU0VVUkwrXCIvaW1nL3VpL2Vtb3RlX2J1YmJsZS5wbmdcIjtcclxuXHRcclxuXHR2YXIgbWF0ID0gdGhpcy5fbWF0ID0gbmV3IENoYXJhY3RlclNwcml0ZU1hdGVyaWFsKHtcclxuXHRcdG1hcDogdGV4LFxyXG5cdFx0bW9ycGhUYXJnZXRzOiB0cnVlLFxyXG5cdFx0dHJhbnNwYXJlbnQ6IHRydWUsXHJcblx0XHRhbHBoYVRlc3Q6IDAuMDUsXHJcblx0fSk7XHJcblx0bWF0LnVuaWZvcm1zLnpvZmZzZXQudmFsdWUgPSAtMC4wMjtcclxuXHRcclxuXHRcclxuXHRUSFJFRS5NZXNoLmNhbGwodGhpcywgZ2VvbSwgbWF0KTtcclxuXHR0aGlzLnR5cGUgPSBcIkJ1YmJsZVNwcml0ZVwiO1xyXG5cdFxyXG5cdG1hdC5zY2FsZSA9IG1hdC51bmlmb3Jtcy5zY2FsZS52YWx1ZSA9IHRoaXMuc2NhbGU7XHJcblx0XHJcblx0T2JqZWN0LmRlZmluZVByb3BlcnRpZXModGhpcywge1xyXG5cdFx0eG9mZjoge1xyXG5cdFx0XHRnZXQ6IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRcdHJldHVybiBNYXRoLmZsb29yKCh0aGlzLm1vcnBoVGFyZ2V0SW5mbHVlbmNlc1swXSArIDEpICogMzIpO1xyXG5cdFx0XHR9LFxyXG5cdFx0XHRzZXQ6IGZ1bmN0aW9uKHZhbCkge1xyXG5cdFx0XHRcdHRoaXMubW9ycGhUYXJnZXRJbmZsdWVuY2VzWzBdID0gKHZhbCAvIDMyKSAtIDE7XHJcblx0XHRcdH0sXHJcblx0XHR9LFxyXG5cdFx0aGVpZ2h0OiB7XHJcblx0XHRcdGdldDogZnVuY3Rpb24oKSB7XHJcblx0XHRcdFx0cmV0dXJuIE1hdGguZmxvb3IoKHRoaXMubW9ycGhUYXJnZXRJbmZsdWVuY2VzWzFdICsgMSkgKiAzMik7XHJcblx0XHRcdH0sXHJcblx0XHRcdHNldDogZnVuY3Rpb24odmFsKSB7XHJcblx0XHRcdFx0dGhpcy5tb3JwaFRhcmdldEluZmx1ZW5jZXNbMV0gPSAodmFsIC8gMzIpIC0gMTtcclxuXHRcdFx0fSxcclxuXHRcdH0sXHJcblx0XHRzaHJpbms6IHtcclxuXHRcdFx0Z2V0OiBmdW5jdGlvbigpIHtcclxuXHRcdFx0XHRyZXR1cm4gKHRoaXMubW9ycGhUYXJnZXRJbmZsdWVuY2VzWzJdKTtcclxuXHRcdFx0fSxcclxuXHRcdFx0c2V0OiBmdW5jdGlvbih2YWwpIHtcclxuXHRcdFx0XHR0aGlzLm1vcnBoVGFyZ2V0SW5mbHVlbmNlc1syXSA9IE1hdGguY2xhbXAodmFsKTtcclxuXHRcdFx0fSxcclxuXHRcdH0sXHJcblx0fSk7XHJcblx0dGhpcy5zaHJpbmsgPSAxO1xyXG59XHJcbmluaGVyaXRzKEJ1YmJsZVNwcml0ZSwgVEhSRUUuTWVzaCk7XHJcbmV4dGVuZChCdWJibGVTcHJpdGUucHJvdG90eXBlLCB7XHJcblx0X3RleDogbnVsbCxcclxuXHRfbWF0OiBudWxsLFxyXG5cdHR5cGU6IG51bGwsXHJcblx0X190eXBlcyA6IHtcdC8vXHQgeDEgeTEgeDIgeTJcclxuXHRcdFwiYmxhbmtcIjpcdFsgMCwgMCwgMCwgMF0sXHJcblx0XHRcIi4uLlwiOiBcdFx0WyAwLCAzLCAxLCAzXSxcclxuXHRcdFwiIVwiOiBcdFx0WyAwLCAyLCAxLCAyXSwgXCJleGNsYWltXCIgOiBcIiFcIixcclxuXHRcdFwiP1wiOiBcdFx0WyAwLCAxLCAxLCAxXSwgXCJxdWVzdGlvblwiOiBcIj9cIixcclxuXHRcdFwic2luZ1wiOiBcdFsgMiwgMywgMywgM10sXHJcblx0XHRcIjwzXCI6IFx0XHRbIDIsIDIsIDMsIDJdLCBcImhlYXJ0XCI6IFwiPDNcIixcclxuXHRcdFwicG9zaW9uXCI6IFx0WyAyLCAxLCAzLCAxXSxcclxuXHRcdFwiOilcIjogXHRcdFsgNCwgMywgNSwgM10sIFwiaGFwcHlcIjogXCI6KVwiLFxyXG5cdFx0XCI6RFwiOiBcdFx0WyA0LCAyLCA1LCAyXSwgXCJleGNpdGVkXCI6IFwiOkRcIixcclxuXHRcdFwiOihcIjogXHRcdFsgNCwgMSwgNSwgMV0sIFwic2FkXCI6IFwiOihcIixcclxuXHRcdFwiPjooXCI6XHRcdFsgNiwgMywgNywgM10sIFwiZGlzYWdyZWVcIjogXCI+OihcIixcclxuXHRcdFwiRDo8XCI6IFx0XHRbIDYsIDIsIDcsIDJdLCBcImFuZ3J5XCI6IFwiRDo8XCIsXHJcblx0XHRcIj46KVwiOiBcdFx0WyA2LCAxLCA3LCAxXSwgXCJldmlsXCI6IFwiPjopXCIsXHJcblx0fSxcclxuXHRcclxuXHRzZXRUeXBlIDogZnVuY3Rpb24odHlwZSkge1xyXG5cdFx0dGhpcy50eXBlID0gdGhpcy5fX3R5cGVzW3R5cGVdO1xyXG5cdFx0d2hpbGUgKHRoaXMudHlwZSAmJiAhJC5pc0FycmF5KHRoaXMudHlwZSkpIHtcclxuXHRcdFx0dGhpcy50eXBlID0gdGhpcy5fX3R5cGVzW3RoaXMudHlwZV07XHJcblx0XHR9XHJcblx0XHRpZiAoIXRoaXMudHlwZSkge1xyXG5cdFx0XHR0aGlzLnR5cGUgPSB0aGlzLl9fdHlwZXNbXCJibGFua1wiXTtcclxuXHRcdFx0dGhpcy50aW1lb3V0ID0gMTtcclxuXHRcdH1cclxuXHRcdHRoaXMuX2FscGhhID0gMDtcclxuXHRcdHRoaXMuX2ZyYW1lbm8gPSAwO1xyXG5cdFx0dGhpcy5fdGljaygwKTtcclxuXHR9LFxyXG5cdFxyXG5cdHNldFRpbWVvdXQ6IGZ1bmN0aW9uKHRvKSB7XHJcblx0XHR0aGlzLnRpbWVvdXQgPSB0bztcclxuXHR9LFxyXG5cdFxyXG5cdF9zaG93X2NhbGxiYWNrOiBudWxsLFxyXG5cdF9oaWRlX2NhbGxiYWNrOiBudWxsLFxyXG5cdF9vcGFjaXR5X2Rlc3Q6IDAsXHJcblx0X29wYWNpdHlfY3VycjogMCxcclxuXHRzaG93OiBmdW5jdGlvbihjYWxsYmFjaykge1xyXG5cdFx0Ly8gdGhpcy52aXNpYmxlID0gdHJ1ZTtcclxuXHRcdHRoaXMuX29wYWNpdHlfZGVzdCA9IDE7XHJcblx0XHR0aGlzLl9zaG93X2NhbGxiYWNrID0gY2FsbGJhY2s7XHJcblx0fSxcclxuXHRoaWRlOiBmdW5jdGlvbihjYWxsYmFjaykge1xyXG5cdFx0Ly8gdGhpcy52aXNpYmxlID0gZmFsc2U7XHJcblx0XHR0aGlzLl9vcGFjaXR5X2Rlc3QgPSAwO1xyXG5cdFx0dGhpcy5fc2hvd19jYWxsYmFjayA9IGNhbGxiYWNrO1xyXG5cdH0sXHJcblx0XHJcblx0X2FscGhhOiAwLFxyXG5cdF9mcmFtZW5vOiAwLFxyXG5cdF90aWNrOiBmdW5jdGlvbihkZWx0YSkge1xyXG5cdFx0aWYgKCF0aGlzLnR5cGUpIHJldHVybjtcclxuXHRcdHZhciBzZWxmID0gdGhpcztcclxuXHRcdHRoaXMuX2FscGhhIC09IGRlbHRhO1xyXG5cdFx0XHJcblx0XHRpZiAodGhpcy50aW1lb3V0ID4gMCkge1xyXG5cdFx0XHR0aGlzLnRpbWVvdXQgLT0gZGVsdGE7XHJcblx0XHRcdGlmICh0aGlzLnRpbWVvdXQgPCAwKSB7XHJcblx0XHRcdFx0dGhpcy5oaWRlKGZ1bmN0aW9uKCl7XHJcblx0XHRcdFx0XHRzZWxmLnJlbGVhc2UoKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHRpZiAodGhpcy5fb3BhY2l0eV9jdXJyID4gdGhpcy5fb3BhY2l0eV9kZXN0KSB7XHJcblx0XHRcdHRoaXMuX29wYWNpdHlfY3VyciAtPSAoZGVsdGEgKiBDT05GSUcuc3BlZWQuYnViYmxlcG9wKTtcclxuXHRcdFx0dGhpcy5zaHJpbmsgPSAxLXRoaXMuX29wYWNpdHlfY3VycjtcclxuXHRcdFx0dGhpcy5fbWF0Lm9wYWNpdHkgPSBNYXRoLmNsYW1wKHRoaXMuX29wYWNpdHlfY3Vycik7XHJcblx0XHRcdGlmICh0aGlzLl9vcGFjaXR5X2N1cnIgPD0gdGhpcy5fb3BhY2l0eV9kZXN0KSB7XHJcblx0XHRcdFx0aWYgKHRoaXMuX2hpZGVfY2FsbGJhY2spIHtcclxuXHRcdFx0XHRcdHRoaXMuX2hpZGVfY2FsbGJhY2soKTtcclxuXHRcdFx0XHRcdHRoaXMuX2hpZGVfY2FsbGJhY2sgPSBudWxsO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHR0aGlzLl9vcGFjaXR5X2N1cnIgPSBNYXRoLmNsYW1wKHRoaXMuX29wYWNpdHlfY3Vycik7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdGVsc2UgaWYgKHRoaXMuX29wYWNpdHlfY3VyciA8IHRoaXMuX29wYWNpdHlfZGVzdCkge1xyXG5cdFx0XHR0aGlzLl9vcGFjaXR5X2N1cnIgKz0gKGRlbHRhICogQ09ORklHLnNwZWVkLmJ1YmJsZXBvcCk7XHJcblx0XHRcdHRoaXMuc2hyaW5rID0gMS10aGlzLl9vcGFjaXR5X2N1cnI7XHJcblx0XHRcdHRoaXMuX21hdC5vcGFjaXR5ID0gTWF0aC5jbGFtcCh0aGlzLl9vcGFjaXR5X2N1cnIpO1xyXG5cdFx0XHRpZiAodGhpcy5fb3BhY2l0eV9jdXJyID49IHRoaXMuX29wYWNpdHlfZGVzdCkge1xyXG5cdFx0XHRcdGlmICh0aGlzLl9zaG93X2NhbGxiYWNrKSB7XHJcblx0XHRcdFx0XHR0aGlzLl9zaG93X2NhbGxiYWNrKCk7XHJcblx0XHRcdFx0XHR0aGlzLl9zaG93X2NhbGxiYWNrID0gbnVsbDtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0dGhpcy5fb3BhY2l0eV9jdXJyID0gTWF0aC5jbGFtcCh0aGlzLl9vcGFjaXR5X2N1cnIpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdGlmICh0aGlzLl9hbHBoYSA8PSAwKSB7XHJcblx0XHRcdHRoaXMuX2FscGhhID0gMC41O1xyXG5cdFx0XHRcclxuXHRcdFx0dGhpcy5fZnJhbWVubyA9ICh0aGlzLl9mcmFtZW5vICsgMSkgJSAyO1xyXG5cdFx0XHR2YXIgZm4gPSB0aGlzLl9mcmFtZW5vICogMjtcclxuXHRcdFx0XHJcblx0XHRcdHRoaXMuX3RleC5vZmZzZXQueCA9IHRoaXMudHlwZVtmbiAgXSAqIHRoaXMuX3RleC5yZXBlYXQueDtcclxuXHRcdFx0dGhpcy5fdGV4Lm9mZnNldC55ID0gdGhpcy50eXBlW2ZuKzFdICogdGhpcy5fdGV4LnJlcGVhdC55O1xyXG5cdFx0fVxyXG5cdH0sXHJcbn0pO1xyXG5tb2R1bGUuZXhwb3J0cy5CdWJibGVTcHJpdGUgPSBCdWJibGVTcHJpdGU7XHJcblxyXG5cclxuZnVuY3Rpb24gQnViYmxlUGxhbmVHZW9tZXRyeShvZmYpIHtcclxuXHRUSFJFRS5HZW9tZXRyeS5jYWxsKHRoaXMpO1xyXG5cdHZhciBCU0laRSA9IDAuMzg7XHJcblx0XHJcblx0dGhpcy50eXBlID0gXCJCdWJibGVQbGFuZUdlb21ldHJ5XCI7XHJcblx0dGhpcy52ZXJ0aWNlcyA9IFtcclxuXHRcdG5ldyBUSFJFRS5WZWN0b3IzKCAtQlNJWkUgKyBvZmYueCwgMS41IC0gQlNJWkUgKyBvZmYueSwgLTAuMDEgKyBvZmYueiApLFxyXG5cdFx0bmV3IFRIUkVFLlZlY3RvcjMoICBCU0laRSArIG9mZi54LCAxLjUgLSBCU0laRSArIG9mZi55LCAtMC4wMSArIG9mZi56ICksXHJcblx0XHRuZXcgVEhSRUUuVmVjdG9yMyggIEJTSVpFICsgb2ZmLngsIDEuNSArIEJTSVpFICsgb2ZmLnksIC0wLjAxICsgb2ZmLnogKSxcclxuXHRcdG5ldyBUSFJFRS5WZWN0b3IzKCAtQlNJWkUgKyBvZmYueCwgMS41ICsgQlNJWkUgKyBvZmYueSwgLTAuMDEgKyBvZmYueiApLFxyXG5cdF07XHJcblx0XHJcblx0dGhpcy5mYWNlcy5wdXNoKG5ldyBUSFJFRS5GYWNlMygwLCAxLCAyKSk7XHJcblx0dGhpcy5mYWNlcy5wdXNoKG5ldyBUSFJFRS5GYWNlMygwLCAyLCAzKSk7XHJcblx0XHJcblx0dGhpcy5mYWNlVmVydGV4VXZzWzBdLnB1c2goWyB1digwLjAwNSwgMC4wMDUpLCB1digwLjk5NSwgMC4wMDUpLCB1digwLjk5NSwgMC45OTUpIF0pO1xyXG5cdHRoaXMuZmFjZVZlcnRleFV2c1swXS5wdXNoKFsgdXYoMC4wMDUsIDAuMDA1KSwgdXYoMC45OTUsIDAuOTk1KSwgdXYoMC4wMDUsIDAuOTk1KSBdKTtcclxuXHRcclxuXHR0aGlzLm1vcnBoVGFyZ2V0cyA9IFtcclxuXHRcdHsgbmFtZTogXCJvZmZ4XCIsIHZlcnRpY2VzOiBbXHJcblx0XHRcdG5ldyBUSFJFRS5WZWN0b3IzKCAtQlNJWkUgKyBvZmYueCArIDEsIDEgLSBCU0laRSArIG9mZi55LCAtMC4wMSArIG9mZi56ICksXHJcblx0XHRcdG5ldyBUSFJFRS5WZWN0b3IzKCAgQlNJWkUgKyBvZmYueCArIDEsIDEgLSBCU0laRSArIG9mZi55LCAtMC4wMSArIG9mZi56ICksXHJcblx0XHRcdG5ldyBUSFJFRS5WZWN0b3IzKCAgQlNJWkUgKyBvZmYueCArIDEsIDEgKyBCU0laRSArIG9mZi55LCAtMC4wMSArIG9mZi56ICksXHJcblx0XHRcdG5ldyBUSFJFRS5WZWN0b3IzKCAtQlNJWkUgKyBvZmYueCArIDEsIDEgKyBCU0laRSArIG9mZi55LCAtMC4wMSArIG9mZi56ICksXHJcblx0XHRdIH0sXHJcblx0XHR7IG5hbWU6IFwiaGVpZ2h0XCIsIHZlcnRpY2VzOiBbXHJcblx0XHRcdG5ldyBUSFJFRS5WZWN0b3IzKCAtQlNJWkUgKyBvZmYueCwgMSAtIEJTSVpFICsgb2ZmLnkgKyAxLCAtMC4wMSArIG9mZi56ICksXHJcblx0XHRcdG5ldyBUSFJFRS5WZWN0b3IzKCAgQlNJWkUgKyBvZmYueCwgMSAtIEJTSVpFICsgb2ZmLnkgKyAxLCAtMC4wMSArIG9mZi56ICksXHJcblx0XHRcdG5ldyBUSFJFRS5WZWN0b3IzKCAgQlNJWkUgKyBvZmYueCwgMSArIEJTSVpFICsgb2ZmLnkgKyAxLCAtMC4wMSArIG9mZi56ICksXHJcblx0XHRcdG5ldyBUSFJFRS5WZWN0b3IzKCAtQlNJWkUgKyBvZmYueCwgMSArIEJTSVpFICsgb2ZmLnkgKyAxLCAtMC4wMSArIG9mZi56ICksXHJcblx0XHRdIH0sXHJcblx0XHR7IG5hbWU6IFwic2hyaW5rXCIsIHZlcnRpY2VzOiBbXHJcblx0XHRcdG5ldyBUSFJFRS5WZWN0b3IzKCBvZmYueCwgMSArIG9mZi55LCAtMC4wMSArIG9mZi56ICksXHJcblx0XHRcdG5ldyBUSFJFRS5WZWN0b3IzKCBvZmYueCwgMSArIG9mZi55LCAtMC4wMSArIG9mZi56ICksXHJcblx0XHRcdG5ldyBUSFJFRS5WZWN0b3IzKCBvZmYueCwgMSArIG9mZi55LCAtMC4wMSArIG9mZi56ICksXHJcblx0XHRcdG5ldyBUSFJFRS5WZWN0b3IzKCBvZmYueCwgMSArIG9mZi55LCAtMC4wMSArIG9mZi56ICksXHJcblx0XHRdIH0sXHJcblx0XTtcclxuXHRcclxuXHRmdW5jdGlvbiB1dih4LCB5KSB7IHJldHVybiBuZXcgVEhSRUUuVmVjdG9yMih4LCB5KTsgfVxyXG59XHJcbmluaGVyaXRzKEJ1YmJsZVBsYW5lR2VvbWV0cnksIFRIUkVFLkdlb21ldHJ5KTtcclxuXHJcblxyXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblxyXG5cclxuZnVuY3Rpb24gU3ByaXRlR2xvd01hdGVyaWFsKG9wdHMpIHtcclxuXHRpZiAoISh0aGlzIGluc3RhbmNlb2YgU3ByaXRlR2xvd01hdGVyaWFsKSkge1xyXG5cdFx0cmV0dXJuIG5ldyBTcHJpdGVHbG93TWF0ZXJpYWwob3B0cyk7XHJcblx0fVxyXG5cdFxyXG5cdC8vVE9ETyB3cml0ZSBpdCBzbyB3aGVuIHdlIHJlcGxhY2UgdGhlIHZhbHVlcyBoZXJlLCB3ZSByZXBsYWNlIHRoZSBvbmVzIGluIHRoZSB1bmlmb3Jtc1xyXG5cdC8vIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKHRoaXMsIHtcclxuXHQvLyBcdHV2T2Zmc2V0IDoge31cclxuXHQvLyB9KTtcclxuXHJcblx0dGhpcy5jb2xvciA9IChvcHRzLmNvbG9yIGluc3RhbmNlb2YgVEhSRUUuQ29sb3IpPyBvcHRzLmNvbG9yIDogbmV3IFRIUkVFLkNvbG9yKG9wdHMuY29sb3IpO1xyXG5cdC8vIHRoaXMub3BhY2l0eSA9IG9wdHMub3BhY2l0eSB8fCAxO1xyXG5cdFxyXG5cdHZhciBwYXJhbXMgPSB0aGlzLl9jcmVhdGVNYXRQYXJhbXMob3B0cyk7XHJcblx0VEhSRUUuU2hhZGVyTWF0ZXJpYWwuY2FsbCh0aGlzLCBwYXJhbXMpO1xyXG5cdHRoaXMudHlwZSA9IFwiU3ByaXRlR2xvd01hdGVyaWFsXCI7XHJcblx0XHJcblx0dGhpcy50cmFuc3BhcmVudCA9IChvcHRzLnRyYW5zcGFyZW50ICE9PSB1bmRlZmluZWQpPyBvcHRzLnRyYW5zcGFyZW50IDogdHJ1ZTtcclxuXHR0aGlzLmFscGhhVGVzdCA9IDAuMDU7XHJcblx0Ly8gdGhpcy5kZXB0aFdyaXRlID0gZmFsc2U7XHJcbn1cclxuaW5oZXJpdHMoU3ByaXRlR2xvd01hdGVyaWFsLCBUSFJFRS5TaGFkZXJNYXRlcmlhbCk7XHJcbmV4dGVuZChTcHJpdGVHbG93TWF0ZXJpYWwucHJvdG90eXBlLCB7XHJcblx0bWFwIDogbnVsbCxcclxuXHRcclxuXHRfY3JlYXRlTWF0UGFyYW1zIDogZnVuY3Rpb24oKSB7XHJcblx0XHR2YXIgcGFyYW1zID0ge1xyXG5cdFx0XHR1bmlmb3JtcyA6IHtcclxuXHRcdFx0XHRcImNcIjogICB7IHR5cGU6IFwiZlwiLCB2YWx1ZTogMS4wIH0sXHJcblx0XHRcdFx0XCJwXCI6ICAgeyB0eXBlOiBcImZcIiwgdmFsdWU6IDEuNCB9LFxyXG5cdFx0XHRcdGdsb3dDb2xvcjogeyB0eXBlOiBcImNcIiwgdmFsdWU6IHRoaXMuY29sb3IgfSwvL25ldyBUSFJFRS5Db2xvcigweGZmZmYwMCkgfSxcclxuXHRcdFx0XHQvLyB2aWV3VmVjdG9yOiB7IHR5cGU6IFwidjNcIiwgdmFsdWU6IGNhbWVyYS5wb3NpdGlvbiB9XHJcblx0XHRcdH0sXHJcblx0XHR9O1xyXG5cdFx0XHJcblx0XHRwYXJhbXMudmVydGV4U2hhZGVyID0gdGhpcy5fdmVydFNoYWRlcjtcclxuXHRcdHBhcmFtcy5mcmFnbWVudFNoYWRlciA9IHRoaXMuX2ZyYWdTaGFkZXI7XHJcblx0XHRwYXJhbXMuYmxlbmRpbmcgPSBUSFJFRS5BZGRpdGl2ZUJsZW5kaW5nO1xyXG5cdFx0cmV0dXJuIHBhcmFtcztcclxuXHR9LFxyXG5cdFxyXG5cdF92ZXJ0U2hhZGVyOiBbXHJcblx0XHQvLyBcInVuaWZvcm0gdmVjMyB2aWV3VmVjdG9yO1wiLFxyXG5cdFx0XCJ1bmlmb3JtIGZsb2F0IGM7XCIsXHJcblx0XHRcInVuaWZvcm0gZmxvYXQgcDtcIixcclxuXHRcdFwidmFyeWluZyBmbG9hdCBpbnRlbnNpdHk7XCIsXHJcblx0XHRcclxuXHRcdFwidm9pZCBtYWluKCkge1wiLFxyXG5cdFx0XHRcInZlYzMgdk5vcm0gPSBub3JtYWxpemUoIG5vcm1hbE1hdHJpeCAqIG5vcm1hbCApO1wiLFxyXG5cdFx0XHQvLyBcInZlYzMgdk5vcm1DYW1lcmEgPSBub3JtYWxpemUoIG5vcm1hbE1hdHJpeCAqIHZpZXdWZWN0b3IgKTtcIixcclxuXHRcdFx0XCJ2ZWMzIHZOb3JtQ2FtZXJhID0gbm9ybWFsaXplKCBub3JtYWxNYXRyaXggKiBub3JtYWxpemUoIG1vZGVsVmlld01hdHJpeCAqIHZlYzQoMCwgMCwgMSwgMSkgKS54eXogKTtcIixcclxuXHRcdFx0XCJpbnRlbnNpdHkgPSBwb3coIGMgLSBkb3Qodk5vcm0sIHZOb3JtQ2FtZXJhKSwgcCApO1wiLFxyXG5cdFx0XHRcclxuXHRcdFx0XCJnbF9Qb3NpdGlvbiA9IHByb2plY3Rpb25NYXRyaXggKiBtb2RlbFZpZXdNYXRyaXggKiB2ZWM0KCBwb3NpdGlvbiwgMS4wICk7XCIsXHJcblx0XHRcIn1cIixcclxuXHRdLmpvaW4oXCJcXG5cIiksXHJcblx0XHJcblx0X2ZyYWdTaGFkZXI6IFtcclxuXHRcdFwidW5pZm9ybSB2ZWMzIGdsb3dDb2xvcjtcIixcclxuXHRcdFwidmFyeWluZyBmbG9hdCBpbnRlbnNpdHk7XCIsXHJcblx0XHRcclxuXHRcdFwidm9pZCBtYWluKCkge1wiLFxyXG5cdFx0XHRcInZlYzMgZ2xvdyA9IGdsb3dDb2xvciAqIGludGVuc2l0eTtcIixcclxuXHRcdFx0XCJnbF9GcmFnQ29sb3IgPSB2ZWM0KCBnbG93LCAxLjAgKTtcIixcclxuXHRcdFwifVwiLFxyXG5cdF0uam9pbihcIlxcblwiKSxcclxufSk7XHJcbm1vZHVsZS5leHBvcnRzLlNwcml0ZUdsb3dNYXRlcmlhbCA9IFNwcml0ZUdsb3dNYXRlcmlhbDtcclxuIiwiLy8gdEdhbGxlcnkuanNcclxuLy8gRGVmaW5lcyB0aGUgYmFzZSBldmVudCB0aGF0IGFjdG9ycyBoYXZlIGluIHRoZSB0R2FsbGVyeSB0ZXN0IG1hcC5cclxuXHJcbnZhciBpbmhlcml0cyA9IHJlcXVpcmUoXCJpbmhlcml0c1wiKTtcclxudmFyIGV4dGVuZCA9IHJlcXVpcmUoXCJleHRlbmRcIik7XHJcblxyXG52YXIgQWN0b3IgPSByZXF1aXJlKFwidHBwLWFjdG9yXCIpO1xyXG52YXIgTWVhbmRlckJlaGF2ID0gcmVxdWlyZShcInRwcC1iZWhhdmlvclwiKS5NZWFuZGVyO1xyXG52YXIgVGFsa2luZ0JlaGF2ID0gcmVxdWlyZShcInRwcC1iZWhhdmlvclwiKS5UYWxraW5nO1xyXG5cclxuZnVuY3Rpb24gQWN0b3JHYWxhKGJhc2UsIGV4dCkge1xyXG5cdGV4dCA9IGV4dGVuZCh7XHJcblx0XHRsb2NhdGlvbjogXCJyYW5kXCIsXHJcblx0XHRvbkV2ZW50czoge1xyXG5cdFx0XHRpbnRlcmFjdGVkOiBmdW5jdGlvbigpIHtcclxuXHRcdFx0XHR2YXIgc2VsZiA9IHRoaXM7XHJcblx0XHRcdFx0JChcIiNzdGF0dXNiYXJcIikuaHRtbChcIlRoaXMgaXMgXCIrdGhpcy5uYW1lK1wiISAoXCIrdGhpcy5pZCtcIik8YnIvPlRoaXMgc3ByaXRlIHdhcyBjcmVhdGVkIGJ5IFwiK3RoaXMuc3ByaXRlX2NyZWF0b3IrXCIhXCIpO1xyXG5cdFx0XHRcdHZhciBkbG9nID0gc2VsZi5kaWFsb2cgfHwgW1xyXG5cdFx0XHRcdFx0XCJcIit0aGlzLm5hbWUrXCIgd2F2ZXMgYXQgeW91IGluIGdyZWV0aW5nIGJlZm9yZSBjb250aW51aW5nIHRvIG1lYW5kZXIgYWJvdXQgdGhlIEdhbGxlcnkuXCJcclxuXHRcdFx0XHRdO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdC8vIFVJLnNob3dUZXh0Qm94KHNlbGYuZGlhbG9nX3R5cGUsIGRsb2csIHsgY29tcGxldGU6IGZ1bmN0aW9uKCl7XHJcblx0XHRcdFx0Ly8gXHRzZWxmLmJlaGF2aW9yU3RhY2sucG9wKCk7XHJcblx0XHRcdFx0Ly8gfX0pO1xyXG5cdFx0XHRcdC8vIHNlbGYuYmVoYXZpb3JTdGFjay5wdXNoKFRhbGtpbmdCZWhhdik7XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0c2VsZi5iZWhhdmlvclN0YWNrLnB1c2gobmV3IFRhbGtpbmdCZWhhdih7XHJcblx0XHRcdFx0XHRkaWFsb2c6IGRsb2csXHJcblx0XHRcdFx0XHRkaWFsb2dfdHlwZTogc2VsZi5kaWFsb2dfdHlwZSxcclxuXHRcdFx0XHRcdG93bmVyOiBzZWxmLFxyXG5cdFx0XHRcdH0pKTtcclxuXHRcdFx0fSxcclxuXHRcdH0sXHJcblx0XHRcclxuXHRcdGRpYWxvZ190eXBlOiBcInRleHRcIixcclxuXHRcdGRpYWxvZzogbnVsbCxcclxuXHRcdFxyXG5cdFx0YmVoYXZpb3JTdGFjazogW25ldyBNZWFuZGVyQmVoYXYoKV0sXHJcblx0XHRcclxuXHRcdHNob3VsZEFwcGVhcjogZnVuY3Rpb24oKSB7IHJldHVybiB0cnVlOyB9LFxyXG5cdFx0XHJcblx0fSwgZXh0KTtcclxuXHRBY3Rvci5jYWxsKHRoaXMsIGJhc2UsIGV4dCk7XHJcbn1cclxuaW5oZXJpdHMoQWN0b3JHYWxhLCBBY3Rvcik7XHJcblxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBBY3RvckdhbGE7IiwiLy8gdHJpZ2dlci5qc1xyXG4vLyBEZWZpbmVzIGEgdHJpZ2dlciB0aWxlKHMpIHVzZWQgdGhyb3VnaG91dCB0aGUgcGFya1xyXG5cclxudmFyIEV2ZW50ID0gcmVxdWlyZShcInRwcC1ldmVudFwiKTtcclxudmFyIGluaGVyaXRzID0gcmVxdWlyZShcImluaGVyaXRzXCIpO1xyXG52YXIgZXh0ZW5kID0gcmVxdWlyZShcImV4dGVuZFwiKTtcclxuXHJcbi8qKlxyXG4gKiBBIHRyaWdnZXIgaXMgYSB0aWxlIHRoYXQsIHdoZW4gc3RlcHBlZCB1cG9uLCB3aWxsIHRyaWdnZXIgc29tZSBldmVudC5cclxuICogVGhlIG1vc3QgY29tbW9uIGV2ZW50IHRpZ2dlcmVkIGlzIGEgd2FycGluZyB0byBhbm90aGVyIG1hcCwgZm9yIHdoaWNoXHJcbiAqIHRoZSBzdWJjbGFzcyBXYXJwIGlzIGRlc2lnbmVkIGZvci5cclxuICpcclxuICogVHJpZ2dlcnMgbWF5IHRha2UgdXAgbW9yZSB0aGFuIG9uZSBzcGFjZS5cclxuICovXHJcbmZ1bmN0aW9uIFRyaWdnZXIoYmFzZSwgb3B0cykge1xyXG5cdEV2ZW50LmNhbGwodGhpcywgYmFzZSwgb3B0cyk7XHJcblxyXG5cdHRoaXMub24oXCJlbnRlcmluZy10aWxlXCIsIHRoaXMub25FbnRlcmluZyk7XHRcclxuXHR0aGlzLm9uKFwiZW50ZXJlZC10aWxlXCIsIHRoaXMub25FbnRlcmVkKTtcclxuXHR0aGlzLm9uKFwibGVhdmluZy10aWxlXCIsIHRoaXMub25MZWF2aW5nKTtcclxuXHR0aGlzLm9uKFwibGVmdC10aWxlXCIsIHRoaXMub25MZWZ0KTtcclxufVxyXG5pbmhlcml0cyhUcmlnZ2VyLCBFdmVudCk7XHJcbmV4dGVuZChUcmlnZ2VyLnByb3RvdHlwZSwge1xyXG5cdC8vY29udmllbmNlIGZ1bmN0aW9uc1xyXG5cdG9uTGVhdmVUb05vcnRoOiBudWxsLFxyXG5cdG9uTGVhdmVUb1NvdXRoOiBudWxsLFxyXG5cdG9uTGVhdmVUb0Vhc3Q6IG51bGwsXHJcblx0b25MZWF2ZVRvV2VzdDogbnVsbCxcclxuXHRcclxuXHRvbkVudGVyaW5nIDogZnVuY3Rpb24oZGlyKSB7fSxcclxuXHRvbkxlZnQgOiBmdW5jdGlvbihkaXIpIHt9LFxyXG5cdFxyXG5cdG9uRW50ZXJlZCA6IGZ1bmN0aW9uKGRpcikge1xyXG5cdFx0aWYgKHR5cGVvZiB0aGlzLm9uVHJpZ2dlckVudGVyID09IFwiZnVuY3Rpb25cIilcclxuXHRcdFx0dGhpcy5vblRyaWdnZXJFbnRlcigpOyAvL2JhY2t3YXJkcyBjb21wYXRpYmlsaXR5IHRvIHJlbmFtZVxyXG5cdH0sXHJcblx0b25MZWF2aW5nIDogZnVuY3Rpb24oZGlyKSB7XHJcblx0XHRpZiAodHlwZW9mIHRoaXMub25UcmlnZ2VyTGVhdmUgPT0gXCJmdW5jdGlvblwiKVxyXG5cdFx0XHR0aGlzLm9uVHJpZ2dlckxlYXZlKCk7IC8vYmFja3dhcmRzIGNvbXBhdGliaWxpdHkgdG8gcmVuYW1lXHJcblx0XHRcclxuXHRcdHZhciBkID0gdGhpcy5kaXZpZGVGYWNpbmcoZGlyKTtcclxuXHRcdHN3aXRjaCAoZCkge1xyXG5cdFx0XHRjYXNlIFwiblwiOiBpZiAodHlwZW9mIHRoaXMub25MZWF2ZVRvTm9ydGggPT0gXCJmdW5jdGlvblwiKSB0aGlzLm9uTGVhdmVUb05vcnRoKCk7IGJyZWFrO1xyXG5cdFx0XHRjYXNlIFwic1wiOiBpZiAodHlwZW9mIHRoaXMub25MZWF2ZVRvU291dGggPT0gXCJmdW5jdGlvblwiKSB0aGlzLm9uTGVhdmVUb1NvdXRoKCk7IGJyZWFrO1xyXG5cdFx0XHRjYXNlIFwiZVwiOiBpZiAodHlwZW9mIHRoaXMub25MZWF2ZVRvRWFzdCA9PSBcImZ1bmN0aW9uXCIpIHRoaXMub25MZWF2ZVRvRWFzdCgpOyBicmVhaztcclxuXHRcdFx0Y2FzZSBcIndcIjogaWYgKHR5cGVvZiB0aGlzLm9uTGVhdmVUb1dlc3QgPT0gXCJmdW5jdGlvblwiKSB0aGlzLm9uTGVhdmVUb1dlc3QoKTsgYnJlYWs7XHJcblx0XHR9XHJcblx0fSxcclxufSk7XHJcbm1vZHVsZS5leHBvcnRzID0gVHJpZ2dlcjtcclxuIiwiLy8gd2FycC5qc1xyXG4vLyBEZWZpbmVzIGEgd2FycCB0aWxlIHVzZWQgdGhyb3VnaG91dCB0aGUgcGFyay5cclxuXHJcbnZhciBUcmlnZ2VyID0gcmVxdWlyZShcInRwcC10cmlnZ2VyXCIpO1xyXG52YXIgaW5oZXJpdHMgPSByZXF1aXJlKFwiaW5oZXJpdHNcIik7XHJcbnZhciBleHRlbmQgPSByZXF1aXJlKFwiZXh0ZW5kXCIpO1xyXG5cclxuLyoqXHJcbiAqIEEgd2FycCBpcyBhbiBldmVudCB0aGF0LCB3aGVuIHdhbGtlZCB1cG9uLCB3aWxsIHRha2UgdGhlIHBsYXllciB0byBhbm90aGVyIG1hcCBvclxyXG4gKiBhcmVhIHdpdGhpbiB0aGUgc2FtZSBtYXAuIERpZmZlcmVudCB0eXBlcyBvZiB3YXJwcyBleGlzdCwgcmFuZ2luZyBmcm9tIHRoZSBzdGFuZGFyZFxyXG4gKiBkb29yIHdhcnAgdG8gdGhlIHRlbGVwb3J0IHdhcnAuIFdhcnBzIGNhbiBiZSB0b2xkIHRvIGFjdGl2YXRlIHVwb24gc3RlcHBpbmcgdXBvbiB0aGVtXHJcbiAqIG9yIGFjdGl2YXRlIHVwb24gc3RlcHBpbmcgb2ZmIGEgY2VydGFpbiBkaXJlY3Rpb24uXHJcbiAqL1xyXG5mdW5jdGlvbiBXYXJwKGJhc2UsIG9wdHMpIHtcclxuXHRUcmlnZ2VyLmNhbGwodGhpcywgYmFzZSwgb3B0cyk7XHJcblx0XHJcbn1cclxuaW5oZXJpdHMoV2FycCwgVHJpZ2dlcik7XHJcbmV4dGVuZChXYXJwLnByb3RvdHlwZSwge1xyXG5cdHNvdW5kOiBcImV4aXRfd2Fsa1wiLFxyXG5cdGV4aXRfdG86IG51bGwsXHJcblx0XHJcblx0b25UcmlnZ2VyRW50ZXIgOiBmdW5jdGlvbihkaXIpIHtcclxuXHRcdFNvdW5kTWFuYWdlci5wbGF5U291bmQodGhpcy5zb3VuZCk7XHJcblx0XHRpZiAoIXRoaXMuZXhpdF90bykgcmV0dXJuO1xyXG5cdFx0TWFwTWFuYWdlci50cmFuc2l0aW9uVG8odGhpcy5leGl0X3RvLm1hcCwgdGhpcy5leGl0X3RvLndhcnApO1xyXG5cdH0sXHJcbn0pO1xyXG5tb2R1bGUuZXhwb3J0cyA9IFdhcnA7Il19
