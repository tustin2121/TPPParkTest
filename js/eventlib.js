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
	var gc = opts.gc || GC.getBin();
	
	opts = extend({
		transparent: true,
		alphaTest: true,
	}, opts);
	
	if (!opts.offset) opts.offset = new THREE.Vector3(0, 0, 0);
	
	//TODO replace with geometry we can control
	// var geom = new THREE.PlaneBufferGeometry(1, 1);
	var geom = new CharacterPlaneGeometry(opts.offset.x, opts.offset.y, opts.offset.z);
	gc.collect(geom);
	
	var mat = new CharacterSpriteMaterial(opts);
	gc.collect(mat);
	
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
		// 'finalPosition.z += position.z;',
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
},{"extend":2,"inherits":3}],"tpp-actor-animations":[function(require,module,exports){
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
},{"extend":2}],"tpp-actor":[function(require,module,exports){
// actor.js
// Defines the actor event used throughout the park

var Event = require("tpp-event");
var inherits = require("inherits");
var extend = require("extend");

var CharacterSprite = require("../model/spritemodel.js").CharacterSprite;
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
	this.on("interacted", this._actorInteractFace);
	this.on("cant-move", this._actorBump);
	this.facing = new THREE.Vector3(0, 0, 1);
	
	this._initBehaviorStack();
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
		node.add(this._avatar_createShadowCaster(map));
		
		return node;
		
	},
	
	_avatar_createShadowCaster: function(map) {
		var mat = new THREE.MeshBasicMaterial();
		mat.visible = false; //The object won't render, but the shadow still will
		map.gc.collect(mat);
		
		var geom = new THREE.SphereGeometry(0.3, 7, 3);
		map.gc.collect(geom);
		
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
		map.gc.collect(texture);
		
		// Note: not useing "this.getSpriteFormat", because the defailt sprite
		// format should not be overidden.
		var spformat = getSpriteFormat(DEF_SPRITE_FORMAT);
		
		this.__onLoadSprite(img, spformat, texture);
		img.src = DEF_SPRITE;
		
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
		
		currentMap.markLoading();
		this._avatar_loadSprite(map, texture);
		
		//var sprite = self.avatar_sprite = new THREE.Sprite(mat);
		var sprite = self.avatar_sprite = new CharacterSprite({
			map: texture,
			color: 0xFFFFFF,
			offset: new THREE.Vector3(0, 0.3, 0.22),
			gc: map.gc,
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
			var format = self.sprite_format;
			if (typeof format == "function") 
				format = self.sprite_format(self.sprite);
			if (typeof format != "string") {
				console.error("INVALID SPRITE FORMAT! 'sprite_format' must be a string or a "+
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
			
			// self.showAnimationFrame("d0");
			self.playAnimation("stand");
			img.removeEventListener("load", f);
			currentMap.markLoadFinished();
		}
		img.on("load", f);
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
	
	_actorInteractFace : function(vector) {
		this.facing = vector.clone().negate();
	},
	
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


},{"../model/spritemodel.js":4,"extend":2,"inherits":3,"tpp-actor-animations":"tpp-actor-animations","tpp-event":"tpp-event"}],"tpp-behavior":[function(require,module,exports){
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
	tick : null,
	interact : null,
	bump : null,
	
	_tick : function(me, delta) {
		if (this.tick)
			this.tick(me, delta);
	},
	_interact : function(me, from_dir) {
		//TODO do standard stuff here
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
	tick: function(me, delta) {},
});
module.exports.Talking = Talking;



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


},{"extend":2,"inherits":3}],"tpp-controller":[function(require,module,exports){
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
		FocusChat: [191, "/"],
	},
	
	keys_active : {},
	
	keys_down : {
		Up: false, Down: false,
		Left: false, Right: false,
		Interact: false, FocusChat: false,
	},
	
	pushInputContext: function(ctx) {
		this.inputContext.push(ctx);
	},
	popInputContext: function(ctx) {
		if (!ctx || this.inputContext.top == ctx)
			this.inputContext.pop();
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
			
			switch(Number(warpdef.anim)) { //Warp animation
				case 0: break; // Appear
				case 1: y++; animName = "walk"; mspd = 0.35; aspd = 0.35; break; // Walk up
				case 2: y--; animName = "walk"; mspd = 0.35; aspd = 0.35; break; // Walk down
				case 3: x--; animName = "walk"; mspd = 0.35; aspd = 0.35; break; // Walk left
				case 4: x++; animName = "walk"; mspd = 0.35; aspd = 0.35; break; // Walk down
				case 5: // Warp in
					animName = "warp_in"; 
					y_off = 15; 
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
			self.once("anim-end", function(animationName){
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

},{"extend":2,"inherits":3,"tpp-event":"tpp-event"}],"tpp-warp":[function(require,module,exports){
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
	
	onTriggerEnter : function(dir) {
		SoundManager.playSound(this.sound);
	},
});
module.exports = Warp;
},{"extend":2,"inherits":3,"tpp-trigger":"tpp-trigger"}]},{},[])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlc1xcYnJvd3NlcmlmeVxcbm9kZV9tb2R1bGVzXFxicm93c2VyLXBhY2tcXF9wcmVsdWRlLmpzIiwibm9kZV9tb2R1bGVzXFxicm93c2VyaWZ5XFxub2RlX21vZHVsZXNcXGV2ZW50c1xcZXZlbnRzLmpzIiwibm9kZV9tb2R1bGVzXFxleHRlbmRcXGluZGV4LmpzIiwibm9kZV9tb2R1bGVzXFxpbmhlcml0c1xcaW5oZXJpdHNfYnJvd3Nlci5qcyIsInNyY1xcanNcXG1vZGVsXFxzcHJpdGVtb2RlbC5qcyIsInNyY1xcanNcXGV2ZW50c1xcYWN0b3JfYW5pbWF0aW9ucyIsInNyY1xcanNcXGV2ZW50c1xcYWN0b3IiLCJzcmNcXGpzXFxldmVudHNcXGJlaGF2aW9yIiwic3JjXFxqc1xcbWFuYWdlcnNcXGNvbnRyb2xsZXIiLCJzcmNcXGpzXFxldmVudHNcXGV2ZW50Iiwic3JjXFxqc1xcZXZlbnRzXFxwbGF5ZXItY2hhcmFjdGVyIiwic3JjXFxqc1xcZXZlbnRzXFx0cmlnZ2VyIiwic3JjXFxqc1xcZXZlbnRzXFx3YXJwIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3U0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDblNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaGZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuZnVuY3Rpb24gRXZlbnRFbWl0dGVyKCkge1xuICB0aGlzLl9ldmVudHMgPSB0aGlzLl9ldmVudHMgfHwge307XG4gIHRoaXMuX21heExpc3RlbmVycyA9IHRoaXMuX21heExpc3RlbmVycyB8fCB1bmRlZmluZWQ7XG59XG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50RW1pdHRlcjtcblxuLy8gQmFja3dhcmRzLWNvbXBhdCB3aXRoIG5vZGUgMC4xMC54XG5FdmVudEVtaXR0ZXIuRXZlbnRFbWl0dGVyID0gRXZlbnRFbWl0dGVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9ldmVudHMgPSB1bmRlZmluZWQ7XG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9tYXhMaXN0ZW5lcnMgPSB1bmRlZmluZWQ7XG5cbi8vIEJ5IGRlZmF1bHQgRXZlbnRFbWl0dGVycyB3aWxsIHByaW50IGEgd2FybmluZyBpZiBtb3JlIHRoYW4gMTAgbGlzdGVuZXJzIGFyZVxuLy8gYWRkZWQgdG8gaXQuIFRoaXMgaXMgYSB1c2VmdWwgZGVmYXVsdCB3aGljaCBoZWxwcyBmaW5kaW5nIG1lbW9yeSBsZWFrcy5cbkV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzID0gMTA7XG5cbi8vIE9idmlvdXNseSBub3QgYWxsIEVtaXR0ZXJzIHNob3VsZCBiZSBsaW1pdGVkIHRvIDEwLiBUaGlzIGZ1bmN0aW9uIGFsbG93c1xuLy8gdGhhdCB0byBiZSBpbmNyZWFzZWQuIFNldCB0byB6ZXJvIGZvciB1bmxpbWl0ZWQuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnNldE1heExpc3RlbmVycyA9IGZ1bmN0aW9uKG4pIHtcbiAgaWYgKCFpc051bWJlcihuKSB8fCBuIDwgMCB8fCBpc05hTihuKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ24gbXVzdCBiZSBhIHBvc2l0aXZlIG51bWJlcicpO1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSBuO1xuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGVyLCBoYW5kbGVyLCBsZW4sIGFyZ3MsIGksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBJZiB0aGVyZSBpcyBubyAnZXJyb3InIGV2ZW50IGxpc3RlbmVyIHRoZW4gdGhyb3cuXG4gIGlmICh0eXBlID09PSAnZXJyb3InKSB7XG4gICAgaWYgKCF0aGlzLl9ldmVudHMuZXJyb3IgfHxcbiAgICAgICAgKGlzT2JqZWN0KHRoaXMuX2V2ZW50cy5lcnJvcikgJiYgIXRoaXMuX2V2ZW50cy5lcnJvci5sZW5ndGgpKSB7XG4gICAgICBlciA9IGFyZ3VtZW50c1sxXTtcbiAgICAgIGlmIChlciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgIHRocm93IGVyOyAvLyBVbmhhbmRsZWQgJ2Vycm9yJyBldmVudFxuICAgICAgfVxuICAgICAgdGhyb3cgVHlwZUVycm9yKCdVbmNhdWdodCwgdW5zcGVjaWZpZWQgXCJlcnJvclwiIGV2ZW50LicpO1xuICAgIH1cbiAgfVxuXG4gIGhhbmRsZXIgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzVW5kZWZpbmVkKGhhbmRsZXIpKVxuICAgIHJldHVybiBmYWxzZTtcblxuICBpZiAoaXNGdW5jdGlvbihoYW5kbGVyKSkge1xuICAgIHN3aXRjaCAoYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgLy8gZmFzdCBjYXNlc1xuICAgICAgY2FzZSAxOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAyOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDM6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgLy8gc2xvd2VyXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgICAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgICAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIGhhbmRsZXIuYXBwbHkodGhpcywgYXJncyk7XG4gICAgfVxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGhhbmRsZXIpKSB7XG4gICAgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuXG4gICAgbGlzdGVuZXJzID0gaGFuZGxlci5zbGljZSgpO1xuICAgIGxlbiA9IGxpc3RlbmVycy5sZW5ndGg7XG4gICAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKVxuICAgICAgbGlzdGVuZXJzW2ldLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIG07XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIFRvIGF2b2lkIHJlY3Vyc2lvbiBpbiB0aGUgY2FzZSB0aGF0IHR5cGUgPT09IFwibmV3TGlzdGVuZXJcIiEgQmVmb3JlXG4gIC8vIGFkZGluZyBpdCB0byB0aGUgbGlzdGVuZXJzLCBmaXJzdCBlbWl0IFwibmV3TGlzdGVuZXJcIi5cbiAgaWYgKHRoaXMuX2V2ZW50cy5uZXdMaXN0ZW5lcilcbiAgICB0aGlzLmVtaXQoJ25ld0xpc3RlbmVyJywgdHlwZSxcbiAgICAgICAgICAgICAgaXNGdW5jdGlvbihsaXN0ZW5lci5saXN0ZW5lcikgP1xuICAgICAgICAgICAgICBsaXN0ZW5lci5saXN0ZW5lciA6IGxpc3RlbmVyKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAvLyBPcHRpbWl6ZSB0aGUgY2FzZSBvZiBvbmUgbGlzdGVuZXIuIERvbid0IG5lZWQgdGhlIGV4dHJhIGFycmF5IG9iamVjdC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBsaXN0ZW5lcjtcbiAgZWxzZSBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICAvLyBJZiB3ZSd2ZSBhbHJlYWR5IGdvdCBhbiBhcnJheSwganVzdCBhcHBlbmQuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdLnB1c2gobGlzdGVuZXIpO1xuICBlbHNlXG4gICAgLy8gQWRkaW5nIHRoZSBzZWNvbmQgZWxlbWVudCwgbmVlZCB0byBjaGFuZ2UgdG8gYXJyYXkuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gW3RoaXMuX2V2ZW50c1t0eXBlXSwgbGlzdGVuZXJdO1xuXG4gIC8vIENoZWNrIGZvciBsaXN0ZW5lciBsZWFrXG4gIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pICYmICF0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkKSB7XG4gICAgdmFyIG07XG4gICAgaWYgKCFpc1VuZGVmaW5lZCh0aGlzLl9tYXhMaXN0ZW5lcnMpKSB7XG4gICAgICBtID0gdGhpcy5fbWF4TGlzdGVuZXJzO1xuICAgIH0gZWxzZSB7XG4gICAgICBtID0gRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnM7XG4gICAgfVxuXG4gICAgaWYgKG0gJiYgbSA+IDAgJiYgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCA+IG0pIHtcbiAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQgPSB0cnVlO1xuICAgICAgY29uc29sZS5lcnJvcignKG5vZGUpIHdhcm5pbmc6IHBvc3NpYmxlIEV2ZW50RW1pdHRlciBtZW1vcnkgJyArXG4gICAgICAgICAgICAgICAgICAgICdsZWFrIGRldGVjdGVkLiAlZCBsaXN0ZW5lcnMgYWRkZWQuICcgK1xuICAgICAgICAgICAgICAgICAgICAnVXNlIGVtaXR0ZXIuc2V0TWF4TGlzdGVuZXJzKCkgdG8gaW5jcmVhc2UgbGltaXQuJyxcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCk7XG4gICAgICBpZiAodHlwZW9mIGNvbnNvbGUudHJhY2UgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgLy8gbm90IHN1cHBvcnRlZCBpbiBJRSAxMFxuICAgICAgICBjb25zb2xlLnRyYWNlKCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbmNlID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIHZhciBmaXJlZCA9IGZhbHNlO1xuXG4gIGZ1bmN0aW9uIGcoKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBnKTtcblxuICAgIGlmICghZmlyZWQpIHtcbiAgICAgIGZpcmVkID0gdHJ1ZTtcbiAgICAgIGxpc3RlbmVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICB9XG5cbiAgZy5saXN0ZW5lciA9IGxpc3RlbmVyO1xuICB0aGlzLm9uKHR5cGUsIGcpO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLy8gZW1pdHMgYSAncmVtb3ZlTGlzdGVuZXInIGV2ZW50IGlmZiB0aGUgbGlzdGVuZXIgd2FzIHJlbW92ZWRcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbGlzdCwgcG9zaXRpb24sIGxlbmd0aCwgaTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXR1cm4gdGhpcztcblxuICBsaXN0ID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuICBsZW5ndGggPSBsaXN0Lmxlbmd0aDtcbiAgcG9zaXRpb24gPSAtMTtcblxuICBpZiAobGlzdCA9PT0gbGlzdGVuZXIgfHxcbiAgICAgIChpc0Z1bmN0aW9uKGxpc3QubGlzdGVuZXIpICYmIGxpc3QubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG5cbiAgfSBlbHNlIGlmIChpc09iamVjdChsaXN0KSkge1xuICAgIGZvciAoaSA9IGxlbmd0aDsgaS0tID4gMDspIHtcbiAgICAgIGlmIChsaXN0W2ldID09PSBsaXN0ZW5lciB8fFxuICAgICAgICAgIChsaXN0W2ldLmxpc3RlbmVyICYmIGxpc3RbaV0ubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgICAgICBwb3NpdGlvbiA9IGk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChwb3NpdGlvbiA8IDApXG4gICAgICByZXR1cm4gdGhpcztcblxuICAgIGlmIChsaXN0Lmxlbmd0aCA9PT0gMSkge1xuICAgICAgbGlzdC5sZW5ndGggPSAwO1xuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGlzdC5zcGxpY2UocG9zaXRpb24sIDEpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUFsbExpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGtleSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIC8vIG5vdCBsaXN0ZW5pbmcgZm9yIHJlbW92ZUxpc3RlbmVyLCBubyBuZWVkIHRvIGVtaXRcbiAgaWYgKCF0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMClcbiAgICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIGVsc2UgaWYgKHRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvLyBlbWl0IHJlbW92ZUxpc3RlbmVyIGZvciBhbGwgbGlzdGVuZXJzIG9uIGFsbCBldmVudHNcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICBmb3IgKGtleSBpbiB0aGlzLl9ldmVudHMpIHtcbiAgICAgIGlmIChrZXkgPT09ICdyZW1vdmVMaXN0ZW5lcicpIGNvbnRpbnVlO1xuICAgICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoa2V5KTtcbiAgICB9XG4gICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoJ3JlbW92ZUxpc3RlbmVyJyk7XG4gICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBsaXN0ZW5lcnMgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzRnVuY3Rpb24obGlzdGVuZXJzKSkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBMSUZPIG9yZGVyXG4gICAgd2hpbGUgKGxpc3RlbmVycy5sZW5ndGgpXG4gICAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVyc1tsaXN0ZW5lcnMubGVuZ3RoIC0gMV0pO1xuICB9XG4gIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSBbXTtcbiAgZWxzZSBpZiAoaXNGdW5jdGlvbih0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IFt0aGlzLl9ldmVudHNbdHlwZV1dO1xuICBlbHNlXG4gICAgcmV0ID0gdGhpcy5fZXZlbnRzW3R5cGVdLnNsaWNlKCk7XG4gIHJldHVybiByZXQ7XG59O1xuXG5FdmVudEVtaXR0ZXIubGlzdGVuZXJDb3VudCA9IGZ1bmN0aW9uKGVtaXR0ZXIsIHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCFlbWl0dGVyLl9ldmVudHMgfHwgIWVtaXR0ZXIuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSAwO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKGVtaXR0ZXIuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gMTtcbiAgZWxzZVxuICAgIHJldCA9IGVtaXR0ZXIuX2V2ZW50c1t0eXBlXS5sZW5ndGg7XG4gIHJldHVybiByZXQ7XG59O1xuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Z1bmN0aW9uJztcbn1cblxuZnVuY3Rpb24gaXNOdW1iZXIoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnbnVtYmVyJztcbn1cblxuZnVuY3Rpb24gaXNPYmplY3QoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiBhcmcgIT09IG51bGw7XG59XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09PSB2b2lkIDA7XG59XG4iLCJ2YXIgaGFzT3duID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcbnZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG52YXIgdW5kZWZpbmVkO1xuXG52YXIgaXNQbGFpbk9iamVjdCA9IGZ1bmN0aW9uIGlzUGxhaW5PYmplY3Qob2JqKSB7XG5cdCd1c2Ugc3RyaWN0Jztcblx0aWYgKCFvYmogfHwgdG9TdHJpbmcuY2FsbChvYmopICE9PSAnW29iamVjdCBPYmplY3RdJykge1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXG5cdHZhciBoYXNfb3duX2NvbnN0cnVjdG9yID0gaGFzT3duLmNhbGwob2JqLCAnY29uc3RydWN0b3InKTtcblx0dmFyIGhhc19pc19wcm9wZXJ0eV9vZl9tZXRob2QgPSBvYmouY29uc3RydWN0b3IgJiYgb2JqLmNvbnN0cnVjdG9yLnByb3RvdHlwZSAmJiBoYXNPd24uY2FsbChvYmouY29uc3RydWN0b3IucHJvdG90eXBlLCAnaXNQcm90b3R5cGVPZicpO1xuXHQvLyBOb3Qgb3duIGNvbnN0cnVjdG9yIHByb3BlcnR5IG11c3QgYmUgT2JqZWN0XG5cdGlmIChvYmouY29uc3RydWN0b3IgJiYgIWhhc19vd25fY29uc3RydWN0b3IgJiYgIWhhc19pc19wcm9wZXJ0eV9vZl9tZXRob2QpIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblxuXHQvLyBPd24gcHJvcGVydGllcyBhcmUgZW51bWVyYXRlZCBmaXJzdGx5LCBzbyB0byBzcGVlZCB1cCxcblx0Ly8gaWYgbGFzdCBvbmUgaXMgb3duLCB0aGVuIGFsbCBwcm9wZXJ0aWVzIGFyZSBvd24uXG5cdHZhciBrZXk7XG5cdGZvciAoa2V5IGluIG9iaikge31cblxuXHRyZXR1cm4ga2V5ID09PSB1bmRlZmluZWQgfHwgaGFzT3duLmNhbGwob2JqLCBrZXkpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBleHRlbmQoKSB7XG5cdCd1c2Ugc3RyaWN0Jztcblx0dmFyIG9wdGlvbnMsIG5hbWUsIHNyYywgY29weSwgY29weUlzQXJyYXksIGNsb25lLFxuXHRcdHRhcmdldCA9IGFyZ3VtZW50c1swXSxcblx0XHRpID0gMSxcblx0XHRsZW5ndGggPSBhcmd1bWVudHMubGVuZ3RoLFxuXHRcdGRlZXAgPSBmYWxzZTtcblxuXHQvLyBIYW5kbGUgYSBkZWVwIGNvcHkgc2l0dWF0aW9uXG5cdGlmICh0eXBlb2YgdGFyZ2V0ID09PSAnYm9vbGVhbicpIHtcblx0XHRkZWVwID0gdGFyZ2V0O1xuXHRcdHRhcmdldCA9IGFyZ3VtZW50c1sxXSB8fCB7fTtcblx0XHQvLyBza2lwIHRoZSBib29sZWFuIGFuZCB0aGUgdGFyZ2V0XG5cdFx0aSA9IDI7XG5cdH0gZWxzZSBpZiAoKHR5cGVvZiB0YXJnZXQgIT09ICdvYmplY3QnICYmIHR5cGVvZiB0YXJnZXQgIT09ICdmdW5jdGlvbicpIHx8IHRhcmdldCA9PSBudWxsKSB7XG5cdFx0dGFyZ2V0ID0ge307XG5cdH1cblxuXHRmb3IgKDsgaSA8IGxlbmd0aDsgKytpKSB7XG5cdFx0b3B0aW9ucyA9IGFyZ3VtZW50c1tpXTtcblx0XHQvLyBPbmx5IGRlYWwgd2l0aCBub24tbnVsbC91bmRlZmluZWQgdmFsdWVzXG5cdFx0aWYgKG9wdGlvbnMgIT0gbnVsbCkge1xuXHRcdFx0Ly8gRXh0ZW5kIHRoZSBiYXNlIG9iamVjdFxuXHRcdFx0Zm9yIChuYW1lIGluIG9wdGlvbnMpIHtcblx0XHRcdFx0c3JjID0gdGFyZ2V0W25hbWVdO1xuXHRcdFx0XHRjb3B5ID0gb3B0aW9uc1tuYW1lXTtcblxuXHRcdFx0XHQvLyBQcmV2ZW50IG5ldmVyLWVuZGluZyBsb29wXG5cdFx0XHRcdGlmICh0YXJnZXQgPT09IGNvcHkpIHtcblx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIFJlY3Vyc2UgaWYgd2UncmUgbWVyZ2luZyBwbGFpbiBvYmplY3RzIG9yIGFycmF5c1xuXHRcdFx0XHRpZiAoZGVlcCAmJiBjb3B5ICYmIChpc1BsYWluT2JqZWN0KGNvcHkpIHx8IChjb3B5SXNBcnJheSA9IEFycmF5LmlzQXJyYXkoY29weSkpKSkge1xuXHRcdFx0XHRcdGlmIChjb3B5SXNBcnJheSkge1xuXHRcdFx0XHRcdFx0Y29weUlzQXJyYXkgPSBmYWxzZTtcblx0XHRcdFx0XHRcdGNsb25lID0gc3JjICYmIEFycmF5LmlzQXJyYXkoc3JjKSA/IHNyYyA6IFtdO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRjbG9uZSA9IHNyYyAmJiBpc1BsYWluT2JqZWN0KHNyYykgPyBzcmMgOiB7fTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHQvLyBOZXZlciBtb3ZlIG9yaWdpbmFsIG9iamVjdHMsIGNsb25lIHRoZW1cblx0XHRcdFx0XHR0YXJnZXRbbmFtZV0gPSBleHRlbmQoZGVlcCwgY2xvbmUsIGNvcHkpO1xuXG5cdFx0XHRcdC8vIERvbid0IGJyaW5nIGluIHVuZGVmaW5lZCB2YWx1ZXNcblx0XHRcdFx0fSBlbHNlIGlmIChjb3B5ICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0XHR0YXJnZXRbbmFtZV0gPSBjb3B5O1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0Ly8gUmV0dXJuIHRoZSBtb2RpZmllZCBvYmplY3Rcblx0cmV0dXJuIHRhcmdldDtcbn07XG5cbiIsImlmICh0eXBlb2YgT2JqZWN0LmNyZWF0ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAvLyBpbXBsZW1lbnRhdGlvbiBmcm9tIHN0YW5kYXJkIG5vZGUuanMgJ3V0aWwnIG1vZHVsZVxuICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGluaGVyaXRzKGN0b3IsIHN1cGVyQ3Rvcikge1xuICAgIGN0b3Iuc3VwZXJfID0gc3VwZXJDdG9yXG4gICAgY3Rvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHN1cGVyQ3Rvci5wcm90b3R5cGUsIHtcbiAgICAgIGNvbnN0cnVjdG9yOiB7XG4gICAgICAgIHZhbHVlOiBjdG9yLFxuICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgd3JpdGFibGU6IHRydWUsXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgICAgfVxuICAgIH0pO1xuICB9O1xufSBlbHNlIHtcbiAgLy8gb2xkIHNjaG9vbCBzaGltIGZvciBvbGQgYnJvd3NlcnNcbiAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpbmhlcml0cyhjdG9yLCBzdXBlckN0b3IpIHtcbiAgICBjdG9yLnN1cGVyXyA9IHN1cGVyQ3RvclxuICAgIHZhciBUZW1wQ3RvciA9IGZ1bmN0aW9uICgpIHt9XG4gICAgVGVtcEN0b3IucHJvdG90eXBlID0gc3VwZXJDdG9yLnByb3RvdHlwZVxuICAgIGN0b3IucHJvdG90eXBlID0gbmV3IFRlbXBDdG9yKClcbiAgICBjdG9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IGN0b3JcbiAgfVxufVxuIiwiLy8gc3ByaXRlbW9kZWwuanNcclxuLy8gQSByZWR1eCBvZiB0aGUgVEhSRUUuanMgc3ByaXRlLCBidXQgbm90IHVzaW5nIHRoZSBzcHJpdGUgcGx1Z2luXHJcblxyXG52YXIgaW5oZXJpdHMgPSByZXF1aXJlKFwiaW5oZXJpdHNcIik7XHJcbnZhciBleHRlbmQgPSByZXF1aXJlKFwiZXh0ZW5kXCIpO1xyXG5cclxuZnVuY3Rpb24gQ2hhcmFjdGVyU3ByaXRlKG9wdHMpIHtcclxuXHRpZiAoISh0aGlzIGluc3RhbmNlb2YgQ2hhcmFjdGVyU3ByaXRlKSkge1xyXG5cdFx0cmV0dXJuIG5ldyBDaGFyYWN0ZXJTcHJpdGUob3B0cyk7XHJcblx0fVxyXG5cdHZhciBnYyA9IG9wdHMuZ2MgfHwgR0MuZ2V0QmluKCk7XHJcblx0XHJcblx0b3B0cyA9IGV4dGVuZCh7XHJcblx0XHR0cmFuc3BhcmVudDogdHJ1ZSxcclxuXHRcdGFscGhhVGVzdDogdHJ1ZSxcclxuXHR9LCBvcHRzKTtcclxuXHRcclxuXHRpZiAoIW9wdHMub2Zmc2V0KSBvcHRzLm9mZnNldCA9IG5ldyBUSFJFRS5WZWN0b3IzKDAsIDAsIDApO1xyXG5cdFxyXG5cdC8vVE9ETyByZXBsYWNlIHdpdGggZ2VvbWV0cnkgd2UgY2FuIGNvbnRyb2xcclxuXHQvLyB2YXIgZ2VvbSA9IG5ldyBUSFJFRS5QbGFuZUJ1ZmZlckdlb21ldHJ5KDEsIDEpO1xyXG5cdHZhciBnZW9tID0gbmV3IENoYXJhY3RlclBsYW5lR2VvbWV0cnkob3B0cy5vZmZzZXQueCwgb3B0cy5vZmZzZXQueSwgb3B0cy5vZmZzZXQueik7XHJcblx0Z2MuY29sbGVjdChnZW9tKTtcclxuXHRcclxuXHR2YXIgbWF0ID0gbmV3IENoYXJhY3RlclNwcml0ZU1hdGVyaWFsKG9wdHMpO1xyXG5cdGdjLmNvbGxlY3QobWF0KTtcclxuXHRcclxuXHRUSFJFRS5NZXNoLmNhbGwodGhpcywgZ2VvbSwgbWF0KTtcclxuXHR0aGlzLnR5cGUgPSBcIkNoYXJhY3RlclNwcml0ZVwiO1xyXG5cdFxyXG5cdG1hdC5zY2FsZSA9IG1hdC51bmlmb3Jtcy5zY2FsZS52YWx1ZSA9IHRoaXMuc2NhbGU7XHJcbn1cclxuaW5oZXJpdHMoQ2hhcmFjdGVyU3ByaXRlLCBUSFJFRS5NZXNoKTtcclxubW9kdWxlLmV4cG9ydHMuQ2hhcmFjdGVyU3ByaXRlID0gQ2hhcmFjdGVyU3ByaXRlO1xyXG5cclxuXHJcbmZ1bmN0aW9uIENoYXJhY3RlclNwcml0ZU1hdGVyaWFsKG9wdHMpIHtcclxuXHRpZiAoISh0aGlzIGluc3RhbmNlb2YgQ2hhcmFjdGVyU3ByaXRlTWF0ZXJpYWwpKSB7XHJcblx0XHRyZXR1cm4gbmV3IENoYXJhY3RlclNwcml0ZU1hdGVyaWFsKG9wdHMpO1xyXG5cdH1cclxuXHRcclxuXHQvL1RPRE8gd3JpdGUgaXQgc28gd2hlbiB3ZSByZXBsYWNlIHRoZSB2YWx1ZXMgaGVyZSwgd2UgcmVwbGFjZSB0aGUgb25lcyBpbiB0aGUgdW5pZm9ybXNcclxuXHQvLyBPYmplY3QuZGVmaW5lUHJvcGVydGllcyh0aGlzLCB7XHJcblx0Ly8gXHR1dk9mZnNldCA6IHt9XHJcblx0Ly8gfSk7XHJcblxyXG5cdHRoaXMubWFwID0gb3B0cy5tYXAgfHwgbmV3IFRIUkVFLlRleHR1cmUoKTtcclxuXHRcclxuXHR0aGlzLnV2T2Zmc2V0ID0gb3B0cy51dk9mZnNldCB8fCB0aGlzLm1hcC5vZmZzZXQgfHwgbmV3IFRIUkVFLlZlY3RvcjIoMCwgMCk7XHJcblx0dGhpcy51dlNjYWxlID0gb3B0cy51dlNjYWxlIHx8IHRoaXMubWFwLnJlcGVhdCB8fCBuZXcgVEhSRUUuVmVjdG9yMigxLCAxKTtcclxuXHRcclxuXHR0aGlzLnJvdGF0aW9uID0gb3B0cy5yb3RhdGlvbiB8fCAwO1xyXG5cdHRoaXMuc2NhbGUgPSBvcHRzLnNjYWxlIHx8IG5ldyBUSFJFRS5WZWN0b3IyKDEsIDEpO1xyXG5cdFxyXG5cdHRoaXMuY29sb3IgPSAob3B0cy5jb2xvciBpbnN0YW5jZW9mIFRIUkVFLkNvbG9yKT8gb3B0cy5jb2xvciA6IG5ldyBUSFJFRS5Db2xvcihvcHRzLmNvbG9yKTtcclxuXHR0aGlzLm9wYWNpdHkgPSBvcHRzLm9wYWNpdHkgfHwgMTtcclxuXHRcclxuXHR2YXIgcGFyYW1zID0gdGhpcy5fY3JlYXRlTWF0UGFyYW1zKG9wdHMpO1xyXG5cdFRIUkVFLlNoYWRlck1hdGVyaWFsLmNhbGwodGhpcywgcGFyYW1zKTtcclxuXHR0aGlzLnR5cGUgPSBcIkNoYXJhY3RlclNwcml0ZU1hdGVyaWFsXCI7XHJcblx0XHJcblx0dGhpcy50cmFuc3BhcmVudCA9IChvcHRzLnRyYW5zcGFyZW50ICE9PSB1bmRlZmluZWQpPyBvcHRzLnRyYW5zcGFyZW50IDogdHJ1ZTtcclxuXHR0aGlzLmFscGhhVGVzdCA9IDAuMDU7XHJcblx0Ly8gdGhpcy5kZXB0aFdyaXRlID0gZmFsc2U7XHJcbn1cclxuaW5oZXJpdHMoQ2hhcmFjdGVyU3ByaXRlTWF0ZXJpYWwsIFRIUkVFLlNoYWRlck1hdGVyaWFsKTtcclxuZXh0ZW5kKENoYXJhY3RlclNwcml0ZU1hdGVyaWFsLnByb3RvdHlwZSwge1xyXG5cdG1hcCA6IG51bGwsXHJcblx0XHJcblx0X2NyZWF0ZU1hdFBhcmFtcyA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0dmFyIHBhcmFtcyA9IHtcclxuXHRcdFx0dW5pZm9ybXMgOiB7XHJcblx0XHRcdFx0dXZPZmZzZXQ6XHR7IHR5cGU6IFwidjJcIiwgdmFsdWU6IHRoaXMudXZPZmZzZXQgfSxcclxuXHRcdFx0XHR1dlNjYWxlOlx0eyB0eXBlOiBcInYyXCIsIHZhbHVlOiB0aGlzLnV2U2NhbGUgfSxcclxuXHRcdFx0XHRcclxuXHRcdFx0XHRyb3RhdGlvbjpcdHsgdHlwZTogXCJmXCIsIHZhbHVlOiB0aGlzLnJvdGF0aW9uIH0sXHJcblx0XHRcdFx0c2NhbGU6XHRcdHsgdHlwZTogXCJ2MlwiLCB2YWx1ZTogdGhpcy5zY2FsZSB9LFxyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdGNvbG9yOlx0XHR7IHR5cGU6IFwiY1wiLCB2YWx1ZTogdGhpcy5jb2xvciB9LFxyXG5cdFx0XHRcdG1hcDpcdFx0eyB0eXBlOiBcInRcIiwgdmFsdWU6IHRoaXMubWFwIH0sXHJcblx0XHRcdFx0b3BhY2l0eTpcdHsgdHlwZTogXCJmXCIsIHZhbHVlOiB0aGlzLm9wYWNpdHkgfSxcclxuXHRcdFx0fSxcclxuXHRcdH07XHJcblx0XHRcclxuXHRcdHBhcmFtcy52ZXJ0ZXhTaGFkZXIgPSBWRVJUX1NIQURFUjtcclxuXHRcdHBhcmFtcy5mcmFnbWVudFNoYWRlciA9IEZSQUdfU0hBREVSO1xyXG5cdFx0cmV0dXJuIHBhcmFtcztcclxuXHR9LFxyXG59KTtcclxubW9kdWxlLmV4cG9ydHMuQ2hhcmFjdGVyU3ByaXRlTWF0ZXJpYWwgPSBDaGFyYWN0ZXJTcHJpdGVNYXRlcmlhbDtcclxuXHJcblxyXG5cclxuZnVuY3Rpb24gQ2hhcmFjdGVyUGxhbmVHZW9tZXRyeSh4b2ZmLCB5b2ZmLCB6b2ZmKSB7XHJcblx0VEhSRUUuQnVmZmVyR2VvbWV0cnkuY2FsbCh0aGlzKTtcclxuXHRcclxuXHR0aGlzLnR5cGUgPSBcIkNoYXJhY3RlclBsYW5lR2VvbWV0cnlcIjtcclxuXHRcclxuXHR2YXIgdmVydHMgPSBuZXcgRmxvYXQzMkFycmF5KFtcclxuXHRcdC0wLjUgKyB4b2ZmLCAtMC41ICsgeW9mZiwgMCArIHpvZmYsXHJcblx0XHQgMC41ICsgeG9mZiwgLTAuNSArIHlvZmYsIDAgKyB6b2ZmLFxyXG5cdFx0IDAuNSArIHhvZmYsICAwLjUgKyB5b2ZmLCAwICsgem9mZixcclxuXHRcdC0wLjUgKyB4b2ZmLCAgMC41ICsgeW9mZiwgMCArIHpvZmYsXHJcblx0XSk7XHJcblx0dmFyIG5vcm1zID0gbmV3IEZsb2F0MzJBcnJheShbIDAsIDEsIDEsICAgMCwgMCwgMSwgICAwLCAwLCAxLCAgIDAsIDAsIDEsIF0pO1xyXG5cdHZhciB1dnMgICA9IG5ldyBGbG9hdDMyQXJyYXkoWyAwLCAwLCAgICAgIDEsIDAsICAgICAgMSwgMSwgICAgICAwLCAxLCBdKTtcclxuXHR2YXIgZmFjZXMgPSBuZXcgVWludDE2QXJyYXkoIFsgMCwgMSwgMiwgICAwLCAyLCAzIF0pO1xyXG5cdFxyXG5cdHRoaXMuYWRkQXR0cmlidXRlKCAnaW5kZXgnLCBuZXcgVEhSRUUuQnVmZmVyQXR0cmlidXRlKCBmYWNlcywgMSApICk7XHJcblx0dGhpcy5hZGRBdHRyaWJ1dGUoICdwb3NpdGlvbicsIG5ldyBUSFJFRS5CdWZmZXJBdHRyaWJ1dGUoIHZlcnRzLCAzICkgKTtcclxuXHR0aGlzLmFkZEF0dHJpYnV0ZSggJ25vcm1hbCcsIG5ldyBUSFJFRS5CdWZmZXJBdHRyaWJ1dGUoIG5vcm1zLCAzICkgKTtcclxuXHR0aGlzLmFkZEF0dHJpYnV0ZSggJ3V2JywgbmV3IFRIUkVFLkJ1ZmZlckF0dHJpYnV0ZSggdXZzLCAyICkgKTtcclxuXHRcclxufVxyXG5pbmhlcml0cyhDaGFyYWN0ZXJQbGFuZUdlb21ldHJ5LCBUSFJFRS5CdWZmZXJHZW9tZXRyeSk7XHJcblxyXG5cclxuXHJcblxyXG52YXIgVkVSVF9TSEFERVIgPSBbXHJcblx0Ly8gJ3VuaWZvcm0gbWF0NCBtb2RlbFZpZXdNYXRyaXg7JyxcclxuXHQvLyAndW5pZm9ybSBtYXQ0IHByb2plY3Rpb25NYXRyaXg7JyxcclxuXHQndW5pZm9ybSBmbG9hdCByb3RhdGlvbjsnLFxyXG5cdCd1bmlmb3JtIHZlYzIgc2NhbGU7JyxcclxuXHQndW5pZm9ybSB2ZWMyIHV2T2Zmc2V0OycsXHJcblx0J3VuaWZvcm0gdmVjMiB1dlNjYWxlOycsXHJcblxyXG5cdC8vICdhdHRyaWJ1dGUgdmVjMiBwb3NpdGlvbjsnLFxyXG5cdC8vICdhdHRyaWJ1dGUgdmVjMiB1djsnLFxyXG5cclxuXHQndmFyeWluZyB2ZWMyIHZVVjsnLFxyXG5cclxuXHQndm9pZCBtYWluKCkgeycsXHJcblxyXG5cdFx0J3ZVViA9IHV2T2Zmc2V0ICsgdXYgKiB1dlNjYWxlOycsXHJcblxyXG5cdFx0J3ZlYzIgYWxpZ25lZFBvc2l0aW9uID0gcG9zaXRpb24ueHkgKiBzY2FsZTsnLFxyXG5cclxuXHRcdCd2ZWMyIHJvdGF0ZWRQb3NpdGlvbjsnLFxyXG5cdFx0J3JvdGF0ZWRQb3NpdGlvbi54ID0gY29zKCByb3RhdGlvbiApICogYWxpZ25lZFBvc2l0aW9uLnggLSBzaW4oIHJvdGF0aW9uICkgKiBhbGlnbmVkUG9zaXRpb24ueTsnLFxyXG5cdFx0J3JvdGF0ZWRQb3NpdGlvbi55ID0gc2luKCByb3RhdGlvbiApICogYWxpZ25lZFBvc2l0aW9uLnggKyBjb3MoIHJvdGF0aW9uICkgKiBhbGlnbmVkUG9zaXRpb24ueTsnLFxyXG5cclxuXHRcdCd2ZWM0IGZpbmFsUG9zaXRpb247JyxcclxuXHJcblx0XHQnZmluYWxQb3NpdGlvbiA9IG1vZGVsVmlld01hdHJpeCAqIHZlYzQoIDAuMCwgMC4wLCAwLjAsIDEuMCApOycsXHJcblx0XHQnZmluYWxQb3NpdGlvbi54eSArPSByb3RhdGVkUG9zaXRpb247JyxcclxuXHRcdC8vICdmaW5hbFBvc2l0aW9uLnogKz0gcG9zaXRpb24uejsnLFxyXG5cdFx0J2ZpbmFsUG9zaXRpb24gPSBwcm9qZWN0aW9uTWF0cml4ICogZmluYWxQb3NpdGlvbjsnLFxyXG5cdFx0XHJcblx0XHQnZ2xfUG9zaXRpb24gPSBmaW5hbFBvc2l0aW9uOycsXHJcblxyXG5cdCd9J1xyXG5dLmpvaW4oICdcXG4nICk7XHJcblxyXG52YXIgRlJBR19TSEFERVIgPSBbXHJcblx0J3VuaWZvcm0gdmVjMyBjb2xvcjsnLFxyXG5cdCd1bmlmb3JtIHNhbXBsZXIyRCBtYXA7JyxcclxuXHQndW5pZm9ybSBmbG9hdCBvcGFjaXR5OycsXHJcblxyXG5cdCd1bmlmb3JtIHZlYzMgZm9nQ29sb3I7JyxcclxuXHQndW5pZm9ybSBmbG9hdCBmb2dEZW5zaXR5OycsXHJcblx0J3VuaWZvcm0gZmxvYXQgZm9nTmVhcjsnLFxyXG5cdCd1bmlmb3JtIGZsb2F0IGZvZ0ZhcjsnLFxyXG5cclxuXHQndmFyeWluZyB2ZWMyIHZVVjsnLFxyXG5cclxuXHQndm9pZCBtYWluKCkgeycsXHJcblxyXG5cdFx0J3ZlYzQgdGV4dHVyZSA9IHRleHR1cmUyRCggbWFwLCB2VVYgKTsnLFxyXG5cclxuXHRcdCcjaWZkZWYgQUxQSEFURVNUJyxcclxuXHRcdFx0J2lmICggdGV4dHVyZS5hIDwgQUxQSEFURVNUICkgZGlzY2FyZDsnLFxyXG5cdFx0JyNlbmRpZicsXHJcblxyXG5cdFx0J2dsX0ZyYWdDb2xvciA9IHZlYzQoIGNvbG9yICogdGV4dHVyZS54eXosIHRleHR1cmUuYSAqIG9wYWNpdHkgKTsnLFxyXG5cclxuXHRcdCcjaWZkZWYgVVNFX0ZPRycsXHJcblx0XHRcdCdmbG9hdCBkZXB0aCA9IGdsX0ZyYWdDb29yZC56IC8gZ2xfRnJhZ0Nvb3JkLnc7JyxcclxuXHRcdFx0J2Zsb2F0IGZvZ0ZhY3RvciA9IDAuMDsnLFxyXG5cdFx0XHRcclxuXHRcdFx0JyNpZm5kZWYgRk9HX0VYUDInLCAvL25vdGU6IE5PVCBkZWZpbmVkXHJcblx0XHRcdFxyXG5cdFx0XHRcdCdmb2dGYWN0b3IgPSBzbW9vdGhzdGVwKCBmb2dOZWFyLCBmb2dGYXIsIGRlcHRoICk7JyxcclxuXHRcdFx0XHRcclxuXHRcdFx0JyNlbHNlJyxcclxuXHRcdFx0XHJcblx0XHRcdFx0J2NvbnN0IGZsb2F0IExPRzIgPSAxLjQ0MjY5NTsnLFxyXG5cdFx0XHRcdCdmbG9hdCBmb2dGYWN0b3IgPSBleHAyKCAtIGZvZ0RlbnNpdHkgKiBmb2dEZW5zaXR5ICogZGVwdGggKiBkZXB0aCAqIExPRzIgKTsnLFxyXG5cdFx0XHRcdCdmb2dGYWN0b3IgPSAxLjAgLSBjbGFtcCggZm9nRmFjdG9yLCAwLjAsIDEuMCApOycsXHJcblxyXG5cdFx0XHQnI2VuZGlmJyxcclxuXHRcdFx0XHJcblx0XHRcdCdnbF9GcmFnQ29sb3IgPSBtaXgoIGdsX0ZyYWdDb2xvciwgdmVjNCggZm9nQ29sb3IsIGdsX0ZyYWdDb2xvci53ICksIGZvZ0ZhY3RvciApOycsXHJcblxyXG5cdFx0JyNlbmRpZicsXHJcblxyXG5cdCd9J1xyXG5dLmpvaW4oICdcXG4nIClcclxuXHJcblxyXG5cclxuXHJcbi8qXHJcbnZhciBpbmRpY2VzID0gbmV3IFVpbnQxNkFycmF5KCBbIDAsIDEsIDIsICAwLCAyLCAzIF0gKTtcclxudmFyIHZlcnRpY2VzID0gbmV3IEZsb2F0MzJBcnJheSggWyAtIDAuNSwgLSAwLjUsIDAsICAgMC41LCAtIDAuNSwgMCwgICAwLjUsIDAuNSwgMCwgICAtIDAuNSwgMC41LCAwIF0gKTtcclxudmFyIHV2cyA9IG5ldyBGbG9hdDMyQXJyYXkoIFsgMCwgMCwgICAxLCAwLCAgIDEsIDEsICAgMCwgMSBdICk7XHJcblxyXG52YXIgZ2VvbWV0cnkgPSBuZXcgVEhSRUUuQnVmZmVyR2VvbWV0cnkoKTtcclxuZ2VvbWV0cnkuYWRkQXR0cmlidXRlKCAnaW5kZXgnLCBuZXcgVEhSRUUuQnVmZmVyQXR0cmlidXRlKCBpbmRpY2VzLCAxICkgKTtcclxuZ2VvbWV0cnkuYWRkQXR0cmlidXRlKCAncG9zaXRpb24nLCBuZXcgVEhSRUUuQnVmZmVyQXR0cmlidXRlKCB2ZXJ0aWNlcywgMyApICk7XHJcbmdlb21ldHJ5LmFkZEF0dHJpYnV0ZSggJ3V2JywgbmV3IFRIUkVFLkJ1ZmZlckF0dHJpYnV0ZSggdXZzLCAyICkgKTtcclxuXHJcblxyXG5mdW5jdGlvbiBTcHJpdGVDaGFyYWN0ZXIobWF0ZXJpYWwpIHtcclxuXHRUSFJFRS5PYmplY3QzRC5jYWxsKCB0aGlzICk7XHJcblxyXG5cdHRoaXMudHlwZSA9ICdTcHJpdGVDaGFyYWN0ZXInO1xyXG5cclxuXHR0aGlzLmdlb21ldHJ5ID0gZ2VvbWV0cnk7XHJcblx0dGhpcy5tYXRlcmlhbCA9ICggbWF0ZXJpYWwgIT09IHVuZGVmaW5lZCApID8gbWF0ZXJpYWwgOiBuZXcgVEhSRUUuU3ByaXRlTWF0ZXJpYWwoKTtcclxuXHJcbn1cclxuXHJcblNwcml0ZUNoYXJhY3Rlci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKCBUSFJFRS5PYmplY3QzRC5wcm90b3R5cGUgKTtcclxuXHJcblNwcml0ZUNoYXJhY3Rlci5wcm90b3R5cGUucmF5Y2FzdCA9ICggZnVuY3Rpb24gKCkge1xyXG5cdHZhciBtYXRyaXhQb3NpdGlvbiA9IG5ldyBUSFJFRS5WZWN0b3IzKCk7XHJcblxyXG5cdHJldHVybiBmdW5jdGlvbiAoIHJheWNhc3RlciwgaW50ZXJzZWN0cyApIHtcclxuXHRcdG1hdHJpeFBvc2l0aW9uLnNldEZyb21NYXRyaXhQb3NpdGlvbiggdGhpcy5tYXRyaXhXb3JsZCApO1xyXG5cclxuXHRcdHZhciBkaXN0YW5jZSA9IHJheWNhc3Rlci5yYXkuZGlzdGFuY2VUb1BvaW50KCBtYXRyaXhQb3NpdGlvbiApO1xyXG5cdFx0aWYgKCBkaXN0YW5jZSA+IHRoaXMuc2NhbGUueCApIHJldHVybjtcclxuXHJcblx0XHRpbnRlcnNlY3RzLnB1c2goIHtcclxuXHRcdFx0ZGlzdGFuY2U6IGRpc3RhbmNlLFxyXG5cdFx0XHRwb2ludDogdGhpcy5wb3NpdGlvbixcclxuXHRcdFx0ZmFjZTogbnVsbCxcclxuXHRcdFx0b2JqZWN0OiB0aGlzXHJcblx0XHR9ICk7XHJcblx0fTtcclxufSgpICk7XHJcblxyXG5cclxuU3ByaXRlQ2hhcmFjdGVyLnByb3RvdHlwZS5jbG9uZSA9IGZ1bmN0aW9uICggb2JqZWN0ICkge1xyXG5cdGlmICggb2JqZWN0ID09PSB1bmRlZmluZWQgKSBcclxuXHRcdG9iamVjdCA9IG5ldyBTcHJpdGVDaGFyYWN0ZXIoIHRoaXMubWF0ZXJpYWwgKTtcclxuXHRUSFJFRS5PYmplY3QzRC5wcm90b3R5cGUuY2xvbmUuY2FsbCggdGhpcywgb2JqZWN0ICk7XHJcblx0cmV0dXJuIG9iamVjdDtcclxuXHJcbn07Ki8iLCIvLyBhY3Rvcl9hbmltYXRpb25zLmpzXHJcbi8vIEEgc3VibW9kdWxlIGZvciB0aGUgQWN0b3IgZXZlbnQgY2xhc3MgdGhhdCBkZWFscyB3aXRoIGFuaW1hdGlvbnNcclxuXHJcbnZhciBleHRlbmQgPSByZXF1aXJlKFwiZXh0ZW5kXCIpO1xyXG5cclxuZnVuY3Rpb24gZ2V0U3ByaXRlRm9ybWF0KHN0cikge1xyXG5cdHZhciBmb3JtYXQgPSBzdHIuc3BsaXQoXCItXCIpO1xyXG5cdHZhciBuYW1lID0gZm9ybWF0WzBdO1xyXG5cdHZhciBzaXplID0gZm9ybWF0WzFdLnNwbGl0KFwieFwiKTtcclxuXHRzaXplWzFdID0gc2l6ZVsxXSB8fCBzaXplWzBdO1xyXG5cdFxyXG5cdHZhciBiYXNlID0ge1xyXG5cdFx0d2lkdGg6IHNpemVbMF0sIGhlaWdodDogc2l6ZVsxXSwgZmxpcDogZmFsc2UsIFxyXG5cdFx0Ly9yZXBlYXR4OiAwLjI1LCByZXBlYXR5OiAwLjI1LFxyXG5cdFx0ZnJhbWVzOiB7XHJcblx0XHRcdFwidTNcIjogXCJ1MFwiLCBcImQzXCI6IFwiZDBcIiwgXCJsM1wiOiBcImwwXCIsIFwicjNcIjogXCJyMFwiLFxyXG5cdFx0fSxcclxuXHRcdGFuaW1zIDogZ2V0U3RhbmRhcmRBbmltYXRpb25zKCksXHJcblx0fTtcclxuXHRcclxuXHRzd2l0Y2ggKG5hbWUpIHtcclxuXHRcdGNhc2UgXCJwdF9ob3J6cm93XCI6IFxyXG5cdFx0XHRyZXR1cm4gZXh0ZW5kKHRydWUsIGJhc2UsIHsgXHJcblx0XHRcdFx0ZnJhbWVzOiB7XHJcblx0XHRcdFx0XHRcInUwXCI6IFsxLCAwXSwgXCJ1MVwiOiBbMSwgMV0sIFwidTJcIjogWzEsIDJdLFxyXG5cdFx0XHRcdFx0XCJkMFwiOiBbMCwgMF0sIFwiZDFcIjogWzAsIDFdLCBcImQyXCI6IFswLCAyXSxcclxuXHRcdFx0XHRcdFwibDBcIjogWzIsIDBdLCBcImwxXCI6IFsyLCAxXSwgXCJsMlwiOiBbMiwgMl0sXHJcblx0XHRcdFx0XHRcInIwXCI6IFszLCAwXSwgXCJyMVwiOiBbMywgMV0sIFwicjJcIjogWzMsIDJdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH0pO1xyXG5cdFx0Y2FzZSBcInB0X3ZlcnRjb2xcIjogXHJcblx0XHRcdHJldHVybiBleHRlbmQodHJ1ZSwgYmFzZSwgeyBcclxuXHRcdFx0XHRmcmFtZXM6IHtcclxuXHRcdFx0XHRcdFwidTBcIjogWzAsIDFdLCBcInUxXCI6IFsxLCAxXSwgXCJ1MlwiOiBbMiwgMV0sXHJcblx0XHRcdFx0XHRcImQwXCI6IFswLCAwXSwgXCJkMVwiOiBbMSwgMF0sIFwiZDJcIjogWzIsIDBdLFxyXG5cdFx0XHRcdFx0XCJsMFwiOiBbMCwgMl0sIFwibDFcIjogWzEsIDJdLCBcImwyXCI6IFsyLCAyXSxcclxuXHRcdFx0XHRcdFwicjBcIjogWzAsIDNdLCBcInIxXCI6IFsxLCAzXSwgXCJyMlwiOiBbMiwgM10sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fSk7XHJcblx0XHRjYXNlIFwiaGdfdmVydG1peFwiOiBcclxuXHRcdFx0cmV0dXJuIGV4dGVuZCh0cnVlLCBiYXNlLCB7IFxyXG5cdFx0XHRcdGZyYW1lczoge1xyXG5cdFx0XHRcdFx0XCJ1MFwiOiBbMCwgMF0sIFwidTFcIjogWzEsIDNdLCBcInUyXCI6IFsyLCAwXSxcclxuXHRcdFx0XHRcdFwiZDBcIjogWzIsIDFdLCBcImQxXCI6IFsyLCAyXSwgXCJkMlwiOiBbMiwgM10sXHJcblx0XHRcdFx0XHRcImwwXCI6IFswLCAyXSwgXCJsMVwiOiBbMCwgMV0sIFwibDJcIjogWzAsIDNdLFxyXG5cdFx0XHRcdFx0XCJyMFwiOiBbMSwgMF0sIFwicjFcIjogWzEsIDFdLCBcInIyXCI6IFsxLCAyXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9KTtcclxuXHRcdGNhc2UgXCJoZ19wb2tlcm93XCI6XHJcblx0XHRcdHJldHVybiBleHRlbmQodHJ1ZSwgYmFzZSwgeyBcclxuXHRcdFx0XHRmcmFtZXM6IHsgLy8gcG9pbnRlcnMgdG8gYW5vdGhlciBpbWFnZSBpbmRpY2F0ZXMgdGhhdCBpbWFnZSBzaG91bGQgYmUgZmxpcHBlZCwgaWYgZmxpcD10cnVlXHJcblx0XHRcdFx0XHRcInUwXCI6IG51bGwsIFwidTFcIjogWzAsIDBdLCBcInUyXCI6IFsxLCAwXSxcclxuXHRcdFx0XHRcdFwiZDBcIjogbnVsbCwgXCJkMVwiOiBbMCwgMV0sIFwiZDJcIjogWzEsIDFdLFxyXG5cdFx0XHRcdFx0XCJsMFwiOiBudWxsLCBcImwxXCI6IFswLCAyXSwgXCJsMlwiOiBbMSwgMl0sXHJcblx0XHRcdFx0XHRcInIwXCI6IG51bGwsIFwicjFcIjogWzAsIDNdLCBcInIyXCI6IFsxLCAzXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdGFuaW1zOiBnZXRQb2tlbW9uQW5pbWF0aW9ucygpLFxyXG5cdFx0XHR9KTtcclxuXHRcdGNhc2UgXCJoZ19wb2tlY29sXCI6XHJcblx0XHRcdHJldHVybiBleHRlbmQodHJ1ZSwgYmFzZSwgeyBcclxuXHRcdFx0XHRmcmFtZXM6IHsgLy8gcG9pbnRlcnMgdG8gYW5vdGhlciBpbWFnZSBpbmRpY2F0ZXMgdGhhdCBpbWFnZSBzaG91bGQgYmUgZmxpcHBlZCwgaWYgZmxpcD10cnVlXHJcblx0XHRcdFx0XHRcInUwXCI6IG51bGwsIFwidTFcIjogWzAsIDBdLCBcInUyXCI6IFswLCAxXSxcclxuXHRcdFx0XHRcdFwiZDBcIjogbnVsbCwgXCJkMVwiOiBbMCwgMl0sIFwiZDJcIjogWzAsIDNdLFxyXG5cdFx0XHRcdFx0XCJsMFwiOiBudWxsLCBcImwxXCI6IFsxLCAwXSwgXCJsMlwiOiBbMSwgMV0sXHJcblx0XHRcdFx0XHRcInIwXCI6IG51bGwsIFwicjFcIjogWzEsIDJdLCBcInIyXCI6IFsxLCAzXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdGFuaW1zOiBnZXRQb2tlbW9uQW5pbWF0aW9ucygpLFxyXG5cdFx0XHR9KTtcclxuXHRcdGNhc2UgXCJoZ19wb2tlX2hvcnpjb2xcIjpcclxuXHRcdFx0cmV0dXJuIGV4dGVuZCh0cnVlLCBiYXNlLCB7IFxyXG5cdFx0XHRcdGZyYW1lczogeyAvLyBwb2ludGVycyB0byBhbm90aGVyIGltYWdlIGluZGljYXRlcyB0aGF0IGltYWdlIHNob3VsZCBiZSBmbGlwcGVkLCBpZiBmbGlwPXRydWVcclxuXHRcdFx0XHRcdFwidTBcIjogbnVsbCwgXCJ1MVwiOiBbMSwgMF0sIFwidTJcIjogWzEsIDFdLFxyXG5cdFx0XHRcdFx0XCJkMFwiOiBudWxsLCBcImQxXCI6IFswLCAwXSwgXCJkMlwiOiBbMCwgMV0sXHJcblx0XHRcdFx0XHRcImwwXCI6IG51bGwsIFwibDFcIjogWzIsIDBdLCBcImwyXCI6IFsyLCAxXSxcclxuXHRcdFx0XHRcdFwicjBcIjogbnVsbCwgXCJyMVwiOiBbMywgMF0sIFwicjJcIjogWzMsIDFdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0YW5pbXM6IGdldFBva2Vtb25BbmltYXRpb25zKCksXHJcblx0XHRcdH0pO1xyXG5cdFx0Y2FzZSBcImhnX3Bva2VmbGlwXCI6XHJcblx0XHRcdHJldHVybiBleHRlbmQodHJ1ZSwgYmFzZSwgeyBcclxuXHRcdFx0XHRmcmFtZXM6IHsgLy8gcG9pbnRlcnMgdG8gYW5vdGhlciBpbWFnZSBpbmRpY2F0ZXMgdGhhdCBpbWFnZSBzaG91bGQgYmUgZmxpcHBlZCwgaWYgZmxpcD10cnVlXHJcblx0XHRcdFx0XHRcInUwXCI6IG51bGwsIFwidTFcIjogWzAsIDBdLCBcInUyXCI6IFsxLCAwXSxcclxuXHRcdFx0XHRcdFwiZDBcIjogbnVsbCwgXCJkMVwiOiBbMCwgMV0sIFwiZDJcIjogWzEsIDFdLFxyXG5cdFx0XHRcdFx0XCJsMFwiOiBudWxsLCBcImwxXCI6IFswLCAyXSwgXCJsMlwiOiBbMSwgMl0sXHJcblx0XHRcdFx0XHRcInIwXCI6IG51bGwsIFwicjFcIjogXCJsMVwiLCAgIFwicjJcIjogXCJsMlwiLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0YW5pbXM6IGdldFBva2Vtb25BbmltYXRpb25zKCksXHJcblx0XHRcdH0pO1xyXG5cdFx0Y2FzZSBcImJ3X3ZlcnRyb3dcIjpcclxuXHRcdFx0cmV0dXJuIGV4dGVuZCh0cnVlLCBiYXNlLCB7IFxyXG5cdFx0XHRcdGZyYW1lczoge1xyXG5cdFx0XHRcdFx0XCJ1MFwiOiBbMCwgMF0sIFwidTFcIjogWzEsIDBdLCBcInUyXCI6IFsyLCAwXSxcclxuXHRcdFx0XHRcdFwiZDBcIjogWzAsIDFdLCBcImQxXCI6IFsxLCAxXSwgXCJkMlwiOiBbMiwgMV0sXHJcblx0XHRcdFx0XHRcImwwXCI6IFswLCAyXSwgXCJsMVwiOiBbMSwgMl0sIFwibDJcIjogWzIsIDJdLFxyXG5cdFx0XHRcdFx0XCJyMFwiOiBbMCwgM10sIFwicjFcIjogWzEsIDNdLCBcInIyXCI6IFsyLCAzXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9KTtcclxuXHRcdGNhc2UgXCJid19ob3J6ZmxpcFwiOlxyXG5cdFx0XHRyZXR1cm4gZXh0ZW5kKHRydWUsIGJhc2UsIHsgXHJcblx0XHRcdFx0ZnJhbWVzOiB7IC8vIHBvaW50ZXJzIHRvIGFub3RoZXIgaW1hZ2UgaW5kaWNhdGVzIHRoYXQgaW1hZ2Ugc2hvdWxkIGJlIGZsaXBwZWQsIGlmIGZsaXA9dHJ1ZVxyXG5cdFx0XHRcdFx0XCJ1MFwiOiBbMCwgMF0sIFwidTFcIjogWzEsIDBdLCBcInUyXCI6IFwidTFcIixcclxuXHRcdFx0XHRcdFwiZDBcIjogWzIsIDBdLCBcImQxXCI6IFszLCAwXSwgXCJkMlwiOiBcImQxXCIsXHJcblx0XHRcdFx0XHRcImwwXCI6IFswLCAxXSwgXCJsMVwiOiBbMSwgMV0sIFwibDJcIjogWzIsIDFdLFxyXG5cdFx0XHRcdFx0XCJyMFwiOiBcImwwXCIsICAgXCJyMVwiOiBcImwxXCIsICAgXCJyMlwiOiBcImwyXCIsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fSk7XHJcblx0XHRkZWZhdWx0OlxyXG5cdFx0XHRjb25zb2xlLmVycm9yKFwiTm8gc3VjaCBTcHJpdGUgRm9ybWF0OlwiLCBuYW1lKTtcclxuXHRcdFx0cmV0dXJuIHt9O1xyXG5cdH1cclxufVxyXG5tb2R1bGUuZXhwb3J0cy5nZXRTcHJpdGVGb3JtYXQgPSBnZXRTcHJpdGVGb3JtYXQ7XHJcblxyXG5cclxuZnVuY3Rpb24gZ2V0U3RhbmRhcmRBbmltYXRpb25zKCkge1xyXG5cdHZhciBhbmltcyA9IHt9O1xyXG5cdFxyXG5cdGFuaW1zW1wic3RhbmRcIl0gPSBuZXcgU3ByaXRlQW5pbWF0aW9uKHsgc2luZ2xlRnJhbWU6IHRydWUsIH0sIFtcclxuXHRcdHsgdTogXCJ1MFwiLCBkOiBcImQwXCIsIGw6IFwibDBcIiwgcjogXCJyMFwiLCB0cmFuczogdHJ1ZSwgcGF1c2U6IHRydWUsIH0sXHJcblx0XSk7XHJcblx0YW5pbXNbXCJ3YWxrXCJdID0gbmV3IFNwcml0ZUFuaW1hdGlvbih7IGZyYW1lTGVuZ3RoOiA1LCBrZWVwRnJhbWU6IHRydWUsIH0sIFtcclxuXHRcdHsgdTogXCJ1MVwiLCBkOiBcImQxXCIsIGw6IFwibDFcIiwgcjogXCJyMVwiLCB9LFxyXG5cdFx0eyB1OiBcInUzXCIsIGQ6IFwiZDNcIiwgbDogXCJsM1wiLCByOiBcInIzXCIsIHRyYW5zOiB0cnVlLCB9LFxyXG5cdFx0eyB1OiBcInUyXCIsIGQ6IFwiZDJcIiwgbDogXCJsMlwiLCByOiBcInIyXCIsIH0sXHJcblx0XHR7IHU6IFwidTNcIiwgZDogXCJkM1wiLCBsOiBcImwzXCIsIHI6IFwicjNcIiwgdHJhbnM6IHRydWUsIGxvb3BUbzogMCwgfSxcclxuXHRdKTtcclxuXHRhbmltc1tcImJ1bXBcIl0gPSBuZXcgU3ByaXRlQW5pbWF0aW9uKHsgZnJhbWVMZW5ndGg6IDEwLCBrZWVwRnJhbWU6IHRydWUsIH0sIFtcclxuXHRcdHsgdTogXCJ1MVwiLCBkOiBcImQxXCIsIGw6IFwibDFcIiwgcjogXCJyMVwiLCBzZng6IFwid2Fsa19idW1wXCIsIH0sXHJcblx0XHR7IHU6IFwidTBcIiwgZDogXCJkMFwiLCBsOiBcImwwXCIsIHI6IFwicjBcIiwgdHJhbnM6IHRydWUsIH0sXHJcblx0XHR7IHU6IFwidTJcIiwgZDogXCJkMlwiLCBsOiBcImwyXCIsIHI6IFwicjJcIiwgc2Z4OiBcIndhbGtfYnVtcFwiLCB9LFxyXG5cdFx0eyB1OiBcInUwXCIsIGQ6IFwiZDBcIiwgbDogXCJsMFwiLCByOiBcInIwXCIsIHRyYW5zOiB0cnVlLCBsb29wVG86IDAsIH0sXHJcblx0XSk7XHJcblx0YW5pbXNbXCJ3YXJwX2F3YXlcIl0gPSBuZXcgU3ByaXRlQW5pbWF0aW9uKHsgc2luZ2xlRGlyOiBcImRcIiB9LCBbXHJcblx0XHR7IGQ6IFwiZDBcIiwgZnJhbWVMZW5ndGg6IDgsIH0sIC8vMFxyXG5cdFx0eyBkOiBcImwwXCIsIGZyYW1lTGVuZ3RoOiA4LCB9LFxyXG5cdFx0eyBkOiBcInUwXCIsIGZyYW1lTGVuZ3RoOiA4LCB9LFxyXG5cdFx0eyBkOiBcInIwXCIsIGZyYW1lTGVuZ3RoOiA4LCB9LFxyXG5cdFx0eyBkOiBcImQwXCIsIGZyYW1lTGVuZ3RoOiA3LCB9LCAvLzRcclxuXHRcdHsgZDogXCJsMFwiLCBmcmFtZUxlbmd0aDogNywgfSxcclxuXHRcdHsgZDogXCJ1MFwiLCBmcmFtZUxlbmd0aDogNywgfSxcclxuXHRcdHsgZDogXCJyMFwiLCBmcmFtZUxlbmd0aDogNywgfSxcclxuXHRcdHsgZDogXCJkMFwiLCBmcmFtZUxlbmd0aDogNSwgfSwgLy84XHJcblx0XHR7IGQ6IFwibDBcIiwgZnJhbWVMZW5ndGg6IDUsIH0sXHJcblx0XHR7IGQ6IFwidTBcIiwgZnJhbWVMZW5ndGg6IDUsIH0sXHJcblx0XHR7IGQ6IFwicjBcIiwgZnJhbWVMZW5ndGg6IDUsIH0sXHJcblx0XHR7IGQ6IFwiZDBcIiwgZnJhbWVMZW5ndGg6IDMsIH0sIC8vMTJcclxuXHRcdHsgZDogXCJsMFwiLCBmcmFtZUxlbmd0aDogMywgfSxcclxuXHRcdHsgZDogXCJ1MFwiLCBmcmFtZUxlbmd0aDogMywgfSxcclxuXHRcdHsgZDogXCJyMFwiLCBmcmFtZUxlbmd0aDogMywgfSxcclxuXHRcdHsgZDogXCJkMFwiLCBmcmFtZUxlbmd0aDogMSwgfSwgLy8xNlxyXG5cdFx0eyBkOiBcImwwXCIsIGZyYW1lTGVuZ3RoOiAxLCB9LFxyXG5cdFx0eyBkOiBcInUwXCIsIGZyYW1lTGVuZ3RoOiAxLCB9LFxyXG5cdFx0eyBkOiBcInIwXCIsIGZyYW1lTGVuZ3RoOiAxLCB9LFxyXG5cdFx0eyBkOiBcImQwXCIsIGZyYW1lTGVuZ3RoOiAwLCB0cmFuczogdHJ1ZSwgfSwgLy8yMFxyXG5cdFx0eyBkOiBcImwwXCIsIGZyYW1lTGVuZ3RoOiAwLCB0cmFuczogdHJ1ZSwgfSxcclxuXHRcdHsgZDogXCJ1MFwiLCBmcmFtZUxlbmd0aDogMCwgdHJhbnM6IHRydWUsIH0sXHJcblx0XHR7IGQ6IFwicjBcIiwgZnJhbWVMZW5ndGg6IDAsIHRyYW5zOiB0cnVlLCBsb29wVG86IDIwIH0sXHJcblx0XSk7XHJcblx0YW5pbXNbXCJ3YXJwX2luXCJdID0gbmV3IFNwcml0ZUFuaW1hdGlvbih7IHNpbmdsZURpcjogXCJkXCIgfSwgW1xyXG5cdFx0eyBkOiBcImQwXCIsIGZyYW1lTGVuZ3RoOiAxLCB9LCAvLzBcclxuXHRcdHsgZDogXCJyMFwiLCBmcmFtZUxlbmd0aDogMSwgfSxcclxuXHRcdHsgZDogXCJ1MFwiLCBmcmFtZUxlbmd0aDogMSwgfSxcclxuXHRcdHsgZDogXCJsMFwiLCBmcmFtZUxlbmd0aDogMSwgfSxcclxuXHRcdHsgZDogXCJkMFwiLCBmcmFtZUxlbmd0aDogMywgfSwgLy80XHJcblx0XHR7IGQ6IFwicjBcIiwgZnJhbWVMZW5ndGg6IDMsIH0sXHJcblx0XHR7IGQ6IFwidTBcIiwgZnJhbWVMZW5ndGg6IDMsIH0sXHJcblx0XHR7IGQ6IFwibDBcIiwgZnJhbWVMZW5ndGg6IDMsIH0sXHJcblx0XHR7IGQ6IFwiZDBcIiwgZnJhbWVMZW5ndGg6IDUsIH0sIC8vOFxyXG5cdFx0eyBkOiBcInIwXCIsIGZyYW1lTGVuZ3RoOiA1LCB9LFxyXG5cdFx0eyBkOiBcInUwXCIsIGZyYW1lTGVuZ3RoOiA1LCB9LFxyXG5cdFx0eyBkOiBcImwwXCIsIGZyYW1lTGVuZ3RoOiA1LCB9LFxyXG5cdFx0eyBkOiBcImQwXCIsIGZyYW1lTGVuZ3RoOiA3LCB9LCAvLzEyXHJcblx0XHR7IGQ6IFwicjBcIiwgZnJhbWVMZW5ndGg6IDcsIH0sXHJcblx0XHR7IGQ6IFwidTBcIiwgZnJhbWVMZW5ndGg6IDcsIH0sXHJcblx0XHR7IGQ6IFwibDBcIiwgZnJhbWVMZW5ndGg6IDcsIH0sXHJcblx0XHR7IGQ6IFwiZDBcIiwgZnJhbWVMZW5ndGg6IDgsIH0sIC8vMTZcclxuXHRcdHsgZDogXCJyMFwiLCBmcmFtZUxlbmd0aDogOCwgfSxcclxuXHRcdHsgZDogXCJ1MFwiLCBmcmFtZUxlbmd0aDogOSwgfSxcclxuXHRcdHsgZDogXCJsMFwiLCBmcmFtZUxlbmd0aDogOSwgfSxcclxuXHRcdHsgZDogXCJkMFwiLCBmcmFtZUxlbmd0aDogMSwgfSxcclxuXHRdKTtcclxuXHRcclxuXHRyZXR1cm4gYW5pbXM7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldFBva2Vtb25BbmltYXRpb25zKCkgeyAvL092ZXJyaWRlcyBTdGFuZGFyZFxyXG5cdHZhciBhbmltcyA9IHt9O1xyXG5cdGFuaW1zW1wic3RhbmRcIl0gPSBuZXcgU3ByaXRlQW5pbWF0aW9uKHsgc2luZ2xlRnJhbWU6IHRydWUsIH0sIFtcclxuXHRcdHsgdTogXCJ1MVwiLCBkOiBcImQxXCIsIGw6IFwibDFcIiwgcjogXCJyMVwiLCB0cmFuczogdHJ1ZSwgcGF1c2U6IHRydWUsIH0sXHJcblx0XSk7XHJcblx0YW5pbXNbXCJfZmxhcF9zdGFuZFwiXSA9IG5ldyBTcHJpdGVBbmltYXRpb24oeyBmcmFtZUxlbmd0aDogNSwga2VlcEZyYW1lOiB0cnVlLCB9LCBbXHJcblx0XHR7IHU6IFwidTFcIiwgZDogXCJkMVwiLCBsOiBcImwxXCIsIHI6IFwicjFcIiwgdHJhbnM6IHRydWUsIH0sXHJcblx0XHR7IHU6IFwidTJcIiwgZDogXCJkMlwiLCBsOiBcImwyXCIsIHI6IFwicjJcIiwgbG9vcFRvOiAwLCB9LFxyXG5cdF0pO1xyXG5cdGFuaW1zW1wid2Fsa1wiXSA9IG5ldyBTcHJpdGVBbmltYXRpb24oeyBmcmFtZUxlbmd0aDogNSwga2VlcEZyYW1lOiB0cnVlLCB9LCBbXHJcblx0XHR7IHU6IFwidTFcIiwgZDogXCJkMVwiLCBsOiBcImwxXCIsIHI6IFwicjFcIiwgdHJhbnM6IHRydWUsIH0sXHJcblx0XHR7IHU6IFwidTJcIiwgZDogXCJkMlwiLCBsOiBcImwyXCIsIHI6IFwicjJcIiwgbG9vcFRvOiAwLCB9LFxyXG5cdF0pO1xyXG5cdHJldHVybiBhbmltcztcclxufVxyXG5cclxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHJcbmZ1bmN0aW9uIFNwcml0ZUFuaW1hdGlvbihvcHRzLCBmcmFtZXMpIHtcclxuXHR0aGlzLm9wdGlvbnMgPSBvcHRzO1xyXG5cdHRoaXMuZnJhbWVzID0gZnJhbWVzO1xyXG5cdFxyXG5cdHRoaXMud2FpdFRpbWUgPSB0aGlzLmZyYW1lc1t0aGlzLmN1cnJGcmFtZV0uZnJhbWVMZW5ndGggfHwgdGhpcy5vcHRpb25zLmZyYW1lTGVuZ3RoO1xyXG59XHJcblNwcml0ZUFuaW1hdGlvbi5wcm90b3R5cGUgPSB7XHJcblx0b3B0aW9uczogbnVsbCxcclxuXHRmcmFtZXMgOiBudWxsLFxyXG5cdFxyXG5cdHdhaXRUaW1lIDogMCxcclxuXHRjdXJyRnJhbWU6IDAsXHJcblx0c3BlZWQgOiAxLFxyXG5cdHBhdXNlZCA6IGZhbHNlLFxyXG5cdGZpbmlzaGVkOiBmYWxzZSxcclxuXHRcclxuXHRwYXJlbnQgOiBudWxsLFxyXG5cdFxyXG5cdC8qKiBBZHZhbmNlZCB0aGUgYW5pbWF0aW9uIGJ5IHRoZSBnaXZlbiBhbW91bnQgb2YgZGVsdGEgdGltZS4gKi9cclxuXHRhZHZhbmNlIDogZnVuY3Rpb24oZGVsdGFUaW1lKSB7XHJcblx0XHRpZiAodGhpcy5vcHRpb25zLnNpbmdsZUZyYW1lKSByZXR1cm47XHJcblx0XHRpZiAodGhpcy5wYXVzZWQpIHJldHVybjtcclxuXHRcdFxyXG5cdFx0aWYgKHRoaXMud2FpdFRpbWUgPiAwKSB7XHJcblx0XHRcdHRoaXMud2FpdFRpbWUgLT0gKHRoaXMuc3BlZWQgKiAoZGVsdGFUaW1lICogQ09ORklHLnNwZWVkLmFuaW1hdGlvbikpO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdHZhciBsb29wID0gdGhpcy5mcmFtZXNbdGhpcy5jdXJyRnJhbWVdLmxvb3BUbztcclxuXHRcdGlmIChsb29wICE9PSB1bmRlZmluZWQpIHRoaXMuY3VyckZyYW1lID0gbG9vcDtcclxuXHRcdGVsc2UgdGhpcy5jdXJyRnJhbWUrKztcclxuXHRcdFxyXG5cdFx0aWYgKHRoaXMuY3VyckZyYW1lID49IHRoaXMuZnJhbWVzLmxlbmd0aCkge1xyXG5cdFx0XHR0aGlzLmN1cnJGcmFtZSA9IHRoaXMuZnJhbWVzLmxlbmd0aC0xO1xyXG5cdFx0XHR0aGlzLnBhdXNlZCA9IHRydWU7XHJcblx0XHRcdHRoaXMuZmluaXNoZWQgPSB0cnVlO1xyXG5cdFx0XHRjb25zb2xlLndhcm4oXCJBbmltYXRpb24gaGFzIGNvbXBsZXRlZCFcIik7XHJcblx0XHRcdGlmICh0aGlzLnBhcmVudCkgdGhpcy5wYXJlbnQuZW1pdChcImFuaW0tZW5kXCIsIG51bGwpOyAvL1RPRE8gcHJvdmlkZSBhbmltIG5hbWVcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHQvL25ldyBmcmFtZVxyXG5cdFx0XHJcblx0XHR0aGlzLndhaXRUaW1lID0gdGhpcy5mcmFtZXNbdGhpcy5jdXJyRnJhbWVdLmZyYW1lTGVuZ3RoIHx8IHRoaXMub3B0aW9ucy5mcmFtZUxlbmd0aDtcclxuXHRcdFxyXG5cdFx0aWYgKHRoaXMuZnJhbWVzW3RoaXMuY3VyckZyYW1lXS5wYXVzZSkgdGhpcy5wYXVzZWQgPSB0cnVlO1xyXG5cdFx0XHJcblx0XHRpZiAodGhpcy5mcmFtZXNbdGhpcy5jdXJyRnJhbWVdLnNmeCkgXHJcblx0XHRcdFNvdW5kTWFuYWdlci5wbGF5U291bmQodGhpcy5mcmFtZXNbdGhpcy5jdXJyRnJhbWVdLnNmeCk7XHJcblx0fSxcclxuXHRcclxuXHQvKiogSWYgdGhpcyBhbmltYXRpb24gaXMgb24gYSBwYXVzZSBmcmFtZSAqL1xyXG5cdHJlc3VtZSA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0dGhpcy5wYXVzZWQgPSBmYWxzZTtcclxuXHR9LFxyXG5cdFxyXG5cdC8qKiBSZXNldCB0aGUgYW5pbWF0aW9uIHBhcmFtZXRlcnMuIENhbGxlZCB3aGVuIHRoaXMgYW5pbWF0aW9uIGlzIG5vIGxvbmdlciB1c2VkLiAqL1xyXG5cdHJlc2V0IDogZnVuY3Rpb24oKSB7XHJcblx0XHR0aGlzLnBhdXNlZCA9IGZhbHNlO1xyXG5cdFx0aWYgKHRoaXMub3B0aW9ucy5rZWVwRnJhbWUpIHtcclxuXHRcdFx0Ly8gaWYgKHNlbGYuY2FuVHJhbnNpdGlvbigpKSB7XHJcblx0XHRcdC8vIFx0dmFyIGxvb3AgPSB0aGlzLmZyYW1lc1t0aGlzLmN1cnJGcmFtZV0ubG9vcFRvO1xyXG5cdFx0XHQvLyBcdGlmIChsb29wICE9PSB1bmRlZmluZWQpIHRoaXMuY3VyckZyYW1lID0gbG9vcDtcclxuXHRcdFx0Ly8gXHRlbHNlIHRoaXMuY3VyckZyYW1lKys7XHJcblx0XHRcdFx0XHJcblx0XHRcdC8vIFx0dGhpcy53YWl0VGltZSA9IHRoaXMuZnJhbWVzW3RoaXMuY3VyckZyYW1lXS5mcmFtZUxlbmd0aCB8fCB0aGlzLm9wdGlvbnMuZnJhbWVMZW5ndGg7XHJcblx0XHRcdFx0XHJcblx0XHRcdC8vIFx0aWYgKHRoaXMuZnJhbWVzW3RoaXMuY3VyckZyYW1lXS5wYXVzZSkgdGhpcy5wYXVzZWQgPSB0cnVlO1xyXG5cdFx0XHQvLyB9XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHRcdHRoaXMuZmluaXNoZWQgPSBmYWxzZTtcclxuXHRcdHRoaXMuY3VyckZyYW1lID0gMDtcclxuXHRcdHRoaXMud2FpdFRpbWUgPSB0aGlzLmZyYW1lc1t0aGlzLmN1cnJGcmFtZV0uZnJhbWVMZW5ndGggfHwgdGhpcy5vcHRpb25zLmZyYW1lTGVuZ3RoO1xyXG5cdFx0dGhpcy5zcGVlZCA9IDE7XHJcblx0fSxcclxuXHRcclxuXHQvKiogSWYgdGhpcyBhbmltYXRpb24gaXMgb24gYSBmcmFtZSB0aGF0IGNhbiB0cmFuc2l0aW9uIHRvIGFub3RoZXIgYW5pbWF0aW9uLiAqL1xyXG5cdGNhblRyYW5zaXRpb24gOiBmdW5jdGlvbigpIHtcclxuXHRcdHJldHVybiB0aGlzLmZpbmlzaGVkIHx8IHRoaXMuZnJhbWVzW3RoaXMuY3VyckZyYW1lXS50cmFucztcclxuXHR9LFxyXG5cdFxyXG5cdC8qKiBSZXR1cm5zIHRoZSBuYW1lIG9mIHRoZSBmcmFtZSB0byBkaXNwbGF5IHRoaXMgZnJhbWUuICovXHJcblx0Z2V0RnJhbWVUb0Rpc3BsYXkgOiBmdW5jdGlvbihkaXIpIHtcclxuXHRcdGlmICh0aGlzLm9wdGlvbnMuc2luZ2xlRGlyKSBkaXIgPSB0aGlzLm9wdGlvbnMuc2luZ2xlRGlyO1xyXG5cdFx0cmV0dXJuIHRoaXMuZnJhbWVzW3RoaXMuY3VyckZyYW1lXVtkaXJdO1xyXG5cdH0sXHJcbn07XHJcbm1vZHVsZS5leHBvcnRzLlNwcml0ZUFuaW1hdGlvbiA9IFNwcml0ZUFuaW1hdGlvbjsiLCIvLyBhY3Rvci5qc1xyXG4vLyBEZWZpbmVzIHRoZSBhY3RvciBldmVudCB1c2VkIHRocm91Z2hvdXQgdGhlIHBhcmtcclxuXHJcbnZhciBFdmVudCA9IHJlcXVpcmUoXCJ0cHAtZXZlbnRcIik7XHJcbnZhciBpbmhlcml0cyA9IHJlcXVpcmUoXCJpbmhlcml0c1wiKTtcclxudmFyIGV4dGVuZCA9IHJlcXVpcmUoXCJleHRlbmRcIik7XHJcblxyXG52YXIgQ2hhcmFjdGVyU3ByaXRlID0gcmVxdWlyZShcIi4uL21vZGVsL3Nwcml0ZW1vZGVsLmpzXCIpLkNoYXJhY3RlclNwcml0ZTtcclxudmFyIGdldFNwcml0ZUZvcm1hdCA9IHJlcXVpcmUoXCJ0cHAtYWN0b3ItYW5pbWF0aW9uc1wiKS5nZXRTcHJpdGVGb3JtYXQ7XHJcblxyXG52YXIgR0xPQkFMX1NDQUxFVVAgPSAxLjY1O1xyXG52YXIgRVZFTlRfUExBTkVfTk9STUFMID0gbmV3IFRIUkVFLlZlY3RvcjMoMCwgMSwgMCk7XHJcbi8qKlxyXG4gKiBBbiBhY3RvciBpcyBhbnkgZXZlbnQgcmVwcmVzZW50aW5nIGEgcGVyc29uLCBwb2tlbW9uLCBvciBvdGhlciBlbnRpdHkgdGhhdFxyXG4gKiBtYXkgbW92ZSBhcm91bmQgaW4gdGhlIHdvcmxkIG9yIGZhY2UgYSBkaXJlY3Rpb24uIEFjdG9ycyBtYXkgaGF2ZSBkaWZmZXJlbnRcclxuICogYmVoYXZpb3JzLCBzb21lIGNvbW1vbiBvbmVzIHByZWRlZmluZWQgaW4gdGhpcyBmaWxlLlxyXG4gKi9cclxuZnVuY3Rpb24gQWN0b3IoYmFzZSwgb3B0cykge1xyXG5cdEV2ZW50LmNhbGwodGhpcywgYmFzZSwgb3B0cyk7XHJcblx0XHJcblx0dGhpcy5vbihcInRpY2tcIiwgdGhpcy5fYWN0b3JUaWNrKTtcclxuXHR0aGlzLm9uKFwiaW50ZXJhY3RlZFwiLCB0aGlzLl9hY3RvckludGVyYWN0RmFjZSk7XHJcblx0dGhpcy5vbihcImNhbnQtbW92ZVwiLCB0aGlzLl9hY3RvckJ1bXApO1xyXG5cdHRoaXMuZmFjaW5nID0gbmV3IFRIUkVFLlZlY3RvcjMoMCwgMCwgMSk7XHJcblx0XHJcblx0dGhpcy5faW5pdEJlaGF2aW9yU3RhY2soKTtcclxufVxyXG5pbmhlcml0cyhBY3RvciwgRXZlbnQpO1xyXG5leHRlbmQoQWN0b3IucHJvdG90eXBlLCB7XHJcblx0c3ByaXRlOiBudWxsLFxyXG5cdHNwcml0ZV9mb3JtYXQ6IG51bGwsXHJcblx0XHJcblx0c2hhZG93IDogdHJ1ZSxcclxuXHRcclxuXHQvLy8vLy8vLy8vLy8vLy8vIFByb3BlcnR5IFNldHRlcnMgLy8vLy8vLy8vLy8vLy8vLy9cclxuXHRzY2FsZTogMSxcclxuXHRcclxuXHRzZXRTY2FsZSA6IGZ1bmN0aW9uKHNjYWxlKSB7XHJcblx0XHR0aGlzLnNjYWxlID0gc2NhbGU7XHJcblx0XHRzY2FsZSAqPSBHTE9CQUxfU0NBTEVVUDtcclxuXHRcdHRoaXMuYXZhdGFyX3Nwcml0ZS5zY2FsZS5zZXQoc2NhbGUsIHNjYWxlLCBzY2FsZSk7XHJcblx0fSxcclxuXHRcclxuXHQvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLyBBdmF0YXIgLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cdGF2YXRhcl9ub2RlIDogbnVsbCxcclxuXHRhdmF0YXJfc3ByaXRlIDogbnVsbCxcclxuXHRhdmF0YXJfZm9ybWF0IDogbnVsbCxcclxuXHRhdmF0YXJfdGV4IDogbnVsbCxcclxuXHRcclxuXHRnZXRBdmF0YXIgOiBmdW5jdGlvbihtYXApeyBcclxuXHRcdGlmICh0aGlzLmF2YXRhcl9ub2RlKSByZXR1cm4gdGhpcy5hdmF0YXJfbm9kZTtcclxuXHRcdFxyXG5cdFx0dmFyIG5vZGUgPSB0aGlzLmF2YXRhcl9ub2RlID0gbmV3IFRIUkVFLk9iamVjdDNEKCk7XHJcblx0XHRcclxuXHRcdG5vZGUuYWRkKHRoaXMuX2F2YXRhcl9jcmVhdGVTcHJpdGUobWFwKSk7XHJcblx0XHRub2RlLmFkZCh0aGlzLl9hdmF0YXJfY3JlYXRlU2hhZG93Q2FzdGVyKG1hcCkpO1xyXG5cdFx0XHJcblx0XHRyZXR1cm4gbm9kZTtcclxuXHRcdFxyXG5cdH0sXHJcblx0XHJcblx0X2F2YXRhcl9jcmVhdGVTaGFkb3dDYXN0ZXI6IGZ1bmN0aW9uKG1hcCkge1xyXG5cdFx0dmFyIG1hdCA9IG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCgpO1xyXG5cdFx0bWF0LnZpc2libGUgPSBmYWxzZTsgLy9UaGUgb2JqZWN0IHdvbid0IHJlbmRlciwgYnV0IHRoZSBzaGFkb3cgc3RpbGwgd2lsbFxyXG5cdFx0bWFwLmdjLmNvbGxlY3QobWF0KTtcclxuXHRcdFxyXG5cdFx0dmFyIGdlb20gPSBuZXcgVEhSRUUuU3BoZXJlR2VvbWV0cnkoMC4zLCA3LCAzKTtcclxuXHRcdG1hcC5nYy5jb2xsZWN0KGdlb20pO1xyXG5cdFx0XHJcblx0XHR2YXIgbWVzaCA9IG5ldyBUSFJFRS5NZXNoKGdlb20sIG1hdCk7XHJcblx0XHQvL21lc2gudmlzaWJsZSA9IGZhbHNlOyAvLz9cclxuXHRcdG1lc2guY2FzdFNoYWRvdyA9IHRydWU7XHJcblx0XHRtZXNoLnBvc2l0aW9uLnNldCgwLCAwLjUsIDApO1xyXG5cdFx0cmV0dXJuIG1lc2g7XHJcblx0fSxcclxuXHRcclxuXHRfYXZhdGFyX2NyZWF0ZVNwcml0ZSA6IGZ1bmN0aW9uKG1hcCkge1xyXG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xyXG5cdFx0dmFyIGltZyA9IG5ldyBJbWFnZSgpO1xyXG5cdFx0dmFyIHRleHR1cmUgPSBzZWxmLmF2YXRhcl90ZXggPSBuZXcgVEhSRUUuVGV4dHVyZShpbWcpO1xyXG5cdFx0bWFwLmdjLmNvbGxlY3QodGV4dHVyZSk7XHJcblx0XHRcclxuXHRcdC8vIE5vdGU6IG5vdCB1c2VpbmcgXCJ0aGlzLmdldFNwcml0ZUZvcm1hdFwiLCBiZWNhdXNlIHRoZSBkZWZhaWx0IHNwcml0ZVxyXG5cdFx0Ly8gZm9ybWF0IHNob3VsZCBub3QgYmUgb3ZlcmlkZGVuLlxyXG5cdFx0dmFyIHNwZm9ybWF0ID0gZ2V0U3ByaXRlRm9ybWF0KERFRl9TUFJJVEVfRk9STUFUKTtcclxuXHRcdFxyXG5cdFx0dGhpcy5fX29uTG9hZFNwcml0ZShpbWcsIHNwZm9ybWF0LCB0ZXh0dXJlKTtcclxuXHRcdGltZy5zcmMgPSBERUZfU1BSSVRFO1xyXG5cdFx0XHJcblx0XHR0ZXh0dXJlLm1hZ0ZpbHRlciA9IFRIUkVFLk5lYXJlc3RGaWx0ZXI7XHJcblx0XHR0ZXh0dXJlLm1pbkZpbHRlciA9IFRIUkVFLk5lYXJlc3RGaWx0ZXI7XHJcblx0XHR0ZXh0dXJlLnJlcGVhdCA9IG5ldyBUSFJFRS5WZWN0b3IyKDAuMjUsIDAuMjUpO1xyXG5cdFx0dGV4dHVyZS5vZmZzZXQgPSBuZXcgVEhSRUUuVmVjdG9yMigwLCAwKTtcclxuXHRcdHRleHR1cmUud3JhcFMgPSBUSFJFRS5NaXJyb3JlZFJlcGVhdFdyYXBwaW5nO1xyXG5cdFx0dGV4dHVyZS53cmFwVCA9IFRIUkVFLk1pcnJvcmVkUmVwZWF0V3JhcHBpbmc7XHJcblx0XHR0ZXh0dXJlLmdlbmVyYXRlTWlwbWFwcyA9IGZhbHNlOyAvL01pcG1hcHMgZ2VuZXJhdGUgdW5kZXNpcmFibGUgdHJhbnNwYXJlbmN5IGFydGlmYWN0c1xyXG5cdFx0Ly9UT0RPIE1pcnJvcmVkUmVwZWF0V3JhcHBpbmcsIGFuZCBqdXN0IHVzZSBhIG5lZ2F0aXZlIHggdXYgdmFsdWUsIHRvIGZsaXAgYSBzcHJpdGVcclxuXHRcdFxyXG5cdFx0c2VsZi5hdmF0YXJfZm9ybWF0ID0gc3Bmb3JtYXQ7XHJcblx0XHRcclxuXHRcdC8vIHZhciBtYXQgLyo9IHNlbGYuYXZhdGFyX21hdCovID0gbmV3IFRIUkVFLlNwcml0ZU1hdGVyaWFsKHtcclxuXHRcdC8vIFx0bWFwOiB0ZXh0dXJlLFxyXG5cdFx0Ly8gXHRjb2xvcjogMHhGRkZGRkYsXHJcblx0XHQvLyBcdHRyYW5zcGFyZW50OiB0cnVlLFxyXG5cdFx0Ly8gfSk7XHJcblx0XHRcclxuXHRcdGN1cnJlbnRNYXAubWFya0xvYWRpbmcoKTtcclxuXHRcdHRoaXMuX2F2YXRhcl9sb2FkU3ByaXRlKG1hcCwgdGV4dHVyZSk7XHJcblx0XHRcclxuXHRcdC8vdmFyIHNwcml0ZSA9IHNlbGYuYXZhdGFyX3Nwcml0ZSA9IG5ldyBUSFJFRS5TcHJpdGUobWF0KTtcclxuXHRcdHZhciBzcHJpdGUgPSBzZWxmLmF2YXRhcl9zcHJpdGUgPSBuZXcgQ2hhcmFjdGVyU3ByaXRlKHtcclxuXHRcdFx0bWFwOiB0ZXh0dXJlLFxyXG5cdFx0XHRjb2xvcjogMHhGRkZGRkYsXHJcblx0XHRcdG9mZnNldDogbmV3IFRIUkVFLlZlY3RvcjMoMCwgMC4zLCAwLjIyKSxcclxuXHRcdFx0Z2M6IG1hcC5nYyxcclxuXHRcdH0pO1xyXG5cdFx0c2VsZi5zZXRTY2FsZShzZWxmLnNjYWxlKTtcclxuXHRcdFxyXG5cdFx0cmV0dXJuIHNwcml0ZTtcclxuXHR9LFxyXG5cdFxyXG5cdF9hdmF0YXJfbG9hZFNwcml0ZSA6IGZ1bmN0aW9uKG1hcCwgdGV4dHVyZSkge1xyXG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xyXG5cdFx0bWFwLmxvYWRTcHJpdGUoc2VsZi5pZCwgc2VsZi5zcHJpdGUsIGZ1bmN0aW9uKGVyciwgdXJsKXtcclxuXHRcdFx0aWYgKGVycikge1xyXG5cdFx0XHRcdGNvbnNvbGUuZXJyb3IoXCJFUlJPUiBMT0FESU5HIFNQUklURTogXCIsIGVycik7XHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHR2YXIgaW1nID0gbmV3IEltYWdlKCk7XHJcblx0XHRcdHZhciBmb3JtYXQgPSBzZWxmLnNwcml0ZV9mb3JtYXQ7XHJcblx0XHRcdGlmICh0eXBlb2YgZm9ybWF0ID09IFwiZnVuY3Rpb25cIikgXHJcblx0XHRcdFx0Zm9ybWF0ID0gc2VsZi5zcHJpdGVfZm9ybWF0KHNlbGYuc3ByaXRlKTtcclxuXHRcdFx0aWYgKHR5cGVvZiBmb3JtYXQgIT0gXCJzdHJpbmdcIikge1xyXG5cdFx0XHRcdGNvbnNvbGUuZXJyb3IoXCJJTlZBTElEIFNQUklURSBGT1JNQVQhICdzcHJpdGVfZm9ybWF0JyBtdXN0IGJlIGEgc3RyaW5nIG9yIGEgXCIrXHJcblx0XHRcdFx0XHRcImZ1bmN0aW9uIHRoYXQgcmV0dXJucyBhIHN0cmluZyEgVG8gcHJvdmlkZSBhIGN1c3RvbSBmb3JtYXQsIG92ZXJyaWRlIFwiK1xyXG5cdFx0XHRcdFx0XCJnZXRTcHJpdGVGb3JtYXQgb24gdGhlIGFjdG9yIGluc3RhbmNlIVwiKTtcclxuXHRcdFx0XHRmb3JtYXQgPSBERUZfU1BSSVRFX0ZPUk1BVDtcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0c2VsZi5fX29uTG9hZFNwcml0ZShpbWcsIHNlbGYuZ2V0U3ByaXRlRm9ybWF0KGZvcm1hdCksIHRleHR1cmUpO1xyXG5cdFx0XHRpbWcuc3JjID0gdXJsO1xyXG5cdFx0fSk7XHJcblx0fSxcclxuXHRcclxuXHRfX29uTG9hZFNwcml0ZSA6IGZ1bmN0aW9uKGltZywgZm9ybWF0LCB0ZXh0dXJlKSB7XHJcblx0XHR2YXIgc2VsZiA9IHRoaXM7XHJcblx0XHR2YXIgZiA9IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHR0ZXh0dXJlLmltYWdlID0gaW1nO1xyXG5cdFx0XHRcclxuXHRcdFx0c2VsZi5hdmF0YXJfZm9ybWF0ID0gZm9ybWF0O1xyXG5cdFx0XHR0ZXh0dXJlLnJlcGVhdC5zZXQoXHJcblx0XHRcdFx0c2VsZi5hdmF0YXJfZm9ybWF0LndpZHRoIC8gaW1nLm5hdHVyYWxXaWR0aCwgXHJcblx0XHRcdFx0c2VsZi5hdmF0YXJfZm9ybWF0LmhlaWdodCAvIGltZy5uYXR1cmFsSGVpZ2h0KTtcclxuXHJcblx0XHRcdHRleHR1cmUubmVlZHNVcGRhdGUgPSB0cnVlO1xyXG5cdFx0XHRcclxuXHRcdFx0Ly8gc2VsZi5zaG93QW5pbWF0aW9uRnJhbWUoXCJkMFwiKTtcclxuXHRcdFx0c2VsZi5wbGF5QW5pbWF0aW9uKFwic3RhbmRcIik7XHJcblx0XHRcdGltZy5yZW1vdmVFdmVudExpc3RlbmVyKFwibG9hZFwiLCBmKTtcclxuXHRcdFx0Y3VycmVudE1hcC5tYXJrTG9hZEZpbmlzaGVkKCk7XHJcblx0XHR9XHJcblx0XHRpbWcub24oXCJsb2FkXCIsIGYpO1xyXG5cdH0sXHJcblx0XHJcblx0Ly8gT3ZlcnJpZGUgdGhpcyBmdW5jdGlvbiB0byBwcm92aWRlIGEgY3VzdG9tIHNwcml0ZSBmb3JtYXRcclxuXHRnZXRTcHJpdGVGb3JtYXQgOiBmdW5jdGlvbihmb3JtYXQpIHtcclxuXHRcdHJldHVybiBnZXRTcHJpdGVGb3JtYXQoZm9ybWF0KTtcclxuXHR9LFxyXG5cdFxyXG5cdC8vLy8vLy8vLy8vLy8vLy8vLy8gQW5pbWF0aW9uIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHRfYW5pbWF0aW9uU3RhdGUgOiBudWxsLFxyXG5cdGZhY2luZyA6IG51bGwsXHJcblx0YW5pbWF0aW9uU3BlZWQ6IDEsIC8vZGVmYXVsdCBhbmltYXRpb24gc3BlZWRcclxuXHRcclxuXHRfaW5pdEFuaW1hdGlvblN0YXRlIDogZnVuY3Rpb24oKSB7XHJcblx0XHRpZiAoIXRoaXMuX2FuaW1hdGlvblN0YXRlKVxyXG5cdFx0XHR0aGlzLl9hbmltYXRpb25TdGF0ZSA9IHtcclxuXHRcdFx0XHRjdXJyQW5pbSA6IG51bGwsIC8vIEFuaW1hdGlvbiBvYmplY3RcclxuXHRcdFx0XHRjdXJyRnJhbWUgOiBudWxsLCAvLyBDdXJyZW50bHkgZGlzcGxheWVkIHNwcml0ZSBmcmFtZSBuYW1lXHJcblx0XHRcdFx0bmV4dEFuaW0gOiBudWxsLCAvLyBBbmltYXRpb24gb2JqZWN0IGluIHF1ZXVlXHJcblx0XHRcdFx0XHJcblx0XHRcdFx0c3RvcE5leHRUcmFuc2l0aW9uOiBmYWxzZSwgLy9TdG9wIGF0IHRoZSBuZXh0IHRyYW5zaXRpb24gZnJhbWUsIHRvIHNob3J0LXN0b3AgdGhlIFwiQnVtcFwiIGFuaW1hdGlvblxyXG5cdFx0XHR9O1xyXG5cdFx0cmV0dXJuIHRoaXMuX2FuaW1hdGlvblN0YXRlO1xyXG5cdH0sXHJcblx0XHJcblx0Z2V0RGlyZWN0aW9uRmFjaW5nIDogZnVuY3Rpb24oKSB7XHJcblx0XHRpZiAoIWN1cnJlbnRNYXAgfHwgIWN1cnJlbnRNYXAuY2FtZXJhKSByZXR1cm4gXCJkXCI7XHJcblx0XHRcclxuXHRcdHZhciBkaXJ2ZWN0b3IgPSB0aGlzLmZhY2luZy5jbG9uZSgpO1xyXG5cdFx0ZGlydmVjdG9yLmFwcGx5UXVhdGVybmlvbiggY3VycmVudE1hcC5jYW1lcmEucXVhdGVybmlvbiApO1xyXG5cdFx0ZGlydmVjdG9yLnByb2plY3RPblBsYW5lKEVWRU5UX1BMQU5FX05PUk1BTCkubm9ybWFsaXplKCk7XHJcblx0XHRcclxuXHRcdHZhciB4ID0gZGlydmVjdG9yLngsIHkgPSBkaXJ2ZWN0b3IuejtcclxuXHRcdC8vIGNvbnNvbGUubG9nKFwiRElSRkFDSU5HOlwiLCB4LCB5KTtcclxuXHRcdGlmIChNYXRoLmFicyh4KSA+IE1hdGguYWJzKHkpKSB7IC8vRGlyZWN0aW9uIHZlY3RvciBpcyBwb2ludGluZyBhbG9uZyB4IGF4aXNcclxuXHRcdFx0aWYgKHggPiAwKSByZXR1cm4gXCJsXCI7XHJcblx0XHRcdGVsc2UgcmV0dXJuIFwiclwiO1xyXG5cdFx0fSBlbHNlIHsgLy9EaXJlY3Rpb24gdmVjdG9yIGlzIHBvaW50aW5nIGFsb25nIHkgYXhpc1xyXG5cdFx0XHRpZiAoeSA+IDApIHJldHVybiBcImRcIjtcclxuXHRcdFx0ZWxzZSByZXR1cm4gXCJ1XCI7XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gXCJkXCI7XHJcblx0fSxcclxuXHRcclxuXHRzaG93QW5pbWF0aW9uRnJhbWUgOiBmdW5jdGlvbihmcmFtZSkge1xyXG5cdFx0dmFyIHN0YXRlID0gdGhpcy5faW5pdEFuaW1hdGlvblN0YXRlKCk7XHJcblx0XHRcclxuXHRcdHZhciBkZWYgPSB0aGlzLmF2YXRhcl9mb3JtYXQuZnJhbWVzW2ZyYW1lXTtcclxuXHRcdGlmICghZGVmKSB7XHJcblx0XHRcdGNvbnNvbGUud2FybihcIkVSUk9SIFwiLCB0aGlzLmlkLCBcIjogQW5pbWF0aW9uIGZyYW1lIGRvZXNuJ3QgZXhpc3Q6XCIsIGZyYW1lKTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cdFx0c3RhdGUuZnJhbWVOYW1lID0gZnJhbWU7XHJcblx0XHRcclxuXHRcdHZhciBmbGlwID0gZmFsc2U7XHJcblx0XHRpZiAodHlwZW9mIGRlZiA9PSBcInN0cmluZ1wiKSB7IC8vcmVkaXJlY3RcclxuXHRcdFx0ZGVmID0gdGhpcy5hdmF0YXJfZm9ybWF0LmZyYW1lc1tkZWZdO1xyXG5cdFx0XHRmbGlwID0gdHJ1ZTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0dmFyIHUgPSBkZWZbMF0gKiB0aGlzLmF2YXRhcl90ZXgucmVwZWF0Lng7XHJcblx0XHR2YXIgdiA9IDEgLSAoKGRlZlsxXSsxKSAqIHRoaXMuYXZhdGFyX3RleC5yZXBlYXQueSk7XHJcblx0XHQvL0ZvciBzb21lIHJlYXNvbiwgb2Zmc2V0cyBhcmUgZnJvbSB0aGUgQk9UVE9NIGxlZnQ/IVxyXG5cdFx0XHJcblx0XHRpZiAoZmxpcCAmJiB0aGlzLmF2YXRhcl9mb3JtYXQuZmxpcCkge1xyXG5cdFx0XHR1ID0gMCAtIChkZWZbMF0tMSkgKiB0aGlzLmF2YXRhcl90ZXgucmVwZWF0Lng7IC8vVE9ETyB0ZXN0XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdHRoaXMuYXZhdGFyX3RleC5vZmZzZXQuc2V0KHUsIHYpOyBcclxuXHRcdHRoaXMuYXZhdGFyX3RleC5uZWVkc1VwZGF0ZSA9IHRydWU7XHJcblx0fSxcclxuXHRcclxuXHRwbGF5QW5pbWF0aW9uIDogZnVuY3Rpb24oYW5pbU5hbWUsIG9wdHMpIHtcclxuXHRcdHZhciBzdGF0ZSA9IHRoaXMuX2luaXRBbmltYXRpb25TdGF0ZSgpO1xyXG5cdFx0aWYgKCFvcHRzKSBvcHRzID0ge307XHJcblx0XHRcclxuXHRcdHZhciBhbmltID0gdGhpcy5hdmF0YXJfZm9ybWF0LmFuaW1zW2FuaW1OYW1lXTtcclxuXHRcdGlmICghYW5pbSkge1xyXG5cdFx0XHRjb25zb2xlLndhcm4oXCJFUlJPUlwiLCB0aGlzLmlkLCBcIjogQW5pbWF0aW9uIG5hbWUgZG9lc24ndCBleGlzdDpcIiwgYW5pbU5hbWUpO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblx0XHRhbmltLnBhcmVudCA9IHRoaXM7XHJcblx0XHRzdGF0ZS5uZXh0QW5pbSA9IGFuaW07XHJcblx0XHRhbmltLnNwZWVkID0gKG9wdHMuc3BlZWQgPT0gdW5kZWZpbmVkKT8gdGhpcy5hbmltYXRpb25TcGVlZCA6IG9wdHMuc3BlZWQ7XHJcblx0XHRzdGF0ZS5zdG9wTmV4dFRyYW5zaXRpb24gPSBvcHRzLnN0b3BOZXh0VHJhbnNpdGlvbiB8fCBmYWxzZTtcclxuXHR9LFxyXG5cdFxyXG5cdHN0b3BBbmltYXRpb24gOiBmdW5jdGlvbigpIHtcclxuXHRcdHZhciBzdGF0ZSA9IHRoaXMuX2luaXRBbmltYXRpb25TdGF0ZSgpO1xyXG5cdFx0XHJcblx0XHQvLyBzdGF0ZS5ydW5uaW5nID0gZmFsc2U7XHJcblx0XHQvLyBzdGF0ZS5xdWV1ZSA9IG51bGw7XHJcblx0XHQvLyBzdGF0ZS5zdG9wRnJhbWUgPSBudWxsO1xyXG5cdFx0dGhpcy5lbWl0KFwiYW5pbS1lbmRcIiwgc3RhdGUuYW5pbU5hbWUpO1xyXG5cdH0sXHJcblx0XHJcblx0X3RpY2tfZG9BbmltYXRpb246IGZ1bmN0aW9uKGRlbHRhKSB7XHJcblx0XHR2YXIgc3RhdGUgPSB0aGlzLl9hbmltYXRpb25TdGF0ZTtcclxuXHRcdHZhciBDQSA9IHN0YXRlLmN1cnJBbmltO1xyXG5cdFx0aWYgKCFDQSkgQ0EgPSBzdGF0ZS5jdXJyQW5pbSA9IHN0YXRlLm5leHRBbmltO1xyXG5cdFx0aWYgKCFDQSkgcmV0dXJuO1xyXG5cdFx0XHJcblx0XHRDQS5hZHZhbmNlKGRlbHRhKTtcclxuXHRcdFxyXG5cdFx0aWYgKHN0YXRlLm5leHRBbmltICYmIENBLmNhblRyYW5zaXRpb24oKSkge1xyXG5cdFx0XHQvL1N3aXRjaCBhbmltYXRpb25zXHJcblx0XHRcdENBLnJlc2V0KCk7XHJcblx0XHRcdENBID0gc3RhdGUuY3VyckFuaW0gPSBzdGF0ZS5uZXh0QW5pbTtcclxuXHRcdFx0c3RhdGUubmV4dEFuaW0gPSBudWxsO1xyXG5cdFx0XHRcclxuXHRcdFx0Ly8gdGhpcy5lbWl0KFwiYW5pbS1lbmRcIiwgbnVsbCk7IC8vVE9ETyBwcm92aWRlIGFuaW0gbmFtZVxyXG5cdFx0XHRcclxuXHRcdFx0aWYgKHN0YXRlLnN0b3BOZXh0VHJhbnNpdGlvbikge1xyXG5cdFx0XHRcdHRoaXMucGxheUFuaW1hdGlvbihcInN0YW5kXCIpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdHZhciBkaXIgPSB0aGlzLmdldERpcmVjdGlvbkZhY2luZygpO1xyXG5cdFx0dmFyIGZyYW1lID0gQ0EuZ2V0RnJhbWVUb0Rpc3BsYXkoZGlyKTtcclxuXHRcdGlmIChmcmFtZSAhPSBzdGF0ZS5jdXJyRnJhbWUpIHtcclxuXHRcdFx0dGhpcy5zaG93QW5pbWF0aW9uRnJhbWUoZnJhbWUpO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0fSxcclxuXHRcclxuXHQvLy8vLy8vLy8vLy8vLy8vLy8vIE1vdmVtZW50IGFuZCBQYXRoaW5nIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHRfcGF0aGluZ1N0YXRlIDogbnVsbCxcclxuXHRcclxuXHRfaW5pdFBhdGhpbmdTdGF0ZSA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0aWYgKCF0aGlzLl9wYXRoaW5nU3RhdGUpXHJcblx0XHRcdHRoaXMuX3BhdGhpbmdTdGF0ZSA9IHtcclxuXHRcdFx0XHRxdWV1ZTogW10sXHJcblx0XHRcdFx0bW92aW5nOiBmYWxzZSxcclxuXHRcdFx0XHRzcGVlZDogMSxcclxuXHRcdFx0XHRkZWx0YTogMCwgLy90aGUgZGVsdGEgZnJvbSBzcmMgdG8gZGVzdFxyXG5cdFx0XHRcdGp1bXBpbmcgOiBmYWxzZSxcclxuXHRcdFx0XHQvLyBkaXI6IFwiZFwiLFxyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdGRlc3RMb2NDOiBuZXcgVEhSRUUuVmVjdG9yMygpLnNldCh0aGlzLmxvY2F0aW9uKSwgLy9jb2xsaXNpb24gbWFwIGxvY2F0aW9uXHJcblx0XHRcdFx0ZGVzdExvYzM6IG5ldyBUSFJFRS5WZWN0b3IzKCksIC8vd29ybGQgc3BhY2UgbG9jYXRpb25cclxuXHRcdFx0XHRzcmNMb2NDOiBuZXcgVEhSRUUuVmVjdG9yMygpLnNldCh0aGlzLmxvY2F0aW9uKSxcclxuXHRcdFx0XHRzcmNMb2MzOiBuZXcgVEhSRUUuVmVjdG9yMygpLFxyXG5cdFx0XHRcdG1pZHBvaW50T2Zmc2V0OiBuZXcgVEhSRUUuVmVjdG9yMygpLFxyXG5cdFx0XHR9O1xyXG5cdFx0cmV0dXJuIHRoaXMuX3BhdGhpbmdTdGF0ZTtcclxuXHR9LFxyXG5cdFxyXG5cdHBhdGhUbyA6IGZ1bmN0aW9uKHgsIHkpIHtcclxuXHRcdHZhciBzdGF0ZSA9IHRoaXMuX2luaXRQYXRoaW5nU3RhdGUoKTtcclxuXHRcdFxyXG5cdFx0Y29uc29sZS5lcnJvcih0aGlzLmlkLCBcIjogUGF0aGluZyBoYXMgbm90IGJlZW4gaW1wbGVtZW50ZWQgeWV0IVwiKTtcclxuXHR9LFxyXG5cdFxyXG5cdGNsZWFyUGF0aGluZyA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0dmFyIHN0YXRlID0gdGhpcy5faW5pdFBhdGhpbmdTdGF0ZSgpO1xyXG5cdFx0c3RhdGUucXVldWUubGVuZ3RoID0gMDtcclxuXHR9LFxyXG5cdFxyXG5cdG1vdmVEaXIgOiBmdW5jdGlvbihkaXIpIHtcclxuXHRcdHZhciB4ID0gdGhpcy5sb2NhdGlvbi54O1xyXG5cdFx0dmFyIHkgPSB0aGlzLmxvY2F0aW9uLnk7XHJcblx0XHR2YXIgeiA9IHRoaXMubG9jYXRpb24uejtcclxuXHRcdHN3aXRjaCAoZGlyKSB7XHJcblx0XHRcdGNhc2UgXCJkXCI6IGNhc2UgXCJkb3duXCI6XHR5ICs9IDE7IGJyZWFrO1xyXG5cdFx0XHRjYXNlIFwidVwiOiBjYXNlIFwidXBcIjpcdHkgLT0gMTsgYnJlYWs7XHJcblx0XHRcdGNhc2UgXCJsXCI6IGNhc2UgXCJsZWZ0XCI6XHR4IC09IDE7IGJyZWFrO1xyXG5cdFx0XHRjYXNlIFwiclwiOiBjYXNlIFwicmlnaHRcIjpcdHggKz0gMTsgYnJlYWs7XHJcblx0XHR9XHJcblx0XHR0aGlzLm1vdmVUbyh4LCB5LCB6KTtcclxuXHR9LFxyXG5cdFxyXG5cdGZhY2VEaXIgOiBmdW5jdGlvbih4LCB5KSB7XHJcblx0XHR0aGlzLmZhY2luZy5zZXQoLXgsIDAsIHkpO1xyXG5cdH0sXHJcblx0XHJcblx0bW92ZVRvIDogZnVuY3Rpb24oeCwgeSwgbGF5ZXIsIGJ5cGFzcykgeyAvL2J5cGFzcyBXYWxrbWFzayBjaGVja1xyXG5cdFx0dmFyIHN0YXRlID0gdGhpcy5faW5pdFBhdGhpbmdTdGF0ZSgpO1xyXG5cdFx0dmFyIHNyYyA9IHRoaXMubG9jYXRpb247XHJcblx0XHRsYXllciA9IChsYXllciA9PSB1bmRlZmluZWQpPyB0aGlzLmxvY2F0aW9uLnogOiBsYXllcjtcclxuXHRcdFxyXG5cdFx0dGhpcy5mYWNpbmcuc2V0KHNyYy54LXgsIDAsIHktc3JjLnkpO1xyXG5cdFx0XHJcblx0XHR2YXIgd2Fsa21hc2sgPSBjdXJyZW50TWFwLmNhbldhbGtCZXR3ZWVuKHNyYy54LCBzcmMueSwgeCwgeSk7XHJcblx0XHRpZiAoYnlwYXNzICE9PSB1bmRlZmluZWQpIHdhbGttYXNrID0gYnlwYXNzO1xyXG5cdFx0aWYgKCF3YWxrbWFzaykge1xyXG5cdFx0XHR0aGlzLmVtaXQoXCJjYW50LW1vdmVcIiwgc3JjLngsIHNyYy55LCB4LCB5KTtcclxuXHRcdFx0Y3VycmVudE1hcC5kaXNwYXRjaCh4LCB5LCBcImJ1bXBlZFwiLCB0aGlzLmZhY2luZyk7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHRcdGlmICgod2Fsa21hc2sgJiAweDEwKSA9PSAweDEwKSB7IC8vIENoZWNrIE5vTlBDIHRpbGVzXHJcblx0XHRcdGlmICh0aGlzLmlzTlBDKCkpIHtcclxuXHRcdFx0XHR0aGlzLmVtaXQoXCJjYW50LW1vdmVcIiwgc3JjLngsIHNyYy55LCB4LCB5KTtcclxuXHRcdFx0XHRjdXJyZW50TWFwLmRpc3BhdGNoKHgsIHksIFwiYnVtcGVkXCIsIHRoaXMuZmFjaW5nKTtcclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdGlmICgod2Fsa21hc2sgJiAweDgpID09IDB4OCkge1xyXG5cdFx0XHQvLyBUcmFuc2l0aW9uIG5vdyB0byBhbm90aGVyIGxheWVyXHJcblx0XHRcdHZhciB0ID0gY3VycmVudE1hcC5nZXRMYXllclRyYW5zaXRpb24oeCwgeSwgdGhpcy5sb2NhdGlvbi56KTtcclxuXHRcdFx0Y29uc29sZS5sb2coXCJMYXllciBUcmFuc2l0aW9uOiBcIiwgdCk7XHJcblx0XHRcdHggPSB0Lng7IHkgPSB0Lnk7IGxheWVyID0gdC5sYXllcjtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0XHJcblx0XHR2YXIgYW5pbW9wdHMgPSB7fTtcclxuXHRcdHN0YXRlLm1pZHBvaW50T2Zmc2V0LnNldCgwLCAwLCAwKTtcclxuXHRcdHN0YXRlLnNyY0xvY0Muc2V0KHNyYyk7XHJcblx0XHRzdGF0ZS5zcmNMb2MzLnNldChjdXJyZW50TWFwLmdldDNEVGlsZUxvY2F0aW9uKHNyYykpO1xyXG5cdFx0c3RhdGUuZGVzdExvY0Muc2V0KHgsIHksIGxheWVyKTtcclxuXHRcdHN0YXRlLmRlc3RMb2MzLnNldChjdXJyZW50TWFwLmdldDNEVGlsZUxvY2F0aW9uKHgsIHksIGxheWVyKSk7XHJcblx0XHRzdGF0ZS5kZWx0YSA9IDA7XHJcblx0XHRzdGF0ZS5zcGVlZCA9IDE7XHJcblx0XHRzdGF0ZS5tb3ZpbmcgPSB0cnVlO1xyXG5cdFx0XHJcblx0XHRpZiAoKHdhbGttYXNrICYgMHgyKSA9PT0gMHgyKSB7XHJcblx0XHRcdHN0YXRlLm1pZHBvaW50T2Zmc2V0LnNldFkoMC42KTtcclxuXHRcdFx0c3RhdGUuanVtcGluZyA9IHRydWU7XHJcblx0XHRcdFNvdW5kTWFuYWdlci5wbGF5U291bmQoXCJ3YWxrX2p1bXBcIik7XHJcblx0XHRcdGFuaW1vcHRzLnNwZWVkID0gMS41O1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHR0aGlzLnBsYXlBbmltYXRpb24oXCJ3YWxrXCIsIGFuaW1vcHRzKTtcclxuXHRcdHRoaXMuZW1pdChcIm1vdmluZ1wiLCBzdGF0ZS5zcmNMb2NDLngsIHN0YXRlLnNyY0xvY0MueSwgc3RhdGUuZGVzdExvY0MueCwgc3RhdGUuZGVzdExvY0MueSk7XHJcblx0fSxcclxuXHRcclxuXHRfdGlja19kb01vdmVtZW50IDogZnVuY3Rpb24oZGVsdGEpIHtcclxuXHRcdHZhciBzdGF0ZSA9IHRoaXMuX2luaXRQYXRoaW5nU3RhdGUoKTtcclxuXHRcdFxyXG5cdFx0c3RhdGUuZGVsdGEgKz0gc3RhdGUuc3BlZWQgKiAoZGVsdGEgKiBDT05GSUcuc3BlZWQucGF0aGluZyk7XHJcblx0XHR2YXIgYWxwaGEgPSBNYXRoLmNsYW1wKHN0YXRlLmRlbHRhKTtcclxuXHRcdHZhciBiZXRhID0gTWF0aC5zaW4oYWxwaGEgKiBNYXRoLlBJKTtcclxuXHRcdHRoaXMuYXZhdGFyX25vZGUucG9zaXRpb24uc2V0KCBcclxuXHRcdFx0Ly9MZXJwIGJldHdlZW4gc3JjIGFuZCBkZXN0IChidWlsdCBpbiBsZXJwKCkgaXMgZGVzdHJ1Y3RpdmUsIGFuZCBzZWVtcyBiYWRseSBkb25lKVxyXG5cdFx0XHRzdGF0ZS5zcmNMb2MzLnggKyAoKHN0YXRlLmRlc3RMb2MzLnggLSBzdGF0ZS5zcmNMb2MzLngpICogYWxwaGEpICsgKHN0YXRlLm1pZHBvaW50T2Zmc2V0LnggKiBiZXRhKSxcclxuXHRcdFx0c3RhdGUuc3JjTG9jMy55ICsgKChzdGF0ZS5kZXN0TG9jMy55IC0gc3RhdGUuc3JjTG9jMy55KSAqIGFscGhhKSArIChzdGF0ZS5taWRwb2ludE9mZnNldC55ICogYmV0YSksXHJcblx0XHRcdHN0YXRlLnNyY0xvYzMueiArICgoc3RhdGUuZGVzdExvYzMueiAtIHN0YXRlLnNyY0xvYzMueikgKiBhbHBoYSkgKyAoc3RhdGUubWlkcG9pbnRPZmZzZXQueiAqIGJldGEpXHJcblx0XHQpO1xyXG5cdFx0XHJcblx0XHRpZiAoc3RhdGUuZGVsdGEgPiAxKSB7XHJcblx0XHRcdHRoaXMuZW1pdChcIm1vdmVkXCIsIHN0YXRlLnNyY0xvY0MueCwgc3RhdGUuc3JjTG9jQy55LCBzdGF0ZS5kZXN0TG9jQy54LCBzdGF0ZS5kZXN0TG9jQy55KTtcclxuXHRcdFx0dGhpcy5sb2NhdGlvbi5zZXQoIHN0YXRlLmRlc3RMb2NDICk7XHJcblx0XHRcdFxyXG5cdFx0XHRpZiAoc3RhdGUuanVtcGluZykge1xyXG5cdFx0XHRcdC8vVE9ETyBwYXJ0aWNsZSBlZmZlY3RzXHJcblx0XHRcdFx0U291bmRNYW5hZ2VyLnBsYXlTb3VuZChcIndhbGtfanVtcF9sYW5kXCIpO1xyXG5cdFx0XHRcdHN0YXRlLmp1bXBpbmcgPSBmYWxzZTtcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0dmFyIG5leHQgPSBzdGF0ZS5xdWV1ZS5zaGlmdCgpO1xyXG5cdFx0XHRpZiAoIW5leHQpIHtcclxuXHRcdFx0XHRzdGF0ZS5kZWx0YSA9IDA7XHJcblx0XHRcdFx0c3RhdGUubW92aW5nID0gZmFsc2U7XHJcblx0XHRcdFx0Ly8gdGhpcy5zdG9wQW5pbWF0aW9uKCk7XHJcblx0XHRcdFx0dGhpcy5wbGF5QW5pbWF0aW9uKFwic3RhbmRcIik7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0dGhpcy5tb3ZlVG8obmV4dC54LCBuZXh0LnksIG5leHQueik7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9LFxyXG5cdFxyXG5cdFxyXG5cdC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLyBCZWhhdmlvcnMgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cdGJlaGF2aW9yU3RhY2sgOiBudWxsLFxyXG5cdFxyXG5cdF9pbml0QmVoYXZpb3JTdGFjayA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0aWYgKCF0aGlzLmJlaGF2aW9yU3RhY2spXHJcblx0XHRcdHRoaXMuYmVoYXZpb3JTdGFjayA9IFtdO1xyXG5cdH0sXHJcblx0XHJcblx0X3RpY2tfZG9CZWhhdmlvciA6IGZ1bmN0aW9uKGRlbHRhKSB7XHJcblx0XHR2YXIgYmVoYXYgPSB0aGlzLmJlaGF2aW9yU3RhY2sudG9wO1xyXG5cdFx0aWYgKCFiZWhhdiB8fCAhYmVoYXYuX3RpY2spIHJldHVybjtcclxuXHRcdGJlaGF2Ll90aWNrKHRoaXMsIGRlbHRhKTtcclxuXHR9LFxyXG5cdFxyXG5cdFxyXG5cdC8vLy8vLy8vLy8vLy8vLy8vLy8vLyBQcml2YXRlIE1ldGhvZHMgLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cdFxyXG5cdGNhbldhbGtPbiA6IGZ1bmN0aW9uKCl7IHJldHVybiBmYWxzZTsgfSxcclxuXHRpc05QQyA6IGZ1bmN0aW9uKCl7IHJldHVybiB0cnVlOyB9LFxyXG5cdFxyXG5cdF9ub3JtYWxpemVMb2NhdGlvbiA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0aWYgKHRoaXMubG9jYXRpb24gPT0gXCJyYW5kXCIpIHtcclxuXHRcdFx0Ly9QbGFjZSB0aGlzIGFjdG9yIGluIGEgZGVzaWduYXRlZCByYW5kb20gbG9jYXRpb25cclxuXHRcdFx0dGhpcy5sb2NhdGlvbiA9IGN1cnJlbnRNYXAuZ2V0UmFuZG9tTlBDU3Bhd25Qb2ludCgpO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdHZhciBudW0gPSBFdmVudC5wcm90b3R5cGUuX25vcm1hbGl6ZUxvY2F0aW9uLmNhbGwodGhpcyk7XHJcblx0XHRpZiAobnVtICE9IDEgfHwgIXRoaXMubG9jYXRpb24pXHJcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIkFjdG9ycyBjYW4gb25seSBiZSBpbiBvbmUgcGxhY2UgYXQgYSB0aW1lISBOdW1iZXIgb2YgbG9jYXRpb25zOiBcIitudW0pO1xyXG5cdH0sXHJcblx0XHJcblx0X2FjdG9yVGljayA6IGZ1bmN0aW9uKGRlbHRhKSB7XHJcblx0XHQvLyBEbyBhbmltYXRpb25cclxuXHRcdGlmICh0aGlzLl9hbmltYXRpb25TdGF0ZSkgXHJcblx0XHRcdHRoaXMuX3RpY2tfZG9BbmltYXRpb24oZGVsdGEpO1xyXG5cdFx0XHJcblx0XHQvLyBEbyBtb3ZlbWVudFxyXG5cdFx0aWYgKHRoaXMuX3BhdGhpbmdTdGF0ZSAmJiB0aGlzLl9wYXRoaW5nU3RhdGUubW92aW5nKVxyXG5cdFx0XHR0aGlzLl90aWNrX2RvTW92ZW1lbnQoZGVsdGEpO1xyXG5cdFx0XHJcblx0XHQvLyBEbyBiZWhhdmlvclxyXG5cdFx0aWYgKHRoaXMuYmVoYXZpb3JTdGFjay5sZW5ndGgpXHJcblx0XHRcdHRoaXMuX3RpY2tfZG9CZWhhdmlvcihkZWx0YSk7XHJcblx0fSxcclxuXHRcclxuXHRfYWN0b3JJbnRlcmFjdEZhY2UgOiBmdW5jdGlvbih2ZWN0b3IpIHtcclxuXHRcdHRoaXMuZmFjaW5nID0gdmVjdG9yLmNsb25lKCkubmVnYXRlKCk7XHJcblx0fSxcclxuXHRcclxuXHRfYWN0b3JCdW1wIDogZnVuY3Rpb24oc3JjeCwgc3JjeSwgeCwgeSwgcmVhc29uKSB7XHJcblx0XHQvLyBjb25zb2xlLndhcm4odGhpcy5pZCwgXCI6IENhbm5vdCB3YWxrIHRvIGxvY2F0aW9uXCIsIFwiKFwiK3grXCIsXCIreStcIilcIik7XHJcblx0fSxcclxuXHRcclxufSk7XHJcbm1vZHVsZS5leHBvcnRzID0gQWN0b3I7XHJcblxyXG5cclxuXHJcbmZ1bmN0aW9uIGdldERpckZyb21Mb2MoeDEsIHkxLCB4MiwgeTIpIHtcclxuXHRyZXR1cm4gbmV3IFRIUkVFLlZlY3RvcjMoeDIteDEsIDAsIHkyLXkxKTtcclxuXHQvLyB2YXIgZHggPSB4MiAtIHgxO1xyXG5cdC8vIHZhciBkeSA9IHkyIC0geTE7XHJcblx0Ly8gaWYgKE1hdGguYWJzKGR4KSA+IE1hdGguYWJzKGR5KSkge1xyXG5cdC8vIFx0aWYgKGR4ID4gMCkgeyByZXR1cm4gXCJyXCI7IH1cclxuXHQvLyBcdGVsc2UgaWYgKGR4IDwgMCkgeyByZXR1cm4gXCJsXCI7IH1cclxuXHQvLyB9IGVsc2Uge1xyXG5cdC8vIFx0aWYgKGR5ID4gMCkgeyByZXR1cm4gXCJkXCI7IH1cclxuXHQvLyBcdGVsc2UgaWYgKGR5IDwgMCkgeyByZXR1cm4gXCJ1XCI7IH1cclxuXHQvLyB9XHJcblx0Ly8gcmV0dXJuIFwiZFwiO1xyXG59XHJcblxyXG4iLCIvLyBiZWhhdmlvci5qc1xyXG4vLyBEZWZpbmVzIHRoZSBiYXNlZCBjbGFzc2VzIGZvciBBY3RvcidzIGJlaGF2aW9yc1xyXG5cclxudmFyIGV4dGVuZCA9IHJlcXVpcmUoXCJleHRlbmRcIik7XHJcbnZhciBpbmhlcml0cyA9IHJlcXVpcmUoXCJpbmhlcml0c1wiKTtcclxuXHJcbi8qKiBcclxuICogQSBCZWhhdmlvciBpcyBhIHNjcmlwdCB0aGF0IGFuIGFjdG9yIGlzIGZvbGxvd2luZywgd2hldGhlciB0aGF0XHJcbiAqIGJlIHdhbGtpbmcgYWxvbmcgYSBwYXRoIG9yIGFyb3VuZCBhIGNpcmNsZSwgb3IgZm9sbG93aW5nIGEgbW9yZVxyXG4gKiBjb21wbGV4IHNjcmlwdCBvZiBldmVudHMuIEJlaGF2aW9ycyBjYW4gYmUgcHVzaGVkIGFuZCBwb3BwZWQgb2ZmXHJcbiAqIGFuIGFjdG9yJ3Mgc3RhY2ssIGFuZCB0aGUgdG9wbW9zdCBvbmUgd2lsbCBiZSBwYXNzZWQgY2VydGFpbiBldmVudHNcclxuICogdGhhdCB0aGUgYWN0b3IgcmVjaWV2ZXMuXHJcbiAqL1xyXG5cclxuZnVuY3Rpb24gQmVoYXZpb3Iob3B0cykge1xyXG5cdGV4dGVuZCh0aGlzLCBvcHRzKTtcclxufVxyXG5leHRlbmQoQmVoYXZpb3IucHJvdG90eXBlLCB7XHJcblx0dGljayA6IG51bGwsXHJcblx0aW50ZXJhY3QgOiBudWxsLFxyXG5cdGJ1bXAgOiBudWxsLFxyXG5cdFxyXG5cdF90aWNrIDogZnVuY3Rpb24obWUsIGRlbHRhKSB7XHJcblx0XHRpZiAodGhpcy50aWNrKVxyXG5cdFx0XHR0aGlzLnRpY2sobWUsIGRlbHRhKTtcclxuXHR9LFxyXG5cdF9pbnRlcmFjdCA6IGZ1bmN0aW9uKG1lLCBmcm9tX2Rpcikge1xyXG5cdFx0Ly9UT0RPIGRvIHN0YW5kYXJkIHN0dWZmIGhlcmVcclxuXHRcdGlmICh0aGlzLmludGVyYWN0KVxyXG5cdFx0XHR0aGlzLmludGVyYWN0KG1lLCBmcm9tX2Rpcik7XHJcblx0fSxcclxuXHRfYnVtcCA6IGZ1bmN0aW9uKG1lLCBmcm9tX2Rpcikge1xyXG5cdFx0aWYgKHRoaXMuYnVtcClcclxuXHRcdFx0dGhpcy5idW1wKG1lLCBmcm9tX2Rpcik7XHJcblx0fSxcclxufSk7XHJcbm1vZHVsZS5leHBvcnRzID0gQmVoYXZpb3I7XHJcblxyXG5cclxuLy8vLy8vLy8vLy8gQ29tbW9uIEJlaGF2aW9ycyAvLy8vLy8vLy8vL1xyXG5cclxuZnVuY3Rpb24gVGFsa2luZyhvcHRzKSB7XHJcblx0QmVoYXZpb3IuY2FsbCh0aGlzLCBvcHRzKTtcclxufVxyXG5pbmhlcml0cyhUYWxraW5nLCBCZWhhdmlvcik7XHJcbmV4dGVuZChUYWxraW5nLnByb3RvdHlwZSwge1xyXG5cdHRpY2s6IGZ1bmN0aW9uKG1lLCBkZWx0YSkge30sXHJcbn0pO1xyXG5tb2R1bGUuZXhwb3J0cy5UYWxraW5nID0gVGFsa2luZztcclxuXHJcblxyXG5cclxuZnVuY3Rpb24gTG9va0Fyb3VuZChvcHRzKSB7XHJcblx0QmVoYXZpb3IuY2FsbCh0aGlzLCBvcHRzKTtcclxufVxyXG5pbmhlcml0cyhMb29rQXJvdW5kLCBCZWhhdmlvcik7XHJcbmV4dGVuZChMb29rQXJvdW5kLnByb3RvdHlwZSwge1xyXG5cdHdhaXRUaW1lIDogMCxcclxuXHR0aWNrOiBmdW5jdGlvbihtZSwgZGVsdGEpIHtcclxuXHRcdGlmICh0aGlzLndhaXRUaW1lID4gMCkge1xyXG5cdFx0XHR0aGlzLndhaXRUaW1lIC09IGRlbHRhO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdHN3aXRjaCggTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpKjQpICkge1xyXG5cdFx0XHRjYXNlIDA6IG1lLmZhY2luZy5zZXQoIDEsMCwgMCk7IGJyZWFrO1xyXG5cdFx0XHRjYXNlIDE6IG1lLmZhY2luZy5zZXQoLTEsMCwgMCk7IGJyZWFrO1xyXG5cdFx0XHRjYXNlIDI6IG1lLmZhY2luZy5zZXQoIDAsMCwgMSk7IGJyZWFrO1xyXG5cdFx0XHRjYXNlIDM6IG1lLmZhY2luZy5zZXQoIDAsMCwtMSk7IGJyZWFrO1xyXG5cdFx0fVxyXG5cdFx0dGhpcy53YWl0VGltZSArPSAoTWF0aC5yYW5kb20oKSAqIDMwKSArIDU7XHJcblx0fSxcclxufSk7XHJcbm1vZHVsZS5leHBvcnRzLkxvb2tBcm91bmQgPSBMb29rQXJvdW5kO1xyXG5cclxuXHJcblxyXG5mdW5jdGlvbiBNZWFuZGVyKG9wdHMpIHtcclxuXHRCZWhhdmlvci5jYWxsKHRoaXMsIG9wdHMpO1xyXG59XHJcbmluaGVyaXRzKE1lYW5kZXIsIEJlaGF2aW9yKTtcclxuZXh0ZW5kKE1lYW5kZXIucHJvdG90eXBlLCB7XHJcblx0d2FpdFRpbWUgOiAwLFxyXG5cdHRpY2s6IGZ1bmN0aW9uKG1lLCBkZWx0YSkge1xyXG5cdFx0aWYgKHRoaXMud2FpdFRpbWUgPiAwKSB7XHJcblx0XHRcdHRoaXMud2FpdFRpbWUgLT0gZGVsdGE7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0c3dpdGNoKCBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkqOCkgKSB7XHJcblx0XHRcdGNhc2UgMDogbWUuZmFjaW5nLnNldCggMSwwLCAwKTsgYnJlYWs7XHJcblx0XHRcdGNhc2UgMTogbWUuZmFjaW5nLnNldCgtMSwwLCAwKTsgYnJlYWs7XHJcblx0XHRcdGNhc2UgMjogbWUuZmFjaW5nLnNldCggMCwwLCAxKTsgYnJlYWs7XHJcblx0XHRcdGNhc2UgMzogbWUuZmFjaW5nLnNldCggMCwwLC0xKTsgYnJlYWs7XHJcblx0XHRcdGNhc2UgNDogbWUubW92ZURpcihcImRcIik7IGJyZWFrO1xyXG5cdFx0XHRjYXNlIDU6IG1lLm1vdmVEaXIoXCJ1XCIpOyBicmVhaztcclxuXHRcdFx0Y2FzZSA2OiBtZS5tb3ZlRGlyKFwibFwiKTsgYnJlYWs7XHJcblx0XHRcdGNhc2UgNzogbWUubW92ZURpcihcInJcIik7IGJyZWFrO1xyXG5cdFx0fVxyXG5cdFx0dGhpcy53YWl0VGltZSArPSAoTWF0aC5yYW5kb20oKSAqIDMwKSArIDU7XHJcblx0fSxcclxufSk7XHJcbm1vZHVsZS5leHBvcnRzLk1lYW5kZXIgPSBNZWFuZGVyO1xyXG5cclxuIiwiLy8gY29udHJvbGxlci5qc1xyXG4vLyBUaGlzIGNsYXNzIGhhbmRsZXMgaW5wdXQgYW5kIGNvbnZlcnRzIGl0IHRvIGNvbnRyb2wgc2lnbmFsc1xyXG5cclxudmFyIGluaGVyaXRzID0gcmVxdWlyZShcImluaGVyaXRzXCIpO1xyXG52YXIgZXh0ZW5kID0gcmVxdWlyZShcImV4dGVuZFwiKTtcclxudmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoXCJldmVudHNcIikuRXZlbnRFbWl0dGVyO1xyXG5cclxuLy8gVE9ETyBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9HdWlkZS9BUEkvR2FtZXBhZFxyXG5cclxuZnVuY3Rpb24gQ29udHJvbE1hbmFnZXIoKSB7XHJcblx0dmFyIHNlbGYgPSB0aGlzO1xyXG5cdHRoaXMuc2V0S2V5Q29uZmlnKCk7XHJcblx0XHJcblx0JChmdW5jdGlvbigpe1xyXG5cdFx0JChkb2N1bWVudCkub24oXCJrZXlkb3duXCIsIGZ1bmN0aW9uKGUpeyBzZWxmLm9uS2V5RG93bihlKTsgfSk7XHJcblx0XHQkKGRvY3VtZW50KS5vbihcImtleXVwXCIsIGZ1bmN0aW9uKGUpeyBzZWxmLm9uS2V5VXAoZSk7IH0pO1xyXG5cdFx0XHJcblx0XHQkKFwiI2NoYXRib3hcIikub24oXCJmb2N1c1wiLCBmdW5jdGlvbihlKXsgXHJcblx0XHRcdGNvbnNvbGUubG9nKFwiQ0hBVCBGT0NVU1wiKTtcclxuXHRcdFx0c2VsZi5pbnB1dENvbnRleHQucHVzaChcImNoYXRcIik7IFxyXG5cdFx0fSk7XHJcblx0XHQkKFwiI2NoYXRib3hcIikub24oXCJibHVyXCIsIGZ1bmN0aW9uKGUpeyBcclxuXHRcdFx0Y29uc29sZS5sb2coXCJDSEFUIEJMVVJcIik7XHJcblx0XHRcdGlmIChzZWxmLmlucHV0Q29udGV4dC50b3AgPT0gXCJjaGF0XCIpXHJcblx0XHRcdFx0c2VsZi5pbnB1dENvbnRleHQucG9wKCk7IFxyXG5cdFx0fSk7XHJcblx0fSlcclxufVxyXG5pbmhlcml0cyhDb250cm9sTWFuYWdlciwgRXZlbnRFbWl0dGVyKTtcclxuZXh0ZW5kKENvbnRyb2xNYW5hZ2VyLnByb3RvdHlwZSwge1xyXG5cdGlucHV0Q29udGV4dCA6IFtcImdhbWVcIl0sXHJcblx0XHJcblx0a2V5c19jb25maWcgOiB7XHJcblx0XHRVcDogWzM4LCBcIlVwXCIsIDg3LCBcIndcIl0sIFxyXG5cdFx0RG93bjogWzQwLCBcIkRvd25cIiwgODMsIFwic1wiXSwgXHJcblx0XHRMZWZ0OiBbMzcsIFwiTGVmdFwiLCA2NSwgXCJhXCJdLCBcclxuXHRcdFJpZ2h0OiBbMzksIFwiUmlnaHRcIiwgNjgsIFwiZFwiXSxcclxuXHRcdEludGVyYWN0OiBbMTMsIFwiRW50ZXJcIiwgMzIsIFwiIFwiXSxcclxuXHRcdEZvY3VzQ2hhdDogWzE5MSwgXCIvXCJdLFxyXG5cdH0sXHJcblx0XHJcblx0a2V5c19hY3RpdmUgOiB7fSxcclxuXHRcclxuXHRrZXlzX2Rvd24gOiB7XHJcblx0XHRVcDogZmFsc2UsIERvd246IGZhbHNlLFxyXG5cdFx0TGVmdDogZmFsc2UsIFJpZ2h0OiBmYWxzZSxcclxuXHRcdEludGVyYWN0OiBmYWxzZSwgRm9jdXNDaGF0OiBmYWxzZSxcclxuXHR9LFxyXG5cdFxyXG5cdHB1c2hJbnB1dENvbnRleHQ6IGZ1bmN0aW9uKGN0eCkge1xyXG5cdFx0dGhpcy5pbnB1dENvbnRleHQucHVzaChjdHgpO1xyXG5cdH0sXHJcblx0cG9wSW5wdXRDb250ZXh0OiBmdW5jdGlvbihjdHgpIHtcclxuXHRcdGlmICghY3R4IHx8IHRoaXMuaW5wdXRDb250ZXh0LnRvcCA9PSBjdHgpXHJcblx0XHRcdHRoaXMuaW5wdXRDb250ZXh0LnBvcCgpO1xyXG5cdH0sXHJcblx0XHJcblx0aXNEb3duIDogZnVuY3Rpb24oa2V5LCBjdHgpIHtcclxuXHRcdGlmICgkLmlzQXJyYXkoY3R4KSkge1xyXG5cdFx0XHR2YXIgZ28gPSBmYWxzZTtcclxuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBjdHgubGVuZ3RoOyBpKyspIGdvIHw9IGN0eFtpXTtcclxuXHRcdFx0aWYgKCFnbykgcmV0dXJuO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0aWYgKHRoaXMuaW5wdXRDb250ZXh0LnRvcCAhPSBjdHgpIHJldHVybjtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0cmV0dXJuIHRoaXMua2V5c19kb3duW2tleV07XHJcblx0fSxcclxuXHRcclxuXHRzZXRLZXlDb25maWcgOiBmdW5jdGlvbigpIHtcclxuXHRcdHRoaXMua2V5c19hY3RpdmUgPSBleHRlbmQodHJ1ZSwge30sIHRoaXMua2V5c19jb25maWcpO1xyXG5cdH0sXHJcblx0XHJcblx0b25LZXlEb3duIDogZnVuY3Rpb24oZSkge1xyXG5cdFx0Zm9yICh2YXIgYWN0aW9uIGluIHRoaXMua2V5c19hY3RpdmUpIHtcclxuXHRcdFx0dmFyIGtleXMgPSB0aGlzLmtleXNfYWN0aXZlW2FjdGlvbl07XHJcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRcdGlmIChlLndoaWNoID09IGtleXNbaV0pIHtcclxuXHRcdFx0XHRcdC8vIEtleSBpcyBub3cgZG93biFcclxuXHRcdFx0XHRcdHRoaXMuZW1pdEtleShhY3Rpb24sIHRydWUpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH0sXHJcblx0b25LZXlVcCA6IGZ1bmN0aW9uIChlKSB7XHJcblx0XHRmb3IgKHZhciBhY3Rpb24gaW4gdGhpcy5rZXlzX2FjdGl2ZSkge1xyXG5cdFx0XHR2YXIga2V5cyA9IHRoaXMua2V5c19hY3RpdmVbYWN0aW9uXTtcclxuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdFx0aWYgKGUud2hpY2ggPT0ga2V5c1tpXSkge1xyXG5cdFx0XHRcdFx0Ly8gS2V5IGlzIG5vdyB1cCFcclxuXHRcdFx0XHRcdHRoaXMuZW1pdEtleShhY3Rpb24sIGZhbHNlKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9LFxyXG5cdFxyXG5cdHN1Ym1pdENoYXRLZXlwcmVzcyA6IGZ1bmN0aW9uKGtleSkge1xyXG5cdFx0c3dpdGNoKGtleSkge1xyXG5cdFx0XHRcclxuXHRcdH1cclxuXHR9LFxyXG5cdFxyXG5cdGVtaXRLZXkgOiBmdW5jdGlvbihhY3Rpb24sIGRvd24pIHtcclxuXHRcdGlmICh0aGlzLmtleXNfZG93blthY3Rpb25dICE9IGRvd24pIHtcclxuXHRcdFx0dGhpcy5rZXlzX2Rvd25bYWN0aW9uXSA9IGRvd247XHJcblx0XHRcdHRoaXMuZW1pdChcImNvbnRyb2wtYWN0aW9uXCIsIGFjdGlvbiwgZG93bik7XHJcblx0XHR9XHJcblx0fSxcclxuXHRcclxufSk7XHJcblxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBuZXcgQ29udHJvbE1hbmFnZXIoKTtcclxuIiwiLy8gZXZlbnQuanNcclxuLy8gRGVmaW5lcyB0aGUgYmFzZSBldmVudCB1c2VkIHRocm91Z2hvdXQgdGhlIHBhcmsuXHJcblxyXG4vLyBGaXR0aW5nbHksIEV2ZW50IGlzIGEgc3ViY2xhc3Mgb2Ygbm9kZS5qcydzIEV2ZW50RW1pdHRlciBjbGFzcy5cclxudmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoXCJldmVudHNcIikuRXZlbnRFbWl0dGVyO1xyXG52YXIgaW5oZXJpdHMgPSByZXF1aXJlKFwiaW5oZXJpdHNcIik7XHJcbnZhciBleHRlbmQgPSByZXF1aXJlKFwiZXh0ZW5kXCIpO1xyXG5cclxuLyoqXHJcbiAqIEFuIGV2ZW50IGlzIGFueSBpbnRlcmFjdGFibGUgb3IgYW5pbWF0aW5nIG9iamVjdCBpbiB0aGUgZ2FtZS5cclxuICogVGhpcyBpbmNsdWRlcyB0aGluZ3MgcmFuZ2luZyBmcm9tIHNpZ25zLCB0byBwZW9wbGUvcG9rZW1vbi5cclxuICogQW4gZXZlbnQ6XHJcbiAqXHQtIFRha2VzIHVwIGF0IGxlYXN0IG9uZSB0aWxlIG9uIHRoZSBtYXBcclxuICpcdC0gQ2FuIGJlIGludGVyYWN0ZWQgd2l0aCBieSBpbi1nYW1lIHRhbGtpbmcgb3Igb24tc2NyZWVuIGNsaWNrXHJcbiAqXHQtIE1heSBiZSByZXByZXNlbnRlZCBpbi1nYW1lIGJ5IGEgc3ByaXRlXHJcbiAqXHQtIE1heSBkZWNpZGUsIHVwb24gY3JlYXRpb24sIHRvIG5vdCBhcHBlYXIgb24gdGhlIG1hcC5cclxuICovXHJcbmZ1bmN0aW9uIEV2ZW50KGJhc2UsIG9wdHMpIHtcclxuXHRFdmVudEVtaXR0ZXIuY2FsbCh0aGlzKTtcclxuXHRcclxuXHRleHRlbmQodGhpcywgYmFzZSwgb3B0cyk7XHJcblx0XHJcblx0dGhpcy5fbm9ybWFsaXplTG9jYXRpb24oKTtcclxuXHRcclxuXHRpZiAodGhpcy5vbkV2ZW50cykge1xyXG5cdFx0dmFyIGtleXMgPSBPYmplY3Qua2V5cyh0aGlzLm9uRXZlbnRzKTtcclxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHR0aGlzLm9uKGtleXNbaV0sIHRoaXMub25FdmVudHNba2V5c1tpXV0pO1xyXG5cdFx0fVxyXG5cdFx0ZGVsZXRlIHRoaXMub25FdmVudHM7XHJcblx0fVxyXG59XHJcbmluaGVyaXRzKEV2ZW50LCBFdmVudEVtaXR0ZXIpO1xyXG5leHRlbmQoRXZlbnQucHJvdG90eXBlLCB7XHJcblx0aWQgOiBudWxsLFxyXG5cdGVuYWJsZWQgOiBmYWxzZSxcclxuXHR2aXNpYmxlIDogdHJ1ZSxcclxuXHRcclxuXHRsb2NhdGlvbiA6IG51bGwsIC8vIEV2ZW50cyB3aXRoIGEgc2luZ2xlIGxvY2F0aW9uIGFyZSBvcHRpbWl6ZWQgZm9yIGl0XHJcblx0bG9jYXRpb25zIDogbnVsbCwgLy8gRXZlbnRzIHdpdGggbXVsdGlwbGUgbG9jYXRpb25zIGFyZSBvcHRpbWl6ZWQgZm9yIHRoYXQgYWxzb1xyXG5cdFxyXG5cdHRvU3RyaW5nIDogZnVuY3Rpb24oKSB7XHJcblx0XHRpZiAoIXRoaXMuaWQpIHJldHVybiBcIjxMb2NhbCBvciBVbm5hbWVkIEV2ZW50PlwiO1xyXG5cdFx0cmV0dXJuIHRoaXMuaWQ7XHJcblx0fSxcclxuXHRcclxuXHRzaG91bGRBcHBlYXIgOiBmdW5jdGlvbigpeyByZXR1cm4gdHJ1ZTsgfSxcclxuXHRjYW5XYWxrT24gOiBmdW5jdGlvbigpeyByZXR1cm4gdHJ1ZTsgfSxcclxuXHRcclxuXHQvKiogUmV0dXJucyBhbiBvYmplY3QgdG8gcmVwcmVzZW50IHRoaXMgZXZlbnQgaW4gM0Qgc3BhY2UsIG9yIG51bGwgaWYgdGhlcmUgc2hvdWxkbid0IGJlIG9uZS4gKi9cclxuXHRnZXRBdmF0YXIgOiBmdW5jdGlvbigpeyByZXR1cm4gbnVsbDsgfSxcclxuXHRcclxuXHRvbkV2ZW50cyA6IG51bGwsIC8vYSBvYmplY3QsIGV2ZW50LW5hbWVzIC0+IGZ1bmN0aW9ucyB0byBjYWxsLCB0byBiZSByZWdpc3RlcmVkIGluIGNvbnN0cnVjdG9yXHJcblx0XHJcblx0Y2FuTW92ZSA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0Ly9JZiB3ZSBvbmx5IGhhdmUgMSBsb2NhdGlvbiwgdGhlbiB3ZSBjYW4gbW92ZVxyXG5cdFx0cmV0dXJuICEhdGhpcy5sb2NhdGlvbiAmJiAhdGhpcy5sb2NhdGlvbnM7XHJcblx0fSxcclxuXHRcclxuXHRtb3ZlVG8gOiBmdW5jdGlvbih4LCB5KSB7XHJcblx0XHRpZiAoIXRoaXMuY2FuTW92ZSgpKVxyXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJUaGlzIGV2ZW50IGlzIGluIHNldmVyYWwgcGxhY2VzIGF0IG9uY2UsIGFuZCBjYW5ub3QgbW92ZVRvIVwiKTtcclxuXHRcdFxyXG5cdFx0Ly9UT0RPIHF1ZXVlIHVwIGEgbW92ZVxyXG5cdH0sXHJcblx0XHJcblx0X25vcm1hbGl6ZUxvY2F0aW9uIDogZnVuY3Rpb24oKSB7XHJcblx0XHRpZiAodGhpcy5sb2NhdGlvbikge1xyXG5cdFx0XHQvL0lmIHdlIGhhdmUgYSBzaW5ndWxhciBsb2NhdGlvbiBzZXRcclxuXHRcdFx0aWYgKHRoaXMubG9jYXRpb25zKSAvLyBBcyBsb25nIGFzIHdlIGRvbid0IGFsc28gaGF2ZSBhIGxpc3QsIGl0cyBmaW5lXHJcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiRXZlbnQgd2FzIGluaXRpYWxpemVkIHdpdGggYm90aCBsb2NhdGlvbiBhbmQgbG9jYXRpb25zISBUaGV5IGNhbm5vdCBiZSBib3RoIGRlZmluZWQhXCIpO1xyXG5cdFx0XHRcclxuXHRcdFx0dmFyIGxvYyA9IHRoaXMubG9jYXRpb247XHJcblx0XHRcdGlmICgkLmlzQXJyYXkobG9jKSAmJiBsb2MubGVuZ3RoID09IDIgJiYgdHlwZW9mIGxvY1swXSA9PSBcIm51bWJlclwiICYmIHR5cGVvZiBsb2NbMV0gPT0gXCJudW1iZXJcIikgXHJcblx0XHRcdHtcclxuXHRcdFx0XHRsb2MgPSBuZXcgVEhSRUUuVmVjdG9yMihsb2NbMF0sIGxvY1sxXSk7XHJcblx0XHRcdH0gXHJcblx0XHRcdGVsc2UgaWYgKCQuaXNBcnJheShsb2MpICYmIGxvYy5sZW5ndGggPT0gMyBcclxuXHRcdFx0XHQmJiB0eXBlb2YgbG9jWzBdID09IFwibnVtYmVyXCIgJiYgdHlwZW9mIGxvY1sxXSA9PSBcIm51bWJlclwiICYmIHR5cGVvZiBsb2NbMl0gPT0gXCJudW1iZXJcIikgXHJcblx0XHRcdHtcclxuXHRcdFx0XHRsb2MgPSBuZXcgVEhSRUUuVmVjdG9yMyhsb2NbMF0sIGxvY1sxXSwgbG9jWzJdKTtcclxuXHRcdFx0fSBcclxuXHRcdFx0ZWxzZSBpZiAoIShsb2MgaW5zdGFuY2VvZiBUSFJFRS5WZWN0b3IyIHx8IGxvYyBpbnN0YW5jZW9mIFRIUkVFLlZlY3RvcjMpKSBcclxuXHRcdFx0e1xyXG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcihcIkNvdWxkIG5vdCBub3JtYWxpemUgbG9jYXRpb24gb2YgXCIrdGhpcy5pZCtcIiFcIik7XHJcblx0XHRcdH1cclxuXHRcdFx0dGhpcy5sb2NhdGlvbiA9IGxvYztcclxuXHRcdFx0cmV0dXJuIDE7XHJcblx0XHR9XHJcblx0XHR2YXIgb3JnbG9jID0gdGhpcy5sb2NhdGlvbnM7XHJcblx0XHR2YXIgbG9jcyA9IG51bGw7XHJcblx0XHRcclxuXHRcdGlmICgkLmlzQXJyYXkob3JnbG9jKSkge1xyXG5cdFx0XHR2YXIgdHlwZSA9IG51bGwsIG5ld1R5cGUgPSBudWxsO1xyXG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IG9yZ2xvYy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRcdGlmICh0eXBlb2Ygb3JnbG9jW2ldID09IFwibnVtYmVyXCIpXHJcblx0XHRcdFx0XHRuZXdUeXBlID0gXCJudW1iZXJcIjtcclxuXHRcdFx0XHRlbHNlIGlmIChvcmdsb2NbaV0gaW5zdGFuY2VvZiBUSFJFRS5WZWN0b3IyKVxyXG5cdFx0XHRcdFx0bmV3VHlwZSA9IFwidmVjdG9yXCI7XHJcblx0XHRcdFx0ZWxzZSBpZiAob3JnbG9jW2ldIGluc3RhbmNlb2YgVEhSRUUuVmVjdG9yMylcclxuXHRcdFx0XHRcdG5ld1R5cGUgPSBcInZlY3RvclwiO1xyXG5cdFx0XHRcdGVsc2UgaWYgKCQuaXNBcnJheShvcmdsb2NbaV0pKVxyXG5cdFx0XHRcdFx0bmV3VHlwZSA9IFwiYXJyYXlcIjtcclxuXHRcdFx0XHRcclxuXHRcdFx0XHRpZiAoIXR5cGUpIHR5cGUgPSBuZXdUeXBlO1xyXG5cdFx0XHRcdGlmICh0eXBlICE9IG5ld1R5cGUpIHtcclxuXHRcdFx0XHRcdHRocm93IG5ldyBFcnJvcihcIkNvdWxkIG5vdCBub3JtYWxpemUgbG9jYXRpb25zIG9mIFwiK3RoaXMuaWQrXCIhXCIpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XHRpZiAodHlwZSA9PSBcIm51bWJlclwiKSBsb2NzID0gX19wYXJzZUFzTnVtYmVyQXJyYXkob3JnbG9jKTtcclxuXHRcdFx0aWYgKHR5cGUgPT0gXCJhcnJheVwiKSBsb2NzID0gX19wYXJzZUFzQXJyYXlBcnJheShvcmdsb2MpO1xyXG5cdFx0XHRpZiAodHlwZSA9PSBcInZlY3RvclwiKSBsb2NzID0gb3JnbG9jO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSBpZiAoJC5pc0Z1bmN0aW9uKG9yZ2xvYykpIHtcclxuXHRcdFx0bG9jcyA9IG9yZ2xvYy5jYWxsKHRoaXMpO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSBpZiAob3JnbG9jIGluc3RhbmNlb2YgVEhSRUUuVmVjdG9yMikge1xyXG5cdFx0XHRsb2NzID0gW29yZ2xvY107XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdGlmICghbG9jcyB8fCAhJC5pc0FycmF5KGxvY3MpIHx8IGxvY3MubGVuZ3RoID09IDApIFxyXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJDb3VsZCBub3Qgbm9ybWFsaXplIGxvY2F0aW9ucyBvZiBcIit0aGlzLmlkK1wiIVwiKTtcclxuXHRcdFxyXG5cdFx0dGhpcy5sb2NhdGlvbnMgPSBsb2NzO1xyXG5cdFx0dGhpcy5fbm9ybWFsaXplTG9jYXRpb24gPSBmdW5jdGlvbigpeyByZXR1cm4gbG9jcy5sZW5ndGg7IH07IC8vY2FuJ3Qgbm9ybWFsaXplIHR3aWNlXHJcblx0XHRyZXR1cm4gbG9jcy5sZW5ndGg7XHJcblx0XHRcclxuXHRcdGZ1bmN0aW9uIF9fcGFyc2VBc051bWJlckFycmF5KGwpIHtcclxuXHRcdFx0aWYgKGwubGVuZ3RoID09IDIpIC8vc2luZ2xlIHBvaW50IFt4LCB5XVxyXG5cdFx0XHRcdHJldHVybiBbbmV3IFRIUkVFLlZlY3RvcjIobFswXSwgbFsxXSldO1xyXG5cdFx0XHRpZiAobC5sZW5ndGggPT0gMykgLy9zaW5nbGUgcG9pbnQgW3gsIHksIHpdXHJcblx0XHRcdFx0cmV0dXJuIFtuZXcgVEhSRUUuVmVjdG9yMyhsWzBdLCBsWzFdLCBsWzJdKV07XHJcblx0XHRcdGlmIChsLmxlbmd0aCA9PSA0KSB7IC8vcmVjdGFuZ2xlIFt4LCB5LCB3LCBoXVxyXG5cdFx0XHRcdHZhciBuID0gW107XHJcblx0XHRcdFx0Zm9yICh2YXIgeCA9IGxbMF07IHggPCBsWzBdK2xbMl07IHgrKykge1xyXG5cdFx0XHRcdFx0Zm9yICh2YXIgeSA9IGxbMV07IHkgPCBsWzFdK2xbM107IHkrKykge1xyXG5cdFx0XHRcdFx0XHRuLnB1c2gobmV3IFRIUkVFLlZlY3RvcjIoeCwgeSkpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRyZXR1cm4gbjtcclxuXHRcdFx0fVxyXG5cdFx0XHRpZiAobC5sZW5ndGggPT0gNSkgeyAvL3JlY3RhbmdsZSBbeCwgeSwgeiwgdywgaF1cclxuXHRcdFx0XHR2YXIgbiA9IFtdO1xyXG5cdFx0XHRcdGZvciAodmFyIHggPSBsWzBdOyB4IDwgbFswXStsWzNdOyB4KyspIHtcclxuXHRcdFx0XHRcdGZvciAodmFyIHkgPSBsWzFdOyB5IDwgbFsxXStsWzRdOyB5KyspIHtcclxuXHRcdFx0XHRcdFx0bi5wdXNoKG5ldyBUSFJFRS5WZWN0b3IzKHgsIHksIGxbMl0pKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0cmV0dXJuIG47XHJcblx0XHRcdH1cclxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiQ291bGQgbm90IG5vcm1hbGl6ZSBsb2NhdGlvbihzKSBvZiBcIit0aGlzLmlkK1wiIVwiKTtcclxuXHRcdH1cclxuXHRcdGZ1bmN0aW9uIF9fcGFyc2VBc0FycmF5QXJyYXkobCkge1xyXG5cdFx0XHR2YXIgbiA9IFtdO1xyXG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGwubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0XHRmb3IgKHZhciBqID0gMDsgaiA8IGxbaV0ubGVuZ3RoOyBqKyspIHtcclxuXHRcdFx0XHRcdGlmICh0eXBlb2YgbFtpXVtqXSAhPSBcIm51bWJlclwiKVxyXG5cdFx0XHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJDb3VsZCBub3Qgbm9ybWFsaXplIGxvY2F0aW9uKHMpIG9mIFwiK3RoaXMuaWQrXCIhXCIpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRuLnB1c2goX19wYXJzZUFzTnVtYmVyQXJyYXkobFtpXSkpO1xyXG5cdFx0XHR9XHJcblx0XHRcdHJldHVybiBuO1xyXG5cdFx0fVxyXG5cdH0sXHJcblx0XHJcbn0pO1xyXG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50O1xyXG5cclxuRXZlbnQucHJvdG90eXBlLmFkZExpc3RlbmVyID1cclxuRXZlbnQucHJvdG90eXBlLm9uID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcclxuXHRpZiAoJC5pbkFycmF5KHR5cGUsIF9fRVZFTlRfVFlQRVNfXykgPT0gLTEpIHtcclxuXHRcdGNvbnNvbGUuZXJyb3IoXCJNYXAgRXZlbnRcIiwgdGhpcy50b1N0cmluZygpLCBcInJlZ2lzdGVyaW5nIGVtaXR0ZWQgZXZlbnQgdHlwZVwiLCBcclxuXHRcdFx0dHlwZSwgXCJ3aGljaCBpcyBub3QgYSB2YWxpZCBlbWl0dGVkIGV2ZW50IHR5cGUhXCIpO1xyXG5cdH1cclxuXHRFdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uLmNhbGwodGhpcywgdHlwZSwgbGlzdGVuZXIpO1xyXG59XHJcblxyXG4vLyBUaGUgZm9sbG93aW5nIGlzIGEgbGlzdCBvZiBldmVudHMgdGhlIGJhc2UgRXZlbnQgY2xhc3MgYW5kIGxpYnJhcnkgZW1pdFxyXG4vLyBUaGlzIGxpc3QgaXMgY2hlY2tlZCBhZ2FpbnN0IHdoZW4gcmVnaXN0ZXJpbmcgdG8gY2F0Y2ggbWlzc3BlbGxpbmdzLlxyXG52YXIgX19FVkVOVF9UWVBFU19fID0gW1xyXG5cdFwiZW50ZXJpbmctdGlsZVwiLCAvLyhmcm9tLWRpcikgXHJcblx0XHQvL2VtaXR0ZWQgdXBvbiB0aGUgcGxheWVyIGlzIGdpdmVuIHRoZSBnbyBhaGVhZCB0byBlbnRlciB0aGUgdGlsZSB0aGlzIGV2ZW50IG9jY3VwaWVzLlxyXG5cdFwiZW50ZXJlZC10aWxlXCIsIC8vKGZyb20tZGlyKVxyXG5cdFx0Ly9lbWl0dGVkIHVwb24gdGhlIHBsYXllciBsYW5kaW5nIG9uIHRoZSB0aWxlIHRoaXMgZXZlbnQgb2NjdXBpZXMuXHJcblx0XCJsZWF2aW5nLXRpbGVcIiwgLy8odG8tZGlyKVxyXG5cdFx0Ly9lbWl0dGVkIHVwb24gdGhlIHBsYXllciBpcyBnaXZlbiB0aGUgZ28gYWhlYWQgdG8gbGVhdmUgdGhlIHRpbGUgdGhpcyBldmVudCBvY2N1cGllcy5cclxuXHRcImxlZnQtdGlsZVwiLCAvLyh0by1kaXIpXHJcblx0XHQvL2VtaXR0ZWQgdXBvbiB0aGUgcGxheWVyIGNvbXBsZXRlbHkgbGVhdmluZyB0aGUgdGlsZSB0aGlzIGV2ZW50IG9jY3VwaWVzLlxyXG5cdFwiYnVtcGVkXCIsIC8vKGZyb20tZGlyKVxyXG5cdFx0Ly9lbWl0dGVkIHVwb24gdGhlIHBsYXllciBpcyBkZW5pZWQgZW50cnkgaW50byB0aGUgdGlsZSB0aGlzIGV2ZW50IG9jY3VwaWVzLlxyXG5cdFwiaW50ZXJhY3RlZFwiLCAvLyhmcm9tLWRpcilcclxuXHRcdC8vZW1pdHRlZCB3aGVuIHRoZSBwbGF5ZXIgaW50ZXJhY3RzIHdpdGggdGhpcyBldmVudCBmcm9tIGFuIGFkamFjZW50IHRpbGVcclxuXHRcInRpY2tcIiwgLy8oZGVsdGEpXHJcblx0XHQvL2VtaXR0ZWQgZXZlcnkgZ2FtZSB0aWNrXHJcblx0XCJjbGlja2VkXCIsIC8vKHgsIHkpXHJcblx0XHQvL2VtaXR0ZWQgd2hlbiB0aGUgbW91c2UgaXMgY2xpY2tlZCBvbiB0aGlzIGV2ZW50IChhbmQgaXQgaXMgZGV0ZXJtaW5lZCBpdCBpcyB0aGlzIGV2ZW50KVxyXG5cdFwiY2xpY2tlZC10aHJvdWdoXCIsIC8vKHgsIHkpXHJcblx0XHQvL2VtaXR0ZWQgd2hlbiB0aGUgbW91c2UgaXMgY2xpY2tlZCBvbiB0aGlzIGV2ZW50IChhbmQgdGhlIHJheXRyYWNlIGlzIHBhc3NpbmcgdGhyb3VnaCBcclxuXHRcdC8vIHRoaXMgZXZlbnQgZHVyaW5nIHRoZSBkZXRlcm1pbmluZyBwaGFzZSlcclxuXHRcIm1vdmluZ1wiLCAvLyhzcmNYLCBzcmNZLCBkZXN0WCwgZGVzdFkpXHJcblx0XHQvL2VtaXR0ZWQgd2hlbiB0aGlzIGV2ZW50IGJlZ2lucyBtb3ZpbmcgdG8gYSBuZXcgdGlsZVxyXG5cdFwibW92ZWRcIiwgLy8oc3JjWCwgc3JjWSwgZGVzdFgsIGRlc3RZKVxyXG5cdFx0Ly9lbWl0dGVkIHdoZW4gdGhpcyBldmVudCBmaW5pc2hlcyBtb3ZpbmcgdG8gYSBuZXcgdGlsZVxyXG5cdFwiY2FudC1tb3ZlXCIsIC8vKHNyY1gsIHNyY1ksIGRlc3RYLCBkZXN0WSwgcmVhc29uRXZlbnQpXHJcblx0XHQvL2VtaXR0ZWQgd2hlbiB0aGlzIGV2ZW50IGlzIGRlbmllZCBtb3ZlbWVudCB0byB0aGUgcmVxdWVzdGVkIHRpbGVcclxuXHRcdC8vIEl0IGlzIHBhc3NlZCB0aGUgZXZlbnQgYmxvY2tpbmcgaXQsIG9yIG51bGwgaWYgaXQgaXMgZHVlIHRvIHRoZSBjb2xsaXNpb24gbWFwXHJcblx0XCJhbmltLWVuZFwiLCAvLyhhbmltYXRpb25OYW1lKVxyXG5cdFx0Ly9lbWl0dGVkIHdoZW4gdGhpcyBldmVudCdzIGFuaW1hdGlvbiBlbmRzXHJcblx0XCJjcmVhdGVkXCIsIFxyXG5cdFx0Ly9lbWl0dGVkIHdoZW4gdGhpcyBldmVudCBpcyBhZGRlZCB0byB0aGUgZXZlbnQgbWFwXHJcblx0XCJkZXN0cm95ZWRcIixcclxuXHRcdC8vZW1pdHRlZCB3aGVuIHRoaXMgZXZlbnQgaGFzIGJlZW4gdGFrZW4gb3V0IG9mIHRoZSBldmVudCBtYXBcclxuXHRcInJlYWN0XCIsIC8vKGlkLCBkaXN0YW5jZSlcclxuXHRcdC8vZW1pdHRlZCB3aGVuIGFub3RoZXIgZXZlbnQgb24gdGhlIG1hcCB0cmFuc21pdHMgYSByZWFjdGFibGUgZXZlbnRcclxuXHRcIm1lc3NhZ2VcIiwgLy8oaWQsIC4uLilcclxuXHRcdC8vbmV2ZXIgZW1pdHRlZCBieSB0aGUgbGlicmFyeSwgdGhpcyBldmVudCB0eXBlIGNhbiBiZSB1c2VkIGZvciBjcm9zcy1ldmVudCBtZXNzYWdlc1xyXG5dO1xyXG4iLCIvLyBwbGF5ZXItY2hhcmFjdGVyLmpzXHJcbi8vIERlZmluZXMgdGhlIGNvbmNyZXRlIGNvZGUgZm9yIGEgUGxheWVyIENoYXJhY3RlciBpbiB0aGUgd29ybGRcclxuXHJcbnZhciBBY3RvciA9IHJlcXVpcmUoXCJ0cHAtYWN0b3JcIik7XHJcbnZhciBjb250cm9sbGVyID0gcmVxdWlyZShcInRwcC1jb250cm9sbGVyXCIpO1xyXG52YXIgaW5oZXJpdHMgPSByZXF1aXJlKFwiaW5oZXJpdHNcIik7XHJcbnZhciBleHRlbmQgPSByZXF1aXJlKFwiZXh0ZW5kXCIpO1xyXG5cclxuLyoqXHJcbiAqL1xyXG5mdW5jdGlvbiBQbGF5ZXJDaGFyKCl7XHJcblx0QWN0b3IuY2FsbCh0aGlzLCB7fSwge30pO1xyXG5cdFxyXG5cdHRoaXMub24oXCJ0aWNrXCIsIHRoaXMuY29udHJvbENoYXJhY3Rlcik7XHJcblx0dGhpcy5vbihcImNhbnQtbW92ZVwiLCB0aGlzLmFuaW1hdGVCdW1wKTtcclxufVxyXG5pbmhlcml0cyhQbGF5ZXJDaGFyLCBBY3Rvcik7XHJcbmV4dGVuZChQbGF5ZXJDaGFyLnByb3RvdHlwZSwge1xyXG5cdGlkIDogXCJQTEFZRVJDSEFSXCIsXHJcblx0bG9jYXRpb24gOiBuZXcgVEhSRUUuVmVjdG9yMygpLFxyXG5cdFxyXG5cdHNwcml0ZTogbnVsbCxcclxuXHRcclxuXHRyZXNldCA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0dGhpcy5sb2NhdGlvbi5zZXQoMCwgMCwgMCk7XHJcblx0fSxcclxuXHRcclxuXHR3YXJwQXdheSA6IGZ1bmN0aW9uKGFuaW1UeXBlKSB7XHJcblx0XHRjb25zb2xlLndhcm4oXCJ3YXJwQXdheSBpcyBub3QgeWV0IGltcGxlbWVudGVkIVwiKTtcclxuXHR9LFxyXG5cdFxyXG5cdHdhcnBUbyA6IGZ1bmN0aW9uKHdhcnBkZWYpIHtcclxuXHRcdHZhciBzZWxmID0gdGhpcztcclxuXHRcdHRoaXMubG9jYXRpb24uc2V0KHdhcnBkZWYubG9jWzBdLCB3YXJwZGVmLmxvY1sxXSwgd2FycGRlZi5sYXllcik7XHJcblx0XHRjb250cm9sbGVyLnB1c2hJbnB1dENvbnRleHQoXCJjdXRzY2VuZVwiKTtcclxuXHRcdC8vVE9ETyB3YXJwZGVmLmFuaW1cclxuXHRcdFxyXG5cdFx0c2V0VGltZW91dChmdW5jdGlvbigpe1xyXG5cdFx0XHRzd2l0Y2goTnVtYmVyKHdhcnBkZWYuYW5pbSkpIHsgLy9XYXJwIGFuaW1hdGlvblxyXG5cdFx0XHRcdGNhc2UgMTogc2VsZi5hdmF0YXJfbm9kZS5wb3NpdGlvbi56ICs9IDE7IGJyZWFrOyAvLyBXYWxrIHVwXHJcblx0XHRcdFx0Y2FzZSAyOiBzZWxmLmF2YXRhcl9ub2RlLnBvc2l0aW9uLnogLT0gMTsgYnJlYWs7IC8vIFdhbGsgZG93blxyXG5cdFx0XHRcdGNhc2UgMzogc2VsZi5hdmF0YXJfbm9kZS5wb3NpdGlvbi54IC09IDE7IGJyZWFrOyAvLyBXYWxrIGxlZnRcclxuXHRcdFx0XHRjYXNlIDQ6IHNlbGYuYXZhdGFyX25vZGUucG9zaXRpb24ueCArPSAxOyBicmVhazsgLy8gV2FsayBkb3duXHJcblx0XHRcdFx0Y2FzZSA1OiBzZWxmLmF2YXRhcl9ub2RlLnBvc2l0aW9uLnkgKz0gMTU7IGJyZWFrOyAvLyBXYXJwIGluXHJcblx0XHRcdH1cclxuXHRcdH0sIDApO1xyXG5cdFx0XHJcblx0XHRjdXJyZW50TWFwLnF1ZXVlRm9yTWFwU3RhcnQoZnVuY3Rpb24oKXtcclxuXHRcdFx0Y29uc29sZS5sb2coXCJXQVJQIERFRlwiLCB3YXJwZGVmKTtcclxuXHRcdFx0dmFyIGFuaW1OYW1lID0gbnVsbDtcclxuXHRcdFx0dmFyIHggPSBzZWxmLmxvY2F0aW9uLng7XHJcblx0XHRcdHZhciB5ID0gc2VsZi5sb2NhdGlvbi55O1xyXG5cdFx0XHR2YXIgbGF5ZXIgPSBzZWxmLmxvY2F0aW9uLno7XHJcblx0XHRcdHZhciB5X29mZiA9IDA7XHJcblx0XHRcdHZhciBtc3BkID0gMSwgYXNwZCA9IDE7IC8vbW92ZW1lbnQgc3BlZWQsIGFuaW1hdGlvbiBzcGVlZFxyXG5cdFx0XHRcclxuXHRcdFx0c3dpdGNoKE51bWJlcih3YXJwZGVmLmFuaW0pKSB7IC8vV2FycCBhbmltYXRpb25cclxuXHRcdFx0XHRjYXNlIDA6IGJyZWFrOyAvLyBBcHBlYXJcclxuXHRcdFx0XHRjYXNlIDE6IHkrKzsgYW5pbU5hbWUgPSBcIndhbGtcIjsgbXNwZCA9IDAuMzU7IGFzcGQgPSAwLjM1OyBicmVhazsgLy8gV2FsayB1cFxyXG5cdFx0XHRcdGNhc2UgMjogeS0tOyBhbmltTmFtZSA9IFwid2Fsa1wiOyBtc3BkID0gMC4zNTsgYXNwZCA9IDAuMzU7IGJyZWFrOyAvLyBXYWxrIGRvd25cclxuXHRcdFx0XHRjYXNlIDM6IHgtLTsgYW5pbU5hbWUgPSBcIndhbGtcIjsgbXNwZCA9IDAuMzU7IGFzcGQgPSAwLjM1OyBicmVhazsgLy8gV2FsayBsZWZ0XHJcblx0XHRcdFx0Y2FzZSA0OiB4Kys7IGFuaW1OYW1lID0gXCJ3YWxrXCI7IG1zcGQgPSAwLjM1OyBhc3BkID0gMC4zNTsgYnJlYWs7IC8vIFdhbGsgZG93blxyXG5cdFx0XHRcdGNhc2UgNTogLy8gV2FycCBpblxyXG5cdFx0XHRcdFx0YW5pbU5hbWUgPSBcIndhcnBfaW5cIjsgXHJcblx0XHRcdFx0XHR5X29mZiA9IDE1OyBcclxuXHRcdFx0XHRcdG1zcGQgPSAwLjI1OyBhc3BkID0gMTsgXHJcblx0XHRcdFx0XHRicmVhazsgXHJcblx0XHRcdFx0ZGVmYXVsdDogXHJcblx0XHRcdFx0XHRjb25zb2xlLndhcm4oXCJJTExFR0FMIFdBUlAgQU5JTUFUSU9OOlwiLCB3YXJwZGVmLmFuaW0pO1xyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHR2YXIgc3JjID0gc2VsZi5sb2NhdGlvbjtcclxuXHRcdFx0dmFyIHN0YXRlID0gc2VsZi5faW5pdFBhdGhpbmdTdGF0ZSgpO1xyXG5cdFx0XHRcclxuXHRcdFx0aWYgKHNyYy54LXggfHwgeS1zcmMueSkgXHJcblx0XHRcdFx0c2VsZi5mYWNpbmcuc2V0KHgtc3JjLngsIDAsIHNyYy55LXkpO1xyXG5cdFx0XHRlbHNlXHJcblx0XHRcdFx0c2VsZi5mYWNpbmcuc2V0KDAsIDAsIDEpO1xyXG5cdFx0XHRcclxuXHRcdFx0c3RhdGUuc3JjTG9jQy5zZXQoeCwgeSwgbGF5ZXIpO1xyXG5cdFx0XHRzdGF0ZS5zcmNMb2MzLnNldChjdXJyZW50TWFwLmdldDNEVGlsZUxvY2F0aW9uKHgsIHksIGxheWVyKSkueSArPSB5X29mZjtcclxuXHRcdFx0c3RhdGUuZGVzdExvY0Muc2V0KHNyYyk7XHJcblx0XHRcdHN0YXRlLmRlc3RMb2MzLnNldChjdXJyZW50TWFwLmdldDNEVGlsZUxvY2F0aW9uKHNyYykpO1xyXG5cdFx0XHRzdGF0ZS5kZWx0YSA9IDA7XHJcblx0XHRcdHN0YXRlLm1vdmluZyA9IHRydWU7XHJcblx0XHRcdHN0YXRlLnNwZWVkID0gbXNwZDtcclxuXHRcdFx0XHJcblx0XHRcdHNlbGYucGxheUFuaW1hdGlvbihhbmltTmFtZSwgeyBzcGVlZDogYXNwZCB9KTtcclxuXHRcdFx0c2VsZi5vbmNlKFwiYW5pbS1lbmRcIiwgZnVuY3Rpb24oYW5pbWF0aW9uTmFtZSl7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coXCJQb3AhXCIpO1xyXG5cdFx0XHRcdGNvbnRyb2xsZXIucG9wSW5wdXRDb250ZXh0KFwiY3V0c2NlbmVcIik7XHJcblx0XHRcdH0pO1xyXG5cdFx0XHQvL3NlbGYuYXZhdGFyX25vZGUucG9zaXRpb24uc2V0KCBjdXJyZW50TWFwLmdldDNEVGlsZUxvY2F0aW9uKHNlbGYubG9jYXRpb24pICk7XHJcblx0XHR9KTtcclxuXHR9LFxyXG5cdFxyXG5cdGNvbnRyb2xUaW1lb3V0OiAwLjAsXHJcblx0Y29udHJvbENoYXJhY3RlciA6IGZ1bmN0aW9uKGRlbHRhKSB7XHJcblx0XHR2YXIgeSA9ICgoY29udHJvbGxlci5pc0Rvd24oXCJVcFwiLCBcImdhbWVcIikpPyAtMTowKSArICgoY29udHJvbGxlci5pc0Rvd24oXCJEb3duXCIsIFwiZ2FtZVwiKSk/IDE6MCk7XHJcblx0XHR2YXIgeCA9ICgoY29udHJvbGxlci5pc0Rvd24oXCJMZWZ0XCIsIFwiZ2FtZVwiKSk/IC0xOjApICsgKChjb250cm9sbGVyLmlzRG93bihcIlJpZ2h0XCIsIFwiZ2FtZVwiKSk/IDE6MCk7XHJcblx0XHRcclxuXHRcdGlmIChjb250cm9sbGVyLmlzRG93bihcIkludGVyYWN0XCIsIFwiZ2FtZVwiKSAmJiAhdGhpcy5faW5pdFBhdGhpbmdTdGF0ZSgpLm1vdmluZykge1xyXG5cdFx0XHRjdXJyZW50TWFwLmRpc3BhdGNoKFxyXG5cdFx0XHRcdHRoaXMubG9jYXRpb24ueCAtIHRoaXMuZmFjaW5nLngsIHRoaXMubG9jYXRpb24ueSArIHRoaXMuZmFjaW5nLnosIFxyXG5cdFx0XHRcdFwiaW50ZXJhY3RlZFwiLCB0aGlzLmZhY2luZyk7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdGlmICgoeSB8fCB4KSAmJiAhKHggJiYgeSkpIHsgLy9vbmUsIGJ1dCBub3QgYm90aFxyXG5cdFx0XHRpZiAodGhpcy5jb250cm9sVGltZW91dCA8IDEpIHtcclxuXHRcdFx0XHR0aGlzLmNvbnRyb2xUaW1lb3V0ICs9IENPTkZJRy50aW1lb3V0LndhbGtDb250cm9sICogZGVsdGE7XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0aWYgKCF0aGlzLl9pbml0UGF0aGluZ1N0YXRlKCkubW92aW5nKSB7XHJcblx0XHRcdFx0XHR0aGlzLmZhY2VEaXIoeCwgeSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdGlmICghdGhpcy5faW5pdFBhdGhpbmdTdGF0ZSgpLm1vdmluZykge1xyXG5cdFx0XHRcdFx0dGhpcy5tb3ZlVG8odGhpcy5sb2NhdGlvbi54K3gsIHRoaXMubG9jYXRpb24ueSt5KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdGlmICh0aGlzLmNvbnRyb2xUaW1lb3V0ID4gMClcclxuXHRcdFx0XHR0aGlzLmNvbnRyb2xUaW1lb3V0IC09IENPTkZJRy50aW1lb3V0LndhbGtDb250cm9sICogZGVsdGE7XHJcblx0XHR9XHJcblx0XHRcclxuXHR9LFxyXG5cdFxyXG5cdGFuaW1hdGVCdW1wIDogZnVuY3Rpb24oc3JjeCwgc3JjeSwgeCwgeSwgcmVhc29uKSB7XHJcblx0XHQvLyBjb25zb2xlLndhcm4odGhpcy5pZCwgXCI6IENhbm5vdCB3YWxrIHRvIGxvY2F0aW9uXCIsIFwiKFwiK3grXCIsXCIreStcIilcIik7XHJcblx0XHR0aGlzLnBsYXlBbmltYXRpb24oXCJidW1wXCIsIHsgc3RvcE5leHRUcmFuc2l0aW9uOiB0cnVlIH0pO1xyXG5cdH0sXHJcblx0XHJcblx0XHJcblx0Ly8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblx0aXNOUEMgOiBmdW5jdGlvbigpeyByZXR1cm4gZmFsc2U7IH0sXHJcblx0XHJcblx0X2F2YXRhcl9sb2FkU3ByaXRlIDogZnVuY3Rpb24obWFwLCB0ZXh0dXJlKSB7XHJcblx0XHR2YXIgdXJsID0gQkFTRVVSTCtcIi9pbWcvcGNzL1wiKyBnYW1lU3RhdGUucGxheWVyU3ByaXRlO1xyXG5cdFx0dmFyIHJlcyA9IC9eKFteXFxbXSspXFxbKFteXFxdXSspXFxdLnBuZyQvLmV4ZWModXJsKTtcclxuXHRcdFxyXG5cdFx0dmFyIG5hbWUgPSByZXNbMV07XHJcblx0XHR2YXIgZm9ybWF0ID0gcmVzWzJdO1xyXG5cdFx0XHJcblx0XHR2YXIgaW1nID0gbmV3IEltYWdlKCk7XHJcblx0XHRmb3JtYXQgPSB0aGlzLmdldFNwcml0ZUZvcm1hdChmb3JtYXQpO1xyXG5cdFx0dGhpcy5fX29uTG9hZFNwcml0ZShpbWcsIGZvcm1hdCwgdGV4dHVyZSk7XHJcblx0XHRpbWcuc3JjID0gdXJsO1xyXG5cdH0sXHJcblx0XHJcblx0Ly8gTmV1dGVyIHRoZSBsb2NhdGlvbiBub3JtaWxpemF0aW9uIGZvciB0aGlzIGtpbmQgb2YgZXZlbnRcclxuXHRfbm9ybWFsaXplTG9jYXRpb24gOiBmdW5jdGlvbigpIHt9LFxyXG5cdFxyXG59KTtcclxubW9kdWxlLmV4cG9ydHMgPSBQbGF5ZXJDaGFyO1xyXG4iLCIvLyB0cmlnZ2VyLmpzXHJcbi8vIERlZmluZXMgYSB0cmlnZ2VyIHRpbGUocykgdXNlZCB0aHJvdWdob3V0IHRoZSBwYXJrXHJcblxyXG52YXIgRXZlbnQgPSByZXF1aXJlKFwidHBwLWV2ZW50XCIpO1xyXG52YXIgaW5oZXJpdHMgPSByZXF1aXJlKFwiaW5oZXJpdHNcIik7XHJcbnZhciBleHRlbmQgPSByZXF1aXJlKFwiZXh0ZW5kXCIpO1xyXG5cclxuLyoqXHJcbiAqIEEgdHJpZ2dlciBpcyBhIHRpbGUgdGhhdCwgd2hlbiBzdGVwcGVkIHVwb24sIHdpbGwgdHJpZ2dlciBzb21lIGV2ZW50LlxyXG4gKiBUaGUgbW9zdCBjb21tb24gZXZlbnQgdGlnZ2VyZWQgaXMgYSB3YXJwaW5nIHRvIGFub3RoZXIgbWFwLCBmb3Igd2hpY2hcclxuICogdGhlIHN1YmNsYXNzIFdhcnAgaXMgZGVzaWduZWQgZm9yLlxyXG4gKlxyXG4gKiBUcmlnZ2VycyBtYXkgdGFrZSB1cCBtb3JlIHRoYW4gb25lIHNwYWNlLlxyXG4gKi9cclxuZnVuY3Rpb24gVHJpZ2dlcihiYXNlLCBvcHRzKSB7XHJcblx0RXZlbnQuY2FsbCh0aGlzLCBiYXNlLCBvcHRzKTtcclxuXHRcclxuXHR0aGlzLm9uKFwiZW50ZXJlZC10aWxlXCIsIHRoaXMub25UcmlnZ2VyRW50ZXIpO1xyXG5cdHRoaXMub24oXCJsZWF2aW5nLXRpbGVcIiwgdGhpcy5vblRyaWdnZXJMZWF2ZSk7XHJcbn1cclxuaW5oZXJpdHMoVHJpZ2dlciwgRXZlbnQpO1xyXG5leHRlbmQoVHJpZ2dlci5wcm90b3R5cGUsIHtcclxuXHRcclxuXHRvblRyaWdnZXJFbnRlciA6IGZ1bmN0aW9uKGRpcikge1xyXG5cdFx0Y29uc29sZS5sb2coXCJUcmlnZ2VyZWQhXCIpO1xyXG5cdH0sXHJcblx0b25UcmlnZ2VyTGVhdmUgOiBmdW5jdGlvbihkaXIpIHtcclxuXHRcdFxyXG5cdH0sXHJcbn0pO1xyXG5tb2R1bGUuZXhwb3J0cyA9IFRyaWdnZXI7XHJcbiIsIi8vIHdhcnAuanNcclxuLy8gRGVmaW5lcyBhIHdhcnAgdGlsZSB1c2VkIHRocm91Z2hvdXQgdGhlIHBhcmsuXHJcblxyXG52YXIgVHJpZ2dlciA9IHJlcXVpcmUoXCJ0cHAtdHJpZ2dlclwiKTtcclxudmFyIGluaGVyaXRzID0gcmVxdWlyZShcImluaGVyaXRzXCIpO1xyXG52YXIgZXh0ZW5kID0gcmVxdWlyZShcImV4dGVuZFwiKTtcclxuXHJcbi8qKlxyXG4gKiBBIHdhcnAgaXMgYW4gZXZlbnQgdGhhdCwgd2hlbiB3YWxrZWQgdXBvbiwgd2lsbCB0YWtlIHRoZSBwbGF5ZXIgdG8gYW5vdGhlciBtYXAgb3JcclxuICogYXJlYSB3aXRoaW4gdGhlIHNhbWUgbWFwLiBEaWZmZXJlbnQgdHlwZXMgb2Ygd2FycHMgZXhpc3QsIHJhbmdpbmcgZnJvbSB0aGUgc3RhbmRhcmRcclxuICogZG9vciB3YXJwIHRvIHRoZSB0ZWxlcG9ydCB3YXJwLiBXYXJwcyBjYW4gYmUgdG9sZCB0byBhY3RpdmF0ZSB1cG9uIHN0ZXBwaW5nIHVwb24gdGhlbVxyXG4gKiBvciBhY3RpdmF0ZSB1cG9uIHN0ZXBwaW5nIG9mZiBhIGNlcnRhaW4gZGlyZWN0aW9uLlxyXG4gKi9cclxuZnVuY3Rpb24gV2FycChiYXNlLCBvcHRzKSB7XHJcblx0VHJpZ2dlci5jYWxsKHRoaXMsIGJhc2UsIG9wdHMpO1xyXG5cdFxyXG59XHJcbmluaGVyaXRzKFdhcnAsIFRyaWdnZXIpO1xyXG5leHRlbmQoV2FycC5wcm90b3R5cGUsIHtcclxuXHRzb3VuZDogXCJleGl0X3dhbGtcIixcclxuXHRcclxuXHRvblRyaWdnZXJFbnRlciA6IGZ1bmN0aW9uKGRpcikge1xyXG5cdFx0U291bmRNYW5hZ2VyLnBsYXlTb3VuZCh0aGlzLnNvdW5kKTtcclxuXHR9LFxyXG59KTtcclxubW9kdWxlLmV4cG9ydHMgPSBXYXJwOyJdfQ==
