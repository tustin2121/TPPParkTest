(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// casino.js

//var THREE = require("three");
//var $ = require("jquery");
//var zip = zip.js

var inherits = require("inherits");
var extend = require("extend");
var raf = require("raf");

require("../polyfill.js");
var Map = require("../map");
var renderLoop = require("../model/renderloop");

require("../globals");

var warp = require("tpp-warp");

window.ac = {
	Context: null,
	FilterNode: null,
	AnalyzerNode: null,
	AnalyzerCanvas: null,
	
	Dancers: [null], //null to reserve a location for the player
	
	_songOffset: 0,
	_loopStart: 0,
	_loopEnd: 0,
	
	getBeatCount: function() {
		if (!this.Context) return 0;
		var x = (this.Context.currentTime - this._loopStart - this._songOffset);
		return x / this.BEAT_SPEED;
	},
	getSteadyJump: function(x) {
		if (!this.Context) return 0;
		if (!x) x = (this.Context.currentTime - this._loopStart - this._songOffset);
		return Math.abs( Math.cos(x * Math.PI/this.BEAT_SPEED) );
	},
/*	getSectionJump: function(x) {
		var spdMul = this.getSongLoopBeatSpeedMul();
		if (!x) x = this.getSongLoopTime();
		
		if (spdMul < 1.0) {
			
			
			
			return Math.abs( Math.sin(x * Math.PI/this.BEAT_SPEED) );
			
		} else {
			return this.getSteadyJump(x);
		}
	}, //*/
	
	getSongLoopTime: function() {
		if (!this.Context) return 0;
		// We can attempt to calculate where in the loop the song is.
		return ((this.Context.currentTime - this._loopStart - this._songOffset) 
					% (this._loopEnd - this._loopStart)) + this._loopStart;
	},
	
	BEAT_SPEED : 60/154.8, //speed of the beat in the casino music, 155 BPM
	BEAT_TABLE : [
		{ spd: 0.00,  until:  0.000, section: "ramp" },
		{ spd: 0.00,  until:  3.570, section: "ramp" },
		{ spd: 0.50,  until:  5.085, section: "beats1" },
		{ spd: 1.00,  until: 12.645, section: "bumps" },
		{ spd: 0.25,  until: 17.450, section: "whirl" },
		{ spd: 1.00,  until: 18.972, section: "whirlHigh" },
		{ spd: 1.00,  until: 31.389, section: "verse" },
		{ spd: 0.125, until: 43.589, section: "slowVerse" },
		{ spd: 0.50,  until: 45.329, section: "bridge" },
		{ spd: 1.00,  until: 61.092, section: "chorus" },
		{ spd: 0.00,  until: 63.939, section: "beats2" },
		{ spd: 0.50,  until: 65.492, section: "bumps2" },
		{ spd: 1.00,  until: 73.011, section: "verse2" },
		{ spd: 0.25,  until: 76.335, section: "whirl" },
		{ spd: 0.50,  until: 77.868, section: "whirlHigh" },
		{ spd: 1.00,  until: 99.000, section: "verse" },
	],
	getSongLoopBeatSpeedMul: function() {
		if (!this.Context) return 0;
		var time = this.getSongLoopTime();
		
		for (var i = 0; i < this.BEAT_TABLE.length; i++) {
			if (time > this.BEAT_TABLE[i].until) continue;
			return this.BEAT_TABLE[i].spd;
		}
		return 1.0;
	},
	getSongLoopBeatSection: function() {
		if (!this.Context) return "?";
		var time = this.getSongLoopTime();
		
		for (var i = 0; i < this.BEAT_TABLE.length; i++) {
			if (time > this.BEAT_TABLE[i].until) continue;
			return this.BEAT_TABLE[i].section;
		}
		return "?";
	},
};

//On Ready
$(function(){
	
	MapManager.transitionTo("iCasino", 0);
	
	renderLoop.start({
		clearColor: 0x000000,
		ticksPerSecond : 30,
	});
	
	ac.AnalyzerCanvas = $("#musicscreen").attr({
		"width" : "100%",
		"height": "150px",
	})[0];
	drawWaveforms(true);
});

DEBUG.updateFns = [];
DEBUG.soundAnalyzer = true;
DEBUG.setupAdditionalAudioFilters = function(id, audioCtx, finalNode){
	if (id != "m_gamecorner") return finalNode;
	
	ac.Context = audioCtx;
	
	ac.FilterNode = audioCtx.createBiquadFilter();
	ac.FilterNode.type = "lowpass";
	ac.FilterNode.frequency.value = audioCtx.sampleRate; //min: 40, max: sampleRate
	ac.FilterNode.Q.value = 0;
	finalNode.connect(ac.FilterNode);
	
	return ac.FilterNode;
};
DEBUG.runOnMapReady = function(){
	var map = currentMap;
	var oldlogic = map.logicLoop;
	map.logicLoop = function(delta){
		for (var i = 0; i < DEBUG.updateFns.length; i++) {
			if (!DEBUG.updateFns[i]) continue;
			if (!DEBUG.updateFns[i].update) continue;
			DEBUG.updateFns[i].update();
		}
		// $("#statusbar").text(
		// 	"Song Section: "+ ac.getSongLoopBeatSection()
		// );
		oldlogic.call(map, delta);
	};
}; 

SoundManager.on("DEBUG-AnalyserCreated", function(id, analyser){
	if (id != "m_gamecorner") return;
	ac.AnalyzerNode = analyser;
});

SoundManager.on("load_music", function(id){
	var minfo = SoundManager.music[id];
	ac._loopStart = minfo.loopStart;
	ac._loopEnd = minfo.loopEnd;
	
	currentMap.queueForMapStart(function(){
		SoundManager.playMusic("m_gamecorner");
		ac._songOffset = ac.Context.currentTime;
	});
});


///////////////////////////////////////////////////////////////////////////////////////////

var _rafHandle;
var COLOR_WHEEL_TIME = 8.0;
function drawWaveforms(forceDraw) {
	if (!_rafHandle && forceDraw !== true) return; //stop the draw loop
	
	// https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Visualizations_with_Web_Audio_API
	var dataArray;
	try {
		if (!ac.AnalyzerNode || !ac.AnalyzerCanvas) return;
		
		if (!dataArray) {
			dataArray = new Uint8Array(ac.AnalyzerNode.fftSize);
		}
		var canvasCtx = ac.AnalyzerCanvas.getContext("2d");
		
		var WIDTH = $(ac.AnalyzerCanvas).innerWidth();
		var HEIGHT = $(ac.AnalyzerCanvas).innerHeight();
		
		if (WIDTH != ac.AnalyzerCanvas.width || HEIGHT != ac.AnalyzerCanvas.height)
		{
			ac.AnalyzerCanvas.width = WIDTH;
			ac.AnalyzerCanvas.height = HEIGHT;
		}
		// canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);
		
		ac.AnalyzerNode.getByteTimeDomainData(dataArray);
		canvasCtx.fillStyle = 'rgba(0, 0, 0, 0.04)'; //'#000000';
		canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);
		
		canvasCtx.lineWidth = 1;
		canvasCtx.strokeStyle = 'hsl('+Math.floor(ac.Context.currentTime*(360.0/COLOR_WHEEL_TIME))+', 100%, 50%)'; //'#FFFFFF';
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
	} finally {
		_rafHandle = raf(drawWaveforms);
	}
}
ac.drawWaveforms = drawWaveforms;

ac.stopWaveforms = function(){ _rafHandle = null; };

////////////////////////////////////// Actor Behavior /////////////////////////////////////////

var Actor = require("tpp-actor");
var Behavior = require("tpp-behavior");
var FaceDirection = require("tpp-behavior").FaceDirection;
var LookAround    = require("tpp-behavior").LookAround;
var TalkingBehav  = require("tpp-behavior").Talking;
var MeanderBehav  = require("tpp-behavior").Meander;

function ActorCasino(base, ext) {
	ext = extend({
		
		behaviorStack: [new MeanderBehav()],
		shouldAppear: function() { return true; },
	}, ext);
	Actor.call(this, base, ext);
	
	this.on("interacted", this.onInteracted);
}
inherits(ActorCasino, Actor);
extend(ActorCasino.prototype, {
	location: "rand",
	
	dialog_type: "text",
	dialog: null,
	
	spawnLocationSet: function() {
		// console.log("Spawn set!", this.id);
		//(14, 20) < (27, 29) == on dance floor
		if (this.location.x > 14 && this.location.x < 27 &&
			this.location.y > 20 && this.location.y < 29) 
		{ // We're on the dance floor!
			console.log("On dance floor!", this.id);
			if (window.ac) ac.Dancers.push(this);
			this.dancing = true;
			this.behaviorStack.push(new DancingBehav());
		}
	},
	onInteracted: function(from) {
		if (this.dancing) return;
		
		var self = this;
		var dlog = this.dialog || [ ""+this.name+": ヽ༼ຈل͜ຈ༽ﾉ DANCE RIOT ヽ༼ຈل͜ຈ༽ﾉ " ];
		// $("#statusbar").html("This is "+this.name+"! ("+this.id+")<br/>This sprite was created by "+this.sprite_creator+"!");
		
		self.behaviorStack.push(new TalkingBehav({
			dialog: dlog,
			dialog_type: this.dialog_type,
			owner: self,
		}));
	},
});
window.ActorCasino = ActorCasino;


function DancingBehav(opts) {
	Behavior.call(this, opts);
}
inherits(DancingBehav, Behavior);
extend(DancingBehav.prototype, {
	stored_y : 0,
	lastUpdate : 0,
	waitTime : 0, //waiting to move, but not to turn
	
	tick: function(me, delta) {
		if (!this.stored_y) this.stored_y = me.avatar_node.position.y;
		if (ac._songOffset == 0) return;
		var bc = Math.floor(ac.getBeatCount() + 100);
		
		if (bc > this.lastUpdate) {
			this.waitTime -= delta;
			
			switch( Math.floor(Math.random()*8) ) {
				case 0: me.facing.set( 1,0, 0); break;
				case 1: me.facing.set(-1,0, 0); break;
				case 2: me.facing.set( 0,0, 1); break;
				case 3: me.facing.set( 0,0,-1); break;
				case 4: if (!me._initPathingState().moving) me.moveDir("d"); break;
				case 5: if (!me._initPathingState().moving) me.moveDir("u"); break;
				case 6: if (!me._initPathingState().moving) me.moveDir("l"); break;
				case 7: if (!me._initPathingState().moving) me.moveDir("r"); break;
			}
			this.lastUpdate = bc;
			if (this.waitTime < 0)
				this.waitTime = (Math.random() * 3) + 3;
		}
		me.avatar_node.position.setY( this.stored_y + (ac.getSteadyJump()*0.2) );
	},
});
Behavior.DancingBehav = DancingBehav;


},{"../globals":11,"../map":17,"../model/renderloop":22,"../polyfill.js":23,"extend":"extend","inherits":"inherits","raf":8,"tpp-actor":"tpp-actor","tpp-behavior":"tpp-behavior","tpp-warp":"tpp-warp"}],2:[function(require,module,exports){
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
//! moment.js
//! version : 2.10.6
//! authors : Tim Wood, Iskren Chernev, Moment.js contributors
//! license : MIT
//! momentjs.com

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    global.moment = factory()
}(this, function () { 'use strict';

    var hookCallback;

    function utils_hooks__hooks () {
        return hookCallback.apply(null, arguments);
    }

    // This is done to register the method called with moment()
    // without creating circular dependencies.
    function setHookCallback (callback) {
        hookCallback = callback;
    }

    function isArray(input) {
        return Object.prototype.toString.call(input) === '[object Array]';
    }

    function isDate(input) {
        return input instanceof Date || Object.prototype.toString.call(input) === '[object Date]';
    }

    function map(arr, fn) {
        var res = [], i;
        for (i = 0; i < arr.length; ++i) {
            res.push(fn(arr[i], i));
        }
        return res;
    }

    function hasOwnProp(a, b) {
        return Object.prototype.hasOwnProperty.call(a, b);
    }

    function extend(a, b) {
        for (var i in b) {
            if (hasOwnProp(b, i)) {
                a[i] = b[i];
            }
        }

        if (hasOwnProp(b, 'toString')) {
            a.toString = b.toString;
        }

        if (hasOwnProp(b, 'valueOf')) {
            a.valueOf = b.valueOf;
        }

        return a;
    }

    function create_utc__createUTC (input, format, locale, strict) {
        return createLocalOrUTC(input, format, locale, strict, true).utc();
    }

    function defaultParsingFlags() {
        // We need to deep clone this object.
        return {
            empty           : false,
            unusedTokens    : [],
            unusedInput     : [],
            overflow        : -2,
            charsLeftOver   : 0,
            nullInput       : false,
            invalidMonth    : null,
            invalidFormat   : false,
            userInvalidated : false,
            iso             : false
        };
    }

    function getParsingFlags(m) {
        if (m._pf == null) {
            m._pf = defaultParsingFlags();
        }
        return m._pf;
    }

    function valid__isValid(m) {
        if (m._isValid == null) {
            var flags = getParsingFlags(m);
            m._isValid = !isNaN(m._d.getTime()) &&
                flags.overflow < 0 &&
                !flags.empty &&
                !flags.invalidMonth &&
                !flags.invalidWeekday &&
                !flags.nullInput &&
                !flags.invalidFormat &&
                !flags.userInvalidated;

            if (m._strict) {
                m._isValid = m._isValid &&
                    flags.charsLeftOver === 0 &&
                    flags.unusedTokens.length === 0 &&
                    flags.bigHour === undefined;
            }
        }
        return m._isValid;
    }

    function valid__createInvalid (flags) {
        var m = create_utc__createUTC(NaN);
        if (flags != null) {
            extend(getParsingFlags(m), flags);
        }
        else {
            getParsingFlags(m).userInvalidated = true;
        }

        return m;
    }

    var momentProperties = utils_hooks__hooks.momentProperties = [];

    function copyConfig(to, from) {
        var i, prop, val;

        if (typeof from._isAMomentObject !== 'undefined') {
            to._isAMomentObject = from._isAMomentObject;
        }
        if (typeof from._i !== 'undefined') {
            to._i = from._i;
        }
        if (typeof from._f !== 'undefined') {
            to._f = from._f;
        }
        if (typeof from._l !== 'undefined') {
            to._l = from._l;
        }
        if (typeof from._strict !== 'undefined') {
            to._strict = from._strict;
        }
        if (typeof from._tzm !== 'undefined') {
            to._tzm = from._tzm;
        }
        if (typeof from._isUTC !== 'undefined') {
            to._isUTC = from._isUTC;
        }
        if (typeof from._offset !== 'undefined') {
            to._offset = from._offset;
        }
        if (typeof from._pf !== 'undefined') {
            to._pf = getParsingFlags(from);
        }
        if (typeof from._locale !== 'undefined') {
            to._locale = from._locale;
        }

        if (momentProperties.length > 0) {
            for (i in momentProperties) {
                prop = momentProperties[i];
                val = from[prop];
                if (typeof val !== 'undefined') {
                    to[prop] = val;
                }
            }
        }

        return to;
    }

    var updateInProgress = false;

    // Moment prototype object
    function Moment(config) {
        copyConfig(this, config);
        this._d = new Date(config._d != null ? config._d.getTime() : NaN);
        // Prevent infinite loop in case updateOffset creates new moment
        // objects.
        if (updateInProgress === false) {
            updateInProgress = true;
            utils_hooks__hooks.updateOffset(this);
            updateInProgress = false;
        }
    }

    function isMoment (obj) {
        return obj instanceof Moment || (obj != null && obj._isAMomentObject != null);
    }

    function absFloor (number) {
        if (number < 0) {
            return Math.ceil(number);
        } else {
            return Math.floor(number);
        }
    }

    function toInt(argumentForCoercion) {
        var coercedNumber = +argumentForCoercion,
            value = 0;

        if (coercedNumber !== 0 && isFinite(coercedNumber)) {
            value = absFloor(coercedNumber);
        }

        return value;
    }

    function compareArrays(array1, array2, dontConvert) {
        var len = Math.min(array1.length, array2.length),
            lengthDiff = Math.abs(array1.length - array2.length),
            diffs = 0,
            i;
        for (i = 0; i < len; i++) {
            if ((dontConvert && array1[i] !== array2[i]) ||
                (!dontConvert && toInt(array1[i]) !== toInt(array2[i]))) {
                diffs++;
            }
        }
        return diffs + lengthDiff;
    }

    function Locale() {
    }

    var locales = {};
    var globalLocale;

    function normalizeLocale(key) {
        return key ? key.toLowerCase().replace('_', '-') : key;
    }

    // pick the locale from the array
    // try ['en-au', 'en-gb'] as 'en-au', 'en-gb', 'en', as in move through the list trying each
    // substring from most specific to least, but move to the next array item if it's a more specific variant than the current root
    function chooseLocale(names) {
        var i = 0, j, next, locale, split;

        while (i < names.length) {
            split = normalizeLocale(names[i]).split('-');
            j = split.length;
            next = normalizeLocale(names[i + 1]);
            next = next ? next.split('-') : null;
            while (j > 0) {
                locale = loadLocale(split.slice(0, j).join('-'));
                if (locale) {
                    return locale;
                }
                if (next && next.length >= j && compareArrays(split, next, true) >= j - 1) {
                    //the next array item is better than a shallower substring of this one
                    break;
                }
                j--;
            }
            i++;
        }
        return null;
    }

    function loadLocale(name) {
        var oldLocale = null;
        // TODO: Find a better way to register and load all the locales in Node
        if (!locales[name] && typeof module !== 'undefined' &&
                module && module.exports) {
            try {
                oldLocale = globalLocale._abbr;
                require('./locale/' + name);
                // because defineLocale currently also sets the global locale, we
                // want to undo that for lazy loaded locales
                locale_locales__getSetGlobalLocale(oldLocale);
            } catch (e) { }
        }
        return locales[name];
    }

    // This function will load locale and then set the global locale.  If
    // no arguments are passed in, it will simply return the current global
    // locale key.
    function locale_locales__getSetGlobalLocale (key, values) {
        var data;
        if (key) {
            if (typeof values === 'undefined') {
                data = locale_locales__getLocale(key);
            }
            else {
                data = defineLocale(key, values);
            }

            if (data) {
                // moment.duration._locale = moment._locale = data;
                globalLocale = data;
            }
        }

        return globalLocale._abbr;
    }

    function defineLocale (name, values) {
        if (values !== null) {
            values.abbr = name;
            locales[name] = locales[name] || new Locale();
            locales[name].set(values);

            // backwards compat for now: also set the locale
            locale_locales__getSetGlobalLocale(name);

            return locales[name];
        } else {
            // useful for testing
            delete locales[name];
            return null;
        }
    }

    // returns locale data
    function locale_locales__getLocale (key) {
        var locale;

        if (key && key._locale && key._locale._abbr) {
            key = key._locale._abbr;
        }

        if (!key) {
            return globalLocale;
        }

        if (!isArray(key)) {
            //short-circuit everything else
            locale = loadLocale(key);
            if (locale) {
                return locale;
            }
            key = [key];
        }

        return chooseLocale(key);
    }

    var aliases = {};

    function addUnitAlias (unit, shorthand) {
        var lowerCase = unit.toLowerCase();
        aliases[lowerCase] = aliases[lowerCase + 's'] = aliases[shorthand] = unit;
    }

    function normalizeUnits(units) {
        return typeof units === 'string' ? aliases[units] || aliases[units.toLowerCase()] : undefined;
    }

    function normalizeObjectUnits(inputObject) {
        var normalizedInput = {},
            normalizedProp,
            prop;

        for (prop in inputObject) {
            if (hasOwnProp(inputObject, prop)) {
                normalizedProp = normalizeUnits(prop);
                if (normalizedProp) {
                    normalizedInput[normalizedProp] = inputObject[prop];
                }
            }
        }

        return normalizedInput;
    }

    function makeGetSet (unit, keepTime) {
        return function (value) {
            if (value != null) {
                get_set__set(this, unit, value);
                utils_hooks__hooks.updateOffset(this, keepTime);
                return this;
            } else {
                return get_set__get(this, unit);
            }
        };
    }

    function get_set__get (mom, unit) {
        return mom._d['get' + (mom._isUTC ? 'UTC' : '') + unit]();
    }

    function get_set__set (mom, unit, value) {
        return mom._d['set' + (mom._isUTC ? 'UTC' : '') + unit](value);
    }

    // MOMENTS

    function getSet (units, value) {
        var unit;
        if (typeof units === 'object') {
            for (unit in units) {
                this.set(unit, units[unit]);
            }
        } else {
            units = normalizeUnits(units);
            if (typeof this[units] === 'function') {
                return this[units](value);
            }
        }
        return this;
    }

    function zeroFill(number, targetLength, forceSign) {
        var absNumber = '' + Math.abs(number),
            zerosToFill = targetLength - absNumber.length,
            sign = number >= 0;
        return (sign ? (forceSign ? '+' : '') : '-') +
            Math.pow(10, Math.max(0, zerosToFill)).toString().substr(1) + absNumber;
    }

    var formattingTokens = /(\[[^\[]*\])|(\\)?(Mo|MM?M?M?|Do|DDDo|DD?D?D?|ddd?d?|do?|w[o|w]?|W[o|W]?|Q|YYYYYY|YYYYY|YYYY|YY|gg(ggg?)?|GG(GGG?)?|e|E|a|A|hh?|HH?|mm?|ss?|S{1,9}|x|X|zz?|ZZ?|.)/g;

    var localFormattingTokens = /(\[[^\[]*\])|(\\)?(LTS|LT|LL?L?L?|l{1,4})/g;

    var formatFunctions = {};

    var formatTokenFunctions = {};

    // token:    'M'
    // padded:   ['MM', 2]
    // ordinal:  'Mo'
    // callback: function () { this.month() + 1 }
    function addFormatToken (token, padded, ordinal, callback) {
        var func = callback;
        if (typeof callback === 'string') {
            func = function () {
                return this[callback]();
            };
        }
        if (token) {
            formatTokenFunctions[token] = func;
        }
        if (padded) {
            formatTokenFunctions[padded[0]] = function () {
                return zeroFill(func.apply(this, arguments), padded[1], padded[2]);
            };
        }
        if (ordinal) {
            formatTokenFunctions[ordinal] = function () {
                return this.localeData().ordinal(func.apply(this, arguments), token);
            };
        }
    }

    function removeFormattingTokens(input) {
        if (input.match(/\[[\s\S]/)) {
            return input.replace(/^\[|\]$/g, '');
        }
        return input.replace(/\\/g, '');
    }

    function makeFormatFunction(format) {
        var array = format.match(formattingTokens), i, length;

        for (i = 0, length = array.length; i < length; i++) {
            if (formatTokenFunctions[array[i]]) {
                array[i] = formatTokenFunctions[array[i]];
            } else {
                array[i] = removeFormattingTokens(array[i]);
            }
        }

        return function (mom) {
            var output = '';
            for (i = 0; i < length; i++) {
                output += array[i] instanceof Function ? array[i].call(mom, format) : array[i];
            }
            return output;
        };
    }

    // format date using native date object
    function formatMoment(m, format) {
        if (!m.isValid()) {
            return m.localeData().invalidDate();
        }

        format = expandFormat(format, m.localeData());
        formatFunctions[format] = formatFunctions[format] || makeFormatFunction(format);

        return formatFunctions[format](m);
    }

    function expandFormat(format, locale) {
        var i = 5;

        function replaceLongDateFormatTokens(input) {
            return locale.longDateFormat(input) || input;
        }

        localFormattingTokens.lastIndex = 0;
        while (i >= 0 && localFormattingTokens.test(format)) {
            format = format.replace(localFormattingTokens, replaceLongDateFormatTokens);
            localFormattingTokens.lastIndex = 0;
            i -= 1;
        }

        return format;
    }

    var match1         = /\d/;            //       0 - 9
    var match2         = /\d\d/;          //      00 - 99
    var match3         = /\d{3}/;         //     000 - 999
    var match4         = /\d{4}/;         //    0000 - 9999
    var match6         = /[+-]?\d{6}/;    // -999999 - 999999
    var match1to2      = /\d\d?/;         //       0 - 99
    var match1to3      = /\d{1,3}/;       //       0 - 999
    var match1to4      = /\d{1,4}/;       //       0 - 9999
    var match1to6      = /[+-]?\d{1,6}/;  // -999999 - 999999

    var matchUnsigned  = /\d+/;           //       0 - inf
    var matchSigned    = /[+-]?\d+/;      //    -inf - inf

    var matchOffset    = /Z|[+-]\d\d:?\d\d/gi; // +00:00 -00:00 +0000 -0000 or Z

    var matchTimestamp = /[+-]?\d+(\.\d{1,3})?/; // 123456789 123456789.123

    // any word (or two) characters or numbers including two/three word month in arabic.
    var matchWord = /[0-9]*['a-z\u00A0-\u05FF\u0700-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+|[\u0600-\u06FF\/]+(\s*?[\u0600-\u06FF]+){1,2}/i;

    var regexes = {};

    function isFunction (sth) {
        // https://github.com/moment/moment/issues/2325
        return typeof sth === 'function' &&
            Object.prototype.toString.call(sth) === '[object Function]';
    }


    function addRegexToken (token, regex, strictRegex) {
        regexes[token] = isFunction(regex) ? regex : function (isStrict) {
            return (isStrict && strictRegex) ? strictRegex : regex;
        };
    }

    function getParseRegexForToken (token, config) {
        if (!hasOwnProp(regexes, token)) {
            return new RegExp(unescapeFormat(token));
        }

        return regexes[token](config._strict, config._locale);
    }

    // Code from http://stackoverflow.com/questions/3561493/is-there-a-regexp-escape-function-in-javascript
    function unescapeFormat(s) {
        return s.replace('\\', '').replace(/\\(\[)|\\(\])|\[([^\]\[]*)\]|\\(.)/g, function (matched, p1, p2, p3, p4) {
            return p1 || p2 || p3 || p4;
        }).replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    }

    var tokens = {};

    function addParseToken (token, callback) {
        var i, func = callback;
        if (typeof token === 'string') {
            token = [token];
        }
        if (typeof callback === 'number') {
            func = function (input, array) {
                array[callback] = toInt(input);
            };
        }
        for (i = 0; i < token.length; i++) {
            tokens[token[i]] = func;
        }
    }

    function addWeekParseToken (token, callback) {
        addParseToken(token, function (input, array, config, token) {
            config._w = config._w || {};
            callback(input, config._w, config, token);
        });
    }

    function addTimeToArrayFromToken(token, input, config) {
        if (input != null && hasOwnProp(tokens, token)) {
            tokens[token](input, config._a, config, token);
        }
    }

    var YEAR = 0;
    var MONTH = 1;
    var DATE = 2;
    var HOUR = 3;
    var MINUTE = 4;
    var SECOND = 5;
    var MILLISECOND = 6;

    function daysInMonth(year, month) {
        return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    }

    // FORMATTING

    addFormatToken('M', ['MM', 2], 'Mo', function () {
        return this.month() + 1;
    });

    addFormatToken('MMM', 0, 0, function (format) {
        return this.localeData().monthsShort(this, format);
    });

    addFormatToken('MMMM', 0, 0, function (format) {
        return this.localeData().months(this, format);
    });

    // ALIASES

    addUnitAlias('month', 'M');

    // PARSING

    addRegexToken('M',    match1to2);
    addRegexToken('MM',   match1to2, match2);
    addRegexToken('MMM',  matchWord);
    addRegexToken('MMMM', matchWord);

    addParseToken(['M', 'MM'], function (input, array) {
        array[MONTH] = toInt(input) - 1;
    });

    addParseToken(['MMM', 'MMMM'], function (input, array, config, token) {
        var month = config._locale.monthsParse(input, token, config._strict);
        // if we didn't find a month name, mark the date as invalid.
        if (month != null) {
            array[MONTH] = month;
        } else {
            getParsingFlags(config).invalidMonth = input;
        }
    });

    // LOCALES

    var defaultLocaleMonths = 'January_February_March_April_May_June_July_August_September_October_November_December'.split('_');
    function localeMonths (m) {
        return this._months[m.month()];
    }

    var defaultLocaleMonthsShort = 'Jan_Feb_Mar_Apr_May_Jun_Jul_Aug_Sep_Oct_Nov_Dec'.split('_');
    function localeMonthsShort (m) {
        return this._monthsShort[m.month()];
    }

    function localeMonthsParse (monthName, format, strict) {
        var i, mom, regex;

        if (!this._monthsParse) {
            this._monthsParse = [];
            this._longMonthsParse = [];
            this._shortMonthsParse = [];
        }

        for (i = 0; i < 12; i++) {
            // make the regex if we don't have it already
            mom = create_utc__createUTC([2000, i]);
            if (strict && !this._longMonthsParse[i]) {
                this._longMonthsParse[i] = new RegExp('^' + this.months(mom, '').replace('.', '') + '$', 'i');
                this._shortMonthsParse[i] = new RegExp('^' + this.monthsShort(mom, '').replace('.', '') + '$', 'i');
            }
            if (!strict && !this._monthsParse[i]) {
                regex = '^' + this.months(mom, '') + '|^' + this.monthsShort(mom, '');
                this._monthsParse[i] = new RegExp(regex.replace('.', ''), 'i');
            }
            // test the regex
            if (strict && format === 'MMMM' && this._longMonthsParse[i].test(monthName)) {
                return i;
            } else if (strict && format === 'MMM' && this._shortMonthsParse[i].test(monthName)) {
                return i;
            } else if (!strict && this._monthsParse[i].test(monthName)) {
                return i;
            }
        }
    }

    // MOMENTS

    function setMonth (mom, value) {
        var dayOfMonth;

        // TODO: Move this out of here!
        if (typeof value === 'string') {
            value = mom.localeData().monthsParse(value);
            // TODO: Another silent failure?
            if (typeof value !== 'number') {
                return mom;
            }
        }

        dayOfMonth = Math.min(mom.date(), daysInMonth(mom.year(), value));
        mom._d['set' + (mom._isUTC ? 'UTC' : '') + 'Month'](value, dayOfMonth);
        return mom;
    }

    function getSetMonth (value) {
        if (value != null) {
            setMonth(this, value);
            utils_hooks__hooks.updateOffset(this, true);
            return this;
        } else {
            return get_set__get(this, 'Month');
        }
    }

    function getDaysInMonth () {
        return daysInMonth(this.year(), this.month());
    }

    function checkOverflow (m) {
        var overflow;
        var a = m._a;

        if (a && getParsingFlags(m).overflow === -2) {
            overflow =
                a[MONTH]       < 0 || a[MONTH]       > 11  ? MONTH :
                a[DATE]        < 1 || a[DATE]        > daysInMonth(a[YEAR], a[MONTH]) ? DATE :
                a[HOUR]        < 0 || a[HOUR]        > 24 || (a[HOUR] === 24 && (a[MINUTE] !== 0 || a[SECOND] !== 0 || a[MILLISECOND] !== 0)) ? HOUR :
                a[MINUTE]      < 0 || a[MINUTE]      > 59  ? MINUTE :
                a[SECOND]      < 0 || a[SECOND]      > 59  ? SECOND :
                a[MILLISECOND] < 0 || a[MILLISECOND] > 999 ? MILLISECOND :
                -1;

            if (getParsingFlags(m)._overflowDayOfYear && (overflow < YEAR || overflow > DATE)) {
                overflow = DATE;
            }

            getParsingFlags(m).overflow = overflow;
        }

        return m;
    }

    function warn(msg) {
        if (utils_hooks__hooks.suppressDeprecationWarnings === false && typeof console !== 'undefined' && console.warn) {
            console.warn('Deprecation warning: ' + msg);
        }
    }

    function deprecate(msg, fn) {
        var firstTime = true;

        return extend(function () {
            if (firstTime) {
                warn(msg + '\n' + (new Error()).stack);
                firstTime = false;
            }
            return fn.apply(this, arguments);
        }, fn);
    }

    var deprecations = {};

    function deprecateSimple(name, msg) {
        if (!deprecations[name]) {
            warn(msg);
            deprecations[name] = true;
        }
    }

    utils_hooks__hooks.suppressDeprecationWarnings = false;

    var from_string__isoRegex = /^\s*(?:[+-]\d{6}|\d{4})-(?:(\d\d-\d\d)|(W\d\d$)|(W\d\d-\d)|(\d\d\d))((T| )(\d\d(:\d\d(:\d\d(\.\d+)?)?)?)?([\+\-]\d\d(?::?\d\d)?|\s*Z)?)?$/;

    var isoDates = [
        ['YYYYYY-MM-DD', /[+-]\d{6}-\d{2}-\d{2}/],
        ['YYYY-MM-DD', /\d{4}-\d{2}-\d{2}/],
        ['GGGG-[W]WW-E', /\d{4}-W\d{2}-\d/],
        ['GGGG-[W]WW', /\d{4}-W\d{2}/],
        ['YYYY-DDD', /\d{4}-\d{3}/]
    ];

    // iso time formats and regexes
    var isoTimes = [
        ['HH:mm:ss.SSSS', /(T| )\d\d:\d\d:\d\d\.\d+/],
        ['HH:mm:ss', /(T| )\d\d:\d\d:\d\d/],
        ['HH:mm', /(T| )\d\d:\d\d/],
        ['HH', /(T| )\d\d/]
    ];

    var aspNetJsonRegex = /^\/?Date\((\-?\d+)/i;

    // date from iso format
    function configFromISO(config) {
        var i, l,
            string = config._i,
            match = from_string__isoRegex.exec(string);

        if (match) {
            getParsingFlags(config).iso = true;
            for (i = 0, l = isoDates.length; i < l; i++) {
                if (isoDates[i][1].exec(string)) {
                    config._f = isoDates[i][0];
                    break;
                }
            }
            for (i = 0, l = isoTimes.length; i < l; i++) {
                if (isoTimes[i][1].exec(string)) {
                    // match[6] should be 'T' or space
                    config._f += (match[6] || ' ') + isoTimes[i][0];
                    break;
                }
            }
            if (string.match(matchOffset)) {
                config._f += 'Z';
            }
            configFromStringAndFormat(config);
        } else {
            config._isValid = false;
        }
    }

    // date from iso format or fallback
    function configFromString(config) {
        var matched = aspNetJsonRegex.exec(config._i);

        if (matched !== null) {
            config._d = new Date(+matched[1]);
            return;
        }

        configFromISO(config);
        if (config._isValid === false) {
            delete config._isValid;
            utils_hooks__hooks.createFromInputFallback(config);
        }
    }

    utils_hooks__hooks.createFromInputFallback = deprecate(
        'moment construction falls back to js Date. This is ' +
        'discouraged and will be removed in upcoming major ' +
        'release. Please refer to ' +
        'https://github.com/moment/moment/issues/1407 for more info.',
        function (config) {
            config._d = new Date(config._i + (config._useUTC ? ' UTC' : ''));
        }
    );

    function createDate (y, m, d, h, M, s, ms) {
        //can't just apply() to create a date:
        //http://stackoverflow.com/questions/181348/instantiating-a-javascript-object-by-calling-prototype-constructor-apply
        var date = new Date(y, m, d, h, M, s, ms);

        //the date constructor doesn't accept years < 1970
        if (y < 1970) {
            date.setFullYear(y);
        }
        return date;
    }

    function createUTCDate (y) {
        var date = new Date(Date.UTC.apply(null, arguments));
        if (y < 1970) {
            date.setUTCFullYear(y);
        }
        return date;
    }

    addFormatToken(0, ['YY', 2], 0, function () {
        return this.year() % 100;
    });

    addFormatToken(0, ['YYYY',   4],       0, 'year');
    addFormatToken(0, ['YYYYY',  5],       0, 'year');
    addFormatToken(0, ['YYYYYY', 6, true], 0, 'year');

    // ALIASES

    addUnitAlias('year', 'y');

    // PARSING

    addRegexToken('Y',      matchSigned);
    addRegexToken('YY',     match1to2, match2);
    addRegexToken('YYYY',   match1to4, match4);
    addRegexToken('YYYYY',  match1to6, match6);
    addRegexToken('YYYYYY', match1to6, match6);

    addParseToken(['YYYYY', 'YYYYYY'], YEAR);
    addParseToken('YYYY', function (input, array) {
        array[YEAR] = input.length === 2 ? utils_hooks__hooks.parseTwoDigitYear(input) : toInt(input);
    });
    addParseToken('YY', function (input, array) {
        array[YEAR] = utils_hooks__hooks.parseTwoDigitYear(input);
    });

    // HELPERS

    function daysInYear(year) {
        return isLeapYear(year) ? 366 : 365;
    }

    function isLeapYear(year) {
        return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    }

    // HOOKS

    utils_hooks__hooks.parseTwoDigitYear = function (input) {
        return toInt(input) + (toInt(input) > 68 ? 1900 : 2000);
    };

    // MOMENTS

    var getSetYear = makeGetSet('FullYear', false);

    function getIsLeapYear () {
        return isLeapYear(this.year());
    }

    addFormatToken('w', ['ww', 2], 'wo', 'week');
    addFormatToken('W', ['WW', 2], 'Wo', 'isoWeek');

    // ALIASES

    addUnitAlias('week', 'w');
    addUnitAlias('isoWeek', 'W');

    // PARSING

    addRegexToken('w',  match1to2);
    addRegexToken('ww', match1to2, match2);
    addRegexToken('W',  match1to2);
    addRegexToken('WW', match1to2, match2);

    addWeekParseToken(['w', 'ww', 'W', 'WW'], function (input, week, config, token) {
        week[token.substr(0, 1)] = toInt(input);
    });

    // HELPERS

    // firstDayOfWeek       0 = sun, 6 = sat
    //                      the day of the week that starts the week
    //                      (usually sunday or monday)
    // firstDayOfWeekOfYear 0 = sun, 6 = sat
    //                      the first week is the week that contains the first
    //                      of this day of the week
    //                      (eg. ISO weeks use thursday (4))
    function weekOfYear(mom, firstDayOfWeek, firstDayOfWeekOfYear) {
        var end = firstDayOfWeekOfYear - firstDayOfWeek,
            daysToDayOfWeek = firstDayOfWeekOfYear - mom.day(),
            adjustedMoment;


        if (daysToDayOfWeek > end) {
            daysToDayOfWeek -= 7;
        }

        if (daysToDayOfWeek < end - 7) {
            daysToDayOfWeek += 7;
        }

        adjustedMoment = local__createLocal(mom).add(daysToDayOfWeek, 'd');
        return {
            week: Math.ceil(adjustedMoment.dayOfYear() / 7),
            year: adjustedMoment.year()
        };
    }

    // LOCALES

    function localeWeek (mom) {
        return weekOfYear(mom, this._week.dow, this._week.doy).week;
    }

    var defaultLocaleWeek = {
        dow : 0, // Sunday is the first day of the week.
        doy : 6  // The week that contains Jan 1st is the first week of the year.
    };

    function localeFirstDayOfWeek () {
        return this._week.dow;
    }

    function localeFirstDayOfYear () {
        return this._week.doy;
    }

    // MOMENTS

    function getSetWeek (input) {
        var week = this.localeData().week(this);
        return input == null ? week : this.add((input - week) * 7, 'd');
    }

    function getSetISOWeek (input) {
        var week = weekOfYear(this, 1, 4).week;
        return input == null ? week : this.add((input - week) * 7, 'd');
    }

    addFormatToken('DDD', ['DDDD', 3], 'DDDo', 'dayOfYear');

    // ALIASES

    addUnitAlias('dayOfYear', 'DDD');

    // PARSING

    addRegexToken('DDD',  match1to3);
    addRegexToken('DDDD', match3);
    addParseToken(['DDD', 'DDDD'], function (input, array, config) {
        config._dayOfYear = toInt(input);
    });

    // HELPERS

    //http://en.wikipedia.org/wiki/ISO_week_date#Calculating_a_date_given_the_year.2C_week_number_and_weekday
    function dayOfYearFromWeeks(year, week, weekday, firstDayOfWeekOfYear, firstDayOfWeek) {
        var week1Jan = 6 + firstDayOfWeek - firstDayOfWeekOfYear, janX = createUTCDate(year, 0, 1 + week1Jan), d = janX.getUTCDay(), dayOfYear;
        if (d < firstDayOfWeek) {
            d += 7;
        }

        weekday = weekday != null ? 1 * weekday : firstDayOfWeek;

        dayOfYear = 1 + week1Jan + 7 * (week - 1) - d + weekday;

        return {
            year: dayOfYear > 0 ? year : year - 1,
            dayOfYear: dayOfYear > 0 ?  dayOfYear : daysInYear(year - 1) + dayOfYear
        };
    }

    // MOMENTS

    function getSetDayOfYear (input) {
        var dayOfYear = Math.round((this.clone().startOf('day') - this.clone().startOf('year')) / 864e5) + 1;
        return input == null ? dayOfYear : this.add((input - dayOfYear), 'd');
    }

    // Pick the first defined of two or three arguments.
    function defaults(a, b, c) {
        if (a != null) {
            return a;
        }
        if (b != null) {
            return b;
        }
        return c;
    }

    function currentDateArray(config) {
        var now = new Date();
        if (config._useUTC) {
            return [now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()];
        }
        return [now.getFullYear(), now.getMonth(), now.getDate()];
    }

    // convert an array to a date.
    // the array should mirror the parameters below
    // note: all values past the year are optional and will default to the lowest possible value.
    // [year, month, day , hour, minute, second, millisecond]
    function configFromArray (config) {
        var i, date, input = [], currentDate, yearToUse;

        if (config._d) {
            return;
        }

        currentDate = currentDateArray(config);

        //compute day of the year from weeks and weekdays
        if (config._w && config._a[DATE] == null && config._a[MONTH] == null) {
            dayOfYearFromWeekInfo(config);
        }

        //if the day of the year is set, figure out what it is
        if (config._dayOfYear) {
            yearToUse = defaults(config._a[YEAR], currentDate[YEAR]);

            if (config._dayOfYear > daysInYear(yearToUse)) {
                getParsingFlags(config)._overflowDayOfYear = true;
            }

            date = createUTCDate(yearToUse, 0, config._dayOfYear);
            config._a[MONTH] = date.getUTCMonth();
            config._a[DATE] = date.getUTCDate();
        }

        // Default to current date.
        // * if no year, month, day of month are given, default to today
        // * if day of month is given, default month and year
        // * if month is given, default only year
        // * if year is given, don't default anything
        for (i = 0; i < 3 && config._a[i] == null; ++i) {
            config._a[i] = input[i] = currentDate[i];
        }

        // Zero out whatever was not defaulted, including time
        for (; i < 7; i++) {
            config._a[i] = input[i] = (config._a[i] == null) ? (i === 2 ? 1 : 0) : config._a[i];
        }

        // Check for 24:00:00.000
        if (config._a[HOUR] === 24 &&
                config._a[MINUTE] === 0 &&
                config._a[SECOND] === 0 &&
                config._a[MILLISECOND] === 0) {
            config._nextDay = true;
            config._a[HOUR] = 0;
        }

        config._d = (config._useUTC ? createUTCDate : createDate).apply(null, input);
        // Apply timezone offset from input. The actual utcOffset can be changed
        // with parseZone.
        if (config._tzm != null) {
            config._d.setUTCMinutes(config._d.getUTCMinutes() - config._tzm);
        }

        if (config._nextDay) {
            config._a[HOUR] = 24;
        }
    }

    function dayOfYearFromWeekInfo(config) {
        var w, weekYear, week, weekday, dow, doy, temp;

        w = config._w;
        if (w.GG != null || w.W != null || w.E != null) {
            dow = 1;
            doy = 4;

            // TODO: We need to take the current isoWeekYear, but that depends on
            // how we interpret now (local, utc, fixed offset). So create
            // a now version of current config (take local/utc/offset flags, and
            // create now).
            weekYear = defaults(w.GG, config._a[YEAR], weekOfYear(local__createLocal(), 1, 4).year);
            week = defaults(w.W, 1);
            weekday = defaults(w.E, 1);
        } else {
            dow = config._locale._week.dow;
            doy = config._locale._week.doy;

            weekYear = defaults(w.gg, config._a[YEAR], weekOfYear(local__createLocal(), dow, doy).year);
            week = defaults(w.w, 1);

            if (w.d != null) {
                // weekday -- low day numbers are considered next week
                weekday = w.d;
                if (weekday < dow) {
                    ++week;
                }
            } else if (w.e != null) {
                // local weekday -- counting starts from begining of week
                weekday = w.e + dow;
            } else {
                // default to begining of week
                weekday = dow;
            }
        }
        temp = dayOfYearFromWeeks(weekYear, week, weekday, doy, dow);

        config._a[YEAR] = temp.year;
        config._dayOfYear = temp.dayOfYear;
    }

    utils_hooks__hooks.ISO_8601 = function () {};

    // date from string and format string
    function configFromStringAndFormat(config) {
        // TODO: Move this to another part of the creation flow to prevent circular deps
        if (config._f === utils_hooks__hooks.ISO_8601) {
            configFromISO(config);
            return;
        }

        config._a = [];
        getParsingFlags(config).empty = true;

        // This array is used to make a Date, either with `new Date` or `Date.UTC`
        var string = '' + config._i,
            i, parsedInput, tokens, token, skipped,
            stringLength = string.length,
            totalParsedInputLength = 0;

        tokens = expandFormat(config._f, config._locale).match(formattingTokens) || [];

        for (i = 0; i < tokens.length; i++) {
            token = tokens[i];
            parsedInput = (string.match(getParseRegexForToken(token, config)) || [])[0];
            if (parsedInput) {
                skipped = string.substr(0, string.indexOf(parsedInput));
                if (skipped.length > 0) {
                    getParsingFlags(config).unusedInput.push(skipped);
                }
                string = string.slice(string.indexOf(parsedInput) + parsedInput.length);
                totalParsedInputLength += parsedInput.length;
            }
            // don't parse if it's not a known token
            if (formatTokenFunctions[token]) {
                if (parsedInput) {
                    getParsingFlags(config).empty = false;
                }
                else {
                    getParsingFlags(config).unusedTokens.push(token);
                }
                addTimeToArrayFromToken(token, parsedInput, config);
            }
            else if (config._strict && !parsedInput) {
                getParsingFlags(config).unusedTokens.push(token);
            }
        }

        // add remaining unparsed input length to the string
        getParsingFlags(config).charsLeftOver = stringLength - totalParsedInputLength;
        if (string.length > 0) {
            getParsingFlags(config).unusedInput.push(string);
        }

        // clear _12h flag if hour is <= 12
        if (getParsingFlags(config).bigHour === true &&
                config._a[HOUR] <= 12 &&
                config._a[HOUR] > 0) {
            getParsingFlags(config).bigHour = undefined;
        }
        // handle meridiem
        config._a[HOUR] = meridiemFixWrap(config._locale, config._a[HOUR], config._meridiem);

        configFromArray(config);
        checkOverflow(config);
    }


    function meridiemFixWrap (locale, hour, meridiem) {
        var isPm;

        if (meridiem == null) {
            // nothing to do
            return hour;
        }
        if (locale.meridiemHour != null) {
            return locale.meridiemHour(hour, meridiem);
        } else if (locale.isPM != null) {
            // Fallback
            isPm = locale.isPM(meridiem);
            if (isPm && hour < 12) {
                hour += 12;
            }
            if (!isPm && hour === 12) {
                hour = 0;
            }
            return hour;
        } else {
            // this is not supposed to happen
            return hour;
        }
    }

    function configFromStringAndArray(config) {
        var tempConfig,
            bestMoment,

            scoreToBeat,
            i,
            currentScore;

        if (config._f.length === 0) {
            getParsingFlags(config).invalidFormat = true;
            config._d = new Date(NaN);
            return;
        }

        for (i = 0; i < config._f.length; i++) {
            currentScore = 0;
            tempConfig = copyConfig({}, config);
            if (config._useUTC != null) {
                tempConfig._useUTC = config._useUTC;
            }
            tempConfig._f = config._f[i];
            configFromStringAndFormat(tempConfig);

            if (!valid__isValid(tempConfig)) {
                continue;
            }

            // if there is any input that was not parsed add a penalty for that format
            currentScore += getParsingFlags(tempConfig).charsLeftOver;

            //or tokens
            currentScore += getParsingFlags(tempConfig).unusedTokens.length * 10;

            getParsingFlags(tempConfig).score = currentScore;

            if (scoreToBeat == null || currentScore < scoreToBeat) {
                scoreToBeat = currentScore;
                bestMoment = tempConfig;
            }
        }

        extend(config, bestMoment || tempConfig);
    }

    function configFromObject(config) {
        if (config._d) {
            return;
        }

        var i = normalizeObjectUnits(config._i);
        config._a = [i.year, i.month, i.day || i.date, i.hour, i.minute, i.second, i.millisecond];

        configFromArray(config);
    }

    function createFromConfig (config) {
        var res = new Moment(checkOverflow(prepareConfig(config)));
        if (res._nextDay) {
            // Adding is smart enough around DST
            res.add(1, 'd');
            res._nextDay = undefined;
        }

        return res;
    }

    function prepareConfig (config) {
        var input = config._i,
            format = config._f;

        config._locale = config._locale || locale_locales__getLocale(config._l);

        if (input === null || (format === undefined && input === '')) {
            return valid__createInvalid({nullInput: true});
        }

        if (typeof input === 'string') {
            config._i = input = config._locale.preparse(input);
        }

        if (isMoment(input)) {
            return new Moment(checkOverflow(input));
        } else if (isArray(format)) {
            configFromStringAndArray(config);
        } else if (format) {
            configFromStringAndFormat(config);
        } else if (isDate(input)) {
            config._d = input;
        } else {
            configFromInput(config);
        }

        return config;
    }

    function configFromInput(config) {
        var input = config._i;
        if (input === undefined) {
            config._d = new Date();
        } else if (isDate(input)) {
            config._d = new Date(+input);
        } else if (typeof input === 'string') {
            configFromString(config);
        } else if (isArray(input)) {
            config._a = map(input.slice(0), function (obj) {
                return parseInt(obj, 10);
            });
            configFromArray(config);
        } else if (typeof(input) === 'object') {
            configFromObject(config);
        } else if (typeof(input) === 'number') {
            // from milliseconds
            config._d = new Date(input);
        } else {
            utils_hooks__hooks.createFromInputFallback(config);
        }
    }

    function createLocalOrUTC (input, format, locale, strict, isUTC) {
        var c = {};

        if (typeof(locale) === 'boolean') {
            strict = locale;
            locale = undefined;
        }
        // object construction must be done this way.
        // https://github.com/moment/moment/issues/1423
        c._isAMomentObject = true;
        c._useUTC = c._isUTC = isUTC;
        c._l = locale;
        c._i = input;
        c._f = format;
        c._strict = strict;

        return createFromConfig(c);
    }

    function local__createLocal (input, format, locale, strict) {
        return createLocalOrUTC(input, format, locale, strict, false);
    }

    var prototypeMin = deprecate(
         'moment().min is deprecated, use moment.min instead. https://github.com/moment/moment/issues/1548',
         function () {
             var other = local__createLocal.apply(null, arguments);
             return other < this ? this : other;
         }
     );

    var prototypeMax = deprecate(
        'moment().max is deprecated, use moment.max instead. https://github.com/moment/moment/issues/1548',
        function () {
            var other = local__createLocal.apply(null, arguments);
            return other > this ? this : other;
        }
    );

    // Pick a moment m from moments so that m[fn](other) is true for all
    // other. This relies on the function fn to be transitive.
    //
    // moments should either be an array of moment objects or an array, whose
    // first element is an array of moment objects.
    function pickBy(fn, moments) {
        var res, i;
        if (moments.length === 1 && isArray(moments[0])) {
            moments = moments[0];
        }
        if (!moments.length) {
            return local__createLocal();
        }
        res = moments[0];
        for (i = 1; i < moments.length; ++i) {
            if (!moments[i].isValid() || moments[i][fn](res)) {
                res = moments[i];
            }
        }
        return res;
    }

    // TODO: Use [].sort instead?
    function min () {
        var args = [].slice.call(arguments, 0);

        return pickBy('isBefore', args);
    }

    function max () {
        var args = [].slice.call(arguments, 0);

        return pickBy('isAfter', args);
    }

    function Duration (duration) {
        var normalizedInput = normalizeObjectUnits(duration),
            years = normalizedInput.year || 0,
            quarters = normalizedInput.quarter || 0,
            months = normalizedInput.month || 0,
            weeks = normalizedInput.week || 0,
            days = normalizedInput.day || 0,
            hours = normalizedInput.hour || 0,
            minutes = normalizedInput.minute || 0,
            seconds = normalizedInput.second || 0,
            milliseconds = normalizedInput.millisecond || 0;

        // representation for dateAddRemove
        this._milliseconds = +milliseconds +
            seconds * 1e3 + // 1000
            minutes * 6e4 + // 1000 * 60
            hours * 36e5; // 1000 * 60 * 60
        // Because of dateAddRemove treats 24 hours as different from a
        // day when working around DST, we need to store them separately
        this._days = +days +
            weeks * 7;
        // It is impossible translate months into days without knowing
        // which months you are are talking about, so we have to store
        // it separately.
        this._months = +months +
            quarters * 3 +
            years * 12;

        this._data = {};

        this._locale = locale_locales__getLocale();

        this._bubble();
    }

    function isDuration (obj) {
        return obj instanceof Duration;
    }

    function offset (token, separator) {
        addFormatToken(token, 0, 0, function () {
            var offset = this.utcOffset();
            var sign = '+';
            if (offset < 0) {
                offset = -offset;
                sign = '-';
            }
            return sign + zeroFill(~~(offset / 60), 2) + separator + zeroFill(~~(offset) % 60, 2);
        });
    }

    offset('Z', ':');
    offset('ZZ', '');

    // PARSING

    addRegexToken('Z',  matchOffset);
    addRegexToken('ZZ', matchOffset);
    addParseToken(['Z', 'ZZ'], function (input, array, config) {
        config._useUTC = true;
        config._tzm = offsetFromString(input);
    });

    // HELPERS

    // timezone chunker
    // '+10:00' > ['10',  '00']
    // '-1530'  > ['-15', '30']
    var chunkOffset = /([\+\-]|\d\d)/gi;

    function offsetFromString(string) {
        var matches = ((string || '').match(matchOffset) || []);
        var chunk   = matches[matches.length - 1] || [];
        var parts   = (chunk + '').match(chunkOffset) || ['-', 0, 0];
        var minutes = +(parts[1] * 60) + toInt(parts[2]);

        return parts[0] === '+' ? minutes : -minutes;
    }

    // Return a moment from input, that is local/utc/zone equivalent to model.
    function cloneWithOffset(input, model) {
        var res, diff;
        if (model._isUTC) {
            res = model.clone();
            diff = (isMoment(input) || isDate(input) ? +input : +local__createLocal(input)) - (+res);
            // Use low-level api, because this fn is low-level api.
            res._d.setTime(+res._d + diff);
            utils_hooks__hooks.updateOffset(res, false);
            return res;
        } else {
            return local__createLocal(input).local();
        }
    }

    function getDateOffset (m) {
        // On Firefox.24 Date#getTimezoneOffset returns a floating point.
        // https://github.com/moment/moment/pull/1871
        return -Math.round(m._d.getTimezoneOffset() / 15) * 15;
    }

    // HOOKS

    // This function will be called whenever a moment is mutated.
    // It is intended to keep the offset in sync with the timezone.
    utils_hooks__hooks.updateOffset = function () {};

    // MOMENTS

    // keepLocalTime = true means only change the timezone, without
    // affecting the local hour. So 5:31:26 +0300 --[utcOffset(2, true)]-->
    // 5:31:26 +0200 It is possible that 5:31:26 doesn't exist with offset
    // +0200, so we adjust the time as needed, to be valid.
    //
    // Keeping the time actually adds/subtracts (one hour)
    // from the actual represented time. That is why we call updateOffset
    // a second time. In case it wants us to change the offset again
    // _changeInProgress == true case, then we have to adjust, because
    // there is no such time in the given timezone.
    function getSetOffset (input, keepLocalTime) {
        var offset = this._offset || 0,
            localAdjust;
        if (input != null) {
            if (typeof input === 'string') {
                input = offsetFromString(input);
            }
            if (Math.abs(input) < 16) {
                input = input * 60;
            }
            if (!this._isUTC && keepLocalTime) {
                localAdjust = getDateOffset(this);
            }
            this._offset = input;
            this._isUTC = true;
            if (localAdjust != null) {
                this.add(localAdjust, 'm');
            }
            if (offset !== input) {
                if (!keepLocalTime || this._changeInProgress) {
                    add_subtract__addSubtract(this, create__createDuration(input - offset, 'm'), 1, false);
                } else if (!this._changeInProgress) {
                    this._changeInProgress = true;
                    utils_hooks__hooks.updateOffset(this, true);
                    this._changeInProgress = null;
                }
            }
            return this;
        } else {
            return this._isUTC ? offset : getDateOffset(this);
        }
    }

    function getSetZone (input, keepLocalTime) {
        if (input != null) {
            if (typeof input !== 'string') {
                input = -input;
            }

            this.utcOffset(input, keepLocalTime);

            return this;
        } else {
            return -this.utcOffset();
        }
    }

    function setOffsetToUTC (keepLocalTime) {
        return this.utcOffset(0, keepLocalTime);
    }

    function setOffsetToLocal (keepLocalTime) {
        if (this._isUTC) {
            this.utcOffset(0, keepLocalTime);
            this._isUTC = false;

            if (keepLocalTime) {
                this.subtract(getDateOffset(this), 'm');
            }
        }
        return this;
    }

    function setOffsetToParsedOffset () {
        if (this._tzm) {
            this.utcOffset(this._tzm);
        } else if (typeof this._i === 'string') {
            this.utcOffset(offsetFromString(this._i));
        }
        return this;
    }

    function hasAlignedHourOffset (input) {
        input = input ? local__createLocal(input).utcOffset() : 0;

        return (this.utcOffset() - input) % 60 === 0;
    }

    function isDaylightSavingTime () {
        return (
            this.utcOffset() > this.clone().month(0).utcOffset() ||
            this.utcOffset() > this.clone().month(5).utcOffset()
        );
    }

    function isDaylightSavingTimeShifted () {
        if (typeof this._isDSTShifted !== 'undefined') {
            return this._isDSTShifted;
        }

        var c = {};

        copyConfig(c, this);
        c = prepareConfig(c);

        if (c._a) {
            var other = c._isUTC ? create_utc__createUTC(c._a) : local__createLocal(c._a);
            this._isDSTShifted = this.isValid() &&
                compareArrays(c._a, other.toArray()) > 0;
        } else {
            this._isDSTShifted = false;
        }

        return this._isDSTShifted;
    }

    function isLocal () {
        return !this._isUTC;
    }

    function isUtcOffset () {
        return this._isUTC;
    }

    function isUtc () {
        return this._isUTC && this._offset === 0;
    }

    var aspNetRegex = /(\-)?(?:(\d*)\.)?(\d+)\:(\d+)(?:\:(\d+)\.?(\d{3})?)?/;

    // from http://docs.closure-library.googlecode.com/git/closure_goog_date_date.js.source.html
    // somewhat more in line with 4.4.3.2 2004 spec, but allows decimal anywhere
    var create__isoRegex = /^(-)?P(?:(?:([0-9,.]*)Y)?(?:([0-9,.]*)M)?(?:([0-9,.]*)D)?(?:T(?:([0-9,.]*)H)?(?:([0-9,.]*)M)?(?:([0-9,.]*)S)?)?|([0-9,.]*)W)$/;

    function create__createDuration (input, key) {
        var duration = input,
            // matching against regexp is expensive, do it on demand
            match = null,
            sign,
            ret,
            diffRes;

        if (isDuration(input)) {
            duration = {
                ms : input._milliseconds,
                d  : input._days,
                M  : input._months
            };
        } else if (typeof input === 'number') {
            duration = {};
            if (key) {
                duration[key] = input;
            } else {
                duration.milliseconds = input;
            }
        } else if (!!(match = aspNetRegex.exec(input))) {
            sign = (match[1] === '-') ? -1 : 1;
            duration = {
                y  : 0,
                d  : toInt(match[DATE])        * sign,
                h  : toInt(match[HOUR])        * sign,
                m  : toInt(match[MINUTE])      * sign,
                s  : toInt(match[SECOND])      * sign,
                ms : toInt(match[MILLISECOND]) * sign
            };
        } else if (!!(match = create__isoRegex.exec(input))) {
            sign = (match[1] === '-') ? -1 : 1;
            duration = {
                y : parseIso(match[2], sign),
                M : parseIso(match[3], sign),
                d : parseIso(match[4], sign),
                h : parseIso(match[5], sign),
                m : parseIso(match[6], sign),
                s : parseIso(match[7], sign),
                w : parseIso(match[8], sign)
            };
        } else if (duration == null) {// checks for null or undefined
            duration = {};
        } else if (typeof duration === 'object' && ('from' in duration || 'to' in duration)) {
            diffRes = momentsDifference(local__createLocal(duration.from), local__createLocal(duration.to));

            duration = {};
            duration.ms = diffRes.milliseconds;
            duration.M = diffRes.months;
        }

        ret = new Duration(duration);

        if (isDuration(input) && hasOwnProp(input, '_locale')) {
            ret._locale = input._locale;
        }

        return ret;
    }

    create__createDuration.fn = Duration.prototype;

    function parseIso (inp, sign) {
        // We'd normally use ~~inp for this, but unfortunately it also
        // converts floats to ints.
        // inp may be undefined, so careful calling replace on it.
        var res = inp && parseFloat(inp.replace(',', '.'));
        // apply sign while we're at it
        return (isNaN(res) ? 0 : res) * sign;
    }

    function positiveMomentsDifference(base, other) {
        var res = {milliseconds: 0, months: 0};

        res.months = other.month() - base.month() +
            (other.year() - base.year()) * 12;
        if (base.clone().add(res.months, 'M').isAfter(other)) {
            --res.months;
        }

        res.milliseconds = +other - +(base.clone().add(res.months, 'M'));

        return res;
    }

    function momentsDifference(base, other) {
        var res;
        other = cloneWithOffset(other, base);
        if (base.isBefore(other)) {
            res = positiveMomentsDifference(base, other);
        } else {
            res = positiveMomentsDifference(other, base);
            res.milliseconds = -res.milliseconds;
            res.months = -res.months;
        }

        return res;
    }

    function createAdder(direction, name) {
        return function (val, period) {
            var dur, tmp;
            //invert the arguments, but complain about it
            if (period !== null && !isNaN(+period)) {
                deprecateSimple(name, 'moment().' + name  + '(period, number) is deprecated. Please use moment().' + name + '(number, period).');
                tmp = val; val = period; period = tmp;
            }

            val = typeof val === 'string' ? +val : val;
            dur = create__createDuration(val, period);
            add_subtract__addSubtract(this, dur, direction);
            return this;
        };
    }

    function add_subtract__addSubtract (mom, duration, isAdding, updateOffset) {
        var milliseconds = duration._milliseconds,
            days = duration._days,
            months = duration._months;
        updateOffset = updateOffset == null ? true : updateOffset;

        if (milliseconds) {
            mom._d.setTime(+mom._d + milliseconds * isAdding);
        }
        if (days) {
            get_set__set(mom, 'Date', get_set__get(mom, 'Date') + days * isAdding);
        }
        if (months) {
            setMonth(mom, get_set__get(mom, 'Month') + months * isAdding);
        }
        if (updateOffset) {
            utils_hooks__hooks.updateOffset(mom, days || months);
        }
    }

    var add_subtract__add      = createAdder(1, 'add');
    var add_subtract__subtract = createAdder(-1, 'subtract');

    function moment_calendar__calendar (time, formats) {
        // We want to compare the start of today, vs this.
        // Getting start-of-today depends on whether we're local/utc/offset or not.
        var now = time || local__createLocal(),
            sod = cloneWithOffset(now, this).startOf('day'),
            diff = this.diff(sod, 'days', true),
            format = diff < -6 ? 'sameElse' :
                diff < -1 ? 'lastWeek' :
                diff < 0 ? 'lastDay' :
                diff < 1 ? 'sameDay' :
                diff < 2 ? 'nextDay' :
                diff < 7 ? 'nextWeek' : 'sameElse';
        return this.format(formats && formats[format] || this.localeData().calendar(format, this, local__createLocal(now)));
    }

    function clone () {
        return new Moment(this);
    }

    function isAfter (input, units) {
        var inputMs;
        units = normalizeUnits(typeof units !== 'undefined' ? units : 'millisecond');
        if (units === 'millisecond') {
            input = isMoment(input) ? input : local__createLocal(input);
            return +this > +input;
        } else {
            inputMs = isMoment(input) ? +input : +local__createLocal(input);
            return inputMs < +this.clone().startOf(units);
        }
    }

    function isBefore (input, units) {
        var inputMs;
        units = normalizeUnits(typeof units !== 'undefined' ? units : 'millisecond');
        if (units === 'millisecond') {
            input = isMoment(input) ? input : local__createLocal(input);
            return +this < +input;
        } else {
            inputMs = isMoment(input) ? +input : +local__createLocal(input);
            return +this.clone().endOf(units) < inputMs;
        }
    }

    function isBetween (from, to, units) {
        return this.isAfter(from, units) && this.isBefore(to, units);
    }

    function isSame (input, units) {
        var inputMs;
        units = normalizeUnits(units || 'millisecond');
        if (units === 'millisecond') {
            input = isMoment(input) ? input : local__createLocal(input);
            return +this === +input;
        } else {
            inputMs = +local__createLocal(input);
            return +(this.clone().startOf(units)) <= inputMs && inputMs <= +(this.clone().endOf(units));
        }
    }

    function diff (input, units, asFloat) {
        var that = cloneWithOffset(input, this),
            zoneDelta = (that.utcOffset() - this.utcOffset()) * 6e4,
            delta, output;

        units = normalizeUnits(units);

        if (units === 'year' || units === 'month' || units === 'quarter') {
            output = monthDiff(this, that);
            if (units === 'quarter') {
                output = output / 3;
            } else if (units === 'year') {
                output = output / 12;
            }
        } else {
            delta = this - that;
            output = units === 'second' ? delta / 1e3 : // 1000
                units === 'minute' ? delta / 6e4 : // 1000 * 60
                units === 'hour' ? delta / 36e5 : // 1000 * 60 * 60
                units === 'day' ? (delta - zoneDelta) / 864e5 : // 1000 * 60 * 60 * 24, negate dst
                units === 'week' ? (delta - zoneDelta) / 6048e5 : // 1000 * 60 * 60 * 24 * 7, negate dst
                delta;
        }
        return asFloat ? output : absFloor(output);
    }

    function monthDiff (a, b) {
        // difference in months
        var wholeMonthDiff = ((b.year() - a.year()) * 12) + (b.month() - a.month()),
            // b is in (anchor - 1 month, anchor + 1 month)
            anchor = a.clone().add(wholeMonthDiff, 'months'),
            anchor2, adjust;

        if (b - anchor < 0) {
            anchor2 = a.clone().add(wholeMonthDiff - 1, 'months');
            // linear across the month
            adjust = (b - anchor) / (anchor - anchor2);
        } else {
            anchor2 = a.clone().add(wholeMonthDiff + 1, 'months');
            // linear across the month
            adjust = (b - anchor) / (anchor2 - anchor);
        }

        return -(wholeMonthDiff + adjust);
    }

    utils_hooks__hooks.defaultFormat = 'YYYY-MM-DDTHH:mm:ssZ';

    function toString () {
        return this.clone().locale('en').format('ddd MMM DD YYYY HH:mm:ss [GMT]ZZ');
    }

    function moment_format__toISOString () {
        var m = this.clone().utc();
        if (0 < m.year() && m.year() <= 9999) {
            if ('function' === typeof Date.prototype.toISOString) {
                // native implementation is ~50x faster, use it when we can
                return this.toDate().toISOString();
            } else {
                return formatMoment(m, 'YYYY-MM-DD[T]HH:mm:ss.SSS[Z]');
            }
        } else {
            return formatMoment(m, 'YYYYYY-MM-DD[T]HH:mm:ss.SSS[Z]');
        }
    }

    function format (inputString) {
        var output = formatMoment(this, inputString || utils_hooks__hooks.defaultFormat);
        return this.localeData().postformat(output);
    }

    function from (time, withoutSuffix) {
        if (!this.isValid()) {
            return this.localeData().invalidDate();
        }
        return create__createDuration({to: this, from: time}).locale(this.locale()).humanize(!withoutSuffix);
    }

    function fromNow (withoutSuffix) {
        return this.from(local__createLocal(), withoutSuffix);
    }

    function to (time, withoutSuffix) {
        if (!this.isValid()) {
            return this.localeData().invalidDate();
        }
        return create__createDuration({from: this, to: time}).locale(this.locale()).humanize(!withoutSuffix);
    }

    function toNow (withoutSuffix) {
        return this.to(local__createLocal(), withoutSuffix);
    }

    function locale (key) {
        var newLocaleData;

        if (key === undefined) {
            return this._locale._abbr;
        } else {
            newLocaleData = locale_locales__getLocale(key);
            if (newLocaleData != null) {
                this._locale = newLocaleData;
            }
            return this;
        }
    }

    var lang = deprecate(
        'moment().lang() is deprecated. Instead, use moment().localeData() to get the language configuration. Use moment().locale() to change languages.',
        function (key) {
            if (key === undefined) {
                return this.localeData();
            } else {
                return this.locale(key);
            }
        }
    );

    function localeData () {
        return this._locale;
    }

    function startOf (units) {
        units = normalizeUnits(units);
        // the following switch intentionally omits break keywords
        // to utilize falling through the cases.
        switch (units) {
        case 'year':
            this.month(0);
            /* falls through */
        case 'quarter':
        case 'month':
            this.date(1);
            /* falls through */
        case 'week':
        case 'isoWeek':
        case 'day':
            this.hours(0);
            /* falls through */
        case 'hour':
            this.minutes(0);
            /* falls through */
        case 'minute':
            this.seconds(0);
            /* falls through */
        case 'second':
            this.milliseconds(0);
        }

        // weeks are a special case
        if (units === 'week') {
            this.weekday(0);
        }
        if (units === 'isoWeek') {
            this.isoWeekday(1);
        }

        // quarters are also special
        if (units === 'quarter') {
            this.month(Math.floor(this.month() / 3) * 3);
        }

        return this;
    }

    function endOf (units) {
        units = normalizeUnits(units);
        if (units === undefined || units === 'millisecond') {
            return this;
        }
        return this.startOf(units).add(1, (units === 'isoWeek' ? 'week' : units)).subtract(1, 'ms');
    }

    function to_type__valueOf () {
        return +this._d - ((this._offset || 0) * 60000);
    }

    function unix () {
        return Math.floor(+this / 1000);
    }

    function toDate () {
        return this._offset ? new Date(+this) : this._d;
    }

    function toArray () {
        var m = this;
        return [m.year(), m.month(), m.date(), m.hour(), m.minute(), m.second(), m.millisecond()];
    }

    function toObject () {
        var m = this;
        return {
            years: m.year(),
            months: m.month(),
            date: m.date(),
            hours: m.hours(),
            minutes: m.minutes(),
            seconds: m.seconds(),
            milliseconds: m.milliseconds()
        };
    }

    function moment_valid__isValid () {
        return valid__isValid(this);
    }

    function parsingFlags () {
        return extend({}, getParsingFlags(this));
    }

    function invalidAt () {
        return getParsingFlags(this).overflow;
    }

    addFormatToken(0, ['gg', 2], 0, function () {
        return this.weekYear() % 100;
    });

    addFormatToken(0, ['GG', 2], 0, function () {
        return this.isoWeekYear() % 100;
    });

    function addWeekYearFormatToken (token, getter) {
        addFormatToken(0, [token, token.length], 0, getter);
    }

    addWeekYearFormatToken('gggg',     'weekYear');
    addWeekYearFormatToken('ggggg',    'weekYear');
    addWeekYearFormatToken('GGGG',  'isoWeekYear');
    addWeekYearFormatToken('GGGGG', 'isoWeekYear');

    // ALIASES

    addUnitAlias('weekYear', 'gg');
    addUnitAlias('isoWeekYear', 'GG');

    // PARSING

    addRegexToken('G',      matchSigned);
    addRegexToken('g',      matchSigned);
    addRegexToken('GG',     match1to2, match2);
    addRegexToken('gg',     match1to2, match2);
    addRegexToken('GGGG',   match1to4, match4);
    addRegexToken('gggg',   match1to4, match4);
    addRegexToken('GGGGG',  match1to6, match6);
    addRegexToken('ggggg',  match1to6, match6);

    addWeekParseToken(['gggg', 'ggggg', 'GGGG', 'GGGGG'], function (input, week, config, token) {
        week[token.substr(0, 2)] = toInt(input);
    });

    addWeekParseToken(['gg', 'GG'], function (input, week, config, token) {
        week[token] = utils_hooks__hooks.parseTwoDigitYear(input);
    });

    // HELPERS

    function weeksInYear(year, dow, doy) {
        return weekOfYear(local__createLocal([year, 11, 31 + dow - doy]), dow, doy).week;
    }

    // MOMENTS

    function getSetWeekYear (input) {
        var year = weekOfYear(this, this.localeData()._week.dow, this.localeData()._week.doy).year;
        return input == null ? year : this.add((input - year), 'y');
    }

    function getSetISOWeekYear (input) {
        var year = weekOfYear(this, 1, 4).year;
        return input == null ? year : this.add((input - year), 'y');
    }

    function getISOWeeksInYear () {
        return weeksInYear(this.year(), 1, 4);
    }

    function getWeeksInYear () {
        var weekInfo = this.localeData()._week;
        return weeksInYear(this.year(), weekInfo.dow, weekInfo.doy);
    }

    addFormatToken('Q', 0, 0, 'quarter');

    // ALIASES

    addUnitAlias('quarter', 'Q');

    // PARSING

    addRegexToken('Q', match1);
    addParseToken('Q', function (input, array) {
        array[MONTH] = (toInt(input) - 1) * 3;
    });

    // MOMENTS

    function getSetQuarter (input) {
        return input == null ? Math.ceil((this.month() + 1) / 3) : this.month((input - 1) * 3 + this.month() % 3);
    }

    addFormatToken('D', ['DD', 2], 'Do', 'date');

    // ALIASES

    addUnitAlias('date', 'D');

    // PARSING

    addRegexToken('D',  match1to2);
    addRegexToken('DD', match1to2, match2);
    addRegexToken('Do', function (isStrict, locale) {
        return isStrict ? locale._ordinalParse : locale._ordinalParseLenient;
    });

    addParseToken(['D', 'DD'], DATE);
    addParseToken('Do', function (input, array) {
        array[DATE] = toInt(input.match(match1to2)[0], 10);
    });

    // MOMENTS

    var getSetDayOfMonth = makeGetSet('Date', true);

    addFormatToken('d', 0, 'do', 'day');

    addFormatToken('dd', 0, 0, function (format) {
        return this.localeData().weekdaysMin(this, format);
    });

    addFormatToken('ddd', 0, 0, function (format) {
        return this.localeData().weekdaysShort(this, format);
    });

    addFormatToken('dddd', 0, 0, function (format) {
        return this.localeData().weekdays(this, format);
    });

    addFormatToken('e', 0, 0, 'weekday');
    addFormatToken('E', 0, 0, 'isoWeekday');

    // ALIASES

    addUnitAlias('day', 'd');
    addUnitAlias('weekday', 'e');
    addUnitAlias('isoWeekday', 'E');

    // PARSING

    addRegexToken('d',    match1to2);
    addRegexToken('e',    match1to2);
    addRegexToken('E',    match1to2);
    addRegexToken('dd',   matchWord);
    addRegexToken('ddd',  matchWord);
    addRegexToken('dddd', matchWord);

    addWeekParseToken(['dd', 'ddd', 'dddd'], function (input, week, config) {
        var weekday = config._locale.weekdaysParse(input);
        // if we didn't get a weekday name, mark the date as invalid
        if (weekday != null) {
            week.d = weekday;
        } else {
            getParsingFlags(config).invalidWeekday = input;
        }
    });

    addWeekParseToken(['d', 'e', 'E'], function (input, week, config, token) {
        week[token] = toInt(input);
    });

    // HELPERS

    function parseWeekday(input, locale) {
        if (typeof input !== 'string') {
            return input;
        }

        if (!isNaN(input)) {
            return parseInt(input, 10);
        }

        input = locale.weekdaysParse(input);
        if (typeof input === 'number') {
            return input;
        }

        return null;
    }

    // LOCALES

    var defaultLocaleWeekdays = 'Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday'.split('_');
    function localeWeekdays (m) {
        return this._weekdays[m.day()];
    }

    var defaultLocaleWeekdaysShort = 'Sun_Mon_Tue_Wed_Thu_Fri_Sat'.split('_');
    function localeWeekdaysShort (m) {
        return this._weekdaysShort[m.day()];
    }

    var defaultLocaleWeekdaysMin = 'Su_Mo_Tu_We_Th_Fr_Sa'.split('_');
    function localeWeekdaysMin (m) {
        return this._weekdaysMin[m.day()];
    }

    function localeWeekdaysParse (weekdayName) {
        var i, mom, regex;

        this._weekdaysParse = this._weekdaysParse || [];

        for (i = 0; i < 7; i++) {
            // make the regex if we don't have it already
            if (!this._weekdaysParse[i]) {
                mom = local__createLocal([2000, 1]).day(i);
                regex = '^' + this.weekdays(mom, '') + '|^' + this.weekdaysShort(mom, '') + '|^' + this.weekdaysMin(mom, '');
                this._weekdaysParse[i] = new RegExp(regex.replace('.', ''), 'i');
            }
            // test the regex
            if (this._weekdaysParse[i].test(weekdayName)) {
                return i;
            }
        }
    }

    // MOMENTS

    function getSetDayOfWeek (input) {
        var day = this._isUTC ? this._d.getUTCDay() : this._d.getDay();
        if (input != null) {
            input = parseWeekday(input, this.localeData());
            return this.add(input - day, 'd');
        } else {
            return day;
        }
    }

    function getSetLocaleDayOfWeek (input) {
        var weekday = (this.day() + 7 - this.localeData()._week.dow) % 7;
        return input == null ? weekday : this.add(input - weekday, 'd');
    }

    function getSetISODayOfWeek (input) {
        // behaves the same as moment#day except
        // as a getter, returns 7 instead of 0 (1-7 range instead of 0-6)
        // as a setter, sunday should belong to the previous week.
        return input == null ? this.day() || 7 : this.day(this.day() % 7 ? input : input - 7);
    }

    addFormatToken('H', ['HH', 2], 0, 'hour');
    addFormatToken('h', ['hh', 2], 0, function () {
        return this.hours() % 12 || 12;
    });

    function meridiem (token, lowercase) {
        addFormatToken(token, 0, 0, function () {
            return this.localeData().meridiem(this.hours(), this.minutes(), lowercase);
        });
    }

    meridiem('a', true);
    meridiem('A', false);

    // ALIASES

    addUnitAlias('hour', 'h');

    // PARSING

    function matchMeridiem (isStrict, locale) {
        return locale._meridiemParse;
    }

    addRegexToken('a',  matchMeridiem);
    addRegexToken('A',  matchMeridiem);
    addRegexToken('H',  match1to2);
    addRegexToken('h',  match1to2);
    addRegexToken('HH', match1to2, match2);
    addRegexToken('hh', match1to2, match2);

    addParseToken(['H', 'HH'], HOUR);
    addParseToken(['a', 'A'], function (input, array, config) {
        config._isPm = config._locale.isPM(input);
        config._meridiem = input;
    });
    addParseToken(['h', 'hh'], function (input, array, config) {
        array[HOUR] = toInt(input);
        getParsingFlags(config).bigHour = true;
    });

    // LOCALES

    function localeIsPM (input) {
        // IE8 Quirks Mode & IE7 Standards Mode do not allow accessing strings like arrays
        // Using charAt should be more compatible.
        return ((input + '').toLowerCase().charAt(0) === 'p');
    }

    var defaultLocaleMeridiemParse = /[ap]\.?m?\.?/i;
    function localeMeridiem (hours, minutes, isLower) {
        if (hours > 11) {
            return isLower ? 'pm' : 'PM';
        } else {
            return isLower ? 'am' : 'AM';
        }
    }


    // MOMENTS

    // Setting the hour should keep the time, because the user explicitly
    // specified which hour he wants. So trying to maintain the same hour (in
    // a new timezone) makes sense. Adding/subtracting hours does not follow
    // this rule.
    var getSetHour = makeGetSet('Hours', true);

    addFormatToken('m', ['mm', 2], 0, 'minute');

    // ALIASES

    addUnitAlias('minute', 'm');

    // PARSING

    addRegexToken('m',  match1to2);
    addRegexToken('mm', match1to2, match2);
    addParseToken(['m', 'mm'], MINUTE);

    // MOMENTS

    var getSetMinute = makeGetSet('Minutes', false);

    addFormatToken('s', ['ss', 2], 0, 'second');

    // ALIASES

    addUnitAlias('second', 's');

    // PARSING

    addRegexToken('s',  match1to2);
    addRegexToken('ss', match1to2, match2);
    addParseToken(['s', 'ss'], SECOND);

    // MOMENTS

    var getSetSecond = makeGetSet('Seconds', false);

    addFormatToken('S', 0, 0, function () {
        return ~~(this.millisecond() / 100);
    });

    addFormatToken(0, ['SS', 2], 0, function () {
        return ~~(this.millisecond() / 10);
    });

    addFormatToken(0, ['SSS', 3], 0, 'millisecond');
    addFormatToken(0, ['SSSS', 4], 0, function () {
        return this.millisecond() * 10;
    });
    addFormatToken(0, ['SSSSS', 5], 0, function () {
        return this.millisecond() * 100;
    });
    addFormatToken(0, ['SSSSSS', 6], 0, function () {
        return this.millisecond() * 1000;
    });
    addFormatToken(0, ['SSSSSSS', 7], 0, function () {
        return this.millisecond() * 10000;
    });
    addFormatToken(0, ['SSSSSSSS', 8], 0, function () {
        return this.millisecond() * 100000;
    });
    addFormatToken(0, ['SSSSSSSSS', 9], 0, function () {
        return this.millisecond() * 1000000;
    });


    // ALIASES

    addUnitAlias('millisecond', 'ms');

    // PARSING

    addRegexToken('S',    match1to3, match1);
    addRegexToken('SS',   match1to3, match2);
    addRegexToken('SSS',  match1to3, match3);

    var token;
    for (token = 'SSSS'; token.length <= 9; token += 'S') {
        addRegexToken(token, matchUnsigned);
    }

    function parseMs(input, array) {
        array[MILLISECOND] = toInt(('0.' + input) * 1000);
    }

    for (token = 'S'; token.length <= 9; token += 'S') {
        addParseToken(token, parseMs);
    }
    // MOMENTS

    var getSetMillisecond = makeGetSet('Milliseconds', false);

    addFormatToken('z',  0, 0, 'zoneAbbr');
    addFormatToken('zz', 0, 0, 'zoneName');

    // MOMENTS

    function getZoneAbbr () {
        return this._isUTC ? 'UTC' : '';
    }

    function getZoneName () {
        return this._isUTC ? 'Coordinated Universal Time' : '';
    }

    var momentPrototype__proto = Moment.prototype;

    momentPrototype__proto.add          = add_subtract__add;
    momentPrototype__proto.calendar     = moment_calendar__calendar;
    momentPrototype__proto.clone        = clone;
    momentPrototype__proto.diff         = diff;
    momentPrototype__proto.endOf        = endOf;
    momentPrototype__proto.format       = format;
    momentPrototype__proto.from         = from;
    momentPrototype__proto.fromNow      = fromNow;
    momentPrototype__proto.to           = to;
    momentPrototype__proto.toNow        = toNow;
    momentPrototype__proto.get          = getSet;
    momentPrototype__proto.invalidAt    = invalidAt;
    momentPrototype__proto.isAfter      = isAfter;
    momentPrototype__proto.isBefore     = isBefore;
    momentPrototype__proto.isBetween    = isBetween;
    momentPrototype__proto.isSame       = isSame;
    momentPrototype__proto.isValid      = moment_valid__isValid;
    momentPrototype__proto.lang         = lang;
    momentPrototype__proto.locale       = locale;
    momentPrototype__proto.localeData   = localeData;
    momentPrototype__proto.max          = prototypeMax;
    momentPrototype__proto.min          = prototypeMin;
    momentPrototype__proto.parsingFlags = parsingFlags;
    momentPrototype__proto.set          = getSet;
    momentPrototype__proto.startOf      = startOf;
    momentPrototype__proto.subtract     = add_subtract__subtract;
    momentPrototype__proto.toArray      = toArray;
    momentPrototype__proto.toObject     = toObject;
    momentPrototype__proto.toDate       = toDate;
    momentPrototype__proto.toISOString  = moment_format__toISOString;
    momentPrototype__proto.toJSON       = moment_format__toISOString;
    momentPrototype__proto.toString     = toString;
    momentPrototype__proto.unix         = unix;
    momentPrototype__proto.valueOf      = to_type__valueOf;

    // Year
    momentPrototype__proto.year       = getSetYear;
    momentPrototype__proto.isLeapYear = getIsLeapYear;

    // Week Year
    momentPrototype__proto.weekYear    = getSetWeekYear;
    momentPrototype__proto.isoWeekYear = getSetISOWeekYear;

    // Quarter
    momentPrototype__proto.quarter = momentPrototype__proto.quarters = getSetQuarter;

    // Month
    momentPrototype__proto.month       = getSetMonth;
    momentPrototype__proto.daysInMonth = getDaysInMonth;

    // Week
    momentPrototype__proto.week           = momentPrototype__proto.weeks        = getSetWeek;
    momentPrototype__proto.isoWeek        = momentPrototype__proto.isoWeeks     = getSetISOWeek;
    momentPrototype__proto.weeksInYear    = getWeeksInYear;
    momentPrototype__proto.isoWeeksInYear = getISOWeeksInYear;

    // Day
    momentPrototype__proto.date       = getSetDayOfMonth;
    momentPrototype__proto.day        = momentPrototype__proto.days             = getSetDayOfWeek;
    momentPrototype__proto.weekday    = getSetLocaleDayOfWeek;
    momentPrototype__proto.isoWeekday = getSetISODayOfWeek;
    momentPrototype__proto.dayOfYear  = getSetDayOfYear;

    // Hour
    momentPrototype__proto.hour = momentPrototype__proto.hours = getSetHour;

    // Minute
    momentPrototype__proto.minute = momentPrototype__proto.minutes = getSetMinute;

    // Second
    momentPrototype__proto.second = momentPrototype__proto.seconds = getSetSecond;

    // Millisecond
    momentPrototype__proto.millisecond = momentPrototype__proto.milliseconds = getSetMillisecond;

    // Offset
    momentPrototype__proto.utcOffset            = getSetOffset;
    momentPrototype__proto.utc                  = setOffsetToUTC;
    momentPrototype__proto.local                = setOffsetToLocal;
    momentPrototype__proto.parseZone            = setOffsetToParsedOffset;
    momentPrototype__proto.hasAlignedHourOffset = hasAlignedHourOffset;
    momentPrototype__proto.isDST                = isDaylightSavingTime;
    momentPrototype__proto.isDSTShifted         = isDaylightSavingTimeShifted;
    momentPrototype__proto.isLocal              = isLocal;
    momentPrototype__proto.isUtcOffset          = isUtcOffset;
    momentPrototype__proto.isUtc                = isUtc;
    momentPrototype__proto.isUTC                = isUtc;

    // Timezone
    momentPrototype__proto.zoneAbbr = getZoneAbbr;
    momentPrototype__proto.zoneName = getZoneName;

    // Deprecations
    momentPrototype__proto.dates  = deprecate('dates accessor is deprecated. Use date instead.', getSetDayOfMonth);
    momentPrototype__proto.months = deprecate('months accessor is deprecated. Use month instead', getSetMonth);
    momentPrototype__proto.years  = deprecate('years accessor is deprecated. Use year instead', getSetYear);
    momentPrototype__proto.zone   = deprecate('moment().zone is deprecated, use moment().utcOffset instead. https://github.com/moment/moment/issues/1779', getSetZone);

    var momentPrototype = momentPrototype__proto;

    function moment__createUnix (input) {
        return local__createLocal(input * 1000);
    }

    function moment__createInZone () {
        return local__createLocal.apply(null, arguments).parseZone();
    }

    var defaultCalendar = {
        sameDay : '[Today at] LT',
        nextDay : '[Tomorrow at] LT',
        nextWeek : 'dddd [at] LT',
        lastDay : '[Yesterday at] LT',
        lastWeek : '[Last] dddd [at] LT',
        sameElse : 'L'
    };

    function locale_calendar__calendar (key, mom, now) {
        var output = this._calendar[key];
        return typeof output === 'function' ? output.call(mom, now) : output;
    }

    var defaultLongDateFormat = {
        LTS  : 'h:mm:ss A',
        LT   : 'h:mm A',
        L    : 'MM/DD/YYYY',
        LL   : 'MMMM D, YYYY',
        LLL  : 'MMMM D, YYYY h:mm A',
        LLLL : 'dddd, MMMM D, YYYY h:mm A'
    };

    function longDateFormat (key) {
        var format = this._longDateFormat[key],
            formatUpper = this._longDateFormat[key.toUpperCase()];

        if (format || !formatUpper) {
            return format;
        }

        this._longDateFormat[key] = formatUpper.replace(/MMMM|MM|DD|dddd/g, function (val) {
            return val.slice(1);
        });

        return this._longDateFormat[key];
    }

    var defaultInvalidDate = 'Invalid date';

    function invalidDate () {
        return this._invalidDate;
    }

    var defaultOrdinal = '%d';
    var defaultOrdinalParse = /\d{1,2}/;

    function ordinal (number) {
        return this._ordinal.replace('%d', number);
    }

    function preParsePostFormat (string) {
        return string;
    }

    var defaultRelativeTime = {
        future : 'in %s',
        past   : '%s ago',
        s  : 'a few seconds',
        m  : 'a minute',
        mm : '%d minutes',
        h  : 'an hour',
        hh : '%d hours',
        d  : 'a day',
        dd : '%d days',
        M  : 'a month',
        MM : '%d months',
        y  : 'a year',
        yy : '%d years'
    };

    function relative__relativeTime (number, withoutSuffix, string, isFuture) {
        var output = this._relativeTime[string];
        return (typeof output === 'function') ?
            output(number, withoutSuffix, string, isFuture) :
            output.replace(/%d/i, number);
    }

    function pastFuture (diff, output) {
        var format = this._relativeTime[diff > 0 ? 'future' : 'past'];
        return typeof format === 'function' ? format(output) : format.replace(/%s/i, output);
    }

    function locale_set__set (config) {
        var prop, i;
        for (i in config) {
            prop = config[i];
            if (typeof prop === 'function') {
                this[i] = prop;
            } else {
                this['_' + i] = prop;
            }
        }
        // Lenient ordinal parsing accepts just a number in addition to
        // number + (possibly) stuff coming from _ordinalParseLenient.
        this._ordinalParseLenient = new RegExp(this._ordinalParse.source + '|' + (/\d{1,2}/).source);
    }

    var prototype__proto = Locale.prototype;

    prototype__proto._calendar       = defaultCalendar;
    prototype__proto.calendar        = locale_calendar__calendar;
    prototype__proto._longDateFormat = defaultLongDateFormat;
    prototype__proto.longDateFormat  = longDateFormat;
    prototype__proto._invalidDate    = defaultInvalidDate;
    prototype__proto.invalidDate     = invalidDate;
    prototype__proto._ordinal        = defaultOrdinal;
    prototype__proto.ordinal         = ordinal;
    prototype__proto._ordinalParse   = defaultOrdinalParse;
    prototype__proto.preparse        = preParsePostFormat;
    prototype__proto.postformat      = preParsePostFormat;
    prototype__proto._relativeTime   = defaultRelativeTime;
    prototype__proto.relativeTime    = relative__relativeTime;
    prototype__proto.pastFuture      = pastFuture;
    prototype__proto.set             = locale_set__set;

    // Month
    prototype__proto.months       =        localeMonths;
    prototype__proto._months      = defaultLocaleMonths;
    prototype__proto.monthsShort  =        localeMonthsShort;
    prototype__proto._monthsShort = defaultLocaleMonthsShort;
    prototype__proto.monthsParse  =        localeMonthsParse;

    // Week
    prototype__proto.week = localeWeek;
    prototype__proto._week = defaultLocaleWeek;
    prototype__proto.firstDayOfYear = localeFirstDayOfYear;
    prototype__proto.firstDayOfWeek = localeFirstDayOfWeek;

    // Day of Week
    prototype__proto.weekdays       =        localeWeekdays;
    prototype__proto._weekdays      = defaultLocaleWeekdays;
    prototype__proto.weekdaysMin    =        localeWeekdaysMin;
    prototype__proto._weekdaysMin   = defaultLocaleWeekdaysMin;
    prototype__proto.weekdaysShort  =        localeWeekdaysShort;
    prototype__proto._weekdaysShort = defaultLocaleWeekdaysShort;
    prototype__proto.weekdaysParse  =        localeWeekdaysParse;

    // Hours
    prototype__proto.isPM = localeIsPM;
    prototype__proto._meridiemParse = defaultLocaleMeridiemParse;
    prototype__proto.meridiem = localeMeridiem;

    function lists__get (format, index, field, setter) {
        var locale = locale_locales__getLocale();
        var utc = create_utc__createUTC().set(setter, index);
        return locale[field](utc, format);
    }

    function list (format, index, field, count, setter) {
        if (typeof format === 'number') {
            index = format;
            format = undefined;
        }

        format = format || '';

        if (index != null) {
            return lists__get(format, index, field, setter);
        }

        var i;
        var out = [];
        for (i = 0; i < count; i++) {
            out[i] = lists__get(format, i, field, setter);
        }
        return out;
    }

    function lists__listMonths (format, index) {
        return list(format, index, 'months', 12, 'month');
    }

    function lists__listMonthsShort (format, index) {
        return list(format, index, 'monthsShort', 12, 'month');
    }

    function lists__listWeekdays (format, index) {
        return list(format, index, 'weekdays', 7, 'day');
    }

    function lists__listWeekdaysShort (format, index) {
        return list(format, index, 'weekdaysShort', 7, 'day');
    }

    function lists__listWeekdaysMin (format, index) {
        return list(format, index, 'weekdaysMin', 7, 'day');
    }

    locale_locales__getSetGlobalLocale('en', {
        ordinalParse: /\d{1,2}(th|st|nd|rd)/,
        ordinal : function (number) {
            var b = number % 10,
                output = (toInt(number % 100 / 10) === 1) ? 'th' :
                (b === 1) ? 'st' :
                (b === 2) ? 'nd' :
                (b === 3) ? 'rd' : 'th';
            return number + output;
        }
    });

    // Side effect imports
    utils_hooks__hooks.lang = deprecate('moment.lang is deprecated. Use moment.locale instead.', locale_locales__getSetGlobalLocale);
    utils_hooks__hooks.langData = deprecate('moment.langData is deprecated. Use moment.localeData instead.', locale_locales__getLocale);

    var mathAbs = Math.abs;

    function duration_abs__abs () {
        var data           = this._data;

        this._milliseconds = mathAbs(this._milliseconds);
        this._days         = mathAbs(this._days);
        this._months       = mathAbs(this._months);

        data.milliseconds  = mathAbs(data.milliseconds);
        data.seconds       = mathAbs(data.seconds);
        data.minutes       = mathAbs(data.minutes);
        data.hours         = mathAbs(data.hours);
        data.months        = mathAbs(data.months);
        data.years         = mathAbs(data.years);

        return this;
    }

    function duration_add_subtract__addSubtract (duration, input, value, direction) {
        var other = create__createDuration(input, value);

        duration._milliseconds += direction * other._milliseconds;
        duration._days         += direction * other._days;
        duration._months       += direction * other._months;

        return duration._bubble();
    }

    // supports only 2.0-style add(1, 's') or add(duration)
    function duration_add_subtract__add (input, value) {
        return duration_add_subtract__addSubtract(this, input, value, 1);
    }

    // supports only 2.0-style subtract(1, 's') or subtract(duration)
    function duration_add_subtract__subtract (input, value) {
        return duration_add_subtract__addSubtract(this, input, value, -1);
    }

    function absCeil (number) {
        if (number < 0) {
            return Math.floor(number);
        } else {
            return Math.ceil(number);
        }
    }

    function bubble () {
        var milliseconds = this._milliseconds;
        var days         = this._days;
        var months       = this._months;
        var data         = this._data;
        var seconds, minutes, hours, years, monthsFromDays;

        // if we have a mix of positive and negative values, bubble down first
        // check: https://github.com/moment/moment/issues/2166
        if (!((milliseconds >= 0 && days >= 0 && months >= 0) ||
                (milliseconds <= 0 && days <= 0 && months <= 0))) {
            milliseconds += absCeil(monthsToDays(months) + days) * 864e5;
            days = 0;
            months = 0;
        }

        // The following code bubbles up values, see the tests for
        // examples of what that means.
        data.milliseconds = milliseconds % 1000;

        seconds           = absFloor(milliseconds / 1000);
        data.seconds      = seconds % 60;

        minutes           = absFloor(seconds / 60);
        data.minutes      = minutes % 60;

        hours             = absFloor(minutes / 60);
        data.hours        = hours % 24;

        days += absFloor(hours / 24);

        // convert days to months
        monthsFromDays = absFloor(daysToMonths(days));
        months += monthsFromDays;
        days -= absCeil(monthsToDays(monthsFromDays));

        // 12 months -> 1 year
        years = absFloor(months / 12);
        months %= 12;

        data.days   = days;
        data.months = months;
        data.years  = years;

        return this;
    }

    function daysToMonths (days) {
        // 400 years have 146097 days (taking into account leap year rules)
        // 400 years have 12 months === 4800
        return days * 4800 / 146097;
    }

    function monthsToDays (months) {
        // the reverse of daysToMonths
        return months * 146097 / 4800;
    }

    function as (units) {
        var days;
        var months;
        var milliseconds = this._milliseconds;

        units = normalizeUnits(units);

        if (units === 'month' || units === 'year') {
            days   = this._days   + milliseconds / 864e5;
            months = this._months + daysToMonths(days);
            return units === 'month' ? months : months / 12;
        } else {
            // handle milliseconds separately because of floating point math errors (issue #1867)
            days = this._days + Math.round(monthsToDays(this._months));
            switch (units) {
                case 'week'   : return days / 7     + milliseconds / 6048e5;
                case 'day'    : return days         + milliseconds / 864e5;
                case 'hour'   : return days * 24    + milliseconds / 36e5;
                case 'minute' : return days * 1440  + milliseconds / 6e4;
                case 'second' : return days * 86400 + milliseconds / 1000;
                // Math.floor prevents floating point math errors here
                case 'millisecond': return Math.floor(days * 864e5) + milliseconds;
                default: throw new Error('Unknown unit ' + units);
            }
        }
    }

    // TODO: Use this.as('ms')?
    function duration_as__valueOf () {
        return (
            this._milliseconds +
            this._days * 864e5 +
            (this._months % 12) * 2592e6 +
            toInt(this._months / 12) * 31536e6
        );
    }

    function makeAs (alias) {
        return function () {
            return this.as(alias);
        };
    }

    var asMilliseconds = makeAs('ms');
    var asSeconds      = makeAs('s');
    var asMinutes      = makeAs('m');
    var asHours        = makeAs('h');
    var asDays         = makeAs('d');
    var asWeeks        = makeAs('w');
    var asMonths       = makeAs('M');
    var asYears        = makeAs('y');

    function duration_get__get (units) {
        units = normalizeUnits(units);
        return this[units + 's']();
    }

    function makeGetter(name) {
        return function () {
            return this._data[name];
        };
    }

    var milliseconds = makeGetter('milliseconds');
    var seconds      = makeGetter('seconds');
    var minutes      = makeGetter('minutes');
    var hours        = makeGetter('hours');
    var days         = makeGetter('days');
    var months       = makeGetter('months');
    var years        = makeGetter('years');

    function weeks () {
        return absFloor(this.days() / 7);
    }

    var round = Math.round;
    var thresholds = {
        s: 45,  // seconds to minute
        m: 45,  // minutes to hour
        h: 22,  // hours to day
        d: 26,  // days to month
        M: 11   // months to year
    };

    // helper function for moment.fn.from, moment.fn.fromNow, and moment.duration.fn.humanize
    function substituteTimeAgo(string, number, withoutSuffix, isFuture, locale) {
        return locale.relativeTime(number || 1, !!withoutSuffix, string, isFuture);
    }

    function duration_humanize__relativeTime (posNegDuration, withoutSuffix, locale) {
        var duration = create__createDuration(posNegDuration).abs();
        var seconds  = round(duration.as('s'));
        var minutes  = round(duration.as('m'));
        var hours    = round(duration.as('h'));
        var days     = round(duration.as('d'));
        var months   = round(duration.as('M'));
        var years    = round(duration.as('y'));

        var a = seconds < thresholds.s && ['s', seconds]  ||
                minutes === 1          && ['m']           ||
                minutes < thresholds.m && ['mm', minutes] ||
                hours   === 1          && ['h']           ||
                hours   < thresholds.h && ['hh', hours]   ||
                days    === 1          && ['d']           ||
                days    < thresholds.d && ['dd', days]    ||
                months  === 1          && ['M']           ||
                months  < thresholds.M && ['MM', months]  ||
                years   === 1          && ['y']           || ['yy', years];

        a[2] = withoutSuffix;
        a[3] = +posNegDuration > 0;
        a[4] = locale;
        return substituteTimeAgo.apply(null, a);
    }

    // This function allows you to set a threshold for relative time strings
    function duration_humanize__getSetRelativeTimeThreshold (threshold, limit) {
        if (thresholds[threshold] === undefined) {
            return false;
        }
        if (limit === undefined) {
            return thresholds[threshold];
        }
        thresholds[threshold] = limit;
        return true;
    }

    function humanize (withSuffix) {
        var locale = this.localeData();
        var output = duration_humanize__relativeTime(this, !withSuffix, locale);

        if (withSuffix) {
            output = locale.pastFuture(+this, output);
        }

        return locale.postformat(output);
    }

    var iso_string__abs = Math.abs;

    function iso_string__toISOString() {
        // for ISO strings we do not use the normal bubbling rules:
        //  * milliseconds bubble up until they become hours
        //  * days do not bubble at all
        //  * months bubble up until they become years
        // This is because there is no context-free conversion between hours and days
        // (think of clock changes)
        // and also not between days and months (28-31 days per month)
        var seconds = iso_string__abs(this._milliseconds) / 1000;
        var days         = iso_string__abs(this._days);
        var months       = iso_string__abs(this._months);
        var minutes, hours, years;

        // 3600 seconds -> 60 minutes -> 1 hour
        minutes           = absFloor(seconds / 60);
        hours             = absFloor(minutes / 60);
        seconds %= 60;
        minutes %= 60;

        // 12 months -> 1 year
        years  = absFloor(months / 12);
        months %= 12;


        // inspired by https://github.com/dordille/moment-isoduration/blob/master/moment.isoduration.js
        var Y = years;
        var M = months;
        var D = days;
        var h = hours;
        var m = minutes;
        var s = seconds;
        var total = this.asSeconds();

        if (!total) {
            // this is the same as C#'s (Noda) and python (isodate)...
            // but not other JS (goog.date)
            return 'P0D';
        }

        return (total < 0 ? '-' : '') +
            'P' +
            (Y ? Y + 'Y' : '') +
            (M ? M + 'M' : '') +
            (D ? D + 'D' : '') +
            ((h || m || s) ? 'T' : '') +
            (h ? h + 'H' : '') +
            (m ? m + 'M' : '') +
            (s ? s + 'S' : '');
    }

    var duration_prototype__proto = Duration.prototype;

    duration_prototype__proto.abs            = duration_abs__abs;
    duration_prototype__proto.add            = duration_add_subtract__add;
    duration_prototype__proto.subtract       = duration_add_subtract__subtract;
    duration_prototype__proto.as             = as;
    duration_prototype__proto.asMilliseconds = asMilliseconds;
    duration_prototype__proto.asSeconds      = asSeconds;
    duration_prototype__proto.asMinutes      = asMinutes;
    duration_prototype__proto.asHours        = asHours;
    duration_prototype__proto.asDays         = asDays;
    duration_prototype__proto.asWeeks        = asWeeks;
    duration_prototype__proto.asMonths       = asMonths;
    duration_prototype__proto.asYears        = asYears;
    duration_prototype__proto.valueOf        = duration_as__valueOf;
    duration_prototype__proto._bubble        = bubble;
    duration_prototype__proto.get            = duration_get__get;
    duration_prototype__proto.milliseconds   = milliseconds;
    duration_prototype__proto.seconds        = seconds;
    duration_prototype__proto.minutes        = minutes;
    duration_prototype__proto.hours          = hours;
    duration_prototype__proto.days           = days;
    duration_prototype__proto.weeks          = weeks;
    duration_prototype__proto.months         = months;
    duration_prototype__proto.years          = years;
    duration_prototype__proto.humanize       = humanize;
    duration_prototype__proto.toISOString    = iso_string__toISOString;
    duration_prototype__proto.toString       = iso_string__toISOString;
    duration_prototype__proto.toJSON         = iso_string__toISOString;
    duration_prototype__proto.locale         = locale;
    duration_prototype__proto.localeData     = localeData;

    // Deprecations
    duration_prototype__proto.toIsoString = deprecate('toIsoString() is deprecated. Please use toISOString() instead (notice the capitals)', iso_string__toISOString);
    duration_prototype__proto.lang = lang;

    // Side effect imports

    addFormatToken('X', 0, 0, 'unix');
    addFormatToken('x', 0, 0, 'valueOf');

    // PARSING

    addRegexToken('x', matchSigned);
    addRegexToken('X', matchTimestamp);
    addParseToken('X', function (input, array, config) {
        config._d = new Date(parseFloat(input, 10) * 1000);
    });
    addParseToken('x', function (input, array, config) {
        config._d = new Date(toInt(input));
    });

    // Side effect imports


    utils_hooks__hooks.version = '2.10.6';

    setHookCallback(local__createLocal);

    utils_hooks__hooks.fn                    = momentPrototype;
    utils_hooks__hooks.min                   = min;
    utils_hooks__hooks.max                   = max;
    utils_hooks__hooks.utc                   = create_utc__createUTC;
    utils_hooks__hooks.unix                  = moment__createUnix;
    utils_hooks__hooks.months                = lists__listMonths;
    utils_hooks__hooks.isDate                = isDate;
    utils_hooks__hooks.locale                = locale_locales__getSetGlobalLocale;
    utils_hooks__hooks.invalid               = valid__createInvalid;
    utils_hooks__hooks.duration              = create__createDuration;
    utils_hooks__hooks.isMoment              = isMoment;
    utils_hooks__hooks.weekdays              = lists__listWeekdays;
    utils_hooks__hooks.parseZone             = moment__createInZone;
    utils_hooks__hooks.localeData            = locale_locales__getLocale;
    utils_hooks__hooks.isDuration            = isDuration;
    utils_hooks__hooks.monthsShort           = lists__listMonthsShort;
    utils_hooks__hooks.weekdaysMin           = lists__listWeekdaysMin;
    utils_hooks__hooks.defineLocale          = defineLocale;
    utils_hooks__hooks.weekdaysShort         = lists__listWeekdaysShort;
    utils_hooks__hooks.normalizeUnits        = normalizeUnits;
    utils_hooks__hooks.relativeTimeThreshold = duration_humanize__getSetRelativeTimeThreshold;

    var _moment = utils_hooks__hooks;

    return _moment;

}));
},{}],5:[function(require,module,exports){
var iota = require("iota-array")
var isBuffer = require("is-buffer")

var hasTypedArrays  = ((typeof Float64Array) !== "undefined")

function compare1st(a, b) {
  return a[0] - b[0]
}

function order() {
  var stride = this.stride
  var terms = new Array(stride.length)
  var i
  for(i=0; i<terms.length; ++i) {
    terms[i] = [Math.abs(stride[i]), i]
  }
  terms.sort(compare1st)
  var result = new Array(terms.length)
  for(i=0; i<result.length; ++i) {
    result[i] = terms[i][1]
  }
  return result
}

function compileConstructor(dtype, dimension) {
  var className = ["View", dimension, "d", dtype].join("")
  if(dimension < 0) {
    className = "View_Nil" + dtype
  }
  var useGetters = (dtype === "generic")

  if(dimension === -1) {
    //Special case for trivial arrays
    var code =
      "function "+className+"(a){this.data=a;};\
var proto="+className+".prototype;\
proto.dtype='"+dtype+"';\
proto.index=function(){return -1};\
proto.size=0;\
proto.dimension=-1;\
proto.shape=proto.stride=proto.order=[];\
proto.lo=proto.hi=proto.transpose=proto.step=\
function(){return new "+className+"(this.data);};\
proto.get=proto.set=function(){};\
proto.pick=function(){return null};\
return function construct_"+className+"(a){return new "+className+"(a);}"
    var procedure = new Function(code)
    return procedure()
  } else if(dimension === 0) {
    //Special case for 0d arrays
    var code =
      "function "+className+"(a,d) {\
this.data = a;\
this.offset = d\
};\
var proto="+className+".prototype;\
proto.dtype='"+dtype+"';\
proto.index=function(){return this.offset};\
proto.dimension=0;\
proto.size=1;\
proto.shape=\
proto.stride=\
proto.order=[];\
proto.lo=\
proto.hi=\
proto.transpose=\
proto.step=function "+className+"_copy() {\
return new "+className+"(this.data,this.offset)\
};\
proto.pick=function "+className+"_pick(){\
return TrivialArray(this.data);\
};\
proto.valueOf=proto.get=function "+className+"_get(){\
return "+(useGetters ? "this.data.get(this.offset)" : "this.data[this.offset]")+
"};\
proto.set=function "+className+"_set(v){\
return "+(useGetters ? "this.data.set(this.offset,v)" : "this.data[this.offset]=v")+"\
};\
return function construct_"+className+"(a,b,c,d){return new "+className+"(a,d)}"
    var procedure = new Function("TrivialArray", code)
    return procedure(CACHED_CONSTRUCTORS[dtype][0])
  }

  var code = ["'use strict'"]

  //Create constructor for view
  var indices = iota(dimension)
  var args = indices.map(function(i) { return "i"+i })
  var index_str = "this.offset+" + indices.map(function(i) {
        return "this.stride[" + i + "]*i" + i
      }).join("+")
  var shapeArg = indices.map(function(i) {
      return "b"+i
    }).join(",")
  var strideArg = indices.map(function(i) {
      return "c"+i
    }).join(",")
  code.push(
    "function "+className+"(a," + shapeArg + "," + strideArg + ",d){this.data=a",
      "this.shape=[" + shapeArg + "]",
      "this.stride=[" + strideArg + "]",
      "this.offset=d|0}",
    "var proto="+className+".prototype",
    "proto.dtype='"+dtype+"'",
    "proto.dimension="+dimension)

  //view.size:
  code.push("Object.defineProperty(proto,'size',{get:function "+className+"_size(){\
return "+indices.map(function(i) { return "this.shape["+i+"]" }).join("*"),
"}})")

  //view.order:
  if(dimension === 1) {
    code.push("proto.order=[0]")
  } else {
    code.push("Object.defineProperty(proto,'order',{get:")
    if(dimension < 4) {
      code.push("function "+className+"_order(){")
      if(dimension === 2) {
        code.push("return (Math.abs(this.stride[0])>Math.abs(this.stride[1]))?[1,0]:[0,1]}})")
      } else if(dimension === 3) {
        code.push(
"var s0=Math.abs(this.stride[0]),s1=Math.abs(this.stride[1]),s2=Math.abs(this.stride[2]);\
if(s0>s1){\
if(s1>s2){\
return [2,1,0];\
}else if(s0>s2){\
return [1,2,0];\
}else{\
return [1,0,2];\
}\
}else if(s0>s2){\
return [2,0,1];\
}else if(s2>s1){\
return [0,1,2];\
}else{\
return [0,2,1];\
}}})")
      }
    } else {
      code.push("ORDER})")
    }
  }

  //view.set(i0, ..., v):
  code.push(
"proto.set=function "+className+"_set("+args.join(",")+",v){")
  if(useGetters) {
    code.push("return this.data.set("+index_str+",v)}")
  } else {
    code.push("return this.data["+index_str+"]=v}")
  }

  //view.get(i0, ...):
  code.push("proto.get=function "+className+"_get("+args.join(",")+"){")
  if(useGetters) {
    code.push("return this.data.get("+index_str+")}")
  } else {
    code.push("return this.data["+index_str+"]}")
  }

  //view.index:
  code.push(
    "proto.index=function "+className+"_index(", args.join(), "){return "+index_str+"}")

  //view.hi():
  code.push("proto.hi=function "+className+"_hi("+args.join(",")+"){return new "+className+"(this.data,"+
    indices.map(function(i) {
      return ["(typeof i",i,"!=='number'||i",i,"<0)?this.shape[", i, "]:i", i,"|0"].join("")
    }).join(",")+","+
    indices.map(function(i) {
      return "this.stride["+i + "]"
    }).join(",")+",this.offset)}")

  //view.lo():
  var a_vars = indices.map(function(i) { return "a"+i+"=this.shape["+i+"]" })
  var c_vars = indices.map(function(i) { return "c"+i+"=this.stride["+i+"]" })
  code.push("proto.lo=function "+className+"_lo("+args.join(",")+"){var b=this.offset,d=0,"+a_vars.join(",")+","+c_vars.join(","))
  for(var i=0; i<dimension; ++i) {
    code.push(
"if(typeof i"+i+"==='number'&&i"+i+">=0){\
d=i"+i+"|0;\
b+=c"+i+"*d;\
a"+i+"-=d}")
  }
  code.push("return new "+className+"(this.data,"+
    indices.map(function(i) {
      return "a"+i
    }).join(",")+","+
    indices.map(function(i) {
      return "c"+i
    }).join(",")+",b)}")

  //view.step():
  code.push("proto.step=function "+className+"_step("+args.join(",")+"){var "+
    indices.map(function(i) {
      return "a"+i+"=this.shape["+i+"]"
    }).join(",")+","+
    indices.map(function(i) {
      return "b"+i+"=this.stride["+i+"]"
    }).join(",")+",c=this.offset,d=0,ceil=Math.ceil")
  for(var i=0; i<dimension; ++i) {
    code.push(
"if(typeof i"+i+"==='number'){\
d=i"+i+"|0;\
if(d<0){\
c+=b"+i+"*(a"+i+"-1);\
a"+i+"=ceil(-a"+i+"/d)\
}else{\
a"+i+"=ceil(a"+i+"/d)\
}\
b"+i+"*=d\
}")
  }
  code.push("return new "+className+"(this.data,"+
    indices.map(function(i) {
      return "a" + i
    }).join(",")+","+
    indices.map(function(i) {
      return "b" + i
    }).join(",")+",c)}")

  //view.transpose():
  var tShape = new Array(dimension)
  var tStride = new Array(dimension)
  for(var i=0; i<dimension; ++i) {
    tShape[i] = "a[i"+i+"]"
    tStride[i] = "b[i"+i+"]"
  }
  code.push("proto.transpose=function "+className+"_transpose("+args+"){"+
    args.map(function(n,idx) { return n + "=(" + n + "===undefined?" + idx + ":" + n + "|0)"}).join(";"),
    "var a=this.shape,b=this.stride;return new "+className+"(this.data,"+tShape.join(",")+","+tStride.join(",")+",this.offset)}")

  //view.pick():
  code.push("proto.pick=function "+className+"_pick("+args+"){var a=[],b=[],c=this.offset")
  for(var i=0; i<dimension; ++i) {
    code.push("if(typeof i"+i+"==='number'&&i"+i+">=0){c=(c+this.stride["+i+"]*i"+i+")|0}else{a.push(this.shape["+i+"]);b.push(this.stride["+i+"])}")
  }
  code.push("var ctor=CTOR_LIST[a.length+1];return ctor(this.data,a,b,c)}")

  //Add return statement
  code.push("return function construct_"+className+"(data,shape,stride,offset){return new "+className+"(data,"+
    indices.map(function(i) {
      return "shape["+i+"]"
    }).join(",")+","+
    indices.map(function(i) {
      return "stride["+i+"]"
    }).join(",")+",offset)}")

  //Compile procedure
  var procedure = new Function("CTOR_LIST", "ORDER", code.join("\n"))
  return procedure(CACHED_CONSTRUCTORS[dtype], order)
}

function arrayDType(data) {
  if(isBuffer(data)) {
    return "buffer"
  }
  if(hasTypedArrays) {
    switch(Object.prototype.toString.call(data)) {
      case "[object Float64Array]":
        return "float64"
      case "[object Float32Array]":
        return "float32"
      case "[object Int8Array]":
        return "int8"
      case "[object Int16Array]":
        return "int16"
      case "[object Int32Array]":
        return "int32"
      case "[object Uint8Array]":
        return "uint8"
      case "[object Uint16Array]":
        return "uint16"
      case "[object Uint32Array]":
        return "uint32"
      case "[object Uint8ClampedArray]":
        return "uint8_clamped"
    }
  }
  if(Array.isArray(data)) {
    return "array"
  }
  return "generic"
}

var CACHED_CONSTRUCTORS = {
  "float32":[],
  "float64":[],
  "int8":[],
  "int16":[],
  "int32":[],
  "uint8":[],
  "uint16":[],
  "uint32":[],
  "array":[],
  "uint8_clamped":[],
  "buffer":[],
  "generic":[]
}

;(function() {
  for(var id in CACHED_CONSTRUCTORS) {
    CACHED_CONSTRUCTORS[id].push(compileConstructor(id, -1))
  }
});

function wrappedNDArrayCtor(data, shape, stride, offset) {
  if(data === undefined) {
    var ctor = CACHED_CONSTRUCTORS.array[0]
    return ctor([])
  } else if(typeof data === "number") {
    data = [data]
  }
  if(shape === undefined) {
    shape = [ data.length ]
  }
  var d = shape.length
  if(stride === undefined) {
    stride = new Array(d)
    for(var i=d-1, sz=1; i>=0; --i) {
      stride[i] = sz
      sz *= shape[i]
    }
  }
  if(offset === undefined) {
    offset = 0
    for(var i=0; i<d; ++i) {
      if(stride[i] < 0) {
        offset -= (shape[i]-1)*stride[i]
      }
    }
  }
  var dtype = arrayDType(data)
  var ctor_list = CACHED_CONSTRUCTORS[dtype]
  while(ctor_list.length <= d+1) {
    ctor_list.push(compileConstructor(dtype, ctor_list.length-1))
  }
  var ctor = ctor_list[d+1]
  return ctor(data, shape, stride, offset)
}

module.exports = wrappedNDArrayCtor

},{"iota-array":6,"is-buffer":7}],6:[function(require,module,exports){
"use strict"

function iota(n) {
  var result = new Array(n)
  for(var i=0; i<n; ++i) {
    result[i] = i
  }
  return result
}

module.exports = iota
},{}],7:[function(require,module,exports){
/**
 * Determine if an object is Buffer
 *
 * Author:   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * License:  MIT
 *
 * `npm install is-buffer`
 */

module.exports = function (obj) {
  return !!(obj != null &&
    (obj._isBuffer || // For Safari 5-7 (missing Object.prototype.constructor)
      (obj.constructor &&
      typeof obj.constructor.isBuffer === 'function' &&
      obj.constructor.isBuffer(obj))
    ))
}

},{}],8:[function(require,module,exports){
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

},{"performance-now":9}],9:[function(require,module,exports){
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
},{"_process":3}],10:[function(require,module,exports){
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
},{}],11:[function(require,module,exports){
// globals.js

window.CONFIG = {
	speed : {
		pathing: 2.5,
		animation: 30,
		bubblepop: 9.5,
	},
	timeout : {
		walkControl : 0.1,
	}
};

window.DEBUG = {};

//On Ready
$(function(){
	
});

window.SoundManager = require("./managers/soundmanager");
window.MapManager = require("./managers/mapmanager");
window.ActorScheduler = require("./managers/actorscheduler");
window.GC = require("./managers/garbage-collector");
window.UI = require("./managers/ui-manager");
// window.Chat = require("./chat/core.js");

window.currentMap = null;
window.gameState = require("./gamestate");

},{"./gamestate":10,"./managers/actorscheduler":12,"./managers/garbage-collector":13,"./managers/mapmanager":14,"./managers/soundmanager":15,"./managers/ui-manager":16}],12:[function(require,module,exports){
// actorscheduler.js
// Defines the Actor Scheduler

var inherits = require("inherits");
var extend = require("extend");

function ActorScheduler() {
	
}
extend(ActorScheduler.prototype, {
	actormap : {},
	__forceDate: null,
	
	getTimestamp: function(){
		var date = this.__forceDate || new Date();
		return (date.getHours() * 100) + (date.getHours());
	},
	
	/** Creates a schedule for an actor given a list of locations.
	 * A Schedule is a list of times to locations showing when a given actor
	 * is in a map for this day. Passed is a list of locations that the actor
	 * might visit in a normal day. Not passed are places that the actor will 
	 * always be at a given time (unless the actor randomly shows up there normally).
	 * This function creates a randomized schedule, with randomized amounts of
	 * time spent at any given place.
	 */
	createSchedule: function(me, scheduleDef) {
		//Grab memoized schedule
		var schedule = this.actormap[me.id];
		if (!schedule) { //If no such thing, or expired
			schedule = {};
			for (var timeRange in scheduleDef) {
				var location = scheduleDef[timeRange];
				timeRange = Number(timeRange);
				
				//Process
				if (typeof location == "string") {
					schedule[timeRange] = location;
				} 
				else if ($.isArray(location)) {
					var i = Math.floor(Math.random() * location.length);
					schedule[timeRange] = location[i];
				} 
				else if (location === null) {
					schedule[timeRange] = null;
				}
			}
			
			// Spread the schedule even
			var id = null;
			for (var i = 0; i < 2400; i++) {
				if (i % 100 > 59) { i += 100 - (i%100); } //skip 60-99 minutes
				if (schedule[i] !== undefined) {
					id = schedule[i];
				}
				schedule[i] = id;
			}
			
			this.actormap[me.id] = schedule;
		}
		return schedule;
	},
});
module.exports = new ActorScheduler();

},{"extend":"extend","inherits":"inherits"}],13:[function(require,module,exports){
// garbage-collector.js
// Allocates all the various disposable items, such as geometry and listeners, for
// later disposal.

var REVOKE_URLS = !!URL.revokeObjectURL;


function GarbageCollector() {
	this.bins = {};
	this.allocateBin("_default");
}

GarbageCollector.prototype.allocateBin = function(binId) {
	var bin = this.bins[binId] = new GarbageBin();
}

GarbageCollector.prototype.collect = function(obj, binId){
	if (!binId) binId = "_default";
	var bin = this.bins[binId];
	if (!bin) {
		console.warn("[GC] Bin does not exist! Putting object in default bin. BinID:", binID);
		bin = this.bins["_default"];
	}
	bin.collect(obj);
}

GarbageCollector.prototype.collectURL = function(obj, binId){
	if (!binId) binId = "_default";
	var bin = this.bins[binId];
	if (!bin) {
		console.warn("[GC] Bin does not exist! Putting object in default bin. BinID:", binID);
		bin = this.bins["_default"];
	}
	bin.collectURL(obj);
}

GarbageCollector.prototype.getBin = function(binId) {
	if (!binId) binId = "_default";
	var bin = this.bins[binId];
	if (!bin) {
		console.warn("[GC] Bin does not exist! Getting default bin. BinID:", binID);
		bin = this.bins["_default"];
	}
	return bin;
}

GarbageCollector.prototype.dispose = function(binId) {
	if (!binId) binId = "_default";
	var bin = this.bins[binId];
	if (!bin) {
		console.warn("[GC] Bin does not exist! Cannot dispose! BinID:", binID);
		return;
	}
	
	bin.dispose();
	
	bin = null;
	delete this.bins[binId];
}



function GarbageBin() {
	this.disposal = []; //Objects that can have "dispose" called on them
	this.listeners = []; //Objects with listeners attached to them
	this.tags = []; //Script tags and other disposable tags
	this.specificListeners = []; //Specific listeners
	
	this.bloburls = []; //Object URLs that can be revoked with URL.revokeObjectURL
}
GarbageBin.prototype = {
	collect: function(obj) {
		if (obj.dispose) {
			this.disposal.push(obj);
		}
		if (obj.removeAllListeners) {
			this.listeners.push(obj);
		}
		if ((obj instanceof $) || obj.nodeName) {
			this.tags.push(obj);
		}
	},
	
	collectURL: function(url) {
		if (!REVOKE_URLS) return;
		if (typeof url != "string") return;
		this.bloburls.push(url);
	},
	
	collectListener: function(obj, evt, listener) {
		this.specificListeners.push({
			obj: obj,   evt: evt,   l: listener
		});
	},
	
	dispose: function() {
		for (var i = 0; i < this.disposal.length; i++) {
			this.disposal[i].dispose();
			this.disposal[i] = null;
		}
		this.disposal = null;
		
		for (var i = 0; i < this.listeners.length; i++) {
			this.listeners[i].removeAllListeners();
			this.listeners[i] = null;
		}
		this.listeners = null;
		
		for (var i = 0; i < this.tags.length; i++) {
			$(this.tags[i]).removeAttr("src").remove();
			this.tags[i] = null;
		}
		this.tags = null;
		
		for (var i = 0; i < this.specificListeners.length; i++) {
			var o = this.specificListeners[i];
			o.obj.removeListener(o.evt, o.l);
			this.specificListeners[i] = null;
			o = null;
		}
		this.specificListeners = null;
		
		
		for (var i = 0; i < this.bloburls.length; i++) {
			URL.revokeObjectURL(this.bloburls[i]);
			this.bloburls[i] = null;
		}
		this.bloburls = null;
	},
};



module.exports = new GarbageCollector();
},{}],14:[function(require,module,exports){
// mapmanager.js
//

var inherits = require("inherits");
var extend = require("extend");
var EventEmitter = require("events").EventEmitter;
var controller = require("tpp-controller");

var Map = require("../map.js");
var DoritoDungeon = require("../model/dungeon-map.js");

function MapManager() {
	
}
inherits(MapManager, EventEmitter);
extend(MapManager.prototype, {
	in_transition: null,
	nextMap: null,
	loadError: null,
	
	transitionTo : function(mapid, warpindex, animOverride) {
		var self = this;
		if (this.in_transition) {
			console.error("Called Map Transition while already in a map transition!", mapid, warpindex);
			return;
		}
		this.in_transition = true;

		controller.pushInputContext("_map_warping_");
		if (mapid !== undefined || warpindex !== undefined) {
			gameState.mapTransition.nextMap = mapid = mapid || currentMap.id;
			gameState.mapTransition.warp = warpindex || 0;
			gameState.mapTransition.animOverride = animOverride;
		} else {
			mapid = gameState.mapTransition.nextMap;
		}
		
		console.warn("Beginning Transition to", mapid);
		var loadCall = __beginLoad;
		var fadeOutDone = false;
		var finishedDownload = false;
		
		if (currentMap && currentMap.id == mapid) {
			// No need to download the next map
			loadCall = __inMapWarp;
			finishedDownload = true;
		} else {
			var nmap = this.nextMap = new Map(mapid);
			nmap.on("load-error", __loadError);
			nmap.on("progress", __progressUpdate);
			nmap.once("downloaded", __finishedDownload);
			nmap.once("map-started", __mapStart);
			
			nmap.download();
		}
		
		UI.fadeOut(function(){
			UI.showLoadingAjax();
			fadeOutDone = true;
			if (finishedDownload && fadeOutDone) {
				loadCall();
			}
		});
		
		return;
		///////////////////////////////////////////////////
		
		function __inMapWarp() {
			console.log("In-map warp!");
			var warp = gameState.mapTransition.warp || 0;
			warp = currentMap.metadata.warps[warp];
			if (!warp) {
				console.warn("Requested warp location doesn't exist:", window.transition_warpto);
				warp = this.metadata.warps[0];
			}
			if (!warp) throw new Error("This map has no warps!!");
			
			player.warpTo(warp);
			currentMap.eventMap.put(player.location.x, player.location.y, player);
			
			__mapStart();
		}
		
		///////////////////////////////////////////////////
		
		function __loadError(e) {
			self.nextMap.removeListener("load-error", __loadError);
			self.nextMap.removeListener("progress", __progressUpdate);
			self.nextMap.removeListener("downloaded", __finishedDownload);
			self.nextMap.removeListener("map-started", __mapStart);
			
			self.nextMap = new DoritoDungeon();
			self.nextMap.on("load-error", __loadError);
			self.nextMap.once("map-started", __mapStart);
			
			finishedDownload = true;
			if (finishedDownload && fadeOutDone) {
				__beginLoad();
			}
		}
		function __progressUpdate(loaded, total) {
			UI.updateLoadingProgress(loaded, total);
		}
		function __finishedDownload() {
			finishedDownload = true;
			if (finishedDownload && fadeOutDone) {
				__beginLoad();
			}
		}
		function __beginLoad() {
			if (currentMap) currentMap.dispose();
			console.log("============BEGIN LOAD==============");
			
			self.nextMap.removeListener("progress", __progressUpdate);
			self.nextMap.removeListener("downloaded", __finishedDownload);
			
			currentMap = self.nextMap; self.nextMap = null;
			
			if (DEBUG && DEBUG.runOnMapReady)
				currentMap.once("map-ready", DEBUG.runOnMapReady);
			
			currentMap.load();
		}
		function __mapStart() {
			currentMap.removeListener("load-error", __loadError);
			
			UI.hideLoadingAjax();
			UI.fadeIn();
			controller.removeInputContext("_map_warping_");
			self.in_transition = false;
		}
	},
});

module.exports = new MapManager();
},{"../map.js":17,"../model/dungeon-map.js":18,"events":2,"extend":"extend","inherits":"inherits","tpp-controller":"tpp-controller"}],15:[function(require,module,exports){
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

},{"events":2,"extend":"extend","inherits":"inherits"}],16:[function(require,module,exports){
// ui-manager.js
// Defines the UI module, which controls the user interface.

var inherits = require("inherits");
var extend = require("extend");
var EventEmitter = require("events").EventEmitter;
var controller = require("tpp-controller");

var BubbleSprite = require("tpp-spritemodel").BubbleSprite;

var M_WIDTH = 0, M_HEIGHT = 1, M_HIDE = 2, M_TRIANGLE = 3, M_TAILX = 4, M_TAILY = 5;

/**
 *
 */
function UIManager() {
	this.dialogs = {
		"text" : new DialogBox("textbox_gold"),
		"dialog" : new DialogBox("dialog_bubble"),
	};
	this.skrim = new Skrim();
	this.loader = new AjaxLoader();
	
	this.bubblePool = [];
	this.allBubbles = [];
	
	var self = this;
	$(function(){
		self._initUIScene();
		
		$("#preloadScreen").fadeOut(800, function(){
			$(this).remove();
		});
		
		for (var type in self.dialogs) {
			self.dialogs[type].element = $("<div>")
				.addClass("dialogbox").addClass(type)
				.appendTo("#canvas-ui");
		}
	});
}
inherits(UIManager, EventEmitter);
extend(UIManager.prototype, {
	loader: null,
	skrim : null,
	dialogs : null,
	
	bubblePool: null,
	allBubbles: null,
	
	/////////////////////// UI Actions ///////////////////////////
	
	/** Show a standard textbox on screen. */
	showTextBox : function(type, html, opts) {
		if ($.isPlainObject(html) && opts === undefined) {
			opts = html; html = undefined;
		}
		opts = extend(opts, {
			html: html,
		});
		
		var d = this.dialogs[type];
		if (!d) {
			d = this.dialogs["text"];
			console.error("Invalid dialog type: "+type);
		}
		
		d.show(opts);
	},
	
	/** Immedeately hides the text box and clears any text that was in it. */
	closeTextBox : function(type) {
		var d = this.dialogs[type];
		if (!d) throw new Error("Invalid dialog type: "+type);
		
		d.hide();
	},
	
	/** Shows a selectable menu in the top-right corner of the screen. */
	showMenu : function() {
		
	},
	
	/** Immedately closes the menu and clears it for further use. */
	closeMenu : function() {
		
	},
	
	/** 
	 * Shows a Yes/No menu just above the text box. If text is currently printing out on a, 
	 * dialog box or text box on screen, this will automatically wait for the text to finish
	 * printing before showing it. The Yes and No functions will fire off one when is selected.
	 * The functions will presumably push more actions into the action queue.
	 */
	showConfirmPrompt : function(yesfn, nofn) {
		
	},
	
	
	getEmoteBubble : function() {
		var self = this;
		var emote = this.bubblePool.unshift();
		if (!emote) {
			emote = new BubbleSprite();
			emote.release = function(){
				self.parent.remove(self);
				self.bubblePool.push(emote);
			};
			this.allBubbles.push(emote);
		}
		// emote.setType(type);
		return emote;
	},
	
	
	/** Fade the screen to white for a transition of some sort. */
	fadeToWhite : function(speed, callback) {
		if (typeof speed == "function") {
			callback = speed; speed = undefined;
		}
		if (!speed) speed = 1; //1 second
		
		this.skrim.fadeTo({
			color: 0xFFFFFF,
			opacity: 1,
			speed: speed,
		}, callback);
		// this.skrim.fadeIn(speed);
	},
	
	/** Fade the screen to black for a transition of some sort. */
	fadeToBlack : function(speed, callback) {
		if (typeof speed == "function") {
			callback = speed; speed = undefined;
		}
		if (!speed) speed = 1; //1 second
		
		this.skrim.fadeTo({
			color: 0x000000,
			opacity: 1,
			speed: speed,
		}, callback);
		// this.skrim.fadeIn(speed);
	},
	
	/** Fade the screen out for a transition of some sort. */
	fadeOut : function(speed, callback) {
		if (typeof speed == "function") {
			callback = speed; speed = undefined;
		}
		if (!speed) speed = 1; //1 second
		
		this.skrim.fadeTo({
			opacity: 1,
			speed: speed,
		}, callback);
		// this.skrim.fadeIn(speed);
	},
	
	/** Fade the screen in from a transition. */
	fadeIn : function(speed, callback) {
		if (typeof speed == "function") {
			callback = speed; speed = undefined;
		}
		if (!speed) speed = 1; //1 second
		
		this.skrim.fadeTo({
			opacity: 0,
			speed: speed,
		}, callback);
		// this.skrim.fadeOut(speed);
	},
	
	/** Displays the loading icon over the main game screen. Optionally supply text. */
	showLoadingAjax : function(loadingText) {
		if (!loadingText) loadingText = "Loading...";
		this.loader.show();
	},
	
	hideLoadingAjax : function() {
		this.loader.hide();
	},
	
	updateLoadingProgress: function(progress, total) {
		if (progress !== undefined) this.loader.progress = progress;
		if (total !== undefined) this.loader.progress_total = total;
	},
	
	
	////////////////////// Action Queues /////////////////////////
	currAction : null,
	actionQueue : [],
	
	/** Pass this a set of functions to be run one after the other when the user confirms 
	 *  an action. */
	queueActions: function() {
		for (var i = 0; i < arguments.length; i++) {
			var arg = arguments[i];
			if ($.isArray(arg)) {
				for (var j = 0; j < arg.length; j++) {
					if (!$.isFunction(arg[j])) 
						throw new Error("UI Actions must be functions to be run!");
					this.actionQueue.push(arg[j]);
				}
			} else if ($.isFunction(arg[j])) {
				this.actionQueue.push(arg[j]);
			} else {
				throw new Error("UI Actions must be functions to be run!");
			}
		}
	},
	
	/** Clears all queued actions from the ui action queue. Use this sparingly. This will 
	 *  NOT terminate any currently running actions or clear any text boxes. */
	clearActionQueue : function() {
		
	},
	
	////////////////////// UI Three.js Scene //////////////////////
	scene : null,
	camera : null,
	
	_initUIScene : function() {
		
		this.scene = new THREE.Scene();
		
		var sw = $("#gamescreen").width();
		var sh = $("#gamescreen").height();
		
		var camera = this.camera = new THREE.OrthographicCamera(0, sw, sh, 0, 1, 101);
		camera.position.set(0, 0, 51);
		this.scene.add(camera);
		
		for (var dlog in this.dialogs) {
			// console.log("createModel: ", dlog, this.dialogs[dlog]); 
			var model = this.dialogs[dlog].createModel();
			this.scene.add(model);
		}
		{
			var model = this.skrim.createModel();
			this.scene.add(model);
		}{
			var model = this.loader.createModel();
			this.scene.add(model);
		}
		
		// createDEBUGSetup.call(this);
	},
	
	//////////////////////////////////////////////////////////////////
	
	logicLoop : function(delta) {
		if (this.currAction) {
			
		} else if (this.actionQueue.length) {
			this.currAction = this.actionQueue.shift();
			controller.pushInputContext("uiaction");
			this.currAction();
			
			//If the action completed this turn, and didn't push its own context
			if (controller.popInputContext("uiaction") == "uiaction") {
				//Clear the current action
				this.currAction = null;
			}
		} 
		
		for (var dlog in this.dialogs) {
			if (this.dialogs[dlog].advance) {
				if (controller.isDownOnce("Interact", "dlogPrinting")) {
					this.dialogs[dlog].complete();
				} else if (controller.isDownOnce("Interact", "dlogWaiting")) {
					this.dialogs[dlog]._displayNext();
				} else {
					this.dialogs[dlog].advance(delta);
				}
			}
		}
		
		this.skrim.advance(delta);
		this.loader.advance(delta);
		
		for (var i = 0; i < this.allBubbles.length; i++) {
			if (this.allBubbles[i].visible) {
				this.allBubbles[i]._tick(delta);
			}
		}
	},
	
	_completeCurrAction : function() {
		if (this.actionQueue.length) {
			this.currAction = this.actionQueue.shift();
			this.currAction();
		} else {
			controller.popInputContext("uiaction");
		}
	},
	
});

//////////////////////////////////////////////////////////////////////
// Sidebar DOM

UIManager.prototype.showChatTab = function(){
	if ($("#tab-chat").hasClass("selected")) return;
	
	$("#right-sidebar .tab").removeClass("selected");
	$("#tab-chat").addClass("selected");
	
	$("#right-sidebar .tabcontainer").hide();
	$("#chat-container").show();
};

UIManager.prototype.showInfodexTab = function(){
	if ($("#tab-dex").hasClass("selected")) return;
	
	$("#right-sidebar .tab").removeClass("selected");
	$("#tab-dex").addClass("selected");
	
	$("#right-sidebar .tabcontainer").hide();
	$("#dex-container").show();
};

UIManager.prototype.openInfodexPage = function(pageid) {
	
};

$(function(){ // On Ready Setup
	$("#tab-chat").click(UIManager.prototype.showChatTab);
	$("#tab-dex").click(UIManager.prototype.showInfodexTab);
	
	UIManager.prototype.showChatTab();
});

//////////////////////////////////////////////////////////////////////

function DialogBox(type) {
	this.type = type;
}
extend(DialogBox.prototype, {
	model : null,
	element : null,
	owner : null,	
	html : [],
	autoClose: true,
	
	advance : null,
	complete: function(){},
	_completionCallback : null, //callback from the event starting this dialog.
	
	show : function(opts) {
		// if (!opts.html) {
		// 	throw new Error("No HTML given to the dialogbox's show() method!");
		// }
		
		opts = extend({
			owner: null,
			isLast : false,
			autoClose: true,
		}, opts);
		
		this.owner = opts.owner;
		this.autoClose = opts.autoClose;
		
		this._completionCallback = opts.complete;
		
		if (typeof opts.html == "string") {
			this.html = [opts.html];
		} else if ($.isArray(opts.html)) {
			this.html = opts.html.slice();
		} else {
			console.error("Dialog given is of the wrong type! ", opts.html);
			this.html = ["[ERROR: This dialog text could not be loaded properly!]"];
		}
		
		this._display();
	},
	
	hide : function() {
		this.model.visible = false;
		this.element.hide().css({ width:"", height:"", bottom:"", left:"", top:"", right:"" });
		this.html = [];
		this.advance = null;
		
		if (this._completionCallback)
			this._completionCallback.call(null);
	},
	
	_display: function() {
		// opts = extend(opts, {
		// 	anchorY: "bottom",
		// 	anchorX: "left",
		// });
		
		// Step 1: size out the textbox space
		var e = this.element;
		e.css({ width:"", height:"", bottom:"", left:"", top:"", right:"" }); //reset
		
		e.css({ "visibility": "hidden" }).show(); //Note: $.show() does not affect "visibility"
		var width = 0, height = 0;
		// var w, h;
		
		//For each dialog in the text to display, size out the box to fit the largest one
		for (var i = 0; i < this.html.length; i++) {
			var f = this.html[i];
			if (typeof f != "string") continue;
			e.html(f);
			width = Math.max(e.innerWidth(), width);
			height = Math.max(e.innerHeight(), height);
		}
		
		var difx = e.innerWidth() - e.width();
		var dify = e.innerHeight() - e.height();
		
		// Step 2: resize and position the textboxes
		this.model.morphTargetInfluences[M_WIDTH] = width;
		this.model.morphTargetInfluences[M_HEIGHT] = height;
		e.css({ width: width-difx+2, height: height-dify });
		
		//TODO base on anchor points
		this.model.position.set(10, 10, 0);
		e.css({ bottom: 10, left: 10, top: "" });
		
		//TODO move into an "advance"
		if (this.owner && this.owner.getTalkingAnchor) {
			//TODO determine anchor point based on where the owner is on-screen
			//Project Vector = 3D to 2D, Unproject Vector = 2D to 3D
			var anchor = this.owner.getTalkingAnchor();
			anchor.project(currentMap.camera);
			this.model.morphTargetInfluences[M_TAILX] = anchor.x - this.model.position.x;
			this.model.morphTargetInfluences[M_TAILY] = anchor.y - this.model.position.y;
		}
		
		
		
		// Step 3: setup typewriter effect and show dialogbox
		this._displayNext();
		
		e.css({ "visibility": "" });
		this.model.visible = true;
		
	},
	
	/** Dialog is already showing and sized, show next dialog, or close. */
	_displayNext : function() {
		var txt;
		while(this.html && this.html.length) {
			txt = this.html.shift();
			console.log("shift: ", txt);
			if (typeof txt == "function") {
				try {
					txt = txt.call(this.owner);
				} catch(e) { console.error("Dialog function threw an error!", e); }
				if (!txt) continue;
			}
			break;
		}
		console.log("break: ", txt);
			
		if (txt) {
			
			controller.popInputContext("dlogWaiting");
			controller.pushInputContext("dlogPrinting");
			
			console.log("push: ", txt);
			
			this.element.html(txt); //put in first dialog
			this.model.morphTargetInfluences[M_TRIANGLE] = (this.html.length)? 1: 0;
			
			setupTypewriter(this, function(){
				controller.popInputContext("dlogPrinting");
				controller.pushInputContext("dlogWaiting");
			});
			
		} else {
			console.log("end: ", txt);
			controller.popInputContext("dlogWaiting");
			if (this.autoClose)
				this.hide();
		}
		
	},
	
	
	createModel: function() {
		var self = this;
		var ins; //insets
		switch (this.type) {
			case "dialog_bubble":
				ins = { //remember, measured from bottom left corner
					t: 6, b: 10, h: 16, //top, bottom, height
					l: 6, r: 10, w: 16, //left, right, width
					as: 4, ax: 6, ay: 10, //arrow size, x/y position
				};
				break;
			case "textbox_gold":
				ins = { 
					t: 7, b: 10, h: 16,
					l: 9, r: 12, w: 32,
					as: 4, ax: 22, ay: 10,
				};
				break;
		}
		
		var geom = new THREE.Geometry();
		{
			geom.vertices = [
				v3(0,     0), v3(ins.l,     0), v3(ins.r,     0), v3(ins.w,     0), //0-3
				v3(0, ins.t), v3(ins.l, ins.t), v3(ins.r, ins.t), v3(ins.w, ins.t), //4-7
				v3(0, ins.b), v3(ins.l, ins.b), v3(ins.r, ins.b), v3(ins.w, ins.b), //8-11
				v3(0, ins.h), v3(ins.l, ins.h), v3(ins.r, ins.h), v3(ins.w, ins.h), //12-15
				
				v3(ins.ax+ins.as, ins.ay+ins.as, 1), v3(ins.ax-ins.as, ins.ay+ins.as, 1), //16-17
				v3(ins.ax+ins.as, ins.ay-ins.as, 1), v3(ins.ax-ins.as, ins.ay-ins.as, 1), //18-19
				
				v3(0, ins.h/2, -1), v3(16, ins.h/2, -1), v3(0, 0, -1), //20-22
			];
			f4(geom, 0, 1, 4, 5); f4(geom, 1, 2, 5, 6); f4(geom, 2, 3, 6, 7);
			f4(geom, 4, 5, 8, 9); f4(geom, 5, 6, 9,10); f4(geom, 6, 7,10,11);
			f4(geom, 8, 9,12,13); f4(geom, 9,10,13,14); f4(geom,10,11,14,15);
			f4(geom,16,17,18,19, 1);
			
			{
				geom.faces.push(new THREE.Face3(22, 20, 21, undefined, undefined, 0));
				// geom.faces.push(new THREE.Face3(22, 21, 20));
				
				geom.faceVertexUvs[0].push([ new THREE.Vector2(ins.l, ins.t), new THREE.Vector2(ins.l, ins.t), new THREE.Vector2(ins.l, ins.t), ]);
				// geom.faceVertexUvs[0].push([ new THREE.Vector2(ins.l, ins.t), new THREE.Vector2(ins.l, ins.t), new THREE.Vector2(ins.l, ins.t), ]);
			}
			
			geom.morphTargets = [
				{
					name: "width", vertices: [
						v3(0,     0), v3(ins.l,     0), v3(ins.r+1,     0), v3(ins.w+1,     0), //0-3
						v3(0, ins.t), v3(ins.l, ins.t), v3(ins.r+1, ins.t), v3(ins.w+1, ins.t), //4-7
						v3(0, ins.b), v3(ins.l, ins.b), v3(ins.r+1, ins.b), v3(ins.w+1, ins.b), //8-11
						v3(0, ins.h), v3(ins.l, ins.h), v3(ins.r+1, ins.h), v3(ins.w+1, ins.h), //12-15
						
						v3(ins.ax+ins.as+1, ins.ay+ins.as, 1), v3(ins.ax-ins.as+1, ins.ay+ins.as, 1), //16-17
						v3(ins.ax+ins.as+1, ins.ay-ins.as, 1), v3(ins.ax-ins.as+1, ins.ay-ins.as, 1), //18-19
						
						v3(0+0.5, (ins.h)/2, -1), v3(16+0.5, (ins.h)/2, -1), v3(0, 0, -1), //20-22
					],
				},
				{
					name: "height", vertices: [
						v3(0,     0  ), v3(ins.l,     0  ), v3(ins.r,     0  ), v3(ins.w,     0  ), //0-3
						v3(0, ins.t  ), v3(ins.l, ins.t  ), v3(ins.r, ins.t  ), v3(ins.w, ins.t  ), //4-7
						v3(0, ins.b+1), v3(ins.l, ins.b+1), v3(ins.r, ins.b+1), v3(ins.w, ins.b+1), //8-11
						v3(0, ins.h+1), v3(ins.l, ins.h+1), v3(ins.r, ins.h+1), v3(ins.w, ins.h+1), //12-15
						
						v3(ins.ax+ins.as, ins.ay+ins.as, 1), v3(ins.ax-ins.as, ins.ay+ins.as, 1), //16-17
						v3(ins.ax+ins.as, ins.ay-ins.as, 1), v3(ins.ax-ins.as, ins.ay-ins.as, 1), //18-19
						
						v3(0, (ins.h+1)/2, -1), v3(16, (ins.h+1)/2, -1), v3(0, 0, -1), //20-22
					],
				},
				{
					name: "hideStop", vertices: [
						v3(0,     0), v3(ins.l,     0), v3(ins.r,     0), v3(ins.w,     0), //0-3
						v3(0, ins.t), v3(ins.l, ins.t), v3(ins.r, ins.t), v3(ins.w, ins.t), //4-7
						v3(0, ins.b), v3(ins.l, ins.b), v3(ins.r, ins.b), v3(ins.w, ins.b), //8-11
						v3(0, ins.h), v3(ins.l, ins.h), v3(ins.r, ins.h), v3(ins.w, ins.h), //12-15
						
						v3(ins.ax+ins.as, ins.ay+ins.as,-1), v3(ins.ax-ins.as, ins.ay+ins.as,-1), //16-17
						v3(ins.ax+ins.as, ins.ay-ins.as,-1), v3(ins.ax-ins.as, ins.ay-ins.as,-1), //18-19
						
						v3(0, ins.h/2, -1), v3(16, ins.h/2, -1), v3(0, 0, -1), //20-22
					],
				},
				{
					name: "triangle", vertices: [
						v3(0,     0), v3(ins.l,     0), v3(ins.r,     0), v3(ins.w,     0), //0-3
						v3(0, ins.t), v3(ins.l, ins.t), v3(ins.r, ins.t), v3(ins.w, ins.t), //4-7
						v3(0, ins.b), v3(ins.l, ins.b), v3(ins.r, ins.b), v3(ins.w, ins.b), //8-11
						v3(0, ins.h), v3(ins.l, ins.h), v3(ins.r, ins.h), v3(ins.w, ins.h), //12-15
						
						v3(ins.ax+ins.as, ins.ay+ins.as, 1), v3(ins.ax-ins.as, ins.ay+ins.as, 1), //16-17
						v3(ins.ax       , ins.ay-ins.as, 1), v3(ins.ax       , ins.ay-ins.as, 1), //18-19
						
						v3(0, ins.h/2, -1), v3(16, ins.h/2, -1), v3(0, 0, -1), //20-22
					],
				},
				{
					name: "tailX", vertices: [
						v3(0,     0), v3(ins.l,     0), v3(ins.r,     0), v3(ins.w,     0), //0-3
						v3(0, ins.t), v3(ins.l, ins.t), v3(ins.r, ins.t), v3(ins.w, ins.t), //4-7
						v3(0, ins.b), v3(ins.l, ins.b), v3(ins.r, ins.b), v3(ins.w, ins.b), //8-11
						v3(0, ins.h), v3(ins.l, ins.h), v3(ins.r, ins.h), v3(ins.w, ins.h), //12-15
						
						v3(ins.ax+ins.as, ins.ay+ins.as, 1), v3(ins.ax-ins.as, ins.ay+ins.as, 1), //16-17
						v3(ins.ax+ins.as, ins.ay-ins.as, 1), v3(ins.ax-ins.as, ins.ay-ins.as, 1), //18-19
						
						v3(0, ins.h/2, -1), v3(16, ins.h/2, -1), v3(1, 0, -1), //20-22
					],
				},
				{
					name: "tailY", vertices: [
						v3(0,     0), v3(ins.l,     0), v3(ins.r,     0), v3(ins.w,     0), //0-3
						v3(0, ins.t), v3(ins.l, ins.t), v3(ins.r, ins.t), v3(ins.w, ins.t), //4-7
						v3(0, ins.b), v3(ins.l, ins.b), v3(ins.r, ins.b), v3(ins.w, ins.b), //8-11
						v3(0, ins.h), v3(ins.l, ins.h), v3(ins.r, ins.h), v3(ins.w, ins.h), //12-15
						
						v3(ins.ax+ins.as, ins.ay+ins.as, 1), v3(ins.ax-ins.as, ins.ay+ins.as, 1), //16-17
						v3(ins.ax+ins.as, ins.ay-ins.as, 1), v3(ins.ax-ins.as, ins.ay-ins.as, 1), //18-19
						
						v3(0, ins.h/2, -1), v3(16, ins.h/2, -1), v3(0, 1, -1), //20-22
					],
				},
			];
		}
		
		
		var mat = new THREE.MeshFaceMaterial([
			(function(){
				var mat = new THREE.MeshBasicMaterial();
				
				var tex = new THREE.Texture();
				tex.magFilter = THREE.NearestFilter;
				tex.minFilter = THREE.NearestFilter;
				tex.anisotropy = 1;
				tex.generateMipmaps = false;
				
				var img = new Image();
				function f(){
					tex.image = img;
					tex.needsUpdate = true;
					img.removeEventListener("load", f);
				}
				img.on("load", f);
				
				img.src = BASEURL+"/img/ui/"+self.type+".png";
				
				mat.map = tex;
				mat.morphTargets = true;
				mat.transparent = true;
				mat.alphaTest = 0.05;
				return mat;
			})(),
			
			(function(){
				var mat = new THREE.MeshBasicMaterial({
					color: 0x000000,
				});
				mat.morphTargets = true;
				return mat;
			})(),
		]);
		
		this.model = new THREE.Mesh(geom, mat);
		this.model.visible = false;
		this.model.renderDepth = 0;
		return this.model;
		
		//--------------------------------------------------------------------//
		function v2(x, y) { return new THREE.Vector2(x, y); }
		function v3(x, y, z) { return new THREE.Vector3(x, y, z || 0); }
		function uv(v) {
			return new THREE.Vector2(v.x / ins.w, v.y / ins.h);
		}
		
		function f4(g, a, b, c, d, mati) {
			g.faces.push(new THREE.Face3(a, b, d, undefined, undefined, mati));
			g.faces.push(new THREE.Face3(a, d, c, undefined, undefined, mati));
			
			g.faceVertexUvs[0].push([ uv(g.vertices[a]), uv(g.vertices[b]), uv(g.vertices[d]) ]);
			g.faceVertexUvs[0].push([ uv(g.vertices[a]), uv(g.vertices[d]), uv(g.vertices[c]) ]);
		}
	}
});


function setupTypewriter(textbox, callback) {
	textbox.advance = null;
	function setNext(cb) {
		textbox.advance = cb;
	}
	
	var completedText = textbox.element.html();
	textbox.complete = function(){};
	function _complete() {
		textbox.element.html(completedText);
		textbox.advance = blinkCursor;
		if (callback) callback();
	};
	
	textbox.model.morphTargetInfluences[M_HIDE] = 1;
	
	//Because textnodes are not "elements", and jquery won't hide text nodes, in 
	// order to hide everything, we need to wrap everything in span tags...
	textbox.element.contents()
		.filter(function(){ return this.nodeType == 3; })
		.wrap("<span>");
	
	var elements = textbox.element.contents();
	$(elements).hide();
	
	
	//Copied and modified from http://jsfiddle.net/y9PJg/24/
	var i = 0;
	function iterate() {
		textbox.complete = _complete;
		if (i < elements.length) {
			$(elements[i]).show();
			animateNode(elements[i], iterate); 
			i++;
		} else {
			if (callback) callback();
			textbox.advance = blinkCursor;
		}
	}
	textbox.advance = iterate;
	
	function animateNode(element, callback) {
		var pieces = [];
		if (element.nodeType==1) { //element node
			while (element.hasChildNodes()) {
				pieces.push( element.removeChild(element.firstChild) );
			}
			
			setNext(function childStep() {
				if (pieces.length) {
					animateNode(pieces[0], childStep); 
					element.appendChild(pieces.shift());
				} else {
					callback();
				}
			});
		
		} else if (element.nodeType==3) { //text node
			pieces = element.data.match(/.{0,2}/g); // 2: Number of chars per frame
			element.data = "";
			(function addText(){
				element.data += pieces.shift();
				setNext(pieces.length ? addText : callback);
			})();
		}
	}
	
	var tick = 0;
	function blinkCursor(delta) {
		tick -= delta;
		if (tick <= 0) {
			tick = 0.7;
			textbox.model.morphTargetInfluences[M_HIDE] = !textbox.model.morphTargetInfluences[M_HIDE];
		}
	}
}

///////////////////////////////////////////////////////////////////////
function Skrim() {
	this._createAnimProp("opacity", 1);
	this._createAnimProp("color_r", 0);
	this._createAnimProp("color_g", 0);
	this._createAnimProp("color_b", 0);
	
}
extend(Skrim.prototype, {
	model : null,
	animating : false,
	callback : null,
	speed: 1,
	_nextOpts: null,
	
	_createAnimProp: function(prop, def) {
		this[prop] = {
			curr: def,
			src : def,
			dest: def,
			alpha: 1,
		};
	},
	
	fadeTo : function(opts, callback) {
		var self = this;
		
		opts = extend(opts, this._nextOpts);
		this._nextOpts = null;
		
		if (opts["color"] !== undefined) {
			var hex = Math.floor(opts["color"]);
			opts["color_r"] = ((hex >> 16) & 255) / 255;
			opts["color_g"] = ((hex >>  8) & 255) / 255;
			opts["color_b"] = ((hex      ) & 255) / 255;
		}
		
		if (this.callback) {
			var cb = this.callback;
			this.callback = null; //Make sure to remove the stored callback IMMEDEATELY lest it be called twice somehow.
			cb();
		}
		
		var willAnim = false;
		
		willAnim |= setFade("opacity", opts);
		willAnim |= setFade("color_r", opts);
		willAnim |= setFade("color_g", opts);
		willAnim |= setFade("color_b", opts);
		
		this.speed = opts["speed"] || 1;
		
		if (willAnim) {
			this.callback = callback;
			this.animating = true;
		} else {
			//Won't animate, do the callback immedeately
			if (callback) callback();
		}
		
		return;
		
		function setFade(prop, opts) {
			if (opts[prop] === undefined) return;
			self[prop].src = self[prop].curr;
			self[prop].dest = opts[prop];
			if (self[prop].src - self[prop].dest == 0) {
				self[prop].alpha = 1;
			} else {
				self[prop].alpha = 0;
			}
			
			return self[prop].alpha == 0;
		}
	},
	
	advance : function(delta) {
		if (!this.animating) return;
		var self = this;
		
		var updated = false;
		
		updated |= _anim("opacity");
		updated |= _anim("color_r");
		updated |= _anim("color_g");
		updated |= _anim("color_b");
		
		if (updated) {
			this.model.material.opacity = this.opacity.curr;
			this.model.material.color.r = Math.clamp(this.color_r.curr);
			this.model.material.color.g = Math.clamp(this.color_g.curr);
			this.model.material.color.b = Math.clamp(this.color_b.curr);
			this.model.material.needsUpdate = true;
			
			//This fixes a problem where the Skrim blocks rendering the dialog boxes behind it
			this.model.visible = !!this.model.material.opacity;
		} else {
			this.animating = false;
			if (this.callback) {
				var cb = this.callback;
				this.callback = null;
				cb();
			}
		}
		
		return;
		
		function _anim(prop) {
			var updated = self[prop].alpha < 1;
			
			self[prop].alpha += delta * self.speed;
			if (self[prop].alpha > 1) {
				self[prop].alpha = 1;
			}
			
			self[prop].curr = self[prop].src + (self[prop].dest - self[prop].src) * self[prop].alpha;
			return updated;
		}
	},
	
	createModel: function() {
		var self = this;
		
		var sw = $("#gamescreen").width()+1;
		var sh = $("#gamescreen").height()+1;
		
		var geom = new THREE.Geometry();
		{
			geom.vertices = [
				new THREE.Vector3(-1, -1, 30),
				new THREE.Vector3(sw, -1, 30),
				new THREE.Vector3(sw, sh, 30),
				new THREE.Vector3(-1, sh, 30),
			];
			geom.faces = [
				new THREE.Face3(0, 1, 2),
				new THREE.Face3(2, 3, 0),
			];
		}
		
		var mat = new THREE.MeshBasicMaterial({
			color: 0x000000,
			transparent: true,
		});
		// mat.morphTargets = true;
		
		this.model = new THREE.Mesh(geom, mat);
		this.model.renderDepth = -30;
		return this.model;
	},
});

//////////////////////////////////////////////////////////////////////
function AjaxLoader() {
	
}
extend(AjaxLoader.prototype, {
	node : null,
	m_helix : null,
	m_progress : [],
	m_spinner : [],
	
	progress: 0,
	progress_total: 100,
	opacity: 0,
	_opacity_speed: 2,
	spin: 0,
	_spin_speed: 900,
	_spin_falloff: 500,
	
	letterdefs : [
		/*"A" :*/ [3, 3],
		/*"B" :*/ [4, 3],
		/*"X" :*/ [3, 2],
		/*"Y" :*/ [4, 2],
		/*"L" :*/ [0, 0],
		/*"R" :*/ [1, 0],
		/*"S" :*/ [2, 0],
		/*"UA":*/ [3, 1],
		/*"DA":*/ [4, 1],
		/*"LA":*/ [3, 0],
		/*"RA":*/ [4, 0],
	],
	
	show: function() {
		this.opacity = 1;
		for (var i = 0; i < this.m_progress.length; i++) {
			var rnd = Math.floor(Math.random() * this.letterdefs.length);
			this.m_progress[i].material.map.offset.set(
				(this.letterdefs[rnd][0] * 16) / 128, 
				(this.letterdefs[rnd][1] * 16) / 64
			)
		}
	},
	
	hide: function() {
		this.opacity = 0;
	},
	
	advance: function(delta) {
		if (this.opacity == 0 && this.m_helix.material.opacity <= 0) return;
		
		if (this.opacity > this.m_helix.material.opacity) {
			this.m_helix.material.opacity =
				Math.clamp(this.m_helix.material.opacity + delta * this._opacity_speed);
		} else if (this.opacity < this.m_helix.material.opacity) {
			this.m_helix.material.opacity = 
				Math.clamp(this.m_helix.material.opacity - delta * this._opacity_speed);
		}
		
		var nl = this.m_progress.length; //number of letters
		for (var i = 0; i < nl; i++) {
			//var o = (this.progress / this.progress_total) * nl;
			var o = (this.progress_total / nl);
			this.m_progress[i].material.opacity = this.m_helix.material.opacity * Math.clamp((this.progress-(o*i)) / o);
		}
		
		this.spin += delta * this._spin_speed;
		if (this.spin > 800) this.spin -= 800;
		for (var i = 0; i < this.m_spinner.length; i++) {
			var o = this.spin - (i * 100);
			if (o < 0) o += 800;
			o = (-o + this._spin_falloff) / this._spin_falloff;
			this.m_spinner[i].material.opacity = this.m_helix.material.opacity * Math.clamp(o);
			
			if (o < 0) {
				var rnd = Math.floor(Math.random() * this.letterdefs.length);
				this.m_spinner[i].material.map.offset.set(
					(this.letterdefs[rnd][0] * 16) / 128, 
					(this.letterdefs[rnd][1] * 16) / 64
				)
			}
		}
	},
	
	createModel: function(){
		var self = this;
		var sw = $("#gamescreen").width();
		var sh = $("#gamescreen").height();
		
		this.node = new THREE.Object3D();
		
		var geom = new THREE.PlaneBufferGeometry(8, 8);
		
		var tex = new THREE.Texture(AJAX_TEXTURE_IMG);
		tex.magFilter = THREE.NearestFilter;
		tex.minFilter = THREE.NearestFilter;
		tex.repeat = new THREE.Vector2(48/128, 48/64);
		tex.offset = new THREE.Vector2(0, 16/64); //Remember, bottom right is origin
		tex.generateMipmaps = false;
		_ensureUpdate(tex);
		
		var mat = new THREE.MeshBasicMaterial({
			map: tex,
			transparent: true,
			opacity: 0,
		});
		
		this.m_helix = new THREE.Mesh(geom, mat);
		this.m_helix.scale.set(3, 3, 3);
		this.m_helix.position.set(16+24, sh-24-16, 40);
		this.m_helix.renderDepth = -40;
		this.node.add(this.m_helix);
		
		for (var i = 0; i < 8; i++) {
			this.m_spinner[i] = _createLetter();
			this.m_spinner[i].position.set(
				this.m_helix.position.x + (Math.sin(i*(Math.PI/4)) * 24),
				this.m_helix.position.y + (Math.cos(i*(Math.PI/4)) * 24), 
				39);
			this.m_spinner[i].renderDepth = -40;
			
			var rnd = Math.floor(Math.random() * this.letterdefs.length);
			this.m_spinner[i].material.map.offset.set(
				(this.letterdefs[rnd][0] * 16) / 128, 
				(this.letterdefs[rnd][1] * 16) / 64
			)
		}
		
		for (var i = 0; i < 10; i++) {
			this.m_progress[i] = _createLetter();
			this.m_progress[i].position.set(
				this.m_helix.position.x+44+(i*16), 
				this.m_helix.position.y, 40);
			this.m_progress[i].renderDepth = -40;
		}
		
		return this.node;
		
		function _createLetter() {
			var tex = new THREE.Texture(AJAX_TEXTURE_IMG);
			tex.magFilter = THREE.NearestFilter;
			tex.minFilter = THREE.NearestFilter;
			tex.wrapS = THREE.RepeatWrapping;
			tex.wrapT = THREE.RepeatWrapping;
			tex.repeat = new THREE.Vector2(16/128, 16/64);
			tex.offset = new THREE.Vector2(0, 0);
			tex.generateMipmaps = false;
			_ensureUpdate(tex);
			
			var mat = new THREE.MeshBasicMaterial({
				map: tex,
				transparent: true,
				opacity: 0,
			});
			
			var mesh = new THREE.Mesh(geom, mat);
			self.node.add(mesh);
			return mesh;
		}
		
		function _ensureUpdate(tex) {
			AJAX_TEXTURE_IMG.on("load", function(){
				tex.needsUpdate = true;
			});
			tex.needsUpdate = true;
		}
	},
});


//////////////////////////////////////////////////////////////////////

function createDEBUGSetup() {
	this._mainCamera = this.camera;
	this._debugCamera = this.camera = new THREE.PerspectiveCamera(75, 
		$("#gamescreen").width()/ $("#gamescreen").height(),
		0.1, 10000);
	this._debugCamera.position.z = 10;
	this.scene.add(this._debugCamera);
	
	
	this.scene.add(new THREE.CameraHelper(this._mainCamera));
	this.scene.add(new THREE.AxisHelper(5));
	
	var controls = new THREE.OrbitControls(this._debugCamera);
	controls.damping = 0.2;
	
	var oldlogic = this.logicLoop;
	this.logicLoop = function(delta){
		controls.update();
		oldlogic.call(this, delta);
	};
}

//////////////////////////////////////////////////////////////////////
module.exports = new UIManager();

},{"events":2,"extend":"extend","inherits":"inherits","tpp-controller":"tpp-controller","tpp-spritemodel":"tpp-spritemodel"}],17:[function(require,module,exports){
// map.js

var inherits = require("inherits");
var extend = require("extend");
var ndarray = require("ndarray");
var EventEmitter = require("events").EventEmitter;

var Event = require("tpp-event");
var PlayerChar = require("tpp-pc");

var ObjLoader = require("./model/obj-loader");

var setupMapRigging = require("./model/map-setup");


// These would be CONSTs if we weren't in the browser
var EXT_MAPBUNDLE = ".zip"; //Extension for requesting map bundles
var DEF_HEIGHT_STEP = 0.5; //Default Y translation amount a height step takes. This can be defined in a map file.


// If you make any changes here, make sure to mirror them in build/map-zipper.js!
function convertShortToTileProps(val) {
	// TileData: MMMMLW00 TTTHHHHH
	// Where:
	//    M = Movement, Bits are: (Down, Up, Left, Right)
	//    L = Ledge bit (this tile is a ledge: you jump over it when given permission to enter it)
	//    W = Water bit (this tile is water: most actors are denied entry onto this tile)
	//    H = Height (vertical location of the center of this tile)
	//    T = Transition Tile (transition to another Layer when stepping on this tile)
	var props = {};
	
	var movement = ((val >> 12) & 0xF);
	// movement is blocked if a movement flag is true:
	props.movement = {};
	props.movement["down"]  = !!(movement & 0x8);
	props.movement["up"]    = !!(movement & 0x4);
	props.movement["left"]  = !!(movement & 0x2);
	props.movement["right"] = !!(movement & 0x1);
	
	props.isWalkable = !!(~movement & 0xF);
	props.isLedge = !!(val & (0x1 << 11));
	props.isWater = !!(val & (0x1 << 10));
	
	props.transition = ((val >> 5) & 0x7);
	
	props.height = ((val) & 0x1F);
	
	props.noNPC = !!(val & (0x1 << 9));
	
	return props;
}



/**
 *
 *
 *
 *
 */
function Map(id, opts){
	this.id = id;
	extend(this, opts);
	
	GC.allocateBin("map_"+id);
	this.gc = GC.getBin("map_"+id);
	
	this.fileSys = new zip.fs.FS();
}
inherits(Map, EventEmitter);
extend(Map.prototype, {
	id : null, //map's internal id
	
	file: null, //Zip file holding all data
	fileSys: null, //Current zip file system for this map
	xhr: null, //active xhr request
	loadError : null,
	
	metadata : null,
	objdata : null,
	mtldata : null,
	
	lScriptTag : null,
	gScriptTag : null,
	
	camera: null,
	cameras: null,
	scene: null,
	mapmodel: null,
	
	spriteNode: null,
	lightNode: null,
	cameraNode: null,
	
	///////////////////////////////////////////////////////////////////////////////////////
	// Load Management 
	///////////////////////////////////////////////////////////////////////////////////////
	
	dispose : function(){
		$(this.lScriptTag).remove();
		$(this.gScriptTag).remove();
		
		if (player && player.parent) player.parent.remove(player);
		
		delete this.file;
		delete this.fileSys;
		delete this.xhr;
		delete this.loadError;
		
		delete this.metadata;
		delete this.objdata;
		delete this.mtldata;
		
		delete this.lScriptTag;
		delete this.gScriptTag;
		
		delete this.tiledata;
		
		delete this.scene;
		delete this.mapmodel;
		delete this.camera;
		
		delete this.spriteNode;
		delete this.lightNode;
		delete this.cameraNode;
		
		this.removeAllListeners();
		this.gc.dispose();
		delete this.gc;
	},
	
	/** Begin download of this map's zip file, preloading the data. */
	download : function(){
		if (this.file) return; //we have the file in memory already, do nothing
		if (this.xhr) return; //already got an active request, do nothing
		
		var self = this;
		var xhr = this.xhr = new XMLHttpRequest();
		xhr.open("GET", BASEURL+"/maps/"+this.id+EXT_MAPBUNDLE);
		// console.log("XHR: ", xhr);
		xhr.responseType = "blob";
		xhr.on("load", function(e) {
			// console.log("LOAD:", e);
			if (xhr.status == 200) {
				self.file = xhr.response;
				self.emit("downloaded");
			} else {
				console.error("ERROR:", xhr.statusText);
				self.loadError = xhr.statusText;
				self.emit("load-error", xhr.statusText);
			}
		});
		xhr.on("progress", function(e){
			// console.log("PROGRESS:", e);
			if (e.lengthComputable) {
				// var percentDone = e.loaded / e.total;
				self.emit("progress", e.loaded, e.total);
			} else {
				//marquee bar
				self.emit("progress", -1);
			}
		});
		xhr.on("error", function(e){
			console.error("ERROR:", e);
			self.loadError = e;
			this.emit("load-error", e);
		});
		xhr.on("canceled", function(e){
			console.error("CANCELED:", e);
			self.loadError = e;
			this.emit("load-error", e);
		});
		//TODO on error and on canceled
		
		xhr.send();
	},
	
	/**
	 *  Reads the tile data and begins loading the required resources.
	 */
	load : function(){
		var self = this;
		if (!this.file) { //If file isn't downloaded yet, defer loading
			this.once("downloaded", function(){
				self.load();
			});
			this.download();
			//TODO throw up loading gif
			return;
		}
		
		this.markLoading("MAP_mapdata");
		var _texsLoaded = false;
		
		this.fileSys.importBlob(this.file, function success(){
			//load up the map!
			self.fileSys.root.getChildByName("map.json").getText(__jsonLoaded, __logProgress);
			self.fileSys.root.getChildByName("map.obj").getText(__objLoaded, __logProgress);
			self.fileSys.root.getChildByName("map.mtl").getText(__mtlLoaded, __logProgress);
			
		}, function error(e){
			console.log("ERROR: ", e);
			self.emit("load-error"); //Send to the dorito dungeon
		});
		return; 
		
		function __logProgress() {
			console.log("PROGRESS", arguments);
		}
		//Callback chain below
		function __jsonLoaded(data) {
			self.metadata = JSON.parse(data);
			
			self.tiledata = ndarray(self.metadata.map, [self.metadata.width, self.metadata.height], [1, self.metadata.width]);
			if (self.metadata["heightstep"] === undefined) {
				self.metadata["heightstep"] = DEF_HEIGHT_STEP;
			}
			
			if (self.metadata["bgmusic"] !== undefined) {
				self._loadMusic(self.metadata["bgmusic"]);
			}
			
			self.emit("loaded-meta");
			__loadDone();
		}
		
		function __objLoaded(data) {
			self.objdata = data;
			__modelLoaded();
		}
		function __mtlLoaded(data) {
			self.mtldata = data;
			__modelLoaded();
		}
		function __modelLoaded() {
			if (!self.objdata || !self.mtldata) return; //don't begin parsing until they're both loaded
			
			self.onAssetTypeLoaded("MAPTEX", function(){
				_texsLoaded = true;
				__loadDone();
			});
			
			function loadTexture(filename, callback) {
				console.log("loadTex! ", filename);
				var file = self.fileSys.root.getChildByName(filename);
				if (!file) {
					console.error("ERROR LOADING TEXTURE: No such file in map bundle! "+filename);
					callback(DEF_TEXTURE);
					return;
				}
				file.getBlob("image/png", function(data) {
					console.log("loadTex! FINISH ", filename);
					var url = URL.createObjectURL(data);
					self.gc.collectURL(url);
					callback(url);
				});
			}
			
			var objldr = new ObjLoader(self.objdata, self.mtldata, loadTexture, {
				gc: self.gc,
			});
			objldr.on("load", __modelReady);
			objldr.load();
		}
		
		function __modelReady(obj) {
			self.mapmodel = obj;
			// __test__outputTree(obj);
			self.objdata = self.mtldata = true; //wipe the big strings from memory
			self.emit("loaded-model");
			__loadDone();
		}
		
		function __loadDone() {
			// console.log("__loadDone", !!self.mapmodel, !!self.tiledata);
			if (!self.mapmodel || !self.tiledata || !_texsLoaded) return; //don't call on _init before both are loaded
			
			self._init();
			self.markLoadFinished("MAP_mapdata");
		}
	},
	
	
	_loadMusic: function(musicdef) {
		var self = this;
		
		if (!musicdef) return;
		if (!$.isArray(musicdef)) musicdef = [musicdef];
		
		for (var i = 0; i < musicdef.length; i++) {
			if (SoundManager.isMusicLoaded(musicdef[i].id)) continue; //music already loaded
			__loadMusicFromFile(musicdef[i].id, i, function(idx, url, data){
				SoundManager.loadMusic(musicdef[idx].id, {
					data: data,
					url: url,
					loopStart: musicdef[idx].loopStart,
					loopEnd: musicdef[idx].loopEnd,
				});
			});
		}
		
		if (!musicdef["dontAutoplay"]) {
			self.queueForMapStart(function(){
				SoundManager.playMusic(musicdef[0].id);
			});
		}
		
		return;
		
		function __loadMusicFromFile(musicid, idx, callback) {
			self.markLoading("BGMUSIC_"+musicid);
			try {
				var dir = self.fileSys.root.getChildByName("bgmusic");
				if (!dir) {
					console.error("No bgmusic folder in the map file!");
					return;
				}
				
				var file = dir.getChildByName(musicid+".mp3");
				if (!file) {
					console.error("No bgmusic with name '"+musicid+".mp3"+"' !");
					return;
				}
				
				function onProgress(index, total){
					console.log("Music Load Progress: ", index, total);
				}
				
				file.getBlob("audio/mpeg", function(data){
					var url = URL.createObjectURL(data);
					self.gc.collectURL(url);
					callback(idx, url, data);
					self.markLoadFinished("BGMUSIC_"+musicid);
				}, onProgress);
			} catch (e) {
				callback(e);
			}
		}
		
	},
	
	/**
	 * Creates the map for display from the stored data.
	 */
	_init : function(){
		var self = this;
		this.scene = new THREE.Scene();
		this.cameras = {};
		
		if (!window.player) {
			window.player = new PlayerChar();
		}
		
		this.scene.add(this.mapmodel);
		
		this.cameraLogics = [];
		setupMapRigging(this);
		// Map Model is now ready
		
		if (this.metadata.clearColor)
			threeRenderer.setClearColorHex( this.metadata.clearColor );
		
		this._initEventMap();
		
		this.emit("map-ready");
		
	},
	
	
	///////////////////////////////////////////////////////////////////////////////////////
	// Tile Information 
	///////////////////////////////////////////////////////////////////////////////////////
	
	tiledata : null,
	
	getTileData : function(x, y) {
		var tile = convertShortToTileProps(this.tiledata.get(x, y));
		return tile;
	},
	
	getLayerTransition : function(x, y, currLayer) {
		currLayer = (currLayer!==undefined)? currLayer : 1;
		var tile = this.getTileData(x, y);
		var layer = tile.transition;
		var origin1 = this.metadata.layers[currLayer-1]["2d"];
		var origin2 = this.metadata.layers[layer-1]["2d"];
		
		return {
			layer: layer,
			x: x - origin1[0] + origin2[0],
			y: y - origin1[1] + origin2[1],
		};
	},
	
	get3DTileLocation : function(x, y, layer, tiledata) {
		if (x instanceof THREE.Vector2) {
			y = x.y; x = x.x;
		}
		if (x instanceof THREE.Vector3) {
			layer = x.z; y = x.y; x = x.x;
		}
		layer = (layer || 1) - 1;
		if (!tiledata) tiledata = this.getTileData(x, y);
		
		var layerdata = this.metadata.layers[layer];
		var z = tiledata.height * this.metadata.heightstep;
		
		var loc = new THREE.Vector3(x, z, y);
		loc.x -= layerdata["2d"][0];
		loc.z -= layerdata["2d"][1];
		
		var mat = new THREE.Matrix4();
		mat.set.apply(mat, layerdata["3d"]);
		loc.applyMatrix4(mat);
		
		return loc;
	},
	/*
	getAllWalkableTiles : function() {
		var tiles = [];
		for (var li = 1; li <= 7; li++) {
			if (!this.metadata.layers[li-1]) continue;
			tiles[li] = [];
			
			for (var y = 0; y < this.metadata.height; y++) {
				for (var x = 0; x < this.metadata.width; x++) {
					var tdata = this.getTileData(x, y);
					if (!tdata.isWalkable) continue;
					
					tdata["3dloc"] = this.get3DTileLocation(x, y, li, tdata);
					
					tiles[li].push(tdata);
				}
			}
		}
		return tiles;
	}, */
	
	getRandomNPCSpawnPoint : function() {
		if (!this.metadata.npcspawns) {
			throw new Error("Event requested NPC Spawn Point on a map where none are defined!");
		}
		
		var pts = this.metadata._npcSpawnsAvail;
		if (!pts || !pts.length) {
			pts = this.metadata._npcSpawnsAvail = this.metadata.npcspawns.slice();
		}
		
		var index = Math.floor(Math.random() * pts.length);
		var vec = new THREE.Vector3(pts[index][0], pts[index][1], pts[index][2] || 1);
		pts.splice(index, 1);
		return vec;
		
	},
	
	/**
	 * canWalkBetween: If it is possible to walk from one tile to another. The two
	 * 		tiles must be adjacent, or false is immedeately returned.
	 * returns:
	 * 		false = cannot, 1 = can, 2 = must jump, 4 = must swim/surf
	 */
	canWalkBetween : function(srcx, srcy, destx, desty, ignoreEvents){
		if (Math.abs(srcx - destx) + Math.abs(srcy - desty) != 1) return false;
		
		// If we're somehow already outside the map, unconditionally allow them to walk around to get back in
		if (srcx < 0 || srcx >= this.metadata.width) return true;
		if (srcy < 0 || srcy >= this.metadata.height) return true;
		
		// Sanity check edges of the map
		if (destx < 0 || destx >= this.metadata.width) return false;
		if (desty < 0 || desty >= this.metadata.height) return false;
		
		var srctile = this.getTileData(srcx, srcy);
		var desttile = this.getTileData(destx, desty);
		
		if (!desttile.isWalkable) return false;
		
		if (!ignoreEvents) { //check for the presense of events
			var evts = this.eventMap.get(destx, desty);
			if (evts) {
				for (var i = 0; i < evts.length; i++) {
					if (!evts[i].canWalkOn()) return false;
				}
			}
		}
		
		var canWalk = true; //Assume we can travel between until proven otherwise.
		var mustJump, mustSwim, mustTransition, mustBePlayer;
		
		var dir = (function(){
			switch (1) {
				case (srcy - desty): return ["up", "down"];
				case (desty - srcy): return ["down", "up"];
				case (srcx - destx): return ["left", "right"];
				case (destx - srcx): return ["right", "left"];
			} return null;
		})();
		
		if (srctile.movement[dir[0]]) { //if movement = true, means we can't walk there
			if (srctile.isLedge) 
				mustJump = true;
			else canWalk = false;
		}
		canWalk &= !desttile.movement[dir[1]];
		
		mustSwim = desttile.isWater;
		
		mustTransition = !!desttile.transition;
		
		mustBePlayer = !!desttile.noNPC;
		
		if (!canWalk) return false;
		return (canWalk?0x1:0) | (mustJump?0x2:0) | (mustSwim?0x4:0) | (mustTransition?0x8:0) | (mustBePlayer?0x10:0);
	},
	
	
	///////////////////////////////////////////////////////////////////////////////////////
	// Event Handling 
	///////////////////////////////////////////////////////////////////////////////////////
	
	_localId : 0,
	eventList : null,
	eventMap : null,
	
	_initEventMap : function() {
		var self = this;
		
		this.eventList = {};
		var w = this.metadata.width, h = this.metadata.height;
		this.eventMap = ndarray(new Array(w*h), [w, h], [1, w]);
		this.eventMap.put = function(x, y, val) {
			if (!this.get(x, y)) {
				this.set(x, y, []);
			}
			if (this.get(x, y).indexOf(val) >= 0) return; //don't double add
			this.get(x, y).push(val);
		};
		this.eventMap.remove = function(x, y, val) {
			if (!this.get(x, y)) return null;
			var i = this.get(x, y).indexOf(val);
			if (this.get(x, y).length-1 > 0) {
				//Trying to find the Bug of the Phantom Sprites!
				console.warn("REMOVING EVENT FROM NON-EMPTY LIST: ", this.get(x, y), "index:", i);
			}
			if (i == -1) return null;
			return this.get(x, y).splice(i, 1);
		};
		
		this.spriteNode = new THREE.Object3D();
		this.spriteNode.name = "Sprite Rig";
		this.spriteNode.position.y = 0.21;
		this.scene.add(this.spriteNode);
		
		// Load event js files now:
		this.__loadScript("l"); // Load locally defined events
		this.__loadScript("g"); // Load globally defined events
		
		// Add the player character event
		this._initPlayerCharacter();
		
	},
	
	__loadScript : function(t) {
		var self = this;
		var file = this.fileSys.root.getChildByName(t+"_evt.js");
		if (!file) {
			console.error("ERROR LOADING EVENTS: No "+t+"_evt.js file is present in the map bundle.");
			return;
		}
		file.getBlob("text/javascript", function(data){
			// NOTE: We cannot use JQuery().append(), as it delibrately cleans the script tags
			//   out of the dom element we're appending, literally defeating the purpose.
			// NOTE2: We append to the DOM instead of using eval() or new Function() because
			//   when appended like so, the in-browserdebugger should be able to find it and
			//   breakpoint in it.
			var script = document.createElement("script");
			script.type = "text/javascript";
			script.src = URL.createObjectURL(data);
			document.body.appendChild(script);
			this[t+"ScriptTag"] = script;
			// Upon being added to the body, it is evaluated
			
			self.gc.collect(script);
			self.gc.collectURL(script.src);
		});
	},
	
	addEvent : function(evt) {
		if (!evt) return;
		if (!(evt instanceof Event)) 
			throw new Error("Attempted to add an object that wasn't an Event! " + evt);
		
		if (!evt.shouldAppear()) return;
		if (!evt.id)
			evt.id = "LocalEvent_" + (++this._localId);
		
		var self = this;
		//now adding event to map
		this.eventList[evt.id] = evt;
		if (evt.location) {
			this.eventMap.put(evt.location.x, evt.location.y, evt);
		} else if (evt.locations) {
			for (var i = 0; i < evt.locations.length; i++) {
				var loc = evt.locations[i];
				this.eventMap.put(loc.x, loc.y, evt);
			}
		}
		
		//registering listeners on the event
		evt.on("moving", _moving = function(srcX, srcY, destX, destY){
			//Started moving to a new tile
			self.eventMap.put(destX, destY, this);
			self.eventMap.remove(srcX, srcY, this);
			
			var dir = new THREE.Vector3(srcX-destX, 0, destY-srcY);
			var lst = self.eventMap.get(destX, destY);
			if (lst) {
				for (var i = 0; i < lst.length; i++) {
					if (!lst[i] || lst[i] == this) continue;
					// console.log("entering-tile", dir, destX, destY);
					lst[i].emit("entering-tile", dir);
				}
			}
			
			if (srcX == destX && srcY == destY) return; //skip "leaving" if we're warping in
			// dir.set(srcX-destX, 0, destY-srcY).negate();
			lst = self.eventMap.get(srcX, srcY);
			if (lst) {
				for (var i = 0; i < lst.length; i++) {
					if (!lst[i] || lst[i] == this) continue;
					// console.log("leaving-tile", dir, srcX, srcY);
					lst[i].emit("leaving-tile", dir);
				}
			}
		});
		this.gc.collectListener(evt, "moving", _moving);
		
		evt.on("moved", _moved = function(srcX, srcY, destX, destY){
			//Finished moving from the old tile
			
			var dir = new THREE.Vector3(srcX-destX, 0, destY-srcY);
			var lst = self.eventMap.get(destX, destY);
			if (lst) {
				for (var i = 0; i < lst.length; i++) {
					if (!lst[i] || lst[i] == this) continue;
					// console.log("entered-tile", dir, destX, destY);
					lst[i].emit("entered-tile", dir);
				}
			}
			
			if (srcX == destX && srcY == destY) return; //skip "left" if we're warping in
			// dir.set(srcX-destX, 0, destY-srcY).negate();
			lst = self.eventMap.get(srcX, srcY);
			if (lst) {
				for (var i = 0; i < lst.length; i++) {
					if (!lst[i] || lst[i] == this) continue;
					// console.log("left-tile", dir, srcX, srcY);
					lst[i].emit("left-tile", dir);
				}
			}
		});
		this.gc.collectListener(evt, "moved", _moved);
		
		var gc = (evt == player)? GC.getBin() : this.gc; //don't put the player in this map's bin
		var avatar = evt.getAvatar(this, gc);
		if (avatar) {
			var loc = evt.location;
			var loc3 = this.get3DTileLocation(loc.x, loc.y, loc.z);
			avatar.position.set(loc3);
			avatar.updateMatrix();
			
			this.spriteNode.add(avatar);
		}
		
		evt.emit("created");
	},
	
	loadSprite : function(evtid, filename, callback) {
		var self = this;
		this.markLoading("SPRITE_"+evtid);
		try {
			var dir = this.fileSys.root.getChildByName(evtid);
			if (!dir) {
				callback(("No subfolder for event id '"+evtid+"'!"));
				return;
			}
			
			var file = dir.getChildByName(filename);
			if (!file) {
				callback(("No asset with name '"+filename+"' for event id '"+evtid+"'!"));
				return;
			}
			
			file.getBlob("image/png", function(data){
				var url = URL.createObjectURL(data);
				self.gc.collectURL(url);
				callback(null, url);
				self.markLoadFinished("SPRITE_"+evtid);
			});
		} catch (e) {
			callback(e);
		}
	},
	
	_initPlayerCharacter : function() {
		if (!window.player) {
			window.player = new PlayerChar();
		}
		var warp = gameState.mapTransition.warp || 0;
		warp = this.metadata.warps[warp];
		if (!warp) {
			console.warn("Requested warp location doesn't exist:", window.transition_warpto);
			warp = this.metadata.warps[0];
		}
		if (!warp) throw new Error("This map has no warps!!");
		
		player.reset();
		player.warpTo(warp);
		
		this.addEvent(player);
		
	},
	
	dispatch : function(x, y) {
		var evts = this.eventMap.get(x, y);
		if (!evts) return;
		
		var args = Array.prototype.slice.call(arguments, 2);
		for (var i = 0; i < evts.length; i++) {
			evts[i].emit.apply(evts[i], args);
		}
	},
	
	
	//////////////////////////////////////////////////////////////////////////////
	//
	//////////////////////////////////////////////////////////////////////////////
	_mapRunState : null,
	
	_initMapRunState : function() {
		if (!this._mapRunState) {
			this._mapRunState = {
				loadTotal : 0,
				loadProgress : 0,
				loadingAssets : {},
				
				typesLoading: {},
				typesLoaded: {},
				typesFinalized: {},
				
				isStarted : false,
				startQueue : [],
				
				endQueue : [],
			};
		}
		return this._mapRunState;
	},
	
	markLoading : function(assetId, assetType) {
		var state = this._initMapRunState();
		state.loadTotal++;
		if (assetId) {
			if (!state.loadingAssets[assetId])
				state.loadingAssets[assetId] = 0;
			state.loadingAssets[assetId]++;
		}
		if (assetType) {
			if (!state.typesLoading[assetType])
				state.typesLoading[assetType] = 0;
			state.typesLoading[assetType]++;
		}
	},
	markLoadFinished : function(assetId, assetType) {
		var state = this._initMapRunState();
		state.loadProgress++;
		if (assetId) {
			if (!state.loadingAssets[assetId])
				state.loadingAssets[assetId] = 0;
			state.loadingAssets[assetId]--;
		}
		if (assetType) {
			if (!state.typesLoaded[assetType])
				state.typesLoaded[assetType] = 0;
			state.typesLoaded[assetType]++;
			
			if (state.typesLoading[assetType] == state.typesLoaded[assetType]
				&& state.typesFinalized[assetType]) 
			{
				state.typesFinalized[assetType]();
			}
		}
		
		//TODO begin map start
		if (state.loadProgress >= state.loadTotal) {
			console.warn("START MAP");
			this._executeMapStartCallbacks();
		}
	},
	setAssetTypeMax: function(assetType, num) {
		state.typesLoading[assetType] = num;
	},
	onAssetTypeLoaded: function(assetType, fn) {
		var state = this._initMapRunState();
		if (typeof fn !== "function")
			throw new Error("onAssetTypeLoaded must supply a function!");
		state.typesFinalized[assetType] = fn;
	},
	
	queueForMapStart : function(callback) {
		var state = this._initMapRunState();
		
		if (!state.isStarted) {
			state.startQueue.push(callback);
		} else {
			callback();
		}
	},
	
	_executeMapStartCallbacks : function() {
		var state = this._initMapRunState();
		
		var callback;
		while (callback = state.startQueue.shift()) {
			callback();
		}
		state.isStarted = true;
		this.emit("map-started");
	},
	
	_executeMapEndCallbacks : function() {
		var state = this._initMapRunState();
		
		var callback;
		while (callback = state.endQueue.shift()) {
			callback();
		}
		// state.isStarted = true;
	},
	
	////////////////////////////////////////////////////////////////////////////
	
	changeCamera: function(camlbl) {
		var cam = this.cameras[camlbl];
		if (!cam) {
			console.log("Attempt to change to camera", camlbl, "failed! No such camera!");
		}
		this.camera = cam;
	},
	
	
	////////////////////////////////////////////////////////////////////////////
	// Logic Loop and Map Behaviors
	cameraLogics: null,
	
	logicLoop : function(delta){
		if (this.eventList) {
			for (var name in this.eventList) {
				var evt = this.eventList[name];
				if (!evt) continue;
				
				evt.emit("tick", delta);
			}
		}
		
		if (this.cameraLogics) {
			for (var i = 0; i < this.cameraLogics.length; i++) {
				this.cameraLogics[i].call(this, delta);
			}
		}
	},
});
module.exports = Map;


function __test__outputTree(obj, indent) {
	indent = (indent === undefined)? 0 : indent;
	
	var out = "["+obj.type+": ";
	out += ((!obj.name)?"<Unnamed>":obj.name);
	out += " ]";
	
	switch (obj.type) {
		case "Mesh":
			out += " (verts="+obj.geometry.vertices.length;
			out += " faces="+obj.geometry.faces.length;
			out += " mat="+obj.material.name;
			out += ")";
			break;
	}
	
	for (var i = 0; i < indent; i++) {
		out = "| " + out;
	}
	console.log(out);
	
	for (var i = 0; i < obj.children.length; i++) {
		__test__outputTree(obj.children[i], indent+1);
	}
}



},{"./model/map-setup":19,"./model/obj-loader":21,"events":2,"extend":"extend","inherits":"inherits","ndarray":5,"tpp-event":"tpp-event","tpp-pc":"tpp-pc"}],18:[function(require,module,exports){
// dungeon-map.js
// Definition of the Dorito Dungeon

// &#9660; &#9668; &#9650; &#9658; &#9660; &#9668; &#9650; &#9658; &#9660; &#9668; &#9650; &#9658; &#9660; &#9668; &#9650; &#9658; &#9660; &#9668; &#9650; &#9660; &#9668; &#9650; &#9658; &#9660; &#9668; &#9650; &#9658; &#9660; &#9668; &#9660; &#9668; &#9650; &#9658; &#9660; &#9668; &#9650;
// ▼ ◄ ▲ ► ▼ ◄ ▲ ► ▼ ◄ ▲ ► ▼ ◄ ▲ ► ▼ ◄ ▲ ▼ ◄ ▲ ► ▼ ◄ ▲ ► ▼ ◄ ▼ ◄ ▲ ► ▼ ◄ ▲

var inherits = require("inherits");
var extend = require("extend");

var Map = require("../map.js");
var PlayerChar = require("tpp-pc");
var setupMapRigging = require("./map-setup");


function DoritoDungeon() {
	Map.call(this, "xDungeon");
}
inherits(DoritoDungeon, Map);
extend(DoritoDungeon.prototype, {
	// Override to do nothing
	download: function() {}, 
	
	// Load model into the mapmodel property
	load: function() {
		this.markLoading("MAP_mapdata");
		
		this.metadata = {
			areaname : "The Dorito Dungeon",
			width: 50,
			height: 50,
			
			"layers" : [
				{"layer": 1, "3d": [1, 0, 0, -25.5,   0, 1, 0, 0,   0, 0, 1, -25.5,   0, 0, 0, 1], "2d": [5, 10] },
			],
			"warps" : [
				{ "loc" : [25, 25], "anim" : 0 },
			],
			
			"cameras": {
				0: { far: 300, },
			}
			// clearColor: 0x000000,
		};
		
		this.tiledata = {
			get: function(){ return 0; },
		}
		
		var doritodefs = [
			[5, 0], [5, 1], [5, 2], [5, 3],
			[6, 0], [6, 1], [6, 2], [6, 3],
			[7, 0], [7, 1], [7, 2], [7, 3],
		];
		
		var model = new THREE.Object3D();
		{ // Dorito BG
			var offsets = [];
			var geom = new THREE.Geometry();
			this.gc.collect(geom);
			for (var k = 0; k < 50 * doritodefs.length; k ++ ) {
				var vertex = new THREE.Vector3();
				vertex.x = Math.random() * 200 - 100;
				vertex.y = Math.random() * -50 - 1;
				vertex.z = Math.random() * 200 - 180;

				geom.vertices.push( vertex );
				
				var di = Math.floor(Math.random() * doritodefs.length);
				offsets.push(new THREE.Vector2(
					(doritodefs[di][0] * 16) / 128, 
					(doritodefs[di][1] * 16) / 64));
			}
			
			var tex = new THREE.Texture(AJAX_TEXTURE_IMG);
			tex.magFilter = THREE.NearestFilter;
			tex.minFilter = THREE.NearestFilter;
			tex.wrapS = THREE.RepeatWrapping;
			tex.wrapT = THREE.RepeatWrapping;
			tex.repeat = new THREE.Vector2(16/128, 16/64);
			// tex.offset = new THREE.Vector2(
			// 	(doritodefs[i][0] * 16) / 128,
			// 	(doritodefs[i][1] * 16) / 64);
			tex.generateMipmaps = false;
			tex.needsUpdate = true;
			
			// var mat = new THREE.PointCloudMaterial({
			// 	size: Math.random()*2+1, transparent: true,
			// 	map: tex,
			// });
			
			var mat = new DoritoCloudMaterial({
				map: tex, size: 10, scale: 100,
				offsets: offsets,
			});
			
			var cloud = new THREE.PointCloud(geom, mat);
			cloud.sortParticles = true
			model.add(cloud);
		}{
			var height = 60;
			
			var geom = new THREE.CylinderGeometry(400, 50, height);
			// for (var i = 0; i < geom.vertices.length; i++) {
			// 	var c = (geom.vertices[i].y + (height/2)) / height;
			// 	geom.colors.push(new THREE.Color( c, c * 0.5, 0 ));
			// }
			var faceidx = ['a', 'b', 'c'];
			for (var i = 0; i < geom.faces.length; i++) {
				var face = geom.faces[i];
				for (var j = 0; j < faceidx.length; j++) {
					var vert = geom.vertices[ face[faceidx[j]] ];
					
					var c = (vert.y + (height/2)) / height;
					face.vertexColors[j] = new THREE.Color(c, c * 0.5, 0);
				}
			}
			
			console.log(geom.colors);
			geom.colorsNeedUpdate = true;
			
			var mat = new THREE.MeshBasicMaterial({
				side: THREE.BackSide,
				vertexColors: THREE.VertexColors,
				depthWrite: false,
			});
			
			var bg = new THREE.Mesh(geom, mat);
			bg.renderDepth = 10;
			bg.position.y = -50;
			model.add(bg);
		}
		this.mapmodel = model;
		
		this._init();
		this.markLoadFinished("MAP_mapdata");
	},
	
	_init : function(){
		var self = this;
		this.scene = new THREE.Scene();
		this.cameras = {};
		
		if (!window.player) {
			window.player = new PlayerChar();
		}
		
		this.scene.add(this.mapmodel);
		
		this.cameraLogics = [];
		setupMapRigging(this);
		//NOTE: No lights
		
		// this.scene.add(
		// 	// mSetup.camera.gen4.call(this, {
		// 	// 	"type" : "gen4",
				
		// 	// })
		// );
		
		this.queueForMapStart(function() {
			SoundManager.playMusic("m_tornworld");
			UI.skrim._nextOpts = {
				speed : 0.2, //This will override the speed of the fadein done by the map manager.
			}; 
			// UI.fadeOut(0.2);
		});
		
		threeRenderer.setClearColorHex( 0x000000 );
		
		// Map Model is now ready
		
		this._initEventMap();
		
		this.emit("map-ready");
		
	},
	
	__loadScript : function(t) {
		if (t != "l") return; //Local only
		
		// Add local events
		//TODO Add Gmann here to take you back to the main world
	},
	
	canWalkBetween : function(srcx, srcy, destx, desty, ignoreEvents) {
		if (Math.abs(srcx - destx) + Math.abs(srcy - desty) != 1) return false;
		
		if (destx < 0 || destx >= this.metadata.width) return false;
		if (desty < 0 || desty >= this.metadata.height) return false;
		
		if (!ignoreEvents) { //check for the presense of events
			var evts = this.eventMap.get(destx, desty);
			if (evts) {
				for (var i = 0; i < evts.length; i++) {
					if (!evts[i].canWalkOn()) return false;
				}
			}
		}
		
		return true;
	},
});

module.exports = DoritoDungeon;


function DoritoCloudMaterial(texture, opts) {
	if ($.isPlainObject(texture) && opts === undefined) {
		opts = texture; texture = null;
	}
	
	this.map = texture || opts.texture || opts.map || new THREE.Texture();
	this.offsets = opts.offsets || [];
	this.repeat = opts.repeat || this.map.repeat;
	
	this.size = opts.size || 1;
	this.scale = opts.scale || 1;
	
	var params = this._createMatParams(opts);
	THREE.ShaderMaterial.call(this, params);
	this.type = "DoritoCloudMaterial";
	
	this.transparent = (opts.transparent !== undefined)? opts.transparent : true;
	this.alphaTest = 0.05;
}
inherits(DoritoCloudMaterial, THREE.ShaderMaterial);
extend(DoritoCloudMaterial.prototype, {
	map : null,
	
	_createMatParams : function() {
		var params = {
			attributes: {
				offset:		{ type: 'v2', value: this.offsets },
			},
			
			uniforms : {
				repeat:     { type: 'v2', value: this.repeat },
				map:		{ type: "t", value: this.map },
				
				size:		{ type: "f", value: this.size },
				scale:		{ type: "f", value: this.scale },
			},
		};
		
		params.vertexShader = this._vertShader;
		params.fragmentShader = this._fragShader;
		return params;
	},
	
	_vertShader: [
		"uniform float size;",
		"uniform float scale;",
	
		"attribute vec2 offset;",
		
		"varying vec2 vOffset;",
		
		"void main() {",
			"vOffset = offset;",
			"vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );",

			"gl_PointSize = size * ( scale / length( mvPosition.xyz ) );",
			"gl_Position = projectionMatrix * mvPosition;",
		"}",
	].join("\n"),
	
	_fragShader: [
		"uniform sampler2D map;",
		"uniform vec2 repeat;",
		
		"varying vec2 vOffset;",
		
		"void main() {",
			"vec2 uv = vec2( gl_PointCoord.x, 1.0 - gl_PointCoord.y );",
			"vec4 tex = texture2D( map, uv * repeat + vOffset );",
			
			'#ifdef ALPHATEST',
				'if ( tex.a < ALPHATEST ) discard;',
			'#endif',
			
			"gl_FragColor = tex;",
		"}",
	].join("\n"),
	
});
},{"../map.js":17,"./map-setup":19,"extend":"extend","inherits":"inherits","tpp-pc":"tpp-pc"}],19:[function(require,module,exports){
// map-setup.js
// Defines some of the setup functions for Map.js in a separate file, for organization

var extend = require("extend");

function setupMapRigging(map) {
	{	// Setup Lighting Rigging
		var lightdef = extend({ "type": "int", "default": {} }, map.metadata.lighting);
		
		var rig = setupLighting(map, lightdef);
		map.scene.add(rig);
	}
	
	{	// Setup Shadow Map Rigging
		var shadowdef = extend({}, map.metadata.shadowmap);
		
		if ($.isPlainObject(shadowdef)) {
			shadowdef = [shadowdef];
		}
		
		var rig = setupShadowMaps(map, shadowdef);
		map.scene.add(rig);
	}
	
	{	// Setup Camera Rigging
		var camdef = extend({ "0": {} }, map.metadata.cameras);
		
		var rig = setupCameras(map, camdef);
		map.scene.add(rig);
	}
	
}
module.exports = setupMapRigging;


function setupLighting(map, def) {
	var node = new THREE.Object3D();
	node.name = "Lighting Rig";
	
	var light;
	var ORIGIN = new THREE.Vector3(0, 0, 0);
	
	if (def.type == "int") {
		// Setup default interior lighting rig
		var intensity = def["default"].intensity || 1.4;
		var skyColor = def["default"].skyColor || 0xFFFFFF;
		var groundColor = def["default"].groundColor || 0x111111;
		
		light = new THREE.HemisphereLight(skyColor, groundColor, intensity);
		
		var cp = def["default"].position || [-4, 4, 4];
		light.position.set(cp[0], cp[1], cp[2]);
		
		light.lookAt(ORIGIN);
		node.add(light);
	}
	else if (def.type == "ext") {
		// Setup default exterior lighting rig, with sun movement
		var intensity = def["default"].intensity || 1.4;
		var skyColor = def["default"].skyColor || 0xFFFFFF;
		var groundColor = def["default"].groundColor || 0x111111;
		
		light = new THREE.HemisphereLight(skyColor, groundColor, intensity);
		
		var cp = def["default"].position || [-4, 4, 4];
		light.position.set(cp[0], cp[1], cp[2]);
		
		light.lookAt(ORIGIN);
		node.add(light);
		
		//TODO setup sun movement
	}
	
	return node;
}



function setupShadowMaps(map, shadowMaps) {
	var node = new THREE.Object3D();
	node.name = "Shadow Casting Rig";
	
	for (var i = 0; i < shadowMaps.length; i++) {
		var shm = shadowMaps[i];
		
		light = new THREE.DirectionalLight();
		light.position.set(0, 75, 1);
		light.castShadow = true;
		light.onlyShadow = true;
		light.shadowDarkness = 0.7;
		light.shadowBias = 0.001;
		
		light.shadowCameraNear = shm.near || 1;
		light.shadowCameraFar = shm.far || 200;
		light.shadowCameraTop = shm.top || 30;
		light.shadowCameraBottom = shm.bottom || -30;
		light.shadowCameraLeft = shm.left || -30;
		light.shadowCameraRight = shm.right || 30;
		
		light.shadowMapWidth = shm.width || 512;
		light.shadowMapHeight = shm.height || 512;
		
		// light.shadowCameraVisible = true;
		node.add(light);
		
		DEBUG._shadowCamera = light;
	} 
	
	return node;
}



var camBehaviors = {
	none: function(){},
	followPlayer : function(cdef, cam, camRoot) {
		return function(delta) {
			// if (!player || !player.avatar_node) return;
			camRoot.position.set(player.avatar_node.position);
			//TODO negate moving up and down with jumping
		};
	},
	followPlayerX: function(cdef, came, camRoot) {
		var zaxis = cdef["zaxis"] || 0;
		var xmax = cdef["xmax"] || 1000;
		var xmin = cdef["xmin"] || -1000;
		
		return function(delta) {
			camRoot.position.x = Math.max(xmin, Math.min(xmax, player.avatar_node.position.x));
			camRoot.position.y = player.avatar_node.position.y;
			camRoot.position.z = zaxis;
		};
	},
	followPlayerZ: function(cdef, came, camRoot) {
		var xaxis = cdef["xaxis"] || 0;
		var zmax = cdef["zmax"] || 1000;
		var zmin = cdef["zmin"] || -1000;
		
		return function(delta) {
			camRoot.position.x = xaxis;
			camRoot.position.y = player.avatar_node.position.y;
			camRoot.position.z = Math.max(zmin, Math.min(zmax, player.avatar_node.position.z));
		};
	},
	
	softFollowZ: function(cdef, came, camRoot) {
		var xaxis = cdef["xaxis"] || 0; //axis along which to keep the camera
		var dev = cdef["dev"] || 5; //max deviation of the cam position from this axis
		var lookrange = cdef["lookrange"] || 10; //max deviation of the lookat position from this axis
		
		var zmax = cdef["zmax"] || 1000;
		var zmin = cdef["zmin"] || -1000;
		
		return function(delta) {
			var offpercent = (player.avatar_node.position.x - xaxis) / lookrange;
			
			camRoot.position.x = xaxis + (offpercent * dev);
			camRoot.position.y = player.avatar_node.position.y;
			camRoot.position.z = Math.max(zmin, Math.min(zmax, player.avatar_node.position.z));
		};
	},
	
	// Follow along an axis, tilt to look at the player as they move off the center line
	softFollowZYTilt: function(cdef, came, camRoot) {
		var xaxis = cdef["xaxis"] || 0; //axis along which to keep the camera
		var dev = cdef["dev"] || 5; //max deviation of the cam position from this axis
		var lookrange = cdef["lookrange"] || 10; //max deviation of the lookat position from this axis
		var notilt = cdef["notilt"] || 0; //deviation of cam position that doesn't tilt
		var lookoff = cdef["lookat"] || [0, 0.8, 0];
		
		var zmax = cdef["zmax"] || 1000;
		var zmin = cdef["zmin"] || -1000;
		var ymax = cdef["y@zmax"] || 2;
		var ymin = cdef["y@zmin"] || 4;
		
		return function(delta) {
			var yper = (camRoot.position.z - zmin) / (zmax - zmin);
			
			if (player.avatar_node.position.x < xaxis + notilt 
				&& player.avatar_node.position.x > xaxis - notilt) 
			{
				camRoot.position.x = player.avatar_node.position.x;
				camRoot.position.y = (ymin + (ymax-ymin)*yper) + player.avatar_node.position.y;
				console.log(yper, camRoot.position.y);
				camRoot.position.z = Math.max(zmin, Math.min(zmax, player.avatar_node.position.z));
				
				var lx = lookoff[0];
				var ly = lookoff[1];
				var lz = lookoff[2];
				came.lookAt(new THREE.Vector3(-lx, ly, lz));
			}
			else
			{
				var baseaxis = (player.avatar_node.position.x > xaxis)? xaxis+notilt : xaxis-notilt;
				var offpercent = (player.avatar_node.position.x - baseaxis) / lookrange;
				
				camRoot.position.x = baseaxis + (offpercent * dev);
				camRoot.position.y = (ymin - (ymax-ymin)*yper) + player.avatar_node.position.y;
				camRoot.position.z = Math.max(zmin, Math.min(zmax, player.avatar_node.position.z));
				
				var lx = camRoot.position.x - player.avatar_node.position.x + lookoff[0];
				var ly = camRoot.position.y - player.avatar_node.position.y + lookoff[1];
				var lz = camRoot.position.z - player.avatar_node.position.z + lookoff[2];
				came.lookAt(new THREE.Vector3(-lx, -ly, lz));
			}
		};
	},
	
	// Follow along an axis, tilt to look at the player as they move off the center line
	softFollowZTilt: function(cdef, came, camRoot) {
		var xaxis = cdef["xaxis"] || 0; //axis along which to keep the camera
		var dev = cdef["dev"] || 5; //max deviation of the cam position from this axis
		var lookrange = cdef["lookrange"] || 10; //max deviation of the lookat position from this axis
		var notilt = cdef["notilt"] || 0; //deviation of cam position that doesn't tilt
		var lookoff = cdef["lookat"] || [0, 0.8, 0];
		
		var zmax = cdef["zmax"] || 1000;
		var zmin = cdef["zmin"] || -1000;
		
		return function(delta) {
			if (player.avatar_node.position.x < xaxis + notilt 
				&& player.avatar_node.position.x > xaxis - notilt) 
			{
				camRoot.position.x = player.avatar_node.position.x;
				camRoot.position.y = player.avatar_node.position.y;
				camRoot.position.z = Math.max(zmin, Math.min(zmax, player.avatar_node.position.z));
			}
			else
			{
				var baseaxis = (player.avatar_node.position.x > xaxis)? xaxis+notilt : xaxis-notilt;
				var offpercent = (player.avatar_node.position.x - baseaxis) / lookrange;
				
				camRoot.position.x = baseaxis + (offpercent * dev);
				camRoot.position.y = player.avatar_node.position.y;
				camRoot.position.z = Math.max(zmin, Math.min(zmax, player.avatar_node.position.z));
				
				var lx = camRoot.position.x - player.avatar_node.position.x + lookoff[0];
				var ly = camRoot.position.y - player.avatar_node.position.y + lookoff[1];
				var lz = camRoot.position.z - player.avatar_node.position.z + lookoff[2];
				came.lookAt(new THREE.Vector3(-lx, ly, lz));
			}
		};
	},
	
	// Follow along an axis, tilt the opposite direction the player has gone
	softFollowZTiltOpposite: function(cdef, came, camRoot) {
		var xaxis = cdef["xaxis"] || 0; //axis along which to keep the camera
		var dev = cdef["dev"] || 5; //max deviation of the cam position from this axis
		var lookrange = cdef["lookrange"] || 10; //max deviation of the lookat position from this axis
		var lookoff = cdef["lookat"] || [0, 0.8, 0];
		
		var zmax = cdef["zmax"] || 1000;
		var zmin = cdef["zmin"] || -1000;
		
		return function(delta) {
			var offpercent = (player.avatar_node.position.x - xaxis) / lookrange;
			
			camRoot.position.x = xaxis - (offpercent * dev);
			camRoot.position.y = player.avatar_node.position.y;
			camRoot.position.z = Math.max(zmin, Math.min(zmax, player.avatar_node.position.z));
			
			var lx = camRoot.position.x - player.avatar_node.position.x + lookoff[0];
			var ly = camRoot.position.y - player.avatar_node.position.y + lookoff[1];
			var lz = camRoot.position.z - player.avatar_node.position.z + lookoff[2];
			came.lookAt(new THREE.Vector3(-lx, ly, lz));
		};
	},
};

function setupCameras(map, camlist) {
	var scrWidth = $("#gamescreen").width();
	var scrHeight = $("#gamescreen").height();
	
	var node = new THREE.Object3D();
	node.name = "Camera Rig";

	for (var cname in camlist) {
		var c;
		
		if (camlist[cname].type == "ortho") {
			c = new THREE.OrthographicCamera(
				scrWidth/-2, scrWidth/2, scrHeight/2, scrHeight/-2, 0.1, 150);
			
			var cp = camlist[cname].position || [0, 100, 0];
			c.position.set(cp[0], cp[1], cp[2]);
			
			c.roation.x = -Math.PI / 2; //TODO lookAt?
			
		} else {
			c = new THREE.PerspectiveCamera(
					camlist[cname].fov || 55, 
					scrWidth / scrHeight, 
					camlist[cname].near || 0.1, 
					camlist[cname].far || 150);
			
			var cp = camlist[cname].position || [0, 5.45, 5.3];
			c.position.set(cp[0], cp[1], cp[2]);
			
			if (camlist[cname].rotation) {
				var cl = camlist[cname].rotation || [-45, 0, 0];
				cl[0] *= Math.PI / 180;
				cl[1] *= Math.PI / 180;
				cl[2] *= Math.PI / 180;
				c.rotation.set(cl[0], cl[1], cl[2]);
			} else {
				var cl = camlist[cname].lookat || [0, 0.8, 0];
				c.lookAt(new THREE.Vector3(cl[0], cl[1], cl[2]));
			}
		}
		
		c.name = "Camera ["+cname+"]";
		c.my_camera = c;
		
		var croot;
		if (!camlist[cname].fixedCamera) {
			croot = new THREE.Object3D();
			croot.add(c);
			croot.my_camera = c;
		}
		
		var cb = camlist[cname].behavior || "followPlayer";
		if (!camBehaviors[cb]) {
			console.error("Invalid Camera Behavior Defined! ", cb);
			cb = "followPlayer";
		}
		var cb = camBehaviors[cb].call(map, camlist[cname], c, croot);
		if (cb) {
			map.cameraLogics.push(cb);
		}
		
		node.add(croot || c);
		map.cameras[cname] = c;
		if (cname == 0) map.camera = c;
	}
	
	if (!map.camera) throw new Error("No cameras defined!");
	
	return node;
}



},{"extend":"extend"}],20:[function(require,module,exports){
// mtl-loader.js
// A THREE.js wavefront Material Library loader
// Copied mostly wholesale from the three.js examples folder.
// Original authors: mrdoob, angelxuanchang

var moment = require("moment");
var inherits = require("inherits");
var extend = require("extend");
var EventEmitter = require("events").EventEmitter;


function MtlLoader(mtlfile, loadTexture, opts) {
	EventEmitter.call(this);
	extend(this, opts);
	
	this.mtlfile = mtlfile;
	this.loadTexture = loadTexture;
	
	this.gc = opts.gc;
}
inherits(MtlLoader, EventEmitter);
extend(MtlLoader.prototype, {
	loadTexture : null,
	mtlfile : null,
	
	load: function() {
		if (!this.mtlfile) throw new Error("No MTL file given!");
		if (!this.loadTexture) throw new Error("No loadTexture function given!");
		
		var scope = this;
		var parsed = scope.parse(this.mtlfile);
		this.emit("load", parsed);
	},
	
	parse : function(text) {
		var lines = text.split( "\n" );
		var info = {};
		var delimiter_pattern = /\s+/;
		var materialsInfo = {};
		
		try {
			for (var i = 0; i < lines.length; i ++) {
				var line = lines[i];
				line = line.trim();
				
				if (line.length === 0 || line.charAt( 0 ) === '#') continue; //ignore blank lines and comments
				
				// Find where the first space is in a line and split off key and value based on that
				var pos = line.indexOf(' ');
				
				var key = (pos >= 0) ? line.substring(0, pos) : line;
				key = key.toLowerCase();
				
				var value = (pos >= 0) ? line.substring(pos + 1) : "";
				value = value.trim();
				
				if (key === "newmtl") { // New material definition
					info = { name: value };
					materialsInfo[ value ] = info;
					
				} else if ( info ) { // If we are working with a material
					if (key === "ka" || key === "kd" || key === "ks") {
						var ss = value.split(delimiter_pattern, 3);
						info[key] = [parseFloat(ss[0]), parseFloat(ss[1]), parseFloat(ss[2])];
					} else {
						info[key] = value;
					}
				}
			}
			// Once we've parsed out all the materials, load them into a "creator"
			console.log("Parsed Materials:", Object.keys(materialsInfo).length, materialsInfo.length, materialsInfo);
			var matCreator = new MaterialCreator(this.loadTexture, this.gc);
			matCreator.setMaterials(materialsInfo);
			return matCreator;
		} catch (e) {
			console.error("MTL", e);
			this.emit("error", e);
		}
	},
	
});

/*
function ensurePowerOfTwo_ ( image ) {
	if ( ! THREE.Math.isPowerOfTwo( image.width ) || ! THREE.Math.isPowerOfTwo( image.height ) ) {
		var canvas = document.createElement( "canvas" );
		canvas.width = nextHighestPowerOfTwo_( image.width );
		canvas.height = nextHighestPowerOfTwo_( image.height );
		
		var ctx = canvas.getContext("2d");
		ctx.drawImage( image, 0, 0, image.width, image.height, 0, 0, canvas.width, canvas.height );
		return canvas;
	}
	
	return image;
}
*/
function nextHighestPowerOfTwo_( x ) {
	--x;
	for ( var i = 1; i < 32; i <<= 1 ) {
		x = x | x >> i;
	}
	return x + 1;
}


// The original version came with several options, which we can simply assume will be the defaults
//		side: Always apply to THREE.FrontSide
//		wrap: This will actually be specified IN the MTL, because it has that support
//		normalizeRGB: false - assumed
//		ignoreZeroRGB: false 
//		invertTransparency: false - d = 1 is opaque
function MaterialCreator(loadTexture, gc) {
	this.loadTexture = loadTexture;
	this.gc = gc;
}
MaterialCreator.prototype = {
	setMaterials : function(matInfo) {
		this.materialsInfo = matInfo;
		this.materials = {};
		this.materialsArray = [];
		this.nameLookup = {};
	},
	
	preload : function() {
		try {
		for (var mn in this.materialsInfo) {
			this.create(mn);
		}
		} catch (e) {
			console.error(e);
		}
	},
	
	getIndex : function(matName) {
		return this.nameLookup[matName];
	},
	
	getAsArray : function() {
		var index = 0;
		for (var mn in this.materialsInfo) {
			this.materialsArray[index] = this.create(mn);
			this.nameLookup[mn] = index;
			index++;
		}
		return this.materialsArray;
	},
	
	create : function (matName) {
		if (this.materials[matName] === undefined) {
			console.log("Creating Material: ", matName);
			this.createMaterial_(matName);
		}
		return this.materials[matName];
	},
	
	createMaterial_ : function(matName) {
		var scope = this;
		var mat = this.materialsInfo[matName];
		var params = {
			name: matName,
			side: THREE.FrontSide,
		};
		
		for (var prop in mat) {
			var value = mat[prop];
			switch (prop.toLowerCase()) {
				case "name":
					params['name'] = value;
					break;
				
				case "kd": // Diffuse color
					params['diffuse'] = new THREE.Color().fromArray(value);
					break;
				
				case "ka": // Ambient color
					params['ambient'] = new THREE.Color().fromArray(value);
					break;
				
				case "ks": // Specular color
					params['specular'] = new THREE.Color().fromArray(value);
					break;
				
				case "ke": // Emission (non-standard)
					params['emissive'] = new THREE.Color(value, value, value);
					break;
				
				case "map_kd": // Diffuse texture map
					var args = __splitTexArg(value);
					var map = __textureMap(args);
					if (map) params['map'] = map;
					break;
					
				case "map_ka": // Ambient texture map
					var args = __splitTexArg(value);
					var map = __textureMap(args);
					if (map) params['lightMap'] = map;
					break;
				
				case "map_ks": // Specular map
					var args = __splitTexArg(value);
					var map = __textureMap(args);
					if (map) params['specularMap'] = map;
					break;
				
				case "map_d": // Alpha texture map
					var args = __splitTexArg(value);
					var map = __textureMap(args);
					if (map) params['alphaMap'] = map;
					break;
				
				case "bump":
				case "map_bump": // Bump map
					var args = __splitTexArg(value);
					var map = __textureMap(args);
					if (map) params['bumpMap'] = map;
					
					if (args.bm) params['bumpScale'] = args.bm;
					break;
				
				case "ns": // Specular exponent
					params['shininess'] = value;
					break;
				
				case "d": // Transparency
					if (value < 1) {
						params['transparent'] = true;
						params['opacity'] = value;
						params['alphaTest'] = 0.05;
					}
					break;
					
				default:
					// console.log("Unhandled MTL data:", prop, "=", value);
					break;
			}
		}
		
		if ( params[ 'diffuse' ] ) {
			if ( !params[ 'ambient' ]) params[ 'ambient' ] = params[ 'diffuse' ];
			params[ 'color' ] = params[ 'diffuse' ];
		}
		
		console.log("MATName", matName);
		this.materials[ matName ] = new THREE.MeshPhongMaterial( params ); //per pixel lighting
		// this.materials[ matName ] = new THREE.MeshLambertMaterial( params ); //per vertex lighting
		scope.gc.collect( this.materials[matName] );
		return this.materials[ matName ];
		
		
		function __textureMap(args) {
			console.log("TEX MAP", args.map);
			
			if (args.timeApplicable) {
				var now = moment();
				if (moment.isBefore(args.timeApplicable[0]) || moment.isAfter(args.timeApplicable[1])) {
					return null; //Ignore this map, if time is not applicable to it
				}
			}
			
			//TODO handle cubmaps! new THREE.Texture([set of 6 images]);
			
			//TODO look into http://threejs.org/docs/#Reference/Textures/CompressedTexture
			// Using ".dds" format?
			
			var image = new Image();
			image.src = DEF_TEXTURE;
			var texture = new THREE.Texture(image);
			texture.name = args.src;
			scope.gc.collect(texture);
			
			console.log("CREATE IMG: ", args.src);
			currentMap.markLoading("MTL_"+args.src, "MAPTEX");
			scope.loadTexture(args.src, function(url){
				// Even though the images are in memory, apparently they still aren't "loaded"
				// at the point when they are assigned to the src attribute.
				console.log("FINISH CREATE IMG: ", args.src);
				image.on("load", function(){
					texture.needsUpdate = true;
					currentMap.markLoadFinished("MTL_"+args.src, "MAPTEX");
				});
				image.src = url;
				// image = ensurePowerOfTwo_( image );
				
				texture.image = image;
				texture.needsUpdate = true;
				
			});
			
			if (!args.clamp) { //undefined or false
				texture.wrapS = THREE.RepeatWrapping;
				texture.wrapT = THREE.RepeatWrapping;
			} else {
				texture.wrapS = THREE.ClampToEdgeWrapping;
				texture.wrapT = THREE.ClampToEdgeWrapping;
			}
			
			texture.magFilter = THREE.NearestFilter;
			texture.minFilter = THREE.NearestMipMapLinearFilter;
			
			if (args['o_u'] || args['o_v']) {
				texture.offset = new Vector2(args['o_u'] || 0, args['o_v'] || 0);
			}
			
			// texture.anisotropy = 16;
			
			return texture;
		}
		
		function __splitTexArg(arg) {
			var comps = arg.split(" ");
			var texDef = {};
			// http://en.wikipedia.org/wiki/Wavefront_.obj_file#Texture_options
			for (var i = 0; i < comps.length; i++) {
				switch (comps[i]) {
					case "-blendu": 
						texDef["blendu"] = (comps[i+1] != "off");
						i += 1; break; //consume the argument
					case "-blendv":
						texDef["blendv"] = (comps[i+1] != "off");
						i += 1; break;
					case "-boost":
						texDef["boost"] = parseFloat(comps[i+1]);
						i += 1; break;
					case "-mm":
						texDef["mm_base"] = parseFloat(comps[i+1]);
						texDef["mm_gain"] = parseFloat(comps[i+2]);
						i += 2; break;
					case "-o":
						texDef["o_u"] = parseFloat(comps[i+1]);
						texDef["o_v"] = parseFloat(comps[i+2]); //technically optional
						texDef["o_w"] = parseFloat(comps[i+3]); //technically optional
						i += 3; break;
					case "-s":
						texDef["s_u"] = parseFloat(comps[i+1]);
						texDef["s_v"] = parseFloat(comps[i+2]); //technically optional
						texDef["s_w"] = parseFloat(comps[i+3]); //technically optional
						i += 3; break;
					case "-t":
						texDef["t_u"] = parseFloat(comps[i+1]);
						texDef["t_v"] = parseFloat(comps[i+2]); //technically optional
						texDef["t_w"] = parseFloat(comps[i+3]); //technically optional
						i += 3; break;
					case "-texres":
						texDef["texres"] = comps[i+1];
						i += 1; break;
					case "-clamp":
						texDef["clamp"] = (comps[i+1] == "on"); //default off
						i += 1; break;
					case "-bm":
						texDef["bm"] = parseFloat(comps[i+1]);
						i += 1; break;
					case "-imfchan":
						texDef["imfchan"] = comps[i+1];
						i += 1; break;
					case "-type":
						texDef["type"] = comps[i+1];
						i += 1; break;
					
					// Custom properties
					case "-timeapp":  //Time applicable
						// -timeapp [startTime] [endTime]
						//   where the times are formatted as follows: m00[d00[h00[m00]]]
						//   each section in sequence is optional
						// startTime = start of the time, inclusive, when the given texture is applicable
						// endTime = end of the time, inclusive, when the given texture is applicable
						var startTime = comps[i+1];
						var endTime = comps[i+2];
						i += 2;
						
						//texDef["timeapp"] = [comps[i+1], comps[i+2]];
						var st, end;
						{
							var res = /m(\d\d)(?:d(\d\d)(?:h(\d\d)(?:m(\d\d))?)?)?/i.exec(startTime);
							if (!res) throw new Error("Invalid timestamp for -timeapp startTime");
							st = moment().month(res[1]).startOf("month");
							if (res[2]) { st.date(res[2]); }
							if (res[3]) { st.hour(res[3]); }
							if (res[4]) { st.minute(res[4]); }
						}{
							var res = /m(\d\d)(?:d(\d\d)(?:h(\d\d)(?:m(\d\d))?)?)?/i.exec(endTime);
							if (!res) throw new Error("Invalid timestamp for -timeapp endTime");
							end = moment().month(res[1]).endOf("month");
							if (res[2]) { end.date(res[2]).endOf("day"); }
							if (res[3]) { end.hour(res[3]).endOf("hour"); }
							if (res[4]) { end.minute(res[4]).endOf("minute"); }
							
							if (end.isBefore(st)) end.add(1, "year");
						}
						texDef["timeApplicable"] = [st, end];
						
						break;
					
					default:
						//Assume the source is the last thing we'll find
						texDef.src = comps.slice(i).join(" ");
						texDef.args = comps.slice(0, i).join(" ");
						return texDef;
				}
			}
			return texDef;
		}
	},
};

module.exports = MtlLoader;

},{"events":2,"extend":"extend","inherits":"inherits","moment":4}],21:[function(require,module,exports){
// obj-loader.js
// A THREE.js wavefront object loader
// Copied mostly wholesale from the three.js examples folder.
// Original authors: mrdoob, angelxuanchang

var moment = require("moment");
var inherits = require("inherits");
var extend = require("extend");
var EventEmitter = require("events").EventEmitter;

var MtlLoader = require("./mtl-loader");

function ObjLoader(objfile, mtlfile, fileSys, opts) {
	EventEmitter.call(this);
	extend(this, opts);
	
	this.objfile = objfile;
	this.mtlfile = mtlfile;
	this.fileSys = fileSys;
	
	if (opts.gc) {
		if (typeof opts.gc == "string")
			this.gc = GC.getBin(opts.gc);
		else
			this.gc = opts.gc;
	} else {
		this.gc = GC.getBin();
	}
	
};
inherits(ObjLoader, EventEmitter);
extend(ObjLoader.prototype, {
	objfile : null,
	mtlfile : null,
	fileSys : null,
	
	load: function() {
		if (!(this.objfile && this.mtlfile)) 
			throw new Error("No OBJ file or MTL file given!");
		
		var scope = this;
		var mtlLoader = new MtlLoader(this.mtlfile, this.fileSys, {
			"gc": this.gc,
		});
		mtlLoader.on("load", function(matLib) {
			
			matLib.preload();
			
			var object = scope.parse(scope.objfile);
			object.traverse(function(object){
				if (object instanceof THREE.Mesh) {
					if (object.material.name) {
						var mat = matLib.create(object.material.name);
						if (mat) object.material = mat;
					}
					object.receiveShadow = true;
				}
			});
			object.name = "Loaded Mesh";
			
			scope.emit("load", object);
		});
		mtlLoader.on("error", function(e){
			scope.emit("error", e);
		});
		mtlLoader.load();
	},
});

//These would be CONSTS in node.js, but we're in the browser now:

// v float float float
var VERTEX_PATTERN = /v( +[\d|\.|\+|\-|e]+)( +[\d|\.|\+|\-|e]+)( +[\d|\.|\+|\-|e]+)/;

// vn float float float
var NORMAL_PATTERN = /vn( +[\d|\.|\+|\-|e]+)( +[\d|\.|\+|\-|e]+)( +[\d|\.|\+|\-|e]+)/;

// vt float float
var UV_PATTERN = /vt( +[\d|\.|\+|\-|e]+)( +[\d|\.|\+|\-|e]+)/;

// f vertex vertex vertex ...
var FACE_PATTERN1 = /f( +\d+)( +\d+)( +\d+)( +\d+)?/;

// f vertex/uv vertex/uv vertex/uv ...
var FACE_PATTERN2 = /f( +(\d+)\/(\d+))( +(\d+)\/(\d+))( +(\d+)\/(\d+))( +(\d+)\/(\d+))?/;

// f vertex/uv/normal vertex/uv/normal vertex/uv/normal ...
var FACE_PATTERN3 = /f( +(\d+)\/(\d+)\/(\d+))( +(\d+)\/(\d+)\/(\d+))( +(\d+)\/(\d+)\/(\d+))( +(\d+)\/(\d+)\/(\d+))?/;

// f vertex//normal vertex//normal vertex//normal ... 
var FACE_PATTERN4 = /f( +(\d+)\/\/(\d+))( +(\d+)\/\/(\d+))( +(\d+)\/\/(\d+))( +(\d+)\/\/(\d+))?/


ObjLoader.prototype.parse = function(data) {
	var self = this;
	
	var face_offset = 0;
	
	var group = new THREE.Object3D();
	var object = group;
	
	var geometry = new THREE.Geometry();
	var material = new THREE.MeshLambertMaterial();
	var mesh = new THREE.Mesh( geometry, material );
	
	var vertices = [];
	var verticesCount = 0;
	var normals = [];
	var uvs = [];
	
	//Begin parsing here

	var lines = data.split( "\n" );
	for ( var i = 0; i < lines.length; i ++ ) {
		var line = lines[ i ];
		line = line.trim();
		
		var result;
		
		if (line.length == 0 || line.charAt(0) == "#") 
			continue;
		else 
		if ((result = VERTEX_PATTERN.exec(line)) !== null) {
			// ["v 1.0 2.0 3.0", "1.0", "2.0", "3.0"]
			vertices.push(vector(
				parseFloat(result[ 1 ]),
				parseFloat(result[ 2 ]),
				parseFloat(result[ 3 ])
			));
		} else
		if ((result = NORMAL_PATTERN.exec(line)) !== null ) {
			// ["vn 1.0 2.0 3.0", "1.0", "2.0", "3.0"]
			normals.push(vector(
				parseFloat(result[ 1 ]),
				parseFloat(result[ 2 ]),
				parseFloat(result[ 3 ])
			));
		} else
		if ((result = UV_PATTERN.exec(line)) !== null ) {
			// ["vt 0.1 0.2", "0.1", "0.2"]
			uvs.push(uv(
				parseFloat(result[ 1 ]),
				parseFloat(result[ 2 ])
			));
		} else
		if ((result = FACE_PATTERN1.exec(line)) !== null ) {
			// ["f 1 2 3", "1", "2", "3", undefined]
			handle_face_line([ result[ 1 ], result[ 2 ], result[ 3 ], result[ 4 ] ]);
		} else 
		if ((result = FACE_PATTERN2.exec(line)) !== null ) {
			// ["f 1/1 2/2 3/3", " 1/1", "1", "1", " 2/2", "2", "2", " 3/3", "3", "3", undefined, undefined, undefined]
			handle_face_line(
				[ result[ 2 ], result[ 5 ], result[ 8 ], result[ 11 ] ], //faces
				[ result[ 3 ], result[ 6 ], result[ 9 ], result[ 12 ] ] //uv
			);
		} else
		if ((result = FACE_PATTERN3.exec(line)) !== null ) {
			// ["f 1/1/1 2/2/2 3/3/3", " 1/1/1", "1", "1", "1", " 2/2/2", "2", "2", "2", " 3/3/3", "3", "3", "3", undefined, undefined, undefined, undefined]
			handle_face_line(
				[ result[ 2 ], result[ 6 ], result[ 10 ], result[ 14 ] ], //faces
				[ result[ 3 ], result[ 7 ], result[ 11 ], result[ 15 ] ], //uv
				[ result[ 4 ], result[ 8 ], result[ 12 ], result[ 16 ] ] //normal
			);
		} else
		if ((result = FACE_PATTERN4.exec(line)) !== null ) {
			// ["f 1//1 2//2 3//3", " 1//1", "1", "1", " 2//2", "2", "2", " 3//3", "3", "3", undefined, undefined, undefined]
			handle_face_line(
				[ result[ 2 ], result[ 5 ], result[ 8 ], result[ 11 ] ], //faces
				[ ], //uv
				[ result[ 3 ], result[ 6 ], result[ 9 ], result[ 12 ] ] //normal
			);
		} else
		if ( /^o /.test(line)) {
			// object
			meshN();
			face_offset = face_offset + vertices.length;
			vertices = [];
			object = new THREE.Object3D();
			object.name = line.substring( 2 ).trim();
			group.add( object );
			
		} else
		if ( /^g /.test(line)) {
			// group
			// meshN( line.substring( 2 ).trim(), undefined );
			mesh.name = line.substring( 2 ).trim();
			
		} else 
		if ( /^usemtl /.test(line)) {
			// material
			meshN( undefined, line.substring( 7 ).trim() );
			
			// material = new THREE.MeshLambertMaterial();
			// material.name = line.substring( 7 ).trim();
			
			// mesh.material = material;

		} else 
		if ( /^mtllib /.test(line)) {
			// mtl file
			// if ( mtllibCallback ) {
			// 	var mtlfile = line.substring( 7 );
			// 	mtlfile = mtlfile.trim();
			// 	mtllibCallback( mtlfile );
			// }
			
		} else 
		if ( /^s /.test(line)) {
			// Smooth shading
		} else {
			console.log( "THREE.OBJMTLLoader: Unhandled line " + line );
		}
	}
	
	meshN(undefined, undefined); //Add last object
	return group;


	function meshN( meshName, materialName ) {
		if ( vertices.length > 0 && geometry.faces.length > 0 ) {
			geometry.vertices = vertices;
			
			geometry.mergeVertices();
			geometry.computeFaceNormals();
			geometry.computeBoundingBox();
			geometry.computeBoundingSphere();
			
			object.add( mesh );
			
			self.gc.collect(geometry);
			
			geometry = new THREE.Geometry();
			mesh = new THREE.Mesh( geometry, material );
			verticesCount = 0;
		}
		
		// if ( meshName !== undefined ) mesh.name = meshName;
		
		if ( materialName !== undefined ) {
			material = new THREE.MeshLambertMaterial();
			material.name = materialName;
			
			mesh.material = material;
		}
	}
	
	function add_face( a, b, c, normals_inds ) {
		if ( normals_inds === undefined ) {
			geometry.faces.push( face3(
				parseInt( a ) - (face_offset + 1),
				parseInt( b ) - (face_offset + 1),
				parseInt( c ) - (face_offset + 1)
			) );
		} else {
			geometry.faces.push( face3(
				parseInt( a ) - (face_offset + 1),
				parseInt( b ) - (face_offset + 1),
				parseInt( c ) - (face_offset + 1),
				[
					normals[ parseInt( normals_inds[ 0 ] ) - 1 ].clone(),
					normals[ parseInt( normals_inds[ 1 ] ) - 1 ].clone(),
					normals[ parseInt( normals_inds[ 2 ] ) - 1 ].clone()
				]
			) );
		}
	}
	
	function add_uvs( a, b, c ) {
		geometry.faceVertexUvs[ 0 ].push( [
			uvs[ parseInt( a ) - 1 ].clone(),
			uvs[ parseInt( b ) - 1 ].clone(),
			uvs[ parseInt( c ) - 1 ].clone()
		] );
	}
	
	function handle_face_line(faces, uvs, normals_inds) {
		if ( faces[ 3 ] === undefined ) {
			add_face( faces[ 0 ], faces[ 1 ], faces[ 2 ], normals_inds );
			if (!(uvs === undefined) && uvs.length > 0) {
				add_uvs( uvs[ 0 ], uvs[ 1 ], uvs[ 2 ] );
			}
			
		} else {
			if (!(normals_inds === undefined) && normals_inds.length > 0) {
				add_face( faces[ 0 ], faces[ 1 ], faces[ 3 ], [ normals_inds[ 0 ], normals_inds[ 1 ], normals_inds[ 3 ] ]);
				add_face( faces[ 1 ], faces[ 2 ], faces[ 3 ], [ normals_inds[ 1 ], normals_inds[ 2 ], normals_inds[ 3 ] ]);
			} else {
				add_face( faces[ 0 ], faces[ 1 ], faces[ 3 ]);
				add_face( faces[ 1 ], faces[ 2 ], faces[ 3 ]);
			}
						
			if (!(uvs === undefined) && uvs.length > 0) {
				add_uvs( uvs[ 0 ], uvs[ 1 ], uvs[ 3 ] );
				add_uvs( uvs[ 1 ], uvs[ 2 ], uvs[ 3 ] );
			}
		}
	}
};

//convience functions
function vector( x, y, z ) { return new THREE.Vector3( x, y, z ); }
function uv( u, v ) { return new THREE.Vector2( u, v ); }
function face3( a, b, c, normals ) { return new THREE.Face3( a, b, c, normals ); }


module.exports = ObjLoader;
},{"./mtl-loader":20,"events":2,"extend":"extend","inherits":"inherits","moment":4}],22:[function(require,module,exports){
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
},{"extend":"extend","raf":8,"tpp-controller":"tpp-controller"}],23:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlc1xcYnJvd3NlcmlmeVxcbm9kZV9tb2R1bGVzXFxicm93c2VyLXBhY2tcXF9wcmVsdWRlLmpzIiwic3JjXFxqc1xcdG9vbHNcXGNhc2luby5qcyIsIm5vZGVfbW9kdWxlc1xcYnJvd3NlcmlmeVxcbm9kZV9tb2R1bGVzXFxldmVudHNcXGV2ZW50cy5qcyIsIm5vZGVfbW9kdWxlc1xcYnJvd3NlcmlmeVxcbm9kZV9tb2R1bGVzXFxwcm9jZXNzXFxicm93c2VyLmpzIiwibm9kZV9tb2R1bGVzXFxtb21lbnRcXG1vbWVudC5qcyIsIm5vZGVfbW9kdWxlc1xcbmRhcnJheVxcbmRhcnJheS5qcyIsIm5vZGVfbW9kdWxlc1xcbmRhcnJheVxcbm9kZV9tb2R1bGVzXFxpb3RhLWFycmF5XFxpb3RhLmpzIiwibm9kZV9tb2R1bGVzXFxuZGFycmF5XFxub2RlX21vZHVsZXNcXGlzLWJ1ZmZlclxcaW5kZXguanMiLCJub2RlX21vZHVsZXNcXHJhZlxcaW5kZXguanMiLCJub2RlX21vZHVsZXNcXHJhZlxcbm9kZV9tb2R1bGVzXFxwZXJmb3JtYW5jZS1ub3dcXGxpYlxccGVyZm9ybWFuY2Utbm93LmpzIiwic3JjXFxqc1xcZ2FtZXN0YXRlLmpzIiwic3JjXFxqc1xcZ2xvYmFscy5qcyIsInNyY1xcanNcXG1hbmFnZXJzXFxhY3RvcnNjaGVkdWxlci5qcyIsInNyY1xcanNcXG1hbmFnZXJzXFxnYXJiYWdlLWNvbGxlY3Rvci5qcyIsInNyY1xcanNcXG1hbmFnZXJzXFxtYXBtYW5hZ2VyLmpzIiwic3JjXFxqc1xcbWFuYWdlcnNcXHNvdW5kbWFuYWdlci5qcyIsInNyY1xcanNcXG1hbmFnZXJzXFx1aS1tYW5hZ2VyLmpzIiwic3JjXFxqc1xcbWFwLmpzIiwic3JjXFxqc1xcbW9kZWxcXGR1bmdlb24tbWFwLmpzIiwic3JjXFxqc1xcbW9kZWxcXG1hcC1zZXR1cC5qcyIsInNyY1xcanNcXG1vZGVsXFxtdGwtbG9hZGVyLmpzIiwic3JjXFxqc1xcbW9kZWxcXG9iai1sb2FkZXIuanMiLCJzcmNcXGpzXFxtb2RlbFxccmVuZGVybG9vcC5qcyIsInNyY1xcanNcXHBvbHlmaWxsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOVRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN1NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFuR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2VkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcklBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMWdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2a0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0NEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1UkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDalRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9HQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLy8gY2FzaW5vLmpzXHJcblxyXG4vL3ZhciBUSFJFRSA9IHJlcXVpcmUoXCJ0aHJlZVwiKTtcclxuLy92YXIgJCA9IHJlcXVpcmUoXCJqcXVlcnlcIik7XHJcbi8vdmFyIHppcCA9IHppcC5qc1xyXG5cclxudmFyIGluaGVyaXRzID0gcmVxdWlyZShcImluaGVyaXRzXCIpO1xyXG52YXIgZXh0ZW5kID0gcmVxdWlyZShcImV4dGVuZFwiKTtcclxudmFyIHJhZiA9IHJlcXVpcmUoXCJyYWZcIik7XHJcblxyXG5yZXF1aXJlKFwiLi4vcG9seWZpbGwuanNcIik7XHJcbnZhciBNYXAgPSByZXF1aXJlKFwiLi4vbWFwXCIpO1xyXG52YXIgcmVuZGVyTG9vcCA9IHJlcXVpcmUoXCIuLi9tb2RlbC9yZW5kZXJsb29wXCIpO1xyXG5cclxucmVxdWlyZShcIi4uL2dsb2JhbHNcIik7XHJcblxyXG52YXIgd2FycCA9IHJlcXVpcmUoXCJ0cHAtd2FycFwiKTtcclxuXHJcbndpbmRvdy5hYyA9IHtcclxuXHRDb250ZXh0OiBudWxsLFxyXG5cdEZpbHRlck5vZGU6IG51bGwsXHJcblx0QW5hbHl6ZXJOb2RlOiBudWxsLFxyXG5cdEFuYWx5emVyQ2FudmFzOiBudWxsLFxyXG5cdFxyXG5cdERhbmNlcnM6IFtudWxsXSwgLy9udWxsIHRvIHJlc2VydmUgYSBsb2NhdGlvbiBmb3IgdGhlIHBsYXllclxyXG5cdFxyXG5cdF9zb25nT2Zmc2V0OiAwLFxyXG5cdF9sb29wU3RhcnQ6IDAsXHJcblx0X2xvb3BFbmQ6IDAsXHJcblx0XHJcblx0Z2V0QmVhdENvdW50OiBmdW5jdGlvbigpIHtcclxuXHRcdGlmICghdGhpcy5Db250ZXh0KSByZXR1cm4gMDtcclxuXHRcdHZhciB4ID0gKHRoaXMuQ29udGV4dC5jdXJyZW50VGltZSAtIHRoaXMuX2xvb3BTdGFydCAtIHRoaXMuX3NvbmdPZmZzZXQpO1xyXG5cdFx0cmV0dXJuIHggLyB0aGlzLkJFQVRfU1BFRUQ7XHJcblx0fSxcclxuXHRnZXRTdGVhZHlKdW1wOiBmdW5jdGlvbih4KSB7XHJcblx0XHRpZiAoIXRoaXMuQ29udGV4dCkgcmV0dXJuIDA7XHJcblx0XHRpZiAoIXgpIHggPSAodGhpcy5Db250ZXh0LmN1cnJlbnRUaW1lIC0gdGhpcy5fbG9vcFN0YXJ0IC0gdGhpcy5fc29uZ09mZnNldCk7XHJcblx0XHRyZXR1cm4gTWF0aC5hYnMoIE1hdGguY29zKHggKiBNYXRoLlBJL3RoaXMuQkVBVF9TUEVFRCkgKTtcclxuXHR9LFxyXG4vKlx0Z2V0U2VjdGlvbkp1bXA6IGZ1bmN0aW9uKHgpIHtcclxuXHRcdHZhciBzcGRNdWwgPSB0aGlzLmdldFNvbmdMb29wQmVhdFNwZWVkTXVsKCk7XHJcblx0XHRpZiAoIXgpIHggPSB0aGlzLmdldFNvbmdMb29wVGltZSgpO1xyXG5cdFx0XHJcblx0XHRpZiAoc3BkTXVsIDwgMS4wKSB7XHJcblx0XHRcdFxyXG5cdFx0XHRcclxuXHRcdFx0XHJcblx0XHRcdHJldHVybiBNYXRoLmFicyggTWF0aC5zaW4oeCAqIE1hdGguUEkvdGhpcy5CRUFUX1NQRUVEKSApO1xyXG5cdFx0XHRcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdHJldHVybiB0aGlzLmdldFN0ZWFkeUp1bXAoeCk7XHJcblx0XHR9XHJcblx0fSwgLy8qL1xyXG5cdFxyXG5cdGdldFNvbmdMb29wVGltZTogZnVuY3Rpb24oKSB7XHJcblx0XHRpZiAoIXRoaXMuQ29udGV4dCkgcmV0dXJuIDA7XHJcblx0XHQvLyBXZSBjYW4gYXR0ZW1wdCB0byBjYWxjdWxhdGUgd2hlcmUgaW4gdGhlIGxvb3AgdGhlIHNvbmcgaXMuXHJcblx0XHRyZXR1cm4gKCh0aGlzLkNvbnRleHQuY3VycmVudFRpbWUgLSB0aGlzLl9sb29wU3RhcnQgLSB0aGlzLl9zb25nT2Zmc2V0KSBcclxuXHRcdFx0XHRcdCUgKHRoaXMuX2xvb3BFbmQgLSB0aGlzLl9sb29wU3RhcnQpKSArIHRoaXMuX2xvb3BTdGFydDtcclxuXHR9LFxyXG5cdFxyXG5cdEJFQVRfU1BFRUQgOiA2MC8xNTQuOCwgLy9zcGVlZCBvZiB0aGUgYmVhdCBpbiB0aGUgY2FzaW5vIG11c2ljLCAxNTUgQlBNXHJcblx0QkVBVF9UQUJMRSA6IFtcclxuXHRcdHsgc3BkOiAwLjAwLCAgdW50aWw6ICAwLjAwMCwgc2VjdGlvbjogXCJyYW1wXCIgfSxcclxuXHRcdHsgc3BkOiAwLjAwLCAgdW50aWw6ICAzLjU3MCwgc2VjdGlvbjogXCJyYW1wXCIgfSxcclxuXHRcdHsgc3BkOiAwLjUwLCAgdW50aWw6ICA1LjA4NSwgc2VjdGlvbjogXCJiZWF0czFcIiB9LFxyXG5cdFx0eyBzcGQ6IDEuMDAsICB1bnRpbDogMTIuNjQ1LCBzZWN0aW9uOiBcImJ1bXBzXCIgfSxcclxuXHRcdHsgc3BkOiAwLjI1LCAgdW50aWw6IDE3LjQ1MCwgc2VjdGlvbjogXCJ3aGlybFwiIH0sXHJcblx0XHR7IHNwZDogMS4wMCwgIHVudGlsOiAxOC45NzIsIHNlY3Rpb246IFwid2hpcmxIaWdoXCIgfSxcclxuXHRcdHsgc3BkOiAxLjAwLCAgdW50aWw6IDMxLjM4OSwgc2VjdGlvbjogXCJ2ZXJzZVwiIH0sXHJcblx0XHR7IHNwZDogMC4xMjUsIHVudGlsOiA0My41ODksIHNlY3Rpb246IFwic2xvd1ZlcnNlXCIgfSxcclxuXHRcdHsgc3BkOiAwLjUwLCAgdW50aWw6IDQ1LjMyOSwgc2VjdGlvbjogXCJicmlkZ2VcIiB9LFxyXG5cdFx0eyBzcGQ6IDEuMDAsICB1bnRpbDogNjEuMDkyLCBzZWN0aW9uOiBcImNob3J1c1wiIH0sXHJcblx0XHR7IHNwZDogMC4wMCwgIHVudGlsOiA2My45MzksIHNlY3Rpb246IFwiYmVhdHMyXCIgfSxcclxuXHRcdHsgc3BkOiAwLjUwLCAgdW50aWw6IDY1LjQ5Miwgc2VjdGlvbjogXCJidW1wczJcIiB9LFxyXG5cdFx0eyBzcGQ6IDEuMDAsICB1bnRpbDogNzMuMDExLCBzZWN0aW9uOiBcInZlcnNlMlwiIH0sXHJcblx0XHR7IHNwZDogMC4yNSwgIHVudGlsOiA3Ni4zMzUsIHNlY3Rpb246IFwid2hpcmxcIiB9LFxyXG5cdFx0eyBzcGQ6IDAuNTAsICB1bnRpbDogNzcuODY4LCBzZWN0aW9uOiBcIndoaXJsSGlnaFwiIH0sXHJcblx0XHR7IHNwZDogMS4wMCwgIHVudGlsOiA5OS4wMDAsIHNlY3Rpb246IFwidmVyc2VcIiB9LFxyXG5cdF0sXHJcblx0Z2V0U29uZ0xvb3BCZWF0U3BlZWRNdWw6IGZ1bmN0aW9uKCkge1xyXG5cdFx0aWYgKCF0aGlzLkNvbnRleHQpIHJldHVybiAwO1xyXG5cdFx0dmFyIHRpbWUgPSB0aGlzLmdldFNvbmdMb29wVGltZSgpO1xyXG5cdFx0XHJcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuQkVBVF9UQUJMRS5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRpZiAodGltZSA+IHRoaXMuQkVBVF9UQUJMRVtpXS51bnRpbCkgY29udGludWU7XHJcblx0XHRcdHJldHVybiB0aGlzLkJFQVRfVEFCTEVbaV0uc3BkO1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIDEuMDtcclxuXHR9LFxyXG5cdGdldFNvbmdMb29wQmVhdFNlY3Rpb246IGZ1bmN0aW9uKCkge1xyXG5cdFx0aWYgKCF0aGlzLkNvbnRleHQpIHJldHVybiBcIj9cIjtcclxuXHRcdHZhciB0aW1lID0gdGhpcy5nZXRTb25nTG9vcFRpbWUoKTtcclxuXHRcdFxyXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLkJFQVRfVEFCTEUubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0aWYgKHRpbWUgPiB0aGlzLkJFQVRfVEFCTEVbaV0udW50aWwpIGNvbnRpbnVlO1xyXG5cdFx0XHRyZXR1cm4gdGhpcy5CRUFUX1RBQkxFW2ldLnNlY3Rpb247XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gXCI/XCI7XHJcblx0fSxcclxufTtcclxuXHJcbi8vT24gUmVhZHlcclxuJChmdW5jdGlvbigpe1xyXG5cdFxyXG5cdE1hcE1hbmFnZXIudHJhbnNpdGlvblRvKFwiaUNhc2lub1wiLCAwKTtcclxuXHRcclxuXHRyZW5kZXJMb29wLnN0YXJ0KHtcclxuXHRcdGNsZWFyQ29sb3I6IDB4MDAwMDAwLFxyXG5cdFx0dGlja3NQZXJTZWNvbmQgOiAzMCxcclxuXHR9KTtcclxuXHRcclxuXHRhYy5BbmFseXplckNhbnZhcyA9ICQoXCIjbXVzaWNzY3JlZW5cIikuYXR0cih7XHJcblx0XHRcIndpZHRoXCIgOiBcIjEwMCVcIixcclxuXHRcdFwiaGVpZ2h0XCI6IFwiMTUwcHhcIixcclxuXHR9KVswXTtcclxuXHRkcmF3V2F2ZWZvcm1zKHRydWUpO1xyXG59KTtcclxuXHJcbkRFQlVHLnVwZGF0ZUZucyA9IFtdO1xyXG5ERUJVRy5zb3VuZEFuYWx5emVyID0gdHJ1ZTtcclxuREVCVUcuc2V0dXBBZGRpdGlvbmFsQXVkaW9GaWx0ZXJzID0gZnVuY3Rpb24oaWQsIGF1ZGlvQ3R4LCBmaW5hbE5vZGUpe1xyXG5cdGlmIChpZCAhPSBcIm1fZ2FtZWNvcm5lclwiKSByZXR1cm4gZmluYWxOb2RlO1xyXG5cdFxyXG5cdGFjLkNvbnRleHQgPSBhdWRpb0N0eDtcclxuXHRcclxuXHRhYy5GaWx0ZXJOb2RlID0gYXVkaW9DdHguY3JlYXRlQmlxdWFkRmlsdGVyKCk7XHJcblx0YWMuRmlsdGVyTm9kZS50eXBlID0gXCJsb3dwYXNzXCI7XHJcblx0YWMuRmlsdGVyTm9kZS5mcmVxdWVuY3kudmFsdWUgPSBhdWRpb0N0eC5zYW1wbGVSYXRlOyAvL21pbjogNDAsIG1heDogc2FtcGxlUmF0ZVxyXG5cdGFjLkZpbHRlck5vZGUuUS52YWx1ZSA9IDA7XHJcblx0ZmluYWxOb2RlLmNvbm5lY3QoYWMuRmlsdGVyTm9kZSk7XHJcblx0XHJcblx0cmV0dXJuIGFjLkZpbHRlck5vZGU7XHJcbn07XHJcbkRFQlVHLnJ1bk9uTWFwUmVhZHkgPSBmdW5jdGlvbigpe1xyXG5cdHZhciBtYXAgPSBjdXJyZW50TWFwO1xyXG5cdHZhciBvbGRsb2dpYyA9IG1hcC5sb2dpY0xvb3A7XHJcblx0bWFwLmxvZ2ljTG9vcCA9IGZ1bmN0aW9uKGRlbHRhKXtcclxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgREVCVUcudXBkYXRlRm5zLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdGlmICghREVCVUcudXBkYXRlRm5zW2ldKSBjb250aW51ZTtcclxuXHRcdFx0aWYgKCFERUJVRy51cGRhdGVGbnNbaV0udXBkYXRlKSBjb250aW51ZTtcclxuXHRcdFx0REVCVUcudXBkYXRlRm5zW2ldLnVwZGF0ZSgpO1xyXG5cdFx0fVxyXG5cdFx0Ly8gJChcIiNzdGF0dXNiYXJcIikudGV4dChcclxuXHRcdC8vIFx0XCJTb25nIFNlY3Rpb246IFwiKyBhYy5nZXRTb25nTG9vcEJlYXRTZWN0aW9uKClcclxuXHRcdC8vICk7XHJcblx0XHRvbGRsb2dpYy5jYWxsKG1hcCwgZGVsdGEpO1xyXG5cdH07XHJcbn07IFxyXG5cclxuU291bmRNYW5hZ2VyLm9uKFwiREVCVUctQW5hbHlzZXJDcmVhdGVkXCIsIGZ1bmN0aW9uKGlkLCBhbmFseXNlcil7XHJcblx0aWYgKGlkICE9IFwibV9nYW1lY29ybmVyXCIpIHJldHVybjtcclxuXHRhYy5BbmFseXplck5vZGUgPSBhbmFseXNlcjtcclxufSk7XHJcblxyXG5Tb3VuZE1hbmFnZXIub24oXCJsb2FkX211c2ljXCIsIGZ1bmN0aW9uKGlkKXtcclxuXHR2YXIgbWluZm8gPSBTb3VuZE1hbmFnZXIubXVzaWNbaWRdO1xyXG5cdGFjLl9sb29wU3RhcnQgPSBtaW5mby5sb29wU3RhcnQ7XHJcblx0YWMuX2xvb3BFbmQgPSBtaW5mby5sb29wRW5kO1xyXG5cdFxyXG5cdGN1cnJlbnRNYXAucXVldWVGb3JNYXBTdGFydChmdW5jdGlvbigpe1xyXG5cdFx0U291bmRNYW5hZ2VyLnBsYXlNdXNpYyhcIm1fZ2FtZWNvcm5lclwiKTtcclxuXHRcdGFjLl9zb25nT2Zmc2V0ID0gYWMuQ29udGV4dC5jdXJyZW50VGltZTtcclxuXHR9KTtcclxufSk7XHJcblxyXG5cclxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cclxudmFyIF9yYWZIYW5kbGU7XHJcbnZhciBDT0xPUl9XSEVFTF9USU1FID0gOC4wO1xyXG5mdW5jdGlvbiBkcmF3V2F2ZWZvcm1zKGZvcmNlRHJhdykge1xyXG5cdGlmICghX3JhZkhhbmRsZSAmJiBmb3JjZURyYXcgIT09IHRydWUpIHJldHVybjsgLy9zdG9wIHRoZSBkcmF3IGxvb3BcclxuXHRcclxuXHQvLyBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9BUEkvV2ViX0F1ZGlvX0FQSS9WaXN1YWxpemF0aW9uc193aXRoX1dlYl9BdWRpb19BUElcclxuXHR2YXIgZGF0YUFycmF5O1xyXG5cdHRyeSB7XHJcblx0XHRpZiAoIWFjLkFuYWx5emVyTm9kZSB8fCAhYWMuQW5hbHl6ZXJDYW52YXMpIHJldHVybjtcclxuXHRcdFxyXG5cdFx0aWYgKCFkYXRhQXJyYXkpIHtcclxuXHRcdFx0ZGF0YUFycmF5ID0gbmV3IFVpbnQ4QXJyYXkoYWMuQW5hbHl6ZXJOb2RlLmZmdFNpemUpO1xyXG5cdFx0fVxyXG5cdFx0dmFyIGNhbnZhc0N0eCA9IGFjLkFuYWx5emVyQ2FudmFzLmdldENvbnRleHQoXCIyZFwiKTtcclxuXHRcdFxyXG5cdFx0dmFyIFdJRFRIID0gJChhYy5BbmFseXplckNhbnZhcykuaW5uZXJXaWR0aCgpO1xyXG5cdFx0dmFyIEhFSUdIVCA9ICQoYWMuQW5hbHl6ZXJDYW52YXMpLmlubmVySGVpZ2h0KCk7XHJcblx0XHRcclxuXHRcdGlmIChXSURUSCAhPSBhYy5BbmFseXplckNhbnZhcy53aWR0aCB8fCBIRUlHSFQgIT0gYWMuQW5hbHl6ZXJDYW52YXMuaGVpZ2h0KVxyXG5cdFx0e1xyXG5cdFx0XHRhYy5BbmFseXplckNhbnZhcy53aWR0aCA9IFdJRFRIO1xyXG5cdFx0XHRhYy5BbmFseXplckNhbnZhcy5oZWlnaHQgPSBIRUlHSFQ7XHJcblx0XHR9XHJcblx0XHQvLyBjYW52YXNDdHguY2xlYXJSZWN0KDAsIDAsIFdJRFRILCBIRUlHSFQpO1xyXG5cdFx0XHJcblx0XHRhYy5BbmFseXplck5vZGUuZ2V0Qnl0ZVRpbWVEb21haW5EYXRhKGRhdGFBcnJheSk7XHJcblx0XHRjYW52YXNDdHguZmlsbFN0eWxlID0gJ3JnYmEoMCwgMCwgMCwgMC4wNCknOyAvLycjMDAwMDAwJztcclxuXHRcdGNhbnZhc0N0eC5maWxsUmVjdCgwLCAwLCBXSURUSCwgSEVJR0hUKTtcclxuXHRcdFxyXG5cdFx0Y2FudmFzQ3R4LmxpbmVXaWR0aCA9IDE7XHJcblx0XHRjYW52YXNDdHguc3Ryb2tlU3R5bGUgPSAnaHNsKCcrTWF0aC5mbG9vcihhYy5Db250ZXh0LmN1cnJlbnRUaW1lKigzNjAuMC9DT0xPUl9XSEVFTF9USU1FKSkrJywgMTAwJSwgNTAlKSc7IC8vJyNGRkZGRkYnO1xyXG5cdFx0Y2FudmFzQ3R4LmJlZ2luUGF0aCgpO1xyXG5cdFx0XHJcblx0XHR2YXIgc2xpY2VXaWR0aCA9IFdJRFRIICogMS4wIC8gZGF0YUFycmF5Lmxlbmd0aDtcclxuXHRcdHZhciB4ID0gMDtcclxuXHRcdGZvcih2YXIgaSA9IDA7IGkgPCBkYXRhQXJyYXkubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0dmFyIHYgPSBkYXRhQXJyYXlbaV0gLyAxMjguMDtcclxuXHRcdFx0dmFyIHkgPSB2ICogSEVJR0hULzI7XHJcblxyXG5cdFx0XHRpZihpID09PSAwKSB7XHJcblx0XHRcdFx0Y2FudmFzQ3R4Lm1vdmVUbyh4LCB5KTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRjYW52YXNDdHgubGluZVRvKHgsIHkpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHR4ICs9IHNsaWNlV2lkdGg7XHJcblx0XHR9XHJcblx0XHRjYW52YXNDdHgubGluZVRvKFdJRFRILCBIRUlHSFQvMik7XHJcblx0XHRjYW52YXNDdHguc3Ryb2tlKCk7XHJcblx0fSBmaW5hbGx5IHtcclxuXHRcdF9yYWZIYW5kbGUgPSByYWYoZHJhd1dhdmVmb3Jtcyk7XHJcblx0fVxyXG59XHJcbmFjLmRyYXdXYXZlZm9ybXMgPSBkcmF3V2F2ZWZvcm1zO1xyXG5cclxuYWMuc3RvcFdhdmVmb3JtcyA9IGZ1bmN0aW9uKCl7IF9yYWZIYW5kbGUgPSBudWxsOyB9O1xyXG5cclxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8gQWN0b3IgQmVoYXZpb3IgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHJcbnZhciBBY3RvciA9IHJlcXVpcmUoXCJ0cHAtYWN0b3JcIik7XHJcbnZhciBCZWhhdmlvciA9IHJlcXVpcmUoXCJ0cHAtYmVoYXZpb3JcIik7XHJcbnZhciBGYWNlRGlyZWN0aW9uID0gcmVxdWlyZShcInRwcC1iZWhhdmlvclwiKS5GYWNlRGlyZWN0aW9uO1xyXG52YXIgTG9va0Fyb3VuZCAgICA9IHJlcXVpcmUoXCJ0cHAtYmVoYXZpb3JcIikuTG9va0Fyb3VuZDtcclxudmFyIFRhbGtpbmdCZWhhdiAgPSByZXF1aXJlKFwidHBwLWJlaGF2aW9yXCIpLlRhbGtpbmc7XHJcbnZhciBNZWFuZGVyQmVoYXYgID0gcmVxdWlyZShcInRwcC1iZWhhdmlvclwiKS5NZWFuZGVyO1xyXG5cclxuZnVuY3Rpb24gQWN0b3JDYXNpbm8oYmFzZSwgZXh0KSB7XHJcblx0ZXh0ID0gZXh0ZW5kKHtcclxuXHRcdFxyXG5cdFx0YmVoYXZpb3JTdGFjazogW25ldyBNZWFuZGVyQmVoYXYoKV0sXHJcblx0XHRzaG91bGRBcHBlYXI6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdHJ1ZTsgfSxcclxuXHR9LCBleHQpO1xyXG5cdEFjdG9yLmNhbGwodGhpcywgYmFzZSwgZXh0KTtcclxuXHRcclxuXHR0aGlzLm9uKFwiaW50ZXJhY3RlZFwiLCB0aGlzLm9uSW50ZXJhY3RlZCk7XHJcbn1cclxuaW5oZXJpdHMoQWN0b3JDYXNpbm8sIEFjdG9yKTtcclxuZXh0ZW5kKEFjdG9yQ2FzaW5vLnByb3RvdHlwZSwge1xyXG5cdGxvY2F0aW9uOiBcInJhbmRcIixcclxuXHRcclxuXHRkaWFsb2dfdHlwZTogXCJ0ZXh0XCIsXHJcblx0ZGlhbG9nOiBudWxsLFxyXG5cdFxyXG5cdHNwYXduTG9jYXRpb25TZXQ6IGZ1bmN0aW9uKCkge1xyXG5cdFx0Ly8gY29uc29sZS5sb2coXCJTcGF3biBzZXQhXCIsIHRoaXMuaWQpO1xyXG5cdFx0Ly8oMTQsIDIwKSA8ICgyNywgMjkpID09IG9uIGRhbmNlIGZsb29yXHJcblx0XHRpZiAodGhpcy5sb2NhdGlvbi54ID4gMTQgJiYgdGhpcy5sb2NhdGlvbi54IDwgMjcgJiZcclxuXHRcdFx0dGhpcy5sb2NhdGlvbi55ID4gMjAgJiYgdGhpcy5sb2NhdGlvbi55IDwgMjkpIFxyXG5cdFx0eyAvLyBXZSdyZSBvbiB0aGUgZGFuY2UgZmxvb3IhXHJcblx0XHRcdGNvbnNvbGUubG9nKFwiT24gZGFuY2UgZmxvb3IhXCIsIHRoaXMuaWQpO1xyXG5cdFx0XHRpZiAod2luZG93LmFjKSBhYy5EYW5jZXJzLnB1c2godGhpcyk7XHJcblx0XHRcdHRoaXMuZGFuY2luZyA9IHRydWU7XHJcblx0XHRcdHRoaXMuYmVoYXZpb3JTdGFjay5wdXNoKG5ldyBEYW5jaW5nQmVoYXYoKSk7XHJcblx0XHR9XHJcblx0fSxcclxuXHRvbkludGVyYWN0ZWQ6IGZ1bmN0aW9uKGZyb20pIHtcclxuXHRcdGlmICh0aGlzLmRhbmNpbmcpIHJldHVybjtcclxuXHRcdFxyXG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xyXG5cdFx0dmFyIGRsb2cgPSB0aGlzLmRpYWxvZyB8fCBbIFwiXCIrdGhpcy5uYW1lK1wiOiDjg73gvLzguojZhM2c4LqI4Ly9776JIERBTkNFIFJJT1Qg44O94Ly84LqI2YTNnOC6iOC8ve++iSBcIiBdO1xyXG5cdFx0Ly8gJChcIiNzdGF0dXNiYXJcIikuaHRtbChcIlRoaXMgaXMgXCIrdGhpcy5uYW1lK1wiISAoXCIrdGhpcy5pZCtcIik8YnIvPlRoaXMgc3ByaXRlIHdhcyBjcmVhdGVkIGJ5IFwiK3RoaXMuc3ByaXRlX2NyZWF0b3IrXCIhXCIpO1xyXG5cdFx0XHJcblx0XHRzZWxmLmJlaGF2aW9yU3RhY2sucHVzaChuZXcgVGFsa2luZ0JlaGF2KHtcclxuXHRcdFx0ZGlhbG9nOiBkbG9nLFxyXG5cdFx0XHRkaWFsb2dfdHlwZTogdGhpcy5kaWFsb2dfdHlwZSxcclxuXHRcdFx0b3duZXI6IHNlbGYsXHJcblx0XHR9KSk7XHJcblx0fSxcclxufSk7XHJcbndpbmRvdy5BY3RvckNhc2lubyA9IEFjdG9yQ2FzaW5vO1xyXG5cclxuXHJcbmZ1bmN0aW9uIERhbmNpbmdCZWhhdihvcHRzKSB7XHJcblx0QmVoYXZpb3IuY2FsbCh0aGlzLCBvcHRzKTtcclxufVxyXG5pbmhlcml0cyhEYW5jaW5nQmVoYXYsIEJlaGF2aW9yKTtcclxuZXh0ZW5kKERhbmNpbmdCZWhhdi5wcm90b3R5cGUsIHtcclxuXHRzdG9yZWRfeSA6IDAsXHJcblx0bGFzdFVwZGF0ZSA6IDAsXHJcblx0d2FpdFRpbWUgOiAwLCAvL3dhaXRpbmcgdG8gbW92ZSwgYnV0IG5vdCB0byB0dXJuXHJcblx0XHJcblx0dGljazogZnVuY3Rpb24obWUsIGRlbHRhKSB7XHJcblx0XHRpZiAoIXRoaXMuc3RvcmVkX3kpIHRoaXMuc3RvcmVkX3kgPSBtZS5hdmF0YXJfbm9kZS5wb3NpdGlvbi55O1xyXG5cdFx0aWYgKGFjLl9zb25nT2Zmc2V0ID09IDApIHJldHVybjtcclxuXHRcdHZhciBiYyA9IE1hdGguZmxvb3IoYWMuZ2V0QmVhdENvdW50KCkgKyAxMDApO1xyXG5cdFx0XHJcblx0XHRpZiAoYmMgPiB0aGlzLmxhc3RVcGRhdGUpIHtcclxuXHRcdFx0dGhpcy53YWl0VGltZSAtPSBkZWx0YTtcclxuXHRcdFx0XHJcblx0XHRcdHN3aXRjaCggTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpKjgpICkge1xyXG5cdFx0XHRcdGNhc2UgMDogbWUuZmFjaW5nLnNldCggMSwwLCAwKTsgYnJlYWs7XHJcblx0XHRcdFx0Y2FzZSAxOiBtZS5mYWNpbmcuc2V0KC0xLDAsIDApOyBicmVhaztcclxuXHRcdFx0XHRjYXNlIDI6IG1lLmZhY2luZy5zZXQoIDAsMCwgMSk7IGJyZWFrO1xyXG5cdFx0XHRcdGNhc2UgMzogbWUuZmFjaW5nLnNldCggMCwwLC0xKTsgYnJlYWs7XHJcblx0XHRcdFx0Y2FzZSA0OiBpZiAoIW1lLl9pbml0UGF0aGluZ1N0YXRlKCkubW92aW5nKSBtZS5tb3ZlRGlyKFwiZFwiKTsgYnJlYWs7XHJcblx0XHRcdFx0Y2FzZSA1OiBpZiAoIW1lLl9pbml0UGF0aGluZ1N0YXRlKCkubW92aW5nKSBtZS5tb3ZlRGlyKFwidVwiKTsgYnJlYWs7XHJcblx0XHRcdFx0Y2FzZSA2OiBpZiAoIW1lLl9pbml0UGF0aGluZ1N0YXRlKCkubW92aW5nKSBtZS5tb3ZlRGlyKFwibFwiKTsgYnJlYWs7XHJcblx0XHRcdFx0Y2FzZSA3OiBpZiAoIW1lLl9pbml0UGF0aGluZ1N0YXRlKCkubW92aW5nKSBtZS5tb3ZlRGlyKFwiclwiKTsgYnJlYWs7XHJcblx0XHRcdH1cclxuXHRcdFx0dGhpcy5sYXN0VXBkYXRlID0gYmM7XHJcblx0XHRcdGlmICh0aGlzLndhaXRUaW1lIDwgMClcclxuXHRcdFx0XHR0aGlzLndhaXRUaW1lID0gKE1hdGgucmFuZG9tKCkgKiAzKSArIDM7XHJcblx0XHR9XHJcblx0XHRtZS5hdmF0YXJfbm9kZS5wb3NpdGlvbi5zZXRZKCB0aGlzLnN0b3JlZF95ICsgKGFjLmdldFN0ZWFkeUp1bXAoKSowLjIpICk7XHJcblx0fSxcclxufSk7XHJcbkJlaGF2aW9yLkRhbmNpbmdCZWhhdiA9IERhbmNpbmdCZWhhdjtcclxuXHJcbiIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG5mdW5jdGlvbiBFdmVudEVtaXR0ZXIoKSB7XG4gIHRoaXMuX2V2ZW50cyA9IHRoaXMuX2V2ZW50cyB8fCB7fTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gdGhpcy5fbWF4TGlzdGVuZXJzIHx8IHVuZGVmaW5lZDtcbn1cbm1vZHVsZS5leHBvcnRzID0gRXZlbnRFbWl0dGVyO1xuXG4vLyBCYWNrd2FyZHMtY29tcGF0IHdpdGggbm9kZSAwLjEwLnhcbkV2ZW50RW1pdHRlci5FdmVudEVtaXR0ZXIgPSBFdmVudEVtaXR0ZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX2V2ZW50cyA9IHVuZGVmaW5lZDtcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX21heExpc3RlbmVycyA9IHVuZGVmaW5lZDtcblxuLy8gQnkgZGVmYXVsdCBFdmVudEVtaXR0ZXJzIHdpbGwgcHJpbnQgYSB3YXJuaW5nIGlmIG1vcmUgdGhhbiAxMCBsaXN0ZW5lcnMgYXJlXG4vLyBhZGRlZCB0byBpdC4gVGhpcyBpcyBhIHVzZWZ1bCBkZWZhdWx0IHdoaWNoIGhlbHBzIGZpbmRpbmcgbWVtb3J5IGxlYWtzLlxuRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnMgPSAxMDtcblxuLy8gT2J2aW91c2x5IG5vdCBhbGwgRW1pdHRlcnMgc2hvdWxkIGJlIGxpbWl0ZWQgdG8gMTAuIFRoaXMgZnVuY3Rpb24gYWxsb3dzXG4vLyB0aGF0IHRvIGJlIGluY3JlYXNlZC4gU2V0IHRvIHplcm8gZm9yIHVubGltaXRlZC5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuc2V0TWF4TGlzdGVuZXJzID0gZnVuY3Rpb24obikge1xuICBpZiAoIWlzTnVtYmVyKG4pIHx8IG4gPCAwIHx8IGlzTmFOKG4pKVxuICAgIHRocm93IFR5cGVFcnJvcignbiBtdXN0IGJlIGEgcG9zaXRpdmUgbnVtYmVyJyk7XG4gIHRoaXMuX21heExpc3RlbmVycyA9IG47XG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgZXIsIGhhbmRsZXIsIGxlbiwgYXJncywgaSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIElmIHRoZXJlIGlzIG5vICdlcnJvcicgZXZlbnQgbGlzdGVuZXIgdGhlbiB0aHJvdy5cbiAgaWYgKHR5cGUgPT09ICdlcnJvcicpIHtcbiAgICBpZiAoIXRoaXMuX2V2ZW50cy5lcnJvciB8fFxuICAgICAgICAoaXNPYmplY3QodGhpcy5fZXZlbnRzLmVycm9yKSAmJiAhdGhpcy5fZXZlbnRzLmVycm9yLmxlbmd0aCkpIHtcbiAgICAgIGVyID0gYXJndW1lbnRzWzFdO1xuICAgICAgaWYgKGVyIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgdGhyb3cgZXI7IC8vIFVuaGFuZGxlZCAnZXJyb3InIGV2ZW50XG4gICAgICB9XG4gICAgICB0aHJvdyBUeXBlRXJyb3IoJ1VuY2F1Z2h0LCB1bnNwZWNpZmllZCBcImVycm9yXCIgZXZlbnQuJyk7XG4gICAgfVxuICB9XG5cbiAgaGFuZGxlciA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNVbmRlZmluZWQoaGFuZGxlcikpXG4gICAgcmV0dXJuIGZhbHNlO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGhhbmRsZXIpKSB7XG4gICAgc3dpdGNoIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAvLyBmYXN0IGNhc2VzXG4gICAgICBjYXNlIDE6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDI6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0pO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICAvLyBzbG93ZXJcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgaGFuZGxlci5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAoaXNPYmplY3QoaGFuZGxlcikpIHtcbiAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgZm9yIChpID0gMTsgaSA8IGxlbjsgaSsrKVxuICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG5cbiAgICBsaXN0ZW5lcnMgPSBoYW5kbGVyLnNsaWNlKCk7XG4gICAgbGVuID0gbGlzdGVuZXJzLmxlbmd0aDtcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpKyspXG4gICAgICBsaXN0ZW5lcnNbaV0uYXBwbHkodGhpcywgYXJncyk7XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gVG8gYXZvaWQgcmVjdXJzaW9uIGluIHRoZSBjYXNlIHRoYXQgdHlwZSA9PT0gXCJuZXdMaXN0ZW5lclwiISBCZWZvcmVcbiAgLy8gYWRkaW5nIGl0IHRvIHRoZSBsaXN0ZW5lcnMsIGZpcnN0IGVtaXQgXCJuZXdMaXN0ZW5lclwiLlxuICBpZiAodGhpcy5fZXZlbnRzLm5ld0xpc3RlbmVyKVxuICAgIHRoaXMuZW1pdCgnbmV3TGlzdGVuZXInLCB0eXBlLFxuICAgICAgICAgICAgICBpc0Z1bmN0aW9uKGxpc3RlbmVyLmxpc3RlbmVyKSA/XG4gICAgICAgICAgICAgIGxpc3RlbmVyLmxpc3RlbmVyIDogbGlzdGVuZXIpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIC8vIE9wdGltaXplIHRoZSBjYXNlIG9mIG9uZSBsaXN0ZW5lci4gRG9uJ3QgbmVlZCB0aGUgZXh0cmEgYXJyYXkgb2JqZWN0LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IGxpc3RlbmVyO1xuICBlbHNlIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIC8vIElmIHdlJ3ZlIGFscmVhZHkgZ290IGFuIGFycmF5LCBqdXN0IGFwcGVuZC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0ucHVzaChsaXN0ZW5lcik7XG4gIGVsc2VcbiAgICAvLyBBZGRpbmcgdGhlIHNlY29uZCBlbGVtZW50LCBuZWVkIHRvIGNoYW5nZSB0byBhcnJheS5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBbdGhpcy5fZXZlbnRzW3R5cGVdLCBsaXN0ZW5lcl07XG5cbiAgLy8gQ2hlY2sgZm9yIGxpc3RlbmVyIGxlYWtcbiAgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkgJiYgIXRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQpIHtcbiAgICB2YXIgbTtcbiAgICBpZiAoIWlzVW5kZWZpbmVkKHRoaXMuX21heExpc3RlbmVycykpIHtcbiAgICAgIG0gPSB0aGlzLl9tYXhMaXN0ZW5lcnM7XG4gICAgfSBlbHNlIHtcbiAgICAgIG0gPSBFdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycztcbiAgICB9XG5cbiAgICBpZiAobSAmJiBtID4gMCAmJiB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoID4gbSkge1xuICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCA9IHRydWU7XG4gICAgICBjb25zb2xlLmVycm9yKCcobm9kZSkgd2FybmluZzogcG9zc2libGUgRXZlbnRFbWl0dGVyIG1lbW9yeSAnICtcbiAgICAgICAgICAgICAgICAgICAgJ2xlYWsgZGV0ZWN0ZWQuICVkIGxpc3RlbmVycyBhZGRlZC4gJyArXG4gICAgICAgICAgICAgICAgICAgICdVc2UgZW1pdHRlci5zZXRNYXhMaXN0ZW5lcnMoKSB0byBpbmNyZWFzZSBsaW1pdC4nLFxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoKTtcbiAgICAgIGlmICh0eXBlb2YgY29uc29sZS50cmFjZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAvLyBub3Qgc3VwcG9ydGVkIGluIElFIDEwXG4gICAgICAgIGNvbnNvbGUudHJhY2UoKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub24gPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uY2UgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgdmFyIGZpcmVkID0gZmFsc2U7XG5cbiAgZnVuY3Rpb24gZygpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGcpO1xuXG4gICAgaWYgKCFmaXJlZCkge1xuICAgICAgZmlyZWQgPSB0cnVlO1xuICAgICAgbGlzdGVuZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gIH1cblxuICBnLmxpc3RlbmVyID0gbGlzdGVuZXI7XG4gIHRoaXMub24odHlwZSwgZyk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vLyBlbWl0cyBhICdyZW1vdmVMaXN0ZW5lcicgZXZlbnQgaWZmIHRoZSBsaXN0ZW5lciB3YXMgcmVtb3ZlZFxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBsaXN0LCBwb3NpdGlvbiwgbGVuZ3RoLCBpO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIGxpc3QgPSB0aGlzLl9ldmVudHNbdHlwZV07XG4gIGxlbmd0aCA9IGxpc3QubGVuZ3RoO1xuICBwb3NpdGlvbiA9IC0xO1xuXG4gIGlmIChsaXN0ID09PSBsaXN0ZW5lciB8fFxuICAgICAgKGlzRnVuY3Rpb24obGlzdC5saXN0ZW5lcikgJiYgbGlzdC5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcblxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGxpc3QpKSB7XG4gICAgZm9yIChpID0gbGVuZ3RoOyBpLS0gPiAwOykge1xuICAgICAgaWYgKGxpc3RbaV0gPT09IGxpc3RlbmVyIHx8XG4gICAgICAgICAgKGxpc3RbaV0ubGlzdGVuZXIgJiYgbGlzdFtpXS5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgICAgIHBvc2l0aW9uID0gaTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHBvc2l0aW9uIDwgMClcbiAgICAgIHJldHVybiB0aGlzO1xuXG4gICAgaWYgKGxpc3QubGVuZ3RoID09PSAxKSB7XG4gICAgICBsaXN0Lmxlbmd0aCA9IDA7XG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIH0gZWxzZSB7XG4gICAgICBsaXN0LnNwbGljZShwb3NpdGlvbiwgMSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIga2V5LCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgLy8gbm90IGxpc3RlbmluZyBmb3IgcmVtb3ZlTGlzdGVuZXIsIG5vIG5lZWQgdG8gZW1pdFxuICBpZiAoIXRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcikge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKVxuICAgICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgZWxzZSBpZiAodGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIGVtaXQgcmVtb3ZlTGlzdGVuZXIgZm9yIGFsbCBsaXN0ZW5lcnMgb24gYWxsIGV2ZW50c1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgIGZvciAoa2V5IGluIHRoaXMuX2V2ZW50cykge1xuICAgICAgaWYgKGtleSA9PT0gJ3JlbW92ZUxpc3RlbmVyJykgY29udGludWU7XG4gICAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycyhrZXkpO1xuICAgIH1cbiAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycygncmVtb3ZlTGlzdGVuZXInKTtcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGxpc3RlbmVycyA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNGdW5jdGlvbihsaXN0ZW5lcnMpKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnMpO1xuICB9IGVsc2Uge1xuICAgIC8vIExJRk8gb3JkZXJcbiAgICB3aGlsZSAobGlzdGVuZXJzLmxlbmd0aClcbiAgICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzW2xpc3RlbmVycy5sZW5ndGggLSAxXSk7XG4gIH1cbiAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IFtdO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gW3RoaXMuX2V2ZW50c1t0eXBlXV07XG4gIGVsc2VcbiAgICByZXQgPSB0aGlzLl9ldmVudHNbdHlwZV0uc2xpY2UoKTtcbiAgcmV0dXJuIHJldDtcbn07XG5cbkV2ZW50RW1pdHRlci5saXN0ZW5lckNvdW50ID0gZnVuY3Rpb24oZW1pdHRlciwgdHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIWVtaXR0ZXIuX2V2ZW50cyB8fCAhZW1pdHRlci5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IDA7XG4gIGVsc2UgaWYgKGlzRnVuY3Rpb24oZW1pdHRlci5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSAxO1xuICBlbHNlXG4gICAgcmV0ID0gZW1pdHRlci5fZXZlbnRzW3R5cGVdLmxlbmd0aDtcbiAgcmV0dXJuIHJldDtcbn07XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnZnVuY3Rpb24nO1xufVxuXG5mdW5jdGlvbiBpc051bWJlcihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdudW1iZXInO1xufVxuXG5mdW5jdGlvbiBpc09iamVjdChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnICYmIGFyZyAhPT0gbnVsbDtcbn1cblxuZnVuY3Rpb24gaXNVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IHZvaWQgMDtcbn1cbiIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxuXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbnByb2Nlc3MubmV4dFRpY2sgPSAoZnVuY3Rpb24gKCkge1xuICAgIHZhciBjYW5TZXRJbW1lZGlhdGUgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5zZXRJbW1lZGlhdGU7XG4gICAgdmFyIGNhbk11dGF0aW9uT2JzZXJ2ZXIgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5NdXRhdGlvbk9ic2VydmVyO1xuICAgIHZhciBjYW5Qb3N0ID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cucG9zdE1lc3NhZ2UgJiYgd2luZG93LmFkZEV2ZW50TGlzdGVuZXJcbiAgICA7XG5cbiAgICBpZiAoY2FuU2V0SW1tZWRpYXRlKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoZikgeyByZXR1cm4gd2luZG93LnNldEltbWVkaWF0ZShmKSB9O1xuICAgIH1cblxuICAgIHZhciBxdWV1ZSA9IFtdO1xuXG4gICAgaWYgKGNhbk11dGF0aW9uT2JzZXJ2ZXIpIHtcbiAgICAgICAgdmFyIGhpZGRlbkRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gICAgICAgIHZhciBvYnNlcnZlciA9IG5ldyBNdXRhdGlvbk9ic2VydmVyKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBxdWV1ZUxpc3QgPSBxdWV1ZS5zbGljZSgpO1xuICAgICAgICAgICAgcXVldWUubGVuZ3RoID0gMDtcbiAgICAgICAgICAgIHF1ZXVlTGlzdC5mb3JFYWNoKGZ1bmN0aW9uIChmbikge1xuICAgICAgICAgICAgICAgIGZuKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgb2JzZXJ2ZXIub2JzZXJ2ZShoaWRkZW5EaXYsIHsgYXR0cmlidXRlczogdHJ1ZSB9KTtcblxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgICAgIGlmICghcXVldWUubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgaGlkZGVuRGl2LnNldEF0dHJpYnV0ZSgneWVzJywgJ25vJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBxdWV1ZS5wdXNoKGZuKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBpZiAoY2FuUG9zdCkge1xuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGZ1bmN0aW9uIChldikge1xuICAgICAgICAgICAgdmFyIHNvdXJjZSA9IGV2LnNvdXJjZTtcbiAgICAgICAgICAgIGlmICgoc291cmNlID09PSB3aW5kb3cgfHwgc291cmNlID09PSBudWxsKSAmJiBldi5kYXRhID09PSAncHJvY2Vzcy10aWNrJykge1xuICAgICAgICAgICAgICAgIGV2LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgIGlmIChxdWV1ZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBmbiA9IHF1ZXVlLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgIGZuKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LCB0cnVlKTtcblxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgICAgIHF1ZXVlLnB1c2goZm4pO1xuICAgICAgICAgICAgd2luZG93LnBvc3RNZXNzYWdlKCdwcm9jZXNzLXRpY2snLCAnKicpO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICBzZXRUaW1lb3V0KGZuLCAwKTtcbiAgICB9O1xufSkoKTtcblxucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG4vLyBUT0RPKHNodHlsbWFuKVxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG4iLCIvLyEgbW9tZW50LmpzXG4vLyEgdmVyc2lvbiA6IDIuMTAuNlxuLy8hIGF1dGhvcnMgOiBUaW0gV29vZCwgSXNrcmVuIENoZXJuZXYsIE1vbWVudC5qcyBjb250cmlidXRvcnNcbi8vISBsaWNlbnNlIDogTUlUXG4vLyEgbW9tZW50anMuY29tXG5cbihmdW5jdGlvbiAoZ2xvYmFsLCBmYWN0b3J5KSB7XG4gICAgdHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnICYmIHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnID8gbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KCkgOlxuICAgIHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCA/IGRlZmluZShmYWN0b3J5KSA6XG4gICAgZ2xvYmFsLm1vbWVudCA9IGZhY3RvcnkoKVxufSh0aGlzLCBmdW5jdGlvbiAoKSB7ICd1c2Ugc3RyaWN0JztcblxuICAgIHZhciBob29rQ2FsbGJhY2s7XG5cbiAgICBmdW5jdGlvbiB1dGlsc19ob29rc19faG9va3MgKCkge1xuICAgICAgICByZXR1cm4gaG9va0NhbGxiYWNrLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG4gICAgfVxuXG4gICAgLy8gVGhpcyBpcyBkb25lIHRvIHJlZ2lzdGVyIHRoZSBtZXRob2QgY2FsbGVkIHdpdGggbW9tZW50KClcbiAgICAvLyB3aXRob3V0IGNyZWF0aW5nIGNpcmN1bGFyIGRlcGVuZGVuY2llcy5cbiAgICBmdW5jdGlvbiBzZXRIb29rQ2FsbGJhY2sgKGNhbGxiYWNrKSB7XG4gICAgICAgIGhvb2tDYWxsYmFjayA9IGNhbGxiYWNrO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzQXJyYXkoaW5wdXQpIHtcbiAgICAgICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChpbnB1dCkgPT09ICdbb2JqZWN0IEFycmF5XSc7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaXNEYXRlKGlucHV0KSB7XG4gICAgICAgIHJldHVybiBpbnB1dCBpbnN0YW5jZW9mIERhdGUgfHwgT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKGlucHV0KSA9PT0gJ1tvYmplY3QgRGF0ZV0nO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG1hcChhcnIsIGZuKSB7XG4gICAgICAgIHZhciByZXMgPSBbXSwgaTtcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGFyci5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgcmVzLnB1c2goZm4oYXJyW2ldLCBpKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBoYXNPd25Qcm9wKGEsIGIpIHtcbiAgICAgICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChhLCBiKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBleHRlbmQoYSwgYikge1xuICAgICAgICBmb3IgKHZhciBpIGluIGIpIHtcbiAgICAgICAgICAgIGlmIChoYXNPd25Qcm9wKGIsIGkpKSB7XG4gICAgICAgICAgICAgICAgYVtpXSA9IGJbaV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoaGFzT3duUHJvcChiLCAndG9TdHJpbmcnKSkge1xuICAgICAgICAgICAgYS50b1N0cmluZyA9IGIudG9TdHJpbmc7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoaGFzT3duUHJvcChiLCAndmFsdWVPZicpKSB7XG4gICAgICAgICAgICBhLnZhbHVlT2YgPSBiLnZhbHVlT2Y7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gYTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjcmVhdGVfdXRjX19jcmVhdGVVVEMgKGlucHV0LCBmb3JtYXQsIGxvY2FsZSwgc3RyaWN0KSB7XG4gICAgICAgIHJldHVybiBjcmVhdGVMb2NhbE9yVVRDKGlucHV0LCBmb3JtYXQsIGxvY2FsZSwgc3RyaWN0LCB0cnVlKS51dGMoKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkZWZhdWx0UGFyc2luZ0ZsYWdzKCkge1xuICAgICAgICAvLyBXZSBuZWVkIHRvIGRlZXAgY2xvbmUgdGhpcyBvYmplY3QuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBlbXB0eSAgICAgICAgICAgOiBmYWxzZSxcbiAgICAgICAgICAgIHVudXNlZFRva2VucyAgICA6IFtdLFxuICAgICAgICAgICAgdW51c2VkSW5wdXQgICAgIDogW10sXG4gICAgICAgICAgICBvdmVyZmxvdyAgICAgICAgOiAtMixcbiAgICAgICAgICAgIGNoYXJzTGVmdE92ZXIgICA6IDAsXG4gICAgICAgICAgICBudWxsSW5wdXQgICAgICAgOiBmYWxzZSxcbiAgICAgICAgICAgIGludmFsaWRNb250aCAgICA6IG51bGwsXG4gICAgICAgICAgICBpbnZhbGlkRm9ybWF0ICAgOiBmYWxzZSxcbiAgICAgICAgICAgIHVzZXJJbnZhbGlkYXRlZCA6IGZhbHNlLFxuICAgICAgICAgICAgaXNvICAgICAgICAgICAgIDogZmFsc2VcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRQYXJzaW5nRmxhZ3MobSkge1xuICAgICAgICBpZiAobS5fcGYgPT0gbnVsbCkge1xuICAgICAgICAgICAgbS5fcGYgPSBkZWZhdWx0UGFyc2luZ0ZsYWdzKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG0uX3BmO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHZhbGlkX19pc1ZhbGlkKG0pIHtcbiAgICAgICAgaWYgKG0uX2lzVmFsaWQgPT0gbnVsbCkge1xuICAgICAgICAgICAgdmFyIGZsYWdzID0gZ2V0UGFyc2luZ0ZsYWdzKG0pO1xuICAgICAgICAgICAgbS5faXNWYWxpZCA9ICFpc05hTihtLl9kLmdldFRpbWUoKSkgJiZcbiAgICAgICAgICAgICAgICBmbGFncy5vdmVyZmxvdyA8IDAgJiZcbiAgICAgICAgICAgICAgICAhZmxhZ3MuZW1wdHkgJiZcbiAgICAgICAgICAgICAgICAhZmxhZ3MuaW52YWxpZE1vbnRoICYmXG4gICAgICAgICAgICAgICAgIWZsYWdzLmludmFsaWRXZWVrZGF5ICYmXG4gICAgICAgICAgICAgICAgIWZsYWdzLm51bGxJbnB1dCAmJlxuICAgICAgICAgICAgICAgICFmbGFncy5pbnZhbGlkRm9ybWF0ICYmXG4gICAgICAgICAgICAgICAgIWZsYWdzLnVzZXJJbnZhbGlkYXRlZDtcblxuICAgICAgICAgICAgaWYgKG0uX3N0cmljdCkge1xuICAgICAgICAgICAgICAgIG0uX2lzVmFsaWQgPSBtLl9pc1ZhbGlkICYmXG4gICAgICAgICAgICAgICAgICAgIGZsYWdzLmNoYXJzTGVmdE92ZXIgPT09IDAgJiZcbiAgICAgICAgICAgICAgICAgICAgZmxhZ3MudW51c2VkVG9rZW5zLmxlbmd0aCA9PT0gMCAmJlxuICAgICAgICAgICAgICAgICAgICBmbGFncy5iaWdIb3VyID09PSB1bmRlZmluZWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG0uX2lzVmFsaWQ7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdmFsaWRfX2NyZWF0ZUludmFsaWQgKGZsYWdzKSB7XG4gICAgICAgIHZhciBtID0gY3JlYXRlX3V0Y19fY3JlYXRlVVRDKE5hTik7XG4gICAgICAgIGlmIChmbGFncyAhPSBudWxsKSB7XG4gICAgICAgICAgICBleHRlbmQoZ2V0UGFyc2luZ0ZsYWdzKG0pLCBmbGFncyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBnZXRQYXJzaW5nRmxhZ3MobSkudXNlckludmFsaWRhdGVkID0gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBtO1xuICAgIH1cblxuICAgIHZhciBtb21lbnRQcm9wZXJ0aWVzID0gdXRpbHNfaG9va3NfX2hvb2tzLm1vbWVudFByb3BlcnRpZXMgPSBbXTtcblxuICAgIGZ1bmN0aW9uIGNvcHlDb25maWcodG8sIGZyb20pIHtcbiAgICAgICAgdmFyIGksIHByb3AsIHZhbDtcblxuICAgICAgICBpZiAodHlwZW9mIGZyb20uX2lzQU1vbWVudE9iamVjdCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHRvLl9pc0FNb21lbnRPYmplY3QgPSBmcm9tLl9pc0FNb21lbnRPYmplY3Q7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGVvZiBmcm9tLl9pICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgdG8uX2kgPSBmcm9tLl9pO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlb2YgZnJvbS5fZiAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHRvLl9mID0gZnJvbS5fZjtcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIGZyb20uX2wgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICB0by5fbCA9IGZyb20uX2w7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGVvZiBmcm9tLl9zdHJpY3QgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICB0by5fc3RyaWN0ID0gZnJvbS5fc3RyaWN0O1xuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlb2YgZnJvbS5fdHptICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgdG8uX3R6bSA9IGZyb20uX3R6bTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIGZyb20uX2lzVVRDICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgdG8uX2lzVVRDID0gZnJvbS5faXNVVEM7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGVvZiBmcm9tLl9vZmZzZXQgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICB0by5fb2Zmc2V0ID0gZnJvbS5fb2Zmc2V0O1xuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlb2YgZnJvbS5fcGYgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICB0by5fcGYgPSBnZXRQYXJzaW5nRmxhZ3MoZnJvbSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGVvZiBmcm9tLl9sb2NhbGUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICB0by5fbG9jYWxlID0gZnJvbS5fbG9jYWxlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG1vbWVudFByb3BlcnRpZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgZm9yIChpIGluIG1vbWVudFByb3BlcnRpZXMpIHtcbiAgICAgICAgICAgICAgICBwcm9wID0gbW9tZW50UHJvcGVydGllc1tpXTtcbiAgICAgICAgICAgICAgICB2YWwgPSBmcm9tW3Byb3BdO1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgdmFsICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgICAgICB0b1twcm9wXSA9IHZhbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdG87XG4gICAgfVxuXG4gICAgdmFyIHVwZGF0ZUluUHJvZ3Jlc3MgPSBmYWxzZTtcblxuICAgIC8vIE1vbWVudCBwcm90b3R5cGUgb2JqZWN0XG4gICAgZnVuY3Rpb24gTW9tZW50KGNvbmZpZykge1xuICAgICAgICBjb3B5Q29uZmlnKHRoaXMsIGNvbmZpZyk7XG4gICAgICAgIHRoaXMuX2QgPSBuZXcgRGF0ZShjb25maWcuX2QgIT0gbnVsbCA/IGNvbmZpZy5fZC5nZXRUaW1lKCkgOiBOYU4pO1xuICAgICAgICAvLyBQcmV2ZW50IGluZmluaXRlIGxvb3AgaW4gY2FzZSB1cGRhdGVPZmZzZXQgY3JlYXRlcyBuZXcgbW9tZW50XG4gICAgICAgIC8vIG9iamVjdHMuXG4gICAgICAgIGlmICh1cGRhdGVJblByb2dyZXNzID09PSBmYWxzZSkge1xuICAgICAgICAgICAgdXBkYXRlSW5Qcm9ncmVzcyA9IHRydWU7XG4gICAgICAgICAgICB1dGlsc19ob29rc19faG9va3MudXBkYXRlT2Zmc2V0KHRoaXMpO1xuICAgICAgICAgICAgdXBkYXRlSW5Qcm9ncmVzcyA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaXNNb21lbnQgKG9iaikge1xuICAgICAgICByZXR1cm4gb2JqIGluc3RhbmNlb2YgTW9tZW50IHx8IChvYmogIT0gbnVsbCAmJiBvYmouX2lzQU1vbWVudE9iamVjdCAhPSBudWxsKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBhYnNGbG9vciAobnVtYmVyKSB7XG4gICAgICAgIGlmIChudW1iZXIgPCAwKSB7XG4gICAgICAgICAgICByZXR1cm4gTWF0aC5jZWlsKG51bWJlcik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gTWF0aC5mbG9vcihudW1iZXIpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdG9JbnQoYXJndW1lbnRGb3JDb2VyY2lvbikge1xuICAgICAgICB2YXIgY29lcmNlZE51bWJlciA9ICthcmd1bWVudEZvckNvZXJjaW9uLFxuICAgICAgICAgICAgdmFsdWUgPSAwO1xuXG4gICAgICAgIGlmIChjb2VyY2VkTnVtYmVyICE9PSAwICYmIGlzRmluaXRlKGNvZXJjZWROdW1iZXIpKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IGFic0Zsb29yKGNvZXJjZWROdW1iZXIpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNvbXBhcmVBcnJheXMoYXJyYXkxLCBhcnJheTIsIGRvbnRDb252ZXJ0KSB7XG4gICAgICAgIHZhciBsZW4gPSBNYXRoLm1pbihhcnJheTEubGVuZ3RoLCBhcnJheTIubGVuZ3RoKSxcbiAgICAgICAgICAgIGxlbmd0aERpZmYgPSBNYXRoLmFicyhhcnJheTEubGVuZ3RoIC0gYXJyYXkyLmxlbmd0aCksXG4gICAgICAgICAgICBkaWZmcyA9IDAsXG4gICAgICAgICAgICBpO1xuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICAgIGlmICgoZG9udENvbnZlcnQgJiYgYXJyYXkxW2ldICE9PSBhcnJheTJbaV0pIHx8XG4gICAgICAgICAgICAgICAgKCFkb250Q29udmVydCAmJiB0b0ludChhcnJheTFbaV0pICE9PSB0b0ludChhcnJheTJbaV0pKSkge1xuICAgICAgICAgICAgICAgIGRpZmZzKys7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGRpZmZzICsgbGVuZ3RoRGlmZjtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBMb2NhbGUoKSB7XG4gICAgfVxuXG4gICAgdmFyIGxvY2FsZXMgPSB7fTtcbiAgICB2YXIgZ2xvYmFsTG9jYWxlO1xuXG4gICAgZnVuY3Rpb24gbm9ybWFsaXplTG9jYWxlKGtleSkge1xuICAgICAgICByZXR1cm4ga2V5ID8ga2V5LnRvTG93ZXJDYXNlKCkucmVwbGFjZSgnXycsICctJykgOiBrZXk7XG4gICAgfVxuXG4gICAgLy8gcGljayB0aGUgbG9jYWxlIGZyb20gdGhlIGFycmF5XG4gICAgLy8gdHJ5IFsnZW4tYXUnLCAnZW4tZ2InXSBhcyAnZW4tYXUnLCAnZW4tZ2InLCAnZW4nLCBhcyBpbiBtb3ZlIHRocm91Z2ggdGhlIGxpc3QgdHJ5aW5nIGVhY2hcbiAgICAvLyBzdWJzdHJpbmcgZnJvbSBtb3N0IHNwZWNpZmljIHRvIGxlYXN0LCBidXQgbW92ZSB0byB0aGUgbmV4dCBhcnJheSBpdGVtIGlmIGl0J3MgYSBtb3JlIHNwZWNpZmljIHZhcmlhbnQgdGhhbiB0aGUgY3VycmVudCByb290XG4gICAgZnVuY3Rpb24gY2hvb3NlTG9jYWxlKG5hbWVzKSB7XG4gICAgICAgIHZhciBpID0gMCwgaiwgbmV4dCwgbG9jYWxlLCBzcGxpdDtcblxuICAgICAgICB3aGlsZSAoaSA8IG5hbWVzLmxlbmd0aCkge1xuICAgICAgICAgICAgc3BsaXQgPSBub3JtYWxpemVMb2NhbGUobmFtZXNbaV0pLnNwbGl0KCctJyk7XG4gICAgICAgICAgICBqID0gc3BsaXQubGVuZ3RoO1xuICAgICAgICAgICAgbmV4dCA9IG5vcm1hbGl6ZUxvY2FsZShuYW1lc1tpICsgMV0pO1xuICAgICAgICAgICAgbmV4dCA9IG5leHQgPyBuZXh0LnNwbGl0KCctJykgOiBudWxsO1xuICAgICAgICAgICAgd2hpbGUgKGogPiAwKSB7XG4gICAgICAgICAgICAgICAgbG9jYWxlID0gbG9hZExvY2FsZShzcGxpdC5zbGljZSgwLCBqKS5qb2luKCctJykpO1xuICAgICAgICAgICAgICAgIGlmIChsb2NhbGUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxvY2FsZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKG5leHQgJiYgbmV4dC5sZW5ndGggPj0gaiAmJiBjb21wYXJlQXJyYXlzKHNwbGl0LCBuZXh0LCB0cnVlKSA+PSBqIC0gMSkge1xuICAgICAgICAgICAgICAgICAgICAvL3RoZSBuZXh0IGFycmF5IGl0ZW0gaXMgYmV0dGVyIHRoYW4gYSBzaGFsbG93ZXIgc3Vic3RyaW5nIG9mIHRoaXMgb25lXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBqLS07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpKys7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbG9hZExvY2FsZShuYW1lKSB7XG4gICAgICAgIHZhciBvbGRMb2NhbGUgPSBudWxsO1xuICAgICAgICAvLyBUT0RPOiBGaW5kIGEgYmV0dGVyIHdheSB0byByZWdpc3RlciBhbmQgbG9hZCBhbGwgdGhlIGxvY2FsZXMgaW4gTm9kZVxuICAgICAgICBpZiAoIWxvY2FsZXNbbmFtZV0gJiYgdHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiZcbiAgICAgICAgICAgICAgICBtb2R1bGUgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgb2xkTG9jYWxlID0gZ2xvYmFsTG9jYWxlLl9hYmJyO1xuICAgICAgICAgICAgICAgIHJlcXVpcmUoJy4vbG9jYWxlLycgKyBuYW1lKTtcbiAgICAgICAgICAgICAgICAvLyBiZWNhdXNlIGRlZmluZUxvY2FsZSBjdXJyZW50bHkgYWxzbyBzZXRzIHRoZSBnbG9iYWwgbG9jYWxlLCB3ZVxuICAgICAgICAgICAgICAgIC8vIHdhbnQgdG8gdW5kbyB0aGF0IGZvciBsYXp5IGxvYWRlZCBsb2NhbGVzXG4gICAgICAgICAgICAgICAgbG9jYWxlX2xvY2FsZXNfX2dldFNldEdsb2JhbExvY2FsZShvbGRMb2NhbGUpO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkgeyB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGxvY2FsZXNbbmFtZV07XG4gICAgfVxuXG4gICAgLy8gVGhpcyBmdW5jdGlvbiB3aWxsIGxvYWQgbG9jYWxlIGFuZCB0aGVuIHNldCB0aGUgZ2xvYmFsIGxvY2FsZS4gIElmXG4gICAgLy8gbm8gYXJndW1lbnRzIGFyZSBwYXNzZWQgaW4sIGl0IHdpbGwgc2ltcGx5IHJldHVybiB0aGUgY3VycmVudCBnbG9iYWxcbiAgICAvLyBsb2NhbGUga2V5LlxuICAgIGZ1bmN0aW9uIGxvY2FsZV9sb2NhbGVzX19nZXRTZXRHbG9iYWxMb2NhbGUgKGtleSwgdmFsdWVzKSB7XG4gICAgICAgIHZhciBkYXRhO1xuICAgICAgICBpZiAoa2V5KSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlcyA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBkYXRhID0gbG9jYWxlX2xvY2FsZXNfX2dldExvY2FsZShrZXkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgZGF0YSA9IGRlZmluZUxvY2FsZShrZXksIHZhbHVlcyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgLy8gbW9tZW50LmR1cmF0aW9uLl9sb2NhbGUgPSBtb21lbnQuX2xvY2FsZSA9IGRhdGE7XG4gICAgICAgICAgICAgICAgZ2xvYmFsTG9jYWxlID0gZGF0YTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBnbG9iYWxMb2NhbGUuX2FiYnI7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZGVmaW5lTG9jYWxlIChuYW1lLCB2YWx1ZXMpIHtcbiAgICAgICAgaWYgKHZhbHVlcyAhPT0gbnVsbCkge1xuICAgICAgICAgICAgdmFsdWVzLmFiYnIgPSBuYW1lO1xuICAgICAgICAgICAgbG9jYWxlc1tuYW1lXSA9IGxvY2FsZXNbbmFtZV0gfHwgbmV3IExvY2FsZSgpO1xuICAgICAgICAgICAgbG9jYWxlc1tuYW1lXS5zZXQodmFsdWVzKTtcblxuICAgICAgICAgICAgLy8gYmFja3dhcmRzIGNvbXBhdCBmb3Igbm93OiBhbHNvIHNldCB0aGUgbG9jYWxlXG4gICAgICAgICAgICBsb2NhbGVfbG9jYWxlc19fZ2V0U2V0R2xvYmFsTG9jYWxlKG5hbWUpO1xuXG4gICAgICAgICAgICByZXR1cm4gbG9jYWxlc1tuYW1lXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIHVzZWZ1bCBmb3IgdGVzdGluZ1xuICAgICAgICAgICAgZGVsZXRlIGxvY2FsZXNbbmFtZV07XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIHJldHVybnMgbG9jYWxlIGRhdGFcbiAgICBmdW5jdGlvbiBsb2NhbGVfbG9jYWxlc19fZ2V0TG9jYWxlIChrZXkpIHtcbiAgICAgICAgdmFyIGxvY2FsZTtcblxuICAgICAgICBpZiAoa2V5ICYmIGtleS5fbG9jYWxlICYmIGtleS5fbG9jYWxlLl9hYmJyKSB7XG4gICAgICAgICAgICBrZXkgPSBrZXkuX2xvY2FsZS5fYWJicjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICgha2V5KSB7XG4gICAgICAgICAgICByZXR1cm4gZ2xvYmFsTG9jYWxlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFpc0FycmF5KGtleSkpIHtcbiAgICAgICAgICAgIC8vc2hvcnQtY2lyY3VpdCBldmVyeXRoaW5nIGVsc2VcbiAgICAgICAgICAgIGxvY2FsZSA9IGxvYWRMb2NhbGUoa2V5KTtcbiAgICAgICAgICAgIGlmIChsb2NhbGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbG9jYWxlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAga2V5ID0gW2tleV07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gY2hvb3NlTG9jYWxlKGtleSk7XG4gICAgfVxuXG4gICAgdmFyIGFsaWFzZXMgPSB7fTtcblxuICAgIGZ1bmN0aW9uIGFkZFVuaXRBbGlhcyAodW5pdCwgc2hvcnRoYW5kKSB7XG4gICAgICAgIHZhciBsb3dlckNhc2UgPSB1bml0LnRvTG93ZXJDYXNlKCk7XG4gICAgICAgIGFsaWFzZXNbbG93ZXJDYXNlXSA9IGFsaWFzZXNbbG93ZXJDYXNlICsgJ3MnXSA9IGFsaWFzZXNbc2hvcnRoYW5kXSA9IHVuaXQ7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbm9ybWFsaXplVW5pdHModW5pdHMpIHtcbiAgICAgICAgcmV0dXJuIHR5cGVvZiB1bml0cyA9PT0gJ3N0cmluZycgPyBhbGlhc2VzW3VuaXRzXSB8fCBhbGlhc2VzW3VuaXRzLnRvTG93ZXJDYXNlKCldIDogdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG5vcm1hbGl6ZU9iamVjdFVuaXRzKGlucHV0T2JqZWN0KSB7XG4gICAgICAgIHZhciBub3JtYWxpemVkSW5wdXQgPSB7fSxcbiAgICAgICAgICAgIG5vcm1hbGl6ZWRQcm9wLFxuICAgICAgICAgICAgcHJvcDtcblxuICAgICAgICBmb3IgKHByb3AgaW4gaW5wdXRPYmplY3QpIHtcbiAgICAgICAgICAgIGlmIChoYXNPd25Qcm9wKGlucHV0T2JqZWN0LCBwcm9wKSkge1xuICAgICAgICAgICAgICAgIG5vcm1hbGl6ZWRQcm9wID0gbm9ybWFsaXplVW5pdHMocHJvcCk7XG4gICAgICAgICAgICAgICAgaWYgKG5vcm1hbGl6ZWRQcm9wKSB7XG4gICAgICAgICAgICAgICAgICAgIG5vcm1hbGl6ZWRJbnB1dFtub3JtYWxpemVkUHJvcF0gPSBpbnB1dE9iamVjdFtwcm9wXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbm9ybWFsaXplZElucHV0O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG1ha2VHZXRTZXQgKHVuaXQsIGtlZXBUaW1lKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgIGlmICh2YWx1ZSAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgZ2V0X3NldF9fc2V0KHRoaXMsIHVuaXQsIHZhbHVlKTtcbiAgICAgICAgICAgICAgICB1dGlsc19ob29rc19faG9va3MudXBkYXRlT2Zmc2V0KHRoaXMsIGtlZXBUaW1lKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGdldF9zZXRfX2dldCh0aGlzLCB1bml0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRfc2V0X19nZXQgKG1vbSwgdW5pdCkge1xuICAgICAgICByZXR1cm4gbW9tLl9kWydnZXQnICsgKG1vbS5faXNVVEMgPyAnVVRDJyA6ICcnKSArIHVuaXRdKCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0X3NldF9fc2V0IChtb20sIHVuaXQsIHZhbHVlKSB7XG4gICAgICAgIHJldHVybiBtb20uX2RbJ3NldCcgKyAobW9tLl9pc1VUQyA/ICdVVEMnIDogJycpICsgdW5pdF0odmFsdWUpO1xuICAgIH1cblxuICAgIC8vIE1PTUVOVFNcblxuICAgIGZ1bmN0aW9uIGdldFNldCAodW5pdHMsIHZhbHVlKSB7XG4gICAgICAgIHZhciB1bml0O1xuICAgICAgICBpZiAodHlwZW9mIHVuaXRzID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgZm9yICh1bml0IGluIHVuaXRzKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZXQodW5pdCwgdW5pdHNbdW5pdF0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdW5pdHMgPSBub3JtYWxpemVVbml0cyh1bml0cyk7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHRoaXNbdW5pdHNdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXNbdW5pdHNdKHZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB6ZXJvRmlsbChudW1iZXIsIHRhcmdldExlbmd0aCwgZm9yY2VTaWduKSB7XG4gICAgICAgIHZhciBhYnNOdW1iZXIgPSAnJyArIE1hdGguYWJzKG51bWJlciksXG4gICAgICAgICAgICB6ZXJvc1RvRmlsbCA9IHRhcmdldExlbmd0aCAtIGFic051bWJlci5sZW5ndGgsXG4gICAgICAgICAgICBzaWduID0gbnVtYmVyID49IDA7XG4gICAgICAgIHJldHVybiAoc2lnbiA/IChmb3JjZVNpZ24gPyAnKycgOiAnJykgOiAnLScpICtcbiAgICAgICAgICAgIE1hdGgucG93KDEwLCBNYXRoLm1heCgwLCB6ZXJvc1RvRmlsbCkpLnRvU3RyaW5nKCkuc3Vic3RyKDEpICsgYWJzTnVtYmVyO1xuICAgIH1cblxuICAgIHZhciBmb3JtYXR0aW5nVG9rZW5zID0gLyhcXFtbXlxcW10qXFxdKXwoXFxcXCk/KE1vfE1NP00/TT98RG98REREb3xERD9EP0Q/fGRkZD9kP3xkbz98d1tvfHddP3xXW298V10/fFF8WVlZWVlZfFlZWVlZfFlZWVl8WVl8Z2coZ2dnPyk/fEdHKEdHRz8pP3xlfEV8YXxBfGhoP3xISD98bW0/fHNzP3xTezEsOX18eHxYfHp6P3xaWj98LikvZztcblxuICAgIHZhciBsb2NhbEZvcm1hdHRpbmdUb2tlbnMgPSAvKFxcW1teXFxbXSpcXF0pfChcXFxcKT8oTFRTfExUfExMP0w/TD98bHsxLDR9KS9nO1xuXG4gICAgdmFyIGZvcm1hdEZ1bmN0aW9ucyA9IHt9O1xuXG4gICAgdmFyIGZvcm1hdFRva2VuRnVuY3Rpb25zID0ge307XG5cbiAgICAvLyB0b2tlbjogICAgJ00nXG4gICAgLy8gcGFkZGVkOiAgIFsnTU0nLCAyXVxuICAgIC8vIG9yZGluYWw6ICAnTW8nXG4gICAgLy8gY2FsbGJhY2s6IGZ1bmN0aW9uICgpIHsgdGhpcy5tb250aCgpICsgMSB9XG4gICAgZnVuY3Rpb24gYWRkRm9ybWF0VG9rZW4gKHRva2VuLCBwYWRkZWQsIG9yZGluYWwsIGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciBmdW5jID0gY2FsbGJhY2s7XG4gICAgICAgIGlmICh0eXBlb2YgY2FsbGJhY2sgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBmdW5jID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzW2NhbGxiYWNrXSgpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodG9rZW4pIHtcbiAgICAgICAgICAgIGZvcm1hdFRva2VuRnVuY3Rpb25zW3Rva2VuXSA9IGZ1bmM7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHBhZGRlZCkge1xuICAgICAgICAgICAgZm9ybWF0VG9rZW5GdW5jdGlvbnNbcGFkZGVkWzBdXSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gemVyb0ZpbGwoZnVuYy5hcHBseSh0aGlzLCBhcmd1bWVudHMpLCBwYWRkZWRbMV0sIHBhZGRlZFsyXSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIGlmIChvcmRpbmFsKSB7XG4gICAgICAgICAgICBmb3JtYXRUb2tlbkZ1bmN0aW9uc1tvcmRpbmFsXSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5sb2NhbGVEYXRhKCkub3JkaW5hbChmdW5jLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyksIHRva2VuKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiByZW1vdmVGb3JtYXR0aW5nVG9rZW5zKGlucHV0KSB7XG4gICAgICAgIGlmIChpbnB1dC5tYXRjaCgvXFxbW1xcc1xcU10vKSkge1xuICAgICAgICAgICAgcmV0dXJuIGlucHV0LnJlcGxhY2UoL15cXFt8XFxdJC9nLCAnJyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGlucHV0LnJlcGxhY2UoL1xcXFwvZywgJycpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG1ha2VGb3JtYXRGdW5jdGlvbihmb3JtYXQpIHtcbiAgICAgICAgdmFyIGFycmF5ID0gZm9ybWF0Lm1hdGNoKGZvcm1hdHRpbmdUb2tlbnMpLCBpLCBsZW5ndGg7XG5cbiAgICAgICAgZm9yIChpID0gMCwgbGVuZ3RoID0gYXJyYXkubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmIChmb3JtYXRUb2tlbkZ1bmN0aW9uc1thcnJheVtpXV0pIHtcbiAgICAgICAgICAgICAgICBhcnJheVtpXSA9IGZvcm1hdFRva2VuRnVuY3Rpb25zW2FycmF5W2ldXTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgYXJyYXlbaV0gPSByZW1vdmVGb3JtYXR0aW5nVG9rZW5zKGFycmF5W2ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAobW9tKSB7XG4gICAgICAgICAgICB2YXIgb3V0cHV0ID0gJyc7XG4gICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBvdXRwdXQgKz0gYXJyYXlbaV0gaW5zdGFuY2VvZiBGdW5jdGlvbiA/IGFycmF5W2ldLmNhbGwobW9tLCBmb3JtYXQpIDogYXJyYXlbaV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gb3V0cHV0O1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vIGZvcm1hdCBkYXRlIHVzaW5nIG5hdGl2ZSBkYXRlIG9iamVjdFxuICAgIGZ1bmN0aW9uIGZvcm1hdE1vbWVudChtLCBmb3JtYXQpIHtcbiAgICAgICAgaWYgKCFtLmlzVmFsaWQoKSkge1xuICAgICAgICAgICAgcmV0dXJuIG0ubG9jYWxlRGF0YSgpLmludmFsaWREYXRlKCk7XG4gICAgICAgIH1cblxuICAgICAgICBmb3JtYXQgPSBleHBhbmRGb3JtYXQoZm9ybWF0LCBtLmxvY2FsZURhdGEoKSk7XG4gICAgICAgIGZvcm1hdEZ1bmN0aW9uc1tmb3JtYXRdID0gZm9ybWF0RnVuY3Rpb25zW2Zvcm1hdF0gfHwgbWFrZUZvcm1hdEZ1bmN0aW9uKGZvcm1hdCk7XG5cbiAgICAgICAgcmV0dXJuIGZvcm1hdEZ1bmN0aW9uc1tmb3JtYXRdKG0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGV4cGFuZEZvcm1hdChmb3JtYXQsIGxvY2FsZSkge1xuICAgICAgICB2YXIgaSA9IDU7XG5cbiAgICAgICAgZnVuY3Rpb24gcmVwbGFjZUxvbmdEYXRlRm9ybWF0VG9rZW5zKGlucHV0KSB7XG4gICAgICAgICAgICByZXR1cm4gbG9jYWxlLmxvbmdEYXRlRm9ybWF0KGlucHV0KSB8fCBpbnB1dDtcbiAgICAgICAgfVxuXG4gICAgICAgIGxvY2FsRm9ybWF0dGluZ1Rva2Vucy5sYXN0SW5kZXggPSAwO1xuICAgICAgICB3aGlsZSAoaSA+PSAwICYmIGxvY2FsRm9ybWF0dGluZ1Rva2Vucy50ZXN0KGZvcm1hdCkpIHtcbiAgICAgICAgICAgIGZvcm1hdCA9IGZvcm1hdC5yZXBsYWNlKGxvY2FsRm9ybWF0dGluZ1Rva2VucywgcmVwbGFjZUxvbmdEYXRlRm9ybWF0VG9rZW5zKTtcbiAgICAgICAgICAgIGxvY2FsRm9ybWF0dGluZ1Rva2Vucy5sYXN0SW5kZXggPSAwO1xuICAgICAgICAgICAgaSAtPSAxO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGZvcm1hdDtcbiAgICB9XG5cbiAgICB2YXIgbWF0Y2gxICAgICAgICAgPSAvXFxkLzsgICAgICAgICAgICAvLyAgICAgICAwIC0gOVxuICAgIHZhciBtYXRjaDIgICAgICAgICA9IC9cXGRcXGQvOyAgICAgICAgICAvLyAgICAgIDAwIC0gOTlcbiAgICB2YXIgbWF0Y2gzICAgICAgICAgPSAvXFxkezN9LzsgICAgICAgICAvLyAgICAgMDAwIC0gOTk5XG4gICAgdmFyIG1hdGNoNCAgICAgICAgID0gL1xcZHs0fS87ICAgICAgICAgLy8gICAgMDAwMCAtIDk5OTlcbiAgICB2YXIgbWF0Y2g2ICAgICAgICAgPSAvWystXT9cXGR7Nn0vOyAgICAvLyAtOTk5OTk5IC0gOTk5OTk5XG4gICAgdmFyIG1hdGNoMXRvMiAgICAgID0gL1xcZFxcZD8vOyAgICAgICAgIC8vICAgICAgIDAgLSA5OVxuICAgIHZhciBtYXRjaDF0bzMgICAgICA9IC9cXGR7MSwzfS87ICAgICAgIC8vICAgICAgIDAgLSA5OTlcbiAgICB2YXIgbWF0Y2gxdG80ICAgICAgPSAvXFxkezEsNH0vOyAgICAgICAvLyAgICAgICAwIC0gOTk5OVxuICAgIHZhciBtYXRjaDF0bzYgICAgICA9IC9bKy1dP1xcZHsxLDZ9LzsgIC8vIC05OTk5OTkgLSA5OTk5OTlcblxuICAgIHZhciBtYXRjaFVuc2lnbmVkICA9IC9cXGQrLzsgICAgICAgICAgIC8vICAgICAgIDAgLSBpbmZcbiAgICB2YXIgbWF0Y2hTaWduZWQgICAgPSAvWystXT9cXGQrLzsgICAgICAvLyAgICAtaW5mIC0gaW5mXG5cbiAgICB2YXIgbWF0Y2hPZmZzZXQgICAgPSAvWnxbKy1dXFxkXFxkOj9cXGRcXGQvZ2k7IC8vICswMDowMCAtMDA6MDAgKzAwMDAgLTAwMDAgb3IgWlxuXG4gICAgdmFyIG1hdGNoVGltZXN0YW1wID0gL1srLV0/XFxkKyhcXC5cXGR7MSwzfSk/LzsgLy8gMTIzNDU2Nzg5IDEyMzQ1Njc4OS4xMjNcblxuICAgIC8vIGFueSB3b3JkIChvciB0d28pIGNoYXJhY3RlcnMgb3IgbnVtYmVycyBpbmNsdWRpbmcgdHdvL3RocmVlIHdvcmQgbW9udGggaW4gYXJhYmljLlxuICAgIHZhciBtYXRjaFdvcmQgPSAvWzAtOV0qWydhLXpcXHUwMEEwLVxcdTA1RkZcXHUwNzAwLVxcdUQ3RkZcXHVGOTAwLVxcdUZEQ0ZcXHVGREYwLVxcdUZGRUZdK3xbXFx1MDYwMC1cXHUwNkZGXFwvXSsoXFxzKj9bXFx1MDYwMC1cXHUwNkZGXSspezEsMn0vaTtcblxuICAgIHZhciByZWdleGVzID0ge307XG5cbiAgICBmdW5jdGlvbiBpc0Z1bmN0aW9uIChzdGgpIHtcbiAgICAgICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL21vbWVudC9tb21lbnQvaXNzdWVzLzIzMjVcbiAgICAgICAgcmV0dXJuIHR5cGVvZiBzdGggPT09ICdmdW5jdGlvbicgJiZcbiAgICAgICAgICAgIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChzdGgpID09PSAnW29iamVjdCBGdW5jdGlvbl0nO1xuICAgIH1cblxuXG4gICAgZnVuY3Rpb24gYWRkUmVnZXhUb2tlbiAodG9rZW4sIHJlZ2V4LCBzdHJpY3RSZWdleCkge1xuICAgICAgICByZWdleGVzW3Rva2VuXSA9IGlzRnVuY3Rpb24ocmVnZXgpID8gcmVnZXggOiBmdW5jdGlvbiAoaXNTdHJpY3QpIHtcbiAgICAgICAgICAgIHJldHVybiAoaXNTdHJpY3QgJiYgc3RyaWN0UmVnZXgpID8gc3RyaWN0UmVnZXggOiByZWdleDtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRQYXJzZVJlZ2V4Rm9yVG9rZW4gKHRva2VuLCBjb25maWcpIHtcbiAgICAgICAgaWYgKCFoYXNPd25Qcm9wKHJlZ2V4ZXMsIHRva2VuKSkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBSZWdFeHAodW5lc2NhcGVGb3JtYXQodG9rZW4pKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByZWdleGVzW3Rva2VuXShjb25maWcuX3N0cmljdCwgY29uZmlnLl9sb2NhbGUpO1xuICAgIH1cblxuICAgIC8vIENvZGUgZnJvbSBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzM1NjE0OTMvaXMtdGhlcmUtYS1yZWdleHAtZXNjYXBlLWZ1bmN0aW9uLWluLWphdmFzY3JpcHRcbiAgICBmdW5jdGlvbiB1bmVzY2FwZUZvcm1hdChzKSB7XG4gICAgICAgIHJldHVybiBzLnJlcGxhY2UoJ1xcXFwnLCAnJykucmVwbGFjZSgvXFxcXChcXFspfFxcXFwoXFxdKXxcXFsoW15cXF1cXFtdKilcXF18XFxcXCguKS9nLCBmdW5jdGlvbiAobWF0Y2hlZCwgcDEsIHAyLCBwMywgcDQpIHtcbiAgICAgICAgICAgIHJldHVybiBwMSB8fCBwMiB8fCBwMyB8fCBwNDtcbiAgICAgICAgfSkucmVwbGFjZSgvWy1cXC9cXFxcXiQqKz8uKCl8W1xcXXt9XS9nLCAnXFxcXCQmJyk7XG4gICAgfVxuXG4gICAgdmFyIHRva2VucyA9IHt9O1xuXG4gICAgZnVuY3Rpb24gYWRkUGFyc2VUb2tlbiAodG9rZW4sIGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciBpLCBmdW5jID0gY2FsbGJhY2s7XG4gICAgICAgIGlmICh0eXBlb2YgdG9rZW4gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICB0b2tlbiA9IFt0b2tlbl07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGVvZiBjYWxsYmFjayA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgICAgIGZ1bmMgPSBmdW5jdGlvbiAoaW5wdXQsIGFycmF5KSB7XG4gICAgICAgICAgICAgICAgYXJyYXlbY2FsbGJhY2tdID0gdG9JbnQoaW5wdXQpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgdG9rZW4ubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHRva2Vuc1t0b2tlbltpXV0gPSBmdW5jO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYWRkV2Vla1BhcnNlVG9rZW4gKHRva2VuLCBjYWxsYmFjaykge1xuICAgICAgICBhZGRQYXJzZVRva2VuKHRva2VuLCBmdW5jdGlvbiAoaW5wdXQsIGFycmF5LCBjb25maWcsIHRva2VuKSB7XG4gICAgICAgICAgICBjb25maWcuX3cgPSBjb25maWcuX3cgfHwge307XG4gICAgICAgICAgICBjYWxsYmFjayhpbnB1dCwgY29uZmlnLl93LCBjb25maWcsIHRva2VuKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYWRkVGltZVRvQXJyYXlGcm9tVG9rZW4odG9rZW4sIGlucHV0LCBjb25maWcpIHtcbiAgICAgICAgaWYgKGlucHV0ICE9IG51bGwgJiYgaGFzT3duUHJvcCh0b2tlbnMsIHRva2VuKSkge1xuICAgICAgICAgICAgdG9rZW5zW3Rva2VuXShpbnB1dCwgY29uZmlnLl9hLCBjb25maWcsIHRva2VuKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHZhciBZRUFSID0gMDtcbiAgICB2YXIgTU9OVEggPSAxO1xuICAgIHZhciBEQVRFID0gMjtcbiAgICB2YXIgSE9VUiA9IDM7XG4gICAgdmFyIE1JTlVURSA9IDQ7XG4gICAgdmFyIFNFQ09ORCA9IDU7XG4gICAgdmFyIE1JTExJU0VDT05EID0gNjtcblxuICAgIGZ1bmN0aW9uIGRheXNJbk1vbnRoKHllYXIsIG1vbnRoKSB7XG4gICAgICAgIHJldHVybiBuZXcgRGF0ZShEYXRlLlVUQyh5ZWFyLCBtb250aCArIDEsIDApKS5nZXRVVENEYXRlKCk7XG4gICAgfVxuXG4gICAgLy8gRk9STUFUVElOR1xuXG4gICAgYWRkRm9ybWF0VG9rZW4oJ00nLCBbJ01NJywgMl0sICdNbycsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubW9udGgoKSArIDE7XG4gICAgfSk7XG5cbiAgICBhZGRGb3JtYXRUb2tlbignTU1NJywgMCwgMCwgZnVuY3Rpb24gKGZvcm1hdCkge1xuICAgICAgICByZXR1cm4gdGhpcy5sb2NhbGVEYXRhKCkubW9udGhzU2hvcnQodGhpcywgZm9ybWF0KTtcbiAgICB9KTtcblxuICAgIGFkZEZvcm1hdFRva2VuKCdNTU1NJywgMCwgMCwgZnVuY3Rpb24gKGZvcm1hdCkge1xuICAgICAgICByZXR1cm4gdGhpcy5sb2NhbGVEYXRhKCkubW9udGhzKHRoaXMsIGZvcm1hdCk7XG4gICAgfSk7XG5cbiAgICAvLyBBTElBU0VTXG5cbiAgICBhZGRVbml0QWxpYXMoJ21vbnRoJywgJ00nKTtcblxuICAgIC8vIFBBUlNJTkdcblxuICAgIGFkZFJlZ2V4VG9rZW4oJ00nLCAgICBtYXRjaDF0bzIpO1xuICAgIGFkZFJlZ2V4VG9rZW4oJ01NJywgICBtYXRjaDF0bzIsIG1hdGNoMik7XG4gICAgYWRkUmVnZXhUb2tlbignTU1NJywgIG1hdGNoV29yZCk7XG4gICAgYWRkUmVnZXhUb2tlbignTU1NTScsIG1hdGNoV29yZCk7XG5cbiAgICBhZGRQYXJzZVRva2VuKFsnTScsICdNTSddLCBmdW5jdGlvbiAoaW5wdXQsIGFycmF5KSB7XG4gICAgICAgIGFycmF5W01PTlRIXSA9IHRvSW50KGlucHV0KSAtIDE7XG4gICAgfSk7XG5cbiAgICBhZGRQYXJzZVRva2VuKFsnTU1NJywgJ01NTU0nXSwgZnVuY3Rpb24gKGlucHV0LCBhcnJheSwgY29uZmlnLCB0b2tlbikge1xuICAgICAgICB2YXIgbW9udGggPSBjb25maWcuX2xvY2FsZS5tb250aHNQYXJzZShpbnB1dCwgdG9rZW4sIGNvbmZpZy5fc3RyaWN0KTtcbiAgICAgICAgLy8gaWYgd2UgZGlkbid0IGZpbmQgYSBtb250aCBuYW1lLCBtYXJrIHRoZSBkYXRlIGFzIGludmFsaWQuXG4gICAgICAgIGlmIChtb250aCAhPSBudWxsKSB7XG4gICAgICAgICAgICBhcnJheVtNT05USF0gPSBtb250aDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGdldFBhcnNpbmdGbGFncyhjb25maWcpLmludmFsaWRNb250aCA9IGlucHV0O1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBMT0NBTEVTXG5cbiAgICB2YXIgZGVmYXVsdExvY2FsZU1vbnRocyA9ICdKYW51YXJ5X0ZlYnJ1YXJ5X01hcmNoX0FwcmlsX01heV9KdW5lX0p1bHlfQXVndXN0X1NlcHRlbWJlcl9PY3RvYmVyX05vdmVtYmVyX0RlY2VtYmVyJy5zcGxpdCgnXycpO1xuICAgIGZ1bmN0aW9uIGxvY2FsZU1vbnRocyAobSkge1xuICAgICAgICByZXR1cm4gdGhpcy5fbW9udGhzW20ubW9udGgoKV07XG4gICAgfVxuXG4gICAgdmFyIGRlZmF1bHRMb2NhbGVNb250aHNTaG9ydCA9ICdKYW5fRmViX01hcl9BcHJfTWF5X0p1bl9KdWxfQXVnX1NlcF9PY3RfTm92X0RlYycuc3BsaXQoJ18nKTtcbiAgICBmdW5jdGlvbiBsb2NhbGVNb250aHNTaG9ydCAobSkge1xuICAgICAgICByZXR1cm4gdGhpcy5fbW9udGhzU2hvcnRbbS5tb250aCgpXTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBsb2NhbGVNb250aHNQYXJzZSAobW9udGhOYW1lLCBmb3JtYXQsIHN0cmljdCkge1xuICAgICAgICB2YXIgaSwgbW9tLCByZWdleDtcblxuICAgICAgICBpZiAoIXRoaXMuX21vbnRoc1BhcnNlKSB7XG4gICAgICAgICAgICB0aGlzLl9tb250aHNQYXJzZSA9IFtdO1xuICAgICAgICAgICAgdGhpcy5fbG9uZ01vbnRoc1BhcnNlID0gW107XG4gICAgICAgICAgICB0aGlzLl9zaG9ydE1vbnRoc1BhcnNlID0gW107XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgMTI7IGkrKykge1xuICAgICAgICAgICAgLy8gbWFrZSB0aGUgcmVnZXggaWYgd2UgZG9uJ3QgaGF2ZSBpdCBhbHJlYWR5XG4gICAgICAgICAgICBtb20gPSBjcmVhdGVfdXRjX19jcmVhdGVVVEMoWzIwMDAsIGldKTtcbiAgICAgICAgICAgIGlmIChzdHJpY3QgJiYgIXRoaXMuX2xvbmdNb250aHNQYXJzZVtpXSkge1xuICAgICAgICAgICAgICAgIHRoaXMuX2xvbmdNb250aHNQYXJzZVtpXSA9IG5ldyBSZWdFeHAoJ14nICsgdGhpcy5tb250aHMobW9tLCAnJykucmVwbGFjZSgnLicsICcnKSArICckJywgJ2knKTtcbiAgICAgICAgICAgICAgICB0aGlzLl9zaG9ydE1vbnRoc1BhcnNlW2ldID0gbmV3IFJlZ0V4cCgnXicgKyB0aGlzLm1vbnRoc1Nob3J0KG1vbSwgJycpLnJlcGxhY2UoJy4nLCAnJykgKyAnJCcsICdpJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIXN0cmljdCAmJiAhdGhpcy5fbW9udGhzUGFyc2VbaV0pIHtcbiAgICAgICAgICAgICAgICByZWdleCA9ICdeJyArIHRoaXMubW9udGhzKG1vbSwgJycpICsgJ3xeJyArIHRoaXMubW9udGhzU2hvcnQobW9tLCAnJyk7XG4gICAgICAgICAgICAgICAgdGhpcy5fbW9udGhzUGFyc2VbaV0gPSBuZXcgUmVnRXhwKHJlZ2V4LnJlcGxhY2UoJy4nLCAnJyksICdpJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyB0ZXN0IHRoZSByZWdleFxuICAgICAgICAgICAgaWYgKHN0cmljdCAmJiBmb3JtYXQgPT09ICdNTU1NJyAmJiB0aGlzLl9sb25nTW9udGhzUGFyc2VbaV0udGVzdChtb250aE5hbWUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHN0cmljdCAmJiBmb3JtYXQgPT09ICdNTU0nICYmIHRoaXMuX3Nob3J0TW9udGhzUGFyc2VbaV0udGVzdChtb250aE5hbWUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCFzdHJpY3QgJiYgdGhpcy5fbW9udGhzUGFyc2VbaV0udGVzdChtb250aE5hbWUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBNT01FTlRTXG5cbiAgICBmdW5jdGlvbiBzZXRNb250aCAobW9tLCB2YWx1ZSkge1xuICAgICAgICB2YXIgZGF5T2ZNb250aDtcblxuICAgICAgICAvLyBUT0RPOiBNb3ZlIHRoaXMgb3V0IG9mIGhlcmUhXG4gICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IG1vbS5sb2NhbGVEYXRhKCkubW9udGhzUGFyc2UodmFsdWUpO1xuICAgICAgICAgICAgLy8gVE9ETzogQW5vdGhlciBzaWxlbnQgZmFpbHVyZT9cbiAgICAgICAgICAgIGlmICh0eXBlb2YgdmFsdWUgIT09ICdudW1iZXInKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG1vbTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGRheU9mTW9udGggPSBNYXRoLm1pbihtb20uZGF0ZSgpLCBkYXlzSW5Nb250aChtb20ueWVhcigpLCB2YWx1ZSkpO1xuICAgICAgICBtb20uX2RbJ3NldCcgKyAobW9tLl9pc1VUQyA/ICdVVEMnIDogJycpICsgJ01vbnRoJ10odmFsdWUsIGRheU9mTW9udGgpO1xuICAgICAgICByZXR1cm4gbW9tO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldFNldE1vbnRoICh2YWx1ZSkge1xuICAgICAgICBpZiAodmFsdWUgIT0gbnVsbCkge1xuICAgICAgICAgICAgc2V0TW9udGgodGhpcywgdmFsdWUpO1xuICAgICAgICAgICAgdXRpbHNfaG9va3NfX2hvb2tzLnVwZGF0ZU9mZnNldCh0aGlzLCB0cnVlKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGdldF9zZXRfX2dldCh0aGlzLCAnTW9udGgnKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldERheXNJbk1vbnRoICgpIHtcbiAgICAgICAgcmV0dXJuIGRheXNJbk1vbnRoKHRoaXMueWVhcigpLCB0aGlzLm1vbnRoKCkpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNoZWNrT3ZlcmZsb3cgKG0pIHtcbiAgICAgICAgdmFyIG92ZXJmbG93O1xuICAgICAgICB2YXIgYSA9IG0uX2E7XG5cbiAgICAgICAgaWYgKGEgJiYgZ2V0UGFyc2luZ0ZsYWdzKG0pLm92ZXJmbG93ID09PSAtMikge1xuICAgICAgICAgICAgb3ZlcmZsb3cgPVxuICAgICAgICAgICAgICAgIGFbTU9OVEhdICAgICAgIDwgMCB8fCBhW01PTlRIXSAgICAgICA+IDExICA/IE1PTlRIIDpcbiAgICAgICAgICAgICAgICBhW0RBVEVdICAgICAgICA8IDEgfHwgYVtEQVRFXSAgICAgICAgPiBkYXlzSW5Nb250aChhW1lFQVJdLCBhW01PTlRIXSkgPyBEQVRFIDpcbiAgICAgICAgICAgICAgICBhW0hPVVJdICAgICAgICA8IDAgfHwgYVtIT1VSXSAgICAgICAgPiAyNCB8fCAoYVtIT1VSXSA9PT0gMjQgJiYgKGFbTUlOVVRFXSAhPT0gMCB8fCBhW1NFQ09ORF0gIT09IDAgfHwgYVtNSUxMSVNFQ09ORF0gIT09IDApKSA/IEhPVVIgOlxuICAgICAgICAgICAgICAgIGFbTUlOVVRFXSAgICAgIDwgMCB8fCBhW01JTlVURV0gICAgICA+IDU5ICA/IE1JTlVURSA6XG4gICAgICAgICAgICAgICAgYVtTRUNPTkRdICAgICAgPCAwIHx8IGFbU0VDT05EXSAgICAgID4gNTkgID8gU0VDT05EIDpcbiAgICAgICAgICAgICAgICBhW01JTExJU0VDT05EXSA8IDAgfHwgYVtNSUxMSVNFQ09ORF0gPiA5OTkgPyBNSUxMSVNFQ09ORCA6XG4gICAgICAgICAgICAgICAgLTE7XG5cbiAgICAgICAgICAgIGlmIChnZXRQYXJzaW5nRmxhZ3MobSkuX292ZXJmbG93RGF5T2ZZZWFyICYmIChvdmVyZmxvdyA8IFlFQVIgfHwgb3ZlcmZsb3cgPiBEQVRFKSkge1xuICAgICAgICAgICAgICAgIG92ZXJmbG93ID0gREFURTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZ2V0UGFyc2luZ0ZsYWdzKG0pLm92ZXJmbG93ID0gb3ZlcmZsb3c7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB3YXJuKG1zZykge1xuICAgICAgICBpZiAodXRpbHNfaG9va3NfX2hvb2tzLnN1cHByZXNzRGVwcmVjYXRpb25XYXJuaW5ncyA9PT0gZmFsc2UgJiYgdHlwZW9mIGNvbnNvbGUgIT09ICd1bmRlZmluZWQnICYmIGNvbnNvbGUud2Fybikge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKCdEZXByZWNhdGlvbiB3YXJuaW5nOiAnICsgbXNnKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRlcHJlY2F0ZShtc2csIGZuKSB7XG4gICAgICAgIHZhciBmaXJzdFRpbWUgPSB0cnVlO1xuXG4gICAgICAgIHJldHVybiBleHRlbmQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKGZpcnN0VGltZSkge1xuICAgICAgICAgICAgICAgIHdhcm4obXNnICsgJ1xcbicgKyAobmV3IEVycm9yKCkpLnN0YWNrKTtcbiAgICAgICAgICAgICAgICBmaXJzdFRpbWUgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICB9LCBmbik7XG4gICAgfVxuXG4gICAgdmFyIGRlcHJlY2F0aW9ucyA9IHt9O1xuXG4gICAgZnVuY3Rpb24gZGVwcmVjYXRlU2ltcGxlKG5hbWUsIG1zZykge1xuICAgICAgICBpZiAoIWRlcHJlY2F0aW9uc1tuYW1lXSkge1xuICAgICAgICAgICAgd2Fybihtc2cpO1xuICAgICAgICAgICAgZGVwcmVjYXRpb25zW25hbWVdID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHV0aWxzX2hvb2tzX19ob29rcy5zdXBwcmVzc0RlcHJlY2F0aW9uV2FybmluZ3MgPSBmYWxzZTtcblxuICAgIHZhciBmcm9tX3N0cmluZ19faXNvUmVnZXggPSAvXlxccyooPzpbKy1dXFxkezZ9fFxcZHs0fSktKD86KFxcZFxcZC1cXGRcXGQpfChXXFxkXFxkJCl8KFdcXGRcXGQtXFxkKXwoXFxkXFxkXFxkKSkoKFR8ICkoXFxkXFxkKDpcXGRcXGQoOlxcZFxcZChcXC5cXGQrKT8pPyk/KT8oW1xcK1xcLV1cXGRcXGQoPzo6P1xcZFxcZCk/fFxccypaKT8pPyQvO1xuXG4gICAgdmFyIGlzb0RhdGVzID0gW1xuICAgICAgICBbJ1lZWVlZWS1NTS1ERCcsIC9bKy1dXFxkezZ9LVxcZHsyfS1cXGR7Mn0vXSxcbiAgICAgICAgWydZWVlZLU1NLUREJywgL1xcZHs0fS1cXGR7Mn0tXFxkezJ9L10sXG4gICAgICAgIFsnR0dHRy1bV11XVy1FJywgL1xcZHs0fS1XXFxkezJ9LVxcZC9dLFxuICAgICAgICBbJ0dHR0ctW1ddV1cnLCAvXFxkezR9LVdcXGR7Mn0vXSxcbiAgICAgICAgWydZWVlZLURERCcsIC9cXGR7NH0tXFxkezN9L11cbiAgICBdO1xuXG4gICAgLy8gaXNvIHRpbWUgZm9ybWF0cyBhbmQgcmVnZXhlc1xuICAgIHZhciBpc29UaW1lcyA9IFtcbiAgICAgICAgWydISDptbTpzcy5TU1NTJywgLyhUfCApXFxkXFxkOlxcZFxcZDpcXGRcXGRcXC5cXGQrL10sXG4gICAgICAgIFsnSEg6bW06c3MnLCAvKFR8IClcXGRcXGQ6XFxkXFxkOlxcZFxcZC9dLFxuICAgICAgICBbJ0hIOm1tJywgLyhUfCApXFxkXFxkOlxcZFxcZC9dLFxuICAgICAgICBbJ0hIJywgLyhUfCApXFxkXFxkL11cbiAgICBdO1xuXG4gICAgdmFyIGFzcE5ldEpzb25SZWdleCA9IC9eXFwvP0RhdGVcXCgoXFwtP1xcZCspL2k7XG5cbiAgICAvLyBkYXRlIGZyb20gaXNvIGZvcm1hdFxuICAgIGZ1bmN0aW9uIGNvbmZpZ0Zyb21JU08oY29uZmlnKSB7XG4gICAgICAgIHZhciBpLCBsLFxuICAgICAgICAgICAgc3RyaW5nID0gY29uZmlnLl9pLFxuICAgICAgICAgICAgbWF0Y2ggPSBmcm9tX3N0cmluZ19faXNvUmVnZXguZXhlYyhzdHJpbmcpO1xuXG4gICAgICAgIGlmIChtYXRjaCkge1xuICAgICAgICAgICAgZ2V0UGFyc2luZ0ZsYWdzKGNvbmZpZykuaXNvID0gdHJ1ZTtcbiAgICAgICAgICAgIGZvciAoaSA9IDAsIGwgPSBpc29EYXRlcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgICAgICAgICBpZiAoaXNvRGF0ZXNbaV1bMV0uZXhlYyhzdHJpbmcpKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbmZpZy5fZiA9IGlzb0RhdGVzW2ldWzBdO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3IgKGkgPSAwLCBsID0gaXNvVGltZXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgaWYgKGlzb1RpbWVzW2ldWzFdLmV4ZWMoc3RyaW5nKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBtYXRjaFs2XSBzaG91bGQgYmUgJ1QnIG9yIHNwYWNlXG4gICAgICAgICAgICAgICAgICAgIGNvbmZpZy5fZiArPSAobWF0Y2hbNl0gfHwgJyAnKSArIGlzb1RpbWVzW2ldWzBdO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoc3RyaW5nLm1hdGNoKG1hdGNoT2Zmc2V0KSkge1xuICAgICAgICAgICAgICAgIGNvbmZpZy5fZiArPSAnWic7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25maWdGcm9tU3RyaW5nQW5kRm9ybWF0KGNvbmZpZyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25maWcuX2lzVmFsaWQgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIGRhdGUgZnJvbSBpc28gZm9ybWF0IG9yIGZhbGxiYWNrXG4gICAgZnVuY3Rpb24gY29uZmlnRnJvbVN0cmluZyhjb25maWcpIHtcbiAgICAgICAgdmFyIG1hdGNoZWQgPSBhc3BOZXRKc29uUmVnZXguZXhlYyhjb25maWcuX2kpO1xuXG4gICAgICAgIGlmIChtYXRjaGVkICE9PSBudWxsKSB7XG4gICAgICAgICAgICBjb25maWcuX2QgPSBuZXcgRGF0ZSgrbWF0Y2hlZFsxXSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25maWdGcm9tSVNPKGNvbmZpZyk7XG4gICAgICAgIGlmIChjb25maWcuX2lzVmFsaWQgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICBkZWxldGUgY29uZmlnLl9pc1ZhbGlkO1xuICAgICAgICAgICAgdXRpbHNfaG9va3NfX2hvb2tzLmNyZWF0ZUZyb21JbnB1dEZhbGxiYWNrKGNvbmZpZyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB1dGlsc19ob29rc19faG9va3MuY3JlYXRlRnJvbUlucHV0RmFsbGJhY2sgPSBkZXByZWNhdGUoXG4gICAgICAgICdtb21lbnQgY29uc3RydWN0aW9uIGZhbGxzIGJhY2sgdG8ganMgRGF0ZS4gVGhpcyBpcyAnICtcbiAgICAgICAgJ2Rpc2NvdXJhZ2VkIGFuZCB3aWxsIGJlIHJlbW92ZWQgaW4gdXBjb21pbmcgbWFqb3IgJyArXG4gICAgICAgICdyZWxlYXNlLiBQbGVhc2UgcmVmZXIgdG8gJyArXG4gICAgICAgICdodHRwczovL2dpdGh1Yi5jb20vbW9tZW50L21vbWVudC9pc3N1ZXMvMTQwNyBmb3IgbW9yZSBpbmZvLicsXG4gICAgICAgIGZ1bmN0aW9uIChjb25maWcpIHtcbiAgICAgICAgICAgIGNvbmZpZy5fZCA9IG5ldyBEYXRlKGNvbmZpZy5faSArIChjb25maWcuX3VzZVVUQyA/ICcgVVRDJyA6ICcnKSk7XG4gICAgICAgIH1cbiAgICApO1xuXG4gICAgZnVuY3Rpb24gY3JlYXRlRGF0ZSAoeSwgbSwgZCwgaCwgTSwgcywgbXMpIHtcbiAgICAgICAgLy9jYW4ndCBqdXN0IGFwcGx5KCkgdG8gY3JlYXRlIGEgZGF0ZTpcbiAgICAgICAgLy9odHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzE4MTM0OC9pbnN0YW50aWF0aW5nLWEtamF2YXNjcmlwdC1vYmplY3QtYnktY2FsbGluZy1wcm90b3R5cGUtY29uc3RydWN0b3ItYXBwbHlcbiAgICAgICAgdmFyIGRhdGUgPSBuZXcgRGF0ZSh5LCBtLCBkLCBoLCBNLCBzLCBtcyk7XG5cbiAgICAgICAgLy90aGUgZGF0ZSBjb25zdHJ1Y3RvciBkb2Vzbid0IGFjY2VwdCB5ZWFycyA8IDE5NzBcbiAgICAgICAgaWYgKHkgPCAxOTcwKSB7XG4gICAgICAgICAgICBkYXRlLnNldEZ1bGxZZWFyKHkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkYXRlO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNyZWF0ZVVUQ0RhdGUgKHkpIHtcbiAgICAgICAgdmFyIGRhdGUgPSBuZXcgRGF0ZShEYXRlLlVUQy5hcHBseShudWxsLCBhcmd1bWVudHMpKTtcbiAgICAgICAgaWYgKHkgPCAxOTcwKSB7XG4gICAgICAgICAgICBkYXRlLnNldFVUQ0Z1bGxZZWFyKHkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkYXRlO1xuICAgIH1cblxuICAgIGFkZEZvcm1hdFRva2VuKDAsIFsnWVknLCAyXSwgMCwgZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy55ZWFyKCkgJSAxMDA7XG4gICAgfSk7XG5cbiAgICBhZGRGb3JtYXRUb2tlbigwLCBbJ1lZWVknLCAgIDRdLCAgICAgICAwLCAneWVhcicpO1xuICAgIGFkZEZvcm1hdFRva2VuKDAsIFsnWVlZWVknLCAgNV0sICAgICAgIDAsICd5ZWFyJyk7XG4gICAgYWRkRm9ybWF0VG9rZW4oMCwgWydZWVlZWVknLCA2LCB0cnVlXSwgMCwgJ3llYXInKTtcblxuICAgIC8vIEFMSUFTRVNcblxuICAgIGFkZFVuaXRBbGlhcygneWVhcicsICd5Jyk7XG5cbiAgICAvLyBQQVJTSU5HXG5cbiAgICBhZGRSZWdleFRva2VuKCdZJywgICAgICBtYXRjaFNpZ25lZCk7XG4gICAgYWRkUmVnZXhUb2tlbignWVknLCAgICAgbWF0Y2gxdG8yLCBtYXRjaDIpO1xuICAgIGFkZFJlZ2V4VG9rZW4oJ1lZWVknLCAgIG1hdGNoMXRvNCwgbWF0Y2g0KTtcbiAgICBhZGRSZWdleFRva2VuKCdZWVlZWScsICBtYXRjaDF0bzYsIG1hdGNoNik7XG4gICAgYWRkUmVnZXhUb2tlbignWVlZWVlZJywgbWF0Y2gxdG82LCBtYXRjaDYpO1xuXG4gICAgYWRkUGFyc2VUb2tlbihbJ1lZWVlZJywgJ1lZWVlZWSddLCBZRUFSKTtcbiAgICBhZGRQYXJzZVRva2VuKCdZWVlZJywgZnVuY3Rpb24gKGlucHV0LCBhcnJheSkge1xuICAgICAgICBhcnJheVtZRUFSXSA9IGlucHV0Lmxlbmd0aCA9PT0gMiA/IHV0aWxzX2hvb2tzX19ob29rcy5wYXJzZVR3b0RpZ2l0WWVhcihpbnB1dCkgOiB0b0ludChpbnB1dCk7XG4gICAgfSk7XG4gICAgYWRkUGFyc2VUb2tlbignWVknLCBmdW5jdGlvbiAoaW5wdXQsIGFycmF5KSB7XG4gICAgICAgIGFycmF5W1lFQVJdID0gdXRpbHNfaG9va3NfX2hvb2tzLnBhcnNlVHdvRGlnaXRZZWFyKGlucHV0KTtcbiAgICB9KTtcblxuICAgIC8vIEhFTFBFUlNcblxuICAgIGZ1bmN0aW9uIGRheXNJblllYXIoeWVhcikge1xuICAgICAgICByZXR1cm4gaXNMZWFwWWVhcih5ZWFyKSA/IDM2NiA6IDM2NTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpc0xlYXBZZWFyKHllYXIpIHtcbiAgICAgICAgcmV0dXJuICh5ZWFyICUgNCA9PT0gMCAmJiB5ZWFyICUgMTAwICE9PSAwKSB8fCB5ZWFyICUgNDAwID09PSAwO1xuICAgIH1cblxuICAgIC8vIEhPT0tTXG5cbiAgICB1dGlsc19ob29rc19faG9va3MucGFyc2VUd29EaWdpdFllYXIgPSBmdW5jdGlvbiAoaW5wdXQpIHtcbiAgICAgICAgcmV0dXJuIHRvSW50KGlucHV0KSArICh0b0ludChpbnB1dCkgPiA2OCA/IDE5MDAgOiAyMDAwKTtcbiAgICB9O1xuXG4gICAgLy8gTU9NRU5UU1xuXG4gICAgdmFyIGdldFNldFllYXIgPSBtYWtlR2V0U2V0KCdGdWxsWWVhcicsIGZhbHNlKTtcblxuICAgIGZ1bmN0aW9uIGdldElzTGVhcFllYXIgKCkge1xuICAgICAgICByZXR1cm4gaXNMZWFwWWVhcih0aGlzLnllYXIoKSk7XG4gICAgfVxuXG4gICAgYWRkRm9ybWF0VG9rZW4oJ3cnLCBbJ3d3JywgMl0sICd3bycsICd3ZWVrJyk7XG4gICAgYWRkRm9ybWF0VG9rZW4oJ1cnLCBbJ1dXJywgMl0sICdXbycsICdpc29XZWVrJyk7XG5cbiAgICAvLyBBTElBU0VTXG5cbiAgICBhZGRVbml0QWxpYXMoJ3dlZWsnLCAndycpO1xuICAgIGFkZFVuaXRBbGlhcygnaXNvV2VlaycsICdXJyk7XG5cbiAgICAvLyBQQVJTSU5HXG5cbiAgICBhZGRSZWdleFRva2VuKCd3JywgIG1hdGNoMXRvMik7XG4gICAgYWRkUmVnZXhUb2tlbignd3cnLCBtYXRjaDF0bzIsIG1hdGNoMik7XG4gICAgYWRkUmVnZXhUb2tlbignVycsICBtYXRjaDF0bzIpO1xuICAgIGFkZFJlZ2V4VG9rZW4oJ1dXJywgbWF0Y2gxdG8yLCBtYXRjaDIpO1xuXG4gICAgYWRkV2Vla1BhcnNlVG9rZW4oWyd3JywgJ3d3JywgJ1cnLCAnV1cnXSwgZnVuY3Rpb24gKGlucHV0LCB3ZWVrLCBjb25maWcsIHRva2VuKSB7XG4gICAgICAgIHdlZWtbdG9rZW4uc3Vic3RyKDAsIDEpXSA9IHRvSW50KGlucHV0KTtcbiAgICB9KTtcblxuICAgIC8vIEhFTFBFUlNcblxuICAgIC8vIGZpcnN0RGF5T2ZXZWVrICAgICAgIDAgPSBzdW4sIDYgPSBzYXRcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgICB0aGUgZGF5IG9mIHRoZSB3ZWVrIHRoYXQgc3RhcnRzIHRoZSB3ZWVrXG4gICAgLy8gICAgICAgICAgICAgICAgICAgICAgKHVzdWFsbHkgc3VuZGF5IG9yIG1vbmRheSlcbiAgICAvLyBmaXJzdERheU9mV2Vla09mWWVhciAwID0gc3VuLCA2ID0gc2F0XG4gICAgLy8gICAgICAgICAgICAgICAgICAgICAgdGhlIGZpcnN0IHdlZWsgaXMgdGhlIHdlZWsgdGhhdCBjb250YWlucyB0aGUgZmlyc3RcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgICBvZiB0aGlzIGRheSBvZiB0aGUgd2Vla1xuICAgIC8vICAgICAgICAgICAgICAgICAgICAgIChlZy4gSVNPIHdlZWtzIHVzZSB0aHVyc2RheSAoNCkpXG4gICAgZnVuY3Rpb24gd2Vla09mWWVhcihtb20sIGZpcnN0RGF5T2ZXZWVrLCBmaXJzdERheU9mV2Vla09mWWVhcikge1xuICAgICAgICB2YXIgZW5kID0gZmlyc3REYXlPZldlZWtPZlllYXIgLSBmaXJzdERheU9mV2VlayxcbiAgICAgICAgICAgIGRheXNUb0RheU9mV2VlayA9IGZpcnN0RGF5T2ZXZWVrT2ZZZWFyIC0gbW9tLmRheSgpLFxuICAgICAgICAgICAgYWRqdXN0ZWRNb21lbnQ7XG5cblxuICAgICAgICBpZiAoZGF5c1RvRGF5T2ZXZWVrID4gZW5kKSB7XG4gICAgICAgICAgICBkYXlzVG9EYXlPZldlZWsgLT0gNztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChkYXlzVG9EYXlPZldlZWsgPCBlbmQgLSA3KSB7XG4gICAgICAgICAgICBkYXlzVG9EYXlPZldlZWsgKz0gNztcbiAgICAgICAgfVxuXG4gICAgICAgIGFkanVzdGVkTW9tZW50ID0gbG9jYWxfX2NyZWF0ZUxvY2FsKG1vbSkuYWRkKGRheXNUb0RheU9mV2VlaywgJ2QnKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHdlZWs6IE1hdGguY2VpbChhZGp1c3RlZE1vbWVudC5kYXlPZlllYXIoKSAvIDcpLFxuICAgICAgICAgICAgeWVhcjogYWRqdXN0ZWRNb21lbnQueWVhcigpXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gTE9DQUxFU1xuXG4gICAgZnVuY3Rpb24gbG9jYWxlV2VlayAobW9tKSB7XG4gICAgICAgIHJldHVybiB3ZWVrT2ZZZWFyKG1vbSwgdGhpcy5fd2Vlay5kb3csIHRoaXMuX3dlZWsuZG95KS53ZWVrO1xuICAgIH1cblxuICAgIHZhciBkZWZhdWx0TG9jYWxlV2VlayA9IHtcbiAgICAgICAgZG93IDogMCwgLy8gU3VuZGF5IGlzIHRoZSBmaXJzdCBkYXkgb2YgdGhlIHdlZWsuXG4gICAgICAgIGRveSA6IDYgIC8vIFRoZSB3ZWVrIHRoYXQgY29udGFpbnMgSmFuIDFzdCBpcyB0aGUgZmlyc3Qgd2VlayBvZiB0aGUgeWVhci5cbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gbG9jYWxlRmlyc3REYXlPZldlZWsgKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fd2Vlay5kb3c7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbG9jYWxlRmlyc3REYXlPZlllYXIgKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fd2Vlay5kb3k7XG4gICAgfVxuXG4gICAgLy8gTU9NRU5UU1xuXG4gICAgZnVuY3Rpb24gZ2V0U2V0V2VlayAoaW5wdXQpIHtcbiAgICAgICAgdmFyIHdlZWsgPSB0aGlzLmxvY2FsZURhdGEoKS53ZWVrKHRoaXMpO1xuICAgICAgICByZXR1cm4gaW5wdXQgPT0gbnVsbCA/IHdlZWsgOiB0aGlzLmFkZCgoaW5wdXQgLSB3ZWVrKSAqIDcsICdkJyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0U2V0SVNPV2VlayAoaW5wdXQpIHtcbiAgICAgICAgdmFyIHdlZWsgPSB3ZWVrT2ZZZWFyKHRoaXMsIDEsIDQpLndlZWs7XG4gICAgICAgIHJldHVybiBpbnB1dCA9PSBudWxsID8gd2VlayA6IHRoaXMuYWRkKChpbnB1dCAtIHdlZWspICogNywgJ2QnKTtcbiAgICB9XG5cbiAgICBhZGRGb3JtYXRUb2tlbignREREJywgWydEREREJywgM10sICdERERvJywgJ2RheU9mWWVhcicpO1xuXG4gICAgLy8gQUxJQVNFU1xuXG4gICAgYWRkVW5pdEFsaWFzKCdkYXlPZlllYXInLCAnREREJyk7XG5cbiAgICAvLyBQQVJTSU5HXG5cbiAgICBhZGRSZWdleFRva2VuKCdEREQnLCAgbWF0Y2gxdG8zKTtcbiAgICBhZGRSZWdleFRva2VuKCdEREREJywgbWF0Y2gzKTtcbiAgICBhZGRQYXJzZVRva2VuKFsnREREJywgJ0REREQnXSwgZnVuY3Rpb24gKGlucHV0LCBhcnJheSwgY29uZmlnKSB7XG4gICAgICAgIGNvbmZpZy5fZGF5T2ZZZWFyID0gdG9JbnQoaW5wdXQpO1xuICAgIH0pO1xuXG4gICAgLy8gSEVMUEVSU1xuXG4gICAgLy9odHRwOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0lTT193ZWVrX2RhdGUjQ2FsY3VsYXRpbmdfYV9kYXRlX2dpdmVuX3RoZV95ZWFyLjJDX3dlZWtfbnVtYmVyX2FuZF93ZWVrZGF5XG4gICAgZnVuY3Rpb24gZGF5T2ZZZWFyRnJvbVdlZWtzKHllYXIsIHdlZWssIHdlZWtkYXksIGZpcnN0RGF5T2ZXZWVrT2ZZZWFyLCBmaXJzdERheU9mV2Vlaykge1xuICAgICAgICB2YXIgd2VlazFKYW4gPSA2ICsgZmlyc3REYXlPZldlZWsgLSBmaXJzdERheU9mV2Vla09mWWVhciwgamFuWCA9IGNyZWF0ZVVUQ0RhdGUoeWVhciwgMCwgMSArIHdlZWsxSmFuKSwgZCA9IGphblguZ2V0VVRDRGF5KCksIGRheU9mWWVhcjtcbiAgICAgICAgaWYgKGQgPCBmaXJzdERheU9mV2Vlaykge1xuICAgICAgICAgICAgZCArPSA3O1xuICAgICAgICB9XG5cbiAgICAgICAgd2Vla2RheSA9IHdlZWtkYXkgIT0gbnVsbCA/IDEgKiB3ZWVrZGF5IDogZmlyc3REYXlPZldlZWs7XG5cbiAgICAgICAgZGF5T2ZZZWFyID0gMSArIHdlZWsxSmFuICsgNyAqICh3ZWVrIC0gMSkgLSBkICsgd2Vla2RheTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgeWVhcjogZGF5T2ZZZWFyID4gMCA/IHllYXIgOiB5ZWFyIC0gMSxcbiAgICAgICAgICAgIGRheU9mWWVhcjogZGF5T2ZZZWFyID4gMCA/ICBkYXlPZlllYXIgOiBkYXlzSW5ZZWFyKHllYXIgLSAxKSArIGRheU9mWWVhclxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vIE1PTUVOVFNcblxuICAgIGZ1bmN0aW9uIGdldFNldERheU9mWWVhciAoaW5wdXQpIHtcbiAgICAgICAgdmFyIGRheU9mWWVhciA9IE1hdGgucm91bmQoKHRoaXMuY2xvbmUoKS5zdGFydE9mKCdkYXknKSAtIHRoaXMuY2xvbmUoKS5zdGFydE9mKCd5ZWFyJykpIC8gODY0ZTUpICsgMTtcbiAgICAgICAgcmV0dXJuIGlucHV0ID09IG51bGwgPyBkYXlPZlllYXIgOiB0aGlzLmFkZCgoaW5wdXQgLSBkYXlPZlllYXIpLCAnZCcpO1xuICAgIH1cblxuICAgIC8vIFBpY2sgdGhlIGZpcnN0IGRlZmluZWQgb2YgdHdvIG9yIHRocmVlIGFyZ3VtZW50cy5cbiAgICBmdW5jdGlvbiBkZWZhdWx0cyhhLCBiLCBjKSB7XG4gICAgICAgIGlmIChhICE9IG51bGwpIHtcbiAgICAgICAgICAgIHJldHVybiBhO1xuICAgICAgICB9XG4gICAgICAgIGlmIChiICE9IG51bGwpIHtcbiAgICAgICAgICAgIHJldHVybiBiO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGN1cnJlbnREYXRlQXJyYXkoY29uZmlnKSB7XG4gICAgICAgIHZhciBub3cgPSBuZXcgRGF0ZSgpO1xuICAgICAgICBpZiAoY29uZmlnLl91c2VVVEMpIHtcbiAgICAgICAgICAgIHJldHVybiBbbm93LmdldFVUQ0Z1bGxZZWFyKCksIG5vdy5nZXRVVENNb250aCgpLCBub3cuZ2V0VVRDRGF0ZSgpXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gW25vdy5nZXRGdWxsWWVhcigpLCBub3cuZ2V0TW9udGgoKSwgbm93LmdldERhdGUoKV07XG4gICAgfVxuXG4gICAgLy8gY29udmVydCBhbiBhcnJheSB0byBhIGRhdGUuXG4gICAgLy8gdGhlIGFycmF5IHNob3VsZCBtaXJyb3IgdGhlIHBhcmFtZXRlcnMgYmVsb3dcbiAgICAvLyBub3RlOiBhbGwgdmFsdWVzIHBhc3QgdGhlIHllYXIgYXJlIG9wdGlvbmFsIGFuZCB3aWxsIGRlZmF1bHQgdG8gdGhlIGxvd2VzdCBwb3NzaWJsZSB2YWx1ZS5cbiAgICAvLyBbeWVhciwgbW9udGgsIGRheSAsIGhvdXIsIG1pbnV0ZSwgc2Vjb25kLCBtaWxsaXNlY29uZF1cbiAgICBmdW5jdGlvbiBjb25maWdGcm9tQXJyYXkgKGNvbmZpZykge1xuICAgICAgICB2YXIgaSwgZGF0ZSwgaW5wdXQgPSBbXSwgY3VycmVudERhdGUsIHllYXJUb1VzZTtcblxuICAgICAgICBpZiAoY29uZmlnLl9kKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjdXJyZW50RGF0ZSA9IGN1cnJlbnREYXRlQXJyYXkoY29uZmlnKTtcblxuICAgICAgICAvL2NvbXB1dGUgZGF5IG9mIHRoZSB5ZWFyIGZyb20gd2Vla3MgYW5kIHdlZWtkYXlzXG4gICAgICAgIGlmIChjb25maWcuX3cgJiYgY29uZmlnLl9hW0RBVEVdID09IG51bGwgJiYgY29uZmlnLl9hW01PTlRIXSA9PSBudWxsKSB7XG4gICAgICAgICAgICBkYXlPZlllYXJGcm9tV2Vla0luZm8oY29uZmlnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vaWYgdGhlIGRheSBvZiB0aGUgeWVhciBpcyBzZXQsIGZpZ3VyZSBvdXQgd2hhdCBpdCBpc1xuICAgICAgICBpZiAoY29uZmlnLl9kYXlPZlllYXIpIHtcbiAgICAgICAgICAgIHllYXJUb1VzZSA9IGRlZmF1bHRzKGNvbmZpZy5fYVtZRUFSXSwgY3VycmVudERhdGVbWUVBUl0pO1xuXG4gICAgICAgICAgICBpZiAoY29uZmlnLl9kYXlPZlllYXIgPiBkYXlzSW5ZZWFyKHllYXJUb1VzZSkpIHtcbiAgICAgICAgICAgICAgICBnZXRQYXJzaW5nRmxhZ3MoY29uZmlnKS5fb3ZlcmZsb3dEYXlPZlllYXIgPSB0cnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBkYXRlID0gY3JlYXRlVVRDRGF0ZSh5ZWFyVG9Vc2UsIDAsIGNvbmZpZy5fZGF5T2ZZZWFyKTtcbiAgICAgICAgICAgIGNvbmZpZy5fYVtNT05USF0gPSBkYXRlLmdldFVUQ01vbnRoKCk7XG4gICAgICAgICAgICBjb25maWcuX2FbREFURV0gPSBkYXRlLmdldFVUQ0RhdGUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIERlZmF1bHQgdG8gY3VycmVudCBkYXRlLlxuICAgICAgICAvLyAqIGlmIG5vIHllYXIsIG1vbnRoLCBkYXkgb2YgbW9udGggYXJlIGdpdmVuLCBkZWZhdWx0IHRvIHRvZGF5XG4gICAgICAgIC8vICogaWYgZGF5IG9mIG1vbnRoIGlzIGdpdmVuLCBkZWZhdWx0IG1vbnRoIGFuZCB5ZWFyXG4gICAgICAgIC8vICogaWYgbW9udGggaXMgZ2l2ZW4sIGRlZmF1bHQgb25seSB5ZWFyXG4gICAgICAgIC8vICogaWYgeWVhciBpcyBnaXZlbiwgZG9uJ3QgZGVmYXVsdCBhbnl0aGluZ1xuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgMyAmJiBjb25maWcuX2FbaV0gPT0gbnVsbDsgKytpKSB7XG4gICAgICAgICAgICBjb25maWcuX2FbaV0gPSBpbnB1dFtpXSA9IGN1cnJlbnREYXRlW2ldO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gWmVybyBvdXQgd2hhdGV2ZXIgd2FzIG5vdCBkZWZhdWx0ZWQsIGluY2x1ZGluZyB0aW1lXG4gICAgICAgIGZvciAoOyBpIDwgNzsgaSsrKSB7XG4gICAgICAgICAgICBjb25maWcuX2FbaV0gPSBpbnB1dFtpXSA9IChjb25maWcuX2FbaV0gPT0gbnVsbCkgPyAoaSA9PT0gMiA/IDEgOiAwKSA6IGNvbmZpZy5fYVtpXTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIGZvciAyNDowMDowMC4wMDBcbiAgICAgICAgaWYgKGNvbmZpZy5fYVtIT1VSXSA9PT0gMjQgJiZcbiAgICAgICAgICAgICAgICBjb25maWcuX2FbTUlOVVRFXSA9PT0gMCAmJlxuICAgICAgICAgICAgICAgIGNvbmZpZy5fYVtTRUNPTkRdID09PSAwICYmXG4gICAgICAgICAgICAgICAgY29uZmlnLl9hW01JTExJU0VDT05EXSA9PT0gMCkge1xuICAgICAgICAgICAgY29uZmlnLl9uZXh0RGF5ID0gdHJ1ZTtcbiAgICAgICAgICAgIGNvbmZpZy5fYVtIT1VSXSA9IDA7XG4gICAgICAgIH1cblxuICAgICAgICBjb25maWcuX2QgPSAoY29uZmlnLl91c2VVVEMgPyBjcmVhdGVVVENEYXRlIDogY3JlYXRlRGF0ZSkuYXBwbHkobnVsbCwgaW5wdXQpO1xuICAgICAgICAvLyBBcHBseSB0aW1lem9uZSBvZmZzZXQgZnJvbSBpbnB1dC4gVGhlIGFjdHVhbCB1dGNPZmZzZXQgY2FuIGJlIGNoYW5nZWRcbiAgICAgICAgLy8gd2l0aCBwYXJzZVpvbmUuXG4gICAgICAgIGlmIChjb25maWcuX3R6bSAhPSBudWxsKSB7XG4gICAgICAgICAgICBjb25maWcuX2Quc2V0VVRDTWludXRlcyhjb25maWcuX2QuZ2V0VVRDTWludXRlcygpIC0gY29uZmlnLl90em0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNvbmZpZy5fbmV4dERheSkge1xuICAgICAgICAgICAgY29uZmlnLl9hW0hPVVJdID0gMjQ7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkYXlPZlllYXJGcm9tV2Vla0luZm8oY29uZmlnKSB7XG4gICAgICAgIHZhciB3LCB3ZWVrWWVhciwgd2Vlaywgd2Vla2RheSwgZG93LCBkb3ksIHRlbXA7XG5cbiAgICAgICAgdyA9IGNvbmZpZy5fdztcbiAgICAgICAgaWYgKHcuR0cgIT0gbnVsbCB8fCB3LlcgIT0gbnVsbCB8fCB3LkUgIT0gbnVsbCkge1xuICAgICAgICAgICAgZG93ID0gMTtcbiAgICAgICAgICAgIGRveSA9IDQ7XG5cbiAgICAgICAgICAgIC8vIFRPRE86IFdlIG5lZWQgdG8gdGFrZSB0aGUgY3VycmVudCBpc29XZWVrWWVhciwgYnV0IHRoYXQgZGVwZW5kcyBvblxuICAgICAgICAgICAgLy8gaG93IHdlIGludGVycHJldCBub3cgKGxvY2FsLCB1dGMsIGZpeGVkIG9mZnNldCkuIFNvIGNyZWF0ZVxuICAgICAgICAgICAgLy8gYSBub3cgdmVyc2lvbiBvZiBjdXJyZW50IGNvbmZpZyAodGFrZSBsb2NhbC91dGMvb2Zmc2V0IGZsYWdzLCBhbmRcbiAgICAgICAgICAgIC8vIGNyZWF0ZSBub3cpLlxuICAgICAgICAgICAgd2Vla1llYXIgPSBkZWZhdWx0cyh3LkdHLCBjb25maWcuX2FbWUVBUl0sIHdlZWtPZlllYXIobG9jYWxfX2NyZWF0ZUxvY2FsKCksIDEsIDQpLnllYXIpO1xuICAgICAgICAgICAgd2VlayA9IGRlZmF1bHRzKHcuVywgMSk7XG4gICAgICAgICAgICB3ZWVrZGF5ID0gZGVmYXVsdHMody5FLCAxKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGRvdyA9IGNvbmZpZy5fbG9jYWxlLl93ZWVrLmRvdztcbiAgICAgICAgICAgIGRveSA9IGNvbmZpZy5fbG9jYWxlLl93ZWVrLmRveTtcblxuICAgICAgICAgICAgd2Vla1llYXIgPSBkZWZhdWx0cyh3LmdnLCBjb25maWcuX2FbWUVBUl0sIHdlZWtPZlllYXIobG9jYWxfX2NyZWF0ZUxvY2FsKCksIGRvdywgZG95KS55ZWFyKTtcbiAgICAgICAgICAgIHdlZWsgPSBkZWZhdWx0cyh3LncsIDEpO1xuXG4gICAgICAgICAgICBpZiAody5kICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICAvLyB3ZWVrZGF5IC0tIGxvdyBkYXkgbnVtYmVycyBhcmUgY29uc2lkZXJlZCBuZXh0IHdlZWtcbiAgICAgICAgICAgICAgICB3ZWVrZGF5ID0gdy5kO1xuICAgICAgICAgICAgICAgIGlmICh3ZWVrZGF5IDwgZG93KSB7XG4gICAgICAgICAgICAgICAgICAgICsrd2VlaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHcuZSAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgLy8gbG9jYWwgd2Vla2RheSAtLSBjb3VudGluZyBzdGFydHMgZnJvbSBiZWdpbmluZyBvZiB3ZWVrXG4gICAgICAgICAgICAgICAgd2Vla2RheSA9IHcuZSArIGRvdztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gZGVmYXVsdCB0byBiZWdpbmluZyBvZiB3ZWVrXG4gICAgICAgICAgICAgICAgd2Vla2RheSA9IGRvdztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0ZW1wID0gZGF5T2ZZZWFyRnJvbVdlZWtzKHdlZWtZZWFyLCB3ZWVrLCB3ZWVrZGF5LCBkb3ksIGRvdyk7XG5cbiAgICAgICAgY29uZmlnLl9hW1lFQVJdID0gdGVtcC55ZWFyO1xuICAgICAgICBjb25maWcuX2RheU9mWWVhciA9IHRlbXAuZGF5T2ZZZWFyO1xuICAgIH1cblxuICAgIHV0aWxzX2hvb2tzX19ob29rcy5JU09fODYwMSA9IGZ1bmN0aW9uICgpIHt9O1xuXG4gICAgLy8gZGF0ZSBmcm9tIHN0cmluZyBhbmQgZm9ybWF0IHN0cmluZ1xuICAgIGZ1bmN0aW9uIGNvbmZpZ0Zyb21TdHJpbmdBbmRGb3JtYXQoY29uZmlnKSB7XG4gICAgICAgIC8vIFRPRE86IE1vdmUgdGhpcyB0byBhbm90aGVyIHBhcnQgb2YgdGhlIGNyZWF0aW9uIGZsb3cgdG8gcHJldmVudCBjaXJjdWxhciBkZXBzXG4gICAgICAgIGlmIChjb25maWcuX2YgPT09IHV0aWxzX2hvb2tzX19ob29rcy5JU09fODYwMSkge1xuICAgICAgICAgICAgY29uZmlnRnJvbUlTTyhjb25maWcpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uZmlnLl9hID0gW107XG4gICAgICAgIGdldFBhcnNpbmdGbGFncyhjb25maWcpLmVtcHR5ID0gdHJ1ZTtcblxuICAgICAgICAvLyBUaGlzIGFycmF5IGlzIHVzZWQgdG8gbWFrZSBhIERhdGUsIGVpdGhlciB3aXRoIGBuZXcgRGF0ZWAgb3IgYERhdGUuVVRDYFxuICAgICAgICB2YXIgc3RyaW5nID0gJycgKyBjb25maWcuX2ksXG4gICAgICAgICAgICBpLCBwYXJzZWRJbnB1dCwgdG9rZW5zLCB0b2tlbiwgc2tpcHBlZCxcbiAgICAgICAgICAgIHN0cmluZ0xlbmd0aCA9IHN0cmluZy5sZW5ndGgsXG4gICAgICAgICAgICB0b3RhbFBhcnNlZElucHV0TGVuZ3RoID0gMDtcblxuICAgICAgICB0b2tlbnMgPSBleHBhbmRGb3JtYXQoY29uZmlnLl9mLCBjb25maWcuX2xvY2FsZSkubWF0Y2goZm9ybWF0dGluZ1Rva2VucykgfHwgW107XG5cbiAgICAgICAgZm9yIChpID0gMDsgaSA8IHRva2Vucy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdG9rZW4gPSB0b2tlbnNbaV07XG4gICAgICAgICAgICBwYXJzZWRJbnB1dCA9IChzdHJpbmcubWF0Y2goZ2V0UGFyc2VSZWdleEZvclRva2VuKHRva2VuLCBjb25maWcpKSB8fCBbXSlbMF07XG4gICAgICAgICAgICBpZiAocGFyc2VkSW5wdXQpIHtcbiAgICAgICAgICAgICAgICBza2lwcGVkID0gc3RyaW5nLnN1YnN0cigwLCBzdHJpbmcuaW5kZXhPZihwYXJzZWRJbnB1dCkpO1xuICAgICAgICAgICAgICAgIGlmIChza2lwcGVkLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgZ2V0UGFyc2luZ0ZsYWdzKGNvbmZpZykudW51c2VkSW5wdXQucHVzaChza2lwcGVkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgc3RyaW5nID0gc3RyaW5nLnNsaWNlKHN0cmluZy5pbmRleE9mKHBhcnNlZElucHV0KSArIHBhcnNlZElucHV0Lmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgdG90YWxQYXJzZWRJbnB1dExlbmd0aCArPSBwYXJzZWRJbnB1dC5sZW5ndGg7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBkb24ndCBwYXJzZSBpZiBpdCdzIG5vdCBhIGtub3duIHRva2VuXG4gICAgICAgICAgICBpZiAoZm9ybWF0VG9rZW5GdW5jdGlvbnNbdG9rZW5dKSB7XG4gICAgICAgICAgICAgICAgaWYgKHBhcnNlZElucHV0KSB7XG4gICAgICAgICAgICAgICAgICAgIGdldFBhcnNpbmdGbGFncyhjb25maWcpLmVtcHR5ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBnZXRQYXJzaW5nRmxhZ3MoY29uZmlnKS51bnVzZWRUb2tlbnMucHVzaCh0b2tlbik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGFkZFRpbWVUb0FycmF5RnJvbVRva2VuKHRva2VuLCBwYXJzZWRJbnB1dCwgY29uZmlnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGNvbmZpZy5fc3RyaWN0ICYmICFwYXJzZWRJbnB1dCkge1xuICAgICAgICAgICAgICAgIGdldFBhcnNpbmdGbGFncyhjb25maWcpLnVudXNlZFRva2Vucy5wdXNoKHRva2VuKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGFkZCByZW1haW5pbmcgdW5wYXJzZWQgaW5wdXQgbGVuZ3RoIHRvIHRoZSBzdHJpbmdcbiAgICAgICAgZ2V0UGFyc2luZ0ZsYWdzKGNvbmZpZykuY2hhcnNMZWZ0T3ZlciA9IHN0cmluZ0xlbmd0aCAtIHRvdGFsUGFyc2VkSW5wdXRMZW5ndGg7XG4gICAgICAgIGlmIChzdHJpbmcubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgZ2V0UGFyc2luZ0ZsYWdzKGNvbmZpZykudW51c2VkSW5wdXQucHVzaChzdHJpbmcpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gY2xlYXIgXzEyaCBmbGFnIGlmIGhvdXIgaXMgPD0gMTJcbiAgICAgICAgaWYgKGdldFBhcnNpbmdGbGFncyhjb25maWcpLmJpZ0hvdXIgPT09IHRydWUgJiZcbiAgICAgICAgICAgICAgICBjb25maWcuX2FbSE9VUl0gPD0gMTIgJiZcbiAgICAgICAgICAgICAgICBjb25maWcuX2FbSE9VUl0gPiAwKSB7XG4gICAgICAgICAgICBnZXRQYXJzaW5nRmxhZ3MoY29uZmlnKS5iaWdIb3VyID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgICAgIC8vIGhhbmRsZSBtZXJpZGllbVxuICAgICAgICBjb25maWcuX2FbSE9VUl0gPSBtZXJpZGllbUZpeFdyYXAoY29uZmlnLl9sb2NhbGUsIGNvbmZpZy5fYVtIT1VSXSwgY29uZmlnLl9tZXJpZGllbSk7XG5cbiAgICAgICAgY29uZmlnRnJvbUFycmF5KGNvbmZpZyk7XG4gICAgICAgIGNoZWNrT3ZlcmZsb3coY29uZmlnKTtcbiAgICB9XG5cblxuICAgIGZ1bmN0aW9uIG1lcmlkaWVtRml4V3JhcCAobG9jYWxlLCBob3VyLCBtZXJpZGllbSkge1xuICAgICAgICB2YXIgaXNQbTtcblxuICAgICAgICBpZiAobWVyaWRpZW0gPT0gbnVsbCkge1xuICAgICAgICAgICAgLy8gbm90aGluZyB0byBkb1xuICAgICAgICAgICAgcmV0dXJuIGhvdXI7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGxvY2FsZS5tZXJpZGllbUhvdXIgIT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuIGxvY2FsZS5tZXJpZGllbUhvdXIoaG91ciwgbWVyaWRpZW0pO1xuICAgICAgICB9IGVsc2UgaWYgKGxvY2FsZS5pc1BNICE9IG51bGwpIHtcbiAgICAgICAgICAgIC8vIEZhbGxiYWNrXG4gICAgICAgICAgICBpc1BtID0gbG9jYWxlLmlzUE0obWVyaWRpZW0pO1xuICAgICAgICAgICAgaWYgKGlzUG0gJiYgaG91ciA8IDEyKSB7XG4gICAgICAgICAgICAgICAgaG91ciArPSAxMjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghaXNQbSAmJiBob3VyID09PSAxMikge1xuICAgICAgICAgICAgICAgIGhvdXIgPSAwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGhvdXI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyB0aGlzIGlzIG5vdCBzdXBwb3NlZCB0byBoYXBwZW5cbiAgICAgICAgICAgIHJldHVybiBob3VyO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY29uZmlnRnJvbVN0cmluZ0FuZEFycmF5KGNvbmZpZykge1xuICAgICAgICB2YXIgdGVtcENvbmZpZyxcbiAgICAgICAgICAgIGJlc3RNb21lbnQsXG5cbiAgICAgICAgICAgIHNjb3JlVG9CZWF0LFxuICAgICAgICAgICAgaSxcbiAgICAgICAgICAgIGN1cnJlbnRTY29yZTtcblxuICAgICAgICBpZiAoY29uZmlnLl9mLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgZ2V0UGFyc2luZ0ZsYWdzKGNvbmZpZykuaW52YWxpZEZvcm1hdCA9IHRydWU7XG4gICAgICAgICAgICBjb25maWcuX2QgPSBuZXcgRGF0ZShOYU4pO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGNvbmZpZy5fZi5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgY3VycmVudFNjb3JlID0gMDtcbiAgICAgICAgICAgIHRlbXBDb25maWcgPSBjb3B5Q29uZmlnKHt9LCBjb25maWcpO1xuICAgICAgICAgICAgaWYgKGNvbmZpZy5fdXNlVVRDICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICB0ZW1wQ29uZmlnLl91c2VVVEMgPSBjb25maWcuX3VzZVVUQztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRlbXBDb25maWcuX2YgPSBjb25maWcuX2ZbaV07XG4gICAgICAgICAgICBjb25maWdGcm9tU3RyaW5nQW5kRm9ybWF0KHRlbXBDb25maWcpO1xuXG4gICAgICAgICAgICBpZiAoIXZhbGlkX19pc1ZhbGlkKHRlbXBDb25maWcpKSB7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIGlmIHRoZXJlIGlzIGFueSBpbnB1dCB0aGF0IHdhcyBub3QgcGFyc2VkIGFkZCBhIHBlbmFsdHkgZm9yIHRoYXQgZm9ybWF0XG4gICAgICAgICAgICBjdXJyZW50U2NvcmUgKz0gZ2V0UGFyc2luZ0ZsYWdzKHRlbXBDb25maWcpLmNoYXJzTGVmdE92ZXI7XG5cbiAgICAgICAgICAgIC8vb3IgdG9rZW5zXG4gICAgICAgICAgICBjdXJyZW50U2NvcmUgKz0gZ2V0UGFyc2luZ0ZsYWdzKHRlbXBDb25maWcpLnVudXNlZFRva2Vucy5sZW5ndGggKiAxMDtcblxuICAgICAgICAgICAgZ2V0UGFyc2luZ0ZsYWdzKHRlbXBDb25maWcpLnNjb3JlID0gY3VycmVudFNjb3JlO1xuXG4gICAgICAgICAgICBpZiAoc2NvcmVUb0JlYXQgPT0gbnVsbCB8fCBjdXJyZW50U2NvcmUgPCBzY29yZVRvQmVhdCkge1xuICAgICAgICAgICAgICAgIHNjb3JlVG9CZWF0ID0gY3VycmVudFNjb3JlO1xuICAgICAgICAgICAgICAgIGJlc3RNb21lbnQgPSB0ZW1wQ29uZmlnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZXh0ZW5kKGNvbmZpZywgYmVzdE1vbWVudCB8fCB0ZW1wQ29uZmlnKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjb25maWdGcm9tT2JqZWN0KGNvbmZpZykge1xuICAgICAgICBpZiAoY29uZmlnLl9kKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgaSA9IG5vcm1hbGl6ZU9iamVjdFVuaXRzKGNvbmZpZy5faSk7XG4gICAgICAgIGNvbmZpZy5fYSA9IFtpLnllYXIsIGkubW9udGgsIGkuZGF5IHx8IGkuZGF0ZSwgaS5ob3VyLCBpLm1pbnV0ZSwgaS5zZWNvbmQsIGkubWlsbGlzZWNvbmRdO1xuXG4gICAgICAgIGNvbmZpZ0Zyb21BcnJheShjb25maWcpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNyZWF0ZUZyb21Db25maWcgKGNvbmZpZykge1xuICAgICAgICB2YXIgcmVzID0gbmV3IE1vbWVudChjaGVja092ZXJmbG93KHByZXBhcmVDb25maWcoY29uZmlnKSkpO1xuICAgICAgICBpZiAocmVzLl9uZXh0RGF5KSB7XG4gICAgICAgICAgICAvLyBBZGRpbmcgaXMgc21hcnQgZW5vdWdoIGFyb3VuZCBEU1RcbiAgICAgICAgICAgIHJlcy5hZGQoMSwgJ2QnKTtcbiAgICAgICAgICAgIHJlcy5fbmV4dERheSA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcHJlcGFyZUNvbmZpZyAoY29uZmlnKSB7XG4gICAgICAgIHZhciBpbnB1dCA9IGNvbmZpZy5faSxcbiAgICAgICAgICAgIGZvcm1hdCA9IGNvbmZpZy5fZjtcblxuICAgICAgICBjb25maWcuX2xvY2FsZSA9IGNvbmZpZy5fbG9jYWxlIHx8IGxvY2FsZV9sb2NhbGVzX19nZXRMb2NhbGUoY29uZmlnLl9sKTtcblxuICAgICAgICBpZiAoaW5wdXQgPT09IG51bGwgfHwgKGZvcm1hdCA9PT0gdW5kZWZpbmVkICYmIGlucHV0ID09PSAnJykpIHtcbiAgICAgICAgICAgIHJldHVybiB2YWxpZF9fY3JlYXRlSW52YWxpZCh7bnVsbElucHV0OiB0cnVlfSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZW9mIGlucHV0ID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgY29uZmlnLl9pID0gaW5wdXQgPSBjb25maWcuX2xvY2FsZS5wcmVwYXJzZShpbnB1dCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoaXNNb21lbnQoaW5wdXQpKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IE1vbWVudChjaGVja092ZXJmbG93KGlucHV0KSk7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNBcnJheShmb3JtYXQpKSB7XG4gICAgICAgICAgICBjb25maWdGcm9tU3RyaW5nQW5kQXJyYXkoY29uZmlnKTtcbiAgICAgICAgfSBlbHNlIGlmIChmb3JtYXQpIHtcbiAgICAgICAgICAgIGNvbmZpZ0Zyb21TdHJpbmdBbmRGb3JtYXQoY29uZmlnKTtcbiAgICAgICAgfSBlbHNlIGlmIChpc0RhdGUoaW5wdXQpKSB7XG4gICAgICAgICAgICBjb25maWcuX2QgPSBpbnB1dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbmZpZ0Zyb21JbnB1dChjb25maWcpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGNvbmZpZztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjb25maWdGcm9tSW5wdXQoY29uZmlnKSB7XG4gICAgICAgIHZhciBpbnB1dCA9IGNvbmZpZy5faTtcbiAgICAgICAgaWYgKGlucHV0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGNvbmZpZy5fZCA9IG5ldyBEYXRlKCk7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNEYXRlKGlucHV0KSkge1xuICAgICAgICAgICAgY29uZmlnLl9kID0gbmV3IERhdGUoK2lucHV0KTtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgaW5wdXQgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBjb25maWdGcm9tU3RyaW5nKGNvbmZpZyk7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNBcnJheShpbnB1dCkpIHtcbiAgICAgICAgICAgIGNvbmZpZy5fYSA9IG1hcChpbnB1dC5zbGljZSgwKSwgZnVuY3Rpb24gKG9iaikge1xuICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZUludChvYmosIDEwKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgY29uZmlnRnJvbUFycmF5KGNvbmZpZyk7XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mKGlucHV0KSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgIGNvbmZpZ0Zyb21PYmplY3QoY29uZmlnKTtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YoaW5wdXQpID09PSAnbnVtYmVyJykge1xuICAgICAgICAgICAgLy8gZnJvbSBtaWxsaXNlY29uZHNcbiAgICAgICAgICAgIGNvbmZpZy5fZCA9IG5ldyBEYXRlKGlucHV0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHV0aWxzX2hvb2tzX19ob29rcy5jcmVhdGVGcm9tSW5wdXRGYWxsYmFjayhjb25maWcpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY3JlYXRlTG9jYWxPclVUQyAoaW5wdXQsIGZvcm1hdCwgbG9jYWxlLCBzdHJpY3QsIGlzVVRDKSB7XG4gICAgICAgIHZhciBjID0ge307XG5cbiAgICAgICAgaWYgKHR5cGVvZihsb2NhbGUpID09PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICAgIHN0cmljdCA9IGxvY2FsZTtcbiAgICAgICAgICAgIGxvY2FsZSA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgICAgICAvLyBvYmplY3QgY29uc3RydWN0aW9uIG11c3QgYmUgZG9uZSB0aGlzIHdheS5cbiAgICAgICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL21vbWVudC9tb21lbnQvaXNzdWVzLzE0MjNcbiAgICAgICAgYy5faXNBTW9tZW50T2JqZWN0ID0gdHJ1ZTtcbiAgICAgICAgYy5fdXNlVVRDID0gYy5faXNVVEMgPSBpc1VUQztcbiAgICAgICAgYy5fbCA9IGxvY2FsZTtcbiAgICAgICAgYy5faSA9IGlucHV0O1xuICAgICAgICBjLl9mID0gZm9ybWF0O1xuICAgICAgICBjLl9zdHJpY3QgPSBzdHJpY3Q7XG5cbiAgICAgICAgcmV0dXJuIGNyZWF0ZUZyb21Db25maWcoYyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbG9jYWxfX2NyZWF0ZUxvY2FsIChpbnB1dCwgZm9ybWF0LCBsb2NhbGUsIHN0cmljdCkge1xuICAgICAgICByZXR1cm4gY3JlYXRlTG9jYWxPclVUQyhpbnB1dCwgZm9ybWF0LCBsb2NhbGUsIHN0cmljdCwgZmFsc2UpO1xuICAgIH1cblxuICAgIHZhciBwcm90b3R5cGVNaW4gPSBkZXByZWNhdGUoXG4gICAgICAgICAnbW9tZW50KCkubWluIGlzIGRlcHJlY2F0ZWQsIHVzZSBtb21lbnQubWluIGluc3RlYWQuIGh0dHBzOi8vZ2l0aHViLmNvbS9tb21lbnQvbW9tZW50L2lzc3Vlcy8xNTQ4JyxcbiAgICAgICAgIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICB2YXIgb3RoZXIgPSBsb2NhbF9fY3JlYXRlTG9jYWwuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICAgICAgICAgICByZXR1cm4gb3RoZXIgPCB0aGlzID8gdGhpcyA6IG90aGVyO1xuICAgICAgICAgfVxuICAgICApO1xuXG4gICAgdmFyIHByb3RvdHlwZU1heCA9IGRlcHJlY2F0ZShcbiAgICAgICAgJ21vbWVudCgpLm1heCBpcyBkZXByZWNhdGVkLCB1c2UgbW9tZW50Lm1heCBpbnN0ZWFkLiBodHRwczovL2dpdGh1Yi5jb20vbW9tZW50L21vbWVudC9pc3N1ZXMvMTU0OCcsXG4gICAgICAgIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBvdGhlciA9IGxvY2FsX19jcmVhdGVMb2NhbC5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgcmV0dXJuIG90aGVyID4gdGhpcyA/IHRoaXMgOiBvdGhlcjtcbiAgICAgICAgfVxuICAgICk7XG5cbiAgICAvLyBQaWNrIGEgbW9tZW50IG0gZnJvbSBtb21lbnRzIHNvIHRoYXQgbVtmbl0ob3RoZXIpIGlzIHRydWUgZm9yIGFsbFxuICAgIC8vIG90aGVyLiBUaGlzIHJlbGllcyBvbiB0aGUgZnVuY3Rpb24gZm4gdG8gYmUgdHJhbnNpdGl2ZS5cbiAgICAvL1xuICAgIC8vIG1vbWVudHMgc2hvdWxkIGVpdGhlciBiZSBhbiBhcnJheSBvZiBtb21lbnQgb2JqZWN0cyBvciBhbiBhcnJheSwgd2hvc2VcbiAgICAvLyBmaXJzdCBlbGVtZW50IGlzIGFuIGFycmF5IG9mIG1vbWVudCBvYmplY3RzLlxuICAgIGZ1bmN0aW9uIHBpY2tCeShmbiwgbW9tZW50cykge1xuICAgICAgICB2YXIgcmVzLCBpO1xuICAgICAgICBpZiAobW9tZW50cy5sZW5ndGggPT09IDEgJiYgaXNBcnJheShtb21lbnRzWzBdKSkge1xuICAgICAgICAgICAgbW9tZW50cyA9IG1vbWVudHNbMF07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFtb21lbnRzLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIGxvY2FsX19jcmVhdGVMb2NhbCgpO1xuICAgICAgICB9XG4gICAgICAgIHJlcyA9IG1vbWVudHNbMF07XG4gICAgICAgIGZvciAoaSA9IDE7IGkgPCBtb21lbnRzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICBpZiAoIW1vbWVudHNbaV0uaXNWYWxpZCgpIHx8IG1vbWVudHNbaV1bZm5dKHJlcykpIHtcbiAgICAgICAgICAgICAgICByZXMgPSBtb21lbnRzW2ldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfVxuXG4gICAgLy8gVE9ETzogVXNlIFtdLnNvcnQgaW5zdGVhZD9cbiAgICBmdW5jdGlvbiBtaW4gKCkge1xuICAgICAgICB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAwKTtcblxuICAgICAgICByZXR1cm4gcGlja0J5KCdpc0JlZm9yZScsIGFyZ3MpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG1heCAoKSB7XG4gICAgICAgIHZhciBhcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMsIDApO1xuXG4gICAgICAgIHJldHVybiBwaWNrQnkoJ2lzQWZ0ZXInLCBhcmdzKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBEdXJhdGlvbiAoZHVyYXRpb24pIHtcbiAgICAgICAgdmFyIG5vcm1hbGl6ZWRJbnB1dCA9IG5vcm1hbGl6ZU9iamVjdFVuaXRzKGR1cmF0aW9uKSxcbiAgICAgICAgICAgIHllYXJzID0gbm9ybWFsaXplZElucHV0LnllYXIgfHwgMCxcbiAgICAgICAgICAgIHF1YXJ0ZXJzID0gbm9ybWFsaXplZElucHV0LnF1YXJ0ZXIgfHwgMCxcbiAgICAgICAgICAgIG1vbnRocyA9IG5vcm1hbGl6ZWRJbnB1dC5tb250aCB8fCAwLFxuICAgICAgICAgICAgd2Vla3MgPSBub3JtYWxpemVkSW5wdXQud2VlayB8fCAwLFxuICAgICAgICAgICAgZGF5cyA9IG5vcm1hbGl6ZWRJbnB1dC5kYXkgfHwgMCxcbiAgICAgICAgICAgIGhvdXJzID0gbm9ybWFsaXplZElucHV0LmhvdXIgfHwgMCxcbiAgICAgICAgICAgIG1pbnV0ZXMgPSBub3JtYWxpemVkSW5wdXQubWludXRlIHx8IDAsXG4gICAgICAgICAgICBzZWNvbmRzID0gbm9ybWFsaXplZElucHV0LnNlY29uZCB8fCAwLFxuICAgICAgICAgICAgbWlsbGlzZWNvbmRzID0gbm9ybWFsaXplZElucHV0Lm1pbGxpc2Vjb25kIHx8IDA7XG5cbiAgICAgICAgLy8gcmVwcmVzZW50YXRpb24gZm9yIGRhdGVBZGRSZW1vdmVcbiAgICAgICAgdGhpcy5fbWlsbGlzZWNvbmRzID0gK21pbGxpc2Vjb25kcyArXG4gICAgICAgICAgICBzZWNvbmRzICogMWUzICsgLy8gMTAwMFxuICAgICAgICAgICAgbWludXRlcyAqIDZlNCArIC8vIDEwMDAgKiA2MFxuICAgICAgICAgICAgaG91cnMgKiAzNmU1OyAvLyAxMDAwICogNjAgKiA2MFxuICAgICAgICAvLyBCZWNhdXNlIG9mIGRhdGVBZGRSZW1vdmUgdHJlYXRzIDI0IGhvdXJzIGFzIGRpZmZlcmVudCBmcm9tIGFcbiAgICAgICAgLy8gZGF5IHdoZW4gd29ya2luZyBhcm91bmQgRFNULCB3ZSBuZWVkIHRvIHN0b3JlIHRoZW0gc2VwYXJhdGVseVxuICAgICAgICB0aGlzLl9kYXlzID0gK2RheXMgK1xuICAgICAgICAgICAgd2Vla3MgKiA3O1xuICAgICAgICAvLyBJdCBpcyBpbXBvc3NpYmxlIHRyYW5zbGF0ZSBtb250aHMgaW50byBkYXlzIHdpdGhvdXQga25vd2luZ1xuICAgICAgICAvLyB3aGljaCBtb250aHMgeW91IGFyZSBhcmUgdGFsa2luZyBhYm91dCwgc28gd2UgaGF2ZSB0byBzdG9yZVxuICAgICAgICAvLyBpdCBzZXBhcmF0ZWx5LlxuICAgICAgICB0aGlzLl9tb250aHMgPSArbW9udGhzICtcbiAgICAgICAgICAgIHF1YXJ0ZXJzICogMyArXG4gICAgICAgICAgICB5ZWFycyAqIDEyO1xuXG4gICAgICAgIHRoaXMuX2RhdGEgPSB7fTtcblxuICAgICAgICB0aGlzLl9sb2NhbGUgPSBsb2NhbGVfbG9jYWxlc19fZ2V0TG9jYWxlKCk7XG5cbiAgICAgICAgdGhpcy5fYnViYmxlKCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaXNEdXJhdGlvbiAob2JqKSB7XG4gICAgICAgIHJldHVybiBvYmogaW5zdGFuY2VvZiBEdXJhdGlvbjtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBvZmZzZXQgKHRva2VuLCBzZXBhcmF0b3IpIHtcbiAgICAgICAgYWRkRm9ybWF0VG9rZW4odG9rZW4sIDAsIDAsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBvZmZzZXQgPSB0aGlzLnV0Y09mZnNldCgpO1xuICAgICAgICAgICAgdmFyIHNpZ24gPSAnKyc7XG4gICAgICAgICAgICBpZiAob2Zmc2V0IDwgMCkge1xuICAgICAgICAgICAgICAgIG9mZnNldCA9IC1vZmZzZXQ7XG4gICAgICAgICAgICAgICAgc2lnbiA9ICctJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBzaWduICsgemVyb0ZpbGwofn4ob2Zmc2V0IC8gNjApLCAyKSArIHNlcGFyYXRvciArIHplcm9GaWxsKH5+KG9mZnNldCkgJSA2MCwgMik7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIG9mZnNldCgnWicsICc6Jyk7XG4gICAgb2Zmc2V0KCdaWicsICcnKTtcblxuICAgIC8vIFBBUlNJTkdcblxuICAgIGFkZFJlZ2V4VG9rZW4oJ1onLCAgbWF0Y2hPZmZzZXQpO1xuICAgIGFkZFJlZ2V4VG9rZW4oJ1paJywgbWF0Y2hPZmZzZXQpO1xuICAgIGFkZFBhcnNlVG9rZW4oWydaJywgJ1paJ10sIGZ1bmN0aW9uIChpbnB1dCwgYXJyYXksIGNvbmZpZykge1xuICAgICAgICBjb25maWcuX3VzZVVUQyA9IHRydWU7XG4gICAgICAgIGNvbmZpZy5fdHptID0gb2Zmc2V0RnJvbVN0cmluZyhpbnB1dCk7XG4gICAgfSk7XG5cbiAgICAvLyBIRUxQRVJTXG5cbiAgICAvLyB0aW1lem9uZSBjaHVua2VyXG4gICAgLy8gJysxMDowMCcgPiBbJzEwJywgICcwMCddXG4gICAgLy8gJy0xNTMwJyAgPiBbJy0xNScsICczMCddXG4gICAgdmFyIGNodW5rT2Zmc2V0ID0gLyhbXFwrXFwtXXxcXGRcXGQpL2dpO1xuXG4gICAgZnVuY3Rpb24gb2Zmc2V0RnJvbVN0cmluZyhzdHJpbmcpIHtcbiAgICAgICAgdmFyIG1hdGNoZXMgPSAoKHN0cmluZyB8fCAnJykubWF0Y2gobWF0Y2hPZmZzZXQpIHx8IFtdKTtcbiAgICAgICAgdmFyIGNodW5rICAgPSBtYXRjaGVzW21hdGNoZXMubGVuZ3RoIC0gMV0gfHwgW107XG4gICAgICAgIHZhciBwYXJ0cyAgID0gKGNodW5rICsgJycpLm1hdGNoKGNodW5rT2Zmc2V0KSB8fCBbJy0nLCAwLCAwXTtcbiAgICAgICAgdmFyIG1pbnV0ZXMgPSArKHBhcnRzWzFdICogNjApICsgdG9JbnQocGFydHNbMl0pO1xuXG4gICAgICAgIHJldHVybiBwYXJ0c1swXSA9PT0gJysnID8gbWludXRlcyA6IC1taW51dGVzO1xuICAgIH1cblxuICAgIC8vIFJldHVybiBhIG1vbWVudCBmcm9tIGlucHV0LCB0aGF0IGlzIGxvY2FsL3V0Yy96b25lIGVxdWl2YWxlbnQgdG8gbW9kZWwuXG4gICAgZnVuY3Rpb24gY2xvbmVXaXRoT2Zmc2V0KGlucHV0LCBtb2RlbCkge1xuICAgICAgICB2YXIgcmVzLCBkaWZmO1xuICAgICAgICBpZiAobW9kZWwuX2lzVVRDKSB7XG4gICAgICAgICAgICByZXMgPSBtb2RlbC5jbG9uZSgpO1xuICAgICAgICAgICAgZGlmZiA9IChpc01vbWVudChpbnB1dCkgfHwgaXNEYXRlKGlucHV0KSA/ICtpbnB1dCA6ICtsb2NhbF9fY3JlYXRlTG9jYWwoaW5wdXQpKSAtICgrcmVzKTtcbiAgICAgICAgICAgIC8vIFVzZSBsb3ctbGV2ZWwgYXBpLCBiZWNhdXNlIHRoaXMgZm4gaXMgbG93LWxldmVsIGFwaS5cbiAgICAgICAgICAgIHJlcy5fZC5zZXRUaW1lKCtyZXMuX2QgKyBkaWZmKTtcbiAgICAgICAgICAgIHV0aWxzX2hvb2tzX19ob29rcy51cGRhdGVPZmZzZXQocmVzLCBmYWxzZSk7XG4gICAgICAgICAgICByZXR1cm4gcmVzO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGxvY2FsX19jcmVhdGVMb2NhbChpbnB1dCkubG9jYWwoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldERhdGVPZmZzZXQgKG0pIHtcbiAgICAgICAgLy8gT24gRmlyZWZveC4yNCBEYXRlI2dldFRpbWV6b25lT2Zmc2V0IHJldHVybnMgYSBmbG9hdGluZyBwb2ludC5cbiAgICAgICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL21vbWVudC9tb21lbnQvcHVsbC8xODcxXG4gICAgICAgIHJldHVybiAtTWF0aC5yb3VuZChtLl9kLmdldFRpbWV6b25lT2Zmc2V0KCkgLyAxNSkgKiAxNTtcbiAgICB9XG5cbiAgICAvLyBIT09LU1xuXG4gICAgLy8gVGhpcyBmdW5jdGlvbiB3aWxsIGJlIGNhbGxlZCB3aGVuZXZlciBhIG1vbWVudCBpcyBtdXRhdGVkLlxuICAgIC8vIEl0IGlzIGludGVuZGVkIHRvIGtlZXAgdGhlIG9mZnNldCBpbiBzeW5jIHdpdGggdGhlIHRpbWV6b25lLlxuICAgIHV0aWxzX2hvb2tzX19ob29rcy51cGRhdGVPZmZzZXQgPSBmdW5jdGlvbiAoKSB7fTtcblxuICAgIC8vIE1PTUVOVFNcblxuICAgIC8vIGtlZXBMb2NhbFRpbWUgPSB0cnVlIG1lYW5zIG9ubHkgY2hhbmdlIHRoZSB0aW1lem9uZSwgd2l0aG91dFxuICAgIC8vIGFmZmVjdGluZyB0aGUgbG9jYWwgaG91ci4gU28gNTozMToyNiArMDMwMCAtLVt1dGNPZmZzZXQoMiwgdHJ1ZSldLS0+XG4gICAgLy8gNTozMToyNiArMDIwMCBJdCBpcyBwb3NzaWJsZSB0aGF0IDU6MzE6MjYgZG9lc24ndCBleGlzdCB3aXRoIG9mZnNldFxuICAgIC8vICswMjAwLCBzbyB3ZSBhZGp1c3QgdGhlIHRpbWUgYXMgbmVlZGVkLCB0byBiZSB2YWxpZC5cbiAgICAvL1xuICAgIC8vIEtlZXBpbmcgdGhlIHRpbWUgYWN0dWFsbHkgYWRkcy9zdWJ0cmFjdHMgKG9uZSBob3VyKVxuICAgIC8vIGZyb20gdGhlIGFjdHVhbCByZXByZXNlbnRlZCB0aW1lLiBUaGF0IGlzIHdoeSB3ZSBjYWxsIHVwZGF0ZU9mZnNldFxuICAgIC8vIGEgc2Vjb25kIHRpbWUuIEluIGNhc2UgaXQgd2FudHMgdXMgdG8gY2hhbmdlIHRoZSBvZmZzZXQgYWdhaW5cbiAgICAvLyBfY2hhbmdlSW5Qcm9ncmVzcyA9PSB0cnVlIGNhc2UsIHRoZW4gd2UgaGF2ZSB0byBhZGp1c3QsIGJlY2F1c2VcbiAgICAvLyB0aGVyZSBpcyBubyBzdWNoIHRpbWUgaW4gdGhlIGdpdmVuIHRpbWV6b25lLlxuICAgIGZ1bmN0aW9uIGdldFNldE9mZnNldCAoaW5wdXQsIGtlZXBMb2NhbFRpbWUpIHtcbiAgICAgICAgdmFyIG9mZnNldCA9IHRoaXMuX29mZnNldCB8fCAwLFxuICAgICAgICAgICAgbG9jYWxBZGp1c3Q7XG4gICAgICAgIGlmIChpbnB1dCAhPSBudWxsKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGlucHV0ID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgIGlucHV0ID0gb2Zmc2V0RnJvbVN0cmluZyhpbnB1dCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoTWF0aC5hYnMoaW5wdXQpIDwgMTYpIHtcbiAgICAgICAgICAgICAgICBpbnB1dCA9IGlucHV0ICogNjA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIXRoaXMuX2lzVVRDICYmIGtlZXBMb2NhbFRpbWUpIHtcbiAgICAgICAgICAgICAgICBsb2NhbEFkanVzdCA9IGdldERhdGVPZmZzZXQodGhpcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLl9vZmZzZXQgPSBpbnB1dDtcbiAgICAgICAgICAgIHRoaXMuX2lzVVRDID0gdHJ1ZTtcbiAgICAgICAgICAgIGlmIChsb2NhbEFkanVzdCAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5hZGQobG9jYWxBZGp1c3QsICdtJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAob2Zmc2V0ICE9PSBpbnB1dCkge1xuICAgICAgICAgICAgICAgIGlmICgha2VlcExvY2FsVGltZSB8fCB0aGlzLl9jaGFuZ2VJblByb2dyZXNzKSB7XG4gICAgICAgICAgICAgICAgICAgIGFkZF9zdWJ0cmFjdF9fYWRkU3VidHJhY3QodGhpcywgY3JlYXRlX19jcmVhdGVEdXJhdGlvbihpbnB1dCAtIG9mZnNldCwgJ20nKSwgMSwgZmFsc2UpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoIXRoaXMuX2NoYW5nZUluUHJvZ3Jlc3MpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fY2hhbmdlSW5Qcm9ncmVzcyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIHV0aWxzX2hvb2tzX19ob29rcy51cGRhdGVPZmZzZXQodGhpcywgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2NoYW5nZUluUHJvZ3Jlc3MgPSBudWxsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2lzVVRDID8gb2Zmc2V0IDogZ2V0RGF0ZU9mZnNldCh0aGlzKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldFNldFpvbmUgKGlucHV0LCBrZWVwTG9jYWxUaW1lKSB7XG4gICAgICAgIGlmIChpbnB1dCAhPSBudWxsKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGlucHV0ICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgIGlucHV0ID0gLWlucHV0O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLnV0Y09mZnNldChpbnB1dCwga2VlcExvY2FsVGltZSk7XG5cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIC10aGlzLnV0Y09mZnNldCgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2V0T2Zmc2V0VG9VVEMgKGtlZXBMb2NhbFRpbWUpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudXRjT2Zmc2V0KDAsIGtlZXBMb2NhbFRpbWUpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNldE9mZnNldFRvTG9jYWwgKGtlZXBMb2NhbFRpbWUpIHtcbiAgICAgICAgaWYgKHRoaXMuX2lzVVRDKSB7XG4gICAgICAgICAgICB0aGlzLnV0Y09mZnNldCgwLCBrZWVwTG9jYWxUaW1lKTtcbiAgICAgICAgICAgIHRoaXMuX2lzVVRDID0gZmFsc2U7XG5cbiAgICAgICAgICAgIGlmIChrZWVwTG9jYWxUaW1lKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zdWJ0cmFjdChnZXREYXRlT2Zmc2V0KHRoaXMpLCAnbScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNldE9mZnNldFRvUGFyc2VkT2Zmc2V0ICgpIHtcbiAgICAgICAgaWYgKHRoaXMuX3R6bSkge1xuICAgICAgICAgICAgdGhpcy51dGNPZmZzZXQodGhpcy5fdHptKTtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgdGhpcy5faSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIHRoaXMudXRjT2Zmc2V0KG9mZnNldEZyb21TdHJpbmcodGhpcy5faSkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGhhc0FsaWduZWRIb3VyT2Zmc2V0IChpbnB1dCkge1xuICAgICAgICBpbnB1dCA9IGlucHV0ID8gbG9jYWxfX2NyZWF0ZUxvY2FsKGlucHV0KS51dGNPZmZzZXQoKSA6IDA7XG5cbiAgICAgICAgcmV0dXJuICh0aGlzLnV0Y09mZnNldCgpIC0gaW5wdXQpICUgNjAgPT09IDA7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaXNEYXlsaWdodFNhdmluZ1RpbWUgKCkge1xuICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgdGhpcy51dGNPZmZzZXQoKSA+IHRoaXMuY2xvbmUoKS5tb250aCgwKS51dGNPZmZzZXQoKSB8fFxuICAgICAgICAgICAgdGhpcy51dGNPZmZzZXQoKSA+IHRoaXMuY2xvbmUoKS5tb250aCg1KS51dGNPZmZzZXQoKVxuICAgICAgICApO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzRGF5bGlnaHRTYXZpbmdUaW1lU2hpZnRlZCAoKSB7XG4gICAgICAgIGlmICh0eXBlb2YgdGhpcy5faXNEU1RTaGlmdGVkICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2lzRFNUU2hpZnRlZDtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBjID0ge307XG5cbiAgICAgICAgY29weUNvbmZpZyhjLCB0aGlzKTtcbiAgICAgICAgYyA9IHByZXBhcmVDb25maWcoYyk7XG5cbiAgICAgICAgaWYgKGMuX2EpIHtcbiAgICAgICAgICAgIHZhciBvdGhlciA9IGMuX2lzVVRDID8gY3JlYXRlX3V0Y19fY3JlYXRlVVRDKGMuX2EpIDogbG9jYWxfX2NyZWF0ZUxvY2FsKGMuX2EpO1xuICAgICAgICAgICAgdGhpcy5faXNEU1RTaGlmdGVkID0gdGhpcy5pc1ZhbGlkKCkgJiZcbiAgICAgICAgICAgICAgICBjb21wYXJlQXJyYXlzKGMuX2EsIG90aGVyLnRvQXJyYXkoKSkgPiAwO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5faXNEU1RTaGlmdGVkID0gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcy5faXNEU1RTaGlmdGVkO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzTG9jYWwgKCkge1xuICAgICAgICByZXR1cm4gIXRoaXMuX2lzVVRDO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzVXRjT2Zmc2V0ICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2lzVVRDO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzVXRjICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2lzVVRDICYmIHRoaXMuX29mZnNldCA9PT0gMDtcbiAgICB9XG5cbiAgICB2YXIgYXNwTmV0UmVnZXggPSAvKFxcLSk/KD86KFxcZCopXFwuKT8oXFxkKylcXDooXFxkKykoPzpcXDooXFxkKylcXC4/KFxcZHszfSk/KT8vO1xuXG4gICAgLy8gZnJvbSBodHRwOi8vZG9jcy5jbG9zdXJlLWxpYnJhcnkuZ29vZ2xlY29kZS5jb20vZ2l0L2Nsb3N1cmVfZ29vZ19kYXRlX2RhdGUuanMuc291cmNlLmh0bWxcbiAgICAvLyBzb21ld2hhdCBtb3JlIGluIGxpbmUgd2l0aCA0LjQuMy4yIDIwMDQgc3BlYywgYnV0IGFsbG93cyBkZWNpbWFsIGFueXdoZXJlXG4gICAgdmFyIGNyZWF0ZV9faXNvUmVnZXggPSAvXigtKT9QKD86KD86KFswLTksLl0qKVkpPyg/OihbMC05LC5dKilNKT8oPzooWzAtOSwuXSopRCk/KD86VCg/OihbMC05LC5dKilIKT8oPzooWzAtOSwuXSopTSk/KD86KFswLTksLl0qKVMpPyk/fChbMC05LC5dKilXKSQvO1xuXG4gICAgZnVuY3Rpb24gY3JlYXRlX19jcmVhdGVEdXJhdGlvbiAoaW5wdXQsIGtleSkge1xuICAgICAgICB2YXIgZHVyYXRpb24gPSBpbnB1dCxcbiAgICAgICAgICAgIC8vIG1hdGNoaW5nIGFnYWluc3QgcmVnZXhwIGlzIGV4cGVuc2l2ZSwgZG8gaXQgb24gZGVtYW5kXG4gICAgICAgICAgICBtYXRjaCA9IG51bGwsXG4gICAgICAgICAgICBzaWduLFxuICAgICAgICAgICAgcmV0LFxuICAgICAgICAgICAgZGlmZlJlcztcblxuICAgICAgICBpZiAoaXNEdXJhdGlvbihpbnB1dCkpIHtcbiAgICAgICAgICAgIGR1cmF0aW9uID0ge1xuICAgICAgICAgICAgICAgIG1zIDogaW5wdXQuX21pbGxpc2Vjb25kcyxcbiAgICAgICAgICAgICAgICBkICA6IGlucHV0Ll9kYXlzLFxuICAgICAgICAgICAgICAgIE0gIDogaW5wdXQuX21vbnRoc1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgaW5wdXQgPT09ICdudW1iZXInKSB7XG4gICAgICAgICAgICBkdXJhdGlvbiA9IHt9O1xuICAgICAgICAgICAgaWYgKGtleSkge1xuICAgICAgICAgICAgICAgIGR1cmF0aW9uW2tleV0gPSBpbnB1dDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZHVyYXRpb24ubWlsbGlzZWNvbmRzID0gaW5wdXQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoISEobWF0Y2ggPSBhc3BOZXRSZWdleC5leGVjKGlucHV0KSkpIHtcbiAgICAgICAgICAgIHNpZ24gPSAobWF0Y2hbMV0gPT09ICctJykgPyAtMSA6IDE7XG4gICAgICAgICAgICBkdXJhdGlvbiA9IHtcbiAgICAgICAgICAgICAgICB5ICA6IDAsXG4gICAgICAgICAgICAgICAgZCAgOiB0b0ludChtYXRjaFtEQVRFXSkgICAgICAgICogc2lnbixcbiAgICAgICAgICAgICAgICBoICA6IHRvSW50KG1hdGNoW0hPVVJdKSAgICAgICAgKiBzaWduLFxuICAgICAgICAgICAgICAgIG0gIDogdG9JbnQobWF0Y2hbTUlOVVRFXSkgICAgICAqIHNpZ24sXG4gICAgICAgICAgICAgICAgcyAgOiB0b0ludChtYXRjaFtTRUNPTkRdKSAgICAgICogc2lnbixcbiAgICAgICAgICAgICAgICBtcyA6IHRvSW50KG1hdGNoW01JTExJU0VDT05EXSkgKiBzaWduXG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2UgaWYgKCEhKG1hdGNoID0gY3JlYXRlX19pc29SZWdleC5leGVjKGlucHV0KSkpIHtcbiAgICAgICAgICAgIHNpZ24gPSAobWF0Y2hbMV0gPT09ICctJykgPyAtMSA6IDE7XG4gICAgICAgICAgICBkdXJhdGlvbiA9IHtcbiAgICAgICAgICAgICAgICB5IDogcGFyc2VJc28obWF0Y2hbMl0sIHNpZ24pLFxuICAgICAgICAgICAgICAgIE0gOiBwYXJzZUlzbyhtYXRjaFszXSwgc2lnbiksXG4gICAgICAgICAgICAgICAgZCA6IHBhcnNlSXNvKG1hdGNoWzRdLCBzaWduKSxcbiAgICAgICAgICAgICAgICBoIDogcGFyc2VJc28obWF0Y2hbNV0sIHNpZ24pLFxuICAgICAgICAgICAgICAgIG0gOiBwYXJzZUlzbyhtYXRjaFs2XSwgc2lnbiksXG4gICAgICAgICAgICAgICAgcyA6IHBhcnNlSXNvKG1hdGNoWzddLCBzaWduKSxcbiAgICAgICAgICAgICAgICB3IDogcGFyc2VJc28obWF0Y2hbOF0sIHNpZ24pXG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2UgaWYgKGR1cmF0aW9uID09IG51bGwpIHsvLyBjaGVja3MgZm9yIG51bGwgb3IgdW5kZWZpbmVkXG4gICAgICAgICAgICBkdXJhdGlvbiA9IHt9O1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBkdXJhdGlvbiA9PT0gJ29iamVjdCcgJiYgKCdmcm9tJyBpbiBkdXJhdGlvbiB8fCAndG8nIGluIGR1cmF0aW9uKSkge1xuICAgICAgICAgICAgZGlmZlJlcyA9IG1vbWVudHNEaWZmZXJlbmNlKGxvY2FsX19jcmVhdGVMb2NhbChkdXJhdGlvbi5mcm9tKSwgbG9jYWxfX2NyZWF0ZUxvY2FsKGR1cmF0aW9uLnRvKSk7XG5cbiAgICAgICAgICAgIGR1cmF0aW9uID0ge307XG4gICAgICAgICAgICBkdXJhdGlvbi5tcyA9IGRpZmZSZXMubWlsbGlzZWNvbmRzO1xuICAgICAgICAgICAgZHVyYXRpb24uTSA9IGRpZmZSZXMubW9udGhzO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0ID0gbmV3IER1cmF0aW9uKGR1cmF0aW9uKTtcblxuICAgICAgICBpZiAoaXNEdXJhdGlvbihpbnB1dCkgJiYgaGFzT3duUHJvcChpbnB1dCwgJ19sb2NhbGUnKSkge1xuICAgICAgICAgICAgcmV0Ll9sb2NhbGUgPSBpbnB1dC5fbG9jYWxlO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9XG5cbiAgICBjcmVhdGVfX2NyZWF0ZUR1cmF0aW9uLmZuID0gRHVyYXRpb24ucHJvdG90eXBlO1xuXG4gICAgZnVuY3Rpb24gcGFyc2VJc28gKGlucCwgc2lnbikge1xuICAgICAgICAvLyBXZSdkIG5vcm1hbGx5IHVzZSB+fmlucCBmb3IgdGhpcywgYnV0IHVuZm9ydHVuYXRlbHkgaXQgYWxzb1xuICAgICAgICAvLyBjb252ZXJ0cyBmbG9hdHMgdG8gaW50cy5cbiAgICAgICAgLy8gaW5wIG1heSBiZSB1bmRlZmluZWQsIHNvIGNhcmVmdWwgY2FsbGluZyByZXBsYWNlIG9uIGl0LlxuICAgICAgICB2YXIgcmVzID0gaW5wICYmIHBhcnNlRmxvYXQoaW5wLnJlcGxhY2UoJywnLCAnLicpKTtcbiAgICAgICAgLy8gYXBwbHkgc2lnbiB3aGlsZSB3ZSdyZSBhdCBpdFxuICAgICAgICByZXR1cm4gKGlzTmFOKHJlcykgPyAwIDogcmVzKSAqIHNpZ247XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcG9zaXRpdmVNb21lbnRzRGlmZmVyZW5jZShiYXNlLCBvdGhlcikge1xuICAgICAgICB2YXIgcmVzID0ge21pbGxpc2Vjb25kczogMCwgbW9udGhzOiAwfTtcblxuICAgICAgICByZXMubW9udGhzID0gb3RoZXIubW9udGgoKSAtIGJhc2UubW9udGgoKSArXG4gICAgICAgICAgICAob3RoZXIueWVhcigpIC0gYmFzZS55ZWFyKCkpICogMTI7XG4gICAgICAgIGlmIChiYXNlLmNsb25lKCkuYWRkKHJlcy5tb250aHMsICdNJykuaXNBZnRlcihvdGhlcikpIHtcbiAgICAgICAgICAgIC0tcmVzLm1vbnRocztcbiAgICAgICAgfVxuXG4gICAgICAgIHJlcy5taWxsaXNlY29uZHMgPSArb3RoZXIgLSArKGJhc2UuY2xvbmUoKS5hZGQocmVzLm1vbnRocywgJ00nKSk7XG5cbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBtb21lbnRzRGlmZmVyZW5jZShiYXNlLCBvdGhlcikge1xuICAgICAgICB2YXIgcmVzO1xuICAgICAgICBvdGhlciA9IGNsb25lV2l0aE9mZnNldChvdGhlciwgYmFzZSk7XG4gICAgICAgIGlmIChiYXNlLmlzQmVmb3JlKG90aGVyKSkge1xuICAgICAgICAgICAgcmVzID0gcG9zaXRpdmVNb21lbnRzRGlmZmVyZW5jZShiYXNlLCBvdGhlcik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXMgPSBwb3NpdGl2ZU1vbWVudHNEaWZmZXJlbmNlKG90aGVyLCBiYXNlKTtcbiAgICAgICAgICAgIHJlcy5taWxsaXNlY29uZHMgPSAtcmVzLm1pbGxpc2Vjb25kcztcbiAgICAgICAgICAgIHJlcy5tb250aHMgPSAtcmVzLm1vbnRocztcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY3JlYXRlQWRkZXIoZGlyZWN0aW9uLCBuYW1lKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAodmFsLCBwZXJpb2QpIHtcbiAgICAgICAgICAgIHZhciBkdXIsIHRtcDtcbiAgICAgICAgICAgIC8vaW52ZXJ0IHRoZSBhcmd1bWVudHMsIGJ1dCBjb21wbGFpbiBhYm91dCBpdFxuICAgICAgICAgICAgaWYgKHBlcmlvZCAhPT0gbnVsbCAmJiAhaXNOYU4oK3BlcmlvZCkpIHtcbiAgICAgICAgICAgICAgICBkZXByZWNhdGVTaW1wbGUobmFtZSwgJ21vbWVudCgpLicgKyBuYW1lICArICcocGVyaW9kLCBudW1iZXIpIGlzIGRlcHJlY2F0ZWQuIFBsZWFzZSB1c2UgbW9tZW50KCkuJyArIG5hbWUgKyAnKG51bWJlciwgcGVyaW9kKS4nKTtcbiAgICAgICAgICAgICAgICB0bXAgPSB2YWw7IHZhbCA9IHBlcmlvZDsgcGVyaW9kID0gdG1wO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YWwgPSB0eXBlb2YgdmFsID09PSAnc3RyaW5nJyA/ICt2YWwgOiB2YWw7XG4gICAgICAgICAgICBkdXIgPSBjcmVhdGVfX2NyZWF0ZUR1cmF0aW9uKHZhbCwgcGVyaW9kKTtcbiAgICAgICAgICAgIGFkZF9zdWJ0cmFjdF9fYWRkU3VidHJhY3QodGhpcywgZHVyLCBkaXJlY3Rpb24pO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYWRkX3N1YnRyYWN0X19hZGRTdWJ0cmFjdCAobW9tLCBkdXJhdGlvbiwgaXNBZGRpbmcsIHVwZGF0ZU9mZnNldCkge1xuICAgICAgICB2YXIgbWlsbGlzZWNvbmRzID0gZHVyYXRpb24uX21pbGxpc2Vjb25kcyxcbiAgICAgICAgICAgIGRheXMgPSBkdXJhdGlvbi5fZGF5cyxcbiAgICAgICAgICAgIG1vbnRocyA9IGR1cmF0aW9uLl9tb250aHM7XG4gICAgICAgIHVwZGF0ZU9mZnNldCA9IHVwZGF0ZU9mZnNldCA9PSBudWxsID8gdHJ1ZSA6IHVwZGF0ZU9mZnNldDtcblxuICAgICAgICBpZiAobWlsbGlzZWNvbmRzKSB7XG4gICAgICAgICAgICBtb20uX2Quc2V0VGltZSgrbW9tLl9kICsgbWlsbGlzZWNvbmRzICogaXNBZGRpbmcpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkYXlzKSB7XG4gICAgICAgICAgICBnZXRfc2V0X19zZXQobW9tLCAnRGF0ZScsIGdldF9zZXRfX2dldChtb20sICdEYXRlJykgKyBkYXlzICogaXNBZGRpbmcpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChtb250aHMpIHtcbiAgICAgICAgICAgIHNldE1vbnRoKG1vbSwgZ2V0X3NldF9fZ2V0KG1vbSwgJ01vbnRoJykgKyBtb250aHMgKiBpc0FkZGluZyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHVwZGF0ZU9mZnNldCkge1xuICAgICAgICAgICAgdXRpbHNfaG9va3NfX2hvb2tzLnVwZGF0ZU9mZnNldChtb20sIGRheXMgfHwgbW9udGhzKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHZhciBhZGRfc3VidHJhY3RfX2FkZCAgICAgID0gY3JlYXRlQWRkZXIoMSwgJ2FkZCcpO1xuICAgIHZhciBhZGRfc3VidHJhY3RfX3N1YnRyYWN0ID0gY3JlYXRlQWRkZXIoLTEsICdzdWJ0cmFjdCcpO1xuXG4gICAgZnVuY3Rpb24gbW9tZW50X2NhbGVuZGFyX19jYWxlbmRhciAodGltZSwgZm9ybWF0cykge1xuICAgICAgICAvLyBXZSB3YW50IHRvIGNvbXBhcmUgdGhlIHN0YXJ0IG9mIHRvZGF5LCB2cyB0aGlzLlxuICAgICAgICAvLyBHZXR0aW5nIHN0YXJ0LW9mLXRvZGF5IGRlcGVuZHMgb24gd2hldGhlciB3ZSdyZSBsb2NhbC91dGMvb2Zmc2V0IG9yIG5vdC5cbiAgICAgICAgdmFyIG5vdyA9IHRpbWUgfHwgbG9jYWxfX2NyZWF0ZUxvY2FsKCksXG4gICAgICAgICAgICBzb2QgPSBjbG9uZVdpdGhPZmZzZXQobm93LCB0aGlzKS5zdGFydE9mKCdkYXknKSxcbiAgICAgICAgICAgIGRpZmYgPSB0aGlzLmRpZmYoc29kLCAnZGF5cycsIHRydWUpLFxuICAgICAgICAgICAgZm9ybWF0ID0gZGlmZiA8IC02ID8gJ3NhbWVFbHNlJyA6XG4gICAgICAgICAgICAgICAgZGlmZiA8IC0xID8gJ2xhc3RXZWVrJyA6XG4gICAgICAgICAgICAgICAgZGlmZiA8IDAgPyAnbGFzdERheScgOlxuICAgICAgICAgICAgICAgIGRpZmYgPCAxID8gJ3NhbWVEYXknIDpcbiAgICAgICAgICAgICAgICBkaWZmIDwgMiA/ICduZXh0RGF5JyA6XG4gICAgICAgICAgICAgICAgZGlmZiA8IDcgPyAnbmV4dFdlZWsnIDogJ3NhbWVFbHNlJztcbiAgICAgICAgcmV0dXJuIHRoaXMuZm9ybWF0KGZvcm1hdHMgJiYgZm9ybWF0c1tmb3JtYXRdIHx8IHRoaXMubG9jYWxlRGF0YSgpLmNhbGVuZGFyKGZvcm1hdCwgdGhpcywgbG9jYWxfX2NyZWF0ZUxvY2FsKG5vdykpKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjbG9uZSAoKSB7XG4gICAgICAgIHJldHVybiBuZXcgTW9tZW50KHRoaXMpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzQWZ0ZXIgKGlucHV0LCB1bml0cykge1xuICAgICAgICB2YXIgaW5wdXRNcztcbiAgICAgICAgdW5pdHMgPSBub3JtYWxpemVVbml0cyh0eXBlb2YgdW5pdHMgIT09ICd1bmRlZmluZWQnID8gdW5pdHMgOiAnbWlsbGlzZWNvbmQnKTtcbiAgICAgICAgaWYgKHVuaXRzID09PSAnbWlsbGlzZWNvbmQnKSB7XG4gICAgICAgICAgICBpbnB1dCA9IGlzTW9tZW50KGlucHV0KSA/IGlucHV0IDogbG9jYWxfX2NyZWF0ZUxvY2FsKGlucHV0KTtcbiAgICAgICAgICAgIHJldHVybiArdGhpcyA+ICtpbnB1dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlucHV0TXMgPSBpc01vbWVudChpbnB1dCkgPyAraW5wdXQgOiArbG9jYWxfX2NyZWF0ZUxvY2FsKGlucHV0KTtcbiAgICAgICAgICAgIHJldHVybiBpbnB1dE1zIDwgK3RoaXMuY2xvbmUoKS5zdGFydE9mKHVuaXRzKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzQmVmb3JlIChpbnB1dCwgdW5pdHMpIHtcbiAgICAgICAgdmFyIGlucHV0TXM7XG4gICAgICAgIHVuaXRzID0gbm9ybWFsaXplVW5pdHModHlwZW9mIHVuaXRzICE9PSAndW5kZWZpbmVkJyA/IHVuaXRzIDogJ21pbGxpc2Vjb25kJyk7XG4gICAgICAgIGlmICh1bml0cyA9PT0gJ21pbGxpc2Vjb25kJykge1xuICAgICAgICAgICAgaW5wdXQgPSBpc01vbWVudChpbnB1dCkgPyBpbnB1dCA6IGxvY2FsX19jcmVhdGVMb2NhbChpbnB1dCk7XG4gICAgICAgICAgICByZXR1cm4gK3RoaXMgPCAraW5wdXQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpbnB1dE1zID0gaXNNb21lbnQoaW5wdXQpID8gK2lucHV0IDogK2xvY2FsX19jcmVhdGVMb2NhbChpbnB1dCk7XG4gICAgICAgICAgICByZXR1cm4gK3RoaXMuY2xvbmUoKS5lbmRPZih1bml0cykgPCBpbnB1dE1zO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaXNCZXR3ZWVuIChmcm9tLCB0bywgdW5pdHMpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNBZnRlcihmcm9tLCB1bml0cykgJiYgdGhpcy5pc0JlZm9yZSh0bywgdW5pdHMpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzU2FtZSAoaW5wdXQsIHVuaXRzKSB7XG4gICAgICAgIHZhciBpbnB1dE1zO1xuICAgICAgICB1bml0cyA9IG5vcm1hbGl6ZVVuaXRzKHVuaXRzIHx8ICdtaWxsaXNlY29uZCcpO1xuICAgICAgICBpZiAodW5pdHMgPT09ICdtaWxsaXNlY29uZCcpIHtcbiAgICAgICAgICAgIGlucHV0ID0gaXNNb21lbnQoaW5wdXQpID8gaW5wdXQgOiBsb2NhbF9fY3JlYXRlTG9jYWwoaW5wdXQpO1xuICAgICAgICAgICAgcmV0dXJuICt0aGlzID09PSAraW5wdXQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpbnB1dE1zID0gK2xvY2FsX19jcmVhdGVMb2NhbChpbnB1dCk7XG4gICAgICAgICAgICByZXR1cm4gKyh0aGlzLmNsb25lKCkuc3RhcnRPZih1bml0cykpIDw9IGlucHV0TXMgJiYgaW5wdXRNcyA8PSArKHRoaXMuY2xvbmUoKS5lbmRPZih1bml0cykpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZGlmZiAoaW5wdXQsIHVuaXRzLCBhc0Zsb2F0KSB7XG4gICAgICAgIHZhciB0aGF0ID0gY2xvbmVXaXRoT2Zmc2V0KGlucHV0LCB0aGlzKSxcbiAgICAgICAgICAgIHpvbmVEZWx0YSA9ICh0aGF0LnV0Y09mZnNldCgpIC0gdGhpcy51dGNPZmZzZXQoKSkgKiA2ZTQsXG4gICAgICAgICAgICBkZWx0YSwgb3V0cHV0O1xuXG4gICAgICAgIHVuaXRzID0gbm9ybWFsaXplVW5pdHModW5pdHMpO1xuXG4gICAgICAgIGlmICh1bml0cyA9PT0gJ3llYXInIHx8IHVuaXRzID09PSAnbW9udGgnIHx8IHVuaXRzID09PSAncXVhcnRlcicpIHtcbiAgICAgICAgICAgIG91dHB1dCA9IG1vbnRoRGlmZih0aGlzLCB0aGF0KTtcbiAgICAgICAgICAgIGlmICh1bml0cyA9PT0gJ3F1YXJ0ZXInKSB7XG4gICAgICAgICAgICAgICAgb3V0cHV0ID0gb3V0cHV0IC8gMztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodW5pdHMgPT09ICd5ZWFyJykge1xuICAgICAgICAgICAgICAgIG91dHB1dCA9IG91dHB1dCAvIDEyO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZGVsdGEgPSB0aGlzIC0gdGhhdDtcbiAgICAgICAgICAgIG91dHB1dCA9IHVuaXRzID09PSAnc2Vjb25kJyA/IGRlbHRhIC8gMWUzIDogLy8gMTAwMFxuICAgICAgICAgICAgICAgIHVuaXRzID09PSAnbWludXRlJyA/IGRlbHRhIC8gNmU0IDogLy8gMTAwMCAqIDYwXG4gICAgICAgICAgICAgICAgdW5pdHMgPT09ICdob3VyJyA/IGRlbHRhIC8gMzZlNSA6IC8vIDEwMDAgKiA2MCAqIDYwXG4gICAgICAgICAgICAgICAgdW5pdHMgPT09ICdkYXknID8gKGRlbHRhIC0gem9uZURlbHRhKSAvIDg2NGU1IDogLy8gMTAwMCAqIDYwICogNjAgKiAyNCwgbmVnYXRlIGRzdFxuICAgICAgICAgICAgICAgIHVuaXRzID09PSAnd2VlaycgPyAoZGVsdGEgLSB6b25lRGVsdGEpIC8gNjA0OGU1IDogLy8gMTAwMCAqIDYwICogNjAgKiAyNCAqIDcsIG5lZ2F0ZSBkc3RcbiAgICAgICAgICAgICAgICBkZWx0YTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYXNGbG9hdCA/IG91dHB1dCA6IGFic0Zsb29yKG91dHB1dCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbW9udGhEaWZmIChhLCBiKSB7XG4gICAgICAgIC8vIGRpZmZlcmVuY2UgaW4gbW9udGhzXG4gICAgICAgIHZhciB3aG9sZU1vbnRoRGlmZiA9ICgoYi55ZWFyKCkgLSBhLnllYXIoKSkgKiAxMikgKyAoYi5tb250aCgpIC0gYS5tb250aCgpKSxcbiAgICAgICAgICAgIC8vIGIgaXMgaW4gKGFuY2hvciAtIDEgbW9udGgsIGFuY2hvciArIDEgbW9udGgpXG4gICAgICAgICAgICBhbmNob3IgPSBhLmNsb25lKCkuYWRkKHdob2xlTW9udGhEaWZmLCAnbW9udGhzJyksXG4gICAgICAgICAgICBhbmNob3IyLCBhZGp1c3Q7XG5cbiAgICAgICAgaWYgKGIgLSBhbmNob3IgPCAwKSB7XG4gICAgICAgICAgICBhbmNob3IyID0gYS5jbG9uZSgpLmFkZCh3aG9sZU1vbnRoRGlmZiAtIDEsICdtb250aHMnKTtcbiAgICAgICAgICAgIC8vIGxpbmVhciBhY3Jvc3MgdGhlIG1vbnRoXG4gICAgICAgICAgICBhZGp1c3QgPSAoYiAtIGFuY2hvcikgLyAoYW5jaG9yIC0gYW5jaG9yMik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhbmNob3IyID0gYS5jbG9uZSgpLmFkZCh3aG9sZU1vbnRoRGlmZiArIDEsICdtb250aHMnKTtcbiAgICAgICAgICAgIC8vIGxpbmVhciBhY3Jvc3MgdGhlIG1vbnRoXG4gICAgICAgICAgICBhZGp1c3QgPSAoYiAtIGFuY2hvcikgLyAoYW5jaG9yMiAtIGFuY2hvcik7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gLSh3aG9sZU1vbnRoRGlmZiArIGFkanVzdCk7XG4gICAgfVxuXG4gICAgdXRpbHNfaG9va3NfX2hvb2tzLmRlZmF1bHRGb3JtYXQgPSAnWVlZWS1NTS1ERFRISDptbTpzc1onO1xuXG4gICAgZnVuY3Rpb24gdG9TdHJpbmcgKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5jbG9uZSgpLmxvY2FsZSgnZW4nKS5mb3JtYXQoJ2RkZCBNTU0gREQgWVlZWSBISDptbTpzcyBbR01UXVpaJyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbW9tZW50X2Zvcm1hdF9fdG9JU09TdHJpbmcgKCkge1xuICAgICAgICB2YXIgbSA9IHRoaXMuY2xvbmUoKS51dGMoKTtcbiAgICAgICAgaWYgKDAgPCBtLnllYXIoKSAmJiBtLnllYXIoKSA8PSA5OTk5KSB7XG4gICAgICAgICAgICBpZiAoJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIERhdGUucHJvdG90eXBlLnRvSVNPU3RyaW5nKSB7XG4gICAgICAgICAgICAgICAgLy8gbmF0aXZlIGltcGxlbWVudGF0aW9uIGlzIH41MHggZmFzdGVyLCB1c2UgaXQgd2hlbiB3ZSBjYW5cbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy50b0RhdGUoKS50b0lTT1N0cmluZygpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZm9ybWF0TW9tZW50KG0sICdZWVlZLU1NLUREW1RdSEg6bW06c3MuU1NTW1pdJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gZm9ybWF0TW9tZW50KG0sICdZWVlZWVktTU0tRERbVF1ISDptbTpzcy5TU1NbWl0nKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGZvcm1hdCAoaW5wdXRTdHJpbmcpIHtcbiAgICAgICAgdmFyIG91dHB1dCA9IGZvcm1hdE1vbWVudCh0aGlzLCBpbnB1dFN0cmluZyB8fCB1dGlsc19ob29rc19faG9va3MuZGVmYXVsdEZvcm1hdCk7XG4gICAgICAgIHJldHVybiB0aGlzLmxvY2FsZURhdGEoKS5wb3N0Zm9ybWF0KG91dHB1dCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZnJvbSAodGltZSwgd2l0aG91dFN1ZmZpeCkge1xuICAgICAgICBpZiAoIXRoaXMuaXNWYWxpZCgpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5sb2NhbGVEYXRhKCkuaW52YWxpZERhdGUoKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY3JlYXRlX19jcmVhdGVEdXJhdGlvbih7dG86IHRoaXMsIGZyb206IHRpbWV9KS5sb2NhbGUodGhpcy5sb2NhbGUoKSkuaHVtYW5pemUoIXdpdGhvdXRTdWZmaXgpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGZyb21Ob3cgKHdpdGhvdXRTdWZmaXgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZnJvbShsb2NhbF9fY3JlYXRlTG9jYWwoKSwgd2l0aG91dFN1ZmZpeCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdG8gKHRpbWUsIHdpdGhvdXRTdWZmaXgpIHtcbiAgICAgICAgaWYgKCF0aGlzLmlzVmFsaWQoKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMubG9jYWxlRGF0YSgpLmludmFsaWREYXRlKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGNyZWF0ZV9fY3JlYXRlRHVyYXRpb24oe2Zyb206IHRoaXMsIHRvOiB0aW1lfSkubG9jYWxlKHRoaXMubG9jYWxlKCkpLmh1bWFuaXplKCF3aXRob3V0U3VmZml4KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB0b05vdyAod2l0aG91dFN1ZmZpeCkge1xuICAgICAgICByZXR1cm4gdGhpcy50byhsb2NhbF9fY3JlYXRlTG9jYWwoKSwgd2l0aG91dFN1ZmZpeCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbG9jYWxlIChrZXkpIHtcbiAgICAgICAgdmFyIG5ld0xvY2FsZURhdGE7XG5cbiAgICAgICAgaWYgKGtleSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fbG9jYWxlLl9hYmJyO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbmV3TG9jYWxlRGF0YSA9IGxvY2FsZV9sb2NhbGVzX19nZXRMb2NhbGUoa2V5KTtcbiAgICAgICAgICAgIGlmIChuZXdMb2NhbGVEYXRhICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9sb2NhbGUgPSBuZXdMb2NhbGVEYXRhO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgbGFuZyA9IGRlcHJlY2F0ZShcbiAgICAgICAgJ21vbWVudCgpLmxhbmcoKSBpcyBkZXByZWNhdGVkLiBJbnN0ZWFkLCB1c2UgbW9tZW50KCkubG9jYWxlRGF0YSgpIHRvIGdldCB0aGUgbGFuZ3VhZ2UgY29uZmlndXJhdGlvbi4gVXNlIG1vbWVudCgpLmxvY2FsZSgpIHRvIGNoYW5nZSBsYW5ndWFnZXMuJyxcbiAgICAgICAgZnVuY3Rpb24gKGtleSkge1xuICAgICAgICAgICAgaWYgKGtleSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMubG9jYWxlRGF0YSgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5sb2NhbGUoa2V5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICk7XG5cbiAgICBmdW5jdGlvbiBsb2NhbGVEYXRhICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2xvY2FsZTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzdGFydE9mICh1bml0cykge1xuICAgICAgICB1bml0cyA9IG5vcm1hbGl6ZVVuaXRzKHVuaXRzKTtcbiAgICAgICAgLy8gdGhlIGZvbGxvd2luZyBzd2l0Y2ggaW50ZW50aW9uYWxseSBvbWl0cyBicmVhayBrZXl3b3Jkc1xuICAgICAgICAvLyB0byB1dGlsaXplIGZhbGxpbmcgdGhyb3VnaCB0aGUgY2FzZXMuXG4gICAgICAgIHN3aXRjaCAodW5pdHMpIHtcbiAgICAgICAgY2FzZSAneWVhcic6XG4gICAgICAgICAgICB0aGlzLm1vbnRoKDApO1xuICAgICAgICAgICAgLyogZmFsbHMgdGhyb3VnaCAqL1xuICAgICAgICBjYXNlICdxdWFydGVyJzpcbiAgICAgICAgY2FzZSAnbW9udGgnOlxuICAgICAgICAgICAgdGhpcy5kYXRlKDEpO1xuICAgICAgICAgICAgLyogZmFsbHMgdGhyb3VnaCAqL1xuICAgICAgICBjYXNlICd3ZWVrJzpcbiAgICAgICAgY2FzZSAnaXNvV2Vlayc6XG4gICAgICAgIGNhc2UgJ2RheSc6XG4gICAgICAgICAgICB0aGlzLmhvdXJzKDApO1xuICAgICAgICAgICAgLyogZmFsbHMgdGhyb3VnaCAqL1xuICAgICAgICBjYXNlICdob3VyJzpcbiAgICAgICAgICAgIHRoaXMubWludXRlcygwKTtcbiAgICAgICAgICAgIC8qIGZhbGxzIHRocm91Z2ggKi9cbiAgICAgICAgY2FzZSAnbWludXRlJzpcbiAgICAgICAgICAgIHRoaXMuc2Vjb25kcygwKTtcbiAgICAgICAgICAgIC8qIGZhbGxzIHRocm91Z2ggKi9cbiAgICAgICAgY2FzZSAnc2Vjb25kJzpcbiAgICAgICAgICAgIHRoaXMubWlsbGlzZWNvbmRzKDApO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gd2Vla3MgYXJlIGEgc3BlY2lhbCBjYXNlXG4gICAgICAgIGlmICh1bml0cyA9PT0gJ3dlZWsnKSB7XG4gICAgICAgICAgICB0aGlzLndlZWtkYXkoMCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHVuaXRzID09PSAnaXNvV2VlaycpIHtcbiAgICAgICAgICAgIHRoaXMuaXNvV2Vla2RheSgxKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHF1YXJ0ZXJzIGFyZSBhbHNvIHNwZWNpYWxcbiAgICAgICAgaWYgKHVuaXRzID09PSAncXVhcnRlcicpIHtcbiAgICAgICAgICAgIHRoaXMubW9udGgoTWF0aC5mbG9vcih0aGlzLm1vbnRoKCkgLyAzKSAqIDMpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZW5kT2YgKHVuaXRzKSB7XG4gICAgICAgIHVuaXRzID0gbm9ybWFsaXplVW5pdHModW5pdHMpO1xuICAgICAgICBpZiAodW5pdHMgPT09IHVuZGVmaW5lZCB8fCB1bml0cyA9PT0gJ21pbGxpc2Vjb25kJykge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuc3RhcnRPZih1bml0cykuYWRkKDEsICh1bml0cyA9PT0gJ2lzb1dlZWsnID8gJ3dlZWsnIDogdW5pdHMpKS5zdWJ0cmFjdCgxLCAnbXMnKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB0b190eXBlX192YWx1ZU9mICgpIHtcbiAgICAgICAgcmV0dXJuICt0aGlzLl9kIC0gKCh0aGlzLl9vZmZzZXQgfHwgMCkgKiA2MDAwMCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdW5peCAoKSB7XG4gICAgICAgIHJldHVybiBNYXRoLmZsb29yKCt0aGlzIC8gMTAwMCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdG9EYXRlICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX29mZnNldCA/IG5ldyBEYXRlKCt0aGlzKSA6IHRoaXMuX2Q7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdG9BcnJheSAoKSB7XG4gICAgICAgIHZhciBtID0gdGhpcztcbiAgICAgICAgcmV0dXJuIFttLnllYXIoKSwgbS5tb250aCgpLCBtLmRhdGUoKSwgbS5ob3VyKCksIG0ubWludXRlKCksIG0uc2Vjb25kKCksIG0ubWlsbGlzZWNvbmQoKV07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdG9PYmplY3QgKCkge1xuICAgICAgICB2YXIgbSA9IHRoaXM7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB5ZWFyczogbS55ZWFyKCksXG4gICAgICAgICAgICBtb250aHM6IG0ubW9udGgoKSxcbiAgICAgICAgICAgIGRhdGU6IG0uZGF0ZSgpLFxuICAgICAgICAgICAgaG91cnM6IG0uaG91cnMoKSxcbiAgICAgICAgICAgIG1pbnV0ZXM6IG0ubWludXRlcygpLFxuICAgICAgICAgICAgc2Vjb25kczogbS5zZWNvbmRzKCksXG4gICAgICAgICAgICBtaWxsaXNlY29uZHM6IG0ubWlsbGlzZWNvbmRzKClcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBtb21lbnRfdmFsaWRfX2lzVmFsaWQgKCkge1xuICAgICAgICByZXR1cm4gdmFsaWRfX2lzVmFsaWQodGhpcyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFyc2luZ0ZsYWdzICgpIHtcbiAgICAgICAgcmV0dXJuIGV4dGVuZCh7fSwgZ2V0UGFyc2luZ0ZsYWdzKHRoaXMpKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpbnZhbGlkQXQgKCkge1xuICAgICAgICByZXR1cm4gZ2V0UGFyc2luZ0ZsYWdzKHRoaXMpLm92ZXJmbG93O1xuICAgIH1cblxuICAgIGFkZEZvcm1hdFRva2VuKDAsIFsnZ2cnLCAyXSwgMCwgZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy53ZWVrWWVhcigpICUgMTAwO1xuICAgIH0pO1xuXG4gICAgYWRkRm9ybWF0VG9rZW4oMCwgWydHRycsIDJdLCAwLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmlzb1dlZWtZZWFyKCkgJSAxMDA7XG4gICAgfSk7XG5cbiAgICBmdW5jdGlvbiBhZGRXZWVrWWVhckZvcm1hdFRva2VuICh0b2tlbiwgZ2V0dGVyKSB7XG4gICAgICAgIGFkZEZvcm1hdFRva2VuKDAsIFt0b2tlbiwgdG9rZW4ubGVuZ3RoXSwgMCwgZ2V0dGVyKTtcbiAgICB9XG5cbiAgICBhZGRXZWVrWWVhckZvcm1hdFRva2VuKCdnZ2dnJywgICAgICd3ZWVrWWVhcicpO1xuICAgIGFkZFdlZWtZZWFyRm9ybWF0VG9rZW4oJ2dnZ2dnJywgICAgJ3dlZWtZZWFyJyk7XG4gICAgYWRkV2Vla1llYXJGb3JtYXRUb2tlbignR0dHRycsICAnaXNvV2Vla1llYXInKTtcbiAgICBhZGRXZWVrWWVhckZvcm1hdFRva2VuKCdHR0dHRycsICdpc29XZWVrWWVhcicpO1xuXG4gICAgLy8gQUxJQVNFU1xuXG4gICAgYWRkVW5pdEFsaWFzKCd3ZWVrWWVhcicsICdnZycpO1xuICAgIGFkZFVuaXRBbGlhcygnaXNvV2Vla1llYXInLCAnR0cnKTtcblxuICAgIC8vIFBBUlNJTkdcblxuICAgIGFkZFJlZ2V4VG9rZW4oJ0cnLCAgICAgIG1hdGNoU2lnbmVkKTtcbiAgICBhZGRSZWdleFRva2VuKCdnJywgICAgICBtYXRjaFNpZ25lZCk7XG4gICAgYWRkUmVnZXhUb2tlbignR0cnLCAgICAgbWF0Y2gxdG8yLCBtYXRjaDIpO1xuICAgIGFkZFJlZ2V4VG9rZW4oJ2dnJywgICAgIG1hdGNoMXRvMiwgbWF0Y2gyKTtcbiAgICBhZGRSZWdleFRva2VuKCdHR0dHJywgICBtYXRjaDF0bzQsIG1hdGNoNCk7XG4gICAgYWRkUmVnZXhUb2tlbignZ2dnZycsICAgbWF0Y2gxdG80LCBtYXRjaDQpO1xuICAgIGFkZFJlZ2V4VG9rZW4oJ0dHR0dHJywgIG1hdGNoMXRvNiwgbWF0Y2g2KTtcbiAgICBhZGRSZWdleFRva2VuKCdnZ2dnZycsICBtYXRjaDF0bzYsIG1hdGNoNik7XG5cbiAgICBhZGRXZWVrUGFyc2VUb2tlbihbJ2dnZ2cnLCAnZ2dnZ2cnLCAnR0dHRycsICdHR0dHRyddLCBmdW5jdGlvbiAoaW5wdXQsIHdlZWssIGNvbmZpZywgdG9rZW4pIHtcbiAgICAgICAgd2Vla1t0b2tlbi5zdWJzdHIoMCwgMildID0gdG9JbnQoaW5wdXQpO1xuICAgIH0pO1xuXG4gICAgYWRkV2Vla1BhcnNlVG9rZW4oWydnZycsICdHRyddLCBmdW5jdGlvbiAoaW5wdXQsIHdlZWssIGNvbmZpZywgdG9rZW4pIHtcbiAgICAgICAgd2Vla1t0b2tlbl0gPSB1dGlsc19ob29rc19faG9va3MucGFyc2VUd29EaWdpdFllYXIoaW5wdXQpO1xuICAgIH0pO1xuXG4gICAgLy8gSEVMUEVSU1xuXG4gICAgZnVuY3Rpb24gd2Vla3NJblllYXIoeWVhciwgZG93LCBkb3kpIHtcbiAgICAgICAgcmV0dXJuIHdlZWtPZlllYXIobG9jYWxfX2NyZWF0ZUxvY2FsKFt5ZWFyLCAxMSwgMzEgKyBkb3cgLSBkb3ldKSwgZG93LCBkb3kpLndlZWs7XG4gICAgfVxuXG4gICAgLy8gTU9NRU5UU1xuXG4gICAgZnVuY3Rpb24gZ2V0U2V0V2Vla1llYXIgKGlucHV0KSB7XG4gICAgICAgIHZhciB5ZWFyID0gd2Vla09mWWVhcih0aGlzLCB0aGlzLmxvY2FsZURhdGEoKS5fd2Vlay5kb3csIHRoaXMubG9jYWxlRGF0YSgpLl93ZWVrLmRveSkueWVhcjtcbiAgICAgICAgcmV0dXJuIGlucHV0ID09IG51bGwgPyB5ZWFyIDogdGhpcy5hZGQoKGlucHV0IC0geWVhciksICd5Jyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0U2V0SVNPV2Vla1llYXIgKGlucHV0KSB7XG4gICAgICAgIHZhciB5ZWFyID0gd2Vla09mWWVhcih0aGlzLCAxLCA0KS55ZWFyO1xuICAgICAgICByZXR1cm4gaW5wdXQgPT0gbnVsbCA/IHllYXIgOiB0aGlzLmFkZCgoaW5wdXQgLSB5ZWFyKSwgJ3knKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRJU09XZWVrc0luWWVhciAoKSB7XG4gICAgICAgIHJldHVybiB3ZWVrc0luWWVhcih0aGlzLnllYXIoKSwgMSwgNCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0V2Vla3NJblllYXIgKCkge1xuICAgICAgICB2YXIgd2Vla0luZm8gPSB0aGlzLmxvY2FsZURhdGEoKS5fd2VlaztcbiAgICAgICAgcmV0dXJuIHdlZWtzSW5ZZWFyKHRoaXMueWVhcigpLCB3ZWVrSW5mby5kb3csIHdlZWtJbmZvLmRveSk7XG4gICAgfVxuXG4gICAgYWRkRm9ybWF0VG9rZW4oJ1EnLCAwLCAwLCAncXVhcnRlcicpO1xuXG4gICAgLy8gQUxJQVNFU1xuXG4gICAgYWRkVW5pdEFsaWFzKCdxdWFydGVyJywgJ1EnKTtcblxuICAgIC8vIFBBUlNJTkdcblxuICAgIGFkZFJlZ2V4VG9rZW4oJ1EnLCBtYXRjaDEpO1xuICAgIGFkZFBhcnNlVG9rZW4oJ1EnLCBmdW5jdGlvbiAoaW5wdXQsIGFycmF5KSB7XG4gICAgICAgIGFycmF5W01PTlRIXSA9ICh0b0ludChpbnB1dCkgLSAxKSAqIDM7XG4gICAgfSk7XG5cbiAgICAvLyBNT01FTlRTXG5cbiAgICBmdW5jdGlvbiBnZXRTZXRRdWFydGVyIChpbnB1dCkge1xuICAgICAgICByZXR1cm4gaW5wdXQgPT0gbnVsbCA/IE1hdGguY2VpbCgodGhpcy5tb250aCgpICsgMSkgLyAzKSA6IHRoaXMubW9udGgoKGlucHV0IC0gMSkgKiAzICsgdGhpcy5tb250aCgpICUgMyk7XG4gICAgfVxuXG4gICAgYWRkRm9ybWF0VG9rZW4oJ0QnLCBbJ0REJywgMl0sICdEbycsICdkYXRlJyk7XG5cbiAgICAvLyBBTElBU0VTXG5cbiAgICBhZGRVbml0QWxpYXMoJ2RhdGUnLCAnRCcpO1xuXG4gICAgLy8gUEFSU0lOR1xuXG4gICAgYWRkUmVnZXhUb2tlbignRCcsICBtYXRjaDF0bzIpO1xuICAgIGFkZFJlZ2V4VG9rZW4oJ0REJywgbWF0Y2gxdG8yLCBtYXRjaDIpO1xuICAgIGFkZFJlZ2V4VG9rZW4oJ0RvJywgZnVuY3Rpb24gKGlzU3RyaWN0LCBsb2NhbGUpIHtcbiAgICAgICAgcmV0dXJuIGlzU3RyaWN0ID8gbG9jYWxlLl9vcmRpbmFsUGFyc2UgOiBsb2NhbGUuX29yZGluYWxQYXJzZUxlbmllbnQ7XG4gICAgfSk7XG5cbiAgICBhZGRQYXJzZVRva2VuKFsnRCcsICdERCddLCBEQVRFKTtcbiAgICBhZGRQYXJzZVRva2VuKCdEbycsIGZ1bmN0aW9uIChpbnB1dCwgYXJyYXkpIHtcbiAgICAgICAgYXJyYXlbREFURV0gPSB0b0ludChpbnB1dC5tYXRjaChtYXRjaDF0bzIpWzBdLCAxMCk7XG4gICAgfSk7XG5cbiAgICAvLyBNT01FTlRTXG5cbiAgICB2YXIgZ2V0U2V0RGF5T2ZNb250aCA9IG1ha2VHZXRTZXQoJ0RhdGUnLCB0cnVlKTtcblxuICAgIGFkZEZvcm1hdFRva2VuKCdkJywgMCwgJ2RvJywgJ2RheScpO1xuXG4gICAgYWRkRm9ybWF0VG9rZW4oJ2RkJywgMCwgMCwgZnVuY3Rpb24gKGZvcm1hdCkge1xuICAgICAgICByZXR1cm4gdGhpcy5sb2NhbGVEYXRhKCkud2Vla2RheXNNaW4odGhpcywgZm9ybWF0KTtcbiAgICB9KTtcblxuICAgIGFkZEZvcm1hdFRva2VuKCdkZGQnLCAwLCAwLCBmdW5jdGlvbiAoZm9ybWF0KSB7XG4gICAgICAgIHJldHVybiB0aGlzLmxvY2FsZURhdGEoKS53ZWVrZGF5c1Nob3J0KHRoaXMsIGZvcm1hdCk7XG4gICAgfSk7XG5cbiAgICBhZGRGb3JtYXRUb2tlbignZGRkZCcsIDAsIDAsIGZ1bmN0aW9uIChmb3JtYXQpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubG9jYWxlRGF0YSgpLndlZWtkYXlzKHRoaXMsIGZvcm1hdCk7XG4gICAgfSk7XG5cbiAgICBhZGRGb3JtYXRUb2tlbignZScsIDAsIDAsICd3ZWVrZGF5Jyk7XG4gICAgYWRkRm9ybWF0VG9rZW4oJ0UnLCAwLCAwLCAnaXNvV2Vla2RheScpO1xuXG4gICAgLy8gQUxJQVNFU1xuXG4gICAgYWRkVW5pdEFsaWFzKCdkYXknLCAnZCcpO1xuICAgIGFkZFVuaXRBbGlhcygnd2Vla2RheScsICdlJyk7XG4gICAgYWRkVW5pdEFsaWFzKCdpc29XZWVrZGF5JywgJ0UnKTtcblxuICAgIC8vIFBBUlNJTkdcblxuICAgIGFkZFJlZ2V4VG9rZW4oJ2QnLCAgICBtYXRjaDF0bzIpO1xuICAgIGFkZFJlZ2V4VG9rZW4oJ2UnLCAgICBtYXRjaDF0bzIpO1xuICAgIGFkZFJlZ2V4VG9rZW4oJ0UnLCAgICBtYXRjaDF0bzIpO1xuICAgIGFkZFJlZ2V4VG9rZW4oJ2RkJywgICBtYXRjaFdvcmQpO1xuICAgIGFkZFJlZ2V4VG9rZW4oJ2RkZCcsICBtYXRjaFdvcmQpO1xuICAgIGFkZFJlZ2V4VG9rZW4oJ2RkZGQnLCBtYXRjaFdvcmQpO1xuXG4gICAgYWRkV2Vla1BhcnNlVG9rZW4oWydkZCcsICdkZGQnLCAnZGRkZCddLCBmdW5jdGlvbiAoaW5wdXQsIHdlZWssIGNvbmZpZykge1xuICAgICAgICB2YXIgd2Vla2RheSA9IGNvbmZpZy5fbG9jYWxlLndlZWtkYXlzUGFyc2UoaW5wdXQpO1xuICAgICAgICAvLyBpZiB3ZSBkaWRuJ3QgZ2V0IGEgd2Vla2RheSBuYW1lLCBtYXJrIHRoZSBkYXRlIGFzIGludmFsaWRcbiAgICAgICAgaWYgKHdlZWtkYXkgIT0gbnVsbCkge1xuICAgICAgICAgICAgd2Vlay5kID0gd2Vla2RheTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGdldFBhcnNpbmdGbGFncyhjb25maWcpLmludmFsaWRXZWVrZGF5ID0gaW5wdXQ7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIGFkZFdlZWtQYXJzZVRva2VuKFsnZCcsICdlJywgJ0UnXSwgZnVuY3Rpb24gKGlucHV0LCB3ZWVrLCBjb25maWcsIHRva2VuKSB7XG4gICAgICAgIHdlZWtbdG9rZW5dID0gdG9JbnQoaW5wdXQpO1xuICAgIH0pO1xuXG4gICAgLy8gSEVMUEVSU1xuXG4gICAgZnVuY3Rpb24gcGFyc2VXZWVrZGF5KGlucHV0LCBsb2NhbGUpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBpbnB1dCAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIHJldHVybiBpbnB1dDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghaXNOYU4oaW5wdXQpKSB7XG4gICAgICAgICAgICByZXR1cm4gcGFyc2VJbnQoaW5wdXQsIDEwKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlucHV0ID0gbG9jYWxlLndlZWtkYXlzUGFyc2UoaW5wdXQpO1xuICAgICAgICBpZiAodHlwZW9mIGlucHV0ID09PSAnbnVtYmVyJykge1xuICAgICAgICAgICAgcmV0dXJuIGlucHV0O1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgLy8gTE9DQUxFU1xuXG4gICAgdmFyIGRlZmF1bHRMb2NhbGVXZWVrZGF5cyA9ICdTdW5kYXlfTW9uZGF5X1R1ZXNkYXlfV2VkbmVzZGF5X1RodXJzZGF5X0ZyaWRheV9TYXR1cmRheScuc3BsaXQoJ18nKTtcbiAgICBmdW5jdGlvbiBsb2NhbGVXZWVrZGF5cyAobSkge1xuICAgICAgICByZXR1cm4gdGhpcy5fd2Vla2RheXNbbS5kYXkoKV07XG4gICAgfVxuXG4gICAgdmFyIGRlZmF1bHRMb2NhbGVXZWVrZGF5c1Nob3J0ID0gJ1N1bl9Nb25fVHVlX1dlZF9UaHVfRnJpX1NhdCcuc3BsaXQoJ18nKTtcbiAgICBmdW5jdGlvbiBsb2NhbGVXZWVrZGF5c1Nob3J0IChtKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl93ZWVrZGF5c1Nob3J0W20uZGF5KCldO1xuICAgIH1cblxuICAgIHZhciBkZWZhdWx0TG9jYWxlV2Vla2RheXNNaW4gPSAnU3VfTW9fVHVfV2VfVGhfRnJfU2EnLnNwbGl0KCdfJyk7XG4gICAgZnVuY3Rpb24gbG9jYWxlV2Vla2RheXNNaW4gKG0pIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3dlZWtkYXlzTWluW20uZGF5KCldO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGxvY2FsZVdlZWtkYXlzUGFyc2UgKHdlZWtkYXlOYW1lKSB7XG4gICAgICAgIHZhciBpLCBtb20sIHJlZ2V4O1xuXG4gICAgICAgIHRoaXMuX3dlZWtkYXlzUGFyc2UgPSB0aGlzLl93ZWVrZGF5c1BhcnNlIHx8IFtdO1xuXG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCA3OyBpKyspIHtcbiAgICAgICAgICAgIC8vIG1ha2UgdGhlIHJlZ2V4IGlmIHdlIGRvbid0IGhhdmUgaXQgYWxyZWFkeVxuICAgICAgICAgICAgaWYgKCF0aGlzLl93ZWVrZGF5c1BhcnNlW2ldKSB7XG4gICAgICAgICAgICAgICAgbW9tID0gbG9jYWxfX2NyZWF0ZUxvY2FsKFsyMDAwLCAxXSkuZGF5KGkpO1xuICAgICAgICAgICAgICAgIHJlZ2V4ID0gJ14nICsgdGhpcy53ZWVrZGF5cyhtb20sICcnKSArICd8XicgKyB0aGlzLndlZWtkYXlzU2hvcnQobW9tLCAnJykgKyAnfF4nICsgdGhpcy53ZWVrZGF5c01pbihtb20sICcnKTtcbiAgICAgICAgICAgICAgICB0aGlzLl93ZWVrZGF5c1BhcnNlW2ldID0gbmV3IFJlZ0V4cChyZWdleC5yZXBsYWNlKCcuJywgJycpLCAnaScpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gdGVzdCB0aGUgcmVnZXhcbiAgICAgICAgICAgIGlmICh0aGlzLl93ZWVrZGF5c1BhcnNlW2ldLnRlc3Qod2Vla2RheU5hbWUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBNT01FTlRTXG5cbiAgICBmdW5jdGlvbiBnZXRTZXREYXlPZldlZWsgKGlucHV0KSB7XG4gICAgICAgIHZhciBkYXkgPSB0aGlzLl9pc1VUQyA/IHRoaXMuX2QuZ2V0VVRDRGF5KCkgOiB0aGlzLl9kLmdldERheSgpO1xuICAgICAgICBpZiAoaW5wdXQgIT0gbnVsbCkge1xuICAgICAgICAgICAgaW5wdXQgPSBwYXJzZVdlZWtkYXkoaW5wdXQsIHRoaXMubG9jYWxlRGF0YSgpKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmFkZChpbnB1dCAtIGRheSwgJ2QnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBkYXk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRTZXRMb2NhbGVEYXlPZldlZWsgKGlucHV0KSB7XG4gICAgICAgIHZhciB3ZWVrZGF5ID0gKHRoaXMuZGF5KCkgKyA3IC0gdGhpcy5sb2NhbGVEYXRhKCkuX3dlZWsuZG93KSAlIDc7XG4gICAgICAgIHJldHVybiBpbnB1dCA9PSBudWxsID8gd2Vla2RheSA6IHRoaXMuYWRkKGlucHV0IC0gd2Vla2RheSwgJ2QnKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRTZXRJU09EYXlPZldlZWsgKGlucHV0KSB7XG4gICAgICAgIC8vIGJlaGF2ZXMgdGhlIHNhbWUgYXMgbW9tZW50I2RheSBleGNlcHRcbiAgICAgICAgLy8gYXMgYSBnZXR0ZXIsIHJldHVybnMgNyBpbnN0ZWFkIG9mIDAgKDEtNyByYW5nZSBpbnN0ZWFkIG9mIDAtNilcbiAgICAgICAgLy8gYXMgYSBzZXR0ZXIsIHN1bmRheSBzaG91bGQgYmVsb25nIHRvIHRoZSBwcmV2aW91cyB3ZWVrLlxuICAgICAgICByZXR1cm4gaW5wdXQgPT0gbnVsbCA/IHRoaXMuZGF5KCkgfHwgNyA6IHRoaXMuZGF5KHRoaXMuZGF5KCkgJSA3ID8gaW5wdXQgOiBpbnB1dCAtIDcpO1xuICAgIH1cblxuICAgIGFkZEZvcm1hdFRva2VuKCdIJywgWydISCcsIDJdLCAwLCAnaG91cicpO1xuICAgIGFkZEZvcm1hdFRva2VuKCdoJywgWydoaCcsIDJdLCAwLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmhvdXJzKCkgJSAxMiB8fCAxMjtcbiAgICB9KTtcblxuICAgIGZ1bmN0aW9uIG1lcmlkaWVtICh0b2tlbiwgbG93ZXJjYXNlKSB7XG4gICAgICAgIGFkZEZvcm1hdFRva2VuKHRva2VuLCAwLCAwLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5sb2NhbGVEYXRhKCkubWVyaWRpZW0odGhpcy5ob3VycygpLCB0aGlzLm1pbnV0ZXMoKSwgbG93ZXJjYXNlKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgbWVyaWRpZW0oJ2EnLCB0cnVlKTtcbiAgICBtZXJpZGllbSgnQScsIGZhbHNlKTtcblxuICAgIC8vIEFMSUFTRVNcblxuICAgIGFkZFVuaXRBbGlhcygnaG91cicsICdoJyk7XG5cbiAgICAvLyBQQVJTSU5HXG5cbiAgICBmdW5jdGlvbiBtYXRjaE1lcmlkaWVtIChpc1N0cmljdCwgbG9jYWxlKSB7XG4gICAgICAgIHJldHVybiBsb2NhbGUuX21lcmlkaWVtUGFyc2U7XG4gICAgfVxuXG4gICAgYWRkUmVnZXhUb2tlbignYScsICBtYXRjaE1lcmlkaWVtKTtcbiAgICBhZGRSZWdleFRva2VuKCdBJywgIG1hdGNoTWVyaWRpZW0pO1xuICAgIGFkZFJlZ2V4VG9rZW4oJ0gnLCAgbWF0Y2gxdG8yKTtcbiAgICBhZGRSZWdleFRva2VuKCdoJywgIG1hdGNoMXRvMik7XG4gICAgYWRkUmVnZXhUb2tlbignSEgnLCBtYXRjaDF0bzIsIG1hdGNoMik7XG4gICAgYWRkUmVnZXhUb2tlbignaGgnLCBtYXRjaDF0bzIsIG1hdGNoMik7XG5cbiAgICBhZGRQYXJzZVRva2VuKFsnSCcsICdISCddLCBIT1VSKTtcbiAgICBhZGRQYXJzZVRva2VuKFsnYScsICdBJ10sIGZ1bmN0aW9uIChpbnB1dCwgYXJyYXksIGNvbmZpZykge1xuICAgICAgICBjb25maWcuX2lzUG0gPSBjb25maWcuX2xvY2FsZS5pc1BNKGlucHV0KTtcbiAgICAgICAgY29uZmlnLl9tZXJpZGllbSA9IGlucHV0O1xuICAgIH0pO1xuICAgIGFkZFBhcnNlVG9rZW4oWydoJywgJ2hoJ10sIGZ1bmN0aW9uIChpbnB1dCwgYXJyYXksIGNvbmZpZykge1xuICAgICAgICBhcnJheVtIT1VSXSA9IHRvSW50KGlucHV0KTtcbiAgICAgICAgZ2V0UGFyc2luZ0ZsYWdzKGNvbmZpZykuYmlnSG91ciA9IHRydWU7XG4gICAgfSk7XG5cbiAgICAvLyBMT0NBTEVTXG5cbiAgICBmdW5jdGlvbiBsb2NhbGVJc1BNIChpbnB1dCkge1xuICAgICAgICAvLyBJRTggUXVpcmtzIE1vZGUgJiBJRTcgU3RhbmRhcmRzIE1vZGUgZG8gbm90IGFsbG93IGFjY2Vzc2luZyBzdHJpbmdzIGxpa2UgYXJyYXlzXG4gICAgICAgIC8vIFVzaW5nIGNoYXJBdCBzaG91bGQgYmUgbW9yZSBjb21wYXRpYmxlLlxuICAgICAgICByZXR1cm4gKChpbnB1dCArICcnKS50b0xvd2VyQ2FzZSgpLmNoYXJBdCgwKSA9PT0gJ3AnKTtcbiAgICB9XG5cbiAgICB2YXIgZGVmYXVsdExvY2FsZU1lcmlkaWVtUGFyc2UgPSAvW2FwXVxcLj9tP1xcLj8vaTtcbiAgICBmdW5jdGlvbiBsb2NhbGVNZXJpZGllbSAoaG91cnMsIG1pbnV0ZXMsIGlzTG93ZXIpIHtcbiAgICAgICAgaWYgKGhvdXJzID4gMTEpIHtcbiAgICAgICAgICAgIHJldHVybiBpc0xvd2VyID8gJ3BtJyA6ICdQTSc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gaXNMb3dlciA/ICdhbScgOiAnQU0nO1xuICAgICAgICB9XG4gICAgfVxuXG5cbiAgICAvLyBNT01FTlRTXG5cbiAgICAvLyBTZXR0aW5nIHRoZSBob3VyIHNob3VsZCBrZWVwIHRoZSB0aW1lLCBiZWNhdXNlIHRoZSB1c2VyIGV4cGxpY2l0bHlcbiAgICAvLyBzcGVjaWZpZWQgd2hpY2ggaG91ciBoZSB3YW50cy4gU28gdHJ5aW5nIHRvIG1haW50YWluIHRoZSBzYW1lIGhvdXIgKGluXG4gICAgLy8gYSBuZXcgdGltZXpvbmUpIG1ha2VzIHNlbnNlLiBBZGRpbmcvc3VidHJhY3RpbmcgaG91cnMgZG9lcyBub3QgZm9sbG93XG4gICAgLy8gdGhpcyBydWxlLlxuICAgIHZhciBnZXRTZXRIb3VyID0gbWFrZUdldFNldCgnSG91cnMnLCB0cnVlKTtcblxuICAgIGFkZEZvcm1hdFRva2VuKCdtJywgWydtbScsIDJdLCAwLCAnbWludXRlJyk7XG5cbiAgICAvLyBBTElBU0VTXG5cbiAgICBhZGRVbml0QWxpYXMoJ21pbnV0ZScsICdtJyk7XG5cbiAgICAvLyBQQVJTSU5HXG5cbiAgICBhZGRSZWdleFRva2VuKCdtJywgIG1hdGNoMXRvMik7XG4gICAgYWRkUmVnZXhUb2tlbignbW0nLCBtYXRjaDF0bzIsIG1hdGNoMik7XG4gICAgYWRkUGFyc2VUb2tlbihbJ20nLCAnbW0nXSwgTUlOVVRFKTtcblxuICAgIC8vIE1PTUVOVFNcblxuICAgIHZhciBnZXRTZXRNaW51dGUgPSBtYWtlR2V0U2V0KCdNaW51dGVzJywgZmFsc2UpO1xuXG4gICAgYWRkRm9ybWF0VG9rZW4oJ3MnLCBbJ3NzJywgMl0sIDAsICdzZWNvbmQnKTtcblxuICAgIC8vIEFMSUFTRVNcblxuICAgIGFkZFVuaXRBbGlhcygnc2Vjb25kJywgJ3MnKTtcblxuICAgIC8vIFBBUlNJTkdcblxuICAgIGFkZFJlZ2V4VG9rZW4oJ3MnLCAgbWF0Y2gxdG8yKTtcbiAgICBhZGRSZWdleFRva2VuKCdzcycsIG1hdGNoMXRvMiwgbWF0Y2gyKTtcbiAgICBhZGRQYXJzZVRva2VuKFsncycsICdzcyddLCBTRUNPTkQpO1xuXG4gICAgLy8gTU9NRU5UU1xuXG4gICAgdmFyIGdldFNldFNlY29uZCA9IG1ha2VHZXRTZXQoJ1NlY29uZHMnLCBmYWxzZSk7XG5cbiAgICBhZGRGb3JtYXRUb2tlbignUycsIDAsIDAsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIH5+KHRoaXMubWlsbGlzZWNvbmQoKSAvIDEwMCk7XG4gICAgfSk7XG5cbiAgICBhZGRGb3JtYXRUb2tlbigwLCBbJ1NTJywgMl0sIDAsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIH5+KHRoaXMubWlsbGlzZWNvbmQoKSAvIDEwKTtcbiAgICB9KTtcblxuICAgIGFkZEZvcm1hdFRva2VuKDAsIFsnU1NTJywgM10sIDAsICdtaWxsaXNlY29uZCcpO1xuICAgIGFkZEZvcm1hdFRva2VuKDAsIFsnU1NTUycsIDRdLCAwLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLm1pbGxpc2Vjb25kKCkgKiAxMDtcbiAgICB9KTtcbiAgICBhZGRGb3JtYXRUb2tlbigwLCBbJ1NTU1NTJywgNV0sIDAsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubWlsbGlzZWNvbmQoKSAqIDEwMDtcbiAgICB9KTtcbiAgICBhZGRGb3JtYXRUb2tlbigwLCBbJ1NTU1NTUycsIDZdLCAwLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLm1pbGxpc2Vjb25kKCkgKiAxMDAwO1xuICAgIH0pO1xuICAgIGFkZEZvcm1hdFRva2VuKDAsIFsnU1NTU1NTUycsIDddLCAwLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLm1pbGxpc2Vjb25kKCkgKiAxMDAwMDtcbiAgICB9KTtcbiAgICBhZGRGb3JtYXRUb2tlbigwLCBbJ1NTU1NTU1NTJywgOF0sIDAsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubWlsbGlzZWNvbmQoKSAqIDEwMDAwMDtcbiAgICB9KTtcbiAgICBhZGRGb3JtYXRUb2tlbigwLCBbJ1NTU1NTU1NTUycsIDldLCAwLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLm1pbGxpc2Vjb25kKCkgKiAxMDAwMDAwO1xuICAgIH0pO1xuXG5cbiAgICAvLyBBTElBU0VTXG5cbiAgICBhZGRVbml0QWxpYXMoJ21pbGxpc2Vjb25kJywgJ21zJyk7XG5cbiAgICAvLyBQQVJTSU5HXG5cbiAgICBhZGRSZWdleFRva2VuKCdTJywgICAgbWF0Y2gxdG8zLCBtYXRjaDEpO1xuICAgIGFkZFJlZ2V4VG9rZW4oJ1NTJywgICBtYXRjaDF0bzMsIG1hdGNoMik7XG4gICAgYWRkUmVnZXhUb2tlbignU1NTJywgIG1hdGNoMXRvMywgbWF0Y2gzKTtcblxuICAgIHZhciB0b2tlbjtcbiAgICBmb3IgKHRva2VuID0gJ1NTU1MnOyB0b2tlbi5sZW5ndGggPD0gOTsgdG9rZW4gKz0gJ1MnKSB7XG4gICAgICAgIGFkZFJlZ2V4VG9rZW4odG9rZW4sIG1hdGNoVW5zaWduZWQpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhcnNlTXMoaW5wdXQsIGFycmF5KSB7XG4gICAgICAgIGFycmF5W01JTExJU0VDT05EXSA9IHRvSW50KCgnMC4nICsgaW5wdXQpICogMTAwMCk7XG4gICAgfVxuXG4gICAgZm9yICh0b2tlbiA9ICdTJzsgdG9rZW4ubGVuZ3RoIDw9IDk7IHRva2VuICs9ICdTJykge1xuICAgICAgICBhZGRQYXJzZVRva2VuKHRva2VuLCBwYXJzZU1zKTtcbiAgICB9XG4gICAgLy8gTU9NRU5UU1xuXG4gICAgdmFyIGdldFNldE1pbGxpc2Vjb25kID0gbWFrZUdldFNldCgnTWlsbGlzZWNvbmRzJywgZmFsc2UpO1xuXG4gICAgYWRkRm9ybWF0VG9rZW4oJ3onLCAgMCwgMCwgJ3pvbmVBYmJyJyk7XG4gICAgYWRkRm9ybWF0VG9rZW4oJ3p6JywgMCwgMCwgJ3pvbmVOYW1lJyk7XG5cbiAgICAvLyBNT01FTlRTXG5cbiAgICBmdW5jdGlvbiBnZXRab25lQWJiciAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9pc1VUQyA/ICdVVEMnIDogJyc7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0Wm9uZU5hbWUgKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5faXNVVEMgPyAnQ29vcmRpbmF0ZWQgVW5pdmVyc2FsIFRpbWUnIDogJyc7XG4gICAgfVxuXG4gICAgdmFyIG1vbWVudFByb3RvdHlwZV9fcHJvdG8gPSBNb21lbnQucHJvdG90eXBlO1xuXG4gICAgbW9tZW50UHJvdG90eXBlX19wcm90by5hZGQgICAgICAgICAgPSBhZGRfc3VidHJhY3RfX2FkZDtcbiAgICBtb21lbnRQcm90b3R5cGVfX3Byb3RvLmNhbGVuZGFyICAgICA9IG1vbWVudF9jYWxlbmRhcl9fY2FsZW5kYXI7XG4gICAgbW9tZW50UHJvdG90eXBlX19wcm90by5jbG9uZSAgICAgICAgPSBjbG9uZTtcbiAgICBtb21lbnRQcm90b3R5cGVfX3Byb3RvLmRpZmYgICAgICAgICA9IGRpZmY7XG4gICAgbW9tZW50UHJvdG90eXBlX19wcm90by5lbmRPZiAgICAgICAgPSBlbmRPZjtcbiAgICBtb21lbnRQcm90b3R5cGVfX3Byb3RvLmZvcm1hdCAgICAgICA9IGZvcm1hdDtcbiAgICBtb21lbnRQcm90b3R5cGVfX3Byb3RvLmZyb20gICAgICAgICA9IGZyb207XG4gICAgbW9tZW50UHJvdG90eXBlX19wcm90by5mcm9tTm93ICAgICAgPSBmcm9tTm93O1xuICAgIG1vbWVudFByb3RvdHlwZV9fcHJvdG8udG8gICAgICAgICAgID0gdG87XG4gICAgbW9tZW50UHJvdG90eXBlX19wcm90by50b05vdyAgICAgICAgPSB0b05vdztcbiAgICBtb21lbnRQcm90b3R5cGVfX3Byb3RvLmdldCAgICAgICAgICA9IGdldFNldDtcbiAgICBtb21lbnRQcm90b3R5cGVfX3Byb3RvLmludmFsaWRBdCAgICA9IGludmFsaWRBdDtcbiAgICBtb21lbnRQcm90b3R5cGVfX3Byb3RvLmlzQWZ0ZXIgICAgICA9IGlzQWZ0ZXI7XG4gICAgbW9tZW50UHJvdG90eXBlX19wcm90by5pc0JlZm9yZSAgICAgPSBpc0JlZm9yZTtcbiAgICBtb21lbnRQcm90b3R5cGVfX3Byb3RvLmlzQmV0d2VlbiAgICA9IGlzQmV0d2VlbjtcbiAgICBtb21lbnRQcm90b3R5cGVfX3Byb3RvLmlzU2FtZSAgICAgICA9IGlzU2FtZTtcbiAgICBtb21lbnRQcm90b3R5cGVfX3Byb3RvLmlzVmFsaWQgICAgICA9IG1vbWVudF92YWxpZF9faXNWYWxpZDtcbiAgICBtb21lbnRQcm90b3R5cGVfX3Byb3RvLmxhbmcgICAgICAgICA9IGxhbmc7XG4gICAgbW9tZW50UHJvdG90eXBlX19wcm90by5sb2NhbGUgICAgICAgPSBsb2NhbGU7XG4gICAgbW9tZW50UHJvdG90eXBlX19wcm90by5sb2NhbGVEYXRhICAgPSBsb2NhbGVEYXRhO1xuICAgIG1vbWVudFByb3RvdHlwZV9fcHJvdG8ubWF4ICAgICAgICAgID0gcHJvdG90eXBlTWF4O1xuICAgIG1vbWVudFByb3RvdHlwZV9fcHJvdG8ubWluICAgICAgICAgID0gcHJvdG90eXBlTWluO1xuICAgIG1vbWVudFByb3RvdHlwZV9fcHJvdG8ucGFyc2luZ0ZsYWdzID0gcGFyc2luZ0ZsYWdzO1xuICAgIG1vbWVudFByb3RvdHlwZV9fcHJvdG8uc2V0ICAgICAgICAgID0gZ2V0U2V0O1xuICAgIG1vbWVudFByb3RvdHlwZV9fcHJvdG8uc3RhcnRPZiAgICAgID0gc3RhcnRPZjtcbiAgICBtb21lbnRQcm90b3R5cGVfX3Byb3RvLnN1YnRyYWN0ICAgICA9IGFkZF9zdWJ0cmFjdF9fc3VidHJhY3Q7XG4gICAgbW9tZW50UHJvdG90eXBlX19wcm90by50b0FycmF5ICAgICAgPSB0b0FycmF5O1xuICAgIG1vbWVudFByb3RvdHlwZV9fcHJvdG8udG9PYmplY3QgICAgID0gdG9PYmplY3Q7XG4gICAgbW9tZW50UHJvdG90eXBlX19wcm90by50b0RhdGUgICAgICAgPSB0b0RhdGU7XG4gICAgbW9tZW50UHJvdG90eXBlX19wcm90by50b0lTT1N0cmluZyAgPSBtb21lbnRfZm9ybWF0X190b0lTT1N0cmluZztcbiAgICBtb21lbnRQcm90b3R5cGVfX3Byb3RvLnRvSlNPTiAgICAgICA9IG1vbWVudF9mb3JtYXRfX3RvSVNPU3RyaW5nO1xuICAgIG1vbWVudFByb3RvdHlwZV9fcHJvdG8udG9TdHJpbmcgICAgID0gdG9TdHJpbmc7XG4gICAgbW9tZW50UHJvdG90eXBlX19wcm90by51bml4ICAgICAgICAgPSB1bml4O1xuICAgIG1vbWVudFByb3RvdHlwZV9fcHJvdG8udmFsdWVPZiAgICAgID0gdG9fdHlwZV9fdmFsdWVPZjtcblxuICAgIC8vIFllYXJcbiAgICBtb21lbnRQcm90b3R5cGVfX3Byb3RvLnllYXIgICAgICAgPSBnZXRTZXRZZWFyO1xuICAgIG1vbWVudFByb3RvdHlwZV9fcHJvdG8uaXNMZWFwWWVhciA9IGdldElzTGVhcFllYXI7XG5cbiAgICAvLyBXZWVrIFllYXJcbiAgICBtb21lbnRQcm90b3R5cGVfX3Byb3RvLndlZWtZZWFyICAgID0gZ2V0U2V0V2Vla1llYXI7XG4gICAgbW9tZW50UHJvdG90eXBlX19wcm90by5pc29XZWVrWWVhciA9IGdldFNldElTT1dlZWtZZWFyO1xuXG4gICAgLy8gUXVhcnRlclxuICAgIG1vbWVudFByb3RvdHlwZV9fcHJvdG8ucXVhcnRlciA9IG1vbWVudFByb3RvdHlwZV9fcHJvdG8ucXVhcnRlcnMgPSBnZXRTZXRRdWFydGVyO1xuXG4gICAgLy8gTW9udGhcbiAgICBtb21lbnRQcm90b3R5cGVfX3Byb3RvLm1vbnRoICAgICAgID0gZ2V0U2V0TW9udGg7XG4gICAgbW9tZW50UHJvdG90eXBlX19wcm90by5kYXlzSW5Nb250aCA9IGdldERheXNJbk1vbnRoO1xuXG4gICAgLy8gV2Vla1xuICAgIG1vbWVudFByb3RvdHlwZV9fcHJvdG8ud2VlayAgICAgICAgICAgPSBtb21lbnRQcm90b3R5cGVfX3Byb3RvLndlZWtzICAgICAgICA9IGdldFNldFdlZWs7XG4gICAgbW9tZW50UHJvdG90eXBlX19wcm90by5pc29XZWVrICAgICAgICA9IG1vbWVudFByb3RvdHlwZV9fcHJvdG8uaXNvV2Vla3MgICAgID0gZ2V0U2V0SVNPV2VlaztcbiAgICBtb21lbnRQcm90b3R5cGVfX3Byb3RvLndlZWtzSW5ZZWFyICAgID0gZ2V0V2Vla3NJblllYXI7XG4gICAgbW9tZW50UHJvdG90eXBlX19wcm90by5pc29XZWVrc0luWWVhciA9IGdldElTT1dlZWtzSW5ZZWFyO1xuXG4gICAgLy8gRGF5XG4gICAgbW9tZW50UHJvdG90eXBlX19wcm90by5kYXRlICAgICAgID0gZ2V0U2V0RGF5T2ZNb250aDtcbiAgICBtb21lbnRQcm90b3R5cGVfX3Byb3RvLmRheSAgICAgICAgPSBtb21lbnRQcm90b3R5cGVfX3Byb3RvLmRheXMgICAgICAgICAgICAgPSBnZXRTZXREYXlPZldlZWs7XG4gICAgbW9tZW50UHJvdG90eXBlX19wcm90by53ZWVrZGF5ICAgID0gZ2V0U2V0TG9jYWxlRGF5T2ZXZWVrO1xuICAgIG1vbWVudFByb3RvdHlwZV9fcHJvdG8uaXNvV2Vla2RheSA9IGdldFNldElTT0RheU9mV2VlaztcbiAgICBtb21lbnRQcm90b3R5cGVfX3Byb3RvLmRheU9mWWVhciAgPSBnZXRTZXREYXlPZlllYXI7XG5cbiAgICAvLyBIb3VyXG4gICAgbW9tZW50UHJvdG90eXBlX19wcm90by5ob3VyID0gbW9tZW50UHJvdG90eXBlX19wcm90by5ob3VycyA9IGdldFNldEhvdXI7XG5cbiAgICAvLyBNaW51dGVcbiAgICBtb21lbnRQcm90b3R5cGVfX3Byb3RvLm1pbnV0ZSA9IG1vbWVudFByb3RvdHlwZV9fcHJvdG8ubWludXRlcyA9IGdldFNldE1pbnV0ZTtcblxuICAgIC8vIFNlY29uZFxuICAgIG1vbWVudFByb3RvdHlwZV9fcHJvdG8uc2Vjb25kID0gbW9tZW50UHJvdG90eXBlX19wcm90by5zZWNvbmRzID0gZ2V0U2V0U2Vjb25kO1xuXG4gICAgLy8gTWlsbGlzZWNvbmRcbiAgICBtb21lbnRQcm90b3R5cGVfX3Byb3RvLm1pbGxpc2Vjb25kID0gbW9tZW50UHJvdG90eXBlX19wcm90by5taWxsaXNlY29uZHMgPSBnZXRTZXRNaWxsaXNlY29uZDtcblxuICAgIC8vIE9mZnNldFxuICAgIG1vbWVudFByb3RvdHlwZV9fcHJvdG8udXRjT2Zmc2V0ICAgICAgICAgICAgPSBnZXRTZXRPZmZzZXQ7XG4gICAgbW9tZW50UHJvdG90eXBlX19wcm90by51dGMgICAgICAgICAgICAgICAgICA9IHNldE9mZnNldFRvVVRDO1xuICAgIG1vbWVudFByb3RvdHlwZV9fcHJvdG8ubG9jYWwgICAgICAgICAgICAgICAgPSBzZXRPZmZzZXRUb0xvY2FsO1xuICAgIG1vbWVudFByb3RvdHlwZV9fcHJvdG8ucGFyc2Vab25lICAgICAgICAgICAgPSBzZXRPZmZzZXRUb1BhcnNlZE9mZnNldDtcbiAgICBtb21lbnRQcm90b3R5cGVfX3Byb3RvLmhhc0FsaWduZWRIb3VyT2Zmc2V0ID0gaGFzQWxpZ25lZEhvdXJPZmZzZXQ7XG4gICAgbW9tZW50UHJvdG90eXBlX19wcm90by5pc0RTVCAgICAgICAgICAgICAgICA9IGlzRGF5bGlnaHRTYXZpbmdUaW1lO1xuICAgIG1vbWVudFByb3RvdHlwZV9fcHJvdG8uaXNEU1RTaGlmdGVkICAgICAgICAgPSBpc0RheWxpZ2h0U2F2aW5nVGltZVNoaWZ0ZWQ7XG4gICAgbW9tZW50UHJvdG90eXBlX19wcm90by5pc0xvY2FsICAgICAgICAgICAgICA9IGlzTG9jYWw7XG4gICAgbW9tZW50UHJvdG90eXBlX19wcm90by5pc1V0Y09mZnNldCAgICAgICAgICA9IGlzVXRjT2Zmc2V0O1xuICAgIG1vbWVudFByb3RvdHlwZV9fcHJvdG8uaXNVdGMgICAgICAgICAgICAgICAgPSBpc1V0YztcbiAgICBtb21lbnRQcm90b3R5cGVfX3Byb3RvLmlzVVRDICAgICAgICAgICAgICAgID0gaXNVdGM7XG5cbiAgICAvLyBUaW1lem9uZVxuICAgIG1vbWVudFByb3RvdHlwZV9fcHJvdG8uem9uZUFiYnIgPSBnZXRab25lQWJicjtcbiAgICBtb21lbnRQcm90b3R5cGVfX3Byb3RvLnpvbmVOYW1lID0gZ2V0Wm9uZU5hbWU7XG5cbiAgICAvLyBEZXByZWNhdGlvbnNcbiAgICBtb21lbnRQcm90b3R5cGVfX3Byb3RvLmRhdGVzICA9IGRlcHJlY2F0ZSgnZGF0ZXMgYWNjZXNzb3IgaXMgZGVwcmVjYXRlZC4gVXNlIGRhdGUgaW5zdGVhZC4nLCBnZXRTZXREYXlPZk1vbnRoKTtcbiAgICBtb21lbnRQcm90b3R5cGVfX3Byb3RvLm1vbnRocyA9IGRlcHJlY2F0ZSgnbW9udGhzIGFjY2Vzc29yIGlzIGRlcHJlY2F0ZWQuIFVzZSBtb250aCBpbnN0ZWFkJywgZ2V0U2V0TW9udGgpO1xuICAgIG1vbWVudFByb3RvdHlwZV9fcHJvdG8ueWVhcnMgID0gZGVwcmVjYXRlKCd5ZWFycyBhY2Nlc3NvciBpcyBkZXByZWNhdGVkLiBVc2UgeWVhciBpbnN0ZWFkJywgZ2V0U2V0WWVhcik7XG4gICAgbW9tZW50UHJvdG90eXBlX19wcm90by56b25lICAgPSBkZXByZWNhdGUoJ21vbWVudCgpLnpvbmUgaXMgZGVwcmVjYXRlZCwgdXNlIG1vbWVudCgpLnV0Y09mZnNldCBpbnN0ZWFkLiBodHRwczovL2dpdGh1Yi5jb20vbW9tZW50L21vbWVudC9pc3N1ZXMvMTc3OScsIGdldFNldFpvbmUpO1xuXG4gICAgdmFyIG1vbWVudFByb3RvdHlwZSA9IG1vbWVudFByb3RvdHlwZV9fcHJvdG87XG5cbiAgICBmdW5jdGlvbiBtb21lbnRfX2NyZWF0ZVVuaXggKGlucHV0KSB7XG4gICAgICAgIHJldHVybiBsb2NhbF9fY3JlYXRlTG9jYWwoaW5wdXQgKiAxMDAwKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBtb21lbnRfX2NyZWF0ZUluWm9uZSAoKSB7XG4gICAgICAgIHJldHVybiBsb2NhbF9fY3JlYXRlTG9jYWwuYXBwbHkobnVsbCwgYXJndW1lbnRzKS5wYXJzZVpvbmUoKTtcbiAgICB9XG5cbiAgICB2YXIgZGVmYXVsdENhbGVuZGFyID0ge1xuICAgICAgICBzYW1lRGF5IDogJ1tUb2RheSBhdF0gTFQnLFxuICAgICAgICBuZXh0RGF5IDogJ1tUb21vcnJvdyBhdF0gTFQnLFxuICAgICAgICBuZXh0V2VlayA6ICdkZGRkIFthdF0gTFQnLFxuICAgICAgICBsYXN0RGF5IDogJ1tZZXN0ZXJkYXkgYXRdIExUJyxcbiAgICAgICAgbGFzdFdlZWsgOiAnW0xhc3RdIGRkZGQgW2F0XSBMVCcsXG4gICAgICAgIHNhbWVFbHNlIDogJ0wnXG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIGxvY2FsZV9jYWxlbmRhcl9fY2FsZW5kYXIgKGtleSwgbW9tLCBub3cpIHtcbiAgICAgICAgdmFyIG91dHB1dCA9IHRoaXMuX2NhbGVuZGFyW2tleV07XG4gICAgICAgIHJldHVybiB0eXBlb2Ygb3V0cHV0ID09PSAnZnVuY3Rpb24nID8gb3V0cHV0LmNhbGwobW9tLCBub3cpIDogb3V0cHV0O1xuICAgIH1cblxuICAgIHZhciBkZWZhdWx0TG9uZ0RhdGVGb3JtYXQgPSB7XG4gICAgICAgIExUUyAgOiAnaDptbTpzcyBBJyxcbiAgICAgICAgTFQgICA6ICdoOm1tIEEnLFxuICAgICAgICBMICAgIDogJ01NL0REL1lZWVknLFxuICAgICAgICBMTCAgIDogJ01NTU0gRCwgWVlZWScsXG4gICAgICAgIExMTCAgOiAnTU1NTSBELCBZWVlZIGg6bW0gQScsXG4gICAgICAgIExMTEwgOiAnZGRkZCwgTU1NTSBELCBZWVlZIGg6bW0gQSdcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gbG9uZ0RhdGVGb3JtYXQgKGtleSkge1xuICAgICAgICB2YXIgZm9ybWF0ID0gdGhpcy5fbG9uZ0RhdGVGb3JtYXRba2V5XSxcbiAgICAgICAgICAgIGZvcm1hdFVwcGVyID0gdGhpcy5fbG9uZ0RhdGVGb3JtYXRba2V5LnRvVXBwZXJDYXNlKCldO1xuXG4gICAgICAgIGlmIChmb3JtYXQgfHwgIWZvcm1hdFVwcGVyKSB7XG4gICAgICAgICAgICByZXR1cm4gZm9ybWF0O1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5fbG9uZ0RhdGVGb3JtYXRba2V5XSA9IGZvcm1hdFVwcGVyLnJlcGxhY2UoL01NTU18TU18RER8ZGRkZC9nLCBmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgICAgICByZXR1cm4gdmFsLnNsaWNlKDEpO1xuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gdGhpcy5fbG9uZ0RhdGVGb3JtYXRba2V5XTtcbiAgICB9XG5cbiAgICB2YXIgZGVmYXVsdEludmFsaWREYXRlID0gJ0ludmFsaWQgZGF0ZSc7XG5cbiAgICBmdW5jdGlvbiBpbnZhbGlkRGF0ZSAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9pbnZhbGlkRGF0ZTtcbiAgICB9XG5cbiAgICB2YXIgZGVmYXVsdE9yZGluYWwgPSAnJWQnO1xuICAgIHZhciBkZWZhdWx0T3JkaW5hbFBhcnNlID0gL1xcZHsxLDJ9LztcblxuICAgIGZ1bmN0aW9uIG9yZGluYWwgKG51bWJlcikge1xuICAgICAgICByZXR1cm4gdGhpcy5fb3JkaW5hbC5yZXBsYWNlKCclZCcsIG51bWJlcik7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcHJlUGFyc2VQb3N0Rm9ybWF0IChzdHJpbmcpIHtcbiAgICAgICAgcmV0dXJuIHN0cmluZztcbiAgICB9XG5cbiAgICB2YXIgZGVmYXVsdFJlbGF0aXZlVGltZSA9IHtcbiAgICAgICAgZnV0dXJlIDogJ2luICVzJyxcbiAgICAgICAgcGFzdCAgIDogJyVzIGFnbycsXG4gICAgICAgIHMgIDogJ2EgZmV3IHNlY29uZHMnLFxuICAgICAgICBtICA6ICdhIG1pbnV0ZScsXG4gICAgICAgIG1tIDogJyVkIG1pbnV0ZXMnLFxuICAgICAgICBoICA6ICdhbiBob3VyJyxcbiAgICAgICAgaGggOiAnJWQgaG91cnMnLFxuICAgICAgICBkICA6ICdhIGRheScsXG4gICAgICAgIGRkIDogJyVkIGRheXMnLFxuICAgICAgICBNICA6ICdhIG1vbnRoJyxcbiAgICAgICAgTU0gOiAnJWQgbW9udGhzJyxcbiAgICAgICAgeSAgOiAnYSB5ZWFyJyxcbiAgICAgICAgeXkgOiAnJWQgeWVhcnMnXG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIHJlbGF0aXZlX19yZWxhdGl2ZVRpbWUgKG51bWJlciwgd2l0aG91dFN1ZmZpeCwgc3RyaW5nLCBpc0Z1dHVyZSkge1xuICAgICAgICB2YXIgb3V0cHV0ID0gdGhpcy5fcmVsYXRpdmVUaW1lW3N0cmluZ107XG4gICAgICAgIHJldHVybiAodHlwZW9mIG91dHB1dCA9PT0gJ2Z1bmN0aW9uJykgP1xuICAgICAgICAgICAgb3V0cHV0KG51bWJlciwgd2l0aG91dFN1ZmZpeCwgc3RyaW5nLCBpc0Z1dHVyZSkgOlxuICAgICAgICAgICAgb3V0cHV0LnJlcGxhY2UoLyVkL2ksIG51bWJlcik7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFzdEZ1dHVyZSAoZGlmZiwgb3V0cHV0KSB7XG4gICAgICAgIHZhciBmb3JtYXQgPSB0aGlzLl9yZWxhdGl2ZVRpbWVbZGlmZiA+IDAgPyAnZnV0dXJlJyA6ICdwYXN0J107XG4gICAgICAgIHJldHVybiB0eXBlb2YgZm9ybWF0ID09PSAnZnVuY3Rpb24nID8gZm9ybWF0KG91dHB1dCkgOiBmb3JtYXQucmVwbGFjZSgvJXMvaSwgb3V0cHV0KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBsb2NhbGVfc2V0X19zZXQgKGNvbmZpZykge1xuICAgICAgICB2YXIgcHJvcCwgaTtcbiAgICAgICAgZm9yIChpIGluIGNvbmZpZykge1xuICAgICAgICAgICAgcHJvcCA9IGNvbmZpZ1tpXTtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgcHJvcCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgIHRoaXNbaV0gPSBwcm9wO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzWydfJyArIGldID0gcHJvcDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBMZW5pZW50IG9yZGluYWwgcGFyc2luZyBhY2NlcHRzIGp1c3QgYSBudW1iZXIgaW4gYWRkaXRpb24gdG9cbiAgICAgICAgLy8gbnVtYmVyICsgKHBvc3NpYmx5KSBzdHVmZiBjb21pbmcgZnJvbSBfb3JkaW5hbFBhcnNlTGVuaWVudC5cbiAgICAgICAgdGhpcy5fb3JkaW5hbFBhcnNlTGVuaWVudCA9IG5ldyBSZWdFeHAodGhpcy5fb3JkaW5hbFBhcnNlLnNvdXJjZSArICd8JyArICgvXFxkezEsMn0vKS5zb3VyY2UpO1xuICAgIH1cblxuICAgIHZhciBwcm90b3R5cGVfX3Byb3RvID0gTG9jYWxlLnByb3RvdHlwZTtcblxuICAgIHByb3RvdHlwZV9fcHJvdG8uX2NhbGVuZGFyICAgICAgID0gZGVmYXVsdENhbGVuZGFyO1xuICAgIHByb3RvdHlwZV9fcHJvdG8uY2FsZW5kYXIgICAgICAgID0gbG9jYWxlX2NhbGVuZGFyX19jYWxlbmRhcjtcbiAgICBwcm90b3R5cGVfX3Byb3RvLl9sb25nRGF0ZUZvcm1hdCA9IGRlZmF1bHRMb25nRGF0ZUZvcm1hdDtcbiAgICBwcm90b3R5cGVfX3Byb3RvLmxvbmdEYXRlRm9ybWF0ICA9IGxvbmdEYXRlRm9ybWF0O1xuICAgIHByb3RvdHlwZV9fcHJvdG8uX2ludmFsaWREYXRlICAgID0gZGVmYXVsdEludmFsaWREYXRlO1xuICAgIHByb3RvdHlwZV9fcHJvdG8uaW52YWxpZERhdGUgICAgID0gaW52YWxpZERhdGU7XG4gICAgcHJvdG90eXBlX19wcm90by5fb3JkaW5hbCAgICAgICAgPSBkZWZhdWx0T3JkaW5hbDtcbiAgICBwcm90b3R5cGVfX3Byb3RvLm9yZGluYWwgICAgICAgICA9IG9yZGluYWw7XG4gICAgcHJvdG90eXBlX19wcm90by5fb3JkaW5hbFBhcnNlICAgPSBkZWZhdWx0T3JkaW5hbFBhcnNlO1xuICAgIHByb3RvdHlwZV9fcHJvdG8ucHJlcGFyc2UgICAgICAgID0gcHJlUGFyc2VQb3N0Rm9ybWF0O1xuICAgIHByb3RvdHlwZV9fcHJvdG8ucG9zdGZvcm1hdCAgICAgID0gcHJlUGFyc2VQb3N0Rm9ybWF0O1xuICAgIHByb3RvdHlwZV9fcHJvdG8uX3JlbGF0aXZlVGltZSAgID0gZGVmYXVsdFJlbGF0aXZlVGltZTtcbiAgICBwcm90b3R5cGVfX3Byb3RvLnJlbGF0aXZlVGltZSAgICA9IHJlbGF0aXZlX19yZWxhdGl2ZVRpbWU7XG4gICAgcHJvdG90eXBlX19wcm90by5wYXN0RnV0dXJlICAgICAgPSBwYXN0RnV0dXJlO1xuICAgIHByb3RvdHlwZV9fcHJvdG8uc2V0ICAgICAgICAgICAgID0gbG9jYWxlX3NldF9fc2V0O1xuXG4gICAgLy8gTW9udGhcbiAgICBwcm90b3R5cGVfX3Byb3RvLm1vbnRocyAgICAgICA9ICAgICAgICBsb2NhbGVNb250aHM7XG4gICAgcHJvdG90eXBlX19wcm90by5fbW9udGhzICAgICAgPSBkZWZhdWx0TG9jYWxlTW9udGhzO1xuICAgIHByb3RvdHlwZV9fcHJvdG8ubW9udGhzU2hvcnQgID0gICAgICAgIGxvY2FsZU1vbnRoc1Nob3J0O1xuICAgIHByb3RvdHlwZV9fcHJvdG8uX21vbnRoc1Nob3J0ID0gZGVmYXVsdExvY2FsZU1vbnRoc1Nob3J0O1xuICAgIHByb3RvdHlwZV9fcHJvdG8ubW9udGhzUGFyc2UgID0gICAgICAgIGxvY2FsZU1vbnRoc1BhcnNlO1xuXG4gICAgLy8gV2Vla1xuICAgIHByb3RvdHlwZV9fcHJvdG8ud2VlayA9IGxvY2FsZVdlZWs7XG4gICAgcHJvdG90eXBlX19wcm90by5fd2VlayA9IGRlZmF1bHRMb2NhbGVXZWVrO1xuICAgIHByb3RvdHlwZV9fcHJvdG8uZmlyc3REYXlPZlllYXIgPSBsb2NhbGVGaXJzdERheU9mWWVhcjtcbiAgICBwcm90b3R5cGVfX3Byb3RvLmZpcnN0RGF5T2ZXZWVrID0gbG9jYWxlRmlyc3REYXlPZldlZWs7XG5cbiAgICAvLyBEYXkgb2YgV2Vla1xuICAgIHByb3RvdHlwZV9fcHJvdG8ud2Vla2RheXMgICAgICAgPSAgICAgICAgbG9jYWxlV2Vla2RheXM7XG4gICAgcHJvdG90eXBlX19wcm90by5fd2Vla2RheXMgICAgICA9IGRlZmF1bHRMb2NhbGVXZWVrZGF5cztcbiAgICBwcm90b3R5cGVfX3Byb3RvLndlZWtkYXlzTWluICAgID0gICAgICAgIGxvY2FsZVdlZWtkYXlzTWluO1xuICAgIHByb3RvdHlwZV9fcHJvdG8uX3dlZWtkYXlzTWluICAgPSBkZWZhdWx0TG9jYWxlV2Vla2RheXNNaW47XG4gICAgcHJvdG90eXBlX19wcm90by53ZWVrZGF5c1Nob3J0ICA9ICAgICAgICBsb2NhbGVXZWVrZGF5c1Nob3J0O1xuICAgIHByb3RvdHlwZV9fcHJvdG8uX3dlZWtkYXlzU2hvcnQgPSBkZWZhdWx0TG9jYWxlV2Vla2RheXNTaG9ydDtcbiAgICBwcm90b3R5cGVfX3Byb3RvLndlZWtkYXlzUGFyc2UgID0gICAgICAgIGxvY2FsZVdlZWtkYXlzUGFyc2U7XG5cbiAgICAvLyBIb3Vyc1xuICAgIHByb3RvdHlwZV9fcHJvdG8uaXNQTSA9IGxvY2FsZUlzUE07XG4gICAgcHJvdG90eXBlX19wcm90by5fbWVyaWRpZW1QYXJzZSA9IGRlZmF1bHRMb2NhbGVNZXJpZGllbVBhcnNlO1xuICAgIHByb3RvdHlwZV9fcHJvdG8ubWVyaWRpZW0gPSBsb2NhbGVNZXJpZGllbTtcblxuICAgIGZ1bmN0aW9uIGxpc3RzX19nZXQgKGZvcm1hdCwgaW5kZXgsIGZpZWxkLCBzZXR0ZXIpIHtcbiAgICAgICAgdmFyIGxvY2FsZSA9IGxvY2FsZV9sb2NhbGVzX19nZXRMb2NhbGUoKTtcbiAgICAgICAgdmFyIHV0YyA9IGNyZWF0ZV91dGNfX2NyZWF0ZVVUQygpLnNldChzZXR0ZXIsIGluZGV4KTtcbiAgICAgICAgcmV0dXJuIGxvY2FsZVtmaWVsZF0odXRjLCBmb3JtYXQpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGxpc3QgKGZvcm1hdCwgaW5kZXgsIGZpZWxkLCBjb3VudCwgc2V0dGVyKSB7XG4gICAgICAgIGlmICh0eXBlb2YgZm9ybWF0ID09PSAnbnVtYmVyJykge1xuICAgICAgICAgICAgaW5kZXggPSBmb3JtYXQ7XG4gICAgICAgICAgICBmb3JtYXQgPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cblxuICAgICAgICBmb3JtYXQgPSBmb3JtYXQgfHwgJyc7XG5cbiAgICAgICAgaWYgKGluZGV4ICE9IG51bGwpIHtcbiAgICAgICAgICAgIHJldHVybiBsaXN0c19fZ2V0KGZvcm1hdCwgaW5kZXgsIGZpZWxkLCBzZXR0ZXIpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGk7XG4gICAgICAgIHZhciBvdXQgPSBbXTtcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGNvdW50OyBpKyspIHtcbiAgICAgICAgICAgIG91dFtpXSA9IGxpc3RzX19nZXQoZm9ybWF0LCBpLCBmaWVsZCwgc2V0dGVyKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gb3V0O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGxpc3RzX19saXN0TW9udGhzIChmb3JtYXQsIGluZGV4KSB7XG4gICAgICAgIHJldHVybiBsaXN0KGZvcm1hdCwgaW5kZXgsICdtb250aHMnLCAxMiwgJ21vbnRoJyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbGlzdHNfX2xpc3RNb250aHNTaG9ydCAoZm9ybWF0LCBpbmRleCkge1xuICAgICAgICByZXR1cm4gbGlzdChmb3JtYXQsIGluZGV4LCAnbW9udGhzU2hvcnQnLCAxMiwgJ21vbnRoJyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbGlzdHNfX2xpc3RXZWVrZGF5cyAoZm9ybWF0LCBpbmRleCkge1xuICAgICAgICByZXR1cm4gbGlzdChmb3JtYXQsIGluZGV4LCAnd2Vla2RheXMnLCA3LCAnZGF5Jyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbGlzdHNfX2xpc3RXZWVrZGF5c1Nob3J0IChmb3JtYXQsIGluZGV4KSB7XG4gICAgICAgIHJldHVybiBsaXN0KGZvcm1hdCwgaW5kZXgsICd3ZWVrZGF5c1Nob3J0JywgNywgJ2RheScpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGxpc3RzX19saXN0V2Vla2RheXNNaW4gKGZvcm1hdCwgaW5kZXgpIHtcbiAgICAgICAgcmV0dXJuIGxpc3QoZm9ybWF0LCBpbmRleCwgJ3dlZWtkYXlzTWluJywgNywgJ2RheScpO1xuICAgIH1cblxuICAgIGxvY2FsZV9sb2NhbGVzX19nZXRTZXRHbG9iYWxMb2NhbGUoJ2VuJywge1xuICAgICAgICBvcmRpbmFsUGFyc2U6IC9cXGR7MSwyfSh0aHxzdHxuZHxyZCkvLFxuICAgICAgICBvcmRpbmFsIDogZnVuY3Rpb24gKG51bWJlcikge1xuICAgICAgICAgICAgdmFyIGIgPSBudW1iZXIgJSAxMCxcbiAgICAgICAgICAgICAgICBvdXRwdXQgPSAodG9JbnQobnVtYmVyICUgMTAwIC8gMTApID09PSAxKSA/ICd0aCcgOlxuICAgICAgICAgICAgICAgIChiID09PSAxKSA/ICdzdCcgOlxuICAgICAgICAgICAgICAgIChiID09PSAyKSA/ICduZCcgOlxuICAgICAgICAgICAgICAgIChiID09PSAzKSA/ICdyZCcgOiAndGgnO1xuICAgICAgICAgICAgcmV0dXJuIG51bWJlciArIG91dHB1dDtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gU2lkZSBlZmZlY3QgaW1wb3J0c1xuICAgIHV0aWxzX2hvb2tzX19ob29rcy5sYW5nID0gZGVwcmVjYXRlKCdtb21lbnQubGFuZyBpcyBkZXByZWNhdGVkLiBVc2UgbW9tZW50LmxvY2FsZSBpbnN0ZWFkLicsIGxvY2FsZV9sb2NhbGVzX19nZXRTZXRHbG9iYWxMb2NhbGUpO1xuICAgIHV0aWxzX2hvb2tzX19ob29rcy5sYW5nRGF0YSA9IGRlcHJlY2F0ZSgnbW9tZW50LmxhbmdEYXRhIGlzIGRlcHJlY2F0ZWQuIFVzZSBtb21lbnQubG9jYWxlRGF0YSBpbnN0ZWFkLicsIGxvY2FsZV9sb2NhbGVzX19nZXRMb2NhbGUpO1xuXG4gICAgdmFyIG1hdGhBYnMgPSBNYXRoLmFicztcblxuICAgIGZ1bmN0aW9uIGR1cmF0aW9uX2Fic19fYWJzICgpIHtcbiAgICAgICAgdmFyIGRhdGEgICAgICAgICAgID0gdGhpcy5fZGF0YTtcblxuICAgICAgICB0aGlzLl9taWxsaXNlY29uZHMgPSBtYXRoQWJzKHRoaXMuX21pbGxpc2Vjb25kcyk7XG4gICAgICAgIHRoaXMuX2RheXMgICAgICAgICA9IG1hdGhBYnModGhpcy5fZGF5cyk7XG4gICAgICAgIHRoaXMuX21vbnRocyAgICAgICA9IG1hdGhBYnModGhpcy5fbW9udGhzKTtcblxuICAgICAgICBkYXRhLm1pbGxpc2Vjb25kcyAgPSBtYXRoQWJzKGRhdGEubWlsbGlzZWNvbmRzKTtcbiAgICAgICAgZGF0YS5zZWNvbmRzICAgICAgID0gbWF0aEFicyhkYXRhLnNlY29uZHMpO1xuICAgICAgICBkYXRhLm1pbnV0ZXMgICAgICAgPSBtYXRoQWJzKGRhdGEubWludXRlcyk7XG4gICAgICAgIGRhdGEuaG91cnMgICAgICAgICA9IG1hdGhBYnMoZGF0YS5ob3Vycyk7XG4gICAgICAgIGRhdGEubW9udGhzICAgICAgICA9IG1hdGhBYnMoZGF0YS5tb250aHMpO1xuICAgICAgICBkYXRhLnllYXJzICAgICAgICAgPSBtYXRoQWJzKGRhdGEueWVhcnMpO1xuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGR1cmF0aW9uX2FkZF9zdWJ0cmFjdF9fYWRkU3VidHJhY3QgKGR1cmF0aW9uLCBpbnB1dCwgdmFsdWUsIGRpcmVjdGlvbikge1xuICAgICAgICB2YXIgb3RoZXIgPSBjcmVhdGVfX2NyZWF0ZUR1cmF0aW9uKGlucHV0LCB2YWx1ZSk7XG5cbiAgICAgICAgZHVyYXRpb24uX21pbGxpc2Vjb25kcyArPSBkaXJlY3Rpb24gKiBvdGhlci5fbWlsbGlzZWNvbmRzO1xuICAgICAgICBkdXJhdGlvbi5fZGF5cyAgICAgICAgICs9IGRpcmVjdGlvbiAqIG90aGVyLl9kYXlzO1xuICAgICAgICBkdXJhdGlvbi5fbW9udGhzICAgICAgICs9IGRpcmVjdGlvbiAqIG90aGVyLl9tb250aHM7XG5cbiAgICAgICAgcmV0dXJuIGR1cmF0aW9uLl9idWJibGUoKTtcbiAgICB9XG5cbiAgICAvLyBzdXBwb3J0cyBvbmx5IDIuMC1zdHlsZSBhZGQoMSwgJ3MnKSBvciBhZGQoZHVyYXRpb24pXG4gICAgZnVuY3Rpb24gZHVyYXRpb25fYWRkX3N1YnRyYWN0X19hZGQgKGlucHV0LCB2YWx1ZSkge1xuICAgICAgICByZXR1cm4gZHVyYXRpb25fYWRkX3N1YnRyYWN0X19hZGRTdWJ0cmFjdCh0aGlzLCBpbnB1dCwgdmFsdWUsIDEpO1xuICAgIH1cblxuICAgIC8vIHN1cHBvcnRzIG9ubHkgMi4wLXN0eWxlIHN1YnRyYWN0KDEsICdzJykgb3Igc3VidHJhY3QoZHVyYXRpb24pXG4gICAgZnVuY3Rpb24gZHVyYXRpb25fYWRkX3N1YnRyYWN0X19zdWJ0cmFjdCAoaW5wdXQsIHZhbHVlKSB7XG4gICAgICAgIHJldHVybiBkdXJhdGlvbl9hZGRfc3VidHJhY3RfX2FkZFN1YnRyYWN0KHRoaXMsIGlucHV0LCB2YWx1ZSwgLTEpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGFic0NlaWwgKG51bWJlcikge1xuICAgICAgICBpZiAobnVtYmVyIDwgMCkge1xuICAgICAgICAgICAgcmV0dXJuIE1hdGguZmxvb3IobnVtYmVyKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBNYXRoLmNlaWwobnVtYmVyKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGJ1YmJsZSAoKSB7XG4gICAgICAgIHZhciBtaWxsaXNlY29uZHMgPSB0aGlzLl9taWxsaXNlY29uZHM7XG4gICAgICAgIHZhciBkYXlzICAgICAgICAgPSB0aGlzLl9kYXlzO1xuICAgICAgICB2YXIgbW9udGhzICAgICAgID0gdGhpcy5fbW9udGhzO1xuICAgICAgICB2YXIgZGF0YSAgICAgICAgID0gdGhpcy5fZGF0YTtcbiAgICAgICAgdmFyIHNlY29uZHMsIG1pbnV0ZXMsIGhvdXJzLCB5ZWFycywgbW9udGhzRnJvbURheXM7XG5cbiAgICAgICAgLy8gaWYgd2UgaGF2ZSBhIG1peCBvZiBwb3NpdGl2ZSBhbmQgbmVnYXRpdmUgdmFsdWVzLCBidWJibGUgZG93biBmaXJzdFxuICAgICAgICAvLyBjaGVjazogaHR0cHM6Ly9naXRodWIuY29tL21vbWVudC9tb21lbnQvaXNzdWVzLzIxNjZcbiAgICAgICAgaWYgKCEoKG1pbGxpc2Vjb25kcyA+PSAwICYmIGRheXMgPj0gMCAmJiBtb250aHMgPj0gMCkgfHxcbiAgICAgICAgICAgICAgICAobWlsbGlzZWNvbmRzIDw9IDAgJiYgZGF5cyA8PSAwICYmIG1vbnRocyA8PSAwKSkpIHtcbiAgICAgICAgICAgIG1pbGxpc2Vjb25kcyArPSBhYnNDZWlsKG1vbnRoc1RvRGF5cyhtb250aHMpICsgZGF5cykgKiA4NjRlNTtcbiAgICAgICAgICAgIGRheXMgPSAwO1xuICAgICAgICAgICAgbW9udGhzID0gMDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRoZSBmb2xsb3dpbmcgY29kZSBidWJibGVzIHVwIHZhbHVlcywgc2VlIHRoZSB0ZXN0cyBmb3JcbiAgICAgICAgLy8gZXhhbXBsZXMgb2Ygd2hhdCB0aGF0IG1lYW5zLlxuICAgICAgICBkYXRhLm1pbGxpc2Vjb25kcyA9IG1pbGxpc2Vjb25kcyAlIDEwMDA7XG5cbiAgICAgICAgc2Vjb25kcyAgICAgICAgICAgPSBhYnNGbG9vcihtaWxsaXNlY29uZHMgLyAxMDAwKTtcbiAgICAgICAgZGF0YS5zZWNvbmRzICAgICAgPSBzZWNvbmRzICUgNjA7XG5cbiAgICAgICAgbWludXRlcyAgICAgICAgICAgPSBhYnNGbG9vcihzZWNvbmRzIC8gNjApO1xuICAgICAgICBkYXRhLm1pbnV0ZXMgICAgICA9IG1pbnV0ZXMgJSA2MDtcblxuICAgICAgICBob3VycyAgICAgICAgICAgICA9IGFic0Zsb29yKG1pbnV0ZXMgLyA2MCk7XG4gICAgICAgIGRhdGEuaG91cnMgICAgICAgID0gaG91cnMgJSAyNDtcblxuICAgICAgICBkYXlzICs9IGFic0Zsb29yKGhvdXJzIC8gMjQpO1xuXG4gICAgICAgIC8vIGNvbnZlcnQgZGF5cyB0byBtb250aHNcbiAgICAgICAgbW9udGhzRnJvbURheXMgPSBhYnNGbG9vcihkYXlzVG9Nb250aHMoZGF5cykpO1xuICAgICAgICBtb250aHMgKz0gbW9udGhzRnJvbURheXM7XG4gICAgICAgIGRheXMgLT0gYWJzQ2VpbChtb250aHNUb0RheXMobW9udGhzRnJvbURheXMpKTtcblxuICAgICAgICAvLyAxMiBtb250aHMgLT4gMSB5ZWFyXG4gICAgICAgIHllYXJzID0gYWJzRmxvb3IobW9udGhzIC8gMTIpO1xuICAgICAgICBtb250aHMgJT0gMTI7XG5cbiAgICAgICAgZGF0YS5kYXlzICAgPSBkYXlzO1xuICAgICAgICBkYXRhLm1vbnRocyA9IG1vbnRocztcbiAgICAgICAgZGF0YS55ZWFycyAgPSB5ZWFycztcblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkYXlzVG9Nb250aHMgKGRheXMpIHtcbiAgICAgICAgLy8gNDAwIHllYXJzIGhhdmUgMTQ2MDk3IGRheXMgKHRha2luZyBpbnRvIGFjY291bnQgbGVhcCB5ZWFyIHJ1bGVzKVxuICAgICAgICAvLyA0MDAgeWVhcnMgaGF2ZSAxMiBtb250aHMgPT09IDQ4MDBcbiAgICAgICAgcmV0dXJuIGRheXMgKiA0ODAwIC8gMTQ2MDk3O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG1vbnRoc1RvRGF5cyAobW9udGhzKSB7XG4gICAgICAgIC8vIHRoZSByZXZlcnNlIG9mIGRheXNUb01vbnRoc1xuICAgICAgICByZXR1cm4gbW9udGhzICogMTQ2MDk3IC8gNDgwMDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBhcyAodW5pdHMpIHtcbiAgICAgICAgdmFyIGRheXM7XG4gICAgICAgIHZhciBtb250aHM7XG4gICAgICAgIHZhciBtaWxsaXNlY29uZHMgPSB0aGlzLl9taWxsaXNlY29uZHM7XG5cbiAgICAgICAgdW5pdHMgPSBub3JtYWxpemVVbml0cyh1bml0cyk7XG5cbiAgICAgICAgaWYgKHVuaXRzID09PSAnbW9udGgnIHx8IHVuaXRzID09PSAneWVhcicpIHtcbiAgICAgICAgICAgIGRheXMgICA9IHRoaXMuX2RheXMgICArIG1pbGxpc2Vjb25kcyAvIDg2NGU1O1xuICAgICAgICAgICAgbW9udGhzID0gdGhpcy5fbW9udGhzICsgZGF5c1RvTW9udGhzKGRheXMpO1xuICAgICAgICAgICAgcmV0dXJuIHVuaXRzID09PSAnbW9udGgnID8gbW9udGhzIDogbW9udGhzIC8gMTI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBoYW5kbGUgbWlsbGlzZWNvbmRzIHNlcGFyYXRlbHkgYmVjYXVzZSBvZiBmbG9hdGluZyBwb2ludCBtYXRoIGVycm9ycyAoaXNzdWUgIzE4NjcpXG4gICAgICAgICAgICBkYXlzID0gdGhpcy5fZGF5cyArIE1hdGgucm91bmQobW9udGhzVG9EYXlzKHRoaXMuX21vbnRocykpO1xuICAgICAgICAgICAgc3dpdGNoICh1bml0cykge1xuICAgICAgICAgICAgICAgIGNhc2UgJ3dlZWsnICAgOiByZXR1cm4gZGF5cyAvIDcgICAgICsgbWlsbGlzZWNvbmRzIC8gNjA0OGU1O1xuICAgICAgICAgICAgICAgIGNhc2UgJ2RheScgICAgOiByZXR1cm4gZGF5cyAgICAgICAgICsgbWlsbGlzZWNvbmRzIC8gODY0ZTU7XG4gICAgICAgICAgICAgICAgY2FzZSAnaG91cicgICA6IHJldHVybiBkYXlzICogMjQgICAgKyBtaWxsaXNlY29uZHMgLyAzNmU1O1xuICAgICAgICAgICAgICAgIGNhc2UgJ21pbnV0ZScgOiByZXR1cm4gZGF5cyAqIDE0NDAgICsgbWlsbGlzZWNvbmRzIC8gNmU0O1xuICAgICAgICAgICAgICAgIGNhc2UgJ3NlY29uZCcgOiByZXR1cm4gZGF5cyAqIDg2NDAwICsgbWlsbGlzZWNvbmRzIC8gMTAwMDtcbiAgICAgICAgICAgICAgICAvLyBNYXRoLmZsb29yIHByZXZlbnRzIGZsb2F0aW5nIHBvaW50IG1hdGggZXJyb3JzIGhlcmVcbiAgICAgICAgICAgICAgICBjYXNlICdtaWxsaXNlY29uZCc6IHJldHVybiBNYXRoLmZsb29yKGRheXMgKiA4NjRlNSkgKyBtaWxsaXNlY29uZHM7XG4gICAgICAgICAgICAgICAgZGVmYXVsdDogdGhyb3cgbmV3IEVycm9yKCdVbmtub3duIHVuaXQgJyArIHVuaXRzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIFRPRE86IFVzZSB0aGlzLmFzKCdtcycpP1xuICAgIGZ1bmN0aW9uIGR1cmF0aW9uX2FzX192YWx1ZU9mICgpIHtcbiAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgIHRoaXMuX21pbGxpc2Vjb25kcyArXG4gICAgICAgICAgICB0aGlzLl9kYXlzICogODY0ZTUgK1xuICAgICAgICAgICAgKHRoaXMuX21vbnRocyAlIDEyKSAqIDI1OTJlNiArXG4gICAgICAgICAgICB0b0ludCh0aGlzLl9tb250aHMgLyAxMikgKiAzMTUzNmU2XG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbWFrZUFzIChhbGlhcykge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuYXMoYWxpYXMpO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIHZhciBhc01pbGxpc2Vjb25kcyA9IG1ha2VBcygnbXMnKTtcbiAgICB2YXIgYXNTZWNvbmRzICAgICAgPSBtYWtlQXMoJ3MnKTtcbiAgICB2YXIgYXNNaW51dGVzICAgICAgPSBtYWtlQXMoJ20nKTtcbiAgICB2YXIgYXNIb3VycyAgICAgICAgPSBtYWtlQXMoJ2gnKTtcbiAgICB2YXIgYXNEYXlzICAgICAgICAgPSBtYWtlQXMoJ2QnKTtcbiAgICB2YXIgYXNXZWVrcyAgICAgICAgPSBtYWtlQXMoJ3cnKTtcbiAgICB2YXIgYXNNb250aHMgICAgICAgPSBtYWtlQXMoJ00nKTtcbiAgICB2YXIgYXNZZWFycyAgICAgICAgPSBtYWtlQXMoJ3knKTtcblxuICAgIGZ1bmN0aW9uIGR1cmF0aW9uX2dldF9fZ2V0ICh1bml0cykge1xuICAgICAgICB1bml0cyA9IG5vcm1hbGl6ZVVuaXRzKHVuaXRzKTtcbiAgICAgICAgcmV0dXJuIHRoaXNbdW5pdHMgKyAncyddKCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbWFrZUdldHRlcihuYW1lKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fZGF0YVtuYW1lXTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICB2YXIgbWlsbGlzZWNvbmRzID0gbWFrZUdldHRlcignbWlsbGlzZWNvbmRzJyk7XG4gICAgdmFyIHNlY29uZHMgICAgICA9IG1ha2VHZXR0ZXIoJ3NlY29uZHMnKTtcbiAgICB2YXIgbWludXRlcyAgICAgID0gbWFrZUdldHRlcignbWludXRlcycpO1xuICAgIHZhciBob3VycyAgICAgICAgPSBtYWtlR2V0dGVyKCdob3VycycpO1xuICAgIHZhciBkYXlzICAgICAgICAgPSBtYWtlR2V0dGVyKCdkYXlzJyk7XG4gICAgdmFyIG1vbnRocyAgICAgICA9IG1ha2VHZXR0ZXIoJ21vbnRocycpO1xuICAgIHZhciB5ZWFycyAgICAgICAgPSBtYWtlR2V0dGVyKCd5ZWFycycpO1xuXG4gICAgZnVuY3Rpb24gd2Vla3MgKCkge1xuICAgICAgICByZXR1cm4gYWJzRmxvb3IodGhpcy5kYXlzKCkgLyA3KTtcbiAgICB9XG5cbiAgICB2YXIgcm91bmQgPSBNYXRoLnJvdW5kO1xuICAgIHZhciB0aHJlc2hvbGRzID0ge1xuICAgICAgICBzOiA0NSwgIC8vIHNlY29uZHMgdG8gbWludXRlXG4gICAgICAgIG06IDQ1LCAgLy8gbWludXRlcyB0byBob3VyXG4gICAgICAgIGg6IDIyLCAgLy8gaG91cnMgdG8gZGF5XG4gICAgICAgIGQ6IDI2LCAgLy8gZGF5cyB0byBtb250aFxuICAgICAgICBNOiAxMSAgIC8vIG1vbnRocyB0byB5ZWFyXG4gICAgfTtcblxuICAgIC8vIGhlbHBlciBmdW5jdGlvbiBmb3IgbW9tZW50LmZuLmZyb20sIG1vbWVudC5mbi5mcm9tTm93LCBhbmQgbW9tZW50LmR1cmF0aW9uLmZuLmh1bWFuaXplXG4gICAgZnVuY3Rpb24gc3Vic3RpdHV0ZVRpbWVBZ28oc3RyaW5nLCBudW1iZXIsIHdpdGhvdXRTdWZmaXgsIGlzRnV0dXJlLCBsb2NhbGUpIHtcbiAgICAgICAgcmV0dXJuIGxvY2FsZS5yZWxhdGl2ZVRpbWUobnVtYmVyIHx8IDEsICEhd2l0aG91dFN1ZmZpeCwgc3RyaW5nLCBpc0Z1dHVyZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZHVyYXRpb25faHVtYW5pemVfX3JlbGF0aXZlVGltZSAocG9zTmVnRHVyYXRpb24sIHdpdGhvdXRTdWZmaXgsIGxvY2FsZSkge1xuICAgICAgICB2YXIgZHVyYXRpb24gPSBjcmVhdGVfX2NyZWF0ZUR1cmF0aW9uKHBvc05lZ0R1cmF0aW9uKS5hYnMoKTtcbiAgICAgICAgdmFyIHNlY29uZHMgID0gcm91bmQoZHVyYXRpb24uYXMoJ3MnKSk7XG4gICAgICAgIHZhciBtaW51dGVzICA9IHJvdW5kKGR1cmF0aW9uLmFzKCdtJykpO1xuICAgICAgICB2YXIgaG91cnMgICAgPSByb3VuZChkdXJhdGlvbi5hcygnaCcpKTtcbiAgICAgICAgdmFyIGRheXMgICAgID0gcm91bmQoZHVyYXRpb24uYXMoJ2QnKSk7XG4gICAgICAgIHZhciBtb250aHMgICA9IHJvdW5kKGR1cmF0aW9uLmFzKCdNJykpO1xuICAgICAgICB2YXIgeWVhcnMgICAgPSByb3VuZChkdXJhdGlvbi5hcygneScpKTtcblxuICAgICAgICB2YXIgYSA9IHNlY29uZHMgPCB0aHJlc2hvbGRzLnMgJiYgWydzJywgc2Vjb25kc10gIHx8XG4gICAgICAgICAgICAgICAgbWludXRlcyA9PT0gMSAgICAgICAgICAmJiBbJ20nXSAgICAgICAgICAgfHxcbiAgICAgICAgICAgICAgICBtaW51dGVzIDwgdGhyZXNob2xkcy5tICYmIFsnbW0nLCBtaW51dGVzXSB8fFxuICAgICAgICAgICAgICAgIGhvdXJzICAgPT09IDEgICAgICAgICAgJiYgWydoJ10gICAgICAgICAgIHx8XG4gICAgICAgICAgICAgICAgaG91cnMgICA8IHRocmVzaG9sZHMuaCAmJiBbJ2hoJywgaG91cnNdICAgfHxcbiAgICAgICAgICAgICAgICBkYXlzICAgID09PSAxICAgICAgICAgICYmIFsnZCddICAgICAgICAgICB8fFxuICAgICAgICAgICAgICAgIGRheXMgICAgPCB0aHJlc2hvbGRzLmQgJiYgWydkZCcsIGRheXNdICAgIHx8XG4gICAgICAgICAgICAgICAgbW9udGhzICA9PT0gMSAgICAgICAgICAmJiBbJ00nXSAgICAgICAgICAgfHxcbiAgICAgICAgICAgICAgICBtb250aHMgIDwgdGhyZXNob2xkcy5NICYmIFsnTU0nLCBtb250aHNdICB8fFxuICAgICAgICAgICAgICAgIHllYXJzICAgPT09IDEgICAgICAgICAgJiYgWyd5J10gICAgICAgICAgIHx8IFsneXknLCB5ZWFyc107XG5cbiAgICAgICAgYVsyXSA9IHdpdGhvdXRTdWZmaXg7XG4gICAgICAgIGFbM10gPSArcG9zTmVnRHVyYXRpb24gPiAwO1xuICAgICAgICBhWzRdID0gbG9jYWxlO1xuICAgICAgICByZXR1cm4gc3Vic3RpdHV0ZVRpbWVBZ28uYXBwbHkobnVsbCwgYSk7XG4gICAgfVxuXG4gICAgLy8gVGhpcyBmdW5jdGlvbiBhbGxvd3MgeW91IHRvIHNldCBhIHRocmVzaG9sZCBmb3IgcmVsYXRpdmUgdGltZSBzdHJpbmdzXG4gICAgZnVuY3Rpb24gZHVyYXRpb25faHVtYW5pemVfX2dldFNldFJlbGF0aXZlVGltZVRocmVzaG9sZCAodGhyZXNob2xkLCBsaW1pdCkge1xuICAgICAgICBpZiAodGhyZXNob2xkc1t0aHJlc2hvbGRdID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobGltaXQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcmV0dXJuIHRocmVzaG9sZHNbdGhyZXNob2xkXTtcbiAgICAgICAgfVxuICAgICAgICB0aHJlc2hvbGRzW3RocmVzaG9sZF0gPSBsaW1pdDtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaHVtYW5pemUgKHdpdGhTdWZmaXgpIHtcbiAgICAgICAgdmFyIGxvY2FsZSA9IHRoaXMubG9jYWxlRGF0YSgpO1xuICAgICAgICB2YXIgb3V0cHV0ID0gZHVyYXRpb25faHVtYW5pemVfX3JlbGF0aXZlVGltZSh0aGlzLCAhd2l0aFN1ZmZpeCwgbG9jYWxlKTtcblxuICAgICAgICBpZiAod2l0aFN1ZmZpeCkge1xuICAgICAgICAgICAgb3V0cHV0ID0gbG9jYWxlLnBhc3RGdXR1cmUoK3RoaXMsIG91dHB1dCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbG9jYWxlLnBvc3Rmb3JtYXQob3V0cHV0KTtcbiAgICB9XG5cbiAgICB2YXIgaXNvX3N0cmluZ19fYWJzID0gTWF0aC5hYnM7XG5cbiAgICBmdW5jdGlvbiBpc29fc3RyaW5nX190b0lTT1N0cmluZygpIHtcbiAgICAgICAgLy8gZm9yIElTTyBzdHJpbmdzIHdlIGRvIG5vdCB1c2UgdGhlIG5vcm1hbCBidWJibGluZyBydWxlczpcbiAgICAgICAgLy8gICogbWlsbGlzZWNvbmRzIGJ1YmJsZSB1cCB1bnRpbCB0aGV5IGJlY29tZSBob3Vyc1xuICAgICAgICAvLyAgKiBkYXlzIGRvIG5vdCBidWJibGUgYXQgYWxsXG4gICAgICAgIC8vICAqIG1vbnRocyBidWJibGUgdXAgdW50aWwgdGhleSBiZWNvbWUgeWVhcnNcbiAgICAgICAgLy8gVGhpcyBpcyBiZWNhdXNlIHRoZXJlIGlzIG5vIGNvbnRleHQtZnJlZSBjb252ZXJzaW9uIGJldHdlZW4gaG91cnMgYW5kIGRheXNcbiAgICAgICAgLy8gKHRoaW5rIG9mIGNsb2NrIGNoYW5nZXMpXG4gICAgICAgIC8vIGFuZCBhbHNvIG5vdCBiZXR3ZWVuIGRheXMgYW5kIG1vbnRocyAoMjgtMzEgZGF5cyBwZXIgbW9udGgpXG4gICAgICAgIHZhciBzZWNvbmRzID0gaXNvX3N0cmluZ19fYWJzKHRoaXMuX21pbGxpc2Vjb25kcykgLyAxMDAwO1xuICAgICAgICB2YXIgZGF5cyAgICAgICAgID0gaXNvX3N0cmluZ19fYWJzKHRoaXMuX2RheXMpO1xuICAgICAgICB2YXIgbW9udGhzICAgICAgID0gaXNvX3N0cmluZ19fYWJzKHRoaXMuX21vbnRocyk7XG4gICAgICAgIHZhciBtaW51dGVzLCBob3VycywgeWVhcnM7XG5cbiAgICAgICAgLy8gMzYwMCBzZWNvbmRzIC0+IDYwIG1pbnV0ZXMgLT4gMSBob3VyXG4gICAgICAgIG1pbnV0ZXMgICAgICAgICAgID0gYWJzRmxvb3Ioc2Vjb25kcyAvIDYwKTtcbiAgICAgICAgaG91cnMgICAgICAgICAgICAgPSBhYnNGbG9vcihtaW51dGVzIC8gNjApO1xuICAgICAgICBzZWNvbmRzICU9IDYwO1xuICAgICAgICBtaW51dGVzICU9IDYwO1xuXG4gICAgICAgIC8vIDEyIG1vbnRocyAtPiAxIHllYXJcbiAgICAgICAgeWVhcnMgID0gYWJzRmxvb3IobW9udGhzIC8gMTIpO1xuICAgICAgICBtb250aHMgJT0gMTI7XG5cblxuICAgICAgICAvLyBpbnNwaXJlZCBieSBodHRwczovL2dpdGh1Yi5jb20vZG9yZGlsbGUvbW9tZW50LWlzb2R1cmF0aW9uL2Jsb2IvbWFzdGVyL21vbWVudC5pc29kdXJhdGlvbi5qc1xuICAgICAgICB2YXIgWSA9IHllYXJzO1xuICAgICAgICB2YXIgTSA9IG1vbnRocztcbiAgICAgICAgdmFyIEQgPSBkYXlzO1xuICAgICAgICB2YXIgaCA9IGhvdXJzO1xuICAgICAgICB2YXIgbSA9IG1pbnV0ZXM7XG4gICAgICAgIHZhciBzID0gc2Vjb25kcztcbiAgICAgICAgdmFyIHRvdGFsID0gdGhpcy5hc1NlY29uZHMoKTtcblxuICAgICAgICBpZiAoIXRvdGFsKSB7XG4gICAgICAgICAgICAvLyB0aGlzIGlzIHRoZSBzYW1lIGFzIEMjJ3MgKE5vZGEpIGFuZCBweXRob24gKGlzb2RhdGUpLi4uXG4gICAgICAgICAgICAvLyBidXQgbm90IG90aGVyIEpTIChnb29nLmRhdGUpXG4gICAgICAgICAgICByZXR1cm4gJ1AwRCc7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gKHRvdGFsIDwgMCA/ICctJyA6ICcnKSArXG4gICAgICAgICAgICAnUCcgK1xuICAgICAgICAgICAgKFkgPyBZICsgJ1knIDogJycpICtcbiAgICAgICAgICAgIChNID8gTSArICdNJyA6ICcnKSArXG4gICAgICAgICAgICAoRCA/IEQgKyAnRCcgOiAnJykgK1xuICAgICAgICAgICAgKChoIHx8IG0gfHwgcykgPyAnVCcgOiAnJykgK1xuICAgICAgICAgICAgKGggPyBoICsgJ0gnIDogJycpICtcbiAgICAgICAgICAgIChtID8gbSArICdNJyA6ICcnKSArXG4gICAgICAgICAgICAocyA/IHMgKyAnUycgOiAnJyk7XG4gICAgfVxuXG4gICAgdmFyIGR1cmF0aW9uX3Byb3RvdHlwZV9fcHJvdG8gPSBEdXJhdGlvbi5wcm90b3R5cGU7XG5cbiAgICBkdXJhdGlvbl9wcm90b3R5cGVfX3Byb3RvLmFicyAgICAgICAgICAgID0gZHVyYXRpb25fYWJzX19hYnM7XG4gICAgZHVyYXRpb25fcHJvdG90eXBlX19wcm90by5hZGQgICAgICAgICAgICA9IGR1cmF0aW9uX2FkZF9zdWJ0cmFjdF9fYWRkO1xuICAgIGR1cmF0aW9uX3Byb3RvdHlwZV9fcHJvdG8uc3VidHJhY3QgICAgICAgPSBkdXJhdGlvbl9hZGRfc3VidHJhY3RfX3N1YnRyYWN0O1xuICAgIGR1cmF0aW9uX3Byb3RvdHlwZV9fcHJvdG8uYXMgICAgICAgICAgICAgPSBhcztcbiAgICBkdXJhdGlvbl9wcm90b3R5cGVfX3Byb3RvLmFzTWlsbGlzZWNvbmRzID0gYXNNaWxsaXNlY29uZHM7XG4gICAgZHVyYXRpb25fcHJvdG90eXBlX19wcm90by5hc1NlY29uZHMgICAgICA9IGFzU2Vjb25kcztcbiAgICBkdXJhdGlvbl9wcm90b3R5cGVfX3Byb3RvLmFzTWludXRlcyAgICAgID0gYXNNaW51dGVzO1xuICAgIGR1cmF0aW9uX3Byb3RvdHlwZV9fcHJvdG8uYXNIb3VycyAgICAgICAgPSBhc0hvdXJzO1xuICAgIGR1cmF0aW9uX3Byb3RvdHlwZV9fcHJvdG8uYXNEYXlzICAgICAgICAgPSBhc0RheXM7XG4gICAgZHVyYXRpb25fcHJvdG90eXBlX19wcm90by5hc1dlZWtzICAgICAgICA9IGFzV2Vla3M7XG4gICAgZHVyYXRpb25fcHJvdG90eXBlX19wcm90by5hc01vbnRocyAgICAgICA9IGFzTW9udGhzO1xuICAgIGR1cmF0aW9uX3Byb3RvdHlwZV9fcHJvdG8uYXNZZWFycyAgICAgICAgPSBhc1llYXJzO1xuICAgIGR1cmF0aW9uX3Byb3RvdHlwZV9fcHJvdG8udmFsdWVPZiAgICAgICAgPSBkdXJhdGlvbl9hc19fdmFsdWVPZjtcbiAgICBkdXJhdGlvbl9wcm90b3R5cGVfX3Byb3RvLl9idWJibGUgICAgICAgID0gYnViYmxlO1xuICAgIGR1cmF0aW9uX3Byb3RvdHlwZV9fcHJvdG8uZ2V0ICAgICAgICAgICAgPSBkdXJhdGlvbl9nZXRfX2dldDtcbiAgICBkdXJhdGlvbl9wcm90b3R5cGVfX3Byb3RvLm1pbGxpc2Vjb25kcyAgID0gbWlsbGlzZWNvbmRzO1xuICAgIGR1cmF0aW9uX3Byb3RvdHlwZV9fcHJvdG8uc2Vjb25kcyAgICAgICAgPSBzZWNvbmRzO1xuICAgIGR1cmF0aW9uX3Byb3RvdHlwZV9fcHJvdG8ubWludXRlcyAgICAgICAgPSBtaW51dGVzO1xuICAgIGR1cmF0aW9uX3Byb3RvdHlwZV9fcHJvdG8uaG91cnMgICAgICAgICAgPSBob3VycztcbiAgICBkdXJhdGlvbl9wcm90b3R5cGVfX3Byb3RvLmRheXMgICAgICAgICAgID0gZGF5cztcbiAgICBkdXJhdGlvbl9wcm90b3R5cGVfX3Byb3RvLndlZWtzICAgICAgICAgID0gd2Vla3M7XG4gICAgZHVyYXRpb25fcHJvdG90eXBlX19wcm90by5tb250aHMgICAgICAgICA9IG1vbnRocztcbiAgICBkdXJhdGlvbl9wcm90b3R5cGVfX3Byb3RvLnllYXJzICAgICAgICAgID0geWVhcnM7XG4gICAgZHVyYXRpb25fcHJvdG90eXBlX19wcm90by5odW1hbml6ZSAgICAgICA9IGh1bWFuaXplO1xuICAgIGR1cmF0aW9uX3Byb3RvdHlwZV9fcHJvdG8udG9JU09TdHJpbmcgICAgPSBpc29fc3RyaW5nX190b0lTT1N0cmluZztcbiAgICBkdXJhdGlvbl9wcm90b3R5cGVfX3Byb3RvLnRvU3RyaW5nICAgICAgID0gaXNvX3N0cmluZ19fdG9JU09TdHJpbmc7XG4gICAgZHVyYXRpb25fcHJvdG90eXBlX19wcm90by50b0pTT04gICAgICAgICA9IGlzb19zdHJpbmdfX3RvSVNPU3RyaW5nO1xuICAgIGR1cmF0aW9uX3Byb3RvdHlwZV9fcHJvdG8ubG9jYWxlICAgICAgICAgPSBsb2NhbGU7XG4gICAgZHVyYXRpb25fcHJvdG90eXBlX19wcm90by5sb2NhbGVEYXRhICAgICA9IGxvY2FsZURhdGE7XG5cbiAgICAvLyBEZXByZWNhdGlvbnNcbiAgICBkdXJhdGlvbl9wcm90b3R5cGVfX3Byb3RvLnRvSXNvU3RyaW5nID0gZGVwcmVjYXRlKCd0b0lzb1N0cmluZygpIGlzIGRlcHJlY2F0ZWQuIFBsZWFzZSB1c2UgdG9JU09TdHJpbmcoKSBpbnN0ZWFkIChub3RpY2UgdGhlIGNhcGl0YWxzKScsIGlzb19zdHJpbmdfX3RvSVNPU3RyaW5nKTtcbiAgICBkdXJhdGlvbl9wcm90b3R5cGVfX3Byb3RvLmxhbmcgPSBsYW5nO1xuXG4gICAgLy8gU2lkZSBlZmZlY3QgaW1wb3J0c1xuXG4gICAgYWRkRm9ybWF0VG9rZW4oJ1gnLCAwLCAwLCAndW5peCcpO1xuICAgIGFkZEZvcm1hdFRva2VuKCd4JywgMCwgMCwgJ3ZhbHVlT2YnKTtcblxuICAgIC8vIFBBUlNJTkdcblxuICAgIGFkZFJlZ2V4VG9rZW4oJ3gnLCBtYXRjaFNpZ25lZCk7XG4gICAgYWRkUmVnZXhUb2tlbignWCcsIG1hdGNoVGltZXN0YW1wKTtcbiAgICBhZGRQYXJzZVRva2VuKCdYJywgZnVuY3Rpb24gKGlucHV0LCBhcnJheSwgY29uZmlnKSB7XG4gICAgICAgIGNvbmZpZy5fZCA9IG5ldyBEYXRlKHBhcnNlRmxvYXQoaW5wdXQsIDEwKSAqIDEwMDApO1xuICAgIH0pO1xuICAgIGFkZFBhcnNlVG9rZW4oJ3gnLCBmdW5jdGlvbiAoaW5wdXQsIGFycmF5LCBjb25maWcpIHtcbiAgICAgICAgY29uZmlnLl9kID0gbmV3IERhdGUodG9JbnQoaW5wdXQpKTtcbiAgICB9KTtcblxuICAgIC8vIFNpZGUgZWZmZWN0IGltcG9ydHNcblxuXG4gICAgdXRpbHNfaG9va3NfX2hvb2tzLnZlcnNpb24gPSAnMi4xMC42JztcblxuICAgIHNldEhvb2tDYWxsYmFjayhsb2NhbF9fY3JlYXRlTG9jYWwpO1xuXG4gICAgdXRpbHNfaG9va3NfX2hvb2tzLmZuICAgICAgICAgICAgICAgICAgICA9IG1vbWVudFByb3RvdHlwZTtcbiAgICB1dGlsc19ob29rc19faG9va3MubWluICAgICAgICAgICAgICAgICAgID0gbWluO1xuICAgIHV0aWxzX2hvb2tzX19ob29rcy5tYXggICAgICAgICAgICAgICAgICAgPSBtYXg7XG4gICAgdXRpbHNfaG9va3NfX2hvb2tzLnV0YyAgICAgICAgICAgICAgICAgICA9IGNyZWF0ZV91dGNfX2NyZWF0ZVVUQztcbiAgICB1dGlsc19ob29rc19faG9va3MudW5peCAgICAgICAgICAgICAgICAgID0gbW9tZW50X19jcmVhdGVVbml4O1xuICAgIHV0aWxzX2hvb2tzX19ob29rcy5tb250aHMgICAgICAgICAgICAgICAgPSBsaXN0c19fbGlzdE1vbnRocztcbiAgICB1dGlsc19ob29rc19faG9va3MuaXNEYXRlICAgICAgICAgICAgICAgID0gaXNEYXRlO1xuICAgIHV0aWxzX2hvb2tzX19ob29rcy5sb2NhbGUgICAgICAgICAgICAgICAgPSBsb2NhbGVfbG9jYWxlc19fZ2V0U2V0R2xvYmFsTG9jYWxlO1xuICAgIHV0aWxzX2hvb2tzX19ob29rcy5pbnZhbGlkICAgICAgICAgICAgICAgPSB2YWxpZF9fY3JlYXRlSW52YWxpZDtcbiAgICB1dGlsc19ob29rc19faG9va3MuZHVyYXRpb24gICAgICAgICAgICAgID0gY3JlYXRlX19jcmVhdGVEdXJhdGlvbjtcbiAgICB1dGlsc19ob29rc19faG9va3MuaXNNb21lbnQgICAgICAgICAgICAgID0gaXNNb21lbnQ7XG4gICAgdXRpbHNfaG9va3NfX2hvb2tzLndlZWtkYXlzICAgICAgICAgICAgICA9IGxpc3RzX19saXN0V2Vla2RheXM7XG4gICAgdXRpbHNfaG9va3NfX2hvb2tzLnBhcnNlWm9uZSAgICAgICAgICAgICA9IG1vbWVudF9fY3JlYXRlSW5ab25lO1xuICAgIHV0aWxzX2hvb2tzX19ob29rcy5sb2NhbGVEYXRhICAgICAgICAgICAgPSBsb2NhbGVfbG9jYWxlc19fZ2V0TG9jYWxlO1xuICAgIHV0aWxzX2hvb2tzX19ob29rcy5pc0R1cmF0aW9uICAgICAgICAgICAgPSBpc0R1cmF0aW9uO1xuICAgIHV0aWxzX2hvb2tzX19ob29rcy5tb250aHNTaG9ydCAgICAgICAgICAgPSBsaXN0c19fbGlzdE1vbnRoc1Nob3J0O1xuICAgIHV0aWxzX2hvb2tzX19ob29rcy53ZWVrZGF5c01pbiAgICAgICAgICAgPSBsaXN0c19fbGlzdFdlZWtkYXlzTWluO1xuICAgIHV0aWxzX2hvb2tzX19ob29rcy5kZWZpbmVMb2NhbGUgICAgICAgICAgPSBkZWZpbmVMb2NhbGU7XG4gICAgdXRpbHNfaG9va3NfX2hvb2tzLndlZWtkYXlzU2hvcnQgICAgICAgICA9IGxpc3RzX19saXN0V2Vla2RheXNTaG9ydDtcbiAgICB1dGlsc19ob29rc19faG9va3Mubm9ybWFsaXplVW5pdHMgICAgICAgID0gbm9ybWFsaXplVW5pdHM7XG4gICAgdXRpbHNfaG9va3NfX2hvb2tzLnJlbGF0aXZlVGltZVRocmVzaG9sZCA9IGR1cmF0aW9uX2h1bWFuaXplX19nZXRTZXRSZWxhdGl2ZVRpbWVUaHJlc2hvbGQ7XG5cbiAgICB2YXIgX21vbWVudCA9IHV0aWxzX2hvb2tzX19ob29rcztcblxuICAgIHJldHVybiBfbW9tZW50O1xuXG59KSk7IiwidmFyIGlvdGEgPSByZXF1aXJlKFwiaW90YS1hcnJheVwiKVxudmFyIGlzQnVmZmVyID0gcmVxdWlyZShcImlzLWJ1ZmZlclwiKVxuXG52YXIgaGFzVHlwZWRBcnJheXMgID0gKCh0eXBlb2YgRmxvYXQ2NEFycmF5KSAhPT0gXCJ1bmRlZmluZWRcIilcblxuZnVuY3Rpb24gY29tcGFyZTFzdChhLCBiKSB7XG4gIHJldHVybiBhWzBdIC0gYlswXVxufVxuXG5mdW5jdGlvbiBvcmRlcigpIHtcbiAgdmFyIHN0cmlkZSA9IHRoaXMuc3RyaWRlXG4gIHZhciB0ZXJtcyA9IG5ldyBBcnJheShzdHJpZGUubGVuZ3RoKVxuICB2YXIgaVxuICBmb3IoaT0wOyBpPHRlcm1zLmxlbmd0aDsgKytpKSB7XG4gICAgdGVybXNbaV0gPSBbTWF0aC5hYnMoc3RyaWRlW2ldKSwgaV1cbiAgfVxuICB0ZXJtcy5zb3J0KGNvbXBhcmUxc3QpXG4gIHZhciByZXN1bHQgPSBuZXcgQXJyYXkodGVybXMubGVuZ3RoKVxuICBmb3IoaT0wOyBpPHJlc3VsdC5sZW5ndGg7ICsraSkge1xuICAgIHJlc3VsdFtpXSA9IHRlcm1zW2ldWzFdXG4gIH1cbiAgcmV0dXJuIHJlc3VsdFxufVxuXG5mdW5jdGlvbiBjb21waWxlQ29uc3RydWN0b3IoZHR5cGUsIGRpbWVuc2lvbikge1xuICB2YXIgY2xhc3NOYW1lID0gW1wiVmlld1wiLCBkaW1lbnNpb24sIFwiZFwiLCBkdHlwZV0uam9pbihcIlwiKVxuICBpZihkaW1lbnNpb24gPCAwKSB7XG4gICAgY2xhc3NOYW1lID0gXCJWaWV3X05pbFwiICsgZHR5cGVcbiAgfVxuICB2YXIgdXNlR2V0dGVycyA9IChkdHlwZSA9PT0gXCJnZW5lcmljXCIpXG5cbiAgaWYoZGltZW5zaW9uID09PSAtMSkge1xuICAgIC8vU3BlY2lhbCBjYXNlIGZvciB0cml2aWFsIGFycmF5c1xuICAgIHZhciBjb2RlID1cbiAgICAgIFwiZnVuY3Rpb24gXCIrY2xhc3NOYW1lK1wiKGEpe3RoaXMuZGF0YT1hO307XFxcbnZhciBwcm90bz1cIitjbGFzc05hbWUrXCIucHJvdG90eXBlO1xcXG5wcm90by5kdHlwZT0nXCIrZHR5cGUrXCInO1xcXG5wcm90by5pbmRleD1mdW5jdGlvbigpe3JldHVybiAtMX07XFxcbnByb3RvLnNpemU9MDtcXFxucHJvdG8uZGltZW5zaW9uPS0xO1xcXG5wcm90by5zaGFwZT1wcm90by5zdHJpZGU9cHJvdG8ub3JkZXI9W107XFxcbnByb3RvLmxvPXByb3RvLmhpPXByb3RvLnRyYW5zcG9zZT1wcm90by5zdGVwPVxcXG5mdW5jdGlvbigpe3JldHVybiBuZXcgXCIrY2xhc3NOYW1lK1wiKHRoaXMuZGF0YSk7fTtcXFxucHJvdG8uZ2V0PXByb3RvLnNldD1mdW5jdGlvbigpe307XFxcbnByb3RvLnBpY2s9ZnVuY3Rpb24oKXtyZXR1cm4gbnVsbH07XFxcbnJldHVybiBmdW5jdGlvbiBjb25zdHJ1Y3RfXCIrY2xhc3NOYW1lK1wiKGEpe3JldHVybiBuZXcgXCIrY2xhc3NOYW1lK1wiKGEpO31cIlxuICAgIHZhciBwcm9jZWR1cmUgPSBuZXcgRnVuY3Rpb24oY29kZSlcbiAgICByZXR1cm4gcHJvY2VkdXJlKClcbiAgfSBlbHNlIGlmKGRpbWVuc2lvbiA9PT0gMCkge1xuICAgIC8vU3BlY2lhbCBjYXNlIGZvciAwZCBhcnJheXNcbiAgICB2YXIgY29kZSA9XG4gICAgICBcImZ1bmN0aW9uIFwiK2NsYXNzTmFtZStcIihhLGQpIHtcXFxudGhpcy5kYXRhID0gYTtcXFxudGhpcy5vZmZzZXQgPSBkXFxcbn07XFxcbnZhciBwcm90bz1cIitjbGFzc05hbWUrXCIucHJvdG90eXBlO1xcXG5wcm90by5kdHlwZT0nXCIrZHR5cGUrXCInO1xcXG5wcm90by5pbmRleD1mdW5jdGlvbigpe3JldHVybiB0aGlzLm9mZnNldH07XFxcbnByb3RvLmRpbWVuc2lvbj0wO1xcXG5wcm90by5zaXplPTE7XFxcbnByb3RvLnNoYXBlPVxcXG5wcm90by5zdHJpZGU9XFxcbnByb3RvLm9yZGVyPVtdO1xcXG5wcm90by5sbz1cXFxucHJvdG8uaGk9XFxcbnByb3RvLnRyYW5zcG9zZT1cXFxucHJvdG8uc3RlcD1mdW5jdGlvbiBcIitjbGFzc05hbWUrXCJfY29weSgpIHtcXFxucmV0dXJuIG5ldyBcIitjbGFzc05hbWUrXCIodGhpcy5kYXRhLHRoaXMub2Zmc2V0KVxcXG59O1xcXG5wcm90by5waWNrPWZ1bmN0aW9uIFwiK2NsYXNzTmFtZStcIl9waWNrKCl7XFxcbnJldHVybiBUcml2aWFsQXJyYXkodGhpcy5kYXRhKTtcXFxufTtcXFxucHJvdG8udmFsdWVPZj1wcm90by5nZXQ9ZnVuY3Rpb24gXCIrY2xhc3NOYW1lK1wiX2dldCgpe1xcXG5yZXR1cm4gXCIrKHVzZUdldHRlcnMgPyBcInRoaXMuZGF0YS5nZXQodGhpcy5vZmZzZXQpXCIgOiBcInRoaXMuZGF0YVt0aGlzLm9mZnNldF1cIikrXG5cIn07XFxcbnByb3RvLnNldD1mdW5jdGlvbiBcIitjbGFzc05hbWUrXCJfc2V0KHYpe1xcXG5yZXR1cm4gXCIrKHVzZUdldHRlcnMgPyBcInRoaXMuZGF0YS5zZXQodGhpcy5vZmZzZXQsdilcIiA6IFwidGhpcy5kYXRhW3RoaXMub2Zmc2V0XT12XCIpK1wiXFxcbn07XFxcbnJldHVybiBmdW5jdGlvbiBjb25zdHJ1Y3RfXCIrY2xhc3NOYW1lK1wiKGEsYixjLGQpe3JldHVybiBuZXcgXCIrY2xhc3NOYW1lK1wiKGEsZCl9XCJcbiAgICB2YXIgcHJvY2VkdXJlID0gbmV3IEZ1bmN0aW9uKFwiVHJpdmlhbEFycmF5XCIsIGNvZGUpXG4gICAgcmV0dXJuIHByb2NlZHVyZShDQUNIRURfQ09OU1RSVUNUT1JTW2R0eXBlXVswXSlcbiAgfVxuXG4gIHZhciBjb2RlID0gW1wiJ3VzZSBzdHJpY3QnXCJdXG5cbiAgLy9DcmVhdGUgY29uc3RydWN0b3IgZm9yIHZpZXdcbiAgdmFyIGluZGljZXMgPSBpb3RhKGRpbWVuc2lvbilcbiAgdmFyIGFyZ3MgPSBpbmRpY2VzLm1hcChmdW5jdGlvbihpKSB7IHJldHVybiBcImlcIitpIH0pXG4gIHZhciBpbmRleF9zdHIgPSBcInRoaXMub2Zmc2V0K1wiICsgaW5kaWNlcy5tYXAoZnVuY3Rpb24oaSkge1xuICAgICAgICByZXR1cm4gXCJ0aGlzLnN0cmlkZVtcIiArIGkgKyBcIl0qaVwiICsgaVxuICAgICAgfSkuam9pbihcIitcIilcbiAgdmFyIHNoYXBlQXJnID0gaW5kaWNlcy5tYXAoZnVuY3Rpb24oaSkge1xuICAgICAgcmV0dXJuIFwiYlwiK2lcbiAgICB9KS5qb2luKFwiLFwiKVxuICB2YXIgc3RyaWRlQXJnID0gaW5kaWNlcy5tYXAoZnVuY3Rpb24oaSkge1xuICAgICAgcmV0dXJuIFwiY1wiK2lcbiAgICB9KS5qb2luKFwiLFwiKVxuICBjb2RlLnB1c2goXG4gICAgXCJmdW5jdGlvbiBcIitjbGFzc05hbWUrXCIoYSxcIiArIHNoYXBlQXJnICsgXCIsXCIgKyBzdHJpZGVBcmcgKyBcIixkKXt0aGlzLmRhdGE9YVwiLFxuICAgICAgXCJ0aGlzLnNoYXBlPVtcIiArIHNoYXBlQXJnICsgXCJdXCIsXG4gICAgICBcInRoaXMuc3RyaWRlPVtcIiArIHN0cmlkZUFyZyArIFwiXVwiLFxuICAgICAgXCJ0aGlzLm9mZnNldD1kfDB9XCIsXG4gICAgXCJ2YXIgcHJvdG89XCIrY2xhc3NOYW1lK1wiLnByb3RvdHlwZVwiLFxuICAgIFwicHJvdG8uZHR5cGU9J1wiK2R0eXBlK1wiJ1wiLFxuICAgIFwicHJvdG8uZGltZW5zaW9uPVwiK2RpbWVuc2lvbilcblxuICAvL3ZpZXcuc2l6ZTpcbiAgY29kZS5wdXNoKFwiT2JqZWN0LmRlZmluZVByb3BlcnR5KHByb3RvLCdzaXplJyx7Z2V0OmZ1bmN0aW9uIFwiK2NsYXNzTmFtZStcIl9zaXplKCl7XFxcbnJldHVybiBcIitpbmRpY2VzLm1hcChmdW5jdGlvbihpKSB7IHJldHVybiBcInRoaXMuc2hhcGVbXCIraStcIl1cIiB9KS5qb2luKFwiKlwiKSxcblwifX0pXCIpXG5cbiAgLy92aWV3Lm9yZGVyOlxuICBpZihkaW1lbnNpb24gPT09IDEpIHtcbiAgICBjb2RlLnB1c2goXCJwcm90by5vcmRlcj1bMF1cIilcbiAgfSBlbHNlIHtcbiAgICBjb2RlLnB1c2goXCJPYmplY3QuZGVmaW5lUHJvcGVydHkocHJvdG8sJ29yZGVyJyx7Z2V0OlwiKVxuICAgIGlmKGRpbWVuc2lvbiA8IDQpIHtcbiAgICAgIGNvZGUucHVzaChcImZ1bmN0aW9uIFwiK2NsYXNzTmFtZStcIl9vcmRlcigpe1wiKVxuICAgICAgaWYoZGltZW5zaW9uID09PSAyKSB7XG4gICAgICAgIGNvZGUucHVzaChcInJldHVybiAoTWF0aC5hYnModGhpcy5zdHJpZGVbMF0pPk1hdGguYWJzKHRoaXMuc3RyaWRlWzFdKSk/WzEsMF06WzAsMV19fSlcIilcbiAgICAgIH0gZWxzZSBpZihkaW1lbnNpb24gPT09IDMpIHtcbiAgICAgICAgY29kZS5wdXNoKFxuXCJ2YXIgczA9TWF0aC5hYnModGhpcy5zdHJpZGVbMF0pLHMxPU1hdGguYWJzKHRoaXMuc3RyaWRlWzFdKSxzMj1NYXRoLmFicyh0aGlzLnN0cmlkZVsyXSk7XFxcbmlmKHMwPnMxKXtcXFxuaWYoczE+czIpe1xcXG5yZXR1cm4gWzIsMSwwXTtcXFxufWVsc2UgaWYoczA+czIpe1xcXG5yZXR1cm4gWzEsMiwwXTtcXFxufWVsc2V7XFxcbnJldHVybiBbMSwwLDJdO1xcXG59XFxcbn1lbHNlIGlmKHMwPnMyKXtcXFxucmV0dXJuIFsyLDAsMV07XFxcbn1lbHNlIGlmKHMyPnMxKXtcXFxucmV0dXJuIFswLDEsMl07XFxcbn1lbHNle1xcXG5yZXR1cm4gWzAsMiwxXTtcXFxufX19KVwiKVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBjb2RlLnB1c2goXCJPUkRFUn0pXCIpXG4gICAgfVxuICB9XG5cbiAgLy92aWV3LnNldChpMCwgLi4uLCB2KTpcbiAgY29kZS5wdXNoKFxuXCJwcm90by5zZXQ9ZnVuY3Rpb24gXCIrY2xhc3NOYW1lK1wiX3NldChcIithcmdzLmpvaW4oXCIsXCIpK1wiLHYpe1wiKVxuICBpZih1c2VHZXR0ZXJzKSB7XG4gICAgY29kZS5wdXNoKFwicmV0dXJuIHRoaXMuZGF0YS5zZXQoXCIraW5kZXhfc3RyK1wiLHYpfVwiKVxuICB9IGVsc2Uge1xuICAgIGNvZGUucHVzaChcInJldHVybiB0aGlzLmRhdGFbXCIraW5kZXhfc3RyK1wiXT12fVwiKVxuICB9XG5cbiAgLy92aWV3LmdldChpMCwgLi4uKTpcbiAgY29kZS5wdXNoKFwicHJvdG8uZ2V0PWZ1bmN0aW9uIFwiK2NsYXNzTmFtZStcIl9nZXQoXCIrYXJncy5qb2luKFwiLFwiKStcIil7XCIpXG4gIGlmKHVzZUdldHRlcnMpIHtcbiAgICBjb2RlLnB1c2goXCJyZXR1cm4gdGhpcy5kYXRhLmdldChcIitpbmRleF9zdHIrXCIpfVwiKVxuICB9IGVsc2Uge1xuICAgIGNvZGUucHVzaChcInJldHVybiB0aGlzLmRhdGFbXCIraW5kZXhfc3RyK1wiXX1cIilcbiAgfVxuXG4gIC8vdmlldy5pbmRleDpcbiAgY29kZS5wdXNoKFxuICAgIFwicHJvdG8uaW5kZXg9ZnVuY3Rpb24gXCIrY2xhc3NOYW1lK1wiX2luZGV4KFwiLCBhcmdzLmpvaW4oKSwgXCIpe3JldHVybiBcIitpbmRleF9zdHIrXCJ9XCIpXG5cbiAgLy92aWV3LmhpKCk6XG4gIGNvZGUucHVzaChcInByb3RvLmhpPWZ1bmN0aW9uIFwiK2NsYXNzTmFtZStcIl9oaShcIithcmdzLmpvaW4oXCIsXCIpK1wiKXtyZXR1cm4gbmV3IFwiK2NsYXNzTmFtZStcIih0aGlzLmRhdGEsXCIrXG4gICAgaW5kaWNlcy5tYXAoZnVuY3Rpb24oaSkge1xuICAgICAgcmV0dXJuIFtcIih0eXBlb2YgaVwiLGksXCIhPT0nbnVtYmVyJ3x8aVwiLGksXCI8MCk/dGhpcy5zaGFwZVtcIiwgaSwgXCJdOmlcIiwgaSxcInwwXCJdLmpvaW4oXCJcIilcbiAgICB9KS5qb2luKFwiLFwiKStcIixcIitcbiAgICBpbmRpY2VzLm1hcChmdW5jdGlvbihpKSB7XG4gICAgICByZXR1cm4gXCJ0aGlzLnN0cmlkZVtcIitpICsgXCJdXCJcbiAgICB9KS5qb2luKFwiLFwiKStcIix0aGlzLm9mZnNldCl9XCIpXG5cbiAgLy92aWV3LmxvKCk6XG4gIHZhciBhX3ZhcnMgPSBpbmRpY2VzLm1hcChmdW5jdGlvbihpKSB7IHJldHVybiBcImFcIitpK1wiPXRoaXMuc2hhcGVbXCIraStcIl1cIiB9KVxuICB2YXIgY192YXJzID0gaW5kaWNlcy5tYXAoZnVuY3Rpb24oaSkgeyByZXR1cm4gXCJjXCIraStcIj10aGlzLnN0cmlkZVtcIitpK1wiXVwiIH0pXG4gIGNvZGUucHVzaChcInByb3RvLmxvPWZ1bmN0aW9uIFwiK2NsYXNzTmFtZStcIl9sbyhcIithcmdzLmpvaW4oXCIsXCIpK1wiKXt2YXIgYj10aGlzLm9mZnNldCxkPTAsXCIrYV92YXJzLmpvaW4oXCIsXCIpK1wiLFwiK2NfdmFycy5qb2luKFwiLFwiKSlcbiAgZm9yKHZhciBpPTA7IGk8ZGltZW5zaW9uOyArK2kpIHtcbiAgICBjb2RlLnB1c2goXG5cImlmKHR5cGVvZiBpXCIraStcIj09PSdudW1iZXInJiZpXCIraStcIj49MCl7XFxcbmQ9aVwiK2krXCJ8MDtcXFxuYis9Y1wiK2krXCIqZDtcXFxuYVwiK2krXCItPWR9XCIpXG4gIH1cbiAgY29kZS5wdXNoKFwicmV0dXJuIG5ldyBcIitjbGFzc05hbWUrXCIodGhpcy5kYXRhLFwiK1xuICAgIGluZGljZXMubWFwKGZ1bmN0aW9uKGkpIHtcbiAgICAgIHJldHVybiBcImFcIitpXG4gICAgfSkuam9pbihcIixcIikrXCIsXCIrXG4gICAgaW5kaWNlcy5tYXAoZnVuY3Rpb24oaSkge1xuICAgICAgcmV0dXJuIFwiY1wiK2lcbiAgICB9KS5qb2luKFwiLFwiKStcIixiKX1cIilcblxuICAvL3ZpZXcuc3RlcCgpOlxuICBjb2RlLnB1c2goXCJwcm90by5zdGVwPWZ1bmN0aW9uIFwiK2NsYXNzTmFtZStcIl9zdGVwKFwiK2FyZ3Muam9pbihcIixcIikrXCIpe3ZhciBcIitcbiAgICBpbmRpY2VzLm1hcChmdW5jdGlvbihpKSB7XG4gICAgICByZXR1cm4gXCJhXCIraStcIj10aGlzLnNoYXBlW1wiK2krXCJdXCJcbiAgICB9KS5qb2luKFwiLFwiKStcIixcIitcbiAgICBpbmRpY2VzLm1hcChmdW5jdGlvbihpKSB7XG4gICAgICByZXR1cm4gXCJiXCIraStcIj10aGlzLnN0cmlkZVtcIitpK1wiXVwiXG4gICAgfSkuam9pbihcIixcIikrXCIsYz10aGlzLm9mZnNldCxkPTAsY2VpbD1NYXRoLmNlaWxcIilcbiAgZm9yKHZhciBpPTA7IGk8ZGltZW5zaW9uOyArK2kpIHtcbiAgICBjb2RlLnB1c2goXG5cImlmKHR5cGVvZiBpXCIraStcIj09PSdudW1iZXInKXtcXFxuZD1pXCIraStcInwwO1xcXG5pZihkPDApe1xcXG5jKz1iXCIraStcIiooYVwiK2krXCItMSk7XFxcbmFcIitpK1wiPWNlaWwoLWFcIitpK1wiL2QpXFxcbn1lbHNle1xcXG5hXCIraStcIj1jZWlsKGFcIitpK1wiL2QpXFxcbn1cXFxuYlwiK2krXCIqPWRcXFxufVwiKVxuICB9XG4gIGNvZGUucHVzaChcInJldHVybiBuZXcgXCIrY2xhc3NOYW1lK1wiKHRoaXMuZGF0YSxcIitcbiAgICBpbmRpY2VzLm1hcChmdW5jdGlvbihpKSB7XG4gICAgICByZXR1cm4gXCJhXCIgKyBpXG4gICAgfSkuam9pbihcIixcIikrXCIsXCIrXG4gICAgaW5kaWNlcy5tYXAoZnVuY3Rpb24oaSkge1xuICAgICAgcmV0dXJuIFwiYlwiICsgaVxuICAgIH0pLmpvaW4oXCIsXCIpK1wiLGMpfVwiKVxuXG4gIC8vdmlldy50cmFuc3Bvc2UoKTpcbiAgdmFyIHRTaGFwZSA9IG5ldyBBcnJheShkaW1lbnNpb24pXG4gIHZhciB0U3RyaWRlID0gbmV3IEFycmF5KGRpbWVuc2lvbilcbiAgZm9yKHZhciBpPTA7IGk8ZGltZW5zaW9uOyArK2kpIHtcbiAgICB0U2hhcGVbaV0gPSBcImFbaVwiK2krXCJdXCJcbiAgICB0U3RyaWRlW2ldID0gXCJiW2lcIitpK1wiXVwiXG4gIH1cbiAgY29kZS5wdXNoKFwicHJvdG8udHJhbnNwb3NlPWZ1bmN0aW9uIFwiK2NsYXNzTmFtZStcIl90cmFuc3Bvc2UoXCIrYXJncytcIil7XCIrXG4gICAgYXJncy5tYXAoZnVuY3Rpb24obixpZHgpIHsgcmV0dXJuIG4gKyBcIj0oXCIgKyBuICsgXCI9PT11bmRlZmluZWQ/XCIgKyBpZHggKyBcIjpcIiArIG4gKyBcInwwKVwifSkuam9pbihcIjtcIiksXG4gICAgXCJ2YXIgYT10aGlzLnNoYXBlLGI9dGhpcy5zdHJpZGU7cmV0dXJuIG5ldyBcIitjbGFzc05hbWUrXCIodGhpcy5kYXRhLFwiK3RTaGFwZS5qb2luKFwiLFwiKStcIixcIit0U3RyaWRlLmpvaW4oXCIsXCIpK1wiLHRoaXMub2Zmc2V0KX1cIilcblxuICAvL3ZpZXcucGljaygpOlxuICBjb2RlLnB1c2goXCJwcm90by5waWNrPWZ1bmN0aW9uIFwiK2NsYXNzTmFtZStcIl9waWNrKFwiK2FyZ3MrXCIpe3ZhciBhPVtdLGI9W10sYz10aGlzLm9mZnNldFwiKVxuICBmb3IodmFyIGk9MDsgaTxkaW1lbnNpb247ICsraSkge1xuICAgIGNvZGUucHVzaChcImlmKHR5cGVvZiBpXCIraStcIj09PSdudW1iZXInJiZpXCIraStcIj49MCl7Yz0oYyt0aGlzLnN0cmlkZVtcIitpK1wiXSppXCIraStcIil8MH1lbHNle2EucHVzaCh0aGlzLnNoYXBlW1wiK2krXCJdKTtiLnB1c2godGhpcy5zdHJpZGVbXCIraStcIl0pfVwiKVxuICB9XG4gIGNvZGUucHVzaChcInZhciBjdG9yPUNUT1JfTElTVFthLmxlbmd0aCsxXTtyZXR1cm4gY3Rvcih0aGlzLmRhdGEsYSxiLGMpfVwiKVxuXG4gIC8vQWRkIHJldHVybiBzdGF0ZW1lbnRcbiAgY29kZS5wdXNoKFwicmV0dXJuIGZ1bmN0aW9uIGNvbnN0cnVjdF9cIitjbGFzc05hbWUrXCIoZGF0YSxzaGFwZSxzdHJpZGUsb2Zmc2V0KXtyZXR1cm4gbmV3IFwiK2NsYXNzTmFtZStcIihkYXRhLFwiK1xuICAgIGluZGljZXMubWFwKGZ1bmN0aW9uKGkpIHtcbiAgICAgIHJldHVybiBcInNoYXBlW1wiK2krXCJdXCJcbiAgICB9KS5qb2luKFwiLFwiKStcIixcIitcbiAgICBpbmRpY2VzLm1hcChmdW5jdGlvbihpKSB7XG4gICAgICByZXR1cm4gXCJzdHJpZGVbXCIraStcIl1cIlxuICAgIH0pLmpvaW4oXCIsXCIpK1wiLG9mZnNldCl9XCIpXG5cbiAgLy9Db21waWxlIHByb2NlZHVyZVxuICB2YXIgcHJvY2VkdXJlID0gbmV3IEZ1bmN0aW9uKFwiQ1RPUl9MSVNUXCIsIFwiT1JERVJcIiwgY29kZS5qb2luKFwiXFxuXCIpKVxuICByZXR1cm4gcHJvY2VkdXJlKENBQ0hFRF9DT05TVFJVQ1RPUlNbZHR5cGVdLCBvcmRlcilcbn1cblxuZnVuY3Rpb24gYXJyYXlEVHlwZShkYXRhKSB7XG4gIGlmKGlzQnVmZmVyKGRhdGEpKSB7XG4gICAgcmV0dXJuIFwiYnVmZmVyXCJcbiAgfVxuICBpZihoYXNUeXBlZEFycmF5cykge1xuICAgIHN3aXRjaChPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoZGF0YSkpIHtcbiAgICAgIGNhc2UgXCJbb2JqZWN0IEZsb2F0NjRBcnJheV1cIjpcbiAgICAgICAgcmV0dXJuIFwiZmxvYXQ2NFwiXG4gICAgICBjYXNlIFwiW29iamVjdCBGbG9hdDMyQXJyYXldXCI6XG4gICAgICAgIHJldHVybiBcImZsb2F0MzJcIlxuICAgICAgY2FzZSBcIltvYmplY3QgSW50OEFycmF5XVwiOlxuICAgICAgICByZXR1cm4gXCJpbnQ4XCJcbiAgICAgIGNhc2UgXCJbb2JqZWN0IEludDE2QXJyYXldXCI6XG4gICAgICAgIHJldHVybiBcImludDE2XCJcbiAgICAgIGNhc2UgXCJbb2JqZWN0IEludDMyQXJyYXldXCI6XG4gICAgICAgIHJldHVybiBcImludDMyXCJcbiAgICAgIGNhc2UgXCJbb2JqZWN0IFVpbnQ4QXJyYXldXCI6XG4gICAgICAgIHJldHVybiBcInVpbnQ4XCJcbiAgICAgIGNhc2UgXCJbb2JqZWN0IFVpbnQxNkFycmF5XVwiOlxuICAgICAgICByZXR1cm4gXCJ1aW50MTZcIlxuICAgICAgY2FzZSBcIltvYmplY3QgVWludDMyQXJyYXldXCI6XG4gICAgICAgIHJldHVybiBcInVpbnQzMlwiXG4gICAgICBjYXNlIFwiW29iamVjdCBVaW50OENsYW1wZWRBcnJheV1cIjpcbiAgICAgICAgcmV0dXJuIFwidWludDhfY2xhbXBlZFwiXG4gICAgfVxuICB9XG4gIGlmKEFycmF5LmlzQXJyYXkoZGF0YSkpIHtcbiAgICByZXR1cm4gXCJhcnJheVwiXG4gIH1cbiAgcmV0dXJuIFwiZ2VuZXJpY1wiXG59XG5cbnZhciBDQUNIRURfQ09OU1RSVUNUT1JTID0ge1xuICBcImZsb2F0MzJcIjpbXSxcbiAgXCJmbG9hdDY0XCI6W10sXG4gIFwiaW50OFwiOltdLFxuICBcImludDE2XCI6W10sXG4gIFwiaW50MzJcIjpbXSxcbiAgXCJ1aW50OFwiOltdLFxuICBcInVpbnQxNlwiOltdLFxuICBcInVpbnQzMlwiOltdLFxuICBcImFycmF5XCI6W10sXG4gIFwidWludDhfY2xhbXBlZFwiOltdLFxuICBcImJ1ZmZlclwiOltdLFxuICBcImdlbmVyaWNcIjpbXVxufVxuXG47KGZ1bmN0aW9uKCkge1xuICBmb3IodmFyIGlkIGluIENBQ0hFRF9DT05TVFJVQ1RPUlMpIHtcbiAgICBDQUNIRURfQ09OU1RSVUNUT1JTW2lkXS5wdXNoKGNvbXBpbGVDb25zdHJ1Y3RvcihpZCwgLTEpKVxuICB9XG59KTtcblxuZnVuY3Rpb24gd3JhcHBlZE5EQXJyYXlDdG9yKGRhdGEsIHNoYXBlLCBzdHJpZGUsIG9mZnNldCkge1xuICBpZihkYXRhID09PSB1bmRlZmluZWQpIHtcbiAgICB2YXIgY3RvciA9IENBQ0hFRF9DT05TVFJVQ1RPUlMuYXJyYXlbMF1cbiAgICByZXR1cm4gY3RvcihbXSlcbiAgfSBlbHNlIGlmKHR5cGVvZiBkYXRhID09PSBcIm51bWJlclwiKSB7XG4gICAgZGF0YSA9IFtkYXRhXVxuICB9XG4gIGlmKHNoYXBlID09PSB1bmRlZmluZWQpIHtcbiAgICBzaGFwZSA9IFsgZGF0YS5sZW5ndGggXVxuICB9XG4gIHZhciBkID0gc2hhcGUubGVuZ3RoXG4gIGlmKHN0cmlkZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgc3RyaWRlID0gbmV3IEFycmF5KGQpXG4gICAgZm9yKHZhciBpPWQtMSwgc3o9MTsgaT49MDsgLS1pKSB7XG4gICAgICBzdHJpZGVbaV0gPSBzelxuICAgICAgc3ogKj0gc2hhcGVbaV1cbiAgICB9XG4gIH1cbiAgaWYob2Zmc2V0ID09PSB1bmRlZmluZWQpIHtcbiAgICBvZmZzZXQgPSAwXG4gICAgZm9yKHZhciBpPTA7IGk8ZDsgKytpKSB7XG4gICAgICBpZihzdHJpZGVbaV0gPCAwKSB7XG4gICAgICAgIG9mZnNldCAtPSAoc2hhcGVbaV0tMSkqc3RyaWRlW2ldXG4gICAgICB9XG4gICAgfVxuICB9XG4gIHZhciBkdHlwZSA9IGFycmF5RFR5cGUoZGF0YSlcbiAgdmFyIGN0b3JfbGlzdCA9IENBQ0hFRF9DT05TVFJVQ1RPUlNbZHR5cGVdXG4gIHdoaWxlKGN0b3JfbGlzdC5sZW5ndGggPD0gZCsxKSB7XG4gICAgY3Rvcl9saXN0LnB1c2goY29tcGlsZUNvbnN0cnVjdG9yKGR0eXBlLCBjdG9yX2xpc3QubGVuZ3RoLTEpKVxuICB9XG4gIHZhciBjdG9yID0gY3Rvcl9saXN0W2QrMV1cbiAgcmV0dXJuIGN0b3IoZGF0YSwgc2hhcGUsIHN0cmlkZSwgb2Zmc2V0KVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHdyYXBwZWROREFycmF5Q3RvclxuIiwiXCJ1c2Ugc3RyaWN0XCJcblxuZnVuY3Rpb24gaW90YShuKSB7XG4gIHZhciByZXN1bHQgPSBuZXcgQXJyYXkobilcbiAgZm9yKHZhciBpPTA7IGk8bjsgKytpKSB7XG4gICAgcmVzdWx0W2ldID0gaVxuICB9XG4gIHJldHVybiByZXN1bHRcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBpb3RhIiwiLyoqXG4gKiBEZXRlcm1pbmUgaWYgYW4gb2JqZWN0IGlzIEJ1ZmZlclxuICpcbiAqIEF1dGhvcjogICBGZXJvc3MgQWJvdWtoYWRpamVoIDxmZXJvc3NAZmVyb3NzLm9yZz4gPGh0dHA6Ly9mZXJvc3Mub3JnPlxuICogTGljZW5zZTogIE1JVFxuICpcbiAqIGBucG0gaW5zdGFsbCBpcy1idWZmZXJgXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAob2JqKSB7XG4gIHJldHVybiAhIShvYmogIT0gbnVsbCAmJlxuICAgIChvYmouX2lzQnVmZmVyIHx8IC8vIEZvciBTYWZhcmkgNS03IChtaXNzaW5nIE9iamVjdC5wcm90b3R5cGUuY29uc3RydWN0b3IpXG4gICAgICAob2JqLmNvbnN0cnVjdG9yICYmXG4gICAgICB0eXBlb2Ygb2JqLmNvbnN0cnVjdG9yLmlzQnVmZmVyID09PSAnZnVuY3Rpb24nICYmXG4gICAgICBvYmouY29uc3RydWN0b3IuaXNCdWZmZXIob2JqKSlcbiAgICApKVxufVxuIiwidmFyIG5vdyA9IHJlcXVpcmUoJ3BlcmZvcm1hbmNlLW5vdycpXG4gICwgZ2xvYmFsID0gdHlwZW9mIHdpbmRvdyA9PT0gJ3VuZGVmaW5lZCcgPyB7fSA6IHdpbmRvd1xuICAsIHZlbmRvcnMgPSBbJ21veicsICd3ZWJraXQnXVxuICAsIHN1ZmZpeCA9ICdBbmltYXRpb25GcmFtZSdcbiAgLCByYWYgPSBnbG9iYWxbJ3JlcXVlc3QnICsgc3VmZml4XVxuICAsIGNhZiA9IGdsb2JhbFsnY2FuY2VsJyArIHN1ZmZpeF0gfHwgZ2xvYmFsWydjYW5jZWxSZXF1ZXN0JyArIHN1ZmZpeF1cbiAgLCBpc05hdGl2ZSA9IHRydWVcblxuZm9yKHZhciBpID0gMDsgaSA8IHZlbmRvcnMubGVuZ3RoICYmICFyYWY7IGkrKykge1xuICByYWYgPSBnbG9iYWxbdmVuZG9yc1tpXSArICdSZXF1ZXN0JyArIHN1ZmZpeF1cbiAgY2FmID0gZ2xvYmFsW3ZlbmRvcnNbaV0gKyAnQ2FuY2VsJyArIHN1ZmZpeF1cbiAgICAgIHx8IGdsb2JhbFt2ZW5kb3JzW2ldICsgJ0NhbmNlbFJlcXVlc3QnICsgc3VmZml4XVxufVxuXG4vLyBTb21lIHZlcnNpb25zIG9mIEZGIGhhdmUgckFGIGJ1dCBub3QgY0FGXG5pZighcmFmIHx8ICFjYWYpIHtcbiAgaXNOYXRpdmUgPSBmYWxzZVxuXG4gIHZhciBsYXN0ID0gMFxuICAgICwgaWQgPSAwXG4gICAgLCBxdWV1ZSA9IFtdXG4gICAgLCBmcmFtZUR1cmF0aW9uID0gMTAwMCAvIDYwXG5cbiAgcmFmID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICBpZihxdWV1ZS5sZW5ndGggPT09IDApIHtcbiAgICAgIHZhciBfbm93ID0gbm93KClcbiAgICAgICAgLCBuZXh0ID0gTWF0aC5tYXgoMCwgZnJhbWVEdXJhdGlvbiAtIChfbm93IC0gbGFzdCkpXG4gICAgICBsYXN0ID0gbmV4dCArIF9ub3dcbiAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBjcCA9IHF1ZXVlLnNsaWNlKDApXG4gICAgICAgIC8vIENsZWFyIHF1ZXVlIGhlcmUgdG8gcHJldmVudFxuICAgICAgICAvLyBjYWxsYmFja3MgZnJvbSBhcHBlbmRpbmcgbGlzdGVuZXJzXG4gICAgICAgIC8vIHRvIHRoZSBjdXJyZW50IGZyYW1lJ3MgcXVldWVcbiAgICAgICAgcXVldWUubGVuZ3RoID0gMFxuICAgICAgICBmb3IodmFyIGkgPSAwOyBpIDwgY3AubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBpZighY3BbaV0uY2FuY2VsbGVkKSB7XG4gICAgICAgICAgICB0cnl7XG4gICAgICAgICAgICAgIGNwW2ldLmNhbGxiYWNrKGxhc3QpXG4gICAgICAgICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHsgdGhyb3cgZSB9LCAwKVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSwgTWF0aC5yb3VuZChuZXh0KSlcbiAgICB9XG4gICAgcXVldWUucHVzaCh7XG4gICAgICBoYW5kbGU6ICsraWQsXG4gICAgICBjYWxsYmFjazogY2FsbGJhY2ssXG4gICAgICBjYW5jZWxsZWQ6IGZhbHNlXG4gICAgfSlcbiAgICByZXR1cm4gaWRcbiAgfVxuXG4gIGNhZiA9IGZ1bmN0aW9uKGhhbmRsZSkge1xuICAgIGZvcih2YXIgaSA9IDA7IGkgPCBxdWV1ZS5sZW5ndGg7IGkrKykge1xuICAgICAgaWYocXVldWVbaV0uaGFuZGxlID09PSBoYW5kbGUpIHtcbiAgICAgICAgcXVldWVbaV0uY2FuY2VsbGVkID0gdHJ1ZVxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGZuKSB7XG4gIC8vIFdyYXAgaW4gYSBuZXcgZnVuY3Rpb24gdG8gcHJldmVudFxuICAvLyBgY2FuY2VsYCBwb3RlbnRpYWxseSBiZWluZyBhc3NpZ25lZFxuICAvLyB0byB0aGUgbmF0aXZlIHJBRiBmdW5jdGlvblxuICBpZighaXNOYXRpdmUpIHtcbiAgICByZXR1cm4gcmFmLmNhbGwoZ2xvYmFsLCBmbilcbiAgfVxuICByZXR1cm4gcmFmLmNhbGwoZ2xvYmFsLCBmdW5jdGlvbigpIHtcbiAgICB0cnl7XG4gICAgICBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpXG4gICAgfSBjYXRjaChlKSB7XG4gICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkgeyB0aHJvdyBlIH0sIDApXG4gICAgfVxuICB9KVxufVxubW9kdWxlLmV4cG9ydHMuY2FuY2VsID0gZnVuY3Rpb24oKSB7XG4gIGNhZi5hcHBseShnbG9iYWwsIGFyZ3VtZW50cylcbn1cbiIsIihmdW5jdGlvbiAocHJvY2Vzcyl7XG4vLyBHZW5lcmF0ZWQgYnkgQ29mZmVlU2NyaXB0IDEuNi4zXG4oZnVuY3Rpb24oKSB7XG4gIHZhciBnZXROYW5vU2Vjb25kcywgaHJ0aW1lLCBsb2FkVGltZTtcblxuICBpZiAoKHR5cGVvZiBwZXJmb3JtYW5jZSAhPT0gXCJ1bmRlZmluZWRcIiAmJiBwZXJmb3JtYW5jZSAhPT0gbnVsbCkgJiYgcGVyZm9ybWFuY2Uubm93KSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBwZXJmb3JtYW5jZS5ub3coKTtcbiAgICB9O1xuICB9IGVsc2UgaWYgKCh0eXBlb2YgcHJvY2VzcyAhPT0gXCJ1bmRlZmluZWRcIiAmJiBwcm9jZXNzICE9PSBudWxsKSAmJiBwcm9jZXNzLmhydGltZSkge1xuICAgIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gKGdldE5hbm9TZWNvbmRzKCkgLSBsb2FkVGltZSkgLyAxZTY7XG4gICAgfTtcbiAgICBocnRpbWUgPSBwcm9jZXNzLmhydGltZTtcbiAgICBnZXROYW5vU2Vjb25kcyA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGhyO1xuICAgICAgaHIgPSBocnRpbWUoKTtcbiAgICAgIHJldHVybiBoclswXSAqIDFlOSArIGhyWzFdO1xuICAgIH07XG4gICAgbG9hZFRpbWUgPSBnZXROYW5vU2Vjb25kcygpO1xuICB9IGVsc2UgaWYgKERhdGUubm93KSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBEYXRlLm5vdygpIC0gbG9hZFRpbWU7XG4gICAgfTtcbiAgICBsb2FkVGltZSA9IERhdGUubm93KCk7XG4gIH0gZWxzZSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBuZXcgRGF0ZSgpLmdldFRpbWUoKSAtIGxvYWRUaW1lO1xuICAgIH07XG4gICAgbG9hZFRpbWUgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgfVxuXG59KS5jYWxsKHRoaXMpO1xuXG4vKlxuXG4qL1xuXG59KS5jYWxsKHRoaXMscmVxdWlyZSgnX3Byb2Nlc3MnKSlcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWRhdGE6YXBwbGljYXRpb24vanNvbjtjaGFyc2V0OnV0Zi04O2Jhc2U2NCxleUoyWlhKemFXOXVJam96TENKemIzVnlZMlZ6SWpwYkltNXZaR1ZmYlc5a2RXeGxjeTl5WVdZdmJtOWtaVjl0YjJSMWJHVnpMM0JsY21admNtMWhibU5sTFc1dmR5OXNhV0l2Y0dWeVptOXliV0Z1WTJVdGJtOTNMbXB6SWwwc0ltNWhiV1Z6SWpwYlhTd2liV0Z3Y0dsdVozTWlPaUk3UVVGQlFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFTSXNJbVpwYkdVaU9pSm5aVzVsY21GMFpXUXVhbk1pTENKemIzVnlZMlZTYjI5MElqb2lJaXdpYzI5MWNtTmxjME52Ym5SbGJuUWlPbHNpTHk4Z1IyVnVaWEpoZEdWa0lHSjVJRU52Wm1abFpWTmpjbWx3ZENBeExqWXVNMXh1S0daMWJtTjBhVzl1S0NrZ2UxeHVJQ0IyWVhJZ1oyVjBUbUZ1YjFObFkyOXVaSE1zSUdoeWRHbHRaU3dnYkc5aFpGUnBiV1U3WEc1Y2JpQWdhV1lnS0NoMGVYQmxiMllnY0dWeVptOXliV0Z1WTJVZ0lUMDlJRndpZFc1a1pXWnBibVZrWENJZ0ppWWdjR1Z5Wm05eWJXRnVZMlVnSVQwOUlHNTFiR3dwSUNZbUlIQmxjbVp2Y20xaGJtTmxMbTV2ZHlrZ2UxeHVJQ0FnSUcxdlpIVnNaUzVsZUhCdmNuUnpJRDBnWm5WdVkzUnBiMjRvS1NCN1hHNGdJQ0FnSUNCeVpYUjFjbTRnY0dWeVptOXliV0Z1WTJVdWJtOTNLQ2s3WEc0Z0lDQWdmVHRjYmlBZ2ZTQmxiSE5sSUdsbUlDZ29kSGx3Wlc5bUlIQnliMk5sYzNNZ0lUMDlJRndpZFc1a1pXWnBibVZrWENJZ0ppWWdjSEp2WTJWemN5QWhQVDBnYm5Wc2JDa2dKaVlnY0hKdlkyVnpjeTVvY25ScGJXVXBJSHRjYmlBZ0lDQnRiMlIxYkdVdVpYaHdiM0owY3lBOUlHWjFibU4wYVc5dUtDa2dlMXh1SUNBZ0lDQWdjbVYwZFhKdUlDaG5aWFJPWVc1dlUyVmpiMjVrY3lncElDMGdiRzloWkZScGJXVXBJQzhnTVdVMk8xeHVJQ0FnSUgwN1hHNGdJQ0FnYUhKMGFXMWxJRDBnY0hKdlkyVnpjeTVvY25ScGJXVTdYRzRnSUNBZ1oyVjBUbUZ1YjFObFkyOXVaSE1nUFNCbWRXNWpkR2x2YmlncElIdGNiaUFnSUNBZ0lIWmhjaUJvY2p0Y2JpQWdJQ0FnSUdoeUlEMGdhSEowYVcxbEtDazdYRzRnSUNBZ0lDQnlaWFIxY200Z2FISmJNRjBnS2lBeFpUa2dLeUJvY2xzeFhUdGNiaUFnSUNCOU8xeHVJQ0FnSUd4dllXUlVhVzFsSUQwZ1oyVjBUbUZ1YjFObFkyOXVaSE1vS1R0Y2JpQWdmU0JsYkhObElHbG1JQ2hFWVhSbExtNXZkeWtnZTF4dUlDQWdJRzF2WkhWc1pTNWxlSEJ2Y25SeklEMGdablZ1WTNScGIyNG9LU0I3WEc0Z0lDQWdJQ0J5WlhSMWNtNGdSR0YwWlM1dWIzY29LU0F0SUd4dllXUlVhVzFsTzF4dUlDQWdJSDA3WEc0Z0lDQWdiRzloWkZScGJXVWdQU0JFWVhSbExtNXZkeWdwTzF4dUlDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUcxdlpIVnNaUzVsZUhCdmNuUnpJRDBnWm5WdVkzUnBiMjRvS1NCN1hHNGdJQ0FnSUNCeVpYUjFjbTRnYm1WM0lFUmhkR1VvS1M1blpYUlVhVzFsS0NrZ0xTQnNiMkZrVkdsdFpUdGNiaUFnSUNCOU8xeHVJQ0FnSUd4dllXUlVhVzFsSUQwZ2JtVjNJRVJoZEdVb0tTNW5aWFJVYVcxbEtDazdYRzRnSUgxY2JseHVmU2t1WTJGc2JDaDBhR2x6S1R0Y2JseHVMeXBjYmk4dlFDQnpiM1Z5WTJWTllYQndhVzVuVlZKTVBYQmxjbVp2Y20xaGJtTmxMVzV2ZHk1dFlYQmNiaW92WEc0aVhYMD0iLCIvLyBnYW1lc3RhdGUuanNcclxuLy8gXHJcblxyXG4kLmNvb2tpZS5qc29uID0gdHJ1ZTtcclxuXHJcbnZhciBnYW1lU3RhdGUgPVxyXG5tb2R1bGUuZXhwb3J0cyA9IHtcclxuXHRsb2FkOiBmdW5jdGlvbigpIHtcclxuXHRcdHZhciBzYXZlZCA9ICQuY29va2llKHtwYXRoOiBCQVNFVVJMfSk7XHJcblx0XHRnYW1lU3RhdGUucGxheWVyU3ByaXRlID0gc2F2ZWQucGxheWVyU3ByaXRlO1xyXG5cdFx0Z2FtZVN0YXRlLm1hcFRyYW5zaXRpb24gPSBzYXZlZC5tYXBUcmFuc2l0aW9uO1xyXG5cdFx0XHJcblx0XHRnYW1lU3RhdGUuaW5mb2RleC5yZWdpc3RlciA9IEpTT04ucGFyc2UoJC5iYXNlNjQuZGVjb2RlKHNhdmVkLmluZm9kZXgpKTtcclxuXHR9LFxyXG5cdFxyXG5cdHNhdmVMb2NhdGlvbjogZnVuY3Rpb24ob3B0cykge1xyXG5cdFx0Ly9JbnNlcnQgaXRlbXMgdG8gYmUgc2F2ZWQgaGVyZVxyXG5cdFx0dmFyIG8gPSB7XHJcblx0XHRcdG5leHRNYXA6IG9wdHMubWFwIHx8IG9wdHMubmV4dE1hcCB8fCBnYW1lU3RhdGUubWFwVHJhbnNpdGlvbi5uZXh0TWFwLFxyXG5cdFx0XHR3YXJwOiBvcHRzLndhcnAgfHwgZ2FtZVN0YXRlLm1hcFRyYW5zaXRpb24ud2FycCxcclxuXHRcdFx0YW5pbU92ZXJyaWRlOiBcclxuXHRcdFx0XHQob3B0cy5hbmltICE9PSB1bmRlZmluZWQpPyBvcHRzLmFuaW0gOiBcclxuXHRcdFx0XHQob3B0cy5hbmltT3ZlcnJpZGUgIT09IHVuZGVmaW5lZCk/IG9wdHMuYW5pbU92ZXJyaWRlIDogXHJcblx0XHRcdFx0Z2FtZVN0YXRlLm1hcFRyYW5zaXRpb24uYW5pbU92ZXJyaWRlLFxyXG5cdFx0fVxyXG5cdFx0JC5jb29raWUoXCJtYXBUcmFuc2l0aW9uXCIsIG8sIHtwYXRoOiBCQVNFVVJMfSk7XHJcblx0fSxcclxuXHRcclxuXHQvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblx0Ly8gTWFwIFRyYW5zaXRpb25cclxuXHRtYXBUcmFuc2l0aW9uIDoge1xyXG5cdFx0bmV4dE1hcCA6IFwiaUNodXJjaE9mSGVsaXhcIixcclxuXHRcdHdhcnA6IDB4MTAsXHJcblx0XHRhbmltT3ZlcnJpZGU6IDAsXHJcblx0fSxcclxuXHRcclxuXHRwbGF5ZXJTcHJpdGUgOiBcIm1lbG9keVtoZ192ZXJ0bWl4LTMyXS5wbmdcIixcclxuXHRcclxufTtcclxuXHJcbi8vIEluZm9kZXggZnVuY3Rpb25zXHJcbmdhbWVTdGF0ZS5pbmZvZGV4ID0ge1xyXG5cdHJlZ2lzdGVyOiB7fSxcclxuXHRzZWVuOiAwLFxyXG5cdGZvdW5kOiAwLFxyXG5cdFxyXG5cdF9fbWFyazogZnVuY3Rpb24oY29udGFpbmVyLCB1cmwsIG1hcmspIHtcclxuXHRcdHZhciBjb21wID0gdXJsLnNoaWZ0KCk7XHJcblx0XHR2YXIgb2xkID0gY29udGFpbmVyW2NvbXBdO1xyXG5cdFx0aWYgKCF1cmwubGVuZ3RoKSB7XHJcblx0XHRcdC8vIFdlJ3JlIGF0IHRoZSBlbmQgb2YgdGhlIFVSTCwgdGhpcyBzaG91bGQgYmUgYSBsZWFmIG5vZGVcclxuXHRcdFx0aWYgKCFvbGQpIG9sZCA9IGNvbnRhaW5lcltjb21wXSA9IDA7XHJcblx0XHRcdGlmICh0eXBlb2Ygb2xkICE9PSBcIm51bWJlclwiKSBcclxuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJVUkwgZG9lcyBub3QgcG9pbnQgdG8gbGVhZiBub2RlIVwiKTtcclxuXHRcdFx0Y29udGFpbmVyW2NvbXBdIHw9IG1hcms7XHJcblx0XHRcdHJldHVybiBvbGQ7XHJcblx0XHRcdFxyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0Ly9TdGlsbCBnb2luZyBkb3duIHRoZSB1cmxcclxuXHRcdFx0aWYgKCFvbGQpIG9sZCA9IGNvbnRhaW5lcltjb21wXSA9IHt9O1xyXG5cdFx0XHRyZXR1cm4gdGhpcy5fX21hcmsob2xkLCB1cmwsIG1hcmspOyAvL3RhaWwgY2FsbFxyXG5cdFx0fVxyXG5cdH0sXHJcblx0XHJcblx0bWFya1NlZW46IGZ1bmN0aW9uKHVybCkge1xyXG5cdFx0Ly8gdmFyIGNvbXAgPSB1cmwuc3BsaXQoXCIuXCIpO1xyXG5cdFx0Ly8gdmFyIHJlZyA9IGdhbWVTdGF0ZS5pbmZvZGV4LnJlZ2lzdGVyOyAvL1t1cmxdIHw9IDE7IC8vc2V0IHRvIGF0IGxlYXN0IDFcclxuXHRcdFxyXG5cdFx0Ly8gZm9yICh2YXIgaSA9IDA7IGkgPCBjb21wLmxlbmd0aC0xOyBpKyspIHtcclxuXHRcdC8vIFx0cmVnID0gcmVnW2NvbXBbaV1dIHx8IHt9O1xyXG5cdFx0Ly8gfVxyXG5cdFx0Ly8gcmVnW11cclxuXHRcdHZhciByZXMgPSB0aGlzLl9fbWFyayh0aGlzLnJlZ2lzdGVyLCB1cmwuc3BsaXQoXCIuXCIpLCAxKTtcclxuXHRcdGlmIChyZXMgPT0gMCkgeyB0aGlzLnNlZW4rKzsgfVxyXG5cdH0sXHJcblx0bWFya0ZvdW5kOiBmdW5jdGlvbih1cmwpIHtcclxuXHRcdC8vIGdhbWVTdGF0ZS5pbmZvZGV4W3VybF0gfD0gMjsgLy9zZXQgdG8gYXQgbGVhc3QgMlxyXG5cdFx0dmFyIHJlcyA9IHRoaXMuX19tYXJrKHRoaXMucmVnaXN0ZXIsIHVybC5zcGxpdChcIi5cIiksIDIpO1xyXG5cdFx0aWYgKHJlcyA9PSAwKSB7IHRoaXMuc2VlbisrOyB0aGlzLmZvdW5kKys7IH1cclxuXHRcdGVsc2UgaWYgKHJlcyA9PSAxKSB7IHRoaXMuZm91bmQrKzsgfVxyXG5cdH0sXHJcblx0XHJcblx0XHJcblx0XHJcbn07IiwiLy8gZ2xvYmFscy5qc1xyXG5cclxud2luZG93LkNPTkZJRyA9IHtcclxuXHRzcGVlZCA6IHtcclxuXHRcdHBhdGhpbmc6IDIuNSxcclxuXHRcdGFuaW1hdGlvbjogMzAsXHJcblx0XHRidWJibGVwb3A6IDkuNSxcclxuXHR9LFxyXG5cdHRpbWVvdXQgOiB7XHJcblx0XHR3YWxrQ29udHJvbCA6IDAuMSxcclxuXHR9XHJcbn07XHJcblxyXG53aW5kb3cuREVCVUcgPSB7fTtcclxuXHJcbi8vT24gUmVhZHlcclxuJChmdW5jdGlvbigpe1xyXG5cdFxyXG59KTtcclxuXHJcbndpbmRvdy5Tb3VuZE1hbmFnZXIgPSByZXF1aXJlKFwiLi9tYW5hZ2Vycy9zb3VuZG1hbmFnZXJcIik7XHJcbndpbmRvdy5NYXBNYW5hZ2VyID0gcmVxdWlyZShcIi4vbWFuYWdlcnMvbWFwbWFuYWdlclwiKTtcclxud2luZG93LkFjdG9yU2NoZWR1bGVyID0gcmVxdWlyZShcIi4vbWFuYWdlcnMvYWN0b3JzY2hlZHVsZXJcIik7XHJcbndpbmRvdy5HQyA9IHJlcXVpcmUoXCIuL21hbmFnZXJzL2dhcmJhZ2UtY29sbGVjdG9yXCIpO1xyXG53aW5kb3cuVUkgPSByZXF1aXJlKFwiLi9tYW5hZ2Vycy91aS1tYW5hZ2VyXCIpO1xyXG4vLyB3aW5kb3cuQ2hhdCA9IHJlcXVpcmUoXCIuL2NoYXQvY29yZS5qc1wiKTtcclxuXHJcbndpbmRvdy5jdXJyZW50TWFwID0gbnVsbDtcclxud2luZG93LmdhbWVTdGF0ZSA9IHJlcXVpcmUoXCIuL2dhbWVzdGF0ZVwiKTtcclxuIiwiLy8gYWN0b3JzY2hlZHVsZXIuanNcclxuLy8gRGVmaW5lcyB0aGUgQWN0b3IgU2NoZWR1bGVyXHJcblxyXG52YXIgaW5oZXJpdHMgPSByZXF1aXJlKFwiaW5oZXJpdHNcIik7XHJcbnZhciBleHRlbmQgPSByZXF1aXJlKFwiZXh0ZW5kXCIpO1xyXG5cclxuZnVuY3Rpb24gQWN0b3JTY2hlZHVsZXIoKSB7XHJcblx0XHJcbn1cclxuZXh0ZW5kKEFjdG9yU2NoZWR1bGVyLnByb3RvdHlwZSwge1xyXG5cdGFjdG9ybWFwIDoge30sXHJcblx0X19mb3JjZURhdGU6IG51bGwsXHJcblx0XHJcblx0Z2V0VGltZXN0YW1wOiBmdW5jdGlvbigpe1xyXG5cdFx0dmFyIGRhdGUgPSB0aGlzLl9fZm9yY2VEYXRlIHx8IG5ldyBEYXRlKCk7XHJcblx0XHRyZXR1cm4gKGRhdGUuZ2V0SG91cnMoKSAqIDEwMCkgKyAoZGF0ZS5nZXRIb3VycygpKTtcclxuXHR9LFxyXG5cdFxyXG5cdC8qKiBDcmVhdGVzIGEgc2NoZWR1bGUgZm9yIGFuIGFjdG9yIGdpdmVuIGEgbGlzdCBvZiBsb2NhdGlvbnMuXHJcblx0ICogQSBTY2hlZHVsZSBpcyBhIGxpc3Qgb2YgdGltZXMgdG8gbG9jYXRpb25zIHNob3dpbmcgd2hlbiBhIGdpdmVuIGFjdG9yXHJcblx0ICogaXMgaW4gYSBtYXAgZm9yIHRoaXMgZGF5LiBQYXNzZWQgaXMgYSBsaXN0IG9mIGxvY2F0aW9ucyB0aGF0IHRoZSBhY3RvclxyXG5cdCAqIG1pZ2h0IHZpc2l0IGluIGEgbm9ybWFsIGRheS4gTm90IHBhc3NlZCBhcmUgcGxhY2VzIHRoYXQgdGhlIGFjdG9yIHdpbGwgXHJcblx0ICogYWx3YXlzIGJlIGF0IGEgZ2l2ZW4gdGltZSAodW5sZXNzIHRoZSBhY3RvciByYW5kb21seSBzaG93cyB1cCB0aGVyZSBub3JtYWxseSkuXHJcblx0ICogVGhpcyBmdW5jdGlvbiBjcmVhdGVzIGEgcmFuZG9taXplZCBzY2hlZHVsZSwgd2l0aCByYW5kb21pemVkIGFtb3VudHMgb2ZcclxuXHQgKiB0aW1lIHNwZW50IGF0IGFueSBnaXZlbiBwbGFjZS5cclxuXHQgKi9cclxuXHRjcmVhdGVTY2hlZHVsZTogZnVuY3Rpb24obWUsIHNjaGVkdWxlRGVmKSB7XHJcblx0XHQvL0dyYWIgbWVtb2l6ZWQgc2NoZWR1bGVcclxuXHRcdHZhciBzY2hlZHVsZSA9IHRoaXMuYWN0b3JtYXBbbWUuaWRdO1xyXG5cdFx0aWYgKCFzY2hlZHVsZSkgeyAvL0lmIG5vIHN1Y2ggdGhpbmcsIG9yIGV4cGlyZWRcclxuXHRcdFx0c2NoZWR1bGUgPSB7fTtcclxuXHRcdFx0Zm9yICh2YXIgdGltZVJhbmdlIGluIHNjaGVkdWxlRGVmKSB7XHJcblx0XHRcdFx0dmFyIGxvY2F0aW9uID0gc2NoZWR1bGVEZWZbdGltZVJhbmdlXTtcclxuXHRcdFx0XHR0aW1lUmFuZ2UgPSBOdW1iZXIodGltZVJhbmdlKTtcclxuXHRcdFx0XHRcclxuXHRcdFx0XHQvL1Byb2Nlc3NcclxuXHRcdFx0XHRpZiAodHlwZW9mIGxvY2F0aW9uID09IFwic3RyaW5nXCIpIHtcclxuXHRcdFx0XHRcdHNjaGVkdWxlW3RpbWVSYW5nZV0gPSBsb2NhdGlvbjtcclxuXHRcdFx0XHR9IFxyXG5cdFx0XHRcdGVsc2UgaWYgKCQuaXNBcnJheShsb2NhdGlvbikpIHtcclxuXHRcdFx0XHRcdHZhciBpID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogbG9jYXRpb24ubGVuZ3RoKTtcclxuXHRcdFx0XHRcdHNjaGVkdWxlW3RpbWVSYW5nZV0gPSBsb2NhdGlvbltpXTtcclxuXHRcdFx0XHR9IFxyXG5cdFx0XHRcdGVsc2UgaWYgKGxvY2F0aW9uID09PSBudWxsKSB7XHJcblx0XHRcdFx0XHRzY2hlZHVsZVt0aW1lUmFuZ2VdID0gbnVsbDtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdFx0XHJcblx0XHRcdC8vIFNwcmVhZCB0aGUgc2NoZWR1bGUgZXZlblxyXG5cdFx0XHR2YXIgaWQgPSBudWxsO1xyXG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IDI0MDA7IGkrKykge1xyXG5cdFx0XHRcdGlmIChpICUgMTAwID4gNTkpIHsgaSArPSAxMDAgLSAoaSUxMDApOyB9IC8vc2tpcCA2MC05OSBtaW51dGVzXHJcblx0XHRcdFx0aWYgKHNjaGVkdWxlW2ldICE9PSB1bmRlZmluZWQpIHtcclxuXHRcdFx0XHRcdGlkID0gc2NoZWR1bGVbaV07XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdHNjaGVkdWxlW2ldID0gaWQ7XHJcblx0XHRcdH1cclxuXHRcdFx0XHJcblx0XHRcdHRoaXMuYWN0b3JtYXBbbWUuaWRdID0gc2NoZWR1bGU7XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gc2NoZWR1bGU7XHJcblx0fSxcclxufSk7XHJcbm1vZHVsZS5leHBvcnRzID0gbmV3IEFjdG9yU2NoZWR1bGVyKCk7XHJcbiIsIi8vIGdhcmJhZ2UtY29sbGVjdG9yLmpzXHJcbi8vIEFsbG9jYXRlcyBhbGwgdGhlIHZhcmlvdXMgZGlzcG9zYWJsZSBpdGVtcywgc3VjaCBhcyBnZW9tZXRyeSBhbmQgbGlzdGVuZXJzLCBmb3JcclxuLy8gbGF0ZXIgZGlzcG9zYWwuXHJcblxyXG52YXIgUkVWT0tFX1VSTFMgPSAhIVVSTC5yZXZva2VPYmplY3RVUkw7XHJcblxyXG5cclxuZnVuY3Rpb24gR2FyYmFnZUNvbGxlY3RvcigpIHtcclxuXHR0aGlzLmJpbnMgPSB7fTtcclxuXHR0aGlzLmFsbG9jYXRlQmluKFwiX2RlZmF1bHRcIik7XHJcbn1cclxuXHJcbkdhcmJhZ2VDb2xsZWN0b3IucHJvdG90eXBlLmFsbG9jYXRlQmluID0gZnVuY3Rpb24oYmluSWQpIHtcclxuXHR2YXIgYmluID0gdGhpcy5iaW5zW2JpbklkXSA9IG5ldyBHYXJiYWdlQmluKCk7XHJcbn1cclxuXHJcbkdhcmJhZ2VDb2xsZWN0b3IucHJvdG90eXBlLmNvbGxlY3QgPSBmdW5jdGlvbihvYmosIGJpbklkKXtcclxuXHRpZiAoIWJpbklkKSBiaW5JZCA9IFwiX2RlZmF1bHRcIjtcclxuXHR2YXIgYmluID0gdGhpcy5iaW5zW2JpbklkXTtcclxuXHRpZiAoIWJpbikge1xyXG5cdFx0Y29uc29sZS53YXJuKFwiW0dDXSBCaW4gZG9lcyBub3QgZXhpc3QhIFB1dHRpbmcgb2JqZWN0IGluIGRlZmF1bHQgYmluLiBCaW5JRDpcIiwgYmluSUQpO1xyXG5cdFx0YmluID0gdGhpcy5iaW5zW1wiX2RlZmF1bHRcIl07XHJcblx0fVxyXG5cdGJpbi5jb2xsZWN0KG9iaik7XHJcbn1cclxuXHJcbkdhcmJhZ2VDb2xsZWN0b3IucHJvdG90eXBlLmNvbGxlY3RVUkwgPSBmdW5jdGlvbihvYmosIGJpbklkKXtcclxuXHRpZiAoIWJpbklkKSBiaW5JZCA9IFwiX2RlZmF1bHRcIjtcclxuXHR2YXIgYmluID0gdGhpcy5iaW5zW2JpbklkXTtcclxuXHRpZiAoIWJpbikge1xyXG5cdFx0Y29uc29sZS53YXJuKFwiW0dDXSBCaW4gZG9lcyBub3QgZXhpc3QhIFB1dHRpbmcgb2JqZWN0IGluIGRlZmF1bHQgYmluLiBCaW5JRDpcIiwgYmluSUQpO1xyXG5cdFx0YmluID0gdGhpcy5iaW5zW1wiX2RlZmF1bHRcIl07XHJcblx0fVxyXG5cdGJpbi5jb2xsZWN0VVJMKG9iaik7XHJcbn1cclxuXHJcbkdhcmJhZ2VDb2xsZWN0b3IucHJvdG90eXBlLmdldEJpbiA9IGZ1bmN0aW9uKGJpbklkKSB7XHJcblx0aWYgKCFiaW5JZCkgYmluSWQgPSBcIl9kZWZhdWx0XCI7XHJcblx0dmFyIGJpbiA9IHRoaXMuYmluc1tiaW5JZF07XHJcblx0aWYgKCFiaW4pIHtcclxuXHRcdGNvbnNvbGUud2FybihcIltHQ10gQmluIGRvZXMgbm90IGV4aXN0ISBHZXR0aW5nIGRlZmF1bHQgYmluLiBCaW5JRDpcIiwgYmluSUQpO1xyXG5cdFx0YmluID0gdGhpcy5iaW5zW1wiX2RlZmF1bHRcIl07XHJcblx0fVxyXG5cdHJldHVybiBiaW47XHJcbn1cclxuXHJcbkdhcmJhZ2VDb2xsZWN0b3IucHJvdG90eXBlLmRpc3Bvc2UgPSBmdW5jdGlvbihiaW5JZCkge1xyXG5cdGlmICghYmluSWQpIGJpbklkID0gXCJfZGVmYXVsdFwiO1xyXG5cdHZhciBiaW4gPSB0aGlzLmJpbnNbYmluSWRdO1xyXG5cdGlmICghYmluKSB7XHJcblx0XHRjb25zb2xlLndhcm4oXCJbR0NdIEJpbiBkb2VzIG5vdCBleGlzdCEgQ2Fubm90IGRpc3Bvc2UhIEJpbklEOlwiLCBiaW5JRCk7XHJcblx0XHRyZXR1cm47XHJcblx0fVxyXG5cdFxyXG5cdGJpbi5kaXNwb3NlKCk7XHJcblx0XHJcblx0YmluID0gbnVsbDtcclxuXHRkZWxldGUgdGhpcy5iaW5zW2JpbklkXTtcclxufVxyXG5cclxuXHJcblxyXG5mdW5jdGlvbiBHYXJiYWdlQmluKCkge1xyXG5cdHRoaXMuZGlzcG9zYWwgPSBbXTsgLy9PYmplY3RzIHRoYXQgY2FuIGhhdmUgXCJkaXNwb3NlXCIgY2FsbGVkIG9uIHRoZW1cclxuXHR0aGlzLmxpc3RlbmVycyA9IFtdOyAvL09iamVjdHMgd2l0aCBsaXN0ZW5lcnMgYXR0YWNoZWQgdG8gdGhlbVxyXG5cdHRoaXMudGFncyA9IFtdOyAvL1NjcmlwdCB0YWdzIGFuZCBvdGhlciBkaXNwb3NhYmxlIHRhZ3NcclxuXHR0aGlzLnNwZWNpZmljTGlzdGVuZXJzID0gW107IC8vU3BlY2lmaWMgbGlzdGVuZXJzXHJcblx0XHJcblx0dGhpcy5ibG9idXJscyA9IFtdOyAvL09iamVjdCBVUkxzIHRoYXQgY2FuIGJlIHJldm9rZWQgd2l0aCBVUkwucmV2b2tlT2JqZWN0VVJMXHJcbn1cclxuR2FyYmFnZUJpbi5wcm90b3R5cGUgPSB7XHJcblx0Y29sbGVjdDogZnVuY3Rpb24ob2JqKSB7XHJcblx0XHRpZiAob2JqLmRpc3Bvc2UpIHtcclxuXHRcdFx0dGhpcy5kaXNwb3NhbC5wdXNoKG9iaik7XHJcblx0XHR9XHJcblx0XHRpZiAob2JqLnJlbW92ZUFsbExpc3RlbmVycykge1xyXG5cdFx0XHR0aGlzLmxpc3RlbmVycy5wdXNoKG9iaik7XHJcblx0XHR9XHJcblx0XHRpZiAoKG9iaiBpbnN0YW5jZW9mICQpIHx8IG9iai5ub2RlTmFtZSkge1xyXG5cdFx0XHR0aGlzLnRhZ3MucHVzaChvYmopO1xyXG5cdFx0fVxyXG5cdH0sXHJcblx0XHJcblx0Y29sbGVjdFVSTDogZnVuY3Rpb24odXJsKSB7XHJcblx0XHRpZiAoIVJFVk9LRV9VUkxTKSByZXR1cm47XHJcblx0XHRpZiAodHlwZW9mIHVybCAhPSBcInN0cmluZ1wiKSByZXR1cm47XHJcblx0XHR0aGlzLmJsb2J1cmxzLnB1c2godXJsKTtcclxuXHR9LFxyXG5cdFxyXG5cdGNvbGxlY3RMaXN0ZW5lcjogZnVuY3Rpb24ob2JqLCBldnQsIGxpc3RlbmVyKSB7XHJcblx0XHR0aGlzLnNwZWNpZmljTGlzdGVuZXJzLnB1c2goe1xyXG5cdFx0XHRvYmo6IG9iaiwgICBldnQ6IGV2dCwgICBsOiBsaXN0ZW5lclxyXG5cdFx0fSk7XHJcblx0fSxcclxuXHRcclxuXHRkaXNwb3NlOiBmdW5jdGlvbigpIHtcclxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5kaXNwb3NhbC5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHR0aGlzLmRpc3Bvc2FsW2ldLmRpc3Bvc2UoKTtcclxuXHRcdFx0dGhpcy5kaXNwb3NhbFtpXSA9IG51bGw7XHJcblx0XHR9XHJcblx0XHR0aGlzLmRpc3Bvc2FsID0gbnVsbDtcclxuXHRcdFxyXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmxpc3RlbmVycy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHR0aGlzLmxpc3RlbmVyc1tpXS5yZW1vdmVBbGxMaXN0ZW5lcnMoKTtcclxuXHRcdFx0dGhpcy5saXN0ZW5lcnNbaV0gPSBudWxsO1xyXG5cdFx0fVxyXG5cdFx0dGhpcy5saXN0ZW5lcnMgPSBudWxsO1xyXG5cdFx0XHJcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMudGFncy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHQkKHRoaXMudGFnc1tpXSkucmVtb3ZlQXR0cihcInNyY1wiKS5yZW1vdmUoKTtcclxuXHRcdFx0dGhpcy50YWdzW2ldID0gbnVsbDtcclxuXHRcdH1cclxuXHRcdHRoaXMudGFncyA9IG51bGw7XHJcblx0XHRcclxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5zcGVjaWZpY0xpc3RlbmVycy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHR2YXIgbyA9IHRoaXMuc3BlY2lmaWNMaXN0ZW5lcnNbaV07XHJcblx0XHRcdG8ub2JqLnJlbW92ZUxpc3RlbmVyKG8uZXZ0LCBvLmwpO1xyXG5cdFx0XHR0aGlzLnNwZWNpZmljTGlzdGVuZXJzW2ldID0gbnVsbDtcclxuXHRcdFx0byA9IG51bGw7XHJcblx0XHR9XHJcblx0XHR0aGlzLnNwZWNpZmljTGlzdGVuZXJzID0gbnVsbDtcclxuXHRcdFxyXG5cdFx0XHJcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuYmxvYnVybHMubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0VVJMLnJldm9rZU9iamVjdFVSTCh0aGlzLmJsb2J1cmxzW2ldKTtcclxuXHRcdFx0dGhpcy5ibG9idXJsc1tpXSA9IG51bGw7XHJcblx0XHR9XHJcblx0XHR0aGlzLmJsb2J1cmxzID0gbnVsbDtcclxuXHR9LFxyXG59O1xyXG5cclxuXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBHYXJiYWdlQ29sbGVjdG9yKCk7IiwiLy8gbWFwbWFuYWdlci5qc1xyXG4vL1xyXG5cclxudmFyIGluaGVyaXRzID0gcmVxdWlyZShcImluaGVyaXRzXCIpO1xyXG52YXIgZXh0ZW5kID0gcmVxdWlyZShcImV4dGVuZFwiKTtcclxudmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoXCJldmVudHNcIikuRXZlbnRFbWl0dGVyO1xyXG52YXIgY29udHJvbGxlciA9IHJlcXVpcmUoXCJ0cHAtY29udHJvbGxlclwiKTtcclxuXHJcbnZhciBNYXAgPSByZXF1aXJlKFwiLi4vbWFwLmpzXCIpO1xyXG52YXIgRG9yaXRvRHVuZ2VvbiA9IHJlcXVpcmUoXCIuLi9tb2RlbC9kdW5nZW9uLW1hcC5qc1wiKTtcclxuXHJcbmZ1bmN0aW9uIE1hcE1hbmFnZXIoKSB7XHJcblx0XHJcbn1cclxuaW5oZXJpdHMoTWFwTWFuYWdlciwgRXZlbnRFbWl0dGVyKTtcclxuZXh0ZW5kKE1hcE1hbmFnZXIucHJvdG90eXBlLCB7XHJcblx0aW5fdHJhbnNpdGlvbjogbnVsbCxcclxuXHRuZXh0TWFwOiBudWxsLFxyXG5cdGxvYWRFcnJvcjogbnVsbCxcclxuXHRcclxuXHR0cmFuc2l0aW9uVG8gOiBmdW5jdGlvbihtYXBpZCwgd2FycGluZGV4LCBhbmltT3ZlcnJpZGUpIHtcclxuXHRcdHZhciBzZWxmID0gdGhpcztcclxuXHRcdGlmICh0aGlzLmluX3RyYW5zaXRpb24pIHtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihcIkNhbGxlZCBNYXAgVHJhbnNpdGlvbiB3aGlsZSBhbHJlYWR5IGluIGEgbWFwIHRyYW5zaXRpb24hXCIsIG1hcGlkLCB3YXJwaW5kZXgpO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblx0XHR0aGlzLmluX3RyYW5zaXRpb24gPSB0cnVlO1xyXG5cclxuXHRcdGNvbnRyb2xsZXIucHVzaElucHV0Q29udGV4dChcIl9tYXBfd2FycGluZ19cIik7XHJcblx0XHRpZiAobWFwaWQgIT09IHVuZGVmaW5lZCB8fCB3YXJwaW5kZXggIT09IHVuZGVmaW5lZCkge1xyXG5cdFx0XHRnYW1lU3RhdGUubWFwVHJhbnNpdGlvbi5uZXh0TWFwID0gbWFwaWQgPSBtYXBpZCB8fCBjdXJyZW50TWFwLmlkO1xyXG5cdFx0XHRnYW1lU3RhdGUubWFwVHJhbnNpdGlvbi53YXJwID0gd2FycGluZGV4IHx8IDA7XHJcblx0XHRcdGdhbWVTdGF0ZS5tYXBUcmFuc2l0aW9uLmFuaW1PdmVycmlkZSA9IGFuaW1PdmVycmlkZTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdG1hcGlkID0gZ2FtZVN0YXRlLm1hcFRyYW5zaXRpb24ubmV4dE1hcDtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0Y29uc29sZS53YXJuKFwiQmVnaW5uaW5nIFRyYW5zaXRpb24gdG9cIiwgbWFwaWQpO1xyXG5cdFx0dmFyIGxvYWRDYWxsID0gX19iZWdpbkxvYWQ7XHJcblx0XHR2YXIgZmFkZU91dERvbmUgPSBmYWxzZTtcclxuXHRcdHZhciBmaW5pc2hlZERvd25sb2FkID0gZmFsc2U7XHJcblx0XHRcclxuXHRcdGlmIChjdXJyZW50TWFwICYmIGN1cnJlbnRNYXAuaWQgPT0gbWFwaWQpIHtcclxuXHRcdFx0Ly8gTm8gbmVlZCB0byBkb3dubG9hZCB0aGUgbmV4dCBtYXBcclxuXHRcdFx0bG9hZENhbGwgPSBfX2luTWFwV2FycDtcclxuXHRcdFx0ZmluaXNoZWREb3dubG9hZCA9IHRydWU7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHR2YXIgbm1hcCA9IHRoaXMubmV4dE1hcCA9IG5ldyBNYXAobWFwaWQpO1xyXG5cdFx0XHRubWFwLm9uKFwibG9hZC1lcnJvclwiLCBfX2xvYWRFcnJvcik7XHJcblx0XHRcdG5tYXAub24oXCJwcm9ncmVzc1wiLCBfX3Byb2dyZXNzVXBkYXRlKTtcclxuXHRcdFx0bm1hcC5vbmNlKFwiZG93bmxvYWRlZFwiLCBfX2ZpbmlzaGVkRG93bmxvYWQpO1xyXG5cdFx0XHRubWFwLm9uY2UoXCJtYXAtc3RhcnRlZFwiLCBfX21hcFN0YXJ0KTtcclxuXHRcdFx0XHJcblx0XHRcdG5tYXAuZG93bmxvYWQoKTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0VUkuZmFkZU91dChmdW5jdGlvbigpe1xyXG5cdFx0XHRVSS5zaG93TG9hZGluZ0FqYXgoKTtcclxuXHRcdFx0ZmFkZU91dERvbmUgPSB0cnVlO1xyXG5cdFx0XHRpZiAoZmluaXNoZWREb3dubG9hZCAmJiBmYWRlT3V0RG9uZSkge1xyXG5cdFx0XHRcdGxvYWRDYWxsKCk7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cdFx0XHJcblx0XHRyZXR1cm47XHJcblx0XHQvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHRcdFxyXG5cdFx0ZnVuY3Rpb24gX19pbk1hcFdhcnAoKSB7XHJcblx0XHRcdGNvbnNvbGUubG9nKFwiSW4tbWFwIHdhcnAhXCIpO1xyXG5cdFx0XHR2YXIgd2FycCA9IGdhbWVTdGF0ZS5tYXBUcmFuc2l0aW9uLndhcnAgfHwgMDtcclxuXHRcdFx0d2FycCA9IGN1cnJlbnRNYXAubWV0YWRhdGEud2FycHNbd2FycF07XHJcblx0XHRcdGlmICghd2FycCkge1xyXG5cdFx0XHRcdGNvbnNvbGUud2FybihcIlJlcXVlc3RlZCB3YXJwIGxvY2F0aW9uIGRvZXNuJ3QgZXhpc3Q6XCIsIHdpbmRvdy50cmFuc2l0aW9uX3dhcnB0byk7XHJcblx0XHRcdFx0d2FycCA9IHRoaXMubWV0YWRhdGEud2FycHNbMF07XHJcblx0XHRcdH1cclxuXHRcdFx0aWYgKCF3YXJwKSB0aHJvdyBuZXcgRXJyb3IoXCJUaGlzIG1hcCBoYXMgbm8gd2FycHMhIVwiKTtcclxuXHRcdFx0XHJcblx0XHRcdHBsYXllci53YXJwVG8od2FycCk7XHJcblx0XHRcdGN1cnJlbnRNYXAuZXZlbnRNYXAucHV0KHBsYXllci5sb2NhdGlvbi54LCBwbGF5ZXIubG9jYXRpb24ueSwgcGxheWVyKTtcclxuXHRcdFx0XHJcblx0XHRcdF9fbWFwU3RhcnQoKTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0Ly8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblx0XHRcclxuXHRcdGZ1bmN0aW9uIF9fbG9hZEVycm9yKGUpIHtcclxuXHRcdFx0c2VsZi5uZXh0TWFwLnJlbW92ZUxpc3RlbmVyKFwibG9hZC1lcnJvclwiLCBfX2xvYWRFcnJvcik7XHJcblx0XHRcdHNlbGYubmV4dE1hcC5yZW1vdmVMaXN0ZW5lcihcInByb2dyZXNzXCIsIF9fcHJvZ3Jlc3NVcGRhdGUpO1xyXG5cdFx0XHRzZWxmLm5leHRNYXAucmVtb3ZlTGlzdGVuZXIoXCJkb3dubG9hZGVkXCIsIF9fZmluaXNoZWREb3dubG9hZCk7XHJcblx0XHRcdHNlbGYubmV4dE1hcC5yZW1vdmVMaXN0ZW5lcihcIm1hcC1zdGFydGVkXCIsIF9fbWFwU3RhcnQpO1xyXG5cdFx0XHRcclxuXHRcdFx0c2VsZi5uZXh0TWFwID0gbmV3IERvcml0b0R1bmdlb24oKTtcclxuXHRcdFx0c2VsZi5uZXh0TWFwLm9uKFwibG9hZC1lcnJvclwiLCBfX2xvYWRFcnJvcik7XHJcblx0XHRcdHNlbGYubmV4dE1hcC5vbmNlKFwibWFwLXN0YXJ0ZWRcIiwgX19tYXBTdGFydCk7XHJcblx0XHRcdFxyXG5cdFx0XHRmaW5pc2hlZERvd25sb2FkID0gdHJ1ZTtcclxuXHRcdFx0aWYgKGZpbmlzaGVkRG93bmxvYWQgJiYgZmFkZU91dERvbmUpIHtcclxuXHRcdFx0XHRfX2JlZ2luTG9hZCgpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHRmdW5jdGlvbiBfX3Byb2dyZXNzVXBkYXRlKGxvYWRlZCwgdG90YWwpIHtcclxuXHRcdFx0VUkudXBkYXRlTG9hZGluZ1Byb2dyZXNzKGxvYWRlZCwgdG90YWwpO1xyXG5cdFx0fVxyXG5cdFx0ZnVuY3Rpb24gX19maW5pc2hlZERvd25sb2FkKCkge1xyXG5cdFx0XHRmaW5pc2hlZERvd25sb2FkID0gdHJ1ZTtcclxuXHRcdFx0aWYgKGZpbmlzaGVkRG93bmxvYWQgJiYgZmFkZU91dERvbmUpIHtcclxuXHRcdFx0XHRfX2JlZ2luTG9hZCgpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHRmdW5jdGlvbiBfX2JlZ2luTG9hZCgpIHtcclxuXHRcdFx0aWYgKGN1cnJlbnRNYXApIGN1cnJlbnRNYXAuZGlzcG9zZSgpO1xyXG5cdFx0XHRjb25zb2xlLmxvZyhcIj09PT09PT09PT09PUJFR0lOIExPQUQ9PT09PT09PT09PT09PVwiKTtcclxuXHRcdFx0XHJcblx0XHRcdHNlbGYubmV4dE1hcC5yZW1vdmVMaXN0ZW5lcihcInByb2dyZXNzXCIsIF9fcHJvZ3Jlc3NVcGRhdGUpO1xyXG5cdFx0XHRzZWxmLm5leHRNYXAucmVtb3ZlTGlzdGVuZXIoXCJkb3dubG9hZGVkXCIsIF9fZmluaXNoZWREb3dubG9hZCk7XHJcblx0XHRcdFxyXG5cdFx0XHRjdXJyZW50TWFwID0gc2VsZi5uZXh0TWFwOyBzZWxmLm5leHRNYXAgPSBudWxsO1xyXG5cdFx0XHRcclxuXHRcdFx0aWYgKERFQlVHICYmIERFQlVHLnJ1bk9uTWFwUmVhZHkpXHJcblx0XHRcdFx0Y3VycmVudE1hcC5vbmNlKFwibWFwLXJlYWR5XCIsIERFQlVHLnJ1bk9uTWFwUmVhZHkpO1xyXG5cdFx0XHRcclxuXHRcdFx0Y3VycmVudE1hcC5sb2FkKCk7XHJcblx0XHR9XHJcblx0XHRmdW5jdGlvbiBfX21hcFN0YXJ0KCkge1xyXG5cdFx0XHRjdXJyZW50TWFwLnJlbW92ZUxpc3RlbmVyKFwibG9hZC1lcnJvclwiLCBfX2xvYWRFcnJvcik7XHJcblx0XHRcdFxyXG5cdFx0XHRVSS5oaWRlTG9hZGluZ0FqYXgoKTtcclxuXHRcdFx0VUkuZmFkZUluKCk7XHJcblx0XHRcdGNvbnRyb2xsZXIucmVtb3ZlSW5wdXRDb250ZXh0KFwiX21hcF93YXJwaW5nX1wiKTtcclxuXHRcdFx0c2VsZi5pbl90cmFuc2l0aW9uID0gZmFsc2U7XHJcblx0XHR9XHJcblx0fSxcclxufSk7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBNYXBNYW5hZ2VyKCk7IiwiLy8gc291bmRtYW5hZ2VyLmpzXHJcbi8vIERlZmluZXMgdGhlIFNvdW5kIE1hbmFnZXJcclxuXHJcbnZhciBpbmhlcml0cyA9IHJlcXVpcmUoXCJpbmhlcml0c1wiKTtcclxudmFyIGV4dGVuZCA9IHJlcXVpcmUoXCJleHRlbmRcIik7XHJcbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKFwiZXZlbnRzXCIpLkV2ZW50RW1pdHRlcjtcclxuXHJcbnZhciBhdWRpb0NvbnRleHQ7XHJcblxyXG52YXIgTUFYX01VU0lDID0gODsgLy9NYXggbnVtYmVyIG9mIG11c2ljIHRyYWNrcyBjYWNoZWQgaW4gbWVtb3J5XHJcbnZhciBNQVhfU09VTkRTID0gMTY7IC8vTWF4IG51bWJlciBvZiBzb3VuZHMgY2FjaGVkIGluIG1lbW9yeVxyXG5cclxuLyoqXHJcbiAqL1xyXG5mdW5jdGlvbiBTb3VuZE1hbmFnZXIoKSB7XHJcblx0dGhpcy50ZXN0U3VwcG9ydCgpO1xyXG5cdFxyXG5cdHRoaXMucHJlbG9hZFNvdW5kKFwid2Fsa19idW1wXCIpO1xyXG5cdHRoaXMucHJlbG9hZFNvdW5kKFwid2Fsa19qdW1wXCIpO1xyXG5cdHRoaXMucHJlbG9hZFNvdW5kKFwid2Fsa19qdW1wX2xhbmRcIik7XHJcblx0dGhpcy5wcmVsb2FkU291bmQoXCJleGl0X3dhbGtcIik7XHJcblx0XHJcblx0dGhpcy5yZWdpc3RlclByZWxvYWRlZE11c2ljKFwibV90b3Jud29ybGRcIiwge1xyXG5cdFx0dGFnOiBET1JJVE9fTVVTSUMsXHJcblx0XHRsb29wU3RhcnQ6IDEzLjMwNCxcclxuXHRcdGxvb3BFbmQ6IDIyLjg0MixcclxuXHR9KTtcclxufVxyXG5pbmhlcml0cyhTb3VuZE1hbmFnZXIsIEV2ZW50RW1pdHRlcik7XHJcbmV4dGVuZChTb3VuZE1hbmFnZXIucHJvdG90eXBlLCB7XHJcblx0c291bmRzIDoge30sXHJcblx0bXVzaWM6IHt9LFxyXG5cdGV4dCA6IG51bGwsXHJcblx0Y3JlYXRlQXVkaW86IG51bGwsXHJcblx0XHJcblx0X19tdXRlZF9tdXNpYzogZmFsc2UsXHJcblx0X19tdXRlZF9zb3VuZDogZmFsc2UsXHJcblx0X192b2xfbXVzaWM6IDAuNSxcclxuXHRfX3ZvbF9zb3VuZDogMC41LFxyXG5cdFxyXG5cdHRlc3RTdXBwb3J0IDogZnVuY3Rpb24oKSB7XHJcblx0XHR2YXIgdGVzdHNvdW5kID0gbmV3IEF1ZGlvKCk7XHJcblx0XHR2YXIgb2dnID0gdGVzdHNvdW5kLmNhblBsYXlUeXBlKFwiYXVkaW8vb2dnOyBjb2RlY3M9dm9yYmlzXCIpO1xyXG5cdFx0aWYgKG9nZykgdGhpcy5leHQgPSBcIi5vZ2dcIjtcclxuXHRcdGVsc2UgdGhpcy5leHQgPSBcIi5tcDNcIjtcclxuXHRcdFxyXG5cdFx0dHJ5IHtcclxuXHRcdFx0YXVkaW9Db250ZXh0ID0gbmV3ICh3aW5kb3cuQXVkaW9Db250ZXh0IHx8IHdpbmRvdy53ZWJraXRBdWRpb0NvbnRleHQpKCk7XHJcblx0XHRcdGlmIChhdWRpb0NvbnRleHQpIHtcclxuXHRcdFx0XHR0aGlzLmNyZWF0ZUF1ZGlvID0gY3JlYXRlQXVkaW9fV2ViQVBJO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdHRoaXMuY3JlYXRlQXVkaW8gPSBjcmVhdGVBdWRpb19UYWc7XHJcblx0XHRcdH1cclxuXHRcdFx0dGhpcy5fX2F1ZGlvQ29udGV4dCA9IGF1ZGlvQ29udGV4dDtcclxuXHRcdH0gY2F0Y2ggKGUpIHtcclxuXHRcdFx0dGhpcy5jcmVhdGVBdWRpbyA9IGNyZWF0ZUF1ZGlvX1RhZztcclxuXHRcdH1cclxuXHRcdFxyXG5cdH0sXHJcblx0XHJcblx0Ly8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8gTG9hZGluZyAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHRcclxuXHQvKiogTG9hZHMgc291bmQgZnJvbSB0aGUgc2VydmVyLCB1c2VkIGFzIHBhcnQgb2YgdGhlIHN0YXJ0dXAgcHJvY2Vzcy4gKi9cclxuXHRwcmVsb2FkU291bmQgOiBmdW5jdGlvbihpZCkge1xyXG5cdFx0aWYgKCF0aGlzLnNvdW5kc1tpZF0pIHtcclxuXHRcdFx0dGhpcy5zb3VuZHNbaWRdID0gdGhpcy5jcmVhdGVBdWRpbyhpZCwge1xyXG5cdFx0XHRcdHVybCA6IEJBU0VVUkwrXCIvc25kL1wiICsgaWQgKyB0aGlzLmV4dCxcclxuXHRcdFx0fSk7XHJcblx0XHRcdHRoaXMuc291bmRzW2lkXS5tdXN0S2VlcCA9IHRydWU7XHJcblx0XHRcdHRoaXMuZW1pdChcImxvYWRfc291bmRcIiwgaWQpO1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIHRoaXMuc291bmRzW2lkXTtcclxuXHR9LFxyXG5cdFxyXG5cdC8qKiBMb2FkcyBtdXNpYyBmcm9tIHRoZSBzZXJ2ZXIsIHVzZWQgYXMgcGFydCBvZiB0aGUgc3RhcnR1cCBwcm9jZXNzLiAqL1xyXG5cdHJlZ2lzdGVyUHJlbG9hZGVkTXVzaWM6IGZ1bmN0aW9uKGlkLCBpbmZvKSB7XHJcblx0XHRpZiAoIXRoaXMubXVzaWNbaWRdKSB7XHJcblx0XHRcdHRoaXMubXVzaWNbaWRdID0gY3JlYXRlQXVkaW9fVGFnKGlkLCBpbmZvKTsgLy9mb3JjZSB1c2luZyB0aGlzIGtpbmRcclxuXHRcdFx0dGhpcy5tdXNpY1tpZF0ubXVzdEtlZXAgPSB0cnVlO1xyXG5cdFx0XHR0aGlzLmVtaXQoXCJsb2FkX211c2ljXCIsIGlkKTtcclxuXHRcdH1cclxuXHRcdHJldHVybiB0aGlzLm11c2ljW2lkXTtcclxuXHR9LFxyXG5cdFxyXG5cdC8qKiBMb2FkcyBzb3VuZCBmcm9tIGRhdGEgZXh0cmFjdGVkIGZyb20gdGhlIG1hcCB6aXAgZmlsZS4gKi9cclxuXHRsb2FkU291bmQ6IGZ1bmN0aW9uKGlkLCBpbmZvKSB7XHJcblx0XHRpZiAoIXRoaXMuc291bmRzW2lkXSkge1xyXG5cdFx0XHR0aGlzLnNvdW5kc1tpZF0gPSB0aGlzLmNyZWF0ZUF1ZGlvKGlkLCBpbmZvKTtcclxuXHRcdFx0dGhpcy5lbWl0KFwibG9hZF9zb3VuZFwiLCBpZCk7XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gdGhpcy5zb3VuZHNbaWRdO1xyXG5cdH0sXHJcblx0XHJcblx0LyoqIExvYWRzIG11c2ljIGZyb20gZGF0YSBleHRyYWN0ZWQgZnJvbSB0aGUgbWFwIHppcCBmaWxlLiAqL1xyXG5cdGxvYWRNdXNpYzogZnVuY3Rpb24oaWQsIGluZm8pIHtcclxuXHRcdGlmICghdGhpcy5tdXNpY1tpZF0pIHtcclxuXHRcdFx0dGhpcy5fZW5zdXJlUm9vbUZvck11c2ljKCk7XHJcblx0XHRcdHRoaXMubXVzaWNbaWRdID0gdGhpcy5jcmVhdGVBdWRpbyhpZCwgaW5mbyk7XHJcblx0XHRcdHRoaXMuZW1pdChcImxvYWRfbXVzaWNcIiwgaWQpO1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIHRoaXMubXVzaWNbaWRdO1xyXG5cdH0sXHJcblx0XHJcblx0XHJcblx0aXNNdXNpY0xvYWRlZDogZnVuY3Rpb24oaWQpIHtcclxuXHRcdHJldHVybiAhIXRoaXMubXVzaWNbaWRdO1xyXG5cdH0sXHJcblx0aXNTb3VuZExvYWRlZDogZnVuY3Rpb24oaWQpIHtcclxuXHRcdHJldHVybiAhIXRoaXMuc291bmRzW2lkXTtcclxuXHR9LFxyXG5cdFxyXG5cdF9lbnN1cmVSb29tRm9yTXVzaWM6IGZ1bmN0aW9uKCkge1xyXG5cdFx0aWYgKE9iamVjdC5rZXlzKHRoaXMubXVzaWMpLmxlbmd0aCsxIDw9IE1BWF9NVVNJQykgcmV0dXJuO1xyXG5cdFx0XHJcblx0XHR2YXIgb2xkZXN0RGF0ZSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xyXG5cdFx0dmFyIG9sZGVzdElkID0gbnVsbDtcclxuXHRcdGZvciAodmFyIGlkIGluIHRoaXMubXVzaWMpIHtcclxuXHRcdFx0dmFyIG0gPSB0aGlzLm11c2ljW2lkXVxyXG5cdFx0XHRpZiAobS5tdXN0S2VlcCkgY29udGludWU7XHJcblx0XHRcdGlmIChtLmxvYWREYXRlIDwgb2xkZXN0RGF0ZSkge1xyXG5cdFx0XHRcdG9sZGVzdERhdGUgPSBtLmxvYWREYXRlO1xyXG5cdFx0XHRcdG9sZGVzdElkID0gaWQ7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0dGhpcy5tdXNpY1tvbGRlc3RJZF0udW5sb2FkKCk7XHJcblx0XHRkZWxldGUgdGhpcy5tdXNpY1tvbGRlc3RJZF07XHJcblx0XHR0aGlzLmVtaXQoXCJ1bmxvYWRlZC1tdXNpY1wiLCBvbGRlc3RJZCk7XHJcblx0fSxcclxuXHRcclxuXHQvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vIFBsYXlpbmcgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cdFxyXG5cdHBsYXlTb3VuZCA6IGZ1bmN0aW9uKGlkKSB7XHJcblx0XHRpZiAodGhpcy5tdXRlZF9zb3VuZCkgcmV0dXJuO1xyXG5cdFx0aWYgKCF0aGlzLnNvdW5kc1tpZF0pIHtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihcIlNvdW5kIGlzIG5vdCBsb2FkZWQhXCIsIGlkKTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cdFx0dGhpcy5zb3VuZHNbaWRdLnBsYXkoKTtcclxuXHR9LFxyXG5cdFxyXG5cdHBsYXlNdXNpYzogZnVuY3Rpb24oaWQpe1xyXG5cdFx0dmFyIG0gPSB0aGlzLm11c2ljW2lkXTtcclxuXHRcdGlmICghbSkgcmV0dXJuO1xyXG5cdFx0aWYgKG0ucGxheWluZykgcmV0dXJuOyAvL2FscmVhZHkgcGxheWluZ1xyXG5cdFx0XHJcblx0XHR2YXIgc3RhcnREZWxheSA9IDA7XHJcblx0XHRmb3IgKHZhciBpZCBpbiB0aGlzLm11c2ljKSB7XHJcblx0XHRcdGlmICh0aGlzLm11c2ljW2lkXS5wbGF5aW5nKSB7XHJcblx0XHRcdFx0dGhpcy5zdG9wTXVzaWMoaWQpO1xyXG5cdFx0XHRcdHN0YXJ0RGVsYXkgPSAxMDAwO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcclxuXHRcdFx0bS5wbGF5aW5nID0gdHJ1ZTtcclxuXHRcdFx0aWYgKHRoaXMubXV0ZWRfbXVzaWMpIHJldHVybjtcclxuXHRcdFx0bS5wbGF5aW5nX3JlYWwgPSB0cnVlO1xyXG5cdFx0XHRtLnBsYXkoKTtcclxuXHRcdH0sIHN0YXJ0RGVsYXkpO1xyXG5cdH0sXHJcblx0XHJcblx0cGF1c2VNdXNpYzogZnVuY3Rpb24oaWQpe1xyXG5cdFx0dmFyIG0gPSB0aGlzLm11c2ljW2lkXTtcclxuXHRcdGlmICghbSkgcmV0dXJuO1xyXG5cdFx0bS5wbGF5aW5nID0gbS5wbGF5aW5nX3JlYWwgPSBmYWxzZTtcclxuXHRcdG0ucGF1c2UoKTtcclxuXHR9LFxyXG5cdFxyXG5cdHRvZ2dsZU11c2ljOiBmdW5jdGlvbihpZCkge1xyXG5cdFx0dmFyIG0gPSB0aGlzLm11c2ljW2lkXTtcclxuXHRcdGlmICghbSkgcmV0dXJuO1xyXG5cdFx0aWYgKG0ucGxheWluZykge1xyXG5cdFx0XHRtLnBsYXlpbmcgPSBtLnBsYXlpbmdfcmVhbCA9IGZhbHNlO1xyXG5cdFx0XHRtLnBhdXNlKCk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRtLnBsYXlpbmcgPSB0cnVlO1xyXG5cdFx0XHRpZiAodGhpcy5tdXRlZF9tdXNpYykgcmV0dXJuO1xyXG5cdFx0XHRtLnBsYXlpbmdfcmVhbCA9IHRydWU7XHJcblx0XHRcdG0ucGxheSgpO1xyXG5cdFx0fVxyXG5cdH0sXHJcblx0XHJcblx0c3RvcE11c2ljOiBmdW5jdGlvbihpZCl7XHJcblx0XHR2YXIgbSA9IHRoaXMubXVzaWNbaWRdO1xyXG5cdFx0aWYgKCFtKSByZXR1cm47XHJcblx0XHQvLyBtLnBsYXlpbmcgPSBtLnBsYXlpbmdfcmVhbCA9IGZhbHNlO1xyXG5cdFx0Ly9tLnBhdXNlKCk7XHJcblx0XHQvL20uY3VycmVudFRpbWUgPSAwO1xyXG5cdFx0bS5mYWRlb3V0ID0gdHJ1ZTtcclxuXHR9LFxyXG5cdFxyXG5cdFxyXG5cdF90aWNrOiBmdW5jdGlvbihkZWx0YSkge1xyXG5cdFx0Zm9yICh2YXIgaWQgaW4gdGhpcy5tdXNpYykge1xyXG5cdFx0XHR0aGlzLm11c2ljW2lkXS5sb29wVGljayhkZWx0YSk7XHJcblx0XHR9XHJcblx0fSxcclxufSk7XHJcblxyXG5PYmplY3QuZGVmaW5lUHJvcGVydGllcyhTb3VuZE1hbmFnZXIucHJvdG90eXBlLCB7XHJcblx0dm9sX211c2ljOiB7XHJcblx0XHRlbnVtZXJhYmxlOiB0cnVlLFxyXG5cdFx0Z2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuX192b2xfbXVzaWM7IH0sXHJcblx0XHRzZXQ6IGZ1bmN0aW9uKHZvbCkge1xyXG5cdFx0XHR0aGlzLl9fdm9sX211c2ljID0gTWF0aC5jbGFtcCh2b2wpO1xyXG5cdFx0XHRmb3IgKHZhciBpZCBpbiB0aGlzLm11c2ljKSB7XHJcblx0XHRcdFx0dGhpcy5tdXNpY1tpZF0uc2V0Vm9sdW1lKHRoaXMuX192b2xfbXVzaWMpO1xyXG5cdFx0XHR9XHJcblx0XHR9LFxyXG5cdH0sXHJcblx0dm9sX3NvdW5kOiB7XHJcblx0XHRlbnVtZXJhYmxlOiB0cnVlLFxyXG5cdFx0Z2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuX192b2xfc291bmQ7IH0sXHJcblx0XHRzZXQ6IGZ1bmN0aW9uKHZvbCkge1xyXG5cdFx0XHR0aGlzLl9fdm9sX3NvdW5kID0gTWF0aC5jbGFtcCh2b2wpO1xyXG5cdFx0XHRmb3IgKHZhciBpZCBpbiB0aGlzLnNvdW5kcykge1xyXG5cdFx0XHRcdHRoaXMuc291bmRzW2lkXS5zZXRWb2x1bWUodGhpcy5fX3ZvbF9zb3VuZCk7XHJcblx0XHRcdH1cclxuXHRcdH0sXHJcblx0fSxcclxuXHRtdXRlZF9tdXNpYzoge1xyXG5cdFx0ZW51bWVyYWJsZTogdHJ1ZSxcclxuXHRcdGdldDogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLl9fbXV0ZWRfbXVzaWM7IH0sXHJcblx0XHRzZXQ6IGZ1bmN0aW9uKHZhbCkge1xyXG5cdFx0XHR0aGlzLl9fbXV0ZWRfbXVzaWMgPSB2YWw7XHJcblx0XHRcdGZvciAodmFyIGlkIGluIHRoaXMubXVzaWMpIHtcclxuXHRcdFx0XHR0aGlzLm11c2ljW2lkXS5zZXRNdXRlZCh2YWwpO1xyXG5cdFx0XHR9XHJcblx0XHR9LFxyXG5cdH0sXHJcblx0bXV0ZWRfc291bmQ6IHtcclxuXHRcdGVudW1lcmFibGU6IHRydWUsXHJcblx0XHRnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5fX211dGVkX3NvdW5kOyB9LFxyXG5cdFx0c2V0OiBmdW5jdGlvbih2YWwpIHtcclxuXHRcdFx0dGhpcy5fX211dGVkX3NvdW5kID0gdmFsO1xyXG5cdFx0XHRmb3IgKHZhciBpZCBpbiB0aGlzLnNvdW5kcykge1xyXG5cdFx0XHRcdHRoaXMuc291bmRzW2lkXS5zZXRNdXRlZCh2YWwpO1xyXG5cdFx0XHR9XHJcblx0XHR9LFxyXG5cdH0sXHJcblx0XHJcblx0X192b2xfbXVzaWM6IHsgZW51bWVyYWJsZTogZmFsc2UsIHdyaXRhYmxlOiB0cnVlLCB9LFxyXG5cdF9fdm9sX3NvdW5kOiB7IGVudW1lcmFibGU6IGZhbHNlLCB3cml0YWJsZTogdHJ1ZSwgfSxcclxuXHRfX211dGVkX211c2ljOiB7IGVudW1lcmFibGU6IGZhbHNlLCB3cml0YWJsZTogdHJ1ZSwgfSxcclxuXHRfX211dGVkX3NvdW5kOiB7IGVudW1lcmFibGU6IGZhbHNlLCB3cml0YWJsZTogdHJ1ZSwgfSxcclxufSk7XHJcblxyXG5cclxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8gU291bmQgT2JqZWN0cyAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblxyXG5mdW5jdGlvbiBTb3VuZE9iamVjdChvcHRzKSB7XHJcblx0ZXh0ZW5kKHRoaXMsIG9wdHMpO1xyXG5cdHRoaXMubG9hZERhdGUgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcclxufVxyXG5leHRlbmQoU291bmRPYmplY3QucHJvdG90eXBlLCB7XHJcblx0cGxheWluZzogZmFsc2UsIC8vc291bmQgaXMgcGxheWluZywgdGhlb3JldGljYWxseSAobWlnaHQgYmUgbXV0ZWQpXHJcblx0cGxheWluZ19yZWFsOiBmYWxzZSwgLy9zb3VuZCBpcyBhY3R1YWxseSBwbGF5aW5nIGFuZCBub3QgbXV0ZWRcclxuXHRcclxuXHRsb29wU3RhcnQ6IDAsXHJcblx0bG9vcEVuZDogMCxcclxuXHRcclxuXHRsb2FkRGF0ZTogMCwgLy9taWxpc2Vjb25kIGRhdGVzdGFtcCBvZiB3aGVuIHRoaXMgd2FzIGxvYWRlZCwgZm9yIGNhY2hlIGNvbnRyb2xcclxuXHRtdXN0S2VlcDogZmFsc2UsIC8vaWYgd2Ugc2hvdWxkIHNraXAgdGhpcyBvYmplY3Qgd2hlbiBkZXRlcm1pbmluZyBzb3VuZHMgdG8gdW5sb2FkXHJcblx0XHJcblx0ZmFkZW91dDogZmFsc2UsXHJcblx0XHJcblx0cGxheTogZnVuY3Rpb24oKXt9LFxyXG5cdHBhdXNlOiBmdW5jdGlvbigpe30sXHJcblx0c2V0Vm9sdW1lOiBmdW5jdGlvbih2b2wpe30sXHJcblx0c2V0TXV0ZWQ6IGZ1bmN0aW9uKG11dGVkKXt9LFxyXG5cdGxvb3BUaWNrOiBmdW5jdGlvbihkZWx0YSl7fSxcclxuXHRcclxuXHR1bmxvYWQ6IGZ1bmN0aW9uKCl7fSxcclxufSk7XHJcblxyXG5cclxuXHJcbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8gQXVkaW8gVGFnIEltcGxlbWVudGF0aW9uIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZUF1ZGlvX1RhZyhpZCwgaW5mbykge1xyXG5cdHZhciBzbmQ7XHJcblx0aWYgKGluZm8udGFnKSB7XHJcblx0XHRzbmQgPSBpbmZvLnRhZztcclxuXHR9IGVsc2UgaWYgKGluZm8udXJsKSB7XHJcblx0XHRzbmQgPSBuZXcgQXVkaW8oKTtcclxuXHRcdHNuZC5hdXRvcGxheSA9IGZhbHNlO1xyXG5cdFx0c25kLmF1dG9idWZmZXIgPSB0cnVlO1xyXG5cdFx0c25kLnByZWxvYWQgPSBcImF1dG9cIjtcclxuXHRcdHNuZC5zcmMgPSBpbmZvLnVybDsgXHJcblx0XHQkKFwiYm9keVwiKS5hcHBlbmQoICQoc25kLnRhZykuY3NzKHtkaXNwbGF5Olwibm9uZVwifSkgKTtcclxuXHR9IGVsc2Uge1xyXG5cdFx0dGhyb3cgbmV3IEVycm9yKFwiQ2FsbGVkIGNyZWF0ZUF1ZGlvIHdpdGhvdXQgYW55IGluZm8hXCIpO1xyXG5cdH1cclxuXHRcclxuXHR2YXIgc29iaiA9IG5ldyBTb3VuZE9iamVjdCh7XHJcblx0XHRfX3RhZzogc25kLFxyXG5cdFx0X19ibG9idXJsOiBpbmZvLnVybCxcclxuXHRcdFxyXG5cdFx0bG9vcFN0YXJ0OiBpbmZvLmxvb3BTdGFydCB8fCAwLFxyXG5cdFx0bG9vcEVuZDogaW5mby5sb29wRW5kIHx8IDAsXHJcblx0XHRcclxuXHRcdHBsYXk6IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHR0aGlzLl9fdGFnLnBsYXkoKTtcclxuXHRcdH0sXHJcblx0XHRcclxuXHRcdHBhdXNlOiBmdW5jdGlvbigpIHtcclxuXHRcdFx0dGhpcy5fX3RhZy5wYXVzZSgpO1xyXG5cdFx0fSxcclxuXHRcdFxyXG5cdFx0c2V0Vm9sdW1lOiBmdW5jdGlvbih2b2wpIHtcclxuXHRcdFx0dGhpcy5fX3RhZy52b2x1bWUgPSB2b2w7XHJcblx0XHR9LFxyXG5cdFx0XHJcblx0XHRzZXRNdXRlZDogZnVuY3Rpb24obXV0ZWQpIHtcclxuXHRcdFx0aWYgKG11dGVkKSB7XHJcblx0XHRcdFx0dGhpcy5wbGF5aW5nX3JlYWwgPSBmYWxzZTtcclxuXHRcdFx0XHR0aGlzLl9fdGFnLnBhdXNlKCk7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0aWYgKHRoaXMucGxheWluZykge1xyXG5cdFx0XHRcdFx0dGhpcy5wbGF5aW5nX3JlYWwgPSB0cnVlO1xyXG5cdFx0XHRcdFx0dGhpcy5fX3RhZy5wbGF5KCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9LFxyXG5cdFx0XHJcblx0XHRsb29wVGljazogZnVuY3Rpb24oZGVsdGEpIHtcclxuXHRcdFx0aWYgKCF0aGlzLmxvb3BFbmQgfHwgIXRoaXMucGxheWluZ19yZWFsKSByZXR1cm47XHJcblx0XHRcdFxyXG5cdFx0XHQvL1RPRE8gc3VwcG9ydCB0aGlzLmZhZGVvdXRcclxuXHRcdFx0aWYgKHRoaXMuX190YWcuY3VycmVudFRpbWUgPj0gdGhpcy5sb29wRW5kKSB7XHJcblx0XHRcdFx0dGhpcy5fX3RhZy5jdXJyZW50VGltZSAtPSAodGhpcy5sb29wRW5kIC0gdGhpcy5sb29wU3RhcnQpO1xyXG5cdFx0XHR9XHJcblx0XHR9LFxyXG5cdFx0dW5sb2FkOiBmdW5jdGlvbigpIHtcclxuXHRcdFx0aWYgKHRoaXMuX19ibG9idXJsKVxyXG5cdFx0XHRcdFVSTC5yZXZva2VPYmplY3RVUkwodGhpcy5fX2Jsb2J1cmwpO1xyXG5cdFx0XHRcclxuXHRcdFx0JCh0aGlzLnRhZykucmVtb3ZlKCk7XHJcblx0XHRcdGRlbGV0ZSB0aGlzLnRhZztcclxuXHRcdH0sXHJcblx0fSk7XHJcblx0c25kLm9uKFwiZW5kZWRcIiwgZnVuY3Rpb24oKXtcclxuXHRcdHNvYmoucGxheWluZyA9IGZhbHNlO1xyXG5cdFx0c29iai5wbGF5aW5nX3JlYWwgPSBmYWxzZTtcclxuXHRcdHNuZC5jdXJyZW50VGltZSA9IDA7XHJcblx0fSk7XHJcblx0XHJcblx0c25kLmxvYWQoKTtcclxuXHRcclxuXHRyZXR1cm4gc29iajtcclxufVxyXG5cclxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8gV2ViIEF1ZGlvIEFQSSBJbXBsZW1lbnRhdGlvbiAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cclxuZnVuY3Rpb24gY3JlYXRlQXVkaW9fV2ViQVBJKGlkLCBpbmZvKSB7XHJcblx0dmFyIHNvYmogPSBuZXcgU291bmRPYmplY3Qoe1xyXG5cdFx0X19hdWRpb0J1ZmZlcjogbnVsbCxcclxuXHRcdF9fdGFnOiBudWxsLFxyXG5cdFx0X19nYWluQ3RybDogbnVsbCxcclxuXHRcdF9fbXV0ZUN0cmw6IG51bGwsXHJcblx0XHRfX2Jsb2J1cmw6IG51bGwsXHJcblx0XHRfX2RlYnVnQW5hbHlzZXI6IG51bGwsXHJcblx0XHRcclxuXHRcdF9fY3VyclNyYzogbnVsbCxcclxuXHRcdFxyXG5cdFx0bG9vcFN0YXJ0OiBpbmZvLmxvb3BTdGFydCB8fCAwLFxyXG5cdFx0bG9vcEVuZDogaW5mby5sb29wRW5kIHx8IDAsXHJcblx0XHRcclxuXHRcdHBsYXk6IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHR2YXIgc3JjO1xyXG5cdFx0XHRpZiAodGhpcy5fX2F1ZGlvQnVmZmVyKSB7XHJcblx0XHRcdFx0c3JjID0gYXVkaW9Db250ZXh0LmNyZWF0ZUJ1ZmZlclNvdXJjZSgpO1xyXG5cdFx0XHRcdHNyYy5idWZmZXIgPSB0aGlzLl9fYXVkaW9CdWZmZXI7XHJcblx0XHRcdH0gZWxzZSBpZiAodGhpcy5fX3RhZykge1xyXG5cdFx0XHRcdHNyYyA9IGF1ZGlvQ29udGV4dC5jcmVhdGVNZWRpYUVsZW1lbnRTb3VyY2UoaW5mby50YWcpO1xyXG5cdFx0XHR9IGVsc2UgeyBcclxuXHRcdFx0XHRjb25zb2xlLmxvZyhcIk5vIGF1ZGlvIGJ1ZmZlciByZWFkeSB0byBwbGF5IVwiKTsgXHJcblx0XHRcdFx0cmV0dXJuOyBcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0c3JjLmxvb3AgPSAhIWluZm8ubG9vcEVuZDtcclxuXHRcdFx0aWYgKCEhaW5mby5sb29wRW5kKSB7XHJcblx0XHRcdFx0c3JjLmxvb3BTdGFydCA9IGluZm8ubG9vcFN0YXJ0O1xyXG5cdFx0XHRcdHNyYy5sb29wRW5kID0gaW5mby5sb29wRW5kO1xyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHRzcmMub24oXCJlbmRlZFwiLCBmdW5jdGlvbigpe1xyXG5cdFx0XHRcdHNvYmoucGxheWluZyA9IGZhbHNlO1xyXG5cdFx0XHRcdHNvYmoucGxheWluZ19yZWFsID0gZmFsc2U7XHJcblx0XHRcdFx0c29iai5fX2N1cnJTcmMgPSBudWxsO1xyXG5cdFx0XHR9KTtcclxuXHRcdFx0XHJcblx0XHRcdHNyYy5jb25uZWN0KHRoaXMuX19nYWluQ3RybCk7XHJcblx0XHRcdHNyYy5zdGFydCgpO1xyXG5cdFx0XHR0aGlzLl9wbGF5aW5nID0gdHJ1ZTtcclxuXHRcdFx0XHJcblx0XHRcdHRoaXMuX19jdXJyU3JjID0gc3JjO1xyXG5cdFx0fSxcclxuXHRcdFxyXG5cdFx0cGF1c2U6IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHR0aGlzLl9fY3VyclNyYy5zdG9wKCk7XHJcblx0XHRcdHRoaXMuX19jdXJyU3JjID0gbnVsbDtcclxuXHRcdH0sXHJcblx0XHRcclxuXHRcdHNldFZvbHVtZTogZnVuY3Rpb24odm9sKSB7XHJcblx0XHRcdHRoaXMuX19nYWluQ3RybC5nYWluLnZhbHVlID0gdm9sO1xyXG5cdFx0fSxcclxuXHRcdFxyXG5cdFx0c2V0TXV0ZWQ6IGZ1bmN0aW9uKG11dGVkKSB7XHJcblx0XHRcdGlmICh0aGlzLmZhZGVvdXQpIHJldHVybjsgLy9pZ25vcmUgZHVyaW5nIGZhZGVvdXRcclxuXHRcdFx0dGhpcy5fX211dGVDdHJsLmdhaW4udmFsdWUgPSAobXV0ZWQpPyAwIDogMTtcclxuXHRcdH0sXHJcblx0XHRcclxuXHRcdGxvb3BUaWNrOiBmdW5jdGlvbihkZWx0YSkge1xyXG5cdFx0XHRpZiAodGhpcy5mYWRlb3V0KSB7XHJcblx0XHRcdFx0aWYgKHRoaXMuX19tdXRlQ3RybC5nYWluLnZhbHVlID4gMC4wMDEpIHtcclxuXHRcdFx0XHRcdHRoaXMuX19tdXRlQ3RybC5nYWluLnZhbHVlIC09IGRlbHRhICogMC41O1xyXG5cdFx0XHRcdFx0Ly8gY29uc29sZS5sb2codGhpcy5fX211dGVDdHJsLmdhaW4udmFsdWUpO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHR0aGlzLl9fY3VyclNyYy5zdG9wKCk7XHJcblx0XHRcdFx0XHR0aGlzLl9fY3VyclNyYyA9IG51bGw7XHJcblx0XHRcdFx0XHR0aGlzLmZhZGVvdXQgPSBmYWxzZTtcclxuXHRcdFx0XHRcdHRoaXMucGxheWluZyA9IHRoaXMucGxheWluZ19yZWFsID0gZmFsc2U7XHJcblx0XHRcdFx0XHR0aGlzLl9fbXV0ZUN0cmwuZ2Fpbi52YWx1ZSA9IDE7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9LFxyXG5cdFx0XHJcblx0XHR1bmxvYWQ6IGZ1bmN0aW9uKCl7XHJcblx0XHRcdGlmICh0aGlzLl9fYmxvYnVybClcclxuXHRcdFx0XHRVUkwucmV2b2tlT2JqZWN0VVJMKHRoaXMuX19ibG9idXJsKTtcclxuXHRcdFx0XHJcblx0XHRcdGRlbGV0ZSB0aGlzLl9fYmxvYnVybDtcclxuXHRcdFx0ZGVsZXRlIHRoaXMuX19hdWRpb0J1ZmZlcjtcclxuXHRcdFx0ZGVsZXRlIHRoaXMuX190YWc7XHJcblx0XHRcdGRlbGV0ZSB0aGlzLl9fZ2FpbkN0cmw7XHJcblx0XHRcdGRlbGV0ZSB0aGlzLl9fbXV0ZUN0cmw7XHJcblx0XHR9LFxyXG5cdH0pO1xyXG5cdFxyXG5cdFxyXG5cdGlmIChpbmZvLnRhZykge1xyXG5cdFx0c29iai5fX3RhZyA9IGluZm8udGFnO1xyXG5cdFx0XHJcblx0fSBlbHNlIGlmIChpbmZvLmRhdGEpIHtcclxuXHRcdGN1cnJlbnRNYXAubWFya0xvYWRpbmcoXCJEZWNvZGVBdWRpb19cIitpZCk7XHJcblx0XHRcclxuXHRcdHZhciBmciA9IG5ldyBGaWxlUmVhZGVyKCk7XHJcblx0XHRmci5vbihcImxvYWRcIiwgZnVuY3Rpb24oKXtcclxuXHRcdFx0YXVkaW9Db250ZXh0LmRlY29kZUF1ZGlvRGF0YShmci5yZXN1bHQsIGZ1bmN0aW9uKGJ1ZmZlcil7XHJcblx0XHRcdFx0c29iai5fX2F1ZGlvQnVmZmVyID0gYnVmZmVyO1xyXG5cdFx0XHRcdGlmIChzb2JqLnBsYXlpbmdfcmVhbCkge1xyXG5cdFx0XHRcdFx0c29iai5wbGF5KCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGN1cnJlbnRNYXAubWFya0xvYWRGaW5pc2hlZChcIkRlY29kZUF1ZGlvX1wiK2lkKTtcclxuXHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHRcdGZyLnJlYWRBc0FycmF5QnVmZmVyKGluZm8uZGF0YSk7XHJcblx0XHRcclxuXHR9IGVsc2UgaWYgKGluZm8udXJsKSB7XHJcblx0XHR2YXIgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XHJcblx0XHR4aHIub3BlbihcIkdFVFwiLCBpbmZvLnVybCk7XHJcblx0XHR4aHIucmVzcG9uc2VUeXBlID0gJ2FycmF5YnVmZmVyJztcclxuXHRcdHhoci5vbihcImxvYWRcIiwgZnVuY3Rpb24oZSkge1xyXG5cdFx0XHQvLyBjb25zb2xlLmxvZyhcIkxPQUQ6XCIsIGUpO1xyXG5cdFx0XHRpZiAoeGhyLnN0YXR1cyAhPSAyMDApIHtcclxuXHRcdFx0XHRjb25zb2xlLmVycm9yKFwiRVJST1IgTE9BRElORyBBVURJTzpcIiwgeGhyLnN0YXR1c1RleHQpO1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0dmFyIGRhdGEgPSB4aHIucmVzcG9uc2U7XHJcblx0XHRcdGF1ZGlvQ29udGV4dC5kZWNvZGVBdWRpb0RhdGEoeGhyLnJlc3BvbnNlLCBmdW5jdGlvbihidWZmZXIpe1xyXG5cdFx0XHRcdHNvYmouX19hdWRpb0J1ZmZlciA9IGJ1ZmZlcjtcclxuXHRcdFx0XHRpZiAoc29iai5wbGF5aW5nX3JlYWwpIHtcclxuXHRcdFx0XHRcdHNvYmoucGxheSgpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHRcdHhoci5vbihcImVycm9yXCIsIGZ1bmN0aW9uKGUpe1xyXG5cdFx0XHRjb25zb2xlLmVycm9yKFwiRVJST1IgTE9BRElORyBBVURJTyEhXCIsIGUpO1xyXG5cdFx0fSk7XHJcblx0XHRcclxuXHRcdGlmIChpbmZvLnVybC5pbmRleE9mKFwiYmxvYlwiKSA+IC0xKSB7XHJcblx0XHRcdHRoaXMuX19ibG9idXJsID0gaW5mby51cmw7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdHhoci5zZW5kKCk7XHJcblx0fSBlbHNlIHtcclxuXHRcdHRocm93IG5ldyBFcnJvcihcIkNhbGxlZCBjcmVhdGVBdWRpbyB3aXRob3V0IGFueSBpbmZvIVwiKTtcclxuXHR9XHJcblx0XHJcblx0c29iai5fX2dhaW5DdHJsID0gYXVkaW9Db250ZXh0LmNyZWF0ZUdhaW4oKTtcclxuXHQvL1RPRE8gbG9vayBpbnRvIDNkIHNvdW5kIGZ1bjogaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvQVBJL0F1ZGlvQ29udGV4dC5jcmVhdGVQYW5uZXJcclxuXHRzb2JqLl9fbXV0ZUN0cmwgPSBhdWRpb0NvbnRleHQuY3JlYXRlR2FpbigpO1xyXG5cdFxyXG5cdHNvYmouX19nYWluQ3RybC5jb25uZWN0KHNvYmouX19tdXRlQ3RybCk7XHJcblx0Ly9UT0RPXHJcblx0XHJcblx0dmFyIGZpbmFsTm9kZSA9IHNvYmouX19tdXRlQ3RybDtcclxuXHRpZiAoREVCVUcuc2V0dXBBZGRpdGlvbmFsQXVkaW9GaWx0ZXJzKSB7XHJcblx0XHRmaW5hbE5vZGUgPSBERUJVRy5zZXR1cEFkZGl0aW9uYWxBdWRpb0ZpbHRlcnMoaWQsIGF1ZGlvQ29udGV4dCwgZmluYWxOb2RlKTtcclxuXHR9XHJcblx0XHJcblx0aWYgKERFQlVHLnNvdW5kQW5hbHl6ZXIpIHtcclxuXHRcdHZhciBkYSA9IHNvYmouX19kZWJ1Z0FuYWx5c2VyID0gYXVkaW9Db250ZXh0LmNyZWF0ZUFuYWx5c2VyKCk7XHJcblx0XHRkYS5mZnRTaXplID0gMTAyNDsvLzIwNDg7XHJcblx0XHR0aGlzLmVtaXQoXCJERUJVRy1BbmFseXNlckNyZWF0ZWRcIiwgaWQsIGRhKTtcclxuXHRcdFxyXG5cdFx0ZmluYWxOb2RlLmNvbm5lY3QoZGEpO1xyXG5cdFx0ZGEuY29ubmVjdChhdWRpb0NvbnRleHQuZGVzdGluYXRpb24pO1xyXG5cdH0gZWxzZSB7XHJcblx0XHRmaW5hbE5vZGUuY29ubmVjdChhdWRpb0NvbnRleHQuZGVzdGluYXRpb24pO1xyXG5cdH1cclxuXHRcclxuXHRyZXR1cm4gc29iajtcclxufVxyXG5cclxuXHJcblxyXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBTb3VuZE1hbmFnZXIoKTtcclxuIiwiLy8gdWktbWFuYWdlci5qc1xyXG4vLyBEZWZpbmVzIHRoZSBVSSBtb2R1bGUsIHdoaWNoIGNvbnRyb2xzIHRoZSB1c2VyIGludGVyZmFjZS5cclxuXHJcbnZhciBpbmhlcml0cyA9IHJlcXVpcmUoXCJpbmhlcml0c1wiKTtcclxudmFyIGV4dGVuZCA9IHJlcXVpcmUoXCJleHRlbmRcIik7XHJcbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKFwiZXZlbnRzXCIpLkV2ZW50RW1pdHRlcjtcclxudmFyIGNvbnRyb2xsZXIgPSByZXF1aXJlKFwidHBwLWNvbnRyb2xsZXJcIik7XHJcblxyXG52YXIgQnViYmxlU3ByaXRlID0gcmVxdWlyZShcInRwcC1zcHJpdGVtb2RlbFwiKS5CdWJibGVTcHJpdGU7XHJcblxyXG52YXIgTV9XSURUSCA9IDAsIE1fSEVJR0hUID0gMSwgTV9ISURFID0gMiwgTV9UUklBTkdMRSA9IDMsIE1fVEFJTFggPSA0LCBNX1RBSUxZID0gNTtcclxuXHJcbi8qKlxyXG4gKlxyXG4gKi9cclxuZnVuY3Rpb24gVUlNYW5hZ2VyKCkge1xyXG5cdHRoaXMuZGlhbG9ncyA9IHtcclxuXHRcdFwidGV4dFwiIDogbmV3IERpYWxvZ0JveChcInRleHRib3hfZ29sZFwiKSxcclxuXHRcdFwiZGlhbG9nXCIgOiBuZXcgRGlhbG9nQm94KFwiZGlhbG9nX2J1YmJsZVwiKSxcclxuXHR9O1xyXG5cdHRoaXMuc2tyaW0gPSBuZXcgU2tyaW0oKTtcclxuXHR0aGlzLmxvYWRlciA9IG5ldyBBamF4TG9hZGVyKCk7XHJcblx0XHJcblx0dGhpcy5idWJibGVQb29sID0gW107XHJcblx0dGhpcy5hbGxCdWJibGVzID0gW107XHJcblx0XHJcblx0dmFyIHNlbGYgPSB0aGlzO1xyXG5cdCQoZnVuY3Rpb24oKXtcclxuXHRcdHNlbGYuX2luaXRVSVNjZW5lKCk7XHJcblx0XHRcclxuXHRcdCQoXCIjcHJlbG9hZFNjcmVlblwiKS5mYWRlT3V0KDgwMCwgZnVuY3Rpb24oKXtcclxuXHRcdFx0JCh0aGlzKS5yZW1vdmUoKTtcclxuXHRcdH0pO1xyXG5cdFx0XHJcblx0XHRmb3IgKHZhciB0eXBlIGluIHNlbGYuZGlhbG9ncykge1xyXG5cdFx0XHRzZWxmLmRpYWxvZ3NbdHlwZV0uZWxlbWVudCA9ICQoXCI8ZGl2PlwiKVxyXG5cdFx0XHRcdC5hZGRDbGFzcyhcImRpYWxvZ2JveFwiKS5hZGRDbGFzcyh0eXBlKVxyXG5cdFx0XHRcdC5hcHBlbmRUbyhcIiNjYW52YXMtdWlcIik7XHJcblx0XHR9XHJcblx0fSk7XHJcbn1cclxuaW5oZXJpdHMoVUlNYW5hZ2VyLCBFdmVudEVtaXR0ZXIpO1xyXG5leHRlbmQoVUlNYW5hZ2VyLnByb3RvdHlwZSwge1xyXG5cdGxvYWRlcjogbnVsbCxcclxuXHRza3JpbSA6IG51bGwsXHJcblx0ZGlhbG9ncyA6IG51bGwsXHJcblx0XHJcblx0YnViYmxlUG9vbDogbnVsbCxcclxuXHRhbGxCdWJibGVzOiBudWxsLFxyXG5cdFxyXG5cdC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vIFVJIEFjdGlvbnMgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblx0XHJcblx0LyoqIFNob3cgYSBzdGFuZGFyZCB0ZXh0Ym94IG9uIHNjcmVlbi4gKi9cclxuXHRzaG93VGV4dEJveCA6IGZ1bmN0aW9uKHR5cGUsIGh0bWwsIG9wdHMpIHtcclxuXHRcdGlmICgkLmlzUGxhaW5PYmplY3QoaHRtbCkgJiYgb3B0cyA9PT0gdW5kZWZpbmVkKSB7XHJcblx0XHRcdG9wdHMgPSBodG1sOyBodG1sID0gdW5kZWZpbmVkO1xyXG5cdFx0fVxyXG5cdFx0b3B0cyA9IGV4dGVuZChvcHRzLCB7XHJcblx0XHRcdGh0bWw6IGh0bWwsXHJcblx0XHR9KTtcclxuXHRcdFxyXG5cdFx0dmFyIGQgPSB0aGlzLmRpYWxvZ3NbdHlwZV07XHJcblx0XHRpZiAoIWQpIHtcclxuXHRcdFx0ZCA9IHRoaXMuZGlhbG9nc1tcInRleHRcIl07XHJcblx0XHRcdGNvbnNvbGUuZXJyb3IoXCJJbnZhbGlkIGRpYWxvZyB0eXBlOiBcIit0eXBlKTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0ZC5zaG93KG9wdHMpO1xyXG5cdH0sXHJcblx0XHJcblx0LyoqIEltbWVkZWF0ZWx5IGhpZGVzIHRoZSB0ZXh0IGJveCBhbmQgY2xlYXJzIGFueSB0ZXh0IHRoYXQgd2FzIGluIGl0LiAqL1xyXG5cdGNsb3NlVGV4dEJveCA6IGZ1bmN0aW9uKHR5cGUpIHtcclxuXHRcdHZhciBkID0gdGhpcy5kaWFsb2dzW3R5cGVdO1xyXG5cdFx0aWYgKCFkKSB0aHJvdyBuZXcgRXJyb3IoXCJJbnZhbGlkIGRpYWxvZyB0eXBlOiBcIit0eXBlKTtcclxuXHRcdFxyXG5cdFx0ZC5oaWRlKCk7XHJcblx0fSxcclxuXHRcclxuXHQvKiogU2hvd3MgYSBzZWxlY3RhYmxlIG1lbnUgaW4gdGhlIHRvcC1yaWdodCBjb3JuZXIgb2YgdGhlIHNjcmVlbi4gKi9cclxuXHRzaG93TWVudSA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHJcblx0fSxcclxuXHRcclxuXHQvKiogSW1tZWRhdGVseSBjbG9zZXMgdGhlIG1lbnUgYW5kIGNsZWFycyBpdCBmb3IgZnVydGhlciB1c2UuICovXHJcblx0Y2xvc2VNZW51IDogZnVuY3Rpb24oKSB7XHJcblx0XHRcclxuXHR9LFxyXG5cdFxyXG5cdC8qKiBcclxuXHQgKiBTaG93cyBhIFllcy9ObyBtZW51IGp1c3QgYWJvdmUgdGhlIHRleHQgYm94LiBJZiB0ZXh0IGlzIGN1cnJlbnRseSBwcmludGluZyBvdXQgb24gYSwgXHJcblx0ICogZGlhbG9nIGJveCBvciB0ZXh0IGJveCBvbiBzY3JlZW4sIHRoaXMgd2lsbCBhdXRvbWF0aWNhbGx5IHdhaXQgZm9yIHRoZSB0ZXh0IHRvIGZpbmlzaFxyXG5cdCAqIHByaW50aW5nIGJlZm9yZSBzaG93aW5nIGl0LiBUaGUgWWVzIGFuZCBObyBmdW5jdGlvbnMgd2lsbCBmaXJlIG9mZiBvbmUgd2hlbiBpcyBzZWxlY3RlZC5cclxuXHQgKiBUaGUgZnVuY3Rpb25zIHdpbGwgcHJlc3VtYWJseSBwdXNoIG1vcmUgYWN0aW9ucyBpbnRvIHRoZSBhY3Rpb24gcXVldWUuXHJcblx0ICovXHJcblx0c2hvd0NvbmZpcm1Qcm9tcHQgOiBmdW5jdGlvbih5ZXNmbiwgbm9mbikge1xyXG5cdFx0XHJcblx0fSxcclxuXHRcclxuXHRcclxuXHRnZXRFbW90ZUJ1YmJsZSA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xyXG5cdFx0dmFyIGVtb3RlID0gdGhpcy5idWJibGVQb29sLnVuc2hpZnQoKTtcclxuXHRcdGlmICghZW1vdGUpIHtcclxuXHRcdFx0ZW1vdGUgPSBuZXcgQnViYmxlU3ByaXRlKCk7XHJcblx0XHRcdGVtb3RlLnJlbGVhc2UgPSBmdW5jdGlvbigpe1xyXG5cdFx0XHRcdHNlbGYucGFyZW50LnJlbW92ZShzZWxmKTtcclxuXHRcdFx0XHRzZWxmLmJ1YmJsZVBvb2wucHVzaChlbW90ZSk7XHJcblx0XHRcdH07XHJcblx0XHRcdHRoaXMuYWxsQnViYmxlcy5wdXNoKGVtb3RlKTtcclxuXHRcdH1cclxuXHRcdC8vIGVtb3RlLnNldFR5cGUodHlwZSk7XHJcblx0XHRyZXR1cm4gZW1vdGU7XHJcblx0fSxcclxuXHRcclxuXHRcclxuXHQvKiogRmFkZSB0aGUgc2NyZWVuIHRvIHdoaXRlIGZvciBhIHRyYW5zaXRpb24gb2Ygc29tZSBzb3J0LiAqL1xyXG5cdGZhZGVUb1doaXRlIDogZnVuY3Rpb24oc3BlZWQsIGNhbGxiYWNrKSB7XHJcblx0XHRpZiAodHlwZW9mIHNwZWVkID09IFwiZnVuY3Rpb25cIikge1xyXG5cdFx0XHRjYWxsYmFjayA9IHNwZWVkOyBzcGVlZCA9IHVuZGVmaW5lZDtcclxuXHRcdH1cclxuXHRcdGlmICghc3BlZWQpIHNwZWVkID0gMTsgLy8xIHNlY29uZFxyXG5cdFx0XHJcblx0XHR0aGlzLnNrcmltLmZhZGVUbyh7XHJcblx0XHRcdGNvbG9yOiAweEZGRkZGRixcclxuXHRcdFx0b3BhY2l0eTogMSxcclxuXHRcdFx0c3BlZWQ6IHNwZWVkLFxyXG5cdFx0fSwgY2FsbGJhY2spO1xyXG5cdFx0Ly8gdGhpcy5za3JpbS5mYWRlSW4oc3BlZWQpO1xyXG5cdH0sXHJcblx0XHJcblx0LyoqIEZhZGUgdGhlIHNjcmVlbiB0byBibGFjayBmb3IgYSB0cmFuc2l0aW9uIG9mIHNvbWUgc29ydC4gKi9cclxuXHRmYWRlVG9CbGFjayA6IGZ1bmN0aW9uKHNwZWVkLCBjYWxsYmFjaykge1xyXG5cdFx0aWYgKHR5cGVvZiBzcGVlZCA9PSBcImZ1bmN0aW9uXCIpIHtcclxuXHRcdFx0Y2FsbGJhY2sgPSBzcGVlZDsgc3BlZWQgPSB1bmRlZmluZWQ7XHJcblx0XHR9XHJcblx0XHRpZiAoIXNwZWVkKSBzcGVlZCA9IDE7IC8vMSBzZWNvbmRcclxuXHRcdFxyXG5cdFx0dGhpcy5za3JpbS5mYWRlVG8oe1xyXG5cdFx0XHRjb2xvcjogMHgwMDAwMDAsXHJcblx0XHRcdG9wYWNpdHk6IDEsXHJcblx0XHRcdHNwZWVkOiBzcGVlZCxcclxuXHRcdH0sIGNhbGxiYWNrKTtcclxuXHRcdC8vIHRoaXMuc2tyaW0uZmFkZUluKHNwZWVkKTtcclxuXHR9LFxyXG5cdFxyXG5cdC8qKiBGYWRlIHRoZSBzY3JlZW4gb3V0IGZvciBhIHRyYW5zaXRpb24gb2Ygc29tZSBzb3J0LiAqL1xyXG5cdGZhZGVPdXQgOiBmdW5jdGlvbihzcGVlZCwgY2FsbGJhY2spIHtcclxuXHRcdGlmICh0eXBlb2Ygc3BlZWQgPT0gXCJmdW5jdGlvblwiKSB7XHJcblx0XHRcdGNhbGxiYWNrID0gc3BlZWQ7IHNwZWVkID0gdW5kZWZpbmVkO1xyXG5cdFx0fVxyXG5cdFx0aWYgKCFzcGVlZCkgc3BlZWQgPSAxOyAvLzEgc2Vjb25kXHJcblx0XHRcclxuXHRcdHRoaXMuc2tyaW0uZmFkZVRvKHtcclxuXHRcdFx0b3BhY2l0eTogMSxcclxuXHRcdFx0c3BlZWQ6IHNwZWVkLFxyXG5cdFx0fSwgY2FsbGJhY2spO1xyXG5cdFx0Ly8gdGhpcy5za3JpbS5mYWRlSW4oc3BlZWQpO1xyXG5cdH0sXHJcblx0XHJcblx0LyoqIEZhZGUgdGhlIHNjcmVlbiBpbiBmcm9tIGEgdHJhbnNpdGlvbi4gKi9cclxuXHRmYWRlSW4gOiBmdW5jdGlvbihzcGVlZCwgY2FsbGJhY2spIHtcclxuXHRcdGlmICh0eXBlb2Ygc3BlZWQgPT0gXCJmdW5jdGlvblwiKSB7XHJcblx0XHRcdGNhbGxiYWNrID0gc3BlZWQ7IHNwZWVkID0gdW5kZWZpbmVkO1xyXG5cdFx0fVxyXG5cdFx0aWYgKCFzcGVlZCkgc3BlZWQgPSAxOyAvLzEgc2Vjb25kXHJcblx0XHRcclxuXHRcdHRoaXMuc2tyaW0uZmFkZVRvKHtcclxuXHRcdFx0b3BhY2l0eTogMCxcclxuXHRcdFx0c3BlZWQ6IHNwZWVkLFxyXG5cdFx0fSwgY2FsbGJhY2spO1xyXG5cdFx0Ly8gdGhpcy5za3JpbS5mYWRlT3V0KHNwZWVkKTtcclxuXHR9LFxyXG5cdFxyXG5cdC8qKiBEaXNwbGF5cyB0aGUgbG9hZGluZyBpY29uIG92ZXIgdGhlIG1haW4gZ2FtZSBzY3JlZW4uIE9wdGlvbmFsbHkgc3VwcGx5IHRleHQuICovXHJcblx0c2hvd0xvYWRpbmdBamF4IDogZnVuY3Rpb24obG9hZGluZ1RleHQpIHtcclxuXHRcdGlmICghbG9hZGluZ1RleHQpIGxvYWRpbmdUZXh0ID0gXCJMb2FkaW5nLi4uXCI7XHJcblx0XHR0aGlzLmxvYWRlci5zaG93KCk7XHJcblx0fSxcclxuXHRcclxuXHRoaWRlTG9hZGluZ0FqYXggOiBmdW5jdGlvbigpIHtcclxuXHRcdHRoaXMubG9hZGVyLmhpZGUoKTtcclxuXHR9LFxyXG5cdFxyXG5cdHVwZGF0ZUxvYWRpbmdQcm9ncmVzczogZnVuY3Rpb24ocHJvZ3Jlc3MsIHRvdGFsKSB7XHJcblx0XHRpZiAocHJvZ3Jlc3MgIT09IHVuZGVmaW5lZCkgdGhpcy5sb2FkZXIucHJvZ3Jlc3MgPSBwcm9ncmVzcztcclxuXHRcdGlmICh0b3RhbCAhPT0gdW5kZWZpbmVkKSB0aGlzLmxvYWRlci5wcm9ncmVzc190b3RhbCA9IHRvdGFsO1xyXG5cdH0sXHJcblx0XHJcblx0XHJcblx0Ly8vLy8vLy8vLy8vLy8vLy8vLy8vLyBBY3Rpb24gUXVldWVzIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHRjdXJyQWN0aW9uIDogbnVsbCxcclxuXHRhY3Rpb25RdWV1ZSA6IFtdLFxyXG5cdFxyXG5cdC8qKiBQYXNzIHRoaXMgYSBzZXQgb2YgZnVuY3Rpb25zIHRvIGJlIHJ1biBvbmUgYWZ0ZXIgdGhlIG90aGVyIHdoZW4gdGhlIHVzZXIgY29uZmlybXMgXHJcblx0ICogIGFuIGFjdGlvbi4gKi9cclxuXHRxdWV1ZUFjdGlvbnM6IGZ1bmN0aW9uKCkge1xyXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0dmFyIGFyZyA9IGFyZ3VtZW50c1tpXTtcclxuXHRcdFx0aWYgKCQuaXNBcnJheShhcmcpKSB7XHJcblx0XHRcdFx0Zm9yICh2YXIgaiA9IDA7IGogPCBhcmcubGVuZ3RoOyBqKyspIHtcclxuXHRcdFx0XHRcdGlmICghJC5pc0Z1bmN0aW9uKGFyZ1tqXSkpIFxyXG5cdFx0XHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJVSSBBY3Rpb25zIG11c3QgYmUgZnVuY3Rpb25zIHRvIGJlIHJ1biFcIik7XHJcblx0XHRcdFx0XHR0aGlzLmFjdGlvblF1ZXVlLnB1c2goYXJnW2pdKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0gZWxzZSBpZiAoJC5pc0Z1bmN0aW9uKGFyZ1tqXSkpIHtcclxuXHRcdFx0XHR0aGlzLmFjdGlvblF1ZXVlLnB1c2goYXJnW2pdKTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJVSSBBY3Rpb25zIG11c3QgYmUgZnVuY3Rpb25zIHRvIGJlIHJ1biFcIik7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9LFxyXG5cdFxyXG5cdC8qKiBDbGVhcnMgYWxsIHF1ZXVlZCBhY3Rpb25zIGZyb20gdGhlIHVpIGFjdGlvbiBxdWV1ZS4gVXNlIHRoaXMgc3BhcmluZ2x5LiBUaGlzIHdpbGwgXHJcblx0ICogIE5PVCB0ZXJtaW5hdGUgYW55IGN1cnJlbnRseSBydW5uaW5nIGFjdGlvbnMgb3IgY2xlYXIgYW55IHRleHQgYm94ZXMuICovXHJcblx0Y2xlYXJBY3Rpb25RdWV1ZSA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHJcblx0fSxcclxuXHRcclxuXHQvLy8vLy8vLy8vLy8vLy8vLy8vLy8vIFVJIFRocmVlLmpzIFNjZW5lIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHRzY2VuZSA6IG51bGwsXHJcblx0Y2FtZXJhIDogbnVsbCxcclxuXHRcclxuXHRfaW5pdFVJU2NlbmUgOiBmdW5jdGlvbigpIHtcclxuXHRcdFxyXG5cdFx0dGhpcy5zY2VuZSA9IG5ldyBUSFJFRS5TY2VuZSgpO1xyXG5cdFx0XHJcblx0XHR2YXIgc3cgPSAkKFwiI2dhbWVzY3JlZW5cIikud2lkdGgoKTtcclxuXHRcdHZhciBzaCA9ICQoXCIjZ2FtZXNjcmVlblwiKS5oZWlnaHQoKTtcclxuXHRcdFxyXG5cdFx0dmFyIGNhbWVyYSA9IHRoaXMuY2FtZXJhID0gbmV3IFRIUkVFLk9ydGhvZ3JhcGhpY0NhbWVyYSgwLCBzdywgc2gsIDAsIDEsIDEwMSk7XHJcblx0XHRjYW1lcmEucG9zaXRpb24uc2V0KDAsIDAsIDUxKTtcclxuXHRcdHRoaXMuc2NlbmUuYWRkKGNhbWVyYSk7XHJcblx0XHRcclxuXHRcdGZvciAodmFyIGRsb2cgaW4gdGhpcy5kaWFsb2dzKSB7XHJcblx0XHRcdC8vIGNvbnNvbGUubG9nKFwiY3JlYXRlTW9kZWw6IFwiLCBkbG9nLCB0aGlzLmRpYWxvZ3NbZGxvZ10pOyBcclxuXHRcdFx0dmFyIG1vZGVsID0gdGhpcy5kaWFsb2dzW2Rsb2ddLmNyZWF0ZU1vZGVsKCk7XHJcblx0XHRcdHRoaXMuc2NlbmUuYWRkKG1vZGVsKTtcclxuXHRcdH1cclxuXHRcdHtcclxuXHRcdFx0dmFyIG1vZGVsID0gdGhpcy5za3JpbS5jcmVhdGVNb2RlbCgpO1xyXG5cdFx0XHR0aGlzLnNjZW5lLmFkZChtb2RlbCk7XHJcblx0XHR9e1xyXG5cdFx0XHR2YXIgbW9kZWwgPSB0aGlzLmxvYWRlci5jcmVhdGVNb2RlbCgpO1xyXG5cdFx0XHR0aGlzLnNjZW5lLmFkZChtb2RlbCk7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdC8vIGNyZWF0ZURFQlVHU2V0dXAuY2FsbCh0aGlzKTtcclxuXHR9LFxyXG5cdFxyXG5cdC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cdFxyXG5cdGxvZ2ljTG9vcCA6IGZ1bmN0aW9uKGRlbHRhKSB7XHJcblx0XHRpZiAodGhpcy5jdXJyQWN0aW9uKSB7XHJcblx0XHRcdFxyXG5cdFx0fSBlbHNlIGlmICh0aGlzLmFjdGlvblF1ZXVlLmxlbmd0aCkge1xyXG5cdFx0XHR0aGlzLmN1cnJBY3Rpb24gPSB0aGlzLmFjdGlvblF1ZXVlLnNoaWZ0KCk7XHJcblx0XHRcdGNvbnRyb2xsZXIucHVzaElucHV0Q29udGV4dChcInVpYWN0aW9uXCIpO1xyXG5cdFx0XHR0aGlzLmN1cnJBY3Rpb24oKTtcclxuXHRcdFx0XHJcblx0XHRcdC8vSWYgdGhlIGFjdGlvbiBjb21wbGV0ZWQgdGhpcyB0dXJuLCBhbmQgZGlkbid0IHB1c2ggaXRzIG93biBjb250ZXh0XHJcblx0XHRcdGlmIChjb250cm9sbGVyLnBvcElucHV0Q29udGV4dChcInVpYWN0aW9uXCIpID09IFwidWlhY3Rpb25cIikge1xyXG5cdFx0XHRcdC8vQ2xlYXIgdGhlIGN1cnJlbnQgYWN0aW9uXHJcblx0XHRcdFx0dGhpcy5jdXJyQWN0aW9uID0gbnVsbDtcclxuXHRcdFx0fVxyXG5cdFx0fSBcclxuXHRcdFxyXG5cdFx0Zm9yICh2YXIgZGxvZyBpbiB0aGlzLmRpYWxvZ3MpIHtcclxuXHRcdFx0aWYgKHRoaXMuZGlhbG9nc1tkbG9nXS5hZHZhbmNlKSB7XHJcblx0XHRcdFx0aWYgKGNvbnRyb2xsZXIuaXNEb3duT25jZShcIkludGVyYWN0XCIsIFwiZGxvZ1ByaW50aW5nXCIpKSB7XHJcblx0XHRcdFx0XHR0aGlzLmRpYWxvZ3NbZGxvZ10uY29tcGxldGUoKTtcclxuXHRcdFx0XHR9IGVsc2UgaWYgKGNvbnRyb2xsZXIuaXNEb3duT25jZShcIkludGVyYWN0XCIsIFwiZGxvZ1dhaXRpbmdcIikpIHtcclxuXHRcdFx0XHRcdHRoaXMuZGlhbG9nc1tkbG9nXS5fZGlzcGxheU5leHQoKTtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0dGhpcy5kaWFsb2dzW2Rsb2ddLmFkdmFuY2UoZGVsdGEpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHR0aGlzLnNrcmltLmFkdmFuY2UoZGVsdGEpO1xyXG5cdFx0dGhpcy5sb2FkZXIuYWR2YW5jZShkZWx0YSk7XHJcblx0XHRcclxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5hbGxCdWJibGVzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdGlmICh0aGlzLmFsbEJ1YmJsZXNbaV0udmlzaWJsZSkge1xyXG5cdFx0XHRcdHRoaXMuYWxsQnViYmxlc1tpXS5fdGljayhkZWx0YSk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9LFxyXG5cdFxyXG5cdF9jb21wbGV0ZUN1cnJBY3Rpb24gOiBmdW5jdGlvbigpIHtcclxuXHRcdGlmICh0aGlzLmFjdGlvblF1ZXVlLmxlbmd0aCkge1xyXG5cdFx0XHR0aGlzLmN1cnJBY3Rpb24gPSB0aGlzLmFjdGlvblF1ZXVlLnNoaWZ0KCk7XHJcblx0XHRcdHRoaXMuY3VyckFjdGlvbigpO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0Y29udHJvbGxlci5wb3BJbnB1dENvbnRleHQoXCJ1aWFjdGlvblwiKTtcclxuXHRcdH1cclxuXHR9LFxyXG5cdFxyXG59KTtcclxuXHJcbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuLy8gU2lkZWJhciBET01cclxuXHJcblVJTWFuYWdlci5wcm90b3R5cGUuc2hvd0NoYXRUYWIgPSBmdW5jdGlvbigpe1xyXG5cdGlmICgkKFwiI3RhYi1jaGF0XCIpLmhhc0NsYXNzKFwic2VsZWN0ZWRcIikpIHJldHVybjtcclxuXHRcclxuXHQkKFwiI3JpZ2h0LXNpZGViYXIgLnRhYlwiKS5yZW1vdmVDbGFzcyhcInNlbGVjdGVkXCIpO1xyXG5cdCQoXCIjdGFiLWNoYXRcIikuYWRkQ2xhc3MoXCJzZWxlY3RlZFwiKTtcclxuXHRcclxuXHQkKFwiI3JpZ2h0LXNpZGViYXIgLnRhYmNvbnRhaW5lclwiKS5oaWRlKCk7XHJcblx0JChcIiNjaGF0LWNvbnRhaW5lclwiKS5zaG93KCk7XHJcbn07XHJcblxyXG5VSU1hbmFnZXIucHJvdG90eXBlLnNob3dJbmZvZGV4VGFiID0gZnVuY3Rpb24oKXtcclxuXHRpZiAoJChcIiN0YWItZGV4XCIpLmhhc0NsYXNzKFwic2VsZWN0ZWRcIikpIHJldHVybjtcclxuXHRcclxuXHQkKFwiI3JpZ2h0LXNpZGViYXIgLnRhYlwiKS5yZW1vdmVDbGFzcyhcInNlbGVjdGVkXCIpO1xyXG5cdCQoXCIjdGFiLWRleFwiKS5hZGRDbGFzcyhcInNlbGVjdGVkXCIpO1xyXG5cdFxyXG5cdCQoXCIjcmlnaHQtc2lkZWJhciAudGFiY29udGFpbmVyXCIpLmhpZGUoKTtcclxuXHQkKFwiI2RleC1jb250YWluZXJcIikuc2hvdygpO1xyXG59O1xyXG5cclxuVUlNYW5hZ2VyLnByb3RvdHlwZS5vcGVuSW5mb2RleFBhZ2UgPSBmdW5jdGlvbihwYWdlaWQpIHtcclxuXHRcclxufTtcclxuXHJcbiQoZnVuY3Rpb24oKXsgLy8gT24gUmVhZHkgU2V0dXBcclxuXHQkKFwiI3RhYi1jaGF0XCIpLmNsaWNrKFVJTWFuYWdlci5wcm90b3R5cGUuc2hvd0NoYXRUYWIpO1xyXG5cdCQoXCIjdGFiLWRleFwiKS5jbGljayhVSU1hbmFnZXIucHJvdG90eXBlLnNob3dJbmZvZGV4VGFiKTtcclxuXHRcclxuXHRVSU1hbmFnZXIucHJvdG90eXBlLnNob3dDaGF0VGFiKCk7XHJcbn0pO1xyXG5cclxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cclxuZnVuY3Rpb24gRGlhbG9nQm94KHR5cGUpIHtcclxuXHR0aGlzLnR5cGUgPSB0eXBlO1xyXG59XHJcbmV4dGVuZChEaWFsb2dCb3gucHJvdG90eXBlLCB7XHJcblx0bW9kZWwgOiBudWxsLFxyXG5cdGVsZW1lbnQgOiBudWxsLFxyXG5cdG93bmVyIDogbnVsbCxcdFxyXG5cdGh0bWwgOiBbXSxcclxuXHRhdXRvQ2xvc2U6IHRydWUsXHJcblx0XHJcblx0YWR2YW5jZSA6IG51bGwsXHJcblx0Y29tcGxldGU6IGZ1bmN0aW9uKCl7fSxcclxuXHRfY29tcGxldGlvbkNhbGxiYWNrIDogbnVsbCwgLy9jYWxsYmFjayBmcm9tIHRoZSBldmVudCBzdGFydGluZyB0aGlzIGRpYWxvZy5cclxuXHRcclxuXHRzaG93IDogZnVuY3Rpb24ob3B0cykge1xyXG5cdFx0Ly8gaWYgKCFvcHRzLmh0bWwpIHtcclxuXHRcdC8vIFx0dGhyb3cgbmV3IEVycm9yKFwiTm8gSFRNTCBnaXZlbiB0byB0aGUgZGlhbG9nYm94J3Mgc2hvdygpIG1ldGhvZCFcIik7XHJcblx0XHQvLyB9XHJcblx0XHRcclxuXHRcdG9wdHMgPSBleHRlbmQoe1xyXG5cdFx0XHRvd25lcjogbnVsbCxcclxuXHRcdFx0aXNMYXN0IDogZmFsc2UsXHJcblx0XHRcdGF1dG9DbG9zZTogdHJ1ZSxcclxuXHRcdH0sIG9wdHMpO1xyXG5cdFx0XHJcblx0XHR0aGlzLm93bmVyID0gb3B0cy5vd25lcjtcclxuXHRcdHRoaXMuYXV0b0Nsb3NlID0gb3B0cy5hdXRvQ2xvc2U7XHJcblx0XHRcclxuXHRcdHRoaXMuX2NvbXBsZXRpb25DYWxsYmFjayA9IG9wdHMuY29tcGxldGU7XHJcblx0XHRcclxuXHRcdGlmICh0eXBlb2Ygb3B0cy5odG1sID09IFwic3RyaW5nXCIpIHtcclxuXHRcdFx0dGhpcy5odG1sID0gW29wdHMuaHRtbF07XHJcblx0XHR9IGVsc2UgaWYgKCQuaXNBcnJheShvcHRzLmh0bWwpKSB7XHJcblx0XHRcdHRoaXMuaHRtbCA9IG9wdHMuaHRtbC5zbGljZSgpO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihcIkRpYWxvZyBnaXZlbiBpcyBvZiB0aGUgd3JvbmcgdHlwZSEgXCIsIG9wdHMuaHRtbCk7XHJcblx0XHRcdHRoaXMuaHRtbCA9IFtcIltFUlJPUjogVGhpcyBkaWFsb2cgdGV4dCBjb3VsZCBub3QgYmUgbG9hZGVkIHByb3Blcmx5IV1cIl07XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdHRoaXMuX2Rpc3BsYXkoKTtcclxuXHR9LFxyXG5cdFxyXG5cdGhpZGUgOiBmdW5jdGlvbigpIHtcclxuXHRcdHRoaXMubW9kZWwudmlzaWJsZSA9IGZhbHNlO1xyXG5cdFx0dGhpcy5lbGVtZW50LmhpZGUoKS5jc3MoeyB3aWR0aDpcIlwiLCBoZWlnaHQ6XCJcIiwgYm90dG9tOlwiXCIsIGxlZnQ6XCJcIiwgdG9wOlwiXCIsIHJpZ2h0OlwiXCIgfSk7XHJcblx0XHR0aGlzLmh0bWwgPSBbXTtcclxuXHRcdHRoaXMuYWR2YW5jZSA9IG51bGw7XHJcblx0XHRcclxuXHRcdGlmICh0aGlzLl9jb21wbGV0aW9uQ2FsbGJhY2spXHJcblx0XHRcdHRoaXMuX2NvbXBsZXRpb25DYWxsYmFjay5jYWxsKG51bGwpO1xyXG5cdH0sXHJcblx0XHJcblx0X2Rpc3BsYXk6IGZ1bmN0aW9uKCkge1xyXG5cdFx0Ly8gb3B0cyA9IGV4dGVuZChvcHRzLCB7XHJcblx0XHQvLyBcdGFuY2hvclk6IFwiYm90dG9tXCIsXHJcblx0XHQvLyBcdGFuY2hvclg6IFwibGVmdFwiLFxyXG5cdFx0Ly8gfSk7XHJcblx0XHRcclxuXHRcdC8vIFN0ZXAgMTogc2l6ZSBvdXQgdGhlIHRleHRib3ggc3BhY2VcclxuXHRcdHZhciBlID0gdGhpcy5lbGVtZW50O1xyXG5cdFx0ZS5jc3MoeyB3aWR0aDpcIlwiLCBoZWlnaHQ6XCJcIiwgYm90dG9tOlwiXCIsIGxlZnQ6XCJcIiwgdG9wOlwiXCIsIHJpZ2h0OlwiXCIgfSk7IC8vcmVzZXRcclxuXHRcdFxyXG5cdFx0ZS5jc3MoeyBcInZpc2liaWxpdHlcIjogXCJoaWRkZW5cIiB9KS5zaG93KCk7IC8vTm90ZTogJC5zaG93KCkgZG9lcyBub3QgYWZmZWN0IFwidmlzaWJpbGl0eVwiXHJcblx0XHR2YXIgd2lkdGggPSAwLCBoZWlnaHQgPSAwO1xyXG5cdFx0Ly8gdmFyIHcsIGg7XHJcblx0XHRcclxuXHRcdC8vRm9yIGVhY2ggZGlhbG9nIGluIHRoZSB0ZXh0IHRvIGRpc3BsYXksIHNpemUgb3V0IHRoZSBib3ggdG8gZml0IHRoZSBsYXJnZXN0IG9uZVxyXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmh0bWwubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0dmFyIGYgPSB0aGlzLmh0bWxbaV07XHJcblx0XHRcdGlmICh0eXBlb2YgZiAhPSBcInN0cmluZ1wiKSBjb250aW51ZTtcclxuXHRcdFx0ZS5odG1sKGYpO1xyXG5cdFx0XHR3aWR0aCA9IE1hdGgubWF4KGUuaW5uZXJXaWR0aCgpLCB3aWR0aCk7XHJcblx0XHRcdGhlaWdodCA9IE1hdGgubWF4KGUuaW5uZXJIZWlnaHQoKSwgaGVpZ2h0KTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0dmFyIGRpZnggPSBlLmlubmVyV2lkdGgoKSAtIGUud2lkdGgoKTtcclxuXHRcdHZhciBkaWZ5ID0gZS5pbm5lckhlaWdodCgpIC0gZS5oZWlnaHQoKTtcclxuXHRcdFxyXG5cdFx0Ly8gU3RlcCAyOiByZXNpemUgYW5kIHBvc2l0aW9uIHRoZSB0ZXh0Ym94ZXNcclxuXHRcdHRoaXMubW9kZWwubW9ycGhUYXJnZXRJbmZsdWVuY2VzW01fV0lEVEhdID0gd2lkdGg7XHJcblx0XHR0aGlzLm1vZGVsLm1vcnBoVGFyZ2V0SW5mbHVlbmNlc1tNX0hFSUdIVF0gPSBoZWlnaHQ7XHJcblx0XHRlLmNzcyh7IHdpZHRoOiB3aWR0aC1kaWZ4KzIsIGhlaWdodDogaGVpZ2h0LWRpZnkgfSk7XHJcblx0XHRcclxuXHRcdC8vVE9ETyBiYXNlIG9uIGFuY2hvciBwb2ludHNcclxuXHRcdHRoaXMubW9kZWwucG9zaXRpb24uc2V0KDEwLCAxMCwgMCk7XHJcblx0XHRlLmNzcyh7IGJvdHRvbTogMTAsIGxlZnQ6IDEwLCB0b3A6IFwiXCIgfSk7XHJcblx0XHRcclxuXHRcdC8vVE9ETyBtb3ZlIGludG8gYW4gXCJhZHZhbmNlXCJcclxuXHRcdGlmICh0aGlzLm93bmVyICYmIHRoaXMub3duZXIuZ2V0VGFsa2luZ0FuY2hvcikge1xyXG5cdFx0XHQvL1RPRE8gZGV0ZXJtaW5lIGFuY2hvciBwb2ludCBiYXNlZCBvbiB3aGVyZSB0aGUgb3duZXIgaXMgb24tc2NyZWVuXHJcblx0XHRcdC8vUHJvamVjdCBWZWN0b3IgPSAzRCB0byAyRCwgVW5wcm9qZWN0IFZlY3RvciA9IDJEIHRvIDNEXHJcblx0XHRcdHZhciBhbmNob3IgPSB0aGlzLm93bmVyLmdldFRhbGtpbmdBbmNob3IoKTtcclxuXHRcdFx0YW5jaG9yLnByb2plY3QoY3VycmVudE1hcC5jYW1lcmEpO1xyXG5cdFx0XHR0aGlzLm1vZGVsLm1vcnBoVGFyZ2V0SW5mbHVlbmNlc1tNX1RBSUxYXSA9IGFuY2hvci54IC0gdGhpcy5tb2RlbC5wb3NpdGlvbi54O1xyXG5cdFx0XHR0aGlzLm1vZGVsLm1vcnBoVGFyZ2V0SW5mbHVlbmNlc1tNX1RBSUxZXSA9IGFuY2hvci55IC0gdGhpcy5tb2RlbC5wb3NpdGlvbi55O1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHRcclxuXHRcdFxyXG5cdFx0Ly8gU3RlcCAzOiBzZXR1cCB0eXBld3JpdGVyIGVmZmVjdCBhbmQgc2hvdyBkaWFsb2dib3hcclxuXHRcdHRoaXMuX2Rpc3BsYXlOZXh0KCk7XHJcblx0XHRcclxuXHRcdGUuY3NzKHsgXCJ2aXNpYmlsaXR5XCI6IFwiXCIgfSk7XHJcblx0XHR0aGlzLm1vZGVsLnZpc2libGUgPSB0cnVlO1xyXG5cdFx0XHJcblx0fSxcclxuXHRcclxuXHQvKiogRGlhbG9nIGlzIGFscmVhZHkgc2hvd2luZyBhbmQgc2l6ZWQsIHNob3cgbmV4dCBkaWFsb2csIG9yIGNsb3NlLiAqL1xyXG5cdF9kaXNwbGF5TmV4dCA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0dmFyIHR4dDtcclxuXHRcdHdoaWxlKHRoaXMuaHRtbCAmJiB0aGlzLmh0bWwubGVuZ3RoKSB7XHJcblx0XHRcdHR4dCA9IHRoaXMuaHRtbC5zaGlmdCgpO1xyXG5cdFx0XHRjb25zb2xlLmxvZyhcInNoaWZ0OiBcIiwgdHh0KTtcclxuXHRcdFx0aWYgKHR5cGVvZiB0eHQgPT0gXCJmdW5jdGlvblwiKSB7XHJcblx0XHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRcdHR4dCA9IHR4dC5jYWxsKHRoaXMub3duZXIpO1xyXG5cdFx0XHRcdH0gY2F0Y2goZSkgeyBjb25zb2xlLmVycm9yKFwiRGlhbG9nIGZ1bmN0aW9uIHRocmV3IGFuIGVycm9yIVwiLCBlKTsgfVxyXG5cdFx0XHRcdGlmICghdHh0KSBjb250aW51ZTtcclxuXHRcdFx0fVxyXG5cdFx0XHRicmVhaztcclxuXHRcdH1cclxuXHRcdGNvbnNvbGUubG9nKFwiYnJlYWs6IFwiLCB0eHQpO1xyXG5cdFx0XHRcclxuXHRcdGlmICh0eHQpIHtcclxuXHRcdFx0XHJcblx0XHRcdGNvbnRyb2xsZXIucG9wSW5wdXRDb250ZXh0KFwiZGxvZ1dhaXRpbmdcIik7XHJcblx0XHRcdGNvbnRyb2xsZXIucHVzaElucHV0Q29udGV4dChcImRsb2dQcmludGluZ1wiKTtcclxuXHRcdFx0XHJcblx0XHRcdGNvbnNvbGUubG9nKFwicHVzaDogXCIsIHR4dCk7XHJcblx0XHRcdFxyXG5cdFx0XHR0aGlzLmVsZW1lbnQuaHRtbCh0eHQpOyAvL3B1dCBpbiBmaXJzdCBkaWFsb2dcclxuXHRcdFx0dGhpcy5tb2RlbC5tb3JwaFRhcmdldEluZmx1ZW5jZXNbTV9UUklBTkdMRV0gPSAodGhpcy5odG1sLmxlbmd0aCk/IDE6IDA7XHJcblx0XHRcdFxyXG5cdFx0XHRzZXR1cFR5cGV3cml0ZXIodGhpcywgZnVuY3Rpb24oKXtcclxuXHRcdFx0XHRjb250cm9sbGVyLnBvcElucHV0Q29udGV4dChcImRsb2dQcmludGluZ1wiKTtcclxuXHRcdFx0XHRjb250cm9sbGVyLnB1c2hJbnB1dENvbnRleHQoXCJkbG9nV2FpdGluZ1wiKTtcclxuXHRcdFx0fSk7XHJcblx0XHRcdFxyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0Y29uc29sZS5sb2coXCJlbmQ6IFwiLCB0eHQpO1xyXG5cdFx0XHRjb250cm9sbGVyLnBvcElucHV0Q29udGV4dChcImRsb2dXYWl0aW5nXCIpO1xyXG5cdFx0XHRpZiAodGhpcy5hdXRvQ2xvc2UpXHJcblx0XHRcdFx0dGhpcy5oaWRlKCk7XHJcblx0XHR9XHJcblx0XHRcclxuXHR9LFxyXG5cdFxyXG5cdFxyXG5cdGNyZWF0ZU1vZGVsOiBmdW5jdGlvbigpIHtcclxuXHRcdHZhciBzZWxmID0gdGhpcztcclxuXHRcdHZhciBpbnM7IC8vaW5zZXRzXHJcblx0XHRzd2l0Y2ggKHRoaXMudHlwZSkge1xyXG5cdFx0XHRjYXNlIFwiZGlhbG9nX2J1YmJsZVwiOlxyXG5cdFx0XHRcdGlucyA9IHsgLy9yZW1lbWJlciwgbWVhc3VyZWQgZnJvbSBib3R0b20gbGVmdCBjb3JuZXJcclxuXHRcdFx0XHRcdHQ6IDYsIGI6IDEwLCBoOiAxNiwgLy90b3AsIGJvdHRvbSwgaGVpZ2h0XHJcblx0XHRcdFx0XHRsOiA2LCByOiAxMCwgdzogMTYsIC8vbGVmdCwgcmlnaHQsIHdpZHRoXHJcblx0XHRcdFx0XHRhczogNCwgYXg6IDYsIGF5OiAxMCwgLy9hcnJvdyBzaXplLCB4L3kgcG9zaXRpb25cclxuXHRcdFx0XHR9O1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRjYXNlIFwidGV4dGJveF9nb2xkXCI6XHJcblx0XHRcdFx0aW5zID0geyBcclxuXHRcdFx0XHRcdHQ6IDcsIGI6IDEwLCBoOiAxNixcclxuXHRcdFx0XHRcdGw6IDksIHI6IDEyLCB3OiAzMixcclxuXHRcdFx0XHRcdGFzOiA0LCBheDogMjIsIGF5OiAxMCxcclxuXHRcdFx0XHR9O1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHR2YXIgZ2VvbSA9IG5ldyBUSFJFRS5HZW9tZXRyeSgpO1xyXG5cdFx0e1xyXG5cdFx0XHRnZW9tLnZlcnRpY2VzID0gW1xyXG5cdFx0XHRcdHYzKDAsICAgICAwKSwgdjMoaW5zLmwsICAgICAwKSwgdjMoaW5zLnIsICAgICAwKSwgdjMoaW5zLncsICAgICAwKSwgLy8wLTNcclxuXHRcdFx0XHR2MygwLCBpbnMudCksIHYzKGlucy5sLCBpbnMudCksIHYzKGlucy5yLCBpbnMudCksIHYzKGlucy53LCBpbnMudCksIC8vNC03XHJcblx0XHRcdFx0djMoMCwgaW5zLmIpLCB2MyhpbnMubCwgaW5zLmIpLCB2MyhpbnMuciwgaW5zLmIpLCB2MyhpbnMudywgaW5zLmIpLCAvLzgtMTFcclxuXHRcdFx0XHR2MygwLCBpbnMuaCksIHYzKGlucy5sLCBpbnMuaCksIHYzKGlucy5yLCBpbnMuaCksIHYzKGlucy53LCBpbnMuaCksIC8vMTItMTVcclxuXHRcdFx0XHRcclxuXHRcdFx0XHR2MyhpbnMuYXgraW5zLmFzLCBpbnMuYXkraW5zLmFzLCAxKSwgdjMoaW5zLmF4LWlucy5hcywgaW5zLmF5K2lucy5hcywgMSksIC8vMTYtMTdcclxuXHRcdFx0XHR2MyhpbnMuYXgraW5zLmFzLCBpbnMuYXktaW5zLmFzLCAxKSwgdjMoaW5zLmF4LWlucy5hcywgaW5zLmF5LWlucy5hcywgMSksIC8vMTgtMTlcclxuXHRcdFx0XHRcclxuXHRcdFx0XHR2MygwLCBpbnMuaC8yLCAtMSksIHYzKDE2LCBpbnMuaC8yLCAtMSksIHYzKDAsIDAsIC0xKSwgLy8yMC0yMlxyXG5cdFx0XHRdO1xyXG5cdFx0XHRmNChnZW9tLCAwLCAxLCA0LCA1KTsgZjQoZ2VvbSwgMSwgMiwgNSwgNik7IGY0KGdlb20sIDIsIDMsIDYsIDcpO1xyXG5cdFx0XHRmNChnZW9tLCA0LCA1LCA4LCA5KTsgZjQoZ2VvbSwgNSwgNiwgOSwxMCk7IGY0KGdlb20sIDYsIDcsMTAsMTEpO1xyXG5cdFx0XHRmNChnZW9tLCA4LCA5LDEyLDEzKTsgZjQoZ2VvbSwgOSwxMCwxMywxNCk7IGY0KGdlb20sMTAsMTEsMTQsMTUpO1xyXG5cdFx0XHRmNChnZW9tLDE2LDE3LDE4LDE5LCAxKTtcclxuXHRcdFx0XHJcblx0XHRcdHtcclxuXHRcdFx0XHRnZW9tLmZhY2VzLnB1c2gobmV3IFRIUkVFLkZhY2UzKDIyLCAyMCwgMjEsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCAwKSk7XHJcblx0XHRcdFx0Ly8gZ2VvbS5mYWNlcy5wdXNoKG5ldyBUSFJFRS5GYWNlMygyMiwgMjEsIDIwKSk7XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0Z2VvbS5mYWNlVmVydGV4VXZzWzBdLnB1c2goWyBuZXcgVEhSRUUuVmVjdG9yMihpbnMubCwgaW5zLnQpLCBuZXcgVEhSRUUuVmVjdG9yMihpbnMubCwgaW5zLnQpLCBuZXcgVEhSRUUuVmVjdG9yMihpbnMubCwgaW5zLnQpLCBdKTtcclxuXHRcdFx0XHQvLyBnZW9tLmZhY2VWZXJ0ZXhVdnNbMF0ucHVzaChbIG5ldyBUSFJFRS5WZWN0b3IyKGlucy5sLCBpbnMudCksIG5ldyBUSFJFRS5WZWN0b3IyKGlucy5sLCBpbnMudCksIG5ldyBUSFJFRS5WZWN0b3IyKGlucy5sLCBpbnMudCksIF0pO1xyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHRnZW9tLm1vcnBoVGFyZ2V0cyA9IFtcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHRuYW1lOiBcIndpZHRoXCIsIHZlcnRpY2VzOiBbXHJcblx0XHRcdFx0XHRcdHYzKDAsICAgICAwKSwgdjMoaW5zLmwsICAgICAwKSwgdjMoaW5zLnIrMSwgICAgIDApLCB2MyhpbnMudysxLCAgICAgMCksIC8vMC0zXHJcblx0XHRcdFx0XHRcdHYzKDAsIGlucy50KSwgdjMoaW5zLmwsIGlucy50KSwgdjMoaW5zLnIrMSwgaW5zLnQpLCB2MyhpbnMudysxLCBpbnMudCksIC8vNC03XHJcblx0XHRcdFx0XHRcdHYzKDAsIGlucy5iKSwgdjMoaW5zLmwsIGlucy5iKSwgdjMoaW5zLnIrMSwgaW5zLmIpLCB2MyhpbnMudysxLCBpbnMuYiksIC8vOC0xMVxyXG5cdFx0XHRcdFx0XHR2MygwLCBpbnMuaCksIHYzKGlucy5sLCBpbnMuaCksIHYzKGlucy5yKzEsIGlucy5oKSwgdjMoaW5zLncrMSwgaW5zLmgpLCAvLzEyLTE1XHJcblx0XHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0XHR2MyhpbnMuYXgraW5zLmFzKzEsIGlucy5heStpbnMuYXMsIDEpLCB2MyhpbnMuYXgtaW5zLmFzKzEsIGlucy5heStpbnMuYXMsIDEpLCAvLzE2LTE3XHJcblx0XHRcdFx0XHRcdHYzKGlucy5heCtpbnMuYXMrMSwgaW5zLmF5LWlucy5hcywgMSksIHYzKGlucy5heC1pbnMuYXMrMSwgaW5zLmF5LWlucy5hcywgMSksIC8vMTgtMTlcclxuXHRcdFx0XHRcdFx0XHJcblx0XHRcdFx0XHRcdHYzKDArMC41LCAoaW5zLmgpLzIsIC0xKSwgdjMoMTYrMC41LCAoaW5zLmgpLzIsIC0xKSwgdjMoMCwgMCwgLTEpLCAvLzIwLTIyXHJcblx0XHRcdFx0XHRdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0bmFtZTogXCJoZWlnaHRcIiwgdmVydGljZXM6IFtcclxuXHRcdFx0XHRcdFx0djMoMCwgICAgIDAgICksIHYzKGlucy5sLCAgICAgMCAgKSwgdjMoaW5zLnIsICAgICAwICApLCB2MyhpbnMudywgICAgIDAgICksIC8vMC0zXHJcblx0XHRcdFx0XHRcdHYzKDAsIGlucy50ICApLCB2MyhpbnMubCwgaW5zLnQgICksIHYzKGlucy5yLCBpbnMudCAgKSwgdjMoaW5zLncsIGlucy50ICApLCAvLzQtN1xyXG5cdFx0XHRcdFx0XHR2MygwLCBpbnMuYisxKSwgdjMoaW5zLmwsIGlucy5iKzEpLCB2MyhpbnMuciwgaW5zLmIrMSksIHYzKGlucy53LCBpbnMuYisxKSwgLy84LTExXHJcblx0XHRcdFx0XHRcdHYzKDAsIGlucy5oKzEpLCB2MyhpbnMubCwgaW5zLmgrMSksIHYzKGlucy5yLCBpbnMuaCsxKSwgdjMoaW5zLncsIGlucy5oKzEpLCAvLzEyLTE1XHJcblx0XHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0XHR2MyhpbnMuYXgraW5zLmFzLCBpbnMuYXkraW5zLmFzLCAxKSwgdjMoaW5zLmF4LWlucy5hcywgaW5zLmF5K2lucy5hcywgMSksIC8vMTYtMTdcclxuXHRcdFx0XHRcdFx0djMoaW5zLmF4K2lucy5hcywgaW5zLmF5LWlucy5hcywgMSksIHYzKGlucy5heC1pbnMuYXMsIGlucy5heS1pbnMuYXMsIDEpLCAvLzE4LTE5XHJcblx0XHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0XHR2MygwLCAoaW5zLmgrMSkvMiwgLTEpLCB2MygxNiwgKGlucy5oKzEpLzIsIC0xKSwgdjMoMCwgMCwgLTEpLCAvLzIwLTIyXHJcblx0XHRcdFx0XHRdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0bmFtZTogXCJoaWRlU3RvcFwiLCB2ZXJ0aWNlczogW1xyXG5cdFx0XHRcdFx0XHR2MygwLCAgICAgMCksIHYzKGlucy5sLCAgICAgMCksIHYzKGlucy5yLCAgICAgMCksIHYzKGlucy53LCAgICAgMCksIC8vMC0zXHJcblx0XHRcdFx0XHRcdHYzKDAsIGlucy50KSwgdjMoaW5zLmwsIGlucy50KSwgdjMoaW5zLnIsIGlucy50KSwgdjMoaW5zLncsIGlucy50KSwgLy80LTdcclxuXHRcdFx0XHRcdFx0djMoMCwgaW5zLmIpLCB2MyhpbnMubCwgaW5zLmIpLCB2MyhpbnMuciwgaW5zLmIpLCB2MyhpbnMudywgaW5zLmIpLCAvLzgtMTFcclxuXHRcdFx0XHRcdFx0djMoMCwgaW5zLmgpLCB2MyhpbnMubCwgaW5zLmgpLCB2MyhpbnMuciwgaW5zLmgpLCB2MyhpbnMudywgaW5zLmgpLCAvLzEyLTE1XHJcblx0XHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0XHR2MyhpbnMuYXgraW5zLmFzLCBpbnMuYXkraW5zLmFzLC0xKSwgdjMoaW5zLmF4LWlucy5hcywgaW5zLmF5K2lucy5hcywtMSksIC8vMTYtMTdcclxuXHRcdFx0XHRcdFx0djMoaW5zLmF4K2lucy5hcywgaW5zLmF5LWlucy5hcywtMSksIHYzKGlucy5heC1pbnMuYXMsIGlucy5heS1pbnMuYXMsLTEpLCAvLzE4LTE5XHJcblx0XHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0XHR2MygwLCBpbnMuaC8yLCAtMSksIHYzKDE2LCBpbnMuaC8yLCAtMSksIHYzKDAsIDAsIC0xKSwgLy8yMC0yMlxyXG5cdFx0XHRcdFx0XSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdG5hbWU6IFwidHJpYW5nbGVcIiwgdmVydGljZXM6IFtcclxuXHRcdFx0XHRcdFx0djMoMCwgICAgIDApLCB2MyhpbnMubCwgICAgIDApLCB2MyhpbnMuciwgICAgIDApLCB2MyhpbnMudywgICAgIDApLCAvLzAtM1xyXG5cdFx0XHRcdFx0XHR2MygwLCBpbnMudCksIHYzKGlucy5sLCBpbnMudCksIHYzKGlucy5yLCBpbnMudCksIHYzKGlucy53LCBpbnMudCksIC8vNC03XHJcblx0XHRcdFx0XHRcdHYzKDAsIGlucy5iKSwgdjMoaW5zLmwsIGlucy5iKSwgdjMoaW5zLnIsIGlucy5iKSwgdjMoaW5zLncsIGlucy5iKSwgLy84LTExXHJcblx0XHRcdFx0XHRcdHYzKDAsIGlucy5oKSwgdjMoaW5zLmwsIGlucy5oKSwgdjMoaW5zLnIsIGlucy5oKSwgdjMoaW5zLncsIGlucy5oKSwgLy8xMi0xNVxyXG5cdFx0XHRcdFx0XHRcclxuXHRcdFx0XHRcdFx0djMoaW5zLmF4K2lucy5hcywgaW5zLmF5K2lucy5hcywgMSksIHYzKGlucy5heC1pbnMuYXMsIGlucy5heStpbnMuYXMsIDEpLCAvLzE2LTE3XHJcblx0XHRcdFx0XHRcdHYzKGlucy5heCAgICAgICAsIGlucy5heS1pbnMuYXMsIDEpLCB2MyhpbnMuYXggICAgICAgLCBpbnMuYXktaW5zLmFzLCAxKSwgLy8xOC0xOVxyXG5cdFx0XHRcdFx0XHRcclxuXHRcdFx0XHRcdFx0djMoMCwgaW5zLmgvMiwgLTEpLCB2MygxNiwgaW5zLmgvMiwgLTEpLCB2MygwLCAwLCAtMSksIC8vMjAtMjJcclxuXHRcdFx0XHRcdF0sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHRuYW1lOiBcInRhaWxYXCIsIHZlcnRpY2VzOiBbXHJcblx0XHRcdFx0XHRcdHYzKDAsICAgICAwKSwgdjMoaW5zLmwsICAgICAwKSwgdjMoaW5zLnIsICAgICAwKSwgdjMoaW5zLncsICAgICAwKSwgLy8wLTNcclxuXHRcdFx0XHRcdFx0djMoMCwgaW5zLnQpLCB2MyhpbnMubCwgaW5zLnQpLCB2MyhpbnMuciwgaW5zLnQpLCB2MyhpbnMudywgaW5zLnQpLCAvLzQtN1xyXG5cdFx0XHRcdFx0XHR2MygwLCBpbnMuYiksIHYzKGlucy5sLCBpbnMuYiksIHYzKGlucy5yLCBpbnMuYiksIHYzKGlucy53LCBpbnMuYiksIC8vOC0xMVxyXG5cdFx0XHRcdFx0XHR2MygwLCBpbnMuaCksIHYzKGlucy5sLCBpbnMuaCksIHYzKGlucy5yLCBpbnMuaCksIHYzKGlucy53LCBpbnMuaCksIC8vMTItMTVcclxuXHRcdFx0XHRcdFx0XHJcblx0XHRcdFx0XHRcdHYzKGlucy5heCtpbnMuYXMsIGlucy5heStpbnMuYXMsIDEpLCB2MyhpbnMuYXgtaW5zLmFzLCBpbnMuYXkraW5zLmFzLCAxKSwgLy8xNi0xN1xyXG5cdFx0XHRcdFx0XHR2MyhpbnMuYXgraW5zLmFzLCBpbnMuYXktaW5zLmFzLCAxKSwgdjMoaW5zLmF4LWlucy5hcywgaW5zLmF5LWlucy5hcywgMSksIC8vMTgtMTlcclxuXHRcdFx0XHRcdFx0XHJcblx0XHRcdFx0XHRcdHYzKDAsIGlucy5oLzIsIC0xKSwgdjMoMTYsIGlucy5oLzIsIC0xKSwgdjMoMSwgMCwgLTEpLCAvLzIwLTIyXHJcblx0XHRcdFx0XHRdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0bmFtZTogXCJ0YWlsWVwiLCB2ZXJ0aWNlczogW1xyXG5cdFx0XHRcdFx0XHR2MygwLCAgICAgMCksIHYzKGlucy5sLCAgICAgMCksIHYzKGlucy5yLCAgICAgMCksIHYzKGlucy53LCAgICAgMCksIC8vMC0zXHJcblx0XHRcdFx0XHRcdHYzKDAsIGlucy50KSwgdjMoaW5zLmwsIGlucy50KSwgdjMoaW5zLnIsIGlucy50KSwgdjMoaW5zLncsIGlucy50KSwgLy80LTdcclxuXHRcdFx0XHRcdFx0djMoMCwgaW5zLmIpLCB2MyhpbnMubCwgaW5zLmIpLCB2MyhpbnMuciwgaW5zLmIpLCB2MyhpbnMudywgaW5zLmIpLCAvLzgtMTFcclxuXHRcdFx0XHRcdFx0djMoMCwgaW5zLmgpLCB2MyhpbnMubCwgaW5zLmgpLCB2MyhpbnMuciwgaW5zLmgpLCB2MyhpbnMudywgaW5zLmgpLCAvLzEyLTE1XHJcblx0XHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0XHR2MyhpbnMuYXgraW5zLmFzLCBpbnMuYXkraW5zLmFzLCAxKSwgdjMoaW5zLmF4LWlucy5hcywgaW5zLmF5K2lucy5hcywgMSksIC8vMTYtMTdcclxuXHRcdFx0XHRcdFx0djMoaW5zLmF4K2lucy5hcywgaW5zLmF5LWlucy5hcywgMSksIHYzKGlucy5heC1pbnMuYXMsIGlucy5heS1pbnMuYXMsIDEpLCAvLzE4LTE5XHJcblx0XHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0XHR2MygwLCBpbnMuaC8yLCAtMSksIHYzKDE2LCBpbnMuaC8yLCAtMSksIHYzKDAsIDEsIC0xKSwgLy8yMC0yMlxyXG5cdFx0XHRcdFx0XSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRdO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHRcclxuXHRcdHZhciBtYXQgPSBuZXcgVEhSRUUuTWVzaEZhY2VNYXRlcmlhbChbXHJcblx0XHRcdChmdW5jdGlvbigpe1xyXG5cdFx0XHRcdHZhciBtYXQgPSBuZXcgVEhSRUUuTWVzaEJhc2ljTWF0ZXJpYWwoKTtcclxuXHRcdFx0XHRcclxuXHRcdFx0XHR2YXIgdGV4ID0gbmV3IFRIUkVFLlRleHR1cmUoKTtcclxuXHRcdFx0XHR0ZXgubWFnRmlsdGVyID0gVEhSRUUuTmVhcmVzdEZpbHRlcjtcclxuXHRcdFx0XHR0ZXgubWluRmlsdGVyID0gVEhSRUUuTmVhcmVzdEZpbHRlcjtcclxuXHRcdFx0XHR0ZXguYW5pc290cm9weSA9IDE7XHJcblx0XHRcdFx0dGV4LmdlbmVyYXRlTWlwbWFwcyA9IGZhbHNlO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdHZhciBpbWcgPSBuZXcgSW1hZ2UoKTtcclxuXHRcdFx0XHRmdW5jdGlvbiBmKCl7XHJcblx0XHRcdFx0XHR0ZXguaW1hZ2UgPSBpbWc7XHJcblx0XHRcdFx0XHR0ZXgubmVlZHNVcGRhdGUgPSB0cnVlO1xyXG5cdFx0XHRcdFx0aW1nLnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJsb2FkXCIsIGYpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRpbWcub24oXCJsb2FkXCIsIGYpO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdGltZy5zcmMgPSBCQVNFVVJMK1wiL2ltZy91aS9cIitzZWxmLnR5cGUrXCIucG5nXCI7XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0bWF0Lm1hcCA9IHRleDtcclxuXHRcdFx0XHRtYXQubW9ycGhUYXJnZXRzID0gdHJ1ZTtcclxuXHRcdFx0XHRtYXQudHJhbnNwYXJlbnQgPSB0cnVlO1xyXG5cdFx0XHRcdG1hdC5hbHBoYVRlc3QgPSAwLjA1O1xyXG5cdFx0XHRcdHJldHVybiBtYXQ7XHJcblx0XHRcdH0pKCksXHJcblx0XHRcdFxyXG5cdFx0XHQoZnVuY3Rpb24oKXtcclxuXHRcdFx0XHR2YXIgbWF0ID0gbmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHtcclxuXHRcdFx0XHRcdGNvbG9yOiAweDAwMDAwMCxcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0XHRtYXQubW9ycGhUYXJnZXRzID0gdHJ1ZTtcclxuXHRcdFx0XHRyZXR1cm4gbWF0O1xyXG5cdFx0XHR9KSgpLFxyXG5cdFx0XSk7XHJcblx0XHRcclxuXHRcdHRoaXMubW9kZWwgPSBuZXcgVEhSRUUuTWVzaChnZW9tLCBtYXQpO1xyXG5cdFx0dGhpcy5tb2RlbC52aXNpYmxlID0gZmFsc2U7XHJcblx0XHR0aGlzLm1vZGVsLnJlbmRlckRlcHRoID0gMDtcclxuXHRcdHJldHVybiB0aGlzLm1vZGVsO1xyXG5cdFx0XHJcblx0XHQvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLy9cclxuXHRcdGZ1bmN0aW9uIHYyKHgsIHkpIHsgcmV0dXJuIG5ldyBUSFJFRS5WZWN0b3IyKHgsIHkpOyB9XHJcblx0XHRmdW5jdGlvbiB2Myh4LCB5LCB6KSB7IHJldHVybiBuZXcgVEhSRUUuVmVjdG9yMyh4LCB5LCB6IHx8IDApOyB9XHJcblx0XHRmdW5jdGlvbiB1dih2KSB7XHJcblx0XHRcdHJldHVybiBuZXcgVEhSRUUuVmVjdG9yMih2LnggLyBpbnMudywgdi55IC8gaW5zLmgpO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHRmdW5jdGlvbiBmNChnLCBhLCBiLCBjLCBkLCBtYXRpKSB7XHJcblx0XHRcdGcuZmFjZXMucHVzaChuZXcgVEhSRUUuRmFjZTMoYSwgYiwgZCwgdW5kZWZpbmVkLCB1bmRlZmluZWQsIG1hdGkpKTtcclxuXHRcdFx0Zy5mYWNlcy5wdXNoKG5ldyBUSFJFRS5GYWNlMyhhLCBkLCBjLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgbWF0aSkpO1xyXG5cdFx0XHRcclxuXHRcdFx0Zy5mYWNlVmVydGV4VXZzWzBdLnB1c2goWyB1dihnLnZlcnRpY2VzW2FdKSwgdXYoZy52ZXJ0aWNlc1tiXSksIHV2KGcudmVydGljZXNbZF0pIF0pO1xyXG5cdFx0XHRnLmZhY2VWZXJ0ZXhVdnNbMF0ucHVzaChbIHV2KGcudmVydGljZXNbYV0pLCB1dihnLnZlcnRpY2VzW2RdKSwgdXYoZy52ZXJ0aWNlc1tjXSkgXSk7XHJcblx0XHR9XHJcblx0fVxyXG59KTtcclxuXHJcblxyXG5mdW5jdGlvbiBzZXR1cFR5cGV3cml0ZXIodGV4dGJveCwgY2FsbGJhY2spIHtcclxuXHR0ZXh0Ym94LmFkdmFuY2UgPSBudWxsO1xyXG5cdGZ1bmN0aW9uIHNldE5leHQoY2IpIHtcclxuXHRcdHRleHRib3guYWR2YW5jZSA9IGNiO1xyXG5cdH1cclxuXHRcclxuXHR2YXIgY29tcGxldGVkVGV4dCA9IHRleHRib3guZWxlbWVudC5odG1sKCk7XHJcblx0dGV4dGJveC5jb21wbGV0ZSA9IGZ1bmN0aW9uKCl7fTtcclxuXHRmdW5jdGlvbiBfY29tcGxldGUoKSB7XHJcblx0XHR0ZXh0Ym94LmVsZW1lbnQuaHRtbChjb21wbGV0ZWRUZXh0KTtcclxuXHRcdHRleHRib3guYWR2YW5jZSA9IGJsaW5rQ3Vyc29yO1xyXG5cdFx0aWYgKGNhbGxiYWNrKSBjYWxsYmFjaygpO1xyXG5cdH07XHJcblx0XHJcblx0dGV4dGJveC5tb2RlbC5tb3JwaFRhcmdldEluZmx1ZW5jZXNbTV9ISURFXSA9IDE7XHJcblx0XHJcblx0Ly9CZWNhdXNlIHRleHRub2RlcyBhcmUgbm90IFwiZWxlbWVudHNcIiwgYW5kIGpxdWVyeSB3b24ndCBoaWRlIHRleHQgbm9kZXMsIGluIFxyXG5cdC8vIG9yZGVyIHRvIGhpZGUgZXZlcnl0aGluZywgd2UgbmVlZCB0byB3cmFwIGV2ZXJ5dGhpbmcgaW4gc3BhbiB0YWdzLi4uXHJcblx0dGV4dGJveC5lbGVtZW50LmNvbnRlbnRzKClcclxuXHRcdC5maWx0ZXIoZnVuY3Rpb24oKXsgcmV0dXJuIHRoaXMubm9kZVR5cGUgPT0gMzsgfSlcclxuXHRcdC53cmFwKFwiPHNwYW4+XCIpO1xyXG5cdFxyXG5cdHZhciBlbGVtZW50cyA9IHRleHRib3guZWxlbWVudC5jb250ZW50cygpO1xyXG5cdCQoZWxlbWVudHMpLmhpZGUoKTtcclxuXHRcclxuXHRcclxuXHQvL0NvcGllZCBhbmQgbW9kaWZpZWQgZnJvbSBodHRwOi8vanNmaWRkbGUubmV0L3k5UEpnLzI0L1xyXG5cdHZhciBpID0gMDtcclxuXHRmdW5jdGlvbiBpdGVyYXRlKCkge1xyXG5cdFx0dGV4dGJveC5jb21wbGV0ZSA9IF9jb21wbGV0ZTtcclxuXHRcdGlmIChpIDwgZWxlbWVudHMubGVuZ3RoKSB7XHJcblx0XHRcdCQoZWxlbWVudHNbaV0pLnNob3coKTtcclxuXHRcdFx0YW5pbWF0ZU5vZGUoZWxlbWVudHNbaV0sIGl0ZXJhdGUpOyBcclxuXHRcdFx0aSsrO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0aWYgKGNhbGxiYWNrKSBjYWxsYmFjaygpO1xyXG5cdFx0XHR0ZXh0Ym94LmFkdmFuY2UgPSBibGlua0N1cnNvcjtcclxuXHRcdH1cclxuXHR9XHJcblx0dGV4dGJveC5hZHZhbmNlID0gaXRlcmF0ZTtcclxuXHRcclxuXHRmdW5jdGlvbiBhbmltYXRlTm9kZShlbGVtZW50LCBjYWxsYmFjaykge1xyXG5cdFx0dmFyIHBpZWNlcyA9IFtdO1xyXG5cdFx0aWYgKGVsZW1lbnQubm9kZVR5cGU9PTEpIHsgLy9lbGVtZW50IG5vZGVcclxuXHRcdFx0d2hpbGUgKGVsZW1lbnQuaGFzQ2hpbGROb2RlcygpKSB7XHJcblx0XHRcdFx0cGllY2VzLnB1c2goIGVsZW1lbnQucmVtb3ZlQ2hpbGQoZWxlbWVudC5maXJzdENoaWxkKSApO1xyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHRzZXROZXh0KGZ1bmN0aW9uIGNoaWxkU3RlcCgpIHtcclxuXHRcdFx0XHRpZiAocGllY2VzLmxlbmd0aCkge1xyXG5cdFx0XHRcdFx0YW5pbWF0ZU5vZGUocGllY2VzWzBdLCBjaGlsZFN0ZXApOyBcclxuXHRcdFx0XHRcdGVsZW1lbnQuYXBwZW5kQ2hpbGQocGllY2VzLnNoaWZ0KCkpO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRjYWxsYmFjaygpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblx0XHRcclxuXHRcdH0gZWxzZSBpZiAoZWxlbWVudC5ub2RlVHlwZT09MykgeyAvL3RleHQgbm9kZVxyXG5cdFx0XHRwaWVjZXMgPSBlbGVtZW50LmRhdGEubWF0Y2goLy57MCwyfS9nKTsgLy8gMjogTnVtYmVyIG9mIGNoYXJzIHBlciBmcmFtZVxyXG5cdFx0XHRlbGVtZW50LmRhdGEgPSBcIlwiO1xyXG5cdFx0XHQoZnVuY3Rpb24gYWRkVGV4dCgpe1xyXG5cdFx0XHRcdGVsZW1lbnQuZGF0YSArPSBwaWVjZXMuc2hpZnQoKTtcclxuXHRcdFx0XHRzZXROZXh0KHBpZWNlcy5sZW5ndGggPyBhZGRUZXh0IDogY2FsbGJhY2spO1xyXG5cdFx0XHR9KSgpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHRcclxuXHR2YXIgdGljayA9IDA7XHJcblx0ZnVuY3Rpb24gYmxpbmtDdXJzb3IoZGVsdGEpIHtcclxuXHRcdHRpY2sgLT0gZGVsdGE7XHJcblx0XHRpZiAodGljayA8PSAwKSB7XHJcblx0XHRcdHRpY2sgPSAwLjc7XHJcblx0XHRcdHRleHRib3gubW9kZWwubW9ycGhUYXJnZXRJbmZsdWVuY2VzW01fSElERV0gPSAhdGV4dGJveC5tb2RlbC5tb3JwaFRhcmdldEluZmx1ZW5jZXNbTV9ISURFXTtcclxuXHRcdH1cclxuXHR9XHJcbn1cclxuXHJcbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcbmZ1bmN0aW9uIFNrcmltKCkge1xyXG5cdHRoaXMuX2NyZWF0ZUFuaW1Qcm9wKFwib3BhY2l0eVwiLCAxKTtcclxuXHR0aGlzLl9jcmVhdGVBbmltUHJvcChcImNvbG9yX3JcIiwgMCk7XHJcblx0dGhpcy5fY3JlYXRlQW5pbVByb3AoXCJjb2xvcl9nXCIsIDApO1xyXG5cdHRoaXMuX2NyZWF0ZUFuaW1Qcm9wKFwiY29sb3JfYlwiLCAwKTtcclxuXHRcclxufVxyXG5leHRlbmQoU2tyaW0ucHJvdG90eXBlLCB7XHJcblx0bW9kZWwgOiBudWxsLFxyXG5cdGFuaW1hdGluZyA6IGZhbHNlLFxyXG5cdGNhbGxiYWNrIDogbnVsbCxcclxuXHRzcGVlZDogMSxcclxuXHRfbmV4dE9wdHM6IG51bGwsXHJcblx0XHJcblx0X2NyZWF0ZUFuaW1Qcm9wOiBmdW5jdGlvbihwcm9wLCBkZWYpIHtcclxuXHRcdHRoaXNbcHJvcF0gPSB7XHJcblx0XHRcdGN1cnI6IGRlZixcclxuXHRcdFx0c3JjIDogZGVmLFxyXG5cdFx0XHRkZXN0OiBkZWYsXHJcblx0XHRcdGFscGhhOiAxLFxyXG5cdFx0fTtcclxuXHR9LFxyXG5cdFxyXG5cdGZhZGVUbyA6IGZ1bmN0aW9uKG9wdHMsIGNhbGxiYWNrKSB7XHJcblx0XHR2YXIgc2VsZiA9IHRoaXM7XHJcblx0XHRcclxuXHRcdG9wdHMgPSBleHRlbmQob3B0cywgdGhpcy5fbmV4dE9wdHMpO1xyXG5cdFx0dGhpcy5fbmV4dE9wdHMgPSBudWxsO1xyXG5cdFx0XHJcblx0XHRpZiAob3B0c1tcImNvbG9yXCJdICE9PSB1bmRlZmluZWQpIHtcclxuXHRcdFx0dmFyIGhleCA9IE1hdGguZmxvb3Iob3B0c1tcImNvbG9yXCJdKTtcclxuXHRcdFx0b3B0c1tcImNvbG9yX3JcIl0gPSAoKGhleCA+PiAxNikgJiAyNTUpIC8gMjU1O1xyXG5cdFx0XHRvcHRzW1wiY29sb3JfZ1wiXSA9ICgoaGV4ID4+ICA4KSAmIDI1NSkgLyAyNTU7XHJcblx0XHRcdG9wdHNbXCJjb2xvcl9iXCJdID0gKChoZXggICAgICApICYgMjU1KSAvIDI1NTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0aWYgKHRoaXMuY2FsbGJhY2spIHtcclxuXHRcdFx0dmFyIGNiID0gdGhpcy5jYWxsYmFjaztcclxuXHRcdFx0dGhpcy5jYWxsYmFjayA9IG51bGw7IC8vTWFrZSBzdXJlIHRvIHJlbW92ZSB0aGUgc3RvcmVkIGNhbGxiYWNrIElNTUVERUFURUxZIGxlc3QgaXQgYmUgY2FsbGVkIHR3aWNlIHNvbWVob3cuXHJcblx0XHRcdGNiKCk7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdHZhciB3aWxsQW5pbSA9IGZhbHNlO1xyXG5cdFx0XHJcblx0XHR3aWxsQW5pbSB8PSBzZXRGYWRlKFwib3BhY2l0eVwiLCBvcHRzKTtcclxuXHRcdHdpbGxBbmltIHw9IHNldEZhZGUoXCJjb2xvcl9yXCIsIG9wdHMpO1xyXG5cdFx0d2lsbEFuaW0gfD0gc2V0RmFkZShcImNvbG9yX2dcIiwgb3B0cyk7XHJcblx0XHR3aWxsQW5pbSB8PSBzZXRGYWRlKFwiY29sb3JfYlwiLCBvcHRzKTtcclxuXHRcdFxyXG5cdFx0dGhpcy5zcGVlZCA9IG9wdHNbXCJzcGVlZFwiXSB8fCAxO1xyXG5cdFx0XHJcblx0XHRpZiAod2lsbEFuaW0pIHtcclxuXHRcdFx0dGhpcy5jYWxsYmFjayA9IGNhbGxiYWNrO1xyXG5cdFx0XHR0aGlzLmFuaW1hdGluZyA9IHRydWU7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHQvL1dvbid0IGFuaW1hdGUsIGRvIHRoZSBjYWxsYmFjayBpbW1lZGVhdGVseVxyXG5cdFx0XHRpZiAoY2FsbGJhY2spIGNhbGxiYWNrKCk7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdHJldHVybjtcclxuXHRcdFxyXG5cdFx0ZnVuY3Rpb24gc2V0RmFkZShwcm9wLCBvcHRzKSB7XHJcblx0XHRcdGlmIChvcHRzW3Byb3BdID09PSB1bmRlZmluZWQpIHJldHVybjtcclxuXHRcdFx0c2VsZltwcm9wXS5zcmMgPSBzZWxmW3Byb3BdLmN1cnI7XHJcblx0XHRcdHNlbGZbcHJvcF0uZGVzdCA9IG9wdHNbcHJvcF07XHJcblx0XHRcdGlmIChzZWxmW3Byb3BdLnNyYyAtIHNlbGZbcHJvcF0uZGVzdCA9PSAwKSB7XHJcblx0XHRcdFx0c2VsZltwcm9wXS5hbHBoYSA9IDE7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0c2VsZltwcm9wXS5hbHBoYSA9IDA7XHJcblx0XHRcdH1cclxuXHRcdFx0XHJcblx0XHRcdHJldHVybiBzZWxmW3Byb3BdLmFscGhhID09IDA7XHJcblx0XHR9XHJcblx0fSxcclxuXHRcclxuXHRhZHZhbmNlIDogZnVuY3Rpb24oZGVsdGEpIHtcclxuXHRcdGlmICghdGhpcy5hbmltYXRpbmcpIHJldHVybjtcclxuXHRcdHZhciBzZWxmID0gdGhpcztcclxuXHRcdFxyXG5cdFx0dmFyIHVwZGF0ZWQgPSBmYWxzZTtcclxuXHRcdFxyXG5cdFx0dXBkYXRlZCB8PSBfYW5pbShcIm9wYWNpdHlcIik7XHJcblx0XHR1cGRhdGVkIHw9IF9hbmltKFwiY29sb3JfclwiKTtcclxuXHRcdHVwZGF0ZWQgfD0gX2FuaW0oXCJjb2xvcl9nXCIpO1xyXG5cdFx0dXBkYXRlZCB8PSBfYW5pbShcImNvbG9yX2JcIik7XHJcblx0XHRcclxuXHRcdGlmICh1cGRhdGVkKSB7XHJcblx0XHRcdHRoaXMubW9kZWwubWF0ZXJpYWwub3BhY2l0eSA9IHRoaXMub3BhY2l0eS5jdXJyO1xyXG5cdFx0XHR0aGlzLm1vZGVsLm1hdGVyaWFsLmNvbG9yLnIgPSBNYXRoLmNsYW1wKHRoaXMuY29sb3Jfci5jdXJyKTtcclxuXHRcdFx0dGhpcy5tb2RlbC5tYXRlcmlhbC5jb2xvci5nID0gTWF0aC5jbGFtcCh0aGlzLmNvbG9yX2cuY3Vycik7XHJcblx0XHRcdHRoaXMubW9kZWwubWF0ZXJpYWwuY29sb3IuYiA9IE1hdGguY2xhbXAodGhpcy5jb2xvcl9iLmN1cnIpO1xyXG5cdFx0XHR0aGlzLm1vZGVsLm1hdGVyaWFsLm5lZWRzVXBkYXRlID0gdHJ1ZTtcclxuXHRcdFx0XHJcblx0XHRcdC8vVGhpcyBmaXhlcyBhIHByb2JsZW0gd2hlcmUgdGhlIFNrcmltIGJsb2NrcyByZW5kZXJpbmcgdGhlIGRpYWxvZyBib3hlcyBiZWhpbmQgaXRcclxuXHRcdFx0dGhpcy5tb2RlbC52aXNpYmxlID0gISF0aGlzLm1vZGVsLm1hdGVyaWFsLm9wYWNpdHk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHR0aGlzLmFuaW1hdGluZyA9IGZhbHNlO1xyXG5cdFx0XHRpZiAodGhpcy5jYWxsYmFjaykge1xyXG5cdFx0XHRcdHZhciBjYiA9IHRoaXMuY2FsbGJhY2s7XHJcblx0XHRcdFx0dGhpcy5jYWxsYmFjayA9IG51bGw7XHJcblx0XHRcdFx0Y2IoKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHRyZXR1cm47XHJcblx0XHRcclxuXHRcdGZ1bmN0aW9uIF9hbmltKHByb3ApIHtcclxuXHRcdFx0dmFyIHVwZGF0ZWQgPSBzZWxmW3Byb3BdLmFscGhhIDwgMTtcclxuXHRcdFx0XHJcblx0XHRcdHNlbGZbcHJvcF0uYWxwaGEgKz0gZGVsdGEgKiBzZWxmLnNwZWVkO1xyXG5cdFx0XHRpZiAoc2VsZltwcm9wXS5hbHBoYSA+IDEpIHtcclxuXHRcdFx0XHRzZWxmW3Byb3BdLmFscGhhID0gMTtcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0c2VsZltwcm9wXS5jdXJyID0gc2VsZltwcm9wXS5zcmMgKyAoc2VsZltwcm9wXS5kZXN0IC0gc2VsZltwcm9wXS5zcmMpICogc2VsZltwcm9wXS5hbHBoYTtcclxuXHRcdFx0cmV0dXJuIHVwZGF0ZWQ7XHJcblx0XHR9XHJcblx0fSxcclxuXHRcclxuXHRjcmVhdGVNb2RlbDogZnVuY3Rpb24oKSB7XHJcblx0XHR2YXIgc2VsZiA9IHRoaXM7XHJcblx0XHRcclxuXHRcdHZhciBzdyA9ICQoXCIjZ2FtZXNjcmVlblwiKS53aWR0aCgpKzE7XHJcblx0XHR2YXIgc2ggPSAkKFwiI2dhbWVzY3JlZW5cIikuaGVpZ2h0KCkrMTtcclxuXHRcdFxyXG5cdFx0dmFyIGdlb20gPSBuZXcgVEhSRUUuR2VvbWV0cnkoKTtcclxuXHRcdHtcclxuXHRcdFx0Z2VvbS52ZXJ0aWNlcyA9IFtcclxuXHRcdFx0XHRuZXcgVEhSRUUuVmVjdG9yMygtMSwgLTEsIDMwKSxcclxuXHRcdFx0XHRuZXcgVEhSRUUuVmVjdG9yMyhzdywgLTEsIDMwKSxcclxuXHRcdFx0XHRuZXcgVEhSRUUuVmVjdG9yMyhzdywgc2gsIDMwKSxcclxuXHRcdFx0XHRuZXcgVEhSRUUuVmVjdG9yMygtMSwgc2gsIDMwKSxcclxuXHRcdFx0XTtcclxuXHRcdFx0Z2VvbS5mYWNlcyA9IFtcclxuXHRcdFx0XHRuZXcgVEhSRUUuRmFjZTMoMCwgMSwgMiksXHJcblx0XHRcdFx0bmV3IFRIUkVFLkZhY2UzKDIsIDMsIDApLFxyXG5cdFx0XHRdO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHR2YXIgbWF0ID0gbmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHtcclxuXHRcdFx0Y29sb3I6IDB4MDAwMDAwLFxyXG5cdFx0XHR0cmFuc3BhcmVudDogdHJ1ZSxcclxuXHRcdH0pO1xyXG5cdFx0Ly8gbWF0Lm1vcnBoVGFyZ2V0cyA9IHRydWU7XHJcblx0XHRcclxuXHRcdHRoaXMubW9kZWwgPSBuZXcgVEhSRUUuTWVzaChnZW9tLCBtYXQpO1xyXG5cdFx0dGhpcy5tb2RlbC5yZW5kZXJEZXB0aCA9IC0zMDtcclxuXHRcdHJldHVybiB0aGlzLm1vZGVsO1xyXG5cdH0sXHJcbn0pO1xyXG5cclxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5mdW5jdGlvbiBBamF4TG9hZGVyKCkge1xyXG5cdFxyXG59XHJcbmV4dGVuZChBamF4TG9hZGVyLnByb3RvdHlwZSwge1xyXG5cdG5vZGUgOiBudWxsLFxyXG5cdG1faGVsaXggOiBudWxsLFxyXG5cdG1fcHJvZ3Jlc3MgOiBbXSxcclxuXHRtX3NwaW5uZXIgOiBbXSxcclxuXHRcclxuXHRwcm9ncmVzczogMCxcclxuXHRwcm9ncmVzc190b3RhbDogMTAwLFxyXG5cdG9wYWNpdHk6IDAsXHJcblx0X29wYWNpdHlfc3BlZWQ6IDIsXHJcblx0c3BpbjogMCxcclxuXHRfc3Bpbl9zcGVlZDogOTAwLFxyXG5cdF9zcGluX2ZhbGxvZmY6IDUwMCxcclxuXHRcclxuXHRsZXR0ZXJkZWZzIDogW1xyXG5cdFx0LypcIkFcIiA6Ki8gWzMsIDNdLFxyXG5cdFx0LypcIkJcIiA6Ki8gWzQsIDNdLFxyXG5cdFx0LypcIlhcIiA6Ki8gWzMsIDJdLFxyXG5cdFx0LypcIllcIiA6Ki8gWzQsIDJdLFxyXG5cdFx0LypcIkxcIiA6Ki8gWzAsIDBdLFxyXG5cdFx0LypcIlJcIiA6Ki8gWzEsIDBdLFxyXG5cdFx0LypcIlNcIiA6Ki8gWzIsIDBdLFxyXG5cdFx0LypcIlVBXCI6Ki8gWzMsIDFdLFxyXG5cdFx0LypcIkRBXCI6Ki8gWzQsIDFdLFxyXG5cdFx0LypcIkxBXCI6Ki8gWzMsIDBdLFxyXG5cdFx0LypcIlJBXCI6Ki8gWzQsIDBdLFxyXG5cdF0sXHJcblx0XHJcblx0c2hvdzogZnVuY3Rpb24oKSB7XHJcblx0XHR0aGlzLm9wYWNpdHkgPSAxO1xyXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLm1fcHJvZ3Jlc3MubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0dmFyIHJuZCA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIHRoaXMubGV0dGVyZGVmcy5sZW5ndGgpO1xyXG5cdFx0XHR0aGlzLm1fcHJvZ3Jlc3NbaV0ubWF0ZXJpYWwubWFwLm9mZnNldC5zZXQoXHJcblx0XHRcdFx0KHRoaXMubGV0dGVyZGVmc1tybmRdWzBdICogMTYpIC8gMTI4LCBcclxuXHRcdFx0XHQodGhpcy5sZXR0ZXJkZWZzW3JuZF1bMV0gKiAxNikgLyA2NFxyXG5cdFx0XHQpXHJcblx0XHR9XHJcblx0fSxcclxuXHRcclxuXHRoaWRlOiBmdW5jdGlvbigpIHtcclxuXHRcdHRoaXMub3BhY2l0eSA9IDA7XHJcblx0fSxcclxuXHRcclxuXHRhZHZhbmNlOiBmdW5jdGlvbihkZWx0YSkge1xyXG5cdFx0aWYgKHRoaXMub3BhY2l0eSA9PSAwICYmIHRoaXMubV9oZWxpeC5tYXRlcmlhbC5vcGFjaXR5IDw9IDApIHJldHVybjtcclxuXHRcdFxyXG5cdFx0aWYgKHRoaXMub3BhY2l0eSA+IHRoaXMubV9oZWxpeC5tYXRlcmlhbC5vcGFjaXR5KSB7XHJcblx0XHRcdHRoaXMubV9oZWxpeC5tYXRlcmlhbC5vcGFjaXR5ID1cclxuXHRcdFx0XHRNYXRoLmNsYW1wKHRoaXMubV9oZWxpeC5tYXRlcmlhbC5vcGFjaXR5ICsgZGVsdGEgKiB0aGlzLl9vcGFjaXR5X3NwZWVkKTtcclxuXHRcdH0gZWxzZSBpZiAodGhpcy5vcGFjaXR5IDwgdGhpcy5tX2hlbGl4Lm1hdGVyaWFsLm9wYWNpdHkpIHtcclxuXHRcdFx0dGhpcy5tX2hlbGl4Lm1hdGVyaWFsLm9wYWNpdHkgPSBcclxuXHRcdFx0XHRNYXRoLmNsYW1wKHRoaXMubV9oZWxpeC5tYXRlcmlhbC5vcGFjaXR5IC0gZGVsdGEgKiB0aGlzLl9vcGFjaXR5X3NwZWVkKTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0dmFyIG5sID0gdGhpcy5tX3Byb2dyZXNzLmxlbmd0aDsgLy9udW1iZXIgb2YgbGV0dGVyc1xyXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBubDsgaSsrKSB7XHJcblx0XHRcdC8vdmFyIG8gPSAodGhpcy5wcm9ncmVzcyAvIHRoaXMucHJvZ3Jlc3NfdG90YWwpICogbmw7XHJcblx0XHRcdHZhciBvID0gKHRoaXMucHJvZ3Jlc3NfdG90YWwgLyBubCk7XHJcblx0XHRcdHRoaXMubV9wcm9ncmVzc1tpXS5tYXRlcmlhbC5vcGFjaXR5ID0gdGhpcy5tX2hlbGl4Lm1hdGVyaWFsLm9wYWNpdHkgKiBNYXRoLmNsYW1wKCh0aGlzLnByb2dyZXNzLShvKmkpKSAvIG8pO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHR0aGlzLnNwaW4gKz0gZGVsdGEgKiB0aGlzLl9zcGluX3NwZWVkO1xyXG5cdFx0aWYgKHRoaXMuc3BpbiA+IDgwMCkgdGhpcy5zcGluIC09IDgwMDtcclxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5tX3NwaW5uZXIubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0dmFyIG8gPSB0aGlzLnNwaW4gLSAoaSAqIDEwMCk7XHJcblx0XHRcdGlmIChvIDwgMCkgbyArPSA4MDA7XHJcblx0XHRcdG8gPSAoLW8gKyB0aGlzLl9zcGluX2ZhbGxvZmYpIC8gdGhpcy5fc3Bpbl9mYWxsb2ZmO1xyXG5cdFx0XHR0aGlzLm1fc3Bpbm5lcltpXS5tYXRlcmlhbC5vcGFjaXR5ID0gdGhpcy5tX2hlbGl4Lm1hdGVyaWFsLm9wYWNpdHkgKiBNYXRoLmNsYW1wKG8pO1xyXG5cdFx0XHRcclxuXHRcdFx0aWYgKG8gPCAwKSB7XHJcblx0XHRcdFx0dmFyIHJuZCA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIHRoaXMubGV0dGVyZGVmcy5sZW5ndGgpO1xyXG5cdFx0XHRcdHRoaXMubV9zcGlubmVyW2ldLm1hdGVyaWFsLm1hcC5vZmZzZXQuc2V0KFxyXG5cdFx0XHRcdFx0KHRoaXMubGV0dGVyZGVmc1tybmRdWzBdICogMTYpIC8gMTI4LCBcclxuXHRcdFx0XHRcdCh0aGlzLmxldHRlcmRlZnNbcm5kXVsxXSAqIDE2KSAvIDY0XHJcblx0XHRcdFx0KVxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fSxcclxuXHRcclxuXHRjcmVhdGVNb2RlbDogZnVuY3Rpb24oKXtcclxuXHRcdHZhciBzZWxmID0gdGhpcztcclxuXHRcdHZhciBzdyA9ICQoXCIjZ2FtZXNjcmVlblwiKS53aWR0aCgpO1xyXG5cdFx0dmFyIHNoID0gJChcIiNnYW1lc2NyZWVuXCIpLmhlaWdodCgpO1xyXG5cdFx0XHJcblx0XHR0aGlzLm5vZGUgPSBuZXcgVEhSRUUuT2JqZWN0M0QoKTtcclxuXHRcdFxyXG5cdFx0dmFyIGdlb20gPSBuZXcgVEhSRUUuUGxhbmVCdWZmZXJHZW9tZXRyeSg4LCA4KTtcclxuXHRcdFxyXG5cdFx0dmFyIHRleCA9IG5ldyBUSFJFRS5UZXh0dXJlKEFKQVhfVEVYVFVSRV9JTUcpO1xyXG5cdFx0dGV4Lm1hZ0ZpbHRlciA9IFRIUkVFLk5lYXJlc3RGaWx0ZXI7XHJcblx0XHR0ZXgubWluRmlsdGVyID0gVEhSRUUuTmVhcmVzdEZpbHRlcjtcclxuXHRcdHRleC5yZXBlYXQgPSBuZXcgVEhSRUUuVmVjdG9yMig0OC8xMjgsIDQ4LzY0KTtcclxuXHRcdHRleC5vZmZzZXQgPSBuZXcgVEhSRUUuVmVjdG9yMigwLCAxNi82NCk7IC8vUmVtZW1iZXIsIGJvdHRvbSByaWdodCBpcyBvcmlnaW5cclxuXHRcdHRleC5nZW5lcmF0ZU1pcG1hcHMgPSBmYWxzZTtcclxuXHRcdF9lbnN1cmVVcGRhdGUodGV4KTtcclxuXHRcdFxyXG5cdFx0dmFyIG1hdCA9IG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7XHJcblx0XHRcdG1hcDogdGV4LFxyXG5cdFx0XHR0cmFuc3BhcmVudDogdHJ1ZSxcclxuXHRcdFx0b3BhY2l0eTogMCxcclxuXHRcdH0pO1xyXG5cdFx0XHJcblx0XHR0aGlzLm1faGVsaXggPSBuZXcgVEhSRUUuTWVzaChnZW9tLCBtYXQpO1xyXG5cdFx0dGhpcy5tX2hlbGl4LnNjYWxlLnNldCgzLCAzLCAzKTtcclxuXHRcdHRoaXMubV9oZWxpeC5wb3NpdGlvbi5zZXQoMTYrMjQsIHNoLTI0LTE2LCA0MCk7XHJcblx0XHR0aGlzLm1faGVsaXgucmVuZGVyRGVwdGggPSAtNDA7XHJcblx0XHR0aGlzLm5vZGUuYWRkKHRoaXMubV9oZWxpeCk7XHJcblx0XHRcclxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgODsgaSsrKSB7XHJcblx0XHRcdHRoaXMubV9zcGlubmVyW2ldID0gX2NyZWF0ZUxldHRlcigpO1xyXG5cdFx0XHR0aGlzLm1fc3Bpbm5lcltpXS5wb3NpdGlvbi5zZXQoXHJcblx0XHRcdFx0dGhpcy5tX2hlbGl4LnBvc2l0aW9uLnggKyAoTWF0aC5zaW4oaSooTWF0aC5QSS80KSkgKiAyNCksXHJcblx0XHRcdFx0dGhpcy5tX2hlbGl4LnBvc2l0aW9uLnkgKyAoTWF0aC5jb3MoaSooTWF0aC5QSS80KSkgKiAyNCksIFxyXG5cdFx0XHRcdDM5KTtcclxuXHRcdFx0dGhpcy5tX3NwaW5uZXJbaV0ucmVuZGVyRGVwdGggPSAtNDA7XHJcblx0XHRcdFxyXG5cdFx0XHR2YXIgcm5kID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogdGhpcy5sZXR0ZXJkZWZzLmxlbmd0aCk7XHJcblx0XHRcdHRoaXMubV9zcGlubmVyW2ldLm1hdGVyaWFsLm1hcC5vZmZzZXQuc2V0KFxyXG5cdFx0XHRcdCh0aGlzLmxldHRlcmRlZnNbcm5kXVswXSAqIDE2KSAvIDEyOCwgXHJcblx0XHRcdFx0KHRoaXMubGV0dGVyZGVmc1tybmRdWzFdICogMTYpIC8gNjRcclxuXHRcdFx0KVxyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IDEwOyBpKyspIHtcclxuXHRcdFx0dGhpcy5tX3Byb2dyZXNzW2ldID0gX2NyZWF0ZUxldHRlcigpO1xyXG5cdFx0XHR0aGlzLm1fcHJvZ3Jlc3NbaV0ucG9zaXRpb24uc2V0KFxyXG5cdFx0XHRcdHRoaXMubV9oZWxpeC5wb3NpdGlvbi54KzQ0KyhpKjE2KSwgXHJcblx0XHRcdFx0dGhpcy5tX2hlbGl4LnBvc2l0aW9uLnksIDQwKTtcclxuXHRcdFx0dGhpcy5tX3Byb2dyZXNzW2ldLnJlbmRlckRlcHRoID0gLTQwO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHRyZXR1cm4gdGhpcy5ub2RlO1xyXG5cdFx0XHJcblx0XHRmdW5jdGlvbiBfY3JlYXRlTGV0dGVyKCkge1xyXG5cdFx0XHR2YXIgdGV4ID0gbmV3IFRIUkVFLlRleHR1cmUoQUpBWF9URVhUVVJFX0lNRyk7XHJcblx0XHRcdHRleC5tYWdGaWx0ZXIgPSBUSFJFRS5OZWFyZXN0RmlsdGVyO1xyXG5cdFx0XHR0ZXgubWluRmlsdGVyID0gVEhSRUUuTmVhcmVzdEZpbHRlcjtcclxuXHRcdFx0dGV4LndyYXBTID0gVEhSRUUuUmVwZWF0V3JhcHBpbmc7XHJcblx0XHRcdHRleC53cmFwVCA9IFRIUkVFLlJlcGVhdFdyYXBwaW5nO1xyXG5cdFx0XHR0ZXgucmVwZWF0ID0gbmV3IFRIUkVFLlZlY3RvcjIoMTYvMTI4LCAxNi82NCk7XHJcblx0XHRcdHRleC5vZmZzZXQgPSBuZXcgVEhSRUUuVmVjdG9yMigwLCAwKTtcclxuXHRcdFx0dGV4LmdlbmVyYXRlTWlwbWFwcyA9IGZhbHNlO1xyXG5cdFx0XHRfZW5zdXJlVXBkYXRlKHRleCk7XHJcblx0XHRcdFxyXG5cdFx0XHR2YXIgbWF0ID0gbmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHtcclxuXHRcdFx0XHRtYXA6IHRleCxcclxuXHRcdFx0XHR0cmFuc3BhcmVudDogdHJ1ZSxcclxuXHRcdFx0XHRvcGFjaXR5OiAwLFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0XHJcblx0XHRcdHZhciBtZXNoID0gbmV3IFRIUkVFLk1lc2goZ2VvbSwgbWF0KTtcclxuXHRcdFx0c2VsZi5ub2RlLmFkZChtZXNoKTtcclxuXHRcdFx0cmV0dXJuIG1lc2g7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdGZ1bmN0aW9uIF9lbnN1cmVVcGRhdGUodGV4KSB7XHJcblx0XHRcdEFKQVhfVEVYVFVSRV9JTUcub24oXCJsb2FkXCIsIGZ1bmN0aW9uKCl7XHJcblx0XHRcdFx0dGV4Lm5lZWRzVXBkYXRlID0gdHJ1ZTtcclxuXHRcdFx0fSk7XHJcblx0XHRcdHRleC5uZWVkc1VwZGF0ZSA9IHRydWU7XHJcblx0XHR9XHJcblx0fSxcclxufSk7XHJcblxyXG5cclxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cclxuZnVuY3Rpb24gY3JlYXRlREVCVUdTZXR1cCgpIHtcclxuXHR0aGlzLl9tYWluQ2FtZXJhID0gdGhpcy5jYW1lcmE7XHJcblx0dGhpcy5fZGVidWdDYW1lcmEgPSB0aGlzLmNhbWVyYSA9IG5ldyBUSFJFRS5QZXJzcGVjdGl2ZUNhbWVyYSg3NSwgXHJcblx0XHQkKFwiI2dhbWVzY3JlZW5cIikud2lkdGgoKS8gJChcIiNnYW1lc2NyZWVuXCIpLmhlaWdodCgpLFxyXG5cdFx0MC4xLCAxMDAwMCk7XHJcblx0dGhpcy5fZGVidWdDYW1lcmEucG9zaXRpb24ueiA9IDEwO1xyXG5cdHRoaXMuc2NlbmUuYWRkKHRoaXMuX2RlYnVnQ2FtZXJhKTtcclxuXHRcclxuXHRcclxuXHR0aGlzLnNjZW5lLmFkZChuZXcgVEhSRUUuQ2FtZXJhSGVscGVyKHRoaXMuX21haW5DYW1lcmEpKTtcclxuXHR0aGlzLnNjZW5lLmFkZChuZXcgVEhSRUUuQXhpc0hlbHBlcig1KSk7XHJcblx0XHJcblx0dmFyIGNvbnRyb2xzID0gbmV3IFRIUkVFLk9yYml0Q29udHJvbHModGhpcy5fZGVidWdDYW1lcmEpO1xyXG5cdGNvbnRyb2xzLmRhbXBpbmcgPSAwLjI7XHJcblx0XHJcblx0dmFyIG9sZGxvZ2ljID0gdGhpcy5sb2dpY0xvb3A7XHJcblx0dGhpcy5sb2dpY0xvb3AgPSBmdW5jdGlvbihkZWx0YSl7XHJcblx0XHRjb250cm9scy51cGRhdGUoKTtcclxuXHRcdG9sZGxvZ2ljLmNhbGwodGhpcywgZGVsdGEpO1xyXG5cdH07XHJcbn1cclxuXHJcbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxubW9kdWxlLmV4cG9ydHMgPSBuZXcgVUlNYW5hZ2VyKCk7XHJcbiIsIi8vIG1hcC5qc1xyXG5cclxudmFyIGluaGVyaXRzID0gcmVxdWlyZShcImluaGVyaXRzXCIpO1xyXG52YXIgZXh0ZW5kID0gcmVxdWlyZShcImV4dGVuZFwiKTtcclxudmFyIG5kYXJyYXkgPSByZXF1aXJlKFwibmRhcnJheVwiKTtcclxudmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoXCJldmVudHNcIikuRXZlbnRFbWl0dGVyO1xyXG5cclxudmFyIEV2ZW50ID0gcmVxdWlyZShcInRwcC1ldmVudFwiKTtcclxudmFyIFBsYXllckNoYXIgPSByZXF1aXJlKFwidHBwLXBjXCIpO1xyXG5cclxudmFyIE9iakxvYWRlciA9IHJlcXVpcmUoXCIuL21vZGVsL29iai1sb2FkZXJcIik7XHJcblxyXG52YXIgc2V0dXBNYXBSaWdnaW5nID0gcmVxdWlyZShcIi4vbW9kZWwvbWFwLXNldHVwXCIpO1xyXG5cclxuXHJcbi8vIFRoZXNlIHdvdWxkIGJlIENPTlNUcyBpZiB3ZSB3ZXJlbid0IGluIHRoZSBicm93c2VyXHJcbnZhciBFWFRfTUFQQlVORExFID0gXCIuemlwXCI7IC8vRXh0ZW5zaW9uIGZvciByZXF1ZXN0aW5nIG1hcCBidW5kbGVzXHJcbnZhciBERUZfSEVJR0hUX1NURVAgPSAwLjU7IC8vRGVmYXVsdCBZIHRyYW5zbGF0aW9uIGFtb3VudCBhIGhlaWdodCBzdGVwIHRha2VzLiBUaGlzIGNhbiBiZSBkZWZpbmVkIGluIGEgbWFwIGZpbGUuXHJcblxyXG5cclxuLy8gSWYgeW91IG1ha2UgYW55IGNoYW5nZXMgaGVyZSwgbWFrZSBzdXJlIHRvIG1pcnJvciB0aGVtIGluIGJ1aWxkL21hcC16aXBwZXIuanMhXHJcbmZ1bmN0aW9uIGNvbnZlcnRTaG9ydFRvVGlsZVByb3BzKHZhbCkge1xyXG5cdC8vIFRpbGVEYXRhOiBNTU1NTFcwMCBUVFRISEhISFxyXG5cdC8vIFdoZXJlOlxyXG5cdC8vICAgIE0gPSBNb3ZlbWVudCwgQml0cyBhcmU6IChEb3duLCBVcCwgTGVmdCwgUmlnaHQpXHJcblx0Ly8gICAgTCA9IExlZGdlIGJpdCAodGhpcyB0aWxlIGlzIGEgbGVkZ2U6IHlvdSBqdW1wIG92ZXIgaXQgd2hlbiBnaXZlbiBwZXJtaXNzaW9uIHRvIGVudGVyIGl0KVxyXG5cdC8vICAgIFcgPSBXYXRlciBiaXQgKHRoaXMgdGlsZSBpcyB3YXRlcjogbW9zdCBhY3RvcnMgYXJlIGRlbmllZCBlbnRyeSBvbnRvIHRoaXMgdGlsZSlcclxuXHQvLyAgICBIID0gSGVpZ2h0ICh2ZXJ0aWNhbCBsb2NhdGlvbiBvZiB0aGUgY2VudGVyIG9mIHRoaXMgdGlsZSlcclxuXHQvLyAgICBUID0gVHJhbnNpdGlvbiBUaWxlICh0cmFuc2l0aW9uIHRvIGFub3RoZXIgTGF5ZXIgd2hlbiBzdGVwcGluZyBvbiB0aGlzIHRpbGUpXHJcblx0dmFyIHByb3BzID0ge307XHJcblx0XHJcblx0dmFyIG1vdmVtZW50ID0gKCh2YWwgPj4gMTIpICYgMHhGKTtcclxuXHQvLyBtb3ZlbWVudCBpcyBibG9ja2VkIGlmIGEgbW92ZW1lbnQgZmxhZyBpcyB0cnVlOlxyXG5cdHByb3BzLm1vdmVtZW50ID0ge307XHJcblx0cHJvcHMubW92ZW1lbnRbXCJkb3duXCJdICA9ICEhKG1vdmVtZW50ICYgMHg4KTtcclxuXHRwcm9wcy5tb3ZlbWVudFtcInVwXCJdICAgID0gISEobW92ZW1lbnQgJiAweDQpO1xyXG5cdHByb3BzLm1vdmVtZW50W1wibGVmdFwiXSAgPSAhIShtb3ZlbWVudCAmIDB4Mik7XHJcblx0cHJvcHMubW92ZW1lbnRbXCJyaWdodFwiXSA9ICEhKG1vdmVtZW50ICYgMHgxKTtcclxuXHRcclxuXHRwcm9wcy5pc1dhbGthYmxlID0gISEofm1vdmVtZW50ICYgMHhGKTtcclxuXHRwcm9wcy5pc0xlZGdlID0gISEodmFsICYgKDB4MSA8PCAxMSkpO1xyXG5cdHByb3BzLmlzV2F0ZXIgPSAhISh2YWwgJiAoMHgxIDw8IDEwKSk7XHJcblx0XHJcblx0cHJvcHMudHJhbnNpdGlvbiA9ICgodmFsID4+IDUpICYgMHg3KTtcclxuXHRcclxuXHRwcm9wcy5oZWlnaHQgPSAoKHZhbCkgJiAweDFGKTtcclxuXHRcclxuXHRwcm9wcy5ub05QQyA9ICEhKHZhbCAmICgweDEgPDwgOSkpO1xyXG5cdFxyXG5cdHJldHVybiBwcm9wcztcclxufVxyXG5cclxuXHJcblxyXG4vKipcclxuICpcclxuICpcclxuICpcclxuICpcclxuICovXHJcbmZ1bmN0aW9uIE1hcChpZCwgb3B0cyl7XHJcblx0dGhpcy5pZCA9IGlkO1xyXG5cdGV4dGVuZCh0aGlzLCBvcHRzKTtcclxuXHRcclxuXHRHQy5hbGxvY2F0ZUJpbihcIm1hcF9cIitpZCk7XHJcblx0dGhpcy5nYyA9IEdDLmdldEJpbihcIm1hcF9cIitpZCk7XHJcblx0XHJcblx0dGhpcy5maWxlU3lzID0gbmV3IHppcC5mcy5GUygpO1xyXG59XHJcbmluaGVyaXRzKE1hcCwgRXZlbnRFbWl0dGVyKTtcclxuZXh0ZW5kKE1hcC5wcm90b3R5cGUsIHtcclxuXHRpZCA6IG51bGwsIC8vbWFwJ3MgaW50ZXJuYWwgaWRcclxuXHRcclxuXHRmaWxlOiBudWxsLCAvL1ppcCBmaWxlIGhvbGRpbmcgYWxsIGRhdGFcclxuXHRmaWxlU3lzOiBudWxsLCAvL0N1cnJlbnQgemlwIGZpbGUgc3lzdGVtIGZvciB0aGlzIG1hcFxyXG5cdHhocjogbnVsbCwgLy9hY3RpdmUgeGhyIHJlcXVlc3RcclxuXHRsb2FkRXJyb3IgOiBudWxsLFxyXG5cdFxyXG5cdG1ldGFkYXRhIDogbnVsbCxcclxuXHRvYmpkYXRhIDogbnVsbCxcclxuXHRtdGxkYXRhIDogbnVsbCxcclxuXHRcclxuXHRsU2NyaXB0VGFnIDogbnVsbCxcclxuXHRnU2NyaXB0VGFnIDogbnVsbCxcclxuXHRcclxuXHRjYW1lcmE6IG51bGwsXHJcblx0Y2FtZXJhczogbnVsbCxcclxuXHRzY2VuZTogbnVsbCxcclxuXHRtYXBtb2RlbDogbnVsbCxcclxuXHRcclxuXHRzcHJpdGVOb2RlOiBudWxsLFxyXG5cdGxpZ2h0Tm9kZTogbnVsbCxcclxuXHRjYW1lcmFOb2RlOiBudWxsLFxyXG5cdFxyXG5cdC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cdC8vIExvYWQgTWFuYWdlbWVudCBcclxuXHQvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHRcclxuXHRkaXNwb3NlIDogZnVuY3Rpb24oKXtcclxuXHRcdCQodGhpcy5sU2NyaXB0VGFnKS5yZW1vdmUoKTtcclxuXHRcdCQodGhpcy5nU2NyaXB0VGFnKS5yZW1vdmUoKTtcclxuXHRcdFxyXG5cdFx0aWYgKHBsYXllciAmJiBwbGF5ZXIucGFyZW50KSBwbGF5ZXIucGFyZW50LnJlbW92ZShwbGF5ZXIpO1xyXG5cdFx0XHJcblx0XHRkZWxldGUgdGhpcy5maWxlO1xyXG5cdFx0ZGVsZXRlIHRoaXMuZmlsZVN5cztcclxuXHRcdGRlbGV0ZSB0aGlzLnhocjtcclxuXHRcdGRlbGV0ZSB0aGlzLmxvYWRFcnJvcjtcclxuXHRcdFxyXG5cdFx0ZGVsZXRlIHRoaXMubWV0YWRhdGE7XHJcblx0XHRkZWxldGUgdGhpcy5vYmpkYXRhO1xyXG5cdFx0ZGVsZXRlIHRoaXMubXRsZGF0YTtcclxuXHRcdFxyXG5cdFx0ZGVsZXRlIHRoaXMubFNjcmlwdFRhZztcclxuXHRcdGRlbGV0ZSB0aGlzLmdTY3JpcHRUYWc7XHJcblx0XHRcclxuXHRcdGRlbGV0ZSB0aGlzLnRpbGVkYXRhO1xyXG5cdFx0XHJcblx0XHRkZWxldGUgdGhpcy5zY2VuZTtcclxuXHRcdGRlbGV0ZSB0aGlzLm1hcG1vZGVsO1xyXG5cdFx0ZGVsZXRlIHRoaXMuY2FtZXJhO1xyXG5cdFx0XHJcblx0XHRkZWxldGUgdGhpcy5zcHJpdGVOb2RlO1xyXG5cdFx0ZGVsZXRlIHRoaXMubGlnaHROb2RlO1xyXG5cdFx0ZGVsZXRlIHRoaXMuY2FtZXJhTm9kZTtcclxuXHRcdFxyXG5cdFx0dGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoKTtcclxuXHRcdHRoaXMuZ2MuZGlzcG9zZSgpO1xyXG5cdFx0ZGVsZXRlIHRoaXMuZ2M7XHJcblx0fSxcclxuXHRcclxuXHQvKiogQmVnaW4gZG93bmxvYWQgb2YgdGhpcyBtYXAncyB6aXAgZmlsZSwgcHJlbG9hZGluZyB0aGUgZGF0YS4gKi9cclxuXHRkb3dubG9hZCA6IGZ1bmN0aW9uKCl7XHJcblx0XHRpZiAodGhpcy5maWxlKSByZXR1cm47IC8vd2UgaGF2ZSB0aGUgZmlsZSBpbiBtZW1vcnkgYWxyZWFkeSwgZG8gbm90aGluZ1xyXG5cdFx0aWYgKHRoaXMueGhyKSByZXR1cm47IC8vYWxyZWFkeSBnb3QgYW4gYWN0aXZlIHJlcXVlc3QsIGRvIG5vdGhpbmdcclxuXHRcdFxyXG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xyXG5cdFx0dmFyIHhociA9IHRoaXMueGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XHJcblx0XHR4aHIub3BlbihcIkdFVFwiLCBCQVNFVVJMK1wiL21hcHMvXCIrdGhpcy5pZCtFWFRfTUFQQlVORExFKTtcclxuXHRcdC8vIGNvbnNvbGUubG9nKFwiWEhSOiBcIiwgeGhyKTtcclxuXHRcdHhoci5yZXNwb25zZVR5cGUgPSBcImJsb2JcIjtcclxuXHRcdHhoci5vbihcImxvYWRcIiwgZnVuY3Rpb24oZSkge1xyXG5cdFx0XHQvLyBjb25zb2xlLmxvZyhcIkxPQUQ6XCIsIGUpO1xyXG5cdFx0XHRpZiAoeGhyLnN0YXR1cyA9PSAyMDApIHtcclxuXHRcdFx0XHRzZWxmLmZpbGUgPSB4aHIucmVzcG9uc2U7XHJcblx0XHRcdFx0c2VsZi5lbWl0KFwiZG93bmxvYWRlZFwiKTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRjb25zb2xlLmVycm9yKFwiRVJST1I6XCIsIHhoci5zdGF0dXNUZXh0KTtcclxuXHRcdFx0XHRzZWxmLmxvYWRFcnJvciA9IHhoci5zdGF0dXNUZXh0O1xyXG5cdFx0XHRcdHNlbGYuZW1pdChcImxvYWQtZXJyb3JcIiwgeGhyLnN0YXR1c1RleHQpO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHRcdHhoci5vbihcInByb2dyZXNzXCIsIGZ1bmN0aW9uKGUpe1xyXG5cdFx0XHQvLyBjb25zb2xlLmxvZyhcIlBST0dSRVNTOlwiLCBlKTtcclxuXHRcdFx0aWYgKGUubGVuZ3RoQ29tcHV0YWJsZSkge1xyXG5cdFx0XHRcdC8vIHZhciBwZXJjZW50RG9uZSA9IGUubG9hZGVkIC8gZS50b3RhbDtcclxuXHRcdFx0XHRzZWxmLmVtaXQoXCJwcm9ncmVzc1wiLCBlLmxvYWRlZCwgZS50b3RhbCk7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0Ly9tYXJxdWVlIGJhclxyXG5cdFx0XHRcdHNlbGYuZW1pdChcInByb2dyZXNzXCIsIC0xKTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblx0XHR4aHIub24oXCJlcnJvclwiLCBmdW5jdGlvbihlKXtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihcIkVSUk9SOlwiLCBlKTtcclxuXHRcdFx0c2VsZi5sb2FkRXJyb3IgPSBlO1xyXG5cdFx0XHR0aGlzLmVtaXQoXCJsb2FkLWVycm9yXCIsIGUpO1xyXG5cdFx0fSk7XHJcblx0XHR4aHIub24oXCJjYW5jZWxlZFwiLCBmdW5jdGlvbihlKXtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihcIkNBTkNFTEVEOlwiLCBlKTtcclxuXHRcdFx0c2VsZi5sb2FkRXJyb3IgPSBlO1xyXG5cdFx0XHR0aGlzLmVtaXQoXCJsb2FkLWVycm9yXCIsIGUpO1xyXG5cdFx0fSk7XHJcblx0XHQvL1RPRE8gb24gZXJyb3IgYW5kIG9uIGNhbmNlbGVkXHJcblx0XHRcclxuXHRcdHhoci5zZW5kKCk7XHJcblx0fSxcclxuXHRcclxuXHQvKipcclxuXHQgKiAgUmVhZHMgdGhlIHRpbGUgZGF0YSBhbmQgYmVnaW5zIGxvYWRpbmcgdGhlIHJlcXVpcmVkIHJlc291cmNlcy5cclxuXHQgKi9cclxuXHRsb2FkIDogZnVuY3Rpb24oKXtcclxuXHRcdHZhciBzZWxmID0gdGhpcztcclxuXHRcdGlmICghdGhpcy5maWxlKSB7IC8vSWYgZmlsZSBpc24ndCBkb3dubG9hZGVkIHlldCwgZGVmZXIgbG9hZGluZ1xyXG5cdFx0XHR0aGlzLm9uY2UoXCJkb3dubG9hZGVkXCIsIGZ1bmN0aW9uKCl7XHJcblx0XHRcdFx0c2VsZi5sb2FkKCk7XHJcblx0XHRcdH0pO1xyXG5cdFx0XHR0aGlzLmRvd25sb2FkKCk7XHJcblx0XHRcdC8vVE9ETyB0aHJvdyB1cCBsb2FkaW5nIGdpZlxyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdHRoaXMubWFya0xvYWRpbmcoXCJNQVBfbWFwZGF0YVwiKTtcclxuXHRcdHZhciBfdGV4c0xvYWRlZCA9IGZhbHNlO1xyXG5cdFx0XHJcblx0XHR0aGlzLmZpbGVTeXMuaW1wb3J0QmxvYih0aGlzLmZpbGUsIGZ1bmN0aW9uIHN1Y2Nlc3MoKXtcclxuXHRcdFx0Ly9sb2FkIHVwIHRoZSBtYXAhXHJcblx0XHRcdHNlbGYuZmlsZVN5cy5yb290LmdldENoaWxkQnlOYW1lKFwibWFwLmpzb25cIikuZ2V0VGV4dChfX2pzb25Mb2FkZWQsIF9fbG9nUHJvZ3Jlc3MpO1xyXG5cdFx0XHRzZWxmLmZpbGVTeXMucm9vdC5nZXRDaGlsZEJ5TmFtZShcIm1hcC5vYmpcIikuZ2V0VGV4dChfX29iakxvYWRlZCwgX19sb2dQcm9ncmVzcyk7XHJcblx0XHRcdHNlbGYuZmlsZVN5cy5yb290LmdldENoaWxkQnlOYW1lKFwibWFwLm10bFwiKS5nZXRUZXh0KF9fbXRsTG9hZGVkLCBfX2xvZ1Byb2dyZXNzKTtcclxuXHRcdFx0XHJcblx0XHR9LCBmdW5jdGlvbiBlcnJvcihlKXtcclxuXHRcdFx0Y29uc29sZS5sb2coXCJFUlJPUjogXCIsIGUpO1xyXG5cdFx0XHRzZWxmLmVtaXQoXCJsb2FkLWVycm9yXCIpOyAvL1NlbmQgdG8gdGhlIGRvcml0byBkdW5nZW9uXHJcblx0XHR9KTtcclxuXHRcdHJldHVybjsgXHJcblx0XHRcclxuXHRcdGZ1bmN0aW9uIF9fbG9nUHJvZ3Jlc3MoKSB7XHJcblx0XHRcdGNvbnNvbGUubG9nKFwiUFJPR1JFU1NcIiwgYXJndW1lbnRzKTtcclxuXHRcdH1cclxuXHRcdC8vQ2FsbGJhY2sgY2hhaW4gYmVsb3dcclxuXHRcdGZ1bmN0aW9uIF9fanNvbkxvYWRlZChkYXRhKSB7XHJcblx0XHRcdHNlbGYubWV0YWRhdGEgPSBKU09OLnBhcnNlKGRhdGEpO1xyXG5cdFx0XHRcclxuXHRcdFx0c2VsZi50aWxlZGF0YSA9IG5kYXJyYXkoc2VsZi5tZXRhZGF0YS5tYXAsIFtzZWxmLm1ldGFkYXRhLndpZHRoLCBzZWxmLm1ldGFkYXRhLmhlaWdodF0sIFsxLCBzZWxmLm1ldGFkYXRhLndpZHRoXSk7XHJcblx0XHRcdGlmIChzZWxmLm1ldGFkYXRhW1wiaGVpZ2h0c3RlcFwiXSA9PT0gdW5kZWZpbmVkKSB7XHJcblx0XHRcdFx0c2VsZi5tZXRhZGF0YVtcImhlaWdodHN0ZXBcIl0gPSBERUZfSEVJR0hUX1NURVA7XHJcblx0XHRcdH1cclxuXHRcdFx0XHJcblx0XHRcdGlmIChzZWxmLm1ldGFkYXRhW1wiYmdtdXNpY1wiXSAhPT0gdW5kZWZpbmVkKSB7XHJcblx0XHRcdFx0c2VsZi5fbG9hZE11c2ljKHNlbGYubWV0YWRhdGFbXCJiZ211c2ljXCJdKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0c2VsZi5lbWl0KFwibG9hZGVkLW1ldGFcIik7XHJcblx0XHRcdF9fbG9hZERvbmUoKTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0ZnVuY3Rpb24gX19vYmpMb2FkZWQoZGF0YSkge1xyXG5cdFx0XHRzZWxmLm9iamRhdGEgPSBkYXRhO1xyXG5cdFx0XHRfX21vZGVsTG9hZGVkKCk7XHJcblx0XHR9XHJcblx0XHRmdW5jdGlvbiBfX210bExvYWRlZChkYXRhKSB7XHJcblx0XHRcdHNlbGYubXRsZGF0YSA9IGRhdGE7XHJcblx0XHRcdF9fbW9kZWxMb2FkZWQoKTtcclxuXHRcdH1cclxuXHRcdGZ1bmN0aW9uIF9fbW9kZWxMb2FkZWQoKSB7XHJcblx0XHRcdGlmICghc2VsZi5vYmpkYXRhIHx8ICFzZWxmLm10bGRhdGEpIHJldHVybjsgLy9kb24ndCBiZWdpbiBwYXJzaW5nIHVudGlsIHRoZXkncmUgYm90aCBsb2FkZWRcclxuXHRcdFx0XHJcblx0XHRcdHNlbGYub25Bc3NldFR5cGVMb2FkZWQoXCJNQVBURVhcIiwgZnVuY3Rpb24oKXtcclxuXHRcdFx0XHRfdGV4c0xvYWRlZCA9IHRydWU7XHJcblx0XHRcdFx0X19sb2FkRG9uZSgpO1xyXG5cdFx0XHR9KTtcclxuXHRcdFx0XHJcblx0XHRcdGZ1bmN0aW9uIGxvYWRUZXh0dXJlKGZpbGVuYW1lLCBjYWxsYmFjaykge1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKFwibG9hZFRleCEgXCIsIGZpbGVuYW1lKTtcclxuXHRcdFx0XHR2YXIgZmlsZSA9IHNlbGYuZmlsZVN5cy5yb290LmdldENoaWxkQnlOYW1lKGZpbGVuYW1lKTtcclxuXHRcdFx0XHRpZiAoIWZpbGUpIHtcclxuXHRcdFx0XHRcdGNvbnNvbGUuZXJyb3IoXCJFUlJPUiBMT0FESU5HIFRFWFRVUkU6IE5vIHN1Y2ggZmlsZSBpbiBtYXAgYnVuZGxlISBcIitmaWxlbmFtZSk7XHJcblx0XHRcdFx0XHRjYWxsYmFjayhERUZfVEVYVFVSRSk7XHJcblx0XHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGZpbGUuZ2V0QmxvYihcImltYWdlL3BuZ1wiLCBmdW5jdGlvbihkYXRhKSB7XHJcblx0XHRcdFx0XHRjb25zb2xlLmxvZyhcImxvYWRUZXghIEZJTklTSCBcIiwgZmlsZW5hbWUpO1xyXG5cdFx0XHRcdFx0dmFyIHVybCA9IFVSTC5jcmVhdGVPYmplY3RVUkwoZGF0YSk7XHJcblx0XHRcdFx0XHRzZWxmLmdjLmNvbGxlY3RVUkwodXJsKTtcclxuXHRcdFx0XHRcdGNhbGxiYWNrKHVybCk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHRcdFx0XHJcblx0XHRcdHZhciBvYmpsZHIgPSBuZXcgT2JqTG9hZGVyKHNlbGYub2JqZGF0YSwgc2VsZi5tdGxkYXRhLCBsb2FkVGV4dHVyZSwge1xyXG5cdFx0XHRcdGdjOiBzZWxmLmdjLFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0b2JqbGRyLm9uKFwibG9hZFwiLCBfX21vZGVsUmVhZHkpO1xyXG5cdFx0XHRvYmpsZHIubG9hZCgpO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHRmdW5jdGlvbiBfX21vZGVsUmVhZHkob2JqKSB7XHJcblx0XHRcdHNlbGYubWFwbW9kZWwgPSBvYmo7XHJcblx0XHRcdC8vIF9fdGVzdF9fb3V0cHV0VHJlZShvYmopO1xyXG5cdFx0XHRzZWxmLm9iamRhdGEgPSBzZWxmLm10bGRhdGEgPSB0cnVlOyAvL3dpcGUgdGhlIGJpZyBzdHJpbmdzIGZyb20gbWVtb3J5XHJcblx0XHRcdHNlbGYuZW1pdChcImxvYWRlZC1tb2RlbFwiKTtcclxuXHRcdFx0X19sb2FkRG9uZSgpO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHRmdW5jdGlvbiBfX2xvYWREb25lKCkge1xyXG5cdFx0XHQvLyBjb25zb2xlLmxvZyhcIl9fbG9hZERvbmVcIiwgISFzZWxmLm1hcG1vZGVsLCAhIXNlbGYudGlsZWRhdGEpO1xyXG5cdFx0XHRpZiAoIXNlbGYubWFwbW9kZWwgfHwgIXNlbGYudGlsZWRhdGEgfHwgIV90ZXhzTG9hZGVkKSByZXR1cm47IC8vZG9uJ3QgY2FsbCBvbiBfaW5pdCBiZWZvcmUgYm90aCBhcmUgbG9hZGVkXHJcblx0XHRcdFxyXG5cdFx0XHRzZWxmLl9pbml0KCk7XHJcblx0XHRcdHNlbGYubWFya0xvYWRGaW5pc2hlZChcIk1BUF9tYXBkYXRhXCIpO1xyXG5cdFx0fVxyXG5cdH0sXHJcblx0XHJcblx0XHJcblx0X2xvYWRNdXNpYzogZnVuY3Rpb24obXVzaWNkZWYpIHtcclxuXHRcdHZhciBzZWxmID0gdGhpcztcclxuXHRcdFxyXG5cdFx0aWYgKCFtdXNpY2RlZikgcmV0dXJuO1xyXG5cdFx0aWYgKCEkLmlzQXJyYXkobXVzaWNkZWYpKSBtdXNpY2RlZiA9IFttdXNpY2RlZl07XHJcblx0XHRcclxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgbXVzaWNkZWYubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0aWYgKFNvdW5kTWFuYWdlci5pc011c2ljTG9hZGVkKG11c2ljZGVmW2ldLmlkKSkgY29udGludWU7IC8vbXVzaWMgYWxyZWFkeSBsb2FkZWRcclxuXHRcdFx0X19sb2FkTXVzaWNGcm9tRmlsZShtdXNpY2RlZltpXS5pZCwgaSwgZnVuY3Rpb24oaWR4LCB1cmwsIGRhdGEpe1xyXG5cdFx0XHRcdFNvdW5kTWFuYWdlci5sb2FkTXVzaWMobXVzaWNkZWZbaWR4XS5pZCwge1xyXG5cdFx0XHRcdFx0ZGF0YTogZGF0YSxcclxuXHRcdFx0XHRcdHVybDogdXJsLFxyXG5cdFx0XHRcdFx0bG9vcFN0YXJ0OiBtdXNpY2RlZltpZHhdLmxvb3BTdGFydCxcclxuXHRcdFx0XHRcdGxvb3BFbmQ6IG11c2ljZGVmW2lkeF0ubG9vcEVuZCxcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdGlmICghbXVzaWNkZWZbXCJkb250QXV0b3BsYXlcIl0pIHtcclxuXHRcdFx0c2VsZi5xdWV1ZUZvck1hcFN0YXJ0KGZ1bmN0aW9uKCl7XHJcblx0XHRcdFx0U291bmRNYW5hZ2VyLnBsYXlNdXNpYyhtdXNpY2RlZlswXS5pZCk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHRyZXR1cm47XHJcblx0XHRcclxuXHRcdGZ1bmN0aW9uIF9fbG9hZE11c2ljRnJvbUZpbGUobXVzaWNpZCwgaWR4LCBjYWxsYmFjaykge1xyXG5cdFx0XHRzZWxmLm1hcmtMb2FkaW5nKFwiQkdNVVNJQ19cIittdXNpY2lkKTtcclxuXHRcdFx0dHJ5IHtcclxuXHRcdFx0XHR2YXIgZGlyID0gc2VsZi5maWxlU3lzLnJvb3QuZ2V0Q2hpbGRCeU5hbWUoXCJiZ211c2ljXCIpO1xyXG5cdFx0XHRcdGlmICghZGlyKSB7XHJcblx0XHRcdFx0XHRjb25zb2xlLmVycm9yKFwiTm8gYmdtdXNpYyBmb2xkZXIgaW4gdGhlIG1hcCBmaWxlIVwiKTtcclxuXHRcdFx0XHRcdHJldHVybjtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0dmFyIGZpbGUgPSBkaXIuZ2V0Q2hpbGRCeU5hbWUobXVzaWNpZCtcIi5tcDNcIik7XHJcblx0XHRcdFx0aWYgKCFmaWxlKSB7XHJcblx0XHRcdFx0XHRjb25zb2xlLmVycm9yKFwiTm8gYmdtdXNpYyB3aXRoIG5hbWUgJ1wiK211c2ljaWQrXCIubXAzXCIrXCInICFcIik7XHJcblx0XHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdGZ1bmN0aW9uIG9uUHJvZ3Jlc3MoaW5kZXgsIHRvdGFsKXtcclxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKFwiTXVzaWMgTG9hZCBQcm9ncmVzczogXCIsIGluZGV4LCB0b3RhbCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdGZpbGUuZ2V0QmxvYihcImF1ZGlvL21wZWdcIiwgZnVuY3Rpb24oZGF0YSl7XHJcblx0XHRcdFx0XHR2YXIgdXJsID0gVVJMLmNyZWF0ZU9iamVjdFVSTChkYXRhKTtcclxuXHRcdFx0XHRcdHNlbGYuZ2MuY29sbGVjdFVSTCh1cmwpO1xyXG5cdFx0XHRcdFx0Y2FsbGJhY2soaWR4LCB1cmwsIGRhdGEpO1xyXG5cdFx0XHRcdFx0c2VsZi5tYXJrTG9hZEZpbmlzaGVkKFwiQkdNVVNJQ19cIittdXNpY2lkKTtcclxuXHRcdFx0XHR9LCBvblByb2dyZXNzKTtcclxuXHRcdFx0fSBjYXRjaCAoZSkge1xyXG5cdFx0XHRcdGNhbGxiYWNrKGUpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHRcclxuXHR9LFxyXG5cdFxyXG5cdC8qKlxyXG5cdCAqIENyZWF0ZXMgdGhlIG1hcCBmb3IgZGlzcGxheSBmcm9tIHRoZSBzdG9yZWQgZGF0YS5cclxuXHQgKi9cclxuXHRfaW5pdCA6IGZ1bmN0aW9uKCl7XHJcblx0XHR2YXIgc2VsZiA9IHRoaXM7XHJcblx0XHR0aGlzLnNjZW5lID0gbmV3IFRIUkVFLlNjZW5lKCk7XHJcblx0XHR0aGlzLmNhbWVyYXMgPSB7fTtcclxuXHRcdFxyXG5cdFx0aWYgKCF3aW5kb3cucGxheWVyKSB7XHJcblx0XHRcdHdpbmRvdy5wbGF5ZXIgPSBuZXcgUGxheWVyQ2hhcigpO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHR0aGlzLnNjZW5lLmFkZCh0aGlzLm1hcG1vZGVsKTtcclxuXHRcdFxyXG5cdFx0dGhpcy5jYW1lcmFMb2dpY3MgPSBbXTtcclxuXHRcdHNldHVwTWFwUmlnZ2luZyh0aGlzKTtcclxuXHRcdC8vIE1hcCBNb2RlbCBpcyBub3cgcmVhZHlcclxuXHRcdFxyXG5cdFx0aWYgKHRoaXMubWV0YWRhdGEuY2xlYXJDb2xvcilcclxuXHRcdFx0dGhyZWVSZW5kZXJlci5zZXRDbGVhckNvbG9ySGV4KCB0aGlzLm1ldGFkYXRhLmNsZWFyQ29sb3IgKTtcclxuXHRcdFxyXG5cdFx0dGhpcy5faW5pdEV2ZW50TWFwKCk7XHJcblx0XHRcclxuXHRcdHRoaXMuZW1pdChcIm1hcC1yZWFkeVwiKTtcclxuXHRcdFxyXG5cdH0sXHJcblx0XHJcblx0XHJcblx0Ly8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblx0Ly8gVGlsZSBJbmZvcm1hdGlvbiBcclxuXHQvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHRcclxuXHR0aWxlZGF0YSA6IG51bGwsXHJcblx0XHJcblx0Z2V0VGlsZURhdGEgOiBmdW5jdGlvbih4LCB5KSB7XHJcblx0XHR2YXIgdGlsZSA9IGNvbnZlcnRTaG9ydFRvVGlsZVByb3BzKHRoaXMudGlsZWRhdGEuZ2V0KHgsIHkpKTtcclxuXHRcdHJldHVybiB0aWxlO1xyXG5cdH0sXHJcblx0XHJcblx0Z2V0TGF5ZXJUcmFuc2l0aW9uIDogZnVuY3Rpb24oeCwgeSwgY3VyckxheWVyKSB7XHJcblx0XHRjdXJyTGF5ZXIgPSAoY3VyckxheWVyIT09dW5kZWZpbmVkKT8gY3VyckxheWVyIDogMTtcclxuXHRcdHZhciB0aWxlID0gdGhpcy5nZXRUaWxlRGF0YSh4LCB5KTtcclxuXHRcdHZhciBsYXllciA9IHRpbGUudHJhbnNpdGlvbjtcclxuXHRcdHZhciBvcmlnaW4xID0gdGhpcy5tZXRhZGF0YS5sYXllcnNbY3VyckxheWVyLTFdW1wiMmRcIl07XHJcblx0XHR2YXIgb3JpZ2luMiA9IHRoaXMubWV0YWRhdGEubGF5ZXJzW2xheWVyLTFdW1wiMmRcIl07XHJcblx0XHRcclxuXHRcdHJldHVybiB7XHJcblx0XHRcdGxheWVyOiBsYXllcixcclxuXHRcdFx0eDogeCAtIG9yaWdpbjFbMF0gKyBvcmlnaW4yWzBdLFxyXG5cdFx0XHR5OiB5IC0gb3JpZ2luMVsxXSArIG9yaWdpbjJbMV0sXHJcblx0XHR9O1xyXG5cdH0sXHJcblx0XHJcblx0Z2V0M0RUaWxlTG9jYXRpb24gOiBmdW5jdGlvbih4LCB5LCBsYXllciwgdGlsZWRhdGEpIHtcclxuXHRcdGlmICh4IGluc3RhbmNlb2YgVEhSRUUuVmVjdG9yMikge1xyXG5cdFx0XHR5ID0geC55OyB4ID0geC54O1xyXG5cdFx0fVxyXG5cdFx0aWYgKHggaW5zdGFuY2VvZiBUSFJFRS5WZWN0b3IzKSB7XHJcblx0XHRcdGxheWVyID0geC56OyB5ID0geC55OyB4ID0geC54O1xyXG5cdFx0fVxyXG5cdFx0bGF5ZXIgPSAobGF5ZXIgfHwgMSkgLSAxO1xyXG5cdFx0aWYgKCF0aWxlZGF0YSkgdGlsZWRhdGEgPSB0aGlzLmdldFRpbGVEYXRhKHgsIHkpO1xyXG5cdFx0XHJcblx0XHR2YXIgbGF5ZXJkYXRhID0gdGhpcy5tZXRhZGF0YS5sYXllcnNbbGF5ZXJdO1xyXG5cdFx0dmFyIHogPSB0aWxlZGF0YS5oZWlnaHQgKiB0aGlzLm1ldGFkYXRhLmhlaWdodHN0ZXA7XHJcblx0XHRcclxuXHRcdHZhciBsb2MgPSBuZXcgVEhSRUUuVmVjdG9yMyh4LCB6LCB5KTtcclxuXHRcdGxvYy54IC09IGxheWVyZGF0YVtcIjJkXCJdWzBdO1xyXG5cdFx0bG9jLnogLT0gbGF5ZXJkYXRhW1wiMmRcIl1bMV07XHJcblx0XHRcclxuXHRcdHZhciBtYXQgPSBuZXcgVEhSRUUuTWF0cml4NCgpO1xyXG5cdFx0bWF0LnNldC5hcHBseShtYXQsIGxheWVyZGF0YVtcIjNkXCJdKTtcclxuXHRcdGxvYy5hcHBseU1hdHJpeDQobWF0KTtcclxuXHRcdFxyXG5cdFx0cmV0dXJuIGxvYztcclxuXHR9LFxyXG5cdC8qXHJcblx0Z2V0QWxsV2Fsa2FibGVUaWxlcyA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0dmFyIHRpbGVzID0gW107XHJcblx0XHRmb3IgKHZhciBsaSA9IDE7IGxpIDw9IDc7IGxpKyspIHtcclxuXHRcdFx0aWYgKCF0aGlzLm1ldGFkYXRhLmxheWVyc1tsaS0xXSkgY29udGludWU7XHJcblx0XHRcdHRpbGVzW2xpXSA9IFtdO1xyXG5cdFx0XHRcclxuXHRcdFx0Zm9yICh2YXIgeSA9IDA7IHkgPCB0aGlzLm1ldGFkYXRhLmhlaWdodDsgeSsrKSB7XHJcblx0XHRcdFx0Zm9yICh2YXIgeCA9IDA7IHggPCB0aGlzLm1ldGFkYXRhLndpZHRoOyB4KyspIHtcclxuXHRcdFx0XHRcdHZhciB0ZGF0YSA9IHRoaXMuZ2V0VGlsZURhdGEoeCwgeSk7XHJcblx0XHRcdFx0XHRpZiAoIXRkYXRhLmlzV2Fsa2FibGUpIGNvbnRpbnVlO1xyXG5cdFx0XHRcdFx0XHJcblx0XHRcdFx0XHR0ZGF0YVtcIjNkbG9jXCJdID0gdGhpcy5nZXQzRFRpbGVMb2NhdGlvbih4LCB5LCBsaSwgdGRhdGEpO1xyXG5cdFx0XHRcdFx0XHJcblx0XHRcdFx0XHR0aWxlc1tsaV0ucHVzaCh0ZGF0YSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gdGlsZXM7XHJcblx0fSwgKi9cclxuXHRcclxuXHRnZXRSYW5kb21OUENTcGF3blBvaW50IDogZnVuY3Rpb24oKSB7XHJcblx0XHRpZiAoIXRoaXMubWV0YWRhdGEubnBjc3Bhd25zKSB7XHJcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIkV2ZW50IHJlcXVlc3RlZCBOUEMgU3Bhd24gUG9pbnQgb24gYSBtYXAgd2hlcmUgbm9uZSBhcmUgZGVmaW5lZCFcIik7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdHZhciBwdHMgPSB0aGlzLm1ldGFkYXRhLl9ucGNTcGF3bnNBdmFpbDtcclxuXHRcdGlmICghcHRzIHx8ICFwdHMubGVuZ3RoKSB7XHJcblx0XHRcdHB0cyA9IHRoaXMubWV0YWRhdGEuX25wY1NwYXduc0F2YWlsID0gdGhpcy5tZXRhZGF0YS5ucGNzcGF3bnMuc2xpY2UoKTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0dmFyIGluZGV4ID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogcHRzLmxlbmd0aCk7XHJcblx0XHR2YXIgdmVjID0gbmV3IFRIUkVFLlZlY3RvcjMocHRzW2luZGV4XVswXSwgcHRzW2luZGV4XVsxXSwgcHRzW2luZGV4XVsyXSB8fCAxKTtcclxuXHRcdHB0cy5zcGxpY2UoaW5kZXgsIDEpO1xyXG5cdFx0cmV0dXJuIHZlYztcclxuXHRcdFxyXG5cdH0sXHJcblx0XHJcblx0LyoqXHJcblx0ICogY2FuV2Fsa0JldHdlZW46IElmIGl0IGlzIHBvc3NpYmxlIHRvIHdhbGsgZnJvbSBvbmUgdGlsZSB0byBhbm90aGVyLiBUaGUgdHdvXHJcblx0ICogXHRcdHRpbGVzIG11c3QgYmUgYWRqYWNlbnQsIG9yIGZhbHNlIGlzIGltbWVkZWF0ZWx5IHJldHVybmVkLlxyXG5cdCAqIHJldHVybnM6XHJcblx0ICogXHRcdGZhbHNlID0gY2Fubm90LCAxID0gY2FuLCAyID0gbXVzdCBqdW1wLCA0ID0gbXVzdCBzd2ltL3N1cmZcclxuXHQgKi9cclxuXHRjYW5XYWxrQmV0d2VlbiA6IGZ1bmN0aW9uKHNyY3gsIHNyY3ksIGRlc3R4LCBkZXN0eSwgaWdub3JlRXZlbnRzKXtcclxuXHRcdGlmIChNYXRoLmFicyhzcmN4IC0gZGVzdHgpICsgTWF0aC5hYnMoc3JjeSAtIGRlc3R5KSAhPSAxKSByZXR1cm4gZmFsc2U7XHJcblx0XHRcclxuXHRcdC8vIElmIHdlJ3JlIHNvbWVob3cgYWxyZWFkeSBvdXRzaWRlIHRoZSBtYXAsIHVuY29uZGl0aW9uYWxseSBhbGxvdyB0aGVtIHRvIHdhbGsgYXJvdW5kIHRvIGdldCBiYWNrIGluXHJcblx0XHRpZiAoc3JjeCA8IDAgfHwgc3JjeCA+PSB0aGlzLm1ldGFkYXRhLndpZHRoKSByZXR1cm4gdHJ1ZTtcclxuXHRcdGlmIChzcmN5IDwgMCB8fCBzcmN5ID49IHRoaXMubWV0YWRhdGEuaGVpZ2h0KSByZXR1cm4gdHJ1ZTtcclxuXHRcdFxyXG5cdFx0Ly8gU2FuaXR5IGNoZWNrIGVkZ2VzIG9mIHRoZSBtYXBcclxuXHRcdGlmIChkZXN0eCA8IDAgfHwgZGVzdHggPj0gdGhpcy5tZXRhZGF0YS53aWR0aCkgcmV0dXJuIGZhbHNlO1xyXG5cdFx0aWYgKGRlc3R5IDwgMCB8fCBkZXN0eSA+PSB0aGlzLm1ldGFkYXRhLmhlaWdodCkgcmV0dXJuIGZhbHNlO1xyXG5cdFx0XHJcblx0XHR2YXIgc3JjdGlsZSA9IHRoaXMuZ2V0VGlsZURhdGEoc3JjeCwgc3JjeSk7XHJcblx0XHR2YXIgZGVzdHRpbGUgPSB0aGlzLmdldFRpbGVEYXRhKGRlc3R4LCBkZXN0eSk7XHJcblx0XHRcclxuXHRcdGlmICghZGVzdHRpbGUuaXNXYWxrYWJsZSkgcmV0dXJuIGZhbHNlO1xyXG5cdFx0XHJcblx0XHRpZiAoIWlnbm9yZUV2ZW50cykgeyAvL2NoZWNrIGZvciB0aGUgcHJlc2Vuc2Ugb2YgZXZlbnRzXHJcblx0XHRcdHZhciBldnRzID0gdGhpcy5ldmVudE1hcC5nZXQoZGVzdHgsIGRlc3R5KTtcclxuXHRcdFx0aWYgKGV2dHMpIHtcclxuXHRcdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGV2dHMubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0XHRcdGlmICghZXZ0c1tpXS5jYW5XYWxrT24oKSkgcmV0dXJuIGZhbHNlO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHR2YXIgY2FuV2FsayA9IHRydWU7IC8vQXNzdW1lIHdlIGNhbiB0cmF2ZWwgYmV0d2VlbiB1bnRpbCBwcm92ZW4gb3RoZXJ3aXNlLlxyXG5cdFx0dmFyIG11c3RKdW1wLCBtdXN0U3dpbSwgbXVzdFRyYW5zaXRpb24sIG11c3RCZVBsYXllcjtcclxuXHRcdFxyXG5cdFx0dmFyIGRpciA9IChmdW5jdGlvbigpe1xyXG5cdFx0XHRzd2l0Y2ggKDEpIHtcclxuXHRcdFx0XHRjYXNlIChzcmN5IC0gZGVzdHkpOiByZXR1cm4gW1widXBcIiwgXCJkb3duXCJdO1xyXG5cdFx0XHRcdGNhc2UgKGRlc3R5IC0gc3JjeSk6IHJldHVybiBbXCJkb3duXCIsIFwidXBcIl07XHJcblx0XHRcdFx0Y2FzZSAoc3JjeCAtIGRlc3R4KTogcmV0dXJuIFtcImxlZnRcIiwgXCJyaWdodFwiXTtcclxuXHRcdFx0XHRjYXNlIChkZXN0eCAtIHNyY3gpOiByZXR1cm4gW1wicmlnaHRcIiwgXCJsZWZ0XCJdO1xyXG5cdFx0XHR9IHJldHVybiBudWxsO1xyXG5cdFx0fSkoKTtcclxuXHRcdFxyXG5cdFx0aWYgKHNyY3RpbGUubW92ZW1lbnRbZGlyWzBdXSkgeyAvL2lmIG1vdmVtZW50ID0gdHJ1ZSwgbWVhbnMgd2UgY2FuJ3Qgd2FsayB0aGVyZVxyXG5cdFx0XHRpZiAoc3JjdGlsZS5pc0xlZGdlKSBcclxuXHRcdFx0XHRtdXN0SnVtcCA9IHRydWU7XHJcblx0XHRcdGVsc2UgY2FuV2FsayA9IGZhbHNlO1xyXG5cdFx0fVxyXG5cdFx0Y2FuV2FsayAmPSAhZGVzdHRpbGUubW92ZW1lbnRbZGlyWzFdXTtcclxuXHRcdFxyXG5cdFx0bXVzdFN3aW0gPSBkZXN0dGlsZS5pc1dhdGVyO1xyXG5cdFx0XHJcblx0XHRtdXN0VHJhbnNpdGlvbiA9ICEhZGVzdHRpbGUudHJhbnNpdGlvbjtcclxuXHRcdFxyXG5cdFx0bXVzdEJlUGxheWVyID0gISFkZXN0dGlsZS5ub05QQztcclxuXHRcdFxyXG5cdFx0aWYgKCFjYW5XYWxrKSByZXR1cm4gZmFsc2U7XHJcblx0XHRyZXR1cm4gKGNhbldhbGs/MHgxOjApIHwgKG11c3RKdW1wPzB4MjowKSB8IChtdXN0U3dpbT8weDQ6MCkgfCAobXVzdFRyYW5zaXRpb24/MHg4OjApIHwgKG11c3RCZVBsYXllcj8weDEwOjApO1xyXG5cdH0sXHJcblx0XHJcblx0XHJcblx0Ly8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblx0Ly8gRXZlbnQgSGFuZGxpbmcgXHJcblx0Ly8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblx0XHJcblx0X2xvY2FsSWQgOiAwLFxyXG5cdGV2ZW50TGlzdCA6IG51bGwsXHJcblx0ZXZlbnRNYXAgOiBudWxsLFxyXG5cdFxyXG5cdF9pbml0RXZlbnRNYXAgOiBmdW5jdGlvbigpIHtcclxuXHRcdHZhciBzZWxmID0gdGhpcztcclxuXHRcdFxyXG5cdFx0dGhpcy5ldmVudExpc3QgPSB7fTtcclxuXHRcdHZhciB3ID0gdGhpcy5tZXRhZGF0YS53aWR0aCwgaCA9IHRoaXMubWV0YWRhdGEuaGVpZ2h0O1xyXG5cdFx0dGhpcy5ldmVudE1hcCA9IG5kYXJyYXkobmV3IEFycmF5KHcqaCksIFt3LCBoXSwgWzEsIHddKTtcclxuXHRcdHRoaXMuZXZlbnRNYXAucHV0ID0gZnVuY3Rpb24oeCwgeSwgdmFsKSB7XHJcblx0XHRcdGlmICghdGhpcy5nZXQoeCwgeSkpIHtcclxuXHRcdFx0XHR0aGlzLnNldCh4LCB5LCBbXSk7XHJcblx0XHRcdH1cclxuXHRcdFx0aWYgKHRoaXMuZ2V0KHgsIHkpLmluZGV4T2YodmFsKSA+PSAwKSByZXR1cm47IC8vZG9uJ3QgZG91YmxlIGFkZFxyXG5cdFx0XHR0aGlzLmdldCh4LCB5KS5wdXNoKHZhbCk7XHJcblx0XHR9O1xyXG5cdFx0dGhpcy5ldmVudE1hcC5yZW1vdmUgPSBmdW5jdGlvbih4LCB5LCB2YWwpIHtcclxuXHRcdFx0aWYgKCF0aGlzLmdldCh4LCB5KSkgcmV0dXJuIG51bGw7XHJcblx0XHRcdHZhciBpID0gdGhpcy5nZXQoeCwgeSkuaW5kZXhPZih2YWwpO1xyXG5cdFx0XHRpZiAodGhpcy5nZXQoeCwgeSkubGVuZ3RoLTEgPiAwKSB7XHJcblx0XHRcdFx0Ly9UcnlpbmcgdG8gZmluZCB0aGUgQnVnIG9mIHRoZSBQaGFudG9tIFNwcml0ZXMhXHJcblx0XHRcdFx0Y29uc29sZS53YXJuKFwiUkVNT1ZJTkcgRVZFTlQgRlJPTSBOT04tRU1QVFkgTElTVDogXCIsIHRoaXMuZ2V0KHgsIHkpLCBcImluZGV4OlwiLCBpKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRpZiAoaSA9PSAtMSkgcmV0dXJuIG51bGw7XHJcblx0XHRcdHJldHVybiB0aGlzLmdldCh4LCB5KS5zcGxpY2UoaSwgMSk7XHJcblx0XHR9O1xyXG5cdFx0XHJcblx0XHR0aGlzLnNwcml0ZU5vZGUgPSBuZXcgVEhSRUUuT2JqZWN0M0QoKTtcclxuXHRcdHRoaXMuc3ByaXRlTm9kZS5uYW1lID0gXCJTcHJpdGUgUmlnXCI7XHJcblx0XHR0aGlzLnNwcml0ZU5vZGUucG9zaXRpb24ueSA9IDAuMjE7XHJcblx0XHR0aGlzLnNjZW5lLmFkZCh0aGlzLnNwcml0ZU5vZGUpO1xyXG5cdFx0XHJcblx0XHQvLyBMb2FkIGV2ZW50IGpzIGZpbGVzIG5vdzpcclxuXHRcdHRoaXMuX19sb2FkU2NyaXB0KFwibFwiKTsgLy8gTG9hZCBsb2NhbGx5IGRlZmluZWQgZXZlbnRzXHJcblx0XHR0aGlzLl9fbG9hZFNjcmlwdChcImdcIik7IC8vIExvYWQgZ2xvYmFsbHkgZGVmaW5lZCBldmVudHNcclxuXHRcdFxyXG5cdFx0Ly8gQWRkIHRoZSBwbGF5ZXIgY2hhcmFjdGVyIGV2ZW50XHJcblx0XHR0aGlzLl9pbml0UGxheWVyQ2hhcmFjdGVyKCk7XHJcblx0XHRcclxuXHR9LFxyXG5cdFxyXG5cdF9fbG9hZFNjcmlwdCA6IGZ1bmN0aW9uKHQpIHtcclxuXHRcdHZhciBzZWxmID0gdGhpcztcclxuXHRcdHZhciBmaWxlID0gdGhpcy5maWxlU3lzLnJvb3QuZ2V0Q2hpbGRCeU5hbWUodCtcIl9ldnQuanNcIik7XHJcblx0XHRpZiAoIWZpbGUpIHtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihcIkVSUk9SIExPQURJTkcgRVZFTlRTOiBObyBcIit0K1wiX2V2dC5qcyBmaWxlIGlzIHByZXNlbnQgaW4gdGhlIG1hcCBidW5kbGUuXCIpO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblx0XHRmaWxlLmdldEJsb2IoXCJ0ZXh0L2phdmFzY3JpcHRcIiwgZnVuY3Rpb24oZGF0YSl7XHJcblx0XHRcdC8vIE5PVEU6IFdlIGNhbm5vdCB1c2UgSlF1ZXJ5KCkuYXBwZW5kKCksIGFzIGl0IGRlbGlicmF0ZWx5IGNsZWFucyB0aGUgc2NyaXB0IHRhZ3NcclxuXHRcdFx0Ly8gICBvdXQgb2YgdGhlIGRvbSBlbGVtZW50IHdlJ3JlIGFwcGVuZGluZywgbGl0ZXJhbGx5IGRlZmVhdGluZyB0aGUgcHVycG9zZS5cclxuXHRcdFx0Ly8gTk9URTI6IFdlIGFwcGVuZCB0byB0aGUgRE9NIGluc3RlYWQgb2YgdXNpbmcgZXZhbCgpIG9yIG5ldyBGdW5jdGlvbigpIGJlY2F1c2VcclxuXHRcdFx0Ly8gICB3aGVuIGFwcGVuZGVkIGxpa2Ugc28sIHRoZSBpbi1icm93c2VyZGVidWdnZXIgc2hvdWxkIGJlIGFibGUgdG8gZmluZCBpdCBhbmRcclxuXHRcdFx0Ly8gICBicmVha3BvaW50IGluIGl0LlxyXG5cdFx0XHR2YXIgc2NyaXB0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInNjcmlwdFwiKTtcclxuXHRcdFx0c2NyaXB0LnR5cGUgPSBcInRleHQvamF2YXNjcmlwdFwiO1xyXG5cdFx0XHRzY3JpcHQuc3JjID0gVVJMLmNyZWF0ZU9iamVjdFVSTChkYXRhKTtcclxuXHRcdFx0ZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChzY3JpcHQpO1xyXG5cdFx0XHR0aGlzW3QrXCJTY3JpcHRUYWdcIl0gPSBzY3JpcHQ7XHJcblx0XHRcdC8vIFVwb24gYmVpbmcgYWRkZWQgdG8gdGhlIGJvZHksIGl0IGlzIGV2YWx1YXRlZFxyXG5cdFx0XHRcclxuXHRcdFx0c2VsZi5nYy5jb2xsZWN0KHNjcmlwdCk7XHJcblx0XHRcdHNlbGYuZ2MuY29sbGVjdFVSTChzY3JpcHQuc3JjKTtcclxuXHRcdH0pO1xyXG5cdH0sXHJcblx0XHJcblx0YWRkRXZlbnQgOiBmdW5jdGlvbihldnQpIHtcclxuXHRcdGlmICghZXZ0KSByZXR1cm47XHJcblx0XHRpZiAoIShldnQgaW5zdGFuY2VvZiBFdmVudCkpIFxyXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJBdHRlbXB0ZWQgdG8gYWRkIGFuIG9iamVjdCB0aGF0IHdhc24ndCBhbiBFdmVudCEgXCIgKyBldnQpO1xyXG5cdFx0XHJcblx0XHRpZiAoIWV2dC5zaG91bGRBcHBlYXIoKSkgcmV0dXJuO1xyXG5cdFx0aWYgKCFldnQuaWQpXHJcblx0XHRcdGV2dC5pZCA9IFwiTG9jYWxFdmVudF9cIiArICgrK3RoaXMuX2xvY2FsSWQpO1xyXG5cdFx0XHJcblx0XHR2YXIgc2VsZiA9IHRoaXM7XHJcblx0XHQvL25vdyBhZGRpbmcgZXZlbnQgdG8gbWFwXHJcblx0XHR0aGlzLmV2ZW50TGlzdFtldnQuaWRdID0gZXZ0O1xyXG5cdFx0aWYgKGV2dC5sb2NhdGlvbikge1xyXG5cdFx0XHR0aGlzLmV2ZW50TWFwLnB1dChldnQubG9jYXRpb24ueCwgZXZ0LmxvY2F0aW9uLnksIGV2dCk7XHJcblx0XHR9IGVsc2UgaWYgKGV2dC5sb2NhdGlvbnMpIHtcclxuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBldnQubG9jYXRpb25zLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdFx0dmFyIGxvYyA9IGV2dC5sb2NhdGlvbnNbaV07XHJcblx0XHRcdFx0dGhpcy5ldmVudE1hcC5wdXQobG9jLngsIGxvYy55LCBldnQpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdC8vcmVnaXN0ZXJpbmcgbGlzdGVuZXJzIG9uIHRoZSBldmVudFxyXG5cdFx0ZXZ0Lm9uKFwibW92aW5nXCIsIF9tb3ZpbmcgPSBmdW5jdGlvbihzcmNYLCBzcmNZLCBkZXN0WCwgZGVzdFkpe1xyXG5cdFx0XHQvL1N0YXJ0ZWQgbW92aW5nIHRvIGEgbmV3IHRpbGVcclxuXHRcdFx0c2VsZi5ldmVudE1hcC5wdXQoZGVzdFgsIGRlc3RZLCB0aGlzKTtcclxuXHRcdFx0c2VsZi5ldmVudE1hcC5yZW1vdmUoc3JjWCwgc3JjWSwgdGhpcyk7XHJcblx0XHRcdFxyXG5cdFx0XHR2YXIgZGlyID0gbmV3IFRIUkVFLlZlY3RvcjMoc3JjWC1kZXN0WCwgMCwgZGVzdFktc3JjWSk7XHJcblx0XHRcdHZhciBsc3QgPSBzZWxmLmV2ZW50TWFwLmdldChkZXN0WCwgZGVzdFkpO1xyXG5cdFx0XHRpZiAobHN0KSB7XHJcblx0XHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBsc3QubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0XHRcdGlmICghbHN0W2ldIHx8IGxzdFtpXSA9PSB0aGlzKSBjb250aW51ZTtcclxuXHRcdFx0XHRcdC8vIGNvbnNvbGUubG9nKFwiZW50ZXJpbmctdGlsZVwiLCBkaXIsIGRlc3RYLCBkZXN0WSk7XHJcblx0XHRcdFx0XHRsc3RbaV0uZW1pdChcImVudGVyaW5nLXRpbGVcIiwgZGlyKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdFx0XHJcblx0XHRcdGlmIChzcmNYID09IGRlc3RYICYmIHNyY1kgPT0gZGVzdFkpIHJldHVybjsgLy9za2lwIFwibGVhdmluZ1wiIGlmIHdlJ3JlIHdhcnBpbmcgaW5cclxuXHRcdFx0Ly8gZGlyLnNldChzcmNYLWRlc3RYLCAwLCBkZXN0WS1zcmNZKS5uZWdhdGUoKTtcclxuXHRcdFx0bHN0ID0gc2VsZi5ldmVudE1hcC5nZXQoc3JjWCwgc3JjWSk7XHJcblx0XHRcdGlmIChsc3QpIHtcclxuXHRcdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGxzdC5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRcdFx0aWYgKCFsc3RbaV0gfHwgbHN0W2ldID09IHRoaXMpIGNvbnRpbnVlO1xyXG5cdFx0XHRcdFx0Ly8gY29uc29sZS5sb2coXCJsZWF2aW5nLXRpbGVcIiwgZGlyLCBzcmNYLCBzcmNZKTtcclxuXHRcdFx0XHRcdGxzdFtpXS5lbWl0KFwibGVhdmluZy10aWxlXCIsIGRpcik7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHRcdHRoaXMuZ2MuY29sbGVjdExpc3RlbmVyKGV2dCwgXCJtb3ZpbmdcIiwgX21vdmluZyk7XHJcblx0XHRcclxuXHRcdGV2dC5vbihcIm1vdmVkXCIsIF9tb3ZlZCA9IGZ1bmN0aW9uKHNyY1gsIHNyY1ksIGRlc3RYLCBkZXN0WSl7XHJcblx0XHRcdC8vRmluaXNoZWQgbW92aW5nIGZyb20gdGhlIG9sZCB0aWxlXHJcblx0XHRcdFxyXG5cdFx0XHR2YXIgZGlyID0gbmV3IFRIUkVFLlZlY3RvcjMoc3JjWC1kZXN0WCwgMCwgZGVzdFktc3JjWSk7XHJcblx0XHRcdHZhciBsc3QgPSBzZWxmLmV2ZW50TWFwLmdldChkZXN0WCwgZGVzdFkpO1xyXG5cdFx0XHRpZiAobHN0KSB7XHJcblx0XHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBsc3QubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0XHRcdGlmICghbHN0W2ldIHx8IGxzdFtpXSA9PSB0aGlzKSBjb250aW51ZTtcclxuXHRcdFx0XHRcdC8vIGNvbnNvbGUubG9nKFwiZW50ZXJlZC10aWxlXCIsIGRpciwgZGVzdFgsIGRlc3RZKTtcclxuXHRcdFx0XHRcdGxzdFtpXS5lbWl0KFwiZW50ZXJlZC10aWxlXCIsIGRpcik7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHRpZiAoc3JjWCA9PSBkZXN0WCAmJiBzcmNZID09IGRlc3RZKSByZXR1cm47IC8vc2tpcCBcImxlZnRcIiBpZiB3ZSdyZSB3YXJwaW5nIGluXHJcblx0XHRcdC8vIGRpci5zZXQoc3JjWC1kZXN0WCwgMCwgZGVzdFktc3JjWSkubmVnYXRlKCk7XHJcblx0XHRcdGxzdCA9IHNlbGYuZXZlbnRNYXAuZ2V0KHNyY1gsIHNyY1kpO1xyXG5cdFx0XHRpZiAobHN0KSB7XHJcblx0XHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBsc3QubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0XHRcdGlmICghbHN0W2ldIHx8IGxzdFtpXSA9PSB0aGlzKSBjb250aW51ZTtcclxuXHRcdFx0XHRcdC8vIGNvbnNvbGUubG9nKFwibGVmdC10aWxlXCIsIGRpciwgc3JjWCwgc3JjWSk7XHJcblx0XHRcdFx0XHRsc3RbaV0uZW1pdChcImxlZnQtdGlsZVwiLCBkaXIpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblx0XHR0aGlzLmdjLmNvbGxlY3RMaXN0ZW5lcihldnQsIFwibW92ZWRcIiwgX21vdmVkKTtcclxuXHRcdFxyXG5cdFx0dmFyIGdjID0gKGV2dCA9PSBwbGF5ZXIpPyBHQy5nZXRCaW4oKSA6IHRoaXMuZ2M7IC8vZG9uJ3QgcHV0IHRoZSBwbGF5ZXIgaW4gdGhpcyBtYXAncyBiaW5cclxuXHRcdHZhciBhdmF0YXIgPSBldnQuZ2V0QXZhdGFyKHRoaXMsIGdjKTtcclxuXHRcdGlmIChhdmF0YXIpIHtcclxuXHRcdFx0dmFyIGxvYyA9IGV2dC5sb2NhdGlvbjtcclxuXHRcdFx0dmFyIGxvYzMgPSB0aGlzLmdldDNEVGlsZUxvY2F0aW9uKGxvYy54LCBsb2MueSwgbG9jLnopO1xyXG5cdFx0XHRhdmF0YXIucG9zaXRpb24uc2V0KGxvYzMpO1xyXG5cdFx0XHRhdmF0YXIudXBkYXRlTWF0cml4KCk7XHJcblx0XHRcdFxyXG5cdFx0XHR0aGlzLnNwcml0ZU5vZGUuYWRkKGF2YXRhcik7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdGV2dC5lbWl0KFwiY3JlYXRlZFwiKTtcclxuXHR9LFxyXG5cdFxyXG5cdGxvYWRTcHJpdGUgOiBmdW5jdGlvbihldnRpZCwgZmlsZW5hbWUsIGNhbGxiYWNrKSB7XHJcblx0XHR2YXIgc2VsZiA9IHRoaXM7XHJcblx0XHR0aGlzLm1hcmtMb2FkaW5nKFwiU1BSSVRFX1wiK2V2dGlkKTtcclxuXHRcdHRyeSB7XHJcblx0XHRcdHZhciBkaXIgPSB0aGlzLmZpbGVTeXMucm9vdC5nZXRDaGlsZEJ5TmFtZShldnRpZCk7XHJcblx0XHRcdGlmICghZGlyKSB7XHJcblx0XHRcdFx0Y2FsbGJhY2soKFwiTm8gc3ViZm9sZGVyIGZvciBldmVudCBpZCAnXCIrZXZ0aWQrXCInIVwiKSk7XHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHR2YXIgZmlsZSA9IGRpci5nZXRDaGlsZEJ5TmFtZShmaWxlbmFtZSk7XHJcblx0XHRcdGlmICghZmlsZSkge1xyXG5cdFx0XHRcdGNhbGxiYWNrKChcIk5vIGFzc2V0IHdpdGggbmFtZSAnXCIrZmlsZW5hbWUrXCInIGZvciBldmVudCBpZCAnXCIrZXZ0aWQrXCInIVwiKSk7XHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHRmaWxlLmdldEJsb2IoXCJpbWFnZS9wbmdcIiwgZnVuY3Rpb24oZGF0YSl7XHJcblx0XHRcdFx0dmFyIHVybCA9IFVSTC5jcmVhdGVPYmplY3RVUkwoZGF0YSk7XHJcblx0XHRcdFx0c2VsZi5nYy5jb2xsZWN0VVJMKHVybCk7XHJcblx0XHRcdFx0Y2FsbGJhY2sobnVsbCwgdXJsKTtcclxuXHRcdFx0XHRzZWxmLm1hcmtMb2FkRmluaXNoZWQoXCJTUFJJVEVfXCIrZXZ0aWQpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH0gY2F0Y2ggKGUpIHtcclxuXHRcdFx0Y2FsbGJhY2soZSk7XHJcblx0XHR9XHJcblx0fSxcclxuXHRcclxuXHRfaW5pdFBsYXllckNoYXJhY3RlciA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0aWYgKCF3aW5kb3cucGxheWVyKSB7XHJcblx0XHRcdHdpbmRvdy5wbGF5ZXIgPSBuZXcgUGxheWVyQ2hhcigpO1xyXG5cdFx0fVxyXG5cdFx0dmFyIHdhcnAgPSBnYW1lU3RhdGUubWFwVHJhbnNpdGlvbi53YXJwIHx8IDA7XHJcblx0XHR3YXJwID0gdGhpcy5tZXRhZGF0YS53YXJwc1t3YXJwXTtcclxuXHRcdGlmICghd2FycCkge1xyXG5cdFx0XHRjb25zb2xlLndhcm4oXCJSZXF1ZXN0ZWQgd2FycCBsb2NhdGlvbiBkb2Vzbid0IGV4aXN0OlwiLCB3aW5kb3cudHJhbnNpdGlvbl93YXJwdG8pO1xyXG5cdFx0XHR3YXJwID0gdGhpcy5tZXRhZGF0YS53YXJwc1swXTtcclxuXHRcdH1cclxuXHRcdGlmICghd2FycCkgdGhyb3cgbmV3IEVycm9yKFwiVGhpcyBtYXAgaGFzIG5vIHdhcnBzISFcIik7XHJcblx0XHRcclxuXHRcdHBsYXllci5yZXNldCgpO1xyXG5cdFx0cGxheWVyLndhcnBUbyh3YXJwKTtcclxuXHRcdFxyXG5cdFx0dGhpcy5hZGRFdmVudChwbGF5ZXIpO1xyXG5cdFx0XHJcblx0fSxcclxuXHRcclxuXHRkaXNwYXRjaCA6IGZ1bmN0aW9uKHgsIHkpIHtcclxuXHRcdHZhciBldnRzID0gdGhpcy5ldmVudE1hcC5nZXQoeCwgeSk7XHJcblx0XHRpZiAoIWV2dHMpIHJldHVybjtcclxuXHRcdFxyXG5cdFx0dmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDIpO1xyXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBldnRzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdGV2dHNbaV0uZW1pdC5hcHBseShldnRzW2ldLCBhcmdzKTtcclxuXHRcdH1cclxuXHR9LFxyXG5cdFxyXG5cdFxyXG5cdC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cdC8vXHJcblx0Ly8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblx0X21hcFJ1blN0YXRlIDogbnVsbCxcclxuXHRcclxuXHRfaW5pdE1hcFJ1blN0YXRlIDogZnVuY3Rpb24oKSB7XHJcblx0XHRpZiAoIXRoaXMuX21hcFJ1blN0YXRlKSB7XHJcblx0XHRcdHRoaXMuX21hcFJ1blN0YXRlID0ge1xyXG5cdFx0XHRcdGxvYWRUb3RhbCA6IDAsXHJcblx0XHRcdFx0bG9hZFByb2dyZXNzIDogMCxcclxuXHRcdFx0XHRsb2FkaW5nQXNzZXRzIDoge30sXHJcblx0XHRcdFx0XHJcblx0XHRcdFx0dHlwZXNMb2FkaW5nOiB7fSxcclxuXHRcdFx0XHR0eXBlc0xvYWRlZDoge30sXHJcblx0XHRcdFx0dHlwZXNGaW5hbGl6ZWQ6IHt9LFxyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdGlzU3RhcnRlZCA6IGZhbHNlLFxyXG5cdFx0XHRcdHN0YXJ0UXVldWUgOiBbXSxcclxuXHRcdFx0XHRcclxuXHRcdFx0XHRlbmRRdWV1ZSA6IFtdLFxyXG5cdFx0XHR9O1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIHRoaXMuX21hcFJ1blN0YXRlO1xyXG5cdH0sXHJcblx0XHJcblx0bWFya0xvYWRpbmcgOiBmdW5jdGlvbihhc3NldElkLCBhc3NldFR5cGUpIHtcclxuXHRcdHZhciBzdGF0ZSA9IHRoaXMuX2luaXRNYXBSdW5TdGF0ZSgpO1xyXG5cdFx0c3RhdGUubG9hZFRvdGFsKys7XHJcblx0XHRpZiAoYXNzZXRJZCkge1xyXG5cdFx0XHRpZiAoIXN0YXRlLmxvYWRpbmdBc3NldHNbYXNzZXRJZF0pXHJcblx0XHRcdFx0c3RhdGUubG9hZGluZ0Fzc2V0c1thc3NldElkXSA9IDA7XHJcblx0XHRcdHN0YXRlLmxvYWRpbmdBc3NldHNbYXNzZXRJZF0rKztcclxuXHRcdH1cclxuXHRcdGlmIChhc3NldFR5cGUpIHtcclxuXHRcdFx0aWYgKCFzdGF0ZS50eXBlc0xvYWRpbmdbYXNzZXRUeXBlXSlcclxuXHRcdFx0XHRzdGF0ZS50eXBlc0xvYWRpbmdbYXNzZXRUeXBlXSA9IDA7XHJcblx0XHRcdHN0YXRlLnR5cGVzTG9hZGluZ1thc3NldFR5cGVdKys7XHJcblx0XHR9XHJcblx0fSxcclxuXHRtYXJrTG9hZEZpbmlzaGVkIDogZnVuY3Rpb24oYXNzZXRJZCwgYXNzZXRUeXBlKSB7XHJcblx0XHR2YXIgc3RhdGUgPSB0aGlzLl9pbml0TWFwUnVuU3RhdGUoKTtcclxuXHRcdHN0YXRlLmxvYWRQcm9ncmVzcysrO1xyXG5cdFx0aWYgKGFzc2V0SWQpIHtcclxuXHRcdFx0aWYgKCFzdGF0ZS5sb2FkaW5nQXNzZXRzW2Fzc2V0SWRdKVxyXG5cdFx0XHRcdHN0YXRlLmxvYWRpbmdBc3NldHNbYXNzZXRJZF0gPSAwO1xyXG5cdFx0XHRzdGF0ZS5sb2FkaW5nQXNzZXRzW2Fzc2V0SWRdLS07XHJcblx0XHR9XHJcblx0XHRpZiAoYXNzZXRUeXBlKSB7XHJcblx0XHRcdGlmICghc3RhdGUudHlwZXNMb2FkZWRbYXNzZXRUeXBlXSlcclxuXHRcdFx0XHRzdGF0ZS50eXBlc0xvYWRlZFthc3NldFR5cGVdID0gMDtcclxuXHRcdFx0c3RhdGUudHlwZXNMb2FkZWRbYXNzZXRUeXBlXSsrO1xyXG5cdFx0XHRcclxuXHRcdFx0aWYgKHN0YXRlLnR5cGVzTG9hZGluZ1thc3NldFR5cGVdID09IHN0YXRlLnR5cGVzTG9hZGVkW2Fzc2V0VHlwZV1cclxuXHRcdFx0XHQmJiBzdGF0ZS50eXBlc0ZpbmFsaXplZFthc3NldFR5cGVdKSBcclxuXHRcdFx0e1xyXG5cdFx0XHRcdHN0YXRlLnR5cGVzRmluYWxpemVkW2Fzc2V0VHlwZV0oKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHQvL1RPRE8gYmVnaW4gbWFwIHN0YXJ0XHJcblx0XHRpZiAoc3RhdGUubG9hZFByb2dyZXNzID49IHN0YXRlLmxvYWRUb3RhbCkge1xyXG5cdFx0XHRjb25zb2xlLndhcm4oXCJTVEFSVCBNQVBcIik7XHJcblx0XHRcdHRoaXMuX2V4ZWN1dGVNYXBTdGFydENhbGxiYWNrcygpO1xyXG5cdFx0fVxyXG5cdH0sXHJcblx0c2V0QXNzZXRUeXBlTWF4OiBmdW5jdGlvbihhc3NldFR5cGUsIG51bSkge1xyXG5cdFx0c3RhdGUudHlwZXNMb2FkaW5nW2Fzc2V0VHlwZV0gPSBudW07XHJcblx0fSxcclxuXHRvbkFzc2V0VHlwZUxvYWRlZDogZnVuY3Rpb24oYXNzZXRUeXBlLCBmbikge1xyXG5cdFx0dmFyIHN0YXRlID0gdGhpcy5faW5pdE1hcFJ1blN0YXRlKCk7XHJcblx0XHRpZiAodHlwZW9mIGZuICE9PSBcImZ1bmN0aW9uXCIpXHJcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIm9uQXNzZXRUeXBlTG9hZGVkIG11c3Qgc3VwcGx5IGEgZnVuY3Rpb24hXCIpO1xyXG5cdFx0c3RhdGUudHlwZXNGaW5hbGl6ZWRbYXNzZXRUeXBlXSA9IGZuO1xyXG5cdH0sXHJcblx0XHJcblx0cXVldWVGb3JNYXBTdGFydCA6IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XHJcblx0XHR2YXIgc3RhdGUgPSB0aGlzLl9pbml0TWFwUnVuU3RhdGUoKTtcclxuXHRcdFxyXG5cdFx0aWYgKCFzdGF0ZS5pc1N0YXJ0ZWQpIHtcclxuXHRcdFx0c3RhdGUuc3RhcnRRdWV1ZS5wdXNoKGNhbGxiYWNrKTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdGNhbGxiYWNrKCk7XHJcblx0XHR9XHJcblx0fSxcclxuXHRcclxuXHRfZXhlY3V0ZU1hcFN0YXJ0Q2FsbGJhY2tzIDogZnVuY3Rpb24oKSB7XHJcblx0XHR2YXIgc3RhdGUgPSB0aGlzLl9pbml0TWFwUnVuU3RhdGUoKTtcclxuXHRcdFxyXG5cdFx0dmFyIGNhbGxiYWNrO1xyXG5cdFx0d2hpbGUgKGNhbGxiYWNrID0gc3RhdGUuc3RhcnRRdWV1ZS5zaGlmdCgpKSB7XHJcblx0XHRcdGNhbGxiYWNrKCk7XHJcblx0XHR9XHJcblx0XHRzdGF0ZS5pc1N0YXJ0ZWQgPSB0cnVlO1xyXG5cdFx0dGhpcy5lbWl0KFwibWFwLXN0YXJ0ZWRcIik7XHJcblx0fSxcclxuXHRcclxuXHRfZXhlY3V0ZU1hcEVuZENhbGxiYWNrcyA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0dmFyIHN0YXRlID0gdGhpcy5faW5pdE1hcFJ1blN0YXRlKCk7XHJcblx0XHRcclxuXHRcdHZhciBjYWxsYmFjaztcclxuXHRcdHdoaWxlIChjYWxsYmFjayA9IHN0YXRlLmVuZFF1ZXVlLnNoaWZ0KCkpIHtcclxuXHRcdFx0Y2FsbGJhY2soKTtcclxuXHRcdH1cclxuXHRcdC8vIHN0YXRlLmlzU3RhcnRlZCA9IHRydWU7XHJcblx0fSxcclxuXHRcclxuXHQvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblx0XHJcblx0Y2hhbmdlQ2FtZXJhOiBmdW5jdGlvbihjYW1sYmwpIHtcclxuXHRcdHZhciBjYW0gPSB0aGlzLmNhbWVyYXNbY2FtbGJsXTtcclxuXHRcdGlmICghY2FtKSB7XHJcblx0XHRcdGNvbnNvbGUubG9nKFwiQXR0ZW1wdCB0byBjaGFuZ2UgdG8gY2FtZXJhXCIsIGNhbWxibCwgXCJmYWlsZWQhIE5vIHN1Y2ggY2FtZXJhIVwiKTtcclxuXHRcdH1cclxuXHRcdHRoaXMuY2FtZXJhID0gY2FtO1xyXG5cdH0sXHJcblx0XHJcblx0XHJcblx0Ly8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cdC8vIExvZ2ljIExvb3AgYW5kIE1hcCBCZWhhdmlvcnNcclxuXHRjYW1lcmFMb2dpY3M6IG51bGwsXHJcblx0XHJcblx0bG9naWNMb29wIDogZnVuY3Rpb24oZGVsdGEpe1xyXG5cdFx0aWYgKHRoaXMuZXZlbnRMaXN0KSB7XHJcblx0XHRcdGZvciAodmFyIG5hbWUgaW4gdGhpcy5ldmVudExpc3QpIHtcclxuXHRcdFx0XHR2YXIgZXZ0ID0gdGhpcy5ldmVudExpc3RbbmFtZV07XHJcblx0XHRcdFx0aWYgKCFldnQpIGNvbnRpbnVlO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdGV2dC5lbWl0KFwidGlja1wiLCBkZWx0YSk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0aWYgKHRoaXMuY2FtZXJhTG9naWNzKSB7XHJcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5jYW1lcmFMb2dpY3MubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0XHR0aGlzLmNhbWVyYUxvZ2ljc1tpXS5jYWxsKHRoaXMsIGRlbHRhKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH0sXHJcbn0pO1xyXG5tb2R1bGUuZXhwb3J0cyA9IE1hcDtcclxuXHJcblxyXG5mdW5jdGlvbiBfX3Rlc3RfX291dHB1dFRyZWUob2JqLCBpbmRlbnQpIHtcclxuXHRpbmRlbnQgPSAoaW5kZW50ID09PSB1bmRlZmluZWQpPyAwIDogaW5kZW50O1xyXG5cdFxyXG5cdHZhciBvdXQgPSBcIltcIitvYmoudHlwZStcIjogXCI7XHJcblx0b3V0ICs9ICgoIW9iai5uYW1lKT9cIjxVbm5hbWVkPlwiOm9iai5uYW1lKTtcclxuXHRvdXQgKz0gXCIgXVwiO1xyXG5cdFxyXG5cdHN3aXRjaCAob2JqLnR5cGUpIHtcclxuXHRcdGNhc2UgXCJNZXNoXCI6XHJcblx0XHRcdG91dCArPSBcIiAodmVydHM9XCIrb2JqLmdlb21ldHJ5LnZlcnRpY2VzLmxlbmd0aDtcclxuXHRcdFx0b3V0ICs9IFwiIGZhY2VzPVwiK29iai5nZW9tZXRyeS5mYWNlcy5sZW5ndGg7XHJcblx0XHRcdG91dCArPSBcIiBtYXQ9XCIrb2JqLm1hdGVyaWFsLm5hbWU7XHJcblx0XHRcdG91dCArPSBcIilcIjtcclxuXHRcdFx0YnJlYWs7XHJcblx0fVxyXG5cdFxyXG5cdGZvciAodmFyIGkgPSAwOyBpIDwgaW5kZW50OyBpKyspIHtcclxuXHRcdG91dCA9IFwifCBcIiArIG91dDtcclxuXHR9XHJcblx0Y29uc29sZS5sb2cob3V0KTtcclxuXHRcclxuXHRmb3IgKHZhciBpID0gMDsgaSA8IG9iai5jaGlsZHJlbi5sZW5ndGg7IGkrKykge1xyXG5cdFx0X190ZXN0X19vdXRwdXRUcmVlKG9iai5jaGlsZHJlbltpXSwgaW5kZW50KzEpO1xyXG5cdH1cclxufVxyXG5cclxuXHJcbiIsIi8vIGR1bmdlb24tbWFwLmpzXHJcbi8vIERlZmluaXRpb24gb2YgdGhlIERvcml0byBEdW5nZW9uXHJcblxyXG4vLyAmIzk2NjA7ICYjOTY2ODsgJiM5NjUwOyAmIzk2NTg7ICYjOTY2MDsgJiM5NjY4OyAmIzk2NTA7ICYjOTY1ODsgJiM5NjYwOyAmIzk2Njg7ICYjOTY1MDsgJiM5NjU4OyAmIzk2NjA7ICYjOTY2ODsgJiM5NjUwOyAmIzk2NTg7ICYjOTY2MDsgJiM5NjY4OyAmIzk2NTA7ICYjOTY2MDsgJiM5NjY4OyAmIzk2NTA7ICYjOTY1ODsgJiM5NjYwOyAmIzk2Njg7ICYjOTY1MDsgJiM5NjU4OyAmIzk2NjA7ICYjOTY2ODsgJiM5NjYwOyAmIzk2Njg7ICYjOTY1MDsgJiM5NjU4OyAmIzk2NjA7ICYjOTY2ODsgJiM5NjUwO1xyXG4vLyDilrwg4peEIOKWsiDilrog4pa8IOKXhCDilrIg4pa6IOKWvCDil4Qg4payIOKWuiDilrwg4peEIOKWsiDilrog4pa8IOKXhCDilrIg4pa8IOKXhCDilrIg4pa6IOKWvCDil4Qg4payIOKWuiDilrwg4peEIOKWvCDil4Qg4payIOKWuiDilrwg4peEIOKWslxyXG5cclxudmFyIGluaGVyaXRzID0gcmVxdWlyZShcImluaGVyaXRzXCIpO1xyXG52YXIgZXh0ZW5kID0gcmVxdWlyZShcImV4dGVuZFwiKTtcclxuXHJcbnZhciBNYXAgPSByZXF1aXJlKFwiLi4vbWFwLmpzXCIpO1xyXG52YXIgUGxheWVyQ2hhciA9IHJlcXVpcmUoXCJ0cHAtcGNcIik7XHJcbnZhciBzZXR1cE1hcFJpZ2dpbmcgPSByZXF1aXJlKFwiLi9tYXAtc2V0dXBcIik7XHJcblxyXG5cclxuZnVuY3Rpb24gRG9yaXRvRHVuZ2VvbigpIHtcclxuXHRNYXAuY2FsbCh0aGlzLCBcInhEdW5nZW9uXCIpO1xyXG59XHJcbmluaGVyaXRzKERvcml0b0R1bmdlb24sIE1hcCk7XHJcbmV4dGVuZChEb3JpdG9EdW5nZW9uLnByb3RvdHlwZSwge1xyXG5cdC8vIE92ZXJyaWRlIHRvIGRvIG5vdGhpbmdcclxuXHRkb3dubG9hZDogZnVuY3Rpb24oKSB7fSwgXHJcblx0XHJcblx0Ly8gTG9hZCBtb2RlbCBpbnRvIHRoZSBtYXBtb2RlbCBwcm9wZXJ0eVxyXG5cdGxvYWQ6IGZ1bmN0aW9uKCkge1xyXG5cdFx0dGhpcy5tYXJrTG9hZGluZyhcIk1BUF9tYXBkYXRhXCIpO1xyXG5cdFx0XHJcblx0XHR0aGlzLm1ldGFkYXRhID0ge1xyXG5cdFx0XHRhcmVhbmFtZSA6IFwiVGhlIERvcml0byBEdW5nZW9uXCIsXHJcblx0XHRcdHdpZHRoOiA1MCxcclxuXHRcdFx0aGVpZ2h0OiA1MCxcclxuXHRcdFx0XHJcblx0XHRcdFwibGF5ZXJzXCIgOiBbXHJcblx0XHRcdFx0e1wibGF5ZXJcIjogMSwgXCIzZFwiOiBbMSwgMCwgMCwgLTI1LjUsICAgMCwgMSwgMCwgMCwgICAwLCAwLCAxLCAtMjUuNSwgICAwLCAwLCAwLCAxXSwgXCIyZFwiOiBbNSwgMTBdIH0sXHJcblx0XHRcdF0sXHJcblx0XHRcdFwid2FycHNcIiA6IFtcclxuXHRcdFx0XHR7IFwibG9jXCIgOiBbMjUsIDI1XSwgXCJhbmltXCIgOiAwIH0sXHJcblx0XHRcdF0sXHJcblx0XHRcdFxyXG5cdFx0XHRcImNhbWVyYXNcIjoge1xyXG5cdFx0XHRcdDA6IHsgZmFyOiAzMDAsIH0sXHJcblx0XHRcdH1cclxuXHRcdFx0Ly8gY2xlYXJDb2xvcjogMHgwMDAwMDAsXHJcblx0XHR9O1xyXG5cdFx0XHJcblx0XHR0aGlzLnRpbGVkYXRhID0ge1xyXG5cdFx0XHRnZXQ6IGZ1bmN0aW9uKCl7IHJldHVybiAwOyB9LFxyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHR2YXIgZG9yaXRvZGVmcyA9IFtcclxuXHRcdFx0WzUsIDBdLCBbNSwgMV0sIFs1LCAyXSwgWzUsIDNdLFxyXG5cdFx0XHRbNiwgMF0sIFs2LCAxXSwgWzYsIDJdLCBbNiwgM10sXHJcblx0XHRcdFs3LCAwXSwgWzcsIDFdLCBbNywgMl0sIFs3LCAzXSxcclxuXHRcdF07XHJcblx0XHRcclxuXHRcdHZhciBtb2RlbCA9IG5ldyBUSFJFRS5PYmplY3QzRCgpO1xyXG5cdFx0eyAvLyBEb3JpdG8gQkdcclxuXHRcdFx0dmFyIG9mZnNldHMgPSBbXTtcclxuXHRcdFx0dmFyIGdlb20gPSBuZXcgVEhSRUUuR2VvbWV0cnkoKTtcclxuXHRcdFx0dGhpcy5nYy5jb2xsZWN0KGdlb20pO1xyXG5cdFx0XHRmb3IgKHZhciBrID0gMDsgayA8IDUwICogZG9yaXRvZGVmcy5sZW5ndGg7IGsgKysgKSB7XHJcblx0XHRcdFx0dmFyIHZlcnRleCA9IG5ldyBUSFJFRS5WZWN0b3IzKCk7XHJcblx0XHRcdFx0dmVydGV4LnggPSBNYXRoLnJhbmRvbSgpICogMjAwIC0gMTAwO1xyXG5cdFx0XHRcdHZlcnRleC55ID0gTWF0aC5yYW5kb20oKSAqIC01MCAtIDE7XHJcblx0XHRcdFx0dmVydGV4LnogPSBNYXRoLnJhbmRvbSgpICogMjAwIC0gMTgwO1xyXG5cclxuXHRcdFx0XHRnZW9tLnZlcnRpY2VzLnB1c2goIHZlcnRleCApO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdHZhciBkaSA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGRvcml0b2RlZnMubGVuZ3RoKTtcclxuXHRcdFx0XHRvZmZzZXRzLnB1c2gobmV3IFRIUkVFLlZlY3RvcjIoXHJcblx0XHRcdFx0XHQoZG9yaXRvZGVmc1tkaV1bMF0gKiAxNikgLyAxMjgsIFxyXG5cdFx0XHRcdFx0KGRvcml0b2RlZnNbZGldWzFdICogMTYpIC8gNjQpKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0dmFyIHRleCA9IG5ldyBUSFJFRS5UZXh0dXJlKEFKQVhfVEVYVFVSRV9JTUcpO1xyXG5cdFx0XHR0ZXgubWFnRmlsdGVyID0gVEhSRUUuTmVhcmVzdEZpbHRlcjtcclxuXHRcdFx0dGV4Lm1pbkZpbHRlciA9IFRIUkVFLk5lYXJlc3RGaWx0ZXI7XHJcblx0XHRcdHRleC53cmFwUyA9IFRIUkVFLlJlcGVhdFdyYXBwaW5nO1xyXG5cdFx0XHR0ZXgud3JhcFQgPSBUSFJFRS5SZXBlYXRXcmFwcGluZztcclxuXHRcdFx0dGV4LnJlcGVhdCA9IG5ldyBUSFJFRS5WZWN0b3IyKDE2LzEyOCwgMTYvNjQpO1xyXG5cdFx0XHQvLyB0ZXgub2Zmc2V0ID0gbmV3IFRIUkVFLlZlY3RvcjIoXHJcblx0XHRcdC8vIFx0KGRvcml0b2RlZnNbaV1bMF0gKiAxNikgLyAxMjgsXHJcblx0XHRcdC8vIFx0KGRvcml0b2RlZnNbaV1bMV0gKiAxNikgLyA2NCk7XHJcblx0XHRcdHRleC5nZW5lcmF0ZU1pcG1hcHMgPSBmYWxzZTtcclxuXHRcdFx0dGV4Lm5lZWRzVXBkYXRlID0gdHJ1ZTtcclxuXHRcdFx0XHJcblx0XHRcdC8vIHZhciBtYXQgPSBuZXcgVEhSRUUuUG9pbnRDbG91ZE1hdGVyaWFsKHtcclxuXHRcdFx0Ly8gXHRzaXplOiBNYXRoLnJhbmRvbSgpKjIrMSwgdHJhbnNwYXJlbnQ6IHRydWUsXHJcblx0XHRcdC8vIFx0bWFwOiB0ZXgsXHJcblx0XHRcdC8vIH0pO1xyXG5cdFx0XHRcclxuXHRcdFx0dmFyIG1hdCA9IG5ldyBEb3JpdG9DbG91ZE1hdGVyaWFsKHtcclxuXHRcdFx0XHRtYXA6IHRleCwgc2l6ZTogMTAsIHNjYWxlOiAxMDAsXHJcblx0XHRcdFx0b2Zmc2V0czogb2Zmc2V0cyxcclxuXHRcdFx0fSk7XHJcblx0XHRcdFxyXG5cdFx0XHR2YXIgY2xvdWQgPSBuZXcgVEhSRUUuUG9pbnRDbG91ZChnZW9tLCBtYXQpO1xyXG5cdFx0XHRjbG91ZC5zb3J0UGFydGljbGVzID0gdHJ1ZVxyXG5cdFx0XHRtb2RlbC5hZGQoY2xvdWQpO1xyXG5cdFx0fXtcclxuXHRcdFx0dmFyIGhlaWdodCA9IDYwO1xyXG5cdFx0XHRcclxuXHRcdFx0dmFyIGdlb20gPSBuZXcgVEhSRUUuQ3lsaW5kZXJHZW9tZXRyeSg0MDAsIDUwLCBoZWlnaHQpO1xyXG5cdFx0XHQvLyBmb3IgKHZhciBpID0gMDsgaSA8IGdlb20udmVydGljZXMubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0Ly8gXHR2YXIgYyA9IChnZW9tLnZlcnRpY2VzW2ldLnkgKyAoaGVpZ2h0LzIpKSAvIGhlaWdodDtcclxuXHRcdFx0Ly8gXHRnZW9tLmNvbG9ycy5wdXNoKG5ldyBUSFJFRS5Db2xvciggYywgYyAqIDAuNSwgMCApKTtcclxuXHRcdFx0Ly8gfVxyXG5cdFx0XHR2YXIgZmFjZWlkeCA9IFsnYScsICdiJywgJ2MnXTtcclxuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBnZW9tLmZhY2VzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdFx0dmFyIGZhY2UgPSBnZW9tLmZhY2VzW2ldO1xyXG5cdFx0XHRcdGZvciAodmFyIGogPSAwOyBqIDwgZmFjZWlkeC5sZW5ndGg7IGorKykge1xyXG5cdFx0XHRcdFx0dmFyIHZlcnQgPSBnZW9tLnZlcnRpY2VzWyBmYWNlW2ZhY2VpZHhbal1dIF07XHJcblx0XHRcdFx0XHRcclxuXHRcdFx0XHRcdHZhciBjID0gKHZlcnQueSArIChoZWlnaHQvMikpIC8gaGVpZ2h0O1xyXG5cdFx0XHRcdFx0ZmFjZS52ZXJ0ZXhDb2xvcnNbal0gPSBuZXcgVEhSRUUuQ29sb3IoYywgYyAqIDAuNSwgMCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHRjb25zb2xlLmxvZyhnZW9tLmNvbG9ycyk7XHJcblx0XHRcdGdlb20uY29sb3JzTmVlZFVwZGF0ZSA9IHRydWU7XHJcblx0XHRcdFxyXG5cdFx0XHR2YXIgbWF0ID0gbmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHtcclxuXHRcdFx0XHRzaWRlOiBUSFJFRS5CYWNrU2lkZSxcclxuXHRcdFx0XHR2ZXJ0ZXhDb2xvcnM6IFRIUkVFLlZlcnRleENvbG9ycyxcclxuXHRcdFx0XHRkZXB0aFdyaXRlOiBmYWxzZSxcclxuXHRcdFx0fSk7XHJcblx0XHRcdFxyXG5cdFx0XHR2YXIgYmcgPSBuZXcgVEhSRUUuTWVzaChnZW9tLCBtYXQpO1xyXG5cdFx0XHRiZy5yZW5kZXJEZXB0aCA9IDEwO1xyXG5cdFx0XHRiZy5wb3NpdGlvbi55ID0gLTUwO1xyXG5cdFx0XHRtb2RlbC5hZGQoYmcpO1xyXG5cdFx0fVxyXG5cdFx0dGhpcy5tYXBtb2RlbCA9IG1vZGVsO1xyXG5cdFx0XHJcblx0XHR0aGlzLl9pbml0KCk7XHJcblx0XHR0aGlzLm1hcmtMb2FkRmluaXNoZWQoXCJNQVBfbWFwZGF0YVwiKTtcclxuXHR9LFxyXG5cdFxyXG5cdF9pbml0IDogZnVuY3Rpb24oKXtcclxuXHRcdHZhciBzZWxmID0gdGhpcztcclxuXHRcdHRoaXMuc2NlbmUgPSBuZXcgVEhSRUUuU2NlbmUoKTtcclxuXHRcdHRoaXMuY2FtZXJhcyA9IHt9O1xyXG5cdFx0XHJcblx0XHRpZiAoIXdpbmRvdy5wbGF5ZXIpIHtcclxuXHRcdFx0d2luZG93LnBsYXllciA9IG5ldyBQbGF5ZXJDaGFyKCk7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdHRoaXMuc2NlbmUuYWRkKHRoaXMubWFwbW9kZWwpO1xyXG5cdFx0XHJcblx0XHR0aGlzLmNhbWVyYUxvZ2ljcyA9IFtdO1xyXG5cdFx0c2V0dXBNYXBSaWdnaW5nKHRoaXMpO1xyXG5cdFx0Ly9OT1RFOiBObyBsaWdodHNcclxuXHRcdFxyXG5cdFx0Ly8gdGhpcy5zY2VuZS5hZGQoXHJcblx0XHQvLyBcdC8vIG1TZXR1cC5jYW1lcmEuZ2VuNC5jYWxsKHRoaXMsIHtcclxuXHRcdC8vIFx0Ly8gXHRcInR5cGVcIiA6IFwiZ2VuNFwiLFxyXG5cdFx0XHRcdFxyXG5cdFx0Ly8gXHQvLyB9KVxyXG5cdFx0Ly8gKTtcclxuXHRcdFxyXG5cdFx0dGhpcy5xdWV1ZUZvck1hcFN0YXJ0KGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRTb3VuZE1hbmFnZXIucGxheU11c2ljKFwibV90b3Jud29ybGRcIik7XHJcblx0XHRcdFVJLnNrcmltLl9uZXh0T3B0cyA9IHtcclxuXHRcdFx0XHRzcGVlZCA6IDAuMiwgLy9UaGlzIHdpbGwgb3ZlcnJpZGUgdGhlIHNwZWVkIG9mIHRoZSBmYWRlaW4gZG9uZSBieSB0aGUgbWFwIG1hbmFnZXIuXHJcblx0XHRcdH07IFxyXG5cdFx0XHQvLyBVSS5mYWRlT3V0KDAuMik7XHJcblx0XHR9KTtcclxuXHRcdFxyXG5cdFx0dGhyZWVSZW5kZXJlci5zZXRDbGVhckNvbG9ySGV4KCAweDAwMDAwMCApO1xyXG5cdFx0XHJcblx0XHQvLyBNYXAgTW9kZWwgaXMgbm93IHJlYWR5XHJcblx0XHRcclxuXHRcdHRoaXMuX2luaXRFdmVudE1hcCgpO1xyXG5cdFx0XHJcblx0XHR0aGlzLmVtaXQoXCJtYXAtcmVhZHlcIik7XHJcblx0XHRcclxuXHR9LFxyXG5cdFxyXG5cdF9fbG9hZFNjcmlwdCA6IGZ1bmN0aW9uKHQpIHtcclxuXHRcdGlmICh0ICE9IFwibFwiKSByZXR1cm47IC8vTG9jYWwgb25seVxyXG5cdFx0XHJcblx0XHQvLyBBZGQgbG9jYWwgZXZlbnRzXHJcblx0XHQvL1RPRE8gQWRkIEdtYW5uIGhlcmUgdG8gdGFrZSB5b3UgYmFjayB0byB0aGUgbWFpbiB3b3JsZFxyXG5cdH0sXHJcblx0XHJcblx0Y2FuV2Fsa0JldHdlZW4gOiBmdW5jdGlvbihzcmN4LCBzcmN5LCBkZXN0eCwgZGVzdHksIGlnbm9yZUV2ZW50cykge1xyXG5cdFx0aWYgKE1hdGguYWJzKHNyY3ggLSBkZXN0eCkgKyBNYXRoLmFicyhzcmN5IC0gZGVzdHkpICE9IDEpIHJldHVybiBmYWxzZTtcclxuXHRcdFxyXG5cdFx0aWYgKGRlc3R4IDwgMCB8fCBkZXN0eCA+PSB0aGlzLm1ldGFkYXRhLndpZHRoKSByZXR1cm4gZmFsc2U7XHJcblx0XHRpZiAoZGVzdHkgPCAwIHx8IGRlc3R5ID49IHRoaXMubWV0YWRhdGEuaGVpZ2h0KSByZXR1cm4gZmFsc2U7XHJcblx0XHRcclxuXHRcdGlmICghaWdub3JlRXZlbnRzKSB7IC8vY2hlY2sgZm9yIHRoZSBwcmVzZW5zZSBvZiBldmVudHNcclxuXHRcdFx0dmFyIGV2dHMgPSB0aGlzLmV2ZW50TWFwLmdldChkZXN0eCwgZGVzdHkpO1xyXG5cdFx0XHRpZiAoZXZ0cykge1xyXG5cdFx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgZXZ0cy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRcdFx0aWYgKCFldnRzW2ldLmNhbldhbGtPbigpKSByZXR1cm4gZmFsc2U7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdHJldHVybiB0cnVlO1xyXG5cdH0sXHJcbn0pO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBEb3JpdG9EdW5nZW9uO1xyXG5cclxuXHJcbmZ1bmN0aW9uIERvcml0b0Nsb3VkTWF0ZXJpYWwodGV4dHVyZSwgb3B0cykge1xyXG5cdGlmICgkLmlzUGxhaW5PYmplY3QodGV4dHVyZSkgJiYgb3B0cyA9PT0gdW5kZWZpbmVkKSB7XHJcblx0XHRvcHRzID0gdGV4dHVyZTsgdGV4dHVyZSA9IG51bGw7XHJcblx0fVxyXG5cdFxyXG5cdHRoaXMubWFwID0gdGV4dHVyZSB8fCBvcHRzLnRleHR1cmUgfHwgb3B0cy5tYXAgfHwgbmV3IFRIUkVFLlRleHR1cmUoKTtcclxuXHR0aGlzLm9mZnNldHMgPSBvcHRzLm9mZnNldHMgfHwgW107XHJcblx0dGhpcy5yZXBlYXQgPSBvcHRzLnJlcGVhdCB8fCB0aGlzLm1hcC5yZXBlYXQ7XHJcblx0XHJcblx0dGhpcy5zaXplID0gb3B0cy5zaXplIHx8IDE7XHJcblx0dGhpcy5zY2FsZSA9IG9wdHMuc2NhbGUgfHwgMTtcclxuXHRcclxuXHR2YXIgcGFyYW1zID0gdGhpcy5fY3JlYXRlTWF0UGFyYW1zKG9wdHMpO1xyXG5cdFRIUkVFLlNoYWRlck1hdGVyaWFsLmNhbGwodGhpcywgcGFyYW1zKTtcclxuXHR0aGlzLnR5cGUgPSBcIkRvcml0b0Nsb3VkTWF0ZXJpYWxcIjtcclxuXHRcclxuXHR0aGlzLnRyYW5zcGFyZW50ID0gKG9wdHMudHJhbnNwYXJlbnQgIT09IHVuZGVmaW5lZCk/IG9wdHMudHJhbnNwYXJlbnQgOiB0cnVlO1xyXG5cdHRoaXMuYWxwaGFUZXN0ID0gMC4wNTtcclxufVxyXG5pbmhlcml0cyhEb3JpdG9DbG91ZE1hdGVyaWFsLCBUSFJFRS5TaGFkZXJNYXRlcmlhbCk7XHJcbmV4dGVuZChEb3JpdG9DbG91ZE1hdGVyaWFsLnByb3RvdHlwZSwge1xyXG5cdG1hcCA6IG51bGwsXHJcblx0XHJcblx0X2NyZWF0ZU1hdFBhcmFtcyA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0dmFyIHBhcmFtcyA9IHtcclxuXHRcdFx0YXR0cmlidXRlczoge1xyXG5cdFx0XHRcdG9mZnNldDpcdFx0eyB0eXBlOiAndjInLCB2YWx1ZTogdGhpcy5vZmZzZXRzIH0sXHJcblx0XHRcdH0sXHJcblx0XHRcdFxyXG5cdFx0XHR1bmlmb3JtcyA6IHtcclxuXHRcdFx0XHRyZXBlYXQ6ICAgICB7IHR5cGU6ICd2MicsIHZhbHVlOiB0aGlzLnJlcGVhdCB9LFxyXG5cdFx0XHRcdG1hcDpcdFx0eyB0eXBlOiBcInRcIiwgdmFsdWU6IHRoaXMubWFwIH0sXHJcblx0XHRcdFx0XHJcblx0XHRcdFx0c2l6ZTpcdFx0eyB0eXBlOiBcImZcIiwgdmFsdWU6IHRoaXMuc2l6ZSB9LFxyXG5cdFx0XHRcdHNjYWxlOlx0XHR7IHR5cGU6IFwiZlwiLCB2YWx1ZTogdGhpcy5zY2FsZSB9LFxyXG5cdFx0XHR9LFxyXG5cdFx0fTtcclxuXHRcdFxyXG5cdFx0cGFyYW1zLnZlcnRleFNoYWRlciA9IHRoaXMuX3ZlcnRTaGFkZXI7XHJcblx0XHRwYXJhbXMuZnJhZ21lbnRTaGFkZXIgPSB0aGlzLl9mcmFnU2hhZGVyO1xyXG5cdFx0cmV0dXJuIHBhcmFtcztcclxuXHR9LFxyXG5cdFxyXG5cdF92ZXJ0U2hhZGVyOiBbXHJcblx0XHRcInVuaWZvcm0gZmxvYXQgc2l6ZTtcIixcclxuXHRcdFwidW5pZm9ybSBmbG9hdCBzY2FsZTtcIixcclxuXHRcclxuXHRcdFwiYXR0cmlidXRlIHZlYzIgb2Zmc2V0O1wiLFxyXG5cdFx0XHJcblx0XHRcInZhcnlpbmcgdmVjMiB2T2Zmc2V0O1wiLFxyXG5cdFx0XHJcblx0XHRcInZvaWQgbWFpbigpIHtcIixcclxuXHRcdFx0XCJ2T2Zmc2V0ID0gb2Zmc2V0O1wiLFxyXG5cdFx0XHRcInZlYzQgbXZQb3NpdGlvbiA9IG1vZGVsVmlld01hdHJpeCAqIHZlYzQoIHBvc2l0aW9uLCAxLjAgKTtcIixcclxuXHJcblx0XHRcdFwiZ2xfUG9pbnRTaXplID0gc2l6ZSAqICggc2NhbGUgLyBsZW5ndGgoIG12UG9zaXRpb24ueHl6ICkgKTtcIixcclxuXHRcdFx0XCJnbF9Qb3NpdGlvbiA9IHByb2plY3Rpb25NYXRyaXggKiBtdlBvc2l0aW9uO1wiLFxyXG5cdFx0XCJ9XCIsXHJcblx0XS5qb2luKFwiXFxuXCIpLFxyXG5cdFxyXG5cdF9mcmFnU2hhZGVyOiBbXHJcblx0XHRcInVuaWZvcm0gc2FtcGxlcjJEIG1hcDtcIixcclxuXHRcdFwidW5pZm9ybSB2ZWMyIHJlcGVhdDtcIixcclxuXHRcdFxyXG5cdFx0XCJ2YXJ5aW5nIHZlYzIgdk9mZnNldDtcIixcclxuXHRcdFxyXG5cdFx0XCJ2b2lkIG1haW4oKSB7XCIsXHJcblx0XHRcdFwidmVjMiB1diA9IHZlYzIoIGdsX1BvaW50Q29vcmQueCwgMS4wIC0gZ2xfUG9pbnRDb29yZC55ICk7XCIsXHJcblx0XHRcdFwidmVjNCB0ZXggPSB0ZXh0dXJlMkQoIG1hcCwgdXYgKiByZXBlYXQgKyB2T2Zmc2V0ICk7XCIsXHJcblx0XHRcdFxyXG5cdFx0XHQnI2lmZGVmIEFMUEhBVEVTVCcsXHJcblx0XHRcdFx0J2lmICggdGV4LmEgPCBBTFBIQVRFU1QgKSBkaXNjYXJkOycsXHJcblx0XHRcdCcjZW5kaWYnLFxyXG5cdFx0XHRcclxuXHRcdFx0XCJnbF9GcmFnQ29sb3IgPSB0ZXg7XCIsXHJcblx0XHRcIn1cIixcclxuXHRdLmpvaW4oXCJcXG5cIiksXHJcblx0XHJcbn0pOyIsIi8vIG1hcC1zZXR1cC5qc1xyXG4vLyBEZWZpbmVzIHNvbWUgb2YgdGhlIHNldHVwIGZ1bmN0aW9ucyBmb3IgTWFwLmpzIGluIGEgc2VwYXJhdGUgZmlsZSwgZm9yIG9yZ2FuaXphdGlvblxyXG5cclxudmFyIGV4dGVuZCA9IHJlcXVpcmUoXCJleHRlbmRcIik7XHJcblxyXG5mdW5jdGlvbiBzZXR1cE1hcFJpZ2dpbmcobWFwKSB7XHJcblx0e1x0Ly8gU2V0dXAgTGlnaHRpbmcgUmlnZ2luZ1xyXG5cdFx0dmFyIGxpZ2h0ZGVmID0gZXh0ZW5kKHsgXCJ0eXBlXCI6IFwiaW50XCIsIFwiZGVmYXVsdFwiOiB7fSB9LCBtYXAubWV0YWRhdGEubGlnaHRpbmcpO1xyXG5cdFx0XHJcblx0XHR2YXIgcmlnID0gc2V0dXBMaWdodGluZyhtYXAsIGxpZ2h0ZGVmKTtcclxuXHRcdG1hcC5zY2VuZS5hZGQocmlnKTtcclxuXHR9XHJcblx0XHJcblx0e1x0Ly8gU2V0dXAgU2hhZG93IE1hcCBSaWdnaW5nXHJcblx0XHR2YXIgc2hhZG93ZGVmID0gZXh0ZW5kKHt9LCBtYXAubWV0YWRhdGEuc2hhZG93bWFwKTtcclxuXHRcdFxyXG5cdFx0aWYgKCQuaXNQbGFpbk9iamVjdChzaGFkb3dkZWYpKSB7XHJcblx0XHRcdHNoYWRvd2RlZiA9IFtzaGFkb3dkZWZdO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHR2YXIgcmlnID0gc2V0dXBTaGFkb3dNYXBzKG1hcCwgc2hhZG93ZGVmKTtcclxuXHRcdG1hcC5zY2VuZS5hZGQocmlnKTtcclxuXHR9XHJcblx0XHJcblx0e1x0Ly8gU2V0dXAgQ2FtZXJhIFJpZ2dpbmdcclxuXHRcdHZhciBjYW1kZWYgPSBleHRlbmQoeyBcIjBcIjoge30gfSwgbWFwLm1ldGFkYXRhLmNhbWVyYXMpO1xyXG5cdFx0XHJcblx0XHR2YXIgcmlnID0gc2V0dXBDYW1lcmFzKG1hcCwgY2FtZGVmKTtcclxuXHRcdG1hcC5zY2VuZS5hZGQocmlnKTtcclxuXHR9XHJcblx0XHJcbn1cclxubW9kdWxlLmV4cG9ydHMgPSBzZXR1cE1hcFJpZ2dpbmc7XHJcblxyXG5cclxuZnVuY3Rpb24gc2V0dXBMaWdodGluZyhtYXAsIGRlZikge1xyXG5cdHZhciBub2RlID0gbmV3IFRIUkVFLk9iamVjdDNEKCk7XHJcblx0bm9kZS5uYW1lID0gXCJMaWdodGluZyBSaWdcIjtcclxuXHRcclxuXHR2YXIgbGlnaHQ7XHJcblx0dmFyIE9SSUdJTiA9IG5ldyBUSFJFRS5WZWN0b3IzKDAsIDAsIDApO1xyXG5cdFxyXG5cdGlmIChkZWYudHlwZSA9PSBcImludFwiKSB7XHJcblx0XHQvLyBTZXR1cCBkZWZhdWx0IGludGVyaW9yIGxpZ2h0aW5nIHJpZ1xyXG5cdFx0dmFyIGludGVuc2l0eSA9IGRlZltcImRlZmF1bHRcIl0uaW50ZW5zaXR5IHx8IDEuNDtcclxuXHRcdHZhciBza3lDb2xvciA9IGRlZltcImRlZmF1bHRcIl0uc2t5Q29sb3IgfHwgMHhGRkZGRkY7XHJcblx0XHR2YXIgZ3JvdW5kQ29sb3IgPSBkZWZbXCJkZWZhdWx0XCJdLmdyb3VuZENvbG9yIHx8IDB4MTExMTExO1xyXG5cdFx0XHJcblx0XHRsaWdodCA9IG5ldyBUSFJFRS5IZW1pc3BoZXJlTGlnaHQoc2t5Q29sb3IsIGdyb3VuZENvbG9yLCBpbnRlbnNpdHkpO1xyXG5cdFx0XHJcblx0XHR2YXIgY3AgPSBkZWZbXCJkZWZhdWx0XCJdLnBvc2l0aW9uIHx8IFstNCwgNCwgNF07XHJcblx0XHRsaWdodC5wb3NpdGlvbi5zZXQoY3BbMF0sIGNwWzFdLCBjcFsyXSk7XHJcblx0XHRcclxuXHRcdGxpZ2h0Lmxvb2tBdChPUklHSU4pO1xyXG5cdFx0bm9kZS5hZGQobGlnaHQpO1xyXG5cdH1cclxuXHRlbHNlIGlmIChkZWYudHlwZSA9PSBcImV4dFwiKSB7XHJcblx0XHQvLyBTZXR1cCBkZWZhdWx0IGV4dGVyaW9yIGxpZ2h0aW5nIHJpZywgd2l0aCBzdW4gbW92ZW1lbnRcclxuXHRcdHZhciBpbnRlbnNpdHkgPSBkZWZbXCJkZWZhdWx0XCJdLmludGVuc2l0eSB8fCAxLjQ7XHJcblx0XHR2YXIgc2t5Q29sb3IgPSBkZWZbXCJkZWZhdWx0XCJdLnNreUNvbG9yIHx8IDB4RkZGRkZGO1xyXG5cdFx0dmFyIGdyb3VuZENvbG9yID0gZGVmW1wiZGVmYXVsdFwiXS5ncm91bmRDb2xvciB8fCAweDExMTExMTtcclxuXHRcdFxyXG5cdFx0bGlnaHQgPSBuZXcgVEhSRUUuSGVtaXNwaGVyZUxpZ2h0KHNreUNvbG9yLCBncm91bmRDb2xvciwgaW50ZW5zaXR5KTtcclxuXHRcdFxyXG5cdFx0dmFyIGNwID0gZGVmW1wiZGVmYXVsdFwiXS5wb3NpdGlvbiB8fCBbLTQsIDQsIDRdO1xyXG5cdFx0bGlnaHQucG9zaXRpb24uc2V0KGNwWzBdLCBjcFsxXSwgY3BbMl0pO1xyXG5cdFx0XHJcblx0XHRsaWdodC5sb29rQXQoT1JJR0lOKTtcclxuXHRcdG5vZGUuYWRkKGxpZ2h0KTtcclxuXHRcdFxyXG5cdFx0Ly9UT0RPIHNldHVwIHN1biBtb3ZlbWVudFxyXG5cdH1cclxuXHRcclxuXHRyZXR1cm4gbm9kZTtcclxufVxyXG5cclxuXHJcblxyXG5mdW5jdGlvbiBzZXR1cFNoYWRvd01hcHMobWFwLCBzaGFkb3dNYXBzKSB7XHJcblx0dmFyIG5vZGUgPSBuZXcgVEhSRUUuT2JqZWN0M0QoKTtcclxuXHRub2RlLm5hbWUgPSBcIlNoYWRvdyBDYXN0aW5nIFJpZ1wiO1xyXG5cdFxyXG5cdGZvciAodmFyIGkgPSAwOyBpIDwgc2hhZG93TWFwcy5sZW5ndGg7IGkrKykge1xyXG5cdFx0dmFyIHNobSA9IHNoYWRvd01hcHNbaV07XHJcblx0XHRcclxuXHRcdGxpZ2h0ID0gbmV3IFRIUkVFLkRpcmVjdGlvbmFsTGlnaHQoKTtcclxuXHRcdGxpZ2h0LnBvc2l0aW9uLnNldCgwLCA3NSwgMSk7XHJcblx0XHRsaWdodC5jYXN0U2hhZG93ID0gdHJ1ZTtcclxuXHRcdGxpZ2h0Lm9ubHlTaGFkb3cgPSB0cnVlO1xyXG5cdFx0bGlnaHQuc2hhZG93RGFya25lc3MgPSAwLjc7XHJcblx0XHRsaWdodC5zaGFkb3dCaWFzID0gMC4wMDE7XHJcblx0XHRcclxuXHRcdGxpZ2h0LnNoYWRvd0NhbWVyYU5lYXIgPSBzaG0ubmVhciB8fCAxO1xyXG5cdFx0bGlnaHQuc2hhZG93Q2FtZXJhRmFyID0gc2htLmZhciB8fCAyMDA7XHJcblx0XHRsaWdodC5zaGFkb3dDYW1lcmFUb3AgPSBzaG0udG9wIHx8IDMwO1xyXG5cdFx0bGlnaHQuc2hhZG93Q2FtZXJhQm90dG9tID0gc2htLmJvdHRvbSB8fCAtMzA7XHJcblx0XHRsaWdodC5zaGFkb3dDYW1lcmFMZWZ0ID0gc2htLmxlZnQgfHwgLTMwO1xyXG5cdFx0bGlnaHQuc2hhZG93Q2FtZXJhUmlnaHQgPSBzaG0ucmlnaHQgfHwgMzA7XHJcblx0XHRcclxuXHRcdGxpZ2h0LnNoYWRvd01hcFdpZHRoID0gc2htLndpZHRoIHx8IDUxMjtcclxuXHRcdGxpZ2h0LnNoYWRvd01hcEhlaWdodCA9IHNobS5oZWlnaHQgfHwgNTEyO1xyXG5cdFx0XHJcblx0XHQvLyBsaWdodC5zaGFkb3dDYW1lcmFWaXNpYmxlID0gdHJ1ZTtcclxuXHRcdG5vZGUuYWRkKGxpZ2h0KTtcclxuXHRcdFxyXG5cdFx0REVCVUcuX3NoYWRvd0NhbWVyYSA9IGxpZ2h0O1xyXG5cdH0gXHJcblx0XHJcblx0cmV0dXJuIG5vZGU7XHJcbn1cclxuXHJcblxyXG5cclxudmFyIGNhbUJlaGF2aW9ycyA9IHtcclxuXHRub25lOiBmdW5jdGlvbigpe30sXHJcblx0Zm9sbG93UGxheWVyIDogZnVuY3Rpb24oY2RlZiwgY2FtLCBjYW1Sb290KSB7XHJcblx0XHRyZXR1cm4gZnVuY3Rpb24oZGVsdGEpIHtcclxuXHRcdFx0Ly8gaWYgKCFwbGF5ZXIgfHwgIXBsYXllci5hdmF0YXJfbm9kZSkgcmV0dXJuO1xyXG5cdFx0XHRjYW1Sb290LnBvc2l0aW9uLnNldChwbGF5ZXIuYXZhdGFyX25vZGUucG9zaXRpb24pO1xyXG5cdFx0XHQvL1RPRE8gbmVnYXRlIG1vdmluZyB1cCBhbmQgZG93biB3aXRoIGp1bXBpbmdcclxuXHRcdH07XHJcblx0fSxcclxuXHRmb2xsb3dQbGF5ZXJYOiBmdW5jdGlvbihjZGVmLCBjYW1lLCBjYW1Sb290KSB7XHJcblx0XHR2YXIgemF4aXMgPSBjZGVmW1wiemF4aXNcIl0gfHwgMDtcclxuXHRcdHZhciB4bWF4ID0gY2RlZltcInhtYXhcIl0gfHwgMTAwMDtcclxuXHRcdHZhciB4bWluID0gY2RlZltcInhtaW5cIl0gfHwgLTEwMDA7XHJcblx0XHRcclxuXHRcdHJldHVybiBmdW5jdGlvbihkZWx0YSkge1xyXG5cdFx0XHRjYW1Sb290LnBvc2l0aW9uLnggPSBNYXRoLm1heCh4bWluLCBNYXRoLm1pbih4bWF4LCBwbGF5ZXIuYXZhdGFyX25vZGUucG9zaXRpb24ueCkpO1xyXG5cdFx0XHRjYW1Sb290LnBvc2l0aW9uLnkgPSBwbGF5ZXIuYXZhdGFyX25vZGUucG9zaXRpb24ueTtcclxuXHRcdFx0Y2FtUm9vdC5wb3NpdGlvbi56ID0gemF4aXM7XHJcblx0XHR9O1xyXG5cdH0sXHJcblx0Zm9sbG93UGxheWVyWjogZnVuY3Rpb24oY2RlZiwgY2FtZSwgY2FtUm9vdCkge1xyXG5cdFx0dmFyIHhheGlzID0gY2RlZltcInhheGlzXCJdIHx8IDA7XHJcblx0XHR2YXIgem1heCA9IGNkZWZbXCJ6bWF4XCJdIHx8IDEwMDA7XHJcblx0XHR2YXIgem1pbiA9IGNkZWZbXCJ6bWluXCJdIHx8IC0xMDAwO1xyXG5cdFx0XHJcblx0XHRyZXR1cm4gZnVuY3Rpb24oZGVsdGEpIHtcclxuXHRcdFx0Y2FtUm9vdC5wb3NpdGlvbi54ID0geGF4aXM7XHJcblx0XHRcdGNhbVJvb3QucG9zaXRpb24ueSA9IHBsYXllci5hdmF0YXJfbm9kZS5wb3NpdGlvbi55O1xyXG5cdFx0XHRjYW1Sb290LnBvc2l0aW9uLnogPSBNYXRoLm1heCh6bWluLCBNYXRoLm1pbih6bWF4LCBwbGF5ZXIuYXZhdGFyX25vZGUucG9zaXRpb24ueikpO1xyXG5cdFx0fTtcclxuXHR9LFxyXG5cdFxyXG5cdHNvZnRGb2xsb3daOiBmdW5jdGlvbihjZGVmLCBjYW1lLCBjYW1Sb290KSB7XHJcblx0XHR2YXIgeGF4aXMgPSBjZGVmW1wieGF4aXNcIl0gfHwgMDsgLy9heGlzIGFsb25nIHdoaWNoIHRvIGtlZXAgdGhlIGNhbWVyYVxyXG5cdFx0dmFyIGRldiA9IGNkZWZbXCJkZXZcIl0gfHwgNTsgLy9tYXggZGV2aWF0aW9uIG9mIHRoZSBjYW0gcG9zaXRpb24gZnJvbSB0aGlzIGF4aXNcclxuXHRcdHZhciBsb29rcmFuZ2UgPSBjZGVmW1wibG9va3JhbmdlXCJdIHx8IDEwOyAvL21heCBkZXZpYXRpb24gb2YgdGhlIGxvb2thdCBwb3NpdGlvbiBmcm9tIHRoaXMgYXhpc1xyXG5cdFx0XHJcblx0XHR2YXIgem1heCA9IGNkZWZbXCJ6bWF4XCJdIHx8IDEwMDA7XHJcblx0XHR2YXIgem1pbiA9IGNkZWZbXCJ6bWluXCJdIHx8IC0xMDAwO1xyXG5cdFx0XHJcblx0XHRyZXR1cm4gZnVuY3Rpb24oZGVsdGEpIHtcclxuXHRcdFx0dmFyIG9mZnBlcmNlbnQgPSAocGxheWVyLmF2YXRhcl9ub2RlLnBvc2l0aW9uLnggLSB4YXhpcykgLyBsb29rcmFuZ2U7XHJcblx0XHRcdFxyXG5cdFx0XHRjYW1Sb290LnBvc2l0aW9uLnggPSB4YXhpcyArIChvZmZwZXJjZW50ICogZGV2KTtcclxuXHRcdFx0Y2FtUm9vdC5wb3NpdGlvbi55ID0gcGxheWVyLmF2YXRhcl9ub2RlLnBvc2l0aW9uLnk7XHJcblx0XHRcdGNhbVJvb3QucG9zaXRpb24ueiA9IE1hdGgubWF4KHptaW4sIE1hdGgubWluKHptYXgsIHBsYXllci5hdmF0YXJfbm9kZS5wb3NpdGlvbi56KSk7XHJcblx0XHR9O1xyXG5cdH0sXHJcblx0XHJcblx0Ly8gRm9sbG93IGFsb25nIGFuIGF4aXMsIHRpbHQgdG8gbG9vayBhdCB0aGUgcGxheWVyIGFzIHRoZXkgbW92ZSBvZmYgdGhlIGNlbnRlciBsaW5lXHJcblx0c29mdEZvbGxvd1pZVGlsdDogZnVuY3Rpb24oY2RlZiwgY2FtZSwgY2FtUm9vdCkge1xyXG5cdFx0dmFyIHhheGlzID0gY2RlZltcInhheGlzXCJdIHx8IDA7IC8vYXhpcyBhbG9uZyB3aGljaCB0byBrZWVwIHRoZSBjYW1lcmFcclxuXHRcdHZhciBkZXYgPSBjZGVmW1wiZGV2XCJdIHx8IDU7IC8vbWF4IGRldmlhdGlvbiBvZiB0aGUgY2FtIHBvc2l0aW9uIGZyb20gdGhpcyBheGlzXHJcblx0XHR2YXIgbG9va3JhbmdlID0gY2RlZltcImxvb2tyYW5nZVwiXSB8fCAxMDsgLy9tYXggZGV2aWF0aW9uIG9mIHRoZSBsb29rYXQgcG9zaXRpb24gZnJvbSB0aGlzIGF4aXNcclxuXHRcdHZhciBub3RpbHQgPSBjZGVmW1wibm90aWx0XCJdIHx8IDA7IC8vZGV2aWF0aW9uIG9mIGNhbSBwb3NpdGlvbiB0aGF0IGRvZXNuJ3QgdGlsdFxyXG5cdFx0dmFyIGxvb2tvZmYgPSBjZGVmW1wibG9va2F0XCJdIHx8IFswLCAwLjgsIDBdO1xyXG5cdFx0XHJcblx0XHR2YXIgem1heCA9IGNkZWZbXCJ6bWF4XCJdIHx8IDEwMDA7XHJcblx0XHR2YXIgem1pbiA9IGNkZWZbXCJ6bWluXCJdIHx8IC0xMDAwO1xyXG5cdFx0dmFyIHltYXggPSBjZGVmW1wieUB6bWF4XCJdIHx8IDI7XHJcblx0XHR2YXIgeW1pbiA9IGNkZWZbXCJ5QHptaW5cIl0gfHwgNDtcclxuXHRcdFxyXG5cdFx0cmV0dXJuIGZ1bmN0aW9uKGRlbHRhKSB7XHJcblx0XHRcdHZhciB5cGVyID0gKGNhbVJvb3QucG9zaXRpb24ueiAtIHptaW4pIC8gKHptYXggLSB6bWluKTtcclxuXHRcdFx0XHJcblx0XHRcdGlmIChwbGF5ZXIuYXZhdGFyX25vZGUucG9zaXRpb24ueCA8IHhheGlzICsgbm90aWx0IFxyXG5cdFx0XHRcdCYmIHBsYXllci5hdmF0YXJfbm9kZS5wb3NpdGlvbi54ID4geGF4aXMgLSBub3RpbHQpIFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0Y2FtUm9vdC5wb3NpdGlvbi54ID0gcGxheWVyLmF2YXRhcl9ub2RlLnBvc2l0aW9uLng7XHJcblx0XHRcdFx0Y2FtUm9vdC5wb3NpdGlvbi55ID0gKHltaW4gKyAoeW1heC15bWluKSp5cGVyKSArIHBsYXllci5hdmF0YXJfbm9kZS5wb3NpdGlvbi55O1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKHlwZXIsIGNhbVJvb3QucG9zaXRpb24ueSk7XHJcblx0XHRcdFx0Y2FtUm9vdC5wb3NpdGlvbi56ID0gTWF0aC5tYXgoem1pbiwgTWF0aC5taW4oem1heCwgcGxheWVyLmF2YXRhcl9ub2RlLnBvc2l0aW9uLnopKTtcclxuXHRcdFx0XHRcclxuXHRcdFx0XHR2YXIgbHggPSBsb29rb2ZmWzBdO1xyXG5cdFx0XHRcdHZhciBseSA9IGxvb2tvZmZbMV07XHJcblx0XHRcdFx0dmFyIGx6ID0gbG9va29mZlsyXTtcclxuXHRcdFx0XHRjYW1lLmxvb2tBdChuZXcgVEhSRUUuVmVjdG9yMygtbHgsIGx5LCBseikpO1xyXG5cdFx0XHR9XHJcblx0XHRcdGVsc2VcclxuXHRcdFx0e1xyXG5cdFx0XHRcdHZhciBiYXNlYXhpcyA9IChwbGF5ZXIuYXZhdGFyX25vZGUucG9zaXRpb24ueCA+IHhheGlzKT8geGF4aXMrbm90aWx0IDogeGF4aXMtbm90aWx0O1xyXG5cdFx0XHRcdHZhciBvZmZwZXJjZW50ID0gKHBsYXllci5hdmF0YXJfbm9kZS5wb3NpdGlvbi54IC0gYmFzZWF4aXMpIC8gbG9va3JhbmdlO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdGNhbVJvb3QucG9zaXRpb24ueCA9IGJhc2VheGlzICsgKG9mZnBlcmNlbnQgKiBkZXYpO1xyXG5cdFx0XHRcdGNhbVJvb3QucG9zaXRpb24ueSA9ICh5bWluIC0gKHltYXgteW1pbikqeXBlcikgKyBwbGF5ZXIuYXZhdGFyX25vZGUucG9zaXRpb24ueTtcclxuXHRcdFx0XHRjYW1Sb290LnBvc2l0aW9uLnogPSBNYXRoLm1heCh6bWluLCBNYXRoLm1pbih6bWF4LCBwbGF5ZXIuYXZhdGFyX25vZGUucG9zaXRpb24ueikpO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdHZhciBseCA9IGNhbVJvb3QucG9zaXRpb24ueCAtIHBsYXllci5hdmF0YXJfbm9kZS5wb3NpdGlvbi54ICsgbG9va29mZlswXTtcclxuXHRcdFx0XHR2YXIgbHkgPSBjYW1Sb290LnBvc2l0aW9uLnkgLSBwbGF5ZXIuYXZhdGFyX25vZGUucG9zaXRpb24ueSArIGxvb2tvZmZbMV07XHJcblx0XHRcdFx0dmFyIGx6ID0gY2FtUm9vdC5wb3NpdGlvbi56IC0gcGxheWVyLmF2YXRhcl9ub2RlLnBvc2l0aW9uLnogKyBsb29rb2ZmWzJdO1xyXG5cdFx0XHRcdGNhbWUubG9va0F0KG5ldyBUSFJFRS5WZWN0b3IzKC1seCwgLWx5LCBseikpO1xyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cdH0sXHJcblx0XHJcblx0Ly8gRm9sbG93IGFsb25nIGFuIGF4aXMsIHRpbHQgdG8gbG9vayBhdCB0aGUgcGxheWVyIGFzIHRoZXkgbW92ZSBvZmYgdGhlIGNlbnRlciBsaW5lXHJcblx0c29mdEZvbGxvd1pUaWx0OiBmdW5jdGlvbihjZGVmLCBjYW1lLCBjYW1Sb290KSB7XHJcblx0XHR2YXIgeGF4aXMgPSBjZGVmW1wieGF4aXNcIl0gfHwgMDsgLy9heGlzIGFsb25nIHdoaWNoIHRvIGtlZXAgdGhlIGNhbWVyYVxyXG5cdFx0dmFyIGRldiA9IGNkZWZbXCJkZXZcIl0gfHwgNTsgLy9tYXggZGV2aWF0aW9uIG9mIHRoZSBjYW0gcG9zaXRpb24gZnJvbSB0aGlzIGF4aXNcclxuXHRcdHZhciBsb29rcmFuZ2UgPSBjZGVmW1wibG9va3JhbmdlXCJdIHx8IDEwOyAvL21heCBkZXZpYXRpb24gb2YgdGhlIGxvb2thdCBwb3NpdGlvbiBmcm9tIHRoaXMgYXhpc1xyXG5cdFx0dmFyIG5vdGlsdCA9IGNkZWZbXCJub3RpbHRcIl0gfHwgMDsgLy9kZXZpYXRpb24gb2YgY2FtIHBvc2l0aW9uIHRoYXQgZG9lc24ndCB0aWx0XHJcblx0XHR2YXIgbG9va29mZiA9IGNkZWZbXCJsb29rYXRcIl0gfHwgWzAsIDAuOCwgMF07XHJcblx0XHRcclxuXHRcdHZhciB6bWF4ID0gY2RlZltcInptYXhcIl0gfHwgMTAwMDtcclxuXHRcdHZhciB6bWluID0gY2RlZltcInptaW5cIl0gfHwgLTEwMDA7XHJcblx0XHRcclxuXHRcdHJldHVybiBmdW5jdGlvbihkZWx0YSkge1xyXG5cdFx0XHRpZiAocGxheWVyLmF2YXRhcl9ub2RlLnBvc2l0aW9uLnggPCB4YXhpcyArIG5vdGlsdCBcclxuXHRcdFx0XHQmJiBwbGF5ZXIuYXZhdGFyX25vZGUucG9zaXRpb24ueCA+IHhheGlzIC0gbm90aWx0KSBcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGNhbVJvb3QucG9zaXRpb24ueCA9IHBsYXllci5hdmF0YXJfbm9kZS5wb3NpdGlvbi54O1xyXG5cdFx0XHRcdGNhbVJvb3QucG9zaXRpb24ueSA9IHBsYXllci5hdmF0YXJfbm9kZS5wb3NpdGlvbi55O1xyXG5cdFx0XHRcdGNhbVJvb3QucG9zaXRpb24ueiA9IE1hdGgubWF4KHptaW4sIE1hdGgubWluKHptYXgsIHBsYXllci5hdmF0YXJfbm9kZS5wb3NpdGlvbi56KSk7XHJcblx0XHRcdH1cclxuXHRcdFx0ZWxzZVxyXG5cdFx0XHR7XHJcblx0XHRcdFx0dmFyIGJhc2VheGlzID0gKHBsYXllci5hdmF0YXJfbm9kZS5wb3NpdGlvbi54ID4geGF4aXMpPyB4YXhpcytub3RpbHQgOiB4YXhpcy1ub3RpbHQ7XHJcblx0XHRcdFx0dmFyIG9mZnBlcmNlbnQgPSAocGxheWVyLmF2YXRhcl9ub2RlLnBvc2l0aW9uLnggLSBiYXNlYXhpcykgLyBsb29rcmFuZ2U7XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0Y2FtUm9vdC5wb3NpdGlvbi54ID0gYmFzZWF4aXMgKyAob2ZmcGVyY2VudCAqIGRldik7XHJcblx0XHRcdFx0Y2FtUm9vdC5wb3NpdGlvbi55ID0gcGxheWVyLmF2YXRhcl9ub2RlLnBvc2l0aW9uLnk7XHJcblx0XHRcdFx0Y2FtUm9vdC5wb3NpdGlvbi56ID0gTWF0aC5tYXgoem1pbiwgTWF0aC5taW4oem1heCwgcGxheWVyLmF2YXRhcl9ub2RlLnBvc2l0aW9uLnopKTtcclxuXHRcdFx0XHRcclxuXHRcdFx0XHR2YXIgbHggPSBjYW1Sb290LnBvc2l0aW9uLnggLSBwbGF5ZXIuYXZhdGFyX25vZGUucG9zaXRpb24ueCArIGxvb2tvZmZbMF07XHJcblx0XHRcdFx0dmFyIGx5ID0gY2FtUm9vdC5wb3NpdGlvbi55IC0gcGxheWVyLmF2YXRhcl9ub2RlLnBvc2l0aW9uLnkgKyBsb29rb2ZmWzFdO1xyXG5cdFx0XHRcdHZhciBseiA9IGNhbVJvb3QucG9zaXRpb24ueiAtIHBsYXllci5hdmF0YXJfbm9kZS5wb3NpdGlvbi56ICsgbG9va29mZlsyXTtcclxuXHRcdFx0XHRjYW1lLmxvb2tBdChuZXcgVEhSRUUuVmVjdG9yMygtbHgsIGx5LCBseikpO1xyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cdH0sXHJcblx0XHJcblx0Ly8gRm9sbG93IGFsb25nIGFuIGF4aXMsIHRpbHQgdGhlIG9wcG9zaXRlIGRpcmVjdGlvbiB0aGUgcGxheWVyIGhhcyBnb25lXHJcblx0c29mdEZvbGxvd1pUaWx0T3Bwb3NpdGU6IGZ1bmN0aW9uKGNkZWYsIGNhbWUsIGNhbVJvb3QpIHtcclxuXHRcdHZhciB4YXhpcyA9IGNkZWZbXCJ4YXhpc1wiXSB8fCAwOyAvL2F4aXMgYWxvbmcgd2hpY2ggdG8ga2VlcCB0aGUgY2FtZXJhXHJcblx0XHR2YXIgZGV2ID0gY2RlZltcImRldlwiXSB8fCA1OyAvL21heCBkZXZpYXRpb24gb2YgdGhlIGNhbSBwb3NpdGlvbiBmcm9tIHRoaXMgYXhpc1xyXG5cdFx0dmFyIGxvb2tyYW5nZSA9IGNkZWZbXCJsb29rcmFuZ2VcIl0gfHwgMTA7IC8vbWF4IGRldmlhdGlvbiBvZiB0aGUgbG9va2F0IHBvc2l0aW9uIGZyb20gdGhpcyBheGlzXHJcblx0XHR2YXIgbG9va29mZiA9IGNkZWZbXCJsb29rYXRcIl0gfHwgWzAsIDAuOCwgMF07XHJcblx0XHRcclxuXHRcdHZhciB6bWF4ID0gY2RlZltcInptYXhcIl0gfHwgMTAwMDtcclxuXHRcdHZhciB6bWluID0gY2RlZltcInptaW5cIl0gfHwgLTEwMDA7XHJcblx0XHRcclxuXHRcdHJldHVybiBmdW5jdGlvbihkZWx0YSkge1xyXG5cdFx0XHR2YXIgb2ZmcGVyY2VudCA9IChwbGF5ZXIuYXZhdGFyX25vZGUucG9zaXRpb24ueCAtIHhheGlzKSAvIGxvb2tyYW5nZTtcclxuXHRcdFx0XHJcblx0XHRcdGNhbVJvb3QucG9zaXRpb24ueCA9IHhheGlzIC0gKG9mZnBlcmNlbnQgKiBkZXYpO1xyXG5cdFx0XHRjYW1Sb290LnBvc2l0aW9uLnkgPSBwbGF5ZXIuYXZhdGFyX25vZGUucG9zaXRpb24ueTtcclxuXHRcdFx0Y2FtUm9vdC5wb3NpdGlvbi56ID0gTWF0aC5tYXgoem1pbiwgTWF0aC5taW4oem1heCwgcGxheWVyLmF2YXRhcl9ub2RlLnBvc2l0aW9uLnopKTtcclxuXHRcdFx0XHJcblx0XHRcdHZhciBseCA9IGNhbVJvb3QucG9zaXRpb24ueCAtIHBsYXllci5hdmF0YXJfbm9kZS5wb3NpdGlvbi54ICsgbG9va29mZlswXTtcclxuXHRcdFx0dmFyIGx5ID0gY2FtUm9vdC5wb3NpdGlvbi55IC0gcGxheWVyLmF2YXRhcl9ub2RlLnBvc2l0aW9uLnkgKyBsb29rb2ZmWzFdO1xyXG5cdFx0XHR2YXIgbHogPSBjYW1Sb290LnBvc2l0aW9uLnogLSBwbGF5ZXIuYXZhdGFyX25vZGUucG9zaXRpb24ueiArIGxvb2tvZmZbMl07XHJcblx0XHRcdGNhbWUubG9va0F0KG5ldyBUSFJFRS5WZWN0b3IzKC1seCwgbHksIGx6KSk7XHJcblx0XHR9O1xyXG5cdH0sXHJcbn07XHJcblxyXG5mdW5jdGlvbiBzZXR1cENhbWVyYXMobWFwLCBjYW1saXN0KSB7XHJcblx0dmFyIHNjcldpZHRoID0gJChcIiNnYW1lc2NyZWVuXCIpLndpZHRoKCk7XHJcblx0dmFyIHNjckhlaWdodCA9ICQoXCIjZ2FtZXNjcmVlblwiKS5oZWlnaHQoKTtcclxuXHRcclxuXHR2YXIgbm9kZSA9IG5ldyBUSFJFRS5PYmplY3QzRCgpO1xyXG5cdG5vZGUubmFtZSA9IFwiQ2FtZXJhIFJpZ1wiO1xyXG5cclxuXHRmb3IgKHZhciBjbmFtZSBpbiBjYW1saXN0KSB7XHJcblx0XHR2YXIgYztcclxuXHRcdFxyXG5cdFx0aWYgKGNhbWxpc3RbY25hbWVdLnR5cGUgPT0gXCJvcnRob1wiKSB7XHJcblx0XHRcdGMgPSBuZXcgVEhSRUUuT3J0aG9ncmFwaGljQ2FtZXJhKFxyXG5cdFx0XHRcdHNjcldpZHRoLy0yLCBzY3JXaWR0aC8yLCBzY3JIZWlnaHQvMiwgc2NySGVpZ2h0Ly0yLCAwLjEsIDE1MCk7XHJcblx0XHRcdFxyXG5cdFx0XHR2YXIgY3AgPSBjYW1saXN0W2NuYW1lXS5wb3NpdGlvbiB8fCBbMCwgMTAwLCAwXTtcclxuXHRcdFx0Yy5wb3NpdGlvbi5zZXQoY3BbMF0sIGNwWzFdLCBjcFsyXSk7XHJcblx0XHRcdFxyXG5cdFx0XHRjLnJvYXRpb24ueCA9IC1NYXRoLlBJIC8gMjsgLy9UT0RPIGxvb2tBdD9cclxuXHRcdFx0XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRjID0gbmV3IFRIUkVFLlBlcnNwZWN0aXZlQ2FtZXJhKFxyXG5cdFx0XHRcdFx0Y2FtbGlzdFtjbmFtZV0uZm92IHx8IDU1LCBcclxuXHRcdFx0XHRcdHNjcldpZHRoIC8gc2NySGVpZ2h0LCBcclxuXHRcdFx0XHRcdGNhbWxpc3RbY25hbWVdLm5lYXIgfHwgMC4xLCBcclxuXHRcdFx0XHRcdGNhbWxpc3RbY25hbWVdLmZhciB8fCAxNTApO1xyXG5cdFx0XHRcclxuXHRcdFx0dmFyIGNwID0gY2FtbGlzdFtjbmFtZV0ucG9zaXRpb24gfHwgWzAsIDUuNDUsIDUuM107XHJcblx0XHRcdGMucG9zaXRpb24uc2V0KGNwWzBdLCBjcFsxXSwgY3BbMl0pO1xyXG5cdFx0XHRcclxuXHRcdFx0aWYgKGNhbWxpc3RbY25hbWVdLnJvdGF0aW9uKSB7XHJcblx0XHRcdFx0dmFyIGNsID0gY2FtbGlzdFtjbmFtZV0ucm90YXRpb24gfHwgWy00NSwgMCwgMF07XHJcblx0XHRcdFx0Y2xbMF0gKj0gTWF0aC5QSSAvIDE4MDtcclxuXHRcdFx0XHRjbFsxXSAqPSBNYXRoLlBJIC8gMTgwO1xyXG5cdFx0XHRcdGNsWzJdICo9IE1hdGguUEkgLyAxODA7XHJcblx0XHRcdFx0Yy5yb3RhdGlvbi5zZXQoY2xbMF0sIGNsWzFdLCBjbFsyXSk7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0dmFyIGNsID0gY2FtbGlzdFtjbmFtZV0ubG9va2F0IHx8IFswLCAwLjgsIDBdO1xyXG5cdFx0XHRcdGMubG9va0F0KG5ldyBUSFJFRS5WZWN0b3IzKGNsWzBdLCBjbFsxXSwgY2xbMl0pKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHRjLm5hbWUgPSBcIkNhbWVyYSBbXCIrY25hbWUrXCJdXCI7XHJcblx0XHRjLm15X2NhbWVyYSA9IGM7XHJcblx0XHRcclxuXHRcdHZhciBjcm9vdDtcclxuXHRcdGlmICghY2FtbGlzdFtjbmFtZV0uZml4ZWRDYW1lcmEpIHtcclxuXHRcdFx0Y3Jvb3QgPSBuZXcgVEhSRUUuT2JqZWN0M0QoKTtcclxuXHRcdFx0Y3Jvb3QuYWRkKGMpO1xyXG5cdFx0XHRjcm9vdC5teV9jYW1lcmEgPSBjO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHR2YXIgY2IgPSBjYW1saXN0W2NuYW1lXS5iZWhhdmlvciB8fCBcImZvbGxvd1BsYXllclwiO1xyXG5cdFx0aWYgKCFjYW1CZWhhdmlvcnNbY2JdKSB7XHJcblx0XHRcdGNvbnNvbGUuZXJyb3IoXCJJbnZhbGlkIENhbWVyYSBCZWhhdmlvciBEZWZpbmVkISBcIiwgY2IpO1xyXG5cdFx0XHRjYiA9IFwiZm9sbG93UGxheWVyXCI7XHJcblx0XHR9XHJcblx0XHR2YXIgY2IgPSBjYW1CZWhhdmlvcnNbY2JdLmNhbGwobWFwLCBjYW1saXN0W2NuYW1lXSwgYywgY3Jvb3QpO1xyXG5cdFx0aWYgKGNiKSB7XHJcblx0XHRcdG1hcC5jYW1lcmFMb2dpY3MucHVzaChjYik7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdG5vZGUuYWRkKGNyb290IHx8IGMpO1xyXG5cdFx0bWFwLmNhbWVyYXNbY25hbWVdID0gYztcclxuXHRcdGlmIChjbmFtZSA9PSAwKSBtYXAuY2FtZXJhID0gYztcclxuXHR9XHJcblx0XHJcblx0aWYgKCFtYXAuY2FtZXJhKSB0aHJvdyBuZXcgRXJyb3IoXCJObyBjYW1lcmFzIGRlZmluZWQhXCIpO1xyXG5cdFxyXG5cdHJldHVybiBub2RlO1xyXG59XHJcblxyXG5cclxuIiwiLy8gbXRsLWxvYWRlci5qc1xyXG4vLyBBIFRIUkVFLmpzIHdhdmVmcm9udCBNYXRlcmlhbCBMaWJyYXJ5IGxvYWRlclxyXG4vLyBDb3BpZWQgbW9zdGx5IHdob2xlc2FsZSBmcm9tIHRoZSB0aHJlZS5qcyBleGFtcGxlcyBmb2xkZXIuXHJcbi8vIE9yaWdpbmFsIGF1dGhvcnM6IG1yZG9vYiwgYW5nZWx4dWFuY2hhbmdcclxuXHJcbnZhciBtb21lbnQgPSByZXF1aXJlKFwibW9tZW50XCIpO1xyXG52YXIgaW5oZXJpdHMgPSByZXF1aXJlKFwiaW5oZXJpdHNcIik7XHJcbnZhciBleHRlbmQgPSByZXF1aXJlKFwiZXh0ZW5kXCIpO1xyXG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZShcImV2ZW50c1wiKS5FdmVudEVtaXR0ZXI7XHJcblxyXG5cclxuZnVuY3Rpb24gTXRsTG9hZGVyKG10bGZpbGUsIGxvYWRUZXh0dXJlLCBvcHRzKSB7XHJcblx0RXZlbnRFbWl0dGVyLmNhbGwodGhpcyk7XHJcblx0ZXh0ZW5kKHRoaXMsIG9wdHMpO1xyXG5cdFxyXG5cdHRoaXMubXRsZmlsZSA9IG10bGZpbGU7XHJcblx0dGhpcy5sb2FkVGV4dHVyZSA9IGxvYWRUZXh0dXJlO1xyXG5cdFxyXG5cdHRoaXMuZ2MgPSBvcHRzLmdjO1xyXG59XHJcbmluaGVyaXRzKE10bExvYWRlciwgRXZlbnRFbWl0dGVyKTtcclxuZXh0ZW5kKE10bExvYWRlci5wcm90b3R5cGUsIHtcclxuXHRsb2FkVGV4dHVyZSA6IG51bGwsXHJcblx0bXRsZmlsZSA6IG51bGwsXHJcblx0XHJcblx0bG9hZDogZnVuY3Rpb24oKSB7XHJcblx0XHRpZiAoIXRoaXMubXRsZmlsZSkgdGhyb3cgbmV3IEVycm9yKFwiTm8gTVRMIGZpbGUgZ2l2ZW4hXCIpO1xyXG5cdFx0aWYgKCF0aGlzLmxvYWRUZXh0dXJlKSB0aHJvdyBuZXcgRXJyb3IoXCJObyBsb2FkVGV4dHVyZSBmdW5jdGlvbiBnaXZlbiFcIik7XHJcblx0XHRcclxuXHRcdHZhciBzY29wZSA9IHRoaXM7XHJcblx0XHR2YXIgcGFyc2VkID0gc2NvcGUucGFyc2UodGhpcy5tdGxmaWxlKTtcclxuXHRcdHRoaXMuZW1pdChcImxvYWRcIiwgcGFyc2VkKTtcclxuXHR9LFxyXG5cdFxyXG5cdHBhcnNlIDogZnVuY3Rpb24odGV4dCkge1xyXG5cdFx0dmFyIGxpbmVzID0gdGV4dC5zcGxpdCggXCJcXG5cIiApO1xyXG5cdFx0dmFyIGluZm8gPSB7fTtcclxuXHRcdHZhciBkZWxpbWl0ZXJfcGF0dGVybiA9IC9cXHMrLztcclxuXHRcdHZhciBtYXRlcmlhbHNJbmZvID0ge307XHJcblx0XHRcclxuXHRcdHRyeSB7XHJcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgbGluZXMubGVuZ3RoOyBpICsrKSB7XHJcblx0XHRcdFx0dmFyIGxpbmUgPSBsaW5lc1tpXTtcclxuXHRcdFx0XHRsaW5lID0gbGluZS50cmltKCk7XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0aWYgKGxpbmUubGVuZ3RoID09PSAwIHx8IGxpbmUuY2hhckF0KCAwICkgPT09ICcjJykgY29udGludWU7IC8vaWdub3JlIGJsYW5rIGxpbmVzIGFuZCBjb21tZW50c1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdC8vIEZpbmQgd2hlcmUgdGhlIGZpcnN0IHNwYWNlIGlzIGluIGEgbGluZSBhbmQgc3BsaXQgb2ZmIGtleSBhbmQgdmFsdWUgYmFzZWQgb24gdGhhdFxyXG5cdFx0XHRcdHZhciBwb3MgPSBsaW5lLmluZGV4T2YoJyAnKTtcclxuXHRcdFx0XHRcclxuXHRcdFx0XHR2YXIga2V5ID0gKHBvcyA+PSAwKSA/IGxpbmUuc3Vic3RyaW5nKDAsIHBvcykgOiBsaW5lO1xyXG5cdFx0XHRcdGtleSA9IGtleS50b0xvd2VyQ2FzZSgpO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdHZhciB2YWx1ZSA9IChwb3MgPj0gMCkgPyBsaW5lLnN1YnN0cmluZyhwb3MgKyAxKSA6IFwiXCI7XHJcblx0XHRcdFx0dmFsdWUgPSB2YWx1ZS50cmltKCk7XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0aWYgKGtleSA9PT0gXCJuZXdtdGxcIikgeyAvLyBOZXcgbWF0ZXJpYWwgZGVmaW5pdGlvblxyXG5cdFx0XHRcdFx0aW5mbyA9IHsgbmFtZTogdmFsdWUgfTtcclxuXHRcdFx0XHRcdG1hdGVyaWFsc0luZm9bIHZhbHVlIF0gPSBpbmZvO1xyXG5cdFx0XHRcdFx0XHJcblx0XHRcdFx0fSBlbHNlIGlmICggaW5mbyApIHsgLy8gSWYgd2UgYXJlIHdvcmtpbmcgd2l0aCBhIG1hdGVyaWFsXHJcblx0XHRcdFx0XHRpZiAoa2V5ID09PSBcImthXCIgfHwga2V5ID09PSBcImtkXCIgfHwga2V5ID09PSBcImtzXCIpIHtcclxuXHRcdFx0XHRcdFx0dmFyIHNzID0gdmFsdWUuc3BsaXQoZGVsaW1pdGVyX3BhdHRlcm4sIDMpO1xyXG5cdFx0XHRcdFx0XHRpbmZvW2tleV0gPSBbcGFyc2VGbG9hdChzc1swXSksIHBhcnNlRmxvYXQoc3NbMV0pLCBwYXJzZUZsb2F0KHNzWzJdKV07XHJcblx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRpbmZvW2tleV0gPSB2YWx1ZTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdFx0Ly8gT25jZSB3ZSd2ZSBwYXJzZWQgb3V0IGFsbCB0aGUgbWF0ZXJpYWxzLCBsb2FkIHRoZW0gaW50byBhIFwiY3JlYXRvclwiXHJcblx0XHRcdGNvbnNvbGUubG9nKFwiUGFyc2VkIE1hdGVyaWFsczpcIiwgT2JqZWN0LmtleXMobWF0ZXJpYWxzSW5mbykubGVuZ3RoLCBtYXRlcmlhbHNJbmZvLmxlbmd0aCwgbWF0ZXJpYWxzSW5mbyk7XHJcblx0XHRcdHZhciBtYXRDcmVhdG9yID0gbmV3IE1hdGVyaWFsQ3JlYXRvcih0aGlzLmxvYWRUZXh0dXJlLCB0aGlzLmdjKTtcclxuXHRcdFx0bWF0Q3JlYXRvci5zZXRNYXRlcmlhbHMobWF0ZXJpYWxzSW5mbyk7XHJcblx0XHRcdHJldHVybiBtYXRDcmVhdG9yO1xyXG5cdFx0fSBjYXRjaCAoZSkge1xyXG5cdFx0XHRjb25zb2xlLmVycm9yKFwiTVRMXCIsIGUpO1xyXG5cdFx0XHR0aGlzLmVtaXQoXCJlcnJvclwiLCBlKTtcclxuXHRcdH1cclxuXHR9LFxyXG5cdFxyXG59KTtcclxuXHJcbi8qXHJcbmZ1bmN0aW9uIGVuc3VyZVBvd2VyT2ZUd29fICggaW1hZ2UgKSB7XHJcblx0aWYgKCAhIFRIUkVFLk1hdGguaXNQb3dlck9mVHdvKCBpbWFnZS53aWR0aCApIHx8ICEgVEhSRUUuTWF0aC5pc1Bvd2VyT2ZUd28oIGltYWdlLmhlaWdodCApICkge1xyXG5cdFx0dmFyIGNhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoIFwiY2FudmFzXCIgKTtcclxuXHRcdGNhbnZhcy53aWR0aCA9IG5leHRIaWdoZXN0UG93ZXJPZlR3b18oIGltYWdlLndpZHRoICk7XHJcblx0XHRjYW52YXMuaGVpZ2h0ID0gbmV4dEhpZ2hlc3RQb3dlck9mVHdvXyggaW1hZ2UuaGVpZ2h0ICk7XHJcblx0XHRcclxuXHRcdHZhciBjdHggPSBjYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpO1xyXG5cdFx0Y3R4LmRyYXdJbWFnZSggaW1hZ2UsIDAsIDAsIGltYWdlLndpZHRoLCBpbWFnZS5oZWlnaHQsIDAsIDAsIGNhbnZhcy53aWR0aCwgY2FudmFzLmhlaWdodCApO1xyXG5cdFx0cmV0dXJuIGNhbnZhcztcclxuXHR9XHJcblx0XHJcblx0cmV0dXJuIGltYWdlO1xyXG59XHJcbiovXHJcbmZ1bmN0aW9uIG5leHRIaWdoZXN0UG93ZXJPZlR3b18oIHggKSB7XHJcblx0LS14O1xyXG5cdGZvciAoIHZhciBpID0gMTsgaSA8IDMyOyBpIDw8PSAxICkge1xyXG5cdFx0eCA9IHggfCB4ID4+IGk7XHJcblx0fVxyXG5cdHJldHVybiB4ICsgMTtcclxufVxyXG5cclxuXHJcbi8vIFRoZSBvcmlnaW5hbCB2ZXJzaW9uIGNhbWUgd2l0aCBzZXZlcmFsIG9wdGlvbnMsIHdoaWNoIHdlIGNhbiBzaW1wbHkgYXNzdW1lIHdpbGwgYmUgdGhlIGRlZmF1bHRzXHJcbi8vXHRcdHNpZGU6IEFsd2F5cyBhcHBseSB0byBUSFJFRS5Gcm9udFNpZGVcclxuLy9cdFx0d3JhcDogVGhpcyB3aWxsIGFjdHVhbGx5IGJlIHNwZWNpZmllZCBJTiB0aGUgTVRMLCBiZWNhdXNlIGl0IGhhcyB0aGF0IHN1cHBvcnRcclxuLy9cdFx0bm9ybWFsaXplUkdCOiBmYWxzZSAtIGFzc3VtZWRcclxuLy9cdFx0aWdub3JlWmVyb1JHQjogZmFsc2UgXHJcbi8vXHRcdGludmVydFRyYW5zcGFyZW5jeTogZmFsc2UgLSBkID0gMSBpcyBvcGFxdWVcclxuZnVuY3Rpb24gTWF0ZXJpYWxDcmVhdG9yKGxvYWRUZXh0dXJlLCBnYykge1xyXG5cdHRoaXMubG9hZFRleHR1cmUgPSBsb2FkVGV4dHVyZTtcclxuXHR0aGlzLmdjID0gZ2M7XHJcbn1cclxuTWF0ZXJpYWxDcmVhdG9yLnByb3RvdHlwZSA9IHtcclxuXHRzZXRNYXRlcmlhbHMgOiBmdW5jdGlvbihtYXRJbmZvKSB7XHJcblx0XHR0aGlzLm1hdGVyaWFsc0luZm8gPSBtYXRJbmZvO1xyXG5cdFx0dGhpcy5tYXRlcmlhbHMgPSB7fTtcclxuXHRcdHRoaXMubWF0ZXJpYWxzQXJyYXkgPSBbXTtcclxuXHRcdHRoaXMubmFtZUxvb2t1cCA9IHt9O1xyXG5cdH0sXHJcblx0XHJcblx0cHJlbG9hZCA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0dHJ5IHtcclxuXHRcdGZvciAodmFyIG1uIGluIHRoaXMubWF0ZXJpYWxzSW5mbykge1xyXG5cdFx0XHR0aGlzLmNyZWF0ZShtbik7XHJcblx0XHR9XHJcblx0XHR9IGNhdGNoIChlKSB7XHJcblx0XHRcdGNvbnNvbGUuZXJyb3IoZSk7XHJcblx0XHR9XHJcblx0fSxcclxuXHRcclxuXHRnZXRJbmRleCA6IGZ1bmN0aW9uKG1hdE5hbWUpIHtcclxuXHRcdHJldHVybiB0aGlzLm5hbWVMb29rdXBbbWF0TmFtZV07XHJcblx0fSxcclxuXHRcclxuXHRnZXRBc0FycmF5IDogZnVuY3Rpb24oKSB7XHJcblx0XHR2YXIgaW5kZXggPSAwO1xyXG5cdFx0Zm9yICh2YXIgbW4gaW4gdGhpcy5tYXRlcmlhbHNJbmZvKSB7XHJcblx0XHRcdHRoaXMubWF0ZXJpYWxzQXJyYXlbaW5kZXhdID0gdGhpcy5jcmVhdGUobW4pO1xyXG5cdFx0XHR0aGlzLm5hbWVMb29rdXBbbW5dID0gaW5kZXg7XHJcblx0XHRcdGluZGV4Kys7XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gdGhpcy5tYXRlcmlhbHNBcnJheTtcclxuXHR9LFxyXG5cdFxyXG5cdGNyZWF0ZSA6IGZ1bmN0aW9uIChtYXROYW1lKSB7XHJcblx0XHRpZiAodGhpcy5tYXRlcmlhbHNbbWF0TmFtZV0gPT09IHVuZGVmaW5lZCkge1xyXG5cdFx0XHRjb25zb2xlLmxvZyhcIkNyZWF0aW5nIE1hdGVyaWFsOiBcIiwgbWF0TmFtZSk7XHJcblx0XHRcdHRoaXMuY3JlYXRlTWF0ZXJpYWxfKG1hdE5hbWUpO1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIHRoaXMubWF0ZXJpYWxzW21hdE5hbWVdO1xyXG5cdH0sXHJcblx0XHJcblx0Y3JlYXRlTWF0ZXJpYWxfIDogZnVuY3Rpb24obWF0TmFtZSkge1xyXG5cdFx0dmFyIHNjb3BlID0gdGhpcztcclxuXHRcdHZhciBtYXQgPSB0aGlzLm1hdGVyaWFsc0luZm9bbWF0TmFtZV07XHJcblx0XHR2YXIgcGFyYW1zID0ge1xyXG5cdFx0XHRuYW1lOiBtYXROYW1lLFxyXG5cdFx0XHRzaWRlOiBUSFJFRS5Gcm9udFNpZGUsXHJcblx0XHR9O1xyXG5cdFx0XHJcblx0XHRmb3IgKHZhciBwcm9wIGluIG1hdCkge1xyXG5cdFx0XHR2YXIgdmFsdWUgPSBtYXRbcHJvcF07XHJcblx0XHRcdHN3aXRjaCAocHJvcC50b0xvd2VyQ2FzZSgpKSB7XHJcblx0XHRcdFx0Y2FzZSBcIm5hbWVcIjpcclxuXHRcdFx0XHRcdHBhcmFtc1snbmFtZSddID0gdmFsdWU7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcclxuXHRcdFx0XHRjYXNlIFwia2RcIjogLy8gRGlmZnVzZSBjb2xvclxyXG5cdFx0XHRcdFx0cGFyYW1zWydkaWZmdXNlJ10gPSBuZXcgVEhSRUUuQ29sb3IoKS5mcm9tQXJyYXkodmFsdWUpO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0Y2FzZSBcImthXCI6IC8vIEFtYmllbnQgY29sb3JcclxuXHRcdFx0XHRcdHBhcmFtc1snYW1iaWVudCddID0gbmV3IFRIUkVFLkNvbG9yKCkuZnJvbUFycmF5KHZhbHVlKTtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdGNhc2UgXCJrc1wiOiAvLyBTcGVjdWxhciBjb2xvclxyXG5cdFx0XHRcdFx0cGFyYW1zWydzcGVjdWxhciddID0gbmV3IFRIUkVFLkNvbG9yKCkuZnJvbUFycmF5KHZhbHVlKTtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdGNhc2UgXCJrZVwiOiAvLyBFbWlzc2lvbiAobm9uLXN0YW5kYXJkKVxyXG5cdFx0XHRcdFx0cGFyYW1zWydlbWlzc2l2ZSddID0gbmV3IFRIUkVFLkNvbG9yKHZhbHVlLCB2YWx1ZSwgdmFsdWUpO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0Y2FzZSBcIm1hcF9rZFwiOiAvLyBEaWZmdXNlIHRleHR1cmUgbWFwXHJcblx0XHRcdFx0XHR2YXIgYXJncyA9IF9fc3BsaXRUZXhBcmcodmFsdWUpO1xyXG5cdFx0XHRcdFx0dmFyIG1hcCA9IF9fdGV4dHVyZU1hcChhcmdzKTtcclxuXHRcdFx0XHRcdGlmIChtYXApIHBhcmFtc1snbWFwJ10gPSBtYXA7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcdFxyXG5cdFx0XHRcdGNhc2UgXCJtYXBfa2FcIjogLy8gQW1iaWVudCB0ZXh0dXJlIG1hcFxyXG5cdFx0XHRcdFx0dmFyIGFyZ3MgPSBfX3NwbGl0VGV4QXJnKHZhbHVlKTtcclxuXHRcdFx0XHRcdHZhciBtYXAgPSBfX3RleHR1cmVNYXAoYXJncyk7XHJcblx0XHRcdFx0XHRpZiAobWFwKSBwYXJhbXNbJ2xpZ2h0TWFwJ10gPSBtYXA7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcclxuXHRcdFx0XHRjYXNlIFwibWFwX2tzXCI6IC8vIFNwZWN1bGFyIG1hcFxyXG5cdFx0XHRcdFx0dmFyIGFyZ3MgPSBfX3NwbGl0VGV4QXJnKHZhbHVlKTtcclxuXHRcdFx0XHRcdHZhciBtYXAgPSBfX3RleHR1cmVNYXAoYXJncyk7XHJcblx0XHRcdFx0XHRpZiAobWFwKSBwYXJhbXNbJ3NwZWN1bGFyTWFwJ10gPSBtYXA7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcclxuXHRcdFx0XHRjYXNlIFwibWFwX2RcIjogLy8gQWxwaGEgdGV4dHVyZSBtYXBcclxuXHRcdFx0XHRcdHZhciBhcmdzID0gX19zcGxpdFRleEFyZyh2YWx1ZSk7XHJcblx0XHRcdFx0XHR2YXIgbWFwID0gX190ZXh0dXJlTWFwKGFyZ3MpO1xyXG5cdFx0XHRcdFx0aWYgKG1hcCkgcGFyYW1zWydhbHBoYU1hcCddID0gbWFwO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0Y2FzZSBcImJ1bXBcIjpcclxuXHRcdFx0XHRjYXNlIFwibWFwX2J1bXBcIjogLy8gQnVtcCBtYXBcclxuXHRcdFx0XHRcdHZhciBhcmdzID0gX19zcGxpdFRleEFyZyh2YWx1ZSk7XHJcblx0XHRcdFx0XHR2YXIgbWFwID0gX190ZXh0dXJlTWFwKGFyZ3MpO1xyXG5cdFx0XHRcdFx0aWYgKG1hcCkgcGFyYW1zWydidW1wTWFwJ10gPSBtYXA7XHJcblx0XHRcdFx0XHRcclxuXHRcdFx0XHRcdGlmIChhcmdzLmJtKSBwYXJhbXNbJ2J1bXBTY2FsZSddID0gYXJncy5ibTtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdGNhc2UgXCJuc1wiOiAvLyBTcGVjdWxhciBleHBvbmVudFxyXG5cdFx0XHRcdFx0cGFyYW1zWydzaGluaW5lc3MnXSA9IHZhbHVlO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0Y2FzZSBcImRcIjogLy8gVHJhbnNwYXJlbmN5XHJcblx0XHRcdFx0XHRpZiAodmFsdWUgPCAxKSB7XHJcblx0XHRcdFx0XHRcdHBhcmFtc1sndHJhbnNwYXJlbnQnXSA9IHRydWU7XHJcblx0XHRcdFx0XHRcdHBhcmFtc1snb3BhY2l0eSddID0gdmFsdWU7XHJcblx0XHRcdFx0XHRcdHBhcmFtc1snYWxwaGFUZXN0J10gPSAwLjA1O1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHRcclxuXHRcdFx0XHRkZWZhdWx0OlxyXG5cdFx0XHRcdFx0Ly8gY29uc29sZS5sb2coXCJVbmhhbmRsZWQgTVRMIGRhdGE6XCIsIHByb3AsIFwiPVwiLCB2YWx1ZSk7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHRpZiAoIHBhcmFtc1sgJ2RpZmZ1c2UnIF0gKSB7XHJcblx0XHRcdGlmICggIXBhcmFtc1sgJ2FtYmllbnQnIF0pIHBhcmFtc1sgJ2FtYmllbnQnIF0gPSBwYXJhbXNbICdkaWZmdXNlJyBdO1xyXG5cdFx0XHRwYXJhbXNbICdjb2xvcicgXSA9IHBhcmFtc1sgJ2RpZmZ1c2UnIF07XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdGNvbnNvbGUubG9nKFwiTUFUTmFtZVwiLCBtYXROYW1lKTtcclxuXHRcdHRoaXMubWF0ZXJpYWxzWyBtYXROYW1lIF0gPSBuZXcgVEhSRUUuTWVzaFBob25nTWF0ZXJpYWwoIHBhcmFtcyApOyAvL3BlciBwaXhlbCBsaWdodGluZ1xyXG5cdFx0Ly8gdGhpcy5tYXRlcmlhbHNbIG1hdE5hbWUgXSA9IG5ldyBUSFJFRS5NZXNoTGFtYmVydE1hdGVyaWFsKCBwYXJhbXMgKTsgLy9wZXIgdmVydGV4IGxpZ2h0aW5nXHJcblx0XHRzY29wZS5nYy5jb2xsZWN0KCB0aGlzLm1hdGVyaWFsc1ttYXROYW1lXSApO1xyXG5cdFx0cmV0dXJuIHRoaXMubWF0ZXJpYWxzWyBtYXROYW1lIF07XHJcblx0XHRcclxuXHRcdFxyXG5cdFx0ZnVuY3Rpb24gX190ZXh0dXJlTWFwKGFyZ3MpIHtcclxuXHRcdFx0Y29uc29sZS5sb2coXCJURVggTUFQXCIsIGFyZ3MubWFwKTtcclxuXHRcdFx0XHJcblx0XHRcdGlmIChhcmdzLnRpbWVBcHBsaWNhYmxlKSB7XHJcblx0XHRcdFx0dmFyIG5vdyA9IG1vbWVudCgpO1xyXG5cdFx0XHRcdGlmIChtb21lbnQuaXNCZWZvcmUoYXJncy50aW1lQXBwbGljYWJsZVswXSkgfHwgbW9tZW50LmlzQWZ0ZXIoYXJncy50aW1lQXBwbGljYWJsZVsxXSkpIHtcclxuXHRcdFx0XHRcdHJldHVybiBudWxsOyAvL0lnbm9yZSB0aGlzIG1hcCwgaWYgdGltZSBpcyBub3QgYXBwbGljYWJsZSB0byBpdFxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0Ly9UT0RPIGhhbmRsZSBjdWJtYXBzISBuZXcgVEhSRUUuVGV4dHVyZShbc2V0IG9mIDYgaW1hZ2VzXSk7XHJcblx0XHRcdFxyXG5cdFx0XHQvL1RPRE8gbG9vayBpbnRvIGh0dHA6Ly90aHJlZWpzLm9yZy9kb2NzLyNSZWZlcmVuY2UvVGV4dHVyZXMvQ29tcHJlc3NlZFRleHR1cmVcclxuXHRcdFx0Ly8gVXNpbmcgXCIuZGRzXCIgZm9ybWF0P1xyXG5cdFx0XHRcclxuXHRcdFx0dmFyIGltYWdlID0gbmV3IEltYWdlKCk7XHJcblx0XHRcdGltYWdlLnNyYyA9IERFRl9URVhUVVJFO1xyXG5cdFx0XHR2YXIgdGV4dHVyZSA9IG5ldyBUSFJFRS5UZXh0dXJlKGltYWdlKTtcclxuXHRcdFx0dGV4dHVyZS5uYW1lID0gYXJncy5zcmM7XHJcblx0XHRcdHNjb3BlLmdjLmNvbGxlY3QodGV4dHVyZSk7XHJcblx0XHRcdFxyXG5cdFx0XHRjb25zb2xlLmxvZyhcIkNSRUFURSBJTUc6IFwiLCBhcmdzLnNyYyk7XHJcblx0XHRcdGN1cnJlbnRNYXAubWFya0xvYWRpbmcoXCJNVExfXCIrYXJncy5zcmMsIFwiTUFQVEVYXCIpO1xyXG5cdFx0XHRzY29wZS5sb2FkVGV4dHVyZShhcmdzLnNyYywgZnVuY3Rpb24odXJsKXtcclxuXHRcdFx0XHQvLyBFdmVuIHRob3VnaCB0aGUgaW1hZ2VzIGFyZSBpbiBtZW1vcnksIGFwcGFyZW50bHkgdGhleSBzdGlsbCBhcmVuJ3QgXCJsb2FkZWRcIlxyXG5cdFx0XHRcdC8vIGF0IHRoZSBwb2ludCB3aGVuIHRoZXkgYXJlIGFzc2lnbmVkIHRvIHRoZSBzcmMgYXR0cmlidXRlLlxyXG5cdFx0XHRcdGNvbnNvbGUubG9nKFwiRklOSVNIIENSRUFURSBJTUc6IFwiLCBhcmdzLnNyYyk7XHJcblx0XHRcdFx0aW1hZ2Uub24oXCJsb2FkXCIsIGZ1bmN0aW9uKCl7XHJcblx0XHRcdFx0XHR0ZXh0dXJlLm5lZWRzVXBkYXRlID0gdHJ1ZTtcclxuXHRcdFx0XHRcdGN1cnJlbnRNYXAubWFya0xvYWRGaW5pc2hlZChcIk1UTF9cIithcmdzLnNyYywgXCJNQVBURVhcIik7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdFx0aW1hZ2Uuc3JjID0gdXJsO1xyXG5cdFx0XHRcdC8vIGltYWdlID0gZW5zdXJlUG93ZXJPZlR3b18oIGltYWdlICk7XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0dGV4dHVyZS5pbWFnZSA9IGltYWdlO1xyXG5cdFx0XHRcdHRleHR1cmUubmVlZHNVcGRhdGUgPSB0cnVlO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0XHJcblx0XHRcdGlmICghYXJncy5jbGFtcCkgeyAvL3VuZGVmaW5lZCBvciBmYWxzZVxyXG5cdFx0XHRcdHRleHR1cmUud3JhcFMgPSBUSFJFRS5SZXBlYXRXcmFwcGluZztcclxuXHRcdFx0XHR0ZXh0dXJlLndyYXBUID0gVEhSRUUuUmVwZWF0V3JhcHBpbmc7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0dGV4dHVyZS53cmFwUyA9IFRIUkVFLkNsYW1wVG9FZGdlV3JhcHBpbmc7XHJcblx0XHRcdFx0dGV4dHVyZS53cmFwVCA9IFRIUkVFLkNsYW1wVG9FZGdlV3JhcHBpbmc7XHJcblx0XHRcdH1cclxuXHRcdFx0XHJcblx0XHRcdHRleHR1cmUubWFnRmlsdGVyID0gVEhSRUUuTmVhcmVzdEZpbHRlcjtcclxuXHRcdFx0dGV4dHVyZS5taW5GaWx0ZXIgPSBUSFJFRS5OZWFyZXN0TWlwTWFwTGluZWFyRmlsdGVyO1xyXG5cdFx0XHRcclxuXHRcdFx0aWYgKGFyZ3NbJ29fdSddIHx8IGFyZ3NbJ29fdiddKSB7XHJcblx0XHRcdFx0dGV4dHVyZS5vZmZzZXQgPSBuZXcgVmVjdG9yMihhcmdzWydvX3UnXSB8fCAwLCBhcmdzWydvX3YnXSB8fCAwKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0Ly8gdGV4dHVyZS5hbmlzb3Ryb3B5ID0gMTY7XHJcblx0XHRcdFxyXG5cdFx0XHRyZXR1cm4gdGV4dHVyZTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0ZnVuY3Rpb24gX19zcGxpdFRleEFyZyhhcmcpIHtcclxuXHRcdFx0dmFyIGNvbXBzID0gYXJnLnNwbGl0KFwiIFwiKTtcclxuXHRcdFx0dmFyIHRleERlZiA9IHt9O1xyXG5cdFx0XHQvLyBodHRwOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL1dhdmVmcm9udF8ub2JqX2ZpbGUjVGV4dHVyZV9vcHRpb25zXHJcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgY29tcHMubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0XHRzd2l0Y2ggKGNvbXBzW2ldKSB7XHJcblx0XHRcdFx0XHRjYXNlIFwiLWJsZW5kdVwiOiBcclxuXHRcdFx0XHRcdFx0dGV4RGVmW1wiYmxlbmR1XCJdID0gKGNvbXBzW2krMV0gIT0gXCJvZmZcIik7XHJcblx0XHRcdFx0XHRcdGkgKz0gMTsgYnJlYWs7IC8vY29uc3VtZSB0aGUgYXJndW1lbnRcclxuXHRcdFx0XHRcdGNhc2UgXCItYmxlbmR2XCI6XHJcblx0XHRcdFx0XHRcdHRleERlZltcImJsZW5kdlwiXSA9IChjb21wc1tpKzFdICE9IFwib2ZmXCIpO1xyXG5cdFx0XHRcdFx0XHRpICs9IDE7IGJyZWFrO1xyXG5cdFx0XHRcdFx0Y2FzZSBcIi1ib29zdFwiOlxyXG5cdFx0XHRcdFx0XHR0ZXhEZWZbXCJib29zdFwiXSA9IHBhcnNlRmxvYXQoY29tcHNbaSsxXSk7XHJcblx0XHRcdFx0XHRcdGkgKz0gMTsgYnJlYWs7XHJcblx0XHRcdFx0XHRjYXNlIFwiLW1tXCI6XHJcblx0XHRcdFx0XHRcdHRleERlZltcIm1tX2Jhc2VcIl0gPSBwYXJzZUZsb2F0KGNvbXBzW2krMV0pO1xyXG5cdFx0XHRcdFx0XHR0ZXhEZWZbXCJtbV9nYWluXCJdID0gcGFyc2VGbG9hdChjb21wc1tpKzJdKTtcclxuXHRcdFx0XHRcdFx0aSArPSAyOyBicmVhaztcclxuXHRcdFx0XHRcdGNhc2UgXCItb1wiOlxyXG5cdFx0XHRcdFx0XHR0ZXhEZWZbXCJvX3VcIl0gPSBwYXJzZUZsb2F0KGNvbXBzW2krMV0pO1xyXG5cdFx0XHRcdFx0XHR0ZXhEZWZbXCJvX3ZcIl0gPSBwYXJzZUZsb2F0KGNvbXBzW2krMl0pOyAvL3RlY2huaWNhbGx5IG9wdGlvbmFsXHJcblx0XHRcdFx0XHRcdHRleERlZltcIm9fd1wiXSA9IHBhcnNlRmxvYXQoY29tcHNbaSszXSk7IC8vdGVjaG5pY2FsbHkgb3B0aW9uYWxcclxuXHRcdFx0XHRcdFx0aSArPSAzOyBicmVhaztcclxuXHRcdFx0XHRcdGNhc2UgXCItc1wiOlxyXG5cdFx0XHRcdFx0XHR0ZXhEZWZbXCJzX3VcIl0gPSBwYXJzZUZsb2F0KGNvbXBzW2krMV0pO1xyXG5cdFx0XHRcdFx0XHR0ZXhEZWZbXCJzX3ZcIl0gPSBwYXJzZUZsb2F0KGNvbXBzW2krMl0pOyAvL3RlY2huaWNhbGx5IG9wdGlvbmFsXHJcblx0XHRcdFx0XHRcdHRleERlZltcInNfd1wiXSA9IHBhcnNlRmxvYXQoY29tcHNbaSszXSk7IC8vdGVjaG5pY2FsbHkgb3B0aW9uYWxcclxuXHRcdFx0XHRcdFx0aSArPSAzOyBicmVhaztcclxuXHRcdFx0XHRcdGNhc2UgXCItdFwiOlxyXG5cdFx0XHRcdFx0XHR0ZXhEZWZbXCJ0X3VcIl0gPSBwYXJzZUZsb2F0KGNvbXBzW2krMV0pO1xyXG5cdFx0XHRcdFx0XHR0ZXhEZWZbXCJ0X3ZcIl0gPSBwYXJzZUZsb2F0KGNvbXBzW2krMl0pOyAvL3RlY2huaWNhbGx5IG9wdGlvbmFsXHJcblx0XHRcdFx0XHRcdHRleERlZltcInRfd1wiXSA9IHBhcnNlRmxvYXQoY29tcHNbaSszXSk7IC8vdGVjaG5pY2FsbHkgb3B0aW9uYWxcclxuXHRcdFx0XHRcdFx0aSArPSAzOyBicmVhaztcclxuXHRcdFx0XHRcdGNhc2UgXCItdGV4cmVzXCI6XHJcblx0XHRcdFx0XHRcdHRleERlZltcInRleHJlc1wiXSA9IGNvbXBzW2krMV07XHJcblx0XHRcdFx0XHRcdGkgKz0gMTsgYnJlYWs7XHJcblx0XHRcdFx0XHRjYXNlIFwiLWNsYW1wXCI6XHJcblx0XHRcdFx0XHRcdHRleERlZltcImNsYW1wXCJdID0gKGNvbXBzW2krMV0gPT0gXCJvblwiKTsgLy9kZWZhdWx0IG9mZlxyXG5cdFx0XHRcdFx0XHRpICs9IDE7IGJyZWFrO1xyXG5cdFx0XHRcdFx0Y2FzZSBcIi1ibVwiOlxyXG5cdFx0XHRcdFx0XHR0ZXhEZWZbXCJibVwiXSA9IHBhcnNlRmxvYXQoY29tcHNbaSsxXSk7XHJcblx0XHRcdFx0XHRcdGkgKz0gMTsgYnJlYWs7XHJcblx0XHRcdFx0XHRjYXNlIFwiLWltZmNoYW5cIjpcclxuXHRcdFx0XHRcdFx0dGV4RGVmW1wiaW1mY2hhblwiXSA9IGNvbXBzW2krMV07XHJcblx0XHRcdFx0XHRcdGkgKz0gMTsgYnJlYWs7XHJcblx0XHRcdFx0XHRjYXNlIFwiLXR5cGVcIjpcclxuXHRcdFx0XHRcdFx0dGV4RGVmW1widHlwZVwiXSA9IGNvbXBzW2krMV07XHJcblx0XHRcdFx0XHRcdGkgKz0gMTsgYnJlYWs7XHJcblx0XHRcdFx0XHRcclxuXHRcdFx0XHRcdC8vIEN1c3RvbSBwcm9wZXJ0aWVzXHJcblx0XHRcdFx0XHRjYXNlIFwiLXRpbWVhcHBcIjogIC8vVGltZSBhcHBsaWNhYmxlXHJcblx0XHRcdFx0XHRcdC8vIC10aW1lYXBwIFtzdGFydFRpbWVdIFtlbmRUaW1lXVxyXG5cdFx0XHRcdFx0XHQvLyAgIHdoZXJlIHRoZSB0aW1lcyBhcmUgZm9ybWF0dGVkIGFzIGZvbGxvd3M6IG0wMFtkMDBbaDAwW20wMF1dXVxyXG5cdFx0XHRcdFx0XHQvLyAgIGVhY2ggc2VjdGlvbiBpbiBzZXF1ZW5jZSBpcyBvcHRpb25hbFxyXG5cdFx0XHRcdFx0XHQvLyBzdGFydFRpbWUgPSBzdGFydCBvZiB0aGUgdGltZSwgaW5jbHVzaXZlLCB3aGVuIHRoZSBnaXZlbiB0ZXh0dXJlIGlzIGFwcGxpY2FibGVcclxuXHRcdFx0XHRcdFx0Ly8gZW5kVGltZSA9IGVuZCBvZiB0aGUgdGltZSwgaW5jbHVzaXZlLCB3aGVuIHRoZSBnaXZlbiB0ZXh0dXJlIGlzIGFwcGxpY2FibGVcclxuXHRcdFx0XHRcdFx0dmFyIHN0YXJ0VGltZSA9IGNvbXBzW2krMV07XHJcblx0XHRcdFx0XHRcdHZhciBlbmRUaW1lID0gY29tcHNbaSsyXTtcclxuXHRcdFx0XHRcdFx0aSArPSAyO1xyXG5cdFx0XHRcdFx0XHRcclxuXHRcdFx0XHRcdFx0Ly90ZXhEZWZbXCJ0aW1lYXBwXCJdID0gW2NvbXBzW2krMV0sIGNvbXBzW2krMl1dO1xyXG5cdFx0XHRcdFx0XHR2YXIgc3QsIGVuZDtcclxuXHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdHZhciByZXMgPSAvbShcXGRcXGQpKD86ZChcXGRcXGQpKD86aChcXGRcXGQpKD86bShcXGRcXGQpKT8pPyk/L2kuZXhlYyhzdGFydFRpbWUpO1xyXG5cdFx0XHRcdFx0XHRcdGlmICghcmVzKSB0aHJvdyBuZXcgRXJyb3IoXCJJbnZhbGlkIHRpbWVzdGFtcCBmb3IgLXRpbWVhcHAgc3RhcnRUaW1lXCIpO1xyXG5cdFx0XHRcdFx0XHRcdHN0ID0gbW9tZW50KCkubW9udGgocmVzWzFdKS5zdGFydE9mKFwibW9udGhcIik7XHJcblx0XHRcdFx0XHRcdFx0aWYgKHJlc1syXSkgeyBzdC5kYXRlKHJlc1syXSk7IH1cclxuXHRcdFx0XHRcdFx0XHRpZiAocmVzWzNdKSB7IHN0LmhvdXIocmVzWzNdKTsgfVxyXG5cdFx0XHRcdFx0XHRcdGlmIChyZXNbNF0pIHsgc3QubWludXRlKHJlc1s0XSk7IH1cclxuXHRcdFx0XHRcdFx0fXtcclxuXHRcdFx0XHRcdFx0XHR2YXIgcmVzID0gL20oXFxkXFxkKSg/OmQoXFxkXFxkKSg/OmgoXFxkXFxkKSg/Om0oXFxkXFxkKSk/KT8pPy9pLmV4ZWMoZW5kVGltZSk7XHJcblx0XHRcdFx0XHRcdFx0aWYgKCFyZXMpIHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgdGltZXN0YW1wIGZvciAtdGltZWFwcCBlbmRUaW1lXCIpO1xyXG5cdFx0XHRcdFx0XHRcdGVuZCA9IG1vbWVudCgpLm1vbnRoKHJlc1sxXSkuZW5kT2YoXCJtb250aFwiKTtcclxuXHRcdFx0XHRcdFx0XHRpZiAocmVzWzJdKSB7IGVuZC5kYXRlKHJlc1syXSkuZW5kT2YoXCJkYXlcIik7IH1cclxuXHRcdFx0XHRcdFx0XHRpZiAocmVzWzNdKSB7IGVuZC5ob3VyKHJlc1szXSkuZW5kT2YoXCJob3VyXCIpOyB9XHJcblx0XHRcdFx0XHRcdFx0aWYgKHJlc1s0XSkgeyBlbmQubWludXRlKHJlc1s0XSkuZW5kT2YoXCJtaW51dGVcIik7IH1cclxuXHRcdFx0XHRcdFx0XHRcclxuXHRcdFx0XHRcdFx0XHRpZiAoZW5kLmlzQmVmb3JlKHN0KSkgZW5kLmFkZCgxLCBcInllYXJcIik7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0dGV4RGVmW1widGltZUFwcGxpY2FibGVcIl0gPSBbc3QsIGVuZF07XHJcblx0XHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0ZGVmYXVsdDpcclxuXHRcdFx0XHRcdFx0Ly9Bc3N1bWUgdGhlIHNvdXJjZSBpcyB0aGUgbGFzdCB0aGluZyB3ZSdsbCBmaW5kXHJcblx0XHRcdFx0XHRcdHRleERlZi5zcmMgPSBjb21wcy5zbGljZShpKS5qb2luKFwiIFwiKTtcclxuXHRcdFx0XHRcdFx0dGV4RGVmLmFyZ3MgPSBjb21wcy5zbGljZSgwLCBpKS5qb2luKFwiIFwiKTtcclxuXHRcdFx0XHRcdFx0cmV0dXJuIHRleERlZjtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdFx0cmV0dXJuIHRleERlZjtcclxuXHRcdH1cclxuXHR9LFxyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBNdGxMb2FkZXI7XHJcbiIsIi8vIG9iai1sb2FkZXIuanNcclxuLy8gQSBUSFJFRS5qcyB3YXZlZnJvbnQgb2JqZWN0IGxvYWRlclxyXG4vLyBDb3BpZWQgbW9zdGx5IHdob2xlc2FsZSBmcm9tIHRoZSB0aHJlZS5qcyBleGFtcGxlcyBmb2xkZXIuXHJcbi8vIE9yaWdpbmFsIGF1dGhvcnM6IG1yZG9vYiwgYW5nZWx4dWFuY2hhbmdcclxuXHJcbnZhciBtb21lbnQgPSByZXF1aXJlKFwibW9tZW50XCIpO1xyXG52YXIgaW5oZXJpdHMgPSByZXF1aXJlKFwiaW5oZXJpdHNcIik7XHJcbnZhciBleHRlbmQgPSByZXF1aXJlKFwiZXh0ZW5kXCIpO1xyXG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZShcImV2ZW50c1wiKS5FdmVudEVtaXR0ZXI7XHJcblxyXG52YXIgTXRsTG9hZGVyID0gcmVxdWlyZShcIi4vbXRsLWxvYWRlclwiKTtcclxuXHJcbmZ1bmN0aW9uIE9iakxvYWRlcihvYmpmaWxlLCBtdGxmaWxlLCBmaWxlU3lzLCBvcHRzKSB7XHJcblx0RXZlbnRFbWl0dGVyLmNhbGwodGhpcyk7XHJcblx0ZXh0ZW5kKHRoaXMsIG9wdHMpO1xyXG5cdFxyXG5cdHRoaXMub2JqZmlsZSA9IG9iamZpbGU7XHJcblx0dGhpcy5tdGxmaWxlID0gbXRsZmlsZTtcclxuXHR0aGlzLmZpbGVTeXMgPSBmaWxlU3lzO1xyXG5cdFxyXG5cdGlmIChvcHRzLmdjKSB7XHJcblx0XHRpZiAodHlwZW9mIG9wdHMuZ2MgPT0gXCJzdHJpbmdcIilcclxuXHRcdFx0dGhpcy5nYyA9IEdDLmdldEJpbihvcHRzLmdjKTtcclxuXHRcdGVsc2VcclxuXHRcdFx0dGhpcy5nYyA9IG9wdHMuZ2M7XHJcblx0fSBlbHNlIHtcclxuXHRcdHRoaXMuZ2MgPSBHQy5nZXRCaW4oKTtcclxuXHR9XHJcblx0XHJcbn07XHJcbmluaGVyaXRzKE9iakxvYWRlciwgRXZlbnRFbWl0dGVyKTtcclxuZXh0ZW5kKE9iakxvYWRlci5wcm90b3R5cGUsIHtcclxuXHRvYmpmaWxlIDogbnVsbCxcclxuXHRtdGxmaWxlIDogbnVsbCxcclxuXHRmaWxlU3lzIDogbnVsbCxcclxuXHRcclxuXHRsb2FkOiBmdW5jdGlvbigpIHtcclxuXHRcdGlmICghKHRoaXMub2JqZmlsZSAmJiB0aGlzLm10bGZpbGUpKSBcclxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiTm8gT0JKIGZpbGUgb3IgTVRMIGZpbGUgZ2l2ZW4hXCIpO1xyXG5cdFx0XHJcblx0XHR2YXIgc2NvcGUgPSB0aGlzO1xyXG5cdFx0dmFyIG10bExvYWRlciA9IG5ldyBNdGxMb2FkZXIodGhpcy5tdGxmaWxlLCB0aGlzLmZpbGVTeXMsIHtcclxuXHRcdFx0XCJnY1wiOiB0aGlzLmdjLFxyXG5cdFx0fSk7XHJcblx0XHRtdGxMb2FkZXIub24oXCJsb2FkXCIsIGZ1bmN0aW9uKG1hdExpYikge1xyXG5cdFx0XHRcclxuXHRcdFx0bWF0TGliLnByZWxvYWQoKTtcclxuXHRcdFx0XHJcblx0XHRcdHZhciBvYmplY3QgPSBzY29wZS5wYXJzZShzY29wZS5vYmpmaWxlKTtcclxuXHRcdFx0b2JqZWN0LnRyYXZlcnNlKGZ1bmN0aW9uKG9iamVjdCl7XHJcblx0XHRcdFx0aWYgKG9iamVjdCBpbnN0YW5jZW9mIFRIUkVFLk1lc2gpIHtcclxuXHRcdFx0XHRcdGlmIChvYmplY3QubWF0ZXJpYWwubmFtZSkge1xyXG5cdFx0XHRcdFx0XHR2YXIgbWF0ID0gbWF0TGliLmNyZWF0ZShvYmplY3QubWF0ZXJpYWwubmFtZSk7XHJcblx0XHRcdFx0XHRcdGlmIChtYXQpIG9iamVjdC5tYXRlcmlhbCA9IG1hdDtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdG9iamVjdC5yZWNlaXZlU2hhZG93ID0gdHJ1ZTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cdFx0XHRvYmplY3QubmFtZSA9IFwiTG9hZGVkIE1lc2hcIjtcclxuXHRcdFx0XHJcblx0XHRcdHNjb3BlLmVtaXQoXCJsb2FkXCIsIG9iamVjdCk7XHJcblx0XHR9KTtcclxuXHRcdG10bExvYWRlci5vbihcImVycm9yXCIsIGZ1bmN0aW9uKGUpe1xyXG5cdFx0XHRzY29wZS5lbWl0KFwiZXJyb3JcIiwgZSk7XHJcblx0XHR9KTtcclxuXHRcdG10bExvYWRlci5sb2FkKCk7XHJcblx0fSxcclxufSk7XHJcblxyXG4vL1RoZXNlIHdvdWxkIGJlIENPTlNUUyBpbiBub2RlLmpzLCBidXQgd2UncmUgaW4gdGhlIGJyb3dzZXIgbm93OlxyXG5cclxuLy8gdiBmbG9hdCBmbG9hdCBmbG9hdFxyXG52YXIgVkVSVEVYX1BBVFRFUk4gPSAvdiggK1tcXGR8XFwufFxcK3xcXC18ZV0rKSggK1tcXGR8XFwufFxcK3xcXC18ZV0rKSggK1tcXGR8XFwufFxcK3xcXC18ZV0rKS87XHJcblxyXG4vLyB2biBmbG9hdCBmbG9hdCBmbG9hdFxyXG52YXIgTk9STUFMX1BBVFRFUk4gPSAvdm4oICtbXFxkfFxcLnxcXCt8XFwtfGVdKykoICtbXFxkfFxcLnxcXCt8XFwtfGVdKykoICtbXFxkfFxcLnxcXCt8XFwtfGVdKykvO1xyXG5cclxuLy8gdnQgZmxvYXQgZmxvYXRcclxudmFyIFVWX1BBVFRFUk4gPSAvdnQoICtbXFxkfFxcLnxcXCt8XFwtfGVdKykoICtbXFxkfFxcLnxcXCt8XFwtfGVdKykvO1xyXG5cclxuLy8gZiB2ZXJ0ZXggdmVydGV4IHZlcnRleCAuLi5cclxudmFyIEZBQ0VfUEFUVEVSTjEgPSAvZiggK1xcZCspKCArXFxkKykoICtcXGQrKSggK1xcZCspPy87XHJcblxyXG4vLyBmIHZlcnRleC91diB2ZXJ0ZXgvdXYgdmVydGV4L3V2IC4uLlxyXG52YXIgRkFDRV9QQVRURVJOMiA9IC9mKCArKFxcZCspXFwvKFxcZCspKSggKyhcXGQrKVxcLyhcXGQrKSkoICsoXFxkKylcXC8oXFxkKykpKCArKFxcZCspXFwvKFxcZCspKT8vO1xyXG5cclxuLy8gZiB2ZXJ0ZXgvdXYvbm9ybWFsIHZlcnRleC91di9ub3JtYWwgdmVydGV4L3V2L25vcm1hbCAuLi5cclxudmFyIEZBQ0VfUEFUVEVSTjMgPSAvZiggKyhcXGQrKVxcLyhcXGQrKVxcLyhcXGQrKSkoICsoXFxkKylcXC8oXFxkKylcXC8oXFxkKykpKCArKFxcZCspXFwvKFxcZCspXFwvKFxcZCspKSggKyhcXGQrKVxcLyhcXGQrKVxcLyhcXGQrKSk/LztcclxuXHJcbi8vIGYgdmVydGV4Ly9ub3JtYWwgdmVydGV4Ly9ub3JtYWwgdmVydGV4Ly9ub3JtYWwgLi4uIFxyXG52YXIgRkFDRV9QQVRURVJONCA9IC9mKCArKFxcZCspXFwvXFwvKFxcZCspKSggKyhcXGQrKVxcL1xcLyhcXGQrKSkoICsoXFxkKylcXC9cXC8oXFxkKykpKCArKFxcZCspXFwvXFwvKFxcZCspKT8vXHJcblxyXG5cclxuT2JqTG9hZGVyLnByb3RvdHlwZS5wYXJzZSA9IGZ1bmN0aW9uKGRhdGEpIHtcclxuXHR2YXIgc2VsZiA9IHRoaXM7XHJcblx0XHJcblx0dmFyIGZhY2Vfb2Zmc2V0ID0gMDtcclxuXHRcclxuXHR2YXIgZ3JvdXAgPSBuZXcgVEhSRUUuT2JqZWN0M0QoKTtcclxuXHR2YXIgb2JqZWN0ID0gZ3JvdXA7XHJcblx0XHJcblx0dmFyIGdlb21ldHJ5ID0gbmV3IFRIUkVFLkdlb21ldHJ5KCk7XHJcblx0dmFyIG1hdGVyaWFsID0gbmV3IFRIUkVFLk1lc2hMYW1iZXJ0TWF0ZXJpYWwoKTtcclxuXHR2YXIgbWVzaCA9IG5ldyBUSFJFRS5NZXNoKCBnZW9tZXRyeSwgbWF0ZXJpYWwgKTtcclxuXHRcclxuXHR2YXIgdmVydGljZXMgPSBbXTtcclxuXHR2YXIgdmVydGljZXNDb3VudCA9IDA7XHJcblx0dmFyIG5vcm1hbHMgPSBbXTtcclxuXHR2YXIgdXZzID0gW107XHJcblx0XHJcblx0Ly9CZWdpbiBwYXJzaW5nIGhlcmVcclxuXHJcblx0dmFyIGxpbmVzID0gZGF0YS5zcGxpdCggXCJcXG5cIiApO1xyXG5cdGZvciAoIHZhciBpID0gMDsgaSA8IGxpbmVzLmxlbmd0aDsgaSArKyApIHtcclxuXHRcdHZhciBsaW5lID0gbGluZXNbIGkgXTtcclxuXHRcdGxpbmUgPSBsaW5lLnRyaW0oKTtcclxuXHRcdFxyXG5cdFx0dmFyIHJlc3VsdDtcclxuXHRcdFxyXG5cdFx0aWYgKGxpbmUubGVuZ3RoID09IDAgfHwgbGluZS5jaGFyQXQoMCkgPT0gXCIjXCIpIFxyXG5cdFx0XHRjb250aW51ZTtcclxuXHRcdGVsc2UgXHJcblx0XHRpZiAoKHJlc3VsdCA9IFZFUlRFWF9QQVRURVJOLmV4ZWMobGluZSkpICE9PSBudWxsKSB7XHJcblx0XHRcdC8vIFtcInYgMS4wIDIuMCAzLjBcIiwgXCIxLjBcIiwgXCIyLjBcIiwgXCIzLjBcIl1cclxuXHRcdFx0dmVydGljZXMucHVzaCh2ZWN0b3IoXHJcblx0XHRcdFx0cGFyc2VGbG9hdChyZXN1bHRbIDEgXSksXHJcblx0XHRcdFx0cGFyc2VGbG9hdChyZXN1bHRbIDIgXSksXHJcblx0XHRcdFx0cGFyc2VGbG9hdChyZXN1bHRbIDMgXSlcclxuXHRcdFx0KSk7XHJcblx0XHR9IGVsc2VcclxuXHRcdGlmICgocmVzdWx0ID0gTk9STUFMX1BBVFRFUk4uZXhlYyhsaW5lKSkgIT09IG51bGwgKSB7XHJcblx0XHRcdC8vIFtcInZuIDEuMCAyLjAgMy4wXCIsIFwiMS4wXCIsIFwiMi4wXCIsIFwiMy4wXCJdXHJcblx0XHRcdG5vcm1hbHMucHVzaCh2ZWN0b3IoXHJcblx0XHRcdFx0cGFyc2VGbG9hdChyZXN1bHRbIDEgXSksXHJcblx0XHRcdFx0cGFyc2VGbG9hdChyZXN1bHRbIDIgXSksXHJcblx0XHRcdFx0cGFyc2VGbG9hdChyZXN1bHRbIDMgXSlcclxuXHRcdFx0KSk7XHJcblx0XHR9IGVsc2VcclxuXHRcdGlmICgocmVzdWx0ID0gVVZfUEFUVEVSTi5leGVjKGxpbmUpKSAhPT0gbnVsbCApIHtcclxuXHRcdFx0Ly8gW1widnQgMC4xIDAuMlwiLCBcIjAuMVwiLCBcIjAuMlwiXVxyXG5cdFx0XHR1dnMucHVzaCh1dihcclxuXHRcdFx0XHRwYXJzZUZsb2F0KHJlc3VsdFsgMSBdKSxcclxuXHRcdFx0XHRwYXJzZUZsb2F0KHJlc3VsdFsgMiBdKVxyXG5cdFx0XHQpKTtcclxuXHRcdH0gZWxzZVxyXG5cdFx0aWYgKChyZXN1bHQgPSBGQUNFX1BBVFRFUk4xLmV4ZWMobGluZSkpICE9PSBudWxsICkge1xyXG5cdFx0XHQvLyBbXCJmIDEgMiAzXCIsIFwiMVwiLCBcIjJcIiwgXCIzXCIsIHVuZGVmaW5lZF1cclxuXHRcdFx0aGFuZGxlX2ZhY2VfbGluZShbIHJlc3VsdFsgMSBdLCByZXN1bHRbIDIgXSwgcmVzdWx0WyAzIF0sIHJlc3VsdFsgNCBdIF0pO1xyXG5cdFx0fSBlbHNlIFxyXG5cdFx0aWYgKChyZXN1bHQgPSBGQUNFX1BBVFRFUk4yLmV4ZWMobGluZSkpICE9PSBudWxsICkge1xyXG5cdFx0XHQvLyBbXCJmIDEvMSAyLzIgMy8zXCIsIFwiIDEvMVwiLCBcIjFcIiwgXCIxXCIsIFwiIDIvMlwiLCBcIjJcIiwgXCIyXCIsIFwiIDMvM1wiLCBcIjNcIiwgXCIzXCIsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCB1bmRlZmluZWRdXHJcblx0XHRcdGhhbmRsZV9mYWNlX2xpbmUoXHJcblx0XHRcdFx0WyByZXN1bHRbIDIgXSwgcmVzdWx0WyA1IF0sIHJlc3VsdFsgOCBdLCByZXN1bHRbIDExIF0gXSwgLy9mYWNlc1xyXG5cdFx0XHRcdFsgcmVzdWx0WyAzIF0sIHJlc3VsdFsgNiBdLCByZXN1bHRbIDkgXSwgcmVzdWx0WyAxMiBdIF0gLy91dlxyXG5cdFx0XHQpO1xyXG5cdFx0fSBlbHNlXHJcblx0XHRpZiAoKHJlc3VsdCA9IEZBQ0VfUEFUVEVSTjMuZXhlYyhsaW5lKSkgIT09IG51bGwgKSB7XHJcblx0XHRcdC8vIFtcImYgMS8xLzEgMi8yLzIgMy8zLzNcIiwgXCIgMS8xLzFcIiwgXCIxXCIsIFwiMVwiLCBcIjFcIiwgXCIgMi8yLzJcIiwgXCIyXCIsIFwiMlwiLCBcIjJcIiwgXCIgMy8zLzNcIiwgXCIzXCIsIFwiM1wiLCBcIjNcIiwgdW5kZWZpbmVkLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgdW5kZWZpbmVkXVxyXG5cdFx0XHRoYW5kbGVfZmFjZV9saW5lKFxyXG5cdFx0XHRcdFsgcmVzdWx0WyAyIF0sIHJlc3VsdFsgNiBdLCByZXN1bHRbIDEwIF0sIHJlc3VsdFsgMTQgXSBdLCAvL2ZhY2VzXHJcblx0XHRcdFx0WyByZXN1bHRbIDMgXSwgcmVzdWx0WyA3IF0sIHJlc3VsdFsgMTEgXSwgcmVzdWx0WyAxNSBdIF0sIC8vdXZcclxuXHRcdFx0XHRbIHJlc3VsdFsgNCBdLCByZXN1bHRbIDggXSwgcmVzdWx0WyAxMiBdLCByZXN1bHRbIDE2IF0gXSAvL25vcm1hbFxyXG5cdFx0XHQpO1xyXG5cdFx0fSBlbHNlXHJcblx0XHRpZiAoKHJlc3VsdCA9IEZBQ0VfUEFUVEVSTjQuZXhlYyhsaW5lKSkgIT09IG51bGwgKSB7XHJcblx0XHRcdC8vIFtcImYgMS8vMSAyLy8yIDMvLzNcIiwgXCIgMS8vMVwiLCBcIjFcIiwgXCIxXCIsIFwiIDIvLzJcIiwgXCIyXCIsIFwiMlwiLCBcIiAzLy8zXCIsIFwiM1wiLCBcIjNcIiwgdW5kZWZpbmVkLCB1bmRlZmluZWQsIHVuZGVmaW5lZF1cclxuXHRcdFx0aGFuZGxlX2ZhY2VfbGluZShcclxuXHRcdFx0XHRbIHJlc3VsdFsgMiBdLCByZXN1bHRbIDUgXSwgcmVzdWx0WyA4IF0sIHJlc3VsdFsgMTEgXSBdLCAvL2ZhY2VzXHJcblx0XHRcdFx0WyBdLCAvL3V2XHJcblx0XHRcdFx0WyByZXN1bHRbIDMgXSwgcmVzdWx0WyA2IF0sIHJlc3VsdFsgOSBdLCByZXN1bHRbIDEyIF0gXSAvL25vcm1hbFxyXG5cdFx0XHQpO1xyXG5cdFx0fSBlbHNlXHJcblx0XHRpZiAoIC9ebyAvLnRlc3QobGluZSkpIHtcclxuXHRcdFx0Ly8gb2JqZWN0XHJcblx0XHRcdG1lc2hOKCk7XHJcblx0XHRcdGZhY2Vfb2Zmc2V0ID0gZmFjZV9vZmZzZXQgKyB2ZXJ0aWNlcy5sZW5ndGg7XHJcblx0XHRcdHZlcnRpY2VzID0gW107XHJcblx0XHRcdG9iamVjdCA9IG5ldyBUSFJFRS5PYmplY3QzRCgpO1xyXG5cdFx0XHRvYmplY3QubmFtZSA9IGxpbmUuc3Vic3RyaW5nKCAyICkudHJpbSgpO1xyXG5cdFx0XHRncm91cC5hZGQoIG9iamVjdCApO1xyXG5cdFx0XHRcclxuXHRcdH0gZWxzZVxyXG5cdFx0aWYgKCAvXmcgLy50ZXN0KGxpbmUpKSB7XHJcblx0XHRcdC8vIGdyb3VwXHJcblx0XHRcdC8vIG1lc2hOKCBsaW5lLnN1YnN0cmluZyggMiApLnRyaW0oKSwgdW5kZWZpbmVkICk7XHJcblx0XHRcdG1lc2gubmFtZSA9IGxpbmUuc3Vic3RyaW5nKCAyICkudHJpbSgpO1xyXG5cdFx0XHRcclxuXHRcdH0gZWxzZSBcclxuXHRcdGlmICggL151c2VtdGwgLy50ZXN0KGxpbmUpKSB7XHJcblx0XHRcdC8vIG1hdGVyaWFsXHJcblx0XHRcdG1lc2hOKCB1bmRlZmluZWQsIGxpbmUuc3Vic3RyaW5nKCA3ICkudHJpbSgpICk7XHJcblx0XHRcdFxyXG5cdFx0XHQvLyBtYXRlcmlhbCA9IG5ldyBUSFJFRS5NZXNoTGFtYmVydE1hdGVyaWFsKCk7XHJcblx0XHRcdC8vIG1hdGVyaWFsLm5hbWUgPSBsaW5lLnN1YnN0cmluZyggNyApLnRyaW0oKTtcclxuXHRcdFx0XHJcblx0XHRcdC8vIG1lc2gubWF0ZXJpYWwgPSBtYXRlcmlhbDtcclxuXHJcblx0XHR9IGVsc2UgXHJcblx0XHRpZiAoIC9ebXRsbGliIC8udGVzdChsaW5lKSkge1xyXG5cdFx0XHQvLyBtdGwgZmlsZVxyXG5cdFx0XHQvLyBpZiAoIG10bGxpYkNhbGxiYWNrICkge1xyXG5cdFx0XHQvLyBcdHZhciBtdGxmaWxlID0gbGluZS5zdWJzdHJpbmcoIDcgKTtcclxuXHRcdFx0Ly8gXHRtdGxmaWxlID0gbXRsZmlsZS50cmltKCk7XHJcblx0XHRcdC8vIFx0bXRsbGliQ2FsbGJhY2soIG10bGZpbGUgKTtcclxuXHRcdFx0Ly8gfVxyXG5cdFx0XHRcclxuXHRcdH0gZWxzZSBcclxuXHRcdGlmICggL15zIC8udGVzdChsaW5lKSkge1xyXG5cdFx0XHQvLyBTbW9vdGggc2hhZGluZ1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0Y29uc29sZS5sb2coIFwiVEhSRUUuT0JKTVRMTG9hZGVyOiBVbmhhbmRsZWQgbGluZSBcIiArIGxpbmUgKTtcclxuXHRcdH1cclxuXHR9XHJcblx0XHJcblx0bWVzaE4odW5kZWZpbmVkLCB1bmRlZmluZWQpOyAvL0FkZCBsYXN0IG9iamVjdFxyXG5cdHJldHVybiBncm91cDtcclxuXHJcblxyXG5cdGZ1bmN0aW9uIG1lc2hOKCBtZXNoTmFtZSwgbWF0ZXJpYWxOYW1lICkge1xyXG5cdFx0aWYgKCB2ZXJ0aWNlcy5sZW5ndGggPiAwICYmIGdlb21ldHJ5LmZhY2VzLmxlbmd0aCA+IDAgKSB7XHJcblx0XHRcdGdlb21ldHJ5LnZlcnRpY2VzID0gdmVydGljZXM7XHJcblx0XHRcdFxyXG5cdFx0XHRnZW9tZXRyeS5tZXJnZVZlcnRpY2VzKCk7XHJcblx0XHRcdGdlb21ldHJ5LmNvbXB1dGVGYWNlTm9ybWFscygpO1xyXG5cdFx0XHRnZW9tZXRyeS5jb21wdXRlQm91bmRpbmdCb3goKTtcclxuXHRcdFx0Z2VvbWV0cnkuY29tcHV0ZUJvdW5kaW5nU3BoZXJlKCk7XHJcblx0XHRcdFxyXG5cdFx0XHRvYmplY3QuYWRkKCBtZXNoICk7XHJcblx0XHRcdFxyXG5cdFx0XHRzZWxmLmdjLmNvbGxlY3QoZ2VvbWV0cnkpO1xyXG5cdFx0XHRcclxuXHRcdFx0Z2VvbWV0cnkgPSBuZXcgVEhSRUUuR2VvbWV0cnkoKTtcclxuXHRcdFx0bWVzaCA9IG5ldyBUSFJFRS5NZXNoKCBnZW9tZXRyeSwgbWF0ZXJpYWwgKTtcclxuXHRcdFx0dmVydGljZXNDb3VudCA9IDA7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdC8vIGlmICggbWVzaE5hbWUgIT09IHVuZGVmaW5lZCApIG1lc2gubmFtZSA9IG1lc2hOYW1lO1xyXG5cdFx0XHJcblx0XHRpZiAoIG1hdGVyaWFsTmFtZSAhPT0gdW5kZWZpbmVkICkge1xyXG5cdFx0XHRtYXRlcmlhbCA9IG5ldyBUSFJFRS5NZXNoTGFtYmVydE1hdGVyaWFsKCk7XHJcblx0XHRcdG1hdGVyaWFsLm5hbWUgPSBtYXRlcmlhbE5hbWU7XHJcblx0XHRcdFxyXG5cdFx0XHRtZXNoLm1hdGVyaWFsID0gbWF0ZXJpYWw7XHJcblx0XHR9XHJcblx0fVxyXG5cdFxyXG5cdGZ1bmN0aW9uIGFkZF9mYWNlKCBhLCBiLCBjLCBub3JtYWxzX2luZHMgKSB7XHJcblx0XHRpZiAoIG5vcm1hbHNfaW5kcyA9PT0gdW5kZWZpbmVkICkge1xyXG5cdFx0XHRnZW9tZXRyeS5mYWNlcy5wdXNoKCBmYWNlMyhcclxuXHRcdFx0XHRwYXJzZUludCggYSApIC0gKGZhY2Vfb2Zmc2V0ICsgMSksXHJcblx0XHRcdFx0cGFyc2VJbnQoIGIgKSAtIChmYWNlX29mZnNldCArIDEpLFxyXG5cdFx0XHRcdHBhcnNlSW50KCBjICkgLSAoZmFjZV9vZmZzZXQgKyAxKVxyXG5cdFx0XHQpICk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRnZW9tZXRyeS5mYWNlcy5wdXNoKCBmYWNlMyhcclxuXHRcdFx0XHRwYXJzZUludCggYSApIC0gKGZhY2Vfb2Zmc2V0ICsgMSksXHJcblx0XHRcdFx0cGFyc2VJbnQoIGIgKSAtIChmYWNlX29mZnNldCArIDEpLFxyXG5cdFx0XHRcdHBhcnNlSW50KCBjICkgLSAoZmFjZV9vZmZzZXQgKyAxKSxcclxuXHRcdFx0XHRbXHJcblx0XHRcdFx0XHRub3JtYWxzWyBwYXJzZUludCggbm9ybWFsc19pbmRzWyAwIF0gKSAtIDEgXS5jbG9uZSgpLFxyXG5cdFx0XHRcdFx0bm9ybWFsc1sgcGFyc2VJbnQoIG5vcm1hbHNfaW5kc1sgMSBdICkgLSAxIF0uY2xvbmUoKSxcclxuXHRcdFx0XHRcdG5vcm1hbHNbIHBhcnNlSW50KCBub3JtYWxzX2luZHNbIDIgXSApIC0gMSBdLmNsb25lKClcclxuXHRcdFx0XHRdXHJcblx0XHRcdCkgKTtcclxuXHRcdH1cclxuXHR9XHJcblx0XHJcblx0ZnVuY3Rpb24gYWRkX3V2cyggYSwgYiwgYyApIHtcclxuXHRcdGdlb21ldHJ5LmZhY2VWZXJ0ZXhVdnNbIDAgXS5wdXNoKCBbXHJcblx0XHRcdHV2c1sgcGFyc2VJbnQoIGEgKSAtIDEgXS5jbG9uZSgpLFxyXG5cdFx0XHR1dnNbIHBhcnNlSW50KCBiICkgLSAxIF0uY2xvbmUoKSxcclxuXHRcdFx0dXZzWyBwYXJzZUludCggYyApIC0gMSBdLmNsb25lKClcclxuXHRcdF0gKTtcclxuXHR9XHJcblx0XHJcblx0ZnVuY3Rpb24gaGFuZGxlX2ZhY2VfbGluZShmYWNlcywgdXZzLCBub3JtYWxzX2luZHMpIHtcclxuXHRcdGlmICggZmFjZXNbIDMgXSA9PT0gdW5kZWZpbmVkICkge1xyXG5cdFx0XHRhZGRfZmFjZSggZmFjZXNbIDAgXSwgZmFjZXNbIDEgXSwgZmFjZXNbIDIgXSwgbm9ybWFsc19pbmRzICk7XHJcblx0XHRcdGlmICghKHV2cyA9PT0gdW5kZWZpbmVkKSAmJiB1dnMubGVuZ3RoID4gMCkge1xyXG5cdFx0XHRcdGFkZF91dnMoIHV2c1sgMCBdLCB1dnNbIDEgXSwgdXZzWyAyIF0gKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdGlmICghKG5vcm1hbHNfaW5kcyA9PT0gdW5kZWZpbmVkKSAmJiBub3JtYWxzX2luZHMubGVuZ3RoID4gMCkge1xyXG5cdFx0XHRcdGFkZF9mYWNlKCBmYWNlc1sgMCBdLCBmYWNlc1sgMSBdLCBmYWNlc1sgMyBdLCBbIG5vcm1hbHNfaW5kc1sgMCBdLCBub3JtYWxzX2luZHNbIDEgXSwgbm9ybWFsc19pbmRzWyAzIF0gXSk7XHJcblx0XHRcdFx0YWRkX2ZhY2UoIGZhY2VzWyAxIF0sIGZhY2VzWyAyIF0sIGZhY2VzWyAzIF0sIFsgbm9ybWFsc19pbmRzWyAxIF0sIG5vcm1hbHNfaW5kc1sgMiBdLCBub3JtYWxzX2luZHNbIDMgXSBdKTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRhZGRfZmFjZSggZmFjZXNbIDAgXSwgZmFjZXNbIDEgXSwgZmFjZXNbIDMgXSk7XHJcblx0XHRcdFx0YWRkX2ZhY2UoIGZhY2VzWyAxIF0sIGZhY2VzWyAyIF0sIGZhY2VzWyAzIF0pO1xyXG5cdFx0XHR9XHJcblx0XHRcdFx0XHRcdFxyXG5cdFx0XHRpZiAoISh1dnMgPT09IHVuZGVmaW5lZCkgJiYgdXZzLmxlbmd0aCA+IDApIHtcclxuXHRcdFx0XHRhZGRfdXZzKCB1dnNbIDAgXSwgdXZzWyAxIF0sIHV2c1sgMyBdICk7XHJcblx0XHRcdFx0YWRkX3V2cyggdXZzWyAxIF0sIHV2c1sgMiBdLCB1dnNbIDMgXSApO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG59O1xyXG5cclxuLy9jb252aWVuY2UgZnVuY3Rpb25zXHJcbmZ1bmN0aW9uIHZlY3RvciggeCwgeSwgeiApIHsgcmV0dXJuIG5ldyBUSFJFRS5WZWN0b3IzKCB4LCB5LCB6ICk7IH1cclxuZnVuY3Rpb24gdXYoIHUsIHYgKSB7IHJldHVybiBuZXcgVEhSRUUuVmVjdG9yMiggdSwgdiApOyB9XHJcbmZ1bmN0aW9uIGZhY2UzKCBhLCBiLCBjLCBub3JtYWxzICkgeyByZXR1cm4gbmV3IFRIUkVFLkZhY2UzKCBhLCBiLCBjLCBub3JtYWxzICk7IH1cclxuXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IE9iakxvYWRlcjsiLCIvLyByZW5kZXJsb29wLmpzXHJcbi8vIFRoZSBtb2R1bGUgdGhhdCBoYW5kbGVzIGFsbCB0aGUgY29tbW9uIGNvZGUgdG8gcmVuZGVyIGFuZCBkbyBnYW1lIHRpY2tzIG9uIGEgbWFwXHJcblxyXG52YXIgZXh0ZW5kID0gcmVxdWlyZShcImV4dGVuZFwiKTtcclxudmFyIHJhZiA9IHJlcXVpcmUoXCJyYWZcIik7XHJcbnZhciBjb250cm9sbGVyID0gcmVxdWlyZShcInRwcC1jb250cm9sbGVyXCIpO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSB7XHJcblx0c3RhcnQgOiBmdW5jdGlvbihvcHRzKSB7XHJcblx0XHQvLyBTZXQgdGhlIGNhbnZhcydzIGF0dHJpYnV0ZXMsIGJlY2F1c2UgdGhvc2UgXHJcblx0XHQvLyBBQ1RVQUxMWSBkZXRlcm1pbmUgaG93IGJpZyB0aGUgcmVuZGVyaW5nIGFyZWEgaXMuXHJcblx0XHRpZiAoIW9wdHMuX2Rpc2FibGVUaHJlZSkge1xyXG5cdFx0XHR2YXIgY2FudmFzID0gJChcIiNnYW1lc2NyZWVuXCIpO1xyXG5cdFx0XHRjYW52YXMuYXR0cihcIndpZHRoXCIsIHBhcnNlSW50KGNhbnZhcy5jc3MoXCJ3aWR0aFwiKSkpO1xyXG5cdFx0XHRjYW52YXMuYXR0cihcImhlaWdodFwiLCBwYXJzZUludChjYW52YXMuY3NzKFwiaGVpZ2h0XCIpKSk7XHJcblx0XHRcdFxyXG5cdFx0XHRvcHRzID0gZXh0ZW5kKHtcclxuXHRcdFx0XHRjbGVhckNvbG9yIDogMHgwMDAwMDAsXHJcblx0XHRcdFx0dGlja3NQZXJTZWNvbmQgOiAzMCxcclxuXHRcdFx0fSwgb3B0cyk7XHJcblx0XHRcdFxyXG5cdFx0XHR3aW5kb3cudGhyZWVSZW5kZXJlciA9IG5ldyBUSFJFRS5XZWJHTFJlbmRlcmVyKHtcclxuXHRcdFx0XHRhbnRpYWxpYXMgOiB0cnVlLFxyXG5cdFx0XHRcdGNhbnZhcyA6IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiZ2FtZXNjcmVlblwiKSBcclxuXHRcdFx0fSk7XHJcblx0XHRcdHRocmVlUmVuZGVyZXIuc2V0Q2xlYXJDb2xvckhleCggb3B0cy5jbGVhckNvbG9yICk7XHJcblx0XHRcdHRocmVlUmVuZGVyZXIuYXV0b0NsZWFyID0gZmFsc2U7XHJcblx0XHRcdFxyXG5cdFx0XHR0aHJlZVJlbmRlcmVyLnNoYWRvd01hcEVuYWJsZWQgPSB0cnVlO1xyXG5cdFx0XHR0aHJlZVJlbmRlcmVyLnNoYWRvd01hcFR5cGUgPSBUSFJFRS5QQ0ZTaGFkb3dNYXA7XHJcblx0XHRcdFxyXG5cdFx0XHRfcmVuZGVySGFuZGxlID0gcmFmKHJlbmRlckxvb3ApO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHRpZiAoIW9wdHMuZGlzYWJsZUdhbWVMb29wKSB7XHJcblx0XHRcdGluaXRHYW1lTG9vcCgzMCk7XHJcblx0XHR9XHJcblx0XHRcclxuXHR9LFxyXG5cdFxyXG5cdHBhdXNlIDogZnVuY3Rpb24oKSB7XHJcblx0XHRwYXVzZWQgPSB0cnVlO1xyXG5cdFx0Ly8gX3JlbmRlckhhbmRsZSA9IG51bGw7XHJcblx0fSxcclxuXHR1bnBhdXNlIDogZnVuY3Rpb24oKSB7XHJcblx0XHRwYXVzZWQgPSBmYWxzZTtcclxuXHRcdC8vIF9yZW5kZXJIYW5kbGUgPSByYWYocmVuZGVyTG9vcCk7XHJcblx0fSxcclxufTtcclxuXHJcblxyXG52YXIgX3JlbmRlckhhbmRsZTsgXHJcbmZ1bmN0aW9uIHJlbmRlckxvb3AoKSB7XHJcblx0dGhyZWVSZW5kZXJlci5jbGVhcigpO1xyXG5cdFxyXG5cdGlmICh3aW5kb3cuY3VycmVudE1hcCAmJiBjdXJyZW50TWFwLnNjZW5lICYmIGN1cnJlbnRNYXAuY2FtZXJhKSB7XHJcblx0XHQvL1JlbmRlciB3aXRoIHRoZSBtYXAncyBhY3RpdmUgY2FtZXJhIG9uIGl0cyBhY3RpdmUgc2NlbmVcclxuXHRcdHRocmVlUmVuZGVyZXIucmVuZGVyKGN1cnJlbnRNYXAuc2NlbmUsIGN1cnJlbnRNYXAuY2FtZXJhKTtcclxuXHR9XHJcblx0XHJcblx0aWYgKFVJLnNjZW5lICYmIFVJLmNhbWVyYSkge1xyXG5cdFx0Ly9SZW5kZXIgdGhlIFVJIHdpdGggdGhlIFVJIGNhbWVyYSBhbmQgaXRzIHNjZW5lXHJcblx0XHR0aHJlZVJlbmRlcmVyLmNsZWFyKGZhbHNlLCB0cnVlLCBmYWxzZSk7IC8vQ2xlYXIgZGVwdGggYnVmZmVyXHJcblx0XHR0aHJlZVJlbmRlcmVyLnJlbmRlcihVSS5zY2VuZSwgVUkuY2FtZXJhKTtcclxuXHR9XHJcblx0XHJcblx0aWYgKF9yZW5kZXJIYW5kbGUpXHJcblx0XHRfcmVuZGVySGFuZGxlID0gcmFmKHJlbmRlckxvb3ApO1xyXG59XHJcblxyXG52YXIgcGF1c2VkID0gZmFsc2U7XHJcbmZ1bmN0aW9uIGluaXRHYW1lTG9vcCh0aWNrc1BlclNlYykge1xyXG5cdHZhciBfcmF0ZSA9IDEwMDAgLyB0aWNrc1BlclNlYztcclxuXHRcclxuXHR2YXIgYWNjdW0gPSAwO1xyXG5cdHZhciBub3cgPSAwO1xyXG5cdHZhciBsYXN0ID0gbnVsbDtcclxuXHR2YXIgZHQgPSAwO1xyXG5cdHZhciB3aG9sZVRpY2s7XHJcblx0XHJcblx0c2V0SW50ZXJ2YWwodGltZXJUaWNrLCAwKTtcclxuXHRcclxuXHRmdW5jdGlvbiB0aW1lclRpY2soKSB7XHJcblx0XHRpZiAocGF1c2VkKSB7XHJcblx0XHRcdGxhc3QgPSBEYXRlLm5vdygpO1xyXG5cdFx0XHRhY2N1bSA9IDA7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0bm93ID0gRGF0ZS5ub3coKTtcclxuXHRcdGR0ID0gbm93IC0gKGxhc3QgfHwgbm93KTtcclxuXHRcdGxhc3QgPSBub3c7XHJcblx0XHRhY2N1bSArPSBkdDtcclxuXHRcdGlmIChhY2N1bSA8IF9yYXRlKSByZXR1cm47XHJcblx0XHR3aG9sZVRpY2sgPSAoKGFjY3VtIC8gX3JhdGUpfDApO1xyXG5cdFx0aWYgKHdob2xlVGljayA8PSAwKSByZXR1cm47XHJcblx0XHRcclxuXHRcdHZhciBkZWx0YSA9IHdob2xlVGljayAvIHRpY2tzUGVyU2VjO1xyXG5cdFx0aWYgKHdpbmRvdy5jdXJyZW50TWFwICYmIGN1cnJlbnRNYXAubG9naWNMb29wKVxyXG5cdFx0XHRjdXJyZW50TWFwLmxvZ2ljTG9vcChkZWx0YSk7XHJcblx0XHRpZiAod2luZG93LlVJICYmIFVJLmxvZ2ljTG9vcClcclxuXHRcdFx0VUkubG9naWNMb29wKGRlbHRhKTtcclxuXHRcdFxyXG5cdFx0aWYgKHdpbmRvdy5jb250cm9sbGVyICYmIGNvbnRyb2xsZXIuX3RpY2spXHJcblx0XHRcdGNvbnRyb2xsZXIuX3RpY2soZGVsdGEpO1xyXG5cdFx0aWYgKHdpbmRvdy5Tb3VuZE1hbmFnZXIgJiYgU291bmRNYW5hZ2VyLl90aWNrKVxyXG5cdFx0XHRTb3VuZE1hbmFnZXIuX3RpY2soZGVsdGEpO1xyXG5cdFx0XHJcblx0XHR3aG9sZVRpY2sgKj0gX3JhdGU7XHJcblx0XHRhY2N1bSAtPSB3aG9sZVRpY2s7XHJcblx0fVxyXG59IiwiLy8gcG9seWZpbGwuanNcclxuLy8gRGVmaW5lcyBzb21lIHBvbHlmaWxscyBuZWVkZWQgZm9yIHRoZSBnYW1lIHRvIGZ1bmN0aW9uLlxyXG5cclxuLy8gU3RyaW5nLnN0YXJ0c1dpdGgoKVxyXG4vLyBcclxuaWYgKCFTdHJpbmcucHJvdG90eXBlLnN0YXJ0c1dpdGgpIHtcclxuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkoU3RyaW5nLnByb3RvdHlwZSwgJ3N0YXJ0c1dpdGgnLCB7XHJcblx0XHRlbnVtZXJhYmxlOiBmYWxzZSxcclxuXHRcdGNvbmZpZ3VyYWJsZTogZmFsc2UsXHJcblx0XHR3cml0YWJsZTogZmFsc2UsXHJcblx0XHR2YWx1ZTogZnVuY3Rpb24oc2VhcmNoU3RyaW5nLCBwb3NpdGlvbikge1xyXG5cdFx0XHRwb3NpdGlvbiA9IHBvc2l0aW9uIHx8IDA7XHJcblx0XHRcdHJldHVybiB0aGlzLmxhc3RJbmRleE9mKHNlYXJjaFN0cmluZywgcG9zaXRpb24pID09PSBwb3NpdGlvbjtcclxuXHRcdH1cclxuXHR9KTtcclxufVxyXG5cclxuaWYgKCFTdHJpbmcucHJvdG90eXBlLmVuZHNXaXRoKSB7XHJcblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KFN0cmluZy5wcm90b3R5cGUsICdlbmRzV2l0aCcsIHtcclxuXHRcdGVudW1lcmFibGU6IGZhbHNlLFxyXG5cdFx0Y29uZmlndXJhYmxlOiBmYWxzZSxcclxuXHRcdHdyaXRhYmxlOiBmYWxzZSxcclxuXHRcdHZhbHVlOiBmdW5jdGlvbihzZWFyY2hTdHJpbmcsIHBvc2l0aW9uKSB7XHJcblx0XHRcdHZhciBzdWJqZWN0U3RyaW5nID0gdGhpcy50b1N0cmluZygpO1xyXG5cdFx0XHRpZiAocG9zaXRpb24gPT09IHVuZGVmaW5lZCB8fCBwb3NpdGlvbiA+IHN1YmplY3RTdHJpbmcubGVuZ3RoKSB7XHJcblx0XHRcdFx0cG9zaXRpb24gPSBzdWJqZWN0U3RyaW5nLmxlbmd0aDtcclxuXHRcdFx0fVxyXG5cdFx0XHRwb3NpdGlvbiAtPSBzZWFyY2hTdHJpbmcubGVuZ3RoO1xyXG5cdFx0XHR2YXIgbGFzdEluZGV4ID0gc3ViamVjdFN0cmluZy5pbmRleE9mKHNlYXJjaFN0cmluZywgcG9zaXRpb24pO1xyXG5cdFx0XHRyZXR1cm4gbGFzdEluZGV4ICE9PSAtMSAmJiBsYXN0SW5kZXggPT09IHBvc2l0aW9uO1xyXG5cdFx0fVxyXG5cdH0pO1xyXG59XHJcblxyXG4vLyBFdmVudFRhcmdldC5vbigpIGFuZCBFdmVudFRhcmdldC5lbWl0KClcclxuLy8gQWRkaW5nIHRoaXMgdG8gYWxsb3cgZG9tIGVsZW1lbnRzIGFuZCBvYmplY3RzIHRvIHNpbXBseSBoYXZlIFwib25cIiBhbmQgXCJlbWl0XCIgdXNlZCBsaWtlIG5vZGUuanMgb2JqZWN0cyBjYW5cclxuaWYgKCFFdmVudFRhcmdldC5wcm90b3R5cGUub24pIHtcclxuXHRFdmVudFRhcmdldC5wcm90b3R5cGUub24gPSBFdmVudFRhcmdldC5wcm90b3R5cGUuYWRkRXZlbnRMaXN0ZW5lcjtcclxuXHRFdmVudFRhcmdldC5wcm90b3R5cGUuZW1pdCA9IEV2ZW50VGFyZ2V0LnByb3RvdHlwZS5kaXNwYXRjaEV2ZW50O1xyXG59XHJcblxyXG4vLyBNYXRoLmNsYW1wKClcclxuLy8gXHJcbmlmICghTWF0aC5jbGFtcCkge1xyXG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShNYXRoLCBcImNsYW1wXCIsIHtcclxuXHRcdGVudW1lcmFibGU6IGZhbHNlLFxyXG5cdFx0Y29uZmlndXJhYmxlOiBmYWxzZSxcclxuXHRcdHdyaXRhYmxlOiBmYWxzZSxcclxuXHRcdHZhbHVlOiBmdW5jdGlvbihudW0sIG1pbiwgbWF4KSB7XHJcblx0XHRcdG1pbiA9IChtaW4gIT09IHVuZGVmaW5lZCk/IG1pbjowO1xyXG5cdFx0XHRtYXggPSAobWF4ICE9PSB1bmRlZmluZWQpPyBtYXg6MTtcclxuXHRcdFx0cmV0dXJuIE1hdGgubWluKE1hdGgubWF4KG51bSwgbWluKSwgbWF4KTtcclxuXHRcdH1cclxuXHR9KTtcclxufVxyXG5cclxuLy8gQXJyYXkudG9wXHJcbi8vIFByb3ZpZGVzIGVhc3kgYWNjZXNzIHRvIHRoZSBcInRvcFwiIG9mIGEgc3RhY2ssIG1hZGUgd2l0aCBwdXNoKCkgYW5kIHBvcCgpXHJcbmlmICghQXJyYXkucHJvdG90eXBlLnRvcCkge1xyXG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShBcnJheS5wcm90b3R5cGUsIFwidG9wXCIsIHtcclxuXHRcdGVudW1lcmFibGU6IGZhbHNlLFxyXG5cdFx0Y29uZmlndXJhYmxlOiBmYWxzZSxcclxuXHRcdC8vIHNldDogZnVuY3Rpb24oKXt9LFxyXG5cdFx0Z2V0OiBmdW5jdGlvbigpe1xyXG5cdFx0XHRyZXR1cm4gdGhpc1t0aGlzLmxlbmd0aC0xXTtcclxuXHRcdH0sXHJcblx0fSk7XHJcbn1cclxuXHJcblxyXG4vLyBNb2RpZmljYXRpb25zIHRvIFRIUkVFLmpzXHJcbmlmICh3aW5kb3cuVEhSRUUpIHtcclxuXHQvLyBWZWN0b3IzLnNldCgpLCBtb2RpZmllZCB0byBhY2NlcHQgYW5vdGhlciBWZWN0b3IzXHJcblx0VEhSRUUuVmVjdG9yMy5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24oeCwgeSwgeikge1xyXG5cdFx0aWYgKHggaW5zdGFuY2VvZiBUSFJFRS5WZWN0b3IzKSB7XHJcblx0XHRcdHRoaXMueCA9IHgueDsgdGhpcy55ID0geC55OyB0aGlzLnogPSB4Lno7XHJcblx0XHRcdHJldHVybiB0aGlzO1xyXG5cdFx0fVxyXG5cdFx0aWYgKHggaW5zdGFuY2VvZiBUSFJFRS5WZWN0b3IyKSB7XHJcblx0XHRcdHRoaXMueCA9IHgueDsgdGhpcy55ID0geC55OyB0aGlzLnogPSAwO1xyXG5cdFx0XHRyZXR1cm4gdGhpcztcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0dGhpcy54ID0geDsgdGhpcy55ID0geTsgdGhpcy56ID0gejtcclxuXHRcdHJldHVybiB0aGlzO1xyXG5cdH07XHJcblx0XHJcblx0Ly8gQWxzbyBmb3IgVmVjdG9yMlxyXG5cdFRIUkVFLlZlY3RvcjIucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uKHgsIHkpIHtcclxuXHRcdGlmICh4IGluc3RhbmNlb2YgVEhSRUUuVmVjdG9yMikge1xyXG5cdFx0XHR0aGlzLnggPSB4Lng7IHRoaXMueSA9IHgueTtcclxuXHRcdFx0cmV0dXJuIHRoaXM7XHJcblx0XHR9XHJcblx0XHRpZiAoeCBpbnN0YW5jZW9mIFRIUkVFLlZlY3RvcjMpIHtcclxuXHRcdFx0dGhpcy54ID0geC54OyB0aGlzLnkgPSB4Lnk7XHJcblx0XHRcdHJldHVybiB0aGlzO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHR0aGlzLnggPSB4OyB0aGlzLnkgPSB5O1xyXG5cdFx0cmV0dXJuIHRoaXM7XHJcblx0fTtcclxufVxyXG5cclxuXHJcbiJdfQ==
