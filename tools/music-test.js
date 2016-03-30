(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// music-test.js
// Where music loops can be tested!

var extend = require("extend");
var raf = require("raf");

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

window.DEBUG = {
	soundAnalyzer: true,
};

var renderLoop = require("../model/renderloop");

// require("../globals");
window.SoundManager = require("../managers/soundmanager");
window.gameState = require("../gamestate");

var analyzers = {};

// On Ready
$(function(){
	
	renderLoop.start({
		_disableThree: true,
		ticksPerSecond : 20,
	});
	
	$("#loadbtn").on("click", function(){
		loadSong($("#idin").val());
		$("#loadbtn").blur();
	});
	
	var datalist = $("<datalist id='knownSongs'>");
	for (var id in KNOWN_SONGS) {
		datalist.append($("<option>").text(id));
	}
	$("#idin").after(datalist);
	
	drawWaveforms();
});

SoundManager.on("DEBUG-AnalyserCreated", function(id, da) {
	analyzers[id] = extend({a: da}, analyzers[id]);
});

SoundManager.on("load_music", function(id){
	var playPause = $("<button>")
		.addClass("playpause")
		.text("Play/Pause")
		.on("click", function(){
			SoundManager.toggleMusic(id);
		});
	
	analyzers[id] = extend({}, analyzers[id]);
	var canvas = analyzers[id].c;
	if (!canvas) {
		canvas = analyzers[id].c = 
		$("<canvas>")
			.attr({ height: 58, width: 150 })[0];
	}
	
	$("<tr>")
		.addClass("songRow")
		.attr("name", id)
		.append("<td><h2>"+id+"</h2></td>")
		.append($("<td>").append(canvas).css({"text-align": "center"}))
		.append($("<td>").append(playPause).css({"text-align": "right"}))
		.appendTo("#audiotable");
});

SoundManager.on("unloaded-music", function(id){
	$("#audiotable .songRow[name="+id+"]").remove();
});


function loadSong(id) {
	SoundManager.loadMusic(id, 
		extend({
			url: BASEURL+"/tools/music/"+id+".mp3",
		}, KNOWN_SONGS[id])
	);
}

var _rafHandle;
function drawWaveforms() {
	// https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Visualizations_with_Web_Audio_API
	var dataArray;
	for (var id in analyzers) {
		if (!analyzers[id].a || !analyzers[id].c) continue;
		
		if (!dataArray) {
			dataArray = new Uint8Array(analyzers[id].a.fftSize);
		}
		var canvasCtx = analyzers[id].c.getContext("2d");
		var WIDTH = analyzers[id].c.width;
		var HEIGHT = analyzers[id].c.height;
		
		// canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);
		
		analyzers[id].a.getByteTimeDomainData(dataArray);
		canvasCtx.fillStyle = '#000000';
		canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);
		
		canvasCtx.lineWidth = 1;
		canvasCtx.strokeStyle = '#FFFFFF';
		canvasCtx.beginPath();
		
		var sliceWidth = WIDTH * 1.0 / dataArray.length;
		var x = 0;
		for(var i = 0; i < dataArray.length; i++) {
			var v = dataArray[i] / 128.0;
			var y = v * HEIGHT/2;

			if(i === 0) {
				canvasCtx.moveTo(x, y);
			} else {
				canvasCtx.lineTo(x, y);
			}

			x += sliceWidth;
		}
		canvasCtx.lineTo(WIDTH, HEIGHT/2);
		canvasCtx.stroke();
	}
	
	_rafHandle = raf(drawWaveforms);
}


