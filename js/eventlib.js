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
module.exports = inherits

function inherits (c, p, proto) {
  proto = proto || {}
  var e = {}
  ;[c.prototype, proto].forEach(function (s) {
    Object.getOwnPropertyNames(s).forEach(function (k) {
      e[k] = Object.getOwnPropertyDescriptor(s, k)
    })
  })
  c.prototype = Object.create(p.prototype, e)
  c.super = p
}

//function Child () {
//  Child.super.call(this)
//  console.error([this
//                ,this.constructor
//                ,this.constructor === Child
//                ,this.constructor.super === Parent
//                ,Object.getPrototypeOf(this) === Child.prototype
//                ,Object.getPrototypeOf(Object.getPrototypeOf(this))
//                 === Parent.prototype
//                ,this instanceof Child
//                ,this instanceof Parent])
//}
//function Parent () {}
//inherits(Child, Parent)
//new Child

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
		var url = "{{site.baseurl}}/img/pcs/"+ gameState.playerSprite;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlc1xcYnJvd3NlcmlmeVxcbm9kZV9tb2R1bGVzXFxicm93c2VyLXBhY2tcXF9wcmVsdWRlLmpzIiwibm9kZV9tb2R1bGVzXFxicm93c2VyaWZ5XFxub2RlX21vZHVsZXNcXGV2ZW50c1xcZXZlbnRzLmpzIiwibm9kZV9tb2R1bGVzXFxleHRlbmRcXGluZGV4LmpzIiwibm9kZV9tb2R1bGVzXFxpbmhlcml0c1xcaW5oZXJpdHMuanMiLCJzcmNcXGpzXFxldmVudHNcXGFjdG9yIiwic3JjXFxqc1xcY29udHJvbGxlciIsInNyY1xcanNcXGV2ZW50c1xcZXZlbnQiLCJzcmNcXGpzXFxldmVudHNcXHBsYXllci1jaGFyYWN0ZXIiLCJzcmNcXGpzXFxldmVudHNcXHRyaWdnZXIiLCJzcmNcXGpzXFxldmVudHNcXHdhcnAiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdTQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25vQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ROQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuZnVuY3Rpb24gRXZlbnRFbWl0dGVyKCkge1xuICB0aGlzLl9ldmVudHMgPSB0aGlzLl9ldmVudHMgfHwge307XG4gIHRoaXMuX21heExpc3RlbmVycyA9IHRoaXMuX21heExpc3RlbmVycyB8fCB1bmRlZmluZWQ7XG59XG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50RW1pdHRlcjtcblxuLy8gQmFja3dhcmRzLWNvbXBhdCB3aXRoIG5vZGUgMC4xMC54XG5FdmVudEVtaXR0ZXIuRXZlbnRFbWl0dGVyID0gRXZlbnRFbWl0dGVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9ldmVudHMgPSB1bmRlZmluZWQ7XG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9tYXhMaXN0ZW5lcnMgPSB1bmRlZmluZWQ7XG5cbi8vIEJ5IGRlZmF1bHQgRXZlbnRFbWl0dGVycyB3aWxsIHByaW50IGEgd2FybmluZyBpZiBtb3JlIHRoYW4gMTAgbGlzdGVuZXJzIGFyZVxuLy8gYWRkZWQgdG8gaXQuIFRoaXMgaXMgYSB1c2VmdWwgZGVmYXVsdCB3aGljaCBoZWxwcyBmaW5kaW5nIG1lbW9yeSBsZWFrcy5cbkV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzID0gMTA7XG5cbi8vIE9idmlvdXNseSBub3QgYWxsIEVtaXR0ZXJzIHNob3VsZCBiZSBsaW1pdGVkIHRvIDEwLiBUaGlzIGZ1bmN0aW9uIGFsbG93c1xuLy8gdGhhdCB0byBiZSBpbmNyZWFzZWQuIFNldCB0byB6ZXJvIGZvciB1bmxpbWl0ZWQuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnNldE1heExpc3RlbmVycyA9IGZ1bmN0aW9uKG4pIHtcbiAgaWYgKCFpc051bWJlcihuKSB8fCBuIDwgMCB8fCBpc05hTihuKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ24gbXVzdCBiZSBhIHBvc2l0aXZlIG51bWJlcicpO1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSBuO1xuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGVyLCBoYW5kbGVyLCBsZW4sIGFyZ3MsIGksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBJZiB0aGVyZSBpcyBubyAnZXJyb3InIGV2ZW50IGxpc3RlbmVyIHRoZW4gdGhyb3cuXG4gIGlmICh0eXBlID09PSAnZXJyb3InKSB7XG4gICAgaWYgKCF0aGlzLl9ldmVudHMuZXJyb3IgfHxcbiAgICAgICAgKGlzT2JqZWN0KHRoaXMuX2V2ZW50cy5lcnJvcikgJiYgIXRoaXMuX2V2ZW50cy5lcnJvci5sZW5ndGgpKSB7XG4gICAgICBlciA9IGFyZ3VtZW50c1sxXTtcbiAgICAgIGlmIChlciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgIHRocm93IGVyOyAvLyBVbmhhbmRsZWQgJ2Vycm9yJyBldmVudFxuICAgICAgfVxuICAgICAgdGhyb3cgVHlwZUVycm9yKCdVbmNhdWdodCwgdW5zcGVjaWZpZWQgXCJlcnJvclwiIGV2ZW50LicpO1xuICAgIH1cbiAgfVxuXG4gIGhhbmRsZXIgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzVW5kZWZpbmVkKGhhbmRsZXIpKVxuICAgIHJldHVybiBmYWxzZTtcblxuICBpZiAoaXNGdW5jdGlvbihoYW5kbGVyKSkge1xuICAgIHN3aXRjaCAoYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgLy8gZmFzdCBjYXNlc1xuICAgICAgY2FzZSAxOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAyOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDM6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgLy8gc2xvd2VyXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgICAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgICAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIGhhbmRsZXIuYXBwbHkodGhpcywgYXJncyk7XG4gICAgfVxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGhhbmRsZXIpKSB7XG4gICAgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuXG4gICAgbGlzdGVuZXJzID0gaGFuZGxlci5zbGljZSgpO1xuICAgIGxlbiA9IGxpc3RlbmVycy5sZW5ndGg7XG4gICAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKVxuICAgICAgbGlzdGVuZXJzW2ldLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIG07XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIFRvIGF2b2lkIHJlY3Vyc2lvbiBpbiB0aGUgY2FzZSB0aGF0IHR5cGUgPT09IFwibmV3TGlzdGVuZXJcIiEgQmVmb3JlXG4gIC8vIGFkZGluZyBpdCB0byB0aGUgbGlzdGVuZXJzLCBmaXJzdCBlbWl0IFwibmV3TGlzdGVuZXJcIi5cbiAgaWYgKHRoaXMuX2V2ZW50cy5uZXdMaXN0ZW5lcilcbiAgICB0aGlzLmVtaXQoJ25ld0xpc3RlbmVyJywgdHlwZSxcbiAgICAgICAgICAgICAgaXNGdW5jdGlvbihsaXN0ZW5lci5saXN0ZW5lcikgP1xuICAgICAgICAgICAgICBsaXN0ZW5lci5saXN0ZW5lciA6IGxpc3RlbmVyKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAvLyBPcHRpbWl6ZSB0aGUgY2FzZSBvZiBvbmUgbGlzdGVuZXIuIERvbid0IG5lZWQgdGhlIGV4dHJhIGFycmF5IG9iamVjdC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBsaXN0ZW5lcjtcbiAgZWxzZSBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICAvLyBJZiB3ZSd2ZSBhbHJlYWR5IGdvdCBhbiBhcnJheSwganVzdCBhcHBlbmQuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdLnB1c2gobGlzdGVuZXIpO1xuICBlbHNlXG4gICAgLy8gQWRkaW5nIHRoZSBzZWNvbmQgZWxlbWVudCwgbmVlZCB0byBjaGFuZ2UgdG8gYXJyYXkuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gW3RoaXMuX2V2ZW50c1t0eXBlXSwgbGlzdGVuZXJdO1xuXG4gIC8vIENoZWNrIGZvciBsaXN0ZW5lciBsZWFrXG4gIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pICYmICF0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkKSB7XG4gICAgdmFyIG07XG4gICAgaWYgKCFpc1VuZGVmaW5lZCh0aGlzLl9tYXhMaXN0ZW5lcnMpKSB7XG4gICAgICBtID0gdGhpcy5fbWF4TGlzdGVuZXJzO1xuICAgIH0gZWxzZSB7XG4gICAgICBtID0gRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnM7XG4gICAgfVxuXG4gICAgaWYgKG0gJiYgbSA+IDAgJiYgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCA+IG0pIHtcbiAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQgPSB0cnVlO1xuICAgICAgY29uc29sZS5lcnJvcignKG5vZGUpIHdhcm5pbmc6IHBvc3NpYmxlIEV2ZW50RW1pdHRlciBtZW1vcnkgJyArXG4gICAgICAgICAgICAgICAgICAgICdsZWFrIGRldGVjdGVkLiAlZCBsaXN0ZW5lcnMgYWRkZWQuICcgK1xuICAgICAgICAgICAgICAgICAgICAnVXNlIGVtaXR0ZXIuc2V0TWF4TGlzdGVuZXJzKCkgdG8gaW5jcmVhc2UgbGltaXQuJyxcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCk7XG4gICAgICBpZiAodHlwZW9mIGNvbnNvbGUudHJhY2UgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgLy8gbm90IHN1cHBvcnRlZCBpbiBJRSAxMFxuICAgICAgICBjb25zb2xlLnRyYWNlKCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbmNlID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIHZhciBmaXJlZCA9IGZhbHNlO1xuXG4gIGZ1bmN0aW9uIGcoKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBnKTtcblxuICAgIGlmICghZmlyZWQpIHtcbiAgICAgIGZpcmVkID0gdHJ1ZTtcbiAgICAgIGxpc3RlbmVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICB9XG5cbiAgZy5saXN0ZW5lciA9IGxpc3RlbmVyO1xuICB0aGlzLm9uKHR5cGUsIGcpO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLy8gZW1pdHMgYSAncmVtb3ZlTGlzdGVuZXInIGV2ZW50IGlmZiB0aGUgbGlzdGVuZXIgd2FzIHJlbW92ZWRcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbGlzdCwgcG9zaXRpb24sIGxlbmd0aCwgaTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXR1cm4gdGhpcztcblxuICBsaXN0ID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuICBsZW5ndGggPSBsaXN0Lmxlbmd0aDtcbiAgcG9zaXRpb24gPSAtMTtcblxuICBpZiAobGlzdCA9PT0gbGlzdGVuZXIgfHxcbiAgICAgIChpc0Z1bmN0aW9uKGxpc3QubGlzdGVuZXIpICYmIGxpc3QubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG5cbiAgfSBlbHNlIGlmIChpc09iamVjdChsaXN0KSkge1xuICAgIGZvciAoaSA9IGxlbmd0aDsgaS0tID4gMDspIHtcbiAgICAgIGlmIChsaXN0W2ldID09PSBsaXN0ZW5lciB8fFxuICAgICAgICAgIChsaXN0W2ldLmxpc3RlbmVyICYmIGxpc3RbaV0ubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgICAgICBwb3NpdGlvbiA9IGk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChwb3NpdGlvbiA8IDApXG4gICAgICByZXR1cm4gdGhpcztcblxuICAgIGlmIChsaXN0Lmxlbmd0aCA9PT0gMSkge1xuICAgICAgbGlzdC5sZW5ndGggPSAwO1xuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGlzdC5zcGxpY2UocG9zaXRpb24sIDEpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUFsbExpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGtleSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIC8vIG5vdCBsaXN0ZW5pbmcgZm9yIHJlbW92ZUxpc3RlbmVyLCBubyBuZWVkIHRvIGVtaXRcbiAgaWYgKCF0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMClcbiAgICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIGVsc2UgaWYgKHRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvLyBlbWl0IHJlbW92ZUxpc3RlbmVyIGZvciBhbGwgbGlzdGVuZXJzIG9uIGFsbCBldmVudHNcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICBmb3IgKGtleSBpbiB0aGlzLl9ldmVudHMpIHtcbiAgICAgIGlmIChrZXkgPT09ICdyZW1vdmVMaXN0ZW5lcicpIGNvbnRpbnVlO1xuICAgICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoa2V5KTtcbiAgICB9XG4gICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoJ3JlbW92ZUxpc3RlbmVyJyk7XG4gICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBsaXN0ZW5lcnMgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzRnVuY3Rpb24obGlzdGVuZXJzKSkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBMSUZPIG9yZGVyXG4gICAgd2hpbGUgKGxpc3RlbmVycy5sZW5ndGgpXG4gICAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVyc1tsaXN0ZW5lcnMubGVuZ3RoIC0gMV0pO1xuICB9XG4gIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSBbXTtcbiAgZWxzZSBpZiAoaXNGdW5jdGlvbih0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IFt0aGlzLl9ldmVudHNbdHlwZV1dO1xuICBlbHNlXG4gICAgcmV0ID0gdGhpcy5fZXZlbnRzW3R5cGVdLnNsaWNlKCk7XG4gIHJldHVybiByZXQ7XG59O1xuXG5FdmVudEVtaXR0ZXIubGlzdGVuZXJDb3VudCA9IGZ1bmN0aW9uKGVtaXR0ZXIsIHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCFlbWl0dGVyLl9ldmVudHMgfHwgIWVtaXR0ZXIuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSAwO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKGVtaXR0ZXIuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gMTtcbiAgZWxzZVxuICAgIHJldCA9IGVtaXR0ZXIuX2V2ZW50c1t0eXBlXS5sZW5ndGg7XG4gIHJldHVybiByZXQ7XG59O1xuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Z1bmN0aW9uJztcbn1cblxuZnVuY3Rpb24gaXNOdW1iZXIoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnbnVtYmVyJztcbn1cblxuZnVuY3Rpb24gaXNPYmplY3QoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiBhcmcgIT09IG51bGw7XG59XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09PSB2b2lkIDA7XG59XG4iLCJ2YXIgaGFzT3duID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcbnZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG52YXIgdW5kZWZpbmVkO1xuXG52YXIgaXNQbGFpbk9iamVjdCA9IGZ1bmN0aW9uIGlzUGxhaW5PYmplY3Qob2JqKSB7XG5cdCd1c2Ugc3RyaWN0Jztcblx0aWYgKCFvYmogfHwgdG9TdHJpbmcuY2FsbChvYmopICE9PSAnW29iamVjdCBPYmplY3RdJykge1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXG5cdHZhciBoYXNfb3duX2NvbnN0cnVjdG9yID0gaGFzT3duLmNhbGwob2JqLCAnY29uc3RydWN0b3InKTtcblx0dmFyIGhhc19pc19wcm9wZXJ0eV9vZl9tZXRob2QgPSBvYmouY29uc3RydWN0b3IgJiYgb2JqLmNvbnN0cnVjdG9yLnByb3RvdHlwZSAmJiBoYXNPd24uY2FsbChvYmouY29uc3RydWN0b3IucHJvdG90eXBlLCAnaXNQcm90b3R5cGVPZicpO1xuXHQvLyBOb3Qgb3duIGNvbnN0cnVjdG9yIHByb3BlcnR5IG11c3QgYmUgT2JqZWN0XG5cdGlmIChvYmouY29uc3RydWN0b3IgJiYgIWhhc19vd25fY29uc3RydWN0b3IgJiYgIWhhc19pc19wcm9wZXJ0eV9vZl9tZXRob2QpIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblxuXHQvLyBPd24gcHJvcGVydGllcyBhcmUgZW51bWVyYXRlZCBmaXJzdGx5LCBzbyB0byBzcGVlZCB1cCxcblx0Ly8gaWYgbGFzdCBvbmUgaXMgb3duLCB0aGVuIGFsbCBwcm9wZXJ0aWVzIGFyZSBvd24uXG5cdHZhciBrZXk7XG5cdGZvciAoa2V5IGluIG9iaikge31cblxuXHRyZXR1cm4ga2V5ID09PSB1bmRlZmluZWQgfHwgaGFzT3duLmNhbGwob2JqLCBrZXkpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBleHRlbmQoKSB7XG5cdCd1c2Ugc3RyaWN0Jztcblx0dmFyIG9wdGlvbnMsIG5hbWUsIHNyYywgY29weSwgY29weUlzQXJyYXksIGNsb25lLFxuXHRcdHRhcmdldCA9IGFyZ3VtZW50c1swXSxcblx0XHRpID0gMSxcblx0XHRsZW5ndGggPSBhcmd1bWVudHMubGVuZ3RoLFxuXHRcdGRlZXAgPSBmYWxzZTtcblxuXHQvLyBIYW5kbGUgYSBkZWVwIGNvcHkgc2l0dWF0aW9uXG5cdGlmICh0eXBlb2YgdGFyZ2V0ID09PSAnYm9vbGVhbicpIHtcblx0XHRkZWVwID0gdGFyZ2V0O1xuXHRcdHRhcmdldCA9IGFyZ3VtZW50c1sxXSB8fCB7fTtcblx0XHQvLyBza2lwIHRoZSBib29sZWFuIGFuZCB0aGUgdGFyZ2V0XG5cdFx0aSA9IDI7XG5cdH0gZWxzZSBpZiAoKHR5cGVvZiB0YXJnZXQgIT09ICdvYmplY3QnICYmIHR5cGVvZiB0YXJnZXQgIT09ICdmdW5jdGlvbicpIHx8IHRhcmdldCA9PSBudWxsKSB7XG5cdFx0dGFyZ2V0ID0ge307XG5cdH1cblxuXHRmb3IgKDsgaSA8IGxlbmd0aDsgKytpKSB7XG5cdFx0b3B0aW9ucyA9IGFyZ3VtZW50c1tpXTtcblx0XHQvLyBPbmx5IGRlYWwgd2l0aCBub24tbnVsbC91bmRlZmluZWQgdmFsdWVzXG5cdFx0aWYgKG9wdGlvbnMgIT0gbnVsbCkge1xuXHRcdFx0Ly8gRXh0ZW5kIHRoZSBiYXNlIG9iamVjdFxuXHRcdFx0Zm9yIChuYW1lIGluIG9wdGlvbnMpIHtcblx0XHRcdFx0c3JjID0gdGFyZ2V0W25hbWVdO1xuXHRcdFx0XHRjb3B5ID0gb3B0aW9uc1tuYW1lXTtcblxuXHRcdFx0XHQvLyBQcmV2ZW50IG5ldmVyLWVuZGluZyBsb29wXG5cdFx0XHRcdGlmICh0YXJnZXQgPT09IGNvcHkpIHtcblx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIFJlY3Vyc2UgaWYgd2UncmUgbWVyZ2luZyBwbGFpbiBvYmplY3RzIG9yIGFycmF5c1xuXHRcdFx0XHRpZiAoZGVlcCAmJiBjb3B5ICYmIChpc1BsYWluT2JqZWN0KGNvcHkpIHx8IChjb3B5SXNBcnJheSA9IEFycmF5LmlzQXJyYXkoY29weSkpKSkge1xuXHRcdFx0XHRcdGlmIChjb3B5SXNBcnJheSkge1xuXHRcdFx0XHRcdFx0Y29weUlzQXJyYXkgPSBmYWxzZTtcblx0XHRcdFx0XHRcdGNsb25lID0gc3JjICYmIEFycmF5LmlzQXJyYXkoc3JjKSA/IHNyYyA6IFtdO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRjbG9uZSA9IHNyYyAmJiBpc1BsYWluT2JqZWN0KHNyYykgPyBzcmMgOiB7fTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHQvLyBOZXZlciBtb3ZlIG9yaWdpbmFsIG9iamVjdHMsIGNsb25lIHRoZW1cblx0XHRcdFx0XHR0YXJnZXRbbmFtZV0gPSBleHRlbmQoZGVlcCwgY2xvbmUsIGNvcHkpO1xuXG5cdFx0XHRcdC8vIERvbid0IGJyaW5nIGluIHVuZGVmaW5lZCB2YWx1ZXNcblx0XHRcdFx0fSBlbHNlIGlmIChjb3B5ICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0XHR0YXJnZXRbbmFtZV0gPSBjb3B5O1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0Ly8gUmV0dXJuIHRoZSBtb2RpZmllZCBvYmplY3Rcblx0cmV0dXJuIHRhcmdldDtcbn07XG5cbiIsIm1vZHVsZS5leHBvcnRzID0gaW5oZXJpdHNcblxuZnVuY3Rpb24gaW5oZXJpdHMgKGMsIHAsIHByb3RvKSB7XG4gIHByb3RvID0gcHJvdG8gfHwge31cbiAgdmFyIGUgPSB7fVxuICA7W2MucHJvdG90eXBlLCBwcm90b10uZm9yRWFjaChmdW5jdGlvbiAocykge1xuICAgIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHMpLmZvckVhY2goZnVuY3Rpb24gKGspIHtcbiAgICAgIGVba10gPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHMsIGspXG4gICAgfSlcbiAgfSlcbiAgYy5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHAucHJvdG90eXBlLCBlKVxuICBjLnN1cGVyID0gcFxufVxuXG4vL2Z1bmN0aW9uIENoaWxkICgpIHtcbi8vICBDaGlsZC5zdXBlci5jYWxsKHRoaXMpXG4vLyAgY29uc29sZS5lcnJvcihbdGhpc1xuLy8gICAgICAgICAgICAgICAgLHRoaXMuY29uc3RydWN0b3Jcbi8vICAgICAgICAgICAgICAgICx0aGlzLmNvbnN0cnVjdG9yID09PSBDaGlsZFxuLy8gICAgICAgICAgICAgICAgLHRoaXMuY29uc3RydWN0b3Iuc3VwZXIgPT09IFBhcmVudFxuLy8gICAgICAgICAgICAgICAgLE9iamVjdC5nZXRQcm90b3R5cGVPZih0aGlzKSA9PT0gQ2hpbGQucHJvdG90eXBlXG4vLyAgICAgICAgICAgICAgICAsT2JqZWN0LmdldFByb3RvdHlwZU9mKE9iamVjdC5nZXRQcm90b3R5cGVPZih0aGlzKSlcbi8vICAgICAgICAgICAgICAgICA9PT0gUGFyZW50LnByb3RvdHlwZVxuLy8gICAgICAgICAgICAgICAgLHRoaXMgaW5zdGFuY2VvZiBDaGlsZFxuLy8gICAgICAgICAgICAgICAgLHRoaXMgaW5zdGFuY2VvZiBQYXJlbnRdKVxuLy99XG4vL2Z1bmN0aW9uIFBhcmVudCAoKSB7fVxuLy9pbmhlcml0cyhDaGlsZCwgUGFyZW50KVxuLy9uZXcgQ2hpbGRcbiIsIi8vIGFjdG9yLmpzXHJcbi8vIERlZmluZXMgdGhlIGFjdG9yIGV2ZW50IHVzZWQgdGhyb3VnaG91dCB0aGUgcGFya1xyXG5cclxudmFyIEV2ZW50ID0gcmVxdWlyZShcInRwcC1ldmVudFwiKTtcclxudmFyIGluaGVyaXRzID0gcmVxdWlyZShcImluaGVyaXRzXCIpO1xyXG52YXIgZXh0ZW5kID0gcmVxdWlyZShcImV4dGVuZFwiKTtcclxuXHJcbnZhciBHTE9CQUxfU0NBTEVVUCA9IDEuNjU7XHJcbnZhciBFVkVOVF9QTEFORV9OT1JNQUwgPSBuZXcgVEhSRUUuVmVjdG9yMygwLCAxLCAwKTtcclxuLyoqXHJcbiAqIEFuIGFjdG9yIGlzIGFueSBldmVudCByZXByZXNlbnRpbmcgYSBwZXJzb24sIHBva2Vtb24sIG9yIG90aGVyIGVudGl0eSB0aGF0XHJcbiAqIG1heSBtb3ZlIGFyb3VuZCBpbiB0aGUgd29ybGQgb3IgZmFjZSBhIGRpcmVjdGlvbi4gQWN0b3JzIG1heSBoYXZlIGRpZmZlcmVudFxyXG4gKiBiZWhhdmlvcnMsIHNvbWUgY29tbW9uIG9uZXMgcHJlZGVmaW5lZCBpbiB0aGlzIGZpbGUuXHJcbiAqL1xyXG5mdW5jdGlvbiBBY3RvcihiYXNlLCBvcHRzKSB7XHJcblx0RXZlbnQuY2FsbCh0aGlzLCBiYXNlLCBvcHRzKTtcclxuXHRcclxuXHR0aGlzLm9uKFwidGlja1wiLCB0aGlzLl9hY3RvclRpY2spO1xyXG5cdHRoaXMub24oXCJpbnRlcmFjdGVkXCIsIHRoaXMuX2FjdG9ySW50ZXJhY3RGYWNlKTtcclxuXHR0aGlzLmZhY2luZyA9IG5ldyBUSFJFRS5WZWN0b3IzKDAsIDAsIDEpO1xyXG59XHJcbmluaGVyaXRzKEFjdG9yLCBFdmVudCk7XHJcbmV4dGVuZChBY3Rvci5wcm90b3R5cGUsIHtcclxuXHRzcHJpdGU6IG51bGwsXHJcblx0c3ByaXRlX2Zvcm1hdDogbnVsbCxcclxuXHRcclxuXHRzaGFkb3cgOiB0cnVlLFxyXG5cdFxyXG5cdC8vLy8vLy8vLy8vLy8vLy8gUHJvcGVydHkgU2V0dGVycyAvLy8vLy8vLy8vLy8vLy8vL1xyXG5cdHNjYWxlOiAxLFxyXG5cdFxyXG5cdHNldFNjYWxlIDogZnVuY3Rpb24oc2NhbGUpIHtcclxuXHRcdHRoaXMuc2NhbGUgPSBzY2FsZTtcclxuXHRcdHNjYWxlICo9IEdMT0JBTF9TQ0FMRVVQO1xyXG5cdFx0dGhpcy5hdmF0YXJfc3ByaXRlLnNjYWxlLnNldChzY2FsZSwgc2NhbGUsIHNjYWxlKTtcclxuXHR9LFxyXG5cdFxyXG5cdC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vIEF2YXRhciAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblx0YXZhdGFyX25vZGUgOiBudWxsLFxyXG5cdGF2YXRhcl9zcHJpdGUgOiBudWxsLFxyXG5cdGF2YXRhcl9mb3JtYXQgOiBudWxsLFxyXG5cdGF2YXRhcl90ZXggOiBudWxsLFxyXG5cdFxyXG5cdGdldEF2YXRhciA6IGZ1bmN0aW9uKG1hcCl7IFxyXG5cdFx0aWYgKHRoaXMuYXZhdGFyX25vZGUpIHJldHVybiB0aGlzLmF2YXRhcl9ub2RlO1xyXG5cdFx0XHJcblx0XHR2YXIgbm9kZSA9IHRoaXMuYXZhdGFyX25vZGUgPSBuZXcgVEhSRUUuT2JqZWN0M0QoKTtcclxuXHRcdFxyXG5cdFx0bm9kZS5hZGQodGhpcy5fYXZhdGFyX2NyZWF0ZVNwcml0ZShtYXApKTtcclxuXHRcdG5vZGUuYWRkKHRoaXMuX2F2YXRhcl9jcmVhdGVTaGFkb3dDYXN0ZXIoKSk7XHJcblx0XHRcclxuXHRcdHJldHVybiBub2RlO1xyXG5cdFx0XHJcblx0fSxcclxuXHRcclxuXHRfYXZhdGFyX2NyZWF0ZVNoYWRvd0Nhc3RlcjogZnVuY3Rpb24oKSB7XHJcblx0XHR2YXIgbWF0ID0gbmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKCk7XHJcblx0XHRtYXQudmlzaWJsZSA9IGZhbHNlOyAvL1RoZSBvYmplY3Qgd29uJ3QgcmVuZGVyLCBidXQgdGhlIHNoYWRvdyBzdGlsbCB3aWxsXHJcblx0XHRcclxuXHRcdHZhciBnZW9tID0gbmV3IFRIUkVFLlNwaGVyZUdlb21ldHJ5KDAuMywgNywgMyk7XHJcblx0XHRcclxuXHRcdHZhciBtZXNoID0gbmV3IFRIUkVFLk1lc2goZ2VvbSwgbWF0KTtcclxuXHRcdC8vbWVzaC52aXNpYmxlID0gZmFsc2U7IC8vP1xyXG5cdFx0bWVzaC5jYXN0U2hhZG93ID0gdHJ1ZTtcclxuXHRcdG1lc2gucG9zaXRpb24uc2V0KDAsIDAuNSwgMCk7XHJcblx0XHRyZXR1cm4gbWVzaDtcclxuXHR9LFxyXG5cdFxyXG5cdF9hdmF0YXJfY3JlYXRlU3ByaXRlIDogZnVuY3Rpb24obWFwKSB7XHJcblx0XHR2YXIgc2VsZiA9IHRoaXM7XHJcblx0XHR2YXIgaW1nID0gbmV3IEltYWdlKCk7XHJcblx0XHR2YXIgdGV4dHVyZSA9IHNlbGYuYXZhdGFyX3RleCA9IG5ldyBUSFJFRS5UZXh0dXJlKGltZyk7XHJcblx0XHRcclxuXHRcdHRoaXMuX19vbkxvYWRTcHJpdGUoaW1nLCBERUZfU1BSSVRFX0ZPUk1BVCwgdGV4dHVyZSk7XHJcblx0XHRpbWcuc3JjID0gREVGX1NQUklURTtcclxuXHRcdFxyXG5cdFx0dGV4dHVyZS5tYWdGaWx0ZXIgPSBUSFJFRS5OZWFyZXN0RmlsdGVyO1xyXG5cdFx0dGV4dHVyZS5taW5GaWx0ZXIgPSBUSFJFRS5OZWFyZXN0RmlsdGVyO1xyXG5cdFx0dGV4dHVyZS5yZXBlYXQgPSBuZXcgVEhSRUUuVmVjdG9yMigwLjI1LCAwLjI1KTtcclxuXHRcdHRleHR1cmUub2Zmc2V0ID0gbmV3IFRIUkVFLlZlY3RvcjIoMCwgMCk7XHJcblx0XHR0ZXh0dXJlLndyYXBTID0gVEhSRUUuTWlycm9yZWRSZXBlYXRXcmFwcGluZztcclxuXHRcdHRleHR1cmUud3JhcFQgPSBUSFJFRS5NaXJyb3JlZFJlcGVhdFdyYXBwaW5nO1xyXG5cdFx0dGV4dHVyZS5nZW5lcmF0ZU1pcG1hcHMgPSBmYWxzZTtcclxuXHRcdC8vVE9ETyBNaXJyb3JlZFJlcGVhdFdyYXBwaW5nLCBhbmQganVzdCB1c2UgYSBuZWdhdGl2ZSB4IHV2IHZhbHVlLCB0byBmbGlwIGEgc3ByaXRlXHJcblx0XHRcclxuXHRcdHNlbGYuYXZhdGFyX2Zvcm1hdCA9IGdldFNwcml0ZUZvcm1hdChERUZfU1BSSVRFX0ZPUk1BVCk7XHJcblx0XHRcclxuXHRcdHZhciBtYXQgLyo9IHNlbGYuYXZhdGFyX21hdCovID0gbmV3IFRIUkVFLlNwcml0ZU1hdGVyaWFsKHtcclxuXHRcdFx0bWFwOiB0ZXh0dXJlLFxyXG5cdFx0XHRjb2xvcjogMHhGRkZGRkYsXHJcblx0XHRcdHRyYW5zcGFyZW50OiB0cnVlLFxyXG5cdFx0fSk7XHJcblx0XHRcclxuXHRcdGN1cnJlbnRNYXAubWFya0xvYWRpbmcoKTtcclxuXHRcdHRoaXMuX2F2YXRhcl9sb2FkU3ByaXRlKG1hcCwgdGV4dHVyZSk7XHJcblx0XHRcclxuXHRcdHZhciBzcHJpdGUgPSBzZWxmLmF2YXRhcl9zcHJpdGUgPSBuZXcgVEhSRUUuU3ByaXRlKG1hdCk7XHJcblx0XHRzZWxmLnNldFNjYWxlKHNlbGYuc2NhbGUpO1xyXG5cdFx0XHJcblx0XHRyZXR1cm4gc3ByaXRlO1xyXG5cdH0sXHJcblx0XHJcblx0X2F2YXRhcl9sb2FkU3ByaXRlIDogZnVuY3Rpb24obWFwLCB0ZXh0dXJlKSB7XHJcblx0XHR2YXIgc2VsZiA9IHRoaXM7XHJcblx0XHRtYXAubG9hZFNwcml0ZShzZWxmLmlkLCBzZWxmLnNwcml0ZSwgZnVuY3Rpb24oZXJyLCB1cmwpe1xyXG5cdFx0XHRpZiAoZXJyKSB7XHJcblx0XHRcdFx0Y29uc29sZS5lcnJvcihcIkVSUk9SIExPQURJTkcgU1BSSVRFOiBcIiwgZXJyKTtcclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHRcdFx0XHJcblx0XHRcdHZhciBpbWcgPSBuZXcgSW1hZ2UoKTtcclxuXHRcdFx0c2VsZi5fX29uTG9hZFNwcml0ZShpbWcsIHNlbGYuc3ByaXRlX2Zvcm1hdCwgdGV4dHVyZSk7XHJcblx0XHRcdGltZy5zcmMgPSB1cmw7XHJcblx0XHR9KTtcclxuXHR9LFxyXG5cdFxyXG5cdF9fb25Mb2FkU3ByaXRlIDogZnVuY3Rpb24oaW1nLCBmb3JtYXQsIHRleHR1cmUpIHtcclxuXHRcdHZhciBzZWxmID0gdGhpcztcclxuXHRcdHZhciBmID0gZnVuY3Rpb24oKSB7XHJcblx0XHRcdHRleHR1cmUuaW1hZ2UgPSBpbWc7XHJcblx0XHRcdFxyXG5cdFx0XHRzZWxmLmF2YXRhcl9mb3JtYXQgPSBnZXRTcHJpdGVGb3JtYXQoZm9ybWF0KTtcclxuXHRcdFx0dGV4dHVyZS5yZXBlYXQuc2V0KHNlbGYuYXZhdGFyX2Zvcm1hdC5yZXBlYXQsIHNlbGYuYXZhdGFyX2Zvcm1hdC5yZXBlYXQpO1xyXG5cclxuXHRcdFx0dGV4dHVyZS5uZWVkc1VwZGF0ZSA9IHRydWU7XHJcblx0XHRcdFxyXG5cdFx0XHRzZWxmLnNob3dBbmltYXRpb25GcmFtZShcImQwXCIpO1xyXG5cdFx0XHRzZWxmLnBsYXlBbmltYXRpb24oXCJzdGFuZFwiKTtcclxuXHRcdFx0aW1nLnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJsb2FkXCIsIGYpO1xyXG5cdFx0XHRjdXJyZW50TWFwLm1hcmtMb2FkRmluaXNoZWQoKTtcclxuXHRcdH1cclxuXHRcdGltZy5vbihcImxvYWRcIiwgZik7XHJcblx0fSxcclxuXHRcclxuXHQvLy8vLy8vLy8vLy8vLy8vLy8vIEFuaW1hdGlvbiAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblx0X2FuaW1hdGlvblN0YXRlIDogbnVsbCxcclxuXHRmYWNpbmcgOiBudWxsLFxyXG5cdFxyXG5cdF9pbml0QW5pbWF0aW9uU3RhdGUgOiBmdW5jdGlvbigpIHtcclxuXHRcdGlmICghdGhpcy5fYW5pbWF0aW9uU3RhdGUpXHJcblx0XHRcdHRoaXMuX2FuaW1hdGlvblN0YXRlID0ge1xyXG5cdFx0XHRcdGN1cnJBbmltIDogbnVsbCwgLy8gQW5pbWF0aW9uIG9iamVjdFxyXG5cdFx0XHRcdGN1cnJGcmFtZSA6IG51bGwsIC8vIEN1cnJlbnRseSBkaXNwbGF5ZWQgc3ByaXRlIGZyYW1lIG5hbWVcclxuXHRcdFx0XHRuZXh0QW5pbSA6IG51bGwsIC8vIEFuaW1hdGlvbiBvYmplY3QgaW4gcXVldWVcclxuXHRcdFx0XHRcclxuXHRcdFx0XHRzdG9wTmV4dFRyYW5zaXRpb246IGZhbHNlLCAvL1N0b3AgYXQgdGhlIG5leHQgdHJhbnNpdGlvbiBmcmFtZSwgdG8gc2hvcnQtc3RvcCB0aGUgXCJCdW1wXCIgYW5pbWF0aW9uXHJcblx0XHRcdH07XHJcblx0XHRyZXR1cm4gdGhpcy5fYW5pbWF0aW9uU3RhdGU7XHJcblx0fSxcclxuXHRcclxuXHRnZXREaXJlY3Rpb25GYWNpbmcgOiBmdW5jdGlvbigpIHtcclxuXHRcdHZhciBkaXJ2ZWN0b3IgPSB0aGlzLmZhY2luZy5jbG9uZSgpO1xyXG5cdFx0ZGlydmVjdG9yLmFwcGx5UXVhdGVybmlvbiggY3VycmVudE1hcC5jYW1lcmEucXVhdGVybmlvbiApO1xyXG5cdFx0ZGlydmVjdG9yLnByb2plY3RPblBsYW5lKEVWRU5UX1BMQU5FX05PUk1BTCkubm9ybWFsaXplKCk7XHJcblx0XHRcclxuXHRcdHZhciB4ID0gZGlydmVjdG9yLngsIHkgPSBkaXJ2ZWN0b3IuejtcclxuXHRcdC8vIGNvbnNvbGUubG9nKFwiRElSRkFDSU5HOlwiLCB4LCB5KTtcclxuXHRcdGlmIChNYXRoLmFicyh4KSA+IE1hdGguYWJzKHkpKSB7IC8vRGlyZWN0aW9uIHZlY3RvciBpcyBwb2ludGluZyBhbG9uZyB4IGF4aXNcclxuXHRcdFx0aWYgKHggPiAwKSByZXR1cm4gXCJsXCI7XHJcblx0XHRcdGVsc2UgcmV0dXJuIFwiclwiO1xyXG5cdFx0fSBlbHNlIHsgLy9EaXJlY3Rpb24gdmVjdG9yIGlzIHBvaW50aW5nIGFsb25nIHkgYXhpc1xyXG5cdFx0XHRpZiAoeSA+IDApIHJldHVybiBcImRcIjtcclxuXHRcdFx0ZWxzZSByZXR1cm4gXCJ1XCI7XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gXCJkXCI7XHJcblx0fSxcclxuXHRcclxuXHRzaG93QW5pbWF0aW9uRnJhbWUgOiBmdW5jdGlvbihmcmFtZSkge1xyXG5cdFx0dmFyIHN0YXRlID0gdGhpcy5faW5pdEFuaW1hdGlvblN0YXRlKCk7XHJcblx0XHRcclxuXHRcdHZhciBkZWYgPSB0aGlzLmF2YXRhcl9mb3JtYXQuZnJhbWVzW2ZyYW1lXTtcclxuXHRcdGlmICghZGVmKSB7XHJcblx0XHRcdGNvbnNvbGUud2FybihcIkVSUk9SIFwiLCB0aGlzLmlkLCBcIjogQW5pbWF0aW9uIGZyYW1lIGRvZXNuJ3QgZXhpc3Q6XCIsIGZyYW1lKTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cdFx0c3RhdGUuZnJhbWVOYW1lID0gZnJhbWU7XHJcblx0XHRcclxuXHRcdHZhciBmbGlwID0gZmFsc2U7XHJcblx0XHRpZiAodHlwZW9mIGRlZiA9PSBcInN0cmluZ1wiKSB7IC8vcmVkaXJlY3RcclxuXHRcdFx0ZGVmID0gdGhpcy5hdmF0YXJfZm9ybWF0LmZyYW1lc1tkZWZdO1xyXG5cdFx0XHRmbGlwID0gdHJ1ZTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0dmFyIHUgPSBkZWZbMF0gKiB0aGlzLmF2YXRhcl9mb3JtYXQucmVwZWF0O1xyXG5cdFx0dmFyIHYgPSAxIC0gKChkZWZbMV0rMSkgKiB0aGlzLmF2YXRhcl9mb3JtYXQucmVwZWF0KTtcclxuXHRcdC8vRm9yIHNvbWUgcmVhc29uLCBvZmZzZXRzIGFyZSBmcm9tIHRoZSBCT1RUT00gbGVmdD8hXHJcblx0XHRcclxuXHRcdGlmIChmbGlwICYmIHRoaXMuYXZhdGFyX2Zvcm1hdC5mbGlwKSB7XHJcblx0XHRcdHUgPSAwIC0gKGRlZlswXS0xKSAqIHRoaXMuYXZhdGFyX2Zvcm1hdC5yZXBlYXQ7IC8vVE9ETyB0ZXN0XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdHRoaXMuYXZhdGFyX3RleC5vZmZzZXQuc2V0KHUsIHYpOyBcclxuXHRcdHRoaXMuYXZhdGFyX3RleC5uZWVkc1VwZGF0ZSA9IHRydWU7XHJcblx0fSxcclxuXHRcclxuXHRwbGF5QW5pbWF0aW9uIDogZnVuY3Rpb24oYW5pbU5hbWUsIG9wdHMpIHtcclxuXHRcdHZhciBzdGF0ZSA9IHRoaXMuX2luaXRBbmltYXRpb25TdGF0ZSgpO1xyXG5cdFx0aWYgKCFvcHRzKSBvcHRzID0ge307XHJcblx0XHRcclxuXHRcdHZhciBhbmltID0gdGhpcy5hdmF0YXJfZm9ybWF0LmFuaW1zW2FuaW1OYW1lXTtcclxuXHRcdGlmICghYW5pbSkge1xyXG5cdFx0XHRjb25zb2xlLndhcm4oXCJFUlJPUlwiLCB0aGlzLmlkLCBcIjogQW5pbWF0aW9uIG5hbWUgZG9lc24ndCBleGlzdDpcIiwgYW5pbU5hbWUpO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblx0XHRzdGF0ZS5uZXh0QW5pbSA9IGFuaW07XHJcblx0XHRhbmltLnNwZWVkID0gKG9wdHMuc3BlZWQgPT0gdW5kZWZpbmVkKT8gMSA6IG9wdHMuc3BlZWQ7XHJcblx0XHRzdGF0ZS5zdG9wTmV4dFRyYW5zaXRpb24gPSBvcHRzLnN0b3BOZXh0VHJhbnNpdGlvbiB8fCBmYWxzZTtcclxuXHR9LFxyXG5cdFxyXG5cdHN0b3BBbmltYXRpb24gOiBmdW5jdGlvbigpIHtcclxuXHRcdHZhciBzdGF0ZSA9IHRoaXMuX2luaXRBbmltYXRpb25TdGF0ZSgpO1xyXG5cdFx0XHJcblx0XHQvLyBzdGF0ZS5ydW5uaW5nID0gZmFsc2U7XHJcblx0XHQvLyBzdGF0ZS5xdWV1ZSA9IG51bGw7XHJcblx0XHQvLyBzdGF0ZS5zdG9wRnJhbWUgPSBudWxsO1xyXG5cdFx0dGhpcy5lbWl0KFwiYW5pbS1lbmRcIiwgc3RhdGUuYW5pbU5hbWUpO1xyXG5cdH0sXHJcblx0XHJcblx0X3RpY2tfZG9BbmltYXRpb246IGZ1bmN0aW9uKGRlbHRhKSB7XHJcblx0XHR2YXIgc3RhdGUgPSB0aGlzLl9hbmltYXRpb25TdGF0ZTtcclxuXHRcdHZhciBDQSA9IHN0YXRlLmN1cnJBbmltO1xyXG5cdFx0aWYgKCFDQSkgQ0EgPSBzdGF0ZS5jdXJyQW5pbSA9IHN0YXRlLm5leHRBbmltO1xyXG5cdFx0aWYgKCFDQSkgcmV0dXJuO1xyXG5cdFx0XHJcblx0XHRDQS5hZHZhbmNlKGRlbHRhKTtcclxuXHRcdFxyXG5cdFx0aWYgKHN0YXRlLm5leHRBbmltICYmIENBLmNhblRyYW5zaXRpb24oKSkge1xyXG5cdFx0XHQvL1N3aXRjaCBhbmltYXRpb25zXHJcblx0XHRcdENBLnJlc2V0KCk7XHJcblx0XHRcdENBID0gc3RhdGUuY3VyckFuaW0gPSBzdGF0ZS5uZXh0QW5pbTtcclxuXHRcdFx0c3RhdGUubmV4dEFuaW0gPSBudWxsO1xyXG5cdFx0XHRcclxuXHRcdFx0aWYgKHN0YXRlLnN0b3BOZXh0VHJhbnNpdGlvbikge1xyXG5cdFx0XHRcdHRoaXMucGxheUFuaW1hdGlvbihcInN0YW5kXCIpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdHZhciBkaXIgPSB0aGlzLmdldERpcmVjdGlvbkZhY2luZygpO1xyXG5cdFx0dmFyIGZyYW1lID0gQ0EuZ2V0RnJhbWVUb0Rpc3BsYXkoZGlyKTtcclxuXHRcdGlmIChmcmFtZSAhPSBzdGF0ZS5jdXJyRnJhbWUpIHtcclxuXHRcdFx0dGhpcy5zaG93QW5pbWF0aW9uRnJhbWUoZnJhbWUpO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0fSxcclxuXHRcclxuXHQvLy8vLy8vLy8vLy8vLy8vLy8vIE1vdmVtZW50IGFuZCBQYXRoaW5nIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHRfcGF0aGluZ1N0YXRlIDogbnVsbCxcclxuXHRcclxuXHRfaW5pdFBhdGhpbmdTdGF0ZSA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0aWYgKCF0aGlzLl9wYXRoaW5nU3RhdGUpXHJcblx0XHRcdHRoaXMuX3BhdGhpbmdTdGF0ZSA9IHtcclxuXHRcdFx0XHRxdWV1ZTogW10sXHJcblx0XHRcdFx0bW92aW5nOiBmYWxzZSxcclxuXHRcdFx0XHRzcGVlZDogMSxcclxuXHRcdFx0XHRkZWx0YTogMCwgLy90aGUgZGVsdGEgZnJvbSBzcmMgdG8gZGVzdFxyXG5cdFx0XHRcdGp1bXBpbmcgOiBmYWxzZSxcclxuXHRcdFx0XHQvLyBkaXI6IFwiZFwiLFxyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdGRlc3RMb2NDOiBuZXcgVEhSRUUuVmVjdG9yMygpLnNldCh0aGlzLmxvY2F0aW9uKSwgLy9jb2xsaXNpb24gbWFwIGxvY2F0aW9uXHJcblx0XHRcdFx0ZGVzdExvYzM6IG5ldyBUSFJFRS5WZWN0b3IzKCksIC8vd29ybGQgc3BhY2UgbG9jYXRpb25cclxuXHRcdFx0XHRzcmNMb2NDOiBuZXcgVEhSRUUuVmVjdG9yMygpLnNldCh0aGlzLmxvY2F0aW9uKSxcclxuXHRcdFx0XHRzcmNMb2MzOiBuZXcgVEhSRUUuVmVjdG9yMygpLFxyXG5cdFx0XHRcdG1pZHBvaW50T2Zmc2V0OiBuZXcgVEhSRUUuVmVjdG9yMygpLFxyXG5cdFx0XHR9O1xyXG5cdFx0cmV0dXJuIHRoaXMuX3BhdGhpbmdTdGF0ZTtcclxuXHR9LFxyXG5cdFxyXG5cdHBhdGhUbyA6IGZ1bmN0aW9uKHgsIHkpIHtcclxuXHRcdHZhciBzdGF0ZSA9IHRoaXMuX2luaXRQYXRoaW5nU3RhdGUoKTtcclxuXHRcdFxyXG5cdFx0Y29uc29sZS5lcnJvcih0aGlzLmlkLCBcIjogUGF0aGluZyBoYXMgbm90IGJlZW4gaW1wbGVtZW50ZWQgeWV0IVwiKTtcclxuXHR9LFxyXG5cdFxyXG5cdGNsZWFyUGF0aGluZyA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0dmFyIHN0YXRlID0gdGhpcy5faW5pdFBhdGhpbmdTdGF0ZSgpO1xyXG5cdFx0c3RhdGUucXVldWUubGVuZ3RoID0gMDtcclxuXHR9LFxyXG5cdFxyXG5cdG1vdmVEaXIgOiBmdW5jdGlvbihkaXIpIHtcclxuXHRcdHZhciB4ID0gdGhpcy5sb2NhdGlvbi54O1xyXG5cdFx0dmFyIHkgPSB0aGlzLmxvY2F0aW9uLnk7XHJcblx0XHR2YXIgeiA9IHRoaXMubG9jYXRpb24uejtcclxuXHRcdHN3aXRjaCAoZGlyKSB7XHJcblx0XHRcdGNhc2UgXCJkXCI6IGNhc2UgXCJkb3duXCI6XHR5ICs9IDE7IGJyZWFrO1xyXG5cdFx0XHRjYXNlIFwidVwiOiBjYXNlIFwidXBcIjpcdHkgLT0gMTsgYnJlYWs7XHJcblx0XHRcdGNhc2UgXCJsXCI6IGNhc2UgXCJsZWZ0XCI6XHR4IC09IDE7IGJyZWFrO1xyXG5cdFx0XHRjYXNlIFwiclwiOiBjYXNlIFwicmlnaHRcIjpcdHggKz0gMTsgYnJlYWs7XHJcblx0XHR9XHJcblx0XHR0aGlzLm1vdmVUbyh4LCB5LCB6KTtcclxuXHR9LFxyXG5cdFxyXG5cdGZhY2VEaXIgOiBmdW5jdGlvbih4LCB5KSB7XHJcblx0XHR0aGlzLmZhY2luZy5zZXQoLXgsIDAsIHkpO1xyXG5cdH0sXHJcblx0XHJcblx0bW92ZVRvIDogZnVuY3Rpb24oeCwgeSwgbGF5ZXIsIGJ5cGFzcykgeyAvL2J5cGFzcyBXYWxrbWFzayBjaGVja1xyXG5cdFx0dmFyIHN0YXRlID0gdGhpcy5faW5pdFBhdGhpbmdTdGF0ZSgpO1xyXG5cdFx0dmFyIHNyYyA9IHRoaXMubG9jYXRpb247XHJcblx0XHRsYXllciA9IChsYXllciA9PSB1bmRlZmluZWQpPyB0aGlzLmxvY2F0aW9uLnogOiBsYXllcjtcclxuXHRcdFxyXG5cdFx0dGhpcy5mYWNpbmcuc2V0KHNyYy54LXgsIDAsIHktc3JjLnkpO1xyXG5cdFx0XHJcblx0XHR2YXIgd2Fsa21hc2sgPSBjdXJyZW50TWFwLmNhbldhbGtCZXR3ZWVuKHNyYy54LCBzcmMueSwgeCwgeSk7XHJcblx0XHRpZiAoYnlwYXNzICE9PSB1bmRlZmluZWQpIHdhbGttYXNrID0gYnlwYXNzO1xyXG5cdFx0aWYgKCF3YWxrbWFzaykge1xyXG5cdFx0XHRjb25zb2xlLndhcm4odGhpcy5pZCwgXCI6IENhbm5vdCB3YWxrIHRvIGxvY2F0aW9uXCIsIFwiKFwiK3grXCIsXCIreStcIilcIik7XHJcblx0XHRcdGN1cnJlbnRNYXAuZGlzcGF0Y2goeCwgeSwgXCJidW1wZWRcIiwgdGhpcy5mYWNpbmcpO1xyXG5cdFx0XHQvLyB0aGlzLmVtaXQoXCJidW1wZWRcIiwgdGhpcy5mYWNpbmcpOyAvL2dldERpckZyb21Mb2MoeCwgeSwgc3JjLngsIHNyYy55KSk7XHJcblx0XHRcdHRoaXMucGxheUFuaW1hdGlvbihcImJ1bXBcIiwgeyBzdG9wTmV4dFRyYW5zaXRpb246IHRydWUgfSk7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHRcdGlmICgod2Fsa21hc2sgJiAweDgpID09IDB4OCkge1xyXG5cdFx0XHQvLyBUcmFuc2l0aW9uIG5vdyB0byBhbm90aGVyIGxheWVyXHJcblx0XHRcdHZhciB0ID0gY3VycmVudE1hcC5nZXRMYXllclRyYW5zaXRpb24oeCwgeSwgdGhpcy5sb2NhdGlvbi56KTtcclxuXHRcdFx0Y29uc29sZS5sb2coXCJMYXllciBUcmFuc2l0aW9uOiBcIiwgdCk7XHJcblx0XHRcdHggPSB0Lng7IHkgPSB0Lnk7IGxheWVyID0gdC5sYXllcjtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0dmFyIGFuaW1vcHRzID0ge307XHJcblx0XHRzdGF0ZS5taWRwb2ludE9mZnNldC5zZXQoMCwgMCwgMCk7XHJcblx0XHRzdGF0ZS5zcmNMb2NDLnNldChzcmMpO1xyXG5cdFx0c3RhdGUuc3JjTG9jMy5zZXQoY3VycmVudE1hcC5nZXQzRFRpbGVMb2NhdGlvbihzcmMpKTtcclxuXHRcdHN0YXRlLmRlc3RMb2NDLnNldCh4LCB5LCBsYXllcik7XHJcblx0XHRzdGF0ZS5kZXN0TG9jMy5zZXQoY3VycmVudE1hcC5nZXQzRFRpbGVMb2NhdGlvbih4LCB5LCBsYXllcikpO1xyXG5cdFx0c3RhdGUuZGVsdGEgPSAwO1xyXG5cdFx0c3RhdGUuc3BlZWQgPSAxO1xyXG5cdFx0c3RhdGUubW92aW5nID0gdHJ1ZTtcclxuXHRcdFxyXG5cdFx0aWYgKCh3YWxrbWFzayAmIDB4MikgPT09IDB4Mikge1xyXG5cdFx0XHRzdGF0ZS5taWRwb2ludE9mZnNldC5zZXRZKDAuNik7XHJcblx0XHRcdHN0YXRlLmp1bXBpbmcgPSB0cnVlO1xyXG5cdFx0XHRTb3VuZE1hbmFnZXIucGxheVNvdW5kKFwid2Fsa19qdW1wXCIpO1xyXG5cdFx0XHRhbmltb3B0cy5zcGVlZCA9IDEuNTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0dGhpcy5wbGF5QW5pbWF0aW9uKFwid2Fsa1wiLCBhbmltb3B0cyk7XHJcblx0XHR0aGlzLmVtaXQoXCJtb3ZpbmdcIiwgc3RhdGUuc3JjTG9jQy54LCBzdGF0ZS5zcmNMb2NDLnksIHN0YXRlLmRlc3RMb2NDLngsIHN0YXRlLmRlc3RMb2NDLnkpO1xyXG5cdH0sXHJcblx0XHJcblx0X3RpY2tfZG9Nb3ZlbWVudCA6IGZ1bmN0aW9uKGRlbHRhKSB7XHJcblx0XHR2YXIgc3RhdGUgPSB0aGlzLl9pbml0UGF0aGluZ1N0YXRlKCk7XHJcblx0XHRcclxuXHRcdHN0YXRlLmRlbHRhICs9IHN0YXRlLnNwZWVkICogKGRlbHRhICogQ09ORklHLnNwZWVkLnBhdGhpbmcpO1xyXG5cdFx0dmFyIGFscGhhID0gTWF0aC5jbGFtcChzdGF0ZS5kZWx0YSk7XHJcblx0XHR2YXIgYmV0YSA9IE1hdGguc2luKGFscGhhICogTWF0aC5QSSk7XHJcblx0XHR0aGlzLmF2YXRhcl9ub2RlLnBvc2l0aW9uLnNldCggXHJcblx0XHRcdC8vTGVycCBiZXR3ZWVuIHNyYyBhbmQgZGVzdCAoYnVpbHQgaW4gbGVycCgpIGlzIGRlc3RydWN0aXZlLCBhbmQgc2VlbXMgYmFkbHkgZG9uZSlcclxuXHRcdFx0c3RhdGUuc3JjTG9jMy54ICsgKChzdGF0ZS5kZXN0TG9jMy54IC0gc3RhdGUuc3JjTG9jMy54KSAqIGFscGhhKSArIChzdGF0ZS5taWRwb2ludE9mZnNldC54ICogYmV0YSksXHJcblx0XHRcdHN0YXRlLnNyY0xvYzMueSArICgoc3RhdGUuZGVzdExvYzMueSAtIHN0YXRlLnNyY0xvYzMueSkgKiBhbHBoYSkgKyAoc3RhdGUubWlkcG9pbnRPZmZzZXQueSAqIGJldGEpLFxyXG5cdFx0XHRzdGF0ZS5zcmNMb2MzLnogKyAoKHN0YXRlLmRlc3RMb2MzLnogLSBzdGF0ZS5zcmNMb2MzLnopICogYWxwaGEpICsgKHN0YXRlLm1pZHBvaW50T2Zmc2V0LnogKiBiZXRhKVxyXG5cdFx0KTtcclxuXHRcdFxyXG5cdFx0aWYgKHN0YXRlLmRlbHRhID4gMSkge1xyXG5cdFx0XHR0aGlzLmVtaXQoXCJtb3ZlZFwiLCBzdGF0ZS5zcmNMb2NDLngsIHN0YXRlLnNyY0xvY0MueSwgc3RhdGUuZGVzdExvY0MueCwgc3RhdGUuZGVzdExvY0MueSk7XHJcblx0XHRcdHRoaXMubG9jYXRpb24uc2V0KCBzdGF0ZS5kZXN0TG9jQyApO1xyXG5cdFx0XHRcclxuXHRcdFx0aWYgKHN0YXRlLmp1bXBpbmcpIHtcclxuXHRcdFx0XHQvL1RPRE8gcGFydGljbGUgZWZmZWN0c1xyXG5cdFx0XHRcdFNvdW5kTWFuYWdlci5wbGF5U291bmQoXCJ3YWxrX2p1bXBfbGFuZFwiKTtcclxuXHRcdFx0XHRzdGF0ZS5qdW1waW5nID0gZmFsc2U7XHJcblx0XHRcdH1cclxuXHRcdFx0XHJcblx0XHRcdHZhciBuZXh0ID0gc3RhdGUucXVldWUuc2hpZnQoKTtcclxuXHRcdFx0aWYgKCFuZXh0KSB7XHJcblx0XHRcdFx0c3RhdGUuZGVsdGEgPSAwO1xyXG5cdFx0XHRcdHN0YXRlLm1vdmluZyA9IGZhbHNlO1xyXG5cdFx0XHRcdC8vIHRoaXMuc3RvcEFuaW1hdGlvbigpO1xyXG5cdFx0XHRcdHRoaXMucGxheUFuaW1hdGlvbihcInN0YW5kXCIpO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdHRoaXMubW92ZVRvKG5leHQueCwgbmV4dC55LCBuZXh0LnopO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fSxcclxuXHRcclxuXHRcclxuXHQvLy8vLy8vLy8vLy8vLy8vLy8vLy8gUHJpdmF0ZSBNZXRob2RzIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHRcclxuXHRjYW5XYWxrT24gOiBmdW5jdGlvbigpeyByZXR1cm4gZmFsc2U7IH0sXHJcblx0XHJcblx0X25vcm1hbGl6ZUxvY2F0aW9uIDogZnVuY3Rpb24oKSB7XHJcblx0XHR2YXIgbnVtID0gRXZlbnQucHJvdG90eXBlLl9ub3JtYWxpemVMb2NhdGlvbi5jYWxsKHRoaXMpO1xyXG5cdFx0aWYgKG51bSAhPSAxIHx8ICF0aGlzLmxvY2F0aW9uKVxyXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJBY3RvcnMgY2FuIG9ubHkgYmUgaW4gb25lIHBsYWNlIGF0IGEgdGltZSEgTnVtYmVyIG9mIGxvY2F0aW9uczogXCIrbnVtKTtcclxuXHR9LFxyXG5cdFxyXG5cdF9hY3RvclRpY2sgOiBmdW5jdGlvbihkZWx0YSkge1xyXG5cdFx0Ly8gRG8gYW5pbWF0aW9uXHJcblx0XHRpZiAodGhpcy5fYW5pbWF0aW9uU3RhdGUpIFxyXG5cdFx0XHR0aGlzLl90aWNrX2RvQW5pbWF0aW9uKGRlbHRhKTtcclxuXHRcdFxyXG5cdFx0Ly8gRG8gbW92ZW1lbnRcclxuXHRcdGlmICh0aGlzLl9wYXRoaW5nU3RhdGUgJiYgdGhpcy5fcGF0aGluZ1N0YXRlLm1vdmluZylcclxuXHRcdFx0dGhpcy5fdGlja19kb01vdmVtZW50KGRlbHRhKTtcclxuXHR9LFxyXG5cdFxyXG5cdF9hY3RvckludGVyYWN0RmFjZSA6IGZ1bmN0aW9uKHZlY3Rvcikge1xyXG5cdFx0dGhpcy5mYWNpbmcgPSB2ZWN0b3IuY2xvbmUoKS5uZWdhdGUoKTtcclxuXHR9LFxyXG5cdFxyXG59KTtcclxubW9kdWxlLmV4cG9ydHMgPSBBY3RvcjtcclxuXHJcblxyXG5cclxuZnVuY3Rpb24gZ2V0RGlyRnJvbUxvYyh4MSwgeTEsIHgyLCB5Mikge1xyXG5cdHJldHVybiBuZXcgVEhSRUUuVmVjdG9yMyh4Mi14MSwgMCwgeTIteTEpO1xyXG5cdC8vIHZhciBkeCA9IHgyIC0geDE7XHJcblx0Ly8gdmFyIGR5ID0geTIgLSB5MTtcclxuXHQvLyBpZiAoTWF0aC5hYnMoZHgpID4gTWF0aC5hYnMoZHkpKSB7XHJcblx0Ly8gXHRpZiAoZHggPiAwKSB7IHJldHVybiBcInJcIjsgfVxyXG5cdC8vIFx0ZWxzZSBpZiAoZHggPCAwKSB7IHJldHVybiBcImxcIjsgfVxyXG5cdC8vIH0gZWxzZSB7XHJcblx0Ly8gXHRpZiAoZHkgPiAwKSB7IHJldHVybiBcImRcIjsgfVxyXG5cdC8vIFx0ZWxzZSBpZiAoZHkgPCAwKSB7IHJldHVybiBcInVcIjsgfVxyXG5cdC8vIH1cclxuXHQvLyByZXR1cm4gXCJkXCI7XHJcbn1cclxuXHJcblxyXG5mdW5jdGlvbiBnZXRTcHJpdGVGb3JtYXQoc3RyKSB7XHJcblx0dmFyIGZvcm1hdCA9IHN0ci5zcGxpdChcIi1cIik7XHJcblx0dmFyIG5hbWUgPSBmb3JtYXRbMF07XHJcblx0dmFyIHNpemUgPSBmb3JtYXRbMV0uc3BsaXQoXCJ4XCIpO1xyXG5cdHNpemVbMV0gPSBzaXplWzFdIHx8IHNpemVbMF07XHJcblx0XHJcblx0dmFyIGJhc2UgPSB7XHJcblx0XHR3aWR0aDogc2l6ZVswXSwgaGVpZ2h0OiBzaXplWzFdLCBmbGlwOiBmYWxzZSwgcmVwZWF0OiAwLjI1LFxyXG5cdFx0ZnJhbWVzOiB7XHJcblx0XHRcdFwidTNcIjogXCJ1MFwiLCBcImQzXCI6IFwiZDBcIiwgXCJsM1wiOiBcImwwXCIsIFwicjNcIjogXCJyMFwiLFxyXG5cdFx0fSxcclxuXHRcdGFuaW1zIDogZ2V0U3RhbmRhcmRBbmltYXRpb25zKCksXHJcblx0fTtcclxuXHRcclxuXHRzd2l0Y2ggKG5hbWUpIHtcclxuXHRcdGNhc2UgXCJwdF9ob3J6cm93XCI6IFxyXG5cdFx0XHRyZXR1cm4gZXh0ZW5kKHRydWUsIGJhc2UsIHsgXHJcblx0XHRcdFx0ZnJhbWVzOiB7XHJcblx0XHRcdFx0XHRcInUwXCI6IFsxLCAwXSwgXCJ1MVwiOiBbMSwgMV0sIFwidTJcIjogWzEsIDJdLFxyXG5cdFx0XHRcdFx0XCJkMFwiOiBbMCwgMF0sIFwiZDFcIjogWzAsIDFdLCBcImQyXCI6IFswLCAyXSxcclxuXHRcdFx0XHRcdFwibDBcIjogWzIsIDBdLCBcImwxXCI6IFsyLCAxXSwgXCJsMlwiOiBbMiwgMl0sXHJcblx0XHRcdFx0XHRcInIwXCI6IFszLCAwXSwgXCJyMVwiOiBbMywgMV0sIFwicjJcIjogWzMsIDJdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH0pO1xyXG5cdFx0Y2FzZSBcInB0X3ZlcnRjb2xcIjogXHJcblx0XHRcdHJldHVybiBleHRlbmQodHJ1ZSwgYmFzZSwgeyBcclxuXHRcdFx0XHRmcmFtZXM6IHtcclxuXHRcdFx0XHRcdFwidTBcIjogWzAsIDFdLCBcInUxXCI6IFsxLCAxXSwgXCJ1MlwiOiBbMiwgMV0sXHJcblx0XHRcdFx0XHRcImQwXCI6IFswLCAwXSwgXCJkMVwiOiBbMSwgMF0sIFwiZDJcIjogWzIsIDBdLFxyXG5cdFx0XHRcdFx0XCJsMFwiOiBbMCwgMl0sIFwibDFcIjogWzEsIDJdLCBcImwyXCI6IFsyLCAyXSxcclxuXHRcdFx0XHRcdFwicjBcIjogWzAsIDNdLCBcInIxXCI6IFsxLCAzXSwgXCJyMlwiOiBbMiwgM10sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fSk7XHJcblx0XHRjYXNlIFwiaGdfdmVydG1peFwiOiBcclxuXHRcdFx0cmV0dXJuIGV4dGVuZCh0cnVlLCBiYXNlLCB7IFxyXG5cdFx0XHRcdGZyYW1lczoge1xyXG5cdFx0XHRcdFx0XCJ1MFwiOiBbMCwgMF0sIFwidTFcIjogWzEsIDNdLCBcInUyXCI6IFsyLCAwXSxcclxuXHRcdFx0XHRcdFwiZDBcIjogWzIsIDFdLCBcImQxXCI6IFsyLCAyXSwgXCJkMlwiOiBbMiwgM10sXHJcblx0XHRcdFx0XHRcImwwXCI6IFswLCAyXSwgXCJsMVwiOiBbMCwgMV0sIFwibDJcIjogWzAsIDNdLFxyXG5cdFx0XHRcdFx0XCJyMFwiOiBbMSwgMF0sIFwicjFcIjogWzEsIDFdLCBcInIyXCI6IFsxLCAyXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9KTtcclxuXHRcdGNhc2UgXCJoZ19wb2tlcm93XCI6XHJcblx0XHRcdHJldHVybiBleHRlbmQodHJ1ZSwgYmFzZSwgeyBcclxuXHRcdFx0XHRmcmFtZXM6IHsgLy8gcG9pbnRlcnMgdG8gYW5vdGhlciBpbWFnZSBpbmRpY2F0ZXMgdGhhdCBpbWFnZSBzaG91bGQgYmUgZmxpcHBlZCwgaWYgZmxpcD10cnVlXHJcblx0XHRcdFx0XHRcInUwXCI6IG51bGwsIFwidTFcIjogWzAsIDBdLCBcInUyXCI6IFsxLCAwXSxcclxuXHRcdFx0XHRcdFwiZDBcIjogbnVsbCwgXCJkMVwiOiBbMCwgMV0sIFwiZDJcIjogWzEsIDFdLFxyXG5cdFx0XHRcdFx0XCJsMFwiOiBudWxsLCBcImwxXCI6IFswLCAyXSwgXCJsMlwiOiBbMSwgMl0sXHJcblx0XHRcdFx0XHRcInIwXCI6IG51bGwsIFwicjFcIjogWzAsIDNdLCBcInIyXCI6IFsxLCAzXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9KTtcclxuXHRcdGNhc2UgXCJoZ19wb2tlZmxpcFwiOlxyXG5cdFx0XHRyZXR1cm4gZXh0ZW5kKHRydWUsIGJhc2UsIHsgXHJcblx0XHRcdFx0ZnJhbWVzOiB7IC8vIHBvaW50ZXJzIHRvIGFub3RoZXIgaW1hZ2UgaW5kaWNhdGVzIHRoYXQgaW1hZ2Ugc2hvdWxkIGJlIGZsaXBwZWQsIGlmIGZsaXA9dHJ1ZVxyXG5cdFx0XHRcdFx0XCJ1MFwiOiBudWxsLCBcInUxXCI6IFswLCAwXSwgXCJ1MlwiOiBbMSwgMF0sXHJcblx0XHRcdFx0XHRcImQwXCI6IG51bGwsIFwiZDFcIjogWzAsIDFdLCBcImQyXCI6IFsxLCAxXSxcclxuXHRcdFx0XHRcdFwibDBcIjogbnVsbCwgXCJsMVwiOiBbMCwgMl0sIFwibDJcIjogWzEsIDJdLFxyXG5cdFx0XHRcdFx0XCJyMFwiOiBudWxsLCBcInIxXCI6IFwibDFcIiwgICBcInIyXCI6IFwibDJcIixcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9KTtcclxuXHRcdGNhc2UgXCJid192ZXJ0cm93XCI6XHJcblx0XHRcdHJldHVybiBleHRlbmQodHJ1ZSwgYmFzZSwgeyBcclxuXHRcdFx0XHRmcmFtZXM6IHtcclxuXHRcdFx0XHRcdFwidTBcIjogWzAsIDBdLCBcInUxXCI6IFsxLCAwXSwgXCJ1MlwiOiBbMiwgMF0sXHJcblx0XHRcdFx0XHRcImQwXCI6IFswLCAxXSwgXCJkMVwiOiBbMSwgMV0sIFwiZDJcIjogWzIsIDFdLFxyXG5cdFx0XHRcdFx0XCJsMFwiOiBbMCwgMl0sIFwibDFcIjogWzEsIDJdLCBcImwyXCI6IFsyLCAyXSxcclxuXHRcdFx0XHRcdFwicjBcIjogWzAsIDNdLCBcInIxXCI6IFsxLCAzXSwgXCJyMlwiOiBbMiwgM10sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fSk7XHJcblx0XHRjYXNlIFwiYndfaG9yemZsaXBcIjpcclxuXHRcdFx0cmV0dXJuIGV4dGVuZCh0cnVlLCBiYXNlLCB7IFxyXG5cdFx0XHRcdGZyYW1lczogeyAvLyBwb2ludGVycyB0byBhbm90aGVyIGltYWdlIGluZGljYXRlcyB0aGF0IGltYWdlIHNob3VsZCBiZSBmbGlwcGVkLCBpZiBmbGlwPXRydWVcclxuXHRcdFx0XHRcdFwidTBcIjogWzAsIDBdLCBcInUxXCI6IFsxLCAwXSwgXCJ1MlwiOiBcInUxXCIsXHJcblx0XHRcdFx0XHRcImQwXCI6IFsyLCAwXSwgXCJkMVwiOiBbMywgMF0sIFwiZDJcIjogXCJkMVwiLFxyXG5cdFx0XHRcdFx0XCJsMFwiOiBbMCwgMV0sIFwibDFcIjogWzEsIDFdLCBcImwyXCI6IFsyLCAxXSxcclxuXHRcdFx0XHRcdFwicjBcIjogXCJsMFwiLCAgIFwicjFcIjogXCJsMVwiLCAgIFwicjJcIjogXCJsMlwiLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH0pO1xyXG5cdH1cclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0U3RhbmRhcmRBbmltYXRpb25zKCkge1xyXG5cdHZhciBhbmltcyA9IHt9O1xyXG5cdFxyXG5cdGFuaW1zW1wic3RhbmRcIl0gPSBuZXcgU3ByaXRlQW5pbWF0aW9uKHsgc2luZ2xlRnJhbWU6IHRydWUsIH0sIFtcclxuXHRcdHsgdTogXCJ1MFwiLCBkOiBcImQwXCIsIGw6IFwibDBcIiwgcjogXCJyMFwiLCB0cmFuczogdHJ1ZSwgcGF1c2U6IHRydWUsIH0sXHJcblx0XSk7XHJcblx0YW5pbXNbXCJ3YWxrXCJdID0gbmV3IFNwcml0ZUFuaW1hdGlvbih7IGZyYW1lTGVuZ3RoOiA1LCBrZWVwRnJhbWU6IHRydWUsIH0sIFtcclxuXHRcdHsgdTogXCJ1MVwiLCBkOiBcImQxXCIsIGw6IFwibDFcIiwgcjogXCJyMVwiLCB9LFxyXG5cdFx0eyB1OiBcInUzXCIsIGQ6IFwiZDNcIiwgbDogXCJsM1wiLCByOiBcInIzXCIsIHRyYW5zOiB0cnVlLCB9LFxyXG5cdFx0eyB1OiBcInUyXCIsIGQ6IFwiZDJcIiwgbDogXCJsMlwiLCByOiBcInIyXCIsIH0sXHJcblx0XHR7IHU6IFwidTNcIiwgZDogXCJkM1wiLCBsOiBcImwzXCIsIHI6IFwicjNcIiwgdHJhbnM6IHRydWUsIGxvb3BUbzogMCwgfSxcclxuXHRdKTtcclxuXHRhbmltc1tcImJ1bXBcIl0gPSBuZXcgU3ByaXRlQW5pbWF0aW9uKHsgZnJhbWVMZW5ndGg6IDEwLCBrZWVwRnJhbWU6IHRydWUsIH0sIFtcclxuXHRcdHsgdTogXCJ1MVwiLCBkOiBcImQxXCIsIGw6IFwibDFcIiwgcjogXCJyMVwiLCBzZng6IFwid2Fsa19idW1wXCIsIH0sXHJcblx0XHR7IHU6IFwidTBcIiwgZDogXCJkMFwiLCBsOiBcImwwXCIsIHI6IFwicjBcIiwgdHJhbnM6IHRydWUsIH0sXHJcblx0XHR7IHU6IFwidTJcIiwgZDogXCJkMlwiLCBsOiBcImwyXCIsIHI6IFwicjJcIiwgc2Z4OiBcIndhbGtfYnVtcFwiLCB9LFxyXG5cdFx0eyB1OiBcInUwXCIsIGQ6IFwiZDBcIiwgbDogXCJsMFwiLCByOiBcInIwXCIsIHRyYW5zOiB0cnVlLCBsb29wVG86IDAsIH0sXHJcblx0XSk7XHJcblx0YW5pbXNbXCJ3YXJwX2F3YXlcIl0gPSBuZXcgU3ByaXRlQW5pbWF0aW9uKHsgc2luZ2xlRGlyOiBcImRcIiB9LCBbXHJcblx0XHR7IGQ6IFwiZDBcIiwgZnJhbWVMZW5ndGg6IDgsIH0sIC8vMFxyXG5cdFx0eyBkOiBcImwwXCIsIGZyYW1lTGVuZ3RoOiA4LCB9LFxyXG5cdFx0eyBkOiBcInUwXCIsIGZyYW1lTGVuZ3RoOiA4LCB9LFxyXG5cdFx0eyBkOiBcInIwXCIsIGZyYW1lTGVuZ3RoOiA4LCB9LFxyXG5cdFx0eyBkOiBcImQwXCIsIGZyYW1lTGVuZ3RoOiA3LCB9LCAvLzRcclxuXHRcdHsgZDogXCJsMFwiLCBmcmFtZUxlbmd0aDogNywgfSxcclxuXHRcdHsgZDogXCJ1MFwiLCBmcmFtZUxlbmd0aDogNywgfSxcclxuXHRcdHsgZDogXCJyMFwiLCBmcmFtZUxlbmd0aDogNywgfSxcclxuXHRcdHsgZDogXCJkMFwiLCBmcmFtZUxlbmd0aDogNSwgfSwgLy84XHJcblx0XHR7IGQ6IFwibDBcIiwgZnJhbWVMZW5ndGg6IDUsIH0sXHJcblx0XHR7IGQ6IFwidTBcIiwgZnJhbWVMZW5ndGg6IDUsIH0sXHJcblx0XHR7IGQ6IFwicjBcIiwgZnJhbWVMZW5ndGg6IDUsIH0sXHJcblx0XHR7IGQ6IFwiZDBcIiwgZnJhbWVMZW5ndGg6IDMsIH0sIC8vMTJcclxuXHRcdHsgZDogXCJsMFwiLCBmcmFtZUxlbmd0aDogMywgfSxcclxuXHRcdHsgZDogXCJ1MFwiLCBmcmFtZUxlbmd0aDogMywgfSxcclxuXHRcdHsgZDogXCJyMFwiLCBmcmFtZUxlbmd0aDogMywgfSxcclxuXHRcdHsgZDogXCJkMFwiLCBmcmFtZUxlbmd0aDogMSwgfSwgLy8xNlxyXG5cdFx0eyBkOiBcImwwXCIsIGZyYW1lTGVuZ3RoOiAxLCB9LFxyXG5cdFx0eyBkOiBcInUwXCIsIGZyYW1lTGVuZ3RoOiAxLCB9LFxyXG5cdFx0eyBkOiBcInIwXCIsIGZyYW1lTGVuZ3RoOiAxLCB9LFxyXG5cdFx0eyBkOiBcImQwXCIsIGZyYW1lTGVuZ3RoOiAwLCB0cmFuczogdHJ1ZSwgfSwgLy8yMFxyXG5cdFx0eyBkOiBcImwwXCIsIGZyYW1lTGVuZ3RoOiAwLCB0cmFuczogdHJ1ZSwgfSxcclxuXHRcdHsgZDogXCJ1MFwiLCBmcmFtZUxlbmd0aDogMCwgdHJhbnM6IHRydWUsIH0sXHJcblx0XHR7IGQ6IFwicjBcIiwgZnJhbWVMZW5ndGg6IDAsIHRyYW5zOiB0cnVlLCBsb29wVG86IDIwIH0sXHJcblx0XSk7XHJcblx0YW5pbXNbXCJ3YXJwX2luXCJdID0gbmV3IFNwcml0ZUFuaW1hdGlvbih7IHNpbmdsZURpcjogXCJkXCIgfSwgW1xyXG5cdFx0eyBkOiBcImQwXCIsIGZyYW1lTGVuZ3RoOiAxLCB9LCAvLzBcclxuXHRcdHsgZDogXCJyMFwiLCBmcmFtZUxlbmd0aDogMSwgfSxcclxuXHRcdHsgZDogXCJ1MFwiLCBmcmFtZUxlbmd0aDogMSwgfSxcclxuXHRcdHsgZDogXCJsMFwiLCBmcmFtZUxlbmd0aDogMSwgfSxcclxuXHRcdHsgZDogXCJkMFwiLCBmcmFtZUxlbmd0aDogMywgfSwgLy80XHJcblx0XHR7IGQ6IFwicjBcIiwgZnJhbWVMZW5ndGg6IDMsIH0sXHJcblx0XHR7IGQ6IFwidTBcIiwgZnJhbWVMZW5ndGg6IDMsIH0sXHJcblx0XHR7IGQ6IFwibDBcIiwgZnJhbWVMZW5ndGg6IDMsIH0sXHJcblx0XHR7IGQ6IFwiZDBcIiwgZnJhbWVMZW5ndGg6IDUsIH0sIC8vOFxyXG5cdFx0eyBkOiBcInIwXCIsIGZyYW1lTGVuZ3RoOiA1LCB9LFxyXG5cdFx0eyBkOiBcInUwXCIsIGZyYW1lTGVuZ3RoOiA1LCB9LFxyXG5cdFx0eyBkOiBcImwwXCIsIGZyYW1lTGVuZ3RoOiA1LCB9LFxyXG5cdFx0eyBkOiBcImQwXCIsIGZyYW1lTGVuZ3RoOiA3LCB9LCAvLzEyXHJcblx0XHR7IGQ6IFwicjBcIiwgZnJhbWVMZW5ndGg6IDcsIH0sXHJcblx0XHR7IGQ6IFwidTBcIiwgZnJhbWVMZW5ndGg6IDcsIH0sXHJcblx0XHR7IGQ6IFwibDBcIiwgZnJhbWVMZW5ndGg6IDgsIH0sXHJcblx0XHR7IGQ6IFwiZDBcIiwgZnJhbWVMZW5ndGg6IDgsIH0sIC8vMTZcclxuXHRcdHsgZDogXCJyMFwiLCBmcmFtZUxlbmd0aDogOSwgfSxcclxuXHRcdHsgZDogXCJ1MFwiLCBmcmFtZUxlbmd0aDogOSwgfSxcclxuXHRcdHsgZDogXCJsMFwiLCBmcmFtZUxlbmd0aDogMTAsIH0sXHJcblx0XHR7IGQ6IFwiZDBcIiwgZnJhbWVMZW5ndGg6IDEsIHRyYW5zOiB0cnVlLCB9LFxyXG5cdF0pO1xyXG5cdFxyXG5cdHJldHVybiBhbmltcztcclxufVxyXG5cclxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHJcbmZ1bmN0aW9uIFNwcml0ZUFuaW1hdGlvbihvcHRzLCBmcmFtZXMpIHtcclxuXHR0aGlzLm9wdGlvbnMgPSBvcHRzO1xyXG5cdHRoaXMuZnJhbWVzID0gZnJhbWVzO1xyXG5cdFxyXG5cdHRoaXMud2FpdFRpbWUgPSB0aGlzLmZyYW1lc1t0aGlzLmN1cnJGcmFtZV0uZnJhbWVMZW5ndGggfHwgdGhpcy5vcHRpb25zLmZyYW1lTGVuZ3RoO1xyXG59XHJcblNwcml0ZUFuaW1hdGlvbi5wcm90b3R5cGUgPSB7XHJcblx0b3B0aW9uczogbnVsbCxcclxuXHRmcmFtZXMgOiBudWxsLFxyXG5cdFxyXG5cdHdhaXRUaW1lIDogMCxcclxuXHRjdXJyRnJhbWU6IDAsXHJcblx0c3BlZWQgOiAxLFxyXG5cdHBhdXNlZCA6IGZhbHNlLFxyXG5cdFxyXG5cdC8qKiBBZHZhbmNlZCB0aGUgYW5pbWF0aW9uIGJ5IHRoZSBnaXZlbiBhbW91bnQgb2YgZGVsdGEgdGltZS4gKi9cclxuXHRhZHZhbmNlIDogZnVuY3Rpb24oZGVsdGFUaW1lKSB7XHJcblx0XHRpZiAodGhpcy5vcHRpb25zLnNpbmdsZUZyYW1lKSByZXR1cm47XHJcblx0XHRpZiAodGhpcy5wYXVzZWQpIHJldHVybjtcclxuXHRcdFxyXG5cdFx0aWYgKHRoaXMud2FpdFRpbWUgPiAwKSB7XHJcblx0XHRcdHRoaXMud2FpdFRpbWUgLT0gKHRoaXMuc3BlZWQgKiAoZGVsdGFUaW1lICogQ09ORklHLnNwZWVkLmFuaW1hdGlvbikpO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdHZhciBsb29wID0gdGhpcy5mcmFtZXNbdGhpcy5jdXJyRnJhbWVdLmxvb3BUbztcclxuXHRcdGlmIChsb29wICE9PSB1bmRlZmluZWQpIHRoaXMuY3VyckZyYW1lID0gbG9vcDtcclxuXHRcdGVsc2UgdGhpcy5jdXJyRnJhbWUrKztcclxuXHRcdFxyXG5cdFx0aWYgKHRoaXMuY3VyckZyYW1lID49IHRoaXMuZnJhbWVzLmxlbmd0aCkge1xyXG5cdFx0XHR0aGlzLmN1cnJGcmFtZSA9IHRoaXMuZnJhbWVzLmxlbmd0aC0xO1xyXG5cdFx0XHR0aGlzLnBhdXNlZCA9IHRydWU7XHJcblx0XHRcdGNvbnNvbGUud2FybihcIkFuaW1hdGlvbiBoYXMgY29tcGxldGVkIVwiKTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHQvL25ldyBmcmFtZVxyXG5cdFx0XHJcblx0XHR0aGlzLndhaXRUaW1lID0gdGhpcy5mcmFtZXNbdGhpcy5jdXJyRnJhbWVdLmZyYW1lTGVuZ3RoIHx8IHRoaXMub3B0aW9ucy5mcmFtZUxlbmd0aDtcclxuXHRcdFxyXG5cdFx0aWYgKHRoaXMuZnJhbWVzW3RoaXMuY3VyckZyYW1lXS5wYXVzZSkgdGhpcy5wYXVzZWQgPSB0cnVlO1xyXG5cdFx0XHJcblx0XHRpZiAodGhpcy5mcmFtZXNbdGhpcy5jdXJyRnJhbWVdLnNmeCkgXHJcblx0XHRcdFNvdW5kTWFuYWdlci5wbGF5U291bmQodGhpcy5mcmFtZXNbdGhpcy5jdXJyRnJhbWVdLnNmeCk7XHJcblx0fSxcclxuXHRcclxuXHQvKiogSWYgdGhpcyBhbmltYXRpb24gaXMgb24gYSBwYXVzZSBmcmFtZSAqL1xyXG5cdHJlc3VtZSA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0dGhpcy5wYXVzZWQgPSBmYWxzZTtcclxuXHR9LFxyXG5cdFxyXG5cdC8qKiBSZXNldCB0aGUgYW5pbWF0aW9uIHBhcmFtZXRlcnMuIENhbGxlZCB3aGVuIHRoaXMgYW5pbWF0aW9uIGlzIG5vIGxvbmdlciB1c2VkLiAqL1xyXG5cdHJlc2V0IDogZnVuY3Rpb24oKSB7XHJcblx0XHR0aGlzLnBhdXNlZCA9IGZhbHNlO1xyXG5cdFx0aWYgKHRoaXMub3B0aW9ucy5rZWVwRnJhbWUpIHJldHVybjtcclxuXHRcdHRoaXMuY3VyckZyYW1lID0gMDtcclxuXHRcdHRoaXMud2FpdFRpbWUgPSB0aGlzLmZyYW1lc1t0aGlzLmN1cnJGcmFtZV0uZnJhbWVMZW5ndGggfHwgdGhpcy5vcHRpb25zLmZyYW1lTGVuZ3RoO1xyXG5cdFx0dGhpcy5zcGVlZCA9IDE7XHJcblx0fSxcclxuXHRcclxuXHQvKiogSWYgdGhpcyBhbmltYXRpb24gaXMgb24gYSBmcmFtZSB0aGF0IGNhbiB0cmFuc2l0aW9uIHRvIGFub3RoZXIgYW5pbWF0aW9uLiAqL1xyXG5cdGNhblRyYW5zaXRpb24gOiBmdW5jdGlvbigpIHtcclxuXHRcdHJldHVybiB0aGlzLmZyYW1lc1t0aGlzLmN1cnJGcmFtZV0udHJhbnM7XHJcblx0fSxcclxuXHRcclxuXHQvKiogUmV0dXJucyB0aGUgbmFtZSBvZiB0aGUgZnJhbWUgdG8gZGlzcGxheSB0aGlzIGZyYW1lLiAqL1xyXG5cdGdldEZyYW1lVG9EaXNwbGF5IDogZnVuY3Rpb24oZGlyKSB7XHJcblx0XHRpZiAodGhpcy5vcHRpb25zLnNpbmdsZURpcikgZGlyID0gdGhpcy5vcHRpb25zLnNpbmdsZURpcjtcclxuXHRcdHJldHVybiB0aGlzLmZyYW1lc1t0aGlzLmN1cnJGcmFtZV1bZGlyXTtcclxuXHR9LFxyXG59OyIsIi8vIGNvbnRyb2xsZXIuanNcclxuLy8gVGhpcyBjbGFzcyBoYW5kbGVzIGlucHV0IGFuZCBjb252ZXJ0cyBpdCB0byBjb250cm9sIHNpZ25hbHNcclxuXHJcbnZhciBpbmhlcml0cyA9IHJlcXVpcmUoXCJpbmhlcml0c1wiKTtcclxudmFyIGV4dGVuZCA9IHJlcXVpcmUoXCJleHRlbmRcIik7XHJcbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKFwiZXZlbnRzXCIpLkV2ZW50RW1pdHRlcjtcclxuXHJcbi8vIFRPRE8gaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvR3VpZGUvQVBJL0dhbWVwYWRcclxuXHJcbmZ1bmN0aW9uIENvbnRyb2xNYW5hZ2VyKCkge1xyXG5cdHZhciBzZWxmID0gdGhpcztcclxuXHQkKGRvY3VtZW50KS5rZXlkb3duKGZ1bmN0aW9uKGUpIHsgc2VsZi5vbktleURvd24oZSk7IH0pO1xyXG5cdCQoZG9jdW1lbnQpLmtleXVwKGZ1bmN0aW9uKGUpIHsgc2VsZi5vbktleVVwKGUpOyB9KTtcclxuXHRcclxuXHR0aGlzLnNldEtleUNvbmZpZygpO1xyXG59XHJcbmluaGVyaXRzKENvbnRyb2xNYW5hZ2VyLCBFdmVudEVtaXR0ZXIpO1xyXG5leHRlbmQoQ29udHJvbE1hbmFnZXIucHJvdG90eXBlLCB7XHJcblx0aW5wdXRDb250ZXh0IDogXCJnYW1lXCIsXHJcblx0XHJcblx0a2V5c19jb25maWcgOiB7XHJcblx0XHRVcDogWzM4LCBcIlVwXCIsIDg3LCBcIndcIl0sIFxyXG5cdFx0RG93bjogWzQwLCBcIkRvd25cIiwgODMsIFwic1wiXSwgXHJcblx0XHRMZWZ0OiBbMzcsIFwiTGVmdFwiLCA2NSwgXCJhXCJdLCBcclxuXHRcdFJpZ2h0OiBbMzksIFwiUmlnaHRcIiwgNjgsIFwiZFwiXSxcclxuXHRcdEludGVyYWN0OiBbMTMsIFwiRW50ZXJcIiwgMzIsIFwiIFwiXSxcclxuXHRcdEZvY3VzQ2hhdDogWzE5MSwgXCIvXCJdLFxyXG5cdH0sXHJcblx0XHJcblx0a2V5c19hY3RpdmUgOiB7fSxcclxuXHRcclxuXHRrZXlzX2Rvd24gOiB7XHJcblx0XHRVcDogZmFsc2UsIERvd246IGZhbHNlLFxyXG5cdFx0TGVmdDogZmFsc2UsIFJpZ2h0OiBmYWxzZSxcclxuXHRcdEludGVyYWN0OiBmYWxzZSwgRm9jdXNDaGF0OiBmYWxzZSxcclxuXHR9LFxyXG5cdFxyXG5cdGlzRG93biA6IGZ1bmN0aW9uKGtleSkge1xyXG5cdFx0cmV0dXJuIHRoaXMua2V5c19kb3duW2tleV07XHJcblx0fSxcclxuXHRcclxuXHRzZXRLZXlDb25maWcgOiBmdW5jdGlvbigpIHtcclxuXHRcdHRoaXMua2V5c19hY3RpdmUgPSBleHRlbmQodHJ1ZSwge30sIHRoaXMua2V5c19jb25maWcpO1xyXG5cdH0sXHJcblx0XHJcblx0b25LZXlEb3duIDogZnVuY3Rpb24oZSkge1xyXG5cdFx0Zm9yICh2YXIgYWN0aW9uIGluIHRoaXMua2V5c19hY3RpdmUpIHtcclxuXHRcdFx0dmFyIGtleXMgPSB0aGlzLmtleXNfYWN0aXZlW2FjdGlvbl07XHJcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRcdGlmIChlLndoaWNoID09IGtleXNbaV0pIHtcclxuXHRcdFx0XHRcdC8vIEtleSBpcyBub3cgZG93biFcclxuXHRcdFx0XHRcdHRoaXMuZW1pdEtleShhY3Rpb24sIHRydWUpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH0sXHJcblx0b25LZXlVcCA6IGZ1bmN0aW9uIChlKSB7XHJcblx0XHRmb3IgKHZhciBhY3Rpb24gaW4gdGhpcy5rZXlzX2FjdGl2ZSkge1xyXG5cdFx0XHR2YXIga2V5cyA9IHRoaXMua2V5c19hY3RpdmVbYWN0aW9uXTtcclxuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdFx0aWYgKGUud2hpY2ggPT0ga2V5c1tpXSkge1xyXG5cdFx0XHRcdFx0Ly8gS2V5IGlzIG5vdyB1cCFcclxuXHRcdFx0XHRcdHRoaXMuZW1pdEtleShhY3Rpb24sIGZhbHNlKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9LFxyXG5cdFxyXG5cdGVtaXRLZXkgOiBmdW5jdGlvbihhY3Rpb24sIGRvd24pIHtcclxuXHRcdGlmICh0aGlzLmtleXNfZG93blthY3Rpb25dICE9IGRvd24pIHtcclxuXHRcdFx0dGhpcy5rZXlzX2Rvd25bYWN0aW9uXSA9IGRvd247XHJcblx0XHRcdHRoaXMuZW1pdChcImNvbnRyb2wtYWN0aW9uXCIsIGFjdGlvbiwgZG93bik7XHJcblx0XHR9XHJcblx0fSxcclxuXHRcclxufSk7XHJcbm1vZHVsZS5leHBvcnRzID0gbmV3IENvbnRyb2xNYW5hZ2VyKCk7XHJcbiIsIi8vIGV2ZW50LmpzXHJcbi8vIERlZmluZXMgdGhlIGJhc2UgZXZlbnQgdXNlZCB0aHJvdWdob3V0IHRoZSBwYXJrLlxyXG5cclxuLy8gRml0dGluZ2x5LCBFdmVudCBpcyBhIHN1YmNsYXNzIG9mIG5vZGUuanMncyBFdmVudEVtaXR0ZXIgY2xhc3MuXHJcbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKFwiZXZlbnRzXCIpLkV2ZW50RW1pdHRlcjtcclxudmFyIGluaGVyaXRzID0gcmVxdWlyZShcImluaGVyaXRzXCIpO1xyXG52YXIgZXh0ZW5kID0gcmVxdWlyZShcImV4dGVuZFwiKTtcclxuXHJcbi8qKlxyXG4gKiBBbiBldmVudCBpcyBhbnkgaW50ZXJhY3RhYmxlIG9yIGFuaW1hdGluZyBvYmplY3QgaW4gdGhlIGdhbWUuXHJcbiAqIFRoaXMgaW5jbHVkZXMgdGhpbmdzIHJhbmdpbmcgZnJvbSBzaWducywgdG8gcGVvcGxlL3Bva2Vtb24uXHJcbiAqIEFuIGV2ZW50OlxyXG4gKlx0LSBUYWtlcyB1cCBhdCBsZWFzdCBvbmUgdGlsZSBvbiB0aGUgbWFwXHJcbiAqXHQtIENhbiBiZSBpbnRlcmFjdGVkIHdpdGggYnkgaW4tZ2FtZSB0YWxraW5nIG9yIG9uLXNjcmVlbiBjbGlja1xyXG4gKlx0LSBNYXkgYmUgcmVwcmVzZW50ZWQgaW4tZ2FtZSBieSBhIHNwcml0ZVxyXG4gKlx0LSBNYXkgZGVjaWRlLCB1cG9uIGNyZWF0aW9uLCB0byBub3QgYXBwZWFyIG9uIHRoZSBtYXAuXHJcbiAqL1xyXG5mdW5jdGlvbiBFdmVudChiYXNlLCBvcHRzKSB7XHJcblx0RXZlbnRFbWl0dGVyLmNhbGwodGhpcyk7XHJcblx0XHJcblx0ZXh0ZW5kKHRoaXMsIGJhc2UsIG9wdHMpO1xyXG5cdFxyXG5cdHRoaXMuX25vcm1hbGl6ZUxvY2F0aW9uKCk7XHJcblx0XHJcblx0aWYgKHRoaXMub25FdmVudHMpIHtcclxuXHRcdHZhciBrZXlzID0gT2JqZWN0LmtleXModGhpcy5vbkV2ZW50cyk7XHJcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGtleXMubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0dGhpcy5vbihrZXlzW2ldLCB0aGlzLm9uRXZlbnRzW2tleXNbaV1dKTtcclxuXHRcdH1cclxuXHRcdGRlbGV0ZSB0aGlzLm9uRXZlbnRzO1xyXG5cdH1cclxufVxyXG5pbmhlcml0cyhFdmVudCwgRXZlbnRFbWl0dGVyKTtcclxuZXh0ZW5kKEV2ZW50LnByb3RvdHlwZSwge1xyXG5cdGlkIDogbnVsbCxcclxuXHRlbmFibGVkIDogZmFsc2UsXHJcblx0dmlzaWJsZSA6IHRydWUsXHJcblx0XHJcblx0bG9jYXRpb24gOiBudWxsLCAvLyBFdmVudHMgd2l0aCBhIHNpbmdsZSBsb2NhdGlvbiBhcmUgb3B0aW1pemVkIGZvciBpdFxyXG5cdGxvY2F0aW9ucyA6IG51bGwsIC8vIEV2ZW50cyB3aXRoIG11bHRpcGxlIGxvY2F0aW9ucyBhcmUgb3B0aW1pemVkIGZvciB0aGF0IGFsc29cclxuXHRcclxuXHR0b1N0cmluZyA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0aWYgKCF0aGlzLmlkKSByZXR1cm4gXCI8TG9jYWwgb3IgVW5uYW1lZCBFdmVudD5cIjtcclxuXHRcdHJldHVybiB0aGlzLmlkO1xyXG5cdH0sXHJcblx0XHJcblx0c2hvdWxkQXBwZWFyIDogZnVuY3Rpb24oKXsgcmV0dXJuIHRydWU7IH0sXHJcblx0Y2FuV2Fsa09uIDogZnVuY3Rpb24oKXsgcmV0dXJuIHRydWU7IH0sXHJcblx0XHJcblx0LyoqIFJldHVybnMgYW4gb2JqZWN0IHRvIHJlcHJlc2VudCB0aGlzIGV2ZW50IGluIDNEIHNwYWNlLCBvciBudWxsIGlmIHRoZXJlIHNob3VsZG4ndCBiZSBvbmUuICovXHJcblx0Z2V0QXZhdGFyIDogZnVuY3Rpb24oKXsgcmV0dXJuIG51bGw7IH0sXHJcblx0XHJcblx0b25FdmVudHMgOiBudWxsLCAvL2Egb2JqZWN0LCBldmVudC1uYW1lcyAtPiBmdW5jdGlvbnMgdG8gY2FsbCwgdG8gYmUgcmVnaXN0ZXJlZCBpbiBjb25zdHJ1Y3RvclxyXG5cdFxyXG5cdGNhbk1vdmUgOiBmdW5jdGlvbigpIHtcclxuXHRcdC8vSWYgd2Ugb25seSBoYXZlIDEgbG9jYXRpb24sIHRoZW4gd2UgY2FuIG1vdmVcclxuXHRcdHJldHVybiAhIXRoaXMubG9jYXRpb24gJiYgIXRoaXMubG9jYXRpb25zO1xyXG5cdH0sXHJcblx0XHJcblx0bW92ZVRvIDogZnVuY3Rpb24oeCwgeSkge1xyXG5cdFx0aWYgKCF0aGlzLmNhbk1vdmUoKSlcclxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiVGhpcyBldmVudCBpcyBpbiBzZXZlcmFsIHBsYWNlcyBhdCBvbmNlLCBhbmQgY2Fubm90IG1vdmVUbyFcIik7XHJcblx0XHRcclxuXHRcdC8vVE9ETyBxdWV1ZSB1cCBhIG1vdmVcclxuXHR9LFxyXG5cdFxyXG5cdF9ub3JtYWxpemVMb2NhdGlvbiA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0aWYgKHRoaXMubG9jYXRpb24pIHtcclxuXHRcdFx0Ly9JZiB3ZSBoYXZlIGEgc2luZ3VsYXIgbG9jYXRpb24gc2V0XHJcblx0XHRcdGlmICh0aGlzLmxvY2F0aW9ucykgLy8gQXMgbG9uZyBhcyB3ZSBkb24ndCBhbHNvIGhhdmUgYSBsaXN0LCBpdHMgZmluZVxyXG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcihcIkV2ZW50IHdhcyBpbml0aWFsaXplZCB3aXRoIGJvdGggbG9jYXRpb24gYW5kIGxvY2F0aW9ucyEgVGhleSBjYW5ub3QgYmUgYm90aCBkZWZpbmVkIVwiKTtcclxuXHRcdFx0XHJcblx0XHRcdHZhciBsb2MgPSB0aGlzLmxvY2F0aW9uO1xyXG5cdFx0XHRpZiAoJC5pc0FycmF5KGxvYykgJiYgbG9jLmxlbmd0aCA9PSAyICYmIHR5cGVvZiBsb2NbMF0gPT0gXCJudW1iZXJcIiAmJiB0eXBlb2YgbG9jWzFdID09IFwibnVtYmVyXCIpIFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0bG9jID0gbmV3IFRIUkVFLlZlY3RvcjIobG9jWzBdLCBsb2NbMV0pO1xyXG5cdFx0XHR9IFxyXG5cdFx0XHRlbHNlIGlmICgkLmlzQXJyYXkobG9jKSAmJiBsb2MubGVuZ3RoID09IDMgXHJcblx0XHRcdFx0JiYgdHlwZW9mIGxvY1swXSA9PSBcIm51bWJlclwiICYmIHR5cGVvZiBsb2NbMV0gPT0gXCJudW1iZXJcIiAmJiB0eXBlb2YgbG9jWzJdID09IFwibnVtYmVyXCIpIFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0bG9jID0gbmV3IFRIUkVFLlZlY3RvcjMobG9jWzBdLCBsb2NbMV0sIGxvY1syXSk7XHJcblx0XHRcdH0gXHJcblx0XHRcdGVsc2UgaWYgKCEobG9jIGluc3RhbmNlb2YgVEhSRUUuVmVjdG9yMiB8fCBsb2MgaW5zdGFuY2VvZiBUSFJFRS5WZWN0b3IzKSkgXHJcblx0XHRcdHtcclxuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJDb3VsZCBub3Qgbm9ybWFsaXplIGxvY2F0aW9uIG9mIFwiK3RoaXMuaWQrXCIhXCIpO1xyXG5cdFx0XHR9XHJcblx0XHRcdHRoaXMubG9jYXRpb24gPSBsb2M7XHJcblx0XHRcdHJldHVybiAxO1xyXG5cdFx0fVxyXG5cdFx0dmFyIG9yZ2xvYyA9IHRoaXMubG9jYXRpb25zO1xyXG5cdFx0dmFyIGxvY3MgPSBudWxsO1xyXG5cdFx0XHJcblx0XHRpZiAoJC5pc0FycmF5KG9yZ2xvYykpIHtcclxuXHRcdFx0dmFyIHR5cGUgPSBudWxsLCBuZXdUeXBlID0gbnVsbDtcclxuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBvcmdsb2MubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0XHRpZiAodHlwZW9mIG9yZ2xvY1tpXSA9PSBcIm51bWJlclwiKVxyXG5cdFx0XHRcdFx0bmV3VHlwZSA9IFwibnVtYmVyXCI7XHJcblx0XHRcdFx0ZWxzZSBpZiAob3JnbG9jW2ldIGluc3RhbmNlb2YgVEhSRUUuVmVjdG9yMilcclxuXHRcdFx0XHRcdG5ld1R5cGUgPSBcInZlY3RvclwiO1xyXG5cdFx0XHRcdGVsc2UgaWYgKG9yZ2xvY1tpXSBpbnN0YW5jZW9mIFRIUkVFLlZlY3RvcjMpXHJcblx0XHRcdFx0XHRuZXdUeXBlID0gXCJ2ZWN0b3JcIjtcclxuXHRcdFx0XHRlbHNlIGlmICgkLmlzQXJyYXkob3JnbG9jW2ldKSlcclxuXHRcdFx0XHRcdG5ld1R5cGUgPSBcImFycmF5XCI7XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0aWYgKCF0eXBlKSB0eXBlID0gbmV3VHlwZTtcclxuXHRcdFx0XHRpZiAodHlwZSAhPSBuZXdUeXBlKSB7XHJcblx0XHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJDb3VsZCBub3Qgbm9ybWFsaXplIGxvY2F0aW9ucyBvZiBcIit0aGlzLmlkK1wiIVwiKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdFx0aWYgKHR5cGUgPT0gXCJudW1iZXJcIikgbG9jcyA9IF9fcGFyc2VBc051bWJlckFycmF5KG9yZ2xvYyk7XHJcblx0XHRcdGlmICh0eXBlID09IFwiYXJyYXlcIikgbG9jcyA9IF9fcGFyc2VBc0FycmF5QXJyYXkob3JnbG9jKTtcclxuXHRcdFx0aWYgKHR5cGUgPT0gXCJ2ZWN0b3JcIikgbG9jcyA9IG9yZ2xvYztcclxuXHRcdH1cclxuXHRcdGVsc2UgaWYgKCQuaXNGdW5jdGlvbihvcmdsb2MpKSB7XHJcblx0XHRcdGxvY3MgPSBvcmdsb2MuY2FsbCh0aGlzKTtcclxuXHRcdH1cclxuXHRcdGVsc2UgaWYgKG9yZ2xvYyBpbnN0YW5jZW9mIFRIUkVFLlZlY3RvcjIpIHtcclxuXHRcdFx0bG9jcyA9IFtvcmdsb2NdO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHRpZiAoIWxvY3MgfHwgISQuaXNBcnJheShsb2NzKSB8fCBsb2NzLmxlbmd0aCA9PSAwKSBcclxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiQ291bGQgbm90IG5vcm1hbGl6ZSBsb2NhdGlvbnMgb2YgXCIrdGhpcy5pZCtcIiFcIik7XHJcblx0XHRcclxuXHRcdHRoaXMubG9jYXRpb25zID0gbG9jcztcclxuXHRcdHRoaXMuX25vcm1hbGl6ZUxvY2F0aW9uID0gZnVuY3Rpb24oKXsgcmV0dXJuIGxvY3MubGVuZ3RoOyB9OyAvL2Nhbid0IG5vcm1hbGl6ZSB0d2ljZVxyXG5cdFx0cmV0dXJuIGxvY3MubGVuZ3RoO1xyXG5cdFx0XHJcblx0XHRmdW5jdGlvbiBfX3BhcnNlQXNOdW1iZXJBcnJheShsKSB7XHJcblx0XHRcdGlmIChsLmxlbmd0aCA9PSAyKSAvL3NpbmdsZSBwb2ludCBbeCwgeV1cclxuXHRcdFx0XHRyZXR1cm4gW25ldyBUSFJFRS5WZWN0b3IyKGxbMF0sIGxbMV0pXTtcclxuXHRcdFx0aWYgKGwubGVuZ3RoID09IDMpIC8vc2luZ2xlIHBvaW50IFt4LCB5LCB6XVxyXG5cdFx0XHRcdHJldHVybiBbbmV3IFRIUkVFLlZlY3RvcjMobFswXSwgbFsxXSwgbFsyXSldO1xyXG5cdFx0XHRpZiAobC5sZW5ndGggPT0gNCkgeyAvL3JlY3RhbmdsZSBbeCwgeSwgdywgaF1cclxuXHRcdFx0XHR2YXIgbiA9IFtdO1xyXG5cdFx0XHRcdGZvciAodmFyIHggPSBsWzBdOyB4IDwgbFswXStsWzJdOyB4KyspIHtcclxuXHRcdFx0XHRcdGZvciAodmFyIHkgPSBsWzFdOyB5IDwgbFsxXStsWzNdOyB5KyspIHtcclxuXHRcdFx0XHRcdFx0bi5wdXNoKG5ldyBUSFJFRS5WZWN0b3IyKHgsIHkpKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0cmV0dXJuIG47XHJcblx0XHRcdH1cclxuXHRcdFx0aWYgKGwubGVuZ3RoID09IDUpIHsgLy9yZWN0YW5nbGUgW3gsIHksIHosIHcsIGhdXHJcblx0XHRcdFx0dmFyIG4gPSBbXTtcclxuXHRcdFx0XHRmb3IgKHZhciB4ID0gbFswXTsgeCA8IGxbMF0rbFszXTsgeCsrKSB7XHJcblx0XHRcdFx0XHRmb3IgKHZhciB5ID0gbFsxXTsgeSA8IGxbMV0rbFs0XTsgeSsrKSB7XHJcblx0XHRcdFx0XHRcdG4ucHVzaChuZXcgVEhSRUUuVmVjdG9yMyh4LCB5LCBsWzJdKSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdHJldHVybiBuO1xyXG5cdFx0XHR9XHJcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIkNvdWxkIG5vdCBub3JtYWxpemUgbG9jYXRpb24ocykgb2YgXCIrdGhpcy5pZCtcIiFcIik7XHJcblx0XHR9XHJcblx0XHRmdW5jdGlvbiBfX3BhcnNlQXNBcnJheUFycmF5KGwpIHtcclxuXHRcdFx0dmFyIG4gPSBbXTtcclxuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBsLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdFx0Zm9yICh2YXIgaiA9IDA7IGogPCBsW2ldLmxlbmd0aDsgaisrKSB7XHJcblx0XHRcdFx0XHRpZiAodHlwZW9mIGxbaV1bal0gIT0gXCJudW1iZXJcIilcclxuXHRcdFx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiQ291bGQgbm90IG5vcm1hbGl6ZSBsb2NhdGlvbihzKSBvZiBcIit0aGlzLmlkK1wiIVwiKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0bi5wdXNoKF9fcGFyc2VBc051bWJlckFycmF5KGxbaV0pKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRyZXR1cm4gbjtcclxuXHRcdH1cclxuXHR9LFxyXG5cdFxyXG59KTtcclxubW9kdWxlLmV4cG9ydHMgPSBFdmVudDtcclxuXHJcbkV2ZW50LnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9XHJcbkV2ZW50LnByb3RvdHlwZS5vbiA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XHJcblx0aWYgKCQuaW5BcnJheSh0eXBlLCBfX0VWRU5UX1RZUEVTX18pID09IC0xKSB7XHJcblx0XHRjb25zb2xlLmVycm9yKFwiTWFwIEV2ZW50XCIsIHRoaXMudG9TdHJpbmcoKSwgXCJyZWdpc3RlcmluZyBlbWl0dGVkIGV2ZW50IHR5cGVcIiwgXHJcblx0XHRcdHR5cGUsIFwid2hpY2ggaXMgbm90IGEgdmFsaWQgZW1pdHRlZCBldmVudCB0eXBlIVwiKTtcclxuXHR9XHJcblx0RXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbi5jYWxsKHRoaXMsIHR5cGUsIGxpc3RlbmVyKTtcclxufVxyXG5cclxuLy8gVGhlIGZvbGxvd2luZyBpcyBhIGxpc3Qgb2YgZXZlbnRzIHRoZSBiYXNlIEV2ZW50IGNsYXNzIGFuZCBsaWJyYXJ5IGVtaXRcclxuLy8gVGhpcyBsaXN0IGlzIGNoZWNrZWQgYWdhaW5zdCB3aGVuIHJlZ2lzdGVyaW5nIHRvIGNhdGNoIG1pc3NwZWxsaW5ncy5cclxudmFyIF9fRVZFTlRfVFlQRVNfXyA9IFtcclxuXHRcImVudGVyaW5nLXRpbGVcIiwgLy8oZnJvbS1kaXIpIFxyXG5cdFx0Ly9lbWl0dGVkIHVwb24gdGhlIHBsYXllciBpcyBnaXZlbiB0aGUgZ28gYWhlYWQgdG8gZW50ZXIgdGhlIHRpbGUgdGhpcyBldmVudCBvY2N1cGllcy5cclxuXHRcImVudGVyZWQtdGlsZVwiLCAvLyhmcm9tLWRpcilcclxuXHRcdC8vZW1pdHRlZCB1cG9uIHRoZSBwbGF5ZXIgbGFuZGluZyBvbiB0aGUgdGlsZSB0aGlzIGV2ZW50IG9jY3VwaWVzLlxyXG5cdFwibGVhdmluZy10aWxlXCIsIC8vKHRvLWRpcilcclxuXHRcdC8vZW1pdHRlZCB1cG9uIHRoZSBwbGF5ZXIgaXMgZ2l2ZW4gdGhlIGdvIGFoZWFkIHRvIGxlYXZlIHRoZSB0aWxlIHRoaXMgZXZlbnQgb2NjdXBpZXMuXHJcblx0XCJsZWZ0LXRpbGVcIiwgLy8odG8tZGlyKVxyXG5cdFx0Ly9lbWl0dGVkIHVwb24gdGhlIHBsYXllciBjb21wbGV0ZWx5IGxlYXZpbmcgdGhlIHRpbGUgdGhpcyBldmVudCBvY2N1cGllcy5cclxuXHRcImJ1bXBlZFwiLCAvLyhmcm9tLWRpcilcclxuXHRcdC8vZW1pdHRlZCB1cG9uIHRoZSBwbGF5ZXIgaXMgZGVuaWVkIGVudHJ5IGludG8gdGhlIHRpbGUgdGhpcyBldmVudCBvY2N1cGllcy5cclxuXHRcImludGVyYWN0ZWRcIiwgLy8oZnJvbS1kaXIpXHJcblx0XHQvL2VtaXR0ZWQgd2hlbiB0aGUgcGxheWVyIGludGVyYWN0cyB3aXRoIHRoaXMgZXZlbnQgZnJvbSBhbiBhZGphY2VudCB0aWxlXHJcblx0XCJ0aWNrXCIsIC8vKGRlbHRhKVxyXG5cdFx0Ly9lbWl0dGVkIGV2ZXJ5IGdhbWUgdGlja1xyXG5cdFwiY2xpY2tlZFwiLCAvLyh4LCB5KVxyXG5cdFx0Ly9lbWl0dGVkIHdoZW4gdGhlIG1vdXNlIGlzIGNsaWNrZWQgb24gdGhpcyBldmVudCAoYW5kIGl0IGlzIGRldGVybWluZWQgaXQgaXMgdGhpcyBldmVudClcclxuXHRcImNsaWNrZWQtdGhyb3VnaFwiLCAvLyh4LCB5KVxyXG5cdFx0Ly9lbWl0dGVkIHdoZW4gdGhlIG1vdXNlIGlzIGNsaWNrZWQgb24gdGhpcyBldmVudCAoYW5kIHRoZSByYXl0cmFjZSBpcyBwYXNzaW5nIHRocm91Z2ggXHJcblx0XHQvLyB0aGlzIGV2ZW50IGR1cmluZyB0aGUgZGV0ZXJtaW5pbmcgcGhhc2UpXHJcblx0XCJtb3ZpbmdcIiwgLy8oc3JjWCwgc3JjWSwgZGVzdFgsIGRlc3RZKVxyXG5cdFx0Ly9lbWl0dGVkIHdoZW4gdGhpcyBldmVudCBiZWdpbnMgbW92aW5nIHRvIGEgbmV3IHRpbGVcclxuXHRcIm1vdmVkXCIsIC8vKHNyY1gsIHNyY1ksIGRlc3RYLCBkZXN0WSlcclxuXHRcdC8vZW1pdHRlZCB3aGVuIHRoaXMgZXZlbnQgZmluaXNoZXMgbW92aW5nIHRvIGEgbmV3IHRpbGVcclxuXHRcImFuaW0tZW5kXCIsIC8vKGFuaW1hdGlvbk5hbWUpXHJcblx0XHQvL2VtaXR0ZWQgd2hlbiB0aGlzIGV2ZW50J3MgYW5pbWF0aW9uIGVuZHNcclxuXHRcImNyZWF0ZWRcIiwgXHJcblx0XHQvL2VtaXR0ZWQgd2hlbiB0aGlzIGV2ZW50IGlzIGFkZGVkIHRvIHRoZSBldmVudCBtYXBcclxuXHRcImRlc3Ryb3llZFwiLFxyXG5cdFx0Ly9lbWl0dGVkIHdoZW4gdGhpcyBldmVudCBoYXMgYmVlbiB0YWtlbiBvdXQgb2YgdGhlIGV2ZW50IG1hcFxyXG5cdFwicmVhY3RcIiwgLy8oaWQsIGRpc3RhbmNlKVxyXG5cdFx0Ly9lbWl0dGVkIHdoZW4gYW5vdGhlciBldmVudCBvbiB0aGUgbWFwIHRyYW5zbWl0cyBhIHJlYWN0YWJsZSBldmVudFxyXG5cdFwibWVzc2FnZVwiLCAvLyhpZCwgLi4uKVxyXG5cdFx0Ly9uZXZlciBlbWl0dGVkIGJ5IHRoZSBsaWJyYXJ5LCB0aGlzIGV2ZW50IHR5cGUgY2FuIGJlIHVzZWQgZm9yIGNyb3NzLWV2ZW50IG1lc3NhZ2VzXHJcbl07XHJcbiIsIi8vIHBsYXllci1jaGFyYWN0ZXIuanNcclxuLy8gRGVmaW5lcyB0aGUgY29uY3JldGUgY29kZSBmb3IgYSBQbGF5ZXIgQ2hhcmFjdGVyIGluIHRoZSB3b3JsZFxyXG5cclxudmFyIEFjdG9yID0gcmVxdWlyZShcInRwcC1hY3RvclwiKTtcclxudmFyIGNvbnRyb2xsZXIgPSByZXF1aXJlKFwidHBwLWNvbnRyb2xsZXJcIik7XHJcbnZhciBpbmhlcml0cyA9IHJlcXVpcmUoXCJpbmhlcml0c1wiKTtcclxudmFyIGV4dGVuZCA9IHJlcXVpcmUoXCJleHRlbmRcIik7XHJcblxyXG4vKipcclxuICovXHJcbmZ1bmN0aW9uIFBsYXllckNoYXIoKXtcclxuXHRBY3Rvci5jYWxsKHRoaXMsIHt9LCB7fSk7XHJcblx0XHJcblx0dGhpcy5vbihcInRpY2tcIiwgdGhpcy5jb250cm9sQ2hhcmFjdGVyKTtcclxufVxyXG5pbmhlcml0cyhQbGF5ZXJDaGFyLCBBY3Rvcik7XHJcbmV4dGVuZChQbGF5ZXJDaGFyLnByb3RvdHlwZSwge1xyXG5cdGlkIDogXCJQTEFZRVJDSEFSXCIsXHJcblx0bG9jYXRpb24gOiBuZXcgVEhSRUUuVmVjdG9yMygpLFxyXG5cdFxyXG5cdHNwcml0ZTogbnVsbCxcclxuXHRcclxuXHRyZXNldCA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0dGhpcy5sb2NhdGlvbi5zZXQoMCwgMCwgMCk7XHJcblx0fSxcclxuXHRcclxuXHR3YXJwQXdheSA6IGZ1bmN0aW9uKGFuaW1UeXBlKSB7XHJcblx0XHRjb25zb2xlLndhcm4oXCJ3YXJwQXdheSBpcyBub3QgeWV0IGltcGxlbWVudGVkIVwiKTtcclxuXHR9LFxyXG5cdFxyXG5cdHdhcnBUbyA6IGZ1bmN0aW9uKHdhcnBkZWYpIHtcclxuXHRcdHZhciBzZWxmID0gdGhpcztcclxuXHRcdHRoaXMubG9jYXRpb24uc2V0KHdhcnBkZWYubG9jWzBdLCB3YXJwZGVmLmxvY1sxXSwgd2FycGRlZi5sYXllcik7XHJcblx0XHQvL1RPRE8gd2FycGRlZi5hbmltXHJcblx0XHRcclxuXHRcdGN1cnJlbnRNYXAucXVldWVGb3JNYXBTdGFydChmdW5jdGlvbigpe1xyXG5cdFx0XHR2YXIgYW5pbU5hbWUgPSBudWxsO1xyXG5cdFx0XHR2YXIgeCA9IHNlbGYubG9jYXRpb24ueDtcclxuXHRcdFx0dmFyIHkgPSBzZWxmLmxvY2F0aW9uLnk7XHJcblx0XHRcdHZhciBsYXllciA9IHNlbGYubG9jYXRpb24uejtcclxuXHRcdFx0dmFyIHpfb2ZmID0gMDtcclxuXHRcdFx0XHJcblx0XHRcdHN3aXRjaCh3YXJwZGVmLmFuaW0pIHsgLy9XYXJwIGFuaW1hdGlvblxyXG5cdFx0XHRcdGNhc2UgMDogYnJlYWs7IC8vIEFwcGVhclxyXG5cdFx0XHRcdGNhc2UgMTogeSsrOyBhbmltTmFtZSA9IFwid2Fsa1wiOyBicmVhazsgLy8gV2FsayB1cFxyXG5cdFx0XHRcdGNhc2UgMjogeS0tOyBhbmltTmFtZSA9IFwid2Fsa1wiOyBicmVhazsgLy8gV2FsayBkb3duXHJcblx0XHRcdFx0Y2FzZSAzOiB4LS07IGFuaW1OYW1lID0gXCJ3YWxrXCI7IGJyZWFrOyAvLyBXYWxrIGxlZnRcclxuXHRcdFx0XHRjYXNlIDQ6IHgrKzsgYW5pbU5hbWUgPSBcIndhbGtcIjsgYnJlYWs7IC8vIFdhbGsgZG93blxyXG5cdFx0XHRcdGNhc2UgNTogel9vZmYgPSAxMDsgYW5pbU5hbWUgPSBcIndhcnBfaW5cIjsgYnJlYWs7IC8vIFdhcnAgaW5cclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0dmFyIHNyYyA9IHNlbGYubG9jYXRpb247XHJcblx0XHRcdHZhciBzdGF0ZSA9IHNlbGYuX2luaXRQYXRoaW5nU3RhdGUoKTtcclxuXHRcdFx0XHJcblx0XHRcdGlmIChzcmMueC14IHx8IHktc3JjLnkpIFxyXG5cdFx0XHRcdHNlbGYuZmFjaW5nLnNldCh4LXNyYy54LCAwLCBzcmMueS15KTtcclxuXHRcdFx0ZWxzZVxyXG5cdFx0XHRcdHNlbGYuZmFjaW5nLnNldCgwLCAwLCAxKTtcclxuXHRcdFx0XHJcblx0XHRcdHN0YXRlLnNyY0xvY0Muc2V0KHgsIHksIGxheWVyKTtcclxuXHRcdFx0c3RhdGUuc3JjTG9jMy5zZXQoY3VycmVudE1hcC5nZXQzRFRpbGVMb2NhdGlvbih4LCB5LCBsYXllcikpO1xyXG5cdFx0XHRzdGF0ZS5kZXN0TG9jQy5zZXQoc3JjKTtcclxuXHRcdFx0c3RhdGUuZGVzdExvYzMuc2V0KGN1cnJlbnRNYXAuZ2V0M0RUaWxlTG9jYXRpb24oc3JjKSkueiArPSB6X29mZjtcclxuXHRcdFx0c3RhdGUuZGVsdGEgPSAwO1xyXG5cdFx0XHRzdGF0ZS5tb3ZpbmcgPSB0cnVlO1xyXG5cdFx0XHRcclxuXHRcdFx0c2VsZi5wbGF5QW5pbWF0aW9uKGFuaW1OYW1lKTtcclxuXHRcdFx0XHJcblx0XHRcdC8vc2VsZi5hdmF0YXJfbm9kZS5wb3NpdGlvbi5zZXQoIGN1cnJlbnRNYXAuZ2V0M0RUaWxlTG9jYXRpb24oc2VsZi5sb2NhdGlvbikgKTtcclxuXHRcdH0pO1xyXG5cdH0sXHJcblx0XHJcblx0Y29udHJvbFRpbWVvdXQ6IDAuMCxcclxuXHRjb250cm9sQ2hhcmFjdGVyIDogZnVuY3Rpb24oZGVsdGEpIHtcclxuXHRcdHZhciB5ID0gKChjb250cm9sbGVyLmlzRG93bihcIlVwXCIpKT8gLTE6MCkgKyAoKGNvbnRyb2xsZXIuaXNEb3duKFwiRG93blwiKSk/IDE6MCk7XHJcblx0XHR2YXIgeCA9ICgoY29udHJvbGxlci5pc0Rvd24oXCJMZWZ0XCIpKT8gLTE6MCkgKyAoKGNvbnRyb2xsZXIuaXNEb3duKFwiUmlnaHRcIikpPyAxOjApO1xyXG5cdFx0XHJcblx0XHRpZiAoY29udHJvbGxlci5pc0Rvd24oXCJJbnRlcmFjdFwiKSAmJiAhdGhpcy5faW5pdFBhdGhpbmdTdGF0ZSgpLm1vdmluZykge1xyXG5cdFx0XHRjdXJyZW50TWFwLmRpc3BhdGNoKFxyXG5cdFx0XHRcdHRoaXMubG9jYXRpb24ueCAtIHRoaXMuZmFjaW5nLngsIHRoaXMubG9jYXRpb24ueSArIHRoaXMuZmFjaW5nLnosIFxyXG5cdFx0XHRcdFwiaW50ZXJhY3RlZFwiLCB0aGlzLmZhY2luZyk7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdGlmICgoeSB8fCB4KSAmJiAhKHggJiYgeSkpIHsgLy9vbmUsIGJ1dCBub3QgYm90aFxyXG5cdFx0XHRpZiAodGhpcy5jb250cm9sVGltZW91dCA8IDEpIHtcclxuXHRcdFx0XHR0aGlzLmNvbnRyb2xUaW1lb3V0ICs9IENPTkZJRy50aW1lb3V0LndhbGtDb250cm9sICogZGVsdGE7XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0aWYgKCF0aGlzLl9pbml0UGF0aGluZ1N0YXRlKCkubW92aW5nKSB7XHJcblx0XHRcdFx0XHR0aGlzLmZhY2VEaXIoeCwgeSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdGlmICghdGhpcy5faW5pdFBhdGhpbmdTdGF0ZSgpLm1vdmluZykge1xyXG5cdFx0XHRcdFx0dGhpcy5tb3ZlVG8odGhpcy5sb2NhdGlvbi54K3gsIHRoaXMubG9jYXRpb24ueSt5KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdGlmICh0aGlzLmNvbnRyb2xUaW1lb3V0ID4gMClcclxuXHRcdFx0XHR0aGlzLmNvbnRyb2xUaW1lb3V0IC09IENPTkZJRy50aW1lb3V0LndhbGtDb250cm9sICogZGVsdGE7XHJcblx0XHR9XHJcblx0XHRcclxuXHR9LFxyXG5cdFxyXG5cdFxyXG5cdC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cdFxyXG5cdF9hdmF0YXJfbG9hZFNwcml0ZSA6IGZ1bmN0aW9uKG1hcCwgdGV4dHVyZSkge1xyXG5cdFx0dmFyIHVybCA9IFwie3tzaXRlLmJhc2V1cmx9fS9pbWcvcGNzL1wiKyBnYW1lU3RhdGUucGxheWVyU3ByaXRlO1xyXG5cdFx0dmFyIHJlcyA9IC9eKFteXFxbXSspXFxbKFteXFxdXSspXFxdLnBuZyQvLmV4ZWModXJsKTtcclxuXHRcdFxyXG5cdFx0dmFyIG5hbWUgPSByZXNbMV07XHJcblx0XHR2YXIgZm9ybWF0ID0gcmVzWzJdO1xyXG5cdFx0XHJcblx0XHR2YXIgaW1nID0gbmV3IEltYWdlKCk7XHJcblx0XHR0aGlzLl9fb25Mb2FkU3ByaXRlKGltZywgZm9ybWF0LCB0ZXh0dXJlKTtcclxuXHRcdGltZy5zcmMgPSB1cmw7XHJcblx0fSxcclxuXHRcclxuXHQvLyBOZXV0ZXIgdGhlIGxvY2F0aW9uIG5vcm1pbGl6YXRpb24gZm9yIHRoaXMga2luZCBvZiBldmVudFxyXG5cdF9ub3JtYWxpemVMb2NhdGlvbiA6IGZ1bmN0aW9uKCkge30sXHJcblx0XHJcbn0pO1xyXG5tb2R1bGUuZXhwb3J0cyA9IFBsYXllckNoYXI7XHJcbiIsIi8vIHRyaWdnZXIuanNcclxuLy8gRGVmaW5lcyBhIHRyaWdnZXIgdGlsZShzKSB1c2VkIHRocm91Z2hvdXQgdGhlIHBhcmtcclxuXHJcbnZhciBFdmVudCA9IHJlcXVpcmUoXCJ0cHAtZXZlbnRcIik7XHJcbnZhciBpbmhlcml0cyA9IHJlcXVpcmUoXCJpbmhlcml0c1wiKTtcclxudmFyIGV4dGVuZCA9IHJlcXVpcmUoXCJleHRlbmRcIik7XHJcblxyXG4vKipcclxuICogQSB0cmlnZ2VyIGlzIGEgdGlsZSB0aGF0LCB3aGVuIHN0ZXBwZWQgdXBvbiwgd2lsbCB0cmlnZ2VyIHNvbWUgZXZlbnQuXHJcbiAqIFRoZSBtb3N0IGNvbW1vbiBldmVudCB0aWdnZXJlZCBpcyBhIHdhcnBpbmcgdG8gYW5vdGhlciBtYXAsIGZvciB3aGljaFxyXG4gKiB0aGUgc3ViY2xhc3MgV2FycCBpcyBkZXNpZ25lZCBmb3IuXHJcbiAqXHJcbiAqIFRyaWdnZXJzIG1heSB0YWtlIHVwIG1vcmUgdGhhbiBvbmUgc3BhY2UuXHJcbiAqL1xyXG5mdW5jdGlvbiBUcmlnZ2VyKGJhc2UsIG9wdHMpIHtcclxuXHRFdmVudC5jYWxsKHRoaXMsIGJhc2UsIG9wdHMpO1xyXG59XHJcbmluaGVyaXRzKFRyaWdnZXIsIEV2ZW50KTtcclxuZXh0ZW5kKFRyaWdnZXIucHJvdG90eXBlLCB7XHJcblx0XHJcbn0pOyIsIi8vIHdhcnAuanNcclxuLy8gRGVmaW5lcyBhIHdhcnAgdGlsZSB1c2VkIHRocm91Z2hvdXQgdGhlIHBhcmsuXHJcblxyXG52YXIgRXZlbnQgPSByZXF1aXJlKFwidHBwLWV2ZW50XCIpO1xyXG52YXIgaW5oZXJpdHMgPSByZXF1aXJlKFwiaW5oZXJpdHNcIik7XHJcbnZhciBleHRlbmQgPSByZXF1aXJlKFwiZXh0ZW5kXCIpO1xyXG5cclxuLyoqXHJcbiAqIEEgd2FycCBpcyBhbiBldmVudCB0aGF0LCB3aGVuIHdhbGtlZCB1cG9uLCB3aWxsIHRha2UgdGhlIHBsYXllciB0byBhbm90aGVyIG1hcCBvclxyXG4gKiBhcmVhIHdpdGhpbiB0aGUgc2FtZSBtYXAuIERpZmZlcmVudCB0eXBlcyBvZiB3YXJwcyBleGlzdCwgcmFuZ2luZyBmcm9tIHRoZSBzdGFuZGFyZFxyXG4gKiBkb29yIHdhcnAgdG8gdGhlIHRlbGVwb3J0IHdhcnAuIFdhcnBzIGNhbiBiZSB0b2xkIHRvIGFjdGl2YXRlIHVwb24gc3RlcHBpbmcgdXBvbiB0aGVtXHJcbiAqIG9yIGFjdGl2YXRlIHVwb24gc3RlcHBpbmcgb2ZmIGEgY2VydGFpbiBkaXJlY3Rpb24uXHJcbiAqL1xyXG5mdW5jdGlvbiBXYXJwKGJhc2UsIG9wdHMpIHtcclxuXHRFdmVudC5jYWxsKHRoaXMsIGJhc2UsIG9wdHMpO1xyXG59XHJcbmluaGVyaXRzKFdhcnAsIEV2ZW50KTtcclxuZXh0ZW5kKFdhcnAucHJvdG90eXBlLCB7XHJcblx0XHJcbn0pOyJdfQ==
