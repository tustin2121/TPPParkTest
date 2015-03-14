(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// chatot.js
// Defines the script for the Chat Simulation Tester

require("../polyfill.js");
window.THREE = {
	Mesh: function(){},
	Object3D: function(){},
	Material: function(){},
	ShaderMaterial: function(){},
	BasicMaterial: function(){},
	Matrix4: function(){},
	Geometry: function(){},
	Vector3: function(){},
	Vector2: function(){},
	Face3: function(){},
	Texture: function(){},
	Color: function(){},
	Scene: function(){},
};

var renderLoop = require("../model/renderloop");

// require("../globals");
// window.Chat = require("../chat/chat-core.js");
window.gameState = require("../gamestate");

// On Ready
$(function(){
	
	renderLoop.start({
		_disableThree: true,
		ticksPerSecond : 20,
	});
	
	Chat.initChatSpawnLoop();
	
});
},{"../gamestate":5,"../model/renderloop":6,"../polyfill.js":7}],2:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canMutationObserver = typeof window !== 'undefined'
    && window.MutationObserver;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    var queue = [];

    if (canMutationObserver) {
        var hiddenDiv = document.createElement("div");
        var observer = new MutationObserver(function () {
            var queueList = queue.slice();
            queue.length = 0;
            queueList.forEach(function (fn) {
                fn();
            });
        });

        observer.observe(hiddenDiv, { attributes: true });

        return function nextTick(fn) {
            if (!queue.length) {
                hiddenDiv.setAttribute('yes', 'no');
            }
            queue.push(fn);
        };
    }

    if (canPost) {
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],3:[function(require,module,exports){
var now = require('performance-now')
  , global = typeof window === 'undefined' ? {} : window
  , vendors = ['moz', 'webkit']
  , suffix = 'AnimationFrame'
  , raf = global['request' + suffix]
  , caf = global['cancel' + suffix] || global['cancelRequest' + suffix]
  , isNative = true

for(var i = 0; i < vendors.length && !raf; i++) {
  raf = global[vendors[i] + 'Request' + suffix]
  caf = global[vendors[i] + 'Cancel' + suffix]
      || global[vendors[i] + 'CancelRequest' + suffix]
}

// Some versions of FF have rAF but not cAF
if(!raf || !caf) {
  isNative = false

  var last = 0
    , id = 0
    , queue = []
    , frameDuration = 1000 / 60

  raf = function(callback) {
    if(queue.length === 0) {
      var _now = now()
        , next = Math.max(0, frameDuration - (_now - last))
      last = next + _now
      setTimeout(function() {
        var cp = queue.slice(0)
        // Clear queue here to prevent
        // callbacks from appending listeners
        // to the current frame's queue
        queue.length = 0
        for(var i = 0; i < cp.length; i++) {
          if(!cp[i].cancelled) {
            try{
              cp[i].callback(last)
            } catch(e) {
              setTimeout(function() { throw e }, 0)
            }
          }
        }
      }, Math.round(next))
    }
    queue.push({
      handle: ++id,
      callback: callback,
      cancelled: false
    })
    return id
  }

  caf = function(handle) {
    for(var i = 0; i < queue.length; i++) {
      if(queue[i].handle === handle) {
        queue[i].cancelled = true
      }
    }
  }
}

module.exports = function(fn) {
  // Wrap in a new function to prevent
  // `cancel` potentially being assigned
  // to the native rAF function
  if(!isNative) {
    return raf.call(global, fn)
  }
  return raf.call(global, function() {
    try{
      fn.apply(this, arguments)
    } catch(e) {
      setTimeout(function() { throw e }, 0)
    }
  })
}
module.exports.cancel = function() {
  caf.apply(global, arguments)
}

},{"performance-now":4}],4:[function(require,module,exports){
(function (process){
// Generated by CoffeeScript 1.6.3
(function() {
  var getNanoSeconds, hrtime, loadTime;

  if ((typeof performance !== "undefined" && performance !== null) && performance.now) {
    module.exports = function() {
      return performance.now();
    };
  } else if ((typeof process !== "undefined" && process !== null) && process.hrtime) {
    module.exports = function() {
      return (getNanoSeconds() - loadTime) / 1e6;
    };
    hrtime = process.hrtime;
    getNanoSeconds = function() {
      var hr;
      hr = hrtime();
      return hr[0] * 1e9 + hr[1];
    };
    loadTime = getNanoSeconds();
  } else if (Date.now) {
    module.exports = function() {
      return Date.now() - loadTime;
    };
    loadTime = Date.now();
  } else {
    module.exports = function() {
      return new Date().getTime() - loadTime;
    };
    loadTime = new Date().getTime();
  }

}).call(this);

/*
//@ sourceMappingURL=performance-now.map
*/

}).call(this,require('_process'))

},{"_process":2}],5:[function(require,module,exports){
// gamestate.js
// 

$.cookie.json = true;

var gameState =
module.exports = {
	load: function() {
		var saved = $.cookie({path: BASEURL});
		gameState.playerSprite = saved.playerSprite;
		gameState.mapTransition = saved.mapTransition;
		
		gameState.infodex.register = JSON.parse($.base64.decode(saved.infodex));
	},
	
	saveLocation: function(opts) {
		//Insert items to be saved here
		var o = {
			nextMap: opts.map || opts.nextMap || gameState.mapTransition.nextMap,
			warp: opts.warp || gameState.mapTransition.warp,
			animOverride: 
				(opts.anim !== undefined)? opts.anim : 
				(opts.animOverride !== undefined)? opts.animOverride : 
				gameState.mapTransition.animOverride,
		}
		$.cookie("mapTransition", o, {path: BASEURL});
	},
	
	////////////////////////////////////////////////////////////////
	// Map Transition
	mapTransition : {
		nextMap : "iChurchOfHelix",
		warp: 0x10,
		animOverride: 0,
	},
	
	playerSprite : "melody[hg_vertmix-32].png",
	
};

// Infodex functions
gameState.infodex = {
	register: {},
	seen: 0,
	found: 0,
	
	__mark: function(container, url, mark) {
		var comp = url.shift();
		var old = container[comp];
		if (!url.length) {
			// We're at the end of the URL, this should be a leaf node
			if (!old) old = container[comp] = 0;
			if (typeof old !== "number") 
				throw new Error("URL does not point to leaf node!");
			container[comp] |= mark;
			return old;
			
		} else {
			//Still going down the url
			if (!old) old = container[comp] = {};
			return this.__mark(old, url, mark); //tail call
		}
	},
	
	markSeen: function(url) {
		// var comp = url.split(".");
		// var reg = gameState.infodex.register; //[url] |= 1; //set to at least 1
		
		// for (var i = 0; i < comp.length-1; i++) {
		// 	reg = reg[comp[i]] || {};
		// }
		// reg[]
		var res = this.__mark(this.register, url.split("."), 1);
		if (res == 0) { this.seen++; }
	},
	markFound: function(url) {
		// gameState.infodex[url] |= 2; //set to at least 2
		var res = this.__mark(this.register, url.split("."), 2);
		if (res == 0) { this.seen++; this.found++; }
		else if (res == 1) { this.found++; }
	},
	
	
	
};
},{}],6:[function(require,module,exports){
// renderloop.js
// The module that handles all the common code to render and do game ticks on a map

var extend = require("extend");
var raf = require("raf");
var controller = require("tpp-controller");

module.exports = {
	start : function(opts) {
		// Set the canvas's attributes, because those 
		// ACTUALLY determine how big the rendering area is.
		if (!opts._disableThree) {
			var canvas = $("#gamescreen");
			canvas.attr("width", parseInt(canvas.css("width")));
			canvas.attr("height", parseInt(canvas.css("height")));
			
			opts = extend({
				clearColor : 0x000000,
				ticksPerSecond : 30,
			}, opts);
			
			window.threeRenderer = new THREE.WebGLRenderer({
				antialias : true,
				canvas : document.getElementById("gamescreen") 
			});
			threeRenderer.setClearColorHex( opts.clearColor );
			threeRenderer.autoClear = false;
			
			threeRenderer.shadowMapEnabled = true;
			threeRenderer.shadowMapType = THREE.PCFShadowMap;
			
			_renderHandle = raf(renderLoop);
		}
		
		initGameLoop(30);
		
	},
	
	pause : function() {
		paused = true;
		// _renderHandle = null;
	},
	unpause : function() {
		paused = false;
		// _renderHandle = raf(renderLoop);
	},
};


var _renderHandle; 
function renderLoop() {
	threeRenderer.clear();
	
	if (window.currentMap && currentMap.scene && currentMap.camera) {
		//Render with the map's active camera on its active scene
		threeRenderer.render(currentMap.scene, currentMap.camera);
	}
	
	if (UI.scene && UI.camera) {
		//Render the UI with the UI camera and its scene
		threeRenderer.clear(false, true, false); //Clear depth buffer
		threeRenderer.render(UI.scene, UI.camera);
	}
	
	if (_renderHandle)
		_renderHandle = raf(renderLoop);
}

var paused = false;
function initGameLoop(ticksPerSec) {
	var _rate = 1000 / ticksPerSec;
	
	var accum = 0;
	var now = 0;
	var last = null;
	var dt = 0;
	var wholeTick;
	
	setInterval(timerTick, 0);
	
	function timerTick() {
		if (paused) {
			last = Date.now();
			accum = 0;
			return;
		}
		
		now = Date.now();
		dt = now - (last || now);
		last = now;
		accum += dt;
		if (accum < _rate) return;
		wholeTick = ((accum / _rate)|0);
		if (wholeTick <= 0) return;
		
		var delta = wholeTick / ticksPerSec;
		if (window.currentMap && currentMap.logicLoop)
			currentMap.logicLoop(delta);
		if (window.UI && UI.logicLoop)
			UI.logicLoop(delta);
		
		if (window.controller && controller._tick)
			controller._tick(delta);
		if (window.SoundManager && SoundManager._tick)
			SoundManager._tick(delta);
		
		wholeTick *= _rate;
		accum -= wholeTick;
	}
}
},{"extend":"extend","raf":3,"tpp-controller":"tpp-controller"}],7:[function(require,module,exports){
// polyfill.js
// Defines some polyfills needed for the game to function.

// String.startsWith()
// 
if (!String.prototype.startsWith) {
	Object.defineProperty(String.prototype, 'startsWith', {
		enumerable: false,
		configurable: false,
		writable: false,
		value: function(searchString, position) {
			position = position || 0;
			return this.lastIndexOf(searchString, position) === position;
		}
	});
}

if (!String.prototype.endsWith) {
	Object.defineProperty(String.prototype, 'endsWith', {
		enumerable: false,
		configurable: false,
		writable: false,
		value: function(searchString, position) {
			var subjectString = this.toString();
			if (position === undefined || position > subjectString.length) {
				position = subjectString.length;
			}
			position -= searchString.length;
			var lastIndex = subjectString.indexOf(searchString, position);
			return lastIndex !== -1 && lastIndex === position;
		}
	});
}

// EventTarget.on() and EventTarget.emit()
// Adding this to allow dom elements and objects to simply have "on" and "emit" used like node.js objects can
if (!EventTarget.prototype.on) {
	EventTarget.prototype.on = EventTarget.prototype.addEventListener;
	EventTarget.prototype.emit = EventTarget.prototype.dispatchEvent;
}

// Math.clamp()
// 
if (!Math.clamp) {
	Object.defineProperty(Math, "clamp", {
		enumerable: false,
		configurable: false,
		writable: false,
		value: function(num, min, max) {
			min = (min !== undefined)? min:0;
			max = (max !== undefined)? max:1;
			return Math.min(Math.max(num, min), max);
		}
	});
}

// Array.top
// Provides easy access to the "top" of a stack, made with push() and pop()
if (!Array.prototype.top) {
	Object.defineProperty(Array.prototype, "top", {
		enumerable: false,
		configurable: false,
		// set: function(){},
		get: function(){
			return this[this.length-1];
		},
	});
}


// Modifications to THREE.js
if (window.THREE) {
	// Vector3.set(), modified to accept another Vector3
	THREE.Vector3.prototype.set = function(x, y, z) {
		if (x instanceof THREE.Vector3) {
			this.x = x.x; this.y = x.y; this.z = x.z;
			return this;
		}
		if (x instanceof THREE.Vector2) {
			this.x = x.x; this.y = x.y; this.z = 0;
			return this;
		}
		
		this.x = x; this.y = y; this.z = z;
		return this;
	};
	
	// Also for Vector2
	THREE.Vector2.prototype.set = function(x, y) {
		if (x instanceof THREE.Vector2) {
			this.x = x.x; this.y = x.y;
			return this;
		}
		if (x instanceof THREE.Vector3) {
			this.x = x.x; this.y = x.y;
			return this;
		}
		
		this.x = x; this.y = y;
		return this;
	};
}



},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlc1xcYnJvd3NlcmlmeVxcbm9kZV9tb2R1bGVzXFxicm93c2VyLXBhY2tcXF9wcmVsdWRlLmpzIiwic3JjXFxqc1xcdG9vbHNcXGNoYXRvdC5qcyIsIm5vZGVfbW9kdWxlc1xcYnJvd3NlcmlmeVxcbm9kZV9tb2R1bGVzXFxwcm9jZXNzXFxicm93c2VyLmpzIiwibm9kZV9tb2R1bGVzXFxyYWZcXGluZGV4LmpzIiwibm9kZV9tb2R1bGVzL3JhZi9ub2RlX21vZHVsZXMvcGVyZm9ybWFuY2Utbm93L2xpYi9wZXJmb3JtYW5jZS1ub3cuanMiLCJzcmNcXGpzXFxnYW1lc3RhdGUuanMiLCJzcmNcXGpzXFxtb2RlbFxccmVuZGVybG9vcC5qcyIsInNyY1xcanNcXHBvbHlmaWxsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNoRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNwQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0dBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvLyBjaGF0b3QuanNcclxuLy8gRGVmaW5lcyB0aGUgc2NyaXB0IGZvciB0aGUgQ2hhdCBTaW11bGF0aW9uIFRlc3RlclxyXG5cclxucmVxdWlyZShcIi4uL3BvbHlmaWxsLmpzXCIpO1xyXG53aW5kb3cuVEhSRUUgPSB7XHJcblx0TWVzaDogZnVuY3Rpb24oKXt9LFxyXG5cdE9iamVjdDNEOiBmdW5jdGlvbigpe30sXHJcblx0TWF0ZXJpYWw6IGZ1bmN0aW9uKCl7fSxcclxuXHRTaGFkZXJNYXRlcmlhbDogZnVuY3Rpb24oKXt9LFxyXG5cdEJhc2ljTWF0ZXJpYWw6IGZ1bmN0aW9uKCl7fSxcclxuXHRNYXRyaXg0OiBmdW5jdGlvbigpe30sXHJcblx0R2VvbWV0cnk6IGZ1bmN0aW9uKCl7fSxcclxuXHRWZWN0b3IzOiBmdW5jdGlvbigpe30sXHJcblx0VmVjdG9yMjogZnVuY3Rpb24oKXt9LFxyXG5cdEZhY2UzOiBmdW5jdGlvbigpe30sXHJcblx0VGV4dHVyZTogZnVuY3Rpb24oKXt9LFxyXG5cdENvbG9yOiBmdW5jdGlvbigpe30sXHJcblx0U2NlbmU6IGZ1bmN0aW9uKCl7fSxcclxufTtcclxuXHJcbnZhciByZW5kZXJMb29wID0gcmVxdWlyZShcIi4uL21vZGVsL3JlbmRlcmxvb3BcIik7XHJcblxyXG4vLyByZXF1aXJlKFwiLi4vZ2xvYmFsc1wiKTtcclxuLy8gd2luZG93LkNoYXQgPSByZXF1aXJlKFwiLi4vY2hhdC9jaGF0LWNvcmUuanNcIik7XHJcbndpbmRvdy5nYW1lU3RhdGUgPSByZXF1aXJlKFwiLi4vZ2FtZXN0YXRlXCIpO1xyXG5cclxuLy8gT24gUmVhZHlcclxuJChmdW5jdGlvbigpe1xyXG5cdFxyXG5cdHJlbmRlckxvb3Auc3RhcnQoe1xyXG5cdFx0X2Rpc2FibGVUaHJlZTogdHJ1ZSxcclxuXHRcdHRpY2tzUGVyU2Vjb25kIDogMjAsXHJcblx0fSk7XHJcblx0XHJcblx0Q2hhdC5pbml0Q2hhdFNwYXduTG9vcCgpO1xyXG5cdFxyXG59KTsiLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG5wcm9jZXNzLm5leHRUaWNrID0gKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY2FuU2V0SW1tZWRpYXRlID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cuc2V0SW1tZWRpYXRlO1xuICAgIHZhciBjYW5NdXRhdGlvbk9ic2VydmVyID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cuTXV0YXRpb25PYnNlcnZlcjtcbiAgICB2YXIgY2FuUG9zdCA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnBvc3RNZXNzYWdlICYmIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyXG4gICAgO1xuXG4gICAgaWYgKGNhblNldEltbWVkaWF0ZSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGYpIHsgcmV0dXJuIHdpbmRvdy5zZXRJbW1lZGlhdGUoZikgfTtcbiAgICB9XG5cbiAgICB2YXIgcXVldWUgPSBbXTtcblxuICAgIGlmIChjYW5NdXRhdGlvbk9ic2VydmVyKSB7XG4gICAgICAgIHZhciBoaWRkZW5EaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICAgICAgICB2YXIgb2JzZXJ2ZXIgPSBuZXcgTXV0YXRpb25PYnNlcnZlcihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgcXVldWVMaXN0ID0gcXVldWUuc2xpY2UoKTtcbiAgICAgICAgICAgIHF1ZXVlLmxlbmd0aCA9IDA7XG4gICAgICAgICAgICBxdWV1ZUxpc3QuZm9yRWFjaChmdW5jdGlvbiAoZm4pIHtcbiAgICAgICAgICAgICAgICBmbigpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIG9ic2VydmVyLm9ic2VydmUoaGlkZGVuRGl2LCB7IGF0dHJpYnV0ZXM6IHRydWUgfSk7XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgICAgICBpZiAoIXF1ZXVlLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGhpZGRlbkRpdi5zZXRBdHRyaWJ1dGUoJ3llcycsICdubycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcXVldWUucHVzaChmbik7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgaWYgKGNhblBvc3QpIHtcbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBmdW5jdGlvbiAoZXYpIHtcbiAgICAgICAgICAgIHZhciBzb3VyY2UgPSBldi5zb3VyY2U7XG4gICAgICAgICAgICBpZiAoKHNvdXJjZSA9PT0gd2luZG93IHx8IHNvdXJjZSA9PT0gbnVsbCkgJiYgZXYuZGF0YSA9PT0gJ3Byb2Nlc3MtdGljaycpIHtcbiAgICAgICAgICAgICAgICBldi5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICBpZiAocXVldWUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZm4gPSBxdWV1ZS5zaGlmdCgpO1xuICAgICAgICAgICAgICAgICAgICBmbigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgICAgICBxdWV1ZS5wdXNoKGZuKTtcbiAgICAgICAgICAgIHdpbmRvdy5wb3N0TWVzc2FnZSgncHJvY2Vzcy10aWNrJywgJyonKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgc2V0VGltZW91dChmbiwgMCk7XG4gICAgfTtcbn0pKCk7XG5cbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcblxuLy8gVE9ETyhzaHR5bG1hbilcbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuIiwidmFyIG5vdyA9IHJlcXVpcmUoJ3BlcmZvcm1hbmNlLW5vdycpXG4gICwgZ2xvYmFsID0gdHlwZW9mIHdpbmRvdyA9PT0gJ3VuZGVmaW5lZCcgPyB7fSA6IHdpbmRvd1xuICAsIHZlbmRvcnMgPSBbJ21veicsICd3ZWJraXQnXVxuICAsIHN1ZmZpeCA9ICdBbmltYXRpb25GcmFtZSdcbiAgLCByYWYgPSBnbG9iYWxbJ3JlcXVlc3QnICsgc3VmZml4XVxuICAsIGNhZiA9IGdsb2JhbFsnY2FuY2VsJyArIHN1ZmZpeF0gfHwgZ2xvYmFsWydjYW5jZWxSZXF1ZXN0JyArIHN1ZmZpeF1cbiAgLCBpc05hdGl2ZSA9IHRydWVcblxuZm9yKHZhciBpID0gMDsgaSA8IHZlbmRvcnMubGVuZ3RoICYmICFyYWY7IGkrKykge1xuICByYWYgPSBnbG9iYWxbdmVuZG9yc1tpXSArICdSZXF1ZXN0JyArIHN1ZmZpeF1cbiAgY2FmID0gZ2xvYmFsW3ZlbmRvcnNbaV0gKyAnQ2FuY2VsJyArIHN1ZmZpeF1cbiAgICAgIHx8IGdsb2JhbFt2ZW5kb3JzW2ldICsgJ0NhbmNlbFJlcXVlc3QnICsgc3VmZml4XVxufVxuXG4vLyBTb21lIHZlcnNpb25zIG9mIEZGIGhhdmUgckFGIGJ1dCBub3QgY0FGXG5pZighcmFmIHx8ICFjYWYpIHtcbiAgaXNOYXRpdmUgPSBmYWxzZVxuXG4gIHZhciBsYXN0ID0gMFxuICAgICwgaWQgPSAwXG4gICAgLCBxdWV1ZSA9IFtdXG4gICAgLCBmcmFtZUR1cmF0aW9uID0gMTAwMCAvIDYwXG5cbiAgcmFmID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICBpZihxdWV1ZS5sZW5ndGggPT09IDApIHtcbiAgICAgIHZhciBfbm93ID0gbm93KClcbiAgICAgICAgLCBuZXh0ID0gTWF0aC5tYXgoMCwgZnJhbWVEdXJhdGlvbiAtIChfbm93IC0gbGFzdCkpXG4gICAgICBsYXN0ID0gbmV4dCArIF9ub3dcbiAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBjcCA9IHF1ZXVlLnNsaWNlKDApXG4gICAgICAgIC8vIENsZWFyIHF1ZXVlIGhlcmUgdG8gcHJldmVudFxuICAgICAgICAvLyBjYWxsYmFja3MgZnJvbSBhcHBlbmRpbmcgbGlzdGVuZXJzXG4gICAgICAgIC8vIHRvIHRoZSBjdXJyZW50IGZyYW1lJ3MgcXVldWVcbiAgICAgICAgcXVldWUubGVuZ3RoID0gMFxuICAgICAgICBmb3IodmFyIGkgPSAwOyBpIDwgY3AubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBpZighY3BbaV0uY2FuY2VsbGVkKSB7XG4gICAgICAgICAgICB0cnl7XG4gICAgICAgICAgICAgIGNwW2ldLmNhbGxiYWNrKGxhc3QpXG4gICAgICAgICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHsgdGhyb3cgZSB9LCAwKVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSwgTWF0aC5yb3VuZChuZXh0KSlcbiAgICB9XG4gICAgcXVldWUucHVzaCh7XG4gICAgICBoYW5kbGU6ICsraWQsXG4gICAgICBjYWxsYmFjazogY2FsbGJhY2ssXG4gICAgICBjYW5jZWxsZWQ6IGZhbHNlXG4gICAgfSlcbiAgICByZXR1cm4gaWRcbiAgfVxuXG4gIGNhZiA9IGZ1bmN0aW9uKGhhbmRsZSkge1xuICAgIGZvcih2YXIgaSA9IDA7IGkgPCBxdWV1ZS5sZW5ndGg7IGkrKykge1xuICAgICAgaWYocXVldWVbaV0uaGFuZGxlID09PSBoYW5kbGUpIHtcbiAgICAgICAgcXVldWVbaV0uY2FuY2VsbGVkID0gdHJ1ZVxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGZuKSB7XG4gIC8vIFdyYXAgaW4gYSBuZXcgZnVuY3Rpb24gdG8gcHJldmVudFxuICAvLyBgY2FuY2VsYCBwb3RlbnRpYWxseSBiZWluZyBhc3NpZ25lZFxuICAvLyB0byB0aGUgbmF0aXZlIHJBRiBmdW5jdGlvblxuICBpZighaXNOYXRpdmUpIHtcbiAgICByZXR1cm4gcmFmLmNhbGwoZ2xvYmFsLCBmbilcbiAgfVxuICByZXR1cm4gcmFmLmNhbGwoZ2xvYmFsLCBmdW5jdGlvbigpIHtcbiAgICB0cnl7XG4gICAgICBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpXG4gICAgfSBjYXRjaChlKSB7XG4gICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkgeyB0aHJvdyBlIH0sIDApXG4gICAgfVxuICB9KVxufVxubW9kdWxlLmV4cG9ydHMuY2FuY2VsID0gZnVuY3Rpb24oKSB7XG4gIGNhZi5hcHBseShnbG9iYWwsIGFyZ3VtZW50cylcbn1cbiIsIi8vIEdlbmVyYXRlZCBieSBDb2ZmZWVTY3JpcHQgMS42LjNcbihmdW5jdGlvbigpIHtcbiAgdmFyIGdldE5hbm9TZWNvbmRzLCBocnRpbWUsIGxvYWRUaW1lO1xuXG4gIGlmICgodHlwZW9mIHBlcmZvcm1hbmNlICE9PSBcInVuZGVmaW5lZFwiICYmIHBlcmZvcm1hbmNlICE9PSBudWxsKSAmJiBwZXJmb3JtYW5jZS5ub3cpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHBlcmZvcm1hbmNlLm5vdygpO1xuICAgIH07XG4gIH0gZWxzZSBpZiAoKHR5cGVvZiBwcm9jZXNzICE9PSBcInVuZGVmaW5lZFwiICYmIHByb2Nlc3MgIT09IG51bGwpICYmIHByb2Nlc3MuaHJ0aW1lKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiAoZ2V0TmFub1NlY29uZHMoKSAtIGxvYWRUaW1lKSAvIDFlNjtcbiAgICB9O1xuICAgIGhydGltZSA9IHByb2Nlc3MuaHJ0aW1lO1xuICAgIGdldE5hbm9TZWNvbmRzID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgaHI7XG4gICAgICBociA9IGhydGltZSgpO1xuICAgICAgcmV0dXJuIGhyWzBdICogMWU5ICsgaHJbMV07XG4gICAgfTtcbiAgICBsb2FkVGltZSA9IGdldE5hbm9TZWNvbmRzKCk7XG4gIH0gZWxzZSBpZiAoRGF0ZS5ub3cpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIERhdGUubm93KCkgLSBsb2FkVGltZTtcbiAgICB9O1xuICAgIGxvYWRUaW1lID0gRGF0ZS5ub3coKTtcbiAgfSBlbHNlIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIG5ldyBEYXRlKCkuZ2V0VGltZSgpIC0gbG9hZFRpbWU7XG4gICAgfTtcbiAgICBsb2FkVGltZSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICB9XG5cbn0pLmNhbGwodGhpcyk7XG5cbi8qXG4vL0Agc291cmNlTWFwcGluZ1VSTD1wZXJmb3JtYW5jZS1ub3cubWFwXG4qL1xuIiwiLy8gZ2FtZXN0YXRlLmpzXHJcbi8vIFxyXG5cclxuJC5jb29raWUuanNvbiA9IHRydWU7XHJcblxyXG52YXIgZ2FtZVN0YXRlID1cclxubW9kdWxlLmV4cG9ydHMgPSB7XHJcblx0bG9hZDogZnVuY3Rpb24oKSB7XHJcblx0XHR2YXIgc2F2ZWQgPSAkLmNvb2tpZSh7cGF0aDogQkFTRVVSTH0pO1xyXG5cdFx0Z2FtZVN0YXRlLnBsYXllclNwcml0ZSA9IHNhdmVkLnBsYXllclNwcml0ZTtcclxuXHRcdGdhbWVTdGF0ZS5tYXBUcmFuc2l0aW9uID0gc2F2ZWQubWFwVHJhbnNpdGlvbjtcclxuXHRcdFxyXG5cdFx0Z2FtZVN0YXRlLmluZm9kZXgucmVnaXN0ZXIgPSBKU09OLnBhcnNlKCQuYmFzZTY0LmRlY29kZShzYXZlZC5pbmZvZGV4KSk7XHJcblx0fSxcclxuXHRcclxuXHRzYXZlTG9jYXRpb246IGZ1bmN0aW9uKG9wdHMpIHtcclxuXHRcdC8vSW5zZXJ0IGl0ZW1zIHRvIGJlIHNhdmVkIGhlcmVcclxuXHRcdHZhciBvID0ge1xyXG5cdFx0XHRuZXh0TWFwOiBvcHRzLm1hcCB8fCBvcHRzLm5leHRNYXAgfHwgZ2FtZVN0YXRlLm1hcFRyYW5zaXRpb24ubmV4dE1hcCxcclxuXHRcdFx0d2FycDogb3B0cy53YXJwIHx8IGdhbWVTdGF0ZS5tYXBUcmFuc2l0aW9uLndhcnAsXHJcblx0XHRcdGFuaW1PdmVycmlkZTogXHJcblx0XHRcdFx0KG9wdHMuYW5pbSAhPT0gdW5kZWZpbmVkKT8gb3B0cy5hbmltIDogXHJcblx0XHRcdFx0KG9wdHMuYW5pbU92ZXJyaWRlICE9PSB1bmRlZmluZWQpPyBvcHRzLmFuaW1PdmVycmlkZSA6IFxyXG5cdFx0XHRcdGdhbWVTdGF0ZS5tYXBUcmFuc2l0aW9uLmFuaW1PdmVycmlkZSxcclxuXHRcdH1cclxuXHRcdCQuY29va2llKFwibWFwVHJhbnNpdGlvblwiLCBvLCB7cGF0aDogQkFTRVVSTH0pO1xyXG5cdH0sXHJcblx0XHJcblx0Ly8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cdC8vIE1hcCBUcmFuc2l0aW9uXHJcblx0bWFwVHJhbnNpdGlvbiA6IHtcclxuXHRcdG5leHRNYXAgOiBcImlDaHVyY2hPZkhlbGl4XCIsXHJcblx0XHR3YXJwOiAweDEwLFxyXG5cdFx0YW5pbU92ZXJyaWRlOiAwLFxyXG5cdH0sXHJcblx0XHJcblx0cGxheWVyU3ByaXRlIDogXCJtZWxvZHlbaGdfdmVydG1peC0zMl0ucG5nXCIsXHJcblx0XHJcbn07XHJcblxyXG4vLyBJbmZvZGV4IGZ1bmN0aW9uc1xyXG5nYW1lU3RhdGUuaW5mb2RleCA9IHtcclxuXHRyZWdpc3Rlcjoge30sXHJcblx0c2VlbjogMCxcclxuXHRmb3VuZDogMCxcclxuXHRcclxuXHRfX21hcms6IGZ1bmN0aW9uKGNvbnRhaW5lciwgdXJsLCBtYXJrKSB7XHJcblx0XHR2YXIgY29tcCA9IHVybC5zaGlmdCgpO1xyXG5cdFx0dmFyIG9sZCA9IGNvbnRhaW5lcltjb21wXTtcclxuXHRcdGlmICghdXJsLmxlbmd0aCkge1xyXG5cdFx0XHQvLyBXZSdyZSBhdCB0aGUgZW5kIG9mIHRoZSBVUkwsIHRoaXMgc2hvdWxkIGJlIGEgbGVhZiBub2RlXHJcblx0XHRcdGlmICghb2xkKSBvbGQgPSBjb250YWluZXJbY29tcF0gPSAwO1xyXG5cdFx0XHRpZiAodHlwZW9mIG9sZCAhPT0gXCJudW1iZXJcIikgXHJcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiVVJMIGRvZXMgbm90IHBvaW50IHRvIGxlYWYgbm9kZSFcIik7XHJcblx0XHRcdGNvbnRhaW5lcltjb21wXSB8PSBtYXJrO1xyXG5cdFx0XHRyZXR1cm4gb2xkO1xyXG5cdFx0XHRcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdC8vU3RpbGwgZ29pbmcgZG93biB0aGUgdXJsXHJcblx0XHRcdGlmICghb2xkKSBvbGQgPSBjb250YWluZXJbY29tcF0gPSB7fTtcclxuXHRcdFx0cmV0dXJuIHRoaXMuX19tYXJrKG9sZCwgdXJsLCBtYXJrKTsgLy90YWlsIGNhbGxcclxuXHRcdH1cclxuXHR9LFxyXG5cdFxyXG5cdG1hcmtTZWVuOiBmdW5jdGlvbih1cmwpIHtcclxuXHRcdC8vIHZhciBjb21wID0gdXJsLnNwbGl0KFwiLlwiKTtcclxuXHRcdC8vIHZhciByZWcgPSBnYW1lU3RhdGUuaW5mb2RleC5yZWdpc3RlcjsgLy9bdXJsXSB8PSAxOyAvL3NldCB0byBhdCBsZWFzdCAxXHJcblx0XHRcclxuXHRcdC8vIGZvciAodmFyIGkgPSAwOyBpIDwgY29tcC5sZW5ndGgtMTsgaSsrKSB7XHJcblx0XHQvLyBcdHJlZyA9IHJlZ1tjb21wW2ldXSB8fCB7fTtcclxuXHRcdC8vIH1cclxuXHRcdC8vIHJlZ1tdXHJcblx0XHR2YXIgcmVzID0gdGhpcy5fX21hcmsodGhpcy5yZWdpc3RlciwgdXJsLnNwbGl0KFwiLlwiKSwgMSk7XHJcblx0XHRpZiAocmVzID09IDApIHsgdGhpcy5zZWVuKys7IH1cclxuXHR9LFxyXG5cdG1hcmtGb3VuZDogZnVuY3Rpb24odXJsKSB7XHJcblx0XHQvLyBnYW1lU3RhdGUuaW5mb2RleFt1cmxdIHw9IDI7IC8vc2V0IHRvIGF0IGxlYXN0IDJcclxuXHRcdHZhciByZXMgPSB0aGlzLl9fbWFyayh0aGlzLnJlZ2lzdGVyLCB1cmwuc3BsaXQoXCIuXCIpLCAyKTtcclxuXHRcdGlmIChyZXMgPT0gMCkgeyB0aGlzLnNlZW4rKzsgdGhpcy5mb3VuZCsrOyB9XHJcblx0XHRlbHNlIGlmIChyZXMgPT0gMSkgeyB0aGlzLmZvdW5kKys7IH1cclxuXHR9LFxyXG5cdFxyXG5cdFxyXG5cdFxyXG59OyIsIi8vIHJlbmRlcmxvb3AuanNcclxuLy8gVGhlIG1vZHVsZSB0aGF0IGhhbmRsZXMgYWxsIHRoZSBjb21tb24gY29kZSB0byByZW5kZXIgYW5kIGRvIGdhbWUgdGlja3Mgb24gYSBtYXBcclxuXHJcbnZhciBleHRlbmQgPSByZXF1aXJlKFwiZXh0ZW5kXCIpO1xyXG52YXIgcmFmID0gcmVxdWlyZShcInJhZlwiKTtcclxudmFyIGNvbnRyb2xsZXIgPSByZXF1aXJlKFwidHBwLWNvbnRyb2xsZXJcIik7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHtcclxuXHRzdGFydCA6IGZ1bmN0aW9uKG9wdHMpIHtcclxuXHRcdC8vIFNldCB0aGUgY2FudmFzJ3MgYXR0cmlidXRlcywgYmVjYXVzZSB0aG9zZSBcclxuXHRcdC8vIEFDVFVBTExZIGRldGVybWluZSBob3cgYmlnIHRoZSByZW5kZXJpbmcgYXJlYSBpcy5cclxuXHRcdGlmICghb3B0cy5fZGlzYWJsZVRocmVlKSB7XHJcblx0XHRcdHZhciBjYW52YXMgPSAkKFwiI2dhbWVzY3JlZW5cIik7XHJcblx0XHRcdGNhbnZhcy5hdHRyKFwid2lkdGhcIiwgcGFyc2VJbnQoY2FudmFzLmNzcyhcIndpZHRoXCIpKSk7XHJcblx0XHRcdGNhbnZhcy5hdHRyKFwiaGVpZ2h0XCIsIHBhcnNlSW50KGNhbnZhcy5jc3MoXCJoZWlnaHRcIikpKTtcclxuXHRcdFx0XHJcblx0XHRcdG9wdHMgPSBleHRlbmQoe1xyXG5cdFx0XHRcdGNsZWFyQ29sb3IgOiAweDAwMDAwMCxcclxuXHRcdFx0XHR0aWNrc1BlclNlY29uZCA6IDMwLFxyXG5cdFx0XHR9LCBvcHRzKTtcclxuXHRcdFx0XHJcblx0XHRcdHdpbmRvdy50aHJlZVJlbmRlcmVyID0gbmV3IFRIUkVFLldlYkdMUmVuZGVyZXIoe1xyXG5cdFx0XHRcdGFudGlhbGlhcyA6IHRydWUsXHJcblx0XHRcdFx0Y2FudmFzIDogZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJnYW1lc2NyZWVuXCIpIFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0dGhyZWVSZW5kZXJlci5zZXRDbGVhckNvbG9ySGV4KCBvcHRzLmNsZWFyQ29sb3IgKTtcclxuXHRcdFx0dGhyZWVSZW5kZXJlci5hdXRvQ2xlYXIgPSBmYWxzZTtcclxuXHRcdFx0XHJcblx0XHRcdHRocmVlUmVuZGVyZXIuc2hhZG93TWFwRW5hYmxlZCA9IHRydWU7XHJcblx0XHRcdHRocmVlUmVuZGVyZXIuc2hhZG93TWFwVHlwZSA9IFRIUkVFLlBDRlNoYWRvd01hcDtcclxuXHRcdFx0XHJcblx0XHRcdF9yZW5kZXJIYW5kbGUgPSByYWYocmVuZGVyTG9vcCk7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdGluaXRHYW1lTG9vcCgzMCk7XHJcblx0XHRcclxuXHR9LFxyXG5cdFxyXG5cdHBhdXNlIDogZnVuY3Rpb24oKSB7XHJcblx0XHRwYXVzZWQgPSB0cnVlO1xyXG5cdFx0Ly8gX3JlbmRlckhhbmRsZSA9IG51bGw7XHJcblx0fSxcclxuXHR1bnBhdXNlIDogZnVuY3Rpb24oKSB7XHJcblx0XHRwYXVzZWQgPSBmYWxzZTtcclxuXHRcdC8vIF9yZW5kZXJIYW5kbGUgPSByYWYocmVuZGVyTG9vcCk7XHJcblx0fSxcclxufTtcclxuXHJcblxyXG52YXIgX3JlbmRlckhhbmRsZTsgXHJcbmZ1bmN0aW9uIHJlbmRlckxvb3AoKSB7XHJcblx0dGhyZWVSZW5kZXJlci5jbGVhcigpO1xyXG5cdFxyXG5cdGlmICh3aW5kb3cuY3VycmVudE1hcCAmJiBjdXJyZW50TWFwLnNjZW5lICYmIGN1cnJlbnRNYXAuY2FtZXJhKSB7XHJcblx0XHQvL1JlbmRlciB3aXRoIHRoZSBtYXAncyBhY3RpdmUgY2FtZXJhIG9uIGl0cyBhY3RpdmUgc2NlbmVcclxuXHRcdHRocmVlUmVuZGVyZXIucmVuZGVyKGN1cnJlbnRNYXAuc2NlbmUsIGN1cnJlbnRNYXAuY2FtZXJhKTtcclxuXHR9XHJcblx0XHJcblx0aWYgKFVJLnNjZW5lICYmIFVJLmNhbWVyYSkge1xyXG5cdFx0Ly9SZW5kZXIgdGhlIFVJIHdpdGggdGhlIFVJIGNhbWVyYSBhbmQgaXRzIHNjZW5lXHJcblx0XHR0aHJlZVJlbmRlcmVyLmNsZWFyKGZhbHNlLCB0cnVlLCBmYWxzZSk7IC8vQ2xlYXIgZGVwdGggYnVmZmVyXHJcblx0XHR0aHJlZVJlbmRlcmVyLnJlbmRlcihVSS5zY2VuZSwgVUkuY2FtZXJhKTtcclxuXHR9XHJcblx0XHJcblx0aWYgKF9yZW5kZXJIYW5kbGUpXHJcblx0XHRfcmVuZGVySGFuZGxlID0gcmFmKHJlbmRlckxvb3ApO1xyXG59XHJcblxyXG52YXIgcGF1c2VkID0gZmFsc2U7XHJcbmZ1bmN0aW9uIGluaXRHYW1lTG9vcCh0aWNrc1BlclNlYykge1xyXG5cdHZhciBfcmF0ZSA9IDEwMDAgLyB0aWNrc1BlclNlYztcclxuXHRcclxuXHR2YXIgYWNjdW0gPSAwO1xyXG5cdHZhciBub3cgPSAwO1xyXG5cdHZhciBsYXN0ID0gbnVsbDtcclxuXHR2YXIgZHQgPSAwO1xyXG5cdHZhciB3aG9sZVRpY2s7XHJcblx0XHJcblx0c2V0SW50ZXJ2YWwodGltZXJUaWNrLCAwKTtcclxuXHRcclxuXHRmdW5jdGlvbiB0aW1lclRpY2soKSB7XHJcblx0XHRpZiAocGF1c2VkKSB7XHJcblx0XHRcdGxhc3QgPSBEYXRlLm5vdygpO1xyXG5cdFx0XHRhY2N1bSA9IDA7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0bm93ID0gRGF0ZS5ub3coKTtcclxuXHRcdGR0ID0gbm93IC0gKGxhc3QgfHwgbm93KTtcclxuXHRcdGxhc3QgPSBub3c7XHJcblx0XHRhY2N1bSArPSBkdDtcclxuXHRcdGlmIChhY2N1bSA8IF9yYXRlKSByZXR1cm47XHJcblx0XHR3aG9sZVRpY2sgPSAoKGFjY3VtIC8gX3JhdGUpfDApO1xyXG5cdFx0aWYgKHdob2xlVGljayA8PSAwKSByZXR1cm47XHJcblx0XHRcclxuXHRcdHZhciBkZWx0YSA9IHdob2xlVGljayAvIHRpY2tzUGVyU2VjO1xyXG5cdFx0aWYgKHdpbmRvdy5jdXJyZW50TWFwICYmIGN1cnJlbnRNYXAubG9naWNMb29wKVxyXG5cdFx0XHRjdXJyZW50TWFwLmxvZ2ljTG9vcChkZWx0YSk7XHJcblx0XHRpZiAod2luZG93LlVJICYmIFVJLmxvZ2ljTG9vcClcclxuXHRcdFx0VUkubG9naWNMb29wKGRlbHRhKTtcclxuXHRcdFxyXG5cdFx0aWYgKHdpbmRvdy5jb250cm9sbGVyICYmIGNvbnRyb2xsZXIuX3RpY2spXHJcblx0XHRcdGNvbnRyb2xsZXIuX3RpY2soZGVsdGEpO1xyXG5cdFx0aWYgKHdpbmRvdy5Tb3VuZE1hbmFnZXIgJiYgU291bmRNYW5hZ2VyLl90aWNrKVxyXG5cdFx0XHRTb3VuZE1hbmFnZXIuX3RpY2soZGVsdGEpO1xyXG5cdFx0XHJcblx0XHR3aG9sZVRpY2sgKj0gX3JhdGU7XHJcblx0XHRhY2N1bSAtPSB3aG9sZVRpY2s7XHJcblx0fVxyXG59IiwiLy8gcG9seWZpbGwuanNcclxuLy8gRGVmaW5lcyBzb21lIHBvbHlmaWxscyBuZWVkZWQgZm9yIHRoZSBnYW1lIHRvIGZ1bmN0aW9uLlxyXG5cclxuLy8gU3RyaW5nLnN0YXJ0c1dpdGgoKVxyXG4vLyBcclxuaWYgKCFTdHJpbmcucHJvdG90eXBlLnN0YXJ0c1dpdGgpIHtcclxuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkoU3RyaW5nLnByb3RvdHlwZSwgJ3N0YXJ0c1dpdGgnLCB7XHJcblx0XHRlbnVtZXJhYmxlOiBmYWxzZSxcclxuXHRcdGNvbmZpZ3VyYWJsZTogZmFsc2UsXHJcblx0XHR3cml0YWJsZTogZmFsc2UsXHJcblx0XHR2YWx1ZTogZnVuY3Rpb24oc2VhcmNoU3RyaW5nLCBwb3NpdGlvbikge1xyXG5cdFx0XHRwb3NpdGlvbiA9IHBvc2l0aW9uIHx8IDA7XHJcblx0XHRcdHJldHVybiB0aGlzLmxhc3RJbmRleE9mKHNlYXJjaFN0cmluZywgcG9zaXRpb24pID09PSBwb3NpdGlvbjtcclxuXHRcdH1cclxuXHR9KTtcclxufVxyXG5cclxuaWYgKCFTdHJpbmcucHJvdG90eXBlLmVuZHNXaXRoKSB7XHJcblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KFN0cmluZy5wcm90b3R5cGUsICdlbmRzV2l0aCcsIHtcclxuXHRcdGVudW1lcmFibGU6IGZhbHNlLFxyXG5cdFx0Y29uZmlndXJhYmxlOiBmYWxzZSxcclxuXHRcdHdyaXRhYmxlOiBmYWxzZSxcclxuXHRcdHZhbHVlOiBmdW5jdGlvbihzZWFyY2hTdHJpbmcsIHBvc2l0aW9uKSB7XHJcblx0XHRcdHZhciBzdWJqZWN0U3RyaW5nID0gdGhpcy50b1N0cmluZygpO1xyXG5cdFx0XHRpZiAocG9zaXRpb24gPT09IHVuZGVmaW5lZCB8fCBwb3NpdGlvbiA+IHN1YmplY3RTdHJpbmcubGVuZ3RoKSB7XHJcblx0XHRcdFx0cG9zaXRpb24gPSBzdWJqZWN0U3RyaW5nLmxlbmd0aDtcclxuXHRcdFx0fVxyXG5cdFx0XHRwb3NpdGlvbiAtPSBzZWFyY2hTdHJpbmcubGVuZ3RoO1xyXG5cdFx0XHR2YXIgbGFzdEluZGV4ID0gc3ViamVjdFN0cmluZy5pbmRleE9mKHNlYXJjaFN0cmluZywgcG9zaXRpb24pO1xyXG5cdFx0XHRyZXR1cm4gbGFzdEluZGV4ICE9PSAtMSAmJiBsYXN0SW5kZXggPT09IHBvc2l0aW9uO1xyXG5cdFx0fVxyXG5cdH0pO1xyXG59XHJcblxyXG4vLyBFdmVudFRhcmdldC5vbigpIGFuZCBFdmVudFRhcmdldC5lbWl0KClcclxuLy8gQWRkaW5nIHRoaXMgdG8gYWxsb3cgZG9tIGVsZW1lbnRzIGFuZCBvYmplY3RzIHRvIHNpbXBseSBoYXZlIFwib25cIiBhbmQgXCJlbWl0XCIgdXNlZCBsaWtlIG5vZGUuanMgb2JqZWN0cyBjYW5cclxuaWYgKCFFdmVudFRhcmdldC5wcm90b3R5cGUub24pIHtcclxuXHRFdmVudFRhcmdldC5wcm90b3R5cGUub24gPSBFdmVudFRhcmdldC5wcm90b3R5cGUuYWRkRXZlbnRMaXN0ZW5lcjtcclxuXHRFdmVudFRhcmdldC5wcm90b3R5cGUuZW1pdCA9IEV2ZW50VGFyZ2V0LnByb3RvdHlwZS5kaXNwYXRjaEV2ZW50O1xyXG59XHJcblxyXG4vLyBNYXRoLmNsYW1wKClcclxuLy8gXHJcbmlmICghTWF0aC5jbGFtcCkge1xyXG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShNYXRoLCBcImNsYW1wXCIsIHtcclxuXHRcdGVudW1lcmFibGU6IGZhbHNlLFxyXG5cdFx0Y29uZmlndXJhYmxlOiBmYWxzZSxcclxuXHRcdHdyaXRhYmxlOiBmYWxzZSxcclxuXHRcdHZhbHVlOiBmdW5jdGlvbihudW0sIG1pbiwgbWF4KSB7XHJcblx0XHRcdG1pbiA9IChtaW4gIT09IHVuZGVmaW5lZCk/IG1pbjowO1xyXG5cdFx0XHRtYXggPSAobWF4ICE9PSB1bmRlZmluZWQpPyBtYXg6MTtcclxuXHRcdFx0cmV0dXJuIE1hdGgubWluKE1hdGgubWF4KG51bSwgbWluKSwgbWF4KTtcclxuXHRcdH1cclxuXHR9KTtcclxufVxyXG5cclxuLy8gQXJyYXkudG9wXHJcbi8vIFByb3ZpZGVzIGVhc3kgYWNjZXNzIHRvIHRoZSBcInRvcFwiIG9mIGEgc3RhY2ssIG1hZGUgd2l0aCBwdXNoKCkgYW5kIHBvcCgpXHJcbmlmICghQXJyYXkucHJvdG90eXBlLnRvcCkge1xyXG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShBcnJheS5wcm90b3R5cGUsIFwidG9wXCIsIHtcclxuXHRcdGVudW1lcmFibGU6IGZhbHNlLFxyXG5cdFx0Y29uZmlndXJhYmxlOiBmYWxzZSxcclxuXHRcdC8vIHNldDogZnVuY3Rpb24oKXt9LFxyXG5cdFx0Z2V0OiBmdW5jdGlvbigpe1xyXG5cdFx0XHRyZXR1cm4gdGhpc1t0aGlzLmxlbmd0aC0xXTtcclxuXHRcdH0sXHJcblx0fSk7XHJcbn1cclxuXHJcblxyXG4vLyBNb2RpZmljYXRpb25zIHRvIFRIUkVFLmpzXHJcbmlmICh3aW5kb3cuVEhSRUUpIHtcclxuXHQvLyBWZWN0b3IzLnNldCgpLCBtb2RpZmllZCB0byBhY2NlcHQgYW5vdGhlciBWZWN0b3IzXHJcblx0VEhSRUUuVmVjdG9yMy5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24oeCwgeSwgeikge1xyXG5cdFx0aWYgKHggaW5zdGFuY2VvZiBUSFJFRS5WZWN0b3IzKSB7XHJcblx0XHRcdHRoaXMueCA9IHgueDsgdGhpcy55ID0geC55OyB0aGlzLnogPSB4Lno7XHJcblx0XHRcdHJldHVybiB0aGlzO1xyXG5cdFx0fVxyXG5cdFx0aWYgKHggaW5zdGFuY2VvZiBUSFJFRS5WZWN0b3IyKSB7XHJcblx0XHRcdHRoaXMueCA9IHgueDsgdGhpcy55ID0geC55OyB0aGlzLnogPSAwO1xyXG5cdFx0XHRyZXR1cm4gdGhpcztcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0dGhpcy54ID0geDsgdGhpcy55ID0geTsgdGhpcy56ID0gejtcclxuXHRcdHJldHVybiB0aGlzO1xyXG5cdH07XHJcblx0XHJcblx0Ly8gQWxzbyBmb3IgVmVjdG9yMlxyXG5cdFRIUkVFLlZlY3RvcjIucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uKHgsIHkpIHtcclxuXHRcdGlmICh4IGluc3RhbmNlb2YgVEhSRUUuVmVjdG9yMikge1xyXG5cdFx0XHR0aGlzLnggPSB4Lng7IHRoaXMueSA9IHgueTtcclxuXHRcdFx0cmV0dXJuIHRoaXM7XHJcblx0XHR9XHJcblx0XHRpZiAoeCBpbnN0YW5jZW9mIFRIUkVFLlZlY3RvcjMpIHtcclxuXHRcdFx0dGhpcy54ID0geC54OyB0aGlzLnkgPSB4Lnk7XHJcblx0XHRcdHJldHVybiB0aGlzO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHR0aGlzLnggPSB4OyB0aGlzLnkgPSB5O1xyXG5cdFx0cmV0dXJuIHRoaXM7XHJcblx0fTtcclxufVxyXG5cclxuXHJcbiJdfQ==
