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
		
		if (!warpdef.anim)
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
			var animEndEvent = "anim-end";
			
			switch(Number(warpdef.anim)) { //Warp animation
				case 0: break; // Appear
				case 1: y++; animName = "walk"; mspd = 0.35; aspd = 0.35; break; // Walk up
				case 2: y--; animName = "walk"; mspd = 0.35; aspd = 0.35; break; // Walk down
				case 3: x--; animName = "walk"; mspd = 0.35; aspd = 0.35; break; // Walk left
				case 4: x++; animName = "walk"; mspd = 0.35; aspd = 0.35; break; // Walk down
				case 5: // Warp in
					animName = "warp_in"; 
					y_off = 15; animEndEvent = "moved";
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlc1xcYnJvd3NlcmlmeVxcbm9kZV9tb2R1bGVzXFxicm93c2VyLXBhY2tcXF9wcmVsdWRlLmpzIiwibm9kZV9tb2R1bGVzXFxicm93c2VyaWZ5XFxub2RlX21vZHVsZXNcXGV2ZW50c1xcZXZlbnRzLmpzIiwibm9kZV9tb2R1bGVzXFxleHRlbmRcXGluZGV4LmpzIiwibm9kZV9tb2R1bGVzXFxpbmhlcml0c1xcaW5oZXJpdHNfYnJvd3Nlci5qcyIsInNyY1xcanNcXG1vZGVsXFxzcHJpdGVtb2RlbC5qcyIsInNyY1xcanNcXGV2ZW50c1xcYWN0b3JfYW5pbWF0aW9ucyIsInNyY1xcanNcXGV2ZW50c1xcYWN0b3IiLCJzcmNcXGpzXFxldmVudHNcXGJlaGF2aW9yIiwic3JjXFxqc1xcbWFuYWdlcnNcXGNvbnRyb2xsZXIiLCJzcmNcXGpzXFxldmVudHNcXGV2ZW50Iiwic3JjXFxqc1xcZXZlbnRzXFxwbGF5ZXItY2hhcmFjdGVyIiwic3JjXFxqc1xcZXZlbnRzXFx0cmlnZ2VyIiwic3JjXFxqc1xcZXZlbnRzXFx3YXJwIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3U0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3U0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDek5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG5mdW5jdGlvbiBFdmVudEVtaXR0ZXIoKSB7XG4gIHRoaXMuX2V2ZW50cyA9IHRoaXMuX2V2ZW50cyB8fCB7fTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gdGhpcy5fbWF4TGlzdGVuZXJzIHx8IHVuZGVmaW5lZDtcbn1cbm1vZHVsZS5leHBvcnRzID0gRXZlbnRFbWl0dGVyO1xuXG4vLyBCYWNrd2FyZHMtY29tcGF0IHdpdGggbm9kZSAwLjEwLnhcbkV2ZW50RW1pdHRlci5FdmVudEVtaXR0ZXIgPSBFdmVudEVtaXR0ZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX2V2ZW50cyA9IHVuZGVmaW5lZDtcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX21heExpc3RlbmVycyA9IHVuZGVmaW5lZDtcblxuLy8gQnkgZGVmYXVsdCBFdmVudEVtaXR0ZXJzIHdpbGwgcHJpbnQgYSB3YXJuaW5nIGlmIG1vcmUgdGhhbiAxMCBsaXN0ZW5lcnMgYXJlXG4vLyBhZGRlZCB0byBpdC4gVGhpcyBpcyBhIHVzZWZ1bCBkZWZhdWx0IHdoaWNoIGhlbHBzIGZpbmRpbmcgbWVtb3J5IGxlYWtzLlxuRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnMgPSAxMDtcblxuLy8gT2J2aW91c2x5IG5vdCBhbGwgRW1pdHRlcnMgc2hvdWxkIGJlIGxpbWl0ZWQgdG8gMTAuIFRoaXMgZnVuY3Rpb24gYWxsb3dzXG4vLyB0aGF0IHRvIGJlIGluY3JlYXNlZC4gU2V0IHRvIHplcm8gZm9yIHVubGltaXRlZC5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuc2V0TWF4TGlzdGVuZXJzID0gZnVuY3Rpb24obikge1xuICBpZiAoIWlzTnVtYmVyKG4pIHx8IG4gPCAwIHx8IGlzTmFOKG4pKVxuICAgIHRocm93IFR5cGVFcnJvcignbiBtdXN0IGJlIGEgcG9zaXRpdmUgbnVtYmVyJyk7XG4gIHRoaXMuX21heExpc3RlbmVycyA9IG47XG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgZXIsIGhhbmRsZXIsIGxlbiwgYXJncywgaSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIElmIHRoZXJlIGlzIG5vICdlcnJvcicgZXZlbnQgbGlzdGVuZXIgdGhlbiB0aHJvdy5cbiAgaWYgKHR5cGUgPT09ICdlcnJvcicpIHtcbiAgICBpZiAoIXRoaXMuX2V2ZW50cy5lcnJvciB8fFxuICAgICAgICAoaXNPYmplY3QodGhpcy5fZXZlbnRzLmVycm9yKSAmJiAhdGhpcy5fZXZlbnRzLmVycm9yLmxlbmd0aCkpIHtcbiAgICAgIGVyID0gYXJndW1lbnRzWzFdO1xuICAgICAgaWYgKGVyIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgdGhyb3cgZXI7IC8vIFVuaGFuZGxlZCAnZXJyb3InIGV2ZW50XG4gICAgICB9XG4gICAgICB0aHJvdyBUeXBlRXJyb3IoJ1VuY2F1Z2h0LCB1bnNwZWNpZmllZCBcImVycm9yXCIgZXZlbnQuJyk7XG4gICAgfVxuICB9XG5cbiAgaGFuZGxlciA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNVbmRlZmluZWQoaGFuZGxlcikpXG4gICAgcmV0dXJuIGZhbHNlO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGhhbmRsZXIpKSB7XG4gICAgc3dpdGNoIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAvLyBmYXN0IGNhc2VzXG4gICAgICBjYXNlIDE6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDI6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0pO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICAvLyBzbG93ZXJcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgaGFuZGxlci5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAoaXNPYmplY3QoaGFuZGxlcikpIHtcbiAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgZm9yIChpID0gMTsgaSA8IGxlbjsgaSsrKVxuICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG5cbiAgICBsaXN0ZW5lcnMgPSBoYW5kbGVyLnNsaWNlKCk7XG4gICAgbGVuID0gbGlzdGVuZXJzLmxlbmd0aDtcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpKyspXG4gICAgICBsaXN0ZW5lcnNbaV0uYXBwbHkodGhpcywgYXJncyk7XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gVG8gYXZvaWQgcmVjdXJzaW9uIGluIHRoZSBjYXNlIHRoYXQgdHlwZSA9PT0gXCJuZXdMaXN0ZW5lclwiISBCZWZvcmVcbiAgLy8gYWRkaW5nIGl0IHRvIHRoZSBsaXN0ZW5lcnMsIGZpcnN0IGVtaXQgXCJuZXdMaXN0ZW5lclwiLlxuICBpZiAodGhpcy5fZXZlbnRzLm5ld0xpc3RlbmVyKVxuICAgIHRoaXMuZW1pdCgnbmV3TGlzdGVuZXInLCB0eXBlLFxuICAgICAgICAgICAgICBpc0Z1bmN0aW9uKGxpc3RlbmVyLmxpc3RlbmVyKSA/XG4gICAgICAgICAgICAgIGxpc3RlbmVyLmxpc3RlbmVyIDogbGlzdGVuZXIpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIC8vIE9wdGltaXplIHRoZSBjYXNlIG9mIG9uZSBsaXN0ZW5lci4gRG9uJ3QgbmVlZCB0aGUgZXh0cmEgYXJyYXkgb2JqZWN0LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IGxpc3RlbmVyO1xuICBlbHNlIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIC8vIElmIHdlJ3ZlIGFscmVhZHkgZ290IGFuIGFycmF5LCBqdXN0IGFwcGVuZC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0ucHVzaChsaXN0ZW5lcik7XG4gIGVsc2VcbiAgICAvLyBBZGRpbmcgdGhlIHNlY29uZCBlbGVtZW50LCBuZWVkIHRvIGNoYW5nZSB0byBhcnJheS5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBbdGhpcy5fZXZlbnRzW3R5cGVdLCBsaXN0ZW5lcl07XG5cbiAgLy8gQ2hlY2sgZm9yIGxpc3RlbmVyIGxlYWtcbiAgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkgJiYgIXRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQpIHtcbiAgICB2YXIgbTtcbiAgICBpZiAoIWlzVW5kZWZpbmVkKHRoaXMuX21heExpc3RlbmVycykpIHtcbiAgICAgIG0gPSB0aGlzLl9tYXhMaXN0ZW5lcnM7XG4gICAgfSBlbHNlIHtcbiAgICAgIG0gPSBFdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycztcbiAgICB9XG5cbiAgICBpZiAobSAmJiBtID4gMCAmJiB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoID4gbSkge1xuICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCA9IHRydWU7XG4gICAgICBjb25zb2xlLmVycm9yKCcobm9kZSkgd2FybmluZzogcG9zc2libGUgRXZlbnRFbWl0dGVyIG1lbW9yeSAnICtcbiAgICAgICAgICAgICAgICAgICAgJ2xlYWsgZGV0ZWN0ZWQuICVkIGxpc3RlbmVycyBhZGRlZC4gJyArXG4gICAgICAgICAgICAgICAgICAgICdVc2UgZW1pdHRlci5zZXRNYXhMaXN0ZW5lcnMoKSB0byBpbmNyZWFzZSBsaW1pdC4nLFxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoKTtcbiAgICAgIGlmICh0eXBlb2YgY29uc29sZS50cmFjZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAvLyBub3Qgc3VwcG9ydGVkIGluIElFIDEwXG4gICAgICAgIGNvbnNvbGUudHJhY2UoKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub24gPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uY2UgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgdmFyIGZpcmVkID0gZmFsc2U7XG5cbiAgZnVuY3Rpb24gZygpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGcpO1xuXG4gICAgaWYgKCFmaXJlZCkge1xuICAgICAgZmlyZWQgPSB0cnVlO1xuICAgICAgbGlzdGVuZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gIH1cblxuICBnLmxpc3RlbmVyID0gbGlzdGVuZXI7XG4gIHRoaXMub24odHlwZSwgZyk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vLyBlbWl0cyBhICdyZW1vdmVMaXN0ZW5lcicgZXZlbnQgaWZmIHRoZSBsaXN0ZW5lciB3YXMgcmVtb3ZlZFxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBsaXN0LCBwb3NpdGlvbiwgbGVuZ3RoLCBpO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIGxpc3QgPSB0aGlzLl9ldmVudHNbdHlwZV07XG4gIGxlbmd0aCA9IGxpc3QubGVuZ3RoO1xuICBwb3NpdGlvbiA9IC0xO1xuXG4gIGlmIChsaXN0ID09PSBsaXN0ZW5lciB8fFxuICAgICAgKGlzRnVuY3Rpb24obGlzdC5saXN0ZW5lcikgJiYgbGlzdC5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcblxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGxpc3QpKSB7XG4gICAgZm9yIChpID0gbGVuZ3RoOyBpLS0gPiAwOykge1xuICAgICAgaWYgKGxpc3RbaV0gPT09IGxpc3RlbmVyIHx8XG4gICAgICAgICAgKGxpc3RbaV0ubGlzdGVuZXIgJiYgbGlzdFtpXS5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgICAgIHBvc2l0aW9uID0gaTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHBvc2l0aW9uIDwgMClcbiAgICAgIHJldHVybiB0aGlzO1xuXG4gICAgaWYgKGxpc3QubGVuZ3RoID09PSAxKSB7XG4gICAgICBsaXN0Lmxlbmd0aCA9IDA7XG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIH0gZWxzZSB7XG4gICAgICBsaXN0LnNwbGljZShwb3NpdGlvbiwgMSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIga2V5LCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgLy8gbm90IGxpc3RlbmluZyBmb3IgcmVtb3ZlTGlzdGVuZXIsIG5vIG5lZWQgdG8gZW1pdFxuICBpZiAoIXRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcikge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKVxuICAgICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgZWxzZSBpZiAodGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIGVtaXQgcmVtb3ZlTGlzdGVuZXIgZm9yIGFsbCBsaXN0ZW5lcnMgb24gYWxsIGV2ZW50c1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgIGZvciAoa2V5IGluIHRoaXMuX2V2ZW50cykge1xuICAgICAgaWYgKGtleSA9PT0gJ3JlbW92ZUxpc3RlbmVyJykgY29udGludWU7XG4gICAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycyhrZXkpO1xuICAgIH1cbiAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycygncmVtb3ZlTGlzdGVuZXInKTtcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGxpc3RlbmVycyA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNGdW5jdGlvbihsaXN0ZW5lcnMpKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnMpO1xuICB9IGVsc2Uge1xuICAgIC8vIExJRk8gb3JkZXJcbiAgICB3aGlsZSAobGlzdGVuZXJzLmxlbmd0aClcbiAgICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzW2xpc3RlbmVycy5sZW5ndGggLSAxXSk7XG4gIH1cbiAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IFtdO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gW3RoaXMuX2V2ZW50c1t0eXBlXV07XG4gIGVsc2VcbiAgICByZXQgPSB0aGlzLl9ldmVudHNbdHlwZV0uc2xpY2UoKTtcbiAgcmV0dXJuIHJldDtcbn07XG5cbkV2ZW50RW1pdHRlci5saXN0ZW5lckNvdW50ID0gZnVuY3Rpb24oZW1pdHRlciwgdHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIWVtaXR0ZXIuX2V2ZW50cyB8fCAhZW1pdHRlci5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IDA7XG4gIGVsc2UgaWYgKGlzRnVuY3Rpb24oZW1pdHRlci5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSAxO1xuICBlbHNlXG4gICAgcmV0ID0gZW1pdHRlci5fZXZlbnRzW3R5cGVdLmxlbmd0aDtcbiAgcmV0dXJuIHJldDtcbn07XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnZnVuY3Rpb24nO1xufVxuXG5mdW5jdGlvbiBpc051bWJlcihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdudW1iZXInO1xufVxuXG5mdW5jdGlvbiBpc09iamVjdChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnICYmIGFyZyAhPT0gbnVsbDtcbn1cblxuZnVuY3Rpb24gaXNVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IHZvaWQgMDtcbn1cbiIsInZhciBoYXNPd24gPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5O1xudmFyIHRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcbnZhciB1bmRlZmluZWQ7XG5cbnZhciBpc1BsYWluT2JqZWN0ID0gZnVuY3Rpb24gaXNQbGFpbk9iamVjdChvYmopIHtcblx0J3VzZSBzdHJpY3QnO1xuXHRpZiAoIW9iaiB8fCB0b1N0cmluZy5jYWxsKG9iaikgIT09ICdbb2JqZWN0IE9iamVjdF0nKSB7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cblx0dmFyIGhhc19vd25fY29uc3RydWN0b3IgPSBoYXNPd24uY2FsbChvYmosICdjb25zdHJ1Y3RvcicpO1xuXHR2YXIgaGFzX2lzX3Byb3BlcnR5X29mX21ldGhvZCA9IG9iai5jb25zdHJ1Y3RvciAmJiBvYmouY29uc3RydWN0b3IucHJvdG90eXBlICYmIGhhc093bi5jYWxsKG9iai5jb25zdHJ1Y3Rvci5wcm90b3R5cGUsICdpc1Byb3RvdHlwZU9mJyk7XG5cdC8vIE5vdCBvd24gY29uc3RydWN0b3IgcHJvcGVydHkgbXVzdCBiZSBPYmplY3Rcblx0aWYgKG9iai5jb25zdHJ1Y3RvciAmJiAhaGFzX293bl9jb25zdHJ1Y3RvciAmJiAhaGFzX2lzX3Byb3BlcnR5X29mX21ldGhvZCkge1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXG5cdC8vIE93biBwcm9wZXJ0aWVzIGFyZSBlbnVtZXJhdGVkIGZpcnN0bHksIHNvIHRvIHNwZWVkIHVwLFxuXHQvLyBpZiBsYXN0IG9uZSBpcyBvd24sIHRoZW4gYWxsIHByb3BlcnRpZXMgYXJlIG93bi5cblx0dmFyIGtleTtcblx0Zm9yIChrZXkgaW4gb2JqKSB7fVxuXG5cdHJldHVybiBrZXkgPT09IHVuZGVmaW5lZCB8fCBoYXNPd24uY2FsbChvYmosIGtleSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGV4dGVuZCgpIHtcblx0J3VzZSBzdHJpY3QnO1xuXHR2YXIgb3B0aW9ucywgbmFtZSwgc3JjLCBjb3B5LCBjb3B5SXNBcnJheSwgY2xvbmUsXG5cdFx0dGFyZ2V0ID0gYXJndW1lbnRzWzBdLFxuXHRcdGkgPSAxLFxuXHRcdGxlbmd0aCA9IGFyZ3VtZW50cy5sZW5ndGgsXG5cdFx0ZGVlcCA9IGZhbHNlO1xuXG5cdC8vIEhhbmRsZSBhIGRlZXAgY29weSBzaXR1YXRpb25cblx0aWYgKHR5cGVvZiB0YXJnZXQgPT09ICdib29sZWFuJykge1xuXHRcdGRlZXAgPSB0YXJnZXQ7XG5cdFx0dGFyZ2V0ID0gYXJndW1lbnRzWzFdIHx8IHt9O1xuXHRcdC8vIHNraXAgdGhlIGJvb2xlYW4gYW5kIHRoZSB0YXJnZXRcblx0XHRpID0gMjtcblx0fSBlbHNlIGlmICgodHlwZW9mIHRhcmdldCAhPT0gJ29iamVjdCcgJiYgdHlwZW9mIHRhcmdldCAhPT0gJ2Z1bmN0aW9uJykgfHwgdGFyZ2V0ID09IG51bGwpIHtcblx0XHR0YXJnZXQgPSB7fTtcblx0fVxuXG5cdGZvciAoOyBpIDwgbGVuZ3RoOyArK2kpIHtcblx0XHRvcHRpb25zID0gYXJndW1lbnRzW2ldO1xuXHRcdC8vIE9ubHkgZGVhbCB3aXRoIG5vbi1udWxsL3VuZGVmaW5lZCB2YWx1ZXNcblx0XHRpZiAob3B0aW9ucyAhPSBudWxsKSB7XG5cdFx0XHQvLyBFeHRlbmQgdGhlIGJhc2Ugb2JqZWN0XG5cdFx0XHRmb3IgKG5hbWUgaW4gb3B0aW9ucykge1xuXHRcdFx0XHRzcmMgPSB0YXJnZXRbbmFtZV07XG5cdFx0XHRcdGNvcHkgPSBvcHRpb25zW25hbWVdO1xuXG5cdFx0XHRcdC8vIFByZXZlbnQgbmV2ZXItZW5kaW5nIGxvb3Bcblx0XHRcdFx0aWYgKHRhcmdldCA9PT0gY29weSkge1xuXHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gUmVjdXJzZSBpZiB3ZSdyZSBtZXJnaW5nIHBsYWluIG9iamVjdHMgb3IgYXJyYXlzXG5cdFx0XHRcdGlmIChkZWVwICYmIGNvcHkgJiYgKGlzUGxhaW5PYmplY3QoY29weSkgfHwgKGNvcHlJc0FycmF5ID0gQXJyYXkuaXNBcnJheShjb3B5KSkpKSB7XG5cdFx0XHRcdFx0aWYgKGNvcHlJc0FycmF5KSB7XG5cdFx0XHRcdFx0XHRjb3B5SXNBcnJheSA9IGZhbHNlO1xuXHRcdFx0XHRcdFx0Y2xvbmUgPSBzcmMgJiYgQXJyYXkuaXNBcnJheShzcmMpID8gc3JjIDogW107XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdGNsb25lID0gc3JjICYmIGlzUGxhaW5PYmplY3Qoc3JjKSA/IHNyYyA6IHt9O1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdC8vIE5ldmVyIG1vdmUgb3JpZ2luYWwgb2JqZWN0cywgY2xvbmUgdGhlbVxuXHRcdFx0XHRcdHRhcmdldFtuYW1lXSA9IGV4dGVuZChkZWVwLCBjbG9uZSwgY29weSk7XG5cblx0XHRcdFx0Ly8gRG9uJ3QgYnJpbmcgaW4gdW5kZWZpbmVkIHZhbHVlc1xuXHRcdFx0XHR9IGVsc2UgaWYgKGNvcHkgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRcdHRhcmdldFtuYW1lXSA9IGNvcHk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHQvLyBSZXR1cm4gdGhlIG1vZGlmaWVkIG9iamVjdFxuXHRyZXR1cm4gdGFyZ2V0O1xufTtcblxuIiwiaWYgKHR5cGVvZiBPYmplY3QuY3JlYXRlID09PSAnZnVuY3Rpb24nKSB7XG4gIC8vIGltcGxlbWVudGF0aW9uIGZyb20gc3RhbmRhcmQgbm9kZS5qcyAndXRpbCcgbW9kdWxlXG4gIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaW5oZXJpdHMoY3Rvciwgc3VwZXJDdG9yKSB7XG4gICAgY3Rvci5zdXBlcl8gPSBzdXBlckN0b3JcbiAgICBjdG9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoc3VwZXJDdG9yLnByb3RvdHlwZSwge1xuICAgICAgY29uc3RydWN0b3I6IHtcbiAgICAgICAgdmFsdWU6IGN0b3IsXG4gICAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgICB9XG4gICAgfSk7XG4gIH07XG59IGVsc2Uge1xuICAvLyBvbGQgc2Nob29sIHNoaW0gZm9yIG9sZCBicm93c2Vyc1xuICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGluaGVyaXRzKGN0b3IsIHN1cGVyQ3Rvcikge1xuICAgIGN0b3Iuc3VwZXJfID0gc3VwZXJDdG9yXG4gICAgdmFyIFRlbXBDdG9yID0gZnVuY3Rpb24gKCkge31cbiAgICBUZW1wQ3Rvci5wcm90b3R5cGUgPSBzdXBlckN0b3IucHJvdG90eXBlXG4gICAgY3Rvci5wcm90b3R5cGUgPSBuZXcgVGVtcEN0b3IoKVxuICAgIGN0b3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gY3RvclxuICB9XG59XG4iLCIvLyBzcHJpdGVtb2RlbC5qc1xyXG4vLyBBIHJlZHV4IG9mIHRoZSBUSFJFRS5qcyBzcHJpdGUsIGJ1dCBub3QgdXNpbmcgdGhlIHNwcml0ZSBwbHVnaW5cclxuXHJcbnZhciBpbmhlcml0cyA9IHJlcXVpcmUoXCJpbmhlcml0c1wiKTtcclxudmFyIGV4dGVuZCA9IHJlcXVpcmUoXCJleHRlbmRcIik7XHJcblxyXG5mdW5jdGlvbiBDaGFyYWN0ZXJTcHJpdGUob3B0cykge1xyXG5cdGlmICghKHRoaXMgaW5zdGFuY2VvZiBDaGFyYWN0ZXJTcHJpdGUpKSB7XHJcblx0XHRyZXR1cm4gbmV3IENoYXJhY3RlclNwcml0ZShvcHRzKTtcclxuXHR9XHJcblx0dmFyIGdjID0gb3B0cy5nYyB8fCBHQy5nZXRCaW4oKTtcclxuXHRcclxuXHRvcHRzID0gZXh0ZW5kKHtcclxuXHRcdHRyYW5zcGFyZW50OiB0cnVlLFxyXG5cdFx0YWxwaGFUZXN0OiB0cnVlLFxyXG5cdH0sIG9wdHMpO1xyXG5cdFxyXG5cdGlmICghb3B0cy5vZmZzZXQpIG9wdHMub2Zmc2V0ID0gbmV3IFRIUkVFLlZlY3RvcjMoMCwgMCwgMCk7XHJcblx0XHJcblx0Ly9UT0RPIHJlcGxhY2Ugd2l0aCBnZW9tZXRyeSB3ZSBjYW4gY29udHJvbFxyXG5cdC8vIHZhciBnZW9tID0gbmV3IFRIUkVFLlBsYW5lQnVmZmVyR2VvbWV0cnkoMSwgMSk7XHJcblx0dmFyIGdlb20gPSBuZXcgQ2hhcmFjdGVyUGxhbmVHZW9tZXRyeShvcHRzLm9mZnNldC54LCBvcHRzLm9mZnNldC55LCBvcHRzLm9mZnNldC56KTtcclxuXHRnYy5jb2xsZWN0KGdlb20pO1xyXG5cdFxyXG5cdHZhciBtYXQgPSBuZXcgQ2hhcmFjdGVyU3ByaXRlTWF0ZXJpYWwob3B0cyk7XHJcblx0Z2MuY29sbGVjdChtYXQpO1xyXG5cdFxyXG5cdFRIUkVFLk1lc2guY2FsbCh0aGlzLCBnZW9tLCBtYXQpO1xyXG5cdHRoaXMudHlwZSA9IFwiQ2hhcmFjdGVyU3ByaXRlXCI7XHJcblx0XHJcblx0bWF0LnNjYWxlID0gbWF0LnVuaWZvcm1zLnNjYWxlLnZhbHVlID0gdGhpcy5zY2FsZTtcclxufVxyXG5pbmhlcml0cyhDaGFyYWN0ZXJTcHJpdGUsIFRIUkVFLk1lc2gpO1xyXG5tb2R1bGUuZXhwb3J0cy5DaGFyYWN0ZXJTcHJpdGUgPSBDaGFyYWN0ZXJTcHJpdGU7XHJcblxyXG5cclxuZnVuY3Rpb24gQ2hhcmFjdGVyU3ByaXRlTWF0ZXJpYWwob3B0cykge1xyXG5cdGlmICghKHRoaXMgaW5zdGFuY2VvZiBDaGFyYWN0ZXJTcHJpdGVNYXRlcmlhbCkpIHtcclxuXHRcdHJldHVybiBuZXcgQ2hhcmFjdGVyU3ByaXRlTWF0ZXJpYWwob3B0cyk7XHJcblx0fVxyXG5cdFxyXG5cdC8vVE9ETyB3cml0ZSBpdCBzbyB3aGVuIHdlIHJlcGxhY2UgdGhlIHZhbHVlcyBoZXJlLCB3ZSByZXBsYWNlIHRoZSBvbmVzIGluIHRoZSB1bmlmb3Jtc1xyXG5cdC8vIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKHRoaXMsIHtcclxuXHQvLyBcdHV2T2Zmc2V0IDoge31cclxuXHQvLyB9KTtcclxuXHJcblx0dGhpcy5tYXAgPSBvcHRzLm1hcCB8fCBuZXcgVEhSRUUuVGV4dHVyZSgpO1xyXG5cdFxyXG5cdHRoaXMudXZPZmZzZXQgPSBvcHRzLnV2T2Zmc2V0IHx8IHRoaXMubWFwLm9mZnNldCB8fCBuZXcgVEhSRUUuVmVjdG9yMigwLCAwKTtcclxuXHR0aGlzLnV2U2NhbGUgPSBvcHRzLnV2U2NhbGUgfHwgdGhpcy5tYXAucmVwZWF0IHx8IG5ldyBUSFJFRS5WZWN0b3IyKDEsIDEpO1xyXG5cdFxyXG5cdHRoaXMucm90YXRpb24gPSBvcHRzLnJvdGF0aW9uIHx8IDA7XHJcblx0dGhpcy5zY2FsZSA9IG9wdHMuc2NhbGUgfHwgbmV3IFRIUkVFLlZlY3RvcjIoMSwgMSk7XHJcblx0XHJcblx0dGhpcy5jb2xvciA9IChvcHRzLmNvbG9yIGluc3RhbmNlb2YgVEhSRUUuQ29sb3IpPyBvcHRzLmNvbG9yIDogbmV3IFRIUkVFLkNvbG9yKG9wdHMuY29sb3IpO1xyXG5cdHRoaXMub3BhY2l0eSA9IG9wdHMub3BhY2l0eSB8fCAxO1xyXG5cdFxyXG5cdHZhciBwYXJhbXMgPSB0aGlzLl9jcmVhdGVNYXRQYXJhbXMob3B0cyk7XHJcblx0VEhSRUUuU2hhZGVyTWF0ZXJpYWwuY2FsbCh0aGlzLCBwYXJhbXMpO1xyXG5cdHRoaXMudHlwZSA9IFwiQ2hhcmFjdGVyU3ByaXRlTWF0ZXJpYWxcIjtcclxuXHRcclxuXHR0aGlzLnRyYW5zcGFyZW50ID0gKG9wdHMudHJhbnNwYXJlbnQgIT09IHVuZGVmaW5lZCk/IG9wdHMudHJhbnNwYXJlbnQgOiB0cnVlO1xyXG5cdHRoaXMuYWxwaGFUZXN0ID0gMC4wNTtcclxuXHQvLyB0aGlzLmRlcHRoV3JpdGUgPSBmYWxzZTtcclxufVxyXG5pbmhlcml0cyhDaGFyYWN0ZXJTcHJpdGVNYXRlcmlhbCwgVEhSRUUuU2hhZGVyTWF0ZXJpYWwpO1xyXG5leHRlbmQoQ2hhcmFjdGVyU3ByaXRlTWF0ZXJpYWwucHJvdG90eXBlLCB7XHJcblx0bWFwIDogbnVsbCxcclxuXHRcclxuXHRfY3JlYXRlTWF0UGFyYW1zIDogZnVuY3Rpb24oKSB7XHJcblx0XHR2YXIgcGFyYW1zID0ge1xyXG5cdFx0XHR1bmlmb3JtcyA6IHtcclxuXHRcdFx0XHR1dk9mZnNldDpcdHsgdHlwZTogXCJ2MlwiLCB2YWx1ZTogdGhpcy51dk9mZnNldCB9LFxyXG5cdFx0XHRcdHV2U2NhbGU6XHR7IHR5cGU6IFwidjJcIiwgdmFsdWU6IHRoaXMudXZTY2FsZSB9LFxyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdHJvdGF0aW9uOlx0eyB0eXBlOiBcImZcIiwgdmFsdWU6IHRoaXMucm90YXRpb24gfSxcclxuXHRcdFx0XHRzY2FsZTpcdFx0eyB0eXBlOiBcInYyXCIsIHZhbHVlOiB0aGlzLnNjYWxlIH0sXHJcblx0XHRcdFx0XHJcblx0XHRcdFx0Y29sb3I6XHRcdHsgdHlwZTogXCJjXCIsIHZhbHVlOiB0aGlzLmNvbG9yIH0sXHJcblx0XHRcdFx0bWFwOlx0XHR7IHR5cGU6IFwidFwiLCB2YWx1ZTogdGhpcy5tYXAgfSxcclxuXHRcdFx0XHRvcGFjaXR5Olx0eyB0eXBlOiBcImZcIiwgdmFsdWU6IHRoaXMub3BhY2l0eSB9LFxyXG5cdFx0XHR9LFxyXG5cdFx0fTtcclxuXHRcdFxyXG5cdFx0cGFyYW1zLnZlcnRleFNoYWRlciA9IFZFUlRfU0hBREVSO1xyXG5cdFx0cGFyYW1zLmZyYWdtZW50U2hhZGVyID0gRlJBR19TSEFERVI7XHJcblx0XHRyZXR1cm4gcGFyYW1zO1xyXG5cdH0sXHJcbn0pO1xyXG5tb2R1bGUuZXhwb3J0cy5DaGFyYWN0ZXJTcHJpdGVNYXRlcmlhbCA9IENoYXJhY3RlclNwcml0ZU1hdGVyaWFsO1xyXG5cclxuXHJcblxyXG5mdW5jdGlvbiBDaGFyYWN0ZXJQbGFuZUdlb21ldHJ5KHhvZmYsIHlvZmYsIHpvZmYpIHtcclxuXHRUSFJFRS5CdWZmZXJHZW9tZXRyeS5jYWxsKHRoaXMpO1xyXG5cdFxyXG5cdHRoaXMudHlwZSA9IFwiQ2hhcmFjdGVyUGxhbmVHZW9tZXRyeVwiO1xyXG5cdFxyXG5cdHZhciB2ZXJ0cyA9IG5ldyBGbG9hdDMyQXJyYXkoW1xyXG5cdFx0LTAuNSArIHhvZmYsIC0wLjUgKyB5b2ZmLCAwICsgem9mZixcclxuXHRcdCAwLjUgKyB4b2ZmLCAtMC41ICsgeW9mZiwgMCArIHpvZmYsXHJcblx0XHQgMC41ICsgeG9mZiwgIDAuNSArIHlvZmYsIDAgKyB6b2ZmLFxyXG5cdFx0LTAuNSArIHhvZmYsICAwLjUgKyB5b2ZmLCAwICsgem9mZixcclxuXHRdKTtcclxuXHR2YXIgbm9ybXMgPSBuZXcgRmxvYXQzMkFycmF5KFsgMCwgMSwgMSwgICAwLCAwLCAxLCAgIDAsIDAsIDEsICAgMCwgMCwgMSwgXSk7XHJcblx0dmFyIHV2cyAgID0gbmV3IEZsb2F0MzJBcnJheShbIDAsIDAsICAgICAgMSwgMCwgICAgICAxLCAxLCAgICAgIDAsIDEsIF0pO1xyXG5cdHZhciBmYWNlcyA9IG5ldyBVaW50MTZBcnJheSggWyAwLCAxLCAyLCAgIDAsIDIsIDMgXSk7XHJcblx0XHJcblx0dGhpcy5hZGRBdHRyaWJ1dGUoICdpbmRleCcsIG5ldyBUSFJFRS5CdWZmZXJBdHRyaWJ1dGUoIGZhY2VzLCAxICkgKTtcclxuXHR0aGlzLmFkZEF0dHJpYnV0ZSggJ3Bvc2l0aW9uJywgbmV3IFRIUkVFLkJ1ZmZlckF0dHJpYnV0ZSggdmVydHMsIDMgKSApO1xyXG5cdHRoaXMuYWRkQXR0cmlidXRlKCAnbm9ybWFsJywgbmV3IFRIUkVFLkJ1ZmZlckF0dHJpYnV0ZSggbm9ybXMsIDMgKSApO1xyXG5cdHRoaXMuYWRkQXR0cmlidXRlKCAndXYnLCBuZXcgVEhSRUUuQnVmZmVyQXR0cmlidXRlKCB1dnMsIDIgKSApO1xyXG5cdFxyXG59XHJcbmluaGVyaXRzKENoYXJhY3RlclBsYW5lR2VvbWV0cnksIFRIUkVFLkJ1ZmZlckdlb21ldHJ5KTtcclxuXHJcblxyXG5cclxuXHJcbnZhciBWRVJUX1NIQURFUiA9IFtcclxuXHQvLyAndW5pZm9ybSBtYXQ0IG1vZGVsVmlld01hdHJpeDsnLFxyXG5cdC8vICd1bmlmb3JtIG1hdDQgcHJvamVjdGlvbk1hdHJpeDsnLFxyXG5cdCd1bmlmb3JtIGZsb2F0IHJvdGF0aW9uOycsXHJcblx0J3VuaWZvcm0gdmVjMiBzY2FsZTsnLFxyXG5cdCd1bmlmb3JtIHZlYzIgdXZPZmZzZXQ7JyxcclxuXHQndW5pZm9ybSB2ZWMyIHV2U2NhbGU7JyxcclxuXHJcblx0Ly8gJ2F0dHJpYnV0ZSB2ZWMyIHBvc2l0aW9uOycsXHJcblx0Ly8gJ2F0dHJpYnV0ZSB2ZWMyIHV2OycsXHJcblxyXG5cdCd2YXJ5aW5nIHZlYzIgdlVWOycsXHJcblxyXG5cdCd2b2lkIG1haW4oKSB7JyxcclxuXHJcblx0XHQndlVWID0gdXZPZmZzZXQgKyB1diAqIHV2U2NhbGU7JyxcclxuXHJcblx0XHQndmVjMiBhbGlnbmVkUG9zaXRpb24gPSBwb3NpdGlvbi54eSAqIHNjYWxlOycsXHJcblxyXG5cdFx0J3ZlYzIgcm90YXRlZFBvc2l0aW9uOycsXHJcblx0XHQncm90YXRlZFBvc2l0aW9uLnggPSBjb3MoIHJvdGF0aW9uICkgKiBhbGlnbmVkUG9zaXRpb24ueCAtIHNpbiggcm90YXRpb24gKSAqIGFsaWduZWRQb3NpdGlvbi55OycsXHJcblx0XHQncm90YXRlZFBvc2l0aW9uLnkgPSBzaW4oIHJvdGF0aW9uICkgKiBhbGlnbmVkUG9zaXRpb24ueCArIGNvcyggcm90YXRpb24gKSAqIGFsaWduZWRQb3NpdGlvbi55OycsXHJcblxyXG5cdFx0J3ZlYzQgZmluYWxQb3NpdGlvbjsnLFxyXG5cclxuXHRcdCdmaW5hbFBvc2l0aW9uID0gbW9kZWxWaWV3TWF0cml4ICogdmVjNCggMC4wLCAwLjAsIDAuMCwgMS4wICk7JyxcclxuXHRcdCdmaW5hbFBvc2l0aW9uLnh5ICs9IHJvdGF0ZWRQb3NpdGlvbjsnLFxyXG5cdFx0Ly8gJ2ZpbmFsUG9zaXRpb24ueiArPSBwb3NpdGlvbi56OycsXHJcblx0XHQnZmluYWxQb3NpdGlvbiA9IHByb2plY3Rpb25NYXRyaXggKiBmaW5hbFBvc2l0aW9uOycsXHJcblx0XHRcclxuXHRcdCdnbF9Qb3NpdGlvbiA9IGZpbmFsUG9zaXRpb247JyxcclxuXHJcblx0J30nXHJcbl0uam9pbiggJ1xcbicgKTtcclxuXHJcbnZhciBGUkFHX1NIQURFUiA9IFtcclxuXHQndW5pZm9ybSB2ZWMzIGNvbG9yOycsXHJcblx0J3VuaWZvcm0gc2FtcGxlcjJEIG1hcDsnLFxyXG5cdCd1bmlmb3JtIGZsb2F0IG9wYWNpdHk7JyxcclxuXHJcblx0J3VuaWZvcm0gdmVjMyBmb2dDb2xvcjsnLFxyXG5cdCd1bmlmb3JtIGZsb2F0IGZvZ0RlbnNpdHk7JyxcclxuXHQndW5pZm9ybSBmbG9hdCBmb2dOZWFyOycsXHJcblx0J3VuaWZvcm0gZmxvYXQgZm9nRmFyOycsXHJcblxyXG5cdCd2YXJ5aW5nIHZlYzIgdlVWOycsXHJcblxyXG5cdCd2b2lkIG1haW4oKSB7JyxcclxuXHJcblx0XHQndmVjNCB0ZXh0dXJlID0gdGV4dHVyZTJEKCBtYXAsIHZVViApOycsXHJcblxyXG5cdFx0JyNpZmRlZiBBTFBIQVRFU1QnLFxyXG5cdFx0XHQnaWYgKCB0ZXh0dXJlLmEgPCBBTFBIQVRFU1QgKSBkaXNjYXJkOycsXHJcblx0XHQnI2VuZGlmJyxcclxuXHJcblx0XHQnZ2xfRnJhZ0NvbG9yID0gdmVjNCggY29sb3IgKiB0ZXh0dXJlLnh5eiwgdGV4dHVyZS5hICogb3BhY2l0eSApOycsXHJcblxyXG5cdFx0JyNpZmRlZiBVU0VfRk9HJyxcclxuXHRcdFx0J2Zsb2F0IGRlcHRoID0gZ2xfRnJhZ0Nvb3JkLnogLyBnbF9GcmFnQ29vcmQudzsnLFxyXG5cdFx0XHQnZmxvYXQgZm9nRmFjdG9yID0gMC4wOycsXHJcblx0XHRcdFxyXG5cdFx0XHQnI2lmbmRlZiBGT0dfRVhQMicsIC8vbm90ZTogTk9UIGRlZmluZWRcclxuXHRcdFx0XHJcblx0XHRcdFx0J2ZvZ0ZhY3RvciA9IHNtb290aHN0ZXAoIGZvZ05lYXIsIGZvZ0ZhciwgZGVwdGggKTsnLFxyXG5cdFx0XHRcdFxyXG5cdFx0XHQnI2Vsc2UnLFxyXG5cdFx0XHRcclxuXHRcdFx0XHQnY29uc3QgZmxvYXQgTE9HMiA9IDEuNDQyNjk1OycsXHJcblx0XHRcdFx0J2Zsb2F0IGZvZ0ZhY3RvciA9IGV4cDIoIC0gZm9nRGVuc2l0eSAqIGZvZ0RlbnNpdHkgKiBkZXB0aCAqIGRlcHRoICogTE9HMiApOycsXHJcblx0XHRcdFx0J2ZvZ0ZhY3RvciA9IDEuMCAtIGNsYW1wKCBmb2dGYWN0b3IsIDAuMCwgMS4wICk7JyxcclxuXHJcblx0XHRcdCcjZW5kaWYnLFxyXG5cdFx0XHRcclxuXHRcdFx0J2dsX0ZyYWdDb2xvciA9IG1peCggZ2xfRnJhZ0NvbG9yLCB2ZWM0KCBmb2dDb2xvciwgZ2xfRnJhZ0NvbG9yLncgKSwgZm9nRmFjdG9yICk7JyxcclxuXHJcblx0XHQnI2VuZGlmJyxcclxuXHJcblx0J30nXHJcbl0uam9pbiggJ1xcbicgKVxyXG5cclxuXHJcblxyXG5cclxuLypcclxudmFyIGluZGljZXMgPSBuZXcgVWludDE2QXJyYXkoIFsgMCwgMSwgMiwgIDAsIDIsIDMgXSApO1xyXG52YXIgdmVydGljZXMgPSBuZXcgRmxvYXQzMkFycmF5KCBbIC0gMC41LCAtIDAuNSwgMCwgICAwLjUsIC0gMC41LCAwLCAgIDAuNSwgMC41LCAwLCAgIC0gMC41LCAwLjUsIDAgXSApO1xyXG52YXIgdXZzID0gbmV3IEZsb2F0MzJBcnJheSggWyAwLCAwLCAgIDEsIDAsICAgMSwgMSwgICAwLCAxIF0gKTtcclxuXHJcbnZhciBnZW9tZXRyeSA9IG5ldyBUSFJFRS5CdWZmZXJHZW9tZXRyeSgpO1xyXG5nZW9tZXRyeS5hZGRBdHRyaWJ1dGUoICdpbmRleCcsIG5ldyBUSFJFRS5CdWZmZXJBdHRyaWJ1dGUoIGluZGljZXMsIDEgKSApO1xyXG5nZW9tZXRyeS5hZGRBdHRyaWJ1dGUoICdwb3NpdGlvbicsIG5ldyBUSFJFRS5CdWZmZXJBdHRyaWJ1dGUoIHZlcnRpY2VzLCAzICkgKTtcclxuZ2VvbWV0cnkuYWRkQXR0cmlidXRlKCAndXYnLCBuZXcgVEhSRUUuQnVmZmVyQXR0cmlidXRlKCB1dnMsIDIgKSApO1xyXG5cclxuXHJcbmZ1bmN0aW9uIFNwcml0ZUNoYXJhY3RlcihtYXRlcmlhbCkge1xyXG5cdFRIUkVFLk9iamVjdDNELmNhbGwoIHRoaXMgKTtcclxuXHJcblx0dGhpcy50eXBlID0gJ1Nwcml0ZUNoYXJhY3Rlcic7XHJcblxyXG5cdHRoaXMuZ2VvbWV0cnkgPSBnZW9tZXRyeTtcclxuXHR0aGlzLm1hdGVyaWFsID0gKCBtYXRlcmlhbCAhPT0gdW5kZWZpbmVkICkgPyBtYXRlcmlhbCA6IG5ldyBUSFJFRS5TcHJpdGVNYXRlcmlhbCgpO1xyXG5cclxufVxyXG5cclxuU3ByaXRlQ2hhcmFjdGVyLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoIFRIUkVFLk9iamVjdDNELnByb3RvdHlwZSApO1xyXG5cclxuU3ByaXRlQ2hhcmFjdGVyLnByb3RvdHlwZS5yYXljYXN0ID0gKCBmdW5jdGlvbiAoKSB7XHJcblx0dmFyIG1hdHJpeFBvc2l0aW9uID0gbmV3IFRIUkVFLlZlY3RvcjMoKTtcclxuXHJcblx0cmV0dXJuIGZ1bmN0aW9uICggcmF5Y2FzdGVyLCBpbnRlcnNlY3RzICkge1xyXG5cdFx0bWF0cml4UG9zaXRpb24uc2V0RnJvbU1hdHJpeFBvc2l0aW9uKCB0aGlzLm1hdHJpeFdvcmxkICk7XHJcblxyXG5cdFx0dmFyIGRpc3RhbmNlID0gcmF5Y2FzdGVyLnJheS5kaXN0YW5jZVRvUG9pbnQoIG1hdHJpeFBvc2l0aW9uICk7XHJcblx0XHRpZiAoIGRpc3RhbmNlID4gdGhpcy5zY2FsZS54ICkgcmV0dXJuO1xyXG5cclxuXHRcdGludGVyc2VjdHMucHVzaCgge1xyXG5cdFx0XHRkaXN0YW5jZTogZGlzdGFuY2UsXHJcblx0XHRcdHBvaW50OiB0aGlzLnBvc2l0aW9uLFxyXG5cdFx0XHRmYWNlOiBudWxsLFxyXG5cdFx0XHRvYmplY3Q6IHRoaXNcclxuXHRcdH0gKTtcclxuXHR9O1xyXG59KCkgKTtcclxuXHJcblxyXG5TcHJpdGVDaGFyYWN0ZXIucHJvdG90eXBlLmNsb25lID0gZnVuY3Rpb24gKCBvYmplY3QgKSB7XHJcblx0aWYgKCBvYmplY3QgPT09IHVuZGVmaW5lZCApIFxyXG5cdFx0b2JqZWN0ID0gbmV3IFNwcml0ZUNoYXJhY3RlciggdGhpcy5tYXRlcmlhbCApO1xyXG5cdFRIUkVFLk9iamVjdDNELnByb3RvdHlwZS5jbG9uZS5jYWxsKCB0aGlzLCBvYmplY3QgKTtcclxuXHRyZXR1cm4gb2JqZWN0O1xyXG5cclxufTsqLyIsIi8vIGFjdG9yX2FuaW1hdGlvbnMuanNcclxuLy8gQSBzdWJtb2R1bGUgZm9yIHRoZSBBY3RvciBldmVudCBjbGFzcyB0aGF0IGRlYWxzIHdpdGggYW5pbWF0aW9uc1xyXG5cclxudmFyIGV4dGVuZCA9IHJlcXVpcmUoXCJleHRlbmRcIik7XHJcblxyXG5mdW5jdGlvbiBnZXRTcHJpdGVGb3JtYXQoc3RyKSB7XHJcblx0dmFyIGZvcm1hdCA9IHN0ci5zcGxpdChcIi1cIik7XHJcblx0dmFyIG5hbWUgPSBmb3JtYXRbMF07XHJcblx0dmFyIHNpemUgPSBmb3JtYXRbMV0uc3BsaXQoXCJ4XCIpO1xyXG5cdHNpemVbMV0gPSBzaXplWzFdIHx8IHNpemVbMF07XHJcblx0XHJcblx0dmFyIGJhc2UgPSB7XHJcblx0XHR3aWR0aDogc2l6ZVswXSwgaGVpZ2h0OiBzaXplWzFdLCBmbGlwOiBmYWxzZSwgXHJcblx0XHQvL3JlcGVhdHg6IDAuMjUsIHJlcGVhdHk6IDAuMjUsXHJcblx0XHRmcmFtZXM6IHtcclxuXHRcdFx0XCJ1M1wiOiBcInUwXCIsIFwiZDNcIjogXCJkMFwiLCBcImwzXCI6IFwibDBcIiwgXCJyM1wiOiBcInIwXCIsXHJcblx0XHR9LFxyXG5cdFx0YW5pbXMgOiBnZXRTdGFuZGFyZEFuaW1hdGlvbnMoKSxcclxuXHR9O1xyXG5cdFxyXG5cdHN3aXRjaCAobmFtZSkge1xyXG5cdFx0Y2FzZSBcInB0X2hvcnpyb3dcIjogXHJcblx0XHRcdHJldHVybiBleHRlbmQodHJ1ZSwgYmFzZSwgeyBcclxuXHRcdFx0XHRmcmFtZXM6IHtcclxuXHRcdFx0XHRcdFwidTBcIjogWzEsIDBdLCBcInUxXCI6IFsxLCAxXSwgXCJ1MlwiOiBbMSwgMl0sXHJcblx0XHRcdFx0XHRcImQwXCI6IFswLCAwXSwgXCJkMVwiOiBbMCwgMV0sIFwiZDJcIjogWzAsIDJdLFxyXG5cdFx0XHRcdFx0XCJsMFwiOiBbMiwgMF0sIFwibDFcIjogWzIsIDFdLCBcImwyXCI6IFsyLCAyXSxcclxuXHRcdFx0XHRcdFwicjBcIjogWzMsIDBdLCBcInIxXCI6IFszLCAxXSwgXCJyMlwiOiBbMywgMl0sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fSk7XHJcblx0XHRjYXNlIFwicHRfdmVydGNvbFwiOiBcclxuXHRcdFx0cmV0dXJuIGV4dGVuZCh0cnVlLCBiYXNlLCB7IFxyXG5cdFx0XHRcdGZyYW1lczoge1xyXG5cdFx0XHRcdFx0XCJ1MFwiOiBbMCwgMV0sIFwidTFcIjogWzEsIDFdLCBcInUyXCI6IFsyLCAxXSxcclxuXHRcdFx0XHRcdFwiZDBcIjogWzAsIDBdLCBcImQxXCI6IFsxLCAwXSwgXCJkMlwiOiBbMiwgMF0sXHJcblx0XHRcdFx0XHRcImwwXCI6IFswLCAyXSwgXCJsMVwiOiBbMSwgMl0sIFwibDJcIjogWzIsIDJdLFxyXG5cdFx0XHRcdFx0XCJyMFwiOiBbMCwgM10sIFwicjFcIjogWzEsIDNdLCBcInIyXCI6IFsyLCAzXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9KTtcclxuXHRcdGNhc2UgXCJoZ192ZXJ0bWl4XCI6IFxyXG5cdFx0XHRyZXR1cm4gZXh0ZW5kKHRydWUsIGJhc2UsIHsgXHJcblx0XHRcdFx0ZnJhbWVzOiB7XHJcblx0XHRcdFx0XHRcInUwXCI6IFswLCAwXSwgXCJ1MVwiOiBbMSwgM10sIFwidTJcIjogWzIsIDBdLFxyXG5cdFx0XHRcdFx0XCJkMFwiOiBbMiwgMV0sIFwiZDFcIjogWzIsIDJdLCBcImQyXCI6IFsyLCAzXSxcclxuXHRcdFx0XHRcdFwibDBcIjogWzAsIDJdLCBcImwxXCI6IFswLCAxXSwgXCJsMlwiOiBbMCwgM10sXHJcblx0XHRcdFx0XHRcInIwXCI6IFsxLCAwXSwgXCJyMVwiOiBbMSwgMV0sIFwicjJcIjogWzEsIDJdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH0pO1xyXG5cdFx0Y2FzZSBcImhnX3Bva2Vyb3dcIjpcclxuXHRcdFx0cmV0dXJuIGV4dGVuZCh0cnVlLCBiYXNlLCB7IFxyXG5cdFx0XHRcdGZyYW1lczogeyAvLyBwb2ludGVycyB0byBhbm90aGVyIGltYWdlIGluZGljYXRlcyB0aGF0IGltYWdlIHNob3VsZCBiZSBmbGlwcGVkLCBpZiBmbGlwPXRydWVcclxuXHRcdFx0XHRcdFwidTBcIjogbnVsbCwgXCJ1MVwiOiBbMCwgMF0sIFwidTJcIjogWzEsIDBdLFxyXG5cdFx0XHRcdFx0XCJkMFwiOiBudWxsLCBcImQxXCI6IFswLCAxXSwgXCJkMlwiOiBbMSwgMV0sXHJcblx0XHRcdFx0XHRcImwwXCI6IG51bGwsIFwibDFcIjogWzAsIDJdLCBcImwyXCI6IFsxLCAyXSxcclxuXHRcdFx0XHRcdFwicjBcIjogbnVsbCwgXCJyMVwiOiBbMCwgM10sIFwicjJcIjogWzEsIDNdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0YW5pbXM6IGdldFBva2Vtb25BbmltYXRpb25zKCksXHJcblx0XHRcdH0pO1xyXG5cdFx0Y2FzZSBcImhnX3Bva2Vyb3dfcmV2ZXJzZVwiOlxyXG5cdFx0XHRyZXR1cm4gZXh0ZW5kKHRydWUsIGJhc2UsIHsgXHJcblx0XHRcdFx0ZnJhbWVzOiB7IC8vIHBvaW50ZXJzIHRvIGFub3RoZXIgaW1hZ2UgaW5kaWNhdGVzIHRoYXQgaW1hZ2Ugc2hvdWxkIGJlIGZsaXBwZWQsIGlmIGZsaXA9dHJ1ZVxyXG5cdFx0XHRcdFx0XCJ1MFwiOiBudWxsLCBcInUxXCI6IFswLCAxXSwgXCJ1MlwiOiBbMSwgMV0sXHJcblx0XHRcdFx0XHRcImQwXCI6IG51bGwsIFwiZDFcIjogWzAsIDBdLCBcImQyXCI6IFsxLCAwXSxcclxuXHRcdFx0XHRcdFwibDBcIjogbnVsbCwgXCJsMVwiOiBbMCwgM10sIFwibDJcIjogWzEsIDNdLFxyXG5cdFx0XHRcdFx0XCJyMFwiOiBudWxsLCBcInIxXCI6IFswLCAyXSwgXCJyMlwiOiBbMSwgMl0sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRhbmltczogZ2V0UG9rZW1vbkFuaW1hdGlvbnMoKSxcclxuXHRcdFx0fSk7XHJcblx0XHRjYXNlIFwiaGdfcG9rZWNvbFwiOlxyXG5cdFx0XHRyZXR1cm4gZXh0ZW5kKHRydWUsIGJhc2UsIHsgXHJcblx0XHRcdFx0ZnJhbWVzOiB7IC8vIHBvaW50ZXJzIHRvIGFub3RoZXIgaW1hZ2UgaW5kaWNhdGVzIHRoYXQgaW1hZ2Ugc2hvdWxkIGJlIGZsaXBwZWQsIGlmIGZsaXA9dHJ1ZVxyXG5cdFx0XHRcdFx0XCJ1MFwiOiBudWxsLCBcInUxXCI6IFswLCAwXSwgXCJ1MlwiOiBbMCwgMV0sXHJcblx0XHRcdFx0XHRcImQwXCI6IG51bGwsIFwiZDFcIjogWzAsIDJdLCBcImQyXCI6IFswLCAzXSxcclxuXHRcdFx0XHRcdFwibDBcIjogbnVsbCwgXCJsMVwiOiBbMSwgMF0sIFwibDJcIjogWzEsIDFdLFxyXG5cdFx0XHRcdFx0XCJyMFwiOiBudWxsLCBcInIxXCI6IFsxLCAyXSwgXCJyMlwiOiBbMSwgM10sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRhbmltczogZ2V0UG9rZW1vbkFuaW1hdGlvbnMoKSxcclxuXHRcdFx0fSk7XHJcblx0XHRjYXNlIFwiaGdfcG9rZV9ob3J6Y29sXCI6XHJcblx0XHRcdHJldHVybiBleHRlbmQodHJ1ZSwgYmFzZSwgeyBcclxuXHRcdFx0XHRmcmFtZXM6IHsgLy8gcG9pbnRlcnMgdG8gYW5vdGhlciBpbWFnZSBpbmRpY2F0ZXMgdGhhdCBpbWFnZSBzaG91bGQgYmUgZmxpcHBlZCwgaWYgZmxpcD10cnVlXHJcblx0XHRcdFx0XHRcInUwXCI6IG51bGwsIFwidTFcIjogWzEsIDBdLCBcInUyXCI6IFsxLCAxXSxcclxuXHRcdFx0XHRcdFwiZDBcIjogbnVsbCwgXCJkMVwiOiBbMCwgMF0sIFwiZDJcIjogWzAsIDFdLFxyXG5cdFx0XHRcdFx0XCJsMFwiOiBudWxsLCBcImwxXCI6IFsyLCAwXSwgXCJsMlwiOiBbMiwgMV0sXHJcblx0XHRcdFx0XHRcInIwXCI6IG51bGwsIFwicjFcIjogWzMsIDBdLCBcInIyXCI6IFszLCAxXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdGFuaW1zOiBnZXRQb2tlbW9uQW5pbWF0aW9ucygpLFxyXG5cdFx0XHR9KTtcclxuXHRcdGNhc2UgXCJoZ19wb2tlZmxpcFwiOlxyXG5cdFx0XHRyZXR1cm4gZXh0ZW5kKHRydWUsIGJhc2UsIHsgXHJcblx0XHRcdFx0ZnJhbWVzOiB7IC8vIHBvaW50ZXJzIHRvIGFub3RoZXIgaW1hZ2UgaW5kaWNhdGVzIHRoYXQgaW1hZ2Ugc2hvdWxkIGJlIGZsaXBwZWQsIGlmIGZsaXA9dHJ1ZVxyXG5cdFx0XHRcdFx0XCJ1MFwiOiBudWxsLCBcInUxXCI6IFswLCAwXSwgXCJ1MlwiOiBbMSwgMF0sXHJcblx0XHRcdFx0XHRcImQwXCI6IG51bGwsIFwiZDFcIjogWzAsIDFdLCBcImQyXCI6IFsxLCAxXSxcclxuXHRcdFx0XHRcdFwibDBcIjogbnVsbCwgXCJsMVwiOiBbMCwgMl0sIFwibDJcIjogWzEsIDJdLFxyXG5cdFx0XHRcdFx0XCJyMFwiOiBudWxsLCBcInIxXCI6IFwibDFcIiwgICBcInIyXCI6IFwibDJcIixcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdGFuaW1zOiBnZXRQb2tlbW9uQW5pbWF0aW9ucygpLFxyXG5cdFx0XHR9KTtcclxuXHRcdGNhc2UgXCJid192ZXJ0cm93XCI6XHJcblx0XHRcdHJldHVybiBleHRlbmQodHJ1ZSwgYmFzZSwgeyBcclxuXHRcdFx0XHRmcmFtZXM6IHtcclxuXHRcdFx0XHRcdFwidTBcIjogWzAsIDBdLCBcInUxXCI6IFsxLCAwXSwgXCJ1MlwiOiBbMiwgMF0sXHJcblx0XHRcdFx0XHRcImQwXCI6IFswLCAxXSwgXCJkMVwiOiBbMSwgMV0sIFwiZDJcIjogWzIsIDFdLFxyXG5cdFx0XHRcdFx0XCJsMFwiOiBbMCwgMl0sIFwibDFcIjogWzEsIDJdLCBcImwyXCI6IFsyLCAyXSxcclxuXHRcdFx0XHRcdFwicjBcIjogWzAsIDNdLCBcInIxXCI6IFsxLCAzXSwgXCJyMlwiOiBbMiwgM10sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fSk7XHJcblx0XHRjYXNlIFwiYndfaG9yemZsaXBcIjpcclxuXHRcdFx0cmV0dXJuIGV4dGVuZCh0cnVlLCBiYXNlLCB7IFxyXG5cdFx0XHRcdGZyYW1lczogeyAvLyBwb2ludGVycyB0byBhbm90aGVyIGltYWdlIGluZGljYXRlcyB0aGF0IGltYWdlIHNob3VsZCBiZSBmbGlwcGVkLCBpZiBmbGlwPXRydWVcclxuXHRcdFx0XHRcdFwidTBcIjogWzAsIDBdLCBcInUxXCI6IFsxLCAwXSwgXCJ1MlwiOiBcInUxXCIsXHJcblx0XHRcdFx0XHRcImQwXCI6IFsyLCAwXSwgXCJkMVwiOiBbMywgMF0sIFwiZDJcIjogXCJkMVwiLFxyXG5cdFx0XHRcdFx0XCJsMFwiOiBbMCwgMV0sIFwibDFcIjogWzEsIDFdLCBcImwyXCI6IFsyLCAxXSxcclxuXHRcdFx0XHRcdFwicjBcIjogXCJsMFwiLCAgIFwicjFcIjogXCJsMVwiLCAgIFwicjJcIjogXCJsMlwiLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH0pO1xyXG5cdFx0ZGVmYXVsdDpcclxuXHRcdFx0Y29uc29sZS5lcnJvcihcIk5vIHN1Y2ggU3ByaXRlIEZvcm1hdDpcIiwgbmFtZSk7XHJcblx0XHRcdHJldHVybiB7fTtcclxuXHR9XHJcbn1cclxubW9kdWxlLmV4cG9ydHMuZ2V0U3ByaXRlRm9ybWF0ID0gZ2V0U3ByaXRlRm9ybWF0O1xyXG5cclxuXHJcbmZ1bmN0aW9uIGdldFN0YW5kYXJkQW5pbWF0aW9ucygpIHtcclxuXHR2YXIgYW5pbXMgPSB7fTtcclxuXHRcclxuXHRhbmltc1tcInN0YW5kXCJdID0gbmV3IFNwcml0ZUFuaW1hdGlvbih7IHNpbmdsZUZyYW1lOiB0cnVlLCB9LCBbXHJcblx0XHR7IHU6IFwidTBcIiwgZDogXCJkMFwiLCBsOiBcImwwXCIsIHI6IFwicjBcIiwgdHJhbnM6IHRydWUsIHBhdXNlOiB0cnVlLCB9LFxyXG5cdF0pO1xyXG5cdGFuaW1zW1wid2Fsa1wiXSA9IG5ldyBTcHJpdGVBbmltYXRpb24oeyBmcmFtZUxlbmd0aDogNSwga2VlcEZyYW1lOiB0cnVlLCB9LCBbXHJcblx0XHR7IHU6IFwidTFcIiwgZDogXCJkMVwiLCBsOiBcImwxXCIsIHI6IFwicjFcIiwgfSxcclxuXHRcdHsgdTogXCJ1M1wiLCBkOiBcImQzXCIsIGw6IFwibDNcIiwgcjogXCJyM1wiLCB0cmFuczogdHJ1ZSwgfSxcclxuXHRcdHsgdTogXCJ1MlwiLCBkOiBcImQyXCIsIGw6IFwibDJcIiwgcjogXCJyMlwiLCB9LFxyXG5cdFx0eyB1OiBcInUzXCIsIGQ6IFwiZDNcIiwgbDogXCJsM1wiLCByOiBcInIzXCIsIHRyYW5zOiB0cnVlLCBsb29wVG86IDAsIH0sXHJcblx0XSk7XHJcblx0YW5pbXNbXCJidW1wXCJdID0gbmV3IFNwcml0ZUFuaW1hdGlvbih7IGZyYW1lTGVuZ3RoOiAxMCwga2VlcEZyYW1lOiB0cnVlLCB9LCBbXHJcblx0XHR7IHU6IFwidTFcIiwgZDogXCJkMVwiLCBsOiBcImwxXCIsIHI6IFwicjFcIiwgc2Z4OiBcIndhbGtfYnVtcFwiLCB9LFxyXG5cdFx0eyB1OiBcInUwXCIsIGQ6IFwiZDBcIiwgbDogXCJsMFwiLCByOiBcInIwXCIsIHRyYW5zOiB0cnVlLCB9LFxyXG5cdFx0eyB1OiBcInUyXCIsIGQ6IFwiZDJcIiwgbDogXCJsMlwiLCByOiBcInIyXCIsIHNmeDogXCJ3YWxrX2J1bXBcIiwgfSxcclxuXHRcdHsgdTogXCJ1MFwiLCBkOiBcImQwXCIsIGw6IFwibDBcIiwgcjogXCJyMFwiLCB0cmFuczogdHJ1ZSwgbG9vcFRvOiAwLCB9LFxyXG5cdF0pO1xyXG5cdGFuaW1zW1wid2FycF9hd2F5XCJdID0gbmV3IFNwcml0ZUFuaW1hdGlvbih7IHNpbmdsZURpcjogXCJkXCIgfSwgW1xyXG5cdFx0eyBkOiBcImQwXCIsIGZyYW1lTGVuZ3RoOiA4LCB9LCAvLzBcclxuXHRcdHsgZDogXCJsMFwiLCBmcmFtZUxlbmd0aDogOCwgfSxcclxuXHRcdHsgZDogXCJ1MFwiLCBmcmFtZUxlbmd0aDogOCwgfSxcclxuXHRcdHsgZDogXCJyMFwiLCBmcmFtZUxlbmd0aDogOCwgfSxcclxuXHRcdHsgZDogXCJkMFwiLCBmcmFtZUxlbmd0aDogNywgfSwgLy80XHJcblx0XHR7IGQ6IFwibDBcIiwgZnJhbWVMZW5ndGg6IDcsIH0sXHJcblx0XHR7IGQ6IFwidTBcIiwgZnJhbWVMZW5ndGg6IDcsIH0sXHJcblx0XHR7IGQ6IFwicjBcIiwgZnJhbWVMZW5ndGg6IDcsIH0sXHJcblx0XHR7IGQ6IFwiZDBcIiwgZnJhbWVMZW5ndGg6IDUsIH0sIC8vOFxyXG5cdFx0eyBkOiBcImwwXCIsIGZyYW1lTGVuZ3RoOiA1LCB9LFxyXG5cdFx0eyBkOiBcInUwXCIsIGZyYW1lTGVuZ3RoOiA1LCB9LFxyXG5cdFx0eyBkOiBcInIwXCIsIGZyYW1lTGVuZ3RoOiA1LCB9LFxyXG5cdFx0eyBkOiBcImQwXCIsIGZyYW1lTGVuZ3RoOiAzLCB9LCAvLzEyXHJcblx0XHR7IGQ6IFwibDBcIiwgZnJhbWVMZW5ndGg6IDMsIH0sXHJcblx0XHR7IGQ6IFwidTBcIiwgZnJhbWVMZW5ndGg6IDMsIH0sXHJcblx0XHR7IGQ6IFwicjBcIiwgZnJhbWVMZW5ndGg6IDMsIH0sXHJcblx0XHR7IGQ6IFwiZDBcIiwgZnJhbWVMZW5ndGg6IDEsIH0sIC8vMTZcclxuXHRcdHsgZDogXCJsMFwiLCBmcmFtZUxlbmd0aDogMSwgfSxcclxuXHRcdHsgZDogXCJ1MFwiLCBmcmFtZUxlbmd0aDogMSwgfSxcclxuXHRcdHsgZDogXCJyMFwiLCBmcmFtZUxlbmd0aDogMSwgfSxcclxuXHRcdHsgZDogXCJkMFwiLCBmcmFtZUxlbmd0aDogMCwgdHJhbnM6IHRydWUsIH0sIC8vMjBcclxuXHRcdHsgZDogXCJsMFwiLCBmcmFtZUxlbmd0aDogMCwgdHJhbnM6IHRydWUsIH0sXHJcblx0XHR7IGQ6IFwidTBcIiwgZnJhbWVMZW5ndGg6IDAsIHRyYW5zOiB0cnVlLCB9LFxyXG5cdFx0eyBkOiBcInIwXCIsIGZyYW1lTGVuZ3RoOiAwLCB0cmFuczogdHJ1ZSwgbG9vcFRvOiAyMCB9LFxyXG5cdF0pO1xyXG5cdGFuaW1zW1wid2FycF9pblwiXSA9IG5ldyBTcHJpdGVBbmltYXRpb24oeyBzaW5nbGVEaXI6IFwiZFwiIH0sIFtcclxuXHRcdHsgZDogXCJkMFwiLCBmcmFtZUxlbmd0aDogMSwgfSwgLy8wXHJcblx0XHR7IGQ6IFwicjBcIiwgZnJhbWVMZW5ndGg6IDEsIH0sXHJcblx0XHR7IGQ6IFwidTBcIiwgZnJhbWVMZW5ndGg6IDEsIH0sXHJcblx0XHR7IGQ6IFwibDBcIiwgZnJhbWVMZW5ndGg6IDEsIH0sXHJcblx0XHR7IGQ6IFwiZDBcIiwgZnJhbWVMZW5ndGg6IDMsIH0sIC8vNFxyXG5cdFx0eyBkOiBcInIwXCIsIGZyYW1lTGVuZ3RoOiAzLCB9LFxyXG5cdFx0eyBkOiBcInUwXCIsIGZyYW1lTGVuZ3RoOiAzLCB9LFxyXG5cdFx0eyBkOiBcImwwXCIsIGZyYW1lTGVuZ3RoOiAzLCB9LFxyXG5cdFx0eyBkOiBcImQwXCIsIGZyYW1lTGVuZ3RoOiA1LCB9LCAvLzhcclxuXHRcdHsgZDogXCJyMFwiLCBmcmFtZUxlbmd0aDogNSwgfSxcclxuXHRcdHsgZDogXCJ1MFwiLCBmcmFtZUxlbmd0aDogNSwgfSxcclxuXHRcdHsgZDogXCJsMFwiLCBmcmFtZUxlbmd0aDogNSwgfSxcclxuXHRcdHsgZDogXCJkMFwiLCBmcmFtZUxlbmd0aDogNywgfSwgLy8xMlxyXG5cdFx0eyBkOiBcInIwXCIsIGZyYW1lTGVuZ3RoOiA3LCB9LFxyXG5cdFx0eyBkOiBcInUwXCIsIGZyYW1lTGVuZ3RoOiA3LCB9LFxyXG5cdFx0eyBkOiBcImwwXCIsIGZyYW1lTGVuZ3RoOiA3LCB9LFxyXG5cdFx0eyBkOiBcImQwXCIsIGZyYW1lTGVuZ3RoOiA4LCB9LCAvLzE2XHJcblx0XHR7IGQ6IFwicjBcIiwgZnJhbWVMZW5ndGg6IDgsIH0sXHJcblx0XHR7IGQ6IFwidTBcIiwgZnJhbWVMZW5ndGg6IDksIH0sXHJcblx0XHR7IGQ6IFwibDBcIiwgZnJhbWVMZW5ndGg6IDksIH0sXHJcblx0XHR7IGQ6IFwiZDBcIiwgZnJhbWVMZW5ndGg6IDEsIH0sXHJcblx0XSk7XHJcblx0XHJcblx0cmV0dXJuIGFuaW1zO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRQb2tlbW9uQW5pbWF0aW9ucygpIHsgLy9PdmVycmlkZXMgU3RhbmRhcmRcclxuXHR2YXIgYW5pbXMgPSB7fTtcclxuXHRhbmltc1tcInN0YW5kXCJdID0gbmV3IFNwcml0ZUFuaW1hdGlvbih7IHNpbmdsZUZyYW1lOiB0cnVlLCB9LCBbXHJcblx0XHR7IHU6IFwidTFcIiwgZDogXCJkMVwiLCBsOiBcImwxXCIsIHI6IFwicjFcIiwgdHJhbnM6IHRydWUsIHBhdXNlOiB0cnVlLCB9LFxyXG5cdF0pO1xyXG5cdGFuaW1zW1wiX2ZsYXBfc3RhbmRcIl0gPSBuZXcgU3ByaXRlQW5pbWF0aW9uKHsgZnJhbWVMZW5ndGg6IDUsIGtlZXBGcmFtZTogdHJ1ZSwgfSwgW1xyXG5cdFx0eyB1OiBcInUxXCIsIGQ6IFwiZDFcIiwgbDogXCJsMVwiLCByOiBcInIxXCIsIHRyYW5zOiB0cnVlLCB9LFxyXG5cdFx0eyB1OiBcInUyXCIsIGQ6IFwiZDJcIiwgbDogXCJsMlwiLCByOiBcInIyXCIsIGxvb3BUbzogMCwgfSxcclxuXHRdKTtcclxuXHRhbmltc1tcIndhbGtcIl0gPSBuZXcgU3ByaXRlQW5pbWF0aW9uKHsgZnJhbWVMZW5ndGg6IDUsIGtlZXBGcmFtZTogdHJ1ZSwgfSwgW1xyXG5cdFx0eyB1OiBcInUxXCIsIGQ6IFwiZDFcIiwgbDogXCJsMVwiLCByOiBcInIxXCIsIHRyYW5zOiB0cnVlLCB9LFxyXG5cdFx0eyB1OiBcInUyXCIsIGQ6IFwiZDJcIiwgbDogXCJsMlwiLCByOiBcInIyXCIsIGxvb3BUbzogMCwgfSxcclxuXHRdKTtcclxuXHRyZXR1cm4gYW5pbXM7XHJcbn1cclxuXHJcbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblxyXG5mdW5jdGlvbiBTcHJpdGVBbmltYXRpb24ob3B0cywgZnJhbWVzKSB7XHJcblx0dGhpcy5vcHRpb25zID0gb3B0cztcclxuXHR0aGlzLmZyYW1lcyA9IGZyYW1lcztcclxuXHRcclxuXHR0aGlzLndhaXRUaW1lID0gdGhpcy5mcmFtZXNbdGhpcy5jdXJyRnJhbWVdLmZyYW1lTGVuZ3RoIHx8IHRoaXMub3B0aW9ucy5mcmFtZUxlbmd0aDtcclxufVxyXG5TcHJpdGVBbmltYXRpb24ucHJvdG90eXBlID0ge1xyXG5cdG9wdGlvbnM6IG51bGwsXHJcblx0ZnJhbWVzIDogbnVsbCxcclxuXHRcclxuXHR3YWl0VGltZSA6IDAsXHJcblx0Y3VyckZyYW1lOiAwLFxyXG5cdHNwZWVkIDogMSxcclxuXHRwYXVzZWQgOiBmYWxzZSxcclxuXHRmaW5pc2hlZDogZmFsc2UsXHJcblx0XHJcblx0cGFyZW50IDogbnVsbCxcclxuXHRcclxuXHQvKiogQWR2YW5jZWQgdGhlIGFuaW1hdGlvbiBieSB0aGUgZ2l2ZW4gYW1vdW50IG9mIGRlbHRhIHRpbWUuICovXHJcblx0YWR2YW5jZSA6IGZ1bmN0aW9uKGRlbHRhVGltZSkge1xyXG5cdFx0aWYgKHRoaXMub3B0aW9ucy5zaW5nbGVGcmFtZSkgcmV0dXJuO1xyXG5cdFx0aWYgKHRoaXMucGF1c2VkKSByZXR1cm47XHJcblx0XHRcclxuXHRcdGlmICh0aGlzLndhaXRUaW1lID4gMCkge1xyXG5cdFx0XHR0aGlzLndhaXRUaW1lIC09ICh0aGlzLnNwZWVkICogKGRlbHRhVGltZSAqIENPTkZJRy5zcGVlZC5hbmltYXRpb24pKTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHR2YXIgbG9vcCA9IHRoaXMuZnJhbWVzW3RoaXMuY3VyckZyYW1lXS5sb29wVG87XHJcblx0XHRpZiAobG9vcCAhPT0gdW5kZWZpbmVkKSB0aGlzLmN1cnJGcmFtZSA9IGxvb3A7XHJcblx0XHRlbHNlIHRoaXMuY3VyckZyYW1lKys7XHJcblx0XHRcclxuXHRcdGlmICh0aGlzLmN1cnJGcmFtZSA+PSB0aGlzLmZyYW1lcy5sZW5ndGgpIHtcclxuXHRcdFx0dGhpcy5jdXJyRnJhbWUgPSB0aGlzLmZyYW1lcy5sZW5ndGgtMTtcclxuXHRcdFx0dGhpcy5wYXVzZWQgPSB0cnVlO1xyXG5cdFx0XHR0aGlzLmZpbmlzaGVkID0gdHJ1ZTtcclxuXHRcdFx0Y29uc29sZS53YXJuKFwiQW5pbWF0aW9uIGhhcyBjb21wbGV0ZWQhXCIpO1xyXG5cdFx0XHRpZiAodGhpcy5wYXJlbnQpIHRoaXMucGFyZW50LmVtaXQoXCJhbmltLWVuZFwiLCBudWxsKTsgLy9UT0RPIHByb3ZpZGUgYW5pbSBuYW1lXHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0Ly9uZXcgZnJhbWVcclxuXHRcdFxyXG5cdFx0dGhpcy53YWl0VGltZSA9IHRoaXMuZnJhbWVzW3RoaXMuY3VyckZyYW1lXS5mcmFtZUxlbmd0aCB8fCB0aGlzLm9wdGlvbnMuZnJhbWVMZW5ndGg7XHJcblx0XHRcclxuXHRcdGlmICh0aGlzLmZyYW1lc1t0aGlzLmN1cnJGcmFtZV0ucGF1c2UpIHRoaXMucGF1c2VkID0gdHJ1ZTtcclxuXHRcdFxyXG5cdFx0aWYgKHRoaXMuZnJhbWVzW3RoaXMuY3VyckZyYW1lXS5zZngpIFxyXG5cdFx0XHRTb3VuZE1hbmFnZXIucGxheVNvdW5kKHRoaXMuZnJhbWVzW3RoaXMuY3VyckZyYW1lXS5zZngpO1xyXG5cdH0sXHJcblx0XHJcblx0LyoqIElmIHRoaXMgYW5pbWF0aW9uIGlzIG9uIGEgcGF1c2UgZnJhbWUgKi9cclxuXHRyZXN1bWUgOiBmdW5jdGlvbigpIHtcclxuXHRcdHRoaXMucGF1c2VkID0gZmFsc2U7XHJcblx0fSxcclxuXHRcclxuXHQvKiogUmVzZXQgdGhlIGFuaW1hdGlvbiBwYXJhbWV0ZXJzLiBDYWxsZWQgd2hlbiB0aGlzIGFuaW1hdGlvbiBpcyBubyBsb25nZXIgdXNlZC4gKi9cclxuXHRyZXNldCA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0dGhpcy5wYXVzZWQgPSBmYWxzZTtcclxuXHRcdGlmICh0aGlzLm9wdGlvbnMua2VlcEZyYW1lKSB7XHJcblx0XHRcdC8vIGlmIChzZWxmLmNhblRyYW5zaXRpb24oKSkge1xyXG5cdFx0XHQvLyBcdHZhciBsb29wID0gdGhpcy5mcmFtZXNbdGhpcy5jdXJyRnJhbWVdLmxvb3BUbztcclxuXHRcdFx0Ly8gXHRpZiAobG9vcCAhPT0gdW5kZWZpbmVkKSB0aGlzLmN1cnJGcmFtZSA9IGxvb3A7XHJcblx0XHRcdC8vIFx0ZWxzZSB0aGlzLmN1cnJGcmFtZSsrO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHQvLyBcdHRoaXMud2FpdFRpbWUgPSB0aGlzLmZyYW1lc1t0aGlzLmN1cnJGcmFtZV0uZnJhbWVMZW5ndGggfHwgdGhpcy5vcHRpb25zLmZyYW1lTGVuZ3RoO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHQvLyBcdGlmICh0aGlzLmZyYW1lc1t0aGlzLmN1cnJGcmFtZV0ucGF1c2UpIHRoaXMucGF1c2VkID0gdHJ1ZTtcclxuXHRcdFx0Ly8gfVxyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblx0XHR0aGlzLmZpbmlzaGVkID0gZmFsc2U7XHJcblx0XHR0aGlzLmN1cnJGcmFtZSA9IDA7XHJcblx0XHR0aGlzLndhaXRUaW1lID0gdGhpcy5mcmFtZXNbdGhpcy5jdXJyRnJhbWVdLmZyYW1lTGVuZ3RoIHx8IHRoaXMub3B0aW9ucy5mcmFtZUxlbmd0aDtcclxuXHRcdHRoaXMuc3BlZWQgPSAxO1xyXG5cdH0sXHJcblx0XHJcblx0LyoqIElmIHRoaXMgYW5pbWF0aW9uIGlzIG9uIGEgZnJhbWUgdGhhdCBjYW4gdHJhbnNpdGlvbiB0byBhbm90aGVyIGFuaW1hdGlvbi4gKi9cclxuXHRjYW5UcmFuc2l0aW9uIDogZnVuY3Rpb24oKSB7XHJcblx0XHRyZXR1cm4gdGhpcy5maW5pc2hlZCB8fCB0aGlzLmZyYW1lc1t0aGlzLmN1cnJGcmFtZV0udHJhbnM7XHJcblx0fSxcclxuXHRcclxuXHQvKiogUmV0dXJucyB0aGUgbmFtZSBvZiB0aGUgZnJhbWUgdG8gZGlzcGxheSB0aGlzIGZyYW1lLiAqL1xyXG5cdGdldEZyYW1lVG9EaXNwbGF5IDogZnVuY3Rpb24oZGlyKSB7XHJcblx0XHRpZiAodGhpcy5vcHRpb25zLnNpbmdsZURpcikgZGlyID0gdGhpcy5vcHRpb25zLnNpbmdsZURpcjtcclxuXHRcdHJldHVybiB0aGlzLmZyYW1lc1t0aGlzLmN1cnJGcmFtZV1bZGlyXTtcclxuXHR9LFxyXG59O1xyXG5tb2R1bGUuZXhwb3J0cy5TcHJpdGVBbmltYXRpb24gPSBTcHJpdGVBbmltYXRpb247IiwiLy8gYWN0b3IuanNcclxuLy8gRGVmaW5lcyB0aGUgYWN0b3IgZXZlbnQgdXNlZCB0aHJvdWdob3V0IHRoZSBwYXJrXHJcblxyXG52YXIgRXZlbnQgPSByZXF1aXJlKFwidHBwLWV2ZW50XCIpO1xyXG52YXIgaW5oZXJpdHMgPSByZXF1aXJlKFwiaW5oZXJpdHNcIik7XHJcbnZhciBleHRlbmQgPSByZXF1aXJlKFwiZXh0ZW5kXCIpO1xyXG5cclxudmFyIENoYXJhY3RlclNwcml0ZSA9IHJlcXVpcmUoXCIuLi9tb2RlbC9zcHJpdGVtb2RlbC5qc1wiKS5DaGFyYWN0ZXJTcHJpdGU7XHJcbnZhciBnZXRTcHJpdGVGb3JtYXQgPSByZXF1aXJlKFwidHBwLWFjdG9yLWFuaW1hdGlvbnNcIikuZ2V0U3ByaXRlRm9ybWF0O1xyXG5cclxudmFyIEdMT0JBTF9TQ0FMRVVQID0gMS42NTtcclxudmFyIEVWRU5UX1BMQU5FX05PUk1BTCA9IG5ldyBUSFJFRS5WZWN0b3IzKDAsIDEsIDApO1xyXG4vKipcclxuICogQW4gYWN0b3IgaXMgYW55IGV2ZW50IHJlcHJlc2VudGluZyBhIHBlcnNvbiwgcG9rZW1vbiwgb3Igb3RoZXIgZW50aXR5IHRoYXRcclxuICogbWF5IG1vdmUgYXJvdW5kIGluIHRoZSB3b3JsZCBvciBmYWNlIGEgZGlyZWN0aW9uLiBBY3RvcnMgbWF5IGhhdmUgZGlmZmVyZW50XHJcbiAqIGJlaGF2aW9ycywgc29tZSBjb21tb24gb25lcyBwcmVkZWZpbmVkIGluIHRoaXMgZmlsZS5cclxuICovXHJcbmZ1bmN0aW9uIEFjdG9yKGJhc2UsIG9wdHMpIHtcclxuXHRFdmVudC5jYWxsKHRoaXMsIGJhc2UsIG9wdHMpO1xyXG5cdFxyXG5cdHRoaXMub24oXCJ0aWNrXCIsIHRoaXMuX2FjdG9yVGljayk7XHJcblx0dGhpcy5vbihcImludGVyYWN0ZWRcIiwgdGhpcy5fYWN0b3JJbnRlcmFjdEZhY2UpO1xyXG5cdHRoaXMub24oXCJjYW50LW1vdmVcIiwgdGhpcy5fYWN0b3JCdW1wKTtcclxuXHR0aGlzLmZhY2luZyA9IG5ldyBUSFJFRS5WZWN0b3IzKDAsIDAsIDEpO1xyXG5cdFxyXG5cdHRoaXMuX2luaXRCZWhhdmlvclN0YWNrKCk7XHJcbn1cclxuaW5oZXJpdHMoQWN0b3IsIEV2ZW50KTtcclxuZXh0ZW5kKEFjdG9yLnByb3RvdHlwZSwge1xyXG5cdHNwcml0ZTogbnVsbCxcclxuXHRzcHJpdGVfZm9ybWF0OiBudWxsLFxyXG5cdFxyXG5cdHNoYWRvdyA6IHRydWUsXHJcblx0XHJcblx0Ly8vLy8vLy8vLy8vLy8vLyBQcm9wZXJ0eSBTZXR0ZXJzIC8vLy8vLy8vLy8vLy8vLy8vXHJcblx0c2NhbGU6IDEsXHJcblx0XHJcblx0c2V0U2NhbGUgOiBmdW5jdGlvbihzY2FsZSkge1xyXG5cdFx0dGhpcy5zY2FsZSA9IHNjYWxlO1xyXG5cdFx0c2NhbGUgKj0gR0xPQkFMX1NDQUxFVVA7XHJcblx0XHR0aGlzLmF2YXRhcl9zcHJpdGUuc2NhbGUuc2V0KHNjYWxlLCBzY2FsZSwgc2NhbGUpO1xyXG5cdH0sXHJcblx0XHJcblx0Ly8vLy8vLy8vLy8vLy8vLy8vLy8vLy8gQXZhdGFyIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHRhdmF0YXJfbm9kZSA6IG51bGwsXHJcblx0YXZhdGFyX3Nwcml0ZSA6IG51bGwsXHJcblx0YXZhdGFyX2Zvcm1hdCA6IG51bGwsXHJcblx0YXZhdGFyX3RleCA6IG51bGwsXHJcblx0XHJcblx0Z2V0QXZhdGFyIDogZnVuY3Rpb24obWFwKXsgXHJcblx0XHRpZiAodGhpcy5hdmF0YXJfbm9kZSkgcmV0dXJuIHRoaXMuYXZhdGFyX25vZGU7XHJcblx0XHRcclxuXHRcdHZhciBub2RlID0gdGhpcy5hdmF0YXJfbm9kZSA9IG5ldyBUSFJFRS5PYmplY3QzRCgpO1xyXG5cdFx0XHJcblx0XHRub2RlLmFkZCh0aGlzLl9hdmF0YXJfY3JlYXRlU3ByaXRlKG1hcCkpO1xyXG5cdFx0bm9kZS5hZGQodGhpcy5fYXZhdGFyX2NyZWF0ZVNoYWRvd0Nhc3RlcihtYXApKTtcclxuXHRcdFxyXG5cdFx0cmV0dXJuIG5vZGU7XHJcblx0XHRcclxuXHR9LFxyXG5cdFxyXG5cdF9hdmF0YXJfY3JlYXRlU2hhZG93Q2FzdGVyOiBmdW5jdGlvbihtYXApIHtcclxuXHRcdHZhciBtYXQgPSBuZXcgVEhSRUUuTWVzaEJhc2ljTWF0ZXJpYWwoKTtcclxuXHRcdG1hdC52aXNpYmxlID0gZmFsc2U7IC8vVGhlIG9iamVjdCB3b24ndCByZW5kZXIsIGJ1dCB0aGUgc2hhZG93IHN0aWxsIHdpbGxcclxuXHRcdG1hcC5nYy5jb2xsZWN0KG1hdCk7XHJcblx0XHRcclxuXHRcdHZhciBnZW9tID0gbmV3IFRIUkVFLlNwaGVyZUdlb21ldHJ5KDAuMywgNywgMyk7XHJcblx0XHRtYXAuZ2MuY29sbGVjdChnZW9tKTtcclxuXHRcdFxyXG5cdFx0dmFyIG1lc2ggPSBuZXcgVEhSRUUuTWVzaChnZW9tLCBtYXQpO1xyXG5cdFx0Ly9tZXNoLnZpc2libGUgPSBmYWxzZTsgLy8/XHJcblx0XHRtZXNoLmNhc3RTaGFkb3cgPSB0cnVlO1xyXG5cdFx0bWVzaC5wb3NpdGlvbi5zZXQoMCwgMC41LCAwKTtcclxuXHRcdHJldHVybiBtZXNoO1xyXG5cdH0sXHJcblx0XHJcblx0X2F2YXRhcl9jcmVhdGVTcHJpdGUgOiBmdW5jdGlvbihtYXApIHtcclxuXHRcdHZhciBzZWxmID0gdGhpcztcclxuXHRcdHZhciBpbWcgPSBuZXcgSW1hZ2UoKTtcclxuXHRcdHZhciB0ZXh0dXJlID0gc2VsZi5hdmF0YXJfdGV4ID0gbmV3IFRIUkVFLlRleHR1cmUoaW1nKTtcclxuXHRcdG1hcC5nYy5jb2xsZWN0KHRleHR1cmUpO1xyXG5cdFx0XHJcblx0XHQvLyBOb3RlOiBub3QgdXNlaW5nIFwidGhpcy5nZXRTcHJpdGVGb3JtYXRcIiwgYmVjYXVzZSB0aGUgZGVmYWlsdCBzcHJpdGVcclxuXHRcdC8vIGZvcm1hdCBzaG91bGQgbm90IGJlIG92ZXJpZGRlbi5cclxuXHRcdHZhciBzcGZvcm1hdCA9IGdldFNwcml0ZUZvcm1hdChERUZfU1BSSVRFX0ZPUk1BVCk7XHJcblx0XHRcclxuXHRcdHRoaXMuX19vbkxvYWRTcHJpdGUoaW1nLCBzcGZvcm1hdCwgdGV4dHVyZSk7XHJcblx0XHRpbWcuc3JjID0gREVGX1NQUklURTtcclxuXHRcdFxyXG5cdFx0dGV4dHVyZS5tYWdGaWx0ZXIgPSBUSFJFRS5OZWFyZXN0RmlsdGVyO1xyXG5cdFx0dGV4dHVyZS5taW5GaWx0ZXIgPSBUSFJFRS5OZWFyZXN0RmlsdGVyO1xyXG5cdFx0dGV4dHVyZS5yZXBlYXQgPSBuZXcgVEhSRUUuVmVjdG9yMigwLjI1LCAwLjI1KTtcclxuXHRcdHRleHR1cmUub2Zmc2V0ID0gbmV3IFRIUkVFLlZlY3RvcjIoMCwgMCk7XHJcblx0XHR0ZXh0dXJlLndyYXBTID0gVEhSRUUuTWlycm9yZWRSZXBlYXRXcmFwcGluZztcclxuXHRcdHRleHR1cmUud3JhcFQgPSBUSFJFRS5NaXJyb3JlZFJlcGVhdFdyYXBwaW5nO1xyXG5cdFx0dGV4dHVyZS5nZW5lcmF0ZU1pcG1hcHMgPSBmYWxzZTsgLy9NaXBtYXBzIGdlbmVyYXRlIHVuZGVzaXJhYmxlIHRyYW5zcGFyZW5jeSBhcnRpZmFjdHNcclxuXHRcdC8vVE9ETyBNaXJyb3JlZFJlcGVhdFdyYXBwaW5nLCBhbmQganVzdCB1c2UgYSBuZWdhdGl2ZSB4IHV2IHZhbHVlLCB0byBmbGlwIGEgc3ByaXRlXHJcblx0XHRcclxuXHRcdHNlbGYuYXZhdGFyX2Zvcm1hdCA9IHNwZm9ybWF0O1xyXG5cdFx0XHJcblx0XHQvLyB2YXIgbWF0IC8qPSBzZWxmLmF2YXRhcl9tYXQqLyA9IG5ldyBUSFJFRS5TcHJpdGVNYXRlcmlhbCh7XHJcblx0XHQvLyBcdG1hcDogdGV4dHVyZSxcclxuXHRcdC8vIFx0Y29sb3I6IDB4RkZGRkZGLFxyXG5cdFx0Ly8gXHR0cmFuc3BhcmVudDogdHJ1ZSxcclxuXHRcdC8vIH0pO1xyXG5cdFx0XHJcblx0XHRjdXJyZW50TWFwLm1hcmtMb2FkaW5nKCk7XHJcblx0XHR0aGlzLl9hdmF0YXJfbG9hZFNwcml0ZShtYXAsIHRleHR1cmUpO1xyXG5cdFx0XHJcblx0XHQvL3ZhciBzcHJpdGUgPSBzZWxmLmF2YXRhcl9zcHJpdGUgPSBuZXcgVEhSRUUuU3ByaXRlKG1hdCk7XHJcblx0XHR2YXIgc3ByaXRlID0gc2VsZi5hdmF0YXJfc3ByaXRlID0gbmV3IENoYXJhY3RlclNwcml0ZSh7XHJcblx0XHRcdG1hcDogdGV4dHVyZSxcclxuXHRcdFx0Y29sb3I6IDB4RkZGRkZGLFxyXG5cdFx0XHRvZmZzZXQ6IG5ldyBUSFJFRS5WZWN0b3IzKDAsIDAuMywgMC4yMiksXHJcblx0XHRcdGdjOiBtYXAuZ2MsXHJcblx0XHR9KTtcclxuXHRcdHNlbGYuc2V0U2NhbGUoc2VsZi5zY2FsZSk7XHJcblx0XHRcclxuXHRcdHJldHVybiBzcHJpdGU7XHJcblx0fSxcclxuXHRcclxuXHRfYXZhdGFyX2xvYWRTcHJpdGUgOiBmdW5jdGlvbihtYXAsIHRleHR1cmUpIHtcclxuXHRcdHZhciBzZWxmID0gdGhpcztcclxuXHRcdG1hcC5sb2FkU3ByaXRlKHNlbGYuaWQsIHNlbGYuc3ByaXRlLCBmdW5jdGlvbihlcnIsIHVybCl7XHJcblx0XHRcdGlmIChlcnIpIHtcclxuXHRcdFx0XHRjb25zb2xlLmVycm9yKFwiRVJST1IgTE9BRElORyBTUFJJVEU6IFwiLCBlcnIpO1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0dmFyIGltZyA9IG5ldyBJbWFnZSgpO1xyXG5cdFx0XHR2YXIgZm9ybWF0ID0gc2VsZi5zcHJpdGVfZm9ybWF0O1xyXG5cdFx0XHRpZiAodHlwZW9mIGZvcm1hdCA9PSBcImZ1bmN0aW9uXCIpIFxyXG5cdFx0XHRcdGZvcm1hdCA9IHNlbGYuc3ByaXRlX2Zvcm1hdChzZWxmLnNwcml0ZSk7XHJcblx0XHRcdGlmICh0eXBlb2YgZm9ybWF0ICE9IFwic3RyaW5nXCIpIHtcclxuXHRcdFx0XHRjb25zb2xlLmVycm9yKFwiSU5WQUxJRCBTUFJJVEUgRk9STUFUISAnc3ByaXRlX2Zvcm1hdCcgbXVzdCBiZSBhIHN0cmluZyBvciBhIFwiK1xyXG5cdFx0XHRcdFx0XCJmdW5jdGlvbiB0aGF0IHJldHVybnMgYSBzdHJpbmchIFRvIHByb3ZpZGUgYSBjdXN0b20gZm9ybWF0LCBvdmVycmlkZSBcIitcclxuXHRcdFx0XHRcdFwiZ2V0U3ByaXRlRm9ybWF0IG9uIHRoZSBhY3RvciBpbnN0YW5jZSFcIik7XHJcblx0XHRcdFx0Zm9ybWF0ID0gREVGX1NQUklURV9GT1JNQVQ7XHJcblx0XHRcdH1cclxuXHRcdFx0XHJcblx0XHRcdHNlbGYuX19vbkxvYWRTcHJpdGUoaW1nLCBzZWxmLmdldFNwcml0ZUZvcm1hdChmb3JtYXQpLCB0ZXh0dXJlKTtcclxuXHRcdFx0aW1nLnNyYyA9IHVybDtcclxuXHRcdH0pO1xyXG5cdH0sXHJcblx0XHJcblx0X19vbkxvYWRTcHJpdGUgOiBmdW5jdGlvbihpbWcsIGZvcm1hdCwgdGV4dHVyZSkge1xyXG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xyXG5cdFx0dmFyIGYgPSBmdW5jdGlvbigpIHtcclxuXHRcdFx0dGV4dHVyZS5pbWFnZSA9IGltZztcclxuXHRcdFx0XHJcblx0XHRcdHNlbGYuYXZhdGFyX2Zvcm1hdCA9IGZvcm1hdDtcclxuXHRcdFx0dGV4dHVyZS5yZXBlYXQuc2V0KFxyXG5cdFx0XHRcdHNlbGYuYXZhdGFyX2Zvcm1hdC53aWR0aCAvIGltZy5uYXR1cmFsV2lkdGgsIFxyXG5cdFx0XHRcdHNlbGYuYXZhdGFyX2Zvcm1hdC5oZWlnaHQgLyBpbWcubmF0dXJhbEhlaWdodCk7XHJcblxyXG5cdFx0XHR0ZXh0dXJlLm5lZWRzVXBkYXRlID0gdHJ1ZTtcclxuXHRcdFx0XHJcblx0XHRcdC8vIHNlbGYuc2hvd0FuaW1hdGlvbkZyYW1lKFwiZDBcIik7XHJcblx0XHRcdHNlbGYucGxheUFuaW1hdGlvbihcInN0YW5kXCIpO1xyXG5cdFx0XHRpbWcucmVtb3ZlRXZlbnRMaXN0ZW5lcihcImxvYWRcIiwgZik7XHJcblx0XHRcdGN1cnJlbnRNYXAubWFya0xvYWRGaW5pc2hlZCgpO1xyXG5cdFx0fVxyXG5cdFx0aW1nLm9uKFwibG9hZFwiLCBmKTtcclxuXHR9LFxyXG5cdFxyXG5cdC8vIE92ZXJyaWRlIHRoaXMgZnVuY3Rpb24gdG8gcHJvdmlkZSBhIGN1c3RvbSBzcHJpdGUgZm9ybWF0XHJcblx0Z2V0U3ByaXRlRm9ybWF0IDogZnVuY3Rpb24oZm9ybWF0KSB7XHJcblx0XHRyZXR1cm4gZ2V0U3ByaXRlRm9ybWF0KGZvcm1hdCk7XHJcblx0fSxcclxuXHRcclxuXHQvLy8vLy8vLy8vLy8vLy8vLy8vIEFuaW1hdGlvbiAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblx0X2FuaW1hdGlvblN0YXRlIDogbnVsbCxcclxuXHRmYWNpbmcgOiBudWxsLFxyXG5cdGFuaW1hdGlvblNwZWVkOiAxLCAvL2RlZmF1bHQgYW5pbWF0aW9uIHNwZWVkXHJcblx0XHJcblx0X2luaXRBbmltYXRpb25TdGF0ZSA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0aWYgKCF0aGlzLl9hbmltYXRpb25TdGF0ZSlcclxuXHRcdFx0dGhpcy5fYW5pbWF0aW9uU3RhdGUgPSB7XHJcblx0XHRcdFx0Y3VyckFuaW0gOiBudWxsLCAvLyBBbmltYXRpb24gb2JqZWN0XHJcblx0XHRcdFx0Y3VyckZyYW1lIDogbnVsbCwgLy8gQ3VycmVudGx5IGRpc3BsYXllZCBzcHJpdGUgZnJhbWUgbmFtZVxyXG5cdFx0XHRcdG5leHRBbmltIDogbnVsbCwgLy8gQW5pbWF0aW9uIG9iamVjdCBpbiBxdWV1ZVxyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdHN0b3BOZXh0VHJhbnNpdGlvbjogZmFsc2UsIC8vU3RvcCBhdCB0aGUgbmV4dCB0cmFuc2l0aW9uIGZyYW1lLCB0byBzaG9ydC1zdG9wIHRoZSBcIkJ1bXBcIiBhbmltYXRpb25cclxuXHRcdFx0fTtcclxuXHRcdHJldHVybiB0aGlzLl9hbmltYXRpb25TdGF0ZTtcclxuXHR9LFxyXG5cdFxyXG5cdGdldERpcmVjdGlvbkZhY2luZyA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0aWYgKCFjdXJyZW50TWFwIHx8ICFjdXJyZW50TWFwLmNhbWVyYSkgcmV0dXJuIFwiZFwiO1xyXG5cdFx0XHJcblx0XHR2YXIgZGlydmVjdG9yID0gdGhpcy5mYWNpbmcuY2xvbmUoKTtcclxuXHRcdGRpcnZlY3Rvci5hcHBseVF1YXRlcm5pb24oIGN1cnJlbnRNYXAuY2FtZXJhLnF1YXRlcm5pb24gKTtcclxuXHRcdGRpcnZlY3Rvci5wcm9qZWN0T25QbGFuZShFVkVOVF9QTEFORV9OT1JNQUwpLm5vcm1hbGl6ZSgpO1xyXG5cdFx0XHJcblx0XHR2YXIgeCA9IGRpcnZlY3Rvci54LCB5ID0gZGlydmVjdG9yLno7XHJcblx0XHQvLyBjb25zb2xlLmxvZyhcIkRJUkZBQ0lORzpcIiwgeCwgeSk7XHJcblx0XHRpZiAoTWF0aC5hYnMoeCkgPiBNYXRoLmFicyh5KSkgeyAvL0RpcmVjdGlvbiB2ZWN0b3IgaXMgcG9pbnRpbmcgYWxvbmcgeCBheGlzXHJcblx0XHRcdGlmICh4ID4gMCkgcmV0dXJuIFwibFwiO1xyXG5cdFx0XHRlbHNlIHJldHVybiBcInJcIjtcclxuXHRcdH0gZWxzZSB7IC8vRGlyZWN0aW9uIHZlY3RvciBpcyBwb2ludGluZyBhbG9uZyB5IGF4aXNcclxuXHRcdFx0aWYgKHkgPiAwKSByZXR1cm4gXCJkXCI7XHJcblx0XHRcdGVsc2UgcmV0dXJuIFwidVwiO1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIFwiZFwiO1xyXG5cdH0sXHJcblx0XHJcblx0c2hvd0FuaW1hdGlvbkZyYW1lIDogZnVuY3Rpb24oZnJhbWUpIHtcclxuXHRcdHZhciBzdGF0ZSA9IHRoaXMuX2luaXRBbmltYXRpb25TdGF0ZSgpO1xyXG5cdFx0XHJcblx0XHR2YXIgZGVmID0gdGhpcy5hdmF0YXJfZm9ybWF0LmZyYW1lc1tmcmFtZV07XHJcblx0XHRpZiAoIWRlZikge1xyXG5cdFx0XHRjb25zb2xlLndhcm4oXCJFUlJPUiBcIiwgdGhpcy5pZCwgXCI6IEFuaW1hdGlvbiBmcmFtZSBkb2Vzbid0IGV4aXN0OlwiLCBmcmFtZSk7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHRcdHN0YXRlLmZyYW1lTmFtZSA9IGZyYW1lO1xyXG5cdFx0XHJcblx0XHR2YXIgZmxpcCA9IGZhbHNlO1xyXG5cdFx0aWYgKHR5cGVvZiBkZWYgPT0gXCJzdHJpbmdcIikgeyAvL3JlZGlyZWN0XHJcblx0XHRcdGRlZiA9IHRoaXMuYXZhdGFyX2Zvcm1hdC5mcmFtZXNbZGVmXTtcclxuXHRcdFx0ZmxpcCA9IHRydWU7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdHZhciB1ID0gZGVmWzBdICogdGhpcy5hdmF0YXJfdGV4LnJlcGVhdC54O1xyXG5cdFx0dmFyIHYgPSAxIC0gKChkZWZbMV0rMSkgKiB0aGlzLmF2YXRhcl90ZXgucmVwZWF0LnkpO1xyXG5cdFx0Ly9Gb3Igc29tZSByZWFzb24sIG9mZnNldHMgYXJlIGZyb20gdGhlIEJPVFRPTSBsZWZ0PyFcclxuXHRcdFxyXG5cdFx0aWYgKGZsaXAgJiYgdGhpcy5hdmF0YXJfZm9ybWF0LmZsaXApIHtcclxuXHRcdFx0dSA9IDAgLSAoZGVmWzBdLTEpICogdGhpcy5hdmF0YXJfdGV4LnJlcGVhdC54OyAvL1RPRE8gdGVzdFxyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHR0aGlzLmF2YXRhcl90ZXgub2Zmc2V0LnNldCh1LCB2KTsgXHJcblx0XHR0aGlzLmF2YXRhcl90ZXgubmVlZHNVcGRhdGUgPSB0cnVlO1xyXG5cdH0sXHJcblx0XHJcblx0cGxheUFuaW1hdGlvbiA6IGZ1bmN0aW9uKGFuaW1OYW1lLCBvcHRzKSB7XHJcblx0XHR2YXIgc3RhdGUgPSB0aGlzLl9pbml0QW5pbWF0aW9uU3RhdGUoKTtcclxuXHRcdGlmICghb3B0cykgb3B0cyA9IHt9O1xyXG5cdFx0XHJcblx0XHR2YXIgYW5pbSA9IHRoaXMuYXZhdGFyX2Zvcm1hdC5hbmltc1thbmltTmFtZV07XHJcblx0XHRpZiAoIWFuaW0pIHtcclxuXHRcdFx0Y29uc29sZS53YXJuKFwiRVJST1JcIiwgdGhpcy5pZCwgXCI6IEFuaW1hdGlvbiBuYW1lIGRvZXNuJ3QgZXhpc3Q6XCIsIGFuaW1OYW1lKTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cdFx0YW5pbS5wYXJlbnQgPSB0aGlzO1xyXG5cdFx0c3RhdGUubmV4dEFuaW0gPSBhbmltO1xyXG5cdFx0YW5pbS5zcGVlZCA9IChvcHRzLnNwZWVkID09IHVuZGVmaW5lZCk/IHRoaXMuYW5pbWF0aW9uU3BlZWQgOiBvcHRzLnNwZWVkO1xyXG5cdFx0c3RhdGUuc3RvcE5leHRUcmFuc2l0aW9uID0gb3B0cy5zdG9wTmV4dFRyYW5zaXRpb24gfHwgZmFsc2U7XHJcblx0fSxcclxuXHRcclxuXHRzdG9wQW5pbWF0aW9uIDogZnVuY3Rpb24oKSB7XHJcblx0XHR2YXIgc3RhdGUgPSB0aGlzLl9pbml0QW5pbWF0aW9uU3RhdGUoKTtcclxuXHRcdFxyXG5cdFx0Ly8gc3RhdGUucnVubmluZyA9IGZhbHNlO1xyXG5cdFx0Ly8gc3RhdGUucXVldWUgPSBudWxsO1xyXG5cdFx0Ly8gc3RhdGUuc3RvcEZyYW1lID0gbnVsbDtcclxuXHRcdHRoaXMuZW1pdChcImFuaW0tZW5kXCIsIHN0YXRlLmFuaW1OYW1lKTtcclxuXHR9LFxyXG5cdFxyXG5cdF90aWNrX2RvQW5pbWF0aW9uOiBmdW5jdGlvbihkZWx0YSkge1xyXG5cdFx0dmFyIHN0YXRlID0gdGhpcy5fYW5pbWF0aW9uU3RhdGU7XHJcblx0XHR2YXIgQ0EgPSBzdGF0ZS5jdXJyQW5pbTtcclxuXHRcdGlmICghQ0EpIENBID0gc3RhdGUuY3VyckFuaW0gPSBzdGF0ZS5uZXh0QW5pbTtcclxuXHRcdGlmICghQ0EpIHJldHVybjtcclxuXHRcdFxyXG5cdFx0Q0EuYWR2YW5jZShkZWx0YSk7XHJcblx0XHRcclxuXHRcdGlmIChzdGF0ZS5uZXh0QW5pbSAmJiBDQS5jYW5UcmFuc2l0aW9uKCkpIHtcclxuXHRcdFx0Ly9Td2l0Y2ggYW5pbWF0aW9uc1xyXG5cdFx0XHRDQS5yZXNldCgpO1xyXG5cdFx0XHRDQSA9IHN0YXRlLmN1cnJBbmltID0gc3RhdGUubmV4dEFuaW07XHJcblx0XHRcdHN0YXRlLm5leHRBbmltID0gbnVsbDtcclxuXHRcdFx0XHJcblx0XHRcdC8vIHRoaXMuZW1pdChcImFuaW0tZW5kXCIsIG51bGwpOyAvL1RPRE8gcHJvdmlkZSBhbmltIG5hbWVcclxuXHRcdFx0XHJcblx0XHRcdGlmIChzdGF0ZS5zdG9wTmV4dFRyYW5zaXRpb24pIHtcclxuXHRcdFx0XHR0aGlzLnBsYXlBbmltYXRpb24oXCJzdGFuZFwiKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHR2YXIgZGlyID0gdGhpcy5nZXREaXJlY3Rpb25GYWNpbmcoKTtcclxuXHRcdHZhciBmcmFtZSA9IENBLmdldEZyYW1lVG9EaXNwbGF5KGRpcik7XHJcblx0XHRpZiAoZnJhbWUgIT0gc3RhdGUuY3VyckZyYW1lKSB7XHJcblx0XHRcdHRoaXMuc2hvd0FuaW1hdGlvbkZyYW1lKGZyYW1lKTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdH0sXHJcblx0XHJcblx0Ly8vLy8vLy8vLy8vLy8vLy8vLyBNb3ZlbWVudCBhbmQgUGF0aGluZyAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblx0X3BhdGhpbmdTdGF0ZSA6IG51bGwsXHJcblx0XHJcblx0X2luaXRQYXRoaW5nU3RhdGUgOiBmdW5jdGlvbigpIHtcclxuXHRcdGlmICghdGhpcy5fcGF0aGluZ1N0YXRlKVxyXG5cdFx0XHR0aGlzLl9wYXRoaW5nU3RhdGUgPSB7XHJcblx0XHRcdFx0cXVldWU6IFtdLFxyXG5cdFx0XHRcdG1vdmluZzogZmFsc2UsXHJcblx0XHRcdFx0c3BlZWQ6IDEsXHJcblx0XHRcdFx0ZGVsdGE6IDAsIC8vdGhlIGRlbHRhIGZyb20gc3JjIHRvIGRlc3RcclxuXHRcdFx0XHRqdW1waW5nIDogZmFsc2UsXHJcblx0XHRcdFx0Ly8gZGlyOiBcImRcIixcclxuXHRcdFx0XHRcclxuXHRcdFx0XHRkZXN0TG9jQzogbmV3IFRIUkVFLlZlY3RvcjMoKS5zZXQodGhpcy5sb2NhdGlvbiksIC8vY29sbGlzaW9uIG1hcCBsb2NhdGlvblxyXG5cdFx0XHRcdGRlc3RMb2MzOiBuZXcgVEhSRUUuVmVjdG9yMygpLCAvL3dvcmxkIHNwYWNlIGxvY2F0aW9uXHJcblx0XHRcdFx0c3JjTG9jQzogbmV3IFRIUkVFLlZlY3RvcjMoKS5zZXQodGhpcy5sb2NhdGlvbiksXHJcblx0XHRcdFx0c3JjTG9jMzogbmV3IFRIUkVFLlZlY3RvcjMoKSxcclxuXHRcdFx0XHRtaWRwb2ludE9mZnNldDogbmV3IFRIUkVFLlZlY3RvcjMoKSxcclxuXHRcdFx0fTtcclxuXHRcdHJldHVybiB0aGlzLl9wYXRoaW5nU3RhdGU7XHJcblx0fSxcclxuXHRcclxuXHRwYXRoVG8gOiBmdW5jdGlvbih4LCB5KSB7XHJcblx0XHR2YXIgc3RhdGUgPSB0aGlzLl9pbml0UGF0aGluZ1N0YXRlKCk7XHJcblx0XHRcclxuXHRcdGNvbnNvbGUuZXJyb3IodGhpcy5pZCwgXCI6IFBhdGhpbmcgaGFzIG5vdCBiZWVuIGltcGxlbWVudGVkIHlldCFcIik7XHJcblx0fSxcclxuXHRcclxuXHRjbGVhclBhdGhpbmcgOiBmdW5jdGlvbigpIHtcclxuXHRcdHZhciBzdGF0ZSA9IHRoaXMuX2luaXRQYXRoaW5nU3RhdGUoKTtcclxuXHRcdHN0YXRlLnF1ZXVlLmxlbmd0aCA9IDA7XHJcblx0fSxcclxuXHRcclxuXHRtb3ZlRGlyIDogZnVuY3Rpb24oZGlyKSB7XHJcblx0XHR2YXIgeCA9IHRoaXMubG9jYXRpb24ueDtcclxuXHRcdHZhciB5ID0gdGhpcy5sb2NhdGlvbi55O1xyXG5cdFx0dmFyIHogPSB0aGlzLmxvY2F0aW9uLno7XHJcblx0XHRzd2l0Y2ggKGRpcikge1xyXG5cdFx0XHRjYXNlIFwiZFwiOiBjYXNlIFwiZG93blwiOlx0eSArPSAxOyBicmVhaztcclxuXHRcdFx0Y2FzZSBcInVcIjogY2FzZSBcInVwXCI6XHR5IC09IDE7IGJyZWFrO1xyXG5cdFx0XHRjYXNlIFwibFwiOiBjYXNlIFwibGVmdFwiOlx0eCAtPSAxOyBicmVhaztcclxuXHRcdFx0Y2FzZSBcInJcIjogY2FzZSBcInJpZ2h0XCI6XHR4ICs9IDE7IGJyZWFrO1xyXG5cdFx0fVxyXG5cdFx0dGhpcy5tb3ZlVG8oeCwgeSwgeik7XHJcblx0fSxcclxuXHRcclxuXHRmYWNlRGlyIDogZnVuY3Rpb24oeCwgeSkge1xyXG5cdFx0dGhpcy5mYWNpbmcuc2V0KC14LCAwLCB5KTtcclxuXHR9LFxyXG5cdFxyXG5cdG1vdmVUbyA6IGZ1bmN0aW9uKHgsIHksIGxheWVyLCBieXBhc3MpIHsgLy9ieXBhc3MgV2Fsa21hc2sgY2hlY2tcclxuXHRcdHZhciBzdGF0ZSA9IHRoaXMuX2luaXRQYXRoaW5nU3RhdGUoKTtcclxuXHRcdHZhciBzcmMgPSB0aGlzLmxvY2F0aW9uO1xyXG5cdFx0bGF5ZXIgPSAobGF5ZXIgPT0gdW5kZWZpbmVkKT8gdGhpcy5sb2NhdGlvbi56IDogbGF5ZXI7XHJcblx0XHRcclxuXHRcdHRoaXMuZmFjaW5nLnNldChzcmMueC14LCAwLCB5LXNyYy55KTtcclxuXHRcdFxyXG5cdFx0dmFyIHdhbGttYXNrID0gY3VycmVudE1hcC5jYW5XYWxrQmV0d2VlbihzcmMueCwgc3JjLnksIHgsIHkpO1xyXG5cdFx0aWYgKGJ5cGFzcyAhPT0gdW5kZWZpbmVkKSB3YWxrbWFzayA9IGJ5cGFzcztcclxuXHRcdGlmICghd2Fsa21hc2spIHtcclxuXHRcdFx0dGhpcy5lbWl0KFwiY2FudC1tb3ZlXCIsIHNyYy54LCBzcmMueSwgeCwgeSk7XHJcblx0XHRcdGN1cnJlbnRNYXAuZGlzcGF0Y2goeCwgeSwgXCJidW1wZWRcIiwgdGhpcy5mYWNpbmcpO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblx0XHRpZiAoKHdhbGttYXNrICYgMHgxMCkgPT0gMHgxMCkgeyAvLyBDaGVjayBOb05QQyB0aWxlc1xyXG5cdFx0XHRpZiAodGhpcy5pc05QQygpKSB7XHJcblx0XHRcdFx0dGhpcy5lbWl0KFwiY2FudC1tb3ZlXCIsIHNyYy54LCBzcmMueSwgeCwgeSk7XHJcblx0XHRcdFx0Y3VycmVudE1hcC5kaXNwYXRjaCh4LCB5LCBcImJ1bXBlZFwiLCB0aGlzLmZhY2luZyk7XHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHRpZiAoKHdhbGttYXNrICYgMHg4KSA9PSAweDgpIHtcclxuXHRcdFx0Ly8gVHJhbnNpdGlvbiBub3cgdG8gYW5vdGhlciBsYXllclxyXG5cdFx0XHR2YXIgdCA9IGN1cnJlbnRNYXAuZ2V0TGF5ZXJUcmFuc2l0aW9uKHgsIHksIHRoaXMubG9jYXRpb24ueik7XHJcblx0XHRcdGNvbnNvbGUubG9nKFwiTGF5ZXIgVHJhbnNpdGlvbjogXCIsIHQpO1xyXG5cdFx0XHR4ID0gdC54OyB5ID0gdC55OyBsYXllciA9IHQubGF5ZXI7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdFxyXG5cdFx0dmFyIGFuaW1vcHRzID0ge307XHJcblx0XHRzdGF0ZS5taWRwb2ludE9mZnNldC5zZXQoMCwgMCwgMCk7XHJcblx0XHRzdGF0ZS5zcmNMb2NDLnNldChzcmMpO1xyXG5cdFx0c3RhdGUuc3JjTG9jMy5zZXQoY3VycmVudE1hcC5nZXQzRFRpbGVMb2NhdGlvbihzcmMpKTtcclxuXHRcdHN0YXRlLmRlc3RMb2NDLnNldCh4LCB5LCBsYXllcik7XHJcblx0XHRzdGF0ZS5kZXN0TG9jMy5zZXQoY3VycmVudE1hcC5nZXQzRFRpbGVMb2NhdGlvbih4LCB5LCBsYXllcikpO1xyXG5cdFx0c3RhdGUuZGVsdGEgPSAwO1xyXG5cdFx0c3RhdGUuc3BlZWQgPSAxO1xyXG5cdFx0c3RhdGUubW92aW5nID0gdHJ1ZTtcclxuXHRcdFxyXG5cdFx0aWYgKCh3YWxrbWFzayAmIDB4MikgPT09IDB4Mikge1xyXG5cdFx0XHRzdGF0ZS5taWRwb2ludE9mZnNldC5zZXRZKDAuNik7XHJcblx0XHRcdHN0YXRlLmp1bXBpbmcgPSB0cnVlO1xyXG5cdFx0XHRTb3VuZE1hbmFnZXIucGxheVNvdW5kKFwid2Fsa19qdW1wXCIpO1xyXG5cdFx0XHRhbmltb3B0cy5zcGVlZCA9IDEuNTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0dGhpcy5wbGF5QW5pbWF0aW9uKFwid2Fsa1wiLCBhbmltb3B0cyk7XHJcblx0XHR0aGlzLmVtaXQoXCJtb3ZpbmdcIiwgc3RhdGUuc3JjTG9jQy54LCBzdGF0ZS5zcmNMb2NDLnksIHN0YXRlLmRlc3RMb2NDLngsIHN0YXRlLmRlc3RMb2NDLnkpO1xyXG5cdH0sXHJcblx0XHJcblx0X3RpY2tfZG9Nb3ZlbWVudCA6IGZ1bmN0aW9uKGRlbHRhKSB7XHJcblx0XHR2YXIgc3RhdGUgPSB0aGlzLl9pbml0UGF0aGluZ1N0YXRlKCk7XHJcblx0XHRcclxuXHRcdHN0YXRlLmRlbHRhICs9IHN0YXRlLnNwZWVkICogKGRlbHRhICogQ09ORklHLnNwZWVkLnBhdGhpbmcpO1xyXG5cdFx0dmFyIGFscGhhID0gTWF0aC5jbGFtcChzdGF0ZS5kZWx0YSk7XHJcblx0XHR2YXIgYmV0YSA9IE1hdGguc2luKGFscGhhICogTWF0aC5QSSk7XHJcblx0XHR0aGlzLmF2YXRhcl9ub2RlLnBvc2l0aW9uLnNldCggXHJcblx0XHRcdC8vTGVycCBiZXR3ZWVuIHNyYyBhbmQgZGVzdCAoYnVpbHQgaW4gbGVycCgpIGlzIGRlc3RydWN0aXZlLCBhbmQgc2VlbXMgYmFkbHkgZG9uZSlcclxuXHRcdFx0c3RhdGUuc3JjTG9jMy54ICsgKChzdGF0ZS5kZXN0TG9jMy54IC0gc3RhdGUuc3JjTG9jMy54KSAqIGFscGhhKSArIChzdGF0ZS5taWRwb2ludE9mZnNldC54ICogYmV0YSksXHJcblx0XHRcdHN0YXRlLnNyY0xvYzMueSArICgoc3RhdGUuZGVzdExvYzMueSAtIHN0YXRlLnNyY0xvYzMueSkgKiBhbHBoYSkgKyAoc3RhdGUubWlkcG9pbnRPZmZzZXQueSAqIGJldGEpLFxyXG5cdFx0XHRzdGF0ZS5zcmNMb2MzLnogKyAoKHN0YXRlLmRlc3RMb2MzLnogLSBzdGF0ZS5zcmNMb2MzLnopICogYWxwaGEpICsgKHN0YXRlLm1pZHBvaW50T2Zmc2V0LnogKiBiZXRhKVxyXG5cdFx0KTtcclxuXHRcdFxyXG5cdFx0aWYgKHN0YXRlLmRlbHRhID4gMSkge1xyXG5cdFx0XHR0aGlzLmVtaXQoXCJtb3ZlZFwiLCBzdGF0ZS5zcmNMb2NDLngsIHN0YXRlLnNyY0xvY0MueSwgc3RhdGUuZGVzdExvY0MueCwgc3RhdGUuZGVzdExvY0MueSk7XHJcblx0XHRcdHRoaXMubG9jYXRpb24uc2V0KCBzdGF0ZS5kZXN0TG9jQyApO1xyXG5cdFx0XHRcclxuXHRcdFx0aWYgKHN0YXRlLmp1bXBpbmcpIHtcclxuXHRcdFx0XHQvL1RPRE8gcGFydGljbGUgZWZmZWN0c1xyXG5cdFx0XHRcdFNvdW5kTWFuYWdlci5wbGF5U291bmQoXCJ3YWxrX2p1bXBfbGFuZFwiKTtcclxuXHRcdFx0XHRzdGF0ZS5qdW1waW5nID0gZmFsc2U7XHJcblx0XHRcdH1cclxuXHRcdFx0XHJcblx0XHRcdHZhciBuZXh0ID0gc3RhdGUucXVldWUuc2hpZnQoKTtcclxuXHRcdFx0aWYgKCFuZXh0KSB7XHJcblx0XHRcdFx0c3RhdGUuZGVsdGEgPSAwO1xyXG5cdFx0XHRcdHN0YXRlLm1vdmluZyA9IGZhbHNlO1xyXG5cdFx0XHRcdC8vIHRoaXMuc3RvcEFuaW1hdGlvbigpO1xyXG5cdFx0XHRcdHRoaXMucGxheUFuaW1hdGlvbihcInN0YW5kXCIpO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdHRoaXMubW92ZVRvKG5leHQueCwgbmV4dC55LCBuZXh0LnopO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fSxcclxuXHRcclxuXHRcclxuXHQvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8gQmVoYXZpb3JzIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHRiZWhhdmlvclN0YWNrIDogbnVsbCxcclxuXHRcclxuXHRfaW5pdEJlaGF2aW9yU3RhY2sgOiBmdW5jdGlvbigpIHtcclxuXHRcdGlmICghdGhpcy5iZWhhdmlvclN0YWNrKVxyXG5cdFx0XHR0aGlzLmJlaGF2aW9yU3RhY2sgPSBbXTtcclxuXHR9LFxyXG5cdFxyXG5cdF90aWNrX2RvQmVoYXZpb3IgOiBmdW5jdGlvbihkZWx0YSkge1xyXG5cdFx0dmFyIGJlaGF2ID0gdGhpcy5iZWhhdmlvclN0YWNrLnRvcDtcclxuXHRcdGlmICghYmVoYXYgfHwgIWJlaGF2Ll90aWNrKSByZXR1cm47XHJcblx0XHRiZWhhdi5fdGljayh0aGlzLCBkZWx0YSk7XHJcblx0fSxcclxuXHRcclxuXHRcclxuXHQvLy8vLy8vLy8vLy8vLy8vLy8vLy8gUHJpdmF0ZSBNZXRob2RzIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHRcclxuXHRjYW5XYWxrT24gOiBmdW5jdGlvbigpeyByZXR1cm4gZmFsc2U7IH0sXHJcblx0aXNOUEMgOiBmdW5jdGlvbigpeyByZXR1cm4gdHJ1ZTsgfSxcclxuXHRcclxuXHRfbm9ybWFsaXplTG9jYXRpb24gOiBmdW5jdGlvbigpIHtcclxuXHRcdGlmICh0aGlzLmxvY2F0aW9uID09IFwicmFuZFwiKSB7XHJcblx0XHRcdC8vUGxhY2UgdGhpcyBhY3RvciBpbiBhIGRlc2lnbmF0ZWQgcmFuZG9tIGxvY2F0aW9uXHJcblx0XHRcdHRoaXMubG9jYXRpb24gPSBjdXJyZW50TWFwLmdldFJhbmRvbU5QQ1NwYXduUG9pbnQoKTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHR2YXIgbnVtID0gRXZlbnQucHJvdG90eXBlLl9ub3JtYWxpemVMb2NhdGlvbi5jYWxsKHRoaXMpO1xyXG5cdFx0aWYgKG51bSAhPSAxIHx8ICF0aGlzLmxvY2F0aW9uKVxyXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJBY3RvcnMgY2FuIG9ubHkgYmUgaW4gb25lIHBsYWNlIGF0IGEgdGltZSEgTnVtYmVyIG9mIGxvY2F0aW9uczogXCIrbnVtKTtcclxuXHR9LFxyXG5cdFxyXG5cdF9hY3RvclRpY2sgOiBmdW5jdGlvbihkZWx0YSkge1xyXG5cdFx0Ly8gRG8gYW5pbWF0aW9uXHJcblx0XHRpZiAodGhpcy5fYW5pbWF0aW9uU3RhdGUpIFxyXG5cdFx0XHR0aGlzLl90aWNrX2RvQW5pbWF0aW9uKGRlbHRhKTtcclxuXHRcdFxyXG5cdFx0Ly8gRG8gbW92ZW1lbnRcclxuXHRcdGlmICh0aGlzLl9wYXRoaW5nU3RhdGUgJiYgdGhpcy5fcGF0aGluZ1N0YXRlLm1vdmluZylcclxuXHRcdFx0dGhpcy5fdGlja19kb01vdmVtZW50KGRlbHRhKTtcclxuXHRcdFxyXG5cdFx0Ly8gRG8gYmVoYXZpb3JcclxuXHRcdGlmICh0aGlzLmJlaGF2aW9yU3RhY2subGVuZ3RoKVxyXG5cdFx0XHR0aGlzLl90aWNrX2RvQmVoYXZpb3IoZGVsdGEpO1xyXG5cdH0sXHJcblx0XHJcblx0X2FjdG9ySW50ZXJhY3RGYWNlIDogZnVuY3Rpb24odmVjdG9yKSB7XHJcblx0XHR0aGlzLmZhY2luZyA9IHZlY3Rvci5jbG9uZSgpLm5lZ2F0ZSgpO1xyXG5cdH0sXHJcblx0XHJcblx0X2FjdG9yQnVtcCA6IGZ1bmN0aW9uKHNyY3gsIHNyY3ksIHgsIHksIHJlYXNvbikge1xyXG5cdFx0Ly8gY29uc29sZS53YXJuKHRoaXMuaWQsIFwiOiBDYW5ub3Qgd2FsayB0byBsb2NhdGlvblwiLCBcIihcIit4K1wiLFwiK3krXCIpXCIpO1xyXG5cdH0sXHJcblx0XHJcbn0pO1xyXG5tb2R1bGUuZXhwb3J0cyA9IEFjdG9yO1xyXG5cclxuXHJcblxyXG5mdW5jdGlvbiBnZXREaXJGcm9tTG9jKHgxLCB5MSwgeDIsIHkyKSB7XHJcblx0cmV0dXJuIG5ldyBUSFJFRS5WZWN0b3IzKHgyLXgxLCAwLCB5Mi15MSk7XHJcblx0Ly8gdmFyIGR4ID0geDIgLSB4MTtcclxuXHQvLyB2YXIgZHkgPSB5MiAtIHkxO1xyXG5cdC8vIGlmIChNYXRoLmFicyhkeCkgPiBNYXRoLmFicyhkeSkpIHtcclxuXHQvLyBcdGlmIChkeCA+IDApIHsgcmV0dXJuIFwiclwiOyB9XHJcblx0Ly8gXHRlbHNlIGlmIChkeCA8IDApIHsgcmV0dXJuIFwibFwiOyB9XHJcblx0Ly8gfSBlbHNlIHtcclxuXHQvLyBcdGlmIChkeSA+IDApIHsgcmV0dXJuIFwiZFwiOyB9XHJcblx0Ly8gXHRlbHNlIGlmIChkeSA8IDApIHsgcmV0dXJuIFwidVwiOyB9XHJcblx0Ly8gfVxyXG5cdC8vIHJldHVybiBcImRcIjtcclxufVxyXG5cclxuIiwiLy8gYmVoYXZpb3IuanNcclxuLy8gRGVmaW5lcyB0aGUgYmFzZWQgY2xhc3NlcyBmb3IgQWN0b3IncyBiZWhhdmlvcnNcclxuXHJcbnZhciBleHRlbmQgPSByZXF1aXJlKFwiZXh0ZW5kXCIpO1xyXG52YXIgaW5oZXJpdHMgPSByZXF1aXJlKFwiaW5oZXJpdHNcIik7XHJcblxyXG4vKiogXHJcbiAqIEEgQmVoYXZpb3IgaXMgYSBzY3JpcHQgdGhhdCBhbiBhY3RvciBpcyBmb2xsb3dpbmcsIHdoZXRoZXIgdGhhdFxyXG4gKiBiZSB3YWxraW5nIGFsb25nIGEgcGF0aCBvciBhcm91bmQgYSBjaXJjbGUsIG9yIGZvbGxvd2luZyBhIG1vcmVcclxuICogY29tcGxleCBzY3JpcHQgb2YgZXZlbnRzLiBCZWhhdmlvcnMgY2FuIGJlIHB1c2hlZCBhbmQgcG9wcGVkIG9mZlxyXG4gKiBhbiBhY3RvcidzIHN0YWNrLCBhbmQgdGhlIHRvcG1vc3Qgb25lIHdpbGwgYmUgcGFzc2VkIGNlcnRhaW4gZXZlbnRzXHJcbiAqIHRoYXQgdGhlIGFjdG9yIHJlY2lldmVzLlxyXG4gKi9cclxuXHJcbmZ1bmN0aW9uIEJlaGF2aW9yKG9wdHMpIHtcclxuXHRleHRlbmQodGhpcywgb3B0cyk7XHJcbn1cclxuZXh0ZW5kKEJlaGF2aW9yLnByb3RvdHlwZSwge1xyXG5cdHRpY2sgOiBudWxsLFxyXG5cdGludGVyYWN0IDogbnVsbCxcclxuXHRidW1wIDogbnVsbCxcclxuXHRcclxuXHRfdGljayA6IGZ1bmN0aW9uKG1lLCBkZWx0YSkge1xyXG5cdFx0aWYgKHRoaXMudGljaylcclxuXHRcdFx0dGhpcy50aWNrKG1lLCBkZWx0YSk7XHJcblx0fSxcclxuXHRfaW50ZXJhY3QgOiBmdW5jdGlvbihtZSwgZnJvbV9kaXIpIHtcclxuXHRcdC8vVE9ETyBkbyBzdGFuZGFyZCBzdHVmZiBoZXJlXHJcblx0XHRpZiAodGhpcy5pbnRlcmFjdClcclxuXHRcdFx0dGhpcy5pbnRlcmFjdChtZSwgZnJvbV9kaXIpO1xyXG5cdH0sXHJcblx0X2J1bXAgOiBmdW5jdGlvbihtZSwgZnJvbV9kaXIpIHtcclxuXHRcdGlmICh0aGlzLmJ1bXApXHJcblx0XHRcdHRoaXMuYnVtcChtZSwgZnJvbV9kaXIpO1xyXG5cdH0sXHJcbn0pO1xyXG5tb2R1bGUuZXhwb3J0cyA9IEJlaGF2aW9yO1xyXG5cclxuXHJcbi8vLy8vLy8vLy8vIENvbW1vbiBCZWhhdmlvcnMgLy8vLy8vLy8vLy9cclxuXHJcbmZ1bmN0aW9uIFRhbGtpbmcob3B0cykge1xyXG5cdEJlaGF2aW9yLmNhbGwodGhpcywgb3B0cyk7XHJcbn1cclxuaW5oZXJpdHMoVGFsa2luZywgQmVoYXZpb3IpO1xyXG5leHRlbmQoVGFsa2luZy5wcm90b3R5cGUsIHtcclxuXHR0aWNrOiBmdW5jdGlvbihtZSwgZGVsdGEpIHt9LFxyXG59KTtcclxubW9kdWxlLmV4cG9ydHMuVGFsa2luZyA9IFRhbGtpbmc7XHJcblxyXG5cclxuXHJcbmZ1bmN0aW9uIExvb2tBcm91bmQob3B0cykge1xyXG5cdEJlaGF2aW9yLmNhbGwodGhpcywgb3B0cyk7XHJcbn1cclxuaW5oZXJpdHMoTG9va0Fyb3VuZCwgQmVoYXZpb3IpO1xyXG5leHRlbmQoTG9va0Fyb3VuZC5wcm90b3R5cGUsIHtcclxuXHR3YWl0VGltZSA6IDAsXHJcblx0dGljazogZnVuY3Rpb24obWUsIGRlbHRhKSB7XHJcblx0XHRpZiAodGhpcy53YWl0VGltZSA+IDApIHtcclxuXHRcdFx0dGhpcy53YWl0VGltZSAtPSBkZWx0YTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHRzd2l0Y2goIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSo0KSApIHtcclxuXHRcdFx0Y2FzZSAwOiBtZS5mYWNpbmcuc2V0KCAxLDAsIDApOyBicmVhaztcclxuXHRcdFx0Y2FzZSAxOiBtZS5mYWNpbmcuc2V0KC0xLDAsIDApOyBicmVhaztcclxuXHRcdFx0Y2FzZSAyOiBtZS5mYWNpbmcuc2V0KCAwLDAsIDEpOyBicmVhaztcclxuXHRcdFx0Y2FzZSAzOiBtZS5mYWNpbmcuc2V0KCAwLDAsLTEpOyBicmVhaztcclxuXHRcdH1cclxuXHRcdHRoaXMud2FpdFRpbWUgKz0gKE1hdGgucmFuZG9tKCkgKiAzMCkgKyA1O1xyXG5cdH0sXHJcbn0pO1xyXG5tb2R1bGUuZXhwb3J0cy5Mb29rQXJvdW5kID0gTG9va0Fyb3VuZDtcclxuXHJcblxyXG5cclxuZnVuY3Rpb24gTWVhbmRlcihvcHRzKSB7XHJcblx0QmVoYXZpb3IuY2FsbCh0aGlzLCBvcHRzKTtcclxufVxyXG5pbmhlcml0cyhNZWFuZGVyLCBCZWhhdmlvcik7XHJcbmV4dGVuZChNZWFuZGVyLnByb3RvdHlwZSwge1xyXG5cdHdhaXRUaW1lIDogMCxcclxuXHR0aWNrOiBmdW5jdGlvbihtZSwgZGVsdGEpIHtcclxuXHRcdGlmICh0aGlzLndhaXRUaW1lID4gMCkge1xyXG5cdFx0XHR0aGlzLndhaXRUaW1lIC09IGRlbHRhO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdHN3aXRjaCggTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpKjgpICkge1xyXG5cdFx0XHRjYXNlIDA6IG1lLmZhY2luZy5zZXQoIDEsMCwgMCk7IGJyZWFrO1xyXG5cdFx0XHRjYXNlIDE6IG1lLmZhY2luZy5zZXQoLTEsMCwgMCk7IGJyZWFrO1xyXG5cdFx0XHRjYXNlIDI6IG1lLmZhY2luZy5zZXQoIDAsMCwgMSk7IGJyZWFrO1xyXG5cdFx0XHRjYXNlIDM6IG1lLmZhY2luZy5zZXQoIDAsMCwtMSk7IGJyZWFrO1xyXG5cdFx0XHRjYXNlIDQ6IG1lLm1vdmVEaXIoXCJkXCIpOyBicmVhaztcclxuXHRcdFx0Y2FzZSA1OiBtZS5tb3ZlRGlyKFwidVwiKTsgYnJlYWs7XHJcblx0XHRcdGNhc2UgNjogbWUubW92ZURpcihcImxcIik7IGJyZWFrO1xyXG5cdFx0XHRjYXNlIDc6IG1lLm1vdmVEaXIoXCJyXCIpOyBicmVhaztcclxuXHRcdH1cclxuXHRcdHRoaXMud2FpdFRpbWUgKz0gKE1hdGgucmFuZG9tKCkgKiAzMCkgKyA1O1xyXG5cdH0sXHJcbn0pO1xyXG5tb2R1bGUuZXhwb3J0cy5NZWFuZGVyID0gTWVhbmRlcjtcclxuXHJcbiIsIi8vIGNvbnRyb2xsZXIuanNcclxuLy8gVGhpcyBjbGFzcyBoYW5kbGVzIGlucHV0IGFuZCBjb252ZXJ0cyBpdCB0byBjb250cm9sIHNpZ25hbHNcclxuXHJcbnZhciBpbmhlcml0cyA9IHJlcXVpcmUoXCJpbmhlcml0c1wiKTtcclxudmFyIGV4dGVuZCA9IHJlcXVpcmUoXCJleHRlbmRcIik7XHJcbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKFwiZXZlbnRzXCIpLkV2ZW50RW1pdHRlcjtcclxuXHJcbi8vIFRPRE8gaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvR3VpZGUvQVBJL0dhbWVwYWRcclxuXHJcbmZ1bmN0aW9uIENvbnRyb2xNYW5hZ2VyKCkge1xyXG5cdHZhciBzZWxmID0gdGhpcztcclxuXHR0aGlzLnNldEtleUNvbmZpZygpO1xyXG5cdFxyXG5cdCQoZnVuY3Rpb24oKXtcclxuXHRcdCQoZG9jdW1lbnQpLm9uKFwia2V5ZG93blwiLCBmdW5jdGlvbihlKXsgc2VsZi5vbktleURvd24oZSk7IH0pO1xyXG5cdFx0JChkb2N1bWVudCkub24oXCJrZXl1cFwiLCBmdW5jdGlvbihlKXsgc2VsZi5vbktleVVwKGUpOyB9KTtcclxuXHRcdFxyXG5cdFx0JChcIiNjaGF0Ym94XCIpLm9uKFwiZm9jdXNcIiwgZnVuY3Rpb24oZSl7IFxyXG5cdFx0XHRjb25zb2xlLmxvZyhcIkNIQVQgRk9DVVNcIik7XHJcblx0XHRcdHNlbGYuaW5wdXRDb250ZXh0LnB1c2goXCJjaGF0XCIpOyBcclxuXHRcdH0pO1xyXG5cdFx0JChcIiNjaGF0Ym94XCIpLm9uKFwiYmx1clwiLCBmdW5jdGlvbihlKXsgXHJcblx0XHRcdGNvbnNvbGUubG9nKFwiQ0hBVCBCTFVSXCIpO1xyXG5cdFx0XHRpZiAoc2VsZi5pbnB1dENvbnRleHQudG9wID09IFwiY2hhdFwiKVxyXG5cdFx0XHRcdHNlbGYuaW5wdXRDb250ZXh0LnBvcCgpOyBcclxuXHRcdH0pO1xyXG5cdH0pXHJcbn1cclxuaW5oZXJpdHMoQ29udHJvbE1hbmFnZXIsIEV2ZW50RW1pdHRlcik7XHJcbmV4dGVuZChDb250cm9sTWFuYWdlci5wcm90b3R5cGUsIHtcclxuXHRpbnB1dENvbnRleHQgOiBbXCJnYW1lXCJdLFxyXG5cdFxyXG5cdGtleXNfY29uZmlnIDoge1xyXG5cdFx0VXA6IFszOCwgXCJVcFwiLCA4NywgXCJ3XCJdLCBcclxuXHRcdERvd246IFs0MCwgXCJEb3duXCIsIDgzLCBcInNcIl0sIFxyXG5cdFx0TGVmdDogWzM3LCBcIkxlZnRcIiwgNjUsIFwiYVwiXSwgXHJcblx0XHRSaWdodDogWzM5LCBcIlJpZ2h0XCIsIDY4LCBcImRcIl0sXHJcblx0XHRJbnRlcmFjdDogWzEzLCBcIkVudGVyXCIsIDMyLCBcIiBcIl0sXHJcblx0XHRGb2N1c0NoYXQ6IFsxOTEsIFwiL1wiXSxcclxuXHR9LFxyXG5cdFxyXG5cdGtleXNfYWN0aXZlIDoge30sXHJcblx0XHJcblx0a2V5c19kb3duIDoge1xyXG5cdFx0VXA6IGZhbHNlLCBEb3duOiBmYWxzZSxcclxuXHRcdExlZnQ6IGZhbHNlLCBSaWdodDogZmFsc2UsXHJcblx0XHRJbnRlcmFjdDogZmFsc2UsIEZvY3VzQ2hhdDogZmFsc2UsXHJcblx0fSxcclxuXHRcclxuXHRwdXNoSW5wdXRDb250ZXh0OiBmdW5jdGlvbihjdHgpIHtcclxuXHRcdHRoaXMuaW5wdXRDb250ZXh0LnB1c2goY3R4KTtcclxuXHR9LFxyXG5cdHBvcElucHV0Q29udGV4dDogZnVuY3Rpb24oY3R4KSB7XHJcblx0XHRpZiAoIWN0eCB8fCB0aGlzLmlucHV0Q29udGV4dC50b3AgPT0gY3R4KVxyXG5cdFx0XHR0aGlzLmlucHV0Q29udGV4dC5wb3AoKTtcclxuXHR9LFxyXG5cdFxyXG5cdGlzRG93biA6IGZ1bmN0aW9uKGtleSwgY3R4KSB7XHJcblx0XHRpZiAoJC5pc0FycmF5KGN0eCkpIHtcclxuXHRcdFx0dmFyIGdvID0gZmFsc2U7XHJcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgY3R4Lmxlbmd0aDsgaSsrKSBnbyB8PSBjdHhbaV07XHJcblx0XHRcdGlmICghZ28pIHJldHVybjtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdGlmICh0aGlzLmlucHV0Q29udGV4dC50b3AgIT0gY3R4KSByZXR1cm47XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdHJldHVybiB0aGlzLmtleXNfZG93bltrZXldO1xyXG5cdH0sXHJcblx0XHJcblx0c2V0S2V5Q29uZmlnIDogZnVuY3Rpb24oKSB7XHJcblx0XHR0aGlzLmtleXNfYWN0aXZlID0gZXh0ZW5kKHRydWUsIHt9LCB0aGlzLmtleXNfY29uZmlnKTtcclxuXHR9LFxyXG5cdFxyXG5cdG9uS2V5RG93biA6IGZ1bmN0aW9uKGUpIHtcclxuXHRcdGZvciAodmFyIGFjdGlvbiBpbiB0aGlzLmtleXNfYWN0aXZlKSB7XHJcblx0XHRcdHZhciBrZXlzID0gdGhpcy5rZXlzX2FjdGl2ZVthY3Rpb25dO1xyXG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGtleXMubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0XHRpZiAoZS53aGljaCA9PSBrZXlzW2ldKSB7XHJcblx0XHRcdFx0XHQvLyBLZXkgaXMgbm93IGRvd24hXHJcblx0XHRcdFx0XHR0aGlzLmVtaXRLZXkoYWN0aW9uLCB0cnVlKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9LFxyXG5cdG9uS2V5VXAgOiBmdW5jdGlvbiAoZSkge1xyXG5cdFx0Zm9yICh2YXIgYWN0aW9uIGluIHRoaXMua2V5c19hY3RpdmUpIHtcclxuXHRcdFx0dmFyIGtleXMgPSB0aGlzLmtleXNfYWN0aXZlW2FjdGlvbl07XHJcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRcdGlmIChlLndoaWNoID09IGtleXNbaV0pIHtcclxuXHRcdFx0XHRcdC8vIEtleSBpcyBub3cgdXAhXHJcblx0XHRcdFx0XHR0aGlzLmVtaXRLZXkoYWN0aW9uLCBmYWxzZSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fSxcclxuXHRcclxuXHRzdWJtaXRDaGF0S2V5cHJlc3MgOiBmdW5jdGlvbihrZXkpIHtcclxuXHRcdHN3aXRjaChrZXkpIHtcclxuXHRcdFx0XHJcblx0XHR9XHJcblx0fSxcclxuXHRcclxuXHRlbWl0S2V5IDogZnVuY3Rpb24oYWN0aW9uLCBkb3duKSB7XHJcblx0XHRpZiAodGhpcy5rZXlzX2Rvd25bYWN0aW9uXSAhPSBkb3duKSB7XHJcblx0XHRcdHRoaXMua2V5c19kb3duW2FjdGlvbl0gPSBkb3duO1xyXG5cdFx0XHR0aGlzLmVtaXQoXCJjb250cm9sLWFjdGlvblwiLCBhY3Rpb24sIGRvd24pO1xyXG5cdFx0fVxyXG5cdH0sXHJcblx0XHJcbn0pO1xyXG5cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gbmV3IENvbnRyb2xNYW5hZ2VyKCk7XHJcbiIsIi8vIGV2ZW50LmpzXHJcbi8vIERlZmluZXMgdGhlIGJhc2UgZXZlbnQgdXNlZCB0aHJvdWdob3V0IHRoZSBwYXJrLlxyXG5cclxuLy8gRml0dGluZ2x5LCBFdmVudCBpcyBhIHN1YmNsYXNzIG9mIG5vZGUuanMncyBFdmVudEVtaXR0ZXIgY2xhc3MuXHJcbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKFwiZXZlbnRzXCIpLkV2ZW50RW1pdHRlcjtcclxudmFyIGluaGVyaXRzID0gcmVxdWlyZShcImluaGVyaXRzXCIpO1xyXG52YXIgZXh0ZW5kID0gcmVxdWlyZShcImV4dGVuZFwiKTtcclxuXHJcbi8qKlxyXG4gKiBBbiBldmVudCBpcyBhbnkgaW50ZXJhY3RhYmxlIG9yIGFuaW1hdGluZyBvYmplY3QgaW4gdGhlIGdhbWUuXHJcbiAqIFRoaXMgaW5jbHVkZXMgdGhpbmdzIHJhbmdpbmcgZnJvbSBzaWducywgdG8gcGVvcGxlL3Bva2Vtb24uXHJcbiAqIEFuIGV2ZW50OlxyXG4gKlx0LSBUYWtlcyB1cCBhdCBsZWFzdCBvbmUgdGlsZSBvbiB0aGUgbWFwXHJcbiAqXHQtIENhbiBiZSBpbnRlcmFjdGVkIHdpdGggYnkgaW4tZ2FtZSB0YWxraW5nIG9yIG9uLXNjcmVlbiBjbGlja1xyXG4gKlx0LSBNYXkgYmUgcmVwcmVzZW50ZWQgaW4tZ2FtZSBieSBhIHNwcml0ZVxyXG4gKlx0LSBNYXkgZGVjaWRlLCB1cG9uIGNyZWF0aW9uLCB0byBub3QgYXBwZWFyIG9uIHRoZSBtYXAuXHJcbiAqL1xyXG5mdW5jdGlvbiBFdmVudChiYXNlLCBvcHRzKSB7XHJcblx0RXZlbnRFbWl0dGVyLmNhbGwodGhpcyk7XHJcblx0XHJcblx0ZXh0ZW5kKHRoaXMsIGJhc2UsIG9wdHMpO1xyXG5cdFxyXG5cdHRoaXMuX25vcm1hbGl6ZUxvY2F0aW9uKCk7XHJcblx0XHJcblx0aWYgKHRoaXMub25FdmVudHMpIHtcclxuXHRcdHZhciBrZXlzID0gT2JqZWN0LmtleXModGhpcy5vbkV2ZW50cyk7XHJcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGtleXMubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0dGhpcy5vbihrZXlzW2ldLCB0aGlzLm9uRXZlbnRzW2tleXNbaV1dKTtcclxuXHRcdH1cclxuXHRcdGRlbGV0ZSB0aGlzLm9uRXZlbnRzO1xyXG5cdH1cclxufVxyXG5pbmhlcml0cyhFdmVudCwgRXZlbnRFbWl0dGVyKTtcclxuZXh0ZW5kKEV2ZW50LnByb3RvdHlwZSwge1xyXG5cdGlkIDogbnVsbCxcclxuXHRlbmFibGVkIDogZmFsc2UsXHJcblx0dmlzaWJsZSA6IHRydWUsXHJcblx0XHJcblx0bG9jYXRpb24gOiBudWxsLCAvLyBFdmVudHMgd2l0aCBhIHNpbmdsZSBsb2NhdGlvbiBhcmUgb3B0aW1pemVkIGZvciBpdFxyXG5cdGxvY2F0aW9ucyA6IG51bGwsIC8vIEV2ZW50cyB3aXRoIG11bHRpcGxlIGxvY2F0aW9ucyBhcmUgb3B0aW1pemVkIGZvciB0aGF0IGFsc29cclxuXHRcclxuXHR0b1N0cmluZyA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0aWYgKCF0aGlzLmlkKSByZXR1cm4gXCI8TG9jYWwgb3IgVW5uYW1lZCBFdmVudD5cIjtcclxuXHRcdHJldHVybiB0aGlzLmlkO1xyXG5cdH0sXHJcblx0XHJcblx0c2hvdWxkQXBwZWFyIDogZnVuY3Rpb24oKXsgcmV0dXJuIHRydWU7IH0sXHJcblx0Y2FuV2Fsa09uIDogZnVuY3Rpb24oKXsgcmV0dXJuIHRydWU7IH0sXHJcblx0XHJcblx0LyoqIFJldHVybnMgYW4gb2JqZWN0IHRvIHJlcHJlc2VudCB0aGlzIGV2ZW50IGluIDNEIHNwYWNlLCBvciBudWxsIGlmIHRoZXJlIHNob3VsZG4ndCBiZSBvbmUuICovXHJcblx0Z2V0QXZhdGFyIDogZnVuY3Rpb24oKXsgcmV0dXJuIG51bGw7IH0sXHJcblx0XHJcblx0b25FdmVudHMgOiBudWxsLCAvL2Egb2JqZWN0LCBldmVudC1uYW1lcyAtPiBmdW5jdGlvbnMgdG8gY2FsbCwgdG8gYmUgcmVnaXN0ZXJlZCBpbiBjb25zdHJ1Y3RvclxyXG5cdFxyXG5cdGNhbk1vdmUgOiBmdW5jdGlvbigpIHtcclxuXHRcdC8vSWYgd2Ugb25seSBoYXZlIDEgbG9jYXRpb24sIHRoZW4gd2UgY2FuIG1vdmVcclxuXHRcdHJldHVybiAhIXRoaXMubG9jYXRpb24gJiYgIXRoaXMubG9jYXRpb25zO1xyXG5cdH0sXHJcblx0XHJcblx0bW92ZVRvIDogZnVuY3Rpb24oeCwgeSkge1xyXG5cdFx0aWYgKCF0aGlzLmNhbk1vdmUoKSlcclxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiVGhpcyBldmVudCBpcyBpbiBzZXZlcmFsIHBsYWNlcyBhdCBvbmNlLCBhbmQgY2Fubm90IG1vdmVUbyFcIik7XHJcblx0XHRcclxuXHRcdC8vVE9ETyBxdWV1ZSB1cCBhIG1vdmVcclxuXHR9LFxyXG5cdFxyXG5cdF9ub3JtYWxpemVMb2NhdGlvbiA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0aWYgKHRoaXMubG9jYXRpb24pIHtcclxuXHRcdFx0Ly9JZiB3ZSBoYXZlIGEgc2luZ3VsYXIgbG9jYXRpb24gc2V0XHJcblx0XHRcdGlmICh0aGlzLmxvY2F0aW9ucykgLy8gQXMgbG9uZyBhcyB3ZSBkb24ndCBhbHNvIGhhdmUgYSBsaXN0LCBpdHMgZmluZVxyXG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcihcIkV2ZW50IHdhcyBpbml0aWFsaXplZCB3aXRoIGJvdGggbG9jYXRpb24gYW5kIGxvY2F0aW9ucyEgVGhleSBjYW5ub3QgYmUgYm90aCBkZWZpbmVkIVwiKTtcclxuXHRcdFx0XHJcblx0XHRcdHZhciBsb2MgPSB0aGlzLmxvY2F0aW9uO1xyXG5cdFx0XHRpZiAoJC5pc0FycmF5KGxvYykgJiYgbG9jLmxlbmd0aCA9PSAyICYmIHR5cGVvZiBsb2NbMF0gPT0gXCJudW1iZXJcIiAmJiB0eXBlb2YgbG9jWzFdID09IFwibnVtYmVyXCIpIFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0bG9jID0gbmV3IFRIUkVFLlZlY3RvcjIobG9jWzBdLCBsb2NbMV0pO1xyXG5cdFx0XHR9IFxyXG5cdFx0XHRlbHNlIGlmICgkLmlzQXJyYXkobG9jKSAmJiBsb2MubGVuZ3RoID09IDMgXHJcblx0XHRcdFx0JiYgdHlwZW9mIGxvY1swXSA9PSBcIm51bWJlclwiICYmIHR5cGVvZiBsb2NbMV0gPT0gXCJudW1iZXJcIiAmJiB0eXBlb2YgbG9jWzJdID09IFwibnVtYmVyXCIpIFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0bG9jID0gbmV3IFRIUkVFLlZlY3RvcjMobG9jWzBdLCBsb2NbMV0sIGxvY1syXSk7XHJcblx0XHRcdH0gXHJcblx0XHRcdGVsc2UgaWYgKCEobG9jIGluc3RhbmNlb2YgVEhSRUUuVmVjdG9yMiB8fCBsb2MgaW5zdGFuY2VvZiBUSFJFRS5WZWN0b3IzKSkgXHJcblx0XHRcdHtcclxuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJDb3VsZCBub3Qgbm9ybWFsaXplIGxvY2F0aW9uIG9mIFwiK3RoaXMuaWQrXCIhXCIpO1xyXG5cdFx0XHR9XHJcblx0XHRcdHRoaXMubG9jYXRpb24gPSBsb2M7XHJcblx0XHRcdHJldHVybiAxO1xyXG5cdFx0fVxyXG5cdFx0dmFyIG9yZ2xvYyA9IHRoaXMubG9jYXRpb25zO1xyXG5cdFx0dmFyIGxvY3MgPSBudWxsO1xyXG5cdFx0XHJcblx0XHRpZiAoJC5pc0FycmF5KG9yZ2xvYykpIHtcclxuXHRcdFx0dmFyIHR5cGUgPSBudWxsLCBuZXdUeXBlID0gbnVsbDtcclxuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBvcmdsb2MubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0XHRpZiAodHlwZW9mIG9yZ2xvY1tpXSA9PSBcIm51bWJlclwiKVxyXG5cdFx0XHRcdFx0bmV3VHlwZSA9IFwibnVtYmVyXCI7XHJcblx0XHRcdFx0ZWxzZSBpZiAob3JnbG9jW2ldIGluc3RhbmNlb2YgVEhSRUUuVmVjdG9yMilcclxuXHRcdFx0XHRcdG5ld1R5cGUgPSBcInZlY3RvclwiO1xyXG5cdFx0XHRcdGVsc2UgaWYgKG9yZ2xvY1tpXSBpbnN0YW5jZW9mIFRIUkVFLlZlY3RvcjMpXHJcblx0XHRcdFx0XHRuZXdUeXBlID0gXCJ2ZWN0b3JcIjtcclxuXHRcdFx0XHRlbHNlIGlmICgkLmlzQXJyYXkob3JnbG9jW2ldKSlcclxuXHRcdFx0XHRcdG5ld1R5cGUgPSBcImFycmF5XCI7XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0aWYgKCF0eXBlKSB0eXBlID0gbmV3VHlwZTtcclxuXHRcdFx0XHRpZiAodHlwZSAhPSBuZXdUeXBlKSB7XHJcblx0XHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJDb3VsZCBub3Qgbm9ybWFsaXplIGxvY2F0aW9ucyBvZiBcIit0aGlzLmlkK1wiIVwiKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdFx0aWYgKHR5cGUgPT0gXCJudW1iZXJcIikgbG9jcyA9IF9fcGFyc2VBc051bWJlckFycmF5KG9yZ2xvYyk7XHJcblx0XHRcdGlmICh0eXBlID09IFwiYXJyYXlcIikgbG9jcyA9IF9fcGFyc2VBc0FycmF5QXJyYXkob3JnbG9jKTtcclxuXHRcdFx0aWYgKHR5cGUgPT0gXCJ2ZWN0b3JcIikgbG9jcyA9IG9yZ2xvYztcclxuXHRcdH1cclxuXHRcdGVsc2UgaWYgKCQuaXNGdW5jdGlvbihvcmdsb2MpKSB7XHJcblx0XHRcdGxvY3MgPSBvcmdsb2MuY2FsbCh0aGlzKTtcclxuXHRcdH1cclxuXHRcdGVsc2UgaWYgKG9yZ2xvYyBpbnN0YW5jZW9mIFRIUkVFLlZlY3RvcjIpIHtcclxuXHRcdFx0bG9jcyA9IFtvcmdsb2NdO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHRpZiAoIWxvY3MgfHwgISQuaXNBcnJheShsb2NzKSB8fCBsb2NzLmxlbmd0aCA9PSAwKSBcclxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiQ291bGQgbm90IG5vcm1hbGl6ZSBsb2NhdGlvbnMgb2YgXCIrdGhpcy5pZCtcIiFcIik7XHJcblx0XHRcclxuXHRcdHRoaXMubG9jYXRpb25zID0gbG9jcztcclxuXHRcdHRoaXMuX25vcm1hbGl6ZUxvY2F0aW9uID0gZnVuY3Rpb24oKXsgcmV0dXJuIGxvY3MubGVuZ3RoOyB9OyAvL2Nhbid0IG5vcm1hbGl6ZSB0d2ljZVxyXG5cdFx0cmV0dXJuIGxvY3MubGVuZ3RoO1xyXG5cdFx0XHJcblx0XHRmdW5jdGlvbiBfX3BhcnNlQXNOdW1iZXJBcnJheShsKSB7XHJcblx0XHRcdGlmIChsLmxlbmd0aCA9PSAyKSAvL3NpbmdsZSBwb2ludCBbeCwgeV1cclxuXHRcdFx0XHRyZXR1cm4gW25ldyBUSFJFRS5WZWN0b3IyKGxbMF0sIGxbMV0pXTtcclxuXHRcdFx0aWYgKGwubGVuZ3RoID09IDMpIC8vc2luZ2xlIHBvaW50IFt4LCB5LCB6XVxyXG5cdFx0XHRcdHJldHVybiBbbmV3IFRIUkVFLlZlY3RvcjMobFswXSwgbFsxXSwgbFsyXSldO1xyXG5cdFx0XHRpZiAobC5sZW5ndGggPT0gNCkgeyAvL3JlY3RhbmdsZSBbeCwgeSwgdywgaF1cclxuXHRcdFx0XHR2YXIgbiA9IFtdO1xyXG5cdFx0XHRcdGZvciAodmFyIHggPSBsWzBdOyB4IDwgbFswXStsWzJdOyB4KyspIHtcclxuXHRcdFx0XHRcdGZvciAodmFyIHkgPSBsWzFdOyB5IDwgbFsxXStsWzNdOyB5KyspIHtcclxuXHRcdFx0XHRcdFx0bi5wdXNoKG5ldyBUSFJFRS5WZWN0b3IyKHgsIHkpKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0cmV0dXJuIG47XHJcblx0XHRcdH1cclxuXHRcdFx0aWYgKGwubGVuZ3RoID09IDUpIHsgLy9yZWN0YW5nbGUgW3gsIHksIHosIHcsIGhdXHJcblx0XHRcdFx0dmFyIG4gPSBbXTtcclxuXHRcdFx0XHRmb3IgKHZhciB4ID0gbFswXTsgeCA8IGxbMF0rbFszXTsgeCsrKSB7XHJcblx0XHRcdFx0XHRmb3IgKHZhciB5ID0gbFsxXTsgeSA8IGxbMV0rbFs0XTsgeSsrKSB7XHJcblx0XHRcdFx0XHRcdG4ucHVzaChuZXcgVEhSRUUuVmVjdG9yMyh4LCB5LCBsWzJdKSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdHJldHVybiBuO1xyXG5cdFx0XHR9XHJcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIkNvdWxkIG5vdCBub3JtYWxpemUgbG9jYXRpb24ocykgb2YgXCIrdGhpcy5pZCtcIiFcIik7XHJcblx0XHR9XHJcblx0XHRmdW5jdGlvbiBfX3BhcnNlQXNBcnJheUFycmF5KGwpIHtcclxuXHRcdFx0dmFyIG4gPSBbXTtcclxuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBsLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdFx0Zm9yICh2YXIgaiA9IDA7IGogPCBsW2ldLmxlbmd0aDsgaisrKSB7XHJcblx0XHRcdFx0XHRpZiAodHlwZW9mIGxbaV1bal0gIT0gXCJudW1iZXJcIilcclxuXHRcdFx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiQ291bGQgbm90IG5vcm1hbGl6ZSBsb2NhdGlvbihzKSBvZiBcIit0aGlzLmlkK1wiIVwiKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0bi5wdXNoKF9fcGFyc2VBc051bWJlckFycmF5KGxbaV0pKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRyZXR1cm4gbjtcclxuXHRcdH1cclxuXHR9LFxyXG5cdFxyXG59KTtcclxubW9kdWxlLmV4cG9ydHMgPSBFdmVudDtcclxuXHJcbkV2ZW50LnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9XHJcbkV2ZW50LnByb3RvdHlwZS5vbiA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XHJcblx0aWYgKCQuaW5BcnJheSh0eXBlLCBfX0VWRU5UX1RZUEVTX18pID09IC0xKSB7XHJcblx0XHRjb25zb2xlLmVycm9yKFwiTWFwIEV2ZW50XCIsIHRoaXMudG9TdHJpbmcoKSwgXCJyZWdpc3RlcmluZyBlbWl0dGVkIGV2ZW50IHR5cGVcIiwgXHJcblx0XHRcdHR5cGUsIFwid2hpY2ggaXMgbm90IGEgdmFsaWQgZW1pdHRlZCBldmVudCB0eXBlIVwiKTtcclxuXHR9XHJcblx0RXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbi5jYWxsKHRoaXMsIHR5cGUsIGxpc3RlbmVyKTtcclxufVxyXG5cclxuLy8gVGhlIGZvbGxvd2luZyBpcyBhIGxpc3Qgb2YgZXZlbnRzIHRoZSBiYXNlIEV2ZW50IGNsYXNzIGFuZCBsaWJyYXJ5IGVtaXRcclxuLy8gVGhpcyBsaXN0IGlzIGNoZWNrZWQgYWdhaW5zdCB3aGVuIHJlZ2lzdGVyaW5nIHRvIGNhdGNoIG1pc3NwZWxsaW5ncy5cclxudmFyIF9fRVZFTlRfVFlQRVNfXyA9IFtcclxuXHRcImVudGVyaW5nLXRpbGVcIiwgLy8oZnJvbS1kaXIpIFxyXG5cdFx0Ly9lbWl0dGVkIHVwb24gdGhlIHBsYXllciBpcyBnaXZlbiB0aGUgZ28gYWhlYWQgdG8gZW50ZXIgdGhlIHRpbGUgdGhpcyBldmVudCBvY2N1cGllcy5cclxuXHRcImVudGVyZWQtdGlsZVwiLCAvLyhmcm9tLWRpcilcclxuXHRcdC8vZW1pdHRlZCB1cG9uIHRoZSBwbGF5ZXIgbGFuZGluZyBvbiB0aGUgdGlsZSB0aGlzIGV2ZW50IG9jY3VwaWVzLlxyXG5cdFwibGVhdmluZy10aWxlXCIsIC8vKHRvLWRpcilcclxuXHRcdC8vZW1pdHRlZCB1cG9uIHRoZSBwbGF5ZXIgaXMgZ2l2ZW4gdGhlIGdvIGFoZWFkIHRvIGxlYXZlIHRoZSB0aWxlIHRoaXMgZXZlbnQgb2NjdXBpZXMuXHJcblx0XCJsZWZ0LXRpbGVcIiwgLy8odG8tZGlyKVxyXG5cdFx0Ly9lbWl0dGVkIHVwb24gdGhlIHBsYXllciBjb21wbGV0ZWx5IGxlYXZpbmcgdGhlIHRpbGUgdGhpcyBldmVudCBvY2N1cGllcy5cclxuXHRcImJ1bXBlZFwiLCAvLyhmcm9tLWRpcilcclxuXHRcdC8vZW1pdHRlZCB1cG9uIHRoZSBwbGF5ZXIgaXMgZGVuaWVkIGVudHJ5IGludG8gdGhlIHRpbGUgdGhpcyBldmVudCBvY2N1cGllcy5cclxuXHRcImludGVyYWN0ZWRcIiwgLy8oZnJvbS1kaXIpXHJcblx0XHQvL2VtaXR0ZWQgd2hlbiB0aGUgcGxheWVyIGludGVyYWN0cyB3aXRoIHRoaXMgZXZlbnQgZnJvbSBhbiBhZGphY2VudCB0aWxlXHJcblx0XCJ0aWNrXCIsIC8vKGRlbHRhKVxyXG5cdFx0Ly9lbWl0dGVkIGV2ZXJ5IGdhbWUgdGlja1xyXG5cdFwiY2xpY2tlZFwiLCAvLyh4LCB5KVxyXG5cdFx0Ly9lbWl0dGVkIHdoZW4gdGhlIG1vdXNlIGlzIGNsaWNrZWQgb24gdGhpcyBldmVudCAoYW5kIGl0IGlzIGRldGVybWluZWQgaXQgaXMgdGhpcyBldmVudClcclxuXHRcImNsaWNrZWQtdGhyb3VnaFwiLCAvLyh4LCB5KVxyXG5cdFx0Ly9lbWl0dGVkIHdoZW4gdGhlIG1vdXNlIGlzIGNsaWNrZWQgb24gdGhpcyBldmVudCAoYW5kIHRoZSByYXl0cmFjZSBpcyBwYXNzaW5nIHRocm91Z2ggXHJcblx0XHQvLyB0aGlzIGV2ZW50IGR1cmluZyB0aGUgZGV0ZXJtaW5pbmcgcGhhc2UpXHJcblx0XCJtb3ZpbmdcIiwgLy8oc3JjWCwgc3JjWSwgZGVzdFgsIGRlc3RZKVxyXG5cdFx0Ly9lbWl0dGVkIHdoZW4gdGhpcyBldmVudCBiZWdpbnMgbW92aW5nIHRvIGEgbmV3IHRpbGVcclxuXHRcIm1vdmVkXCIsIC8vKHNyY1gsIHNyY1ksIGRlc3RYLCBkZXN0WSlcclxuXHRcdC8vZW1pdHRlZCB3aGVuIHRoaXMgZXZlbnQgZmluaXNoZXMgbW92aW5nIHRvIGEgbmV3IHRpbGVcclxuXHRcImNhbnQtbW92ZVwiLCAvLyhzcmNYLCBzcmNZLCBkZXN0WCwgZGVzdFksIHJlYXNvbkV2ZW50KVxyXG5cdFx0Ly9lbWl0dGVkIHdoZW4gdGhpcyBldmVudCBpcyBkZW5pZWQgbW92ZW1lbnQgdG8gdGhlIHJlcXVlc3RlZCB0aWxlXHJcblx0XHQvLyBJdCBpcyBwYXNzZWQgdGhlIGV2ZW50IGJsb2NraW5nIGl0LCBvciBudWxsIGlmIGl0IGlzIGR1ZSB0byB0aGUgY29sbGlzaW9uIG1hcFxyXG5cdFwiYW5pbS1lbmRcIiwgLy8oYW5pbWF0aW9uTmFtZSlcclxuXHRcdC8vZW1pdHRlZCB3aGVuIHRoaXMgZXZlbnQncyBhbmltYXRpb24gZW5kc1xyXG5cdFwiY3JlYXRlZFwiLCBcclxuXHRcdC8vZW1pdHRlZCB3aGVuIHRoaXMgZXZlbnQgaXMgYWRkZWQgdG8gdGhlIGV2ZW50IG1hcFxyXG5cdFwiZGVzdHJveWVkXCIsXHJcblx0XHQvL2VtaXR0ZWQgd2hlbiB0aGlzIGV2ZW50IGhhcyBiZWVuIHRha2VuIG91dCBvZiB0aGUgZXZlbnQgbWFwXHJcblx0XCJyZWFjdFwiLCAvLyhpZCwgZGlzdGFuY2UpXHJcblx0XHQvL2VtaXR0ZWQgd2hlbiBhbm90aGVyIGV2ZW50IG9uIHRoZSBtYXAgdHJhbnNtaXRzIGEgcmVhY3RhYmxlIGV2ZW50XHJcblx0XCJtZXNzYWdlXCIsIC8vKGlkLCAuLi4pXHJcblx0XHQvL25ldmVyIGVtaXR0ZWQgYnkgdGhlIGxpYnJhcnksIHRoaXMgZXZlbnQgdHlwZSBjYW4gYmUgdXNlZCBmb3IgY3Jvc3MtZXZlbnQgbWVzc2FnZXNcclxuXTtcclxuIiwiLy8gcGxheWVyLWNoYXJhY3Rlci5qc1xyXG4vLyBEZWZpbmVzIHRoZSBjb25jcmV0ZSBjb2RlIGZvciBhIFBsYXllciBDaGFyYWN0ZXIgaW4gdGhlIHdvcmxkXHJcblxyXG52YXIgQWN0b3IgPSByZXF1aXJlKFwidHBwLWFjdG9yXCIpO1xyXG52YXIgY29udHJvbGxlciA9IHJlcXVpcmUoXCJ0cHAtY29udHJvbGxlclwiKTtcclxudmFyIGluaGVyaXRzID0gcmVxdWlyZShcImluaGVyaXRzXCIpO1xyXG52YXIgZXh0ZW5kID0gcmVxdWlyZShcImV4dGVuZFwiKTtcclxuXHJcbi8qKlxyXG4gKi9cclxuZnVuY3Rpb24gUGxheWVyQ2hhcigpe1xyXG5cdEFjdG9yLmNhbGwodGhpcywge30sIHt9KTtcclxuXHRcclxuXHR0aGlzLm9uKFwidGlja1wiLCB0aGlzLmNvbnRyb2xDaGFyYWN0ZXIpO1xyXG5cdHRoaXMub24oXCJjYW50LW1vdmVcIiwgdGhpcy5hbmltYXRlQnVtcCk7XHJcbn1cclxuaW5oZXJpdHMoUGxheWVyQ2hhciwgQWN0b3IpO1xyXG5leHRlbmQoUGxheWVyQ2hhci5wcm90b3R5cGUsIHtcclxuXHRpZCA6IFwiUExBWUVSQ0hBUlwiLFxyXG5cdGxvY2F0aW9uIDogbmV3IFRIUkVFLlZlY3RvcjMoKSxcclxuXHRcclxuXHRzcHJpdGU6IG51bGwsXHJcblx0XHJcblx0cmVzZXQgOiBmdW5jdGlvbigpIHtcclxuXHRcdHRoaXMubG9jYXRpb24uc2V0KDAsIDAsIDApO1xyXG5cdH0sXHJcblx0XHJcblx0d2FycEF3YXkgOiBmdW5jdGlvbihhbmltVHlwZSkge1xyXG5cdFx0Y29uc29sZS53YXJuKFwid2FycEF3YXkgaXMgbm90IHlldCBpbXBsZW1lbnRlZCFcIik7XHJcblx0fSxcclxuXHRcclxuXHR3YXJwVG8gOiBmdW5jdGlvbih3YXJwZGVmKSB7XHJcblx0XHR2YXIgc2VsZiA9IHRoaXM7XHJcblx0XHR0aGlzLmxvY2F0aW9uLnNldCh3YXJwZGVmLmxvY1swXSwgd2FycGRlZi5sb2NbMV0sIHdhcnBkZWYubGF5ZXIpO1xyXG5cdFx0XHJcblx0XHRpZiAoIXdhcnBkZWYuYW5pbSlcclxuXHRcdFx0Y29udHJvbGxlci5wdXNoSW5wdXRDb250ZXh0KFwiY3V0c2NlbmVcIik7XHJcblx0XHQvL1RPRE8gd2FycGRlZi5hbmltXHJcblx0XHRcclxuXHRcdHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcclxuXHRcdFx0c3dpdGNoKE51bWJlcih3YXJwZGVmLmFuaW0pKSB7IC8vV2FycCBhbmltYXRpb25cclxuXHRcdFx0XHRjYXNlIDE6IHNlbGYuYXZhdGFyX25vZGUucG9zaXRpb24ueiArPSAxOyBicmVhazsgLy8gV2FsayB1cFxyXG5cdFx0XHRcdGNhc2UgMjogc2VsZi5hdmF0YXJfbm9kZS5wb3NpdGlvbi56IC09IDE7IGJyZWFrOyAvLyBXYWxrIGRvd25cclxuXHRcdFx0XHRjYXNlIDM6IHNlbGYuYXZhdGFyX25vZGUucG9zaXRpb24ueCAtPSAxOyBicmVhazsgLy8gV2FsayBsZWZ0XHJcblx0XHRcdFx0Y2FzZSA0OiBzZWxmLmF2YXRhcl9ub2RlLnBvc2l0aW9uLnggKz0gMTsgYnJlYWs7IC8vIFdhbGsgZG93blxyXG5cdFx0XHRcdGNhc2UgNTogc2VsZi5hdmF0YXJfbm9kZS5wb3NpdGlvbi55ICs9IDE1OyBicmVhazsgLy8gV2FycCBpblxyXG5cdFx0XHR9XHJcblx0XHR9LCAwKTtcclxuXHRcdFxyXG5cdFx0Y3VycmVudE1hcC5xdWV1ZUZvck1hcFN0YXJ0KGZ1bmN0aW9uKCl7XHJcblx0XHRcdGNvbnNvbGUubG9nKFwiV0FSUCBERUZcIiwgd2FycGRlZik7XHJcblx0XHRcdHZhciBhbmltTmFtZSA9IG51bGw7XHJcblx0XHRcdHZhciB4ID0gc2VsZi5sb2NhdGlvbi54O1xyXG5cdFx0XHR2YXIgeSA9IHNlbGYubG9jYXRpb24ueTtcclxuXHRcdFx0dmFyIGxheWVyID0gc2VsZi5sb2NhdGlvbi56O1xyXG5cdFx0XHR2YXIgeV9vZmYgPSAwO1xyXG5cdFx0XHR2YXIgbXNwZCA9IDEsIGFzcGQgPSAxOyAvL21vdmVtZW50IHNwZWVkLCBhbmltYXRpb24gc3BlZWRcclxuXHRcdFx0dmFyIGFuaW1FbmRFdmVudCA9IFwiYW5pbS1lbmRcIjtcclxuXHRcdFx0XHJcblx0XHRcdHN3aXRjaChOdW1iZXIod2FycGRlZi5hbmltKSkgeyAvL1dhcnAgYW5pbWF0aW9uXHJcblx0XHRcdFx0Y2FzZSAwOiBicmVhazsgLy8gQXBwZWFyXHJcblx0XHRcdFx0Y2FzZSAxOiB5Kys7IGFuaW1OYW1lID0gXCJ3YWxrXCI7IG1zcGQgPSAwLjM1OyBhc3BkID0gMC4zNTsgYnJlYWs7IC8vIFdhbGsgdXBcclxuXHRcdFx0XHRjYXNlIDI6IHktLTsgYW5pbU5hbWUgPSBcIndhbGtcIjsgbXNwZCA9IDAuMzU7IGFzcGQgPSAwLjM1OyBicmVhazsgLy8gV2FsayBkb3duXHJcblx0XHRcdFx0Y2FzZSAzOiB4LS07IGFuaW1OYW1lID0gXCJ3YWxrXCI7IG1zcGQgPSAwLjM1OyBhc3BkID0gMC4zNTsgYnJlYWs7IC8vIFdhbGsgbGVmdFxyXG5cdFx0XHRcdGNhc2UgNDogeCsrOyBhbmltTmFtZSA9IFwid2Fsa1wiOyBtc3BkID0gMC4zNTsgYXNwZCA9IDAuMzU7IGJyZWFrOyAvLyBXYWxrIGRvd25cclxuXHRcdFx0XHRjYXNlIDU6IC8vIFdhcnAgaW5cclxuXHRcdFx0XHRcdGFuaW1OYW1lID0gXCJ3YXJwX2luXCI7IFxyXG5cdFx0XHRcdFx0eV9vZmYgPSAxNTsgYW5pbUVuZEV2ZW50ID0gXCJtb3ZlZFwiO1xyXG5cdFx0XHRcdFx0bXNwZCA9IDAuMjU7IGFzcGQgPSAxOyBcclxuXHRcdFx0XHRcdGJyZWFrOyBcclxuXHRcdFx0XHRkZWZhdWx0OiBcclxuXHRcdFx0XHRcdGNvbnNvbGUud2FybihcIklMTEVHQUwgV0FSUCBBTklNQVRJT046XCIsIHdhcnBkZWYuYW5pbSk7XHJcblx0XHRcdH1cclxuXHRcdFx0XHJcblx0XHRcdHZhciBzcmMgPSBzZWxmLmxvY2F0aW9uO1xyXG5cdFx0XHR2YXIgc3RhdGUgPSBzZWxmLl9pbml0UGF0aGluZ1N0YXRlKCk7XHJcblx0XHRcdFxyXG5cdFx0XHRpZiAoc3JjLngteCB8fCB5LXNyYy55KSBcclxuXHRcdFx0XHRzZWxmLmZhY2luZy5zZXQoeC1zcmMueCwgMCwgc3JjLnkteSk7XHJcblx0XHRcdGVsc2VcclxuXHRcdFx0XHRzZWxmLmZhY2luZy5zZXQoMCwgMCwgMSk7XHJcblx0XHRcdFxyXG5cdFx0XHRzdGF0ZS5zcmNMb2NDLnNldCh4LCB5LCBsYXllcik7XHJcblx0XHRcdHN0YXRlLnNyY0xvYzMuc2V0KGN1cnJlbnRNYXAuZ2V0M0RUaWxlTG9jYXRpb24oeCwgeSwgbGF5ZXIpKS55ICs9IHlfb2ZmO1xyXG5cdFx0XHRzdGF0ZS5kZXN0TG9jQy5zZXQoc3JjKTtcclxuXHRcdFx0c3RhdGUuZGVzdExvYzMuc2V0KGN1cnJlbnRNYXAuZ2V0M0RUaWxlTG9jYXRpb24oc3JjKSk7XHJcblx0XHRcdHN0YXRlLmRlbHRhID0gMDtcclxuXHRcdFx0c3RhdGUubW92aW5nID0gdHJ1ZTtcclxuXHRcdFx0c3RhdGUuc3BlZWQgPSBtc3BkO1xyXG5cdFx0XHRcclxuXHRcdFx0c2VsZi5wbGF5QW5pbWF0aW9uKGFuaW1OYW1lLCB7IHNwZWVkOiBhc3BkIH0pO1xyXG5cdFx0XHRzZWxmLm9uY2UoYW5pbUVuZEV2ZW50LCBmdW5jdGlvbihhbmltYXRpb25OYW1lKXtcclxuXHRcdFx0XHRjb25zb2xlLmxvZyhcIlBvcCFcIik7XHJcblx0XHRcdFx0Y29udHJvbGxlci5wb3BJbnB1dENvbnRleHQoXCJjdXRzY2VuZVwiKTtcclxuXHRcdFx0fSk7XHJcblx0XHRcdC8vc2VsZi5hdmF0YXJfbm9kZS5wb3NpdGlvbi5zZXQoIGN1cnJlbnRNYXAuZ2V0M0RUaWxlTG9jYXRpb24oc2VsZi5sb2NhdGlvbikgKTtcclxuXHRcdH0pO1xyXG5cdH0sXHJcblx0XHJcblx0Y29udHJvbFRpbWVvdXQ6IDAuMCxcclxuXHRjb250cm9sQ2hhcmFjdGVyIDogZnVuY3Rpb24oZGVsdGEpIHtcclxuXHRcdHZhciB5ID0gKChjb250cm9sbGVyLmlzRG93bihcIlVwXCIsIFwiZ2FtZVwiKSk/IC0xOjApICsgKChjb250cm9sbGVyLmlzRG93bihcIkRvd25cIiwgXCJnYW1lXCIpKT8gMTowKTtcclxuXHRcdHZhciB4ID0gKChjb250cm9sbGVyLmlzRG93bihcIkxlZnRcIiwgXCJnYW1lXCIpKT8gLTE6MCkgKyAoKGNvbnRyb2xsZXIuaXNEb3duKFwiUmlnaHRcIiwgXCJnYW1lXCIpKT8gMTowKTtcclxuXHRcdFxyXG5cdFx0aWYgKGNvbnRyb2xsZXIuaXNEb3duKFwiSW50ZXJhY3RcIiwgXCJnYW1lXCIpICYmICF0aGlzLl9pbml0UGF0aGluZ1N0YXRlKCkubW92aW5nKSB7XHJcblx0XHRcdGN1cnJlbnRNYXAuZGlzcGF0Y2goXHJcblx0XHRcdFx0dGhpcy5sb2NhdGlvbi54IC0gdGhpcy5mYWNpbmcueCwgdGhpcy5sb2NhdGlvbi55ICsgdGhpcy5mYWNpbmcueiwgXHJcblx0XHRcdFx0XCJpbnRlcmFjdGVkXCIsIHRoaXMuZmFjaW5nKTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0aWYgKCh5IHx8IHgpICYmICEoeCAmJiB5KSkgeyAvL29uZSwgYnV0IG5vdCBib3RoXHJcblx0XHRcdGlmICh0aGlzLmNvbnRyb2xUaW1lb3V0IDwgMSkge1xyXG5cdFx0XHRcdHRoaXMuY29udHJvbFRpbWVvdXQgKz0gQ09ORklHLnRpbWVvdXQud2Fsa0NvbnRyb2wgKiBkZWx0YTtcclxuXHRcdFx0XHRcclxuXHRcdFx0XHRpZiAoIXRoaXMuX2luaXRQYXRoaW5nU3RhdGUoKS5tb3ZpbmcpIHtcclxuXHRcdFx0XHRcdHRoaXMuZmFjZURpcih4LCB5KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0aWYgKCF0aGlzLl9pbml0UGF0aGluZ1N0YXRlKCkubW92aW5nKSB7XHJcblx0XHRcdFx0XHR0aGlzLm1vdmVUbyh0aGlzLmxvY2F0aW9uLngreCwgdGhpcy5sb2NhdGlvbi55K3kpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0aWYgKHRoaXMuY29udHJvbFRpbWVvdXQgPiAwKVxyXG5cdFx0XHRcdHRoaXMuY29udHJvbFRpbWVvdXQgLT0gQ09ORklHLnRpbWVvdXQud2Fsa0NvbnRyb2wgKiBkZWx0YTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdH0sXHJcblx0XHJcblx0YW5pbWF0ZUJ1bXAgOiBmdW5jdGlvbihzcmN4LCBzcmN5LCB4LCB5LCByZWFzb24pIHtcclxuXHRcdC8vIGNvbnNvbGUud2Fybih0aGlzLmlkLCBcIjogQ2Fubm90IHdhbGsgdG8gbG9jYXRpb25cIiwgXCIoXCIreCtcIixcIit5K1wiKVwiKTtcclxuXHRcdHRoaXMucGxheUFuaW1hdGlvbihcImJ1bXBcIiwgeyBzdG9wTmV4dFRyYW5zaXRpb246IHRydWUgfSk7XHJcblx0fSxcclxuXHRcclxuXHRcclxuXHQvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHRpc05QQyA6IGZ1bmN0aW9uKCl7IHJldHVybiBmYWxzZTsgfSxcclxuXHRcclxuXHRfYXZhdGFyX2xvYWRTcHJpdGUgOiBmdW5jdGlvbihtYXAsIHRleHR1cmUpIHtcclxuXHRcdHZhciB1cmwgPSBCQVNFVVJMK1wiL2ltZy9wY3MvXCIrIGdhbWVTdGF0ZS5wbGF5ZXJTcHJpdGU7XHJcblx0XHR2YXIgcmVzID0gL14oW15cXFtdKylcXFsoW15cXF1dKylcXF0ucG5nJC8uZXhlYyh1cmwpO1xyXG5cdFx0XHJcblx0XHR2YXIgbmFtZSA9IHJlc1sxXTtcclxuXHRcdHZhciBmb3JtYXQgPSByZXNbMl07XHJcblx0XHRcclxuXHRcdHZhciBpbWcgPSBuZXcgSW1hZ2UoKTtcclxuXHRcdGZvcm1hdCA9IHRoaXMuZ2V0U3ByaXRlRm9ybWF0KGZvcm1hdCk7XHJcblx0XHR0aGlzLl9fb25Mb2FkU3ByaXRlKGltZywgZm9ybWF0LCB0ZXh0dXJlKTtcclxuXHRcdGltZy5zcmMgPSB1cmw7XHJcblx0fSxcclxuXHRcclxuXHQvLyBOZXV0ZXIgdGhlIGxvY2F0aW9uIG5vcm1pbGl6YXRpb24gZm9yIHRoaXMga2luZCBvZiBldmVudFxyXG5cdF9ub3JtYWxpemVMb2NhdGlvbiA6IGZ1bmN0aW9uKCkge30sXHJcblx0XHJcbn0pO1xyXG5tb2R1bGUuZXhwb3J0cyA9IFBsYXllckNoYXI7XHJcbiIsIi8vIHRyaWdnZXIuanNcclxuLy8gRGVmaW5lcyBhIHRyaWdnZXIgdGlsZShzKSB1c2VkIHRocm91Z2hvdXQgdGhlIHBhcmtcclxuXHJcbnZhciBFdmVudCA9IHJlcXVpcmUoXCJ0cHAtZXZlbnRcIik7XHJcbnZhciBpbmhlcml0cyA9IHJlcXVpcmUoXCJpbmhlcml0c1wiKTtcclxudmFyIGV4dGVuZCA9IHJlcXVpcmUoXCJleHRlbmRcIik7XHJcblxyXG4vKipcclxuICogQSB0cmlnZ2VyIGlzIGEgdGlsZSB0aGF0LCB3aGVuIHN0ZXBwZWQgdXBvbiwgd2lsbCB0cmlnZ2VyIHNvbWUgZXZlbnQuXHJcbiAqIFRoZSBtb3N0IGNvbW1vbiBldmVudCB0aWdnZXJlZCBpcyBhIHdhcnBpbmcgdG8gYW5vdGhlciBtYXAsIGZvciB3aGljaFxyXG4gKiB0aGUgc3ViY2xhc3MgV2FycCBpcyBkZXNpZ25lZCBmb3IuXHJcbiAqXHJcbiAqIFRyaWdnZXJzIG1heSB0YWtlIHVwIG1vcmUgdGhhbiBvbmUgc3BhY2UuXHJcbiAqL1xyXG5mdW5jdGlvbiBUcmlnZ2VyKGJhc2UsIG9wdHMpIHtcclxuXHRFdmVudC5jYWxsKHRoaXMsIGJhc2UsIG9wdHMpO1xyXG5cdFxyXG5cdHRoaXMub24oXCJlbnRlcmVkLXRpbGVcIiwgdGhpcy5vblRyaWdnZXJFbnRlcik7XHJcblx0dGhpcy5vbihcImxlYXZpbmctdGlsZVwiLCB0aGlzLm9uVHJpZ2dlckxlYXZlKTtcclxufVxyXG5pbmhlcml0cyhUcmlnZ2VyLCBFdmVudCk7XHJcbmV4dGVuZChUcmlnZ2VyLnByb3RvdHlwZSwge1xyXG5cdFxyXG5cdG9uVHJpZ2dlckVudGVyIDogZnVuY3Rpb24oZGlyKSB7XHJcblx0XHRjb25zb2xlLmxvZyhcIlRyaWdnZXJlZCFcIik7XHJcblx0fSxcclxuXHRvblRyaWdnZXJMZWF2ZSA6IGZ1bmN0aW9uKGRpcikge1xyXG5cdFx0XHJcblx0fSxcclxufSk7XHJcbm1vZHVsZS5leHBvcnRzID0gVHJpZ2dlcjtcclxuIiwiLy8gd2FycC5qc1xyXG4vLyBEZWZpbmVzIGEgd2FycCB0aWxlIHVzZWQgdGhyb3VnaG91dCB0aGUgcGFyay5cclxuXHJcbnZhciBUcmlnZ2VyID0gcmVxdWlyZShcInRwcC10cmlnZ2VyXCIpO1xyXG52YXIgaW5oZXJpdHMgPSByZXF1aXJlKFwiaW5oZXJpdHNcIik7XHJcbnZhciBleHRlbmQgPSByZXF1aXJlKFwiZXh0ZW5kXCIpO1xyXG5cclxuLyoqXHJcbiAqIEEgd2FycCBpcyBhbiBldmVudCB0aGF0LCB3aGVuIHdhbGtlZCB1cG9uLCB3aWxsIHRha2UgdGhlIHBsYXllciB0byBhbm90aGVyIG1hcCBvclxyXG4gKiBhcmVhIHdpdGhpbiB0aGUgc2FtZSBtYXAuIERpZmZlcmVudCB0eXBlcyBvZiB3YXJwcyBleGlzdCwgcmFuZ2luZyBmcm9tIHRoZSBzdGFuZGFyZFxyXG4gKiBkb29yIHdhcnAgdG8gdGhlIHRlbGVwb3J0IHdhcnAuIFdhcnBzIGNhbiBiZSB0b2xkIHRvIGFjdGl2YXRlIHVwb24gc3RlcHBpbmcgdXBvbiB0aGVtXHJcbiAqIG9yIGFjdGl2YXRlIHVwb24gc3RlcHBpbmcgb2ZmIGEgY2VydGFpbiBkaXJlY3Rpb24uXHJcbiAqL1xyXG5mdW5jdGlvbiBXYXJwKGJhc2UsIG9wdHMpIHtcclxuXHRUcmlnZ2VyLmNhbGwodGhpcywgYmFzZSwgb3B0cyk7XHJcblx0XHJcbn1cclxuaW5oZXJpdHMoV2FycCwgVHJpZ2dlcik7XHJcbmV4dGVuZChXYXJwLnByb3RvdHlwZSwge1xyXG5cdHNvdW5kOiBcImV4aXRfd2Fsa1wiLFxyXG5cdFxyXG5cdG9uVHJpZ2dlckVudGVyIDogZnVuY3Rpb24oZGlyKSB7XHJcblx0XHRTb3VuZE1hbmFnZXIucGxheVNvdW5kKHRoaXMuc291bmQpO1xyXG5cdH0sXHJcbn0pO1xyXG5tb2R1bGUuZXhwb3J0cyA9IFdhcnA7Il19