var KNOWN_SONGS = {
	"go_gotcha":		{ "loopStart": 26.855,"loopEnd": 55.309 },
	"go_encounter":		{ "loopStart": 0.440, "loopEnd": 39.970 },
	"go_title":			{}, //No loop points
	"go_welcome":		{ "loopStart": 0.073, "loopEnd": 27.471 },
	"go_evolution":		{ },//"loopStart": 21.007,"loopEnd": 27.900 }, //Looping is horrible
	"go_walk":			{ "loopStart": 33.613,"loopEnd": 141.792 },
	"m_welcomexy":		{ "loopStart": 5.374, "loopEnd": 41.354 },
	"m_spearpillar":	{ "loopStart": 2.492, "loopEnd": 43.884 },
	"m_gallery": 		{ "loopStart": 0.773, "loopEnd": 89.554 },
	"m_welcome_pt":		{ "loopStart": 2.450, "loopEnd": 66.500 },
	"m_researchlab":	{ "loopStart": 2.450, "loopEnd": 66.500 },
	"m_gamecorner":		{ "loopStart": 18.61, "loopEnd": 79.010 },
	"m_casino_win":		{ "loopStart": 3.160, "loopEnd": 15.167 },
	"m_casino_win2":	{ "loopStart": 1.516, "loopEnd": 12.185 },
};
},{"../gamestate":6,"../managers/soundmanager":7,"../model/renderloop":8,"../polyfill.js":9,"extend":"extend","raf":4}],2:[function(require,module,exports){
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

},{}],3:[function(require,module,exports){
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

},{}],4:[function(require,module,exports){
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

},{"performance-now":5}],5:[function(require,module,exports){
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

*/

}).call(this,require('_process'))
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9yYWYvbm9kZV9tb2R1bGVzL3BlcmZvcm1hbmNlLW5vdy9saWIvcGVyZm9ybWFuY2Utbm93LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiLy8gR2VuZXJhdGVkIGJ5IENvZmZlZVNjcmlwdCAxLjYuM1xuKGZ1bmN0aW9uKCkge1xuICB2YXIgZ2V0TmFub1NlY29uZHMsIGhydGltZSwgbG9hZFRpbWU7XG5cbiAgaWYgKCh0eXBlb2YgcGVyZm9ybWFuY2UgIT09IFwidW5kZWZpbmVkXCIgJiYgcGVyZm9ybWFuY2UgIT09IG51bGwpICYmIHBlcmZvcm1hbmNlLm5vdykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gcGVyZm9ybWFuY2Uubm93KCk7XG4gICAgfTtcbiAgfSBlbHNlIGlmICgodHlwZW9mIHByb2Nlc3MgIT09IFwidW5kZWZpbmVkXCIgJiYgcHJvY2VzcyAhPT0gbnVsbCkgJiYgcHJvY2Vzcy5ocnRpbWUpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIChnZXROYW5vU2Vjb25kcygpIC0gbG9hZFRpbWUpIC8gMWU2O1xuICAgIH07XG4gICAgaHJ0aW1lID0gcHJvY2Vzcy5ocnRpbWU7XG4gICAgZ2V0TmFub1NlY29uZHMgPSBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBocjtcbiAgICAgIGhyID0gaHJ0aW1lKCk7XG4gICAgICByZXR1cm4gaHJbMF0gKiAxZTkgKyBoclsxXTtcbiAgICB9O1xuICAgIGxvYWRUaW1lID0gZ2V0TmFub1NlY29uZHMoKTtcbiAgfSBlbHNlIGlmIChEYXRlLm5vdykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gRGF0ZS5ub3coKSAtIGxvYWRUaW1lO1xuICAgIH07XG4gICAgbG9hZFRpbWUgPSBEYXRlLm5vdygpO1xuICB9IGVsc2Uge1xuICAgIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gbmV3IERhdGUoKS5nZXRUaW1lKCkgLSBsb2FkVGltZTtcbiAgICB9O1xuICAgIGxvYWRUaW1lID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gIH1cblxufSkuY2FsbCh0aGlzKTtcblxuLypcbi8vQCBzb3VyY2VNYXBwaW5nVVJMPXBlcmZvcm1hbmNlLW5vdy5tYXBcbiovXG4iXX0=
},{"_process":3}],6:[function(require,module,exports){
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
},{}],7:[function(require,module,exports){
// soundmanager.js
// Defines the Sound Manager

var inherits = require("inherits");
var extend = require("extend");
var EventEmitter = require("events").EventEmitter;

var audioContext;

var MAX_MUSIC = 8; //Max number of music tracks cached in memory
var MAX_SOUNDS = 16; //Max number of sounds cached in memory

/**
 */
function SoundManager() {
	this.testSupport();
	
	this.preloadSound("walk_bump");
	this.preloadSound("walk_jump");
	this.preloadSound("walk_jump_land");
	this.preloadSound("exit_walk");
	
	this.registerPreloadedMusic("m_tornworld", {
		tag: DORITO_MUSIC,
		loopStart: 13.304,
		loopEnd: 22.842,
	});
}
inherits(SoundManager, EventEmitter);
extend(SoundManager.prototype, {
	sounds : {},
	music: {},
	ext : null,
	createAudio: null,
	
	__muted_music: false,
	__muted_sound: false,
	__vol_music: 0.5,
	__vol_sound: 0.5,
	
	testSupport : function() {
		var testsound = new Audio();
		var ogg = testsound.canPlayType("audio/ogg; codecs=vorbis");
		if (ogg) this.ext = ".ogg";
		else this.ext = ".mp3";
		
		try {
			audioContext = new (window.AudioContext || window.webkitAudioContext)();
			if (audioContext) {
				this.createAudio = createAudio_WebAPI;
			} else {
				this.createAudio = createAudio_Tag;
			}
			this.__audioContext = audioContext;
		} catch (e) {
			this.createAudio = createAudio_Tag;
		}
		
	},
	
	////////////////////////// Loading //////////////////////////////
	
	/** Loads sound from the server, used as part of the startup process. */
	preloadSound : function(id) {
		if (!this.sounds[id]) {
			this.sounds[id] = this.createAudio(id, {
				url : BASEURL+"/snd/" + id + this.ext,
			});
			this.sounds[id].mustKeep = true;
			this.emit("load_sound", id);
		}
		return this.sounds[id];
	},
	
	/** Loads music from the server, used as part of the startup process. */
	registerPreloadedMusic: function(id, info) {
		if (!this.music[id]) {
			this.music[id] = createAudio_Tag(id, info); //force using this kind
			this.music[id].mustKeep = true;
			this.emit("load_music", id);
		}
		return this.music[id];
	},
	
	/** Loads sound from data extracted from the map zip file. */
	loadSound: function(id, info) {
		if (!this.sounds[id]) {
			this.sounds[id] = this.createAudio(id, info);
			this.emit("load_sound", id);
		}
		return this.sounds[id];
	},
	
	/** Loads music from data extracted from the map zip file. */
	loadMusic: function(id, info) {
		if (!this.music[id]) {
			this._ensureRoomForMusic();
			this.music[id] = this.createAudio(id, info);
			this.emit("load_music", id);
		}
		return this.music[id];
	},
	
	
	isMusicLoaded: function(id) {
		return !!this.music[id];
	},
	isSoundLoaded: function(id) {
		return !!this.sounds[id];
	},
	
	_ensureRoomForMusic: function() {
		if (Object.keys(this.music).length+1 <= MAX_MUSIC) return;
		
		var oldestDate = new Date().getTime();
		var oldestId = null;
		for (var id in this.music) {
			var m = this.music[id]
			if (m.mustKeep) continue;
			if (m.loadDate < oldestDate) {
				oldestDate = m.loadDate;
				oldestId = id;
			}
		}
		
		this.music[oldestId].unload();
		delete this.music[oldestId];
		this.emit("unloaded-music", oldestId);
	},
	
	/////////////////////////////// Playing ///////////////////////////////
	
	playSound : function(id) {
		if (this.muted_sound) return;
		if (!this.sounds[id]) {
			console.error("Sound is not loaded!", id);
			return;
		}
		this.sounds[id].play();
	},
	
	playMusic: function(id){
		var m = this.music[id];
		if (!m) return;
		if (m.playing) return; //already playing
		
		var startDelay = 0;
		for (var id in this.music) {
			if (this.music[id].playing) {
				this.stopMusic(id);
				startDelay = 1000;
			}
		}
		
		setTimeout(function(){
			m.playing = true;
			if (this.muted_music) return;
			m.playing_real = true;
			m.play();
		}, startDelay);
	},
	
	pauseMusic: function(id){
		var m = this.music[id];
		if (!m) return;
		m.playing = m.playing_real = false;
		m.pause();
	},
	
	toggleMusic: function(id) {
		var m = this.music[id];
		if (!m) return;
		if (m.playing) {
			m.playing = m.playing_real = false;
			m.pause();
		} else {
			m.playing = true;
			if (this.muted_music) return;
			m.playing_real = true;
			m.play();
		}
	},
	
	stopMusic: function(id){
		var m = this.music[id];
		if (!m) return;
		// m.playing = m.playing_real = false;
		//m.pause();
		//m.currentTime = 0;
		m.fadeout = true;
	},
	
	
	_tick: function(delta) {
		for (var id in this.music) {
			this.music[id].loopTick(delta);
		}
	},
});

Object.defineProperties(SoundManager.prototype, {
	vol_music: {
		enumerable: true,
		get: function() { return this.__vol_music; },
		set: function(vol) {
			this.__vol_music = Math.clamp(vol);
			for (var id in this.music) {
				this.music[id].setVolume(this.__vol_music);
			}
		},
	},
	vol_sound: {
		enumerable: true,
		get: function() { return this.__vol_sound; },
		set: function(vol) {
			this.__vol_sound = Math.clamp(vol);
			for (var id in this.sounds) {
				this.sounds[id].setVolume(this.__vol_sound);
			}
		},
	},
	muted_music: {
		enumerable: true,
		get: function() { return this.__muted_music; },
		set: function(val) {
			this.__muted_music = val;
			for (var id in this.music) {
				this.music[id].setMuted(val);
			}
		},
	},
	muted_sound: {
		enumerable: true,
		get: function() { return this.__muted_sound; },
		set: function(val) {
			this.__muted_sound = val;
			for (var id in this.sounds) {
				this.sounds[id].setMuted(val);
			}
		},
	},
	
	__vol_music: { enumerable: false, writable: true, },
	__vol_sound: { enumerable: false, writable: true, },
	__muted_music: { enumerable: false, writable: true, },
	__muted_sound: { enumerable: false, writable: true, },
});


///////////////////////////// Sound Objects ///////////////////////////////

function SoundObject(opts) {
	extend(this, opts);
	this.loadDate = new Date().getTime();
}
extend(SoundObject.prototype, {
	playing: false, //sound is playing, theoretically (might be muted)
	playing_real: false, //sound is actually playing and not muted
	
	loopStart: 0,
	loopEnd: 0,
	
	loadDate: 0, //milisecond datestamp of when this was loaded, for cache control
	mustKeep: false, //if we should skip this object when determining sounds to unload
	
	fadeout: false,
	
	play: function(){},
	pause: function(){},
	setVolume: function(vol){},
	setMuted: function(muted){},
	loopTick: function(delta){},
	
	unload: function(){},
});



//////////////////////////// Audio Tag Implementation ////////////////////////////

function createAudio_Tag(id, info) {
	var snd;
	if (info.tag) {
		snd = info.tag;
	} else if (info.url) {
		snd = new Audio();
		snd.autoplay = false;
		snd.autobuffer = true;
		snd.preload = "auto";
		snd.src = info.url; 
		$("body").append( $(snd.tag).css({display:"none"}) );
	} else {
		throw new Error("Called createAudio without any info!");
	}
	
	var sobj = new SoundObject({
		__tag: snd,
		__bloburl: info.url,
		
		loopStart: info.loopStart || 0,
		loopEnd: info.loopEnd || 0,
		
		play: function() {
			this.__tag.play();
		},
		
		pause: function() {
			this.__tag.pause();
		},
		
		setVolume: function(vol) {
			this.__tag.volume = vol;
		},
		
		setMuted: function(muted) {
			if (muted) {
				this.playing_real = false;
				this.__tag.pause();
			} else {
				if (this.playing) {
					this.playing_real = true;
					this.__tag.play();
				}
			}
		},
		
		loopTick: function(delta) {
			if (!this.loopEnd || !this.playing_real) return;
			
			//TODO support this.fadeout
			if (this.__tag.currentTime >= this.loopEnd) {
				this.__tag.currentTime -= (this.loopEnd - this.loopStart);
			}
		},
		unload: function() {
			if (this.__bloburl)
				URL.revokeObjectURL(this.__bloburl);
			
			$(this.tag).remove();
			delete this.tag;
		},
	});
	snd.on("ended", function(){
		sobj.playing = false;
		sobj.playing_real = false;
		snd.currentTime = 0;
	});
	
	snd.load();
	
	return sobj;
}

////////////////////////// Web Audio API Implementation //////////////////////////

function createAudio_WebAPI(id, info) {
	var sobj = new SoundObject({
		__audioBuffer: null,
		__tag: null,
		__gainCtrl: null,
		__muteCtrl: null,
		__bloburl: null,
		__debugAnalyser: null,
		
		__currSrc: null,
		
		loopStart: info.loopStart || 0,
		loopEnd: info.loopEnd || 0,
		
		play: function() {
			var src;
			if (this.__audioBuffer) {
				src = audioContext.createBufferSource();
				src.buffer = this.__audioBuffer;
			} else if (this.__tag) {
				src = audioContext.createMediaElementSource(info.tag);
			} else { 
				console.log("No audio buffer ready to play!"); 
				return; 
			}
			
			src.loop = !!info.loopEnd;
			if (!!info.loopEnd) {
				src.loopStart = info.loopStart;
				src.loopEnd = info.loopEnd;
			}
			
			src.on("ended", function(){
				sobj.playing = false;
				sobj.playing_real = false;
				sobj.__currSrc = null;
			});
			
			src.connect(this.__gainCtrl);
			src.start();
			this._playing = true;
			
			this.__currSrc = src;
		},
		
		pause: function() {
			this.__currSrc.stop();
			this.__currSrc = null;
		},
		
		setVolume: function(vol) {
			this.__gainCtrl.gain.value = vol;
		},
		
		setMuted: function(muted) {
			if (this.fadeout) return; //ignore during fadeout
			this.__muteCtrl.gain.value = (muted)? 0 : 1;
		},
		
		loopTick: function(delta) {
			if (this.fadeout) {
				if (this.__muteCtrl.gain.value > 0.001) {
					this.__muteCtrl.gain.value -= delta * 0.5;
					// console.log(this.__muteCtrl.gain.value);
				} else {
					this.__currSrc.stop();
					this.__currSrc = null;
					this.fadeout = false;
					this.playing = this.playing_real = false;
					this.__muteCtrl.gain.value = 1;
				}
			}
		},
		
		unload: function(){
			if (this.__bloburl)
				URL.revokeObjectURL(this.__bloburl);
			
			delete this.__bloburl;
			delete this.__audioBuffer;
			delete this.__tag;
			delete this.__gainCtrl;
			delete this.__muteCtrl;
		},
	});
	
	
	if (info.tag) {
		sobj.__tag = info.tag;
		
	} else if (info.data) {
		currentMap.markLoading("DecodeAudio_"+id);
		
		var fr = new FileReader();
		fr.on("load", function(){
			audioContext.decodeAudioData(fr.result, function(buffer){
				sobj.__audioBuffer = buffer;
				if (sobj.playing_real) {
					sobj.play();
				}
				currentMap.markLoadFinished("DecodeAudio_"+id);
			});
		});
		fr.readAsArrayBuffer(info.data);
		
	} else if (info.url) {
		var xhr = new XMLHttpRequest();
		xhr.open("GET", info.url);
		xhr.responseType = 'arraybuffer';
		xhr.on("load", function(e) {
			// console.log("LOAD:", e);
			if (xhr.status != 200) {
				console.error("ERROR LOADING AUDIO:", xhr.statusText);
				return;
			}
			
			var data = xhr.response;
			audioContext.decodeAudioData(xhr.response, function(buffer){
				sobj.__audioBuffer = buffer;
				if (sobj.playing_real) {
					sobj.play();
				}
			});
		});
		xhr.on("error", function(e){
			console.error("ERROR LOADING AUDIO!!", e);
		});
		
		if (info.url.indexOf("blob") > -1) {
			this.__bloburl = info.url;
		}
		
		xhr.send();
	} else {
		throw new Error("Called createAudio without any info!");
	}
	
	sobj.__gainCtrl = audioContext.createGain();
	//TODO look into 3d sound fun: https://developer.mozilla.org/en-US/docs/Web/API/AudioContext.createPanner
	sobj.__muteCtrl = audioContext.createGain();
	
	sobj.__gainCtrl.connect(sobj.__muteCtrl);
	//TODO
	
	var finalNode = sobj.__muteCtrl;
	if (DEBUG.setupAdditionalAudioFilters) {
		finalNode = DEBUG.setupAdditionalAudioFilters(id, audioContext, finalNode);
	}
	
	if (DEBUG.soundAnalyzer) {
		var da = sobj.__debugAnalyser = audioContext.createAnalyser();
		da.fftSize = 1024;//2048;
		this.emit("DEBUG-AnalyserCreated", id, da);
		
		finalNode.connect(da);
		da.connect(audioContext.destination);
	} else {
		finalNode.connect(audioContext.destination);
	}
	
	return sobj;
}



///////////////////////////////////////////////////////////////////////////////////
module.exports = new SoundManager();

},{"events":2,"extend":"extend","inherits":"inherits"}],8:[function(require,module,exports){
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
		
		if (!opts.disableGameLoop) {
			initGameLoop(30);
		}
		
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
},{"extend":"extend","raf":4,"tpp-controller":"tpp-controller"}],9:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlc1xcYnJvd3NlcmlmeVxcbm9kZV9tb2R1bGVzXFxicm93c2VyLXBhY2tcXF9wcmVsdWRlLmpzIiwic3JjXFxqc1xcdG9vbHNcXG11c2ljLXRlc3QuanMiLCJub2RlX21vZHVsZXNcXGJyb3dzZXJpZnlcXG5vZGVfbW9kdWxlc1xcZXZlbnRzXFxldmVudHMuanMiLCJub2RlX21vZHVsZXNcXGJyb3dzZXJpZnlcXG5vZGVfbW9kdWxlc1xccHJvY2Vzc1xcYnJvd3Nlci5qcyIsIm5vZGVfbW9kdWxlc1xccmFmXFxpbmRleC5qcyIsIm5vZGVfbW9kdWxlc1xccmFmXFxub2RlX21vZHVsZXNcXHBlcmZvcm1hbmNlLW5vd1xcbGliXFxwZXJmb3JtYW5jZS1ub3cuanMiLCJzcmNcXGpzXFxnYW1lc3RhdGUuanMiLCJzcmNcXGpzXFxtYW5hZ2Vyc1xcc291bmRtYW5hZ2VyLmpzIiwic3JjXFxqc1xcbW9kZWxcXHJlbmRlcmxvb3AuanMiLCJzcmNcXGpzXFxwb2x5ZmlsbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN1NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFnQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0dBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvLyBtdXNpYy10ZXN0LmpzXHJcbi8vIFdoZXJlIG11c2ljIGxvb3BzIGNhbiBiZSB0ZXN0ZWQhXHJcblxyXG52YXIgZXh0ZW5kID0gcmVxdWlyZShcImV4dGVuZFwiKTtcclxudmFyIHJhZiA9IHJlcXVpcmUoXCJyYWZcIik7XHJcblxyXG5yZXF1aXJlKFwiLi4vcG9seWZpbGwuanNcIik7XHJcbndpbmRvdy5USFJFRSA9IHtcclxuXHRNZXNoOiBmdW5jdGlvbigpe30sXHJcblx0T2JqZWN0M0Q6IGZ1bmN0aW9uKCl7fSxcclxuXHRNYXRlcmlhbDogZnVuY3Rpb24oKXt9LFxyXG5cdFNoYWRlck1hdGVyaWFsOiBmdW5jdGlvbigpe30sXHJcblx0QmFzaWNNYXRlcmlhbDogZnVuY3Rpb24oKXt9LFxyXG5cdE1hdHJpeDQ6IGZ1bmN0aW9uKCl7fSxcclxuXHRHZW9tZXRyeTogZnVuY3Rpb24oKXt9LFxyXG5cdFZlY3RvcjM6IGZ1bmN0aW9uKCl7fSxcclxuXHRWZWN0b3IyOiBmdW5jdGlvbigpe30sXHJcblx0RmFjZTM6IGZ1bmN0aW9uKCl7fSxcclxuXHRUZXh0dXJlOiBmdW5jdGlvbigpe30sXHJcblx0Q29sb3I6IGZ1bmN0aW9uKCl7fSxcclxuXHRTY2VuZTogZnVuY3Rpb24oKXt9LFxyXG59O1xyXG5cclxud2luZG93LkRFQlVHID0ge1xyXG5cdHNvdW5kQW5hbHl6ZXI6IHRydWUsXHJcbn07XHJcblxyXG52YXIgcmVuZGVyTG9vcCA9IHJlcXVpcmUoXCIuLi9tb2RlbC9yZW5kZXJsb29wXCIpO1xyXG5cclxuLy8gcmVxdWlyZShcIi4uL2dsb2JhbHNcIik7XHJcbndpbmRvdy5Tb3VuZE1hbmFnZXIgPSByZXF1aXJlKFwiLi4vbWFuYWdlcnMvc291bmRtYW5hZ2VyXCIpO1xyXG53aW5kb3cuZ2FtZVN0YXRlID0gcmVxdWlyZShcIi4uL2dhbWVzdGF0ZVwiKTtcclxuXHJcbnZhciBhbmFseXplcnMgPSB7fTtcclxuXHJcbi8vIE9uIFJlYWR5XHJcbiQoZnVuY3Rpb24oKXtcclxuXHRcclxuXHRyZW5kZXJMb29wLnN0YXJ0KHtcclxuXHRcdF9kaXNhYmxlVGhyZWU6IHRydWUsXHJcblx0XHR0aWNrc1BlclNlY29uZCA6IDIwLFxyXG5cdH0pO1xyXG5cdFxyXG5cdCQoXCIjbG9hZGJ0blwiKS5vbihcImNsaWNrXCIsIGZ1bmN0aW9uKCl7XHJcblx0XHRsb2FkU29uZygkKFwiI2lkaW5cIikudmFsKCkpO1xyXG5cdFx0JChcIiNsb2FkYnRuXCIpLmJsdXIoKTtcclxuXHR9KTtcclxuXHRcclxuXHR2YXIgZGF0YWxpc3QgPSAkKFwiPGRhdGFsaXN0IGlkPSdrbm93blNvbmdzJz5cIik7XHJcblx0Zm9yICh2YXIgaWQgaW4gS05PV05fU09OR1MpIHtcclxuXHRcdGRhdGFsaXN0LmFwcGVuZCgkKFwiPG9wdGlvbj5cIikudGV4dChpZCkpO1xyXG5cdH1cclxuXHQkKFwiI2lkaW5cIikuYWZ0ZXIoZGF0YWxpc3QpO1xyXG5cdFxyXG5cdGRyYXdXYXZlZm9ybXMoKTtcclxufSk7XHJcblxyXG5Tb3VuZE1hbmFnZXIub24oXCJERUJVRy1BbmFseXNlckNyZWF0ZWRcIiwgZnVuY3Rpb24oaWQsIGRhKSB7XHJcblx0YW5hbHl6ZXJzW2lkXSA9IGV4dGVuZCh7YTogZGF9LCBhbmFseXplcnNbaWRdKTtcclxufSk7XHJcblxyXG5Tb3VuZE1hbmFnZXIub24oXCJsb2FkX211c2ljXCIsIGZ1bmN0aW9uKGlkKXtcclxuXHR2YXIgcGxheVBhdXNlID0gJChcIjxidXR0b24+XCIpXHJcblx0XHQuYWRkQ2xhc3MoXCJwbGF5cGF1c2VcIilcclxuXHRcdC50ZXh0KFwiUGxheS9QYXVzZVwiKVxyXG5cdFx0Lm9uKFwiY2xpY2tcIiwgZnVuY3Rpb24oKXtcclxuXHRcdFx0U291bmRNYW5hZ2VyLnRvZ2dsZU11c2ljKGlkKTtcclxuXHRcdH0pO1xyXG5cdFxyXG5cdGFuYWx5emVyc1tpZF0gPSBleHRlbmQoe30sIGFuYWx5emVyc1tpZF0pO1xyXG5cdHZhciBjYW52YXMgPSBhbmFseXplcnNbaWRdLmM7XHJcblx0aWYgKCFjYW52YXMpIHtcclxuXHRcdGNhbnZhcyA9IGFuYWx5emVyc1tpZF0uYyA9IFxyXG5cdFx0JChcIjxjYW52YXM+XCIpXHJcblx0XHRcdC5hdHRyKHsgaGVpZ2h0OiA1OCwgd2lkdGg6IDE1MCB9KVswXTtcclxuXHR9XHJcblx0XHJcblx0JChcIjx0cj5cIilcclxuXHRcdC5hZGRDbGFzcyhcInNvbmdSb3dcIilcclxuXHRcdC5hdHRyKFwibmFtZVwiLCBpZClcclxuXHRcdC5hcHBlbmQoXCI8dGQ+PGgyPlwiK2lkK1wiPC9oMj48L3RkPlwiKVxyXG5cdFx0LmFwcGVuZCgkKFwiPHRkPlwiKS5hcHBlbmQoY2FudmFzKS5jc3Moe1widGV4dC1hbGlnblwiOiBcImNlbnRlclwifSkpXHJcblx0XHQuYXBwZW5kKCQoXCI8dGQ+XCIpLmFwcGVuZChwbGF5UGF1c2UpLmNzcyh7XCJ0ZXh0LWFsaWduXCI6IFwicmlnaHRcIn0pKVxyXG5cdFx0LmFwcGVuZFRvKFwiI2F1ZGlvdGFibGVcIik7XHJcbn0pO1xyXG5cclxuU291bmRNYW5hZ2VyLm9uKFwidW5sb2FkZWQtbXVzaWNcIiwgZnVuY3Rpb24oaWQpe1xyXG5cdCQoXCIjYXVkaW90YWJsZSAuc29uZ1Jvd1tuYW1lPVwiK2lkK1wiXVwiKS5yZW1vdmUoKTtcclxufSk7XHJcblxyXG5cclxuZnVuY3Rpb24gbG9hZFNvbmcoaWQpIHtcclxuXHRTb3VuZE1hbmFnZXIubG9hZE11c2ljKGlkLCBcclxuXHRcdGV4dGVuZCh7XHJcblx0XHRcdHVybDogQkFTRVVSTCtcIi90b29scy9tdXNpYy9cIitpZCtcIi5tcDNcIixcclxuXHRcdH0sIEtOT1dOX1NPTkdTW2lkXSlcclxuXHQpO1xyXG59XHJcblxyXG52YXIgX3JhZkhhbmRsZTtcclxuZnVuY3Rpb24gZHJhd1dhdmVmb3JtcygpIHtcclxuXHQvLyBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9BUEkvV2ViX0F1ZGlvX0FQSS9WaXN1YWxpemF0aW9uc193aXRoX1dlYl9BdWRpb19BUElcclxuXHR2YXIgZGF0YUFycmF5O1xyXG5cdGZvciAodmFyIGlkIGluIGFuYWx5emVycykge1xyXG5cdFx0aWYgKCFhbmFseXplcnNbaWRdLmEgfHwgIWFuYWx5emVyc1tpZF0uYykgY29udGludWU7XHJcblx0XHRcclxuXHRcdGlmICghZGF0YUFycmF5KSB7XHJcblx0XHRcdGRhdGFBcnJheSA9IG5ldyBVaW50OEFycmF5KGFuYWx5emVyc1tpZF0uYS5mZnRTaXplKTtcclxuXHRcdH1cclxuXHRcdHZhciBjYW52YXNDdHggPSBhbmFseXplcnNbaWRdLmMuZ2V0Q29udGV4dChcIjJkXCIpO1xyXG5cdFx0dmFyIFdJRFRIID0gYW5hbHl6ZXJzW2lkXS5jLndpZHRoO1xyXG5cdFx0dmFyIEhFSUdIVCA9IGFuYWx5emVyc1tpZF0uYy5oZWlnaHQ7XHJcblx0XHRcclxuXHRcdC8vIGNhbnZhc0N0eC5jbGVhclJlY3QoMCwgMCwgV0lEVEgsIEhFSUdIVCk7XHJcblx0XHRcclxuXHRcdGFuYWx5emVyc1tpZF0uYS5nZXRCeXRlVGltZURvbWFpbkRhdGEoZGF0YUFycmF5KTtcclxuXHRcdGNhbnZhc0N0eC5maWxsU3R5bGUgPSAnIzAwMDAwMCc7XHJcblx0XHRjYW52YXNDdHguZmlsbFJlY3QoMCwgMCwgV0lEVEgsIEhFSUdIVCk7XHJcblx0XHRcclxuXHRcdGNhbnZhc0N0eC5saW5lV2lkdGggPSAxO1xyXG5cdFx0Y2FudmFzQ3R4LnN0cm9rZVN0eWxlID0gJyNGRkZGRkYnO1xyXG5cdFx0Y2FudmFzQ3R4LmJlZ2luUGF0aCgpO1xyXG5cdFx0XHJcblx0XHR2YXIgc2xpY2VXaWR0aCA9IFdJRFRIICogMS4wIC8gZGF0YUFycmF5Lmxlbmd0aDtcclxuXHRcdHZhciB4ID0gMDtcclxuXHRcdGZvcih2YXIgaSA9IDA7IGkgPCBkYXRhQXJyYXkubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0dmFyIHYgPSBkYXRhQXJyYXlbaV0gLyAxMjguMDtcclxuXHRcdFx0dmFyIHkgPSB2ICogSEVJR0hULzI7XHJcblxyXG5cdFx0XHRpZihpID09PSAwKSB7XHJcblx0XHRcdFx0Y2FudmFzQ3R4Lm1vdmVUbyh4LCB5KTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRjYW52YXNDdHgubGluZVRvKHgsIHkpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHR4ICs9IHNsaWNlV2lkdGg7XHJcblx0XHR9XHJcblx0XHRjYW52YXNDdHgubGluZVRvKFdJRFRILCBIRUlHSFQvMik7XHJcblx0XHRjYW52YXNDdHguc3Ryb2tlKCk7XHJcblx0fVxyXG5cdFxyXG5cdF9yYWZIYW5kbGUgPSByYWYoZHJhd1dhdmVmb3Jtcyk7XHJcbn1cclxuXHJcblxyXG52YXIgS05PV05fU09OR1MgPSB7XHJcblx0XCJnb19nb3RjaGFcIjpcdFx0eyBcImxvb3BTdGFydFwiOiAyNi44NTUsXCJsb29wRW5kXCI6IDU1LjMwOSB9LFxyXG5cdFwiZ29fZW5jb3VudGVyXCI6XHRcdHsgXCJsb29wU3RhcnRcIjogMC40NDAsIFwibG9vcEVuZFwiOiAzOS45NzAgfSxcclxuXHRcImdvX3RpdGxlXCI6XHRcdFx0e30sIC8vTm8gbG9vcCBwb2ludHNcclxuXHRcImdvX3dlbGNvbWVcIjpcdFx0eyBcImxvb3BTdGFydFwiOiAwLjA3MywgXCJsb29wRW5kXCI6IDI3LjQ3MSB9LFxyXG5cdFwiZ29fZXZvbHV0aW9uXCI6XHRcdHsgfSwvL1wibG9vcFN0YXJ0XCI6IDIxLjAwNyxcImxvb3BFbmRcIjogMjcuOTAwIH0sIC8vTG9vcGluZyBpcyBob3JyaWJsZVxyXG5cdFwiZ29fd2Fsa1wiOlx0XHRcdHsgXCJsb29wU3RhcnRcIjogMzMuNjEzLFwibG9vcEVuZFwiOiAxNDEuNzkyIH0sXHJcblx0XCJtX3dlbGNvbWV4eVwiOlx0XHR7IFwibG9vcFN0YXJ0XCI6IDUuMzc0LCBcImxvb3BFbmRcIjogNDEuMzU0IH0sXHJcblx0XCJtX3NwZWFycGlsbGFyXCI6XHR7IFwibG9vcFN0YXJ0XCI6IDIuNDkyLCBcImxvb3BFbmRcIjogNDMuODg0IH0sXHJcblx0XCJtX2dhbGxlcnlcIjogXHRcdHsgXCJsb29wU3RhcnRcIjogMC43NzMsIFwibG9vcEVuZFwiOiA4OS41NTQgfSxcclxuXHRcIm1fd2VsY29tZV9wdFwiOlx0XHR7IFwibG9vcFN0YXJ0XCI6IDIuNDUwLCBcImxvb3BFbmRcIjogNjYuNTAwIH0sXHJcblx0XCJtX3Jlc2VhcmNobGFiXCI6XHR7IFwibG9vcFN0YXJ0XCI6IDIuNDUwLCBcImxvb3BFbmRcIjogNjYuNTAwIH0sXHJcblx0XCJtX2dhbWVjb3JuZXJcIjpcdFx0eyBcImxvb3BTdGFydFwiOiAxOC42MSwgXCJsb29wRW5kXCI6IDc5LjAxMCB9LFxyXG5cdFwibV9jYXNpbm9fd2luXCI6XHRcdHsgXCJsb29wU3RhcnRcIjogMy4xNjAsIFwibG9vcEVuZFwiOiAxNS4xNjcgfSxcclxuXHRcIm1fY2FzaW5vX3dpbjJcIjpcdHsgXCJsb29wU3RhcnRcIjogMS41MTYsIFwibG9vcEVuZFwiOiAxMi4xODUgfSxcclxufTsiLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuZnVuY3Rpb24gRXZlbnRFbWl0dGVyKCkge1xuICB0aGlzLl9ldmVudHMgPSB0aGlzLl9ldmVudHMgfHwge307XG4gIHRoaXMuX21heExpc3RlbmVycyA9IHRoaXMuX21heExpc3RlbmVycyB8fCB1bmRlZmluZWQ7XG59XG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50RW1pdHRlcjtcblxuLy8gQmFja3dhcmRzLWNvbXBhdCB3aXRoIG5vZGUgMC4xMC54XG5FdmVudEVtaXR0ZXIuRXZlbnRFbWl0dGVyID0gRXZlbnRFbWl0dGVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9ldmVudHMgPSB1bmRlZmluZWQ7XG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9tYXhMaXN0ZW5lcnMgPSB1bmRlZmluZWQ7XG5cbi8vIEJ5IGRlZmF1bHQgRXZlbnRFbWl0dGVycyB3aWxsIHByaW50IGEgd2FybmluZyBpZiBtb3JlIHRoYW4gMTAgbGlzdGVuZXJzIGFyZVxuLy8gYWRkZWQgdG8gaXQuIFRoaXMgaXMgYSB1c2VmdWwgZGVmYXVsdCB3aGljaCBoZWxwcyBmaW5kaW5nIG1lbW9yeSBsZWFrcy5cbkV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzID0gMTA7XG5cbi8vIE9idmlvdXNseSBub3QgYWxsIEVtaXR0ZXJzIHNob3VsZCBiZSBsaW1pdGVkIHRvIDEwLiBUaGlzIGZ1bmN0aW9uIGFsbG93c1xuLy8gdGhhdCB0byBiZSBpbmNyZWFzZWQuIFNldCB0byB6ZXJvIGZvciB1bmxpbWl0ZWQuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnNldE1heExpc3RlbmVycyA9IGZ1bmN0aW9uKG4pIHtcbiAgaWYgKCFpc051bWJlcihuKSB8fCBuIDwgMCB8fCBpc05hTihuKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ24gbXVzdCBiZSBhIHBvc2l0aXZlIG51bWJlcicpO1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSBuO1xuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGVyLCBoYW5kbGVyLCBsZW4sIGFyZ3MsIGksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBJZiB0aGVyZSBpcyBubyAnZXJyb3InIGV2ZW50IGxpc3RlbmVyIHRoZW4gdGhyb3cuXG4gIGlmICh0eXBlID09PSAnZXJyb3InKSB7XG4gICAgaWYgKCF0aGlzLl9ldmVudHMuZXJyb3IgfHxcbiAgICAgICAgKGlzT2JqZWN0KHRoaXMuX2V2ZW50cy5lcnJvcikgJiYgIXRoaXMuX2V2ZW50cy5lcnJvci5sZW5ndGgpKSB7XG4gICAgICBlciA9IGFyZ3VtZW50c1sxXTtcbiAgICAgIGlmIChlciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgIHRocm93IGVyOyAvLyBVbmhhbmRsZWQgJ2Vycm9yJyBldmVudFxuICAgICAgfVxuICAgICAgdGhyb3cgVHlwZUVycm9yKCdVbmNhdWdodCwgdW5zcGVjaWZpZWQgXCJlcnJvclwiIGV2ZW50LicpO1xuICAgIH1cbiAgfVxuXG4gIGhhbmRsZXIgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzVW5kZWZpbmVkKGhhbmRsZXIpKVxuICAgIHJldHVybiBmYWxzZTtcblxuICBpZiAoaXNGdW5jdGlvbihoYW5kbGVyKSkge1xuICAgIHN3aXRjaCAoYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgLy8gZmFzdCBjYXNlc1xuICAgICAgY2FzZSAxOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAyOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDM6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgLy8gc2xvd2VyXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgICAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgICAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIGhhbmRsZXIuYXBwbHkodGhpcywgYXJncyk7XG4gICAgfVxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGhhbmRsZXIpKSB7XG4gICAgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuXG4gICAgbGlzdGVuZXJzID0gaGFuZGxlci5zbGljZSgpO1xuICAgIGxlbiA9IGxpc3RlbmVycy5sZW5ndGg7XG4gICAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKVxuICAgICAgbGlzdGVuZXJzW2ldLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIG07XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIFRvIGF2b2lkIHJlY3Vyc2lvbiBpbiB0aGUgY2FzZSB0aGF0IHR5cGUgPT09IFwibmV3TGlzdGVuZXJcIiEgQmVmb3JlXG4gIC8vIGFkZGluZyBpdCB0byB0aGUgbGlzdGVuZXJzLCBmaXJzdCBlbWl0IFwibmV3TGlzdGVuZXJcIi5cbiAgaWYgKHRoaXMuX2V2ZW50cy5uZXdMaXN0ZW5lcilcbiAgICB0aGlzLmVtaXQoJ25ld0xpc3RlbmVyJywgdHlwZSxcbiAgICAgICAgICAgICAgaXNGdW5jdGlvbihsaXN0ZW5lci5saXN0ZW5lcikgP1xuICAgICAgICAgICAgICBsaXN0ZW5lci5saXN0ZW5lciA6IGxpc3RlbmVyKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAvLyBPcHRpbWl6ZSB0aGUgY2FzZSBvZiBvbmUgbGlzdGVuZXIuIERvbid0IG5lZWQgdGhlIGV4dHJhIGFycmF5IG9iamVjdC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBsaXN0ZW5lcjtcbiAgZWxzZSBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICAvLyBJZiB3ZSd2ZSBhbHJlYWR5IGdvdCBhbiBhcnJheSwganVzdCBhcHBlbmQuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdLnB1c2gobGlzdGVuZXIpO1xuICBlbHNlXG4gICAgLy8gQWRkaW5nIHRoZSBzZWNvbmQgZWxlbWVudCwgbmVlZCB0byBjaGFuZ2UgdG8gYXJyYXkuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gW3RoaXMuX2V2ZW50c1t0eXBlXSwgbGlzdGVuZXJdO1xuXG4gIC8vIENoZWNrIGZvciBsaXN0ZW5lciBsZWFrXG4gIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pICYmICF0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkKSB7XG4gICAgdmFyIG07XG4gICAgaWYgKCFpc1VuZGVmaW5lZCh0aGlzLl9tYXhMaXN0ZW5lcnMpKSB7XG4gICAgICBtID0gdGhpcy5fbWF4TGlzdGVuZXJzO1xuICAgIH0gZWxzZSB7XG4gICAgICBtID0gRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnM7XG4gICAgfVxuXG4gICAgaWYgKG0gJiYgbSA+IDAgJiYgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCA+IG0pIHtcbiAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQgPSB0cnVlO1xuICAgICAgY29uc29sZS5lcnJvcignKG5vZGUpIHdhcm5pbmc6IHBvc3NpYmxlIEV2ZW50RW1pdHRlciBtZW1vcnkgJyArXG4gICAgICAgICAgICAgICAgICAgICdsZWFrIGRldGVjdGVkLiAlZCBsaXN0ZW5lcnMgYWRkZWQuICcgK1xuICAgICAgICAgICAgICAgICAgICAnVXNlIGVtaXR0ZXIuc2V0TWF4TGlzdGVuZXJzKCkgdG8gaW5jcmVhc2UgbGltaXQuJyxcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCk7XG4gICAgICBpZiAodHlwZW9mIGNvbnNvbGUudHJhY2UgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgLy8gbm90IHN1cHBvcnRlZCBpbiBJRSAxMFxuICAgICAgICBjb25zb2xlLnRyYWNlKCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbmNlID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIHZhciBmaXJlZCA9IGZhbHNlO1xuXG4gIGZ1bmN0aW9uIGcoKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBnKTtcblxuICAgIGlmICghZmlyZWQpIHtcbiAgICAgIGZpcmVkID0gdHJ1ZTtcbiAgICAgIGxpc3RlbmVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICB9XG5cbiAgZy5saXN0ZW5lciA9IGxpc3RlbmVyO1xuICB0aGlzLm9uKHR5cGUsIGcpO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLy8gZW1pdHMgYSAncmVtb3ZlTGlzdGVuZXInIGV2ZW50IGlmZiB0aGUgbGlzdGVuZXIgd2FzIHJlbW92ZWRcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbGlzdCwgcG9zaXRpb24sIGxlbmd0aCwgaTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXR1cm4gdGhpcztcblxuICBsaXN0ID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuICBsZW5ndGggPSBsaXN0Lmxlbmd0aDtcbiAgcG9zaXRpb24gPSAtMTtcblxuICBpZiAobGlzdCA9PT0gbGlzdGVuZXIgfHxcbiAgICAgIChpc0Z1bmN0aW9uKGxpc3QubGlzdGVuZXIpICYmIGxpc3QubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG5cbiAgfSBlbHNlIGlmIChpc09iamVjdChsaXN0KSkge1xuICAgIGZvciAoaSA9IGxlbmd0aDsgaS0tID4gMDspIHtcbiAgICAgIGlmIChsaXN0W2ldID09PSBsaXN0ZW5lciB8fFxuICAgICAgICAgIChsaXN0W2ldLmxpc3RlbmVyICYmIGxpc3RbaV0ubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgICAgICBwb3NpdGlvbiA9IGk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChwb3NpdGlvbiA8IDApXG4gICAgICByZXR1cm4gdGhpcztcblxuICAgIGlmIChsaXN0Lmxlbmd0aCA9PT0gMSkge1xuICAgICAgbGlzdC5sZW5ndGggPSAwO1xuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGlzdC5zcGxpY2UocG9zaXRpb24sIDEpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUFsbExpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGtleSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIC8vIG5vdCBsaXN0ZW5pbmcgZm9yIHJlbW92ZUxpc3RlbmVyLCBubyBuZWVkIHRvIGVtaXRcbiAgaWYgKCF0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMClcbiAgICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIGVsc2UgaWYgKHRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvLyBlbWl0IHJlbW92ZUxpc3RlbmVyIGZvciBhbGwgbGlzdGVuZXJzIG9uIGFsbCBldmVudHNcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICBmb3IgKGtleSBpbiB0aGlzLl9ldmVudHMpIHtcbiAgICAgIGlmIChrZXkgPT09ICdyZW1vdmVMaXN0ZW5lcicpIGNvbnRpbnVlO1xuICAgICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoa2V5KTtcbiAgICB9XG4gICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoJ3JlbW92ZUxpc3RlbmVyJyk7XG4gICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBsaXN0ZW5lcnMgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzRnVuY3Rpb24obGlzdGVuZXJzKSkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBMSUZPIG9yZGVyXG4gICAgd2hpbGUgKGxpc3RlbmVycy5sZW5ndGgpXG4gICAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVyc1tsaXN0ZW5lcnMubGVuZ3RoIC0gMV0pO1xuICB9XG4gIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSBbXTtcbiAgZWxzZSBpZiAoaXNGdW5jdGlvbih0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IFt0aGlzLl9ldmVudHNbdHlwZV1dO1xuICBlbHNlXG4gICAgcmV0ID0gdGhpcy5fZXZlbnRzW3R5cGVdLnNsaWNlKCk7XG4gIHJldHVybiByZXQ7XG59O1xuXG5FdmVudEVtaXR0ZXIubGlzdGVuZXJDb3VudCA9IGZ1bmN0aW9uKGVtaXR0ZXIsIHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCFlbWl0dGVyLl9ldmVudHMgfHwgIWVtaXR0ZXIuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSAwO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKGVtaXR0ZXIuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gMTtcbiAgZWxzZVxuICAgIHJldCA9IGVtaXR0ZXIuX2V2ZW50c1t0eXBlXS5sZW5ndGg7XG4gIHJldHVybiByZXQ7XG59O1xuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Z1bmN0aW9uJztcbn1cblxuZnVuY3Rpb24gaXNOdW1iZXIoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnbnVtYmVyJztcbn1cblxuZnVuY3Rpb24gaXNPYmplY3QoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiBhcmcgIT09IG51bGw7XG59XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09PSB2b2lkIDA7XG59XG4iLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG5wcm9jZXNzLm5leHRUaWNrID0gKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY2FuU2V0SW1tZWRpYXRlID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cuc2V0SW1tZWRpYXRlO1xuICAgIHZhciBjYW5NdXRhdGlvbk9ic2VydmVyID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cuTXV0YXRpb25PYnNlcnZlcjtcbiAgICB2YXIgY2FuUG9zdCA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnBvc3RNZXNzYWdlICYmIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyXG4gICAgO1xuXG4gICAgaWYgKGNhblNldEltbWVkaWF0ZSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGYpIHsgcmV0dXJuIHdpbmRvdy5zZXRJbW1lZGlhdGUoZikgfTtcbiAgICB9XG5cbiAgICB2YXIgcXVldWUgPSBbXTtcblxuICAgIGlmIChjYW5NdXRhdGlvbk9ic2VydmVyKSB7XG4gICAgICAgIHZhciBoaWRkZW5EaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICAgICAgICB2YXIgb2JzZXJ2ZXIgPSBuZXcgTXV0YXRpb25PYnNlcnZlcihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgcXVldWVMaXN0ID0gcXVldWUuc2xpY2UoKTtcbiAgICAgICAgICAgIHF1ZXVlLmxlbmd0aCA9IDA7XG4gICAgICAgICAgICBxdWV1ZUxpc3QuZm9yRWFjaChmdW5jdGlvbiAoZm4pIHtcbiAgICAgICAgICAgICAgICBmbigpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIG9ic2VydmVyLm9ic2VydmUoaGlkZGVuRGl2LCB7IGF0dHJpYnV0ZXM6IHRydWUgfSk7XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgICAgICBpZiAoIXF1ZXVlLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGhpZGRlbkRpdi5zZXRBdHRyaWJ1dGUoJ3llcycsICdubycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcXVldWUucHVzaChmbik7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgaWYgKGNhblBvc3QpIHtcbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBmdW5jdGlvbiAoZXYpIHtcbiAgICAgICAgICAgIHZhciBzb3VyY2UgPSBldi5zb3VyY2U7XG4gICAgICAgICAgICBpZiAoKHNvdXJjZSA9PT0gd2luZG93IHx8IHNvdXJjZSA9PT0gbnVsbCkgJiYgZXYuZGF0YSA9PT0gJ3Byb2Nlc3MtdGljaycpIHtcbiAgICAgICAgICAgICAgICBldi5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICBpZiAocXVldWUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZm4gPSBxdWV1ZS5zaGlmdCgpO1xuICAgICAgICAgICAgICAgICAgICBmbigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgICAgICBxdWV1ZS5wdXNoKGZuKTtcbiAgICAgICAgICAgIHdpbmRvdy5wb3N0TWVzc2FnZSgncHJvY2Vzcy10aWNrJywgJyonKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgc2V0VGltZW91dChmbiwgMCk7XG4gICAgfTtcbn0pKCk7XG5cbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcblxuLy8gVE9ETyhzaHR5bG1hbilcbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuIiwidmFyIG5vdyA9IHJlcXVpcmUoJ3BlcmZvcm1hbmNlLW5vdycpXG4gICwgZ2xvYmFsID0gdHlwZW9mIHdpbmRvdyA9PT0gJ3VuZGVmaW5lZCcgPyB7fSA6IHdpbmRvd1xuICAsIHZlbmRvcnMgPSBbJ21veicsICd3ZWJraXQnXVxuICAsIHN1ZmZpeCA9ICdBbmltYXRpb25GcmFtZSdcbiAgLCByYWYgPSBnbG9iYWxbJ3JlcXVlc3QnICsgc3VmZml4XVxuICAsIGNhZiA9IGdsb2JhbFsnY2FuY2VsJyArIHN1ZmZpeF0gfHwgZ2xvYmFsWydjYW5jZWxSZXF1ZXN0JyArIHN1ZmZpeF1cbiAgLCBpc05hdGl2ZSA9IHRydWVcblxuZm9yKHZhciBpID0gMDsgaSA8IHZlbmRvcnMubGVuZ3RoICYmICFyYWY7IGkrKykge1xuICByYWYgPSBnbG9iYWxbdmVuZG9yc1tpXSArICdSZXF1ZXN0JyArIHN1ZmZpeF1cbiAgY2FmID0gZ2xvYmFsW3ZlbmRvcnNbaV0gKyAnQ2FuY2VsJyArIHN1ZmZpeF1cbiAgICAgIHx8IGdsb2JhbFt2ZW5kb3JzW2ldICsgJ0NhbmNlbFJlcXVlc3QnICsgc3VmZml4XVxufVxuXG4vLyBTb21lIHZlcnNpb25zIG9mIEZGIGhhdmUgckFGIGJ1dCBub3QgY0FGXG5pZighcmFmIHx8ICFjYWYpIHtcbiAgaXNOYXRpdmUgPSBmYWxzZVxuXG4gIHZhciBsYXN0ID0gMFxuICAgICwgaWQgPSAwXG4gICAgLCBxdWV1ZSA9IFtdXG4gICAgLCBmcmFtZUR1cmF0aW9uID0gMTAwMCAvIDYwXG5cbiAgcmFmID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICBpZihxdWV1ZS5sZW5ndGggPT09IDApIHtcbiAgICAgIHZhciBfbm93ID0gbm93KClcbiAgICAgICAgLCBuZXh0ID0gTWF0aC5tYXgoMCwgZnJhbWVEdXJhdGlvbiAtIChfbm93IC0gbGFzdCkpXG4gICAgICBsYXN0ID0gbmV4dCArIF9ub3dcbiAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBjcCA9IHF1ZXVlLnNsaWNlKDApXG4gICAgICAgIC8vIENsZWFyIHF1ZXVlIGhlcmUgdG8gcHJldmVudFxuICAgICAgICAvLyBjYWxsYmFja3MgZnJvbSBhcHBlbmRpbmcgbGlzdGVuZXJzXG4gICAgICAgIC8vIHRvIHRoZSBjdXJyZW50IGZyYW1lJ3MgcXVldWVcbiAgICAgICAgcXVldWUubGVuZ3RoID0gMFxuICAgICAgICBmb3IodmFyIGkgPSAwOyBpIDwgY3AubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBpZighY3BbaV0uY2FuY2VsbGVkKSB7XG4gICAgICAgICAgICB0cnl7XG4gICAgICAgICAgICAgIGNwW2ldLmNhbGxiYWNrKGxhc3QpXG4gICAgICAgICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHsgdGhyb3cgZSB9LCAwKVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSwgTWF0aC5yb3VuZChuZXh0KSlcbiAgICB9XG4gICAgcXVldWUucHVzaCh7XG4gICAgICBoYW5kbGU6ICsraWQsXG4gICAgICBjYWxsYmFjazogY2FsbGJhY2ssXG4gICAgICBjYW5jZWxsZWQ6IGZhbHNlXG4gICAgfSlcbiAgICByZXR1cm4gaWRcbiAgfVxuXG4gIGNhZiA9IGZ1bmN0aW9uKGhhbmRsZSkge1xuICAgIGZvcih2YXIgaSA9IDA7IGkgPCBxdWV1ZS5sZW5ndGg7IGkrKykge1xuICAgICAgaWYocXVldWVbaV0uaGFuZGxlID09PSBoYW5kbGUpIHtcbiAgICAgICAgcXVldWVbaV0uY2FuY2VsbGVkID0gdHJ1ZVxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGZuKSB7XG4gIC8vIFdyYXAgaW4gYSBuZXcgZnVuY3Rpb24gdG8gcHJldmVudFxuICAvLyBgY2FuY2VsYCBwb3RlbnRpYWxseSBiZWluZyBhc3NpZ25lZFxuICAvLyB0byB0aGUgbmF0aXZlIHJBRiBmdW5jdGlvblxuICBpZighaXNOYXRpdmUpIHtcbiAgICByZXR1cm4gcmFmLmNhbGwoZ2xvYmFsLCBmbilcbiAgfVxuICByZXR1cm4gcmFmLmNhbGwoZ2xvYmFsLCBmdW5jdGlvbigpIHtcbiAgICB0cnl7XG4gICAgICBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpXG4gICAgfSBjYXRjaChlKSB7XG4gICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkgeyB0aHJvdyBlIH0sIDApXG4gICAgfVxuICB9KVxufVxubW9kdWxlLmV4cG9ydHMuY2FuY2VsID0gZnVuY3Rpb24oKSB7XG4gIGNhZi5hcHBseShnbG9iYWwsIGFyZ3VtZW50cylcbn1cbiIsIihmdW5jdGlvbiAocHJvY2Vzcyl7XG4vLyBHZW5lcmF0ZWQgYnkgQ29mZmVlU2NyaXB0IDEuNi4zXG4oZnVuY3Rpb24oKSB7XG4gIHZhciBnZXROYW5vU2Vjb25kcywgaHJ0aW1lLCBsb2FkVGltZTtcblxuICBpZiAoKHR5cGVvZiBwZXJmb3JtYW5jZSAhPT0gXCJ1bmRlZmluZWRcIiAmJiBwZXJmb3JtYW5jZSAhPT0gbnVsbCkgJiYgcGVyZm9ybWFuY2Uubm93KSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBwZXJmb3JtYW5jZS5ub3coKTtcbiAgICB9O1xuICB9IGVsc2UgaWYgKCh0eXBlb2YgcHJvY2VzcyAhPT0gXCJ1bmRlZmluZWRcIiAmJiBwcm9jZXNzICE9PSBudWxsKSAmJiBwcm9jZXNzLmhydGltZSkge1xuICAgIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gKGdldE5hbm9TZWNvbmRzKCkgLSBsb2FkVGltZSkgLyAxZTY7XG4gICAgfTtcbiAgICBocnRpbWUgPSBwcm9jZXNzLmhydGltZTtcbiAgICBnZXROYW5vU2Vjb25kcyA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGhyO1xuICAgICAgaHIgPSBocnRpbWUoKTtcbiAgICAgIHJldHVybiBoclswXSAqIDFlOSArIGhyWzFdO1xuICAgIH07XG4gICAgbG9hZFRpbWUgPSBnZXROYW5vU2Vjb25kcygpO1xuICB9IGVsc2UgaWYgKERhdGUubm93KSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBEYXRlLm5vdygpIC0gbG9hZFRpbWU7XG4gICAgfTtcbiAgICBsb2FkVGltZSA9IERhdGUubm93KCk7XG4gIH0gZWxzZSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBuZXcgRGF0ZSgpLmdldFRpbWUoKSAtIGxvYWRUaW1lO1xuICAgIH07XG4gICAgbG9hZFRpbWUgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgfVxuXG59KS5jYWxsKHRoaXMpO1xuXG4vKlxuXG4qL1xuXG59KS5jYWxsKHRoaXMscmVxdWlyZSgnX3Byb2Nlc3MnKSlcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWRhdGE6YXBwbGljYXRpb24vanNvbjtjaGFyc2V0OnV0Zi04O2Jhc2U2NCxleUoyWlhKemFXOXVJam96TENKemIzVnlZMlZ6SWpwYkltNXZaR1ZmYlc5a2RXeGxjeTl5WVdZdmJtOWtaVjl0YjJSMWJHVnpMM0JsY21admNtMWhibU5sTFc1dmR5OXNhV0l2Y0dWeVptOXliV0Z1WTJVdGJtOTNMbXB6SWwwc0ltNWhiV1Z6SWpwYlhTd2liV0Z3Y0dsdVozTWlPaUk3UVVGQlFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFTSXNJbVpwYkdVaU9pSm5aVzVsY21GMFpXUXVhbk1pTENKemIzVnlZMlZTYjI5MElqb2lJaXdpYzI5MWNtTmxjME52Ym5SbGJuUWlPbHNpTHk4Z1IyVnVaWEpoZEdWa0lHSjVJRU52Wm1abFpWTmpjbWx3ZENBeExqWXVNMXh1S0daMWJtTjBhVzl1S0NrZ2UxeHVJQ0IyWVhJZ1oyVjBUbUZ1YjFObFkyOXVaSE1zSUdoeWRHbHRaU3dnYkc5aFpGUnBiV1U3WEc1Y2JpQWdhV1lnS0NoMGVYQmxiMllnY0dWeVptOXliV0Z1WTJVZ0lUMDlJRndpZFc1a1pXWnBibVZrWENJZ0ppWWdjR1Z5Wm05eWJXRnVZMlVnSVQwOUlHNTFiR3dwSUNZbUlIQmxjbVp2Y20xaGJtTmxMbTV2ZHlrZ2UxeHVJQ0FnSUcxdlpIVnNaUzVsZUhCdmNuUnpJRDBnWm5WdVkzUnBiMjRvS1NCN1hHNGdJQ0FnSUNCeVpYUjFjbTRnY0dWeVptOXliV0Z1WTJVdWJtOTNLQ2s3WEc0Z0lDQWdmVHRjYmlBZ2ZTQmxiSE5sSUdsbUlDZ29kSGx3Wlc5bUlIQnliMk5sYzNNZ0lUMDlJRndpZFc1a1pXWnBibVZrWENJZ0ppWWdjSEp2WTJWemN5QWhQVDBnYm5Wc2JDa2dKaVlnY0hKdlkyVnpjeTVvY25ScGJXVXBJSHRjYmlBZ0lDQnRiMlIxYkdVdVpYaHdiM0owY3lBOUlHWjFibU4wYVc5dUtDa2dlMXh1SUNBZ0lDQWdjbVYwZFhKdUlDaG5aWFJPWVc1dlUyVmpiMjVrY3lncElDMGdiRzloWkZScGJXVXBJQzhnTVdVMk8xeHVJQ0FnSUgwN1hHNGdJQ0FnYUhKMGFXMWxJRDBnY0hKdlkyVnpjeTVvY25ScGJXVTdYRzRnSUNBZ1oyVjBUbUZ1YjFObFkyOXVaSE1nUFNCbWRXNWpkR2x2YmlncElIdGNiaUFnSUNBZ0lIWmhjaUJvY2p0Y2JpQWdJQ0FnSUdoeUlEMGdhSEowYVcxbEtDazdYRzRnSUNBZ0lDQnlaWFIxY200Z2FISmJNRjBnS2lBeFpUa2dLeUJvY2xzeFhUdGNiaUFnSUNCOU8xeHVJQ0FnSUd4dllXUlVhVzFsSUQwZ1oyVjBUbUZ1YjFObFkyOXVaSE1vS1R0Y2JpQWdmU0JsYkhObElHbG1JQ2hFWVhSbExtNXZkeWtnZTF4dUlDQWdJRzF2WkhWc1pTNWxlSEJ2Y25SeklEMGdablZ1WTNScGIyNG9LU0I3WEc0Z0lDQWdJQ0J5WlhSMWNtNGdSR0YwWlM1dWIzY29LU0F0SUd4dllXUlVhVzFsTzF4dUlDQWdJSDA3WEc0Z0lDQWdiRzloWkZScGJXVWdQU0JFWVhSbExtNXZkeWdwTzF4dUlDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUcxdlpIVnNaUzVsZUhCdmNuUnpJRDBnWm5WdVkzUnBiMjRvS1NCN1hHNGdJQ0FnSUNCeVpYUjFjbTRnYm1WM0lFUmhkR1VvS1M1blpYUlVhVzFsS0NrZ0xTQnNiMkZrVkdsdFpUdGNiaUFnSUNCOU8xeHVJQ0FnSUd4dllXUlVhVzFsSUQwZ2JtVjNJRVJoZEdVb0tTNW5aWFJVYVcxbEtDazdYRzRnSUgxY2JseHVmU2t1WTJGc2JDaDBhR2x6S1R0Y2JseHVMeXBjYmk4dlFDQnpiM1Z5WTJWTllYQndhVzVuVlZKTVBYQmxjbVp2Y20xaGJtTmxMVzV2ZHk1dFlYQmNiaW92WEc0aVhYMD0iLCIvLyBnYW1lc3RhdGUuanNcclxuLy8gXHJcblxyXG4kLmNvb2tpZS5qc29uID0gdHJ1ZTtcclxuXHJcbnZhciBnYW1lU3RhdGUgPVxyXG5tb2R1bGUuZXhwb3J0cyA9IHtcclxuXHRsb2FkOiBmdW5jdGlvbigpIHtcclxuXHRcdHZhciBzYXZlZCA9ICQuY29va2llKHtwYXRoOiBCQVNFVVJMfSk7XHJcblx0XHRnYW1lU3RhdGUucGxheWVyU3ByaXRlID0gc2F2ZWQucGxheWVyU3ByaXRlO1xyXG5cdFx0Z2FtZVN0YXRlLm1hcFRyYW5zaXRpb24gPSBzYXZlZC5tYXBUcmFuc2l0aW9uO1xyXG5cdFx0XHJcblx0XHRnYW1lU3RhdGUuaW5mb2RleC5yZWdpc3RlciA9IEpTT04ucGFyc2UoJC5iYXNlNjQuZGVjb2RlKHNhdmVkLmluZm9kZXgpKTtcclxuXHR9LFxyXG5cdFxyXG5cdHNhdmVMb2NhdGlvbjogZnVuY3Rpb24ob3B0cykge1xyXG5cdFx0Ly9JbnNlcnQgaXRlbXMgdG8gYmUgc2F2ZWQgaGVyZVxyXG5cdFx0dmFyIG8gPSB7XHJcblx0XHRcdG5leHRNYXA6IG9wdHMubWFwIHx8IG9wdHMubmV4dE1hcCB8fCBnYW1lU3RhdGUubWFwVHJhbnNpdGlvbi5uZXh0TWFwLFxyXG5cdFx0XHR3YXJwOiBvcHRzLndhcnAgfHwgZ2FtZVN0YXRlLm1hcFRyYW5zaXRpb24ud2FycCxcclxuXHRcdFx0YW5pbU92ZXJyaWRlOiBcclxuXHRcdFx0XHQob3B0cy5hbmltICE9PSB1bmRlZmluZWQpPyBvcHRzLmFuaW0gOiBcclxuXHRcdFx0XHQob3B0cy5hbmltT3ZlcnJpZGUgIT09IHVuZGVmaW5lZCk/IG9wdHMuYW5pbU92ZXJyaWRlIDogXHJcblx0XHRcdFx0Z2FtZVN0YXRlLm1hcFRyYW5zaXRpb24uYW5pbU92ZXJyaWRlLFxyXG5cdFx0fVxyXG5cdFx0JC5jb29raWUoXCJtYXBUcmFuc2l0aW9uXCIsIG8sIHtwYXRoOiBCQVNFVVJMfSk7XHJcblx0fSxcclxuXHRcclxuXHQvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblx0Ly8gTWFwIFRyYW5zaXRpb25cclxuXHRtYXBUcmFuc2l0aW9uIDoge1xyXG5cdFx0bmV4dE1hcCA6IFwiaUNodXJjaE9mSGVsaXhcIixcclxuXHRcdHdhcnA6IDB4MTAsXHJcblx0XHRhbmltT3ZlcnJpZGU6IDAsXHJcblx0fSxcclxuXHRcclxuXHRwbGF5ZXJTcHJpdGUgOiBcIm1lbG9keVtoZ192ZXJ0bWl4LTMyXS5wbmdcIixcclxuXHRcclxufTtcclxuXHJcbi8vIEluZm9kZXggZnVuY3Rpb25zXHJcbmdhbWVTdGF0ZS5pbmZvZGV4ID0ge1xyXG5cdHJlZ2lzdGVyOiB7fSxcclxuXHRzZWVuOiAwLFxyXG5cdGZvdW5kOiAwLFxyXG5cdFxyXG5cdF9fbWFyazogZnVuY3Rpb24oY29udGFpbmVyLCB1cmwsIG1hcmspIHtcclxuXHRcdHZhciBjb21wID0gdXJsLnNoaWZ0KCk7XHJcblx0XHR2YXIgb2xkID0gY29udGFpbmVyW2NvbXBdO1xyXG5cdFx0aWYgKCF1cmwubGVuZ3RoKSB7XHJcblx0XHRcdC8vIFdlJ3JlIGF0IHRoZSBlbmQgb2YgdGhlIFVSTCwgdGhpcyBzaG91bGQgYmUgYSBsZWFmIG5vZGVcclxuXHRcdFx0aWYgKCFvbGQpIG9sZCA9IGNvbnRhaW5lcltjb21wXSA9IDA7XHJcblx0XHRcdGlmICh0eXBlb2Ygb2xkICE9PSBcIm51bWJlclwiKSBcclxuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJVUkwgZG9lcyBub3QgcG9pbnQgdG8gbGVhZiBub2RlIVwiKTtcclxuXHRcdFx0Y29udGFpbmVyW2NvbXBdIHw9IG1hcms7XHJcblx0XHRcdHJldHVybiBvbGQ7XHJcblx0XHRcdFxyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0Ly9TdGlsbCBnb2luZyBkb3duIHRoZSB1cmxcclxuXHRcdFx0aWYgKCFvbGQpIG9sZCA9IGNvbnRhaW5lcltjb21wXSA9IHt9O1xyXG5cdFx0XHRyZXR1cm4gdGhpcy5fX21hcmsob2xkLCB1cmwsIG1hcmspOyAvL3RhaWwgY2FsbFxyXG5cdFx0fVxyXG5cdH0sXHJcblx0XHJcblx0bWFya1NlZW46IGZ1bmN0aW9uKHVybCkge1xyXG5cdFx0Ly8gdmFyIGNvbXAgPSB1cmwuc3BsaXQoXCIuXCIpO1xyXG5cdFx0Ly8gdmFyIHJlZyA9IGdhbWVTdGF0ZS5pbmZvZGV4LnJlZ2lzdGVyOyAvL1t1cmxdIHw9IDE7IC8vc2V0IHRvIGF0IGxlYXN0IDFcclxuXHRcdFxyXG5cdFx0Ly8gZm9yICh2YXIgaSA9IDA7IGkgPCBjb21wLmxlbmd0aC0xOyBpKyspIHtcclxuXHRcdC8vIFx0cmVnID0gcmVnW2NvbXBbaV1dIHx8IHt9O1xyXG5cdFx0Ly8gfVxyXG5cdFx0Ly8gcmVnW11cclxuXHRcdHZhciByZXMgPSB0aGlzLl9fbWFyayh0aGlzLnJlZ2lzdGVyLCB1cmwuc3BsaXQoXCIuXCIpLCAxKTtcclxuXHRcdGlmIChyZXMgPT0gMCkgeyB0aGlzLnNlZW4rKzsgfVxyXG5cdH0sXHJcblx0bWFya0ZvdW5kOiBmdW5jdGlvbih1cmwpIHtcclxuXHRcdC8vIGdhbWVTdGF0ZS5pbmZvZGV4W3VybF0gfD0gMjsgLy9zZXQgdG8gYXQgbGVhc3QgMlxyXG5cdFx0dmFyIHJlcyA9IHRoaXMuX19tYXJrKHRoaXMucmVnaXN0ZXIsIHVybC5zcGxpdChcIi5cIiksIDIpO1xyXG5cdFx0aWYgKHJlcyA9PSAwKSB7IHRoaXMuc2VlbisrOyB0aGlzLmZvdW5kKys7IH1cclxuXHRcdGVsc2UgaWYgKHJlcyA9PSAxKSB7IHRoaXMuZm91bmQrKzsgfVxyXG5cdH0sXHJcblx0XHJcblx0XHJcblx0XHJcbn07IiwiLy8gc291bmRtYW5hZ2VyLmpzXHJcbi8vIERlZmluZXMgdGhlIFNvdW5kIE1hbmFnZXJcclxuXHJcbnZhciBpbmhlcml0cyA9IHJlcXVpcmUoXCJpbmhlcml0c1wiKTtcclxudmFyIGV4dGVuZCA9IHJlcXVpcmUoXCJleHRlbmRcIik7XHJcbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKFwiZXZlbnRzXCIpLkV2ZW50RW1pdHRlcjtcclxuXHJcbnZhciBhdWRpb0NvbnRleHQ7XHJcblxyXG52YXIgTUFYX01VU0lDID0gODsgLy9NYXggbnVtYmVyIG9mIG11c2ljIHRyYWNrcyBjYWNoZWQgaW4gbWVtb3J5XHJcbnZhciBNQVhfU09VTkRTID0gMTY7IC8vTWF4IG51bWJlciBvZiBzb3VuZHMgY2FjaGVkIGluIG1lbW9yeVxyXG5cclxuLyoqXHJcbiAqL1xyXG5mdW5jdGlvbiBTb3VuZE1hbmFnZXIoKSB7XHJcblx0dGhpcy50ZXN0U3VwcG9ydCgpO1xyXG5cdFxyXG5cdHRoaXMucHJlbG9hZFNvdW5kKFwid2Fsa19idW1wXCIpO1xyXG5cdHRoaXMucHJlbG9hZFNvdW5kKFwid2Fsa19qdW1wXCIpO1xyXG5cdHRoaXMucHJlbG9hZFNvdW5kKFwid2Fsa19qdW1wX2xhbmRcIik7XHJcblx0dGhpcy5wcmVsb2FkU291bmQoXCJleGl0X3dhbGtcIik7XHJcblx0XHJcblx0dGhpcy5yZWdpc3RlclByZWxvYWRlZE11c2ljKFwibV90b3Jud29ybGRcIiwge1xyXG5cdFx0dGFnOiBET1JJVE9fTVVTSUMsXHJcblx0XHRsb29wU3RhcnQ6IDEzLjMwNCxcclxuXHRcdGxvb3BFbmQ6IDIyLjg0MixcclxuXHR9KTtcclxufVxyXG5pbmhlcml0cyhTb3VuZE1hbmFnZXIsIEV2ZW50RW1pdHRlcik7XHJcbmV4dGVuZChTb3VuZE1hbmFnZXIucHJvdG90eXBlLCB7XHJcblx0c291bmRzIDoge30sXHJcblx0bXVzaWM6IHt9LFxyXG5cdGV4dCA6IG51bGwsXHJcblx0Y3JlYXRlQXVkaW86IG51bGwsXHJcblx0XHJcblx0X19tdXRlZF9tdXNpYzogZmFsc2UsXHJcblx0X19tdXRlZF9zb3VuZDogZmFsc2UsXHJcblx0X192b2xfbXVzaWM6IDAuNSxcclxuXHRfX3ZvbF9zb3VuZDogMC41LFxyXG5cdFxyXG5cdHRlc3RTdXBwb3J0IDogZnVuY3Rpb24oKSB7XHJcblx0XHR2YXIgdGVzdHNvdW5kID0gbmV3IEF1ZGlvKCk7XHJcblx0XHR2YXIgb2dnID0gdGVzdHNvdW5kLmNhblBsYXlUeXBlKFwiYXVkaW8vb2dnOyBjb2RlY3M9dm9yYmlzXCIpO1xyXG5cdFx0aWYgKG9nZykgdGhpcy5leHQgPSBcIi5vZ2dcIjtcclxuXHRcdGVsc2UgdGhpcy5leHQgPSBcIi5tcDNcIjtcclxuXHRcdFxyXG5cdFx0dHJ5IHtcclxuXHRcdFx0YXVkaW9Db250ZXh0ID0gbmV3ICh3aW5kb3cuQXVkaW9Db250ZXh0IHx8IHdpbmRvdy53ZWJraXRBdWRpb0NvbnRleHQpKCk7XHJcblx0XHRcdGlmIChhdWRpb0NvbnRleHQpIHtcclxuXHRcdFx0XHR0aGlzLmNyZWF0ZUF1ZGlvID0gY3JlYXRlQXVkaW9fV2ViQVBJO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdHRoaXMuY3JlYXRlQXVkaW8gPSBjcmVhdGVBdWRpb19UYWc7XHJcblx0XHRcdH1cclxuXHRcdFx0dGhpcy5fX2F1ZGlvQ29udGV4dCA9IGF1ZGlvQ29udGV4dDtcclxuXHRcdH0gY2F0Y2ggKGUpIHtcclxuXHRcdFx0dGhpcy5jcmVhdGVBdWRpbyA9IGNyZWF0ZUF1ZGlvX1RhZztcclxuXHRcdH1cclxuXHRcdFxyXG5cdH0sXHJcblx0XHJcblx0Ly8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8gTG9hZGluZyAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHRcclxuXHQvKiogTG9hZHMgc291bmQgZnJvbSB0aGUgc2VydmVyLCB1c2VkIGFzIHBhcnQgb2YgdGhlIHN0YXJ0dXAgcHJvY2Vzcy4gKi9cclxuXHRwcmVsb2FkU291bmQgOiBmdW5jdGlvbihpZCkge1xyXG5cdFx0aWYgKCF0aGlzLnNvdW5kc1tpZF0pIHtcclxuXHRcdFx0dGhpcy5zb3VuZHNbaWRdID0gdGhpcy5jcmVhdGVBdWRpbyhpZCwge1xyXG5cdFx0XHRcdHVybCA6IEJBU0VVUkwrXCIvc25kL1wiICsgaWQgKyB0aGlzLmV4dCxcclxuXHRcdFx0fSk7XHJcblx0XHRcdHRoaXMuc291bmRzW2lkXS5tdXN0S2VlcCA9IHRydWU7XHJcblx0XHRcdHRoaXMuZW1pdChcImxvYWRfc291bmRcIiwgaWQpO1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIHRoaXMuc291bmRzW2lkXTtcclxuXHR9LFxyXG5cdFxyXG5cdC8qKiBMb2FkcyBtdXNpYyBmcm9tIHRoZSBzZXJ2ZXIsIHVzZWQgYXMgcGFydCBvZiB0aGUgc3RhcnR1cCBwcm9jZXNzLiAqL1xyXG5cdHJlZ2lzdGVyUHJlbG9hZGVkTXVzaWM6IGZ1bmN0aW9uKGlkLCBpbmZvKSB7XHJcblx0XHRpZiAoIXRoaXMubXVzaWNbaWRdKSB7XHJcblx0XHRcdHRoaXMubXVzaWNbaWRdID0gY3JlYXRlQXVkaW9fVGFnKGlkLCBpbmZvKTsgLy9mb3JjZSB1c2luZyB0aGlzIGtpbmRcclxuXHRcdFx0dGhpcy5tdXNpY1tpZF0ubXVzdEtlZXAgPSB0cnVlO1xyXG5cdFx0XHR0aGlzLmVtaXQoXCJsb2FkX211c2ljXCIsIGlkKTtcclxuXHRcdH1cclxuXHRcdHJldHVybiB0aGlzLm11c2ljW2lkXTtcclxuXHR9LFxyXG5cdFxyXG5cdC8qKiBMb2FkcyBzb3VuZCBmcm9tIGRhdGEgZXh0cmFjdGVkIGZyb20gdGhlIG1hcCB6aXAgZmlsZS4gKi9cclxuXHRsb2FkU291bmQ6IGZ1bmN0aW9uKGlkLCBpbmZvKSB7XHJcblx0XHRpZiAoIXRoaXMuc291bmRzW2lkXSkge1xyXG5cdFx0XHR0aGlzLnNvdW5kc1tpZF0gPSB0aGlzLmNyZWF0ZUF1ZGlvKGlkLCBpbmZvKTtcclxuXHRcdFx0dGhpcy5lbWl0KFwibG9hZF9zb3VuZFwiLCBpZCk7XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gdGhpcy5zb3VuZHNbaWRdO1xyXG5cdH0sXHJcblx0XHJcblx0LyoqIExvYWRzIG11c2ljIGZyb20gZGF0YSBleHRyYWN0ZWQgZnJvbSB0aGUgbWFwIHppcCBmaWxlLiAqL1xyXG5cdGxvYWRNdXNpYzogZnVuY3Rpb24oaWQsIGluZm8pIHtcclxuXHRcdGlmICghdGhpcy5tdXNpY1tpZF0pIHtcclxuXHRcdFx0dGhpcy5fZW5zdXJlUm9vbUZvck11c2ljKCk7XHJcblx0XHRcdHRoaXMubXVzaWNbaWRdID0gdGhpcy5jcmVhdGVBdWRpbyhpZCwgaW5mbyk7XHJcblx0XHRcdHRoaXMuZW1pdChcImxvYWRfbXVzaWNcIiwgaWQpO1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIHRoaXMubXVzaWNbaWRdO1xyXG5cdH0sXHJcblx0XHJcblx0XHJcblx0aXNNdXNpY0xvYWRlZDogZnVuY3Rpb24oaWQpIHtcclxuXHRcdHJldHVybiAhIXRoaXMubXVzaWNbaWRdO1xyXG5cdH0sXHJcblx0aXNTb3VuZExvYWRlZDogZnVuY3Rpb24oaWQpIHtcclxuXHRcdHJldHVybiAhIXRoaXMuc291bmRzW2lkXTtcclxuXHR9LFxyXG5cdFxyXG5cdF9lbnN1cmVSb29tRm9yTXVzaWM6IGZ1bmN0aW9uKCkge1xyXG5cdFx0aWYgKE9iamVjdC5rZXlzKHRoaXMubXVzaWMpLmxlbmd0aCsxIDw9IE1BWF9NVVNJQykgcmV0dXJuO1xyXG5cdFx0XHJcblx0XHR2YXIgb2xkZXN0RGF0ZSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xyXG5cdFx0dmFyIG9sZGVzdElkID0gbnVsbDtcclxuXHRcdGZvciAodmFyIGlkIGluIHRoaXMubXVzaWMpIHtcclxuXHRcdFx0dmFyIG0gPSB0aGlzLm11c2ljW2lkXVxyXG5cdFx0XHRpZiAobS5tdXN0S2VlcCkgY29udGludWU7XHJcblx0XHRcdGlmIChtLmxvYWREYXRlIDwgb2xkZXN0RGF0ZSkge1xyXG5cdFx0XHRcdG9sZGVzdERhdGUgPSBtLmxvYWREYXRlO1xyXG5cdFx0XHRcdG9sZGVzdElkID0gaWQ7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0dGhpcy5tdXNpY1tvbGRlc3RJZF0udW5sb2FkKCk7XHJcblx0XHRkZWxldGUgdGhpcy5tdXNpY1tvbGRlc3RJZF07XHJcblx0XHR0aGlzLmVtaXQoXCJ1bmxvYWRlZC1tdXNpY1wiLCBvbGRlc3RJZCk7XHJcblx0fSxcclxuXHRcclxuXHQvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vIFBsYXlpbmcgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cdFxyXG5cdHBsYXlTb3VuZCA6IGZ1bmN0aW9uKGlkKSB7XHJcblx0XHRpZiAodGhpcy5tdXRlZF9zb3VuZCkgcmV0dXJuO1xyXG5cdFx0aWYgKCF0aGlzLnNvdW5kc1tpZF0pIHtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihcIlNvdW5kIGlzIG5vdCBsb2FkZWQhXCIsIGlkKTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cdFx0dGhpcy5zb3VuZHNbaWRdLnBsYXkoKTtcclxuXHR9LFxyXG5cdFxyXG5cdHBsYXlNdXNpYzogZnVuY3Rpb24oaWQpe1xyXG5cdFx0dmFyIG0gPSB0aGlzLm11c2ljW2lkXTtcclxuXHRcdGlmICghbSkgcmV0dXJuO1xyXG5cdFx0aWYgKG0ucGxheWluZykgcmV0dXJuOyAvL2FscmVhZHkgcGxheWluZ1xyXG5cdFx0XHJcblx0XHR2YXIgc3RhcnREZWxheSA9IDA7XHJcblx0XHRmb3IgKHZhciBpZCBpbiB0aGlzLm11c2ljKSB7XHJcblx0XHRcdGlmICh0aGlzLm11c2ljW2lkXS5wbGF5aW5nKSB7XHJcblx0XHRcdFx0dGhpcy5zdG9wTXVzaWMoaWQpO1xyXG5cdFx0XHRcdHN0YXJ0RGVsYXkgPSAxMDAwO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcclxuXHRcdFx0bS5wbGF5aW5nID0gdHJ1ZTtcclxuXHRcdFx0aWYgKHRoaXMubXV0ZWRfbXVzaWMpIHJldHVybjtcclxuXHRcdFx0bS5wbGF5aW5nX3JlYWwgPSB0cnVlO1xyXG5cdFx0XHRtLnBsYXkoKTtcclxuXHRcdH0sIHN0YXJ0RGVsYXkpO1xyXG5cdH0sXHJcblx0XHJcblx0cGF1c2VNdXNpYzogZnVuY3Rpb24oaWQpe1xyXG5cdFx0dmFyIG0gPSB0aGlzLm11c2ljW2lkXTtcclxuXHRcdGlmICghbSkgcmV0dXJuO1xyXG5cdFx0bS5wbGF5aW5nID0gbS5wbGF5aW5nX3JlYWwgPSBmYWxzZTtcclxuXHRcdG0ucGF1c2UoKTtcclxuXHR9LFxyXG5cdFxyXG5cdHRvZ2dsZU11c2ljOiBmdW5jdGlvbihpZCkge1xyXG5cdFx0dmFyIG0gPSB0aGlzLm11c2ljW2lkXTtcclxuXHRcdGlmICghbSkgcmV0dXJuO1xyXG5cdFx0aWYgKG0ucGxheWluZykge1xyXG5cdFx0XHRtLnBsYXlpbmcgPSBtLnBsYXlpbmdfcmVhbCA9IGZhbHNlO1xyXG5cdFx0XHRtLnBhdXNlKCk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRtLnBsYXlpbmcgPSB0cnVlO1xyXG5cdFx0XHRpZiAodGhpcy5tdXRlZF9tdXNpYykgcmV0dXJuO1xyXG5cdFx0XHRtLnBsYXlpbmdfcmVhbCA9IHRydWU7XHJcblx0XHRcdG0ucGxheSgpO1xyXG5cdFx0fVxyXG5cdH0sXHJcblx0XHJcblx0c3RvcE11c2ljOiBmdW5jdGlvbihpZCl7XHJcblx0XHR2YXIgbSA9IHRoaXMubXVzaWNbaWRdO1xyXG5cdFx0aWYgKCFtKSByZXR1cm47XHJcblx0XHQvLyBtLnBsYXlpbmcgPSBtLnBsYXlpbmdfcmVhbCA9IGZhbHNlO1xyXG5cdFx0Ly9tLnBhdXNlKCk7XHJcblx0XHQvL20uY3VycmVudFRpbWUgPSAwO1xyXG5cdFx0bS5mYWRlb3V0ID0gdHJ1ZTtcclxuXHR9LFxyXG5cdFxyXG5cdFxyXG5cdF90aWNrOiBmdW5jdGlvbihkZWx0YSkge1xyXG5cdFx0Zm9yICh2YXIgaWQgaW4gdGhpcy5tdXNpYykge1xyXG5cdFx0XHR0aGlzLm11c2ljW2lkXS5sb29wVGljayhkZWx0YSk7XHJcblx0XHR9XHJcblx0fSxcclxufSk7XHJcblxyXG5PYmplY3QuZGVmaW5lUHJvcGVydGllcyhTb3VuZE1hbmFnZXIucHJvdG90eXBlLCB7XHJcblx0dm9sX211c2ljOiB7XHJcblx0XHRlbnVtZXJhYmxlOiB0cnVlLFxyXG5cdFx0Z2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuX192b2xfbXVzaWM7IH0sXHJcblx0XHRzZXQ6IGZ1bmN0aW9uKHZvbCkge1xyXG5cdFx0XHR0aGlzLl9fdm9sX211c2ljID0gTWF0aC5jbGFtcCh2b2wpO1xyXG5cdFx0XHRmb3IgKHZhciBpZCBpbiB0aGlzLm11c2ljKSB7XHJcblx0XHRcdFx0dGhpcy5tdXNpY1tpZF0uc2V0Vm9sdW1lKHRoaXMuX192b2xfbXVzaWMpO1xyXG5cdFx0XHR9XHJcblx0XHR9LFxyXG5cdH0sXHJcblx0dm9sX3NvdW5kOiB7XHJcblx0XHRlbnVtZXJhYmxlOiB0cnVlLFxyXG5cdFx0Z2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuX192b2xfc291bmQ7IH0sXHJcblx0XHRzZXQ6IGZ1bmN0aW9uKHZvbCkge1xyXG5cdFx0XHR0aGlzLl9fdm9sX3NvdW5kID0gTWF0aC5jbGFtcCh2b2wpO1xyXG5cdFx0XHRmb3IgKHZhciBpZCBpbiB0aGlzLnNvdW5kcykge1xyXG5cdFx0XHRcdHRoaXMuc291bmRzW2lkXS5zZXRWb2x1bWUodGhpcy5fX3ZvbF9zb3VuZCk7XHJcblx0XHRcdH1cclxuXHRcdH0sXHJcblx0fSxcclxuXHRtdXRlZF9tdXNpYzoge1xyXG5cdFx0ZW51bWVyYWJsZTogdHJ1ZSxcclxuXHRcdGdldDogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLl9fbXV0ZWRfbXVzaWM7IH0sXHJcblx0XHRzZXQ6IGZ1bmN0aW9uKHZhbCkge1xyXG5cdFx0XHR0aGlzLl9fbXV0ZWRfbXVzaWMgPSB2YWw7XHJcblx0XHRcdGZvciAodmFyIGlkIGluIHRoaXMubXVzaWMpIHtcclxuXHRcdFx0XHR0aGlzLm11c2ljW2lkXS5zZXRNdXRlZCh2YWwpO1xyXG5cdFx0XHR9XHJcblx0XHR9LFxyXG5cdH0sXHJcblx0bXV0ZWRfc291bmQ6IHtcclxuXHRcdGVudW1lcmFibGU6IHRydWUsXHJcblx0XHRnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5fX211dGVkX3NvdW5kOyB9LFxyXG5cdFx0c2V0OiBmdW5jdGlvbih2YWwpIHtcclxuXHRcdFx0dGhpcy5fX211dGVkX3NvdW5kID0gdmFsO1xyXG5cdFx0XHRmb3IgKHZhciBpZCBpbiB0aGlzLnNvdW5kcykge1xyXG5cdFx0XHRcdHRoaXMuc291bmRzW2lkXS5zZXRNdXRlZCh2YWwpO1xyXG5cdFx0XHR9XHJcblx0XHR9LFxyXG5cdH0sXHJcblx0XHJcblx0X192b2xfbXVzaWM6IHsgZW51bWVyYWJsZTogZmFsc2UsIHdyaXRhYmxlOiB0cnVlLCB9LFxyXG5cdF9fdm9sX3NvdW5kOiB7IGVudW1lcmFibGU6IGZhbHNlLCB3cml0YWJsZTogdHJ1ZSwgfSxcclxuXHRfX211dGVkX211c2ljOiB7IGVudW1lcmFibGU6IGZhbHNlLCB3cml0YWJsZTogdHJ1ZSwgfSxcclxuXHRfX211dGVkX3NvdW5kOiB7IGVudW1lcmFibGU6IGZhbHNlLCB3cml0YWJsZTogdHJ1ZSwgfSxcclxufSk7XHJcblxyXG5cclxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8gU291bmQgT2JqZWN0cyAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblxyXG5mdW5jdGlvbiBTb3VuZE9iamVjdChvcHRzKSB7XHJcblx0ZXh0ZW5kKHRoaXMsIG9wdHMpO1xyXG5cdHRoaXMubG9hZERhdGUgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcclxufVxyXG5leHRlbmQoU291bmRPYmplY3QucHJvdG90eXBlLCB7XHJcblx0cGxheWluZzogZmFsc2UsIC8vc291bmQgaXMgcGxheWluZywgdGhlb3JldGljYWxseSAobWlnaHQgYmUgbXV0ZWQpXHJcblx0cGxheWluZ19yZWFsOiBmYWxzZSwgLy9zb3VuZCBpcyBhY3R1YWxseSBwbGF5aW5nIGFuZCBub3QgbXV0ZWRcclxuXHRcclxuXHRsb29wU3RhcnQ6IDAsXHJcblx0bG9vcEVuZDogMCxcclxuXHRcclxuXHRsb2FkRGF0ZTogMCwgLy9taWxpc2Vjb25kIGRhdGVzdGFtcCBvZiB3aGVuIHRoaXMgd2FzIGxvYWRlZCwgZm9yIGNhY2hlIGNvbnRyb2xcclxuXHRtdXN0S2VlcDogZmFsc2UsIC8vaWYgd2Ugc2hvdWxkIHNraXAgdGhpcyBvYmplY3Qgd2hlbiBkZXRlcm1pbmluZyBzb3VuZHMgdG8gdW5sb2FkXHJcblx0XHJcblx0ZmFkZW91dDogZmFsc2UsXHJcblx0XHJcblx0cGxheTogZnVuY3Rpb24oKXt9LFxyXG5cdHBhdXNlOiBmdW5jdGlvbigpe30sXHJcblx0c2V0Vm9sdW1lOiBmdW5jdGlvbih2b2wpe30sXHJcblx0c2V0TXV0ZWQ6IGZ1bmN0aW9uKG11dGVkKXt9LFxyXG5cdGxvb3BUaWNrOiBmdW5jdGlvbihkZWx0YSl7fSxcclxuXHRcclxuXHR1bmxvYWQ6IGZ1bmN0aW9uKCl7fSxcclxufSk7XHJcblxyXG5cclxuXHJcbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8gQXVkaW8gVGFnIEltcGxlbWVudGF0aW9uIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZUF1ZGlvX1RhZyhpZCwgaW5mbykge1xyXG5cdHZhciBzbmQ7XHJcblx0aWYgKGluZm8udGFnKSB7XHJcblx0XHRzbmQgPSBpbmZvLnRhZztcclxuXHR9IGVsc2UgaWYgKGluZm8udXJsKSB7XHJcblx0XHRzbmQgPSBuZXcgQXVkaW8oKTtcclxuXHRcdHNuZC5hdXRvcGxheSA9IGZhbHNlO1xyXG5cdFx0c25kLmF1dG9idWZmZXIgPSB0cnVlO1xyXG5cdFx0c25kLnByZWxvYWQgPSBcImF1dG9cIjtcclxuXHRcdHNuZC5zcmMgPSBpbmZvLnVybDsgXHJcblx0XHQkKFwiYm9keVwiKS5hcHBlbmQoICQoc25kLnRhZykuY3NzKHtkaXNwbGF5Olwibm9uZVwifSkgKTtcclxuXHR9IGVsc2Uge1xyXG5cdFx0dGhyb3cgbmV3IEVycm9yKFwiQ2FsbGVkIGNyZWF0ZUF1ZGlvIHdpdGhvdXQgYW55IGluZm8hXCIpO1xyXG5cdH1cclxuXHRcclxuXHR2YXIgc29iaiA9IG5ldyBTb3VuZE9iamVjdCh7XHJcblx0XHRfX3RhZzogc25kLFxyXG5cdFx0X19ibG9idXJsOiBpbmZvLnVybCxcclxuXHRcdFxyXG5cdFx0bG9vcFN0YXJ0OiBpbmZvLmxvb3BTdGFydCB8fCAwLFxyXG5cdFx0bG9vcEVuZDogaW5mby5sb29wRW5kIHx8IDAsXHJcblx0XHRcclxuXHRcdHBsYXk6IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHR0aGlzLl9fdGFnLnBsYXkoKTtcclxuXHRcdH0sXHJcblx0XHRcclxuXHRcdHBhdXNlOiBmdW5jdGlvbigpIHtcclxuXHRcdFx0dGhpcy5fX3RhZy5wYXVzZSgpO1xyXG5cdFx0fSxcclxuXHRcdFxyXG5cdFx0c2V0Vm9sdW1lOiBmdW5jdGlvbih2b2wpIHtcclxuXHRcdFx0dGhpcy5fX3RhZy52b2x1bWUgPSB2b2w7XHJcblx0XHR9LFxyXG5cdFx0XHJcblx0XHRzZXRNdXRlZDogZnVuY3Rpb24obXV0ZWQpIHtcclxuXHRcdFx0aWYgKG11dGVkKSB7XHJcblx0XHRcdFx0dGhpcy5wbGF5aW5nX3JlYWwgPSBmYWxzZTtcclxuXHRcdFx0XHR0aGlzLl9fdGFnLnBhdXNlKCk7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0aWYgKHRoaXMucGxheWluZykge1xyXG5cdFx0XHRcdFx0dGhpcy5wbGF5aW5nX3JlYWwgPSB0cnVlO1xyXG5cdFx0XHRcdFx0dGhpcy5fX3RhZy5wbGF5KCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9LFxyXG5cdFx0XHJcblx0XHRsb29wVGljazogZnVuY3Rpb24oZGVsdGEpIHtcclxuXHRcdFx0aWYgKCF0aGlzLmxvb3BFbmQgfHwgIXRoaXMucGxheWluZ19yZWFsKSByZXR1cm47XHJcblx0XHRcdFxyXG5cdFx0XHQvL1RPRE8gc3VwcG9ydCB0aGlzLmZhZGVvdXRcclxuXHRcdFx0aWYgKHRoaXMuX190YWcuY3VycmVudFRpbWUgPj0gdGhpcy5sb29wRW5kKSB7XHJcblx0XHRcdFx0dGhpcy5fX3RhZy5jdXJyZW50VGltZSAtPSAodGhpcy5sb29wRW5kIC0gdGhpcy5sb29wU3RhcnQpO1xyXG5cdFx0XHR9XHJcblx0XHR9LFxyXG5cdFx0dW5sb2FkOiBmdW5jdGlvbigpIHtcclxuXHRcdFx0aWYgKHRoaXMuX19ibG9idXJsKVxyXG5cdFx0XHRcdFVSTC5yZXZva2VPYmplY3RVUkwodGhpcy5fX2Jsb2J1cmwpO1xyXG5cdFx0XHRcclxuXHRcdFx0JCh0aGlzLnRhZykucmVtb3ZlKCk7XHJcblx0XHRcdGRlbGV0ZSB0aGlzLnRhZztcclxuXHRcdH0sXHJcblx0fSk7XHJcblx0c25kLm9uKFwiZW5kZWRcIiwgZnVuY3Rpb24oKXtcclxuXHRcdHNvYmoucGxheWluZyA9IGZhbHNlO1xyXG5cdFx0c29iai5wbGF5aW5nX3JlYWwgPSBmYWxzZTtcclxuXHRcdHNuZC5jdXJyZW50VGltZSA9IDA7XHJcblx0fSk7XHJcblx0XHJcblx0c25kLmxvYWQoKTtcclxuXHRcclxuXHRyZXR1cm4gc29iajtcclxufVxyXG5cclxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8gV2ViIEF1ZGlvIEFQSSBJbXBsZW1lbnRhdGlvbiAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cclxuZnVuY3Rpb24gY3JlYXRlQXVkaW9fV2ViQVBJKGlkLCBpbmZvKSB7XHJcblx0dmFyIHNvYmogPSBuZXcgU291bmRPYmplY3Qoe1xyXG5cdFx0X19hdWRpb0J1ZmZlcjogbnVsbCxcclxuXHRcdF9fdGFnOiBudWxsLFxyXG5cdFx0X19nYWluQ3RybDogbnVsbCxcclxuXHRcdF9fbXV0ZUN0cmw6IG51bGwsXHJcblx0XHRfX2Jsb2J1cmw6IG51bGwsXHJcblx0XHRfX2RlYnVnQW5hbHlzZXI6IG51bGwsXHJcblx0XHRcclxuXHRcdF9fY3VyclNyYzogbnVsbCxcclxuXHRcdFxyXG5cdFx0bG9vcFN0YXJ0OiBpbmZvLmxvb3BTdGFydCB8fCAwLFxyXG5cdFx0bG9vcEVuZDogaW5mby5sb29wRW5kIHx8IDAsXHJcblx0XHRcclxuXHRcdHBsYXk6IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHR2YXIgc3JjO1xyXG5cdFx0XHRpZiAodGhpcy5fX2F1ZGlvQnVmZmVyKSB7XHJcblx0XHRcdFx0c3JjID0gYXVkaW9Db250ZXh0LmNyZWF0ZUJ1ZmZlclNvdXJjZSgpO1xyXG5cdFx0XHRcdHNyYy5idWZmZXIgPSB0aGlzLl9fYXVkaW9CdWZmZXI7XHJcblx0XHRcdH0gZWxzZSBpZiAodGhpcy5fX3RhZykge1xyXG5cdFx0XHRcdHNyYyA9IGF1ZGlvQ29udGV4dC5jcmVhdGVNZWRpYUVsZW1lbnRTb3VyY2UoaW5mby50YWcpO1xyXG5cdFx0XHR9IGVsc2UgeyBcclxuXHRcdFx0XHRjb25zb2xlLmxvZyhcIk5vIGF1ZGlvIGJ1ZmZlciByZWFkeSB0byBwbGF5IVwiKTsgXHJcblx0XHRcdFx0cmV0dXJuOyBcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0c3JjLmxvb3AgPSAhIWluZm8ubG9vcEVuZDtcclxuXHRcdFx0aWYgKCEhaW5mby5sb29wRW5kKSB7XHJcblx0XHRcdFx0c3JjLmxvb3BTdGFydCA9IGluZm8ubG9vcFN0YXJ0O1xyXG5cdFx0XHRcdHNyYy5sb29wRW5kID0gaW5mby5sb29wRW5kO1xyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHRzcmMub24oXCJlbmRlZFwiLCBmdW5jdGlvbigpe1xyXG5cdFx0XHRcdHNvYmoucGxheWluZyA9IGZhbHNlO1xyXG5cdFx0XHRcdHNvYmoucGxheWluZ19yZWFsID0gZmFsc2U7XHJcblx0XHRcdFx0c29iai5fX2N1cnJTcmMgPSBudWxsO1xyXG5cdFx0XHR9KTtcclxuXHRcdFx0XHJcblx0XHRcdHNyYy5jb25uZWN0KHRoaXMuX19nYWluQ3RybCk7XHJcblx0XHRcdHNyYy5zdGFydCgpO1xyXG5cdFx0XHR0aGlzLl9wbGF5aW5nID0gdHJ1ZTtcclxuXHRcdFx0XHJcblx0XHRcdHRoaXMuX19jdXJyU3JjID0gc3JjO1xyXG5cdFx0fSxcclxuXHRcdFxyXG5cdFx0cGF1c2U6IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHR0aGlzLl9fY3VyclNyYy5zdG9wKCk7XHJcblx0XHRcdHRoaXMuX19jdXJyU3JjID0gbnVsbDtcclxuXHRcdH0sXHJcblx0XHRcclxuXHRcdHNldFZvbHVtZTogZnVuY3Rpb24odm9sKSB7XHJcblx0XHRcdHRoaXMuX19nYWluQ3RybC5nYWluLnZhbHVlID0gdm9sO1xyXG5cdFx0fSxcclxuXHRcdFxyXG5cdFx0c2V0TXV0ZWQ6IGZ1bmN0aW9uKG11dGVkKSB7XHJcblx0XHRcdGlmICh0aGlzLmZhZGVvdXQpIHJldHVybjsgLy9pZ25vcmUgZHVyaW5nIGZhZGVvdXRcclxuXHRcdFx0dGhpcy5fX211dGVDdHJsLmdhaW4udmFsdWUgPSAobXV0ZWQpPyAwIDogMTtcclxuXHRcdH0sXHJcblx0XHRcclxuXHRcdGxvb3BUaWNrOiBmdW5jdGlvbihkZWx0YSkge1xyXG5cdFx0XHRpZiAodGhpcy5mYWRlb3V0KSB7XHJcblx0XHRcdFx0aWYgKHRoaXMuX19tdXRlQ3RybC5nYWluLnZhbHVlID4gMC4wMDEpIHtcclxuXHRcdFx0XHRcdHRoaXMuX19tdXRlQ3RybC5nYWluLnZhbHVlIC09IGRlbHRhICogMC41O1xyXG5cdFx0XHRcdFx0Ly8gY29uc29sZS5sb2codGhpcy5fX211dGVDdHJsLmdhaW4udmFsdWUpO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHR0aGlzLl9fY3VyclNyYy5zdG9wKCk7XHJcblx0XHRcdFx0XHR0aGlzLl9fY3VyclNyYyA9IG51bGw7XHJcblx0XHRcdFx0XHR0aGlzLmZhZGVvdXQgPSBmYWxzZTtcclxuXHRcdFx0XHRcdHRoaXMucGxheWluZyA9IHRoaXMucGxheWluZ19yZWFsID0gZmFsc2U7XHJcblx0XHRcdFx0XHR0aGlzLl9fbXV0ZUN0cmwuZ2Fpbi52YWx1ZSA9IDE7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9LFxyXG5cdFx0XHJcblx0XHR1bmxvYWQ6IGZ1bmN0aW9uKCl7XHJcblx0XHRcdGlmICh0aGlzLl9fYmxvYnVybClcclxuXHRcdFx0XHRVUkwucmV2b2tlT2JqZWN0VVJMKHRoaXMuX19ibG9idXJsKTtcclxuXHRcdFx0XHJcblx0XHRcdGRlbGV0ZSB0aGlzLl9fYmxvYnVybDtcclxuXHRcdFx0ZGVsZXRlIHRoaXMuX19hdWRpb0J1ZmZlcjtcclxuXHRcdFx0ZGVsZXRlIHRoaXMuX190YWc7XHJcblx0XHRcdGRlbGV0ZSB0aGlzLl9fZ2FpbkN0cmw7XHJcblx0XHRcdGRlbGV0ZSB0aGlzLl9fbXV0ZUN0cmw7XHJcblx0XHR9LFxyXG5cdH0pO1xyXG5cdFxyXG5cdFxyXG5cdGlmIChpbmZvLnRhZykge1xyXG5cdFx0c29iai5fX3RhZyA9IGluZm8udGFnO1xyXG5cdFx0XHJcblx0fSBlbHNlIGlmIChpbmZvLmRhdGEpIHtcclxuXHRcdGN1cnJlbnRNYXAubWFya0xvYWRpbmcoXCJEZWNvZGVBdWRpb19cIitpZCk7XHJcblx0XHRcclxuXHRcdHZhciBmciA9IG5ldyBGaWxlUmVhZGVyKCk7XHJcblx0XHRmci5vbihcImxvYWRcIiwgZnVuY3Rpb24oKXtcclxuXHRcdFx0YXVkaW9Db250ZXh0LmRlY29kZUF1ZGlvRGF0YShmci5yZXN1bHQsIGZ1bmN0aW9uKGJ1ZmZlcil7XHJcblx0XHRcdFx0c29iai5fX2F1ZGlvQnVmZmVyID0gYnVmZmVyO1xyXG5cdFx0XHRcdGlmIChzb2JqLnBsYXlpbmdfcmVhbCkge1xyXG5cdFx0XHRcdFx0c29iai5wbGF5KCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGN1cnJlbnRNYXAubWFya0xvYWRGaW5pc2hlZChcIkRlY29kZUF1ZGlvX1wiK2lkKTtcclxuXHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHRcdGZyLnJlYWRBc0FycmF5QnVmZmVyKGluZm8uZGF0YSk7XHJcblx0XHRcclxuXHR9IGVsc2UgaWYgKGluZm8udXJsKSB7XHJcblx0XHR2YXIgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XHJcblx0XHR4aHIub3BlbihcIkdFVFwiLCBpbmZvLnVybCk7XHJcblx0XHR4aHIucmVzcG9uc2VUeXBlID0gJ2FycmF5YnVmZmVyJztcclxuXHRcdHhoci5vbihcImxvYWRcIiwgZnVuY3Rpb24oZSkge1xyXG5cdFx0XHQvLyBjb25zb2xlLmxvZyhcIkxPQUQ6XCIsIGUpO1xyXG5cdFx0XHRpZiAoeGhyLnN0YXR1cyAhPSAyMDApIHtcclxuXHRcdFx0XHRjb25zb2xlLmVycm9yKFwiRVJST1IgTE9BRElORyBBVURJTzpcIiwgeGhyLnN0YXR1c1RleHQpO1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0dmFyIGRhdGEgPSB4aHIucmVzcG9uc2U7XHJcblx0XHRcdGF1ZGlvQ29udGV4dC5kZWNvZGVBdWRpb0RhdGEoeGhyLnJlc3BvbnNlLCBmdW5jdGlvbihidWZmZXIpe1xyXG5cdFx0XHRcdHNvYmouX19hdWRpb0J1ZmZlciA9IGJ1ZmZlcjtcclxuXHRcdFx0XHRpZiAoc29iai5wbGF5aW5nX3JlYWwpIHtcclxuXHRcdFx0XHRcdHNvYmoucGxheSgpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHRcdHhoci5vbihcImVycm9yXCIsIGZ1bmN0aW9uKGUpe1xyXG5cdFx0XHRjb25zb2xlLmVycm9yKFwiRVJST1IgTE9BRElORyBBVURJTyEhXCIsIGUpO1xyXG5cdFx0fSk7XHJcblx0XHRcclxuXHRcdGlmIChpbmZvLnVybC5pbmRleE9mKFwiYmxvYlwiKSA+IC0xKSB7XHJcblx0XHRcdHRoaXMuX19ibG9idXJsID0gaW5mby51cmw7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdHhoci5zZW5kKCk7XHJcblx0fSBlbHNlIHtcclxuXHRcdHRocm93IG5ldyBFcnJvcihcIkNhbGxlZCBjcmVhdGVBdWRpbyB3aXRob3V0IGFueSBpbmZvIVwiKTtcclxuXHR9XHJcblx0XHJcblx0c29iai5fX2dhaW5DdHJsID0gYXVkaW9Db250ZXh0LmNyZWF0ZUdhaW4oKTtcclxuXHQvL1RPRE8gbG9vayBpbnRvIDNkIHNvdW5kIGZ1bjogaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvQVBJL0F1ZGlvQ29udGV4dC5jcmVhdGVQYW5uZXJcclxuXHRzb2JqLl9fbXV0ZUN0cmwgPSBhdWRpb0NvbnRleHQuY3JlYXRlR2FpbigpO1xyXG5cdFxyXG5cdHNvYmouX19nYWluQ3RybC5jb25uZWN0KHNvYmouX19tdXRlQ3RybCk7XHJcblx0Ly9UT0RPXHJcblx0XHJcblx0dmFyIGZpbmFsTm9kZSA9IHNvYmouX19tdXRlQ3RybDtcclxuXHRpZiAoREVCVUcuc2V0dXBBZGRpdGlvbmFsQXVkaW9GaWx0ZXJzKSB7XHJcblx0XHRmaW5hbE5vZGUgPSBERUJVRy5zZXR1cEFkZGl0aW9uYWxBdWRpb0ZpbHRlcnMoaWQsIGF1ZGlvQ29udGV4dCwgZmluYWxOb2RlKTtcclxuXHR9XHJcblx0XHJcblx0aWYgKERFQlVHLnNvdW5kQW5hbHl6ZXIpIHtcclxuXHRcdHZhciBkYSA9IHNvYmouX19kZWJ1Z0FuYWx5c2VyID0gYXVkaW9Db250ZXh0LmNyZWF0ZUFuYWx5c2VyKCk7XHJcblx0XHRkYS5mZnRTaXplID0gMTAyNDsvLzIwNDg7XHJcblx0XHR0aGlzLmVtaXQoXCJERUJVRy1BbmFseXNlckNyZWF0ZWRcIiwgaWQsIGRhKTtcclxuXHRcdFxyXG5cdFx0ZmluYWxOb2RlLmNvbm5lY3QoZGEpO1xyXG5cdFx0ZGEuY29ubmVjdChhdWRpb0NvbnRleHQuZGVzdGluYXRpb24pO1xyXG5cdH0gZWxzZSB7XHJcblx0XHRmaW5hbE5vZGUuY29ubmVjdChhdWRpb0NvbnRleHQuZGVzdGluYXRpb24pO1xyXG5cdH1cclxuXHRcclxuXHRyZXR1cm4gc29iajtcclxufVxyXG5cclxuXHJcblxyXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBTb3VuZE1hbmFnZXIoKTtcclxuIiwiLy8gcmVuZGVybG9vcC5qc1xyXG4vLyBUaGUgbW9kdWxlIHRoYXQgaGFuZGxlcyBhbGwgdGhlIGNvbW1vbiBjb2RlIHRvIHJlbmRlciBhbmQgZG8gZ2FtZSB0aWNrcyBvbiBhIG1hcFxyXG5cclxudmFyIGV4dGVuZCA9IHJlcXVpcmUoXCJleHRlbmRcIik7XHJcbnZhciByYWYgPSByZXF1aXJlKFwicmFmXCIpO1xyXG52YXIgY29udHJvbGxlciA9IHJlcXVpcmUoXCJ0cHAtY29udHJvbGxlclwiKTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0ge1xyXG5cdHN0YXJ0IDogZnVuY3Rpb24ob3B0cykge1xyXG5cdFx0Ly8gU2V0IHRoZSBjYW52YXMncyBhdHRyaWJ1dGVzLCBiZWNhdXNlIHRob3NlIFxyXG5cdFx0Ly8gQUNUVUFMTFkgZGV0ZXJtaW5lIGhvdyBiaWcgdGhlIHJlbmRlcmluZyBhcmVhIGlzLlxyXG5cdFx0aWYgKCFvcHRzLl9kaXNhYmxlVGhyZWUpIHtcclxuXHRcdFx0dmFyIGNhbnZhcyA9ICQoXCIjZ2FtZXNjcmVlblwiKTtcclxuXHRcdFx0Y2FudmFzLmF0dHIoXCJ3aWR0aFwiLCBwYXJzZUludChjYW52YXMuY3NzKFwid2lkdGhcIikpKTtcclxuXHRcdFx0Y2FudmFzLmF0dHIoXCJoZWlnaHRcIiwgcGFyc2VJbnQoY2FudmFzLmNzcyhcImhlaWdodFwiKSkpO1xyXG5cdFx0XHRcclxuXHRcdFx0b3B0cyA9IGV4dGVuZCh7XHJcblx0XHRcdFx0Y2xlYXJDb2xvciA6IDB4MDAwMDAwLFxyXG5cdFx0XHRcdHRpY2tzUGVyU2Vjb25kIDogMzAsXHJcblx0XHRcdH0sIG9wdHMpO1xyXG5cdFx0XHRcclxuXHRcdFx0d2luZG93LnRocmVlUmVuZGVyZXIgPSBuZXcgVEhSRUUuV2ViR0xSZW5kZXJlcih7XHJcblx0XHRcdFx0YW50aWFsaWFzIDogdHJ1ZSxcclxuXHRcdFx0XHRjYW52YXMgOiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImdhbWVzY3JlZW5cIikgXHJcblx0XHRcdH0pO1xyXG5cdFx0XHR0aHJlZVJlbmRlcmVyLnNldENsZWFyQ29sb3JIZXgoIG9wdHMuY2xlYXJDb2xvciApO1xyXG5cdFx0XHR0aHJlZVJlbmRlcmVyLmF1dG9DbGVhciA9IGZhbHNlO1xyXG5cdFx0XHRcclxuXHRcdFx0dGhyZWVSZW5kZXJlci5zaGFkb3dNYXBFbmFibGVkID0gdHJ1ZTtcclxuXHRcdFx0dGhyZWVSZW5kZXJlci5zaGFkb3dNYXBUeXBlID0gVEhSRUUuUENGU2hhZG93TWFwO1xyXG5cdFx0XHRcclxuXHRcdFx0X3JlbmRlckhhbmRsZSA9IHJhZihyZW5kZXJMb29wKTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0aWYgKCFvcHRzLmRpc2FibGVHYW1lTG9vcCkge1xyXG5cdFx0XHRpbml0R2FtZUxvb3AoMzApO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0fSxcclxuXHRcclxuXHRwYXVzZSA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0cGF1c2VkID0gdHJ1ZTtcclxuXHRcdC8vIF9yZW5kZXJIYW5kbGUgPSBudWxsO1xyXG5cdH0sXHJcblx0dW5wYXVzZSA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0cGF1c2VkID0gZmFsc2U7XHJcblx0XHQvLyBfcmVuZGVySGFuZGxlID0gcmFmKHJlbmRlckxvb3ApO1xyXG5cdH0sXHJcbn07XHJcblxyXG5cclxudmFyIF9yZW5kZXJIYW5kbGU7IFxyXG5mdW5jdGlvbiByZW5kZXJMb29wKCkge1xyXG5cdHRocmVlUmVuZGVyZXIuY2xlYXIoKTtcclxuXHRcclxuXHRpZiAod2luZG93LmN1cnJlbnRNYXAgJiYgY3VycmVudE1hcC5zY2VuZSAmJiBjdXJyZW50TWFwLmNhbWVyYSkge1xyXG5cdFx0Ly9SZW5kZXIgd2l0aCB0aGUgbWFwJ3MgYWN0aXZlIGNhbWVyYSBvbiBpdHMgYWN0aXZlIHNjZW5lXHJcblx0XHR0aHJlZVJlbmRlcmVyLnJlbmRlcihjdXJyZW50TWFwLnNjZW5lLCBjdXJyZW50TWFwLmNhbWVyYSk7XHJcblx0fVxyXG5cdFxyXG5cdGlmIChVSS5zY2VuZSAmJiBVSS5jYW1lcmEpIHtcclxuXHRcdC8vUmVuZGVyIHRoZSBVSSB3aXRoIHRoZSBVSSBjYW1lcmEgYW5kIGl0cyBzY2VuZVxyXG5cdFx0dGhyZWVSZW5kZXJlci5jbGVhcihmYWxzZSwgdHJ1ZSwgZmFsc2UpOyAvL0NsZWFyIGRlcHRoIGJ1ZmZlclxyXG5cdFx0dGhyZWVSZW5kZXJlci5yZW5kZXIoVUkuc2NlbmUsIFVJLmNhbWVyYSk7XHJcblx0fVxyXG5cdFxyXG5cdGlmIChfcmVuZGVySGFuZGxlKVxyXG5cdFx0X3JlbmRlckhhbmRsZSA9IHJhZihyZW5kZXJMb29wKTtcclxufVxyXG5cclxudmFyIHBhdXNlZCA9IGZhbHNlO1xyXG5mdW5jdGlvbiBpbml0R2FtZUxvb3AodGlja3NQZXJTZWMpIHtcclxuXHR2YXIgX3JhdGUgPSAxMDAwIC8gdGlja3NQZXJTZWM7XHJcblx0XHJcblx0dmFyIGFjY3VtID0gMDtcclxuXHR2YXIgbm93ID0gMDtcclxuXHR2YXIgbGFzdCA9IG51bGw7XHJcblx0dmFyIGR0ID0gMDtcclxuXHR2YXIgd2hvbGVUaWNrO1xyXG5cdFxyXG5cdHNldEludGVydmFsKHRpbWVyVGljaywgMCk7XHJcblx0XHJcblx0ZnVuY3Rpb24gdGltZXJUaWNrKCkge1xyXG5cdFx0aWYgKHBhdXNlZCkge1xyXG5cdFx0XHRsYXN0ID0gRGF0ZS5ub3coKTtcclxuXHRcdFx0YWNjdW0gPSAwO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdG5vdyA9IERhdGUubm93KCk7XHJcblx0XHRkdCA9IG5vdyAtIChsYXN0IHx8IG5vdyk7XHJcblx0XHRsYXN0ID0gbm93O1xyXG5cdFx0YWNjdW0gKz0gZHQ7XHJcblx0XHRpZiAoYWNjdW0gPCBfcmF0ZSkgcmV0dXJuO1xyXG5cdFx0d2hvbGVUaWNrID0gKChhY2N1bSAvIF9yYXRlKXwwKTtcclxuXHRcdGlmICh3aG9sZVRpY2sgPD0gMCkgcmV0dXJuO1xyXG5cdFx0XHJcblx0XHR2YXIgZGVsdGEgPSB3aG9sZVRpY2sgLyB0aWNrc1BlclNlYztcclxuXHRcdGlmICh3aW5kb3cuY3VycmVudE1hcCAmJiBjdXJyZW50TWFwLmxvZ2ljTG9vcClcclxuXHRcdFx0Y3VycmVudE1hcC5sb2dpY0xvb3AoZGVsdGEpO1xyXG5cdFx0aWYgKHdpbmRvdy5VSSAmJiBVSS5sb2dpY0xvb3ApXHJcblx0XHRcdFVJLmxvZ2ljTG9vcChkZWx0YSk7XHJcblx0XHRcclxuXHRcdGlmICh3aW5kb3cuY29udHJvbGxlciAmJiBjb250cm9sbGVyLl90aWNrKVxyXG5cdFx0XHRjb250cm9sbGVyLl90aWNrKGRlbHRhKTtcclxuXHRcdGlmICh3aW5kb3cuU291bmRNYW5hZ2VyICYmIFNvdW5kTWFuYWdlci5fdGljaylcclxuXHRcdFx0U291bmRNYW5hZ2VyLl90aWNrKGRlbHRhKTtcclxuXHRcdFxyXG5cdFx0d2hvbGVUaWNrICo9IF9yYXRlO1xyXG5cdFx0YWNjdW0gLT0gd2hvbGVUaWNrO1xyXG5cdH1cclxufSIsIi8vIHBvbHlmaWxsLmpzXHJcbi8vIERlZmluZXMgc29tZSBwb2x5ZmlsbHMgbmVlZGVkIGZvciB0aGUgZ2FtZSB0byBmdW5jdGlvbi5cclxuXHJcbi8vIFN0cmluZy5zdGFydHNXaXRoKClcclxuLy8gXHJcbmlmICghU3RyaW5nLnByb3RvdHlwZS5zdGFydHNXaXRoKSB7XHJcblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KFN0cmluZy5wcm90b3R5cGUsICdzdGFydHNXaXRoJywge1xyXG5cdFx0ZW51bWVyYWJsZTogZmFsc2UsXHJcblx0XHRjb25maWd1cmFibGU6IGZhbHNlLFxyXG5cdFx0d3JpdGFibGU6IGZhbHNlLFxyXG5cdFx0dmFsdWU6IGZ1bmN0aW9uKHNlYXJjaFN0cmluZywgcG9zaXRpb24pIHtcclxuXHRcdFx0cG9zaXRpb24gPSBwb3NpdGlvbiB8fCAwO1xyXG5cdFx0XHRyZXR1cm4gdGhpcy5sYXN0SW5kZXhPZihzZWFyY2hTdHJpbmcsIHBvc2l0aW9uKSA9PT0gcG9zaXRpb247XHJcblx0XHR9XHJcblx0fSk7XHJcbn1cclxuXHJcbmlmICghU3RyaW5nLnByb3RvdHlwZS5lbmRzV2l0aCkge1xyXG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShTdHJpbmcucHJvdG90eXBlLCAnZW5kc1dpdGgnLCB7XHJcblx0XHRlbnVtZXJhYmxlOiBmYWxzZSxcclxuXHRcdGNvbmZpZ3VyYWJsZTogZmFsc2UsXHJcblx0XHR3cml0YWJsZTogZmFsc2UsXHJcblx0XHR2YWx1ZTogZnVuY3Rpb24oc2VhcmNoU3RyaW5nLCBwb3NpdGlvbikge1xyXG5cdFx0XHR2YXIgc3ViamVjdFN0cmluZyA9IHRoaXMudG9TdHJpbmcoKTtcclxuXHRcdFx0aWYgKHBvc2l0aW9uID09PSB1bmRlZmluZWQgfHwgcG9zaXRpb24gPiBzdWJqZWN0U3RyaW5nLmxlbmd0aCkge1xyXG5cdFx0XHRcdHBvc2l0aW9uID0gc3ViamVjdFN0cmluZy5sZW5ndGg7XHJcblx0XHRcdH1cclxuXHRcdFx0cG9zaXRpb24gLT0gc2VhcmNoU3RyaW5nLmxlbmd0aDtcclxuXHRcdFx0dmFyIGxhc3RJbmRleCA9IHN1YmplY3RTdHJpbmcuaW5kZXhPZihzZWFyY2hTdHJpbmcsIHBvc2l0aW9uKTtcclxuXHRcdFx0cmV0dXJuIGxhc3RJbmRleCAhPT0gLTEgJiYgbGFzdEluZGV4ID09PSBwb3NpdGlvbjtcclxuXHRcdH1cclxuXHR9KTtcclxufVxyXG5cclxuLy8gRXZlbnRUYXJnZXQub24oKSBhbmQgRXZlbnRUYXJnZXQuZW1pdCgpXHJcbi8vIEFkZGluZyB0aGlzIHRvIGFsbG93IGRvbSBlbGVtZW50cyBhbmQgb2JqZWN0cyB0byBzaW1wbHkgaGF2ZSBcIm9uXCIgYW5kIFwiZW1pdFwiIHVzZWQgbGlrZSBub2RlLmpzIG9iamVjdHMgY2FuXHJcbmlmICghRXZlbnRUYXJnZXQucHJvdG90eXBlLm9uKSB7XHJcblx0RXZlbnRUYXJnZXQucHJvdG90eXBlLm9uID0gRXZlbnRUYXJnZXQucHJvdG90eXBlLmFkZEV2ZW50TGlzdGVuZXI7XHJcblx0RXZlbnRUYXJnZXQucHJvdG90eXBlLmVtaXQgPSBFdmVudFRhcmdldC5wcm90b3R5cGUuZGlzcGF0Y2hFdmVudDtcclxufVxyXG5cclxuLy8gTWF0aC5jbGFtcCgpXHJcbi8vIFxyXG5pZiAoIU1hdGguY2xhbXApIHtcclxuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkoTWF0aCwgXCJjbGFtcFwiLCB7XHJcblx0XHRlbnVtZXJhYmxlOiBmYWxzZSxcclxuXHRcdGNvbmZpZ3VyYWJsZTogZmFsc2UsXHJcblx0XHR3cml0YWJsZTogZmFsc2UsXHJcblx0XHR2YWx1ZTogZnVuY3Rpb24obnVtLCBtaW4sIG1heCkge1xyXG5cdFx0XHRtaW4gPSAobWluICE9PSB1bmRlZmluZWQpPyBtaW46MDtcclxuXHRcdFx0bWF4ID0gKG1heCAhPT0gdW5kZWZpbmVkKT8gbWF4OjE7XHJcblx0XHRcdHJldHVybiBNYXRoLm1pbihNYXRoLm1heChudW0sIG1pbiksIG1heCk7XHJcblx0XHR9XHJcblx0fSk7XHJcbn1cclxuXHJcbi8vIEFycmF5LnRvcFxyXG4vLyBQcm92aWRlcyBlYXN5IGFjY2VzcyB0byB0aGUgXCJ0b3BcIiBvZiBhIHN0YWNrLCBtYWRlIHdpdGggcHVzaCgpIGFuZCBwb3AoKVxyXG5pZiAoIUFycmF5LnByb3RvdHlwZS50b3ApIHtcclxuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkoQXJyYXkucHJvdG90eXBlLCBcInRvcFwiLCB7XHJcblx0XHRlbnVtZXJhYmxlOiBmYWxzZSxcclxuXHRcdGNvbmZpZ3VyYWJsZTogZmFsc2UsXHJcblx0XHQvLyBzZXQ6IGZ1bmN0aW9uKCl7fSxcclxuXHRcdGdldDogZnVuY3Rpb24oKXtcclxuXHRcdFx0cmV0dXJuIHRoaXNbdGhpcy5sZW5ndGgtMV07XHJcblx0XHR9LFxyXG5cdH0pO1xyXG59XHJcblxyXG5cclxuLy8gTW9kaWZpY2F0aW9ucyB0byBUSFJFRS5qc1xyXG5pZiAod2luZG93LlRIUkVFKSB7XHJcblx0Ly8gVmVjdG9yMy5zZXQoKSwgbW9kaWZpZWQgdG8gYWNjZXB0IGFub3RoZXIgVmVjdG9yM1xyXG5cdFRIUkVFLlZlY3RvcjMucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uKHgsIHksIHopIHtcclxuXHRcdGlmICh4IGluc3RhbmNlb2YgVEhSRUUuVmVjdG9yMykge1xyXG5cdFx0XHR0aGlzLnggPSB4Lng7IHRoaXMueSA9IHgueTsgdGhpcy56ID0geC56O1xyXG5cdFx0XHRyZXR1cm4gdGhpcztcclxuXHRcdH1cclxuXHRcdGlmICh4IGluc3RhbmNlb2YgVEhSRUUuVmVjdG9yMikge1xyXG5cdFx0XHR0aGlzLnggPSB4Lng7IHRoaXMueSA9IHgueTsgdGhpcy56ID0gMDtcclxuXHRcdFx0cmV0dXJuIHRoaXM7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdHRoaXMueCA9IHg7IHRoaXMueSA9IHk7IHRoaXMueiA9IHo7XHJcblx0XHRyZXR1cm4gdGhpcztcclxuXHR9O1xyXG5cdFxyXG5cdC8vIEFsc28gZm9yIFZlY3RvcjJcclxuXHRUSFJFRS5WZWN0b3IyLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbih4LCB5KSB7XHJcblx0XHRpZiAoeCBpbnN0YW5jZW9mIFRIUkVFLlZlY3RvcjIpIHtcclxuXHRcdFx0dGhpcy54ID0geC54OyB0aGlzLnkgPSB4Lnk7XHJcblx0XHRcdHJldHVybiB0aGlzO1xyXG5cdFx0fVxyXG5cdFx0aWYgKHggaW5zdGFuY2VvZiBUSFJFRS5WZWN0b3IzKSB7XHJcblx0XHRcdHRoaXMueCA9IHgueDsgdGhpcy55ID0geC55O1xyXG5cdFx0XHRyZXR1cm4gdGhpcztcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0dGhpcy54ID0geDsgdGhpcy55ID0geTtcclxuXHRcdHJldHVybiB0aGlzO1xyXG5cdH07XHJcbn1cclxuXHJcblxyXG4iXX0=
