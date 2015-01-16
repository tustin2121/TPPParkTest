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

},{}],2:[function(require,module,exports){
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


},{}],3:[function(require,module,exports){
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

},{}],"tpp-actor":[function(require,module,exports){
// actor.js
// Defines the actor event used throughout the park

var Event = require("tpp-event");
var inherits = require("inherits");
var extend = require("extend");

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
	this.on("interacted", this._actorInteractFace);
	this.facing = new THREE.Vector3(0, 0, 1);
}
inherits(Actor, Event);
extend(Actor.prototype, {
	sprite: null,
	sprite_format: null,
	
	shadow : true,
	
	//////////////// Property Setters /////////////////
	scale: 1,
	
	setScale : function(scale) {
		this.scale = scale;
		scale *= GLOBAL_SCALEUP;
		this.avatar_sprite.scale.set(scale, scale, scale);
	},
	
	/////////////////////// Avatar //////////////////////
	avatar_node : null,
	avatar_sprite : null,
	avatar_format : null,
	avatar_tex : null,
	
	getAvatar : function(map){ 
		if (this.avatar_node) return this.avatar_node;
		
		var node = this.avatar_node = new THREE.Object3D();
		
		node.add(this._avatar_createSprite(map));
		node.add(this._avatar_createShadowCaster());
		
		return node;
		
	},
	
	_avatar_createShadowCaster: function() {
		var mat = new THREE.MeshBasicMaterial();
		mat.visible = false; //The object won't render, but the shadow still will
		
		var geom = new THREE.SphereGeometry(0.3, 7, 3);
		
		var mesh = new THREE.Mesh(geom, mat);
		//mesh.visible = false; //?
		mesh.castShadow = true;
		mesh.position.set(0, 0.5, 0);
		return mesh;
	},
	
	_avatar_createSprite : function(map) {
		var self = this;
		var img = new Image();
		var texture = self.avatar_tex = new THREE.Texture(img);
		
		this.__onLoadSprite(img, DEF_SPRITE_FORMAT, texture);
		img.src = DEF_SPRITE;
		
		texture.magFilter = THREE.NearestFilter;
		texture.minFilter = THREE.NearestFilter;
		texture.repeat = new THREE.Vector2(0.25, 0.25);
		texture.offset = new THREE.Vector2(0, 0);
		texture.wrapS = THREE.MirroredRepeatWrapping;
		texture.wrapT = THREE.MirroredRepeatWrapping;
		texture.generateMipmaps = false;
		//TODO MirroredRepeatWrapping, and just use a negative x uv value, to flip a sprite
		
		self.avatar_format = getSpriteFormat(DEF_SPRITE_FORMAT);
		
		var mat /*= self.avatar_mat*/ = new THREE.SpriteMaterial({
			map: texture,
			color: 0xFFFFFF,
			transparent: true,
		});
		
		currentMap.markLoading();
		this._avatar_loadSprite(map, texture);
		
		var sprite = self.avatar_sprite = new THREE.Sprite(mat);
		self.setScale(self.scale);
		
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
			self.__onLoadSprite(img, self.sprite_format, texture);
			img.src = url;
		});
	},
	
	__onLoadSprite : function(img, format, texture) {
		var self = this;
		var f = function() {
			texture.image = img;
			
			self.avatar_format = getSpriteFormat(format);
			texture.repeat.set(self.avatar_format.repeat, self.avatar_format.repeat);

			texture.needsUpdate = true;
			
			self.showAnimationFrame("d0");
			self.playAnimation("stand");
			img.removeEventListener("load", f);
			currentMap.markLoadFinished();
		}
		img.on("load", f);
	},
	
	/////////////////// Animation //////////////////////
	_animationState : null,
	facing : null,
	
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
		
		var u = def[0] * this.avatar_format.repeat;
		var v = 1 - ((def[1]+1) * this.avatar_format.repeat);
		//For some reason, offsets are from the BOTTOM left?!
		
		if (flip && this.avatar_format.flip) {
			u = 0 - (def[0]-1) * this.avatar_format.repeat; //TODO test
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
		state.nextAnim = anim;
		anim.speed = (opts.speed == undefined)? 1 : opts.speed;
		state.stopNextTransition = opts.stopNextTransition || false;
	},
	
	stopAnimation : function() {
		var state = this._initAnimationState();
		
		// state.running = false;
		// state.queue = null;
		// state.stopFrame = null;
		this.emit("anim-end", state.animName);
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
	
	faceDir : function(x, y) {
		this.facing.set(-x, 0, y);
	},
	
	moveTo : function(x, y, layer, bypass) { //bypass Walkmask check
		var state = this._initPathingState();
		var src = this.location;
		layer = (layer == undefined)? this.location.z : layer;
		
		this.facing.set(src.x-x, 0, y-src.y);
		
		var walkmask = currentMap.canWalkBetween(src.x, src.y, x, y);
		if (bypass !== undefined) walkmask = bypass;
		if (!walkmask) {
			console.warn(this.id, ": Cannot walk to location", "("+x+","+y+")");
			currentMap.dispatch(x, y, "bumped", this.facing);
			// this.emit("bumped", this.facing); //getDirFromLoc(x, y, src.x, src.y));
			this.playAnimation("bump", { stopNextTransition: true });
			return;
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
		state.speed = 1;
		state.moving = true;
		
		if ((walkmask & 0x2) === 0x2) {
			state.midpointOffset.setY(0.6);
			state.jumping = true;
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
	
	
	///////////////////// Private Methods //////////////////////
	
	canWalkOn : function(){ return false; },
	
	_normalizeLocation : function() {
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
	},
	
	_actorInteractFace : function(vector) {
		this.facing = vector.clone().negate();
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


function getSpriteFormat(str) {
	var format = str.split("-");
	var name = format[0];
	var size = format[1].split("x");
	size[1] = size[1] || size[0];
	
	var base = {
		width: size[0], height: size[1], flip: false, repeat: 0.25,
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
			});
		case "hg_pokeflip":
			return extend(true, base, { 
				frames: { // pointers to another image indicates that image should be flipped, if flip=true
					"u0": null, "u1": [0, 0], "u2": [1, 0],
					"d0": null, "d1": [0, 1], "d2": [1, 1],
					"l0": null, "l1": [0, 2], "l2": [1, 2],
					"r0": null, "r1": "l1",   "r2": "l2",
				},
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
	}
}

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
		{ d: "l0", frameLength: 8, },
		{ d: "d0", frameLength: 8, }, //16
		{ d: "r0", frameLength: 9, },
		{ d: "u0", frameLength: 9, },
		{ d: "l0", frameLength: 10, },
		{ d: "d0", frameLength: 1, trans: true, },
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
			console.warn("Animation has completed!");
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
		if (this.options.keepFrame) return;
		this.currFrame = 0;
		this.waitTime = this.frames[this.currFrame].frameLength || this.options.frameLength;
		this.speed = 1;
	},
	
	/** If this animation is on a frame that can transition to another animation. */
	canTransition : function() {
		return this.frames[this.currFrame].trans;
	},
	
	/** Returns the name of the frame to display this frame. */
	getFrameToDisplay : function(dir) {
		if (this.options.singleDir) dir = this.options.singleDir;
		return this.frames[this.currFrame][dir];
	},
};
},{"extend":2,"inherits":3,"tpp-event":"tpp-event"}],"tpp-controller":[function(require,module,exports){
// controller.js
// This class handles input and converts it to control signals

var inherits = require("inherits");
var extend = require("extend");
var EventEmitter = require("events").EventEmitter;

// TODO https://developer.mozilla.org/en-US/docs/Web/Guide/API/Gamepad

function ControlManager() {
	var self = this;
	$(document).keydown(function(e) { self.onKeyDown(e); });
	$(document).keyup(function(e) { self.onKeyUp(e); });
	
	this.setKeyConfig();
}
inherits(ControlManager, EventEmitter);
extend(ControlManager.prototype, {
	inputContext : "game",
	
	keys_config : {
		Up: [38, "Up", 87, "w"], 
		Down: [40, "Down", 83, "s"], 
		Left: [37, "Left", 65, "a"], 
		Right: [39, "Right", 68, "d"],
		Interact: [13, "Enter", 32, " "],
		FocusChat: [191, "/"],
	},
	
	keys_active : {},
	
	keys_down : {
		Up: false, Down: false,
		Left: false, Right: false,
		Interact: false, FocusChat: false,
	},
	
	isDown : function(key) {
		return this.keys_down[key];
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
	
	emitKey : function(action, down) {
		if (this.keys_down[action] != down) {
			this.keys_down[action] = down;
			this.emit("control-action", action, down);
		}
	},
	
});
module.exports = new ControlManager();

},{"events":1,"extend":2,"inherits":3}],"tpp-event":[function(require,module,exports){
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
	
	shouldAppear : function(){ return true; },
	canWalkOn : function(){ return true; },
	
	/** Returns an object to represent this event in 3D space, or null if there shouldn't be one. */
	getAvatar : function(){ return null; },
	
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

},{"events":1,"extend":2,"inherits":3}],"tpp-pc":[function(require,module,exports){
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
		//TODO warpdef.anim
		
		currentMap.queueForMapStart(function(){
			var animName = null;
			var x = self.location.x;
			var y = self.location.y;
			var layer = self.location.z;
			var z_off = 0;
			
			switch(warpdef.anim) { //Warp animation
				case 0: break; // Appear
				case 1: y++; animName = "walk"; break; // Walk up
				case 2: y--; animName = "walk"; break; // Walk down
				case 3: x--; animName = "walk"; break; // Walk left
				case 4: x++; animName = "walk"; break; // Walk down
				case 5: z_off = 10; animName = "warp_in"; break; // Warp in
			}
			
			var src = self.location;
			var state = self._initPathingState();
			
			if (src.x-x || y-src.y) 
				self.facing.set(x-src.x, 0, src.y-y);
			else
				self.facing.set(0, 0, 1);
			
			state.srcLocC.set(x, y, layer);
			state.srcLoc3.set(currentMap.get3DTileLocation(x, y, layer));
			state.destLocC.set(src);
			state.destLoc3.set(currentMap.get3DTileLocation(src)).z += z_off;
			state.delta = 0;
			state.moving = true;
			
			self.playAnimation(animName);
			
			//self.avatar_node.position.set( currentMap.get3DTileLocation(self.location) );
		});
	},
	
	controlTimeout: 0.0,
	controlCharacter : function(delta) {
		var y = ((controller.isDown("Up"))? -1:0) + ((controller.isDown("Down"))? 1:0);
		var x = ((controller.isDown("Left"))? -1:0) + ((controller.isDown("Right"))? 1:0);
		
		if (controller.isDown("Interact") && !this._initPathingState().moving) {
			currentMap.dispatch(
				this.location.x - this.facing.x, this.location.y + this.facing.z, 
				"interacted", this.facing);
		}
		
		if ((y || x) && !(x && y)) { //one, but not both
			if (this.controlTimeout < 1) {
				this.controlTimeout += CONFIG.timeout.walkControl * delta;
				
				if (!this._initPathingState().moving) {
					this.faceDir(x, y);
				}
			} else {
				if (!this._initPathingState().moving) {
					this.moveTo(this.location.x+x, this.location.y+y);
				}
			}
		} else {
			if (this.controlTimeout > 0)
				this.controlTimeout -= CONFIG.timeout.walkControl * delta;
		}
		
	},
	
	
	////////////////////////////////////////////////////////////////////////
	
	_avatar_loadSprite : function(map, texture) {
		var url = BASEURL+"/img/pcs/"+ gameState.playerSprite;
		var res = /^([^\[]+)\[([^\]]+)\].png$/.exec(url);
		
		var name = res[1];
		var format = res[2];
		
		var img = new Image();
		this.__onLoadSprite(img, format, texture);
		img.src = url;
	},
	
	// Neuter the location normilization for this kind of event
	_normalizeLocation : function() {},
	
});
module.exports = PlayerChar;

},{"extend":2,"inherits":3,"tpp-actor":"tpp-actor","tpp-controller":"tpp-controller"}],"tpp-trigger":[function(require,module,exports){
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
}
inherits(Trigger, Event);
extend(Trigger.prototype, {
	
});
},{"extend":2,"inherits":3,"tpp-event":"tpp-event"}],"tpp-warp":[function(require,module,exports){
// warp.js
// Defines a warp tile used throughout the park.

var Event = require("tpp-event");
var inherits = require("inherits");
var extend = require("extend");

/**
 * A warp is an event that, when walked upon, will take the player to another map or
 * area within the same map. Different types of warps exist, ranging from the standard
 * door warp to the teleport warp. Warps can be told to activate upon stepping upon them
 * or activate upon stepping off a certain direction.
 */
function Warp(base, opts) {
	Event.call(this, base, opts);
}
inherits(Warp, Event);
extend(Warp.prototype, {
	
});
},{"extend":2,"inherits":3,"tpp-event":"tpp-event"}]},{},[])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlc1xcYnJvd3NlcmlmeVxcbm9kZV9tb2R1bGVzXFxicm93c2VyLXBhY2tcXF9wcmVsdWRlLmpzIiwibm9kZV9tb2R1bGVzXFxicm93c2VyaWZ5XFxub2RlX21vZHVsZXNcXGV2ZW50c1xcZXZlbnRzLmpzIiwibm9kZV9tb2R1bGVzXFxleHRlbmRcXGluZGV4LmpzIiwibm9kZV9tb2R1bGVzXFxpbmhlcml0c1xcaW5oZXJpdHNfYnJvd3Nlci5qcyIsInNyY1xcanNcXGV2ZW50c1xcYWN0b3IiLCJzcmNcXGpzXFxjb250cm9sbGVyIiwic3JjXFxqc1xcZXZlbnRzXFxldmVudCIsInNyY1xcanNcXGV2ZW50c1xccGxheWVyLWNoYXJhY3RlciIsInNyY1xcanNcXGV2ZW50c1xcdHJpZ2dlciIsInNyY1xcanNcXGV2ZW50c1xcd2FycCJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN1NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbm9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdE5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG5mdW5jdGlvbiBFdmVudEVtaXR0ZXIoKSB7XG4gIHRoaXMuX2V2ZW50cyA9IHRoaXMuX2V2ZW50cyB8fCB7fTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gdGhpcy5fbWF4TGlzdGVuZXJzIHx8IHVuZGVmaW5lZDtcbn1cbm1vZHVsZS5leHBvcnRzID0gRXZlbnRFbWl0dGVyO1xuXG4vLyBCYWNrd2FyZHMtY29tcGF0IHdpdGggbm9kZSAwLjEwLnhcbkV2ZW50RW1pdHRlci5FdmVudEVtaXR0ZXIgPSBFdmVudEVtaXR0ZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX2V2ZW50cyA9IHVuZGVmaW5lZDtcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX21heExpc3RlbmVycyA9IHVuZGVmaW5lZDtcblxuLy8gQnkgZGVmYXVsdCBFdmVudEVtaXR0ZXJzIHdpbGwgcHJpbnQgYSB3YXJuaW5nIGlmIG1vcmUgdGhhbiAxMCBsaXN0ZW5lcnMgYXJlXG4vLyBhZGRlZCB0byBpdC4gVGhpcyBpcyBhIHVzZWZ1bCBkZWZhdWx0IHdoaWNoIGhlbHBzIGZpbmRpbmcgbWVtb3J5IGxlYWtzLlxuRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnMgPSAxMDtcblxuLy8gT2J2aW91c2x5IG5vdCBhbGwgRW1pdHRlcnMgc2hvdWxkIGJlIGxpbWl0ZWQgdG8gMTAuIFRoaXMgZnVuY3Rpb24gYWxsb3dzXG4vLyB0aGF0IHRvIGJlIGluY3JlYXNlZC4gU2V0IHRvIHplcm8gZm9yIHVubGltaXRlZC5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuc2V0TWF4TGlzdGVuZXJzID0gZnVuY3Rpb24obikge1xuICBpZiAoIWlzTnVtYmVyKG4pIHx8IG4gPCAwIHx8IGlzTmFOKG4pKVxuICAgIHRocm93IFR5cGVFcnJvcignbiBtdXN0IGJlIGEgcG9zaXRpdmUgbnVtYmVyJyk7XG4gIHRoaXMuX21heExpc3RlbmVycyA9IG47XG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgZXIsIGhhbmRsZXIsIGxlbiwgYXJncywgaSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIElmIHRoZXJlIGlzIG5vICdlcnJvcicgZXZlbnQgbGlzdGVuZXIgdGhlbiB0aHJvdy5cbiAgaWYgKHR5cGUgPT09ICdlcnJvcicpIHtcbiAgICBpZiAoIXRoaXMuX2V2ZW50cy5lcnJvciB8fFxuICAgICAgICAoaXNPYmplY3QodGhpcy5fZXZlbnRzLmVycm9yKSAmJiAhdGhpcy5fZXZlbnRzLmVycm9yLmxlbmd0aCkpIHtcbiAgICAgIGVyID0gYXJndW1lbnRzWzFdO1xuICAgICAgaWYgKGVyIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgdGhyb3cgZXI7IC8vIFVuaGFuZGxlZCAnZXJyb3InIGV2ZW50XG4gICAgICB9XG4gICAgICB0aHJvdyBUeXBlRXJyb3IoJ1VuY2F1Z2h0LCB1bnNwZWNpZmllZCBcImVycm9yXCIgZXZlbnQuJyk7XG4gICAgfVxuICB9XG5cbiAgaGFuZGxlciA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNVbmRlZmluZWQoaGFuZGxlcikpXG4gICAgcmV0dXJuIGZhbHNlO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGhhbmRsZXIpKSB7XG4gICAgc3dpdGNoIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAvLyBmYXN0IGNhc2VzXG4gICAgICBjYXNlIDE6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDI6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0pO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICAvLyBzbG93ZXJcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgaGFuZGxlci5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAoaXNPYmplY3QoaGFuZGxlcikpIHtcbiAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgZm9yIChpID0gMTsgaSA8IGxlbjsgaSsrKVxuICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG5cbiAgICBsaXN0ZW5lcnMgPSBoYW5kbGVyLnNsaWNlKCk7XG4gICAgbGVuID0gbGlzdGVuZXJzLmxlbmd0aDtcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpKyspXG4gICAgICBsaXN0ZW5lcnNbaV0uYXBwbHkodGhpcywgYXJncyk7XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gVG8gYXZvaWQgcmVjdXJzaW9uIGluIHRoZSBjYXNlIHRoYXQgdHlwZSA9PT0gXCJuZXdMaXN0ZW5lclwiISBCZWZvcmVcbiAgLy8gYWRkaW5nIGl0IHRvIHRoZSBsaXN0ZW5lcnMsIGZpcnN0IGVtaXQgXCJuZXdMaXN0ZW5lclwiLlxuICBpZiAodGhpcy5fZXZlbnRzLm5ld0xpc3RlbmVyKVxuICAgIHRoaXMuZW1pdCgnbmV3TGlzdGVuZXInLCB0eXBlLFxuICAgICAgICAgICAgICBpc0Z1bmN0aW9uKGxpc3RlbmVyLmxpc3RlbmVyKSA/XG4gICAgICAgICAgICAgIGxpc3RlbmVyLmxpc3RlbmVyIDogbGlzdGVuZXIpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIC8vIE9wdGltaXplIHRoZSBjYXNlIG9mIG9uZSBsaXN0ZW5lci4gRG9uJ3QgbmVlZCB0aGUgZXh0cmEgYXJyYXkgb2JqZWN0LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IGxpc3RlbmVyO1xuICBlbHNlIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIC8vIElmIHdlJ3ZlIGFscmVhZHkgZ290IGFuIGFycmF5LCBqdXN0IGFwcGVuZC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0ucHVzaChsaXN0ZW5lcik7XG4gIGVsc2VcbiAgICAvLyBBZGRpbmcgdGhlIHNlY29uZCBlbGVtZW50LCBuZWVkIHRvIGNoYW5nZSB0byBhcnJheS5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBbdGhpcy5fZXZlbnRzW3R5cGVdLCBsaXN0ZW5lcl07XG5cbiAgLy8gQ2hlY2sgZm9yIGxpc3RlbmVyIGxlYWtcbiAgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkgJiYgIXRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQpIHtcbiAgICB2YXIgbTtcbiAgICBpZiAoIWlzVW5kZWZpbmVkKHRoaXMuX21heExpc3RlbmVycykpIHtcbiAgICAgIG0gPSB0aGlzLl9tYXhMaXN0ZW5lcnM7XG4gICAgfSBlbHNlIHtcbiAgICAgIG0gPSBFdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycztcbiAgICB9XG5cbiAgICBpZiAobSAmJiBtID4gMCAmJiB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoID4gbSkge1xuICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCA9IHRydWU7XG4gICAgICBjb25zb2xlLmVycm9yKCcobm9kZSkgd2FybmluZzogcG9zc2libGUgRXZlbnRFbWl0dGVyIG1lbW9yeSAnICtcbiAgICAgICAgICAgICAgICAgICAgJ2xlYWsgZGV0ZWN0ZWQuICVkIGxpc3RlbmVycyBhZGRlZC4gJyArXG4gICAgICAgICAgICAgICAgICAgICdVc2UgZW1pdHRlci5zZXRNYXhMaXN0ZW5lcnMoKSB0byBpbmNyZWFzZSBsaW1pdC4nLFxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoKTtcbiAgICAgIGlmICh0eXBlb2YgY29uc29sZS50cmFjZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAvLyBub3Qgc3VwcG9ydGVkIGluIElFIDEwXG4gICAgICAgIGNvbnNvbGUudHJhY2UoKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub24gPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uY2UgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgdmFyIGZpcmVkID0gZmFsc2U7XG5cbiAgZnVuY3Rpb24gZygpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGcpO1xuXG4gICAgaWYgKCFmaXJlZCkge1xuICAgICAgZmlyZWQgPSB0cnVlO1xuICAgICAgbGlzdGVuZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gIH1cblxuICBnLmxpc3RlbmVyID0gbGlzdGVuZXI7XG4gIHRoaXMub24odHlwZSwgZyk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vLyBlbWl0cyBhICdyZW1vdmVMaXN0ZW5lcicgZXZlbnQgaWZmIHRoZSBsaXN0ZW5lciB3YXMgcmVtb3ZlZFxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBsaXN0LCBwb3NpdGlvbiwgbGVuZ3RoLCBpO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIGxpc3QgPSB0aGlzLl9ldmVudHNbdHlwZV07XG4gIGxlbmd0aCA9IGxpc3QubGVuZ3RoO1xuICBwb3NpdGlvbiA9IC0xO1xuXG4gIGlmIChsaXN0ID09PSBsaXN0ZW5lciB8fFxuICAgICAgKGlzRnVuY3Rpb24obGlzdC5saXN0ZW5lcikgJiYgbGlzdC5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcblxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGxpc3QpKSB7XG4gICAgZm9yIChpID0gbGVuZ3RoOyBpLS0gPiAwOykge1xuICAgICAgaWYgKGxpc3RbaV0gPT09IGxpc3RlbmVyIHx8XG4gICAgICAgICAgKGxpc3RbaV0ubGlzdGVuZXIgJiYgbGlzdFtpXS5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgICAgIHBvc2l0aW9uID0gaTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHBvc2l0aW9uIDwgMClcbiAgICAgIHJldHVybiB0aGlzO1xuXG4gICAgaWYgKGxpc3QubGVuZ3RoID09PSAxKSB7XG4gICAgICBsaXN0Lmxlbmd0aCA9IDA7XG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIH0gZWxzZSB7XG4gICAgICBsaXN0LnNwbGljZShwb3NpdGlvbiwgMSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIga2V5LCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgLy8gbm90IGxpc3RlbmluZyBmb3IgcmVtb3ZlTGlzdGVuZXIsIG5vIG5lZWQgdG8gZW1pdFxuICBpZiAoIXRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcikge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKVxuICAgICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgZWxzZSBpZiAodGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIGVtaXQgcmVtb3ZlTGlzdGVuZXIgZm9yIGFsbCBsaXN0ZW5lcnMgb24gYWxsIGV2ZW50c1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgIGZvciAoa2V5IGluIHRoaXMuX2V2ZW50cykge1xuICAgICAgaWYgKGtleSA9PT0gJ3JlbW92ZUxpc3RlbmVyJykgY29udGludWU7XG4gICAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycyhrZXkpO1xuICAgIH1cbiAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycygncmVtb3ZlTGlzdGVuZXInKTtcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGxpc3RlbmVycyA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNGdW5jdGlvbihsaXN0ZW5lcnMpKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnMpO1xuICB9IGVsc2Uge1xuICAgIC8vIExJRk8gb3JkZXJcbiAgICB3aGlsZSAobGlzdGVuZXJzLmxlbmd0aClcbiAgICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzW2xpc3RlbmVycy5sZW5ndGggLSAxXSk7XG4gIH1cbiAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IFtdO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gW3RoaXMuX2V2ZW50c1t0eXBlXV07XG4gIGVsc2VcbiAgICByZXQgPSB0aGlzLl9ldmVudHNbdHlwZV0uc2xpY2UoKTtcbiAgcmV0dXJuIHJldDtcbn07XG5cbkV2ZW50RW1pdHRlci5saXN0ZW5lckNvdW50ID0gZnVuY3Rpb24oZW1pdHRlciwgdHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIWVtaXR0ZXIuX2V2ZW50cyB8fCAhZW1pdHRlci5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IDA7XG4gIGVsc2UgaWYgKGlzRnVuY3Rpb24oZW1pdHRlci5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSAxO1xuICBlbHNlXG4gICAgcmV0ID0gZW1pdHRlci5fZXZlbnRzW3R5cGVdLmxlbmd0aDtcbiAgcmV0dXJuIHJldDtcbn07XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnZnVuY3Rpb24nO1xufVxuXG5mdW5jdGlvbiBpc051bWJlcihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdudW1iZXInO1xufVxuXG5mdW5jdGlvbiBpc09iamVjdChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnICYmIGFyZyAhPT0gbnVsbDtcbn1cblxuZnVuY3Rpb24gaXNVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IHZvaWQgMDtcbn1cbiIsInZhciBoYXNPd24gPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5O1xudmFyIHRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcbnZhciB1bmRlZmluZWQ7XG5cbnZhciBpc1BsYWluT2JqZWN0ID0gZnVuY3Rpb24gaXNQbGFpbk9iamVjdChvYmopIHtcblx0J3VzZSBzdHJpY3QnO1xuXHRpZiAoIW9iaiB8fCB0b1N0cmluZy5jYWxsKG9iaikgIT09ICdbb2JqZWN0IE9iamVjdF0nKSB7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cblx0dmFyIGhhc19vd25fY29uc3RydWN0b3IgPSBoYXNPd24uY2FsbChvYmosICdjb25zdHJ1Y3RvcicpO1xuXHR2YXIgaGFzX2lzX3Byb3BlcnR5X29mX21ldGhvZCA9IG9iai5jb25zdHJ1Y3RvciAmJiBvYmouY29uc3RydWN0b3IucHJvdG90eXBlICYmIGhhc093bi5jYWxsKG9iai5jb25zdHJ1Y3Rvci5wcm90b3R5cGUsICdpc1Byb3RvdHlwZU9mJyk7XG5cdC8vIE5vdCBvd24gY29uc3RydWN0b3IgcHJvcGVydHkgbXVzdCBiZSBPYmplY3Rcblx0aWYgKG9iai5jb25zdHJ1Y3RvciAmJiAhaGFzX293bl9jb25zdHJ1Y3RvciAmJiAhaGFzX2lzX3Byb3BlcnR5X29mX21ldGhvZCkge1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXG5cdC8vIE93biBwcm9wZXJ0aWVzIGFyZSBlbnVtZXJhdGVkIGZpcnN0bHksIHNvIHRvIHNwZWVkIHVwLFxuXHQvLyBpZiBsYXN0IG9uZSBpcyBvd24sIHRoZW4gYWxsIHByb3BlcnRpZXMgYXJlIG93bi5cblx0dmFyIGtleTtcblx0Zm9yIChrZXkgaW4gb2JqKSB7fVxuXG5cdHJldHVybiBrZXkgPT09IHVuZGVmaW5lZCB8fCBoYXNPd24uY2FsbChvYmosIGtleSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGV4dGVuZCgpIHtcblx0J3VzZSBzdHJpY3QnO1xuXHR2YXIgb3B0aW9ucywgbmFtZSwgc3JjLCBjb3B5LCBjb3B5SXNBcnJheSwgY2xvbmUsXG5cdFx0dGFyZ2V0ID0gYXJndW1lbnRzWzBdLFxuXHRcdGkgPSAxLFxuXHRcdGxlbmd0aCA9IGFyZ3VtZW50cy5sZW5ndGgsXG5cdFx0ZGVlcCA9IGZhbHNlO1xuXG5cdC8vIEhhbmRsZSBhIGRlZXAgY29weSBzaXR1YXRpb25cblx0aWYgKHR5cGVvZiB0YXJnZXQgPT09ICdib29sZWFuJykge1xuXHRcdGRlZXAgPSB0YXJnZXQ7XG5cdFx0dGFyZ2V0ID0gYXJndW1lbnRzWzFdIHx8IHt9O1xuXHRcdC8vIHNraXAgdGhlIGJvb2xlYW4gYW5kIHRoZSB0YXJnZXRcblx0XHRpID0gMjtcblx0fSBlbHNlIGlmICgodHlwZW9mIHRhcmdldCAhPT0gJ29iamVjdCcgJiYgdHlwZW9mIHRhcmdldCAhPT0gJ2Z1bmN0aW9uJykgfHwgdGFyZ2V0ID09IG51bGwpIHtcblx0XHR0YXJnZXQgPSB7fTtcblx0fVxuXG5cdGZvciAoOyBpIDwgbGVuZ3RoOyArK2kpIHtcblx0XHRvcHRpb25zID0gYXJndW1lbnRzW2ldO1xuXHRcdC8vIE9ubHkgZGVhbCB3aXRoIG5vbi1udWxsL3VuZGVmaW5lZCB2YWx1ZXNcblx0XHRpZiAob3B0aW9ucyAhPSBudWxsKSB7XG5cdFx0XHQvLyBFeHRlbmQgdGhlIGJhc2Ugb2JqZWN0XG5cdFx0XHRmb3IgKG5hbWUgaW4gb3B0aW9ucykge1xuXHRcdFx0XHRzcmMgPSB0YXJnZXRbbmFtZV07XG5cdFx0XHRcdGNvcHkgPSBvcHRpb25zW25hbWVdO1xuXG5cdFx0XHRcdC8vIFByZXZlbnQgbmV2ZXItZW5kaW5nIGxvb3Bcblx0XHRcdFx0aWYgKHRhcmdldCA9PT0gY29weSkge1xuXHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gUmVjdXJzZSBpZiB3ZSdyZSBtZXJnaW5nIHBsYWluIG9iamVjdHMgb3IgYXJyYXlzXG5cdFx0XHRcdGlmIChkZWVwICYmIGNvcHkgJiYgKGlzUGxhaW5PYmplY3QoY29weSkgfHwgKGNvcHlJc0FycmF5ID0gQXJyYXkuaXNBcnJheShjb3B5KSkpKSB7XG5cdFx0XHRcdFx0aWYgKGNvcHlJc0FycmF5KSB7XG5cdFx0XHRcdFx0XHRjb3B5SXNBcnJheSA9IGZhbHNlO1xuXHRcdFx0XHRcdFx0Y2xvbmUgPSBzcmMgJiYgQXJyYXkuaXNBcnJheShzcmMpID8gc3JjIDogW107XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdGNsb25lID0gc3JjICYmIGlzUGxhaW5PYmplY3Qoc3JjKSA/IHNyYyA6IHt9O1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdC8vIE5ldmVyIG1vdmUgb3JpZ2luYWwgb2JqZWN0cywgY2xvbmUgdGhlbVxuXHRcdFx0XHRcdHRhcmdldFtuYW1lXSA9IGV4dGVuZChkZWVwLCBjbG9uZSwgY29weSk7XG5cblx0XHRcdFx0Ly8gRG9uJ3QgYnJpbmcgaW4gdW5kZWZpbmVkIHZhbHVlc1xuXHRcdFx0XHR9IGVsc2UgaWYgKGNvcHkgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRcdHRhcmdldFtuYW1lXSA9IGNvcHk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHQvLyBSZXR1cm4gdGhlIG1vZGlmaWVkIG9iamVjdFxuXHRyZXR1cm4gdGFyZ2V0O1xufTtcblxuIiwiaWYgKHR5cGVvZiBPYmplY3QuY3JlYXRlID09PSAnZnVuY3Rpb24nKSB7XG4gIC8vIGltcGxlbWVudGF0aW9uIGZyb20gc3RhbmRhcmQgbm9kZS5qcyAndXRpbCcgbW9kdWxlXG4gIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaW5oZXJpdHMoY3Rvciwgc3VwZXJDdG9yKSB7XG4gICAgY3Rvci5zdXBlcl8gPSBzdXBlckN0b3JcbiAgICBjdG9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoc3VwZXJDdG9yLnByb3RvdHlwZSwge1xuICAgICAgY29uc3RydWN0b3I6IHtcbiAgICAgICAgdmFsdWU6IGN0b3IsXG4gICAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgICB9XG4gICAgfSk7XG4gIH07XG59IGVsc2Uge1xuICAvLyBvbGQgc2Nob29sIHNoaW0gZm9yIG9sZCBicm93c2Vyc1xuICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGluaGVyaXRzKGN0b3IsIHN1cGVyQ3Rvcikge1xuICAgIGN0b3Iuc3VwZXJfID0gc3VwZXJDdG9yXG4gICAgdmFyIFRlbXBDdG9yID0gZnVuY3Rpb24gKCkge31cbiAgICBUZW1wQ3Rvci5wcm90b3R5cGUgPSBzdXBlckN0b3IucHJvdG90eXBlXG4gICAgY3Rvci5wcm90b3R5cGUgPSBuZXcgVGVtcEN0b3IoKVxuICAgIGN0b3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gY3RvclxuICB9XG59XG4iLCIvLyBhY3Rvci5qc1xyXG4vLyBEZWZpbmVzIHRoZSBhY3RvciBldmVudCB1c2VkIHRocm91Z2hvdXQgdGhlIHBhcmtcclxuXHJcbnZhciBFdmVudCA9IHJlcXVpcmUoXCJ0cHAtZXZlbnRcIik7XHJcbnZhciBpbmhlcml0cyA9IHJlcXVpcmUoXCJpbmhlcml0c1wiKTtcclxudmFyIGV4dGVuZCA9IHJlcXVpcmUoXCJleHRlbmRcIik7XHJcblxyXG52YXIgR0xPQkFMX1NDQUxFVVAgPSAxLjY1O1xyXG52YXIgRVZFTlRfUExBTkVfTk9STUFMID0gbmV3IFRIUkVFLlZlY3RvcjMoMCwgMSwgMCk7XHJcbi8qKlxyXG4gKiBBbiBhY3RvciBpcyBhbnkgZXZlbnQgcmVwcmVzZW50aW5nIGEgcGVyc29uLCBwb2tlbW9uLCBvciBvdGhlciBlbnRpdHkgdGhhdFxyXG4gKiBtYXkgbW92ZSBhcm91bmQgaW4gdGhlIHdvcmxkIG9yIGZhY2UgYSBkaXJlY3Rpb24uIEFjdG9ycyBtYXkgaGF2ZSBkaWZmZXJlbnRcclxuICogYmVoYXZpb3JzLCBzb21lIGNvbW1vbiBvbmVzIHByZWRlZmluZWQgaW4gdGhpcyBmaWxlLlxyXG4gKi9cclxuZnVuY3Rpb24gQWN0b3IoYmFzZSwgb3B0cykge1xyXG5cdEV2ZW50LmNhbGwodGhpcywgYmFzZSwgb3B0cyk7XHJcblx0XHJcblx0dGhpcy5vbihcInRpY2tcIiwgdGhpcy5fYWN0b3JUaWNrKTtcclxuXHR0aGlzLm9uKFwiaW50ZXJhY3RlZFwiLCB0aGlzLl9hY3RvckludGVyYWN0RmFjZSk7XHJcblx0dGhpcy5mYWNpbmcgPSBuZXcgVEhSRUUuVmVjdG9yMygwLCAwLCAxKTtcclxufVxyXG5pbmhlcml0cyhBY3RvciwgRXZlbnQpO1xyXG5leHRlbmQoQWN0b3IucHJvdG90eXBlLCB7XHJcblx0c3ByaXRlOiBudWxsLFxyXG5cdHNwcml0ZV9mb3JtYXQ6IG51bGwsXHJcblx0XHJcblx0c2hhZG93IDogdHJ1ZSxcclxuXHRcclxuXHQvLy8vLy8vLy8vLy8vLy8vIFByb3BlcnR5IFNldHRlcnMgLy8vLy8vLy8vLy8vLy8vLy9cclxuXHRzY2FsZTogMSxcclxuXHRcclxuXHRzZXRTY2FsZSA6IGZ1bmN0aW9uKHNjYWxlKSB7XHJcblx0XHR0aGlzLnNjYWxlID0gc2NhbGU7XHJcblx0XHRzY2FsZSAqPSBHTE9CQUxfU0NBTEVVUDtcclxuXHRcdHRoaXMuYXZhdGFyX3Nwcml0ZS5zY2FsZS5zZXQoc2NhbGUsIHNjYWxlLCBzY2FsZSk7XHJcblx0fSxcclxuXHRcclxuXHQvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLyBBdmF0YXIgLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cdGF2YXRhcl9ub2RlIDogbnVsbCxcclxuXHRhdmF0YXJfc3ByaXRlIDogbnVsbCxcclxuXHRhdmF0YXJfZm9ybWF0IDogbnVsbCxcclxuXHRhdmF0YXJfdGV4IDogbnVsbCxcclxuXHRcclxuXHRnZXRBdmF0YXIgOiBmdW5jdGlvbihtYXApeyBcclxuXHRcdGlmICh0aGlzLmF2YXRhcl9ub2RlKSByZXR1cm4gdGhpcy5hdmF0YXJfbm9kZTtcclxuXHRcdFxyXG5cdFx0dmFyIG5vZGUgPSB0aGlzLmF2YXRhcl9ub2RlID0gbmV3IFRIUkVFLk9iamVjdDNEKCk7XHJcblx0XHRcclxuXHRcdG5vZGUuYWRkKHRoaXMuX2F2YXRhcl9jcmVhdGVTcHJpdGUobWFwKSk7XHJcblx0XHRub2RlLmFkZCh0aGlzLl9hdmF0YXJfY3JlYXRlU2hhZG93Q2FzdGVyKCkpO1xyXG5cdFx0XHJcblx0XHRyZXR1cm4gbm9kZTtcclxuXHRcdFxyXG5cdH0sXHJcblx0XHJcblx0X2F2YXRhcl9jcmVhdGVTaGFkb3dDYXN0ZXI6IGZ1bmN0aW9uKCkge1xyXG5cdFx0dmFyIG1hdCA9IG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCgpO1xyXG5cdFx0bWF0LnZpc2libGUgPSBmYWxzZTsgLy9UaGUgb2JqZWN0IHdvbid0IHJlbmRlciwgYnV0IHRoZSBzaGFkb3cgc3RpbGwgd2lsbFxyXG5cdFx0XHJcblx0XHR2YXIgZ2VvbSA9IG5ldyBUSFJFRS5TcGhlcmVHZW9tZXRyeSgwLjMsIDcsIDMpO1xyXG5cdFx0XHJcblx0XHR2YXIgbWVzaCA9IG5ldyBUSFJFRS5NZXNoKGdlb20sIG1hdCk7XHJcblx0XHQvL21lc2gudmlzaWJsZSA9IGZhbHNlOyAvLz9cclxuXHRcdG1lc2guY2FzdFNoYWRvdyA9IHRydWU7XHJcblx0XHRtZXNoLnBvc2l0aW9uLnNldCgwLCAwLjUsIDApO1xyXG5cdFx0cmV0dXJuIG1lc2g7XHJcblx0fSxcclxuXHRcclxuXHRfYXZhdGFyX2NyZWF0ZVNwcml0ZSA6IGZ1bmN0aW9uKG1hcCkge1xyXG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xyXG5cdFx0dmFyIGltZyA9IG5ldyBJbWFnZSgpO1xyXG5cdFx0dmFyIHRleHR1cmUgPSBzZWxmLmF2YXRhcl90ZXggPSBuZXcgVEhSRUUuVGV4dHVyZShpbWcpO1xyXG5cdFx0XHJcblx0XHR0aGlzLl9fb25Mb2FkU3ByaXRlKGltZywgREVGX1NQUklURV9GT1JNQVQsIHRleHR1cmUpO1xyXG5cdFx0aW1nLnNyYyA9IERFRl9TUFJJVEU7XHJcblx0XHRcclxuXHRcdHRleHR1cmUubWFnRmlsdGVyID0gVEhSRUUuTmVhcmVzdEZpbHRlcjtcclxuXHRcdHRleHR1cmUubWluRmlsdGVyID0gVEhSRUUuTmVhcmVzdEZpbHRlcjtcclxuXHRcdHRleHR1cmUucmVwZWF0ID0gbmV3IFRIUkVFLlZlY3RvcjIoMC4yNSwgMC4yNSk7XHJcblx0XHR0ZXh0dXJlLm9mZnNldCA9IG5ldyBUSFJFRS5WZWN0b3IyKDAsIDApO1xyXG5cdFx0dGV4dHVyZS53cmFwUyA9IFRIUkVFLk1pcnJvcmVkUmVwZWF0V3JhcHBpbmc7XHJcblx0XHR0ZXh0dXJlLndyYXBUID0gVEhSRUUuTWlycm9yZWRSZXBlYXRXcmFwcGluZztcclxuXHRcdHRleHR1cmUuZ2VuZXJhdGVNaXBtYXBzID0gZmFsc2U7XHJcblx0XHQvL1RPRE8gTWlycm9yZWRSZXBlYXRXcmFwcGluZywgYW5kIGp1c3QgdXNlIGEgbmVnYXRpdmUgeCB1diB2YWx1ZSwgdG8gZmxpcCBhIHNwcml0ZVxyXG5cdFx0XHJcblx0XHRzZWxmLmF2YXRhcl9mb3JtYXQgPSBnZXRTcHJpdGVGb3JtYXQoREVGX1NQUklURV9GT1JNQVQpO1xyXG5cdFx0XHJcblx0XHR2YXIgbWF0IC8qPSBzZWxmLmF2YXRhcl9tYXQqLyA9IG5ldyBUSFJFRS5TcHJpdGVNYXRlcmlhbCh7XHJcblx0XHRcdG1hcDogdGV4dHVyZSxcclxuXHRcdFx0Y29sb3I6IDB4RkZGRkZGLFxyXG5cdFx0XHR0cmFuc3BhcmVudDogdHJ1ZSxcclxuXHRcdH0pO1xyXG5cdFx0XHJcblx0XHRjdXJyZW50TWFwLm1hcmtMb2FkaW5nKCk7XHJcblx0XHR0aGlzLl9hdmF0YXJfbG9hZFNwcml0ZShtYXAsIHRleHR1cmUpO1xyXG5cdFx0XHJcblx0XHR2YXIgc3ByaXRlID0gc2VsZi5hdmF0YXJfc3ByaXRlID0gbmV3IFRIUkVFLlNwcml0ZShtYXQpO1xyXG5cdFx0c2VsZi5zZXRTY2FsZShzZWxmLnNjYWxlKTtcclxuXHRcdFxyXG5cdFx0cmV0dXJuIHNwcml0ZTtcclxuXHR9LFxyXG5cdFxyXG5cdF9hdmF0YXJfbG9hZFNwcml0ZSA6IGZ1bmN0aW9uKG1hcCwgdGV4dHVyZSkge1xyXG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xyXG5cdFx0bWFwLmxvYWRTcHJpdGUoc2VsZi5pZCwgc2VsZi5zcHJpdGUsIGZ1bmN0aW9uKGVyciwgdXJsKXtcclxuXHRcdFx0aWYgKGVycikge1xyXG5cdFx0XHRcdGNvbnNvbGUuZXJyb3IoXCJFUlJPUiBMT0FESU5HIFNQUklURTogXCIsIGVycik7XHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHR2YXIgaW1nID0gbmV3IEltYWdlKCk7XHJcblx0XHRcdHNlbGYuX19vbkxvYWRTcHJpdGUoaW1nLCBzZWxmLnNwcml0ZV9mb3JtYXQsIHRleHR1cmUpO1xyXG5cdFx0XHRpbWcuc3JjID0gdXJsO1xyXG5cdFx0fSk7XHJcblx0fSxcclxuXHRcclxuXHRfX29uTG9hZFNwcml0ZSA6IGZ1bmN0aW9uKGltZywgZm9ybWF0LCB0ZXh0dXJlKSB7XHJcblx0XHR2YXIgc2VsZiA9IHRoaXM7XHJcblx0XHR2YXIgZiA9IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHR0ZXh0dXJlLmltYWdlID0gaW1nO1xyXG5cdFx0XHRcclxuXHRcdFx0c2VsZi5hdmF0YXJfZm9ybWF0ID0gZ2V0U3ByaXRlRm9ybWF0KGZvcm1hdCk7XHJcblx0XHRcdHRleHR1cmUucmVwZWF0LnNldChzZWxmLmF2YXRhcl9mb3JtYXQucmVwZWF0LCBzZWxmLmF2YXRhcl9mb3JtYXQucmVwZWF0KTtcclxuXHJcblx0XHRcdHRleHR1cmUubmVlZHNVcGRhdGUgPSB0cnVlO1xyXG5cdFx0XHRcclxuXHRcdFx0c2VsZi5zaG93QW5pbWF0aW9uRnJhbWUoXCJkMFwiKTtcclxuXHRcdFx0c2VsZi5wbGF5QW5pbWF0aW9uKFwic3RhbmRcIik7XHJcblx0XHRcdGltZy5yZW1vdmVFdmVudExpc3RlbmVyKFwibG9hZFwiLCBmKTtcclxuXHRcdFx0Y3VycmVudE1hcC5tYXJrTG9hZEZpbmlzaGVkKCk7XHJcblx0XHR9XHJcblx0XHRpbWcub24oXCJsb2FkXCIsIGYpO1xyXG5cdH0sXHJcblx0XHJcblx0Ly8vLy8vLy8vLy8vLy8vLy8vLyBBbmltYXRpb24gLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cdF9hbmltYXRpb25TdGF0ZSA6IG51bGwsXHJcblx0ZmFjaW5nIDogbnVsbCxcclxuXHRcclxuXHRfaW5pdEFuaW1hdGlvblN0YXRlIDogZnVuY3Rpb24oKSB7XHJcblx0XHRpZiAoIXRoaXMuX2FuaW1hdGlvblN0YXRlKVxyXG5cdFx0XHR0aGlzLl9hbmltYXRpb25TdGF0ZSA9IHtcclxuXHRcdFx0XHRjdXJyQW5pbSA6IG51bGwsIC8vIEFuaW1hdGlvbiBvYmplY3RcclxuXHRcdFx0XHRjdXJyRnJhbWUgOiBudWxsLCAvLyBDdXJyZW50bHkgZGlzcGxheWVkIHNwcml0ZSBmcmFtZSBuYW1lXHJcblx0XHRcdFx0bmV4dEFuaW0gOiBudWxsLCAvLyBBbmltYXRpb24gb2JqZWN0IGluIHF1ZXVlXHJcblx0XHRcdFx0XHJcblx0XHRcdFx0c3RvcE5leHRUcmFuc2l0aW9uOiBmYWxzZSwgLy9TdG9wIGF0IHRoZSBuZXh0IHRyYW5zaXRpb24gZnJhbWUsIHRvIHNob3J0LXN0b3AgdGhlIFwiQnVtcFwiIGFuaW1hdGlvblxyXG5cdFx0XHR9O1xyXG5cdFx0cmV0dXJuIHRoaXMuX2FuaW1hdGlvblN0YXRlO1xyXG5cdH0sXHJcblx0XHJcblx0Z2V0RGlyZWN0aW9uRmFjaW5nIDogZnVuY3Rpb24oKSB7XHJcblx0XHR2YXIgZGlydmVjdG9yID0gdGhpcy5mYWNpbmcuY2xvbmUoKTtcclxuXHRcdGRpcnZlY3Rvci5hcHBseVF1YXRlcm5pb24oIGN1cnJlbnRNYXAuY2FtZXJhLnF1YXRlcm5pb24gKTtcclxuXHRcdGRpcnZlY3Rvci5wcm9qZWN0T25QbGFuZShFVkVOVF9QTEFORV9OT1JNQUwpLm5vcm1hbGl6ZSgpO1xyXG5cdFx0XHJcblx0XHR2YXIgeCA9IGRpcnZlY3Rvci54LCB5ID0gZGlydmVjdG9yLno7XHJcblx0XHQvLyBjb25zb2xlLmxvZyhcIkRJUkZBQ0lORzpcIiwgeCwgeSk7XHJcblx0XHRpZiAoTWF0aC5hYnMoeCkgPiBNYXRoLmFicyh5KSkgeyAvL0RpcmVjdGlvbiB2ZWN0b3IgaXMgcG9pbnRpbmcgYWxvbmcgeCBheGlzXHJcblx0XHRcdGlmICh4ID4gMCkgcmV0dXJuIFwibFwiO1xyXG5cdFx0XHRlbHNlIHJldHVybiBcInJcIjtcclxuXHRcdH0gZWxzZSB7IC8vRGlyZWN0aW9uIHZlY3RvciBpcyBwb2ludGluZyBhbG9uZyB5IGF4aXNcclxuXHRcdFx0aWYgKHkgPiAwKSByZXR1cm4gXCJkXCI7XHJcblx0XHRcdGVsc2UgcmV0dXJuIFwidVwiO1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIFwiZFwiO1xyXG5cdH0sXHJcblx0XHJcblx0c2hvd0FuaW1hdGlvbkZyYW1lIDogZnVuY3Rpb24oZnJhbWUpIHtcclxuXHRcdHZhciBzdGF0ZSA9IHRoaXMuX2luaXRBbmltYXRpb25TdGF0ZSgpO1xyXG5cdFx0XHJcblx0XHR2YXIgZGVmID0gdGhpcy5hdmF0YXJfZm9ybWF0LmZyYW1lc1tmcmFtZV07XHJcblx0XHRpZiAoIWRlZikge1xyXG5cdFx0XHRjb25zb2xlLndhcm4oXCJFUlJPUiBcIiwgdGhpcy5pZCwgXCI6IEFuaW1hdGlvbiBmcmFtZSBkb2Vzbid0IGV4aXN0OlwiLCBmcmFtZSk7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHRcdHN0YXRlLmZyYW1lTmFtZSA9IGZyYW1lO1xyXG5cdFx0XHJcblx0XHR2YXIgZmxpcCA9IGZhbHNlO1xyXG5cdFx0aWYgKHR5cGVvZiBkZWYgPT0gXCJzdHJpbmdcIikgeyAvL3JlZGlyZWN0XHJcblx0XHRcdGRlZiA9IHRoaXMuYXZhdGFyX2Zvcm1hdC5mcmFtZXNbZGVmXTtcclxuXHRcdFx0ZmxpcCA9IHRydWU7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdHZhciB1ID0gZGVmWzBdICogdGhpcy5hdmF0YXJfZm9ybWF0LnJlcGVhdDtcclxuXHRcdHZhciB2ID0gMSAtICgoZGVmWzFdKzEpICogdGhpcy5hdmF0YXJfZm9ybWF0LnJlcGVhdCk7XHJcblx0XHQvL0ZvciBzb21lIHJlYXNvbiwgb2Zmc2V0cyBhcmUgZnJvbSB0aGUgQk9UVE9NIGxlZnQ/IVxyXG5cdFx0XHJcblx0XHRpZiAoZmxpcCAmJiB0aGlzLmF2YXRhcl9mb3JtYXQuZmxpcCkge1xyXG5cdFx0XHR1ID0gMCAtIChkZWZbMF0tMSkgKiB0aGlzLmF2YXRhcl9mb3JtYXQucmVwZWF0OyAvL1RPRE8gdGVzdFxyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHR0aGlzLmF2YXRhcl90ZXgub2Zmc2V0LnNldCh1LCB2KTsgXHJcblx0XHR0aGlzLmF2YXRhcl90ZXgubmVlZHNVcGRhdGUgPSB0cnVlO1xyXG5cdH0sXHJcblx0XHJcblx0cGxheUFuaW1hdGlvbiA6IGZ1bmN0aW9uKGFuaW1OYW1lLCBvcHRzKSB7XHJcblx0XHR2YXIgc3RhdGUgPSB0aGlzLl9pbml0QW5pbWF0aW9uU3RhdGUoKTtcclxuXHRcdGlmICghb3B0cykgb3B0cyA9IHt9O1xyXG5cdFx0XHJcblx0XHR2YXIgYW5pbSA9IHRoaXMuYXZhdGFyX2Zvcm1hdC5hbmltc1thbmltTmFtZV07XHJcblx0XHRpZiAoIWFuaW0pIHtcclxuXHRcdFx0Y29uc29sZS53YXJuKFwiRVJST1JcIiwgdGhpcy5pZCwgXCI6IEFuaW1hdGlvbiBuYW1lIGRvZXNuJ3QgZXhpc3Q6XCIsIGFuaW1OYW1lKTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cdFx0c3RhdGUubmV4dEFuaW0gPSBhbmltO1xyXG5cdFx0YW5pbS5zcGVlZCA9IChvcHRzLnNwZWVkID09IHVuZGVmaW5lZCk/IDEgOiBvcHRzLnNwZWVkO1xyXG5cdFx0c3RhdGUuc3RvcE5leHRUcmFuc2l0aW9uID0gb3B0cy5zdG9wTmV4dFRyYW5zaXRpb24gfHwgZmFsc2U7XHJcblx0fSxcclxuXHRcclxuXHRzdG9wQW5pbWF0aW9uIDogZnVuY3Rpb24oKSB7XHJcblx0XHR2YXIgc3RhdGUgPSB0aGlzLl9pbml0QW5pbWF0aW9uU3RhdGUoKTtcclxuXHRcdFxyXG5cdFx0Ly8gc3RhdGUucnVubmluZyA9IGZhbHNlO1xyXG5cdFx0Ly8gc3RhdGUucXVldWUgPSBudWxsO1xyXG5cdFx0Ly8gc3RhdGUuc3RvcEZyYW1lID0gbnVsbDtcclxuXHRcdHRoaXMuZW1pdChcImFuaW0tZW5kXCIsIHN0YXRlLmFuaW1OYW1lKTtcclxuXHR9LFxyXG5cdFxyXG5cdF90aWNrX2RvQW5pbWF0aW9uOiBmdW5jdGlvbihkZWx0YSkge1xyXG5cdFx0dmFyIHN0YXRlID0gdGhpcy5fYW5pbWF0aW9uU3RhdGU7XHJcblx0XHR2YXIgQ0EgPSBzdGF0ZS5jdXJyQW5pbTtcclxuXHRcdGlmICghQ0EpIENBID0gc3RhdGUuY3VyckFuaW0gPSBzdGF0ZS5uZXh0QW5pbTtcclxuXHRcdGlmICghQ0EpIHJldHVybjtcclxuXHRcdFxyXG5cdFx0Q0EuYWR2YW5jZShkZWx0YSk7XHJcblx0XHRcclxuXHRcdGlmIChzdGF0ZS5uZXh0QW5pbSAmJiBDQS5jYW5UcmFuc2l0aW9uKCkpIHtcclxuXHRcdFx0Ly9Td2l0Y2ggYW5pbWF0aW9uc1xyXG5cdFx0XHRDQS5yZXNldCgpO1xyXG5cdFx0XHRDQSA9IHN0YXRlLmN1cnJBbmltID0gc3RhdGUubmV4dEFuaW07XHJcblx0XHRcdHN0YXRlLm5leHRBbmltID0gbnVsbDtcclxuXHRcdFx0XHJcblx0XHRcdGlmIChzdGF0ZS5zdG9wTmV4dFRyYW5zaXRpb24pIHtcclxuXHRcdFx0XHR0aGlzLnBsYXlBbmltYXRpb24oXCJzdGFuZFwiKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHR2YXIgZGlyID0gdGhpcy5nZXREaXJlY3Rpb25GYWNpbmcoKTtcclxuXHRcdHZhciBmcmFtZSA9IENBLmdldEZyYW1lVG9EaXNwbGF5KGRpcik7XHJcblx0XHRpZiAoZnJhbWUgIT0gc3RhdGUuY3VyckZyYW1lKSB7XHJcblx0XHRcdHRoaXMuc2hvd0FuaW1hdGlvbkZyYW1lKGZyYW1lKTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdH0sXHJcblx0XHJcblx0Ly8vLy8vLy8vLy8vLy8vLy8vLyBNb3ZlbWVudCBhbmQgUGF0aGluZyAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblx0X3BhdGhpbmdTdGF0ZSA6IG51bGwsXHJcblx0XHJcblx0X2luaXRQYXRoaW5nU3RhdGUgOiBmdW5jdGlvbigpIHtcclxuXHRcdGlmICghdGhpcy5fcGF0aGluZ1N0YXRlKVxyXG5cdFx0XHR0aGlzLl9wYXRoaW5nU3RhdGUgPSB7XHJcblx0XHRcdFx0cXVldWU6IFtdLFxyXG5cdFx0XHRcdG1vdmluZzogZmFsc2UsXHJcblx0XHRcdFx0c3BlZWQ6IDEsXHJcblx0XHRcdFx0ZGVsdGE6IDAsIC8vdGhlIGRlbHRhIGZyb20gc3JjIHRvIGRlc3RcclxuXHRcdFx0XHRqdW1waW5nIDogZmFsc2UsXHJcblx0XHRcdFx0Ly8gZGlyOiBcImRcIixcclxuXHRcdFx0XHRcclxuXHRcdFx0XHRkZXN0TG9jQzogbmV3IFRIUkVFLlZlY3RvcjMoKS5zZXQodGhpcy5sb2NhdGlvbiksIC8vY29sbGlzaW9uIG1hcCBsb2NhdGlvblxyXG5cdFx0XHRcdGRlc3RMb2MzOiBuZXcgVEhSRUUuVmVjdG9yMygpLCAvL3dvcmxkIHNwYWNlIGxvY2F0aW9uXHJcblx0XHRcdFx0c3JjTG9jQzogbmV3IFRIUkVFLlZlY3RvcjMoKS5zZXQodGhpcy5sb2NhdGlvbiksXHJcblx0XHRcdFx0c3JjTG9jMzogbmV3IFRIUkVFLlZlY3RvcjMoKSxcclxuXHRcdFx0XHRtaWRwb2ludE9mZnNldDogbmV3IFRIUkVFLlZlY3RvcjMoKSxcclxuXHRcdFx0fTtcclxuXHRcdHJldHVybiB0aGlzLl9wYXRoaW5nU3RhdGU7XHJcblx0fSxcclxuXHRcclxuXHRwYXRoVG8gOiBmdW5jdGlvbih4LCB5KSB7XHJcblx0XHR2YXIgc3RhdGUgPSB0aGlzLl9pbml0UGF0aGluZ1N0YXRlKCk7XHJcblx0XHRcclxuXHRcdGNvbnNvbGUuZXJyb3IodGhpcy5pZCwgXCI6IFBhdGhpbmcgaGFzIG5vdCBiZWVuIGltcGxlbWVudGVkIHlldCFcIik7XHJcblx0fSxcclxuXHRcclxuXHRjbGVhclBhdGhpbmcgOiBmdW5jdGlvbigpIHtcclxuXHRcdHZhciBzdGF0ZSA9IHRoaXMuX2luaXRQYXRoaW5nU3RhdGUoKTtcclxuXHRcdHN0YXRlLnF1ZXVlLmxlbmd0aCA9IDA7XHJcblx0fSxcclxuXHRcclxuXHRtb3ZlRGlyIDogZnVuY3Rpb24oZGlyKSB7XHJcblx0XHR2YXIgeCA9IHRoaXMubG9jYXRpb24ueDtcclxuXHRcdHZhciB5ID0gdGhpcy5sb2NhdGlvbi55O1xyXG5cdFx0dmFyIHogPSB0aGlzLmxvY2F0aW9uLno7XHJcblx0XHRzd2l0Y2ggKGRpcikge1xyXG5cdFx0XHRjYXNlIFwiZFwiOiBjYXNlIFwiZG93blwiOlx0eSArPSAxOyBicmVhaztcclxuXHRcdFx0Y2FzZSBcInVcIjogY2FzZSBcInVwXCI6XHR5IC09IDE7IGJyZWFrO1xyXG5cdFx0XHRjYXNlIFwibFwiOiBjYXNlIFwibGVmdFwiOlx0eCAtPSAxOyBicmVhaztcclxuXHRcdFx0Y2FzZSBcInJcIjogY2FzZSBcInJpZ2h0XCI6XHR4ICs9IDE7IGJyZWFrO1xyXG5cdFx0fVxyXG5cdFx0dGhpcy5tb3ZlVG8oeCwgeSwgeik7XHJcblx0fSxcclxuXHRcclxuXHRmYWNlRGlyIDogZnVuY3Rpb24oeCwgeSkge1xyXG5cdFx0dGhpcy5mYWNpbmcuc2V0KC14LCAwLCB5KTtcclxuXHR9LFxyXG5cdFxyXG5cdG1vdmVUbyA6IGZ1bmN0aW9uKHgsIHksIGxheWVyLCBieXBhc3MpIHsgLy9ieXBhc3MgV2Fsa21hc2sgY2hlY2tcclxuXHRcdHZhciBzdGF0ZSA9IHRoaXMuX2luaXRQYXRoaW5nU3RhdGUoKTtcclxuXHRcdHZhciBzcmMgPSB0aGlzLmxvY2F0aW9uO1xyXG5cdFx0bGF5ZXIgPSAobGF5ZXIgPT0gdW5kZWZpbmVkKT8gdGhpcy5sb2NhdGlvbi56IDogbGF5ZXI7XHJcblx0XHRcclxuXHRcdHRoaXMuZmFjaW5nLnNldChzcmMueC14LCAwLCB5LXNyYy55KTtcclxuXHRcdFxyXG5cdFx0dmFyIHdhbGttYXNrID0gY3VycmVudE1hcC5jYW5XYWxrQmV0d2VlbihzcmMueCwgc3JjLnksIHgsIHkpO1xyXG5cdFx0aWYgKGJ5cGFzcyAhPT0gdW5kZWZpbmVkKSB3YWxrbWFzayA9IGJ5cGFzcztcclxuXHRcdGlmICghd2Fsa21hc2spIHtcclxuXHRcdFx0Y29uc29sZS53YXJuKHRoaXMuaWQsIFwiOiBDYW5ub3Qgd2FsayB0byBsb2NhdGlvblwiLCBcIihcIit4K1wiLFwiK3krXCIpXCIpO1xyXG5cdFx0XHRjdXJyZW50TWFwLmRpc3BhdGNoKHgsIHksIFwiYnVtcGVkXCIsIHRoaXMuZmFjaW5nKTtcclxuXHRcdFx0Ly8gdGhpcy5lbWl0KFwiYnVtcGVkXCIsIHRoaXMuZmFjaW5nKTsgLy9nZXREaXJGcm9tTG9jKHgsIHksIHNyYy54LCBzcmMueSkpO1xyXG5cdFx0XHR0aGlzLnBsYXlBbmltYXRpb24oXCJidW1wXCIsIHsgc3RvcE5leHRUcmFuc2l0aW9uOiB0cnVlIH0pO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblx0XHRpZiAoKHdhbGttYXNrICYgMHg4KSA9PSAweDgpIHtcclxuXHRcdFx0Ly8gVHJhbnNpdGlvbiBub3cgdG8gYW5vdGhlciBsYXllclxyXG5cdFx0XHR2YXIgdCA9IGN1cnJlbnRNYXAuZ2V0TGF5ZXJUcmFuc2l0aW9uKHgsIHksIHRoaXMubG9jYXRpb24ueik7XHJcblx0XHRcdGNvbnNvbGUubG9nKFwiTGF5ZXIgVHJhbnNpdGlvbjogXCIsIHQpO1xyXG5cdFx0XHR4ID0gdC54OyB5ID0gdC55OyBsYXllciA9IHQubGF5ZXI7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdHZhciBhbmltb3B0cyA9IHt9O1xyXG5cdFx0c3RhdGUubWlkcG9pbnRPZmZzZXQuc2V0KDAsIDAsIDApO1xyXG5cdFx0c3RhdGUuc3JjTG9jQy5zZXQoc3JjKTtcclxuXHRcdHN0YXRlLnNyY0xvYzMuc2V0KGN1cnJlbnRNYXAuZ2V0M0RUaWxlTG9jYXRpb24oc3JjKSk7XHJcblx0XHRzdGF0ZS5kZXN0TG9jQy5zZXQoeCwgeSwgbGF5ZXIpO1xyXG5cdFx0c3RhdGUuZGVzdExvYzMuc2V0KGN1cnJlbnRNYXAuZ2V0M0RUaWxlTG9jYXRpb24oeCwgeSwgbGF5ZXIpKTtcclxuXHRcdHN0YXRlLmRlbHRhID0gMDtcclxuXHRcdHN0YXRlLnNwZWVkID0gMTtcclxuXHRcdHN0YXRlLm1vdmluZyA9IHRydWU7XHJcblx0XHRcclxuXHRcdGlmICgod2Fsa21hc2sgJiAweDIpID09PSAweDIpIHtcclxuXHRcdFx0c3RhdGUubWlkcG9pbnRPZmZzZXQuc2V0WSgwLjYpO1xyXG5cdFx0XHRzdGF0ZS5qdW1waW5nID0gdHJ1ZTtcclxuXHRcdFx0U291bmRNYW5hZ2VyLnBsYXlTb3VuZChcIndhbGtfanVtcFwiKTtcclxuXHRcdFx0YW5pbW9wdHMuc3BlZWQgPSAxLjU7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdHRoaXMucGxheUFuaW1hdGlvbihcIndhbGtcIiwgYW5pbW9wdHMpO1xyXG5cdFx0dGhpcy5lbWl0KFwibW92aW5nXCIsIHN0YXRlLnNyY0xvY0MueCwgc3RhdGUuc3JjTG9jQy55LCBzdGF0ZS5kZXN0TG9jQy54LCBzdGF0ZS5kZXN0TG9jQy55KTtcclxuXHR9LFxyXG5cdFxyXG5cdF90aWNrX2RvTW92ZW1lbnQgOiBmdW5jdGlvbihkZWx0YSkge1xyXG5cdFx0dmFyIHN0YXRlID0gdGhpcy5faW5pdFBhdGhpbmdTdGF0ZSgpO1xyXG5cdFx0XHJcblx0XHRzdGF0ZS5kZWx0YSArPSBzdGF0ZS5zcGVlZCAqIChkZWx0YSAqIENPTkZJRy5zcGVlZC5wYXRoaW5nKTtcclxuXHRcdHZhciBhbHBoYSA9IE1hdGguY2xhbXAoc3RhdGUuZGVsdGEpO1xyXG5cdFx0dmFyIGJldGEgPSBNYXRoLnNpbihhbHBoYSAqIE1hdGguUEkpO1xyXG5cdFx0dGhpcy5hdmF0YXJfbm9kZS5wb3NpdGlvbi5zZXQoIFxyXG5cdFx0XHQvL0xlcnAgYmV0d2VlbiBzcmMgYW5kIGRlc3QgKGJ1aWx0IGluIGxlcnAoKSBpcyBkZXN0cnVjdGl2ZSwgYW5kIHNlZW1zIGJhZGx5IGRvbmUpXHJcblx0XHRcdHN0YXRlLnNyY0xvYzMueCArICgoc3RhdGUuZGVzdExvYzMueCAtIHN0YXRlLnNyY0xvYzMueCkgKiBhbHBoYSkgKyAoc3RhdGUubWlkcG9pbnRPZmZzZXQueCAqIGJldGEpLFxyXG5cdFx0XHRzdGF0ZS5zcmNMb2MzLnkgKyAoKHN0YXRlLmRlc3RMb2MzLnkgLSBzdGF0ZS5zcmNMb2MzLnkpICogYWxwaGEpICsgKHN0YXRlLm1pZHBvaW50T2Zmc2V0LnkgKiBiZXRhKSxcclxuXHRcdFx0c3RhdGUuc3JjTG9jMy56ICsgKChzdGF0ZS5kZXN0TG9jMy56IC0gc3RhdGUuc3JjTG9jMy56KSAqIGFscGhhKSArIChzdGF0ZS5taWRwb2ludE9mZnNldC56ICogYmV0YSlcclxuXHRcdCk7XHJcblx0XHRcclxuXHRcdGlmIChzdGF0ZS5kZWx0YSA+IDEpIHtcclxuXHRcdFx0dGhpcy5lbWl0KFwibW92ZWRcIiwgc3RhdGUuc3JjTG9jQy54LCBzdGF0ZS5zcmNMb2NDLnksIHN0YXRlLmRlc3RMb2NDLngsIHN0YXRlLmRlc3RMb2NDLnkpO1xyXG5cdFx0XHR0aGlzLmxvY2F0aW9uLnNldCggc3RhdGUuZGVzdExvY0MgKTtcclxuXHRcdFx0XHJcblx0XHRcdGlmIChzdGF0ZS5qdW1waW5nKSB7XHJcblx0XHRcdFx0Ly9UT0RPIHBhcnRpY2xlIGVmZmVjdHNcclxuXHRcdFx0XHRTb3VuZE1hbmFnZXIucGxheVNvdW5kKFwid2Fsa19qdW1wX2xhbmRcIik7XHJcblx0XHRcdFx0c3RhdGUuanVtcGluZyA9IGZhbHNlO1xyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHR2YXIgbmV4dCA9IHN0YXRlLnF1ZXVlLnNoaWZ0KCk7XHJcblx0XHRcdGlmICghbmV4dCkge1xyXG5cdFx0XHRcdHN0YXRlLmRlbHRhID0gMDtcclxuXHRcdFx0XHRzdGF0ZS5tb3ZpbmcgPSBmYWxzZTtcclxuXHRcdFx0XHQvLyB0aGlzLnN0b3BBbmltYXRpb24oKTtcclxuXHRcdFx0XHR0aGlzLnBsYXlBbmltYXRpb24oXCJzdGFuZFwiKTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHR0aGlzLm1vdmVUbyhuZXh0LngsIG5leHQueSwgbmV4dC56KTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH0sXHJcblx0XHJcblx0XHJcblx0Ly8vLy8vLy8vLy8vLy8vLy8vLy8vIFByaXZhdGUgTWV0aG9kcyAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblx0XHJcblx0Y2FuV2Fsa09uIDogZnVuY3Rpb24oKXsgcmV0dXJuIGZhbHNlOyB9LFxyXG5cdFxyXG5cdF9ub3JtYWxpemVMb2NhdGlvbiA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0dmFyIG51bSA9IEV2ZW50LnByb3RvdHlwZS5fbm9ybWFsaXplTG9jYXRpb24uY2FsbCh0aGlzKTtcclxuXHRcdGlmIChudW0gIT0gMSB8fCAhdGhpcy5sb2NhdGlvbilcclxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiQWN0b3JzIGNhbiBvbmx5IGJlIGluIG9uZSBwbGFjZSBhdCBhIHRpbWUhIE51bWJlciBvZiBsb2NhdGlvbnM6IFwiK251bSk7XHJcblx0fSxcclxuXHRcclxuXHRfYWN0b3JUaWNrIDogZnVuY3Rpb24oZGVsdGEpIHtcclxuXHRcdC8vIERvIGFuaW1hdGlvblxyXG5cdFx0aWYgKHRoaXMuX2FuaW1hdGlvblN0YXRlKSBcclxuXHRcdFx0dGhpcy5fdGlja19kb0FuaW1hdGlvbihkZWx0YSk7XHJcblx0XHRcclxuXHRcdC8vIERvIG1vdmVtZW50XHJcblx0XHRpZiAodGhpcy5fcGF0aGluZ1N0YXRlICYmIHRoaXMuX3BhdGhpbmdTdGF0ZS5tb3ZpbmcpXHJcblx0XHRcdHRoaXMuX3RpY2tfZG9Nb3ZlbWVudChkZWx0YSk7XHJcblx0fSxcclxuXHRcclxuXHRfYWN0b3JJbnRlcmFjdEZhY2UgOiBmdW5jdGlvbih2ZWN0b3IpIHtcclxuXHRcdHRoaXMuZmFjaW5nID0gdmVjdG9yLmNsb25lKCkubmVnYXRlKCk7XHJcblx0fSxcclxuXHRcclxufSk7XHJcbm1vZHVsZS5leHBvcnRzID0gQWN0b3I7XHJcblxyXG5cclxuXHJcbmZ1bmN0aW9uIGdldERpckZyb21Mb2MoeDEsIHkxLCB4MiwgeTIpIHtcclxuXHRyZXR1cm4gbmV3IFRIUkVFLlZlY3RvcjMoeDIteDEsIDAsIHkyLXkxKTtcclxuXHQvLyB2YXIgZHggPSB4MiAtIHgxO1xyXG5cdC8vIHZhciBkeSA9IHkyIC0geTE7XHJcblx0Ly8gaWYgKE1hdGguYWJzKGR4KSA+IE1hdGguYWJzKGR5KSkge1xyXG5cdC8vIFx0aWYgKGR4ID4gMCkgeyByZXR1cm4gXCJyXCI7IH1cclxuXHQvLyBcdGVsc2UgaWYgKGR4IDwgMCkgeyByZXR1cm4gXCJsXCI7IH1cclxuXHQvLyB9IGVsc2Uge1xyXG5cdC8vIFx0aWYgKGR5ID4gMCkgeyByZXR1cm4gXCJkXCI7IH1cclxuXHQvLyBcdGVsc2UgaWYgKGR5IDwgMCkgeyByZXR1cm4gXCJ1XCI7IH1cclxuXHQvLyB9XHJcblx0Ly8gcmV0dXJuIFwiZFwiO1xyXG59XHJcblxyXG5cclxuZnVuY3Rpb24gZ2V0U3ByaXRlRm9ybWF0KHN0cikge1xyXG5cdHZhciBmb3JtYXQgPSBzdHIuc3BsaXQoXCItXCIpO1xyXG5cdHZhciBuYW1lID0gZm9ybWF0WzBdO1xyXG5cdHZhciBzaXplID0gZm9ybWF0WzFdLnNwbGl0KFwieFwiKTtcclxuXHRzaXplWzFdID0gc2l6ZVsxXSB8fCBzaXplWzBdO1xyXG5cdFxyXG5cdHZhciBiYXNlID0ge1xyXG5cdFx0d2lkdGg6IHNpemVbMF0sIGhlaWdodDogc2l6ZVsxXSwgZmxpcDogZmFsc2UsIHJlcGVhdDogMC4yNSxcclxuXHRcdGZyYW1lczoge1xyXG5cdFx0XHRcInUzXCI6IFwidTBcIiwgXCJkM1wiOiBcImQwXCIsIFwibDNcIjogXCJsMFwiLCBcInIzXCI6IFwicjBcIixcclxuXHRcdH0sXHJcblx0XHRhbmltcyA6IGdldFN0YW5kYXJkQW5pbWF0aW9ucygpLFxyXG5cdH07XHJcblx0XHJcblx0c3dpdGNoIChuYW1lKSB7XHJcblx0XHRjYXNlIFwicHRfaG9yenJvd1wiOiBcclxuXHRcdFx0cmV0dXJuIGV4dGVuZCh0cnVlLCBiYXNlLCB7IFxyXG5cdFx0XHRcdGZyYW1lczoge1xyXG5cdFx0XHRcdFx0XCJ1MFwiOiBbMSwgMF0sIFwidTFcIjogWzEsIDFdLCBcInUyXCI6IFsxLCAyXSxcclxuXHRcdFx0XHRcdFwiZDBcIjogWzAsIDBdLCBcImQxXCI6IFswLCAxXSwgXCJkMlwiOiBbMCwgMl0sXHJcblx0XHRcdFx0XHRcImwwXCI6IFsyLCAwXSwgXCJsMVwiOiBbMiwgMV0sIFwibDJcIjogWzIsIDJdLFxyXG5cdFx0XHRcdFx0XCJyMFwiOiBbMywgMF0sIFwicjFcIjogWzMsIDFdLCBcInIyXCI6IFszLCAyXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9KTtcclxuXHRcdGNhc2UgXCJwdF92ZXJ0Y29sXCI6IFxyXG5cdFx0XHRyZXR1cm4gZXh0ZW5kKHRydWUsIGJhc2UsIHsgXHJcblx0XHRcdFx0ZnJhbWVzOiB7XHJcblx0XHRcdFx0XHRcInUwXCI6IFswLCAxXSwgXCJ1MVwiOiBbMSwgMV0sIFwidTJcIjogWzIsIDFdLFxyXG5cdFx0XHRcdFx0XCJkMFwiOiBbMCwgMF0sIFwiZDFcIjogWzEsIDBdLCBcImQyXCI6IFsyLCAwXSxcclxuXHRcdFx0XHRcdFwibDBcIjogWzAsIDJdLCBcImwxXCI6IFsxLCAyXSwgXCJsMlwiOiBbMiwgMl0sXHJcblx0XHRcdFx0XHRcInIwXCI6IFswLCAzXSwgXCJyMVwiOiBbMSwgM10sIFwicjJcIjogWzIsIDNdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH0pO1xyXG5cdFx0Y2FzZSBcImhnX3ZlcnRtaXhcIjogXHJcblx0XHRcdHJldHVybiBleHRlbmQodHJ1ZSwgYmFzZSwgeyBcclxuXHRcdFx0XHRmcmFtZXM6IHtcclxuXHRcdFx0XHRcdFwidTBcIjogWzAsIDBdLCBcInUxXCI6IFsxLCAzXSwgXCJ1MlwiOiBbMiwgMF0sXHJcblx0XHRcdFx0XHRcImQwXCI6IFsyLCAxXSwgXCJkMVwiOiBbMiwgMl0sIFwiZDJcIjogWzIsIDNdLFxyXG5cdFx0XHRcdFx0XCJsMFwiOiBbMCwgMl0sIFwibDFcIjogWzAsIDFdLCBcImwyXCI6IFswLCAzXSxcclxuXHRcdFx0XHRcdFwicjBcIjogWzEsIDBdLCBcInIxXCI6IFsxLCAxXSwgXCJyMlwiOiBbMSwgMl0sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fSk7XHJcblx0XHRjYXNlIFwiaGdfcG9rZXJvd1wiOlxyXG5cdFx0XHRyZXR1cm4gZXh0ZW5kKHRydWUsIGJhc2UsIHsgXHJcblx0XHRcdFx0ZnJhbWVzOiB7IC8vIHBvaW50ZXJzIHRvIGFub3RoZXIgaW1hZ2UgaW5kaWNhdGVzIHRoYXQgaW1hZ2Ugc2hvdWxkIGJlIGZsaXBwZWQsIGlmIGZsaXA9dHJ1ZVxyXG5cdFx0XHRcdFx0XCJ1MFwiOiBudWxsLCBcInUxXCI6IFswLCAwXSwgXCJ1MlwiOiBbMSwgMF0sXHJcblx0XHRcdFx0XHRcImQwXCI6IG51bGwsIFwiZDFcIjogWzAsIDFdLCBcImQyXCI6IFsxLCAxXSxcclxuXHRcdFx0XHRcdFwibDBcIjogbnVsbCwgXCJsMVwiOiBbMCwgMl0sIFwibDJcIjogWzEsIDJdLFxyXG5cdFx0XHRcdFx0XCJyMFwiOiBudWxsLCBcInIxXCI6IFswLCAzXSwgXCJyMlwiOiBbMSwgM10sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fSk7XHJcblx0XHRjYXNlIFwiaGdfcG9rZWZsaXBcIjpcclxuXHRcdFx0cmV0dXJuIGV4dGVuZCh0cnVlLCBiYXNlLCB7IFxyXG5cdFx0XHRcdGZyYW1lczogeyAvLyBwb2ludGVycyB0byBhbm90aGVyIGltYWdlIGluZGljYXRlcyB0aGF0IGltYWdlIHNob3VsZCBiZSBmbGlwcGVkLCBpZiBmbGlwPXRydWVcclxuXHRcdFx0XHRcdFwidTBcIjogbnVsbCwgXCJ1MVwiOiBbMCwgMF0sIFwidTJcIjogWzEsIDBdLFxyXG5cdFx0XHRcdFx0XCJkMFwiOiBudWxsLCBcImQxXCI6IFswLCAxXSwgXCJkMlwiOiBbMSwgMV0sXHJcblx0XHRcdFx0XHRcImwwXCI6IG51bGwsIFwibDFcIjogWzAsIDJdLCBcImwyXCI6IFsxLCAyXSxcclxuXHRcdFx0XHRcdFwicjBcIjogbnVsbCwgXCJyMVwiOiBcImwxXCIsICAgXCJyMlwiOiBcImwyXCIsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fSk7XHJcblx0XHRjYXNlIFwiYndfdmVydHJvd1wiOlxyXG5cdFx0XHRyZXR1cm4gZXh0ZW5kKHRydWUsIGJhc2UsIHsgXHJcblx0XHRcdFx0ZnJhbWVzOiB7XHJcblx0XHRcdFx0XHRcInUwXCI6IFswLCAwXSwgXCJ1MVwiOiBbMSwgMF0sIFwidTJcIjogWzIsIDBdLFxyXG5cdFx0XHRcdFx0XCJkMFwiOiBbMCwgMV0sIFwiZDFcIjogWzEsIDFdLCBcImQyXCI6IFsyLCAxXSxcclxuXHRcdFx0XHRcdFwibDBcIjogWzAsIDJdLCBcImwxXCI6IFsxLCAyXSwgXCJsMlwiOiBbMiwgMl0sXHJcblx0XHRcdFx0XHRcInIwXCI6IFswLCAzXSwgXCJyMVwiOiBbMSwgM10sIFwicjJcIjogWzIsIDNdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH0pO1xyXG5cdFx0Y2FzZSBcImJ3X2hvcnpmbGlwXCI6XHJcblx0XHRcdHJldHVybiBleHRlbmQodHJ1ZSwgYmFzZSwgeyBcclxuXHRcdFx0XHRmcmFtZXM6IHsgLy8gcG9pbnRlcnMgdG8gYW5vdGhlciBpbWFnZSBpbmRpY2F0ZXMgdGhhdCBpbWFnZSBzaG91bGQgYmUgZmxpcHBlZCwgaWYgZmxpcD10cnVlXHJcblx0XHRcdFx0XHRcInUwXCI6IFswLCAwXSwgXCJ1MVwiOiBbMSwgMF0sIFwidTJcIjogXCJ1MVwiLFxyXG5cdFx0XHRcdFx0XCJkMFwiOiBbMiwgMF0sIFwiZDFcIjogWzMsIDBdLCBcImQyXCI6IFwiZDFcIixcclxuXHRcdFx0XHRcdFwibDBcIjogWzAsIDFdLCBcImwxXCI6IFsxLCAxXSwgXCJsMlwiOiBbMiwgMV0sXHJcblx0XHRcdFx0XHRcInIwXCI6IFwibDBcIiwgICBcInIxXCI6IFwibDFcIiwgICBcInIyXCI6IFwibDJcIixcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9KTtcclxuXHR9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldFN0YW5kYXJkQW5pbWF0aW9ucygpIHtcclxuXHR2YXIgYW5pbXMgPSB7fTtcclxuXHRcclxuXHRhbmltc1tcInN0YW5kXCJdID0gbmV3IFNwcml0ZUFuaW1hdGlvbih7IHNpbmdsZUZyYW1lOiB0cnVlLCB9LCBbXHJcblx0XHR7IHU6IFwidTBcIiwgZDogXCJkMFwiLCBsOiBcImwwXCIsIHI6IFwicjBcIiwgdHJhbnM6IHRydWUsIHBhdXNlOiB0cnVlLCB9LFxyXG5cdF0pO1xyXG5cdGFuaW1zW1wid2Fsa1wiXSA9IG5ldyBTcHJpdGVBbmltYXRpb24oeyBmcmFtZUxlbmd0aDogNSwga2VlcEZyYW1lOiB0cnVlLCB9LCBbXHJcblx0XHR7IHU6IFwidTFcIiwgZDogXCJkMVwiLCBsOiBcImwxXCIsIHI6IFwicjFcIiwgfSxcclxuXHRcdHsgdTogXCJ1M1wiLCBkOiBcImQzXCIsIGw6IFwibDNcIiwgcjogXCJyM1wiLCB0cmFuczogdHJ1ZSwgfSxcclxuXHRcdHsgdTogXCJ1MlwiLCBkOiBcImQyXCIsIGw6IFwibDJcIiwgcjogXCJyMlwiLCB9LFxyXG5cdFx0eyB1OiBcInUzXCIsIGQ6IFwiZDNcIiwgbDogXCJsM1wiLCByOiBcInIzXCIsIHRyYW5zOiB0cnVlLCBsb29wVG86IDAsIH0sXHJcblx0XSk7XHJcblx0YW5pbXNbXCJidW1wXCJdID0gbmV3IFNwcml0ZUFuaW1hdGlvbih7IGZyYW1lTGVuZ3RoOiAxMCwga2VlcEZyYW1lOiB0cnVlLCB9LCBbXHJcblx0XHR7IHU6IFwidTFcIiwgZDogXCJkMVwiLCBsOiBcImwxXCIsIHI6IFwicjFcIiwgc2Z4OiBcIndhbGtfYnVtcFwiLCB9LFxyXG5cdFx0eyB1OiBcInUwXCIsIGQ6IFwiZDBcIiwgbDogXCJsMFwiLCByOiBcInIwXCIsIHRyYW5zOiB0cnVlLCB9LFxyXG5cdFx0eyB1OiBcInUyXCIsIGQ6IFwiZDJcIiwgbDogXCJsMlwiLCByOiBcInIyXCIsIHNmeDogXCJ3YWxrX2J1bXBcIiwgfSxcclxuXHRcdHsgdTogXCJ1MFwiLCBkOiBcImQwXCIsIGw6IFwibDBcIiwgcjogXCJyMFwiLCB0cmFuczogdHJ1ZSwgbG9vcFRvOiAwLCB9LFxyXG5cdF0pO1xyXG5cdGFuaW1zW1wid2FycF9hd2F5XCJdID0gbmV3IFNwcml0ZUFuaW1hdGlvbih7IHNpbmdsZURpcjogXCJkXCIgfSwgW1xyXG5cdFx0eyBkOiBcImQwXCIsIGZyYW1lTGVuZ3RoOiA4LCB9LCAvLzBcclxuXHRcdHsgZDogXCJsMFwiLCBmcmFtZUxlbmd0aDogOCwgfSxcclxuXHRcdHsgZDogXCJ1MFwiLCBmcmFtZUxlbmd0aDogOCwgfSxcclxuXHRcdHsgZDogXCJyMFwiLCBmcmFtZUxlbmd0aDogOCwgfSxcclxuXHRcdHsgZDogXCJkMFwiLCBmcmFtZUxlbmd0aDogNywgfSwgLy80XHJcblx0XHR7IGQ6IFwibDBcIiwgZnJhbWVMZW5ndGg6IDcsIH0sXHJcblx0XHR7IGQ6IFwidTBcIiwgZnJhbWVMZW5ndGg6IDcsIH0sXHJcblx0XHR7IGQ6IFwicjBcIiwgZnJhbWVMZW5ndGg6IDcsIH0sXHJcblx0XHR7IGQ6IFwiZDBcIiwgZnJhbWVMZW5ndGg6IDUsIH0sIC8vOFxyXG5cdFx0eyBkOiBcImwwXCIsIGZyYW1lTGVuZ3RoOiA1LCB9LFxyXG5cdFx0eyBkOiBcInUwXCIsIGZyYW1lTGVuZ3RoOiA1LCB9LFxyXG5cdFx0eyBkOiBcInIwXCIsIGZyYW1lTGVuZ3RoOiA1LCB9LFxyXG5cdFx0eyBkOiBcImQwXCIsIGZyYW1lTGVuZ3RoOiAzLCB9LCAvLzEyXHJcblx0XHR7IGQ6IFwibDBcIiwgZnJhbWVMZW5ndGg6IDMsIH0sXHJcblx0XHR7IGQ6IFwidTBcIiwgZnJhbWVMZW5ndGg6IDMsIH0sXHJcblx0XHR7IGQ6IFwicjBcIiwgZnJhbWVMZW5ndGg6IDMsIH0sXHJcblx0XHR7IGQ6IFwiZDBcIiwgZnJhbWVMZW5ndGg6IDEsIH0sIC8vMTZcclxuXHRcdHsgZDogXCJsMFwiLCBmcmFtZUxlbmd0aDogMSwgfSxcclxuXHRcdHsgZDogXCJ1MFwiLCBmcmFtZUxlbmd0aDogMSwgfSxcclxuXHRcdHsgZDogXCJyMFwiLCBmcmFtZUxlbmd0aDogMSwgfSxcclxuXHRcdHsgZDogXCJkMFwiLCBmcmFtZUxlbmd0aDogMCwgdHJhbnM6IHRydWUsIH0sIC8vMjBcclxuXHRcdHsgZDogXCJsMFwiLCBmcmFtZUxlbmd0aDogMCwgdHJhbnM6IHRydWUsIH0sXHJcblx0XHR7IGQ6IFwidTBcIiwgZnJhbWVMZW5ndGg6IDAsIHRyYW5zOiB0cnVlLCB9LFxyXG5cdFx0eyBkOiBcInIwXCIsIGZyYW1lTGVuZ3RoOiAwLCB0cmFuczogdHJ1ZSwgbG9vcFRvOiAyMCB9LFxyXG5cdF0pO1xyXG5cdGFuaW1zW1wid2FycF9pblwiXSA9IG5ldyBTcHJpdGVBbmltYXRpb24oeyBzaW5nbGVEaXI6IFwiZFwiIH0sIFtcclxuXHRcdHsgZDogXCJkMFwiLCBmcmFtZUxlbmd0aDogMSwgfSwgLy8wXHJcblx0XHR7IGQ6IFwicjBcIiwgZnJhbWVMZW5ndGg6IDEsIH0sXHJcblx0XHR7IGQ6IFwidTBcIiwgZnJhbWVMZW5ndGg6IDEsIH0sXHJcblx0XHR7IGQ6IFwibDBcIiwgZnJhbWVMZW5ndGg6IDEsIH0sXHJcblx0XHR7IGQ6IFwiZDBcIiwgZnJhbWVMZW5ndGg6IDMsIH0sIC8vNFxyXG5cdFx0eyBkOiBcInIwXCIsIGZyYW1lTGVuZ3RoOiAzLCB9LFxyXG5cdFx0eyBkOiBcInUwXCIsIGZyYW1lTGVuZ3RoOiAzLCB9LFxyXG5cdFx0eyBkOiBcImwwXCIsIGZyYW1lTGVuZ3RoOiAzLCB9LFxyXG5cdFx0eyBkOiBcImQwXCIsIGZyYW1lTGVuZ3RoOiA1LCB9LCAvLzhcclxuXHRcdHsgZDogXCJyMFwiLCBmcmFtZUxlbmd0aDogNSwgfSxcclxuXHRcdHsgZDogXCJ1MFwiLCBmcmFtZUxlbmd0aDogNSwgfSxcclxuXHRcdHsgZDogXCJsMFwiLCBmcmFtZUxlbmd0aDogNSwgfSxcclxuXHRcdHsgZDogXCJkMFwiLCBmcmFtZUxlbmd0aDogNywgfSwgLy8xMlxyXG5cdFx0eyBkOiBcInIwXCIsIGZyYW1lTGVuZ3RoOiA3LCB9LFxyXG5cdFx0eyBkOiBcInUwXCIsIGZyYW1lTGVuZ3RoOiA3LCB9LFxyXG5cdFx0eyBkOiBcImwwXCIsIGZyYW1lTGVuZ3RoOiA4LCB9LFxyXG5cdFx0eyBkOiBcImQwXCIsIGZyYW1lTGVuZ3RoOiA4LCB9LCAvLzE2XHJcblx0XHR7IGQ6IFwicjBcIiwgZnJhbWVMZW5ndGg6IDksIH0sXHJcblx0XHR7IGQ6IFwidTBcIiwgZnJhbWVMZW5ndGg6IDksIH0sXHJcblx0XHR7IGQ6IFwibDBcIiwgZnJhbWVMZW5ndGg6IDEwLCB9LFxyXG5cdFx0eyBkOiBcImQwXCIsIGZyYW1lTGVuZ3RoOiAxLCB0cmFuczogdHJ1ZSwgfSxcclxuXHRdKTtcclxuXHRcclxuXHRyZXR1cm4gYW5pbXM7XHJcbn1cclxuXHJcbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblxyXG5mdW5jdGlvbiBTcHJpdGVBbmltYXRpb24ob3B0cywgZnJhbWVzKSB7XHJcblx0dGhpcy5vcHRpb25zID0gb3B0cztcclxuXHR0aGlzLmZyYW1lcyA9IGZyYW1lcztcclxuXHRcclxuXHR0aGlzLndhaXRUaW1lID0gdGhpcy5mcmFtZXNbdGhpcy5jdXJyRnJhbWVdLmZyYW1lTGVuZ3RoIHx8IHRoaXMub3B0aW9ucy5mcmFtZUxlbmd0aDtcclxufVxyXG5TcHJpdGVBbmltYXRpb24ucHJvdG90eXBlID0ge1xyXG5cdG9wdGlvbnM6IG51bGwsXHJcblx0ZnJhbWVzIDogbnVsbCxcclxuXHRcclxuXHR3YWl0VGltZSA6IDAsXHJcblx0Y3VyckZyYW1lOiAwLFxyXG5cdHNwZWVkIDogMSxcclxuXHRwYXVzZWQgOiBmYWxzZSxcclxuXHRcclxuXHQvKiogQWR2YW5jZWQgdGhlIGFuaW1hdGlvbiBieSB0aGUgZ2l2ZW4gYW1vdW50IG9mIGRlbHRhIHRpbWUuICovXHJcblx0YWR2YW5jZSA6IGZ1bmN0aW9uKGRlbHRhVGltZSkge1xyXG5cdFx0aWYgKHRoaXMub3B0aW9ucy5zaW5nbGVGcmFtZSkgcmV0dXJuO1xyXG5cdFx0aWYgKHRoaXMucGF1c2VkKSByZXR1cm47XHJcblx0XHRcclxuXHRcdGlmICh0aGlzLndhaXRUaW1lID4gMCkge1xyXG5cdFx0XHR0aGlzLndhaXRUaW1lIC09ICh0aGlzLnNwZWVkICogKGRlbHRhVGltZSAqIENPTkZJRy5zcGVlZC5hbmltYXRpb24pKTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHR2YXIgbG9vcCA9IHRoaXMuZnJhbWVzW3RoaXMuY3VyckZyYW1lXS5sb29wVG87XHJcblx0XHRpZiAobG9vcCAhPT0gdW5kZWZpbmVkKSB0aGlzLmN1cnJGcmFtZSA9IGxvb3A7XHJcblx0XHRlbHNlIHRoaXMuY3VyckZyYW1lKys7XHJcblx0XHRcclxuXHRcdGlmICh0aGlzLmN1cnJGcmFtZSA+PSB0aGlzLmZyYW1lcy5sZW5ndGgpIHtcclxuXHRcdFx0dGhpcy5jdXJyRnJhbWUgPSB0aGlzLmZyYW1lcy5sZW5ndGgtMTtcclxuXHRcdFx0dGhpcy5wYXVzZWQgPSB0cnVlO1xyXG5cdFx0XHRjb25zb2xlLndhcm4oXCJBbmltYXRpb24gaGFzIGNvbXBsZXRlZCFcIik7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0Ly9uZXcgZnJhbWVcclxuXHRcdFxyXG5cdFx0dGhpcy53YWl0VGltZSA9IHRoaXMuZnJhbWVzW3RoaXMuY3VyckZyYW1lXS5mcmFtZUxlbmd0aCB8fCB0aGlzLm9wdGlvbnMuZnJhbWVMZW5ndGg7XHJcblx0XHRcclxuXHRcdGlmICh0aGlzLmZyYW1lc1t0aGlzLmN1cnJGcmFtZV0ucGF1c2UpIHRoaXMucGF1c2VkID0gdHJ1ZTtcclxuXHRcdFxyXG5cdFx0aWYgKHRoaXMuZnJhbWVzW3RoaXMuY3VyckZyYW1lXS5zZngpIFxyXG5cdFx0XHRTb3VuZE1hbmFnZXIucGxheVNvdW5kKHRoaXMuZnJhbWVzW3RoaXMuY3VyckZyYW1lXS5zZngpO1xyXG5cdH0sXHJcblx0XHJcblx0LyoqIElmIHRoaXMgYW5pbWF0aW9uIGlzIG9uIGEgcGF1c2UgZnJhbWUgKi9cclxuXHRyZXN1bWUgOiBmdW5jdGlvbigpIHtcclxuXHRcdHRoaXMucGF1c2VkID0gZmFsc2U7XHJcblx0fSxcclxuXHRcclxuXHQvKiogUmVzZXQgdGhlIGFuaW1hdGlvbiBwYXJhbWV0ZXJzLiBDYWxsZWQgd2hlbiB0aGlzIGFuaW1hdGlvbiBpcyBubyBsb25nZXIgdXNlZC4gKi9cclxuXHRyZXNldCA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0dGhpcy5wYXVzZWQgPSBmYWxzZTtcclxuXHRcdGlmICh0aGlzLm9wdGlvbnMua2VlcEZyYW1lKSByZXR1cm47XHJcblx0XHR0aGlzLmN1cnJGcmFtZSA9IDA7XHJcblx0XHR0aGlzLndhaXRUaW1lID0gdGhpcy5mcmFtZXNbdGhpcy5jdXJyRnJhbWVdLmZyYW1lTGVuZ3RoIHx8IHRoaXMub3B0aW9ucy5mcmFtZUxlbmd0aDtcclxuXHRcdHRoaXMuc3BlZWQgPSAxO1xyXG5cdH0sXHJcblx0XHJcblx0LyoqIElmIHRoaXMgYW5pbWF0aW9uIGlzIG9uIGEgZnJhbWUgdGhhdCBjYW4gdHJhbnNpdGlvbiB0byBhbm90aGVyIGFuaW1hdGlvbi4gKi9cclxuXHRjYW5UcmFuc2l0aW9uIDogZnVuY3Rpb24oKSB7XHJcblx0XHRyZXR1cm4gdGhpcy5mcmFtZXNbdGhpcy5jdXJyRnJhbWVdLnRyYW5zO1xyXG5cdH0sXHJcblx0XHJcblx0LyoqIFJldHVybnMgdGhlIG5hbWUgb2YgdGhlIGZyYW1lIHRvIGRpc3BsYXkgdGhpcyBmcmFtZS4gKi9cclxuXHRnZXRGcmFtZVRvRGlzcGxheSA6IGZ1bmN0aW9uKGRpcikge1xyXG5cdFx0aWYgKHRoaXMub3B0aW9ucy5zaW5nbGVEaXIpIGRpciA9IHRoaXMub3B0aW9ucy5zaW5nbGVEaXI7XHJcblx0XHRyZXR1cm4gdGhpcy5mcmFtZXNbdGhpcy5jdXJyRnJhbWVdW2Rpcl07XHJcblx0fSxcclxufTsiLCIvLyBjb250cm9sbGVyLmpzXHJcbi8vIFRoaXMgY2xhc3MgaGFuZGxlcyBpbnB1dCBhbmQgY29udmVydHMgaXQgdG8gY29udHJvbCBzaWduYWxzXHJcblxyXG52YXIgaW5oZXJpdHMgPSByZXF1aXJlKFwiaW5oZXJpdHNcIik7XHJcbnZhciBleHRlbmQgPSByZXF1aXJlKFwiZXh0ZW5kXCIpO1xyXG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZShcImV2ZW50c1wiKS5FdmVudEVtaXR0ZXI7XHJcblxyXG4vLyBUT0RPIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0d1aWRlL0FQSS9HYW1lcGFkXHJcblxyXG5mdW5jdGlvbiBDb250cm9sTWFuYWdlcigpIHtcclxuXHR2YXIgc2VsZiA9IHRoaXM7XHJcblx0JChkb2N1bWVudCkua2V5ZG93bihmdW5jdGlvbihlKSB7IHNlbGYub25LZXlEb3duKGUpOyB9KTtcclxuXHQkKGRvY3VtZW50KS5rZXl1cChmdW5jdGlvbihlKSB7IHNlbGYub25LZXlVcChlKTsgfSk7XHJcblx0XHJcblx0dGhpcy5zZXRLZXlDb25maWcoKTtcclxufVxyXG5pbmhlcml0cyhDb250cm9sTWFuYWdlciwgRXZlbnRFbWl0dGVyKTtcclxuZXh0ZW5kKENvbnRyb2xNYW5hZ2VyLnByb3RvdHlwZSwge1xyXG5cdGlucHV0Q29udGV4dCA6IFwiZ2FtZVwiLFxyXG5cdFxyXG5cdGtleXNfY29uZmlnIDoge1xyXG5cdFx0VXA6IFszOCwgXCJVcFwiLCA4NywgXCJ3XCJdLCBcclxuXHRcdERvd246IFs0MCwgXCJEb3duXCIsIDgzLCBcInNcIl0sIFxyXG5cdFx0TGVmdDogWzM3LCBcIkxlZnRcIiwgNjUsIFwiYVwiXSwgXHJcblx0XHRSaWdodDogWzM5LCBcIlJpZ2h0XCIsIDY4LCBcImRcIl0sXHJcblx0XHRJbnRlcmFjdDogWzEzLCBcIkVudGVyXCIsIDMyLCBcIiBcIl0sXHJcblx0XHRGb2N1c0NoYXQ6IFsxOTEsIFwiL1wiXSxcclxuXHR9LFxyXG5cdFxyXG5cdGtleXNfYWN0aXZlIDoge30sXHJcblx0XHJcblx0a2V5c19kb3duIDoge1xyXG5cdFx0VXA6IGZhbHNlLCBEb3duOiBmYWxzZSxcclxuXHRcdExlZnQ6IGZhbHNlLCBSaWdodDogZmFsc2UsXHJcblx0XHRJbnRlcmFjdDogZmFsc2UsIEZvY3VzQ2hhdDogZmFsc2UsXHJcblx0fSxcclxuXHRcclxuXHRpc0Rvd24gOiBmdW5jdGlvbihrZXkpIHtcclxuXHRcdHJldHVybiB0aGlzLmtleXNfZG93bltrZXldO1xyXG5cdH0sXHJcblx0XHJcblx0c2V0S2V5Q29uZmlnIDogZnVuY3Rpb24oKSB7XHJcblx0XHR0aGlzLmtleXNfYWN0aXZlID0gZXh0ZW5kKHRydWUsIHt9LCB0aGlzLmtleXNfY29uZmlnKTtcclxuXHR9LFxyXG5cdFxyXG5cdG9uS2V5RG93biA6IGZ1bmN0aW9uKGUpIHtcclxuXHRcdGZvciAodmFyIGFjdGlvbiBpbiB0aGlzLmtleXNfYWN0aXZlKSB7XHJcblx0XHRcdHZhciBrZXlzID0gdGhpcy5rZXlzX2FjdGl2ZVthY3Rpb25dO1xyXG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGtleXMubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0XHRpZiAoZS53aGljaCA9PSBrZXlzW2ldKSB7XHJcblx0XHRcdFx0XHQvLyBLZXkgaXMgbm93IGRvd24hXHJcblx0XHRcdFx0XHR0aGlzLmVtaXRLZXkoYWN0aW9uLCB0cnVlKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9LFxyXG5cdG9uS2V5VXAgOiBmdW5jdGlvbiAoZSkge1xyXG5cdFx0Zm9yICh2YXIgYWN0aW9uIGluIHRoaXMua2V5c19hY3RpdmUpIHtcclxuXHRcdFx0dmFyIGtleXMgPSB0aGlzLmtleXNfYWN0aXZlW2FjdGlvbl07XHJcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRcdGlmIChlLndoaWNoID09IGtleXNbaV0pIHtcclxuXHRcdFx0XHRcdC8vIEtleSBpcyBub3cgdXAhXHJcblx0XHRcdFx0XHR0aGlzLmVtaXRLZXkoYWN0aW9uLCBmYWxzZSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fSxcclxuXHRcclxuXHRlbWl0S2V5IDogZnVuY3Rpb24oYWN0aW9uLCBkb3duKSB7XHJcblx0XHRpZiAodGhpcy5rZXlzX2Rvd25bYWN0aW9uXSAhPSBkb3duKSB7XHJcblx0XHRcdHRoaXMua2V5c19kb3duW2FjdGlvbl0gPSBkb3duO1xyXG5cdFx0XHR0aGlzLmVtaXQoXCJjb250cm9sLWFjdGlvblwiLCBhY3Rpb24sIGRvd24pO1xyXG5cdFx0fVxyXG5cdH0sXHJcblx0XHJcbn0pO1xyXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBDb250cm9sTWFuYWdlcigpO1xyXG4iLCIvLyBldmVudC5qc1xyXG4vLyBEZWZpbmVzIHRoZSBiYXNlIGV2ZW50IHVzZWQgdGhyb3VnaG91dCB0aGUgcGFyay5cclxuXHJcbi8vIEZpdHRpbmdseSwgRXZlbnQgaXMgYSBzdWJjbGFzcyBvZiBub2RlLmpzJ3MgRXZlbnRFbWl0dGVyIGNsYXNzLlxyXG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZShcImV2ZW50c1wiKS5FdmVudEVtaXR0ZXI7XHJcbnZhciBpbmhlcml0cyA9IHJlcXVpcmUoXCJpbmhlcml0c1wiKTtcclxudmFyIGV4dGVuZCA9IHJlcXVpcmUoXCJleHRlbmRcIik7XHJcblxyXG4vKipcclxuICogQW4gZXZlbnQgaXMgYW55IGludGVyYWN0YWJsZSBvciBhbmltYXRpbmcgb2JqZWN0IGluIHRoZSBnYW1lLlxyXG4gKiBUaGlzIGluY2x1ZGVzIHRoaW5ncyByYW5naW5nIGZyb20gc2lnbnMsIHRvIHBlb3BsZS9wb2tlbW9uLlxyXG4gKiBBbiBldmVudDpcclxuICpcdC0gVGFrZXMgdXAgYXQgbGVhc3Qgb25lIHRpbGUgb24gdGhlIG1hcFxyXG4gKlx0LSBDYW4gYmUgaW50ZXJhY3RlZCB3aXRoIGJ5IGluLWdhbWUgdGFsa2luZyBvciBvbi1zY3JlZW4gY2xpY2tcclxuICpcdC0gTWF5IGJlIHJlcHJlc2VudGVkIGluLWdhbWUgYnkgYSBzcHJpdGVcclxuICpcdC0gTWF5IGRlY2lkZSwgdXBvbiBjcmVhdGlvbiwgdG8gbm90IGFwcGVhciBvbiB0aGUgbWFwLlxyXG4gKi9cclxuZnVuY3Rpb24gRXZlbnQoYmFzZSwgb3B0cykge1xyXG5cdEV2ZW50RW1pdHRlci5jYWxsKHRoaXMpO1xyXG5cdFxyXG5cdGV4dGVuZCh0aGlzLCBiYXNlLCBvcHRzKTtcclxuXHRcclxuXHR0aGlzLl9ub3JtYWxpemVMb2NhdGlvbigpO1xyXG5cdFxyXG5cdGlmICh0aGlzLm9uRXZlbnRzKSB7XHJcblx0XHR2YXIga2V5cyA9IE9iamVjdC5rZXlzKHRoaXMub25FdmVudHMpO1xyXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdHRoaXMub24oa2V5c1tpXSwgdGhpcy5vbkV2ZW50c1trZXlzW2ldXSk7XHJcblx0XHR9XHJcblx0XHRkZWxldGUgdGhpcy5vbkV2ZW50cztcclxuXHR9XHJcbn1cclxuaW5oZXJpdHMoRXZlbnQsIEV2ZW50RW1pdHRlcik7XHJcbmV4dGVuZChFdmVudC5wcm90b3R5cGUsIHtcclxuXHRpZCA6IG51bGwsXHJcblx0ZW5hYmxlZCA6IGZhbHNlLFxyXG5cdHZpc2libGUgOiB0cnVlLFxyXG5cdFxyXG5cdGxvY2F0aW9uIDogbnVsbCwgLy8gRXZlbnRzIHdpdGggYSBzaW5nbGUgbG9jYXRpb24gYXJlIG9wdGltaXplZCBmb3IgaXRcclxuXHRsb2NhdGlvbnMgOiBudWxsLCAvLyBFdmVudHMgd2l0aCBtdWx0aXBsZSBsb2NhdGlvbnMgYXJlIG9wdGltaXplZCBmb3IgdGhhdCBhbHNvXHJcblx0XHJcblx0dG9TdHJpbmcgOiBmdW5jdGlvbigpIHtcclxuXHRcdGlmICghdGhpcy5pZCkgcmV0dXJuIFwiPExvY2FsIG9yIFVubmFtZWQgRXZlbnQ+XCI7XHJcblx0XHRyZXR1cm4gdGhpcy5pZDtcclxuXHR9LFxyXG5cdFxyXG5cdHNob3VsZEFwcGVhciA6IGZ1bmN0aW9uKCl7IHJldHVybiB0cnVlOyB9LFxyXG5cdGNhbldhbGtPbiA6IGZ1bmN0aW9uKCl7IHJldHVybiB0cnVlOyB9LFxyXG5cdFxyXG5cdC8qKiBSZXR1cm5zIGFuIG9iamVjdCB0byByZXByZXNlbnQgdGhpcyBldmVudCBpbiAzRCBzcGFjZSwgb3IgbnVsbCBpZiB0aGVyZSBzaG91bGRuJ3QgYmUgb25lLiAqL1xyXG5cdGdldEF2YXRhciA6IGZ1bmN0aW9uKCl7IHJldHVybiBudWxsOyB9LFxyXG5cdFxyXG5cdG9uRXZlbnRzIDogbnVsbCwgLy9hIG9iamVjdCwgZXZlbnQtbmFtZXMgLT4gZnVuY3Rpb25zIHRvIGNhbGwsIHRvIGJlIHJlZ2lzdGVyZWQgaW4gY29uc3RydWN0b3JcclxuXHRcclxuXHRjYW5Nb3ZlIDogZnVuY3Rpb24oKSB7XHJcblx0XHQvL0lmIHdlIG9ubHkgaGF2ZSAxIGxvY2F0aW9uLCB0aGVuIHdlIGNhbiBtb3ZlXHJcblx0XHRyZXR1cm4gISF0aGlzLmxvY2F0aW9uICYmICF0aGlzLmxvY2F0aW9ucztcclxuXHR9LFxyXG5cdFxyXG5cdG1vdmVUbyA6IGZ1bmN0aW9uKHgsIHkpIHtcclxuXHRcdGlmICghdGhpcy5jYW5Nb3ZlKCkpXHJcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIlRoaXMgZXZlbnQgaXMgaW4gc2V2ZXJhbCBwbGFjZXMgYXQgb25jZSwgYW5kIGNhbm5vdCBtb3ZlVG8hXCIpO1xyXG5cdFx0XHJcblx0XHQvL1RPRE8gcXVldWUgdXAgYSBtb3ZlXHJcblx0fSxcclxuXHRcclxuXHRfbm9ybWFsaXplTG9jYXRpb24gOiBmdW5jdGlvbigpIHtcclxuXHRcdGlmICh0aGlzLmxvY2F0aW9uKSB7XHJcblx0XHRcdC8vSWYgd2UgaGF2ZSBhIHNpbmd1bGFyIGxvY2F0aW9uIHNldFxyXG5cdFx0XHRpZiAodGhpcy5sb2NhdGlvbnMpIC8vIEFzIGxvbmcgYXMgd2UgZG9uJ3QgYWxzbyBoYXZlIGEgbGlzdCwgaXRzIGZpbmVcclxuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJFdmVudCB3YXMgaW5pdGlhbGl6ZWQgd2l0aCBib3RoIGxvY2F0aW9uIGFuZCBsb2NhdGlvbnMhIFRoZXkgY2Fubm90IGJlIGJvdGggZGVmaW5lZCFcIik7XHJcblx0XHRcdFxyXG5cdFx0XHR2YXIgbG9jID0gdGhpcy5sb2NhdGlvbjtcclxuXHRcdFx0aWYgKCQuaXNBcnJheShsb2MpICYmIGxvYy5sZW5ndGggPT0gMiAmJiB0eXBlb2YgbG9jWzBdID09IFwibnVtYmVyXCIgJiYgdHlwZW9mIGxvY1sxXSA9PSBcIm51bWJlclwiKSBcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGxvYyA9IG5ldyBUSFJFRS5WZWN0b3IyKGxvY1swXSwgbG9jWzFdKTtcclxuXHRcdFx0fSBcclxuXHRcdFx0ZWxzZSBpZiAoJC5pc0FycmF5KGxvYykgJiYgbG9jLmxlbmd0aCA9PSAzIFxyXG5cdFx0XHRcdCYmIHR5cGVvZiBsb2NbMF0gPT0gXCJudW1iZXJcIiAmJiB0eXBlb2YgbG9jWzFdID09IFwibnVtYmVyXCIgJiYgdHlwZW9mIGxvY1syXSA9PSBcIm51bWJlclwiKSBcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGxvYyA9IG5ldyBUSFJFRS5WZWN0b3IzKGxvY1swXSwgbG9jWzFdLCBsb2NbMl0pO1xyXG5cdFx0XHR9IFxyXG5cdFx0XHRlbHNlIGlmICghKGxvYyBpbnN0YW5jZW9mIFRIUkVFLlZlY3RvcjIgfHwgbG9jIGluc3RhbmNlb2YgVEhSRUUuVmVjdG9yMykpIFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiQ291bGQgbm90IG5vcm1hbGl6ZSBsb2NhdGlvbiBvZiBcIit0aGlzLmlkK1wiIVwiKTtcclxuXHRcdFx0fVxyXG5cdFx0XHR0aGlzLmxvY2F0aW9uID0gbG9jO1xyXG5cdFx0XHRyZXR1cm4gMTtcclxuXHRcdH1cclxuXHRcdHZhciBvcmdsb2MgPSB0aGlzLmxvY2F0aW9ucztcclxuXHRcdHZhciBsb2NzID0gbnVsbDtcclxuXHRcdFxyXG5cdFx0aWYgKCQuaXNBcnJheShvcmdsb2MpKSB7XHJcblx0XHRcdHZhciB0eXBlID0gbnVsbCwgbmV3VHlwZSA9IG51bGw7XHJcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgb3JnbG9jLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdFx0aWYgKHR5cGVvZiBvcmdsb2NbaV0gPT0gXCJudW1iZXJcIilcclxuXHRcdFx0XHRcdG5ld1R5cGUgPSBcIm51bWJlclwiO1xyXG5cdFx0XHRcdGVsc2UgaWYgKG9yZ2xvY1tpXSBpbnN0YW5jZW9mIFRIUkVFLlZlY3RvcjIpXHJcblx0XHRcdFx0XHRuZXdUeXBlID0gXCJ2ZWN0b3JcIjtcclxuXHRcdFx0XHRlbHNlIGlmIChvcmdsb2NbaV0gaW5zdGFuY2VvZiBUSFJFRS5WZWN0b3IzKVxyXG5cdFx0XHRcdFx0bmV3VHlwZSA9IFwidmVjdG9yXCI7XHJcblx0XHRcdFx0ZWxzZSBpZiAoJC5pc0FycmF5KG9yZ2xvY1tpXSkpXHJcblx0XHRcdFx0XHRuZXdUeXBlID0gXCJhcnJheVwiO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdGlmICghdHlwZSkgdHlwZSA9IG5ld1R5cGU7XHJcblx0XHRcdFx0aWYgKHR5cGUgIT0gbmV3VHlwZSkge1xyXG5cdFx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiQ291bGQgbm90IG5vcm1hbGl6ZSBsb2NhdGlvbnMgb2YgXCIrdGhpcy5pZCtcIiFcIik7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHRcdGlmICh0eXBlID09IFwibnVtYmVyXCIpIGxvY3MgPSBfX3BhcnNlQXNOdW1iZXJBcnJheShvcmdsb2MpO1xyXG5cdFx0XHRpZiAodHlwZSA9PSBcImFycmF5XCIpIGxvY3MgPSBfX3BhcnNlQXNBcnJheUFycmF5KG9yZ2xvYyk7XHJcblx0XHRcdGlmICh0eXBlID09IFwidmVjdG9yXCIpIGxvY3MgPSBvcmdsb2M7XHJcblx0XHR9XHJcblx0XHRlbHNlIGlmICgkLmlzRnVuY3Rpb24ob3JnbG9jKSkge1xyXG5cdFx0XHRsb2NzID0gb3JnbG9jLmNhbGwodGhpcyk7XHJcblx0XHR9XHJcblx0XHRlbHNlIGlmIChvcmdsb2MgaW5zdGFuY2VvZiBUSFJFRS5WZWN0b3IyKSB7XHJcblx0XHRcdGxvY3MgPSBbb3JnbG9jXTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0aWYgKCFsb2NzIHx8ICEkLmlzQXJyYXkobG9jcykgfHwgbG9jcy5sZW5ndGggPT0gMCkgXHJcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIkNvdWxkIG5vdCBub3JtYWxpemUgbG9jYXRpb25zIG9mIFwiK3RoaXMuaWQrXCIhXCIpO1xyXG5cdFx0XHJcblx0XHR0aGlzLmxvY2F0aW9ucyA9IGxvY3M7XHJcblx0XHR0aGlzLl9ub3JtYWxpemVMb2NhdGlvbiA9IGZ1bmN0aW9uKCl7IHJldHVybiBsb2NzLmxlbmd0aDsgfTsgLy9jYW4ndCBub3JtYWxpemUgdHdpY2VcclxuXHRcdHJldHVybiBsb2NzLmxlbmd0aDtcclxuXHRcdFxyXG5cdFx0ZnVuY3Rpb24gX19wYXJzZUFzTnVtYmVyQXJyYXkobCkge1xyXG5cdFx0XHRpZiAobC5sZW5ndGggPT0gMikgLy9zaW5nbGUgcG9pbnQgW3gsIHldXHJcblx0XHRcdFx0cmV0dXJuIFtuZXcgVEhSRUUuVmVjdG9yMihsWzBdLCBsWzFdKV07XHJcblx0XHRcdGlmIChsLmxlbmd0aCA9PSAzKSAvL3NpbmdsZSBwb2ludCBbeCwgeSwgel1cclxuXHRcdFx0XHRyZXR1cm4gW25ldyBUSFJFRS5WZWN0b3IzKGxbMF0sIGxbMV0sIGxbMl0pXTtcclxuXHRcdFx0aWYgKGwubGVuZ3RoID09IDQpIHsgLy9yZWN0YW5nbGUgW3gsIHksIHcsIGhdXHJcblx0XHRcdFx0dmFyIG4gPSBbXTtcclxuXHRcdFx0XHRmb3IgKHZhciB4ID0gbFswXTsgeCA8IGxbMF0rbFsyXTsgeCsrKSB7XHJcblx0XHRcdFx0XHRmb3IgKHZhciB5ID0gbFsxXTsgeSA8IGxbMV0rbFszXTsgeSsrKSB7XHJcblx0XHRcdFx0XHRcdG4ucHVzaChuZXcgVEhSRUUuVmVjdG9yMih4LCB5KSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdHJldHVybiBuO1xyXG5cdFx0XHR9XHJcblx0XHRcdGlmIChsLmxlbmd0aCA9PSA1KSB7IC8vcmVjdGFuZ2xlIFt4LCB5LCB6LCB3LCBoXVxyXG5cdFx0XHRcdHZhciBuID0gW107XHJcblx0XHRcdFx0Zm9yICh2YXIgeCA9IGxbMF07IHggPCBsWzBdK2xbM107IHgrKykge1xyXG5cdFx0XHRcdFx0Zm9yICh2YXIgeSA9IGxbMV07IHkgPCBsWzFdK2xbNF07IHkrKykge1xyXG5cdFx0XHRcdFx0XHRuLnB1c2gobmV3IFRIUkVFLlZlY3RvcjMoeCwgeSwgbFsyXSkpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRyZXR1cm4gbjtcclxuXHRcdFx0fVxyXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJDb3VsZCBub3Qgbm9ybWFsaXplIGxvY2F0aW9uKHMpIG9mIFwiK3RoaXMuaWQrXCIhXCIpO1xyXG5cdFx0fVxyXG5cdFx0ZnVuY3Rpb24gX19wYXJzZUFzQXJyYXlBcnJheShsKSB7XHJcblx0XHRcdHZhciBuID0gW107XHJcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgbC5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRcdGZvciAodmFyIGogPSAwOyBqIDwgbFtpXS5sZW5ndGg7IGorKykge1xyXG5cdFx0XHRcdFx0aWYgKHR5cGVvZiBsW2ldW2pdICE9IFwibnVtYmVyXCIpXHJcblx0XHRcdFx0XHRcdHRocm93IG5ldyBFcnJvcihcIkNvdWxkIG5vdCBub3JtYWxpemUgbG9jYXRpb24ocykgb2YgXCIrdGhpcy5pZCtcIiFcIik7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdG4ucHVzaChfX3BhcnNlQXNOdW1iZXJBcnJheShsW2ldKSk7XHJcblx0XHRcdH1cclxuXHRcdFx0cmV0dXJuIG47XHJcblx0XHR9XHJcblx0fSxcclxuXHRcclxufSk7XHJcbm1vZHVsZS5leHBvcnRzID0gRXZlbnQ7XHJcblxyXG5FdmVudC5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPVxyXG5FdmVudC5wcm90b3R5cGUub24gPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xyXG5cdGlmICgkLmluQXJyYXkodHlwZSwgX19FVkVOVF9UWVBFU19fKSA9PSAtMSkge1xyXG5cdFx0Y29uc29sZS5lcnJvcihcIk1hcCBFdmVudFwiLCB0aGlzLnRvU3RyaW5nKCksIFwicmVnaXN0ZXJpbmcgZW1pdHRlZCBldmVudCB0eXBlXCIsIFxyXG5cdFx0XHR0eXBlLCBcIndoaWNoIGlzIG5vdCBhIHZhbGlkIGVtaXR0ZWQgZXZlbnQgdHlwZSFcIik7XHJcblx0fVxyXG5cdEV2ZW50RW1pdHRlci5wcm90b3R5cGUub24uY2FsbCh0aGlzLCB0eXBlLCBsaXN0ZW5lcik7XHJcbn1cclxuXHJcbi8vIFRoZSBmb2xsb3dpbmcgaXMgYSBsaXN0IG9mIGV2ZW50cyB0aGUgYmFzZSBFdmVudCBjbGFzcyBhbmQgbGlicmFyeSBlbWl0XHJcbi8vIFRoaXMgbGlzdCBpcyBjaGVja2VkIGFnYWluc3Qgd2hlbiByZWdpc3RlcmluZyB0byBjYXRjaCBtaXNzcGVsbGluZ3MuXHJcbnZhciBfX0VWRU5UX1RZUEVTX18gPSBbXHJcblx0XCJlbnRlcmluZy10aWxlXCIsIC8vKGZyb20tZGlyKSBcclxuXHRcdC8vZW1pdHRlZCB1cG9uIHRoZSBwbGF5ZXIgaXMgZ2l2ZW4gdGhlIGdvIGFoZWFkIHRvIGVudGVyIHRoZSB0aWxlIHRoaXMgZXZlbnQgb2NjdXBpZXMuXHJcblx0XCJlbnRlcmVkLXRpbGVcIiwgLy8oZnJvbS1kaXIpXHJcblx0XHQvL2VtaXR0ZWQgdXBvbiB0aGUgcGxheWVyIGxhbmRpbmcgb24gdGhlIHRpbGUgdGhpcyBldmVudCBvY2N1cGllcy5cclxuXHRcImxlYXZpbmctdGlsZVwiLCAvLyh0by1kaXIpXHJcblx0XHQvL2VtaXR0ZWQgdXBvbiB0aGUgcGxheWVyIGlzIGdpdmVuIHRoZSBnbyBhaGVhZCB0byBsZWF2ZSB0aGUgdGlsZSB0aGlzIGV2ZW50IG9jY3VwaWVzLlxyXG5cdFwibGVmdC10aWxlXCIsIC8vKHRvLWRpcilcclxuXHRcdC8vZW1pdHRlZCB1cG9uIHRoZSBwbGF5ZXIgY29tcGxldGVseSBsZWF2aW5nIHRoZSB0aWxlIHRoaXMgZXZlbnQgb2NjdXBpZXMuXHJcblx0XCJidW1wZWRcIiwgLy8oZnJvbS1kaXIpXHJcblx0XHQvL2VtaXR0ZWQgdXBvbiB0aGUgcGxheWVyIGlzIGRlbmllZCBlbnRyeSBpbnRvIHRoZSB0aWxlIHRoaXMgZXZlbnQgb2NjdXBpZXMuXHJcblx0XCJpbnRlcmFjdGVkXCIsIC8vKGZyb20tZGlyKVxyXG5cdFx0Ly9lbWl0dGVkIHdoZW4gdGhlIHBsYXllciBpbnRlcmFjdHMgd2l0aCB0aGlzIGV2ZW50IGZyb20gYW4gYWRqYWNlbnQgdGlsZVxyXG5cdFwidGlja1wiLCAvLyhkZWx0YSlcclxuXHRcdC8vZW1pdHRlZCBldmVyeSBnYW1lIHRpY2tcclxuXHRcImNsaWNrZWRcIiwgLy8oeCwgeSlcclxuXHRcdC8vZW1pdHRlZCB3aGVuIHRoZSBtb3VzZSBpcyBjbGlja2VkIG9uIHRoaXMgZXZlbnQgKGFuZCBpdCBpcyBkZXRlcm1pbmVkIGl0IGlzIHRoaXMgZXZlbnQpXHJcblx0XCJjbGlja2VkLXRocm91Z2hcIiwgLy8oeCwgeSlcclxuXHRcdC8vZW1pdHRlZCB3aGVuIHRoZSBtb3VzZSBpcyBjbGlja2VkIG9uIHRoaXMgZXZlbnQgKGFuZCB0aGUgcmF5dHJhY2UgaXMgcGFzc2luZyB0aHJvdWdoIFxyXG5cdFx0Ly8gdGhpcyBldmVudCBkdXJpbmcgdGhlIGRldGVybWluaW5nIHBoYXNlKVxyXG5cdFwibW92aW5nXCIsIC8vKHNyY1gsIHNyY1ksIGRlc3RYLCBkZXN0WSlcclxuXHRcdC8vZW1pdHRlZCB3aGVuIHRoaXMgZXZlbnQgYmVnaW5zIG1vdmluZyB0byBhIG5ldyB0aWxlXHJcblx0XCJtb3ZlZFwiLCAvLyhzcmNYLCBzcmNZLCBkZXN0WCwgZGVzdFkpXHJcblx0XHQvL2VtaXR0ZWQgd2hlbiB0aGlzIGV2ZW50IGZpbmlzaGVzIG1vdmluZyB0byBhIG5ldyB0aWxlXHJcblx0XCJhbmltLWVuZFwiLCAvLyhhbmltYXRpb25OYW1lKVxyXG5cdFx0Ly9lbWl0dGVkIHdoZW4gdGhpcyBldmVudCdzIGFuaW1hdGlvbiBlbmRzXHJcblx0XCJjcmVhdGVkXCIsIFxyXG5cdFx0Ly9lbWl0dGVkIHdoZW4gdGhpcyBldmVudCBpcyBhZGRlZCB0byB0aGUgZXZlbnQgbWFwXHJcblx0XCJkZXN0cm95ZWRcIixcclxuXHRcdC8vZW1pdHRlZCB3aGVuIHRoaXMgZXZlbnQgaGFzIGJlZW4gdGFrZW4gb3V0IG9mIHRoZSBldmVudCBtYXBcclxuXHRcInJlYWN0XCIsIC8vKGlkLCBkaXN0YW5jZSlcclxuXHRcdC8vZW1pdHRlZCB3aGVuIGFub3RoZXIgZXZlbnQgb24gdGhlIG1hcCB0cmFuc21pdHMgYSByZWFjdGFibGUgZXZlbnRcclxuXHRcIm1lc3NhZ2VcIiwgLy8oaWQsIC4uLilcclxuXHRcdC8vbmV2ZXIgZW1pdHRlZCBieSB0aGUgbGlicmFyeSwgdGhpcyBldmVudCB0eXBlIGNhbiBiZSB1c2VkIGZvciBjcm9zcy1ldmVudCBtZXNzYWdlc1xyXG5dO1xyXG4iLCIvLyBwbGF5ZXItY2hhcmFjdGVyLmpzXHJcbi8vIERlZmluZXMgdGhlIGNvbmNyZXRlIGNvZGUgZm9yIGEgUGxheWVyIENoYXJhY3RlciBpbiB0aGUgd29ybGRcclxuXHJcbnZhciBBY3RvciA9IHJlcXVpcmUoXCJ0cHAtYWN0b3JcIik7XHJcbnZhciBjb250cm9sbGVyID0gcmVxdWlyZShcInRwcC1jb250cm9sbGVyXCIpO1xyXG52YXIgaW5oZXJpdHMgPSByZXF1aXJlKFwiaW5oZXJpdHNcIik7XHJcbnZhciBleHRlbmQgPSByZXF1aXJlKFwiZXh0ZW5kXCIpO1xyXG5cclxuLyoqXHJcbiAqL1xyXG5mdW5jdGlvbiBQbGF5ZXJDaGFyKCl7XHJcblx0QWN0b3IuY2FsbCh0aGlzLCB7fSwge30pO1xyXG5cdFxyXG5cdHRoaXMub24oXCJ0aWNrXCIsIHRoaXMuY29udHJvbENoYXJhY3Rlcik7XHJcbn1cclxuaW5oZXJpdHMoUGxheWVyQ2hhciwgQWN0b3IpO1xyXG5leHRlbmQoUGxheWVyQ2hhci5wcm90b3R5cGUsIHtcclxuXHRpZCA6IFwiUExBWUVSQ0hBUlwiLFxyXG5cdGxvY2F0aW9uIDogbmV3IFRIUkVFLlZlY3RvcjMoKSxcclxuXHRcclxuXHRzcHJpdGU6IG51bGwsXHJcblx0XHJcblx0cmVzZXQgOiBmdW5jdGlvbigpIHtcclxuXHRcdHRoaXMubG9jYXRpb24uc2V0KDAsIDAsIDApO1xyXG5cdH0sXHJcblx0XHJcblx0d2FycEF3YXkgOiBmdW5jdGlvbihhbmltVHlwZSkge1xyXG5cdFx0Y29uc29sZS53YXJuKFwid2FycEF3YXkgaXMgbm90IHlldCBpbXBsZW1lbnRlZCFcIik7XHJcblx0fSxcclxuXHRcclxuXHR3YXJwVG8gOiBmdW5jdGlvbih3YXJwZGVmKSB7XHJcblx0XHR2YXIgc2VsZiA9IHRoaXM7XHJcblx0XHR0aGlzLmxvY2F0aW9uLnNldCh3YXJwZGVmLmxvY1swXSwgd2FycGRlZi5sb2NbMV0sIHdhcnBkZWYubGF5ZXIpO1xyXG5cdFx0Ly9UT0RPIHdhcnBkZWYuYW5pbVxyXG5cdFx0XHJcblx0XHRjdXJyZW50TWFwLnF1ZXVlRm9yTWFwU3RhcnQoZnVuY3Rpb24oKXtcclxuXHRcdFx0dmFyIGFuaW1OYW1lID0gbnVsbDtcclxuXHRcdFx0dmFyIHggPSBzZWxmLmxvY2F0aW9uLng7XHJcblx0XHRcdHZhciB5ID0gc2VsZi5sb2NhdGlvbi55O1xyXG5cdFx0XHR2YXIgbGF5ZXIgPSBzZWxmLmxvY2F0aW9uLno7XHJcblx0XHRcdHZhciB6X29mZiA9IDA7XHJcblx0XHRcdFxyXG5cdFx0XHRzd2l0Y2god2FycGRlZi5hbmltKSB7IC8vV2FycCBhbmltYXRpb25cclxuXHRcdFx0XHRjYXNlIDA6IGJyZWFrOyAvLyBBcHBlYXJcclxuXHRcdFx0XHRjYXNlIDE6IHkrKzsgYW5pbU5hbWUgPSBcIndhbGtcIjsgYnJlYWs7IC8vIFdhbGsgdXBcclxuXHRcdFx0XHRjYXNlIDI6IHktLTsgYW5pbU5hbWUgPSBcIndhbGtcIjsgYnJlYWs7IC8vIFdhbGsgZG93blxyXG5cdFx0XHRcdGNhc2UgMzogeC0tOyBhbmltTmFtZSA9IFwid2Fsa1wiOyBicmVhazsgLy8gV2FsayBsZWZ0XHJcblx0XHRcdFx0Y2FzZSA0OiB4Kys7IGFuaW1OYW1lID0gXCJ3YWxrXCI7IGJyZWFrOyAvLyBXYWxrIGRvd25cclxuXHRcdFx0XHRjYXNlIDU6IHpfb2ZmID0gMTA7IGFuaW1OYW1lID0gXCJ3YXJwX2luXCI7IGJyZWFrOyAvLyBXYXJwIGluXHJcblx0XHRcdH1cclxuXHRcdFx0XHJcblx0XHRcdHZhciBzcmMgPSBzZWxmLmxvY2F0aW9uO1xyXG5cdFx0XHR2YXIgc3RhdGUgPSBzZWxmLl9pbml0UGF0aGluZ1N0YXRlKCk7XHJcblx0XHRcdFxyXG5cdFx0XHRpZiAoc3JjLngteCB8fCB5LXNyYy55KSBcclxuXHRcdFx0XHRzZWxmLmZhY2luZy5zZXQoeC1zcmMueCwgMCwgc3JjLnkteSk7XHJcblx0XHRcdGVsc2VcclxuXHRcdFx0XHRzZWxmLmZhY2luZy5zZXQoMCwgMCwgMSk7XHJcblx0XHRcdFxyXG5cdFx0XHRzdGF0ZS5zcmNMb2NDLnNldCh4LCB5LCBsYXllcik7XHJcblx0XHRcdHN0YXRlLnNyY0xvYzMuc2V0KGN1cnJlbnRNYXAuZ2V0M0RUaWxlTG9jYXRpb24oeCwgeSwgbGF5ZXIpKTtcclxuXHRcdFx0c3RhdGUuZGVzdExvY0Muc2V0KHNyYyk7XHJcblx0XHRcdHN0YXRlLmRlc3RMb2MzLnNldChjdXJyZW50TWFwLmdldDNEVGlsZUxvY2F0aW9uKHNyYykpLnogKz0gel9vZmY7XHJcblx0XHRcdHN0YXRlLmRlbHRhID0gMDtcclxuXHRcdFx0c3RhdGUubW92aW5nID0gdHJ1ZTtcclxuXHRcdFx0XHJcblx0XHRcdHNlbGYucGxheUFuaW1hdGlvbihhbmltTmFtZSk7XHJcblx0XHRcdFxyXG5cdFx0XHQvL3NlbGYuYXZhdGFyX25vZGUucG9zaXRpb24uc2V0KCBjdXJyZW50TWFwLmdldDNEVGlsZUxvY2F0aW9uKHNlbGYubG9jYXRpb24pICk7XHJcblx0XHR9KTtcclxuXHR9LFxyXG5cdFxyXG5cdGNvbnRyb2xUaW1lb3V0OiAwLjAsXHJcblx0Y29udHJvbENoYXJhY3RlciA6IGZ1bmN0aW9uKGRlbHRhKSB7XHJcblx0XHR2YXIgeSA9ICgoY29udHJvbGxlci5pc0Rvd24oXCJVcFwiKSk/IC0xOjApICsgKChjb250cm9sbGVyLmlzRG93bihcIkRvd25cIikpPyAxOjApO1xyXG5cdFx0dmFyIHggPSAoKGNvbnRyb2xsZXIuaXNEb3duKFwiTGVmdFwiKSk/IC0xOjApICsgKChjb250cm9sbGVyLmlzRG93bihcIlJpZ2h0XCIpKT8gMTowKTtcclxuXHRcdFxyXG5cdFx0aWYgKGNvbnRyb2xsZXIuaXNEb3duKFwiSW50ZXJhY3RcIikgJiYgIXRoaXMuX2luaXRQYXRoaW5nU3RhdGUoKS5tb3ZpbmcpIHtcclxuXHRcdFx0Y3VycmVudE1hcC5kaXNwYXRjaChcclxuXHRcdFx0XHR0aGlzLmxvY2F0aW9uLnggLSB0aGlzLmZhY2luZy54LCB0aGlzLmxvY2F0aW9uLnkgKyB0aGlzLmZhY2luZy56LCBcclxuXHRcdFx0XHRcImludGVyYWN0ZWRcIiwgdGhpcy5mYWNpbmcpO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHRpZiAoKHkgfHwgeCkgJiYgISh4ICYmIHkpKSB7IC8vb25lLCBidXQgbm90IGJvdGhcclxuXHRcdFx0aWYgKHRoaXMuY29udHJvbFRpbWVvdXQgPCAxKSB7XHJcblx0XHRcdFx0dGhpcy5jb250cm9sVGltZW91dCArPSBDT05GSUcudGltZW91dC53YWxrQ29udHJvbCAqIGRlbHRhO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdGlmICghdGhpcy5faW5pdFBhdGhpbmdTdGF0ZSgpLm1vdmluZykge1xyXG5cdFx0XHRcdFx0dGhpcy5mYWNlRGlyKHgsIHkpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRpZiAoIXRoaXMuX2luaXRQYXRoaW5nU3RhdGUoKS5tb3ZpbmcpIHtcclxuXHRcdFx0XHRcdHRoaXMubW92ZVRvKHRoaXMubG9jYXRpb24ueCt4LCB0aGlzLmxvY2F0aW9uLnkreSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRpZiAodGhpcy5jb250cm9sVGltZW91dCA+IDApXHJcblx0XHRcdFx0dGhpcy5jb250cm9sVGltZW91dCAtPSBDT05GSUcudGltZW91dC53YWxrQ29udHJvbCAqIGRlbHRhO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0fSxcclxuXHRcclxuXHRcclxuXHQvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHRcclxuXHRfYXZhdGFyX2xvYWRTcHJpdGUgOiBmdW5jdGlvbihtYXAsIHRleHR1cmUpIHtcclxuXHRcdHZhciB1cmwgPSBCQVNFVVJMK1wiL2ltZy9wY3MvXCIrIGdhbWVTdGF0ZS5wbGF5ZXJTcHJpdGU7XHJcblx0XHR2YXIgcmVzID0gL14oW15cXFtdKylcXFsoW15cXF1dKylcXF0ucG5nJC8uZXhlYyh1cmwpO1xyXG5cdFx0XHJcblx0XHR2YXIgbmFtZSA9IHJlc1sxXTtcclxuXHRcdHZhciBmb3JtYXQgPSByZXNbMl07XHJcblx0XHRcclxuXHRcdHZhciBpbWcgPSBuZXcgSW1hZ2UoKTtcclxuXHRcdHRoaXMuX19vbkxvYWRTcHJpdGUoaW1nLCBmb3JtYXQsIHRleHR1cmUpO1xyXG5cdFx0aW1nLnNyYyA9IHVybDtcclxuXHR9LFxyXG5cdFxyXG5cdC8vIE5ldXRlciB0aGUgbG9jYXRpb24gbm9ybWlsaXphdGlvbiBmb3IgdGhpcyBraW5kIG9mIGV2ZW50XHJcblx0X25vcm1hbGl6ZUxvY2F0aW9uIDogZnVuY3Rpb24oKSB7fSxcclxuXHRcclxufSk7XHJcbm1vZHVsZS5leHBvcnRzID0gUGxheWVyQ2hhcjtcclxuIiwiLy8gdHJpZ2dlci5qc1xyXG4vLyBEZWZpbmVzIGEgdHJpZ2dlciB0aWxlKHMpIHVzZWQgdGhyb3VnaG91dCB0aGUgcGFya1xyXG5cclxudmFyIEV2ZW50ID0gcmVxdWlyZShcInRwcC1ldmVudFwiKTtcclxudmFyIGluaGVyaXRzID0gcmVxdWlyZShcImluaGVyaXRzXCIpO1xyXG52YXIgZXh0ZW5kID0gcmVxdWlyZShcImV4dGVuZFwiKTtcclxuXHJcbi8qKlxyXG4gKiBBIHRyaWdnZXIgaXMgYSB0aWxlIHRoYXQsIHdoZW4gc3RlcHBlZCB1cG9uLCB3aWxsIHRyaWdnZXIgc29tZSBldmVudC5cclxuICogVGhlIG1vc3QgY29tbW9uIGV2ZW50IHRpZ2dlcmVkIGlzIGEgd2FycGluZyB0byBhbm90aGVyIG1hcCwgZm9yIHdoaWNoXHJcbiAqIHRoZSBzdWJjbGFzcyBXYXJwIGlzIGRlc2lnbmVkIGZvci5cclxuICpcclxuICogVHJpZ2dlcnMgbWF5IHRha2UgdXAgbW9yZSB0aGFuIG9uZSBzcGFjZS5cclxuICovXHJcbmZ1bmN0aW9uIFRyaWdnZXIoYmFzZSwgb3B0cykge1xyXG5cdEV2ZW50LmNhbGwodGhpcywgYmFzZSwgb3B0cyk7XHJcbn1cclxuaW5oZXJpdHMoVHJpZ2dlciwgRXZlbnQpO1xyXG5leHRlbmQoVHJpZ2dlci5wcm90b3R5cGUsIHtcclxuXHRcclxufSk7IiwiLy8gd2FycC5qc1xyXG4vLyBEZWZpbmVzIGEgd2FycCB0aWxlIHVzZWQgdGhyb3VnaG91dCB0aGUgcGFyay5cclxuXHJcbnZhciBFdmVudCA9IHJlcXVpcmUoXCJ0cHAtZXZlbnRcIik7XHJcbnZhciBpbmhlcml0cyA9IHJlcXVpcmUoXCJpbmhlcml0c1wiKTtcclxudmFyIGV4dGVuZCA9IHJlcXVpcmUoXCJleHRlbmRcIik7XHJcblxyXG4vKipcclxuICogQSB3YXJwIGlzIGFuIGV2ZW50IHRoYXQsIHdoZW4gd2Fsa2VkIHVwb24sIHdpbGwgdGFrZSB0aGUgcGxheWVyIHRvIGFub3RoZXIgbWFwIG9yXHJcbiAqIGFyZWEgd2l0aGluIHRoZSBzYW1lIG1hcC4gRGlmZmVyZW50IHR5cGVzIG9mIHdhcnBzIGV4aXN0LCByYW5naW5nIGZyb20gdGhlIHN0YW5kYXJkXHJcbiAqIGRvb3Igd2FycCB0byB0aGUgdGVsZXBvcnQgd2FycC4gV2FycHMgY2FuIGJlIHRvbGQgdG8gYWN0aXZhdGUgdXBvbiBzdGVwcGluZyB1cG9uIHRoZW1cclxuICogb3IgYWN0aXZhdGUgdXBvbiBzdGVwcGluZyBvZmYgYSBjZXJ0YWluIGRpcmVjdGlvbi5cclxuICovXHJcbmZ1bmN0aW9uIFdhcnAoYmFzZSwgb3B0cykge1xyXG5cdEV2ZW50LmNhbGwodGhpcywgYmFzZSwgb3B0cyk7XHJcbn1cclxuaW5oZXJpdHMoV2FycCwgRXZlbnQpO1xyXG5leHRlbmQoV2FycC5wcm90b3R5cGUsIHtcclxuXHRcclxufSk7Il19
