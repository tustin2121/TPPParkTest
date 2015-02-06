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
				
				zoffset:	{ type: "f", value: 0 },
				sheer:		{ type: "m4", value: new THREE.Matrix4() },
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
	
	'uniform float zoffset;',
	'uniform mat4 sheer;',

	// 'attribute vec2 position;',
	// 'attribute vec2 uv;',

	'varying vec2 vUV;',

	'void main() {',

		'vUV = uvOffset + uv * uvScale;',

		'vec2 alignedPosition = position.xy * scale;',

		'vec2 rotatedPosition;',
		'rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;',
		'rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;',
		
		// 'mat4 zsheer = mat4(1, 0, 0, 0,',
		// 	               '0, 1, 0, 0,',
		// 	               '0, 0, 1, position.y * zoffset,',
		// 	               '0, 0, 0, 1);',

		// 'vec4 sheerforce = modelViewMatrix * vec4(0, position.y, position.z, 1);',
		
		'vec4 finalPosition;',

		'finalPosition = modelViewMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );',
		// 'finalPosition.w += (sheerforce.z - finalPosition.z) * zoffset;',
		'finalPosition.xy += rotatedPosition;',
		// 'finalPosition = zsheer * finalPosition;',
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
].join( '\n' );


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
var SpriteGlowMaterial = require("../model/spritemodel.js").SpriteGlowMaterial;
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
	scale_shadow: 1,
	
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
		scale *= GLOBAL_SCALEUP;
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
			offset: new THREE.Vector3(0, 0.3, 0.22),
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
		Cancel: [27, "Escape", 17, "Ctrl"],
		Run: [16, "Shift"],
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

},{"extend":2,"inherits":3,"tpp-actor":"tpp-actor","tpp-controller":"tpp-controller"}],"tpp-test-gallery":[function(require,module,exports){
// tGallery.js
// Defines the base event that actors have in the tGallery test map.

var inherits = require("inherits");
var extend = require("extend");

var Actor = require("tpp-actor");
var MeanderBehav = new require("tpp-behavior").Meander;
var TalkingBehav = new require("tpp-behavior").Talking;

function ActorGala(base, ext) {
	ext = extend({
		location: "rand",
		onEvents: {
			interacted: function() {
				var self = this;
				$("#statusbar").html("This is "+this.name+"! ("+this.id+")");
				var dlog = self.dialog || [
					""+this.name+" waves at you in greeting before continuing to meander about the Gallery."
				];
				
				UI.showTextBox(self.dialog_type, dlog, { complete: function(){
					self.behaviorStack.pop();
				}});
				self.behaviorStack.push(TalkingBehav);
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
},{"extend":2,"inherits":3,"tpp-actor":"tpp-actor"}],"tpp-trigger":[function(require,module,exports){
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
	exit_to: null,
	
	onTriggerEnter : function(dir) {
		SoundManager.playSound(this.sound);
		if (!this.exit_to) return;
		MapManager.transitionTo(this.exit_to.map, this.exit_to.warp);
	},
});
module.exports = Warp;
},{"extend":2,"inherits":3,"tpp-trigger":"tpp-trigger"}]},{},[])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlc1xcYnJvd3NlcmlmeVxcbm9kZV9tb2R1bGVzXFxicm93c2VyLXBhY2tcXF9wcmVsdWRlLmpzIiwibm9kZV9tb2R1bGVzXFxicm93c2VyaWZ5XFxub2RlX21vZHVsZXNcXGV2ZW50c1xcZXZlbnRzLmpzIiwibm9kZV9tb2R1bGVzXFxleHRlbmRcXGluZGV4LmpzIiwibm9kZV9tb2R1bGVzXFxpbmhlcml0c1xcaW5oZXJpdHNfYnJvd3Nlci5qcyIsInNyY1xcanNcXG1vZGVsXFxzcHJpdGVtb2RlbC5qcyIsInNyY1xcanNcXGV2ZW50c1xcYWN0b3JfYW5pbWF0aW9ucyIsInNyY1xcanNcXGV2ZW50c1xcYWN0b3IiLCJzcmNcXGpzXFxldmVudHNcXGJlaGF2aW9yIiwic3JjXFxqc1xcbWFuYWdlcnNcXGNvbnRyb2xsZXIiLCJzcmNcXGpzXFxldmVudHNcXGV2ZW50Iiwic3JjXFxqc1xcZXZlbnRzXFxwbGF5ZXItY2hhcmFjdGVyIiwic3JjXFxqc1xcZXZlbnRzXFx0R2FsbGVyeSIsInNyY1xcanNcXGV2ZW50c1xcdHJpZ2dlciIsInNyY1xcanNcXGV2ZW50c1xcd2FycCJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN1NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdTQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2prQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDek5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG5mdW5jdGlvbiBFdmVudEVtaXR0ZXIoKSB7XG4gIHRoaXMuX2V2ZW50cyA9IHRoaXMuX2V2ZW50cyB8fCB7fTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gdGhpcy5fbWF4TGlzdGVuZXJzIHx8IHVuZGVmaW5lZDtcbn1cbm1vZHVsZS5leHBvcnRzID0gRXZlbnRFbWl0dGVyO1xuXG4vLyBCYWNrd2FyZHMtY29tcGF0IHdpdGggbm9kZSAwLjEwLnhcbkV2ZW50RW1pdHRlci5FdmVudEVtaXR0ZXIgPSBFdmVudEVtaXR0ZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX2V2ZW50cyA9IHVuZGVmaW5lZDtcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX21heExpc3RlbmVycyA9IHVuZGVmaW5lZDtcblxuLy8gQnkgZGVmYXVsdCBFdmVudEVtaXR0ZXJzIHdpbGwgcHJpbnQgYSB3YXJuaW5nIGlmIG1vcmUgdGhhbiAxMCBsaXN0ZW5lcnMgYXJlXG4vLyBhZGRlZCB0byBpdC4gVGhpcyBpcyBhIHVzZWZ1bCBkZWZhdWx0IHdoaWNoIGhlbHBzIGZpbmRpbmcgbWVtb3J5IGxlYWtzLlxuRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnMgPSAxMDtcblxuLy8gT2J2aW91c2x5IG5vdCBhbGwgRW1pdHRlcnMgc2hvdWxkIGJlIGxpbWl0ZWQgdG8gMTAuIFRoaXMgZnVuY3Rpb24gYWxsb3dzXG4vLyB0aGF0IHRvIGJlIGluY3JlYXNlZC4gU2V0IHRvIHplcm8gZm9yIHVubGltaXRlZC5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuc2V0TWF4TGlzdGVuZXJzID0gZnVuY3Rpb24obikge1xuICBpZiAoIWlzTnVtYmVyKG4pIHx8IG4gPCAwIHx8IGlzTmFOKG4pKVxuICAgIHRocm93IFR5cGVFcnJvcignbiBtdXN0IGJlIGEgcG9zaXRpdmUgbnVtYmVyJyk7XG4gIHRoaXMuX21heExpc3RlbmVycyA9IG47XG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgZXIsIGhhbmRsZXIsIGxlbiwgYXJncywgaSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIElmIHRoZXJlIGlzIG5vICdlcnJvcicgZXZlbnQgbGlzdGVuZXIgdGhlbiB0aHJvdy5cbiAgaWYgKHR5cGUgPT09ICdlcnJvcicpIHtcbiAgICBpZiAoIXRoaXMuX2V2ZW50cy5lcnJvciB8fFxuICAgICAgICAoaXNPYmplY3QodGhpcy5fZXZlbnRzLmVycm9yKSAmJiAhdGhpcy5fZXZlbnRzLmVycm9yLmxlbmd0aCkpIHtcbiAgICAgIGVyID0gYXJndW1lbnRzWzFdO1xuICAgICAgaWYgKGVyIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgdGhyb3cgZXI7IC8vIFVuaGFuZGxlZCAnZXJyb3InIGV2ZW50XG4gICAgICB9XG4gICAgICB0aHJvdyBUeXBlRXJyb3IoJ1VuY2F1Z2h0LCB1bnNwZWNpZmllZCBcImVycm9yXCIgZXZlbnQuJyk7XG4gICAgfVxuICB9XG5cbiAgaGFuZGxlciA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNVbmRlZmluZWQoaGFuZGxlcikpXG4gICAgcmV0dXJuIGZhbHNlO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGhhbmRsZXIpKSB7XG4gICAgc3dpdGNoIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAvLyBmYXN0IGNhc2VzXG4gICAgICBjYXNlIDE6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDI6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0pO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICAvLyBzbG93ZXJcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgaGFuZGxlci5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAoaXNPYmplY3QoaGFuZGxlcikpIHtcbiAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgZm9yIChpID0gMTsgaSA8IGxlbjsgaSsrKVxuICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG5cbiAgICBsaXN0ZW5lcnMgPSBoYW5kbGVyLnNsaWNlKCk7XG4gICAgbGVuID0gbGlzdGVuZXJzLmxlbmd0aDtcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpKyspXG4gICAgICBsaXN0ZW5lcnNbaV0uYXBwbHkodGhpcywgYXJncyk7XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gVG8gYXZvaWQgcmVjdXJzaW9uIGluIHRoZSBjYXNlIHRoYXQgdHlwZSA9PT0gXCJuZXdMaXN0ZW5lclwiISBCZWZvcmVcbiAgLy8gYWRkaW5nIGl0IHRvIHRoZSBsaXN0ZW5lcnMsIGZpcnN0IGVtaXQgXCJuZXdMaXN0ZW5lclwiLlxuICBpZiAodGhpcy5fZXZlbnRzLm5ld0xpc3RlbmVyKVxuICAgIHRoaXMuZW1pdCgnbmV3TGlzdGVuZXInLCB0eXBlLFxuICAgICAgICAgICAgICBpc0Z1bmN0aW9uKGxpc3RlbmVyLmxpc3RlbmVyKSA/XG4gICAgICAgICAgICAgIGxpc3RlbmVyLmxpc3RlbmVyIDogbGlzdGVuZXIpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIC8vIE9wdGltaXplIHRoZSBjYXNlIG9mIG9uZSBsaXN0ZW5lci4gRG9uJ3QgbmVlZCB0aGUgZXh0cmEgYXJyYXkgb2JqZWN0LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IGxpc3RlbmVyO1xuICBlbHNlIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIC8vIElmIHdlJ3ZlIGFscmVhZHkgZ290IGFuIGFycmF5LCBqdXN0IGFwcGVuZC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0ucHVzaChsaXN0ZW5lcik7XG4gIGVsc2VcbiAgICAvLyBBZGRpbmcgdGhlIHNlY29uZCBlbGVtZW50LCBuZWVkIHRvIGNoYW5nZSB0byBhcnJheS5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBbdGhpcy5fZXZlbnRzW3R5cGVdLCBsaXN0ZW5lcl07XG5cbiAgLy8gQ2hlY2sgZm9yIGxpc3RlbmVyIGxlYWtcbiAgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkgJiYgIXRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQpIHtcbiAgICB2YXIgbTtcbiAgICBpZiAoIWlzVW5kZWZpbmVkKHRoaXMuX21heExpc3RlbmVycykpIHtcbiAgICAgIG0gPSB0aGlzLl9tYXhMaXN0ZW5lcnM7XG4gICAgfSBlbHNlIHtcbiAgICAgIG0gPSBFdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycztcbiAgICB9XG5cbiAgICBpZiAobSAmJiBtID4gMCAmJiB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoID4gbSkge1xuICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCA9IHRydWU7XG4gICAgICBjb25zb2xlLmVycm9yKCcobm9kZSkgd2FybmluZzogcG9zc2libGUgRXZlbnRFbWl0dGVyIG1lbW9yeSAnICtcbiAgICAgICAgICAgICAgICAgICAgJ2xlYWsgZGV0ZWN0ZWQuICVkIGxpc3RlbmVycyBhZGRlZC4gJyArXG4gICAgICAgICAgICAgICAgICAgICdVc2UgZW1pdHRlci5zZXRNYXhMaXN0ZW5lcnMoKSB0byBpbmNyZWFzZSBsaW1pdC4nLFxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoKTtcbiAgICAgIGlmICh0eXBlb2YgY29uc29sZS50cmFjZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAvLyBub3Qgc3VwcG9ydGVkIGluIElFIDEwXG4gICAgICAgIGNvbnNvbGUudHJhY2UoKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub24gPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uY2UgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgdmFyIGZpcmVkID0gZmFsc2U7XG5cbiAgZnVuY3Rpb24gZygpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGcpO1xuXG4gICAgaWYgKCFmaXJlZCkge1xuICAgICAgZmlyZWQgPSB0cnVlO1xuICAgICAgbGlzdGVuZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gIH1cblxuICBnLmxpc3RlbmVyID0gbGlzdGVuZXI7XG4gIHRoaXMub24odHlwZSwgZyk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vLyBlbWl0cyBhICdyZW1vdmVMaXN0ZW5lcicgZXZlbnQgaWZmIHRoZSBsaXN0ZW5lciB3YXMgcmVtb3ZlZFxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBsaXN0LCBwb3NpdGlvbiwgbGVuZ3RoLCBpO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIGxpc3QgPSB0aGlzLl9ldmVudHNbdHlwZV07XG4gIGxlbmd0aCA9IGxpc3QubGVuZ3RoO1xuICBwb3NpdGlvbiA9IC0xO1xuXG4gIGlmIChsaXN0ID09PSBsaXN0ZW5lciB8fFxuICAgICAgKGlzRnVuY3Rpb24obGlzdC5saXN0ZW5lcikgJiYgbGlzdC5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcblxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGxpc3QpKSB7XG4gICAgZm9yIChpID0gbGVuZ3RoOyBpLS0gPiAwOykge1xuICAgICAgaWYgKGxpc3RbaV0gPT09IGxpc3RlbmVyIHx8XG4gICAgICAgICAgKGxpc3RbaV0ubGlzdGVuZXIgJiYgbGlzdFtpXS5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgICAgIHBvc2l0aW9uID0gaTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHBvc2l0aW9uIDwgMClcbiAgICAgIHJldHVybiB0aGlzO1xuXG4gICAgaWYgKGxpc3QubGVuZ3RoID09PSAxKSB7XG4gICAgICBsaXN0Lmxlbmd0aCA9IDA7XG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIH0gZWxzZSB7XG4gICAgICBsaXN0LnNwbGljZShwb3NpdGlvbiwgMSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIga2V5LCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgLy8gbm90IGxpc3RlbmluZyBmb3IgcmVtb3ZlTGlzdGVuZXIsIG5vIG5lZWQgdG8gZW1pdFxuICBpZiAoIXRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcikge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKVxuICAgICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgZWxzZSBpZiAodGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIGVtaXQgcmVtb3ZlTGlzdGVuZXIgZm9yIGFsbCBsaXN0ZW5lcnMgb24gYWxsIGV2ZW50c1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgIGZvciAoa2V5IGluIHRoaXMuX2V2ZW50cykge1xuICAgICAgaWYgKGtleSA9PT0gJ3JlbW92ZUxpc3RlbmVyJykgY29udGludWU7XG4gICAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycyhrZXkpO1xuICAgIH1cbiAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycygncmVtb3ZlTGlzdGVuZXInKTtcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGxpc3RlbmVycyA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNGdW5jdGlvbihsaXN0ZW5lcnMpKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnMpO1xuICB9IGVsc2Uge1xuICAgIC8vIExJRk8gb3JkZXJcbiAgICB3aGlsZSAobGlzdGVuZXJzLmxlbmd0aClcbiAgICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzW2xpc3RlbmVycy5sZW5ndGggLSAxXSk7XG4gIH1cbiAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IFtdO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gW3RoaXMuX2V2ZW50c1t0eXBlXV07XG4gIGVsc2VcbiAgICByZXQgPSB0aGlzLl9ldmVudHNbdHlwZV0uc2xpY2UoKTtcbiAgcmV0dXJuIHJldDtcbn07XG5cbkV2ZW50RW1pdHRlci5saXN0ZW5lckNvdW50ID0gZnVuY3Rpb24oZW1pdHRlciwgdHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIWVtaXR0ZXIuX2V2ZW50cyB8fCAhZW1pdHRlci5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IDA7XG4gIGVsc2UgaWYgKGlzRnVuY3Rpb24oZW1pdHRlci5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSAxO1xuICBlbHNlXG4gICAgcmV0ID0gZW1pdHRlci5fZXZlbnRzW3R5cGVdLmxlbmd0aDtcbiAgcmV0dXJuIHJldDtcbn07XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnZnVuY3Rpb24nO1xufVxuXG5mdW5jdGlvbiBpc051bWJlcihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdudW1iZXInO1xufVxuXG5mdW5jdGlvbiBpc09iamVjdChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnICYmIGFyZyAhPT0gbnVsbDtcbn1cblxuZnVuY3Rpb24gaXNVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IHZvaWQgMDtcbn1cbiIsInZhciBoYXNPd24gPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5O1xudmFyIHRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcbnZhciB1bmRlZmluZWQ7XG5cbnZhciBpc1BsYWluT2JqZWN0ID0gZnVuY3Rpb24gaXNQbGFpbk9iamVjdChvYmopIHtcblx0J3VzZSBzdHJpY3QnO1xuXHRpZiAoIW9iaiB8fCB0b1N0cmluZy5jYWxsKG9iaikgIT09ICdbb2JqZWN0IE9iamVjdF0nKSB7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cblx0dmFyIGhhc19vd25fY29uc3RydWN0b3IgPSBoYXNPd24uY2FsbChvYmosICdjb25zdHJ1Y3RvcicpO1xuXHR2YXIgaGFzX2lzX3Byb3BlcnR5X29mX21ldGhvZCA9IG9iai5jb25zdHJ1Y3RvciAmJiBvYmouY29uc3RydWN0b3IucHJvdG90eXBlICYmIGhhc093bi5jYWxsKG9iai5jb25zdHJ1Y3Rvci5wcm90b3R5cGUsICdpc1Byb3RvdHlwZU9mJyk7XG5cdC8vIE5vdCBvd24gY29uc3RydWN0b3IgcHJvcGVydHkgbXVzdCBiZSBPYmplY3Rcblx0aWYgKG9iai5jb25zdHJ1Y3RvciAmJiAhaGFzX293bl9jb25zdHJ1Y3RvciAmJiAhaGFzX2lzX3Byb3BlcnR5X29mX21ldGhvZCkge1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXG5cdC8vIE93biBwcm9wZXJ0aWVzIGFyZSBlbnVtZXJhdGVkIGZpcnN0bHksIHNvIHRvIHNwZWVkIHVwLFxuXHQvLyBpZiBsYXN0IG9uZSBpcyBvd24sIHRoZW4gYWxsIHByb3BlcnRpZXMgYXJlIG93bi5cblx0dmFyIGtleTtcblx0Zm9yIChrZXkgaW4gb2JqKSB7fVxuXG5cdHJldHVybiBrZXkgPT09IHVuZGVmaW5lZCB8fCBoYXNPd24uY2FsbChvYmosIGtleSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGV4dGVuZCgpIHtcblx0J3VzZSBzdHJpY3QnO1xuXHR2YXIgb3B0aW9ucywgbmFtZSwgc3JjLCBjb3B5LCBjb3B5SXNBcnJheSwgY2xvbmUsXG5cdFx0dGFyZ2V0ID0gYXJndW1lbnRzWzBdLFxuXHRcdGkgPSAxLFxuXHRcdGxlbmd0aCA9IGFyZ3VtZW50cy5sZW5ndGgsXG5cdFx0ZGVlcCA9IGZhbHNlO1xuXG5cdC8vIEhhbmRsZSBhIGRlZXAgY29weSBzaXR1YXRpb25cblx0aWYgKHR5cGVvZiB0YXJnZXQgPT09ICdib29sZWFuJykge1xuXHRcdGRlZXAgPSB0YXJnZXQ7XG5cdFx0dGFyZ2V0ID0gYXJndW1lbnRzWzFdIHx8IHt9O1xuXHRcdC8vIHNraXAgdGhlIGJvb2xlYW4gYW5kIHRoZSB0YXJnZXRcblx0XHRpID0gMjtcblx0fSBlbHNlIGlmICgodHlwZW9mIHRhcmdldCAhPT0gJ29iamVjdCcgJiYgdHlwZW9mIHRhcmdldCAhPT0gJ2Z1bmN0aW9uJykgfHwgdGFyZ2V0ID09IG51bGwpIHtcblx0XHR0YXJnZXQgPSB7fTtcblx0fVxuXG5cdGZvciAoOyBpIDwgbGVuZ3RoOyArK2kpIHtcblx0XHRvcHRpb25zID0gYXJndW1lbnRzW2ldO1xuXHRcdC8vIE9ubHkgZGVhbCB3aXRoIG5vbi1udWxsL3VuZGVmaW5lZCB2YWx1ZXNcblx0XHRpZiAob3B0aW9ucyAhPSBudWxsKSB7XG5cdFx0XHQvLyBFeHRlbmQgdGhlIGJhc2Ugb2JqZWN0XG5cdFx0XHRmb3IgKG5hbWUgaW4gb3B0aW9ucykge1xuXHRcdFx0XHRzcmMgPSB0YXJnZXRbbmFtZV07XG5cdFx0XHRcdGNvcHkgPSBvcHRpb25zW25hbWVdO1xuXG5cdFx0XHRcdC8vIFByZXZlbnQgbmV2ZXItZW5kaW5nIGxvb3Bcblx0XHRcdFx0aWYgKHRhcmdldCA9PT0gY29weSkge1xuXHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gUmVjdXJzZSBpZiB3ZSdyZSBtZXJnaW5nIHBsYWluIG9iamVjdHMgb3IgYXJyYXlzXG5cdFx0XHRcdGlmIChkZWVwICYmIGNvcHkgJiYgKGlzUGxhaW5PYmplY3QoY29weSkgfHwgKGNvcHlJc0FycmF5ID0gQXJyYXkuaXNBcnJheShjb3B5KSkpKSB7XG5cdFx0XHRcdFx0aWYgKGNvcHlJc0FycmF5KSB7XG5cdFx0XHRcdFx0XHRjb3B5SXNBcnJheSA9IGZhbHNlO1xuXHRcdFx0XHRcdFx0Y2xvbmUgPSBzcmMgJiYgQXJyYXkuaXNBcnJheShzcmMpID8gc3JjIDogW107XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdGNsb25lID0gc3JjICYmIGlzUGxhaW5PYmplY3Qoc3JjKSA/IHNyYyA6IHt9O1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdC8vIE5ldmVyIG1vdmUgb3JpZ2luYWwgb2JqZWN0cywgY2xvbmUgdGhlbVxuXHRcdFx0XHRcdHRhcmdldFtuYW1lXSA9IGV4dGVuZChkZWVwLCBjbG9uZSwgY29weSk7XG5cblx0XHRcdFx0Ly8gRG9uJ3QgYnJpbmcgaW4gdW5kZWZpbmVkIHZhbHVlc1xuXHRcdFx0XHR9IGVsc2UgaWYgKGNvcHkgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRcdHRhcmdldFtuYW1lXSA9IGNvcHk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHQvLyBSZXR1cm4gdGhlIG1vZGlmaWVkIG9iamVjdFxuXHRyZXR1cm4gdGFyZ2V0O1xufTtcblxuIiwiaWYgKHR5cGVvZiBPYmplY3QuY3JlYXRlID09PSAnZnVuY3Rpb24nKSB7XG4gIC8vIGltcGxlbWVudGF0aW9uIGZyb20gc3RhbmRhcmQgbm9kZS5qcyAndXRpbCcgbW9kdWxlXG4gIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaW5oZXJpdHMoY3Rvciwgc3VwZXJDdG9yKSB7XG4gICAgY3Rvci5zdXBlcl8gPSBzdXBlckN0b3JcbiAgICBjdG9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoc3VwZXJDdG9yLnByb3RvdHlwZSwge1xuICAgICAgY29uc3RydWN0b3I6IHtcbiAgICAgICAgdmFsdWU6IGN0b3IsXG4gICAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgICB9XG4gICAgfSk7XG4gIH07XG59IGVsc2Uge1xuICAvLyBvbGQgc2Nob29sIHNoaW0gZm9yIG9sZCBicm93c2Vyc1xuICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGluaGVyaXRzKGN0b3IsIHN1cGVyQ3Rvcikge1xuICAgIGN0b3Iuc3VwZXJfID0gc3VwZXJDdG9yXG4gICAgdmFyIFRlbXBDdG9yID0gZnVuY3Rpb24gKCkge31cbiAgICBUZW1wQ3Rvci5wcm90b3R5cGUgPSBzdXBlckN0b3IucHJvdG90eXBlXG4gICAgY3Rvci5wcm90b3R5cGUgPSBuZXcgVGVtcEN0b3IoKVxuICAgIGN0b3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gY3RvclxuICB9XG59XG4iLCIvLyBzcHJpdGVtb2RlbC5qc1xyXG4vLyBBIHJlZHV4IG9mIHRoZSBUSFJFRS5qcyBzcHJpdGUsIGJ1dCBub3QgdXNpbmcgdGhlIHNwcml0ZSBwbHVnaW5cclxuXHJcbnZhciBpbmhlcml0cyA9IHJlcXVpcmUoXCJpbmhlcml0c1wiKTtcclxudmFyIGV4dGVuZCA9IHJlcXVpcmUoXCJleHRlbmRcIik7XHJcblxyXG5mdW5jdGlvbiBDaGFyYWN0ZXJTcHJpdGUob3B0cykge1xyXG5cdGlmICghKHRoaXMgaW5zdGFuY2VvZiBDaGFyYWN0ZXJTcHJpdGUpKSB7XHJcblx0XHRyZXR1cm4gbmV3IENoYXJhY3RlclNwcml0ZShvcHRzKTtcclxuXHR9XHJcblx0dmFyIGdjID0gb3B0cy5nYyB8fCBHQy5nZXRCaW4oKTtcclxuXHRcclxuXHRvcHRzID0gZXh0ZW5kKHtcclxuXHRcdHRyYW5zcGFyZW50OiB0cnVlLFxyXG5cdFx0YWxwaGFUZXN0OiB0cnVlLFxyXG5cdH0sIG9wdHMpO1xyXG5cdFxyXG5cdGlmICghb3B0cy5vZmZzZXQpIG9wdHMub2Zmc2V0ID0gbmV3IFRIUkVFLlZlY3RvcjMoMCwgMCwgMCk7XHJcblx0XHJcblx0Ly9UT0RPIHJlcGxhY2Ugd2l0aCBnZW9tZXRyeSB3ZSBjYW4gY29udHJvbFxyXG5cdC8vIHZhciBnZW9tID0gbmV3IFRIUkVFLlBsYW5lQnVmZmVyR2VvbWV0cnkoMSwgMSk7XHJcblx0dmFyIGdlb20gPSBuZXcgQ2hhcmFjdGVyUGxhbmVHZW9tZXRyeShvcHRzLm9mZnNldC54LCBvcHRzLm9mZnNldC55LCBvcHRzLm9mZnNldC56KTtcclxuXHRnYy5jb2xsZWN0KGdlb20pO1xyXG5cdFxyXG5cdHZhciBtYXQgPSBuZXcgQ2hhcmFjdGVyU3ByaXRlTWF0ZXJpYWwob3B0cyk7XHJcblx0Z2MuY29sbGVjdChtYXQpO1xyXG5cdFxyXG5cdFRIUkVFLk1lc2guY2FsbCh0aGlzLCBnZW9tLCBtYXQpO1xyXG5cdHRoaXMudHlwZSA9IFwiQ2hhcmFjdGVyU3ByaXRlXCI7XHJcblx0XHJcblx0bWF0LnNjYWxlID0gbWF0LnVuaWZvcm1zLnNjYWxlLnZhbHVlID0gdGhpcy5zY2FsZTtcclxufVxyXG5pbmhlcml0cyhDaGFyYWN0ZXJTcHJpdGUsIFRIUkVFLk1lc2gpO1xyXG5tb2R1bGUuZXhwb3J0cy5DaGFyYWN0ZXJTcHJpdGUgPSBDaGFyYWN0ZXJTcHJpdGU7XHJcblxyXG5cclxuZnVuY3Rpb24gQ2hhcmFjdGVyU3ByaXRlTWF0ZXJpYWwob3B0cykge1xyXG5cdGlmICghKHRoaXMgaW5zdGFuY2VvZiBDaGFyYWN0ZXJTcHJpdGVNYXRlcmlhbCkpIHtcclxuXHRcdHJldHVybiBuZXcgQ2hhcmFjdGVyU3ByaXRlTWF0ZXJpYWwob3B0cyk7XHJcblx0fVxyXG5cdFxyXG5cdC8vVE9ETyB3cml0ZSBpdCBzbyB3aGVuIHdlIHJlcGxhY2UgdGhlIHZhbHVlcyBoZXJlLCB3ZSByZXBsYWNlIHRoZSBvbmVzIGluIHRoZSB1bmlmb3Jtc1xyXG5cdC8vIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKHRoaXMsIHtcclxuXHQvLyBcdHV2T2Zmc2V0IDoge31cclxuXHQvLyB9KTtcclxuXHJcblx0dGhpcy5tYXAgPSBvcHRzLm1hcCB8fCBuZXcgVEhSRUUuVGV4dHVyZSgpO1xyXG5cdFxyXG5cdHRoaXMudXZPZmZzZXQgPSBvcHRzLnV2T2Zmc2V0IHx8IHRoaXMubWFwLm9mZnNldCB8fCBuZXcgVEhSRUUuVmVjdG9yMigwLCAwKTtcclxuXHR0aGlzLnV2U2NhbGUgPSBvcHRzLnV2U2NhbGUgfHwgdGhpcy5tYXAucmVwZWF0IHx8IG5ldyBUSFJFRS5WZWN0b3IyKDEsIDEpO1xyXG5cdFxyXG5cdHRoaXMucm90YXRpb24gPSBvcHRzLnJvdGF0aW9uIHx8IDA7XHJcblx0dGhpcy5zY2FsZSA9IG9wdHMuc2NhbGUgfHwgbmV3IFRIUkVFLlZlY3RvcjIoMSwgMSk7XHJcblx0XHJcblx0dGhpcy5jb2xvciA9IChvcHRzLmNvbG9yIGluc3RhbmNlb2YgVEhSRUUuQ29sb3IpPyBvcHRzLmNvbG9yIDogbmV3IFRIUkVFLkNvbG9yKG9wdHMuY29sb3IpO1xyXG5cdHRoaXMub3BhY2l0eSA9IG9wdHMub3BhY2l0eSB8fCAxO1xyXG5cdFxyXG5cdHZhciBwYXJhbXMgPSB0aGlzLl9jcmVhdGVNYXRQYXJhbXMob3B0cyk7XHJcblx0VEhSRUUuU2hhZGVyTWF0ZXJpYWwuY2FsbCh0aGlzLCBwYXJhbXMpO1xyXG5cdHRoaXMudHlwZSA9IFwiQ2hhcmFjdGVyU3ByaXRlTWF0ZXJpYWxcIjtcclxuXHRcclxuXHR0aGlzLnRyYW5zcGFyZW50ID0gKG9wdHMudHJhbnNwYXJlbnQgIT09IHVuZGVmaW5lZCk/IG9wdHMudHJhbnNwYXJlbnQgOiB0cnVlO1xyXG5cdHRoaXMuYWxwaGFUZXN0ID0gMC4wNTtcclxuXHQvLyB0aGlzLmRlcHRoV3JpdGUgPSBmYWxzZTtcclxufVxyXG5pbmhlcml0cyhDaGFyYWN0ZXJTcHJpdGVNYXRlcmlhbCwgVEhSRUUuU2hhZGVyTWF0ZXJpYWwpO1xyXG5leHRlbmQoQ2hhcmFjdGVyU3ByaXRlTWF0ZXJpYWwucHJvdG90eXBlLCB7XHJcblx0bWFwIDogbnVsbCxcclxuXHRcclxuXHRfY3JlYXRlTWF0UGFyYW1zIDogZnVuY3Rpb24oKSB7XHJcblx0XHR2YXIgcGFyYW1zID0ge1xyXG5cdFx0XHR1bmlmb3JtcyA6IHtcclxuXHRcdFx0XHR1dk9mZnNldDpcdHsgdHlwZTogXCJ2MlwiLCB2YWx1ZTogdGhpcy51dk9mZnNldCB9LFxyXG5cdFx0XHRcdHV2U2NhbGU6XHR7IHR5cGU6IFwidjJcIiwgdmFsdWU6IHRoaXMudXZTY2FsZSB9LFxyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdHJvdGF0aW9uOlx0eyB0eXBlOiBcImZcIiwgdmFsdWU6IHRoaXMucm90YXRpb24gfSxcclxuXHRcdFx0XHRzY2FsZTpcdFx0eyB0eXBlOiBcInYyXCIsIHZhbHVlOiB0aGlzLnNjYWxlIH0sXHJcblx0XHRcdFx0XHJcblx0XHRcdFx0Y29sb3I6XHRcdHsgdHlwZTogXCJjXCIsIHZhbHVlOiB0aGlzLmNvbG9yIH0sXHJcblx0XHRcdFx0bWFwOlx0XHR7IHR5cGU6IFwidFwiLCB2YWx1ZTogdGhpcy5tYXAgfSxcclxuXHRcdFx0XHRvcGFjaXR5Olx0eyB0eXBlOiBcImZcIiwgdmFsdWU6IHRoaXMub3BhY2l0eSB9LFxyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdHpvZmZzZXQ6XHR7IHR5cGU6IFwiZlwiLCB2YWx1ZTogMCB9LFxyXG5cdFx0XHRcdHNoZWVyOlx0XHR7IHR5cGU6IFwibTRcIiwgdmFsdWU6IG5ldyBUSFJFRS5NYXRyaXg0KCkgfSxcclxuXHRcdFx0fSxcclxuXHRcdH07XHJcblx0XHRcclxuXHRcdHBhcmFtcy52ZXJ0ZXhTaGFkZXIgPSBWRVJUX1NIQURFUjtcclxuXHRcdHBhcmFtcy5mcmFnbWVudFNoYWRlciA9IEZSQUdfU0hBREVSO1xyXG5cdFx0cmV0dXJuIHBhcmFtcztcclxuXHR9LFxyXG59KTtcclxubW9kdWxlLmV4cG9ydHMuQ2hhcmFjdGVyU3ByaXRlTWF0ZXJpYWwgPSBDaGFyYWN0ZXJTcHJpdGVNYXRlcmlhbDtcclxuXHJcblxyXG5cclxuZnVuY3Rpb24gQ2hhcmFjdGVyUGxhbmVHZW9tZXRyeSh4b2ZmLCB5b2ZmLCB6b2ZmKSB7XHJcblx0VEhSRUUuQnVmZmVyR2VvbWV0cnkuY2FsbCh0aGlzKTtcclxuXHRcclxuXHR0aGlzLnR5cGUgPSBcIkNoYXJhY3RlclBsYW5lR2VvbWV0cnlcIjtcclxuXHRcclxuXHR2YXIgdmVydHMgPSBuZXcgRmxvYXQzMkFycmF5KFtcclxuXHRcdC0wLjUgKyB4b2ZmLCAtMC41ICsgeW9mZiwgMCArIHpvZmYsXHJcblx0XHQgMC41ICsgeG9mZiwgLTAuNSArIHlvZmYsIDAgKyB6b2ZmLFxyXG5cdFx0IDAuNSArIHhvZmYsICAwLjUgKyB5b2ZmLCAwICsgem9mZixcclxuXHRcdC0wLjUgKyB4b2ZmLCAgMC41ICsgeW9mZiwgMCArIHpvZmYsXHJcblx0XSk7XHJcblx0dmFyIG5vcm1zID0gbmV3IEZsb2F0MzJBcnJheShbIDAsIDEsIDEsICAgMCwgMCwgMSwgICAwLCAwLCAxLCAgIDAsIDAsIDEsIF0pO1xyXG5cdHZhciB1dnMgICA9IG5ldyBGbG9hdDMyQXJyYXkoWyAwLCAwLCAgICAgIDEsIDAsICAgICAgMSwgMSwgICAgICAwLCAxLCBdKTtcclxuXHR2YXIgZmFjZXMgPSBuZXcgVWludDE2QXJyYXkoIFsgMCwgMSwgMiwgICAwLCAyLCAzIF0pO1xyXG5cdFxyXG5cdHRoaXMuYWRkQXR0cmlidXRlKCAnaW5kZXgnLCBuZXcgVEhSRUUuQnVmZmVyQXR0cmlidXRlKCBmYWNlcywgMSApICk7XHJcblx0dGhpcy5hZGRBdHRyaWJ1dGUoICdwb3NpdGlvbicsIG5ldyBUSFJFRS5CdWZmZXJBdHRyaWJ1dGUoIHZlcnRzLCAzICkgKTtcclxuXHR0aGlzLmFkZEF0dHJpYnV0ZSggJ25vcm1hbCcsIG5ldyBUSFJFRS5CdWZmZXJBdHRyaWJ1dGUoIG5vcm1zLCAzICkgKTtcclxuXHR0aGlzLmFkZEF0dHJpYnV0ZSggJ3V2JywgbmV3IFRIUkVFLkJ1ZmZlckF0dHJpYnV0ZSggdXZzLCAyICkgKTtcclxuXHRcclxufVxyXG5pbmhlcml0cyhDaGFyYWN0ZXJQbGFuZUdlb21ldHJ5LCBUSFJFRS5CdWZmZXJHZW9tZXRyeSk7XHJcblxyXG5cclxuXHJcblxyXG52YXIgVkVSVF9TSEFERVIgPSBbXHJcblx0Ly8gJ3VuaWZvcm0gbWF0NCBtb2RlbFZpZXdNYXRyaXg7JyxcclxuXHQvLyAndW5pZm9ybSBtYXQ0IHByb2plY3Rpb25NYXRyaXg7JyxcclxuXHQndW5pZm9ybSBmbG9hdCByb3RhdGlvbjsnLFxyXG5cdCd1bmlmb3JtIHZlYzIgc2NhbGU7JyxcclxuXHQndW5pZm9ybSB2ZWMyIHV2T2Zmc2V0OycsXHJcblx0J3VuaWZvcm0gdmVjMiB1dlNjYWxlOycsXHJcblx0XHJcblx0J3VuaWZvcm0gZmxvYXQgem9mZnNldDsnLFxyXG5cdCd1bmlmb3JtIG1hdDQgc2hlZXI7JyxcclxuXHJcblx0Ly8gJ2F0dHJpYnV0ZSB2ZWMyIHBvc2l0aW9uOycsXHJcblx0Ly8gJ2F0dHJpYnV0ZSB2ZWMyIHV2OycsXHJcblxyXG5cdCd2YXJ5aW5nIHZlYzIgdlVWOycsXHJcblxyXG5cdCd2b2lkIG1haW4oKSB7JyxcclxuXHJcblx0XHQndlVWID0gdXZPZmZzZXQgKyB1diAqIHV2U2NhbGU7JyxcclxuXHJcblx0XHQndmVjMiBhbGlnbmVkUG9zaXRpb24gPSBwb3NpdGlvbi54eSAqIHNjYWxlOycsXHJcblxyXG5cdFx0J3ZlYzIgcm90YXRlZFBvc2l0aW9uOycsXHJcblx0XHQncm90YXRlZFBvc2l0aW9uLnggPSBjb3MoIHJvdGF0aW9uICkgKiBhbGlnbmVkUG9zaXRpb24ueCAtIHNpbiggcm90YXRpb24gKSAqIGFsaWduZWRQb3NpdGlvbi55OycsXHJcblx0XHQncm90YXRlZFBvc2l0aW9uLnkgPSBzaW4oIHJvdGF0aW9uICkgKiBhbGlnbmVkUG9zaXRpb24ueCArIGNvcyggcm90YXRpb24gKSAqIGFsaWduZWRQb3NpdGlvbi55OycsXHJcblx0XHRcclxuXHRcdC8vICdtYXQ0IHpzaGVlciA9IG1hdDQoMSwgMCwgMCwgMCwnLFxyXG5cdFx0Ly8gXHQgICAgICAgICAgICAgICAnMCwgMSwgMCwgMCwnLFxyXG5cdFx0Ly8gXHQgICAgICAgICAgICAgICAnMCwgMCwgMSwgcG9zaXRpb24ueSAqIHpvZmZzZXQsJyxcclxuXHRcdC8vIFx0ICAgICAgICAgICAgICAgJzAsIDAsIDAsIDEpOycsXHJcblxyXG5cdFx0Ly8gJ3ZlYzQgc2hlZXJmb3JjZSA9IG1vZGVsVmlld01hdHJpeCAqIHZlYzQoMCwgcG9zaXRpb24ueSwgcG9zaXRpb24ueiwgMSk7JyxcclxuXHRcdFxyXG5cdFx0J3ZlYzQgZmluYWxQb3NpdGlvbjsnLFxyXG5cclxuXHRcdCdmaW5hbFBvc2l0aW9uID0gbW9kZWxWaWV3TWF0cml4ICogdmVjNCggMC4wLCAwLjAsIDAuMCwgMS4wICk7JyxcclxuXHRcdC8vICdmaW5hbFBvc2l0aW9uLncgKz0gKHNoZWVyZm9yY2UueiAtIGZpbmFsUG9zaXRpb24ueikgKiB6b2Zmc2V0OycsXHJcblx0XHQnZmluYWxQb3NpdGlvbi54eSArPSByb3RhdGVkUG9zaXRpb247JyxcclxuXHRcdC8vICdmaW5hbFBvc2l0aW9uID0genNoZWVyICogZmluYWxQb3NpdGlvbjsnLFxyXG5cdFx0J2ZpbmFsUG9zaXRpb24gPSBwcm9qZWN0aW9uTWF0cml4ICogZmluYWxQb3NpdGlvbjsnLFxyXG5cdFx0XHJcblx0XHQnZ2xfUG9zaXRpb24gPSBmaW5hbFBvc2l0aW9uOycsXHJcblxyXG5cdCd9J1xyXG5dLmpvaW4oICdcXG4nICk7XHJcblxyXG52YXIgRlJBR19TSEFERVIgPSBbXHJcblx0J3VuaWZvcm0gdmVjMyBjb2xvcjsnLFxyXG5cdCd1bmlmb3JtIHNhbXBsZXIyRCBtYXA7JyxcclxuXHQndW5pZm9ybSBmbG9hdCBvcGFjaXR5OycsXHJcblxyXG5cdCd1bmlmb3JtIHZlYzMgZm9nQ29sb3I7JyxcclxuXHQndW5pZm9ybSBmbG9hdCBmb2dEZW5zaXR5OycsXHJcblx0J3VuaWZvcm0gZmxvYXQgZm9nTmVhcjsnLFxyXG5cdCd1bmlmb3JtIGZsb2F0IGZvZ0ZhcjsnLFxyXG5cclxuXHQndmFyeWluZyB2ZWMyIHZVVjsnLFxyXG5cclxuXHQndm9pZCBtYWluKCkgeycsXHJcblxyXG5cdFx0J3ZlYzQgdGV4dHVyZSA9IHRleHR1cmUyRCggbWFwLCB2VVYgKTsnLFxyXG5cclxuXHRcdCcjaWZkZWYgQUxQSEFURVNUJyxcclxuXHRcdFx0J2lmICggdGV4dHVyZS5hIDwgQUxQSEFURVNUICkgZGlzY2FyZDsnLFxyXG5cdFx0JyNlbmRpZicsXHJcblxyXG5cdFx0J2dsX0ZyYWdDb2xvciA9IHZlYzQoIGNvbG9yICogdGV4dHVyZS54eXosIHRleHR1cmUuYSAqIG9wYWNpdHkgKTsnLFxyXG5cclxuXHRcdCcjaWZkZWYgVVNFX0ZPRycsXHJcblx0XHRcdCdmbG9hdCBkZXB0aCA9IGdsX0ZyYWdDb29yZC56IC8gZ2xfRnJhZ0Nvb3JkLnc7JyxcclxuXHRcdFx0J2Zsb2F0IGZvZ0ZhY3RvciA9IDAuMDsnLFxyXG5cdFx0XHRcclxuXHRcdFx0JyNpZm5kZWYgRk9HX0VYUDInLCAvL25vdGU6IE5PVCBkZWZpbmVkXHJcblx0XHRcdFxyXG5cdFx0XHRcdCdmb2dGYWN0b3IgPSBzbW9vdGhzdGVwKCBmb2dOZWFyLCBmb2dGYXIsIGRlcHRoICk7JyxcclxuXHRcdFx0XHRcclxuXHRcdFx0JyNlbHNlJyxcclxuXHRcdFx0XHJcblx0XHRcdFx0J2NvbnN0IGZsb2F0IExPRzIgPSAxLjQ0MjY5NTsnLFxyXG5cdFx0XHRcdCdmbG9hdCBmb2dGYWN0b3IgPSBleHAyKCAtIGZvZ0RlbnNpdHkgKiBmb2dEZW5zaXR5ICogZGVwdGggKiBkZXB0aCAqIExPRzIgKTsnLFxyXG5cdFx0XHRcdCdmb2dGYWN0b3IgPSAxLjAgLSBjbGFtcCggZm9nRmFjdG9yLCAwLjAsIDEuMCApOycsXHJcblxyXG5cdFx0XHQnI2VuZGlmJyxcclxuXHRcdFx0XHJcblx0XHRcdCdnbF9GcmFnQ29sb3IgPSBtaXgoIGdsX0ZyYWdDb2xvciwgdmVjNCggZm9nQ29sb3IsIGdsX0ZyYWdDb2xvci53ICksIGZvZ0ZhY3RvciApOycsXHJcblxyXG5cdFx0JyNlbmRpZicsXHJcblxyXG5cdCd9J1xyXG5dLmpvaW4oICdcXG4nICk7XHJcblxyXG5cclxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cclxuXHJcbmZ1bmN0aW9uIFNwcml0ZUdsb3dNYXRlcmlhbChvcHRzKSB7XHJcblx0aWYgKCEodGhpcyBpbnN0YW5jZW9mIFNwcml0ZUdsb3dNYXRlcmlhbCkpIHtcclxuXHRcdHJldHVybiBuZXcgU3ByaXRlR2xvd01hdGVyaWFsKG9wdHMpO1xyXG5cdH1cclxuXHRcclxuXHQvL1RPRE8gd3JpdGUgaXQgc28gd2hlbiB3ZSByZXBsYWNlIHRoZSB2YWx1ZXMgaGVyZSwgd2UgcmVwbGFjZSB0aGUgb25lcyBpbiB0aGUgdW5pZm9ybXNcclxuXHQvLyBPYmplY3QuZGVmaW5lUHJvcGVydGllcyh0aGlzLCB7XHJcblx0Ly8gXHR1dk9mZnNldCA6IHt9XHJcblx0Ly8gfSk7XHJcblxyXG5cdHRoaXMuY29sb3IgPSAob3B0cy5jb2xvciBpbnN0YW5jZW9mIFRIUkVFLkNvbG9yKT8gb3B0cy5jb2xvciA6IG5ldyBUSFJFRS5Db2xvcihvcHRzLmNvbG9yKTtcclxuXHQvLyB0aGlzLm9wYWNpdHkgPSBvcHRzLm9wYWNpdHkgfHwgMTtcclxuXHRcclxuXHR2YXIgcGFyYW1zID0gdGhpcy5fY3JlYXRlTWF0UGFyYW1zKG9wdHMpO1xyXG5cdFRIUkVFLlNoYWRlck1hdGVyaWFsLmNhbGwodGhpcywgcGFyYW1zKTtcclxuXHR0aGlzLnR5cGUgPSBcIlNwcml0ZUdsb3dNYXRlcmlhbFwiO1xyXG5cdFxyXG5cdHRoaXMudHJhbnNwYXJlbnQgPSAob3B0cy50cmFuc3BhcmVudCAhPT0gdW5kZWZpbmVkKT8gb3B0cy50cmFuc3BhcmVudCA6IHRydWU7XHJcblx0dGhpcy5hbHBoYVRlc3QgPSAwLjA1O1xyXG5cdC8vIHRoaXMuZGVwdGhXcml0ZSA9IGZhbHNlO1xyXG59XHJcbmluaGVyaXRzKFNwcml0ZUdsb3dNYXRlcmlhbCwgVEhSRUUuU2hhZGVyTWF0ZXJpYWwpO1xyXG5leHRlbmQoU3ByaXRlR2xvd01hdGVyaWFsLnByb3RvdHlwZSwge1xyXG5cdG1hcCA6IG51bGwsXHJcblx0XHJcblx0X2NyZWF0ZU1hdFBhcmFtcyA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0dmFyIHBhcmFtcyA9IHtcclxuXHRcdFx0dW5pZm9ybXMgOiB7XHJcblx0XHRcdFx0XCJjXCI6ICAgeyB0eXBlOiBcImZcIiwgdmFsdWU6IDEuMCB9LFxyXG5cdFx0XHRcdFwicFwiOiAgIHsgdHlwZTogXCJmXCIsIHZhbHVlOiAxLjQgfSxcclxuXHRcdFx0XHRnbG93Q29sb3I6IHsgdHlwZTogXCJjXCIsIHZhbHVlOiB0aGlzLmNvbG9yIH0sLy9uZXcgVEhSRUUuQ29sb3IoMHhmZmZmMDApIH0sXHJcblx0XHRcdFx0Ly8gdmlld1ZlY3RvcjogeyB0eXBlOiBcInYzXCIsIHZhbHVlOiBjYW1lcmEucG9zaXRpb24gfVxyXG5cdFx0XHR9LFxyXG5cdFx0fTtcclxuXHRcdFxyXG5cdFx0cGFyYW1zLnZlcnRleFNoYWRlciA9IHRoaXMuX3ZlcnRTaGFkZXI7XHJcblx0XHRwYXJhbXMuZnJhZ21lbnRTaGFkZXIgPSB0aGlzLl9mcmFnU2hhZGVyO1xyXG5cdFx0cGFyYW1zLmJsZW5kaW5nID0gVEhSRUUuQWRkaXRpdmVCbGVuZGluZztcclxuXHRcdHJldHVybiBwYXJhbXM7XHJcblx0fSxcclxuXHRcclxuXHRfdmVydFNoYWRlcjogW1xyXG5cdFx0Ly8gXCJ1bmlmb3JtIHZlYzMgdmlld1ZlY3RvcjtcIixcclxuXHRcdFwidW5pZm9ybSBmbG9hdCBjO1wiLFxyXG5cdFx0XCJ1bmlmb3JtIGZsb2F0IHA7XCIsXHJcblx0XHRcInZhcnlpbmcgZmxvYXQgaW50ZW5zaXR5O1wiLFxyXG5cdFx0XHJcblx0XHRcInZvaWQgbWFpbigpIHtcIixcclxuXHRcdFx0XCJ2ZWMzIHZOb3JtID0gbm9ybWFsaXplKCBub3JtYWxNYXRyaXggKiBub3JtYWwgKTtcIixcclxuXHRcdFx0Ly8gXCJ2ZWMzIHZOb3JtQ2FtZXJhID0gbm9ybWFsaXplKCBub3JtYWxNYXRyaXggKiB2aWV3VmVjdG9yICk7XCIsXHJcblx0XHRcdFwidmVjMyB2Tm9ybUNhbWVyYSA9IG5vcm1hbGl6ZSggbm9ybWFsTWF0cml4ICogbm9ybWFsaXplKCBtb2RlbFZpZXdNYXRyaXggKiB2ZWM0KDAsIDAsIDEsIDEpICkueHl6ICk7XCIsXHJcblx0XHRcdFwiaW50ZW5zaXR5ID0gcG93KCBjIC0gZG90KHZOb3JtLCB2Tm9ybUNhbWVyYSksIHAgKTtcIixcclxuXHRcdFx0XHJcblx0XHRcdFwiZ2xfUG9zaXRpb24gPSBwcm9qZWN0aW9uTWF0cml4ICogbW9kZWxWaWV3TWF0cml4ICogdmVjNCggcG9zaXRpb24sIDEuMCApO1wiLFxyXG5cdFx0XCJ9XCIsXHJcblx0XS5qb2luKFwiXFxuXCIpLFxyXG5cdFxyXG5cdF9mcmFnU2hhZGVyOiBbXHJcblx0XHRcInVuaWZvcm0gdmVjMyBnbG93Q29sb3I7XCIsXHJcblx0XHRcInZhcnlpbmcgZmxvYXQgaW50ZW5zaXR5O1wiLFxyXG5cdFx0XHJcblx0XHRcInZvaWQgbWFpbigpIHtcIixcclxuXHRcdFx0XCJ2ZWMzIGdsb3cgPSBnbG93Q29sb3IgKiBpbnRlbnNpdHk7XCIsXHJcblx0XHRcdFwiZ2xfRnJhZ0NvbG9yID0gdmVjNCggZ2xvdywgMS4wICk7XCIsXHJcblx0XHRcIn1cIixcclxuXHRdLmpvaW4oXCJcXG5cIiksXHJcbn0pO1xyXG5tb2R1bGUuZXhwb3J0cy5TcHJpdGVHbG93TWF0ZXJpYWwgPSBTcHJpdGVHbG93TWF0ZXJpYWw7XHJcbiIsIi8vIGFjdG9yX2FuaW1hdGlvbnMuanNcclxuLy8gQSBzdWJtb2R1bGUgZm9yIHRoZSBBY3RvciBldmVudCBjbGFzcyB0aGF0IGRlYWxzIHdpdGggYW5pbWF0aW9uc1xyXG5cclxudmFyIGV4dGVuZCA9IHJlcXVpcmUoXCJleHRlbmRcIik7XHJcblxyXG5mdW5jdGlvbiBnZXRTcHJpdGVGb3JtYXQoc3RyKSB7XHJcblx0dmFyIGZvcm1hdCA9IHN0ci5zcGxpdChcIi1cIik7XHJcblx0dmFyIG5hbWUgPSBmb3JtYXRbMF07XHJcblx0dmFyIHNpemUgPSBmb3JtYXRbMV0uc3BsaXQoXCJ4XCIpO1xyXG5cdHNpemVbMV0gPSBzaXplWzFdIHx8IHNpemVbMF07XHJcblx0XHJcblx0dmFyIGJhc2UgPSB7XHJcblx0XHR3aWR0aDogc2l6ZVswXSwgaGVpZ2h0OiBzaXplWzFdLCBmbGlwOiBmYWxzZSwgXHJcblx0XHQvL3JlcGVhdHg6IDAuMjUsIHJlcGVhdHk6IDAuMjUsXHJcblx0XHRmcmFtZXM6IHtcclxuXHRcdFx0XCJ1M1wiOiBcInUwXCIsIFwiZDNcIjogXCJkMFwiLCBcImwzXCI6IFwibDBcIiwgXCJyM1wiOiBcInIwXCIsXHJcblx0XHR9LFxyXG5cdFx0YW5pbXMgOiBnZXRTdGFuZGFyZEFuaW1hdGlvbnMoKSxcclxuXHR9O1xyXG5cdFxyXG5cdHN3aXRjaCAobmFtZSkge1xyXG5cdFx0Y2FzZSBcInB0X2hvcnpyb3dcIjogXHJcblx0XHRcdHJldHVybiBleHRlbmQodHJ1ZSwgYmFzZSwgeyBcclxuXHRcdFx0XHRmcmFtZXM6IHtcclxuXHRcdFx0XHRcdFwidTBcIjogWzEsIDBdLCBcInUxXCI6IFsxLCAxXSwgXCJ1MlwiOiBbMSwgMl0sXHJcblx0XHRcdFx0XHRcImQwXCI6IFswLCAwXSwgXCJkMVwiOiBbMCwgMV0sIFwiZDJcIjogWzAsIDJdLFxyXG5cdFx0XHRcdFx0XCJsMFwiOiBbMiwgMF0sIFwibDFcIjogWzIsIDFdLCBcImwyXCI6IFsyLCAyXSxcclxuXHRcdFx0XHRcdFwicjBcIjogWzMsIDBdLCBcInIxXCI6IFszLCAxXSwgXCJyMlwiOiBbMywgMl0sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fSk7XHJcblx0XHRjYXNlIFwicHRfdmVydGNvbFwiOiBcclxuXHRcdFx0cmV0dXJuIGV4dGVuZCh0cnVlLCBiYXNlLCB7IFxyXG5cdFx0XHRcdGZyYW1lczoge1xyXG5cdFx0XHRcdFx0XCJ1MFwiOiBbMCwgMV0sIFwidTFcIjogWzEsIDFdLCBcInUyXCI6IFsyLCAxXSxcclxuXHRcdFx0XHRcdFwiZDBcIjogWzAsIDBdLCBcImQxXCI6IFsxLCAwXSwgXCJkMlwiOiBbMiwgMF0sXHJcblx0XHRcdFx0XHRcImwwXCI6IFswLCAyXSwgXCJsMVwiOiBbMSwgMl0sIFwibDJcIjogWzIsIDJdLFxyXG5cdFx0XHRcdFx0XCJyMFwiOiBbMCwgM10sIFwicjFcIjogWzEsIDNdLCBcInIyXCI6IFsyLCAzXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9KTtcclxuXHRcdGNhc2UgXCJoZ192ZXJ0bWl4XCI6IFxyXG5cdFx0XHRyZXR1cm4gZXh0ZW5kKHRydWUsIGJhc2UsIHsgXHJcblx0XHRcdFx0ZnJhbWVzOiB7XHJcblx0XHRcdFx0XHRcInUwXCI6IFswLCAwXSwgXCJ1MVwiOiBbMSwgM10sIFwidTJcIjogWzIsIDBdLFxyXG5cdFx0XHRcdFx0XCJkMFwiOiBbMiwgMV0sIFwiZDFcIjogWzIsIDJdLCBcImQyXCI6IFsyLCAzXSxcclxuXHRcdFx0XHRcdFwibDBcIjogWzAsIDJdLCBcImwxXCI6IFswLCAxXSwgXCJsMlwiOiBbMCwgM10sXHJcblx0XHRcdFx0XHRcInIwXCI6IFsxLCAwXSwgXCJyMVwiOiBbMSwgMV0sIFwicjJcIjogWzEsIDJdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH0pO1xyXG5cdFx0Y2FzZSBcImhnX3Bva2Vyb3dcIjpcclxuXHRcdFx0cmV0dXJuIGV4dGVuZCh0cnVlLCBiYXNlLCB7IFxyXG5cdFx0XHRcdGZyYW1lczogeyAvLyBwb2ludGVycyB0byBhbm90aGVyIGltYWdlIGluZGljYXRlcyB0aGF0IGltYWdlIHNob3VsZCBiZSBmbGlwcGVkLCBpZiBmbGlwPXRydWVcclxuXHRcdFx0XHRcdFwidTBcIjogbnVsbCwgXCJ1MVwiOiBbMCwgMF0sIFwidTJcIjogWzEsIDBdLFxyXG5cdFx0XHRcdFx0XCJkMFwiOiBudWxsLCBcImQxXCI6IFswLCAxXSwgXCJkMlwiOiBbMSwgMV0sXHJcblx0XHRcdFx0XHRcImwwXCI6IG51bGwsIFwibDFcIjogWzAsIDJdLCBcImwyXCI6IFsxLCAyXSxcclxuXHRcdFx0XHRcdFwicjBcIjogbnVsbCwgXCJyMVwiOiBbMCwgM10sIFwicjJcIjogWzEsIDNdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0YW5pbXM6IGdldFBva2Vtb25BbmltYXRpb25zKCksXHJcblx0XHRcdH0pO1xyXG5cdFx0Y2FzZSBcImhnX3Bva2Vyb3dfcmV2ZXJzZVwiOlxyXG5cdFx0XHRyZXR1cm4gZXh0ZW5kKHRydWUsIGJhc2UsIHsgXHJcblx0XHRcdFx0ZnJhbWVzOiB7IC8vIHBvaW50ZXJzIHRvIGFub3RoZXIgaW1hZ2UgaW5kaWNhdGVzIHRoYXQgaW1hZ2Ugc2hvdWxkIGJlIGZsaXBwZWQsIGlmIGZsaXA9dHJ1ZVxyXG5cdFx0XHRcdFx0XCJ1MFwiOiBudWxsLCBcInUxXCI6IFswLCAxXSwgXCJ1MlwiOiBbMSwgMV0sXHJcblx0XHRcdFx0XHRcImQwXCI6IG51bGwsIFwiZDFcIjogWzAsIDBdLCBcImQyXCI6IFsxLCAwXSxcclxuXHRcdFx0XHRcdFwibDBcIjogbnVsbCwgXCJsMVwiOiBbMCwgM10sIFwibDJcIjogWzEsIDNdLFxyXG5cdFx0XHRcdFx0XCJyMFwiOiBudWxsLCBcInIxXCI6IFswLCAyXSwgXCJyMlwiOiBbMSwgMl0sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRhbmltczogZ2V0UG9rZW1vbkFuaW1hdGlvbnMoKSxcclxuXHRcdFx0fSk7XHJcblx0XHRjYXNlIFwiaGdfcG9rZWNvbFwiOlxyXG5cdFx0XHRyZXR1cm4gZXh0ZW5kKHRydWUsIGJhc2UsIHsgXHJcblx0XHRcdFx0ZnJhbWVzOiB7IC8vIHBvaW50ZXJzIHRvIGFub3RoZXIgaW1hZ2UgaW5kaWNhdGVzIHRoYXQgaW1hZ2Ugc2hvdWxkIGJlIGZsaXBwZWQsIGlmIGZsaXA9dHJ1ZVxyXG5cdFx0XHRcdFx0XCJ1MFwiOiBudWxsLCBcInUxXCI6IFswLCAwXSwgXCJ1MlwiOiBbMCwgMV0sXHJcblx0XHRcdFx0XHRcImQwXCI6IG51bGwsIFwiZDFcIjogWzAsIDJdLCBcImQyXCI6IFswLCAzXSxcclxuXHRcdFx0XHRcdFwibDBcIjogbnVsbCwgXCJsMVwiOiBbMSwgMF0sIFwibDJcIjogWzEsIDFdLFxyXG5cdFx0XHRcdFx0XCJyMFwiOiBudWxsLCBcInIxXCI6IFsxLCAyXSwgXCJyMlwiOiBbMSwgM10sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRhbmltczogZ2V0UG9rZW1vbkFuaW1hdGlvbnMoKSxcclxuXHRcdFx0fSk7XHJcblx0XHRjYXNlIFwiaGdfcG9rZV9ob3J6Y29sXCI6XHJcblx0XHRcdHJldHVybiBleHRlbmQodHJ1ZSwgYmFzZSwgeyBcclxuXHRcdFx0XHRmcmFtZXM6IHsgLy8gcG9pbnRlcnMgdG8gYW5vdGhlciBpbWFnZSBpbmRpY2F0ZXMgdGhhdCBpbWFnZSBzaG91bGQgYmUgZmxpcHBlZCwgaWYgZmxpcD10cnVlXHJcblx0XHRcdFx0XHRcInUwXCI6IG51bGwsIFwidTFcIjogWzEsIDBdLCBcInUyXCI6IFsxLCAxXSxcclxuXHRcdFx0XHRcdFwiZDBcIjogbnVsbCwgXCJkMVwiOiBbMCwgMF0sIFwiZDJcIjogWzAsIDFdLFxyXG5cdFx0XHRcdFx0XCJsMFwiOiBudWxsLCBcImwxXCI6IFsyLCAwXSwgXCJsMlwiOiBbMiwgMV0sXHJcblx0XHRcdFx0XHRcInIwXCI6IG51bGwsIFwicjFcIjogWzMsIDBdLCBcInIyXCI6IFszLCAxXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdGFuaW1zOiBnZXRQb2tlbW9uQW5pbWF0aW9ucygpLFxyXG5cdFx0XHR9KTtcclxuXHRcdGNhc2UgXCJoZ19wb2tlZmxpcFwiOlxyXG5cdFx0XHRyZXR1cm4gZXh0ZW5kKHRydWUsIGJhc2UsIHsgXHJcblx0XHRcdFx0ZnJhbWVzOiB7IC8vIHBvaW50ZXJzIHRvIGFub3RoZXIgaW1hZ2UgaW5kaWNhdGVzIHRoYXQgaW1hZ2Ugc2hvdWxkIGJlIGZsaXBwZWQsIGlmIGZsaXA9dHJ1ZVxyXG5cdFx0XHRcdFx0XCJ1MFwiOiBudWxsLCBcInUxXCI6IFswLCAwXSwgXCJ1MlwiOiBbMSwgMF0sXHJcblx0XHRcdFx0XHRcImQwXCI6IG51bGwsIFwiZDFcIjogWzAsIDFdLCBcImQyXCI6IFsxLCAxXSxcclxuXHRcdFx0XHRcdFwibDBcIjogbnVsbCwgXCJsMVwiOiBbMCwgMl0sIFwibDJcIjogWzEsIDJdLFxyXG5cdFx0XHRcdFx0XCJyMFwiOiBudWxsLCBcInIxXCI6IFwibDFcIiwgICBcInIyXCI6IFwibDJcIixcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdGFuaW1zOiBnZXRQb2tlbW9uQW5pbWF0aW9ucygpLFxyXG5cdFx0XHR9KTtcclxuXHRcdGNhc2UgXCJid192ZXJ0cm93XCI6XHJcblx0XHRcdHJldHVybiBleHRlbmQodHJ1ZSwgYmFzZSwgeyBcclxuXHRcdFx0XHRmcmFtZXM6IHtcclxuXHRcdFx0XHRcdFwidTBcIjogWzAsIDBdLCBcInUxXCI6IFsxLCAwXSwgXCJ1MlwiOiBbMiwgMF0sXHJcblx0XHRcdFx0XHRcImQwXCI6IFswLCAxXSwgXCJkMVwiOiBbMSwgMV0sIFwiZDJcIjogWzIsIDFdLFxyXG5cdFx0XHRcdFx0XCJsMFwiOiBbMCwgMl0sIFwibDFcIjogWzEsIDJdLCBcImwyXCI6IFsyLCAyXSxcclxuXHRcdFx0XHRcdFwicjBcIjogWzAsIDNdLCBcInIxXCI6IFsxLCAzXSwgXCJyMlwiOiBbMiwgM10sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fSk7XHJcblx0XHRjYXNlIFwiYndfaG9yemZsaXBcIjpcclxuXHRcdFx0cmV0dXJuIGV4dGVuZCh0cnVlLCBiYXNlLCB7IFxyXG5cdFx0XHRcdGZyYW1lczogeyAvLyBwb2ludGVycyB0byBhbm90aGVyIGltYWdlIGluZGljYXRlcyB0aGF0IGltYWdlIHNob3VsZCBiZSBmbGlwcGVkLCBpZiBmbGlwPXRydWVcclxuXHRcdFx0XHRcdFwidTBcIjogWzAsIDBdLCBcInUxXCI6IFsxLCAwXSwgXCJ1MlwiOiBcInUxXCIsXHJcblx0XHRcdFx0XHRcImQwXCI6IFsyLCAwXSwgXCJkMVwiOiBbMywgMF0sIFwiZDJcIjogXCJkMVwiLFxyXG5cdFx0XHRcdFx0XCJsMFwiOiBbMCwgMV0sIFwibDFcIjogWzEsIDFdLCBcImwyXCI6IFsyLCAxXSxcclxuXHRcdFx0XHRcdFwicjBcIjogXCJsMFwiLCAgIFwicjFcIjogXCJsMVwiLCAgIFwicjJcIjogXCJsMlwiLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH0pO1xyXG5cdFx0ZGVmYXVsdDpcclxuXHRcdFx0Y29uc29sZS5lcnJvcihcIk5vIHN1Y2ggU3ByaXRlIEZvcm1hdDpcIiwgbmFtZSk7XHJcblx0XHRcdHJldHVybiB7fTtcclxuXHR9XHJcbn1cclxubW9kdWxlLmV4cG9ydHMuZ2V0U3ByaXRlRm9ybWF0ID0gZ2V0U3ByaXRlRm9ybWF0O1xyXG5cclxuXHJcbmZ1bmN0aW9uIGdldFN0YW5kYXJkQW5pbWF0aW9ucygpIHtcclxuXHR2YXIgYW5pbXMgPSB7fTtcclxuXHRcclxuXHRhbmltc1tcInN0YW5kXCJdID0gbmV3IFNwcml0ZUFuaW1hdGlvbih7IHNpbmdsZUZyYW1lOiB0cnVlLCB9LCBbXHJcblx0XHR7IHU6IFwidTBcIiwgZDogXCJkMFwiLCBsOiBcImwwXCIsIHI6IFwicjBcIiwgdHJhbnM6IHRydWUsIHBhdXNlOiB0cnVlLCB9LFxyXG5cdF0pO1xyXG5cdGFuaW1zW1wid2Fsa1wiXSA9IG5ldyBTcHJpdGVBbmltYXRpb24oeyBmcmFtZUxlbmd0aDogNSwga2VlcEZyYW1lOiB0cnVlLCB9LCBbXHJcblx0XHR7IHU6IFwidTFcIiwgZDogXCJkMVwiLCBsOiBcImwxXCIsIHI6IFwicjFcIiwgfSxcclxuXHRcdHsgdTogXCJ1M1wiLCBkOiBcImQzXCIsIGw6IFwibDNcIiwgcjogXCJyM1wiLCB0cmFuczogdHJ1ZSwgfSxcclxuXHRcdHsgdTogXCJ1MlwiLCBkOiBcImQyXCIsIGw6IFwibDJcIiwgcjogXCJyMlwiLCB9LFxyXG5cdFx0eyB1OiBcInUzXCIsIGQ6IFwiZDNcIiwgbDogXCJsM1wiLCByOiBcInIzXCIsIHRyYW5zOiB0cnVlLCBsb29wVG86IDAsIH0sXHJcblx0XSk7XHJcblx0YW5pbXNbXCJidW1wXCJdID0gbmV3IFNwcml0ZUFuaW1hdGlvbih7IGZyYW1lTGVuZ3RoOiAxMCwga2VlcEZyYW1lOiB0cnVlLCB9LCBbXHJcblx0XHR7IHU6IFwidTFcIiwgZDogXCJkMVwiLCBsOiBcImwxXCIsIHI6IFwicjFcIiwgc2Z4OiBcIndhbGtfYnVtcFwiLCB9LFxyXG5cdFx0eyB1OiBcInUwXCIsIGQ6IFwiZDBcIiwgbDogXCJsMFwiLCByOiBcInIwXCIsIHRyYW5zOiB0cnVlLCB9LFxyXG5cdFx0eyB1OiBcInUyXCIsIGQ6IFwiZDJcIiwgbDogXCJsMlwiLCByOiBcInIyXCIsIHNmeDogXCJ3YWxrX2J1bXBcIiwgfSxcclxuXHRcdHsgdTogXCJ1MFwiLCBkOiBcImQwXCIsIGw6IFwibDBcIiwgcjogXCJyMFwiLCB0cmFuczogdHJ1ZSwgbG9vcFRvOiAwLCB9LFxyXG5cdF0pO1xyXG5cdGFuaW1zW1wid2FycF9hd2F5XCJdID0gbmV3IFNwcml0ZUFuaW1hdGlvbih7IHNpbmdsZURpcjogXCJkXCIgfSwgW1xyXG5cdFx0eyBkOiBcImQwXCIsIGZyYW1lTGVuZ3RoOiA4LCB9LCAvLzBcclxuXHRcdHsgZDogXCJsMFwiLCBmcmFtZUxlbmd0aDogOCwgfSxcclxuXHRcdHsgZDogXCJ1MFwiLCBmcmFtZUxlbmd0aDogOCwgfSxcclxuXHRcdHsgZDogXCJyMFwiLCBmcmFtZUxlbmd0aDogOCwgfSxcclxuXHRcdHsgZDogXCJkMFwiLCBmcmFtZUxlbmd0aDogNywgfSwgLy80XHJcblx0XHR7IGQ6IFwibDBcIiwgZnJhbWVMZW5ndGg6IDcsIH0sXHJcblx0XHR7IGQ6IFwidTBcIiwgZnJhbWVMZW5ndGg6IDcsIH0sXHJcblx0XHR7IGQ6IFwicjBcIiwgZnJhbWVMZW5ndGg6IDcsIH0sXHJcblx0XHR7IGQ6IFwiZDBcIiwgZnJhbWVMZW5ndGg6IDUsIH0sIC8vOFxyXG5cdFx0eyBkOiBcImwwXCIsIGZyYW1lTGVuZ3RoOiA1LCB9LFxyXG5cdFx0eyBkOiBcInUwXCIsIGZyYW1lTGVuZ3RoOiA1LCB9LFxyXG5cdFx0eyBkOiBcInIwXCIsIGZyYW1lTGVuZ3RoOiA1LCB9LFxyXG5cdFx0eyBkOiBcImQwXCIsIGZyYW1lTGVuZ3RoOiAzLCB9LCAvLzEyXHJcblx0XHR7IGQ6IFwibDBcIiwgZnJhbWVMZW5ndGg6IDMsIH0sXHJcblx0XHR7IGQ6IFwidTBcIiwgZnJhbWVMZW5ndGg6IDMsIH0sXHJcblx0XHR7IGQ6IFwicjBcIiwgZnJhbWVMZW5ndGg6IDMsIH0sXHJcblx0XHR7IGQ6IFwiZDBcIiwgZnJhbWVMZW5ndGg6IDEsIH0sIC8vMTZcclxuXHRcdHsgZDogXCJsMFwiLCBmcmFtZUxlbmd0aDogMSwgfSxcclxuXHRcdHsgZDogXCJ1MFwiLCBmcmFtZUxlbmd0aDogMSwgfSxcclxuXHRcdHsgZDogXCJyMFwiLCBmcmFtZUxlbmd0aDogMSwgfSxcclxuXHRcdHsgZDogXCJkMFwiLCBmcmFtZUxlbmd0aDogMCwgdHJhbnM6IHRydWUsIH0sIC8vMjBcclxuXHRcdHsgZDogXCJsMFwiLCBmcmFtZUxlbmd0aDogMCwgdHJhbnM6IHRydWUsIH0sXHJcblx0XHR7IGQ6IFwidTBcIiwgZnJhbWVMZW5ndGg6IDAsIHRyYW5zOiB0cnVlLCB9LFxyXG5cdFx0eyBkOiBcInIwXCIsIGZyYW1lTGVuZ3RoOiAwLCB0cmFuczogdHJ1ZSwgbG9vcFRvOiAyMCB9LFxyXG5cdF0pO1xyXG5cdGFuaW1zW1wid2FycF9pblwiXSA9IG5ldyBTcHJpdGVBbmltYXRpb24oeyBzaW5nbGVEaXI6IFwiZFwiIH0sIFtcclxuXHRcdHsgZDogXCJkMFwiLCBmcmFtZUxlbmd0aDogMSwgfSwgLy8wXHJcblx0XHR7IGQ6IFwicjBcIiwgZnJhbWVMZW5ndGg6IDEsIH0sXHJcblx0XHR7IGQ6IFwidTBcIiwgZnJhbWVMZW5ndGg6IDEsIH0sXHJcblx0XHR7IGQ6IFwibDBcIiwgZnJhbWVMZW5ndGg6IDEsIH0sXHJcblx0XHR7IGQ6IFwiZDBcIiwgZnJhbWVMZW5ndGg6IDMsIH0sIC8vNFxyXG5cdFx0eyBkOiBcInIwXCIsIGZyYW1lTGVuZ3RoOiAzLCB9LFxyXG5cdFx0eyBkOiBcInUwXCIsIGZyYW1lTGVuZ3RoOiAzLCB9LFxyXG5cdFx0eyBkOiBcImwwXCIsIGZyYW1lTGVuZ3RoOiAzLCB9LFxyXG5cdFx0eyBkOiBcImQwXCIsIGZyYW1lTGVuZ3RoOiA1LCB9LCAvLzhcclxuXHRcdHsgZDogXCJyMFwiLCBmcmFtZUxlbmd0aDogNSwgfSxcclxuXHRcdHsgZDogXCJ1MFwiLCBmcmFtZUxlbmd0aDogNSwgfSxcclxuXHRcdHsgZDogXCJsMFwiLCBmcmFtZUxlbmd0aDogNSwgfSxcclxuXHRcdHsgZDogXCJkMFwiLCBmcmFtZUxlbmd0aDogNywgfSwgLy8xMlxyXG5cdFx0eyBkOiBcInIwXCIsIGZyYW1lTGVuZ3RoOiA3LCB9LFxyXG5cdFx0eyBkOiBcInUwXCIsIGZyYW1lTGVuZ3RoOiA3LCB9LFxyXG5cdFx0eyBkOiBcImwwXCIsIGZyYW1lTGVuZ3RoOiA3LCB9LFxyXG5cdFx0eyBkOiBcImQwXCIsIGZyYW1lTGVuZ3RoOiA4LCB9LCAvLzE2XHJcblx0XHR7IGQ6IFwicjBcIiwgZnJhbWVMZW5ndGg6IDgsIH0sXHJcblx0XHR7IGQ6IFwidTBcIiwgZnJhbWVMZW5ndGg6IDksIH0sXHJcblx0XHR7IGQ6IFwibDBcIiwgZnJhbWVMZW5ndGg6IDksIH0sXHJcblx0XHR7IGQ6IFwiZDBcIiwgZnJhbWVMZW5ndGg6IDEsIH0sXHJcblx0XSk7XHJcblx0XHJcblx0cmV0dXJuIGFuaW1zO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRQb2tlbW9uQW5pbWF0aW9ucygpIHsgLy9PdmVycmlkZXMgU3RhbmRhcmRcclxuXHR2YXIgYW5pbXMgPSB7fTtcclxuXHRhbmltc1tcInN0YW5kXCJdID0gbmV3IFNwcml0ZUFuaW1hdGlvbih7IHNpbmdsZUZyYW1lOiB0cnVlLCB9LCBbXHJcblx0XHR7IHU6IFwidTFcIiwgZDogXCJkMVwiLCBsOiBcImwxXCIsIHI6IFwicjFcIiwgdHJhbnM6IHRydWUsIHBhdXNlOiB0cnVlLCB9LFxyXG5cdF0pO1xyXG5cdGFuaW1zW1wiX2ZsYXBfc3RhbmRcIl0gPSBuZXcgU3ByaXRlQW5pbWF0aW9uKHsgZnJhbWVMZW5ndGg6IDUsIGtlZXBGcmFtZTogdHJ1ZSwgfSwgW1xyXG5cdFx0eyB1OiBcInUxXCIsIGQ6IFwiZDFcIiwgbDogXCJsMVwiLCByOiBcInIxXCIsIHRyYW5zOiB0cnVlLCB9LFxyXG5cdFx0eyB1OiBcInUyXCIsIGQ6IFwiZDJcIiwgbDogXCJsMlwiLCByOiBcInIyXCIsIGxvb3BUbzogMCwgfSxcclxuXHRdKTtcclxuXHRhbmltc1tcIndhbGtcIl0gPSBuZXcgU3ByaXRlQW5pbWF0aW9uKHsgZnJhbWVMZW5ndGg6IDUsIGtlZXBGcmFtZTogdHJ1ZSwgfSwgW1xyXG5cdFx0eyB1OiBcInUxXCIsIGQ6IFwiZDFcIiwgbDogXCJsMVwiLCByOiBcInIxXCIsIHRyYW5zOiB0cnVlLCB9LFxyXG5cdFx0eyB1OiBcInUyXCIsIGQ6IFwiZDJcIiwgbDogXCJsMlwiLCByOiBcInIyXCIsIGxvb3BUbzogMCwgfSxcclxuXHRdKTtcclxuXHRyZXR1cm4gYW5pbXM7XHJcbn1cclxuXHJcbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblxyXG5mdW5jdGlvbiBTcHJpdGVBbmltYXRpb24ob3B0cywgZnJhbWVzKSB7XHJcblx0dGhpcy5vcHRpb25zID0gb3B0cztcclxuXHR0aGlzLmZyYW1lcyA9IGZyYW1lcztcclxuXHRcclxuXHR0aGlzLndhaXRUaW1lID0gdGhpcy5mcmFtZXNbdGhpcy5jdXJyRnJhbWVdLmZyYW1lTGVuZ3RoIHx8IHRoaXMub3B0aW9ucy5mcmFtZUxlbmd0aDtcclxufVxyXG5TcHJpdGVBbmltYXRpb24ucHJvdG90eXBlID0ge1xyXG5cdG9wdGlvbnM6IG51bGwsXHJcblx0ZnJhbWVzIDogbnVsbCxcclxuXHRcclxuXHR3YWl0VGltZSA6IDAsXHJcblx0Y3VyckZyYW1lOiAwLFxyXG5cdHNwZWVkIDogMSxcclxuXHRwYXVzZWQgOiBmYWxzZSxcclxuXHRmaW5pc2hlZDogZmFsc2UsXHJcblx0XHJcblx0cGFyZW50IDogbnVsbCxcclxuXHRcclxuXHQvKiogQWR2YW5jZWQgdGhlIGFuaW1hdGlvbiBieSB0aGUgZ2l2ZW4gYW1vdW50IG9mIGRlbHRhIHRpbWUuICovXHJcblx0YWR2YW5jZSA6IGZ1bmN0aW9uKGRlbHRhVGltZSkge1xyXG5cdFx0aWYgKHRoaXMub3B0aW9ucy5zaW5nbGVGcmFtZSkgcmV0dXJuO1xyXG5cdFx0aWYgKHRoaXMucGF1c2VkKSByZXR1cm47XHJcblx0XHRcclxuXHRcdGlmICh0aGlzLndhaXRUaW1lID4gMCkge1xyXG5cdFx0XHR0aGlzLndhaXRUaW1lIC09ICh0aGlzLnNwZWVkICogKGRlbHRhVGltZSAqIENPTkZJRy5zcGVlZC5hbmltYXRpb24pKTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHR2YXIgbG9vcCA9IHRoaXMuZnJhbWVzW3RoaXMuY3VyckZyYW1lXS5sb29wVG87XHJcblx0XHRpZiAobG9vcCAhPT0gdW5kZWZpbmVkKSB0aGlzLmN1cnJGcmFtZSA9IGxvb3A7XHJcblx0XHRlbHNlIHRoaXMuY3VyckZyYW1lKys7XHJcblx0XHRcclxuXHRcdGlmICh0aGlzLmN1cnJGcmFtZSA+PSB0aGlzLmZyYW1lcy5sZW5ndGgpIHtcclxuXHRcdFx0dGhpcy5jdXJyRnJhbWUgPSB0aGlzLmZyYW1lcy5sZW5ndGgtMTtcclxuXHRcdFx0dGhpcy5wYXVzZWQgPSB0cnVlO1xyXG5cdFx0XHR0aGlzLmZpbmlzaGVkID0gdHJ1ZTtcclxuXHRcdFx0Y29uc29sZS53YXJuKFwiQW5pbWF0aW9uIGhhcyBjb21wbGV0ZWQhXCIpO1xyXG5cdFx0XHRpZiAodGhpcy5wYXJlbnQpIHRoaXMucGFyZW50LmVtaXQoXCJhbmltLWVuZFwiLCBudWxsKTsgLy9UT0RPIHByb3ZpZGUgYW5pbSBuYW1lXHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0Ly9uZXcgZnJhbWVcclxuXHRcdFxyXG5cdFx0dGhpcy53YWl0VGltZSA9IHRoaXMuZnJhbWVzW3RoaXMuY3VyckZyYW1lXS5mcmFtZUxlbmd0aCB8fCB0aGlzLm9wdGlvbnMuZnJhbWVMZW5ndGg7XHJcblx0XHRcclxuXHRcdGlmICh0aGlzLmZyYW1lc1t0aGlzLmN1cnJGcmFtZV0ucGF1c2UpIHRoaXMucGF1c2VkID0gdHJ1ZTtcclxuXHRcdFxyXG5cdFx0aWYgKHRoaXMuZnJhbWVzW3RoaXMuY3VyckZyYW1lXS5zZngpIFxyXG5cdFx0XHRTb3VuZE1hbmFnZXIucGxheVNvdW5kKHRoaXMuZnJhbWVzW3RoaXMuY3VyckZyYW1lXS5zZngpO1xyXG5cdH0sXHJcblx0XHJcblx0LyoqIElmIHRoaXMgYW5pbWF0aW9uIGlzIG9uIGEgcGF1c2UgZnJhbWUgKi9cclxuXHRyZXN1bWUgOiBmdW5jdGlvbigpIHtcclxuXHRcdHRoaXMucGF1c2VkID0gZmFsc2U7XHJcblx0fSxcclxuXHRcclxuXHQvKiogUmVzZXQgdGhlIGFuaW1hdGlvbiBwYXJhbWV0ZXJzLiBDYWxsZWQgd2hlbiB0aGlzIGFuaW1hdGlvbiBpcyBubyBsb25nZXIgdXNlZC4gKi9cclxuXHRyZXNldCA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0dGhpcy5wYXVzZWQgPSBmYWxzZTtcclxuXHRcdGlmICh0aGlzLm9wdGlvbnMua2VlcEZyYW1lKSB7XHJcblx0XHRcdC8vIGlmIChzZWxmLmNhblRyYW5zaXRpb24oKSkge1xyXG5cdFx0XHQvLyBcdHZhciBsb29wID0gdGhpcy5mcmFtZXNbdGhpcy5jdXJyRnJhbWVdLmxvb3BUbztcclxuXHRcdFx0Ly8gXHRpZiAobG9vcCAhPT0gdW5kZWZpbmVkKSB0aGlzLmN1cnJGcmFtZSA9IGxvb3A7XHJcblx0XHRcdC8vIFx0ZWxzZSB0aGlzLmN1cnJGcmFtZSsrO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHQvLyBcdHRoaXMud2FpdFRpbWUgPSB0aGlzLmZyYW1lc1t0aGlzLmN1cnJGcmFtZV0uZnJhbWVMZW5ndGggfHwgdGhpcy5vcHRpb25zLmZyYW1lTGVuZ3RoO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHQvLyBcdGlmICh0aGlzLmZyYW1lc1t0aGlzLmN1cnJGcmFtZV0ucGF1c2UpIHRoaXMucGF1c2VkID0gdHJ1ZTtcclxuXHRcdFx0Ly8gfVxyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblx0XHR0aGlzLmZpbmlzaGVkID0gZmFsc2U7XHJcblx0XHR0aGlzLmN1cnJGcmFtZSA9IDA7XHJcblx0XHR0aGlzLndhaXRUaW1lID0gdGhpcy5mcmFtZXNbdGhpcy5jdXJyRnJhbWVdLmZyYW1lTGVuZ3RoIHx8IHRoaXMub3B0aW9ucy5mcmFtZUxlbmd0aDtcclxuXHRcdHRoaXMuc3BlZWQgPSAxO1xyXG5cdH0sXHJcblx0XHJcblx0LyoqIElmIHRoaXMgYW5pbWF0aW9uIGlzIG9uIGEgZnJhbWUgdGhhdCBjYW4gdHJhbnNpdGlvbiB0byBhbm90aGVyIGFuaW1hdGlvbi4gKi9cclxuXHRjYW5UcmFuc2l0aW9uIDogZnVuY3Rpb24oKSB7XHJcblx0XHRyZXR1cm4gdGhpcy5maW5pc2hlZCB8fCB0aGlzLmZyYW1lc1t0aGlzLmN1cnJGcmFtZV0udHJhbnM7XHJcblx0fSxcclxuXHRcclxuXHQvKiogUmV0dXJucyB0aGUgbmFtZSBvZiB0aGUgZnJhbWUgdG8gZGlzcGxheSB0aGlzIGZyYW1lLiAqL1xyXG5cdGdldEZyYW1lVG9EaXNwbGF5IDogZnVuY3Rpb24oZGlyKSB7XHJcblx0XHRpZiAodGhpcy5vcHRpb25zLnNpbmdsZURpcikgZGlyID0gdGhpcy5vcHRpb25zLnNpbmdsZURpcjtcclxuXHRcdHJldHVybiB0aGlzLmZyYW1lc1t0aGlzLmN1cnJGcmFtZV1bZGlyXTtcclxuXHR9LFxyXG59O1xyXG5tb2R1bGUuZXhwb3J0cy5TcHJpdGVBbmltYXRpb24gPSBTcHJpdGVBbmltYXRpb247IiwiLy8gYWN0b3IuanNcclxuLy8gRGVmaW5lcyB0aGUgYWN0b3IgZXZlbnQgdXNlZCB0aHJvdWdob3V0IHRoZSBwYXJrXHJcblxyXG52YXIgRXZlbnQgPSByZXF1aXJlKFwidHBwLWV2ZW50XCIpO1xyXG52YXIgaW5oZXJpdHMgPSByZXF1aXJlKFwiaW5oZXJpdHNcIik7XHJcbnZhciBleHRlbmQgPSByZXF1aXJlKFwiZXh0ZW5kXCIpO1xyXG5cclxudmFyIENoYXJhY3RlclNwcml0ZSA9IHJlcXVpcmUoXCIuLi9tb2RlbC9zcHJpdGVtb2RlbC5qc1wiKS5DaGFyYWN0ZXJTcHJpdGU7XHJcbnZhciBTcHJpdGVHbG93TWF0ZXJpYWwgPSByZXF1aXJlKFwiLi4vbW9kZWwvc3ByaXRlbW9kZWwuanNcIikuU3ByaXRlR2xvd01hdGVyaWFsO1xyXG52YXIgZ2V0U3ByaXRlRm9ybWF0ID0gcmVxdWlyZShcInRwcC1hY3Rvci1hbmltYXRpb25zXCIpLmdldFNwcml0ZUZvcm1hdDtcclxuXHJcbnZhciBHTE9CQUxfU0NBTEVVUCA9IDEuNjU7XHJcbnZhciBFVkVOVF9QTEFORV9OT1JNQUwgPSBuZXcgVEhSRUUuVmVjdG9yMygwLCAxLCAwKTtcclxuLyoqXHJcbiAqIEFuIGFjdG9yIGlzIGFueSBldmVudCByZXByZXNlbnRpbmcgYSBwZXJzb24sIHBva2Vtb24sIG9yIG90aGVyIGVudGl0eSB0aGF0XHJcbiAqIG1heSBtb3ZlIGFyb3VuZCBpbiB0aGUgd29ybGQgb3IgZmFjZSBhIGRpcmVjdGlvbi4gQWN0b3JzIG1heSBoYXZlIGRpZmZlcmVudFxyXG4gKiBiZWhhdmlvcnMsIHNvbWUgY29tbW9uIG9uZXMgcHJlZGVmaW5lZCBpbiB0aGlzIGZpbGUuXHJcbiAqL1xyXG5mdW5jdGlvbiBBY3RvcihiYXNlLCBvcHRzKSB7XHJcblx0RXZlbnQuY2FsbCh0aGlzLCBiYXNlLCBvcHRzKTtcclxuXHRcclxuXHR0aGlzLm9uKFwidGlja1wiLCB0aGlzLl9hY3RvclRpY2spO1xyXG5cdHRoaXMub24oXCJpbnRlcmFjdGVkXCIsIHRoaXMuX2FjdG9ySW50ZXJhY3RGYWNlKTtcclxuXHR0aGlzLm9uKFwiY2FudC1tb3ZlXCIsIHRoaXMuX2FjdG9yQnVtcCk7XHJcblx0dGhpcy5mYWNpbmcgPSBuZXcgVEhSRUUuVmVjdG9yMygwLCAwLCAxKTtcclxuXHRcclxuXHR0aGlzLl9pbml0QmVoYXZpb3JTdGFjaygpO1xyXG59XHJcbmluaGVyaXRzKEFjdG9yLCBFdmVudCk7XHJcbmV4dGVuZChBY3Rvci5wcm90b3R5cGUsIHtcclxuXHRzcHJpdGU6IG51bGwsXHJcblx0c3ByaXRlX2Zvcm1hdDogbnVsbCxcclxuXHRcclxuXHRzaGFkb3cgOiB0cnVlLFxyXG5cdFxyXG5cdC8vLy8vLy8vLy8vLy8vLy8gUHJvcGVydHkgU2V0dGVycyAvLy8vLy8vLy8vLy8vLy8vL1xyXG5cdHNjYWxlOiAxLFxyXG5cdHNjYWxlX3NoYWRvdzogMSxcclxuXHRcclxuXHRzZXRTY2FsZSA6IGZ1bmN0aW9uKHNjYWxlKSB7XHJcblx0XHR0aGlzLnNjYWxlID0gc2NhbGU7XHJcblx0XHRzY2FsZSAqPSBHTE9CQUxfU0NBTEVVUDtcclxuXHRcdHRoaXMuYXZhdGFyX3Nwcml0ZS5zY2FsZS5zZXQoc2NhbGUsIHNjYWxlLCBzY2FsZSk7XHJcblx0XHR0aGlzLl9hdmF0YXJfc2hhZG93Y2FzdGVyLnNjYWxlLnNldChcclxuXHRcdFx0dGhpcy5zY2FsZV9zaGFkb3cgKiBzY2FsZSxcclxuXHRcdFx0dGhpcy5zY2FsZV9zaGFkb3cgKiBzY2FsZSxcclxuXHRcdFx0dGhpcy5zY2FsZV9zaGFkb3cgKiBzY2FsZVxyXG5cdFx0KTtcclxuXHR9LFxyXG5cdFxyXG5cdHNldFNoYWRvd1NjYWxlIDogZnVuY3Rpb24oc2NhbGUpIHtcclxuXHRcdHRoaXMuc2NhbGVfc2hhZG93ID0gc2NhbGU7XHJcblx0XHRzY2FsZSAqPSBHTE9CQUxfU0NBTEVVUDtcclxuXHRcdHRoaXMuX2F2YXRhcl9zaGFkb3djYXN0ZXIuc2NhbGUuc2V0KFxyXG5cdFx0XHR0aGlzLnNjYWxlICogc2NhbGUsXHJcblx0XHRcdHRoaXMuc2NhbGUgKiBzY2FsZSxcclxuXHRcdFx0dGhpcy5zY2FsZSAqIHNjYWxlXHJcblx0XHQpO1xyXG5cdH0sXHJcblx0XHJcblx0Ly8vLy8vLy8vLy8vLy8vLy8vLy8vLy8gQXZhdGFyIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHRhdmF0YXJfbm9kZSA6IG51bGwsXHJcblx0YXZhdGFyX3Nwcml0ZSA6IG51bGwsXHJcblx0YXZhdGFyX2Zvcm1hdCA6IG51bGwsXHJcblx0YXZhdGFyX3RleCA6IG51bGwsXHJcblx0X2F2YXRhcl9zaGFkb3djYXN0ZXIgOiBudWxsLFxyXG5cdFxyXG5cdGdldEF2YXRhciA6IGZ1bmN0aW9uKG1hcCwgZ2MpeyBcclxuXHRcdGlmICh0aGlzLmF2YXRhcl9ub2RlKSByZXR1cm4gdGhpcy5hdmF0YXJfbm9kZTtcclxuXHRcdFxyXG5cdFx0dmFyIG5vZGUgPSB0aGlzLmF2YXRhcl9ub2RlID0gbmV3IFRIUkVFLk9iamVjdDNEKCk7XHJcblx0XHRcclxuXHRcdG5vZGUuYWRkKHRoaXMuX2F2YXRhcl9jcmVhdGVTcHJpdGUobWFwLCBnYykpO1xyXG5cdFx0bm9kZS5hZGQodGhpcy5fYXZhdGFyX2NyZWF0ZVNoYWRvd0Nhc3RlcihtYXAsIGdjKSk7XHJcblx0XHQvLyBpZiAodGhpcy5nbG93X2NvbG9yKSB7XHJcblx0XHQvLyBcdG5vZGUuYWRkKHRoaXMuX2F2YXRhcl9jcmVhdGVHbG93Q2FzdGVyKG1hcCwgZ2MpKTtcclxuXHRcdC8vIH1cclxuXHRcdFxyXG5cdFx0cmV0dXJuIG5vZGU7XHJcblx0XHRcclxuXHR9LFxyXG5cdFxyXG5cdGdldFRhbGtpbmdBbmNob3IgOiBmdW5jdGlvbigpIHtcclxuXHRcdHJldHVybiB0aGlzLl9hdmF0YXJfc2hhZG93Y2FzdGVyLmxvY2FsVG9Xb3JsZChcclxuXHRcdFx0dGhpcy5fYXZhdGFyX3NoYWRvd2Nhc3Rlci5wb3NpdGlvbi5jbG9uZSgpXHJcblx0XHQpO1xyXG5cdH0sXHJcblx0XHJcblx0X2F2YXRhcl9jcmVhdGVHbG93Q2FzdGVyOiBmdW5jdGlvbihtYXAsIGdjKSB7XHJcblx0XHR2YXIgbWF0ID0gbmV3IFNwcml0ZUdsb3dNYXRlcmlhbCh7XHJcblx0XHRcdGNvbG9yOiB0aGlzLmdsb3dfY29sb3IsXHJcblx0XHR9KTtcclxuXHRcdGdjLmNvbGxlY3QobWF0KTtcclxuXHRcdFxyXG5cdFx0dmFyIGdlb20gPSBuZXcgVEhSRUUuU3BoZXJlR2VvbWV0cnkoMC44LCAyMSwgMTApO1xyXG5cdFx0Z2MuY29sbGVjdChnZW9tKTtcclxuXHRcdFxyXG5cdFx0dmFyIG1lc2ggPSBuZXcgVEhSRUUuTWVzaChnZW9tLCBtYXQpO1xyXG5cdFx0bWVzaC5wb3NpdGlvbi5zZXQoMCwgMC41LCAwKTtcclxuXHRcdFxyXG5cdFx0Ly8gc2VsZi5zZXRTY2FsZShzZWxmLnNjYWxlX3NoYWRvdyk7XHJcblx0XHQvLyBtZXNoLnNjYWxlLnNldChcclxuXHRcdC8vIFx0dGhpcy5zY2FsZV9zaGFkb3cgKiB0aGlzLnNjYWxlLCBcclxuXHRcdC8vIFx0dGhpcy5zY2FsZV9zaGFkb3cgKiB0aGlzLnNjYWxlLCBcclxuXHRcdC8vIFx0dGhpcy5zY2FsZV9zaGFkb3cgKiB0aGlzLnNjYWxlXHJcblx0XHQvLyApO1xyXG5cdFx0cmV0dXJuIHRoaXMuX2F2YXRhcl9nbG93Y2FzdGVyID0gbWVzaDtcclxuXHR9LFxyXG5cdFxyXG5cdF9hdmF0YXJfY3JlYXRlU2hhZG93Q2FzdGVyOiBmdW5jdGlvbihtYXAsIGdjKSB7XHJcblx0XHR2YXIgbWF0ID0gbmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKCk7XHJcblx0XHRtYXQudmlzaWJsZSA9IGZhbHNlOyAvL1RoZSBvYmplY3Qgd29uJ3QgcmVuZGVyLCBidXQgdGhlIHNoYWRvdyBzdGlsbCB3aWxsXHJcblx0XHRnYy5jb2xsZWN0KG1hdCk7XHJcblx0XHRcclxuXHRcdHZhciBnZW9tID0gbmV3IFRIUkVFLlNwaGVyZUdlb21ldHJ5KDAuMywgNywgMyk7XHJcblx0XHRnYy5jb2xsZWN0KGdlb20pO1xyXG5cdFx0XHJcblx0XHR2YXIgbWVzaCA9IG5ldyBUSFJFRS5NZXNoKGdlb20sIG1hdCk7XHJcblx0XHRtZXNoLmNhc3RTaGFkb3cgPSB0cnVlO1xyXG5cdFx0bWVzaC5wb3NpdGlvbi5zZXQoMCwgMC41LCAwKTtcclxuXHRcdFxyXG5cdFx0Ly8gc2VsZi5zZXRTY2FsZShzZWxmLnNjYWxlX3NoYWRvdyk7XHJcblx0XHRtZXNoLnNjYWxlLnNldChcclxuXHRcdFx0dGhpcy5zY2FsZV9zaGFkb3cgKiB0aGlzLnNjYWxlLCBcclxuXHRcdFx0dGhpcy5zY2FsZV9zaGFkb3cgKiB0aGlzLnNjYWxlLCBcclxuXHRcdFx0dGhpcy5zY2FsZV9zaGFkb3cgKiB0aGlzLnNjYWxlXHJcblx0XHQpO1xyXG5cdFx0cmV0dXJuIHRoaXMuX2F2YXRhcl9zaGFkb3djYXN0ZXIgPSBtZXNoO1xyXG5cdH0sXHJcblx0XHJcblx0X2F2YXRhcl9jcmVhdGVTcHJpdGUgOiBmdW5jdGlvbihtYXAsIGdjKSB7XHJcblx0XHR2YXIgc2VsZiA9IHRoaXM7XHJcblx0XHQvLyB2YXIgaW1nID0gbmV3IEltYWdlKCk7XHJcblx0XHR2YXIgdGV4dHVyZSA9IHNlbGYuYXZhdGFyX3RleCA9IG5ldyBUSFJFRS5UZXh0dXJlKERFRl9TUFJJVEVfSU1HKTtcclxuXHRcdGdjLmNvbGxlY3QodGV4dHVyZSk7XHJcblx0XHRcclxuXHRcdC8vIE5vdGU6IG5vdCB1c2luZyBcInRoaXMuZ2V0U3ByaXRlRm9ybWF0XCIsIGJlY2F1c2UgdGhlIGRlZmFpbHQgc3ByaXRlXHJcblx0XHQvLyBmb3JtYXQgc2hvdWxkIG5vdCBiZSBvdmVyaWRkZW4uXHJcblx0XHR2YXIgc3Bmb3JtYXQgPSBnZXRTcHJpdGVGb3JtYXQoREVGX1NQUklURV9GT1JNQVQpO1xyXG5cdFx0XHJcblx0XHR0aGlzLl9fb25Mb2FkU3ByaXRlKERFRl9TUFJJVEVfSU1HLCBzcGZvcm1hdCwgdGV4dHVyZSk7XHJcblx0XHQvLyBpbWcuc3JjID0gREVGX1NQUklURTtcclxuXHRcdFxyXG5cdFx0dGV4dHVyZS5tYWdGaWx0ZXIgPSBUSFJFRS5OZWFyZXN0RmlsdGVyO1xyXG5cdFx0dGV4dHVyZS5taW5GaWx0ZXIgPSBUSFJFRS5OZWFyZXN0RmlsdGVyO1xyXG5cdFx0dGV4dHVyZS5yZXBlYXQgPSBuZXcgVEhSRUUuVmVjdG9yMigwLjI1LCAwLjI1KTtcclxuXHRcdHRleHR1cmUub2Zmc2V0ID0gbmV3IFRIUkVFLlZlY3RvcjIoMCwgMCk7XHJcblx0XHR0ZXh0dXJlLndyYXBTID0gVEhSRUUuTWlycm9yZWRSZXBlYXRXcmFwcGluZztcclxuXHRcdHRleHR1cmUud3JhcFQgPSBUSFJFRS5NaXJyb3JlZFJlcGVhdFdyYXBwaW5nO1xyXG5cdFx0dGV4dHVyZS5nZW5lcmF0ZU1pcG1hcHMgPSBmYWxzZTsgLy9NaXBtYXBzIGdlbmVyYXRlIHVuZGVzaXJhYmxlIHRyYW5zcGFyZW5jeSBhcnRpZmFjdHNcclxuXHRcdC8vVE9ETyBNaXJyb3JlZFJlcGVhdFdyYXBwaW5nLCBhbmQganVzdCB1c2UgYSBuZWdhdGl2ZSB4IHV2IHZhbHVlLCB0byBmbGlwIGEgc3ByaXRlXHJcblx0XHRcclxuXHRcdHNlbGYuYXZhdGFyX2Zvcm1hdCA9IHNwZm9ybWF0O1xyXG5cdFx0XHJcblx0XHQvLyB2YXIgbWF0IC8qPSBzZWxmLmF2YXRhcl9tYXQqLyA9IG5ldyBUSFJFRS5TcHJpdGVNYXRlcmlhbCh7XHJcblx0XHQvLyBcdG1hcDogdGV4dHVyZSxcclxuXHRcdC8vIFx0Y29sb3I6IDB4RkZGRkZGLFxyXG5cdFx0Ly8gXHR0cmFuc3BhcmVudDogdHJ1ZSxcclxuXHRcdC8vIH0pO1xyXG5cdFx0XHJcblx0XHRjdXJyZW50TWFwLm1hcmtMb2FkaW5nKFwiQUNUT1JfXCIrc2VsZi5pZCk7XHJcblx0XHR0aGlzLl9hdmF0YXJfbG9hZFNwcml0ZShtYXAsIHRleHR1cmUpO1xyXG5cdFx0XHJcblx0XHQvL3ZhciBzcHJpdGUgPSBzZWxmLmF2YXRhcl9zcHJpdGUgPSBuZXcgVEhSRUUuU3ByaXRlKG1hdCk7XHJcblx0XHR2YXIgc3ByaXRlID0gc2VsZi5hdmF0YXJfc3ByaXRlID0gbmV3IENoYXJhY3RlclNwcml0ZSh7XHJcblx0XHRcdG1hcDogdGV4dHVyZSxcclxuXHRcdFx0Y29sb3I6IDB4RkZGRkZGLFxyXG5cdFx0XHRvZmZzZXQ6IG5ldyBUSFJFRS5WZWN0b3IzKDAsIDAuMywgMC4yMiksXHJcblx0XHRcdGdjOiBnYyxcclxuXHRcdH0pO1xyXG5cdFx0Ly9zZWxmLnNldFNjYWxlKHNlbGYuc2NhbGUpO1xyXG5cdFx0c3ByaXRlLnNjYWxlLnNldChcclxuXHRcdFx0c2VsZi5zY2FsZSAqIEdMT0JBTF9TQ0FMRVVQLCBcclxuXHRcdFx0c2VsZi5zY2FsZSAqIEdMT0JBTF9TQ0FMRVVQLCBcclxuXHRcdFx0c2VsZi5zY2FsZSAqIEdMT0JBTF9TQ0FMRVVQXHJcblx0XHQpO1xyXG5cdFx0XHJcblx0XHRyZXR1cm4gc3ByaXRlO1xyXG5cdH0sXHJcblx0XHJcblx0X2F2YXRhcl9sb2FkU3ByaXRlIDogZnVuY3Rpb24obWFwLCB0ZXh0dXJlKSB7XHJcblx0XHR2YXIgc2VsZiA9IHRoaXM7XHJcblx0XHRtYXAubG9hZFNwcml0ZShzZWxmLmlkLCBzZWxmLnNwcml0ZSwgZnVuY3Rpb24oZXJyLCB1cmwpe1xyXG5cdFx0XHRpZiAoZXJyKSB7XHJcblx0XHRcdFx0Y29uc29sZS5lcnJvcihcIkVSUk9SIExPQURJTkcgU1BSSVRFOiBcIiwgZXJyKTtcclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHRcdFx0XHJcblx0XHRcdHZhciBpbWcgPSBuZXcgSW1hZ2UoKTtcclxuXHRcdFx0dmFyIGZvcm1hdCA9IHNlbGYuc3ByaXRlX2Zvcm1hdDtcclxuXHRcdFx0aWYgKCQuaXNQbGFpbk9iamVjdChmb3JtYXQpKSB7XHJcblx0XHRcdFx0Zm9ybWF0ID0gc2VsZi5zcHJpdGVfZm9ybWF0W3NlbGYuc3ByaXRlXTtcclxuXHRcdFx0fVxyXG5cdFx0XHRpZiAodHlwZW9mIGZvcm1hdCA9PSBcImZ1bmN0aW9uXCIpIHtcclxuXHRcdFx0XHRmb3JtYXQgPSBzZWxmLnNwcml0ZV9mb3JtYXQoc2VsZi5zcHJpdGUpO1xyXG5cdFx0XHR9XHJcblx0XHRcdGlmICh0eXBlb2YgZm9ybWF0ICE9IFwic3RyaW5nXCIpIHtcclxuXHRcdFx0XHRjb25zb2xlLmVycm9yKFwiSU5WQUxJRCBTUFJJVEUgRk9STUFUISAnc3ByaXRlX2Zvcm1hdCcgbXVzdCBiZSBhIHN0cmluZywgYW4gb2JqZWN0LCBvciBhIFwiK1xyXG5cdFx0XHRcdFx0XCJmdW5jdGlvbiB0aGF0IHJldHVybnMgYSBzdHJpbmchIFRvIHByb3ZpZGUgYSBjdXN0b20gZm9ybWF0LCBvdmVycmlkZSBcIitcclxuXHRcdFx0XHRcdFwiZ2V0U3ByaXRlRm9ybWF0IG9uIHRoZSBhY3RvciBpbnN0YW5jZSFcIik7XHJcblx0XHRcdFx0Zm9ybWF0ID0gREVGX1NQUklURV9GT1JNQVQ7XHJcblx0XHRcdH1cclxuXHRcdFx0XHJcblx0XHRcdHNlbGYuX19vbkxvYWRTcHJpdGUoaW1nLCBzZWxmLmdldFNwcml0ZUZvcm1hdChmb3JtYXQpLCB0ZXh0dXJlKTtcclxuXHRcdFx0aW1nLnNyYyA9IHVybDtcclxuXHRcdH0pO1xyXG5cdH0sXHJcblx0XHJcblx0X19vbkxvYWRTcHJpdGUgOiBmdW5jdGlvbihpbWcsIGZvcm1hdCwgdGV4dHVyZSkge1xyXG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xyXG5cdFx0dmFyIGYgPSBmdW5jdGlvbigpIHtcclxuXHRcdFx0dGV4dHVyZS5pbWFnZSA9IGltZztcclxuXHRcdFx0XHJcblx0XHRcdHNlbGYuYXZhdGFyX2Zvcm1hdCA9IGZvcm1hdDtcclxuXHRcdFx0dGV4dHVyZS5yZXBlYXQuc2V0KFxyXG5cdFx0XHRcdHNlbGYuYXZhdGFyX2Zvcm1hdC53aWR0aCAvIGltZy5uYXR1cmFsV2lkdGgsIFxyXG5cdFx0XHRcdHNlbGYuYXZhdGFyX2Zvcm1hdC5oZWlnaHQgLyBpbWcubmF0dXJhbEhlaWdodCk7XHJcblxyXG5cdFx0XHR0ZXh0dXJlLm5lZWRzVXBkYXRlID0gdHJ1ZTtcclxuXHRcdFx0XHJcblx0XHRcdC8vIHNlbGYuc2hvd0FuaW1hdGlvbkZyYW1lKFwiZDBcIik7XHJcblx0XHRcdHNlbGYucGxheUFuaW1hdGlvbihcInN0YW5kXCIpO1xyXG5cdFx0XHRjdXJyZW50TWFwLm1hcmtMb2FkRmluaXNoZWQoXCJBQ1RPUl9cIitzZWxmLmlkKTtcclxuXHRcdFx0XHJcblx0XHRcdGltZy5yZW1vdmVFdmVudExpc3RlbmVyKFwibG9hZFwiLCBmKTtcclxuXHRcdFx0aW1nLnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJsb2FkXCIsIGUpO1xyXG5cdFx0fVxyXG5cdFx0dmFyIGUgPSBmdW5jdGlvbigpIHtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihcIkVycm9yIHdoaWxlIGxvYWRpbmcgdGV4dHVyZSFcIiwgaW1nLnNyYyk7XHJcblx0XHRcdHRleHR1cmUubmVlZHNVcGRhdGUgPSB0cnVlOyAvL3VwZGF0ZSB0aGUgbWlzc2luZyB0ZXh0dXJlIHByZS1sb2FkZWRcclxuXHRcdFx0Y3VycmVudE1hcC5tYXJrTG9hZEZpbmlzaGVkKFwiQUNUT1JfXCIrc2VsZi5pZCk7XHJcblx0XHRcdFxyXG5cdFx0XHRpbWcucmVtb3ZlRXZlbnRMaXN0ZW5lcihcImxvYWRcIiwgZik7XHJcblx0XHRcdGltZy5yZW1vdmVFdmVudExpc3RlbmVyKFwibG9hZFwiLCBlKTtcclxuXHRcdH1cclxuXHRcdGltZy5vbihcImxvYWRcIiwgZik7XHJcblx0XHRpbWcub24oXCJlcnJvclwiLCBlKTtcclxuXHR9LFxyXG5cdFxyXG5cdC8vIE92ZXJyaWRlIHRoaXMgZnVuY3Rpb24gdG8gcHJvdmlkZSBhIGN1c3RvbSBzcHJpdGUgZm9ybWF0XHJcblx0Z2V0U3ByaXRlRm9ybWF0IDogZnVuY3Rpb24oZm9ybWF0KSB7XHJcblx0XHRyZXR1cm4gZ2V0U3ByaXRlRm9ybWF0KGZvcm1hdCk7XHJcblx0fSxcclxuXHRcclxuXHQvLy8vLy8vLy8vLy8vLy8vLy8vIEFuaW1hdGlvbiAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblx0X2FuaW1hdGlvblN0YXRlIDogbnVsbCxcclxuXHRmYWNpbmcgOiBudWxsLFxyXG5cdGFuaW1hdGlvblNwZWVkOiAxLCAvL2RlZmF1bHQgYW5pbWF0aW9uIHNwZWVkXHJcblx0XHJcblx0X2luaXRBbmltYXRpb25TdGF0ZSA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0aWYgKCF0aGlzLl9hbmltYXRpb25TdGF0ZSlcclxuXHRcdFx0dGhpcy5fYW5pbWF0aW9uU3RhdGUgPSB7XHJcblx0XHRcdFx0Y3VyckFuaW0gOiBudWxsLCAvLyBBbmltYXRpb24gb2JqZWN0XHJcblx0XHRcdFx0Y3VyckZyYW1lIDogbnVsbCwgLy8gQ3VycmVudGx5IGRpc3BsYXllZCBzcHJpdGUgZnJhbWUgbmFtZVxyXG5cdFx0XHRcdG5leHRBbmltIDogbnVsbCwgLy8gQW5pbWF0aW9uIG9iamVjdCBpbiBxdWV1ZVxyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdHN0b3BOZXh0VHJhbnNpdGlvbjogZmFsc2UsIC8vU3RvcCBhdCB0aGUgbmV4dCB0cmFuc2l0aW9uIGZyYW1lLCB0byBzaG9ydC1zdG9wIHRoZSBcIkJ1bXBcIiBhbmltYXRpb25cclxuXHRcdFx0fTtcclxuXHRcdHJldHVybiB0aGlzLl9hbmltYXRpb25TdGF0ZTtcclxuXHR9LFxyXG5cdFxyXG5cdGdldERpcmVjdGlvbkZhY2luZyA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0aWYgKCFjdXJyZW50TWFwIHx8ICFjdXJyZW50TWFwLmNhbWVyYSkgcmV0dXJuIFwiZFwiO1xyXG5cdFx0XHJcblx0XHR2YXIgZGlydmVjdG9yID0gdGhpcy5mYWNpbmcuY2xvbmUoKTtcclxuXHRcdGRpcnZlY3Rvci5hcHBseVF1YXRlcm5pb24oIGN1cnJlbnRNYXAuY2FtZXJhLnF1YXRlcm5pb24gKTtcclxuXHRcdGRpcnZlY3Rvci5wcm9qZWN0T25QbGFuZShFVkVOVF9QTEFORV9OT1JNQUwpLm5vcm1hbGl6ZSgpO1xyXG5cdFx0XHJcblx0XHR2YXIgeCA9IGRpcnZlY3Rvci54LCB5ID0gZGlydmVjdG9yLno7XHJcblx0XHQvLyBjb25zb2xlLmxvZyhcIkRJUkZBQ0lORzpcIiwgeCwgeSk7XHJcblx0XHRpZiAoTWF0aC5hYnMoeCkgPiBNYXRoLmFicyh5KSkgeyAvL0RpcmVjdGlvbiB2ZWN0b3IgaXMgcG9pbnRpbmcgYWxvbmcgeCBheGlzXHJcblx0XHRcdGlmICh4ID4gMCkgcmV0dXJuIFwibFwiO1xyXG5cdFx0XHRlbHNlIHJldHVybiBcInJcIjtcclxuXHRcdH0gZWxzZSB7IC8vRGlyZWN0aW9uIHZlY3RvciBpcyBwb2ludGluZyBhbG9uZyB5IGF4aXNcclxuXHRcdFx0aWYgKHkgPiAwKSByZXR1cm4gXCJkXCI7XHJcblx0XHRcdGVsc2UgcmV0dXJuIFwidVwiO1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIFwiZFwiO1xyXG5cdH0sXHJcblx0XHJcblx0c2hvd0FuaW1hdGlvbkZyYW1lIDogZnVuY3Rpb24oZnJhbWUpIHtcclxuXHRcdHZhciBzdGF0ZSA9IHRoaXMuX2luaXRBbmltYXRpb25TdGF0ZSgpO1xyXG5cdFx0XHJcblx0XHR2YXIgZGVmID0gdGhpcy5hdmF0YXJfZm9ybWF0LmZyYW1lc1tmcmFtZV07XHJcblx0XHRpZiAoIWRlZikge1xyXG5cdFx0XHRjb25zb2xlLndhcm4oXCJFUlJPUiBcIiwgdGhpcy5pZCwgXCI6IEFuaW1hdGlvbiBmcmFtZSBkb2Vzbid0IGV4aXN0OlwiLCBmcmFtZSk7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHRcdHN0YXRlLmZyYW1lTmFtZSA9IGZyYW1lO1xyXG5cdFx0XHJcblx0XHR2YXIgZmxpcCA9IGZhbHNlO1xyXG5cdFx0aWYgKHR5cGVvZiBkZWYgPT0gXCJzdHJpbmdcIikgeyAvL3JlZGlyZWN0XHJcblx0XHRcdGRlZiA9IHRoaXMuYXZhdGFyX2Zvcm1hdC5mcmFtZXNbZGVmXTtcclxuXHRcdFx0ZmxpcCA9IHRydWU7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdHZhciB1ID0gZGVmWzBdICogdGhpcy5hdmF0YXJfdGV4LnJlcGVhdC54O1xyXG5cdFx0dmFyIHYgPSAxIC0gKChkZWZbMV0rMSkgKiB0aGlzLmF2YXRhcl90ZXgucmVwZWF0LnkpO1xyXG5cdFx0Ly9Gb3Igc29tZSByZWFzb24sIG9mZnNldHMgYXJlIGZyb20gdGhlIEJPVFRPTSBsZWZ0PyFcclxuXHRcdFxyXG5cdFx0aWYgKGZsaXAgJiYgdGhpcy5hdmF0YXJfZm9ybWF0LmZsaXApIHtcclxuXHRcdFx0dSA9IDAgLSAoZGVmWzBdLTEpICogdGhpcy5hdmF0YXJfdGV4LnJlcGVhdC54OyAvL1RPRE8gdGVzdFxyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHR0aGlzLmF2YXRhcl90ZXgub2Zmc2V0LnNldCh1LCB2KTsgXHJcblx0XHR0aGlzLmF2YXRhcl90ZXgubmVlZHNVcGRhdGUgPSB0cnVlO1xyXG5cdH0sXHJcblx0XHJcblx0cGxheUFuaW1hdGlvbiA6IGZ1bmN0aW9uKGFuaW1OYW1lLCBvcHRzKSB7XHJcblx0XHR2YXIgc3RhdGUgPSB0aGlzLl9pbml0QW5pbWF0aW9uU3RhdGUoKTtcclxuXHRcdGlmICghb3B0cykgb3B0cyA9IHt9O1xyXG5cdFx0XHJcblx0XHR2YXIgYW5pbSA9IHRoaXMuYXZhdGFyX2Zvcm1hdC5hbmltc1thbmltTmFtZV07XHJcblx0XHRpZiAoIWFuaW0pIHtcclxuXHRcdFx0Y29uc29sZS53YXJuKFwiRVJST1JcIiwgdGhpcy5pZCwgXCI6IEFuaW1hdGlvbiBuYW1lIGRvZXNuJ3QgZXhpc3Q6XCIsIGFuaW1OYW1lKTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cdFx0YW5pbS5wYXJlbnQgPSB0aGlzO1xyXG5cdFx0c3RhdGUubmV4dEFuaW0gPSBhbmltO1xyXG5cdFx0YW5pbS5zcGVlZCA9IChvcHRzLnNwZWVkID09IHVuZGVmaW5lZCk/IHRoaXMuYW5pbWF0aW9uU3BlZWQgOiBvcHRzLnNwZWVkO1xyXG5cdFx0c3RhdGUuc3RvcE5leHRUcmFuc2l0aW9uID0gb3B0cy5zdG9wTmV4dFRyYW5zaXRpb24gfHwgZmFsc2U7XHJcblx0fSxcclxuXHRcclxuXHRzdG9wQW5pbWF0aW9uIDogZnVuY3Rpb24oKSB7XHJcblx0XHR2YXIgc3RhdGUgPSB0aGlzLl9pbml0QW5pbWF0aW9uU3RhdGUoKTtcclxuXHRcdFxyXG5cdFx0Ly8gc3RhdGUucnVubmluZyA9IGZhbHNlO1xyXG5cdFx0Ly8gc3RhdGUucXVldWUgPSBudWxsO1xyXG5cdFx0Ly8gc3RhdGUuc3RvcEZyYW1lID0gbnVsbDtcclxuXHRcdHRoaXMuZW1pdChcImFuaW0tZW5kXCIsIHN0YXRlLmFuaW1OYW1lKTtcclxuXHR9LFxyXG5cdFxyXG5cdF90aWNrX2RvQW5pbWF0aW9uOiBmdW5jdGlvbihkZWx0YSkge1xyXG5cdFx0dmFyIHN0YXRlID0gdGhpcy5fYW5pbWF0aW9uU3RhdGU7XHJcblx0XHR2YXIgQ0EgPSBzdGF0ZS5jdXJyQW5pbTtcclxuXHRcdGlmICghQ0EpIENBID0gc3RhdGUuY3VyckFuaW0gPSBzdGF0ZS5uZXh0QW5pbTtcclxuXHRcdGlmICghQ0EpIHJldHVybjtcclxuXHRcdFxyXG5cdFx0Q0EuYWR2YW5jZShkZWx0YSk7XHJcblx0XHRcclxuXHRcdGlmIChzdGF0ZS5uZXh0QW5pbSAmJiBDQS5jYW5UcmFuc2l0aW9uKCkpIHtcclxuXHRcdFx0Ly9Td2l0Y2ggYW5pbWF0aW9uc1xyXG5cdFx0XHRDQS5yZXNldCgpO1xyXG5cdFx0XHRDQSA9IHN0YXRlLmN1cnJBbmltID0gc3RhdGUubmV4dEFuaW07XHJcblx0XHRcdHN0YXRlLm5leHRBbmltID0gbnVsbDtcclxuXHRcdFx0XHJcblx0XHRcdC8vIHRoaXMuZW1pdChcImFuaW0tZW5kXCIsIG51bGwpOyAvL1RPRE8gcHJvdmlkZSBhbmltIG5hbWVcclxuXHRcdFx0XHJcblx0XHRcdGlmIChzdGF0ZS5zdG9wTmV4dFRyYW5zaXRpb24pIHtcclxuXHRcdFx0XHR0aGlzLnBsYXlBbmltYXRpb24oXCJzdGFuZFwiKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHR2YXIgZGlyID0gdGhpcy5nZXREaXJlY3Rpb25GYWNpbmcoKTtcclxuXHRcdHZhciBmcmFtZSA9IENBLmdldEZyYW1lVG9EaXNwbGF5KGRpcik7XHJcblx0XHRpZiAoZnJhbWUgIT0gc3RhdGUuY3VyckZyYW1lKSB7XHJcblx0XHRcdHRoaXMuc2hvd0FuaW1hdGlvbkZyYW1lKGZyYW1lKTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdH0sXHJcblx0XHJcblx0Ly8vLy8vLy8vLy8vLy8vLy8vLyBNb3ZlbWVudCBhbmQgUGF0aGluZyAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblx0X3BhdGhpbmdTdGF0ZSA6IG51bGwsXHJcblx0XHJcblx0X2luaXRQYXRoaW5nU3RhdGUgOiBmdW5jdGlvbigpIHtcclxuXHRcdGlmICghdGhpcy5fcGF0aGluZ1N0YXRlKVxyXG5cdFx0XHR0aGlzLl9wYXRoaW5nU3RhdGUgPSB7XHJcblx0XHRcdFx0cXVldWU6IFtdLFxyXG5cdFx0XHRcdG1vdmluZzogZmFsc2UsXHJcblx0XHRcdFx0c3BlZWQ6IDEsXHJcblx0XHRcdFx0ZGVsdGE6IDAsIC8vdGhlIGRlbHRhIGZyb20gc3JjIHRvIGRlc3RcclxuXHRcdFx0XHRqdW1waW5nIDogZmFsc2UsXHJcblx0XHRcdFx0Ly8gZGlyOiBcImRcIixcclxuXHRcdFx0XHRcclxuXHRcdFx0XHRkZXN0TG9jQzogbmV3IFRIUkVFLlZlY3RvcjMoKS5zZXQodGhpcy5sb2NhdGlvbiksIC8vY29sbGlzaW9uIG1hcCBsb2NhdGlvblxyXG5cdFx0XHRcdGRlc3RMb2MzOiBuZXcgVEhSRUUuVmVjdG9yMygpLCAvL3dvcmxkIHNwYWNlIGxvY2F0aW9uXHJcblx0XHRcdFx0c3JjTG9jQzogbmV3IFRIUkVFLlZlY3RvcjMoKS5zZXQodGhpcy5sb2NhdGlvbiksXHJcblx0XHRcdFx0c3JjTG9jMzogbmV3IFRIUkVFLlZlY3RvcjMoKSxcclxuXHRcdFx0XHRtaWRwb2ludE9mZnNldDogbmV3IFRIUkVFLlZlY3RvcjMoKSxcclxuXHRcdFx0fTtcclxuXHRcdHJldHVybiB0aGlzLl9wYXRoaW5nU3RhdGU7XHJcblx0fSxcclxuXHRcclxuXHRwYXRoVG8gOiBmdW5jdGlvbih4LCB5KSB7XHJcblx0XHR2YXIgc3RhdGUgPSB0aGlzLl9pbml0UGF0aGluZ1N0YXRlKCk7XHJcblx0XHRcclxuXHRcdGNvbnNvbGUuZXJyb3IodGhpcy5pZCwgXCI6IFBhdGhpbmcgaGFzIG5vdCBiZWVuIGltcGxlbWVudGVkIHlldCFcIik7XHJcblx0fSxcclxuXHRcclxuXHRjbGVhclBhdGhpbmcgOiBmdW5jdGlvbigpIHtcclxuXHRcdHZhciBzdGF0ZSA9IHRoaXMuX2luaXRQYXRoaW5nU3RhdGUoKTtcclxuXHRcdHN0YXRlLnF1ZXVlLmxlbmd0aCA9IDA7XHJcblx0fSxcclxuXHRcclxuXHRtb3ZlRGlyIDogZnVuY3Rpb24oZGlyKSB7XHJcblx0XHR2YXIgeCA9IHRoaXMubG9jYXRpb24ueDtcclxuXHRcdHZhciB5ID0gdGhpcy5sb2NhdGlvbi55O1xyXG5cdFx0dmFyIHogPSB0aGlzLmxvY2F0aW9uLno7XHJcblx0XHRzd2l0Y2ggKGRpcikge1xyXG5cdFx0XHRjYXNlIFwiZFwiOiBjYXNlIFwiZG93blwiOlx0eSArPSAxOyBicmVhaztcclxuXHRcdFx0Y2FzZSBcInVcIjogY2FzZSBcInVwXCI6XHR5IC09IDE7IGJyZWFrO1xyXG5cdFx0XHRjYXNlIFwibFwiOiBjYXNlIFwibGVmdFwiOlx0eCAtPSAxOyBicmVhaztcclxuXHRcdFx0Y2FzZSBcInJcIjogY2FzZSBcInJpZ2h0XCI6XHR4ICs9IDE7IGJyZWFrO1xyXG5cdFx0fVxyXG5cdFx0dGhpcy5tb3ZlVG8oeCwgeSwgeik7XHJcblx0fSxcclxuXHRcclxuXHRmYWNlRGlyIDogZnVuY3Rpb24oeCwgeSkge1xyXG5cdFx0dGhpcy5mYWNpbmcuc2V0KC14LCAwLCB5KTtcclxuXHR9LFxyXG5cdFxyXG5cdG1vdmVUbyA6IGZ1bmN0aW9uKHgsIHksIGxheWVyLCBvcHRzKSB7IC8vYnlwYXNzIFdhbGttYXNrIENoZWNrXHJcblx0XHRpZiAoJC5pc1BsYWluT2JqZWN0KGxheWVyKSAmJiBvcHRzID09PSB1bmRlZmluZWQpIHtcclxuXHRcdFx0b3B0cyA9IGxheWVyOyBsYXllciA9IHVuZGVmaW5lZDtcclxuXHRcdH1cclxuXHRcdGlmIChvcHRzID09PSB1bmRlZmluZWQpIG9wdHMgPSB7fTtcclxuXHRcdFxyXG5cdFx0dmFyIHN0YXRlID0gdGhpcy5faW5pdFBhdGhpbmdTdGF0ZSgpO1xyXG5cdFx0dmFyIHNyYyA9IHRoaXMubG9jYXRpb247XHJcblx0XHRsYXllciA9IChsYXllciA9PSB1bmRlZmluZWQpPyB0aGlzLmxvY2F0aW9uLnogOiBsYXllcjtcclxuXHRcdFxyXG5cdFx0dGhpcy5mYWNpbmcuc2V0KHNyYy54LXgsIDAsIHktc3JjLnkpO1xyXG5cdFx0XHJcblx0XHR2YXIgd2Fsa21hc2sgPSBjdXJyZW50TWFwLmNhbldhbGtCZXR3ZWVuKHNyYy54LCBzcmMueSwgeCwgeSk7XHJcblx0XHRpZiAob3B0cy5ieXBhc3MgIT09IHVuZGVmaW5lZCkgd2Fsa21hc2sgPSBvcHRzLmJ5cGFzcztcclxuXHRcdGlmICghd2Fsa21hc2spIHtcclxuXHRcdFx0dGhpcy5lbWl0KFwiY2FudC1tb3ZlXCIsIHNyYy54LCBzcmMueSwgeCwgeSk7XHJcblx0XHRcdGN1cnJlbnRNYXAuZGlzcGF0Y2goeCwgeSwgXCJidW1wZWRcIiwgdGhpcy5mYWNpbmcpO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblx0XHRpZiAoKHdhbGttYXNrICYgMHgxMCkgPT0gMHgxMCkgeyAvLyBDaGVjayBOb05QQyB0aWxlc1xyXG5cdFx0XHRpZiAodGhpcy5pc05QQygpKSB7XHJcblx0XHRcdFx0dGhpcy5lbWl0KFwiY2FudC1tb3ZlXCIsIHNyYy54LCBzcmMueSwgeCwgeSk7XHJcblx0XHRcdFx0Y3VycmVudE1hcC5kaXNwYXRjaCh4LCB5LCBcImJ1bXBlZFwiLCB0aGlzLmZhY2luZyk7XHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHRpZiAoKHdhbGttYXNrICYgMHg4KSA9PSAweDgpIHtcclxuXHRcdFx0Ly8gVHJhbnNpdGlvbiBub3cgdG8gYW5vdGhlciBsYXllclxyXG5cdFx0XHR2YXIgdCA9IGN1cnJlbnRNYXAuZ2V0TGF5ZXJUcmFuc2l0aW9uKHgsIHksIHRoaXMubG9jYXRpb24ueik7XHJcblx0XHRcdGNvbnNvbGUubG9nKFwiTGF5ZXIgVHJhbnNpdGlvbjogXCIsIHQpO1xyXG5cdFx0XHR4ID0gdC54OyB5ID0gdC55OyBsYXllciA9IHQubGF5ZXI7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdFxyXG5cdFx0dmFyIGFuaW1vcHRzID0ge307XHJcblx0XHRzdGF0ZS5taWRwb2ludE9mZnNldC5zZXQoMCwgMCwgMCk7XHJcblx0XHRzdGF0ZS5zcmNMb2NDLnNldChzcmMpO1xyXG5cdFx0c3RhdGUuc3JjTG9jMy5zZXQoY3VycmVudE1hcC5nZXQzRFRpbGVMb2NhdGlvbihzcmMpKTtcclxuXHRcdHN0YXRlLmRlc3RMb2NDLnNldCh4LCB5LCBsYXllcik7XHJcblx0XHRzdGF0ZS5kZXN0TG9jMy5zZXQoY3VycmVudE1hcC5nZXQzRFRpbGVMb2NhdGlvbih4LCB5LCBsYXllcikpO1xyXG5cdFx0c3RhdGUuZGVsdGEgPSAwO1xyXG5cdFx0c3RhdGUuc3BlZWQgPSBvcHRzLnNwZWVkIHx8IDE7XHJcblx0XHRzdGF0ZS5tb3ZpbmcgPSB0cnVlO1xyXG5cdFx0YW5pbW9wdHMuc3BlZWQgPSBvcHRzLnNwZWVkIHx8IDE7XHJcblx0XHRcclxuXHRcdGlmICgod2Fsa21hc2sgJiAweDIpID09PSAweDIpIHtcclxuXHRcdFx0c3RhdGUubWlkcG9pbnRPZmZzZXQuc2V0WSgwLjYpO1xyXG5cdFx0XHRzdGF0ZS5qdW1waW5nID0gdHJ1ZTtcclxuXHRcdFx0c3RhdGUuc3BlZWQgPSAxOyAvL2VuZm9yY2UgYSBqdW1waW5nIHNwZWVkIG9mIDFcclxuXHRcdFx0U291bmRNYW5hZ2VyLnBsYXlTb3VuZChcIndhbGtfanVtcFwiKTtcclxuXHRcdFx0YW5pbW9wdHMuc3BlZWQgPSAxLjU7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdHRoaXMucGxheUFuaW1hdGlvbihcIndhbGtcIiwgYW5pbW9wdHMpO1xyXG5cdFx0dGhpcy5lbWl0KFwibW92aW5nXCIsIHN0YXRlLnNyY0xvY0MueCwgc3RhdGUuc3JjTG9jQy55LCBzdGF0ZS5kZXN0TG9jQy54LCBzdGF0ZS5kZXN0TG9jQy55KTtcclxuXHR9LFxyXG5cdFxyXG5cdF90aWNrX2RvTW92ZW1lbnQgOiBmdW5jdGlvbihkZWx0YSkge1xyXG5cdFx0dmFyIHN0YXRlID0gdGhpcy5faW5pdFBhdGhpbmdTdGF0ZSgpO1xyXG5cdFx0XHJcblx0XHRzdGF0ZS5kZWx0YSArPSBzdGF0ZS5zcGVlZCAqIChkZWx0YSAqIENPTkZJRy5zcGVlZC5wYXRoaW5nKTtcclxuXHRcdHZhciBhbHBoYSA9IE1hdGguY2xhbXAoc3RhdGUuZGVsdGEpO1xyXG5cdFx0dmFyIGJldGEgPSBNYXRoLnNpbihhbHBoYSAqIE1hdGguUEkpO1xyXG5cdFx0dGhpcy5hdmF0YXJfbm9kZS5wb3NpdGlvbi5zZXQoIFxyXG5cdFx0XHQvL0xlcnAgYmV0d2VlbiBzcmMgYW5kIGRlc3QgKGJ1aWx0IGluIGxlcnAoKSBpcyBkZXN0cnVjdGl2ZSwgYW5kIHNlZW1zIGJhZGx5IGRvbmUpXHJcblx0XHRcdHN0YXRlLnNyY0xvYzMueCArICgoc3RhdGUuZGVzdExvYzMueCAtIHN0YXRlLnNyY0xvYzMueCkgKiBhbHBoYSkgKyAoc3RhdGUubWlkcG9pbnRPZmZzZXQueCAqIGJldGEpLFxyXG5cdFx0XHRzdGF0ZS5zcmNMb2MzLnkgKyAoKHN0YXRlLmRlc3RMb2MzLnkgLSBzdGF0ZS5zcmNMb2MzLnkpICogYWxwaGEpICsgKHN0YXRlLm1pZHBvaW50T2Zmc2V0LnkgKiBiZXRhKSxcclxuXHRcdFx0c3RhdGUuc3JjTG9jMy56ICsgKChzdGF0ZS5kZXN0TG9jMy56IC0gc3RhdGUuc3JjTG9jMy56KSAqIGFscGhhKSArIChzdGF0ZS5taWRwb2ludE9mZnNldC56ICogYmV0YSlcclxuXHRcdCk7XHJcblx0XHRcclxuXHRcdGlmIChzdGF0ZS5kZWx0YSA+IDEpIHtcclxuXHRcdFx0dGhpcy5lbWl0KFwibW92ZWRcIiwgc3RhdGUuc3JjTG9jQy54LCBzdGF0ZS5zcmNMb2NDLnksIHN0YXRlLmRlc3RMb2NDLngsIHN0YXRlLmRlc3RMb2NDLnkpO1xyXG5cdFx0XHR0aGlzLmxvY2F0aW9uLnNldCggc3RhdGUuZGVzdExvY0MgKTtcclxuXHRcdFx0XHJcblx0XHRcdGlmIChzdGF0ZS5qdW1waW5nKSB7XHJcblx0XHRcdFx0Ly9UT0RPIHBhcnRpY2xlIGVmZmVjdHNcclxuXHRcdFx0XHRTb3VuZE1hbmFnZXIucGxheVNvdW5kKFwid2Fsa19qdW1wX2xhbmRcIik7XHJcblx0XHRcdFx0c3RhdGUuanVtcGluZyA9IGZhbHNlO1xyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHR2YXIgbmV4dCA9IHN0YXRlLnF1ZXVlLnNoaWZ0KCk7XHJcblx0XHRcdGlmICghbmV4dCkge1xyXG5cdFx0XHRcdHN0YXRlLmRlbHRhID0gMDtcclxuXHRcdFx0XHRzdGF0ZS5tb3ZpbmcgPSBmYWxzZTtcclxuXHRcdFx0XHQvLyB0aGlzLnN0b3BBbmltYXRpb24oKTtcclxuXHRcdFx0XHR0aGlzLnBsYXlBbmltYXRpb24oXCJzdGFuZFwiKTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHR0aGlzLm1vdmVUbyhuZXh0LngsIG5leHQueSwgbmV4dC56KTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH0sXHJcblx0XHJcblx0XHJcblx0Ly8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vIEJlaGF2aW9ycyAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblx0YmVoYXZpb3JTdGFjayA6IG51bGwsXHJcblx0XHJcblx0X2luaXRCZWhhdmlvclN0YWNrIDogZnVuY3Rpb24oKSB7XHJcblx0XHRpZiAoIXRoaXMuYmVoYXZpb3JTdGFjaylcclxuXHRcdFx0dGhpcy5iZWhhdmlvclN0YWNrID0gW107XHJcblx0fSxcclxuXHRcclxuXHRfdGlja19kb0JlaGF2aW9yIDogZnVuY3Rpb24oZGVsdGEpIHtcclxuXHRcdHZhciBiZWhhdiA9IHRoaXMuYmVoYXZpb3JTdGFjay50b3A7XHJcblx0XHRpZiAoIWJlaGF2IHx8ICFiZWhhdi5fdGljaykgcmV0dXJuO1xyXG5cdFx0YmVoYXYuX3RpY2sodGhpcywgZGVsdGEpO1xyXG5cdH0sXHJcblx0XHJcblx0XHJcblx0Ly8vLy8vLy8vLy8vLy8vLy8vLy8vIFByaXZhdGUgTWV0aG9kcyAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblx0XHJcblx0Y2FuV2Fsa09uIDogZnVuY3Rpb24oKXsgcmV0dXJuIGZhbHNlOyB9LFxyXG5cdGlzTlBDIDogZnVuY3Rpb24oKXsgcmV0dXJuIHRydWU7IH0sXHJcblx0XHJcblx0X25vcm1hbGl6ZUxvY2F0aW9uIDogZnVuY3Rpb24oKSB7XHJcblx0XHRpZiAodGhpcy5sb2NhdGlvbiA9PSBcInJhbmRcIikge1xyXG5cdFx0XHQvL1BsYWNlIHRoaXMgYWN0b3IgaW4gYSBkZXNpZ25hdGVkIHJhbmRvbSBsb2NhdGlvblxyXG5cdFx0XHR0aGlzLmxvY2F0aW9uID0gY3VycmVudE1hcC5nZXRSYW5kb21OUENTcGF3blBvaW50KCk7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0dmFyIG51bSA9IEV2ZW50LnByb3RvdHlwZS5fbm9ybWFsaXplTG9jYXRpb24uY2FsbCh0aGlzKTtcclxuXHRcdGlmIChudW0gIT0gMSB8fCAhdGhpcy5sb2NhdGlvbilcclxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiQWN0b3JzIGNhbiBvbmx5IGJlIGluIG9uZSBwbGFjZSBhdCBhIHRpbWUhIE51bWJlciBvZiBsb2NhdGlvbnM6IFwiK251bSk7XHJcblx0fSxcclxuXHRcclxuXHRfYWN0b3JUaWNrIDogZnVuY3Rpb24oZGVsdGEpIHtcclxuXHRcdC8vIERvIGFuaW1hdGlvblxyXG5cdFx0aWYgKHRoaXMuX2FuaW1hdGlvblN0YXRlKSBcclxuXHRcdFx0dGhpcy5fdGlja19kb0FuaW1hdGlvbihkZWx0YSk7XHJcblx0XHRcclxuXHRcdC8vIERvIG1vdmVtZW50XHJcblx0XHRpZiAodGhpcy5fcGF0aGluZ1N0YXRlICYmIHRoaXMuX3BhdGhpbmdTdGF0ZS5tb3ZpbmcpXHJcblx0XHRcdHRoaXMuX3RpY2tfZG9Nb3ZlbWVudChkZWx0YSk7XHJcblx0XHRcclxuXHRcdC8vIERvIGJlaGF2aW9yXHJcblx0XHRpZiAodGhpcy5iZWhhdmlvclN0YWNrLmxlbmd0aClcclxuXHRcdFx0dGhpcy5fdGlja19kb0JlaGF2aW9yKGRlbHRhKTtcclxuXHR9LFxyXG5cdFxyXG5cdF9hY3RvckludGVyYWN0RmFjZSA6IGZ1bmN0aW9uKHZlY3Rvcikge1xyXG5cdFx0dGhpcy5mYWNpbmcgPSB2ZWN0b3IuY2xvbmUoKS5uZWdhdGUoKTtcclxuXHR9LFxyXG5cdFxyXG5cdF9hY3RvckJ1bXAgOiBmdW5jdGlvbihzcmN4LCBzcmN5LCB4LCB5LCByZWFzb24pIHtcclxuXHRcdC8vIGNvbnNvbGUud2Fybih0aGlzLmlkLCBcIjogQ2Fubm90IHdhbGsgdG8gbG9jYXRpb25cIiwgXCIoXCIreCtcIixcIit5K1wiKVwiKTtcclxuXHR9LFxyXG5cdFxyXG59KTtcclxubW9kdWxlLmV4cG9ydHMgPSBBY3RvcjtcclxuXHJcblxyXG5cclxuZnVuY3Rpb24gZ2V0RGlyRnJvbUxvYyh4MSwgeTEsIHgyLCB5Mikge1xyXG5cdHJldHVybiBuZXcgVEhSRUUuVmVjdG9yMyh4Mi14MSwgMCwgeTIteTEpO1xyXG5cdC8vIHZhciBkeCA9IHgyIC0geDE7XHJcblx0Ly8gdmFyIGR5ID0geTIgLSB5MTtcclxuXHQvLyBpZiAoTWF0aC5hYnMoZHgpID4gTWF0aC5hYnMoZHkpKSB7XHJcblx0Ly8gXHRpZiAoZHggPiAwKSB7IHJldHVybiBcInJcIjsgfVxyXG5cdC8vIFx0ZWxzZSBpZiAoZHggPCAwKSB7IHJldHVybiBcImxcIjsgfVxyXG5cdC8vIH0gZWxzZSB7XHJcblx0Ly8gXHRpZiAoZHkgPiAwKSB7IHJldHVybiBcImRcIjsgfVxyXG5cdC8vIFx0ZWxzZSBpZiAoZHkgPCAwKSB7IHJldHVybiBcInVcIjsgfVxyXG5cdC8vIH1cclxuXHQvLyByZXR1cm4gXCJkXCI7XHJcbn1cclxuXHJcbiIsIi8vIGJlaGF2aW9yLmpzXHJcbi8vIERlZmluZXMgdGhlIGJhc2VkIGNsYXNzZXMgZm9yIEFjdG9yJ3MgYmVoYXZpb3JzXHJcblxyXG52YXIgZXh0ZW5kID0gcmVxdWlyZShcImV4dGVuZFwiKTtcclxudmFyIGluaGVyaXRzID0gcmVxdWlyZShcImluaGVyaXRzXCIpO1xyXG5cclxuLyoqIFxyXG4gKiBBIEJlaGF2aW9yIGlzIGEgc2NyaXB0IHRoYXQgYW4gYWN0b3IgaXMgZm9sbG93aW5nLCB3aGV0aGVyIHRoYXRcclxuICogYmUgd2Fsa2luZyBhbG9uZyBhIHBhdGggb3IgYXJvdW5kIGEgY2lyY2xlLCBvciBmb2xsb3dpbmcgYSBtb3JlXHJcbiAqIGNvbXBsZXggc2NyaXB0IG9mIGV2ZW50cy4gQmVoYXZpb3JzIGNhbiBiZSBwdXNoZWQgYW5kIHBvcHBlZCBvZmZcclxuICogYW4gYWN0b3IncyBzdGFjaywgYW5kIHRoZSB0b3Btb3N0IG9uZSB3aWxsIGJlIHBhc3NlZCBjZXJ0YWluIGV2ZW50c1xyXG4gKiB0aGF0IHRoZSBhY3RvciByZWNpZXZlcy5cclxuICovXHJcblxyXG5mdW5jdGlvbiBCZWhhdmlvcihvcHRzKSB7XHJcblx0ZXh0ZW5kKHRoaXMsIG9wdHMpO1xyXG59XHJcbmV4dGVuZChCZWhhdmlvci5wcm90b3R5cGUsIHtcclxuXHR0aWNrIDogbnVsbCxcclxuXHRpbnRlcmFjdCA6IG51bGwsXHJcblx0YnVtcCA6IG51bGwsXHJcblx0XHJcblx0X3RpY2sgOiBmdW5jdGlvbihtZSwgZGVsdGEpIHtcclxuXHRcdGlmICh0aGlzLnRpY2spXHJcblx0XHRcdHRoaXMudGljayhtZSwgZGVsdGEpO1xyXG5cdH0sXHJcblx0X2ludGVyYWN0IDogZnVuY3Rpb24obWUsIGZyb21fZGlyKSB7XHJcblx0XHQvL1RPRE8gZG8gc3RhbmRhcmQgc3R1ZmYgaGVyZVxyXG5cdFx0aWYgKHRoaXMuaW50ZXJhY3QpXHJcblx0XHRcdHRoaXMuaW50ZXJhY3QobWUsIGZyb21fZGlyKTtcclxuXHR9LFxyXG5cdF9idW1wIDogZnVuY3Rpb24obWUsIGZyb21fZGlyKSB7XHJcblx0XHRpZiAodGhpcy5idW1wKVxyXG5cdFx0XHR0aGlzLmJ1bXAobWUsIGZyb21fZGlyKTtcclxuXHR9LFxyXG59KTtcclxubW9kdWxlLmV4cG9ydHMgPSBCZWhhdmlvcjtcclxuXHJcblxyXG4vLy8vLy8vLy8vLyBDb21tb24gQmVoYXZpb3JzIC8vLy8vLy8vLy8vXHJcblxyXG5mdW5jdGlvbiBUYWxraW5nKG9wdHMpIHtcclxuXHRCZWhhdmlvci5jYWxsKHRoaXMsIG9wdHMpO1xyXG59XHJcbmluaGVyaXRzKFRhbGtpbmcsIEJlaGF2aW9yKTtcclxuZXh0ZW5kKFRhbGtpbmcucHJvdG90eXBlLCB7XHJcblx0dGljazogZnVuY3Rpb24obWUsIGRlbHRhKSB7fSxcclxufSk7XHJcbm1vZHVsZS5leHBvcnRzLlRhbGtpbmcgPSBUYWxraW5nO1xyXG5cclxuXHJcblxyXG5mdW5jdGlvbiBMb29rQXJvdW5kKG9wdHMpIHtcclxuXHRCZWhhdmlvci5jYWxsKHRoaXMsIG9wdHMpO1xyXG59XHJcbmluaGVyaXRzKExvb2tBcm91bmQsIEJlaGF2aW9yKTtcclxuZXh0ZW5kKExvb2tBcm91bmQucHJvdG90eXBlLCB7XHJcblx0d2FpdFRpbWUgOiAwLFxyXG5cdHRpY2s6IGZ1bmN0aW9uKG1lLCBkZWx0YSkge1xyXG5cdFx0aWYgKHRoaXMud2FpdFRpbWUgPiAwKSB7XHJcblx0XHRcdHRoaXMud2FpdFRpbWUgLT0gZGVsdGE7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0c3dpdGNoKCBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkqNCkgKSB7XHJcblx0XHRcdGNhc2UgMDogbWUuZmFjaW5nLnNldCggMSwwLCAwKTsgYnJlYWs7XHJcblx0XHRcdGNhc2UgMTogbWUuZmFjaW5nLnNldCgtMSwwLCAwKTsgYnJlYWs7XHJcblx0XHRcdGNhc2UgMjogbWUuZmFjaW5nLnNldCggMCwwLCAxKTsgYnJlYWs7XHJcblx0XHRcdGNhc2UgMzogbWUuZmFjaW5nLnNldCggMCwwLC0xKTsgYnJlYWs7XHJcblx0XHR9XHJcblx0XHR0aGlzLndhaXRUaW1lICs9IChNYXRoLnJhbmRvbSgpICogMzApICsgNTtcclxuXHR9LFxyXG59KTtcclxubW9kdWxlLmV4cG9ydHMuTG9va0Fyb3VuZCA9IExvb2tBcm91bmQ7XHJcblxyXG5cclxuXHJcbmZ1bmN0aW9uIE1lYW5kZXIob3B0cykge1xyXG5cdEJlaGF2aW9yLmNhbGwodGhpcywgb3B0cyk7XHJcbn1cclxuaW5oZXJpdHMoTWVhbmRlciwgQmVoYXZpb3IpO1xyXG5leHRlbmQoTWVhbmRlci5wcm90b3R5cGUsIHtcclxuXHR3YWl0VGltZSA6IDAsXHJcblx0dGljazogZnVuY3Rpb24obWUsIGRlbHRhKSB7XHJcblx0XHRpZiAodGhpcy53YWl0VGltZSA+IDApIHtcclxuXHRcdFx0dGhpcy53YWl0VGltZSAtPSBkZWx0YTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHRzd2l0Y2goIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSo4KSApIHtcclxuXHRcdFx0Y2FzZSAwOiBtZS5mYWNpbmcuc2V0KCAxLDAsIDApOyBicmVhaztcclxuXHRcdFx0Y2FzZSAxOiBtZS5mYWNpbmcuc2V0KC0xLDAsIDApOyBicmVhaztcclxuXHRcdFx0Y2FzZSAyOiBtZS5mYWNpbmcuc2V0KCAwLDAsIDEpOyBicmVhaztcclxuXHRcdFx0Y2FzZSAzOiBtZS5mYWNpbmcuc2V0KCAwLDAsLTEpOyBicmVhaztcclxuXHRcdFx0Y2FzZSA0OiBtZS5tb3ZlRGlyKFwiZFwiKTsgYnJlYWs7XHJcblx0XHRcdGNhc2UgNTogbWUubW92ZURpcihcInVcIik7IGJyZWFrO1xyXG5cdFx0XHRjYXNlIDY6IG1lLm1vdmVEaXIoXCJsXCIpOyBicmVhaztcclxuXHRcdFx0Y2FzZSA3OiBtZS5tb3ZlRGlyKFwiclwiKTsgYnJlYWs7XHJcblx0XHR9XHJcblx0XHR0aGlzLndhaXRUaW1lICs9IChNYXRoLnJhbmRvbSgpICogMzApICsgNTtcclxuXHR9LFxyXG59KTtcclxubW9kdWxlLmV4cG9ydHMuTWVhbmRlciA9IE1lYW5kZXI7XHJcblxyXG4iLCIvLyBjb250cm9sbGVyLmpzXHJcbi8vIFRoaXMgY2xhc3MgaGFuZGxlcyBpbnB1dCBhbmQgY29udmVydHMgaXQgdG8gY29udHJvbCBzaWduYWxzXHJcblxyXG52YXIgaW5oZXJpdHMgPSByZXF1aXJlKFwiaW5oZXJpdHNcIik7XHJcbnZhciBleHRlbmQgPSByZXF1aXJlKFwiZXh0ZW5kXCIpO1xyXG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZShcImV2ZW50c1wiKS5FdmVudEVtaXR0ZXI7XHJcblxyXG4vLyBUT0RPIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0d1aWRlL0FQSS9HYW1lcGFkXHJcblxyXG5mdW5jdGlvbiBDb250cm9sTWFuYWdlcigpIHtcclxuXHR2YXIgc2VsZiA9IHRoaXM7XHJcblx0dGhpcy5zZXRLZXlDb25maWcoKTtcclxuXHRcclxuXHQkKGZ1bmN0aW9uKCl7XHJcblx0XHQkKGRvY3VtZW50KS5vbihcImtleWRvd25cIiwgZnVuY3Rpb24oZSl7IHNlbGYub25LZXlEb3duKGUpOyB9KTtcclxuXHRcdCQoZG9jdW1lbnQpLm9uKFwia2V5dXBcIiwgZnVuY3Rpb24oZSl7IHNlbGYub25LZXlVcChlKTsgfSk7XHJcblx0XHRcclxuXHRcdCQoXCIjY2hhdGJveFwiKS5vbihcImZvY3VzXCIsIGZ1bmN0aW9uKGUpeyBcclxuXHRcdFx0Y29uc29sZS5sb2coXCJDSEFUIEZPQ1VTXCIpO1xyXG5cdFx0XHRzZWxmLmlucHV0Q29udGV4dC5wdXNoKFwiY2hhdFwiKTsgXHJcblx0XHR9KTtcclxuXHRcdCQoXCIjY2hhdGJveFwiKS5vbihcImJsdXJcIiwgZnVuY3Rpb24oZSl7IFxyXG5cdFx0XHRjb25zb2xlLmxvZyhcIkNIQVQgQkxVUlwiKTtcclxuXHRcdFx0aWYgKHNlbGYuaW5wdXRDb250ZXh0LnRvcCA9PSBcImNoYXRcIilcclxuXHRcdFx0XHRzZWxmLmlucHV0Q29udGV4dC5wb3AoKTsgXHJcblx0XHR9KTtcclxuXHR9KVxyXG59XHJcbmluaGVyaXRzKENvbnRyb2xNYW5hZ2VyLCBFdmVudEVtaXR0ZXIpO1xyXG5leHRlbmQoQ29udHJvbE1hbmFnZXIucHJvdG90eXBlLCB7XHJcblx0aW5wdXRDb250ZXh0IDogW1wiZ2FtZVwiXSxcclxuXHRcclxuXHRrZXlzX2NvbmZpZyA6IHtcclxuXHRcdFVwOiBbMzgsIFwiVXBcIiwgODcsIFwid1wiXSwgXHJcblx0XHREb3duOiBbNDAsIFwiRG93blwiLCA4MywgXCJzXCJdLCBcclxuXHRcdExlZnQ6IFszNywgXCJMZWZ0XCIsIDY1LCBcImFcIl0sIFxyXG5cdFx0UmlnaHQ6IFszOSwgXCJSaWdodFwiLCA2OCwgXCJkXCJdLFxyXG5cdFx0SW50ZXJhY3Q6IFsxMywgXCJFbnRlclwiLCAzMiwgXCIgXCJdLFxyXG5cdFx0Q2FuY2VsOiBbMjcsIFwiRXNjYXBlXCIsIDE3LCBcIkN0cmxcIl0sXHJcblx0XHRSdW46IFsxNiwgXCJTaGlmdFwiXSxcclxuXHRcdEZvY3VzQ2hhdDogWzE5MSwgXCIvXCJdLFxyXG5cdH0sXHJcblx0XHJcblx0a2V5c19hY3RpdmUgOiB7fSxcclxuXHRcclxuXHRrZXlzX2Rvd24gOiB7XHJcblx0XHRVcDogZmFsc2UsIERvd246IGZhbHNlLFxyXG5cdFx0TGVmdDogZmFsc2UsIFJpZ2h0OiBmYWxzZSxcclxuXHRcdEludGVyYWN0OiBmYWxzZSwgRm9jdXNDaGF0OiBmYWxzZSxcclxuXHR9LFxyXG5cdFxyXG5cdHB1c2hJbnB1dENvbnRleHQ6IGZ1bmN0aW9uKGN0eCkge1xyXG5cdFx0dGhpcy5pbnB1dENvbnRleHQucHVzaChjdHgpO1xyXG5cdFx0dGhpcy5lbWl0KFwiaW5wdXRDb250ZXh0Q2hhbmdlZFwiKTtcclxuXHR9LFxyXG5cdHBvcElucHV0Q29udGV4dDogZnVuY3Rpb24oY3R4KSB7XHJcblx0XHRpZiAoIWN0eCB8fCB0aGlzLmlucHV0Q29udGV4dC50b3AgPT0gY3R4KSB7XHJcblx0XHRcdHZhciBjID0gdGhpcy5pbnB1dENvbnRleHQucG9wKCk7XHJcblx0XHRcdHRoaXMuZW1pdChcImlucHV0Q29udGV4dENoYW5nZWRcIik7XHJcblx0XHRcdHJldHVybiBjO1xyXG5cdFx0fVxyXG5cdH0sXHJcblx0cmVtb3ZlSW5wdXRDb250ZXh0OiBmdW5jdGlvbihjdHgpIHtcclxuXHRcdGlmICghY3R4KSByZXR1cm47XHJcblx0XHR2YXIgaW5kZXggPSB0aGlzLmlucHV0Q29udGV4dC5sYXN0SW5kZXhPZihjdHgpO1xyXG5cdFx0aWYgKGluZGV4ID4gLTEpIHtcclxuXHRcdFx0dGhpcy5pbnB1dENvbnRleHQuc3BsaWNlKGluZGV4LCAxKTtcclxuXHRcdFx0dGhpcy5lbWl0KFwiaW5wdXRDb250ZXh0Q2hhbmdlZFwiKTtcclxuXHRcdFx0cmV0dXJuIGN0eDtcclxuXHRcdH1cclxuXHR9LFxyXG5cdFxyXG5cdGlzRG93biA6IGZ1bmN0aW9uKGtleSwgY3R4KSB7XHJcblx0XHRpZiAoJC5pc0FycmF5KGN0eCkpIHtcclxuXHRcdFx0dmFyIGdvID0gZmFsc2U7XHJcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgY3R4Lmxlbmd0aDsgaSsrKSBnbyB8PSBjdHhbaV07XHJcblx0XHRcdGlmICghZ28pIHJldHVybjtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdGlmICh0aGlzLmlucHV0Q29udGV4dC50b3AgIT0gY3R4KSByZXR1cm47XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdHJldHVybiB0aGlzLmtleXNfZG93bltrZXldO1xyXG5cdH0sXHJcblx0aXNEb3duT25jZSA6IGZ1bmN0aW9uKGtleSwgY3R4KSB7XHJcblx0XHRpZiAoJC5pc0FycmF5KGN0eCkpIHtcclxuXHRcdFx0dmFyIGdvID0gZmFsc2U7XHJcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgY3R4Lmxlbmd0aDsgaSsrKSBnbyB8PSBjdHhbaV07XHJcblx0XHRcdGlmICghZ28pIHJldHVybjtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdGlmICh0aGlzLmlucHV0Q29udGV4dC50b3AgIT0gY3R4KSByZXR1cm47XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdHJldHVybiB0aGlzLmtleXNfZG93bltrZXldID09IDE7XHJcblx0fSxcclxuXHRcclxuXHRzZXRLZXlDb25maWcgOiBmdW5jdGlvbigpIHtcclxuXHRcdHRoaXMua2V5c19hY3RpdmUgPSBleHRlbmQodHJ1ZSwge30sIHRoaXMua2V5c19jb25maWcpO1xyXG5cdH0sXHJcblx0XHJcblx0b25LZXlEb3duIDogZnVuY3Rpb24oZSkge1xyXG5cdFx0Zm9yICh2YXIgYWN0aW9uIGluIHRoaXMua2V5c19hY3RpdmUpIHtcclxuXHRcdFx0dmFyIGtleXMgPSB0aGlzLmtleXNfYWN0aXZlW2FjdGlvbl07XHJcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRcdGlmIChlLndoaWNoID09IGtleXNbaV0pIHtcclxuXHRcdFx0XHRcdC8vIEtleSBpcyBub3cgZG93biFcclxuXHRcdFx0XHRcdHRoaXMuZW1pdEtleShhY3Rpb24sIHRydWUpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH0sXHJcblx0b25LZXlVcCA6IGZ1bmN0aW9uIChlKSB7XHJcblx0XHRmb3IgKHZhciBhY3Rpb24gaW4gdGhpcy5rZXlzX2FjdGl2ZSkge1xyXG5cdFx0XHR2YXIga2V5cyA9IHRoaXMua2V5c19hY3RpdmVbYWN0aW9uXTtcclxuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdFx0aWYgKGUud2hpY2ggPT0ga2V5c1tpXSkge1xyXG5cdFx0XHRcdFx0Ly8gS2V5IGlzIG5vdyB1cCFcclxuXHRcdFx0XHRcdHRoaXMuZW1pdEtleShhY3Rpb24sIGZhbHNlKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9LFxyXG5cdFxyXG5cdHN1Ym1pdENoYXRLZXlwcmVzcyA6IGZ1bmN0aW9uKGtleSkge1xyXG5cdFx0c3dpdGNoKGtleSkge1xyXG5cdFx0XHRcclxuXHRcdH1cclxuXHR9LFxyXG5cdFxyXG5cdGVtaXRLZXkgOiBmdW5jdGlvbihhY3Rpb24sIGRvd24pIHtcclxuXHRcdGlmICh0aGlzLmtleXNfZG93blthY3Rpb25dICE9IGRvd24pIHtcclxuXHRcdFx0dGhpcy5rZXlzX2Rvd25bYWN0aW9uXSA9IGRvd247XHJcblx0XHRcdHRoaXMuZW1pdChcImNvbnRyb2wtYWN0aW9uXCIsIGFjdGlvbiwgZG93bik7XHJcblx0XHR9XHJcblx0fSxcclxuXHRcclxuXHRfdGljayA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0Zm9yICh2YXIgbmFtZSBpbiB0aGlzLmtleXNfZG93bikge1xyXG5cdFx0XHRpZiAodGhpcy5rZXlzX2Rvd25bbmFtZV0gPiAwKVxyXG5cdFx0XHRcdHRoaXMua2V5c19kb3duW25hbWVdKys7XHJcblx0XHR9XHJcblx0fVxyXG5cdFxyXG59KTtcclxuXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBDb250cm9sTWFuYWdlcigpO1xyXG4iLCIvLyBldmVudC5qc1xyXG4vLyBEZWZpbmVzIHRoZSBiYXNlIGV2ZW50IHVzZWQgdGhyb3VnaG91dCB0aGUgcGFyay5cclxuXHJcbi8vIEZpdHRpbmdseSwgRXZlbnQgaXMgYSBzdWJjbGFzcyBvZiBub2RlLmpzJ3MgRXZlbnRFbWl0dGVyIGNsYXNzLlxyXG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZShcImV2ZW50c1wiKS5FdmVudEVtaXR0ZXI7XHJcbnZhciBpbmhlcml0cyA9IHJlcXVpcmUoXCJpbmhlcml0c1wiKTtcclxudmFyIGV4dGVuZCA9IHJlcXVpcmUoXCJleHRlbmRcIik7XHJcblxyXG4vKipcclxuICogQW4gZXZlbnQgaXMgYW55IGludGVyYWN0YWJsZSBvciBhbmltYXRpbmcgb2JqZWN0IGluIHRoZSBnYW1lLlxyXG4gKiBUaGlzIGluY2x1ZGVzIHRoaW5ncyByYW5naW5nIGZyb20gc2lnbnMsIHRvIHBlb3BsZS9wb2tlbW9uLlxyXG4gKiBBbiBldmVudDpcclxuICpcdC0gVGFrZXMgdXAgYXQgbGVhc3Qgb25lIHRpbGUgb24gdGhlIG1hcFxyXG4gKlx0LSBDYW4gYmUgaW50ZXJhY3RlZCB3aXRoIGJ5IGluLWdhbWUgdGFsa2luZyBvciBvbi1zY3JlZW4gY2xpY2tcclxuICpcdC0gTWF5IGJlIHJlcHJlc2VudGVkIGluLWdhbWUgYnkgYSBzcHJpdGVcclxuICpcdC0gTWF5IGRlY2lkZSwgdXBvbiBjcmVhdGlvbiwgdG8gbm90IGFwcGVhciBvbiB0aGUgbWFwLlxyXG4gKi9cclxuZnVuY3Rpb24gRXZlbnQoYmFzZSwgb3B0cykge1xyXG5cdEV2ZW50RW1pdHRlci5jYWxsKHRoaXMpO1xyXG5cdFxyXG5cdGV4dGVuZCh0aGlzLCBiYXNlLCBvcHRzKTtcclxuXHRcclxuXHR0aGlzLl9ub3JtYWxpemVMb2NhdGlvbigpO1xyXG5cdFxyXG5cdGlmICh0aGlzLm9uRXZlbnRzKSB7XHJcblx0XHR2YXIga2V5cyA9IE9iamVjdC5rZXlzKHRoaXMub25FdmVudHMpO1xyXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdHRoaXMub24oa2V5c1tpXSwgdGhpcy5vbkV2ZW50c1trZXlzW2ldXSk7XHJcblx0XHR9XHJcblx0XHRkZWxldGUgdGhpcy5vbkV2ZW50cztcclxuXHR9XHJcbn1cclxuaW5oZXJpdHMoRXZlbnQsIEV2ZW50RW1pdHRlcik7XHJcbmV4dGVuZChFdmVudC5wcm90b3R5cGUsIHtcclxuXHRpZCA6IG51bGwsXHJcblx0ZW5hYmxlZCA6IGZhbHNlLFxyXG5cdHZpc2libGUgOiB0cnVlLFxyXG5cdFxyXG5cdGxvY2F0aW9uIDogbnVsbCwgLy8gRXZlbnRzIHdpdGggYSBzaW5nbGUgbG9jYXRpb24gYXJlIG9wdGltaXplZCBmb3IgaXRcclxuXHRsb2NhdGlvbnMgOiBudWxsLCAvLyBFdmVudHMgd2l0aCBtdWx0aXBsZSBsb2NhdGlvbnMgYXJlIG9wdGltaXplZCBmb3IgdGhhdCBhbHNvXHJcblx0XHJcblx0dG9TdHJpbmcgOiBmdW5jdGlvbigpIHtcclxuXHRcdGlmICghdGhpcy5pZCkgcmV0dXJuIFwiPExvY2FsIG9yIFVubmFtZWQgRXZlbnQ+XCI7XHJcblx0XHRyZXR1cm4gdGhpcy5pZDtcclxuXHR9LFxyXG5cdFxyXG5cdHNob3VsZEFwcGVhciA6IGZ1bmN0aW9uKG1hcGlkKXsgcmV0dXJuIHRydWU7IH0sXHJcblx0Y2FuV2Fsa09uIDogZnVuY3Rpb24oKXsgcmV0dXJuIHRydWU7IH0sXHJcblx0XHJcblx0LyoqIFJldHVybnMgYW4gb2JqZWN0IHRvIHJlcHJlc2VudCB0aGlzIGV2ZW50IGluIDNEIHNwYWNlLCBvciBudWxsIGlmIHRoZXJlIHNob3VsZG4ndCBiZSBvbmUuICovXHJcblx0Z2V0QXZhdGFyIDogZnVuY3Rpb24obWFwLCBnYyl7IHJldHVybiBudWxsOyB9LFxyXG5cdFxyXG5cdG9uRXZlbnRzIDogbnVsbCwgLy9hIG9iamVjdCwgZXZlbnQtbmFtZXMgLT4gZnVuY3Rpb25zIHRvIGNhbGwsIHRvIGJlIHJlZ2lzdGVyZWQgaW4gY29uc3RydWN0b3JcclxuXHRcclxuXHRjYW5Nb3ZlIDogZnVuY3Rpb24oKSB7XHJcblx0XHQvL0lmIHdlIG9ubHkgaGF2ZSAxIGxvY2F0aW9uLCB0aGVuIHdlIGNhbiBtb3ZlXHJcblx0XHRyZXR1cm4gISF0aGlzLmxvY2F0aW9uICYmICF0aGlzLmxvY2F0aW9ucztcclxuXHR9LFxyXG5cdFxyXG5cdG1vdmVUbyA6IGZ1bmN0aW9uKHgsIHkpIHtcclxuXHRcdGlmICghdGhpcy5jYW5Nb3ZlKCkpXHJcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIlRoaXMgZXZlbnQgaXMgaW4gc2V2ZXJhbCBwbGFjZXMgYXQgb25jZSwgYW5kIGNhbm5vdCBtb3ZlVG8hXCIpO1xyXG5cdFx0XHJcblx0XHQvL1RPRE8gcXVldWUgdXAgYSBtb3ZlXHJcblx0fSxcclxuXHRcclxuXHRfbm9ybWFsaXplTG9jYXRpb24gOiBmdW5jdGlvbigpIHtcclxuXHRcdGlmICh0aGlzLmxvY2F0aW9uKSB7XHJcblx0XHRcdC8vSWYgd2UgaGF2ZSBhIHNpbmd1bGFyIGxvY2F0aW9uIHNldFxyXG5cdFx0XHRpZiAodGhpcy5sb2NhdGlvbnMpIC8vIEFzIGxvbmcgYXMgd2UgZG9uJ3QgYWxzbyBoYXZlIGEgbGlzdCwgaXRzIGZpbmVcclxuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJFdmVudCB3YXMgaW5pdGlhbGl6ZWQgd2l0aCBib3RoIGxvY2F0aW9uIGFuZCBsb2NhdGlvbnMhIFRoZXkgY2Fubm90IGJlIGJvdGggZGVmaW5lZCFcIik7XHJcblx0XHRcdFxyXG5cdFx0XHR2YXIgbG9jID0gdGhpcy5sb2NhdGlvbjtcclxuXHRcdFx0aWYgKCQuaXNBcnJheShsb2MpICYmIGxvYy5sZW5ndGggPT0gMiAmJiB0eXBlb2YgbG9jWzBdID09IFwibnVtYmVyXCIgJiYgdHlwZW9mIGxvY1sxXSA9PSBcIm51bWJlclwiKSBcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGxvYyA9IG5ldyBUSFJFRS5WZWN0b3IyKGxvY1swXSwgbG9jWzFdKTtcclxuXHRcdFx0fSBcclxuXHRcdFx0ZWxzZSBpZiAoJC5pc0FycmF5KGxvYykgJiYgbG9jLmxlbmd0aCA9PSAzIFxyXG5cdFx0XHRcdCYmIHR5cGVvZiBsb2NbMF0gPT0gXCJudW1iZXJcIiAmJiB0eXBlb2YgbG9jWzFdID09IFwibnVtYmVyXCIgJiYgdHlwZW9mIGxvY1syXSA9PSBcIm51bWJlclwiKSBcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGxvYyA9IG5ldyBUSFJFRS5WZWN0b3IzKGxvY1swXSwgbG9jWzFdLCBsb2NbMl0pO1xyXG5cdFx0XHR9IFxyXG5cdFx0XHRlbHNlIGlmICghKGxvYyBpbnN0YW5jZW9mIFRIUkVFLlZlY3RvcjIgfHwgbG9jIGluc3RhbmNlb2YgVEhSRUUuVmVjdG9yMykpIFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiQ291bGQgbm90IG5vcm1hbGl6ZSBsb2NhdGlvbiBvZiBcIit0aGlzLmlkK1wiIVwiKTtcclxuXHRcdFx0fVxyXG5cdFx0XHR0aGlzLmxvY2F0aW9uID0gbG9jO1xyXG5cdFx0XHRyZXR1cm4gMTtcclxuXHRcdH1cclxuXHRcdHZhciBvcmdsb2MgPSB0aGlzLmxvY2F0aW9ucztcclxuXHRcdHZhciBsb2NzID0gbnVsbDtcclxuXHRcdFxyXG5cdFx0aWYgKCQuaXNBcnJheShvcmdsb2MpKSB7XHJcblx0XHRcdHZhciB0eXBlID0gbnVsbCwgbmV3VHlwZSA9IG51bGw7XHJcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgb3JnbG9jLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdFx0aWYgKHR5cGVvZiBvcmdsb2NbaV0gPT0gXCJudW1iZXJcIilcclxuXHRcdFx0XHRcdG5ld1R5cGUgPSBcIm51bWJlclwiO1xyXG5cdFx0XHRcdGVsc2UgaWYgKG9yZ2xvY1tpXSBpbnN0YW5jZW9mIFRIUkVFLlZlY3RvcjIpXHJcblx0XHRcdFx0XHRuZXdUeXBlID0gXCJ2ZWN0b3JcIjtcclxuXHRcdFx0XHRlbHNlIGlmIChvcmdsb2NbaV0gaW5zdGFuY2VvZiBUSFJFRS5WZWN0b3IzKVxyXG5cdFx0XHRcdFx0bmV3VHlwZSA9IFwidmVjdG9yXCI7XHJcblx0XHRcdFx0ZWxzZSBpZiAoJC5pc0FycmF5KG9yZ2xvY1tpXSkpXHJcblx0XHRcdFx0XHRuZXdUeXBlID0gXCJhcnJheVwiO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdGlmICghdHlwZSkgdHlwZSA9IG5ld1R5cGU7XHJcblx0XHRcdFx0aWYgKHR5cGUgIT0gbmV3VHlwZSkge1xyXG5cdFx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiQ291bGQgbm90IG5vcm1hbGl6ZSBsb2NhdGlvbnMgb2YgXCIrdGhpcy5pZCtcIiFcIik7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHRcdGlmICh0eXBlID09IFwibnVtYmVyXCIpIGxvY3MgPSBfX3BhcnNlQXNOdW1iZXJBcnJheShvcmdsb2MpO1xyXG5cdFx0XHRpZiAodHlwZSA9PSBcImFycmF5XCIpIGxvY3MgPSBfX3BhcnNlQXNBcnJheUFycmF5KG9yZ2xvYyk7XHJcblx0XHRcdGlmICh0eXBlID09IFwidmVjdG9yXCIpIGxvY3MgPSBvcmdsb2M7XHJcblx0XHR9XHJcblx0XHRlbHNlIGlmICgkLmlzRnVuY3Rpb24ob3JnbG9jKSkge1xyXG5cdFx0XHRsb2NzID0gb3JnbG9jLmNhbGwodGhpcyk7XHJcblx0XHR9XHJcblx0XHRlbHNlIGlmIChvcmdsb2MgaW5zdGFuY2VvZiBUSFJFRS5WZWN0b3IyKSB7XHJcblx0XHRcdGxvY3MgPSBbb3JnbG9jXTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0aWYgKCFsb2NzIHx8ICEkLmlzQXJyYXkobG9jcykgfHwgbG9jcy5sZW5ndGggPT0gMCkgXHJcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIkNvdWxkIG5vdCBub3JtYWxpemUgbG9jYXRpb25zIG9mIFwiK3RoaXMuaWQrXCIhXCIpO1xyXG5cdFx0XHJcblx0XHR0aGlzLmxvY2F0aW9ucyA9IGxvY3M7XHJcblx0XHR0aGlzLl9ub3JtYWxpemVMb2NhdGlvbiA9IGZ1bmN0aW9uKCl7IHJldHVybiBsb2NzLmxlbmd0aDsgfTsgLy9jYW4ndCBub3JtYWxpemUgdHdpY2VcclxuXHRcdHJldHVybiBsb2NzLmxlbmd0aDtcclxuXHRcdFxyXG5cdFx0ZnVuY3Rpb24gX19wYXJzZUFzTnVtYmVyQXJyYXkobCkge1xyXG5cdFx0XHRpZiAobC5sZW5ndGggPT0gMikgLy9zaW5nbGUgcG9pbnQgW3gsIHldXHJcblx0XHRcdFx0cmV0dXJuIFtuZXcgVEhSRUUuVmVjdG9yMihsWzBdLCBsWzFdKV07XHJcblx0XHRcdGlmIChsLmxlbmd0aCA9PSAzKSAvL3NpbmdsZSBwb2ludCBbeCwgeSwgel1cclxuXHRcdFx0XHRyZXR1cm4gW25ldyBUSFJFRS5WZWN0b3IzKGxbMF0sIGxbMV0sIGxbMl0pXTtcclxuXHRcdFx0aWYgKGwubGVuZ3RoID09IDQpIHsgLy9yZWN0YW5nbGUgW3gsIHksIHcsIGhdXHJcblx0XHRcdFx0dmFyIG4gPSBbXTtcclxuXHRcdFx0XHRmb3IgKHZhciB4ID0gbFswXTsgeCA8IGxbMF0rbFsyXTsgeCsrKSB7XHJcblx0XHRcdFx0XHRmb3IgKHZhciB5ID0gbFsxXTsgeSA8IGxbMV0rbFszXTsgeSsrKSB7XHJcblx0XHRcdFx0XHRcdG4ucHVzaChuZXcgVEhSRUUuVmVjdG9yMih4LCB5KSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdHJldHVybiBuO1xyXG5cdFx0XHR9XHJcblx0XHRcdGlmIChsLmxlbmd0aCA9PSA1KSB7IC8vcmVjdGFuZ2xlIFt4LCB5LCB6LCB3LCBoXVxyXG5cdFx0XHRcdHZhciBuID0gW107XHJcblx0XHRcdFx0Zm9yICh2YXIgeCA9IGxbMF07IHggPCBsWzBdK2xbM107IHgrKykge1xyXG5cdFx0XHRcdFx0Zm9yICh2YXIgeSA9IGxbMV07IHkgPCBsWzFdK2xbNF07IHkrKykge1xyXG5cdFx0XHRcdFx0XHRuLnB1c2gobmV3IFRIUkVFLlZlY3RvcjMoeCwgeSwgbFsyXSkpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRyZXR1cm4gbjtcclxuXHRcdFx0fVxyXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJDb3VsZCBub3Qgbm9ybWFsaXplIGxvY2F0aW9uKHMpIG9mIFwiK3RoaXMuaWQrXCIhXCIpO1xyXG5cdFx0fVxyXG5cdFx0ZnVuY3Rpb24gX19wYXJzZUFzQXJyYXlBcnJheShsKSB7XHJcblx0XHRcdHZhciBuID0gW107XHJcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgbC5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRcdGZvciAodmFyIGogPSAwOyBqIDwgbFtpXS5sZW5ndGg7IGorKykge1xyXG5cdFx0XHRcdFx0aWYgKHR5cGVvZiBsW2ldW2pdICE9IFwibnVtYmVyXCIpXHJcblx0XHRcdFx0XHRcdHRocm93IG5ldyBFcnJvcihcIkNvdWxkIG5vdCBub3JtYWxpemUgbG9jYXRpb24ocykgb2YgXCIrdGhpcy5pZCtcIiFcIik7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdG4ucHVzaChfX3BhcnNlQXNOdW1iZXJBcnJheShsW2ldKSk7XHJcblx0XHRcdH1cclxuXHRcdFx0cmV0dXJuIG47XHJcblx0XHR9XHJcblx0fSxcclxuXHRcclxufSk7XHJcbm1vZHVsZS5leHBvcnRzID0gRXZlbnQ7XHJcblxyXG5FdmVudC5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPVxyXG5FdmVudC5wcm90b3R5cGUub24gPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xyXG5cdGlmICgkLmluQXJyYXkodHlwZSwgX19FVkVOVF9UWVBFU19fKSA9PSAtMSkge1xyXG5cdFx0Y29uc29sZS5lcnJvcihcIk1hcCBFdmVudFwiLCB0aGlzLnRvU3RyaW5nKCksIFwicmVnaXN0ZXJpbmcgZW1pdHRlZCBldmVudCB0eXBlXCIsIFxyXG5cdFx0XHR0eXBlLCBcIndoaWNoIGlzIG5vdCBhIHZhbGlkIGVtaXR0ZWQgZXZlbnQgdHlwZSFcIik7XHJcblx0fVxyXG5cdEV2ZW50RW1pdHRlci5wcm90b3R5cGUub24uY2FsbCh0aGlzLCB0eXBlLCBsaXN0ZW5lcik7XHJcbn1cclxuXHJcbi8vIFRoZSBmb2xsb3dpbmcgaXMgYSBsaXN0IG9mIGV2ZW50cyB0aGUgYmFzZSBFdmVudCBjbGFzcyBhbmQgbGlicmFyeSBlbWl0XHJcbi8vIFRoaXMgbGlzdCBpcyBjaGVja2VkIGFnYWluc3Qgd2hlbiByZWdpc3RlcmluZyB0byBjYXRjaCBtaXNzcGVsbGluZ3MuXHJcbnZhciBfX0VWRU5UX1RZUEVTX18gPSBbXHJcblx0XCJlbnRlcmluZy10aWxlXCIsIC8vKGZyb20tZGlyKSBcclxuXHRcdC8vZW1pdHRlZCB1cG9uIHRoZSBwbGF5ZXIgaXMgZ2l2ZW4gdGhlIGdvIGFoZWFkIHRvIGVudGVyIHRoZSB0aWxlIHRoaXMgZXZlbnQgb2NjdXBpZXMuXHJcblx0XCJlbnRlcmVkLXRpbGVcIiwgLy8oZnJvbS1kaXIpXHJcblx0XHQvL2VtaXR0ZWQgdXBvbiB0aGUgcGxheWVyIGxhbmRpbmcgb24gdGhlIHRpbGUgdGhpcyBldmVudCBvY2N1cGllcy5cclxuXHRcImxlYXZpbmctdGlsZVwiLCAvLyh0by1kaXIpXHJcblx0XHQvL2VtaXR0ZWQgdXBvbiB0aGUgcGxheWVyIGlzIGdpdmVuIHRoZSBnbyBhaGVhZCB0byBsZWF2ZSB0aGUgdGlsZSB0aGlzIGV2ZW50IG9jY3VwaWVzLlxyXG5cdFwibGVmdC10aWxlXCIsIC8vKHRvLWRpcilcclxuXHRcdC8vZW1pdHRlZCB1cG9uIHRoZSBwbGF5ZXIgY29tcGxldGVseSBsZWF2aW5nIHRoZSB0aWxlIHRoaXMgZXZlbnQgb2NjdXBpZXMuXHJcblx0XCJidW1wZWRcIiwgLy8oZnJvbS1kaXIpXHJcblx0XHQvL2VtaXR0ZWQgdXBvbiB0aGUgcGxheWVyIGlzIGRlbmllZCBlbnRyeSBpbnRvIHRoZSB0aWxlIHRoaXMgZXZlbnQgb2NjdXBpZXMuXHJcblx0XCJpbnRlcmFjdGVkXCIsIC8vKGZyb20tZGlyKVxyXG5cdFx0Ly9lbWl0dGVkIHdoZW4gdGhlIHBsYXllciBpbnRlcmFjdHMgd2l0aCB0aGlzIGV2ZW50IGZyb20gYW4gYWRqYWNlbnQgdGlsZVxyXG5cdFwidGlja1wiLCAvLyhkZWx0YSlcclxuXHRcdC8vZW1pdHRlZCBldmVyeSBnYW1lIHRpY2tcclxuXHRcImNsaWNrZWRcIiwgLy8oeCwgeSlcclxuXHRcdC8vZW1pdHRlZCB3aGVuIHRoZSBtb3VzZSBpcyBjbGlja2VkIG9uIHRoaXMgZXZlbnQgKGFuZCBpdCBpcyBkZXRlcm1pbmVkIGl0IGlzIHRoaXMgZXZlbnQpXHJcblx0XCJjbGlja2VkLXRocm91Z2hcIiwgLy8oeCwgeSlcclxuXHRcdC8vZW1pdHRlZCB3aGVuIHRoZSBtb3VzZSBpcyBjbGlja2VkIG9uIHRoaXMgZXZlbnQgKGFuZCB0aGUgcmF5dHJhY2UgaXMgcGFzc2luZyB0aHJvdWdoIFxyXG5cdFx0Ly8gdGhpcyBldmVudCBkdXJpbmcgdGhlIGRldGVybWluaW5nIHBoYXNlKVxyXG5cdFwibW92aW5nXCIsIC8vKHNyY1gsIHNyY1ksIGRlc3RYLCBkZXN0WSlcclxuXHRcdC8vZW1pdHRlZCB3aGVuIHRoaXMgZXZlbnQgYmVnaW5zIG1vdmluZyB0byBhIG5ldyB0aWxlXHJcblx0XCJtb3ZlZFwiLCAvLyhzcmNYLCBzcmNZLCBkZXN0WCwgZGVzdFkpXHJcblx0XHQvL2VtaXR0ZWQgd2hlbiB0aGlzIGV2ZW50IGZpbmlzaGVzIG1vdmluZyB0byBhIG5ldyB0aWxlXHJcblx0XCJjYW50LW1vdmVcIiwgLy8oc3JjWCwgc3JjWSwgZGVzdFgsIGRlc3RZLCByZWFzb25FdmVudClcclxuXHRcdC8vZW1pdHRlZCB3aGVuIHRoaXMgZXZlbnQgaXMgZGVuaWVkIG1vdmVtZW50IHRvIHRoZSByZXF1ZXN0ZWQgdGlsZVxyXG5cdFx0Ly8gSXQgaXMgcGFzc2VkIHRoZSBldmVudCBibG9ja2luZyBpdCwgb3IgbnVsbCBpZiBpdCBpcyBkdWUgdG8gdGhlIGNvbGxpc2lvbiBtYXBcclxuXHRcImFuaW0tZW5kXCIsIC8vKGFuaW1hdGlvbk5hbWUpXHJcblx0XHQvL2VtaXR0ZWQgd2hlbiB0aGlzIGV2ZW50J3MgYW5pbWF0aW9uIGVuZHNcclxuXHRcImNyZWF0ZWRcIiwgXHJcblx0XHQvL2VtaXR0ZWQgd2hlbiB0aGlzIGV2ZW50IGlzIGFkZGVkIHRvIHRoZSBldmVudCBtYXBcclxuXHRcImRlc3Ryb3llZFwiLFxyXG5cdFx0Ly9lbWl0dGVkIHdoZW4gdGhpcyBldmVudCBoYXMgYmVlbiB0YWtlbiBvdXQgb2YgdGhlIGV2ZW50IG1hcFxyXG5cdFwicmVhY3RcIiwgLy8oaWQsIGRpc3RhbmNlKVxyXG5cdFx0Ly9lbWl0dGVkIHdoZW4gYW5vdGhlciBldmVudCBvbiB0aGUgbWFwIHRyYW5zbWl0cyBhIHJlYWN0YWJsZSBldmVudFxyXG5cdFwibWVzc2FnZVwiLCAvLyhpZCwgLi4uKVxyXG5cdFx0Ly9uZXZlciBlbWl0dGVkIGJ5IHRoZSBsaWJyYXJ5LCB0aGlzIGV2ZW50IHR5cGUgY2FuIGJlIHVzZWQgZm9yIGNyb3NzLWV2ZW50IG1lc3NhZ2VzXHJcbl07XHJcbiIsIi8vIHBsYXllci1jaGFyYWN0ZXIuanNcclxuLy8gRGVmaW5lcyB0aGUgY29uY3JldGUgY29kZSBmb3IgYSBQbGF5ZXIgQ2hhcmFjdGVyIGluIHRoZSB3b3JsZFxyXG5cclxudmFyIEFjdG9yID0gcmVxdWlyZShcInRwcC1hY3RvclwiKTtcclxudmFyIGNvbnRyb2xsZXIgPSByZXF1aXJlKFwidHBwLWNvbnRyb2xsZXJcIik7XHJcbnZhciBpbmhlcml0cyA9IHJlcXVpcmUoXCJpbmhlcml0c1wiKTtcclxudmFyIGV4dGVuZCA9IHJlcXVpcmUoXCJleHRlbmRcIik7XHJcblxyXG4vKipcclxuICovXHJcbmZ1bmN0aW9uIFBsYXllckNoYXIoKXtcclxuXHRBY3Rvci5jYWxsKHRoaXMsIHt9LCB7fSk7XHJcblx0XHJcblx0dGhpcy5vbihcInRpY2tcIiwgdGhpcy5jb250cm9sQ2hhcmFjdGVyKTtcclxuXHR0aGlzLm9uKFwiY2FudC1tb3ZlXCIsIHRoaXMuYW5pbWF0ZUJ1bXApO1xyXG59XHJcbmluaGVyaXRzKFBsYXllckNoYXIsIEFjdG9yKTtcclxuZXh0ZW5kKFBsYXllckNoYXIucHJvdG90eXBlLCB7XHJcblx0aWQgOiBcIlBMQVlFUkNIQVJcIixcclxuXHRsb2NhdGlvbiA6IG5ldyBUSFJFRS5WZWN0b3IzKCksXHJcblx0XHJcblx0c3ByaXRlOiBudWxsLFxyXG5cdFxyXG5cdHJlc2V0IDogZnVuY3Rpb24oKSB7XHJcblx0XHR0aGlzLmxvY2F0aW9uLnNldCgwLCAwLCAwKTtcclxuXHR9LFxyXG5cdFxyXG5cdHdhcnBBd2F5IDogZnVuY3Rpb24oYW5pbVR5cGUpIHtcclxuXHRcdGNvbnNvbGUud2FybihcIndhcnBBd2F5IGlzIG5vdCB5ZXQgaW1wbGVtZW50ZWQhXCIpO1xyXG5cdH0sXHJcblx0XHJcblx0d2FycFRvIDogZnVuY3Rpb24od2FycGRlZikge1xyXG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xyXG5cdFx0dGhpcy5sb2NhdGlvbi5zZXQod2FycGRlZi5sb2NbMF0sIHdhcnBkZWYubG9jWzFdLCB3YXJwZGVmLmxheWVyKTtcclxuXHRcdFxyXG5cdFx0aWYgKHdhcnBkZWYuYW5pbSlcclxuXHRcdFx0Y29udHJvbGxlci5wdXNoSW5wdXRDb250ZXh0KFwiY3V0c2NlbmVcIik7XHJcblx0XHQvL1RPRE8gd2FycGRlZi5hbmltXHJcblx0XHRcclxuXHRcdHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcclxuXHRcdFx0c3dpdGNoKE51bWJlcih3YXJwZGVmLmFuaW0pKSB7IC8vV2FycCBhbmltYXRpb25cclxuXHRcdFx0XHRjYXNlIDE6IHNlbGYuYXZhdGFyX25vZGUucG9zaXRpb24ueiArPSAxOyBicmVhazsgLy8gV2FsayB1cFxyXG5cdFx0XHRcdGNhc2UgMjogc2VsZi5hdmF0YXJfbm9kZS5wb3NpdGlvbi56IC09IDE7IGJyZWFrOyAvLyBXYWxrIGRvd25cclxuXHRcdFx0XHRjYXNlIDM6IHNlbGYuYXZhdGFyX25vZGUucG9zaXRpb24ueCAtPSAxOyBicmVhazsgLy8gV2FsayBsZWZ0XHJcblx0XHRcdFx0Y2FzZSA0OiBzZWxmLmF2YXRhcl9ub2RlLnBvc2l0aW9uLnggKz0gMTsgYnJlYWs7IC8vIFdhbGsgZG93blxyXG5cdFx0XHRcdGNhc2UgNTogc2VsZi5hdmF0YXJfbm9kZS5wb3NpdGlvbi55ICs9IDE1OyBicmVhazsgLy8gV2FycCBpblxyXG5cdFx0XHR9XHJcblx0XHR9LCAwKTtcclxuXHRcdFxyXG5cdFx0Y3VycmVudE1hcC5xdWV1ZUZvck1hcFN0YXJ0KGZ1bmN0aW9uKCl7XHJcblx0XHRcdGNvbnNvbGUubG9nKFwiV0FSUCBERUZcIiwgd2FycGRlZik7XHJcblx0XHRcdHZhciBhbmltTmFtZSA9IG51bGw7XHJcblx0XHRcdHZhciB4ID0gc2VsZi5sb2NhdGlvbi54O1xyXG5cdFx0XHR2YXIgeSA9IHNlbGYubG9jYXRpb24ueTtcclxuXHRcdFx0dmFyIGxheWVyID0gc2VsZi5sb2NhdGlvbi56O1xyXG5cdFx0XHR2YXIgeV9vZmYgPSAwO1xyXG5cdFx0XHR2YXIgbXNwZCA9IDEsIGFzcGQgPSAxOyAvL21vdmVtZW50IHNwZWVkLCBhbmltYXRpb24gc3BlZWRcclxuXHRcdFx0dmFyIGFuaW1FbmRFdmVudCA9IFwibW92ZWRcIjtcclxuXHRcdFx0XHJcblx0XHRcdHN3aXRjaChOdW1iZXIod2FycGRlZi5hbmltKSkgeyAvL1dhcnAgYW5pbWF0aW9uXHJcblx0XHRcdFx0Y2FzZSAwOiBicmVhazsgLy8gQXBwZWFyXHJcblx0XHRcdFx0Y2FzZSAxOiB5Kys7IGFuaW1OYW1lID0gXCJ3YWxrXCI7IG1zcGQgPSAwLjM1OyBhc3BkID0gMC4zNTsgYnJlYWs7IC8vIFdhbGsgdXBcclxuXHRcdFx0XHRjYXNlIDI6IHktLTsgYW5pbU5hbWUgPSBcIndhbGtcIjsgbXNwZCA9IDAuMzU7IGFzcGQgPSAwLjM1OyBicmVhazsgLy8gV2FsayBkb3duXHJcblx0XHRcdFx0Y2FzZSAzOiB4LS07IGFuaW1OYW1lID0gXCJ3YWxrXCI7IG1zcGQgPSAwLjM1OyBhc3BkID0gMC4zNTsgYnJlYWs7IC8vIFdhbGsgbGVmdFxyXG5cdFx0XHRcdGNhc2UgNDogeCsrOyBhbmltTmFtZSA9IFwid2Fsa1wiOyBtc3BkID0gMC4zNTsgYXNwZCA9IDAuMzU7IGJyZWFrOyAvLyBXYWxrIGRvd25cclxuXHRcdFx0XHRjYXNlIDU6IC8vIFdhcnAgaW5cclxuXHRcdFx0XHRcdGFuaW1OYW1lID0gXCJ3YXJwX2luXCI7IFxyXG5cdFx0XHRcdFx0eV9vZmYgPSAxNTsgYW5pbUVuZEV2ZW50ID0gXCJhbmltLWVuZFwiO1xyXG5cdFx0XHRcdFx0bXNwZCA9IDAuMjU7IGFzcGQgPSAxOyBcclxuXHRcdFx0XHRcdGJyZWFrOyBcclxuXHRcdFx0XHRkZWZhdWx0OiBcclxuXHRcdFx0XHRcdGNvbnNvbGUud2FybihcIklMTEVHQUwgV0FSUCBBTklNQVRJT046XCIsIHdhcnBkZWYuYW5pbSk7XHJcblx0XHRcdH1cclxuXHRcdFx0XHJcblx0XHRcdHZhciBzcmMgPSBzZWxmLmxvY2F0aW9uO1xyXG5cdFx0XHR2YXIgc3RhdGUgPSBzZWxmLl9pbml0UGF0aGluZ1N0YXRlKCk7XHJcblx0XHRcdFxyXG5cdFx0XHRpZiAoc3JjLngteCB8fCB5LXNyYy55KSBcclxuXHRcdFx0XHRzZWxmLmZhY2luZy5zZXQoeC1zcmMueCwgMCwgc3JjLnkteSk7XHJcblx0XHRcdGVsc2VcclxuXHRcdFx0XHRzZWxmLmZhY2luZy5zZXQoMCwgMCwgMSk7XHJcblx0XHRcdFxyXG5cdFx0XHRzdGF0ZS5zcmNMb2NDLnNldCh4LCB5LCBsYXllcik7XHJcblx0XHRcdHN0YXRlLnNyY0xvYzMuc2V0KGN1cnJlbnRNYXAuZ2V0M0RUaWxlTG9jYXRpb24oeCwgeSwgbGF5ZXIpKS55ICs9IHlfb2ZmO1xyXG5cdFx0XHRzdGF0ZS5kZXN0TG9jQy5zZXQoc3JjKTtcclxuXHRcdFx0c3RhdGUuZGVzdExvYzMuc2V0KGN1cnJlbnRNYXAuZ2V0M0RUaWxlTG9jYXRpb24oc3JjKSk7XHJcblx0XHRcdHN0YXRlLmRlbHRhID0gMDtcclxuXHRcdFx0c3RhdGUubW92aW5nID0gdHJ1ZTtcclxuXHRcdFx0c3RhdGUuc3BlZWQgPSBtc3BkO1xyXG5cdFx0XHRcclxuXHRcdFx0c2VsZi5wbGF5QW5pbWF0aW9uKGFuaW1OYW1lLCB7IHNwZWVkOiBhc3BkIH0pO1xyXG5cdFx0XHRzZWxmLm9uY2UoYW5pbUVuZEV2ZW50LCBmdW5jdGlvbihhbmltYXRpb25OYW1lKXtcclxuXHRcdFx0XHRjb25zb2xlLmxvZyhcIlBvcCFcIik7XHJcblx0XHRcdFx0Y29udHJvbGxlci5wb3BJbnB1dENvbnRleHQoXCJjdXRzY2VuZVwiKTtcclxuXHRcdFx0fSk7XHJcblx0XHRcdC8vc2VsZi5hdmF0YXJfbm9kZS5wb3NpdGlvbi5zZXQoIGN1cnJlbnRNYXAuZ2V0M0RUaWxlTG9jYXRpb24oc2VsZi5sb2NhdGlvbikgKTtcclxuXHRcdH0pO1xyXG5cdH0sXHJcblx0XHJcblx0Y29udHJvbFRpbWVvdXQ6IDAuMCxcclxuXHRjb250cm9sQ2hhcmFjdGVyIDogZnVuY3Rpb24oZGVsdGEpIHtcclxuXHRcdHZhciB5ID0gKChjb250cm9sbGVyLmlzRG93bihcIlVwXCIsIFwiZ2FtZVwiKSk/IC0xOjApICsgKChjb250cm9sbGVyLmlzRG93bihcIkRvd25cIiwgXCJnYW1lXCIpKT8gMTowKTtcclxuXHRcdHZhciB4ID0gKChjb250cm9sbGVyLmlzRG93bihcIkxlZnRcIiwgXCJnYW1lXCIpKT8gLTE6MCkgKyAoKGNvbnRyb2xsZXIuaXNEb3duKFwiUmlnaHRcIiwgXCJnYW1lXCIpKT8gMTowKTtcclxuXHRcdFxyXG5cdFx0aWYgKGNvbnRyb2xsZXIuaXNEb3duT25jZShcIkludGVyYWN0XCIsIFwiZ2FtZVwiKSAmJiAhdGhpcy5faW5pdFBhdGhpbmdTdGF0ZSgpLm1vdmluZykge1xyXG5cdFx0XHRjdXJyZW50TWFwLmRpc3BhdGNoKFxyXG5cdFx0XHRcdHRoaXMubG9jYXRpb24ueCAtIHRoaXMuZmFjaW5nLngsIHRoaXMubG9jYXRpb24ueSArIHRoaXMuZmFjaW5nLnosIFxyXG5cdFx0XHRcdFwiaW50ZXJhY3RlZFwiLCB0aGlzLmZhY2luZyk7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdHZhciBydW4gPSBjb250cm9sbGVyLmlzRG93bihcIlJ1blwiLCBcImdhbWVcIik7XHJcblx0XHRcclxuXHRcdGlmICgoeSB8fCB4KSAmJiAhKHggJiYgeSkpIHsgLy9vbmUsIGJ1dCBub3QgYm90aFxyXG5cdFx0XHRpZiAodGhpcy5jb250cm9sVGltZW91dCA8IDEpIHtcclxuXHRcdFx0XHR0aGlzLmNvbnRyb2xUaW1lb3V0ICs9IENPTkZJRy50aW1lb3V0LndhbGtDb250cm9sICogZGVsdGE7XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0aWYgKCF0aGlzLl9pbml0UGF0aGluZ1N0YXRlKCkubW92aW5nKSB7XHJcblx0XHRcdFx0XHR0aGlzLmZhY2VEaXIoeCwgeSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdGlmICghdGhpcy5faW5pdFBhdGhpbmdTdGF0ZSgpLm1vdmluZykge1xyXG5cdFx0XHRcdFx0dGhpcy5tb3ZlVG8odGhpcy5sb2NhdGlvbi54K3gsIHRoaXMubG9jYXRpb24ueSt5LCB7XHJcblx0XHRcdFx0XHRcdHNwZWVkOiAocnVuKT8gMiA6IDEsXHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdC8vVGhpcyBtYWtlcyBpdCBzbyB5b3UgY2FuIHRhcCBhIGRpcmVjdGlvbiB0byBmYWNlLCBpbnN0ZWFkIG9mIGp1c3QgYWx3YXlzIHdhbGtpbmcgaW4gc2FpZCBkaXJlY3Rpb25cclxuXHRcdFx0aWYgKHRoaXMuY29udHJvbFRpbWVvdXQgPiAwKVxyXG5cdFx0XHRcdHRoaXMuY29udHJvbFRpbWVvdXQgLT0gQ09ORklHLnRpbWVvdXQud2Fsa0NvbnRyb2wgKiBkZWx0YTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdH0sXHJcblx0XHJcblx0YW5pbWF0ZUJ1bXAgOiBmdW5jdGlvbihzcmN4LCBzcmN5LCB4LCB5LCByZWFzb24pIHtcclxuXHRcdC8vIGNvbnNvbGUud2Fybih0aGlzLmlkLCBcIjogQ2Fubm90IHdhbGsgdG8gbG9jYXRpb25cIiwgXCIoXCIreCtcIixcIit5K1wiKVwiKTtcclxuXHRcdHRoaXMucGxheUFuaW1hdGlvbihcImJ1bXBcIiwgeyBzdG9wTmV4dFRyYW5zaXRpb246IHRydWUgfSk7XHJcblx0fSxcclxuXHRcclxuXHRcclxuXHQvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHRpc05QQyA6IGZ1bmN0aW9uKCl7IHJldHVybiBmYWxzZTsgfSxcclxuXHRcclxuXHRfYXZhdGFyX2xvYWRTcHJpdGUgOiBmdW5jdGlvbihtYXAsIHRleHR1cmUpIHtcclxuXHRcdHZhciB1cmwgPSBCQVNFVVJMK1wiL2ltZy9wY3MvXCIrIGdhbWVTdGF0ZS5wbGF5ZXJTcHJpdGU7XHJcblx0XHR2YXIgcmVzID0gL14oW15cXFtdKylcXFsoW15cXF1dKylcXF0ucG5nJC8uZXhlYyh1cmwpO1xyXG5cdFx0XHJcblx0XHR2YXIgbmFtZSA9IHJlc1sxXTtcclxuXHRcdHZhciBmb3JtYXQgPSByZXNbMl07XHJcblx0XHRcclxuXHRcdHZhciBpbWcgPSBuZXcgSW1hZ2UoKTtcclxuXHRcdGZvcm1hdCA9IHRoaXMuZ2V0U3ByaXRlRm9ybWF0KGZvcm1hdCk7XHJcblx0XHR0aGlzLl9fb25Mb2FkU3ByaXRlKGltZywgZm9ybWF0LCB0ZXh0dXJlKTtcclxuXHRcdGltZy5zcmMgPSB1cmw7XHJcblx0fSxcclxuXHRcclxuXHQvLyBOZXV0ZXIgdGhlIGxvY2F0aW9uIG5vcm1pbGl6YXRpb24gZm9yIHRoaXMga2luZCBvZiBldmVudFxyXG5cdF9ub3JtYWxpemVMb2NhdGlvbiA6IGZ1bmN0aW9uKCkge30sXHJcblx0XHJcbn0pO1xyXG5tb2R1bGUuZXhwb3J0cyA9IFBsYXllckNoYXI7XHJcbiIsIi8vIHRHYWxsZXJ5LmpzXHJcbi8vIERlZmluZXMgdGhlIGJhc2UgZXZlbnQgdGhhdCBhY3RvcnMgaGF2ZSBpbiB0aGUgdEdhbGxlcnkgdGVzdCBtYXAuXHJcblxyXG52YXIgaW5oZXJpdHMgPSByZXF1aXJlKFwiaW5oZXJpdHNcIik7XHJcbnZhciBleHRlbmQgPSByZXF1aXJlKFwiZXh0ZW5kXCIpO1xyXG5cclxudmFyIEFjdG9yID0gcmVxdWlyZShcInRwcC1hY3RvclwiKTtcclxudmFyIE1lYW5kZXJCZWhhdiA9IG5ldyByZXF1aXJlKFwidHBwLWJlaGF2aW9yXCIpLk1lYW5kZXI7XHJcbnZhciBUYWxraW5nQmVoYXYgPSBuZXcgcmVxdWlyZShcInRwcC1iZWhhdmlvclwiKS5UYWxraW5nO1xyXG5cclxuZnVuY3Rpb24gQWN0b3JHYWxhKGJhc2UsIGV4dCkge1xyXG5cdGV4dCA9IGV4dGVuZCh7XHJcblx0XHRsb2NhdGlvbjogXCJyYW5kXCIsXHJcblx0XHRvbkV2ZW50czoge1xyXG5cdFx0XHRpbnRlcmFjdGVkOiBmdW5jdGlvbigpIHtcclxuXHRcdFx0XHR2YXIgc2VsZiA9IHRoaXM7XHJcblx0XHRcdFx0JChcIiNzdGF0dXNiYXJcIikuaHRtbChcIlRoaXMgaXMgXCIrdGhpcy5uYW1lK1wiISAoXCIrdGhpcy5pZCtcIilcIik7XHJcblx0XHRcdFx0dmFyIGRsb2cgPSBzZWxmLmRpYWxvZyB8fCBbXHJcblx0XHRcdFx0XHRcIlwiK3RoaXMubmFtZStcIiB3YXZlcyBhdCB5b3UgaW4gZ3JlZXRpbmcgYmVmb3JlIGNvbnRpbnVpbmcgdG8gbWVhbmRlciBhYm91dCB0aGUgR2FsbGVyeS5cIlxyXG5cdFx0XHRcdF07XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0VUkuc2hvd1RleHRCb3goc2VsZi5kaWFsb2dfdHlwZSwgZGxvZywgeyBjb21wbGV0ZTogZnVuY3Rpb24oKXtcclxuXHRcdFx0XHRcdHNlbGYuYmVoYXZpb3JTdGFjay5wb3AoKTtcclxuXHRcdFx0XHR9fSk7XHJcblx0XHRcdFx0c2VsZi5iZWhhdmlvclN0YWNrLnB1c2goVGFsa2luZ0JlaGF2KTtcclxuXHRcdFx0fSxcclxuXHRcdH0sXHJcblx0XHRcclxuXHRcdGRpYWxvZ190eXBlOiBcInRleHRcIixcclxuXHRcdGRpYWxvZzogbnVsbCxcclxuXHRcdFxyXG5cdFx0YmVoYXZpb3JTdGFjazogW25ldyBNZWFuZGVyQmVoYXYoKV0sXHJcblx0XHRcclxuXHRcdHNob3VsZEFwcGVhcjogZnVuY3Rpb24oKSB7IHJldHVybiB0cnVlOyB9LFxyXG5cdFx0XHJcblx0fSwgZXh0KTtcclxuXHRBY3Rvci5jYWxsKHRoaXMsIGJhc2UsIGV4dCk7XHJcbn1cclxuaW5oZXJpdHMoQWN0b3JHYWxhLCBBY3Rvcik7XHJcblxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBBY3RvckdhbGE7IiwiLy8gdHJpZ2dlci5qc1xyXG4vLyBEZWZpbmVzIGEgdHJpZ2dlciB0aWxlKHMpIHVzZWQgdGhyb3VnaG91dCB0aGUgcGFya1xyXG5cclxudmFyIEV2ZW50ID0gcmVxdWlyZShcInRwcC1ldmVudFwiKTtcclxudmFyIGluaGVyaXRzID0gcmVxdWlyZShcImluaGVyaXRzXCIpO1xyXG52YXIgZXh0ZW5kID0gcmVxdWlyZShcImV4dGVuZFwiKTtcclxuXHJcbi8qKlxyXG4gKiBBIHRyaWdnZXIgaXMgYSB0aWxlIHRoYXQsIHdoZW4gc3RlcHBlZCB1cG9uLCB3aWxsIHRyaWdnZXIgc29tZSBldmVudC5cclxuICogVGhlIG1vc3QgY29tbW9uIGV2ZW50IHRpZ2dlcmVkIGlzIGEgd2FycGluZyB0byBhbm90aGVyIG1hcCwgZm9yIHdoaWNoXHJcbiAqIHRoZSBzdWJjbGFzcyBXYXJwIGlzIGRlc2lnbmVkIGZvci5cclxuICpcclxuICogVHJpZ2dlcnMgbWF5IHRha2UgdXAgbW9yZSB0aGFuIG9uZSBzcGFjZS5cclxuICovXHJcbmZ1bmN0aW9uIFRyaWdnZXIoYmFzZSwgb3B0cykge1xyXG5cdEV2ZW50LmNhbGwodGhpcywgYmFzZSwgb3B0cyk7XHJcblx0XHJcblx0dGhpcy5vbihcImVudGVyZWQtdGlsZVwiLCB0aGlzLm9uVHJpZ2dlckVudGVyKTtcclxuXHR0aGlzLm9uKFwibGVhdmluZy10aWxlXCIsIHRoaXMub25UcmlnZ2VyTGVhdmUpO1xyXG59XHJcbmluaGVyaXRzKFRyaWdnZXIsIEV2ZW50KTtcclxuZXh0ZW5kKFRyaWdnZXIucHJvdG90eXBlLCB7XHJcblx0XHJcblx0b25UcmlnZ2VyRW50ZXIgOiBmdW5jdGlvbihkaXIpIHtcclxuXHRcdGNvbnNvbGUubG9nKFwiVHJpZ2dlcmVkIVwiKTtcclxuXHR9LFxyXG5cdG9uVHJpZ2dlckxlYXZlIDogZnVuY3Rpb24oZGlyKSB7XHJcblx0XHRcclxuXHR9LFxyXG59KTtcclxubW9kdWxlLmV4cG9ydHMgPSBUcmlnZ2VyO1xyXG4iLCIvLyB3YXJwLmpzXHJcbi8vIERlZmluZXMgYSB3YXJwIHRpbGUgdXNlZCB0aHJvdWdob3V0IHRoZSBwYXJrLlxyXG5cclxudmFyIFRyaWdnZXIgPSByZXF1aXJlKFwidHBwLXRyaWdnZXJcIik7XHJcbnZhciBpbmhlcml0cyA9IHJlcXVpcmUoXCJpbmhlcml0c1wiKTtcclxudmFyIGV4dGVuZCA9IHJlcXVpcmUoXCJleHRlbmRcIik7XHJcblxyXG4vKipcclxuICogQSB3YXJwIGlzIGFuIGV2ZW50IHRoYXQsIHdoZW4gd2Fsa2VkIHVwb24sIHdpbGwgdGFrZSB0aGUgcGxheWVyIHRvIGFub3RoZXIgbWFwIG9yXHJcbiAqIGFyZWEgd2l0aGluIHRoZSBzYW1lIG1hcC4gRGlmZmVyZW50IHR5cGVzIG9mIHdhcnBzIGV4aXN0LCByYW5naW5nIGZyb20gdGhlIHN0YW5kYXJkXHJcbiAqIGRvb3Igd2FycCB0byB0aGUgdGVsZXBvcnQgd2FycC4gV2FycHMgY2FuIGJlIHRvbGQgdG8gYWN0aXZhdGUgdXBvbiBzdGVwcGluZyB1cG9uIHRoZW1cclxuICogb3IgYWN0aXZhdGUgdXBvbiBzdGVwcGluZyBvZmYgYSBjZXJ0YWluIGRpcmVjdGlvbi5cclxuICovXHJcbmZ1bmN0aW9uIFdhcnAoYmFzZSwgb3B0cykge1xyXG5cdFRyaWdnZXIuY2FsbCh0aGlzLCBiYXNlLCBvcHRzKTtcclxuXHRcclxufVxyXG5pbmhlcml0cyhXYXJwLCBUcmlnZ2VyKTtcclxuZXh0ZW5kKFdhcnAucHJvdG90eXBlLCB7XHJcblx0c291bmQ6IFwiZXhpdF93YWxrXCIsXHJcblx0ZXhpdF90bzogbnVsbCxcclxuXHRcclxuXHRvblRyaWdnZXJFbnRlciA6IGZ1bmN0aW9uKGRpcikge1xyXG5cdFx0U291bmRNYW5hZ2VyLnBsYXlTb3VuZCh0aGlzLnNvdW5kKTtcclxuXHRcdGlmICghdGhpcy5leGl0X3RvKSByZXR1cm47XHJcblx0XHRNYXBNYW5hZ2VyLnRyYW5zaXRpb25Ubyh0aGlzLmV4aXRfdG8ubWFwLCB0aGlzLmV4aXRfdG8ud2FycCk7XHJcblx0fSxcclxufSk7XHJcbm1vZHVsZS5leHBvcnRzID0gV2FycDsiXX0=
