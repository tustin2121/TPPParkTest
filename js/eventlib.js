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

},{"extend":"extend","inherits":"inherits"}],"extend":[function(require,module,exports){
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


},{"../model/spritemodel.js":2,"extend":"extend","inherits":"inherits","tpp-actor-animations":"tpp-actor-animations","tpp-event":"tpp-event"}],"tpp-behavior":[function(require,module,exports){
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
	__ui_fired: false,
	
	// reset: function() { this.__ui_fired = false; },
	
	tick: function(me, delta) {
		if (!this.__ui_fired) {
			UI.showTextBox(this.dialog_type, this.dialog, {
				complete: function() {
					me.behaviorStack.pop();
					this.__ui_fired = false;
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

},{"extend":"extend","inherits":"inherits","tpp-actor":"tpp-actor","tpp-controller":"tpp-controller"}],"tpp-test-gallery":[function(require,module,exports){
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
				$("#statusbar").html("This is "+this.name+"! ("+this.id+")");
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlc1xcYnJvd3NlcmlmeVxcbm9kZV9tb2R1bGVzXFxicm93c2VyLXBhY2tcXF9wcmVsdWRlLmpzIiwibm9kZV9tb2R1bGVzXFxicm93c2VyaWZ5XFxub2RlX21vZHVsZXNcXGV2ZW50c1xcZXZlbnRzLmpzIiwic3JjXFxqc1xcbW9kZWxcXHNwcml0ZW1vZGVsLmpzIiwibm9kZV9tb2R1bGVzXFxleHRlbmRcXGluZGV4LmpzIiwibm9kZV9tb2R1bGVzXFxpbmhlcml0c1xcaW5oZXJpdHNfYnJvd3Nlci5qcyIsInNyY1xcanNcXGV2ZW50c1xcYWN0b3JfYW5pbWF0aW9ucyIsInNyY1xcanNcXGV2ZW50c1xcYWN0b3IiLCJzcmNcXGpzXFxldmVudHNcXGJlaGF2aW9yIiwic3JjXFxqc1xcbWFuYWdlcnNcXGNvbnRyb2xsZXIiLCJzcmNcXGpzXFxldmVudHNcXGV2ZW50Iiwic3JjXFxqc1xcZXZlbnRzXFxwbGF5ZXItY2hhcmFjdGVyIiwic3JjXFxqc1xcZXZlbnRzXFx0R2FsbGVyeSIsInNyY1xcanNcXGV2ZW50c1xcdHJpZ2dlciIsInNyY1xcanNcXGV2ZW50c1xcd2FycCJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN1NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdTQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbm1CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaktBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbmZ1bmN0aW9uIEV2ZW50RW1pdHRlcigpIHtcbiAgdGhpcy5fZXZlbnRzID0gdGhpcy5fZXZlbnRzIHx8IHt9O1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSB0aGlzLl9tYXhMaXN0ZW5lcnMgfHwgdW5kZWZpbmVkO1xufVxubW9kdWxlLmV4cG9ydHMgPSBFdmVudEVtaXR0ZXI7XG5cbi8vIEJhY2t3YXJkcy1jb21wYXQgd2l0aCBub2RlIDAuMTAueFxuRXZlbnRFbWl0dGVyLkV2ZW50RW1pdHRlciA9IEV2ZW50RW1pdHRlcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fZXZlbnRzID0gdW5kZWZpbmVkO1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fbWF4TGlzdGVuZXJzID0gdW5kZWZpbmVkO1xuXG4vLyBCeSBkZWZhdWx0IEV2ZW50RW1pdHRlcnMgd2lsbCBwcmludCBhIHdhcm5pbmcgaWYgbW9yZSB0aGFuIDEwIGxpc3RlbmVycyBhcmVcbi8vIGFkZGVkIHRvIGl0LiBUaGlzIGlzIGEgdXNlZnVsIGRlZmF1bHQgd2hpY2ggaGVscHMgZmluZGluZyBtZW1vcnkgbGVha3MuXG5FdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycyA9IDEwO1xuXG4vLyBPYnZpb3VzbHkgbm90IGFsbCBFbWl0dGVycyBzaG91bGQgYmUgbGltaXRlZCB0byAxMC4gVGhpcyBmdW5jdGlvbiBhbGxvd3Ncbi8vIHRoYXQgdG8gYmUgaW5jcmVhc2VkLiBTZXQgdG8gemVybyBmb3IgdW5saW1pdGVkLlxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5zZXRNYXhMaXN0ZW5lcnMgPSBmdW5jdGlvbihuKSB7XG4gIGlmICghaXNOdW1iZXIobikgfHwgbiA8IDAgfHwgaXNOYU4obikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCduIG11c3QgYmUgYSBwb3NpdGl2ZSBudW1iZXInKTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gbjtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBlciwgaGFuZGxlciwgbGVuLCBhcmdzLCBpLCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gSWYgdGhlcmUgaXMgbm8gJ2Vycm9yJyBldmVudCBsaXN0ZW5lciB0aGVuIHRocm93LlxuICBpZiAodHlwZSA9PT0gJ2Vycm9yJykge1xuICAgIGlmICghdGhpcy5fZXZlbnRzLmVycm9yIHx8XG4gICAgICAgIChpc09iamVjdCh0aGlzLl9ldmVudHMuZXJyb3IpICYmICF0aGlzLl9ldmVudHMuZXJyb3IubGVuZ3RoKSkge1xuICAgICAgZXIgPSBhcmd1bWVudHNbMV07XG4gICAgICBpZiAoZXIgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgICB0aHJvdyBlcjsgLy8gVW5oYW5kbGVkICdlcnJvcicgZXZlbnRcbiAgICAgIH1cbiAgICAgIHRocm93IFR5cGVFcnJvcignVW5jYXVnaHQsIHVuc3BlY2lmaWVkIFwiZXJyb3JcIiBldmVudC4nKTtcbiAgICB9XG4gIH1cblxuICBoYW5kbGVyID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIGlmIChpc1VuZGVmaW5lZChoYW5kbGVyKSlcbiAgICByZXR1cm4gZmFsc2U7XG5cbiAgaWYgKGlzRnVuY3Rpb24oaGFuZGxlcikpIHtcbiAgICBzd2l0Y2ggKGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIC8vIGZhc3QgY2FzZXNcbiAgICAgIGNhc2UgMTpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAzOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdLCBhcmd1bWVudHNbMl0pO1xuICAgICAgICBicmVhaztcbiAgICAgIC8vIHNsb3dlclxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICAgICAgYXJncyA9IG5ldyBBcnJheShsZW4gLSAxKTtcbiAgICAgICAgZm9yIChpID0gMTsgaSA8IGxlbjsgaSsrKVxuICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICBoYW5kbGVyLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH1cbiAgfSBlbHNlIGlmIChpc09iamVjdChoYW5kbGVyKSkge1xuICAgIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgYXJncyA9IG5ldyBBcnJheShsZW4gLSAxKTtcbiAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcblxuICAgIGxpc3RlbmVycyA9IGhhbmRsZXIuc2xpY2UoKTtcbiAgICBsZW4gPSBsaXN0ZW5lcnMubGVuZ3RoO1xuICAgIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKylcbiAgICAgIGxpc3RlbmVyc1tpXS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBtO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBUbyBhdm9pZCByZWN1cnNpb24gaW4gdGhlIGNhc2UgdGhhdCB0eXBlID09PSBcIm5ld0xpc3RlbmVyXCIhIEJlZm9yZVxuICAvLyBhZGRpbmcgaXQgdG8gdGhlIGxpc3RlbmVycywgZmlyc3QgZW1pdCBcIm5ld0xpc3RlbmVyXCIuXG4gIGlmICh0aGlzLl9ldmVudHMubmV3TGlzdGVuZXIpXG4gICAgdGhpcy5lbWl0KCduZXdMaXN0ZW5lcicsIHR5cGUsXG4gICAgICAgICAgICAgIGlzRnVuY3Rpb24obGlzdGVuZXIubGlzdGVuZXIpID9cbiAgICAgICAgICAgICAgbGlzdGVuZXIubGlzdGVuZXIgOiBsaXN0ZW5lcik7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgLy8gT3B0aW1pemUgdGhlIGNhc2Ugb2Ygb25lIGxpc3RlbmVyLiBEb24ndCBuZWVkIHRoZSBleHRyYSBhcnJheSBvYmplY3QuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gbGlzdGVuZXI7XG4gIGVsc2UgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgLy8gSWYgd2UndmUgYWxyZWFkeSBnb3QgYW4gYXJyYXksIGp1c3QgYXBwZW5kLlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5wdXNoKGxpc3RlbmVyKTtcbiAgZWxzZVxuICAgIC8vIEFkZGluZyB0aGUgc2Vjb25kIGVsZW1lbnQsIG5lZWQgdG8gY2hhbmdlIHRvIGFycmF5LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IFt0aGlzLl9ldmVudHNbdHlwZV0sIGxpc3RlbmVyXTtcblxuICAvLyBDaGVjayBmb3IgbGlzdGVuZXIgbGVha1xuICBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSAmJiAhdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCkge1xuICAgIHZhciBtO1xuICAgIGlmICghaXNVbmRlZmluZWQodGhpcy5fbWF4TGlzdGVuZXJzKSkge1xuICAgICAgbSA9IHRoaXMuX21heExpc3RlbmVycztcbiAgICB9IGVsc2Uge1xuICAgICAgbSA9IEV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzO1xuICAgIH1cblxuICAgIGlmIChtICYmIG0gPiAwICYmIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGggPiBtKSB7XG4gICAgICB0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkID0gdHJ1ZTtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJyhub2RlKSB3YXJuaW5nOiBwb3NzaWJsZSBFdmVudEVtaXR0ZXIgbWVtb3J5ICcgK1xuICAgICAgICAgICAgICAgICAgICAnbGVhayBkZXRlY3RlZC4gJWQgbGlzdGVuZXJzIGFkZGVkLiAnICtcbiAgICAgICAgICAgICAgICAgICAgJ1VzZSBlbWl0dGVyLnNldE1heExpc3RlbmVycygpIHRvIGluY3JlYXNlIGxpbWl0LicsXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGgpO1xuICAgICAgaWYgKHR5cGVvZiBjb25zb2xlLnRyYWNlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIC8vIG5vdCBzdXBwb3J0ZWQgaW4gSUUgMTBcbiAgICAgICAgY29uc29sZS50cmFjZSgpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbiA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub25jZSA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICB2YXIgZmlyZWQgPSBmYWxzZTtcblxuICBmdW5jdGlvbiBnKCkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgZyk7XG5cbiAgICBpZiAoIWZpcmVkKSB7XG4gICAgICBmaXJlZCA9IHRydWU7XG4gICAgICBsaXN0ZW5lci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgfVxuXG4gIGcubGlzdGVuZXIgPSBsaXN0ZW5lcjtcbiAgdGhpcy5vbih0eXBlLCBnKTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8vIGVtaXRzIGEgJ3JlbW92ZUxpc3RlbmVyJyBldmVudCBpZmYgdGhlIGxpc3RlbmVyIHdhcyByZW1vdmVkXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIGxpc3QsIHBvc2l0aW9uLCBsZW5ndGgsIGk7XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgbGlzdCA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgbGVuZ3RoID0gbGlzdC5sZW5ndGg7XG4gIHBvc2l0aW9uID0gLTE7XG5cbiAgaWYgKGxpc3QgPT09IGxpc3RlbmVyIHx8XG4gICAgICAoaXNGdW5jdGlvbihsaXN0Lmxpc3RlbmVyKSAmJiBsaXN0Lmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcbiAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuXG4gIH0gZWxzZSBpZiAoaXNPYmplY3QobGlzdCkpIHtcbiAgICBmb3IgKGkgPSBsZW5ndGg7IGktLSA+IDA7KSB7XG4gICAgICBpZiAobGlzdFtpXSA9PT0gbGlzdGVuZXIgfHxcbiAgICAgICAgICAobGlzdFtpXS5saXN0ZW5lciAmJiBsaXN0W2ldLmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcbiAgICAgICAgcG9zaXRpb24gPSBpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAocG9zaXRpb24gPCAwKVxuICAgICAgcmV0dXJuIHRoaXM7XG5cbiAgICBpZiAobGlzdC5sZW5ndGggPT09IDEpIHtcbiAgICAgIGxpc3QubGVuZ3RoID0gMDtcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgfSBlbHNlIHtcbiAgICAgIGxpc3Quc3BsaWNlKHBvc2l0aW9uLCAxKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBrZXksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICByZXR1cm4gdGhpcztcblxuICAvLyBub3QgbGlzdGVuaW5nIGZvciByZW1vdmVMaXN0ZW5lciwgbm8gbmVlZCB0byBlbWl0XG4gIGlmICghdGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApXG4gICAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICBlbHNlIGlmICh0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLy8gZW1pdCByZW1vdmVMaXN0ZW5lciBmb3IgYWxsIGxpc3RlbmVycyBvbiBhbGwgZXZlbnRzXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgZm9yIChrZXkgaW4gdGhpcy5fZXZlbnRzKSB7XG4gICAgICBpZiAoa2V5ID09PSAncmVtb3ZlTGlzdGVuZXInKSBjb250aW51ZTtcbiAgICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKGtleSk7XG4gICAgfVxuICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKCdyZW1vdmVMaXN0ZW5lcicpO1xuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgbGlzdGVuZXJzID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGxpc3RlbmVycykpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVycyk7XG4gIH0gZWxzZSB7XG4gICAgLy8gTElGTyBvcmRlclxuICAgIHdoaWxlIChsaXN0ZW5lcnMubGVuZ3RoKVxuICAgICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnNbbGlzdGVuZXJzLmxlbmd0aCAtIDFdKTtcbiAgfVxuICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciByZXQ7XG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0ID0gW107XG4gIGVsc2UgaWYgKGlzRnVuY3Rpb24odGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSBbdGhpcy5fZXZlbnRzW3R5cGVdXTtcbiAgZWxzZVxuICAgIHJldCA9IHRoaXMuX2V2ZW50c1t0eXBlXS5zbGljZSgpO1xuICByZXR1cm4gcmV0O1xufTtcblxuRXZlbnRFbWl0dGVyLmxpc3RlbmVyQ291bnQgPSBmdW5jdGlvbihlbWl0dGVyLCB0eXBlKSB7XG4gIHZhciByZXQ7XG4gIGlmICghZW1pdHRlci5fZXZlbnRzIHx8ICFlbWl0dGVyLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0ID0gMDtcbiAgZWxzZSBpZiAoaXNGdW5jdGlvbihlbWl0dGVyLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IDE7XG4gIGVsc2VcbiAgICByZXQgPSBlbWl0dGVyLl9ldmVudHNbdHlwZV0ubGVuZ3RoO1xuICByZXR1cm4gcmV0O1xufTtcblxuZnVuY3Rpb24gaXNGdW5jdGlvbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdmdW5jdGlvbic7XG59XG5cbmZ1bmN0aW9uIGlzTnVtYmVyKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ251bWJlcic7XG59XG5cbmZ1bmN0aW9uIGlzT2JqZWN0KGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ29iamVjdCcgJiYgYXJnICE9PSBudWxsO1xufVxuXG5mdW5jdGlvbiBpc1VuZGVmaW5lZChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gdm9pZCAwO1xufVxuIiwiLy8gc3ByaXRlbW9kZWwuanNcclxuLy8gQSByZWR1eCBvZiB0aGUgVEhSRUUuanMgc3ByaXRlLCBidXQgbm90IHVzaW5nIHRoZSBzcHJpdGUgcGx1Z2luXHJcblxyXG52YXIgaW5oZXJpdHMgPSByZXF1aXJlKFwiaW5oZXJpdHNcIik7XHJcbnZhciBleHRlbmQgPSByZXF1aXJlKFwiZXh0ZW5kXCIpO1xyXG5cclxuZnVuY3Rpb24gQ2hhcmFjdGVyU3ByaXRlKG9wdHMpIHtcclxuXHRpZiAoISh0aGlzIGluc3RhbmNlb2YgQ2hhcmFjdGVyU3ByaXRlKSkge1xyXG5cdFx0cmV0dXJuIG5ldyBDaGFyYWN0ZXJTcHJpdGUob3B0cyk7XHJcblx0fVxyXG5cdHZhciBnYyA9IG9wdHMuZ2MgfHwgR0MuZ2V0QmluKCk7XHJcblx0XHJcblx0b3B0cyA9IGV4dGVuZCh7XHJcblx0XHR0cmFuc3BhcmVudDogdHJ1ZSxcclxuXHRcdGFscGhhVGVzdDogdHJ1ZSxcclxuXHR9LCBvcHRzKTtcclxuXHRcclxuXHRpZiAoIW9wdHMub2Zmc2V0KSBvcHRzLm9mZnNldCA9IG5ldyBUSFJFRS5WZWN0b3IzKDAsIDAsIDApO1xyXG5cdFxyXG5cdC8vVE9ETyByZXBsYWNlIHdpdGggZ2VvbWV0cnkgd2UgY2FuIGNvbnRyb2xcclxuXHQvLyB2YXIgZ2VvbSA9IG5ldyBUSFJFRS5QbGFuZUJ1ZmZlckdlb21ldHJ5KDEsIDEpO1xyXG5cdHZhciBnZW9tID0gbmV3IENoYXJhY3RlclBsYW5lR2VvbWV0cnkob3B0cy5vZmZzZXQueCwgb3B0cy5vZmZzZXQueSwgb3B0cy5vZmZzZXQueik7XHJcblx0Z2MuY29sbGVjdChnZW9tKTtcclxuXHRcclxuXHR2YXIgbWF0ID0gbmV3IENoYXJhY3RlclNwcml0ZU1hdGVyaWFsKG9wdHMpO1xyXG5cdGdjLmNvbGxlY3QobWF0KTtcclxuXHRcclxuXHRUSFJFRS5NZXNoLmNhbGwodGhpcywgZ2VvbSwgbWF0KTtcclxuXHR0aGlzLnR5cGUgPSBcIkNoYXJhY3RlclNwcml0ZVwiO1xyXG5cdFxyXG5cdG1hdC5zY2FsZSA9IG1hdC51bmlmb3Jtcy5zY2FsZS52YWx1ZSA9IHRoaXMuc2NhbGU7XHJcbn1cclxuaW5oZXJpdHMoQ2hhcmFjdGVyU3ByaXRlLCBUSFJFRS5NZXNoKTtcclxubW9kdWxlLmV4cG9ydHMuQ2hhcmFjdGVyU3ByaXRlID0gQ2hhcmFjdGVyU3ByaXRlO1xyXG5cclxuXHJcbmZ1bmN0aW9uIENoYXJhY3RlclNwcml0ZU1hdGVyaWFsKG9wdHMpIHtcclxuXHRpZiAoISh0aGlzIGluc3RhbmNlb2YgQ2hhcmFjdGVyU3ByaXRlTWF0ZXJpYWwpKSB7XHJcblx0XHRyZXR1cm4gbmV3IENoYXJhY3RlclNwcml0ZU1hdGVyaWFsKG9wdHMpO1xyXG5cdH1cclxuXHRcclxuXHQvL1RPRE8gd3JpdGUgaXQgc28gd2hlbiB3ZSByZXBsYWNlIHRoZSB2YWx1ZXMgaGVyZSwgd2UgcmVwbGFjZSB0aGUgb25lcyBpbiB0aGUgdW5pZm9ybXNcclxuXHQvLyBPYmplY3QuZGVmaW5lUHJvcGVydGllcyh0aGlzLCB7XHJcblx0Ly8gXHR1dk9mZnNldCA6IHt9XHJcblx0Ly8gfSk7XHJcblxyXG5cdHRoaXMubWFwID0gb3B0cy5tYXAgfHwgbmV3IFRIUkVFLlRleHR1cmUoKTtcclxuXHRcclxuXHR0aGlzLnV2T2Zmc2V0ID0gb3B0cy51dk9mZnNldCB8fCB0aGlzLm1hcC5vZmZzZXQgfHwgbmV3IFRIUkVFLlZlY3RvcjIoMCwgMCk7XHJcblx0dGhpcy51dlNjYWxlID0gb3B0cy51dlNjYWxlIHx8IHRoaXMubWFwLnJlcGVhdCB8fCBuZXcgVEhSRUUuVmVjdG9yMigxLCAxKTtcclxuXHRcclxuXHR0aGlzLnJvdGF0aW9uID0gb3B0cy5yb3RhdGlvbiB8fCAwO1xyXG5cdHRoaXMuc2NhbGUgPSBvcHRzLnNjYWxlIHx8IG5ldyBUSFJFRS5WZWN0b3IyKDEsIDEpO1xyXG5cdFxyXG5cdHRoaXMuY29sb3IgPSAob3B0cy5jb2xvciBpbnN0YW5jZW9mIFRIUkVFLkNvbG9yKT8gb3B0cy5jb2xvciA6IG5ldyBUSFJFRS5Db2xvcihvcHRzLmNvbG9yKTtcclxuXHR0aGlzLm9wYWNpdHkgPSBvcHRzLm9wYWNpdHkgfHwgMTtcclxuXHRcclxuXHR2YXIgcGFyYW1zID0gdGhpcy5fY3JlYXRlTWF0UGFyYW1zKG9wdHMpO1xyXG5cdFRIUkVFLlNoYWRlck1hdGVyaWFsLmNhbGwodGhpcywgcGFyYW1zKTtcclxuXHR0aGlzLnR5cGUgPSBcIkNoYXJhY3RlclNwcml0ZU1hdGVyaWFsXCI7XHJcblx0XHJcblx0dGhpcy50cmFuc3BhcmVudCA9IChvcHRzLnRyYW5zcGFyZW50ICE9PSB1bmRlZmluZWQpPyBvcHRzLnRyYW5zcGFyZW50IDogdHJ1ZTtcclxuXHR0aGlzLmFscGhhVGVzdCA9IDAuMDU7XHJcblx0Ly8gdGhpcy5kZXB0aFdyaXRlID0gZmFsc2U7XHJcbn1cclxuaW5oZXJpdHMoQ2hhcmFjdGVyU3ByaXRlTWF0ZXJpYWwsIFRIUkVFLlNoYWRlck1hdGVyaWFsKTtcclxuZXh0ZW5kKENoYXJhY3RlclNwcml0ZU1hdGVyaWFsLnByb3RvdHlwZSwge1xyXG5cdG1hcCA6IG51bGwsXHJcblx0XHJcblx0X2NyZWF0ZU1hdFBhcmFtcyA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0dmFyIHBhcmFtcyA9IHtcclxuXHRcdFx0dW5pZm9ybXMgOiB7XHJcblx0XHRcdFx0dXZPZmZzZXQ6XHR7IHR5cGU6IFwidjJcIiwgdmFsdWU6IHRoaXMudXZPZmZzZXQgfSxcclxuXHRcdFx0XHR1dlNjYWxlOlx0eyB0eXBlOiBcInYyXCIsIHZhbHVlOiB0aGlzLnV2U2NhbGUgfSxcclxuXHRcdFx0XHRcclxuXHRcdFx0XHRyb3RhdGlvbjpcdHsgdHlwZTogXCJmXCIsIHZhbHVlOiB0aGlzLnJvdGF0aW9uIH0sXHJcblx0XHRcdFx0c2NhbGU6XHRcdHsgdHlwZTogXCJ2MlwiLCB2YWx1ZTogdGhpcy5zY2FsZSB9LFxyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdGNvbG9yOlx0XHR7IHR5cGU6IFwiY1wiLCB2YWx1ZTogdGhpcy5jb2xvciB9LFxyXG5cdFx0XHRcdG1hcDpcdFx0eyB0eXBlOiBcInRcIiwgdmFsdWU6IHRoaXMubWFwIH0sXHJcblx0XHRcdFx0b3BhY2l0eTpcdHsgdHlwZTogXCJmXCIsIHZhbHVlOiB0aGlzLm9wYWNpdHkgfSxcclxuXHRcdFx0XHRcclxuXHRcdFx0XHR6b2Zmc2V0Olx0eyB0eXBlOiBcImZcIiwgdmFsdWU6IDAgfSxcclxuXHRcdFx0XHRzaGVlcjpcdFx0eyB0eXBlOiBcIm00XCIsIHZhbHVlOiBuZXcgVEhSRUUuTWF0cml4NCgpIH0sXHJcblx0XHRcdH0sXHJcblx0XHR9O1xyXG5cdFx0XHJcblx0XHRwYXJhbXMudmVydGV4U2hhZGVyID0gVkVSVF9TSEFERVI7XHJcblx0XHRwYXJhbXMuZnJhZ21lbnRTaGFkZXIgPSBGUkFHX1NIQURFUjtcclxuXHRcdHJldHVybiBwYXJhbXM7XHJcblx0fSxcclxufSk7XHJcbm1vZHVsZS5leHBvcnRzLkNoYXJhY3RlclNwcml0ZU1hdGVyaWFsID0gQ2hhcmFjdGVyU3ByaXRlTWF0ZXJpYWw7XHJcblxyXG5cclxuXHJcbmZ1bmN0aW9uIENoYXJhY3RlclBsYW5lR2VvbWV0cnkoeG9mZiwgeW9mZiwgem9mZikge1xyXG5cdFRIUkVFLkJ1ZmZlckdlb21ldHJ5LmNhbGwodGhpcyk7XHJcblx0XHJcblx0dGhpcy50eXBlID0gXCJDaGFyYWN0ZXJQbGFuZUdlb21ldHJ5XCI7XHJcblx0XHJcblx0dmFyIHZlcnRzID0gbmV3IEZsb2F0MzJBcnJheShbXHJcblx0XHQtMC41ICsgeG9mZiwgLTAuNSArIHlvZmYsIDAgKyB6b2ZmLFxyXG5cdFx0IDAuNSArIHhvZmYsIC0wLjUgKyB5b2ZmLCAwICsgem9mZixcclxuXHRcdCAwLjUgKyB4b2ZmLCAgMC41ICsgeW9mZiwgMCArIHpvZmYsXHJcblx0XHQtMC41ICsgeG9mZiwgIDAuNSArIHlvZmYsIDAgKyB6b2ZmLFxyXG5cdF0pO1xyXG5cdHZhciBub3JtcyA9IG5ldyBGbG9hdDMyQXJyYXkoWyAwLCAxLCAxLCAgIDAsIDAsIDEsICAgMCwgMCwgMSwgICAwLCAwLCAxLCBdKTtcclxuXHR2YXIgdXZzICAgPSBuZXcgRmxvYXQzMkFycmF5KFsgMCwgMCwgICAgICAxLCAwLCAgICAgIDEsIDEsICAgICAgMCwgMSwgXSk7XHJcblx0dmFyIGZhY2VzID0gbmV3IFVpbnQxNkFycmF5KCBbIDAsIDEsIDIsICAgMCwgMiwgMyBdKTtcclxuXHRcclxuXHR0aGlzLmFkZEF0dHJpYnV0ZSggJ2luZGV4JywgbmV3IFRIUkVFLkJ1ZmZlckF0dHJpYnV0ZSggZmFjZXMsIDEgKSApO1xyXG5cdHRoaXMuYWRkQXR0cmlidXRlKCAncG9zaXRpb24nLCBuZXcgVEhSRUUuQnVmZmVyQXR0cmlidXRlKCB2ZXJ0cywgMyApICk7XHJcblx0dGhpcy5hZGRBdHRyaWJ1dGUoICdub3JtYWwnLCBuZXcgVEhSRUUuQnVmZmVyQXR0cmlidXRlKCBub3JtcywgMyApICk7XHJcblx0dGhpcy5hZGRBdHRyaWJ1dGUoICd1dicsIG5ldyBUSFJFRS5CdWZmZXJBdHRyaWJ1dGUoIHV2cywgMiApICk7XHJcblx0XHJcbn1cclxuaW5oZXJpdHMoQ2hhcmFjdGVyUGxhbmVHZW9tZXRyeSwgVEhSRUUuQnVmZmVyR2VvbWV0cnkpO1xyXG5cclxuXHJcblxyXG5cclxudmFyIFZFUlRfU0hBREVSID0gW1xyXG5cdC8vICd1bmlmb3JtIG1hdDQgbW9kZWxWaWV3TWF0cml4OycsXHJcblx0Ly8gJ3VuaWZvcm0gbWF0NCBwcm9qZWN0aW9uTWF0cml4OycsXHJcblx0J3VuaWZvcm0gZmxvYXQgcm90YXRpb247JyxcclxuXHQndW5pZm9ybSB2ZWMyIHNjYWxlOycsXHJcblx0J3VuaWZvcm0gdmVjMiB1dk9mZnNldDsnLFxyXG5cdCd1bmlmb3JtIHZlYzIgdXZTY2FsZTsnLFxyXG5cdFxyXG5cdCd1bmlmb3JtIGZsb2F0IHpvZmZzZXQ7JyxcclxuXHQndW5pZm9ybSBtYXQ0IHNoZWVyOycsXHJcblxyXG5cdC8vICdhdHRyaWJ1dGUgdmVjMiBwb3NpdGlvbjsnLFxyXG5cdC8vICdhdHRyaWJ1dGUgdmVjMiB1djsnLFxyXG5cclxuXHQndmFyeWluZyB2ZWMyIHZVVjsnLFxyXG5cclxuXHQndm9pZCBtYWluKCkgeycsXHJcblxyXG5cdFx0J3ZVViA9IHV2T2Zmc2V0ICsgdXYgKiB1dlNjYWxlOycsXHJcblxyXG5cdFx0J3ZlYzIgYWxpZ25lZFBvc2l0aW9uID0gcG9zaXRpb24ueHkgKiBzY2FsZTsnLFxyXG5cclxuXHRcdCd2ZWMyIHJvdGF0ZWRQb3NpdGlvbjsnLFxyXG5cdFx0J3JvdGF0ZWRQb3NpdGlvbi54ID0gY29zKCByb3RhdGlvbiApICogYWxpZ25lZFBvc2l0aW9uLnggLSBzaW4oIHJvdGF0aW9uICkgKiBhbGlnbmVkUG9zaXRpb24ueTsnLFxyXG5cdFx0J3JvdGF0ZWRQb3NpdGlvbi55ID0gc2luKCByb3RhdGlvbiApICogYWxpZ25lZFBvc2l0aW9uLnggKyBjb3MoIHJvdGF0aW9uICkgKiBhbGlnbmVkUG9zaXRpb24ueTsnLFxyXG5cdFx0XHJcblx0XHQvLyAnbWF0NCB6c2hlZXIgPSBtYXQ0KDEsIDAsIDAsIDAsJyxcclxuXHRcdC8vIFx0ICAgICAgICAgICAgICAgJzAsIDEsIDAsIDAsJyxcclxuXHRcdC8vIFx0ICAgICAgICAgICAgICAgJzAsIDAsIDEsIHBvc2l0aW9uLnkgKiB6b2Zmc2V0LCcsXHJcblx0XHQvLyBcdCAgICAgICAgICAgICAgICcwLCAwLCAwLCAxKTsnLFxyXG5cclxuXHRcdC8vICd2ZWM0IHNoZWVyZm9yY2UgPSBtb2RlbFZpZXdNYXRyaXggKiB2ZWM0KDAsIHBvc2l0aW9uLnksIHBvc2l0aW9uLnosIDEpOycsXHJcblx0XHRcclxuXHRcdCd2ZWM0IGZpbmFsUG9zaXRpb247JyxcclxuXHJcblx0XHQnZmluYWxQb3NpdGlvbiA9IG1vZGVsVmlld01hdHJpeCAqIHZlYzQoIDAuMCwgMC4wLCAwLjAsIDEuMCApOycsXHJcblx0XHQvLyAnZmluYWxQb3NpdGlvbi53ICs9IChzaGVlcmZvcmNlLnogLSBmaW5hbFBvc2l0aW9uLnopICogem9mZnNldDsnLFxyXG5cdFx0J2ZpbmFsUG9zaXRpb24ueHkgKz0gcm90YXRlZFBvc2l0aW9uOycsXHJcblx0XHQvLyAnZmluYWxQb3NpdGlvbiA9IHpzaGVlciAqIGZpbmFsUG9zaXRpb247JyxcclxuXHRcdCdmaW5hbFBvc2l0aW9uID0gcHJvamVjdGlvbk1hdHJpeCAqIGZpbmFsUG9zaXRpb247JyxcclxuXHRcdFxyXG5cdFx0J2dsX1Bvc2l0aW9uID0gZmluYWxQb3NpdGlvbjsnLFxyXG5cclxuXHQnfSdcclxuXS5qb2luKCAnXFxuJyApO1xyXG5cclxudmFyIEZSQUdfU0hBREVSID0gW1xyXG5cdCd1bmlmb3JtIHZlYzMgY29sb3I7JyxcclxuXHQndW5pZm9ybSBzYW1wbGVyMkQgbWFwOycsXHJcblx0J3VuaWZvcm0gZmxvYXQgb3BhY2l0eTsnLFxyXG5cclxuXHQndW5pZm9ybSB2ZWMzIGZvZ0NvbG9yOycsXHJcblx0J3VuaWZvcm0gZmxvYXQgZm9nRGVuc2l0eTsnLFxyXG5cdCd1bmlmb3JtIGZsb2F0IGZvZ05lYXI7JyxcclxuXHQndW5pZm9ybSBmbG9hdCBmb2dGYXI7JyxcclxuXHJcblx0J3ZhcnlpbmcgdmVjMiB2VVY7JyxcclxuXHJcblx0J3ZvaWQgbWFpbigpIHsnLFxyXG5cclxuXHRcdCd2ZWM0IHRleHR1cmUgPSB0ZXh0dXJlMkQoIG1hcCwgdlVWICk7JyxcclxuXHJcblx0XHQnI2lmZGVmIEFMUEhBVEVTVCcsXHJcblx0XHRcdCdpZiAoIHRleHR1cmUuYSA8IEFMUEhBVEVTVCApIGRpc2NhcmQ7JyxcclxuXHRcdCcjZW5kaWYnLFxyXG5cclxuXHRcdCdnbF9GcmFnQ29sb3IgPSB2ZWM0KCBjb2xvciAqIHRleHR1cmUueHl6LCB0ZXh0dXJlLmEgKiBvcGFjaXR5ICk7JyxcclxuXHJcblx0XHQnI2lmZGVmIFVTRV9GT0cnLFxyXG5cdFx0XHQnZmxvYXQgZGVwdGggPSBnbF9GcmFnQ29vcmQueiAvIGdsX0ZyYWdDb29yZC53OycsXHJcblx0XHRcdCdmbG9hdCBmb2dGYWN0b3IgPSAwLjA7JyxcclxuXHRcdFx0XHJcblx0XHRcdCcjaWZuZGVmIEZPR19FWFAyJywgLy9ub3RlOiBOT1QgZGVmaW5lZFxyXG5cdFx0XHRcclxuXHRcdFx0XHQnZm9nRmFjdG9yID0gc21vb3Roc3RlcCggZm9nTmVhciwgZm9nRmFyLCBkZXB0aCApOycsXHJcblx0XHRcdFx0XHJcblx0XHRcdCcjZWxzZScsXHJcblx0XHRcdFxyXG5cdFx0XHRcdCdjb25zdCBmbG9hdCBMT0cyID0gMS40NDI2OTU7JyxcclxuXHRcdFx0XHQnZmxvYXQgZm9nRmFjdG9yID0gZXhwMiggLSBmb2dEZW5zaXR5ICogZm9nRGVuc2l0eSAqIGRlcHRoICogZGVwdGggKiBMT0cyICk7JyxcclxuXHRcdFx0XHQnZm9nRmFjdG9yID0gMS4wIC0gY2xhbXAoIGZvZ0ZhY3RvciwgMC4wLCAxLjAgKTsnLFxyXG5cclxuXHRcdFx0JyNlbmRpZicsXHJcblx0XHRcdFxyXG5cdFx0XHQnZ2xfRnJhZ0NvbG9yID0gbWl4KCBnbF9GcmFnQ29sb3IsIHZlYzQoIGZvZ0NvbG9yLCBnbF9GcmFnQ29sb3IudyApLCBmb2dGYWN0b3IgKTsnLFxyXG5cclxuXHRcdCcjZW5kaWYnLFxyXG5cclxuXHQnfSdcclxuXS5qb2luKCAnXFxuJyApO1xyXG5cclxuXHJcbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHJcblxyXG5mdW5jdGlvbiBTcHJpdGVHbG93TWF0ZXJpYWwob3B0cykge1xyXG5cdGlmICghKHRoaXMgaW5zdGFuY2VvZiBTcHJpdGVHbG93TWF0ZXJpYWwpKSB7XHJcblx0XHRyZXR1cm4gbmV3IFNwcml0ZUdsb3dNYXRlcmlhbChvcHRzKTtcclxuXHR9XHJcblx0XHJcblx0Ly9UT0RPIHdyaXRlIGl0IHNvIHdoZW4gd2UgcmVwbGFjZSB0aGUgdmFsdWVzIGhlcmUsIHdlIHJlcGxhY2UgdGhlIG9uZXMgaW4gdGhlIHVuaWZvcm1zXHJcblx0Ly8gT2JqZWN0LmRlZmluZVByb3BlcnRpZXModGhpcywge1xyXG5cdC8vIFx0dXZPZmZzZXQgOiB7fVxyXG5cdC8vIH0pO1xyXG5cclxuXHR0aGlzLmNvbG9yID0gKG9wdHMuY29sb3IgaW5zdGFuY2VvZiBUSFJFRS5Db2xvcik/IG9wdHMuY29sb3IgOiBuZXcgVEhSRUUuQ29sb3Iob3B0cy5jb2xvcik7XHJcblx0Ly8gdGhpcy5vcGFjaXR5ID0gb3B0cy5vcGFjaXR5IHx8IDE7XHJcblx0XHJcblx0dmFyIHBhcmFtcyA9IHRoaXMuX2NyZWF0ZU1hdFBhcmFtcyhvcHRzKTtcclxuXHRUSFJFRS5TaGFkZXJNYXRlcmlhbC5jYWxsKHRoaXMsIHBhcmFtcyk7XHJcblx0dGhpcy50eXBlID0gXCJTcHJpdGVHbG93TWF0ZXJpYWxcIjtcclxuXHRcclxuXHR0aGlzLnRyYW5zcGFyZW50ID0gKG9wdHMudHJhbnNwYXJlbnQgIT09IHVuZGVmaW5lZCk/IG9wdHMudHJhbnNwYXJlbnQgOiB0cnVlO1xyXG5cdHRoaXMuYWxwaGFUZXN0ID0gMC4wNTtcclxuXHQvLyB0aGlzLmRlcHRoV3JpdGUgPSBmYWxzZTtcclxufVxyXG5pbmhlcml0cyhTcHJpdGVHbG93TWF0ZXJpYWwsIFRIUkVFLlNoYWRlck1hdGVyaWFsKTtcclxuZXh0ZW5kKFNwcml0ZUdsb3dNYXRlcmlhbC5wcm90b3R5cGUsIHtcclxuXHRtYXAgOiBudWxsLFxyXG5cdFxyXG5cdF9jcmVhdGVNYXRQYXJhbXMgOiBmdW5jdGlvbigpIHtcclxuXHRcdHZhciBwYXJhbXMgPSB7XHJcblx0XHRcdHVuaWZvcm1zIDoge1xyXG5cdFx0XHRcdFwiY1wiOiAgIHsgdHlwZTogXCJmXCIsIHZhbHVlOiAxLjAgfSxcclxuXHRcdFx0XHRcInBcIjogICB7IHR5cGU6IFwiZlwiLCB2YWx1ZTogMS40IH0sXHJcblx0XHRcdFx0Z2xvd0NvbG9yOiB7IHR5cGU6IFwiY1wiLCB2YWx1ZTogdGhpcy5jb2xvciB9LC8vbmV3IFRIUkVFLkNvbG9yKDB4ZmZmZjAwKSB9LFxyXG5cdFx0XHRcdC8vIHZpZXdWZWN0b3I6IHsgdHlwZTogXCJ2M1wiLCB2YWx1ZTogY2FtZXJhLnBvc2l0aW9uIH1cclxuXHRcdFx0fSxcclxuXHRcdH07XHJcblx0XHRcclxuXHRcdHBhcmFtcy52ZXJ0ZXhTaGFkZXIgPSB0aGlzLl92ZXJ0U2hhZGVyO1xyXG5cdFx0cGFyYW1zLmZyYWdtZW50U2hhZGVyID0gdGhpcy5fZnJhZ1NoYWRlcjtcclxuXHRcdHBhcmFtcy5ibGVuZGluZyA9IFRIUkVFLkFkZGl0aXZlQmxlbmRpbmc7XHJcblx0XHRyZXR1cm4gcGFyYW1zO1xyXG5cdH0sXHJcblx0XHJcblx0X3ZlcnRTaGFkZXI6IFtcclxuXHRcdC8vIFwidW5pZm9ybSB2ZWMzIHZpZXdWZWN0b3I7XCIsXHJcblx0XHRcInVuaWZvcm0gZmxvYXQgYztcIixcclxuXHRcdFwidW5pZm9ybSBmbG9hdCBwO1wiLFxyXG5cdFx0XCJ2YXJ5aW5nIGZsb2F0IGludGVuc2l0eTtcIixcclxuXHRcdFxyXG5cdFx0XCJ2b2lkIG1haW4oKSB7XCIsXHJcblx0XHRcdFwidmVjMyB2Tm9ybSA9IG5vcm1hbGl6ZSggbm9ybWFsTWF0cml4ICogbm9ybWFsICk7XCIsXHJcblx0XHRcdC8vIFwidmVjMyB2Tm9ybUNhbWVyYSA9IG5vcm1hbGl6ZSggbm9ybWFsTWF0cml4ICogdmlld1ZlY3RvciApO1wiLFxyXG5cdFx0XHRcInZlYzMgdk5vcm1DYW1lcmEgPSBub3JtYWxpemUoIG5vcm1hbE1hdHJpeCAqIG5vcm1hbGl6ZSggbW9kZWxWaWV3TWF0cml4ICogdmVjNCgwLCAwLCAxLCAxKSApLnh5eiApO1wiLFxyXG5cdFx0XHRcImludGVuc2l0eSA9IHBvdyggYyAtIGRvdCh2Tm9ybSwgdk5vcm1DYW1lcmEpLCBwICk7XCIsXHJcblx0XHRcdFxyXG5cdFx0XHRcImdsX1Bvc2l0aW9uID0gcHJvamVjdGlvbk1hdHJpeCAqIG1vZGVsVmlld01hdHJpeCAqIHZlYzQoIHBvc2l0aW9uLCAxLjAgKTtcIixcclxuXHRcdFwifVwiLFxyXG5cdF0uam9pbihcIlxcblwiKSxcclxuXHRcclxuXHRfZnJhZ1NoYWRlcjogW1xyXG5cdFx0XCJ1bmlmb3JtIHZlYzMgZ2xvd0NvbG9yO1wiLFxyXG5cdFx0XCJ2YXJ5aW5nIGZsb2F0IGludGVuc2l0eTtcIixcclxuXHRcdFxyXG5cdFx0XCJ2b2lkIG1haW4oKSB7XCIsXHJcblx0XHRcdFwidmVjMyBnbG93ID0gZ2xvd0NvbG9yICogaW50ZW5zaXR5O1wiLFxyXG5cdFx0XHRcImdsX0ZyYWdDb2xvciA9IHZlYzQoIGdsb3csIDEuMCApO1wiLFxyXG5cdFx0XCJ9XCIsXHJcblx0XS5qb2luKFwiXFxuXCIpLFxyXG59KTtcclxubW9kdWxlLmV4cG9ydHMuU3ByaXRlR2xvd01hdGVyaWFsID0gU3ByaXRlR2xvd01hdGVyaWFsO1xyXG4iLCJ2YXIgaGFzT3duID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcbnZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG52YXIgdW5kZWZpbmVkO1xuXG52YXIgaXNQbGFpbk9iamVjdCA9IGZ1bmN0aW9uIGlzUGxhaW5PYmplY3Qob2JqKSB7XG5cdCd1c2Ugc3RyaWN0Jztcblx0aWYgKCFvYmogfHwgdG9TdHJpbmcuY2FsbChvYmopICE9PSAnW29iamVjdCBPYmplY3RdJykge1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXG5cdHZhciBoYXNfb3duX2NvbnN0cnVjdG9yID0gaGFzT3duLmNhbGwob2JqLCAnY29uc3RydWN0b3InKTtcblx0dmFyIGhhc19pc19wcm9wZXJ0eV9vZl9tZXRob2QgPSBvYmouY29uc3RydWN0b3IgJiYgb2JqLmNvbnN0cnVjdG9yLnByb3RvdHlwZSAmJiBoYXNPd24uY2FsbChvYmouY29uc3RydWN0b3IucHJvdG90eXBlLCAnaXNQcm90b3R5cGVPZicpO1xuXHQvLyBOb3Qgb3duIGNvbnN0cnVjdG9yIHByb3BlcnR5IG11c3QgYmUgT2JqZWN0XG5cdGlmIChvYmouY29uc3RydWN0b3IgJiYgIWhhc19vd25fY29uc3RydWN0b3IgJiYgIWhhc19pc19wcm9wZXJ0eV9vZl9tZXRob2QpIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblxuXHQvLyBPd24gcHJvcGVydGllcyBhcmUgZW51bWVyYXRlZCBmaXJzdGx5LCBzbyB0byBzcGVlZCB1cCxcblx0Ly8gaWYgbGFzdCBvbmUgaXMgb3duLCB0aGVuIGFsbCBwcm9wZXJ0aWVzIGFyZSBvd24uXG5cdHZhciBrZXk7XG5cdGZvciAoa2V5IGluIG9iaikge31cblxuXHRyZXR1cm4ga2V5ID09PSB1bmRlZmluZWQgfHwgaGFzT3duLmNhbGwob2JqLCBrZXkpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBleHRlbmQoKSB7XG5cdCd1c2Ugc3RyaWN0Jztcblx0dmFyIG9wdGlvbnMsIG5hbWUsIHNyYywgY29weSwgY29weUlzQXJyYXksIGNsb25lLFxuXHRcdHRhcmdldCA9IGFyZ3VtZW50c1swXSxcblx0XHRpID0gMSxcblx0XHRsZW5ndGggPSBhcmd1bWVudHMubGVuZ3RoLFxuXHRcdGRlZXAgPSBmYWxzZTtcblxuXHQvLyBIYW5kbGUgYSBkZWVwIGNvcHkgc2l0dWF0aW9uXG5cdGlmICh0eXBlb2YgdGFyZ2V0ID09PSAnYm9vbGVhbicpIHtcblx0XHRkZWVwID0gdGFyZ2V0O1xuXHRcdHRhcmdldCA9IGFyZ3VtZW50c1sxXSB8fCB7fTtcblx0XHQvLyBza2lwIHRoZSBib29sZWFuIGFuZCB0aGUgdGFyZ2V0XG5cdFx0aSA9IDI7XG5cdH0gZWxzZSBpZiAoKHR5cGVvZiB0YXJnZXQgIT09ICdvYmplY3QnICYmIHR5cGVvZiB0YXJnZXQgIT09ICdmdW5jdGlvbicpIHx8IHRhcmdldCA9PSBudWxsKSB7XG5cdFx0dGFyZ2V0ID0ge307XG5cdH1cblxuXHRmb3IgKDsgaSA8IGxlbmd0aDsgKytpKSB7XG5cdFx0b3B0aW9ucyA9IGFyZ3VtZW50c1tpXTtcblx0XHQvLyBPbmx5IGRlYWwgd2l0aCBub24tbnVsbC91bmRlZmluZWQgdmFsdWVzXG5cdFx0aWYgKG9wdGlvbnMgIT0gbnVsbCkge1xuXHRcdFx0Ly8gRXh0ZW5kIHRoZSBiYXNlIG9iamVjdFxuXHRcdFx0Zm9yIChuYW1lIGluIG9wdGlvbnMpIHtcblx0XHRcdFx0c3JjID0gdGFyZ2V0W25hbWVdO1xuXHRcdFx0XHRjb3B5ID0gb3B0aW9uc1tuYW1lXTtcblxuXHRcdFx0XHQvLyBQcmV2ZW50IG5ldmVyLWVuZGluZyBsb29wXG5cdFx0XHRcdGlmICh0YXJnZXQgPT09IGNvcHkpIHtcblx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIFJlY3Vyc2UgaWYgd2UncmUgbWVyZ2luZyBwbGFpbiBvYmplY3RzIG9yIGFycmF5c1xuXHRcdFx0XHRpZiAoZGVlcCAmJiBjb3B5ICYmIChpc1BsYWluT2JqZWN0KGNvcHkpIHx8IChjb3B5SXNBcnJheSA9IEFycmF5LmlzQXJyYXkoY29weSkpKSkge1xuXHRcdFx0XHRcdGlmIChjb3B5SXNBcnJheSkge1xuXHRcdFx0XHRcdFx0Y29weUlzQXJyYXkgPSBmYWxzZTtcblx0XHRcdFx0XHRcdGNsb25lID0gc3JjICYmIEFycmF5LmlzQXJyYXkoc3JjKSA/IHNyYyA6IFtdO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRjbG9uZSA9IHNyYyAmJiBpc1BsYWluT2JqZWN0KHNyYykgPyBzcmMgOiB7fTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHQvLyBOZXZlciBtb3ZlIG9yaWdpbmFsIG9iamVjdHMsIGNsb25lIHRoZW1cblx0XHRcdFx0XHR0YXJnZXRbbmFtZV0gPSBleHRlbmQoZGVlcCwgY2xvbmUsIGNvcHkpO1xuXG5cdFx0XHRcdC8vIERvbid0IGJyaW5nIGluIHVuZGVmaW5lZCB2YWx1ZXNcblx0XHRcdFx0fSBlbHNlIGlmIChjb3B5ICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0XHR0YXJnZXRbbmFtZV0gPSBjb3B5O1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0Ly8gUmV0dXJuIHRoZSBtb2RpZmllZCBvYmplY3Rcblx0cmV0dXJuIHRhcmdldDtcbn07XG5cbiIsImlmICh0eXBlb2YgT2JqZWN0LmNyZWF0ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAvLyBpbXBsZW1lbnRhdGlvbiBmcm9tIHN0YW5kYXJkIG5vZGUuanMgJ3V0aWwnIG1vZHVsZVxuICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGluaGVyaXRzKGN0b3IsIHN1cGVyQ3Rvcikge1xuICAgIGN0b3Iuc3VwZXJfID0gc3VwZXJDdG9yXG4gICAgY3Rvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHN1cGVyQ3Rvci5wcm90b3R5cGUsIHtcbiAgICAgIGNvbnN0cnVjdG9yOiB7XG4gICAgICAgIHZhbHVlOiBjdG9yLFxuICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgd3JpdGFibGU6IHRydWUsXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgICAgfVxuICAgIH0pO1xuICB9O1xufSBlbHNlIHtcbiAgLy8gb2xkIHNjaG9vbCBzaGltIGZvciBvbGQgYnJvd3NlcnNcbiAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpbmhlcml0cyhjdG9yLCBzdXBlckN0b3IpIHtcbiAgICBjdG9yLnN1cGVyXyA9IHN1cGVyQ3RvclxuICAgIHZhciBUZW1wQ3RvciA9IGZ1bmN0aW9uICgpIHt9XG4gICAgVGVtcEN0b3IucHJvdG90eXBlID0gc3VwZXJDdG9yLnByb3RvdHlwZVxuICAgIGN0b3IucHJvdG90eXBlID0gbmV3IFRlbXBDdG9yKClcbiAgICBjdG9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IGN0b3JcbiAgfVxufVxuIiwiLy8gYWN0b3JfYW5pbWF0aW9ucy5qc1xyXG4vLyBBIHN1Ym1vZHVsZSBmb3IgdGhlIEFjdG9yIGV2ZW50IGNsYXNzIHRoYXQgZGVhbHMgd2l0aCBhbmltYXRpb25zXHJcblxyXG52YXIgZXh0ZW5kID0gcmVxdWlyZShcImV4dGVuZFwiKTtcclxuXHJcbmZ1bmN0aW9uIGdldFNwcml0ZUZvcm1hdChzdHIpIHtcclxuXHR2YXIgZm9ybWF0ID0gc3RyLnNwbGl0KFwiLVwiKTtcclxuXHR2YXIgbmFtZSA9IGZvcm1hdFswXTtcclxuXHR2YXIgc2l6ZSA9IGZvcm1hdFsxXS5zcGxpdChcInhcIik7XHJcblx0c2l6ZVsxXSA9IHNpemVbMV0gfHwgc2l6ZVswXTtcclxuXHRcclxuXHR2YXIgYmFzZSA9IHtcclxuXHRcdHdpZHRoOiBzaXplWzBdLCBoZWlnaHQ6IHNpemVbMV0sIGZsaXA6IGZhbHNlLCBcclxuXHRcdC8vcmVwZWF0eDogMC4yNSwgcmVwZWF0eTogMC4yNSxcclxuXHRcdGZyYW1lczoge1xyXG5cdFx0XHRcInUzXCI6IFwidTBcIiwgXCJkM1wiOiBcImQwXCIsIFwibDNcIjogXCJsMFwiLCBcInIzXCI6IFwicjBcIixcclxuXHRcdH0sXHJcblx0XHRhbmltcyA6IGdldFN0YW5kYXJkQW5pbWF0aW9ucygpLFxyXG5cdH07XHJcblx0XHJcblx0c3dpdGNoIChuYW1lKSB7XHJcblx0XHRjYXNlIFwicHRfaG9yenJvd1wiOiBcclxuXHRcdFx0cmV0dXJuIGV4dGVuZCh0cnVlLCBiYXNlLCB7IFxyXG5cdFx0XHRcdGZyYW1lczoge1xyXG5cdFx0XHRcdFx0XCJ1MFwiOiBbMSwgMF0sIFwidTFcIjogWzEsIDFdLCBcInUyXCI6IFsxLCAyXSxcclxuXHRcdFx0XHRcdFwiZDBcIjogWzAsIDBdLCBcImQxXCI6IFswLCAxXSwgXCJkMlwiOiBbMCwgMl0sXHJcblx0XHRcdFx0XHRcImwwXCI6IFsyLCAwXSwgXCJsMVwiOiBbMiwgMV0sIFwibDJcIjogWzIsIDJdLFxyXG5cdFx0XHRcdFx0XCJyMFwiOiBbMywgMF0sIFwicjFcIjogWzMsIDFdLCBcInIyXCI6IFszLCAyXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9KTtcclxuXHRcdGNhc2UgXCJwdF92ZXJ0Y29sXCI6IFxyXG5cdFx0XHRyZXR1cm4gZXh0ZW5kKHRydWUsIGJhc2UsIHsgXHJcblx0XHRcdFx0ZnJhbWVzOiB7XHJcblx0XHRcdFx0XHRcInUwXCI6IFswLCAxXSwgXCJ1MVwiOiBbMSwgMV0sIFwidTJcIjogWzIsIDFdLFxyXG5cdFx0XHRcdFx0XCJkMFwiOiBbMCwgMF0sIFwiZDFcIjogWzEsIDBdLCBcImQyXCI6IFsyLCAwXSxcclxuXHRcdFx0XHRcdFwibDBcIjogWzAsIDJdLCBcImwxXCI6IFsxLCAyXSwgXCJsMlwiOiBbMiwgMl0sXHJcblx0XHRcdFx0XHRcInIwXCI6IFswLCAzXSwgXCJyMVwiOiBbMSwgM10sIFwicjJcIjogWzIsIDNdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH0pO1xyXG5cdFx0Y2FzZSBcImhnX3ZlcnRtaXhcIjogXHJcblx0XHRcdHJldHVybiBleHRlbmQodHJ1ZSwgYmFzZSwgeyBcclxuXHRcdFx0XHRmcmFtZXM6IHtcclxuXHRcdFx0XHRcdFwidTBcIjogWzAsIDBdLCBcInUxXCI6IFsxLCAzXSwgXCJ1MlwiOiBbMiwgMF0sXHJcblx0XHRcdFx0XHRcImQwXCI6IFsyLCAxXSwgXCJkMVwiOiBbMiwgMl0sIFwiZDJcIjogWzIsIDNdLFxyXG5cdFx0XHRcdFx0XCJsMFwiOiBbMCwgMl0sIFwibDFcIjogWzAsIDFdLCBcImwyXCI6IFswLCAzXSxcclxuXHRcdFx0XHRcdFwicjBcIjogWzEsIDBdLCBcInIxXCI6IFsxLCAxXSwgXCJyMlwiOiBbMSwgMl0sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fSk7XHJcblx0XHRjYXNlIFwiaGdfcG9rZXJvd1wiOlxyXG5cdFx0XHRyZXR1cm4gZXh0ZW5kKHRydWUsIGJhc2UsIHsgXHJcblx0XHRcdFx0ZnJhbWVzOiB7IC8vIHBvaW50ZXJzIHRvIGFub3RoZXIgaW1hZ2UgaW5kaWNhdGVzIHRoYXQgaW1hZ2Ugc2hvdWxkIGJlIGZsaXBwZWQsIGlmIGZsaXA9dHJ1ZVxyXG5cdFx0XHRcdFx0XCJ1MFwiOiBudWxsLCBcInUxXCI6IFswLCAwXSwgXCJ1MlwiOiBbMSwgMF0sXHJcblx0XHRcdFx0XHRcImQwXCI6IG51bGwsIFwiZDFcIjogWzAsIDFdLCBcImQyXCI6IFsxLCAxXSxcclxuXHRcdFx0XHRcdFwibDBcIjogbnVsbCwgXCJsMVwiOiBbMCwgMl0sIFwibDJcIjogWzEsIDJdLFxyXG5cdFx0XHRcdFx0XCJyMFwiOiBudWxsLCBcInIxXCI6IFswLCAzXSwgXCJyMlwiOiBbMSwgM10sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRhbmltczogZ2V0UG9rZW1vbkFuaW1hdGlvbnMoKSxcclxuXHRcdFx0fSk7XHJcblx0XHRjYXNlIFwiaGdfcG9rZXJvd19yZXZlcnNlXCI6XHJcblx0XHRcdHJldHVybiBleHRlbmQodHJ1ZSwgYmFzZSwgeyBcclxuXHRcdFx0XHRmcmFtZXM6IHsgLy8gcG9pbnRlcnMgdG8gYW5vdGhlciBpbWFnZSBpbmRpY2F0ZXMgdGhhdCBpbWFnZSBzaG91bGQgYmUgZmxpcHBlZCwgaWYgZmxpcD10cnVlXHJcblx0XHRcdFx0XHRcInUwXCI6IG51bGwsIFwidTFcIjogWzAsIDFdLCBcInUyXCI6IFsxLCAxXSxcclxuXHRcdFx0XHRcdFwiZDBcIjogbnVsbCwgXCJkMVwiOiBbMCwgMF0sIFwiZDJcIjogWzEsIDBdLFxyXG5cdFx0XHRcdFx0XCJsMFwiOiBudWxsLCBcImwxXCI6IFswLCAzXSwgXCJsMlwiOiBbMSwgM10sXHJcblx0XHRcdFx0XHRcInIwXCI6IG51bGwsIFwicjFcIjogWzAsIDJdLCBcInIyXCI6IFsxLCAyXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdGFuaW1zOiBnZXRQb2tlbW9uQW5pbWF0aW9ucygpLFxyXG5cdFx0XHR9KTtcclxuXHRcdGNhc2UgXCJoZ19wb2tlY29sXCI6XHJcblx0XHRcdHJldHVybiBleHRlbmQodHJ1ZSwgYmFzZSwgeyBcclxuXHRcdFx0XHRmcmFtZXM6IHsgLy8gcG9pbnRlcnMgdG8gYW5vdGhlciBpbWFnZSBpbmRpY2F0ZXMgdGhhdCBpbWFnZSBzaG91bGQgYmUgZmxpcHBlZCwgaWYgZmxpcD10cnVlXHJcblx0XHRcdFx0XHRcInUwXCI6IG51bGwsIFwidTFcIjogWzAsIDBdLCBcInUyXCI6IFswLCAxXSxcclxuXHRcdFx0XHRcdFwiZDBcIjogbnVsbCwgXCJkMVwiOiBbMCwgMl0sIFwiZDJcIjogWzAsIDNdLFxyXG5cdFx0XHRcdFx0XCJsMFwiOiBudWxsLCBcImwxXCI6IFsxLCAwXSwgXCJsMlwiOiBbMSwgMV0sXHJcblx0XHRcdFx0XHRcInIwXCI6IG51bGwsIFwicjFcIjogWzEsIDJdLCBcInIyXCI6IFsxLCAzXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdGFuaW1zOiBnZXRQb2tlbW9uQW5pbWF0aW9ucygpLFxyXG5cdFx0XHR9KTtcclxuXHRcdGNhc2UgXCJoZ19wb2tlX2hvcnpjb2xcIjpcclxuXHRcdFx0cmV0dXJuIGV4dGVuZCh0cnVlLCBiYXNlLCB7IFxyXG5cdFx0XHRcdGZyYW1lczogeyAvLyBwb2ludGVycyB0byBhbm90aGVyIGltYWdlIGluZGljYXRlcyB0aGF0IGltYWdlIHNob3VsZCBiZSBmbGlwcGVkLCBpZiBmbGlwPXRydWVcclxuXHRcdFx0XHRcdFwidTBcIjogbnVsbCwgXCJ1MVwiOiBbMSwgMF0sIFwidTJcIjogWzEsIDFdLFxyXG5cdFx0XHRcdFx0XCJkMFwiOiBudWxsLCBcImQxXCI6IFswLCAwXSwgXCJkMlwiOiBbMCwgMV0sXHJcblx0XHRcdFx0XHRcImwwXCI6IG51bGwsIFwibDFcIjogWzIsIDBdLCBcImwyXCI6IFsyLCAxXSxcclxuXHRcdFx0XHRcdFwicjBcIjogbnVsbCwgXCJyMVwiOiBbMywgMF0sIFwicjJcIjogWzMsIDFdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0YW5pbXM6IGdldFBva2Vtb25BbmltYXRpb25zKCksXHJcblx0XHRcdH0pO1xyXG5cdFx0Y2FzZSBcImhnX3Bva2VmbGlwXCI6XHJcblx0XHRcdHJldHVybiBleHRlbmQodHJ1ZSwgYmFzZSwgeyBcclxuXHRcdFx0XHRmcmFtZXM6IHsgLy8gcG9pbnRlcnMgdG8gYW5vdGhlciBpbWFnZSBpbmRpY2F0ZXMgdGhhdCBpbWFnZSBzaG91bGQgYmUgZmxpcHBlZCwgaWYgZmxpcD10cnVlXHJcblx0XHRcdFx0XHRcInUwXCI6IG51bGwsIFwidTFcIjogWzAsIDBdLCBcInUyXCI6IFsxLCAwXSxcclxuXHRcdFx0XHRcdFwiZDBcIjogbnVsbCwgXCJkMVwiOiBbMCwgMV0sIFwiZDJcIjogWzEsIDFdLFxyXG5cdFx0XHRcdFx0XCJsMFwiOiBudWxsLCBcImwxXCI6IFswLCAyXSwgXCJsMlwiOiBbMSwgMl0sXHJcblx0XHRcdFx0XHRcInIwXCI6IG51bGwsIFwicjFcIjogXCJsMVwiLCAgIFwicjJcIjogXCJsMlwiLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0YW5pbXM6IGdldFBva2Vtb25BbmltYXRpb25zKCksXHJcblx0XHRcdH0pO1xyXG5cdFx0Y2FzZSBcImJ3X3ZlcnRyb3dcIjpcclxuXHRcdFx0cmV0dXJuIGV4dGVuZCh0cnVlLCBiYXNlLCB7IFxyXG5cdFx0XHRcdGZyYW1lczoge1xyXG5cdFx0XHRcdFx0XCJ1MFwiOiBbMCwgMF0sIFwidTFcIjogWzEsIDBdLCBcInUyXCI6IFsyLCAwXSxcclxuXHRcdFx0XHRcdFwiZDBcIjogWzAsIDFdLCBcImQxXCI6IFsxLCAxXSwgXCJkMlwiOiBbMiwgMV0sXHJcblx0XHRcdFx0XHRcImwwXCI6IFswLCAyXSwgXCJsMVwiOiBbMSwgMl0sIFwibDJcIjogWzIsIDJdLFxyXG5cdFx0XHRcdFx0XCJyMFwiOiBbMCwgM10sIFwicjFcIjogWzEsIDNdLCBcInIyXCI6IFsyLCAzXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9KTtcclxuXHRcdGNhc2UgXCJid19ob3J6ZmxpcFwiOlxyXG5cdFx0XHRyZXR1cm4gZXh0ZW5kKHRydWUsIGJhc2UsIHsgXHJcblx0XHRcdFx0ZnJhbWVzOiB7IC8vIHBvaW50ZXJzIHRvIGFub3RoZXIgaW1hZ2UgaW5kaWNhdGVzIHRoYXQgaW1hZ2Ugc2hvdWxkIGJlIGZsaXBwZWQsIGlmIGZsaXA9dHJ1ZVxyXG5cdFx0XHRcdFx0XCJ1MFwiOiBbMCwgMF0sIFwidTFcIjogWzEsIDBdLCBcInUyXCI6IFwidTFcIixcclxuXHRcdFx0XHRcdFwiZDBcIjogWzIsIDBdLCBcImQxXCI6IFszLCAwXSwgXCJkMlwiOiBcImQxXCIsXHJcblx0XHRcdFx0XHRcImwwXCI6IFswLCAxXSwgXCJsMVwiOiBbMSwgMV0sIFwibDJcIjogWzIsIDFdLFxyXG5cdFx0XHRcdFx0XCJyMFwiOiBcImwwXCIsICAgXCJyMVwiOiBcImwxXCIsICAgXCJyMlwiOiBcImwyXCIsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fSk7XHJcblx0XHRkZWZhdWx0OlxyXG5cdFx0XHRjb25zb2xlLmVycm9yKFwiTm8gc3VjaCBTcHJpdGUgRm9ybWF0OlwiLCBuYW1lKTtcclxuXHRcdFx0cmV0dXJuIHt9O1xyXG5cdH1cclxufVxyXG5tb2R1bGUuZXhwb3J0cy5nZXRTcHJpdGVGb3JtYXQgPSBnZXRTcHJpdGVGb3JtYXQ7XHJcblxyXG5cclxuZnVuY3Rpb24gZ2V0U3RhbmRhcmRBbmltYXRpb25zKCkge1xyXG5cdHZhciBhbmltcyA9IHt9O1xyXG5cdFxyXG5cdGFuaW1zW1wic3RhbmRcIl0gPSBuZXcgU3ByaXRlQW5pbWF0aW9uKHsgc2luZ2xlRnJhbWU6IHRydWUsIH0sIFtcclxuXHRcdHsgdTogXCJ1MFwiLCBkOiBcImQwXCIsIGw6IFwibDBcIiwgcjogXCJyMFwiLCB0cmFuczogdHJ1ZSwgcGF1c2U6IHRydWUsIH0sXHJcblx0XSk7XHJcblx0YW5pbXNbXCJ3YWxrXCJdID0gbmV3IFNwcml0ZUFuaW1hdGlvbih7IGZyYW1lTGVuZ3RoOiA1LCBrZWVwRnJhbWU6IHRydWUsIH0sIFtcclxuXHRcdHsgdTogXCJ1MVwiLCBkOiBcImQxXCIsIGw6IFwibDFcIiwgcjogXCJyMVwiLCB9LFxyXG5cdFx0eyB1OiBcInUzXCIsIGQ6IFwiZDNcIiwgbDogXCJsM1wiLCByOiBcInIzXCIsIHRyYW5zOiB0cnVlLCB9LFxyXG5cdFx0eyB1OiBcInUyXCIsIGQ6IFwiZDJcIiwgbDogXCJsMlwiLCByOiBcInIyXCIsIH0sXHJcblx0XHR7IHU6IFwidTNcIiwgZDogXCJkM1wiLCBsOiBcImwzXCIsIHI6IFwicjNcIiwgdHJhbnM6IHRydWUsIGxvb3BUbzogMCwgfSxcclxuXHRdKTtcclxuXHRhbmltc1tcImJ1bXBcIl0gPSBuZXcgU3ByaXRlQW5pbWF0aW9uKHsgZnJhbWVMZW5ndGg6IDEwLCBrZWVwRnJhbWU6IHRydWUsIH0sIFtcclxuXHRcdHsgdTogXCJ1MVwiLCBkOiBcImQxXCIsIGw6IFwibDFcIiwgcjogXCJyMVwiLCBzZng6IFwid2Fsa19idW1wXCIsIH0sXHJcblx0XHR7IHU6IFwidTBcIiwgZDogXCJkMFwiLCBsOiBcImwwXCIsIHI6IFwicjBcIiwgdHJhbnM6IHRydWUsIH0sXHJcblx0XHR7IHU6IFwidTJcIiwgZDogXCJkMlwiLCBsOiBcImwyXCIsIHI6IFwicjJcIiwgc2Z4OiBcIndhbGtfYnVtcFwiLCB9LFxyXG5cdFx0eyB1OiBcInUwXCIsIGQ6IFwiZDBcIiwgbDogXCJsMFwiLCByOiBcInIwXCIsIHRyYW5zOiB0cnVlLCBsb29wVG86IDAsIH0sXHJcblx0XSk7XHJcblx0YW5pbXNbXCJ3YXJwX2F3YXlcIl0gPSBuZXcgU3ByaXRlQW5pbWF0aW9uKHsgc2luZ2xlRGlyOiBcImRcIiB9LCBbXHJcblx0XHR7IGQ6IFwiZDBcIiwgZnJhbWVMZW5ndGg6IDgsIH0sIC8vMFxyXG5cdFx0eyBkOiBcImwwXCIsIGZyYW1lTGVuZ3RoOiA4LCB9LFxyXG5cdFx0eyBkOiBcInUwXCIsIGZyYW1lTGVuZ3RoOiA4LCB9LFxyXG5cdFx0eyBkOiBcInIwXCIsIGZyYW1lTGVuZ3RoOiA4LCB9LFxyXG5cdFx0eyBkOiBcImQwXCIsIGZyYW1lTGVuZ3RoOiA3LCB9LCAvLzRcclxuXHRcdHsgZDogXCJsMFwiLCBmcmFtZUxlbmd0aDogNywgfSxcclxuXHRcdHsgZDogXCJ1MFwiLCBmcmFtZUxlbmd0aDogNywgfSxcclxuXHRcdHsgZDogXCJyMFwiLCBmcmFtZUxlbmd0aDogNywgfSxcclxuXHRcdHsgZDogXCJkMFwiLCBmcmFtZUxlbmd0aDogNSwgfSwgLy84XHJcblx0XHR7IGQ6IFwibDBcIiwgZnJhbWVMZW5ndGg6IDUsIH0sXHJcblx0XHR7IGQ6IFwidTBcIiwgZnJhbWVMZW5ndGg6IDUsIH0sXHJcblx0XHR7IGQ6IFwicjBcIiwgZnJhbWVMZW5ndGg6IDUsIH0sXHJcblx0XHR7IGQ6IFwiZDBcIiwgZnJhbWVMZW5ndGg6IDMsIH0sIC8vMTJcclxuXHRcdHsgZDogXCJsMFwiLCBmcmFtZUxlbmd0aDogMywgfSxcclxuXHRcdHsgZDogXCJ1MFwiLCBmcmFtZUxlbmd0aDogMywgfSxcclxuXHRcdHsgZDogXCJyMFwiLCBmcmFtZUxlbmd0aDogMywgfSxcclxuXHRcdHsgZDogXCJkMFwiLCBmcmFtZUxlbmd0aDogMSwgfSwgLy8xNlxyXG5cdFx0eyBkOiBcImwwXCIsIGZyYW1lTGVuZ3RoOiAxLCB9LFxyXG5cdFx0eyBkOiBcInUwXCIsIGZyYW1lTGVuZ3RoOiAxLCB9LFxyXG5cdFx0eyBkOiBcInIwXCIsIGZyYW1lTGVuZ3RoOiAxLCB9LFxyXG5cdFx0eyBkOiBcImQwXCIsIGZyYW1lTGVuZ3RoOiAwLCB0cmFuczogdHJ1ZSwgfSwgLy8yMFxyXG5cdFx0eyBkOiBcImwwXCIsIGZyYW1lTGVuZ3RoOiAwLCB0cmFuczogdHJ1ZSwgfSxcclxuXHRcdHsgZDogXCJ1MFwiLCBmcmFtZUxlbmd0aDogMCwgdHJhbnM6IHRydWUsIH0sXHJcblx0XHR7IGQ6IFwicjBcIiwgZnJhbWVMZW5ndGg6IDAsIHRyYW5zOiB0cnVlLCBsb29wVG86IDIwIH0sXHJcblx0XSk7XHJcblx0YW5pbXNbXCJ3YXJwX2luXCJdID0gbmV3IFNwcml0ZUFuaW1hdGlvbih7IHNpbmdsZURpcjogXCJkXCIgfSwgW1xyXG5cdFx0eyBkOiBcImQwXCIsIGZyYW1lTGVuZ3RoOiAxLCB9LCAvLzBcclxuXHRcdHsgZDogXCJyMFwiLCBmcmFtZUxlbmd0aDogMSwgfSxcclxuXHRcdHsgZDogXCJ1MFwiLCBmcmFtZUxlbmd0aDogMSwgfSxcclxuXHRcdHsgZDogXCJsMFwiLCBmcmFtZUxlbmd0aDogMSwgfSxcclxuXHRcdHsgZDogXCJkMFwiLCBmcmFtZUxlbmd0aDogMywgfSwgLy80XHJcblx0XHR7IGQ6IFwicjBcIiwgZnJhbWVMZW5ndGg6IDMsIH0sXHJcblx0XHR7IGQ6IFwidTBcIiwgZnJhbWVMZW5ndGg6IDMsIH0sXHJcblx0XHR7IGQ6IFwibDBcIiwgZnJhbWVMZW5ndGg6IDMsIH0sXHJcblx0XHR7IGQ6IFwiZDBcIiwgZnJhbWVMZW5ndGg6IDUsIH0sIC8vOFxyXG5cdFx0eyBkOiBcInIwXCIsIGZyYW1lTGVuZ3RoOiA1LCB9LFxyXG5cdFx0eyBkOiBcInUwXCIsIGZyYW1lTGVuZ3RoOiA1LCB9LFxyXG5cdFx0eyBkOiBcImwwXCIsIGZyYW1lTGVuZ3RoOiA1LCB9LFxyXG5cdFx0eyBkOiBcImQwXCIsIGZyYW1lTGVuZ3RoOiA3LCB9LCAvLzEyXHJcblx0XHR7IGQ6IFwicjBcIiwgZnJhbWVMZW5ndGg6IDcsIH0sXHJcblx0XHR7IGQ6IFwidTBcIiwgZnJhbWVMZW5ndGg6IDcsIH0sXHJcblx0XHR7IGQ6IFwibDBcIiwgZnJhbWVMZW5ndGg6IDcsIH0sXHJcblx0XHR7IGQ6IFwiZDBcIiwgZnJhbWVMZW5ndGg6IDgsIH0sIC8vMTZcclxuXHRcdHsgZDogXCJyMFwiLCBmcmFtZUxlbmd0aDogOCwgfSxcclxuXHRcdHsgZDogXCJ1MFwiLCBmcmFtZUxlbmd0aDogOSwgfSxcclxuXHRcdHsgZDogXCJsMFwiLCBmcmFtZUxlbmd0aDogOSwgfSxcclxuXHRcdHsgZDogXCJkMFwiLCBmcmFtZUxlbmd0aDogMSwgfSxcclxuXHRdKTtcclxuXHRcclxuXHRyZXR1cm4gYW5pbXM7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldFBva2Vtb25BbmltYXRpb25zKCkgeyAvL092ZXJyaWRlcyBTdGFuZGFyZFxyXG5cdHZhciBhbmltcyA9IHt9O1xyXG5cdGFuaW1zW1wic3RhbmRcIl0gPSBuZXcgU3ByaXRlQW5pbWF0aW9uKHsgc2luZ2xlRnJhbWU6IHRydWUsIH0sIFtcclxuXHRcdHsgdTogXCJ1MVwiLCBkOiBcImQxXCIsIGw6IFwibDFcIiwgcjogXCJyMVwiLCB0cmFuczogdHJ1ZSwgcGF1c2U6IHRydWUsIH0sXHJcblx0XSk7XHJcblx0YW5pbXNbXCJfZmxhcF9zdGFuZFwiXSA9IG5ldyBTcHJpdGVBbmltYXRpb24oeyBmcmFtZUxlbmd0aDogNSwga2VlcEZyYW1lOiB0cnVlLCB9LCBbXHJcblx0XHR7IHU6IFwidTFcIiwgZDogXCJkMVwiLCBsOiBcImwxXCIsIHI6IFwicjFcIiwgdHJhbnM6IHRydWUsIH0sXHJcblx0XHR7IHU6IFwidTJcIiwgZDogXCJkMlwiLCBsOiBcImwyXCIsIHI6IFwicjJcIiwgbG9vcFRvOiAwLCB9LFxyXG5cdF0pO1xyXG5cdGFuaW1zW1wid2Fsa1wiXSA9IG5ldyBTcHJpdGVBbmltYXRpb24oeyBmcmFtZUxlbmd0aDogNSwga2VlcEZyYW1lOiB0cnVlLCB9LCBbXHJcblx0XHR7IHU6IFwidTFcIiwgZDogXCJkMVwiLCBsOiBcImwxXCIsIHI6IFwicjFcIiwgdHJhbnM6IHRydWUsIH0sXHJcblx0XHR7IHU6IFwidTJcIiwgZDogXCJkMlwiLCBsOiBcImwyXCIsIHI6IFwicjJcIiwgbG9vcFRvOiAwLCB9LFxyXG5cdF0pO1xyXG5cdHJldHVybiBhbmltcztcclxufVxyXG5cclxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHJcbmZ1bmN0aW9uIFNwcml0ZUFuaW1hdGlvbihvcHRzLCBmcmFtZXMpIHtcclxuXHR0aGlzLm9wdGlvbnMgPSBvcHRzO1xyXG5cdHRoaXMuZnJhbWVzID0gZnJhbWVzO1xyXG5cdFxyXG5cdHRoaXMud2FpdFRpbWUgPSB0aGlzLmZyYW1lc1t0aGlzLmN1cnJGcmFtZV0uZnJhbWVMZW5ndGggfHwgdGhpcy5vcHRpb25zLmZyYW1lTGVuZ3RoO1xyXG59XHJcblNwcml0ZUFuaW1hdGlvbi5wcm90b3R5cGUgPSB7XHJcblx0b3B0aW9uczogbnVsbCxcclxuXHRmcmFtZXMgOiBudWxsLFxyXG5cdFxyXG5cdHdhaXRUaW1lIDogMCxcclxuXHRjdXJyRnJhbWU6IDAsXHJcblx0c3BlZWQgOiAxLFxyXG5cdHBhdXNlZCA6IGZhbHNlLFxyXG5cdGZpbmlzaGVkOiBmYWxzZSxcclxuXHRcclxuXHRwYXJlbnQgOiBudWxsLFxyXG5cdFxyXG5cdC8qKiBBZHZhbmNlZCB0aGUgYW5pbWF0aW9uIGJ5IHRoZSBnaXZlbiBhbW91bnQgb2YgZGVsdGEgdGltZS4gKi9cclxuXHRhZHZhbmNlIDogZnVuY3Rpb24oZGVsdGFUaW1lKSB7XHJcblx0XHRpZiAodGhpcy5vcHRpb25zLnNpbmdsZUZyYW1lKSByZXR1cm47XHJcblx0XHRpZiAodGhpcy5wYXVzZWQpIHJldHVybjtcclxuXHRcdFxyXG5cdFx0aWYgKHRoaXMud2FpdFRpbWUgPiAwKSB7XHJcblx0XHRcdHRoaXMud2FpdFRpbWUgLT0gKHRoaXMuc3BlZWQgKiAoZGVsdGFUaW1lICogQ09ORklHLnNwZWVkLmFuaW1hdGlvbikpO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdHZhciBsb29wID0gdGhpcy5mcmFtZXNbdGhpcy5jdXJyRnJhbWVdLmxvb3BUbztcclxuXHRcdGlmIChsb29wICE9PSB1bmRlZmluZWQpIHRoaXMuY3VyckZyYW1lID0gbG9vcDtcclxuXHRcdGVsc2UgdGhpcy5jdXJyRnJhbWUrKztcclxuXHRcdFxyXG5cdFx0aWYgKHRoaXMuY3VyckZyYW1lID49IHRoaXMuZnJhbWVzLmxlbmd0aCkge1xyXG5cdFx0XHR0aGlzLmN1cnJGcmFtZSA9IHRoaXMuZnJhbWVzLmxlbmd0aC0xO1xyXG5cdFx0XHR0aGlzLnBhdXNlZCA9IHRydWU7XHJcblx0XHRcdHRoaXMuZmluaXNoZWQgPSB0cnVlO1xyXG5cdFx0XHRjb25zb2xlLndhcm4oXCJBbmltYXRpb24gaGFzIGNvbXBsZXRlZCFcIik7XHJcblx0XHRcdGlmICh0aGlzLnBhcmVudCkgdGhpcy5wYXJlbnQuZW1pdChcImFuaW0tZW5kXCIsIG51bGwpOyAvL1RPRE8gcHJvdmlkZSBhbmltIG5hbWVcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHQvL25ldyBmcmFtZVxyXG5cdFx0XHJcblx0XHR0aGlzLndhaXRUaW1lID0gdGhpcy5mcmFtZXNbdGhpcy5jdXJyRnJhbWVdLmZyYW1lTGVuZ3RoIHx8IHRoaXMub3B0aW9ucy5mcmFtZUxlbmd0aDtcclxuXHRcdFxyXG5cdFx0aWYgKHRoaXMuZnJhbWVzW3RoaXMuY3VyckZyYW1lXS5wYXVzZSkgdGhpcy5wYXVzZWQgPSB0cnVlO1xyXG5cdFx0XHJcblx0XHRpZiAodGhpcy5mcmFtZXNbdGhpcy5jdXJyRnJhbWVdLnNmeCkgXHJcblx0XHRcdFNvdW5kTWFuYWdlci5wbGF5U291bmQodGhpcy5mcmFtZXNbdGhpcy5jdXJyRnJhbWVdLnNmeCk7XHJcblx0fSxcclxuXHRcclxuXHQvKiogSWYgdGhpcyBhbmltYXRpb24gaXMgb24gYSBwYXVzZSBmcmFtZSAqL1xyXG5cdHJlc3VtZSA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0dGhpcy5wYXVzZWQgPSBmYWxzZTtcclxuXHR9LFxyXG5cdFxyXG5cdC8qKiBSZXNldCB0aGUgYW5pbWF0aW9uIHBhcmFtZXRlcnMuIENhbGxlZCB3aGVuIHRoaXMgYW5pbWF0aW9uIGlzIG5vIGxvbmdlciB1c2VkLiAqL1xyXG5cdHJlc2V0IDogZnVuY3Rpb24oKSB7XHJcblx0XHR0aGlzLnBhdXNlZCA9IGZhbHNlO1xyXG5cdFx0aWYgKHRoaXMub3B0aW9ucy5rZWVwRnJhbWUpIHtcclxuXHRcdFx0Ly8gaWYgKHNlbGYuY2FuVHJhbnNpdGlvbigpKSB7XHJcblx0XHRcdC8vIFx0dmFyIGxvb3AgPSB0aGlzLmZyYW1lc1t0aGlzLmN1cnJGcmFtZV0ubG9vcFRvO1xyXG5cdFx0XHQvLyBcdGlmIChsb29wICE9PSB1bmRlZmluZWQpIHRoaXMuY3VyckZyYW1lID0gbG9vcDtcclxuXHRcdFx0Ly8gXHRlbHNlIHRoaXMuY3VyckZyYW1lKys7XHJcblx0XHRcdFx0XHJcblx0XHRcdC8vIFx0dGhpcy53YWl0VGltZSA9IHRoaXMuZnJhbWVzW3RoaXMuY3VyckZyYW1lXS5mcmFtZUxlbmd0aCB8fCB0aGlzLm9wdGlvbnMuZnJhbWVMZW5ndGg7XHJcblx0XHRcdFx0XHJcblx0XHRcdC8vIFx0aWYgKHRoaXMuZnJhbWVzW3RoaXMuY3VyckZyYW1lXS5wYXVzZSkgdGhpcy5wYXVzZWQgPSB0cnVlO1xyXG5cdFx0XHQvLyB9XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHRcdHRoaXMuZmluaXNoZWQgPSBmYWxzZTtcclxuXHRcdHRoaXMuY3VyckZyYW1lID0gMDtcclxuXHRcdHRoaXMud2FpdFRpbWUgPSB0aGlzLmZyYW1lc1t0aGlzLmN1cnJGcmFtZV0uZnJhbWVMZW5ndGggfHwgdGhpcy5vcHRpb25zLmZyYW1lTGVuZ3RoO1xyXG5cdFx0dGhpcy5zcGVlZCA9IDE7XHJcblx0fSxcclxuXHRcclxuXHQvKiogSWYgdGhpcyBhbmltYXRpb24gaXMgb24gYSBmcmFtZSB0aGF0IGNhbiB0cmFuc2l0aW9uIHRvIGFub3RoZXIgYW5pbWF0aW9uLiAqL1xyXG5cdGNhblRyYW5zaXRpb24gOiBmdW5jdGlvbigpIHtcclxuXHRcdHJldHVybiB0aGlzLmZpbmlzaGVkIHx8IHRoaXMuZnJhbWVzW3RoaXMuY3VyckZyYW1lXS50cmFucztcclxuXHR9LFxyXG5cdFxyXG5cdC8qKiBSZXR1cm5zIHRoZSBuYW1lIG9mIHRoZSBmcmFtZSB0byBkaXNwbGF5IHRoaXMgZnJhbWUuICovXHJcblx0Z2V0RnJhbWVUb0Rpc3BsYXkgOiBmdW5jdGlvbihkaXIpIHtcclxuXHRcdGlmICh0aGlzLm9wdGlvbnMuc2luZ2xlRGlyKSBkaXIgPSB0aGlzLm9wdGlvbnMuc2luZ2xlRGlyO1xyXG5cdFx0cmV0dXJuIHRoaXMuZnJhbWVzW3RoaXMuY3VyckZyYW1lXVtkaXJdO1xyXG5cdH0sXHJcbn07XHJcbm1vZHVsZS5leHBvcnRzLlNwcml0ZUFuaW1hdGlvbiA9IFNwcml0ZUFuaW1hdGlvbjsiLCIvLyBhY3Rvci5qc1xyXG4vLyBEZWZpbmVzIHRoZSBhY3RvciBldmVudCB1c2VkIHRocm91Z2hvdXQgdGhlIHBhcmtcclxuXHJcbnZhciBFdmVudCA9IHJlcXVpcmUoXCJ0cHAtZXZlbnRcIik7XHJcbnZhciBpbmhlcml0cyA9IHJlcXVpcmUoXCJpbmhlcml0c1wiKTtcclxudmFyIGV4dGVuZCA9IHJlcXVpcmUoXCJleHRlbmRcIik7XHJcblxyXG52YXIgQ2hhcmFjdGVyU3ByaXRlID0gcmVxdWlyZShcIi4uL21vZGVsL3Nwcml0ZW1vZGVsLmpzXCIpLkNoYXJhY3RlclNwcml0ZTtcclxudmFyIFNwcml0ZUdsb3dNYXRlcmlhbCA9IHJlcXVpcmUoXCIuLi9tb2RlbC9zcHJpdGVtb2RlbC5qc1wiKS5TcHJpdGVHbG93TWF0ZXJpYWw7XHJcbnZhciBnZXRTcHJpdGVGb3JtYXQgPSByZXF1aXJlKFwidHBwLWFjdG9yLWFuaW1hdGlvbnNcIikuZ2V0U3ByaXRlRm9ybWF0O1xyXG5cclxudmFyIEdMT0JBTF9TQ0FMRVVQID0gMS42NTtcclxudmFyIEVWRU5UX1BMQU5FX05PUk1BTCA9IG5ldyBUSFJFRS5WZWN0b3IzKDAsIDEsIDApO1xyXG4vKipcclxuICogQW4gYWN0b3IgaXMgYW55IGV2ZW50IHJlcHJlc2VudGluZyBhIHBlcnNvbiwgcG9rZW1vbiwgb3Igb3RoZXIgZW50aXR5IHRoYXRcclxuICogbWF5IG1vdmUgYXJvdW5kIGluIHRoZSB3b3JsZCBvciBmYWNlIGEgZGlyZWN0aW9uLiBBY3RvcnMgbWF5IGhhdmUgZGlmZmVyZW50XHJcbiAqIGJlaGF2aW9ycywgc29tZSBjb21tb24gb25lcyBwcmVkZWZpbmVkIGluIHRoaXMgZmlsZS5cclxuICovXHJcbmZ1bmN0aW9uIEFjdG9yKGJhc2UsIG9wdHMpIHtcclxuXHRFdmVudC5jYWxsKHRoaXMsIGJhc2UsIG9wdHMpO1xyXG5cdFxyXG5cdHRoaXMub24oXCJ0aWNrXCIsIHRoaXMuX2FjdG9yVGljayk7XHJcblx0dGhpcy5vbihcImludGVyYWN0ZWRcIiwgdGhpcy5fZG9CZWhhdmlvcl9pbnRlcmFjdCk7XHJcblx0dGhpcy5vbihcImJ1bXBlZFwiLCB0aGlzLl9kb0JlaGF2aW9yX2J1bXApO1xyXG5cdHRoaXMub24oXCJjYW50LW1vdmVcIiwgdGhpcy5fYWN0b3JCdW1wKTtcclxuXHR0aGlzLmZhY2luZyA9IG5ldyBUSFJFRS5WZWN0b3IzKDAsIDAsIDEpO1xyXG5cdFxyXG5cdHRoaXMuX2luaXRCZWhhdmlvclN0YWNrKCk7XHJcblx0XHJcblx0aWYgKHRoaXMuc2NoZWR1bGUpIHtcclxuXHRcdHRoaXMuc2NoZWR1bGUgPSBBY3RvclNjaGVkdWxlci5jcmVhdGVTY2hlZHVsZSh0aGlzLmlkLCB0aGlzLnNjaGVkdWxlKTtcclxuXHR9XHJcbn1cclxuaW5oZXJpdHMoQWN0b3IsIEV2ZW50KTtcclxuZXh0ZW5kKEFjdG9yLnByb3RvdHlwZSwge1xyXG5cdHNwcml0ZTogbnVsbCxcclxuXHRzcHJpdGVfZm9ybWF0OiBudWxsLFxyXG5cdFxyXG5cdHNoYWRvdyA6IHRydWUsXHJcblx0XHJcblx0Ly8vLy8vLy8vLy8vLy8vLyBQcm9wZXJ0eSBTZXR0ZXJzIC8vLy8vLy8vLy8vLy8vLy8vXHJcblx0c2NhbGU6IDEsXHJcblx0c2NhbGVfc2hhZG93OiAxLFxyXG5cdFxyXG5cdHNldFNjYWxlIDogZnVuY3Rpb24oc2NhbGUpIHtcclxuXHRcdHRoaXMuc2NhbGUgPSBzY2FsZTtcclxuXHRcdHNjYWxlICo9IEdMT0JBTF9TQ0FMRVVQO1xyXG5cdFx0dGhpcy5hdmF0YXJfc3ByaXRlLnNjYWxlLnNldChzY2FsZSwgc2NhbGUsIHNjYWxlKTtcclxuXHRcdHRoaXMuX2F2YXRhcl9zaGFkb3djYXN0ZXIuc2NhbGUuc2V0KFxyXG5cdFx0XHR0aGlzLnNjYWxlX3NoYWRvdyAqIHNjYWxlLFxyXG5cdFx0XHR0aGlzLnNjYWxlX3NoYWRvdyAqIHNjYWxlLFxyXG5cdFx0XHR0aGlzLnNjYWxlX3NoYWRvdyAqIHNjYWxlXHJcblx0XHQpO1xyXG5cdH0sXHJcblx0XHJcblx0c2V0U2hhZG93U2NhbGUgOiBmdW5jdGlvbihzY2FsZSkge1xyXG5cdFx0dGhpcy5zY2FsZV9zaGFkb3cgPSBzY2FsZTtcclxuXHRcdHNjYWxlICo9IEdMT0JBTF9TQ0FMRVVQO1xyXG5cdFx0dGhpcy5fYXZhdGFyX3NoYWRvd2Nhc3Rlci5zY2FsZS5zZXQoXHJcblx0XHRcdHRoaXMuc2NhbGUgKiBzY2FsZSxcclxuXHRcdFx0dGhpcy5zY2FsZSAqIHNjYWxlLFxyXG5cdFx0XHR0aGlzLnNjYWxlICogc2NhbGVcclxuXHRcdCk7XHJcblx0fSxcclxuXHRcclxuXHQvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLyBBdmF0YXIgLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cdGF2YXRhcl9ub2RlIDogbnVsbCxcclxuXHRhdmF0YXJfc3ByaXRlIDogbnVsbCxcclxuXHRhdmF0YXJfZm9ybWF0IDogbnVsbCxcclxuXHRhdmF0YXJfdGV4IDogbnVsbCxcclxuXHRfYXZhdGFyX3NoYWRvd2Nhc3RlciA6IG51bGwsXHJcblx0XHJcblx0Z2V0QXZhdGFyIDogZnVuY3Rpb24obWFwLCBnYyl7IFxyXG5cdFx0aWYgKHRoaXMuYXZhdGFyX25vZGUpIHJldHVybiB0aGlzLmF2YXRhcl9ub2RlO1xyXG5cdFx0XHJcblx0XHR2YXIgbm9kZSA9IHRoaXMuYXZhdGFyX25vZGUgPSBuZXcgVEhSRUUuT2JqZWN0M0QoKTtcclxuXHRcdFxyXG5cdFx0bm9kZS5hZGQodGhpcy5fYXZhdGFyX2NyZWF0ZVNwcml0ZShtYXAsIGdjKSk7XHJcblx0XHRub2RlLmFkZCh0aGlzLl9hdmF0YXJfY3JlYXRlU2hhZG93Q2FzdGVyKG1hcCwgZ2MpKTtcclxuXHRcdC8vIGlmICh0aGlzLmdsb3dfY29sb3IpIHtcclxuXHRcdC8vIFx0bm9kZS5hZGQodGhpcy5fYXZhdGFyX2NyZWF0ZUdsb3dDYXN0ZXIobWFwLCBnYykpO1xyXG5cdFx0Ly8gfVxyXG5cdFx0XHJcblx0XHRyZXR1cm4gbm9kZTtcclxuXHRcdFxyXG5cdH0sXHJcblx0XHJcblx0Z2V0VGFsa2luZ0FuY2hvciA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0cmV0dXJuIHRoaXMuX2F2YXRhcl9zaGFkb3djYXN0ZXIubG9jYWxUb1dvcmxkKFxyXG5cdFx0XHR0aGlzLl9hdmF0YXJfc2hhZG93Y2FzdGVyLnBvc2l0aW9uLmNsb25lKClcclxuXHRcdCk7XHJcblx0fSxcclxuXHRcclxuXHRfYXZhdGFyX2NyZWF0ZUdsb3dDYXN0ZXI6IGZ1bmN0aW9uKG1hcCwgZ2MpIHtcclxuXHRcdHZhciBtYXQgPSBuZXcgU3ByaXRlR2xvd01hdGVyaWFsKHtcclxuXHRcdFx0Y29sb3I6IHRoaXMuZ2xvd19jb2xvcixcclxuXHRcdH0pO1xyXG5cdFx0Z2MuY29sbGVjdChtYXQpO1xyXG5cdFx0XHJcblx0XHR2YXIgZ2VvbSA9IG5ldyBUSFJFRS5TcGhlcmVHZW9tZXRyeSgwLjgsIDIxLCAxMCk7XHJcblx0XHRnYy5jb2xsZWN0KGdlb20pO1xyXG5cdFx0XHJcblx0XHR2YXIgbWVzaCA9IG5ldyBUSFJFRS5NZXNoKGdlb20sIG1hdCk7XHJcblx0XHRtZXNoLnBvc2l0aW9uLnNldCgwLCAwLjUsIDApO1xyXG5cdFx0XHJcblx0XHQvLyBzZWxmLnNldFNjYWxlKHNlbGYuc2NhbGVfc2hhZG93KTtcclxuXHRcdC8vIG1lc2guc2NhbGUuc2V0KFxyXG5cdFx0Ly8gXHR0aGlzLnNjYWxlX3NoYWRvdyAqIHRoaXMuc2NhbGUsIFxyXG5cdFx0Ly8gXHR0aGlzLnNjYWxlX3NoYWRvdyAqIHRoaXMuc2NhbGUsIFxyXG5cdFx0Ly8gXHR0aGlzLnNjYWxlX3NoYWRvdyAqIHRoaXMuc2NhbGVcclxuXHRcdC8vICk7XHJcblx0XHRyZXR1cm4gdGhpcy5fYXZhdGFyX2dsb3djYXN0ZXIgPSBtZXNoO1xyXG5cdH0sXHJcblx0XHJcblx0X2F2YXRhcl9jcmVhdGVTaGFkb3dDYXN0ZXI6IGZ1bmN0aW9uKG1hcCwgZ2MpIHtcclxuXHRcdHZhciBtYXQgPSBuZXcgVEhSRUUuTWVzaEJhc2ljTWF0ZXJpYWwoKTtcclxuXHRcdG1hdC52aXNpYmxlID0gZmFsc2U7IC8vVGhlIG9iamVjdCB3b24ndCByZW5kZXIsIGJ1dCB0aGUgc2hhZG93IHN0aWxsIHdpbGxcclxuXHRcdGdjLmNvbGxlY3QobWF0KTtcclxuXHRcdFxyXG5cdFx0dmFyIGdlb20gPSBuZXcgVEhSRUUuU3BoZXJlR2VvbWV0cnkoMC4zLCA3LCAzKTtcclxuXHRcdGdjLmNvbGxlY3QoZ2VvbSk7XHJcblx0XHRcclxuXHRcdHZhciBtZXNoID0gbmV3IFRIUkVFLk1lc2goZ2VvbSwgbWF0KTtcclxuXHRcdG1lc2guY2FzdFNoYWRvdyA9IHRydWU7XHJcblx0XHRtZXNoLnBvc2l0aW9uLnNldCgwLCAwLjUsIDApO1xyXG5cdFx0XHJcblx0XHQvLyBzZWxmLnNldFNjYWxlKHNlbGYuc2NhbGVfc2hhZG93KTtcclxuXHRcdG1lc2guc2NhbGUuc2V0KFxyXG5cdFx0XHR0aGlzLnNjYWxlX3NoYWRvdyAqIHRoaXMuc2NhbGUsIFxyXG5cdFx0XHR0aGlzLnNjYWxlX3NoYWRvdyAqIHRoaXMuc2NhbGUsIFxyXG5cdFx0XHR0aGlzLnNjYWxlX3NoYWRvdyAqIHRoaXMuc2NhbGVcclxuXHRcdCk7XHJcblx0XHRyZXR1cm4gdGhpcy5fYXZhdGFyX3NoYWRvd2Nhc3RlciA9IG1lc2g7XHJcblx0fSxcclxuXHRcclxuXHRfYXZhdGFyX2NyZWF0ZVNwcml0ZSA6IGZ1bmN0aW9uKG1hcCwgZ2MpIHtcclxuXHRcdHZhciBzZWxmID0gdGhpcztcclxuXHRcdC8vIHZhciBpbWcgPSBuZXcgSW1hZ2UoKTtcclxuXHRcdHZhciB0ZXh0dXJlID0gc2VsZi5hdmF0YXJfdGV4ID0gbmV3IFRIUkVFLlRleHR1cmUoREVGX1NQUklURV9JTUcpO1xyXG5cdFx0Z2MuY29sbGVjdCh0ZXh0dXJlKTtcclxuXHRcdFxyXG5cdFx0Ly8gTm90ZTogbm90IHVzaW5nIFwidGhpcy5nZXRTcHJpdGVGb3JtYXRcIiwgYmVjYXVzZSB0aGUgZGVmYWlsdCBzcHJpdGVcclxuXHRcdC8vIGZvcm1hdCBzaG91bGQgbm90IGJlIG92ZXJpZGRlbi5cclxuXHRcdHZhciBzcGZvcm1hdCA9IGdldFNwcml0ZUZvcm1hdChERUZfU1BSSVRFX0ZPUk1BVCk7XHJcblx0XHRcclxuXHRcdHRoaXMuX19vbkxvYWRTcHJpdGUoREVGX1NQUklURV9JTUcsIHNwZm9ybWF0LCB0ZXh0dXJlKTtcclxuXHRcdC8vIGltZy5zcmMgPSBERUZfU1BSSVRFO1xyXG5cdFx0XHJcblx0XHR0ZXh0dXJlLm1hZ0ZpbHRlciA9IFRIUkVFLk5lYXJlc3RGaWx0ZXI7XHJcblx0XHR0ZXh0dXJlLm1pbkZpbHRlciA9IFRIUkVFLk5lYXJlc3RGaWx0ZXI7XHJcblx0XHR0ZXh0dXJlLnJlcGVhdCA9IG5ldyBUSFJFRS5WZWN0b3IyKDAuMjUsIDAuMjUpO1xyXG5cdFx0dGV4dHVyZS5vZmZzZXQgPSBuZXcgVEhSRUUuVmVjdG9yMigwLCAwKTtcclxuXHRcdHRleHR1cmUud3JhcFMgPSBUSFJFRS5NaXJyb3JlZFJlcGVhdFdyYXBwaW5nO1xyXG5cdFx0dGV4dHVyZS53cmFwVCA9IFRIUkVFLk1pcnJvcmVkUmVwZWF0V3JhcHBpbmc7XHJcblx0XHR0ZXh0dXJlLmdlbmVyYXRlTWlwbWFwcyA9IGZhbHNlOyAvL01pcG1hcHMgZ2VuZXJhdGUgdW5kZXNpcmFibGUgdHJhbnNwYXJlbmN5IGFydGlmYWN0c1xyXG5cdFx0Ly9UT0RPIE1pcnJvcmVkUmVwZWF0V3JhcHBpbmcsIGFuZCBqdXN0IHVzZSBhIG5lZ2F0aXZlIHggdXYgdmFsdWUsIHRvIGZsaXAgYSBzcHJpdGVcclxuXHRcdFxyXG5cdFx0c2VsZi5hdmF0YXJfZm9ybWF0ID0gc3Bmb3JtYXQ7XHJcblx0XHRcclxuXHRcdC8vIHZhciBtYXQgLyo9IHNlbGYuYXZhdGFyX21hdCovID0gbmV3IFRIUkVFLlNwcml0ZU1hdGVyaWFsKHtcclxuXHRcdC8vIFx0bWFwOiB0ZXh0dXJlLFxyXG5cdFx0Ly8gXHRjb2xvcjogMHhGRkZGRkYsXHJcblx0XHQvLyBcdHRyYW5zcGFyZW50OiB0cnVlLFxyXG5cdFx0Ly8gfSk7XHJcblx0XHRcclxuXHRcdGN1cnJlbnRNYXAubWFya0xvYWRpbmcoXCJBQ1RPUl9cIitzZWxmLmlkKTtcclxuXHRcdHRoaXMuX2F2YXRhcl9sb2FkU3ByaXRlKG1hcCwgdGV4dHVyZSk7XHJcblx0XHRcclxuXHRcdC8vdmFyIHNwcml0ZSA9IHNlbGYuYXZhdGFyX3Nwcml0ZSA9IG5ldyBUSFJFRS5TcHJpdGUobWF0KTtcclxuXHRcdHZhciBzcHJpdGUgPSBzZWxmLmF2YXRhcl9zcHJpdGUgPSBuZXcgQ2hhcmFjdGVyU3ByaXRlKHtcclxuXHRcdFx0bWFwOiB0ZXh0dXJlLFxyXG5cdFx0XHRjb2xvcjogMHhGRkZGRkYsXHJcblx0XHRcdG9mZnNldDogbmV3IFRIUkVFLlZlY3RvcjMoMCwgMC4zLCAwLjIyKSxcclxuXHRcdFx0Z2M6IGdjLFxyXG5cdFx0fSk7XHJcblx0XHQvL3NlbGYuc2V0U2NhbGUoc2VsZi5zY2FsZSk7XHJcblx0XHRzcHJpdGUuc2NhbGUuc2V0KFxyXG5cdFx0XHRzZWxmLnNjYWxlICogR0xPQkFMX1NDQUxFVVAsIFxyXG5cdFx0XHRzZWxmLnNjYWxlICogR0xPQkFMX1NDQUxFVVAsIFxyXG5cdFx0XHRzZWxmLnNjYWxlICogR0xPQkFMX1NDQUxFVVBcclxuXHRcdCk7XHJcblx0XHRcclxuXHRcdHJldHVybiBzcHJpdGU7XHJcblx0fSxcclxuXHRcclxuXHRfYXZhdGFyX2xvYWRTcHJpdGUgOiBmdW5jdGlvbihtYXAsIHRleHR1cmUpIHtcclxuXHRcdHZhciBzZWxmID0gdGhpcztcclxuXHRcdG1hcC5sb2FkU3ByaXRlKHNlbGYuaWQsIHNlbGYuc3ByaXRlLCBmdW5jdGlvbihlcnIsIHVybCl7XHJcblx0XHRcdGlmIChlcnIpIHtcclxuXHRcdFx0XHRjb25zb2xlLmVycm9yKFwiRVJST1IgTE9BRElORyBTUFJJVEU6IFwiLCBlcnIpO1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0dmFyIGltZyA9IG5ldyBJbWFnZSgpO1xyXG5cdFx0XHR2YXIgZm9ybWF0ID0gc2VsZi5zcHJpdGVfZm9ybWF0O1xyXG5cdFx0XHRpZiAoJC5pc1BsYWluT2JqZWN0KGZvcm1hdCkpIHtcclxuXHRcdFx0XHRmb3JtYXQgPSBzZWxmLnNwcml0ZV9mb3JtYXRbc2VsZi5zcHJpdGVdO1xyXG5cdFx0XHR9XHJcblx0XHRcdGlmICh0eXBlb2YgZm9ybWF0ID09IFwiZnVuY3Rpb25cIikge1xyXG5cdFx0XHRcdGZvcm1hdCA9IHNlbGYuc3ByaXRlX2Zvcm1hdChzZWxmLnNwcml0ZSk7XHJcblx0XHRcdH1cclxuXHRcdFx0aWYgKHR5cGVvZiBmb3JtYXQgIT0gXCJzdHJpbmdcIikge1xyXG5cdFx0XHRcdGNvbnNvbGUuZXJyb3IoXCJJTlZBTElEIFNQUklURSBGT1JNQVQhICdzcHJpdGVfZm9ybWF0JyBtdXN0IGJlIGEgc3RyaW5nLCBhbiBvYmplY3QsIG9yIGEgXCIrXHJcblx0XHRcdFx0XHRcImZ1bmN0aW9uIHRoYXQgcmV0dXJucyBhIHN0cmluZyEgVG8gcHJvdmlkZSBhIGN1c3RvbSBmb3JtYXQsIG92ZXJyaWRlIFwiK1xyXG5cdFx0XHRcdFx0XCJnZXRTcHJpdGVGb3JtYXQgb24gdGhlIGFjdG9yIGluc3RhbmNlIVwiKTtcclxuXHRcdFx0XHRmb3JtYXQgPSBERUZfU1BSSVRFX0ZPUk1BVDtcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0c2VsZi5fX29uTG9hZFNwcml0ZShpbWcsIHNlbGYuZ2V0U3ByaXRlRm9ybWF0KGZvcm1hdCksIHRleHR1cmUpO1xyXG5cdFx0XHRpbWcuc3JjID0gdXJsO1xyXG5cdFx0fSk7XHJcblx0fSxcclxuXHRcclxuXHRfX29uTG9hZFNwcml0ZSA6IGZ1bmN0aW9uKGltZywgZm9ybWF0LCB0ZXh0dXJlKSB7XHJcblx0XHR2YXIgc2VsZiA9IHRoaXM7XHJcblx0XHR2YXIgZiA9IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHR0ZXh0dXJlLmltYWdlID0gaW1nO1xyXG5cdFx0XHRcclxuXHRcdFx0c2VsZi5hdmF0YXJfZm9ybWF0ID0gZm9ybWF0O1xyXG5cdFx0XHR0ZXh0dXJlLnJlcGVhdC5zZXQoXHJcblx0XHRcdFx0c2VsZi5hdmF0YXJfZm9ybWF0LndpZHRoIC8gaW1nLm5hdHVyYWxXaWR0aCwgXHJcblx0XHRcdFx0c2VsZi5hdmF0YXJfZm9ybWF0LmhlaWdodCAvIGltZy5uYXR1cmFsSGVpZ2h0KTtcclxuXHJcblx0XHRcdHRleHR1cmUubmVlZHNVcGRhdGUgPSB0cnVlO1xyXG5cdFx0XHRcclxuXHRcdFx0Ly8gc2VsZi5zaG93QW5pbWF0aW9uRnJhbWUoXCJkMFwiKTtcclxuXHRcdFx0c2VsZi5wbGF5QW5pbWF0aW9uKFwic3RhbmRcIik7XHJcblx0XHRcdGN1cnJlbnRNYXAubWFya0xvYWRGaW5pc2hlZChcIkFDVE9SX1wiK3NlbGYuaWQpO1xyXG5cdFx0XHRcclxuXHRcdFx0aW1nLnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJsb2FkXCIsIGYpO1xyXG5cdFx0XHRpbWcucmVtb3ZlRXZlbnRMaXN0ZW5lcihcImxvYWRcIiwgZSk7XHJcblx0XHR9XHJcblx0XHR2YXIgZSA9IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRjb25zb2xlLmVycm9yKFwiRXJyb3Igd2hpbGUgbG9hZGluZyB0ZXh0dXJlIVwiLCBpbWcuc3JjKTtcclxuXHRcdFx0dGV4dHVyZS5uZWVkc1VwZGF0ZSA9IHRydWU7IC8vdXBkYXRlIHRoZSBtaXNzaW5nIHRleHR1cmUgcHJlLWxvYWRlZFxyXG5cdFx0XHRjdXJyZW50TWFwLm1hcmtMb2FkRmluaXNoZWQoXCJBQ1RPUl9cIitzZWxmLmlkKTtcclxuXHRcdFx0XHJcblx0XHRcdGltZy5yZW1vdmVFdmVudExpc3RlbmVyKFwibG9hZFwiLCBmKTtcclxuXHRcdFx0aW1nLnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJsb2FkXCIsIGUpO1xyXG5cdFx0fVxyXG5cdFx0aW1nLm9uKFwibG9hZFwiLCBmKTtcclxuXHRcdGltZy5vbihcImVycm9yXCIsIGUpO1xyXG5cdH0sXHJcblx0XHJcblx0Ly8gT3ZlcnJpZGUgdGhpcyBmdW5jdGlvbiB0byBwcm92aWRlIGEgY3VzdG9tIHNwcml0ZSBmb3JtYXRcclxuXHRnZXRTcHJpdGVGb3JtYXQgOiBmdW5jdGlvbihmb3JtYXQpIHtcclxuXHRcdHJldHVybiBnZXRTcHJpdGVGb3JtYXQoZm9ybWF0KTtcclxuXHR9LFxyXG5cdFxyXG5cdC8vLy8vLy8vLy8vLy8vLy8vLy8gQW5pbWF0aW9uIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHRfYW5pbWF0aW9uU3RhdGUgOiBudWxsLFxyXG5cdGZhY2luZyA6IG51bGwsXHJcblx0YW5pbWF0aW9uU3BlZWQ6IDEsIC8vZGVmYXVsdCBhbmltYXRpb24gc3BlZWRcclxuXHRcclxuXHRfaW5pdEFuaW1hdGlvblN0YXRlIDogZnVuY3Rpb24oKSB7XHJcblx0XHRpZiAoIXRoaXMuX2FuaW1hdGlvblN0YXRlKVxyXG5cdFx0XHR0aGlzLl9hbmltYXRpb25TdGF0ZSA9IHtcclxuXHRcdFx0XHRjdXJyQW5pbSA6IG51bGwsIC8vIEFuaW1hdGlvbiBvYmplY3RcclxuXHRcdFx0XHRjdXJyRnJhbWUgOiBudWxsLCAvLyBDdXJyZW50bHkgZGlzcGxheWVkIHNwcml0ZSBmcmFtZSBuYW1lXHJcblx0XHRcdFx0bmV4dEFuaW0gOiBudWxsLCAvLyBBbmltYXRpb24gb2JqZWN0IGluIHF1ZXVlXHJcblx0XHRcdFx0XHJcblx0XHRcdFx0c3RvcE5leHRUcmFuc2l0aW9uOiBmYWxzZSwgLy9TdG9wIGF0IHRoZSBuZXh0IHRyYW5zaXRpb24gZnJhbWUsIHRvIHNob3J0LXN0b3AgdGhlIFwiQnVtcFwiIGFuaW1hdGlvblxyXG5cdFx0XHR9O1xyXG5cdFx0cmV0dXJuIHRoaXMuX2FuaW1hdGlvblN0YXRlO1xyXG5cdH0sXHJcblx0XHJcblx0Z2V0RGlyZWN0aW9uRmFjaW5nIDogZnVuY3Rpb24oKSB7XHJcblx0XHRpZiAoIWN1cnJlbnRNYXAgfHwgIWN1cnJlbnRNYXAuY2FtZXJhKSByZXR1cm4gXCJkXCI7XHJcblx0XHRcclxuXHRcdHZhciBkaXJ2ZWN0b3IgPSB0aGlzLmZhY2luZy5jbG9uZSgpO1xyXG5cdFx0ZGlydmVjdG9yLmFwcGx5UXVhdGVybmlvbiggY3VycmVudE1hcC5jYW1lcmEucXVhdGVybmlvbiApO1xyXG5cdFx0ZGlydmVjdG9yLnByb2plY3RPblBsYW5lKEVWRU5UX1BMQU5FX05PUk1BTCkubm9ybWFsaXplKCk7XHJcblx0XHRcclxuXHRcdHZhciB4ID0gZGlydmVjdG9yLngsIHkgPSBkaXJ2ZWN0b3IuejtcclxuXHRcdC8vIGNvbnNvbGUubG9nKFwiRElSRkFDSU5HOlwiLCB4LCB5KTtcclxuXHRcdGlmIChNYXRoLmFicyh4KSA+IE1hdGguYWJzKHkpKSB7IC8vRGlyZWN0aW9uIHZlY3RvciBpcyBwb2ludGluZyBhbG9uZyB4IGF4aXNcclxuXHRcdFx0aWYgKHggPiAwKSByZXR1cm4gXCJsXCI7XHJcblx0XHRcdGVsc2UgcmV0dXJuIFwiclwiO1xyXG5cdFx0fSBlbHNlIHsgLy9EaXJlY3Rpb24gdmVjdG9yIGlzIHBvaW50aW5nIGFsb25nIHkgYXhpc1xyXG5cdFx0XHRpZiAoeSA+IDApIHJldHVybiBcImRcIjtcclxuXHRcdFx0ZWxzZSByZXR1cm4gXCJ1XCI7XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gXCJkXCI7XHJcblx0fSxcclxuXHRcclxuXHRzaG93QW5pbWF0aW9uRnJhbWUgOiBmdW5jdGlvbihmcmFtZSkge1xyXG5cdFx0dmFyIHN0YXRlID0gdGhpcy5faW5pdEFuaW1hdGlvblN0YXRlKCk7XHJcblx0XHRcclxuXHRcdHZhciBkZWYgPSB0aGlzLmF2YXRhcl9mb3JtYXQuZnJhbWVzW2ZyYW1lXTtcclxuXHRcdGlmICghZGVmKSB7XHJcblx0XHRcdGNvbnNvbGUud2FybihcIkVSUk9SIFwiLCB0aGlzLmlkLCBcIjogQW5pbWF0aW9uIGZyYW1lIGRvZXNuJ3QgZXhpc3Q6XCIsIGZyYW1lKTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cdFx0c3RhdGUuZnJhbWVOYW1lID0gZnJhbWU7XHJcblx0XHRcclxuXHRcdHZhciBmbGlwID0gZmFsc2U7XHJcblx0XHRpZiAodHlwZW9mIGRlZiA9PSBcInN0cmluZ1wiKSB7IC8vcmVkaXJlY3RcclxuXHRcdFx0ZGVmID0gdGhpcy5hdmF0YXJfZm9ybWF0LmZyYW1lc1tkZWZdO1xyXG5cdFx0XHRmbGlwID0gdHJ1ZTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0dmFyIHUgPSBkZWZbMF0gKiB0aGlzLmF2YXRhcl90ZXgucmVwZWF0Lng7XHJcblx0XHR2YXIgdiA9IDEgLSAoKGRlZlsxXSsxKSAqIHRoaXMuYXZhdGFyX3RleC5yZXBlYXQueSk7XHJcblx0XHQvL0ZvciBzb21lIHJlYXNvbiwgb2Zmc2V0cyBhcmUgZnJvbSB0aGUgQk9UVE9NIGxlZnQ/IVxyXG5cdFx0XHJcblx0XHRpZiAoZmxpcCAmJiB0aGlzLmF2YXRhcl9mb3JtYXQuZmxpcCkge1xyXG5cdFx0XHR1ID0gMCAtIChkZWZbMF0tMSkgKiB0aGlzLmF2YXRhcl90ZXgucmVwZWF0Lng7IC8vVE9ETyB0ZXN0XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdHRoaXMuYXZhdGFyX3RleC5vZmZzZXQuc2V0KHUsIHYpOyBcclxuXHRcdHRoaXMuYXZhdGFyX3RleC5uZWVkc1VwZGF0ZSA9IHRydWU7XHJcblx0fSxcclxuXHRcclxuXHRwbGF5QW5pbWF0aW9uIDogZnVuY3Rpb24oYW5pbU5hbWUsIG9wdHMpIHtcclxuXHRcdHZhciBzdGF0ZSA9IHRoaXMuX2luaXRBbmltYXRpb25TdGF0ZSgpO1xyXG5cdFx0aWYgKCFvcHRzKSBvcHRzID0ge307XHJcblx0XHRcclxuXHRcdHZhciBhbmltID0gdGhpcy5hdmF0YXJfZm9ybWF0LmFuaW1zW2FuaW1OYW1lXTtcclxuXHRcdGlmICghYW5pbSkge1xyXG5cdFx0XHRjb25zb2xlLndhcm4oXCJFUlJPUlwiLCB0aGlzLmlkLCBcIjogQW5pbWF0aW9uIG5hbWUgZG9lc24ndCBleGlzdDpcIiwgYW5pbU5hbWUpO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblx0XHRhbmltLnBhcmVudCA9IHRoaXM7XHJcblx0XHRzdGF0ZS5uZXh0QW5pbSA9IGFuaW07XHJcblx0XHRhbmltLnNwZWVkID0gKG9wdHMuc3BlZWQgPT0gdW5kZWZpbmVkKT8gdGhpcy5hbmltYXRpb25TcGVlZCA6IG9wdHMuc3BlZWQ7XHJcblx0XHRzdGF0ZS5zdG9wTmV4dFRyYW5zaXRpb24gPSBvcHRzLnN0b3BOZXh0VHJhbnNpdGlvbiB8fCBmYWxzZTtcclxuXHR9LFxyXG5cdFxyXG5cdHN0b3BBbmltYXRpb24gOiBmdW5jdGlvbigpIHtcclxuXHRcdHZhciBzdGF0ZSA9IHRoaXMuX2luaXRBbmltYXRpb25TdGF0ZSgpO1xyXG5cdFx0XHJcblx0XHQvLyBzdGF0ZS5ydW5uaW5nID0gZmFsc2U7XHJcblx0XHQvLyBzdGF0ZS5xdWV1ZSA9IG51bGw7XHJcblx0XHQvLyBzdGF0ZS5zdG9wRnJhbWUgPSBudWxsO1xyXG5cdFx0dGhpcy5lbWl0KFwiYW5pbS1lbmRcIiwgc3RhdGUuYW5pbU5hbWUpO1xyXG5cdH0sXHJcblx0XHJcblx0X3RpY2tfZG9BbmltYXRpb246IGZ1bmN0aW9uKGRlbHRhKSB7XHJcblx0XHR2YXIgc3RhdGUgPSB0aGlzLl9hbmltYXRpb25TdGF0ZTtcclxuXHRcdHZhciBDQSA9IHN0YXRlLmN1cnJBbmltO1xyXG5cdFx0aWYgKCFDQSkgQ0EgPSBzdGF0ZS5jdXJyQW5pbSA9IHN0YXRlLm5leHRBbmltO1xyXG5cdFx0aWYgKCFDQSkgcmV0dXJuO1xyXG5cdFx0XHJcblx0XHRDQS5hZHZhbmNlKGRlbHRhKTtcclxuXHRcdFxyXG5cdFx0aWYgKHN0YXRlLm5leHRBbmltICYmIENBLmNhblRyYW5zaXRpb24oKSkge1xyXG5cdFx0XHQvL1N3aXRjaCBhbmltYXRpb25zXHJcblx0XHRcdENBLnJlc2V0KCk7XHJcblx0XHRcdENBID0gc3RhdGUuY3VyckFuaW0gPSBzdGF0ZS5uZXh0QW5pbTtcclxuXHRcdFx0c3RhdGUubmV4dEFuaW0gPSBudWxsO1xyXG5cdFx0XHRcclxuXHRcdFx0Ly8gdGhpcy5lbWl0KFwiYW5pbS1lbmRcIiwgbnVsbCk7IC8vVE9ETyBwcm92aWRlIGFuaW0gbmFtZVxyXG5cdFx0XHRcclxuXHRcdFx0aWYgKHN0YXRlLnN0b3BOZXh0VHJhbnNpdGlvbikge1xyXG5cdFx0XHRcdHRoaXMucGxheUFuaW1hdGlvbihcInN0YW5kXCIpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdHZhciBkaXIgPSB0aGlzLmdldERpcmVjdGlvbkZhY2luZygpO1xyXG5cdFx0dmFyIGZyYW1lID0gQ0EuZ2V0RnJhbWVUb0Rpc3BsYXkoZGlyKTtcclxuXHRcdGlmIChmcmFtZSAhPSBzdGF0ZS5jdXJyRnJhbWUpIHtcclxuXHRcdFx0dGhpcy5zaG93QW5pbWF0aW9uRnJhbWUoZnJhbWUpO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0fSxcclxuXHRcclxuXHQvLy8vLy8vLy8vLy8vLy8vLy8vIE1vdmVtZW50IGFuZCBQYXRoaW5nIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHRfcGF0aGluZ1N0YXRlIDogbnVsbCxcclxuXHRcclxuXHRfaW5pdFBhdGhpbmdTdGF0ZSA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0aWYgKCF0aGlzLl9wYXRoaW5nU3RhdGUpXHJcblx0XHRcdHRoaXMuX3BhdGhpbmdTdGF0ZSA9IHtcclxuXHRcdFx0XHRxdWV1ZTogW10sXHJcblx0XHRcdFx0bW92aW5nOiBmYWxzZSxcclxuXHRcdFx0XHRzcGVlZDogMSxcclxuXHRcdFx0XHRkZWx0YTogMCwgLy90aGUgZGVsdGEgZnJvbSBzcmMgdG8gZGVzdFxyXG5cdFx0XHRcdGp1bXBpbmcgOiBmYWxzZSxcclxuXHRcdFx0XHQvLyBkaXI6IFwiZFwiLFxyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdGRlc3RMb2NDOiBuZXcgVEhSRUUuVmVjdG9yMygpLnNldCh0aGlzLmxvY2F0aW9uKSwgLy9jb2xsaXNpb24gbWFwIGxvY2F0aW9uXHJcblx0XHRcdFx0ZGVzdExvYzM6IG5ldyBUSFJFRS5WZWN0b3IzKCksIC8vd29ybGQgc3BhY2UgbG9jYXRpb25cclxuXHRcdFx0XHRzcmNMb2NDOiBuZXcgVEhSRUUuVmVjdG9yMygpLnNldCh0aGlzLmxvY2F0aW9uKSxcclxuXHRcdFx0XHRzcmNMb2MzOiBuZXcgVEhSRUUuVmVjdG9yMygpLFxyXG5cdFx0XHRcdG1pZHBvaW50T2Zmc2V0OiBuZXcgVEhSRUUuVmVjdG9yMygpLFxyXG5cdFx0XHR9O1xyXG5cdFx0cmV0dXJuIHRoaXMuX3BhdGhpbmdTdGF0ZTtcclxuXHR9LFxyXG5cdFxyXG5cdHBhdGhUbyA6IGZ1bmN0aW9uKHgsIHkpIHtcclxuXHRcdHZhciBzdGF0ZSA9IHRoaXMuX2luaXRQYXRoaW5nU3RhdGUoKTtcclxuXHRcdFxyXG5cdFx0Y29uc29sZS5lcnJvcih0aGlzLmlkLCBcIjogUGF0aGluZyBoYXMgbm90IGJlZW4gaW1wbGVtZW50ZWQgeWV0IVwiKTtcclxuXHR9LFxyXG5cdFxyXG5cdGNsZWFyUGF0aGluZyA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0dmFyIHN0YXRlID0gdGhpcy5faW5pdFBhdGhpbmdTdGF0ZSgpO1xyXG5cdFx0c3RhdGUucXVldWUubGVuZ3RoID0gMDtcclxuXHR9LFxyXG5cdFxyXG5cdG1vdmVEaXIgOiBmdW5jdGlvbihkaXIpIHtcclxuXHRcdHZhciB4ID0gdGhpcy5sb2NhdGlvbi54O1xyXG5cdFx0dmFyIHkgPSB0aGlzLmxvY2F0aW9uLnk7XHJcblx0XHR2YXIgeiA9IHRoaXMubG9jYXRpb24uejtcclxuXHRcdHN3aXRjaCAoZGlyKSB7XHJcblx0XHRcdGNhc2UgXCJkXCI6IGNhc2UgXCJkb3duXCI6XHR5ICs9IDE7IGJyZWFrO1xyXG5cdFx0XHRjYXNlIFwidVwiOiBjYXNlIFwidXBcIjpcdHkgLT0gMTsgYnJlYWs7XHJcblx0XHRcdGNhc2UgXCJsXCI6IGNhc2UgXCJsZWZ0XCI6XHR4IC09IDE7IGJyZWFrO1xyXG5cdFx0XHRjYXNlIFwiclwiOiBjYXNlIFwicmlnaHRcIjpcdHggKz0gMTsgYnJlYWs7XHJcblx0XHR9XHJcblx0XHR0aGlzLm1vdmVUbyh4LCB5LCB6KTtcclxuXHR9LFxyXG5cdFxyXG5cdGZhY2VJbnRlcmFjdG9yIDogZnVuY3Rpb24odmVjdG9yKSB7XHJcblx0XHR0aGlzLmZhY2luZyA9IHZlY3Rvci5jbG9uZSgpLm5lZ2F0ZSgpO1xyXG5cdH0sXHJcblx0XHJcblx0ZmFjZURpciA6IGZ1bmN0aW9uKHgsIHkpIHtcclxuXHRcdHRoaXMuZmFjaW5nLnNldCgteCwgMCwgeSk7XHJcblx0fSxcclxuXHRcclxuXHRtb3ZlVG8gOiBmdW5jdGlvbih4LCB5LCBsYXllciwgb3B0cykgeyAvL2J5cGFzcyBXYWxrbWFzayBDaGVja1xyXG5cdFx0aWYgKCQuaXNQbGFpbk9iamVjdChsYXllcikgJiYgb3B0cyA9PT0gdW5kZWZpbmVkKSB7XHJcblx0XHRcdG9wdHMgPSBsYXllcjsgbGF5ZXIgPSB1bmRlZmluZWQ7XHJcblx0XHR9XHJcblx0XHRpZiAob3B0cyA9PT0gdW5kZWZpbmVkKSBvcHRzID0ge307XHJcblx0XHRcclxuXHRcdHZhciBzdGF0ZSA9IHRoaXMuX2luaXRQYXRoaW5nU3RhdGUoKTtcclxuXHRcdHZhciBzcmMgPSB0aGlzLmxvY2F0aW9uO1xyXG5cdFx0bGF5ZXIgPSAobGF5ZXIgPT0gdW5kZWZpbmVkKT8gdGhpcy5sb2NhdGlvbi56IDogbGF5ZXI7XHJcblx0XHRcclxuXHRcdHRoaXMuZmFjaW5nLnNldChzcmMueC14LCAwLCB5LXNyYy55KTtcclxuXHRcdFxyXG5cdFx0dmFyIHdhbGttYXNrID0gY3VycmVudE1hcC5jYW5XYWxrQmV0d2VlbihzcmMueCwgc3JjLnksIHgsIHkpO1xyXG5cdFx0aWYgKG9wdHMuYnlwYXNzICE9PSB1bmRlZmluZWQpIHdhbGttYXNrID0gb3B0cy5ieXBhc3M7XHJcblx0XHRpZiAoIXdhbGttYXNrKSB7XHJcblx0XHRcdHRoaXMuZW1pdChcImNhbnQtbW92ZVwiLCBzcmMueCwgc3JjLnksIHgsIHkpO1xyXG5cdFx0XHRjdXJyZW50TWFwLmRpc3BhdGNoKHgsIHksIFwiYnVtcGVkXCIsIHRoaXMuZmFjaW5nKTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cdFx0aWYgKCh3YWxrbWFzayAmIDB4MTApID09IDB4MTApIHsgLy8gQ2hlY2sgTm9OUEMgdGlsZXNcclxuXHRcdFx0aWYgKHRoaXMuaXNOUEMoKSkge1xyXG5cdFx0XHRcdHRoaXMuZW1pdChcImNhbnQtbW92ZVwiLCBzcmMueCwgc3JjLnksIHgsIHkpO1xyXG5cdFx0XHRcdGN1cnJlbnRNYXAuZGlzcGF0Y2goeCwgeSwgXCJidW1wZWRcIiwgdGhpcy5mYWNpbmcpO1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0aWYgKCh3YWxrbWFzayAmIDB4OCkgPT0gMHg4KSB7XHJcblx0XHRcdC8vIFRyYW5zaXRpb24gbm93IHRvIGFub3RoZXIgbGF5ZXJcclxuXHRcdFx0dmFyIHQgPSBjdXJyZW50TWFwLmdldExheWVyVHJhbnNpdGlvbih4LCB5LCB0aGlzLmxvY2F0aW9uLnopO1xyXG5cdFx0XHRjb25zb2xlLmxvZyhcIkxheWVyIFRyYW5zaXRpb246IFwiLCB0KTtcclxuXHRcdFx0eCA9IHQueDsgeSA9IHQueTsgbGF5ZXIgPSB0LmxheWVyO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHRcclxuXHRcdHZhciBhbmltb3B0cyA9IHt9O1xyXG5cdFx0c3RhdGUubWlkcG9pbnRPZmZzZXQuc2V0KDAsIDAsIDApO1xyXG5cdFx0c3RhdGUuc3JjTG9jQy5zZXQoc3JjKTtcclxuXHRcdHN0YXRlLnNyY0xvYzMuc2V0KGN1cnJlbnRNYXAuZ2V0M0RUaWxlTG9jYXRpb24oc3JjKSk7XHJcblx0XHRzdGF0ZS5kZXN0TG9jQy5zZXQoeCwgeSwgbGF5ZXIpO1xyXG5cdFx0c3RhdGUuZGVzdExvYzMuc2V0KGN1cnJlbnRNYXAuZ2V0M0RUaWxlTG9jYXRpb24oeCwgeSwgbGF5ZXIpKTtcclxuXHRcdHN0YXRlLmRlbHRhID0gMDtcclxuXHRcdHN0YXRlLnNwZWVkID0gb3B0cy5zcGVlZCB8fCAxO1xyXG5cdFx0c3RhdGUubW92aW5nID0gdHJ1ZTtcclxuXHRcdGFuaW1vcHRzLnNwZWVkID0gb3B0cy5zcGVlZCB8fCAxO1xyXG5cdFx0XHJcblx0XHRpZiAoKHdhbGttYXNrICYgMHgyKSA9PT0gMHgyKSB7XHJcblx0XHRcdHN0YXRlLm1pZHBvaW50T2Zmc2V0LnNldFkoMC42KTtcclxuXHRcdFx0c3RhdGUuanVtcGluZyA9IHRydWU7XHJcblx0XHRcdHN0YXRlLnNwZWVkID0gMTsgLy9lbmZvcmNlIGEganVtcGluZyBzcGVlZCBvZiAxXHJcblx0XHRcdFNvdW5kTWFuYWdlci5wbGF5U291bmQoXCJ3YWxrX2p1bXBcIik7XHJcblx0XHRcdGFuaW1vcHRzLnNwZWVkID0gMS41O1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHR0aGlzLnBsYXlBbmltYXRpb24oXCJ3YWxrXCIsIGFuaW1vcHRzKTtcclxuXHRcdHRoaXMuZW1pdChcIm1vdmluZ1wiLCBzdGF0ZS5zcmNMb2NDLngsIHN0YXRlLnNyY0xvY0MueSwgc3RhdGUuZGVzdExvY0MueCwgc3RhdGUuZGVzdExvY0MueSk7XHJcblx0fSxcclxuXHRcclxuXHRfdGlja19kb01vdmVtZW50IDogZnVuY3Rpb24oZGVsdGEpIHtcclxuXHRcdHZhciBzdGF0ZSA9IHRoaXMuX2luaXRQYXRoaW5nU3RhdGUoKTtcclxuXHRcdFxyXG5cdFx0c3RhdGUuZGVsdGEgKz0gc3RhdGUuc3BlZWQgKiAoZGVsdGEgKiBDT05GSUcuc3BlZWQucGF0aGluZyk7XHJcblx0XHR2YXIgYWxwaGEgPSBNYXRoLmNsYW1wKHN0YXRlLmRlbHRhKTtcclxuXHRcdHZhciBiZXRhID0gTWF0aC5zaW4oYWxwaGEgKiBNYXRoLlBJKTtcclxuXHRcdHRoaXMuYXZhdGFyX25vZGUucG9zaXRpb24uc2V0KCBcclxuXHRcdFx0Ly9MZXJwIGJldHdlZW4gc3JjIGFuZCBkZXN0IChidWlsdCBpbiBsZXJwKCkgaXMgZGVzdHJ1Y3RpdmUsIGFuZCBzZWVtcyBiYWRseSBkb25lKVxyXG5cdFx0XHRzdGF0ZS5zcmNMb2MzLnggKyAoKHN0YXRlLmRlc3RMb2MzLnggLSBzdGF0ZS5zcmNMb2MzLngpICogYWxwaGEpICsgKHN0YXRlLm1pZHBvaW50T2Zmc2V0LnggKiBiZXRhKSxcclxuXHRcdFx0c3RhdGUuc3JjTG9jMy55ICsgKChzdGF0ZS5kZXN0TG9jMy55IC0gc3RhdGUuc3JjTG9jMy55KSAqIGFscGhhKSArIChzdGF0ZS5taWRwb2ludE9mZnNldC55ICogYmV0YSksXHJcblx0XHRcdHN0YXRlLnNyY0xvYzMueiArICgoc3RhdGUuZGVzdExvYzMueiAtIHN0YXRlLnNyY0xvYzMueikgKiBhbHBoYSkgKyAoc3RhdGUubWlkcG9pbnRPZmZzZXQueiAqIGJldGEpXHJcblx0XHQpO1xyXG5cdFx0XHJcblx0XHRpZiAoc3RhdGUuZGVsdGEgPiAxKSB7XHJcblx0XHRcdHRoaXMuZW1pdChcIm1vdmVkXCIsIHN0YXRlLnNyY0xvY0MueCwgc3RhdGUuc3JjTG9jQy55LCBzdGF0ZS5kZXN0TG9jQy54LCBzdGF0ZS5kZXN0TG9jQy55KTtcclxuXHRcdFx0dGhpcy5sb2NhdGlvbi5zZXQoIHN0YXRlLmRlc3RMb2NDICk7XHJcblx0XHRcdFxyXG5cdFx0XHRpZiAoc3RhdGUuanVtcGluZykge1xyXG5cdFx0XHRcdC8vVE9ETyBwYXJ0aWNsZSBlZmZlY3RzXHJcblx0XHRcdFx0U291bmRNYW5hZ2VyLnBsYXlTb3VuZChcIndhbGtfanVtcF9sYW5kXCIpO1xyXG5cdFx0XHRcdHN0YXRlLmp1bXBpbmcgPSBmYWxzZTtcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0dmFyIG5leHQgPSBzdGF0ZS5xdWV1ZS5zaGlmdCgpO1xyXG5cdFx0XHRpZiAoIW5leHQpIHtcclxuXHRcdFx0XHRzdGF0ZS5kZWx0YSA9IDA7XHJcblx0XHRcdFx0c3RhdGUubW92aW5nID0gZmFsc2U7XHJcblx0XHRcdFx0Ly8gdGhpcy5zdG9wQW5pbWF0aW9uKCk7XHJcblx0XHRcdFx0dGhpcy5wbGF5QW5pbWF0aW9uKFwic3RhbmRcIik7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0dGhpcy5tb3ZlVG8obmV4dC54LCBuZXh0LnksIG5leHQueik7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9LFxyXG5cdFxyXG5cdFxyXG5cdC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLyBCZWhhdmlvcnMgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cdGJlaGF2aW9yU3RhY2sgOiBudWxsLFxyXG5cdFxyXG5cdF9pbml0QmVoYXZpb3JTdGFjayA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0aWYgKCF0aGlzLmJlaGF2aW9yU3RhY2spXHJcblx0XHRcdHRoaXMuYmVoYXZpb3JTdGFjayA9IFtdO1xyXG5cdH0sXHJcblx0XHJcblx0X3RpY2tfZG9CZWhhdmlvciA6IGZ1bmN0aW9uKGRlbHRhKSB7XHJcblx0XHR2YXIgYmVoYXYgPSB0aGlzLmJlaGF2aW9yU3RhY2sudG9wO1xyXG5cdFx0aWYgKCFiZWhhdiB8fCAhYmVoYXYuX3RpY2spIHJldHVybjtcclxuXHRcdGJlaGF2Ll90aWNrKHRoaXMsIGRlbHRhKTtcclxuXHR9LFxyXG5cdFxyXG5cdF9kb0JlaGF2aW9yX2ludGVyYWN0IDogZnVuY3Rpb24oZnJvbURpcikge1xyXG5cdFx0dmFyIGJlaGF2ID0gdGhpcy5iZWhhdmlvclN0YWNrLnRvcDtcclxuXHRcdGlmICghYmVoYXYgfHwgIWJlaGF2Ll9pbnRlcmFjdCkgcmV0dXJuO1xyXG5cdFx0YmVoYXYuX2ludGVyYWN0KHRoaXMsIGZyb21EaXIpO1xyXG5cdH0sXHJcblx0XHJcblx0X2RvQmVoYXZpb3JfYnVtcCA6IGZ1bmN0aW9uKGZyb21EaXIpIHtcclxuXHRcdHZhciBiZWhhdiA9IHRoaXMuYmVoYXZpb3JTdGFjay50b3A7XHJcblx0XHRpZiAoIWJlaGF2IHx8ICFiZWhhdi5fYnVtcCkgcmV0dXJuO1xyXG5cdFx0YmVoYXYuX2J1bXAodGhpcywgZnJvbURpcik7XHJcblx0fSxcclxuXHRcclxuXHQvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHRcclxuXHRzaG91bGRBcHBlYXI6IGZ1bmN0aW9uKG1hcGlkKSB7XHJcblx0XHRpZiAodGhpcy5zY2hlZHVsZSkge1xyXG5cdFx0XHR2YXIgdGltZXN0YW1wID0gQWN0b3JTY2hlZHVsZXIuZ2V0VGltZXN0YW1wKCk7XHJcblx0XHRcdHZhciBzaG91bGQgPSB0aGlzLnNjaGVkdWxlW3RpbWVzdGFtcF0gPT0gbWFwaWQ7XHJcblx0XHRcdGlmICghc2hvdWxkKSBjb25zb2xlLmxvZyhcIkFjdG9yXCIsIHRoaXMuaWQsIFwic2hvdWxkIE5PVCBhcHBlYXIgYWNjb3JkaW5nIHRvIHNjaGVkdWxlci4uLiBcIiwgdGhpcy5zY2hlZHVsZVt0aW1lc3RhbXBdKTtcclxuXHRcdFx0cmV0dXJuIHNob3VsZDtcclxuXHRcdH1cclxuXHRcdHJldHVybiB0cnVlOyAvL25vIHNjaGVkdWxlLCBhbHdheXMgYXBwZWFyXHJcblx0fSxcclxuXHRcclxuXHRzY2hlZHVsZTogbnVsbCxcclxuXHRcclxuXHQvLy8vLy8vLy8vLy8vLy8vLy8vLy8gUHJpdmF0ZSBNZXRob2RzIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHRcclxuXHRjYW5XYWxrT24gOiBmdW5jdGlvbigpeyByZXR1cm4gZmFsc2U7IH0sXHJcblx0aXNOUEMgOiBmdW5jdGlvbigpeyByZXR1cm4gdHJ1ZTsgfSxcclxuXHRcclxuXHRfbm9ybWFsaXplTG9jYXRpb24gOiBmdW5jdGlvbigpIHtcclxuXHRcdGlmICh0aGlzLmxvY2F0aW9uID09IFwicmFuZFwiKSB7XHJcblx0XHRcdC8vUGxhY2UgdGhpcyBhY3RvciBpbiBhIGRlc2lnbmF0ZWQgcmFuZG9tIGxvY2F0aW9uXHJcblx0XHRcdHRoaXMubG9jYXRpb24gPSBjdXJyZW50TWFwLmdldFJhbmRvbU5QQ1NwYXduUG9pbnQoKTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHR2YXIgbnVtID0gRXZlbnQucHJvdG90eXBlLl9ub3JtYWxpemVMb2NhdGlvbi5jYWxsKHRoaXMpO1xyXG5cdFx0aWYgKG51bSAhPSAxIHx8ICF0aGlzLmxvY2F0aW9uKVxyXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJBY3RvcnMgY2FuIG9ubHkgYmUgaW4gb25lIHBsYWNlIGF0IGEgdGltZSEgTnVtYmVyIG9mIGxvY2F0aW9uczogXCIrbnVtKTtcclxuXHR9LFxyXG5cdFxyXG5cdF9hY3RvclRpY2sgOiBmdW5jdGlvbihkZWx0YSkge1xyXG5cdFx0Ly8gRG8gYW5pbWF0aW9uXHJcblx0XHRpZiAodGhpcy5fYW5pbWF0aW9uU3RhdGUpIFxyXG5cdFx0XHR0aGlzLl90aWNrX2RvQW5pbWF0aW9uKGRlbHRhKTtcclxuXHRcdFxyXG5cdFx0Ly8gRG8gbW92ZW1lbnRcclxuXHRcdGlmICh0aGlzLl9wYXRoaW5nU3RhdGUgJiYgdGhpcy5fcGF0aGluZ1N0YXRlLm1vdmluZylcclxuXHRcdFx0dGhpcy5fdGlja19kb01vdmVtZW50KGRlbHRhKTtcclxuXHRcdFxyXG5cdFx0Ly8gRG8gYmVoYXZpb3JcclxuXHRcdGlmICh0aGlzLmJlaGF2aW9yU3RhY2subGVuZ3RoKVxyXG5cdFx0XHR0aGlzLl90aWNrX2RvQmVoYXZpb3IoZGVsdGEpO1xyXG5cdH0sXHJcblx0XHJcblx0Ly8gX2FjdG9ySW50ZXJhY3RGYWNlIDogZnVuY3Rpb24odmVjdG9yKSB7XHJcblx0Ly8gXHR0aGlzLmZhY2luZyA9IHZlY3Rvci5jbG9uZSgpLm5lZ2F0ZSgpO1xyXG5cdC8vIH0sXHJcblx0XHJcblx0X2FjdG9yQnVtcCA6IGZ1bmN0aW9uKHNyY3gsIHNyY3ksIHgsIHksIHJlYXNvbikge1xyXG5cdFx0Ly8gY29uc29sZS53YXJuKHRoaXMuaWQsIFwiOiBDYW5ub3Qgd2FsayB0byBsb2NhdGlvblwiLCBcIihcIit4K1wiLFwiK3krXCIpXCIpO1xyXG5cdH0sXHJcblx0XHJcbn0pO1xyXG5tb2R1bGUuZXhwb3J0cyA9IEFjdG9yO1xyXG5cclxuXHJcblxyXG5mdW5jdGlvbiBnZXREaXJGcm9tTG9jKHgxLCB5MSwgeDIsIHkyKSB7XHJcblx0cmV0dXJuIG5ldyBUSFJFRS5WZWN0b3IzKHgyLXgxLCAwLCB5Mi15MSk7XHJcblx0Ly8gdmFyIGR4ID0geDIgLSB4MTtcclxuXHQvLyB2YXIgZHkgPSB5MiAtIHkxO1xyXG5cdC8vIGlmIChNYXRoLmFicyhkeCkgPiBNYXRoLmFicyhkeSkpIHtcclxuXHQvLyBcdGlmIChkeCA+IDApIHsgcmV0dXJuIFwiclwiOyB9XHJcblx0Ly8gXHRlbHNlIGlmIChkeCA8IDApIHsgcmV0dXJuIFwibFwiOyB9XHJcblx0Ly8gfSBlbHNlIHtcclxuXHQvLyBcdGlmIChkeSA+IDApIHsgcmV0dXJuIFwiZFwiOyB9XHJcblx0Ly8gXHRlbHNlIGlmIChkeSA8IDApIHsgcmV0dXJuIFwidVwiOyB9XHJcblx0Ly8gfVxyXG5cdC8vIHJldHVybiBcImRcIjtcclxufVxyXG5cclxuIiwiLy8gYmVoYXZpb3IuanNcclxuLy8gRGVmaW5lcyB0aGUgYmFzZWQgY2xhc3NlcyBmb3IgQWN0b3IncyBiZWhhdmlvcnNcclxuXHJcbnZhciBleHRlbmQgPSByZXF1aXJlKFwiZXh0ZW5kXCIpO1xyXG52YXIgaW5oZXJpdHMgPSByZXF1aXJlKFwiaW5oZXJpdHNcIik7XHJcblxyXG4vKiogXHJcbiAqIEEgQmVoYXZpb3IgaXMgYSBzY3JpcHQgdGhhdCBhbiBhY3RvciBpcyBmb2xsb3dpbmcsIHdoZXRoZXIgdGhhdFxyXG4gKiBiZSB3YWxraW5nIGFsb25nIGEgcGF0aCBvciBhcm91bmQgYSBjaXJjbGUsIG9yIGZvbGxvd2luZyBhIG1vcmVcclxuICogY29tcGxleCBzY3JpcHQgb2YgZXZlbnRzLiBCZWhhdmlvcnMgY2FuIGJlIHB1c2hlZCBhbmQgcG9wcGVkIG9mZlxyXG4gKiBhbiBhY3RvcidzIHN0YWNrLCBhbmQgdGhlIHRvcG1vc3Qgb25lIHdpbGwgYmUgcGFzc2VkIGNlcnRhaW4gZXZlbnRzXHJcbiAqIHRoYXQgdGhlIGFjdG9yIHJlY2lldmVzLlxyXG4gKi9cclxuXHJcbmZ1bmN0aW9uIEJlaGF2aW9yKG9wdHMpIHtcclxuXHRleHRlbmQodGhpcywgb3B0cyk7XHJcbn1cclxuZXh0ZW5kKEJlaGF2aW9yLnByb3RvdHlwZSwge1xyXG5cdGZhY2VPbkludGVyYWN0OiB0cnVlLFxyXG5cdHRhbGtCZWhhdjogbnVsbCxcclxuXHRcclxuXHR0aWNrIDogbnVsbCxcclxuXHRidW1wIDogbnVsbCxcclxuXHRpbnRlcmFjdCA6IGZ1bmN0aW9uKG1lLCBmcm9tX2Rpcil7XHJcblx0XHRpZiAodGhpcy50YWxrQmVoYXYpIHtcclxuXHRcdFx0bWUuYmVoYXZpb3JTdGFjay5wdXNoKHRoaXMudGFsa0JlaGF2KTtcclxuXHRcdH1cclxuXHR9LFxyXG5cdFxyXG5cdF90aWNrIDogZnVuY3Rpb24obWUsIGRlbHRhKSB7XHJcblx0XHRpZiAodGhpcy50aWNrKVxyXG5cdFx0XHR0aGlzLnRpY2sobWUsIGRlbHRhKTtcclxuXHR9LFxyXG5cdF9pbnRlcmFjdCA6IGZ1bmN0aW9uKG1lLCBmcm9tX2Rpcikge1xyXG5cdFx0Ly9UT0RPIGRvIHN0YW5kYXJkIHN0dWZmIGhlcmVcclxuXHRcdGlmICh0aGlzLmZhY2VPbkludGVyYWN0KVxyXG5cdFx0XHRtZS5mYWNlSW50ZXJhY3Rvcihmcm9tX2Rpcik7XHJcblx0XHRcclxuXHRcdGlmICh0aGlzLmludGVyYWN0KVxyXG5cdFx0XHR0aGlzLmludGVyYWN0KG1lLCBmcm9tX2Rpcik7XHJcblx0fSxcclxuXHRfYnVtcCA6IGZ1bmN0aW9uKG1lLCBmcm9tX2Rpcikge1xyXG5cdFx0aWYgKHRoaXMuYnVtcClcclxuXHRcdFx0dGhpcy5idW1wKG1lLCBmcm9tX2Rpcik7XHJcblx0fSxcclxufSk7XHJcbm1vZHVsZS5leHBvcnRzID0gQmVoYXZpb3I7XHJcblxyXG5cclxuLy8vLy8vLy8vLy8gQ29tbW9uIEJlaGF2aW9ycyAvLy8vLy8vLy8vL1xyXG5cclxuZnVuY3Rpb24gVGFsa2luZyhvcHRzKSB7XHJcblx0QmVoYXZpb3IuY2FsbCh0aGlzLCBvcHRzKTtcclxufVxyXG5pbmhlcml0cyhUYWxraW5nLCBCZWhhdmlvcik7XHJcbmV4dGVuZChUYWxraW5nLnByb3RvdHlwZSwge1xyXG5cdGRpYWxvZzogbnVsbCxcclxuXHRkaWFsb2dfdHlwZTogXCJkaWFsb2dcIixcclxuXHRfX3VpX2ZpcmVkOiBmYWxzZSxcclxuXHRcclxuXHQvLyByZXNldDogZnVuY3Rpb24oKSB7IHRoaXMuX191aV9maXJlZCA9IGZhbHNlOyB9LFxyXG5cdFxyXG5cdHRpY2s6IGZ1bmN0aW9uKG1lLCBkZWx0YSkge1xyXG5cdFx0aWYgKCF0aGlzLl9fdWlfZmlyZWQpIHtcclxuXHRcdFx0VUkuc2hvd1RleHRCb3godGhpcy5kaWFsb2dfdHlwZSwgdGhpcy5kaWFsb2csIHtcclxuXHRcdFx0XHRjb21wbGV0ZTogZnVuY3Rpb24oKSB7XHJcblx0XHRcdFx0XHRtZS5iZWhhdmlvclN0YWNrLnBvcCgpO1xyXG5cdFx0XHRcdFx0dGhpcy5fX3VpX2ZpcmVkID0gZmFsc2U7XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fSk7XHJcblx0XHRcdHRoaXMuX191aV9maXJlZCA9IHRydWU7XHJcblx0XHR9XHJcblx0fSxcclxufSk7XHJcbm1vZHVsZS5leHBvcnRzLlRhbGtpbmcgPSBUYWxraW5nO1xyXG5cclxuXHJcblxyXG5mdW5jdGlvbiBGYWNlRGlyZWN0aW9uKHgsIHksIG9wdHMpIHtcclxuXHRCZWhhdmlvci5jYWxsKHRoaXMsIG9wdHMpO1xyXG5cdHRoaXMuZGlyX3ggPSB4O1xyXG5cdHRoaXMuZGlyX3kgPSB5O1xyXG59XHJcbmluaGVyaXRzKEZhY2VEaXJlY3Rpb24sIEJlaGF2aW9yKTtcclxuZXh0ZW5kKEZhY2VEaXJlY3Rpb24ucHJvdG90eXBlLCB7XHJcblx0ZGlyX3g6IDAsXHJcblx0ZGlyX3k6IDEsXHJcblx0XHJcblx0dGljazogZnVuY3Rpb24obWUsIGRlbHRhKSB7XHJcblx0XHRtZS5mYWNlRGlyKHRoaXMuZGlyX3gsIHRoaXMuZGlyX3kpO1xyXG5cdH0sXHJcbn0pO1xyXG5tb2R1bGUuZXhwb3J0cy5GYWNlRGlyZWN0aW9uID0gRmFjZURpcmVjdGlvbjtcclxuXHJcblxyXG5cclxuZnVuY3Rpb24gTG9va0Fyb3VuZChvcHRzKSB7XHJcblx0QmVoYXZpb3IuY2FsbCh0aGlzLCBvcHRzKTtcclxufVxyXG5pbmhlcml0cyhMb29rQXJvdW5kLCBCZWhhdmlvcik7XHJcbmV4dGVuZChMb29rQXJvdW5kLnByb3RvdHlwZSwge1xyXG5cdHdhaXRUaW1lIDogMCxcclxuXHR0aWNrOiBmdW5jdGlvbihtZSwgZGVsdGEpIHtcclxuXHRcdGlmICh0aGlzLndhaXRUaW1lID4gMCkge1xyXG5cdFx0XHR0aGlzLndhaXRUaW1lIC09IGRlbHRhO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdHN3aXRjaCggTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpKjQpICkge1xyXG5cdFx0XHRjYXNlIDA6IG1lLmZhY2luZy5zZXQoIDEsMCwgMCk7IGJyZWFrO1xyXG5cdFx0XHRjYXNlIDE6IG1lLmZhY2luZy5zZXQoLTEsMCwgMCk7IGJyZWFrO1xyXG5cdFx0XHRjYXNlIDI6IG1lLmZhY2luZy5zZXQoIDAsMCwgMSk7IGJyZWFrO1xyXG5cdFx0XHRjYXNlIDM6IG1lLmZhY2luZy5zZXQoIDAsMCwtMSk7IGJyZWFrO1xyXG5cdFx0fVxyXG5cdFx0dGhpcy53YWl0VGltZSArPSAoTWF0aC5yYW5kb20oKSAqIDMwKSArIDU7XHJcblx0fSxcclxufSk7XHJcbm1vZHVsZS5leHBvcnRzLkxvb2tBcm91bmQgPSBMb29rQXJvdW5kO1xyXG5cclxuXHJcblxyXG5mdW5jdGlvbiBNZWFuZGVyKG9wdHMpIHtcclxuXHRCZWhhdmlvci5jYWxsKHRoaXMsIG9wdHMpO1xyXG59XHJcbmluaGVyaXRzKE1lYW5kZXIsIEJlaGF2aW9yKTtcclxuZXh0ZW5kKE1lYW5kZXIucHJvdG90eXBlLCB7XHJcblx0d2FpdFRpbWUgOiAwLFxyXG5cdHRpY2s6IGZ1bmN0aW9uKG1lLCBkZWx0YSkge1xyXG5cdFx0aWYgKHRoaXMud2FpdFRpbWUgPiAwKSB7XHJcblx0XHRcdHRoaXMud2FpdFRpbWUgLT0gZGVsdGE7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0c3dpdGNoKCBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkqOCkgKSB7XHJcblx0XHRcdGNhc2UgMDogbWUuZmFjaW5nLnNldCggMSwwLCAwKTsgYnJlYWs7XHJcblx0XHRcdGNhc2UgMTogbWUuZmFjaW5nLnNldCgtMSwwLCAwKTsgYnJlYWs7XHJcblx0XHRcdGNhc2UgMjogbWUuZmFjaW5nLnNldCggMCwwLCAxKTsgYnJlYWs7XHJcblx0XHRcdGNhc2UgMzogbWUuZmFjaW5nLnNldCggMCwwLC0xKTsgYnJlYWs7XHJcblx0XHRcdGNhc2UgNDogbWUubW92ZURpcihcImRcIik7IGJyZWFrO1xyXG5cdFx0XHRjYXNlIDU6IG1lLm1vdmVEaXIoXCJ1XCIpOyBicmVhaztcclxuXHRcdFx0Y2FzZSA2OiBtZS5tb3ZlRGlyKFwibFwiKTsgYnJlYWs7XHJcblx0XHRcdGNhc2UgNzogbWUubW92ZURpcihcInJcIik7IGJyZWFrO1xyXG5cdFx0fVxyXG5cdFx0dGhpcy53YWl0VGltZSArPSAoTWF0aC5yYW5kb20oKSAqIDMwKSArIDU7XHJcblx0fSxcclxufSk7XHJcbm1vZHVsZS5leHBvcnRzLk1lYW5kZXIgPSBNZWFuZGVyO1xyXG5cclxuIiwiLy8gY29udHJvbGxlci5qc1xyXG4vLyBUaGlzIGNsYXNzIGhhbmRsZXMgaW5wdXQgYW5kIGNvbnZlcnRzIGl0IHRvIGNvbnRyb2wgc2lnbmFsc1xyXG5cclxudmFyIGluaGVyaXRzID0gcmVxdWlyZShcImluaGVyaXRzXCIpO1xyXG52YXIgZXh0ZW5kID0gcmVxdWlyZShcImV4dGVuZFwiKTtcclxudmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoXCJldmVudHNcIikuRXZlbnRFbWl0dGVyO1xyXG5cclxuLy8gVE9ETyBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9HdWlkZS9BUEkvR2FtZXBhZFxyXG5cclxuZnVuY3Rpb24gQ29udHJvbE1hbmFnZXIoKSB7XHJcblx0dmFyIHNlbGYgPSB0aGlzO1xyXG5cdHRoaXMuc2V0S2V5Q29uZmlnKCk7XHJcblx0XHJcblx0JChmdW5jdGlvbigpe1xyXG5cdFx0JChkb2N1bWVudCkub24oXCJrZXlkb3duXCIsIGZ1bmN0aW9uKGUpeyBzZWxmLm9uS2V5RG93bihlKTsgfSk7XHJcblx0XHQkKGRvY3VtZW50KS5vbihcImtleXVwXCIsIGZ1bmN0aW9uKGUpeyBzZWxmLm9uS2V5VXAoZSk7IH0pO1xyXG5cdFx0XHJcblx0XHQkKFwiI2NoYXRib3hcIikub24oXCJmb2N1c1wiLCBmdW5jdGlvbihlKXsgXHJcblx0XHRcdGNvbnNvbGUubG9nKFwiQ0hBVCBGT0NVU1wiKTtcclxuXHRcdFx0c2VsZi5pbnB1dENvbnRleHQucHVzaChcImNoYXRcIik7IFxyXG5cdFx0fSk7XHJcblx0XHQkKFwiI2NoYXRib3hcIikub24oXCJibHVyXCIsIGZ1bmN0aW9uKGUpeyBcclxuXHRcdFx0Y29uc29sZS5sb2coXCJDSEFUIEJMVVJcIik7XHJcblx0XHRcdGlmIChzZWxmLmlucHV0Q29udGV4dC50b3AgPT0gXCJjaGF0XCIpXHJcblx0XHRcdFx0c2VsZi5pbnB1dENvbnRleHQucG9wKCk7IFxyXG5cdFx0fSk7XHJcblx0XHRcclxuXHRcdHNlbGYudG91Y2hNYW5hZ2VyKCk7XHJcblx0fSlcclxufVxyXG5pbmhlcml0cyhDb250cm9sTWFuYWdlciwgRXZlbnRFbWl0dGVyKTtcclxuZXh0ZW5kKENvbnRyb2xNYW5hZ2VyLnByb3RvdHlwZSwge1xyXG5cdGlucHV0Q29udGV4dCA6IFtcImdhbWVcIl0sXHJcblx0XHJcblx0a2V5c19jb25maWcgOiB7XHJcblx0XHRVcDogWzM4LCBcIlVwXCIsIDg3LCBcIndcIl0sIFxyXG5cdFx0RG93bjogWzQwLCBcIkRvd25cIiwgODMsIFwic1wiXSwgXHJcblx0XHRMZWZ0OiBbMzcsIFwiTGVmdFwiLCA2NSwgXCJhXCJdLCBcclxuXHRcdFJpZ2h0OiBbMzksIFwiUmlnaHRcIiwgNjgsIFwiZFwiXSxcclxuXHRcdEludGVyYWN0OiBbMTMsIFwiRW50ZXJcIiwgMzIsIFwiIFwiXSxcclxuXHRcdENhbmNlbDogWzI3LCBcIkVzY2FwZVwiLCAxNywgXCJDdHJsXCJdLFxyXG5cdFx0UnVuOiBbMTYsIFwiU2hpZnRcIl0sXHJcblx0XHRNZW51OiBbOCwgXCJCYWNrc3BhY2VcIiwgNDYsIFwiRGVsZXRlXCJdLFxyXG5cdFx0Rm9jdXNDaGF0OiBbMTkxLCBcIi9cIl0sXHJcblx0fSxcclxuXHRcclxuXHRrZXlzX2FjdGl2ZSA6IHt9LFxyXG5cdFxyXG5cdGtleXNfZG93biA6IHtcclxuXHRcdFVwOiBmYWxzZSwgRG93bjogZmFsc2UsXHJcblx0XHRMZWZ0OiBmYWxzZSwgUmlnaHQ6IGZhbHNlLFxyXG5cdFx0SW50ZXJhY3Q6IGZhbHNlLCBGb2N1c0NoYXQ6IGZhbHNlLFxyXG5cdFx0UnVuOiBmYWxzZSwgQ2FuY2VsOiBmYWxzZSxcclxuXHR9LFxyXG5cdFxyXG5cdHB1c2hJbnB1dENvbnRleHQ6IGZ1bmN0aW9uKGN0eCkge1xyXG5cdFx0dGhpcy5pbnB1dENvbnRleHQucHVzaChjdHgpO1xyXG5cdFx0dGhpcy5lbWl0KFwiaW5wdXRDb250ZXh0Q2hhbmdlZFwiKTtcclxuXHR9LFxyXG5cdHBvcElucHV0Q29udGV4dDogZnVuY3Rpb24oY3R4KSB7XHJcblx0XHRpZiAoIWN0eCB8fCB0aGlzLmlucHV0Q29udGV4dC50b3AgPT0gY3R4KSB7XHJcblx0XHRcdHZhciBjID0gdGhpcy5pbnB1dENvbnRleHQucG9wKCk7XHJcblx0XHRcdHRoaXMuZW1pdChcImlucHV0Q29udGV4dENoYW5nZWRcIik7XHJcblx0XHRcdHJldHVybiBjO1xyXG5cdFx0fVxyXG5cdH0sXHJcblx0cmVtb3ZlSW5wdXRDb250ZXh0OiBmdW5jdGlvbihjdHgpIHtcclxuXHRcdGlmICghY3R4KSByZXR1cm47XHJcblx0XHR2YXIgaW5kZXggPSB0aGlzLmlucHV0Q29udGV4dC5sYXN0SW5kZXhPZihjdHgpO1xyXG5cdFx0aWYgKGluZGV4ID4gLTEpIHtcclxuXHRcdFx0dGhpcy5pbnB1dENvbnRleHQuc3BsaWNlKGluZGV4LCAxKTtcclxuXHRcdFx0dGhpcy5lbWl0KFwiaW5wdXRDb250ZXh0Q2hhbmdlZFwiKTtcclxuXHRcdFx0cmV0dXJuIGN0eDtcclxuXHRcdH1cclxuXHR9LFxyXG5cdFxyXG5cdGlzRG93biA6IGZ1bmN0aW9uKGtleSwgY3R4KSB7XHJcblx0XHRpZiAoJC5pc0FycmF5KGN0eCkpIHtcclxuXHRcdFx0dmFyIGdvID0gZmFsc2U7XHJcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgY3R4Lmxlbmd0aDsgaSsrKSBnbyB8PSBjdHhbaV07XHJcblx0XHRcdGlmICghZ28pIHJldHVybjtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdGlmICh0aGlzLmlucHV0Q29udGV4dC50b3AgIT0gY3R4KSByZXR1cm47XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdHJldHVybiB0aGlzLmtleXNfZG93bltrZXldO1xyXG5cdH0sXHJcblx0aXNEb3duT25jZSA6IGZ1bmN0aW9uKGtleSwgY3R4KSB7XHJcblx0XHRpZiAoJC5pc0FycmF5KGN0eCkpIHtcclxuXHRcdFx0dmFyIGdvID0gZmFsc2U7XHJcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgY3R4Lmxlbmd0aDsgaSsrKSBnbyB8PSBjdHhbaV07XHJcblx0XHRcdGlmICghZ28pIHJldHVybjtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdGlmICh0aGlzLmlucHV0Q29udGV4dC50b3AgIT0gY3R4KSByZXR1cm47XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdHJldHVybiB0aGlzLmtleXNfZG93bltrZXldID09IDE7XHJcblx0fSxcclxuXHRcclxuXHRzZXRLZXlDb25maWcgOiBmdW5jdGlvbigpIHtcclxuXHRcdHRoaXMua2V5c19hY3RpdmUgPSBleHRlbmQodHJ1ZSwge30sIHRoaXMua2V5c19jb25maWcpO1xyXG5cdH0sXHJcblx0XHJcblx0b25LZXlEb3duIDogZnVuY3Rpb24oZSkge1xyXG5cdFx0Zm9yICh2YXIgYWN0aW9uIGluIHRoaXMua2V5c19hY3RpdmUpIHtcclxuXHRcdFx0dmFyIGtleXMgPSB0aGlzLmtleXNfYWN0aXZlW2FjdGlvbl07XHJcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRcdGlmIChlLndoaWNoID09IGtleXNbaV0pIHtcclxuXHRcdFx0XHRcdC8vIEtleSBpcyBub3cgZG93biFcclxuXHRcdFx0XHRcdHRoaXMuZW1pdEtleShhY3Rpb24sIHRydWUpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH0sXHJcblx0b25LZXlVcCA6IGZ1bmN0aW9uIChlKSB7XHJcblx0XHRmb3IgKHZhciBhY3Rpb24gaW4gdGhpcy5rZXlzX2FjdGl2ZSkge1xyXG5cdFx0XHR2YXIga2V5cyA9IHRoaXMua2V5c19hY3RpdmVbYWN0aW9uXTtcclxuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdFx0aWYgKGUud2hpY2ggPT0ga2V5c1tpXSkge1xyXG5cdFx0XHRcdFx0Ly8gS2V5IGlzIG5vdyB1cCFcclxuXHRcdFx0XHRcdHRoaXMuZW1pdEtleShhY3Rpb24sIGZhbHNlKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9LFxyXG5cdFxyXG5cdHN1Ym1pdENoYXRLZXlwcmVzcyA6IGZ1bmN0aW9uKGtleSkge1xyXG5cdFx0c3dpdGNoKGtleSkge1xyXG5cdFx0XHRcclxuXHRcdH1cclxuXHR9LFxyXG5cdFxyXG5cdGVtaXRLZXkgOiBmdW5jdGlvbihhY3Rpb24sIGRvd24pIHtcclxuXHRcdGlmICh0aGlzLmtleXNfZG93blthY3Rpb25dICE9IGRvd24pIHtcclxuXHRcdFx0dGhpcy5rZXlzX2Rvd25bYWN0aW9uXSA9IGRvd247XHJcblx0XHRcdHRoaXMuZW1pdChcImNvbnRyb2wtYWN0aW9uXCIsIGFjdGlvbiwgZG93bik7XHJcblx0XHR9XHJcblx0fSxcclxuXHRcclxuXHRfdGljayA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0Zm9yICh2YXIgbmFtZSBpbiB0aGlzLmtleXNfZG93bikge1xyXG5cdFx0XHRpZiAodGhpcy5rZXlzX2Rvd25bbmFtZV0gPiAwKVxyXG5cdFx0XHRcdHRoaXMua2V5c19kb3duW25hbWVdKys7XHJcblx0XHR9XHJcblx0fVxyXG5cdFxyXG59KTtcclxuXHJcbkNvbnRyb2xNYW5hZ2VyLnByb3RvdHlwZS50b3VjaE1hbmFnZXIgPSBmdW5jdGlvbigpIHtcclxuXHR2YXIgc2VsZiA9IHRoaXM7XHJcblx0XHJcblx0JChkb2N1bWVudCkub25lKFwidG91Y2hzdGFydFwiLCBmdW5jdGlvbigpe1xyXG5cdFx0JChcImh0bWxcIikuYWRkQ2xhc3MoXCJ0b3VjaG1vZGVcIik7XHJcblx0XHRpZiAoISQoXCIjdG91Y2hjb250cm9sc1wiKS5sZW5ndGgpIHtcclxuXHRcdFx0ZnVuY3Rpb24gX19tYXAoYnRuLCBrZXkpIHtcclxuXHRcdFx0XHRidG4ub24oXCJ0b3VjaHN0YXJ0XCIsIGZ1bmN0aW9uKGUpe1xyXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coXCJUT1VDSFNUQVJUOiBcIiwga2V5KTtcclxuXHRcdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcclxuXHRcdFx0XHRcdHNlbGYuZW1pdEtleShrZXksIHRydWUpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHRcdGJ0bi5vbihcInRvdWNoZW5kXCIsIGZ1bmN0aW9uKGUpe1xyXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coXCJUT1VDSEVORDogXCIsIGtleSk7XHJcblx0XHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XHJcblx0XHRcdFx0XHRzZWxmLmVtaXRLZXkoa2V5LCBmYWxzZSk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdFx0YnRuLm9uKFwidG91Y2hjYW5jZWxcIiwgZnVuY3Rpb24oZSl7XHJcblx0XHRcdFx0XHRjb25zb2xlLmxvZyhcIlRPVUNIQ0FOQ0VMOiBcIiwga2V5KTtcclxuXHRcdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcclxuXHRcdFx0XHRcdHNlbGYuZW1pdEtleShrZXksIGZhbHNlKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0XHRidG4ub24oXCJ0b3VjaG1vdmVcIiwgZnVuY3Rpb24oZSl7XHJcblx0XHRcdFx0XHRjb25zb2xlLmxvZyhcIlRPVUNITU9WRTogXCIsIGtleSk7XHJcblx0XHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XHJcblx0XHRcdFx0fSlcclxuXHRcdFx0XHRyZXR1cm4gYnRuO1xyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHQkKFwiPGRpdj5cIikuYXR0cihcImlkXCIsIFwidG91Y2hjb250cm9sc1wiKVxyXG5cdFx0XHQuYXBwZW5kIChcclxuXHRcdFx0XHRfX21hcCgkKFwiPGRpdj5cIikuYWRkQ2xhc3MoXCJidXR0b25cIikuYWRkQ2xhc3MoXCJhXCIpLCBcIkludGVyYWN0XCIpXHJcblx0XHRcdCkuYXBwZW5kIChcclxuXHRcdFx0XHRfX21hcCgkKFwiPGRpdj5cIikuYWRkQ2xhc3MoXCJidXR0b25cIikuYWRkQ2xhc3MoXCJiXCIpLCBcIkNhbmNlbFwiKVxyXG5cdFx0XHQpLmFwcGVuZCAoXHJcblx0XHRcdFx0X19tYXAoJChcIjxkaXY+XCIpLmFkZENsYXNzKFwiYnV0dG9uXCIpLmFkZENsYXNzKFwibWVudVwiKSwgXCJNZW51XCIpXHJcblx0XHRcdCkuYXBwZW5kIChcclxuXHRcdFx0XHRfX21hcCgkKFwiPGRpdj5cIikuYWRkQ2xhc3MoXCJidXR0b25cIikuYWRkQ2xhc3MoXCJydW5cIiksIFwiUnVuXCIpXHJcblx0XHRcdCkuYXBwZW5kIChcclxuXHRcdFx0XHQkKFwiPGRpdj5cIikuYWRkQ2xhc3MoXCJkcGFkXCIpXHJcblx0XHRcdFx0LmFwcGVuZCAoXHJcblx0XHRcdFx0XHRfX21hcCgkKFwiPGRpdj5cIikuYWRkQ2xhc3MoXCJidXR0b25cIikuYWRkQ2xhc3MoXCJ1cFwiKSwgXCJVcFwiKVxyXG5cdFx0XHRcdCkuYXBwZW5kIChcclxuXHRcdFx0XHRcdF9fbWFwKCQoXCI8ZGl2PlwiKS5hZGRDbGFzcyhcImJ1dHRvblwiKS5hZGRDbGFzcyhcImRvd25cIiksIFwiRG93blwiKVxyXG5cdFx0XHRcdCkuYXBwZW5kIChcclxuXHRcdFx0XHRcdF9fbWFwKCQoXCI8ZGl2PlwiKS5hZGRDbGFzcyhcImJ1dHRvblwiKS5hZGRDbGFzcyhcImxlZnRcIiksIFwiTGVmdFwiKVxyXG5cdFx0XHRcdCkuYXBwZW5kIChcclxuXHRcdFx0XHRcdF9fbWFwKCQoXCI8ZGl2PlwiKS5hZGRDbGFzcyhcImJ1dHRvblwiKS5hZGRDbGFzcyhcInJpZ2h0XCIpLCBcIlJpZ2h0XCIpXHJcblx0XHRcdFx0KVxyXG5cdFx0XHQpLmFwcGVuZFRvKFwiYm9keVwiKTtcclxuXHRcdH1cclxuXHR9KTtcclxufVxyXG5cclxuXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBDb250cm9sTWFuYWdlcigpO1xyXG4iLCIvLyBldmVudC5qc1xyXG4vLyBEZWZpbmVzIHRoZSBiYXNlIGV2ZW50IHVzZWQgdGhyb3VnaG91dCB0aGUgcGFyay5cclxuXHJcbi8vIEZpdHRpbmdseSwgRXZlbnQgaXMgYSBzdWJjbGFzcyBvZiBub2RlLmpzJ3MgRXZlbnRFbWl0dGVyIGNsYXNzLlxyXG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZShcImV2ZW50c1wiKS5FdmVudEVtaXR0ZXI7XHJcbnZhciBpbmhlcml0cyA9IHJlcXVpcmUoXCJpbmhlcml0c1wiKTtcclxudmFyIGV4dGVuZCA9IHJlcXVpcmUoXCJleHRlbmRcIik7XHJcblxyXG4vKipcclxuICogQW4gZXZlbnQgaXMgYW55IGludGVyYWN0YWJsZSBvciBhbmltYXRpbmcgb2JqZWN0IGluIHRoZSBnYW1lLlxyXG4gKiBUaGlzIGluY2x1ZGVzIHRoaW5ncyByYW5naW5nIGZyb20gc2lnbnMsIHRvIHBlb3BsZS9wb2tlbW9uLlxyXG4gKiBBbiBldmVudDpcclxuICpcdC0gVGFrZXMgdXAgYXQgbGVhc3Qgb25lIHRpbGUgb24gdGhlIG1hcFxyXG4gKlx0LSBDYW4gYmUgaW50ZXJhY3RlZCB3aXRoIGJ5IGluLWdhbWUgdGFsa2luZyBvciBvbi1zY3JlZW4gY2xpY2tcclxuICpcdC0gTWF5IGJlIHJlcHJlc2VudGVkIGluLWdhbWUgYnkgYSBzcHJpdGVcclxuICpcdC0gTWF5IGRlY2lkZSwgdXBvbiBjcmVhdGlvbiwgdG8gbm90IGFwcGVhciBvbiB0aGUgbWFwLlxyXG4gKi9cclxuZnVuY3Rpb24gRXZlbnQoYmFzZSwgb3B0cykge1xyXG5cdEV2ZW50RW1pdHRlci5jYWxsKHRoaXMpO1xyXG5cdFxyXG5cdGV4dGVuZCh0aGlzLCBiYXNlLCBvcHRzKTtcclxuXHRcclxuXHR0aGlzLl9ub3JtYWxpemVMb2NhdGlvbigpO1xyXG5cdFxyXG5cdGlmICh0aGlzLm9uRXZlbnRzKSB7XHJcblx0XHR2YXIga2V5cyA9IE9iamVjdC5rZXlzKHRoaXMub25FdmVudHMpO1xyXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdHRoaXMub24oa2V5c1tpXSwgdGhpcy5vbkV2ZW50c1trZXlzW2ldXSk7XHJcblx0XHR9XHJcblx0XHRkZWxldGUgdGhpcy5vbkV2ZW50cztcclxuXHR9XHJcbn1cclxuaW5oZXJpdHMoRXZlbnQsIEV2ZW50RW1pdHRlcik7XHJcbmV4dGVuZChFdmVudC5wcm90b3R5cGUsIHtcclxuXHRpZCA6IG51bGwsXHJcblx0ZW5hYmxlZCA6IGZhbHNlLFxyXG5cdHZpc2libGUgOiB0cnVlLFxyXG5cdFxyXG5cdGxvY2F0aW9uIDogbnVsbCwgLy8gRXZlbnRzIHdpdGggYSBzaW5nbGUgbG9jYXRpb24gYXJlIG9wdGltaXplZCBmb3IgaXRcclxuXHRsb2NhdGlvbnMgOiBudWxsLCAvLyBFdmVudHMgd2l0aCBtdWx0aXBsZSBsb2NhdGlvbnMgYXJlIG9wdGltaXplZCBmb3IgdGhhdCBhbHNvXHJcblx0XHJcblx0dG9TdHJpbmcgOiBmdW5jdGlvbigpIHtcclxuXHRcdGlmICghdGhpcy5pZCkgcmV0dXJuIFwiPExvY2FsIG9yIFVubmFtZWQgRXZlbnQ+XCI7XHJcblx0XHRyZXR1cm4gdGhpcy5pZDtcclxuXHR9LFxyXG5cdFxyXG5cdHNob3VsZEFwcGVhciA6IGZ1bmN0aW9uKG1hcGlkKXsgcmV0dXJuIHRydWU7IH0sXHJcblx0Y2FuV2Fsa09uIDogZnVuY3Rpb24oKXsgcmV0dXJuIHRydWU7IH0sXHJcblx0XHJcblx0LyoqIFJldHVybnMgYW4gb2JqZWN0IHRvIHJlcHJlc2VudCB0aGlzIGV2ZW50IGluIDNEIHNwYWNlLCBvciBudWxsIGlmIHRoZXJlIHNob3VsZG4ndCBiZSBvbmUuICovXHJcblx0Z2V0QXZhdGFyIDogZnVuY3Rpb24obWFwLCBnYyl7IHJldHVybiBudWxsOyB9LFxyXG5cdFxyXG5cdG9uRXZlbnRzIDogbnVsbCwgLy9hIG9iamVjdCwgZXZlbnQtbmFtZXMgLT4gZnVuY3Rpb25zIHRvIGNhbGwsIHRvIGJlIHJlZ2lzdGVyZWQgaW4gY29uc3RydWN0b3JcclxuXHRcclxuXHRjYW5Nb3ZlIDogZnVuY3Rpb24oKSB7XHJcblx0XHQvL0lmIHdlIG9ubHkgaGF2ZSAxIGxvY2F0aW9uLCB0aGVuIHdlIGNhbiBtb3ZlXHJcblx0XHRyZXR1cm4gISF0aGlzLmxvY2F0aW9uICYmICF0aGlzLmxvY2F0aW9ucztcclxuXHR9LFxyXG5cdFxyXG5cdG1vdmVUbyA6IGZ1bmN0aW9uKHgsIHkpIHtcclxuXHRcdGlmICghdGhpcy5jYW5Nb3ZlKCkpXHJcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIlRoaXMgZXZlbnQgaXMgaW4gc2V2ZXJhbCBwbGFjZXMgYXQgb25jZSwgYW5kIGNhbm5vdCBtb3ZlVG8hXCIpO1xyXG5cdFx0XHJcblx0XHQvL1RPRE8gcXVldWUgdXAgYSBtb3ZlXHJcblx0fSxcclxuXHRcclxuXHRfbm9ybWFsaXplTG9jYXRpb24gOiBmdW5jdGlvbigpIHtcclxuXHRcdGlmICh0aGlzLmxvY2F0aW9uKSB7XHJcblx0XHRcdC8vSWYgd2UgaGF2ZSBhIHNpbmd1bGFyIGxvY2F0aW9uIHNldFxyXG5cdFx0XHRpZiAodGhpcy5sb2NhdGlvbnMpIC8vIEFzIGxvbmcgYXMgd2UgZG9uJ3QgYWxzbyBoYXZlIGEgbGlzdCwgaXRzIGZpbmVcclxuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJFdmVudCB3YXMgaW5pdGlhbGl6ZWQgd2l0aCBib3RoIGxvY2F0aW9uIGFuZCBsb2NhdGlvbnMhIFRoZXkgY2Fubm90IGJlIGJvdGggZGVmaW5lZCFcIik7XHJcblx0XHRcdFxyXG5cdFx0XHR2YXIgbG9jID0gdGhpcy5sb2NhdGlvbjtcclxuXHRcdFx0aWYgKCQuaXNGdW5jdGlvbihsb2MpKSB7XHJcblx0XHRcdFx0bG9jcyA9IGxvYy5jYWxsKHRoaXMpO1xyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHRpZiAoJC5pc0FycmF5KGxvYykgJiYgbG9jLmxlbmd0aCA9PSAyICYmIHR5cGVvZiBsb2NbMF0gPT0gXCJudW1iZXJcIiAmJiB0eXBlb2YgbG9jWzFdID09IFwibnVtYmVyXCIpIFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0bG9jID0gbmV3IFRIUkVFLlZlY3RvcjIobG9jWzBdLCBsb2NbMV0pO1xyXG5cdFx0XHR9IFxyXG5cdFx0XHRlbHNlIGlmICgkLmlzQXJyYXkobG9jKSAmJiBsb2MubGVuZ3RoID09IDMgXHJcblx0XHRcdFx0JiYgdHlwZW9mIGxvY1swXSA9PSBcIm51bWJlclwiICYmIHR5cGVvZiBsb2NbMV0gPT0gXCJudW1iZXJcIiAmJiB0eXBlb2YgbG9jWzJdID09IFwibnVtYmVyXCIpIFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0bG9jID0gbmV3IFRIUkVFLlZlY3RvcjMobG9jWzBdLCBsb2NbMV0sIGxvY1syXSk7XHJcblx0XHRcdH0gXHJcblx0XHRcdGVsc2UgaWYgKCEobG9jIGluc3RhbmNlb2YgVEhSRUUuVmVjdG9yMiB8fCBsb2MgaW5zdGFuY2VvZiBUSFJFRS5WZWN0b3IzKSkgXHJcblx0XHRcdHtcclxuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJDb3VsZCBub3Qgbm9ybWFsaXplIGxvY2F0aW9uIG9mIFwiK3RoaXMuaWQrXCIhXCIpO1xyXG5cdFx0XHR9XHJcblx0XHRcdHRoaXMubG9jYXRpb24gPSBsb2M7XHJcblx0XHRcdHJldHVybiAxO1xyXG5cdFx0fVxyXG5cdFx0dmFyIG9yZ2xvYyA9IHRoaXMubG9jYXRpb25zO1xyXG5cdFx0dmFyIGxvY3MgPSBudWxsO1xyXG5cdFx0XHJcblx0XHRpZiAoJC5pc0FycmF5KG9yZ2xvYykpIHtcclxuXHRcdFx0dmFyIHR5cGUgPSBudWxsLCBuZXdUeXBlID0gbnVsbDtcclxuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBvcmdsb2MubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0XHRpZiAodHlwZW9mIG9yZ2xvY1tpXSA9PSBcIm51bWJlclwiKVxyXG5cdFx0XHRcdFx0bmV3VHlwZSA9IFwibnVtYmVyXCI7XHJcblx0XHRcdFx0ZWxzZSBpZiAob3JnbG9jW2ldIGluc3RhbmNlb2YgVEhSRUUuVmVjdG9yMilcclxuXHRcdFx0XHRcdG5ld1R5cGUgPSBcInZlY3RvclwiO1xyXG5cdFx0XHRcdGVsc2UgaWYgKG9yZ2xvY1tpXSBpbnN0YW5jZW9mIFRIUkVFLlZlY3RvcjMpXHJcblx0XHRcdFx0XHRuZXdUeXBlID0gXCJ2ZWN0b3JcIjtcclxuXHRcdFx0XHRlbHNlIGlmICgkLmlzQXJyYXkob3JnbG9jW2ldKSlcclxuXHRcdFx0XHRcdG5ld1R5cGUgPSBcImFycmF5XCI7XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0aWYgKCF0eXBlKSB0eXBlID0gbmV3VHlwZTtcclxuXHRcdFx0XHRpZiAodHlwZSAhPSBuZXdUeXBlKSB7XHJcblx0XHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJDb3VsZCBub3Qgbm9ybWFsaXplIGxvY2F0aW9ucyBvZiBcIit0aGlzLmlkK1wiIVwiKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdFx0aWYgKHR5cGUgPT0gXCJudW1iZXJcIikgbG9jcyA9IF9fcGFyc2VBc051bWJlckFycmF5KG9yZ2xvYyk7XHJcblx0XHRcdGlmICh0eXBlID09IFwiYXJyYXlcIikgbG9jcyA9IF9fcGFyc2VBc0FycmF5QXJyYXkob3JnbG9jKTtcclxuXHRcdFx0aWYgKHR5cGUgPT0gXCJ2ZWN0b3JcIikgbG9jcyA9IG9yZ2xvYztcclxuXHRcdH1cclxuXHRcdGVsc2UgaWYgKCQuaXNGdW5jdGlvbihvcmdsb2MpKSB7XHJcblx0XHRcdGxvY3MgPSBvcmdsb2MuY2FsbCh0aGlzKTtcclxuXHRcdH1cclxuXHRcdGVsc2UgaWYgKG9yZ2xvYyBpbnN0YW5jZW9mIFRIUkVFLlZlY3RvcjIpIHtcclxuXHRcdFx0bG9jcyA9IFtvcmdsb2NdO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHRpZiAoIWxvY3MgfHwgISQuaXNBcnJheShsb2NzKSB8fCBsb2NzLmxlbmd0aCA9PSAwKSBcclxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiQ291bGQgbm90IG5vcm1hbGl6ZSBsb2NhdGlvbnMgb2YgXCIrdGhpcy5pZCtcIiFcIik7XHJcblx0XHRcclxuXHRcdHRoaXMubG9jYXRpb25zID0gbG9jcztcclxuXHRcdHRoaXMuX25vcm1hbGl6ZUxvY2F0aW9uID0gZnVuY3Rpb24oKXsgcmV0dXJuIGxvY3MubGVuZ3RoOyB9OyAvL2Nhbid0IG5vcm1hbGl6ZSB0d2ljZVxyXG5cdFx0cmV0dXJuIGxvY3MubGVuZ3RoO1xyXG5cdFx0XHJcblx0XHRmdW5jdGlvbiBfX3BhcnNlQXNOdW1iZXJBcnJheShsKSB7XHJcblx0XHRcdGlmIChsLmxlbmd0aCA9PSAyKSAvL3NpbmdsZSBwb2ludCBbeCwgeV1cclxuXHRcdFx0XHRyZXR1cm4gW25ldyBUSFJFRS5WZWN0b3IyKGxbMF0sIGxbMV0pXTtcclxuXHRcdFx0aWYgKGwubGVuZ3RoID09IDMpIC8vc2luZ2xlIHBvaW50IFt4LCB5LCB6XVxyXG5cdFx0XHRcdHJldHVybiBbbmV3IFRIUkVFLlZlY3RvcjMobFswXSwgbFsxXSwgbFsyXSldO1xyXG5cdFx0XHRpZiAobC5sZW5ndGggPT0gNCkgeyAvL3JlY3RhbmdsZSBbeCwgeSwgdywgaF1cclxuXHRcdFx0XHR2YXIgbiA9IFtdO1xyXG5cdFx0XHRcdGZvciAodmFyIHggPSBsWzBdOyB4IDwgbFswXStsWzJdOyB4KyspIHtcclxuXHRcdFx0XHRcdGZvciAodmFyIHkgPSBsWzFdOyB5IDwgbFsxXStsWzNdOyB5KyspIHtcclxuXHRcdFx0XHRcdFx0bi5wdXNoKG5ldyBUSFJFRS5WZWN0b3IyKHgsIHkpKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0cmV0dXJuIG47XHJcblx0XHRcdH1cclxuXHRcdFx0aWYgKGwubGVuZ3RoID09IDUpIHsgLy9yZWN0YW5nbGUgW3gsIHksIHosIHcsIGhdXHJcblx0XHRcdFx0dmFyIG4gPSBbXTtcclxuXHRcdFx0XHRmb3IgKHZhciB4ID0gbFswXTsgeCA8IGxbMF0rbFszXTsgeCsrKSB7XHJcblx0XHRcdFx0XHRmb3IgKHZhciB5ID0gbFsxXTsgeSA8IGxbMV0rbFs0XTsgeSsrKSB7XHJcblx0XHRcdFx0XHRcdG4ucHVzaChuZXcgVEhSRUUuVmVjdG9yMyh4LCB5LCBsWzJdKSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdHJldHVybiBuO1xyXG5cdFx0XHR9XHJcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIkNvdWxkIG5vdCBub3JtYWxpemUgbG9jYXRpb24ocykgb2YgXCIrdGhpcy5pZCtcIiFcIik7XHJcblx0XHR9XHJcblx0XHRmdW5jdGlvbiBfX3BhcnNlQXNBcnJheUFycmF5KGwpIHtcclxuXHRcdFx0dmFyIG4gPSBbXTtcclxuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBsLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdFx0Zm9yICh2YXIgaiA9IDA7IGogPCBsW2ldLmxlbmd0aDsgaisrKSB7XHJcblx0XHRcdFx0XHRpZiAodHlwZW9mIGxbaV1bal0gIT0gXCJudW1iZXJcIilcclxuXHRcdFx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiQ291bGQgbm90IG5vcm1hbGl6ZSBsb2NhdGlvbihzKSBvZiBcIit0aGlzLmlkK1wiIVwiKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0bi5wdXNoKF9fcGFyc2VBc051bWJlckFycmF5KGxbaV0pKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRyZXR1cm4gbjtcclxuXHRcdH1cclxuXHR9LFxyXG5cdFxyXG5cdFxyXG5cdGRpdmlkZUZhY2luZzogZnVuY3Rpb24oZGlydmVjdG9yKSB7XHJcblx0XHR2YXIgeCA9IGRpcnZlY3Rvci54LCB5ID0gZGlydmVjdG9yLno7XHJcblx0XHQvLyBjb25zb2xlLmxvZyhcIkRJUkZBQ0lORzpcIiwgeCwgeSk7XHJcblx0XHRpZiAoTWF0aC5hYnMoeCkgPiBNYXRoLmFicyh5KSkgeyAvL0RpcmVjdGlvbiB2ZWN0b3IgaXMgcG9pbnRpbmcgYWxvbmcgeCBheGlzXHJcblx0XHRcdGlmICh4ID4gMCkgcmV0dXJuIFwid1wiO1xyXG5cdFx0XHRlbHNlIHJldHVybiBcImVcIjtcclxuXHRcdH0gZWxzZSB7IC8vRGlyZWN0aW9uIHZlY3RvciBpcyBwb2ludGluZyBhbG9uZyB5IGF4aXNcclxuXHRcdFx0aWYgKHkgPiAwKSByZXR1cm4gXCJzXCI7XHJcblx0XHRcdGVsc2UgcmV0dXJuIFwiblwiO1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIFwic1wiO1xyXG5cdH1cclxuXHRcclxufSk7XHJcbm1vZHVsZS5leHBvcnRzID0gRXZlbnQ7XHJcblxyXG5FdmVudC5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPVxyXG5FdmVudC5wcm90b3R5cGUub24gPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xyXG5cdGlmICgkLmluQXJyYXkodHlwZSwgX19FVkVOVF9UWVBFU19fKSA9PSAtMSkge1xyXG5cdFx0Y29uc29sZS5lcnJvcihcIk1hcCBFdmVudFwiLCB0aGlzLnRvU3RyaW5nKCksIFwicmVnaXN0ZXJpbmcgZW1pdHRlZCBldmVudCB0eXBlXCIsIFxyXG5cdFx0XHR0eXBlLCBcIndoaWNoIGlzIG5vdCBhIHZhbGlkIGVtaXR0ZWQgZXZlbnQgdHlwZSFcIik7XHJcblx0fVxyXG5cdEV2ZW50RW1pdHRlci5wcm90b3R5cGUub24uY2FsbCh0aGlzLCB0eXBlLCBsaXN0ZW5lcik7XHJcbn1cclxuXHJcbi8vIFRoZSBmb2xsb3dpbmcgaXMgYSBsaXN0IG9mIGV2ZW50cyB0aGUgYmFzZSBFdmVudCBjbGFzcyBhbmQgbGlicmFyeSBlbWl0XHJcbi8vIFRoaXMgbGlzdCBpcyBjaGVja2VkIGFnYWluc3Qgd2hlbiByZWdpc3RlcmluZyB0byBjYXRjaCBtaXNzcGVsbGluZ3MuXHJcbnZhciBfX0VWRU5UX1RZUEVTX18gPSBbXHJcblx0XCJlbnRlcmluZy10aWxlXCIsIC8vKGZyb20tZGlyKSBcclxuXHRcdC8vZW1pdHRlZCB1cG9uIHRoZSBwbGF5ZXIgaXMgZ2l2ZW4gdGhlIGdvIGFoZWFkIHRvIGVudGVyIHRoZSB0aWxlIHRoaXMgZXZlbnQgb2NjdXBpZXMuXHJcblx0XCJlbnRlcmVkLXRpbGVcIiwgLy8oZnJvbS1kaXIpXHJcblx0XHQvL2VtaXR0ZWQgdXBvbiB0aGUgcGxheWVyIGxhbmRpbmcgb24gdGhlIHRpbGUgdGhpcyBldmVudCBvY2N1cGllcy5cclxuXHRcImxlYXZpbmctdGlsZVwiLCAvLyh0by1kaXIpXHJcblx0XHQvL2VtaXR0ZWQgdXBvbiB0aGUgcGxheWVyIGlzIGdpdmVuIHRoZSBnbyBhaGVhZCB0byBsZWF2ZSB0aGUgdGlsZSB0aGlzIGV2ZW50IG9jY3VwaWVzLlxyXG5cdFwibGVmdC10aWxlXCIsIC8vKHRvLWRpcilcclxuXHRcdC8vZW1pdHRlZCB1cG9uIHRoZSBwbGF5ZXIgY29tcGxldGVseSBsZWF2aW5nIHRoZSB0aWxlIHRoaXMgZXZlbnQgb2NjdXBpZXMuXHJcblx0XCJidW1wZWRcIiwgLy8oZnJvbS1kaXIpXHJcblx0XHQvL2VtaXR0ZWQgdXBvbiB0aGUgcGxheWVyIGlzIGRlbmllZCBlbnRyeSBpbnRvIHRoZSB0aWxlIHRoaXMgZXZlbnQgb2NjdXBpZXMuXHJcblx0XCJpbnRlcmFjdGVkXCIsIC8vKGZyb20tZGlyKVxyXG5cdFx0Ly9lbWl0dGVkIHdoZW4gdGhlIHBsYXllciBpbnRlcmFjdHMgd2l0aCB0aGlzIGV2ZW50IGZyb20gYW4gYWRqYWNlbnQgdGlsZVxyXG5cdFwidGlja1wiLCAvLyhkZWx0YSlcclxuXHRcdC8vZW1pdHRlZCBldmVyeSBnYW1lIHRpY2tcclxuXHRcImNsaWNrZWRcIiwgLy8oeCwgeSlcclxuXHRcdC8vZW1pdHRlZCB3aGVuIHRoZSBtb3VzZSBpcyBjbGlja2VkIG9uIHRoaXMgZXZlbnQgKGFuZCBpdCBpcyBkZXRlcm1pbmVkIGl0IGlzIHRoaXMgZXZlbnQpXHJcblx0XCJjbGlja2VkLXRocm91Z2hcIiwgLy8oeCwgeSlcclxuXHRcdC8vZW1pdHRlZCB3aGVuIHRoZSBtb3VzZSBpcyBjbGlja2VkIG9uIHRoaXMgZXZlbnQgKGFuZCB0aGUgcmF5dHJhY2UgaXMgcGFzc2luZyB0aHJvdWdoIFxyXG5cdFx0Ly8gdGhpcyBldmVudCBkdXJpbmcgdGhlIGRldGVybWluaW5nIHBoYXNlKVxyXG5cdFwibW92aW5nXCIsIC8vKHNyY1gsIHNyY1ksIGRlc3RYLCBkZXN0WSlcclxuXHRcdC8vZW1pdHRlZCB3aGVuIHRoaXMgZXZlbnQgYmVnaW5zIG1vdmluZyB0byBhIG5ldyB0aWxlXHJcblx0XCJtb3ZlZFwiLCAvLyhzcmNYLCBzcmNZLCBkZXN0WCwgZGVzdFkpXHJcblx0XHQvL2VtaXR0ZWQgd2hlbiB0aGlzIGV2ZW50IGZpbmlzaGVzIG1vdmluZyB0byBhIG5ldyB0aWxlXHJcblx0XCJjYW50LW1vdmVcIiwgLy8oc3JjWCwgc3JjWSwgZGVzdFgsIGRlc3RZLCByZWFzb25FdmVudClcclxuXHRcdC8vZW1pdHRlZCB3aGVuIHRoaXMgZXZlbnQgaXMgZGVuaWVkIG1vdmVtZW50IHRvIHRoZSByZXF1ZXN0ZWQgdGlsZVxyXG5cdFx0Ly8gSXQgaXMgcGFzc2VkIHRoZSBldmVudCBibG9ja2luZyBpdCwgb3IgbnVsbCBpZiBpdCBpcyBkdWUgdG8gdGhlIGNvbGxpc2lvbiBtYXBcclxuXHRcImFuaW0tZW5kXCIsIC8vKGFuaW1hdGlvbk5hbWUpXHJcblx0XHQvL2VtaXR0ZWQgd2hlbiB0aGlzIGV2ZW50J3MgYW5pbWF0aW9uIGVuZHNcclxuXHRcImNyZWF0ZWRcIiwgXHJcblx0XHQvL2VtaXR0ZWQgd2hlbiB0aGlzIGV2ZW50IGlzIGFkZGVkIHRvIHRoZSBldmVudCBtYXBcclxuXHRcImRlc3Ryb3llZFwiLFxyXG5cdFx0Ly9lbWl0dGVkIHdoZW4gdGhpcyBldmVudCBoYXMgYmVlbiB0YWtlbiBvdXQgb2YgdGhlIGV2ZW50IG1hcFxyXG5cdFwicmVhY3RcIiwgLy8oaWQsIGRpc3RhbmNlKVxyXG5cdFx0Ly9lbWl0dGVkIHdoZW4gYW5vdGhlciBldmVudCBvbiB0aGUgbWFwIHRyYW5zbWl0cyBhIHJlYWN0YWJsZSBldmVudFxyXG5cdFwibWVzc2FnZVwiLCAvLyhpZCwgLi4uKVxyXG5cdFx0Ly9uZXZlciBlbWl0dGVkIGJ5IHRoZSBsaWJyYXJ5LCB0aGlzIGV2ZW50IHR5cGUgY2FuIGJlIHVzZWQgZm9yIGNyb3NzLWV2ZW50IG1lc3NhZ2VzXHJcbl07XHJcbiIsIi8vIHBsYXllci1jaGFyYWN0ZXIuanNcclxuLy8gRGVmaW5lcyB0aGUgY29uY3JldGUgY29kZSBmb3IgYSBQbGF5ZXIgQ2hhcmFjdGVyIGluIHRoZSB3b3JsZFxyXG5cclxudmFyIEFjdG9yID0gcmVxdWlyZShcInRwcC1hY3RvclwiKTtcclxudmFyIGNvbnRyb2xsZXIgPSByZXF1aXJlKFwidHBwLWNvbnRyb2xsZXJcIik7XHJcbnZhciBpbmhlcml0cyA9IHJlcXVpcmUoXCJpbmhlcml0c1wiKTtcclxudmFyIGV4dGVuZCA9IHJlcXVpcmUoXCJleHRlbmRcIik7XHJcblxyXG4vKipcclxuICovXHJcbmZ1bmN0aW9uIFBsYXllckNoYXIoKXtcclxuXHRBY3Rvci5jYWxsKHRoaXMsIHt9LCB7fSk7XHJcblx0XHJcblx0dGhpcy5vbihcInRpY2tcIiwgdGhpcy5jb250cm9sQ2hhcmFjdGVyKTtcclxuXHR0aGlzLm9uKFwiY2FudC1tb3ZlXCIsIHRoaXMuYW5pbWF0ZUJ1bXApO1xyXG59XHJcbmluaGVyaXRzKFBsYXllckNoYXIsIEFjdG9yKTtcclxuZXh0ZW5kKFBsYXllckNoYXIucHJvdG90eXBlLCB7XHJcblx0aWQgOiBcIlBMQVlFUkNIQVJcIixcclxuXHRsb2NhdGlvbiA6IG5ldyBUSFJFRS5WZWN0b3IzKCksXHJcblx0XHJcblx0c3ByaXRlOiBudWxsLFxyXG5cdFxyXG5cdHJlc2V0IDogZnVuY3Rpb24oKSB7XHJcblx0XHR0aGlzLmxvY2F0aW9uLnNldCgwLCAwLCAwKTtcclxuXHR9LFxyXG5cdFxyXG5cdHdhcnBBd2F5IDogZnVuY3Rpb24oYW5pbVR5cGUpIHtcclxuXHRcdGNvbnNvbGUud2FybihcIndhcnBBd2F5IGlzIG5vdCB5ZXQgaW1wbGVtZW50ZWQhXCIpO1xyXG5cdH0sXHJcblx0XHJcblx0d2FycFRvIDogZnVuY3Rpb24od2FycGRlZikge1xyXG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xyXG5cdFx0dGhpcy5sb2NhdGlvbi5zZXQod2FycGRlZi5sb2NbMF0sIHdhcnBkZWYubG9jWzFdLCB3YXJwZGVmLmxheWVyKTtcclxuXHRcdFxyXG5cdFx0aWYgKHdhcnBkZWYuYW5pbSlcclxuXHRcdFx0Y29udHJvbGxlci5wdXNoSW5wdXRDb250ZXh0KFwiY3V0c2NlbmVcIik7XHJcblx0XHQvL1RPRE8gd2FycGRlZi5hbmltXHJcblx0XHRcclxuXHRcdHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcclxuXHRcdFx0c3dpdGNoKE51bWJlcih3YXJwZGVmLmFuaW0pKSB7IC8vV2FycCBhbmltYXRpb25cclxuXHRcdFx0XHRjYXNlIDE6IHNlbGYuYXZhdGFyX25vZGUucG9zaXRpb24ueiArPSAxOyBicmVhazsgLy8gV2FsayB1cFxyXG5cdFx0XHRcdGNhc2UgMjogc2VsZi5hdmF0YXJfbm9kZS5wb3NpdGlvbi56IC09IDE7IGJyZWFrOyAvLyBXYWxrIGRvd25cclxuXHRcdFx0XHRjYXNlIDM6IHNlbGYuYXZhdGFyX25vZGUucG9zaXRpb24ueCAtPSAxOyBicmVhazsgLy8gV2FsayBsZWZ0XHJcblx0XHRcdFx0Y2FzZSA0OiBzZWxmLmF2YXRhcl9ub2RlLnBvc2l0aW9uLnggKz0gMTsgYnJlYWs7IC8vIFdhbGsgZG93blxyXG5cdFx0XHRcdGNhc2UgNTogc2VsZi5hdmF0YXJfbm9kZS5wb3NpdGlvbi55ICs9IDE1OyBicmVhazsgLy8gV2FycCBpblxyXG5cdFx0XHR9XHJcblx0XHR9LCAwKTtcclxuXHRcdFxyXG5cdFx0Y3VycmVudE1hcC5xdWV1ZUZvck1hcFN0YXJ0KGZ1bmN0aW9uKCl7XHJcblx0XHRcdGNvbnNvbGUubG9nKFwiV0FSUCBERUZcIiwgd2FycGRlZik7XHJcblx0XHRcdHZhciBhbmltTmFtZSA9IG51bGw7XHJcblx0XHRcdHZhciB4ID0gc2VsZi5sb2NhdGlvbi54O1xyXG5cdFx0XHR2YXIgeSA9IHNlbGYubG9jYXRpb24ueTtcclxuXHRcdFx0dmFyIGxheWVyID0gc2VsZi5sb2NhdGlvbi56O1xyXG5cdFx0XHR2YXIgeV9vZmYgPSAwO1xyXG5cdFx0XHR2YXIgbXNwZCA9IDEsIGFzcGQgPSAxOyAvL21vdmVtZW50IHNwZWVkLCBhbmltYXRpb24gc3BlZWRcclxuXHRcdFx0dmFyIGFuaW1FbmRFdmVudCA9IFwibW92ZWRcIjtcclxuXHRcdFx0XHJcblx0XHRcdHN3aXRjaChOdW1iZXIod2FycGRlZi5hbmltKSkgeyAvL1dhcnAgYW5pbWF0aW9uXHJcblx0XHRcdFx0Y2FzZSAwOiBicmVhazsgLy8gQXBwZWFyXHJcblx0XHRcdFx0Y2FzZSAxOiB5Kys7IGFuaW1OYW1lID0gXCJ3YWxrXCI7IG1zcGQgPSAwLjM1OyBhc3BkID0gMC4zNTsgYnJlYWs7IC8vIFdhbGsgdXBcclxuXHRcdFx0XHRjYXNlIDI6IHktLTsgYW5pbU5hbWUgPSBcIndhbGtcIjsgbXNwZCA9IDAuMzU7IGFzcGQgPSAwLjM1OyBicmVhazsgLy8gV2FsayBkb3duXHJcblx0XHRcdFx0Y2FzZSAzOiB4LS07IGFuaW1OYW1lID0gXCJ3YWxrXCI7IG1zcGQgPSAwLjM1OyBhc3BkID0gMC4zNTsgYnJlYWs7IC8vIFdhbGsgbGVmdFxyXG5cdFx0XHRcdGNhc2UgNDogeCsrOyBhbmltTmFtZSA9IFwid2Fsa1wiOyBtc3BkID0gMC4zNTsgYXNwZCA9IDAuMzU7IGJyZWFrOyAvLyBXYWxrIGRvd25cclxuXHRcdFx0XHRjYXNlIDU6IC8vIFdhcnAgaW5cclxuXHRcdFx0XHRcdGFuaW1OYW1lID0gXCJ3YXJwX2luXCI7IFxyXG5cdFx0XHRcdFx0eV9vZmYgPSAxNTsgYW5pbUVuZEV2ZW50ID0gXCJhbmltLWVuZFwiO1xyXG5cdFx0XHRcdFx0bXNwZCA9IDAuMjU7IGFzcGQgPSAxOyBcclxuXHRcdFx0XHRcdGJyZWFrOyBcclxuXHRcdFx0XHRkZWZhdWx0OiBcclxuXHRcdFx0XHRcdGNvbnNvbGUud2FybihcIklMTEVHQUwgV0FSUCBBTklNQVRJT046XCIsIHdhcnBkZWYuYW5pbSk7XHJcblx0XHRcdH1cclxuXHRcdFx0XHJcblx0XHRcdHZhciBzcmMgPSBzZWxmLmxvY2F0aW9uO1xyXG5cdFx0XHR2YXIgc3RhdGUgPSBzZWxmLl9pbml0UGF0aGluZ1N0YXRlKCk7XHJcblx0XHRcdFxyXG5cdFx0XHRpZiAoc3JjLngteCB8fCB5LXNyYy55KSBcclxuXHRcdFx0XHRzZWxmLmZhY2luZy5zZXQoeC1zcmMueCwgMCwgc3JjLnkteSk7XHJcblx0XHRcdGVsc2VcclxuXHRcdFx0XHRzZWxmLmZhY2luZy5zZXQoMCwgMCwgMSk7XHJcblx0XHRcdFxyXG5cdFx0XHRzdGF0ZS5zcmNMb2NDLnNldCh4LCB5LCBsYXllcik7XHJcblx0XHRcdHN0YXRlLnNyY0xvYzMuc2V0KGN1cnJlbnRNYXAuZ2V0M0RUaWxlTG9jYXRpb24oeCwgeSwgbGF5ZXIpKS55ICs9IHlfb2ZmO1xyXG5cdFx0XHRzdGF0ZS5kZXN0TG9jQy5zZXQoc3JjKTtcclxuXHRcdFx0c3RhdGUuZGVzdExvYzMuc2V0KGN1cnJlbnRNYXAuZ2V0M0RUaWxlTG9jYXRpb24oc3JjKSk7XHJcblx0XHRcdHN0YXRlLmRlbHRhID0gMDtcclxuXHRcdFx0c3RhdGUubW92aW5nID0gdHJ1ZTtcclxuXHRcdFx0c3RhdGUuc3BlZWQgPSBtc3BkO1xyXG5cdFx0XHRcclxuXHRcdFx0c2VsZi5wbGF5QW5pbWF0aW9uKGFuaW1OYW1lLCB7IHNwZWVkOiBhc3BkIH0pO1xyXG5cdFx0XHRzZWxmLm9uY2UoYW5pbUVuZEV2ZW50LCBmdW5jdGlvbihhbmltYXRpb25OYW1lKXtcclxuXHRcdFx0XHRjb25zb2xlLmxvZyhcIlBvcCFcIik7XHJcblx0XHRcdFx0Y29udHJvbGxlci5wb3BJbnB1dENvbnRleHQoXCJjdXRzY2VuZVwiKTtcclxuXHRcdFx0fSk7XHJcblx0XHRcdC8vc2VsZi5hdmF0YXJfbm9kZS5wb3NpdGlvbi5zZXQoIGN1cnJlbnRNYXAuZ2V0M0RUaWxlTG9jYXRpb24oc2VsZi5sb2NhdGlvbikgKTtcclxuXHRcdH0pO1xyXG5cdH0sXHJcblx0XHJcblx0Y29udHJvbFRpbWVvdXQ6IDAuMCxcclxuXHRjb250cm9sQ2hhcmFjdGVyIDogZnVuY3Rpb24oZGVsdGEpIHtcclxuXHRcdHZhciB5ID0gKChjb250cm9sbGVyLmlzRG93bihcIlVwXCIsIFwiZ2FtZVwiKSk/IC0xOjApICsgKChjb250cm9sbGVyLmlzRG93bihcIkRvd25cIiwgXCJnYW1lXCIpKT8gMTowKTtcclxuXHRcdHZhciB4ID0gKChjb250cm9sbGVyLmlzRG93bihcIkxlZnRcIiwgXCJnYW1lXCIpKT8gLTE6MCkgKyAoKGNvbnRyb2xsZXIuaXNEb3duKFwiUmlnaHRcIiwgXCJnYW1lXCIpKT8gMTowKTtcclxuXHRcdFxyXG5cdFx0aWYgKGNvbnRyb2xsZXIuaXNEb3duT25jZShcIkludGVyYWN0XCIsIFwiZ2FtZVwiKSAmJiAhdGhpcy5faW5pdFBhdGhpbmdTdGF0ZSgpLm1vdmluZykge1xyXG5cdFx0XHRjdXJyZW50TWFwLmRpc3BhdGNoKFxyXG5cdFx0XHRcdHRoaXMubG9jYXRpb24ueCAtIHRoaXMuZmFjaW5nLngsIHRoaXMubG9jYXRpb24ueSArIHRoaXMuZmFjaW5nLnosIFxyXG5cdFx0XHRcdFwiaW50ZXJhY3RlZFwiLCB0aGlzLmZhY2luZyk7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdHZhciBydW4gPSBjb250cm9sbGVyLmlzRG93bihcIlJ1blwiLCBcImdhbWVcIik7XHJcblx0XHRcclxuXHRcdGlmICgoeSB8fCB4KSAmJiAhKHggJiYgeSkpIHsgLy9vbmUsIGJ1dCBub3QgYm90aFxyXG5cdFx0XHRpZiAodGhpcy5jb250cm9sVGltZW91dCA8IDEpIHtcclxuXHRcdFx0XHR0aGlzLmNvbnRyb2xUaW1lb3V0ICs9IENPTkZJRy50aW1lb3V0LndhbGtDb250cm9sICogZGVsdGE7XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0aWYgKCF0aGlzLl9pbml0UGF0aGluZ1N0YXRlKCkubW92aW5nKSB7XHJcblx0XHRcdFx0XHR0aGlzLmZhY2VEaXIoeCwgeSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdGlmICghdGhpcy5faW5pdFBhdGhpbmdTdGF0ZSgpLm1vdmluZykge1xyXG5cdFx0XHRcdFx0dGhpcy5tb3ZlVG8odGhpcy5sb2NhdGlvbi54K3gsIHRoaXMubG9jYXRpb24ueSt5LCB7XHJcblx0XHRcdFx0XHRcdHNwZWVkOiAocnVuKT8gMiA6IDEsXHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdC8vVGhpcyBtYWtlcyBpdCBzbyB5b3UgY2FuIHRhcCBhIGRpcmVjdGlvbiB0byBmYWNlLCBpbnN0ZWFkIG9mIGp1c3QgYWx3YXlzIHdhbGtpbmcgaW4gc2FpZCBkaXJlY3Rpb25cclxuXHRcdFx0aWYgKHRoaXMuY29udHJvbFRpbWVvdXQgPiAwKVxyXG5cdFx0XHRcdHRoaXMuY29udHJvbFRpbWVvdXQgLT0gQ09ORklHLnRpbWVvdXQud2Fsa0NvbnRyb2wgKiBkZWx0YTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdH0sXHJcblx0XHJcblx0YW5pbWF0ZUJ1bXAgOiBmdW5jdGlvbihzcmN4LCBzcmN5LCB4LCB5LCByZWFzb24pIHtcclxuXHRcdC8vIGNvbnNvbGUud2Fybih0aGlzLmlkLCBcIjogQ2Fubm90IHdhbGsgdG8gbG9jYXRpb25cIiwgXCIoXCIreCtcIixcIit5K1wiKVwiKTtcclxuXHRcdHRoaXMucGxheUFuaW1hdGlvbihcImJ1bXBcIiwgeyBzdG9wTmV4dFRyYW5zaXRpb246IHRydWUgfSk7XHJcblx0fSxcclxuXHRcclxuXHRcclxuXHQvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHRpc05QQyA6IGZ1bmN0aW9uKCl7IHJldHVybiBmYWxzZTsgfSxcclxuXHRcclxuXHRfYXZhdGFyX2xvYWRTcHJpdGUgOiBmdW5jdGlvbihtYXAsIHRleHR1cmUpIHtcclxuXHRcdHZhciB1cmwgPSBCQVNFVVJMK1wiL2ltZy9wY3MvXCIrIGdhbWVTdGF0ZS5wbGF5ZXJTcHJpdGU7XHJcblx0XHR2YXIgcmVzID0gL14oW15cXFtdKylcXFsoW15cXF1dKylcXF0ucG5nJC8uZXhlYyh1cmwpO1xyXG5cdFx0XHJcblx0XHR2YXIgbmFtZSA9IHJlc1sxXTtcclxuXHRcdHZhciBmb3JtYXQgPSByZXNbMl07XHJcblx0XHRcclxuXHRcdHZhciBpbWcgPSBuZXcgSW1hZ2UoKTtcclxuXHRcdGZvcm1hdCA9IHRoaXMuZ2V0U3ByaXRlRm9ybWF0KGZvcm1hdCk7XHJcblx0XHR0aGlzLl9fb25Mb2FkU3ByaXRlKGltZywgZm9ybWF0LCB0ZXh0dXJlKTtcclxuXHRcdGltZy5zcmMgPSB1cmw7XHJcblx0fSxcclxuXHRcclxuXHQvLyBOZXV0ZXIgdGhlIGxvY2F0aW9uIG5vcm1pbGl6YXRpb24gZm9yIHRoaXMga2luZCBvZiBldmVudFxyXG5cdF9ub3JtYWxpemVMb2NhdGlvbiA6IGZ1bmN0aW9uKCkge30sXHJcblx0XHJcbn0pO1xyXG5tb2R1bGUuZXhwb3J0cyA9IFBsYXllckNoYXI7XHJcbiIsIi8vIHRHYWxsZXJ5LmpzXHJcbi8vIERlZmluZXMgdGhlIGJhc2UgZXZlbnQgdGhhdCBhY3RvcnMgaGF2ZSBpbiB0aGUgdEdhbGxlcnkgdGVzdCBtYXAuXHJcblxyXG52YXIgaW5oZXJpdHMgPSByZXF1aXJlKFwiaW5oZXJpdHNcIik7XHJcbnZhciBleHRlbmQgPSByZXF1aXJlKFwiZXh0ZW5kXCIpO1xyXG5cclxudmFyIEFjdG9yID0gcmVxdWlyZShcInRwcC1hY3RvclwiKTtcclxudmFyIE1lYW5kZXJCZWhhdiA9IHJlcXVpcmUoXCJ0cHAtYmVoYXZpb3JcIikuTWVhbmRlcjtcclxudmFyIFRhbGtpbmdCZWhhdiA9IHJlcXVpcmUoXCJ0cHAtYmVoYXZpb3JcIikuVGFsa2luZztcclxuXHJcbmZ1bmN0aW9uIEFjdG9yR2FsYShiYXNlLCBleHQpIHtcclxuXHRleHQgPSBleHRlbmQoe1xyXG5cdFx0bG9jYXRpb246IFwicmFuZFwiLFxyXG5cdFx0b25FdmVudHM6IHtcclxuXHRcdFx0aW50ZXJhY3RlZDogZnVuY3Rpb24oKSB7XHJcblx0XHRcdFx0dmFyIHNlbGYgPSB0aGlzO1xyXG5cdFx0XHRcdCQoXCIjc3RhdHVzYmFyXCIpLmh0bWwoXCJUaGlzIGlzIFwiK3RoaXMubmFtZStcIiEgKFwiK3RoaXMuaWQrXCIpXCIpO1xyXG5cdFx0XHRcdHZhciBkbG9nID0gc2VsZi5kaWFsb2cgfHwgW1xyXG5cdFx0XHRcdFx0XCJcIit0aGlzLm5hbWUrXCIgd2F2ZXMgYXQgeW91IGluIGdyZWV0aW5nIGJlZm9yZSBjb250aW51aW5nIHRvIG1lYW5kZXIgYWJvdXQgdGhlIEdhbGxlcnkuXCJcclxuXHRcdFx0XHRdO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdC8vIFVJLnNob3dUZXh0Qm94KHNlbGYuZGlhbG9nX3R5cGUsIGRsb2csIHsgY29tcGxldGU6IGZ1bmN0aW9uKCl7XHJcblx0XHRcdFx0Ly8gXHRzZWxmLmJlaGF2aW9yU3RhY2sucG9wKCk7XHJcblx0XHRcdFx0Ly8gfX0pO1xyXG5cdFx0XHRcdC8vIHNlbGYuYmVoYXZpb3JTdGFjay5wdXNoKFRhbGtpbmdCZWhhdik7XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0c2VsZi5iZWhhdmlvclN0YWNrLnB1c2gobmV3IFRhbGtpbmdCZWhhdih7XHJcblx0XHRcdFx0XHRkaWFsb2c6IGRsb2csXHJcblx0XHRcdFx0XHRkaWFsb2dfdHlwZTogc2VsZi5kaWFsb2dfdHlwZSxcclxuXHRcdFx0XHR9KSk7XHJcblx0XHRcdH0sXHJcblx0XHR9LFxyXG5cdFx0XHJcblx0XHRkaWFsb2dfdHlwZTogXCJ0ZXh0XCIsXHJcblx0XHRkaWFsb2c6IG51bGwsXHJcblx0XHRcclxuXHRcdGJlaGF2aW9yU3RhY2s6IFtuZXcgTWVhbmRlckJlaGF2KCldLFxyXG5cdFx0XHJcblx0XHRzaG91bGRBcHBlYXI6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdHJ1ZTsgfSxcclxuXHRcdFxyXG5cdH0sIGV4dCk7XHJcblx0QWN0b3IuY2FsbCh0aGlzLCBiYXNlLCBleHQpO1xyXG59XHJcbmluaGVyaXRzKEFjdG9yR2FsYSwgQWN0b3IpO1xyXG5cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQWN0b3JHYWxhOyIsIi8vIHRyaWdnZXIuanNcclxuLy8gRGVmaW5lcyBhIHRyaWdnZXIgdGlsZShzKSB1c2VkIHRocm91Z2hvdXQgdGhlIHBhcmtcclxuXHJcbnZhciBFdmVudCA9IHJlcXVpcmUoXCJ0cHAtZXZlbnRcIik7XHJcbnZhciBpbmhlcml0cyA9IHJlcXVpcmUoXCJpbmhlcml0c1wiKTtcclxudmFyIGV4dGVuZCA9IHJlcXVpcmUoXCJleHRlbmRcIik7XHJcblxyXG4vKipcclxuICogQSB0cmlnZ2VyIGlzIGEgdGlsZSB0aGF0LCB3aGVuIHN0ZXBwZWQgdXBvbiwgd2lsbCB0cmlnZ2VyIHNvbWUgZXZlbnQuXHJcbiAqIFRoZSBtb3N0IGNvbW1vbiBldmVudCB0aWdnZXJlZCBpcyBhIHdhcnBpbmcgdG8gYW5vdGhlciBtYXAsIGZvciB3aGljaFxyXG4gKiB0aGUgc3ViY2xhc3MgV2FycCBpcyBkZXNpZ25lZCBmb3IuXHJcbiAqXHJcbiAqIFRyaWdnZXJzIG1heSB0YWtlIHVwIG1vcmUgdGhhbiBvbmUgc3BhY2UuXHJcbiAqL1xyXG5mdW5jdGlvbiBUcmlnZ2VyKGJhc2UsIG9wdHMpIHtcclxuXHRFdmVudC5jYWxsKHRoaXMsIGJhc2UsIG9wdHMpO1xyXG5cdFxyXG5cdHRoaXMub24oXCJlbnRlcmVkLXRpbGVcIiwgdGhpcy5vblRyaWdnZXJFbnRlcik7XHJcblx0dGhpcy5vbihcImxlYXZpbmctdGlsZVwiLCB0aGlzLm9uVHJpZ2dlckxlYXZlKTtcclxufVxyXG5pbmhlcml0cyhUcmlnZ2VyLCBFdmVudCk7XHJcbmV4dGVuZChUcmlnZ2VyLnByb3RvdHlwZSwge1xyXG5cdFxyXG5cdG9uVHJpZ2dlckVudGVyIDogZnVuY3Rpb24oZGlyKSB7XHJcblx0XHRjb25zb2xlLmxvZyhcIlRyaWdnZXJlZCFcIik7XHJcblx0fSxcclxuXHRvblRyaWdnZXJMZWF2ZSA6IGZ1bmN0aW9uKGRpcikge1xyXG5cdFx0XHJcblx0fSxcclxufSk7XHJcbm1vZHVsZS5leHBvcnRzID0gVHJpZ2dlcjtcclxuIiwiLy8gd2FycC5qc1xyXG4vLyBEZWZpbmVzIGEgd2FycCB0aWxlIHVzZWQgdGhyb3VnaG91dCB0aGUgcGFyay5cclxuXHJcbnZhciBUcmlnZ2VyID0gcmVxdWlyZShcInRwcC10cmlnZ2VyXCIpO1xyXG52YXIgaW5oZXJpdHMgPSByZXF1aXJlKFwiaW5oZXJpdHNcIik7XHJcbnZhciBleHRlbmQgPSByZXF1aXJlKFwiZXh0ZW5kXCIpO1xyXG5cclxuLyoqXHJcbiAqIEEgd2FycCBpcyBhbiBldmVudCB0aGF0LCB3aGVuIHdhbGtlZCB1cG9uLCB3aWxsIHRha2UgdGhlIHBsYXllciB0byBhbm90aGVyIG1hcCBvclxyXG4gKiBhcmVhIHdpdGhpbiB0aGUgc2FtZSBtYXAuIERpZmZlcmVudCB0eXBlcyBvZiB3YXJwcyBleGlzdCwgcmFuZ2luZyBmcm9tIHRoZSBzdGFuZGFyZFxyXG4gKiBkb29yIHdhcnAgdG8gdGhlIHRlbGVwb3J0IHdhcnAuIFdhcnBzIGNhbiBiZSB0b2xkIHRvIGFjdGl2YXRlIHVwb24gc3RlcHBpbmcgdXBvbiB0aGVtXHJcbiAqIG9yIGFjdGl2YXRlIHVwb24gc3RlcHBpbmcgb2ZmIGEgY2VydGFpbiBkaXJlY3Rpb24uXHJcbiAqL1xyXG5mdW5jdGlvbiBXYXJwKGJhc2UsIG9wdHMpIHtcclxuXHRUcmlnZ2VyLmNhbGwodGhpcywgYmFzZSwgb3B0cyk7XHJcblx0XHJcbn1cclxuaW5oZXJpdHMoV2FycCwgVHJpZ2dlcik7XHJcbmV4dGVuZChXYXJwLnByb3RvdHlwZSwge1xyXG5cdHNvdW5kOiBcImV4aXRfd2Fsa1wiLFxyXG5cdGV4aXRfdG86IG51bGwsXHJcblx0XHJcblx0b25UcmlnZ2VyRW50ZXIgOiBmdW5jdGlvbihkaXIpIHtcclxuXHRcdFNvdW5kTWFuYWdlci5wbGF5U291bmQodGhpcy5zb3VuZCk7XHJcblx0XHRpZiAoIXRoaXMuZXhpdF90bykgcmV0dXJuO1xyXG5cdFx0TWFwTWFuYWdlci50cmFuc2l0aW9uVG8odGhpcy5leGl0X3RvLm1hcCwgdGhpcy5leGl0X3RvLndhcnApO1xyXG5cdH0sXHJcbn0pO1xyXG5tb2R1bGUuZXhwb3J0cyA9IFdhcnA7Il19
