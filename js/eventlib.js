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
			state.speed = 1; //enforce a jumping speed of 1
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
					self.__ui_fired = false;
				},
			});
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlc1xcYnJvd3NlcmlmeVxcbm9kZV9tb2R1bGVzXFxicm93c2VyLXBhY2tcXF9wcmVsdWRlLmpzIiwibm9kZV9tb2R1bGVzXFxicm93c2VyaWZ5XFxub2RlX21vZHVsZXNcXGV2ZW50c1xcZXZlbnRzLmpzIiwibm9kZV9tb2R1bGVzXFxleHRlbmRcXGluZGV4LmpzIiwibm9kZV9tb2R1bGVzXFxpbmhlcml0c1xcaW5oZXJpdHNfYnJvd3Nlci5qcyIsInNyY1xcanNcXGV2ZW50c1xcYWN0b3JfYW5pbWF0aW9ucyIsInNyY1xcanNcXGV2ZW50c1xcYWN0b3IiLCJzcmNcXGpzXFxldmVudHNcXGJlaGF2aW9yIiwic3JjXFxqc1xcbWFuYWdlcnNcXGNvbnRyb2xsZXIiLCJzcmNcXGpzXFxldmVudHNcXGV2ZW50Iiwic3JjXFxqc1xcZXZlbnRzXFxwbGF5ZXItY2hhcmFjdGVyIiwic3JjXFxqc1xcbW9kZWxcXHNwcml0ZW1vZGVsIiwic3JjXFxqc1xcZXZlbnRzXFx0R2FsbGVyeSIsInNyY1xcanNcXGV2ZW50c1xcdHJpZ2dlciIsInNyY1xcanNcXGV2ZW50c1xcd2FycCJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN1NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN1NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5bkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN01BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM09BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMWpCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbmZ1bmN0aW9uIEV2ZW50RW1pdHRlcigpIHtcbiAgdGhpcy5fZXZlbnRzID0gdGhpcy5fZXZlbnRzIHx8IHt9O1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSB0aGlzLl9tYXhMaXN0ZW5lcnMgfHwgdW5kZWZpbmVkO1xufVxubW9kdWxlLmV4cG9ydHMgPSBFdmVudEVtaXR0ZXI7XG5cbi8vIEJhY2t3YXJkcy1jb21wYXQgd2l0aCBub2RlIDAuMTAueFxuRXZlbnRFbWl0dGVyLkV2ZW50RW1pdHRlciA9IEV2ZW50RW1pdHRlcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fZXZlbnRzID0gdW5kZWZpbmVkO1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fbWF4TGlzdGVuZXJzID0gdW5kZWZpbmVkO1xuXG4vLyBCeSBkZWZhdWx0IEV2ZW50RW1pdHRlcnMgd2lsbCBwcmludCBhIHdhcm5pbmcgaWYgbW9yZSB0aGFuIDEwIGxpc3RlbmVycyBhcmVcbi8vIGFkZGVkIHRvIGl0LiBUaGlzIGlzIGEgdXNlZnVsIGRlZmF1bHQgd2hpY2ggaGVscHMgZmluZGluZyBtZW1vcnkgbGVha3MuXG5FdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycyA9IDEwO1xuXG4vLyBPYnZpb3VzbHkgbm90IGFsbCBFbWl0dGVycyBzaG91bGQgYmUgbGltaXRlZCB0byAxMC4gVGhpcyBmdW5jdGlvbiBhbGxvd3Ncbi8vIHRoYXQgdG8gYmUgaW5jcmVhc2VkLiBTZXQgdG8gemVybyBmb3IgdW5saW1pdGVkLlxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5zZXRNYXhMaXN0ZW5lcnMgPSBmdW5jdGlvbihuKSB7XG4gIGlmICghaXNOdW1iZXIobikgfHwgbiA8IDAgfHwgaXNOYU4obikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCduIG11c3QgYmUgYSBwb3NpdGl2ZSBudW1iZXInKTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gbjtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBlciwgaGFuZGxlciwgbGVuLCBhcmdzLCBpLCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gSWYgdGhlcmUgaXMgbm8gJ2Vycm9yJyBldmVudCBsaXN0ZW5lciB0aGVuIHRocm93LlxuICBpZiAodHlwZSA9PT0gJ2Vycm9yJykge1xuICAgIGlmICghdGhpcy5fZXZlbnRzLmVycm9yIHx8XG4gICAgICAgIChpc09iamVjdCh0aGlzLl9ldmVudHMuZXJyb3IpICYmICF0aGlzLl9ldmVudHMuZXJyb3IubGVuZ3RoKSkge1xuICAgICAgZXIgPSBhcmd1bWVudHNbMV07XG4gICAgICBpZiAoZXIgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgICB0aHJvdyBlcjsgLy8gVW5oYW5kbGVkICdlcnJvcicgZXZlbnRcbiAgICAgIH1cbiAgICAgIHRocm93IFR5cGVFcnJvcignVW5jYXVnaHQsIHVuc3BlY2lmaWVkIFwiZXJyb3JcIiBldmVudC4nKTtcbiAgICB9XG4gIH1cblxuICBoYW5kbGVyID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIGlmIChpc1VuZGVmaW5lZChoYW5kbGVyKSlcbiAgICByZXR1cm4gZmFsc2U7XG5cbiAgaWYgKGlzRnVuY3Rpb24oaGFuZGxlcikpIHtcbiAgICBzd2l0Y2ggKGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIC8vIGZhc3QgY2FzZXNcbiAgICAgIGNhc2UgMTpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAzOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdLCBhcmd1bWVudHNbMl0pO1xuICAgICAgICBicmVhaztcbiAgICAgIC8vIHNsb3dlclxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICAgICAgYXJncyA9IG5ldyBBcnJheShsZW4gLSAxKTtcbiAgICAgICAgZm9yIChpID0gMTsgaSA8IGxlbjsgaSsrKVxuICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICBoYW5kbGVyLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH1cbiAgfSBlbHNlIGlmIChpc09iamVjdChoYW5kbGVyKSkge1xuICAgIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgYXJncyA9IG5ldyBBcnJheShsZW4gLSAxKTtcbiAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcblxuICAgIGxpc3RlbmVycyA9IGhhbmRsZXIuc2xpY2UoKTtcbiAgICBsZW4gPSBsaXN0ZW5lcnMubGVuZ3RoO1xuICAgIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKylcbiAgICAgIGxpc3RlbmVyc1tpXS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBtO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBUbyBhdm9pZCByZWN1cnNpb24gaW4gdGhlIGNhc2UgdGhhdCB0eXBlID09PSBcIm5ld0xpc3RlbmVyXCIhIEJlZm9yZVxuICAvLyBhZGRpbmcgaXQgdG8gdGhlIGxpc3RlbmVycywgZmlyc3QgZW1pdCBcIm5ld0xpc3RlbmVyXCIuXG4gIGlmICh0aGlzLl9ldmVudHMubmV3TGlzdGVuZXIpXG4gICAgdGhpcy5lbWl0KCduZXdMaXN0ZW5lcicsIHR5cGUsXG4gICAgICAgICAgICAgIGlzRnVuY3Rpb24obGlzdGVuZXIubGlzdGVuZXIpID9cbiAgICAgICAgICAgICAgbGlzdGVuZXIubGlzdGVuZXIgOiBsaXN0ZW5lcik7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgLy8gT3B0aW1pemUgdGhlIGNhc2Ugb2Ygb25lIGxpc3RlbmVyLiBEb24ndCBuZWVkIHRoZSBleHRyYSBhcnJheSBvYmplY3QuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gbGlzdGVuZXI7XG4gIGVsc2UgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgLy8gSWYgd2UndmUgYWxyZWFkeSBnb3QgYW4gYXJyYXksIGp1c3QgYXBwZW5kLlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5wdXNoKGxpc3RlbmVyKTtcbiAgZWxzZVxuICAgIC8vIEFkZGluZyB0aGUgc2Vjb25kIGVsZW1lbnQsIG5lZWQgdG8gY2hhbmdlIHRvIGFycmF5LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IFt0aGlzLl9ldmVudHNbdHlwZV0sIGxpc3RlbmVyXTtcblxuICAvLyBDaGVjayBmb3IgbGlzdGVuZXIgbGVha1xuICBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSAmJiAhdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCkge1xuICAgIHZhciBtO1xuICAgIGlmICghaXNVbmRlZmluZWQodGhpcy5fbWF4TGlzdGVuZXJzKSkge1xuICAgICAgbSA9IHRoaXMuX21heExpc3RlbmVycztcbiAgICB9IGVsc2Uge1xuICAgICAgbSA9IEV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzO1xuICAgIH1cblxuICAgIGlmIChtICYmIG0gPiAwICYmIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGggPiBtKSB7XG4gICAgICB0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkID0gdHJ1ZTtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJyhub2RlKSB3YXJuaW5nOiBwb3NzaWJsZSBFdmVudEVtaXR0ZXIgbWVtb3J5ICcgK1xuICAgICAgICAgICAgICAgICAgICAnbGVhayBkZXRlY3RlZC4gJWQgbGlzdGVuZXJzIGFkZGVkLiAnICtcbiAgICAgICAgICAgICAgICAgICAgJ1VzZSBlbWl0dGVyLnNldE1heExpc3RlbmVycygpIHRvIGluY3JlYXNlIGxpbWl0LicsXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGgpO1xuICAgICAgaWYgKHR5cGVvZiBjb25zb2xlLnRyYWNlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIC8vIG5vdCBzdXBwb3J0ZWQgaW4gSUUgMTBcbiAgICAgICAgY29uc29sZS50cmFjZSgpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbiA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub25jZSA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICB2YXIgZmlyZWQgPSBmYWxzZTtcblxuICBmdW5jdGlvbiBnKCkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgZyk7XG5cbiAgICBpZiAoIWZpcmVkKSB7XG4gICAgICBmaXJlZCA9IHRydWU7XG4gICAgICBsaXN0ZW5lci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgfVxuXG4gIGcubGlzdGVuZXIgPSBsaXN0ZW5lcjtcbiAgdGhpcy5vbih0eXBlLCBnKTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8vIGVtaXRzIGEgJ3JlbW92ZUxpc3RlbmVyJyBldmVudCBpZmYgdGhlIGxpc3RlbmVyIHdhcyByZW1vdmVkXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIGxpc3QsIHBvc2l0aW9uLCBsZW5ndGgsIGk7XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgbGlzdCA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgbGVuZ3RoID0gbGlzdC5sZW5ndGg7XG4gIHBvc2l0aW9uID0gLTE7XG5cbiAgaWYgKGxpc3QgPT09IGxpc3RlbmVyIHx8XG4gICAgICAoaXNGdW5jdGlvbihsaXN0Lmxpc3RlbmVyKSAmJiBsaXN0Lmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcbiAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuXG4gIH0gZWxzZSBpZiAoaXNPYmplY3QobGlzdCkpIHtcbiAgICBmb3IgKGkgPSBsZW5ndGg7IGktLSA+IDA7KSB7XG4gICAgICBpZiAobGlzdFtpXSA9PT0gbGlzdGVuZXIgfHxcbiAgICAgICAgICAobGlzdFtpXS5saXN0ZW5lciAmJiBsaXN0W2ldLmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcbiAgICAgICAgcG9zaXRpb24gPSBpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAocG9zaXRpb24gPCAwKVxuICAgICAgcmV0dXJuIHRoaXM7XG5cbiAgICBpZiAobGlzdC5sZW5ndGggPT09IDEpIHtcbiAgICAgIGxpc3QubGVuZ3RoID0gMDtcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgfSBlbHNlIHtcbiAgICAgIGxpc3Quc3BsaWNlKHBvc2l0aW9uLCAxKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBrZXksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICByZXR1cm4gdGhpcztcblxuICAvLyBub3QgbGlzdGVuaW5nIGZvciByZW1vdmVMaXN0ZW5lciwgbm8gbmVlZCB0byBlbWl0XG4gIGlmICghdGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApXG4gICAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICBlbHNlIGlmICh0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLy8gZW1pdCByZW1vdmVMaXN0ZW5lciBmb3IgYWxsIGxpc3RlbmVycyBvbiBhbGwgZXZlbnRzXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgZm9yIChrZXkgaW4gdGhpcy5fZXZlbnRzKSB7XG4gICAgICBpZiAoa2V5ID09PSAncmVtb3ZlTGlzdGVuZXInKSBjb250aW51ZTtcbiAgICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKGtleSk7XG4gICAgfVxuICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKCdyZW1vdmVMaXN0ZW5lcicpO1xuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgbGlzdGVuZXJzID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGxpc3RlbmVycykpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVycyk7XG4gIH0gZWxzZSB7XG4gICAgLy8gTElGTyBvcmRlclxuICAgIHdoaWxlIChsaXN0ZW5lcnMubGVuZ3RoKVxuICAgICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnNbbGlzdGVuZXJzLmxlbmd0aCAtIDFdKTtcbiAgfVxuICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciByZXQ7XG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0ID0gW107XG4gIGVsc2UgaWYgKGlzRnVuY3Rpb24odGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSBbdGhpcy5fZXZlbnRzW3R5cGVdXTtcbiAgZWxzZVxuICAgIHJldCA9IHRoaXMuX2V2ZW50c1t0eXBlXS5zbGljZSgpO1xuICByZXR1cm4gcmV0O1xufTtcblxuRXZlbnRFbWl0dGVyLmxpc3RlbmVyQ291bnQgPSBmdW5jdGlvbihlbWl0dGVyLCB0eXBlKSB7XG4gIHZhciByZXQ7XG4gIGlmICghZW1pdHRlci5fZXZlbnRzIHx8ICFlbWl0dGVyLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0ID0gMDtcbiAgZWxzZSBpZiAoaXNGdW5jdGlvbihlbWl0dGVyLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IDE7XG4gIGVsc2VcbiAgICByZXQgPSBlbWl0dGVyLl9ldmVudHNbdHlwZV0ubGVuZ3RoO1xuICByZXR1cm4gcmV0O1xufTtcblxuZnVuY3Rpb24gaXNGdW5jdGlvbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdmdW5jdGlvbic7XG59XG5cbmZ1bmN0aW9uIGlzTnVtYmVyKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ251bWJlcic7XG59XG5cbmZ1bmN0aW9uIGlzT2JqZWN0KGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ29iamVjdCcgJiYgYXJnICE9PSBudWxsO1xufVxuXG5mdW5jdGlvbiBpc1VuZGVmaW5lZChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gdm9pZCAwO1xufVxuIiwidmFyIGhhc093biA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG52YXIgdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xudmFyIHVuZGVmaW5lZDtcblxudmFyIGlzUGxhaW5PYmplY3QgPSBmdW5jdGlvbiBpc1BsYWluT2JqZWN0KG9iaikge1xuXHQndXNlIHN0cmljdCc7XG5cdGlmICghb2JqIHx8IHRvU3RyaW5nLmNhbGwob2JqKSAhPT0gJ1tvYmplY3QgT2JqZWN0XScpIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblxuXHR2YXIgaGFzX293bl9jb25zdHJ1Y3RvciA9IGhhc093bi5jYWxsKG9iaiwgJ2NvbnN0cnVjdG9yJyk7XG5cdHZhciBoYXNfaXNfcHJvcGVydHlfb2ZfbWV0aG9kID0gb2JqLmNvbnN0cnVjdG9yICYmIG9iai5jb25zdHJ1Y3Rvci5wcm90b3R5cGUgJiYgaGFzT3duLmNhbGwob2JqLmNvbnN0cnVjdG9yLnByb3RvdHlwZSwgJ2lzUHJvdG90eXBlT2YnKTtcblx0Ly8gTm90IG93biBjb25zdHJ1Y3RvciBwcm9wZXJ0eSBtdXN0IGJlIE9iamVjdFxuXHRpZiAob2JqLmNvbnN0cnVjdG9yICYmICFoYXNfb3duX2NvbnN0cnVjdG9yICYmICFoYXNfaXNfcHJvcGVydHlfb2ZfbWV0aG9kKSB7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cblx0Ly8gT3duIHByb3BlcnRpZXMgYXJlIGVudW1lcmF0ZWQgZmlyc3RseSwgc28gdG8gc3BlZWQgdXAsXG5cdC8vIGlmIGxhc3Qgb25lIGlzIG93biwgdGhlbiBhbGwgcHJvcGVydGllcyBhcmUgb3duLlxuXHR2YXIga2V5O1xuXHRmb3IgKGtleSBpbiBvYmopIHt9XG5cblx0cmV0dXJuIGtleSA9PT0gdW5kZWZpbmVkIHx8IGhhc093bi5jYWxsKG9iaiwga2V5KTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZXh0ZW5kKCkge1xuXHQndXNlIHN0cmljdCc7XG5cdHZhciBvcHRpb25zLCBuYW1lLCBzcmMsIGNvcHksIGNvcHlJc0FycmF5LCBjbG9uZSxcblx0XHR0YXJnZXQgPSBhcmd1bWVudHNbMF0sXG5cdFx0aSA9IDEsXG5cdFx0bGVuZ3RoID0gYXJndW1lbnRzLmxlbmd0aCxcblx0XHRkZWVwID0gZmFsc2U7XG5cblx0Ly8gSGFuZGxlIGEgZGVlcCBjb3B5IHNpdHVhdGlvblxuXHRpZiAodHlwZW9mIHRhcmdldCA9PT0gJ2Jvb2xlYW4nKSB7XG5cdFx0ZGVlcCA9IHRhcmdldDtcblx0XHR0YXJnZXQgPSBhcmd1bWVudHNbMV0gfHwge307XG5cdFx0Ly8gc2tpcCB0aGUgYm9vbGVhbiBhbmQgdGhlIHRhcmdldFxuXHRcdGkgPSAyO1xuXHR9IGVsc2UgaWYgKCh0eXBlb2YgdGFyZ2V0ICE9PSAnb2JqZWN0JyAmJiB0eXBlb2YgdGFyZ2V0ICE9PSAnZnVuY3Rpb24nKSB8fCB0YXJnZXQgPT0gbnVsbCkge1xuXHRcdHRhcmdldCA9IHt9O1xuXHR9XG5cblx0Zm9yICg7IGkgPCBsZW5ndGg7ICsraSkge1xuXHRcdG9wdGlvbnMgPSBhcmd1bWVudHNbaV07XG5cdFx0Ly8gT25seSBkZWFsIHdpdGggbm9uLW51bGwvdW5kZWZpbmVkIHZhbHVlc1xuXHRcdGlmIChvcHRpb25zICE9IG51bGwpIHtcblx0XHRcdC8vIEV4dGVuZCB0aGUgYmFzZSBvYmplY3Rcblx0XHRcdGZvciAobmFtZSBpbiBvcHRpb25zKSB7XG5cdFx0XHRcdHNyYyA9IHRhcmdldFtuYW1lXTtcblx0XHRcdFx0Y29weSA9IG9wdGlvbnNbbmFtZV07XG5cblx0XHRcdFx0Ly8gUHJldmVudCBuZXZlci1lbmRpbmcgbG9vcFxuXHRcdFx0XHRpZiAodGFyZ2V0ID09PSBjb3B5KSB7XG5cdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyBSZWN1cnNlIGlmIHdlJ3JlIG1lcmdpbmcgcGxhaW4gb2JqZWN0cyBvciBhcnJheXNcblx0XHRcdFx0aWYgKGRlZXAgJiYgY29weSAmJiAoaXNQbGFpbk9iamVjdChjb3B5KSB8fCAoY29weUlzQXJyYXkgPSBBcnJheS5pc0FycmF5KGNvcHkpKSkpIHtcblx0XHRcdFx0XHRpZiAoY29weUlzQXJyYXkpIHtcblx0XHRcdFx0XHRcdGNvcHlJc0FycmF5ID0gZmFsc2U7XG5cdFx0XHRcdFx0XHRjbG9uZSA9IHNyYyAmJiBBcnJheS5pc0FycmF5KHNyYykgPyBzcmMgOiBbXTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0Y2xvbmUgPSBzcmMgJiYgaXNQbGFpbk9iamVjdChzcmMpID8gc3JjIDoge307XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0Ly8gTmV2ZXIgbW92ZSBvcmlnaW5hbCBvYmplY3RzLCBjbG9uZSB0aGVtXG5cdFx0XHRcdFx0dGFyZ2V0W25hbWVdID0gZXh0ZW5kKGRlZXAsIGNsb25lLCBjb3B5KTtcblxuXHRcdFx0XHQvLyBEb24ndCBicmluZyBpbiB1bmRlZmluZWQgdmFsdWVzXG5cdFx0XHRcdH0gZWxzZSBpZiAoY29weSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdFx0dGFyZ2V0W25hbWVdID0gY29weTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdC8vIFJldHVybiB0aGUgbW9kaWZpZWQgb2JqZWN0XG5cdHJldHVybiB0YXJnZXQ7XG59O1xuXG4iLCJpZiAodHlwZW9mIE9iamVjdC5jcmVhdGUgPT09ICdmdW5jdGlvbicpIHtcbiAgLy8gaW1wbGVtZW50YXRpb24gZnJvbSBzdGFuZGFyZCBub2RlLmpzICd1dGlsJyBtb2R1bGVcbiAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpbmhlcml0cyhjdG9yLCBzdXBlckN0b3IpIHtcbiAgICBjdG9yLnN1cGVyXyA9IHN1cGVyQ3RvclxuICAgIGN0b3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShzdXBlckN0b3IucHJvdG90eXBlLCB7XG4gICAgICBjb25zdHJ1Y3Rvcjoge1xuICAgICAgICB2YWx1ZTogY3RvcixcbiAgICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgICBjb25maWd1cmFibGU6IHRydWVcbiAgICAgIH1cbiAgICB9KTtcbiAgfTtcbn0gZWxzZSB7XG4gIC8vIG9sZCBzY2hvb2wgc2hpbSBmb3Igb2xkIGJyb3dzZXJzXG4gIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaW5oZXJpdHMoY3Rvciwgc3VwZXJDdG9yKSB7XG4gICAgY3Rvci5zdXBlcl8gPSBzdXBlckN0b3JcbiAgICB2YXIgVGVtcEN0b3IgPSBmdW5jdGlvbiAoKSB7fVxuICAgIFRlbXBDdG9yLnByb3RvdHlwZSA9IHN1cGVyQ3Rvci5wcm90b3R5cGVcbiAgICBjdG9yLnByb3RvdHlwZSA9IG5ldyBUZW1wQ3RvcigpXG4gICAgY3Rvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBjdG9yXG4gIH1cbn1cbiIsIi8vIGFjdG9yX2FuaW1hdGlvbnMuanNcclxuLy8gQSBzdWJtb2R1bGUgZm9yIHRoZSBBY3RvciBldmVudCBjbGFzcyB0aGF0IGRlYWxzIHdpdGggYW5pbWF0aW9uc1xyXG5cclxudmFyIGV4dGVuZCA9IHJlcXVpcmUoXCJleHRlbmRcIik7XHJcblxyXG5mdW5jdGlvbiBnZXRTcHJpdGVGb3JtYXQoc3RyKSB7XHJcblx0dmFyIGZvcm1hdCA9IHN0ci5zcGxpdChcIi1cIik7XHJcblx0dmFyIG5hbWUgPSBmb3JtYXRbMF07XHJcblx0dmFyIHNpemUgPSBmb3JtYXRbMV0uc3BsaXQoXCJ4XCIpO1xyXG5cdHNpemVbMV0gPSBzaXplWzFdIHx8IHNpemVbMF07XHJcblx0XHJcblx0dmFyIGJhc2UgPSB7XHJcblx0XHR3aWR0aDogc2l6ZVswXSwgaGVpZ2h0OiBzaXplWzFdLCBmbGlwOiBmYWxzZSwgXHJcblx0XHQvL3JlcGVhdHg6IDAuMjUsIHJlcGVhdHk6IDAuMjUsXHJcblx0XHRmcmFtZXM6IHtcclxuXHRcdFx0XCJ1M1wiOiBcInUwXCIsIFwiZDNcIjogXCJkMFwiLCBcImwzXCI6IFwibDBcIiwgXCJyM1wiOiBcInIwXCIsXHJcblx0XHR9LFxyXG5cdFx0YW5pbXMgOiBnZXRTdGFuZGFyZEFuaW1hdGlvbnMoKSxcclxuXHR9O1xyXG5cdFxyXG5cdHN3aXRjaCAobmFtZSkge1xyXG5cdFx0Y2FzZSBcInB0X2hvcnpyb3dcIjogXHJcblx0XHRcdHJldHVybiBleHRlbmQodHJ1ZSwgYmFzZSwgeyBcclxuXHRcdFx0XHRmcmFtZXM6IHtcclxuXHRcdFx0XHRcdFwidTBcIjogWzEsIDBdLCBcInUxXCI6IFsxLCAxXSwgXCJ1MlwiOiBbMSwgMl0sXHJcblx0XHRcdFx0XHRcImQwXCI6IFswLCAwXSwgXCJkMVwiOiBbMCwgMV0sIFwiZDJcIjogWzAsIDJdLFxyXG5cdFx0XHRcdFx0XCJsMFwiOiBbMiwgMF0sIFwibDFcIjogWzIsIDFdLCBcImwyXCI6IFsyLCAyXSxcclxuXHRcdFx0XHRcdFwicjBcIjogWzMsIDBdLCBcInIxXCI6IFszLCAxXSwgXCJyMlwiOiBbMywgMl0sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fSk7XHJcblx0XHRjYXNlIFwicHRfdmVydGNvbFwiOiBcclxuXHRcdFx0cmV0dXJuIGV4dGVuZCh0cnVlLCBiYXNlLCB7IFxyXG5cdFx0XHRcdGZyYW1lczoge1xyXG5cdFx0XHRcdFx0XCJ1MFwiOiBbMCwgMV0sIFwidTFcIjogWzEsIDFdLCBcInUyXCI6IFsyLCAxXSxcclxuXHRcdFx0XHRcdFwiZDBcIjogWzAsIDBdLCBcImQxXCI6IFsxLCAwXSwgXCJkMlwiOiBbMiwgMF0sXHJcblx0XHRcdFx0XHRcImwwXCI6IFswLCAyXSwgXCJsMVwiOiBbMSwgMl0sIFwibDJcIjogWzIsIDJdLFxyXG5cdFx0XHRcdFx0XCJyMFwiOiBbMCwgM10sIFwicjFcIjogWzEsIDNdLCBcInIyXCI6IFsyLCAzXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9KTtcclxuXHRcdGNhc2UgXCJoZ192ZXJ0bWl4XCI6IFxyXG5cdFx0XHRyZXR1cm4gZXh0ZW5kKHRydWUsIGJhc2UsIHsgXHJcblx0XHRcdFx0ZnJhbWVzOiB7XHJcblx0XHRcdFx0XHRcInUwXCI6IFswLCAwXSwgXCJ1MVwiOiBbMSwgM10sIFwidTJcIjogWzIsIDBdLFxyXG5cdFx0XHRcdFx0XCJkMFwiOiBbMiwgMV0sIFwiZDFcIjogWzIsIDJdLCBcImQyXCI6IFsyLCAzXSxcclxuXHRcdFx0XHRcdFwibDBcIjogWzAsIDJdLCBcImwxXCI6IFswLCAxXSwgXCJsMlwiOiBbMCwgM10sXHJcblx0XHRcdFx0XHRcInIwXCI6IFsxLCAwXSwgXCJyMVwiOiBbMSwgMV0sIFwicjJcIjogWzEsIDJdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH0pO1xyXG5cdFx0Y2FzZSBcImhnX3Bva2Vyb3dcIjpcclxuXHRcdFx0cmV0dXJuIGV4dGVuZCh0cnVlLCBiYXNlLCB7IFxyXG5cdFx0XHRcdGZyYW1lczogeyAvLyBwb2ludGVycyB0byBhbm90aGVyIGltYWdlIGluZGljYXRlcyB0aGF0IGltYWdlIHNob3VsZCBiZSBmbGlwcGVkLCBpZiBmbGlwPXRydWVcclxuXHRcdFx0XHRcdFwidTBcIjogbnVsbCwgXCJ1MVwiOiBbMCwgMF0sIFwidTJcIjogWzEsIDBdLFxyXG5cdFx0XHRcdFx0XCJkMFwiOiBudWxsLCBcImQxXCI6IFswLCAxXSwgXCJkMlwiOiBbMSwgMV0sXHJcblx0XHRcdFx0XHRcImwwXCI6IG51bGwsIFwibDFcIjogWzAsIDJdLCBcImwyXCI6IFsxLCAyXSxcclxuXHRcdFx0XHRcdFwicjBcIjogbnVsbCwgXCJyMVwiOiBbMCwgM10sIFwicjJcIjogWzEsIDNdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0YW5pbXM6IGdldFBva2Vtb25BbmltYXRpb25zKCksXHJcblx0XHRcdH0pO1xyXG5cdFx0Y2FzZSBcImhnX3Bva2Vyb3dfcmV2ZXJzZVwiOlxyXG5cdFx0XHRyZXR1cm4gZXh0ZW5kKHRydWUsIGJhc2UsIHsgXHJcblx0XHRcdFx0ZnJhbWVzOiB7IC8vIHBvaW50ZXJzIHRvIGFub3RoZXIgaW1hZ2UgaW5kaWNhdGVzIHRoYXQgaW1hZ2Ugc2hvdWxkIGJlIGZsaXBwZWQsIGlmIGZsaXA9dHJ1ZVxyXG5cdFx0XHRcdFx0XCJ1MFwiOiBudWxsLCBcInUxXCI6IFswLCAxXSwgXCJ1MlwiOiBbMSwgMV0sXHJcblx0XHRcdFx0XHRcImQwXCI6IG51bGwsIFwiZDFcIjogWzAsIDBdLCBcImQyXCI6IFsxLCAwXSxcclxuXHRcdFx0XHRcdFwibDBcIjogbnVsbCwgXCJsMVwiOiBbMCwgM10sIFwibDJcIjogWzEsIDNdLFxyXG5cdFx0XHRcdFx0XCJyMFwiOiBudWxsLCBcInIxXCI6IFswLCAyXSwgXCJyMlwiOiBbMSwgMl0sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRhbmltczogZ2V0UG9rZW1vbkFuaW1hdGlvbnMoKSxcclxuXHRcdFx0fSk7XHJcblx0XHRjYXNlIFwiaGdfcG9rZWNvbFwiOlxyXG5cdFx0XHRyZXR1cm4gZXh0ZW5kKHRydWUsIGJhc2UsIHsgXHJcblx0XHRcdFx0ZnJhbWVzOiB7IC8vIHBvaW50ZXJzIHRvIGFub3RoZXIgaW1hZ2UgaW5kaWNhdGVzIHRoYXQgaW1hZ2Ugc2hvdWxkIGJlIGZsaXBwZWQsIGlmIGZsaXA9dHJ1ZVxyXG5cdFx0XHRcdFx0XCJ1MFwiOiBudWxsLCBcInUxXCI6IFswLCAwXSwgXCJ1MlwiOiBbMCwgMV0sXHJcblx0XHRcdFx0XHRcImQwXCI6IG51bGwsIFwiZDFcIjogWzAsIDJdLCBcImQyXCI6IFswLCAzXSxcclxuXHRcdFx0XHRcdFwibDBcIjogbnVsbCwgXCJsMVwiOiBbMSwgMF0sIFwibDJcIjogWzEsIDFdLFxyXG5cdFx0XHRcdFx0XCJyMFwiOiBudWxsLCBcInIxXCI6IFsxLCAyXSwgXCJyMlwiOiBbMSwgM10sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRhbmltczogZ2V0UG9rZW1vbkFuaW1hdGlvbnMoKSxcclxuXHRcdFx0fSk7XHJcblx0XHRjYXNlIFwiaGdfcG9rZV9ob3J6Y29sXCI6XHJcblx0XHRcdHJldHVybiBleHRlbmQodHJ1ZSwgYmFzZSwgeyBcclxuXHRcdFx0XHRmcmFtZXM6IHsgLy8gcG9pbnRlcnMgdG8gYW5vdGhlciBpbWFnZSBpbmRpY2F0ZXMgdGhhdCBpbWFnZSBzaG91bGQgYmUgZmxpcHBlZCwgaWYgZmxpcD10cnVlXHJcblx0XHRcdFx0XHRcInUwXCI6IG51bGwsIFwidTFcIjogWzEsIDBdLCBcInUyXCI6IFsxLCAxXSxcclxuXHRcdFx0XHRcdFwiZDBcIjogbnVsbCwgXCJkMVwiOiBbMCwgMF0sIFwiZDJcIjogWzAsIDFdLFxyXG5cdFx0XHRcdFx0XCJsMFwiOiBudWxsLCBcImwxXCI6IFsyLCAwXSwgXCJsMlwiOiBbMiwgMV0sXHJcblx0XHRcdFx0XHRcInIwXCI6IG51bGwsIFwicjFcIjogWzMsIDBdLCBcInIyXCI6IFszLCAxXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdGFuaW1zOiBnZXRQb2tlbW9uQW5pbWF0aW9ucygpLFxyXG5cdFx0XHR9KTtcclxuXHRcdGNhc2UgXCJoZ19wb2tlZmxpcFwiOlxyXG5cdFx0XHRyZXR1cm4gZXh0ZW5kKHRydWUsIGJhc2UsIHsgXHJcblx0XHRcdFx0ZnJhbWVzOiB7IC8vIHBvaW50ZXJzIHRvIGFub3RoZXIgaW1hZ2UgaW5kaWNhdGVzIHRoYXQgaW1hZ2Ugc2hvdWxkIGJlIGZsaXBwZWQsIGlmIGZsaXA9dHJ1ZVxyXG5cdFx0XHRcdFx0XCJ1MFwiOiBudWxsLCBcInUxXCI6IFswLCAwXSwgXCJ1MlwiOiBbMSwgMF0sXHJcblx0XHRcdFx0XHRcImQwXCI6IG51bGwsIFwiZDFcIjogWzAsIDFdLCBcImQyXCI6IFsxLCAxXSxcclxuXHRcdFx0XHRcdFwibDBcIjogbnVsbCwgXCJsMVwiOiBbMCwgMl0sIFwibDJcIjogWzEsIDJdLFxyXG5cdFx0XHRcdFx0XCJyMFwiOiBudWxsLCBcInIxXCI6IFwibDFcIiwgICBcInIyXCI6IFwibDJcIixcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdGFuaW1zOiBnZXRQb2tlbW9uQW5pbWF0aW9ucygpLFxyXG5cdFx0XHR9KTtcclxuXHRcdGNhc2UgXCJid192ZXJ0cm93XCI6XHJcblx0XHRcdHJldHVybiBleHRlbmQodHJ1ZSwgYmFzZSwgeyBcclxuXHRcdFx0XHRmcmFtZXM6IHtcclxuXHRcdFx0XHRcdFwidTBcIjogWzAsIDBdLCBcInUxXCI6IFsxLCAwXSwgXCJ1MlwiOiBbMiwgMF0sXHJcblx0XHRcdFx0XHRcImQwXCI6IFswLCAxXSwgXCJkMVwiOiBbMSwgMV0sIFwiZDJcIjogWzIsIDFdLFxyXG5cdFx0XHRcdFx0XCJsMFwiOiBbMCwgMl0sIFwibDFcIjogWzEsIDJdLCBcImwyXCI6IFsyLCAyXSxcclxuXHRcdFx0XHRcdFwicjBcIjogWzAsIDNdLCBcInIxXCI6IFsxLCAzXSwgXCJyMlwiOiBbMiwgM10sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fSk7XHJcblx0XHRjYXNlIFwiYndfaG9yemZsaXBcIjpcclxuXHRcdFx0cmV0dXJuIGV4dGVuZCh0cnVlLCBiYXNlLCB7IFxyXG5cdFx0XHRcdGZyYW1lczogeyAvLyBwb2ludGVycyB0byBhbm90aGVyIGltYWdlIGluZGljYXRlcyB0aGF0IGltYWdlIHNob3VsZCBiZSBmbGlwcGVkLCBpZiBmbGlwPXRydWVcclxuXHRcdFx0XHRcdFwidTBcIjogWzAsIDBdLCBcInUxXCI6IFsxLCAwXSwgXCJ1MlwiOiBcInUxXCIsXHJcblx0XHRcdFx0XHRcImQwXCI6IFsyLCAwXSwgXCJkMVwiOiBbMywgMF0sIFwiZDJcIjogXCJkMVwiLFxyXG5cdFx0XHRcdFx0XCJsMFwiOiBbMCwgMV0sIFwibDFcIjogWzEsIDFdLCBcImwyXCI6IFsyLCAxXSxcclxuXHRcdFx0XHRcdFwicjBcIjogXCJsMFwiLCAgIFwicjFcIjogXCJsMVwiLCAgIFwicjJcIjogXCJsMlwiLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH0pO1xyXG5cdFx0ZGVmYXVsdDpcclxuXHRcdFx0Y29uc29sZS5lcnJvcihcIk5vIHN1Y2ggU3ByaXRlIEZvcm1hdDpcIiwgbmFtZSk7XHJcblx0XHRcdHJldHVybiB7fTtcclxuXHR9XHJcbn1cclxubW9kdWxlLmV4cG9ydHMuZ2V0U3ByaXRlRm9ybWF0ID0gZ2V0U3ByaXRlRm9ybWF0O1xyXG5cclxuXHJcbmZ1bmN0aW9uIGdldFN0YW5kYXJkQW5pbWF0aW9ucygpIHtcclxuXHR2YXIgYW5pbXMgPSB7fTtcclxuXHRcclxuXHRhbmltc1tcInN0YW5kXCJdID0gbmV3IFNwcml0ZUFuaW1hdGlvbih7IHNpbmdsZUZyYW1lOiB0cnVlLCB9LCBbXHJcblx0XHR7IHU6IFwidTBcIiwgZDogXCJkMFwiLCBsOiBcImwwXCIsIHI6IFwicjBcIiwgdHJhbnM6IHRydWUsIHBhdXNlOiB0cnVlLCB9LFxyXG5cdF0pO1xyXG5cdGFuaW1zW1wid2Fsa1wiXSA9IG5ldyBTcHJpdGVBbmltYXRpb24oeyBmcmFtZUxlbmd0aDogNSwga2VlcEZyYW1lOiB0cnVlLCB9LCBbXHJcblx0XHR7IHU6IFwidTFcIiwgZDogXCJkMVwiLCBsOiBcImwxXCIsIHI6IFwicjFcIiwgfSxcclxuXHRcdHsgdTogXCJ1M1wiLCBkOiBcImQzXCIsIGw6IFwibDNcIiwgcjogXCJyM1wiLCB0cmFuczogdHJ1ZSwgfSxcclxuXHRcdHsgdTogXCJ1MlwiLCBkOiBcImQyXCIsIGw6IFwibDJcIiwgcjogXCJyMlwiLCB9LFxyXG5cdFx0eyB1OiBcInUzXCIsIGQ6IFwiZDNcIiwgbDogXCJsM1wiLCByOiBcInIzXCIsIHRyYW5zOiB0cnVlLCBsb29wVG86IDAsIH0sXHJcblx0XSk7XHJcblx0YW5pbXNbXCJidW1wXCJdID0gbmV3IFNwcml0ZUFuaW1hdGlvbih7IGZyYW1lTGVuZ3RoOiAxMCwga2VlcEZyYW1lOiB0cnVlLCB9LCBbXHJcblx0XHR7IHU6IFwidTFcIiwgZDogXCJkMVwiLCBsOiBcImwxXCIsIHI6IFwicjFcIiwgc2Z4OiBcIndhbGtfYnVtcFwiLCB9LFxyXG5cdFx0eyB1OiBcInUwXCIsIGQ6IFwiZDBcIiwgbDogXCJsMFwiLCByOiBcInIwXCIsIHRyYW5zOiB0cnVlLCB9LFxyXG5cdFx0eyB1OiBcInUyXCIsIGQ6IFwiZDJcIiwgbDogXCJsMlwiLCByOiBcInIyXCIsIHNmeDogXCJ3YWxrX2J1bXBcIiwgfSxcclxuXHRcdHsgdTogXCJ1MFwiLCBkOiBcImQwXCIsIGw6IFwibDBcIiwgcjogXCJyMFwiLCB0cmFuczogdHJ1ZSwgbG9vcFRvOiAwLCB9LFxyXG5cdF0pO1xyXG5cdGFuaW1zW1wid2FycF9hd2F5XCJdID0gbmV3IFNwcml0ZUFuaW1hdGlvbih7IHNpbmdsZURpcjogXCJkXCIgfSwgW1xyXG5cdFx0eyBkOiBcImQwXCIsIGZyYW1lTGVuZ3RoOiA4LCB9LCAvLzBcclxuXHRcdHsgZDogXCJsMFwiLCBmcmFtZUxlbmd0aDogOCwgfSxcclxuXHRcdHsgZDogXCJ1MFwiLCBmcmFtZUxlbmd0aDogOCwgfSxcclxuXHRcdHsgZDogXCJyMFwiLCBmcmFtZUxlbmd0aDogOCwgfSxcclxuXHRcdHsgZDogXCJkMFwiLCBmcmFtZUxlbmd0aDogNywgfSwgLy80XHJcblx0XHR7IGQ6IFwibDBcIiwgZnJhbWVMZW5ndGg6IDcsIH0sXHJcblx0XHR7IGQ6IFwidTBcIiwgZnJhbWVMZW5ndGg6IDcsIH0sXHJcblx0XHR7IGQ6IFwicjBcIiwgZnJhbWVMZW5ndGg6IDcsIH0sXHJcblx0XHR7IGQ6IFwiZDBcIiwgZnJhbWVMZW5ndGg6IDUsIH0sIC8vOFxyXG5cdFx0eyBkOiBcImwwXCIsIGZyYW1lTGVuZ3RoOiA1LCB9LFxyXG5cdFx0eyBkOiBcInUwXCIsIGZyYW1lTGVuZ3RoOiA1LCB9LFxyXG5cdFx0eyBkOiBcInIwXCIsIGZyYW1lTGVuZ3RoOiA1LCB9LFxyXG5cdFx0eyBkOiBcImQwXCIsIGZyYW1lTGVuZ3RoOiAzLCB9LCAvLzEyXHJcblx0XHR7IGQ6IFwibDBcIiwgZnJhbWVMZW5ndGg6IDMsIH0sXHJcblx0XHR7IGQ6IFwidTBcIiwgZnJhbWVMZW5ndGg6IDMsIH0sXHJcblx0XHR7IGQ6IFwicjBcIiwgZnJhbWVMZW5ndGg6IDMsIH0sXHJcblx0XHR7IGQ6IFwiZDBcIiwgZnJhbWVMZW5ndGg6IDEsIH0sIC8vMTZcclxuXHRcdHsgZDogXCJsMFwiLCBmcmFtZUxlbmd0aDogMSwgfSxcclxuXHRcdHsgZDogXCJ1MFwiLCBmcmFtZUxlbmd0aDogMSwgfSxcclxuXHRcdHsgZDogXCJyMFwiLCBmcmFtZUxlbmd0aDogMSwgfSxcclxuXHRcdHsgZDogXCJkMFwiLCBmcmFtZUxlbmd0aDogMCwgdHJhbnM6IHRydWUsIH0sIC8vMjBcclxuXHRcdHsgZDogXCJsMFwiLCBmcmFtZUxlbmd0aDogMCwgdHJhbnM6IHRydWUsIH0sXHJcblx0XHR7IGQ6IFwidTBcIiwgZnJhbWVMZW5ndGg6IDAsIHRyYW5zOiB0cnVlLCB9LFxyXG5cdFx0eyBkOiBcInIwXCIsIGZyYW1lTGVuZ3RoOiAwLCB0cmFuczogdHJ1ZSwgbG9vcFRvOiAyMCB9LFxyXG5cdF0pO1xyXG5cdGFuaW1zW1wid2FycF9pblwiXSA9IG5ldyBTcHJpdGVBbmltYXRpb24oeyBzaW5nbGVEaXI6IFwiZFwiIH0sIFtcclxuXHRcdHsgZDogXCJkMFwiLCBmcmFtZUxlbmd0aDogMSwgfSwgLy8wXHJcblx0XHR7IGQ6IFwicjBcIiwgZnJhbWVMZW5ndGg6IDEsIH0sXHJcblx0XHR7IGQ6IFwidTBcIiwgZnJhbWVMZW5ndGg6IDEsIH0sXHJcblx0XHR7IGQ6IFwibDBcIiwgZnJhbWVMZW5ndGg6IDEsIH0sXHJcblx0XHR7IGQ6IFwiZDBcIiwgZnJhbWVMZW5ndGg6IDMsIH0sIC8vNFxyXG5cdFx0eyBkOiBcInIwXCIsIGZyYW1lTGVuZ3RoOiAzLCB9LFxyXG5cdFx0eyBkOiBcInUwXCIsIGZyYW1lTGVuZ3RoOiAzLCB9LFxyXG5cdFx0eyBkOiBcImwwXCIsIGZyYW1lTGVuZ3RoOiAzLCB9LFxyXG5cdFx0eyBkOiBcImQwXCIsIGZyYW1lTGVuZ3RoOiA1LCB9LCAvLzhcclxuXHRcdHsgZDogXCJyMFwiLCBmcmFtZUxlbmd0aDogNSwgfSxcclxuXHRcdHsgZDogXCJ1MFwiLCBmcmFtZUxlbmd0aDogNSwgfSxcclxuXHRcdHsgZDogXCJsMFwiLCBmcmFtZUxlbmd0aDogNSwgfSxcclxuXHRcdHsgZDogXCJkMFwiLCBmcmFtZUxlbmd0aDogNywgfSwgLy8xMlxyXG5cdFx0eyBkOiBcInIwXCIsIGZyYW1lTGVuZ3RoOiA3LCB9LFxyXG5cdFx0eyBkOiBcInUwXCIsIGZyYW1lTGVuZ3RoOiA3LCB9LFxyXG5cdFx0eyBkOiBcImwwXCIsIGZyYW1lTGVuZ3RoOiA3LCB9LFxyXG5cdFx0eyBkOiBcImQwXCIsIGZyYW1lTGVuZ3RoOiA4LCB9LCAvLzE2XHJcblx0XHR7IGQ6IFwicjBcIiwgZnJhbWVMZW5ndGg6IDgsIH0sXHJcblx0XHR7IGQ6IFwidTBcIiwgZnJhbWVMZW5ndGg6IDksIH0sXHJcblx0XHR7IGQ6IFwibDBcIiwgZnJhbWVMZW5ndGg6IDksIH0sXHJcblx0XHR7IGQ6IFwiZDBcIiwgZnJhbWVMZW5ndGg6IDEsIH0sXHJcblx0XSk7XHJcblx0XHJcblx0cmV0dXJuIGFuaW1zO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRQb2tlbW9uQW5pbWF0aW9ucygpIHsgLy9PdmVycmlkZXMgU3RhbmRhcmRcclxuXHR2YXIgYW5pbXMgPSB7fTtcclxuXHRhbmltc1tcInN0YW5kXCJdID0gbmV3IFNwcml0ZUFuaW1hdGlvbih7IHNpbmdsZUZyYW1lOiB0cnVlLCB9LCBbXHJcblx0XHR7IHU6IFwidTFcIiwgZDogXCJkMVwiLCBsOiBcImwxXCIsIHI6IFwicjFcIiwgdHJhbnM6IHRydWUsIHBhdXNlOiB0cnVlLCB9LFxyXG5cdF0pO1xyXG5cdGFuaW1zW1wiX2ZsYXBfc3RhbmRcIl0gPSBuZXcgU3ByaXRlQW5pbWF0aW9uKHsgZnJhbWVMZW5ndGg6IDUsIGtlZXBGcmFtZTogdHJ1ZSwgfSwgW1xyXG5cdFx0eyB1OiBcInUxXCIsIGQ6IFwiZDFcIiwgbDogXCJsMVwiLCByOiBcInIxXCIsIHRyYW5zOiB0cnVlLCB9LFxyXG5cdFx0eyB1OiBcInUyXCIsIGQ6IFwiZDJcIiwgbDogXCJsMlwiLCByOiBcInIyXCIsIGxvb3BUbzogMCwgfSxcclxuXHRdKTtcclxuXHRhbmltc1tcIndhbGtcIl0gPSBuZXcgU3ByaXRlQW5pbWF0aW9uKHsgZnJhbWVMZW5ndGg6IDUsIGtlZXBGcmFtZTogdHJ1ZSwgfSwgW1xyXG5cdFx0eyB1OiBcInUxXCIsIGQ6IFwiZDFcIiwgbDogXCJsMVwiLCByOiBcInIxXCIsIHRyYW5zOiB0cnVlLCB9LFxyXG5cdFx0eyB1OiBcInUyXCIsIGQ6IFwiZDJcIiwgbDogXCJsMlwiLCByOiBcInIyXCIsIGxvb3BUbzogMCwgfSxcclxuXHRdKTtcclxuXHRyZXR1cm4gYW5pbXM7XHJcbn1cclxuXHJcbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblxyXG5mdW5jdGlvbiBTcHJpdGVBbmltYXRpb24ob3B0cywgZnJhbWVzKSB7XHJcblx0dGhpcy5vcHRpb25zID0gb3B0cztcclxuXHR0aGlzLmZyYW1lcyA9IGZyYW1lcztcclxuXHRcclxuXHR0aGlzLndhaXRUaW1lID0gdGhpcy5mcmFtZXNbdGhpcy5jdXJyRnJhbWVdLmZyYW1lTGVuZ3RoIHx8IHRoaXMub3B0aW9ucy5mcmFtZUxlbmd0aDtcclxufVxyXG5TcHJpdGVBbmltYXRpb24ucHJvdG90eXBlID0ge1xyXG5cdG9wdGlvbnM6IG51bGwsXHJcblx0ZnJhbWVzIDogbnVsbCxcclxuXHRcclxuXHR3YWl0VGltZSA6IDAsXHJcblx0Y3VyckZyYW1lOiAwLFxyXG5cdHNwZWVkIDogMSxcclxuXHRwYXVzZWQgOiBmYWxzZSxcclxuXHRmaW5pc2hlZDogZmFsc2UsXHJcblx0XHJcblx0cGFyZW50IDogbnVsbCxcclxuXHRcclxuXHQvKiogQWR2YW5jZWQgdGhlIGFuaW1hdGlvbiBieSB0aGUgZ2l2ZW4gYW1vdW50IG9mIGRlbHRhIHRpbWUuICovXHJcblx0YWR2YW5jZSA6IGZ1bmN0aW9uKGRlbHRhVGltZSkge1xyXG5cdFx0aWYgKHRoaXMub3B0aW9ucy5zaW5nbGVGcmFtZSkgcmV0dXJuO1xyXG5cdFx0aWYgKHRoaXMucGF1c2VkKSByZXR1cm47XHJcblx0XHRcclxuXHRcdGlmICh0aGlzLndhaXRUaW1lID4gMCkge1xyXG5cdFx0XHR0aGlzLndhaXRUaW1lIC09ICh0aGlzLnNwZWVkICogKGRlbHRhVGltZSAqIENPTkZJRy5zcGVlZC5hbmltYXRpb24pKTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHR2YXIgbG9vcCA9IHRoaXMuZnJhbWVzW3RoaXMuY3VyckZyYW1lXS5sb29wVG87XHJcblx0XHRpZiAobG9vcCAhPT0gdW5kZWZpbmVkKSB0aGlzLmN1cnJGcmFtZSA9IGxvb3A7XHJcblx0XHRlbHNlIHRoaXMuY3VyckZyYW1lKys7XHJcblx0XHRcclxuXHRcdGlmICh0aGlzLmN1cnJGcmFtZSA+PSB0aGlzLmZyYW1lcy5sZW5ndGgpIHtcclxuXHRcdFx0dGhpcy5jdXJyRnJhbWUgPSB0aGlzLmZyYW1lcy5sZW5ndGgtMTtcclxuXHRcdFx0dGhpcy5wYXVzZWQgPSB0cnVlO1xyXG5cdFx0XHR0aGlzLmZpbmlzaGVkID0gdHJ1ZTtcclxuXHRcdFx0Y29uc29sZS53YXJuKFwiQW5pbWF0aW9uIGhhcyBjb21wbGV0ZWQhXCIpO1xyXG5cdFx0XHRpZiAodGhpcy5wYXJlbnQpIHRoaXMucGFyZW50LmVtaXQoXCJhbmltLWVuZFwiLCBudWxsKTsgLy9UT0RPIHByb3ZpZGUgYW5pbSBuYW1lXHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0Ly9uZXcgZnJhbWVcclxuXHRcdFxyXG5cdFx0dGhpcy53YWl0VGltZSA9IHRoaXMuZnJhbWVzW3RoaXMuY3VyckZyYW1lXS5mcmFtZUxlbmd0aCB8fCB0aGlzLm9wdGlvbnMuZnJhbWVMZW5ndGg7XHJcblx0XHRcclxuXHRcdGlmICh0aGlzLmZyYW1lc1t0aGlzLmN1cnJGcmFtZV0ucGF1c2UpIHRoaXMucGF1c2VkID0gdHJ1ZTtcclxuXHRcdFxyXG5cdFx0aWYgKHRoaXMuZnJhbWVzW3RoaXMuY3VyckZyYW1lXS5zZngpIFxyXG5cdFx0XHRTb3VuZE1hbmFnZXIucGxheVNvdW5kKHRoaXMuZnJhbWVzW3RoaXMuY3VyckZyYW1lXS5zZngpO1xyXG5cdH0sXHJcblx0XHJcblx0LyoqIElmIHRoaXMgYW5pbWF0aW9uIGlzIG9uIGEgcGF1c2UgZnJhbWUgKi9cclxuXHRyZXN1bWUgOiBmdW5jdGlvbigpIHtcclxuXHRcdHRoaXMucGF1c2VkID0gZmFsc2U7XHJcblx0fSxcclxuXHRcclxuXHQvKiogUmVzZXQgdGhlIGFuaW1hdGlvbiBwYXJhbWV0ZXJzLiBDYWxsZWQgd2hlbiB0aGlzIGFuaW1hdGlvbiBpcyBubyBsb25nZXIgdXNlZC4gKi9cclxuXHRyZXNldCA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0dGhpcy5wYXVzZWQgPSBmYWxzZTtcclxuXHRcdGlmICh0aGlzLm9wdGlvbnMua2VlcEZyYW1lKSB7XHJcblx0XHRcdC8vIGlmIChzZWxmLmNhblRyYW5zaXRpb24oKSkge1xyXG5cdFx0XHQvLyBcdHZhciBsb29wID0gdGhpcy5mcmFtZXNbdGhpcy5jdXJyRnJhbWVdLmxvb3BUbztcclxuXHRcdFx0Ly8gXHRpZiAobG9vcCAhPT0gdW5kZWZpbmVkKSB0aGlzLmN1cnJGcmFtZSA9IGxvb3A7XHJcblx0XHRcdC8vIFx0ZWxzZSB0aGlzLmN1cnJGcmFtZSsrO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHQvLyBcdHRoaXMud2FpdFRpbWUgPSB0aGlzLmZyYW1lc1t0aGlzLmN1cnJGcmFtZV0uZnJhbWVMZW5ndGggfHwgdGhpcy5vcHRpb25zLmZyYW1lTGVuZ3RoO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHQvLyBcdGlmICh0aGlzLmZyYW1lc1t0aGlzLmN1cnJGcmFtZV0ucGF1c2UpIHRoaXMucGF1c2VkID0gdHJ1ZTtcclxuXHRcdFx0Ly8gfVxyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblx0XHR0aGlzLmZpbmlzaGVkID0gZmFsc2U7XHJcblx0XHR0aGlzLmN1cnJGcmFtZSA9IDA7XHJcblx0XHR0aGlzLndhaXRUaW1lID0gdGhpcy5mcmFtZXNbdGhpcy5jdXJyRnJhbWVdLmZyYW1lTGVuZ3RoIHx8IHRoaXMub3B0aW9ucy5mcmFtZUxlbmd0aDtcclxuXHRcdHRoaXMuc3BlZWQgPSAxO1xyXG5cdH0sXHJcblx0XHJcblx0LyoqIElmIHRoaXMgYW5pbWF0aW9uIGlzIG9uIGEgZnJhbWUgdGhhdCBjYW4gdHJhbnNpdGlvbiB0byBhbm90aGVyIGFuaW1hdGlvbi4gKi9cclxuXHRjYW5UcmFuc2l0aW9uIDogZnVuY3Rpb24oKSB7XHJcblx0XHRyZXR1cm4gdGhpcy5maW5pc2hlZCB8fCB0aGlzLmZyYW1lc1t0aGlzLmN1cnJGcmFtZV0udHJhbnM7XHJcblx0fSxcclxuXHRcclxuXHQvKiogUmV0dXJucyB0aGUgbmFtZSBvZiB0aGUgZnJhbWUgdG8gZGlzcGxheSB0aGlzIGZyYW1lLiAqL1xyXG5cdGdldEZyYW1lVG9EaXNwbGF5IDogZnVuY3Rpb24oZGlyKSB7XHJcblx0XHRpZiAodGhpcy5vcHRpb25zLnNpbmdsZURpcikgZGlyID0gdGhpcy5vcHRpb25zLnNpbmdsZURpcjtcclxuXHRcdHJldHVybiB0aGlzLmZyYW1lc1t0aGlzLmN1cnJGcmFtZV1bZGlyXTtcclxuXHR9LFxyXG59O1xyXG5tb2R1bGUuZXhwb3J0cy5TcHJpdGVBbmltYXRpb24gPSBTcHJpdGVBbmltYXRpb247IiwiLy8gYWN0b3IuanNcclxuLy8gRGVmaW5lcyB0aGUgYWN0b3IgZXZlbnQgdXNlZCB0aHJvdWdob3V0IHRoZSBwYXJrXHJcblxyXG52YXIgRXZlbnQgPSByZXF1aXJlKFwidHBwLWV2ZW50XCIpO1xyXG52YXIgaW5oZXJpdHMgPSByZXF1aXJlKFwiaW5oZXJpdHNcIik7XHJcbnZhciBleHRlbmQgPSByZXF1aXJlKFwiZXh0ZW5kXCIpO1xyXG5cclxudmFyIENoYXJhY3RlclNwcml0ZSA9IHJlcXVpcmUoXCJ0cHAtc3ByaXRlbW9kZWxcIikuQ2hhcmFjdGVyU3ByaXRlO1xyXG52YXIgU3ByaXRlR2xvd01hdGVyaWFsID0gcmVxdWlyZShcInRwcC1zcHJpdGVtb2RlbFwiKS5TcHJpdGVHbG93TWF0ZXJpYWw7XHJcbnZhciBnZXRTcHJpdGVGb3JtYXQgPSByZXF1aXJlKFwidHBwLWFjdG9yLWFuaW1hdGlvbnNcIikuZ2V0U3ByaXRlRm9ybWF0O1xyXG5cclxudmFyIEdMT0JBTF9TQ0FMRVVQID0gMS42NTtcclxudmFyIEVWRU5UX1BMQU5FX05PUk1BTCA9IG5ldyBUSFJFRS5WZWN0b3IzKDAsIDEsIDApO1xyXG4vKipcclxuICogQW4gYWN0b3IgaXMgYW55IGV2ZW50IHJlcHJlc2VudGluZyBhIHBlcnNvbiwgcG9rZW1vbiwgb3Igb3RoZXIgZW50aXR5IHRoYXRcclxuICogbWF5IG1vdmUgYXJvdW5kIGluIHRoZSB3b3JsZCBvciBmYWNlIGEgZGlyZWN0aW9uLiBBY3RvcnMgbWF5IGhhdmUgZGlmZmVyZW50XHJcbiAqIGJlaGF2aW9ycywgc29tZSBjb21tb24gb25lcyBwcmVkZWZpbmVkIGluIHRoaXMgZmlsZS5cclxuICovXHJcbmZ1bmN0aW9uIEFjdG9yKGJhc2UsIG9wdHMpIHtcclxuXHRFdmVudC5jYWxsKHRoaXMsIGJhc2UsIG9wdHMpO1xyXG5cdFxyXG5cdHRoaXMub24oXCJ0aWNrXCIsIHRoaXMuX2FjdG9yVGljayk7XHJcblx0dGhpcy5vbihcImludGVyYWN0ZWRcIiwgdGhpcy5fZG9CZWhhdmlvcl9pbnRlcmFjdCk7XHJcblx0dGhpcy5vbihcImJ1bXBlZFwiLCB0aGlzLl9kb0JlaGF2aW9yX2J1bXApO1xyXG5cdHRoaXMub24oXCJjYW50LW1vdmVcIiwgdGhpcy5fYWN0b3JCdW1wKTtcclxuXHR0aGlzLmZhY2luZyA9IG5ldyBUSFJFRS5WZWN0b3IzKDAsIDAsIDEpO1xyXG5cdFxyXG5cdHRoaXMuX2luaXRCZWhhdmlvclN0YWNrKCk7XHJcblx0XHJcblx0aWYgKHRoaXMuc2NoZWR1bGUpIHtcclxuXHRcdHRoaXMuc2NoZWR1bGUgPSBBY3RvclNjaGVkdWxlci5jcmVhdGVTY2hlZHVsZSh0aGlzLmlkLCB0aGlzLnNjaGVkdWxlKTtcclxuXHR9XHJcbn1cclxuaW5oZXJpdHMoQWN0b3IsIEV2ZW50KTtcclxuZXh0ZW5kKEFjdG9yLnByb3RvdHlwZSwge1xyXG5cdHNwcml0ZTogbnVsbCxcclxuXHRzcHJpdGVfZm9ybWF0OiBudWxsLFxyXG5cdFxyXG5cdHNoYWRvdyA6IHRydWUsXHJcblx0XHJcblx0Ly8vLy8vLy8vLy8vLy8vLyBQcm9wZXJ0eSBTZXR0ZXJzIC8vLy8vLy8vLy8vLy8vLy8vXHJcblx0c2NhbGU6IDEsXHJcblx0c2NhbGVfc2hhZG93OiAxLFxyXG5cdG9mZnNldF9zcHJpdGVfeDogMCwgXHJcblx0b2Zmc2V0X3Nwcml0ZV95OiAwLjMsXHJcblx0XHJcblx0c2V0U2NhbGUgOiBmdW5jdGlvbihzY2FsZSkge1xyXG5cdFx0dGhpcy5zY2FsZSA9IHNjYWxlO1xyXG5cdFx0c2NhbGUgKj0gR0xPQkFMX1NDQUxFVVA7XHJcblx0XHR0aGlzLmF2YXRhcl9zcHJpdGUuc2NhbGUuc2V0KHNjYWxlLCBzY2FsZSwgc2NhbGUpO1xyXG5cdFx0dGhpcy5fYXZhdGFyX3NoYWRvd2Nhc3Rlci5zY2FsZS5zZXQoXHJcblx0XHRcdHRoaXMuc2NhbGVfc2hhZG93ICogc2NhbGUsXHJcblx0XHRcdHRoaXMuc2NhbGVfc2hhZG93ICogc2NhbGUsXHJcblx0XHRcdHRoaXMuc2NhbGVfc2hhZG93ICogc2NhbGVcclxuXHRcdCk7XHJcblx0fSxcclxuXHRcclxuXHRzZXRTaGFkb3dTY2FsZSA6IGZ1bmN0aW9uKHNjYWxlKSB7XHJcblx0XHR0aGlzLnNjYWxlX3NoYWRvdyA9IHNjYWxlO1xyXG5cdFx0Ly8gc2NhbGUgKj0gR0xPQkFMX1NDQUxFVVA7XHJcblx0XHR0aGlzLl9hdmF0YXJfc2hhZG93Y2FzdGVyLnNjYWxlLnNldChcclxuXHRcdFx0dGhpcy5zY2FsZSAqIHNjYWxlLFxyXG5cdFx0XHR0aGlzLnNjYWxlICogc2NhbGUsXHJcblx0XHRcdHRoaXMuc2NhbGUgKiBzY2FsZVxyXG5cdFx0KTtcclxuXHR9LFxyXG5cdFxyXG5cdC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vIEF2YXRhciAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblx0YXZhdGFyX25vZGUgOiBudWxsLFxyXG5cdGF2YXRhcl9zcHJpdGUgOiBudWxsLFxyXG5cdGF2YXRhcl9mb3JtYXQgOiBudWxsLFxyXG5cdGF2YXRhcl90ZXggOiBudWxsLFxyXG5cdF9hdmF0YXJfc2hhZG93Y2FzdGVyIDogbnVsbCxcclxuXHRcclxuXHRnZXRBdmF0YXIgOiBmdW5jdGlvbihtYXAsIGdjKXsgXHJcblx0XHRpZiAodGhpcy5hdmF0YXJfbm9kZSkgcmV0dXJuIHRoaXMuYXZhdGFyX25vZGU7XHJcblx0XHRcclxuXHRcdHZhciBub2RlID0gdGhpcy5hdmF0YXJfbm9kZSA9IG5ldyBUSFJFRS5PYmplY3QzRCgpO1xyXG5cdFx0XHJcblx0XHRub2RlLmFkZCh0aGlzLl9hdmF0YXJfY3JlYXRlU3ByaXRlKG1hcCwgZ2MpKTtcclxuXHRcdG5vZGUuYWRkKHRoaXMuX2F2YXRhcl9jcmVhdGVTaGFkb3dDYXN0ZXIobWFwLCBnYykpO1xyXG5cdFx0Ly8gaWYgKHRoaXMuZ2xvd19jb2xvcikge1xyXG5cdFx0Ly8gXHRub2RlLmFkZCh0aGlzLl9hdmF0YXJfY3JlYXRlR2xvd0Nhc3RlcihtYXAsIGdjKSk7XHJcblx0XHQvLyB9XHJcblx0XHRcclxuXHRcdHJldHVybiBub2RlO1xyXG5cdFx0XHJcblx0fSxcclxuXHRcclxuXHRnZXRUYWxraW5nQW5jaG9yIDogZnVuY3Rpb24oKSB7XHJcblx0XHRyZXR1cm4gdGhpcy5fYXZhdGFyX3NoYWRvd2Nhc3Rlci5sb2NhbFRvV29ybGQoXHJcblx0XHRcdHRoaXMuX2F2YXRhcl9zaGFkb3djYXN0ZXIucG9zaXRpb24uY2xvbmUoKVxyXG5cdFx0KTtcclxuXHR9LFxyXG5cdFxyXG5cdF9hdmF0YXJfY3JlYXRlR2xvd0Nhc3RlcjogZnVuY3Rpb24obWFwLCBnYykge1xyXG5cdFx0dmFyIG1hdCA9IG5ldyBTcHJpdGVHbG93TWF0ZXJpYWwoe1xyXG5cdFx0XHRjb2xvcjogdGhpcy5nbG93X2NvbG9yLFxyXG5cdFx0fSk7XHJcblx0XHRnYy5jb2xsZWN0KG1hdCk7XHJcblx0XHRcclxuXHRcdHZhciBnZW9tID0gbmV3IFRIUkVFLlNwaGVyZUdlb21ldHJ5KDAuOCwgMjEsIDEwKTtcclxuXHRcdGdjLmNvbGxlY3QoZ2VvbSk7XHJcblx0XHRcclxuXHRcdHZhciBtZXNoID0gbmV3IFRIUkVFLk1lc2goZ2VvbSwgbWF0KTtcclxuXHRcdG1lc2gucG9zaXRpb24uc2V0KDAsIDAuNSwgMCk7XHJcblx0XHRcclxuXHRcdC8vIHNlbGYuc2V0U2NhbGUoc2VsZi5zY2FsZV9zaGFkb3cpO1xyXG5cdFx0Ly8gbWVzaC5zY2FsZS5zZXQoXHJcblx0XHQvLyBcdHRoaXMuc2NhbGVfc2hhZG93ICogdGhpcy5zY2FsZSwgXHJcblx0XHQvLyBcdHRoaXMuc2NhbGVfc2hhZG93ICogdGhpcy5zY2FsZSwgXHJcblx0XHQvLyBcdHRoaXMuc2NhbGVfc2hhZG93ICogdGhpcy5zY2FsZVxyXG5cdFx0Ly8gKTtcclxuXHRcdHJldHVybiB0aGlzLl9hdmF0YXJfZ2xvd2Nhc3RlciA9IG1lc2g7XHJcblx0fSxcclxuXHRcclxuXHRfYXZhdGFyX2NyZWF0ZVNoYWRvd0Nhc3RlcjogZnVuY3Rpb24obWFwLCBnYykge1xyXG5cdFx0dmFyIG1hdCA9IG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCgpO1xyXG5cdFx0bWF0LnZpc2libGUgPSBmYWxzZTsgLy9UaGUgb2JqZWN0IHdvbid0IHJlbmRlciwgYnV0IHRoZSBzaGFkb3cgc3RpbGwgd2lsbFxyXG5cdFx0Z2MuY29sbGVjdChtYXQpO1xyXG5cdFx0XHJcblx0XHR2YXIgZ2VvbSA9IG5ldyBUSFJFRS5TcGhlcmVHZW9tZXRyeSgwLjMsIDcsIDMpO1xyXG5cdFx0Z2MuY29sbGVjdChnZW9tKTtcclxuXHRcdFxyXG5cdFx0dmFyIG1lc2ggPSBuZXcgVEhSRUUuTWVzaChnZW9tLCBtYXQpO1xyXG5cdFx0bWVzaC5jYXN0U2hhZG93ID0gdHJ1ZTtcclxuXHRcdG1lc2gucG9zaXRpb24uc2V0KDAsIDAuNSwgMCk7XHJcblx0XHRcclxuXHRcdC8vIHNlbGYuc2V0U2NhbGUoc2VsZi5zY2FsZV9zaGFkb3cpO1xyXG5cdFx0bWVzaC5zY2FsZS5zZXQoXHJcblx0XHRcdHRoaXMuc2NhbGVfc2hhZG93ICogdGhpcy5zY2FsZSwgXHJcblx0XHRcdHRoaXMuc2NhbGVfc2hhZG93ICogdGhpcy5zY2FsZSwgXHJcblx0XHRcdHRoaXMuc2NhbGVfc2hhZG93ICogdGhpcy5zY2FsZVxyXG5cdFx0KTtcclxuXHRcdHJldHVybiB0aGlzLl9hdmF0YXJfc2hhZG93Y2FzdGVyID0gbWVzaDtcclxuXHR9LFxyXG5cdFxyXG5cdF9hdmF0YXJfY3JlYXRlU3ByaXRlIDogZnVuY3Rpb24obWFwLCBnYykge1xyXG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xyXG5cdFx0Ly8gdmFyIGltZyA9IG5ldyBJbWFnZSgpO1xyXG5cdFx0dmFyIHRleHR1cmUgPSBzZWxmLmF2YXRhcl90ZXggPSBuZXcgVEhSRUUuVGV4dHVyZShERUZfU1BSSVRFX0lNRyk7XHJcblx0XHRnYy5jb2xsZWN0KHRleHR1cmUpO1xyXG5cdFx0XHJcblx0XHQvLyBOb3RlOiBub3QgdXNpbmcgXCJ0aGlzLmdldFNwcml0ZUZvcm1hdFwiLCBiZWNhdXNlIHRoZSBkZWZhaWx0IHNwcml0ZVxyXG5cdFx0Ly8gZm9ybWF0IHNob3VsZCBub3QgYmUgb3ZlcmlkZGVuLlxyXG5cdFx0dmFyIHNwZm9ybWF0ID0gZ2V0U3ByaXRlRm9ybWF0KERFRl9TUFJJVEVfRk9STUFUKTtcclxuXHRcdFxyXG5cdFx0dGhpcy5fX29uTG9hZFNwcml0ZShERUZfU1BSSVRFX0lNRywgc3Bmb3JtYXQsIHRleHR1cmUpO1xyXG5cdFx0Ly8gaW1nLnNyYyA9IERFRl9TUFJJVEU7XHJcblx0XHRcclxuXHRcdHRleHR1cmUubWFnRmlsdGVyID0gVEhSRUUuTmVhcmVzdEZpbHRlcjtcclxuXHRcdHRleHR1cmUubWluRmlsdGVyID0gVEhSRUUuTmVhcmVzdEZpbHRlcjtcclxuXHRcdHRleHR1cmUucmVwZWF0ID0gbmV3IFRIUkVFLlZlY3RvcjIoMC4yNSwgMC4yNSk7XHJcblx0XHR0ZXh0dXJlLm9mZnNldCA9IG5ldyBUSFJFRS5WZWN0b3IyKDAsIDApO1xyXG5cdFx0dGV4dHVyZS53cmFwUyA9IFRIUkVFLk1pcnJvcmVkUmVwZWF0V3JhcHBpbmc7XHJcblx0XHR0ZXh0dXJlLndyYXBUID0gVEhSRUUuTWlycm9yZWRSZXBlYXRXcmFwcGluZztcclxuXHRcdHRleHR1cmUuZ2VuZXJhdGVNaXBtYXBzID0gZmFsc2U7IC8vTWlwbWFwcyBnZW5lcmF0ZSB1bmRlc2lyYWJsZSB0cmFuc3BhcmVuY3kgYXJ0aWZhY3RzXHJcblx0XHQvL1RPRE8gTWlycm9yZWRSZXBlYXRXcmFwcGluZywgYW5kIGp1c3QgdXNlIGEgbmVnYXRpdmUgeCB1diB2YWx1ZSwgdG8gZmxpcCBhIHNwcml0ZVxyXG5cdFx0XHJcblx0XHRzZWxmLmF2YXRhcl9mb3JtYXQgPSBzcGZvcm1hdDtcclxuXHRcdFxyXG5cdFx0Ly8gdmFyIG1hdCAvKj0gc2VsZi5hdmF0YXJfbWF0Ki8gPSBuZXcgVEhSRUUuU3ByaXRlTWF0ZXJpYWwoe1xyXG5cdFx0Ly8gXHRtYXA6IHRleHR1cmUsXHJcblx0XHQvLyBcdGNvbG9yOiAweEZGRkZGRixcclxuXHRcdC8vIFx0dHJhbnNwYXJlbnQ6IHRydWUsXHJcblx0XHQvLyB9KTtcclxuXHRcdFxyXG5cdFx0Y3VycmVudE1hcC5tYXJrTG9hZGluZyhcIkFDVE9SX1wiK3NlbGYuaWQpO1xyXG5cdFx0dGhpcy5fYXZhdGFyX2xvYWRTcHJpdGUobWFwLCB0ZXh0dXJlKTtcclxuXHRcdFxyXG5cdFx0Ly92YXIgc3ByaXRlID0gc2VsZi5hdmF0YXJfc3ByaXRlID0gbmV3IFRIUkVFLlNwcml0ZShtYXQpO1xyXG5cdFx0dmFyIHNwcml0ZSA9IHNlbGYuYXZhdGFyX3Nwcml0ZSA9IG5ldyBDaGFyYWN0ZXJTcHJpdGUoe1xyXG5cdFx0XHRtYXA6IHRleHR1cmUsXHJcblx0XHRcdGNvbG9yOiAweEZGRkZGRixcclxuXHRcdFx0b2Zmc2V0OiBuZXcgVEhSRUUuVmVjdG9yMyh0aGlzLm9mZnNldF9zcHJpdGVfeCwgdGhpcy5vZmZzZXRfc3ByaXRlX3ksIDApLC8vMC4yMiksXHJcblx0XHRcdGdjOiBnYyxcclxuXHRcdH0pO1xyXG5cdFx0Ly9zZWxmLnNldFNjYWxlKHNlbGYuc2NhbGUpO1xyXG5cdFx0c3ByaXRlLnNjYWxlLnNldChcclxuXHRcdFx0c2VsZi5zY2FsZSAqIEdMT0JBTF9TQ0FMRVVQLCBcclxuXHRcdFx0c2VsZi5zY2FsZSAqIEdMT0JBTF9TQ0FMRVVQLCBcclxuXHRcdFx0c2VsZi5zY2FsZSAqIEdMT0JBTF9TQ0FMRVVQXHJcblx0XHQpO1xyXG5cdFx0XHJcblx0XHRyZXR1cm4gc3ByaXRlO1xyXG5cdH0sXHJcblx0XHJcblx0X2F2YXRhcl9sb2FkU3ByaXRlIDogZnVuY3Rpb24obWFwLCB0ZXh0dXJlKSB7XHJcblx0XHR2YXIgc2VsZiA9IHRoaXM7XHJcblx0XHRtYXAubG9hZFNwcml0ZShzZWxmLmlkLCBzZWxmLnNwcml0ZSwgZnVuY3Rpb24oZXJyLCB1cmwpe1xyXG5cdFx0XHRpZiAoZXJyKSB7XHJcblx0XHRcdFx0Y29uc29sZS5lcnJvcihcIkVSUk9SIExPQURJTkcgU1BSSVRFOiBcIiwgZXJyKTtcclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHRcdFx0XHJcblx0XHRcdHZhciBpbWcgPSBuZXcgSW1hZ2UoKTtcclxuXHRcdFx0dmFyIGZvcm1hdCA9IHNlbGYuc3ByaXRlX2Zvcm1hdDtcclxuXHRcdFx0aWYgKCQuaXNQbGFpbk9iamVjdChmb3JtYXQpKSB7XHJcblx0XHRcdFx0Zm9ybWF0ID0gc2VsZi5zcHJpdGVfZm9ybWF0W3NlbGYuc3ByaXRlXTtcclxuXHRcdFx0fVxyXG5cdFx0XHRpZiAodHlwZW9mIGZvcm1hdCA9PSBcImZ1bmN0aW9uXCIpIHtcclxuXHRcdFx0XHRmb3JtYXQgPSBzZWxmLnNwcml0ZV9mb3JtYXQoc2VsZi5zcHJpdGUpO1xyXG5cdFx0XHR9XHJcblx0XHRcdGlmICh0eXBlb2YgZm9ybWF0ICE9IFwic3RyaW5nXCIpIHtcclxuXHRcdFx0XHRjb25zb2xlLmVycm9yKFwiSU5WQUxJRCBTUFJJVEUgRk9STUFUISAnc3ByaXRlX2Zvcm1hdCcgbXVzdCBiZSBhIHN0cmluZywgYW4gb2JqZWN0LCBvciBhIFwiK1xyXG5cdFx0XHRcdFx0XCJmdW5jdGlvbiB0aGF0IHJldHVybnMgYSBzdHJpbmchIFRvIHByb3ZpZGUgYSBjdXN0b20gZm9ybWF0LCBvdmVycmlkZSBcIitcclxuXHRcdFx0XHRcdFwiZ2V0U3ByaXRlRm9ybWF0IG9uIHRoZSBhY3RvciBpbnN0YW5jZSFcIik7XHJcblx0XHRcdFx0Zm9ybWF0ID0gREVGX1NQUklURV9GT1JNQVQ7XHJcblx0XHRcdH1cclxuXHRcdFx0XHJcblx0XHRcdHNlbGYuX19vbkxvYWRTcHJpdGUoaW1nLCBzZWxmLmdldFNwcml0ZUZvcm1hdChmb3JtYXQpLCB0ZXh0dXJlKTtcclxuXHRcdFx0aW1nLnNyYyA9IHVybDtcclxuXHRcdH0pO1xyXG5cdH0sXHJcblx0XHJcblx0X19vbkxvYWRTcHJpdGUgOiBmdW5jdGlvbihpbWcsIGZvcm1hdCwgdGV4dHVyZSkge1xyXG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xyXG5cdFx0dmFyIGYgPSBmdW5jdGlvbigpIHtcclxuXHRcdFx0dGV4dHVyZS5pbWFnZSA9IGltZztcclxuXHRcdFx0XHJcblx0XHRcdHNlbGYuYXZhdGFyX2Zvcm1hdCA9IGZvcm1hdDtcclxuXHRcdFx0dGV4dHVyZS5yZXBlYXQuc2V0KFxyXG5cdFx0XHRcdHNlbGYuYXZhdGFyX2Zvcm1hdC53aWR0aCAvIGltZy5uYXR1cmFsV2lkdGgsIFxyXG5cdFx0XHRcdHNlbGYuYXZhdGFyX2Zvcm1hdC5oZWlnaHQgLyBpbWcubmF0dXJhbEhlaWdodCk7XHJcblx0XHRcdHRleHR1cmUubmVlZHNVcGRhdGUgPSB0cnVlO1xyXG5cdFx0XHRcclxuXHRcdFx0c2VsZi5hdmF0YXJfc3ByaXRlLndpZHRoID0gc2VsZi5hdmF0YXJfZm9ybWF0LndpZHRoO1xyXG5cdFx0XHRzZWxmLmF2YXRhcl9zcHJpdGUuaGVpZ2h0ID0gc2VsZi5hdmF0YXJfZm9ybWF0LmhlaWdodDtcclxuXHRcdFx0XHJcblx0XHRcdC8vIHNlbGYuc2hvd0FuaW1hdGlvbkZyYW1lKFwiZDBcIik7XHJcblx0XHRcdHNlbGYucGxheUFuaW1hdGlvbihcInN0YW5kXCIpO1xyXG5cdFx0XHRjdXJyZW50TWFwLm1hcmtMb2FkRmluaXNoZWQoXCJBQ1RPUl9cIitzZWxmLmlkKTtcclxuXHRcdFx0XHJcblx0XHRcdGltZy5yZW1vdmVFdmVudExpc3RlbmVyKFwibG9hZFwiLCBmKTtcclxuXHRcdFx0aW1nLnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJsb2FkXCIsIGUpO1xyXG5cdFx0fVxyXG5cdFx0dmFyIGUgPSBmdW5jdGlvbigpIHtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihcIkVycm9yIHdoaWxlIGxvYWRpbmcgdGV4dHVyZSFcIiwgaW1nLnNyYyk7XHJcblx0XHRcdHRleHR1cmUubmVlZHNVcGRhdGUgPSB0cnVlOyAvL3VwZGF0ZSB0aGUgbWlzc2luZyB0ZXh0dXJlIHByZS1sb2FkZWRcclxuXHRcdFx0Y3VycmVudE1hcC5tYXJrTG9hZEZpbmlzaGVkKFwiQUNUT1JfXCIrc2VsZi5pZCk7XHJcblx0XHRcdFxyXG5cdFx0XHRpbWcucmVtb3ZlRXZlbnRMaXN0ZW5lcihcImxvYWRcIiwgZik7XHJcblx0XHRcdGltZy5yZW1vdmVFdmVudExpc3RlbmVyKFwibG9hZFwiLCBlKTtcclxuXHRcdH1cclxuXHRcdGltZy5vbihcImxvYWRcIiwgZik7XHJcblx0XHRpbWcub24oXCJlcnJvclwiLCBlKTtcclxuXHR9LFxyXG5cdFxyXG5cdC8vIE92ZXJyaWRlIHRoaXMgZnVuY3Rpb24gdG8gcHJvdmlkZSBhIGN1c3RvbSBzcHJpdGUgZm9ybWF0XHJcblx0Z2V0U3ByaXRlRm9ybWF0IDogZnVuY3Rpb24oZm9ybWF0KSB7XHJcblx0XHRyZXR1cm4gZ2V0U3ByaXRlRm9ybWF0KGZvcm1hdCk7XHJcblx0fSxcclxuXHRcclxuXHQvLy8vLy8vLy8vLy8vLy8vLy8vIEFuaW1hdGlvbiAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblx0X2FuaW1hdGlvblN0YXRlIDogbnVsbCxcclxuXHRmYWNpbmcgOiBudWxsLFxyXG5cdGFuaW1hdGlvblNwZWVkOiAxLCAvL2RlZmF1bHQgYW5pbWF0aW9uIHNwZWVkXHJcblx0XHJcblx0X2luaXRBbmltYXRpb25TdGF0ZSA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0aWYgKCF0aGlzLl9hbmltYXRpb25TdGF0ZSlcclxuXHRcdFx0dGhpcy5fYW5pbWF0aW9uU3RhdGUgPSB7XHJcblx0XHRcdFx0Y3VyckFuaW0gOiBudWxsLCAvLyBBbmltYXRpb24gb2JqZWN0XHJcblx0XHRcdFx0Y3VyckZyYW1lIDogbnVsbCwgLy8gQ3VycmVudGx5IGRpc3BsYXllZCBzcHJpdGUgZnJhbWUgbmFtZVxyXG5cdFx0XHRcdG5leHRBbmltIDogbnVsbCwgLy8gQW5pbWF0aW9uIG9iamVjdCBpbiBxdWV1ZVxyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdHN0b3BOZXh0VHJhbnNpdGlvbjogZmFsc2UsIC8vU3RvcCBhdCB0aGUgbmV4dCB0cmFuc2l0aW9uIGZyYW1lLCB0byBzaG9ydC1zdG9wIHRoZSBcIkJ1bXBcIiBhbmltYXRpb25cclxuXHRcdFx0fTtcclxuXHRcdHJldHVybiB0aGlzLl9hbmltYXRpb25TdGF0ZTtcclxuXHR9LFxyXG5cdFxyXG5cdGdldERpcmVjdGlvbkZhY2luZyA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0aWYgKCFjdXJyZW50TWFwIHx8ICFjdXJyZW50TWFwLmNhbWVyYSkgcmV0dXJuIFwiZFwiO1xyXG5cdFx0XHJcblx0XHR2YXIgZGlydmVjdG9yID0gdGhpcy5mYWNpbmcuY2xvbmUoKTtcclxuXHRcdGRpcnZlY3Rvci5hcHBseVF1YXRlcm5pb24oIGN1cnJlbnRNYXAuY2FtZXJhLnF1YXRlcm5pb24gKTtcclxuXHRcdGRpcnZlY3Rvci5wcm9qZWN0T25QbGFuZShFVkVOVF9QTEFORV9OT1JNQUwpLm5vcm1hbGl6ZSgpO1xyXG5cdFx0XHJcblx0XHR2YXIgeCA9IGRpcnZlY3Rvci54LCB5ID0gZGlydmVjdG9yLno7XHJcblx0XHQvLyBjb25zb2xlLmxvZyhcIkRJUkZBQ0lORzpcIiwgeCwgeSk7XHJcblx0XHRpZiAoTWF0aC5hYnMoeCkgPiBNYXRoLmFicyh5KSkgeyAvL0RpcmVjdGlvbiB2ZWN0b3IgaXMgcG9pbnRpbmcgYWxvbmcgeCBheGlzXHJcblx0XHRcdGlmICh4ID4gMCkgcmV0dXJuIFwibFwiO1xyXG5cdFx0XHRlbHNlIHJldHVybiBcInJcIjtcclxuXHRcdH0gZWxzZSB7IC8vRGlyZWN0aW9uIHZlY3RvciBpcyBwb2ludGluZyBhbG9uZyB5IGF4aXNcclxuXHRcdFx0aWYgKHkgPiAwKSByZXR1cm4gXCJkXCI7XHJcblx0XHRcdGVsc2UgcmV0dXJuIFwidVwiO1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIFwiZFwiO1xyXG5cdH0sXHJcblx0XHJcblx0c2hvd0FuaW1hdGlvbkZyYW1lIDogZnVuY3Rpb24oZnJhbWUpIHtcclxuXHRcdHZhciBzdGF0ZSA9IHRoaXMuX2luaXRBbmltYXRpb25TdGF0ZSgpO1xyXG5cdFx0XHJcblx0XHR2YXIgZGVmID0gdGhpcy5hdmF0YXJfZm9ybWF0LmZyYW1lc1tmcmFtZV07XHJcblx0XHRpZiAoIWRlZikge1xyXG5cdFx0XHRjb25zb2xlLndhcm4oXCJFUlJPUiBcIiwgdGhpcy5pZCwgXCI6IEFuaW1hdGlvbiBmcmFtZSBkb2Vzbid0IGV4aXN0OlwiLCBmcmFtZSk7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHRcdHN0YXRlLmZyYW1lTmFtZSA9IGZyYW1lO1xyXG5cdFx0XHJcblx0XHR2YXIgZmxpcCA9IGZhbHNlO1xyXG5cdFx0aWYgKHR5cGVvZiBkZWYgPT0gXCJzdHJpbmdcIikgeyAvL3JlZGlyZWN0XHJcblx0XHRcdGRlZiA9IHRoaXMuYXZhdGFyX2Zvcm1hdC5mcmFtZXNbZGVmXTtcclxuXHRcdFx0ZmxpcCA9IHRydWU7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdHZhciB1ID0gZGVmWzBdICogdGhpcy5hdmF0YXJfdGV4LnJlcGVhdC54O1xyXG5cdFx0dmFyIHYgPSAxIC0gKChkZWZbMV0rMSkgKiB0aGlzLmF2YXRhcl90ZXgucmVwZWF0LnkpO1xyXG5cdFx0Ly9Gb3Igc29tZSByZWFzb24sIG9mZnNldHMgYXJlIGZyb20gdGhlIEJPVFRPTSBsZWZ0PyFcclxuXHRcdFxyXG5cdFx0aWYgKGZsaXAgJiYgdGhpcy5hdmF0YXJfZm9ybWF0LmZsaXApIHtcclxuXHRcdFx0dSA9IDAgLSAoZGVmWzBdLTEpICogdGhpcy5hdmF0YXJfdGV4LnJlcGVhdC54OyAvL1RPRE8gdGVzdFxyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHR0aGlzLmF2YXRhcl90ZXgub2Zmc2V0LnNldCh1LCB2KTsgXHJcblx0XHR0aGlzLmF2YXRhcl90ZXgubmVlZHNVcGRhdGUgPSB0cnVlO1xyXG5cdH0sXHJcblx0XHJcblx0cGxheUFuaW1hdGlvbiA6IGZ1bmN0aW9uKGFuaW1OYW1lLCBvcHRzKSB7XHJcblx0XHR2YXIgc3RhdGUgPSB0aGlzLl9pbml0QW5pbWF0aW9uU3RhdGUoKTtcclxuXHRcdGlmICghb3B0cykgb3B0cyA9IHt9O1xyXG5cdFx0XHJcblx0XHR2YXIgYW5pbSA9IHRoaXMuYXZhdGFyX2Zvcm1hdC5hbmltc1thbmltTmFtZV07XHJcblx0XHRpZiAoIWFuaW0pIHtcclxuXHRcdFx0Y29uc29sZS53YXJuKFwiRVJST1JcIiwgdGhpcy5pZCwgXCI6IEFuaW1hdGlvbiBuYW1lIGRvZXNuJ3QgZXhpc3Q6XCIsIGFuaW1OYW1lKTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cdFx0YW5pbS5wYXJlbnQgPSB0aGlzO1xyXG5cdFx0c3RhdGUubmV4dEFuaW0gPSBhbmltO1xyXG5cdFx0YW5pbS5zcGVlZCA9IChvcHRzLnNwZWVkID09IHVuZGVmaW5lZCk/IHRoaXMuYW5pbWF0aW9uU3BlZWQgOiBvcHRzLnNwZWVkO1xyXG5cdFx0c3RhdGUuc3RvcE5leHRUcmFuc2l0aW9uID0gb3B0cy5zdG9wTmV4dFRyYW5zaXRpb24gfHwgZmFsc2U7XHJcblx0fSxcclxuXHRcclxuXHRzdG9wQW5pbWF0aW9uIDogZnVuY3Rpb24oKSB7XHJcblx0XHR2YXIgc3RhdGUgPSB0aGlzLl9pbml0QW5pbWF0aW9uU3RhdGUoKTtcclxuXHRcdFxyXG5cdFx0Ly8gc3RhdGUucnVubmluZyA9IGZhbHNlO1xyXG5cdFx0Ly8gc3RhdGUucXVldWUgPSBudWxsO1xyXG5cdFx0Ly8gc3RhdGUuc3RvcEZyYW1lID0gbnVsbDtcclxuXHRcdHRoaXMuZW1pdChcImFuaW0tZW5kXCIsIHN0YXRlLmFuaW1OYW1lKTtcclxuXHR9LFxyXG5cdFxyXG5cdHNob3dFbW90ZTogZnVuY3Rpb24oZW1vdGUsIHRpbWVvdXQpIHtcclxuXHRcdHZhciBlID0gdGhpcy5fX2N1cnJFbW90ZTtcclxuXHRcdGlmICghZSkgXHJcblx0XHRcdGUgPSB0aGlzLl9fY3VyckVtb3RlID0gVUkuZ2V0RW1vdGVCdWJibGUoKTtcclxuXHRcdFxyXG5cdFx0ZS5zZXRUeXBlKGVtb3RlKTtcclxuXHRcdGUuaGVpZ2h0ID0gdGhpcy5hdmF0YXJfc3ByaXRlLmhlaWdodDtcclxuXHRcdGlmICh0aW1lb3V0KSB7XHJcblx0XHRcdGUuc2V0VGltZW91dCh0aW1lb3V0KTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0dGhpcy5hdmF0YXJfc3ByaXRlLmFkZChlKTtcclxuXHRcdGUuc2hvdygpO1xyXG5cdH0sXHJcblx0XHJcblx0aGlkZUVtb3RlOiBmdW5jdGlvbigpIHtcclxuXHRcdHZhciBlID0gdGhpcy5fX2N1cnJFbW90ZTtcclxuXHRcdGUuaGlkZShmdW5jdGlvbigpe1xyXG5cdFx0XHRlLnJlbGVhc2UoKTtcclxuXHRcdH0pO1xyXG5cdFx0dGhpcy5fX2N1cnJFbW90ZSA9IG51bGw7XHJcblx0fSxcclxuXHRcclxuXHRfdGlja19kb0FuaW1hdGlvbjogZnVuY3Rpb24oZGVsdGEpIHtcclxuXHRcdHZhciBzdGF0ZSA9IHRoaXMuX2FuaW1hdGlvblN0YXRlO1xyXG5cdFx0dmFyIENBID0gc3RhdGUuY3VyckFuaW07XHJcblx0XHRpZiAoIUNBKSBDQSA9IHN0YXRlLmN1cnJBbmltID0gc3RhdGUubmV4dEFuaW07XHJcblx0XHRpZiAoIUNBKSByZXR1cm47XHJcblx0XHRcclxuXHRcdENBLmFkdmFuY2UoZGVsdGEpO1xyXG5cdFx0XHJcblx0XHRpZiAoc3RhdGUubmV4dEFuaW0gJiYgQ0EuY2FuVHJhbnNpdGlvbigpKSB7XHJcblx0XHRcdC8vU3dpdGNoIGFuaW1hdGlvbnNcclxuXHRcdFx0Q0EucmVzZXQoKTtcclxuXHRcdFx0Q0EgPSBzdGF0ZS5jdXJyQW5pbSA9IHN0YXRlLm5leHRBbmltO1xyXG5cdFx0XHRzdGF0ZS5uZXh0QW5pbSA9IG51bGw7XHJcblx0XHRcdFxyXG5cdFx0XHQvLyB0aGlzLmVtaXQoXCJhbmltLWVuZFwiLCBudWxsKTsgLy9UT0RPIHByb3ZpZGUgYW5pbSBuYW1lXHJcblx0XHRcdFxyXG5cdFx0XHRpZiAoc3RhdGUuc3RvcE5leHRUcmFuc2l0aW9uKSB7XHJcblx0XHRcdFx0dGhpcy5wbGF5QW5pbWF0aW9uKFwic3RhbmRcIik7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0dmFyIGRpciA9IHRoaXMuZ2V0RGlyZWN0aW9uRmFjaW5nKCk7XHJcblx0XHR2YXIgZnJhbWUgPSBDQS5nZXRGcmFtZVRvRGlzcGxheShkaXIpO1xyXG5cdFx0aWYgKGZyYW1lICE9IHN0YXRlLmN1cnJGcmFtZSkge1xyXG5cdFx0XHR0aGlzLnNob3dBbmltYXRpb25GcmFtZShmcmFtZSk7XHJcblx0XHR9XHJcblx0XHRcclxuXHR9LFxyXG5cdFxyXG5cdC8vLy8vLy8vLy8vLy8vLy8vLy8gTW92ZW1lbnQgYW5kIFBhdGhpbmcgLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cdF9wYXRoaW5nU3RhdGUgOiBudWxsLFxyXG5cdFxyXG5cdF9pbml0UGF0aGluZ1N0YXRlIDogZnVuY3Rpb24oKSB7XHJcblx0XHRpZiAoIXRoaXMuX3BhdGhpbmdTdGF0ZSlcclxuXHRcdFx0dGhpcy5fcGF0aGluZ1N0YXRlID0ge1xyXG5cdFx0XHRcdHF1ZXVlOiBbXSxcclxuXHRcdFx0XHRtb3Zpbmc6IGZhbHNlLFxyXG5cdFx0XHRcdHNwZWVkOiAxLFxyXG5cdFx0XHRcdGRlbHRhOiAwLCAvL3RoZSBkZWx0YSBmcm9tIHNyYyB0byBkZXN0XHJcblx0XHRcdFx0anVtcGluZyA6IGZhbHNlLFxyXG5cdFx0XHRcdC8vIGRpcjogXCJkXCIsXHJcblx0XHRcdFx0XHJcblx0XHRcdFx0ZGVzdExvY0M6IG5ldyBUSFJFRS5WZWN0b3IzKCkuc2V0KHRoaXMubG9jYXRpb24pLCAvL2NvbGxpc2lvbiBtYXAgbG9jYXRpb25cclxuXHRcdFx0XHRkZXN0TG9jMzogbmV3IFRIUkVFLlZlY3RvcjMoKSwgLy93b3JsZCBzcGFjZSBsb2NhdGlvblxyXG5cdFx0XHRcdHNyY0xvY0M6IG5ldyBUSFJFRS5WZWN0b3IzKCkuc2V0KHRoaXMubG9jYXRpb24pLFxyXG5cdFx0XHRcdHNyY0xvYzM6IG5ldyBUSFJFRS5WZWN0b3IzKCksXHJcblx0XHRcdFx0bWlkcG9pbnRPZmZzZXQ6IG5ldyBUSFJFRS5WZWN0b3IzKCksXHJcblx0XHRcdH07XHJcblx0XHRyZXR1cm4gdGhpcy5fcGF0aGluZ1N0YXRlO1xyXG5cdH0sXHJcblx0XHJcblx0cGF0aFRvIDogZnVuY3Rpb24oeCwgeSkge1xyXG5cdFx0dmFyIHN0YXRlID0gdGhpcy5faW5pdFBhdGhpbmdTdGF0ZSgpO1xyXG5cdFx0XHJcblx0XHRjb25zb2xlLmVycm9yKHRoaXMuaWQsIFwiOiBQYXRoaW5nIGhhcyBub3QgYmVlbiBpbXBsZW1lbnRlZCB5ZXQhXCIpO1xyXG5cdH0sXHJcblx0XHJcblx0Y2xlYXJQYXRoaW5nIDogZnVuY3Rpb24oKSB7XHJcblx0XHR2YXIgc3RhdGUgPSB0aGlzLl9pbml0UGF0aGluZ1N0YXRlKCk7XHJcblx0XHRzdGF0ZS5xdWV1ZS5sZW5ndGggPSAwO1xyXG5cdH0sXHJcblx0XHJcblx0bW92ZURpciA6IGZ1bmN0aW9uKGRpcikge1xyXG5cdFx0dmFyIHggPSB0aGlzLmxvY2F0aW9uLng7XHJcblx0XHR2YXIgeSA9IHRoaXMubG9jYXRpb24ueTtcclxuXHRcdHZhciB6ID0gdGhpcy5sb2NhdGlvbi56O1xyXG5cdFx0c3dpdGNoIChkaXIpIHtcclxuXHRcdFx0Y2FzZSBcImRcIjogY2FzZSBcImRvd25cIjpcdHkgKz0gMTsgYnJlYWs7XHJcblx0XHRcdGNhc2UgXCJ1XCI6IGNhc2UgXCJ1cFwiOlx0eSAtPSAxOyBicmVhaztcclxuXHRcdFx0Y2FzZSBcImxcIjogY2FzZSBcImxlZnRcIjpcdHggLT0gMTsgYnJlYWs7XHJcblx0XHRcdGNhc2UgXCJyXCI6IGNhc2UgXCJyaWdodFwiOlx0eCArPSAxOyBicmVhaztcclxuXHRcdH1cclxuXHRcdHRoaXMubW92ZVRvKHgsIHksIHopO1xyXG5cdH0sXHJcblx0XHJcblx0ZmFjZUludGVyYWN0b3IgOiBmdW5jdGlvbih2ZWN0b3IpIHtcclxuXHRcdHRoaXMuZmFjaW5nID0gdmVjdG9yLmNsb25lKCkubmVnYXRlKCk7XHJcblx0fSxcclxuXHRcclxuXHRmYWNlRGlyIDogZnVuY3Rpb24oeCwgeSkge1xyXG5cdFx0dGhpcy5mYWNpbmcuc2V0KC14LCAwLCB5KTtcclxuXHR9LFxyXG5cdFxyXG5cdG1vdmVUbyA6IGZ1bmN0aW9uKHgsIHksIGxheWVyLCBvcHRzKSB7IC8vYnlwYXNzIFdhbGttYXNrIENoZWNrXHJcblx0XHRpZiAoJC5pc1BsYWluT2JqZWN0KGxheWVyKSAmJiBvcHRzID09PSB1bmRlZmluZWQpIHtcclxuXHRcdFx0b3B0cyA9IGxheWVyOyBsYXllciA9IHVuZGVmaW5lZDtcclxuXHRcdH1cclxuXHRcdGlmIChvcHRzID09PSB1bmRlZmluZWQpIG9wdHMgPSB7fTtcclxuXHRcdFxyXG5cdFx0dmFyIHN0YXRlID0gdGhpcy5faW5pdFBhdGhpbmdTdGF0ZSgpO1xyXG5cdFx0dmFyIHNyYyA9IHRoaXMubG9jYXRpb247XHJcblx0XHRsYXllciA9IChsYXllciA9PSB1bmRlZmluZWQpPyB0aGlzLmxvY2F0aW9uLnogOiBsYXllcjtcclxuXHRcdFxyXG5cdFx0dGhpcy5mYWNpbmcuc2V0KHNyYy54LXgsIDAsIHktc3JjLnkpO1xyXG5cdFx0XHJcblx0XHR2YXIgd2Fsa21hc2sgPSBjdXJyZW50TWFwLmNhbldhbGtCZXR3ZWVuKHNyYy54LCBzcmMueSwgeCwgeSk7XHJcblx0XHRpZiAob3B0cy5ieXBhc3MgIT09IHVuZGVmaW5lZCkgd2Fsa21hc2sgPSBvcHRzLmJ5cGFzcztcclxuXHRcdGlmICghd2Fsa21hc2spIHtcclxuXHRcdFx0dGhpcy5lbWl0KFwiY2FudC1tb3ZlXCIsIHNyYy54LCBzcmMueSwgeCwgeSk7XHJcblx0XHRcdGN1cnJlbnRNYXAuZGlzcGF0Y2goeCwgeSwgXCJidW1wZWRcIiwgdGhpcy5mYWNpbmcpO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblx0XHRpZiAoKHdhbGttYXNrICYgMHgxMCkgPT0gMHgxMCkgeyAvLyBDaGVjayBOb05QQyB0aWxlc1xyXG5cdFx0XHRpZiAodGhpcy5pc05QQygpKSB7XHJcblx0XHRcdFx0dGhpcy5lbWl0KFwiY2FudC1tb3ZlXCIsIHNyYy54LCBzcmMueSwgeCwgeSk7XHJcblx0XHRcdFx0Y3VycmVudE1hcC5kaXNwYXRjaCh4LCB5LCBcImJ1bXBlZFwiLCB0aGlzLmZhY2luZyk7XHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHRpZiAoKHdhbGttYXNrICYgMHg4KSA9PSAweDgpIHtcclxuXHRcdFx0Ly8gVHJhbnNpdGlvbiBub3cgdG8gYW5vdGhlciBsYXllclxyXG5cdFx0XHR2YXIgdCA9IGN1cnJlbnRNYXAuZ2V0TGF5ZXJUcmFuc2l0aW9uKHgsIHksIHRoaXMubG9jYXRpb24ueik7XHJcblx0XHRcdGNvbnNvbGUubG9nKFwiTGF5ZXIgVHJhbnNpdGlvbjogXCIsIHQpO1xyXG5cdFx0XHR4ID0gdC54OyB5ID0gdC55OyBsYXllciA9IHQubGF5ZXI7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdFxyXG5cdFx0dmFyIGFuaW1vcHRzID0ge307XHJcblx0XHRzdGF0ZS5taWRwb2ludE9mZnNldC5zZXQoMCwgMCwgMCk7XHJcblx0XHRzdGF0ZS5zcmNMb2NDLnNldChzcmMpO1xyXG5cdFx0c3RhdGUuc3JjTG9jMy5zZXQoY3VycmVudE1hcC5nZXQzRFRpbGVMb2NhdGlvbihzcmMpKTtcclxuXHRcdHN0YXRlLmRlc3RMb2NDLnNldCh4LCB5LCBsYXllcik7XHJcblx0XHRzdGF0ZS5kZXN0TG9jMy5zZXQoY3VycmVudE1hcC5nZXQzRFRpbGVMb2NhdGlvbih4LCB5LCBsYXllcikpO1xyXG5cdFx0c3RhdGUuZGVsdGEgPSAwO1xyXG5cdFx0c3RhdGUuc3BlZWQgPSBvcHRzLnNwZWVkIHx8IDE7XHJcblx0XHRzdGF0ZS5tb3ZpbmcgPSB0cnVlO1xyXG5cdFx0YW5pbW9wdHMuc3BlZWQgPSBvcHRzLnNwZWVkIHx8IDE7XHJcblx0XHRcclxuXHRcdGlmICgod2Fsa21hc2sgJiAweDIpID09PSAweDIpIHtcclxuXHRcdFx0c3RhdGUubWlkcG9pbnRPZmZzZXQuc2V0WSgwLjYpO1xyXG5cdFx0XHRzdGF0ZS5qdW1waW5nID0gdHJ1ZTtcclxuXHRcdFx0c3RhdGUuc3BlZWQgPSAxOyAvL2VuZm9yY2UgYSBqdW1waW5nIHNwZWVkIG9mIDFcclxuXHRcdFx0U291bmRNYW5hZ2VyLnBsYXlTb3VuZChcIndhbGtfanVtcFwiKTtcclxuXHRcdFx0YW5pbW9wdHMuc3BlZWQgPSAxLjU7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdHRoaXMucGxheUFuaW1hdGlvbihcIndhbGtcIiwgYW5pbW9wdHMpO1xyXG5cdFx0dGhpcy5lbWl0KFwibW92aW5nXCIsIHN0YXRlLnNyY0xvY0MueCwgc3RhdGUuc3JjTG9jQy55LCBzdGF0ZS5kZXN0TG9jQy54LCBzdGF0ZS5kZXN0TG9jQy55KTtcclxuXHR9LFxyXG5cdFxyXG5cdF90aWNrX2RvTW92ZW1lbnQgOiBmdW5jdGlvbihkZWx0YSkge1xyXG5cdFx0dmFyIHN0YXRlID0gdGhpcy5faW5pdFBhdGhpbmdTdGF0ZSgpO1xyXG5cdFx0XHJcblx0XHRzdGF0ZS5kZWx0YSArPSBzdGF0ZS5zcGVlZCAqIChkZWx0YSAqIENPTkZJRy5zcGVlZC5wYXRoaW5nKTtcclxuXHRcdHZhciBhbHBoYSA9IE1hdGguY2xhbXAoc3RhdGUuZGVsdGEpO1xyXG5cdFx0dmFyIGJldGEgPSBNYXRoLnNpbihhbHBoYSAqIE1hdGguUEkpO1xyXG5cdFx0dGhpcy5hdmF0YXJfbm9kZS5wb3NpdGlvbi5zZXQoIFxyXG5cdFx0XHQvL0xlcnAgYmV0d2VlbiBzcmMgYW5kIGRlc3QgKGJ1aWx0IGluIGxlcnAoKSBpcyBkZXN0cnVjdGl2ZSwgYW5kIHNlZW1zIGJhZGx5IGRvbmUpXHJcblx0XHRcdHN0YXRlLnNyY0xvYzMueCArICgoc3RhdGUuZGVzdExvYzMueCAtIHN0YXRlLnNyY0xvYzMueCkgKiBhbHBoYSkgKyAoc3RhdGUubWlkcG9pbnRPZmZzZXQueCAqIGJldGEpLFxyXG5cdFx0XHRzdGF0ZS5zcmNMb2MzLnkgKyAoKHN0YXRlLmRlc3RMb2MzLnkgLSBzdGF0ZS5zcmNMb2MzLnkpICogYWxwaGEpICsgKHN0YXRlLm1pZHBvaW50T2Zmc2V0LnkgKiBiZXRhKSxcclxuXHRcdFx0c3RhdGUuc3JjTG9jMy56ICsgKChzdGF0ZS5kZXN0TG9jMy56IC0gc3RhdGUuc3JjTG9jMy56KSAqIGFscGhhKSArIChzdGF0ZS5taWRwb2ludE9mZnNldC56ICogYmV0YSlcclxuXHRcdCk7XHJcblx0XHRcclxuXHRcdGlmIChzdGF0ZS5kZWx0YSA+IDEpIHtcclxuXHRcdFx0dGhpcy5lbWl0KFwibW92ZWRcIiwgc3RhdGUuc3JjTG9jQy54LCBzdGF0ZS5zcmNMb2NDLnksIHN0YXRlLmRlc3RMb2NDLngsIHN0YXRlLmRlc3RMb2NDLnkpO1xyXG5cdFx0XHR0aGlzLmxvY2F0aW9uLnNldCggc3RhdGUuZGVzdExvY0MgKTtcclxuXHRcdFx0XHJcblx0XHRcdGlmIChzdGF0ZS5qdW1waW5nKSB7XHJcblx0XHRcdFx0Ly9UT0RPIHBhcnRpY2xlIGVmZmVjdHNcclxuXHRcdFx0XHRTb3VuZE1hbmFnZXIucGxheVNvdW5kKFwid2Fsa19qdW1wX2xhbmRcIik7XHJcblx0XHRcdFx0c3RhdGUuanVtcGluZyA9IGZhbHNlO1xyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHR2YXIgbmV4dCA9IHN0YXRlLnF1ZXVlLnNoaWZ0KCk7XHJcblx0XHRcdGlmICghbmV4dCkge1xyXG5cdFx0XHRcdHN0YXRlLmRlbHRhID0gMDtcclxuXHRcdFx0XHRzdGF0ZS5tb3ZpbmcgPSBmYWxzZTtcclxuXHRcdFx0XHQvLyB0aGlzLnN0b3BBbmltYXRpb24oKTtcclxuXHRcdFx0XHR0aGlzLnBsYXlBbmltYXRpb24oXCJzdGFuZFwiKTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHR0aGlzLm1vdmVUbyhuZXh0LngsIG5leHQueSwgbmV4dC56KTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH0sXHJcblx0XHJcblx0XHJcblx0Ly8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vIEJlaGF2aW9ycyAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblx0YmVoYXZpb3JTdGFjayA6IG51bGwsXHJcblx0XHJcblx0X2luaXRCZWhhdmlvclN0YWNrIDogZnVuY3Rpb24oKSB7XHJcblx0XHRpZiAoIXRoaXMuYmVoYXZpb3JTdGFjaylcclxuXHRcdFx0dGhpcy5iZWhhdmlvclN0YWNrID0gW107XHJcblx0fSxcclxuXHRcclxuXHRfdGlja19kb0JlaGF2aW9yIDogZnVuY3Rpb24oZGVsdGEpIHtcclxuXHRcdHZhciBiZWhhdiA9IHRoaXMuYmVoYXZpb3JTdGFjay50b3A7XHJcblx0XHRpZiAoIWJlaGF2IHx8ICFiZWhhdi5fdGljaykgcmV0dXJuO1xyXG5cdFx0YmVoYXYuX3RpY2sodGhpcywgZGVsdGEpO1xyXG5cdH0sXHJcblx0XHJcblx0X2RvQmVoYXZpb3JfaW50ZXJhY3QgOiBmdW5jdGlvbihmcm9tRGlyKSB7XHJcblx0XHR2YXIgYmVoYXYgPSB0aGlzLmJlaGF2aW9yU3RhY2sudG9wO1xyXG5cdFx0aWYgKCFiZWhhdiB8fCAhYmVoYXYuX2ludGVyYWN0KSByZXR1cm47XHJcblx0XHRiZWhhdi5faW50ZXJhY3QodGhpcywgZnJvbURpcik7XHJcblx0fSxcclxuXHRcclxuXHRfZG9CZWhhdmlvcl9idW1wIDogZnVuY3Rpb24oZnJvbURpcikge1xyXG5cdFx0dmFyIGJlaGF2ID0gdGhpcy5iZWhhdmlvclN0YWNrLnRvcDtcclxuXHRcdGlmICghYmVoYXYgfHwgIWJlaGF2Ll9idW1wKSByZXR1cm47XHJcblx0XHRiZWhhdi5fYnVtcCh0aGlzLCBmcm9tRGlyKTtcclxuXHR9LFxyXG5cdFxyXG5cdC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cdFxyXG5cdHNob3VsZEFwcGVhcjogZnVuY3Rpb24obWFwaWQpIHtcclxuXHRcdGlmICh0aGlzLnNjaGVkdWxlKSB7XHJcblx0XHRcdHZhciB0aW1lc3RhbXAgPSBBY3RvclNjaGVkdWxlci5nZXRUaW1lc3RhbXAoKTtcclxuXHRcdFx0dmFyIHNob3VsZCA9IHRoaXMuc2NoZWR1bGVbdGltZXN0YW1wXSA9PSBtYXBpZDtcclxuXHRcdFx0aWYgKCFzaG91bGQpIGNvbnNvbGUubG9nKFwiQWN0b3JcIiwgdGhpcy5pZCwgXCJzaG91bGQgTk9UIGFwcGVhciBhY2NvcmRpbmcgdG8gc2NoZWR1bGVyLi4uIFwiLCB0aGlzLnNjaGVkdWxlW3RpbWVzdGFtcF0pO1xyXG5cdFx0XHRyZXR1cm4gc2hvdWxkO1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIHRydWU7IC8vbm8gc2NoZWR1bGUsIGFsd2F5cyBhcHBlYXJcclxuXHR9LFxyXG5cdFxyXG5cdHNjaGVkdWxlOiBudWxsLFxyXG5cdFxyXG5cdC8vLy8vLy8vLy8vLy8vLy8vLy8vLyBQcml2YXRlIE1ldGhvZHMgLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cdFxyXG5cdGNhbldhbGtPbiA6IGZ1bmN0aW9uKCl7IHJldHVybiBmYWxzZTsgfSxcclxuXHRpc05QQyA6IGZ1bmN0aW9uKCl7IHJldHVybiB0cnVlOyB9LFxyXG5cdFxyXG5cdF9ub3JtYWxpemVMb2NhdGlvbiA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0aWYgKHRoaXMubG9jYXRpb24gPT0gXCJyYW5kXCIpIHtcclxuXHRcdFx0Ly9QbGFjZSB0aGlzIGFjdG9yIGluIGEgZGVzaWduYXRlZCByYW5kb20gbG9jYXRpb25cclxuXHRcdFx0dGhpcy5sb2NhdGlvbiA9IGN1cnJlbnRNYXAuZ2V0UmFuZG9tTlBDU3Bhd25Qb2ludCgpO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdHZhciBudW0gPSBFdmVudC5wcm90b3R5cGUuX25vcm1hbGl6ZUxvY2F0aW9uLmNhbGwodGhpcyk7XHJcblx0XHRpZiAobnVtICE9IDEgfHwgIXRoaXMubG9jYXRpb24pXHJcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIkFjdG9ycyBjYW4gb25seSBiZSBpbiBvbmUgcGxhY2UgYXQgYSB0aW1lISBOdW1iZXIgb2YgbG9jYXRpb25zOiBcIitudW0pO1xyXG5cdH0sXHJcblx0XHJcblx0X2FjdG9yVGljayA6IGZ1bmN0aW9uKGRlbHRhKSB7XHJcblx0XHQvLyBEbyBhbmltYXRpb25cclxuXHRcdGlmICh0aGlzLl9hbmltYXRpb25TdGF0ZSkgXHJcblx0XHRcdHRoaXMuX3RpY2tfZG9BbmltYXRpb24oZGVsdGEpO1xyXG5cdFx0XHJcblx0XHQvLyBEbyBtb3ZlbWVudFxyXG5cdFx0aWYgKHRoaXMuX3BhdGhpbmdTdGF0ZSAmJiB0aGlzLl9wYXRoaW5nU3RhdGUubW92aW5nKVxyXG5cdFx0XHR0aGlzLl90aWNrX2RvTW92ZW1lbnQoZGVsdGEpO1xyXG5cdFx0XHJcblx0XHQvLyBEbyBiZWhhdmlvclxyXG5cdFx0aWYgKHRoaXMuYmVoYXZpb3JTdGFjay5sZW5ndGgpXHJcblx0XHRcdHRoaXMuX3RpY2tfZG9CZWhhdmlvcihkZWx0YSk7XHJcblx0fSxcclxuXHRcclxuXHQvLyBfYWN0b3JJbnRlcmFjdEZhY2UgOiBmdW5jdGlvbih2ZWN0b3IpIHtcclxuXHQvLyBcdHRoaXMuZmFjaW5nID0gdmVjdG9yLmNsb25lKCkubmVnYXRlKCk7XHJcblx0Ly8gfSxcclxuXHRcclxuXHRfYWN0b3JCdW1wIDogZnVuY3Rpb24oc3JjeCwgc3JjeSwgeCwgeSwgcmVhc29uKSB7XHJcblx0XHQvLyBjb25zb2xlLndhcm4odGhpcy5pZCwgXCI6IENhbm5vdCB3YWxrIHRvIGxvY2F0aW9uXCIsIFwiKFwiK3grXCIsXCIreStcIilcIik7XHJcblx0fSxcclxuXHRcclxufSk7XHJcbm1vZHVsZS5leHBvcnRzID0gQWN0b3I7XHJcblxyXG5cclxuXHJcbmZ1bmN0aW9uIGdldERpckZyb21Mb2MoeDEsIHkxLCB4MiwgeTIpIHtcclxuXHRyZXR1cm4gbmV3IFRIUkVFLlZlY3RvcjMoeDIteDEsIDAsIHkyLXkxKTtcclxuXHQvLyB2YXIgZHggPSB4MiAtIHgxO1xyXG5cdC8vIHZhciBkeSA9IHkyIC0geTE7XHJcblx0Ly8gaWYgKE1hdGguYWJzKGR4KSA+IE1hdGguYWJzKGR5KSkge1xyXG5cdC8vIFx0aWYgKGR4ID4gMCkgeyByZXR1cm4gXCJyXCI7IH1cclxuXHQvLyBcdGVsc2UgaWYgKGR4IDwgMCkgeyByZXR1cm4gXCJsXCI7IH1cclxuXHQvLyB9IGVsc2Uge1xyXG5cdC8vIFx0aWYgKGR5ID4gMCkgeyByZXR1cm4gXCJkXCI7IH1cclxuXHQvLyBcdGVsc2UgaWYgKGR5IDwgMCkgeyByZXR1cm4gXCJ1XCI7IH1cclxuXHQvLyB9XHJcblx0Ly8gcmV0dXJuIFwiZFwiO1xyXG59XHJcblxyXG4iLCIvLyBiZWhhdmlvci5qc1xyXG4vLyBEZWZpbmVzIHRoZSBiYXNlZCBjbGFzc2VzIGZvciBBY3RvcidzIGJlaGF2aW9yc1xyXG5cclxudmFyIGV4dGVuZCA9IHJlcXVpcmUoXCJleHRlbmRcIik7XHJcbnZhciBpbmhlcml0cyA9IHJlcXVpcmUoXCJpbmhlcml0c1wiKTtcclxuXHJcbi8qKiBcclxuICogQSBCZWhhdmlvciBpcyBhIHNjcmlwdCB0aGF0IGFuIGFjdG9yIGlzIGZvbGxvd2luZywgd2hldGhlciB0aGF0XHJcbiAqIGJlIHdhbGtpbmcgYWxvbmcgYSBwYXRoIG9yIGFyb3VuZCBhIGNpcmNsZSwgb3IgZm9sbG93aW5nIGEgbW9yZVxyXG4gKiBjb21wbGV4IHNjcmlwdCBvZiBldmVudHMuIEJlaGF2aW9ycyBjYW4gYmUgcHVzaGVkIGFuZCBwb3BwZWQgb2ZmXHJcbiAqIGFuIGFjdG9yJ3Mgc3RhY2ssIGFuZCB0aGUgdG9wbW9zdCBvbmUgd2lsbCBiZSBwYXNzZWQgY2VydGFpbiBldmVudHNcclxuICogdGhhdCB0aGUgYWN0b3IgcmVjaWV2ZXMuXHJcbiAqL1xyXG5cclxuZnVuY3Rpb24gQmVoYXZpb3Iob3B0cykge1xyXG5cdGV4dGVuZCh0aGlzLCBvcHRzKTtcclxufVxyXG5leHRlbmQoQmVoYXZpb3IucHJvdG90eXBlLCB7XHJcblx0ZmFjZU9uSW50ZXJhY3Q6IHRydWUsXHJcblx0dGFsa0JlaGF2OiBudWxsLFxyXG5cdFxyXG5cdHRpY2sgOiBudWxsLFxyXG5cdGJ1bXAgOiBudWxsLFxyXG5cdGludGVyYWN0IDogZnVuY3Rpb24obWUsIGZyb21fZGlyKXtcclxuXHRcdGlmICh0aGlzLnRhbGtCZWhhdikge1xyXG5cdFx0XHRtZS5iZWhhdmlvclN0YWNrLnB1c2godGhpcy50YWxrQmVoYXYpO1xyXG5cdFx0fVxyXG5cdH0sXHJcblx0XHJcblx0X3RpY2sgOiBmdW5jdGlvbihtZSwgZGVsdGEpIHtcclxuXHRcdGlmICh0aGlzLnRpY2spXHJcblx0XHRcdHRoaXMudGljayhtZSwgZGVsdGEpO1xyXG5cdH0sXHJcblx0X2ludGVyYWN0IDogZnVuY3Rpb24obWUsIGZyb21fZGlyKSB7XHJcblx0XHQvL1RPRE8gZG8gc3RhbmRhcmQgc3R1ZmYgaGVyZVxyXG5cdFx0aWYgKHRoaXMuZmFjZU9uSW50ZXJhY3QpXHJcblx0XHRcdG1lLmZhY2VJbnRlcmFjdG9yKGZyb21fZGlyKTtcclxuXHRcdFxyXG5cdFx0aWYgKHRoaXMuaW50ZXJhY3QpXHJcblx0XHRcdHRoaXMuaW50ZXJhY3QobWUsIGZyb21fZGlyKTtcclxuXHR9LFxyXG5cdF9idW1wIDogZnVuY3Rpb24obWUsIGZyb21fZGlyKSB7XHJcblx0XHRpZiAodGhpcy5idW1wKVxyXG5cdFx0XHR0aGlzLmJ1bXAobWUsIGZyb21fZGlyKTtcclxuXHR9LFxyXG59KTtcclxubW9kdWxlLmV4cG9ydHMgPSBCZWhhdmlvcjtcclxuXHJcblxyXG4vLy8vLy8vLy8vLyBDb21tb24gQmVoYXZpb3JzIC8vLy8vLy8vLy8vXHJcblxyXG5mdW5jdGlvbiBUYWxraW5nKG9wdHMpIHtcclxuXHRCZWhhdmlvci5jYWxsKHRoaXMsIG9wdHMpO1xyXG59XHJcbmluaGVyaXRzKFRhbGtpbmcsIEJlaGF2aW9yKTtcclxuZXh0ZW5kKFRhbGtpbmcucHJvdG90eXBlLCB7XHJcblx0ZGlhbG9nOiBudWxsLFxyXG5cdGRpYWxvZ190eXBlOiBcImRpYWxvZ1wiLFxyXG5cdG93bmVyOiBudWxsLFxyXG5cdF9fdWlfZmlyZWQ6IGZhbHNlLFxyXG5cdFxyXG5cdC8vIHJlc2V0OiBmdW5jdGlvbigpIHsgdGhpcy5fX3VpX2ZpcmVkID0gZmFsc2U7IH0sXHJcblx0XHJcblx0dGljazogZnVuY3Rpb24obWUsIGRlbHRhKSB7XHJcblx0XHR2YXIgc2VsZiA9IHRoaXM7XHJcblx0XHRpZiAoIXRoaXMuX191aV9maXJlZCkge1xyXG5cdFx0XHRVSS5zaG93VGV4dEJveCh0aGlzLmRpYWxvZ190eXBlLCB0aGlzLmRpYWxvZywge1xyXG5cdFx0XHRcdG93bmVyOiB0aGlzLm93bmVyLFxyXG5cdFx0XHRcdGNvbXBsZXRlOiBmdW5jdGlvbigpIHtcclxuXHRcdFx0XHRcdG1lLmJlaGF2aW9yU3RhY2sucG9wKCk7XHJcblx0XHRcdFx0XHRzZWxmLl9fdWlfZmlyZWQgPSBmYWxzZTtcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0dGhpcy5fX3VpX2ZpcmVkID0gdHJ1ZTtcclxuXHRcdH1cclxuXHR9LFxyXG59KTtcclxubW9kdWxlLmV4cG9ydHMuVGFsa2luZyA9IFRhbGtpbmc7XHJcblxyXG5cclxuXHJcbmZ1bmN0aW9uIEZhY2VEaXJlY3Rpb24oeCwgeSwgb3B0cykge1xyXG5cdEJlaGF2aW9yLmNhbGwodGhpcywgb3B0cyk7XHJcblx0dGhpcy5kaXJfeCA9IHg7XHJcblx0dGhpcy5kaXJfeSA9IHk7XHJcbn1cclxuaW5oZXJpdHMoRmFjZURpcmVjdGlvbiwgQmVoYXZpb3IpO1xyXG5leHRlbmQoRmFjZURpcmVjdGlvbi5wcm90b3R5cGUsIHtcclxuXHRkaXJfeDogMCxcclxuXHRkaXJfeTogMSxcclxuXHRcclxuXHR0aWNrOiBmdW5jdGlvbihtZSwgZGVsdGEpIHtcclxuXHRcdG1lLmZhY2VEaXIodGhpcy5kaXJfeCwgdGhpcy5kaXJfeSk7XHJcblx0fSxcclxufSk7XHJcbm1vZHVsZS5leHBvcnRzLkZhY2VEaXJlY3Rpb24gPSBGYWNlRGlyZWN0aW9uO1xyXG5cclxuXHJcblxyXG5mdW5jdGlvbiBMb29rQXJvdW5kKG9wdHMpIHtcclxuXHRCZWhhdmlvci5jYWxsKHRoaXMsIG9wdHMpO1xyXG59XHJcbmluaGVyaXRzKExvb2tBcm91bmQsIEJlaGF2aW9yKTtcclxuZXh0ZW5kKExvb2tBcm91bmQucHJvdG90eXBlLCB7XHJcblx0d2FpdFRpbWUgOiAwLFxyXG5cdHRpY2s6IGZ1bmN0aW9uKG1lLCBkZWx0YSkge1xyXG5cdFx0aWYgKHRoaXMud2FpdFRpbWUgPiAwKSB7XHJcblx0XHRcdHRoaXMud2FpdFRpbWUgLT0gZGVsdGE7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0c3dpdGNoKCBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkqNCkgKSB7XHJcblx0XHRcdGNhc2UgMDogbWUuZmFjaW5nLnNldCggMSwwLCAwKTsgYnJlYWs7XHJcblx0XHRcdGNhc2UgMTogbWUuZmFjaW5nLnNldCgtMSwwLCAwKTsgYnJlYWs7XHJcblx0XHRcdGNhc2UgMjogbWUuZmFjaW5nLnNldCggMCwwLCAxKTsgYnJlYWs7XHJcblx0XHRcdGNhc2UgMzogbWUuZmFjaW5nLnNldCggMCwwLC0xKTsgYnJlYWs7XHJcblx0XHR9XHJcblx0XHR0aGlzLndhaXRUaW1lICs9IChNYXRoLnJhbmRvbSgpICogMzApICsgNTtcclxuXHR9LFxyXG59KTtcclxubW9kdWxlLmV4cG9ydHMuTG9va0Fyb3VuZCA9IExvb2tBcm91bmQ7XHJcblxyXG5cclxuXHJcbmZ1bmN0aW9uIE1lYW5kZXIob3B0cykge1xyXG5cdEJlaGF2aW9yLmNhbGwodGhpcywgb3B0cyk7XHJcbn1cclxuaW5oZXJpdHMoTWVhbmRlciwgQmVoYXZpb3IpO1xyXG5leHRlbmQoTWVhbmRlci5wcm90b3R5cGUsIHtcclxuXHR3YWl0VGltZSA6IDAsXHJcblx0dGljazogZnVuY3Rpb24obWUsIGRlbHRhKSB7XHJcblx0XHRpZiAodGhpcy53YWl0VGltZSA+IDApIHtcclxuXHRcdFx0dGhpcy53YWl0VGltZSAtPSBkZWx0YTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHRzd2l0Y2goIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSo4KSApIHtcclxuXHRcdFx0Y2FzZSAwOiBtZS5mYWNpbmcuc2V0KCAxLDAsIDApOyBicmVhaztcclxuXHRcdFx0Y2FzZSAxOiBtZS5mYWNpbmcuc2V0KC0xLDAsIDApOyBicmVhaztcclxuXHRcdFx0Y2FzZSAyOiBtZS5mYWNpbmcuc2V0KCAwLDAsIDEpOyBicmVhaztcclxuXHRcdFx0Y2FzZSAzOiBtZS5mYWNpbmcuc2V0KCAwLDAsLTEpOyBicmVhaztcclxuXHRcdFx0Y2FzZSA0OiBtZS5tb3ZlRGlyKFwiZFwiKTsgYnJlYWs7XHJcblx0XHRcdGNhc2UgNTogbWUubW92ZURpcihcInVcIik7IGJyZWFrO1xyXG5cdFx0XHRjYXNlIDY6IG1lLm1vdmVEaXIoXCJsXCIpOyBicmVhaztcclxuXHRcdFx0Y2FzZSA3OiBtZS5tb3ZlRGlyKFwiclwiKTsgYnJlYWs7XHJcblx0XHR9XHJcblx0XHR0aGlzLndhaXRUaW1lICs9IChNYXRoLnJhbmRvbSgpICogMzApICsgNTtcclxuXHR9LFxyXG59KTtcclxubW9kdWxlLmV4cG9ydHMuTWVhbmRlciA9IE1lYW5kZXI7XHJcblxyXG4iLCIvLyBjb250cm9sbGVyLmpzXHJcbi8vIFRoaXMgY2xhc3MgaGFuZGxlcyBpbnB1dCBhbmQgY29udmVydHMgaXQgdG8gY29udHJvbCBzaWduYWxzXHJcblxyXG52YXIgaW5oZXJpdHMgPSByZXF1aXJlKFwiaW5oZXJpdHNcIik7XHJcbnZhciBleHRlbmQgPSByZXF1aXJlKFwiZXh0ZW5kXCIpO1xyXG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZShcImV2ZW50c1wiKS5FdmVudEVtaXR0ZXI7XHJcblxyXG4vLyBUT0RPIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0d1aWRlL0FQSS9HYW1lcGFkXHJcblxyXG5mdW5jdGlvbiBDb250cm9sTWFuYWdlcigpIHtcclxuXHR2YXIgc2VsZiA9IHRoaXM7XHJcblx0dGhpcy5zZXRLZXlDb25maWcoKTtcclxuXHRcclxuXHQkKGZ1bmN0aW9uKCl7XHJcblx0XHQkKGRvY3VtZW50KS5vbihcImtleWRvd25cIiwgZnVuY3Rpb24oZSl7IHNlbGYub25LZXlEb3duKGUpOyB9KTtcclxuXHRcdCQoZG9jdW1lbnQpLm9uKFwia2V5dXBcIiwgZnVuY3Rpb24oZSl7IHNlbGYub25LZXlVcChlKTsgfSk7XHJcblx0XHRcclxuXHRcdCQoXCIjY2hhdGJveFwiKS5vbihcImZvY3VzXCIsIGZ1bmN0aW9uKGUpeyBcclxuXHRcdFx0Y29uc29sZS5sb2coXCJDSEFUIEZPQ1VTXCIpO1xyXG5cdFx0XHRzZWxmLmlucHV0Q29udGV4dC5wdXNoKFwiY2hhdFwiKTsgXHJcblx0XHR9KTtcclxuXHRcdCQoXCIjY2hhdGJveFwiKS5vbihcImJsdXJcIiwgZnVuY3Rpb24oZSl7IFxyXG5cdFx0XHRjb25zb2xlLmxvZyhcIkNIQVQgQkxVUlwiKTtcclxuXHRcdFx0aWYgKHNlbGYuaW5wdXRDb250ZXh0LnRvcCA9PSBcImNoYXRcIilcclxuXHRcdFx0XHRzZWxmLmlucHV0Q29udGV4dC5wb3AoKTsgXHJcblx0XHR9KTtcclxuXHRcdFxyXG5cdFx0c2VsZi50b3VjaE1hbmFnZXIoKTtcclxuXHR9KVxyXG59XHJcbmluaGVyaXRzKENvbnRyb2xNYW5hZ2VyLCBFdmVudEVtaXR0ZXIpO1xyXG5leHRlbmQoQ29udHJvbE1hbmFnZXIucHJvdG90eXBlLCB7XHJcblx0aW5wdXRDb250ZXh0IDogW1wiZ2FtZVwiXSxcclxuXHRcclxuXHRrZXlzX2NvbmZpZyA6IHtcclxuXHRcdFVwOiBbMzgsIFwiVXBcIiwgODcsIFwid1wiXSwgXHJcblx0XHREb3duOiBbNDAsIFwiRG93blwiLCA4MywgXCJzXCJdLCBcclxuXHRcdExlZnQ6IFszNywgXCJMZWZ0XCIsIDY1LCBcImFcIl0sIFxyXG5cdFx0UmlnaHQ6IFszOSwgXCJSaWdodFwiLCA2OCwgXCJkXCJdLFxyXG5cdFx0SW50ZXJhY3Q6IFsxMywgXCJFbnRlclwiLCAzMiwgXCIgXCJdLFxyXG5cdFx0Q2FuY2VsOiBbMjcsIFwiRXNjYXBlXCIsIDE3LCBcIkN0cmxcIl0sXHJcblx0XHRSdW46IFsxNiwgXCJTaGlmdFwiXSxcclxuXHRcdE1lbnU6IFs4LCBcIkJhY2tzcGFjZVwiLCA0NiwgXCJEZWxldGVcIl0sXHJcblx0XHRGb2N1c0NoYXQ6IFsxOTEsIFwiL1wiXSxcclxuXHR9LFxyXG5cdFxyXG5cdGtleXNfYWN0aXZlIDoge30sXHJcblx0XHJcblx0a2V5c19kb3duIDoge1xyXG5cdFx0VXA6IGZhbHNlLCBEb3duOiBmYWxzZSxcclxuXHRcdExlZnQ6IGZhbHNlLCBSaWdodDogZmFsc2UsXHJcblx0XHRJbnRlcmFjdDogZmFsc2UsIEZvY3VzQ2hhdDogZmFsc2UsXHJcblx0XHRSdW46IGZhbHNlLCBDYW5jZWw6IGZhbHNlLFxyXG5cdH0sXHJcblx0XHJcblx0cHVzaElucHV0Q29udGV4dDogZnVuY3Rpb24oY3R4KSB7XHJcblx0XHR0aGlzLmlucHV0Q29udGV4dC5wdXNoKGN0eCk7XHJcblx0XHR0aGlzLmVtaXQoXCJpbnB1dENvbnRleHRDaGFuZ2VkXCIpO1xyXG5cdH0sXHJcblx0cG9wSW5wdXRDb250ZXh0OiBmdW5jdGlvbihjdHgpIHtcclxuXHRcdGlmICghY3R4IHx8IHRoaXMuaW5wdXRDb250ZXh0LnRvcCA9PSBjdHgpIHtcclxuXHRcdFx0dmFyIGMgPSB0aGlzLmlucHV0Q29udGV4dC5wb3AoKTtcclxuXHRcdFx0dGhpcy5lbWl0KFwiaW5wdXRDb250ZXh0Q2hhbmdlZFwiKTtcclxuXHRcdFx0cmV0dXJuIGM7XHJcblx0XHR9XHJcblx0fSxcclxuXHRyZW1vdmVJbnB1dENvbnRleHQ6IGZ1bmN0aW9uKGN0eCkge1xyXG5cdFx0aWYgKCFjdHgpIHJldHVybjtcclxuXHRcdHZhciBpbmRleCA9IHRoaXMuaW5wdXRDb250ZXh0Lmxhc3RJbmRleE9mKGN0eCk7XHJcblx0XHRpZiAoaW5kZXggPiAtMSkge1xyXG5cdFx0XHR0aGlzLmlucHV0Q29udGV4dC5zcGxpY2UoaW5kZXgsIDEpO1xyXG5cdFx0XHR0aGlzLmVtaXQoXCJpbnB1dENvbnRleHRDaGFuZ2VkXCIpO1xyXG5cdFx0XHRyZXR1cm4gY3R4O1xyXG5cdFx0fVxyXG5cdH0sXHJcblx0XHJcblx0aXNEb3duIDogZnVuY3Rpb24oa2V5LCBjdHgpIHtcclxuXHRcdGlmICgkLmlzQXJyYXkoY3R4KSkge1xyXG5cdFx0XHR2YXIgZ28gPSBmYWxzZTtcclxuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBjdHgubGVuZ3RoOyBpKyspIGdvIHw9IGN0eFtpXTtcclxuXHRcdFx0aWYgKCFnbykgcmV0dXJuO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0aWYgKHRoaXMuaW5wdXRDb250ZXh0LnRvcCAhPSBjdHgpIHJldHVybjtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0cmV0dXJuIHRoaXMua2V5c19kb3duW2tleV07XHJcblx0fSxcclxuXHRpc0Rvd25PbmNlIDogZnVuY3Rpb24oa2V5LCBjdHgpIHtcclxuXHRcdGlmICgkLmlzQXJyYXkoY3R4KSkge1xyXG5cdFx0XHR2YXIgZ28gPSBmYWxzZTtcclxuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBjdHgubGVuZ3RoOyBpKyspIGdvIHw9IGN0eFtpXTtcclxuXHRcdFx0aWYgKCFnbykgcmV0dXJuO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0aWYgKHRoaXMuaW5wdXRDb250ZXh0LnRvcCAhPSBjdHgpIHJldHVybjtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0cmV0dXJuIHRoaXMua2V5c19kb3duW2tleV0gPT0gMTtcclxuXHR9LFxyXG5cdFxyXG5cdHNldEtleUNvbmZpZyA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0dGhpcy5rZXlzX2FjdGl2ZSA9IGV4dGVuZCh0cnVlLCB7fSwgdGhpcy5rZXlzX2NvbmZpZyk7XHJcblx0fSxcclxuXHRcclxuXHRvbktleURvd24gOiBmdW5jdGlvbihlKSB7XHJcblx0XHRmb3IgKHZhciBhY3Rpb24gaW4gdGhpcy5rZXlzX2FjdGl2ZSkge1xyXG5cdFx0XHR2YXIga2V5cyA9IHRoaXMua2V5c19hY3RpdmVbYWN0aW9uXTtcclxuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdFx0aWYgKGUud2hpY2ggPT0ga2V5c1tpXSkge1xyXG5cdFx0XHRcdFx0Ly8gS2V5IGlzIG5vdyBkb3duIVxyXG5cdFx0XHRcdFx0dGhpcy5lbWl0S2V5KGFjdGlvbiwgdHJ1ZSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fSxcclxuXHRvbktleVVwIDogZnVuY3Rpb24gKGUpIHtcclxuXHRcdGZvciAodmFyIGFjdGlvbiBpbiB0aGlzLmtleXNfYWN0aXZlKSB7XHJcblx0XHRcdHZhciBrZXlzID0gdGhpcy5rZXlzX2FjdGl2ZVthY3Rpb25dO1xyXG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGtleXMubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0XHRpZiAoZS53aGljaCA9PSBrZXlzW2ldKSB7XHJcblx0XHRcdFx0XHQvLyBLZXkgaXMgbm93IHVwIVxyXG5cdFx0XHRcdFx0dGhpcy5lbWl0S2V5KGFjdGlvbiwgZmFsc2UpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH0sXHJcblx0XHJcblx0c3VibWl0Q2hhdEtleXByZXNzIDogZnVuY3Rpb24oa2V5KSB7XHJcblx0XHRzd2l0Y2goa2V5KSB7XHJcblx0XHRcdFxyXG5cdFx0fVxyXG5cdH0sXHJcblx0XHJcblx0ZW1pdEtleSA6IGZ1bmN0aW9uKGFjdGlvbiwgZG93bikge1xyXG5cdFx0aWYgKHRoaXMua2V5c19kb3duW2FjdGlvbl0gIT0gZG93bikge1xyXG5cdFx0XHR0aGlzLmtleXNfZG93blthY3Rpb25dID0gZG93bjtcclxuXHRcdFx0dGhpcy5lbWl0KFwiY29udHJvbC1hY3Rpb25cIiwgYWN0aW9uLCBkb3duKTtcclxuXHRcdH1cclxuXHR9LFxyXG5cdFxyXG5cdF90aWNrIDogZnVuY3Rpb24oKSB7XHJcblx0XHRmb3IgKHZhciBuYW1lIGluIHRoaXMua2V5c19kb3duKSB7XHJcblx0XHRcdGlmICh0aGlzLmtleXNfZG93bltuYW1lXSA+IDApXHJcblx0XHRcdFx0dGhpcy5rZXlzX2Rvd25bbmFtZV0rKztcclxuXHRcdH1cclxuXHR9XHJcblx0XHJcbn0pO1xyXG5cclxuQ29udHJvbE1hbmFnZXIucHJvdG90eXBlLnRvdWNoTWFuYWdlciA9IGZ1bmN0aW9uKCkge1xyXG5cdHZhciBzZWxmID0gdGhpcztcclxuXHRcclxuXHQkKGRvY3VtZW50KS5vbmUoXCJ0b3VjaHN0YXJ0XCIsIGZ1bmN0aW9uKCl7XHJcblx0XHQkKFwiaHRtbFwiKS5hZGRDbGFzcyhcInRvdWNobW9kZVwiKTtcclxuXHRcdGlmICghJChcIiN0b3VjaGNvbnRyb2xzXCIpLmxlbmd0aCkge1xyXG5cdFx0XHRmdW5jdGlvbiBfX21hcChidG4sIGtleSkge1xyXG5cdFx0XHRcdGJ0bi5vbihcInRvdWNoc3RhcnRcIiwgZnVuY3Rpb24oZSl7XHJcblx0XHRcdFx0XHRjb25zb2xlLmxvZyhcIlRPVUNIU1RBUlQ6IFwiLCBrZXkpO1xyXG5cdFx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cdFx0XHRcdFx0c2VsZi5lbWl0S2V5KGtleSwgdHJ1ZSk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdFx0YnRuLm9uKFwidG91Y2hlbmRcIiwgZnVuY3Rpb24oZSl7XHJcblx0XHRcdFx0XHRjb25zb2xlLmxvZyhcIlRPVUNIRU5EOiBcIiwga2V5KTtcclxuXHRcdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcclxuXHRcdFx0XHRcdHNlbGYuZW1pdEtleShrZXksIGZhbHNlKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0XHRidG4ub24oXCJ0b3VjaGNhbmNlbFwiLCBmdW5jdGlvbihlKXtcclxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKFwiVE9VQ0hDQU5DRUw6IFwiLCBrZXkpO1xyXG5cdFx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cdFx0XHRcdFx0c2VsZi5lbWl0S2V5KGtleSwgZmFsc2UpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHRcdGJ0bi5vbihcInRvdWNobW92ZVwiLCBmdW5jdGlvbihlKXtcclxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKFwiVE9VQ0hNT1ZFOiBcIiwga2V5KTtcclxuXHRcdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcclxuXHRcdFx0XHR9KVxyXG5cdFx0XHRcdHJldHVybiBidG47XHJcblx0XHRcdH1cclxuXHRcdFx0XHJcblx0XHRcdCQoXCI8ZGl2PlwiKS5hdHRyKFwiaWRcIiwgXCJ0b3VjaGNvbnRyb2xzXCIpXHJcblx0XHRcdC5hcHBlbmQgKFxyXG5cdFx0XHRcdF9fbWFwKCQoXCI8ZGl2PlwiKS5hZGRDbGFzcyhcImJ1dHRvblwiKS5hZGRDbGFzcyhcImFcIiksIFwiSW50ZXJhY3RcIilcclxuXHRcdFx0KS5hcHBlbmQgKFxyXG5cdFx0XHRcdF9fbWFwKCQoXCI8ZGl2PlwiKS5hZGRDbGFzcyhcImJ1dHRvblwiKS5hZGRDbGFzcyhcImJcIiksIFwiQ2FuY2VsXCIpXHJcblx0XHRcdCkuYXBwZW5kIChcclxuXHRcdFx0XHRfX21hcCgkKFwiPGRpdj5cIikuYWRkQ2xhc3MoXCJidXR0b25cIikuYWRkQ2xhc3MoXCJtZW51XCIpLCBcIk1lbnVcIilcclxuXHRcdFx0KS5hcHBlbmQgKFxyXG5cdFx0XHRcdF9fbWFwKCQoXCI8ZGl2PlwiKS5hZGRDbGFzcyhcImJ1dHRvblwiKS5hZGRDbGFzcyhcInJ1blwiKSwgXCJSdW5cIilcclxuXHRcdFx0KS5hcHBlbmQgKFxyXG5cdFx0XHRcdCQoXCI8ZGl2PlwiKS5hZGRDbGFzcyhcImRwYWRcIilcclxuXHRcdFx0XHQuYXBwZW5kIChcclxuXHRcdFx0XHRcdF9fbWFwKCQoXCI8ZGl2PlwiKS5hZGRDbGFzcyhcImJ1dHRvblwiKS5hZGRDbGFzcyhcInVwXCIpLCBcIlVwXCIpXHJcblx0XHRcdFx0KS5hcHBlbmQgKFxyXG5cdFx0XHRcdFx0X19tYXAoJChcIjxkaXY+XCIpLmFkZENsYXNzKFwiYnV0dG9uXCIpLmFkZENsYXNzKFwiZG93blwiKSwgXCJEb3duXCIpXHJcblx0XHRcdFx0KS5hcHBlbmQgKFxyXG5cdFx0XHRcdFx0X19tYXAoJChcIjxkaXY+XCIpLmFkZENsYXNzKFwiYnV0dG9uXCIpLmFkZENsYXNzKFwibGVmdFwiKSwgXCJMZWZ0XCIpXHJcblx0XHRcdFx0KS5hcHBlbmQgKFxyXG5cdFx0XHRcdFx0X19tYXAoJChcIjxkaXY+XCIpLmFkZENsYXNzKFwiYnV0dG9uXCIpLmFkZENsYXNzKFwicmlnaHRcIiksIFwiUmlnaHRcIilcclxuXHRcdFx0XHQpXHJcblx0XHRcdCkuYXBwZW5kVG8oXCJib2R5XCIpO1xyXG5cdFx0fVxyXG5cdH0pO1xyXG59XHJcblxyXG5cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gbmV3IENvbnRyb2xNYW5hZ2VyKCk7XHJcbiIsIi8vIGV2ZW50LmpzXHJcbi8vIERlZmluZXMgdGhlIGJhc2UgZXZlbnQgdXNlZCB0aHJvdWdob3V0IHRoZSBwYXJrLlxyXG5cclxuLy8gRml0dGluZ2x5LCBFdmVudCBpcyBhIHN1YmNsYXNzIG9mIG5vZGUuanMncyBFdmVudEVtaXR0ZXIgY2xhc3MuXHJcbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKFwiZXZlbnRzXCIpLkV2ZW50RW1pdHRlcjtcclxudmFyIGluaGVyaXRzID0gcmVxdWlyZShcImluaGVyaXRzXCIpO1xyXG52YXIgZXh0ZW5kID0gcmVxdWlyZShcImV4dGVuZFwiKTtcclxuXHJcbi8qKlxyXG4gKiBBbiBldmVudCBpcyBhbnkgaW50ZXJhY3RhYmxlIG9yIGFuaW1hdGluZyBvYmplY3QgaW4gdGhlIGdhbWUuXHJcbiAqIFRoaXMgaW5jbHVkZXMgdGhpbmdzIHJhbmdpbmcgZnJvbSBzaWducywgdG8gcGVvcGxlL3Bva2Vtb24uXHJcbiAqIEFuIGV2ZW50OlxyXG4gKlx0LSBUYWtlcyB1cCBhdCBsZWFzdCBvbmUgdGlsZSBvbiB0aGUgbWFwXHJcbiAqXHQtIENhbiBiZSBpbnRlcmFjdGVkIHdpdGggYnkgaW4tZ2FtZSB0YWxraW5nIG9yIG9uLXNjcmVlbiBjbGlja1xyXG4gKlx0LSBNYXkgYmUgcmVwcmVzZW50ZWQgaW4tZ2FtZSBieSBhIHNwcml0ZVxyXG4gKlx0LSBNYXkgZGVjaWRlLCB1cG9uIGNyZWF0aW9uLCB0byBub3QgYXBwZWFyIG9uIHRoZSBtYXAuXHJcbiAqL1xyXG5mdW5jdGlvbiBFdmVudChiYXNlLCBvcHRzKSB7XHJcblx0RXZlbnRFbWl0dGVyLmNhbGwodGhpcyk7XHJcblx0XHJcblx0ZXh0ZW5kKHRoaXMsIGJhc2UsIG9wdHMpO1xyXG5cdFxyXG5cdHRoaXMuX25vcm1hbGl6ZUxvY2F0aW9uKCk7XHJcblx0XHJcblx0aWYgKHRoaXMub25FdmVudHMpIHtcclxuXHRcdHZhciBrZXlzID0gT2JqZWN0LmtleXModGhpcy5vbkV2ZW50cyk7XHJcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGtleXMubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0dGhpcy5vbihrZXlzW2ldLCB0aGlzLm9uRXZlbnRzW2tleXNbaV1dKTtcclxuXHRcdH1cclxuXHRcdGRlbGV0ZSB0aGlzLm9uRXZlbnRzO1xyXG5cdH1cclxufVxyXG5pbmhlcml0cyhFdmVudCwgRXZlbnRFbWl0dGVyKTtcclxuZXh0ZW5kKEV2ZW50LnByb3RvdHlwZSwge1xyXG5cdGlkIDogbnVsbCxcclxuXHRlbmFibGVkIDogZmFsc2UsXHJcblx0dmlzaWJsZSA6IHRydWUsXHJcblx0XHJcblx0bG9jYXRpb24gOiBudWxsLCAvLyBFdmVudHMgd2l0aCBhIHNpbmdsZSBsb2NhdGlvbiBhcmUgb3B0aW1pemVkIGZvciBpdFxyXG5cdGxvY2F0aW9ucyA6IG51bGwsIC8vIEV2ZW50cyB3aXRoIG11bHRpcGxlIGxvY2F0aW9ucyBhcmUgb3B0aW1pemVkIGZvciB0aGF0IGFsc29cclxuXHRcclxuXHR0b1N0cmluZyA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0aWYgKCF0aGlzLmlkKSByZXR1cm4gXCI8TG9jYWwgb3IgVW5uYW1lZCBFdmVudD5cIjtcclxuXHRcdHJldHVybiB0aGlzLmlkO1xyXG5cdH0sXHJcblx0XHJcblx0c2hvdWxkQXBwZWFyIDogZnVuY3Rpb24obWFwaWQpeyByZXR1cm4gdHJ1ZTsgfSxcclxuXHRjYW5XYWxrT24gOiBmdW5jdGlvbigpeyByZXR1cm4gdHJ1ZTsgfSxcclxuXHRcclxuXHQvKiogUmV0dXJucyBhbiBvYmplY3QgdG8gcmVwcmVzZW50IHRoaXMgZXZlbnQgaW4gM0Qgc3BhY2UsIG9yIG51bGwgaWYgdGhlcmUgc2hvdWxkbid0IGJlIG9uZS4gKi9cclxuXHRnZXRBdmF0YXIgOiBmdW5jdGlvbihtYXAsIGdjKXsgcmV0dXJuIG51bGw7IH0sXHJcblx0XHJcblx0b25FdmVudHMgOiBudWxsLCAvL2Egb2JqZWN0LCBldmVudC1uYW1lcyAtPiBmdW5jdGlvbnMgdG8gY2FsbCwgdG8gYmUgcmVnaXN0ZXJlZCBpbiBjb25zdHJ1Y3RvclxyXG5cdFxyXG5cdGNhbk1vdmUgOiBmdW5jdGlvbigpIHtcclxuXHRcdC8vSWYgd2Ugb25seSBoYXZlIDEgbG9jYXRpb24sIHRoZW4gd2UgY2FuIG1vdmVcclxuXHRcdHJldHVybiAhIXRoaXMubG9jYXRpb24gJiYgIXRoaXMubG9jYXRpb25zO1xyXG5cdH0sXHJcblx0XHJcblx0bW92ZVRvIDogZnVuY3Rpb24oeCwgeSkge1xyXG5cdFx0aWYgKCF0aGlzLmNhbk1vdmUoKSlcclxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiVGhpcyBldmVudCBpcyBpbiBzZXZlcmFsIHBsYWNlcyBhdCBvbmNlLCBhbmQgY2Fubm90IG1vdmVUbyFcIik7XHJcblx0XHRcclxuXHRcdC8vVE9ETyBxdWV1ZSB1cCBhIG1vdmVcclxuXHR9LFxyXG5cdFxyXG5cdF9ub3JtYWxpemVMb2NhdGlvbiA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0aWYgKHRoaXMubG9jYXRpb24pIHtcclxuXHRcdFx0Ly9JZiB3ZSBoYXZlIGEgc2luZ3VsYXIgbG9jYXRpb24gc2V0XHJcblx0XHRcdGlmICh0aGlzLmxvY2F0aW9ucykgLy8gQXMgbG9uZyBhcyB3ZSBkb24ndCBhbHNvIGhhdmUgYSBsaXN0LCBpdHMgZmluZVxyXG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcihcIkV2ZW50IHdhcyBpbml0aWFsaXplZCB3aXRoIGJvdGggbG9jYXRpb24gYW5kIGxvY2F0aW9ucyEgVGhleSBjYW5ub3QgYmUgYm90aCBkZWZpbmVkIVwiKTtcclxuXHRcdFx0XHJcblx0XHRcdHZhciBsb2MgPSB0aGlzLmxvY2F0aW9uO1xyXG5cdFx0XHRpZiAoJC5pc0Z1bmN0aW9uKGxvYykpIHtcclxuXHRcdFx0XHRsb2NzID0gbG9jLmNhbGwodGhpcyk7XHJcblx0XHRcdH1cclxuXHRcdFx0XHJcblx0XHRcdGlmICgkLmlzQXJyYXkobG9jKSAmJiBsb2MubGVuZ3RoID09IDIgJiYgdHlwZW9mIGxvY1swXSA9PSBcIm51bWJlclwiICYmIHR5cGVvZiBsb2NbMV0gPT0gXCJudW1iZXJcIikgXHJcblx0XHRcdHtcclxuXHRcdFx0XHRsb2MgPSBuZXcgVEhSRUUuVmVjdG9yMihsb2NbMF0sIGxvY1sxXSk7XHJcblx0XHRcdH0gXHJcblx0XHRcdGVsc2UgaWYgKCQuaXNBcnJheShsb2MpICYmIGxvYy5sZW5ndGggPT0gMyBcclxuXHRcdFx0XHQmJiB0eXBlb2YgbG9jWzBdID09IFwibnVtYmVyXCIgJiYgdHlwZW9mIGxvY1sxXSA9PSBcIm51bWJlclwiICYmIHR5cGVvZiBsb2NbMl0gPT0gXCJudW1iZXJcIikgXHJcblx0XHRcdHtcclxuXHRcdFx0XHRsb2MgPSBuZXcgVEhSRUUuVmVjdG9yMyhsb2NbMF0sIGxvY1sxXSwgbG9jWzJdKTtcclxuXHRcdFx0fSBcclxuXHRcdFx0ZWxzZSBpZiAoIShsb2MgaW5zdGFuY2VvZiBUSFJFRS5WZWN0b3IyIHx8IGxvYyBpbnN0YW5jZW9mIFRIUkVFLlZlY3RvcjMpKSBcclxuXHRcdFx0e1xyXG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcihcIkNvdWxkIG5vdCBub3JtYWxpemUgbG9jYXRpb24gb2YgXCIrdGhpcy5pZCtcIiFcIik7XHJcblx0XHRcdH1cclxuXHRcdFx0dGhpcy5sb2NhdGlvbiA9IGxvYztcclxuXHRcdFx0cmV0dXJuIDE7XHJcblx0XHR9XHJcblx0XHR2YXIgb3JnbG9jID0gdGhpcy5sb2NhdGlvbnM7XHJcblx0XHR2YXIgbG9jcyA9IG51bGw7XHJcblx0XHRcclxuXHRcdGlmICgkLmlzQXJyYXkob3JnbG9jKSkge1xyXG5cdFx0XHR2YXIgdHlwZSA9IG51bGwsIG5ld1R5cGUgPSBudWxsO1xyXG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IG9yZ2xvYy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRcdGlmICh0eXBlb2Ygb3JnbG9jW2ldID09IFwibnVtYmVyXCIpXHJcblx0XHRcdFx0XHRuZXdUeXBlID0gXCJudW1iZXJcIjtcclxuXHRcdFx0XHRlbHNlIGlmIChvcmdsb2NbaV0gaW5zdGFuY2VvZiBUSFJFRS5WZWN0b3IyKVxyXG5cdFx0XHRcdFx0bmV3VHlwZSA9IFwidmVjdG9yXCI7XHJcblx0XHRcdFx0ZWxzZSBpZiAob3JnbG9jW2ldIGluc3RhbmNlb2YgVEhSRUUuVmVjdG9yMylcclxuXHRcdFx0XHRcdG5ld1R5cGUgPSBcInZlY3RvclwiO1xyXG5cdFx0XHRcdGVsc2UgaWYgKCQuaXNBcnJheShvcmdsb2NbaV0pKVxyXG5cdFx0XHRcdFx0bmV3VHlwZSA9IFwiYXJyYXlcIjtcclxuXHRcdFx0XHRcclxuXHRcdFx0XHRpZiAoIXR5cGUpIHR5cGUgPSBuZXdUeXBlO1xyXG5cdFx0XHRcdGlmICh0eXBlICE9IG5ld1R5cGUpIHtcclxuXHRcdFx0XHRcdHRocm93IG5ldyBFcnJvcihcIkNvdWxkIG5vdCBub3JtYWxpemUgbG9jYXRpb25zIG9mIFwiK3RoaXMuaWQrXCIhXCIpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XHRpZiAodHlwZSA9PSBcIm51bWJlclwiKSBsb2NzID0gX19wYXJzZUFzTnVtYmVyQXJyYXkob3JnbG9jKTtcclxuXHRcdFx0aWYgKHR5cGUgPT0gXCJhcnJheVwiKSBsb2NzID0gX19wYXJzZUFzQXJyYXlBcnJheShvcmdsb2MpO1xyXG5cdFx0XHRpZiAodHlwZSA9PSBcInZlY3RvclwiKSBsb2NzID0gb3JnbG9jO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSBpZiAoJC5pc0Z1bmN0aW9uKG9yZ2xvYykpIHtcclxuXHRcdFx0bG9jcyA9IG9yZ2xvYy5jYWxsKHRoaXMpO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSBpZiAob3JnbG9jIGluc3RhbmNlb2YgVEhSRUUuVmVjdG9yMikge1xyXG5cdFx0XHRsb2NzID0gW29yZ2xvY107XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdGlmICghbG9jcyB8fCAhJC5pc0FycmF5KGxvY3MpIHx8IGxvY3MubGVuZ3RoID09IDApIFxyXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJDb3VsZCBub3Qgbm9ybWFsaXplIGxvY2F0aW9ucyBvZiBcIit0aGlzLmlkK1wiIVwiKTtcclxuXHRcdFxyXG5cdFx0dGhpcy5sb2NhdGlvbnMgPSBsb2NzO1xyXG5cdFx0dGhpcy5fbm9ybWFsaXplTG9jYXRpb24gPSBmdW5jdGlvbigpeyByZXR1cm4gbG9jcy5sZW5ndGg7IH07IC8vY2FuJ3Qgbm9ybWFsaXplIHR3aWNlXHJcblx0XHRyZXR1cm4gbG9jcy5sZW5ndGg7XHJcblx0XHRcclxuXHRcdGZ1bmN0aW9uIF9fcGFyc2VBc051bWJlckFycmF5KGwpIHtcclxuXHRcdFx0aWYgKGwubGVuZ3RoID09IDIpIC8vc2luZ2xlIHBvaW50IFt4LCB5XVxyXG5cdFx0XHRcdHJldHVybiBbbmV3IFRIUkVFLlZlY3RvcjIobFswXSwgbFsxXSldO1xyXG5cdFx0XHRpZiAobC5sZW5ndGggPT0gMykgLy9zaW5nbGUgcG9pbnQgW3gsIHksIHpdXHJcblx0XHRcdFx0cmV0dXJuIFtuZXcgVEhSRUUuVmVjdG9yMyhsWzBdLCBsWzFdLCBsWzJdKV07XHJcblx0XHRcdGlmIChsLmxlbmd0aCA9PSA0KSB7IC8vcmVjdGFuZ2xlIFt4LCB5LCB3LCBoXVxyXG5cdFx0XHRcdHZhciBuID0gW107XHJcblx0XHRcdFx0Zm9yICh2YXIgeCA9IGxbMF07IHggPCBsWzBdK2xbMl07IHgrKykge1xyXG5cdFx0XHRcdFx0Zm9yICh2YXIgeSA9IGxbMV07IHkgPCBsWzFdK2xbM107IHkrKykge1xyXG5cdFx0XHRcdFx0XHRuLnB1c2gobmV3IFRIUkVFLlZlY3RvcjIoeCwgeSkpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRyZXR1cm4gbjtcclxuXHRcdFx0fVxyXG5cdFx0XHRpZiAobC5sZW5ndGggPT0gNSkgeyAvL3JlY3RhbmdsZSBbeCwgeSwgeiwgdywgaF1cclxuXHRcdFx0XHR2YXIgbiA9IFtdO1xyXG5cdFx0XHRcdGZvciAodmFyIHggPSBsWzBdOyB4IDwgbFswXStsWzNdOyB4KyspIHtcclxuXHRcdFx0XHRcdGZvciAodmFyIHkgPSBsWzFdOyB5IDwgbFsxXStsWzRdOyB5KyspIHtcclxuXHRcdFx0XHRcdFx0bi5wdXNoKG5ldyBUSFJFRS5WZWN0b3IzKHgsIHksIGxbMl0pKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0cmV0dXJuIG47XHJcblx0XHRcdH1cclxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiQ291bGQgbm90IG5vcm1hbGl6ZSBsb2NhdGlvbihzKSBvZiBcIit0aGlzLmlkK1wiIVwiKTtcclxuXHRcdH1cclxuXHRcdGZ1bmN0aW9uIF9fcGFyc2VBc0FycmF5QXJyYXkobCkge1xyXG5cdFx0XHR2YXIgbiA9IFtdO1xyXG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGwubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0XHRmb3IgKHZhciBqID0gMDsgaiA8IGxbaV0ubGVuZ3RoOyBqKyspIHtcclxuXHRcdFx0XHRcdGlmICh0eXBlb2YgbFtpXVtqXSAhPSBcIm51bWJlclwiKVxyXG5cdFx0XHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJDb3VsZCBub3Qgbm9ybWFsaXplIGxvY2F0aW9uKHMpIG9mIFwiK3RoaXMuaWQrXCIhXCIpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRuLnB1c2goX19wYXJzZUFzTnVtYmVyQXJyYXkobFtpXSkpO1xyXG5cdFx0XHR9XHJcblx0XHRcdHJldHVybiBuO1xyXG5cdFx0fVxyXG5cdH0sXHJcblx0XHJcblx0XHJcblx0ZGl2aWRlRmFjaW5nOiBmdW5jdGlvbihkaXJ2ZWN0b3IpIHtcclxuXHRcdHZhciB4ID0gZGlydmVjdG9yLngsIHkgPSBkaXJ2ZWN0b3IuejtcclxuXHRcdC8vIGNvbnNvbGUubG9nKFwiRElSRkFDSU5HOlwiLCB4LCB5KTtcclxuXHRcdGlmIChNYXRoLmFicyh4KSA+IE1hdGguYWJzKHkpKSB7IC8vRGlyZWN0aW9uIHZlY3RvciBpcyBwb2ludGluZyBhbG9uZyB4IGF4aXNcclxuXHRcdFx0aWYgKHggPiAwKSByZXR1cm4gXCJ3XCI7XHJcblx0XHRcdGVsc2UgcmV0dXJuIFwiZVwiO1xyXG5cdFx0fSBlbHNlIHsgLy9EaXJlY3Rpb24gdmVjdG9yIGlzIHBvaW50aW5nIGFsb25nIHkgYXhpc1xyXG5cdFx0XHRpZiAoeSA+IDApIHJldHVybiBcInNcIjtcclxuXHRcdFx0ZWxzZSByZXR1cm4gXCJuXCI7XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gXCJzXCI7XHJcblx0fVxyXG5cdFxyXG59KTtcclxubW9kdWxlLmV4cG9ydHMgPSBFdmVudDtcclxuXHJcbkV2ZW50LnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9XHJcbkV2ZW50LnByb3RvdHlwZS5vbiA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XHJcblx0aWYgKCQuaW5BcnJheSh0eXBlLCBfX0VWRU5UX1RZUEVTX18pID09IC0xKSB7XHJcblx0XHRjb25zb2xlLmVycm9yKFwiTWFwIEV2ZW50XCIsIHRoaXMudG9TdHJpbmcoKSwgXCJyZWdpc3RlcmluZyBlbWl0dGVkIGV2ZW50IHR5cGVcIiwgXHJcblx0XHRcdHR5cGUsIFwid2hpY2ggaXMgbm90IGEgdmFsaWQgZW1pdHRlZCBldmVudCB0eXBlIVwiKTtcclxuXHR9XHJcblx0RXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbi5jYWxsKHRoaXMsIHR5cGUsIGxpc3RlbmVyKTtcclxufVxyXG5cclxuLy8gVGhlIGZvbGxvd2luZyBpcyBhIGxpc3Qgb2YgZXZlbnRzIHRoZSBiYXNlIEV2ZW50IGNsYXNzIGFuZCBsaWJyYXJ5IGVtaXRcclxuLy8gVGhpcyBsaXN0IGlzIGNoZWNrZWQgYWdhaW5zdCB3aGVuIHJlZ2lzdGVyaW5nIHRvIGNhdGNoIG1pc3NwZWxsaW5ncy5cclxudmFyIF9fRVZFTlRfVFlQRVNfXyA9IFtcclxuXHRcImVudGVyaW5nLXRpbGVcIiwgLy8oZnJvbS1kaXIpIFxyXG5cdFx0Ly9lbWl0dGVkIHVwb24gdGhlIHBsYXllciBpcyBnaXZlbiB0aGUgZ28gYWhlYWQgdG8gZW50ZXIgdGhlIHRpbGUgdGhpcyBldmVudCBvY2N1cGllcy5cclxuXHRcImVudGVyZWQtdGlsZVwiLCAvLyhmcm9tLWRpcilcclxuXHRcdC8vZW1pdHRlZCB1cG9uIHRoZSBwbGF5ZXIgbGFuZGluZyBvbiB0aGUgdGlsZSB0aGlzIGV2ZW50IG9jY3VwaWVzLlxyXG5cdFwibGVhdmluZy10aWxlXCIsIC8vKHRvLWRpcilcclxuXHRcdC8vZW1pdHRlZCB1cG9uIHRoZSBwbGF5ZXIgaXMgZ2l2ZW4gdGhlIGdvIGFoZWFkIHRvIGxlYXZlIHRoZSB0aWxlIHRoaXMgZXZlbnQgb2NjdXBpZXMuXHJcblx0XCJsZWZ0LXRpbGVcIiwgLy8odG8tZGlyKVxyXG5cdFx0Ly9lbWl0dGVkIHVwb24gdGhlIHBsYXllciBjb21wbGV0ZWx5IGxlYXZpbmcgdGhlIHRpbGUgdGhpcyBldmVudCBvY2N1cGllcy5cclxuXHRcImJ1bXBlZFwiLCAvLyhmcm9tLWRpcilcclxuXHRcdC8vZW1pdHRlZCB1cG9uIHRoZSBwbGF5ZXIgaXMgZGVuaWVkIGVudHJ5IGludG8gdGhlIHRpbGUgdGhpcyBldmVudCBvY2N1cGllcy5cclxuXHRcImludGVyYWN0ZWRcIiwgLy8oZnJvbS1kaXIpXHJcblx0XHQvL2VtaXR0ZWQgd2hlbiB0aGUgcGxheWVyIGludGVyYWN0cyB3aXRoIHRoaXMgZXZlbnQgZnJvbSBhbiBhZGphY2VudCB0aWxlXHJcblx0XCJ0aWNrXCIsIC8vKGRlbHRhKVxyXG5cdFx0Ly9lbWl0dGVkIGV2ZXJ5IGdhbWUgdGlja1xyXG5cdFwiY2xpY2tlZFwiLCAvLyh4LCB5KVxyXG5cdFx0Ly9lbWl0dGVkIHdoZW4gdGhlIG1vdXNlIGlzIGNsaWNrZWQgb24gdGhpcyBldmVudCAoYW5kIGl0IGlzIGRldGVybWluZWQgaXQgaXMgdGhpcyBldmVudClcclxuXHRcImNsaWNrZWQtdGhyb3VnaFwiLCAvLyh4LCB5KVxyXG5cdFx0Ly9lbWl0dGVkIHdoZW4gdGhlIG1vdXNlIGlzIGNsaWNrZWQgb24gdGhpcyBldmVudCAoYW5kIHRoZSByYXl0cmFjZSBpcyBwYXNzaW5nIHRocm91Z2ggXHJcblx0XHQvLyB0aGlzIGV2ZW50IGR1cmluZyB0aGUgZGV0ZXJtaW5pbmcgcGhhc2UpXHJcblx0XCJtb3ZpbmdcIiwgLy8oc3JjWCwgc3JjWSwgZGVzdFgsIGRlc3RZKVxyXG5cdFx0Ly9lbWl0dGVkIHdoZW4gdGhpcyBldmVudCBiZWdpbnMgbW92aW5nIHRvIGEgbmV3IHRpbGVcclxuXHRcIm1vdmVkXCIsIC8vKHNyY1gsIHNyY1ksIGRlc3RYLCBkZXN0WSlcclxuXHRcdC8vZW1pdHRlZCB3aGVuIHRoaXMgZXZlbnQgZmluaXNoZXMgbW92aW5nIHRvIGEgbmV3IHRpbGVcclxuXHRcImNhbnQtbW92ZVwiLCAvLyhzcmNYLCBzcmNZLCBkZXN0WCwgZGVzdFksIHJlYXNvbkV2ZW50KVxyXG5cdFx0Ly9lbWl0dGVkIHdoZW4gdGhpcyBldmVudCBpcyBkZW5pZWQgbW92ZW1lbnQgdG8gdGhlIHJlcXVlc3RlZCB0aWxlXHJcblx0XHQvLyBJdCBpcyBwYXNzZWQgdGhlIGV2ZW50IGJsb2NraW5nIGl0LCBvciBudWxsIGlmIGl0IGlzIGR1ZSB0byB0aGUgY29sbGlzaW9uIG1hcFxyXG5cdFwiYW5pbS1lbmRcIiwgLy8oYW5pbWF0aW9uTmFtZSlcclxuXHRcdC8vZW1pdHRlZCB3aGVuIHRoaXMgZXZlbnQncyBhbmltYXRpb24gZW5kc1xyXG5cdFwiY3JlYXRlZFwiLCBcclxuXHRcdC8vZW1pdHRlZCB3aGVuIHRoaXMgZXZlbnQgaXMgYWRkZWQgdG8gdGhlIGV2ZW50IG1hcFxyXG5cdFwiZGVzdHJveWVkXCIsXHJcblx0XHQvL2VtaXR0ZWQgd2hlbiB0aGlzIGV2ZW50IGhhcyBiZWVuIHRha2VuIG91dCBvZiB0aGUgZXZlbnQgbWFwXHJcblx0XCJyZWFjdFwiLCAvLyhpZCwgZGlzdGFuY2UpXHJcblx0XHQvL2VtaXR0ZWQgd2hlbiBhbm90aGVyIGV2ZW50IG9uIHRoZSBtYXAgdHJhbnNtaXRzIGEgcmVhY3RhYmxlIGV2ZW50XHJcblx0XCJtZXNzYWdlXCIsIC8vKGlkLCAuLi4pXHJcblx0XHQvL25ldmVyIGVtaXR0ZWQgYnkgdGhlIGxpYnJhcnksIHRoaXMgZXZlbnQgdHlwZSBjYW4gYmUgdXNlZCBmb3IgY3Jvc3MtZXZlbnQgbWVzc2FnZXNcclxuXTtcclxuIiwiLy8gcGxheWVyLWNoYXJhY3Rlci5qc1xyXG4vLyBEZWZpbmVzIHRoZSBjb25jcmV0ZSBjb2RlIGZvciBhIFBsYXllciBDaGFyYWN0ZXIgaW4gdGhlIHdvcmxkXHJcblxyXG52YXIgQWN0b3IgPSByZXF1aXJlKFwidHBwLWFjdG9yXCIpO1xyXG52YXIgY29udHJvbGxlciA9IHJlcXVpcmUoXCJ0cHAtY29udHJvbGxlclwiKTtcclxudmFyIGluaGVyaXRzID0gcmVxdWlyZShcImluaGVyaXRzXCIpO1xyXG52YXIgZXh0ZW5kID0gcmVxdWlyZShcImV4dGVuZFwiKTtcclxuXHJcbi8qKlxyXG4gKi9cclxuZnVuY3Rpb24gUGxheWVyQ2hhcigpe1xyXG5cdEFjdG9yLmNhbGwodGhpcywge30sIHt9KTtcclxuXHRcclxuXHR0aGlzLm9uKFwidGlja1wiLCB0aGlzLmNvbnRyb2xDaGFyYWN0ZXIpO1xyXG5cdHRoaXMub24oXCJjYW50LW1vdmVcIiwgdGhpcy5hbmltYXRlQnVtcCk7XHJcbn1cclxuaW5oZXJpdHMoUGxheWVyQ2hhciwgQWN0b3IpO1xyXG5leHRlbmQoUGxheWVyQ2hhci5wcm90b3R5cGUsIHtcclxuXHRpZCA6IFwiUExBWUVSQ0hBUlwiLFxyXG5cdGxvY2F0aW9uIDogbmV3IFRIUkVFLlZlY3RvcjMoKSxcclxuXHRcclxuXHRzcHJpdGU6IG51bGwsXHJcblx0XHJcblx0cmVzZXQgOiBmdW5jdGlvbigpIHtcclxuXHRcdHRoaXMubG9jYXRpb24uc2V0KDAsIDAsIDApO1xyXG5cdH0sXHJcblx0XHJcblx0d2FycEF3YXkgOiBmdW5jdGlvbihhbmltVHlwZSkge1xyXG5cdFx0Y29uc29sZS53YXJuKFwid2FycEF3YXkgaXMgbm90IHlldCBpbXBsZW1lbnRlZCFcIik7XHJcblx0fSxcclxuXHRcclxuXHR3YXJwVG8gOiBmdW5jdGlvbih3YXJwZGVmKSB7XHJcblx0XHR2YXIgc2VsZiA9IHRoaXM7XHJcblx0XHR0aGlzLmxvY2F0aW9uLnNldCh3YXJwZGVmLmxvY1swXSwgd2FycGRlZi5sb2NbMV0sIHdhcnBkZWYubGF5ZXIpO1xyXG5cdFx0XHJcblx0XHRpZiAod2FycGRlZi5hbmltKVxyXG5cdFx0XHRjb250cm9sbGVyLnB1c2hJbnB1dENvbnRleHQoXCJjdXRzY2VuZVwiKTtcclxuXHRcdC8vVE9ETyB3YXJwZGVmLmFuaW1cclxuXHRcdFxyXG5cdFx0c2V0VGltZW91dChmdW5jdGlvbigpe1xyXG5cdFx0XHRzd2l0Y2goTnVtYmVyKHdhcnBkZWYuYW5pbSkpIHsgLy9XYXJwIGFuaW1hdGlvblxyXG5cdFx0XHRcdGNhc2UgMTogc2VsZi5hdmF0YXJfbm9kZS5wb3NpdGlvbi56ICs9IDE7IGJyZWFrOyAvLyBXYWxrIHVwXHJcblx0XHRcdFx0Y2FzZSAyOiBzZWxmLmF2YXRhcl9ub2RlLnBvc2l0aW9uLnogLT0gMTsgYnJlYWs7IC8vIFdhbGsgZG93blxyXG5cdFx0XHRcdGNhc2UgMzogc2VsZi5hdmF0YXJfbm9kZS5wb3NpdGlvbi54IC09IDE7IGJyZWFrOyAvLyBXYWxrIGxlZnRcclxuXHRcdFx0XHRjYXNlIDQ6IHNlbGYuYXZhdGFyX25vZGUucG9zaXRpb24ueCArPSAxOyBicmVhazsgLy8gV2FsayBkb3duXHJcblx0XHRcdFx0Y2FzZSA1OiBzZWxmLmF2YXRhcl9ub2RlLnBvc2l0aW9uLnkgKz0gMTU7IGJyZWFrOyAvLyBXYXJwIGluXHJcblx0XHRcdH1cclxuXHRcdH0sIDApO1xyXG5cdFx0XHJcblx0XHRjdXJyZW50TWFwLnF1ZXVlRm9yTWFwU3RhcnQoZnVuY3Rpb24oKXtcclxuXHRcdFx0Y29uc29sZS5sb2coXCJXQVJQIERFRlwiLCB3YXJwZGVmKTtcclxuXHRcdFx0dmFyIGFuaW1OYW1lID0gbnVsbDtcclxuXHRcdFx0dmFyIHggPSBzZWxmLmxvY2F0aW9uLng7XHJcblx0XHRcdHZhciB5ID0gc2VsZi5sb2NhdGlvbi55O1xyXG5cdFx0XHR2YXIgbGF5ZXIgPSBzZWxmLmxvY2F0aW9uLno7XHJcblx0XHRcdHZhciB5X29mZiA9IDA7XHJcblx0XHRcdHZhciBtc3BkID0gMSwgYXNwZCA9IDE7IC8vbW92ZW1lbnQgc3BlZWQsIGFuaW1hdGlvbiBzcGVlZFxyXG5cdFx0XHR2YXIgYW5pbUVuZEV2ZW50ID0gXCJtb3ZlZFwiO1xyXG5cdFx0XHRcclxuXHRcdFx0c3dpdGNoKE51bWJlcih3YXJwZGVmLmFuaW0pKSB7IC8vV2FycCBhbmltYXRpb25cclxuXHRcdFx0XHRjYXNlIDA6IGJyZWFrOyAvLyBBcHBlYXJcclxuXHRcdFx0XHRjYXNlIDE6IHkrKzsgYW5pbU5hbWUgPSBcIndhbGtcIjsgbXNwZCA9IDAuMzU7IGFzcGQgPSAwLjM1OyBicmVhazsgLy8gV2FsayB1cFxyXG5cdFx0XHRcdGNhc2UgMjogeS0tOyBhbmltTmFtZSA9IFwid2Fsa1wiOyBtc3BkID0gMC4zNTsgYXNwZCA9IDAuMzU7IGJyZWFrOyAvLyBXYWxrIGRvd25cclxuXHRcdFx0XHRjYXNlIDM6IHgtLTsgYW5pbU5hbWUgPSBcIndhbGtcIjsgbXNwZCA9IDAuMzU7IGFzcGQgPSAwLjM1OyBicmVhazsgLy8gV2FsayBsZWZ0XHJcblx0XHRcdFx0Y2FzZSA0OiB4Kys7IGFuaW1OYW1lID0gXCJ3YWxrXCI7IG1zcGQgPSAwLjM1OyBhc3BkID0gMC4zNTsgYnJlYWs7IC8vIFdhbGsgZG93blxyXG5cdFx0XHRcdGNhc2UgNTogLy8gV2FycCBpblxyXG5cdFx0XHRcdFx0YW5pbU5hbWUgPSBcIndhcnBfaW5cIjsgXHJcblx0XHRcdFx0XHR5X29mZiA9IDE1OyBhbmltRW5kRXZlbnQgPSBcImFuaW0tZW5kXCI7XHJcblx0XHRcdFx0XHRtc3BkID0gMC4yNTsgYXNwZCA9IDE7IFxyXG5cdFx0XHRcdFx0YnJlYWs7IFxyXG5cdFx0XHRcdGRlZmF1bHQ6IFxyXG5cdFx0XHRcdFx0Y29uc29sZS53YXJuKFwiSUxMRUdBTCBXQVJQIEFOSU1BVElPTjpcIiwgd2FycGRlZi5hbmltKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0dmFyIHNyYyA9IHNlbGYubG9jYXRpb247XHJcblx0XHRcdHZhciBzdGF0ZSA9IHNlbGYuX2luaXRQYXRoaW5nU3RhdGUoKTtcclxuXHRcdFx0XHJcblx0XHRcdGlmIChzcmMueC14IHx8IHktc3JjLnkpIFxyXG5cdFx0XHRcdHNlbGYuZmFjaW5nLnNldCh4LXNyYy54LCAwLCBzcmMueS15KTtcclxuXHRcdFx0ZWxzZVxyXG5cdFx0XHRcdHNlbGYuZmFjaW5nLnNldCgwLCAwLCAxKTtcclxuXHRcdFx0XHJcblx0XHRcdHN0YXRlLnNyY0xvY0Muc2V0KHgsIHksIGxheWVyKTtcclxuXHRcdFx0c3RhdGUuc3JjTG9jMy5zZXQoY3VycmVudE1hcC5nZXQzRFRpbGVMb2NhdGlvbih4LCB5LCBsYXllcikpLnkgKz0geV9vZmY7XHJcblx0XHRcdHN0YXRlLmRlc3RMb2NDLnNldChzcmMpO1xyXG5cdFx0XHRzdGF0ZS5kZXN0TG9jMy5zZXQoY3VycmVudE1hcC5nZXQzRFRpbGVMb2NhdGlvbihzcmMpKTtcclxuXHRcdFx0c3RhdGUuZGVsdGEgPSAwO1xyXG5cdFx0XHRzdGF0ZS5tb3ZpbmcgPSB0cnVlO1xyXG5cdFx0XHRzdGF0ZS5zcGVlZCA9IG1zcGQ7XHJcblx0XHRcdFxyXG5cdFx0XHRzZWxmLnBsYXlBbmltYXRpb24oYW5pbU5hbWUsIHsgc3BlZWQ6IGFzcGQgfSk7XHJcblx0XHRcdHNlbGYub25jZShhbmltRW5kRXZlbnQsIGZ1bmN0aW9uKGFuaW1hdGlvbk5hbWUpe1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKFwiUG9wIVwiKTtcclxuXHRcdFx0XHRjb250cm9sbGVyLnBvcElucHV0Q29udGV4dChcImN1dHNjZW5lXCIpO1xyXG5cdFx0XHR9KTtcclxuXHRcdFx0Ly9zZWxmLmF2YXRhcl9ub2RlLnBvc2l0aW9uLnNldCggY3VycmVudE1hcC5nZXQzRFRpbGVMb2NhdGlvbihzZWxmLmxvY2F0aW9uKSApO1xyXG5cdFx0fSk7XHJcblx0fSxcclxuXHRcclxuXHRjb250cm9sVGltZW91dDogMC4wLFxyXG5cdGNvbnRyb2xDaGFyYWN0ZXIgOiBmdW5jdGlvbihkZWx0YSkge1xyXG5cdFx0dmFyIHkgPSAoKGNvbnRyb2xsZXIuaXNEb3duKFwiVXBcIiwgXCJnYW1lXCIpKT8gLTE6MCkgKyAoKGNvbnRyb2xsZXIuaXNEb3duKFwiRG93blwiLCBcImdhbWVcIikpPyAxOjApO1xyXG5cdFx0dmFyIHggPSAoKGNvbnRyb2xsZXIuaXNEb3duKFwiTGVmdFwiLCBcImdhbWVcIikpPyAtMTowKSArICgoY29udHJvbGxlci5pc0Rvd24oXCJSaWdodFwiLCBcImdhbWVcIikpPyAxOjApO1xyXG5cdFx0XHJcblx0XHRpZiAoY29udHJvbGxlci5pc0Rvd25PbmNlKFwiSW50ZXJhY3RcIiwgXCJnYW1lXCIpICYmICF0aGlzLl9pbml0UGF0aGluZ1N0YXRlKCkubW92aW5nKSB7XHJcblx0XHRcdGN1cnJlbnRNYXAuZGlzcGF0Y2goXHJcblx0XHRcdFx0dGhpcy5sb2NhdGlvbi54IC0gdGhpcy5mYWNpbmcueCwgdGhpcy5sb2NhdGlvbi55ICsgdGhpcy5mYWNpbmcueiwgXHJcblx0XHRcdFx0XCJpbnRlcmFjdGVkXCIsIHRoaXMuZmFjaW5nKTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0dmFyIHJ1biA9IGNvbnRyb2xsZXIuaXNEb3duKFwiUnVuXCIsIFwiZ2FtZVwiKTtcclxuXHRcdFxyXG5cdFx0aWYgKCh5IHx8IHgpICYmICEoeCAmJiB5KSkgeyAvL29uZSwgYnV0IG5vdCBib3RoXHJcblx0XHRcdGlmICh0aGlzLmNvbnRyb2xUaW1lb3V0IDwgMSkge1xyXG5cdFx0XHRcdHRoaXMuY29udHJvbFRpbWVvdXQgKz0gQ09ORklHLnRpbWVvdXQud2Fsa0NvbnRyb2wgKiBkZWx0YTtcclxuXHRcdFx0XHRcclxuXHRcdFx0XHRpZiAoIXRoaXMuX2luaXRQYXRoaW5nU3RhdGUoKS5tb3ZpbmcpIHtcclxuXHRcdFx0XHRcdHRoaXMuZmFjZURpcih4LCB5KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0aWYgKCF0aGlzLl9pbml0UGF0aGluZ1N0YXRlKCkubW92aW5nKSB7XHJcblx0XHRcdFx0XHR0aGlzLm1vdmVUbyh0aGlzLmxvY2F0aW9uLngreCwgdGhpcy5sb2NhdGlvbi55K3ksIHtcclxuXHRcdFx0XHRcdFx0c3BlZWQ6IChydW4pPyAyIDogMSxcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0Ly9UaGlzIG1ha2VzIGl0IHNvIHlvdSBjYW4gdGFwIGEgZGlyZWN0aW9uIHRvIGZhY2UsIGluc3RlYWQgb2YganVzdCBhbHdheXMgd2Fsa2luZyBpbiBzYWlkIGRpcmVjdGlvblxyXG5cdFx0XHRpZiAodGhpcy5jb250cm9sVGltZW91dCA+IDApXHJcblx0XHRcdFx0dGhpcy5jb250cm9sVGltZW91dCAtPSBDT05GSUcudGltZW91dC53YWxrQ29udHJvbCAqIGRlbHRhO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0fSxcclxuXHRcclxuXHRhbmltYXRlQnVtcCA6IGZ1bmN0aW9uKHNyY3gsIHNyY3ksIHgsIHksIHJlYXNvbikge1xyXG5cdFx0Ly8gY29uc29sZS53YXJuKHRoaXMuaWQsIFwiOiBDYW5ub3Qgd2FsayB0byBsb2NhdGlvblwiLCBcIihcIit4K1wiLFwiK3krXCIpXCIpO1xyXG5cdFx0dGhpcy5wbGF5QW5pbWF0aW9uKFwiYnVtcFwiLCB7IHN0b3BOZXh0VHJhbnNpdGlvbjogdHJ1ZSB9KTtcclxuXHR9LFxyXG5cdFxyXG5cdFxyXG5cdC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cdGlzTlBDIDogZnVuY3Rpb24oKXsgcmV0dXJuIGZhbHNlOyB9LFxyXG5cdFxyXG5cdF9hdmF0YXJfbG9hZFNwcml0ZSA6IGZ1bmN0aW9uKG1hcCwgdGV4dHVyZSkge1xyXG5cdFx0dmFyIHVybCA9IEJBU0VVUkwrXCIvaW1nL3Bjcy9cIisgZ2FtZVN0YXRlLnBsYXllclNwcml0ZTtcclxuXHRcdHZhciByZXMgPSAvXihbXlxcW10rKVxcWyhbXlxcXV0rKVxcXS5wbmckLy5leGVjKHVybCk7XHJcblx0XHRcclxuXHRcdHZhciBuYW1lID0gcmVzWzFdO1xyXG5cdFx0dmFyIGZvcm1hdCA9IHJlc1syXTtcclxuXHRcdFxyXG5cdFx0dmFyIGltZyA9IG5ldyBJbWFnZSgpO1xyXG5cdFx0Zm9ybWF0ID0gdGhpcy5nZXRTcHJpdGVGb3JtYXQoZm9ybWF0KTtcclxuXHRcdHRoaXMuX19vbkxvYWRTcHJpdGUoaW1nLCBmb3JtYXQsIHRleHR1cmUpO1xyXG5cdFx0aW1nLnNyYyA9IHVybDtcclxuXHR9LFxyXG5cdFxyXG5cdC8vIE5ldXRlciB0aGUgbG9jYXRpb24gbm9ybWlsaXphdGlvbiBmb3IgdGhpcyBraW5kIG9mIGV2ZW50XHJcblx0X25vcm1hbGl6ZUxvY2F0aW9uIDogZnVuY3Rpb24oKSB7fSxcclxuXHRcclxufSk7XHJcbm1vZHVsZS5leHBvcnRzID0gUGxheWVyQ2hhcjtcclxuIiwiLy8gc3ByaXRlbW9kZWwuanNcclxuLy8gQSByZWR1eCBvZiB0aGUgVEhSRUUuanMgc3ByaXRlLCBidXQgbm90IHVzaW5nIHRoZSBzcHJpdGUgcGx1Z2luXHJcblxyXG52YXIgaW5oZXJpdHMgPSByZXF1aXJlKFwiaW5oZXJpdHNcIik7XHJcbnZhciBleHRlbmQgPSByZXF1aXJlKFwiZXh0ZW5kXCIpO1xyXG5cclxuZnVuY3Rpb24gQ2hhcmFjdGVyU3ByaXRlKG9wdHMpIHtcclxuXHRpZiAoISh0aGlzIGluc3RhbmNlb2YgQ2hhcmFjdGVyU3ByaXRlKSkge1xyXG5cdFx0cmV0dXJuIG5ldyBDaGFyYWN0ZXJTcHJpdGUob3B0cyk7XHJcblx0fVxyXG5cdHZhciBnYyA9IG9wdHMuZ2MgfHwgR0MuZ2V0QmluKCk7XHJcblx0XHJcblx0b3B0cyA9IGV4dGVuZCh7XHJcblx0XHR0cmFuc3BhcmVudDogdHJ1ZSxcclxuXHRcdGFscGhhVGVzdDogdHJ1ZSxcclxuXHR9LCBvcHRzKTtcclxuXHRcclxuXHRpZiAoIW9wdHMub2Zmc2V0KSBvcHRzLm9mZnNldCA9IG5ldyBUSFJFRS5WZWN0b3IzKDAsIDAsIDApO1xyXG5cdFxyXG5cdC8vVE9ETyByZXBsYWNlIHdpdGggZ2VvbWV0cnkgd2UgY2FuIGNvbnRyb2xcclxuXHQvLyB2YXIgZ2VvbSA9IG5ldyBUSFJFRS5QbGFuZUJ1ZmZlckdlb21ldHJ5KDEsIDEpO1xyXG5cdHZhciBnZW9tID0gbmV3IENoYXJhY3RlclBsYW5lR2VvbWV0cnkob3B0cy5vZmZzZXQpO1xyXG5cdGdjLmNvbGxlY3QoZ2VvbSk7XHJcblx0XHJcblx0dmFyIG1hdCA9IG5ldyBDaGFyYWN0ZXJTcHJpdGVNYXRlcmlhbChvcHRzKTtcclxuXHRnYy5jb2xsZWN0KG1hdCk7XHJcblx0XHJcblx0VEhSRUUuTWVzaC5jYWxsKHRoaXMsIGdlb20sIG1hdCk7XHJcblx0dGhpcy50eXBlID0gXCJDaGFyYWN0ZXJTcHJpdGVcIjtcclxuXHRcclxuXHRtYXQuc2NhbGUgPSBtYXQudW5pZm9ybXMuc2NhbGUudmFsdWUgPSB0aGlzLnNjYWxlO1xyXG5cdFxyXG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKHRoaXMsIHtcclxuXHRcdHdpZHRoOiB7XHJcblx0XHRcdGdldDogZnVuY3Rpb24oKSB7XHJcblx0XHRcdFx0cmV0dXJuIE1hdGguZmxvb3IoKHRoaXMubW9ycGhUYXJnZXRJbmZsdWVuY2VzWzBdICsgMSkgKiAzMik7XHJcblx0XHRcdH0sXHJcblx0XHRcdHNldDogZnVuY3Rpb24odmFsKSB7XHJcblx0XHRcdFx0dGhpcy5tb3JwaFRhcmdldEluZmx1ZW5jZXNbMF0gPSAodmFsIC8gMzIpIC0gMTtcclxuXHRcdFx0fSxcclxuXHRcdH0sXHJcblx0XHRoZWlnaHQ6IHtcclxuXHRcdFx0Z2V0OiBmdW5jdGlvbigpIHtcclxuXHRcdFx0XHRyZXR1cm4gTWF0aC5mbG9vcigodGhpcy5tb3JwaFRhcmdldEluZmx1ZW5jZXNbMV0gKyAxKSAqIDMyKTtcclxuXHRcdFx0fSxcclxuXHRcdFx0c2V0OiBmdW5jdGlvbih2YWwpIHtcclxuXHRcdFx0XHR0aGlzLm1vcnBoVGFyZ2V0SW5mbHVlbmNlc1sxXSA9ICh2YWwgLyAzMikgLSAxO1xyXG5cdFx0XHR9LFxyXG5cdFx0fSxcclxuXHR9KTtcclxufVxyXG5pbmhlcml0cyhDaGFyYWN0ZXJTcHJpdGUsIFRIUkVFLk1lc2gpO1xyXG5tb2R1bGUuZXhwb3J0cy5DaGFyYWN0ZXJTcHJpdGUgPSBDaGFyYWN0ZXJTcHJpdGU7XHJcblxyXG5cclxuZnVuY3Rpb24gQ2hhcmFjdGVyU3ByaXRlTWF0ZXJpYWwob3B0cykge1xyXG5cdGlmICghKHRoaXMgaW5zdGFuY2VvZiBDaGFyYWN0ZXJTcHJpdGVNYXRlcmlhbCkpIHtcclxuXHRcdHJldHVybiBuZXcgQ2hhcmFjdGVyU3ByaXRlTWF0ZXJpYWwob3B0cyk7XHJcblx0fVxyXG5cdFxyXG5cdC8vVE9ETyB3cml0ZSBpdCBzbyB3aGVuIHdlIHJlcGxhY2UgdGhlIHZhbHVlcyBoZXJlLCB3ZSByZXBsYWNlIHRoZSBvbmVzIGluIHRoZSB1bmlmb3Jtc1xyXG5cdC8vIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKHRoaXMsIHtcclxuXHQvLyBcdHV2T2Zmc2V0IDoge31cclxuXHQvLyB9KTtcclxuXHJcblx0dGhpcy5tYXAgPSBvcHRzLm1hcCB8fCBuZXcgVEhSRUUuVGV4dHVyZSgpO1xyXG5cdFxyXG5cdHRoaXMudXZPZmZzZXQgPSBvcHRzLnV2T2Zmc2V0IHx8IHRoaXMubWFwLm9mZnNldCB8fCBuZXcgVEhSRUUuVmVjdG9yMigwLCAwKTtcclxuXHR0aGlzLnV2U2NhbGUgPSBvcHRzLnV2U2NhbGUgfHwgdGhpcy5tYXAucmVwZWF0IHx8IG5ldyBUSFJFRS5WZWN0b3IyKDEsIDEpO1xyXG5cdFxyXG5cdHRoaXMucm90YXRpb24gPSBvcHRzLnJvdGF0aW9uIHx8IDA7XHJcblx0dGhpcy5zY2FsZSA9IG9wdHMuc2NhbGUgfHwgbmV3IFRIUkVFLlZlY3RvcjIoMSwgMSk7XHJcblx0XHJcblx0dGhpcy5jb2xvciA9IChvcHRzLmNvbG9yIGluc3RhbmNlb2YgVEhSRUUuQ29sb3IpPyBvcHRzLmNvbG9yIDogbmV3IFRIUkVFLkNvbG9yKG9wdHMuY29sb3IpO1xyXG5cdHRoaXMub3BhY2l0eSA9IG9wdHMub3BhY2l0eSB8fCAxO1xyXG5cdFxyXG5cdHZhciBwYXJhbXMgPSB0aGlzLl9jcmVhdGVNYXRQYXJhbXMob3B0cyk7XHJcblx0VEhSRUUuU2hhZGVyTWF0ZXJpYWwuY2FsbCh0aGlzLCBwYXJhbXMpO1xyXG5cdHRoaXMudHlwZSA9IFwiQ2hhcmFjdGVyU3ByaXRlTWF0ZXJpYWxcIjtcclxuXHRcclxuXHR0aGlzLnRyYW5zcGFyZW50ID0gKG9wdHMudHJhbnNwYXJlbnQgIT09IHVuZGVmaW5lZCk/IG9wdHMudHJhbnNwYXJlbnQgOiB0cnVlO1xyXG5cdHRoaXMuYWxwaGFUZXN0ID0gMC4wNTtcclxuXHQvLyB0aGlzLmRlcHRoV3JpdGUgPSBmYWxzZTtcclxuXHR0aGlzLm1vcnBoVGFyZ2V0cyA9IHRydWU7XHJcbn1cclxuaW5oZXJpdHMoQ2hhcmFjdGVyU3ByaXRlTWF0ZXJpYWwsIFRIUkVFLlNoYWRlck1hdGVyaWFsKTtcclxuZXh0ZW5kKENoYXJhY3RlclNwcml0ZU1hdGVyaWFsLnByb3RvdHlwZSwge1xyXG5cdG1hcCA6IG51bGwsXHJcblx0XHJcblx0X2NyZWF0ZU1hdFBhcmFtcyA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0c2hlZXJtYXQgPSBbXHJcblx0XHRcdDEsIDAsIDAsIDAsXHJcblx0XHRcdDAsIDEsIDAsIDAsXHJcblx0XHRcdDAsIDAsIDEsIC0wLjAwOSxcclxuXHRcdFx0MCwgMCwgMCwgMSxcclxuXHRcdF07XHJcblx0XHRcclxuXHRcdHZhciBwYXJhbXMgPSB7XHJcblx0XHRcdHVuaWZvcm1zIDoge1xyXG5cdFx0XHRcdHV2T2Zmc2V0Olx0eyB0eXBlOiBcInYyXCIsIHZhbHVlOiB0aGlzLnV2T2Zmc2V0IH0sXHJcblx0XHRcdFx0dXZTY2FsZTpcdHsgdHlwZTogXCJ2MlwiLCB2YWx1ZTogdGhpcy51dlNjYWxlIH0sXHJcblx0XHRcdFx0XHJcblx0XHRcdFx0cm90YXRpb246XHR7IHR5cGU6IFwiZlwiLCB2YWx1ZTogdGhpcy5yb3RhdGlvbiB9LFxyXG5cdFx0XHRcdHNjYWxlOlx0XHR7IHR5cGU6IFwidjJcIiwgdmFsdWU6IHRoaXMuc2NhbGUgfSxcclxuXHRcdFx0XHRcclxuXHRcdFx0XHRjb2xvcjpcdFx0eyB0eXBlOiBcImNcIiwgdmFsdWU6IHRoaXMuY29sb3IgfSxcclxuXHRcdFx0XHRtYXA6XHRcdHsgdHlwZTogXCJ0XCIsIHZhbHVlOiB0aGlzLm1hcCB9LFxyXG5cdFx0XHRcdG9wYWNpdHk6XHR7IHR5cGU6IFwiZlwiLCB2YWx1ZTogdGhpcy5vcGFjaXR5IH0sXHJcblx0XHRcdFx0XHJcblx0XHRcdFx0em9mZnNldDpcdHsgdHlwZTogXCJmXCIsIHZhbHVlOiAtMC4wMDkgfSxcclxuXHRcdFx0XHRzaGVlcjpcdFx0eyB0eXBlOiBcIm00XCIsIHZhbHVlOiBuZXcgVEhSRUUuTWF0cml4NCgpIH0sXHJcblx0XHRcdFx0XHJcblx0XHRcdFx0bW9ycGhUYXJnZXRJbmZsdWVuY2VzIDogeyB0eXBlOiBcImZcIiwgdmFsdWU6IDAgfSxcclxuXHRcdFx0fSxcclxuXHRcdH07XHJcblx0XHRcclxuXHRcdHBhcmFtcy52ZXJ0ZXhTaGFkZXIgPSB0aGlzLl92ZXJ0U2hhZGVyO1xyXG5cdFx0cGFyYW1zLmZyYWdtZW50U2hhZGVyID0gdGhpcy5fZnJhZ1NoYWRlcjtcclxuXHRcdHJldHVybiBwYXJhbXM7XHJcblx0fSxcclxuXHRcclxuXHRfdmVydFNoYWRlcjogW1xyXG5cdFx0Ly8gJ3VuaWZvcm0gbWF0NCBtb2RlbFZpZXdNYXRyaXg7JyxcclxuXHRcdC8vICd1bmlmb3JtIG1hdDQgcHJvamVjdGlvbk1hdHJpeDsnLFxyXG5cdFx0J3VuaWZvcm0gZmxvYXQgcm90YXRpb247JyxcclxuXHRcdCd1bmlmb3JtIHZlYzIgc2NhbGU7JyxcclxuXHRcdCd1bmlmb3JtIHZlYzIgdXZPZmZzZXQ7JyxcclxuXHRcdCd1bmlmb3JtIHZlYzIgdXZTY2FsZTsnLFxyXG5cdFx0XHJcblx0XHQndW5pZm9ybSBmbG9hdCB6b2Zmc2V0OycsXHJcblx0XHQndW5pZm9ybSBtYXQ0IHNoZWVyOycsXHJcblx0XHRcclxuXHRcdCcjaWZkZWYgVVNFX01PUlBIVEFSR0VUUycsXHJcblx0XHRcInVuaWZvcm0gZmxvYXQgbW9ycGhUYXJnZXRJbmZsdWVuY2VzWyA4IF07XCIsXHJcblx0XHQnI2VuZGlmJyxcclxuXHJcblx0XHQvLyAnYXR0cmlidXRlIHZlYzIgcG9zaXRpb247JyxcclxuXHRcdC8vICdhdHRyaWJ1dGUgdmVjMiB1djsnLFxyXG5cclxuXHRcdCd2YXJ5aW5nIHZlYzIgdlVWOycsXHJcblxyXG5cdFx0J3ZvaWQgbWFpbigpIHsnLFxyXG5cclxuXHRcdFx0J3ZVViA9IHV2T2Zmc2V0ICsgdXYgKiB1dlNjYWxlOycsXHJcblxyXG5cdFx0XHRcInZlYzMgbW9ycGhlZCA9IHZlYzMoIDAuMCApO1wiLFxyXG5cdFx0XHRcclxuXHRcdFx0JyNpZmRlZiBVU0VfTU9SUEhUQVJHRVRTJywgXHJcblx0XHRcdFwibW9ycGhlZCArPSAoIG1vcnBoVGFyZ2V0MCAtIHBvc2l0aW9uICkgKiBtb3JwaFRhcmdldEluZmx1ZW5jZXNbIDAgXTtcIixcclxuXHRcdFx0XCJtb3JwaGVkICs9ICggbW9ycGhUYXJnZXQxIC0gcG9zaXRpb24gKSAqIG1vcnBoVGFyZ2V0SW5mbHVlbmNlc1sgMSBdO1wiLFxyXG5cdFx0XHRcIm1vcnBoZWQgKz0gKCBtb3JwaFRhcmdldDIgLSBwb3NpdGlvbiApICogbW9ycGhUYXJnZXRJbmZsdWVuY2VzWyAyIF07XCIsXHJcblx0XHRcdFwibW9ycGhlZCArPSAoIG1vcnBoVGFyZ2V0MyAtIHBvc2l0aW9uICkgKiBtb3JwaFRhcmdldEluZmx1ZW5jZXNbIDMgXTtcIixcclxuXHRcdFx0XCJtb3JwaGVkICs9ICggbW9ycGhUYXJnZXQ0IC0gcG9zaXRpb24gKSAqIG1vcnBoVGFyZ2V0SW5mbHVlbmNlc1sgNCBdO1wiLFxyXG5cdFx0XHRcIm1vcnBoZWQgKz0gKCBtb3JwaFRhcmdldDUgLSBwb3NpdGlvbiApICogbW9ycGhUYXJnZXRJbmZsdWVuY2VzWyA1IF07XCIsXHJcblx0XHRcdFwibW9ycGhlZCArPSAoIG1vcnBoVGFyZ2V0NiAtIHBvc2l0aW9uICkgKiBtb3JwaFRhcmdldEluZmx1ZW5jZXNbIDYgXTtcIixcclxuXHRcdFx0XCJtb3JwaGVkICs9ICggbW9ycGhUYXJnZXQ3IC0gcG9zaXRpb24gKSAqIG1vcnBoVGFyZ2V0SW5mbHVlbmNlc1sgNyBdO1wiLFxyXG5cdFx0XHQnI2VuZGlmJyxcclxuXHRcdFx0XHJcblx0XHRcdFwibW9ycGhlZCArPSBwb3NpdGlvbjtcIixcclxuXHJcblx0XHRcdCd2ZWMyIGFsaWduZWRQb3NpdGlvbiA9IG1vcnBoZWQueHkgKiBzY2FsZTsnLFxyXG5cclxuXHRcdFx0J3ZlYzIgcm90YXRlZFBvc2l0aW9uOycsXHJcblx0XHRcdCdyb3RhdGVkUG9zaXRpb24ueCA9IGNvcyggcm90YXRpb24gKSAqIGFsaWduZWRQb3NpdGlvbi54IC0gc2luKCByb3RhdGlvbiApICogYWxpZ25lZFBvc2l0aW9uLnk7JyxcclxuXHRcdFx0J3JvdGF0ZWRQb3NpdGlvbi55ID0gc2luKCByb3RhdGlvbiApICogYWxpZ25lZFBvc2l0aW9uLnggKyBjb3MoIHJvdGF0aW9uICkgKiBhbGlnbmVkUG9zaXRpb24ueTsnLFxyXG5cdFx0XHRcclxuXHRcdFx0J21hdDQgenNoZWVyID0gbWF0NCgxLCAwLCAwLCAwLCcsXHJcblx0XHRcdFx0ICAgICAgICAgICAgICAgJzAsIDEsIDAsIDAsJyxcclxuXHRcdFx0XHQgICAgICAgICAgICAgICAnMCwgMCwgMSwgcG9zaXRpb24ueSAqIHpvZmZzZXQsJyxcclxuXHRcdFx0XHQgICAgICAgICAgICAgICAnMCwgMCwgMCwgMSk7JyxcclxuXHJcblx0XHRcdCd2ZWM0IHNoZWVyZm9yY2UgPSBtb2RlbFZpZXdNYXRyaXggKiB2ZWM0KDAsIHBvc2l0aW9uLnksIHBvc2l0aW9uLnosIDEpOycsXHJcblx0XHRcdFxyXG5cdFx0XHQndmVjNCBmaW5hbFBvc2l0aW9uOycsXHJcblxyXG5cdFx0XHQnZmluYWxQb3NpdGlvbiA9IG1vZGVsVmlld01hdHJpeCAqIHZlYzQoIDAuMCwgMC4wLCAwLjAsIDEuMCApOycsXHJcblx0XHRcdCdmaW5hbFBvc2l0aW9uLncgKz0gKHNoZWVyZm9yY2UueiAtIGZpbmFsUG9zaXRpb24ueikgKiB6b2Zmc2V0OycsXHJcblx0XHRcdCdmaW5hbFBvc2l0aW9uLnh5ICs9IHJvdGF0ZWRQb3NpdGlvbjsnLFxyXG5cdFx0XHQnZmluYWxQb3NpdGlvbiA9IHpzaGVlciAqIGZpbmFsUG9zaXRpb247JyxcclxuXHRcdFx0J2ZpbmFsUG9zaXRpb24gPSBzaGVlciAqIGZpbmFsUG9zaXRpb247JyxcclxuXHRcdFx0J2ZpbmFsUG9zaXRpb24gPSBwcm9qZWN0aW9uTWF0cml4ICogZmluYWxQb3NpdGlvbjsnLFxyXG5cdFx0XHRcclxuXHRcdFx0J2dsX1Bvc2l0aW9uID0gZmluYWxQb3NpdGlvbjsnLFxyXG5cclxuXHRcdCd9J1xyXG5cdF0uam9pbiggJ1xcbicgKSxcclxuXHRcclxuXHRfZnJhZ1NoYWRlcjogW1xyXG5cdFx0J3VuaWZvcm0gdmVjMyBjb2xvcjsnLFxyXG5cdFx0J3VuaWZvcm0gc2FtcGxlcjJEIG1hcDsnLFxyXG5cdFx0J3VuaWZvcm0gZmxvYXQgb3BhY2l0eTsnLFxyXG5cclxuXHRcdCd1bmlmb3JtIHZlYzMgZm9nQ29sb3I7JyxcclxuXHRcdCd1bmlmb3JtIGZsb2F0IGZvZ0RlbnNpdHk7JyxcclxuXHRcdCd1bmlmb3JtIGZsb2F0IGZvZ05lYXI7JyxcclxuXHRcdCd1bmlmb3JtIGZsb2F0IGZvZ0ZhcjsnLFxyXG5cclxuXHRcdCd2YXJ5aW5nIHZlYzIgdlVWOycsXHJcblxyXG5cdFx0J3ZvaWQgbWFpbigpIHsnLFxyXG5cclxuXHRcdFx0J3ZlYzQgdGV4dHVyZSA9IHRleHR1cmUyRCggbWFwLCB2VVYgKTsnLFxyXG5cclxuXHRcdFx0JyNpZmRlZiBBTFBIQVRFU1QnLFxyXG5cdFx0XHRcdCdpZiAoIHRleHR1cmUuYSA8IEFMUEhBVEVTVCApIGRpc2NhcmQ7JyxcclxuXHRcdFx0JyNlbmRpZicsXHJcblxyXG5cdFx0XHQnZ2xfRnJhZ0NvbG9yID0gdmVjNCggY29sb3IgKiB0ZXh0dXJlLnh5eiwgdGV4dHVyZS5hICogb3BhY2l0eSApOycsXHJcblxyXG5cdFx0XHQnI2lmZGVmIFVTRV9GT0cnLFxyXG5cdFx0XHRcdCdmbG9hdCBkZXB0aCA9IGdsX0ZyYWdDb29yZC56IC8gZ2xfRnJhZ0Nvb3JkLnc7JyxcclxuXHRcdFx0XHQnZmxvYXQgZm9nRmFjdG9yID0gMC4wOycsXHJcblx0XHRcdFx0XHJcblx0XHRcdFx0JyNpZm5kZWYgRk9HX0VYUDInLCAvL25vdGU6IE5PVCBkZWZpbmVkXHJcblx0XHRcdFx0XHJcblx0XHRcdFx0XHQnZm9nRmFjdG9yID0gc21vb3Roc3RlcCggZm9nTmVhciwgZm9nRmFyLCBkZXB0aCApOycsXHJcblx0XHRcdFx0XHRcclxuXHRcdFx0XHQnI2Vsc2UnLFxyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdFx0J2NvbnN0IGZsb2F0IExPRzIgPSAxLjQ0MjY5NTsnLFxyXG5cdFx0XHRcdFx0J2Zsb2F0IGZvZ0ZhY3RvciA9IGV4cDIoIC0gZm9nRGVuc2l0eSAqIGZvZ0RlbnNpdHkgKiBkZXB0aCAqIGRlcHRoICogTE9HMiApOycsXHJcblx0XHRcdFx0XHQnZm9nRmFjdG9yID0gMS4wIC0gY2xhbXAoIGZvZ0ZhY3RvciwgMC4wLCAxLjAgKTsnLFxyXG5cclxuXHRcdFx0XHQnI2VuZGlmJyxcclxuXHRcdFx0XHRcclxuXHRcdFx0XHQnZ2xfRnJhZ0NvbG9yID0gbWl4KCBnbF9GcmFnQ29sb3IsIHZlYzQoIGZvZ0NvbG9yLCBnbF9GcmFnQ29sb3IudyApLCBmb2dGYWN0b3IgKTsnLFxyXG5cclxuXHRcdFx0JyNlbmRpZicsXHJcblxyXG5cdFx0J30nXHJcblx0XS5qb2luKCAnXFxuJyApLFxyXG59KTtcclxubW9kdWxlLmV4cG9ydHMuQ2hhcmFjdGVyU3ByaXRlTWF0ZXJpYWwgPSBDaGFyYWN0ZXJTcHJpdGVNYXRlcmlhbDtcclxuXHJcblxyXG5cclxuZnVuY3Rpb24gQ2hhcmFjdGVyUGxhbmVHZW9tZXRyeShvZmYpIHtcclxuXHRUSFJFRS5HZW9tZXRyeS5jYWxsKHRoaXMpO1xyXG5cdFxyXG5cdHRoaXMudHlwZSA9IFwiQ2hhcmFjdGVyUGxhbmVHZW9tZXRyeVwiO1xyXG5cdHRoaXMudmVydGljZXMgPSBbXHJcblx0XHRuZXcgVEhSRUUuVmVjdG9yMyggLTAuNSArIG9mZi54LCAtMC41ICsgb2ZmLnksIDAgKyBvZmYueiApLFxyXG5cdFx0bmV3IFRIUkVFLlZlY3RvcjMoICAwLjUgKyBvZmYueCwgLTAuNSArIG9mZi55LCAwICsgb2ZmLnogKSxcclxuXHRcdG5ldyBUSFJFRS5WZWN0b3IzKCAgMC41ICsgb2ZmLngsICAwLjUgKyBvZmYueSwgMCArIG9mZi56ICksXHJcblx0XHRuZXcgVEhSRUUuVmVjdG9yMyggLTAuNSArIG9mZi54LCAgMC41ICsgb2ZmLnksIDAgKyBvZmYueiApLFxyXG5cdF07XHJcblx0XHJcblx0dGhpcy5mYWNlcy5wdXNoKG5ldyBUSFJFRS5GYWNlMygwLCAxLCAyKSk7XHJcblx0dGhpcy5mYWNlcy5wdXNoKG5ldyBUSFJFRS5GYWNlMygwLCAyLCAzKSk7XHJcblx0XHJcblx0dGhpcy5mYWNlVmVydGV4VXZzWzBdLnB1c2goWyB1digwLCAwKSwgdXYoMSwgMCksIHV2KDEsIDEpIF0pO1xyXG5cdHRoaXMuZmFjZVZlcnRleFV2c1swXS5wdXNoKFsgdXYoMCwgMCksIHV2KDEsIDEpLCB1digwLCAxKSBdKTtcclxuXHRcclxuXHR0aGlzLm1vcnBoVGFyZ2V0cyA9IFtcclxuXHRcdHsgbmFtZTogXCJ3aWR0aFwiLCB2ZXJ0aWNlczogW1xyXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMyggLTAuNSArIG9mZi54IC0gMC41LCAtMC41ICsgb2ZmLnksIDAgKyBvZmYueiApLFxyXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMyggIDAuNSArIG9mZi54ICsgMC41LCAtMC41ICsgb2ZmLnksIDAgKyBvZmYueiApLFxyXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMyggIDAuNSArIG9mZi54ICsgMC41LCAgMC41ICsgb2ZmLnksIDAgKyBvZmYueiApLFxyXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMyggLTAuNSArIG9mZi54IC0gMC41LCAgMC41ICsgb2ZmLnksIDAgKyBvZmYueiApLFxyXG5cdFx0XSB9LFxyXG5cdFx0eyBuYW1lOiBcImhlaWdodFwiLCB2ZXJ0aWNlczogW1xyXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMyggLTAuNSArIG9mZi54LCAtMC41ICsgb2ZmLnkgICAgLCAwICsgb2ZmLnogKSxcclxuXHRcdFx0bmV3IFRIUkVFLlZlY3RvcjMoICAwLjUgKyBvZmYueCwgLTAuNSArIG9mZi55ICAgICwgMCArIG9mZi56ICksXHJcblx0XHRcdG5ldyBUSFJFRS5WZWN0b3IzKCAgMC41ICsgb2ZmLngsICAwLjUgKyBvZmYueSArIDEsIDAgKyBvZmYueiApLFxyXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMyggLTAuNSArIG9mZi54LCAgMC41ICsgb2ZmLnkgKyAxLCAwICsgb2ZmLnogKSxcclxuXHRcdF0gfSxcclxuXHRdO1xyXG5cdFxyXG5cdGZ1bmN0aW9uIHV2KHgsIHkpIHsgcmV0dXJuIG5ldyBUSFJFRS5WZWN0b3IyKHgsIHkpOyB9XHJcbn1cclxuaW5oZXJpdHMoQ2hhcmFjdGVyUGxhbmVHZW9tZXRyeSwgVEhSRUUuR2VvbWV0cnkpO1xyXG5cclxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHJcblxyXG5cclxuZnVuY3Rpb24gQnViYmxlU3ByaXRlKCkge1xyXG5cdGlmICghKHRoaXMgaW5zdGFuY2VvZiBCdWJibGVTcHJpdGUpKSB7XHJcblx0XHRyZXR1cm4gbmV3IEJ1YmJsZVNwcml0ZSgpO1xyXG5cdH1cclxuXHRcclxuXHQvL1RPRE8gcmVwbGFjZSB3aXRoIGdlb21ldHJ5IHdlIGNhbiBjb250cm9sXHJcblx0Ly8gdmFyIGdlb20gPSBuZXcgVEhSRUUuUGxhbmVCdWZmZXJHZW9tZXRyeSgxLCAxKTtcclxuXHR2YXIgZ2VvbSA9IG5ldyBCdWJibGVQbGFuZUdlb21ldHJ5KG5ldyBUSFJFRS5WZWN0b3IzKDAsIDAsIDApKTtcclxuXHRcclxuXHRcclxuXHR2YXIgdGV4ID0gdGhpcy5fdGV4ID0gbmV3IFRIUkVFLlRleHR1cmUoKTtcclxuXHR0ZXgubWFnRmlsdGVyID0gVEhSRUUuTmVhcmVzdEZpbHRlcjtcclxuXHR0ZXgubWluRmlsdGVyID0gVEhSRUUuTmVhcmVzdEZpbHRlcjtcclxuXHR0ZXguYW5pc290cm9weSA9IDE7XHJcblx0dGV4LmdlbmVyYXRlTWlwbWFwcyA9IGZhbHNlO1xyXG5cdHRleC5yZXBlYXQgPSBuZXcgVEhSRUUuVmVjdG9yMigxNi8xMjgsIDE2LzY0KTtcclxuXHR0ZXgub2Zmc2V0ID0gbmV3IFRIUkVFLlZlY3RvcjIoMCwgMCk7XHJcblx0XHJcblx0dmFyIGltZyA9IG5ldyBJbWFnZSgpO1xyXG5cdGZ1bmN0aW9uIGYoKXtcclxuXHRcdHRleC5pbWFnZSA9IGltZztcclxuXHRcdHRleC5uZWVkc1VwZGF0ZSA9IHRydWU7XHJcblx0XHRpbWcucmVtb3ZlRXZlbnRMaXN0ZW5lcihcImxvYWRcIiwgZik7XHJcblx0fVxyXG5cdGltZy5vbihcImxvYWRcIiwgZik7XHJcblx0XHJcblx0aW1nLnNyYyA9IEJBU0VVUkwrXCIvaW1nL3VpL2Vtb3RlX2J1YmJsZS5wbmdcIjtcclxuXHRcclxuXHR2YXIgbWF0ID0gdGhpcy5fbWF0ID0gbmV3IENoYXJhY3RlclNwcml0ZU1hdGVyaWFsKHtcclxuXHRcdG1hcDogdGV4LFxyXG5cdFx0bW9ycGhUYXJnZXRzOiB0cnVlLFxyXG5cdFx0dHJhbnNwYXJlbnQ6IHRydWUsXHJcblx0XHRhbHBoYVRlc3Q6IDAuMDUsXHJcblx0fSk7XHJcblx0bWF0LnVuaWZvcm1zLnpvZmZzZXQudmFsdWUgPSAtMC4wMjtcclxuXHRcclxuXHRcclxuXHRUSFJFRS5NZXNoLmNhbGwodGhpcywgZ2VvbSwgbWF0KTtcclxuXHR0aGlzLnR5cGUgPSBcIkJ1YmJsZVNwcml0ZVwiO1xyXG5cdFxyXG5cdG1hdC5zY2FsZSA9IG1hdC51bmlmb3Jtcy5zY2FsZS52YWx1ZSA9IHRoaXMuc2NhbGU7XHJcblx0XHJcblx0T2JqZWN0LmRlZmluZVByb3BlcnRpZXModGhpcywge1xyXG5cdFx0eG9mZjoge1xyXG5cdFx0XHRnZXQ6IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRcdHJldHVybiBNYXRoLmZsb29yKCh0aGlzLm1vcnBoVGFyZ2V0SW5mbHVlbmNlc1swXSArIDEpICogMzIpO1xyXG5cdFx0XHR9LFxyXG5cdFx0XHRzZXQ6IGZ1bmN0aW9uKHZhbCkge1xyXG5cdFx0XHRcdHRoaXMubW9ycGhUYXJnZXRJbmZsdWVuY2VzWzBdID0gKHZhbCAvIDMyKSAtIDE7XHJcblx0XHRcdH0sXHJcblx0XHR9LFxyXG5cdFx0aGVpZ2h0OiB7XHJcblx0XHRcdGdldDogZnVuY3Rpb24oKSB7XHJcblx0XHRcdFx0cmV0dXJuIE1hdGguZmxvb3IoKHRoaXMubW9ycGhUYXJnZXRJbmZsdWVuY2VzWzFdICsgMSkgKiAzMik7XHJcblx0XHRcdH0sXHJcblx0XHRcdHNldDogZnVuY3Rpb24odmFsKSB7XHJcblx0XHRcdFx0dGhpcy5tb3JwaFRhcmdldEluZmx1ZW5jZXNbMV0gPSAodmFsIC8gMzIpIC0gMTtcclxuXHRcdFx0fSxcclxuXHRcdH0sXHJcblx0XHRzaHJpbms6IHtcclxuXHRcdFx0Z2V0OiBmdW5jdGlvbigpIHtcclxuXHRcdFx0XHRyZXR1cm4gKHRoaXMubW9ycGhUYXJnZXRJbmZsdWVuY2VzWzJdKTtcclxuXHRcdFx0fSxcclxuXHRcdFx0c2V0OiBmdW5jdGlvbih2YWwpIHtcclxuXHRcdFx0XHR0aGlzLm1vcnBoVGFyZ2V0SW5mbHVlbmNlc1syXSA9IE1hdGguY2xhbXAodmFsKTtcclxuXHRcdFx0fSxcclxuXHRcdH0sXHJcblx0fSk7XHJcblx0dGhpcy5zaHJpbmsgPSAxO1xyXG59XHJcbmluaGVyaXRzKEJ1YmJsZVNwcml0ZSwgVEhSRUUuTWVzaCk7XHJcbmV4dGVuZChCdWJibGVTcHJpdGUucHJvdG90eXBlLCB7XHJcblx0X3RleDogbnVsbCxcclxuXHRfbWF0OiBudWxsLFxyXG5cdHR5cGU6IG51bGwsXHJcblx0X190eXBlcyA6IHtcdC8vXHQgeDEgeTEgeDIgeTJcclxuXHRcdFwiYmxhbmtcIjpcdFsgMCwgMCwgMCwgMF0sXHJcblx0XHRcIi4uLlwiOiBcdFx0WyAwLCAzLCAxLCAzXSxcclxuXHRcdFwiIVwiOiBcdFx0WyAwLCAyLCAxLCAyXSwgXCJleGNsYWltXCIgOiBcIiFcIixcclxuXHRcdFwiP1wiOiBcdFx0WyAwLCAxLCAxLCAxXSwgXCJxdWVzdGlvblwiOiBcIj9cIixcclxuXHRcdFwic2luZ1wiOiBcdFsgMiwgMywgMywgM10sXHJcblx0XHRcIjwzXCI6IFx0XHRbIDIsIDIsIDMsIDJdLCBcImhlYXJ0XCI6IFwiPDNcIixcclxuXHRcdFwicG9zaW9uXCI6IFx0WyAyLCAxLCAzLCAxXSxcclxuXHRcdFwiOilcIjogXHRcdFsgNCwgMywgNSwgM10sIFwiaGFwcHlcIjogXCI6KVwiLFxyXG5cdFx0XCI6RFwiOiBcdFx0WyA0LCAyLCA1LCAyXSwgXCJleGNpdGVkXCI6IFwiOkRcIixcclxuXHRcdFwiOihcIjogXHRcdFsgNCwgMSwgNSwgMV0sIFwic2FkXCI6IFwiOihcIixcclxuXHRcdFwiPjooXCI6XHRcdFsgNiwgMywgNywgM10sIFwiZGlzYWdyZWVcIjogXCI+OihcIixcclxuXHRcdFwiRDo8XCI6IFx0XHRbIDYsIDIsIDcsIDJdLCBcImFuZ3J5XCI6IFwiRDo8XCIsXHJcblx0XHRcIj46KVwiOiBcdFx0WyA2LCAxLCA3LCAxXSwgXCJldmlsXCI6IFwiPjopXCIsXHJcblx0fSxcclxuXHRcclxuXHRzZXRUeXBlIDogZnVuY3Rpb24odHlwZSkge1xyXG5cdFx0dGhpcy50eXBlID0gdGhpcy5fX3R5cGVzW3R5cGVdO1xyXG5cdFx0d2hpbGUgKHRoaXMudHlwZSAmJiAhJC5pc0FycmF5KHRoaXMudHlwZSkpIHtcclxuXHRcdFx0dGhpcy50eXBlID0gdGhpcy5fX3R5cGVzW3RoaXMudHlwZV07XHJcblx0XHR9XHJcblx0XHRpZiAoIXRoaXMudHlwZSkge1xyXG5cdFx0XHR0aGlzLnR5cGUgPSB0aGlzLl9fdHlwZXNbXCJibGFua1wiXTtcclxuXHRcdFx0dGhpcy50aW1lb3V0ID0gMTtcclxuXHRcdH1cclxuXHRcdHRoaXMuX2FscGhhID0gMDtcclxuXHRcdHRoaXMuX2ZyYW1lbm8gPSAwO1xyXG5cdFx0dGhpcy5fdGljaygwKTtcclxuXHR9LFxyXG5cdFxyXG5cdHNldFRpbWVvdXQ6IGZ1bmN0aW9uKHRvKSB7XHJcblx0XHR0aGlzLnRpbWVvdXQgPSB0bztcclxuXHR9LFxyXG5cdFxyXG5cdF9zaG93X2NhbGxiYWNrOiBudWxsLFxyXG5cdF9oaWRlX2NhbGxiYWNrOiBudWxsLFxyXG5cdF9vcGFjaXR5X2Rlc3Q6IDAsXHJcblx0X29wYWNpdHlfY3VycjogMCxcclxuXHRzaG93OiBmdW5jdGlvbihjYWxsYmFjaykge1xyXG5cdFx0Ly8gdGhpcy52aXNpYmxlID0gdHJ1ZTtcclxuXHRcdHRoaXMuX29wYWNpdHlfZGVzdCA9IDE7XHJcblx0XHR0aGlzLl9zaG93X2NhbGxiYWNrID0gY2FsbGJhY2s7XHJcblx0fSxcclxuXHRoaWRlOiBmdW5jdGlvbihjYWxsYmFjaykge1xyXG5cdFx0Ly8gdGhpcy52aXNpYmxlID0gZmFsc2U7XHJcblx0XHR0aGlzLl9vcGFjaXR5X2Rlc3QgPSAwO1xyXG5cdFx0dGhpcy5fc2hvd19jYWxsYmFjayA9IGNhbGxiYWNrO1xyXG5cdH0sXHJcblx0XHJcblx0X2FscGhhOiAwLFxyXG5cdF9mcmFtZW5vOiAwLFxyXG5cdF90aWNrOiBmdW5jdGlvbihkZWx0YSkge1xyXG5cdFx0aWYgKCF0aGlzLnR5cGUpIHJldHVybjtcclxuXHRcdHZhciBzZWxmID0gdGhpcztcclxuXHRcdHRoaXMuX2FscGhhIC09IGRlbHRhO1xyXG5cdFx0XHJcblx0XHRpZiAodGhpcy50aW1lb3V0ID4gMCkge1xyXG5cdFx0XHR0aGlzLnRpbWVvdXQgLT0gZGVsdGE7XHJcblx0XHRcdGlmICh0aGlzLnRpbWVvdXQgPCAwKSB7XHJcblx0XHRcdFx0dGhpcy5oaWRlKGZ1bmN0aW9uKCl7XHJcblx0XHRcdFx0XHRzZWxmLnJlbGVhc2UoKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHRpZiAodGhpcy5fb3BhY2l0eV9jdXJyID4gdGhpcy5fb3BhY2l0eV9kZXN0KSB7XHJcblx0XHRcdHRoaXMuX29wYWNpdHlfY3VyciAtPSAoZGVsdGEgKiBDT05GSUcuc3BlZWQuYnViYmxlcG9wKTtcclxuXHRcdFx0dGhpcy5zaHJpbmsgPSAxLXRoaXMuX29wYWNpdHlfY3VycjtcclxuXHRcdFx0dGhpcy5fbWF0Lm9wYWNpdHkgPSBNYXRoLmNsYW1wKHRoaXMuX29wYWNpdHlfY3Vycik7XHJcblx0XHRcdGlmICh0aGlzLl9vcGFjaXR5X2N1cnIgPD0gdGhpcy5fb3BhY2l0eV9kZXN0KSB7XHJcblx0XHRcdFx0aWYgKHRoaXMuX2hpZGVfY2FsbGJhY2spIHtcclxuXHRcdFx0XHRcdHRoaXMuX2hpZGVfY2FsbGJhY2soKTtcclxuXHRcdFx0XHRcdHRoaXMuX2hpZGVfY2FsbGJhY2sgPSBudWxsO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHR0aGlzLl9vcGFjaXR5X2N1cnIgPSBNYXRoLmNsYW1wKHRoaXMuX29wYWNpdHlfY3Vycik7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdGVsc2UgaWYgKHRoaXMuX29wYWNpdHlfY3VyciA8IHRoaXMuX29wYWNpdHlfZGVzdCkge1xyXG5cdFx0XHR0aGlzLl9vcGFjaXR5X2N1cnIgKz0gKGRlbHRhICogQ09ORklHLnNwZWVkLmJ1YmJsZXBvcCk7XHJcblx0XHRcdHRoaXMuc2hyaW5rID0gMS10aGlzLl9vcGFjaXR5X2N1cnI7XHJcblx0XHRcdHRoaXMuX21hdC5vcGFjaXR5ID0gTWF0aC5jbGFtcCh0aGlzLl9vcGFjaXR5X2N1cnIpO1xyXG5cdFx0XHRpZiAodGhpcy5fb3BhY2l0eV9jdXJyID49IHRoaXMuX29wYWNpdHlfZGVzdCkge1xyXG5cdFx0XHRcdGlmICh0aGlzLl9zaG93X2NhbGxiYWNrKSB7XHJcblx0XHRcdFx0XHR0aGlzLl9zaG93X2NhbGxiYWNrKCk7XHJcblx0XHRcdFx0XHR0aGlzLl9zaG93X2NhbGxiYWNrID0gbnVsbDtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0dGhpcy5fb3BhY2l0eV9jdXJyID0gTWF0aC5jbGFtcCh0aGlzLl9vcGFjaXR5X2N1cnIpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdGlmICh0aGlzLl9hbHBoYSA8PSAwKSB7XHJcblx0XHRcdHRoaXMuX2FscGhhID0gNTtcclxuXHRcdFx0XHJcblx0XHRcdHRoaXMuX2ZyYW1lbm8gPSAodGhpcy5fZnJhbWVubyArIDEpICUgMjtcclxuXHRcdFx0dmFyIGZuID0gdGhpcy5fZnJhbWVubyAqIDI7XHJcblx0XHRcdFxyXG5cdFx0XHR0aGlzLl90ZXgub2Zmc2V0LnggPSB0aGlzLnR5cGVbZm4gIF0gKiB0aGlzLl90ZXgucmVwZWF0Lng7XHJcblx0XHRcdHRoaXMuX3RleC5vZmZzZXQueSA9IHRoaXMudHlwZVtmbisxXSAqIHRoaXMuX3RleC5yZXBlYXQueTtcclxuXHRcdH1cclxuXHR9LFxyXG59KTtcclxubW9kdWxlLmV4cG9ydHMuQnViYmxlU3ByaXRlID0gQnViYmxlU3ByaXRlO1xyXG5cclxuXHJcbmZ1bmN0aW9uIEJ1YmJsZVBsYW5lR2VvbWV0cnkob2ZmKSB7XHJcblx0VEhSRUUuR2VvbWV0cnkuY2FsbCh0aGlzKTtcclxuXHR2YXIgQlNJWkUgPSAwLjM4O1xyXG5cdFxyXG5cdHRoaXMudHlwZSA9IFwiQnViYmxlUGxhbmVHZW9tZXRyeVwiO1xyXG5cdHRoaXMudmVydGljZXMgPSBbXHJcblx0XHRuZXcgVEhSRUUuVmVjdG9yMyggLUJTSVpFICsgb2ZmLngsIDEuNSAtIEJTSVpFICsgb2ZmLnksIC0wLjAxICsgb2ZmLnogKSxcclxuXHRcdG5ldyBUSFJFRS5WZWN0b3IzKCAgQlNJWkUgKyBvZmYueCwgMS41IC0gQlNJWkUgKyBvZmYueSwgLTAuMDEgKyBvZmYueiApLFxyXG5cdFx0bmV3IFRIUkVFLlZlY3RvcjMoICBCU0laRSArIG9mZi54LCAxLjUgKyBCU0laRSArIG9mZi55LCAtMC4wMSArIG9mZi56ICksXHJcblx0XHRuZXcgVEhSRUUuVmVjdG9yMyggLUJTSVpFICsgb2ZmLngsIDEuNSArIEJTSVpFICsgb2ZmLnksIC0wLjAxICsgb2ZmLnogKSxcclxuXHRdO1xyXG5cdFxyXG5cdHRoaXMuZmFjZXMucHVzaChuZXcgVEhSRUUuRmFjZTMoMCwgMSwgMikpO1xyXG5cdHRoaXMuZmFjZXMucHVzaChuZXcgVEhSRUUuRmFjZTMoMCwgMiwgMykpO1xyXG5cdFxyXG5cdHRoaXMuZmFjZVZlcnRleFV2c1swXS5wdXNoKFsgdXYoMC4wMDUsIDAuMDA1KSwgdXYoMC45OTUsIDAuMDA1KSwgdXYoMC45OTUsIDAuOTk1KSBdKTtcclxuXHR0aGlzLmZhY2VWZXJ0ZXhVdnNbMF0ucHVzaChbIHV2KDAuMDA1LCAwLjAwNSksIHV2KDAuOTk1LCAwLjk5NSksIHV2KDAuMDA1LCAwLjk5NSkgXSk7XHJcblx0XHJcblx0dGhpcy5tb3JwaFRhcmdldHMgPSBbXHJcblx0XHR7IG5hbWU6IFwib2ZmeFwiLCB2ZXJ0aWNlczogW1xyXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMyggLUJTSVpFICsgb2ZmLnggKyAxLCAxIC0gQlNJWkUgKyBvZmYueSwgLTAuMDEgKyBvZmYueiApLFxyXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMyggIEJTSVpFICsgb2ZmLnggKyAxLCAxIC0gQlNJWkUgKyBvZmYueSwgLTAuMDEgKyBvZmYueiApLFxyXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMyggIEJTSVpFICsgb2ZmLnggKyAxLCAxICsgQlNJWkUgKyBvZmYueSwgLTAuMDEgKyBvZmYueiApLFxyXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMyggLUJTSVpFICsgb2ZmLnggKyAxLCAxICsgQlNJWkUgKyBvZmYueSwgLTAuMDEgKyBvZmYueiApLFxyXG5cdFx0XSB9LFxyXG5cdFx0eyBuYW1lOiBcImhlaWdodFwiLCB2ZXJ0aWNlczogW1xyXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMyggLUJTSVpFICsgb2ZmLngsIDEgLSBCU0laRSArIG9mZi55ICsgMSwgLTAuMDEgKyBvZmYueiApLFxyXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMyggIEJTSVpFICsgb2ZmLngsIDEgLSBCU0laRSArIG9mZi55ICsgMSwgLTAuMDEgKyBvZmYueiApLFxyXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMyggIEJTSVpFICsgb2ZmLngsIDEgKyBCU0laRSArIG9mZi55ICsgMSwgLTAuMDEgKyBvZmYueiApLFxyXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMyggLUJTSVpFICsgb2ZmLngsIDEgKyBCU0laRSArIG9mZi55ICsgMSwgLTAuMDEgKyBvZmYueiApLFxyXG5cdFx0XSB9LFxyXG5cdFx0eyBuYW1lOiBcInNocmlua1wiLCB2ZXJ0aWNlczogW1xyXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMyggb2ZmLngsIDEgKyBvZmYueSwgLTAuMDEgKyBvZmYueiApLFxyXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMyggb2ZmLngsIDEgKyBvZmYueSwgLTAuMDEgKyBvZmYueiApLFxyXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMyggb2ZmLngsIDEgKyBvZmYueSwgLTAuMDEgKyBvZmYueiApLFxyXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMyggb2ZmLngsIDEgKyBvZmYueSwgLTAuMDEgKyBvZmYueiApLFxyXG5cdFx0XSB9LFxyXG5cdF07XHJcblx0XHJcblx0ZnVuY3Rpb24gdXYoeCwgeSkgeyByZXR1cm4gbmV3IFRIUkVFLlZlY3RvcjIoeCwgeSk7IH1cclxufVxyXG5pbmhlcml0cyhCdWJibGVQbGFuZUdlb21ldHJ5LCBUSFJFRS5HZW9tZXRyeSk7XHJcblxyXG5cclxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cclxuXHJcbmZ1bmN0aW9uIFNwcml0ZUdsb3dNYXRlcmlhbChvcHRzKSB7XHJcblx0aWYgKCEodGhpcyBpbnN0YW5jZW9mIFNwcml0ZUdsb3dNYXRlcmlhbCkpIHtcclxuXHRcdHJldHVybiBuZXcgU3ByaXRlR2xvd01hdGVyaWFsKG9wdHMpO1xyXG5cdH1cclxuXHRcclxuXHQvL1RPRE8gd3JpdGUgaXQgc28gd2hlbiB3ZSByZXBsYWNlIHRoZSB2YWx1ZXMgaGVyZSwgd2UgcmVwbGFjZSB0aGUgb25lcyBpbiB0aGUgdW5pZm9ybXNcclxuXHQvLyBPYmplY3QuZGVmaW5lUHJvcGVydGllcyh0aGlzLCB7XHJcblx0Ly8gXHR1dk9mZnNldCA6IHt9XHJcblx0Ly8gfSk7XHJcblxyXG5cdHRoaXMuY29sb3IgPSAob3B0cy5jb2xvciBpbnN0YW5jZW9mIFRIUkVFLkNvbG9yKT8gb3B0cy5jb2xvciA6IG5ldyBUSFJFRS5Db2xvcihvcHRzLmNvbG9yKTtcclxuXHQvLyB0aGlzLm9wYWNpdHkgPSBvcHRzLm9wYWNpdHkgfHwgMTtcclxuXHRcclxuXHR2YXIgcGFyYW1zID0gdGhpcy5fY3JlYXRlTWF0UGFyYW1zKG9wdHMpO1xyXG5cdFRIUkVFLlNoYWRlck1hdGVyaWFsLmNhbGwodGhpcywgcGFyYW1zKTtcclxuXHR0aGlzLnR5cGUgPSBcIlNwcml0ZUdsb3dNYXRlcmlhbFwiO1xyXG5cdFxyXG5cdHRoaXMudHJhbnNwYXJlbnQgPSAob3B0cy50cmFuc3BhcmVudCAhPT0gdW5kZWZpbmVkKT8gb3B0cy50cmFuc3BhcmVudCA6IHRydWU7XHJcblx0dGhpcy5hbHBoYVRlc3QgPSAwLjA1O1xyXG5cdC8vIHRoaXMuZGVwdGhXcml0ZSA9IGZhbHNlO1xyXG59XHJcbmluaGVyaXRzKFNwcml0ZUdsb3dNYXRlcmlhbCwgVEhSRUUuU2hhZGVyTWF0ZXJpYWwpO1xyXG5leHRlbmQoU3ByaXRlR2xvd01hdGVyaWFsLnByb3RvdHlwZSwge1xyXG5cdG1hcCA6IG51bGwsXHJcblx0XHJcblx0X2NyZWF0ZU1hdFBhcmFtcyA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0dmFyIHBhcmFtcyA9IHtcclxuXHRcdFx0dW5pZm9ybXMgOiB7XHJcblx0XHRcdFx0XCJjXCI6ICAgeyB0eXBlOiBcImZcIiwgdmFsdWU6IDEuMCB9LFxyXG5cdFx0XHRcdFwicFwiOiAgIHsgdHlwZTogXCJmXCIsIHZhbHVlOiAxLjQgfSxcclxuXHRcdFx0XHRnbG93Q29sb3I6IHsgdHlwZTogXCJjXCIsIHZhbHVlOiB0aGlzLmNvbG9yIH0sLy9uZXcgVEhSRUUuQ29sb3IoMHhmZmZmMDApIH0sXHJcblx0XHRcdFx0Ly8gdmlld1ZlY3RvcjogeyB0eXBlOiBcInYzXCIsIHZhbHVlOiBjYW1lcmEucG9zaXRpb24gfVxyXG5cdFx0XHR9LFxyXG5cdFx0fTtcclxuXHRcdFxyXG5cdFx0cGFyYW1zLnZlcnRleFNoYWRlciA9IHRoaXMuX3ZlcnRTaGFkZXI7XHJcblx0XHRwYXJhbXMuZnJhZ21lbnRTaGFkZXIgPSB0aGlzLl9mcmFnU2hhZGVyO1xyXG5cdFx0cGFyYW1zLmJsZW5kaW5nID0gVEhSRUUuQWRkaXRpdmVCbGVuZGluZztcclxuXHRcdHJldHVybiBwYXJhbXM7XHJcblx0fSxcclxuXHRcclxuXHRfdmVydFNoYWRlcjogW1xyXG5cdFx0Ly8gXCJ1bmlmb3JtIHZlYzMgdmlld1ZlY3RvcjtcIixcclxuXHRcdFwidW5pZm9ybSBmbG9hdCBjO1wiLFxyXG5cdFx0XCJ1bmlmb3JtIGZsb2F0IHA7XCIsXHJcblx0XHRcInZhcnlpbmcgZmxvYXQgaW50ZW5zaXR5O1wiLFxyXG5cdFx0XHJcblx0XHRcInZvaWQgbWFpbigpIHtcIixcclxuXHRcdFx0XCJ2ZWMzIHZOb3JtID0gbm9ybWFsaXplKCBub3JtYWxNYXRyaXggKiBub3JtYWwgKTtcIixcclxuXHRcdFx0Ly8gXCJ2ZWMzIHZOb3JtQ2FtZXJhID0gbm9ybWFsaXplKCBub3JtYWxNYXRyaXggKiB2aWV3VmVjdG9yICk7XCIsXHJcblx0XHRcdFwidmVjMyB2Tm9ybUNhbWVyYSA9IG5vcm1hbGl6ZSggbm9ybWFsTWF0cml4ICogbm9ybWFsaXplKCBtb2RlbFZpZXdNYXRyaXggKiB2ZWM0KDAsIDAsIDEsIDEpICkueHl6ICk7XCIsXHJcblx0XHRcdFwiaW50ZW5zaXR5ID0gcG93KCBjIC0gZG90KHZOb3JtLCB2Tm9ybUNhbWVyYSksIHAgKTtcIixcclxuXHRcdFx0XHJcblx0XHRcdFwiZ2xfUG9zaXRpb24gPSBwcm9qZWN0aW9uTWF0cml4ICogbW9kZWxWaWV3TWF0cml4ICogdmVjNCggcG9zaXRpb24sIDEuMCApO1wiLFxyXG5cdFx0XCJ9XCIsXHJcblx0XS5qb2luKFwiXFxuXCIpLFxyXG5cdFxyXG5cdF9mcmFnU2hhZGVyOiBbXHJcblx0XHRcInVuaWZvcm0gdmVjMyBnbG93Q29sb3I7XCIsXHJcblx0XHRcInZhcnlpbmcgZmxvYXQgaW50ZW5zaXR5O1wiLFxyXG5cdFx0XHJcblx0XHRcInZvaWQgbWFpbigpIHtcIixcclxuXHRcdFx0XCJ2ZWMzIGdsb3cgPSBnbG93Q29sb3IgKiBpbnRlbnNpdHk7XCIsXHJcblx0XHRcdFwiZ2xfRnJhZ0NvbG9yID0gdmVjNCggZ2xvdywgMS4wICk7XCIsXHJcblx0XHRcIn1cIixcclxuXHRdLmpvaW4oXCJcXG5cIiksXHJcbn0pO1xyXG5tb2R1bGUuZXhwb3J0cy5TcHJpdGVHbG93TWF0ZXJpYWwgPSBTcHJpdGVHbG93TWF0ZXJpYWw7XHJcbiIsIi8vIHRHYWxsZXJ5LmpzXHJcbi8vIERlZmluZXMgdGhlIGJhc2UgZXZlbnQgdGhhdCBhY3RvcnMgaGF2ZSBpbiB0aGUgdEdhbGxlcnkgdGVzdCBtYXAuXHJcblxyXG52YXIgaW5oZXJpdHMgPSByZXF1aXJlKFwiaW5oZXJpdHNcIik7XHJcbnZhciBleHRlbmQgPSByZXF1aXJlKFwiZXh0ZW5kXCIpO1xyXG5cclxudmFyIEFjdG9yID0gcmVxdWlyZShcInRwcC1hY3RvclwiKTtcclxudmFyIE1lYW5kZXJCZWhhdiA9IHJlcXVpcmUoXCJ0cHAtYmVoYXZpb3JcIikuTWVhbmRlcjtcclxudmFyIFRhbGtpbmdCZWhhdiA9IHJlcXVpcmUoXCJ0cHAtYmVoYXZpb3JcIikuVGFsa2luZztcclxuXHJcbmZ1bmN0aW9uIEFjdG9yR2FsYShiYXNlLCBleHQpIHtcclxuXHRleHQgPSBleHRlbmQoe1xyXG5cdFx0bG9jYXRpb246IFwicmFuZFwiLFxyXG5cdFx0b25FdmVudHM6IHtcclxuXHRcdFx0aW50ZXJhY3RlZDogZnVuY3Rpb24oKSB7XHJcblx0XHRcdFx0dmFyIHNlbGYgPSB0aGlzO1xyXG5cdFx0XHRcdCQoXCIjc3RhdHVzYmFyXCIpLmh0bWwoXCJUaGlzIGlzIFwiK3RoaXMubmFtZStcIiEgKFwiK3RoaXMuaWQrXCIpPGJyLz5UaGlzIHNwcml0ZSB3YXMgY3JlYXRlZCBieSBcIit0aGlzLnNwcml0ZV9jcmVhdG9yK1wiIVwiKTtcclxuXHRcdFx0XHR2YXIgZGxvZyA9IHNlbGYuZGlhbG9nIHx8IFtcclxuXHRcdFx0XHRcdFwiXCIrdGhpcy5uYW1lK1wiIHdhdmVzIGF0IHlvdSBpbiBncmVldGluZyBiZWZvcmUgY29udGludWluZyB0byBtZWFuZGVyIGFib3V0IHRoZSBHYWxsZXJ5LlwiXHJcblx0XHRcdFx0XTtcclxuXHRcdFx0XHRcclxuXHRcdFx0XHQvLyBVSS5zaG93VGV4dEJveChzZWxmLmRpYWxvZ190eXBlLCBkbG9nLCB7IGNvbXBsZXRlOiBmdW5jdGlvbigpe1xyXG5cdFx0XHRcdC8vIFx0c2VsZi5iZWhhdmlvclN0YWNrLnBvcCgpO1xyXG5cdFx0XHRcdC8vIH19KTtcclxuXHRcdFx0XHQvLyBzZWxmLmJlaGF2aW9yU3RhY2sucHVzaChUYWxraW5nQmVoYXYpO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdHNlbGYuYmVoYXZpb3JTdGFjay5wdXNoKG5ldyBUYWxraW5nQmVoYXYoe1xyXG5cdFx0XHRcdFx0ZGlhbG9nOiBkbG9nLFxyXG5cdFx0XHRcdFx0ZGlhbG9nX3R5cGU6IHNlbGYuZGlhbG9nX3R5cGUsXHJcblx0XHRcdFx0XHRvd25lcjogc2VsZixcclxuXHRcdFx0XHR9KSk7XHJcblx0XHRcdH0sXHJcblx0XHR9LFxyXG5cdFx0XHJcblx0XHRkaWFsb2dfdHlwZTogXCJ0ZXh0XCIsXHJcblx0XHRkaWFsb2c6IG51bGwsXHJcblx0XHRcclxuXHRcdGJlaGF2aW9yU3RhY2s6IFtuZXcgTWVhbmRlckJlaGF2KCldLFxyXG5cdFx0XHJcblx0XHRzaG91bGRBcHBlYXI6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdHJ1ZTsgfSxcclxuXHRcdFxyXG5cdH0sIGV4dCk7XHJcblx0QWN0b3IuY2FsbCh0aGlzLCBiYXNlLCBleHQpO1xyXG59XHJcbmluaGVyaXRzKEFjdG9yR2FsYSwgQWN0b3IpO1xyXG5cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQWN0b3JHYWxhOyIsIi8vIHRyaWdnZXIuanNcclxuLy8gRGVmaW5lcyBhIHRyaWdnZXIgdGlsZShzKSB1c2VkIHRocm91Z2hvdXQgdGhlIHBhcmtcclxuXHJcbnZhciBFdmVudCA9IHJlcXVpcmUoXCJ0cHAtZXZlbnRcIik7XHJcbnZhciBpbmhlcml0cyA9IHJlcXVpcmUoXCJpbmhlcml0c1wiKTtcclxudmFyIGV4dGVuZCA9IHJlcXVpcmUoXCJleHRlbmRcIik7XHJcblxyXG4vKipcclxuICogQSB0cmlnZ2VyIGlzIGEgdGlsZSB0aGF0LCB3aGVuIHN0ZXBwZWQgdXBvbiwgd2lsbCB0cmlnZ2VyIHNvbWUgZXZlbnQuXHJcbiAqIFRoZSBtb3N0IGNvbW1vbiBldmVudCB0aWdnZXJlZCBpcyBhIHdhcnBpbmcgdG8gYW5vdGhlciBtYXAsIGZvciB3aGljaFxyXG4gKiB0aGUgc3ViY2xhc3MgV2FycCBpcyBkZXNpZ25lZCBmb3IuXHJcbiAqXHJcbiAqIFRyaWdnZXJzIG1heSB0YWtlIHVwIG1vcmUgdGhhbiBvbmUgc3BhY2UuXHJcbiAqL1xyXG5mdW5jdGlvbiBUcmlnZ2VyKGJhc2UsIG9wdHMpIHtcclxuXHRFdmVudC5jYWxsKHRoaXMsIGJhc2UsIG9wdHMpO1xyXG5cdFxyXG5cdHRoaXMub24oXCJlbnRlcmVkLXRpbGVcIiwgdGhpcy5vblRyaWdnZXJFbnRlcik7XHJcblx0dGhpcy5vbihcImxlYXZpbmctdGlsZVwiLCB0aGlzLm9uVHJpZ2dlckxlYXZlKTtcclxufVxyXG5pbmhlcml0cyhUcmlnZ2VyLCBFdmVudCk7XHJcbmV4dGVuZChUcmlnZ2VyLnByb3RvdHlwZSwge1xyXG5cdFxyXG5cdG9uVHJpZ2dlckVudGVyIDogZnVuY3Rpb24oZGlyKSB7XHJcblx0XHRjb25zb2xlLmxvZyhcIlRyaWdnZXJlZCFcIik7XHJcblx0fSxcclxuXHRvblRyaWdnZXJMZWF2ZSA6IGZ1bmN0aW9uKGRpcikge1xyXG5cdFx0XHJcblx0fSxcclxufSk7XHJcbm1vZHVsZS5leHBvcnRzID0gVHJpZ2dlcjtcclxuIiwiLy8gd2FycC5qc1xyXG4vLyBEZWZpbmVzIGEgd2FycCB0aWxlIHVzZWQgdGhyb3VnaG91dCB0aGUgcGFyay5cclxuXHJcbnZhciBUcmlnZ2VyID0gcmVxdWlyZShcInRwcC10cmlnZ2VyXCIpO1xyXG52YXIgaW5oZXJpdHMgPSByZXF1aXJlKFwiaW5oZXJpdHNcIik7XHJcbnZhciBleHRlbmQgPSByZXF1aXJlKFwiZXh0ZW5kXCIpO1xyXG5cclxuLyoqXHJcbiAqIEEgd2FycCBpcyBhbiBldmVudCB0aGF0LCB3aGVuIHdhbGtlZCB1cG9uLCB3aWxsIHRha2UgdGhlIHBsYXllciB0byBhbm90aGVyIG1hcCBvclxyXG4gKiBhcmVhIHdpdGhpbiB0aGUgc2FtZSBtYXAuIERpZmZlcmVudCB0eXBlcyBvZiB3YXJwcyBleGlzdCwgcmFuZ2luZyBmcm9tIHRoZSBzdGFuZGFyZFxyXG4gKiBkb29yIHdhcnAgdG8gdGhlIHRlbGVwb3J0IHdhcnAuIFdhcnBzIGNhbiBiZSB0b2xkIHRvIGFjdGl2YXRlIHVwb24gc3RlcHBpbmcgdXBvbiB0aGVtXHJcbiAqIG9yIGFjdGl2YXRlIHVwb24gc3RlcHBpbmcgb2ZmIGEgY2VydGFpbiBkaXJlY3Rpb24uXHJcbiAqL1xyXG5mdW5jdGlvbiBXYXJwKGJhc2UsIG9wdHMpIHtcclxuXHRUcmlnZ2VyLmNhbGwodGhpcywgYmFzZSwgb3B0cyk7XHJcblx0XHJcbn1cclxuaW5oZXJpdHMoV2FycCwgVHJpZ2dlcik7XHJcbmV4dGVuZChXYXJwLnByb3RvdHlwZSwge1xyXG5cdHNvdW5kOiBcImV4aXRfd2Fsa1wiLFxyXG5cdGV4aXRfdG86IG51bGwsXHJcblx0XHJcblx0b25UcmlnZ2VyRW50ZXIgOiBmdW5jdGlvbihkaXIpIHtcclxuXHRcdFNvdW5kTWFuYWdlci5wbGF5U291bmQodGhpcy5zb3VuZCk7XHJcblx0XHRpZiAoIXRoaXMuZXhpdF90bykgcmV0dXJuO1xyXG5cdFx0TWFwTWFuYWdlci50cmFuc2l0aW9uVG8odGhpcy5leGl0X3RvLm1hcCwgdGhpcy5leGl0X3RvLndhcnApO1xyXG5cdH0sXHJcbn0pO1xyXG5tb2R1bGUuZXhwb3J0cyA9IFdhcnA7Il19
