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
	_avatar_shadowcaster : null,
	
	getAvatar : function(map){ 
		if (this.avatar_node) return this.avatar_node;
		
		var node = this.avatar_node = new THREE.Object3D();
		
		node.add(this._avatar_createSprite(map));
		node.add(this._avatar_createShadowCaster(map));
		
		return node;
		
	},
	
	getTalkingAnchor : function() {
		return this._avatar_shadowcaster.localToWorld(
			this._avatar_shadowcaster.position.clone()
		);
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
		return this._avatar_shadowcaster = mesh;
	},
	
	_avatar_createSprite : function(map) {
		var self = this;
		// var img = new Image();
		var texture = self.avatar_tex = new THREE.Texture(DEF_SPRITE_IMG);
		map.gc.collect(texture);
		
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
		this.emit("inputContextChanged");
	},
	popInputContext: function(ctx) {
		if (!ctx || this.inputContext.top == ctx) {
			var c = this.inputContext.pop();
			this.emit("inputContextChanged");
			return c;
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
		
		if (controller.isDownOnce("Interact", "game") && !this._initPathingState().moving) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlc1xcYnJvd3NlcmlmeVxcbm9kZV9tb2R1bGVzXFxicm93c2VyLXBhY2tcXF9wcmVsdWRlLmpzIiwibm9kZV9tb2R1bGVzXFxicm93c2VyaWZ5XFxub2RlX21vZHVsZXNcXGV2ZW50c1xcZXZlbnRzLmpzIiwibm9kZV9tb2R1bGVzXFxleHRlbmRcXGluZGV4LmpzIiwibm9kZV9tb2R1bGVzXFxpbmhlcml0c1xcaW5oZXJpdHMuanMiLCJzcmNcXGpzXFxtb2RlbFxcc3ByaXRlbW9kZWwuanMiLCJzcmNcXGpzXFxldmVudHNcXGFjdG9yX2FuaW1hdGlvbnMiLCJzcmNcXGpzXFxldmVudHNcXGFjdG9yIiwic3JjXFxqc1xcZXZlbnRzXFxiZWhhdmlvciIsInNyY1xcanNcXG1hbmFnZXJzXFxjb250cm9sbGVyIiwic3JjXFxqc1xcZXZlbnRzXFxldmVudCIsInNyY1xcanNcXGV2ZW50c1xccGxheWVyLWNoYXJhY3RlciIsInNyY1xcanNcXGV2ZW50c1xcdHJpZ2dlciIsInNyY1xcanNcXGV2ZW50c1xcd2FycCJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN1NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMVBBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN1NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbGdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuZnVuY3Rpb24gRXZlbnRFbWl0dGVyKCkge1xuICB0aGlzLl9ldmVudHMgPSB0aGlzLl9ldmVudHMgfHwge307XG4gIHRoaXMuX21heExpc3RlbmVycyA9IHRoaXMuX21heExpc3RlbmVycyB8fCB1bmRlZmluZWQ7XG59XG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50RW1pdHRlcjtcblxuLy8gQmFja3dhcmRzLWNvbXBhdCB3aXRoIG5vZGUgMC4xMC54XG5FdmVudEVtaXR0ZXIuRXZlbnRFbWl0dGVyID0gRXZlbnRFbWl0dGVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9ldmVudHMgPSB1bmRlZmluZWQ7XG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9tYXhMaXN0ZW5lcnMgPSB1bmRlZmluZWQ7XG5cbi8vIEJ5IGRlZmF1bHQgRXZlbnRFbWl0dGVycyB3aWxsIHByaW50IGEgd2FybmluZyBpZiBtb3JlIHRoYW4gMTAgbGlzdGVuZXJzIGFyZVxuLy8gYWRkZWQgdG8gaXQuIFRoaXMgaXMgYSB1c2VmdWwgZGVmYXVsdCB3aGljaCBoZWxwcyBmaW5kaW5nIG1lbW9yeSBsZWFrcy5cbkV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzID0gMTA7XG5cbi8vIE9idmlvdXNseSBub3QgYWxsIEVtaXR0ZXJzIHNob3VsZCBiZSBsaW1pdGVkIHRvIDEwLiBUaGlzIGZ1bmN0aW9uIGFsbG93c1xuLy8gdGhhdCB0byBiZSBpbmNyZWFzZWQuIFNldCB0byB6ZXJvIGZvciB1bmxpbWl0ZWQuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnNldE1heExpc3RlbmVycyA9IGZ1bmN0aW9uKG4pIHtcbiAgaWYgKCFpc051bWJlcihuKSB8fCBuIDwgMCB8fCBpc05hTihuKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ24gbXVzdCBiZSBhIHBvc2l0aXZlIG51bWJlcicpO1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSBuO1xuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGVyLCBoYW5kbGVyLCBsZW4sIGFyZ3MsIGksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBJZiB0aGVyZSBpcyBubyAnZXJyb3InIGV2ZW50IGxpc3RlbmVyIHRoZW4gdGhyb3cuXG4gIGlmICh0eXBlID09PSAnZXJyb3InKSB7XG4gICAgaWYgKCF0aGlzLl9ldmVudHMuZXJyb3IgfHxcbiAgICAgICAgKGlzT2JqZWN0KHRoaXMuX2V2ZW50cy5lcnJvcikgJiYgIXRoaXMuX2V2ZW50cy5lcnJvci5sZW5ndGgpKSB7XG4gICAgICBlciA9IGFyZ3VtZW50c1sxXTtcbiAgICAgIGlmIChlciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgIHRocm93IGVyOyAvLyBVbmhhbmRsZWQgJ2Vycm9yJyBldmVudFxuICAgICAgfVxuICAgICAgdGhyb3cgVHlwZUVycm9yKCdVbmNhdWdodCwgdW5zcGVjaWZpZWQgXCJlcnJvclwiIGV2ZW50LicpO1xuICAgIH1cbiAgfVxuXG4gIGhhbmRsZXIgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzVW5kZWZpbmVkKGhhbmRsZXIpKVxuICAgIHJldHVybiBmYWxzZTtcblxuICBpZiAoaXNGdW5jdGlvbihoYW5kbGVyKSkge1xuICAgIHN3aXRjaCAoYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgLy8gZmFzdCBjYXNlc1xuICAgICAgY2FzZSAxOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAyOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDM6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgLy8gc2xvd2VyXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgICAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgICAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIGhhbmRsZXIuYXBwbHkodGhpcywgYXJncyk7XG4gICAgfVxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGhhbmRsZXIpKSB7XG4gICAgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuXG4gICAgbGlzdGVuZXJzID0gaGFuZGxlci5zbGljZSgpO1xuICAgIGxlbiA9IGxpc3RlbmVycy5sZW5ndGg7XG4gICAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKVxuICAgICAgbGlzdGVuZXJzW2ldLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIG07XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIFRvIGF2b2lkIHJlY3Vyc2lvbiBpbiB0aGUgY2FzZSB0aGF0IHR5cGUgPT09IFwibmV3TGlzdGVuZXJcIiEgQmVmb3JlXG4gIC8vIGFkZGluZyBpdCB0byB0aGUgbGlzdGVuZXJzLCBmaXJzdCBlbWl0IFwibmV3TGlzdGVuZXJcIi5cbiAgaWYgKHRoaXMuX2V2ZW50cy5uZXdMaXN0ZW5lcilcbiAgICB0aGlzLmVtaXQoJ25ld0xpc3RlbmVyJywgdHlwZSxcbiAgICAgICAgICAgICAgaXNGdW5jdGlvbihsaXN0ZW5lci5saXN0ZW5lcikgP1xuICAgICAgICAgICAgICBsaXN0ZW5lci5saXN0ZW5lciA6IGxpc3RlbmVyKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAvLyBPcHRpbWl6ZSB0aGUgY2FzZSBvZiBvbmUgbGlzdGVuZXIuIERvbid0IG5lZWQgdGhlIGV4dHJhIGFycmF5IG9iamVjdC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBsaXN0ZW5lcjtcbiAgZWxzZSBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICAvLyBJZiB3ZSd2ZSBhbHJlYWR5IGdvdCBhbiBhcnJheSwganVzdCBhcHBlbmQuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdLnB1c2gobGlzdGVuZXIpO1xuICBlbHNlXG4gICAgLy8gQWRkaW5nIHRoZSBzZWNvbmQgZWxlbWVudCwgbmVlZCB0byBjaGFuZ2UgdG8gYXJyYXkuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gW3RoaXMuX2V2ZW50c1t0eXBlXSwgbGlzdGVuZXJdO1xuXG4gIC8vIENoZWNrIGZvciBsaXN0ZW5lciBsZWFrXG4gIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pICYmICF0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkKSB7XG4gICAgdmFyIG07XG4gICAgaWYgKCFpc1VuZGVmaW5lZCh0aGlzLl9tYXhMaXN0ZW5lcnMpKSB7XG4gICAgICBtID0gdGhpcy5fbWF4TGlzdGVuZXJzO1xuICAgIH0gZWxzZSB7XG4gICAgICBtID0gRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnM7XG4gICAgfVxuXG4gICAgaWYgKG0gJiYgbSA+IDAgJiYgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCA+IG0pIHtcbiAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQgPSB0cnVlO1xuICAgICAgY29uc29sZS5lcnJvcignKG5vZGUpIHdhcm5pbmc6IHBvc3NpYmxlIEV2ZW50RW1pdHRlciBtZW1vcnkgJyArXG4gICAgICAgICAgICAgICAgICAgICdsZWFrIGRldGVjdGVkLiAlZCBsaXN0ZW5lcnMgYWRkZWQuICcgK1xuICAgICAgICAgICAgICAgICAgICAnVXNlIGVtaXR0ZXIuc2V0TWF4TGlzdGVuZXJzKCkgdG8gaW5jcmVhc2UgbGltaXQuJyxcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCk7XG4gICAgICBpZiAodHlwZW9mIGNvbnNvbGUudHJhY2UgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgLy8gbm90IHN1cHBvcnRlZCBpbiBJRSAxMFxuICAgICAgICBjb25zb2xlLnRyYWNlKCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbmNlID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIHZhciBmaXJlZCA9IGZhbHNlO1xuXG4gIGZ1bmN0aW9uIGcoKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBnKTtcblxuICAgIGlmICghZmlyZWQpIHtcbiAgICAgIGZpcmVkID0gdHJ1ZTtcbiAgICAgIGxpc3RlbmVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICB9XG5cbiAgZy5saXN0ZW5lciA9IGxpc3RlbmVyO1xuICB0aGlzLm9uKHR5cGUsIGcpO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLy8gZW1pdHMgYSAncmVtb3ZlTGlzdGVuZXInIGV2ZW50IGlmZiB0aGUgbGlzdGVuZXIgd2FzIHJlbW92ZWRcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbGlzdCwgcG9zaXRpb24sIGxlbmd0aCwgaTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXR1cm4gdGhpcztcblxuICBsaXN0ID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuICBsZW5ndGggPSBsaXN0Lmxlbmd0aDtcbiAgcG9zaXRpb24gPSAtMTtcblxuICBpZiAobGlzdCA9PT0gbGlzdGVuZXIgfHxcbiAgICAgIChpc0Z1bmN0aW9uKGxpc3QubGlzdGVuZXIpICYmIGxpc3QubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG5cbiAgfSBlbHNlIGlmIChpc09iamVjdChsaXN0KSkge1xuICAgIGZvciAoaSA9IGxlbmd0aDsgaS0tID4gMDspIHtcbiAgICAgIGlmIChsaXN0W2ldID09PSBsaXN0ZW5lciB8fFxuICAgICAgICAgIChsaXN0W2ldLmxpc3RlbmVyICYmIGxpc3RbaV0ubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgICAgICBwb3NpdGlvbiA9IGk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChwb3NpdGlvbiA8IDApXG4gICAgICByZXR1cm4gdGhpcztcblxuICAgIGlmIChsaXN0Lmxlbmd0aCA9PT0gMSkge1xuICAgICAgbGlzdC5sZW5ndGggPSAwO1xuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGlzdC5zcGxpY2UocG9zaXRpb24sIDEpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUFsbExpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGtleSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIC8vIG5vdCBsaXN0ZW5pbmcgZm9yIHJlbW92ZUxpc3RlbmVyLCBubyBuZWVkIHRvIGVtaXRcbiAgaWYgKCF0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMClcbiAgICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIGVsc2UgaWYgKHRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvLyBlbWl0IHJlbW92ZUxpc3RlbmVyIGZvciBhbGwgbGlzdGVuZXJzIG9uIGFsbCBldmVudHNcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICBmb3IgKGtleSBpbiB0aGlzLl9ldmVudHMpIHtcbiAgICAgIGlmIChrZXkgPT09ICdyZW1vdmVMaXN0ZW5lcicpIGNvbnRpbnVlO1xuICAgICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoa2V5KTtcbiAgICB9XG4gICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoJ3JlbW92ZUxpc3RlbmVyJyk7XG4gICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBsaXN0ZW5lcnMgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzRnVuY3Rpb24obGlzdGVuZXJzKSkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBMSUZPIG9yZGVyXG4gICAgd2hpbGUgKGxpc3RlbmVycy5sZW5ndGgpXG4gICAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVyc1tsaXN0ZW5lcnMubGVuZ3RoIC0gMV0pO1xuICB9XG4gIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSBbXTtcbiAgZWxzZSBpZiAoaXNGdW5jdGlvbih0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IFt0aGlzLl9ldmVudHNbdHlwZV1dO1xuICBlbHNlXG4gICAgcmV0ID0gdGhpcy5fZXZlbnRzW3R5cGVdLnNsaWNlKCk7XG4gIHJldHVybiByZXQ7XG59O1xuXG5FdmVudEVtaXR0ZXIubGlzdGVuZXJDb3VudCA9IGZ1bmN0aW9uKGVtaXR0ZXIsIHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCFlbWl0dGVyLl9ldmVudHMgfHwgIWVtaXR0ZXIuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSAwO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKGVtaXR0ZXIuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gMTtcbiAgZWxzZVxuICAgIHJldCA9IGVtaXR0ZXIuX2V2ZW50c1t0eXBlXS5sZW5ndGg7XG4gIHJldHVybiByZXQ7XG59O1xuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Z1bmN0aW9uJztcbn1cblxuZnVuY3Rpb24gaXNOdW1iZXIoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnbnVtYmVyJztcbn1cblxuZnVuY3Rpb24gaXNPYmplY3QoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiBhcmcgIT09IG51bGw7XG59XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09PSB2b2lkIDA7XG59XG4iLCJ2YXIgaGFzT3duID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcbnZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG52YXIgdW5kZWZpbmVkO1xuXG52YXIgaXNQbGFpbk9iamVjdCA9IGZ1bmN0aW9uIGlzUGxhaW5PYmplY3Qob2JqKSB7XG5cdCd1c2Ugc3RyaWN0Jztcblx0aWYgKCFvYmogfHwgdG9TdHJpbmcuY2FsbChvYmopICE9PSAnW29iamVjdCBPYmplY3RdJykge1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXG5cdHZhciBoYXNfb3duX2NvbnN0cnVjdG9yID0gaGFzT3duLmNhbGwob2JqLCAnY29uc3RydWN0b3InKTtcblx0dmFyIGhhc19pc19wcm9wZXJ0eV9vZl9tZXRob2QgPSBvYmouY29uc3RydWN0b3IgJiYgb2JqLmNvbnN0cnVjdG9yLnByb3RvdHlwZSAmJiBoYXNPd24uY2FsbChvYmouY29uc3RydWN0b3IucHJvdG90eXBlLCAnaXNQcm90b3R5cGVPZicpO1xuXHQvLyBOb3Qgb3duIGNvbnN0cnVjdG9yIHByb3BlcnR5IG11c3QgYmUgT2JqZWN0XG5cdGlmIChvYmouY29uc3RydWN0b3IgJiYgIWhhc19vd25fY29uc3RydWN0b3IgJiYgIWhhc19pc19wcm9wZXJ0eV9vZl9tZXRob2QpIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblxuXHQvLyBPd24gcHJvcGVydGllcyBhcmUgZW51bWVyYXRlZCBmaXJzdGx5LCBzbyB0byBzcGVlZCB1cCxcblx0Ly8gaWYgbGFzdCBvbmUgaXMgb3duLCB0aGVuIGFsbCBwcm9wZXJ0aWVzIGFyZSBvd24uXG5cdHZhciBrZXk7XG5cdGZvciAoa2V5IGluIG9iaikge31cblxuXHRyZXR1cm4ga2V5ID09PSB1bmRlZmluZWQgfHwgaGFzT3duLmNhbGwob2JqLCBrZXkpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBleHRlbmQoKSB7XG5cdCd1c2Ugc3RyaWN0Jztcblx0dmFyIG9wdGlvbnMsIG5hbWUsIHNyYywgY29weSwgY29weUlzQXJyYXksIGNsb25lLFxuXHRcdHRhcmdldCA9IGFyZ3VtZW50c1swXSxcblx0XHRpID0gMSxcblx0XHRsZW5ndGggPSBhcmd1bWVudHMubGVuZ3RoLFxuXHRcdGRlZXAgPSBmYWxzZTtcblxuXHQvLyBIYW5kbGUgYSBkZWVwIGNvcHkgc2l0dWF0aW9uXG5cdGlmICh0eXBlb2YgdGFyZ2V0ID09PSAnYm9vbGVhbicpIHtcblx0XHRkZWVwID0gdGFyZ2V0O1xuXHRcdHRhcmdldCA9IGFyZ3VtZW50c1sxXSB8fCB7fTtcblx0XHQvLyBza2lwIHRoZSBib29sZWFuIGFuZCB0aGUgdGFyZ2V0XG5cdFx0aSA9IDI7XG5cdH0gZWxzZSBpZiAoKHR5cGVvZiB0YXJnZXQgIT09ICdvYmplY3QnICYmIHR5cGVvZiB0YXJnZXQgIT09ICdmdW5jdGlvbicpIHx8IHRhcmdldCA9PSBudWxsKSB7XG5cdFx0dGFyZ2V0ID0ge307XG5cdH1cblxuXHRmb3IgKDsgaSA8IGxlbmd0aDsgKytpKSB7XG5cdFx0b3B0aW9ucyA9IGFyZ3VtZW50c1tpXTtcblx0XHQvLyBPbmx5IGRlYWwgd2l0aCBub24tbnVsbC91bmRlZmluZWQgdmFsdWVzXG5cdFx0aWYgKG9wdGlvbnMgIT0gbnVsbCkge1xuXHRcdFx0Ly8gRXh0ZW5kIHRoZSBiYXNlIG9iamVjdFxuXHRcdFx0Zm9yIChuYW1lIGluIG9wdGlvbnMpIHtcblx0XHRcdFx0c3JjID0gdGFyZ2V0W25hbWVdO1xuXHRcdFx0XHRjb3B5ID0gb3B0aW9uc1tuYW1lXTtcblxuXHRcdFx0XHQvLyBQcmV2ZW50IG5ldmVyLWVuZGluZyBsb29wXG5cdFx0XHRcdGlmICh0YXJnZXQgPT09IGNvcHkpIHtcblx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIFJlY3Vyc2UgaWYgd2UncmUgbWVyZ2luZyBwbGFpbiBvYmplY3RzIG9yIGFycmF5c1xuXHRcdFx0XHRpZiAoZGVlcCAmJiBjb3B5ICYmIChpc1BsYWluT2JqZWN0KGNvcHkpIHx8IChjb3B5SXNBcnJheSA9IEFycmF5LmlzQXJyYXkoY29weSkpKSkge1xuXHRcdFx0XHRcdGlmIChjb3B5SXNBcnJheSkge1xuXHRcdFx0XHRcdFx0Y29weUlzQXJyYXkgPSBmYWxzZTtcblx0XHRcdFx0XHRcdGNsb25lID0gc3JjICYmIEFycmF5LmlzQXJyYXkoc3JjKSA/IHNyYyA6IFtdO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRjbG9uZSA9IHNyYyAmJiBpc1BsYWluT2JqZWN0KHNyYykgPyBzcmMgOiB7fTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHQvLyBOZXZlciBtb3ZlIG9yaWdpbmFsIG9iamVjdHMsIGNsb25lIHRoZW1cblx0XHRcdFx0XHR0YXJnZXRbbmFtZV0gPSBleHRlbmQoZGVlcCwgY2xvbmUsIGNvcHkpO1xuXG5cdFx0XHRcdC8vIERvbid0IGJyaW5nIGluIHVuZGVmaW5lZCB2YWx1ZXNcblx0XHRcdFx0fSBlbHNlIGlmIChjb3B5ICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0XHR0YXJnZXRbbmFtZV0gPSBjb3B5O1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0Ly8gUmV0dXJuIHRoZSBtb2RpZmllZCBvYmplY3Rcblx0cmV0dXJuIHRhcmdldDtcbn07XG5cbiIsIm1vZHVsZS5leHBvcnRzID0gaW5oZXJpdHNcblxuZnVuY3Rpb24gaW5oZXJpdHMgKGMsIHAsIHByb3RvKSB7XG4gIHByb3RvID0gcHJvdG8gfHwge31cbiAgdmFyIGUgPSB7fVxuICA7W2MucHJvdG90eXBlLCBwcm90b10uZm9yRWFjaChmdW5jdGlvbiAocykge1xuICAgIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHMpLmZvckVhY2goZnVuY3Rpb24gKGspIHtcbiAgICAgIGVba10gPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHMsIGspXG4gICAgfSlcbiAgfSlcbiAgYy5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHAucHJvdG90eXBlLCBlKVxuICBjLnN1cGVyID0gcFxufVxuXG4vL2Z1bmN0aW9uIENoaWxkICgpIHtcbi8vICBDaGlsZC5zdXBlci5jYWxsKHRoaXMpXG4vLyAgY29uc29sZS5lcnJvcihbdGhpc1xuLy8gICAgICAgICAgICAgICAgLHRoaXMuY29uc3RydWN0b3Jcbi8vICAgICAgICAgICAgICAgICx0aGlzLmNvbnN0cnVjdG9yID09PSBDaGlsZFxuLy8gICAgICAgICAgICAgICAgLHRoaXMuY29uc3RydWN0b3Iuc3VwZXIgPT09IFBhcmVudFxuLy8gICAgICAgICAgICAgICAgLE9iamVjdC5nZXRQcm90b3R5cGVPZih0aGlzKSA9PT0gQ2hpbGQucHJvdG90eXBlXG4vLyAgICAgICAgICAgICAgICAsT2JqZWN0LmdldFByb3RvdHlwZU9mKE9iamVjdC5nZXRQcm90b3R5cGVPZih0aGlzKSlcbi8vICAgICAgICAgICAgICAgICA9PT0gUGFyZW50LnByb3RvdHlwZVxuLy8gICAgICAgICAgICAgICAgLHRoaXMgaW5zdGFuY2VvZiBDaGlsZFxuLy8gICAgICAgICAgICAgICAgLHRoaXMgaW5zdGFuY2VvZiBQYXJlbnRdKVxuLy99XG4vL2Z1bmN0aW9uIFBhcmVudCAoKSB7fVxuLy9pbmhlcml0cyhDaGlsZCwgUGFyZW50KVxuLy9uZXcgQ2hpbGRcbiIsIi8vIHNwcml0ZW1vZGVsLmpzXHJcbi8vIEEgcmVkdXggb2YgdGhlIFRIUkVFLmpzIHNwcml0ZSwgYnV0IG5vdCB1c2luZyB0aGUgc3ByaXRlIHBsdWdpblxyXG5cclxudmFyIGluaGVyaXRzID0gcmVxdWlyZShcImluaGVyaXRzXCIpO1xyXG52YXIgZXh0ZW5kID0gcmVxdWlyZShcImV4dGVuZFwiKTtcclxuXHJcbmZ1bmN0aW9uIENoYXJhY3RlclNwcml0ZShvcHRzKSB7XHJcblx0aWYgKCEodGhpcyBpbnN0YW5jZW9mIENoYXJhY3RlclNwcml0ZSkpIHtcclxuXHRcdHJldHVybiBuZXcgQ2hhcmFjdGVyU3ByaXRlKG9wdHMpO1xyXG5cdH1cclxuXHR2YXIgZ2MgPSBvcHRzLmdjIHx8IEdDLmdldEJpbigpO1xyXG5cdFxyXG5cdG9wdHMgPSBleHRlbmQoe1xyXG5cdFx0dHJhbnNwYXJlbnQ6IHRydWUsXHJcblx0XHRhbHBoYVRlc3Q6IHRydWUsXHJcblx0fSwgb3B0cyk7XHJcblx0XHJcblx0aWYgKCFvcHRzLm9mZnNldCkgb3B0cy5vZmZzZXQgPSBuZXcgVEhSRUUuVmVjdG9yMygwLCAwLCAwKTtcclxuXHRcclxuXHQvL1RPRE8gcmVwbGFjZSB3aXRoIGdlb21ldHJ5IHdlIGNhbiBjb250cm9sXHJcblx0Ly8gdmFyIGdlb20gPSBuZXcgVEhSRUUuUGxhbmVCdWZmZXJHZW9tZXRyeSgxLCAxKTtcclxuXHR2YXIgZ2VvbSA9IG5ldyBDaGFyYWN0ZXJQbGFuZUdlb21ldHJ5KG9wdHMub2Zmc2V0LngsIG9wdHMub2Zmc2V0LnksIG9wdHMub2Zmc2V0LnopO1xyXG5cdGdjLmNvbGxlY3QoZ2VvbSk7XHJcblx0XHJcblx0dmFyIG1hdCA9IG5ldyBDaGFyYWN0ZXJTcHJpdGVNYXRlcmlhbChvcHRzKTtcclxuXHRnYy5jb2xsZWN0KG1hdCk7XHJcblx0XHJcblx0VEhSRUUuTWVzaC5jYWxsKHRoaXMsIGdlb20sIG1hdCk7XHJcblx0dGhpcy50eXBlID0gXCJDaGFyYWN0ZXJTcHJpdGVcIjtcclxuXHRcclxuXHRtYXQuc2NhbGUgPSBtYXQudW5pZm9ybXMuc2NhbGUudmFsdWUgPSB0aGlzLnNjYWxlO1xyXG59XHJcbmluaGVyaXRzKENoYXJhY3RlclNwcml0ZSwgVEhSRUUuTWVzaCk7XHJcbm1vZHVsZS5leHBvcnRzLkNoYXJhY3RlclNwcml0ZSA9IENoYXJhY3RlclNwcml0ZTtcclxuXHJcblxyXG5mdW5jdGlvbiBDaGFyYWN0ZXJTcHJpdGVNYXRlcmlhbChvcHRzKSB7XHJcblx0aWYgKCEodGhpcyBpbnN0YW5jZW9mIENoYXJhY3RlclNwcml0ZU1hdGVyaWFsKSkge1xyXG5cdFx0cmV0dXJuIG5ldyBDaGFyYWN0ZXJTcHJpdGVNYXRlcmlhbChvcHRzKTtcclxuXHR9XHJcblx0XHJcblx0Ly9UT0RPIHdyaXRlIGl0IHNvIHdoZW4gd2UgcmVwbGFjZSB0aGUgdmFsdWVzIGhlcmUsIHdlIHJlcGxhY2UgdGhlIG9uZXMgaW4gdGhlIHVuaWZvcm1zXHJcblx0Ly8gT2JqZWN0LmRlZmluZVByb3BlcnRpZXModGhpcywge1xyXG5cdC8vIFx0dXZPZmZzZXQgOiB7fVxyXG5cdC8vIH0pO1xyXG5cclxuXHR0aGlzLm1hcCA9IG9wdHMubWFwIHx8IG5ldyBUSFJFRS5UZXh0dXJlKCk7XHJcblx0XHJcblx0dGhpcy51dk9mZnNldCA9IG9wdHMudXZPZmZzZXQgfHwgdGhpcy5tYXAub2Zmc2V0IHx8IG5ldyBUSFJFRS5WZWN0b3IyKDAsIDApO1xyXG5cdHRoaXMudXZTY2FsZSA9IG9wdHMudXZTY2FsZSB8fCB0aGlzLm1hcC5yZXBlYXQgfHwgbmV3IFRIUkVFLlZlY3RvcjIoMSwgMSk7XHJcblx0XHJcblx0dGhpcy5yb3RhdGlvbiA9IG9wdHMucm90YXRpb24gfHwgMDtcclxuXHR0aGlzLnNjYWxlID0gb3B0cy5zY2FsZSB8fCBuZXcgVEhSRUUuVmVjdG9yMigxLCAxKTtcclxuXHRcclxuXHR0aGlzLmNvbG9yID0gKG9wdHMuY29sb3IgaW5zdGFuY2VvZiBUSFJFRS5Db2xvcik/IG9wdHMuY29sb3IgOiBuZXcgVEhSRUUuQ29sb3Iob3B0cy5jb2xvcik7XHJcblx0dGhpcy5vcGFjaXR5ID0gb3B0cy5vcGFjaXR5IHx8IDE7XHJcblx0XHJcblx0dmFyIHBhcmFtcyA9IHRoaXMuX2NyZWF0ZU1hdFBhcmFtcyhvcHRzKTtcclxuXHRUSFJFRS5TaGFkZXJNYXRlcmlhbC5jYWxsKHRoaXMsIHBhcmFtcyk7XHJcblx0dGhpcy50eXBlID0gXCJDaGFyYWN0ZXJTcHJpdGVNYXRlcmlhbFwiO1xyXG5cdFxyXG5cdHRoaXMudHJhbnNwYXJlbnQgPSAob3B0cy50cmFuc3BhcmVudCAhPT0gdW5kZWZpbmVkKT8gb3B0cy50cmFuc3BhcmVudCA6IHRydWU7XHJcblx0dGhpcy5hbHBoYVRlc3QgPSAwLjA1O1xyXG5cdC8vIHRoaXMuZGVwdGhXcml0ZSA9IGZhbHNlO1xyXG59XHJcbmluaGVyaXRzKENoYXJhY3RlclNwcml0ZU1hdGVyaWFsLCBUSFJFRS5TaGFkZXJNYXRlcmlhbCk7XHJcbmV4dGVuZChDaGFyYWN0ZXJTcHJpdGVNYXRlcmlhbC5wcm90b3R5cGUsIHtcclxuXHRtYXAgOiBudWxsLFxyXG5cdFxyXG5cdF9jcmVhdGVNYXRQYXJhbXMgOiBmdW5jdGlvbigpIHtcclxuXHRcdHZhciBwYXJhbXMgPSB7XHJcblx0XHRcdHVuaWZvcm1zIDoge1xyXG5cdFx0XHRcdHV2T2Zmc2V0Olx0eyB0eXBlOiBcInYyXCIsIHZhbHVlOiB0aGlzLnV2T2Zmc2V0IH0sXHJcblx0XHRcdFx0dXZTY2FsZTpcdHsgdHlwZTogXCJ2MlwiLCB2YWx1ZTogdGhpcy51dlNjYWxlIH0sXHJcblx0XHRcdFx0XHJcblx0XHRcdFx0cm90YXRpb246XHR7IHR5cGU6IFwiZlwiLCB2YWx1ZTogdGhpcy5yb3RhdGlvbiB9LFxyXG5cdFx0XHRcdHNjYWxlOlx0XHR7IHR5cGU6IFwidjJcIiwgdmFsdWU6IHRoaXMuc2NhbGUgfSxcclxuXHRcdFx0XHRcclxuXHRcdFx0XHRjb2xvcjpcdFx0eyB0eXBlOiBcImNcIiwgdmFsdWU6IHRoaXMuY29sb3IgfSxcclxuXHRcdFx0XHRtYXA6XHRcdHsgdHlwZTogXCJ0XCIsIHZhbHVlOiB0aGlzLm1hcCB9LFxyXG5cdFx0XHRcdG9wYWNpdHk6XHR7IHR5cGU6IFwiZlwiLCB2YWx1ZTogdGhpcy5vcGFjaXR5IH0sXHJcblx0XHRcdH0sXHJcblx0XHR9O1xyXG5cdFx0XHJcblx0XHRwYXJhbXMudmVydGV4U2hhZGVyID0gVkVSVF9TSEFERVI7XHJcblx0XHRwYXJhbXMuZnJhZ21lbnRTaGFkZXIgPSBGUkFHX1NIQURFUjtcclxuXHRcdHJldHVybiBwYXJhbXM7XHJcblx0fSxcclxufSk7XHJcbm1vZHVsZS5leHBvcnRzLkNoYXJhY3RlclNwcml0ZU1hdGVyaWFsID0gQ2hhcmFjdGVyU3ByaXRlTWF0ZXJpYWw7XHJcblxyXG5cclxuXHJcbmZ1bmN0aW9uIENoYXJhY3RlclBsYW5lR2VvbWV0cnkoeG9mZiwgeW9mZiwgem9mZikge1xyXG5cdFRIUkVFLkJ1ZmZlckdlb21ldHJ5LmNhbGwodGhpcyk7XHJcblx0XHJcblx0dGhpcy50eXBlID0gXCJDaGFyYWN0ZXJQbGFuZUdlb21ldHJ5XCI7XHJcblx0XHJcblx0dmFyIHZlcnRzID0gbmV3IEZsb2F0MzJBcnJheShbXHJcblx0XHQtMC41ICsgeG9mZiwgLTAuNSArIHlvZmYsIDAgKyB6b2ZmLFxyXG5cdFx0IDAuNSArIHhvZmYsIC0wLjUgKyB5b2ZmLCAwICsgem9mZixcclxuXHRcdCAwLjUgKyB4b2ZmLCAgMC41ICsgeW9mZiwgMCArIHpvZmYsXHJcblx0XHQtMC41ICsgeG9mZiwgIDAuNSArIHlvZmYsIDAgKyB6b2ZmLFxyXG5cdF0pO1xyXG5cdHZhciBub3JtcyA9IG5ldyBGbG9hdDMyQXJyYXkoWyAwLCAxLCAxLCAgIDAsIDAsIDEsICAgMCwgMCwgMSwgICAwLCAwLCAxLCBdKTtcclxuXHR2YXIgdXZzICAgPSBuZXcgRmxvYXQzMkFycmF5KFsgMCwgMCwgICAgICAxLCAwLCAgICAgIDEsIDEsICAgICAgMCwgMSwgXSk7XHJcblx0dmFyIGZhY2VzID0gbmV3IFVpbnQxNkFycmF5KCBbIDAsIDEsIDIsICAgMCwgMiwgMyBdKTtcclxuXHRcclxuXHR0aGlzLmFkZEF0dHJpYnV0ZSggJ2luZGV4JywgbmV3IFRIUkVFLkJ1ZmZlckF0dHJpYnV0ZSggZmFjZXMsIDEgKSApO1xyXG5cdHRoaXMuYWRkQXR0cmlidXRlKCAncG9zaXRpb24nLCBuZXcgVEhSRUUuQnVmZmVyQXR0cmlidXRlKCB2ZXJ0cywgMyApICk7XHJcblx0dGhpcy5hZGRBdHRyaWJ1dGUoICdub3JtYWwnLCBuZXcgVEhSRUUuQnVmZmVyQXR0cmlidXRlKCBub3JtcywgMyApICk7XHJcblx0dGhpcy5hZGRBdHRyaWJ1dGUoICd1dicsIG5ldyBUSFJFRS5CdWZmZXJBdHRyaWJ1dGUoIHV2cywgMiApICk7XHJcblx0XHJcbn1cclxuaW5oZXJpdHMoQ2hhcmFjdGVyUGxhbmVHZW9tZXRyeSwgVEhSRUUuQnVmZmVyR2VvbWV0cnkpO1xyXG5cclxuXHJcblxyXG5cclxudmFyIFZFUlRfU0hBREVSID0gW1xyXG5cdC8vICd1bmlmb3JtIG1hdDQgbW9kZWxWaWV3TWF0cml4OycsXHJcblx0Ly8gJ3VuaWZvcm0gbWF0NCBwcm9qZWN0aW9uTWF0cml4OycsXHJcblx0J3VuaWZvcm0gZmxvYXQgcm90YXRpb247JyxcclxuXHQndW5pZm9ybSB2ZWMyIHNjYWxlOycsXHJcblx0J3VuaWZvcm0gdmVjMiB1dk9mZnNldDsnLFxyXG5cdCd1bmlmb3JtIHZlYzIgdXZTY2FsZTsnLFxyXG5cclxuXHQvLyAnYXR0cmlidXRlIHZlYzIgcG9zaXRpb247JyxcclxuXHQvLyAnYXR0cmlidXRlIHZlYzIgdXY7JyxcclxuXHJcblx0J3ZhcnlpbmcgdmVjMiB2VVY7JyxcclxuXHJcblx0J3ZvaWQgbWFpbigpIHsnLFxyXG5cclxuXHRcdCd2VVYgPSB1dk9mZnNldCArIHV2ICogdXZTY2FsZTsnLFxyXG5cclxuXHRcdCd2ZWMyIGFsaWduZWRQb3NpdGlvbiA9IHBvc2l0aW9uLnh5ICogc2NhbGU7JyxcclxuXHJcblx0XHQndmVjMiByb3RhdGVkUG9zaXRpb247JyxcclxuXHRcdCdyb3RhdGVkUG9zaXRpb24ueCA9IGNvcyggcm90YXRpb24gKSAqIGFsaWduZWRQb3NpdGlvbi54IC0gc2luKCByb3RhdGlvbiApICogYWxpZ25lZFBvc2l0aW9uLnk7JyxcclxuXHRcdCdyb3RhdGVkUG9zaXRpb24ueSA9IHNpbiggcm90YXRpb24gKSAqIGFsaWduZWRQb3NpdGlvbi54ICsgY29zKCByb3RhdGlvbiApICogYWxpZ25lZFBvc2l0aW9uLnk7JyxcclxuXHJcblx0XHQndmVjNCBmaW5hbFBvc2l0aW9uOycsXHJcblxyXG5cdFx0J2ZpbmFsUG9zaXRpb24gPSBtb2RlbFZpZXdNYXRyaXggKiB2ZWM0KCAwLjAsIDAuMCwgMC4wLCAxLjAgKTsnLFxyXG5cdFx0J2ZpbmFsUG9zaXRpb24ueHkgKz0gcm90YXRlZFBvc2l0aW9uOycsXHJcblx0XHQvLyAnZmluYWxQb3NpdGlvbi56ICs9IHBvc2l0aW9uLno7JyxcclxuXHRcdCdmaW5hbFBvc2l0aW9uID0gcHJvamVjdGlvbk1hdHJpeCAqIGZpbmFsUG9zaXRpb247JyxcclxuXHRcdFxyXG5cdFx0J2dsX1Bvc2l0aW9uID0gZmluYWxQb3NpdGlvbjsnLFxyXG5cclxuXHQnfSdcclxuXS5qb2luKCAnXFxuJyApO1xyXG5cclxudmFyIEZSQUdfU0hBREVSID0gW1xyXG5cdCd1bmlmb3JtIHZlYzMgY29sb3I7JyxcclxuXHQndW5pZm9ybSBzYW1wbGVyMkQgbWFwOycsXHJcblx0J3VuaWZvcm0gZmxvYXQgb3BhY2l0eTsnLFxyXG5cclxuXHQndW5pZm9ybSB2ZWMzIGZvZ0NvbG9yOycsXHJcblx0J3VuaWZvcm0gZmxvYXQgZm9nRGVuc2l0eTsnLFxyXG5cdCd1bmlmb3JtIGZsb2F0IGZvZ05lYXI7JyxcclxuXHQndW5pZm9ybSBmbG9hdCBmb2dGYXI7JyxcclxuXHJcblx0J3ZhcnlpbmcgdmVjMiB2VVY7JyxcclxuXHJcblx0J3ZvaWQgbWFpbigpIHsnLFxyXG5cclxuXHRcdCd2ZWM0IHRleHR1cmUgPSB0ZXh0dXJlMkQoIG1hcCwgdlVWICk7JyxcclxuXHJcblx0XHQnI2lmZGVmIEFMUEhBVEVTVCcsXHJcblx0XHRcdCdpZiAoIHRleHR1cmUuYSA8IEFMUEhBVEVTVCApIGRpc2NhcmQ7JyxcclxuXHRcdCcjZW5kaWYnLFxyXG5cclxuXHRcdCdnbF9GcmFnQ29sb3IgPSB2ZWM0KCBjb2xvciAqIHRleHR1cmUueHl6LCB0ZXh0dXJlLmEgKiBvcGFjaXR5ICk7JyxcclxuXHJcblx0XHQnI2lmZGVmIFVTRV9GT0cnLFxyXG5cdFx0XHQnZmxvYXQgZGVwdGggPSBnbF9GcmFnQ29vcmQueiAvIGdsX0ZyYWdDb29yZC53OycsXHJcblx0XHRcdCdmbG9hdCBmb2dGYWN0b3IgPSAwLjA7JyxcclxuXHRcdFx0XHJcblx0XHRcdCcjaWZuZGVmIEZPR19FWFAyJywgLy9ub3RlOiBOT1QgZGVmaW5lZFxyXG5cdFx0XHRcclxuXHRcdFx0XHQnZm9nRmFjdG9yID0gc21vb3Roc3RlcCggZm9nTmVhciwgZm9nRmFyLCBkZXB0aCApOycsXHJcblx0XHRcdFx0XHJcblx0XHRcdCcjZWxzZScsXHJcblx0XHRcdFxyXG5cdFx0XHRcdCdjb25zdCBmbG9hdCBMT0cyID0gMS40NDI2OTU7JyxcclxuXHRcdFx0XHQnZmxvYXQgZm9nRmFjdG9yID0gZXhwMiggLSBmb2dEZW5zaXR5ICogZm9nRGVuc2l0eSAqIGRlcHRoICogZGVwdGggKiBMT0cyICk7JyxcclxuXHRcdFx0XHQnZm9nRmFjdG9yID0gMS4wIC0gY2xhbXAoIGZvZ0ZhY3RvciwgMC4wLCAxLjAgKTsnLFxyXG5cclxuXHRcdFx0JyNlbmRpZicsXHJcblx0XHRcdFxyXG5cdFx0XHQnZ2xfRnJhZ0NvbG9yID0gbWl4KCBnbF9GcmFnQ29sb3IsIHZlYzQoIGZvZ0NvbG9yLCBnbF9GcmFnQ29sb3IudyApLCBmb2dGYWN0b3IgKTsnLFxyXG5cclxuXHRcdCcjZW5kaWYnLFxyXG5cclxuXHQnfSdcclxuXS5qb2luKCAnXFxuJyApXHJcblxyXG5cclxuXHJcblxyXG4vKlxyXG52YXIgaW5kaWNlcyA9IG5ldyBVaW50MTZBcnJheSggWyAwLCAxLCAyLCAgMCwgMiwgMyBdICk7XHJcbnZhciB2ZXJ0aWNlcyA9IG5ldyBGbG9hdDMyQXJyYXkoIFsgLSAwLjUsIC0gMC41LCAwLCAgIDAuNSwgLSAwLjUsIDAsICAgMC41LCAwLjUsIDAsICAgLSAwLjUsIDAuNSwgMCBdICk7XHJcbnZhciB1dnMgPSBuZXcgRmxvYXQzMkFycmF5KCBbIDAsIDAsICAgMSwgMCwgICAxLCAxLCAgIDAsIDEgXSApO1xyXG5cclxudmFyIGdlb21ldHJ5ID0gbmV3IFRIUkVFLkJ1ZmZlckdlb21ldHJ5KCk7XHJcbmdlb21ldHJ5LmFkZEF0dHJpYnV0ZSggJ2luZGV4JywgbmV3IFRIUkVFLkJ1ZmZlckF0dHJpYnV0ZSggaW5kaWNlcywgMSApICk7XHJcbmdlb21ldHJ5LmFkZEF0dHJpYnV0ZSggJ3Bvc2l0aW9uJywgbmV3IFRIUkVFLkJ1ZmZlckF0dHJpYnV0ZSggdmVydGljZXMsIDMgKSApO1xyXG5nZW9tZXRyeS5hZGRBdHRyaWJ1dGUoICd1dicsIG5ldyBUSFJFRS5CdWZmZXJBdHRyaWJ1dGUoIHV2cywgMiApICk7XHJcblxyXG5cclxuZnVuY3Rpb24gU3ByaXRlQ2hhcmFjdGVyKG1hdGVyaWFsKSB7XHJcblx0VEhSRUUuT2JqZWN0M0QuY2FsbCggdGhpcyApO1xyXG5cclxuXHR0aGlzLnR5cGUgPSAnU3ByaXRlQ2hhcmFjdGVyJztcclxuXHJcblx0dGhpcy5nZW9tZXRyeSA9IGdlb21ldHJ5O1xyXG5cdHRoaXMubWF0ZXJpYWwgPSAoIG1hdGVyaWFsICE9PSB1bmRlZmluZWQgKSA/IG1hdGVyaWFsIDogbmV3IFRIUkVFLlNwcml0ZU1hdGVyaWFsKCk7XHJcblxyXG59XHJcblxyXG5TcHJpdGVDaGFyYWN0ZXIucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZSggVEhSRUUuT2JqZWN0M0QucHJvdG90eXBlICk7XHJcblxyXG5TcHJpdGVDaGFyYWN0ZXIucHJvdG90eXBlLnJheWNhc3QgPSAoIGZ1bmN0aW9uICgpIHtcclxuXHR2YXIgbWF0cml4UG9zaXRpb24gPSBuZXcgVEhSRUUuVmVjdG9yMygpO1xyXG5cclxuXHRyZXR1cm4gZnVuY3Rpb24gKCByYXljYXN0ZXIsIGludGVyc2VjdHMgKSB7XHJcblx0XHRtYXRyaXhQb3NpdGlvbi5zZXRGcm9tTWF0cml4UG9zaXRpb24oIHRoaXMubWF0cml4V29ybGQgKTtcclxuXHJcblx0XHR2YXIgZGlzdGFuY2UgPSByYXljYXN0ZXIucmF5LmRpc3RhbmNlVG9Qb2ludCggbWF0cml4UG9zaXRpb24gKTtcclxuXHRcdGlmICggZGlzdGFuY2UgPiB0aGlzLnNjYWxlLnggKSByZXR1cm47XHJcblxyXG5cdFx0aW50ZXJzZWN0cy5wdXNoKCB7XHJcblx0XHRcdGRpc3RhbmNlOiBkaXN0YW5jZSxcclxuXHRcdFx0cG9pbnQ6IHRoaXMucG9zaXRpb24sXHJcblx0XHRcdGZhY2U6IG51bGwsXHJcblx0XHRcdG9iamVjdDogdGhpc1xyXG5cdFx0fSApO1xyXG5cdH07XHJcbn0oKSApO1xyXG5cclxuXHJcblNwcml0ZUNoYXJhY3Rlci5wcm90b3R5cGUuY2xvbmUgPSBmdW5jdGlvbiAoIG9iamVjdCApIHtcclxuXHRpZiAoIG9iamVjdCA9PT0gdW5kZWZpbmVkICkgXHJcblx0XHRvYmplY3QgPSBuZXcgU3ByaXRlQ2hhcmFjdGVyKCB0aGlzLm1hdGVyaWFsICk7XHJcblx0VEhSRUUuT2JqZWN0M0QucHJvdG90eXBlLmNsb25lLmNhbGwoIHRoaXMsIG9iamVjdCApO1xyXG5cdHJldHVybiBvYmplY3Q7XHJcblxyXG59OyovIiwiLy8gYWN0b3JfYW5pbWF0aW9ucy5qc1xyXG4vLyBBIHN1Ym1vZHVsZSBmb3IgdGhlIEFjdG9yIGV2ZW50IGNsYXNzIHRoYXQgZGVhbHMgd2l0aCBhbmltYXRpb25zXHJcblxyXG52YXIgZXh0ZW5kID0gcmVxdWlyZShcImV4dGVuZFwiKTtcclxuXHJcbmZ1bmN0aW9uIGdldFNwcml0ZUZvcm1hdChzdHIpIHtcclxuXHR2YXIgZm9ybWF0ID0gc3RyLnNwbGl0KFwiLVwiKTtcclxuXHR2YXIgbmFtZSA9IGZvcm1hdFswXTtcclxuXHR2YXIgc2l6ZSA9IGZvcm1hdFsxXS5zcGxpdChcInhcIik7XHJcblx0c2l6ZVsxXSA9IHNpemVbMV0gfHwgc2l6ZVswXTtcclxuXHRcclxuXHR2YXIgYmFzZSA9IHtcclxuXHRcdHdpZHRoOiBzaXplWzBdLCBoZWlnaHQ6IHNpemVbMV0sIGZsaXA6IGZhbHNlLCBcclxuXHRcdC8vcmVwZWF0eDogMC4yNSwgcmVwZWF0eTogMC4yNSxcclxuXHRcdGZyYW1lczoge1xyXG5cdFx0XHRcInUzXCI6IFwidTBcIiwgXCJkM1wiOiBcImQwXCIsIFwibDNcIjogXCJsMFwiLCBcInIzXCI6IFwicjBcIixcclxuXHRcdH0sXHJcblx0XHRhbmltcyA6IGdldFN0YW5kYXJkQW5pbWF0aW9ucygpLFxyXG5cdH07XHJcblx0XHJcblx0c3dpdGNoIChuYW1lKSB7XHJcblx0XHRjYXNlIFwicHRfaG9yenJvd1wiOiBcclxuXHRcdFx0cmV0dXJuIGV4dGVuZCh0cnVlLCBiYXNlLCB7IFxyXG5cdFx0XHRcdGZyYW1lczoge1xyXG5cdFx0XHRcdFx0XCJ1MFwiOiBbMSwgMF0sIFwidTFcIjogWzEsIDFdLCBcInUyXCI6IFsxLCAyXSxcclxuXHRcdFx0XHRcdFwiZDBcIjogWzAsIDBdLCBcImQxXCI6IFswLCAxXSwgXCJkMlwiOiBbMCwgMl0sXHJcblx0XHRcdFx0XHRcImwwXCI6IFsyLCAwXSwgXCJsMVwiOiBbMiwgMV0sIFwibDJcIjogWzIsIDJdLFxyXG5cdFx0XHRcdFx0XCJyMFwiOiBbMywgMF0sIFwicjFcIjogWzMsIDFdLCBcInIyXCI6IFszLCAyXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9KTtcclxuXHRcdGNhc2UgXCJwdF92ZXJ0Y29sXCI6IFxyXG5cdFx0XHRyZXR1cm4gZXh0ZW5kKHRydWUsIGJhc2UsIHsgXHJcblx0XHRcdFx0ZnJhbWVzOiB7XHJcblx0XHRcdFx0XHRcInUwXCI6IFswLCAxXSwgXCJ1MVwiOiBbMSwgMV0sIFwidTJcIjogWzIsIDFdLFxyXG5cdFx0XHRcdFx0XCJkMFwiOiBbMCwgMF0sIFwiZDFcIjogWzEsIDBdLCBcImQyXCI6IFsyLCAwXSxcclxuXHRcdFx0XHRcdFwibDBcIjogWzAsIDJdLCBcImwxXCI6IFsxLCAyXSwgXCJsMlwiOiBbMiwgMl0sXHJcblx0XHRcdFx0XHRcInIwXCI6IFswLCAzXSwgXCJyMVwiOiBbMSwgM10sIFwicjJcIjogWzIsIDNdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH0pO1xyXG5cdFx0Y2FzZSBcImhnX3ZlcnRtaXhcIjogXHJcblx0XHRcdHJldHVybiBleHRlbmQodHJ1ZSwgYmFzZSwgeyBcclxuXHRcdFx0XHRmcmFtZXM6IHtcclxuXHRcdFx0XHRcdFwidTBcIjogWzAsIDBdLCBcInUxXCI6IFsxLCAzXSwgXCJ1MlwiOiBbMiwgMF0sXHJcblx0XHRcdFx0XHRcImQwXCI6IFsyLCAxXSwgXCJkMVwiOiBbMiwgMl0sIFwiZDJcIjogWzIsIDNdLFxyXG5cdFx0XHRcdFx0XCJsMFwiOiBbMCwgMl0sIFwibDFcIjogWzAsIDFdLCBcImwyXCI6IFswLCAzXSxcclxuXHRcdFx0XHRcdFwicjBcIjogWzEsIDBdLCBcInIxXCI6IFsxLCAxXSwgXCJyMlwiOiBbMSwgMl0sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fSk7XHJcblx0XHRjYXNlIFwiaGdfcG9rZXJvd1wiOlxyXG5cdFx0XHRyZXR1cm4gZXh0ZW5kKHRydWUsIGJhc2UsIHsgXHJcblx0XHRcdFx0ZnJhbWVzOiB7IC8vIHBvaW50ZXJzIHRvIGFub3RoZXIgaW1hZ2UgaW5kaWNhdGVzIHRoYXQgaW1hZ2Ugc2hvdWxkIGJlIGZsaXBwZWQsIGlmIGZsaXA9dHJ1ZVxyXG5cdFx0XHRcdFx0XCJ1MFwiOiBudWxsLCBcInUxXCI6IFswLCAwXSwgXCJ1MlwiOiBbMSwgMF0sXHJcblx0XHRcdFx0XHRcImQwXCI6IG51bGwsIFwiZDFcIjogWzAsIDFdLCBcImQyXCI6IFsxLCAxXSxcclxuXHRcdFx0XHRcdFwibDBcIjogbnVsbCwgXCJsMVwiOiBbMCwgMl0sIFwibDJcIjogWzEsIDJdLFxyXG5cdFx0XHRcdFx0XCJyMFwiOiBudWxsLCBcInIxXCI6IFswLCAzXSwgXCJyMlwiOiBbMSwgM10sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRhbmltczogZ2V0UG9rZW1vbkFuaW1hdGlvbnMoKSxcclxuXHRcdFx0fSk7XHJcblx0XHRjYXNlIFwiaGdfcG9rZXJvd19yZXZlcnNlXCI6XHJcblx0XHRcdHJldHVybiBleHRlbmQodHJ1ZSwgYmFzZSwgeyBcclxuXHRcdFx0XHRmcmFtZXM6IHsgLy8gcG9pbnRlcnMgdG8gYW5vdGhlciBpbWFnZSBpbmRpY2F0ZXMgdGhhdCBpbWFnZSBzaG91bGQgYmUgZmxpcHBlZCwgaWYgZmxpcD10cnVlXHJcblx0XHRcdFx0XHRcInUwXCI6IG51bGwsIFwidTFcIjogWzAsIDFdLCBcInUyXCI6IFsxLCAxXSxcclxuXHRcdFx0XHRcdFwiZDBcIjogbnVsbCwgXCJkMVwiOiBbMCwgMF0sIFwiZDJcIjogWzEsIDBdLFxyXG5cdFx0XHRcdFx0XCJsMFwiOiBudWxsLCBcImwxXCI6IFswLCAzXSwgXCJsMlwiOiBbMSwgM10sXHJcblx0XHRcdFx0XHRcInIwXCI6IG51bGwsIFwicjFcIjogWzAsIDJdLCBcInIyXCI6IFsxLCAyXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdGFuaW1zOiBnZXRQb2tlbW9uQW5pbWF0aW9ucygpLFxyXG5cdFx0XHR9KTtcclxuXHRcdGNhc2UgXCJoZ19wb2tlY29sXCI6XHJcblx0XHRcdHJldHVybiBleHRlbmQodHJ1ZSwgYmFzZSwgeyBcclxuXHRcdFx0XHRmcmFtZXM6IHsgLy8gcG9pbnRlcnMgdG8gYW5vdGhlciBpbWFnZSBpbmRpY2F0ZXMgdGhhdCBpbWFnZSBzaG91bGQgYmUgZmxpcHBlZCwgaWYgZmxpcD10cnVlXHJcblx0XHRcdFx0XHRcInUwXCI6IG51bGwsIFwidTFcIjogWzAsIDBdLCBcInUyXCI6IFswLCAxXSxcclxuXHRcdFx0XHRcdFwiZDBcIjogbnVsbCwgXCJkMVwiOiBbMCwgMl0sIFwiZDJcIjogWzAsIDNdLFxyXG5cdFx0XHRcdFx0XCJsMFwiOiBudWxsLCBcImwxXCI6IFsxLCAwXSwgXCJsMlwiOiBbMSwgMV0sXHJcblx0XHRcdFx0XHRcInIwXCI6IG51bGwsIFwicjFcIjogWzEsIDJdLCBcInIyXCI6IFsxLCAzXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdGFuaW1zOiBnZXRQb2tlbW9uQW5pbWF0aW9ucygpLFxyXG5cdFx0XHR9KTtcclxuXHRcdGNhc2UgXCJoZ19wb2tlX2hvcnpjb2xcIjpcclxuXHRcdFx0cmV0dXJuIGV4dGVuZCh0cnVlLCBiYXNlLCB7IFxyXG5cdFx0XHRcdGZyYW1lczogeyAvLyBwb2ludGVycyB0byBhbm90aGVyIGltYWdlIGluZGljYXRlcyB0aGF0IGltYWdlIHNob3VsZCBiZSBmbGlwcGVkLCBpZiBmbGlwPXRydWVcclxuXHRcdFx0XHRcdFwidTBcIjogbnVsbCwgXCJ1MVwiOiBbMSwgMF0sIFwidTJcIjogWzEsIDFdLFxyXG5cdFx0XHRcdFx0XCJkMFwiOiBudWxsLCBcImQxXCI6IFswLCAwXSwgXCJkMlwiOiBbMCwgMV0sXHJcblx0XHRcdFx0XHRcImwwXCI6IG51bGwsIFwibDFcIjogWzIsIDBdLCBcImwyXCI6IFsyLCAxXSxcclxuXHRcdFx0XHRcdFwicjBcIjogbnVsbCwgXCJyMVwiOiBbMywgMF0sIFwicjJcIjogWzMsIDFdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0YW5pbXM6IGdldFBva2Vtb25BbmltYXRpb25zKCksXHJcblx0XHRcdH0pO1xyXG5cdFx0Y2FzZSBcImhnX3Bva2VmbGlwXCI6XHJcblx0XHRcdHJldHVybiBleHRlbmQodHJ1ZSwgYmFzZSwgeyBcclxuXHRcdFx0XHRmcmFtZXM6IHsgLy8gcG9pbnRlcnMgdG8gYW5vdGhlciBpbWFnZSBpbmRpY2F0ZXMgdGhhdCBpbWFnZSBzaG91bGQgYmUgZmxpcHBlZCwgaWYgZmxpcD10cnVlXHJcblx0XHRcdFx0XHRcInUwXCI6IG51bGwsIFwidTFcIjogWzAsIDBdLCBcInUyXCI6IFsxLCAwXSxcclxuXHRcdFx0XHRcdFwiZDBcIjogbnVsbCwgXCJkMVwiOiBbMCwgMV0sIFwiZDJcIjogWzEsIDFdLFxyXG5cdFx0XHRcdFx0XCJsMFwiOiBudWxsLCBcImwxXCI6IFswLCAyXSwgXCJsMlwiOiBbMSwgMl0sXHJcblx0XHRcdFx0XHRcInIwXCI6IG51bGwsIFwicjFcIjogXCJsMVwiLCAgIFwicjJcIjogXCJsMlwiLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0YW5pbXM6IGdldFBva2Vtb25BbmltYXRpb25zKCksXHJcblx0XHRcdH0pO1xyXG5cdFx0Y2FzZSBcImJ3X3ZlcnRyb3dcIjpcclxuXHRcdFx0cmV0dXJuIGV4dGVuZCh0cnVlLCBiYXNlLCB7IFxyXG5cdFx0XHRcdGZyYW1lczoge1xyXG5cdFx0XHRcdFx0XCJ1MFwiOiBbMCwgMF0sIFwidTFcIjogWzEsIDBdLCBcInUyXCI6IFsyLCAwXSxcclxuXHRcdFx0XHRcdFwiZDBcIjogWzAsIDFdLCBcImQxXCI6IFsxLCAxXSwgXCJkMlwiOiBbMiwgMV0sXHJcblx0XHRcdFx0XHRcImwwXCI6IFswLCAyXSwgXCJsMVwiOiBbMSwgMl0sIFwibDJcIjogWzIsIDJdLFxyXG5cdFx0XHRcdFx0XCJyMFwiOiBbMCwgM10sIFwicjFcIjogWzEsIDNdLCBcInIyXCI6IFsyLCAzXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9KTtcclxuXHRcdGNhc2UgXCJid19ob3J6ZmxpcFwiOlxyXG5cdFx0XHRyZXR1cm4gZXh0ZW5kKHRydWUsIGJhc2UsIHsgXHJcblx0XHRcdFx0ZnJhbWVzOiB7IC8vIHBvaW50ZXJzIHRvIGFub3RoZXIgaW1hZ2UgaW5kaWNhdGVzIHRoYXQgaW1hZ2Ugc2hvdWxkIGJlIGZsaXBwZWQsIGlmIGZsaXA9dHJ1ZVxyXG5cdFx0XHRcdFx0XCJ1MFwiOiBbMCwgMF0sIFwidTFcIjogWzEsIDBdLCBcInUyXCI6IFwidTFcIixcclxuXHRcdFx0XHRcdFwiZDBcIjogWzIsIDBdLCBcImQxXCI6IFszLCAwXSwgXCJkMlwiOiBcImQxXCIsXHJcblx0XHRcdFx0XHRcImwwXCI6IFswLCAxXSwgXCJsMVwiOiBbMSwgMV0sIFwibDJcIjogWzIsIDFdLFxyXG5cdFx0XHRcdFx0XCJyMFwiOiBcImwwXCIsICAgXCJyMVwiOiBcImwxXCIsICAgXCJyMlwiOiBcImwyXCIsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fSk7XHJcblx0XHRkZWZhdWx0OlxyXG5cdFx0XHRjb25zb2xlLmVycm9yKFwiTm8gc3VjaCBTcHJpdGUgRm9ybWF0OlwiLCBuYW1lKTtcclxuXHRcdFx0cmV0dXJuIHt9O1xyXG5cdH1cclxufVxyXG5tb2R1bGUuZXhwb3J0cy5nZXRTcHJpdGVGb3JtYXQgPSBnZXRTcHJpdGVGb3JtYXQ7XHJcblxyXG5cclxuZnVuY3Rpb24gZ2V0U3RhbmRhcmRBbmltYXRpb25zKCkge1xyXG5cdHZhciBhbmltcyA9IHt9O1xyXG5cdFxyXG5cdGFuaW1zW1wic3RhbmRcIl0gPSBuZXcgU3ByaXRlQW5pbWF0aW9uKHsgc2luZ2xlRnJhbWU6IHRydWUsIH0sIFtcclxuXHRcdHsgdTogXCJ1MFwiLCBkOiBcImQwXCIsIGw6IFwibDBcIiwgcjogXCJyMFwiLCB0cmFuczogdHJ1ZSwgcGF1c2U6IHRydWUsIH0sXHJcblx0XSk7XHJcblx0YW5pbXNbXCJ3YWxrXCJdID0gbmV3IFNwcml0ZUFuaW1hdGlvbih7IGZyYW1lTGVuZ3RoOiA1LCBrZWVwRnJhbWU6IHRydWUsIH0sIFtcclxuXHRcdHsgdTogXCJ1MVwiLCBkOiBcImQxXCIsIGw6IFwibDFcIiwgcjogXCJyMVwiLCB9LFxyXG5cdFx0eyB1OiBcInUzXCIsIGQ6IFwiZDNcIiwgbDogXCJsM1wiLCByOiBcInIzXCIsIHRyYW5zOiB0cnVlLCB9LFxyXG5cdFx0eyB1OiBcInUyXCIsIGQ6IFwiZDJcIiwgbDogXCJsMlwiLCByOiBcInIyXCIsIH0sXHJcblx0XHR7IHU6IFwidTNcIiwgZDogXCJkM1wiLCBsOiBcImwzXCIsIHI6IFwicjNcIiwgdHJhbnM6IHRydWUsIGxvb3BUbzogMCwgfSxcclxuXHRdKTtcclxuXHRhbmltc1tcImJ1bXBcIl0gPSBuZXcgU3ByaXRlQW5pbWF0aW9uKHsgZnJhbWVMZW5ndGg6IDEwLCBrZWVwRnJhbWU6IHRydWUsIH0sIFtcclxuXHRcdHsgdTogXCJ1MVwiLCBkOiBcImQxXCIsIGw6IFwibDFcIiwgcjogXCJyMVwiLCBzZng6IFwid2Fsa19idW1wXCIsIH0sXHJcblx0XHR7IHU6IFwidTBcIiwgZDogXCJkMFwiLCBsOiBcImwwXCIsIHI6IFwicjBcIiwgdHJhbnM6IHRydWUsIH0sXHJcblx0XHR7IHU6IFwidTJcIiwgZDogXCJkMlwiLCBsOiBcImwyXCIsIHI6IFwicjJcIiwgc2Z4OiBcIndhbGtfYnVtcFwiLCB9LFxyXG5cdFx0eyB1OiBcInUwXCIsIGQ6IFwiZDBcIiwgbDogXCJsMFwiLCByOiBcInIwXCIsIHRyYW5zOiB0cnVlLCBsb29wVG86IDAsIH0sXHJcblx0XSk7XHJcblx0YW5pbXNbXCJ3YXJwX2F3YXlcIl0gPSBuZXcgU3ByaXRlQW5pbWF0aW9uKHsgc2luZ2xlRGlyOiBcImRcIiB9LCBbXHJcblx0XHR7IGQ6IFwiZDBcIiwgZnJhbWVMZW5ndGg6IDgsIH0sIC8vMFxyXG5cdFx0eyBkOiBcImwwXCIsIGZyYW1lTGVuZ3RoOiA4LCB9LFxyXG5cdFx0eyBkOiBcInUwXCIsIGZyYW1lTGVuZ3RoOiA4LCB9LFxyXG5cdFx0eyBkOiBcInIwXCIsIGZyYW1lTGVuZ3RoOiA4LCB9LFxyXG5cdFx0eyBkOiBcImQwXCIsIGZyYW1lTGVuZ3RoOiA3LCB9LCAvLzRcclxuXHRcdHsgZDogXCJsMFwiLCBmcmFtZUxlbmd0aDogNywgfSxcclxuXHRcdHsgZDogXCJ1MFwiLCBmcmFtZUxlbmd0aDogNywgfSxcclxuXHRcdHsgZDogXCJyMFwiLCBmcmFtZUxlbmd0aDogNywgfSxcclxuXHRcdHsgZDogXCJkMFwiLCBmcmFtZUxlbmd0aDogNSwgfSwgLy84XHJcblx0XHR7IGQ6IFwibDBcIiwgZnJhbWVMZW5ndGg6IDUsIH0sXHJcblx0XHR7IGQ6IFwidTBcIiwgZnJhbWVMZW5ndGg6IDUsIH0sXHJcblx0XHR7IGQ6IFwicjBcIiwgZnJhbWVMZW5ndGg6IDUsIH0sXHJcblx0XHR7IGQ6IFwiZDBcIiwgZnJhbWVMZW5ndGg6IDMsIH0sIC8vMTJcclxuXHRcdHsgZDogXCJsMFwiLCBmcmFtZUxlbmd0aDogMywgfSxcclxuXHRcdHsgZDogXCJ1MFwiLCBmcmFtZUxlbmd0aDogMywgfSxcclxuXHRcdHsgZDogXCJyMFwiLCBmcmFtZUxlbmd0aDogMywgfSxcclxuXHRcdHsgZDogXCJkMFwiLCBmcmFtZUxlbmd0aDogMSwgfSwgLy8xNlxyXG5cdFx0eyBkOiBcImwwXCIsIGZyYW1lTGVuZ3RoOiAxLCB9LFxyXG5cdFx0eyBkOiBcInUwXCIsIGZyYW1lTGVuZ3RoOiAxLCB9LFxyXG5cdFx0eyBkOiBcInIwXCIsIGZyYW1lTGVuZ3RoOiAxLCB9LFxyXG5cdFx0eyBkOiBcImQwXCIsIGZyYW1lTGVuZ3RoOiAwLCB0cmFuczogdHJ1ZSwgfSwgLy8yMFxyXG5cdFx0eyBkOiBcImwwXCIsIGZyYW1lTGVuZ3RoOiAwLCB0cmFuczogdHJ1ZSwgfSxcclxuXHRcdHsgZDogXCJ1MFwiLCBmcmFtZUxlbmd0aDogMCwgdHJhbnM6IHRydWUsIH0sXHJcblx0XHR7IGQ6IFwicjBcIiwgZnJhbWVMZW5ndGg6IDAsIHRyYW5zOiB0cnVlLCBsb29wVG86IDIwIH0sXHJcblx0XSk7XHJcblx0YW5pbXNbXCJ3YXJwX2luXCJdID0gbmV3IFNwcml0ZUFuaW1hdGlvbih7IHNpbmdsZURpcjogXCJkXCIgfSwgW1xyXG5cdFx0eyBkOiBcImQwXCIsIGZyYW1lTGVuZ3RoOiAxLCB9LCAvLzBcclxuXHRcdHsgZDogXCJyMFwiLCBmcmFtZUxlbmd0aDogMSwgfSxcclxuXHRcdHsgZDogXCJ1MFwiLCBmcmFtZUxlbmd0aDogMSwgfSxcclxuXHRcdHsgZDogXCJsMFwiLCBmcmFtZUxlbmd0aDogMSwgfSxcclxuXHRcdHsgZDogXCJkMFwiLCBmcmFtZUxlbmd0aDogMywgfSwgLy80XHJcblx0XHR7IGQ6IFwicjBcIiwgZnJhbWVMZW5ndGg6IDMsIH0sXHJcblx0XHR7IGQ6IFwidTBcIiwgZnJhbWVMZW5ndGg6IDMsIH0sXHJcblx0XHR7IGQ6IFwibDBcIiwgZnJhbWVMZW5ndGg6IDMsIH0sXHJcblx0XHR7IGQ6IFwiZDBcIiwgZnJhbWVMZW5ndGg6IDUsIH0sIC8vOFxyXG5cdFx0eyBkOiBcInIwXCIsIGZyYW1lTGVuZ3RoOiA1LCB9LFxyXG5cdFx0eyBkOiBcInUwXCIsIGZyYW1lTGVuZ3RoOiA1LCB9LFxyXG5cdFx0eyBkOiBcImwwXCIsIGZyYW1lTGVuZ3RoOiA1LCB9LFxyXG5cdFx0eyBkOiBcImQwXCIsIGZyYW1lTGVuZ3RoOiA3LCB9LCAvLzEyXHJcblx0XHR7IGQ6IFwicjBcIiwgZnJhbWVMZW5ndGg6IDcsIH0sXHJcblx0XHR7IGQ6IFwidTBcIiwgZnJhbWVMZW5ndGg6IDcsIH0sXHJcblx0XHR7IGQ6IFwibDBcIiwgZnJhbWVMZW5ndGg6IDcsIH0sXHJcblx0XHR7IGQ6IFwiZDBcIiwgZnJhbWVMZW5ndGg6IDgsIH0sIC8vMTZcclxuXHRcdHsgZDogXCJyMFwiLCBmcmFtZUxlbmd0aDogOCwgfSxcclxuXHRcdHsgZDogXCJ1MFwiLCBmcmFtZUxlbmd0aDogOSwgfSxcclxuXHRcdHsgZDogXCJsMFwiLCBmcmFtZUxlbmd0aDogOSwgfSxcclxuXHRcdHsgZDogXCJkMFwiLCBmcmFtZUxlbmd0aDogMSwgfSxcclxuXHRdKTtcclxuXHRcclxuXHRyZXR1cm4gYW5pbXM7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldFBva2Vtb25BbmltYXRpb25zKCkgeyAvL092ZXJyaWRlcyBTdGFuZGFyZFxyXG5cdHZhciBhbmltcyA9IHt9O1xyXG5cdGFuaW1zW1wic3RhbmRcIl0gPSBuZXcgU3ByaXRlQW5pbWF0aW9uKHsgc2luZ2xlRnJhbWU6IHRydWUsIH0sIFtcclxuXHRcdHsgdTogXCJ1MVwiLCBkOiBcImQxXCIsIGw6IFwibDFcIiwgcjogXCJyMVwiLCB0cmFuczogdHJ1ZSwgcGF1c2U6IHRydWUsIH0sXHJcblx0XSk7XHJcblx0YW5pbXNbXCJfZmxhcF9zdGFuZFwiXSA9IG5ldyBTcHJpdGVBbmltYXRpb24oeyBmcmFtZUxlbmd0aDogNSwga2VlcEZyYW1lOiB0cnVlLCB9LCBbXHJcblx0XHR7IHU6IFwidTFcIiwgZDogXCJkMVwiLCBsOiBcImwxXCIsIHI6IFwicjFcIiwgdHJhbnM6IHRydWUsIH0sXHJcblx0XHR7IHU6IFwidTJcIiwgZDogXCJkMlwiLCBsOiBcImwyXCIsIHI6IFwicjJcIiwgbG9vcFRvOiAwLCB9LFxyXG5cdF0pO1xyXG5cdGFuaW1zW1wid2Fsa1wiXSA9IG5ldyBTcHJpdGVBbmltYXRpb24oeyBmcmFtZUxlbmd0aDogNSwga2VlcEZyYW1lOiB0cnVlLCB9LCBbXHJcblx0XHR7IHU6IFwidTFcIiwgZDogXCJkMVwiLCBsOiBcImwxXCIsIHI6IFwicjFcIiwgdHJhbnM6IHRydWUsIH0sXHJcblx0XHR7IHU6IFwidTJcIiwgZDogXCJkMlwiLCBsOiBcImwyXCIsIHI6IFwicjJcIiwgbG9vcFRvOiAwLCB9LFxyXG5cdF0pO1xyXG5cdHJldHVybiBhbmltcztcclxufVxyXG5cclxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHJcbmZ1bmN0aW9uIFNwcml0ZUFuaW1hdGlvbihvcHRzLCBmcmFtZXMpIHtcclxuXHR0aGlzLm9wdGlvbnMgPSBvcHRzO1xyXG5cdHRoaXMuZnJhbWVzID0gZnJhbWVzO1xyXG5cdFxyXG5cdHRoaXMud2FpdFRpbWUgPSB0aGlzLmZyYW1lc1t0aGlzLmN1cnJGcmFtZV0uZnJhbWVMZW5ndGggfHwgdGhpcy5vcHRpb25zLmZyYW1lTGVuZ3RoO1xyXG59XHJcblNwcml0ZUFuaW1hdGlvbi5wcm90b3R5cGUgPSB7XHJcblx0b3B0aW9uczogbnVsbCxcclxuXHRmcmFtZXMgOiBudWxsLFxyXG5cdFxyXG5cdHdhaXRUaW1lIDogMCxcclxuXHRjdXJyRnJhbWU6IDAsXHJcblx0c3BlZWQgOiAxLFxyXG5cdHBhdXNlZCA6IGZhbHNlLFxyXG5cdGZpbmlzaGVkOiBmYWxzZSxcclxuXHRcclxuXHRwYXJlbnQgOiBudWxsLFxyXG5cdFxyXG5cdC8qKiBBZHZhbmNlZCB0aGUgYW5pbWF0aW9uIGJ5IHRoZSBnaXZlbiBhbW91bnQgb2YgZGVsdGEgdGltZS4gKi9cclxuXHRhZHZhbmNlIDogZnVuY3Rpb24oZGVsdGFUaW1lKSB7XHJcblx0XHRpZiAodGhpcy5vcHRpb25zLnNpbmdsZUZyYW1lKSByZXR1cm47XHJcblx0XHRpZiAodGhpcy5wYXVzZWQpIHJldHVybjtcclxuXHRcdFxyXG5cdFx0aWYgKHRoaXMud2FpdFRpbWUgPiAwKSB7XHJcblx0XHRcdHRoaXMud2FpdFRpbWUgLT0gKHRoaXMuc3BlZWQgKiAoZGVsdGFUaW1lICogQ09ORklHLnNwZWVkLmFuaW1hdGlvbikpO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdHZhciBsb29wID0gdGhpcy5mcmFtZXNbdGhpcy5jdXJyRnJhbWVdLmxvb3BUbztcclxuXHRcdGlmIChsb29wICE9PSB1bmRlZmluZWQpIHRoaXMuY3VyckZyYW1lID0gbG9vcDtcclxuXHRcdGVsc2UgdGhpcy5jdXJyRnJhbWUrKztcclxuXHRcdFxyXG5cdFx0aWYgKHRoaXMuY3VyckZyYW1lID49IHRoaXMuZnJhbWVzLmxlbmd0aCkge1xyXG5cdFx0XHR0aGlzLmN1cnJGcmFtZSA9IHRoaXMuZnJhbWVzLmxlbmd0aC0xO1xyXG5cdFx0XHR0aGlzLnBhdXNlZCA9IHRydWU7XHJcblx0XHRcdHRoaXMuZmluaXNoZWQgPSB0cnVlO1xyXG5cdFx0XHRjb25zb2xlLndhcm4oXCJBbmltYXRpb24gaGFzIGNvbXBsZXRlZCFcIik7XHJcblx0XHRcdGlmICh0aGlzLnBhcmVudCkgdGhpcy5wYXJlbnQuZW1pdChcImFuaW0tZW5kXCIsIG51bGwpOyAvL1RPRE8gcHJvdmlkZSBhbmltIG5hbWVcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHQvL25ldyBmcmFtZVxyXG5cdFx0XHJcblx0XHR0aGlzLndhaXRUaW1lID0gdGhpcy5mcmFtZXNbdGhpcy5jdXJyRnJhbWVdLmZyYW1lTGVuZ3RoIHx8IHRoaXMub3B0aW9ucy5mcmFtZUxlbmd0aDtcclxuXHRcdFxyXG5cdFx0aWYgKHRoaXMuZnJhbWVzW3RoaXMuY3VyckZyYW1lXS5wYXVzZSkgdGhpcy5wYXVzZWQgPSB0cnVlO1xyXG5cdFx0XHJcblx0XHRpZiAodGhpcy5mcmFtZXNbdGhpcy5jdXJyRnJhbWVdLnNmeCkgXHJcblx0XHRcdFNvdW5kTWFuYWdlci5wbGF5U291bmQodGhpcy5mcmFtZXNbdGhpcy5jdXJyRnJhbWVdLnNmeCk7XHJcblx0fSxcclxuXHRcclxuXHQvKiogSWYgdGhpcyBhbmltYXRpb24gaXMgb24gYSBwYXVzZSBmcmFtZSAqL1xyXG5cdHJlc3VtZSA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0dGhpcy5wYXVzZWQgPSBmYWxzZTtcclxuXHR9LFxyXG5cdFxyXG5cdC8qKiBSZXNldCB0aGUgYW5pbWF0aW9uIHBhcmFtZXRlcnMuIENhbGxlZCB3aGVuIHRoaXMgYW5pbWF0aW9uIGlzIG5vIGxvbmdlciB1c2VkLiAqL1xyXG5cdHJlc2V0IDogZnVuY3Rpb24oKSB7XHJcblx0XHR0aGlzLnBhdXNlZCA9IGZhbHNlO1xyXG5cdFx0aWYgKHRoaXMub3B0aW9ucy5rZWVwRnJhbWUpIHtcclxuXHRcdFx0Ly8gaWYgKHNlbGYuY2FuVHJhbnNpdGlvbigpKSB7XHJcblx0XHRcdC8vIFx0dmFyIGxvb3AgPSB0aGlzLmZyYW1lc1t0aGlzLmN1cnJGcmFtZV0ubG9vcFRvO1xyXG5cdFx0XHQvLyBcdGlmIChsb29wICE9PSB1bmRlZmluZWQpIHRoaXMuY3VyckZyYW1lID0gbG9vcDtcclxuXHRcdFx0Ly8gXHRlbHNlIHRoaXMuY3VyckZyYW1lKys7XHJcblx0XHRcdFx0XHJcblx0XHRcdC8vIFx0dGhpcy53YWl0VGltZSA9IHRoaXMuZnJhbWVzW3RoaXMuY3VyckZyYW1lXS5mcmFtZUxlbmd0aCB8fCB0aGlzLm9wdGlvbnMuZnJhbWVMZW5ndGg7XHJcblx0XHRcdFx0XHJcblx0XHRcdC8vIFx0aWYgKHRoaXMuZnJhbWVzW3RoaXMuY3VyckZyYW1lXS5wYXVzZSkgdGhpcy5wYXVzZWQgPSB0cnVlO1xyXG5cdFx0XHQvLyB9XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHRcdHRoaXMuZmluaXNoZWQgPSBmYWxzZTtcclxuXHRcdHRoaXMuY3VyckZyYW1lID0gMDtcclxuXHRcdHRoaXMud2FpdFRpbWUgPSB0aGlzLmZyYW1lc1t0aGlzLmN1cnJGcmFtZV0uZnJhbWVMZW5ndGggfHwgdGhpcy5vcHRpb25zLmZyYW1lTGVuZ3RoO1xyXG5cdFx0dGhpcy5zcGVlZCA9IDE7XHJcblx0fSxcclxuXHRcclxuXHQvKiogSWYgdGhpcyBhbmltYXRpb24gaXMgb24gYSBmcmFtZSB0aGF0IGNhbiB0cmFuc2l0aW9uIHRvIGFub3RoZXIgYW5pbWF0aW9uLiAqL1xyXG5cdGNhblRyYW5zaXRpb24gOiBmdW5jdGlvbigpIHtcclxuXHRcdHJldHVybiB0aGlzLmZpbmlzaGVkIHx8IHRoaXMuZnJhbWVzW3RoaXMuY3VyckZyYW1lXS50cmFucztcclxuXHR9LFxyXG5cdFxyXG5cdC8qKiBSZXR1cm5zIHRoZSBuYW1lIG9mIHRoZSBmcmFtZSB0byBkaXNwbGF5IHRoaXMgZnJhbWUuICovXHJcblx0Z2V0RnJhbWVUb0Rpc3BsYXkgOiBmdW5jdGlvbihkaXIpIHtcclxuXHRcdGlmICh0aGlzLm9wdGlvbnMuc2luZ2xlRGlyKSBkaXIgPSB0aGlzLm9wdGlvbnMuc2luZ2xlRGlyO1xyXG5cdFx0cmV0dXJuIHRoaXMuZnJhbWVzW3RoaXMuY3VyckZyYW1lXVtkaXJdO1xyXG5cdH0sXHJcbn07XHJcbm1vZHVsZS5leHBvcnRzLlNwcml0ZUFuaW1hdGlvbiA9IFNwcml0ZUFuaW1hdGlvbjsiLCIvLyBhY3Rvci5qc1xyXG4vLyBEZWZpbmVzIHRoZSBhY3RvciBldmVudCB1c2VkIHRocm91Z2hvdXQgdGhlIHBhcmtcclxuXHJcbnZhciBFdmVudCA9IHJlcXVpcmUoXCJ0cHAtZXZlbnRcIik7XHJcbnZhciBpbmhlcml0cyA9IHJlcXVpcmUoXCJpbmhlcml0c1wiKTtcclxudmFyIGV4dGVuZCA9IHJlcXVpcmUoXCJleHRlbmRcIik7XHJcblxyXG52YXIgQ2hhcmFjdGVyU3ByaXRlID0gcmVxdWlyZShcIi4uL21vZGVsL3Nwcml0ZW1vZGVsLmpzXCIpLkNoYXJhY3RlclNwcml0ZTtcclxudmFyIGdldFNwcml0ZUZvcm1hdCA9IHJlcXVpcmUoXCJ0cHAtYWN0b3ItYW5pbWF0aW9uc1wiKS5nZXRTcHJpdGVGb3JtYXQ7XHJcblxyXG52YXIgR0xPQkFMX1NDQUxFVVAgPSAxLjY1O1xyXG52YXIgRVZFTlRfUExBTkVfTk9STUFMID0gbmV3IFRIUkVFLlZlY3RvcjMoMCwgMSwgMCk7XHJcbi8qKlxyXG4gKiBBbiBhY3RvciBpcyBhbnkgZXZlbnQgcmVwcmVzZW50aW5nIGEgcGVyc29uLCBwb2tlbW9uLCBvciBvdGhlciBlbnRpdHkgdGhhdFxyXG4gKiBtYXkgbW92ZSBhcm91bmQgaW4gdGhlIHdvcmxkIG9yIGZhY2UgYSBkaXJlY3Rpb24uIEFjdG9ycyBtYXkgaGF2ZSBkaWZmZXJlbnRcclxuICogYmVoYXZpb3JzLCBzb21lIGNvbW1vbiBvbmVzIHByZWRlZmluZWQgaW4gdGhpcyBmaWxlLlxyXG4gKi9cclxuZnVuY3Rpb24gQWN0b3IoYmFzZSwgb3B0cykge1xyXG5cdEV2ZW50LmNhbGwodGhpcywgYmFzZSwgb3B0cyk7XHJcblx0XHJcblx0dGhpcy5vbihcInRpY2tcIiwgdGhpcy5fYWN0b3JUaWNrKTtcclxuXHR0aGlzLm9uKFwiaW50ZXJhY3RlZFwiLCB0aGlzLl9hY3RvckludGVyYWN0RmFjZSk7XHJcblx0dGhpcy5vbihcImNhbnQtbW92ZVwiLCB0aGlzLl9hY3RvckJ1bXApO1xyXG5cdHRoaXMuZmFjaW5nID0gbmV3IFRIUkVFLlZlY3RvcjMoMCwgMCwgMSk7XHJcblx0XHJcblx0dGhpcy5faW5pdEJlaGF2aW9yU3RhY2soKTtcclxufVxyXG5pbmhlcml0cyhBY3RvciwgRXZlbnQpO1xyXG5leHRlbmQoQWN0b3IucHJvdG90eXBlLCB7XHJcblx0c3ByaXRlOiBudWxsLFxyXG5cdHNwcml0ZV9mb3JtYXQ6IG51bGwsXHJcblx0XHJcblx0c2hhZG93IDogdHJ1ZSxcclxuXHRcclxuXHQvLy8vLy8vLy8vLy8vLy8vIFByb3BlcnR5IFNldHRlcnMgLy8vLy8vLy8vLy8vLy8vLy9cclxuXHRzY2FsZTogMSxcclxuXHRcclxuXHRzZXRTY2FsZSA6IGZ1bmN0aW9uKHNjYWxlKSB7XHJcblx0XHR0aGlzLnNjYWxlID0gc2NhbGU7XHJcblx0XHRzY2FsZSAqPSBHTE9CQUxfU0NBTEVVUDtcclxuXHRcdHRoaXMuYXZhdGFyX3Nwcml0ZS5zY2FsZS5zZXQoc2NhbGUsIHNjYWxlLCBzY2FsZSk7XHJcblx0fSxcclxuXHRcclxuXHQvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLyBBdmF0YXIgLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cdGF2YXRhcl9ub2RlIDogbnVsbCxcclxuXHRhdmF0YXJfc3ByaXRlIDogbnVsbCxcclxuXHRhdmF0YXJfZm9ybWF0IDogbnVsbCxcclxuXHRhdmF0YXJfdGV4IDogbnVsbCxcclxuXHRfYXZhdGFyX3NoYWRvd2Nhc3RlciA6IG51bGwsXHJcblx0XHJcblx0Z2V0QXZhdGFyIDogZnVuY3Rpb24obWFwKXsgXHJcblx0XHRpZiAodGhpcy5hdmF0YXJfbm9kZSkgcmV0dXJuIHRoaXMuYXZhdGFyX25vZGU7XHJcblx0XHRcclxuXHRcdHZhciBub2RlID0gdGhpcy5hdmF0YXJfbm9kZSA9IG5ldyBUSFJFRS5PYmplY3QzRCgpO1xyXG5cdFx0XHJcblx0XHRub2RlLmFkZCh0aGlzLl9hdmF0YXJfY3JlYXRlU3ByaXRlKG1hcCkpO1xyXG5cdFx0bm9kZS5hZGQodGhpcy5fYXZhdGFyX2NyZWF0ZVNoYWRvd0Nhc3RlcihtYXApKTtcclxuXHRcdFxyXG5cdFx0cmV0dXJuIG5vZGU7XHJcblx0XHRcclxuXHR9LFxyXG5cdFxyXG5cdGdldFRhbGtpbmdBbmNob3IgOiBmdW5jdGlvbigpIHtcclxuXHRcdHJldHVybiB0aGlzLl9hdmF0YXJfc2hhZG93Y2FzdGVyLmxvY2FsVG9Xb3JsZChcclxuXHRcdFx0dGhpcy5fYXZhdGFyX3NoYWRvd2Nhc3Rlci5wb3NpdGlvbi5jbG9uZSgpXHJcblx0XHQpO1xyXG5cdH0sXHJcblx0XHJcblx0X2F2YXRhcl9jcmVhdGVTaGFkb3dDYXN0ZXI6IGZ1bmN0aW9uKG1hcCkge1xyXG5cdFx0dmFyIG1hdCA9IG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCgpO1xyXG5cdFx0bWF0LnZpc2libGUgPSBmYWxzZTsgLy9UaGUgb2JqZWN0IHdvbid0IHJlbmRlciwgYnV0IHRoZSBzaGFkb3cgc3RpbGwgd2lsbFxyXG5cdFx0bWFwLmdjLmNvbGxlY3QobWF0KTtcclxuXHRcdFxyXG5cdFx0dmFyIGdlb20gPSBuZXcgVEhSRUUuU3BoZXJlR2VvbWV0cnkoMC4zLCA3LCAzKTtcclxuXHRcdG1hcC5nYy5jb2xsZWN0KGdlb20pO1xyXG5cdFx0XHJcblx0XHR2YXIgbWVzaCA9IG5ldyBUSFJFRS5NZXNoKGdlb20sIG1hdCk7XHJcblx0XHQvL21lc2gudmlzaWJsZSA9IGZhbHNlOyAvLz9cclxuXHRcdG1lc2guY2FzdFNoYWRvdyA9IHRydWU7XHJcblx0XHRtZXNoLnBvc2l0aW9uLnNldCgwLCAwLjUsIDApO1xyXG5cdFx0cmV0dXJuIHRoaXMuX2F2YXRhcl9zaGFkb3djYXN0ZXIgPSBtZXNoO1xyXG5cdH0sXHJcblx0XHJcblx0X2F2YXRhcl9jcmVhdGVTcHJpdGUgOiBmdW5jdGlvbihtYXApIHtcclxuXHRcdHZhciBzZWxmID0gdGhpcztcclxuXHRcdC8vIHZhciBpbWcgPSBuZXcgSW1hZ2UoKTtcclxuXHRcdHZhciB0ZXh0dXJlID0gc2VsZi5hdmF0YXJfdGV4ID0gbmV3IFRIUkVFLlRleHR1cmUoREVGX1NQUklURV9JTUcpO1xyXG5cdFx0bWFwLmdjLmNvbGxlY3QodGV4dHVyZSk7XHJcblx0XHRcclxuXHRcdC8vIE5vdGU6IG5vdCB1c2luZyBcInRoaXMuZ2V0U3ByaXRlRm9ybWF0XCIsIGJlY2F1c2UgdGhlIGRlZmFpbHQgc3ByaXRlXHJcblx0XHQvLyBmb3JtYXQgc2hvdWxkIG5vdCBiZSBvdmVyaWRkZW4uXHJcblx0XHR2YXIgc3Bmb3JtYXQgPSBnZXRTcHJpdGVGb3JtYXQoREVGX1NQUklURV9GT1JNQVQpO1xyXG5cdFx0XHJcblx0XHR0aGlzLl9fb25Mb2FkU3ByaXRlKERFRl9TUFJJVEVfSU1HLCBzcGZvcm1hdCwgdGV4dHVyZSk7XHJcblx0XHQvLyBpbWcuc3JjID0gREVGX1NQUklURTtcclxuXHRcdFxyXG5cdFx0dGV4dHVyZS5tYWdGaWx0ZXIgPSBUSFJFRS5OZWFyZXN0RmlsdGVyO1xyXG5cdFx0dGV4dHVyZS5taW5GaWx0ZXIgPSBUSFJFRS5OZWFyZXN0RmlsdGVyO1xyXG5cdFx0dGV4dHVyZS5yZXBlYXQgPSBuZXcgVEhSRUUuVmVjdG9yMigwLjI1LCAwLjI1KTtcclxuXHRcdHRleHR1cmUub2Zmc2V0ID0gbmV3IFRIUkVFLlZlY3RvcjIoMCwgMCk7XHJcblx0XHR0ZXh0dXJlLndyYXBTID0gVEhSRUUuTWlycm9yZWRSZXBlYXRXcmFwcGluZztcclxuXHRcdHRleHR1cmUud3JhcFQgPSBUSFJFRS5NaXJyb3JlZFJlcGVhdFdyYXBwaW5nO1xyXG5cdFx0dGV4dHVyZS5nZW5lcmF0ZU1pcG1hcHMgPSBmYWxzZTsgLy9NaXBtYXBzIGdlbmVyYXRlIHVuZGVzaXJhYmxlIHRyYW5zcGFyZW5jeSBhcnRpZmFjdHNcclxuXHRcdC8vVE9ETyBNaXJyb3JlZFJlcGVhdFdyYXBwaW5nLCBhbmQganVzdCB1c2UgYSBuZWdhdGl2ZSB4IHV2IHZhbHVlLCB0byBmbGlwIGEgc3ByaXRlXHJcblx0XHRcclxuXHRcdHNlbGYuYXZhdGFyX2Zvcm1hdCA9IHNwZm9ybWF0O1xyXG5cdFx0XHJcblx0XHQvLyB2YXIgbWF0IC8qPSBzZWxmLmF2YXRhcl9tYXQqLyA9IG5ldyBUSFJFRS5TcHJpdGVNYXRlcmlhbCh7XHJcblx0XHQvLyBcdG1hcDogdGV4dHVyZSxcclxuXHRcdC8vIFx0Y29sb3I6IDB4RkZGRkZGLFxyXG5cdFx0Ly8gXHR0cmFuc3BhcmVudDogdHJ1ZSxcclxuXHRcdC8vIH0pO1xyXG5cdFx0XHJcblx0XHRjdXJyZW50TWFwLm1hcmtMb2FkaW5nKFwiQUNUT1JfXCIrc2VsZi5pZCk7XHJcblx0XHR0aGlzLl9hdmF0YXJfbG9hZFNwcml0ZShtYXAsIHRleHR1cmUpO1xyXG5cdFx0XHJcblx0XHQvL3ZhciBzcHJpdGUgPSBzZWxmLmF2YXRhcl9zcHJpdGUgPSBuZXcgVEhSRUUuU3ByaXRlKG1hdCk7XHJcblx0XHR2YXIgc3ByaXRlID0gc2VsZi5hdmF0YXJfc3ByaXRlID0gbmV3IENoYXJhY3RlclNwcml0ZSh7XHJcblx0XHRcdG1hcDogdGV4dHVyZSxcclxuXHRcdFx0Y29sb3I6IDB4RkZGRkZGLFxyXG5cdFx0XHRvZmZzZXQ6IG5ldyBUSFJFRS5WZWN0b3IzKDAsIDAuMywgMC4yMiksXHJcblx0XHRcdGdjOiBtYXAuZ2MsXHJcblx0XHR9KTtcclxuXHRcdHNlbGYuc2V0U2NhbGUoc2VsZi5zY2FsZSk7XHJcblx0XHRcclxuXHRcdHJldHVybiBzcHJpdGU7XHJcblx0fSxcclxuXHRcclxuXHRfYXZhdGFyX2xvYWRTcHJpdGUgOiBmdW5jdGlvbihtYXAsIHRleHR1cmUpIHtcclxuXHRcdHZhciBzZWxmID0gdGhpcztcclxuXHRcdG1hcC5sb2FkU3ByaXRlKHNlbGYuaWQsIHNlbGYuc3ByaXRlLCBmdW5jdGlvbihlcnIsIHVybCl7XHJcblx0XHRcdGlmIChlcnIpIHtcclxuXHRcdFx0XHRjb25zb2xlLmVycm9yKFwiRVJST1IgTE9BRElORyBTUFJJVEU6IFwiLCBlcnIpO1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0dmFyIGltZyA9IG5ldyBJbWFnZSgpO1xyXG5cdFx0XHR2YXIgZm9ybWF0ID0gc2VsZi5zcHJpdGVfZm9ybWF0O1xyXG5cdFx0XHRpZiAodHlwZW9mIGZvcm1hdCA9PSBcImZ1bmN0aW9uXCIpIFxyXG5cdFx0XHRcdGZvcm1hdCA9IHNlbGYuc3ByaXRlX2Zvcm1hdChzZWxmLnNwcml0ZSk7XHJcblx0XHRcdGlmICh0eXBlb2YgZm9ybWF0ICE9IFwic3RyaW5nXCIpIHtcclxuXHRcdFx0XHRjb25zb2xlLmVycm9yKFwiSU5WQUxJRCBTUFJJVEUgRk9STUFUISAnc3ByaXRlX2Zvcm1hdCcgbXVzdCBiZSBhIHN0cmluZyBvciBhIFwiK1xyXG5cdFx0XHRcdFx0XCJmdW5jdGlvbiB0aGF0IHJldHVybnMgYSBzdHJpbmchIFRvIHByb3ZpZGUgYSBjdXN0b20gZm9ybWF0LCBvdmVycmlkZSBcIitcclxuXHRcdFx0XHRcdFwiZ2V0U3ByaXRlRm9ybWF0IG9uIHRoZSBhY3RvciBpbnN0YW5jZSFcIik7XHJcblx0XHRcdFx0Zm9ybWF0ID0gREVGX1NQUklURV9GT1JNQVQ7XHJcblx0XHRcdH1cclxuXHRcdFx0XHJcblx0XHRcdHNlbGYuX19vbkxvYWRTcHJpdGUoaW1nLCBzZWxmLmdldFNwcml0ZUZvcm1hdChmb3JtYXQpLCB0ZXh0dXJlKTtcclxuXHRcdFx0aW1nLnNyYyA9IHVybDtcclxuXHRcdH0pO1xyXG5cdH0sXHJcblx0XHJcblx0X19vbkxvYWRTcHJpdGUgOiBmdW5jdGlvbihpbWcsIGZvcm1hdCwgdGV4dHVyZSkge1xyXG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xyXG5cdFx0dmFyIGYgPSBmdW5jdGlvbigpIHtcclxuXHRcdFx0dGV4dHVyZS5pbWFnZSA9IGltZztcclxuXHRcdFx0XHJcblx0XHRcdHNlbGYuYXZhdGFyX2Zvcm1hdCA9IGZvcm1hdDtcclxuXHRcdFx0dGV4dHVyZS5yZXBlYXQuc2V0KFxyXG5cdFx0XHRcdHNlbGYuYXZhdGFyX2Zvcm1hdC53aWR0aCAvIGltZy5uYXR1cmFsV2lkdGgsIFxyXG5cdFx0XHRcdHNlbGYuYXZhdGFyX2Zvcm1hdC5oZWlnaHQgLyBpbWcubmF0dXJhbEhlaWdodCk7XHJcblxyXG5cdFx0XHR0ZXh0dXJlLm5lZWRzVXBkYXRlID0gdHJ1ZTtcclxuXHRcdFx0XHJcblx0XHRcdC8vIHNlbGYuc2hvd0FuaW1hdGlvbkZyYW1lKFwiZDBcIik7XHJcblx0XHRcdHNlbGYucGxheUFuaW1hdGlvbihcInN0YW5kXCIpO1xyXG5cdFx0XHRjdXJyZW50TWFwLm1hcmtMb2FkRmluaXNoZWQoXCJBQ1RPUl9cIitzZWxmLmlkKTtcclxuXHRcdFx0XHJcblx0XHRcdGltZy5yZW1vdmVFdmVudExpc3RlbmVyKFwibG9hZFwiLCBmKTtcclxuXHRcdFx0aW1nLnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJsb2FkXCIsIGUpO1xyXG5cdFx0fVxyXG5cdFx0dmFyIGUgPSBmdW5jdGlvbigpIHtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihcIkVycm9yIHdoaWxlIGxvYWRpbmcgdGV4dHVyZSFcIiwgaW1nLnNyYyk7XHJcblx0XHRcdHRleHR1cmUubmVlZHNVcGRhdGUgPSB0cnVlOyAvL3VwZGF0ZSB0aGUgbWlzc2luZyB0ZXh0dXJlIHByZS1sb2FkZWRcclxuXHRcdFx0Y3VycmVudE1hcC5tYXJrTG9hZEZpbmlzaGVkKFwiQUNUT1JfXCIrc2VsZi5pZCk7XHJcblx0XHRcdFxyXG5cdFx0XHRpbWcucmVtb3ZlRXZlbnRMaXN0ZW5lcihcImxvYWRcIiwgZik7XHJcblx0XHRcdGltZy5yZW1vdmVFdmVudExpc3RlbmVyKFwibG9hZFwiLCBlKTtcclxuXHRcdH1cclxuXHRcdGltZy5vbihcImxvYWRcIiwgZik7XHJcblx0XHRpbWcub24oXCJlcnJvclwiLCBlKTtcclxuXHR9LFxyXG5cdFxyXG5cdC8vIE92ZXJyaWRlIHRoaXMgZnVuY3Rpb24gdG8gcHJvdmlkZSBhIGN1c3RvbSBzcHJpdGUgZm9ybWF0XHJcblx0Z2V0U3ByaXRlRm9ybWF0IDogZnVuY3Rpb24oZm9ybWF0KSB7XHJcblx0XHRyZXR1cm4gZ2V0U3ByaXRlRm9ybWF0KGZvcm1hdCk7XHJcblx0fSxcclxuXHRcclxuXHQvLy8vLy8vLy8vLy8vLy8vLy8vIEFuaW1hdGlvbiAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblx0X2FuaW1hdGlvblN0YXRlIDogbnVsbCxcclxuXHRmYWNpbmcgOiBudWxsLFxyXG5cdGFuaW1hdGlvblNwZWVkOiAxLCAvL2RlZmF1bHQgYW5pbWF0aW9uIHNwZWVkXHJcblx0XHJcblx0X2luaXRBbmltYXRpb25TdGF0ZSA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0aWYgKCF0aGlzLl9hbmltYXRpb25TdGF0ZSlcclxuXHRcdFx0dGhpcy5fYW5pbWF0aW9uU3RhdGUgPSB7XHJcblx0XHRcdFx0Y3VyckFuaW0gOiBudWxsLCAvLyBBbmltYXRpb24gb2JqZWN0XHJcblx0XHRcdFx0Y3VyckZyYW1lIDogbnVsbCwgLy8gQ3VycmVudGx5IGRpc3BsYXllZCBzcHJpdGUgZnJhbWUgbmFtZVxyXG5cdFx0XHRcdG5leHRBbmltIDogbnVsbCwgLy8gQW5pbWF0aW9uIG9iamVjdCBpbiBxdWV1ZVxyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdHN0b3BOZXh0VHJhbnNpdGlvbjogZmFsc2UsIC8vU3RvcCBhdCB0aGUgbmV4dCB0cmFuc2l0aW9uIGZyYW1lLCB0byBzaG9ydC1zdG9wIHRoZSBcIkJ1bXBcIiBhbmltYXRpb25cclxuXHRcdFx0fTtcclxuXHRcdHJldHVybiB0aGlzLl9hbmltYXRpb25TdGF0ZTtcclxuXHR9LFxyXG5cdFxyXG5cdGdldERpcmVjdGlvbkZhY2luZyA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0aWYgKCFjdXJyZW50TWFwIHx8ICFjdXJyZW50TWFwLmNhbWVyYSkgcmV0dXJuIFwiZFwiO1xyXG5cdFx0XHJcblx0XHR2YXIgZGlydmVjdG9yID0gdGhpcy5mYWNpbmcuY2xvbmUoKTtcclxuXHRcdGRpcnZlY3Rvci5hcHBseVF1YXRlcm5pb24oIGN1cnJlbnRNYXAuY2FtZXJhLnF1YXRlcm5pb24gKTtcclxuXHRcdGRpcnZlY3Rvci5wcm9qZWN0T25QbGFuZShFVkVOVF9QTEFORV9OT1JNQUwpLm5vcm1hbGl6ZSgpO1xyXG5cdFx0XHJcblx0XHR2YXIgeCA9IGRpcnZlY3Rvci54LCB5ID0gZGlydmVjdG9yLno7XHJcblx0XHQvLyBjb25zb2xlLmxvZyhcIkRJUkZBQ0lORzpcIiwgeCwgeSk7XHJcblx0XHRpZiAoTWF0aC5hYnMoeCkgPiBNYXRoLmFicyh5KSkgeyAvL0RpcmVjdGlvbiB2ZWN0b3IgaXMgcG9pbnRpbmcgYWxvbmcgeCBheGlzXHJcblx0XHRcdGlmICh4ID4gMCkgcmV0dXJuIFwibFwiO1xyXG5cdFx0XHRlbHNlIHJldHVybiBcInJcIjtcclxuXHRcdH0gZWxzZSB7IC8vRGlyZWN0aW9uIHZlY3RvciBpcyBwb2ludGluZyBhbG9uZyB5IGF4aXNcclxuXHRcdFx0aWYgKHkgPiAwKSByZXR1cm4gXCJkXCI7XHJcblx0XHRcdGVsc2UgcmV0dXJuIFwidVwiO1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIFwiZFwiO1xyXG5cdH0sXHJcblx0XHJcblx0c2hvd0FuaW1hdGlvbkZyYW1lIDogZnVuY3Rpb24oZnJhbWUpIHtcclxuXHRcdHZhciBzdGF0ZSA9IHRoaXMuX2luaXRBbmltYXRpb25TdGF0ZSgpO1xyXG5cdFx0XHJcblx0XHR2YXIgZGVmID0gdGhpcy5hdmF0YXJfZm9ybWF0LmZyYW1lc1tmcmFtZV07XHJcblx0XHRpZiAoIWRlZikge1xyXG5cdFx0XHRjb25zb2xlLndhcm4oXCJFUlJPUiBcIiwgdGhpcy5pZCwgXCI6IEFuaW1hdGlvbiBmcmFtZSBkb2Vzbid0IGV4aXN0OlwiLCBmcmFtZSk7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHRcdHN0YXRlLmZyYW1lTmFtZSA9IGZyYW1lO1xyXG5cdFx0XHJcblx0XHR2YXIgZmxpcCA9IGZhbHNlO1xyXG5cdFx0aWYgKHR5cGVvZiBkZWYgPT0gXCJzdHJpbmdcIikgeyAvL3JlZGlyZWN0XHJcblx0XHRcdGRlZiA9IHRoaXMuYXZhdGFyX2Zvcm1hdC5mcmFtZXNbZGVmXTtcclxuXHRcdFx0ZmxpcCA9IHRydWU7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdHZhciB1ID0gZGVmWzBdICogdGhpcy5hdmF0YXJfdGV4LnJlcGVhdC54O1xyXG5cdFx0dmFyIHYgPSAxIC0gKChkZWZbMV0rMSkgKiB0aGlzLmF2YXRhcl90ZXgucmVwZWF0LnkpO1xyXG5cdFx0Ly9Gb3Igc29tZSByZWFzb24sIG9mZnNldHMgYXJlIGZyb20gdGhlIEJPVFRPTSBsZWZ0PyFcclxuXHRcdFxyXG5cdFx0aWYgKGZsaXAgJiYgdGhpcy5hdmF0YXJfZm9ybWF0LmZsaXApIHtcclxuXHRcdFx0dSA9IDAgLSAoZGVmWzBdLTEpICogdGhpcy5hdmF0YXJfdGV4LnJlcGVhdC54OyAvL1RPRE8gdGVzdFxyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHR0aGlzLmF2YXRhcl90ZXgub2Zmc2V0LnNldCh1LCB2KTsgXHJcblx0XHR0aGlzLmF2YXRhcl90ZXgubmVlZHNVcGRhdGUgPSB0cnVlO1xyXG5cdH0sXHJcblx0XHJcblx0cGxheUFuaW1hdGlvbiA6IGZ1bmN0aW9uKGFuaW1OYW1lLCBvcHRzKSB7XHJcblx0XHR2YXIgc3RhdGUgPSB0aGlzLl9pbml0QW5pbWF0aW9uU3RhdGUoKTtcclxuXHRcdGlmICghb3B0cykgb3B0cyA9IHt9O1xyXG5cdFx0XHJcblx0XHR2YXIgYW5pbSA9IHRoaXMuYXZhdGFyX2Zvcm1hdC5hbmltc1thbmltTmFtZV07XHJcblx0XHRpZiAoIWFuaW0pIHtcclxuXHRcdFx0Y29uc29sZS53YXJuKFwiRVJST1JcIiwgdGhpcy5pZCwgXCI6IEFuaW1hdGlvbiBuYW1lIGRvZXNuJ3QgZXhpc3Q6XCIsIGFuaW1OYW1lKTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cdFx0YW5pbS5wYXJlbnQgPSB0aGlzO1xyXG5cdFx0c3RhdGUubmV4dEFuaW0gPSBhbmltO1xyXG5cdFx0YW5pbS5zcGVlZCA9IChvcHRzLnNwZWVkID09IHVuZGVmaW5lZCk/IHRoaXMuYW5pbWF0aW9uU3BlZWQgOiBvcHRzLnNwZWVkO1xyXG5cdFx0c3RhdGUuc3RvcE5leHRUcmFuc2l0aW9uID0gb3B0cy5zdG9wTmV4dFRyYW5zaXRpb24gfHwgZmFsc2U7XHJcblx0fSxcclxuXHRcclxuXHRzdG9wQW5pbWF0aW9uIDogZnVuY3Rpb24oKSB7XHJcblx0XHR2YXIgc3RhdGUgPSB0aGlzLl9pbml0QW5pbWF0aW9uU3RhdGUoKTtcclxuXHRcdFxyXG5cdFx0Ly8gc3RhdGUucnVubmluZyA9IGZhbHNlO1xyXG5cdFx0Ly8gc3RhdGUucXVldWUgPSBudWxsO1xyXG5cdFx0Ly8gc3RhdGUuc3RvcEZyYW1lID0gbnVsbDtcclxuXHRcdHRoaXMuZW1pdChcImFuaW0tZW5kXCIsIHN0YXRlLmFuaW1OYW1lKTtcclxuXHR9LFxyXG5cdFxyXG5cdF90aWNrX2RvQW5pbWF0aW9uOiBmdW5jdGlvbihkZWx0YSkge1xyXG5cdFx0dmFyIHN0YXRlID0gdGhpcy5fYW5pbWF0aW9uU3RhdGU7XHJcblx0XHR2YXIgQ0EgPSBzdGF0ZS5jdXJyQW5pbTtcclxuXHRcdGlmICghQ0EpIENBID0gc3RhdGUuY3VyckFuaW0gPSBzdGF0ZS5uZXh0QW5pbTtcclxuXHRcdGlmICghQ0EpIHJldHVybjtcclxuXHRcdFxyXG5cdFx0Q0EuYWR2YW5jZShkZWx0YSk7XHJcblx0XHRcclxuXHRcdGlmIChzdGF0ZS5uZXh0QW5pbSAmJiBDQS5jYW5UcmFuc2l0aW9uKCkpIHtcclxuXHRcdFx0Ly9Td2l0Y2ggYW5pbWF0aW9uc1xyXG5cdFx0XHRDQS5yZXNldCgpO1xyXG5cdFx0XHRDQSA9IHN0YXRlLmN1cnJBbmltID0gc3RhdGUubmV4dEFuaW07XHJcblx0XHRcdHN0YXRlLm5leHRBbmltID0gbnVsbDtcclxuXHRcdFx0XHJcblx0XHRcdC8vIHRoaXMuZW1pdChcImFuaW0tZW5kXCIsIG51bGwpOyAvL1RPRE8gcHJvdmlkZSBhbmltIG5hbWVcclxuXHRcdFx0XHJcblx0XHRcdGlmIChzdGF0ZS5zdG9wTmV4dFRyYW5zaXRpb24pIHtcclxuXHRcdFx0XHR0aGlzLnBsYXlBbmltYXRpb24oXCJzdGFuZFwiKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHR2YXIgZGlyID0gdGhpcy5nZXREaXJlY3Rpb25GYWNpbmcoKTtcclxuXHRcdHZhciBmcmFtZSA9IENBLmdldEZyYW1lVG9EaXNwbGF5KGRpcik7XHJcblx0XHRpZiAoZnJhbWUgIT0gc3RhdGUuY3VyckZyYW1lKSB7XHJcblx0XHRcdHRoaXMuc2hvd0FuaW1hdGlvbkZyYW1lKGZyYW1lKTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdH0sXHJcblx0XHJcblx0Ly8vLy8vLy8vLy8vLy8vLy8vLyBNb3ZlbWVudCBhbmQgUGF0aGluZyAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblx0X3BhdGhpbmdTdGF0ZSA6IG51bGwsXHJcblx0XHJcblx0X2luaXRQYXRoaW5nU3RhdGUgOiBmdW5jdGlvbigpIHtcclxuXHRcdGlmICghdGhpcy5fcGF0aGluZ1N0YXRlKVxyXG5cdFx0XHR0aGlzLl9wYXRoaW5nU3RhdGUgPSB7XHJcblx0XHRcdFx0cXVldWU6IFtdLFxyXG5cdFx0XHRcdG1vdmluZzogZmFsc2UsXHJcblx0XHRcdFx0c3BlZWQ6IDEsXHJcblx0XHRcdFx0ZGVsdGE6IDAsIC8vdGhlIGRlbHRhIGZyb20gc3JjIHRvIGRlc3RcclxuXHRcdFx0XHRqdW1waW5nIDogZmFsc2UsXHJcblx0XHRcdFx0Ly8gZGlyOiBcImRcIixcclxuXHRcdFx0XHRcclxuXHRcdFx0XHRkZXN0TG9jQzogbmV3IFRIUkVFLlZlY3RvcjMoKS5zZXQodGhpcy5sb2NhdGlvbiksIC8vY29sbGlzaW9uIG1hcCBsb2NhdGlvblxyXG5cdFx0XHRcdGRlc3RMb2MzOiBuZXcgVEhSRUUuVmVjdG9yMygpLCAvL3dvcmxkIHNwYWNlIGxvY2F0aW9uXHJcblx0XHRcdFx0c3JjTG9jQzogbmV3IFRIUkVFLlZlY3RvcjMoKS5zZXQodGhpcy5sb2NhdGlvbiksXHJcblx0XHRcdFx0c3JjTG9jMzogbmV3IFRIUkVFLlZlY3RvcjMoKSxcclxuXHRcdFx0XHRtaWRwb2ludE9mZnNldDogbmV3IFRIUkVFLlZlY3RvcjMoKSxcclxuXHRcdFx0fTtcclxuXHRcdHJldHVybiB0aGlzLl9wYXRoaW5nU3RhdGU7XHJcblx0fSxcclxuXHRcclxuXHRwYXRoVG8gOiBmdW5jdGlvbih4LCB5KSB7XHJcblx0XHR2YXIgc3RhdGUgPSB0aGlzLl9pbml0UGF0aGluZ1N0YXRlKCk7XHJcblx0XHRcclxuXHRcdGNvbnNvbGUuZXJyb3IodGhpcy5pZCwgXCI6IFBhdGhpbmcgaGFzIG5vdCBiZWVuIGltcGxlbWVudGVkIHlldCFcIik7XHJcblx0fSxcclxuXHRcclxuXHRjbGVhclBhdGhpbmcgOiBmdW5jdGlvbigpIHtcclxuXHRcdHZhciBzdGF0ZSA9IHRoaXMuX2luaXRQYXRoaW5nU3RhdGUoKTtcclxuXHRcdHN0YXRlLnF1ZXVlLmxlbmd0aCA9IDA7XHJcblx0fSxcclxuXHRcclxuXHRtb3ZlRGlyIDogZnVuY3Rpb24oZGlyKSB7XHJcblx0XHR2YXIgeCA9IHRoaXMubG9jYXRpb24ueDtcclxuXHRcdHZhciB5ID0gdGhpcy5sb2NhdGlvbi55O1xyXG5cdFx0dmFyIHogPSB0aGlzLmxvY2F0aW9uLno7XHJcblx0XHRzd2l0Y2ggKGRpcikge1xyXG5cdFx0XHRjYXNlIFwiZFwiOiBjYXNlIFwiZG93blwiOlx0eSArPSAxOyBicmVhaztcclxuXHRcdFx0Y2FzZSBcInVcIjogY2FzZSBcInVwXCI6XHR5IC09IDE7IGJyZWFrO1xyXG5cdFx0XHRjYXNlIFwibFwiOiBjYXNlIFwibGVmdFwiOlx0eCAtPSAxOyBicmVhaztcclxuXHRcdFx0Y2FzZSBcInJcIjogY2FzZSBcInJpZ2h0XCI6XHR4ICs9IDE7IGJyZWFrO1xyXG5cdFx0fVxyXG5cdFx0dGhpcy5tb3ZlVG8oeCwgeSwgeik7XHJcblx0fSxcclxuXHRcclxuXHRmYWNlRGlyIDogZnVuY3Rpb24oeCwgeSkge1xyXG5cdFx0dGhpcy5mYWNpbmcuc2V0KC14LCAwLCB5KTtcclxuXHR9LFxyXG5cdFxyXG5cdG1vdmVUbyA6IGZ1bmN0aW9uKHgsIHksIGxheWVyLCBieXBhc3MpIHsgLy9ieXBhc3MgV2Fsa21hc2sgY2hlY2tcclxuXHRcdHZhciBzdGF0ZSA9IHRoaXMuX2luaXRQYXRoaW5nU3RhdGUoKTtcclxuXHRcdHZhciBzcmMgPSB0aGlzLmxvY2F0aW9uO1xyXG5cdFx0bGF5ZXIgPSAobGF5ZXIgPT0gdW5kZWZpbmVkKT8gdGhpcy5sb2NhdGlvbi56IDogbGF5ZXI7XHJcblx0XHRcclxuXHRcdHRoaXMuZmFjaW5nLnNldChzcmMueC14LCAwLCB5LXNyYy55KTtcclxuXHRcdFxyXG5cdFx0dmFyIHdhbGttYXNrID0gY3VycmVudE1hcC5jYW5XYWxrQmV0d2VlbihzcmMueCwgc3JjLnksIHgsIHkpO1xyXG5cdFx0aWYgKGJ5cGFzcyAhPT0gdW5kZWZpbmVkKSB3YWxrbWFzayA9IGJ5cGFzcztcclxuXHRcdGlmICghd2Fsa21hc2spIHtcclxuXHRcdFx0dGhpcy5lbWl0KFwiY2FudC1tb3ZlXCIsIHNyYy54LCBzcmMueSwgeCwgeSk7XHJcblx0XHRcdGN1cnJlbnRNYXAuZGlzcGF0Y2goeCwgeSwgXCJidW1wZWRcIiwgdGhpcy5mYWNpbmcpO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblx0XHRpZiAoKHdhbGttYXNrICYgMHgxMCkgPT0gMHgxMCkgeyAvLyBDaGVjayBOb05QQyB0aWxlc1xyXG5cdFx0XHRpZiAodGhpcy5pc05QQygpKSB7XHJcblx0XHRcdFx0dGhpcy5lbWl0KFwiY2FudC1tb3ZlXCIsIHNyYy54LCBzcmMueSwgeCwgeSk7XHJcblx0XHRcdFx0Y3VycmVudE1hcC5kaXNwYXRjaCh4LCB5LCBcImJ1bXBlZFwiLCB0aGlzLmZhY2luZyk7XHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHRpZiAoKHdhbGttYXNrICYgMHg4KSA9PSAweDgpIHtcclxuXHRcdFx0Ly8gVHJhbnNpdGlvbiBub3cgdG8gYW5vdGhlciBsYXllclxyXG5cdFx0XHR2YXIgdCA9IGN1cnJlbnRNYXAuZ2V0TGF5ZXJUcmFuc2l0aW9uKHgsIHksIHRoaXMubG9jYXRpb24ueik7XHJcblx0XHRcdGNvbnNvbGUubG9nKFwiTGF5ZXIgVHJhbnNpdGlvbjogXCIsIHQpO1xyXG5cdFx0XHR4ID0gdC54OyB5ID0gdC55OyBsYXllciA9IHQubGF5ZXI7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdFxyXG5cdFx0dmFyIGFuaW1vcHRzID0ge307XHJcblx0XHRzdGF0ZS5taWRwb2ludE9mZnNldC5zZXQoMCwgMCwgMCk7XHJcblx0XHRzdGF0ZS5zcmNMb2NDLnNldChzcmMpO1xyXG5cdFx0c3RhdGUuc3JjTG9jMy5zZXQoY3VycmVudE1hcC5nZXQzRFRpbGVMb2NhdGlvbihzcmMpKTtcclxuXHRcdHN0YXRlLmRlc3RMb2NDLnNldCh4LCB5LCBsYXllcik7XHJcblx0XHRzdGF0ZS5kZXN0TG9jMy5zZXQoY3VycmVudE1hcC5nZXQzRFRpbGVMb2NhdGlvbih4LCB5LCBsYXllcikpO1xyXG5cdFx0c3RhdGUuZGVsdGEgPSAwO1xyXG5cdFx0c3RhdGUuc3BlZWQgPSAxO1xyXG5cdFx0c3RhdGUubW92aW5nID0gdHJ1ZTtcclxuXHRcdFxyXG5cdFx0aWYgKCh3YWxrbWFzayAmIDB4MikgPT09IDB4Mikge1xyXG5cdFx0XHRzdGF0ZS5taWRwb2ludE9mZnNldC5zZXRZKDAuNik7XHJcblx0XHRcdHN0YXRlLmp1bXBpbmcgPSB0cnVlO1xyXG5cdFx0XHRTb3VuZE1hbmFnZXIucGxheVNvdW5kKFwid2Fsa19qdW1wXCIpO1xyXG5cdFx0XHRhbmltb3B0cy5zcGVlZCA9IDEuNTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0dGhpcy5wbGF5QW5pbWF0aW9uKFwid2Fsa1wiLCBhbmltb3B0cyk7XHJcblx0XHR0aGlzLmVtaXQoXCJtb3ZpbmdcIiwgc3RhdGUuc3JjTG9jQy54LCBzdGF0ZS5zcmNMb2NDLnksIHN0YXRlLmRlc3RMb2NDLngsIHN0YXRlLmRlc3RMb2NDLnkpO1xyXG5cdH0sXHJcblx0XHJcblx0X3RpY2tfZG9Nb3ZlbWVudCA6IGZ1bmN0aW9uKGRlbHRhKSB7XHJcblx0XHR2YXIgc3RhdGUgPSB0aGlzLl9pbml0UGF0aGluZ1N0YXRlKCk7XHJcblx0XHRcclxuXHRcdHN0YXRlLmRlbHRhICs9IHN0YXRlLnNwZWVkICogKGRlbHRhICogQ09ORklHLnNwZWVkLnBhdGhpbmcpO1xyXG5cdFx0dmFyIGFscGhhID0gTWF0aC5jbGFtcChzdGF0ZS5kZWx0YSk7XHJcblx0XHR2YXIgYmV0YSA9IE1hdGguc2luKGFscGhhICogTWF0aC5QSSk7XHJcblx0XHR0aGlzLmF2YXRhcl9ub2RlLnBvc2l0aW9uLnNldCggXHJcblx0XHRcdC8vTGVycCBiZXR3ZWVuIHNyYyBhbmQgZGVzdCAoYnVpbHQgaW4gbGVycCgpIGlzIGRlc3RydWN0aXZlLCBhbmQgc2VlbXMgYmFkbHkgZG9uZSlcclxuXHRcdFx0c3RhdGUuc3JjTG9jMy54ICsgKChzdGF0ZS5kZXN0TG9jMy54IC0gc3RhdGUuc3JjTG9jMy54KSAqIGFscGhhKSArIChzdGF0ZS5taWRwb2ludE9mZnNldC54ICogYmV0YSksXHJcblx0XHRcdHN0YXRlLnNyY0xvYzMueSArICgoc3RhdGUuZGVzdExvYzMueSAtIHN0YXRlLnNyY0xvYzMueSkgKiBhbHBoYSkgKyAoc3RhdGUubWlkcG9pbnRPZmZzZXQueSAqIGJldGEpLFxyXG5cdFx0XHRzdGF0ZS5zcmNMb2MzLnogKyAoKHN0YXRlLmRlc3RMb2MzLnogLSBzdGF0ZS5zcmNMb2MzLnopICogYWxwaGEpICsgKHN0YXRlLm1pZHBvaW50T2Zmc2V0LnogKiBiZXRhKVxyXG5cdFx0KTtcclxuXHRcdFxyXG5cdFx0aWYgKHN0YXRlLmRlbHRhID4gMSkge1xyXG5cdFx0XHR0aGlzLmVtaXQoXCJtb3ZlZFwiLCBzdGF0ZS5zcmNMb2NDLngsIHN0YXRlLnNyY0xvY0MueSwgc3RhdGUuZGVzdExvY0MueCwgc3RhdGUuZGVzdExvY0MueSk7XHJcblx0XHRcdHRoaXMubG9jYXRpb24uc2V0KCBzdGF0ZS5kZXN0TG9jQyApO1xyXG5cdFx0XHRcclxuXHRcdFx0aWYgKHN0YXRlLmp1bXBpbmcpIHtcclxuXHRcdFx0XHQvL1RPRE8gcGFydGljbGUgZWZmZWN0c1xyXG5cdFx0XHRcdFNvdW5kTWFuYWdlci5wbGF5U291bmQoXCJ3YWxrX2p1bXBfbGFuZFwiKTtcclxuXHRcdFx0XHRzdGF0ZS5qdW1waW5nID0gZmFsc2U7XHJcblx0XHRcdH1cclxuXHRcdFx0XHJcblx0XHRcdHZhciBuZXh0ID0gc3RhdGUucXVldWUuc2hpZnQoKTtcclxuXHRcdFx0aWYgKCFuZXh0KSB7XHJcblx0XHRcdFx0c3RhdGUuZGVsdGEgPSAwO1xyXG5cdFx0XHRcdHN0YXRlLm1vdmluZyA9IGZhbHNlO1xyXG5cdFx0XHRcdC8vIHRoaXMuc3RvcEFuaW1hdGlvbigpO1xyXG5cdFx0XHRcdHRoaXMucGxheUFuaW1hdGlvbihcInN0YW5kXCIpO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdHRoaXMubW92ZVRvKG5leHQueCwgbmV4dC55LCBuZXh0LnopO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fSxcclxuXHRcclxuXHRcclxuXHQvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8gQmVoYXZpb3JzIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHRiZWhhdmlvclN0YWNrIDogbnVsbCxcclxuXHRcclxuXHRfaW5pdEJlaGF2aW9yU3RhY2sgOiBmdW5jdGlvbigpIHtcclxuXHRcdGlmICghdGhpcy5iZWhhdmlvclN0YWNrKVxyXG5cdFx0XHR0aGlzLmJlaGF2aW9yU3RhY2sgPSBbXTtcclxuXHR9LFxyXG5cdFxyXG5cdF90aWNrX2RvQmVoYXZpb3IgOiBmdW5jdGlvbihkZWx0YSkge1xyXG5cdFx0dmFyIGJlaGF2ID0gdGhpcy5iZWhhdmlvclN0YWNrLnRvcDtcclxuXHRcdGlmICghYmVoYXYgfHwgIWJlaGF2Ll90aWNrKSByZXR1cm47XHJcblx0XHRiZWhhdi5fdGljayh0aGlzLCBkZWx0YSk7XHJcblx0fSxcclxuXHRcclxuXHRcclxuXHQvLy8vLy8vLy8vLy8vLy8vLy8vLy8gUHJpdmF0ZSBNZXRob2RzIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHRcclxuXHRjYW5XYWxrT24gOiBmdW5jdGlvbigpeyByZXR1cm4gZmFsc2U7IH0sXHJcblx0aXNOUEMgOiBmdW5jdGlvbigpeyByZXR1cm4gdHJ1ZTsgfSxcclxuXHRcclxuXHRfbm9ybWFsaXplTG9jYXRpb24gOiBmdW5jdGlvbigpIHtcclxuXHRcdGlmICh0aGlzLmxvY2F0aW9uID09IFwicmFuZFwiKSB7XHJcblx0XHRcdC8vUGxhY2UgdGhpcyBhY3RvciBpbiBhIGRlc2lnbmF0ZWQgcmFuZG9tIGxvY2F0aW9uXHJcblx0XHRcdHRoaXMubG9jYXRpb24gPSBjdXJyZW50TWFwLmdldFJhbmRvbU5QQ1NwYXduUG9pbnQoKTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHR2YXIgbnVtID0gRXZlbnQucHJvdG90eXBlLl9ub3JtYWxpemVMb2NhdGlvbi5jYWxsKHRoaXMpO1xyXG5cdFx0aWYgKG51bSAhPSAxIHx8ICF0aGlzLmxvY2F0aW9uKVxyXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJBY3RvcnMgY2FuIG9ubHkgYmUgaW4gb25lIHBsYWNlIGF0IGEgdGltZSEgTnVtYmVyIG9mIGxvY2F0aW9uczogXCIrbnVtKTtcclxuXHR9LFxyXG5cdFxyXG5cdF9hY3RvclRpY2sgOiBmdW5jdGlvbihkZWx0YSkge1xyXG5cdFx0Ly8gRG8gYW5pbWF0aW9uXHJcblx0XHRpZiAodGhpcy5fYW5pbWF0aW9uU3RhdGUpIFxyXG5cdFx0XHR0aGlzLl90aWNrX2RvQW5pbWF0aW9uKGRlbHRhKTtcclxuXHRcdFxyXG5cdFx0Ly8gRG8gbW92ZW1lbnRcclxuXHRcdGlmICh0aGlzLl9wYXRoaW5nU3RhdGUgJiYgdGhpcy5fcGF0aGluZ1N0YXRlLm1vdmluZylcclxuXHRcdFx0dGhpcy5fdGlja19kb01vdmVtZW50KGRlbHRhKTtcclxuXHRcdFxyXG5cdFx0Ly8gRG8gYmVoYXZpb3JcclxuXHRcdGlmICh0aGlzLmJlaGF2aW9yU3RhY2subGVuZ3RoKVxyXG5cdFx0XHR0aGlzLl90aWNrX2RvQmVoYXZpb3IoZGVsdGEpO1xyXG5cdH0sXHJcblx0XHJcblx0X2FjdG9ySW50ZXJhY3RGYWNlIDogZnVuY3Rpb24odmVjdG9yKSB7XHJcblx0XHR0aGlzLmZhY2luZyA9IHZlY3Rvci5jbG9uZSgpLm5lZ2F0ZSgpO1xyXG5cdH0sXHJcblx0XHJcblx0X2FjdG9yQnVtcCA6IGZ1bmN0aW9uKHNyY3gsIHNyY3ksIHgsIHksIHJlYXNvbikge1xyXG5cdFx0Ly8gY29uc29sZS53YXJuKHRoaXMuaWQsIFwiOiBDYW5ub3Qgd2FsayB0byBsb2NhdGlvblwiLCBcIihcIit4K1wiLFwiK3krXCIpXCIpO1xyXG5cdH0sXHJcblx0XHJcbn0pO1xyXG5tb2R1bGUuZXhwb3J0cyA9IEFjdG9yO1xyXG5cclxuXHJcblxyXG5mdW5jdGlvbiBnZXREaXJGcm9tTG9jKHgxLCB5MSwgeDIsIHkyKSB7XHJcblx0cmV0dXJuIG5ldyBUSFJFRS5WZWN0b3IzKHgyLXgxLCAwLCB5Mi15MSk7XHJcblx0Ly8gdmFyIGR4ID0geDIgLSB4MTtcclxuXHQvLyB2YXIgZHkgPSB5MiAtIHkxO1xyXG5cdC8vIGlmIChNYXRoLmFicyhkeCkgPiBNYXRoLmFicyhkeSkpIHtcclxuXHQvLyBcdGlmIChkeCA+IDApIHsgcmV0dXJuIFwiclwiOyB9XHJcblx0Ly8gXHRlbHNlIGlmIChkeCA8IDApIHsgcmV0dXJuIFwibFwiOyB9XHJcblx0Ly8gfSBlbHNlIHtcclxuXHQvLyBcdGlmIChkeSA+IDApIHsgcmV0dXJuIFwiZFwiOyB9XHJcblx0Ly8gXHRlbHNlIGlmIChkeSA8IDApIHsgcmV0dXJuIFwidVwiOyB9XHJcblx0Ly8gfVxyXG5cdC8vIHJldHVybiBcImRcIjtcclxufVxyXG5cclxuIiwiLy8gYmVoYXZpb3IuanNcclxuLy8gRGVmaW5lcyB0aGUgYmFzZWQgY2xhc3NlcyBmb3IgQWN0b3IncyBiZWhhdmlvcnNcclxuXHJcbnZhciBleHRlbmQgPSByZXF1aXJlKFwiZXh0ZW5kXCIpO1xyXG52YXIgaW5oZXJpdHMgPSByZXF1aXJlKFwiaW5oZXJpdHNcIik7XHJcblxyXG4vKiogXHJcbiAqIEEgQmVoYXZpb3IgaXMgYSBzY3JpcHQgdGhhdCBhbiBhY3RvciBpcyBmb2xsb3dpbmcsIHdoZXRoZXIgdGhhdFxyXG4gKiBiZSB3YWxraW5nIGFsb25nIGEgcGF0aCBvciBhcm91bmQgYSBjaXJjbGUsIG9yIGZvbGxvd2luZyBhIG1vcmVcclxuICogY29tcGxleCBzY3JpcHQgb2YgZXZlbnRzLiBCZWhhdmlvcnMgY2FuIGJlIHB1c2hlZCBhbmQgcG9wcGVkIG9mZlxyXG4gKiBhbiBhY3RvcidzIHN0YWNrLCBhbmQgdGhlIHRvcG1vc3Qgb25lIHdpbGwgYmUgcGFzc2VkIGNlcnRhaW4gZXZlbnRzXHJcbiAqIHRoYXQgdGhlIGFjdG9yIHJlY2lldmVzLlxyXG4gKi9cclxuXHJcbmZ1bmN0aW9uIEJlaGF2aW9yKG9wdHMpIHtcclxuXHRleHRlbmQodGhpcywgb3B0cyk7XHJcbn1cclxuZXh0ZW5kKEJlaGF2aW9yLnByb3RvdHlwZSwge1xyXG5cdHRpY2sgOiBudWxsLFxyXG5cdGludGVyYWN0IDogbnVsbCxcclxuXHRidW1wIDogbnVsbCxcclxuXHRcclxuXHRfdGljayA6IGZ1bmN0aW9uKG1lLCBkZWx0YSkge1xyXG5cdFx0aWYgKHRoaXMudGljaylcclxuXHRcdFx0dGhpcy50aWNrKG1lLCBkZWx0YSk7XHJcblx0fSxcclxuXHRfaW50ZXJhY3QgOiBmdW5jdGlvbihtZSwgZnJvbV9kaXIpIHtcclxuXHRcdC8vVE9ETyBkbyBzdGFuZGFyZCBzdHVmZiBoZXJlXHJcblx0XHRpZiAodGhpcy5pbnRlcmFjdClcclxuXHRcdFx0dGhpcy5pbnRlcmFjdChtZSwgZnJvbV9kaXIpO1xyXG5cdH0sXHJcblx0X2J1bXAgOiBmdW5jdGlvbihtZSwgZnJvbV9kaXIpIHtcclxuXHRcdGlmICh0aGlzLmJ1bXApXHJcblx0XHRcdHRoaXMuYnVtcChtZSwgZnJvbV9kaXIpO1xyXG5cdH0sXHJcbn0pO1xyXG5tb2R1bGUuZXhwb3J0cyA9IEJlaGF2aW9yO1xyXG5cclxuXHJcbi8vLy8vLy8vLy8vIENvbW1vbiBCZWhhdmlvcnMgLy8vLy8vLy8vLy9cclxuXHJcbmZ1bmN0aW9uIFRhbGtpbmcob3B0cykge1xyXG5cdEJlaGF2aW9yLmNhbGwodGhpcywgb3B0cyk7XHJcbn1cclxuaW5oZXJpdHMoVGFsa2luZywgQmVoYXZpb3IpO1xyXG5leHRlbmQoVGFsa2luZy5wcm90b3R5cGUsIHtcclxuXHR0aWNrOiBmdW5jdGlvbihtZSwgZGVsdGEpIHt9LFxyXG59KTtcclxubW9kdWxlLmV4cG9ydHMuVGFsa2luZyA9IFRhbGtpbmc7XHJcblxyXG5cclxuXHJcbmZ1bmN0aW9uIExvb2tBcm91bmQob3B0cykge1xyXG5cdEJlaGF2aW9yLmNhbGwodGhpcywgb3B0cyk7XHJcbn1cclxuaW5oZXJpdHMoTG9va0Fyb3VuZCwgQmVoYXZpb3IpO1xyXG5leHRlbmQoTG9va0Fyb3VuZC5wcm90b3R5cGUsIHtcclxuXHR3YWl0VGltZSA6IDAsXHJcblx0dGljazogZnVuY3Rpb24obWUsIGRlbHRhKSB7XHJcblx0XHRpZiAodGhpcy53YWl0VGltZSA+IDApIHtcclxuXHRcdFx0dGhpcy53YWl0VGltZSAtPSBkZWx0YTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHRzd2l0Y2goIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSo0KSApIHtcclxuXHRcdFx0Y2FzZSAwOiBtZS5mYWNpbmcuc2V0KCAxLDAsIDApOyBicmVhaztcclxuXHRcdFx0Y2FzZSAxOiBtZS5mYWNpbmcuc2V0KC0xLDAsIDApOyBicmVhaztcclxuXHRcdFx0Y2FzZSAyOiBtZS5mYWNpbmcuc2V0KCAwLDAsIDEpOyBicmVhaztcclxuXHRcdFx0Y2FzZSAzOiBtZS5mYWNpbmcuc2V0KCAwLDAsLTEpOyBicmVhaztcclxuXHRcdH1cclxuXHRcdHRoaXMud2FpdFRpbWUgKz0gKE1hdGgucmFuZG9tKCkgKiAzMCkgKyA1O1xyXG5cdH0sXHJcbn0pO1xyXG5tb2R1bGUuZXhwb3J0cy5Mb29rQXJvdW5kID0gTG9va0Fyb3VuZDtcclxuXHJcblxyXG5cclxuZnVuY3Rpb24gTWVhbmRlcihvcHRzKSB7XHJcblx0QmVoYXZpb3IuY2FsbCh0aGlzLCBvcHRzKTtcclxufVxyXG5pbmhlcml0cyhNZWFuZGVyLCBCZWhhdmlvcik7XHJcbmV4dGVuZChNZWFuZGVyLnByb3RvdHlwZSwge1xyXG5cdHdhaXRUaW1lIDogMCxcclxuXHR0aWNrOiBmdW5jdGlvbihtZSwgZGVsdGEpIHtcclxuXHRcdGlmICh0aGlzLndhaXRUaW1lID4gMCkge1xyXG5cdFx0XHR0aGlzLndhaXRUaW1lIC09IGRlbHRhO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdHN3aXRjaCggTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpKjgpICkge1xyXG5cdFx0XHRjYXNlIDA6IG1lLmZhY2luZy5zZXQoIDEsMCwgMCk7IGJyZWFrO1xyXG5cdFx0XHRjYXNlIDE6IG1lLmZhY2luZy5zZXQoLTEsMCwgMCk7IGJyZWFrO1xyXG5cdFx0XHRjYXNlIDI6IG1lLmZhY2luZy5zZXQoIDAsMCwgMSk7IGJyZWFrO1xyXG5cdFx0XHRjYXNlIDM6IG1lLmZhY2luZy5zZXQoIDAsMCwtMSk7IGJyZWFrO1xyXG5cdFx0XHRjYXNlIDQ6IG1lLm1vdmVEaXIoXCJkXCIpOyBicmVhaztcclxuXHRcdFx0Y2FzZSA1OiBtZS5tb3ZlRGlyKFwidVwiKTsgYnJlYWs7XHJcblx0XHRcdGNhc2UgNjogbWUubW92ZURpcihcImxcIik7IGJyZWFrO1xyXG5cdFx0XHRjYXNlIDc6IG1lLm1vdmVEaXIoXCJyXCIpOyBicmVhaztcclxuXHRcdH1cclxuXHRcdHRoaXMud2FpdFRpbWUgKz0gKE1hdGgucmFuZG9tKCkgKiAzMCkgKyA1O1xyXG5cdH0sXHJcbn0pO1xyXG5tb2R1bGUuZXhwb3J0cy5NZWFuZGVyID0gTWVhbmRlcjtcclxuXHJcbiIsIi8vIGNvbnRyb2xsZXIuanNcclxuLy8gVGhpcyBjbGFzcyBoYW5kbGVzIGlucHV0IGFuZCBjb252ZXJ0cyBpdCB0byBjb250cm9sIHNpZ25hbHNcclxuXHJcbnZhciBpbmhlcml0cyA9IHJlcXVpcmUoXCJpbmhlcml0c1wiKTtcclxudmFyIGV4dGVuZCA9IHJlcXVpcmUoXCJleHRlbmRcIik7XHJcbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKFwiZXZlbnRzXCIpLkV2ZW50RW1pdHRlcjtcclxuXHJcbi8vIFRPRE8gaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvR3VpZGUvQVBJL0dhbWVwYWRcclxuXHJcbmZ1bmN0aW9uIENvbnRyb2xNYW5hZ2VyKCkge1xyXG5cdHZhciBzZWxmID0gdGhpcztcclxuXHR0aGlzLnNldEtleUNvbmZpZygpO1xyXG5cdFxyXG5cdCQoZnVuY3Rpb24oKXtcclxuXHRcdCQoZG9jdW1lbnQpLm9uKFwia2V5ZG93blwiLCBmdW5jdGlvbihlKXsgc2VsZi5vbktleURvd24oZSk7IH0pO1xyXG5cdFx0JChkb2N1bWVudCkub24oXCJrZXl1cFwiLCBmdW5jdGlvbihlKXsgc2VsZi5vbktleVVwKGUpOyB9KTtcclxuXHRcdFxyXG5cdFx0JChcIiNjaGF0Ym94XCIpLm9uKFwiZm9jdXNcIiwgZnVuY3Rpb24oZSl7IFxyXG5cdFx0XHRjb25zb2xlLmxvZyhcIkNIQVQgRk9DVVNcIik7XHJcblx0XHRcdHNlbGYuaW5wdXRDb250ZXh0LnB1c2goXCJjaGF0XCIpOyBcclxuXHRcdH0pO1xyXG5cdFx0JChcIiNjaGF0Ym94XCIpLm9uKFwiYmx1clwiLCBmdW5jdGlvbihlKXsgXHJcblx0XHRcdGNvbnNvbGUubG9nKFwiQ0hBVCBCTFVSXCIpO1xyXG5cdFx0XHRpZiAoc2VsZi5pbnB1dENvbnRleHQudG9wID09IFwiY2hhdFwiKVxyXG5cdFx0XHRcdHNlbGYuaW5wdXRDb250ZXh0LnBvcCgpOyBcclxuXHRcdH0pO1xyXG5cdH0pXHJcbn1cclxuaW5oZXJpdHMoQ29udHJvbE1hbmFnZXIsIEV2ZW50RW1pdHRlcik7XHJcbmV4dGVuZChDb250cm9sTWFuYWdlci5wcm90b3R5cGUsIHtcclxuXHRpbnB1dENvbnRleHQgOiBbXCJnYW1lXCJdLFxyXG5cdFxyXG5cdGtleXNfY29uZmlnIDoge1xyXG5cdFx0VXA6IFszOCwgXCJVcFwiLCA4NywgXCJ3XCJdLCBcclxuXHRcdERvd246IFs0MCwgXCJEb3duXCIsIDgzLCBcInNcIl0sIFxyXG5cdFx0TGVmdDogWzM3LCBcIkxlZnRcIiwgNjUsIFwiYVwiXSwgXHJcblx0XHRSaWdodDogWzM5LCBcIlJpZ2h0XCIsIDY4LCBcImRcIl0sXHJcblx0XHRJbnRlcmFjdDogWzEzLCBcIkVudGVyXCIsIDMyLCBcIiBcIl0sXHJcblx0XHRGb2N1c0NoYXQ6IFsxOTEsIFwiL1wiXSxcclxuXHR9LFxyXG5cdFxyXG5cdGtleXNfYWN0aXZlIDoge30sXHJcblx0XHJcblx0a2V5c19kb3duIDoge1xyXG5cdFx0VXA6IGZhbHNlLCBEb3duOiBmYWxzZSxcclxuXHRcdExlZnQ6IGZhbHNlLCBSaWdodDogZmFsc2UsXHJcblx0XHRJbnRlcmFjdDogZmFsc2UsIEZvY3VzQ2hhdDogZmFsc2UsXHJcblx0fSxcclxuXHRcclxuXHRwdXNoSW5wdXRDb250ZXh0OiBmdW5jdGlvbihjdHgpIHtcclxuXHRcdHRoaXMuaW5wdXRDb250ZXh0LnB1c2goY3R4KTtcclxuXHRcdHRoaXMuZW1pdChcImlucHV0Q29udGV4dENoYW5nZWRcIik7XHJcblx0fSxcclxuXHRwb3BJbnB1dENvbnRleHQ6IGZ1bmN0aW9uKGN0eCkge1xyXG5cdFx0aWYgKCFjdHggfHwgdGhpcy5pbnB1dENvbnRleHQudG9wID09IGN0eCkge1xyXG5cdFx0XHR2YXIgYyA9IHRoaXMuaW5wdXRDb250ZXh0LnBvcCgpO1xyXG5cdFx0XHR0aGlzLmVtaXQoXCJpbnB1dENvbnRleHRDaGFuZ2VkXCIpO1xyXG5cdFx0XHRyZXR1cm4gYztcclxuXHRcdH1cclxuXHR9LFxyXG5cdFxyXG5cdGlzRG93biA6IGZ1bmN0aW9uKGtleSwgY3R4KSB7XHJcblx0XHRpZiAoJC5pc0FycmF5KGN0eCkpIHtcclxuXHRcdFx0dmFyIGdvID0gZmFsc2U7XHJcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgY3R4Lmxlbmd0aDsgaSsrKSBnbyB8PSBjdHhbaV07XHJcblx0XHRcdGlmICghZ28pIHJldHVybjtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdGlmICh0aGlzLmlucHV0Q29udGV4dC50b3AgIT0gY3R4KSByZXR1cm47XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdHJldHVybiB0aGlzLmtleXNfZG93bltrZXldO1xyXG5cdH0sXHJcblx0aXNEb3duT25jZSA6IGZ1bmN0aW9uKGtleSwgY3R4KSB7XHJcblx0XHRpZiAoJC5pc0FycmF5KGN0eCkpIHtcclxuXHRcdFx0dmFyIGdvID0gZmFsc2U7XHJcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgY3R4Lmxlbmd0aDsgaSsrKSBnbyB8PSBjdHhbaV07XHJcblx0XHRcdGlmICghZ28pIHJldHVybjtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdGlmICh0aGlzLmlucHV0Q29udGV4dC50b3AgIT0gY3R4KSByZXR1cm47XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdHJldHVybiB0aGlzLmtleXNfZG93bltrZXldID09IDE7XHJcblx0fSxcclxuXHRcclxuXHRzZXRLZXlDb25maWcgOiBmdW5jdGlvbigpIHtcclxuXHRcdHRoaXMua2V5c19hY3RpdmUgPSBleHRlbmQodHJ1ZSwge30sIHRoaXMua2V5c19jb25maWcpO1xyXG5cdH0sXHJcblx0XHJcblx0b25LZXlEb3duIDogZnVuY3Rpb24oZSkge1xyXG5cdFx0Zm9yICh2YXIgYWN0aW9uIGluIHRoaXMua2V5c19hY3RpdmUpIHtcclxuXHRcdFx0dmFyIGtleXMgPSB0aGlzLmtleXNfYWN0aXZlW2FjdGlvbl07XHJcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRcdGlmIChlLndoaWNoID09IGtleXNbaV0pIHtcclxuXHRcdFx0XHRcdC8vIEtleSBpcyBub3cgZG93biFcclxuXHRcdFx0XHRcdHRoaXMuZW1pdEtleShhY3Rpb24sIHRydWUpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH0sXHJcblx0b25LZXlVcCA6IGZ1bmN0aW9uIChlKSB7XHJcblx0XHRmb3IgKHZhciBhY3Rpb24gaW4gdGhpcy5rZXlzX2FjdGl2ZSkge1xyXG5cdFx0XHR2YXIga2V5cyA9IHRoaXMua2V5c19hY3RpdmVbYWN0aW9uXTtcclxuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdFx0aWYgKGUud2hpY2ggPT0ga2V5c1tpXSkge1xyXG5cdFx0XHRcdFx0Ly8gS2V5IGlzIG5vdyB1cCFcclxuXHRcdFx0XHRcdHRoaXMuZW1pdEtleShhY3Rpb24sIGZhbHNlKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9LFxyXG5cdFxyXG5cdHN1Ym1pdENoYXRLZXlwcmVzcyA6IGZ1bmN0aW9uKGtleSkge1xyXG5cdFx0c3dpdGNoKGtleSkge1xyXG5cdFx0XHRcclxuXHRcdH1cclxuXHR9LFxyXG5cdFxyXG5cdGVtaXRLZXkgOiBmdW5jdGlvbihhY3Rpb24sIGRvd24pIHtcclxuXHRcdGlmICh0aGlzLmtleXNfZG93blthY3Rpb25dICE9IGRvd24pIHtcclxuXHRcdFx0dGhpcy5rZXlzX2Rvd25bYWN0aW9uXSA9IGRvd247XHJcblx0XHRcdHRoaXMuZW1pdChcImNvbnRyb2wtYWN0aW9uXCIsIGFjdGlvbiwgZG93bik7XHJcblx0XHR9XHJcblx0fSxcclxuXHRcclxuXHRfdGljayA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0Zm9yICh2YXIgbmFtZSBpbiB0aGlzLmtleXNfZG93bikge1xyXG5cdFx0XHRpZiAodGhpcy5rZXlzX2Rvd25bbmFtZV0gPiAwKVxyXG5cdFx0XHRcdHRoaXMua2V5c19kb3duW25hbWVdKys7XHJcblx0XHR9XHJcblx0fVxyXG5cdFxyXG59KTtcclxuXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBDb250cm9sTWFuYWdlcigpO1xyXG4iLCIvLyBldmVudC5qc1xyXG4vLyBEZWZpbmVzIHRoZSBiYXNlIGV2ZW50IHVzZWQgdGhyb3VnaG91dCB0aGUgcGFyay5cclxuXHJcbi8vIEZpdHRpbmdseSwgRXZlbnQgaXMgYSBzdWJjbGFzcyBvZiBub2RlLmpzJ3MgRXZlbnRFbWl0dGVyIGNsYXNzLlxyXG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZShcImV2ZW50c1wiKS5FdmVudEVtaXR0ZXI7XHJcbnZhciBpbmhlcml0cyA9IHJlcXVpcmUoXCJpbmhlcml0c1wiKTtcclxudmFyIGV4dGVuZCA9IHJlcXVpcmUoXCJleHRlbmRcIik7XHJcblxyXG4vKipcclxuICogQW4gZXZlbnQgaXMgYW55IGludGVyYWN0YWJsZSBvciBhbmltYXRpbmcgb2JqZWN0IGluIHRoZSBnYW1lLlxyXG4gKiBUaGlzIGluY2x1ZGVzIHRoaW5ncyByYW5naW5nIGZyb20gc2lnbnMsIHRvIHBlb3BsZS9wb2tlbW9uLlxyXG4gKiBBbiBldmVudDpcclxuICpcdC0gVGFrZXMgdXAgYXQgbGVhc3Qgb25lIHRpbGUgb24gdGhlIG1hcFxyXG4gKlx0LSBDYW4gYmUgaW50ZXJhY3RlZCB3aXRoIGJ5IGluLWdhbWUgdGFsa2luZyBvciBvbi1zY3JlZW4gY2xpY2tcclxuICpcdC0gTWF5IGJlIHJlcHJlc2VudGVkIGluLWdhbWUgYnkgYSBzcHJpdGVcclxuICpcdC0gTWF5IGRlY2lkZSwgdXBvbiBjcmVhdGlvbiwgdG8gbm90IGFwcGVhciBvbiB0aGUgbWFwLlxyXG4gKi9cclxuZnVuY3Rpb24gRXZlbnQoYmFzZSwgb3B0cykge1xyXG5cdEV2ZW50RW1pdHRlci5jYWxsKHRoaXMpO1xyXG5cdFxyXG5cdGV4dGVuZCh0aGlzLCBiYXNlLCBvcHRzKTtcclxuXHRcclxuXHR0aGlzLl9ub3JtYWxpemVMb2NhdGlvbigpO1xyXG5cdFxyXG5cdGlmICh0aGlzLm9uRXZlbnRzKSB7XHJcblx0XHR2YXIga2V5cyA9IE9iamVjdC5rZXlzKHRoaXMub25FdmVudHMpO1xyXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdHRoaXMub24oa2V5c1tpXSwgdGhpcy5vbkV2ZW50c1trZXlzW2ldXSk7XHJcblx0XHR9XHJcblx0XHRkZWxldGUgdGhpcy5vbkV2ZW50cztcclxuXHR9XHJcbn1cclxuaW5oZXJpdHMoRXZlbnQsIEV2ZW50RW1pdHRlcik7XHJcbmV4dGVuZChFdmVudC5wcm90b3R5cGUsIHtcclxuXHRpZCA6IG51bGwsXHJcblx0ZW5hYmxlZCA6IGZhbHNlLFxyXG5cdHZpc2libGUgOiB0cnVlLFxyXG5cdFxyXG5cdGxvY2F0aW9uIDogbnVsbCwgLy8gRXZlbnRzIHdpdGggYSBzaW5nbGUgbG9jYXRpb24gYXJlIG9wdGltaXplZCBmb3IgaXRcclxuXHRsb2NhdGlvbnMgOiBudWxsLCAvLyBFdmVudHMgd2l0aCBtdWx0aXBsZSBsb2NhdGlvbnMgYXJlIG9wdGltaXplZCBmb3IgdGhhdCBhbHNvXHJcblx0XHJcblx0dG9TdHJpbmcgOiBmdW5jdGlvbigpIHtcclxuXHRcdGlmICghdGhpcy5pZCkgcmV0dXJuIFwiPExvY2FsIG9yIFVubmFtZWQgRXZlbnQ+XCI7XHJcblx0XHRyZXR1cm4gdGhpcy5pZDtcclxuXHR9LFxyXG5cdFxyXG5cdHNob3VsZEFwcGVhciA6IGZ1bmN0aW9uKCl7IHJldHVybiB0cnVlOyB9LFxyXG5cdGNhbldhbGtPbiA6IGZ1bmN0aW9uKCl7IHJldHVybiB0cnVlOyB9LFxyXG5cdFxyXG5cdC8qKiBSZXR1cm5zIGFuIG9iamVjdCB0byByZXByZXNlbnQgdGhpcyBldmVudCBpbiAzRCBzcGFjZSwgb3IgbnVsbCBpZiB0aGVyZSBzaG91bGRuJ3QgYmUgb25lLiAqL1xyXG5cdGdldEF2YXRhciA6IGZ1bmN0aW9uKCl7IHJldHVybiBudWxsOyB9LFxyXG5cdFxyXG5cdG9uRXZlbnRzIDogbnVsbCwgLy9hIG9iamVjdCwgZXZlbnQtbmFtZXMgLT4gZnVuY3Rpb25zIHRvIGNhbGwsIHRvIGJlIHJlZ2lzdGVyZWQgaW4gY29uc3RydWN0b3JcclxuXHRcclxuXHRjYW5Nb3ZlIDogZnVuY3Rpb24oKSB7XHJcblx0XHQvL0lmIHdlIG9ubHkgaGF2ZSAxIGxvY2F0aW9uLCB0aGVuIHdlIGNhbiBtb3ZlXHJcblx0XHRyZXR1cm4gISF0aGlzLmxvY2F0aW9uICYmICF0aGlzLmxvY2F0aW9ucztcclxuXHR9LFxyXG5cdFxyXG5cdG1vdmVUbyA6IGZ1bmN0aW9uKHgsIHkpIHtcclxuXHRcdGlmICghdGhpcy5jYW5Nb3ZlKCkpXHJcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIlRoaXMgZXZlbnQgaXMgaW4gc2V2ZXJhbCBwbGFjZXMgYXQgb25jZSwgYW5kIGNhbm5vdCBtb3ZlVG8hXCIpO1xyXG5cdFx0XHJcblx0XHQvL1RPRE8gcXVldWUgdXAgYSBtb3ZlXHJcblx0fSxcclxuXHRcclxuXHRfbm9ybWFsaXplTG9jYXRpb24gOiBmdW5jdGlvbigpIHtcclxuXHRcdGlmICh0aGlzLmxvY2F0aW9uKSB7XHJcblx0XHRcdC8vSWYgd2UgaGF2ZSBhIHNpbmd1bGFyIGxvY2F0aW9uIHNldFxyXG5cdFx0XHRpZiAodGhpcy5sb2NhdGlvbnMpIC8vIEFzIGxvbmcgYXMgd2UgZG9uJ3QgYWxzbyBoYXZlIGEgbGlzdCwgaXRzIGZpbmVcclxuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJFdmVudCB3YXMgaW5pdGlhbGl6ZWQgd2l0aCBib3RoIGxvY2F0aW9uIGFuZCBsb2NhdGlvbnMhIFRoZXkgY2Fubm90IGJlIGJvdGggZGVmaW5lZCFcIik7XHJcblx0XHRcdFxyXG5cdFx0XHR2YXIgbG9jID0gdGhpcy5sb2NhdGlvbjtcclxuXHRcdFx0aWYgKCQuaXNBcnJheShsb2MpICYmIGxvYy5sZW5ndGggPT0gMiAmJiB0eXBlb2YgbG9jWzBdID09IFwibnVtYmVyXCIgJiYgdHlwZW9mIGxvY1sxXSA9PSBcIm51bWJlclwiKSBcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGxvYyA9IG5ldyBUSFJFRS5WZWN0b3IyKGxvY1swXSwgbG9jWzFdKTtcclxuXHRcdFx0fSBcclxuXHRcdFx0ZWxzZSBpZiAoJC5pc0FycmF5KGxvYykgJiYgbG9jLmxlbmd0aCA9PSAzIFxyXG5cdFx0XHRcdCYmIHR5cGVvZiBsb2NbMF0gPT0gXCJudW1iZXJcIiAmJiB0eXBlb2YgbG9jWzFdID09IFwibnVtYmVyXCIgJiYgdHlwZW9mIGxvY1syXSA9PSBcIm51bWJlclwiKSBcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGxvYyA9IG5ldyBUSFJFRS5WZWN0b3IzKGxvY1swXSwgbG9jWzFdLCBsb2NbMl0pO1xyXG5cdFx0XHR9IFxyXG5cdFx0XHRlbHNlIGlmICghKGxvYyBpbnN0YW5jZW9mIFRIUkVFLlZlY3RvcjIgfHwgbG9jIGluc3RhbmNlb2YgVEhSRUUuVmVjdG9yMykpIFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiQ291bGQgbm90IG5vcm1hbGl6ZSBsb2NhdGlvbiBvZiBcIit0aGlzLmlkK1wiIVwiKTtcclxuXHRcdFx0fVxyXG5cdFx0XHR0aGlzLmxvY2F0aW9uID0gbG9jO1xyXG5cdFx0XHRyZXR1cm4gMTtcclxuXHRcdH1cclxuXHRcdHZhciBvcmdsb2MgPSB0aGlzLmxvY2F0aW9ucztcclxuXHRcdHZhciBsb2NzID0gbnVsbDtcclxuXHRcdFxyXG5cdFx0aWYgKCQuaXNBcnJheShvcmdsb2MpKSB7XHJcblx0XHRcdHZhciB0eXBlID0gbnVsbCwgbmV3VHlwZSA9IG51bGw7XHJcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgb3JnbG9jLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdFx0aWYgKHR5cGVvZiBvcmdsb2NbaV0gPT0gXCJudW1iZXJcIilcclxuXHRcdFx0XHRcdG5ld1R5cGUgPSBcIm51bWJlclwiO1xyXG5cdFx0XHRcdGVsc2UgaWYgKG9yZ2xvY1tpXSBpbnN0YW5jZW9mIFRIUkVFLlZlY3RvcjIpXHJcblx0XHRcdFx0XHRuZXdUeXBlID0gXCJ2ZWN0b3JcIjtcclxuXHRcdFx0XHRlbHNlIGlmIChvcmdsb2NbaV0gaW5zdGFuY2VvZiBUSFJFRS5WZWN0b3IzKVxyXG5cdFx0XHRcdFx0bmV3VHlwZSA9IFwidmVjdG9yXCI7XHJcblx0XHRcdFx0ZWxzZSBpZiAoJC5pc0FycmF5KG9yZ2xvY1tpXSkpXHJcblx0XHRcdFx0XHRuZXdUeXBlID0gXCJhcnJheVwiO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdGlmICghdHlwZSkgdHlwZSA9IG5ld1R5cGU7XHJcblx0XHRcdFx0aWYgKHR5cGUgIT0gbmV3VHlwZSkge1xyXG5cdFx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiQ291bGQgbm90IG5vcm1hbGl6ZSBsb2NhdGlvbnMgb2YgXCIrdGhpcy5pZCtcIiFcIik7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHRcdGlmICh0eXBlID09IFwibnVtYmVyXCIpIGxvY3MgPSBfX3BhcnNlQXNOdW1iZXJBcnJheShvcmdsb2MpO1xyXG5cdFx0XHRpZiAodHlwZSA9PSBcImFycmF5XCIpIGxvY3MgPSBfX3BhcnNlQXNBcnJheUFycmF5KG9yZ2xvYyk7XHJcblx0XHRcdGlmICh0eXBlID09IFwidmVjdG9yXCIpIGxvY3MgPSBvcmdsb2M7XHJcblx0XHR9XHJcblx0XHRlbHNlIGlmICgkLmlzRnVuY3Rpb24ob3JnbG9jKSkge1xyXG5cdFx0XHRsb2NzID0gb3JnbG9jLmNhbGwodGhpcyk7XHJcblx0XHR9XHJcblx0XHRlbHNlIGlmIChvcmdsb2MgaW5zdGFuY2VvZiBUSFJFRS5WZWN0b3IyKSB7XHJcblx0XHRcdGxvY3MgPSBbb3JnbG9jXTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0aWYgKCFsb2NzIHx8ICEkLmlzQXJyYXkobG9jcykgfHwgbG9jcy5sZW5ndGggPT0gMCkgXHJcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIkNvdWxkIG5vdCBub3JtYWxpemUgbG9jYXRpb25zIG9mIFwiK3RoaXMuaWQrXCIhXCIpO1xyXG5cdFx0XHJcblx0XHR0aGlzLmxvY2F0aW9ucyA9IGxvY3M7XHJcblx0XHR0aGlzLl9ub3JtYWxpemVMb2NhdGlvbiA9IGZ1bmN0aW9uKCl7IHJldHVybiBsb2NzLmxlbmd0aDsgfTsgLy9jYW4ndCBub3JtYWxpemUgdHdpY2VcclxuXHRcdHJldHVybiBsb2NzLmxlbmd0aDtcclxuXHRcdFxyXG5cdFx0ZnVuY3Rpb24gX19wYXJzZUFzTnVtYmVyQXJyYXkobCkge1xyXG5cdFx0XHRpZiAobC5sZW5ndGggPT0gMikgLy9zaW5nbGUgcG9pbnQgW3gsIHldXHJcblx0XHRcdFx0cmV0dXJuIFtuZXcgVEhSRUUuVmVjdG9yMihsWzBdLCBsWzFdKV07XHJcblx0XHRcdGlmIChsLmxlbmd0aCA9PSAzKSAvL3NpbmdsZSBwb2ludCBbeCwgeSwgel1cclxuXHRcdFx0XHRyZXR1cm4gW25ldyBUSFJFRS5WZWN0b3IzKGxbMF0sIGxbMV0sIGxbMl0pXTtcclxuXHRcdFx0aWYgKGwubGVuZ3RoID09IDQpIHsgLy9yZWN0YW5nbGUgW3gsIHksIHcsIGhdXHJcblx0XHRcdFx0dmFyIG4gPSBbXTtcclxuXHRcdFx0XHRmb3IgKHZhciB4ID0gbFswXTsgeCA8IGxbMF0rbFsyXTsgeCsrKSB7XHJcblx0XHRcdFx0XHRmb3IgKHZhciB5ID0gbFsxXTsgeSA8IGxbMV0rbFszXTsgeSsrKSB7XHJcblx0XHRcdFx0XHRcdG4ucHVzaChuZXcgVEhSRUUuVmVjdG9yMih4LCB5KSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdHJldHVybiBuO1xyXG5cdFx0XHR9XHJcblx0XHRcdGlmIChsLmxlbmd0aCA9PSA1KSB7IC8vcmVjdGFuZ2xlIFt4LCB5LCB6LCB3LCBoXVxyXG5cdFx0XHRcdHZhciBuID0gW107XHJcblx0XHRcdFx0Zm9yICh2YXIgeCA9IGxbMF07IHggPCBsWzBdK2xbM107IHgrKykge1xyXG5cdFx0XHRcdFx0Zm9yICh2YXIgeSA9IGxbMV07IHkgPCBsWzFdK2xbNF07IHkrKykge1xyXG5cdFx0XHRcdFx0XHRuLnB1c2gobmV3IFRIUkVFLlZlY3RvcjMoeCwgeSwgbFsyXSkpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRyZXR1cm4gbjtcclxuXHRcdFx0fVxyXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJDb3VsZCBub3Qgbm9ybWFsaXplIGxvY2F0aW9uKHMpIG9mIFwiK3RoaXMuaWQrXCIhXCIpO1xyXG5cdFx0fVxyXG5cdFx0ZnVuY3Rpb24gX19wYXJzZUFzQXJyYXlBcnJheShsKSB7XHJcblx0XHRcdHZhciBuID0gW107XHJcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgbC5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRcdGZvciAodmFyIGogPSAwOyBqIDwgbFtpXS5sZW5ndGg7IGorKykge1xyXG5cdFx0XHRcdFx0aWYgKHR5cGVvZiBsW2ldW2pdICE9IFwibnVtYmVyXCIpXHJcblx0XHRcdFx0XHRcdHRocm93IG5ldyBFcnJvcihcIkNvdWxkIG5vdCBub3JtYWxpemUgbG9jYXRpb24ocykgb2YgXCIrdGhpcy5pZCtcIiFcIik7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdG4ucHVzaChfX3BhcnNlQXNOdW1iZXJBcnJheShsW2ldKSk7XHJcblx0XHRcdH1cclxuXHRcdFx0cmV0dXJuIG47XHJcblx0XHR9XHJcblx0fSxcclxuXHRcclxufSk7XHJcbm1vZHVsZS5leHBvcnRzID0gRXZlbnQ7XHJcblxyXG5FdmVudC5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPVxyXG5FdmVudC5wcm90b3R5cGUub24gPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xyXG5cdGlmICgkLmluQXJyYXkodHlwZSwgX19FVkVOVF9UWVBFU19fKSA9PSAtMSkge1xyXG5cdFx0Y29uc29sZS5lcnJvcihcIk1hcCBFdmVudFwiLCB0aGlzLnRvU3RyaW5nKCksIFwicmVnaXN0ZXJpbmcgZW1pdHRlZCBldmVudCB0eXBlXCIsIFxyXG5cdFx0XHR0eXBlLCBcIndoaWNoIGlzIG5vdCBhIHZhbGlkIGVtaXR0ZWQgZXZlbnQgdHlwZSFcIik7XHJcblx0fVxyXG5cdEV2ZW50RW1pdHRlci5wcm90b3R5cGUub24uY2FsbCh0aGlzLCB0eXBlLCBsaXN0ZW5lcik7XHJcbn1cclxuXHJcbi8vIFRoZSBmb2xsb3dpbmcgaXMgYSBsaXN0IG9mIGV2ZW50cyB0aGUgYmFzZSBFdmVudCBjbGFzcyBhbmQgbGlicmFyeSBlbWl0XHJcbi8vIFRoaXMgbGlzdCBpcyBjaGVja2VkIGFnYWluc3Qgd2hlbiByZWdpc3RlcmluZyB0byBjYXRjaCBtaXNzcGVsbGluZ3MuXHJcbnZhciBfX0VWRU5UX1RZUEVTX18gPSBbXHJcblx0XCJlbnRlcmluZy10aWxlXCIsIC8vKGZyb20tZGlyKSBcclxuXHRcdC8vZW1pdHRlZCB1cG9uIHRoZSBwbGF5ZXIgaXMgZ2l2ZW4gdGhlIGdvIGFoZWFkIHRvIGVudGVyIHRoZSB0aWxlIHRoaXMgZXZlbnQgb2NjdXBpZXMuXHJcblx0XCJlbnRlcmVkLXRpbGVcIiwgLy8oZnJvbS1kaXIpXHJcblx0XHQvL2VtaXR0ZWQgdXBvbiB0aGUgcGxheWVyIGxhbmRpbmcgb24gdGhlIHRpbGUgdGhpcyBldmVudCBvY2N1cGllcy5cclxuXHRcImxlYXZpbmctdGlsZVwiLCAvLyh0by1kaXIpXHJcblx0XHQvL2VtaXR0ZWQgdXBvbiB0aGUgcGxheWVyIGlzIGdpdmVuIHRoZSBnbyBhaGVhZCB0byBsZWF2ZSB0aGUgdGlsZSB0aGlzIGV2ZW50IG9jY3VwaWVzLlxyXG5cdFwibGVmdC10aWxlXCIsIC8vKHRvLWRpcilcclxuXHRcdC8vZW1pdHRlZCB1cG9uIHRoZSBwbGF5ZXIgY29tcGxldGVseSBsZWF2aW5nIHRoZSB0aWxlIHRoaXMgZXZlbnQgb2NjdXBpZXMuXHJcblx0XCJidW1wZWRcIiwgLy8oZnJvbS1kaXIpXHJcblx0XHQvL2VtaXR0ZWQgdXBvbiB0aGUgcGxheWVyIGlzIGRlbmllZCBlbnRyeSBpbnRvIHRoZSB0aWxlIHRoaXMgZXZlbnQgb2NjdXBpZXMuXHJcblx0XCJpbnRlcmFjdGVkXCIsIC8vKGZyb20tZGlyKVxyXG5cdFx0Ly9lbWl0dGVkIHdoZW4gdGhlIHBsYXllciBpbnRlcmFjdHMgd2l0aCB0aGlzIGV2ZW50IGZyb20gYW4gYWRqYWNlbnQgdGlsZVxyXG5cdFwidGlja1wiLCAvLyhkZWx0YSlcclxuXHRcdC8vZW1pdHRlZCBldmVyeSBnYW1lIHRpY2tcclxuXHRcImNsaWNrZWRcIiwgLy8oeCwgeSlcclxuXHRcdC8vZW1pdHRlZCB3aGVuIHRoZSBtb3VzZSBpcyBjbGlja2VkIG9uIHRoaXMgZXZlbnQgKGFuZCBpdCBpcyBkZXRlcm1pbmVkIGl0IGlzIHRoaXMgZXZlbnQpXHJcblx0XCJjbGlja2VkLXRocm91Z2hcIiwgLy8oeCwgeSlcclxuXHRcdC8vZW1pdHRlZCB3aGVuIHRoZSBtb3VzZSBpcyBjbGlja2VkIG9uIHRoaXMgZXZlbnQgKGFuZCB0aGUgcmF5dHJhY2UgaXMgcGFzc2luZyB0aHJvdWdoIFxyXG5cdFx0Ly8gdGhpcyBldmVudCBkdXJpbmcgdGhlIGRldGVybWluaW5nIHBoYXNlKVxyXG5cdFwibW92aW5nXCIsIC8vKHNyY1gsIHNyY1ksIGRlc3RYLCBkZXN0WSlcclxuXHRcdC8vZW1pdHRlZCB3aGVuIHRoaXMgZXZlbnQgYmVnaW5zIG1vdmluZyB0byBhIG5ldyB0aWxlXHJcblx0XCJtb3ZlZFwiLCAvLyhzcmNYLCBzcmNZLCBkZXN0WCwgZGVzdFkpXHJcblx0XHQvL2VtaXR0ZWQgd2hlbiB0aGlzIGV2ZW50IGZpbmlzaGVzIG1vdmluZyB0byBhIG5ldyB0aWxlXHJcblx0XCJjYW50LW1vdmVcIiwgLy8oc3JjWCwgc3JjWSwgZGVzdFgsIGRlc3RZLCByZWFzb25FdmVudClcclxuXHRcdC8vZW1pdHRlZCB3aGVuIHRoaXMgZXZlbnQgaXMgZGVuaWVkIG1vdmVtZW50IHRvIHRoZSByZXF1ZXN0ZWQgdGlsZVxyXG5cdFx0Ly8gSXQgaXMgcGFzc2VkIHRoZSBldmVudCBibG9ja2luZyBpdCwgb3IgbnVsbCBpZiBpdCBpcyBkdWUgdG8gdGhlIGNvbGxpc2lvbiBtYXBcclxuXHRcImFuaW0tZW5kXCIsIC8vKGFuaW1hdGlvbk5hbWUpXHJcblx0XHQvL2VtaXR0ZWQgd2hlbiB0aGlzIGV2ZW50J3MgYW5pbWF0aW9uIGVuZHNcclxuXHRcImNyZWF0ZWRcIiwgXHJcblx0XHQvL2VtaXR0ZWQgd2hlbiB0aGlzIGV2ZW50IGlzIGFkZGVkIHRvIHRoZSBldmVudCBtYXBcclxuXHRcImRlc3Ryb3llZFwiLFxyXG5cdFx0Ly9lbWl0dGVkIHdoZW4gdGhpcyBldmVudCBoYXMgYmVlbiB0YWtlbiBvdXQgb2YgdGhlIGV2ZW50IG1hcFxyXG5cdFwicmVhY3RcIiwgLy8oaWQsIGRpc3RhbmNlKVxyXG5cdFx0Ly9lbWl0dGVkIHdoZW4gYW5vdGhlciBldmVudCBvbiB0aGUgbWFwIHRyYW5zbWl0cyBhIHJlYWN0YWJsZSBldmVudFxyXG5cdFwibWVzc2FnZVwiLCAvLyhpZCwgLi4uKVxyXG5cdFx0Ly9uZXZlciBlbWl0dGVkIGJ5IHRoZSBsaWJyYXJ5LCB0aGlzIGV2ZW50IHR5cGUgY2FuIGJlIHVzZWQgZm9yIGNyb3NzLWV2ZW50IG1lc3NhZ2VzXHJcbl07XHJcbiIsIi8vIHBsYXllci1jaGFyYWN0ZXIuanNcclxuLy8gRGVmaW5lcyB0aGUgY29uY3JldGUgY29kZSBmb3IgYSBQbGF5ZXIgQ2hhcmFjdGVyIGluIHRoZSB3b3JsZFxyXG5cclxudmFyIEFjdG9yID0gcmVxdWlyZShcInRwcC1hY3RvclwiKTtcclxudmFyIGNvbnRyb2xsZXIgPSByZXF1aXJlKFwidHBwLWNvbnRyb2xsZXJcIik7XHJcbnZhciBpbmhlcml0cyA9IHJlcXVpcmUoXCJpbmhlcml0c1wiKTtcclxudmFyIGV4dGVuZCA9IHJlcXVpcmUoXCJleHRlbmRcIik7XHJcblxyXG4vKipcclxuICovXHJcbmZ1bmN0aW9uIFBsYXllckNoYXIoKXtcclxuXHRBY3Rvci5jYWxsKHRoaXMsIHt9LCB7fSk7XHJcblx0XHJcblx0dGhpcy5vbihcInRpY2tcIiwgdGhpcy5jb250cm9sQ2hhcmFjdGVyKTtcclxuXHR0aGlzLm9uKFwiY2FudC1tb3ZlXCIsIHRoaXMuYW5pbWF0ZUJ1bXApO1xyXG59XHJcbmluaGVyaXRzKFBsYXllckNoYXIsIEFjdG9yKTtcclxuZXh0ZW5kKFBsYXllckNoYXIucHJvdG90eXBlLCB7XHJcblx0aWQgOiBcIlBMQVlFUkNIQVJcIixcclxuXHRsb2NhdGlvbiA6IG5ldyBUSFJFRS5WZWN0b3IzKCksXHJcblx0XHJcblx0c3ByaXRlOiBudWxsLFxyXG5cdFxyXG5cdHJlc2V0IDogZnVuY3Rpb24oKSB7XHJcblx0XHR0aGlzLmxvY2F0aW9uLnNldCgwLCAwLCAwKTtcclxuXHR9LFxyXG5cdFxyXG5cdHdhcnBBd2F5IDogZnVuY3Rpb24oYW5pbVR5cGUpIHtcclxuXHRcdGNvbnNvbGUud2FybihcIndhcnBBd2F5IGlzIG5vdCB5ZXQgaW1wbGVtZW50ZWQhXCIpO1xyXG5cdH0sXHJcblx0XHJcblx0d2FycFRvIDogZnVuY3Rpb24od2FycGRlZikge1xyXG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xyXG5cdFx0dGhpcy5sb2NhdGlvbi5zZXQod2FycGRlZi5sb2NbMF0sIHdhcnBkZWYubG9jWzFdLCB3YXJwZGVmLmxheWVyKTtcclxuXHRcdFxyXG5cdFx0aWYgKCF3YXJwZGVmLmFuaW0pXHJcblx0XHRcdGNvbnRyb2xsZXIucHVzaElucHV0Q29udGV4dChcImN1dHNjZW5lXCIpO1xyXG5cdFx0Ly9UT0RPIHdhcnBkZWYuYW5pbVxyXG5cdFx0XHJcblx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XHJcblx0XHRcdHN3aXRjaChOdW1iZXIod2FycGRlZi5hbmltKSkgeyAvL1dhcnAgYW5pbWF0aW9uXHJcblx0XHRcdFx0Y2FzZSAxOiBzZWxmLmF2YXRhcl9ub2RlLnBvc2l0aW9uLnogKz0gMTsgYnJlYWs7IC8vIFdhbGsgdXBcclxuXHRcdFx0XHRjYXNlIDI6IHNlbGYuYXZhdGFyX25vZGUucG9zaXRpb24ueiAtPSAxOyBicmVhazsgLy8gV2FsayBkb3duXHJcblx0XHRcdFx0Y2FzZSAzOiBzZWxmLmF2YXRhcl9ub2RlLnBvc2l0aW9uLnggLT0gMTsgYnJlYWs7IC8vIFdhbGsgbGVmdFxyXG5cdFx0XHRcdGNhc2UgNDogc2VsZi5hdmF0YXJfbm9kZS5wb3NpdGlvbi54ICs9IDE7IGJyZWFrOyAvLyBXYWxrIGRvd25cclxuXHRcdFx0XHRjYXNlIDU6IHNlbGYuYXZhdGFyX25vZGUucG9zaXRpb24ueSArPSAxNTsgYnJlYWs7IC8vIFdhcnAgaW5cclxuXHRcdFx0fVxyXG5cdFx0fSwgMCk7XHJcblx0XHRcclxuXHRcdGN1cnJlbnRNYXAucXVldWVGb3JNYXBTdGFydChmdW5jdGlvbigpe1xyXG5cdFx0XHRjb25zb2xlLmxvZyhcIldBUlAgREVGXCIsIHdhcnBkZWYpO1xyXG5cdFx0XHR2YXIgYW5pbU5hbWUgPSBudWxsO1xyXG5cdFx0XHR2YXIgeCA9IHNlbGYubG9jYXRpb24ueDtcclxuXHRcdFx0dmFyIHkgPSBzZWxmLmxvY2F0aW9uLnk7XHJcblx0XHRcdHZhciBsYXllciA9IHNlbGYubG9jYXRpb24uejtcclxuXHRcdFx0dmFyIHlfb2ZmID0gMDtcclxuXHRcdFx0dmFyIG1zcGQgPSAxLCBhc3BkID0gMTsgLy9tb3ZlbWVudCBzcGVlZCwgYW5pbWF0aW9uIHNwZWVkXHJcblx0XHRcdHZhciBhbmltRW5kRXZlbnQgPSBcImFuaW0tZW5kXCI7XHJcblx0XHRcdFxyXG5cdFx0XHRzd2l0Y2goTnVtYmVyKHdhcnBkZWYuYW5pbSkpIHsgLy9XYXJwIGFuaW1hdGlvblxyXG5cdFx0XHRcdGNhc2UgMDogYnJlYWs7IC8vIEFwcGVhclxyXG5cdFx0XHRcdGNhc2UgMTogeSsrOyBhbmltTmFtZSA9IFwid2Fsa1wiOyBtc3BkID0gMC4zNTsgYXNwZCA9IDAuMzU7IGJyZWFrOyAvLyBXYWxrIHVwXHJcblx0XHRcdFx0Y2FzZSAyOiB5LS07IGFuaW1OYW1lID0gXCJ3YWxrXCI7IG1zcGQgPSAwLjM1OyBhc3BkID0gMC4zNTsgYnJlYWs7IC8vIFdhbGsgZG93blxyXG5cdFx0XHRcdGNhc2UgMzogeC0tOyBhbmltTmFtZSA9IFwid2Fsa1wiOyBtc3BkID0gMC4zNTsgYXNwZCA9IDAuMzU7IGJyZWFrOyAvLyBXYWxrIGxlZnRcclxuXHRcdFx0XHRjYXNlIDQ6IHgrKzsgYW5pbU5hbWUgPSBcIndhbGtcIjsgbXNwZCA9IDAuMzU7IGFzcGQgPSAwLjM1OyBicmVhazsgLy8gV2FsayBkb3duXHJcblx0XHRcdFx0Y2FzZSA1OiAvLyBXYXJwIGluXHJcblx0XHRcdFx0XHRhbmltTmFtZSA9IFwid2FycF9pblwiOyBcclxuXHRcdFx0XHRcdHlfb2ZmID0gMTU7IGFuaW1FbmRFdmVudCA9IFwibW92ZWRcIjtcclxuXHRcdFx0XHRcdG1zcGQgPSAwLjI1OyBhc3BkID0gMTsgXHJcblx0XHRcdFx0XHRicmVhazsgXHJcblx0XHRcdFx0ZGVmYXVsdDogXHJcblx0XHRcdFx0XHRjb25zb2xlLndhcm4oXCJJTExFR0FMIFdBUlAgQU5JTUFUSU9OOlwiLCB3YXJwZGVmLmFuaW0pO1xyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHR2YXIgc3JjID0gc2VsZi5sb2NhdGlvbjtcclxuXHRcdFx0dmFyIHN0YXRlID0gc2VsZi5faW5pdFBhdGhpbmdTdGF0ZSgpO1xyXG5cdFx0XHRcclxuXHRcdFx0aWYgKHNyYy54LXggfHwgeS1zcmMueSkgXHJcblx0XHRcdFx0c2VsZi5mYWNpbmcuc2V0KHgtc3JjLngsIDAsIHNyYy55LXkpO1xyXG5cdFx0XHRlbHNlXHJcblx0XHRcdFx0c2VsZi5mYWNpbmcuc2V0KDAsIDAsIDEpO1xyXG5cdFx0XHRcclxuXHRcdFx0c3RhdGUuc3JjTG9jQy5zZXQoeCwgeSwgbGF5ZXIpO1xyXG5cdFx0XHRzdGF0ZS5zcmNMb2MzLnNldChjdXJyZW50TWFwLmdldDNEVGlsZUxvY2F0aW9uKHgsIHksIGxheWVyKSkueSArPSB5X29mZjtcclxuXHRcdFx0c3RhdGUuZGVzdExvY0Muc2V0KHNyYyk7XHJcblx0XHRcdHN0YXRlLmRlc3RMb2MzLnNldChjdXJyZW50TWFwLmdldDNEVGlsZUxvY2F0aW9uKHNyYykpO1xyXG5cdFx0XHRzdGF0ZS5kZWx0YSA9IDA7XHJcblx0XHRcdHN0YXRlLm1vdmluZyA9IHRydWU7XHJcblx0XHRcdHN0YXRlLnNwZWVkID0gbXNwZDtcclxuXHRcdFx0XHJcblx0XHRcdHNlbGYucGxheUFuaW1hdGlvbihhbmltTmFtZSwgeyBzcGVlZDogYXNwZCB9KTtcclxuXHRcdFx0c2VsZi5vbmNlKGFuaW1FbmRFdmVudCwgZnVuY3Rpb24oYW5pbWF0aW9uTmFtZSl7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coXCJQb3AhXCIpO1xyXG5cdFx0XHRcdGNvbnRyb2xsZXIucG9wSW5wdXRDb250ZXh0KFwiY3V0c2NlbmVcIik7XHJcblx0XHRcdH0pO1xyXG5cdFx0XHQvL3NlbGYuYXZhdGFyX25vZGUucG9zaXRpb24uc2V0KCBjdXJyZW50TWFwLmdldDNEVGlsZUxvY2F0aW9uKHNlbGYubG9jYXRpb24pICk7XHJcblx0XHR9KTtcclxuXHR9LFxyXG5cdFxyXG5cdGNvbnRyb2xUaW1lb3V0OiAwLjAsXHJcblx0Y29udHJvbENoYXJhY3RlciA6IGZ1bmN0aW9uKGRlbHRhKSB7XHJcblx0XHR2YXIgeSA9ICgoY29udHJvbGxlci5pc0Rvd24oXCJVcFwiLCBcImdhbWVcIikpPyAtMTowKSArICgoY29udHJvbGxlci5pc0Rvd24oXCJEb3duXCIsIFwiZ2FtZVwiKSk/IDE6MCk7XHJcblx0XHR2YXIgeCA9ICgoY29udHJvbGxlci5pc0Rvd24oXCJMZWZ0XCIsIFwiZ2FtZVwiKSk/IC0xOjApICsgKChjb250cm9sbGVyLmlzRG93bihcIlJpZ2h0XCIsIFwiZ2FtZVwiKSk/IDE6MCk7XHJcblx0XHRcclxuXHRcdGlmIChjb250cm9sbGVyLmlzRG93bk9uY2UoXCJJbnRlcmFjdFwiLCBcImdhbWVcIikgJiYgIXRoaXMuX2luaXRQYXRoaW5nU3RhdGUoKS5tb3ZpbmcpIHtcclxuXHRcdFx0Y3VycmVudE1hcC5kaXNwYXRjaChcclxuXHRcdFx0XHR0aGlzLmxvY2F0aW9uLnggLSB0aGlzLmZhY2luZy54LCB0aGlzLmxvY2F0aW9uLnkgKyB0aGlzLmZhY2luZy56LCBcclxuXHRcdFx0XHRcImludGVyYWN0ZWRcIiwgdGhpcy5mYWNpbmcpO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHRpZiAoKHkgfHwgeCkgJiYgISh4ICYmIHkpKSB7IC8vb25lLCBidXQgbm90IGJvdGhcclxuXHRcdFx0aWYgKHRoaXMuY29udHJvbFRpbWVvdXQgPCAxKSB7XHJcblx0XHRcdFx0dGhpcy5jb250cm9sVGltZW91dCArPSBDT05GSUcudGltZW91dC53YWxrQ29udHJvbCAqIGRlbHRhO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdGlmICghdGhpcy5faW5pdFBhdGhpbmdTdGF0ZSgpLm1vdmluZykge1xyXG5cdFx0XHRcdFx0dGhpcy5mYWNlRGlyKHgsIHkpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRpZiAoIXRoaXMuX2luaXRQYXRoaW5nU3RhdGUoKS5tb3ZpbmcpIHtcclxuXHRcdFx0XHRcdHRoaXMubW92ZVRvKHRoaXMubG9jYXRpb24ueCt4LCB0aGlzLmxvY2F0aW9uLnkreSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRpZiAodGhpcy5jb250cm9sVGltZW91dCA+IDApXHJcblx0XHRcdFx0dGhpcy5jb250cm9sVGltZW91dCAtPSBDT05GSUcudGltZW91dC53YWxrQ29udHJvbCAqIGRlbHRhO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0fSxcclxuXHRcclxuXHRhbmltYXRlQnVtcCA6IGZ1bmN0aW9uKHNyY3gsIHNyY3ksIHgsIHksIHJlYXNvbikge1xyXG5cdFx0Ly8gY29uc29sZS53YXJuKHRoaXMuaWQsIFwiOiBDYW5ub3Qgd2FsayB0byBsb2NhdGlvblwiLCBcIihcIit4K1wiLFwiK3krXCIpXCIpO1xyXG5cdFx0dGhpcy5wbGF5QW5pbWF0aW9uKFwiYnVtcFwiLCB7IHN0b3BOZXh0VHJhbnNpdGlvbjogdHJ1ZSB9KTtcclxuXHR9LFxyXG5cdFxyXG5cdFxyXG5cdC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cdGlzTlBDIDogZnVuY3Rpb24oKXsgcmV0dXJuIGZhbHNlOyB9LFxyXG5cdFxyXG5cdF9hdmF0YXJfbG9hZFNwcml0ZSA6IGZ1bmN0aW9uKG1hcCwgdGV4dHVyZSkge1xyXG5cdFx0dmFyIHVybCA9IEJBU0VVUkwrXCIvaW1nL3Bjcy9cIisgZ2FtZVN0YXRlLnBsYXllclNwcml0ZTtcclxuXHRcdHZhciByZXMgPSAvXihbXlxcW10rKVxcWyhbXlxcXV0rKVxcXS5wbmckLy5leGVjKHVybCk7XHJcblx0XHRcclxuXHRcdHZhciBuYW1lID0gcmVzWzFdO1xyXG5cdFx0dmFyIGZvcm1hdCA9IHJlc1syXTtcclxuXHRcdFxyXG5cdFx0dmFyIGltZyA9IG5ldyBJbWFnZSgpO1xyXG5cdFx0Zm9ybWF0ID0gdGhpcy5nZXRTcHJpdGVGb3JtYXQoZm9ybWF0KTtcclxuXHRcdHRoaXMuX19vbkxvYWRTcHJpdGUoaW1nLCBmb3JtYXQsIHRleHR1cmUpO1xyXG5cdFx0aW1nLnNyYyA9IHVybDtcclxuXHR9LFxyXG5cdFxyXG5cdC8vIE5ldXRlciB0aGUgbG9jYXRpb24gbm9ybWlsaXphdGlvbiBmb3IgdGhpcyBraW5kIG9mIGV2ZW50XHJcblx0X25vcm1hbGl6ZUxvY2F0aW9uIDogZnVuY3Rpb24oKSB7fSxcclxuXHRcclxufSk7XHJcbm1vZHVsZS5leHBvcnRzID0gUGxheWVyQ2hhcjtcclxuIiwiLy8gdHJpZ2dlci5qc1xyXG4vLyBEZWZpbmVzIGEgdHJpZ2dlciB0aWxlKHMpIHVzZWQgdGhyb3VnaG91dCB0aGUgcGFya1xyXG5cclxudmFyIEV2ZW50ID0gcmVxdWlyZShcInRwcC1ldmVudFwiKTtcclxudmFyIGluaGVyaXRzID0gcmVxdWlyZShcImluaGVyaXRzXCIpO1xyXG52YXIgZXh0ZW5kID0gcmVxdWlyZShcImV4dGVuZFwiKTtcclxuXHJcbi8qKlxyXG4gKiBBIHRyaWdnZXIgaXMgYSB0aWxlIHRoYXQsIHdoZW4gc3RlcHBlZCB1cG9uLCB3aWxsIHRyaWdnZXIgc29tZSBldmVudC5cclxuICogVGhlIG1vc3QgY29tbW9uIGV2ZW50IHRpZ2dlcmVkIGlzIGEgd2FycGluZyB0byBhbm90aGVyIG1hcCwgZm9yIHdoaWNoXHJcbiAqIHRoZSBzdWJjbGFzcyBXYXJwIGlzIGRlc2lnbmVkIGZvci5cclxuICpcclxuICogVHJpZ2dlcnMgbWF5IHRha2UgdXAgbW9yZSB0aGFuIG9uZSBzcGFjZS5cclxuICovXHJcbmZ1bmN0aW9uIFRyaWdnZXIoYmFzZSwgb3B0cykge1xyXG5cdEV2ZW50LmNhbGwodGhpcywgYmFzZSwgb3B0cyk7XHJcblx0XHJcblx0dGhpcy5vbihcImVudGVyZWQtdGlsZVwiLCB0aGlzLm9uVHJpZ2dlckVudGVyKTtcclxuXHR0aGlzLm9uKFwibGVhdmluZy10aWxlXCIsIHRoaXMub25UcmlnZ2VyTGVhdmUpO1xyXG59XHJcbmluaGVyaXRzKFRyaWdnZXIsIEV2ZW50KTtcclxuZXh0ZW5kKFRyaWdnZXIucHJvdG90eXBlLCB7XHJcblx0XHJcblx0b25UcmlnZ2VyRW50ZXIgOiBmdW5jdGlvbihkaXIpIHtcclxuXHRcdGNvbnNvbGUubG9nKFwiVHJpZ2dlcmVkIVwiKTtcclxuXHR9LFxyXG5cdG9uVHJpZ2dlckxlYXZlIDogZnVuY3Rpb24oZGlyKSB7XHJcblx0XHRcclxuXHR9LFxyXG59KTtcclxubW9kdWxlLmV4cG9ydHMgPSBUcmlnZ2VyO1xyXG4iLCIvLyB3YXJwLmpzXHJcbi8vIERlZmluZXMgYSB3YXJwIHRpbGUgdXNlZCB0aHJvdWdob3V0IHRoZSBwYXJrLlxyXG5cclxudmFyIFRyaWdnZXIgPSByZXF1aXJlKFwidHBwLXRyaWdnZXJcIik7XHJcbnZhciBpbmhlcml0cyA9IHJlcXVpcmUoXCJpbmhlcml0c1wiKTtcclxudmFyIGV4dGVuZCA9IHJlcXVpcmUoXCJleHRlbmRcIik7XHJcblxyXG4vKipcclxuICogQSB3YXJwIGlzIGFuIGV2ZW50IHRoYXQsIHdoZW4gd2Fsa2VkIHVwb24sIHdpbGwgdGFrZSB0aGUgcGxheWVyIHRvIGFub3RoZXIgbWFwIG9yXHJcbiAqIGFyZWEgd2l0aGluIHRoZSBzYW1lIG1hcC4gRGlmZmVyZW50IHR5cGVzIG9mIHdhcnBzIGV4aXN0LCByYW5naW5nIGZyb20gdGhlIHN0YW5kYXJkXHJcbiAqIGRvb3Igd2FycCB0byB0aGUgdGVsZXBvcnQgd2FycC4gV2FycHMgY2FuIGJlIHRvbGQgdG8gYWN0aXZhdGUgdXBvbiBzdGVwcGluZyB1cG9uIHRoZW1cclxuICogb3IgYWN0aXZhdGUgdXBvbiBzdGVwcGluZyBvZmYgYSBjZXJ0YWluIGRpcmVjdGlvbi5cclxuICovXHJcbmZ1bmN0aW9uIFdhcnAoYmFzZSwgb3B0cykge1xyXG5cdFRyaWdnZXIuY2FsbCh0aGlzLCBiYXNlLCBvcHRzKTtcclxuXHRcclxufVxyXG5pbmhlcml0cyhXYXJwLCBUcmlnZ2VyKTtcclxuZXh0ZW5kKFdhcnAucHJvdG90eXBlLCB7XHJcblx0c291bmQ6IFwiZXhpdF93YWxrXCIsXHJcblx0XHJcblx0b25UcmlnZ2VyRW50ZXIgOiBmdW5jdGlvbihkaXIpIHtcclxuXHRcdFNvdW5kTWFuYWdlci5wbGF5U291bmQodGhpcy5zb3VuZCk7XHJcblx0fSxcclxufSk7XHJcbm1vZHVsZS5leHBvcnRzID0gV2FycDsiXX0=
