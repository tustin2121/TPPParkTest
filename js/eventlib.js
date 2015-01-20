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

},{}],4:[function(require,module,exports){
// spritemodel.js
// A redux of the THREE.js sprite, but not using the sprite plugin

var inherits = require("inherits");
var extend = require("extend");

function CharacterSprite(opts) {
	if (!(this instanceof CharacterSprite)) {
		return new CharacterSprite(opts);
	}
	
	opts = extend({
		transparent: true,
		alphaTest: true,
	}, opts);
	
	if (!opts.offset) opts.offset = new THREE.Vector3(0, 0, 0);
	
	//TODO replace with geometry we can control
	// var geom = new THREE.PlaneBufferGeometry(1, 1);
	var geom = new CharacterPlaneGeometry(opts.offset.x, opts.offset.y, opts.offset.z);
	
	var mat = new CharacterSpriteMaterial(opts);
	
	THREE.Mesh.call(this, geom, mat);
	this.type = "CharacterSprite";
	
	mat.scale = mat.uniforms.scale.value = this.scale;
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
}
inherits(CharacterSpriteMaterial, THREE.ShaderMaterial);
extend(CharacterSpriteMaterial.prototype, {
	map : null,
	
	_createMatParams : function() {
		var params = {
			uniforms : {
				uvOffset:	{ type: "v2", value: this.uvOffset },
				uvScale:	{ type: "v2", value: this.uvScale },
				
				rotation:	{ type: "f", value: this.rotation },
				scale:		{ type: "v2", value: this.scale },
				
				color:		{ type: "c", value: this.color },
				map:		{ type: "t", value: this.map },
				opacity:	{ type: "f", value: this.opacity },
			},
		};
		
		params.vertexShader = VERT_SHADER;
		params.fragmentShader = FRAG_SHADER;
		return params;
	},
});
module.exports.CharacterSpriteMaterial = CharacterSpriteMaterial;



function CharacterPlaneGeometry(xoff, yoff, zoff) {
	THREE.BufferGeometry.call(this);
	
	this.type = "CharacterPlaneGeometry";
	
	var verts = new Float32Array([
		-0.5 + xoff, -0.5 + yoff, 0 + zoff,
		 0.5 + xoff, -0.5 + yoff, 0 + zoff,
		 0.5 + xoff,  0.5 + yoff, 0 + zoff,
		-0.5 + xoff,  0.5 + yoff, 0 + zoff,
	]);
	var norms = new Float32Array([ 0, 1, 1,   0, 0, 1,   0, 0, 1,   0, 0, 1, ]);
	var uvs   = new Float32Array([ 0, 0,      1, 0,      1, 1,      0, 1, ]);
	var faces = new Uint16Array( [ 0, 1, 2,   0, 2, 3 ]);
	
	this.addAttribute( 'index', new THREE.BufferAttribute( faces, 1 ) );
	this.addAttribute( 'position', new THREE.BufferAttribute( verts, 3 ) );
	this.addAttribute( 'normal', new THREE.BufferAttribute( norms, 3 ) );
	this.addAttribute( 'uv', new THREE.BufferAttribute( uvs, 2 ) );
	
}
inherits(CharacterPlaneGeometry, THREE.BufferGeometry);




var VERT_SHADER = [
	// 'uniform mat4 modelViewMatrix;',
	// 'uniform mat4 projectionMatrix;',
	'uniform float rotation;',
	'uniform vec2 scale;',
	'uniform vec2 uvOffset;',
	'uniform vec2 uvScale;',

	// 'attribute vec2 position;',
	// 'attribute vec2 uv;',

	'varying vec2 vUV;',

	'void main() {',

		'vUV = uvOffset + uv * uvScale;',

		'vec2 alignedPosition = position.xy * scale;',

		'vec2 rotatedPosition;',
		'rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;',
		'rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;',

		'vec4 finalPosition;',

		'finalPosition = modelViewMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );',
		'finalPosition.xy += rotatedPosition;',
		'finalPosition = projectionMatrix * finalPosition;',

		'gl_Position = finalPosition;',

	'}'
].join( '\n' );

var FRAG_SHADER = [
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
].join( '\n' )




/*
var indices = new Uint16Array( [ 0, 1, 2,  0, 2, 3 ] );
var vertices = new Float32Array( [ - 0.5, - 0.5, 0,   0.5, - 0.5, 0,   0.5, 0.5, 0,   - 0.5, 0.5, 0 ] );
var uvs = new Float32Array( [ 0, 0,   1, 0,   1, 1,   0, 1 ] );

var geometry = new THREE.BufferGeometry();
geometry.addAttribute( 'index', new THREE.BufferAttribute( indices, 1 ) );
geometry.addAttribute( 'position', new THREE.BufferAttribute( vertices, 3 ) );
geometry.addAttribute( 'uv', new THREE.BufferAttribute( uvs, 2 ) );


function SpriteCharacter(material) {
	THREE.Object3D.call( this );

	this.type = 'SpriteCharacter';

	this.geometry = geometry;
	this.material = ( material !== undefined ) ? material : new THREE.SpriteMaterial();

}

SpriteCharacter.prototype = Object.create( THREE.Object3D.prototype );

SpriteCharacter.prototype.raycast = ( function () {
	var matrixPosition = new THREE.Vector3();

	return function ( raycaster, intersects ) {
		matrixPosition.setFromMatrixPosition( this.matrixWorld );

		var distance = raycaster.ray.distanceToPoint( matrixPosition );
		if ( distance > this.scale.x ) return;

		intersects.push( {
			distance: distance,
			point: this.position,
			face: null,
			object: this
		} );
	};
}() );


SpriteCharacter.prototype.clone = function ( object ) {
	if ( object === undefined ) 
		object = new SpriteCharacter( this.material );
	THREE.Object3D.prototype.clone.call( this, object );
	return object;

};*/
},{"extend":2,"inherits":3}],"tpp-actor":[function(require,module,exports){
// actor.js
// Defines the actor event used throughout the park

var Event = require("tpp-event");
var inherits = require("inherits");
var extend = require("extend");

var CharacterSprite = require("../model/spritemodel.js").CharacterSprite;

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
		
		// var mat /*= self.avatar_mat*/ = new THREE.SpriteMaterial({
		// 	map: texture,
		// 	color: 0xFFFFFF,
		// 	transparent: true,
		// });
		
		currentMap.markLoading();
		this._avatar_loadSprite(map, texture);
		
		//var sprite = self.avatar_sprite = new THREE.Sprite(mat);
		var sprite = self.avatar_sprite = new CharacterSprite({
			map: texture,
			color: 0xFFFFFF,
			offset: new THREE.Vector3(0, 0.3, 0.5),
		});
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
},{"../model/spritemodel.js":4,"extend":2,"inherits":3,"tpp-event":"tpp-event"}],"tpp-controller":[function(require,module,exports){
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
	
	isDown : function(key, ctx) {
		if ($.isArray(ctx)) {
			var go = false;
			for (var i = 0; i < ctx.length; i++) go |= ctx[i];
			if (!go) return;
		} else {
			if (this.inputContext != ctx) return;
		}
		
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
		var y = ((controller.isDown("Up", "game"))? -1:0) + ((controller.isDown("Down", "game"))? 1:0);
		var x = ((controller.isDown("Left", "game"))? -1:0) + ((controller.isDown("Right", "game"))? 1:0);
		
		if (controller.isDown("Interact", "game") && !this._initPathingState().moving) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlc1xcYnJvd3NlcmlmeVxcbm9kZV9tb2R1bGVzXFxicm93c2VyLXBhY2tcXF9wcmVsdWRlLmpzIiwibm9kZV9tb2R1bGVzXFxicm93c2VyaWZ5XFxub2RlX21vZHVsZXNcXGV2ZW50c1xcZXZlbnRzLmpzIiwibm9kZV9tb2R1bGVzXFxleHRlbmRcXGluZGV4LmpzIiwibm9kZV9tb2R1bGVzXFxpbmhlcml0c1xcaW5oZXJpdHNfYnJvd3Nlci5qcyIsInNyY1xcanNcXG1vZGVsXFxzcHJpdGVtb2RlbC5qcyIsInNyY1xcanNcXGV2ZW50c1xcYWN0b3IiLCJzcmNcXGpzXFxtYW5hZ2Vyc1xcY29udHJvbGxlciIsInNyY1xcanNcXGV2ZW50c1xcZXZlbnQiLCJzcmNcXGpzXFxldmVudHNcXHBsYXllci1jaGFyYWN0ZXIiLCJzcmNcXGpzXFxldmVudHNcXHRyaWdnZXIiLCJzcmNcXGpzXFxldmVudHNcXHdhcnAiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdTQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0UEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFvQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0TkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbmZ1bmN0aW9uIEV2ZW50RW1pdHRlcigpIHtcbiAgdGhpcy5fZXZlbnRzID0gdGhpcy5fZXZlbnRzIHx8IHt9O1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSB0aGlzLl9tYXhMaXN0ZW5lcnMgfHwgdW5kZWZpbmVkO1xufVxubW9kdWxlLmV4cG9ydHMgPSBFdmVudEVtaXR0ZXI7XG5cbi8vIEJhY2t3YXJkcy1jb21wYXQgd2l0aCBub2RlIDAuMTAueFxuRXZlbnRFbWl0dGVyLkV2ZW50RW1pdHRlciA9IEV2ZW50RW1pdHRlcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fZXZlbnRzID0gdW5kZWZpbmVkO1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fbWF4TGlzdGVuZXJzID0gdW5kZWZpbmVkO1xuXG4vLyBCeSBkZWZhdWx0IEV2ZW50RW1pdHRlcnMgd2lsbCBwcmludCBhIHdhcm5pbmcgaWYgbW9yZSB0aGFuIDEwIGxpc3RlbmVycyBhcmVcbi8vIGFkZGVkIHRvIGl0LiBUaGlzIGlzIGEgdXNlZnVsIGRlZmF1bHQgd2hpY2ggaGVscHMgZmluZGluZyBtZW1vcnkgbGVha3MuXG5FdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycyA9IDEwO1xuXG4vLyBPYnZpb3VzbHkgbm90IGFsbCBFbWl0dGVycyBzaG91bGQgYmUgbGltaXRlZCB0byAxMC4gVGhpcyBmdW5jdGlvbiBhbGxvd3Ncbi8vIHRoYXQgdG8gYmUgaW5jcmVhc2VkLiBTZXQgdG8gemVybyBmb3IgdW5saW1pdGVkLlxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5zZXRNYXhMaXN0ZW5lcnMgPSBmdW5jdGlvbihuKSB7XG4gIGlmICghaXNOdW1iZXIobikgfHwgbiA8IDAgfHwgaXNOYU4obikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCduIG11c3QgYmUgYSBwb3NpdGl2ZSBudW1iZXInKTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gbjtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBlciwgaGFuZGxlciwgbGVuLCBhcmdzLCBpLCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gSWYgdGhlcmUgaXMgbm8gJ2Vycm9yJyBldmVudCBsaXN0ZW5lciB0aGVuIHRocm93LlxuICBpZiAodHlwZSA9PT0gJ2Vycm9yJykge1xuICAgIGlmICghdGhpcy5fZXZlbnRzLmVycm9yIHx8XG4gICAgICAgIChpc09iamVjdCh0aGlzLl9ldmVudHMuZXJyb3IpICYmICF0aGlzLl9ldmVudHMuZXJyb3IubGVuZ3RoKSkge1xuICAgICAgZXIgPSBhcmd1bWVudHNbMV07XG4gICAgICBpZiAoZXIgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgICB0aHJvdyBlcjsgLy8gVW5oYW5kbGVkICdlcnJvcicgZXZlbnRcbiAgICAgIH1cbiAgICAgIHRocm93IFR5cGVFcnJvcignVW5jYXVnaHQsIHVuc3BlY2lmaWVkIFwiZXJyb3JcIiBldmVudC4nKTtcbiAgICB9XG4gIH1cblxuICBoYW5kbGVyID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIGlmIChpc1VuZGVmaW5lZChoYW5kbGVyKSlcbiAgICByZXR1cm4gZmFsc2U7XG5cbiAgaWYgKGlzRnVuY3Rpb24oaGFuZGxlcikpIHtcbiAgICBzd2l0Y2ggKGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIC8vIGZhc3QgY2FzZXNcbiAgICAgIGNhc2UgMTpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAzOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdLCBhcmd1bWVudHNbMl0pO1xuICAgICAgICBicmVhaztcbiAgICAgIC8vIHNsb3dlclxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICAgICAgYXJncyA9IG5ldyBBcnJheShsZW4gLSAxKTtcbiAgICAgICAgZm9yIChpID0gMTsgaSA8IGxlbjsgaSsrKVxuICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICBoYW5kbGVyLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH1cbiAgfSBlbHNlIGlmIChpc09iamVjdChoYW5kbGVyKSkge1xuICAgIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgYXJncyA9IG5ldyBBcnJheShsZW4gLSAxKTtcbiAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcblxuICAgIGxpc3RlbmVycyA9IGhhbmRsZXIuc2xpY2UoKTtcbiAgICBsZW4gPSBsaXN0ZW5lcnMubGVuZ3RoO1xuICAgIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKylcbiAgICAgIGxpc3RlbmVyc1tpXS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBtO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBUbyBhdm9pZCByZWN1cnNpb24gaW4gdGhlIGNhc2UgdGhhdCB0eXBlID09PSBcIm5ld0xpc3RlbmVyXCIhIEJlZm9yZVxuICAvLyBhZGRpbmcgaXQgdG8gdGhlIGxpc3RlbmVycywgZmlyc3QgZW1pdCBcIm5ld0xpc3RlbmVyXCIuXG4gIGlmICh0aGlzLl9ldmVudHMubmV3TGlzdGVuZXIpXG4gICAgdGhpcy5lbWl0KCduZXdMaXN0ZW5lcicsIHR5cGUsXG4gICAgICAgICAgICAgIGlzRnVuY3Rpb24obGlzdGVuZXIubGlzdGVuZXIpID9cbiAgICAgICAgICAgICAgbGlzdGVuZXIubGlzdGVuZXIgOiBsaXN0ZW5lcik7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgLy8gT3B0aW1pemUgdGhlIGNhc2Ugb2Ygb25lIGxpc3RlbmVyLiBEb24ndCBuZWVkIHRoZSBleHRyYSBhcnJheSBvYmplY3QuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gbGlzdGVuZXI7XG4gIGVsc2UgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgLy8gSWYgd2UndmUgYWxyZWFkeSBnb3QgYW4gYXJyYXksIGp1c3QgYXBwZW5kLlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5wdXNoKGxpc3RlbmVyKTtcbiAgZWxzZVxuICAgIC8vIEFkZGluZyB0aGUgc2Vjb25kIGVsZW1lbnQsIG5lZWQgdG8gY2hhbmdlIHRvIGFycmF5LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IFt0aGlzLl9ldmVudHNbdHlwZV0sIGxpc3RlbmVyXTtcblxuICAvLyBDaGVjayBmb3IgbGlzdGVuZXIgbGVha1xuICBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSAmJiAhdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCkge1xuICAgIHZhciBtO1xuICAgIGlmICghaXNVbmRlZmluZWQodGhpcy5fbWF4TGlzdGVuZXJzKSkge1xuICAgICAgbSA9IHRoaXMuX21heExpc3RlbmVycztcbiAgICB9IGVsc2Uge1xuICAgICAgbSA9IEV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzO1xuICAgIH1cblxuICAgIGlmIChtICYmIG0gPiAwICYmIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGggPiBtKSB7XG4gICAgICB0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkID0gdHJ1ZTtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJyhub2RlKSB3YXJuaW5nOiBwb3NzaWJsZSBFdmVudEVtaXR0ZXIgbWVtb3J5ICcgK1xuICAgICAgICAgICAgICAgICAgICAnbGVhayBkZXRlY3RlZC4gJWQgbGlzdGVuZXJzIGFkZGVkLiAnICtcbiAgICAgICAgICAgICAgICAgICAgJ1VzZSBlbWl0dGVyLnNldE1heExpc3RlbmVycygpIHRvIGluY3JlYXNlIGxpbWl0LicsXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGgpO1xuICAgICAgaWYgKHR5cGVvZiBjb25zb2xlLnRyYWNlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIC8vIG5vdCBzdXBwb3J0ZWQgaW4gSUUgMTBcbiAgICAgICAgY29uc29sZS50cmFjZSgpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbiA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub25jZSA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICB2YXIgZmlyZWQgPSBmYWxzZTtcblxuICBmdW5jdGlvbiBnKCkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgZyk7XG5cbiAgICBpZiAoIWZpcmVkKSB7XG4gICAgICBmaXJlZCA9IHRydWU7XG4gICAgICBsaXN0ZW5lci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgfVxuXG4gIGcubGlzdGVuZXIgPSBsaXN0ZW5lcjtcbiAgdGhpcy5vbih0eXBlLCBnKTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8vIGVtaXRzIGEgJ3JlbW92ZUxpc3RlbmVyJyBldmVudCBpZmYgdGhlIGxpc3RlbmVyIHdhcyByZW1vdmVkXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIGxpc3QsIHBvc2l0aW9uLCBsZW5ndGgsIGk7XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgbGlzdCA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgbGVuZ3RoID0gbGlzdC5sZW5ndGg7XG4gIHBvc2l0aW9uID0gLTE7XG5cbiAgaWYgKGxpc3QgPT09IGxpc3RlbmVyIHx8XG4gICAgICAoaXNGdW5jdGlvbihsaXN0Lmxpc3RlbmVyKSAmJiBsaXN0Lmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcbiAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuXG4gIH0gZWxzZSBpZiAoaXNPYmplY3QobGlzdCkpIHtcbiAgICBmb3IgKGkgPSBsZW5ndGg7IGktLSA+IDA7KSB7XG4gICAgICBpZiAobGlzdFtpXSA9PT0gbGlzdGVuZXIgfHxcbiAgICAgICAgICAobGlzdFtpXS5saXN0ZW5lciAmJiBsaXN0W2ldLmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcbiAgICAgICAgcG9zaXRpb24gPSBpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAocG9zaXRpb24gPCAwKVxuICAgICAgcmV0dXJuIHRoaXM7XG5cbiAgICBpZiAobGlzdC5sZW5ndGggPT09IDEpIHtcbiAgICAgIGxpc3QubGVuZ3RoID0gMDtcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgfSBlbHNlIHtcbiAgICAgIGxpc3Quc3BsaWNlKHBvc2l0aW9uLCAxKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBrZXksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICByZXR1cm4gdGhpcztcblxuICAvLyBub3QgbGlzdGVuaW5nIGZvciByZW1vdmVMaXN0ZW5lciwgbm8gbmVlZCB0byBlbWl0XG4gIGlmICghdGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApXG4gICAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICBlbHNlIGlmICh0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLy8gZW1pdCByZW1vdmVMaXN0ZW5lciBmb3IgYWxsIGxpc3RlbmVycyBvbiBhbGwgZXZlbnRzXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgZm9yIChrZXkgaW4gdGhpcy5fZXZlbnRzKSB7XG4gICAgICBpZiAoa2V5ID09PSAncmVtb3ZlTGlzdGVuZXInKSBjb250aW51ZTtcbiAgICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKGtleSk7XG4gICAgfVxuICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKCdyZW1vdmVMaXN0ZW5lcicpO1xuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgbGlzdGVuZXJzID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGxpc3RlbmVycykpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVycyk7XG4gIH0gZWxzZSB7XG4gICAgLy8gTElGTyBvcmRlclxuICAgIHdoaWxlIChsaXN0ZW5lcnMubGVuZ3RoKVxuICAgICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnNbbGlzdGVuZXJzLmxlbmd0aCAtIDFdKTtcbiAgfVxuICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciByZXQ7XG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0ID0gW107XG4gIGVsc2UgaWYgKGlzRnVuY3Rpb24odGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSBbdGhpcy5fZXZlbnRzW3R5cGVdXTtcbiAgZWxzZVxuICAgIHJldCA9IHRoaXMuX2V2ZW50c1t0eXBlXS5zbGljZSgpO1xuICByZXR1cm4gcmV0O1xufTtcblxuRXZlbnRFbWl0dGVyLmxpc3RlbmVyQ291bnQgPSBmdW5jdGlvbihlbWl0dGVyLCB0eXBlKSB7XG4gIHZhciByZXQ7XG4gIGlmICghZW1pdHRlci5fZXZlbnRzIHx8ICFlbWl0dGVyLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0ID0gMDtcbiAgZWxzZSBpZiAoaXNGdW5jdGlvbihlbWl0dGVyLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IDE7XG4gIGVsc2VcbiAgICByZXQgPSBlbWl0dGVyLl9ldmVudHNbdHlwZV0ubGVuZ3RoO1xuICByZXR1cm4gcmV0O1xufTtcblxuZnVuY3Rpb24gaXNGdW5jdGlvbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdmdW5jdGlvbic7XG59XG5cbmZ1bmN0aW9uIGlzTnVtYmVyKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ251bWJlcic7XG59XG5cbmZ1bmN0aW9uIGlzT2JqZWN0KGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ29iamVjdCcgJiYgYXJnICE9PSBudWxsO1xufVxuXG5mdW5jdGlvbiBpc1VuZGVmaW5lZChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gdm9pZCAwO1xufVxuIiwidmFyIGhhc093biA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG52YXIgdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xudmFyIHVuZGVmaW5lZDtcblxudmFyIGlzUGxhaW5PYmplY3QgPSBmdW5jdGlvbiBpc1BsYWluT2JqZWN0KG9iaikge1xuXHQndXNlIHN0cmljdCc7XG5cdGlmICghb2JqIHx8IHRvU3RyaW5nLmNhbGwob2JqKSAhPT0gJ1tvYmplY3QgT2JqZWN0XScpIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblxuXHR2YXIgaGFzX293bl9jb25zdHJ1Y3RvciA9IGhhc093bi5jYWxsKG9iaiwgJ2NvbnN0cnVjdG9yJyk7XG5cdHZhciBoYXNfaXNfcHJvcGVydHlfb2ZfbWV0aG9kID0gb2JqLmNvbnN0cnVjdG9yICYmIG9iai5jb25zdHJ1Y3Rvci5wcm90b3R5cGUgJiYgaGFzT3duLmNhbGwob2JqLmNvbnN0cnVjdG9yLnByb3RvdHlwZSwgJ2lzUHJvdG90eXBlT2YnKTtcblx0Ly8gTm90IG93biBjb25zdHJ1Y3RvciBwcm9wZXJ0eSBtdXN0IGJlIE9iamVjdFxuXHRpZiAob2JqLmNvbnN0cnVjdG9yICYmICFoYXNfb3duX2NvbnN0cnVjdG9yICYmICFoYXNfaXNfcHJvcGVydHlfb2ZfbWV0aG9kKSB7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cblx0Ly8gT3duIHByb3BlcnRpZXMgYXJlIGVudW1lcmF0ZWQgZmlyc3RseSwgc28gdG8gc3BlZWQgdXAsXG5cdC8vIGlmIGxhc3Qgb25lIGlzIG93biwgdGhlbiBhbGwgcHJvcGVydGllcyBhcmUgb3duLlxuXHR2YXIga2V5O1xuXHRmb3IgKGtleSBpbiBvYmopIHt9XG5cblx0cmV0dXJuIGtleSA9PT0gdW5kZWZpbmVkIHx8IGhhc093bi5jYWxsKG9iaiwga2V5KTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZXh0ZW5kKCkge1xuXHQndXNlIHN0cmljdCc7XG5cdHZhciBvcHRpb25zLCBuYW1lLCBzcmMsIGNvcHksIGNvcHlJc0FycmF5LCBjbG9uZSxcblx0XHR0YXJnZXQgPSBhcmd1bWVudHNbMF0sXG5cdFx0aSA9IDEsXG5cdFx0bGVuZ3RoID0gYXJndW1lbnRzLmxlbmd0aCxcblx0XHRkZWVwID0gZmFsc2U7XG5cblx0Ly8gSGFuZGxlIGEgZGVlcCBjb3B5IHNpdHVhdGlvblxuXHRpZiAodHlwZW9mIHRhcmdldCA9PT0gJ2Jvb2xlYW4nKSB7XG5cdFx0ZGVlcCA9IHRhcmdldDtcblx0XHR0YXJnZXQgPSBhcmd1bWVudHNbMV0gfHwge307XG5cdFx0Ly8gc2tpcCB0aGUgYm9vbGVhbiBhbmQgdGhlIHRhcmdldFxuXHRcdGkgPSAyO1xuXHR9IGVsc2UgaWYgKCh0eXBlb2YgdGFyZ2V0ICE9PSAnb2JqZWN0JyAmJiB0eXBlb2YgdGFyZ2V0ICE9PSAnZnVuY3Rpb24nKSB8fCB0YXJnZXQgPT0gbnVsbCkge1xuXHRcdHRhcmdldCA9IHt9O1xuXHR9XG5cblx0Zm9yICg7IGkgPCBsZW5ndGg7ICsraSkge1xuXHRcdG9wdGlvbnMgPSBhcmd1bWVudHNbaV07XG5cdFx0Ly8gT25seSBkZWFsIHdpdGggbm9uLW51bGwvdW5kZWZpbmVkIHZhbHVlc1xuXHRcdGlmIChvcHRpb25zICE9IG51bGwpIHtcblx0XHRcdC8vIEV4dGVuZCB0aGUgYmFzZSBvYmplY3Rcblx0XHRcdGZvciAobmFtZSBpbiBvcHRpb25zKSB7XG5cdFx0XHRcdHNyYyA9IHRhcmdldFtuYW1lXTtcblx0XHRcdFx0Y29weSA9IG9wdGlvbnNbbmFtZV07XG5cblx0XHRcdFx0Ly8gUHJldmVudCBuZXZlci1lbmRpbmcgbG9vcFxuXHRcdFx0XHRpZiAodGFyZ2V0ID09PSBjb3B5KSB7XG5cdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyBSZWN1cnNlIGlmIHdlJ3JlIG1lcmdpbmcgcGxhaW4gb2JqZWN0cyBvciBhcnJheXNcblx0XHRcdFx0aWYgKGRlZXAgJiYgY29weSAmJiAoaXNQbGFpbk9iamVjdChjb3B5KSB8fCAoY29weUlzQXJyYXkgPSBBcnJheS5pc0FycmF5KGNvcHkpKSkpIHtcblx0XHRcdFx0XHRpZiAoY29weUlzQXJyYXkpIHtcblx0XHRcdFx0XHRcdGNvcHlJc0FycmF5ID0gZmFsc2U7XG5cdFx0XHRcdFx0XHRjbG9uZSA9IHNyYyAmJiBBcnJheS5pc0FycmF5KHNyYykgPyBzcmMgOiBbXTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0Y2xvbmUgPSBzcmMgJiYgaXNQbGFpbk9iamVjdChzcmMpID8gc3JjIDoge307XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0Ly8gTmV2ZXIgbW92ZSBvcmlnaW5hbCBvYmplY3RzLCBjbG9uZSB0aGVtXG5cdFx0XHRcdFx0dGFyZ2V0W25hbWVdID0gZXh0ZW5kKGRlZXAsIGNsb25lLCBjb3B5KTtcblxuXHRcdFx0XHQvLyBEb24ndCBicmluZyBpbiB1bmRlZmluZWQgdmFsdWVzXG5cdFx0XHRcdH0gZWxzZSBpZiAoY29weSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdFx0dGFyZ2V0W25hbWVdID0gY29weTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdC8vIFJldHVybiB0aGUgbW9kaWZpZWQgb2JqZWN0XG5cdHJldHVybiB0YXJnZXQ7XG59O1xuXG4iLCJpZiAodHlwZW9mIE9iamVjdC5jcmVhdGUgPT09ICdmdW5jdGlvbicpIHtcbiAgLy8gaW1wbGVtZW50YXRpb24gZnJvbSBzdGFuZGFyZCBub2RlLmpzICd1dGlsJyBtb2R1bGVcbiAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpbmhlcml0cyhjdG9yLCBzdXBlckN0b3IpIHtcbiAgICBjdG9yLnN1cGVyXyA9IHN1cGVyQ3RvclxuICAgIGN0b3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShzdXBlckN0b3IucHJvdG90eXBlLCB7XG4gICAgICBjb25zdHJ1Y3Rvcjoge1xuICAgICAgICB2YWx1ZTogY3RvcixcbiAgICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgICBjb25maWd1cmFibGU6IHRydWVcbiAgICAgIH1cbiAgICB9KTtcbiAgfTtcbn0gZWxzZSB7XG4gIC8vIG9sZCBzY2hvb2wgc2hpbSBmb3Igb2xkIGJyb3dzZXJzXG4gIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaW5oZXJpdHMoY3Rvciwgc3VwZXJDdG9yKSB7XG4gICAgY3Rvci5zdXBlcl8gPSBzdXBlckN0b3JcbiAgICB2YXIgVGVtcEN0b3IgPSBmdW5jdGlvbiAoKSB7fVxuICAgIFRlbXBDdG9yLnByb3RvdHlwZSA9IHN1cGVyQ3Rvci5wcm90b3R5cGVcbiAgICBjdG9yLnByb3RvdHlwZSA9IG5ldyBUZW1wQ3RvcigpXG4gICAgY3Rvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBjdG9yXG4gIH1cbn1cbiIsIi8vIHNwcml0ZW1vZGVsLmpzXHJcbi8vIEEgcmVkdXggb2YgdGhlIFRIUkVFLmpzIHNwcml0ZSwgYnV0IG5vdCB1c2luZyB0aGUgc3ByaXRlIHBsdWdpblxyXG5cclxudmFyIGluaGVyaXRzID0gcmVxdWlyZShcImluaGVyaXRzXCIpO1xyXG52YXIgZXh0ZW5kID0gcmVxdWlyZShcImV4dGVuZFwiKTtcclxuXHJcbmZ1bmN0aW9uIENoYXJhY3RlclNwcml0ZShvcHRzKSB7XHJcblx0aWYgKCEodGhpcyBpbnN0YW5jZW9mIENoYXJhY3RlclNwcml0ZSkpIHtcclxuXHRcdHJldHVybiBuZXcgQ2hhcmFjdGVyU3ByaXRlKG9wdHMpO1xyXG5cdH1cclxuXHRcclxuXHRvcHRzID0gZXh0ZW5kKHtcclxuXHRcdHRyYW5zcGFyZW50OiB0cnVlLFxyXG5cdFx0YWxwaGFUZXN0OiB0cnVlLFxyXG5cdH0sIG9wdHMpO1xyXG5cdFxyXG5cdGlmICghb3B0cy5vZmZzZXQpIG9wdHMub2Zmc2V0ID0gbmV3IFRIUkVFLlZlY3RvcjMoMCwgMCwgMCk7XHJcblx0XHJcblx0Ly9UT0RPIHJlcGxhY2Ugd2l0aCBnZW9tZXRyeSB3ZSBjYW4gY29udHJvbFxyXG5cdC8vIHZhciBnZW9tID0gbmV3IFRIUkVFLlBsYW5lQnVmZmVyR2VvbWV0cnkoMSwgMSk7XHJcblx0dmFyIGdlb20gPSBuZXcgQ2hhcmFjdGVyUGxhbmVHZW9tZXRyeShvcHRzLm9mZnNldC54LCBvcHRzLm9mZnNldC55LCBvcHRzLm9mZnNldC56KTtcclxuXHRcclxuXHR2YXIgbWF0ID0gbmV3IENoYXJhY3RlclNwcml0ZU1hdGVyaWFsKG9wdHMpO1xyXG5cdFxyXG5cdFRIUkVFLk1lc2guY2FsbCh0aGlzLCBnZW9tLCBtYXQpO1xyXG5cdHRoaXMudHlwZSA9IFwiQ2hhcmFjdGVyU3ByaXRlXCI7XHJcblx0XHJcblx0bWF0LnNjYWxlID0gbWF0LnVuaWZvcm1zLnNjYWxlLnZhbHVlID0gdGhpcy5zY2FsZTtcclxufVxyXG5pbmhlcml0cyhDaGFyYWN0ZXJTcHJpdGUsIFRIUkVFLk1lc2gpO1xyXG5tb2R1bGUuZXhwb3J0cy5DaGFyYWN0ZXJTcHJpdGUgPSBDaGFyYWN0ZXJTcHJpdGU7XHJcblxyXG5cclxuZnVuY3Rpb24gQ2hhcmFjdGVyU3ByaXRlTWF0ZXJpYWwob3B0cykge1xyXG5cdGlmICghKHRoaXMgaW5zdGFuY2VvZiBDaGFyYWN0ZXJTcHJpdGVNYXRlcmlhbCkpIHtcclxuXHRcdHJldHVybiBuZXcgQ2hhcmFjdGVyU3ByaXRlTWF0ZXJpYWwob3B0cyk7XHJcblx0fVxyXG5cdFxyXG5cdC8vVE9ETyB3cml0ZSBpdCBzbyB3aGVuIHdlIHJlcGxhY2UgdGhlIHZhbHVlcyBoZXJlLCB3ZSByZXBsYWNlIHRoZSBvbmVzIGluIHRoZSB1bmlmb3Jtc1xyXG5cdC8vIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKHRoaXMsIHtcclxuXHQvLyBcdHV2T2Zmc2V0IDoge31cclxuXHQvLyB9KTtcclxuXHJcblx0dGhpcy5tYXAgPSBvcHRzLm1hcCB8fCBuZXcgVEhSRUUuVGV4dHVyZSgpO1xyXG5cdFxyXG5cdHRoaXMudXZPZmZzZXQgPSBvcHRzLnV2T2Zmc2V0IHx8IHRoaXMubWFwLm9mZnNldCB8fCBuZXcgVEhSRUUuVmVjdG9yMigwLCAwKTtcclxuXHR0aGlzLnV2U2NhbGUgPSBvcHRzLnV2U2NhbGUgfHwgdGhpcy5tYXAucmVwZWF0IHx8IG5ldyBUSFJFRS5WZWN0b3IyKDEsIDEpO1xyXG5cdFxyXG5cdHRoaXMucm90YXRpb24gPSBvcHRzLnJvdGF0aW9uIHx8IDA7XHJcblx0dGhpcy5zY2FsZSA9IG9wdHMuc2NhbGUgfHwgbmV3IFRIUkVFLlZlY3RvcjIoMSwgMSk7XHJcblx0XHJcblx0dGhpcy5jb2xvciA9IChvcHRzLmNvbG9yIGluc3RhbmNlb2YgVEhSRUUuQ29sb3IpPyBvcHRzLmNvbG9yIDogbmV3IFRIUkVFLkNvbG9yKG9wdHMuY29sb3IpO1xyXG5cdHRoaXMub3BhY2l0eSA9IG9wdHMub3BhY2l0eSB8fCAxO1xyXG5cdFxyXG5cdHZhciBwYXJhbXMgPSB0aGlzLl9jcmVhdGVNYXRQYXJhbXMob3B0cyk7XHJcblx0VEhSRUUuU2hhZGVyTWF0ZXJpYWwuY2FsbCh0aGlzLCBwYXJhbXMpO1xyXG5cdHRoaXMudHlwZSA9IFwiQ2hhcmFjdGVyU3ByaXRlTWF0ZXJpYWxcIjtcclxuXHRcclxuXHR0aGlzLnRyYW5zcGFyZW50ID0gKG9wdHMudHJhbnNwYXJlbnQgIT09IHVuZGVmaW5lZCk/IG9wdHMudHJhbnNwYXJlbnQgOiB0cnVlO1xyXG5cdHRoaXMuYWxwaGFUZXN0ID0gMC4wNTtcclxuXHQvLyB0aGlzLmRlcHRoV3JpdGUgPSBmYWxzZTtcclxufVxyXG5pbmhlcml0cyhDaGFyYWN0ZXJTcHJpdGVNYXRlcmlhbCwgVEhSRUUuU2hhZGVyTWF0ZXJpYWwpO1xyXG5leHRlbmQoQ2hhcmFjdGVyU3ByaXRlTWF0ZXJpYWwucHJvdG90eXBlLCB7XHJcblx0bWFwIDogbnVsbCxcclxuXHRcclxuXHRfY3JlYXRlTWF0UGFyYW1zIDogZnVuY3Rpb24oKSB7XHJcblx0XHR2YXIgcGFyYW1zID0ge1xyXG5cdFx0XHR1bmlmb3JtcyA6IHtcclxuXHRcdFx0XHR1dk9mZnNldDpcdHsgdHlwZTogXCJ2MlwiLCB2YWx1ZTogdGhpcy51dk9mZnNldCB9LFxyXG5cdFx0XHRcdHV2U2NhbGU6XHR7IHR5cGU6IFwidjJcIiwgdmFsdWU6IHRoaXMudXZTY2FsZSB9LFxyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdHJvdGF0aW9uOlx0eyB0eXBlOiBcImZcIiwgdmFsdWU6IHRoaXMucm90YXRpb24gfSxcclxuXHRcdFx0XHRzY2FsZTpcdFx0eyB0eXBlOiBcInYyXCIsIHZhbHVlOiB0aGlzLnNjYWxlIH0sXHJcblx0XHRcdFx0XHJcblx0XHRcdFx0Y29sb3I6XHRcdHsgdHlwZTogXCJjXCIsIHZhbHVlOiB0aGlzLmNvbG9yIH0sXHJcblx0XHRcdFx0bWFwOlx0XHR7IHR5cGU6IFwidFwiLCB2YWx1ZTogdGhpcy5tYXAgfSxcclxuXHRcdFx0XHRvcGFjaXR5Olx0eyB0eXBlOiBcImZcIiwgdmFsdWU6IHRoaXMub3BhY2l0eSB9LFxyXG5cdFx0XHR9LFxyXG5cdFx0fTtcclxuXHRcdFxyXG5cdFx0cGFyYW1zLnZlcnRleFNoYWRlciA9IFZFUlRfU0hBREVSO1xyXG5cdFx0cGFyYW1zLmZyYWdtZW50U2hhZGVyID0gRlJBR19TSEFERVI7XHJcblx0XHRyZXR1cm4gcGFyYW1zO1xyXG5cdH0sXHJcbn0pO1xyXG5tb2R1bGUuZXhwb3J0cy5DaGFyYWN0ZXJTcHJpdGVNYXRlcmlhbCA9IENoYXJhY3RlclNwcml0ZU1hdGVyaWFsO1xyXG5cclxuXHJcblxyXG5mdW5jdGlvbiBDaGFyYWN0ZXJQbGFuZUdlb21ldHJ5KHhvZmYsIHlvZmYsIHpvZmYpIHtcclxuXHRUSFJFRS5CdWZmZXJHZW9tZXRyeS5jYWxsKHRoaXMpO1xyXG5cdFxyXG5cdHRoaXMudHlwZSA9IFwiQ2hhcmFjdGVyUGxhbmVHZW9tZXRyeVwiO1xyXG5cdFxyXG5cdHZhciB2ZXJ0cyA9IG5ldyBGbG9hdDMyQXJyYXkoW1xyXG5cdFx0LTAuNSArIHhvZmYsIC0wLjUgKyB5b2ZmLCAwICsgem9mZixcclxuXHRcdCAwLjUgKyB4b2ZmLCAtMC41ICsgeW9mZiwgMCArIHpvZmYsXHJcblx0XHQgMC41ICsgeG9mZiwgIDAuNSArIHlvZmYsIDAgKyB6b2ZmLFxyXG5cdFx0LTAuNSArIHhvZmYsICAwLjUgKyB5b2ZmLCAwICsgem9mZixcclxuXHRdKTtcclxuXHR2YXIgbm9ybXMgPSBuZXcgRmxvYXQzMkFycmF5KFsgMCwgMSwgMSwgICAwLCAwLCAxLCAgIDAsIDAsIDEsICAgMCwgMCwgMSwgXSk7XHJcblx0dmFyIHV2cyAgID0gbmV3IEZsb2F0MzJBcnJheShbIDAsIDAsICAgICAgMSwgMCwgICAgICAxLCAxLCAgICAgIDAsIDEsIF0pO1xyXG5cdHZhciBmYWNlcyA9IG5ldyBVaW50MTZBcnJheSggWyAwLCAxLCAyLCAgIDAsIDIsIDMgXSk7XHJcblx0XHJcblx0dGhpcy5hZGRBdHRyaWJ1dGUoICdpbmRleCcsIG5ldyBUSFJFRS5CdWZmZXJBdHRyaWJ1dGUoIGZhY2VzLCAxICkgKTtcclxuXHR0aGlzLmFkZEF0dHJpYnV0ZSggJ3Bvc2l0aW9uJywgbmV3IFRIUkVFLkJ1ZmZlckF0dHJpYnV0ZSggdmVydHMsIDMgKSApO1xyXG5cdHRoaXMuYWRkQXR0cmlidXRlKCAnbm9ybWFsJywgbmV3IFRIUkVFLkJ1ZmZlckF0dHJpYnV0ZSggbm9ybXMsIDMgKSApO1xyXG5cdHRoaXMuYWRkQXR0cmlidXRlKCAndXYnLCBuZXcgVEhSRUUuQnVmZmVyQXR0cmlidXRlKCB1dnMsIDIgKSApO1xyXG5cdFxyXG59XHJcbmluaGVyaXRzKENoYXJhY3RlclBsYW5lR2VvbWV0cnksIFRIUkVFLkJ1ZmZlckdlb21ldHJ5KTtcclxuXHJcblxyXG5cclxuXHJcbnZhciBWRVJUX1NIQURFUiA9IFtcclxuXHQvLyAndW5pZm9ybSBtYXQ0IG1vZGVsVmlld01hdHJpeDsnLFxyXG5cdC8vICd1bmlmb3JtIG1hdDQgcHJvamVjdGlvbk1hdHJpeDsnLFxyXG5cdCd1bmlmb3JtIGZsb2F0IHJvdGF0aW9uOycsXHJcblx0J3VuaWZvcm0gdmVjMiBzY2FsZTsnLFxyXG5cdCd1bmlmb3JtIHZlYzIgdXZPZmZzZXQ7JyxcclxuXHQndW5pZm9ybSB2ZWMyIHV2U2NhbGU7JyxcclxuXHJcblx0Ly8gJ2F0dHJpYnV0ZSB2ZWMyIHBvc2l0aW9uOycsXHJcblx0Ly8gJ2F0dHJpYnV0ZSB2ZWMyIHV2OycsXHJcblxyXG5cdCd2YXJ5aW5nIHZlYzIgdlVWOycsXHJcblxyXG5cdCd2b2lkIG1haW4oKSB7JyxcclxuXHJcblx0XHQndlVWID0gdXZPZmZzZXQgKyB1diAqIHV2U2NhbGU7JyxcclxuXHJcblx0XHQndmVjMiBhbGlnbmVkUG9zaXRpb24gPSBwb3NpdGlvbi54eSAqIHNjYWxlOycsXHJcblxyXG5cdFx0J3ZlYzIgcm90YXRlZFBvc2l0aW9uOycsXHJcblx0XHQncm90YXRlZFBvc2l0aW9uLnggPSBjb3MoIHJvdGF0aW9uICkgKiBhbGlnbmVkUG9zaXRpb24ueCAtIHNpbiggcm90YXRpb24gKSAqIGFsaWduZWRQb3NpdGlvbi55OycsXHJcblx0XHQncm90YXRlZFBvc2l0aW9uLnkgPSBzaW4oIHJvdGF0aW9uICkgKiBhbGlnbmVkUG9zaXRpb24ueCArIGNvcyggcm90YXRpb24gKSAqIGFsaWduZWRQb3NpdGlvbi55OycsXHJcblxyXG5cdFx0J3ZlYzQgZmluYWxQb3NpdGlvbjsnLFxyXG5cclxuXHRcdCdmaW5hbFBvc2l0aW9uID0gbW9kZWxWaWV3TWF0cml4ICogdmVjNCggMC4wLCAwLjAsIDAuMCwgMS4wICk7JyxcclxuXHRcdCdmaW5hbFBvc2l0aW9uLnh5ICs9IHJvdGF0ZWRQb3NpdGlvbjsnLFxyXG5cdFx0J2ZpbmFsUG9zaXRpb24gPSBwcm9qZWN0aW9uTWF0cml4ICogZmluYWxQb3NpdGlvbjsnLFxyXG5cclxuXHRcdCdnbF9Qb3NpdGlvbiA9IGZpbmFsUG9zaXRpb247JyxcclxuXHJcblx0J30nXHJcbl0uam9pbiggJ1xcbicgKTtcclxuXHJcbnZhciBGUkFHX1NIQURFUiA9IFtcclxuXHQndW5pZm9ybSB2ZWMzIGNvbG9yOycsXHJcblx0J3VuaWZvcm0gc2FtcGxlcjJEIG1hcDsnLFxyXG5cdCd1bmlmb3JtIGZsb2F0IG9wYWNpdHk7JyxcclxuXHJcblx0J3VuaWZvcm0gdmVjMyBmb2dDb2xvcjsnLFxyXG5cdCd1bmlmb3JtIGZsb2F0IGZvZ0RlbnNpdHk7JyxcclxuXHQndW5pZm9ybSBmbG9hdCBmb2dOZWFyOycsXHJcblx0J3VuaWZvcm0gZmxvYXQgZm9nRmFyOycsXHJcblxyXG5cdCd2YXJ5aW5nIHZlYzIgdlVWOycsXHJcblxyXG5cdCd2b2lkIG1haW4oKSB7JyxcclxuXHJcblx0XHQndmVjNCB0ZXh0dXJlID0gdGV4dHVyZTJEKCBtYXAsIHZVViApOycsXHJcblxyXG5cdFx0JyNpZmRlZiBBTFBIQVRFU1QnLFxyXG5cdFx0XHQnaWYgKCB0ZXh0dXJlLmEgPCBBTFBIQVRFU1QgKSBkaXNjYXJkOycsXHJcblx0XHQnI2VuZGlmJyxcclxuXHJcblx0XHQnZ2xfRnJhZ0NvbG9yID0gdmVjNCggY29sb3IgKiB0ZXh0dXJlLnh5eiwgdGV4dHVyZS5hICogb3BhY2l0eSApOycsXHJcblxyXG5cdFx0JyNpZmRlZiBVU0VfRk9HJyxcclxuXHRcdFx0J2Zsb2F0IGRlcHRoID0gZ2xfRnJhZ0Nvb3JkLnogLyBnbF9GcmFnQ29vcmQudzsnLFxyXG5cdFx0XHQnZmxvYXQgZm9nRmFjdG9yID0gMC4wOycsXHJcblx0XHRcdFxyXG5cdFx0XHQnI2lmbmRlZiBGT0dfRVhQMicsIC8vbm90ZTogTk9UIGRlZmluZWRcclxuXHRcdFx0XHJcblx0XHRcdFx0J2ZvZ0ZhY3RvciA9IHNtb290aHN0ZXAoIGZvZ05lYXIsIGZvZ0ZhciwgZGVwdGggKTsnLFxyXG5cdFx0XHRcdFxyXG5cdFx0XHQnI2Vsc2UnLFxyXG5cdFx0XHRcclxuXHRcdFx0XHQnY29uc3QgZmxvYXQgTE9HMiA9IDEuNDQyNjk1OycsXHJcblx0XHRcdFx0J2Zsb2F0IGZvZ0ZhY3RvciA9IGV4cDIoIC0gZm9nRGVuc2l0eSAqIGZvZ0RlbnNpdHkgKiBkZXB0aCAqIGRlcHRoICogTE9HMiApOycsXHJcblx0XHRcdFx0J2ZvZ0ZhY3RvciA9IDEuMCAtIGNsYW1wKCBmb2dGYWN0b3IsIDAuMCwgMS4wICk7JyxcclxuXHJcblx0XHRcdCcjZW5kaWYnLFxyXG5cdFx0XHRcclxuXHRcdFx0J2dsX0ZyYWdDb2xvciA9IG1peCggZ2xfRnJhZ0NvbG9yLCB2ZWM0KCBmb2dDb2xvciwgZ2xfRnJhZ0NvbG9yLncgKSwgZm9nRmFjdG9yICk7JyxcclxuXHJcblx0XHQnI2VuZGlmJyxcclxuXHJcblx0J30nXHJcbl0uam9pbiggJ1xcbicgKVxyXG5cclxuXHJcblxyXG5cclxuLypcclxudmFyIGluZGljZXMgPSBuZXcgVWludDE2QXJyYXkoIFsgMCwgMSwgMiwgIDAsIDIsIDMgXSApO1xyXG52YXIgdmVydGljZXMgPSBuZXcgRmxvYXQzMkFycmF5KCBbIC0gMC41LCAtIDAuNSwgMCwgICAwLjUsIC0gMC41LCAwLCAgIDAuNSwgMC41LCAwLCAgIC0gMC41LCAwLjUsIDAgXSApO1xyXG52YXIgdXZzID0gbmV3IEZsb2F0MzJBcnJheSggWyAwLCAwLCAgIDEsIDAsICAgMSwgMSwgICAwLCAxIF0gKTtcclxuXHJcbnZhciBnZW9tZXRyeSA9IG5ldyBUSFJFRS5CdWZmZXJHZW9tZXRyeSgpO1xyXG5nZW9tZXRyeS5hZGRBdHRyaWJ1dGUoICdpbmRleCcsIG5ldyBUSFJFRS5CdWZmZXJBdHRyaWJ1dGUoIGluZGljZXMsIDEgKSApO1xyXG5nZW9tZXRyeS5hZGRBdHRyaWJ1dGUoICdwb3NpdGlvbicsIG5ldyBUSFJFRS5CdWZmZXJBdHRyaWJ1dGUoIHZlcnRpY2VzLCAzICkgKTtcclxuZ2VvbWV0cnkuYWRkQXR0cmlidXRlKCAndXYnLCBuZXcgVEhSRUUuQnVmZmVyQXR0cmlidXRlKCB1dnMsIDIgKSApO1xyXG5cclxuXHJcbmZ1bmN0aW9uIFNwcml0ZUNoYXJhY3RlcihtYXRlcmlhbCkge1xyXG5cdFRIUkVFLk9iamVjdDNELmNhbGwoIHRoaXMgKTtcclxuXHJcblx0dGhpcy50eXBlID0gJ1Nwcml0ZUNoYXJhY3Rlcic7XHJcblxyXG5cdHRoaXMuZ2VvbWV0cnkgPSBnZW9tZXRyeTtcclxuXHR0aGlzLm1hdGVyaWFsID0gKCBtYXRlcmlhbCAhPT0gdW5kZWZpbmVkICkgPyBtYXRlcmlhbCA6IG5ldyBUSFJFRS5TcHJpdGVNYXRlcmlhbCgpO1xyXG5cclxufVxyXG5cclxuU3ByaXRlQ2hhcmFjdGVyLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoIFRIUkVFLk9iamVjdDNELnByb3RvdHlwZSApO1xyXG5cclxuU3ByaXRlQ2hhcmFjdGVyLnByb3RvdHlwZS5yYXljYXN0ID0gKCBmdW5jdGlvbiAoKSB7XHJcblx0dmFyIG1hdHJpeFBvc2l0aW9uID0gbmV3IFRIUkVFLlZlY3RvcjMoKTtcclxuXHJcblx0cmV0dXJuIGZ1bmN0aW9uICggcmF5Y2FzdGVyLCBpbnRlcnNlY3RzICkge1xyXG5cdFx0bWF0cml4UG9zaXRpb24uc2V0RnJvbU1hdHJpeFBvc2l0aW9uKCB0aGlzLm1hdHJpeFdvcmxkICk7XHJcblxyXG5cdFx0dmFyIGRpc3RhbmNlID0gcmF5Y2FzdGVyLnJheS5kaXN0YW5jZVRvUG9pbnQoIG1hdHJpeFBvc2l0aW9uICk7XHJcblx0XHRpZiAoIGRpc3RhbmNlID4gdGhpcy5zY2FsZS54ICkgcmV0dXJuO1xyXG5cclxuXHRcdGludGVyc2VjdHMucHVzaCgge1xyXG5cdFx0XHRkaXN0YW5jZTogZGlzdGFuY2UsXHJcblx0XHRcdHBvaW50OiB0aGlzLnBvc2l0aW9uLFxyXG5cdFx0XHRmYWNlOiBudWxsLFxyXG5cdFx0XHRvYmplY3Q6IHRoaXNcclxuXHRcdH0gKTtcclxuXHR9O1xyXG59KCkgKTtcclxuXHJcblxyXG5TcHJpdGVDaGFyYWN0ZXIucHJvdG90eXBlLmNsb25lID0gZnVuY3Rpb24gKCBvYmplY3QgKSB7XHJcblx0aWYgKCBvYmplY3QgPT09IHVuZGVmaW5lZCApIFxyXG5cdFx0b2JqZWN0ID0gbmV3IFNwcml0ZUNoYXJhY3RlciggdGhpcy5tYXRlcmlhbCApO1xyXG5cdFRIUkVFLk9iamVjdDNELnByb3RvdHlwZS5jbG9uZS5jYWxsKCB0aGlzLCBvYmplY3QgKTtcclxuXHRyZXR1cm4gb2JqZWN0O1xyXG5cclxufTsqLyIsIi8vIGFjdG9yLmpzXHJcbi8vIERlZmluZXMgdGhlIGFjdG9yIGV2ZW50IHVzZWQgdGhyb3VnaG91dCB0aGUgcGFya1xyXG5cclxudmFyIEV2ZW50ID0gcmVxdWlyZShcInRwcC1ldmVudFwiKTtcclxudmFyIGluaGVyaXRzID0gcmVxdWlyZShcImluaGVyaXRzXCIpO1xyXG52YXIgZXh0ZW5kID0gcmVxdWlyZShcImV4dGVuZFwiKTtcclxuXHJcbnZhciBDaGFyYWN0ZXJTcHJpdGUgPSByZXF1aXJlKFwiLi4vbW9kZWwvc3ByaXRlbW9kZWwuanNcIikuQ2hhcmFjdGVyU3ByaXRlO1xyXG5cclxudmFyIEdMT0JBTF9TQ0FMRVVQID0gMS42NTtcclxudmFyIEVWRU5UX1BMQU5FX05PUk1BTCA9IG5ldyBUSFJFRS5WZWN0b3IzKDAsIDEsIDApO1xyXG4vKipcclxuICogQW4gYWN0b3IgaXMgYW55IGV2ZW50IHJlcHJlc2VudGluZyBhIHBlcnNvbiwgcG9rZW1vbiwgb3Igb3RoZXIgZW50aXR5IHRoYXRcclxuICogbWF5IG1vdmUgYXJvdW5kIGluIHRoZSB3b3JsZCBvciBmYWNlIGEgZGlyZWN0aW9uLiBBY3RvcnMgbWF5IGhhdmUgZGlmZmVyZW50XHJcbiAqIGJlaGF2aW9ycywgc29tZSBjb21tb24gb25lcyBwcmVkZWZpbmVkIGluIHRoaXMgZmlsZS5cclxuICovXHJcbmZ1bmN0aW9uIEFjdG9yKGJhc2UsIG9wdHMpIHtcclxuXHRFdmVudC5jYWxsKHRoaXMsIGJhc2UsIG9wdHMpO1xyXG5cdFxyXG5cdHRoaXMub24oXCJ0aWNrXCIsIHRoaXMuX2FjdG9yVGljayk7XHJcblx0dGhpcy5vbihcImludGVyYWN0ZWRcIiwgdGhpcy5fYWN0b3JJbnRlcmFjdEZhY2UpO1xyXG5cdHRoaXMuZmFjaW5nID0gbmV3IFRIUkVFLlZlY3RvcjMoMCwgMCwgMSk7XHJcbn1cclxuaW5oZXJpdHMoQWN0b3IsIEV2ZW50KTtcclxuZXh0ZW5kKEFjdG9yLnByb3RvdHlwZSwge1xyXG5cdHNwcml0ZTogbnVsbCxcclxuXHRzcHJpdGVfZm9ybWF0OiBudWxsLFxyXG5cdFxyXG5cdHNoYWRvdyA6IHRydWUsXHJcblx0XHJcblx0Ly8vLy8vLy8vLy8vLy8vLyBQcm9wZXJ0eSBTZXR0ZXJzIC8vLy8vLy8vLy8vLy8vLy8vXHJcblx0c2NhbGU6IDEsXHJcblx0XHJcblx0c2V0U2NhbGUgOiBmdW5jdGlvbihzY2FsZSkge1xyXG5cdFx0dGhpcy5zY2FsZSA9IHNjYWxlO1xyXG5cdFx0c2NhbGUgKj0gR0xPQkFMX1NDQUxFVVA7XHJcblx0XHR0aGlzLmF2YXRhcl9zcHJpdGUuc2NhbGUuc2V0KHNjYWxlLCBzY2FsZSwgc2NhbGUpO1xyXG5cdH0sXHJcblx0XHJcblx0Ly8vLy8vLy8vLy8vLy8vLy8vLy8vLy8gQXZhdGFyIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHRhdmF0YXJfbm9kZSA6IG51bGwsXHJcblx0YXZhdGFyX3Nwcml0ZSA6IG51bGwsXHJcblx0YXZhdGFyX2Zvcm1hdCA6IG51bGwsXHJcblx0YXZhdGFyX3RleCA6IG51bGwsXHJcblx0XHJcblx0Z2V0QXZhdGFyIDogZnVuY3Rpb24obWFwKXsgXHJcblx0XHRpZiAodGhpcy5hdmF0YXJfbm9kZSkgcmV0dXJuIHRoaXMuYXZhdGFyX25vZGU7XHJcblx0XHRcclxuXHRcdHZhciBub2RlID0gdGhpcy5hdmF0YXJfbm9kZSA9IG5ldyBUSFJFRS5PYmplY3QzRCgpO1xyXG5cdFx0XHJcblx0XHRub2RlLmFkZCh0aGlzLl9hdmF0YXJfY3JlYXRlU3ByaXRlKG1hcCkpO1xyXG5cdFx0bm9kZS5hZGQodGhpcy5fYXZhdGFyX2NyZWF0ZVNoYWRvd0Nhc3RlcigpKTtcclxuXHRcdFxyXG5cdFx0cmV0dXJuIG5vZGU7XHJcblx0XHRcclxuXHR9LFxyXG5cdFxyXG5cdF9hdmF0YXJfY3JlYXRlU2hhZG93Q2FzdGVyOiBmdW5jdGlvbigpIHtcclxuXHRcdHZhciBtYXQgPSBuZXcgVEhSRUUuTWVzaEJhc2ljTWF0ZXJpYWwoKTtcclxuXHRcdG1hdC52aXNpYmxlID0gZmFsc2U7IC8vVGhlIG9iamVjdCB3b24ndCByZW5kZXIsIGJ1dCB0aGUgc2hhZG93IHN0aWxsIHdpbGxcclxuXHRcdFxyXG5cdFx0dmFyIGdlb20gPSBuZXcgVEhSRUUuU3BoZXJlR2VvbWV0cnkoMC4zLCA3LCAzKTtcclxuXHRcdFxyXG5cdFx0dmFyIG1lc2ggPSBuZXcgVEhSRUUuTWVzaChnZW9tLCBtYXQpO1xyXG5cdFx0Ly9tZXNoLnZpc2libGUgPSBmYWxzZTsgLy8/XHJcblx0XHRtZXNoLmNhc3RTaGFkb3cgPSB0cnVlO1xyXG5cdFx0bWVzaC5wb3NpdGlvbi5zZXQoMCwgMC41LCAwKTtcclxuXHRcdHJldHVybiBtZXNoO1xyXG5cdH0sXHJcblx0XHJcblx0X2F2YXRhcl9jcmVhdGVTcHJpdGUgOiBmdW5jdGlvbihtYXApIHtcclxuXHRcdHZhciBzZWxmID0gdGhpcztcclxuXHRcdHZhciBpbWcgPSBuZXcgSW1hZ2UoKTtcclxuXHRcdHZhciB0ZXh0dXJlID0gc2VsZi5hdmF0YXJfdGV4ID0gbmV3IFRIUkVFLlRleHR1cmUoaW1nKTtcclxuXHRcdFxyXG5cdFx0dGhpcy5fX29uTG9hZFNwcml0ZShpbWcsIERFRl9TUFJJVEVfRk9STUFULCB0ZXh0dXJlKTtcclxuXHRcdGltZy5zcmMgPSBERUZfU1BSSVRFO1xyXG5cdFx0XHJcblx0XHR0ZXh0dXJlLm1hZ0ZpbHRlciA9IFRIUkVFLk5lYXJlc3RGaWx0ZXI7XHJcblx0XHR0ZXh0dXJlLm1pbkZpbHRlciA9IFRIUkVFLk5lYXJlc3RGaWx0ZXI7XHJcblx0XHR0ZXh0dXJlLnJlcGVhdCA9IG5ldyBUSFJFRS5WZWN0b3IyKDAuMjUsIDAuMjUpO1xyXG5cdFx0dGV4dHVyZS5vZmZzZXQgPSBuZXcgVEhSRUUuVmVjdG9yMigwLCAwKTtcclxuXHRcdHRleHR1cmUud3JhcFMgPSBUSFJFRS5NaXJyb3JlZFJlcGVhdFdyYXBwaW5nO1xyXG5cdFx0dGV4dHVyZS53cmFwVCA9IFRIUkVFLk1pcnJvcmVkUmVwZWF0V3JhcHBpbmc7XHJcblx0XHR0ZXh0dXJlLmdlbmVyYXRlTWlwbWFwcyA9IGZhbHNlO1xyXG5cdFx0Ly9UT0RPIE1pcnJvcmVkUmVwZWF0V3JhcHBpbmcsIGFuZCBqdXN0IHVzZSBhIG5lZ2F0aXZlIHggdXYgdmFsdWUsIHRvIGZsaXAgYSBzcHJpdGVcclxuXHRcdFxyXG5cdFx0c2VsZi5hdmF0YXJfZm9ybWF0ID0gZ2V0U3ByaXRlRm9ybWF0KERFRl9TUFJJVEVfRk9STUFUKTtcclxuXHRcdFxyXG5cdFx0Ly8gdmFyIG1hdCAvKj0gc2VsZi5hdmF0YXJfbWF0Ki8gPSBuZXcgVEhSRUUuU3ByaXRlTWF0ZXJpYWwoe1xyXG5cdFx0Ly8gXHRtYXA6IHRleHR1cmUsXHJcblx0XHQvLyBcdGNvbG9yOiAweEZGRkZGRixcclxuXHRcdC8vIFx0dHJhbnNwYXJlbnQ6IHRydWUsXHJcblx0XHQvLyB9KTtcclxuXHRcdFxyXG5cdFx0Y3VycmVudE1hcC5tYXJrTG9hZGluZygpO1xyXG5cdFx0dGhpcy5fYXZhdGFyX2xvYWRTcHJpdGUobWFwLCB0ZXh0dXJlKTtcclxuXHRcdFxyXG5cdFx0Ly92YXIgc3ByaXRlID0gc2VsZi5hdmF0YXJfc3ByaXRlID0gbmV3IFRIUkVFLlNwcml0ZShtYXQpO1xyXG5cdFx0dmFyIHNwcml0ZSA9IHNlbGYuYXZhdGFyX3Nwcml0ZSA9IG5ldyBDaGFyYWN0ZXJTcHJpdGUoe1xyXG5cdFx0XHRtYXA6IHRleHR1cmUsXHJcblx0XHRcdGNvbG9yOiAweEZGRkZGRixcclxuXHRcdFx0b2Zmc2V0OiBuZXcgVEhSRUUuVmVjdG9yMygwLCAwLjMsIDAuNSksXHJcblx0XHR9KTtcclxuXHRcdHNlbGYuc2V0U2NhbGUoc2VsZi5zY2FsZSk7XHJcblx0XHRcclxuXHRcdHJldHVybiBzcHJpdGU7XHJcblx0fSxcclxuXHRcclxuXHRfYXZhdGFyX2xvYWRTcHJpdGUgOiBmdW5jdGlvbihtYXAsIHRleHR1cmUpIHtcclxuXHRcdHZhciBzZWxmID0gdGhpcztcclxuXHRcdG1hcC5sb2FkU3ByaXRlKHNlbGYuaWQsIHNlbGYuc3ByaXRlLCBmdW5jdGlvbihlcnIsIHVybCl7XHJcblx0XHRcdGlmIChlcnIpIHtcclxuXHRcdFx0XHRjb25zb2xlLmVycm9yKFwiRVJST1IgTE9BRElORyBTUFJJVEU6IFwiLCBlcnIpO1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0dmFyIGltZyA9IG5ldyBJbWFnZSgpO1xyXG5cdFx0XHRzZWxmLl9fb25Mb2FkU3ByaXRlKGltZywgc2VsZi5zcHJpdGVfZm9ybWF0LCB0ZXh0dXJlKTtcclxuXHRcdFx0aW1nLnNyYyA9IHVybDtcclxuXHRcdH0pO1xyXG5cdH0sXHJcblx0XHJcblx0X19vbkxvYWRTcHJpdGUgOiBmdW5jdGlvbihpbWcsIGZvcm1hdCwgdGV4dHVyZSkge1xyXG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xyXG5cdFx0dmFyIGYgPSBmdW5jdGlvbigpIHtcclxuXHRcdFx0dGV4dHVyZS5pbWFnZSA9IGltZztcclxuXHRcdFx0XHJcblx0XHRcdHNlbGYuYXZhdGFyX2Zvcm1hdCA9IGdldFNwcml0ZUZvcm1hdChmb3JtYXQpO1xyXG5cdFx0XHR0ZXh0dXJlLnJlcGVhdC5zZXQoc2VsZi5hdmF0YXJfZm9ybWF0LnJlcGVhdCwgc2VsZi5hdmF0YXJfZm9ybWF0LnJlcGVhdCk7XHJcblxyXG5cdFx0XHR0ZXh0dXJlLm5lZWRzVXBkYXRlID0gdHJ1ZTtcclxuXHRcdFx0XHJcblx0XHRcdHNlbGYuc2hvd0FuaW1hdGlvbkZyYW1lKFwiZDBcIik7XHJcblx0XHRcdHNlbGYucGxheUFuaW1hdGlvbihcInN0YW5kXCIpO1xyXG5cdFx0XHRpbWcucmVtb3ZlRXZlbnRMaXN0ZW5lcihcImxvYWRcIiwgZik7XHJcblx0XHRcdGN1cnJlbnRNYXAubWFya0xvYWRGaW5pc2hlZCgpO1xyXG5cdFx0fVxyXG5cdFx0aW1nLm9uKFwibG9hZFwiLCBmKTtcclxuXHR9LFxyXG5cdFxyXG5cdC8vLy8vLy8vLy8vLy8vLy8vLy8gQW5pbWF0aW9uIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHRfYW5pbWF0aW9uU3RhdGUgOiBudWxsLFxyXG5cdGZhY2luZyA6IG51bGwsXHJcblx0XHJcblx0X2luaXRBbmltYXRpb25TdGF0ZSA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0aWYgKCF0aGlzLl9hbmltYXRpb25TdGF0ZSlcclxuXHRcdFx0dGhpcy5fYW5pbWF0aW9uU3RhdGUgPSB7XHJcblx0XHRcdFx0Y3VyckFuaW0gOiBudWxsLCAvLyBBbmltYXRpb24gb2JqZWN0XHJcblx0XHRcdFx0Y3VyckZyYW1lIDogbnVsbCwgLy8gQ3VycmVudGx5IGRpc3BsYXllZCBzcHJpdGUgZnJhbWUgbmFtZVxyXG5cdFx0XHRcdG5leHRBbmltIDogbnVsbCwgLy8gQW5pbWF0aW9uIG9iamVjdCBpbiBxdWV1ZVxyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdHN0b3BOZXh0VHJhbnNpdGlvbjogZmFsc2UsIC8vU3RvcCBhdCB0aGUgbmV4dCB0cmFuc2l0aW9uIGZyYW1lLCB0byBzaG9ydC1zdG9wIHRoZSBcIkJ1bXBcIiBhbmltYXRpb25cclxuXHRcdFx0fTtcclxuXHRcdHJldHVybiB0aGlzLl9hbmltYXRpb25TdGF0ZTtcclxuXHR9LFxyXG5cdFxyXG5cdGdldERpcmVjdGlvbkZhY2luZyA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0dmFyIGRpcnZlY3RvciA9IHRoaXMuZmFjaW5nLmNsb25lKCk7XHJcblx0XHRkaXJ2ZWN0b3IuYXBwbHlRdWF0ZXJuaW9uKCBjdXJyZW50TWFwLmNhbWVyYS5xdWF0ZXJuaW9uICk7XHJcblx0XHRkaXJ2ZWN0b3IucHJvamVjdE9uUGxhbmUoRVZFTlRfUExBTkVfTk9STUFMKS5ub3JtYWxpemUoKTtcclxuXHRcdFxyXG5cdFx0dmFyIHggPSBkaXJ2ZWN0b3IueCwgeSA9IGRpcnZlY3Rvci56O1xyXG5cdFx0Ly8gY29uc29sZS5sb2coXCJESVJGQUNJTkc6XCIsIHgsIHkpO1xyXG5cdFx0aWYgKE1hdGguYWJzKHgpID4gTWF0aC5hYnMoeSkpIHsgLy9EaXJlY3Rpb24gdmVjdG9yIGlzIHBvaW50aW5nIGFsb25nIHggYXhpc1xyXG5cdFx0XHRpZiAoeCA+IDApIHJldHVybiBcImxcIjtcclxuXHRcdFx0ZWxzZSByZXR1cm4gXCJyXCI7XHJcblx0XHR9IGVsc2UgeyAvL0RpcmVjdGlvbiB2ZWN0b3IgaXMgcG9pbnRpbmcgYWxvbmcgeSBheGlzXHJcblx0XHRcdGlmICh5ID4gMCkgcmV0dXJuIFwiZFwiO1xyXG5cdFx0XHRlbHNlIHJldHVybiBcInVcIjtcclxuXHRcdH1cclxuXHRcdHJldHVybiBcImRcIjtcclxuXHR9LFxyXG5cdFxyXG5cdHNob3dBbmltYXRpb25GcmFtZSA6IGZ1bmN0aW9uKGZyYW1lKSB7XHJcblx0XHR2YXIgc3RhdGUgPSB0aGlzLl9pbml0QW5pbWF0aW9uU3RhdGUoKTtcclxuXHRcdFxyXG5cdFx0dmFyIGRlZiA9IHRoaXMuYXZhdGFyX2Zvcm1hdC5mcmFtZXNbZnJhbWVdO1xyXG5cdFx0aWYgKCFkZWYpIHtcclxuXHRcdFx0Y29uc29sZS53YXJuKFwiRVJST1IgXCIsIHRoaXMuaWQsIFwiOiBBbmltYXRpb24gZnJhbWUgZG9lc24ndCBleGlzdDpcIiwgZnJhbWUpO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblx0XHRzdGF0ZS5mcmFtZU5hbWUgPSBmcmFtZTtcclxuXHRcdFxyXG5cdFx0dmFyIGZsaXAgPSBmYWxzZTtcclxuXHRcdGlmICh0eXBlb2YgZGVmID09IFwic3RyaW5nXCIpIHsgLy9yZWRpcmVjdFxyXG5cdFx0XHRkZWYgPSB0aGlzLmF2YXRhcl9mb3JtYXQuZnJhbWVzW2RlZl07XHJcblx0XHRcdGZsaXAgPSB0cnVlO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHR2YXIgdSA9IGRlZlswXSAqIHRoaXMuYXZhdGFyX2Zvcm1hdC5yZXBlYXQ7XHJcblx0XHR2YXIgdiA9IDEgLSAoKGRlZlsxXSsxKSAqIHRoaXMuYXZhdGFyX2Zvcm1hdC5yZXBlYXQpO1xyXG5cdFx0Ly9Gb3Igc29tZSByZWFzb24sIG9mZnNldHMgYXJlIGZyb20gdGhlIEJPVFRPTSBsZWZ0PyFcclxuXHRcdFxyXG5cdFx0aWYgKGZsaXAgJiYgdGhpcy5hdmF0YXJfZm9ybWF0LmZsaXApIHtcclxuXHRcdFx0dSA9IDAgLSAoZGVmWzBdLTEpICogdGhpcy5hdmF0YXJfZm9ybWF0LnJlcGVhdDsgLy9UT0RPIHRlc3RcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0dGhpcy5hdmF0YXJfdGV4Lm9mZnNldC5zZXQodSwgdik7IFxyXG5cdFx0dGhpcy5hdmF0YXJfdGV4Lm5lZWRzVXBkYXRlID0gdHJ1ZTtcclxuXHR9LFxyXG5cdFxyXG5cdHBsYXlBbmltYXRpb24gOiBmdW5jdGlvbihhbmltTmFtZSwgb3B0cykge1xyXG5cdFx0dmFyIHN0YXRlID0gdGhpcy5faW5pdEFuaW1hdGlvblN0YXRlKCk7XHJcblx0XHRpZiAoIW9wdHMpIG9wdHMgPSB7fTtcclxuXHRcdFxyXG5cdFx0dmFyIGFuaW0gPSB0aGlzLmF2YXRhcl9mb3JtYXQuYW5pbXNbYW5pbU5hbWVdO1xyXG5cdFx0aWYgKCFhbmltKSB7XHJcblx0XHRcdGNvbnNvbGUud2FybihcIkVSUk9SXCIsIHRoaXMuaWQsIFwiOiBBbmltYXRpb24gbmFtZSBkb2Vzbid0IGV4aXN0OlwiLCBhbmltTmFtZSk7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHRcdHN0YXRlLm5leHRBbmltID0gYW5pbTtcclxuXHRcdGFuaW0uc3BlZWQgPSAob3B0cy5zcGVlZCA9PSB1bmRlZmluZWQpPyAxIDogb3B0cy5zcGVlZDtcclxuXHRcdHN0YXRlLnN0b3BOZXh0VHJhbnNpdGlvbiA9IG9wdHMuc3RvcE5leHRUcmFuc2l0aW9uIHx8IGZhbHNlO1xyXG5cdH0sXHJcblx0XHJcblx0c3RvcEFuaW1hdGlvbiA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0dmFyIHN0YXRlID0gdGhpcy5faW5pdEFuaW1hdGlvblN0YXRlKCk7XHJcblx0XHRcclxuXHRcdC8vIHN0YXRlLnJ1bm5pbmcgPSBmYWxzZTtcclxuXHRcdC8vIHN0YXRlLnF1ZXVlID0gbnVsbDtcclxuXHRcdC8vIHN0YXRlLnN0b3BGcmFtZSA9IG51bGw7XHJcblx0XHR0aGlzLmVtaXQoXCJhbmltLWVuZFwiLCBzdGF0ZS5hbmltTmFtZSk7XHJcblx0fSxcclxuXHRcclxuXHRfdGlja19kb0FuaW1hdGlvbjogZnVuY3Rpb24oZGVsdGEpIHtcclxuXHRcdHZhciBzdGF0ZSA9IHRoaXMuX2FuaW1hdGlvblN0YXRlO1xyXG5cdFx0dmFyIENBID0gc3RhdGUuY3VyckFuaW07XHJcblx0XHRpZiAoIUNBKSBDQSA9IHN0YXRlLmN1cnJBbmltID0gc3RhdGUubmV4dEFuaW07XHJcblx0XHRpZiAoIUNBKSByZXR1cm47XHJcblx0XHRcclxuXHRcdENBLmFkdmFuY2UoZGVsdGEpO1xyXG5cdFx0XHJcblx0XHRpZiAoc3RhdGUubmV4dEFuaW0gJiYgQ0EuY2FuVHJhbnNpdGlvbigpKSB7XHJcblx0XHRcdC8vU3dpdGNoIGFuaW1hdGlvbnNcclxuXHRcdFx0Q0EucmVzZXQoKTtcclxuXHRcdFx0Q0EgPSBzdGF0ZS5jdXJyQW5pbSA9IHN0YXRlLm5leHRBbmltO1xyXG5cdFx0XHRzdGF0ZS5uZXh0QW5pbSA9IG51bGw7XHJcblx0XHRcdFxyXG5cdFx0XHRpZiAoc3RhdGUuc3RvcE5leHRUcmFuc2l0aW9uKSB7XHJcblx0XHRcdFx0dGhpcy5wbGF5QW5pbWF0aW9uKFwic3RhbmRcIik7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0dmFyIGRpciA9IHRoaXMuZ2V0RGlyZWN0aW9uRmFjaW5nKCk7XHJcblx0XHR2YXIgZnJhbWUgPSBDQS5nZXRGcmFtZVRvRGlzcGxheShkaXIpO1xyXG5cdFx0aWYgKGZyYW1lICE9IHN0YXRlLmN1cnJGcmFtZSkge1xyXG5cdFx0XHR0aGlzLnNob3dBbmltYXRpb25GcmFtZShmcmFtZSk7XHJcblx0XHR9XHJcblx0XHRcclxuXHR9LFxyXG5cdFxyXG5cdC8vLy8vLy8vLy8vLy8vLy8vLy8gTW92ZW1lbnQgYW5kIFBhdGhpbmcgLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cdF9wYXRoaW5nU3RhdGUgOiBudWxsLFxyXG5cdFxyXG5cdF9pbml0UGF0aGluZ1N0YXRlIDogZnVuY3Rpb24oKSB7XHJcblx0XHRpZiAoIXRoaXMuX3BhdGhpbmdTdGF0ZSlcclxuXHRcdFx0dGhpcy5fcGF0aGluZ1N0YXRlID0ge1xyXG5cdFx0XHRcdHF1ZXVlOiBbXSxcclxuXHRcdFx0XHRtb3Zpbmc6IGZhbHNlLFxyXG5cdFx0XHRcdHNwZWVkOiAxLFxyXG5cdFx0XHRcdGRlbHRhOiAwLCAvL3RoZSBkZWx0YSBmcm9tIHNyYyB0byBkZXN0XHJcblx0XHRcdFx0anVtcGluZyA6IGZhbHNlLFxyXG5cdFx0XHRcdC8vIGRpcjogXCJkXCIsXHJcblx0XHRcdFx0XHJcblx0XHRcdFx0ZGVzdExvY0M6IG5ldyBUSFJFRS5WZWN0b3IzKCkuc2V0KHRoaXMubG9jYXRpb24pLCAvL2NvbGxpc2lvbiBtYXAgbG9jYXRpb25cclxuXHRcdFx0XHRkZXN0TG9jMzogbmV3IFRIUkVFLlZlY3RvcjMoKSwgLy93b3JsZCBzcGFjZSBsb2NhdGlvblxyXG5cdFx0XHRcdHNyY0xvY0M6IG5ldyBUSFJFRS5WZWN0b3IzKCkuc2V0KHRoaXMubG9jYXRpb24pLFxyXG5cdFx0XHRcdHNyY0xvYzM6IG5ldyBUSFJFRS5WZWN0b3IzKCksXHJcblx0XHRcdFx0bWlkcG9pbnRPZmZzZXQ6IG5ldyBUSFJFRS5WZWN0b3IzKCksXHJcblx0XHRcdH07XHJcblx0XHRyZXR1cm4gdGhpcy5fcGF0aGluZ1N0YXRlO1xyXG5cdH0sXHJcblx0XHJcblx0cGF0aFRvIDogZnVuY3Rpb24oeCwgeSkge1xyXG5cdFx0dmFyIHN0YXRlID0gdGhpcy5faW5pdFBhdGhpbmdTdGF0ZSgpO1xyXG5cdFx0XHJcblx0XHRjb25zb2xlLmVycm9yKHRoaXMuaWQsIFwiOiBQYXRoaW5nIGhhcyBub3QgYmVlbiBpbXBsZW1lbnRlZCB5ZXQhXCIpO1xyXG5cdH0sXHJcblx0XHJcblx0Y2xlYXJQYXRoaW5nIDogZnVuY3Rpb24oKSB7XHJcblx0XHR2YXIgc3RhdGUgPSB0aGlzLl9pbml0UGF0aGluZ1N0YXRlKCk7XHJcblx0XHRzdGF0ZS5xdWV1ZS5sZW5ndGggPSAwO1xyXG5cdH0sXHJcblx0XHJcblx0bW92ZURpciA6IGZ1bmN0aW9uKGRpcikge1xyXG5cdFx0dmFyIHggPSB0aGlzLmxvY2F0aW9uLng7XHJcblx0XHR2YXIgeSA9IHRoaXMubG9jYXRpb24ueTtcclxuXHRcdHZhciB6ID0gdGhpcy5sb2NhdGlvbi56O1xyXG5cdFx0c3dpdGNoIChkaXIpIHtcclxuXHRcdFx0Y2FzZSBcImRcIjogY2FzZSBcImRvd25cIjpcdHkgKz0gMTsgYnJlYWs7XHJcblx0XHRcdGNhc2UgXCJ1XCI6IGNhc2UgXCJ1cFwiOlx0eSAtPSAxOyBicmVhaztcclxuXHRcdFx0Y2FzZSBcImxcIjogY2FzZSBcImxlZnRcIjpcdHggLT0gMTsgYnJlYWs7XHJcblx0XHRcdGNhc2UgXCJyXCI6IGNhc2UgXCJyaWdodFwiOlx0eCArPSAxOyBicmVhaztcclxuXHRcdH1cclxuXHRcdHRoaXMubW92ZVRvKHgsIHksIHopO1xyXG5cdH0sXHJcblx0XHJcblx0ZmFjZURpciA6IGZ1bmN0aW9uKHgsIHkpIHtcclxuXHRcdHRoaXMuZmFjaW5nLnNldCgteCwgMCwgeSk7XHJcblx0fSxcclxuXHRcclxuXHRtb3ZlVG8gOiBmdW5jdGlvbih4LCB5LCBsYXllciwgYnlwYXNzKSB7IC8vYnlwYXNzIFdhbGttYXNrIGNoZWNrXHJcblx0XHR2YXIgc3RhdGUgPSB0aGlzLl9pbml0UGF0aGluZ1N0YXRlKCk7XHJcblx0XHR2YXIgc3JjID0gdGhpcy5sb2NhdGlvbjtcclxuXHRcdGxheWVyID0gKGxheWVyID09IHVuZGVmaW5lZCk/IHRoaXMubG9jYXRpb24ueiA6IGxheWVyO1xyXG5cdFx0XHJcblx0XHR0aGlzLmZhY2luZy5zZXQoc3JjLngteCwgMCwgeS1zcmMueSk7XHJcblx0XHRcclxuXHRcdHZhciB3YWxrbWFzayA9IGN1cnJlbnRNYXAuY2FuV2Fsa0JldHdlZW4oc3JjLngsIHNyYy55LCB4LCB5KTtcclxuXHRcdGlmIChieXBhc3MgIT09IHVuZGVmaW5lZCkgd2Fsa21hc2sgPSBieXBhc3M7XHJcblx0XHRpZiAoIXdhbGttYXNrKSB7XHJcblx0XHRcdGNvbnNvbGUud2Fybih0aGlzLmlkLCBcIjogQ2Fubm90IHdhbGsgdG8gbG9jYXRpb25cIiwgXCIoXCIreCtcIixcIit5K1wiKVwiKTtcclxuXHRcdFx0Y3VycmVudE1hcC5kaXNwYXRjaCh4LCB5LCBcImJ1bXBlZFwiLCB0aGlzLmZhY2luZyk7XHJcblx0XHRcdC8vIHRoaXMuZW1pdChcImJ1bXBlZFwiLCB0aGlzLmZhY2luZyk7IC8vZ2V0RGlyRnJvbUxvYyh4LCB5LCBzcmMueCwgc3JjLnkpKTtcclxuXHRcdFx0dGhpcy5wbGF5QW5pbWF0aW9uKFwiYnVtcFwiLCB7IHN0b3BOZXh0VHJhbnNpdGlvbjogdHJ1ZSB9KTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cdFx0aWYgKCh3YWxrbWFzayAmIDB4OCkgPT0gMHg4KSB7XHJcblx0XHRcdC8vIFRyYW5zaXRpb24gbm93IHRvIGFub3RoZXIgbGF5ZXJcclxuXHRcdFx0dmFyIHQgPSBjdXJyZW50TWFwLmdldExheWVyVHJhbnNpdGlvbih4LCB5LCB0aGlzLmxvY2F0aW9uLnopO1xyXG5cdFx0XHRjb25zb2xlLmxvZyhcIkxheWVyIFRyYW5zaXRpb246IFwiLCB0KTtcclxuXHRcdFx0eCA9IHQueDsgeSA9IHQueTsgbGF5ZXIgPSB0LmxheWVyO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHR2YXIgYW5pbW9wdHMgPSB7fTtcclxuXHRcdHN0YXRlLm1pZHBvaW50T2Zmc2V0LnNldCgwLCAwLCAwKTtcclxuXHRcdHN0YXRlLnNyY0xvY0Muc2V0KHNyYyk7XHJcblx0XHRzdGF0ZS5zcmNMb2MzLnNldChjdXJyZW50TWFwLmdldDNEVGlsZUxvY2F0aW9uKHNyYykpO1xyXG5cdFx0c3RhdGUuZGVzdExvY0Muc2V0KHgsIHksIGxheWVyKTtcclxuXHRcdHN0YXRlLmRlc3RMb2MzLnNldChjdXJyZW50TWFwLmdldDNEVGlsZUxvY2F0aW9uKHgsIHksIGxheWVyKSk7XHJcblx0XHRzdGF0ZS5kZWx0YSA9IDA7XHJcblx0XHRzdGF0ZS5zcGVlZCA9IDE7XHJcblx0XHRzdGF0ZS5tb3ZpbmcgPSB0cnVlO1xyXG5cdFx0XHJcblx0XHRpZiAoKHdhbGttYXNrICYgMHgyKSA9PT0gMHgyKSB7XHJcblx0XHRcdHN0YXRlLm1pZHBvaW50T2Zmc2V0LnNldFkoMC42KTtcclxuXHRcdFx0c3RhdGUuanVtcGluZyA9IHRydWU7XHJcblx0XHRcdFNvdW5kTWFuYWdlci5wbGF5U291bmQoXCJ3YWxrX2p1bXBcIik7XHJcblx0XHRcdGFuaW1vcHRzLnNwZWVkID0gMS41O1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHR0aGlzLnBsYXlBbmltYXRpb24oXCJ3YWxrXCIsIGFuaW1vcHRzKTtcclxuXHRcdHRoaXMuZW1pdChcIm1vdmluZ1wiLCBzdGF0ZS5zcmNMb2NDLngsIHN0YXRlLnNyY0xvY0MueSwgc3RhdGUuZGVzdExvY0MueCwgc3RhdGUuZGVzdExvY0MueSk7XHJcblx0fSxcclxuXHRcclxuXHRfdGlja19kb01vdmVtZW50IDogZnVuY3Rpb24oZGVsdGEpIHtcclxuXHRcdHZhciBzdGF0ZSA9IHRoaXMuX2luaXRQYXRoaW5nU3RhdGUoKTtcclxuXHRcdFxyXG5cdFx0c3RhdGUuZGVsdGEgKz0gc3RhdGUuc3BlZWQgKiAoZGVsdGEgKiBDT05GSUcuc3BlZWQucGF0aGluZyk7XHJcblx0XHR2YXIgYWxwaGEgPSBNYXRoLmNsYW1wKHN0YXRlLmRlbHRhKTtcclxuXHRcdHZhciBiZXRhID0gTWF0aC5zaW4oYWxwaGEgKiBNYXRoLlBJKTtcclxuXHRcdHRoaXMuYXZhdGFyX25vZGUucG9zaXRpb24uc2V0KCBcclxuXHRcdFx0Ly9MZXJwIGJldHdlZW4gc3JjIGFuZCBkZXN0IChidWlsdCBpbiBsZXJwKCkgaXMgZGVzdHJ1Y3RpdmUsIGFuZCBzZWVtcyBiYWRseSBkb25lKVxyXG5cdFx0XHRzdGF0ZS5zcmNMb2MzLnggKyAoKHN0YXRlLmRlc3RMb2MzLnggLSBzdGF0ZS5zcmNMb2MzLngpICogYWxwaGEpICsgKHN0YXRlLm1pZHBvaW50T2Zmc2V0LnggKiBiZXRhKSxcclxuXHRcdFx0c3RhdGUuc3JjTG9jMy55ICsgKChzdGF0ZS5kZXN0TG9jMy55IC0gc3RhdGUuc3JjTG9jMy55KSAqIGFscGhhKSArIChzdGF0ZS5taWRwb2ludE9mZnNldC55ICogYmV0YSksXHJcblx0XHRcdHN0YXRlLnNyY0xvYzMueiArICgoc3RhdGUuZGVzdExvYzMueiAtIHN0YXRlLnNyY0xvYzMueikgKiBhbHBoYSkgKyAoc3RhdGUubWlkcG9pbnRPZmZzZXQueiAqIGJldGEpXHJcblx0XHQpO1xyXG5cdFx0XHJcblx0XHRpZiAoc3RhdGUuZGVsdGEgPiAxKSB7XHJcblx0XHRcdHRoaXMuZW1pdChcIm1vdmVkXCIsIHN0YXRlLnNyY0xvY0MueCwgc3RhdGUuc3JjTG9jQy55LCBzdGF0ZS5kZXN0TG9jQy54LCBzdGF0ZS5kZXN0TG9jQy55KTtcclxuXHRcdFx0dGhpcy5sb2NhdGlvbi5zZXQoIHN0YXRlLmRlc3RMb2NDICk7XHJcblx0XHRcdFxyXG5cdFx0XHRpZiAoc3RhdGUuanVtcGluZykge1xyXG5cdFx0XHRcdC8vVE9ETyBwYXJ0aWNsZSBlZmZlY3RzXHJcblx0XHRcdFx0U291bmRNYW5hZ2VyLnBsYXlTb3VuZChcIndhbGtfanVtcF9sYW5kXCIpO1xyXG5cdFx0XHRcdHN0YXRlLmp1bXBpbmcgPSBmYWxzZTtcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0dmFyIG5leHQgPSBzdGF0ZS5xdWV1ZS5zaGlmdCgpO1xyXG5cdFx0XHRpZiAoIW5leHQpIHtcclxuXHRcdFx0XHRzdGF0ZS5kZWx0YSA9IDA7XHJcblx0XHRcdFx0c3RhdGUubW92aW5nID0gZmFsc2U7XHJcblx0XHRcdFx0Ly8gdGhpcy5zdG9wQW5pbWF0aW9uKCk7XHJcblx0XHRcdFx0dGhpcy5wbGF5QW5pbWF0aW9uKFwic3RhbmRcIik7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0dGhpcy5tb3ZlVG8obmV4dC54LCBuZXh0LnksIG5leHQueik7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9LFxyXG5cdFxyXG5cdFxyXG5cdC8vLy8vLy8vLy8vLy8vLy8vLy8vLyBQcml2YXRlIE1ldGhvZHMgLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cdFxyXG5cdGNhbldhbGtPbiA6IGZ1bmN0aW9uKCl7IHJldHVybiBmYWxzZTsgfSxcclxuXHRcclxuXHRfbm9ybWFsaXplTG9jYXRpb24gOiBmdW5jdGlvbigpIHtcclxuXHRcdHZhciBudW0gPSBFdmVudC5wcm90b3R5cGUuX25vcm1hbGl6ZUxvY2F0aW9uLmNhbGwodGhpcyk7XHJcblx0XHRpZiAobnVtICE9IDEgfHwgIXRoaXMubG9jYXRpb24pXHJcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIkFjdG9ycyBjYW4gb25seSBiZSBpbiBvbmUgcGxhY2UgYXQgYSB0aW1lISBOdW1iZXIgb2YgbG9jYXRpb25zOiBcIitudW0pO1xyXG5cdH0sXHJcblx0XHJcblx0X2FjdG9yVGljayA6IGZ1bmN0aW9uKGRlbHRhKSB7XHJcblx0XHQvLyBEbyBhbmltYXRpb25cclxuXHRcdGlmICh0aGlzLl9hbmltYXRpb25TdGF0ZSkgXHJcblx0XHRcdHRoaXMuX3RpY2tfZG9BbmltYXRpb24oZGVsdGEpO1xyXG5cdFx0XHJcblx0XHQvLyBEbyBtb3ZlbWVudFxyXG5cdFx0aWYgKHRoaXMuX3BhdGhpbmdTdGF0ZSAmJiB0aGlzLl9wYXRoaW5nU3RhdGUubW92aW5nKVxyXG5cdFx0XHR0aGlzLl90aWNrX2RvTW92ZW1lbnQoZGVsdGEpO1xyXG5cdH0sXHJcblx0XHJcblx0X2FjdG9ySW50ZXJhY3RGYWNlIDogZnVuY3Rpb24odmVjdG9yKSB7XHJcblx0XHR0aGlzLmZhY2luZyA9IHZlY3Rvci5jbG9uZSgpLm5lZ2F0ZSgpO1xyXG5cdH0sXHJcblx0XHJcbn0pO1xyXG5tb2R1bGUuZXhwb3J0cyA9IEFjdG9yO1xyXG5cclxuXHJcblxyXG5mdW5jdGlvbiBnZXREaXJGcm9tTG9jKHgxLCB5MSwgeDIsIHkyKSB7XHJcblx0cmV0dXJuIG5ldyBUSFJFRS5WZWN0b3IzKHgyLXgxLCAwLCB5Mi15MSk7XHJcblx0Ly8gdmFyIGR4ID0geDIgLSB4MTtcclxuXHQvLyB2YXIgZHkgPSB5MiAtIHkxO1xyXG5cdC8vIGlmIChNYXRoLmFicyhkeCkgPiBNYXRoLmFicyhkeSkpIHtcclxuXHQvLyBcdGlmIChkeCA+IDApIHsgcmV0dXJuIFwiclwiOyB9XHJcblx0Ly8gXHRlbHNlIGlmIChkeCA8IDApIHsgcmV0dXJuIFwibFwiOyB9XHJcblx0Ly8gfSBlbHNlIHtcclxuXHQvLyBcdGlmIChkeSA+IDApIHsgcmV0dXJuIFwiZFwiOyB9XHJcblx0Ly8gXHRlbHNlIGlmIChkeSA8IDApIHsgcmV0dXJuIFwidVwiOyB9XHJcblx0Ly8gfVxyXG5cdC8vIHJldHVybiBcImRcIjtcclxufVxyXG5cclxuXHJcbmZ1bmN0aW9uIGdldFNwcml0ZUZvcm1hdChzdHIpIHtcclxuXHR2YXIgZm9ybWF0ID0gc3RyLnNwbGl0KFwiLVwiKTtcclxuXHR2YXIgbmFtZSA9IGZvcm1hdFswXTtcclxuXHR2YXIgc2l6ZSA9IGZvcm1hdFsxXS5zcGxpdChcInhcIik7XHJcblx0c2l6ZVsxXSA9IHNpemVbMV0gfHwgc2l6ZVswXTtcclxuXHRcclxuXHR2YXIgYmFzZSA9IHtcclxuXHRcdHdpZHRoOiBzaXplWzBdLCBoZWlnaHQ6IHNpemVbMV0sIGZsaXA6IGZhbHNlLCByZXBlYXQ6IDAuMjUsXHJcblx0XHRmcmFtZXM6IHtcclxuXHRcdFx0XCJ1M1wiOiBcInUwXCIsIFwiZDNcIjogXCJkMFwiLCBcImwzXCI6IFwibDBcIiwgXCJyM1wiOiBcInIwXCIsXHJcblx0XHR9LFxyXG5cdFx0YW5pbXMgOiBnZXRTdGFuZGFyZEFuaW1hdGlvbnMoKSxcclxuXHR9O1xyXG5cdFxyXG5cdHN3aXRjaCAobmFtZSkge1xyXG5cdFx0Y2FzZSBcInB0X2hvcnpyb3dcIjogXHJcblx0XHRcdHJldHVybiBleHRlbmQodHJ1ZSwgYmFzZSwgeyBcclxuXHRcdFx0XHRmcmFtZXM6IHtcclxuXHRcdFx0XHRcdFwidTBcIjogWzEsIDBdLCBcInUxXCI6IFsxLCAxXSwgXCJ1MlwiOiBbMSwgMl0sXHJcblx0XHRcdFx0XHRcImQwXCI6IFswLCAwXSwgXCJkMVwiOiBbMCwgMV0sIFwiZDJcIjogWzAsIDJdLFxyXG5cdFx0XHRcdFx0XCJsMFwiOiBbMiwgMF0sIFwibDFcIjogWzIsIDFdLCBcImwyXCI6IFsyLCAyXSxcclxuXHRcdFx0XHRcdFwicjBcIjogWzMsIDBdLCBcInIxXCI6IFszLCAxXSwgXCJyMlwiOiBbMywgMl0sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fSk7XHJcblx0XHRjYXNlIFwicHRfdmVydGNvbFwiOiBcclxuXHRcdFx0cmV0dXJuIGV4dGVuZCh0cnVlLCBiYXNlLCB7IFxyXG5cdFx0XHRcdGZyYW1lczoge1xyXG5cdFx0XHRcdFx0XCJ1MFwiOiBbMCwgMV0sIFwidTFcIjogWzEsIDFdLCBcInUyXCI6IFsyLCAxXSxcclxuXHRcdFx0XHRcdFwiZDBcIjogWzAsIDBdLCBcImQxXCI6IFsxLCAwXSwgXCJkMlwiOiBbMiwgMF0sXHJcblx0XHRcdFx0XHRcImwwXCI6IFswLCAyXSwgXCJsMVwiOiBbMSwgMl0sIFwibDJcIjogWzIsIDJdLFxyXG5cdFx0XHRcdFx0XCJyMFwiOiBbMCwgM10sIFwicjFcIjogWzEsIDNdLCBcInIyXCI6IFsyLCAzXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9KTtcclxuXHRcdGNhc2UgXCJoZ192ZXJ0bWl4XCI6IFxyXG5cdFx0XHRyZXR1cm4gZXh0ZW5kKHRydWUsIGJhc2UsIHsgXHJcblx0XHRcdFx0ZnJhbWVzOiB7XHJcblx0XHRcdFx0XHRcInUwXCI6IFswLCAwXSwgXCJ1MVwiOiBbMSwgM10sIFwidTJcIjogWzIsIDBdLFxyXG5cdFx0XHRcdFx0XCJkMFwiOiBbMiwgMV0sIFwiZDFcIjogWzIsIDJdLCBcImQyXCI6IFsyLCAzXSxcclxuXHRcdFx0XHRcdFwibDBcIjogWzAsIDJdLCBcImwxXCI6IFswLCAxXSwgXCJsMlwiOiBbMCwgM10sXHJcblx0XHRcdFx0XHRcInIwXCI6IFsxLCAwXSwgXCJyMVwiOiBbMSwgMV0sIFwicjJcIjogWzEsIDJdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH0pO1xyXG5cdFx0Y2FzZSBcImhnX3Bva2Vyb3dcIjpcclxuXHRcdFx0cmV0dXJuIGV4dGVuZCh0cnVlLCBiYXNlLCB7IFxyXG5cdFx0XHRcdGZyYW1lczogeyAvLyBwb2ludGVycyB0byBhbm90aGVyIGltYWdlIGluZGljYXRlcyB0aGF0IGltYWdlIHNob3VsZCBiZSBmbGlwcGVkLCBpZiBmbGlwPXRydWVcclxuXHRcdFx0XHRcdFwidTBcIjogbnVsbCwgXCJ1MVwiOiBbMCwgMF0sIFwidTJcIjogWzEsIDBdLFxyXG5cdFx0XHRcdFx0XCJkMFwiOiBudWxsLCBcImQxXCI6IFswLCAxXSwgXCJkMlwiOiBbMSwgMV0sXHJcblx0XHRcdFx0XHRcImwwXCI6IG51bGwsIFwibDFcIjogWzAsIDJdLCBcImwyXCI6IFsxLCAyXSxcclxuXHRcdFx0XHRcdFwicjBcIjogbnVsbCwgXCJyMVwiOiBbMCwgM10sIFwicjJcIjogWzEsIDNdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH0pO1xyXG5cdFx0Y2FzZSBcImhnX3Bva2VmbGlwXCI6XHJcblx0XHRcdHJldHVybiBleHRlbmQodHJ1ZSwgYmFzZSwgeyBcclxuXHRcdFx0XHRmcmFtZXM6IHsgLy8gcG9pbnRlcnMgdG8gYW5vdGhlciBpbWFnZSBpbmRpY2F0ZXMgdGhhdCBpbWFnZSBzaG91bGQgYmUgZmxpcHBlZCwgaWYgZmxpcD10cnVlXHJcblx0XHRcdFx0XHRcInUwXCI6IG51bGwsIFwidTFcIjogWzAsIDBdLCBcInUyXCI6IFsxLCAwXSxcclxuXHRcdFx0XHRcdFwiZDBcIjogbnVsbCwgXCJkMVwiOiBbMCwgMV0sIFwiZDJcIjogWzEsIDFdLFxyXG5cdFx0XHRcdFx0XCJsMFwiOiBudWxsLCBcImwxXCI6IFswLCAyXSwgXCJsMlwiOiBbMSwgMl0sXHJcblx0XHRcdFx0XHRcInIwXCI6IG51bGwsIFwicjFcIjogXCJsMVwiLCAgIFwicjJcIjogXCJsMlwiLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH0pO1xyXG5cdFx0Y2FzZSBcImJ3X3ZlcnRyb3dcIjpcclxuXHRcdFx0cmV0dXJuIGV4dGVuZCh0cnVlLCBiYXNlLCB7IFxyXG5cdFx0XHRcdGZyYW1lczoge1xyXG5cdFx0XHRcdFx0XCJ1MFwiOiBbMCwgMF0sIFwidTFcIjogWzEsIDBdLCBcInUyXCI6IFsyLCAwXSxcclxuXHRcdFx0XHRcdFwiZDBcIjogWzAsIDFdLCBcImQxXCI6IFsxLCAxXSwgXCJkMlwiOiBbMiwgMV0sXHJcblx0XHRcdFx0XHRcImwwXCI6IFswLCAyXSwgXCJsMVwiOiBbMSwgMl0sIFwibDJcIjogWzIsIDJdLFxyXG5cdFx0XHRcdFx0XCJyMFwiOiBbMCwgM10sIFwicjFcIjogWzEsIDNdLCBcInIyXCI6IFsyLCAzXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9KTtcclxuXHRcdGNhc2UgXCJid19ob3J6ZmxpcFwiOlxyXG5cdFx0XHRyZXR1cm4gZXh0ZW5kKHRydWUsIGJhc2UsIHsgXHJcblx0XHRcdFx0ZnJhbWVzOiB7IC8vIHBvaW50ZXJzIHRvIGFub3RoZXIgaW1hZ2UgaW5kaWNhdGVzIHRoYXQgaW1hZ2Ugc2hvdWxkIGJlIGZsaXBwZWQsIGlmIGZsaXA9dHJ1ZVxyXG5cdFx0XHRcdFx0XCJ1MFwiOiBbMCwgMF0sIFwidTFcIjogWzEsIDBdLCBcInUyXCI6IFwidTFcIixcclxuXHRcdFx0XHRcdFwiZDBcIjogWzIsIDBdLCBcImQxXCI6IFszLCAwXSwgXCJkMlwiOiBcImQxXCIsXHJcblx0XHRcdFx0XHRcImwwXCI6IFswLCAxXSwgXCJsMVwiOiBbMSwgMV0sIFwibDJcIjogWzIsIDFdLFxyXG5cdFx0XHRcdFx0XCJyMFwiOiBcImwwXCIsICAgXCJyMVwiOiBcImwxXCIsICAgXCJyMlwiOiBcImwyXCIsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fSk7XHJcblx0fVxyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRTdGFuZGFyZEFuaW1hdGlvbnMoKSB7XHJcblx0dmFyIGFuaW1zID0ge307XHJcblx0XHJcblx0YW5pbXNbXCJzdGFuZFwiXSA9IG5ldyBTcHJpdGVBbmltYXRpb24oeyBzaW5nbGVGcmFtZTogdHJ1ZSwgfSwgW1xyXG5cdFx0eyB1OiBcInUwXCIsIGQ6IFwiZDBcIiwgbDogXCJsMFwiLCByOiBcInIwXCIsIHRyYW5zOiB0cnVlLCBwYXVzZTogdHJ1ZSwgfSxcclxuXHRdKTtcclxuXHRhbmltc1tcIndhbGtcIl0gPSBuZXcgU3ByaXRlQW5pbWF0aW9uKHsgZnJhbWVMZW5ndGg6IDUsIGtlZXBGcmFtZTogdHJ1ZSwgfSwgW1xyXG5cdFx0eyB1OiBcInUxXCIsIGQ6IFwiZDFcIiwgbDogXCJsMVwiLCByOiBcInIxXCIsIH0sXHJcblx0XHR7IHU6IFwidTNcIiwgZDogXCJkM1wiLCBsOiBcImwzXCIsIHI6IFwicjNcIiwgdHJhbnM6IHRydWUsIH0sXHJcblx0XHR7IHU6IFwidTJcIiwgZDogXCJkMlwiLCBsOiBcImwyXCIsIHI6IFwicjJcIiwgfSxcclxuXHRcdHsgdTogXCJ1M1wiLCBkOiBcImQzXCIsIGw6IFwibDNcIiwgcjogXCJyM1wiLCB0cmFuczogdHJ1ZSwgbG9vcFRvOiAwLCB9LFxyXG5cdF0pO1xyXG5cdGFuaW1zW1wiYnVtcFwiXSA9IG5ldyBTcHJpdGVBbmltYXRpb24oeyBmcmFtZUxlbmd0aDogMTAsIGtlZXBGcmFtZTogdHJ1ZSwgfSwgW1xyXG5cdFx0eyB1OiBcInUxXCIsIGQ6IFwiZDFcIiwgbDogXCJsMVwiLCByOiBcInIxXCIsIHNmeDogXCJ3YWxrX2J1bXBcIiwgfSxcclxuXHRcdHsgdTogXCJ1MFwiLCBkOiBcImQwXCIsIGw6IFwibDBcIiwgcjogXCJyMFwiLCB0cmFuczogdHJ1ZSwgfSxcclxuXHRcdHsgdTogXCJ1MlwiLCBkOiBcImQyXCIsIGw6IFwibDJcIiwgcjogXCJyMlwiLCBzZng6IFwid2Fsa19idW1wXCIsIH0sXHJcblx0XHR7IHU6IFwidTBcIiwgZDogXCJkMFwiLCBsOiBcImwwXCIsIHI6IFwicjBcIiwgdHJhbnM6IHRydWUsIGxvb3BUbzogMCwgfSxcclxuXHRdKTtcclxuXHRhbmltc1tcIndhcnBfYXdheVwiXSA9IG5ldyBTcHJpdGVBbmltYXRpb24oeyBzaW5nbGVEaXI6IFwiZFwiIH0sIFtcclxuXHRcdHsgZDogXCJkMFwiLCBmcmFtZUxlbmd0aDogOCwgfSwgLy8wXHJcblx0XHR7IGQ6IFwibDBcIiwgZnJhbWVMZW5ndGg6IDgsIH0sXHJcblx0XHR7IGQ6IFwidTBcIiwgZnJhbWVMZW5ndGg6IDgsIH0sXHJcblx0XHR7IGQ6IFwicjBcIiwgZnJhbWVMZW5ndGg6IDgsIH0sXHJcblx0XHR7IGQ6IFwiZDBcIiwgZnJhbWVMZW5ndGg6IDcsIH0sIC8vNFxyXG5cdFx0eyBkOiBcImwwXCIsIGZyYW1lTGVuZ3RoOiA3LCB9LFxyXG5cdFx0eyBkOiBcInUwXCIsIGZyYW1lTGVuZ3RoOiA3LCB9LFxyXG5cdFx0eyBkOiBcInIwXCIsIGZyYW1lTGVuZ3RoOiA3LCB9LFxyXG5cdFx0eyBkOiBcImQwXCIsIGZyYW1lTGVuZ3RoOiA1LCB9LCAvLzhcclxuXHRcdHsgZDogXCJsMFwiLCBmcmFtZUxlbmd0aDogNSwgfSxcclxuXHRcdHsgZDogXCJ1MFwiLCBmcmFtZUxlbmd0aDogNSwgfSxcclxuXHRcdHsgZDogXCJyMFwiLCBmcmFtZUxlbmd0aDogNSwgfSxcclxuXHRcdHsgZDogXCJkMFwiLCBmcmFtZUxlbmd0aDogMywgfSwgLy8xMlxyXG5cdFx0eyBkOiBcImwwXCIsIGZyYW1lTGVuZ3RoOiAzLCB9LFxyXG5cdFx0eyBkOiBcInUwXCIsIGZyYW1lTGVuZ3RoOiAzLCB9LFxyXG5cdFx0eyBkOiBcInIwXCIsIGZyYW1lTGVuZ3RoOiAzLCB9LFxyXG5cdFx0eyBkOiBcImQwXCIsIGZyYW1lTGVuZ3RoOiAxLCB9LCAvLzE2XHJcblx0XHR7IGQ6IFwibDBcIiwgZnJhbWVMZW5ndGg6IDEsIH0sXHJcblx0XHR7IGQ6IFwidTBcIiwgZnJhbWVMZW5ndGg6IDEsIH0sXHJcblx0XHR7IGQ6IFwicjBcIiwgZnJhbWVMZW5ndGg6IDEsIH0sXHJcblx0XHR7IGQ6IFwiZDBcIiwgZnJhbWVMZW5ndGg6IDAsIHRyYW5zOiB0cnVlLCB9LCAvLzIwXHJcblx0XHR7IGQ6IFwibDBcIiwgZnJhbWVMZW5ndGg6IDAsIHRyYW5zOiB0cnVlLCB9LFxyXG5cdFx0eyBkOiBcInUwXCIsIGZyYW1lTGVuZ3RoOiAwLCB0cmFuczogdHJ1ZSwgfSxcclxuXHRcdHsgZDogXCJyMFwiLCBmcmFtZUxlbmd0aDogMCwgdHJhbnM6IHRydWUsIGxvb3BUbzogMjAgfSxcclxuXHRdKTtcclxuXHRhbmltc1tcIndhcnBfaW5cIl0gPSBuZXcgU3ByaXRlQW5pbWF0aW9uKHsgc2luZ2xlRGlyOiBcImRcIiB9LCBbXHJcblx0XHR7IGQ6IFwiZDBcIiwgZnJhbWVMZW5ndGg6IDEsIH0sIC8vMFxyXG5cdFx0eyBkOiBcInIwXCIsIGZyYW1lTGVuZ3RoOiAxLCB9LFxyXG5cdFx0eyBkOiBcInUwXCIsIGZyYW1lTGVuZ3RoOiAxLCB9LFxyXG5cdFx0eyBkOiBcImwwXCIsIGZyYW1lTGVuZ3RoOiAxLCB9LFxyXG5cdFx0eyBkOiBcImQwXCIsIGZyYW1lTGVuZ3RoOiAzLCB9LCAvLzRcclxuXHRcdHsgZDogXCJyMFwiLCBmcmFtZUxlbmd0aDogMywgfSxcclxuXHRcdHsgZDogXCJ1MFwiLCBmcmFtZUxlbmd0aDogMywgfSxcclxuXHRcdHsgZDogXCJsMFwiLCBmcmFtZUxlbmd0aDogMywgfSxcclxuXHRcdHsgZDogXCJkMFwiLCBmcmFtZUxlbmd0aDogNSwgfSwgLy84XHJcblx0XHR7IGQ6IFwicjBcIiwgZnJhbWVMZW5ndGg6IDUsIH0sXHJcblx0XHR7IGQ6IFwidTBcIiwgZnJhbWVMZW5ndGg6IDUsIH0sXHJcblx0XHR7IGQ6IFwibDBcIiwgZnJhbWVMZW5ndGg6IDUsIH0sXHJcblx0XHR7IGQ6IFwiZDBcIiwgZnJhbWVMZW5ndGg6IDcsIH0sIC8vMTJcclxuXHRcdHsgZDogXCJyMFwiLCBmcmFtZUxlbmd0aDogNywgfSxcclxuXHRcdHsgZDogXCJ1MFwiLCBmcmFtZUxlbmd0aDogNywgfSxcclxuXHRcdHsgZDogXCJsMFwiLCBmcmFtZUxlbmd0aDogOCwgfSxcclxuXHRcdHsgZDogXCJkMFwiLCBmcmFtZUxlbmd0aDogOCwgfSwgLy8xNlxyXG5cdFx0eyBkOiBcInIwXCIsIGZyYW1lTGVuZ3RoOiA5LCB9LFxyXG5cdFx0eyBkOiBcInUwXCIsIGZyYW1lTGVuZ3RoOiA5LCB9LFxyXG5cdFx0eyBkOiBcImwwXCIsIGZyYW1lTGVuZ3RoOiAxMCwgfSxcclxuXHRcdHsgZDogXCJkMFwiLCBmcmFtZUxlbmd0aDogMSwgdHJhbnM6IHRydWUsIH0sXHJcblx0XSk7XHJcblx0XHJcblx0cmV0dXJuIGFuaW1zO1xyXG59XHJcblxyXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cclxuZnVuY3Rpb24gU3ByaXRlQW5pbWF0aW9uKG9wdHMsIGZyYW1lcykge1xyXG5cdHRoaXMub3B0aW9ucyA9IG9wdHM7XHJcblx0dGhpcy5mcmFtZXMgPSBmcmFtZXM7XHJcblx0XHJcblx0dGhpcy53YWl0VGltZSA9IHRoaXMuZnJhbWVzW3RoaXMuY3VyckZyYW1lXS5mcmFtZUxlbmd0aCB8fCB0aGlzLm9wdGlvbnMuZnJhbWVMZW5ndGg7XHJcbn1cclxuU3ByaXRlQW5pbWF0aW9uLnByb3RvdHlwZSA9IHtcclxuXHRvcHRpb25zOiBudWxsLFxyXG5cdGZyYW1lcyA6IG51bGwsXHJcblx0XHJcblx0d2FpdFRpbWUgOiAwLFxyXG5cdGN1cnJGcmFtZTogMCxcclxuXHRzcGVlZCA6IDEsXHJcblx0cGF1c2VkIDogZmFsc2UsXHJcblx0XHJcblx0LyoqIEFkdmFuY2VkIHRoZSBhbmltYXRpb24gYnkgdGhlIGdpdmVuIGFtb3VudCBvZiBkZWx0YSB0aW1lLiAqL1xyXG5cdGFkdmFuY2UgOiBmdW5jdGlvbihkZWx0YVRpbWUpIHtcclxuXHRcdGlmICh0aGlzLm9wdGlvbnMuc2luZ2xlRnJhbWUpIHJldHVybjtcclxuXHRcdGlmICh0aGlzLnBhdXNlZCkgcmV0dXJuO1xyXG5cdFx0XHJcblx0XHRpZiAodGhpcy53YWl0VGltZSA+IDApIHtcclxuXHRcdFx0dGhpcy53YWl0VGltZSAtPSAodGhpcy5zcGVlZCAqIChkZWx0YVRpbWUgKiBDT05GSUcuc3BlZWQuYW5pbWF0aW9uKSk7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0dmFyIGxvb3AgPSB0aGlzLmZyYW1lc1t0aGlzLmN1cnJGcmFtZV0ubG9vcFRvO1xyXG5cdFx0aWYgKGxvb3AgIT09IHVuZGVmaW5lZCkgdGhpcy5jdXJyRnJhbWUgPSBsb29wO1xyXG5cdFx0ZWxzZSB0aGlzLmN1cnJGcmFtZSsrO1xyXG5cdFx0XHJcblx0XHRpZiAodGhpcy5jdXJyRnJhbWUgPj0gdGhpcy5mcmFtZXMubGVuZ3RoKSB7XHJcblx0XHRcdHRoaXMuY3VyckZyYW1lID0gdGhpcy5mcmFtZXMubGVuZ3RoLTE7XHJcblx0XHRcdHRoaXMucGF1c2VkID0gdHJ1ZTtcclxuXHRcdFx0Y29uc29sZS53YXJuKFwiQW5pbWF0aW9uIGhhcyBjb21wbGV0ZWQhXCIpO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdC8vbmV3IGZyYW1lXHJcblx0XHRcclxuXHRcdHRoaXMud2FpdFRpbWUgPSB0aGlzLmZyYW1lc1t0aGlzLmN1cnJGcmFtZV0uZnJhbWVMZW5ndGggfHwgdGhpcy5vcHRpb25zLmZyYW1lTGVuZ3RoO1xyXG5cdFx0XHJcblx0XHRpZiAodGhpcy5mcmFtZXNbdGhpcy5jdXJyRnJhbWVdLnBhdXNlKSB0aGlzLnBhdXNlZCA9IHRydWU7XHJcblx0XHRcclxuXHRcdGlmICh0aGlzLmZyYW1lc1t0aGlzLmN1cnJGcmFtZV0uc2Z4KSBcclxuXHRcdFx0U291bmRNYW5hZ2VyLnBsYXlTb3VuZCh0aGlzLmZyYW1lc1t0aGlzLmN1cnJGcmFtZV0uc2Z4KTtcclxuXHR9LFxyXG5cdFxyXG5cdC8qKiBJZiB0aGlzIGFuaW1hdGlvbiBpcyBvbiBhIHBhdXNlIGZyYW1lICovXHJcblx0cmVzdW1lIDogZnVuY3Rpb24oKSB7XHJcblx0XHR0aGlzLnBhdXNlZCA9IGZhbHNlO1xyXG5cdH0sXHJcblx0XHJcblx0LyoqIFJlc2V0IHRoZSBhbmltYXRpb24gcGFyYW1ldGVycy4gQ2FsbGVkIHdoZW4gdGhpcyBhbmltYXRpb24gaXMgbm8gbG9uZ2VyIHVzZWQuICovXHJcblx0cmVzZXQgOiBmdW5jdGlvbigpIHtcclxuXHRcdHRoaXMucGF1c2VkID0gZmFsc2U7XHJcblx0XHRpZiAodGhpcy5vcHRpb25zLmtlZXBGcmFtZSkgcmV0dXJuO1xyXG5cdFx0dGhpcy5jdXJyRnJhbWUgPSAwO1xyXG5cdFx0dGhpcy53YWl0VGltZSA9IHRoaXMuZnJhbWVzW3RoaXMuY3VyckZyYW1lXS5mcmFtZUxlbmd0aCB8fCB0aGlzLm9wdGlvbnMuZnJhbWVMZW5ndGg7XHJcblx0XHR0aGlzLnNwZWVkID0gMTtcclxuXHR9LFxyXG5cdFxyXG5cdC8qKiBJZiB0aGlzIGFuaW1hdGlvbiBpcyBvbiBhIGZyYW1lIHRoYXQgY2FuIHRyYW5zaXRpb24gdG8gYW5vdGhlciBhbmltYXRpb24uICovXHJcblx0Y2FuVHJhbnNpdGlvbiA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0cmV0dXJuIHRoaXMuZnJhbWVzW3RoaXMuY3VyckZyYW1lXS50cmFucztcclxuXHR9LFxyXG5cdFxyXG5cdC8qKiBSZXR1cm5zIHRoZSBuYW1lIG9mIHRoZSBmcmFtZSB0byBkaXNwbGF5IHRoaXMgZnJhbWUuICovXHJcblx0Z2V0RnJhbWVUb0Rpc3BsYXkgOiBmdW5jdGlvbihkaXIpIHtcclxuXHRcdGlmICh0aGlzLm9wdGlvbnMuc2luZ2xlRGlyKSBkaXIgPSB0aGlzLm9wdGlvbnMuc2luZ2xlRGlyO1xyXG5cdFx0cmV0dXJuIHRoaXMuZnJhbWVzW3RoaXMuY3VyckZyYW1lXVtkaXJdO1xyXG5cdH0sXHJcbn07IiwiLy8gY29udHJvbGxlci5qc1xyXG4vLyBUaGlzIGNsYXNzIGhhbmRsZXMgaW5wdXQgYW5kIGNvbnZlcnRzIGl0IHRvIGNvbnRyb2wgc2lnbmFsc1xyXG5cclxudmFyIGluaGVyaXRzID0gcmVxdWlyZShcImluaGVyaXRzXCIpO1xyXG52YXIgZXh0ZW5kID0gcmVxdWlyZShcImV4dGVuZFwiKTtcclxudmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoXCJldmVudHNcIikuRXZlbnRFbWl0dGVyO1xyXG5cclxuLy8gVE9ETyBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9HdWlkZS9BUEkvR2FtZXBhZFxyXG5cclxuZnVuY3Rpb24gQ29udHJvbE1hbmFnZXIoKSB7XHJcblx0dmFyIHNlbGYgPSB0aGlzO1xyXG5cdCQoZG9jdW1lbnQpLmtleWRvd24oZnVuY3Rpb24oZSkgeyBzZWxmLm9uS2V5RG93bihlKTsgfSk7XHJcblx0JChkb2N1bWVudCkua2V5dXAoZnVuY3Rpb24oZSkgeyBzZWxmLm9uS2V5VXAoZSk7IH0pO1xyXG5cdFxyXG5cdHRoaXMuc2V0S2V5Q29uZmlnKCk7XHJcbn1cclxuaW5oZXJpdHMoQ29udHJvbE1hbmFnZXIsIEV2ZW50RW1pdHRlcik7XHJcbmV4dGVuZChDb250cm9sTWFuYWdlci5wcm90b3R5cGUsIHtcclxuXHRpbnB1dENvbnRleHQgOiBcImdhbWVcIixcclxuXHRcclxuXHRrZXlzX2NvbmZpZyA6IHtcclxuXHRcdFVwOiBbMzgsIFwiVXBcIiwgODcsIFwid1wiXSwgXHJcblx0XHREb3duOiBbNDAsIFwiRG93blwiLCA4MywgXCJzXCJdLCBcclxuXHRcdExlZnQ6IFszNywgXCJMZWZ0XCIsIDY1LCBcImFcIl0sIFxyXG5cdFx0UmlnaHQ6IFszOSwgXCJSaWdodFwiLCA2OCwgXCJkXCJdLFxyXG5cdFx0SW50ZXJhY3Q6IFsxMywgXCJFbnRlclwiLCAzMiwgXCIgXCJdLFxyXG5cdFx0Rm9jdXNDaGF0OiBbMTkxLCBcIi9cIl0sXHJcblx0fSxcclxuXHRcclxuXHRrZXlzX2FjdGl2ZSA6IHt9LFxyXG5cdFxyXG5cdGtleXNfZG93biA6IHtcclxuXHRcdFVwOiBmYWxzZSwgRG93bjogZmFsc2UsXHJcblx0XHRMZWZ0OiBmYWxzZSwgUmlnaHQ6IGZhbHNlLFxyXG5cdFx0SW50ZXJhY3Q6IGZhbHNlLCBGb2N1c0NoYXQ6IGZhbHNlLFxyXG5cdH0sXHJcblx0XHJcblx0aXNEb3duIDogZnVuY3Rpb24oa2V5LCBjdHgpIHtcclxuXHRcdGlmICgkLmlzQXJyYXkoY3R4KSkge1xyXG5cdFx0XHR2YXIgZ28gPSBmYWxzZTtcclxuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBjdHgubGVuZ3RoOyBpKyspIGdvIHw9IGN0eFtpXTtcclxuXHRcdFx0aWYgKCFnbykgcmV0dXJuO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0aWYgKHRoaXMuaW5wdXRDb250ZXh0ICE9IGN0eCkgcmV0dXJuO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHRyZXR1cm4gdGhpcy5rZXlzX2Rvd25ba2V5XTtcclxuXHR9LFxyXG5cdFxyXG5cdHNldEtleUNvbmZpZyA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0dGhpcy5rZXlzX2FjdGl2ZSA9IGV4dGVuZCh0cnVlLCB7fSwgdGhpcy5rZXlzX2NvbmZpZyk7XHJcblx0fSxcclxuXHRcclxuXHRvbktleURvd24gOiBmdW5jdGlvbihlKSB7XHJcblx0XHRmb3IgKHZhciBhY3Rpb24gaW4gdGhpcy5rZXlzX2FjdGl2ZSkge1xyXG5cdFx0XHR2YXIga2V5cyA9IHRoaXMua2V5c19hY3RpdmVbYWN0aW9uXTtcclxuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdFx0aWYgKGUud2hpY2ggPT0ga2V5c1tpXSkge1xyXG5cdFx0XHRcdFx0Ly8gS2V5IGlzIG5vdyBkb3duIVxyXG5cdFx0XHRcdFx0dGhpcy5lbWl0S2V5KGFjdGlvbiwgdHJ1ZSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fSxcclxuXHRvbktleVVwIDogZnVuY3Rpb24gKGUpIHtcclxuXHRcdGZvciAodmFyIGFjdGlvbiBpbiB0aGlzLmtleXNfYWN0aXZlKSB7XHJcblx0XHRcdHZhciBrZXlzID0gdGhpcy5rZXlzX2FjdGl2ZVthY3Rpb25dO1xyXG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGtleXMubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0XHRpZiAoZS53aGljaCA9PSBrZXlzW2ldKSB7XHJcblx0XHRcdFx0XHQvLyBLZXkgaXMgbm93IHVwIVxyXG5cdFx0XHRcdFx0dGhpcy5lbWl0S2V5KGFjdGlvbiwgZmFsc2UpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH0sXHJcblx0XHJcblx0ZW1pdEtleSA6IGZ1bmN0aW9uKGFjdGlvbiwgZG93bikge1xyXG5cdFx0aWYgKHRoaXMua2V5c19kb3duW2FjdGlvbl0gIT0gZG93bikge1xyXG5cdFx0XHR0aGlzLmtleXNfZG93blthY3Rpb25dID0gZG93bjtcclxuXHRcdFx0dGhpcy5lbWl0KFwiY29udHJvbC1hY3Rpb25cIiwgYWN0aW9uLCBkb3duKTtcclxuXHRcdH1cclxuXHR9LFxyXG5cdFxyXG59KTtcclxubW9kdWxlLmV4cG9ydHMgPSBuZXcgQ29udHJvbE1hbmFnZXIoKTtcclxuIiwiLy8gZXZlbnQuanNcclxuLy8gRGVmaW5lcyB0aGUgYmFzZSBldmVudCB1c2VkIHRocm91Z2hvdXQgdGhlIHBhcmsuXHJcblxyXG4vLyBGaXR0aW5nbHksIEV2ZW50IGlzIGEgc3ViY2xhc3Mgb2Ygbm9kZS5qcydzIEV2ZW50RW1pdHRlciBjbGFzcy5cclxudmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoXCJldmVudHNcIikuRXZlbnRFbWl0dGVyO1xyXG52YXIgaW5oZXJpdHMgPSByZXF1aXJlKFwiaW5oZXJpdHNcIik7XHJcbnZhciBleHRlbmQgPSByZXF1aXJlKFwiZXh0ZW5kXCIpO1xyXG5cclxuLyoqXHJcbiAqIEFuIGV2ZW50IGlzIGFueSBpbnRlcmFjdGFibGUgb3IgYW5pbWF0aW5nIG9iamVjdCBpbiB0aGUgZ2FtZS5cclxuICogVGhpcyBpbmNsdWRlcyB0aGluZ3MgcmFuZ2luZyBmcm9tIHNpZ25zLCB0byBwZW9wbGUvcG9rZW1vbi5cclxuICogQW4gZXZlbnQ6XHJcbiAqXHQtIFRha2VzIHVwIGF0IGxlYXN0IG9uZSB0aWxlIG9uIHRoZSBtYXBcclxuICpcdC0gQ2FuIGJlIGludGVyYWN0ZWQgd2l0aCBieSBpbi1nYW1lIHRhbGtpbmcgb3Igb24tc2NyZWVuIGNsaWNrXHJcbiAqXHQtIE1heSBiZSByZXByZXNlbnRlZCBpbi1nYW1lIGJ5IGEgc3ByaXRlXHJcbiAqXHQtIE1heSBkZWNpZGUsIHVwb24gY3JlYXRpb24sIHRvIG5vdCBhcHBlYXIgb24gdGhlIG1hcC5cclxuICovXHJcbmZ1bmN0aW9uIEV2ZW50KGJhc2UsIG9wdHMpIHtcclxuXHRFdmVudEVtaXR0ZXIuY2FsbCh0aGlzKTtcclxuXHRcclxuXHRleHRlbmQodGhpcywgYmFzZSwgb3B0cyk7XHJcblx0XHJcblx0dGhpcy5fbm9ybWFsaXplTG9jYXRpb24oKTtcclxuXHRcclxuXHRpZiAodGhpcy5vbkV2ZW50cykge1xyXG5cdFx0dmFyIGtleXMgPSBPYmplY3Qua2V5cyh0aGlzLm9uRXZlbnRzKTtcclxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHR0aGlzLm9uKGtleXNbaV0sIHRoaXMub25FdmVudHNba2V5c1tpXV0pO1xyXG5cdFx0fVxyXG5cdFx0ZGVsZXRlIHRoaXMub25FdmVudHM7XHJcblx0fVxyXG59XHJcbmluaGVyaXRzKEV2ZW50LCBFdmVudEVtaXR0ZXIpO1xyXG5leHRlbmQoRXZlbnQucHJvdG90eXBlLCB7XHJcblx0aWQgOiBudWxsLFxyXG5cdGVuYWJsZWQgOiBmYWxzZSxcclxuXHR2aXNpYmxlIDogdHJ1ZSxcclxuXHRcclxuXHRsb2NhdGlvbiA6IG51bGwsIC8vIEV2ZW50cyB3aXRoIGEgc2luZ2xlIGxvY2F0aW9uIGFyZSBvcHRpbWl6ZWQgZm9yIGl0XHJcblx0bG9jYXRpb25zIDogbnVsbCwgLy8gRXZlbnRzIHdpdGggbXVsdGlwbGUgbG9jYXRpb25zIGFyZSBvcHRpbWl6ZWQgZm9yIHRoYXQgYWxzb1xyXG5cdFxyXG5cdHRvU3RyaW5nIDogZnVuY3Rpb24oKSB7XHJcblx0XHRpZiAoIXRoaXMuaWQpIHJldHVybiBcIjxMb2NhbCBvciBVbm5hbWVkIEV2ZW50PlwiO1xyXG5cdFx0cmV0dXJuIHRoaXMuaWQ7XHJcblx0fSxcclxuXHRcclxuXHRzaG91bGRBcHBlYXIgOiBmdW5jdGlvbigpeyByZXR1cm4gdHJ1ZTsgfSxcclxuXHRjYW5XYWxrT24gOiBmdW5jdGlvbigpeyByZXR1cm4gdHJ1ZTsgfSxcclxuXHRcclxuXHQvKiogUmV0dXJucyBhbiBvYmplY3QgdG8gcmVwcmVzZW50IHRoaXMgZXZlbnQgaW4gM0Qgc3BhY2UsIG9yIG51bGwgaWYgdGhlcmUgc2hvdWxkbid0IGJlIG9uZS4gKi9cclxuXHRnZXRBdmF0YXIgOiBmdW5jdGlvbigpeyByZXR1cm4gbnVsbDsgfSxcclxuXHRcclxuXHRvbkV2ZW50cyA6IG51bGwsIC8vYSBvYmplY3QsIGV2ZW50LW5hbWVzIC0+IGZ1bmN0aW9ucyB0byBjYWxsLCB0byBiZSByZWdpc3RlcmVkIGluIGNvbnN0cnVjdG9yXHJcblx0XHJcblx0Y2FuTW92ZSA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0Ly9JZiB3ZSBvbmx5IGhhdmUgMSBsb2NhdGlvbiwgdGhlbiB3ZSBjYW4gbW92ZVxyXG5cdFx0cmV0dXJuICEhdGhpcy5sb2NhdGlvbiAmJiAhdGhpcy5sb2NhdGlvbnM7XHJcblx0fSxcclxuXHRcclxuXHRtb3ZlVG8gOiBmdW5jdGlvbih4LCB5KSB7XHJcblx0XHRpZiAoIXRoaXMuY2FuTW92ZSgpKVxyXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJUaGlzIGV2ZW50IGlzIGluIHNldmVyYWwgcGxhY2VzIGF0IG9uY2UsIGFuZCBjYW5ub3QgbW92ZVRvIVwiKTtcclxuXHRcdFxyXG5cdFx0Ly9UT0RPIHF1ZXVlIHVwIGEgbW92ZVxyXG5cdH0sXHJcblx0XHJcblx0X25vcm1hbGl6ZUxvY2F0aW9uIDogZnVuY3Rpb24oKSB7XHJcblx0XHRpZiAodGhpcy5sb2NhdGlvbikge1xyXG5cdFx0XHQvL0lmIHdlIGhhdmUgYSBzaW5ndWxhciBsb2NhdGlvbiBzZXRcclxuXHRcdFx0aWYgKHRoaXMubG9jYXRpb25zKSAvLyBBcyBsb25nIGFzIHdlIGRvbid0IGFsc28gaGF2ZSBhIGxpc3QsIGl0cyBmaW5lXHJcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiRXZlbnQgd2FzIGluaXRpYWxpemVkIHdpdGggYm90aCBsb2NhdGlvbiBhbmQgbG9jYXRpb25zISBUaGV5IGNhbm5vdCBiZSBib3RoIGRlZmluZWQhXCIpO1xyXG5cdFx0XHRcclxuXHRcdFx0dmFyIGxvYyA9IHRoaXMubG9jYXRpb247XHJcblx0XHRcdGlmICgkLmlzQXJyYXkobG9jKSAmJiBsb2MubGVuZ3RoID09IDIgJiYgdHlwZW9mIGxvY1swXSA9PSBcIm51bWJlclwiICYmIHR5cGVvZiBsb2NbMV0gPT0gXCJudW1iZXJcIikgXHJcblx0XHRcdHtcclxuXHRcdFx0XHRsb2MgPSBuZXcgVEhSRUUuVmVjdG9yMihsb2NbMF0sIGxvY1sxXSk7XHJcblx0XHRcdH0gXHJcblx0XHRcdGVsc2UgaWYgKCQuaXNBcnJheShsb2MpICYmIGxvYy5sZW5ndGggPT0gMyBcclxuXHRcdFx0XHQmJiB0eXBlb2YgbG9jWzBdID09IFwibnVtYmVyXCIgJiYgdHlwZW9mIGxvY1sxXSA9PSBcIm51bWJlclwiICYmIHR5cGVvZiBsb2NbMl0gPT0gXCJudW1iZXJcIikgXHJcblx0XHRcdHtcclxuXHRcdFx0XHRsb2MgPSBuZXcgVEhSRUUuVmVjdG9yMyhsb2NbMF0sIGxvY1sxXSwgbG9jWzJdKTtcclxuXHRcdFx0fSBcclxuXHRcdFx0ZWxzZSBpZiAoIShsb2MgaW5zdGFuY2VvZiBUSFJFRS5WZWN0b3IyIHx8IGxvYyBpbnN0YW5jZW9mIFRIUkVFLlZlY3RvcjMpKSBcclxuXHRcdFx0e1xyXG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcihcIkNvdWxkIG5vdCBub3JtYWxpemUgbG9jYXRpb24gb2YgXCIrdGhpcy5pZCtcIiFcIik7XHJcblx0XHRcdH1cclxuXHRcdFx0dGhpcy5sb2NhdGlvbiA9IGxvYztcclxuXHRcdFx0cmV0dXJuIDE7XHJcblx0XHR9XHJcblx0XHR2YXIgb3JnbG9jID0gdGhpcy5sb2NhdGlvbnM7XHJcblx0XHR2YXIgbG9jcyA9IG51bGw7XHJcblx0XHRcclxuXHRcdGlmICgkLmlzQXJyYXkob3JnbG9jKSkge1xyXG5cdFx0XHR2YXIgdHlwZSA9IG51bGwsIG5ld1R5cGUgPSBudWxsO1xyXG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IG9yZ2xvYy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRcdGlmICh0eXBlb2Ygb3JnbG9jW2ldID09IFwibnVtYmVyXCIpXHJcblx0XHRcdFx0XHRuZXdUeXBlID0gXCJudW1iZXJcIjtcclxuXHRcdFx0XHRlbHNlIGlmIChvcmdsb2NbaV0gaW5zdGFuY2VvZiBUSFJFRS5WZWN0b3IyKVxyXG5cdFx0XHRcdFx0bmV3VHlwZSA9IFwidmVjdG9yXCI7XHJcblx0XHRcdFx0ZWxzZSBpZiAob3JnbG9jW2ldIGluc3RhbmNlb2YgVEhSRUUuVmVjdG9yMylcclxuXHRcdFx0XHRcdG5ld1R5cGUgPSBcInZlY3RvclwiO1xyXG5cdFx0XHRcdGVsc2UgaWYgKCQuaXNBcnJheShvcmdsb2NbaV0pKVxyXG5cdFx0XHRcdFx0bmV3VHlwZSA9IFwiYXJyYXlcIjtcclxuXHRcdFx0XHRcclxuXHRcdFx0XHRpZiAoIXR5cGUpIHR5cGUgPSBuZXdUeXBlO1xyXG5cdFx0XHRcdGlmICh0eXBlICE9IG5ld1R5cGUpIHtcclxuXHRcdFx0XHRcdHRocm93IG5ldyBFcnJvcihcIkNvdWxkIG5vdCBub3JtYWxpemUgbG9jYXRpb25zIG9mIFwiK3RoaXMuaWQrXCIhXCIpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XHRpZiAodHlwZSA9PSBcIm51bWJlclwiKSBsb2NzID0gX19wYXJzZUFzTnVtYmVyQXJyYXkob3JnbG9jKTtcclxuXHRcdFx0aWYgKHR5cGUgPT0gXCJhcnJheVwiKSBsb2NzID0gX19wYXJzZUFzQXJyYXlBcnJheShvcmdsb2MpO1xyXG5cdFx0XHRpZiAodHlwZSA9PSBcInZlY3RvclwiKSBsb2NzID0gb3JnbG9jO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSBpZiAoJC5pc0Z1bmN0aW9uKG9yZ2xvYykpIHtcclxuXHRcdFx0bG9jcyA9IG9yZ2xvYy5jYWxsKHRoaXMpO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSBpZiAob3JnbG9jIGluc3RhbmNlb2YgVEhSRUUuVmVjdG9yMikge1xyXG5cdFx0XHRsb2NzID0gW29yZ2xvY107XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdGlmICghbG9jcyB8fCAhJC5pc0FycmF5KGxvY3MpIHx8IGxvY3MubGVuZ3RoID09IDApIFxyXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJDb3VsZCBub3Qgbm9ybWFsaXplIGxvY2F0aW9ucyBvZiBcIit0aGlzLmlkK1wiIVwiKTtcclxuXHRcdFxyXG5cdFx0dGhpcy5sb2NhdGlvbnMgPSBsb2NzO1xyXG5cdFx0dGhpcy5fbm9ybWFsaXplTG9jYXRpb24gPSBmdW5jdGlvbigpeyByZXR1cm4gbG9jcy5sZW5ndGg7IH07IC8vY2FuJ3Qgbm9ybWFsaXplIHR3aWNlXHJcblx0XHRyZXR1cm4gbG9jcy5sZW5ndGg7XHJcblx0XHRcclxuXHRcdGZ1bmN0aW9uIF9fcGFyc2VBc051bWJlckFycmF5KGwpIHtcclxuXHRcdFx0aWYgKGwubGVuZ3RoID09IDIpIC8vc2luZ2xlIHBvaW50IFt4LCB5XVxyXG5cdFx0XHRcdHJldHVybiBbbmV3IFRIUkVFLlZlY3RvcjIobFswXSwgbFsxXSldO1xyXG5cdFx0XHRpZiAobC5sZW5ndGggPT0gMykgLy9zaW5nbGUgcG9pbnQgW3gsIHksIHpdXHJcblx0XHRcdFx0cmV0dXJuIFtuZXcgVEhSRUUuVmVjdG9yMyhsWzBdLCBsWzFdLCBsWzJdKV07XHJcblx0XHRcdGlmIChsLmxlbmd0aCA9PSA0KSB7IC8vcmVjdGFuZ2xlIFt4LCB5LCB3LCBoXVxyXG5cdFx0XHRcdHZhciBuID0gW107XHJcblx0XHRcdFx0Zm9yICh2YXIgeCA9IGxbMF07IHggPCBsWzBdK2xbMl07IHgrKykge1xyXG5cdFx0XHRcdFx0Zm9yICh2YXIgeSA9IGxbMV07IHkgPCBsWzFdK2xbM107IHkrKykge1xyXG5cdFx0XHRcdFx0XHRuLnB1c2gobmV3IFRIUkVFLlZlY3RvcjIoeCwgeSkpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRyZXR1cm4gbjtcclxuXHRcdFx0fVxyXG5cdFx0XHRpZiAobC5sZW5ndGggPT0gNSkgeyAvL3JlY3RhbmdsZSBbeCwgeSwgeiwgdywgaF1cclxuXHRcdFx0XHR2YXIgbiA9IFtdO1xyXG5cdFx0XHRcdGZvciAodmFyIHggPSBsWzBdOyB4IDwgbFswXStsWzNdOyB4KyspIHtcclxuXHRcdFx0XHRcdGZvciAodmFyIHkgPSBsWzFdOyB5IDwgbFsxXStsWzRdOyB5KyspIHtcclxuXHRcdFx0XHRcdFx0bi5wdXNoKG5ldyBUSFJFRS5WZWN0b3IzKHgsIHksIGxbMl0pKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0cmV0dXJuIG47XHJcblx0XHRcdH1cclxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiQ291bGQgbm90IG5vcm1hbGl6ZSBsb2NhdGlvbihzKSBvZiBcIit0aGlzLmlkK1wiIVwiKTtcclxuXHRcdH1cclxuXHRcdGZ1bmN0aW9uIF9fcGFyc2VBc0FycmF5QXJyYXkobCkge1xyXG5cdFx0XHR2YXIgbiA9IFtdO1xyXG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGwubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0XHRmb3IgKHZhciBqID0gMDsgaiA8IGxbaV0ubGVuZ3RoOyBqKyspIHtcclxuXHRcdFx0XHRcdGlmICh0eXBlb2YgbFtpXVtqXSAhPSBcIm51bWJlclwiKVxyXG5cdFx0XHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJDb3VsZCBub3Qgbm9ybWFsaXplIGxvY2F0aW9uKHMpIG9mIFwiK3RoaXMuaWQrXCIhXCIpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRuLnB1c2goX19wYXJzZUFzTnVtYmVyQXJyYXkobFtpXSkpO1xyXG5cdFx0XHR9XHJcblx0XHRcdHJldHVybiBuO1xyXG5cdFx0fVxyXG5cdH0sXHJcblx0XHJcbn0pO1xyXG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50O1xyXG5cclxuRXZlbnQucHJvdG90eXBlLmFkZExpc3RlbmVyID1cclxuRXZlbnQucHJvdG90eXBlLm9uID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcclxuXHRpZiAoJC5pbkFycmF5KHR5cGUsIF9fRVZFTlRfVFlQRVNfXykgPT0gLTEpIHtcclxuXHRcdGNvbnNvbGUuZXJyb3IoXCJNYXAgRXZlbnRcIiwgdGhpcy50b1N0cmluZygpLCBcInJlZ2lzdGVyaW5nIGVtaXR0ZWQgZXZlbnQgdHlwZVwiLCBcclxuXHRcdFx0dHlwZSwgXCJ3aGljaCBpcyBub3QgYSB2YWxpZCBlbWl0dGVkIGV2ZW50IHR5cGUhXCIpO1xyXG5cdH1cclxuXHRFdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uLmNhbGwodGhpcywgdHlwZSwgbGlzdGVuZXIpO1xyXG59XHJcblxyXG4vLyBUaGUgZm9sbG93aW5nIGlzIGEgbGlzdCBvZiBldmVudHMgdGhlIGJhc2UgRXZlbnQgY2xhc3MgYW5kIGxpYnJhcnkgZW1pdFxyXG4vLyBUaGlzIGxpc3QgaXMgY2hlY2tlZCBhZ2FpbnN0IHdoZW4gcmVnaXN0ZXJpbmcgdG8gY2F0Y2ggbWlzc3BlbGxpbmdzLlxyXG52YXIgX19FVkVOVF9UWVBFU19fID0gW1xyXG5cdFwiZW50ZXJpbmctdGlsZVwiLCAvLyhmcm9tLWRpcikgXHJcblx0XHQvL2VtaXR0ZWQgdXBvbiB0aGUgcGxheWVyIGlzIGdpdmVuIHRoZSBnbyBhaGVhZCB0byBlbnRlciB0aGUgdGlsZSB0aGlzIGV2ZW50IG9jY3VwaWVzLlxyXG5cdFwiZW50ZXJlZC10aWxlXCIsIC8vKGZyb20tZGlyKVxyXG5cdFx0Ly9lbWl0dGVkIHVwb24gdGhlIHBsYXllciBsYW5kaW5nIG9uIHRoZSB0aWxlIHRoaXMgZXZlbnQgb2NjdXBpZXMuXHJcblx0XCJsZWF2aW5nLXRpbGVcIiwgLy8odG8tZGlyKVxyXG5cdFx0Ly9lbWl0dGVkIHVwb24gdGhlIHBsYXllciBpcyBnaXZlbiB0aGUgZ28gYWhlYWQgdG8gbGVhdmUgdGhlIHRpbGUgdGhpcyBldmVudCBvY2N1cGllcy5cclxuXHRcImxlZnQtdGlsZVwiLCAvLyh0by1kaXIpXHJcblx0XHQvL2VtaXR0ZWQgdXBvbiB0aGUgcGxheWVyIGNvbXBsZXRlbHkgbGVhdmluZyB0aGUgdGlsZSB0aGlzIGV2ZW50IG9jY3VwaWVzLlxyXG5cdFwiYnVtcGVkXCIsIC8vKGZyb20tZGlyKVxyXG5cdFx0Ly9lbWl0dGVkIHVwb24gdGhlIHBsYXllciBpcyBkZW5pZWQgZW50cnkgaW50byB0aGUgdGlsZSB0aGlzIGV2ZW50IG9jY3VwaWVzLlxyXG5cdFwiaW50ZXJhY3RlZFwiLCAvLyhmcm9tLWRpcilcclxuXHRcdC8vZW1pdHRlZCB3aGVuIHRoZSBwbGF5ZXIgaW50ZXJhY3RzIHdpdGggdGhpcyBldmVudCBmcm9tIGFuIGFkamFjZW50IHRpbGVcclxuXHRcInRpY2tcIiwgLy8oZGVsdGEpXHJcblx0XHQvL2VtaXR0ZWQgZXZlcnkgZ2FtZSB0aWNrXHJcblx0XCJjbGlja2VkXCIsIC8vKHgsIHkpXHJcblx0XHQvL2VtaXR0ZWQgd2hlbiB0aGUgbW91c2UgaXMgY2xpY2tlZCBvbiB0aGlzIGV2ZW50IChhbmQgaXQgaXMgZGV0ZXJtaW5lZCBpdCBpcyB0aGlzIGV2ZW50KVxyXG5cdFwiY2xpY2tlZC10aHJvdWdoXCIsIC8vKHgsIHkpXHJcblx0XHQvL2VtaXR0ZWQgd2hlbiB0aGUgbW91c2UgaXMgY2xpY2tlZCBvbiB0aGlzIGV2ZW50IChhbmQgdGhlIHJheXRyYWNlIGlzIHBhc3NpbmcgdGhyb3VnaCBcclxuXHRcdC8vIHRoaXMgZXZlbnQgZHVyaW5nIHRoZSBkZXRlcm1pbmluZyBwaGFzZSlcclxuXHRcIm1vdmluZ1wiLCAvLyhzcmNYLCBzcmNZLCBkZXN0WCwgZGVzdFkpXHJcblx0XHQvL2VtaXR0ZWQgd2hlbiB0aGlzIGV2ZW50IGJlZ2lucyBtb3ZpbmcgdG8gYSBuZXcgdGlsZVxyXG5cdFwibW92ZWRcIiwgLy8oc3JjWCwgc3JjWSwgZGVzdFgsIGRlc3RZKVxyXG5cdFx0Ly9lbWl0dGVkIHdoZW4gdGhpcyBldmVudCBmaW5pc2hlcyBtb3ZpbmcgdG8gYSBuZXcgdGlsZVxyXG5cdFwiYW5pbS1lbmRcIiwgLy8oYW5pbWF0aW9uTmFtZSlcclxuXHRcdC8vZW1pdHRlZCB3aGVuIHRoaXMgZXZlbnQncyBhbmltYXRpb24gZW5kc1xyXG5cdFwiY3JlYXRlZFwiLCBcclxuXHRcdC8vZW1pdHRlZCB3aGVuIHRoaXMgZXZlbnQgaXMgYWRkZWQgdG8gdGhlIGV2ZW50IG1hcFxyXG5cdFwiZGVzdHJveWVkXCIsXHJcblx0XHQvL2VtaXR0ZWQgd2hlbiB0aGlzIGV2ZW50IGhhcyBiZWVuIHRha2VuIG91dCBvZiB0aGUgZXZlbnQgbWFwXHJcblx0XCJyZWFjdFwiLCAvLyhpZCwgZGlzdGFuY2UpXHJcblx0XHQvL2VtaXR0ZWQgd2hlbiBhbm90aGVyIGV2ZW50IG9uIHRoZSBtYXAgdHJhbnNtaXRzIGEgcmVhY3RhYmxlIGV2ZW50XHJcblx0XCJtZXNzYWdlXCIsIC8vKGlkLCAuLi4pXHJcblx0XHQvL25ldmVyIGVtaXR0ZWQgYnkgdGhlIGxpYnJhcnksIHRoaXMgZXZlbnQgdHlwZSBjYW4gYmUgdXNlZCBmb3IgY3Jvc3MtZXZlbnQgbWVzc2FnZXNcclxuXTtcclxuIiwiLy8gcGxheWVyLWNoYXJhY3Rlci5qc1xyXG4vLyBEZWZpbmVzIHRoZSBjb25jcmV0ZSBjb2RlIGZvciBhIFBsYXllciBDaGFyYWN0ZXIgaW4gdGhlIHdvcmxkXHJcblxyXG52YXIgQWN0b3IgPSByZXF1aXJlKFwidHBwLWFjdG9yXCIpO1xyXG52YXIgY29udHJvbGxlciA9IHJlcXVpcmUoXCJ0cHAtY29udHJvbGxlclwiKTtcclxudmFyIGluaGVyaXRzID0gcmVxdWlyZShcImluaGVyaXRzXCIpO1xyXG52YXIgZXh0ZW5kID0gcmVxdWlyZShcImV4dGVuZFwiKTtcclxuXHJcbi8qKlxyXG4gKi9cclxuZnVuY3Rpb24gUGxheWVyQ2hhcigpe1xyXG5cdEFjdG9yLmNhbGwodGhpcywge30sIHt9KTtcclxuXHRcclxuXHR0aGlzLm9uKFwidGlja1wiLCB0aGlzLmNvbnRyb2xDaGFyYWN0ZXIpO1xyXG59XHJcbmluaGVyaXRzKFBsYXllckNoYXIsIEFjdG9yKTtcclxuZXh0ZW5kKFBsYXllckNoYXIucHJvdG90eXBlLCB7XHJcblx0aWQgOiBcIlBMQVlFUkNIQVJcIixcclxuXHRsb2NhdGlvbiA6IG5ldyBUSFJFRS5WZWN0b3IzKCksXHJcblx0XHJcblx0c3ByaXRlOiBudWxsLFxyXG5cdFxyXG5cdHJlc2V0IDogZnVuY3Rpb24oKSB7XHJcblx0XHR0aGlzLmxvY2F0aW9uLnNldCgwLCAwLCAwKTtcclxuXHR9LFxyXG5cdFxyXG5cdHdhcnBBd2F5IDogZnVuY3Rpb24oYW5pbVR5cGUpIHtcclxuXHRcdGNvbnNvbGUud2FybihcIndhcnBBd2F5IGlzIG5vdCB5ZXQgaW1wbGVtZW50ZWQhXCIpO1xyXG5cdH0sXHJcblx0XHJcblx0d2FycFRvIDogZnVuY3Rpb24od2FycGRlZikge1xyXG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xyXG5cdFx0dGhpcy5sb2NhdGlvbi5zZXQod2FycGRlZi5sb2NbMF0sIHdhcnBkZWYubG9jWzFdLCB3YXJwZGVmLmxheWVyKTtcclxuXHRcdC8vVE9ETyB3YXJwZGVmLmFuaW1cclxuXHRcdFxyXG5cdFx0Y3VycmVudE1hcC5xdWV1ZUZvck1hcFN0YXJ0KGZ1bmN0aW9uKCl7XHJcblx0XHRcdHZhciBhbmltTmFtZSA9IG51bGw7XHJcblx0XHRcdHZhciB4ID0gc2VsZi5sb2NhdGlvbi54O1xyXG5cdFx0XHR2YXIgeSA9IHNlbGYubG9jYXRpb24ueTtcclxuXHRcdFx0dmFyIGxheWVyID0gc2VsZi5sb2NhdGlvbi56O1xyXG5cdFx0XHR2YXIgel9vZmYgPSAwO1xyXG5cdFx0XHRcclxuXHRcdFx0c3dpdGNoKHdhcnBkZWYuYW5pbSkgeyAvL1dhcnAgYW5pbWF0aW9uXHJcblx0XHRcdFx0Y2FzZSAwOiBicmVhazsgLy8gQXBwZWFyXHJcblx0XHRcdFx0Y2FzZSAxOiB5Kys7IGFuaW1OYW1lID0gXCJ3YWxrXCI7IGJyZWFrOyAvLyBXYWxrIHVwXHJcblx0XHRcdFx0Y2FzZSAyOiB5LS07IGFuaW1OYW1lID0gXCJ3YWxrXCI7IGJyZWFrOyAvLyBXYWxrIGRvd25cclxuXHRcdFx0XHRjYXNlIDM6IHgtLTsgYW5pbU5hbWUgPSBcIndhbGtcIjsgYnJlYWs7IC8vIFdhbGsgbGVmdFxyXG5cdFx0XHRcdGNhc2UgNDogeCsrOyBhbmltTmFtZSA9IFwid2Fsa1wiOyBicmVhazsgLy8gV2FsayBkb3duXHJcblx0XHRcdFx0Y2FzZSA1OiB6X29mZiA9IDEwOyBhbmltTmFtZSA9IFwid2FycF9pblwiOyBicmVhazsgLy8gV2FycCBpblxyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHR2YXIgc3JjID0gc2VsZi5sb2NhdGlvbjtcclxuXHRcdFx0dmFyIHN0YXRlID0gc2VsZi5faW5pdFBhdGhpbmdTdGF0ZSgpO1xyXG5cdFx0XHRcclxuXHRcdFx0aWYgKHNyYy54LXggfHwgeS1zcmMueSkgXHJcblx0XHRcdFx0c2VsZi5mYWNpbmcuc2V0KHgtc3JjLngsIDAsIHNyYy55LXkpO1xyXG5cdFx0XHRlbHNlXHJcblx0XHRcdFx0c2VsZi5mYWNpbmcuc2V0KDAsIDAsIDEpO1xyXG5cdFx0XHRcclxuXHRcdFx0c3RhdGUuc3JjTG9jQy5zZXQoeCwgeSwgbGF5ZXIpO1xyXG5cdFx0XHRzdGF0ZS5zcmNMb2MzLnNldChjdXJyZW50TWFwLmdldDNEVGlsZUxvY2F0aW9uKHgsIHksIGxheWVyKSk7XHJcblx0XHRcdHN0YXRlLmRlc3RMb2NDLnNldChzcmMpO1xyXG5cdFx0XHRzdGF0ZS5kZXN0TG9jMy5zZXQoY3VycmVudE1hcC5nZXQzRFRpbGVMb2NhdGlvbihzcmMpKS56ICs9IHpfb2ZmO1xyXG5cdFx0XHRzdGF0ZS5kZWx0YSA9IDA7XHJcblx0XHRcdHN0YXRlLm1vdmluZyA9IHRydWU7XHJcblx0XHRcdFxyXG5cdFx0XHRzZWxmLnBsYXlBbmltYXRpb24oYW5pbU5hbWUpO1xyXG5cdFx0XHRcclxuXHRcdFx0Ly9zZWxmLmF2YXRhcl9ub2RlLnBvc2l0aW9uLnNldCggY3VycmVudE1hcC5nZXQzRFRpbGVMb2NhdGlvbihzZWxmLmxvY2F0aW9uKSApO1xyXG5cdFx0fSk7XHJcblx0fSxcclxuXHRcclxuXHRjb250cm9sVGltZW91dDogMC4wLFxyXG5cdGNvbnRyb2xDaGFyYWN0ZXIgOiBmdW5jdGlvbihkZWx0YSkge1xyXG5cdFx0dmFyIHkgPSAoKGNvbnRyb2xsZXIuaXNEb3duKFwiVXBcIiwgXCJnYW1lXCIpKT8gLTE6MCkgKyAoKGNvbnRyb2xsZXIuaXNEb3duKFwiRG93blwiLCBcImdhbWVcIikpPyAxOjApO1xyXG5cdFx0dmFyIHggPSAoKGNvbnRyb2xsZXIuaXNEb3duKFwiTGVmdFwiLCBcImdhbWVcIikpPyAtMTowKSArICgoY29udHJvbGxlci5pc0Rvd24oXCJSaWdodFwiLCBcImdhbWVcIikpPyAxOjApO1xyXG5cdFx0XHJcblx0XHRpZiAoY29udHJvbGxlci5pc0Rvd24oXCJJbnRlcmFjdFwiLCBcImdhbWVcIikgJiYgIXRoaXMuX2luaXRQYXRoaW5nU3RhdGUoKS5tb3ZpbmcpIHtcclxuXHRcdFx0Y3VycmVudE1hcC5kaXNwYXRjaChcclxuXHRcdFx0XHR0aGlzLmxvY2F0aW9uLnggLSB0aGlzLmZhY2luZy54LCB0aGlzLmxvY2F0aW9uLnkgKyB0aGlzLmZhY2luZy56LCBcclxuXHRcdFx0XHRcImludGVyYWN0ZWRcIiwgdGhpcy5mYWNpbmcpO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHRpZiAoKHkgfHwgeCkgJiYgISh4ICYmIHkpKSB7IC8vb25lLCBidXQgbm90IGJvdGhcclxuXHRcdFx0aWYgKHRoaXMuY29udHJvbFRpbWVvdXQgPCAxKSB7XHJcblx0XHRcdFx0dGhpcy5jb250cm9sVGltZW91dCArPSBDT05GSUcudGltZW91dC53YWxrQ29udHJvbCAqIGRlbHRhO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdGlmICghdGhpcy5faW5pdFBhdGhpbmdTdGF0ZSgpLm1vdmluZykge1xyXG5cdFx0XHRcdFx0dGhpcy5mYWNlRGlyKHgsIHkpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRpZiAoIXRoaXMuX2luaXRQYXRoaW5nU3RhdGUoKS5tb3ZpbmcpIHtcclxuXHRcdFx0XHRcdHRoaXMubW92ZVRvKHRoaXMubG9jYXRpb24ueCt4LCB0aGlzLmxvY2F0aW9uLnkreSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRpZiAodGhpcy5jb250cm9sVGltZW91dCA+IDApXHJcblx0XHRcdFx0dGhpcy5jb250cm9sVGltZW91dCAtPSBDT05GSUcudGltZW91dC53YWxrQ29udHJvbCAqIGRlbHRhO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0fSxcclxuXHRcclxuXHRcclxuXHQvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHRcclxuXHRfYXZhdGFyX2xvYWRTcHJpdGUgOiBmdW5jdGlvbihtYXAsIHRleHR1cmUpIHtcclxuXHRcdHZhciB1cmwgPSBCQVNFVVJMK1wiL2ltZy9wY3MvXCIrIGdhbWVTdGF0ZS5wbGF5ZXJTcHJpdGU7XHJcblx0XHR2YXIgcmVzID0gL14oW15cXFtdKylcXFsoW15cXF1dKylcXF0ucG5nJC8uZXhlYyh1cmwpO1xyXG5cdFx0XHJcblx0XHR2YXIgbmFtZSA9IHJlc1sxXTtcclxuXHRcdHZhciBmb3JtYXQgPSByZXNbMl07XHJcblx0XHRcclxuXHRcdHZhciBpbWcgPSBuZXcgSW1hZ2UoKTtcclxuXHRcdHRoaXMuX19vbkxvYWRTcHJpdGUoaW1nLCBmb3JtYXQsIHRleHR1cmUpO1xyXG5cdFx0aW1nLnNyYyA9IHVybDtcclxuXHR9LFxyXG5cdFxyXG5cdC8vIE5ldXRlciB0aGUgbG9jYXRpb24gbm9ybWlsaXphdGlvbiBmb3IgdGhpcyBraW5kIG9mIGV2ZW50XHJcblx0X25vcm1hbGl6ZUxvY2F0aW9uIDogZnVuY3Rpb24oKSB7fSxcclxuXHRcclxufSk7XHJcbm1vZHVsZS5leHBvcnRzID0gUGxheWVyQ2hhcjtcclxuIiwiLy8gdHJpZ2dlci5qc1xyXG4vLyBEZWZpbmVzIGEgdHJpZ2dlciB0aWxlKHMpIHVzZWQgdGhyb3VnaG91dCB0aGUgcGFya1xyXG5cclxudmFyIEV2ZW50ID0gcmVxdWlyZShcInRwcC1ldmVudFwiKTtcclxudmFyIGluaGVyaXRzID0gcmVxdWlyZShcImluaGVyaXRzXCIpO1xyXG52YXIgZXh0ZW5kID0gcmVxdWlyZShcImV4dGVuZFwiKTtcclxuXHJcbi8qKlxyXG4gKiBBIHRyaWdnZXIgaXMgYSB0aWxlIHRoYXQsIHdoZW4gc3RlcHBlZCB1cG9uLCB3aWxsIHRyaWdnZXIgc29tZSBldmVudC5cclxuICogVGhlIG1vc3QgY29tbW9uIGV2ZW50IHRpZ2dlcmVkIGlzIGEgd2FycGluZyB0byBhbm90aGVyIG1hcCwgZm9yIHdoaWNoXHJcbiAqIHRoZSBzdWJjbGFzcyBXYXJwIGlzIGRlc2lnbmVkIGZvci5cclxuICpcclxuICogVHJpZ2dlcnMgbWF5IHRha2UgdXAgbW9yZSB0aGFuIG9uZSBzcGFjZS5cclxuICovXHJcbmZ1bmN0aW9uIFRyaWdnZXIoYmFzZSwgb3B0cykge1xyXG5cdEV2ZW50LmNhbGwodGhpcywgYmFzZSwgb3B0cyk7XHJcbn1cclxuaW5oZXJpdHMoVHJpZ2dlciwgRXZlbnQpO1xyXG5leHRlbmQoVHJpZ2dlci5wcm90b3R5cGUsIHtcclxuXHRcclxufSk7IiwiLy8gd2FycC5qc1xyXG4vLyBEZWZpbmVzIGEgd2FycCB0aWxlIHVzZWQgdGhyb3VnaG91dCB0aGUgcGFyay5cclxuXHJcbnZhciBFdmVudCA9IHJlcXVpcmUoXCJ0cHAtZXZlbnRcIik7XHJcbnZhciBpbmhlcml0cyA9IHJlcXVpcmUoXCJpbmhlcml0c1wiKTtcclxudmFyIGV4dGVuZCA9IHJlcXVpcmUoXCJleHRlbmRcIik7XHJcblxyXG4vKipcclxuICogQSB3YXJwIGlzIGFuIGV2ZW50IHRoYXQsIHdoZW4gd2Fsa2VkIHVwb24sIHdpbGwgdGFrZSB0aGUgcGxheWVyIHRvIGFub3RoZXIgbWFwIG9yXHJcbiAqIGFyZWEgd2l0aGluIHRoZSBzYW1lIG1hcC4gRGlmZmVyZW50IHR5cGVzIG9mIHdhcnBzIGV4aXN0LCByYW5naW5nIGZyb20gdGhlIHN0YW5kYXJkXHJcbiAqIGRvb3Igd2FycCB0byB0aGUgdGVsZXBvcnQgd2FycC4gV2FycHMgY2FuIGJlIHRvbGQgdG8gYWN0aXZhdGUgdXBvbiBzdGVwcGluZyB1cG9uIHRoZW1cclxuICogb3IgYWN0aXZhdGUgdXBvbiBzdGVwcGluZyBvZmYgYSBjZXJ0YWluIGRpcmVjdGlvbi5cclxuICovXHJcbmZ1bmN0aW9uIFdhcnAoYmFzZSwgb3B0cykge1xyXG5cdEV2ZW50LmNhbGwodGhpcywgYmFzZSwgb3B0cyk7XHJcbn1cclxuaW5oZXJpdHMoV2FycCwgRXZlbnQpO1xyXG5leHRlbmQoV2FycC5wcm90b3R5cGUsIHtcclxuXHRcclxufSk7Il19
