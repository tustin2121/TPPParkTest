(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (COMPILED_MAPS){
// mapview.js

//var THREE = require("three");
//var $ = require("jquery");
//var zip = zip.js

require("../polyfill.js");
var Map = require("../map");
var renderLoop = require("../model/renderloop");

require("../globals");

var warp = require("tpp-warp");

console.log(COMPILED_MAPS);

//On Ready
$(function(){
	
	$("#loadbtn").on("click", function(){
		loadMap($("#idin").val());
		$("#loadbtn").blur();
	});
	
	renderLoop.start({
		clearColor : 0xFF0000,
		ticksPerSecond : 30,
	});
	
	var datalist = $("<datalist id='compiledMaps'>");
	for (var i = 0; i < COMPILED_MAPS.length; i++) {
		datalist.append($("<option>").text(COMPILED_MAPS[i]));
	}
	$("#idin").after(datalist);
	
});

function loadMap(id) {
	if (currentMap) {
		currentMap.dispose();
		_infoParent = null;
		_node_movementGrid = null;
	}
	
	currentMap = new Map(id);
	currentMap.load();
	
	currentMap.once("map-ready", function(){
		var scrWidth = $("#gamescreen").width();
		var scrHeight = $("#gamescreen").height();
		
		currentMap.camera = new THREE.PerspectiveCamera(75, scrWidth / scrHeight, 1, 1000);
		currentMap.camera.position.z = 10;
		
		var controls = new THREE.OrbitControls(currentMap.camera);
		controls.damping = 0.2;
		
		var map = currentMap;
		var oldlogic = map.logicLoop;
		map.logicLoop = function(delta){
			controls.update();
			oldlogic.call(map, delta);
		};
		
		// showWalkableTiles();
		showMovementGrid();
	});
}

var _infoParent;
function createInfoParent() {
	if (!_infoParent) {
		_infoParent = new THREE.Object3D();
		_infoParent.name = "DEBUG Info Rigging";
		currentMap.scene.add(_infoParent);
	}
}
/*
var _stored_walkableTiles;
function showWalkableTiles() {
	var tiles = _stored_walkableTiles;
	if (!tiles) {
		tiles = currentMap.getAllWalkableTiles();
	}
	
	createInfoParent();
	//TODO cleat info parent
	
	//CONST
	var markerColors = [ 0x888888, 0x008800, 0x000088, 0x880000, 0x008888, 0x880088, 0x888800 ];
	
	for (var li = 0; li < tiles.length; li++) {
		if (!tiles[li]) {
			console.warn("Tiles for layer", li, "undefined!");
			continue;
		}
		
		var geom = new THREE.Geometry();
		for (var i = 0; i < tiles[li].length; i++) {
			geom.vertices.push(tiles[li][i]["3dloc"]);
		}
		
		var mat = new THREE.PointCloudMaterial({
			size: 1,
			// map: THREE.ImageUtils.loadTexture("/tools/tilemarker.png"),
			depthTest: true,
			transparent: true,
		});
		mat.color.setHex(markerColors[li]);
		
		var particles = new THREE.PointCloud(geom, mat);
		particles.sortParticles = true;
		_infoParent.add(particles);
	}
} */

var _node_movementGrid;
function showMovementGrid() {
	if (!_node_movementGrid) {
		_node_movementGrid = new THREE.Object3D();
		_node_movementGrid.name = "DEBUG Movement Grid";
		
		createInfoParent();
		
		//CONST
		var markerColors = [ 0x888888, 0x008800, 0x000088, 0x880000, 0x008888, 0x880088, 0x888800 ];
		
		var map = currentMap;
		var mdata = currentMap.metadata;
		
		for (var li = 1; li <= 7; li++) {
			if (!mdata.layers[li-1]) continue;
			
			var geom = new THREE.Geometry();
			var jumps = [];
			
			function __drawLine(sx, sy, dx, dy) {
				var mv = map.canWalkBetween(sx, sy, dx, dy);
				if (!mv) return;
				
				var v1 = map.get3DTileLocation(sx, sy, li);
				var v2 = map.get3DTileLocation(dx, dy, li);
				
				if (mv & 0x2) {
					jumps.push([v1, v2]); //push for a spline later
					return;
				}
				
				v2.set((v1.x+v2.x)/2, (v1.y+v2.y)/2, (v1.z+v2.z)/2);
				
				geom.vertices.push(v1);
				geom.vertices.push(v2);
			}
			
			for (var y = 0; y < mdata.height; y++) {
				for (var x = 0; x < mdata.width; x++) {
					__drawLine(x, y, x+1, y);
					__drawLine(x, y, x-1, y);
					__drawLine(x, y, x, y+1);
					__drawLine(x, y, x, y-1);
				}
			}
			
			var mat = new THREE.LineBasicMaterial({
				color: markerColors[li],
				opacity: 0.8,
				linewidth: 1,
			});
			var line = new THREE.Line(geom, mat, THREE.LinePieces);
			_node_movementGrid.add(line);
			
			if (jumps.length) {
				for (var i = 0; i < jumps.length; i++) {
					var v1 = jumps[i][0];
					var v3 = jumps[i][1];
					var v2 = new THREE.Vector3((v1.x+v3.x)/2, Math.max(v1.y, v3.y)+0.4, (v1.z+v3.z)/2);
					
					var spline = new THREE.SplineCurve3([v1, v2, v3]);
					var geom = new THREE.Geometry();
					geom.vertices = spline.getPoints(7).slice(0, -1);
					
					var mat = new THREE.LineBasicMaterial({
						color: markerColors[li],
						opacity: 0.8,
						linewidth: 1,
					});
					var line = new THREE.Line(geom, mat);
					_node_movementGrid.add(line);
				}
			}
		}
		
		_node_movementGrid.position.y = 0.1;
		
		_infoParent.add(_node_movementGrid);
	}
	_node_movementGrid.visible = true;
}

}).call(this,['iChurchOfHelix', 'tGallery', 'xTestRoom1'])
},{"../globals":19,"../map":23,"../model/renderloop":27,"../polyfill.js":28,"tpp-warp":"tpp-warp"}],2:[function(require,module,exports){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */

var base64 = require('base64-js')
var ieee754 = require('ieee754')
var isArray = require('is-array')

exports.Buffer = Buffer
exports.SlowBuffer = Buffer
exports.INSPECT_MAX_BYTES = 50
Buffer.poolSize = 8192 // not used by this implementation

var kMaxLength = 0x3fffffff

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * Note:
 *
 * - Implementation must support adding new properties to `Uint8Array` instances.
 *   Firefox 4-29 lacked support, fixed in Firefox 30+.
 *   See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
 *
 *  - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
 *
 *  - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
 *    incorrect length in some situations.
 *
 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they will
 * get the Object implementation, which is slower but will work correctly.
 */
Buffer.TYPED_ARRAY_SUPPORT = (function () {
  try {
    var buf = new ArrayBuffer(0)
    var arr = new Uint8Array(buf)
    arr.foo = function () { return 42 }
    return 42 === arr.foo() && // typed array instances can be augmented
        typeof arr.subarray === 'function' && // chrome 9-10 lack `subarray`
        new Uint8Array(1).subarray(1, 1).byteLength === 0 // ie10 has broken `subarray`
  } catch (e) {
    return false
  }
})()

/**
 * Class: Buffer
 * =============
 *
 * The Buffer constructor returns instances of `Uint8Array` that are augmented
 * with function properties for all the node `Buffer` API functions. We use
 * `Uint8Array` so that square bracket notation works as expected -- it returns
 * a single octet.
 *
 * By augmenting the instances, we can avoid modifying the `Uint8Array`
 * prototype.
 */
function Buffer (subject, encoding, noZero) {
  if (!(this instanceof Buffer))
    return new Buffer(subject, encoding, noZero)

  var type = typeof subject

  // Find the length
  var length
  if (type === 'number')
    length = subject > 0 ? subject >>> 0 : 0
  else if (type === 'string') {
    if (encoding === 'base64')
      subject = base64clean(subject)
    length = Buffer.byteLength(subject, encoding)
  } else if (type === 'object' && subject !== null) { // assume object is array-like
    if (subject.type === 'Buffer' && isArray(subject.data))
      subject = subject.data
    length = +subject.length > 0 ? Math.floor(+subject.length) : 0
  } else
    throw new TypeError('must start with number, buffer, array or string')

  if (this.length > kMaxLength)
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
      'size: 0x' + kMaxLength.toString(16) + ' bytes')

  var buf
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Preferred: Return an augmented `Uint8Array` instance for best performance
    buf = Buffer._augment(new Uint8Array(length))
  } else {
    // Fallback: Return THIS instance of Buffer (created by `new`)
    buf = this
    buf.length = length
    buf._isBuffer = true
  }

  var i
  if (Buffer.TYPED_ARRAY_SUPPORT && typeof subject.byteLength === 'number') {
    // Speed optimization -- use set if we're copying from a typed array
    buf._set(subject)
  } else if (isArrayish(subject)) {
    // Treat array-ish objects as a byte array
    if (Buffer.isBuffer(subject)) {
      for (i = 0; i < length; i++)
        buf[i] = subject.readUInt8(i)
    } else {
      for (i = 0; i < length; i++)
        buf[i] = ((subject[i] % 256) + 256) % 256
    }
  } else if (type === 'string') {
    buf.write(subject, 0, encoding)
  } else if (type === 'number' && !Buffer.TYPED_ARRAY_SUPPORT && !noZero) {
    for (i = 0; i < length; i++) {
      buf[i] = 0
    }
  }

  return buf
}

Buffer.isBuffer = function (b) {
  return !!(b != null && b._isBuffer)
}

Buffer.compare = function (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b))
    throw new TypeError('Arguments must be Buffers')

  var x = a.length
  var y = b.length
  for (var i = 0, len = Math.min(x, y); i < len && a[i] === b[i]; i++) {}
  if (i !== len) {
    x = a[i]
    y = b[i]
  }
  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'raw':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function (list, totalLength) {
  if (!isArray(list)) throw new TypeError('Usage: Buffer.concat(list[, length])')

  if (list.length === 0) {
    return new Buffer(0)
  } else if (list.length === 1) {
    return list[0]
  }

  var i
  if (totalLength === undefined) {
    totalLength = 0
    for (i = 0; i < list.length; i++) {
      totalLength += list[i].length
    }
  }

  var buf = new Buffer(totalLength)
  var pos = 0
  for (i = 0; i < list.length; i++) {
    var item = list[i]
    item.copy(buf, pos)
    pos += item.length
  }
  return buf
}

Buffer.byteLength = function (str, encoding) {
  var ret
  str = str + ''
  switch (encoding || 'utf8') {
    case 'ascii':
    case 'binary':
    case 'raw':
      ret = str.length
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = str.length * 2
      break
    case 'hex':
      ret = str.length >>> 1
      break
    case 'utf8':
    case 'utf-8':
      ret = utf8ToBytes(str).length
      break
    case 'base64':
      ret = base64ToBytes(str).length
      break
    default:
      ret = str.length
  }
  return ret
}

// pre-set for values that may exist in the future
Buffer.prototype.length = undefined
Buffer.prototype.parent = undefined

// toString(encoding, start=0, end=buffer.length)
Buffer.prototype.toString = function (encoding, start, end) {
  var loweredCase = false

  start = start >>> 0
  end = end === undefined || end === Infinity ? this.length : end >>> 0

  if (!encoding) encoding = 'utf8'
  if (start < 0) start = 0
  if (end > this.length) end = this.length
  if (end <= start) return ''

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'binary':
        return binarySlice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase)
          throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.equals = function (b) {
  if(!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
    if (this.length > max)
      str += ' ... '
  }
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  return Buffer.compare(this, b)
}

// `get` will be removed in Node 0.13+
Buffer.prototype.get = function (offset) {
  console.log('.get() is deprecated. Access using array indexes instead.')
  return this.readUInt8(offset)
}

// `set` will be removed in Node 0.13+
Buffer.prototype.set = function (v, offset) {
  console.log('.set() is deprecated. Access using array indexes instead.')
  return this.writeUInt8(v, offset)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  if (strLen % 2 !== 0) throw new Error('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; i++) {
    var byte = parseInt(string.substr(i * 2, 2), 16)
    if (isNaN(byte)) throw new Error('Invalid hex string')
    buf[offset + i] = byte
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  var charsWritten = blitBuffer(utf8ToBytes(string), buf, offset, length)
  return charsWritten
}

function asciiWrite (buf, string, offset, length) {
  var charsWritten = blitBuffer(asciiToBytes(string), buf, offset, length)
  return charsWritten
}

function binaryWrite (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  var charsWritten = blitBuffer(base64ToBytes(string), buf, offset, length)
  return charsWritten
}

function utf16leWrite (buf, string, offset, length) {
  var charsWritten = blitBuffer(utf16leToBytes(string), buf, offset, length, 2)
  return charsWritten
}

Buffer.prototype.write = function (string, offset, length, encoding) {
  // Support both (string, offset, length, encoding)
  // and the legacy (string, encoding, offset, length)
  if (isFinite(offset)) {
    if (!isFinite(length)) {
      encoding = length
      length = undefined
    }
  } else {  // legacy
    var swap = encoding
    encoding = offset
    offset = length
    length = swap
  }

  offset = Number(offset) || 0
  var remaining = this.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }
  encoding = String(encoding || 'utf8').toLowerCase()

  var ret
  switch (encoding) {
    case 'hex':
      ret = hexWrite(this, string, offset, length)
      break
    case 'utf8':
    case 'utf-8':
      ret = utf8Write(this, string, offset, length)
      break
    case 'ascii':
      ret = asciiWrite(this, string, offset, length)
      break
    case 'binary':
      ret = binaryWrite(this, string, offset, length)
      break
    case 'base64':
      ret = base64Write(this, string, offset, length)
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = utf16leWrite(this, string, offset, length)
      break
    default:
      throw new TypeError('Unknown encoding: ' + encoding)
  }
  return ret
}

Buffer.prototype.toJSON = function () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  var res = ''
  var tmp = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    if (buf[i] <= 0x7F) {
      res += decodeUtf8Char(tmp) + String.fromCharCode(buf[i])
      tmp = ''
    } else {
      tmp += '%' + buf[i].toString(16)
    }
  }

  return res + decodeUtf8Char(tmp)
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function binarySlice (buf, start, end) {
  return asciiSlice(buf, start, end)
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; i++) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
  }
  return res
}

Buffer.prototype.slice = function (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len;
    if (start < 0)
      start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0)
      end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start)
    end = start

  if (Buffer.TYPED_ARRAY_SUPPORT) {
    return Buffer._augment(this.subarray(start, end))
  } else {
    var sliceLen = end - start
    var newBuf = new Buffer(sliceLen, undefined, true)
    for (var i = 0; i < sliceLen; i++) {
      newBuf[i] = this[i + start]
    }
    return newBuf
  }
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0)
    throw new RangeError('offset is not uint')
  if (offset + ext > length)
    throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUInt8 = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
      ((this[offset + 1] << 16) |
      (this[offset + 2] << 8) |
      this[offset + 3])
}

Buffer.prototype.readInt8 = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80))
    return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length)

  return (this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16) |
      (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
      (this[offset + 1] << 16) |
      (this[offset + 2] << 8) |
      (this[offset + 3])
}

Buffer.prototype.readFloatLE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('buffer must be a Buffer instance')
  if (value > max || value < min) throw new TypeError('value is out of bounds')
  if (offset + ext > buf.length) throw new TypeError('index out of range')
}

Buffer.prototype.writeUInt8 = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 1, 0xff, 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  this[offset] = value
  return offset + 1
}

function objectWriteUInt16 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; i++) {
    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
      (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = value
    this[offset + 1] = (value >>> 8)
  } else objectWriteUInt16(this, value, offset, true)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = value
  } else objectWriteUInt16(this, value, offset, false)
  return offset + 2
}

function objectWriteUInt32 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffffffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; i++) {
    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset + 3] = (value >>> 24)
    this[offset + 2] = (value >>> 16)
    this[offset + 1] = (value >>> 8)
    this[offset] = value
  } else objectWriteUInt32(this, value, offset, true)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = value
  } else objectWriteUInt32(this, value, offset, false)
  return offset + 4
}

Buffer.prototype.writeInt8 = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  if (value < 0) value = 0xff + value + 1
  this[offset] = value
  return offset + 1
}

Buffer.prototype.writeInt16LE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = value
    this[offset + 1] = (value >>> 8)
  } else objectWriteUInt16(this, value, offset, true)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = value
  } else objectWriteUInt16(this, value, offset, false)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = value
    this[offset + 1] = (value >>> 8)
    this[offset + 2] = (value >>> 16)
    this[offset + 3] = (value >>> 24)
  } else objectWriteUInt32(this, value, offset, true)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = value
  } else objectWriteUInt32(this, value, offset, false)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (value > max || value < min) throw new TypeError('value is out of bounds')
  if (offset + ext > buf.length) throw new TypeError('index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert)
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert)
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function (target, target_start, start, end) {
  var source = this

  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (!target_start) target_start = 0

  // Copy 0 bytes; we're done
  if (end === start) return
  if (target.length === 0 || source.length === 0) return

  // Fatal error conditions
  if (end < start) throw new TypeError('sourceEnd < sourceStart')
  if (target_start < 0 || target_start >= target.length)
    throw new TypeError('targetStart out of bounds')
  if (start < 0 || start >= source.length) throw new TypeError('sourceStart out of bounds')
  if (end < 0 || end > source.length) throw new TypeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length)
    end = this.length
  if (target.length - target_start < end - start)
    end = target.length - target_start + start

  var len = end - start

  if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < len; i++) {
      target[i + target_start] = this[i + start]
    }
  } else {
    target._set(this.subarray(start, start + len), target_start)
  }
}

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function (value, start, end) {
  if (!value) value = 0
  if (!start) start = 0
  if (!end) end = this.length

  if (end < start) throw new TypeError('end < start')

  // Fill 0 bytes; we're done
  if (end === start) return
  if (this.length === 0) return

  if (start < 0 || start >= this.length) throw new TypeError('start out of bounds')
  if (end < 0 || end > this.length) throw new TypeError('end out of bounds')

  var i
  if (typeof value === 'number') {
    for (i = start; i < end; i++) {
      this[i] = value
    }
  } else {
    var bytes = utf8ToBytes(value.toString())
    var len = bytes.length
    for (i = start; i < end; i++) {
      this[i] = bytes[i % len]
    }
  }

  return this
}

/**
 * Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
 * Added in Node 0.12. Only available in browsers that support ArrayBuffer.
 */
Buffer.prototype.toArrayBuffer = function () {
  if (typeof Uint8Array !== 'undefined') {
    if (Buffer.TYPED_ARRAY_SUPPORT) {
      return (new Buffer(this)).buffer
    } else {
      var buf = new Uint8Array(this.length)
      for (var i = 0, len = buf.length; i < len; i += 1) {
        buf[i] = this[i]
      }
      return buf.buffer
    }
  } else {
    throw new TypeError('Buffer.toArrayBuffer not supported in this browser')
  }
}

// HELPER FUNCTIONS
// ================

var BP = Buffer.prototype

/**
 * Augment a Uint8Array *instance* (not the Uint8Array class!) with Buffer methods
 */
Buffer._augment = function (arr) {
  arr.constructor = Buffer
  arr._isBuffer = true

  // save reference to original Uint8Array get/set methods before overwriting
  arr._get = arr.get
  arr._set = arr.set

  // deprecated, will be removed in node 0.13+
  arr.get = BP.get
  arr.set = BP.set

  arr.write = BP.write
  arr.toString = BP.toString
  arr.toLocaleString = BP.toString
  arr.toJSON = BP.toJSON
  arr.equals = BP.equals
  arr.compare = BP.compare
  arr.copy = BP.copy
  arr.slice = BP.slice
  arr.readUInt8 = BP.readUInt8
  arr.readUInt16LE = BP.readUInt16LE
  arr.readUInt16BE = BP.readUInt16BE
  arr.readUInt32LE = BP.readUInt32LE
  arr.readUInt32BE = BP.readUInt32BE
  arr.readInt8 = BP.readInt8
  arr.readInt16LE = BP.readInt16LE
  arr.readInt16BE = BP.readInt16BE
  arr.readInt32LE = BP.readInt32LE
  arr.readInt32BE = BP.readInt32BE
  arr.readFloatLE = BP.readFloatLE
  arr.readFloatBE = BP.readFloatBE
  arr.readDoubleLE = BP.readDoubleLE
  arr.readDoubleBE = BP.readDoubleBE
  arr.writeUInt8 = BP.writeUInt8
  arr.writeUInt16LE = BP.writeUInt16LE
  arr.writeUInt16BE = BP.writeUInt16BE
  arr.writeUInt32LE = BP.writeUInt32LE
  arr.writeUInt32BE = BP.writeUInt32BE
  arr.writeInt8 = BP.writeInt8
  arr.writeInt16LE = BP.writeInt16LE
  arr.writeInt16BE = BP.writeInt16BE
  arr.writeInt32LE = BP.writeInt32LE
  arr.writeInt32BE = BP.writeInt32BE
  arr.writeFloatLE = BP.writeFloatLE
  arr.writeFloatBE = BP.writeFloatBE
  arr.writeDoubleLE = BP.writeDoubleLE
  arr.writeDoubleBE = BP.writeDoubleBE
  arr.fill = BP.fill
  arr.inspect = BP.inspect
  arr.toArrayBuffer = BP.toArrayBuffer

  return arr
}

var INVALID_BASE64_RE = /[^+\/0-9A-z]/g

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

function isArrayish (subject) {
  return isArray(subject) || Buffer.isBuffer(subject) ||
      subject && typeof subject === 'object' &&
      typeof subject.length === 'number'
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    var b = str.charCodeAt(i)
    if (b <= 0x7F) {
      byteArray.push(b)
    } else {
      var start = i
      if (b >= 0xD800 && b <= 0xDFFF) i++
      var h = encodeURIComponent(str.slice(start, i+1)).substr(1).split('%')
      for (var j = 0; j < h.length; j++) {
        byteArray.push(parseInt(h[j], 16))
      }
    }
  }
  return byteArray
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(str)
}

function blitBuffer (src, dst, offset, length, unitSize) {
  if (unitSize) length -= length % unitSize;
  for (var i = 0; i < length; i++) {
    if ((i + offset >= dst.length) || (i >= src.length))
      break
    dst[i + offset] = src[i]
  }
  return i
}

function decodeUtf8Char (str) {
  try {
    return decodeURIComponent(str)
  } catch (err) {
    return String.fromCharCode(0xFFFD) // UTF 8 invalid char
  }
}

},{"base64-js":3,"ieee754":4,"is-array":5}],3:[function(require,module,exports){
var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

;(function (exports) {
	'use strict';

  var Arr = (typeof Uint8Array !== 'undefined')
    ? Uint8Array
    : Array

	var PLUS   = '+'.charCodeAt(0)
	var SLASH  = '/'.charCodeAt(0)
	var NUMBER = '0'.charCodeAt(0)
	var LOWER  = 'a'.charCodeAt(0)
	var UPPER  = 'A'.charCodeAt(0)

	function decode (elt) {
		var code = elt.charCodeAt(0)
		if (code === PLUS)
			return 62 // '+'
		if (code === SLASH)
			return 63 // '/'
		if (code < NUMBER)
			return -1 //no match
		if (code < NUMBER + 10)
			return code - NUMBER + 26 + 26
		if (code < UPPER + 26)
			return code - UPPER
		if (code < LOWER + 26)
			return code - LOWER + 26
	}

	function b64ToByteArray (b64) {
		var i, j, l, tmp, placeHolders, arr

		if (b64.length % 4 > 0) {
			throw new Error('Invalid string. Length must be a multiple of 4')
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		var len = b64.length
		placeHolders = '=' === b64.charAt(len - 2) ? 2 : '=' === b64.charAt(len - 1) ? 1 : 0

		// base64 is 4/3 + up to two characters of the original data
		arr = new Arr(b64.length * 3 / 4 - placeHolders)

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length

		var L = 0

		function push (v) {
			arr[L++] = v
		}

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3))
			push((tmp & 0xFF0000) >> 16)
			push((tmp & 0xFF00) >> 8)
			push(tmp & 0xFF)
		}

		if (placeHolders === 2) {
			tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4)
			push(tmp & 0xFF)
		} else if (placeHolders === 1) {
			tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2)
			push((tmp >> 8) & 0xFF)
			push(tmp & 0xFF)
		}

		return arr
	}

	function uint8ToBase64 (uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length

		function encode (num) {
			return lookup.charAt(num)
		}

		function tripletToBase64 (num) {
			return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F)
		}

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
			output += tripletToBase64(temp)
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1]
				output += encode(temp >> 2)
				output += encode((temp << 4) & 0x3F)
				output += '=='
				break
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1])
				output += encode(temp >> 10)
				output += encode((temp >> 4) & 0x3F)
				output += encode((temp << 2) & 0x3F)
				output += '='
				break
		}

		return output
	}

	exports.toByteArray = b64ToByteArray
	exports.fromByteArray = uint8ToBase64
}(typeof exports === 'undefined' ? (this.base64js = {}) : exports))

},{}],4:[function(require,module,exports){
exports.read = function(buffer, offset, isLE, mLen, nBytes) {
  var e, m,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      nBits = -7,
      i = isLE ? (nBytes - 1) : 0,
      d = isLE ? -1 : 1,
      s = buffer[offset + i];

  i += d;

  e = s & ((1 << (-nBits)) - 1);
  s >>= (-nBits);
  nBits += eLen;
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8);

  m = e & ((1 << (-nBits)) - 1);
  e >>= (-nBits);
  nBits += mLen;
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8);

  if (e === 0) {
    e = 1 - eBias;
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity);
  } else {
    m = m + Math.pow(2, mLen);
    e = e - eBias;
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
};

exports.write = function(buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0),
      i = isLE ? 0 : (nBytes - 1),
      d = isLE ? 1 : -1,
      s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

  value = Math.abs(value);

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0;
    e = eMax;
  } else {
    e = Math.floor(Math.log(value) / Math.LN2);
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--;
      c *= 2;
    }
    if (e + eBias >= 1) {
      value += rt / c;
    } else {
      value += rt * Math.pow(2, 1 - eBias);
    }
    if (value * c >= 2) {
      e++;
      c /= 2;
    }

    if (e + eBias >= eMax) {
      m = 0;
      e = eMax;
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen);
      e = e + eBias;
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
      e = 0;
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8);

  e = (e << mLen) | m;
  eLen += mLen;
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8);

  buffer[offset + i - d] |= s * 128;
};

},{}],5:[function(require,module,exports){

/**
 * isArray
 */

var isArray = Array.isArray;

/**
 * toString
 */

var str = Object.prototype.toString;

/**
 * Whether or not the given `val`
 * is an array.
 *
 * example:
 *
 *        isArray([]);
 *        // > true
 *        isArray(arguments);
 *        // > false
 *        isArray('');
 *        // > false
 *
 * @param {mixed} val
 * @return {bool}
 */

module.exports = isArray || function (val) {
  return !! val && '[object Array]' == str.call(val);
};

},{}],6:[function(require,module,exports){
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

},{}],7:[function(require,module,exports){
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

},{}],8:[function(require,module,exports){
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


},{}],9:[function(require,module,exports){
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

},{}],10:[function(require,module,exports){
(function (global){
//! moment.js
//! version : 2.8.4
//! authors : Tim Wood, Iskren Chernev, Moment.js contributors
//! license : MIT
//! momentjs.com

(function (undefined) {
    /************************************
        Constants
    ************************************/

    var moment,
        VERSION = '2.8.4',
        // the global-scope this is NOT the global object in Node.js
        globalScope = typeof global !== 'undefined' ? global : this,
        oldGlobalMoment,
        round = Math.round,
        hasOwnProperty = Object.prototype.hasOwnProperty,
        i,

        YEAR = 0,
        MONTH = 1,
        DATE = 2,
        HOUR = 3,
        MINUTE = 4,
        SECOND = 5,
        MILLISECOND = 6,

        // internal storage for locale config files
        locales = {},

        // extra moment internal properties (plugins register props here)
        momentProperties = [],

        // check for nodeJS
        hasModule = (typeof module !== 'undefined' && module && module.exports),

        // ASP.NET json date format regex
        aspNetJsonRegex = /^\/?Date\((\-?\d+)/i,
        aspNetTimeSpanJsonRegex = /(\-)?(?:(\d*)\.)?(\d+)\:(\d+)(?:\:(\d+)\.?(\d{3})?)?/,

        // from http://docs.closure-library.googlecode.com/git/closure_goog_date_date.js.source.html
        // somewhat more in line with 4.4.3.2 2004 spec, but allows decimal anywhere
        isoDurationRegex = /^(-)?P(?:(?:([0-9,.]*)Y)?(?:([0-9,.]*)M)?(?:([0-9,.]*)D)?(?:T(?:([0-9,.]*)H)?(?:([0-9,.]*)M)?(?:([0-9,.]*)S)?)?|([0-9,.]*)W)$/,

        // format tokens
        formattingTokens = /(\[[^\[]*\])|(\\)?(Mo|MM?M?M?|Do|DDDo|DD?D?D?|ddd?d?|do?|w[o|w]?|W[o|W]?|Q|YYYYYY|YYYYY|YYYY|YY|gg(ggg?)?|GG(GGG?)?|e|E|a|A|hh?|HH?|mm?|ss?|S{1,4}|x|X|zz?|ZZ?|.)/g,
        localFormattingTokens = /(\[[^\[]*\])|(\\)?(LTS|LT|LL?L?L?|l{1,4})/g,

        // parsing token regexes
        parseTokenOneOrTwoDigits = /\d\d?/, // 0 - 99
        parseTokenOneToThreeDigits = /\d{1,3}/, // 0 - 999
        parseTokenOneToFourDigits = /\d{1,4}/, // 0 - 9999
        parseTokenOneToSixDigits = /[+\-]?\d{1,6}/, // -999,999 - 999,999
        parseTokenDigits = /\d+/, // nonzero number of digits
        parseTokenWord = /[0-9]*['a-z\u00A0-\u05FF\u0700-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+|[\u0600-\u06FF\/]+(\s*?[\u0600-\u06FF]+){1,2}/i, // any word (or two) characters or numbers including two/three word month in arabic.
        parseTokenTimezone = /Z|[\+\-]\d\d:?\d\d/gi, // +00:00 -00:00 +0000 -0000 or Z
        parseTokenT = /T/i, // T (ISO separator)
        parseTokenOffsetMs = /[\+\-]?\d+/, // 1234567890123
        parseTokenTimestampMs = /[\+\-]?\d+(\.\d{1,3})?/, // 123456789 123456789.123

        //strict parsing regexes
        parseTokenOneDigit = /\d/, // 0 - 9
        parseTokenTwoDigits = /\d\d/, // 00 - 99
        parseTokenThreeDigits = /\d{3}/, // 000 - 999
        parseTokenFourDigits = /\d{4}/, // 0000 - 9999
        parseTokenSixDigits = /[+-]?\d{6}/, // -999,999 - 999,999
        parseTokenSignedNumber = /[+-]?\d+/, // -inf - inf

        // iso 8601 regex
        // 0000-00-00 0000-W00 or 0000-W00-0 + T + 00 or 00:00 or 00:00:00 or 00:00:00.000 + +00:00 or +0000 or +00)
        isoRegex = /^\s*(?:[+-]\d{6}|\d{4})-(?:(\d\d-\d\d)|(W\d\d$)|(W\d\d-\d)|(\d\d\d))((T| )(\d\d(:\d\d(:\d\d(\.\d+)?)?)?)?([\+\-]\d\d(?::?\d\d)?|\s*Z)?)?$/,

        isoFormat = 'YYYY-MM-DDTHH:mm:ssZ',

        isoDates = [
            ['YYYYYY-MM-DD', /[+-]\d{6}-\d{2}-\d{2}/],
            ['YYYY-MM-DD', /\d{4}-\d{2}-\d{2}/],
            ['GGGG-[W]WW-E', /\d{4}-W\d{2}-\d/],
            ['GGGG-[W]WW', /\d{4}-W\d{2}/],
            ['YYYY-DDD', /\d{4}-\d{3}/]
        ],

        // iso time formats and regexes
        isoTimes = [
            ['HH:mm:ss.SSSS', /(T| )\d\d:\d\d:\d\d\.\d+/],
            ['HH:mm:ss', /(T| )\d\d:\d\d:\d\d/],
            ['HH:mm', /(T| )\d\d:\d\d/],
            ['HH', /(T| )\d\d/]
        ],

        // timezone chunker '+10:00' > ['10', '00'] or '-1530' > ['-15', '30']
        parseTimezoneChunker = /([\+\-]|\d\d)/gi,

        // getter and setter names
        proxyGettersAndSetters = 'Date|Hours|Minutes|Seconds|Milliseconds'.split('|'),
        unitMillisecondFactors = {
            'Milliseconds' : 1,
            'Seconds' : 1e3,
            'Minutes' : 6e4,
            'Hours' : 36e5,
            'Days' : 864e5,
            'Months' : 2592e6,
            'Years' : 31536e6
        },

        unitAliases = {
            ms : 'millisecond',
            s : 'second',
            m : 'minute',
            h : 'hour',
            d : 'day',
            D : 'date',
            w : 'week',
            W : 'isoWeek',
            M : 'month',
            Q : 'quarter',
            y : 'year',
            DDD : 'dayOfYear',
            e : 'weekday',
            E : 'isoWeekday',
            gg: 'weekYear',
            GG: 'isoWeekYear'
        },

        camelFunctions = {
            dayofyear : 'dayOfYear',
            isoweekday : 'isoWeekday',
            isoweek : 'isoWeek',
            weekyear : 'weekYear',
            isoweekyear : 'isoWeekYear'
        },

        // format function strings
        formatFunctions = {},

        // default relative time thresholds
        relativeTimeThresholds = {
            s: 45,  // seconds to minute
            m: 45,  // minutes to hour
            h: 22,  // hours to day
            d: 26,  // days to month
            M: 11   // months to year
        },

        // tokens to ordinalize and pad
        ordinalizeTokens = 'DDD w W M D d'.split(' '),
        paddedTokens = 'M D H h m s w W'.split(' '),

        formatTokenFunctions = {
            M    : function () {
                return this.month() + 1;
            },
            MMM  : function (format) {
                return this.localeData().monthsShort(this, format);
            },
            MMMM : function (format) {
                return this.localeData().months(this, format);
            },
            D    : function () {
                return this.date();
            },
            DDD  : function () {
                return this.dayOfYear();
            },
            d    : function () {
                return this.day();
            },
            dd   : function (format) {
                return this.localeData().weekdaysMin(this, format);
            },
            ddd  : function (format) {
                return this.localeData().weekdaysShort(this, format);
            },
            dddd : function (format) {
                return this.localeData().weekdays(this, format);
            },
            w    : function () {
                return this.week();
            },
            W    : function () {
                return this.isoWeek();
            },
            YY   : function () {
                return leftZeroFill(this.year() % 100, 2);
            },
            YYYY : function () {
                return leftZeroFill(this.year(), 4);
            },
            YYYYY : function () {
                return leftZeroFill(this.year(), 5);
            },
            YYYYYY : function () {
                var y = this.year(), sign = y >= 0 ? '+' : '-';
                return sign + leftZeroFill(Math.abs(y), 6);
            },
            gg   : function () {
                return leftZeroFill(this.weekYear() % 100, 2);
            },
            gggg : function () {
                return leftZeroFill(this.weekYear(), 4);
            },
            ggggg : function () {
                return leftZeroFill(this.weekYear(), 5);
            },
            GG   : function () {
                return leftZeroFill(this.isoWeekYear() % 100, 2);
            },
            GGGG : function () {
                return leftZeroFill(this.isoWeekYear(), 4);
            },
            GGGGG : function () {
                return leftZeroFill(this.isoWeekYear(), 5);
            },
            e : function () {
                return this.weekday();
            },
            E : function () {
                return this.isoWeekday();
            },
            a    : function () {
                return this.localeData().meridiem(this.hours(), this.minutes(), true);
            },
            A    : function () {
                return this.localeData().meridiem(this.hours(), this.minutes(), false);
            },
            H    : function () {
                return this.hours();
            },
            h    : function () {
                return this.hours() % 12 || 12;
            },
            m    : function () {
                return this.minutes();
            },
            s    : function () {
                return this.seconds();
            },
            S    : function () {
                return toInt(this.milliseconds() / 100);
            },
            SS   : function () {
                return leftZeroFill(toInt(this.milliseconds() / 10), 2);
            },
            SSS  : function () {
                return leftZeroFill(this.milliseconds(), 3);
            },
            SSSS : function () {
                return leftZeroFill(this.milliseconds(), 3);
            },
            Z    : function () {
                var a = -this.zone(),
                    b = '+';
                if (a < 0) {
                    a = -a;
                    b = '-';
                }
                return b + leftZeroFill(toInt(a / 60), 2) + ':' + leftZeroFill(toInt(a) % 60, 2);
            },
            ZZ   : function () {
                var a = -this.zone(),
                    b = '+';
                if (a < 0) {
                    a = -a;
                    b = '-';
                }
                return b + leftZeroFill(toInt(a / 60), 2) + leftZeroFill(toInt(a) % 60, 2);
            },
            z : function () {
                return this.zoneAbbr();
            },
            zz : function () {
                return this.zoneName();
            },
            x    : function () {
                return this.valueOf();
            },
            X    : function () {
                return this.unix();
            },
            Q : function () {
                return this.quarter();
            }
        },

        deprecations = {},

        lists = ['months', 'monthsShort', 'weekdays', 'weekdaysShort', 'weekdaysMin'];

    // Pick the first defined of two or three arguments. dfl comes from
    // default.
    function dfl(a, b, c) {
        switch (arguments.length) {
            case 2: return a != null ? a : b;
            case 3: return a != null ? a : b != null ? b : c;
            default: throw new Error('Implement me');
        }
    }

    function hasOwnProp(a, b) {
        return hasOwnProperty.call(a, b);
    }

    function defaultParsingFlags() {
        // We need to deep clone this object, and es5 standard is not very
        // helpful.
        return {
            empty : false,
            unusedTokens : [],
            unusedInput : [],
            overflow : -2,
            charsLeftOver : 0,
            nullInput : false,
            invalidMonth : null,
            invalidFormat : false,
            userInvalidated : false,
            iso: false
        };
    }

    function printMsg(msg) {
        if (moment.suppressDeprecationWarnings === false &&
                typeof console !== 'undefined' && console.warn) {
            console.warn('Deprecation warning: ' + msg);
        }
    }

    function deprecate(msg, fn) {
        var firstTime = true;
        return extend(function () {
            if (firstTime) {
                printMsg(msg);
                firstTime = false;
            }
            return fn.apply(this, arguments);
        }, fn);
    }

    function deprecateSimple(name, msg) {
        if (!deprecations[name]) {
            printMsg(msg);
            deprecations[name] = true;
        }
    }

    function padToken(func, count) {
        return function (a) {
            return leftZeroFill(func.call(this, a), count);
        };
    }
    function ordinalizeToken(func, period) {
        return function (a) {
            return this.localeData().ordinal(func.call(this, a), period);
        };
    }

    while (ordinalizeTokens.length) {
        i = ordinalizeTokens.pop();
        formatTokenFunctions[i + 'o'] = ordinalizeToken(formatTokenFunctions[i], i);
    }
    while (paddedTokens.length) {
        i = paddedTokens.pop();
        formatTokenFunctions[i + i] = padToken(formatTokenFunctions[i], 2);
    }
    formatTokenFunctions.DDDD = padToken(formatTokenFunctions.DDD, 3);


    /************************************
        Constructors
    ************************************/

    function Locale() {
    }

    // Moment prototype object
    function Moment(config, skipOverflow) {
        if (skipOverflow !== false) {
            checkOverflow(config);
        }
        copyConfig(this, config);
        this._d = new Date(+config._d);
    }

    // Duration Constructor
    function Duration(duration) {
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

        this._locale = moment.localeData();

        this._bubble();
    }

    /************************************
        Helpers
    ************************************/


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
            to._pf = from._pf;
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

    function absRound(number) {
        if (number < 0) {
            return Math.ceil(number);
        } else {
            return Math.floor(number);
        }
    }

    // left zero fill a number
    // see http://jsperf.com/left-zero-filling for performance comparison
    function leftZeroFill(number, targetLength, forceSign) {
        var output = '' + Math.abs(number),
            sign = number >= 0;

        while (output.length < targetLength) {
            output = '0' + output;
        }
        return (sign ? (forceSign ? '+' : '') : '-') + output;
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
        other = makeAs(other, base);
        if (base.isBefore(other)) {
            res = positiveMomentsDifference(base, other);
        } else {
            res = positiveMomentsDifference(other, base);
            res.milliseconds = -res.milliseconds;
            res.months = -res.months;
        }

        return res;
    }

    // TODO: remove 'name' arg after deprecation is removed
    function createAdder(direction, name) {
        return function (val, period) {
            var dur, tmp;
            //invert the arguments, but complain about it
            if (period !== null && !isNaN(+period)) {
                deprecateSimple(name, 'moment().' + name  + '(period, number) is deprecated. Please use moment().' + name + '(number, period).');
                tmp = val; val = period; period = tmp;
            }

            val = typeof val === 'string' ? +val : val;
            dur = moment.duration(val, period);
            addOrSubtractDurationFromMoment(this, dur, direction);
            return this;
        };
    }

    function addOrSubtractDurationFromMoment(mom, duration, isAdding, updateOffset) {
        var milliseconds = duration._milliseconds,
            days = duration._days,
            months = duration._months;
        updateOffset = updateOffset == null ? true : updateOffset;

        if (milliseconds) {
            mom._d.setTime(+mom._d + milliseconds * isAdding);
        }
        if (days) {
            rawSetter(mom, 'Date', rawGetter(mom, 'Date') + days * isAdding);
        }
        if (months) {
            rawMonthSetter(mom, rawGetter(mom, 'Month') + months * isAdding);
        }
        if (updateOffset) {
            moment.updateOffset(mom, days || months);
        }
    }

    // check if is an array
    function isArray(input) {
        return Object.prototype.toString.call(input) === '[object Array]';
    }

    function isDate(input) {
        return Object.prototype.toString.call(input) === '[object Date]' ||
            input instanceof Date;
    }

    // compare two arrays, return the number of differences
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

    function normalizeUnits(units) {
        if (units) {
            var lowered = units.toLowerCase().replace(/(.)s$/, '$1');
            units = unitAliases[units] || camelFunctions[lowered] || lowered;
        }
        return units;
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

    function makeList(field) {
        var count, setter;

        if (field.indexOf('week') === 0) {
            count = 7;
            setter = 'day';
        }
        else if (field.indexOf('month') === 0) {
            count = 12;
            setter = 'month';
        }
        else {
            return;
        }

        moment[field] = function (format, index) {
            var i, getter,
                method = moment._locale[field],
                results = [];

            if (typeof format === 'number') {
                index = format;
                format = undefined;
            }

            getter = function (i) {
                var m = moment().utc().set(setter, i);
                return method.call(moment._locale, m, format || '');
            };

            if (index != null) {
                return getter(index);
            }
            else {
                for (i = 0; i < count; i++) {
                    results.push(getter(i));
                }
                return results;
            }
        };
    }

    function toInt(argumentForCoercion) {
        var coercedNumber = +argumentForCoercion,
            value = 0;

        if (coercedNumber !== 0 && isFinite(coercedNumber)) {
            if (coercedNumber >= 0) {
                value = Math.floor(coercedNumber);
            } else {
                value = Math.ceil(coercedNumber);
            }
        }

        return value;
    }

    function daysInMonth(year, month) {
        return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    }

    function weeksInYear(year, dow, doy) {
        return weekOfYear(moment([year, 11, 31 + dow - doy]), dow, doy).week;
    }

    function daysInYear(year) {
        return isLeapYear(year) ? 366 : 365;
    }

    function isLeapYear(year) {
        return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    }

    function checkOverflow(m) {
        var overflow;
        if (m._a && m._pf.overflow === -2) {
            overflow =
                m._a[MONTH] < 0 || m._a[MONTH] > 11 ? MONTH :
                m._a[DATE] < 1 || m._a[DATE] > daysInMonth(m._a[YEAR], m._a[MONTH]) ? DATE :
                m._a[HOUR] < 0 || m._a[HOUR] > 24 ||
                    (m._a[HOUR] === 24 && (m._a[MINUTE] !== 0 ||
                                           m._a[SECOND] !== 0 ||
                                           m._a[MILLISECOND] !== 0)) ? HOUR :
                m._a[MINUTE] < 0 || m._a[MINUTE] > 59 ? MINUTE :
                m._a[SECOND] < 0 || m._a[SECOND] > 59 ? SECOND :
                m._a[MILLISECOND] < 0 || m._a[MILLISECOND] > 999 ? MILLISECOND :
                -1;

            if (m._pf._overflowDayOfYear && (overflow < YEAR || overflow > DATE)) {
                overflow = DATE;
            }

            m._pf.overflow = overflow;
        }
    }

    function isValid(m) {
        if (m._isValid == null) {
            m._isValid = !isNaN(m._d.getTime()) &&
                m._pf.overflow < 0 &&
                !m._pf.empty &&
                !m._pf.invalidMonth &&
                !m._pf.nullInput &&
                !m._pf.invalidFormat &&
                !m._pf.userInvalidated;

            if (m._strict) {
                m._isValid = m._isValid &&
                    m._pf.charsLeftOver === 0 &&
                    m._pf.unusedTokens.length === 0 &&
                    m._pf.bigHour === undefined;
            }
        }
        return m._isValid;
    }

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
        if (!locales[name] && hasModule) {
            try {
                oldLocale = moment.locale();
                require('./locale/' + name);
                // because defineLocale currently also sets the global locale, we want to undo that for lazy loaded locales
                moment.locale(oldLocale);
            } catch (e) { }
        }
        return locales[name];
    }

    // Return a moment from input, that is local/utc/zone equivalent to model.
    function makeAs(input, model) {
        var res, diff;
        if (model._isUTC) {
            res = model.clone();
            diff = (moment.isMoment(input) || isDate(input) ?
                    +input : +moment(input)) - (+res);
            // Use low-level api, because this fn is low-level api.
            res._d.setTime(+res._d + diff);
            moment.updateOffset(res, false);
            return res;
        } else {
            return moment(input).local();
        }
    }

    /************************************
        Locale
    ************************************/


    extend(Locale.prototype, {

        set : function (config) {
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
            this._ordinalParseLenient = new RegExp(this._ordinalParse.source + '|' + /\d{1,2}/.source);
        },

        _months : 'January_February_March_April_May_June_July_August_September_October_November_December'.split('_'),
        months : function (m) {
            return this._months[m.month()];
        },

        _monthsShort : 'Jan_Feb_Mar_Apr_May_Jun_Jul_Aug_Sep_Oct_Nov_Dec'.split('_'),
        monthsShort : function (m) {
            return this._monthsShort[m.month()];
        },

        monthsParse : function (monthName, format, strict) {
            var i, mom, regex;

            if (!this._monthsParse) {
                this._monthsParse = [];
                this._longMonthsParse = [];
                this._shortMonthsParse = [];
            }

            for (i = 0; i < 12; i++) {
                // make the regex if we don't have it already
                mom = moment.utc([2000, i]);
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
        },

        _weekdays : 'Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday'.split('_'),
        weekdays : function (m) {
            return this._weekdays[m.day()];
        },

        _weekdaysShort : 'Sun_Mon_Tue_Wed_Thu_Fri_Sat'.split('_'),
        weekdaysShort : function (m) {
            return this._weekdaysShort[m.day()];
        },

        _weekdaysMin : 'Su_Mo_Tu_We_Th_Fr_Sa'.split('_'),
        weekdaysMin : function (m) {
            return this._weekdaysMin[m.day()];
        },

        weekdaysParse : function (weekdayName) {
            var i, mom, regex;

            if (!this._weekdaysParse) {
                this._weekdaysParse = [];
            }

            for (i = 0; i < 7; i++) {
                // make the regex if we don't have it already
                if (!this._weekdaysParse[i]) {
                    mom = moment([2000, 1]).day(i);
                    regex = '^' + this.weekdays(mom, '') + '|^' + this.weekdaysShort(mom, '') + '|^' + this.weekdaysMin(mom, '');
                    this._weekdaysParse[i] = new RegExp(regex.replace('.', ''), 'i');
                }
                // test the regex
                if (this._weekdaysParse[i].test(weekdayName)) {
                    return i;
                }
            }
        },

        _longDateFormat : {
            LTS : 'h:mm:ss A',
            LT : 'h:mm A',
            L : 'MM/DD/YYYY',
            LL : 'MMMM D, YYYY',
            LLL : 'MMMM D, YYYY LT',
            LLLL : 'dddd, MMMM D, YYYY LT'
        },
        longDateFormat : function (key) {
            var output = this._longDateFormat[key];
            if (!output && this._longDateFormat[key.toUpperCase()]) {
                output = this._longDateFormat[key.toUpperCase()].replace(/MMMM|MM|DD|dddd/g, function (val) {
                    return val.slice(1);
                });
                this._longDateFormat[key] = output;
            }
            return output;
        },

        isPM : function (input) {
            // IE8 Quirks Mode & IE7 Standards Mode do not allow accessing strings like arrays
            // Using charAt should be more compatible.
            return ((input + '').toLowerCase().charAt(0) === 'p');
        },

        _meridiemParse : /[ap]\.?m?\.?/i,
        meridiem : function (hours, minutes, isLower) {
            if (hours > 11) {
                return isLower ? 'pm' : 'PM';
            } else {
                return isLower ? 'am' : 'AM';
            }
        },

        _calendar : {
            sameDay : '[Today at] LT',
            nextDay : '[Tomorrow at] LT',
            nextWeek : 'dddd [at] LT',
            lastDay : '[Yesterday at] LT',
            lastWeek : '[Last] dddd [at] LT',
            sameElse : 'L'
        },
        calendar : function (key, mom, now) {
            var output = this._calendar[key];
            return typeof output === 'function' ? output.apply(mom, [now]) : output;
        },

        _relativeTime : {
            future : 'in %s',
            past : '%s ago',
            s : 'a few seconds',
            m : 'a minute',
            mm : '%d minutes',
            h : 'an hour',
            hh : '%d hours',
            d : 'a day',
            dd : '%d days',
            M : 'a month',
            MM : '%d months',
            y : 'a year',
            yy : '%d years'
        },

        relativeTime : function (number, withoutSuffix, string, isFuture) {
            var output = this._relativeTime[string];
            return (typeof output === 'function') ?
                output(number, withoutSuffix, string, isFuture) :
                output.replace(/%d/i, number);
        },

        pastFuture : function (diff, output) {
            var format = this._relativeTime[diff > 0 ? 'future' : 'past'];
            return typeof format === 'function' ? format(output) : format.replace(/%s/i, output);
        },

        ordinal : function (number) {
            return this._ordinal.replace('%d', number);
        },
        _ordinal : '%d',
        _ordinalParse : /\d{1,2}/,

        preparse : function (string) {
            return string;
        },

        postformat : function (string) {
            return string;
        },

        week : function (mom) {
            return weekOfYear(mom, this._week.dow, this._week.doy).week;
        },

        _week : {
            dow : 0, // Sunday is the first day of the week.
            doy : 6  // The week that contains Jan 1st is the first week of the year.
        },

        _invalidDate: 'Invalid date',
        invalidDate: function () {
            return this._invalidDate;
        }
    });

    /************************************
        Formatting
    ************************************/


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

        if (!formatFunctions[format]) {
            formatFunctions[format] = makeFormatFunction(format);
        }

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


    /************************************
        Parsing
    ************************************/


    // get the regex to find the next token
    function getParseRegexForToken(token, config) {
        var a, strict = config._strict;
        switch (token) {
        case 'Q':
            return parseTokenOneDigit;
        case 'DDDD':
            return parseTokenThreeDigits;
        case 'YYYY':
        case 'GGGG':
        case 'gggg':
            return strict ? parseTokenFourDigits : parseTokenOneToFourDigits;
        case 'Y':
        case 'G':
        case 'g':
            return parseTokenSignedNumber;
        case 'YYYYYY':
        case 'YYYYY':
        case 'GGGGG':
        case 'ggggg':
            return strict ? parseTokenSixDigits : parseTokenOneToSixDigits;
        case 'S':
            if (strict) {
                return parseTokenOneDigit;
            }
            /* falls through */
        case 'SS':
            if (strict) {
                return parseTokenTwoDigits;
            }
            /* falls through */
        case 'SSS':
            if (strict) {
                return parseTokenThreeDigits;
            }
            /* falls through */
        case 'DDD':
            return parseTokenOneToThreeDigits;
        case 'MMM':
        case 'MMMM':
        case 'dd':
        case 'ddd':
        case 'dddd':
            return parseTokenWord;
        case 'a':
        case 'A':
            return config._locale._meridiemParse;
        case 'x':
            return parseTokenOffsetMs;
        case 'X':
            return parseTokenTimestampMs;
        case 'Z':
        case 'ZZ':
            return parseTokenTimezone;
        case 'T':
            return parseTokenT;
        case 'SSSS':
            return parseTokenDigits;
        case 'MM':
        case 'DD':
        case 'YY':
        case 'GG':
        case 'gg':
        case 'HH':
        case 'hh':
        case 'mm':
        case 'ss':
        case 'ww':
        case 'WW':
            return strict ? parseTokenTwoDigits : parseTokenOneOrTwoDigits;
        case 'M':
        case 'D':
        case 'd':
        case 'H':
        case 'h':
        case 'm':
        case 's':
        case 'w':
        case 'W':
        case 'e':
        case 'E':
            return parseTokenOneOrTwoDigits;
        case 'Do':
            return strict ? config._locale._ordinalParse : config._locale._ordinalParseLenient;
        default :
            a = new RegExp(regexpEscape(unescapeFormat(token.replace('\\', '')), 'i'));
            return a;
        }
    }

    function timezoneMinutesFromString(string) {
        string = string || '';
        var possibleTzMatches = (string.match(parseTokenTimezone) || []),
            tzChunk = possibleTzMatches[possibleTzMatches.length - 1] || [],
            parts = (tzChunk + '').match(parseTimezoneChunker) || ['-', 0, 0],
            minutes = +(parts[1] * 60) + toInt(parts[2]);

        return parts[0] === '+' ? -minutes : minutes;
    }

    // function to convert string input to date
    function addTimeToArrayFromToken(token, input, config) {
        var a, datePartArray = config._a;

        switch (token) {
        // QUARTER
        case 'Q':
            if (input != null) {
                datePartArray[MONTH] = (toInt(input) - 1) * 3;
            }
            break;
        // MONTH
        case 'M' : // fall through to MM
        case 'MM' :
            if (input != null) {
                datePartArray[MONTH] = toInt(input) - 1;
            }
            break;
        case 'MMM' : // fall through to MMMM
        case 'MMMM' :
            a = config._locale.monthsParse(input, token, config._strict);
            // if we didn't find a month name, mark the date as invalid.
            if (a != null) {
                datePartArray[MONTH] = a;
            } else {
                config._pf.invalidMonth = input;
            }
            break;
        // DAY OF MONTH
        case 'D' : // fall through to DD
        case 'DD' :
            if (input != null) {
                datePartArray[DATE] = toInt(input);
            }
            break;
        case 'Do' :
            if (input != null) {
                datePartArray[DATE] = toInt(parseInt(
                            input.match(/\d{1,2}/)[0], 10));
            }
            break;
        // DAY OF YEAR
        case 'DDD' : // fall through to DDDD
        case 'DDDD' :
            if (input != null) {
                config._dayOfYear = toInt(input);
            }

            break;
        // YEAR
        case 'YY' :
            datePartArray[YEAR] = moment.parseTwoDigitYear(input);
            break;
        case 'YYYY' :
        case 'YYYYY' :
        case 'YYYYYY' :
            datePartArray[YEAR] = toInt(input);
            break;
        // AM / PM
        case 'a' : // fall through to A
        case 'A' :
            config._isPm = config._locale.isPM(input);
            break;
        // HOUR
        case 'h' : // fall through to hh
        case 'hh' :
            config._pf.bigHour = true;
            /* falls through */
        case 'H' : // fall through to HH
        case 'HH' :
            datePartArray[HOUR] = toInt(input);
            break;
        // MINUTE
        case 'm' : // fall through to mm
        case 'mm' :
            datePartArray[MINUTE] = toInt(input);
            break;
        // SECOND
        case 's' : // fall through to ss
        case 'ss' :
            datePartArray[SECOND] = toInt(input);
            break;
        // MILLISECOND
        case 'S' :
        case 'SS' :
        case 'SSS' :
        case 'SSSS' :
            datePartArray[MILLISECOND] = toInt(('0.' + input) * 1000);
            break;
        // UNIX OFFSET (MILLISECONDS)
        case 'x':
            config._d = new Date(toInt(input));
            break;
        // UNIX TIMESTAMP WITH MS
        case 'X':
            config._d = new Date(parseFloat(input) * 1000);
            break;
        // TIMEZONE
        case 'Z' : // fall through to ZZ
        case 'ZZ' :
            config._useUTC = true;
            config._tzm = timezoneMinutesFromString(input);
            break;
        // WEEKDAY - human
        case 'dd':
        case 'ddd':
        case 'dddd':
            a = config._locale.weekdaysParse(input);
            // if we didn't get a weekday name, mark the date as invalid
            if (a != null) {
                config._w = config._w || {};
                config._w['d'] = a;
            } else {
                config._pf.invalidWeekday = input;
            }
            break;
        // WEEK, WEEK DAY - numeric
        case 'w':
        case 'ww':
        case 'W':
        case 'WW':
        case 'd':
        case 'e':
        case 'E':
            token = token.substr(0, 1);
            /* falls through */
        case 'gggg':
        case 'GGGG':
        case 'GGGGG':
            token = token.substr(0, 2);
            if (input) {
                config._w = config._w || {};
                config._w[token] = toInt(input);
            }
            break;
        case 'gg':
        case 'GG':
            config._w = config._w || {};
            config._w[token] = moment.parseTwoDigitYear(input);
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
            weekYear = dfl(w.GG, config._a[YEAR], weekOfYear(moment(), 1, 4).year);
            week = dfl(w.W, 1);
            weekday = dfl(w.E, 1);
        } else {
            dow = config._locale._week.dow;
            doy = config._locale._week.doy;

            weekYear = dfl(w.gg, config._a[YEAR], weekOfYear(moment(), dow, doy).year);
            week = dfl(w.w, 1);

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

    // convert an array to a date.
    // the array should mirror the parameters below
    // note: all values past the year are optional and will default to the lowest possible value.
    // [year, month, day , hour, minute, second, millisecond]
    function dateFromConfig(config) {
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
            yearToUse = dfl(config._a[YEAR], currentDate[YEAR]);

            if (config._dayOfYear > daysInYear(yearToUse)) {
                config._pf._overflowDayOfYear = true;
            }

            date = makeUTCDate(yearToUse, 0, config._dayOfYear);
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

        config._d = (config._useUTC ? makeUTCDate : makeDate).apply(null, input);
        // Apply timezone offset from input. The actual zone can be changed
        // with parseZone.
        if (config._tzm != null) {
            config._d.setUTCMinutes(config._d.getUTCMinutes() + config._tzm);
        }

        if (config._nextDay) {
            config._a[HOUR] = 24;
        }
    }

    function dateFromObject(config) {
        var normalizedInput;

        if (config._d) {
            return;
        }

        normalizedInput = normalizeObjectUnits(config._i);
        config._a = [
            normalizedInput.year,
            normalizedInput.month,
            normalizedInput.day || normalizedInput.date,
            normalizedInput.hour,
            normalizedInput.minute,
            normalizedInput.second,
            normalizedInput.millisecond
        ];

        dateFromConfig(config);
    }

    function currentDateArray(config) {
        var now = new Date();
        if (config._useUTC) {
            return [
                now.getUTCFullYear(),
                now.getUTCMonth(),
                now.getUTCDate()
            ];
        } else {
            return [now.getFullYear(), now.getMonth(), now.getDate()];
        }
    }

    // date from string and format string
    function makeDateFromStringAndFormat(config) {
        if (config._f === moment.ISO_8601) {
            parseISO(config);
            return;
        }

        config._a = [];
        config._pf.empty = true;

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
                    config._pf.unusedInput.push(skipped);
                }
                string = string.slice(string.indexOf(parsedInput) + parsedInput.length);
                totalParsedInputLength += parsedInput.length;
            }
            // don't parse if it's not a known token
            if (formatTokenFunctions[token]) {
                if (parsedInput) {
                    config._pf.empty = false;
                }
                else {
                    config._pf.unusedTokens.push(token);
                }
                addTimeToArrayFromToken(token, parsedInput, config);
            }
            else if (config._strict && !parsedInput) {
                config._pf.unusedTokens.push(token);
            }
        }

        // add remaining unparsed input length to the string
        config._pf.charsLeftOver = stringLength - totalParsedInputLength;
        if (string.length > 0) {
            config._pf.unusedInput.push(string);
        }

        // clear _12h flag if hour is <= 12
        if (config._pf.bigHour === true && config._a[HOUR] <= 12) {
            config._pf.bigHour = undefined;
        }
        // handle am pm
        if (config._isPm && config._a[HOUR] < 12) {
            config._a[HOUR] += 12;
        }
        // if is 12 am, change hours to 0
        if (config._isPm === false && config._a[HOUR] === 12) {
            config._a[HOUR] = 0;
        }
        dateFromConfig(config);
        checkOverflow(config);
    }

    function unescapeFormat(s) {
        return s.replace(/\\(\[)|\\(\])|\[([^\]\[]*)\]|\\(.)/g, function (matched, p1, p2, p3, p4) {
            return p1 || p2 || p3 || p4;
        });
    }

    // Code from http://stackoverflow.com/questions/3561493/is-there-a-regexp-escape-function-in-javascript
    function regexpEscape(s) {
        return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    }

    // date from string and array of format strings
    function makeDateFromStringAndArray(config) {
        var tempConfig,
            bestMoment,

            scoreToBeat,
            i,
            currentScore;

        if (config._f.length === 0) {
            config._pf.invalidFormat = true;
            config._d = new Date(NaN);
            return;
        }

        for (i = 0; i < config._f.length; i++) {
            currentScore = 0;
            tempConfig = copyConfig({}, config);
            if (config._useUTC != null) {
                tempConfig._useUTC = config._useUTC;
            }
            tempConfig._pf = defaultParsingFlags();
            tempConfig._f = config._f[i];
            makeDateFromStringAndFormat(tempConfig);

            if (!isValid(tempConfig)) {
                continue;
            }

            // if there is any input that was not parsed add a penalty for that format
            currentScore += tempConfig._pf.charsLeftOver;

            //or tokens
            currentScore += tempConfig._pf.unusedTokens.length * 10;

            tempConfig._pf.score = currentScore;

            if (scoreToBeat == null || currentScore < scoreToBeat) {
                scoreToBeat = currentScore;
                bestMoment = tempConfig;
            }
        }

        extend(config, bestMoment || tempConfig);
    }

    // date from iso format
    function parseISO(config) {
        var i, l,
            string = config._i,
            match = isoRegex.exec(string);

        if (match) {
            config._pf.iso = true;
            for (i = 0, l = isoDates.length; i < l; i++) {
                if (isoDates[i][1].exec(string)) {
                    // match[5] should be 'T' or undefined
                    config._f = isoDates[i][0] + (match[6] || ' ');
                    break;
                }
            }
            for (i = 0, l = isoTimes.length; i < l; i++) {
                if (isoTimes[i][1].exec(string)) {
                    config._f += isoTimes[i][0];
                    break;
                }
            }
            if (string.match(parseTokenTimezone)) {
                config._f += 'Z';
            }
            makeDateFromStringAndFormat(config);
        } else {
            config._isValid = false;
        }
    }

    // date from iso format or fallback
    function makeDateFromString(config) {
        parseISO(config);
        if (config._isValid === false) {
            delete config._isValid;
            moment.createFromInputFallback(config);
        }
    }

    function map(arr, fn) {
        var res = [], i;
        for (i = 0; i < arr.length; ++i) {
            res.push(fn(arr[i], i));
        }
        return res;
    }

    function makeDateFromInput(config) {
        var input = config._i, matched;
        if (input === undefined) {
            config._d = new Date();
        } else if (isDate(input)) {
            config._d = new Date(+input);
        } else if ((matched = aspNetJsonRegex.exec(input)) !== null) {
            config._d = new Date(+matched[1]);
        } else if (typeof input === 'string') {
            makeDateFromString(config);
        } else if (isArray(input)) {
            config._a = map(input.slice(0), function (obj) {
                return parseInt(obj, 10);
            });
            dateFromConfig(config);
        } else if (typeof(input) === 'object') {
            dateFromObject(config);
        } else if (typeof(input) === 'number') {
            // from milliseconds
            config._d = new Date(input);
        } else {
            moment.createFromInputFallback(config);
        }
    }

    function makeDate(y, m, d, h, M, s, ms) {
        //can't just apply() to create a date:
        //http://stackoverflow.com/questions/181348/instantiating-a-javascript-object-by-calling-prototype-constructor-apply
        var date = new Date(y, m, d, h, M, s, ms);

        //the date constructor doesn't accept years < 1970
        if (y < 1970) {
            date.setFullYear(y);
        }
        return date;
    }

    function makeUTCDate(y) {
        var date = new Date(Date.UTC.apply(null, arguments));
        if (y < 1970) {
            date.setUTCFullYear(y);
        }
        return date;
    }

    function parseWeekday(input, locale) {
        if (typeof input === 'string') {
            if (!isNaN(input)) {
                input = parseInt(input, 10);
            }
            else {
                input = locale.weekdaysParse(input);
                if (typeof input !== 'number') {
                    return null;
                }
            }
        }
        return input;
    }

    /************************************
        Relative Time
    ************************************/


    // helper function for moment.fn.from, moment.fn.fromNow, and moment.duration.fn.humanize
    function substituteTimeAgo(string, number, withoutSuffix, isFuture, locale) {
        return locale.relativeTime(number || 1, !!withoutSuffix, string, isFuture);
    }

    function relativeTime(posNegDuration, withoutSuffix, locale) {
        var duration = moment.duration(posNegDuration).abs(),
            seconds = round(duration.as('s')),
            minutes = round(duration.as('m')),
            hours = round(duration.as('h')),
            days = round(duration.as('d')),
            months = round(duration.as('M')),
            years = round(duration.as('y')),

            args = seconds < relativeTimeThresholds.s && ['s', seconds] ||
                minutes === 1 && ['m'] ||
                minutes < relativeTimeThresholds.m && ['mm', minutes] ||
                hours === 1 && ['h'] ||
                hours < relativeTimeThresholds.h && ['hh', hours] ||
                days === 1 && ['d'] ||
                days < relativeTimeThresholds.d && ['dd', days] ||
                months === 1 && ['M'] ||
                months < relativeTimeThresholds.M && ['MM', months] ||
                years === 1 && ['y'] || ['yy', years];

        args[2] = withoutSuffix;
        args[3] = +posNegDuration > 0;
        args[4] = locale;
        return substituteTimeAgo.apply({}, args);
    }


    /************************************
        Week of Year
    ************************************/


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

        adjustedMoment = moment(mom).add(daysToDayOfWeek, 'd');
        return {
            week: Math.ceil(adjustedMoment.dayOfYear() / 7),
            year: adjustedMoment.year()
        };
    }

    //http://en.wikipedia.org/wiki/ISO_week_date#Calculating_a_date_given_the_year.2C_week_number_and_weekday
    function dayOfYearFromWeeks(year, week, weekday, firstDayOfWeekOfYear, firstDayOfWeek) {
        var d = makeUTCDate(year, 0, 1).getUTCDay(), daysToAdd, dayOfYear;

        d = d === 0 ? 7 : d;
        weekday = weekday != null ? weekday : firstDayOfWeek;
        daysToAdd = firstDayOfWeek - d + (d > firstDayOfWeekOfYear ? 7 : 0) - (d < firstDayOfWeek ? 7 : 0);
        dayOfYear = 7 * (week - 1) + (weekday - firstDayOfWeek) + daysToAdd + 1;

        return {
            year: dayOfYear > 0 ? year : year - 1,
            dayOfYear: dayOfYear > 0 ?  dayOfYear : daysInYear(year - 1) + dayOfYear
        };
    }

    /************************************
        Top Level Functions
    ************************************/

    function makeMoment(config) {
        var input = config._i,
            format = config._f,
            res;

        config._locale = config._locale || moment.localeData(config._l);

        if (input === null || (format === undefined && input === '')) {
            return moment.invalid({nullInput: true});
        }

        if (typeof input === 'string') {
            config._i = input = config._locale.preparse(input);
        }

        if (moment.isMoment(input)) {
            return new Moment(input, true);
        } else if (format) {
            if (isArray(format)) {
                makeDateFromStringAndArray(config);
            } else {
                makeDateFromStringAndFormat(config);
            }
        } else {
            makeDateFromInput(config);
        }

        res = new Moment(config);
        if (res._nextDay) {
            // Adding is smart enough around DST
            res.add(1, 'd');
            res._nextDay = undefined;
        }

        return res;
    }

    moment = function (input, format, locale, strict) {
        var c;

        if (typeof(locale) === 'boolean') {
            strict = locale;
            locale = undefined;
        }
        // object construction must be done this way.
        // https://github.com/moment/moment/issues/1423
        c = {};
        c._isAMomentObject = true;
        c._i = input;
        c._f = format;
        c._l = locale;
        c._strict = strict;
        c._isUTC = false;
        c._pf = defaultParsingFlags();

        return makeMoment(c);
    };

    moment.suppressDeprecationWarnings = false;

    moment.createFromInputFallback = deprecate(
        'moment construction falls back to js Date. This is ' +
        'discouraged and will be removed in upcoming major ' +
        'release. Please refer to ' +
        'https://github.com/moment/moment/issues/1407 for more info.',
        function (config) {
            config._d = new Date(config._i + (config._useUTC ? ' UTC' : ''));
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
            return moment();
        }
        res = moments[0];
        for (i = 1; i < moments.length; ++i) {
            if (moments[i][fn](res)) {
                res = moments[i];
            }
        }
        return res;
    }

    moment.min = function () {
        var args = [].slice.call(arguments, 0);

        return pickBy('isBefore', args);
    };

    moment.max = function () {
        var args = [].slice.call(arguments, 0);

        return pickBy('isAfter', args);
    };

    // creating with utc
    moment.utc = function (input, format, locale, strict) {
        var c;

        if (typeof(locale) === 'boolean') {
            strict = locale;
            locale = undefined;
        }
        // object construction must be done this way.
        // https://github.com/moment/moment/issues/1423
        c = {};
        c._isAMomentObject = true;
        c._useUTC = true;
        c._isUTC = true;
        c._l = locale;
        c._i = input;
        c._f = format;
        c._strict = strict;
        c._pf = defaultParsingFlags();

        return makeMoment(c).utc();
    };

    // creating with unix timestamp (in seconds)
    moment.unix = function (input) {
        return moment(input * 1000);
    };

    // duration
    moment.duration = function (input, key) {
        var duration = input,
            // matching against regexp is expensive, do it on demand
            match = null,
            sign,
            ret,
            parseIso,
            diffRes;

        if (moment.isDuration(input)) {
            duration = {
                ms: input._milliseconds,
                d: input._days,
                M: input._months
            };
        } else if (typeof input === 'number') {
            duration = {};
            if (key) {
                duration[key] = input;
            } else {
                duration.milliseconds = input;
            }
        } else if (!!(match = aspNetTimeSpanJsonRegex.exec(input))) {
            sign = (match[1] === '-') ? -1 : 1;
            duration = {
                y: 0,
                d: toInt(match[DATE]) * sign,
                h: toInt(match[HOUR]) * sign,
                m: toInt(match[MINUTE]) * sign,
                s: toInt(match[SECOND]) * sign,
                ms: toInt(match[MILLISECOND]) * sign
            };
        } else if (!!(match = isoDurationRegex.exec(input))) {
            sign = (match[1] === '-') ? -1 : 1;
            parseIso = function (inp) {
                // We'd normally use ~~inp for this, but unfortunately it also
                // converts floats to ints.
                // inp may be undefined, so careful calling replace on it.
                var res = inp && parseFloat(inp.replace(',', '.'));
                // apply sign while we're at it
                return (isNaN(res) ? 0 : res) * sign;
            };
            duration = {
                y: parseIso(match[2]),
                M: parseIso(match[3]),
                d: parseIso(match[4]),
                h: parseIso(match[5]),
                m: parseIso(match[6]),
                s: parseIso(match[7]),
                w: parseIso(match[8])
            };
        } else if (typeof duration === 'object' &&
                ('from' in duration || 'to' in duration)) {
            diffRes = momentsDifference(moment(duration.from), moment(duration.to));

            duration = {};
            duration.ms = diffRes.milliseconds;
            duration.M = diffRes.months;
        }

        ret = new Duration(duration);

        if (moment.isDuration(input) && hasOwnProp(input, '_locale')) {
            ret._locale = input._locale;
        }

        return ret;
    };

    // version number
    moment.version = VERSION;

    // default format
    moment.defaultFormat = isoFormat;

    // constant that refers to the ISO standard
    moment.ISO_8601 = function () {};

    // Plugins that add properties should also add the key here (null value),
    // so we can properly clone ourselves.
    moment.momentProperties = momentProperties;

    // This function will be called whenever a moment is mutated.
    // It is intended to keep the offset in sync with the timezone.
    moment.updateOffset = function () {};

    // This function allows you to set a threshold for relative time strings
    moment.relativeTimeThreshold = function (threshold, limit) {
        if (relativeTimeThresholds[threshold] === undefined) {
            return false;
        }
        if (limit === undefined) {
            return relativeTimeThresholds[threshold];
        }
        relativeTimeThresholds[threshold] = limit;
        return true;
    };

    moment.lang = deprecate(
        'moment.lang is deprecated. Use moment.locale instead.',
        function (key, value) {
            return moment.locale(key, value);
        }
    );

    // This function will load locale and then set the global locale.  If
    // no arguments are passed in, it will simply return the current global
    // locale key.
    moment.locale = function (key, values) {
        var data;
        if (key) {
            if (typeof(values) !== 'undefined') {
                data = moment.defineLocale(key, values);
            }
            else {
                data = moment.localeData(key);
            }

            if (data) {
                moment.duration._locale = moment._locale = data;
            }
        }

        return moment._locale._abbr;
    };

    moment.defineLocale = function (name, values) {
        if (values !== null) {
            values.abbr = name;
            if (!locales[name]) {
                locales[name] = new Locale();
            }
            locales[name].set(values);

            // backwards compat for now: also set the locale
            moment.locale(name);

            return locales[name];
        } else {
            // useful for testing
            delete locales[name];
            return null;
        }
    };

    moment.langData = deprecate(
        'moment.langData is deprecated. Use moment.localeData instead.',
        function (key) {
            return moment.localeData(key);
        }
    );

    // returns locale data
    moment.localeData = function (key) {
        var locale;

        if (key && key._locale && key._locale._abbr) {
            key = key._locale._abbr;
        }

        if (!key) {
            return moment._locale;
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
    };

    // compare moment object
    moment.isMoment = function (obj) {
        return obj instanceof Moment ||
            (obj != null && hasOwnProp(obj, '_isAMomentObject'));
    };

    // for typechecking Duration objects
    moment.isDuration = function (obj) {
        return obj instanceof Duration;
    };

    for (i = lists.length - 1; i >= 0; --i) {
        makeList(lists[i]);
    }

    moment.normalizeUnits = function (units) {
        return normalizeUnits(units);
    };

    moment.invalid = function (flags) {
        var m = moment.utc(NaN);
        if (flags != null) {
            extend(m._pf, flags);
        }
        else {
            m._pf.userInvalidated = true;
        }

        return m;
    };

    moment.parseZone = function () {
        return moment.apply(null, arguments).parseZone();
    };

    moment.parseTwoDigitYear = function (input) {
        return toInt(input) + (toInt(input) > 68 ? 1900 : 2000);
    };

    /************************************
        Moment Prototype
    ************************************/


    extend(moment.fn = Moment.prototype, {

        clone : function () {
            return moment(this);
        },

        valueOf : function () {
            return +this._d + ((this._offset || 0) * 60000);
        },

        unix : function () {
            return Math.floor(+this / 1000);
        },

        toString : function () {
            return this.clone().locale('en').format('ddd MMM DD YYYY HH:mm:ss [GMT]ZZ');
        },

        toDate : function () {
            return this._offset ? new Date(+this) : this._d;
        },

        toISOString : function () {
            var m = moment(this).utc();
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
        },

        toArray : function () {
            var m = this;
            return [
                m.year(),
                m.month(),
                m.date(),
                m.hours(),
                m.minutes(),
                m.seconds(),
                m.milliseconds()
            ];
        },

        isValid : function () {
            return isValid(this);
        },

        isDSTShifted : function () {
            if (this._a) {
                return this.isValid() && compareArrays(this._a, (this._isUTC ? moment.utc(this._a) : moment(this._a)).toArray()) > 0;
            }

            return false;
        },

        parsingFlags : function () {
            return extend({}, this._pf);
        },

        invalidAt: function () {
            return this._pf.overflow;
        },

        utc : function (keepLocalTime) {
            return this.zone(0, keepLocalTime);
        },

        local : function (keepLocalTime) {
            if (this._isUTC) {
                this.zone(0, keepLocalTime);
                this._isUTC = false;

                if (keepLocalTime) {
                    this.add(this._dateTzOffset(), 'm');
                }
            }
            return this;
        },

        format : function (inputString) {
            var output = formatMoment(this, inputString || moment.defaultFormat);
            return this.localeData().postformat(output);
        },

        add : createAdder(1, 'add'),

        subtract : createAdder(-1, 'subtract'),

        diff : function (input, units, asFloat) {
            var that = makeAs(input, this),
                zoneDiff = (this.zone() - that.zone()) * 6e4,
                diff, output, daysAdjust;

            units = normalizeUnits(units);

            if (units === 'year' || units === 'month') {
                // average number of days in the months in the given dates
                diff = (this.daysInMonth() + that.daysInMonth()) * 432e5; // 24 * 60 * 60 * 1000 / 2
                // difference in months
                output = ((this.year() - that.year()) * 12) + (this.month() - that.month());
                // adjust by taking difference in days, average number of days
                // and dst in the given months.
                daysAdjust = (this - moment(this).startOf('month')) -
                    (that - moment(that).startOf('month'));
                // same as above but with zones, to negate all dst
                daysAdjust -= ((this.zone() - moment(this).startOf('month').zone()) -
                        (that.zone() - moment(that).startOf('month').zone())) * 6e4;
                output += daysAdjust / diff;
                if (units === 'year') {
                    output = output / 12;
                }
            } else {
                diff = (this - that);
                output = units === 'second' ? diff / 1e3 : // 1000
                    units === 'minute' ? diff / 6e4 : // 1000 * 60
                    units === 'hour' ? diff / 36e5 : // 1000 * 60 * 60
                    units === 'day' ? (diff - zoneDiff) / 864e5 : // 1000 * 60 * 60 * 24, negate dst
                    units === 'week' ? (diff - zoneDiff) / 6048e5 : // 1000 * 60 * 60 * 24 * 7, negate dst
                    diff;
            }
            return asFloat ? output : absRound(output);
        },

        from : function (time, withoutSuffix) {
            return moment.duration({to: this, from: time}).locale(this.locale()).humanize(!withoutSuffix);
        },

        fromNow : function (withoutSuffix) {
            return this.from(moment(), withoutSuffix);
        },

        calendar : function (time) {
            // We want to compare the start of today, vs this.
            // Getting start-of-today depends on whether we're zone'd or not.
            var now = time || moment(),
                sod = makeAs(now, this).startOf('day'),
                diff = this.diff(sod, 'days', true),
                format = diff < -6 ? 'sameElse' :
                    diff < -1 ? 'lastWeek' :
                    diff < 0 ? 'lastDay' :
                    diff < 1 ? 'sameDay' :
                    diff < 2 ? 'nextDay' :
                    diff < 7 ? 'nextWeek' : 'sameElse';
            return this.format(this.localeData().calendar(format, this, moment(now)));
        },

        isLeapYear : function () {
            return isLeapYear(this.year());
        },

        isDST : function () {
            return (this.zone() < this.clone().month(0).zone() ||
                this.zone() < this.clone().month(5).zone());
        },

        day : function (input) {
            var day = this._isUTC ? this._d.getUTCDay() : this._d.getDay();
            if (input != null) {
                input = parseWeekday(input, this.localeData());
                return this.add(input - day, 'd');
            } else {
                return day;
            }
        },

        month : makeAccessor('Month', true),

        startOf : function (units) {
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
                /* falls through */
            }

            // weeks are a special case
            if (units === 'week') {
                this.weekday(0);
            } else if (units === 'isoWeek') {
                this.isoWeekday(1);
            }

            // quarters are also special
            if (units === 'quarter') {
                this.month(Math.floor(this.month() / 3) * 3);
            }

            return this;
        },

        endOf: function (units) {
            units = normalizeUnits(units);
            if (units === undefined || units === 'millisecond') {
                return this;
            }
            return this.startOf(units).add(1, (units === 'isoWeek' ? 'week' : units)).subtract(1, 'ms');
        },

        isAfter: function (input, units) {
            var inputMs;
            units = normalizeUnits(typeof units !== 'undefined' ? units : 'millisecond');
            if (units === 'millisecond') {
                input = moment.isMoment(input) ? input : moment(input);
                return +this > +input;
            } else {
                inputMs = moment.isMoment(input) ? +input : +moment(input);
                return inputMs < +this.clone().startOf(units);
            }
        },

        isBefore: function (input, units) {
            var inputMs;
            units = normalizeUnits(typeof units !== 'undefined' ? units : 'millisecond');
            if (units === 'millisecond') {
                input = moment.isMoment(input) ? input : moment(input);
                return +this < +input;
            } else {
                inputMs = moment.isMoment(input) ? +input : +moment(input);
                return +this.clone().endOf(units) < inputMs;
            }
        },

        isSame: function (input, units) {
            var inputMs;
            units = normalizeUnits(units || 'millisecond');
            if (units === 'millisecond') {
                input = moment.isMoment(input) ? input : moment(input);
                return +this === +input;
            } else {
                inputMs = +moment(input);
                return +(this.clone().startOf(units)) <= inputMs && inputMs <= +(this.clone().endOf(units));
            }
        },

        min: deprecate(
                 'moment().min is deprecated, use moment.min instead. https://github.com/moment/moment/issues/1548',
                 function (other) {
                     other = moment.apply(null, arguments);
                     return other < this ? this : other;
                 }
         ),

        max: deprecate(
                'moment().max is deprecated, use moment.max instead. https://github.com/moment/moment/issues/1548',
                function (other) {
                    other = moment.apply(null, arguments);
                    return other > this ? this : other;
                }
        ),

        // keepLocalTime = true means only change the timezone, without
        // affecting the local hour. So 5:31:26 +0300 --[zone(2, true)]-->
        // 5:31:26 +0200 It is possible that 5:31:26 doesn't exist int zone
        // +0200, so we adjust the time as needed, to be valid.
        //
        // Keeping the time actually adds/subtracts (one hour)
        // from the actual represented time. That is why we call updateOffset
        // a second time. In case it wants us to change the offset again
        // _changeInProgress == true case, then we have to adjust, because
        // there is no such time in the given timezone.
        zone : function (input, keepLocalTime) {
            var offset = this._offset || 0,
                localAdjust;
            if (input != null) {
                if (typeof input === 'string') {
                    input = timezoneMinutesFromString(input);
                }
                if (Math.abs(input) < 16) {
                    input = input * 60;
                }
                if (!this._isUTC && keepLocalTime) {
                    localAdjust = this._dateTzOffset();
                }
                this._offset = input;
                this._isUTC = true;
                if (localAdjust != null) {
                    this.subtract(localAdjust, 'm');
                }
                if (offset !== input) {
                    if (!keepLocalTime || this._changeInProgress) {
                        addOrSubtractDurationFromMoment(this,
                                moment.duration(offset - input, 'm'), 1, false);
                    } else if (!this._changeInProgress) {
                        this._changeInProgress = true;
                        moment.updateOffset(this, true);
                        this._changeInProgress = null;
                    }
                }
            } else {
                return this._isUTC ? offset : this._dateTzOffset();
            }
            return this;
        },

        zoneAbbr : function () {
            return this._isUTC ? 'UTC' : '';
        },

        zoneName : function () {
            return this._isUTC ? 'Coordinated Universal Time' : '';
        },

        parseZone : function () {
            if (this._tzm) {
                this.zone(this._tzm);
            } else if (typeof this._i === 'string') {
                this.zone(this._i);
            }
            return this;
        },

        hasAlignedHourOffset : function (input) {
            if (!input) {
                input = 0;
            }
            else {
                input = moment(input).zone();
            }

            return (this.zone() - input) % 60 === 0;
        },

        daysInMonth : function () {
            return daysInMonth(this.year(), this.month());
        },

        dayOfYear : function (input) {
            var dayOfYear = round((moment(this).startOf('day') - moment(this).startOf('year')) / 864e5) + 1;
            return input == null ? dayOfYear : this.add((input - dayOfYear), 'd');
        },

        quarter : function (input) {
            return input == null ? Math.ceil((this.month() + 1) / 3) : this.month((input - 1) * 3 + this.month() % 3);
        },

        weekYear : function (input) {
            var year = weekOfYear(this, this.localeData()._week.dow, this.localeData()._week.doy).year;
            return input == null ? year : this.add((input - year), 'y');
        },

        isoWeekYear : function (input) {
            var year = weekOfYear(this, 1, 4).year;
            return input == null ? year : this.add((input - year), 'y');
        },

        week : function (input) {
            var week = this.localeData().week(this);
            return input == null ? week : this.add((input - week) * 7, 'd');
        },

        isoWeek : function (input) {
            var week = weekOfYear(this, 1, 4).week;
            return input == null ? week : this.add((input - week) * 7, 'd');
        },

        weekday : function (input) {
            var weekday = (this.day() + 7 - this.localeData()._week.dow) % 7;
            return input == null ? weekday : this.add(input - weekday, 'd');
        },

        isoWeekday : function (input) {
            // behaves the same as moment#day except
            // as a getter, returns 7 instead of 0 (1-7 range instead of 0-6)
            // as a setter, sunday should belong to the previous week.
            return input == null ? this.day() || 7 : this.day(this.day() % 7 ? input : input - 7);
        },

        isoWeeksInYear : function () {
            return weeksInYear(this.year(), 1, 4);
        },

        weeksInYear : function () {
            var weekInfo = this.localeData()._week;
            return weeksInYear(this.year(), weekInfo.dow, weekInfo.doy);
        },

        get : function (units) {
            units = normalizeUnits(units);
            return this[units]();
        },

        set : function (units, value) {
            units = normalizeUnits(units);
            if (typeof this[units] === 'function') {
                this[units](value);
            }
            return this;
        },

        // If passed a locale key, it will set the locale for this
        // instance.  Otherwise, it will return the locale configuration
        // variables for this instance.
        locale : function (key) {
            var newLocaleData;

            if (key === undefined) {
                return this._locale._abbr;
            } else {
                newLocaleData = moment.localeData(key);
                if (newLocaleData != null) {
                    this._locale = newLocaleData;
                }
                return this;
            }
        },

        lang : deprecate(
            'moment().lang() is deprecated. Instead, use moment().localeData() to get the language configuration. Use moment().locale() to change languages.',
            function (key) {
                if (key === undefined) {
                    return this.localeData();
                } else {
                    return this.locale(key);
                }
            }
        ),

        localeData : function () {
            return this._locale;
        },

        _dateTzOffset : function () {
            // On Firefox.24 Date#getTimezoneOffset returns a floating point.
            // https://github.com/moment/moment/pull/1871
            return Math.round(this._d.getTimezoneOffset() / 15) * 15;
        }
    });

    function rawMonthSetter(mom, value) {
        var dayOfMonth;

        // TODO: Move this out of here!
        if (typeof value === 'string') {
            value = mom.localeData().monthsParse(value);
            // TODO: Another silent failure?
            if (typeof value !== 'number') {
                return mom;
            }
        }

        dayOfMonth = Math.min(mom.date(),
                daysInMonth(mom.year(), value));
        mom._d['set' + (mom._isUTC ? 'UTC' : '') + 'Month'](value, dayOfMonth);
        return mom;
    }

    function rawGetter(mom, unit) {
        return mom._d['get' + (mom._isUTC ? 'UTC' : '') + unit]();
    }

    function rawSetter(mom, unit, value) {
        if (unit === 'Month') {
            return rawMonthSetter(mom, value);
        } else {
            return mom._d['set' + (mom._isUTC ? 'UTC' : '') + unit](value);
        }
    }

    function makeAccessor(unit, keepTime) {
        return function (value) {
            if (value != null) {
                rawSetter(this, unit, value);
                moment.updateOffset(this, keepTime);
                return this;
            } else {
                return rawGetter(this, unit);
            }
        };
    }

    moment.fn.millisecond = moment.fn.milliseconds = makeAccessor('Milliseconds', false);
    moment.fn.second = moment.fn.seconds = makeAccessor('Seconds', false);
    moment.fn.minute = moment.fn.minutes = makeAccessor('Minutes', false);
    // Setting the hour should keep the time, because the user explicitly
    // specified which hour he wants. So trying to maintain the same hour (in
    // a new timezone) makes sense. Adding/subtracting hours does not follow
    // this rule.
    moment.fn.hour = moment.fn.hours = makeAccessor('Hours', true);
    // moment.fn.month is defined separately
    moment.fn.date = makeAccessor('Date', true);
    moment.fn.dates = deprecate('dates accessor is deprecated. Use date instead.', makeAccessor('Date', true));
    moment.fn.year = makeAccessor('FullYear', true);
    moment.fn.years = deprecate('years accessor is deprecated. Use year instead.', makeAccessor('FullYear', true));

    // add plural methods
    moment.fn.days = moment.fn.day;
    moment.fn.months = moment.fn.month;
    moment.fn.weeks = moment.fn.week;
    moment.fn.isoWeeks = moment.fn.isoWeek;
    moment.fn.quarters = moment.fn.quarter;

    // add aliased format methods
    moment.fn.toJSON = moment.fn.toISOString;

    /************************************
        Duration Prototype
    ************************************/


    function daysToYears (days) {
        // 400 years have 146097 days (taking into account leap year rules)
        return days * 400 / 146097;
    }

    function yearsToDays (years) {
        // years * 365 + absRound(years / 4) -
        //     absRound(years / 100) + absRound(years / 400);
        return years * 146097 / 400;
    }

    extend(moment.duration.fn = Duration.prototype, {

        _bubble : function () {
            var milliseconds = this._milliseconds,
                days = this._days,
                months = this._months,
                data = this._data,
                seconds, minutes, hours, years = 0;

            // The following code bubbles up values, see the tests for
            // examples of what that means.
            data.milliseconds = milliseconds % 1000;

            seconds = absRound(milliseconds / 1000);
            data.seconds = seconds % 60;

            minutes = absRound(seconds / 60);
            data.minutes = minutes % 60;

            hours = absRound(minutes / 60);
            data.hours = hours % 24;

            days += absRound(hours / 24);

            // Accurately convert days to years, assume start from year 0.
            years = absRound(daysToYears(days));
            days -= absRound(yearsToDays(years));

            // 30 days to a month
            // TODO (iskren): Use anchor date (like 1st Jan) to compute this.
            months += absRound(days / 30);
            days %= 30;

            // 12 months -> 1 year
            years += absRound(months / 12);
            months %= 12;

            data.days = days;
            data.months = months;
            data.years = years;
        },

        abs : function () {
            this._milliseconds = Math.abs(this._milliseconds);
            this._days = Math.abs(this._days);
            this._months = Math.abs(this._months);

            this._data.milliseconds = Math.abs(this._data.milliseconds);
            this._data.seconds = Math.abs(this._data.seconds);
            this._data.minutes = Math.abs(this._data.minutes);
            this._data.hours = Math.abs(this._data.hours);
            this._data.months = Math.abs(this._data.months);
            this._data.years = Math.abs(this._data.years);

            return this;
        },

        weeks : function () {
            return absRound(this.days() / 7);
        },

        valueOf : function () {
            return this._milliseconds +
              this._days * 864e5 +
              (this._months % 12) * 2592e6 +
              toInt(this._months / 12) * 31536e6;
        },

        humanize : function (withSuffix) {
            var output = relativeTime(this, !withSuffix, this.localeData());

            if (withSuffix) {
                output = this.localeData().pastFuture(+this, output);
            }

            return this.localeData().postformat(output);
        },

        add : function (input, val) {
            // supports only 2.0-style add(1, 's') or add(moment)
            var dur = moment.duration(input, val);

            this._milliseconds += dur._milliseconds;
            this._days += dur._days;
            this._months += dur._months;

            this._bubble();

            return this;
        },

        subtract : function (input, val) {
            var dur = moment.duration(input, val);

            this._milliseconds -= dur._milliseconds;
            this._days -= dur._days;
            this._months -= dur._months;

            this._bubble();

            return this;
        },

        get : function (units) {
            units = normalizeUnits(units);
            return this[units.toLowerCase() + 's']();
        },

        as : function (units) {
            var days, months;
            units = normalizeUnits(units);

            if (units === 'month' || units === 'year') {
                days = this._days + this._milliseconds / 864e5;
                months = this._months + daysToYears(days) * 12;
                return units === 'month' ? months : months / 12;
            } else {
                // handle milliseconds separately because of floating point math errors (issue #1867)
                days = this._days + Math.round(yearsToDays(this._months / 12));
                switch (units) {
                    case 'week': return days / 7 + this._milliseconds / 6048e5;
                    case 'day': return days + this._milliseconds / 864e5;
                    case 'hour': return days * 24 + this._milliseconds / 36e5;
                    case 'minute': return days * 24 * 60 + this._milliseconds / 6e4;
                    case 'second': return days * 24 * 60 * 60 + this._milliseconds / 1000;
                    // Math.floor prevents floating point math errors here
                    case 'millisecond': return Math.floor(days * 24 * 60 * 60 * 1000) + this._milliseconds;
                    default: throw new Error('Unknown unit ' + units);
                }
            }
        },

        lang : moment.fn.lang,
        locale : moment.fn.locale,

        toIsoString : deprecate(
            'toIsoString() is deprecated. Please use toISOString() instead ' +
            '(notice the capitals)',
            function () {
                return this.toISOString();
            }
        ),

        toISOString : function () {
            // inspired by https://github.com/dordille/moment-isoduration/blob/master/moment.isoduration.js
            var years = Math.abs(this.years()),
                months = Math.abs(this.months()),
                days = Math.abs(this.days()),
                hours = Math.abs(this.hours()),
                minutes = Math.abs(this.minutes()),
                seconds = Math.abs(this.seconds() + this.milliseconds() / 1000);

            if (!this.asSeconds()) {
                // this is the same as C#'s (Noda) and python (isodate)...
                // but not other JS (goog.date)
                return 'P0D';
            }

            return (this.asSeconds() < 0 ? '-' : '') +
                'P' +
                (years ? years + 'Y' : '') +
                (months ? months + 'M' : '') +
                (days ? days + 'D' : '') +
                ((hours || minutes || seconds) ? 'T' : '') +
                (hours ? hours + 'H' : '') +
                (minutes ? minutes + 'M' : '') +
                (seconds ? seconds + 'S' : '');
        },

        localeData : function () {
            return this._locale;
        }
    });

    moment.duration.fn.toString = moment.duration.fn.toISOString;

    function makeDurationGetter(name) {
        moment.duration.fn[name] = function () {
            return this._data[name];
        };
    }

    for (i in unitMillisecondFactors) {
        if (hasOwnProp(unitMillisecondFactors, i)) {
            makeDurationGetter(i.toLowerCase());
        }
    }

    moment.duration.fn.asMilliseconds = function () {
        return this.as('ms');
    };
    moment.duration.fn.asSeconds = function () {
        return this.as('s');
    };
    moment.duration.fn.asMinutes = function () {
        return this.as('m');
    };
    moment.duration.fn.asHours = function () {
        return this.as('h');
    };
    moment.duration.fn.asDays = function () {
        return this.as('d');
    };
    moment.duration.fn.asWeeks = function () {
        return this.as('weeks');
    };
    moment.duration.fn.asMonths = function () {
        return this.as('M');
    };
    moment.duration.fn.asYears = function () {
        return this.as('y');
    };

    /************************************
        Default Locale
    ************************************/


    // Set default locale, other locale will inherit from English.
    moment.locale('en', {
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

    /* EMBED_LOCALES */

    /************************************
        Exposing Moment
    ************************************/

    function makeGlobal(shouldDeprecate) {
        /*global ender:false */
        if (typeof ender !== 'undefined') {
            return;
        }
        oldGlobalMoment = globalScope.moment;
        if (shouldDeprecate) {
            globalScope.moment = deprecate(
                    'Accessing Moment through the global scope is ' +
                    'deprecated, and will be removed in an upcoming ' +
                    'release.',
                    moment);
        } else {
            globalScope.moment = moment;
        }
    }

    // CommonJS module is defined
    if (hasModule) {
        module.exports = moment;
    } else if (typeof define === 'function' && define.amd) {
        define('moment', function (require, exports, module) {
            if (module.config && module.config() && module.config().noGlobal === true) {
                // release the global variable
                globalScope.moment = oldGlobalMoment;
            }

            return moment;
        });
        makeGlobal(true);
    } else {
        makeGlobal();
    }
}).call(this);

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],11:[function(require,module,exports){
(function (Buffer){
var iota = require("iota-array")

var hasTypedArrays  = ((typeof Float64Array) !== "undefined")
var hasBuffer       = ((typeof Buffer) !== "undefined")

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
  if(hasBuffer) {
    if(Buffer.isBuffer(data)) {
      return "buffer"
    }
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
}).call(this,require("buffer").Buffer)
},{"buffer":2,"iota-array":12}],12:[function(require,module,exports){
"use strict"

function iota(n) {
  var result = new Array(n)
  for(var i=0; i<n; ++i) {
    result[i] = i
  }
  return result
}

module.exports = iota
},{}],13:[function(require,module,exports){
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

},{"performance-now":14}],14:[function(require,module,exports){
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
},{"_process":7}],15:[function(require,module,exports){
// chat/core.js
// The core of the chat simulation behavior

// var inherits = require("inherits");
var extend = require("extend");
var controller = require("tpp-controller");
var donger = require("./donger.js");

function currTime() { return new Date().getTime(); }

/**
 * 
 */
function Chat() {
	this._initUserlist();
	this._initChatSpawnLoop();
	
	this._initVisitorEvents();
}
// inherits(Chat, );
extend(Chat.prototype, {
	
	_u_list : [], //contains the list of all users
	_u_hash : {}, //contains a hash of usernames to users
	_u_classes: {
		chatleader: [],
		
	},
	
	_initUserlist : function() {
		var ul = require("./userlist");
		for (var i = 0; i < ul.length; i++) {
			var u = new User(ul[i]);
			this._u_list.push(u);
			this._u_hash[u.name] = u;
			
			if (!this.playerUser) {
				//The first user is the player's user
				this.playerUser = u; 
			}
		}
	},
	
	_randomUser : function(time){
		time = time || new Date().getTime();
		var index;
		for (var i = 0; i < 20; i++) { //try up to only 20 times
			index = Math.floor(Math.random() * this._u_list.length);
			var u = this._u_list[index];
			if (u.nextTimeTalk > time) return u;
		}
		
		//If we can't find a user to return, make a new one as a fallback
		var u = new User({name: "guest"+ (Math.floor(Math.random() * 20000) + 10000) });
		this._u_list.push(u);
		this._u_hash[u.name] = u;
		return u;
	},
	
	///////////////////////////////////////////////////
	
	_currChatMode : null,
	_initChatSpawnLoop : function() {
		var self = this;
		
		self._currChatMode = "loading";
		setTimeout(chatTick, 3000);
		
		self.setChatMode = function(mode) {
			self._currChatMode = mode;
			setTimeout(chatTick, 0);
		};
		
		function chatTick() {
			var nextUpdate = self.updateChat();
			if (nextUpdate < 0) return;
			setTimeout(chatTick, nextUpdate);
		}
	},
	
	setChatMode : function(){},
	
	updateChat : function() {
		switch (this._currChatMode) {
			case "normal":
				this.spawnChatMessage();
				return 300 + Math.floor(Math.random()*400);
			case "loading":
				//TODO
				return -1;
			case "disconnected":
				//TODO
				return 1000;
		}
	},
	
	///////////////////////////////////////////////////
	
	_ctx_pool : [], // Contexts that are active or have not yet timed out
	// Long term contexts:
	_ctx_location : null, // The context for the current location
	_ctx_occasion : null, // The context for the current occasion
	
	/** Adds a Chat Context to the context pool. */
	addContext : function(ctx) {
		ctx.timestamp = currTime();
		this._ctx_pool.push(ctx);
		
	},
	
	setLocationContext : function(context) {
		
	},
	
	/** */
	_tick_manageContexts : function() {
		var date = currTime();
		
		// Prune timed-out contexts
		var pool = this._ctx_pool;
		for (var i = 0; i < pool.length; i++) {
			if (pool[i].isTimedout(date)) {
				pool.splice(i, 1);
				i--;
				continue;
			}
		}
	},
	
	///////////////////////////////////////////////////
	playerUser: null,
	
	_initVisitorEvents : function() {
		var self = this;
		$(function(){
			
			$("#chatbox").on("keypress", function(e){
				if (e.which == 13 && !e.shiftKey && !e.ctrlKey) { // Enter
					var msg = $("#chatbox").val();
					$("#chatbox").val("");
					if (msg.indexOf("/") != 0) {
						self.putMessage(self.playerUser, msg);
					}
					//Process chat message
					self._processPlayerChatMessage(msg);
					
					e.preventDefault();
				}
			});
			
			
		});
	},
	
	_processPlayerChatMessage : function(msg) {
		var res;
		if (res = /^(up|down|left|right|start|select|b|a)/i.exec(msg)) {
			controller.submitChatKeypress(res[1]);
		}
		
		
	},
	
	
	///////////////////////////////////////////////////
	
	/** 
	 * Puts a message into the chat.
	 */
	putMessage : function(user, text) {
		if (typeof user == "string")
			user = this._u_hash[user];
		
		var line = $("<li>").addClass("chat-line");
		var badges = $("<span>").addClass("badges");
		var from = $("<span>").addClass("from");
		var colon = null;
		var msg = $("<span>").addClass("message");
		
		// Style the message
		if (user.badges) badges.append(user.badges);
		from.html(user.name);
		from.css({ "color": user.color });
		
		//Process message
		//TODO replace donger placeholders here
		text = donger.dongerfy(text);
		
		// Escape HTML
		text = msg.text(text).html();
		
		// Replace Twitch emotes
		text = donger.twitchify(text);
		
		msg.html(text);
		
		if (!text.startsWith("/me ")) {
			colon = $("<span>").addClass("colon").html(":");
		} else {
			msg.css({ "color": user.color });
		}
		
		line.append(badges, from, colon, msg);
		
		$("#chat-lines").append(line);
	},

	
});
module.exports = new Chat();


function spawnChatMessage() {
	var date = currTime();
		
	// 
	var pool = this._ctx_pool;
	var distPool = [];
	var accum = 0;
	for (var i = 0; i < pool.length; i++) {
		var inf = pool[i].getInfluence();
		if (inf < 0) inf = 0;
		
		accum += inf;
		distPool.push(accum);
	}
	
	var index = Math.random() * accum;
	var selCtx = null;
	for (var i = 0; i < pool.length; i++) {
		if (index > distPool[i]) continue;
		selCtx = pool[i]; break;
	}
	
	//Context to pull from is now selected
	var msg = selCtx.getChatMessage(date);
	
}
Chat.spawnChatMessage = spawnChatMessage;






/**
 * 
 */
function User(obj){
	if (!(this instanceof User)) return new User(obj);
	
	extend(this, obj);
}
User.prototype = {
	name : null,
	color : "#000000",
	postmsg : "",
	premsg : "",
	badges : null,
	
	nextTimeTalk: 0, //next time this user is allowed to talk
	lastTimeout: 0, //the last timeout this user had, in seconds. More than 5 seconds indicates a ban moment.
	
};

},{"./donger.js":16,"./userlist":17,"extend":8,"tpp-controller":"tpp-controller"}],16:[function(require,module,exports){
// donger.js
// For easy definition of dongers and Twitch emotes

module.exports = {
	dongerfy : function(str) {
		return str.replace(/\<d:(\w+)\>/ig, function(match, p1){
			return dongers[p1] || "";
		});
	},
	
	twitchify : function(str) {
		return str.replace(twitchEmotePattern, function(match){
			return '<span class="twitchemote em-'+match+'"></span>';
		});
	},
}

var twitchEmotePattern = new RegExp([
	"DansGame",
	"PraiseIt",
	"BibleThump",
	"BloodTrail",
	"PJSalt",
	"BabyRage",
	"HeyGuys",
	"BionicBunion",
	"ResidentSleeper",
	"WinWaker",
	"ShibeZ",
	"BigBrother",
	"DatSheffy",
	"BrokeBack",
	"EleGiggle",
	"TriHard",
	"OMGScoots",
	"PogChamp",
	"Kappa",
	"SoonerLater",
	"KappaHD",
	"BrainSlug",
	"SwiftRage",
	"FailFish",
	"MrDestructoid",
	"DBStyle",
	"OpieOP",
	"GasJoker",
	"4Head",
	"KevinTurtle",
	"Keepo",
	"OneHand",
	"KAPOW",
	"Kreygasm",
].join("|"), "g");

var dongers = {
	"riot" : "ヽ༼ຈل͜ຈ༽ﾉ",
	"riotover": "┌༼ຈل͜ຈ༽┐",
	"sophisticated" : "ヽ༼ຈل͜ರೃ༽ﾉ",
	"praise" : "༼ つ ◕_◕ ༽つ",
	"runningman": "ᕕ༼ຈل͜ຈ༽ᕗ",
	"dance" : "♫ ┌༼ຈل͜ຈ༽┘ ♪",
	"lenny": "( ͡° ͜ʖ ͡°)",
	"dongerhood": "༼ ºل͟º ༼ ºل͟º ༼ ºل͟º ༽ ºل͟º ༽ ºل͟º ༽",
	
	"tableflip" : "(╯°□°)╯︵ ┻━┻",
	"tableback" : "┬─┬ノ(ಠ_ಠノ)",
	"tableflip2" : "(ノಠ益ಠ)ノ ┻━┻",
	"tableback2" : "┬─┬ノ(ಠ益ಠノ)",
	"tableflip3" : "┻━┻ ︵ヽ(`Д´)ﾉ︵ ┻━┻",
	"tableback3" : "┬─┬ ︵ヽ(ಠ_ಠ)ﾉ︵ ┬─┬",
	"tableflip4" : "┬─┬﻿ ︵ /(.□. \\）",
	"tableback4" : "-( °-°)- ノ(ಠ_ಠノ)", 
	
	"wooper": "卅(◕‿◕)卅",
	"bronzonger": "└(oѪo)┘",
	"doot" : "⊹⋛⋋(◐⊝◑)⋌⋚⊹",
	"joltik": "╭<<◕°ω°◕>>╮",
	"megadonger" : "╲/╭༼ຈຈل͜ຈຈ༽╮/╱",
	"trapnich": "ヽ༼✪﹏✪༽ﾉ",
};



var copypasta = {
	"riotpolice" : [
		"(▀̿ ̿Ĺ̯▀̿ ̿) THIS IS THE RIOT POLICE. STOP RIOTING NOW (▀̿ ̿Ĺ̯▀̿ ̿)",
		"(⌐■_■)=/̵/'̿'̿ ̿ ̿ ヽ༼ຈل͜ຈ༽ﾉ THIS IS THE RIOT POLICE, CEASE RIOTING OR I SHOOT THE DONGER!!",
	],
	"like2raise" : "I like to raise my Donger I do it all the time ヽ༼ຈل͜ຈ༽ﾉ and every time its lowered┌༼ຈل͜ຈ༽┐ I cry and start to whine ┌༼@ل͜@༽┐But never need to worry ༼ ºل͟º༽ my Donger's staying strong ヽ༼ຈل͜ຈ༽ﾉA Donger saved is a Donger earned so sing the Donger song! ᕦ༼ຈل͜ຈ༽ᕤ",
	"megadonger" : [
		"╲/╭༼ຈຈل͜ຈຈ༽╮/╱ PRAISE THE MEGA-DONGER ╲/╭༼ຈຈل͜ຈຈ༽╮/╱",
		"ヽ༼ຈل͜ຈ༽ﾉ donger's dongite is reacting to the mega stone ((ヽ༼ຈل͜ຈ༽ﾉ)) donger evolved into mega donger \"╲/༼ຈຈل͜ຈຈ༽/╱\" mega donger used raise, it's super effective wild lowered dong fainted",
		"ヽ༼ຈل͜ຈ༽ﾉ Donger is reacting to the Dongerite! ,/╲/╭༼ຈຈل͜ຈຈ༽╮/╱, Donger Mega Evolved into Mega Donger!",
		"DONGER'S DONGERITE IS REACTING TO THE MEGA RING! ,/╲/╭༼ຈຈل͜ຈຈ༽╮/╱﻿, MEGA RIOT ,/╲/╭༼ຈຈل͜ຈຈ༽╮/╱﻿,",
	],
	"ripdoof" : "I... I just wanted to deposit Bidoof. She was so good to us... always so loyal. When she couldn't evolve for us, she went to the Daycare happily, and then came back happily, wearing that stupid grin on her face all the while. When we asked her to go to the PC, she never once complained. She was just there for us, loyally, the way she always had been....And then we killed her. RIP Doof, you will be missed. :(",
	"twitch" : [
		"I'm a Twitch employee and I'm stopping by to say your Twitch chat is out of control. I have received several complaints from your very own viewers that their chat experience is ruined because of constant Emote and Copypasta spamming. This type unacceptable by Twitch's standards and if your mods don't do something about it we will be forced to shut down your channel. Wish you all the best - Twitch",
		/* Park version */"I'm a Twitch employee and I'm stopping by to say your Twitch chat looks too much like the official twitch chat. I have received several complaints from your very own visitors that their chat experience is ruined because of constant chat being spammed on the right-hand side. This is unacceptable by Twitch's TOS and if your mods don't do something about it we will be forced to shut down your park. Wish you all the best - Twitch",
	],
	"stillathing" : [
		"Is tpp still a thing?",
		"Is tpp still a thing? Kappa",
		"Is \"Is tpp still a thing?\" still a thing?",
		"Is \"Is \"Is tpp still a thing?\" still a thing?\" still a thing?",
		"Is \"Is \"Is \"Is tpp still a thing?\" still a thing?\" still a thing?\" still a thing?",
		"Is \"Is \"Is \"Is Is \"Is \"Is \"Is tpp still a thing?\" still a thing?\" still a thing?\" still a thing? still a thing?\" still a thing?\" still a thing?\" still a thing?",
	],
	"danceriot" : [
		"♫ ┌༼ຈل͜ຈ༽┘ DANCE RIOT ♪ └༼ຈل͜ຈ༽┐ ♫",
		"♫ ┌༼ຈل͜ຈ༽┘ ♪ DANCE RIOT ♪ └༼ຈل͜ຈ༽┐ ♫",
		"♫ ┌༼ຈل͜ຈ༽┘ ♪ DANCE RIOT ♫ ┌༼ຈل͜ຈ༽┘ ♪",
	],
	"riot" : [
		"ヽ༼ຈل͜ຈ༽ﾉ RIOT ヽ༼ຈل͜ຈ༽ﾉ",
	],
	"letitdong" : "ヽ༼ຈل͜ຈ༽ﾉ LET IT DONG, LET IT DONG, COULDN'T RIOT BACK ANYMORE. LET IT DONG, LET IT DONG, LET'S GET BACK TO THE LORE, I DON'T CARE THAT THE DONGERS WERE GONE, LET THE DONGS RAGE ON, THE RIOT NEVER BOTHERED ME ANYWAY. ヽ༼ຈل͜ຈ༽ﾉ",
	
	"dontspam" : function() {
		var a = "spam";
		const repl = ["RIOT", "beat misty", "༼ つ ◕_◕ ༽つ"];
		
		const spam = "Guys can you please not [%d] the chat. My mom bought me this new laptop and it gets really hot when the chat is being [%d]ed. Now my leg is starting to hurt because it is getting so hot. Please, if you don’t want me to get burned, then dont [%d] the chat";
	},
	
	"awefulhumans" : "Humans are awful. This planet would be way better if there were no humans in it. True story. DON'T COPY THIS",
	"ruinedchat" : "You guys are ruining my twitch chat experience. I come to the twitch chat for mature conversation about the gameplay, only to be awarded with kappa faces and frankerzs. People who spam said faces need medical attention utmost. The twitch chat is serious business, and the mods should really raise their dongers.",
	"googleadmin" : "Hello everyone, this is the Google Admin here to remind you all that while we love the chat experience, please refrain from copy pasting in the chat. This ruins the atmosphere and makes everybody’s chat experience worse overall. Thank you and remember to link your Twitch and Google+ account today!",
	"badstadiumrequest" : "Wow 0/10 to the guy who thought of this request, APPLAUSE CLAP CLAP LADY GAGA APPLAUSE APPLAUSE APPLAUSE",
};

//Starbolt_omega KZhelghast
},{}],17:[function(require,module,exports){
// chat/userlist.js
// The list of users who will appear in chat, with info associated with them.

module.exports = [
{ color: "#000000", name: "ParkVisitor",			player: true, },

{ color: "#00FF00", name: "Tustin2121", 			contributor: true, },

{ color: "#FF0000", name: "Faithfulforce", 			chatleader: true, postmsg: "BloodTrail", },
{ color: "#FF0000", name: "Z33k33",					chatleader: true, premsg: "DBStyle", },



];


},{}],18:[function(require,module,exports){
// gamestate.js
// 

var gameState =
module.exports = {
	// Map Transition
	mapTransition : {
		nextMap : "iChurchOfHelix",
		warp: 0,
		animOverride: 0,
	},
	
	playerSprite : "youngster[hg_vertmix-32].png",
};
},{}],19:[function(require,module,exports){
// globals.js

window.SoundManager = require("./managers/soundmanager");
window.GC = require("./managers/garbage-collector");
window.UI = require("./managers/ui-manager");
window.Chat = require("./chat/core.js");

window.currentMap = null;
window.gameState = require("./gamestate");

window.DEF_TEXTURE = BASEURL+"/img/missing_tex.png";
window.DEF_SPRITE = BASEURL+"/img/missing_sprite.png";
window.DEF_SPRITE_FORMAT = "pt_horzrow-32";

window.CONFIG = {
	speed : {
		pathing: 0.25,
		animation: 3,
	},
	timeout : {
		walkControl : 1,
	}
};

window.DEBUG = {};


//On Ready
$(function(){
	window.DEF_TEXTURE_IMG = $("<img>").attr("src", DEF_TEXTURE).css({display:"none"}).appendTo("body")[0];
	window.DEF_SPRITE_IMG = $("<img>").attr("src", DEF_SPRITE).css({display:"none"}).appendTo("body")[0];
});

},{"./chat/core.js":15,"./gamestate":18,"./managers/garbage-collector":20,"./managers/soundmanager":21,"./managers/ui-manager":22}],20:[function(require,module,exports){
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

module.exports = new GarbageCollector();



function GarbageBin() {
	this.disposal = []; //Objects that can have "dispose" called on them
	this.listeners = []; //Objects with listeners attached to them
	this.tags = []; //Script tags and other disposable tags
	
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
		
		
		
		for (var i = 0; i < this.bloburls.length; i++) {
			URL.revokeObjectURL(this.bloburls[i]);
			this.bloburls[i] = null;
		}
		this.bloburls = null;
	},
};


},{}],21:[function(require,module,exports){
// soundmanager.js
// Defines the Sound Manager

var inherits = require("inherits");
var extend = require("extend");
var EventEmitter = require("events").EventEmitter;

/**
 */
function SoundManager() {
	this.testSupport();
	
	this.preloadSound("walk_bump");
	this.preloadSound("walk_jump");
	this.preloadSound("walk_jump_land");
	this.preloadSound("exit_walk");
}
inherits(SoundManager, EventEmitter);
extend(SoundManager.prototype, {
	sounds : {},
	ext : null,
	
	testSupport : function() {
		var testsound = new Audio();
		var ogg = testsound.canPlayType("audio/ogg; codecs=vorbis");
		if (ogg) this.ext = ".ogg";
		else this.ext = ".mp3";
	},
	
	preloadSound : function(id) {
		if (!this.sounds[id]) {
			var snd = this.sounds[id] = new Audio();
			snd.autoplay = false;
			snd.autobuffer = true;
			snd.preload = "auto";
			snd.src = BASEURL+"/snd/" + id + this.ext;
			snd.on("ended", function(){
				snd.currentTime = 0;
			});
			snd.load();
		}
		return this.sounds[id];
	},
	
	playSound : function(id) {
		if (!this.sounds[id]) {
			console.error("Sound is not loaded!", id);
			return;
		}
		this.sounds[id].play();
	},
});

module.exports = new SoundManager();

},{"events":6,"extend":8,"inherits":9}],22:[function(require,module,exports){
// ui-manager.js
// Defines the UI module, which controls the user interface.

var inherits = require("inherits");
var extend = require("extend");
var EventEmitter = require("events").EventEmitter;
var controller = require("tpp-controller");

var M_WIDTH = 0, M_HEIGHT = 1, M_HIDE = 2, M_TRIANGLE = 3, M_TAILX = 4, M_TAILY = 5;

/**
 *
 */
function UIManager() {
	this.dialogs = {
		"text" : new DialogBox("textbox_gold"),
		"dialog" : new DialogBox("dialog_bubble"),
	};
	
	var self = this;
	$(function(){
		self._initUIScene();
		
		self.skrim = $("<div>").addClass("skrim").appendTo("#canvas-ui");
		
		for (var type in self.dialogs) {
			self.dialogs[type].element = $("<div>")
				.addClass("dialogbox").addClass(type)
				.appendTo("#canvas-ui");
		}
	});
}
inherits(UIManager, EventEmitter);
extend(UIManager.prototype, {
	skrim : null,
	dialogs : null,
	
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
	
	
	openInfodexPage : function(pageid) {
		
	},
	
	
	/** Fade the screen out for a transition of some sort. */
	fadeOut : function(duration) {
		if (!duration) duration = 1000; //1 second
	},
	
	/** Fade the screen in from a transition. */
	fadeIn : function(duration) {
		if (!duration) duration = 1000; //1 second
	},
	
	/** Displays the loading icon over the main game screen. Optionally supply text. */
	showLoadingAjax : function(loadingText) {
		if (!loadingText) loadingText = "Loading...";
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
			console.log("createDialogModel: ", dlog, this.dialogs[dlog]); 
			var model = this.dialogs[dlog].createDialogModel();
			this.scene.add(model);
		}
		
		// this.tb.model = createDialogModel("textbox_gold");
		// // adjust width : this.tb.model.morphTargetInfluences[0] = 1;
		// // adjust height: this.tb.model.morphTargetInfluences[1] = 1;
		// this.tb.model.visible = false;
		// this.scene.add(this.tb.model);
		
		// this.db.model = createDialogModel("dialog_bubble");
		// // adjust width : this.db.model.morphTargetInfluences[0] = 1;
		// // adjust height: this.db.model.morphTargetInfluences[1] = 1;
		// this.db.model.visible = false;
		// this.scene.add(this.db.model);
		
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

module.exports = new UIManager();


function DialogBox(type) {
	this.type = type;
}
extend(DialogBox.prototype, {
	model : null,
	element : null,
	owner : null,
	html : [],
	
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
		}, opts);
		
		this.owner = opts.owner;
		
		this._completionCallback = opts.complete;
		
		if (typeof opts.html == "string") {
			this.html = [opts.html];
		} else if ($.isArray(opts.html)) {
			this.html = opts.html;
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
			e.html(this.html[i]);
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
		if (this.html && this.html.length) {
			controller.popInputContext("dlogWaiting");
			controller.pushInputContext("dlogPrinting");
			
			this.element.html(this.html.shift()); //put in first dialog
			this.model.morphTargetInfluences[M_TRIANGLE] = (this.html.length)? 1: 0;
			
			setupTypewriter(this, function(){
				controller.popInputContext("dlogPrinting");
				controller.pushInputContext("dlogWaiting");
			});
			
		} else {
			controller.popInputContext("dlogWaiting");
			this.hide();
		}
		
	},
	
	
	createDialogModel: function() {
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
	textbox.complete = function() {
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
			tick = 5;
			textbox.model.morphTargetInfluences[M_HIDE] = !textbox.model.morphTargetInfluences[M_HIDE];
		}
	}
}

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

},{"events":6,"extend":8,"inherits":9,"tpp-controller":"tpp-controller"}],23:[function(require,module,exports){
// map.js

var inherits = require("inherits");
var extend = require("extend");
var ndarray = require("ndarray");
var EventEmitter = require("events").EventEmitter;

var Event = require("tpp-event");
var PlayerChar = require("tpp-pc");

var ObjLoader = require("./model/obj-loader");

var mSetup = require("./model/map-setup");


// These would be CONSTs if we weren't in the browser
var EXT_MAPBUNDLE = ".zip"; //Extension for requesting map bundles
var DEF_HEIGHT_STEP = 0.5; //Default Y translation amount a height step takes. This can be defined in a map file.
var GC_BIN = "map";


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
	
	GC.allocateBin(GC_BIN);
	this.gc = GC.getBin(GC_BIN);
	
	this.fileSys = new zip.fs.FS();
}
inherits(Map, EventEmitter);
extend(Map.prototype, {
	id : null, //map's internal id
	
	file: null, //Zip file holding all data
	fileSys: null, //Current zip file system for this map
	xhr: null, //active xhr request
	
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
		
		delete this.file;
		delete this.fileSys;
		delete this.xhr;
		
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
		
		GC.dispose(GC_BIN);
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
			self.file = xhr.response;
			self.emit("downloaded");
		});
		xhr.on("progress", function(e){
			// console.log("PROGRESS:", e);
			if (e.lengthComputable) {
				var percentDone = e.loaded / e.total;
			} else {
				//marquee bar
			}
		});
		xhr.on("error", function(e){
			console.error("ERROR:", e);
		});
		xhr.on("canceled", function(e){
			console.error("CANCELED:", e);
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
			
			function loadTexture(filename, callback) {
				console.log("LOAD TEX:", filename);
				var file = self.fileSys.root.getChildByName(filename);
				if (!file) {
					console.error("ERROR LOADING TEXTURE: No such file in map bundle! "+filename);
					callback(DEF_TEXTURE);
					return;
				}
				file.getBlob("image/png", function(data) {
					console.log("TEX LOADED:", filename, data);
					var url = URL.createObjectURL(data);
					GC.collectURL(url, GC_BIN);
					callback(url);
				});
			}
			
			var objldr = new ObjLoader(self.objdata, self.mtldata, loadTexture, {
				gc: GC_BIN,
			});
			objldr.on("load", __modelReady);
			objldr.load();
		}
		
		function __modelReady(obj) {
			console.log("__modelReady");
			self.mapmodel = obj;
			// __test__outputTree(obj);
			self.objdata = self.mtldata = true; //wipe the big strings from memory
			self.emit("loaded-model");
			__loadDone();
		}
		
		function __loadDone() {
			console.log("__loadDone", !!self.mapmodel, !!self.tiledata);
			if (!self.mapmodel || !self.tiledata) return; //don't call on _init before both are loaded
			
			self._init();
			self.markLoadFinished("MAP_mapdata");
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
		mSetup.setupRigging.call(this);
		// Map Model is now ready
		
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
		
		var pts = this.metadata.npcspawns;
		var index = Math.floor(Math.random() * pts.length);
		return new THREE.Vector3(pts[index][0], pts[index][1], pts[index][2] || 1);
		
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
		var mustJump, mustSwim, mustTransition;
		
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
			if (i == -1) return null;
			return this.get(x, y).splice(i, 1);
		};
		
		this.spriteNode = new THREE.Object3D();
		this.spriteNode.name = "Sprite Rig";
		this.spriteNode.position.y = 0.21;
		this.scene.add(this.spriteNode);
		
		// Load event js files now:
		loadScript("l"); // Load locally defined events
		loadScript("g"); // Load globally defined events
		
		// Add the player character event
		this._initPlayerCharacter();
		
		return;
		
		function loadScript(t) {
			var file = self.fileSys.root.getChildByName(t+"_evt.js");
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
				self[t+"ScriptTag"] = script;
				// Upon being added to the body, it is evaluated
				
				GC.collect(script, GC_BIN);
				GC.collectURL(script.src, GC_BIN);
			});
		}
		
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
		evt.on("moving", function(srcX, srcY, destX, destY){
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
		evt.on("moved", function(srcX, srcY, destX, destY){
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
		
		var avatar = evt.getAvatar(this);
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
				GC.collectURL(url, GC_BIN);
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
				
				isStarted : false,
				startQueue : [],
				
				endQueue : [],
			};
		}
		return this._mapRunState;
	},
	
	markLoading : function(assetId) {
		var state = this._initMapRunState();
		state.loadTotal++;
		if (assetId) {
			if (!state.loadingAssets[assetId])
				state.loadingAssets[assetId] = 0;
			state.loadingAssets[assetId]++;
		}
	},
	markLoadFinished : function(assetId) {
		var state = this._initMapRunState();
		state.loadProgress++;
		if (assetId) {
			if (!state.loadingAssets[assetId])
				state.loadingAssets[assetId] = 0;
			state.loadingAssets[assetId]--;
		}
		
		//TODO begin map start
		if (state.loadProgress >= state.loadTotal) {
			console.warn("START MAP");
			this._executeMapStartCallbacks();
		}
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



},{"./model/map-setup":24,"./model/obj-loader":26,"events":6,"extend":8,"inherits":9,"ndarray":11,"tpp-event":"tpp-event","tpp-pc":"tpp-pc"}],24:[function(require,module,exports){
// map-setup.js
// Defines some of the setup functions for Map.js in a separate file, for organization

var extend = require("extend");

var mSetup = 
module.exports = {
	
	setupRigging : function() {
		// Setup Lighting Rigging
		{
			var lightdef = extend({ "default": true }, this.metadata.lighting);
			
			var lightsetup = mSetup.lighting[this.metadata.domain];
			if (!lightsetup) throw new Error("Invalid Map Domain!", this.metadata.domain);
			
			var l = lightsetup.call(this, lightdef);
			this.scene.add(l);
		}
		
		// Setup Camera Rigging
		{	// For camera types, see the Camera types wiki page
			var camdef = this.metadata.camera;
			
			if (!camdef) { throw new Error("Map contains no setup for domain!"); }
			
			var camfn = mSetup.camera[camdef.type];
			if (!camfn) throw new Error("Invalid Camera Type!", camdef.type);
			
			var c = camfn.call(this, camdef);
			this.scene.add(c);
		}
		
	},
	
	camera : {
		ortho : function(camdef) {
			var scrWidth = $("#gamescreen").width();
			var scrHeight = $("#gamescreen").height();
			
			var node = new THREE.Object3D();
			node.name = "Othrographic Camera Rig";
			
			this.camera = new THREE.OrthographicCamera(scrWidth/-2, scrWidth/2, scrHeight/2, scrHeight/-2, 1, 1000);
			this.camera.position.y = 100;
			this.camera.roation.x = -Math.PI / 2;
			node.add(this.camera);
			
			return node;
		},
		
		gen4 : function(camdef) {
			var scrWidth = $("#gamescreen").width();
			var scrHeight = $("#gamescreen").height();
			
			var node = new THREE.Object3D();
			node.name = "Gen 4 Camera Rig";
			
			var camlist = camdef["cameras"];
			if (!camlist) throw new Error("No cameras defined!");
			for (var cname in camlist) {
				var c = new THREE.PerspectiveCamera(55, scrWidth / scrHeight, 1, 1000);
				c.name = "Camera ["+cname+"]";
				c.my_camera = c;
				
				var croot;
				if (!camlist[cname].fixedCamera) {
					croot = new THREE.Object3D();
					croot.add(c);
					croot.my_camera = c;
				}
				
				var cp = camlist[cname].position || [0, 5.45, 5.3];
				c.position.set(cp[0], cp[1], cp[2]);
				c.lookAt(new THREE.Vector3(0, 0.8, 0));
				
				var cb = camlist[cname].behavior || "followPlayer";
				var cb = mSetup.camBehaviors[cb].call(this, camlist[cname], c, croot);
				if (cb) {
					this.cameraLogics.push(cb);
				}
				
				node.add(croot || c);
				this.cameras[cname] = c;
				if (cname == 0) this.camera = c;
			}
			
			// this.camera = new THREE.PerspectiveCamera(75, scrWidth / scrHeight, 1, 1000);
			// this.camera.position.y = 5;
			// this.camera.position.z = 5;
			// this.camera.rotation.x = -55 * (Math.PI / 180);
			//TODO set up a camera for each layer
			// node.add(this.camera);
			
			return node;
		},
		
		gen5 : function(camdef) {
			var scrWidth = $("#gamescreen").width();
			var scrHeight = $("#gamescreen").height();
			
			var node = new THREE.Object3D();
			node.name = "Gen 5 Camera Rig";
			
			this.camera = new THREE.PerspectiveCamera(75, scrWidth / scrHeight, 1, 1000);
			//parse up the gen 5 camera definitions
			node.add(this.camera);
			
			return node;
		},
	},
	
	camBehaviors : {
		followPlayer : function(cdef, cam, camRoot) {
			return function(delta) {
				camRoot.position.set(player.avatar_node.position);
				//TODO negate moving up and down with jumping
			}
		},
	},
	
	lighting : {
		interior : function(lightdef) {
			var node = new THREE.Object3D();
			node.name = "Interior Lighting Rig";
			
			var light;
			
			light = new THREE.DirectionalLight();
			light.position.set(0, 75, 1);
			light.castShadow = true;
			light.onlyShadow = true;
			light.shadowDarkness = 0.7;
			light.shadowBias = 0.001;
			
			var shm = lightdef.shadowmap || {};
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
			
			var ORIGIN = new THREE.Vector3(0, 0, 0);
			
			light = new THREE.DirectionalLight(0xffffff, 0.9);
			light.position.set(4, 4, 4);
			light.lookAt(ORIGIN);
			node.add(light);
			
			light = new THREE.DirectionalLight(0xffffff, 0.9);
			light.position.set(-4, 4, 4);
			light.lookAt(ORIGIN);
			node.add(light);
			
			return node;
			//this.scene.add(node);
		},
		
		exterior : function(lightdef) {
			var node = new THREE.Object3D();
			node.name = "Exterior Lighting Rig";
			
			var light;
			
			light = new THREE.DirectionalLight();
			light.position.set(-10, 75, -30);
			light.castShadow = true;
			// light.onlyShadow = true;
			light.shadowDarkness = 0.7;
			light.shadowBias = 0.001;
			
			var shm = lightdef.shadowmap || {};
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
			
			return node;
		},
		
		hell : function(lightdef) {
			//TODO Dorrito Dungeon
		},
	},
	
	getDoritoDungeon : function() {
		var node = new THREE.Object3D();
		
		//TODO set this.metadata
		//TODO set this.mapmodel
	},
	
}
},{"extend":8}],25:[function(require,module,exports){
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
			
			var matCreator = new MaterialCreator(this.loadTexture, this.gc);
			matCreator.setMaterials(materialsInfo);
			return matCreator;
		} catch (e) {
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
		for (var mn in this.materialsInfo) {
			this.create(mn);
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
					console.log("Unhandled MTL data:", prop, "=", value);
					break;
			}
		}
		
		// WHAT?!?! NO!!!!!!
		// if ( params[ 'diffuse' ] ) {
		// 	if ( !params[ 'ambient' ]) params[ 'ambient' ] = params[ 'diffuse' ];
		// 	params[ 'color' ] = params[ 'diffuse' ];
		// }
		
		this.materials[ matName ] = new THREE.MeshPhongMaterial( params );
		scope.gc.collect( this.materials[matName] );
		return this.materials[ matName ];
		
		
		function __textureMap(args) {
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
			scope.gc.collect(texture);
			
			currentMap.markLoading("MTL_"+args.src);
			scope.loadTexture(args.src, function(url){
				// Even though the images are in memory, apparently they still aren't "loaded"
				// at the point when they are assigned to the src attribute.
				image.on("load", function(){
					texture.needsUpdate = true;
					currentMap.markLoadFinished("MTL_"+args.src);
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
},{"events":6,"extend":8,"inherits":9,"moment":10}],26:[function(require,module,exports){
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
},{"./mtl-loader":25,"events":6,"extend":8,"inherits":9,"moment":10}],27:[function(require,module,exports){
// renderloop.js
// The module that handles all the common code to render and do game ticks on a map

var extend = require("extend");
var raf = require("raf");
var controller = require("tpp-controller");

module.exports = {
	start : function(opts) {
		// Set the canvas's attributes, because those 
		// ACTUALLY determine how big the rendering area is.
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
	
	if (currentMap && currentMap.scene && currentMap.camera) {
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
	_rate = 1000 / ticksPerSec;
	
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
		wholeTick *= _rate;
		
		if (currentMap && currentMap.logicLoop)
			currentMap.logicLoop(wholeTick * 0.01);
		if (UI && UI.logicLoop)
			UI.logicLoop(wholeTick * 0.01);
		
		if (controller && controller._tick)
			controller._tick();
		
		accum -= wholeTick;
	}
}
},{"extend":8,"raf":13,"tpp-controller":"tpp-controller"}],28:[function(require,module,exports){
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
{
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlc1xcYnJvd3NlcmlmeVxcbm9kZV9tb2R1bGVzXFxicm93c2VyLXBhY2tcXF9wcmVsdWRlLmpzIiwic3JjXFxqc1xcdG9vbHNcXG1hcHZpZXcuanMiLCJub2RlX21vZHVsZXNcXGJyb3dzZXJpZnlcXG5vZGVfbW9kdWxlc1xcYnVmZmVyXFxpbmRleC5qcyIsIm5vZGVfbW9kdWxlc1xcYnJvd3NlcmlmeVxcbm9kZV9tb2R1bGVzXFxidWZmZXJcXG5vZGVfbW9kdWxlc1xcYmFzZTY0LWpzXFxsaWJcXGI2NC5qcyIsIm5vZGVfbW9kdWxlc1xcYnJvd3NlcmlmeVxcbm9kZV9tb2R1bGVzXFxidWZmZXJcXG5vZGVfbW9kdWxlc1xcaWVlZTc1NFxcaW5kZXguanMiLCJub2RlX21vZHVsZXNcXGJyb3dzZXJpZnlcXG5vZGVfbW9kdWxlc1xcYnVmZmVyXFxub2RlX21vZHVsZXNcXGlzLWFycmF5XFxpbmRleC5qcyIsIm5vZGVfbW9kdWxlc1xcYnJvd3NlcmlmeVxcbm9kZV9tb2R1bGVzXFxldmVudHNcXGV2ZW50cy5qcyIsIm5vZGVfbW9kdWxlc1xcYnJvd3NlcmlmeVxcbm9kZV9tb2R1bGVzXFxwcm9jZXNzXFxicm93c2VyLmpzIiwibm9kZV9tb2R1bGVzXFxleHRlbmRcXGluZGV4LmpzIiwibm9kZV9tb2R1bGVzXFxpbmhlcml0c1xcaW5oZXJpdHMuanMiLCJub2RlX21vZHVsZXNcXG1vbWVudFxcbW9tZW50LmpzIiwibm9kZV9tb2R1bGVzXFxuZGFycmF5XFxuZGFycmF5LmpzIiwibm9kZV9tb2R1bGVzXFxuZGFycmF5XFxub2RlX21vZHVsZXNcXGlvdGEtYXJyYXlcXGlvdGEuanMiLCJub2RlX21vZHVsZXNcXHJhZlxcaW5kZXguanMiLCJub2RlX21vZHVsZXNcXHJhZlxcbm9kZV9tb2R1bGVzXFxwZXJmb3JtYW5jZS1ub3dcXGxpYlxccGVyZm9ybWFuY2Utbm93LmpzIiwic3JjXFxqc1xcY2hhdFxcY29yZS5qcyIsInNyY1xcanNcXGNoYXRcXGRvbmdlci5qcyIsInNyY1xcanNcXGNoYXRcXHVzZXJsaXN0LmpzIiwic3JjXFxqc1xcZ2FtZXN0YXRlLmpzIiwic3JjXFxqc1xcZ2xvYmFscy5qcyIsInNyY1xcanNcXG1hbmFnZXJzXFxnYXJiYWdlLWNvbGxlY3Rvci5qcyIsInNyY1xcanNcXG1hbmFnZXJzXFxzb3VuZG1hbmFnZXIuanMiLCJzcmNcXGpzXFxtYW5hZ2Vyc1xcdWktbWFuYWdlci5qcyIsInNyY1xcanNcXG1hcC5qcyIsInNyY1xcanNcXG1vZGVsXFxtYXAtc2V0dXAuanMiLCJzcmNcXGpzXFxtb2RlbFxcbXRsLWxvYWRlci5qcyIsInNyY1xcanNcXG1vZGVsXFxvYmotbG9hZGVyLmpzIiwic3JjXFxqc1xcbW9kZWxcXHJlbmRlcmxvb3AuanMiLCJzcmNcXGpzXFxwb2x5ZmlsbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4TUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVoQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3U0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzEzRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeFFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcG5CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbk5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsWUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIihmdW5jdGlvbiAoQ09NUElMRURfTUFQUyl7XG4vLyBtYXB2aWV3LmpzXHJcblxyXG4vL3ZhciBUSFJFRSA9IHJlcXVpcmUoXCJ0aHJlZVwiKTtcclxuLy92YXIgJCA9IHJlcXVpcmUoXCJqcXVlcnlcIik7XHJcbi8vdmFyIHppcCA9IHppcC5qc1xyXG5cclxucmVxdWlyZShcIi4uL3BvbHlmaWxsLmpzXCIpO1xyXG52YXIgTWFwID0gcmVxdWlyZShcIi4uL21hcFwiKTtcclxudmFyIHJlbmRlckxvb3AgPSByZXF1aXJlKFwiLi4vbW9kZWwvcmVuZGVybG9vcFwiKTtcclxuXHJcbnJlcXVpcmUoXCIuLi9nbG9iYWxzXCIpO1xyXG5cclxudmFyIHdhcnAgPSByZXF1aXJlKFwidHBwLXdhcnBcIik7XHJcblxyXG5jb25zb2xlLmxvZyhDT01QSUxFRF9NQVBTKTtcclxuXHJcbi8vT24gUmVhZHlcclxuJChmdW5jdGlvbigpe1xyXG5cdFxyXG5cdCQoXCIjbG9hZGJ0blwiKS5vbihcImNsaWNrXCIsIGZ1bmN0aW9uKCl7XHJcblx0XHRsb2FkTWFwKCQoXCIjaWRpblwiKS52YWwoKSk7XHJcblx0XHQkKFwiI2xvYWRidG5cIikuYmx1cigpO1xyXG5cdH0pO1xyXG5cdFxyXG5cdHJlbmRlckxvb3Auc3RhcnQoe1xyXG5cdFx0Y2xlYXJDb2xvciA6IDB4RkYwMDAwLFxyXG5cdFx0dGlja3NQZXJTZWNvbmQgOiAzMCxcclxuXHR9KTtcclxuXHRcclxuXHR2YXIgZGF0YWxpc3QgPSAkKFwiPGRhdGFsaXN0IGlkPSdjb21waWxlZE1hcHMnPlwiKTtcclxuXHRmb3IgKHZhciBpID0gMDsgaSA8IENPTVBJTEVEX01BUFMubGVuZ3RoOyBpKyspIHtcclxuXHRcdGRhdGFsaXN0LmFwcGVuZCgkKFwiPG9wdGlvbj5cIikudGV4dChDT01QSUxFRF9NQVBTW2ldKSk7XHJcblx0fVxyXG5cdCQoXCIjaWRpblwiKS5hZnRlcihkYXRhbGlzdCk7XHJcblx0XHJcbn0pO1xyXG5cclxuZnVuY3Rpb24gbG9hZE1hcChpZCkge1xyXG5cdGlmIChjdXJyZW50TWFwKSB7XHJcblx0XHRjdXJyZW50TWFwLmRpc3Bvc2UoKTtcclxuXHRcdF9pbmZvUGFyZW50ID0gbnVsbDtcclxuXHRcdF9ub2RlX21vdmVtZW50R3JpZCA9IG51bGw7XHJcblx0fVxyXG5cdFxyXG5cdGN1cnJlbnRNYXAgPSBuZXcgTWFwKGlkKTtcclxuXHRjdXJyZW50TWFwLmxvYWQoKTtcclxuXHRcclxuXHRjdXJyZW50TWFwLm9uY2UoXCJtYXAtcmVhZHlcIiwgZnVuY3Rpb24oKXtcclxuXHRcdHZhciBzY3JXaWR0aCA9ICQoXCIjZ2FtZXNjcmVlblwiKS53aWR0aCgpO1xyXG5cdFx0dmFyIHNjckhlaWdodCA9ICQoXCIjZ2FtZXNjcmVlblwiKS5oZWlnaHQoKTtcclxuXHRcdFxyXG5cdFx0Y3VycmVudE1hcC5jYW1lcmEgPSBuZXcgVEhSRUUuUGVyc3BlY3RpdmVDYW1lcmEoNzUsIHNjcldpZHRoIC8gc2NySGVpZ2h0LCAxLCAxMDAwKTtcclxuXHRcdGN1cnJlbnRNYXAuY2FtZXJhLnBvc2l0aW9uLnogPSAxMDtcclxuXHRcdFxyXG5cdFx0dmFyIGNvbnRyb2xzID0gbmV3IFRIUkVFLk9yYml0Q29udHJvbHMoY3VycmVudE1hcC5jYW1lcmEpO1xyXG5cdFx0Y29udHJvbHMuZGFtcGluZyA9IDAuMjtcclxuXHRcdFxyXG5cdFx0dmFyIG1hcCA9IGN1cnJlbnRNYXA7XHJcblx0XHR2YXIgb2xkbG9naWMgPSBtYXAubG9naWNMb29wO1xyXG5cdFx0bWFwLmxvZ2ljTG9vcCA9IGZ1bmN0aW9uKGRlbHRhKXtcclxuXHRcdFx0Y29udHJvbHMudXBkYXRlKCk7XHJcblx0XHRcdG9sZGxvZ2ljLmNhbGwobWFwLCBkZWx0YSk7XHJcblx0XHR9O1xyXG5cdFx0XHJcblx0XHQvLyBzaG93V2Fsa2FibGVUaWxlcygpO1xyXG5cdFx0c2hvd01vdmVtZW50R3JpZCgpO1xyXG5cdH0pO1xyXG59XHJcblxyXG52YXIgX2luZm9QYXJlbnQ7XHJcbmZ1bmN0aW9uIGNyZWF0ZUluZm9QYXJlbnQoKSB7XHJcblx0aWYgKCFfaW5mb1BhcmVudCkge1xyXG5cdFx0X2luZm9QYXJlbnQgPSBuZXcgVEhSRUUuT2JqZWN0M0QoKTtcclxuXHRcdF9pbmZvUGFyZW50Lm5hbWUgPSBcIkRFQlVHIEluZm8gUmlnZ2luZ1wiO1xyXG5cdFx0Y3VycmVudE1hcC5zY2VuZS5hZGQoX2luZm9QYXJlbnQpO1xyXG5cdH1cclxufVxyXG4vKlxyXG52YXIgX3N0b3JlZF93YWxrYWJsZVRpbGVzO1xyXG5mdW5jdGlvbiBzaG93V2Fsa2FibGVUaWxlcygpIHtcclxuXHR2YXIgdGlsZXMgPSBfc3RvcmVkX3dhbGthYmxlVGlsZXM7XHJcblx0aWYgKCF0aWxlcykge1xyXG5cdFx0dGlsZXMgPSBjdXJyZW50TWFwLmdldEFsbFdhbGthYmxlVGlsZXMoKTtcclxuXHR9XHJcblx0XHJcblx0Y3JlYXRlSW5mb1BhcmVudCgpO1xyXG5cdC8vVE9ETyBjbGVhdCBpbmZvIHBhcmVudFxyXG5cdFxyXG5cdC8vQ09OU1RcclxuXHR2YXIgbWFya2VyQ29sb3JzID0gWyAweDg4ODg4OCwgMHgwMDg4MDAsIDB4MDAwMDg4LCAweDg4MDAwMCwgMHgwMDg4ODgsIDB4ODgwMDg4LCAweDg4ODgwMCBdO1xyXG5cdFxyXG5cdGZvciAodmFyIGxpID0gMDsgbGkgPCB0aWxlcy5sZW5ndGg7IGxpKyspIHtcclxuXHRcdGlmICghdGlsZXNbbGldKSB7XHJcblx0XHRcdGNvbnNvbGUud2FybihcIlRpbGVzIGZvciBsYXllclwiLCBsaSwgXCJ1bmRlZmluZWQhXCIpO1xyXG5cdFx0XHRjb250aW51ZTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0dmFyIGdlb20gPSBuZXcgVEhSRUUuR2VvbWV0cnkoKTtcclxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdGlsZXNbbGldLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdGdlb20udmVydGljZXMucHVzaCh0aWxlc1tsaV1baV1bXCIzZGxvY1wiXSk7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdHZhciBtYXQgPSBuZXcgVEhSRUUuUG9pbnRDbG91ZE1hdGVyaWFsKHtcclxuXHRcdFx0c2l6ZTogMSxcclxuXHRcdFx0Ly8gbWFwOiBUSFJFRS5JbWFnZVV0aWxzLmxvYWRUZXh0dXJlKFwiL3Rvb2xzL3RpbGVtYXJrZXIucG5nXCIpLFxyXG5cdFx0XHRkZXB0aFRlc3Q6IHRydWUsXHJcblx0XHRcdHRyYW5zcGFyZW50OiB0cnVlLFxyXG5cdFx0fSk7XHJcblx0XHRtYXQuY29sb3Iuc2V0SGV4KG1hcmtlckNvbG9yc1tsaV0pO1xyXG5cdFx0XHJcblx0XHR2YXIgcGFydGljbGVzID0gbmV3IFRIUkVFLlBvaW50Q2xvdWQoZ2VvbSwgbWF0KTtcclxuXHRcdHBhcnRpY2xlcy5zb3J0UGFydGljbGVzID0gdHJ1ZTtcclxuXHRcdF9pbmZvUGFyZW50LmFkZChwYXJ0aWNsZXMpO1xyXG5cdH1cclxufSAqL1xyXG5cclxudmFyIF9ub2RlX21vdmVtZW50R3JpZDtcclxuZnVuY3Rpb24gc2hvd01vdmVtZW50R3JpZCgpIHtcclxuXHRpZiAoIV9ub2RlX21vdmVtZW50R3JpZCkge1xyXG5cdFx0X25vZGVfbW92ZW1lbnRHcmlkID0gbmV3IFRIUkVFLk9iamVjdDNEKCk7XHJcblx0XHRfbm9kZV9tb3ZlbWVudEdyaWQubmFtZSA9IFwiREVCVUcgTW92ZW1lbnQgR3JpZFwiO1xyXG5cdFx0XHJcblx0XHRjcmVhdGVJbmZvUGFyZW50KCk7XHJcblx0XHRcclxuXHRcdC8vQ09OU1RcclxuXHRcdHZhciBtYXJrZXJDb2xvcnMgPSBbIDB4ODg4ODg4LCAweDAwODgwMCwgMHgwMDAwODgsIDB4ODgwMDAwLCAweDAwODg4OCwgMHg4ODAwODgsIDB4ODg4ODAwIF07XHJcblx0XHRcclxuXHRcdHZhciBtYXAgPSBjdXJyZW50TWFwO1xyXG5cdFx0dmFyIG1kYXRhID0gY3VycmVudE1hcC5tZXRhZGF0YTtcclxuXHRcdFxyXG5cdFx0Zm9yICh2YXIgbGkgPSAxOyBsaSA8PSA3OyBsaSsrKSB7XHJcblx0XHRcdGlmICghbWRhdGEubGF5ZXJzW2xpLTFdKSBjb250aW51ZTtcclxuXHRcdFx0XHJcblx0XHRcdHZhciBnZW9tID0gbmV3IFRIUkVFLkdlb21ldHJ5KCk7XHJcblx0XHRcdHZhciBqdW1wcyA9IFtdO1xyXG5cdFx0XHRcclxuXHRcdFx0ZnVuY3Rpb24gX19kcmF3TGluZShzeCwgc3ksIGR4LCBkeSkge1xyXG5cdFx0XHRcdHZhciBtdiA9IG1hcC5jYW5XYWxrQmV0d2VlbihzeCwgc3ksIGR4LCBkeSk7XHJcblx0XHRcdFx0aWYgKCFtdikgcmV0dXJuO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdHZhciB2MSA9IG1hcC5nZXQzRFRpbGVMb2NhdGlvbihzeCwgc3ksIGxpKTtcclxuXHRcdFx0XHR2YXIgdjIgPSBtYXAuZ2V0M0RUaWxlTG9jYXRpb24oZHgsIGR5LCBsaSk7XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0aWYgKG12ICYgMHgyKSB7XHJcblx0XHRcdFx0XHRqdW1wcy5wdXNoKFt2MSwgdjJdKTsgLy9wdXNoIGZvciBhIHNwbGluZSBsYXRlclxyXG5cdFx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRcclxuXHRcdFx0XHR2Mi5zZXQoKHYxLngrdjIueCkvMiwgKHYxLnkrdjIueSkvMiwgKHYxLnordjIueikvMik7XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0Z2VvbS52ZXJ0aWNlcy5wdXNoKHYxKTtcclxuXHRcdFx0XHRnZW9tLnZlcnRpY2VzLnB1c2godjIpO1xyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHRmb3IgKHZhciB5ID0gMDsgeSA8IG1kYXRhLmhlaWdodDsgeSsrKSB7XHJcblx0XHRcdFx0Zm9yICh2YXIgeCA9IDA7IHggPCBtZGF0YS53aWR0aDsgeCsrKSB7XHJcblx0XHRcdFx0XHRfX2RyYXdMaW5lKHgsIHksIHgrMSwgeSk7XHJcblx0XHRcdFx0XHRfX2RyYXdMaW5lKHgsIHksIHgtMSwgeSk7XHJcblx0XHRcdFx0XHRfX2RyYXdMaW5lKHgsIHksIHgsIHkrMSk7XHJcblx0XHRcdFx0XHRfX2RyYXdMaW5lKHgsIHksIHgsIHktMSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHR2YXIgbWF0ID0gbmV3IFRIUkVFLkxpbmVCYXNpY01hdGVyaWFsKHtcclxuXHRcdFx0XHRjb2xvcjogbWFya2VyQ29sb3JzW2xpXSxcclxuXHRcdFx0XHRvcGFjaXR5OiAwLjgsXHJcblx0XHRcdFx0bGluZXdpZHRoOiAxLFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0dmFyIGxpbmUgPSBuZXcgVEhSRUUuTGluZShnZW9tLCBtYXQsIFRIUkVFLkxpbmVQaWVjZXMpO1xyXG5cdFx0XHRfbm9kZV9tb3ZlbWVudEdyaWQuYWRkKGxpbmUpO1xyXG5cdFx0XHRcclxuXHRcdFx0aWYgKGp1bXBzLmxlbmd0aCkge1xyXG5cdFx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwganVtcHMubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0XHRcdHZhciB2MSA9IGp1bXBzW2ldWzBdO1xyXG5cdFx0XHRcdFx0dmFyIHYzID0ganVtcHNbaV1bMV07XHJcblx0XHRcdFx0XHR2YXIgdjIgPSBuZXcgVEhSRUUuVmVjdG9yMygodjEueCt2My54KS8yLCBNYXRoLm1heCh2MS55LCB2My55KSswLjQsICh2MS56K3YzLnopLzIpO1xyXG5cdFx0XHRcdFx0XHJcblx0XHRcdFx0XHR2YXIgc3BsaW5lID0gbmV3IFRIUkVFLlNwbGluZUN1cnZlMyhbdjEsIHYyLCB2M10pO1xyXG5cdFx0XHRcdFx0dmFyIGdlb20gPSBuZXcgVEhSRUUuR2VvbWV0cnkoKTtcclxuXHRcdFx0XHRcdGdlb20udmVydGljZXMgPSBzcGxpbmUuZ2V0UG9pbnRzKDcpLnNsaWNlKDAsIC0xKTtcclxuXHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0dmFyIG1hdCA9IG5ldyBUSFJFRS5MaW5lQmFzaWNNYXRlcmlhbCh7XHJcblx0XHRcdFx0XHRcdGNvbG9yOiBtYXJrZXJDb2xvcnNbbGldLFxyXG5cdFx0XHRcdFx0XHRvcGFjaXR5OiAwLjgsXHJcblx0XHRcdFx0XHRcdGxpbmV3aWR0aDogMSxcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0dmFyIGxpbmUgPSBuZXcgVEhSRUUuTGluZShnZW9tLCBtYXQpO1xyXG5cdFx0XHRcdFx0X25vZGVfbW92ZW1lbnRHcmlkLmFkZChsaW5lKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0X25vZGVfbW92ZW1lbnRHcmlkLnBvc2l0aW9uLnkgPSAwLjE7XHJcblx0XHRcclxuXHRcdF9pbmZvUGFyZW50LmFkZChfbm9kZV9tb3ZlbWVudEdyaWQpO1xyXG5cdH1cclxuXHRfbm9kZV9tb3ZlbWVudEdyaWQudmlzaWJsZSA9IHRydWU7XHJcbn1cclxuXG59KS5jYWxsKHRoaXMsWydpQ2h1cmNoT2ZIZWxpeCcsICd0R2FsbGVyeScsICd4VGVzdFJvb20xJ10pIiwiLyohXG4gKiBUaGUgYnVmZmVyIG1vZHVsZSBmcm9tIG5vZGUuanMsIGZvciB0aGUgYnJvd3Nlci5cbiAqXG4gKiBAYXV0aG9yICAgRmVyb3NzIEFib3VraGFkaWplaCA8ZmVyb3NzQGZlcm9zcy5vcmc+IDxodHRwOi8vZmVyb3NzLm9yZz5cbiAqIEBsaWNlbnNlICBNSVRcbiAqL1xuXG52YXIgYmFzZTY0ID0gcmVxdWlyZSgnYmFzZTY0LWpzJylcbnZhciBpZWVlNzU0ID0gcmVxdWlyZSgnaWVlZTc1NCcpXG52YXIgaXNBcnJheSA9IHJlcXVpcmUoJ2lzLWFycmF5JylcblxuZXhwb3J0cy5CdWZmZXIgPSBCdWZmZXJcbmV4cG9ydHMuU2xvd0J1ZmZlciA9IEJ1ZmZlclxuZXhwb3J0cy5JTlNQRUNUX01BWF9CWVRFUyA9IDUwXG5CdWZmZXIucG9vbFNpemUgPSA4MTkyIC8vIG5vdCB1c2VkIGJ5IHRoaXMgaW1wbGVtZW50YXRpb25cblxudmFyIGtNYXhMZW5ndGggPSAweDNmZmZmZmZmXG5cbi8qKlxuICogSWYgYEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUYDpcbiAqICAgPT09IHRydWUgICAgVXNlIFVpbnQ4QXJyYXkgaW1wbGVtZW50YXRpb24gKGZhc3Rlc3QpXG4gKiAgID09PSBmYWxzZSAgIFVzZSBPYmplY3QgaW1wbGVtZW50YXRpb24gKG1vc3QgY29tcGF0aWJsZSwgZXZlbiBJRTYpXG4gKlxuICogQnJvd3NlcnMgdGhhdCBzdXBwb3J0IHR5cGVkIGFycmF5cyBhcmUgSUUgMTArLCBGaXJlZm94IDQrLCBDaHJvbWUgNyssIFNhZmFyaSA1LjErLFxuICogT3BlcmEgMTEuNissIGlPUyA0LjIrLlxuICpcbiAqIE5vdGU6XG4gKlxuICogLSBJbXBsZW1lbnRhdGlvbiBtdXN0IHN1cHBvcnQgYWRkaW5nIG5ldyBwcm9wZXJ0aWVzIHRvIGBVaW50OEFycmF5YCBpbnN0YW5jZXMuXG4gKiAgIEZpcmVmb3ggNC0yOSBsYWNrZWQgc3VwcG9ydCwgZml4ZWQgaW4gRmlyZWZveCAzMCsuXG4gKiAgIFNlZTogaHR0cHM6Ly9idWd6aWxsYS5tb3ppbGxhLm9yZy9zaG93X2J1Zy5jZ2k/aWQ9Njk1NDM4LlxuICpcbiAqICAtIENocm9tZSA5LTEwIGlzIG1pc3NpbmcgdGhlIGBUeXBlZEFycmF5LnByb3RvdHlwZS5zdWJhcnJheWAgZnVuY3Rpb24uXG4gKlxuICogIC0gSUUxMCBoYXMgYSBicm9rZW4gYFR5cGVkQXJyYXkucHJvdG90eXBlLnN1YmFycmF5YCBmdW5jdGlvbiB3aGljaCByZXR1cm5zIGFycmF5cyBvZlxuICogICAgaW5jb3JyZWN0IGxlbmd0aCBpbiBzb21lIHNpdHVhdGlvbnMuXG4gKlxuICogV2UgZGV0ZWN0IHRoZXNlIGJ1Z2d5IGJyb3dzZXJzIGFuZCBzZXQgYEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUYCB0byBgZmFsc2VgIHNvIHRoZXkgd2lsbFxuICogZ2V0IHRoZSBPYmplY3QgaW1wbGVtZW50YXRpb24sIHdoaWNoIGlzIHNsb3dlciBidXQgd2lsbCB3b3JrIGNvcnJlY3RseS5cbiAqL1xuQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQgPSAoZnVuY3Rpb24gKCkge1xuICB0cnkge1xuICAgIHZhciBidWYgPSBuZXcgQXJyYXlCdWZmZXIoMClcbiAgICB2YXIgYXJyID0gbmV3IFVpbnQ4QXJyYXkoYnVmKVxuICAgIGFyci5mb28gPSBmdW5jdGlvbiAoKSB7IHJldHVybiA0MiB9XG4gICAgcmV0dXJuIDQyID09PSBhcnIuZm9vKCkgJiYgLy8gdHlwZWQgYXJyYXkgaW5zdGFuY2VzIGNhbiBiZSBhdWdtZW50ZWRcbiAgICAgICAgdHlwZW9mIGFyci5zdWJhcnJheSA9PT0gJ2Z1bmN0aW9uJyAmJiAvLyBjaHJvbWUgOS0xMCBsYWNrIGBzdWJhcnJheWBcbiAgICAgICAgbmV3IFVpbnQ4QXJyYXkoMSkuc3ViYXJyYXkoMSwgMSkuYnl0ZUxlbmd0aCA9PT0gMCAvLyBpZTEwIGhhcyBicm9rZW4gYHN1YmFycmF5YFxuICB9IGNhdGNoIChlKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cbn0pKClcblxuLyoqXG4gKiBDbGFzczogQnVmZmVyXG4gKiA9PT09PT09PT09PT09XG4gKlxuICogVGhlIEJ1ZmZlciBjb25zdHJ1Y3RvciByZXR1cm5zIGluc3RhbmNlcyBvZiBgVWludDhBcnJheWAgdGhhdCBhcmUgYXVnbWVudGVkXG4gKiB3aXRoIGZ1bmN0aW9uIHByb3BlcnRpZXMgZm9yIGFsbCB0aGUgbm9kZSBgQnVmZmVyYCBBUEkgZnVuY3Rpb25zLiBXZSB1c2VcbiAqIGBVaW50OEFycmF5YCBzbyB0aGF0IHNxdWFyZSBicmFja2V0IG5vdGF0aW9uIHdvcmtzIGFzIGV4cGVjdGVkIC0tIGl0IHJldHVybnNcbiAqIGEgc2luZ2xlIG9jdGV0LlxuICpcbiAqIEJ5IGF1Z21lbnRpbmcgdGhlIGluc3RhbmNlcywgd2UgY2FuIGF2b2lkIG1vZGlmeWluZyB0aGUgYFVpbnQ4QXJyYXlgXG4gKiBwcm90b3R5cGUuXG4gKi9cbmZ1bmN0aW9uIEJ1ZmZlciAoc3ViamVjdCwgZW5jb2RpbmcsIG5vWmVybykge1xuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgQnVmZmVyKSlcbiAgICByZXR1cm4gbmV3IEJ1ZmZlcihzdWJqZWN0LCBlbmNvZGluZywgbm9aZXJvKVxuXG4gIHZhciB0eXBlID0gdHlwZW9mIHN1YmplY3RcblxuICAvLyBGaW5kIHRoZSBsZW5ndGhcbiAgdmFyIGxlbmd0aFxuICBpZiAodHlwZSA9PT0gJ251bWJlcicpXG4gICAgbGVuZ3RoID0gc3ViamVjdCA+IDAgPyBzdWJqZWN0ID4+PiAwIDogMFxuICBlbHNlIGlmICh0eXBlID09PSAnc3RyaW5nJykge1xuICAgIGlmIChlbmNvZGluZyA9PT0gJ2Jhc2U2NCcpXG4gICAgICBzdWJqZWN0ID0gYmFzZTY0Y2xlYW4oc3ViamVjdClcbiAgICBsZW5ndGggPSBCdWZmZXIuYnl0ZUxlbmd0aChzdWJqZWN0LCBlbmNvZGluZylcbiAgfSBlbHNlIGlmICh0eXBlID09PSAnb2JqZWN0JyAmJiBzdWJqZWN0ICE9PSBudWxsKSB7IC8vIGFzc3VtZSBvYmplY3QgaXMgYXJyYXktbGlrZVxuICAgIGlmIChzdWJqZWN0LnR5cGUgPT09ICdCdWZmZXInICYmIGlzQXJyYXkoc3ViamVjdC5kYXRhKSlcbiAgICAgIHN1YmplY3QgPSBzdWJqZWN0LmRhdGFcbiAgICBsZW5ndGggPSArc3ViamVjdC5sZW5ndGggPiAwID8gTWF0aC5mbG9vcigrc3ViamVjdC5sZW5ndGgpIDogMFxuICB9IGVsc2VcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdtdXN0IHN0YXJ0IHdpdGggbnVtYmVyLCBidWZmZXIsIGFycmF5IG9yIHN0cmluZycpXG5cbiAgaWYgKHRoaXMubGVuZ3RoID4ga01heExlbmd0aClcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignQXR0ZW1wdCB0byBhbGxvY2F0ZSBCdWZmZXIgbGFyZ2VyIHRoYW4gbWF4aW11bSAnICtcbiAgICAgICdzaXplOiAweCcgKyBrTWF4TGVuZ3RoLnRvU3RyaW5nKDE2KSArICcgYnl0ZXMnKVxuXG4gIHZhciBidWZcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgLy8gUHJlZmVycmVkOiBSZXR1cm4gYW4gYXVnbWVudGVkIGBVaW50OEFycmF5YCBpbnN0YW5jZSBmb3IgYmVzdCBwZXJmb3JtYW5jZVxuICAgIGJ1ZiA9IEJ1ZmZlci5fYXVnbWVudChuZXcgVWludDhBcnJheShsZW5ndGgpKVxuICB9IGVsc2Uge1xuICAgIC8vIEZhbGxiYWNrOiBSZXR1cm4gVEhJUyBpbnN0YW5jZSBvZiBCdWZmZXIgKGNyZWF0ZWQgYnkgYG5ld2ApXG4gICAgYnVmID0gdGhpc1xuICAgIGJ1Zi5sZW5ndGggPSBsZW5ndGhcbiAgICBidWYuX2lzQnVmZmVyID0gdHJ1ZVxuICB9XG5cbiAgdmFyIGlcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUICYmIHR5cGVvZiBzdWJqZWN0LmJ5dGVMZW5ndGggPT09ICdudW1iZXInKSB7XG4gICAgLy8gU3BlZWQgb3B0aW1pemF0aW9uIC0tIHVzZSBzZXQgaWYgd2UncmUgY29weWluZyBmcm9tIGEgdHlwZWQgYXJyYXlcbiAgICBidWYuX3NldChzdWJqZWN0KVxuICB9IGVsc2UgaWYgKGlzQXJyYXlpc2goc3ViamVjdCkpIHtcbiAgICAvLyBUcmVhdCBhcnJheS1pc2ggb2JqZWN0cyBhcyBhIGJ5dGUgYXJyYXlcbiAgICBpZiAoQnVmZmVyLmlzQnVmZmVyKHN1YmplY3QpKSB7XG4gICAgICBmb3IgKGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspXG4gICAgICAgIGJ1ZltpXSA9IHN1YmplY3QucmVhZFVJbnQ4KGkpXG4gICAgfSBlbHNlIHtcbiAgICAgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGkrKylcbiAgICAgICAgYnVmW2ldID0gKChzdWJqZWN0W2ldICUgMjU2KSArIDI1NikgJSAyNTZcbiAgICB9XG4gIH0gZWxzZSBpZiAodHlwZSA9PT0gJ3N0cmluZycpIHtcbiAgICBidWYud3JpdGUoc3ViamVjdCwgMCwgZW5jb2RpbmcpXG4gIH0gZWxzZSBpZiAodHlwZSA9PT0gJ251bWJlcicgJiYgIUJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUICYmICFub1plcm8pIHtcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIGJ1ZltpXSA9IDBcbiAgICB9XG4gIH1cblxuICByZXR1cm4gYnVmXG59XG5cbkJ1ZmZlci5pc0J1ZmZlciA9IGZ1bmN0aW9uIChiKSB7XG4gIHJldHVybiAhIShiICE9IG51bGwgJiYgYi5faXNCdWZmZXIpXG59XG5cbkJ1ZmZlci5jb21wYXJlID0gZnVuY3Rpb24gKGEsIGIpIHtcbiAgaWYgKCFCdWZmZXIuaXNCdWZmZXIoYSkgfHwgIUJ1ZmZlci5pc0J1ZmZlcihiKSlcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcmd1bWVudHMgbXVzdCBiZSBCdWZmZXJzJylcblxuICB2YXIgeCA9IGEubGVuZ3RoXG4gIHZhciB5ID0gYi5sZW5ndGhcbiAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IE1hdGgubWluKHgsIHkpOyBpIDwgbGVuICYmIGFbaV0gPT09IGJbaV07IGkrKykge31cbiAgaWYgKGkgIT09IGxlbikge1xuICAgIHggPSBhW2ldXG4gICAgeSA9IGJbaV1cbiAgfVxuICBpZiAoeCA8IHkpIHJldHVybiAtMVxuICBpZiAoeSA8IHgpIHJldHVybiAxXG4gIHJldHVybiAwXG59XG5cbkJ1ZmZlci5pc0VuY29kaW5nID0gZnVuY3Rpb24gKGVuY29kaW5nKSB7XG4gIHN3aXRjaCAoU3RyaW5nKGVuY29kaW5nKS50b0xvd2VyQ2FzZSgpKSB7XG4gICAgY2FzZSAnaGV4JzpcbiAgICBjYXNlICd1dGY4JzpcbiAgICBjYXNlICd1dGYtOCc6XG4gICAgY2FzZSAnYXNjaWknOlxuICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgY2FzZSAnYmFzZTY0JzpcbiAgICBjYXNlICdyYXcnOlxuICAgIGNhc2UgJ3VjczInOlxuICAgIGNhc2UgJ3Vjcy0yJzpcbiAgICBjYXNlICd1dGYxNmxlJzpcbiAgICBjYXNlICd1dGYtMTZsZSc6XG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4gZmFsc2VcbiAgfVxufVxuXG5CdWZmZXIuY29uY2F0ID0gZnVuY3Rpb24gKGxpc3QsIHRvdGFsTGVuZ3RoKSB7XG4gIGlmICghaXNBcnJheShsaXN0KSkgdGhyb3cgbmV3IFR5cGVFcnJvcignVXNhZ2U6IEJ1ZmZlci5jb25jYXQobGlzdFssIGxlbmd0aF0pJylcblxuICBpZiAobGlzdC5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gbmV3IEJ1ZmZlcigwKVxuICB9IGVsc2UgaWYgKGxpc3QubGVuZ3RoID09PSAxKSB7XG4gICAgcmV0dXJuIGxpc3RbMF1cbiAgfVxuXG4gIHZhciBpXG4gIGlmICh0b3RhbExlbmd0aCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgdG90YWxMZW5ndGggPSAwXG4gICAgZm9yIChpID0gMDsgaSA8IGxpc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgIHRvdGFsTGVuZ3RoICs9IGxpc3RbaV0ubGVuZ3RoXG4gICAgfVxuICB9XG5cbiAgdmFyIGJ1ZiA9IG5ldyBCdWZmZXIodG90YWxMZW5ndGgpXG4gIHZhciBwb3MgPSAwXG4gIGZvciAoaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGl0ZW0gPSBsaXN0W2ldXG4gICAgaXRlbS5jb3B5KGJ1ZiwgcG9zKVxuICAgIHBvcyArPSBpdGVtLmxlbmd0aFxuICB9XG4gIHJldHVybiBidWZcbn1cblxuQnVmZmVyLmJ5dGVMZW5ndGggPSBmdW5jdGlvbiAoc3RyLCBlbmNvZGluZykge1xuICB2YXIgcmV0XG4gIHN0ciA9IHN0ciArICcnXG4gIHN3aXRjaCAoZW5jb2RpbmcgfHwgJ3V0ZjgnKSB7XG4gICAgY2FzZSAnYXNjaWknOlxuICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgY2FzZSAncmF3JzpcbiAgICAgIHJldCA9IHN0ci5sZW5ndGhcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAndWNzMic6XG4gICAgY2FzZSAndWNzLTInOlxuICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgIHJldCA9IHN0ci5sZW5ndGggKiAyXG4gICAgICBicmVha1xuICAgIGNhc2UgJ2hleCc6XG4gICAgICByZXQgPSBzdHIubGVuZ3RoID4+PiAxXG4gICAgICBicmVha1xuICAgIGNhc2UgJ3V0ZjgnOlxuICAgIGNhc2UgJ3V0Zi04JzpcbiAgICAgIHJldCA9IHV0ZjhUb0J5dGVzKHN0cikubGVuZ3RoXG4gICAgICBicmVha1xuICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgICByZXQgPSBiYXNlNjRUb0J5dGVzKHN0cikubGVuZ3RoXG4gICAgICBicmVha1xuICAgIGRlZmF1bHQ6XG4gICAgICByZXQgPSBzdHIubGVuZ3RoXG4gIH1cbiAgcmV0dXJuIHJldFxufVxuXG4vLyBwcmUtc2V0IGZvciB2YWx1ZXMgdGhhdCBtYXkgZXhpc3QgaW4gdGhlIGZ1dHVyZVxuQnVmZmVyLnByb3RvdHlwZS5sZW5ndGggPSB1bmRlZmluZWRcbkJ1ZmZlci5wcm90b3R5cGUucGFyZW50ID0gdW5kZWZpbmVkXG5cbi8vIHRvU3RyaW5nKGVuY29kaW5nLCBzdGFydD0wLCBlbmQ9YnVmZmVyLmxlbmd0aClcbkJ1ZmZlci5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiAoZW5jb2RpbmcsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGxvd2VyZWRDYXNlID0gZmFsc2VcblxuICBzdGFydCA9IHN0YXJ0ID4+PiAwXG4gIGVuZCA9IGVuZCA9PT0gdW5kZWZpbmVkIHx8IGVuZCA9PT0gSW5maW5pdHkgPyB0aGlzLmxlbmd0aCA6IGVuZCA+Pj4gMFxuXG4gIGlmICghZW5jb2RpbmcpIGVuY29kaW5nID0gJ3V0ZjgnXG4gIGlmIChzdGFydCA8IDApIHN0YXJ0ID0gMFxuICBpZiAoZW5kID4gdGhpcy5sZW5ndGgpIGVuZCA9IHRoaXMubGVuZ3RoXG4gIGlmIChlbmQgPD0gc3RhcnQpIHJldHVybiAnJ1xuXG4gIHdoaWxlICh0cnVlKSB7XG4gICAgc3dpdGNoIChlbmNvZGluZykge1xuICAgICAgY2FzZSAnaGV4JzpcbiAgICAgICAgcmV0dXJuIGhleFNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ3V0ZjgnOlxuICAgICAgY2FzZSAndXRmLTgnOlxuICAgICAgICByZXR1cm4gdXRmOFNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ2FzY2lpJzpcbiAgICAgICAgcmV0dXJuIGFzY2lpU2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAnYmluYXJ5JzpcbiAgICAgICAgcmV0dXJuIGJpbmFyeVNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgICAgIHJldHVybiBiYXNlNjRTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBjYXNlICd1Y3MyJzpcbiAgICAgIGNhc2UgJ3Vjcy0yJzpcbiAgICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgICByZXR1cm4gdXRmMTZsZVNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGlmIChsb3dlcmVkQ2FzZSlcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdVbmtub3duIGVuY29kaW5nOiAnICsgZW5jb2RpbmcpXG4gICAgICAgIGVuY29kaW5nID0gKGVuY29kaW5nICsgJycpLnRvTG93ZXJDYXNlKClcbiAgICAgICAgbG93ZXJlZENhc2UgPSB0cnVlXG4gICAgfVxuICB9XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuZXF1YWxzID0gZnVuY3Rpb24gKGIpIHtcbiAgaWYoIUJ1ZmZlci5pc0J1ZmZlcihiKSkgdGhyb3cgbmV3IFR5cGVFcnJvcignQXJndW1lbnQgbXVzdCBiZSBhIEJ1ZmZlcicpXG4gIHJldHVybiBCdWZmZXIuY29tcGFyZSh0aGlzLCBiKSA9PT0gMFxufVxuXG5CdWZmZXIucHJvdG90eXBlLmluc3BlY3QgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBzdHIgPSAnJ1xuICB2YXIgbWF4ID0gZXhwb3J0cy5JTlNQRUNUX01BWF9CWVRFU1xuICBpZiAodGhpcy5sZW5ndGggPiAwKSB7XG4gICAgc3RyID0gdGhpcy50b1N0cmluZygnaGV4JywgMCwgbWF4KS5tYXRjaCgvLnsyfS9nKS5qb2luKCcgJylcbiAgICBpZiAodGhpcy5sZW5ndGggPiBtYXgpXG4gICAgICBzdHIgKz0gJyAuLi4gJ1xuICB9XG4gIHJldHVybiAnPEJ1ZmZlciAnICsgc3RyICsgJz4nXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuY29tcGFyZSA9IGZ1bmN0aW9uIChiKSB7XG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKGIpKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcmd1bWVudCBtdXN0IGJlIGEgQnVmZmVyJylcbiAgcmV0dXJuIEJ1ZmZlci5jb21wYXJlKHRoaXMsIGIpXG59XG5cbi8vIGBnZXRgIHdpbGwgYmUgcmVtb3ZlZCBpbiBOb2RlIDAuMTMrXG5CdWZmZXIucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uIChvZmZzZXQpIHtcbiAgY29uc29sZS5sb2coJy5nZXQoKSBpcyBkZXByZWNhdGVkLiBBY2Nlc3MgdXNpbmcgYXJyYXkgaW5kZXhlcyBpbnN0ZWFkLicpXG4gIHJldHVybiB0aGlzLnJlYWRVSW50OChvZmZzZXQpXG59XG5cbi8vIGBzZXRgIHdpbGwgYmUgcmVtb3ZlZCBpbiBOb2RlIDAuMTMrXG5CdWZmZXIucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uICh2LCBvZmZzZXQpIHtcbiAgY29uc29sZS5sb2coJy5zZXQoKSBpcyBkZXByZWNhdGVkLiBBY2Nlc3MgdXNpbmcgYXJyYXkgaW5kZXhlcyBpbnN0ZWFkLicpXG4gIHJldHVybiB0aGlzLndyaXRlVUludDgodiwgb2Zmc2V0KVxufVxuXG5mdW5jdGlvbiBoZXhXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIG9mZnNldCA9IE51bWJlcihvZmZzZXQpIHx8IDBcbiAgdmFyIHJlbWFpbmluZyA9IGJ1Zi5sZW5ndGggLSBvZmZzZXRcbiAgaWYgKCFsZW5ndGgpIHtcbiAgICBsZW5ndGggPSByZW1haW5pbmdcbiAgfSBlbHNlIHtcbiAgICBsZW5ndGggPSBOdW1iZXIobGVuZ3RoKVxuICAgIGlmIChsZW5ndGggPiByZW1haW5pbmcpIHtcbiAgICAgIGxlbmd0aCA9IHJlbWFpbmluZ1xuICAgIH1cbiAgfVxuXG4gIC8vIG11c3QgYmUgYW4gZXZlbiBudW1iZXIgb2YgZGlnaXRzXG4gIHZhciBzdHJMZW4gPSBzdHJpbmcubGVuZ3RoXG4gIGlmIChzdHJMZW4gJSAyICE9PSAwKSB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgaGV4IHN0cmluZycpXG5cbiAgaWYgKGxlbmd0aCA+IHN0ckxlbiAvIDIpIHtcbiAgICBsZW5ndGggPSBzdHJMZW4gLyAyXG4gIH1cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgIHZhciBieXRlID0gcGFyc2VJbnQoc3RyaW5nLnN1YnN0cihpICogMiwgMiksIDE2KVxuICAgIGlmIChpc05hTihieXRlKSkgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGhleCBzdHJpbmcnKVxuICAgIGJ1ZltvZmZzZXQgKyBpXSA9IGJ5dGVcbiAgfVxuICByZXR1cm4gaVxufVxuXG5mdW5jdGlvbiB1dGY4V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICB2YXIgY2hhcnNXcml0dGVuID0gYmxpdEJ1ZmZlcih1dGY4VG9CeXRlcyhzdHJpbmcpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxuICByZXR1cm4gY2hhcnNXcml0dGVuXG59XG5cbmZ1bmN0aW9uIGFzY2lpV3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICB2YXIgY2hhcnNXcml0dGVuID0gYmxpdEJ1ZmZlcihhc2NpaVRvQnl0ZXMoc3RyaW5nKSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbiAgcmV0dXJuIGNoYXJzV3JpdHRlblxufVxuXG5mdW5jdGlvbiBiaW5hcnlXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBhc2NpaVdyaXRlKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcbn1cblxuZnVuY3Rpb24gYmFzZTY0V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICB2YXIgY2hhcnNXcml0dGVuID0gYmxpdEJ1ZmZlcihiYXNlNjRUb0J5dGVzKHN0cmluZyksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG4gIHJldHVybiBjaGFyc1dyaXR0ZW5cbn1cblxuZnVuY3Rpb24gdXRmMTZsZVdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgdmFyIGNoYXJzV3JpdHRlbiA9IGJsaXRCdWZmZXIodXRmMTZsZVRvQnl0ZXMoc3RyaW5nKSwgYnVmLCBvZmZzZXQsIGxlbmd0aCwgMilcbiAgcmV0dXJuIGNoYXJzV3JpdHRlblxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlID0gZnVuY3Rpb24gKHN0cmluZywgb2Zmc2V0LCBsZW5ndGgsIGVuY29kaW5nKSB7XG4gIC8vIFN1cHBvcnQgYm90aCAoc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCwgZW5jb2RpbmcpXG4gIC8vIGFuZCB0aGUgbGVnYWN5IChzdHJpbmcsIGVuY29kaW5nLCBvZmZzZXQsIGxlbmd0aClcbiAgaWYgKGlzRmluaXRlKG9mZnNldCkpIHtcbiAgICBpZiAoIWlzRmluaXRlKGxlbmd0aCkpIHtcbiAgICAgIGVuY29kaW5nID0gbGVuZ3RoXG4gICAgICBsZW5ndGggPSB1bmRlZmluZWRcbiAgICB9XG4gIH0gZWxzZSB7ICAvLyBsZWdhY3lcbiAgICB2YXIgc3dhcCA9IGVuY29kaW5nXG4gICAgZW5jb2RpbmcgPSBvZmZzZXRcbiAgICBvZmZzZXQgPSBsZW5ndGhcbiAgICBsZW5ndGggPSBzd2FwXG4gIH1cblxuICBvZmZzZXQgPSBOdW1iZXIob2Zmc2V0KSB8fCAwXG4gIHZhciByZW1haW5pbmcgPSB0aGlzLmxlbmd0aCAtIG9mZnNldFxuICBpZiAoIWxlbmd0aCkge1xuICAgIGxlbmd0aCA9IHJlbWFpbmluZ1xuICB9IGVsc2Uge1xuICAgIGxlbmd0aCA9IE51bWJlcihsZW5ndGgpXG4gICAgaWYgKGxlbmd0aCA+IHJlbWFpbmluZykge1xuICAgICAgbGVuZ3RoID0gcmVtYWluaW5nXG4gICAgfVxuICB9XG4gIGVuY29kaW5nID0gU3RyaW5nKGVuY29kaW5nIHx8ICd1dGY4JykudG9Mb3dlckNhc2UoKVxuXG4gIHZhciByZXRcbiAgc3dpdGNoIChlbmNvZGluZykge1xuICAgIGNhc2UgJ2hleCc6XG4gICAgICByZXQgPSBoZXhXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICd1dGY4JzpcbiAgICBjYXNlICd1dGYtOCc6XG4gICAgICByZXQgPSB1dGY4V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAnYXNjaWknOlxuICAgICAgcmV0ID0gYXNjaWlXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICdiaW5hcnknOlxuICAgICAgcmV0ID0gYmluYXJ5V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgIHJldCA9IGJhc2U2NFdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG4gICAgICBicmVha1xuICAgIGNhc2UgJ3VjczInOlxuICAgIGNhc2UgJ3Vjcy0yJzpcbiAgICBjYXNlICd1dGYxNmxlJzpcbiAgICBjYXNlICd1dGYtMTZsZSc6XG4gICAgICByZXQgPSB1dGYxNmxlV3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcbiAgICAgIGJyZWFrXG4gICAgZGVmYXVsdDpcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1Vua25vd24gZW5jb2Rpbmc6ICcgKyBlbmNvZGluZylcbiAgfVxuICByZXR1cm4gcmV0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4ge1xuICAgIHR5cGU6ICdCdWZmZXInLFxuICAgIGRhdGE6IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKHRoaXMuX2FyciB8fCB0aGlzLCAwKVxuICB9XG59XG5cbmZ1bmN0aW9uIGJhc2U2NFNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgaWYgKHN0YXJ0ID09PSAwICYmIGVuZCA9PT0gYnVmLmxlbmd0aCkge1xuICAgIHJldHVybiBiYXNlNjQuZnJvbUJ5dGVBcnJheShidWYpXG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGJhc2U2NC5mcm9tQnl0ZUFycmF5KGJ1Zi5zbGljZShzdGFydCwgZW5kKSlcbiAgfVxufVxuXG5mdW5jdGlvbiB1dGY4U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgcmVzID0gJydcbiAgdmFyIHRtcCA9ICcnXG4gIGVuZCA9IE1hdGgubWluKGJ1Zi5sZW5ndGgsIGVuZClcblxuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7IGkrKykge1xuICAgIGlmIChidWZbaV0gPD0gMHg3Rikge1xuICAgICAgcmVzICs9IGRlY29kZVV0ZjhDaGFyKHRtcCkgKyBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ1ZltpXSlcbiAgICAgIHRtcCA9ICcnXG4gICAgfSBlbHNlIHtcbiAgICAgIHRtcCArPSAnJScgKyBidWZbaV0udG9TdHJpbmcoMTYpXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHJlcyArIGRlY29kZVV0ZjhDaGFyKHRtcClcbn1cblxuZnVuY3Rpb24gYXNjaWlTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciByZXQgPSAnJ1xuICBlbmQgPSBNYXRoLm1pbihidWYubGVuZ3RoLCBlbmQpXG5cbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyBpKyspIHtcbiAgICByZXQgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShidWZbaV0pXG4gIH1cbiAgcmV0dXJuIHJldFxufVxuXG5mdW5jdGlvbiBiaW5hcnlTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHJldHVybiBhc2NpaVNsaWNlKGJ1Ziwgc3RhcnQsIGVuZClcbn1cblxuZnVuY3Rpb24gaGV4U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuXG4gIGlmICghc3RhcnQgfHwgc3RhcnQgPCAwKSBzdGFydCA9IDBcbiAgaWYgKCFlbmQgfHwgZW5kIDwgMCB8fCBlbmQgPiBsZW4pIGVuZCA9IGxlblxuXG4gIHZhciBvdXQgPSAnJ1xuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7IGkrKykge1xuICAgIG91dCArPSB0b0hleChidWZbaV0pXG4gIH1cbiAgcmV0dXJuIG91dFxufVxuXG5mdW5jdGlvbiB1dGYxNmxlU2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgYnl0ZXMgPSBidWYuc2xpY2Uoc3RhcnQsIGVuZClcbiAgdmFyIHJlcyA9ICcnXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgYnl0ZXMubGVuZ3RoOyBpICs9IDIpIHtcbiAgICByZXMgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShieXRlc1tpXSArIGJ5dGVzW2kgKyAxXSAqIDI1NilcbiAgfVxuICByZXR1cm4gcmVzXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuc2xpY2UgPSBmdW5jdGlvbiAoc3RhcnQsIGVuZCkge1xuICB2YXIgbGVuID0gdGhpcy5sZW5ndGhcbiAgc3RhcnQgPSB+fnN0YXJ0XG4gIGVuZCA9IGVuZCA9PT0gdW5kZWZpbmVkID8gbGVuIDogfn5lbmRcblxuICBpZiAoc3RhcnQgPCAwKSB7XG4gICAgc3RhcnQgKz0gbGVuO1xuICAgIGlmIChzdGFydCA8IDApXG4gICAgICBzdGFydCA9IDBcbiAgfSBlbHNlIGlmIChzdGFydCA+IGxlbikge1xuICAgIHN0YXJ0ID0gbGVuXG4gIH1cblxuICBpZiAoZW5kIDwgMCkge1xuICAgIGVuZCArPSBsZW5cbiAgICBpZiAoZW5kIDwgMClcbiAgICAgIGVuZCA9IDBcbiAgfSBlbHNlIGlmIChlbmQgPiBsZW4pIHtcbiAgICBlbmQgPSBsZW5cbiAgfVxuXG4gIGlmIChlbmQgPCBzdGFydClcbiAgICBlbmQgPSBzdGFydFxuXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIHJldHVybiBCdWZmZXIuX2F1Z21lbnQodGhpcy5zdWJhcnJheShzdGFydCwgZW5kKSlcbiAgfSBlbHNlIHtcbiAgICB2YXIgc2xpY2VMZW4gPSBlbmQgLSBzdGFydFxuICAgIHZhciBuZXdCdWYgPSBuZXcgQnVmZmVyKHNsaWNlTGVuLCB1bmRlZmluZWQsIHRydWUpXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzbGljZUxlbjsgaSsrKSB7XG4gICAgICBuZXdCdWZbaV0gPSB0aGlzW2kgKyBzdGFydF1cbiAgICB9XG4gICAgcmV0dXJuIG5ld0J1ZlxuICB9XG59XG5cbi8qXG4gKiBOZWVkIHRvIG1ha2Ugc3VyZSB0aGF0IGJ1ZmZlciBpc24ndCB0cnlpbmcgdG8gd3JpdGUgb3V0IG9mIGJvdW5kcy5cbiAqL1xuZnVuY3Rpb24gY2hlY2tPZmZzZXQgKG9mZnNldCwgZXh0LCBsZW5ndGgpIHtcbiAgaWYgKChvZmZzZXQgJSAxKSAhPT0gMCB8fCBvZmZzZXQgPCAwKVxuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdvZmZzZXQgaXMgbm90IHVpbnQnKVxuICBpZiAob2Zmc2V0ICsgZXh0ID4gbGVuZ3RoKVxuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdUcnlpbmcgdG8gYWNjZXNzIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDggPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KVxuICAgIGNoZWNrT2Zmc2V0KG9mZnNldCwgMSwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiB0aGlzW29mZnNldF1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDE2TEUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KVxuICAgIGNoZWNrT2Zmc2V0KG9mZnNldCwgMiwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiB0aGlzW29mZnNldF0gfCAodGhpc1tvZmZzZXQgKyAxXSA8PCA4KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MTZCRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tPZmZzZXQob2Zmc2V0LCAyLCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuICh0aGlzW29mZnNldF0gPDwgOCkgfCB0aGlzW29mZnNldCArIDFdXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQzMkxFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuXG4gIHJldHVybiAoKHRoaXNbb2Zmc2V0XSkgfFxuICAgICAgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgOCkgfFxuICAgICAgKHRoaXNbb2Zmc2V0ICsgMl0gPDwgMTYpKSArXG4gICAgICAodGhpc1tvZmZzZXQgKyAzXSAqIDB4MTAwMDAwMClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDMyQkUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KVxuICAgIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG5cbiAgcmV0dXJuICh0aGlzW29mZnNldF0gKiAweDEwMDAwMDApICtcbiAgICAgICgodGhpc1tvZmZzZXQgKyAxXSA8PCAxNikgfFxuICAgICAgKHRoaXNbb2Zmc2V0ICsgMl0gPDwgOCkgfFxuICAgICAgdGhpc1tvZmZzZXQgKyAzXSlcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50OCA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tPZmZzZXQob2Zmc2V0LCAxLCB0aGlzLmxlbmd0aClcbiAgaWYgKCEodGhpc1tvZmZzZXRdICYgMHg4MCkpXG4gICAgcmV0dXJuICh0aGlzW29mZnNldF0pXG4gIHJldHVybiAoKDB4ZmYgLSB0aGlzW29mZnNldF0gKyAxKSAqIC0xKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQxNkxFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja09mZnNldChvZmZzZXQsIDIsIHRoaXMubGVuZ3RoKVxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXRdIHwgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgOClcbiAgcmV0dXJuICh2YWwgJiAweDgwMDApID8gdmFsIHwgMHhGRkZGMDAwMCA6IHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQxNkJFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja09mZnNldChvZmZzZXQsIDIsIHRoaXMubGVuZ3RoKVxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXQgKyAxXSB8ICh0aGlzW29mZnNldF0gPDwgOClcbiAgcmV0dXJuICh2YWwgJiAweDgwMDApID8gdmFsIHwgMHhGRkZGMDAwMCA6IHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQzMkxFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuXG4gIHJldHVybiAodGhpc1tvZmZzZXRdKSB8XG4gICAgICAodGhpc1tvZmZzZXQgKyAxXSA8PCA4KSB8XG4gICAgICAodGhpc1tvZmZzZXQgKyAyXSA8PCAxNikgfFxuICAgICAgKHRoaXNbb2Zmc2V0ICsgM10gPDwgMjQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDMyQkUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KVxuICAgIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG5cbiAgcmV0dXJuICh0aGlzW29mZnNldF0gPDwgMjQpIHxcbiAgICAgICh0aGlzW29mZnNldCArIDFdIDw8IDE2KSB8XG4gICAgICAodGhpc1tvZmZzZXQgKyAyXSA8PCA4KSB8XG4gICAgICAodGhpc1tvZmZzZXQgKyAzXSlcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkRmxvYXRMRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIGllZWU3NTQucmVhZCh0aGlzLCBvZmZzZXQsIHRydWUsIDIzLCA0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRGbG9hdEJFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsIG9mZnNldCwgZmFsc2UsIDIzLCA0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWREb3VibGVMRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tPZmZzZXQob2Zmc2V0LCA4LCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIGllZWU3NTQucmVhZCh0aGlzLCBvZmZzZXQsIHRydWUsIDUyLCA4KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWREb3VibGVCRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tPZmZzZXQob2Zmc2V0LCA4LCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIGllZWU3NTQucmVhZCh0aGlzLCBvZmZzZXQsIGZhbHNlLCA1MiwgOClcbn1cblxuZnVuY3Rpb24gY2hlY2tJbnQgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgZXh0LCBtYXgsIG1pbikge1xuICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcihidWYpKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdidWZmZXIgbXVzdCBiZSBhIEJ1ZmZlciBpbnN0YW5jZScpXG4gIGlmICh2YWx1ZSA+IG1heCB8fCB2YWx1ZSA8IG1pbikgdGhyb3cgbmV3IFR5cGVFcnJvcigndmFsdWUgaXMgb3V0IG9mIGJvdW5kcycpXG4gIGlmIChvZmZzZXQgKyBleHQgPiBidWYubGVuZ3RoKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdpbmRleCBvdXQgb2YgcmFuZ2UnKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDggPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMSwgMHhmZiwgMClcbiAgaWYgKCFCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkgdmFsdWUgPSBNYXRoLmZsb29yKHZhbHVlKVxuICB0aGlzW29mZnNldF0gPSB2YWx1ZVxuICByZXR1cm4gb2Zmc2V0ICsgMVxufVxuXG5mdW5jdGlvbiBvYmplY3RXcml0ZVVJbnQxNiAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4pIHtcbiAgaWYgKHZhbHVlIDwgMCkgdmFsdWUgPSAweGZmZmYgKyB2YWx1ZSArIDFcbiAgZm9yICh2YXIgaSA9IDAsIGogPSBNYXRoLm1pbihidWYubGVuZ3RoIC0gb2Zmc2V0LCAyKTsgaSA8IGo7IGkrKykge1xuICAgIGJ1ZltvZmZzZXQgKyBpXSA9ICh2YWx1ZSAmICgweGZmIDw8ICg4ICogKGxpdHRsZUVuZGlhbiA/IGkgOiAxIC0gaSkpKSkgPj4+XG4gICAgICAobGl0dGxlRW5kaWFuID8gaSA6IDEgLSBpKSAqIDhcbiAgfVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDE2TEUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMiwgMHhmZmZmLCAwKVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldF0gPSB2YWx1ZVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDgpXG4gIH0gZWxzZSBvYmplY3RXcml0ZVVJbnQxNih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlKVxuICByZXR1cm4gb2Zmc2V0ICsgMlxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDE2QkUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMiwgMHhmZmZmLCAwKVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldF0gPSAodmFsdWUgPj4+IDgpXG4gICAgdGhpc1tvZmZzZXQgKyAxXSA9IHZhbHVlXG4gIH0gZWxzZSBvYmplY3RXcml0ZVVJbnQxNih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSlcbiAgcmV0dXJuIG9mZnNldCArIDJcbn1cblxuZnVuY3Rpb24gb2JqZWN0V3JpdGVVSW50MzIgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuKSB7XG4gIGlmICh2YWx1ZSA8IDApIHZhbHVlID0gMHhmZmZmZmZmZiArIHZhbHVlICsgMVxuICBmb3IgKHZhciBpID0gMCwgaiA9IE1hdGgubWluKGJ1Zi5sZW5ndGggLSBvZmZzZXQsIDQpOyBpIDwgajsgaSsrKSB7XG4gICAgYnVmW29mZnNldCArIGldID0gKHZhbHVlID4+PiAobGl0dGxlRW5kaWFuID8gaSA6IDMgLSBpKSAqIDgpICYgMHhmZlxuICB9XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MzJMRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCA0LCAweGZmZmZmZmZmLCAwKVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldCArIDNdID0gKHZhbHVlID4+PiAyNClcbiAgICB0aGlzW29mZnNldCArIDJdID0gKHZhbHVlID4+PiAxNilcbiAgICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiA4KVxuICAgIHRoaXNbb2Zmc2V0XSA9IHZhbHVlXG4gIH0gZWxzZSBvYmplY3RXcml0ZVVJbnQzMih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlKVxuICByZXR1cm4gb2Zmc2V0ICsgNFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDMyQkUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgNCwgMHhmZmZmZmZmZiwgMClcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgdGhpc1tvZmZzZXRdID0gKHZhbHVlID4+PiAyNClcbiAgICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiAxNilcbiAgICB0aGlzW29mZnNldCArIDJdID0gKHZhbHVlID4+PiA4KVxuICAgIHRoaXNbb2Zmc2V0ICsgM10gPSB2YWx1ZVxuICB9IGVsc2Ugb2JqZWN0V3JpdGVVSW50MzIodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UpXG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQ4ID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KVxuICAgIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDEsIDB4N2YsIC0weDgwKVxuICBpZiAoIUJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB2YWx1ZSA9IE1hdGguZmxvb3IodmFsdWUpXG4gIGlmICh2YWx1ZSA8IDApIHZhbHVlID0gMHhmZiArIHZhbHVlICsgMVxuICB0aGlzW29mZnNldF0gPSB2YWx1ZVxuICByZXR1cm4gb2Zmc2V0ICsgMVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MTZMRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAyLCAweDdmZmYsIC0weDgwMDApXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIHRoaXNbb2Zmc2V0XSA9IHZhbHVlXG4gICAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gOClcbiAgfSBlbHNlIG9iamVjdFdyaXRlVUludDE2KHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUpXG4gIHJldHVybiBvZmZzZXQgKyAyXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQxNkJFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KVxuICAgIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDIsIDB4N2ZmZiwgLTB4ODAwMClcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgdGhpc1tvZmZzZXRdID0gKHZhbHVlID4+PiA4KVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSB2YWx1ZVxuICB9IGVsc2Ugb2JqZWN0V3JpdGVVSW50MTYodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UpXG4gIHJldHVybiBvZmZzZXQgKyAyXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQzMkxFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KVxuICAgIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDQsIDB4N2ZmZmZmZmYsIC0weDgwMDAwMDAwKVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldF0gPSB2YWx1ZVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDgpXG4gICAgdGhpc1tvZmZzZXQgKyAyXSA9ICh2YWx1ZSA+Pj4gMTYpXG4gICAgdGhpc1tvZmZzZXQgKyAzXSA9ICh2YWx1ZSA+Pj4gMjQpXG4gIH0gZWxzZSBvYmplY3RXcml0ZVVJbnQzMih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlKVxuICByZXR1cm4gb2Zmc2V0ICsgNFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MzJCRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCA0LCAweDdmZmZmZmZmLCAtMHg4MDAwMDAwMClcbiAgaWYgKHZhbHVlIDwgMCkgdmFsdWUgPSAweGZmZmZmZmZmICsgdmFsdWUgKyAxXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSA+Pj4gMjQpXG4gICAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gMTYpXG4gICAgdGhpc1tvZmZzZXQgKyAyXSA9ICh2YWx1ZSA+Pj4gOClcbiAgICB0aGlzW29mZnNldCArIDNdID0gdmFsdWVcbiAgfSBlbHNlIG9iamVjdFdyaXRlVUludDMyKHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlKVxuICByZXR1cm4gb2Zmc2V0ICsgNFxufVxuXG5mdW5jdGlvbiBjaGVja0lFRUU3NTQgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgZXh0LCBtYXgsIG1pbikge1xuICBpZiAodmFsdWUgPiBtYXggfHwgdmFsdWUgPCBtaW4pIHRocm93IG5ldyBUeXBlRXJyb3IoJ3ZhbHVlIGlzIG91dCBvZiBib3VuZHMnKVxuICBpZiAob2Zmc2V0ICsgZXh0ID4gYnVmLmxlbmd0aCkgdGhyb3cgbmV3IFR5cGVFcnJvcignaW5kZXggb3V0IG9mIHJhbmdlJylcbn1cblxuZnVuY3Rpb24gd3JpdGVGbG9hdCAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tJRUVFNzU0KGJ1ZiwgdmFsdWUsIG9mZnNldCwgNCwgMy40MDI4MjM0NjYzODUyODg2ZSszOCwgLTMuNDAyODIzNDY2Mzg1Mjg4NmUrMzgpXG4gIGllZWU3NTQud3JpdGUoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIDIzLCA0KVxuICByZXR1cm4gb2Zmc2V0ICsgNFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRmxvYXRMRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gd3JpdGVGbG9hdCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUZsb2F0QkUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHdyaXRlRmxvYXQodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG5mdW5jdGlvbiB3cml0ZURvdWJsZSAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tJRUVFNzU0KGJ1ZiwgdmFsdWUsIG9mZnNldCwgOCwgMS43OTc2OTMxMzQ4NjIzMTU3RSszMDgsIC0xLjc5NzY5MzEzNDg2MjMxNTdFKzMwOClcbiAgaWVlZTc1NC53cml0ZShidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgNTIsIDgpXG4gIHJldHVybiBvZmZzZXQgKyA4XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVEb3VibGVMRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gd3JpdGVEb3VibGUodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVEb3VibGVCRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gd3JpdGVEb3VibGUodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG4vLyBjb3B5KHRhcmdldEJ1ZmZlciwgdGFyZ2V0U3RhcnQ9MCwgc291cmNlU3RhcnQ9MCwgc291cmNlRW5kPWJ1ZmZlci5sZW5ndGgpXG5CdWZmZXIucHJvdG90eXBlLmNvcHkgPSBmdW5jdGlvbiAodGFyZ2V0LCB0YXJnZXRfc3RhcnQsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHNvdXJjZSA9IHRoaXNcblxuICBpZiAoIXN0YXJ0KSBzdGFydCA9IDBcbiAgaWYgKCFlbmQgJiYgZW5kICE9PSAwKSBlbmQgPSB0aGlzLmxlbmd0aFxuICBpZiAoIXRhcmdldF9zdGFydCkgdGFyZ2V0X3N0YXJ0ID0gMFxuXG4gIC8vIENvcHkgMCBieXRlczsgd2UncmUgZG9uZVxuICBpZiAoZW5kID09PSBzdGFydCkgcmV0dXJuXG4gIGlmICh0YXJnZXQubGVuZ3RoID09PSAwIHx8IHNvdXJjZS5sZW5ndGggPT09IDApIHJldHVyblxuXG4gIC8vIEZhdGFsIGVycm9yIGNvbmRpdGlvbnNcbiAgaWYgKGVuZCA8IHN0YXJ0KSB0aHJvdyBuZXcgVHlwZUVycm9yKCdzb3VyY2VFbmQgPCBzb3VyY2VTdGFydCcpXG4gIGlmICh0YXJnZXRfc3RhcnQgPCAwIHx8IHRhcmdldF9zdGFydCA+PSB0YXJnZXQubGVuZ3RoKVxuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ3RhcmdldFN0YXJ0IG91dCBvZiBib3VuZHMnKVxuICBpZiAoc3RhcnQgPCAwIHx8IHN0YXJ0ID49IHNvdXJjZS5sZW5ndGgpIHRocm93IG5ldyBUeXBlRXJyb3IoJ3NvdXJjZVN0YXJ0IG91dCBvZiBib3VuZHMnKVxuICBpZiAoZW5kIDwgMCB8fCBlbmQgPiBzb3VyY2UubGVuZ3RoKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdzb3VyY2VFbmQgb3V0IG9mIGJvdW5kcycpXG5cbiAgLy8gQXJlIHdlIG9vYj9cbiAgaWYgKGVuZCA+IHRoaXMubGVuZ3RoKVxuICAgIGVuZCA9IHRoaXMubGVuZ3RoXG4gIGlmICh0YXJnZXQubGVuZ3RoIC0gdGFyZ2V0X3N0YXJ0IDwgZW5kIC0gc3RhcnQpXG4gICAgZW5kID0gdGFyZ2V0Lmxlbmd0aCAtIHRhcmdldF9zdGFydCArIHN0YXJ0XG5cbiAgdmFyIGxlbiA9IGVuZCAtIHN0YXJ0XG5cbiAgaWYgKGxlbiA8IDEwMDAgfHwgIUJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgdGFyZ2V0W2kgKyB0YXJnZXRfc3RhcnRdID0gdGhpc1tpICsgc3RhcnRdXG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHRhcmdldC5fc2V0KHRoaXMuc3ViYXJyYXkoc3RhcnQsIHN0YXJ0ICsgbGVuKSwgdGFyZ2V0X3N0YXJ0KVxuICB9XG59XG5cbi8vIGZpbGwodmFsdWUsIHN0YXJ0PTAsIGVuZD1idWZmZXIubGVuZ3RoKVxuQnVmZmVyLnByb3RvdHlwZS5maWxsID0gZnVuY3Rpb24gKHZhbHVlLCBzdGFydCwgZW5kKSB7XG4gIGlmICghdmFsdWUpIHZhbHVlID0gMFxuICBpZiAoIXN0YXJ0KSBzdGFydCA9IDBcbiAgaWYgKCFlbmQpIGVuZCA9IHRoaXMubGVuZ3RoXG5cbiAgaWYgKGVuZCA8IHN0YXJ0KSB0aHJvdyBuZXcgVHlwZUVycm9yKCdlbmQgPCBzdGFydCcpXG5cbiAgLy8gRmlsbCAwIGJ5dGVzOyB3ZSdyZSBkb25lXG4gIGlmIChlbmQgPT09IHN0YXJ0KSByZXR1cm5cbiAgaWYgKHRoaXMubGVuZ3RoID09PSAwKSByZXR1cm5cblxuICBpZiAoc3RhcnQgPCAwIHx8IHN0YXJ0ID49IHRoaXMubGVuZ3RoKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdzdGFydCBvdXQgb2YgYm91bmRzJylcbiAgaWYgKGVuZCA8IDAgfHwgZW5kID4gdGhpcy5sZW5ndGgpIHRocm93IG5ldyBUeXBlRXJyb3IoJ2VuZCBvdXQgb2YgYm91bmRzJylcblxuICB2YXIgaVxuICBpZiAodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJykge1xuICAgIGZvciAoaSA9IHN0YXJ0OyBpIDwgZW5kOyBpKyspIHtcbiAgICAgIHRoaXNbaV0gPSB2YWx1ZVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB2YXIgYnl0ZXMgPSB1dGY4VG9CeXRlcyh2YWx1ZS50b1N0cmluZygpKVxuICAgIHZhciBsZW4gPSBieXRlcy5sZW5ndGhcbiAgICBmb3IgKGkgPSBzdGFydDsgaSA8IGVuZDsgaSsrKSB7XG4gICAgICB0aGlzW2ldID0gYnl0ZXNbaSAlIGxlbl1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpc1xufVxuXG4vKipcbiAqIENyZWF0ZXMgYSBuZXcgYEFycmF5QnVmZmVyYCB3aXRoIHRoZSAqY29waWVkKiBtZW1vcnkgb2YgdGhlIGJ1ZmZlciBpbnN0YW5jZS5cbiAqIEFkZGVkIGluIE5vZGUgMC4xMi4gT25seSBhdmFpbGFibGUgaW4gYnJvd3NlcnMgdGhhdCBzdXBwb3J0IEFycmF5QnVmZmVyLlxuICovXG5CdWZmZXIucHJvdG90eXBlLnRvQXJyYXlCdWZmZXIgPSBmdW5jdGlvbiAoKSB7XG4gIGlmICh0eXBlb2YgVWludDhBcnJheSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICAgIHJldHVybiAobmV3IEJ1ZmZlcih0aGlzKSkuYnVmZmVyXG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBidWYgPSBuZXcgVWludDhBcnJheSh0aGlzLmxlbmd0aClcbiAgICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBidWYubGVuZ3RoOyBpIDwgbGVuOyBpICs9IDEpIHtcbiAgICAgICAgYnVmW2ldID0gdGhpc1tpXVxuICAgICAgfVxuICAgICAgcmV0dXJuIGJ1Zi5idWZmZXJcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQnVmZmVyLnRvQXJyYXlCdWZmZXIgbm90IHN1cHBvcnRlZCBpbiB0aGlzIGJyb3dzZXInKVxuICB9XG59XG5cbi8vIEhFTFBFUiBGVU5DVElPTlNcbi8vID09PT09PT09PT09PT09PT1cblxudmFyIEJQID0gQnVmZmVyLnByb3RvdHlwZVxuXG4vKipcbiAqIEF1Z21lbnQgYSBVaW50OEFycmF5ICppbnN0YW5jZSogKG5vdCB0aGUgVWludDhBcnJheSBjbGFzcyEpIHdpdGggQnVmZmVyIG1ldGhvZHNcbiAqL1xuQnVmZmVyLl9hdWdtZW50ID0gZnVuY3Rpb24gKGFycikge1xuICBhcnIuY29uc3RydWN0b3IgPSBCdWZmZXJcbiAgYXJyLl9pc0J1ZmZlciA9IHRydWVcblxuICAvLyBzYXZlIHJlZmVyZW5jZSB0byBvcmlnaW5hbCBVaW50OEFycmF5IGdldC9zZXQgbWV0aG9kcyBiZWZvcmUgb3ZlcndyaXRpbmdcbiAgYXJyLl9nZXQgPSBhcnIuZ2V0XG4gIGFyci5fc2V0ID0gYXJyLnNldFxuXG4gIC8vIGRlcHJlY2F0ZWQsIHdpbGwgYmUgcmVtb3ZlZCBpbiBub2RlIDAuMTMrXG4gIGFyci5nZXQgPSBCUC5nZXRcbiAgYXJyLnNldCA9IEJQLnNldFxuXG4gIGFyci53cml0ZSA9IEJQLndyaXRlXG4gIGFyci50b1N0cmluZyA9IEJQLnRvU3RyaW5nXG4gIGFyci50b0xvY2FsZVN0cmluZyA9IEJQLnRvU3RyaW5nXG4gIGFyci50b0pTT04gPSBCUC50b0pTT05cbiAgYXJyLmVxdWFscyA9IEJQLmVxdWFsc1xuICBhcnIuY29tcGFyZSA9IEJQLmNvbXBhcmVcbiAgYXJyLmNvcHkgPSBCUC5jb3B5XG4gIGFyci5zbGljZSA9IEJQLnNsaWNlXG4gIGFyci5yZWFkVUludDggPSBCUC5yZWFkVUludDhcbiAgYXJyLnJlYWRVSW50MTZMRSA9IEJQLnJlYWRVSW50MTZMRVxuICBhcnIucmVhZFVJbnQxNkJFID0gQlAucmVhZFVJbnQxNkJFXG4gIGFyci5yZWFkVUludDMyTEUgPSBCUC5yZWFkVUludDMyTEVcbiAgYXJyLnJlYWRVSW50MzJCRSA9IEJQLnJlYWRVSW50MzJCRVxuICBhcnIucmVhZEludDggPSBCUC5yZWFkSW50OFxuICBhcnIucmVhZEludDE2TEUgPSBCUC5yZWFkSW50MTZMRVxuICBhcnIucmVhZEludDE2QkUgPSBCUC5yZWFkSW50MTZCRVxuICBhcnIucmVhZEludDMyTEUgPSBCUC5yZWFkSW50MzJMRVxuICBhcnIucmVhZEludDMyQkUgPSBCUC5yZWFkSW50MzJCRVxuICBhcnIucmVhZEZsb2F0TEUgPSBCUC5yZWFkRmxvYXRMRVxuICBhcnIucmVhZEZsb2F0QkUgPSBCUC5yZWFkRmxvYXRCRVxuICBhcnIucmVhZERvdWJsZUxFID0gQlAucmVhZERvdWJsZUxFXG4gIGFyci5yZWFkRG91YmxlQkUgPSBCUC5yZWFkRG91YmxlQkVcbiAgYXJyLndyaXRlVUludDggPSBCUC53cml0ZVVJbnQ4XG4gIGFyci53cml0ZVVJbnQxNkxFID0gQlAud3JpdGVVSW50MTZMRVxuICBhcnIud3JpdGVVSW50MTZCRSA9IEJQLndyaXRlVUludDE2QkVcbiAgYXJyLndyaXRlVUludDMyTEUgPSBCUC53cml0ZVVJbnQzMkxFXG4gIGFyci53cml0ZVVJbnQzMkJFID0gQlAud3JpdGVVSW50MzJCRVxuICBhcnIud3JpdGVJbnQ4ID0gQlAud3JpdGVJbnQ4XG4gIGFyci53cml0ZUludDE2TEUgPSBCUC53cml0ZUludDE2TEVcbiAgYXJyLndyaXRlSW50MTZCRSA9IEJQLndyaXRlSW50MTZCRVxuICBhcnIud3JpdGVJbnQzMkxFID0gQlAud3JpdGVJbnQzMkxFXG4gIGFyci53cml0ZUludDMyQkUgPSBCUC53cml0ZUludDMyQkVcbiAgYXJyLndyaXRlRmxvYXRMRSA9IEJQLndyaXRlRmxvYXRMRVxuICBhcnIud3JpdGVGbG9hdEJFID0gQlAud3JpdGVGbG9hdEJFXG4gIGFyci53cml0ZURvdWJsZUxFID0gQlAud3JpdGVEb3VibGVMRVxuICBhcnIud3JpdGVEb3VibGVCRSA9IEJQLndyaXRlRG91YmxlQkVcbiAgYXJyLmZpbGwgPSBCUC5maWxsXG4gIGFyci5pbnNwZWN0ID0gQlAuaW5zcGVjdFxuICBhcnIudG9BcnJheUJ1ZmZlciA9IEJQLnRvQXJyYXlCdWZmZXJcblxuICByZXR1cm4gYXJyXG59XG5cbnZhciBJTlZBTElEX0JBU0U2NF9SRSA9IC9bXitcXC8wLTlBLXpdL2dcblxuZnVuY3Rpb24gYmFzZTY0Y2xlYW4gKHN0cikge1xuICAvLyBOb2RlIHN0cmlwcyBvdXQgaW52YWxpZCBjaGFyYWN0ZXJzIGxpa2UgXFxuIGFuZCBcXHQgZnJvbSB0aGUgc3RyaW5nLCBiYXNlNjQtanMgZG9lcyBub3RcbiAgc3RyID0gc3RyaW5ndHJpbShzdHIpLnJlcGxhY2UoSU5WQUxJRF9CQVNFNjRfUkUsICcnKVxuICAvLyBOb2RlIGFsbG93cyBmb3Igbm9uLXBhZGRlZCBiYXNlNjQgc3RyaW5ncyAobWlzc2luZyB0cmFpbGluZyA9PT0pLCBiYXNlNjQtanMgZG9lcyBub3RcbiAgd2hpbGUgKHN0ci5sZW5ndGggJSA0ICE9PSAwKSB7XG4gICAgc3RyID0gc3RyICsgJz0nXG4gIH1cbiAgcmV0dXJuIHN0clxufVxuXG5mdW5jdGlvbiBzdHJpbmd0cmltIChzdHIpIHtcbiAgaWYgKHN0ci50cmltKSByZXR1cm4gc3RyLnRyaW0oKVxuICByZXR1cm4gc3RyLnJlcGxhY2UoL15cXHMrfFxccyskL2csICcnKVxufVxuXG5mdW5jdGlvbiBpc0FycmF5aXNoIChzdWJqZWN0KSB7XG4gIHJldHVybiBpc0FycmF5KHN1YmplY3QpIHx8IEJ1ZmZlci5pc0J1ZmZlcihzdWJqZWN0KSB8fFxuICAgICAgc3ViamVjdCAmJiB0eXBlb2Ygc3ViamVjdCA9PT0gJ29iamVjdCcgJiZcbiAgICAgIHR5cGVvZiBzdWJqZWN0Lmxlbmd0aCA9PT0gJ251bWJlcidcbn1cblxuZnVuY3Rpb24gdG9IZXggKG4pIHtcbiAgaWYgKG4gPCAxNikgcmV0dXJuICcwJyArIG4udG9TdHJpbmcoMTYpXG4gIHJldHVybiBuLnRvU3RyaW5nKDE2KVxufVxuXG5mdW5jdGlvbiB1dGY4VG9CeXRlcyAoc3RyKSB7XG4gIHZhciBieXRlQXJyYXkgPSBbXVxuICBmb3IgKHZhciBpID0gMDsgaSA8IHN0ci5sZW5ndGg7IGkrKykge1xuICAgIHZhciBiID0gc3RyLmNoYXJDb2RlQXQoaSlcbiAgICBpZiAoYiA8PSAweDdGKSB7XG4gICAgICBieXRlQXJyYXkucHVzaChiKVxuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgc3RhcnQgPSBpXG4gICAgICBpZiAoYiA+PSAweEQ4MDAgJiYgYiA8PSAweERGRkYpIGkrK1xuICAgICAgdmFyIGggPSBlbmNvZGVVUklDb21wb25lbnQoc3RyLnNsaWNlKHN0YXJ0LCBpKzEpKS5zdWJzdHIoMSkuc3BsaXQoJyUnKVxuICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBoLmxlbmd0aDsgaisrKSB7XG4gICAgICAgIGJ5dGVBcnJheS5wdXNoKHBhcnNlSW50KGhbal0sIDE2KSlcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIGJ5dGVBcnJheVxufVxuXG5mdW5jdGlvbiBhc2NpaVRvQnl0ZXMgKHN0cikge1xuICB2YXIgYnl0ZUFycmF5ID0gW11cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyBpKyspIHtcbiAgICAvLyBOb2RlJ3MgY29kZSBzZWVtcyB0byBiZSBkb2luZyB0aGlzIGFuZCBub3QgJiAweDdGLi5cbiAgICBieXRlQXJyYXkucHVzaChzdHIuY2hhckNvZGVBdChpKSAmIDB4RkYpXG4gIH1cbiAgcmV0dXJuIGJ5dGVBcnJheVxufVxuXG5mdW5jdGlvbiB1dGYxNmxlVG9CeXRlcyAoc3RyKSB7XG4gIHZhciBjLCBoaSwgbG9cbiAgdmFyIGJ5dGVBcnJheSA9IFtdXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgaSsrKSB7XG4gICAgYyA9IHN0ci5jaGFyQ29kZUF0KGkpXG4gICAgaGkgPSBjID4+IDhcbiAgICBsbyA9IGMgJSAyNTZcbiAgICBieXRlQXJyYXkucHVzaChsbylcbiAgICBieXRlQXJyYXkucHVzaChoaSlcbiAgfVxuXG4gIHJldHVybiBieXRlQXJyYXlcbn1cblxuZnVuY3Rpb24gYmFzZTY0VG9CeXRlcyAoc3RyKSB7XG4gIHJldHVybiBiYXNlNjQudG9CeXRlQXJyYXkoc3RyKVxufVxuXG5mdW5jdGlvbiBibGl0QnVmZmVyIChzcmMsIGRzdCwgb2Zmc2V0LCBsZW5ndGgsIHVuaXRTaXplKSB7XG4gIGlmICh1bml0U2l6ZSkgbGVuZ3RoIC09IGxlbmd0aCAlIHVuaXRTaXplO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKChpICsgb2Zmc2V0ID49IGRzdC5sZW5ndGgpIHx8IChpID49IHNyYy5sZW5ndGgpKVxuICAgICAgYnJlYWtcbiAgICBkc3RbaSArIG9mZnNldF0gPSBzcmNbaV1cbiAgfVxuICByZXR1cm4gaVxufVxuXG5mdW5jdGlvbiBkZWNvZGVVdGY4Q2hhciAoc3RyKSB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIGRlY29kZVVSSUNvbXBvbmVudChzdHIpXG4gIH0gY2F0Y2ggKGVycikge1xuICAgIHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlKDB4RkZGRCkgLy8gVVRGIDggaW52YWxpZCBjaGFyXG4gIH1cbn1cbiIsInZhciBsb29rdXAgPSAnQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODkrLyc7XG5cbjsoZnVuY3Rpb24gKGV4cG9ydHMpIHtcblx0J3VzZSBzdHJpY3QnO1xuXG4gIHZhciBBcnIgPSAodHlwZW9mIFVpbnQ4QXJyYXkgIT09ICd1bmRlZmluZWQnKVxuICAgID8gVWludDhBcnJheVxuICAgIDogQXJyYXlcblxuXHR2YXIgUExVUyAgID0gJysnLmNoYXJDb2RlQXQoMClcblx0dmFyIFNMQVNIICA9ICcvJy5jaGFyQ29kZUF0KDApXG5cdHZhciBOVU1CRVIgPSAnMCcuY2hhckNvZGVBdCgwKVxuXHR2YXIgTE9XRVIgID0gJ2EnLmNoYXJDb2RlQXQoMClcblx0dmFyIFVQUEVSICA9ICdBJy5jaGFyQ29kZUF0KDApXG5cblx0ZnVuY3Rpb24gZGVjb2RlIChlbHQpIHtcblx0XHR2YXIgY29kZSA9IGVsdC5jaGFyQ29kZUF0KDApXG5cdFx0aWYgKGNvZGUgPT09IFBMVVMpXG5cdFx0XHRyZXR1cm4gNjIgLy8gJysnXG5cdFx0aWYgKGNvZGUgPT09IFNMQVNIKVxuXHRcdFx0cmV0dXJuIDYzIC8vICcvJ1xuXHRcdGlmIChjb2RlIDwgTlVNQkVSKVxuXHRcdFx0cmV0dXJuIC0xIC8vbm8gbWF0Y2hcblx0XHRpZiAoY29kZSA8IE5VTUJFUiArIDEwKVxuXHRcdFx0cmV0dXJuIGNvZGUgLSBOVU1CRVIgKyAyNiArIDI2XG5cdFx0aWYgKGNvZGUgPCBVUFBFUiArIDI2KVxuXHRcdFx0cmV0dXJuIGNvZGUgLSBVUFBFUlxuXHRcdGlmIChjb2RlIDwgTE9XRVIgKyAyNilcblx0XHRcdHJldHVybiBjb2RlIC0gTE9XRVIgKyAyNlxuXHR9XG5cblx0ZnVuY3Rpb24gYjY0VG9CeXRlQXJyYXkgKGI2NCkge1xuXHRcdHZhciBpLCBqLCBsLCB0bXAsIHBsYWNlSG9sZGVycywgYXJyXG5cblx0XHRpZiAoYjY0Lmxlbmd0aCAlIDQgPiAwKSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgc3RyaW5nLiBMZW5ndGggbXVzdCBiZSBhIG11bHRpcGxlIG9mIDQnKVxuXHRcdH1cblxuXHRcdC8vIHRoZSBudW1iZXIgb2YgZXF1YWwgc2lnbnMgKHBsYWNlIGhvbGRlcnMpXG5cdFx0Ly8gaWYgdGhlcmUgYXJlIHR3byBwbGFjZWhvbGRlcnMsIHRoYW4gdGhlIHR3byBjaGFyYWN0ZXJzIGJlZm9yZSBpdFxuXHRcdC8vIHJlcHJlc2VudCBvbmUgYnl0ZVxuXHRcdC8vIGlmIHRoZXJlIGlzIG9ubHkgb25lLCB0aGVuIHRoZSB0aHJlZSBjaGFyYWN0ZXJzIGJlZm9yZSBpdCByZXByZXNlbnQgMiBieXRlc1xuXHRcdC8vIHRoaXMgaXMganVzdCBhIGNoZWFwIGhhY2sgdG8gbm90IGRvIGluZGV4T2YgdHdpY2Vcblx0XHR2YXIgbGVuID0gYjY0Lmxlbmd0aFxuXHRcdHBsYWNlSG9sZGVycyA9ICc9JyA9PT0gYjY0LmNoYXJBdChsZW4gLSAyKSA/IDIgOiAnPScgPT09IGI2NC5jaGFyQXQobGVuIC0gMSkgPyAxIDogMFxuXG5cdFx0Ly8gYmFzZTY0IGlzIDQvMyArIHVwIHRvIHR3byBjaGFyYWN0ZXJzIG9mIHRoZSBvcmlnaW5hbCBkYXRhXG5cdFx0YXJyID0gbmV3IEFycihiNjQubGVuZ3RoICogMyAvIDQgLSBwbGFjZUhvbGRlcnMpXG5cblx0XHQvLyBpZiB0aGVyZSBhcmUgcGxhY2Vob2xkZXJzLCBvbmx5IGdldCB1cCB0byB0aGUgbGFzdCBjb21wbGV0ZSA0IGNoYXJzXG5cdFx0bCA9IHBsYWNlSG9sZGVycyA+IDAgPyBiNjQubGVuZ3RoIC0gNCA6IGI2NC5sZW5ndGhcblxuXHRcdHZhciBMID0gMFxuXG5cdFx0ZnVuY3Rpb24gcHVzaCAodikge1xuXHRcdFx0YXJyW0wrK10gPSB2XG5cdFx0fVxuXG5cdFx0Zm9yIChpID0gMCwgaiA9IDA7IGkgPCBsOyBpICs9IDQsIGogKz0gMykge1xuXHRcdFx0dG1wID0gKGRlY29kZShiNjQuY2hhckF0KGkpKSA8PCAxOCkgfCAoZGVjb2RlKGI2NC5jaGFyQXQoaSArIDEpKSA8PCAxMikgfCAoZGVjb2RlKGI2NC5jaGFyQXQoaSArIDIpKSA8PCA2KSB8IGRlY29kZShiNjQuY2hhckF0KGkgKyAzKSlcblx0XHRcdHB1c2goKHRtcCAmIDB4RkYwMDAwKSA+PiAxNilcblx0XHRcdHB1c2goKHRtcCAmIDB4RkYwMCkgPj4gOClcblx0XHRcdHB1c2godG1wICYgMHhGRilcblx0XHR9XG5cblx0XHRpZiAocGxhY2VIb2xkZXJzID09PSAyKSB7XG5cdFx0XHR0bXAgPSAoZGVjb2RlKGI2NC5jaGFyQXQoaSkpIDw8IDIpIHwgKGRlY29kZShiNjQuY2hhckF0KGkgKyAxKSkgPj4gNClcblx0XHRcdHB1c2godG1wICYgMHhGRilcblx0XHR9IGVsc2UgaWYgKHBsYWNlSG9sZGVycyA9PT0gMSkge1xuXHRcdFx0dG1wID0gKGRlY29kZShiNjQuY2hhckF0KGkpKSA8PCAxMCkgfCAoZGVjb2RlKGI2NC5jaGFyQXQoaSArIDEpKSA8PCA0KSB8IChkZWNvZGUoYjY0LmNoYXJBdChpICsgMikpID4+IDIpXG5cdFx0XHRwdXNoKCh0bXAgPj4gOCkgJiAweEZGKVxuXHRcdFx0cHVzaCh0bXAgJiAweEZGKVxuXHRcdH1cblxuXHRcdHJldHVybiBhcnJcblx0fVxuXG5cdGZ1bmN0aW9uIHVpbnQ4VG9CYXNlNjQgKHVpbnQ4KSB7XG5cdFx0dmFyIGksXG5cdFx0XHRleHRyYUJ5dGVzID0gdWludDgubGVuZ3RoICUgMywgLy8gaWYgd2UgaGF2ZSAxIGJ5dGUgbGVmdCwgcGFkIDIgYnl0ZXNcblx0XHRcdG91dHB1dCA9IFwiXCIsXG5cdFx0XHR0ZW1wLCBsZW5ndGhcblxuXHRcdGZ1bmN0aW9uIGVuY29kZSAobnVtKSB7XG5cdFx0XHRyZXR1cm4gbG9va3VwLmNoYXJBdChudW0pXG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gdHJpcGxldFRvQmFzZTY0IChudW0pIHtcblx0XHRcdHJldHVybiBlbmNvZGUobnVtID4+IDE4ICYgMHgzRikgKyBlbmNvZGUobnVtID4+IDEyICYgMHgzRikgKyBlbmNvZGUobnVtID4+IDYgJiAweDNGKSArIGVuY29kZShudW0gJiAweDNGKVxuXHRcdH1cblxuXHRcdC8vIGdvIHRocm91Z2ggdGhlIGFycmF5IGV2ZXJ5IHRocmVlIGJ5dGVzLCB3ZSdsbCBkZWFsIHdpdGggdHJhaWxpbmcgc3R1ZmYgbGF0ZXJcblx0XHRmb3IgKGkgPSAwLCBsZW5ndGggPSB1aW50OC5sZW5ndGggLSBleHRyYUJ5dGVzOyBpIDwgbGVuZ3RoOyBpICs9IDMpIHtcblx0XHRcdHRlbXAgPSAodWludDhbaV0gPDwgMTYpICsgKHVpbnQ4W2kgKyAxXSA8PCA4KSArICh1aW50OFtpICsgMl0pXG5cdFx0XHRvdXRwdXQgKz0gdHJpcGxldFRvQmFzZTY0KHRlbXApXG5cdFx0fVxuXG5cdFx0Ly8gcGFkIHRoZSBlbmQgd2l0aCB6ZXJvcywgYnV0IG1ha2Ugc3VyZSB0byBub3QgZm9yZ2V0IHRoZSBleHRyYSBieXRlc1xuXHRcdHN3aXRjaCAoZXh0cmFCeXRlcykge1xuXHRcdFx0Y2FzZSAxOlxuXHRcdFx0XHR0ZW1wID0gdWludDhbdWludDgubGVuZ3RoIC0gMV1cblx0XHRcdFx0b3V0cHV0ICs9IGVuY29kZSh0ZW1wID4+IDIpXG5cdFx0XHRcdG91dHB1dCArPSBlbmNvZGUoKHRlbXAgPDwgNCkgJiAweDNGKVxuXHRcdFx0XHRvdXRwdXQgKz0gJz09J1xuXHRcdFx0XHRicmVha1xuXHRcdFx0Y2FzZSAyOlxuXHRcdFx0XHR0ZW1wID0gKHVpbnQ4W3VpbnQ4Lmxlbmd0aCAtIDJdIDw8IDgpICsgKHVpbnQ4W3VpbnQ4Lmxlbmd0aCAtIDFdKVxuXHRcdFx0XHRvdXRwdXQgKz0gZW5jb2RlKHRlbXAgPj4gMTApXG5cdFx0XHRcdG91dHB1dCArPSBlbmNvZGUoKHRlbXAgPj4gNCkgJiAweDNGKVxuXHRcdFx0XHRvdXRwdXQgKz0gZW5jb2RlKCh0ZW1wIDw8IDIpICYgMHgzRilcblx0XHRcdFx0b3V0cHV0ICs9ICc9J1xuXHRcdFx0XHRicmVha1xuXHRcdH1cblxuXHRcdHJldHVybiBvdXRwdXRcblx0fVxuXG5cdGV4cG9ydHMudG9CeXRlQXJyYXkgPSBiNjRUb0J5dGVBcnJheVxuXHRleHBvcnRzLmZyb21CeXRlQXJyYXkgPSB1aW50OFRvQmFzZTY0XG59KHR5cGVvZiBleHBvcnRzID09PSAndW5kZWZpbmVkJyA/ICh0aGlzLmJhc2U2NGpzID0ge30pIDogZXhwb3J0cykpXG4iLCJleHBvcnRzLnJlYWQgPSBmdW5jdGlvbihidWZmZXIsIG9mZnNldCwgaXNMRSwgbUxlbiwgbkJ5dGVzKSB7XG4gIHZhciBlLCBtLFxuICAgICAgZUxlbiA9IG5CeXRlcyAqIDggLSBtTGVuIC0gMSxcbiAgICAgIGVNYXggPSAoMSA8PCBlTGVuKSAtIDEsXG4gICAgICBlQmlhcyA9IGVNYXggPj4gMSxcbiAgICAgIG5CaXRzID0gLTcsXG4gICAgICBpID0gaXNMRSA/IChuQnl0ZXMgLSAxKSA6IDAsXG4gICAgICBkID0gaXNMRSA/IC0xIDogMSxcbiAgICAgIHMgPSBidWZmZXJbb2Zmc2V0ICsgaV07XG5cbiAgaSArPSBkO1xuXG4gIGUgPSBzICYgKCgxIDw8ICgtbkJpdHMpKSAtIDEpO1xuICBzID4+PSAoLW5CaXRzKTtcbiAgbkJpdHMgKz0gZUxlbjtcbiAgZm9yICg7IG5CaXRzID4gMDsgZSA9IGUgKiAyNTYgKyBidWZmZXJbb2Zmc2V0ICsgaV0sIGkgKz0gZCwgbkJpdHMgLT0gOCk7XG5cbiAgbSA9IGUgJiAoKDEgPDwgKC1uQml0cykpIC0gMSk7XG4gIGUgPj49ICgtbkJpdHMpO1xuICBuQml0cyArPSBtTGVuO1xuICBmb3IgKDsgbkJpdHMgPiAwOyBtID0gbSAqIDI1NiArIGJ1ZmZlcltvZmZzZXQgKyBpXSwgaSArPSBkLCBuQml0cyAtPSA4KTtcblxuICBpZiAoZSA9PT0gMCkge1xuICAgIGUgPSAxIC0gZUJpYXM7XG4gIH0gZWxzZSBpZiAoZSA9PT0gZU1heCkge1xuICAgIHJldHVybiBtID8gTmFOIDogKChzID8gLTEgOiAxKSAqIEluZmluaXR5KTtcbiAgfSBlbHNlIHtcbiAgICBtID0gbSArIE1hdGgucG93KDIsIG1MZW4pO1xuICAgIGUgPSBlIC0gZUJpYXM7XG4gIH1cbiAgcmV0dXJuIChzID8gLTEgOiAxKSAqIG0gKiBNYXRoLnBvdygyLCBlIC0gbUxlbik7XG59O1xuXG5leHBvcnRzLndyaXRlID0gZnVuY3Rpb24oYnVmZmVyLCB2YWx1ZSwgb2Zmc2V0LCBpc0xFLCBtTGVuLCBuQnl0ZXMpIHtcbiAgdmFyIGUsIG0sIGMsXG4gICAgICBlTGVuID0gbkJ5dGVzICogOCAtIG1MZW4gLSAxLFxuICAgICAgZU1heCA9ICgxIDw8IGVMZW4pIC0gMSxcbiAgICAgIGVCaWFzID0gZU1heCA+PiAxLFxuICAgICAgcnQgPSAobUxlbiA9PT0gMjMgPyBNYXRoLnBvdygyLCAtMjQpIC0gTWF0aC5wb3coMiwgLTc3KSA6IDApLFxuICAgICAgaSA9IGlzTEUgPyAwIDogKG5CeXRlcyAtIDEpLFxuICAgICAgZCA9IGlzTEUgPyAxIDogLTEsXG4gICAgICBzID0gdmFsdWUgPCAwIHx8ICh2YWx1ZSA9PT0gMCAmJiAxIC8gdmFsdWUgPCAwKSA/IDEgOiAwO1xuXG4gIHZhbHVlID0gTWF0aC5hYnModmFsdWUpO1xuXG4gIGlmIChpc05hTih2YWx1ZSkgfHwgdmFsdWUgPT09IEluZmluaXR5KSB7XG4gICAgbSA9IGlzTmFOKHZhbHVlKSA/IDEgOiAwO1xuICAgIGUgPSBlTWF4O1xuICB9IGVsc2Uge1xuICAgIGUgPSBNYXRoLmZsb29yKE1hdGgubG9nKHZhbHVlKSAvIE1hdGguTE4yKTtcbiAgICBpZiAodmFsdWUgKiAoYyA9IE1hdGgucG93KDIsIC1lKSkgPCAxKSB7XG4gICAgICBlLS07XG4gICAgICBjICo9IDI7XG4gICAgfVxuICAgIGlmIChlICsgZUJpYXMgPj0gMSkge1xuICAgICAgdmFsdWUgKz0gcnQgLyBjO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YWx1ZSArPSBydCAqIE1hdGgucG93KDIsIDEgLSBlQmlhcyk7XG4gICAgfVxuICAgIGlmICh2YWx1ZSAqIGMgPj0gMikge1xuICAgICAgZSsrO1xuICAgICAgYyAvPSAyO1xuICAgIH1cblxuICAgIGlmIChlICsgZUJpYXMgPj0gZU1heCkge1xuICAgICAgbSA9IDA7XG4gICAgICBlID0gZU1heDtcbiAgICB9IGVsc2UgaWYgKGUgKyBlQmlhcyA+PSAxKSB7XG4gICAgICBtID0gKHZhbHVlICogYyAtIDEpICogTWF0aC5wb3coMiwgbUxlbik7XG4gICAgICBlID0gZSArIGVCaWFzO1xuICAgIH0gZWxzZSB7XG4gICAgICBtID0gdmFsdWUgKiBNYXRoLnBvdygyLCBlQmlhcyAtIDEpICogTWF0aC5wb3coMiwgbUxlbik7XG4gICAgICBlID0gMDtcbiAgICB9XG4gIH1cblxuICBmb3IgKDsgbUxlbiA+PSA4OyBidWZmZXJbb2Zmc2V0ICsgaV0gPSBtICYgMHhmZiwgaSArPSBkLCBtIC89IDI1NiwgbUxlbiAtPSA4KTtcblxuICBlID0gKGUgPDwgbUxlbikgfCBtO1xuICBlTGVuICs9IG1MZW47XG4gIGZvciAoOyBlTGVuID4gMDsgYnVmZmVyW29mZnNldCArIGldID0gZSAmIDB4ZmYsIGkgKz0gZCwgZSAvPSAyNTYsIGVMZW4gLT0gOCk7XG5cbiAgYnVmZmVyW29mZnNldCArIGkgLSBkXSB8PSBzICogMTI4O1xufTtcbiIsIlxuLyoqXG4gKiBpc0FycmF5XG4gKi9cblxudmFyIGlzQXJyYXkgPSBBcnJheS5pc0FycmF5O1xuXG4vKipcbiAqIHRvU3RyaW5nXG4gKi9cblxudmFyIHN0ciA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG5cbi8qKlxuICogV2hldGhlciBvciBub3QgdGhlIGdpdmVuIGB2YWxgXG4gKiBpcyBhbiBhcnJheS5cbiAqXG4gKiBleGFtcGxlOlxuICpcbiAqICAgICAgICBpc0FycmF5KFtdKTtcbiAqICAgICAgICAvLyA+IHRydWVcbiAqICAgICAgICBpc0FycmF5KGFyZ3VtZW50cyk7XG4gKiAgICAgICAgLy8gPiBmYWxzZVxuICogICAgICAgIGlzQXJyYXkoJycpO1xuICogICAgICAgIC8vID4gZmFsc2VcbiAqXG4gKiBAcGFyYW0ge21peGVkfSB2YWxcbiAqIEByZXR1cm4ge2Jvb2x9XG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBpc0FycmF5IHx8IGZ1bmN0aW9uICh2YWwpIHtcbiAgcmV0dXJuICEhIHZhbCAmJiAnW29iamVjdCBBcnJheV0nID09IHN0ci5jYWxsKHZhbCk7XG59O1xuIiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbmZ1bmN0aW9uIEV2ZW50RW1pdHRlcigpIHtcbiAgdGhpcy5fZXZlbnRzID0gdGhpcy5fZXZlbnRzIHx8IHt9O1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSB0aGlzLl9tYXhMaXN0ZW5lcnMgfHwgdW5kZWZpbmVkO1xufVxubW9kdWxlLmV4cG9ydHMgPSBFdmVudEVtaXR0ZXI7XG5cbi8vIEJhY2t3YXJkcy1jb21wYXQgd2l0aCBub2RlIDAuMTAueFxuRXZlbnRFbWl0dGVyLkV2ZW50RW1pdHRlciA9IEV2ZW50RW1pdHRlcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fZXZlbnRzID0gdW5kZWZpbmVkO1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fbWF4TGlzdGVuZXJzID0gdW5kZWZpbmVkO1xuXG4vLyBCeSBkZWZhdWx0IEV2ZW50RW1pdHRlcnMgd2lsbCBwcmludCBhIHdhcm5pbmcgaWYgbW9yZSB0aGFuIDEwIGxpc3RlbmVycyBhcmVcbi8vIGFkZGVkIHRvIGl0LiBUaGlzIGlzIGEgdXNlZnVsIGRlZmF1bHQgd2hpY2ggaGVscHMgZmluZGluZyBtZW1vcnkgbGVha3MuXG5FdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycyA9IDEwO1xuXG4vLyBPYnZpb3VzbHkgbm90IGFsbCBFbWl0dGVycyBzaG91bGQgYmUgbGltaXRlZCB0byAxMC4gVGhpcyBmdW5jdGlvbiBhbGxvd3Ncbi8vIHRoYXQgdG8gYmUgaW5jcmVhc2VkLiBTZXQgdG8gemVybyBmb3IgdW5saW1pdGVkLlxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5zZXRNYXhMaXN0ZW5lcnMgPSBmdW5jdGlvbihuKSB7XG4gIGlmICghaXNOdW1iZXIobikgfHwgbiA8IDAgfHwgaXNOYU4obikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCduIG11c3QgYmUgYSBwb3NpdGl2ZSBudW1iZXInKTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gbjtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBlciwgaGFuZGxlciwgbGVuLCBhcmdzLCBpLCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gSWYgdGhlcmUgaXMgbm8gJ2Vycm9yJyBldmVudCBsaXN0ZW5lciB0aGVuIHRocm93LlxuICBpZiAodHlwZSA9PT0gJ2Vycm9yJykge1xuICAgIGlmICghdGhpcy5fZXZlbnRzLmVycm9yIHx8XG4gICAgICAgIChpc09iamVjdCh0aGlzLl9ldmVudHMuZXJyb3IpICYmICF0aGlzLl9ldmVudHMuZXJyb3IubGVuZ3RoKSkge1xuICAgICAgZXIgPSBhcmd1bWVudHNbMV07XG4gICAgICBpZiAoZXIgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgICB0aHJvdyBlcjsgLy8gVW5oYW5kbGVkICdlcnJvcicgZXZlbnRcbiAgICAgIH1cbiAgICAgIHRocm93IFR5cGVFcnJvcignVW5jYXVnaHQsIHVuc3BlY2lmaWVkIFwiZXJyb3JcIiBldmVudC4nKTtcbiAgICB9XG4gIH1cblxuICBoYW5kbGVyID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIGlmIChpc1VuZGVmaW5lZChoYW5kbGVyKSlcbiAgICByZXR1cm4gZmFsc2U7XG5cbiAgaWYgKGlzRnVuY3Rpb24oaGFuZGxlcikpIHtcbiAgICBzd2l0Y2ggKGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIC8vIGZhc3QgY2FzZXNcbiAgICAgIGNhc2UgMTpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAzOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdLCBhcmd1bWVudHNbMl0pO1xuICAgICAgICBicmVhaztcbiAgICAgIC8vIHNsb3dlclxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICAgICAgYXJncyA9IG5ldyBBcnJheShsZW4gLSAxKTtcbiAgICAgICAgZm9yIChpID0gMTsgaSA8IGxlbjsgaSsrKVxuICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICBoYW5kbGVyLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH1cbiAgfSBlbHNlIGlmIChpc09iamVjdChoYW5kbGVyKSkge1xuICAgIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgYXJncyA9IG5ldyBBcnJheShsZW4gLSAxKTtcbiAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcblxuICAgIGxpc3RlbmVycyA9IGhhbmRsZXIuc2xpY2UoKTtcbiAgICBsZW4gPSBsaXN0ZW5lcnMubGVuZ3RoO1xuICAgIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKylcbiAgICAgIGxpc3RlbmVyc1tpXS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBtO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBUbyBhdm9pZCByZWN1cnNpb24gaW4gdGhlIGNhc2UgdGhhdCB0eXBlID09PSBcIm5ld0xpc3RlbmVyXCIhIEJlZm9yZVxuICAvLyBhZGRpbmcgaXQgdG8gdGhlIGxpc3RlbmVycywgZmlyc3QgZW1pdCBcIm5ld0xpc3RlbmVyXCIuXG4gIGlmICh0aGlzLl9ldmVudHMubmV3TGlzdGVuZXIpXG4gICAgdGhpcy5lbWl0KCduZXdMaXN0ZW5lcicsIHR5cGUsXG4gICAgICAgICAgICAgIGlzRnVuY3Rpb24obGlzdGVuZXIubGlzdGVuZXIpID9cbiAgICAgICAgICAgICAgbGlzdGVuZXIubGlzdGVuZXIgOiBsaXN0ZW5lcik7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgLy8gT3B0aW1pemUgdGhlIGNhc2Ugb2Ygb25lIGxpc3RlbmVyLiBEb24ndCBuZWVkIHRoZSBleHRyYSBhcnJheSBvYmplY3QuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gbGlzdGVuZXI7XG4gIGVsc2UgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgLy8gSWYgd2UndmUgYWxyZWFkeSBnb3QgYW4gYXJyYXksIGp1c3QgYXBwZW5kLlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5wdXNoKGxpc3RlbmVyKTtcbiAgZWxzZVxuICAgIC8vIEFkZGluZyB0aGUgc2Vjb25kIGVsZW1lbnQsIG5lZWQgdG8gY2hhbmdlIHRvIGFycmF5LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IFt0aGlzLl9ldmVudHNbdHlwZV0sIGxpc3RlbmVyXTtcblxuICAvLyBDaGVjayBmb3IgbGlzdGVuZXIgbGVha1xuICBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSAmJiAhdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCkge1xuICAgIHZhciBtO1xuICAgIGlmICghaXNVbmRlZmluZWQodGhpcy5fbWF4TGlzdGVuZXJzKSkge1xuICAgICAgbSA9IHRoaXMuX21heExpc3RlbmVycztcbiAgICB9IGVsc2Uge1xuICAgICAgbSA9IEV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzO1xuICAgIH1cblxuICAgIGlmIChtICYmIG0gPiAwICYmIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGggPiBtKSB7XG4gICAgICB0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkID0gdHJ1ZTtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJyhub2RlKSB3YXJuaW5nOiBwb3NzaWJsZSBFdmVudEVtaXR0ZXIgbWVtb3J5ICcgK1xuICAgICAgICAgICAgICAgICAgICAnbGVhayBkZXRlY3RlZC4gJWQgbGlzdGVuZXJzIGFkZGVkLiAnICtcbiAgICAgICAgICAgICAgICAgICAgJ1VzZSBlbWl0dGVyLnNldE1heExpc3RlbmVycygpIHRvIGluY3JlYXNlIGxpbWl0LicsXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGgpO1xuICAgICAgaWYgKHR5cGVvZiBjb25zb2xlLnRyYWNlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIC8vIG5vdCBzdXBwb3J0ZWQgaW4gSUUgMTBcbiAgICAgICAgY29uc29sZS50cmFjZSgpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbiA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub25jZSA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICB2YXIgZmlyZWQgPSBmYWxzZTtcblxuICBmdW5jdGlvbiBnKCkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgZyk7XG5cbiAgICBpZiAoIWZpcmVkKSB7XG4gICAgICBmaXJlZCA9IHRydWU7XG4gICAgICBsaXN0ZW5lci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgfVxuXG4gIGcubGlzdGVuZXIgPSBsaXN0ZW5lcjtcbiAgdGhpcy5vbih0eXBlLCBnKTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8vIGVtaXRzIGEgJ3JlbW92ZUxpc3RlbmVyJyBldmVudCBpZmYgdGhlIGxpc3RlbmVyIHdhcyByZW1vdmVkXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIGxpc3QsIHBvc2l0aW9uLCBsZW5ndGgsIGk7XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgbGlzdCA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgbGVuZ3RoID0gbGlzdC5sZW5ndGg7XG4gIHBvc2l0aW9uID0gLTE7XG5cbiAgaWYgKGxpc3QgPT09IGxpc3RlbmVyIHx8XG4gICAgICAoaXNGdW5jdGlvbihsaXN0Lmxpc3RlbmVyKSAmJiBsaXN0Lmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcbiAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuXG4gIH0gZWxzZSBpZiAoaXNPYmplY3QobGlzdCkpIHtcbiAgICBmb3IgKGkgPSBsZW5ndGg7IGktLSA+IDA7KSB7XG4gICAgICBpZiAobGlzdFtpXSA9PT0gbGlzdGVuZXIgfHxcbiAgICAgICAgICAobGlzdFtpXS5saXN0ZW5lciAmJiBsaXN0W2ldLmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcbiAgICAgICAgcG9zaXRpb24gPSBpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAocG9zaXRpb24gPCAwKVxuICAgICAgcmV0dXJuIHRoaXM7XG5cbiAgICBpZiAobGlzdC5sZW5ndGggPT09IDEpIHtcbiAgICAgIGxpc3QubGVuZ3RoID0gMDtcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgfSBlbHNlIHtcbiAgICAgIGxpc3Quc3BsaWNlKHBvc2l0aW9uLCAxKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBrZXksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICByZXR1cm4gdGhpcztcblxuICAvLyBub3QgbGlzdGVuaW5nIGZvciByZW1vdmVMaXN0ZW5lciwgbm8gbmVlZCB0byBlbWl0XG4gIGlmICghdGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApXG4gICAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICBlbHNlIGlmICh0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLy8gZW1pdCByZW1vdmVMaXN0ZW5lciBmb3IgYWxsIGxpc3RlbmVycyBvbiBhbGwgZXZlbnRzXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgZm9yIChrZXkgaW4gdGhpcy5fZXZlbnRzKSB7XG4gICAgICBpZiAoa2V5ID09PSAncmVtb3ZlTGlzdGVuZXInKSBjb250aW51ZTtcbiAgICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKGtleSk7XG4gICAgfVxuICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKCdyZW1vdmVMaXN0ZW5lcicpO1xuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgbGlzdGVuZXJzID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGxpc3RlbmVycykpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVycyk7XG4gIH0gZWxzZSB7XG4gICAgLy8gTElGTyBvcmRlclxuICAgIHdoaWxlIChsaXN0ZW5lcnMubGVuZ3RoKVxuICAgICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnNbbGlzdGVuZXJzLmxlbmd0aCAtIDFdKTtcbiAgfVxuICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciByZXQ7XG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0ID0gW107XG4gIGVsc2UgaWYgKGlzRnVuY3Rpb24odGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSBbdGhpcy5fZXZlbnRzW3R5cGVdXTtcbiAgZWxzZVxuICAgIHJldCA9IHRoaXMuX2V2ZW50c1t0eXBlXS5zbGljZSgpO1xuICByZXR1cm4gcmV0O1xufTtcblxuRXZlbnRFbWl0dGVyLmxpc3RlbmVyQ291bnQgPSBmdW5jdGlvbihlbWl0dGVyLCB0eXBlKSB7XG4gIHZhciByZXQ7XG4gIGlmICghZW1pdHRlci5fZXZlbnRzIHx8ICFlbWl0dGVyLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0ID0gMDtcbiAgZWxzZSBpZiAoaXNGdW5jdGlvbihlbWl0dGVyLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IDE7XG4gIGVsc2VcbiAgICByZXQgPSBlbWl0dGVyLl9ldmVudHNbdHlwZV0ubGVuZ3RoO1xuICByZXR1cm4gcmV0O1xufTtcblxuZnVuY3Rpb24gaXNGdW5jdGlvbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdmdW5jdGlvbic7XG59XG5cbmZ1bmN0aW9uIGlzTnVtYmVyKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ251bWJlcic7XG59XG5cbmZ1bmN0aW9uIGlzT2JqZWN0KGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ29iamVjdCcgJiYgYXJnICE9PSBudWxsO1xufVxuXG5mdW5jdGlvbiBpc1VuZGVmaW5lZChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gdm9pZCAwO1xufVxuIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG5cbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxucHJvY2Vzcy5uZXh0VGljayA9IChmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGNhblNldEltbWVkaWF0ZSA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnNldEltbWVkaWF0ZTtcbiAgICB2YXIgY2FuTXV0YXRpb25PYnNlcnZlciA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93Lk11dGF0aW9uT2JzZXJ2ZXI7XG4gICAgdmFyIGNhblBvc3QgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5wb3N0TWVzc2FnZSAmJiB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lclxuICAgIDtcblxuICAgIGlmIChjYW5TZXRJbW1lZGlhdGUpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChmKSB7IHJldHVybiB3aW5kb3cuc2V0SW1tZWRpYXRlKGYpIH07XG4gICAgfVxuXG4gICAgdmFyIHF1ZXVlID0gW107XG5cbiAgICBpZiAoY2FuTXV0YXRpb25PYnNlcnZlcikge1xuICAgICAgICB2YXIgaGlkZGVuRGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgICAgICAgdmFyIG9ic2VydmVyID0gbmV3IE11dGF0aW9uT2JzZXJ2ZXIoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIHF1ZXVlTGlzdCA9IHF1ZXVlLnNsaWNlKCk7XG4gICAgICAgICAgICBxdWV1ZS5sZW5ndGggPSAwO1xuICAgICAgICAgICAgcXVldWVMaXN0LmZvckVhY2goZnVuY3Rpb24gKGZuKSB7XG4gICAgICAgICAgICAgICAgZm4oKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICBvYnNlcnZlci5vYnNlcnZlKGhpZGRlbkRpdiwgeyBhdHRyaWJ1dGVzOiB0cnVlIH0pO1xuXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICAgICAgaWYgKCFxdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBoaWRkZW5EaXYuc2V0QXR0cmlidXRlKCd5ZXMnLCAnbm8nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHF1ZXVlLnB1c2goZm4pO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIGlmIChjYW5Qb3N0KSB7XG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgZnVuY3Rpb24gKGV2KSB7XG4gICAgICAgICAgICB2YXIgc291cmNlID0gZXYuc291cmNlO1xuICAgICAgICAgICAgaWYgKChzb3VyY2UgPT09IHdpbmRvdyB8fCBzb3VyY2UgPT09IG51bGwpICYmIGV2LmRhdGEgPT09ICdwcm9jZXNzLXRpY2snKSB7XG4gICAgICAgICAgICAgICAgZXYuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgICAgaWYgKHF1ZXVlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZuID0gcXVldWUuc2hpZnQoKTtcbiAgICAgICAgICAgICAgICAgICAgZm4oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIHRydWUpO1xuXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICAgICAgcXVldWUucHVzaChmbik7XG4gICAgICAgICAgICB3aW5kb3cucG9zdE1lc3NhZ2UoJ3Byb2Nlc3MtdGljaycsICcqJyk7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZm4sIDApO1xuICAgIH07XG59KSgpO1xuXG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5cbi8vIFRPRE8oc2h0eWxtYW4pXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbiIsInZhciBoYXNPd24gPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5O1xudmFyIHRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcbnZhciB1bmRlZmluZWQ7XG5cbnZhciBpc1BsYWluT2JqZWN0ID0gZnVuY3Rpb24gaXNQbGFpbk9iamVjdChvYmopIHtcblx0J3VzZSBzdHJpY3QnO1xuXHRpZiAoIW9iaiB8fCB0b1N0cmluZy5jYWxsKG9iaikgIT09ICdbb2JqZWN0IE9iamVjdF0nKSB7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cblx0dmFyIGhhc19vd25fY29uc3RydWN0b3IgPSBoYXNPd24uY2FsbChvYmosICdjb25zdHJ1Y3RvcicpO1xuXHR2YXIgaGFzX2lzX3Byb3BlcnR5X29mX21ldGhvZCA9IG9iai5jb25zdHJ1Y3RvciAmJiBvYmouY29uc3RydWN0b3IucHJvdG90eXBlICYmIGhhc093bi5jYWxsKG9iai5jb25zdHJ1Y3Rvci5wcm90b3R5cGUsICdpc1Byb3RvdHlwZU9mJyk7XG5cdC8vIE5vdCBvd24gY29uc3RydWN0b3IgcHJvcGVydHkgbXVzdCBiZSBPYmplY3Rcblx0aWYgKG9iai5jb25zdHJ1Y3RvciAmJiAhaGFzX293bl9jb25zdHJ1Y3RvciAmJiAhaGFzX2lzX3Byb3BlcnR5X29mX21ldGhvZCkge1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXG5cdC8vIE93biBwcm9wZXJ0aWVzIGFyZSBlbnVtZXJhdGVkIGZpcnN0bHksIHNvIHRvIHNwZWVkIHVwLFxuXHQvLyBpZiBsYXN0IG9uZSBpcyBvd24sIHRoZW4gYWxsIHByb3BlcnRpZXMgYXJlIG93bi5cblx0dmFyIGtleTtcblx0Zm9yIChrZXkgaW4gb2JqKSB7fVxuXG5cdHJldHVybiBrZXkgPT09IHVuZGVmaW5lZCB8fCBoYXNPd24uY2FsbChvYmosIGtleSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGV4dGVuZCgpIHtcblx0J3VzZSBzdHJpY3QnO1xuXHR2YXIgb3B0aW9ucywgbmFtZSwgc3JjLCBjb3B5LCBjb3B5SXNBcnJheSwgY2xvbmUsXG5cdFx0dGFyZ2V0ID0gYXJndW1lbnRzWzBdLFxuXHRcdGkgPSAxLFxuXHRcdGxlbmd0aCA9IGFyZ3VtZW50cy5sZW5ndGgsXG5cdFx0ZGVlcCA9IGZhbHNlO1xuXG5cdC8vIEhhbmRsZSBhIGRlZXAgY29weSBzaXR1YXRpb25cblx0aWYgKHR5cGVvZiB0YXJnZXQgPT09ICdib29sZWFuJykge1xuXHRcdGRlZXAgPSB0YXJnZXQ7XG5cdFx0dGFyZ2V0ID0gYXJndW1lbnRzWzFdIHx8IHt9O1xuXHRcdC8vIHNraXAgdGhlIGJvb2xlYW4gYW5kIHRoZSB0YXJnZXRcblx0XHRpID0gMjtcblx0fSBlbHNlIGlmICgodHlwZW9mIHRhcmdldCAhPT0gJ29iamVjdCcgJiYgdHlwZW9mIHRhcmdldCAhPT0gJ2Z1bmN0aW9uJykgfHwgdGFyZ2V0ID09IG51bGwpIHtcblx0XHR0YXJnZXQgPSB7fTtcblx0fVxuXG5cdGZvciAoOyBpIDwgbGVuZ3RoOyArK2kpIHtcblx0XHRvcHRpb25zID0gYXJndW1lbnRzW2ldO1xuXHRcdC8vIE9ubHkgZGVhbCB3aXRoIG5vbi1udWxsL3VuZGVmaW5lZCB2YWx1ZXNcblx0XHRpZiAob3B0aW9ucyAhPSBudWxsKSB7XG5cdFx0XHQvLyBFeHRlbmQgdGhlIGJhc2Ugb2JqZWN0XG5cdFx0XHRmb3IgKG5hbWUgaW4gb3B0aW9ucykge1xuXHRcdFx0XHRzcmMgPSB0YXJnZXRbbmFtZV07XG5cdFx0XHRcdGNvcHkgPSBvcHRpb25zW25hbWVdO1xuXG5cdFx0XHRcdC8vIFByZXZlbnQgbmV2ZXItZW5kaW5nIGxvb3Bcblx0XHRcdFx0aWYgKHRhcmdldCA9PT0gY29weSkge1xuXHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gUmVjdXJzZSBpZiB3ZSdyZSBtZXJnaW5nIHBsYWluIG9iamVjdHMgb3IgYXJyYXlzXG5cdFx0XHRcdGlmIChkZWVwICYmIGNvcHkgJiYgKGlzUGxhaW5PYmplY3QoY29weSkgfHwgKGNvcHlJc0FycmF5ID0gQXJyYXkuaXNBcnJheShjb3B5KSkpKSB7XG5cdFx0XHRcdFx0aWYgKGNvcHlJc0FycmF5KSB7XG5cdFx0XHRcdFx0XHRjb3B5SXNBcnJheSA9IGZhbHNlO1xuXHRcdFx0XHRcdFx0Y2xvbmUgPSBzcmMgJiYgQXJyYXkuaXNBcnJheShzcmMpID8gc3JjIDogW107XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdGNsb25lID0gc3JjICYmIGlzUGxhaW5PYmplY3Qoc3JjKSA/IHNyYyA6IHt9O1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdC8vIE5ldmVyIG1vdmUgb3JpZ2luYWwgb2JqZWN0cywgY2xvbmUgdGhlbVxuXHRcdFx0XHRcdHRhcmdldFtuYW1lXSA9IGV4dGVuZChkZWVwLCBjbG9uZSwgY29weSk7XG5cblx0XHRcdFx0Ly8gRG9uJ3QgYnJpbmcgaW4gdW5kZWZpbmVkIHZhbHVlc1xuXHRcdFx0XHR9IGVsc2UgaWYgKGNvcHkgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRcdHRhcmdldFtuYW1lXSA9IGNvcHk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHQvLyBSZXR1cm4gdGhlIG1vZGlmaWVkIG9iamVjdFxuXHRyZXR1cm4gdGFyZ2V0O1xufTtcblxuIiwibW9kdWxlLmV4cG9ydHMgPSBpbmhlcml0c1xuXG5mdW5jdGlvbiBpbmhlcml0cyAoYywgcCwgcHJvdG8pIHtcbiAgcHJvdG8gPSBwcm90byB8fCB7fVxuICB2YXIgZSA9IHt9XG4gIDtbYy5wcm90b3R5cGUsIHByb3RvXS5mb3JFYWNoKGZ1bmN0aW9uIChzKSB7XG4gICAgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMocykuZm9yRWFjaChmdW5jdGlvbiAoaykge1xuICAgICAgZVtrXSA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IocywgaylcbiAgICB9KVxuICB9KVxuICBjLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUocC5wcm90b3R5cGUsIGUpXG4gIGMuc3VwZXIgPSBwXG59XG5cbi8vZnVuY3Rpb24gQ2hpbGQgKCkge1xuLy8gIENoaWxkLnN1cGVyLmNhbGwodGhpcylcbi8vICBjb25zb2xlLmVycm9yKFt0aGlzXG4vLyAgICAgICAgICAgICAgICAsdGhpcy5jb25zdHJ1Y3RvclxuLy8gICAgICAgICAgICAgICAgLHRoaXMuY29uc3RydWN0b3IgPT09IENoaWxkXG4vLyAgICAgICAgICAgICAgICAsdGhpcy5jb25zdHJ1Y3Rvci5zdXBlciA9PT0gUGFyZW50XG4vLyAgICAgICAgICAgICAgICAsT2JqZWN0LmdldFByb3RvdHlwZU9mKHRoaXMpID09PSBDaGlsZC5wcm90b3R5cGVcbi8vICAgICAgICAgICAgICAgICxPYmplY3QuZ2V0UHJvdG90eXBlT2YoT2JqZWN0LmdldFByb3RvdHlwZU9mKHRoaXMpKVxuLy8gICAgICAgICAgICAgICAgID09PSBQYXJlbnQucHJvdG90eXBlXG4vLyAgICAgICAgICAgICAgICAsdGhpcyBpbnN0YW5jZW9mIENoaWxkXG4vLyAgICAgICAgICAgICAgICAsdGhpcyBpbnN0YW5jZW9mIFBhcmVudF0pXG4vL31cbi8vZnVuY3Rpb24gUGFyZW50ICgpIHt9XG4vL2luaGVyaXRzKENoaWxkLCBQYXJlbnQpXG4vL25ldyBDaGlsZFxuIiwiKGZ1bmN0aW9uIChnbG9iYWwpe1xuLy8hIG1vbWVudC5qc1xuLy8hIHZlcnNpb24gOiAyLjguNFxuLy8hIGF1dGhvcnMgOiBUaW0gV29vZCwgSXNrcmVuIENoZXJuZXYsIE1vbWVudC5qcyBjb250cmlidXRvcnNcbi8vISBsaWNlbnNlIDogTUlUXG4vLyEgbW9tZW50anMuY29tXG5cbihmdW5jdGlvbiAodW5kZWZpbmVkKSB7XG4gICAgLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICAgICAgICBDb25zdGFudHNcbiAgICAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbiAgICB2YXIgbW9tZW50LFxuICAgICAgICBWRVJTSU9OID0gJzIuOC40JyxcbiAgICAgICAgLy8gdGhlIGdsb2JhbC1zY29wZSB0aGlzIGlzIE5PVCB0aGUgZ2xvYmFsIG9iamVjdCBpbiBOb2RlLmpzXG4gICAgICAgIGdsb2JhbFNjb3BlID0gdHlwZW9mIGdsb2JhbCAhPT0gJ3VuZGVmaW5lZCcgPyBnbG9iYWwgOiB0aGlzLFxuICAgICAgICBvbGRHbG9iYWxNb21lbnQsXG4gICAgICAgIHJvdW5kID0gTWF0aC5yb3VuZCxcbiAgICAgICAgaGFzT3duUHJvcGVydHkgPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LFxuICAgICAgICBpLFxuXG4gICAgICAgIFlFQVIgPSAwLFxuICAgICAgICBNT05USCA9IDEsXG4gICAgICAgIERBVEUgPSAyLFxuICAgICAgICBIT1VSID0gMyxcbiAgICAgICAgTUlOVVRFID0gNCxcbiAgICAgICAgU0VDT05EID0gNSxcbiAgICAgICAgTUlMTElTRUNPTkQgPSA2LFxuXG4gICAgICAgIC8vIGludGVybmFsIHN0b3JhZ2UgZm9yIGxvY2FsZSBjb25maWcgZmlsZXNcbiAgICAgICAgbG9jYWxlcyA9IHt9LFxuXG4gICAgICAgIC8vIGV4dHJhIG1vbWVudCBpbnRlcm5hbCBwcm9wZXJ0aWVzIChwbHVnaW5zIHJlZ2lzdGVyIHByb3BzIGhlcmUpXG4gICAgICAgIG1vbWVudFByb3BlcnRpZXMgPSBbXSxcblxuICAgICAgICAvLyBjaGVjayBmb3Igbm9kZUpTXG4gICAgICAgIGhhc01vZHVsZSA9ICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGUgJiYgbW9kdWxlLmV4cG9ydHMpLFxuXG4gICAgICAgIC8vIEFTUC5ORVQganNvbiBkYXRlIGZvcm1hdCByZWdleFxuICAgICAgICBhc3BOZXRKc29uUmVnZXggPSAvXlxcLz9EYXRlXFwoKFxcLT9cXGQrKS9pLFxuICAgICAgICBhc3BOZXRUaW1lU3Bhbkpzb25SZWdleCA9IC8oXFwtKT8oPzooXFxkKilcXC4pPyhcXGQrKVxcOihcXGQrKSg/OlxcOihcXGQrKVxcLj8oXFxkezN9KT8pPy8sXG5cbiAgICAgICAgLy8gZnJvbSBodHRwOi8vZG9jcy5jbG9zdXJlLWxpYnJhcnkuZ29vZ2xlY29kZS5jb20vZ2l0L2Nsb3N1cmVfZ29vZ19kYXRlX2RhdGUuanMuc291cmNlLmh0bWxcbiAgICAgICAgLy8gc29tZXdoYXQgbW9yZSBpbiBsaW5lIHdpdGggNC40LjMuMiAyMDA0IHNwZWMsIGJ1dCBhbGxvd3MgZGVjaW1hbCBhbnl3aGVyZVxuICAgICAgICBpc29EdXJhdGlvblJlZ2V4ID0gL14oLSk/UCg/Oig/OihbMC05LC5dKilZKT8oPzooWzAtOSwuXSopTSk/KD86KFswLTksLl0qKUQpPyg/OlQoPzooWzAtOSwuXSopSCk/KD86KFswLTksLl0qKU0pPyg/OihbMC05LC5dKilTKT8pP3woWzAtOSwuXSopVykkLyxcblxuICAgICAgICAvLyBmb3JtYXQgdG9rZW5zXG4gICAgICAgIGZvcm1hdHRpbmdUb2tlbnMgPSAvKFxcW1teXFxbXSpcXF0pfChcXFxcKT8oTW98TU0/TT9NP3xEb3xERERvfEREP0Q/RD98ZGRkP2Q/fGRvP3x3W298d10/fFdbb3xXXT98UXxZWVlZWVl8WVlZWVl8WVlZWXxZWXxnZyhnZ2c/KT98R0coR0dHPyk/fGV8RXxhfEF8aGg/fEhIP3xtbT98c3M/fFN7MSw0fXx4fFh8eno/fFpaP3wuKS9nLFxuICAgICAgICBsb2NhbEZvcm1hdHRpbmdUb2tlbnMgPSAvKFxcW1teXFxbXSpcXF0pfChcXFxcKT8oTFRTfExUfExMP0w/TD98bHsxLDR9KS9nLFxuXG4gICAgICAgIC8vIHBhcnNpbmcgdG9rZW4gcmVnZXhlc1xuICAgICAgICBwYXJzZVRva2VuT25lT3JUd29EaWdpdHMgPSAvXFxkXFxkPy8sIC8vIDAgLSA5OVxuICAgICAgICBwYXJzZVRva2VuT25lVG9UaHJlZURpZ2l0cyA9IC9cXGR7MSwzfS8sIC8vIDAgLSA5OTlcbiAgICAgICAgcGFyc2VUb2tlbk9uZVRvRm91ckRpZ2l0cyA9IC9cXGR7MSw0fS8sIC8vIDAgLSA5OTk5XG4gICAgICAgIHBhcnNlVG9rZW5PbmVUb1NpeERpZ2l0cyA9IC9bK1xcLV0/XFxkezEsNn0vLCAvLyAtOTk5LDk5OSAtIDk5OSw5OTlcbiAgICAgICAgcGFyc2VUb2tlbkRpZ2l0cyA9IC9cXGQrLywgLy8gbm9uemVybyBudW1iZXIgb2YgZGlnaXRzXG4gICAgICAgIHBhcnNlVG9rZW5Xb3JkID0gL1swLTldKlsnYS16XFx1MDBBMC1cXHUwNUZGXFx1MDcwMC1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkVGXSt8W1xcdTA2MDAtXFx1MDZGRlxcL10rKFxccyo/W1xcdTA2MDAtXFx1MDZGRl0rKXsxLDJ9L2ksIC8vIGFueSB3b3JkIChvciB0d28pIGNoYXJhY3RlcnMgb3IgbnVtYmVycyBpbmNsdWRpbmcgdHdvL3RocmVlIHdvcmQgbW9udGggaW4gYXJhYmljLlxuICAgICAgICBwYXJzZVRva2VuVGltZXpvbmUgPSAvWnxbXFwrXFwtXVxcZFxcZDo/XFxkXFxkL2dpLCAvLyArMDA6MDAgLTAwOjAwICswMDAwIC0wMDAwIG9yIFpcbiAgICAgICAgcGFyc2VUb2tlblQgPSAvVC9pLCAvLyBUIChJU08gc2VwYXJhdG9yKVxuICAgICAgICBwYXJzZVRva2VuT2Zmc2V0TXMgPSAvW1xcK1xcLV0/XFxkKy8sIC8vIDEyMzQ1Njc4OTAxMjNcbiAgICAgICAgcGFyc2VUb2tlblRpbWVzdGFtcE1zID0gL1tcXCtcXC1dP1xcZCsoXFwuXFxkezEsM30pPy8sIC8vIDEyMzQ1Njc4OSAxMjM0NTY3ODkuMTIzXG5cbiAgICAgICAgLy9zdHJpY3QgcGFyc2luZyByZWdleGVzXG4gICAgICAgIHBhcnNlVG9rZW5PbmVEaWdpdCA9IC9cXGQvLCAvLyAwIC0gOVxuICAgICAgICBwYXJzZVRva2VuVHdvRGlnaXRzID0gL1xcZFxcZC8sIC8vIDAwIC0gOTlcbiAgICAgICAgcGFyc2VUb2tlblRocmVlRGlnaXRzID0gL1xcZHszfS8sIC8vIDAwMCAtIDk5OVxuICAgICAgICBwYXJzZVRva2VuRm91ckRpZ2l0cyA9IC9cXGR7NH0vLCAvLyAwMDAwIC0gOTk5OVxuICAgICAgICBwYXJzZVRva2VuU2l4RGlnaXRzID0gL1srLV0/XFxkezZ9LywgLy8gLTk5OSw5OTkgLSA5OTksOTk5XG4gICAgICAgIHBhcnNlVG9rZW5TaWduZWROdW1iZXIgPSAvWystXT9cXGQrLywgLy8gLWluZiAtIGluZlxuXG4gICAgICAgIC8vIGlzbyA4NjAxIHJlZ2V4XG4gICAgICAgIC8vIDAwMDAtMDAtMDAgMDAwMC1XMDAgb3IgMDAwMC1XMDAtMCArIFQgKyAwMCBvciAwMDowMCBvciAwMDowMDowMCBvciAwMDowMDowMC4wMDAgKyArMDA6MDAgb3IgKzAwMDAgb3IgKzAwKVxuICAgICAgICBpc29SZWdleCA9IC9eXFxzKig/OlsrLV1cXGR7Nn18XFxkezR9KS0oPzooXFxkXFxkLVxcZFxcZCl8KFdcXGRcXGQkKXwoV1xcZFxcZC1cXGQpfChcXGRcXGRcXGQpKSgoVHwgKShcXGRcXGQoOlxcZFxcZCg6XFxkXFxkKFxcLlxcZCspPyk/KT8pPyhbXFwrXFwtXVxcZFxcZCg/Ojo/XFxkXFxkKT98XFxzKlopPyk/JC8sXG5cbiAgICAgICAgaXNvRm9ybWF0ID0gJ1lZWVktTU0tRERUSEg6bW06c3NaJyxcblxuICAgICAgICBpc29EYXRlcyA9IFtcbiAgICAgICAgICAgIFsnWVlZWVlZLU1NLUREJywgL1srLV1cXGR7Nn0tXFxkezJ9LVxcZHsyfS9dLFxuICAgICAgICAgICAgWydZWVlZLU1NLUREJywgL1xcZHs0fS1cXGR7Mn0tXFxkezJ9L10sXG4gICAgICAgICAgICBbJ0dHR0ctW1ddV1ctRScsIC9cXGR7NH0tV1xcZHsyfS1cXGQvXSxcbiAgICAgICAgICAgIFsnR0dHRy1bV11XVycsIC9cXGR7NH0tV1xcZHsyfS9dLFxuICAgICAgICAgICAgWydZWVlZLURERCcsIC9cXGR7NH0tXFxkezN9L11cbiAgICAgICAgXSxcblxuICAgICAgICAvLyBpc28gdGltZSBmb3JtYXRzIGFuZCByZWdleGVzXG4gICAgICAgIGlzb1RpbWVzID0gW1xuICAgICAgICAgICAgWydISDptbTpzcy5TU1NTJywgLyhUfCApXFxkXFxkOlxcZFxcZDpcXGRcXGRcXC5cXGQrL10sXG4gICAgICAgICAgICBbJ0hIOm1tOnNzJywgLyhUfCApXFxkXFxkOlxcZFxcZDpcXGRcXGQvXSxcbiAgICAgICAgICAgIFsnSEg6bW0nLCAvKFR8IClcXGRcXGQ6XFxkXFxkL10sXG4gICAgICAgICAgICBbJ0hIJywgLyhUfCApXFxkXFxkL11cbiAgICAgICAgXSxcblxuICAgICAgICAvLyB0aW1lem9uZSBjaHVua2VyICcrMTA6MDAnID4gWycxMCcsICcwMCddIG9yICctMTUzMCcgPiBbJy0xNScsICczMCddXG4gICAgICAgIHBhcnNlVGltZXpvbmVDaHVua2VyID0gLyhbXFwrXFwtXXxcXGRcXGQpL2dpLFxuXG4gICAgICAgIC8vIGdldHRlciBhbmQgc2V0dGVyIG5hbWVzXG4gICAgICAgIHByb3h5R2V0dGVyc0FuZFNldHRlcnMgPSAnRGF0ZXxIb3Vyc3xNaW51dGVzfFNlY29uZHN8TWlsbGlzZWNvbmRzJy5zcGxpdCgnfCcpLFxuICAgICAgICB1bml0TWlsbGlzZWNvbmRGYWN0b3JzID0ge1xuICAgICAgICAgICAgJ01pbGxpc2Vjb25kcycgOiAxLFxuICAgICAgICAgICAgJ1NlY29uZHMnIDogMWUzLFxuICAgICAgICAgICAgJ01pbnV0ZXMnIDogNmU0LFxuICAgICAgICAgICAgJ0hvdXJzJyA6IDM2ZTUsXG4gICAgICAgICAgICAnRGF5cycgOiA4NjRlNSxcbiAgICAgICAgICAgICdNb250aHMnIDogMjU5MmU2LFxuICAgICAgICAgICAgJ1llYXJzJyA6IDMxNTM2ZTZcbiAgICAgICAgfSxcblxuICAgICAgICB1bml0QWxpYXNlcyA9IHtcbiAgICAgICAgICAgIG1zIDogJ21pbGxpc2Vjb25kJyxcbiAgICAgICAgICAgIHMgOiAnc2Vjb25kJyxcbiAgICAgICAgICAgIG0gOiAnbWludXRlJyxcbiAgICAgICAgICAgIGggOiAnaG91cicsXG4gICAgICAgICAgICBkIDogJ2RheScsXG4gICAgICAgICAgICBEIDogJ2RhdGUnLFxuICAgICAgICAgICAgdyA6ICd3ZWVrJyxcbiAgICAgICAgICAgIFcgOiAnaXNvV2VlaycsXG4gICAgICAgICAgICBNIDogJ21vbnRoJyxcbiAgICAgICAgICAgIFEgOiAncXVhcnRlcicsXG4gICAgICAgICAgICB5IDogJ3llYXInLFxuICAgICAgICAgICAgREREIDogJ2RheU9mWWVhcicsXG4gICAgICAgICAgICBlIDogJ3dlZWtkYXknLFxuICAgICAgICAgICAgRSA6ICdpc29XZWVrZGF5JyxcbiAgICAgICAgICAgIGdnOiAnd2Vla1llYXInLFxuICAgICAgICAgICAgR0c6ICdpc29XZWVrWWVhcidcbiAgICAgICAgfSxcblxuICAgICAgICBjYW1lbEZ1bmN0aW9ucyA9IHtcbiAgICAgICAgICAgIGRheW9meWVhciA6ICdkYXlPZlllYXInLFxuICAgICAgICAgICAgaXNvd2Vla2RheSA6ICdpc29XZWVrZGF5JyxcbiAgICAgICAgICAgIGlzb3dlZWsgOiAnaXNvV2VlaycsXG4gICAgICAgICAgICB3ZWVreWVhciA6ICd3ZWVrWWVhcicsXG4gICAgICAgICAgICBpc293ZWVreWVhciA6ICdpc29XZWVrWWVhcidcbiAgICAgICAgfSxcblxuICAgICAgICAvLyBmb3JtYXQgZnVuY3Rpb24gc3RyaW5nc1xuICAgICAgICBmb3JtYXRGdW5jdGlvbnMgPSB7fSxcblxuICAgICAgICAvLyBkZWZhdWx0IHJlbGF0aXZlIHRpbWUgdGhyZXNob2xkc1xuICAgICAgICByZWxhdGl2ZVRpbWVUaHJlc2hvbGRzID0ge1xuICAgICAgICAgICAgczogNDUsICAvLyBzZWNvbmRzIHRvIG1pbnV0ZVxuICAgICAgICAgICAgbTogNDUsICAvLyBtaW51dGVzIHRvIGhvdXJcbiAgICAgICAgICAgIGg6IDIyLCAgLy8gaG91cnMgdG8gZGF5XG4gICAgICAgICAgICBkOiAyNiwgIC8vIGRheXMgdG8gbW9udGhcbiAgICAgICAgICAgIE06IDExICAgLy8gbW9udGhzIHRvIHllYXJcbiAgICAgICAgfSxcblxuICAgICAgICAvLyB0b2tlbnMgdG8gb3JkaW5hbGl6ZSBhbmQgcGFkXG4gICAgICAgIG9yZGluYWxpemVUb2tlbnMgPSAnREREIHcgVyBNIEQgZCcuc3BsaXQoJyAnKSxcbiAgICAgICAgcGFkZGVkVG9rZW5zID0gJ00gRCBIIGggbSBzIHcgVycuc3BsaXQoJyAnKSxcblxuICAgICAgICBmb3JtYXRUb2tlbkZ1bmN0aW9ucyA9IHtcbiAgICAgICAgICAgIE0gICAgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMubW9udGgoKSArIDE7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgTU1NICA6IGZ1bmN0aW9uIChmb3JtYXQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5sb2NhbGVEYXRhKCkubW9udGhzU2hvcnQodGhpcywgZm9ybWF0KTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBNTU1NIDogZnVuY3Rpb24gKGZvcm1hdCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmxvY2FsZURhdGEoKS5tb250aHModGhpcywgZm9ybWF0KTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBEICAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmRhdGUoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBEREQgIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmRheU9mWWVhcigpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGQgICAgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZGF5KCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZGQgICA6IGZ1bmN0aW9uIChmb3JtYXQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5sb2NhbGVEYXRhKCkud2Vla2RheXNNaW4odGhpcywgZm9ybWF0KTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBkZGQgIDogZnVuY3Rpb24gKGZvcm1hdCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmxvY2FsZURhdGEoKS53ZWVrZGF5c1Nob3J0KHRoaXMsIGZvcm1hdCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZGRkZCA6IGZ1bmN0aW9uIChmb3JtYXQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5sb2NhbGVEYXRhKCkud2Vla2RheXModGhpcywgZm9ybWF0KTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB3ICAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLndlZWsoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBXICAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmlzb1dlZWsoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBZWSAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBsZWZ0WmVyb0ZpbGwodGhpcy55ZWFyKCkgJSAxMDAsIDIpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFlZWVkgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxlZnRaZXJvRmlsbCh0aGlzLnllYXIoKSwgNCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgWVlZWVkgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxlZnRaZXJvRmlsbCh0aGlzLnllYXIoKSwgNSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgWVlZWVlZIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHZhciB5ID0gdGhpcy55ZWFyKCksIHNpZ24gPSB5ID49IDAgPyAnKycgOiAnLSc7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHNpZ24gKyBsZWZ0WmVyb0ZpbGwoTWF0aC5hYnMoeSksIDYpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdnICAgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxlZnRaZXJvRmlsbCh0aGlzLndlZWtZZWFyKCkgJSAxMDAsIDIpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdnZ2cgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxlZnRaZXJvRmlsbCh0aGlzLndlZWtZZWFyKCksIDQpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdnZ2dnIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBsZWZ0WmVyb0ZpbGwodGhpcy53ZWVrWWVhcigpLCA1KTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBHRyAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBsZWZ0WmVyb0ZpbGwodGhpcy5pc29XZWVrWWVhcigpICUgMTAwLCAyKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBHR0dHIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBsZWZ0WmVyb0ZpbGwodGhpcy5pc29XZWVrWWVhcigpLCA0KTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBHR0dHRyA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbGVmdFplcm9GaWxsKHRoaXMuaXNvV2Vla1llYXIoKSwgNSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZSA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy53ZWVrZGF5KCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgRSA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5pc29XZWVrZGF5KCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYSAgICA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5sb2NhbGVEYXRhKCkubWVyaWRpZW0odGhpcy5ob3VycygpLCB0aGlzLm1pbnV0ZXMoKSwgdHJ1ZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgQSAgICA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5sb2NhbGVEYXRhKCkubWVyaWRpZW0odGhpcy5ob3VycygpLCB0aGlzLm1pbnV0ZXMoKSwgZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIEggICAgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuaG91cnMoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBoICAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmhvdXJzKCkgJSAxMiB8fCAxMjtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBtICAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLm1pbnV0ZXMoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzICAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnNlY29uZHMoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBTICAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0b0ludCh0aGlzLm1pbGxpc2Vjb25kcygpIC8gMTAwKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBTUyAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBsZWZ0WmVyb0ZpbGwodG9JbnQodGhpcy5taWxsaXNlY29uZHMoKSAvIDEwKSwgMik7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgU1NTICA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbGVmdFplcm9GaWxsKHRoaXMubWlsbGlzZWNvbmRzKCksIDMpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFNTU1MgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxlZnRaZXJvRmlsbCh0aGlzLm1pbGxpc2Vjb25kcygpLCAzKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBaICAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHZhciBhID0gLXRoaXMuem9uZSgpLFxuICAgICAgICAgICAgICAgICAgICBiID0gJysnO1xuICAgICAgICAgICAgICAgIGlmIChhIDwgMCkge1xuICAgICAgICAgICAgICAgICAgICBhID0gLWE7XG4gICAgICAgICAgICAgICAgICAgIGIgPSAnLSc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBiICsgbGVmdFplcm9GaWxsKHRvSW50KGEgLyA2MCksIDIpICsgJzonICsgbGVmdFplcm9GaWxsKHRvSW50KGEpICUgNjAsIDIpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFpaICAgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdmFyIGEgPSAtdGhpcy56b25lKCksXG4gICAgICAgICAgICAgICAgICAgIGIgPSAnKyc7XG4gICAgICAgICAgICAgICAgaWYgKGEgPCAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGEgPSAtYTtcbiAgICAgICAgICAgICAgICAgICAgYiA9ICctJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGIgKyBsZWZ0WmVyb0ZpbGwodG9JbnQoYSAvIDYwKSwgMikgKyBsZWZ0WmVyb0ZpbGwodG9JbnQoYSkgJSA2MCwgMik7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgeiA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy56b25lQWJicigpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHp6IDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnpvbmVOYW1lKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgeCAgICA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy52YWx1ZU9mKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgWCAgICA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy51bml4KCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgUSA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5xdWFydGVyKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgZGVwcmVjYXRpb25zID0ge30sXG5cbiAgICAgICAgbGlzdHMgPSBbJ21vbnRocycsICdtb250aHNTaG9ydCcsICd3ZWVrZGF5cycsICd3ZWVrZGF5c1Nob3J0JywgJ3dlZWtkYXlzTWluJ107XG5cbiAgICAvLyBQaWNrIHRoZSBmaXJzdCBkZWZpbmVkIG9mIHR3byBvciB0aHJlZSBhcmd1bWVudHMuIGRmbCBjb21lcyBmcm9tXG4gICAgLy8gZGVmYXVsdC5cbiAgICBmdW5jdGlvbiBkZmwoYSwgYiwgYykge1xuICAgICAgICBzd2l0Y2ggKGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNhc2UgMjogcmV0dXJuIGEgIT0gbnVsbCA/IGEgOiBiO1xuICAgICAgICAgICAgY2FzZSAzOiByZXR1cm4gYSAhPSBudWxsID8gYSA6IGIgIT0gbnVsbCA/IGIgOiBjO1xuICAgICAgICAgICAgZGVmYXVsdDogdGhyb3cgbmV3IEVycm9yKCdJbXBsZW1lbnQgbWUnKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGhhc093blByb3AoYSwgYikge1xuICAgICAgICByZXR1cm4gaGFzT3duUHJvcGVydHkuY2FsbChhLCBiKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkZWZhdWx0UGFyc2luZ0ZsYWdzKCkge1xuICAgICAgICAvLyBXZSBuZWVkIHRvIGRlZXAgY2xvbmUgdGhpcyBvYmplY3QsIGFuZCBlczUgc3RhbmRhcmQgaXMgbm90IHZlcnlcbiAgICAgICAgLy8gaGVscGZ1bC5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGVtcHR5IDogZmFsc2UsXG4gICAgICAgICAgICB1bnVzZWRUb2tlbnMgOiBbXSxcbiAgICAgICAgICAgIHVudXNlZElucHV0IDogW10sXG4gICAgICAgICAgICBvdmVyZmxvdyA6IC0yLFxuICAgICAgICAgICAgY2hhcnNMZWZ0T3ZlciA6IDAsXG4gICAgICAgICAgICBudWxsSW5wdXQgOiBmYWxzZSxcbiAgICAgICAgICAgIGludmFsaWRNb250aCA6IG51bGwsXG4gICAgICAgICAgICBpbnZhbGlkRm9ybWF0IDogZmFsc2UsXG4gICAgICAgICAgICB1c2VySW52YWxpZGF0ZWQgOiBmYWxzZSxcbiAgICAgICAgICAgIGlzbzogZmFsc2VcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwcmludE1zZyhtc2cpIHtcbiAgICAgICAgaWYgKG1vbWVudC5zdXBwcmVzc0RlcHJlY2F0aW9uV2FybmluZ3MgPT09IGZhbHNlICYmXG4gICAgICAgICAgICAgICAgdHlwZW9mIGNvbnNvbGUgIT09ICd1bmRlZmluZWQnICYmIGNvbnNvbGUud2Fybikge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKCdEZXByZWNhdGlvbiB3YXJuaW5nOiAnICsgbXNnKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRlcHJlY2F0ZShtc2csIGZuKSB7XG4gICAgICAgIHZhciBmaXJzdFRpbWUgPSB0cnVlO1xuICAgICAgICByZXR1cm4gZXh0ZW5kKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmIChmaXJzdFRpbWUpIHtcbiAgICAgICAgICAgICAgICBwcmludE1zZyhtc2cpO1xuICAgICAgICAgICAgICAgIGZpcnN0VGltZSA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgIH0sIGZuKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkZXByZWNhdGVTaW1wbGUobmFtZSwgbXNnKSB7XG4gICAgICAgIGlmICghZGVwcmVjYXRpb25zW25hbWVdKSB7XG4gICAgICAgICAgICBwcmludE1zZyhtc2cpO1xuICAgICAgICAgICAgZGVwcmVjYXRpb25zW25hbWVdID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhZFRva2VuKGZ1bmMsIGNvdW50KSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoYSkge1xuICAgICAgICAgICAgcmV0dXJuIGxlZnRaZXJvRmlsbChmdW5jLmNhbGwodGhpcywgYSksIGNvdW50KTtcbiAgICAgICAgfTtcbiAgICB9XG4gICAgZnVuY3Rpb24gb3JkaW5hbGl6ZVRva2VuKGZ1bmMsIHBlcmlvZCkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGEpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmxvY2FsZURhdGEoKS5vcmRpbmFsKGZ1bmMuY2FsbCh0aGlzLCBhKSwgcGVyaW9kKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICB3aGlsZSAob3JkaW5hbGl6ZVRva2Vucy5sZW5ndGgpIHtcbiAgICAgICAgaSA9IG9yZGluYWxpemVUb2tlbnMucG9wKCk7XG4gICAgICAgIGZvcm1hdFRva2VuRnVuY3Rpb25zW2kgKyAnbyddID0gb3JkaW5hbGl6ZVRva2VuKGZvcm1hdFRva2VuRnVuY3Rpb25zW2ldLCBpKTtcbiAgICB9XG4gICAgd2hpbGUgKHBhZGRlZFRva2Vucy5sZW5ndGgpIHtcbiAgICAgICAgaSA9IHBhZGRlZFRva2Vucy5wb3AoKTtcbiAgICAgICAgZm9ybWF0VG9rZW5GdW5jdGlvbnNbaSArIGldID0gcGFkVG9rZW4oZm9ybWF0VG9rZW5GdW5jdGlvbnNbaV0sIDIpO1xuICAgIH1cbiAgICBmb3JtYXRUb2tlbkZ1bmN0aW9ucy5EREREID0gcGFkVG9rZW4oZm9ybWF0VG9rZW5GdW5jdGlvbnMuRERELCAzKTtcblxuXG4gICAgLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICAgICAgICBDb25zdHJ1Y3RvcnNcbiAgICAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbiAgICBmdW5jdGlvbiBMb2NhbGUoKSB7XG4gICAgfVxuXG4gICAgLy8gTW9tZW50IHByb3RvdHlwZSBvYmplY3RcbiAgICBmdW5jdGlvbiBNb21lbnQoY29uZmlnLCBza2lwT3ZlcmZsb3cpIHtcbiAgICAgICAgaWYgKHNraXBPdmVyZmxvdyAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgIGNoZWNrT3ZlcmZsb3coY29uZmlnKTtcbiAgICAgICAgfVxuICAgICAgICBjb3B5Q29uZmlnKHRoaXMsIGNvbmZpZyk7XG4gICAgICAgIHRoaXMuX2QgPSBuZXcgRGF0ZSgrY29uZmlnLl9kKTtcbiAgICB9XG5cbiAgICAvLyBEdXJhdGlvbiBDb25zdHJ1Y3RvclxuICAgIGZ1bmN0aW9uIER1cmF0aW9uKGR1cmF0aW9uKSB7XG4gICAgICAgIHZhciBub3JtYWxpemVkSW5wdXQgPSBub3JtYWxpemVPYmplY3RVbml0cyhkdXJhdGlvbiksXG4gICAgICAgICAgICB5ZWFycyA9IG5vcm1hbGl6ZWRJbnB1dC55ZWFyIHx8IDAsXG4gICAgICAgICAgICBxdWFydGVycyA9IG5vcm1hbGl6ZWRJbnB1dC5xdWFydGVyIHx8IDAsXG4gICAgICAgICAgICBtb250aHMgPSBub3JtYWxpemVkSW5wdXQubW9udGggfHwgMCxcbiAgICAgICAgICAgIHdlZWtzID0gbm9ybWFsaXplZElucHV0LndlZWsgfHwgMCxcbiAgICAgICAgICAgIGRheXMgPSBub3JtYWxpemVkSW5wdXQuZGF5IHx8IDAsXG4gICAgICAgICAgICBob3VycyA9IG5vcm1hbGl6ZWRJbnB1dC5ob3VyIHx8IDAsXG4gICAgICAgICAgICBtaW51dGVzID0gbm9ybWFsaXplZElucHV0Lm1pbnV0ZSB8fCAwLFxuICAgICAgICAgICAgc2Vjb25kcyA9IG5vcm1hbGl6ZWRJbnB1dC5zZWNvbmQgfHwgMCxcbiAgICAgICAgICAgIG1pbGxpc2Vjb25kcyA9IG5vcm1hbGl6ZWRJbnB1dC5taWxsaXNlY29uZCB8fCAwO1xuXG4gICAgICAgIC8vIHJlcHJlc2VudGF0aW9uIGZvciBkYXRlQWRkUmVtb3ZlXG4gICAgICAgIHRoaXMuX21pbGxpc2Vjb25kcyA9ICttaWxsaXNlY29uZHMgK1xuICAgICAgICAgICAgc2Vjb25kcyAqIDFlMyArIC8vIDEwMDBcbiAgICAgICAgICAgIG1pbnV0ZXMgKiA2ZTQgKyAvLyAxMDAwICogNjBcbiAgICAgICAgICAgIGhvdXJzICogMzZlNTsgLy8gMTAwMCAqIDYwICogNjBcbiAgICAgICAgLy8gQmVjYXVzZSBvZiBkYXRlQWRkUmVtb3ZlIHRyZWF0cyAyNCBob3VycyBhcyBkaWZmZXJlbnQgZnJvbSBhXG4gICAgICAgIC8vIGRheSB3aGVuIHdvcmtpbmcgYXJvdW5kIERTVCwgd2UgbmVlZCB0byBzdG9yZSB0aGVtIHNlcGFyYXRlbHlcbiAgICAgICAgdGhpcy5fZGF5cyA9ICtkYXlzICtcbiAgICAgICAgICAgIHdlZWtzICogNztcbiAgICAgICAgLy8gSXQgaXMgaW1wb3NzaWJsZSB0cmFuc2xhdGUgbW9udGhzIGludG8gZGF5cyB3aXRob3V0IGtub3dpbmdcbiAgICAgICAgLy8gd2hpY2ggbW9udGhzIHlvdSBhcmUgYXJlIHRhbGtpbmcgYWJvdXQsIHNvIHdlIGhhdmUgdG8gc3RvcmVcbiAgICAgICAgLy8gaXQgc2VwYXJhdGVseS5cbiAgICAgICAgdGhpcy5fbW9udGhzID0gK21vbnRocyArXG4gICAgICAgICAgICBxdWFydGVycyAqIDMgK1xuICAgICAgICAgICAgeWVhcnMgKiAxMjtcblxuICAgICAgICB0aGlzLl9kYXRhID0ge307XG5cbiAgICAgICAgdGhpcy5fbG9jYWxlID0gbW9tZW50LmxvY2FsZURhdGEoKTtcblxuICAgICAgICB0aGlzLl9idWJibGUoKTtcbiAgICB9XG5cbiAgICAvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gICAgICAgIEhlbHBlcnNcbiAgICAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cblxuICAgIGZ1bmN0aW9uIGV4dGVuZChhLCBiKSB7XG4gICAgICAgIGZvciAodmFyIGkgaW4gYikge1xuICAgICAgICAgICAgaWYgKGhhc093blByb3AoYiwgaSkpIHtcbiAgICAgICAgICAgICAgICBhW2ldID0gYltpXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChoYXNPd25Qcm9wKGIsICd0b1N0cmluZycpKSB7XG4gICAgICAgICAgICBhLnRvU3RyaW5nID0gYi50b1N0cmluZztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChoYXNPd25Qcm9wKGIsICd2YWx1ZU9mJykpIHtcbiAgICAgICAgICAgIGEudmFsdWVPZiA9IGIudmFsdWVPZjtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBhO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNvcHlDb25maWcodG8sIGZyb20pIHtcbiAgICAgICAgdmFyIGksIHByb3AsIHZhbDtcblxuICAgICAgICBpZiAodHlwZW9mIGZyb20uX2lzQU1vbWVudE9iamVjdCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHRvLl9pc0FNb21lbnRPYmplY3QgPSBmcm9tLl9pc0FNb21lbnRPYmplY3Q7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGVvZiBmcm9tLl9pICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgdG8uX2kgPSBmcm9tLl9pO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlb2YgZnJvbS5fZiAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHRvLl9mID0gZnJvbS5fZjtcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIGZyb20uX2wgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICB0by5fbCA9IGZyb20uX2w7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGVvZiBmcm9tLl9zdHJpY3QgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICB0by5fc3RyaWN0ID0gZnJvbS5fc3RyaWN0O1xuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlb2YgZnJvbS5fdHptICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgdG8uX3R6bSA9IGZyb20uX3R6bTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIGZyb20uX2lzVVRDICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgdG8uX2lzVVRDID0gZnJvbS5faXNVVEM7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGVvZiBmcm9tLl9vZmZzZXQgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICB0by5fb2Zmc2V0ID0gZnJvbS5fb2Zmc2V0O1xuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlb2YgZnJvbS5fcGYgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICB0by5fcGYgPSBmcm9tLl9wZjtcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIGZyb20uX2xvY2FsZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHRvLl9sb2NhbGUgPSBmcm9tLl9sb2NhbGU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobW9tZW50UHJvcGVydGllcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBmb3IgKGkgaW4gbW9tZW50UHJvcGVydGllcykge1xuICAgICAgICAgICAgICAgIHByb3AgPSBtb21lbnRQcm9wZXJ0aWVzW2ldO1xuICAgICAgICAgICAgICAgIHZhbCA9IGZyb21bcHJvcF07XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiB2YWwgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgIHRvW3Byb3BdID0gdmFsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0bztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBhYnNSb3VuZChudW1iZXIpIHtcbiAgICAgICAgaWYgKG51bWJlciA8IDApIHtcbiAgICAgICAgICAgIHJldHVybiBNYXRoLmNlaWwobnVtYmVyKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBNYXRoLmZsb29yKG51bWJlcik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBsZWZ0IHplcm8gZmlsbCBhIG51bWJlclxuICAgIC8vIHNlZSBodHRwOi8vanNwZXJmLmNvbS9sZWZ0LXplcm8tZmlsbGluZyBmb3IgcGVyZm9ybWFuY2UgY29tcGFyaXNvblxuICAgIGZ1bmN0aW9uIGxlZnRaZXJvRmlsbChudW1iZXIsIHRhcmdldExlbmd0aCwgZm9yY2VTaWduKSB7XG4gICAgICAgIHZhciBvdXRwdXQgPSAnJyArIE1hdGguYWJzKG51bWJlciksXG4gICAgICAgICAgICBzaWduID0gbnVtYmVyID49IDA7XG5cbiAgICAgICAgd2hpbGUgKG91dHB1dC5sZW5ndGggPCB0YXJnZXRMZW5ndGgpIHtcbiAgICAgICAgICAgIG91dHB1dCA9ICcwJyArIG91dHB1dDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gKHNpZ24gPyAoZm9yY2VTaWduID8gJysnIDogJycpIDogJy0nKSArIG91dHB1dDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwb3NpdGl2ZU1vbWVudHNEaWZmZXJlbmNlKGJhc2UsIG90aGVyKSB7XG4gICAgICAgIHZhciByZXMgPSB7bWlsbGlzZWNvbmRzOiAwLCBtb250aHM6IDB9O1xuXG4gICAgICAgIHJlcy5tb250aHMgPSBvdGhlci5tb250aCgpIC0gYmFzZS5tb250aCgpICtcbiAgICAgICAgICAgIChvdGhlci55ZWFyKCkgLSBiYXNlLnllYXIoKSkgKiAxMjtcbiAgICAgICAgaWYgKGJhc2UuY2xvbmUoKS5hZGQocmVzLm1vbnRocywgJ00nKS5pc0FmdGVyKG90aGVyKSkge1xuICAgICAgICAgICAgLS1yZXMubW9udGhzO1xuICAgICAgICB9XG5cbiAgICAgICAgcmVzLm1pbGxpc2Vjb25kcyA9ICtvdGhlciAtICsoYmFzZS5jbG9uZSgpLmFkZChyZXMubW9udGhzLCAnTScpKTtcblxuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG1vbWVudHNEaWZmZXJlbmNlKGJhc2UsIG90aGVyKSB7XG4gICAgICAgIHZhciByZXM7XG4gICAgICAgIG90aGVyID0gbWFrZUFzKG90aGVyLCBiYXNlKTtcbiAgICAgICAgaWYgKGJhc2UuaXNCZWZvcmUob3RoZXIpKSB7XG4gICAgICAgICAgICByZXMgPSBwb3NpdGl2ZU1vbWVudHNEaWZmZXJlbmNlKGJhc2UsIG90aGVyKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlcyA9IHBvc2l0aXZlTW9tZW50c0RpZmZlcmVuY2Uob3RoZXIsIGJhc2UpO1xuICAgICAgICAgICAgcmVzLm1pbGxpc2Vjb25kcyA9IC1yZXMubWlsbGlzZWNvbmRzO1xuICAgICAgICAgICAgcmVzLm1vbnRocyA9IC1yZXMubW9udGhzO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICB9XG5cbiAgICAvLyBUT0RPOiByZW1vdmUgJ25hbWUnIGFyZyBhZnRlciBkZXByZWNhdGlvbiBpcyByZW1vdmVkXG4gICAgZnVuY3Rpb24gY3JlYXRlQWRkZXIoZGlyZWN0aW9uLCBuYW1lKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAodmFsLCBwZXJpb2QpIHtcbiAgICAgICAgICAgIHZhciBkdXIsIHRtcDtcbiAgICAgICAgICAgIC8vaW52ZXJ0IHRoZSBhcmd1bWVudHMsIGJ1dCBjb21wbGFpbiBhYm91dCBpdFxuICAgICAgICAgICAgaWYgKHBlcmlvZCAhPT0gbnVsbCAmJiAhaXNOYU4oK3BlcmlvZCkpIHtcbiAgICAgICAgICAgICAgICBkZXByZWNhdGVTaW1wbGUobmFtZSwgJ21vbWVudCgpLicgKyBuYW1lICArICcocGVyaW9kLCBudW1iZXIpIGlzIGRlcHJlY2F0ZWQuIFBsZWFzZSB1c2UgbW9tZW50KCkuJyArIG5hbWUgKyAnKG51bWJlciwgcGVyaW9kKS4nKTtcbiAgICAgICAgICAgICAgICB0bXAgPSB2YWw7IHZhbCA9IHBlcmlvZDsgcGVyaW9kID0gdG1wO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YWwgPSB0eXBlb2YgdmFsID09PSAnc3RyaW5nJyA/ICt2YWwgOiB2YWw7XG4gICAgICAgICAgICBkdXIgPSBtb21lbnQuZHVyYXRpb24odmFsLCBwZXJpb2QpO1xuICAgICAgICAgICAgYWRkT3JTdWJ0cmFjdER1cmF0aW9uRnJvbU1vbWVudCh0aGlzLCBkdXIsIGRpcmVjdGlvbik7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBhZGRPclN1YnRyYWN0RHVyYXRpb25Gcm9tTW9tZW50KG1vbSwgZHVyYXRpb24sIGlzQWRkaW5nLCB1cGRhdGVPZmZzZXQpIHtcbiAgICAgICAgdmFyIG1pbGxpc2Vjb25kcyA9IGR1cmF0aW9uLl9taWxsaXNlY29uZHMsXG4gICAgICAgICAgICBkYXlzID0gZHVyYXRpb24uX2RheXMsXG4gICAgICAgICAgICBtb250aHMgPSBkdXJhdGlvbi5fbW9udGhzO1xuICAgICAgICB1cGRhdGVPZmZzZXQgPSB1cGRhdGVPZmZzZXQgPT0gbnVsbCA/IHRydWUgOiB1cGRhdGVPZmZzZXQ7XG5cbiAgICAgICAgaWYgKG1pbGxpc2Vjb25kcykge1xuICAgICAgICAgICAgbW9tLl9kLnNldFRpbWUoK21vbS5fZCArIG1pbGxpc2Vjb25kcyAqIGlzQWRkaW5nKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGF5cykge1xuICAgICAgICAgICAgcmF3U2V0dGVyKG1vbSwgJ0RhdGUnLCByYXdHZXR0ZXIobW9tLCAnRGF0ZScpICsgZGF5cyAqIGlzQWRkaW5nKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobW9udGhzKSB7XG4gICAgICAgICAgICByYXdNb250aFNldHRlcihtb20sIHJhd0dldHRlcihtb20sICdNb250aCcpICsgbW9udGhzICogaXNBZGRpbmcpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh1cGRhdGVPZmZzZXQpIHtcbiAgICAgICAgICAgIG1vbWVudC51cGRhdGVPZmZzZXQobW9tLCBkYXlzIHx8IG1vbnRocyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBjaGVjayBpZiBpcyBhbiBhcnJheVxuICAgIGZ1bmN0aW9uIGlzQXJyYXkoaW5wdXQpIHtcbiAgICAgICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChpbnB1dCkgPT09ICdbb2JqZWN0IEFycmF5XSc7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaXNEYXRlKGlucHV0KSB7XG4gICAgICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoaW5wdXQpID09PSAnW29iamVjdCBEYXRlXScgfHxcbiAgICAgICAgICAgIGlucHV0IGluc3RhbmNlb2YgRGF0ZTtcbiAgICB9XG5cbiAgICAvLyBjb21wYXJlIHR3byBhcnJheXMsIHJldHVybiB0aGUgbnVtYmVyIG9mIGRpZmZlcmVuY2VzXG4gICAgZnVuY3Rpb24gY29tcGFyZUFycmF5cyhhcnJheTEsIGFycmF5MiwgZG9udENvbnZlcnQpIHtcbiAgICAgICAgdmFyIGxlbiA9IE1hdGgubWluKGFycmF5MS5sZW5ndGgsIGFycmF5Mi5sZW5ndGgpLFxuICAgICAgICAgICAgbGVuZ3RoRGlmZiA9IE1hdGguYWJzKGFycmF5MS5sZW5ndGggLSBhcnJheTIubGVuZ3RoKSxcbiAgICAgICAgICAgIGRpZmZzID0gMCxcbiAgICAgICAgICAgIGk7XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgaWYgKChkb250Q29udmVydCAmJiBhcnJheTFbaV0gIT09IGFycmF5MltpXSkgfHxcbiAgICAgICAgICAgICAgICAoIWRvbnRDb252ZXJ0ICYmIHRvSW50KGFycmF5MVtpXSkgIT09IHRvSW50KGFycmF5MltpXSkpKSB7XG4gICAgICAgICAgICAgICAgZGlmZnMrKztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZGlmZnMgKyBsZW5ndGhEaWZmO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG5vcm1hbGl6ZVVuaXRzKHVuaXRzKSB7XG4gICAgICAgIGlmICh1bml0cykge1xuICAgICAgICAgICAgdmFyIGxvd2VyZWQgPSB1bml0cy50b0xvd2VyQ2FzZSgpLnJlcGxhY2UoLyguKXMkLywgJyQxJyk7XG4gICAgICAgICAgICB1bml0cyA9IHVuaXRBbGlhc2VzW3VuaXRzXSB8fCBjYW1lbEZ1bmN0aW9uc1tsb3dlcmVkXSB8fCBsb3dlcmVkO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB1bml0cztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBub3JtYWxpemVPYmplY3RVbml0cyhpbnB1dE9iamVjdCkge1xuICAgICAgICB2YXIgbm9ybWFsaXplZElucHV0ID0ge30sXG4gICAgICAgICAgICBub3JtYWxpemVkUHJvcCxcbiAgICAgICAgICAgIHByb3A7XG5cbiAgICAgICAgZm9yIChwcm9wIGluIGlucHV0T2JqZWN0KSB7XG4gICAgICAgICAgICBpZiAoaGFzT3duUHJvcChpbnB1dE9iamVjdCwgcHJvcCkpIHtcbiAgICAgICAgICAgICAgICBub3JtYWxpemVkUHJvcCA9IG5vcm1hbGl6ZVVuaXRzKHByb3ApO1xuICAgICAgICAgICAgICAgIGlmIChub3JtYWxpemVkUHJvcCkge1xuICAgICAgICAgICAgICAgICAgICBub3JtYWxpemVkSW5wdXRbbm9ybWFsaXplZFByb3BdID0gaW5wdXRPYmplY3RbcHJvcF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG5vcm1hbGl6ZWRJbnB1dDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBtYWtlTGlzdChmaWVsZCkge1xuICAgICAgICB2YXIgY291bnQsIHNldHRlcjtcblxuICAgICAgICBpZiAoZmllbGQuaW5kZXhPZignd2VlaycpID09PSAwKSB7XG4gICAgICAgICAgICBjb3VudCA9IDc7XG4gICAgICAgICAgICBzZXR0ZXIgPSAnZGF5JztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChmaWVsZC5pbmRleE9mKCdtb250aCcpID09PSAwKSB7XG4gICAgICAgICAgICBjb3VudCA9IDEyO1xuICAgICAgICAgICAgc2V0dGVyID0gJ21vbnRoJztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIG1vbWVudFtmaWVsZF0gPSBmdW5jdGlvbiAoZm9ybWF0LCBpbmRleCkge1xuICAgICAgICAgICAgdmFyIGksIGdldHRlcixcbiAgICAgICAgICAgICAgICBtZXRob2QgPSBtb21lbnQuX2xvY2FsZVtmaWVsZF0sXG4gICAgICAgICAgICAgICAgcmVzdWx0cyA9IFtdO1xuXG4gICAgICAgICAgICBpZiAodHlwZW9mIGZvcm1hdCA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgICAgICAgICBpbmRleCA9IGZvcm1hdDtcbiAgICAgICAgICAgICAgICBmb3JtYXQgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGdldHRlciA9IGZ1bmN0aW9uIChpKSB7XG4gICAgICAgICAgICAgICAgdmFyIG0gPSBtb21lbnQoKS51dGMoKS5zZXQoc2V0dGVyLCBpKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gbWV0aG9kLmNhbGwobW9tZW50Ll9sb2NhbGUsIG0sIGZvcm1hdCB8fCAnJyk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBpZiAoaW5kZXggIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBnZXR0ZXIoaW5kZXgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IGNvdW50OyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0cy5wdXNoKGdldHRlcihpKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHRzO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHRvSW50KGFyZ3VtZW50Rm9yQ29lcmNpb24pIHtcbiAgICAgICAgdmFyIGNvZXJjZWROdW1iZXIgPSArYXJndW1lbnRGb3JDb2VyY2lvbixcbiAgICAgICAgICAgIHZhbHVlID0gMDtcblxuICAgICAgICBpZiAoY29lcmNlZE51bWJlciAhPT0gMCAmJiBpc0Zpbml0ZShjb2VyY2VkTnVtYmVyKSkge1xuICAgICAgICAgICAgaWYgKGNvZXJjZWROdW1iZXIgPj0gMCkge1xuICAgICAgICAgICAgICAgIHZhbHVlID0gTWF0aC5mbG9vcihjb2VyY2VkTnVtYmVyKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFsdWUgPSBNYXRoLmNlaWwoY29lcmNlZE51bWJlcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZGF5c0luTW9udGgoeWVhciwgbW9udGgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBEYXRlKERhdGUuVVRDKHllYXIsIG1vbnRoICsgMSwgMCkpLmdldFVUQ0RhdGUoKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB3ZWVrc0luWWVhcih5ZWFyLCBkb3csIGRveSkge1xuICAgICAgICByZXR1cm4gd2Vla09mWWVhcihtb21lbnQoW3llYXIsIDExLCAzMSArIGRvdyAtIGRveV0pLCBkb3csIGRveSkud2VlaztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkYXlzSW5ZZWFyKHllYXIpIHtcbiAgICAgICAgcmV0dXJuIGlzTGVhcFllYXIoeWVhcikgPyAzNjYgOiAzNjU7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaXNMZWFwWWVhcih5ZWFyKSB7XG4gICAgICAgIHJldHVybiAoeWVhciAlIDQgPT09IDAgJiYgeWVhciAlIDEwMCAhPT0gMCkgfHwgeWVhciAlIDQwMCA9PT0gMDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjaGVja092ZXJmbG93KG0pIHtcbiAgICAgICAgdmFyIG92ZXJmbG93O1xuICAgICAgICBpZiAobS5fYSAmJiBtLl9wZi5vdmVyZmxvdyA9PT0gLTIpIHtcbiAgICAgICAgICAgIG92ZXJmbG93ID1cbiAgICAgICAgICAgICAgICBtLl9hW01PTlRIXSA8IDAgfHwgbS5fYVtNT05USF0gPiAxMSA/IE1PTlRIIDpcbiAgICAgICAgICAgICAgICBtLl9hW0RBVEVdIDwgMSB8fCBtLl9hW0RBVEVdID4gZGF5c0luTW9udGgobS5fYVtZRUFSXSwgbS5fYVtNT05USF0pID8gREFURSA6XG4gICAgICAgICAgICAgICAgbS5fYVtIT1VSXSA8IDAgfHwgbS5fYVtIT1VSXSA+IDI0IHx8XG4gICAgICAgICAgICAgICAgICAgIChtLl9hW0hPVVJdID09PSAyNCAmJiAobS5fYVtNSU5VVEVdICE9PSAwIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbS5fYVtTRUNPTkRdICE9PSAwIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbS5fYVtNSUxMSVNFQ09ORF0gIT09IDApKSA/IEhPVVIgOlxuICAgICAgICAgICAgICAgIG0uX2FbTUlOVVRFXSA8IDAgfHwgbS5fYVtNSU5VVEVdID4gNTkgPyBNSU5VVEUgOlxuICAgICAgICAgICAgICAgIG0uX2FbU0VDT05EXSA8IDAgfHwgbS5fYVtTRUNPTkRdID4gNTkgPyBTRUNPTkQgOlxuICAgICAgICAgICAgICAgIG0uX2FbTUlMTElTRUNPTkRdIDwgMCB8fCBtLl9hW01JTExJU0VDT05EXSA+IDk5OSA/IE1JTExJU0VDT05EIDpcbiAgICAgICAgICAgICAgICAtMTtcblxuICAgICAgICAgICAgaWYgKG0uX3BmLl9vdmVyZmxvd0RheU9mWWVhciAmJiAob3ZlcmZsb3cgPCBZRUFSIHx8IG92ZXJmbG93ID4gREFURSkpIHtcbiAgICAgICAgICAgICAgICBvdmVyZmxvdyA9IERBVEU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIG0uX3BmLm92ZXJmbG93ID0gb3ZlcmZsb3c7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpc1ZhbGlkKG0pIHtcbiAgICAgICAgaWYgKG0uX2lzVmFsaWQgPT0gbnVsbCkge1xuICAgICAgICAgICAgbS5faXNWYWxpZCA9ICFpc05hTihtLl9kLmdldFRpbWUoKSkgJiZcbiAgICAgICAgICAgICAgICBtLl9wZi5vdmVyZmxvdyA8IDAgJiZcbiAgICAgICAgICAgICAgICAhbS5fcGYuZW1wdHkgJiZcbiAgICAgICAgICAgICAgICAhbS5fcGYuaW52YWxpZE1vbnRoICYmXG4gICAgICAgICAgICAgICAgIW0uX3BmLm51bGxJbnB1dCAmJlxuICAgICAgICAgICAgICAgICFtLl9wZi5pbnZhbGlkRm9ybWF0ICYmXG4gICAgICAgICAgICAgICAgIW0uX3BmLnVzZXJJbnZhbGlkYXRlZDtcblxuICAgICAgICAgICAgaWYgKG0uX3N0cmljdCkge1xuICAgICAgICAgICAgICAgIG0uX2lzVmFsaWQgPSBtLl9pc1ZhbGlkICYmXG4gICAgICAgICAgICAgICAgICAgIG0uX3BmLmNoYXJzTGVmdE92ZXIgPT09IDAgJiZcbiAgICAgICAgICAgICAgICAgICAgbS5fcGYudW51c2VkVG9rZW5zLmxlbmd0aCA9PT0gMCAmJlxuICAgICAgICAgICAgICAgICAgICBtLl9wZi5iaWdIb3VyID09PSB1bmRlZmluZWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG0uX2lzVmFsaWQ7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbm9ybWFsaXplTG9jYWxlKGtleSkge1xuICAgICAgICByZXR1cm4ga2V5ID8ga2V5LnRvTG93ZXJDYXNlKCkucmVwbGFjZSgnXycsICctJykgOiBrZXk7XG4gICAgfVxuXG4gICAgLy8gcGljayB0aGUgbG9jYWxlIGZyb20gdGhlIGFycmF5XG4gICAgLy8gdHJ5IFsnZW4tYXUnLCAnZW4tZ2InXSBhcyAnZW4tYXUnLCAnZW4tZ2InLCAnZW4nLCBhcyBpbiBtb3ZlIHRocm91Z2ggdGhlIGxpc3QgdHJ5aW5nIGVhY2hcbiAgICAvLyBzdWJzdHJpbmcgZnJvbSBtb3N0IHNwZWNpZmljIHRvIGxlYXN0LCBidXQgbW92ZSB0byB0aGUgbmV4dCBhcnJheSBpdGVtIGlmIGl0J3MgYSBtb3JlIHNwZWNpZmljIHZhcmlhbnQgdGhhbiB0aGUgY3VycmVudCByb290XG4gICAgZnVuY3Rpb24gY2hvb3NlTG9jYWxlKG5hbWVzKSB7XG4gICAgICAgIHZhciBpID0gMCwgaiwgbmV4dCwgbG9jYWxlLCBzcGxpdDtcblxuICAgICAgICB3aGlsZSAoaSA8IG5hbWVzLmxlbmd0aCkge1xuICAgICAgICAgICAgc3BsaXQgPSBub3JtYWxpemVMb2NhbGUobmFtZXNbaV0pLnNwbGl0KCctJyk7XG4gICAgICAgICAgICBqID0gc3BsaXQubGVuZ3RoO1xuICAgICAgICAgICAgbmV4dCA9IG5vcm1hbGl6ZUxvY2FsZShuYW1lc1tpICsgMV0pO1xuICAgICAgICAgICAgbmV4dCA9IG5leHQgPyBuZXh0LnNwbGl0KCctJykgOiBudWxsO1xuICAgICAgICAgICAgd2hpbGUgKGogPiAwKSB7XG4gICAgICAgICAgICAgICAgbG9jYWxlID0gbG9hZExvY2FsZShzcGxpdC5zbGljZSgwLCBqKS5qb2luKCctJykpO1xuICAgICAgICAgICAgICAgIGlmIChsb2NhbGUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxvY2FsZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKG5leHQgJiYgbmV4dC5sZW5ndGggPj0gaiAmJiBjb21wYXJlQXJyYXlzKHNwbGl0LCBuZXh0LCB0cnVlKSA+PSBqIC0gMSkge1xuICAgICAgICAgICAgICAgICAgICAvL3RoZSBuZXh0IGFycmF5IGl0ZW0gaXMgYmV0dGVyIHRoYW4gYSBzaGFsbG93ZXIgc3Vic3RyaW5nIG9mIHRoaXMgb25lXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBqLS07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpKys7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbG9hZExvY2FsZShuYW1lKSB7XG4gICAgICAgIHZhciBvbGRMb2NhbGUgPSBudWxsO1xuICAgICAgICBpZiAoIWxvY2FsZXNbbmFtZV0gJiYgaGFzTW9kdWxlKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIG9sZExvY2FsZSA9IG1vbWVudC5sb2NhbGUoKTtcbiAgICAgICAgICAgICAgICByZXF1aXJlKCcuL2xvY2FsZS8nICsgbmFtZSk7XG4gICAgICAgICAgICAgICAgLy8gYmVjYXVzZSBkZWZpbmVMb2NhbGUgY3VycmVudGx5IGFsc28gc2V0cyB0aGUgZ2xvYmFsIGxvY2FsZSwgd2Ugd2FudCB0byB1bmRvIHRoYXQgZm9yIGxhenkgbG9hZGVkIGxvY2FsZXNcbiAgICAgICAgICAgICAgICBtb21lbnQubG9jYWxlKG9sZExvY2FsZSk7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7IH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbG9jYWxlc1tuYW1lXTtcbiAgICB9XG5cbiAgICAvLyBSZXR1cm4gYSBtb21lbnQgZnJvbSBpbnB1dCwgdGhhdCBpcyBsb2NhbC91dGMvem9uZSBlcXVpdmFsZW50IHRvIG1vZGVsLlxuICAgIGZ1bmN0aW9uIG1ha2VBcyhpbnB1dCwgbW9kZWwpIHtcbiAgICAgICAgdmFyIHJlcywgZGlmZjtcbiAgICAgICAgaWYgKG1vZGVsLl9pc1VUQykge1xuICAgICAgICAgICAgcmVzID0gbW9kZWwuY2xvbmUoKTtcbiAgICAgICAgICAgIGRpZmYgPSAobW9tZW50LmlzTW9tZW50KGlucHV0KSB8fCBpc0RhdGUoaW5wdXQpID9cbiAgICAgICAgICAgICAgICAgICAgK2lucHV0IDogK21vbWVudChpbnB1dCkpIC0gKCtyZXMpO1xuICAgICAgICAgICAgLy8gVXNlIGxvdy1sZXZlbCBhcGksIGJlY2F1c2UgdGhpcyBmbiBpcyBsb3ctbGV2ZWwgYXBpLlxuICAgICAgICAgICAgcmVzLl9kLnNldFRpbWUoK3Jlcy5fZCArIGRpZmYpO1xuICAgICAgICAgICAgbW9tZW50LnVwZGF0ZU9mZnNldChyZXMsIGZhbHNlKTtcbiAgICAgICAgICAgIHJldHVybiByZXM7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gbW9tZW50KGlucHV0KS5sb2NhbCgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICAgICAgICBMb2NhbGVcbiAgICAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cblxuICAgIGV4dGVuZChMb2NhbGUucHJvdG90eXBlLCB7XG5cbiAgICAgICAgc2V0IDogZnVuY3Rpb24gKGNvbmZpZykge1xuICAgICAgICAgICAgdmFyIHByb3AsIGk7XG4gICAgICAgICAgICBmb3IgKGkgaW4gY29uZmlnKSB7XG4gICAgICAgICAgICAgICAgcHJvcCA9IGNvbmZpZ1tpXTtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHByb3AgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpc1tpXSA9IHByb3A7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpc1snXycgKyBpXSA9IHByb3A7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gTGVuaWVudCBvcmRpbmFsIHBhcnNpbmcgYWNjZXB0cyBqdXN0IGEgbnVtYmVyIGluIGFkZGl0aW9uIHRvXG4gICAgICAgICAgICAvLyBudW1iZXIgKyAocG9zc2libHkpIHN0dWZmIGNvbWluZyBmcm9tIF9vcmRpbmFsUGFyc2VMZW5pZW50LlxuICAgICAgICAgICAgdGhpcy5fb3JkaW5hbFBhcnNlTGVuaWVudCA9IG5ldyBSZWdFeHAodGhpcy5fb3JkaW5hbFBhcnNlLnNvdXJjZSArICd8JyArIC9cXGR7MSwyfS8uc291cmNlKTtcbiAgICAgICAgfSxcblxuICAgICAgICBfbW9udGhzIDogJ0phbnVhcnlfRmVicnVhcnlfTWFyY2hfQXByaWxfTWF5X0p1bmVfSnVseV9BdWd1c3RfU2VwdGVtYmVyX09jdG9iZXJfTm92ZW1iZXJfRGVjZW1iZXInLnNwbGl0KCdfJyksXG4gICAgICAgIG1vbnRocyA6IGZ1bmN0aW9uIChtKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fbW9udGhzW20ubW9udGgoKV07XG4gICAgICAgIH0sXG5cbiAgICAgICAgX21vbnRoc1Nob3J0IDogJ0phbl9GZWJfTWFyX0Fwcl9NYXlfSnVuX0p1bF9BdWdfU2VwX09jdF9Ob3ZfRGVjJy5zcGxpdCgnXycpLFxuICAgICAgICBtb250aHNTaG9ydCA6IGZ1bmN0aW9uIChtKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fbW9udGhzU2hvcnRbbS5tb250aCgpXTtcbiAgICAgICAgfSxcblxuICAgICAgICBtb250aHNQYXJzZSA6IGZ1bmN0aW9uIChtb250aE5hbWUsIGZvcm1hdCwgc3RyaWN0KSB7XG4gICAgICAgICAgICB2YXIgaSwgbW9tLCByZWdleDtcblxuICAgICAgICAgICAgaWYgKCF0aGlzLl9tb250aHNQYXJzZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuX21vbnRoc1BhcnNlID0gW107XG4gICAgICAgICAgICAgICAgdGhpcy5fbG9uZ01vbnRoc1BhcnNlID0gW107XG4gICAgICAgICAgICAgICAgdGhpcy5fc2hvcnRNb250aHNQYXJzZSA9IFtdO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgMTI7IGkrKykge1xuICAgICAgICAgICAgICAgIC8vIG1ha2UgdGhlIHJlZ2V4IGlmIHdlIGRvbid0IGhhdmUgaXQgYWxyZWFkeVxuICAgICAgICAgICAgICAgIG1vbSA9IG1vbWVudC51dGMoWzIwMDAsIGldKTtcbiAgICAgICAgICAgICAgICBpZiAoc3RyaWN0ICYmICF0aGlzLl9sb25nTW9udGhzUGFyc2VbaV0pIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fbG9uZ01vbnRoc1BhcnNlW2ldID0gbmV3IFJlZ0V4cCgnXicgKyB0aGlzLm1vbnRocyhtb20sICcnKS5yZXBsYWNlKCcuJywgJycpICsgJyQnLCAnaScpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9zaG9ydE1vbnRoc1BhcnNlW2ldID0gbmV3IFJlZ0V4cCgnXicgKyB0aGlzLm1vbnRoc1Nob3J0KG1vbSwgJycpLnJlcGxhY2UoJy4nLCAnJykgKyAnJCcsICdpJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICghc3RyaWN0ICYmICF0aGlzLl9tb250aHNQYXJzZVtpXSkge1xuICAgICAgICAgICAgICAgICAgICByZWdleCA9ICdeJyArIHRoaXMubW9udGhzKG1vbSwgJycpICsgJ3xeJyArIHRoaXMubW9udGhzU2hvcnQobW9tLCAnJyk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX21vbnRoc1BhcnNlW2ldID0gbmV3IFJlZ0V4cChyZWdleC5yZXBsYWNlKCcuJywgJycpLCAnaScpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyB0ZXN0IHRoZSByZWdleFxuICAgICAgICAgICAgICAgIGlmIChzdHJpY3QgJiYgZm9ybWF0ID09PSAnTU1NTScgJiYgdGhpcy5fbG9uZ01vbnRoc1BhcnNlW2ldLnRlc3QobW9udGhOYW1lKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gaTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHN0cmljdCAmJiBmb3JtYXQgPT09ICdNTU0nICYmIHRoaXMuX3Nob3J0TW9udGhzUGFyc2VbaV0udGVzdChtb250aE5hbWUpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoIXN0cmljdCAmJiB0aGlzLl9tb250aHNQYXJzZVtpXS50ZXN0KG1vbnRoTmFtZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIF93ZWVrZGF5cyA6ICdTdW5kYXlfTW9uZGF5X1R1ZXNkYXlfV2VkbmVzZGF5X1RodXJzZGF5X0ZyaWRheV9TYXR1cmRheScuc3BsaXQoJ18nKSxcbiAgICAgICAgd2Vla2RheXMgOiBmdW5jdGlvbiAobSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3dlZWtkYXlzW20uZGF5KCldO1xuICAgICAgICB9LFxuXG4gICAgICAgIF93ZWVrZGF5c1Nob3J0IDogJ1N1bl9Nb25fVHVlX1dlZF9UaHVfRnJpX1NhdCcuc3BsaXQoJ18nKSxcbiAgICAgICAgd2Vla2RheXNTaG9ydCA6IGZ1bmN0aW9uIChtKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fd2Vla2RheXNTaG9ydFttLmRheSgpXTtcbiAgICAgICAgfSxcblxuICAgICAgICBfd2Vla2RheXNNaW4gOiAnU3VfTW9fVHVfV2VfVGhfRnJfU2EnLnNwbGl0KCdfJyksXG4gICAgICAgIHdlZWtkYXlzTWluIDogZnVuY3Rpb24gKG0pIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl93ZWVrZGF5c01pblttLmRheSgpXTtcbiAgICAgICAgfSxcblxuICAgICAgICB3ZWVrZGF5c1BhcnNlIDogZnVuY3Rpb24gKHdlZWtkYXlOYW1lKSB7XG4gICAgICAgICAgICB2YXIgaSwgbW9tLCByZWdleDtcblxuICAgICAgICAgICAgaWYgKCF0aGlzLl93ZWVrZGF5c1BhcnNlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fd2Vla2RheXNQYXJzZSA9IFtdO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgNzsgaSsrKSB7XG4gICAgICAgICAgICAgICAgLy8gbWFrZSB0aGUgcmVnZXggaWYgd2UgZG9uJ3QgaGF2ZSBpdCBhbHJlYWR5XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLl93ZWVrZGF5c1BhcnNlW2ldKSB7XG4gICAgICAgICAgICAgICAgICAgIG1vbSA9IG1vbWVudChbMjAwMCwgMV0pLmRheShpKTtcbiAgICAgICAgICAgICAgICAgICAgcmVnZXggPSAnXicgKyB0aGlzLndlZWtkYXlzKG1vbSwgJycpICsgJ3xeJyArIHRoaXMud2Vla2RheXNTaG9ydChtb20sICcnKSArICd8XicgKyB0aGlzLndlZWtkYXlzTWluKG1vbSwgJycpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl93ZWVrZGF5c1BhcnNlW2ldID0gbmV3IFJlZ0V4cChyZWdleC5yZXBsYWNlKCcuJywgJycpLCAnaScpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyB0ZXN0IHRoZSByZWdleFxuICAgICAgICAgICAgICAgIGlmICh0aGlzLl93ZWVrZGF5c1BhcnNlW2ldLnRlc3Qod2Vla2RheU5hbWUpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBfbG9uZ0RhdGVGb3JtYXQgOiB7XG4gICAgICAgICAgICBMVFMgOiAnaDptbTpzcyBBJyxcbiAgICAgICAgICAgIExUIDogJ2g6bW0gQScsXG4gICAgICAgICAgICBMIDogJ01NL0REL1lZWVknLFxuICAgICAgICAgICAgTEwgOiAnTU1NTSBELCBZWVlZJyxcbiAgICAgICAgICAgIExMTCA6ICdNTU1NIEQsIFlZWVkgTFQnLFxuICAgICAgICAgICAgTExMTCA6ICdkZGRkLCBNTU1NIEQsIFlZWVkgTFQnXG4gICAgICAgIH0sXG4gICAgICAgIGxvbmdEYXRlRm9ybWF0IDogZnVuY3Rpb24gKGtleSkge1xuICAgICAgICAgICAgdmFyIG91dHB1dCA9IHRoaXMuX2xvbmdEYXRlRm9ybWF0W2tleV07XG4gICAgICAgICAgICBpZiAoIW91dHB1dCAmJiB0aGlzLl9sb25nRGF0ZUZvcm1hdFtrZXkudG9VcHBlckNhc2UoKV0pIHtcbiAgICAgICAgICAgICAgICBvdXRwdXQgPSB0aGlzLl9sb25nRGF0ZUZvcm1hdFtrZXkudG9VcHBlckNhc2UoKV0ucmVwbGFjZSgvTU1NTXxNTXxERHxkZGRkL2csIGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHZhbC5zbGljZSgxKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB0aGlzLl9sb25nRGF0ZUZvcm1hdFtrZXldID0gb3V0cHV0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG91dHB1dDtcbiAgICAgICAgfSxcblxuICAgICAgICBpc1BNIDogZnVuY3Rpb24gKGlucHV0KSB7XG4gICAgICAgICAgICAvLyBJRTggUXVpcmtzIE1vZGUgJiBJRTcgU3RhbmRhcmRzIE1vZGUgZG8gbm90IGFsbG93IGFjY2Vzc2luZyBzdHJpbmdzIGxpa2UgYXJyYXlzXG4gICAgICAgICAgICAvLyBVc2luZyBjaGFyQXQgc2hvdWxkIGJlIG1vcmUgY29tcGF0aWJsZS5cbiAgICAgICAgICAgIHJldHVybiAoKGlucHV0ICsgJycpLnRvTG93ZXJDYXNlKCkuY2hhckF0KDApID09PSAncCcpO1xuICAgICAgICB9LFxuXG4gICAgICAgIF9tZXJpZGllbVBhcnNlIDogL1thcF1cXC4/bT9cXC4/L2ksXG4gICAgICAgIG1lcmlkaWVtIDogZnVuY3Rpb24gKGhvdXJzLCBtaW51dGVzLCBpc0xvd2VyKSB7XG4gICAgICAgICAgICBpZiAoaG91cnMgPiAxMSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBpc0xvd2VyID8gJ3BtJyA6ICdQTSc7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBpc0xvd2VyID8gJ2FtJyA6ICdBTSc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgX2NhbGVuZGFyIDoge1xuICAgICAgICAgICAgc2FtZURheSA6ICdbVG9kYXkgYXRdIExUJyxcbiAgICAgICAgICAgIG5leHREYXkgOiAnW1RvbW9ycm93IGF0XSBMVCcsXG4gICAgICAgICAgICBuZXh0V2VlayA6ICdkZGRkIFthdF0gTFQnLFxuICAgICAgICAgICAgbGFzdERheSA6ICdbWWVzdGVyZGF5IGF0XSBMVCcsXG4gICAgICAgICAgICBsYXN0V2VlayA6ICdbTGFzdF0gZGRkZCBbYXRdIExUJyxcbiAgICAgICAgICAgIHNhbWVFbHNlIDogJ0wnXG4gICAgICAgIH0sXG4gICAgICAgIGNhbGVuZGFyIDogZnVuY3Rpb24gKGtleSwgbW9tLCBub3cpIHtcbiAgICAgICAgICAgIHZhciBvdXRwdXQgPSB0aGlzLl9jYWxlbmRhcltrZXldO1xuICAgICAgICAgICAgcmV0dXJuIHR5cGVvZiBvdXRwdXQgPT09ICdmdW5jdGlvbicgPyBvdXRwdXQuYXBwbHkobW9tLCBbbm93XSkgOiBvdXRwdXQ7XG4gICAgICAgIH0sXG5cbiAgICAgICAgX3JlbGF0aXZlVGltZSA6IHtcbiAgICAgICAgICAgIGZ1dHVyZSA6ICdpbiAlcycsXG4gICAgICAgICAgICBwYXN0IDogJyVzIGFnbycsXG4gICAgICAgICAgICBzIDogJ2EgZmV3IHNlY29uZHMnLFxuICAgICAgICAgICAgbSA6ICdhIG1pbnV0ZScsXG4gICAgICAgICAgICBtbSA6ICclZCBtaW51dGVzJyxcbiAgICAgICAgICAgIGggOiAnYW4gaG91cicsXG4gICAgICAgICAgICBoaCA6ICclZCBob3VycycsXG4gICAgICAgICAgICBkIDogJ2EgZGF5JyxcbiAgICAgICAgICAgIGRkIDogJyVkIGRheXMnLFxuICAgICAgICAgICAgTSA6ICdhIG1vbnRoJyxcbiAgICAgICAgICAgIE1NIDogJyVkIG1vbnRocycsXG4gICAgICAgICAgICB5IDogJ2EgeWVhcicsXG4gICAgICAgICAgICB5eSA6ICclZCB5ZWFycydcbiAgICAgICAgfSxcblxuICAgICAgICByZWxhdGl2ZVRpbWUgOiBmdW5jdGlvbiAobnVtYmVyLCB3aXRob3V0U3VmZml4LCBzdHJpbmcsIGlzRnV0dXJlKSB7XG4gICAgICAgICAgICB2YXIgb3V0cHV0ID0gdGhpcy5fcmVsYXRpdmVUaW1lW3N0cmluZ107XG4gICAgICAgICAgICByZXR1cm4gKHR5cGVvZiBvdXRwdXQgPT09ICdmdW5jdGlvbicpID9cbiAgICAgICAgICAgICAgICBvdXRwdXQobnVtYmVyLCB3aXRob3V0U3VmZml4LCBzdHJpbmcsIGlzRnV0dXJlKSA6XG4gICAgICAgICAgICAgICAgb3V0cHV0LnJlcGxhY2UoLyVkL2ksIG51bWJlcik7XG4gICAgICAgIH0sXG5cbiAgICAgICAgcGFzdEZ1dHVyZSA6IGZ1bmN0aW9uIChkaWZmLCBvdXRwdXQpIHtcbiAgICAgICAgICAgIHZhciBmb3JtYXQgPSB0aGlzLl9yZWxhdGl2ZVRpbWVbZGlmZiA+IDAgPyAnZnV0dXJlJyA6ICdwYXN0J107XG4gICAgICAgICAgICByZXR1cm4gdHlwZW9mIGZvcm1hdCA9PT0gJ2Z1bmN0aW9uJyA/IGZvcm1hdChvdXRwdXQpIDogZm9ybWF0LnJlcGxhY2UoLyVzL2ksIG91dHB1dCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgb3JkaW5hbCA6IGZ1bmN0aW9uIChudW1iZXIpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9vcmRpbmFsLnJlcGxhY2UoJyVkJywgbnVtYmVyKTtcbiAgICAgICAgfSxcbiAgICAgICAgX29yZGluYWwgOiAnJWQnLFxuICAgICAgICBfb3JkaW5hbFBhcnNlIDogL1xcZHsxLDJ9LyxcblxuICAgICAgICBwcmVwYXJzZSA6IGZ1bmN0aW9uIChzdHJpbmcpIHtcbiAgICAgICAgICAgIHJldHVybiBzdHJpbmc7XG4gICAgICAgIH0sXG5cbiAgICAgICAgcG9zdGZvcm1hdCA6IGZ1bmN0aW9uIChzdHJpbmcpIHtcbiAgICAgICAgICAgIHJldHVybiBzdHJpbmc7XG4gICAgICAgIH0sXG5cbiAgICAgICAgd2VlayA6IGZ1bmN0aW9uIChtb20pIHtcbiAgICAgICAgICAgIHJldHVybiB3ZWVrT2ZZZWFyKG1vbSwgdGhpcy5fd2Vlay5kb3csIHRoaXMuX3dlZWsuZG95KS53ZWVrO1xuICAgICAgICB9LFxuXG4gICAgICAgIF93ZWVrIDoge1xuICAgICAgICAgICAgZG93IDogMCwgLy8gU3VuZGF5IGlzIHRoZSBmaXJzdCBkYXkgb2YgdGhlIHdlZWsuXG4gICAgICAgICAgICBkb3kgOiA2ICAvLyBUaGUgd2VlayB0aGF0IGNvbnRhaW5zIEphbiAxc3QgaXMgdGhlIGZpcnN0IHdlZWsgb2YgdGhlIHllYXIuXG4gICAgICAgIH0sXG5cbiAgICAgICAgX2ludmFsaWREYXRlOiAnSW52YWxpZCBkYXRlJyxcbiAgICAgICAgaW52YWxpZERhdGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9pbnZhbGlkRGF0ZTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICAgICAgICBGb3JtYXR0aW5nXG4gICAgKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG5cbiAgICBmdW5jdGlvbiByZW1vdmVGb3JtYXR0aW5nVG9rZW5zKGlucHV0KSB7XG4gICAgICAgIGlmIChpbnB1dC5tYXRjaCgvXFxbW1xcc1xcU10vKSkge1xuICAgICAgICAgICAgcmV0dXJuIGlucHV0LnJlcGxhY2UoL15cXFt8XFxdJC9nLCAnJyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGlucHV0LnJlcGxhY2UoL1xcXFwvZywgJycpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG1ha2VGb3JtYXRGdW5jdGlvbihmb3JtYXQpIHtcbiAgICAgICAgdmFyIGFycmF5ID0gZm9ybWF0Lm1hdGNoKGZvcm1hdHRpbmdUb2tlbnMpLCBpLCBsZW5ndGg7XG5cbiAgICAgICAgZm9yIChpID0gMCwgbGVuZ3RoID0gYXJyYXkubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmIChmb3JtYXRUb2tlbkZ1bmN0aW9uc1thcnJheVtpXV0pIHtcbiAgICAgICAgICAgICAgICBhcnJheVtpXSA9IGZvcm1hdFRva2VuRnVuY3Rpb25zW2FycmF5W2ldXTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgYXJyYXlbaV0gPSByZW1vdmVGb3JtYXR0aW5nVG9rZW5zKGFycmF5W2ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAobW9tKSB7XG4gICAgICAgICAgICB2YXIgb3V0cHV0ID0gJyc7XG4gICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBvdXRwdXQgKz0gYXJyYXlbaV0gaW5zdGFuY2VvZiBGdW5jdGlvbiA/IGFycmF5W2ldLmNhbGwobW9tLCBmb3JtYXQpIDogYXJyYXlbaV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gb3V0cHV0O1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vIGZvcm1hdCBkYXRlIHVzaW5nIG5hdGl2ZSBkYXRlIG9iamVjdFxuICAgIGZ1bmN0aW9uIGZvcm1hdE1vbWVudChtLCBmb3JtYXQpIHtcbiAgICAgICAgaWYgKCFtLmlzVmFsaWQoKSkge1xuICAgICAgICAgICAgcmV0dXJuIG0ubG9jYWxlRGF0YSgpLmludmFsaWREYXRlKCk7XG4gICAgICAgIH1cblxuICAgICAgICBmb3JtYXQgPSBleHBhbmRGb3JtYXQoZm9ybWF0LCBtLmxvY2FsZURhdGEoKSk7XG5cbiAgICAgICAgaWYgKCFmb3JtYXRGdW5jdGlvbnNbZm9ybWF0XSkge1xuICAgICAgICAgICAgZm9ybWF0RnVuY3Rpb25zW2Zvcm1hdF0gPSBtYWtlRm9ybWF0RnVuY3Rpb24oZm9ybWF0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBmb3JtYXRGdW5jdGlvbnNbZm9ybWF0XShtKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBleHBhbmRGb3JtYXQoZm9ybWF0LCBsb2NhbGUpIHtcbiAgICAgICAgdmFyIGkgPSA1O1xuXG4gICAgICAgIGZ1bmN0aW9uIHJlcGxhY2VMb25nRGF0ZUZvcm1hdFRva2VucyhpbnB1dCkge1xuICAgICAgICAgICAgcmV0dXJuIGxvY2FsZS5sb25nRGF0ZUZvcm1hdChpbnB1dCkgfHwgaW5wdXQ7XG4gICAgICAgIH1cblxuICAgICAgICBsb2NhbEZvcm1hdHRpbmdUb2tlbnMubGFzdEluZGV4ID0gMDtcbiAgICAgICAgd2hpbGUgKGkgPj0gMCAmJiBsb2NhbEZvcm1hdHRpbmdUb2tlbnMudGVzdChmb3JtYXQpKSB7XG4gICAgICAgICAgICBmb3JtYXQgPSBmb3JtYXQucmVwbGFjZShsb2NhbEZvcm1hdHRpbmdUb2tlbnMsIHJlcGxhY2VMb25nRGF0ZUZvcm1hdFRva2Vucyk7XG4gICAgICAgICAgICBsb2NhbEZvcm1hdHRpbmdUb2tlbnMubGFzdEluZGV4ID0gMDtcbiAgICAgICAgICAgIGkgLT0gMTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBmb3JtYXQ7XG4gICAgfVxuXG5cbiAgICAvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gICAgICAgIFBhcnNpbmdcbiAgICAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cblxuICAgIC8vIGdldCB0aGUgcmVnZXggdG8gZmluZCB0aGUgbmV4dCB0b2tlblxuICAgIGZ1bmN0aW9uIGdldFBhcnNlUmVnZXhGb3JUb2tlbih0b2tlbiwgY29uZmlnKSB7XG4gICAgICAgIHZhciBhLCBzdHJpY3QgPSBjb25maWcuX3N0cmljdDtcbiAgICAgICAgc3dpdGNoICh0b2tlbikge1xuICAgICAgICBjYXNlICdRJzpcbiAgICAgICAgICAgIHJldHVybiBwYXJzZVRva2VuT25lRGlnaXQ7XG4gICAgICAgIGNhc2UgJ0REREQnOlxuICAgICAgICAgICAgcmV0dXJuIHBhcnNlVG9rZW5UaHJlZURpZ2l0cztcbiAgICAgICAgY2FzZSAnWVlZWSc6XG4gICAgICAgIGNhc2UgJ0dHR0cnOlxuICAgICAgICBjYXNlICdnZ2dnJzpcbiAgICAgICAgICAgIHJldHVybiBzdHJpY3QgPyBwYXJzZVRva2VuRm91ckRpZ2l0cyA6IHBhcnNlVG9rZW5PbmVUb0ZvdXJEaWdpdHM7XG4gICAgICAgIGNhc2UgJ1knOlxuICAgICAgICBjYXNlICdHJzpcbiAgICAgICAgY2FzZSAnZyc6XG4gICAgICAgICAgICByZXR1cm4gcGFyc2VUb2tlblNpZ25lZE51bWJlcjtcbiAgICAgICAgY2FzZSAnWVlZWVlZJzpcbiAgICAgICAgY2FzZSAnWVlZWVknOlxuICAgICAgICBjYXNlICdHR0dHRyc6XG4gICAgICAgIGNhc2UgJ2dnZ2dnJzpcbiAgICAgICAgICAgIHJldHVybiBzdHJpY3QgPyBwYXJzZVRva2VuU2l4RGlnaXRzIDogcGFyc2VUb2tlbk9uZVRvU2l4RGlnaXRzO1xuICAgICAgICBjYXNlICdTJzpcbiAgICAgICAgICAgIGlmIChzdHJpY3QpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VUb2tlbk9uZURpZ2l0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLyogZmFsbHMgdGhyb3VnaCAqL1xuICAgICAgICBjYXNlICdTUyc6XG4gICAgICAgICAgICBpZiAoc3RyaWN0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlVG9rZW5Ud29EaWdpdHM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvKiBmYWxscyB0aHJvdWdoICovXG4gICAgICAgIGNhc2UgJ1NTUyc6XG4gICAgICAgICAgICBpZiAoc3RyaWN0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlVG9rZW5UaHJlZURpZ2l0cztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8qIGZhbGxzIHRocm91Z2ggKi9cbiAgICAgICAgY2FzZSAnREREJzpcbiAgICAgICAgICAgIHJldHVybiBwYXJzZVRva2VuT25lVG9UaHJlZURpZ2l0cztcbiAgICAgICAgY2FzZSAnTU1NJzpcbiAgICAgICAgY2FzZSAnTU1NTSc6XG4gICAgICAgIGNhc2UgJ2RkJzpcbiAgICAgICAgY2FzZSAnZGRkJzpcbiAgICAgICAgY2FzZSAnZGRkZCc6XG4gICAgICAgICAgICByZXR1cm4gcGFyc2VUb2tlbldvcmQ7XG4gICAgICAgIGNhc2UgJ2EnOlxuICAgICAgICBjYXNlICdBJzpcbiAgICAgICAgICAgIHJldHVybiBjb25maWcuX2xvY2FsZS5fbWVyaWRpZW1QYXJzZTtcbiAgICAgICAgY2FzZSAneCc6XG4gICAgICAgICAgICByZXR1cm4gcGFyc2VUb2tlbk9mZnNldE1zO1xuICAgICAgICBjYXNlICdYJzpcbiAgICAgICAgICAgIHJldHVybiBwYXJzZVRva2VuVGltZXN0YW1wTXM7XG4gICAgICAgIGNhc2UgJ1onOlxuICAgICAgICBjYXNlICdaWic6XG4gICAgICAgICAgICByZXR1cm4gcGFyc2VUb2tlblRpbWV6b25lO1xuICAgICAgICBjYXNlICdUJzpcbiAgICAgICAgICAgIHJldHVybiBwYXJzZVRva2VuVDtcbiAgICAgICAgY2FzZSAnU1NTUyc6XG4gICAgICAgICAgICByZXR1cm4gcGFyc2VUb2tlbkRpZ2l0cztcbiAgICAgICAgY2FzZSAnTU0nOlxuICAgICAgICBjYXNlICdERCc6XG4gICAgICAgIGNhc2UgJ1lZJzpcbiAgICAgICAgY2FzZSAnR0cnOlxuICAgICAgICBjYXNlICdnZyc6XG4gICAgICAgIGNhc2UgJ0hIJzpcbiAgICAgICAgY2FzZSAnaGgnOlxuICAgICAgICBjYXNlICdtbSc6XG4gICAgICAgIGNhc2UgJ3NzJzpcbiAgICAgICAgY2FzZSAnd3cnOlxuICAgICAgICBjYXNlICdXVyc6XG4gICAgICAgICAgICByZXR1cm4gc3RyaWN0ID8gcGFyc2VUb2tlblR3b0RpZ2l0cyA6IHBhcnNlVG9rZW5PbmVPclR3b0RpZ2l0cztcbiAgICAgICAgY2FzZSAnTSc6XG4gICAgICAgIGNhc2UgJ0QnOlxuICAgICAgICBjYXNlICdkJzpcbiAgICAgICAgY2FzZSAnSCc6XG4gICAgICAgIGNhc2UgJ2gnOlxuICAgICAgICBjYXNlICdtJzpcbiAgICAgICAgY2FzZSAncyc6XG4gICAgICAgIGNhc2UgJ3cnOlxuICAgICAgICBjYXNlICdXJzpcbiAgICAgICAgY2FzZSAnZSc6XG4gICAgICAgIGNhc2UgJ0UnOlxuICAgICAgICAgICAgcmV0dXJuIHBhcnNlVG9rZW5PbmVPclR3b0RpZ2l0cztcbiAgICAgICAgY2FzZSAnRG8nOlxuICAgICAgICAgICAgcmV0dXJuIHN0cmljdCA/IGNvbmZpZy5fbG9jYWxlLl9vcmRpbmFsUGFyc2UgOiBjb25maWcuX2xvY2FsZS5fb3JkaW5hbFBhcnNlTGVuaWVudDtcbiAgICAgICAgZGVmYXVsdCA6XG4gICAgICAgICAgICBhID0gbmV3IFJlZ0V4cChyZWdleHBFc2NhcGUodW5lc2NhcGVGb3JtYXQodG9rZW4ucmVwbGFjZSgnXFxcXCcsICcnKSksICdpJykpO1xuICAgICAgICAgICAgcmV0dXJuIGE7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiB0aW1lem9uZU1pbnV0ZXNGcm9tU3RyaW5nKHN0cmluZykge1xuICAgICAgICBzdHJpbmcgPSBzdHJpbmcgfHwgJyc7XG4gICAgICAgIHZhciBwb3NzaWJsZVR6TWF0Y2hlcyA9IChzdHJpbmcubWF0Y2gocGFyc2VUb2tlblRpbWV6b25lKSB8fCBbXSksXG4gICAgICAgICAgICB0ekNodW5rID0gcG9zc2libGVUek1hdGNoZXNbcG9zc2libGVUek1hdGNoZXMubGVuZ3RoIC0gMV0gfHwgW10sXG4gICAgICAgICAgICBwYXJ0cyA9ICh0ekNodW5rICsgJycpLm1hdGNoKHBhcnNlVGltZXpvbmVDaHVua2VyKSB8fCBbJy0nLCAwLCAwXSxcbiAgICAgICAgICAgIG1pbnV0ZXMgPSArKHBhcnRzWzFdICogNjApICsgdG9JbnQocGFydHNbMl0pO1xuXG4gICAgICAgIHJldHVybiBwYXJ0c1swXSA9PT0gJysnID8gLW1pbnV0ZXMgOiBtaW51dGVzO1xuICAgIH1cblxuICAgIC8vIGZ1bmN0aW9uIHRvIGNvbnZlcnQgc3RyaW5nIGlucHV0IHRvIGRhdGVcbiAgICBmdW5jdGlvbiBhZGRUaW1lVG9BcnJheUZyb21Ub2tlbih0b2tlbiwgaW5wdXQsIGNvbmZpZykge1xuICAgICAgICB2YXIgYSwgZGF0ZVBhcnRBcnJheSA9IGNvbmZpZy5fYTtcblxuICAgICAgICBzd2l0Y2ggKHRva2VuKSB7XG4gICAgICAgIC8vIFFVQVJURVJcbiAgICAgICAgY2FzZSAnUSc6XG4gICAgICAgICAgICBpZiAoaW5wdXQgIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGRhdGVQYXJ0QXJyYXlbTU9OVEhdID0gKHRvSW50KGlucHV0KSAtIDEpICogMztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAvLyBNT05USFxuICAgICAgICBjYXNlICdNJyA6IC8vIGZhbGwgdGhyb3VnaCB0byBNTVxuICAgICAgICBjYXNlICdNTScgOlxuICAgICAgICAgICAgaWYgKGlucHV0ICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICBkYXRlUGFydEFycmF5W01PTlRIXSA9IHRvSW50KGlucHV0KSAtIDE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnTU1NJyA6IC8vIGZhbGwgdGhyb3VnaCB0byBNTU1NXG4gICAgICAgIGNhc2UgJ01NTU0nIDpcbiAgICAgICAgICAgIGEgPSBjb25maWcuX2xvY2FsZS5tb250aHNQYXJzZShpbnB1dCwgdG9rZW4sIGNvbmZpZy5fc3RyaWN0KTtcbiAgICAgICAgICAgIC8vIGlmIHdlIGRpZG4ndCBmaW5kIGEgbW9udGggbmFtZSwgbWFyayB0aGUgZGF0ZSBhcyBpbnZhbGlkLlxuICAgICAgICAgICAgaWYgKGEgIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGRhdGVQYXJ0QXJyYXlbTU9OVEhdID0gYTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uZmlnLl9wZi5pbnZhbGlkTW9udGggPSBpbnB1dDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAvLyBEQVkgT0YgTU9OVEhcbiAgICAgICAgY2FzZSAnRCcgOiAvLyBmYWxsIHRocm91Z2ggdG8gRERcbiAgICAgICAgY2FzZSAnREQnIDpcbiAgICAgICAgICAgIGlmIChpbnB1dCAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgZGF0ZVBhcnRBcnJheVtEQVRFXSA9IHRvSW50KGlucHV0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdEbycgOlxuICAgICAgICAgICAgaWYgKGlucHV0ICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICBkYXRlUGFydEFycmF5W0RBVEVdID0gdG9JbnQocGFyc2VJbnQoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5wdXQubWF0Y2goL1xcZHsxLDJ9LylbMF0sIDEwKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgLy8gREFZIE9GIFlFQVJcbiAgICAgICAgY2FzZSAnREREJyA6IC8vIGZhbGwgdGhyb3VnaCB0byBEREREXG4gICAgICAgIGNhc2UgJ0REREQnIDpcbiAgICAgICAgICAgIGlmIChpbnB1dCAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgY29uZmlnLl9kYXlPZlllYXIgPSB0b0ludChpbnB1dCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAvLyBZRUFSXG4gICAgICAgIGNhc2UgJ1lZJyA6XG4gICAgICAgICAgICBkYXRlUGFydEFycmF5W1lFQVJdID0gbW9tZW50LnBhcnNlVHdvRGlnaXRZZWFyKGlucHV0KTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdZWVlZJyA6XG4gICAgICAgIGNhc2UgJ1lZWVlZJyA6XG4gICAgICAgIGNhc2UgJ1lZWVlZWScgOlxuICAgICAgICAgICAgZGF0ZVBhcnRBcnJheVtZRUFSXSA9IHRvSW50KGlucHV0KTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAvLyBBTSAvIFBNXG4gICAgICAgIGNhc2UgJ2EnIDogLy8gZmFsbCB0aHJvdWdoIHRvIEFcbiAgICAgICAgY2FzZSAnQScgOlxuICAgICAgICAgICAgY29uZmlnLl9pc1BtID0gY29uZmlnLl9sb2NhbGUuaXNQTShpbnB1dCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgLy8gSE9VUlxuICAgICAgICBjYXNlICdoJyA6IC8vIGZhbGwgdGhyb3VnaCB0byBoaFxuICAgICAgICBjYXNlICdoaCcgOlxuICAgICAgICAgICAgY29uZmlnLl9wZi5iaWdIb3VyID0gdHJ1ZTtcbiAgICAgICAgICAgIC8qIGZhbGxzIHRocm91Z2ggKi9cbiAgICAgICAgY2FzZSAnSCcgOiAvLyBmYWxsIHRocm91Z2ggdG8gSEhcbiAgICAgICAgY2FzZSAnSEgnIDpcbiAgICAgICAgICAgIGRhdGVQYXJ0QXJyYXlbSE9VUl0gPSB0b0ludChpbnB1dCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgLy8gTUlOVVRFXG4gICAgICAgIGNhc2UgJ20nIDogLy8gZmFsbCB0aHJvdWdoIHRvIG1tXG4gICAgICAgIGNhc2UgJ21tJyA6XG4gICAgICAgICAgICBkYXRlUGFydEFycmF5W01JTlVURV0gPSB0b0ludChpbnB1dCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgLy8gU0VDT05EXG4gICAgICAgIGNhc2UgJ3MnIDogLy8gZmFsbCB0aHJvdWdoIHRvIHNzXG4gICAgICAgIGNhc2UgJ3NzJyA6XG4gICAgICAgICAgICBkYXRlUGFydEFycmF5W1NFQ09ORF0gPSB0b0ludChpbnB1dCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgLy8gTUlMTElTRUNPTkRcbiAgICAgICAgY2FzZSAnUycgOlxuICAgICAgICBjYXNlICdTUycgOlxuICAgICAgICBjYXNlICdTU1MnIDpcbiAgICAgICAgY2FzZSAnU1NTUycgOlxuICAgICAgICAgICAgZGF0ZVBhcnRBcnJheVtNSUxMSVNFQ09ORF0gPSB0b0ludCgoJzAuJyArIGlucHV0KSAqIDEwMDApO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIC8vIFVOSVggT0ZGU0VUIChNSUxMSVNFQ09ORFMpXG4gICAgICAgIGNhc2UgJ3gnOlxuICAgICAgICAgICAgY29uZmlnLl9kID0gbmV3IERhdGUodG9JbnQoaW5wdXQpKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAvLyBVTklYIFRJTUVTVEFNUCBXSVRIIE1TXG4gICAgICAgIGNhc2UgJ1gnOlxuICAgICAgICAgICAgY29uZmlnLl9kID0gbmV3IERhdGUocGFyc2VGbG9hdChpbnB1dCkgKiAxMDAwKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAvLyBUSU1FWk9ORVxuICAgICAgICBjYXNlICdaJyA6IC8vIGZhbGwgdGhyb3VnaCB0byBaWlxuICAgICAgICBjYXNlICdaWicgOlxuICAgICAgICAgICAgY29uZmlnLl91c2VVVEMgPSB0cnVlO1xuICAgICAgICAgICAgY29uZmlnLl90em0gPSB0aW1lem9uZU1pbnV0ZXNGcm9tU3RyaW5nKGlucHV0KTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAvLyBXRUVLREFZIC0gaHVtYW5cbiAgICAgICAgY2FzZSAnZGQnOlxuICAgICAgICBjYXNlICdkZGQnOlxuICAgICAgICBjYXNlICdkZGRkJzpcbiAgICAgICAgICAgIGEgPSBjb25maWcuX2xvY2FsZS53ZWVrZGF5c1BhcnNlKGlucHV0KTtcbiAgICAgICAgICAgIC8vIGlmIHdlIGRpZG4ndCBnZXQgYSB3ZWVrZGF5IG5hbWUsIG1hcmsgdGhlIGRhdGUgYXMgaW52YWxpZFxuICAgICAgICAgICAgaWYgKGEgIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGNvbmZpZy5fdyA9IGNvbmZpZy5fdyB8fCB7fTtcbiAgICAgICAgICAgICAgICBjb25maWcuX3dbJ2QnXSA9IGE7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbmZpZy5fcGYuaW52YWxpZFdlZWtkYXkgPSBpbnB1dDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAvLyBXRUVLLCBXRUVLIERBWSAtIG51bWVyaWNcbiAgICAgICAgY2FzZSAndyc6XG4gICAgICAgIGNhc2UgJ3d3JzpcbiAgICAgICAgY2FzZSAnVyc6XG4gICAgICAgIGNhc2UgJ1dXJzpcbiAgICAgICAgY2FzZSAnZCc6XG4gICAgICAgIGNhc2UgJ2UnOlxuICAgICAgICBjYXNlICdFJzpcbiAgICAgICAgICAgIHRva2VuID0gdG9rZW4uc3Vic3RyKDAsIDEpO1xuICAgICAgICAgICAgLyogZmFsbHMgdGhyb3VnaCAqL1xuICAgICAgICBjYXNlICdnZ2dnJzpcbiAgICAgICAgY2FzZSAnR0dHRyc6XG4gICAgICAgIGNhc2UgJ0dHR0dHJzpcbiAgICAgICAgICAgIHRva2VuID0gdG9rZW4uc3Vic3RyKDAsIDIpO1xuICAgICAgICAgICAgaWYgKGlucHV0KSB7XG4gICAgICAgICAgICAgICAgY29uZmlnLl93ID0gY29uZmlnLl93IHx8IHt9O1xuICAgICAgICAgICAgICAgIGNvbmZpZy5fd1t0b2tlbl0gPSB0b0ludChpbnB1dCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnZ2cnOlxuICAgICAgICBjYXNlICdHRyc6XG4gICAgICAgICAgICBjb25maWcuX3cgPSBjb25maWcuX3cgfHwge307XG4gICAgICAgICAgICBjb25maWcuX3dbdG9rZW5dID0gbW9tZW50LnBhcnNlVHdvRGlnaXRZZWFyKGlucHV0KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRheU9mWWVhckZyb21XZWVrSW5mbyhjb25maWcpIHtcbiAgICAgICAgdmFyIHcsIHdlZWtZZWFyLCB3ZWVrLCB3ZWVrZGF5LCBkb3csIGRveSwgdGVtcDtcblxuICAgICAgICB3ID0gY29uZmlnLl93O1xuICAgICAgICBpZiAody5HRyAhPSBudWxsIHx8IHcuVyAhPSBudWxsIHx8IHcuRSAhPSBudWxsKSB7XG4gICAgICAgICAgICBkb3cgPSAxO1xuICAgICAgICAgICAgZG95ID0gNDtcblxuICAgICAgICAgICAgLy8gVE9ETzogV2UgbmVlZCB0byB0YWtlIHRoZSBjdXJyZW50IGlzb1dlZWtZZWFyLCBidXQgdGhhdCBkZXBlbmRzIG9uXG4gICAgICAgICAgICAvLyBob3cgd2UgaW50ZXJwcmV0IG5vdyAobG9jYWwsIHV0YywgZml4ZWQgb2Zmc2V0KS4gU28gY3JlYXRlXG4gICAgICAgICAgICAvLyBhIG5vdyB2ZXJzaW9uIG9mIGN1cnJlbnQgY29uZmlnICh0YWtlIGxvY2FsL3V0Yy9vZmZzZXQgZmxhZ3MsIGFuZFxuICAgICAgICAgICAgLy8gY3JlYXRlIG5vdykuXG4gICAgICAgICAgICB3ZWVrWWVhciA9IGRmbCh3LkdHLCBjb25maWcuX2FbWUVBUl0sIHdlZWtPZlllYXIobW9tZW50KCksIDEsIDQpLnllYXIpO1xuICAgICAgICAgICAgd2VlayA9IGRmbCh3LlcsIDEpO1xuICAgICAgICAgICAgd2Vla2RheSA9IGRmbCh3LkUsIDEpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZG93ID0gY29uZmlnLl9sb2NhbGUuX3dlZWsuZG93O1xuICAgICAgICAgICAgZG95ID0gY29uZmlnLl9sb2NhbGUuX3dlZWsuZG95O1xuXG4gICAgICAgICAgICB3ZWVrWWVhciA9IGRmbCh3LmdnLCBjb25maWcuX2FbWUVBUl0sIHdlZWtPZlllYXIobW9tZW50KCksIGRvdywgZG95KS55ZWFyKTtcbiAgICAgICAgICAgIHdlZWsgPSBkZmwody53LCAxKTtcblxuICAgICAgICAgICAgaWYgKHcuZCAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgLy8gd2Vla2RheSAtLSBsb3cgZGF5IG51bWJlcnMgYXJlIGNvbnNpZGVyZWQgbmV4dCB3ZWVrXG4gICAgICAgICAgICAgICAgd2Vla2RheSA9IHcuZDtcbiAgICAgICAgICAgICAgICBpZiAod2Vla2RheSA8IGRvdykge1xuICAgICAgICAgICAgICAgICAgICArK3dlZWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmICh3LmUgIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIC8vIGxvY2FsIHdlZWtkYXkgLS0gY291bnRpbmcgc3RhcnRzIGZyb20gYmVnaW5pbmcgb2Ygd2Vla1xuICAgICAgICAgICAgICAgIHdlZWtkYXkgPSB3LmUgKyBkb3c7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIGRlZmF1bHQgdG8gYmVnaW5pbmcgb2Ygd2Vla1xuICAgICAgICAgICAgICAgIHdlZWtkYXkgPSBkb3c7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGVtcCA9IGRheU9mWWVhckZyb21XZWVrcyh3ZWVrWWVhciwgd2Vlaywgd2Vla2RheSwgZG95LCBkb3cpO1xuXG4gICAgICAgIGNvbmZpZy5fYVtZRUFSXSA9IHRlbXAueWVhcjtcbiAgICAgICAgY29uZmlnLl9kYXlPZlllYXIgPSB0ZW1wLmRheU9mWWVhcjtcbiAgICB9XG5cbiAgICAvLyBjb252ZXJ0IGFuIGFycmF5IHRvIGEgZGF0ZS5cbiAgICAvLyB0aGUgYXJyYXkgc2hvdWxkIG1pcnJvciB0aGUgcGFyYW1ldGVycyBiZWxvd1xuICAgIC8vIG5vdGU6IGFsbCB2YWx1ZXMgcGFzdCB0aGUgeWVhciBhcmUgb3B0aW9uYWwgYW5kIHdpbGwgZGVmYXVsdCB0byB0aGUgbG93ZXN0IHBvc3NpYmxlIHZhbHVlLlxuICAgIC8vIFt5ZWFyLCBtb250aCwgZGF5ICwgaG91ciwgbWludXRlLCBzZWNvbmQsIG1pbGxpc2Vjb25kXVxuICAgIGZ1bmN0aW9uIGRhdGVGcm9tQ29uZmlnKGNvbmZpZykge1xuICAgICAgICB2YXIgaSwgZGF0ZSwgaW5wdXQgPSBbXSwgY3VycmVudERhdGUsIHllYXJUb1VzZTtcblxuICAgICAgICBpZiAoY29uZmlnLl9kKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjdXJyZW50RGF0ZSA9IGN1cnJlbnREYXRlQXJyYXkoY29uZmlnKTtcblxuICAgICAgICAvL2NvbXB1dGUgZGF5IG9mIHRoZSB5ZWFyIGZyb20gd2Vla3MgYW5kIHdlZWtkYXlzXG4gICAgICAgIGlmIChjb25maWcuX3cgJiYgY29uZmlnLl9hW0RBVEVdID09IG51bGwgJiYgY29uZmlnLl9hW01PTlRIXSA9PSBudWxsKSB7XG4gICAgICAgICAgICBkYXlPZlllYXJGcm9tV2Vla0luZm8oY29uZmlnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vaWYgdGhlIGRheSBvZiB0aGUgeWVhciBpcyBzZXQsIGZpZ3VyZSBvdXQgd2hhdCBpdCBpc1xuICAgICAgICBpZiAoY29uZmlnLl9kYXlPZlllYXIpIHtcbiAgICAgICAgICAgIHllYXJUb1VzZSA9IGRmbChjb25maWcuX2FbWUVBUl0sIGN1cnJlbnREYXRlW1lFQVJdKTtcblxuICAgICAgICAgICAgaWYgKGNvbmZpZy5fZGF5T2ZZZWFyID4gZGF5c0luWWVhcih5ZWFyVG9Vc2UpKSB7XG4gICAgICAgICAgICAgICAgY29uZmlnLl9wZi5fb3ZlcmZsb3dEYXlPZlllYXIgPSB0cnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBkYXRlID0gbWFrZVVUQ0RhdGUoeWVhclRvVXNlLCAwLCBjb25maWcuX2RheU9mWWVhcik7XG4gICAgICAgICAgICBjb25maWcuX2FbTU9OVEhdID0gZGF0ZS5nZXRVVENNb250aCgpO1xuICAgICAgICAgICAgY29uZmlnLl9hW0RBVEVdID0gZGF0ZS5nZXRVVENEYXRlKCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBEZWZhdWx0IHRvIGN1cnJlbnQgZGF0ZS5cbiAgICAgICAgLy8gKiBpZiBubyB5ZWFyLCBtb250aCwgZGF5IG9mIG1vbnRoIGFyZSBnaXZlbiwgZGVmYXVsdCB0byB0b2RheVxuICAgICAgICAvLyAqIGlmIGRheSBvZiBtb250aCBpcyBnaXZlbiwgZGVmYXVsdCBtb250aCBhbmQgeWVhclxuICAgICAgICAvLyAqIGlmIG1vbnRoIGlzIGdpdmVuLCBkZWZhdWx0IG9ubHkgeWVhclxuICAgICAgICAvLyAqIGlmIHllYXIgaXMgZ2l2ZW4sIGRvbid0IGRlZmF1bHQgYW55dGhpbmdcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IDMgJiYgY29uZmlnLl9hW2ldID09IG51bGw7ICsraSkge1xuICAgICAgICAgICAgY29uZmlnLl9hW2ldID0gaW5wdXRbaV0gPSBjdXJyZW50RGF0ZVtpXTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFplcm8gb3V0IHdoYXRldmVyIHdhcyBub3QgZGVmYXVsdGVkLCBpbmNsdWRpbmcgdGltZVxuICAgICAgICBmb3IgKDsgaSA8IDc7IGkrKykge1xuICAgICAgICAgICAgY29uZmlnLl9hW2ldID0gaW5wdXRbaV0gPSAoY29uZmlnLl9hW2ldID09IG51bGwpID8gKGkgPT09IDIgPyAxIDogMCkgOiBjb25maWcuX2FbaV07XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDaGVjayBmb3IgMjQ6MDA6MDAuMDAwXG4gICAgICAgIGlmIChjb25maWcuX2FbSE9VUl0gPT09IDI0ICYmXG4gICAgICAgICAgICAgICAgY29uZmlnLl9hW01JTlVURV0gPT09IDAgJiZcbiAgICAgICAgICAgICAgICBjb25maWcuX2FbU0VDT05EXSA9PT0gMCAmJlxuICAgICAgICAgICAgICAgIGNvbmZpZy5fYVtNSUxMSVNFQ09ORF0gPT09IDApIHtcbiAgICAgICAgICAgIGNvbmZpZy5fbmV4dERheSA9IHRydWU7XG4gICAgICAgICAgICBjb25maWcuX2FbSE9VUl0gPSAwO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uZmlnLl9kID0gKGNvbmZpZy5fdXNlVVRDID8gbWFrZVVUQ0RhdGUgOiBtYWtlRGF0ZSkuYXBwbHkobnVsbCwgaW5wdXQpO1xuICAgICAgICAvLyBBcHBseSB0aW1lem9uZSBvZmZzZXQgZnJvbSBpbnB1dC4gVGhlIGFjdHVhbCB6b25lIGNhbiBiZSBjaGFuZ2VkXG4gICAgICAgIC8vIHdpdGggcGFyc2Vab25lLlxuICAgICAgICBpZiAoY29uZmlnLl90em0gIT0gbnVsbCkge1xuICAgICAgICAgICAgY29uZmlnLl9kLnNldFVUQ01pbnV0ZXMoY29uZmlnLl9kLmdldFVUQ01pbnV0ZXMoKSArIGNvbmZpZy5fdHptKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjb25maWcuX25leHREYXkpIHtcbiAgICAgICAgICAgIGNvbmZpZy5fYVtIT1VSXSA9IDI0O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZGF0ZUZyb21PYmplY3QoY29uZmlnKSB7XG4gICAgICAgIHZhciBub3JtYWxpemVkSW5wdXQ7XG5cbiAgICAgICAgaWYgKGNvbmZpZy5fZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgbm9ybWFsaXplZElucHV0ID0gbm9ybWFsaXplT2JqZWN0VW5pdHMoY29uZmlnLl9pKTtcbiAgICAgICAgY29uZmlnLl9hID0gW1xuICAgICAgICAgICAgbm9ybWFsaXplZElucHV0LnllYXIsXG4gICAgICAgICAgICBub3JtYWxpemVkSW5wdXQubW9udGgsXG4gICAgICAgICAgICBub3JtYWxpemVkSW5wdXQuZGF5IHx8IG5vcm1hbGl6ZWRJbnB1dC5kYXRlLFxuICAgICAgICAgICAgbm9ybWFsaXplZElucHV0LmhvdXIsXG4gICAgICAgICAgICBub3JtYWxpemVkSW5wdXQubWludXRlLFxuICAgICAgICAgICAgbm9ybWFsaXplZElucHV0LnNlY29uZCxcbiAgICAgICAgICAgIG5vcm1hbGl6ZWRJbnB1dC5taWxsaXNlY29uZFxuICAgICAgICBdO1xuXG4gICAgICAgIGRhdGVGcm9tQ29uZmlnKGNvbmZpZyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY3VycmVudERhdGVBcnJheShjb25maWcpIHtcbiAgICAgICAgdmFyIG5vdyA9IG5ldyBEYXRlKCk7XG4gICAgICAgIGlmIChjb25maWcuX3VzZVVUQykge1xuICAgICAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgICAgICBub3cuZ2V0VVRDRnVsbFllYXIoKSxcbiAgICAgICAgICAgICAgICBub3cuZ2V0VVRDTW9udGgoKSxcbiAgICAgICAgICAgICAgICBub3cuZ2V0VVRDRGF0ZSgpXG4gICAgICAgICAgICBdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIFtub3cuZ2V0RnVsbFllYXIoKSwgbm93LmdldE1vbnRoKCksIG5vdy5nZXREYXRlKCldO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gZGF0ZSBmcm9tIHN0cmluZyBhbmQgZm9ybWF0IHN0cmluZ1xuICAgIGZ1bmN0aW9uIG1ha2VEYXRlRnJvbVN0cmluZ0FuZEZvcm1hdChjb25maWcpIHtcbiAgICAgICAgaWYgKGNvbmZpZy5fZiA9PT0gbW9tZW50LklTT184NjAxKSB7XG4gICAgICAgICAgICBwYXJzZUlTTyhjb25maWcpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uZmlnLl9hID0gW107XG4gICAgICAgIGNvbmZpZy5fcGYuZW1wdHkgPSB0cnVlO1xuXG4gICAgICAgIC8vIFRoaXMgYXJyYXkgaXMgdXNlZCB0byBtYWtlIGEgRGF0ZSwgZWl0aGVyIHdpdGggYG5ldyBEYXRlYCBvciBgRGF0ZS5VVENgXG4gICAgICAgIHZhciBzdHJpbmcgPSAnJyArIGNvbmZpZy5faSxcbiAgICAgICAgICAgIGksIHBhcnNlZElucHV0LCB0b2tlbnMsIHRva2VuLCBza2lwcGVkLFxuICAgICAgICAgICAgc3RyaW5nTGVuZ3RoID0gc3RyaW5nLmxlbmd0aCxcbiAgICAgICAgICAgIHRvdGFsUGFyc2VkSW5wdXRMZW5ndGggPSAwO1xuXG4gICAgICAgIHRva2VucyA9IGV4cGFuZEZvcm1hdChjb25maWcuX2YsIGNvbmZpZy5fbG9jYWxlKS5tYXRjaChmb3JtYXR0aW5nVG9rZW5zKSB8fCBbXTtcblxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgdG9rZW5zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB0b2tlbiA9IHRva2Vuc1tpXTtcbiAgICAgICAgICAgIHBhcnNlZElucHV0ID0gKHN0cmluZy5tYXRjaChnZXRQYXJzZVJlZ2V4Rm9yVG9rZW4odG9rZW4sIGNvbmZpZykpIHx8IFtdKVswXTtcbiAgICAgICAgICAgIGlmIChwYXJzZWRJbnB1dCkge1xuICAgICAgICAgICAgICAgIHNraXBwZWQgPSBzdHJpbmcuc3Vic3RyKDAsIHN0cmluZy5pbmRleE9mKHBhcnNlZElucHV0KSk7XG4gICAgICAgICAgICAgICAgaWYgKHNraXBwZWQubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBjb25maWcuX3BmLnVudXNlZElucHV0LnB1c2goc2tpcHBlZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHN0cmluZyA9IHN0cmluZy5zbGljZShzdHJpbmcuaW5kZXhPZihwYXJzZWRJbnB1dCkgKyBwYXJzZWRJbnB1dC5sZW5ndGgpO1xuICAgICAgICAgICAgICAgIHRvdGFsUGFyc2VkSW5wdXRMZW5ndGggKz0gcGFyc2VkSW5wdXQubGVuZ3RoO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gZG9uJ3QgcGFyc2UgaWYgaXQncyBub3QgYSBrbm93biB0b2tlblxuICAgICAgICAgICAgaWYgKGZvcm1hdFRva2VuRnVuY3Rpb25zW3Rva2VuXSkge1xuICAgICAgICAgICAgICAgIGlmIChwYXJzZWRJbnB1dCkge1xuICAgICAgICAgICAgICAgICAgICBjb25maWcuX3BmLmVtcHR5ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjb25maWcuX3BmLnVudXNlZFRva2Vucy5wdXNoKHRva2VuKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYWRkVGltZVRvQXJyYXlGcm9tVG9rZW4odG9rZW4sIHBhcnNlZElucHV0LCBjb25maWcpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoY29uZmlnLl9zdHJpY3QgJiYgIXBhcnNlZElucHV0KSB7XG4gICAgICAgICAgICAgICAgY29uZmlnLl9wZi51bnVzZWRUb2tlbnMucHVzaCh0b2tlbik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBhZGQgcmVtYWluaW5nIHVucGFyc2VkIGlucHV0IGxlbmd0aCB0byB0aGUgc3RyaW5nXG4gICAgICAgIGNvbmZpZy5fcGYuY2hhcnNMZWZ0T3ZlciA9IHN0cmluZ0xlbmd0aCAtIHRvdGFsUGFyc2VkSW5wdXRMZW5ndGg7XG4gICAgICAgIGlmIChzdHJpbmcubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uZmlnLl9wZi51bnVzZWRJbnB1dC5wdXNoKHN0cmluZyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBjbGVhciBfMTJoIGZsYWcgaWYgaG91ciBpcyA8PSAxMlxuICAgICAgICBpZiAoY29uZmlnLl9wZi5iaWdIb3VyID09PSB0cnVlICYmIGNvbmZpZy5fYVtIT1VSXSA8PSAxMikge1xuICAgICAgICAgICAgY29uZmlnLl9wZi5iaWdIb3VyID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgICAgIC8vIGhhbmRsZSBhbSBwbVxuICAgICAgICBpZiAoY29uZmlnLl9pc1BtICYmIGNvbmZpZy5fYVtIT1VSXSA8IDEyKSB7XG4gICAgICAgICAgICBjb25maWcuX2FbSE9VUl0gKz0gMTI7XG4gICAgICAgIH1cbiAgICAgICAgLy8gaWYgaXMgMTIgYW0sIGNoYW5nZSBob3VycyB0byAwXG4gICAgICAgIGlmIChjb25maWcuX2lzUG0gPT09IGZhbHNlICYmIGNvbmZpZy5fYVtIT1VSXSA9PT0gMTIpIHtcbiAgICAgICAgICAgIGNvbmZpZy5fYVtIT1VSXSA9IDA7XG4gICAgICAgIH1cbiAgICAgICAgZGF0ZUZyb21Db25maWcoY29uZmlnKTtcbiAgICAgICAgY2hlY2tPdmVyZmxvdyhjb25maWcpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHVuZXNjYXBlRm9ybWF0KHMpIHtcbiAgICAgICAgcmV0dXJuIHMucmVwbGFjZSgvXFxcXChcXFspfFxcXFwoXFxdKXxcXFsoW15cXF1cXFtdKilcXF18XFxcXCguKS9nLCBmdW5jdGlvbiAobWF0Y2hlZCwgcDEsIHAyLCBwMywgcDQpIHtcbiAgICAgICAgICAgIHJldHVybiBwMSB8fCBwMiB8fCBwMyB8fCBwNDtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gQ29kZSBmcm9tIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMzU2MTQ5My9pcy10aGVyZS1hLXJlZ2V4cC1lc2NhcGUtZnVuY3Rpb24taW4tamF2YXNjcmlwdFxuICAgIGZ1bmN0aW9uIHJlZ2V4cEVzY2FwZShzKSB7XG4gICAgICAgIHJldHVybiBzLnJlcGxhY2UoL1stXFwvXFxcXF4kKis/LigpfFtcXF17fV0vZywgJ1xcXFwkJicpO1xuICAgIH1cblxuICAgIC8vIGRhdGUgZnJvbSBzdHJpbmcgYW5kIGFycmF5IG9mIGZvcm1hdCBzdHJpbmdzXG4gICAgZnVuY3Rpb24gbWFrZURhdGVGcm9tU3RyaW5nQW5kQXJyYXkoY29uZmlnKSB7XG4gICAgICAgIHZhciB0ZW1wQ29uZmlnLFxuICAgICAgICAgICAgYmVzdE1vbWVudCxcblxuICAgICAgICAgICAgc2NvcmVUb0JlYXQsXG4gICAgICAgICAgICBpLFxuICAgICAgICAgICAgY3VycmVudFNjb3JlO1xuXG4gICAgICAgIGlmIChjb25maWcuX2YubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBjb25maWcuX3BmLmludmFsaWRGb3JtYXQgPSB0cnVlO1xuICAgICAgICAgICAgY29uZmlnLl9kID0gbmV3IERhdGUoTmFOKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBjb25maWcuX2YubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGN1cnJlbnRTY29yZSA9IDA7XG4gICAgICAgICAgICB0ZW1wQ29uZmlnID0gY29weUNvbmZpZyh7fSwgY29uZmlnKTtcbiAgICAgICAgICAgIGlmIChjb25maWcuX3VzZVVUQyAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgdGVtcENvbmZpZy5fdXNlVVRDID0gY29uZmlnLl91c2VVVEM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0ZW1wQ29uZmlnLl9wZiA9IGRlZmF1bHRQYXJzaW5nRmxhZ3MoKTtcbiAgICAgICAgICAgIHRlbXBDb25maWcuX2YgPSBjb25maWcuX2ZbaV07XG4gICAgICAgICAgICBtYWtlRGF0ZUZyb21TdHJpbmdBbmRGb3JtYXQodGVtcENvbmZpZyk7XG5cbiAgICAgICAgICAgIGlmICghaXNWYWxpZCh0ZW1wQ29uZmlnKSkge1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBpZiB0aGVyZSBpcyBhbnkgaW5wdXQgdGhhdCB3YXMgbm90IHBhcnNlZCBhZGQgYSBwZW5hbHR5IGZvciB0aGF0IGZvcm1hdFxuICAgICAgICAgICAgY3VycmVudFNjb3JlICs9IHRlbXBDb25maWcuX3BmLmNoYXJzTGVmdE92ZXI7XG5cbiAgICAgICAgICAgIC8vb3IgdG9rZW5zXG4gICAgICAgICAgICBjdXJyZW50U2NvcmUgKz0gdGVtcENvbmZpZy5fcGYudW51c2VkVG9rZW5zLmxlbmd0aCAqIDEwO1xuXG4gICAgICAgICAgICB0ZW1wQ29uZmlnLl9wZi5zY29yZSA9IGN1cnJlbnRTY29yZTtcblxuICAgICAgICAgICAgaWYgKHNjb3JlVG9CZWF0ID09IG51bGwgfHwgY3VycmVudFNjb3JlIDwgc2NvcmVUb0JlYXQpIHtcbiAgICAgICAgICAgICAgICBzY29yZVRvQmVhdCA9IGN1cnJlbnRTY29yZTtcbiAgICAgICAgICAgICAgICBiZXN0TW9tZW50ID0gdGVtcENvbmZpZztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGV4dGVuZChjb25maWcsIGJlc3RNb21lbnQgfHwgdGVtcENvbmZpZyk7XG4gICAgfVxuXG4gICAgLy8gZGF0ZSBmcm9tIGlzbyBmb3JtYXRcbiAgICBmdW5jdGlvbiBwYXJzZUlTTyhjb25maWcpIHtcbiAgICAgICAgdmFyIGksIGwsXG4gICAgICAgICAgICBzdHJpbmcgPSBjb25maWcuX2ksXG4gICAgICAgICAgICBtYXRjaCA9IGlzb1JlZ2V4LmV4ZWMoc3RyaW5nKTtcblxuICAgICAgICBpZiAobWF0Y2gpIHtcbiAgICAgICAgICAgIGNvbmZpZy5fcGYuaXNvID0gdHJ1ZTtcbiAgICAgICAgICAgIGZvciAoaSA9IDAsIGwgPSBpc29EYXRlcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgICAgICAgICBpZiAoaXNvRGF0ZXNbaV1bMV0uZXhlYyhzdHJpbmcpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIG1hdGNoWzVdIHNob3VsZCBiZSAnVCcgb3IgdW5kZWZpbmVkXG4gICAgICAgICAgICAgICAgICAgIGNvbmZpZy5fZiA9IGlzb0RhdGVzW2ldWzBdICsgKG1hdGNoWzZdIHx8ICcgJyk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvciAoaSA9IDAsIGwgPSBpc29UaW1lcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgICAgICAgICBpZiAoaXNvVGltZXNbaV1bMV0uZXhlYyhzdHJpbmcpKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbmZpZy5fZiArPSBpc29UaW1lc1tpXVswXTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHN0cmluZy5tYXRjaChwYXJzZVRva2VuVGltZXpvbmUpKSB7XG4gICAgICAgICAgICAgICAgY29uZmlnLl9mICs9ICdaJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG1ha2VEYXRlRnJvbVN0cmluZ0FuZEZvcm1hdChjb25maWcpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uZmlnLl9pc1ZhbGlkID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBkYXRlIGZyb20gaXNvIGZvcm1hdCBvciBmYWxsYmFja1xuICAgIGZ1bmN0aW9uIG1ha2VEYXRlRnJvbVN0cmluZyhjb25maWcpIHtcbiAgICAgICAgcGFyc2VJU08oY29uZmlnKTtcbiAgICAgICAgaWYgKGNvbmZpZy5faXNWYWxpZCA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIGRlbGV0ZSBjb25maWcuX2lzVmFsaWQ7XG4gICAgICAgICAgICBtb21lbnQuY3JlYXRlRnJvbUlucHV0RmFsbGJhY2soY29uZmlnKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIG1hcChhcnIsIGZuKSB7XG4gICAgICAgIHZhciByZXMgPSBbXSwgaTtcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGFyci5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgcmVzLnB1c2goZm4oYXJyW2ldLCBpKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBtYWtlRGF0ZUZyb21JbnB1dChjb25maWcpIHtcbiAgICAgICAgdmFyIGlucHV0ID0gY29uZmlnLl9pLCBtYXRjaGVkO1xuICAgICAgICBpZiAoaW5wdXQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgY29uZmlnLl9kID0gbmV3IERhdGUoKTtcbiAgICAgICAgfSBlbHNlIGlmIChpc0RhdGUoaW5wdXQpKSB7XG4gICAgICAgICAgICBjb25maWcuX2QgPSBuZXcgRGF0ZSgraW5wdXQpO1xuICAgICAgICB9IGVsc2UgaWYgKChtYXRjaGVkID0gYXNwTmV0SnNvblJlZ2V4LmV4ZWMoaW5wdXQpKSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgY29uZmlnLl9kID0gbmV3IERhdGUoK21hdGNoZWRbMV0pO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBpbnB1dCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIG1ha2VEYXRlRnJvbVN0cmluZyhjb25maWcpO1xuICAgICAgICB9IGVsc2UgaWYgKGlzQXJyYXkoaW5wdXQpKSB7XG4gICAgICAgICAgICBjb25maWcuX2EgPSBtYXAoaW5wdXQuc2xpY2UoMCksIGZ1bmN0aW9uIChvYmopIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VJbnQob2JqLCAxMCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGRhdGVGcm9tQ29uZmlnKGNvbmZpZyk7XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mKGlucHV0KSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgIGRhdGVGcm9tT2JqZWN0KGNvbmZpZyk7XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mKGlucHV0KSA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgICAgIC8vIGZyb20gbWlsbGlzZWNvbmRzXG4gICAgICAgICAgICBjb25maWcuX2QgPSBuZXcgRGF0ZShpbnB1dCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBtb21lbnQuY3JlYXRlRnJvbUlucHV0RmFsbGJhY2soY29uZmlnKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIG1ha2VEYXRlKHksIG0sIGQsIGgsIE0sIHMsIG1zKSB7XG4gICAgICAgIC8vY2FuJ3QganVzdCBhcHBseSgpIHRvIGNyZWF0ZSBhIGRhdGU6XG4gICAgICAgIC8vaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8xODEzNDgvaW5zdGFudGlhdGluZy1hLWphdmFzY3JpcHQtb2JqZWN0LWJ5LWNhbGxpbmctcHJvdG90eXBlLWNvbnN0cnVjdG9yLWFwcGx5XG4gICAgICAgIHZhciBkYXRlID0gbmV3IERhdGUoeSwgbSwgZCwgaCwgTSwgcywgbXMpO1xuXG4gICAgICAgIC8vdGhlIGRhdGUgY29uc3RydWN0b3IgZG9lc24ndCBhY2NlcHQgeWVhcnMgPCAxOTcwXG4gICAgICAgIGlmICh5IDwgMTk3MCkge1xuICAgICAgICAgICAgZGF0ZS5zZXRGdWxsWWVhcih5KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZGF0ZTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBtYWtlVVRDRGF0ZSh5KSB7XG4gICAgICAgIHZhciBkYXRlID0gbmV3IERhdGUoRGF0ZS5VVEMuYXBwbHkobnVsbCwgYXJndW1lbnRzKSk7XG4gICAgICAgIGlmICh5IDwgMTk3MCkge1xuICAgICAgICAgICAgZGF0ZS5zZXRVVENGdWxsWWVhcih5KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZGF0ZTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwYXJzZVdlZWtkYXkoaW5wdXQsIGxvY2FsZSkge1xuICAgICAgICBpZiAodHlwZW9mIGlucHV0ID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgaWYgKCFpc05hTihpbnB1dCkpIHtcbiAgICAgICAgICAgICAgICBpbnB1dCA9IHBhcnNlSW50KGlucHV0LCAxMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBpbnB1dCA9IGxvY2FsZS53ZWVrZGF5c1BhcnNlKGlucHV0KTtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGlucHV0ICE9PSAnbnVtYmVyJykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGlucHV0O1xuICAgIH1cblxuICAgIC8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAgICAgICAgUmVsYXRpdmUgVGltZVxuICAgICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuXG4gICAgLy8gaGVscGVyIGZ1bmN0aW9uIGZvciBtb21lbnQuZm4uZnJvbSwgbW9tZW50LmZuLmZyb21Ob3csIGFuZCBtb21lbnQuZHVyYXRpb24uZm4uaHVtYW5pemVcbiAgICBmdW5jdGlvbiBzdWJzdGl0dXRlVGltZUFnbyhzdHJpbmcsIG51bWJlciwgd2l0aG91dFN1ZmZpeCwgaXNGdXR1cmUsIGxvY2FsZSkge1xuICAgICAgICByZXR1cm4gbG9jYWxlLnJlbGF0aXZlVGltZShudW1iZXIgfHwgMSwgISF3aXRob3V0U3VmZml4LCBzdHJpbmcsIGlzRnV0dXJlKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiByZWxhdGl2ZVRpbWUocG9zTmVnRHVyYXRpb24sIHdpdGhvdXRTdWZmaXgsIGxvY2FsZSkge1xuICAgICAgICB2YXIgZHVyYXRpb24gPSBtb21lbnQuZHVyYXRpb24ocG9zTmVnRHVyYXRpb24pLmFicygpLFxuICAgICAgICAgICAgc2Vjb25kcyA9IHJvdW5kKGR1cmF0aW9uLmFzKCdzJykpLFxuICAgICAgICAgICAgbWludXRlcyA9IHJvdW5kKGR1cmF0aW9uLmFzKCdtJykpLFxuICAgICAgICAgICAgaG91cnMgPSByb3VuZChkdXJhdGlvbi5hcygnaCcpKSxcbiAgICAgICAgICAgIGRheXMgPSByb3VuZChkdXJhdGlvbi5hcygnZCcpKSxcbiAgICAgICAgICAgIG1vbnRocyA9IHJvdW5kKGR1cmF0aW9uLmFzKCdNJykpLFxuICAgICAgICAgICAgeWVhcnMgPSByb3VuZChkdXJhdGlvbi5hcygneScpKSxcblxuICAgICAgICAgICAgYXJncyA9IHNlY29uZHMgPCByZWxhdGl2ZVRpbWVUaHJlc2hvbGRzLnMgJiYgWydzJywgc2Vjb25kc10gfHxcbiAgICAgICAgICAgICAgICBtaW51dGVzID09PSAxICYmIFsnbSddIHx8XG4gICAgICAgICAgICAgICAgbWludXRlcyA8IHJlbGF0aXZlVGltZVRocmVzaG9sZHMubSAmJiBbJ21tJywgbWludXRlc10gfHxcbiAgICAgICAgICAgICAgICBob3VycyA9PT0gMSAmJiBbJ2gnXSB8fFxuICAgICAgICAgICAgICAgIGhvdXJzIDwgcmVsYXRpdmVUaW1lVGhyZXNob2xkcy5oICYmIFsnaGgnLCBob3Vyc10gfHxcbiAgICAgICAgICAgICAgICBkYXlzID09PSAxICYmIFsnZCddIHx8XG4gICAgICAgICAgICAgICAgZGF5cyA8IHJlbGF0aXZlVGltZVRocmVzaG9sZHMuZCAmJiBbJ2RkJywgZGF5c10gfHxcbiAgICAgICAgICAgICAgICBtb250aHMgPT09IDEgJiYgWydNJ10gfHxcbiAgICAgICAgICAgICAgICBtb250aHMgPCByZWxhdGl2ZVRpbWVUaHJlc2hvbGRzLk0gJiYgWydNTScsIG1vbnRoc10gfHxcbiAgICAgICAgICAgICAgICB5ZWFycyA9PT0gMSAmJiBbJ3knXSB8fCBbJ3l5JywgeWVhcnNdO1xuXG4gICAgICAgIGFyZ3NbMl0gPSB3aXRob3V0U3VmZml4O1xuICAgICAgICBhcmdzWzNdID0gK3Bvc05lZ0R1cmF0aW9uID4gMDtcbiAgICAgICAgYXJnc1s0XSA9IGxvY2FsZTtcbiAgICAgICAgcmV0dXJuIHN1YnN0aXR1dGVUaW1lQWdvLmFwcGx5KHt9LCBhcmdzKTtcbiAgICB9XG5cblxuICAgIC8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAgICAgICAgV2VlayBvZiBZZWFyXG4gICAgKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG5cbiAgICAvLyBmaXJzdERheU9mV2VlayAgICAgICAwID0gc3VuLCA2ID0gc2F0XG4gICAgLy8gICAgICAgICAgICAgICAgICAgICAgdGhlIGRheSBvZiB0aGUgd2VlayB0aGF0IHN0YXJ0cyB0aGUgd2Vla1xuICAgIC8vICAgICAgICAgICAgICAgICAgICAgICh1c3VhbGx5IHN1bmRheSBvciBtb25kYXkpXG4gICAgLy8gZmlyc3REYXlPZldlZWtPZlllYXIgMCA9IHN1biwgNiA9IHNhdFxuICAgIC8vICAgICAgICAgICAgICAgICAgICAgIHRoZSBmaXJzdCB3ZWVrIGlzIHRoZSB3ZWVrIHRoYXQgY29udGFpbnMgdGhlIGZpcnN0XG4gICAgLy8gICAgICAgICAgICAgICAgICAgICAgb2YgdGhpcyBkYXkgb2YgdGhlIHdlZWtcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgICAoZWcuIElTTyB3ZWVrcyB1c2UgdGh1cnNkYXkgKDQpKVxuICAgIGZ1bmN0aW9uIHdlZWtPZlllYXIobW9tLCBmaXJzdERheU9mV2VlaywgZmlyc3REYXlPZldlZWtPZlllYXIpIHtcbiAgICAgICAgdmFyIGVuZCA9IGZpcnN0RGF5T2ZXZWVrT2ZZZWFyIC0gZmlyc3REYXlPZldlZWssXG4gICAgICAgICAgICBkYXlzVG9EYXlPZldlZWsgPSBmaXJzdERheU9mV2Vla09mWWVhciAtIG1vbS5kYXkoKSxcbiAgICAgICAgICAgIGFkanVzdGVkTW9tZW50O1xuXG5cbiAgICAgICAgaWYgKGRheXNUb0RheU9mV2VlayA+IGVuZCkge1xuICAgICAgICAgICAgZGF5c1RvRGF5T2ZXZWVrIC09IDc7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZGF5c1RvRGF5T2ZXZWVrIDwgZW5kIC0gNykge1xuICAgICAgICAgICAgZGF5c1RvRGF5T2ZXZWVrICs9IDc7XG4gICAgICAgIH1cblxuICAgICAgICBhZGp1c3RlZE1vbWVudCA9IG1vbWVudChtb20pLmFkZChkYXlzVG9EYXlPZldlZWssICdkJyk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB3ZWVrOiBNYXRoLmNlaWwoYWRqdXN0ZWRNb21lbnQuZGF5T2ZZZWFyKCkgLyA3KSxcbiAgICAgICAgICAgIHllYXI6IGFkanVzdGVkTW9tZW50LnllYXIoKVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9JU09fd2Vla19kYXRlI0NhbGN1bGF0aW5nX2FfZGF0ZV9naXZlbl90aGVfeWVhci4yQ193ZWVrX251bWJlcl9hbmRfd2Vla2RheVxuICAgIGZ1bmN0aW9uIGRheU9mWWVhckZyb21XZWVrcyh5ZWFyLCB3ZWVrLCB3ZWVrZGF5LCBmaXJzdERheU9mV2Vla09mWWVhciwgZmlyc3REYXlPZldlZWspIHtcbiAgICAgICAgdmFyIGQgPSBtYWtlVVRDRGF0ZSh5ZWFyLCAwLCAxKS5nZXRVVENEYXkoKSwgZGF5c1RvQWRkLCBkYXlPZlllYXI7XG5cbiAgICAgICAgZCA9IGQgPT09IDAgPyA3IDogZDtcbiAgICAgICAgd2Vla2RheSA9IHdlZWtkYXkgIT0gbnVsbCA/IHdlZWtkYXkgOiBmaXJzdERheU9mV2VlaztcbiAgICAgICAgZGF5c1RvQWRkID0gZmlyc3REYXlPZldlZWsgLSBkICsgKGQgPiBmaXJzdERheU9mV2Vla09mWWVhciA/IDcgOiAwKSAtIChkIDwgZmlyc3REYXlPZldlZWsgPyA3IDogMCk7XG4gICAgICAgIGRheU9mWWVhciA9IDcgKiAod2VlayAtIDEpICsgKHdlZWtkYXkgLSBmaXJzdERheU9mV2VlaykgKyBkYXlzVG9BZGQgKyAxO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB5ZWFyOiBkYXlPZlllYXIgPiAwID8geWVhciA6IHllYXIgLSAxLFxuICAgICAgICAgICAgZGF5T2ZZZWFyOiBkYXlPZlllYXIgPiAwID8gIGRheU9mWWVhciA6IGRheXNJblllYXIoeWVhciAtIDEpICsgZGF5T2ZZZWFyXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICAgICAgICBUb3AgTGV2ZWwgRnVuY3Rpb25zXG4gICAgKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG4gICAgZnVuY3Rpb24gbWFrZU1vbWVudChjb25maWcpIHtcbiAgICAgICAgdmFyIGlucHV0ID0gY29uZmlnLl9pLFxuICAgICAgICAgICAgZm9ybWF0ID0gY29uZmlnLl9mLFxuICAgICAgICAgICAgcmVzO1xuXG4gICAgICAgIGNvbmZpZy5fbG9jYWxlID0gY29uZmlnLl9sb2NhbGUgfHwgbW9tZW50LmxvY2FsZURhdGEoY29uZmlnLl9sKTtcblxuICAgICAgICBpZiAoaW5wdXQgPT09IG51bGwgfHwgKGZvcm1hdCA9PT0gdW5kZWZpbmVkICYmIGlucHV0ID09PSAnJykpIHtcbiAgICAgICAgICAgIHJldHVybiBtb21lbnQuaW52YWxpZCh7bnVsbElucHV0OiB0cnVlfSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZW9mIGlucHV0ID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgY29uZmlnLl9pID0gaW5wdXQgPSBjb25maWcuX2xvY2FsZS5wcmVwYXJzZShpbnB1dCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobW9tZW50LmlzTW9tZW50KGlucHV0KSkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBNb21lbnQoaW5wdXQsIHRydWUpO1xuICAgICAgICB9IGVsc2UgaWYgKGZvcm1hdCkge1xuICAgICAgICAgICAgaWYgKGlzQXJyYXkoZm9ybWF0KSkge1xuICAgICAgICAgICAgICAgIG1ha2VEYXRlRnJvbVN0cmluZ0FuZEFycmF5KGNvbmZpZyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG1ha2VEYXRlRnJvbVN0cmluZ0FuZEZvcm1hdChjb25maWcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbWFrZURhdGVGcm9tSW5wdXQoY29uZmlnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJlcyA9IG5ldyBNb21lbnQoY29uZmlnKTtcbiAgICAgICAgaWYgKHJlcy5fbmV4dERheSkge1xuICAgICAgICAgICAgLy8gQWRkaW5nIGlzIHNtYXJ0IGVub3VnaCBhcm91bmQgRFNUXG4gICAgICAgICAgICByZXMuYWRkKDEsICdkJyk7XG4gICAgICAgICAgICByZXMuX25leHREYXkgPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH1cblxuICAgIG1vbWVudCA9IGZ1bmN0aW9uIChpbnB1dCwgZm9ybWF0LCBsb2NhbGUsIHN0cmljdCkge1xuICAgICAgICB2YXIgYztcblxuICAgICAgICBpZiAodHlwZW9mKGxvY2FsZSkgPT09ICdib29sZWFuJykge1xuICAgICAgICAgICAgc3RyaWN0ID0gbG9jYWxlO1xuICAgICAgICAgICAgbG9jYWxlID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgICAgIC8vIG9iamVjdCBjb25zdHJ1Y3Rpb24gbXVzdCBiZSBkb25lIHRoaXMgd2F5LlxuICAgICAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vbW9tZW50L21vbWVudC9pc3N1ZXMvMTQyM1xuICAgICAgICBjID0ge307XG4gICAgICAgIGMuX2lzQU1vbWVudE9iamVjdCA9IHRydWU7XG4gICAgICAgIGMuX2kgPSBpbnB1dDtcbiAgICAgICAgYy5fZiA9IGZvcm1hdDtcbiAgICAgICAgYy5fbCA9IGxvY2FsZTtcbiAgICAgICAgYy5fc3RyaWN0ID0gc3RyaWN0O1xuICAgICAgICBjLl9pc1VUQyA9IGZhbHNlO1xuICAgICAgICBjLl9wZiA9IGRlZmF1bHRQYXJzaW5nRmxhZ3MoKTtcblxuICAgICAgICByZXR1cm4gbWFrZU1vbWVudChjKTtcbiAgICB9O1xuXG4gICAgbW9tZW50LnN1cHByZXNzRGVwcmVjYXRpb25XYXJuaW5ncyA9IGZhbHNlO1xuXG4gICAgbW9tZW50LmNyZWF0ZUZyb21JbnB1dEZhbGxiYWNrID0gZGVwcmVjYXRlKFxuICAgICAgICAnbW9tZW50IGNvbnN0cnVjdGlvbiBmYWxscyBiYWNrIHRvIGpzIERhdGUuIFRoaXMgaXMgJyArXG4gICAgICAgICdkaXNjb3VyYWdlZCBhbmQgd2lsbCBiZSByZW1vdmVkIGluIHVwY29taW5nIG1ham9yICcgK1xuICAgICAgICAncmVsZWFzZS4gUGxlYXNlIHJlZmVyIHRvICcgK1xuICAgICAgICAnaHR0cHM6Ly9naXRodWIuY29tL21vbWVudC9tb21lbnQvaXNzdWVzLzE0MDcgZm9yIG1vcmUgaW5mby4nLFxuICAgICAgICBmdW5jdGlvbiAoY29uZmlnKSB7XG4gICAgICAgICAgICBjb25maWcuX2QgPSBuZXcgRGF0ZShjb25maWcuX2kgKyAoY29uZmlnLl91c2VVVEMgPyAnIFVUQycgOiAnJykpO1xuICAgICAgICB9XG4gICAgKTtcblxuICAgIC8vIFBpY2sgYSBtb21lbnQgbSBmcm9tIG1vbWVudHMgc28gdGhhdCBtW2ZuXShvdGhlcikgaXMgdHJ1ZSBmb3IgYWxsXG4gICAgLy8gb3RoZXIuIFRoaXMgcmVsaWVzIG9uIHRoZSBmdW5jdGlvbiBmbiB0byBiZSB0cmFuc2l0aXZlLlxuICAgIC8vXG4gICAgLy8gbW9tZW50cyBzaG91bGQgZWl0aGVyIGJlIGFuIGFycmF5IG9mIG1vbWVudCBvYmplY3RzIG9yIGFuIGFycmF5LCB3aG9zZVxuICAgIC8vIGZpcnN0IGVsZW1lbnQgaXMgYW4gYXJyYXkgb2YgbW9tZW50IG9iamVjdHMuXG4gICAgZnVuY3Rpb24gcGlja0J5KGZuLCBtb21lbnRzKSB7XG4gICAgICAgIHZhciByZXMsIGk7XG4gICAgICAgIGlmIChtb21lbnRzLmxlbmd0aCA9PT0gMSAmJiBpc0FycmF5KG1vbWVudHNbMF0pKSB7XG4gICAgICAgICAgICBtb21lbnRzID0gbW9tZW50c1swXTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIW1vbWVudHMubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4gbW9tZW50KCk7XG4gICAgICAgIH1cbiAgICAgICAgcmVzID0gbW9tZW50c1swXTtcbiAgICAgICAgZm9yIChpID0gMTsgaSA8IG1vbWVudHMubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgIGlmIChtb21lbnRzW2ldW2ZuXShyZXMpKSB7XG4gICAgICAgICAgICAgICAgcmVzID0gbW9tZW50c1tpXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH1cblxuICAgIG1vbWVudC5taW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBhcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMsIDApO1xuXG4gICAgICAgIHJldHVybiBwaWNrQnkoJ2lzQmVmb3JlJywgYXJncyk7XG4gICAgfTtcblxuICAgIG1vbWVudC5tYXggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBhcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMsIDApO1xuXG4gICAgICAgIHJldHVybiBwaWNrQnkoJ2lzQWZ0ZXInLCBhcmdzKTtcbiAgICB9O1xuXG4gICAgLy8gY3JlYXRpbmcgd2l0aCB1dGNcbiAgICBtb21lbnQudXRjID0gZnVuY3Rpb24gKGlucHV0LCBmb3JtYXQsIGxvY2FsZSwgc3RyaWN0KSB7XG4gICAgICAgIHZhciBjO1xuXG4gICAgICAgIGlmICh0eXBlb2YobG9jYWxlKSA9PT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgICBzdHJpY3QgPSBsb2NhbGU7XG4gICAgICAgICAgICBsb2NhbGUgPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICAgICAgLy8gb2JqZWN0IGNvbnN0cnVjdGlvbiBtdXN0IGJlIGRvbmUgdGhpcyB3YXkuXG4gICAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9tb21lbnQvbW9tZW50L2lzc3Vlcy8xNDIzXG4gICAgICAgIGMgPSB7fTtcbiAgICAgICAgYy5faXNBTW9tZW50T2JqZWN0ID0gdHJ1ZTtcbiAgICAgICAgYy5fdXNlVVRDID0gdHJ1ZTtcbiAgICAgICAgYy5faXNVVEMgPSB0cnVlO1xuICAgICAgICBjLl9sID0gbG9jYWxlO1xuICAgICAgICBjLl9pID0gaW5wdXQ7XG4gICAgICAgIGMuX2YgPSBmb3JtYXQ7XG4gICAgICAgIGMuX3N0cmljdCA9IHN0cmljdDtcbiAgICAgICAgYy5fcGYgPSBkZWZhdWx0UGFyc2luZ0ZsYWdzKCk7XG5cbiAgICAgICAgcmV0dXJuIG1ha2VNb21lbnQoYykudXRjKCk7XG4gICAgfTtcblxuICAgIC8vIGNyZWF0aW5nIHdpdGggdW5peCB0aW1lc3RhbXAgKGluIHNlY29uZHMpXG4gICAgbW9tZW50LnVuaXggPSBmdW5jdGlvbiAoaW5wdXQpIHtcbiAgICAgICAgcmV0dXJuIG1vbWVudChpbnB1dCAqIDEwMDApO1xuICAgIH07XG5cbiAgICAvLyBkdXJhdGlvblxuICAgIG1vbWVudC5kdXJhdGlvbiA9IGZ1bmN0aW9uIChpbnB1dCwga2V5KSB7XG4gICAgICAgIHZhciBkdXJhdGlvbiA9IGlucHV0LFxuICAgICAgICAgICAgLy8gbWF0Y2hpbmcgYWdhaW5zdCByZWdleHAgaXMgZXhwZW5zaXZlLCBkbyBpdCBvbiBkZW1hbmRcbiAgICAgICAgICAgIG1hdGNoID0gbnVsbCxcbiAgICAgICAgICAgIHNpZ24sXG4gICAgICAgICAgICByZXQsXG4gICAgICAgICAgICBwYXJzZUlzbyxcbiAgICAgICAgICAgIGRpZmZSZXM7XG5cbiAgICAgICAgaWYgKG1vbWVudC5pc0R1cmF0aW9uKGlucHV0KSkge1xuICAgICAgICAgICAgZHVyYXRpb24gPSB7XG4gICAgICAgICAgICAgICAgbXM6IGlucHV0Ll9taWxsaXNlY29uZHMsXG4gICAgICAgICAgICAgICAgZDogaW5wdXQuX2RheXMsXG4gICAgICAgICAgICAgICAgTTogaW5wdXQuX21vbnRoc1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgaW5wdXQgPT09ICdudW1iZXInKSB7XG4gICAgICAgICAgICBkdXJhdGlvbiA9IHt9O1xuICAgICAgICAgICAgaWYgKGtleSkge1xuICAgICAgICAgICAgICAgIGR1cmF0aW9uW2tleV0gPSBpbnB1dDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZHVyYXRpb24ubWlsbGlzZWNvbmRzID0gaW5wdXQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoISEobWF0Y2ggPSBhc3BOZXRUaW1lU3Bhbkpzb25SZWdleC5leGVjKGlucHV0KSkpIHtcbiAgICAgICAgICAgIHNpZ24gPSAobWF0Y2hbMV0gPT09ICctJykgPyAtMSA6IDE7XG4gICAgICAgICAgICBkdXJhdGlvbiA9IHtcbiAgICAgICAgICAgICAgICB5OiAwLFxuICAgICAgICAgICAgICAgIGQ6IHRvSW50KG1hdGNoW0RBVEVdKSAqIHNpZ24sXG4gICAgICAgICAgICAgICAgaDogdG9JbnQobWF0Y2hbSE9VUl0pICogc2lnbixcbiAgICAgICAgICAgICAgICBtOiB0b0ludChtYXRjaFtNSU5VVEVdKSAqIHNpZ24sXG4gICAgICAgICAgICAgICAgczogdG9JbnQobWF0Y2hbU0VDT05EXSkgKiBzaWduLFxuICAgICAgICAgICAgICAgIG1zOiB0b0ludChtYXRjaFtNSUxMSVNFQ09ORF0pICogc2lnblxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBlbHNlIGlmICghIShtYXRjaCA9IGlzb0R1cmF0aW9uUmVnZXguZXhlYyhpbnB1dCkpKSB7XG4gICAgICAgICAgICBzaWduID0gKG1hdGNoWzFdID09PSAnLScpID8gLTEgOiAxO1xuICAgICAgICAgICAgcGFyc2VJc28gPSBmdW5jdGlvbiAoaW5wKSB7XG4gICAgICAgICAgICAgICAgLy8gV2UnZCBub3JtYWxseSB1c2Ugfn5pbnAgZm9yIHRoaXMsIGJ1dCB1bmZvcnR1bmF0ZWx5IGl0IGFsc29cbiAgICAgICAgICAgICAgICAvLyBjb252ZXJ0cyBmbG9hdHMgdG8gaW50cy5cbiAgICAgICAgICAgICAgICAvLyBpbnAgbWF5IGJlIHVuZGVmaW5lZCwgc28gY2FyZWZ1bCBjYWxsaW5nIHJlcGxhY2Ugb24gaXQuXG4gICAgICAgICAgICAgICAgdmFyIHJlcyA9IGlucCAmJiBwYXJzZUZsb2F0KGlucC5yZXBsYWNlKCcsJywgJy4nKSk7XG4gICAgICAgICAgICAgICAgLy8gYXBwbHkgc2lnbiB3aGlsZSB3ZSdyZSBhdCBpdFxuICAgICAgICAgICAgICAgIHJldHVybiAoaXNOYU4ocmVzKSA/IDAgOiByZXMpICogc2lnbjtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBkdXJhdGlvbiA9IHtcbiAgICAgICAgICAgICAgICB5OiBwYXJzZUlzbyhtYXRjaFsyXSksXG4gICAgICAgICAgICAgICAgTTogcGFyc2VJc28obWF0Y2hbM10pLFxuICAgICAgICAgICAgICAgIGQ6IHBhcnNlSXNvKG1hdGNoWzRdKSxcbiAgICAgICAgICAgICAgICBoOiBwYXJzZUlzbyhtYXRjaFs1XSksXG4gICAgICAgICAgICAgICAgbTogcGFyc2VJc28obWF0Y2hbNl0pLFxuICAgICAgICAgICAgICAgIHM6IHBhcnNlSXNvKG1hdGNoWzddKSxcbiAgICAgICAgICAgICAgICB3OiBwYXJzZUlzbyhtYXRjaFs4XSlcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGR1cmF0aW9uID09PSAnb2JqZWN0JyAmJlxuICAgICAgICAgICAgICAgICgnZnJvbScgaW4gZHVyYXRpb24gfHwgJ3RvJyBpbiBkdXJhdGlvbikpIHtcbiAgICAgICAgICAgIGRpZmZSZXMgPSBtb21lbnRzRGlmZmVyZW5jZShtb21lbnQoZHVyYXRpb24uZnJvbSksIG1vbWVudChkdXJhdGlvbi50bykpO1xuXG4gICAgICAgICAgICBkdXJhdGlvbiA9IHt9O1xuICAgICAgICAgICAgZHVyYXRpb24ubXMgPSBkaWZmUmVzLm1pbGxpc2Vjb25kcztcbiAgICAgICAgICAgIGR1cmF0aW9uLk0gPSBkaWZmUmVzLm1vbnRocztcbiAgICAgICAgfVxuXG4gICAgICAgIHJldCA9IG5ldyBEdXJhdGlvbihkdXJhdGlvbik7XG5cbiAgICAgICAgaWYgKG1vbWVudC5pc0R1cmF0aW9uKGlucHV0KSAmJiBoYXNPd25Qcm9wKGlucHV0LCAnX2xvY2FsZScpKSB7XG4gICAgICAgICAgICByZXQuX2xvY2FsZSA9IGlucHV0Ll9sb2NhbGU7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcmV0O1xuICAgIH07XG5cbiAgICAvLyB2ZXJzaW9uIG51bWJlclxuICAgIG1vbWVudC52ZXJzaW9uID0gVkVSU0lPTjtcblxuICAgIC8vIGRlZmF1bHQgZm9ybWF0XG4gICAgbW9tZW50LmRlZmF1bHRGb3JtYXQgPSBpc29Gb3JtYXQ7XG5cbiAgICAvLyBjb25zdGFudCB0aGF0IHJlZmVycyB0byB0aGUgSVNPIHN0YW5kYXJkXG4gICAgbW9tZW50LklTT184NjAxID0gZnVuY3Rpb24gKCkge307XG5cbiAgICAvLyBQbHVnaW5zIHRoYXQgYWRkIHByb3BlcnRpZXMgc2hvdWxkIGFsc28gYWRkIHRoZSBrZXkgaGVyZSAobnVsbCB2YWx1ZSksXG4gICAgLy8gc28gd2UgY2FuIHByb3Blcmx5IGNsb25lIG91cnNlbHZlcy5cbiAgICBtb21lbnQubW9tZW50UHJvcGVydGllcyA9IG1vbWVudFByb3BlcnRpZXM7XG5cbiAgICAvLyBUaGlzIGZ1bmN0aW9uIHdpbGwgYmUgY2FsbGVkIHdoZW5ldmVyIGEgbW9tZW50IGlzIG11dGF0ZWQuXG4gICAgLy8gSXQgaXMgaW50ZW5kZWQgdG8ga2VlcCB0aGUgb2Zmc2V0IGluIHN5bmMgd2l0aCB0aGUgdGltZXpvbmUuXG4gICAgbW9tZW50LnVwZGF0ZU9mZnNldCA9IGZ1bmN0aW9uICgpIHt9O1xuXG4gICAgLy8gVGhpcyBmdW5jdGlvbiBhbGxvd3MgeW91IHRvIHNldCBhIHRocmVzaG9sZCBmb3IgcmVsYXRpdmUgdGltZSBzdHJpbmdzXG4gICAgbW9tZW50LnJlbGF0aXZlVGltZVRocmVzaG9sZCA9IGZ1bmN0aW9uICh0aHJlc2hvbGQsIGxpbWl0KSB7XG4gICAgICAgIGlmIChyZWxhdGl2ZVRpbWVUaHJlc2hvbGRzW3RocmVzaG9sZF0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChsaW1pdCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICByZXR1cm4gcmVsYXRpdmVUaW1lVGhyZXNob2xkc1t0aHJlc2hvbGRdO1xuICAgICAgICB9XG4gICAgICAgIHJlbGF0aXZlVGltZVRocmVzaG9sZHNbdGhyZXNob2xkXSA9IGxpbWl0O1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9O1xuXG4gICAgbW9tZW50LmxhbmcgPSBkZXByZWNhdGUoXG4gICAgICAgICdtb21lbnQubGFuZyBpcyBkZXByZWNhdGVkLiBVc2UgbW9tZW50LmxvY2FsZSBpbnN0ZWFkLicsXG4gICAgICAgIGZ1bmN0aW9uIChrZXksIHZhbHVlKSB7XG4gICAgICAgICAgICByZXR1cm4gbW9tZW50LmxvY2FsZShrZXksIHZhbHVlKTtcbiAgICAgICAgfVxuICAgICk7XG5cbiAgICAvLyBUaGlzIGZ1bmN0aW9uIHdpbGwgbG9hZCBsb2NhbGUgYW5kIHRoZW4gc2V0IHRoZSBnbG9iYWwgbG9jYWxlLiAgSWZcbiAgICAvLyBubyBhcmd1bWVudHMgYXJlIHBhc3NlZCBpbiwgaXQgd2lsbCBzaW1wbHkgcmV0dXJuIHRoZSBjdXJyZW50IGdsb2JhbFxuICAgIC8vIGxvY2FsZSBrZXkuXG4gICAgbW9tZW50LmxvY2FsZSA9IGZ1bmN0aW9uIChrZXksIHZhbHVlcykge1xuICAgICAgICB2YXIgZGF0YTtcbiAgICAgICAgaWYgKGtleSkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZih2YWx1ZXMpICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIGRhdGEgPSBtb21lbnQuZGVmaW5lTG9jYWxlKGtleSwgdmFsdWVzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGRhdGEgPSBtb21lbnQubG9jYWxlRGF0YShrZXkpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoZGF0YSkge1xuICAgICAgICAgICAgICAgIG1vbWVudC5kdXJhdGlvbi5fbG9jYWxlID0gbW9tZW50Ll9sb2NhbGUgPSBkYXRhO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG1vbWVudC5fbG9jYWxlLl9hYmJyO1xuICAgIH07XG5cbiAgICBtb21lbnQuZGVmaW5lTG9jYWxlID0gZnVuY3Rpb24gKG5hbWUsIHZhbHVlcykge1xuICAgICAgICBpZiAodmFsdWVzICE9PSBudWxsKSB7XG4gICAgICAgICAgICB2YWx1ZXMuYWJiciA9IG5hbWU7XG4gICAgICAgICAgICBpZiAoIWxvY2FsZXNbbmFtZV0pIHtcbiAgICAgICAgICAgICAgICBsb2NhbGVzW25hbWVdID0gbmV3IExvY2FsZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbG9jYWxlc1tuYW1lXS5zZXQodmFsdWVzKTtcblxuICAgICAgICAgICAgLy8gYmFja3dhcmRzIGNvbXBhdCBmb3Igbm93OiBhbHNvIHNldCB0aGUgbG9jYWxlXG4gICAgICAgICAgICBtb21lbnQubG9jYWxlKG5hbWUpO1xuXG4gICAgICAgICAgICByZXR1cm4gbG9jYWxlc1tuYW1lXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIHVzZWZ1bCBmb3IgdGVzdGluZ1xuICAgICAgICAgICAgZGVsZXRlIGxvY2FsZXNbbmFtZV07XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBtb21lbnQubGFuZ0RhdGEgPSBkZXByZWNhdGUoXG4gICAgICAgICdtb21lbnQubGFuZ0RhdGEgaXMgZGVwcmVjYXRlZC4gVXNlIG1vbWVudC5sb2NhbGVEYXRhIGluc3RlYWQuJyxcbiAgICAgICAgZnVuY3Rpb24gKGtleSkge1xuICAgICAgICAgICAgcmV0dXJuIG1vbWVudC5sb2NhbGVEYXRhKGtleSk7XG4gICAgICAgIH1cbiAgICApO1xuXG4gICAgLy8gcmV0dXJucyBsb2NhbGUgZGF0YVxuICAgIG1vbWVudC5sb2NhbGVEYXRhID0gZnVuY3Rpb24gKGtleSkge1xuICAgICAgICB2YXIgbG9jYWxlO1xuXG4gICAgICAgIGlmIChrZXkgJiYga2V5Ll9sb2NhbGUgJiYga2V5Ll9sb2NhbGUuX2FiYnIpIHtcbiAgICAgICAgICAgIGtleSA9IGtleS5fbG9jYWxlLl9hYmJyO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFrZXkpIHtcbiAgICAgICAgICAgIHJldHVybiBtb21lbnQuX2xvY2FsZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghaXNBcnJheShrZXkpKSB7XG4gICAgICAgICAgICAvL3Nob3J0LWNpcmN1aXQgZXZlcnl0aGluZyBlbHNlXG4gICAgICAgICAgICBsb2NhbGUgPSBsb2FkTG9jYWxlKGtleSk7XG4gICAgICAgICAgICBpZiAobG9jYWxlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxvY2FsZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGtleSA9IFtrZXldO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGNob29zZUxvY2FsZShrZXkpO1xuICAgIH07XG5cbiAgICAvLyBjb21wYXJlIG1vbWVudCBvYmplY3RcbiAgICBtb21lbnQuaXNNb21lbnQgPSBmdW5jdGlvbiAob2JqKSB7XG4gICAgICAgIHJldHVybiBvYmogaW5zdGFuY2VvZiBNb21lbnQgfHxcbiAgICAgICAgICAgIChvYmogIT0gbnVsbCAmJiBoYXNPd25Qcm9wKG9iaiwgJ19pc0FNb21lbnRPYmplY3QnKSk7XG4gICAgfTtcblxuICAgIC8vIGZvciB0eXBlY2hlY2tpbmcgRHVyYXRpb24gb2JqZWN0c1xuICAgIG1vbWVudC5pc0R1cmF0aW9uID0gZnVuY3Rpb24gKG9iaikge1xuICAgICAgICByZXR1cm4gb2JqIGluc3RhbmNlb2YgRHVyYXRpb247XG4gICAgfTtcblxuICAgIGZvciAoaSA9IGxpc3RzLmxlbmd0aCAtIDE7IGkgPj0gMDsgLS1pKSB7XG4gICAgICAgIG1ha2VMaXN0KGxpc3RzW2ldKTtcbiAgICB9XG5cbiAgICBtb21lbnQubm9ybWFsaXplVW5pdHMgPSBmdW5jdGlvbiAodW5pdHMpIHtcbiAgICAgICAgcmV0dXJuIG5vcm1hbGl6ZVVuaXRzKHVuaXRzKTtcbiAgICB9O1xuXG4gICAgbW9tZW50LmludmFsaWQgPSBmdW5jdGlvbiAoZmxhZ3MpIHtcbiAgICAgICAgdmFyIG0gPSBtb21lbnQudXRjKE5hTik7XG4gICAgICAgIGlmIChmbGFncyAhPSBudWxsKSB7XG4gICAgICAgICAgICBleHRlbmQobS5fcGYsIGZsYWdzKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIG0uX3BmLnVzZXJJbnZhbGlkYXRlZCA9IHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbTtcbiAgICB9O1xuXG4gICAgbW9tZW50LnBhcnNlWm9uZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIG1vbWVudC5hcHBseShudWxsLCBhcmd1bWVudHMpLnBhcnNlWm9uZSgpO1xuICAgIH07XG5cbiAgICBtb21lbnQucGFyc2VUd29EaWdpdFllYXIgPSBmdW5jdGlvbiAoaW5wdXQpIHtcbiAgICAgICAgcmV0dXJuIHRvSW50KGlucHV0KSArICh0b0ludChpbnB1dCkgPiA2OCA/IDE5MDAgOiAyMDAwKTtcbiAgICB9O1xuXG4gICAgLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICAgICAgICBNb21lbnQgUHJvdG90eXBlXG4gICAgKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG5cbiAgICBleHRlbmQobW9tZW50LmZuID0gTW9tZW50LnByb3RvdHlwZSwge1xuXG4gICAgICAgIGNsb25lIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIG1vbWVudCh0aGlzKTtcbiAgICAgICAgfSxcblxuICAgICAgICB2YWx1ZU9mIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuICt0aGlzLl9kICsgKCh0aGlzLl9vZmZzZXQgfHwgMCkgKiA2MDAwMCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgdW5peCA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBNYXRoLmZsb29yKCt0aGlzIC8gMTAwMCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgdG9TdHJpbmcgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jbG9uZSgpLmxvY2FsZSgnZW4nKS5mb3JtYXQoJ2RkZCBNTU0gREQgWVlZWSBISDptbTpzcyBbR01UXVpaJyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgdG9EYXRlIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX29mZnNldCA/IG5ldyBEYXRlKCt0aGlzKSA6IHRoaXMuX2Q7XG4gICAgICAgIH0sXG5cbiAgICAgICAgdG9JU09TdHJpbmcgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgbSA9IG1vbWVudCh0aGlzKS51dGMoKTtcbiAgICAgICAgICAgIGlmICgwIDwgbS55ZWFyKCkgJiYgbS55ZWFyKCkgPD0gOTk5OSkge1xuICAgICAgICAgICAgICAgIGlmICgnZnVuY3Rpb24nID09PSB0eXBlb2YgRGF0ZS5wcm90b3R5cGUudG9JU09TdHJpbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gbmF0aXZlIGltcGxlbWVudGF0aW9uIGlzIH41MHggZmFzdGVyLCB1c2UgaXQgd2hlbiB3ZSBjYW5cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMudG9EYXRlKCkudG9JU09TdHJpbmcoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZm9ybWF0TW9tZW50KG0sICdZWVlZLU1NLUREW1RdSEg6bW06c3MuU1NTW1pdJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZm9ybWF0TW9tZW50KG0sICdZWVlZWVktTU0tRERbVF1ISDptbTpzcy5TU1NbWl0nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICB0b0FycmF5IDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIG0gPSB0aGlzO1xuICAgICAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgICAgICBtLnllYXIoKSxcbiAgICAgICAgICAgICAgICBtLm1vbnRoKCksXG4gICAgICAgICAgICAgICAgbS5kYXRlKCksXG4gICAgICAgICAgICAgICAgbS5ob3VycygpLFxuICAgICAgICAgICAgICAgIG0ubWludXRlcygpLFxuICAgICAgICAgICAgICAgIG0uc2Vjb25kcygpLFxuICAgICAgICAgICAgICAgIG0ubWlsbGlzZWNvbmRzKClcbiAgICAgICAgICAgIF07XG4gICAgICAgIH0sXG5cbiAgICAgICAgaXNWYWxpZCA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBpc1ZhbGlkKHRoaXMpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGlzRFNUU2hpZnRlZCA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLl9hKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuaXNWYWxpZCgpICYmIGNvbXBhcmVBcnJheXModGhpcy5fYSwgKHRoaXMuX2lzVVRDID8gbW9tZW50LnV0Yyh0aGlzLl9hKSA6IG1vbWVudCh0aGlzLl9hKSkudG9BcnJheSgpKSA+IDA7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSxcblxuICAgICAgICBwYXJzaW5nRmxhZ3MgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gZXh0ZW5kKHt9LCB0aGlzLl9wZik7XG4gICAgICAgIH0sXG5cbiAgICAgICAgaW52YWxpZEF0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fcGYub3ZlcmZsb3c7XG4gICAgICAgIH0sXG5cbiAgICAgICAgdXRjIDogZnVuY3Rpb24gKGtlZXBMb2NhbFRpbWUpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnpvbmUoMCwga2VlcExvY2FsVGltZSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgbG9jYWwgOiBmdW5jdGlvbiAoa2VlcExvY2FsVGltZSkge1xuICAgICAgICAgICAgaWYgKHRoaXMuX2lzVVRDKSB7XG4gICAgICAgICAgICAgICAgdGhpcy56b25lKDAsIGtlZXBMb2NhbFRpbWUpO1xuICAgICAgICAgICAgICAgIHRoaXMuX2lzVVRDID0gZmFsc2U7XG5cbiAgICAgICAgICAgICAgICBpZiAoa2VlcExvY2FsVGltZSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmFkZCh0aGlzLl9kYXRlVHpPZmZzZXQoKSwgJ20nKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSxcblxuICAgICAgICBmb3JtYXQgOiBmdW5jdGlvbiAoaW5wdXRTdHJpbmcpIHtcbiAgICAgICAgICAgIHZhciBvdXRwdXQgPSBmb3JtYXRNb21lbnQodGhpcywgaW5wdXRTdHJpbmcgfHwgbW9tZW50LmRlZmF1bHRGb3JtYXQpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMubG9jYWxlRGF0YSgpLnBvc3Rmb3JtYXQob3V0cHV0KTtcbiAgICAgICAgfSxcblxuICAgICAgICBhZGQgOiBjcmVhdGVBZGRlcigxLCAnYWRkJyksXG5cbiAgICAgICAgc3VidHJhY3QgOiBjcmVhdGVBZGRlcigtMSwgJ3N1YnRyYWN0JyksXG5cbiAgICAgICAgZGlmZiA6IGZ1bmN0aW9uIChpbnB1dCwgdW5pdHMsIGFzRmxvYXQpIHtcbiAgICAgICAgICAgIHZhciB0aGF0ID0gbWFrZUFzKGlucHV0LCB0aGlzKSxcbiAgICAgICAgICAgICAgICB6b25lRGlmZiA9ICh0aGlzLnpvbmUoKSAtIHRoYXQuem9uZSgpKSAqIDZlNCxcbiAgICAgICAgICAgICAgICBkaWZmLCBvdXRwdXQsIGRheXNBZGp1c3Q7XG5cbiAgICAgICAgICAgIHVuaXRzID0gbm9ybWFsaXplVW5pdHModW5pdHMpO1xuXG4gICAgICAgICAgICBpZiAodW5pdHMgPT09ICd5ZWFyJyB8fCB1bml0cyA9PT0gJ21vbnRoJykge1xuICAgICAgICAgICAgICAgIC8vIGF2ZXJhZ2UgbnVtYmVyIG9mIGRheXMgaW4gdGhlIG1vbnRocyBpbiB0aGUgZ2l2ZW4gZGF0ZXNcbiAgICAgICAgICAgICAgICBkaWZmID0gKHRoaXMuZGF5c0luTW9udGgoKSArIHRoYXQuZGF5c0luTW9udGgoKSkgKiA0MzJlNTsgLy8gMjQgKiA2MCAqIDYwICogMTAwMCAvIDJcbiAgICAgICAgICAgICAgICAvLyBkaWZmZXJlbmNlIGluIG1vbnRoc1xuICAgICAgICAgICAgICAgIG91dHB1dCA9ICgodGhpcy55ZWFyKCkgLSB0aGF0LnllYXIoKSkgKiAxMikgKyAodGhpcy5tb250aCgpIC0gdGhhdC5tb250aCgpKTtcbiAgICAgICAgICAgICAgICAvLyBhZGp1c3QgYnkgdGFraW5nIGRpZmZlcmVuY2UgaW4gZGF5cywgYXZlcmFnZSBudW1iZXIgb2YgZGF5c1xuICAgICAgICAgICAgICAgIC8vIGFuZCBkc3QgaW4gdGhlIGdpdmVuIG1vbnRocy5cbiAgICAgICAgICAgICAgICBkYXlzQWRqdXN0ID0gKHRoaXMgLSBtb21lbnQodGhpcykuc3RhcnRPZignbW9udGgnKSkgLVxuICAgICAgICAgICAgICAgICAgICAodGhhdCAtIG1vbWVudCh0aGF0KS5zdGFydE9mKCdtb250aCcpKTtcbiAgICAgICAgICAgICAgICAvLyBzYW1lIGFzIGFib3ZlIGJ1dCB3aXRoIHpvbmVzLCB0byBuZWdhdGUgYWxsIGRzdFxuICAgICAgICAgICAgICAgIGRheXNBZGp1c3QgLT0gKCh0aGlzLnpvbmUoKSAtIG1vbWVudCh0aGlzKS5zdGFydE9mKCdtb250aCcpLnpvbmUoKSkgLVxuICAgICAgICAgICAgICAgICAgICAgICAgKHRoYXQuem9uZSgpIC0gbW9tZW50KHRoYXQpLnN0YXJ0T2YoJ21vbnRoJykuem9uZSgpKSkgKiA2ZTQ7XG4gICAgICAgICAgICAgICAgb3V0cHV0ICs9IGRheXNBZGp1c3QgLyBkaWZmO1xuICAgICAgICAgICAgICAgIGlmICh1bml0cyA9PT0gJ3llYXInKSB7XG4gICAgICAgICAgICAgICAgICAgIG91dHB1dCA9IG91dHB1dCAvIDEyO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZGlmZiA9ICh0aGlzIC0gdGhhdCk7XG4gICAgICAgICAgICAgICAgb3V0cHV0ID0gdW5pdHMgPT09ICdzZWNvbmQnID8gZGlmZiAvIDFlMyA6IC8vIDEwMDBcbiAgICAgICAgICAgICAgICAgICAgdW5pdHMgPT09ICdtaW51dGUnID8gZGlmZiAvIDZlNCA6IC8vIDEwMDAgKiA2MFxuICAgICAgICAgICAgICAgICAgICB1bml0cyA9PT0gJ2hvdXInID8gZGlmZiAvIDM2ZTUgOiAvLyAxMDAwICogNjAgKiA2MFxuICAgICAgICAgICAgICAgICAgICB1bml0cyA9PT0gJ2RheScgPyAoZGlmZiAtIHpvbmVEaWZmKSAvIDg2NGU1IDogLy8gMTAwMCAqIDYwICogNjAgKiAyNCwgbmVnYXRlIGRzdFxuICAgICAgICAgICAgICAgICAgICB1bml0cyA9PT0gJ3dlZWsnID8gKGRpZmYgLSB6b25lRGlmZikgLyA2MDQ4ZTUgOiAvLyAxMDAwICogNjAgKiA2MCAqIDI0ICogNywgbmVnYXRlIGRzdFxuICAgICAgICAgICAgICAgICAgICBkaWZmO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGFzRmxvYXQgPyBvdXRwdXQgOiBhYnNSb3VuZChvdXRwdXQpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGZyb20gOiBmdW5jdGlvbiAodGltZSwgd2l0aG91dFN1ZmZpeCkge1xuICAgICAgICAgICAgcmV0dXJuIG1vbWVudC5kdXJhdGlvbih7dG86IHRoaXMsIGZyb206IHRpbWV9KS5sb2NhbGUodGhpcy5sb2NhbGUoKSkuaHVtYW5pemUoIXdpdGhvdXRTdWZmaXgpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGZyb21Ob3cgOiBmdW5jdGlvbiAod2l0aG91dFN1ZmZpeCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZnJvbShtb21lbnQoKSwgd2l0aG91dFN1ZmZpeCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgY2FsZW5kYXIgOiBmdW5jdGlvbiAodGltZSkge1xuICAgICAgICAgICAgLy8gV2Ugd2FudCB0byBjb21wYXJlIHRoZSBzdGFydCBvZiB0b2RheSwgdnMgdGhpcy5cbiAgICAgICAgICAgIC8vIEdldHRpbmcgc3RhcnQtb2YtdG9kYXkgZGVwZW5kcyBvbiB3aGV0aGVyIHdlJ3JlIHpvbmUnZCBvciBub3QuXG4gICAgICAgICAgICB2YXIgbm93ID0gdGltZSB8fCBtb21lbnQoKSxcbiAgICAgICAgICAgICAgICBzb2QgPSBtYWtlQXMobm93LCB0aGlzKS5zdGFydE9mKCdkYXknKSxcbiAgICAgICAgICAgICAgICBkaWZmID0gdGhpcy5kaWZmKHNvZCwgJ2RheXMnLCB0cnVlKSxcbiAgICAgICAgICAgICAgICBmb3JtYXQgPSBkaWZmIDwgLTYgPyAnc2FtZUVsc2UnIDpcbiAgICAgICAgICAgICAgICAgICAgZGlmZiA8IC0xID8gJ2xhc3RXZWVrJyA6XG4gICAgICAgICAgICAgICAgICAgIGRpZmYgPCAwID8gJ2xhc3REYXknIDpcbiAgICAgICAgICAgICAgICAgICAgZGlmZiA8IDEgPyAnc2FtZURheScgOlxuICAgICAgICAgICAgICAgICAgICBkaWZmIDwgMiA/ICduZXh0RGF5JyA6XG4gICAgICAgICAgICAgICAgICAgIGRpZmYgPCA3ID8gJ25leHRXZWVrJyA6ICdzYW1lRWxzZSc7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5mb3JtYXQodGhpcy5sb2NhbGVEYXRhKCkuY2FsZW5kYXIoZm9ybWF0LCB0aGlzLCBtb21lbnQobm93KSkpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGlzTGVhcFllYXIgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gaXNMZWFwWWVhcih0aGlzLnllYXIoKSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgaXNEU1QgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gKHRoaXMuem9uZSgpIDwgdGhpcy5jbG9uZSgpLm1vbnRoKDApLnpvbmUoKSB8fFxuICAgICAgICAgICAgICAgIHRoaXMuem9uZSgpIDwgdGhpcy5jbG9uZSgpLm1vbnRoKDUpLnpvbmUoKSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZGF5IDogZnVuY3Rpb24gKGlucHV0KSB7XG4gICAgICAgICAgICB2YXIgZGF5ID0gdGhpcy5faXNVVEMgPyB0aGlzLl9kLmdldFVUQ0RheSgpIDogdGhpcy5fZC5nZXREYXkoKTtcbiAgICAgICAgICAgIGlmIChpbnB1dCAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgaW5wdXQgPSBwYXJzZVdlZWtkYXkoaW5wdXQsIHRoaXMubG9jYWxlRGF0YSgpKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5hZGQoaW5wdXQgLSBkYXksICdkJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBkYXk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgbW9udGggOiBtYWtlQWNjZXNzb3IoJ01vbnRoJywgdHJ1ZSksXG5cbiAgICAgICAgc3RhcnRPZiA6IGZ1bmN0aW9uICh1bml0cykge1xuICAgICAgICAgICAgdW5pdHMgPSBub3JtYWxpemVVbml0cyh1bml0cyk7XG4gICAgICAgICAgICAvLyB0aGUgZm9sbG93aW5nIHN3aXRjaCBpbnRlbnRpb25hbGx5IG9taXRzIGJyZWFrIGtleXdvcmRzXG4gICAgICAgICAgICAvLyB0byB1dGlsaXplIGZhbGxpbmcgdGhyb3VnaCB0aGUgY2FzZXMuXG4gICAgICAgICAgICBzd2l0Y2ggKHVuaXRzKSB7XG4gICAgICAgICAgICBjYXNlICd5ZWFyJzpcbiAgICAgICAgICAgICAgICB0aGlzLm1vbnRoKDApO1xuICAgICAgICAgICAgICAgIC8qIGZhbGxzIHRocm91Z2ggKi9cbiAgICAgICAgICAgIGNhc2UgJ3F1YXJ0ZXInOlxuICAgICAgICAgICAgY2FzZSAnbW9udGgnOlxuICAgICAgICAgICAgICAgIHRoaXMuZGF0ZSgxKTtcbiAgICAgICAgICAgICAgICAvKiBmYWxscyB0aHJvdWdoICovXG4gICAgICAgICAgICBjYXNlICd3ZWVrJzpcbiAgICAgICAgICAgIGNhc2UgJ2lzb1dlZWsnOlxuICAgICAgICAgICAgY2FzZSAnZGF5JzpcbiAgICAgICAgICAgICAgICB0aGlzLmhvdXJzKDApO1xuICAgICAgICAgICAgICAgIC8qIGZhbGxzIHRocm91Z2ggKi9cbiAgICAgICAgICAgIGNhc2UgJ2hvdXInOlxuICAgICAgICAgICAgICAgIHRoaXMubWludXRlcygwKTtcbiAgICAgICAgICAgICAgICAvKiBmYWxscyB0aHJvdWdoICovXG4gICAgICAgICAgICBjYXNlICdtaW51dGUnOlxuICAgICAgICAgICAgICAgIHRoaXMuc2Vjb25kcygwKTtcbiAgICAgICAgICAgICAgICAvKiBmYWxscyB0aHJvdWdoICovXG4gICAgICAgICAgICBjYXNlICdzZWNvbmQnOlxuICAgICAgICAgICAgICAgIHRoaXMubWlsbGlzZWNvbmRzKDApO1xuICAgICAgICAgICAgICAgIC8qIGZhbGxzIHRocm91Z2ggKi9cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gd2Vla3MgYXJlIGEgc3BlY2lhbCBjYXNlXG4gICAgICAgICAgICBpZiAodW5pdHMgPT09ICd3ZWVrJykge1xuICAgICAgICAgICAgICAgIHRoaXMud2Vla2RheSgwKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodW5pdHMgPT09ICdpc29XZWVrJykge1xuICAgICAgICAgICAgICAgIHRoaXMuaXNvV2Vla2RheSgxKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gcXVhcnRlcnMgYXJlIGFsc28gc3BlY2lhbFxuICAgICAgICAgICAgaWYgKHVuaXRzID09PSAncXVhcnRlcicpIHtcbiAgICAgICAgICAgICAgICB0aGlzLm1vbnRoKE1hdGguZmxvb3IodGhpcy5tb250aCgpIC8gMykgKiAzKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZW5kT2Y6IGZ1bmN0aW9uICh1bml0cykge1xuICAgICAgICAgICAgdW5pdHMgPSBub3JtYWxpemVVbml0cyh1bml0cyk7XG4gICAgICAgICAgICBpZiAodW5pdHMgPT09IHVuZGVmaW5lZCB8fCB1bml0cyA9PT0gJ21pbGxpc2Vjb25kJykge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuc3RhcnRPZih1bml0cykuYWRkKDEsICh1bml0cyA9PT0gJ2lzb1dlZWsnID8gJ3dlZWsnIDogdW5pdHMpKS5zdWJ0cmFjdCgxLCAnbXMnKTtcbiAgICAgICAgfSxcblxuICAgICAgICBpc0FmdGVyOiBmdW5jdGlvbiAoaW5wdXQsIHVuaXRzKSB7XG4gICAgICAgICAgICB2YXIgaW5wdXRNcztcbiAgICAgICAgICAgIHVuaXRzID0gbm9ybWFsaXplVW5pdHModHlwZW9mIHVuaXRzICE9PSAndW5kZWZpbmVkJyA/IHVuaXRzIDogJ21pbGxpc2Vjb25kJyk7XG4gICAgICAgICAgICBpZiAodW5pdHMgPT09ICdtaWxsaXNlY29uZCcpIHtcbiAgICAgICAgICAgICAgICBpbnB1dCA9IG1vbWVudC5pc01vbWVudChpbnB1dCkgPyBpbnB1dCA6IG1vbWVudChpbnB1dCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuICt0aGlzID4gK2lucHV0O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpbnB1dE1zID0gbW9tZW50LmlzTW9tZW50KGlucHV0KSA/ICtpbnB1dCA6ICttb21lbnQoaW5wdXQpO1xuICAgICAgICAgICAgICAgIHJldHVybiBpbnB1dE1zIDwgK3RoaXMuY2xvbmUoKS5zdGFydE9mKHVuaXRzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBpc0JlZm9yZTogZnVuY3Rpb24gKGlucHV0LCB1bml0cykge1xuICAgICAgICAgICAgdmFyIGlucHV0TXM7XG4gICAgICAgICAgICB1bml0cyA9IG5vcm1hbGl6ZVVuaXRzKHR5cGVvZiB1bml0cyAhPT0gJ3VuZGVmaW5lZCcgPyB1bml0cyA6ICdtaWxsaXNlY29uZCcpO1xuICAgICAgICAgICAgaWYgKHVuaXRzID09PSAnbWlsbGlzZWNvbmQnKSB7XG4gICAgICAgICAgICAgICAgaW5wdXQgPSBtb21lbnQuaXNNb21lbnQoaW5wdXQpID8gaW5wdXQgOiBtb21lbnQoaW5wdXQpO1xuICAgICAgICAgICAgICAgIHJldHVybiArdGhpcyA8ICtpbnB1dDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaW5wdXRNcyA9IG1vbWVudC5pc01vbWVudChpbnB1dCkgPyAraW5wdXQgOiArbW9tZW50KGlucHV0KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gK3RoaXMuY2xvbmUoKS5lbmRPZih1bml0cykgPCBpbnB1dE1zO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIGlzU2FtZTogZnVuY3Rpb24gKGlucHV0LCB1bml0cykge1xuICAgICAgICAgICAgdmFyIGlucHV0TXM7XG4gICAgICAgICAgICB1bml0cyA9IG5vcm1hbGl6ZVVuaXRzKHVuaXRzIHx8ICdtaWxsaXNlY29uZCcpO1xuICAgICAgICAgICAgaWYgKHVuaXRzID09PSAnbWlsbGlzZWNvbmQnKSB7XG4gICAgICAgICAgICAgICAgaW5wdXQgPSBtb21lbnQuaXNNb21lbnQoaW5wdXQpID8gaW5wdXQgOiBtb21lbnQoaW5wdXQpO1xuICAgICAgICAgICAgICAgIHJldHVybiArdGhpcyA9PT0gK2lucHV0O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpbnB1dE1zID0gK21vbWVudChpbnB1dCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuICsodGhpcy5jbG9uZSgpLnN0YXJ0T2YodW5pdHMpKSA8PSBpbnB1dE1zICYmIGlucHV0TXMgPD0gKyh0aGlzLmNsb25lKCkuZW5kT2YodW5pdHMpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBtaW46IGRlcHJlY2F0ZShcbiAgICAgICAgICAgICAgICAgJ21vbWVudCgpLm1pbiBpcyBkZXByZWNhdGVkLCB1c2UgbW9tZW50Lm1pbiBpbnN0ZWFkLiBodHRwczovL2dpdGh1Yi5jb20vbW9tZW50L21vbWVudC9pc3N1ZXMvMTU0OCcsXG4gICAgICAgICAgICAgICAgIGZ1bmN0aW9uIChvdGhlcikge1xuICAgICAgICAgICAgICAgICAgICAgb3RoZXIgPSBtb21lbnQuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICAgICAgICAgICAgICAgICAgIHJldHVybiBvdGhlciA8IHRoaXMgPyB0aGlzIDogb3RoZXI7XG4gICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICksXG5cbiAgICAgICAgbWF4OiBkZXByZWNhdGUoXG4gICAgICAgICAgICAgICAgJ21vbWVudCgpLm1heCBpcyBkZXByZWNhdGVkLCB1c2UgbW9tZW50Lm1heCBpbnN0ZWFkLiBodHRwczovL2dpdGh1Yi5jb20vbW9tZW50L21vbWVudC9pc3N1ZXMvMTU0OCcsXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKG90aGVyKSB7XG4gICAgICAgICAgICAgICAgICAgIG90aGVyID0gbW9tZW50LmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBvdGhlciA+IHRoaXMgPyB0aGlzIDogb3RoZXI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICApLFxuXG4gICAgICAgIC8vIGtlZXBMb2NhbFRpbWUgPSB0cnVlIG1lYW5zIG9ubHkgY2hhbmdlIHRoZSB0aW1lem9uZSwgd2l0aG91dFxuICAgICAgICAvLyBhZmZlY3RpbmcgdGhlIGxvY2FsIGhvdXIuIFNvIDU6MzE6MjYgKzAzMDAgLS1bem9uZSgyLCB0cnVlKV0tLT5cbiAgICAgICAgLy8gNTozMToyNiArMDIwMCBJdCBpcyBwb3NzaWJsZSB0aGF0IDU6MzE6MjYgZG9lc24ndCBleGlzdCBpbnQgem9uZVxuICAgICAgICAvLyArMDIwMCwgc28gd2UgYWRqdXN0IHRoZSB0aW1lIGFzIG5lZWRlZCwgdG8gYmUgdmFsaWQuXG4gICAgICAgIC8vXG4gICAgICAgIC8vIEtlZXBpbmcgdGhlIHRpbWUgYWN0dWFsbHkgYWRkcy9zdWJ0cmFjdHMgKG9uZSBob3VyKVxuICAgICAgICAvLyBmcm9tIHRoZSBhY3R1YWwgcmVwcmVzZW50ZWQgdGltZS4gVGhhdCBpcyB3aHkgd2UgY2FsbCB1cGRhdGVPZmZzZXRcbiAgICAgICAgLy8gYSBzZWNvbmQgdGltZS4gSW4gY2FzZSBpdCB3YW50cyB1cyB0byBjaGFuZ2UgdGhlIG9mZnNldCBhZ2FpblxuICAgICAgICAvLyBfY2hhbmdlSW5Qcm9ncmVzcyA9PSB0cnVlIGNhc2UsIHRoZW4gd2UgaGF2ZSB0byBhZGp1c3QsIGJlY2F1c2VcbiAgICAgICAgLy8gdGhlcmUgaXMgbm8gc3VjaCB0aW1lIGluIHRoZSBnaXZlbiB0aW1lem9uZS5cbiAgICAgICAgem9uZSA6IGZ1bmN0aW9uIChpbnB1dCwga2VlcExvY2FsVGltZSkge1xuICAgICAgICAgICAgdmFyIG9mZnNldCA9IHRoaXMuX29mZnNldCB8fCAwLFxuICAgICAgICAgICAgICAgIGxvY2FsQWRqdXN0O1xuICAgICAgICAgICAgaWYgKGlucHV0ICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGlucHV0ID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgICAgICBpbnB1dCA9IHRpbWV6b25lTWludXRlc0Zyb21TdHJpbmcoaW5wdXQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoTWF0aC5hYnMoaW5wdXQpIDwgMTYpIHtcbiAgICAgICAgICAgICAgICAgICAgaW5wdXQgPSBpbnB1dCAqIDYwO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuX2lzVVRDICYmIGtlZXBMb2NhbFRpbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgbG9jYWxBZGp1c3QgPSB0aGlzLl9kYXRlVHpPZmZzZXQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy5fb2Zmc2V0ID0gaW5wdXQ7XG4gICAgICAgICAgICAgICAgdGhpcy5faXNVVEMgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGlmIChsb2NhbEFkanVzdCAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3VidHJhY3QobG9jYWxBZGp1c3QsICdtJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChvZmZzZXQgIT09IGlucHV0KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICgha2VlcExvY2FsVGltZSB8fCB0aGlzLl9jaGFuZ2VJblByb2dyZXNzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhZGRPclN1YnRyYWN0RHVyYXRpb25Gcm9tTW9tZW50KHRoaXMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1vbWVudC5kdXJhdGlvbihvZmZzZXQgLSBpbnB1dCwgJ20nKSwgMSwgZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCF0aGlzLl9jaGFuZ2VJblByb2dyZXNzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9jaGFuZ2VJblByb2dyZXNzID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1vbWVudC51cGRhdGVPZmZzZXQodGhpcywgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9jaGFuZ2VJblByb2dyZXNzID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2lzVVRDID8gb2Zmc2V0IDogdGhpcy5fZGF0ZVR6T2Zmc2V0KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSxcblxuICAgICAgICB6b25lQWJiciA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9pc1VUQyA/ICdVVEMnIDogJyc7XG4gICAgICAgIH0sXG5cbiAgICAgICAgem9uZU5hbWUgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5faXNVVEMgPyAnQ29vcmRpbmF0ZWQgVW5pdmVyc2FsIFRpbWUnIDogJyc7XG4gICAgICAgIH0sXG5cbiAgICAgICAgcGFyc2Vab25lIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKHRoaXMuX3R6bSkge1xuICAgICAgICAgICAgICAgIHRoaXMuem9uZSh0aGlzLl90em0pO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgdGhpcy5faSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnpvbmUodGhpcy5faSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSxcblxuICAgICAgICBoYXNBbGlnbmVkSG91ck9mZnNldCA6IGZ1bmN0aW9uIChpbnB1dCkge1xuICAgICAgICAgICAgaWYgKCFpbnB1dCkge1xuICAgICAgICAgICAgICAgIGlucHV0ID0gMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGlucHV0ID0gbW9tZW50KGlucHV0KS56b25lKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiAodGhpcy56b25lKCkgLSBpbnB1dCkgJSA2MCA9PT0gMDtcbiAgICAgICAgfSxcblxuICAgICAgICBkYXlzSW5Nb250aCA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBkYXlzSW5Nb250aCh0aGlzLnllYXIoKSwgdGhpcy5tb250aCgpKTtcbiAgICAgICAgfSxcblxuICAgICAgICBkYXlPZlllYXIgOiBmdW5jdGlvbiAoaW5wdXQpIHtcbiAgICAgICAgICAgIHZhciBkYXlPZlllYXIgPSByb3VuZCgobW9tZW50KHRoaXMpLnN0YXJ0T2YoJ2RheScpIC0gbW9tZW50KHRoaXMpLnN0YXJ0T2YoJ3llYXInKSkgLyA4NjRlNSkgKyAxO1xuICAgICAgICAgICAgcmV0dXJuIGlucHV0ID09IG51bGwgPyBkYXlPZlllYXIgOiB0aGlzLmFkZCgoaW5wdXQgLSBkYXlPZlllYXIpLCAnZCcpO1xuICAgICAgICB9LFxuXG4gICAgICAgIHF1YXJ0ZXIgOiBmdW5jdGlvbiAoaW5wdXQpIHtcbiAgICAgICAgICAgIHJldHVybiBpbnB1dCA9PSBudWxsID8gTWF0aC5jZWlsKCh0aGlzLm1vbnRoKCkgKyAxKSAvIDMpIDogdGhpcy5tb250aCgoaW5wdXQgLSAxKSAqIDMgKyB0aGlzLm1vbnRoKCkgJSAzKTtcbiAgICAgICAgfSxcblxuICAgICAgICB3ZWVrWWVhciA6IGZ1bmN0aW9uIChpbnB1dCkge1xuICAgICAgICAgICAgdmFyIHllYXIgPSB3ZWVrT2ZZZWFyKHRoaXMsIHRoaXMubG9jYWxlRGF0YSgpLl93ZWVrLmRvdywgdGhpcy5sb2NhbGVEYXRhKCkuX3dlZWsuZG95KS55ZWFyO1xuICAgICAgICAgICAgcmV0dXJuIGlucHV0ID09IG51bGwgPyB5ZWFyIDogdGhpcy5hZGQoKGlucHV0IC0geWVhciksICd5Jyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgaXNvV2Vla1llYXIgOiBmdW5jdGlvbiAoaW5wdXQpIHtcbiAgICAgICAgICAgIHZhciB5ZWFyID0gd2Vla09mWWVhcih0aGlzLCAxLCA0KS55ZWFyO1xuICAgICAgICAgICAgcmV0dXJuIGlucHV0ID09IG51bGwgPyB5ZWFyIDogdGhpcy5hZGQoKGlucHV0IC0geWVhciksICd5Jyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgd2VlayA6IGZ1bmN0aW9uIChpbnB1dCkge1xuICAgICAgICAgICAgdmFyIHdlZWsgPSB0aGlzLmxvY2FsZURhdGEoKS53ZWVrKHRoaXMpO1xuICAgICAgICAgICAgcmV0dXJuIGlucHV0ID09IG51bGwgPyB3ZWVrIDogdGhpcy5hZGQoKGlucHV0IC0gd2VlaykgKiA3LCAnZCcpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGlzb1dlZWsgOiBmdW5jdGlvbiAoaW5wdXQpIHtcbiAgICAgICAgICAgIHZhciB3ZWVrID0gd2Vla09mWWVhcih0aGlzLCAxLCA0KS53ZWVrO1xuICAgICAgICAgICAgcmV0dXJuIGlucHV0ID09IG51bGwgPyB3ZWVrIDogdGhpcy5hZGQoKGlucHV0IC0gd2VlaykgKiA3LCAnZCcpO1xuICAgICAgICB9LFxuXG4gICAgICAgIHdlZWtkYXkgOiBmdW5jdGlvbiAoaW5wdXQpIHtcbiAgICAgICAgICAgIHZhciB3ZWVrZGF5ID0gKHRoaXMuZGF5KCkgKyA3IC0gdGhpcy5sb2NhbGVEYXRhKCkuX3dlZWsuZG93KSAlIDc7XG4gICAgICAgICAgICByZXR1cm4gaW5wdXQgPT0gbnVsbCA/IHdlZWtkYXkgOiB0aGlzLmFkZChpbnB1dCAtIHdlZWtkYXksICdkJyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgaXNvV2Vla2RheSA6IGZ1bmN0aW9uIChpbnB1dCkge1xuICAgICAgICAgICAgLy8gYmVoYXZlcyB0aGUgc2FtZSBhcyBtb21lbnQjZGF5IGV4Y2VwdFxuICAgICAgICAgICAgLy8gYXMgYSBnZXR0ZXIsIHJldHVybnMgNyBpbnN0ZWFkIG9mIDAgKDEtNyByYW5nZSBpbnN0ZWFkIG9mIDAtNilcbiAgICAgICAgICAgIC8vIGFzIGEgc2V0dGVyLCBzdW5kYXkgc2hvdWxkIGJlbG9uZyB0byB0aGUgcHJldmlvdXMgd2Vlay5cbiAgICAgICAgICAgIHJldHVybiBpbnB1dCA9PSBudWxsID8gdGhpcy5kYXkoKSB8fCA3IDogdGhpcy5kYXkodGhpcy5kYXkoKSAlIDcgPyBpbnB1dCA6IGlucHV0IC0gNyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgaXNvV2Vla3NJblllYXIgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gd2Vla3NJblllYXIodGhpcy55ZWFyKCksIDEsIDQpO1xuICAgICAgICB9LFxuXG4gICAgICAgIHdlZWtzSW5ZZWFyIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIHdlZWtJbmZvID0gdGhpcy5sb2NhbGVEYXRhKCkuX3dlZWs7XG4gICAgICAgICAgICByZXR1cm4gd2Vla3NJblllYXIodGhpcy55ZWFyKCksIHdlZWtJbmZvLmRvdywgd2Vla0luZm8uZG95KTtcbiAgICAgICAgfSxcblxuICAgICAgICBnZXQgOiBmdW5jdGlvbiAodW5pdHMpIHtcbiAgICAgICAgICAgIHVuaXRzID0gbm9ybWFsaXplVW5pdHModW5pdHMpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXNbdW5pdHNdKCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgc2V0IDogZnVuY3Rpb24gKHVuaXRzLCB2YWx1ZSkge1xuICAgICAgICAgICAgdW5pdHMgPSBub3JtYWxpemVVbml0cyh1bml0cyk7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHRoaXNbdW5pdHNdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgdGhpc1t1bml0c10odmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLy8gSWYgcGFzc2VkIGEgbG9jYWxlIGtleSwgaXQgd2lsbCBzZXQgdGhlIGxvY2FsZSBmb3IgdGhpc1xuICAgICAgICAvLyBpbnN0YW5jZS4gIE90aGVyd2lzZSwgaXQgd2lsbCByZXR1cm4gdGhlIGxvY2FsZSBjb25maWd1cmF0aW9uXG4gICAgICAgIC8vIHZhcmlhYmxlcyBmb3IgdGhpcyBpbnN0YW5jZS5cbiAgICAgICAgbG9jYWxlIDogZnVuY3Rpb24gKGtleSkge1xuICAgICAgICAgICAgdmFyIG5ld0xvY2FsZURhdGE7XG5cbiAgICAgICAgICAgIGlmIChrZXkgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9sb2NhbGUuX2FiYnI7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG5ld0xvY2FsZURhdGEgPSBtb21lbnQubG9jYWxlRGF0YShrZXkpO1xuICAgICAgICAgICAgICAgIGlmIChuZXdMb2NhbGVEYXRhICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fbG9jYWxlID0gbmV3TG9jYWxlRGF0YTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgbGFuZyA6IGRlcHJlY2F0ZShcbiAgICAgICAgICAgICdtb21lbnQoKS5sYW5nKCkgaXMgZGVwcmVjYXRlZC4gSW5zdGVhZCwgdXNlIG1vbWVudCgpLmxvY2FsZURhdGEoKSB0byBnZXQgdGhlIGxhbmd1YWdlIGNvbmZpZ3VyYXRpb24uIFVzZSBtb21lbnQoKS5sb2NhbGUoKSB0byBjaGFuZ2UgbGFuZ3VhZ2VzLicsXG4gICAgICAgICAgICBmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgICAgICAgICAgaWYgKGtleSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmxvY2FsZURhdGEoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5sb2NhbGUoa2V5KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICksXG5cbiAgICAgICAgbG9jYWxlRGF0YSA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9sb2NhbGU7XG4gICAgICAgIH0sXG5cbiAgICAgICAgX2RhdGVUek9mZnNldCA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIC8vIE9uIEZpcmVmb3guMjQgRGF0ZSNnZXRUaW1lem9uZU9mZnNldCByZXR1cm5zIGEgZmxvYXRpbmcgcG9pbnQuXG4gICAgICAgICAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vbW9tZW50L21vbWVudC9wdWxsLzE4NzFcbiAgICAgICAgICAgIHJldHVybiBNYXRoLnJvdW5kKHRoaXMuX2QuZ2V0VGltZXpvbmVPZmZzZXQoKSAvIDE1KSAqIDE1O1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBmdW5jdGlvbiByYXdNb250aFNldHRlcihtb20sIHZhbHVlKSB7XG4gICAgICAgIHZhciBkYXlPZk1vbnRoO1xuXG4gICAgICAgIC8vIFRPRE86IE1vdmUgdGhpcyBvdXQgb2YgaGVyZSFcbiAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIHZhbHVlID0gbW9tLmxvY2FsZURhdGEoKS5tb250aHNQYXJzZSh2YWx1ZSk7XG4gICAgICAgICAgICAvLyBUT0RPOiBBbm90aGVyIHNpbGVudCBmYWlsdXJlP1xuICAgICAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gJ251bWJlcicpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbW9tO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZGF5T2ZNb250aCA9IE1hdGgubWluKG1vbS5kYXRlKCksXG4gICAgICAgICAgICAgICAgZGF5c0luTW9udGgobW9tLnllYXIoKSwgdmFsdWUpKTtcbiAgICAgICAgbW9tLl9kWydzZXQnICsgKG1vbS5faXNVVEMgPyAnVVRDJyA6ICcnKSArICdNb250aCddKHZhbHVlLCBkYXlPZk1vbnRoKTtcbiAgICAgICAgcmV0dXJuIG1vbTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiByYXdHZXR0ZXIobW9tLCB1bml0KSB7XG4gICAgICAgIHJldHVybiBtb20uX2RbJ2dldCcgKyAobW9tLl9pc1VUQyA/ICdVVEMnIDogJycpICsgdW5pdF0oKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiByYXdTZXR0ZXIobW9tLCB1bml0LCB2YWx1ZSkge1xuICAgICAgICBpZiAodW5pdCA9PT0gJ01vbnRoJykge1xuICAgICAgICAgICAgcmV0dXJuIHJhd01vbnRoU2V0dGVyKG1vbSwgdmFsdWUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIG1vbS5fZFsnc2V0JyArIChtb20uX2lzVVRDID8gJ1VUQycgOiAnJykgKyB1bml0XSh2YWx1ZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBtYWtlQWNjZXNzb3IodW5pdCwga2VlcFRpbWUpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgaWYgKHZhbHVlICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICByYXdTZXR0ZXIodGhpcywgdW5pdCwgdmFsdWUpO1xuICAgICAgICAgICAgICAgIG1vbWVudC51cGRhdGVPZmZzZXQodGhpcywga2VlcFRpbWUpO1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmF3R2V0dGVyKHRoaXMsIHVuaXQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIG1vbWVudC5mbi5taWxsaXNlY29uZCA9IG1vbWVudC5mbi5taWxsaXNlY29uZHMgPSBtYWtlQWNjZXNzb3IoJ01pbGxpc2Vjb25kcycsIGZhbHNlKTtcbiAgICBtb21lbnQuZm4uc2Vjb25kID0gbW9tZW50LmZuLnNlY29uZHMgPSBtYWtlQWNjZXNzb3IoJ1NlY29uZHMnLCBmYWxzZSk7XG4gICAgbW9tZW50LmZuLm1pbnV0ZSA9IG1vbWVudC5mbi5taW51dGVzID0gbWFrZUFjY2Vzc29yKCdNaW51dGVzJywgZmFsc2UpO1xuICAgIC8vIFNldHRpbmcgdGhlIGhvdXIgc2hvdWxkIGtlZXAgdGhlIHRpbWUsIGJlY2F1c2UgdGhlIHVzZXIgZXhwbGljaXRseVxuICAgIC8vIHNwZWNpZmllZCB3aGljaCBob3VyIGhlIHdhbnRzLiBTbyB0cnlpbmcgdG8gbWFpbnRhaW4gdGhlIHNhbWUgaG91ciAoaW5cbiAgICAvLyBhIG5ldyB0aW1lem9uZSkgbWFrZXMgc2Vuc2UuIEFkZGluZy9zdWJ0cmFjdGluZyBob3VycyBkb2VzIG5vdCBmb2xsb3dcbiAgICAvLyB0aGlzIHJ1bGUuXG4gICAgbW9tZW50LmZuLmhvdXIgPSBtb21lbnQuZm4uaG91cnMgPSBtYWtlQWNjZXNzb3IoJ0hvdXJzJywgdHJ1ZSk7XG4gICAgLy8gbW9tZW50LmZuLm1vbnRoIGlzIGRlZmluZWQgc2VwYXJhdGVseVxuICAgIG1vbWVudC5mbi5kYXRlID0gbWFrZUFjY2Vzc29yKCdEYXRlJywgdHJ1ZSk7XG4gICAgbW9tZW50LmZuLmRhdGVzID0gZGVwcmVjYXRlKCdkYXRlcyBhY2Nlc3NvciBpcyBkZXByZWNhdGVkLiBVc2UgZGF0ZSBpbnN0ZWFkLicsIG1ha2VBY2Nlc3NvcignRGF0ZScsIHRydWUpKTtcbiAgICBtb21lbnQuZm4ueWVhciA9IG1ha2VBY2Nlc3NvcignRnVsbFllYXInLCB0cnVlKTtcbiAgICBtb21lbnQuZm4ueWVhcnMgPSBkZXByZWNhdGUoJ3llYXJzIGFjY2Vzc29yIGlzIGRlcHJlY2F0ZWQuIFVzZSB5ZWFyIGluc3RlYWQuJywgbWFrZUFjY2Vzc29yKCdGdWxsWWVhcicsIHRydWUpKTtcblxuICAgIC8vIGFkZCBwbHVyYWwgbWV0aG9kc1xuICAgIG1vbWVudC5mbi5kYXlzID0gbW9tZW50LmZuLmRheTtcbiAgICBtb21lbnQuZm4ubW9udGhzID0gbW9tZW50LmZuLm1vbnRoO1xuICAgIG1vbWVudC5mbi53ZWVrcyA9IG1vbWVudC5mbi53ZWVrO1xuICAgIG1vbWVudC5mbi5pc29XZWVrcyA9IG1vbWVudC5mbi5pc29XZWVrO1xuICAgIG1vbWVudC5mbi5xdWFydGVycyA9IG1vbWVudC5mbi5xdWFydGVyO1xuXG4gICAgLy8gYWRkIGFsaWFzZWQgZm9ybWF0IG1ldGhvZHNcbiAgICBtb21lbnQuZm4udG9KU09OID0gbW9tZW50LmZuLnRvSVNPU3RyaW5nO1xuXG4gICAgLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICAgICAgICBEdXJhdGlvbiBQcm90b3R5cGVcbiAgICAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cblxuICAgIGZ1bmN0aW9uIGRheXNUb1llYXJzIChkYXlzKSB7XG4gICAgICAgIC8vIDQwMCB5ZWFycyBoYXZlIDE0NjA5NyBkYXlzICh0YWtpbmcgaW50byBhY2NvdW50IGxlYXAgeWVhciBydWxlcylcbiAgICAgICAgcmV0dXJuIGRheXMgKiA0MDAgLyAxNDYwOTc7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24geWVhcnNUb0RheXMgKHllYXJzKSB7XG4gICAgICAgIC8vIHllYXJzICogMzY1ICsgYWJzUm91bmQoeWVhcnMgLyA0KSAtXG4gICAgICAgIC8vICAgICBhYnNSb3VuZCh5ZWFycyAvIDEwMCkgKyBhYnNSb3VuZCh5ZWFycyAvIDQwMCk7XG4gICAgICAgIHJldHVybiB5ZWFycyAqIDE0NjA5NyAvIDQwMDtcbiAgICB9XG5cbiAgICBleHRlbmQobW9tZW50LmR1cmF0aW9uLmZuID0gRHVyYXRpb24ucHJvdG90eXBlLCB7XG5cbiAgICAgICAgX2J1YmJsZSA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBtaWxsaXNlY29uZHMgPSB0aGlzLl9taWxsaXNlY29uZHMsXG4gICAgICAgICAgICAgICAgZGF5cyA9IHRoaXMuX2RheXMsXG4gICAgICAgICAgICAgICAgbW9udGhzID0gdGhpcy5fbW9udGhzLFxuICAgICAgICAgICAgICAgIGRhdGEgPSB0aGlzLl9kYXRhLFxuICAgICAgICAgICAgICAgIHNlY29uZHMsIG1pbnV0ZXMsIGhvdXJzLCB5ZWFycyA9IDA7XG5cbiAgICAgICAgICAgIC8vIFRoZSBmb2xsb3dpbmcgY29kZSBidWJibGVzIHVwIHZhbHVlcywgc2VlIHRoZSB0ZXN0cyBmb3JcbiAgICAgICAgICAgIC8vIGV4YW1wbGVzIG9mIHdoYXQgdGhhdCBtZWFucy5cbiAgICAgICAgICAgIGRhdGEubWlsbGlzZWNvbmRzID0gbWlsbGlzZWNvbmRzICUgMTAwMDtcblxuICAgICAgICAgICAgc2Vjb25kcyA9IGFic1JvdW5kKG1pbGxpc2Vjb25kcyAvIDEwMDApO1xuICAgICAgICAgICAgZGF0YS5zZWNvbmRzID0gc2Vjb25kcyAlIDYwO1xuXG4gICAgICAgICAgICBtaW51dGVzID0gYWJzUm91bmQoc2Vjb25kcyAvIDYwKTtcbiAgICAgICAgICAgIGRhdGEubWludXRlcyA9IG1pbnV0ZXMgJSA2MDtcblxuICAgICAgICAgICAgaG91cnMgPSBhYnNSb3VuZChtaW51dGVzIC8gNjApO1xuICAgICAgICAgICAgZGF0YS5ob3VycyA9IGhvdXJzICUgMjQ7XG5cbiAgICAgICAgICAgIGRheXMgKz0gYWJzUm91bmQoaG91cnMgLyAyNCk7XG5cbiAgICAgICAgICAgIC8vIEFjY3VyYXRlbHkgY29udmVydCBkYXlzIHRvIHllYXJzLCBhc3N1bWUgc3RhcnQgZnJvbSB5ZWFyIDAuXG4gICAgICAgICAgICB5ZWFycyA9IGFic1JvdW5kKGRheXNUb1llYXJzKGRheXMpKTtcbiAgICAgICAgICAgIGRheXMgLT0gYWJzUm91bmQoeWVhcnNUb0RheXMoeWVhcnMpKTtcblxuICAgICAgICAgICAgLy8gMzAgZGF5cyB0byBhIG1vbnRoXG4gICAgICAgICAgICAvLyBUT0RPIChpc2tyZW4pOiBVc2UgYW5jaG9yIGRhdGUgKGxpa2UgMXN0IEphbikgdG8gY29tcHV0ZSB0aGlzLlxuICAgICAgICAgICAgbW9udGhzICs9IGFic1JvdW5kKGRheXMgLyAzMCk7XG4gICAgICAgICAgICBkYXlzICU9IDMwO1xuXG4gICAgICAgICAgICAvLyAxMiBtb250aHMgLT4gMSB5ZWFyXG4gICAgICAgICAgICB5ZWFycyArPSBhYnNSb3VuZChtb250aHMgLyAxMik7XG4gICAgICAgICAgICBtb250aHMgJT0gMTI7XG5cbiAgICAgICAgICAgIGRhdGEuZGF5cyA9IGRheXM7XG4gICAgICAgICAgICBkYXRhLm1vbnRocyA9IG1vbnRocztcbiAgICAgICAgICAgIGRhdGEueWVhcnMgPSB5ZWFycztcbiAgICAgICAgfSxcblxuICAgICAgICBhYnMgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLl9taWxsaXNlY29uZHMgPSBNYXRoLmFicyh0aGlzLl9taWxsaXNlY29uZHMpO1xuICAgICAgICAgICAgdGhpcy5fZGF5cyA9IE1hdGguYWJzKHRoaXMuX2RheXMpO1xuICAgICAgICAgICAgdGhpcy5fbW9udGhzID0gTWF0aC5hYnModGhpcy5fbW9udGhzKTtcblxuICAgICAgICAgICAgdGhpcy5fZGF0YS5taWxsaXNlY29uZHMgPSBNYXRoLmFicyh0aGlzLl9kYXRhLm1pbGxpc2Vjb25kcyk7XG4gICAgICAgICAgICB0aGlzLl9kYXRhLnNlY29uZHMgPSBNYXRoLmFicyh0aGlzLl9kYXRhLnNlY29uZHMpO1xuICAgICAgICAgICAgdGhpcy5fZGF0YS5taW51dGVzID0gTWF0aC5hYnModGhpcy5fZGF0YS5taW51dGVzKTtcbiAgICAgICAgICAgIHRoaXMuX2RhdGEuaG91cnMgPSBNYXRoLmFicyh0aGlzLl9kYXRhLmhvdXJzKTtcbiAgICAgICAgICAgIHRoaXMuX2RhdGEubW9udGhzID0gTWF0aC5hYnModGhpcy5fZGF0YS5tb250aHMpO1xuICAgICAgICAgICAgdGhpcy5fZGF0YS55ZWFycyA9IE1hdGguYWJzKHRoaXMuX2RhdGEueWVhcnMpO1xuXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSxcblxuICAgICAgICB3ZWVrcyA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBhYnNSb3VuZCh0aGlzLmRheXMoKSAvIDcpO1xuICAgICAgICB9LFxuXG4gICAgICAgIHZhbHVlT2YgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fbWlsbGlzZWNvbmRzICtcbiAgICAgICAgICAgICAgdGhpcy5fZGF5cyAqIDg2NGU1ICtcbiAgICAgICAgICAgICAgKHRoaXMuX21vbnRocyAlIDEyKSAqIDI1OTJlNiArXG4gICAgICAgICAgICAgIHRvSW50KHRoaXMuX21vbnRocyAvIDEyKSAqIDMxNTM2ZTY7XG4gICAgICAgIH0sXG5cbiAgICAgICAgaHVtYW5pemUgOiBmdW5jdGlvbiAod2l0aFN1ZmZpeCkge1xuICAgICAgICAgICAgdmFyIG91dHB1dCA9IHJlbGF0aXZlVGltZSh0aGlzLCAhd2l0aFN1ZmZpeCwgdGhpcy5sb2NhbGVEYXRhKCkpO1xuXG4gICAgICAgICAgICBpZiAod2l0aFN1ZmZpeCkge1xuICAgICAgICAgICAgICAgIG91dHB1dCA9IHRoaXMubG9jYWxlRGF0YSgpLnBhc3RGdXR1cmUoK3RoaXMsIG91dHB1dCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB0aGlzLmxvY2FsZURhdGEoKS5wb3N0Zm9ybWF0KG91dHB1dCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgYWRkIDogZnVuY3Rpb24gKGlucHV0LCB2YWwpIHtcbiAgICAgICAgICAgIC8vIHN1cHBvcnRzIG9ubHkgMi4wLXN0eWxlIGFkZCgxLCAncycpIG9yIGFkZChtb21lbnQpXG4gICAgICAgICAgICB2YXIgZHVyID0gbW9tZW50LmR1cmF0aW9uKGlucHV0LCB2YWwpO1xuXG4gICAgICAgICAgICB0aGlzLl9taWxsaXNlY29uZHMgKz0gZHVyLl9taWxsaXNlY29uZHM7XG4gICAgICAgICAgICB0aGlzLl9kYXlzICs9IGR1ci5fZGF5cztcbiAgICAgICAgICAgIHRoaXMuX21vbnRocyArPSBkdXIuX21vbnRocztcblxuICAgICAgICAgICAgdGhpcy5fYnViYmxlKCk7XG5cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9LFxuXG4gICAgICAgIHN1YnRyYWN0IDogZnVuY3Rpb24gKGlucHV0LCB2YWwpIHtcbiAgICAgICAgICAgIHZhciBkdXIgPSBtb21lbnQuZHVyYXRpb24oaW5wdXQsIHZhbCk7XG5cbiAgICAgICAgICAgIHRoaXMuX21pbGxpc2Vjb25kcyAtPSBkdXIuX21pbGxpc2Vjb25kcztcbiAgICAgICAgICAgIHRoaXMuX2RheXMgLT0gZHVyLl9kYXlzO1xuICAgICAgICAgICAgdGhpcy5fbW9udGhzIC09IGR1ci5fbW9udGhzO1xuXG4gICAgICAgICAgICB0aGlzLl9idWJibGUoKTtcblxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0IDogZnVuY3Rpb24gKHVuaXRzKSB7XG4gICAgICAgICAgICB1bml0cyA9IG5vcm1hbGl6ZVVuaXRzKHVuaXRzKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzW3VuaXRzLnRvTG93ZXJDYXNlKCkgKyAncyddKCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgYXMgOiBmdW5jdGlvbiAodW5pdHMpIHtcbiAgICAgICAgICAgIHZhciBkYXlzLCBtb250aHM7XG4gICAgICAgICAgICB1bml0cyA9IG5vcm1hbGl6ZVVuaXRzKHVuaXRzKTtcblxuICAgICAgICAgICAgaWYgKHVuaXRzID09PSAnbW9udGgnIHx8IHVuaXRzID09PSAneWVhcicpIHtcbiAgICAgICAgICAgICAgICBkYXlzID0gdGhpcy5fZGF5cyArIHRoaXMuX21pbGxpc2Vjb25kcyAvIDg2NGU1O1xuICAgICAgICAgICAgICAgIG1vbnRocyA9IHRoaXMuX21vbnRocyArIGRheXNUb1llYXJzKGRheXMpICogMTI7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHVuaXRzID09PSAnbW9udGgnID8gbW9udGhzIDogbW9udGhzIC8gMTI7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIGhhbmRsZSBtaWxsaXNlY29uZHMgc2VwYXJhdGVseSBiZWNhdXNlIG9mIGZsb2F0aW5nIHBvaW50IG1hdGggZXJyb3JzIChpc3N1ZSAjMTg2NylcbiAgICAgICAgICAgICAgICBkYXlzID0gdGhpcy5fZGF5cyArIE1hdGgucm91bmQoeWVhcnNUb0RheXModGhpcy5fbW9udGhzIC8gMTIpKTtcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKHVuaXRzKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3dlZWsnOiByZXR1cm4gZGF5cyAvIDcgKyB0aGlzLl9taWxsaXNlY29uZHMgLyA2MDQ4ZTU7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2RheSc6IHJldHVybiBkYXlzICsgdGhpcy5fbWlsbGlzZWNvbmRzIC8gODY0ZTU7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2hvdXInOiByZXR1cm4gZGF5cyAqIDI0ICsgdGhpcy5fbWlsbGlzZWNvbmRzIC8gMzZlNTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnbWludXRlJzogcmV0dXJuIGRheXMgKiAyNCAqIDYwICsgdGhpcy5fbWlsbGlzZWNvbmRzIC8gNmU0O1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdzZWNvbmQnOiByZXR1cm4gZGF5cyAqIDI0ICogNjAgKiA2MCArIHRoaXMuX21pbGxpc2Vjb25kcyAvIDEwMDA7XG4gICAgICAgICAgICAgICAgICAgIC8vIE1hdGguZmxvb3IgcHJldmVudHMgZmxvYXRpbmcgcG9pbnQgbWF0aCBlcnJvcnMgaGVyZVxuICAgICAgICAgICAgICAgICAgICBjYXNlICdtaWxsaXNlY29uZCc6IHJldHVybiBNYXRoLmZsb29yKGRheXMgKiAyNCAqIDYwICogNjAgKiAxMDAwKSArIHRoaXMuX21pbGxpc2Vjb25kcztcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogdGhyb3cgbmV3IEVycm9yKCdVbmtub3duIHVuaXQgJyArIHVuaXRzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgbGFuZyA6IG1vbWVudC5mbi5sYW5nLFxuICAgICAgICBsb2NhbGUgOiBtb21lbnQuZm4ubG9jYWxlLFxuXG4gICAgICAgIHRvSXNvU3RyaW5nIDogZGVwcmVjYXRlKFxuICAgICAgICAgICAgJ3RvSXNvU3RyaW5nKCkgaXMgZGVwcmVjYXRlZC4gUGxlYXNlIHVzZSB0b0lTT1N0cmluZygpIGluc3RlYWQgJyArXG4gICAgICAgICAgICAnKG5vdGljZSB0aGUgY2FwaXRhbHMpJyxcbiAgICAgICAgICAgIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy50b0lTT1N0cmluZygpO1xuICAgICAgICAgICAgfVxuICAgICAgICApLFxuXG4gICAgICAgIHRvSVNPU3RyaW5nIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgLy8gaW5zcGlyZWQgYnkgaHR0cHM6Ly9naXRodWIuY29tL2RvcmRpbGxlL21vbWVudC1pc29kdXJhdGlvbi9ibG9iL21hc3Rlci9tb21lbnQuaXNvZHVyYXRpb24uanNcbiAgICAgICAgICAgIHZhciB5ZWFycyA9IE1hdGguYWJzKHRoaXMueWVhcnMoKSksXG4gICAgICAgICAgICAgICAgbW9udGhzID0gTWF0aC5hYnModGhpcy5tb250aHMoKSksXG4gICAgICAgICAgICAgICAgZGF5cyA9IE1hdGguYWJzKHRoaXMuZGF5cygpKSxcbiAgICAgICAgICAgICAgICBob3VycyA9IE1hdGguYWJzKHRoaXMuaG91cnMoKSksXG4gICAgICAgICAgICAgICAgbWludXRlcyA9IE1hdGguYWJzKHRoaXMubWludXRlcygpKSxcbiAgICAgICAgICAgICAgICBzZWNvbmRzID0gTWF0aC5hYnModGhpcy5zZWNvbmRzKCkgKyB0aGlzLm1pbGxpc2Vjb25kcygpIC8gMTAwMCk7XG5cbiAgICAgICAgICAgIGlmICghdGhpcy5hc1NlY29uZHMoKSkge1xuICAgICAgICAgICAgICAgIC8vIHRoaXMgaXMgdGhlIHNhbWUgYXMgQyMncyAoTm9kYSkgYW5kIHB5dGhvbiAoaXNvZGF0ZSkuLi5cbiAgICAgICAgICAgICAgICAvLyBidXQgbm90IG90aGVyIEpTIChnb29nLmRhdGUpXG4gICAgICAgICAgICAgICAgcmV0dXJuICdQMEQnO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gKHRoaXMuYXNTZWNvbmRzKCkgPCAwID8gJy0nIDogJycpICtcbiAgICAgICAgICAgICAgICAnUCcgK1xuICAgICAgICAgICAgICAgICh5ZWFycyA/IHllYXJzICsgJ1knIDogJycpICtcbiAgICAgICAgICAgICAgICAobW9udGhzID8gbW9udGhzICsgJ00nIDogJycpICtcbiAgICAgICAgICAgICAgICAoZGF5cyA/IGRheXMgKyAnRCcgOiAnJykgK1xuICAgICAgICAgICAgICAgICgoaG91cnMgfHwgbWludXRlcyB8fCBzZWNvbmRzKSA/ICdUJyA6ICcnKSArXG4gICAgICAgICAgICAgICAgKGhvdXJzID8gaG91cnMgKyAnSCcgOiAnJykgK1xuICAgICAgICAgICAgICAgIChtaW51dGVzID8gbWludXRlcyArICdNJyA6ICcnKSArXG4gICAgICAgICAgICAgICAgKHNlY29uZHMgPyBzZWNvbmRzICsgJ1MnIDogJycpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGxvY2FsZURhdGEgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fbG9jYWxlO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBtb21lbnQuZHVyYXRpb24uZm4udG9TdHJpbmcgPSBtb21lbnQuZHVyYXRpb24uZm4udG9JU09TdHJpbmc7XG5cbiAgICBmdW5jdGlvbiBtYWtlRHVyYXRpb25HZXR0ZXIobmFtZSkge1xuICAgICAgICBtb21lbnQuZHVyYXRpb24uZm5bbmFtZV0gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fZGF0YVtuYW1lXTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmb3IgKGkgaW4gdW5pdE1pbGxpc2Vjb25kRmFjdG9ycykge1xuICAgICAgICBpZiAoaGFzT3duUHJvcCh1bml0TWlsbGlzZWNvbmRGYWN0b3JzLCBpKSkge1xuICAgICAgICAgICAgbWFrZUR1cmF0aW9uR2V0dGVyKGkudG9Mb3dlckNhc2UoKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBtb21lbnQuZHVyYXRpb24uZm4uYXNNaWxsaXNlY29uZHMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmFzKCdtcycpO1xuICAgIH07XG4gICAgbW9tZW50LmR1cmF0aW9uLmZuLmFzU2Vjb25kcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYXMoJ3MnKTtcbiAgICB9O1xuICAgIG1vbWVudC5kdXJhdGlvbi5mbi5hc01pbnV0ZXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmFzKCdtJyk7XG4gICAgfTtcbiAgICBtb21lbnQuZHVyYXRpb24uZm4uYXNIb3VycyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYXMoJ2gnKTtcbiAgICB9O1xuICAgIG1vbWVudC5kdXJhdGlvbi5mbi5hc0RheXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmFzKCdkJyk7XG4gICAgfTtcbiAgICBtb21lbnQuZHVyYXRpb24uZm4uYXNXZWVrcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYXMoJ3dlZWtzJyk7XG4gICAgfTtcbiAgICBtb21lbnQuZHVyYXRpb24uZm4uYXNNb250aHMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmFzKCdNJyk7XG4gICAgfTtcbiAgICBtb21lbnQuZHVyYXRpb24uZm4uYXNZZWFycyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYXMoJ3knKTtcbiAgICB9O1xuXG4gICAgLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICAgICAgICBEZWZhdWx0IExvY2FsZVxuICAgICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuXG4gICAgLy8gU2V0IGRlZmF1bHQgbG9jYWxlLCBvdGhlciBsb2NhbGUgd2lsbCBpbmhlcml0IGZyb20gRW5nbGlzaC5cbiAgICBtb21lbnQubG9jYWxlKCdlbicsIHtcbiAgICAgICAgb3JkaW5hbFBhcnNlOiAvXFxkezEsMn0odGh8c3R8bmR8cmQpLyxcbiAgICAgICAgb3JkaW5hbCA6IGZ1bmN0aW9uIChudW1iZXIpIHtcbiAgICAgICAgICAgIHZhciBiID0gbnVtYmVyICUgMTAsXG4gICAgICAgICAgICAgICAgb3V0cHV0ID0gKHRvSW50KG51bWJlciAlIDEwMCAvIDEwKSA9PT0gMSkgPyAndGgnIDpcbiAgICAgICAgICAgICAgICAoYiA9PT0gMSkgPyAnc3QnIDpcbiAgICAgICAgICAgICAgICAoYiA9PT0gMikgPyAnbmQnIDpcbiAgICAgICAgICAgICAgICAoYiA9PT0gMykgPyAncmQnIDogJ3RoJztcbiAgICAgICAgICAgIHJldHVybiBudW1iZXIgKyBvdXRwdXQ7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIC8qIEVNQkVEX0xPQ0FMRVMgKi9cblxuICAgIC8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAgICAgICAgRXhwb3NpbmcgTW9tZW50XG4gICAgKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG4gICAgZnVuY3Rpb24gbWFrZUdsb2JhbChzaG91bGREZXByZWNhdGUpIHtcbiAgICAgICAgLypnbG9iYWwgZW5kZXI6ZmFsc2UgKi9cbiAgICAgICAgaWYgKHR5cGVvZiBlbmRlciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBvbGRHbG9iYWxNb21lbnQgPSBnbG9iYWxTY29wZS5tb21lbnQ7XG4gICAgICAgIGlmIChzaG91bGREZXByZWNhdGUpIHtcbiAgICAgICAgICAgIGdsb2JhbFNjb3BlLm1vbWVudCA9IGRlcHJlY2F0ZShcbiAgICAgICAgICAgICAgICAgICAgJ0FjY2Vzc2luZyBNb21lbnQgdGhyb3VnaCB0aGUgZ2xvYmFsIHNjb3BlIGlzICcgK1xuICAgICAgICAgICAgICAgICAgICAnZGVwcmVjYXRlZCwgYW5kIHdpbGwgYmUgcmVtb3ZlZCBpbiBhbiB1cGNvbWluZyAnICtcbiAgICAgICAgICAgICAgICAgICAgJ3JlbGVhc2UuJyxcbiAgICAgICAgICAgICAgICAgICAgbW9tZW50KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGdsb2JhbFNjb3BlLm1vbWVudCA9IG1vbWVudDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIENvbW1vbkpTIG1vZHVsZSBpcyBkZWZpbmVkXG4gICAgaWYgKGhhc01vZHVsZSkge1xuICAgICAgICBtb2R1bGUuZXhwb3J0cyA9IG1vbWVudDtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgICAgICBkZWZpbmUoJ21vbWVudCcsIGZ1bmN0aW9uIChyZXF1aXJlLCBleHBvcnRzLCBtb2R1bGUpIHtcbiAgICAgICAgICAgIGlmIChtb2R1bGUuY29uZmlnICYmIG1vZHVsZS5jb25maWcoKSAmJiBtb2R1bGUuY29uZmlnKCkubm9HbG9iYWwgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICAvLyByZWxlYXNlIHRoZSBnbG9iYWwgdmFyaWFibGVcbiAgICAgICAgICAgICAgICBnbG9iYWxTY29wZS5tb21lbnQgPSBvbGRHbG9iYWxNb21lbnQ7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBtb21lbnQ7XG4gICAgICAgIH0pO1xuICAgICAgICBtYWtlR2xvYmFsKHRydWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIG1ha2VHbG9iYWwoKTtcbiAgICB9XG59KS5jYWxsKHRoaXMpO1xuXG59KS5jYWxsKHRoaXMsdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbCA6IHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiLCIoZnVuY3Rpb24gKEJ1ZmZlcil7XG52YXIgaW90YSA9IHJlcXVpcmUoXCJpb3RhLWFycmF5XCIpXG5cbnZhciBoYXNUeXBlZEFycmF5cyAgPSAoKHR5cGVvZiBGbG9hdDY0QXJyYXkpICE9PSBcInVuZGVmaW5lZFwiKVxudmFyIGhhc0J1ZmZlciAgICAgICA9ICgodHlwZW9mIEJ1ZmZlcikgIT09IFwidW5kZWZpbmVkXCIpXG5cbmZ1bmN0aW9uIGNvbXBhcmUxc3QoYSwgYikge1xuICByZXR1cm4gYVswXSAtIGJbMF1cbn1cblxuZnVuY3Rpb24gb3JkZXIoKSB7XG4gIHZhciBzdHJpZGUgPSB0aGlzLnN0cmlkZVxuICB2YXIgdGVybXMgPSBuZXcgQXJyYXkoc3RyaWRlLmxlbmd0aClcbiAgdmFyIGlcbiAgZm9yKGk9MDsgaTx0ZXJtcy5sZW5ndGg7ICsraSkge1xuICAgIHRlcm1zW2ldID0gW01hdGguYWJzKHN0cmlkZVtpXSksIGldXG4gIH1cbiAgdGVybXMuc29ydChjb21wYXJlMXN0KVxuICB2YXIgcmVzdWx0ID0gbmV3IEFycmF5KHRlcm1zLmxlbmd0aClcbiAgZm9yKGk9MDsgaTxyZXN1bHQubGVuZ3RoOyArK2kpIHtcbiAgICByZXN1bHRbaV0gPSB0ZXJtc1tpXVsxXVxuICB9XG4gIHJldHVybiByZXN1bHRcbn1cblxuZnVuY3Rpb24gY29tcGlsZUNvbnN0cnVjdG9yKGR0eXBlLCBkaW1lbnNpb24pIHtcbiAgdmFyIGNsYXNzTmFtZSA9IFtcIlZpZXdcIiwgZGltZW5zaW9uLCBcImRcIiwgZHR5cGVdLmpvaW4oXCJcIilcbiAgaWYoZGltZW5zaW9uIDwgMCkge1xuICAgIGNsYXNzTmFtZSA9IFwiVmlld19OaWxcIiArIGR0eXBlXG4gIH1cbiAgdmFyIHVzZUdldHRlcnMgPSAoZHR5cGUgPT09IFwiZ2VuZXJpY1wiKVxuICBcbiAgaWYoZGltZW5zaW9uID09PSAtMSkge1xuICAgIC8vU3BlY2lhbCBjYXNlIGZvciB0cml2aWFsIGFycmF5c1xuICAgIHZhciBjb2RlID0gXG4gICAgICBcImZ1bmN0aW9uIFwiK2NsYXNzTmFtZStcIihhKXt0aGlzLmRhdGE9YTt9O1xcXG52YXIgcHJvdG89XCIrY2xhc3NOYW1lK1wiLnByb3RvdHlwZTtcXFxucHJvdG8uZHR5cGU9J1wiK2R0eXBlK1wiJztcXFxucHJvdG8uaW5kZXg9ZnVuY3Rpb24oKXtyZXR1cm4gLTF9O1xcXG5wcm90by5zaXplPTA7XFxcbnByb3RvLmRpbWVuc2lvbj0tMTtcXFxucHJvdG8uc2hhcGU9cHJvdG8uc3RyaWRlPXByb3RvLm9yZGVyPVtdO1xcXG5wcm90by5sbz1wcm90by5oaT1wcm90by50cmFuc3Bvc2U9cHJvdG8uc3RlcD1cXFxuZnVuY3Rpb24oKXtyZXR1cm4gbmV3IFwiK2NsYXNzTmFtZStcIih0aGlzLmRhdGEpO307XFxcbnByb3RvLmdldD1wcm90by5zZXQ9ZnVuY3Rpb24oKXt9O1xcXG5wcm90by5waWNrPWZ1bmN0aW9uKCl7cmV0dXJuIG51bGx9O1xcXG5yZXR1cm4gZnVuY3Rpb24gY29uc3RydWN0X1wiK2NsYXNzTmFtZStcIihhKXtyZXR1cm4gbmV3IFwiK2NsYXNzTmFtZStcIihhKTt9XCJcbiAgICB2YXIgcHJvY2VkdXJlID0gbmV3IEZ1bmN0aW9uKGNvZGUpXG4gICAgcmV0dXJuIHByb2NlZHVyZSgpXG4gIH0gZWxzZSBpZihkaW1lbnNpb24gPT09IDApIHtcbiAgICAvL1NwZWNpYWwgY2FzZSBmb3IgMGQgYXJyYXlzXG4gICAgdmFyIGNvZGUgPVxuICAgICAgXCJmdW5jdGlvbiBcIitjbGFzc05hbWUrXCIoYSxkKSB7XFxcbnRoaXMuZGF0YSA9IGE7XFxcbnRoaXMub2Zmc2V0ID0gZFxcXG59O1xcXG52YXIgcHJvdG89XCIrY2xhc3NOYW1lK1wiLnByb3RvdHlwZTtcXFxucHJvdG8uZHR5cGU9J1wiK2R0eXBlK1wiJztcXFxucHJvdG8uaW5kZXg9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5vZmZzZXR9O1xcXG5wcm90by5kaW1lbnNpb249MDtcXFxucHJvdG8uc2l6ZT0xO1xcXG5wcm90by5zaGFwZT1cXFxucHJvdG8uc3RyaWRlPVxcXG5wcm90by5vcmRlcj1bXTtcXFxucHJvdG8ubG89XFxcbnByb3RvLmhpPVxcXG5wcm90by50cmFuc3Bvc2U9XFxcbnByb3RvLnN0ZXA9ZnVuY3Rpb24gXCIrY2xhc3NOYW1lK1wiX2NvcHkoKSB7XFxcbnJldHVybiBuZXcgXCIrY2xhc3NOYW1lK1wiKHRoaXMuZGF0YSx0aGlzLm9mZnNldClcXFxufTtcXFxucHJvdG8ucGljaz1mdW5jdGlvbiBcIitjbGFzc05hbWUrXCJfcGljaygpe1xcXG5yZXR1cm4gVHJpdmlhbEFycmF5KHRoaXMuZGF0YSk7XFxcbn07XFxcbnByb3RvLnZhbHVlT2Y9cHJvdG8uZ2V0PWZ1bmN0aW9uIFwiK2NsYXNzTmFtZStcIl9nZXQoKXtcXFxucmV0dXJuIFwiKyh1c2VHZXR0ZXJzID8gXCJ0aGlzLmRhdGEuZ2V0KHRoaXMub2Zmc2V0KVwiIDogXCJ0aGlzLmRhdGFbdGhpcy5vZmZzZXRdXCIpK1xuXCJ9O1xcXG5wcm90by5zZXQ9ZnVuY3Rpb24gXCIrY2xhc3NOYW1lK1wiX3NldCh2KXtcXFxucmV0dXJuIFwiKyh1c2VHZXR0ZXJzID8gXCJ0aGlzLmRhdGEuc2V0KHRoaXMub2Zmc2V0LHYpXCIgOiBcInRoaXMuZGF0YVt0aGlzLm9mZnNldF09dlwiKStcIlxcXG59O1xcXG5yZXR1cm4gZnVuY3Rpb24gY29uc3RydWN0X1wiK2NsYXNzTmFtZStcIihhLGIsYyxkKXtyZXR1cm4gbmV3IFwiK2NsYXNzTmFtZStcIihhLGQpfVwiXG4gICAgdmFyIHByb2NlZHVyZSA9IG5ldyBGdW5jdGlvbihcIlRyaXZpYWxBcnJheVwiLCBjb2RlKVxuICAgIHJldHVybiBwcm9jZWR1cmUoQ0FDSEVEX0NPTlNUUlVDVE9SU1tkdHlwZV1bMF0pXG4gIH1cblxuICB2YXIgY29kZSA9IFtcIid1c2Ugc3RyaWN0J1wiXVxuICAgIFxuICAvL0NyZWF0ZSBjb25zdHJ1Y3RvciBmb3Igdmlld1xuICB2YXIgaW5kaWNlcyA9IGlvdGEoZGltZW5zaW9uKVxuICB2YXIgYXJncyA9IGluZGljZXMubWFwKGZ1bmN0aW9uKGkpIHsgcmV0dXJuIFwiaVwiK2kgfSlcbiAgdmFyIGluZGV4X3N0ciA9IFwidGhpcy5vZmZzZXQrXCIgKyBpbmRpY2VzLm1hcChmdW5jdGlvbihpKSB7XG4gICAgICAgIHJldHVybiBcInRoaXMuc3RyaWRlW1wiICsgaSArIFwiXSppXCIgKyBpXG4gICAgICB9KS5qb2luKFwiK1wiKVxuICB2YXIgc2hhcGVBcmcgPSBpbmRpY2VzLm1hcChmdW5jdGlvbihpKSB7XG4gICAgICByZXR1cm4gXCJiXCIraVxuICAgIH0pLmpvaW4oXCIsXCIpXG4gIHZhciBzdHJpZGVBcmcgPSBpbmRpY2VzLm1hcChmdW5jdGlvbihpKSB7XG4gICAgICByZXR1cm4gXCJjXCIraVxuICAgIH0pLmpvaW4oXCIsXCIpXG4gIGNvZGUucHVzaChcbiAgICBcImZ1bmN0aW9uIFwiK2NsYXNzTmFtZStcIihhLFwiICsgc2hhcGVBcmcgKyBcIixcIiArIHN0cmlkZUFyZyArIFwiLGQpe3RoaXMuZGF0YT1hXCIsXG4gICAgICBcInRoaXMuc2hhcGU9W1wiICsgc2hhcGVBcmcgKyBcIl1cIixcbiAgICAgIFwidGhpcy5zdHJpZGU9W1wiICsgc3RyaWRlQXJnICsgXCJdXCIsXG4gICAgICBcInRoaXMub2Zmc2V0PWR8MH1cIixcbiAgICBcInZhciBwcm90bz1cIitjbGFzc05hbWUrXCIucHJvdG90eXBlXCIsXG4gICAgXCJwcm90by5kdHlwZT0nXCIrZHR5cGUrXCInXCIsXG4gICAgXCJwcm90by5kaW1lbnNpb249XCIrZGltZW5zaW9uKVxuICBcbiAgLy92aWV3LnNpemU6XG4gIGNvZGUucHVzaChcIk9iamVjdC5kZWZpbmVQcm9wZXJ0eShwcm90bywnc2l6ZScse2dldDpmdW5jdGlvbiBcIitjbGFzc05hbWUrXCJfc2l6ZSgpe1xcXG5yZXR1cm4gXCIraW5kaWNlcy5tYXAoZnVuY3Rpb24oaSkgeyByZXR1cm4gXCJ0aGlzLnNoYXBlW1wiK2krXCJdXCIgfSkuam9pbihcIipcIiksXG5cIn19KVwiKVxuXG4gIC8vdmlldy5vcmRlcjpcbiAgaWYoZGltZW5zaW9uID09PSAxKSB7XG4gICAgY29kZS5wdXNoKFwicHJvdG8ub3JkZXI9WzBdXCIpXG4gIH0gZWxzZSB7XG4gICAgY29kZS5wdXNoKFwiT2JqZWN0LmRlZmluZVByb3BlcnR5KHByb3RvLCdvcmRlcicse2dldDpcIilcbiAgICBpZihkaW1lbnNpb24gPCA0KSB7XG4gICAgICBjb2RlLnB1c2goXCJmdW5jdGlvbiBcIitjbGFzc05hbWUrXCJfb3JkZXIoKXtcIilcbiAgICAgIGlmKGRpbWVuc2lvbiA9PT0gMikge1xuICAgICAgICBjb2RlLnB1c2goXCJyZXR1cm4gKE1hdGguYWJzKHRoaXMuc3RyaWRlWzBdKT5NYXRoLmFicyh0aGlzLnN0cmlkZVsxXSkpP1sxLDBdOlswLDFdfX0pXCIpXG4gICAgICB9IGVsc2UgaWYoZGltZW5zaW9uID09PSAzKSB7XG4gICAgICAgIGNvZGUucHVzaChcblwidmFyIHMwPU1hdGguYWJzKHRoaXMuc3RyaWRlWzBdKSxzMT1NYXRoLmFicyh0aGlzLnN0cmlkZVsxXSksczI9TWF0aC5hYnModGhpcy5zdHJpZGVbMl0pO1xcXG5pZihzMD5zMSl7XFxcbmlmKHMxPnMyKXtcXFxucmV0dXJuIFsyLDEsMF07XFxcbn1lbHNlIGlmKHMwPnMyKXtcXFxucmV0dXJuIFsxLDIsMF07XFxcbn1lbHNle1xcXG5yZXR1cm4gWzEsMCwyXTtcXFxufVxcXG59ZWxzZSBpZihzMD5zMil7XFxcbnJldHVybiBbMiwwLDFdO1xcXG59ZWxzZSBpZihzMj5zMSl7XFxcbnJldHVybiBbMCwxLDJdO1xcXG59ZWxzZXtcXFxucmV0dXJuIFswLDIsMV07XFxcbn19fSlcIilcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgY29kZS5wdXNoKFwiT1JERVJ9KVwiKVxuICAgIH1cbiAgfVxuICBcbiAgLy92aWV3LnNldChpMCwgLi4uLCB2KTpcbiAgY29kZS5wdXNoKFxuXCJwcm90by5zZXQ9ZnVuY3Rpb24gXCIrY2xhc3NOYW1lK1wiX3NldChcIithcmdzLmpvaW4oXCIsXCIpK1wiLHYpe1wiKVxuICBpZih1c2VHZXR0ZXJzKSB7XG4gICAgY29kZS5wdXNoKFwicmV0dXJuIHRoaXMuZGF0YS5zZXQoXCIraW5kZXhfc3RyK1wiLHYpfVwiKVxuICB9IGVsc2Uge1xuICAgIGNvZGUucHVzaChcInJldHVybiB0aGlzLmRhdGFbXCIraW5kZXhfc3RyK1wiXT12fVwiKVxuICB9XG4gIFxuICAvL3ZpZXcuZ2V0KGkwLCAuLi4pOlxuICBjb2RlLnB1c2goXCJwcm90by5nZXQ9ZnVuY3Rpb24gXCIrY2xhc3NOYW1lK1wiX2dldChcIithcmdzLmpvaW4oXCIsXCIpK1wiKXtcIilcbiAgaWYodXNlR2V0dGVycykge1xuICAgIGNvZGUucHVzaChcInJldHVybiB0aGlzLmRhdGEuZ2V0KFwiK2luZGV4X3N0citcIil9XCIpXG4gIH0gZWxzZSB7XG4gICAgY29kZS5wdXNoKFwicmV0dXJuIHRoaXMuZGF0YVtcIitpbmRleF9zdHIrXCJdfVwiKVxuICB9XG4gIFxuICAvL3ZpZXcuaW5kZXg6XG4gIGNvZGUucHVzaChcbiAgICBcInByb3RvLmluZGV4PWZ1bmN0aW9uIFwiK2NsYXNzTmFtZStcIl9pbmRleChcIiwgYXJncy5qb2luKCksIFwiKXtyZXR1cm4gXCIraW5kZXhfc3RyK1wifVwiKVxuXG4gIC8vdmlldy5oaSgpOlxuICBjb2RlLnB1c2goXCJwcm90by5oaT1mdW5jdGlvbiBcIitjbGFzc05hbWUrXCJfaGkoXCIrYXJncy5qb2luKFwiLFwiKStcIil7cmV0dXJuIG5ldyBcIitjbGFzc05hbWUrXCIodGhpcy5kYXRhLFwiK1xuICAgIGluZGljZXMubWFwKGZ1bmN0aW9uKGkpIHtcbiAgICAgIHJldHVybiBbXCIodHlwZW9mIGlcIixpLFwiIT09J251bWJlcid8fGlcIixpLFwiPDApP3RoaXMuc2hhcGVbXCIsIGksIFwiXTppXCIsIGksXCJ8MFwiXS5qb2luKFwiXCIpXG4gICAgfSkuam9pbihcIixcIikrXCIsXCIrXG4gICAgaW5kaWNlcy5tYXAoZnVuY3Rpb24oaSkge1xuICAgICAgcmV0dXJuIFwidGhpcy5zdHJpZGVbXCIraSArIFwiXVwiXG4gICAgfSkuam9pbihcIixcIikrXCIsdGhpcy5vZmZzZXQpfVwiKVxuICBcbiAgLy92aWV3LmxvKCk6XG4gIHZhciBhX3ZhcnMgPSBpbmRpY2VzLm1hcChmdW5jdGlvbihpKSB7IHJldHVybiBcImFcIitpK1wiPXRoaXMuc2hhcGVbXCIraStcIl1cIiB9KVxuICB2YXIgY192YXJzID0gaW5kaWNlcy5tYXAoZnVuY3Rpb24oaSkgeyByZXR1cm4gXCJjXCIraStcIj10aGlzLnN0cmlkZVtcIitpK1wiXVwiIH0pXG4gIGNvZGUucHVzaChcInByb3RvLmxvPWZ1bmN0aW9uIFwiK2NsYXNzTmFtZStcIl9sbyhcIithcmdzLmpvaW4oXCIsXCIpK1wiKXt2YXIgYj10aGlzLm9mZnNldCxkPTAsXCIrYV92YXJzLmpvaW4oXCIsXCIpK1wiLFwiK2NfdmFycy5qb2luKFwiLFwiKSlcbiAgZm9yKHZhciBpPTA7IGk8ZGltZW5zaW9uOyArK2kpIHtcbiAgICBjb2RlLnB1c2goXG5cImlmKHR5cGVvZiBpXCIraStcIj09PSdudW1iZXInJiZpXCIraStcIj49MCl7XFxcbmQ9aVwiK2krXCJ8MDtcXFxuYis9Y1wiK2krXCIqZDtcXFxuYVwiK2krXCItPWR9XCIpXG4gIH1cbiAgY29kZS5wdXNoKFwicmV0dXJuIG5ldyBcIitjbGFzc05hbWUrXCIodGhpcy5kYXRhLFwiK1xuICAgIGluZGljZXMubWFwKGZ1bmN0aW9uKGkpIHtcbiAgICAgIHJldHVybiBcImFcIitpXG4gICAgfSkuam9pbihcIixcIikrXCIsXCIrXG4gICAgaW5kaWNlcy5tYXAoZnVuY3Rpb24oaSkge1xuICAgICAgcmV0dXJuIFwiY1wiK2lcbiAgICB9KS5qb2luKFwiLFwiKStcIixiKX1cIilcbiAgXG4gIC8vdmlldy5zdGVwKCk6XG4gIGNvZGUucHVzaChcInByb3RvLnN0ZXA9ZnVuY3Rpb24gXCIrY2xhc3NOYW1lK1wiX3N0ZXAoXCIrYXJncy5qb2luKFwiLFwiKStcIil7dmFyIFwiK1xuICAgIGluZGljZXMubWFwKGZ1bmN0aW9uKGkpIHtcbiAgICAgIHJldHVybiBcImFcIitpK1wiPXRoaXMuc2hhcGVbXCIraStcIl1cIlxuICAgIH0pLmpvaW4oXCIsXCIpK1wiLFwiK1xuICAgIGluZGljZXMubWFwKGZ1bmN0aW9uKGkpIHtcbiAgICAgIHJldHVybiBcImJcIitpK1wiPXRoaXMuc3RyaWRlW1wiK2krXCJdXCJcbiAgICB9KS5qb2luKFwiLFwiKStcIixjPXRoaXMub2Zmc2V0LGQ9MCxjZWlsPU1hdGguY2VpbFwiKVxuICBmb3IodmFyIGk9MDsgaTxkaW1lbnNpb247ICsraSkge1xuICAgIGNvZGUucHVzaChcblwiaWYodHlwZW9mIGlcIitpK1wiPT09J251bWJlcicpe1xcXG5kPWlcIitpK1wifDA7XFxcbmlmKGQ8MCl7XFxcbmMrPWJcIitpK1wiKihhXCIraStcIi0xKTtcXFxuYVwiK2krXCI9Y2VpbCgtYVwiK2krXCIvZClcXFxufWVsc2V7XFxcbmFcIitpK1wiPWNlaWwoYVwiK2krXCIvZClcXFxufVxcXG5iXCIraStcIio9ZFxcXG59XCIpXG4gIH1cbiAgY29kZS5wdXNoKFwicmV0dXJuIG5ldyBcIitjbGFzc05hbWUrXCIodGhpcy5kYXRhLFwiK1xuICAgIGluZGljZXMubWFwKGZ1bmN0aW9uKGkpIHtcbiAgICAgIHJldHVybiBcImFcIiArIGlcbiAgICB9KS5qb2luKFwiLFwiKStcIixcIitcbiAgICBpbmRpY2VzLm1hcChmdW5jdGlvbihpKSB7XG4gICAgICByZXR1cm4gXCJiXCIgKyBpXG4gICAgfSkuam9pbihcIixcIikrXCIsYyl9XCIpXG4gIFxuICAvL3ZpZXcudHJhbnNwb3NlKCk6XG4gIHZhciB0U2hhcGUgPSBuZXcgQXJyYXkoZGltZW5zaW9uKVxuICB2YXIgdFN0cmlkZSA9IG5ldyBBcnJheShkaW1lbnNpb24pXG4gIGZvcih2YXIgaT0wOyBpPGRpbWVuc2lvbjsgKytpKSB7XG4gICAgdFNoYXBlW2ldID0gXCJhW2lcIitpK1wiXVwiXG4gICAgdFN0cmlkZVtpXSA9IFwiYltpXCIraStcIl1cIlxuICB9XG4gIGNvZGUucHVzaChcInByb3RvLnRyYW5zcG9zZT1mdW5jdGlvbiBcIitjbGFzc05hbWUrXCJfdHJhbnNwb3NlKFwiK2FyZ3MrXCIpe1wiK1xuICAgIGFyZ3MubWFwKGZ1bmN0aW9uKG4saWR4KSB7IHJldHVybiBuICsgXCI9KFwiICsgbiArIFwiPT09dW5kZWZpbmVkP1wiICsgaWR4ICsgXCI6XCIgKyBuICsgXCJ8MClcIn0pLmpvaW4oXCI7XCIpLFxuICAgIFwidmFyIGE9dGhpcy5zaGFwZSxiPXRoaXMuc3RyaWRlO3JldHVybiBuZXcgXCIrY2xhc3NOYW1lK1wiKHRoaXMuZGF0YSxcIit0U2hhcGUuam9pbihcIixcIikrXCIsXCIrdFN0cmlkZS5qb2luKFwiLFwiKStcIix0aGlzLm9mZnNldCl9XCIpXG4gIFxuICAvL3ZpZXcucGljaygpOlxuICBjb2RlLnB1c2goXCJwcm90by5waWNrPWZ1bmN0aW9uIFwiK2NsYXNzTmFtZStcIl9waWNrKFwiK2FyZ3MrXCIpe3ZhciBhPVtdLGI9W10sYz10aGlzLm9mZnNldFwiKVxuICBmb3IodmFyIGk9MDsgaTxkaW1lbnNpb247ICsraSkge1xuICAgIGNvZGUucHVzaChcImlmKHR5cGVvZiBpXCIraStcIj09PSdudW1iZXInJiZpXCIraStcIj49MCl7Yz0oYyt0aGlzLnN0cmlkZVtcIitpK1wiXSppXCIraStcIil8MH1lbHNle2EucHVzaCh0aGlzLnNoYXBlW1wiK2krXCJdKTtiLnB1c2godGhpcy5zdHJpZGVbXCIraStcIl0pfVwiKVxuICB9XG4gIGNvZGUucHVzaChcInZhciBjdG9yPUNUT1JfTElTVFthLmxlbmd0aCsxXTtyZXR1cm4gY3Rvcih0aGlzLmRhdGEsYSxiLGMpfVwiKVxuICAgIFxuICAvL0FkZCByZXR1cm4gc3RhdGVtZW50XG4gIGNvZGUucHVzaChcInJldHVybiBmdW5jdGlvbiBjb25zdHJ1Y3RfXCIrY2xhc3NOYW1lK1wiKGRhdGEsc2hhcGUsc3RyaWRlLG9mZnNldCl7cmV0dXJuIG5ldyBcIitjbGFzc05hbWUrXCIoZGF0YSxcIitcbiAgICBpbmRpY2VzLm1hcChmdW5jdGlvbihpKSB7XG4gICAgICByZXR1cm4gXCJzaGFwZVtcIitpK1wiXVwiXG4gICAgfSkuam9pbihcIixcIikrXCIsXCIrXG4gICAgaW5kaWNlcy5tYXAoZnVuY3Rpb24oaSkge1xuICAgICAgcmV0dXJuIFwic3RyaWRlW1wiK2krXCJdXCJcbiAgICB9KS5qb2luKFwiLFwiKStcIixvZmZzZXQpfVwiKVxuXG4gIC8vQ29tcGlsZSBwcm9jZWR1cmVcbiAgdmFyIHByb2NlZHVyZSA9IG5ldyBGdW5jdGlvbihcIkNUT1JfTElTVFwiLCBcIk9SREVSXCIsIGNvZGUuam9pbihcIlxcblwiKSlcbiAgcmV0dXJuIHByb2NlZHVyZShDQUNIRURfQ09OU1RSVUNUT1JTW2R0eXBlXSwgb3JkZXIpXG59XG5cbmZ1bmN0aW9uIGFycmF5RFR5cGUoZGF0YSkge1xuICBpZihoYXNCdWZmZXIpIHtcbiAgICBpZihCdWZmZXIuaXNCdWZmZXIoZGF0YSkpIHtcbiAgICAgIHJldHVybiBcImJ1ZmZlclwiXG4gICAgfVxuICB9XG4gIGlmKGhhc1R5cGVkQXJyYXlzKSB7XG4gICAgc3dpdGNoKE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChkYXRhKSkge1xuICAgICAgY2FzZSBcIltvYmplY3QgRmxvYXQ2NEFycmF5XVwiOlxuICAgICAgICByZXR1cm4gXCJmbG9hdDY0XCJcbiAgICAgIGNhc2UgXCJbb2JqZWN0IEZsb2F0MzJBcnJheV1cIjpcbiAgICAgICAgcmV0dXJuIFwiZmxvYXQzMlwiXG4gICAgICBjYXNlIFwiW29iamVjdCBJbnQ4QXJyYXldXCI6XG4gICAgICAgIHJldHVybiBcImludDhcIlxuICAgICAgY2FzZSBcIltvYmplY3QgSW50MTZBcnJheV1cIjpcbiAgICAgICAgcmV0dXJuIFwiaW50MTZcIlxuICAgICAgY2FzZSBcIltvYmplY3QgSW50MzJBcnJheV1cIjpcbiAgICAgICAgcmV0dXJuIFwiaW50MzJcIlxuICAgICAgY2FzZSBcIltvYmplY3QgVWludDhBcnJheV1cIjpcbiAgICAgICAgcmV0dXJuIFwidWludDhcIlxuICAgICAgY2FzZSBcIltvYmplY3QgVWludDE2QXJyYXldXCI6XG4gICAgICAgIHJldHVybiBcInVpbnQxNlwiXG4gICAgICBjYXNlIFwiW29iamVjdCBVaW50MzJBcnJheV1cIjpcbiAgICAgICAgcmV0dXJuIFwidWludDMyXCJcbiAgICAgIGNhc2UgXCJbb2JqZWN0IFVpbnQ4Q2xhbXBlZEFycmF5XVwiOlxuICAgICAgICByZXR1cm4gXCJ1aW50OF9jbGFtcGVkXCJcbiAgICB9XG4gIH1cbiAgaWYoQXJyYXkuaXNBcnJheShkYXRhKSkge1xuICAgIHJldHVybiBcImFycmF5XCJcbiAgfVxuICByZXR1cm4gXCJnZW5lcmljXCJcbn1cblxudmFyIENBQ0hFRF9DT05TVFJVQ1RPUlMgPSB7XG4gIFwiZmxvYXQzMlwiOltdLFxuICBcImZsb2F0NjRcIjpbXSxcbiAgXCJpbnQ4XCI6W10sXG4gIFwiaW50MTZcIjpbXSxcbiAgXCJpbnQzMlwiOltdLFxuICBcInVpbnQ4XCI6W10sXG4gIFwidWludDE2XCI6W10sXG4gIFwidWludDMyXCI6W10sXG4gIFwiYXJyYXlcIjpbXSxcbiAgXCJ1aW50OF9jbGFtcGVkXCI6W10sXG4gIFwiYnVmZmVyXCI6W10sXG4gIFwiZ2VuZXJpY1wiOltdXG59XG5cbjsoZnVuY3Rpb24oKSB7XG4gIGZvcih2YXIgaWQgaW4gQ0FDSEVEX0NPTlNUUlVDVE9SUykge1xuICAgIENBQ0hFRF9DT05TVFJVQ1RPUlNbaWRdLnB1c2goY29tcGlsZUNvbnN0cnVjdG9yKGlkLCAtMSkpXG4gIH1cbn0pO1xuXG5mdW5jdGlvbiB3cmFwcGVkTkRBcnJheUN0b3IoZGF0YSwgc2hhcGUsIHN0cmlkZSwgb2Zmc2V0KSB7XG4gIGlmKGRhdGEgPT09IHVuZGVmaW5lZCkge1xuICAgIHZhciBjdG9yID0gQ0FDSEVEX0NPTlNUUlVDVE9SUy5hcnJheVswXVxuICAgIHJldHVybiBjdG9yKFtdKVxuICB9IGVsc2UgaWYodHlwZW9mIGRhdGEgPT09IFwibnVtYmVyXCIpIHtcbiAgICBkYXRhID0gW2RhdGFdXG4gIH1cbiAgaWYoc2hhcGUgPT09IHVuZGVmaW5lZCkge1xuICAgIHNoYXBlID0gWyBkYXRhLmxlbmd0aCBdXG4gIH1cbiAgdmFyIGQgPSBzaGFwZS5sZW5ndGhcbiAgaWYoc3RyaWRlID09PSB1bmRlZmluZWQpIHtcbiAgICBzdHJpZGUgPSBuZXcgQXJyYXkoZClcbiAgICBmb3IodmFyIGk9ZC0xLCBzej0xOyBpPj0wOyAtLWkpIHtcbiAgICAgIHN0cmlkZVtpXSA9IHN6XG4gICAgICBzeiAqPSBzaGFwZVtpXVxuICAgIH1cbiAgfVxuICBpZihvZmZzZXQgPT09IHVuZGVmaW5lZCkge1xuICAgIG9mZnNldCA9IDBcbiAgICBmb3IodmFyIGk9MDsgaTxkOyArK2kpIHtcbiAgICAgIGlmKHN0cmlkZVtpXSA8IDApIHtcbiAgICAgICAgb2Zmc2V0IC09IChzaGFwZVtpXS0xKSpzdHJpZGVbaV1cbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgdmFyIGR0eXBlID0gYXJyYXlEVHlwZShkYXRhKVxuICB2YXIgY3Rvcl9saXN0ID0gQ0FDSEVEX0NPTlNUUlVDVE9SU1tkdHlwZV1cbiAgd2hpbGUoY3Rvcl9saXN0Lmxlbmd0aCA8PSBkKzEpIHtcbiAgICBjdG9yX2xpc3QucHVzaChjb21waWxlQ29uc3RydWN0b3IoZHR5cGUsIGN0b3JfbGlzdC5sZW5ndGgtMSkpXG4gIH1cbiAgdmFyIGN0b3IgPSBjdG9yX2xpc3RbZCsxXVxuICByZXR1cm4gY3RvcihkYXRhLCBzaGFwZSwgc3RyaWRlLCBvZmZzZXQpXG59XG5cbm1vZHVsZS5leHBvcnRzID0gd3JhcHBlZE5EQXJyYXlDdG9yXG59KS5jYWxsKHRoaXMscmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIpIiwiXCJ1c2Ugc3RyaWN0XCJcblxuZnVuY3Rpb24gaW90YShuKSB7XG4gIHZhciByZXN1bHQgPSBuZXcgQXJyYXkobilcbiAgZm9yKHZhciBpPTA7IGk8bjsgKytpKSB7XG4gICAgcmVzdWx0W2ldID0gaVxuICB9XG4gIHJldHVybiByZXN1bHRcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBpb3RhIiwidmFyIG5vdyA9IHJlcXVpcmUoJ3BlcmZvcm1hbmNlLW5vdycpXG4gICwgZ2xvYmFsID0gdHlwZW9mIHdpbmRvdyA9PT0gJ3VuZGVmaW5lZCcgPyB7fSA6IHdpbmRvd1xuICAsIHZlbmRvcnMgPSBbJ21veicsICd3ZWJraXQnXVxuICAsIHN1ZmZpeCA9ICdBbmltYXRpb25GcmFtZSdcbiAgLCByYWYgPSBnbG9iYWxbJ3JlcXVlc3QnICsgc3VmZml4XVxuICAsIGNhZiA9IGdsb2JhbFsnY2FuY2VsJyArIHN1ZmZpeF0gfHwgZ2xvYmFsWydjYW5jZWxSZXF1ZXN0JyArIHN1ZmZpeF1cbiAgLCBpc05hdGl2ZSA9IHRydWVcblxuZm9yKHZhciBpID0gMDsgaSA8IHZlbmRvcnMubGVuZ3RoICYmICFyYWY7IGkrKykge1xuICByYWYgPSBnbG9iYWxbdmVuZG9yc1tpXSArICdSZXF1ZXN0JyArIHN1ZmZpeF1cbiAgY2FmID0gZ2xvYmFsW3ZlbmRvcnNbaV0gKyAnQ2FuY2VsJyArIHN1ZmZpeF1cbiAgICAgIHx8IGdsb2JhbFt2ZW5kb3JzW2ldICsgJ0NhbmNlbFJlcXVlc3QnICsgc3VmZml4XVxufVxuXG4vLyBTb21lIHZlcnNpb25zIG9mIEZGIGhhdmUgckFGIGJ1dCBub3QgY0FGXG5pZighcmFmIHx8ICFjYWYpIHtcbiAgaXNOYXRpdmUgPSBmYWxzZVxuXG4gIHZhciBsYXN0ID0gMFxuICAgICwgaWQgPSAwXG4gICAgLCBxdWV1ZSA9IFtdXG4gICAgLCBmcmFtZUR1cmF0aW9uID0gMTAwMCAvIDYwXG5cbiAgcmFmID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICBpZihxdWV1ZS5sZW5ndGggPT09IDApIHtcbiAgICAgIHZhciBfbm93ID0gbm93KClcbiAgICAgICAgLCBuZXh0ID0gTWF0aC5tYXgoMCwgZnJhbWVEdXJhdGlvbiAtIChfbm93IC0gbGFzdCkpXG4gICAgICBsYXN0ID0gbmV4dCArIF9ub3dcbiAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBjcCA9IHF1ZXVlLnNsaWNlKDApXG4gICAgICAgIC8vIENsZWFyIHF1ZXVlIGhlcmUgdG8gcHJldmVudFxuICAgICAgICAvLyBjYWxsYmFja3MgZnJvbSBhcHBlbmRpbmcgbGlzdGVuZXJzXG4gICAgICAgIC8vIHRvIHRoZSBjdXJyZW50IGZyYW1lJ3MgcXVldWVcbiAgICAgICAgcXVldWUubGVuZ3RoID0gMFxuICAgICAgICBmb3IodmFyIGkgPSAwOyBpIDwgY3AubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBpZighY3BbaV0uY2FuY2VsbGVkKSB7XG4gICAgICAgICAgICB0cnl7XG4gICAgICAgICAgICAgIGNwW2ldLmNhbGxiYWNrKGxhc3QpXG4gICAgICAgICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHsgdGhyb3cgZSB9LCAwKVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSwgTWF0aC5yb3VuZChuZXh0KSlcbiAgICB9XG4gICAgcXVldWUucHVzaCh7XG4gICAgICBoYW5kbGU6ICsraWQsXG4gICAgICBjYWxsYmFjazogY2FsbGJhY2ssXG4gICAgICBjYW5jZWxsZWQ6IGZhbHNlXG4gICAgfSlcbiAgICByZXR1cm4gaWRcbiAgfVxuXG4gIGNhZiA9IGZ1bmN0aW9uKGhhbmRsZSkge1xuICAgIGZvcih2YXIgaSA9IDA7IGkgPCBxdWV1ZS5sZW5ndGg7IGkrKykge1xuICAgICAgaWYocXVldWVbaV0uaGFuZGxlID09PSBoYW5kbGUpIHtcbiAgICAgICAgcXVldWVbaV0uY2FuY2VsbGVkID0gdHJ1ZVxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGZuKSB7XG4gIC8vIFdyYXAgaW4gYSBuZXcgZnVuY3Rpb24gdG8gcHJldmVudFxuICAvLyBgY2FuY2VsYCBwb3RlbnRpYWxseSBiZWluZyBhc3NpZ25lZFxuICAvLyB0byB0aGUgbmF0aXZlIHJBRiBmdW5jdGlvblxuICBpZighaXNOYXRpdmUpIHtcbiAgICByZXR1cm4gcmFmLmNhbGwoZ2xvYmFsLCBmbilcbiAgfVxuICByZXR1cm4gcmFmLmNhbGwoZ2xvYmFsLCBmdW5jdGlvbigpIHtcbiAgICB0cnl7XG4gICAgICBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpXG4gICAgfSBjYXRjaChlKSB7XG4gICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkgeyB0aHJvdyBlIH0sIDApXG4gICAgfVxuICB9KVxufVxubW9kdWxlLmV4cG9ydHMuY2FuY2VsID0gZnVuY3Rpb24oKSB7XG4gIGNhZi5hcHBseShnbG9iYWwsIGFyZ3VtZW50cylcbn1cbiIsIihmdW5jdGlvbiAocHJvY2Vzcyl7XG4vLyBHZW5lcmF0ZWQgYnkgQ29mZmVlU2NyaXB0IDEuNi4zXG4oZnVuY3Rpb24oKSB7XG4gIHZhciBnZXROYW5vU2Vjb25kcywgaHJ0aW1lLCBsb2FkVGltZTtcblxuICBpZiAoKHR5cGVvZiBwZXJmb3JtYW5jZSAhPT0gXCJ1bmRlZmluZWRcIiAmJiBwZXJmb3JtYW5jZSAhPT0gbnVsbCkgJiYgcGVyZm9ybWFuY2Uubm93KSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBwZXJmb3JtYW5jZS5ub3coKTtcbiAgICB9O1xuICB9IGVsc2UgaWYgKCh0eXBlb2YgcHJvY2VzcyAhPT0gXCJ1bmRlZmluZWRcIiAmJiBwcm9jZXNzICE9PSBudWxsKSAmJiBwcm9jZXNzLmhydGltZSkge1xuICAgIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gKGdldE5hbm9TZWNvbmRzKCkgLSBsb2FkVGltZSkgLyAxZTY7XG4gICAgfTtcbiAgICBocnRpbWUgPSBwcm9jZXNzLmhydGltZTtcbiAgICBnZXROYW5vU2Vjb25kcyA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGhyO1xuICAgICAgaHIgPSBocnRpbWUoKTtcbiAgICAgIHJldHVybiBoclswXSAqIDFlOSArIGhyWzFdO1xuICAgIH07XG4gICAgbG9hZFRpbWUgPSBnZXROYW5vU2Vjb25kcygpO1xuICB9IGVsc2UgaWYgKERhdGUubm93KSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBEYXRlLm5vdygpIC0gbG9hZFRpbWU7XG4gICAgfTtcbiAgICBsb2FkVGltZSA9IERhdGUubm93KCk7XG4gIH0gZWxzZSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBuZXcgRGF0ZSgpLmdldFRpbWUoKSAtIGxvYWRUaW1lO1xuICAgIH07XG4gICAgbG9hZFRpbWUgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgfVxuXG59KS5jYWxsKHRoaXMpO1xuXG4vKlxuLy9AIHNvdXJjZU1hcHBpbmdVUkw9cGVyZm9ybWFuY2Utbm93Lm1hcFxuKi9cblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoJ19wcm9jZXNzJykpIiwiLy8gY2hhdC9jb3JlLmpzXHJcbi8vIFRoZSBjb3JlIG9mIHRoZSBjaGF0IHNpbXVsYXRpb24gYmVoYXZpb3JcclxuXHJcbi8vIHZhciBpbmhlcml0cyA9IHJlcXVpcmUoXCJpbmhlcml0c1wiKTtcclxudmFyIGV4dGVuZCA9IHJlcXVpcmUoXCJleHRlbmRcIik7XHJcbnZhciBjb250cm9sbGVyID0gcmVxdWlyZShcInRwcC1jb250cm9sbGVyXCIpO1xyXG52YXIgZG9uZ2VyID0gcmVxdWlyZShcIi4vZG9uZ2VyLmpzXCIpO1xyXG5cclxuZnVuY3Rpb24gY3VyclRpbWUoKSB7IHJldHVybiBuZXcgRGF0ZSgpLmdldFRpbWUoKTsgfVxyXG5cclxuLyoqXHJcbiAqIFxyXG4gKi9cclxuZnVuY3Rpb24gQ2hhdCgpIHtcclxuXHR0aGlzLl9pbml0VXNlcmxpc3QoKTtcclxuXHR0aGlzLl9pbml0Q2hhdFNwYXduTG9vcCgpO1xyXG5cdFxyXG5cdHRoaXMuX2luaXRWaXNpdG9yRXZlbnRzKCk7XHJcbn1cclxuLy8gaW5oZXJpdHMoQ2hhdCwgKTtcclxuZXh0ZW5kKENoYXQucHJvdG90eXBlLCB7XHJcblx0XHJcblx0X3VfbGlzdCA6IFtdLCAvL2NvbnRhaW5zIHRoZSBsaXN0IG9mIGFsbCB1c2Vyc1xyXG5cdF91X2hhc2ggOiB7fSwgLy9jb250YWlucyBhIGhhc2ggb2YgdXNlcm5hbWVzIHRvIHVzZXJzXHJcblx0X3VfY2xhc3Nlczoge1xyXG5cdFx0Y2hhdGxlYWRlcjogW10sXHJcblx0XHRcclxuXHR9LFxyXG5cdFxyXG5cdF9pbml0VXNlcmxpc3QgOiBmdW5jdGlvbigpIHtcclxuXHRcdHZhciB1bCA9IHJlcXVpcmUoXCIuL3VzZXJsaXN0XCIpO1xyXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB1bC5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHR2YXIgdSA9IG5ldyBVc2VyKHVsW2ldKTtcclxuXHRcdFx0dGhpcy5fdV9saXN0LnB1c2godSk7XHJcblx0XHRcdHRoaXMuX3VfaGFzaFt1Lm5hbWVdID0gdTtcclxuXHRcdFx0XHJcblx0XHRcdGlmICghdGhpcy5wbGF5ZXJVc2VyKSB7XHJcblx0XHRcdFx0Ly9UaGUgZmlyc3QgdXNlciBpcyB0aGUgcGxheWVyJ3MgdXNlclxyXG5cdFx0XHRcdHRoaXMucGxheWVyVXNlciA9IHU7IFxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fSxcclxuXHRcclxuXHRfcmFuZG9tVXNlciA6IGZ1bmN0aW9uKHRpbWUpe1xyXG5cdFx0dGltZSA9IHRpbWUgfHwgbmV3IERhdGUoKS5nZXRUaW1lKCk7XHJcblx0XHR2YXIgaW5kZXg7XHJcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IDIwOyBpKyspIHsgLy90cnkgdXAgdG8gb25seSAyMCB0aW1lc1xyXG5cdFx0XHRpbmRleCA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIHRoaXMuX3VfbGlzdC5sZW5ndGgpO1xyXG5cdFx0XHR2YXIgdSA9IHRoaXMuX3VfbGlzdFtpbmRleF07XHJcblx0XHRcdGlmICh1Lm5leHRUaW1lVGFsayA+IHRpbWUpIHJldHVybiB1O1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHQvL0lmIHdlIGNhbid0IGZpbmQgYSB1c2VyIHRvIHJldHVybiwgbWFrZSBhIG5ldyBvbmUgYXMgYSBmYWxsYmFja1xyXG5cdFx0dmFyIHUgPSBuZXcgVXNlcih7bmFtZTogXCJndWVzdFwiKyAoTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMjAwMDApICsgMTAwMDApIH0pO1xyXG5cdFx0dGhpcy5fdV9saXN0LnB1c2godSk7XHJcblx0XHR0aGlzLl91X2hhc2hbdS5uYW1lXSA9IHU7XHJcblx0XHRyZXR1cm4gdTtcclxuXHR9LFxyXG5cdFxyXG5cdC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cdFxyXG5cdF9jdXJyQ2hhdE1vZGUgOiBudWxsLFxyXG5cdF9pbml0Q2hhdFNwYXduTG9vcCA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xyXG5cdFx0XHJcblx0XHRzZWxmLl9jdXJyQ2hhdE1vZGUgPSBcImxvYWRpbmdcIjtcclxuXHRcdHNldFRpbWVvdXQoY2hhdFRpY2ssIDMwMDApO1xyXG5cdFx0XHJcblx0XHRzZWxmLnNldENoYXRNb2RlID0gZnVuY3Rpb24obW9kZSkge1xyXG5cdFx0XHRzZWxmLl9jdXJyQ2hhdE1vZGUgPSBtb2RlO1xyXG5cdFx0XHRzZXRUaW1lb3V0KGNoYXRUaWNrLCAwKTtcclxuXHRcdH07XHJcblx0XHRcclxuXHRcdGZ1bmN0aW9uIGNoYXRUaWNrKCkge1xyXG5cdFx0XHR2YXIgbmV4dFVwZGF0ZSA9IHNlbGYudXBkYXRlQ2hhdCgpO1xyXG5cdFx0XHRpZiAobmV4dFVwZGF0ZSA8IDApIHJldHVybjtcclxuXHRcdFx0c2V0VGltZW91dChjaGF0VGljaywgbmV4dFVwZGF0ZSk7XHJcblx0XHR9XHJcblx0fSxcclxuXHRcclxuXHRzZXRDaGF0TW9kZSA6IGZ1bmN0aW9uKCl7fSxcclxuXHRcclxuXHR1cGRhdGVDaGF0IDogZnVuY3Rpb24oKSB7XHJcblx0XHRzd2l0Y2ggKHRoaXMuX2N1cnJDaGF0TW9kZSkge1xyXG5cdFx0XHRjYXNlIFwibm9ybWFsXCI6XHJcblx0XHRcdFx0dGhpcy5zcGF3bkNoYXRNZXNzYWdlKCk7XHJcblx0XHRcdFx0cmV0dXJuIDMwMCArIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSo0MDApO1xyXG5cdFx0XHRjYXNlIFwibG9hZGluZ1wiOlxyXG5cdFx0XHRcdC8vVE9ET1xyXG5cdFx0XHRcdHJldHVybiAtMTtcclxuXHRcdFx0Y2FzZSBcImRpc2Nvbm5lY3RlZFwiOlxyXG5cdFx0XHRcdC8vVE9ET1xyXG5cdFx0XHRcdHJldHVybiAxMDAwO1xyXG5cdFx0fVxyXG5cdH0sXHJcblx0XHJcblx0Ly8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblx0XHJcblx0X2N0eF9wb29sIDogW10sIC8vIENvbnRleHRzIHRoYXQgYXJlIGFjdGl2ZSBvciBoYXZlIG5vdCB5ZXQgdGltZWQgb3V0XHJcblx0Ly8gTG9uZyB0ZXJtIGNvbnRleHRzOlxyXG5cdF9jdHhfbG9jYXRpb24gOiBudWxsLCAvLyBUaGUgY29udGV4dCBmb3IgdGhlIGN1cnJlbnQgbG9jYXRpb25cclxuXHRfY3R4X29jY2FzaW9uIDogbnVsbCwgLy8gVGhlIGNvbnRleHQgZm9yIHRoZSBjdXJyZW50IG9jY2FzaW9uXHJcblx0XHJcblx0LyoqIEFkZHMgYSBDaGF0IENvbnRleHQgdG8gdGhlIGNvbnRleHQgcG9vbC4gKi9cclxuXHRhZGRDb250ZXh0IDogZnVuY3Rpb24oY3R4KSB7XHJcblx0XHRjdHgudGltZXN0YW1wID0gY3VyclRpbWUoKTtcclxuXHRcdHRoaXMuX2N0eF9wb29sLnB1c2goY3R4KTtcclxuXHRcdFxyXG5cdH0sXHJcblx0XHJcblx0c2V0TG9jYXRpb25Db250ZXh0IDogZnVuY3Rpb24oY29udGV4dCkge1xyXG5cdFx0XHJcblx0fSxcclxuXHRcclxuXHQvKiogKi9cclxuXHRfdGlja19tYW5hZ2VDb250ZXh0cyA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0dmFyIGRhdGUgPSBjdXJyVGltZSgpO1xyXG5cdFx0XHJcblx0XHQvLyBQcnVuZSB0aW1lZC1vdXQgY29udGV4dHNcclxuXHRcdHZhciBwb29sID0gdGhpcy5fY3R4X3Bvb2w7XHJcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHBvb2wubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0aWYgKHBvb2xbaV0uaXNUaW1lZG91dChkYXRlKSkge1xyXG5cdFx0XHRcdHBvb2wuc3BsaWNlKGksIDEpO1xyXG5cdFx0XHRcdGktLTtcclxuXHRcdFx0XHRjb250aW51ZTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH0sXHJcblx0XHJcblx0Ly8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblx0cGxheWVyVXNlcjogbnVsbCxcclxuXHRcclxuXHRfaW5pdFZpc2l0b3JFdmVudHMgOiBmdW5jdGlvbigpIHtcclxuXHRcdHZhciBzZWxmID0gdGhpcztcclxuXHRcdCQoZnVuY3Rpb24oKXtcclxuXHRcdFx0XHJcblx0XHRcdCQoXCIjY2hhdGJveFwiKS5vbihcImtleXByZXNzXCIsIGZ1bmN0aW9uKGUpe1xyXG5cdFx0XHRcdGlmIChlLndoaWNoID09IDEzICYmICFlLnNoaWZ0S2V5ICYmICFlLmN0cmxLZXkpIHsgLy8gRW50ZXJcclxuXHRcdFx0XHRcdHZhciBtc2cgPSAkKFwiI2NoYXRib3hcIikudmFsKCk7XHJcblx0XHRcdFx0XHQkKFwiI2NoYXRib3hcIikudmFsKFwiXCIpO1xyXG5cdFx0XHRcdFx0aWYgKG1zZy5pbmRleE9mKFwiL1wiKSAhPSAwKSB7XHJcblx0XHRcdFx0XHRcdHNlbGYucHV0TWVzc2FnZShzZWxmLnBsYXllclVzZXIsIG1zZyk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHQvL1Byb2Nlc3MgY2hhdCBtZXNzYWdlXHJcblx0XHRcdFx0XHRzZWxmLl9wcm9jZXNzUGxheWVyQ2hhdE1lc3NhZ2UobXNnKTtcclxuXHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblx0XHRcdFxyXG5cdFx0XHRcclxuXHRcdH0pO1xyXG5cdH0sXHJcblx0XHJcblx0X3Byb2Nlc3NQbGF5ZXJDaGF0TWVzc2FnZSA6IGZ1bmN0aW9uKG1zZykge1xyXG5cdFx0dmFyIHJlcztcclxuXHRcdGlmIChyZXMgPSAvXih1cHxkb3dufGxlZnR8cmlnaHR8c3RhcnR8c2VsZWN0fGJ8YSkvaS5leGVjKG1zZykpIHtcclxuXHRcdFx0Y29udHJvbGxlci5zdWJtaXRDaGF0S2V5cHJlc3MocmVzWzFdKTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0XHJcblx0fSxcclxuXHRcclxuXHRcclxuXHQvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHRcclxuXHQvKiogXHJcblx0ICogUHV0cyBhIG1lc3NhZ2UgaW50byB0aGUgY2hhdC5cclxuXHQgKi9cclxuXHRwdXRNZXNzYWdlIDogZnVuY3Rpb24odXNlciwgdGV4dCkge1xyXG5cdFx0aWYgKHR5cGVvZiB1c2VyID09IFwic3RyaW5nXCIpXHJcblx0XHRcdHVzZXIgPSB0aGlzLl91X2hhc2hbdXNlcl07XHJcblx0XHRcclxuXHRcdHZhciBsaW5lID0gJChcIjxsaT5cIikuYWRkQ2xhc3MoXCJjaGF0LWxpbmVcIik7XHJcblx0XHR2YXIgYmFkZ2VzID0gJChcIjxzcGFuPlwiKS5hZGRDbGFzcyhcImJhZGdlc1wiKTtcclxuXHRcdHZhciBmcm9tID0gJChcIjxzcGFuPlwiKS5hZGRDbGFzcyhcImZyb21cIik7XHJcblx0XHR2YXIgY29sb24gPSBudWxsO1xyXG5cdFx0dmFyIG1zZyA9ICQoXCI8c3Bhbj5cIikuYWRkQ2xhc3MoXCJtZXNzYWdlXCIpO1xyXG5cdFx0XHJcblx0XHQvLyBTdHlsZSB0aGUgbWVzc2FnZVxyXG5cdFx0aWYgKHVzZXIuYmFkZ2VzKSBiYWRnZXMuYXBwZW5kKHVzZXIuYmFkZ2VzKTtcclxuXHRcdGZyb20uaHRtbCh1c2VyLm5hbWUpO1xyXG5cdFx0ZnJvbS5jc3MoeyBcImNvbG9yXCI6IHVzZXIuY29sb3IgfSk7XHJcblx0XHRcclxuXHRcdC8vUHJvY2VzcyBtZXNzYWdlXHJcblx0XHQvL1RPRE8gcmVwbGFjZSBkb25nZXIgcGxhY2Vob2xkZXJzIGhlcmVcclxuXHRcdHRleHQgPSBkb25nZXIuZG9uZ2VyZnkodGV4dCk7XHJcblx0XHRcclxuXHRcdC8vIEVzY2FwZSBIVE1MXHJcblx0XHR0ZXh0ID0gbXNnLnRleHQodGV4dCkuaHRtbCgpO1xyXG5cdFx0XHJcblx0XHQvLyBSZXBsYWNlIFR3aXRjaCBlbW90ZXNcclxuXHRcdHRleHQgPSBkb25nZXIudHdpdGNoaWZ5KHRleHQpO1xyXG5cdFx0XHJcblx0XHRtc2cuaHRtbCh0ZXh0KTtcclxuXHRcdFxyXG5cdFx0aWYgKCF0ZXh0LnN0YXJ0c1dpdGgoXCIvbWUgXCIpKSB7XHJcblx0XHRcdGNvbG9uID0gJChcIjxzcGFuPlwiKS5hZGRDbGFzcyhcImNvbG9uXCIpLmh0bWwoXCI6XCIpO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0bXNnLmNzcyh7IFwiY29sb3JcIjogdXNlci5jb2xvciB9KTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0bGluZS5hcHBlbmQoYmFkZ2VzLCBmcm9tLCBjb2xvbiwgbXNnKTtcclxuXHRcdFxyXG5cdFx0JChcIiNjaGF0LWxpbmVzXCIpLmFwcGVuZChsaW5lKTtcclxuXHR9LFxyXG5cclxuXHRcclxufSk7XHJcbm1vZHVsZS5leHBvcnRzID0gbmV3IENoYXQoKTtcclxuXHJcblxyXG5mdW5jdGlvbiBzcGF3bkNoYXRNZXNzYWdlKCkge1xyXG5cdHZhciBkYXRlID0gY3VyclRpbWUoKTtcclxuXHRcdFxyXG5cdC8vIFxyXG5cdHZhciBwb29sID0gdGhpcy5fY3R4X3Bvb2w7XHJcblx0dmFyIGRpc3RQb29sID0gW107XHJcblx0dmFyIGFjY3VtID0gMDtcclxuXHRmb3IgKHZhciBpID0gMDsgaSA8IHBvb2wubGVuZ3RoOyBpKyspIHtcclxuXHRcdHZhciBpbmYgPSBwb29sW2ldLmdldEluZmx1ZW5jZSgpO1xyXG5cdFx0aWYgKGluZiA8IDApIGluZiA9IDA7XHJcblx0XHRcclxuXHRcdGFjY3VtICs9IGluZjtcclxuXHRcdGRpc3RQb29sLnB1c2goYWNjdW0pO1xyXG5cdH1cclxuXHRcclxuXHR2YXIgaW5kZXggPSBNYXRoLnJhbmRvbSgpICogYWNjdW07XHJcblx0dmFyIHNlbEN0eCA9IG51bGw7XHJcblx0Zm9yICh2YXIgaSA9IDA7IGkgPCBwb29sLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRpZiAoaW5kZXggPiBkaXN0UG9vbFtpXSkgY29udGludWU7XHJcblx0XHRzZWxDdHggPSBwb29sW2ldOyBicmVhaztcclxuXHR9XHJcblx0XHJcblx0Ly9Db250ZXh0IHRvIHB1bGwgZnJvbSBpcyBub3cgc2VsZWN0ZWRcclxuXHR2YXIgbXNnID0gc2VsQ3R4LmdldENoYXRNZXNzYWdlKGRhdGUpO1xyXG5cdFxyXG59XHJcbkNoYXQuc3Bhd25DaGF0TWVzc2FnZSA9IHNwYXduQ2hhdE1lc3NhZ2U7XHJcblxyXG5cclxuXHJcblxyXG5cclxuXHJcbi8qKlxyXG4gKiBcclxuICovXHJcbmZ1bmN0aW9uIFVzZXIob2JqKXtcclxuXHRpZiAoISh0aGlzIGluc3RhbmNlb2YgVXNlcikpIHJldHVybiBuZXcgVXNlcihvYmopO1xyXG5cdFxyXG5cdGV4dGVuZCh0aGlzLCBvYmopO1xyXG59XHJcblVzZXIucHJvdG90eXBlID0ge1xyXG5cdG5hbWUgOiBudWxsLFxyXG5cdGNvbG9yIDogXCIjMDAwMDAwXCIsXHJcblx0cG9zdG1zZyA6IFwiXCIsXHJcblx0cHJlbXNnIDogXCJcIixcclxuXHRiYWRnZXMgOiBudWxsLFxyXG5cdFxyXG5cdG5leHRUaW1lVGFsazogMCwgLy9uZXh0IHRpbWUgdGhpcyB1c2VyIGlzIGFsbG93ZWQgdG8gdGFsa1xyXG5cdGxhc3RUaW1lb3V0OiAwLCAvL3RoZSBsYXN0IHRpbWVvdXQgdGhpcyB1c2VyIGhhZCwgaW4gc2Vjb25kcy4gTW9yZSB0aGFuIDUgc2Vjb25kcyBpbmRpY2F0ZXMgYSBiYW4gbW9tZW50LlxyXG5cdFxyXG59O1xyXG4iLCIvLyBkb25nZXIuanNcclxuLy8gRm9yIGVhc3kgZGVmaW5pdGlvbiBvZiBkb25nZXJzIGFuZCBUd2l0Y2ggZW1vdGVzXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHtcclxuXHRkb25nZXJmeSA6IGZ1bmN0aW9uKHN0cikge1xyXG5cdFx0cmV0dXJuIHN0ci5yZXBsYWNlKC9cXDxkOihcXHcrKVxcPi9pZywgZnVuY3Rpb24obWF0Y2gsIHAxKXtcclxuXHRcdFx0cmV0dXJuIGRvbmdlcnNbcDFdIHx8IFwiXCI7XHJcblx0XHR9KTtcclxuXHR9LFxyXG5cdFxyXG5cdHR3aXRjaGlmeSA6IGZ1bmN0aW9uKHN0cikge1xyXG5cdFx0cmV0dXJuIHN0ci5yZXBsYWNlKHR3aXRjaEVtb3RlUGF0dGVybiwgZnVuY3Rpb24obWF0Y2gpe1xyXG5cdFx0XHRyZXR1cm4gJzxzcGFuIGNsYXNzPVwidHdpdGNoZW1vdGUgZW0tJyttYXRjaCsnXCI+PC9zcGFuPic7XHJcblx0XHR9KTtcclxuXHR9LFxyXG59XHJcblxyXG52YXIgdHdpdGNoRW1vdGVQYXR0ZXJuID0gbmV3IFJlZ0V4cChbXHJcblx0XCJEYW5zR2FtZVwiLFxyXG5cdFwiUHJhaXNlSXRcIixcclxuXHRcIkJpYmxlVGh1bXBcIixcclxuXHRcIkJsb29kVHJhaWxcIixcclxuXHRcIlBKU2FsdFwiLFxyXG5cdFwiQmFieVJhZ2VcIixcclxuXHRcIkhleUd1eXNcIixcclxuXHRcIkJpb25pY0J1bmlvblwiLFxyXG5cdFwiUmVzaWRlbnRTbGVlcGVyXCIsXHJcblx0XCJXaW5XYWtlclwiLFxyXG5cdFwiU2hpYmVaXCIsXHJcblx0XCJCaWdCcm90aGVyXCIsXHJcblx0XCJEYXRTaGVmZnlcIixcclxuXHRcIkJyb2tlQmFja1wiLFxyXG5cdFwiRWxlR2lnZ2xlXCIsXHJcblx0XCJUcmlIYXJkXCIsXHJcblx0XCJPTUdTY29vdHNcIixcclxuXHRcIlBvZ0NoYW1wXCIsXHJcblx0XCJLYXBwYVwiLFxyXG5cdFwiU29vbmVyTGF0ZXJcIixcclxuXHRcIkthcHBhSERcIixcclxuXHRcIkJyYWluU2x1Z1wiLFxyXG5cdFwiU3dpZnRSYWdlXCIsXHJcblx0XCJGYWlsRmlzaFwiLFxyXG5cdFwiTXJEZXN0cnVjdG9pZFwiLFxyXG5cdFwiREJTdHlsZVwiLFxyXG5cdFwiT3BpZU9QXCIsXHJcblx0XCJHYXNKb2tlclwiLFxyXG5cdFwiNEhlYWRcIixcclxuXHRcIktldmluVHVydGxlXCIsXHJcblx0XCJLZWVwb1wiLFxyXG5cdFwiT25lSGFuZFwiLFxyXG5cdFwiS0FQT1dcIixcclxuXHRcIktyZXlnYXNtXCIsXHJcbl0uam9pbihcInxcIiksIFwiZ1wiKTtcclxuXHJcbnZhciBkb25nZXJzID0ge1xyXG5cdFwicmlvdFwiIDogXCLjg73gvLzguojZhM2c4LqI4Ly9776JXCIsXHJcblx0XCJyaW90b3ZlclwiOiBcIuKUjOC8vOC6iNmEzZzguojgvL3ilJBcIixcclxuXHRcInNvcGhpc3RpY2F0ZWRcIiA6IFwi44O94Ly84LqI2YTNnOCysOCzg+C8ve++iVwiLFxyXG5cdFwicHJhaXNlXCIgOiBcIuC8vCDjgaQg4peVX+KXlSDgvL3jgaRcIixcclxuXHRcInJ1bm5pbmdtYW5cIjogXCLhlZXgvLzguojZhM2c4LqI4Ly94ZWXXCIsXHJcblx0XCJkYW5jZVwiIDogXCLimasg4pSM4Ly84LqI2YTNnOC6iOC8veKUmCDimapcIixcclxuXHRcImxlbm55XCI6IFwiKCDNocKwIM2cypYgzaHCsClcIixcclxuXHRcImRvbmdlcmhvb2RcIjogXCLgvLwgwrrZhM2fwrog4Ly8IMK62YTNn8K6IOC8vCDCutmEzZ/CuiDgvL0gwrrZhM2fwrog4Ly9IMK62YTNn8K6IOC8vVwiLFxyXG5cdFxyXG5cdFwidGFibGVmbGlwXCIgOiBcIijila/CsOKWocKwKeKVr++4tSDilLvilIHilLtcIixcclxuXHRcInRhYmxlYmFja1wiIDogXCLilKzilIDilKzjg44o4LKgX+CyoOODjilcIixcclxuXHRcInRhYmxlZmxpcDJcIiA6IFwiKOODjuCyoOebiuCyoCnjg44g4pS74pSB4pS7XCIsXHJcblx0XCJ0YWJsZWJhY2syXCIgOiBcIuKUrOKUgOKUrOODjijgsqDnm4rgsqDjg44pXCIsXHJcblx0XCJ0YWJsZWZsaXAzXCIgOiBcIuKUu+KUgeKUuyDvuLXjg70oYNCUwrQp776J77i1IOKUu+KUgeKUu1wiLFxyXG5cdFwidGFibGViYWNrM1wiIDogXCLilKzilIDilKwg77i144O9KOCyoF/gsqAp776J77i1IOKUrOKUgOKUrFwiLFxyXG5cdFwidGFibGVmbGlwNFwiIDogXCLilKzilIDilKzvu78g77i1IC8oLuKWoS4gXFxcXO+8iVwiLFxyXG5cdFwidGFibGViYWNrNFwiIDogXCItKCDCsC3CsCktIOODjijgsqBf4LKg44OOKVwiLCBcclxuXHRcclxuXHRcIndvb3BlclwiOiBcIuWNhSjil5XigL/il5Up5Y2FXCIsXHJcblx0XCJicm9uem9uZ2VyXCI6IFwi4pSUKG/Rqm8p4pSYXCIsXHJcblx0XCJkb290XCIgOiBcIuKKueKLm+KLiyjil5Diip3il5Ep4ouM4oua4oq5XCIsXHJcblx0XCJqb2x0aWtcIjogXCLila08POKXlcKwz4nCsOKXlT4+4pWuXCIsXHJcblx0XCJtZWdhZG9uZ2VyXCIgOiBcIuKVsi/ila3gvLzguojguojZhM2c4LqI4LqI4Ly94pWuL+KVsVwiLFxyXG5cdFwidHJhcG5pY2hcIjogXCLjg73gvLzinKrvuY/inKrgvL3vvolcIixcclxufTtcclxuXHJcblxyXG5cclxudmFyIGNvcHlwYXN0YSA9IHtcclxuXHRcInJpb3Rwb2xpY2VcIiA6IFtcclxuXHRcdFwiKOKWgMy/IMy/xLnMr+KWgMy/IMy/KSBUSElTIElTIFRIRSBSSU9UIFBPTElDRS4gU1RPUCBSSU9USU5HIE5PVyAo4paAzL8gzL/Eucyv4paAzL8gzL8pXCIsXHJcblx0XHRcIijijJDilqBf4pagKT0vzLUvJ8y/J8y/IMy/IMy/IOODveC8vOC6iNmEzZzguojgvL3vvokgVEhJUyBJUyBUSEUgUklPVCBQT0xJQ0UsIENFQVNFIFJJT1RJTkcgT1IgSSBTSE9PVCBUSEUgRE9OR0VSISFcIixcclxuXHRdLFxyXG5cdFwibGlrZTJyYWlzZVwiIDogXCJJIGxpa2UgdG8gcmFpc2UgbXkgRG9uZ2VyIEkgZG8gaXQgYWxsIHRoZSB0aW1lIOODveC8vOC6iNmEzZzguojgvL3vvokgYW5kIGV2ZXJ5IHRpbWUgaXRzIGxvd2VyZWTilIzgvLzguojZhM2c4LqI4Ly94pSQIEkgY3J5IGFuZCBzdGFydCB0byB3aGluZSDilIzgvLxA2YTNnEDgvL3ilJBCdXQgbmV2ZXIgbmVlZCB0byB3b3JyeSDgvLwgwrrZhM2fwrrgvL0gbXkgRG9uZ2VyJ3Mgc3RheWluZyBzdHJvbmcg44O94Ly84LqI2YTNnOC6iOC8ve++iUEgRG9uZ2VyIHNhdmVkIGlzIGEgRG9uZ2VyIGVhcm5lZCBzbyBzaW5nIHRoZSBEb25nZXIgc29uZyEg4ZWm4Ly84LqI2YTNnOC6iOC8veGVpFwiLFxyXG5cdFwibWVnYWRvbmdlclwiIDogW1xyXG5cdFx0XCLilbIv4pWt4Ly84LqI4LqI2YTNnOC6iOC6iOC8veKVri/ilbEgUFJBSVNFIFRIRSBNRUdBLURPTkdFUiDilbIv4pWt4Ly84LqI4LqI2YTNnOC6iOC6iOC8veKVri/ilbFcIixcclxuXHRcdFwi44O94Ly84LqI2YTNnOC6iOC8ve++iSBkb25nZXIncyBkb25naXRlIGlzIHJlYWN0aW5nIHRvIHRoZSBtZWdhIHN0b25lICgo44O94Ly84LqI2YTNnOC6iOC8ve++iSkpIGRvbmdlciBldm9sdmVkIGludG8gbWVnYSBkb25nZXIgXFxcIuKVsi/gvLzguojguojZhM2c4LqI4LqI4Ly9L+KVsVxcXCIgbWVnYSBkb25nZXIgdXNlZCByYWlzZSwgaXQncyBzdXBlciBlZmZlY3RpdmUgd2lsZCBsb3dlcmVkIGRvbmcgZmFpbnRlZFwiLFxyXG5cdFx0XCLjg73gvLzguojZhM2c4LqI4Ly9776JIERvbmdlciBpcyByZWFjdGluZyB0byB0aGUgRG9uZ2VyaXRlISAsL+KVsi/ila3gvLzguojguojZhM2c4LqI4LqI4Ly94pWuL+KVsSwgRG9uZ2VyIE1lZ2EgRXZvbHZlZCBpbnRvIE1lZ2EgRG9uZ2VyIVwiLFxyXG5cdFx0XCJET05HRVInUyBET05HRVJJVEUgSVMgUkVBQ1RJTkcgVE8gVEhFIE1FR0EgUklORyEgLC/ilbIv4pWt4Ly84LqI4LqI2YTNnOC6iOC6iOC8veKVri/ilbHvu78sIE1FR0EgUklPVCAsL+KVsi/ila3gvLzguojguojZhM2c4LqI4LqI4Ly94pWuL+KVse+7vyxcIixcclxuXHRdLFxyXG5cdFwicmlwZG9vZlwiIDogXCJJLi4uIEkganVzdCB3YW50ZWQgdG8gZGVwb3NpdCBCaWRvb2YuIFNoZSB3YXMgc28gZ29vZCB0byB1cy4uLiBhbHdheXMgc28gbG95YWwuIFdoZW4gc2hlIGNvdWxkbid0IGV2b2x2ZSBmb3IgdXMsIHNoZSB3ZW50IHRvIHRoZSBEYXljYXJlIGhhcHBpbHksIGFuZCB0aGVuIGNhbWUgYmFjayBoYXBwaWx5LCB3ZWFyaW5nIHRoYXQgc3R1cGlkIGdyaW4gb24gaGVyIGZhY2UgYWxsIHRoZSB3aGlsZS4gV2hlbiB3ZSBhc2tlZCBoZXIgdG8gZ28gdG8gdGhlIFBDLCBzaGUgbmV2ZXIgb25jZSBjb21wbGFpbmVkLiBTaGUgd2FzIGp1c3QgdGhlcmUgZm9yIHVzLCBsb3lhbGx5LCB0aGUgd2F5IHNoZSBhbHdheXMgaGFkIGJlZW4uLi4uQW5kIHRoZW4gd2Uga2lsbGVkIGhlci4gUklQIERvb2YsIHlvdSB3aWxsIGJlIG1pc3NlZC4gOihcIixcclxuXHRcInR3aXRjaFwiIDogW1xyXG5cdFx0XCJJJ20gYSBUd2l0Y2ggZW1wbG95ZWUgYW5kIEknbSBzdG9wcGluZyBieSB0byBzYXkgeW91ciBUd2l0Y2ggY2hhdCBpcyBvdXQgb2YgY29udHJvbC4gSSBoYXZlIHJlY2VpdmVkIHNldmVyYWwgY29tcGxhaW50cyBmcm9tIHlvdXIgdmVyeSBvd24gdmlld2VycyB0aGF0IHRoZWlyIGNoYXQgZXhwZXJpZW5jZSBpcyBydWluZWQgYmVjYXVzZSBvZiBjb25zdGFudCBFbW90ZSBhbmQgQ29weXBhc3RhIHNwYW1taW5nLiBUaGlzIHR5cGUgdW5hY2NlcHRhYmxlIGJ5IFR3aXRjaCdzIHN0YW5kYXJkcyBhbmQgaWYgeW91ciBtb2RzIGRvbid0IGRvIHNvbWV0aGluZyBhYm91dCBpdCB3ZSB3aWxsIGJlIGZvcmNlZCB0byBzaHV0IGRvd24geW91ciBjaGFubmVsLiBXaXNoIHlvdSBhbGwgdGhlIGJlc3QgLSBUd2l0Y2hcIixcclxuXHRcdC8qIFBhcmsgdmVyc2lvbiAqL1wiSSdtIGEgVHdpdGNoIGVtcGxveWVlIGFuZCBJJ20gc3RvcHBpbmcgYnkgdG8gc2F5IHlvdXIgVHdpdGNoIGNoYXQgbG9va3MgdG9vIG11Y2ggbGlrZSB0aGUgb2ZmaWNpYWwgdHdpdGNoIGNoYXQuIEkgaGF2ZSByZWNlaXZlZCBzZXZlcmFsIGNvbXBsYWludHMgZnJvbSB5b3VyIHZlcnkgb3duIHZpc2l0b3JzIHRoYXQgdGhlaXIgY2hhdCBleHBlcmllbmNlIGlzIHJ1aW5lZCBiZWNhdXNlIG9mIGNvbnN0YW50IGNoYXQgYmVpbmcgc3BhbW1lZCBvbiB0aGUgcmlnaHQtaGFuZCBzaWRlLiBUaGlzIGlzIHVuYWNjZXB0YWJsZSBieSBUd2l0Y2gncyBUT1MgYW5kIGlmIHlvdXIgbW9kcyBkb24ndCBkbyBzb21ldGhpbmcgYWJvdXQgaXQgd2Ugd2lsbCBiZSBmb3JjZWQgdG8gc2h1dCBkb3duIHlvdXIgcGFyay4gV2lzaCB5b3UgYWxsIHRoZSBiZXN0IC0gVHdpdGNoXCIsXHJcblx0XSxcclxuXHRcInN0aWxsYXRoaW5nXCIgOiBbXHJcblx0XHRcIklzIHRwcCBzdGlsbCBhIHRoaW5nP1wiLFxyXG5cdFx0XCJJcyB0cHAgc3RpbGwgYSB0aGluZz8gS2FwcGFcIixcclxuXHRcdFwiSXMgXFxcIklzIHRwcCBzdGlsbCBhIHRoaW5nP1xcXCIgc3RpbGwgYSB0aGluZz9cIixcclxuXHRcdFwiSXMgXFxcIklzIFxcXCJJcyB0cHAgc3RpbGwgYSB0aGluZz9cXFwiIHN0aWxsIGEgdGhpbmc/XFxcIiBzdGlsbCBhIHRoaW5nP1wiLFxyXG5cdFx0XCJJcyBcXFwiSXMgXFxcIklzIFxcXCJJcyB0cHAgc3RpbGwgYSB0aGluZz9cXFwiIHN0aWxsIGEgdGhpbmc/XFxcIiBzdGlsbCBhIHRoaW5nP1xcXCIgc3RpbGwgYSB0aGluZz9cIixcclxuXHRcdFwiSXMgXFxcIklzIFxcXCJJcyBcXFwiSXMgSXMgXFxcIklzIFxcXCJJcyBcXFwiSXMgdHBwIHN0aWxsIGEgdGhpbmc/XFxcIiBzdGlsbCBhIHRoaW5nP1xcXCIgc3RpbGwgYSB0aGluZz9cXFwiIHN0aWxsIGEgdGhpbmc/IHN0aWxsIGEgdGhpbmc/XFxcIiBzdGlsbCBhIHRoaW5nP1xcXCIgc3RpbGwgYSB0aGluZz9cXFwiIHN0aWxsIGEgdGhpbmc/XCIsXHJcblx0XSxcclxuXHRcImRhbmNlcmlvdFwiIDogW1xyXG5cdFx0XCLimasg4pSM4Ly84LqI2YTNnOC6iOC8veKUmCBEQU5DRSBSSU9UIOKZqiDilJTgvLzguojZhM2c4LqI4Ly94pSQIOKZq1wiLFxyXG5cdFx0XCLimasg4pSM4Ly84LqI2YTNnOC6iOC8veKUmCDimaogREFOQ0UgUklPVCDimaog4pSU4Ly84LqI2YTNnOC6iOC8veKUkCDimatcIixcclxuXHRcdFwi4pmrIOKUjOC8vOC6iNmEzZzguojgvL3ilJgg4pmqIERBTkNFIFJJT1Qg4pmrIOKUjOC8vOC6iNmEzZzguojgvL3ilJgg4pmqXCIsXHJcblx0XSxcclxuXHRcInJpb3RcIiA6IFtcclxuXHRcdFwi44O94Ly84LqI2YTNnOC6iOC8ve++iSBSSU9UIOODveC8vOC6iNmEzZzguojgvL3vvolcIixcclxuXHRdLFxyXG5cdFwibGV0aXRkb25nXCIgOiBcIuODveC8vOC6iNmEzZzguojgvL3vvokgTEVUIElUIERPTkcsIExFVCBJVCBET05HLCBDT1VMRE4nVCBSSU9UIEJBQ0sgQU5ZTU9SRS4gTEVUIElUIERPTkcsIExFVCBJVCBET05HLCBMRVQnUyBHRVQgQkFDSyBUTyBUSEUgTE9SRSwgSSBET04nVCBDQVJFIFRIQVQgVEhFIERPTkdFUlMgV0VSRSBHT05FLCBMRVQgVEhFIERPTkdTIFJBR0UgT04sIFRIRSBSSU9UIE5FVkVSIEJPVEhFUkVEIE1FIEFOWVdBWS4g44O94Ly84LqI2YTNnOC6iOC8ve++iVwiLFxyXG5cdFxyXG5cdFwiZG9udHNwYW1cIiA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0dmFyIGEgPSBcInNwYW1cIjtcclxuXHRcdGNvbnN0IHJlcGwgPSBbXCJSSU9UXCIsIFwiYmVhdCBtaXN0eVwiLCBcIuC8vCDjgaQg4peVX+KXlSDgvL3jgaRcIl07XHJcblx0XHRcclxuXHRcdGNvbnN0IHNwYW0gPSBcIkd1eXMgY2FuIHlvdSBwbGVhc2Ugbm90IFslZF0gdGhlIGNoYXQuIE15IG1vbSBib3VnaHQgbWUgdGhpcyBuZXcgbGFwdG9wIGFuZCBpdCBnZXRzIHJlYWxseSBob3Qgd2hlbiB0aGUgY2hhdCBpcyBiZWluZyBbJWRdZWQuIE5vdyBteSBsZWcgaXMgc3RhcnRpbmcgdG8gaHVydCBiZWNhdXNlIGl0IGlzIGdldHRpbmcgc28gaG90LiBQbGVhc2UsIGlmIHlvdSBkb27igJl0IHdhbnQgbWUgdG8gZ2V0IGJ1cm5lZCwgdGhlbiBkb250IFslZF0gdGhlIGNoYXRcIjtcclxuXHR9LFxyXG5cdFxyXG5cdFwiYXdlZnVsaHVtYW5zXCIgOiBcIkh1bWFucyBhcmUgYXdmdWwuIFRoaXMgcGxhbmV0IHdvdWxkIGJlIHdheSBiZXR0ZXIgaWYgdGhlcmUgd2VyZSBubyBodW1hbnMgaW4gaXQuIFRydWUgc3RvcnkuIERPTidUIENPUFkgVEhJU1wiLFxyXG5cdFwicnVpbmVkY2hhdFwiIDogXCJZb3UgZ3V5cyBhcmUgcnVpbmluZyBteSB0d2l0Y2ggY2hhdCBleHBlcmllbmNlLiBJIGNvbWUgdG8gdGhlIHR3aXRjaCBjaGF0IGZvciBtYXR1cmUgY29udmVyc2F0aW9uIGFib3V0IHRoZSBnYW1lcGxheSwgb25seSB0byBiZSBhd2FyZGVkIHdpdGgga2FwcGEgZmFjZXMgYW5kIGZyYW5rZXJ6cy4gUGVvcGxlIHdobyBzcGFtIHNhaWQgZmFjZXMgbmVlZCBtZWRpY2FsIGF0dGVudGlvbiB1dG1vc3QuIFRoZSB0d2l0Y2ggY2hhdCBpcyBzZXJpb3VzIGJ1c2luZXNzLCBhbmQgdGhlIG1vZHMgc2hvdWxkIHJlYWxseSByYWlzZSB0aGVpciBkb25nZXJzLlwiLFxyXG5cdFwiZ29vZ2xlYWRtaW5cIiA6IFwiSGVsbG8gZXZlcnlvbmUsIHRoaXMgaXMgdGhlIEdvb2dsZSBBZG1pbiBoZXJlIHRvIHJlbWluZCB5b3UgYWxsIHRoYXQgd2hpbGUgd2UgbG92ZSB0aGUgY2hhdCBleHBlcmllbmNlLCBwbGVhc2UgcmVmcmFpbiBmcm9tIGNvcHkgcGFzdGluZyBpbiB0aGUgY2hhdC4gVGhpcyBydWlucyB0aGUgYXRtb3NwaGVyZSBhbmQgbWFrZXMgZXZlcnlib2R54oCZcyBjaGF0IGV4cGVyaWVuY2Ugd29yc2Ugb3ZlcmFsbC4gVGhhbmsgeW91IGFuZCByZW1lbWJlciB0byBsaW5rIHlvdXIgVHdpdGNoIGFuZCBHb29nbGUrIGFjY291bnQgdG9kYXkhXCIsXHJcblx0XCJiYWRzdGFkaXVtcmVxdWVzdFwiIDogXCJXb3cgMC8xMCB0byB0aGUgZ3V5IHdobyB0aG91Z2h0IG9mIHRoaXMgcmVxdWVzdCwgQVBQTEFVU0UgQ0xBUCBDTEFQIExBRFkgR0FHQSBBUFBMQVVTRSBBUFBMQVVTRSBBUFBMQVVTRVwiLFxyXG59O1xyXG5cclxuLy9TdGFyYm9sdF9vbWVnYSBLWmhlbGdoYXN0IiwiLy8gY2hhdC91c2VybGlzdC5qc1xyXG4vLyBUaGUgbGlzdCBvZiB1c2VycyB3aG8gd2lsbCBhcHBlYXIgaW4gY2hhdCwgd2l0aCBpbmZvIGFzc29jaWF0ZWQgd2l0aCB0aGVtLlxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBbXHJcbnsgY29sb3I6IFwiIzAwMDAwMFwiLCBuYW1lOiBcIlBhcmtWaXNpdG9yXCIsXHRcdFx0cGxheWVyOiB0cnVlLCB9LFxyXG5cclxueyBjb2xvcjogXCIjMDBGRjAwXCIsIG5hbWU6IFwiVHVzdGluMjEyMVwiLCBcdFx0XHRjb250cmlidXRvcjogdHJ1ZSwgfSxcclxuXHJcbnsgY29sb3I6IFwiI0ZGMDAwMFwiLCBuYW1lOiBcIkZhaXRoZnVsZm9yY2VcIiwgXHRcdFx0Y2hhdGxlYWRlcjogdHJ1ZSwgcG9zdG1zZzogXCJCbG9vZFRyYWlsXCIsIH0sXHJcbnsgY29sb3I6IFwiI0ZGMDAwMFwiLCBuYW1lOiBcIlozM2szM1wiLFx0XHRcdFx0XHRjaGF0bGVhZGVyOiB0cnVlLCBwcmVtc2c6IFwiREJTdHlsZVwiLCB9LFxyXG5cclxuXHJcblxyXG5dO1xyXG5cclxuIiwiLy8gZ2FtZXN0YXRlLmpzXHJcbi8vIFxyXG5cclxudmFyIGdhbWVTdGF0ZSA9XHJcbm1vZHVsZS5leHBvcnRzID0ge1xyXG5cdC8vIE1hcCBUcmFuc2l0aW9uXHJcblx0bWFwVHJhbnNpdGlvbiA6IHtcclxuXHRcdG5leHRNYXAgOiBcImlDaHVyY2hPZkhlbGl4XCIsXHJcblx0XHR3YXJwOiAwLFxyXG5cdFx0YW5pbU92ZXJyaWRlOiAwLFxyXG5cdH0sXHJcblx0XHJcblx0cGxheWVyU3ByaXRlIDogXCJ5b3VuZ3N0ZXJbaGdfdmVydG1peC0zMl0ucG5nXCIsXHJcbn07IiwiLy8gZ2xvYmFscy5qc1xyXG5cclxud2luZG93LlNvdW5kTWFuYWdlciA9IHJlcXVpcmUoXCIuL21hbmFnZXJzL3NvdW5kbWFuYWdlclwiKTtcclxud2luZG93LkdDID0gcmVxdWlyZShcIi4vbWFuYWdlcnMvZ2FyYmFnZS1jb2xsZWN0b3JcIik7XHJcbndpbmRvdy5VSSA9IHJlcXVpcmUoXCIuL21hbmFnZXJzL3VpLW1hbmFnZXJcIik7XHJcbndpbmRvdy5DaGF0ID0gcmVxdWlyZShcIi4vY2hhdC9jb3JlLmpzXCIpO1xyXG5cclxud2luZG93LmN1cnJlbnRNYXAgPSBudWxsO1xyXG53aW5kb3cuZ2FtZVN0YXRlID0gcmVxdWlyZShcIi4vZ2FtZXN0YXRlXCIpO1xyXG5cclxud2luZG93LkRFRl9URVhUVVJFID0gQkFTRVVSTCtcIi9pbWcvbWlzc2luZ190ZXgucG5nXCI7XHJcbndpbmRvdy5ERUZfU1BSSVRFID0gQkFTRVVSTCtcIi9pbWcvbWlzc2luZ19zcHJpdGUucG5nXCI7XHJcbndpbmRvdy5ERUZfU1BSSVRFX0ZPUk1BVCA9IFwicHRfaG9yenJvdy0zMlwiO1xyXG5cclxud2luZG93LkNPTkZJRyA9IHtcclxuXHRzcGVlZCA6IHtcclxuXHRcdHBhdGhpbmc6IDAuMjUsXHJcblx0XHRhbmltYXRpb246IDMsXHJcblx0fSxcclxuXHR0aW1lb3V0IDoge1xyXG5cdFx0d2Fsa0NvbnRyb2wgOiAxLFxyXG5cdH1cclxufTtcclxuXHJcbndpbmRvdy5ERUJVRyA9IHt9O1xyXG5cclxuXHJcbi8vT24gUmVhZHlcclxuJChmdW5jdGlvbigpe1xyXG5cdHdpbmRvdy5ERUZfVEVYVFVSRV9JTUcgPSAkKFwiPGltZz5cIikuYXR0cihcInNyY1wiLCBERUZfVEVYVFVSRSkuY3NzKHtkaXNwbGF5Olwibm9uZVwifSkuYXBwZW5kVG8oXCJib2R5XCIpWzBdO1xyXG5cdHdpbmRvdy5ERUZfU1BSSVRFX0lNRyA9ICQoXCI8aW1nPlwiKS5hdHRyKFwic3JjXCIsIERFRl9TUFJJVEUpLmNzcyh7ZGlzcGxheTpcIm5vbmVcIn0pLmFwcGVuZFRvKFwiYm9keVwiKVswXTtcclxufSk7XHJcbiIsIi8vIGdhcmJhZ2UtY29sbGVjdG9yLmpzXHJcbi8vIEFsbG9jYXRlcyBhbGwgdGhlIHZhcmlvdXMgZGlzcG9zYWJsZSBpdGVtcywgc3VjaCBhcyBnZW9tZXRyeSBhbmQgbGlzdGVuZXJzLCBmb3JcclxuLy8gbGF0ZXIgZGlzcG9zYWwuXHJcblxyXG52YXIgUkVWT0tFX1VSTFMgPSAhIVVSTC5yZXZva2VPYmplY3RVUkw7XHJcblxyXG5cclxuZnVuY3Rpb24gR2FyYmFnZUNvbGxlY3RvcigpIHtcclxuXHR0aGlzLmJpbnMgPSB7fTtcclxuXHR0aGlzLmFsbG9jYXRlQmluKFwiX2RlZmF1bHRcIik7XHJcbn1cclxuXHJcbkdhcmJhZ2VDb2xsZWN0b3IucHJvdG90eXBlLmFsbG9jYXRlQmluID0gZnVuY3Rpb24oYmluSWQpIHtcclxuXHR2YXIgYmluID0gdGhpcy5iaW5zW2JpbklkXSA9IG5ldyBHYXJiYWdlQmluKCk7XHJcbn1cclxuXHJcbkdhcmJhZ2VDb2xsZWN0b3IucHJvdG90eXBlLmNvbGxlY3QgPSBmdW5jdGlvbihvYmosIGJpbklkKXtcclxuXHRpZiAoIWJpbklkKSBiaW5JZCA9IFwiX2RlZmF1bHRcIjtcclxuXHR2YXIgYmluID0gdGhpcy5iaW5zW2JpbklkXTtcclxuXHRpZiAoIWJpbikge1xyXG5cdFx0Y29uc29sZS53YXJuKFwiW0dDXSBCaW4gZG9lcyBub3QgZXhpc3QhIFB1dHRpbmcgb2JqZWN0IGluIGRlZmF1bHQgYmluLiBCaW5JRDpcIiwgYmluSUQpO1xyXG5cdFx0YmluID0gdGhpcy5iaW5zW1wiX2RlZmF1bHRcIl07XHJcblx0fVxyXG5cdGJpbi5jb2xsZWN0KG9iaik7XHJcbn1cclxuXHJcbkdhcmJhZ2VDb2xsZWN0b3IucHJvdG90eXBlLmNvbGxlY3RVUkwgPSBmdW5jdGlvbihvYmosIGJpbklkKXtcclxuXHRpZiAoIWJpbklkKSBiaW5JZCA9IFwiX2RlZmF1bHRcIjtcclxuXHR2YXIgYmluID0gdGhpcy5iaW5zW2JpbklkXTtcclxuXHRpZiAoIWJpbikge1xyXG5cdFx0Y29uc29sZS53YXJuKFwiW0dDXSBCaW4gZG9lcyBub3QgZXhpc3QhIFB1dHRpbmcgb2JqZWN0IGluIGRlZmF1bHQgYmluLiBCaW5JRDpcIiwgYmluSUQpO1xyXG5cdFx0YmluID0gdGhpcy5iaW5zW1wiX2RlZmF1bHRcIl07XHJcblx0fVxyXG5cdGJpbi5jb2xsZWN0VVJMKG9iaik7XHJcbn1cclxuXHJcbkdhcmJhZ2VDb2xsZWN0b3IucHJvdG90eXBlLmdldEJpbiA9IGZ1bmN0aW9uKGJpbklkKSB7XHJcblx0aWYgKCFiaW5JZCkgYmluSWQgPSBcIl9kZWZhdWx0XCI7XHJcblx0dmFyIGJpbiA9IHRoaXMuYmluc1tiaW5JZF07XHJcblx0aWYgKCFiaW4pIHtcclxuXHRcdGNvbnNvbGUud2FybihcIltHQ10gQmluIGRvZXMgbm90IGV4aXN0ISBHZXR0aW5nIGRlZmF1bHQgYmluLiBCaW5JRDpcIiwgYmluSUQpO1xyXG5cdFx0YmluID0gdGhpcy5iaW5zW1wiX2RlZmF1bHRcIl07XHJcblx0fVxyXG5cdHJldHVybiBiaW47XHJcbn1cclxuXHJcbkdhcmJhZ2VDb2xsZWN0b3IucHJvdG90eXBlLmRpc3Bvc2UgPSBmdW5jdGlvbihiaW5JZCkge1xyXG5cdGlmICghYmluSWQpIGJpbklkID0gXCJfZGVmYXVsdFwiO1xyXG5cdHZhciBiaW4gPSB0aGlzLmJpbnNbYmluSWRdO1xyXG5cdGlmICghYmluKSB7XHJcblx0XHRjb25zb2xlLndhcm4oXCJbR0NdIEJpbiBkb2VzIG5vdCBleGlzdCEgQ2Fubm90IGRpc3Bvc2UhIEJpbklEOlwiLCBiaW5JRCk7XHJcblx0XHRyZXR1cm47XHJcblx0fVxyXG5cdFxyXG5cdGJpbi5kaXNwb3NlKCk7XHJcblx0XHJcblx0YmluID0gbnVsbDtcclxuXHRkZWxldGUgdGhpcy5iaW5zW2JpbklkXTtcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBuZXcgR2FyYmFnZUNvbGxlY3RvcigpO1xyXG5cclxuXHJcblxyXG5mdW5jdGlvbiBHYXJiYWdlQmluKCkge1xyXG5cdHRoaXMuZGlzcG9zYWwgPSBbXTsgLy9PYmplY3RzIHRoYXQgY2FuIGhhdmUgXCJkaXNwb3NlXCIgY2FsbGVkIG9uIHRoZW1cclxuXHR0aGlzLmxpc3RlbmVycyA9IFtdOyAvL09iamVjdHMgd2l0aCBsaXN0ZW5lcnMgYXR0YWNoZWQgdG8gdGhlbVxyXG5cdHRoaXMudGFncyA9IFtdOyAvL1NjcmlwdCB0YWdzIGFuZCBvdGhlciBkaXNwb3NhYmxlIHRhZ3NcclxuXHRcclxuXHR0aGlzLmJsb2J1cmxzID0gW107IC8vT2JqZWN0IFVSTHMgdGhhdCBjYW4gYmUgcmV2b2tlZCB3aXRoIFVSTC5yZXZva2VPYmplY3RVUkxcclxufVxyXG5HYXJiYWdlQmluLnByb3RvdHlwZSA9IHtcclxuXHRjb2xsZWN0OiBmdW5jdGlvbihvYmopIHtcclxuXHRcdGlmIChvYmouZGlzcG9zZSkge1xyXG5cdFx0XHR0aGlzLmRpc3Bvc2FsLnB1c2gob2JqKTtcclxuXHRcdH1cclxuXHRcdGlmIChvYmoucmVtb3ZlQWxsTGlzdGVuZXJzKSB7XHJcblx0XHRcdHRoaXMubGlzdGVuZXJzLnB1c2gob2JqKTtcclxuXHRcdH1cclxuXHRcdGlmICgob2JqIGluc3RhbmNlb2YgJCkgfHwgb2JqLm5vZGVOYW1lKSB7XHJcblx0XHRcdHRoaXMudGFncy5wdXNoKG9iaik7XHJcblx0XHR9XHJcblx0fSxcclxuXHRcclxuXHRjb2xsZWN0VVJMOiBmdW5jdGlvbih1cmwpIHtcclxuXHRcdGlmICghUkVWT0tFX1VSTFMpIHJldHVybjtcclxuXHRcdGlmICh0eXBlb2YgdXJsICE9IFwic3RyaW5nXCIpIHJldHVybjtcclxuXHRcdHRoaXMuYmxvYnVybHMucHVzaCh1cmwpO1xyXG5cdH0sXHJcblx0XHJcblx0ZGlzcG9zZTogZnVuY3Rpb24oKSB7XHJcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuZGlzcG9zYWwubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0dGhpcy5kaXNwb3NhbFtpXS5kaXNwb3NlKCk7XHJcblx0XHRcdHRoaXMuZGlzcG9zYWxbaV0gPSBudWxsO1xyXG5cdFx0fVxyXG5cdFx0dGhpcy5kaXNwb3NhbCA9IG51bGw7XHJcblx0XHRcclxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5saXN0ZW5lcnMubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0dGhpcy5saXN0ZW5lcnNbaV0ucmVtb3ZlQWxsTGlzdGVuZXJzKCk7XHJcblx0XHRcdHRoaXMubGlzdGVuZXJzW2ldID0gbnVsbDtcclxuXHRcdH1cclxuXHRcdHRoaXMubGlzdGVuZXJzID0gbnVsbDtcclxuXHRcdFxyXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLnRhZ3MubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0JCh0aGlzLnRhZ3NbaV0pLnJlbW92ZUF0dHIoXCJzcmNcIikucmVtb3ZlKCk7XHJcblx0XHRcdHRoaXMudGFnc1tpXSA9IG51bGw7XHJcblx0XHR9XHJcblx0XHR0aGlzLnRhZ3MgPSBudWxsO1xyXG5cdFx0XHJcblx0XHRcclxuXHRcdFxyXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmJsb2J1cmxzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdFVSTC5yZXZva2VPYmplY3RVUkwodGhpcy5ibG9idXJsc1tpXSk7XHJcblx0XHRcdHRoaXMuYmxvYnVybHNbaV0gPSBudWxsO1xyXG5cdFx0fVxyXG5cdFx0dGhpcy5ibG9idXJscyA9IG51bGw7XHJcblx0fSxcclxufTtcclxuXHJcbiIsIi8vIHNvdW5kbWFuYWdlci5qc1xyXG4vLyBEZWZpbmVzIHRoZSBTb3VuZCBNYW5hZ2VyXHJcblxyXG52YXIgaW5oZXJpdHMgPSByZXF1aXJlKFwiaW5oZXJpdHNcIik7XHJcbnZhciBleHRlbmQgPSByZXF1aXJlKFwiZXh0ZW5kXCIpO1xyXG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZShcImV2ZW50c1wiKS5FdmVudEVtaXR0ZXI7XHJcblxyXG4vKipcclxuICovXHJcbmZ1bmN0aW9uIFNvdW5kTWFuYWdlcigpIHtcclxuXHR0aGlzLnRlc3RTdXBwb3J0KCk7XHJcblx0XHJcblx0dGhpcy5wcmVsb2FkU291bmQoXCJ3YWxrX2J1bXBcIik7XHJcblx0dGhpcy5wcmVsb2FkU291bmQoXCJ3YWxrX2p1bXBcIik7XHJcblx0dGhpcy5wcmVsb2FkU291bmQoXCJ3YWxrX2p1bXBfbGFuZFwiKTtcclxuXHR0aGlzLnByZWxvYWRTb3VuZChcImV4aXRfd2Fsa1wiKTtcclxufVxyXG5pbmhlcml0cyhTb3VuZE1hbmFnZXIsIEV2ZW50RW1pdHRlcik7XHJcbmV4dGVuZChTb3VuZE1hbmFnZXIucHJvdG90eXBlLCB7XHJcblx0c291bmRzIDoge30sXHJcblx0ZXh0IDogbnVsbCxcclxuXHRcclxuXHR0ZXN0U3VwcG9ydCA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0dmFyIHRlc3Rzb3VuZCA9IG5ldyBBdWRpbygpO1xyXG5cdFx0dmFyIG9nZyA9IHRlc3Rzb3VuZC5jYW5QbGF5VHlwZShcImF1ZGlvL29nZzsgY29kZWNzPXZvcmJpc1wiKTtcclxuXHRcdGlmIChvZ2cpIHRoaXMuZXh0ID0gXCIub2dnXCI7XHJcblx0XHRlbHNlIHRoaXMuZXh0ID0gXCIubXAzXCI7XHJcblx0fSxcclxuXHRcclxuXHRwcmVsb2FkU291bmQgOiBmdW5jdGlvbihpZCkge1xyXG5cdFx0aWYgKCF0aGlzLnNvdW5kc1tpZF0pIHtcclxuXHRcdFx0dmFyIHNuZCA9IHRoaXMuc291bmRzW2lkXSA9IG5ldyBBdWRpbygpO1xyXG5cdFx0XHRzbmQuYXV0b3BsYXkgPSBmYWxzZTtcclxuXHRcdFx0c25kLmF1dG9idWZmZXIgPSB0cnVlO1xyXG5cdFx0XHRzbmQucHJlbG9hZCA9IFwiYXV0b1wiO1xyXG5cdFx0XHRzbmQuc3JjID0gQkFTRVVSTCtcIi9zbmQvXCIgKyBpZCArIHRoaXMuZXh0O1xyXG5cdFx0XHRzbmQub24oXCJlbmRlZFwiLCBmdW5jdGlvbigpe1xyXG5cdFx0XHRcdHNuZC5jdXJyZW50VGltZSA9IDA7XHJcblx0XHRcdH0pO1xyXG5cdFx0XHRzbmQubG9hZCgpO1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIHRoaXMuc291bmRzW2lkXTtcclxuXHR9LFxyXG5cdFxyXG5cdHBsYXlTb3VuZCA6IGZ1bmN0aW9uKGlkKSB7XHJcblx0XHRpZiAoIXRoaXMuc291bmRzW2lkXSkge1xyXG5cdFx0XHRjb25zb2xlLmVycm9yKFwiU291bmQgaXMgbm90IGxvYWRlZCFcIiwgaWQpO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblx0XHR0aGlzLnNvdW5kc1tpZF0ucGxheSgpO1xyXG5cdH0sXHJcbn0pO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBuZXcgU291bmRNYW5hZ2VyKCk7XHJcbiIsIi8vIHVpLW1hbmFnZXIuanNcclxuLy8gRGVmaW5lcyB0aGUgVUkgbW9kdWxlLCB3aGljaCBjb250cm9scyB0aGUgdXNlciBpbnRlcmZhY2UuXHJcblxyXG52YXIgaW5oZXJpdHMgPSByZXF1aXJlKFwiaW5oZXJpdHNcIik7XHJcbnZhciBleHRlbmQgPSByZXF1aXJlKFwiZXh0ZW5kXCIpO1xyXG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZShcImV2ZW50c1wiKS5FdmVudEVtaXR0ZXI7XHJcbnZhciBjb250cm9sbGVyID0gcmVxdWlyZShcInRwcC1jb250cm9sbGVyXCIpO1xyXG5cclxudmFyIE1fV0lEVEggPSAwLCBNX0hFSUdIVCA9IDEsIE1fSElERSA9IDIsIE1fVFJJQU5HTEUgPSAzLCBNX1RBSUxYID0gNCwgTV9UQUlMWSA9IDU7XHJcblxyXG4vKipcclxuICpcclxuICovXHJcbmZ1bmN0aW9uIFVJTWFuYWdlcigpIHtcclxuXHR0aGlzLmRpYWxvZ3MgPSB7XHJcblx0XHRcInRleHRcIiA6IG5ldyBEaWFsb2dCb3goXCJ0ZXh0Ym94X2dvbGRcIiksXHJcblx0XHRcImRpYWxvZ1wiIDogbmV3IERpYWxvZ0JveChcImRpYWxvZ19idWJibGVcIiksXHJcblx0fTtcclxuXHRcclxuXHR2YXIgc2VsZiA9IHRoaXM7XHJcblx0JChmdW5jdGlvbigpe1xyXG5cdFx0c2VsZi5faW5pdFVJU2NlbmUoKTtcclxuXHRcdFxyXG5cdFx0c2VsZi5za3JpbSA9ICQoXCI8ZGl2PlwiKS5hZGRDbGFzcyhcInNrcmltXCIpLmFwcGVuZFRvKFwiI2NhbnZhcy11aVwiKTtcclxuXHRcdFxyXG5cdFx0Zm9yICh2YXIgdHlwZSBpbiBzZWxmLmRpYWxvZ3MpIHtcclxuXHRcdFx0c2VsZi5kaWFsb2dzW3R5cGVdLmVsZW1lbnQgPSAkKFwiPGRpdj5cIilcclxuXHRcdFx0XHQuYWRkQ2xhc3MoXCJkaWFsb2dib3hcIikuYWRkQ2xhc3ModHlwZSlcclxuXHRcdFx0XHQuYXBwZW5kVG8oXCIjY2FudmFzLXVpXCIpO1xyXG5cdFx0fVxyXG5cdH0pO1xyXG59XHJcbmluaGVyaXRzKFVJTWFuYWdlciwgRXZlbnRFbWl0dGVyKTtcclxuZXh0ZW5kKFVJTWFuYWdlci5wcm90b3R5cGUsIHtcclxuXHRza3JpbSA6IG51bGwsXHJcblx0ZGlhbG9ncyA6IG51bGwsXHJcblx0XHJcblx0Ly8vLy8vLy8vLy8vLy8vLy8vLy8vLy8gVUkgQWN0aW9ucyAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHRcclxuXHQvKiogU2hvdyBhIHN0YW5kYXJkIHRleHRib3ggb24gc2NyZWVuLiAqL1xyXG5cdHNob3dUZXh0Qm94IDogZnVuY3Rpb24odHlwZSwgaHRtbCwgb3B0cykge1xyXG5cdFx0aWYgKCQuaXNQbGFpbk9iamVjdChodG1sKSAmJiBvcHRzID09PSB1bmRlZmluZWQpIHtcclxuXHRcdFx0b3B0cyA9IGh0bWw7IGh0bWwgPSB1bmRlZmluZWQ7XHJcblx0XHR9XHJcblx0XHRvcHRzID0gZXh0ZW5kKG9wdHMsIHtcclxuXHRcdFx0aHRtbDogaHRtbCxcclxuXHRcdH0pO1xyXG5cdFx0XHJcblx0XHR2YXIgZCA9IHRoaXMuZGlhbG9nc1t0eXBlXTtcclxuXHRcdGlmICghZCkge1xyXG5cdFx0XHRkID0gdGhpcy5kaWFsb2dzW1widGV4dFwiXTtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihcIkludmFsaWQgZGlhbG9nIHR5cGU6IFwiK3R5cGUpO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHRkLnNob3cob3B0cyk7XHJcblx0fSxcclxuXHRcclxuXHQvKiogSW1tZWRlYXRlbHkgaGlkZXMgdGhlIHRleHQgYm94IGFuZCBjbGVhcnMgYW55IHRleHQgdGhhdCB3YXMgaW4gaXQuICovXHJcblx0Y2xvc2VUZXh0Qm94IDogZnVuY3Rpb24odHlwZSkge1xyXG5cdFx0dmFyIGQgPSB0aGlzLmRpYWxvZ3NbdHlwZV07XHJcblx0XHRpZiAoIWQpIHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgZGlhbG9nIHR5cGU6IFwiK3R5cGUpO1xyXG5cdFx0XHJcblx0XHRkLmhpZGUoKTtcclxuXHR9LFxyXG5cdFxyXG5cdC8qKiBTaG93cyBhIHNlbGVjdGFibGUgbWVudSBpbiB0aGUgdG9wLXJpZ2h0IGNvcm5lciBvZiB0aGUgc2NyZWVuLiAqL1xyXG5cdHNob3dNZW51IDogZnVuY3Rpb24oKSB7XHJcblx0XHRcclxuXHR9LFxyXG5cdFxyXG5cdC8qKiBJbW1lZGF0ZWx5IGNsb3NlcyB0aGUgbWVudSBhbmQgY2xlYXJzIGl0IGZvciBmdXJ0aGVyIHVzZS4gKi9cclxuXHRjbG9zZU1lbnUgOiBmdW5jdGlvbigpIHtcclxuXHRcdFxyXG5cdH0sXHJcblx0XHJcblx0LyoqIFxyXG5cdCAqIFNob3dzIGEgWWVzL05vIG1lbnUganVzdCBhYm92ZSB0aGUgdGV4dCBib3guIElmIHRleHQgaXMgY3VycmVudGx5IHByaW50aW5nIG91dCBvbiBhLCBcclxuXHQgKiBkaWFsb2cgYm94IG9yIHRleHQgYm94IG9uIHNjcmVlbiwgdGhpcyB3aWxsIGF1dG9tYXRpY2FsbHkgd2FpdCBmb3IgdGhlIHRleHQgdG8gZmluaXNoXHJcblx0ICogcHJpbnRpbmcgYmVmb3JlIHNob3dpbmcgaXQuIFRoZSBZZXMgYW5kIE5vIGZ1bmN0aW9ucyB3aWxsIGZpcmUgb2ZmIG9uZSB3aGVuIGlzIHNlbGVjdGVkLlxyXG5cdCAqIFRoZSBmdW5jdGlvbnMgd2lsbCBwcmVzdW1hYmx5IHB1c2ggbW9yZSBhY3Rpb25zIGludG8gdGhlIGFjdGlvbiBxdWV1ZS5cclxuXHQgKi9cclxuXHRzaG93Q29uZmlybVByb21wdCA6IGZ1bmN0aW9uKHllc2ZuLCBub2ZuKSB7XHJcblx0XHRcclxuXHR9LFxyXG5cdFxyXG5cdFxyXG5cdG9wZW5JbmZvZGV4UGFnZSA6IGZ1bmN0aW9uKHBhZ2VpZCkge1xyXG5cdFx0XHJcblx0fSxcclxuXHRcclxuXHRcclxuXHQvKiogRmFkZSB0aGUgc2NyZWVuIG91dCBmb3IgYSB0cmFuc2l0aW9uIG9mIHNvbWUgc29ydC4gKi9cclxuXHRmYWRlT3V0IDogZnVuY3Rpb24oZHVyYXRpb24pIHtcclxuXHRcdGlmICghZHVyYXRpb24pIGR1cmF0aW9uID0gMTAwMDsgLy8xIHNlY29uZFxyXG5cdH0sXHJcblx0XHJcblx0LyoqIEZhZGUgdGhlIHNjcmVlbiBpbiBmcm9tIGEgdHJhbnNpdGlvbi4gKi9cclxuXHRmYWRlSW4gOiBmdW5jdGlvbihkdXJhdGlvbikge1xyXG5cdFx0aWYgKCFkdXJhdGlvbikgZHVyYXRpb24gPSAxMDAwOyAvLzEgc2Vjb25kXHJcblx0fSxcclxuXHRcclxuXHQvKiogRGlzcGxheXMgdGhlIGxvYWRpbmcgaWNvbiBvdmVyIHRoZSBtYWluIGdhbWUgc2NyZWVuLiBPcHRpb25hbGx5IHN1cHBseSB0ZXh0LiAqL1xyXG5cdHNob3dMb2FkaW5nQWpheCA6IGZ1bmN0aW9uKGxvYWRpbmdUZXh0KSB7XHJcblx0XHRpZiAoIWxvYWRpbmdUZXh0KSBsb2FkaW5nVGV4dCA9IFwiTG9hZGluZy4uLlwiO1xyXG5cdH0sXHJcblx0XHJcblx0XHJcblx0Ly8vLy8vLy8vLy8vLy8vLy8vLy8vLyBBY3Rpb24gUXVldWVzIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHRjdXJyQWN0aW9uIDogbnVsbCxcclxuXHRhY3Rpb25RdWV1ZSA6IFtdLFxyXG5cdFxyXG5cdC8qKiBQYXNzIHRoaXMgYSBzZXQgb2YgZnVuY3Rpb25zIHRvIGJlIHJ1biBvbmUgYWZ0ZXIgdGhlIG90aGVyIHdoZW4gdGhlIHVzZXIgY29uZmlybXMgXHJcblx0ICogIGFuIGFjdGlvbi4gKi9cclxuXHRxdWV1ZUFjdGlvbnM6IGZ1bmN0aW9uKCkge1xyXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0dmFyIGFyZyA9IGFyZ3VtZW50c1tpXTtcclxuXHRcdFx0aWYgKCQuaXNBcnJheShhcmcpKSB7XHJcblx0XHRcdFx0Zm9yICh2YXIgaiA9IDA7IGogPCBhcmcubGVuZ3RoOyBqKyspIHtcclxuXHRcdFx0XHRcdGlmICghJC5pc0Z1bmN0aW9uKGFyZ1tqXSkpIFxyXG5cdFx0XHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJVSSBBY3Rpb25zIG11c3QgYmUgZnVuY3Rpb25zIHRvIGJlIHJ1biFcIik7XHJcblx0XHRcdFx0XHR0aGlzLmFjdGlvblF1ZXVlLnB1c2goYXJnW2pdKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0gZWxzZSBpZiAoJC5pc0Z1bmN0aW9uKGFyZ1tqXSkpIHtcclxuXHRcdFx0XHR0aGlzLmFjdGlvblF1ZXVlLnB1c2goYXJnW2pdKTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJVSSBBY3Rpb25zIG11c3QgYmUgZnVuY3Rpb25zIHRvIGJlIHJ1biFcIik7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9LFxyXG5cdFxyXG5cdC8qKiBDbGVhcnMgYWxsIHF1ZXVlZCBhY3Rpb25zIGZyb20gdGhlIHVpIGFjdGlvbiBxdWV1ZS4gVXNlIHRoaXMgc3BhcmluZ2x5LiBUaGlzIHdpbGwgXHJcblx0ICogIE5PVCB0ZXJtaW5hdGUgYW55IGN1cnJlbnRseSBydW5uaW5nIGFjdGlvbnMgb3IgY2xlYXIgYW55IHRleHQgYm94ZXMuICovXHJcblx0Y2xlYXJBY3Rpb25RdWV1ZSA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHJcblx0fSxcclxuXHRcclxuXHQvLy8vLy8vLy8vLy8vLy8vLy8vLy8vIFVJIFRocmVlLmpzIFNjZW5lIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHRzY2VuZSA6IG51bGwsXHJcblx0Y2FtZXJhIDogbnVsbCxcclxuXHRcclxuXHRfaW5pdFVJU2NlbmUgOiBmdW5jdGlvbigpIHtcclxuXHRcdFxyXG5cdFx0dGhpcy5zY2VuZSA9IG5ldyBUSFJFRS5TY2VuZSgpO1xyXG5cdFx0XHJcblx0XHR2YXIgc3cgPSAkKFwiI2dhbWVzY3JlZW5cIikud2lkdGgoKTtcclxuXHRcdHZhciBzaCA9ICQoXCIjZ2FtZXNjcmVlblwiKS5oZWlnaHQoKTtcclxuXHRcdFxyXG5cdFx0dmFyIGNhbWVyYSA9IHRoaXMuY2FtZXJhID0gbmV3IFRIUkVFLk9ydGhvZ3JhcGhpY0NhbWVyYSgwLCBzdywgc2gsIDAsIDEsIDEwMSk7XHJcblx0XHRjYW1lcmEucG9zaXRpb24uc2V0KDAsIDAsIDUxKTtcclxuXHRcdHRoaXMuc2NlbmUuYWRkKGNhbWVyYSk7XHJcblx0XHRcclxuXHRcdGZvciAodmFyIGRsb2cgaW4gdGhpcy5kaWFsb2dzKSB7XHJcblx0XHRcdGNvbnNvbGUubG9nKFwiY3JlYXRlRGlhbG9nTW9kZWw6IFwiLCBkbG9nLCB0aGlzLmRpYWxvZ3NbZGxvZ10pOyBcclxuXHRcdFx0dmFyIG1vZGVsID0gdGhpcy5kaWFsb2dzW2Rsb2ddLmNyZWF0ZURpYWxvZ01vZGVsKCk7XHJcblx0XHRcdHRoaXMuc2NlbmUuYWRkKG1vZGVsKTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0Ly8gdGhpcy50Yi5tb2RlbCA9IGNyZWF0ZURpYWxvZ01vZGVsKFwidGV4dGJveF9nb2xkXCIpO1xyXG5cdFx0Ly8gLy8gYWRqdXN0IHdpZHRoIDogdGhpcy50Yi5tb2RlbC5tb3JwaFRhcmdldEluZmx1ZW5jZXNbMF0gPSAxO1xyXG5cdFx0Ly8gLy8gYWRqdXN0IGhlaWdodDogdGhpcy50Yi5tb2RlbC5tb3JwaFRhcmdldEluZmx1ZW5jZXNbMV0gPSAxO1xyXG5cdFx0Ly8gdGhpcy50Yi5tb2RlbC52aXNpYmxlID0gZmFsc2U7XHJcblx0XHQvLyB0aGlzLnNjZW5lLmFkZCh0aGlzLnRiLm1vZGVsKTtcclxuXHRcdFxyXG5cdFx0Ly8gdGhpcy5kYi5tb2RlbCA9IGNyZWF0ZURpYWxvZ01vZGVsKFwiZGlhbG9nX2J1YmJsZVwiKTtcclxuXHRcdC8vIC8vIGFkanVzdCB3aWR0aCA6IHRoaXMuZGIubW9kZWwubW9ycGhUYXJnZXRJbmZsdWVuY2VzWzBdID0gMTtcclxuXHRcdC8vIC8vIGFkanVzdCBoZWlnaHQ6IHRoaXMuZGIubW9kZWwubW9ycGhUYXJnZXRJbmZsdWVuY2VzWzFdID0gMTtcclxuXHRcdC8vIHRoaXMuZGIubW9kZWwudmlzaWJsZSA9IGZhbHNlO1xyXG5cdFx0Ly8gdGhpcy5zY2VuZS5hZGQodGhpcy5kYi5tb2RlbCk7XHJcblx0XHRcclxuXHRcdC8vIGNyZWF0ZURFQlVHU2V0dXAuY2FsbCh0aGlzKTtcclxuXHR9LFxyXG5cdFxyXG5cdC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cdFxyXG5cdGxvZ2ljTG9vcCA6IGZ1bmN0aW9uKGRlbHRhKSB7XHJcblx0XHRpZiAodGhpcy5jdXJyQWN0aW9uKSB7XHJcblx0XHRcdFxyXG5cdFx0fSBlbHNlIGlmICh0aGlzLmFjdGlvblF1ZXVlLmxlbmd0aCkge1xyXG5cdFx0XHR0aGlzLmN1cnJBY3Rpb24gPSB0aGlzLmFjdGlvblF1ZXVlLnNoaWZ0KCk7XHJcblx0XHRcdGNvbnRyb2xsZXIucHVzaElucHV0Q29udGV4dChcInVpYWN0aW9uXCIpO1xyXG5cdFx0XHR0aGlzLmN1cnJBY3Rpb24oKTtcclxuXHRcdFx0XHJcblx0XHRcdC8vSWYgdGhlIGFjdGlvbiBjb21wbGV0ZWQgdGhpcyB0dXJuLCBhbmQgZGlkbid0IHB1c2ggaXRzIG93biBjb250ZXh0XHJcblx0XHRcdGlmIChjb250cm9sbGVyLnBvcElucHV0Q29udGV4dChcInVpYWN0aW9uXCIpID09IFwidWlhY3Rpb25cIikge1xyXG5cdFx0XHRcdC8vQ2xlYXIgdGhlIGN1cnJlbnQgYWN0aW9uXHJcblx0XHRcdFx0dGhpcy5jdXJyQWN0aW9uID0gbnVsbDtcclxuXHRcdFx0fVxyXG5cdFx0fSBcclxuXHRcdFxyXG5cdFx0Zm9yICh2YXIgZGxvZyBpbiB0aGlzLmRpYWxvZ3MpIHtcclxuXHRcdFx0aWYgKHRoaXMuZGlhbG9nc1tkbG9nXS5hZHZhbmNlKSB7XHJcblx0XHRcdFx0aWYgKGNvbnRyb2xsZXIuaXNEb3duT25jZShcIkludGVyYWN0XCIsIFwiZGxvZ1ByaW50aW5nXCIpKSB7XHJcblx0XHRcdFx0XHR0aGlzLmRpYWxvZ3NbZGxvZ10uY29tcGxldGUoKTtcclxuXHRcdFx0XHR9IGVsc2UgaWYgKGNvbnRyb2xsZXIuaXNEb3duT25jZShcIkludGVyYWN0XCIsIFwiZGxvZ1dhaXRpbmdcIikpIHtcclxuXHRcdFx0XHRcdHRoaXMuZGlhbG9nc1tkbG9nXS5fZGlzcGxheU5leHQoKTtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0dGhpcy5kaWFsb2dzW2Rsb2ddLmFkdmFuY2UoZGVsdGEpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XHRcdFxyXG5cdFx0fVxyXG5cdH0sXHJcblx0XHJcblx0X2NvbXBsZXRlQ3VyckFjdGlvbiA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0aWYgKHRoaXMuYWN0aW9uUXVldWUubGVuZ3RoKSB7XHJcblx0XHRcdHRoaXMuY3VyckFjdGlvbiA9IHRoaXMuYWN0aW9uUXVldWUuc2hpZnQoKTtcclxuXHRcdFx0dGhpcy5jdXJyQWN0aW9uKCk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRjb250cm9sbGVyLnBvcElucHV0Q29udGV4dChcInVpYWN0aW9uXCIpO1xyXG5cdFx0fVxyXG5cdH0sXHJcblx0XHJcbn0pO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBuZXcgVUlNYW5hZ2VyKCk7XHJcblxyXG5cclxuZnVuY3Rpb24gRGlhbG9nQm94KHR5cGUpIHtcclxuXHR0aGlzLnR5cGUgPSB0eXBlO1xyXG59XHJcbmV4dGVuZChEaWFsb2dCb3gucHJvdG90eXBlLCB7XHJcblx0bW9kZWwgOiBudWxsLFxyXG5cdGVsZW1lbnQgOiBudWxsLFxyXG5cdG93bmVyIDogbnVsbCxcclxuXHRodG1sIDogW10sXHJcblx0XHJcblx0YWR2YW5jZSA6IG51bGwsXHJcblx0Y29tcGxldGU6IGZ1bmN0aW9uKCl7fSxcclxuXHRfY29tcGxldGlvbkNhbGxiYWNrIDogbnVsbCwgLy9jYWxsYmFjayBmcm9tIHRoZSBldmVudCBzdGFydGluZyB0aGlzIGRpYWxvZy5cclxuXHRcclxuXHRzaG93IDogZnVuY3Rpb24ob3B0cykge1xyXG5cdFx0Ly8gaWYgKCFvcHRzLmh0bWwpIHtcclxuXHRcdC8vIFx0dGhyb3cgbmV3IEVycm9yKFwiTm8gSFRNTCBnaXZlbiB0byB0aGUgZGlhbG9nYm94J3Mgc2hvdygpIG1ldGhvZCFcIik7XHJcblx0XHQvLyB9XHJcblx0XHRcclxuXHRcdG9wdHMgPSBleHRlbmQoe1xyXG5cdFx0XHRvd25lcjogbnVsbCxcclxuXHRcdFx0aXNMYXN0IDogZmFsc2UsXHJcblx0XHR9LCBvcHRzKTtcclxuXHRcdFxyXG5cdFx0dGhpcy5vd25lciA9IG9wdHMub3duZXI7XHJcblx0XHRcclxuXHRcdHRoaXMuX2NvbXBsZXRpb25DYWxsYmFjayA9IG9wdHMuY29tcGxldGU7XHJcblx0XHRcclxuXHRcdGlmICh0eXBlb2Ygb3B0cy5odG1sID09IFwic3RyaW5nXCIpIHtcclxuXHRcdFx0dGhpcy5odG1sID0gW29wdHMuaHRtbF07XHJcblx0XHR9IGVsc2UgaWYgKCQuaXNBcnJheShvcHRzLmh0bWwpKSB7XHJcblx0XHRcdHRoaXMuaHRtbCA9IG9wdHMuaHRtbDtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdGNvbnNvbGUuZXJyb3IoXCJEaWFsb2cgZ2l2ZW4gaXMgb2YgdGhlIHdyb25nIHR5cGUhIFwiLCBvcHRzLmh0bWwpO1xyXG5cdFx0XHR0aGlzLmh0bWwgPSBbXCJbRVJST1I6IFRoaXMgZGlhbG9nIHRleHQgY291bGQgbm90IGJlIGxvYWRlZCBwcm9wZXJseSFdXCJdO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHR0aGlzLl9kaXNwbGF5KCk7XHJcblx0fSxcclxuXHRcclxuXHRoaWRlIDogZnVuY3Rpb24oKSB7XHJcblx0XHR0aGlzLm1vZGVsLnZpc2libGUgPSBmYWxzZTtcclxuXHRcdHRoaXMuZWxlbWVudC5oaWRlKCkuY3NzKHsgd2lkdGg6XCJcIiwgaGVpZ2h0OlwiXCIsIGJvdHRvbTpcIlwiLCBsZWZ0OlwiXCIsIHRvcDpcIlwiLCByaWdodDpcIlwiIH0pO1xyXG5cdFx0dGhpcy5odG1sID0gW107XHJcblx0XHR0aGlzLmFkdmFuY2UgPSBudWxsO1xyXG5cdFx0XHJcblx0XHRpZiAodGhpcy5fY29tcGxldGlvbkNhbGxiYWNrKVxyXG5cdFx0XHR0aGlzLl9jb21wbGV0aW9uQ2FsbGJhY2suY2FsbChudWxsKTtcclxuXHR9LFxyXG5cdFxyXG5cdF9kaXNwbGF5OiBmdW5jdGlvbigpIHtcclxuXHRcdC8vIG9wdHMgPSBleHRlbmQob3B0cywge1xyXG5cdFx0Ly8gXHRhbmNob3JZOiBcImJvdHRvbVwiLFxyXG5cdFx0Ly8gXHRhbmNob3JYOiBcImxlZnRcIixcclxuXHRcdC8vIH0pO1xyXG5cdFx0XHJcblx0XHQvLyBTdGVwIDE6IHNpemUgb3V0IHRoZSB0ZXh0Ym94IHNwYWNlXHJcblx0XHR2YXIgZSA9IHRoaXMuZWxlbWVudDtcclxuXHRcdGUuY3NzKHsgd2lkdGg6XCJcIiwgaGVpZ2h0OlwiXCIsIGJvdHRvbTpcIlwiLCBsZWZ0OlwiXCIsIHRvcDpcIlwiLCByaWdodDpcIlwiIH0pOyAvL3Jlc2V0XHJcblx0XHRcclxuXHRcdGUuY3NzKHsgXCJ2aXNpYmlsaXR5XCI6IFwiaGlkZGVuXCIgfSkuc2hvdygpOyAvL05vdGU6ICQuc2hvdygpIGRvZXMgbm90IGFmZmVjdCBcInZpc2liaWxpdHlcIlxyXG5cdFx0dmFyIHdpZHRoID0gMCwgaGVpZ2h0ID0gMDtcclxuXHRcdC8vIHZhciB3LCBoO1xyXG5cdFx0XHJcblx0XHQvL0ZvciBlYWNoIGRpYWxvZyBpbiB0aGUgdGV4dCB0byBkaXNwbGF5LCBzaXplIG91dCB0aGUgYm94IHRvIGZpdCB0aGUgbGFyZ2VzdCBvbmVcclxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5odG1sLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdGUuaHRtbCh0aGlzLmh0bWxbaV0pO1xyXG5cdFx0XHR3aWR0aCA9IE1hdGgubWF4KGUuaW5uZXJXaWR0aCgpLCB3aWR0aCk7XHJcblx0XHRcdGhlaWdodCA9IE1hdGgubWF4KGUuaW5uZXJIZWlnaHQoKSwgaGVpZ2h0KTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0dmFyIGRpZnggPSBlLmlubmVyV2lkdGgoKSAtIGUud2lkdGgoKTtcclxuXHRcdHZhciBkaWZ5ID0gZS5pbm5lckhlaWdodCgpIC0gZS5oZWlnaHQoKTtcclxuXHRcdFxyXG5cdFx0Ly8gU3RlcCAyOiByZXNpemUgYW5kIHBvc2l0aW9uIHRoZSB0ZXh0Ym94ZXNcclxuXHRcdHRoaXMubW9kZWwubW9ycGhUYXJnZXRJbmZsdWVuY2VzW01fV0lEVEhdID0gd2lkdGg7XHJcblx0XHR0aGlzLm1vZGVsLm1vcnBoVGFyZ2V0SW5mbHVlbmNlc1tNX0hFSUdIVF0gPSBoZWlnaHQ7XHJcblx0XHRlLmNzcyh7IHdpZHRoOiB3aWR0aC1kaWZ4KzIsIGhlaWdodDogaGVpZ2h0LWRpZnkgfSk7XHJcblx0XHRcclxuXHRcdC8vVE9ETyBiYXNlIG9uIGFuY2hvciBwb2ludHNcclxuXHRcdHRoaXMubW9kZWwucG9zaXRpb24uc2V0KDEwLCAxMCwgMCk7XHJcblx0XHRlLmNzcyh7IGJvdHRvbTogMTAsIGxlZnQ6IDEwLCB0b3A6IFwiXCIgfSk7XHJcblx0XHRcclxuXHRcdC8vVE9ETyBtb3ZlIGludG8gYW4gXCJhZHZhbmNlXCJcclxuXHRcdGlmICh0aGlzLm93bmVyICYmIHRoaXMub3duZXIuZ2V0VGFsa2luZ0FuY2hvcikge1xyXG5cdFx0XHQvL1RPRE8gZGV0ZXJtaW5lIGFuY2hvciBwb2ludCBiYXNlZCBvbiB3aGVyZSB0aGUgb3duZXIgaXMgb24tc2NyZWVuXHJcblx0XHRcdC8vUHJvamVjdCBWZWN0b3IgPSAzRCB0byAyRCwgVW5wcm9qZWN0IFZlY3RvciA9IDJEIHRvIDNEXHJcblx0XHRcdHZhciBhbmNob3IgPSB0aGlzLm93bmVyLmdldFRhbGtpbmdBbmNob3IoKTtcclxuXHRcdFx0YW5jaG9yLnByb2plY3QoY3VycmVudE1hcC5jYW1lcmEpO1xyXG5cdFx0XHR0aGlzLm1vZGVsLm1vcnBoVGFyZ2V0SW5mbHVlbmNlc1tNX1RBSUxYXSA9IGFuY2hvci54IC0gdGhpcy5tb2RlbC5wb3NpdGlvbi54O1xyXG5cdFx0XHR0aGlzLm1vZGVsLm1vcnBoVGFyZ2V0SW5mbHVlbmNlc1tNX1RBSUxZXSA9IGFuY2hvci55IC0gdGhpcy5tb2RlbC5wb3NpdGlvbi55O1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHRcclxuXHRcdFxyXG5cdFx0Ly8gU3RlcCAzOiBzZXR1cCB0eXBld3JpdGVyIGVmZmVjdCBhbmQgc2hvdyBkaWFsb2dib3hcclxuXHRcdHRoaXMuX2Rpc3BsYXlOZXh0KCk7XHJcblx0XHRcclxuXHRcdGUuY3NzKHsgXCJ2aXNpYmlsaXR5XCI6IFwiXCIgfSk7XHJcblx0XHR0aGlzLm1vZGVsLnZpc2libGUgPSB0cnVlO1xyXG5cdFx0XHJcblx0fSxcclxuXHRcclxuXHQvKiogRGlhbG9nIGlzIGFscmVhZHkgc2hvd2luZyBhbmQgc2l6ZWQsIHNob3cgbmV4dCBkaWFsb2csIG9yIGNsb3NlLiAqL1xyXG5cdF9kaXNwbGF5TmV4dCA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0aWYgKHRoaXMuaHRtbCAmJiB0aGlzLmh0bWwubGVuZ3RoKSB7XHJcblx0XHRcdGNvbnRyb2xsZXIucG9wSW5wdXRDb250ZXh0KFwiZGxvZ1dhaXRpbmdcIik7XHJcblx0XHRcdGNvbnRyb2xsZXIucHVzaElucHV0Q29udGV4dChcImRsb2dQcmludGluZ1wiKTtcclxuXHRcdFx0XHJcblx0XHRcdHRoaXMuZWxlbWVudC5odG1sKHRoaXMuaHRtbC5zaGlmdCgpKTsgLy9wdXQgaW4gZmlyc3QgZGlhbG9nXHJcblx0XHRcdHRoaXMubW9kZWwubW9ycGhUYXJnZXRJbmZsdWVuY2VzW01fVFJJQU5HTEVdID0gKHRoaXMuaHRtbC5sZW5ndGgpPyAxOiAwO1xyXG5cdFx0XHRcclxuXHRcdFx0c2V0dXBUeXBld3JpdGVyKHRoaXMsIGZ1bmN0aW9uKCl7XHJcblx0XHRcdFx0Y29udHJvbGxlci5wb3BJbnB1dENvbnRleHQoXCJkbG9nUHJpbnRpbmdcIik7XHJcblx0XHRcdFx0Y29udHJvbGxlci5wdXNoSW5wdXRDb250ZXh0KFwiZGxvZ1dhaXRpbmdcIik7XHJcblx0XHRcdH0pO1xyXG5cdFx0XHRcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdGNvbnRyb2xsZXIucG9wSW5wdXRDb250ZXh0KFwiZGxvZ1dhaXRpbmdcIik7XHJcblx0XHRcdHRoaXMuaGlkZSgpO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0fSxcclxuXHRcclxuXHRcclxuXHRjcmVhdGVEaWFsb2dNb2RlbDogZnVuY3Rpb24oKSB7XHJcblx0XHR2YXIgc2VsZiA9IHRoaXM7XHJcblx0XHR2YXIgaW5zOyAvL2luc2V0c1xyXG5cdFx0c3dpdGNoICh0aGlzLnR5cGUpIHtcclxuXHRcdFx0Y2FzZSBcImRpYWxvZ19idWJibGVcIjpcclxuXHRcdFx0XHRpbnMgPSB7IC8vcmVtZW1iZXIsIG1lYXN1cmVkIGZyb20gYm90dG9tIGxlZnQgY29ybmVyXHJcblx0XHRcdFx0XHR0OiA2LCBiOiAxMCwgaDogMTYsIC8vdG9wLCBib3R0b20sIGhlaWdodFxyXG5cdFx0XHRcdFx0bDogNiwgcjogMTAsIHc6IDE2LCAvL2xlZnQsIHJpZ2h0LCB3aWR0aFxyXG5cdFx0XHRcdFx0YXM6IDQsIGF4OiA2LCBheTogMTAsIC8vYXJyb3cgc2l6ZSwgeC95IHBvc2l0aW9uXHJcblx0XHRcdFx0fTtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0Y2FzZSBcInRleHRib3hfZ29sZFwiOlxyXG5cdFx0XHRcdGlucyA9IHsgXHJcblx0XHRcdFx0XHR0OiA3LCBiOiAxMCwgaDogMTYsXHJcblx0XHRcdFx0XHRsOiA5LCByOiAxMiwgdzogMzIsXHJcblx0XHRcdFx0XHRhczogNCwgYXg6IDIyLCBheTogMTAsXHJcblx0XHRcdFx0fTtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0dmFyIGdlb20gPSBuZXcgVEhSRUUuR2VvbWV0cnkoKTtcclxuXHRcdHtcclxuXHRcdFx0Z2VvbS52ZXJ0aWNlcyA9IFtcclxuXHRcdFx0XHR2MygwLCAgICAgMCksIHYzKGlucy5sLCAgICAgMCksIHYzKGlucy5yLCAgICAgMCksIHYzKGlucy53LCAgICAgMCksIC8vMC0zXHJcblx0XHRcdFx0djMoMCwgaW5zLnQpLCB2MyhpbnMubCwgaW5zLnQpLCB2MyhpbnMuciwgaW5zLnQpLCB2MyhpbnMudywgaW5zLnQpLCAvLzQtN1xyXG5cdFx0XHRcdHYzKDAsIGlucy5iKSwgdjMoaW5zLmwsIGlucy5iKSwgdjMoaW5zLnIsIGlucy5iKSwgdjMoaW5zLncsIGlucy5iKSwgLy84LTExXHJcblx0XHRcdFx0djMoMCwgaW5zLmgpLCB2MyhpbnMubCwgaW5zLmgpLCB2MyhpbnMuciwgaW5zLmgpLCB2MyhpbnMudywgaW5zLmgpLCAvLzEyLTE1XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0djMoaW5zLmF4K2lucy5hcywgaW5zLmF5K2lucy5hcywgMSksIHYzKGlucy5heC1pbnMuYXMsIGlucy5heStpbnMuYXMsIDEpLCAvLzE2LTE3XHJcblx0XHRcdFx0djMoaW5zLmF4K2lucy5hcywgaW5zLmF5LWlucy5hcywgMSksIHYzKGlucy5heC1pbnMuYXMsIGlucy5heS1pbnMuYXMsIDEpLCAvLzE4LTE5XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0djMoMCwgaW5zLmgvMiwgLTEpLCB2MygxNiwgaW5zLmgvMiwgLTEpLCB2MygwLCAwLCAtMSksIC8vMjAtMjJcclxuXHRcdFx0XTtcclxuXHRcdFx0ZjQoZ2VvbSwgMCwgMSwgNCwgNSk7IGY0KGdlb20sIDEsIDIsIDUsIDYpOyBmNChnZW9tLCAyLCAzLCA2LCA3KTtcclxuXHRcdFx0ZjQoZ2VvbSwgNCwgNSwgOCwgOSk7IGY0KGdlb20sIDUsIDYsIDksMTApOyBmNChnZW9tLCA2LCA3LDEwLDExKTtcclxuXHRcdFx0ZjQoZ2VvbSwgOCwgOSwxMiwxMyk7IGY0KGdlb20sIDksMTAsMTMsMTQpOyBmNChnZW9tLDEwLDExLDE0LDE1KTtcclxuXHRcdFx0ZjQoZ2VvbSwxNiwxNywxOCwxOSwgMSk7XHJcblx0XHRcdFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0Z2VvbS5mYWNlcy5wdXNoKG5ldyBUSFJFRS5GYWNlMygyMiwgMjAsIDIxLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgMCkpO1xyXG5cdFx0XHRcdC8vIGdlb20uZmFjZXMucHVzaChuZXcgVEhSRUUuRmFjZTMoMjIsIDIxLCAyMCkpO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdGdlb20uZmFjZVZlcnRleFV2c1swXS5wdXNoKFsgbmV3IFRIUkVFLlZlY3RvcjIoaW5zLmwsIGlucy50KSwgbmV3IFRIUkVFLlZlY3RvcjIoaW5zLmwsIGlucy50KSwgbmV3IFRIUkVFLlZlY3RvcjIoaW5zLmwsIGlucy50KSwgXSk7XHJcblx0XHRcdFx0Ly8gZ2VvbS5mYWNlVmVydGV4VXZzWzBdLnB1c2goWyBuZXcgVEhSRUUuVmVjdG9yMihpbnMubCwgaW5zLnQpLCBuZXcgVEhSRUUuVmVjdG9yMihpbnMubCwgaW5zLnQpLCBuZXcgVEhSRUUuVmVjdG9yMihpbnMubCwgaW5zLnQpLCBdKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0Z2VvbS5tb3JwaFRhcmdldHMgPSBbXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0bmFtZTogXCJ3aWR0aFwiLCB2ZXJ0aWNlczogW1xyXG5cdFx0XHRcdFx0XHR2MygwLCAgICAgMCksIHYzKGlucy5sLCAgICAgMCksIHYzKGlucy5yKzEsICAgICAwKSwgdjMoaW5zLncrMSwgICAgIDApLCAvLzAtM1xyXG5cdFx0XHRcdFx0XHR2MygwLCBpbnMudCksIHYzKGlucy5sLCBpbnMudCksIHYzKGlucy5yKzEsIGlucy50KSwgdjMoaW5zLncrMSwgaW5zLnQpLCAvLzQtN1xyXG5cdFx0XHRcdFx0XHR2MygwLCBpbnMuYiksIHYzKGlucy5sLCBpbnMuYiksIHYzKGlucy5yKzEsIGlucy5iKSwgdjMoaW5zLncrMSwgaW5zLmIpLCAvLzgtMTFcclxuXHRcdFx0XHRcdFx0djMoMCwgaW5zLmgpLCB2MyhpbnMubCwgaW5zLmgpLCB2MyhpbnMucisxLCBpbnMuaCksIHYzKGlucy53KzEsIGlucy5oKSwgLy8xMi0xNVxyXG5cdFx0XHRcdFx0XHRcclxuXHRcdFx0XHRcdFx0djMoaW5zLmF4K2lucy5hcysxLCBpbnMuYXkraW5zLmFzLCAxKSwgdjMoaW5zLmF4LWlucy5hcysxLCBpbnMuYXkraW5zLmFzLCAxKSwgLy8xNi0xN1xyXG5cdFx0XHRcdFx0XHR2MyhpbnMuYXgraW5zLmFzKzEsIGlucy5heS1pbnMuYXMsIDEpLCB2MyhpbnMuYXgtaW5zLmFzKzEsIGlucy5heS1pbnMuYXMsIDEpLCAvLzE4LTE5XHJcblx0XHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0XHR2MygwKzAuNSwgKGlucy5oKS8yLCAtMSksIHYzKDE2KzAuNSwgKGlucy5oKS8yLCAtMSksIHYzKDAsIDAsIC0xKSwgLy8yMC0yMlxyXG5cdFx0XHRcdFx0XSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdG5hbWU6IFwiaGVpZ2h0XCIsIHZlcnRpY2VzOiBbXHJcblx0XHRcdFx0XHRcdHYzKDAsICAgICAwICApLCB2MyhpbnMubCwgICAgIDAgICksIHYzKGlucy5yLCAgICAgMCAgKSwgdjMoaW5zLncsICAgICAwICApLCAvLzAtM1xyXG5cdFx0XHRcdFx0XHR2MygwLCBpbnMudCAgKSwgdjMoaW5zLmwsIGlucy50ICApLCB2MyhpbnMuciwgaW5zLnQgICksIHYzKGlucy53LCBpbnMudCAgKSwgLy80LTdcclxuXHRcdFx0XHRcdFx0djMoMCwgaW5zLmIrMSksIHYzKGlucy5sLCBpbnMuYisxKSwgdjMoaW5zLnIsIGlucy5iKzEpLCB2MyhpbnMudywgaW5zLmIrMSksIC8vOC0xMVxyXG5cdFx0XHRcdFx0XHR2MygwLCBpbnMuaCsxKSwgdjMoaW5zLmwsIGlucy5oKzEpLCB2MyhpbnMuciwgaW5zLmgrMSksIHYzKGlucy53LCBpbnMuaCsxKSwgLy8xMi0xNVxyXG5cdFx0XHRcdFx0XHRcclxuXHRcdFx0XHRcdFx0djMoaW5zLmF4K2lucy5hcywgaW5zLmF5K2lucy5hcywgMSksIHYzKGlucy5heC1pbnMuYXMsIGlucy5heStpbnMuYXMsIDEpLCAvLzE2LTE3XHJcblx0XHRcdFx0XHRcdHYzKGlucy5heCtpbnMuYXMsIGlucy5heS1pbnMuYXMsIDEpLCB2MyhpbnMuYXgtaW5zLmFzLCBpbnMuYXktaW5zLmFzLCAxKSwgLy8xOC0xOVxyXG5cdFx0XHRcdFx0XHRcclxuXHRcdFx0XHRcdFx0djMoMCwgKGlucy5oKzEpLzIsIC0xKSwgdjMoMTYsIChpbnMuaCsxKS8yLCAtMSksIHYzKDAsIDAsIC0xKSwgLy8yMC0yMlxyXG5cdFx0XHRcdFx0XSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdG5hbWU6IFwiaGlkZVN0b3BcIiwgdmVydGljZXM6IFtcclxuXHRcdFx0XHRcdFx0djMoMCwgICAgIDApLCB2MyhpbnMubCwgICAgIDApLCB2MyhpbnMuciwgICAgIDApLCB2MyhpbnMudywgICAgIDApLCAvLzAtM1xyXG5cdFx0XHRcdFx0XHR2MygwLCBpbnMudCksIHYzKGlucy5sLCBpbnMudCksIHYzKGlucy5yLCBpbnMudCksIHYzKGlucy53LCBpbnMudCksIC8vNC03XHJcblx0XHRcdFx0XHRcdHYzKDAsIGlucy5iKSwgdjMoaW5zLmwsIGlucy5iKSwgdjMoaW5zLnIsIGlucy5iKSwgdjMoaW5zLncsIGlucy5iKSwgLy84LTExXHJcblx0XHRcdFx0XHRcdHYzKDAsIGlucy5oKSwgdjMoaW5zLmwsIGlucy5oKSwgdjMoaW5zLnIsIGlucy5oKSwgdjMoaW5zLncsIGlucy5oKSwgLy8xMi0xNVxyXG5cdFx0XHRcdFx0XHRcclxuXHRcdFx0XHRcdFx0djMoaW5zLmF4K2lucy5hcywgaW5zLmF5K2lucy5hcywtMSksIHYzKGlucy5heC1pbnMuYXMsIGlucy5heStpbnMuYXMsLTEpLCAvLzE2LTE3XHJcblx0XHRcdFx0XHRcdHYzKGlucy5heCtpbnMuYXMsIGlucy5heS1pbnMuYXMsLTEpLCB2MyhpbnMuYXgtaW5zLmFzLCBpbnMuYXktaW5zLmFzLC0xKSwgLy8xOC0xOVxyXG5cdFx0XHRcdFx0XHRcclxuXHRcdFx0XHRcdFx0djMoMCwgaW5zLmgvMiwgLTEpLCB2MygxNiwgaW5zLmgvMiwgLTEpLCB2MygwLCAwLCAtMSksIC8vMjAtMjJcclxuXHRcdFx0XHRcdF0sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHRuYW1lOiBcInRyaWFuZ2xlXCIsIHZlcnRpY2VzOiBbXHJcblx0XHRcdFx0XHRcdHYzKDAsICAgICAwKSwgdjMoaW5zLmwsICAgICAwKSwgdjMoaW5zLnIsICAgICAwKSwgdjMoaW5zLncsICAgICAwKSwgLy8wLTNcclxuXHRcdFx0XHRcdFx0djMoMCwgaW5zLnQpLCB2MyhpbnMubCwgaW5zLnQpLCB2MyhpbnMuciwgaW5zLnQpLCB2MyhpbnMudywgaW5zLnQpLCAvLzQtN1xyXG5cdFx0XHRcdFx0XHR2MygwLCBpbnMuYiksIHYzKGlucy5sLCBpbnMuYiksIHYzKGlucy5yLCBpbnMuYiksIHYzKGlucy53LCBpbnMuYiksIC8vOC0xMVxyXG5cdFx0XHRcdFx0XHR2MygwLCBpbnMuaCksIHYzKGlucy5sLCBpbnMuaCksIHYzKGlucy5yLCBpbnMuaCksIHYzKGlucy53LCBpbnMuaCksIC8vMTItMTVcclxuXHRcdFx0XHRcdFx0XHJcblx0XHRcdFx0XHRcdHYzKGlucy5heCtpbnMuYXMsIGlucy5heStpbnMuYXMsIDEpLCB2MyhpbnMuYXgtaW5zLmFzLCBpbnMuYXkraW5zLmFzLCAxKSwgLy8xNi0xN1xyXG5cdFx0XHRcdFx0XHR2MyhpbnMuYXggICAgICAgLCBpbnMuYXktaW5zLmFzLCAxKSwgdjMoaW5zLmF4ICAgICAgICwgaW5zLmF5LWlucy5hcywgMSksIC8vMTgtMTlcclxuXHRcdFx0XHRcdFx0XHJcblx0XHRcdFx0XHRcdHYzKDAsIGlucy5oLzIsIC0xKSwgdjMoMTYsIGlucy5oLzIsIC0xKSwgdjMoMCwgMCwgLTEpLCAvLzIwLTIyXHJcblx0XHRcdFx0XHRdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0bmFtZTogXCJ0YWlsWFwiLCB2ZXJ0aWNlczogW1xyXG5cdFx0XHRcdFx0XHR2MygwLCAgICAgMCksIHYzKGlucy5sLCAgICAgMCksIHYzKGlucy5yLCAgICAgMCksIHYzKGlucy53LCAgICAgMCksIC8vMC0zXHJcblx0XHRcdFx0XHRcdHYzKDAsIGlucy50KSwgdjMoaW5zLmwsIGlucy50KSwgdjMoaW5zLnIsIGlucy50KSwgdjMoaW5zLncsIGlucy50KSwgLy80LTdcclxuXHRcdFx0XHRcdFx0djMoMCwgaW5zLmIpLCB2MyhpbnMubCwgaW5zLmIpLCB2MyhpbnMuciwgaW5zLmIpLCB2MyhpbnMudywgaW5zLmIpLCAvLzgtMTFcclxuXHRcdFx0XHRcdFx0djMoMCwgaW5zLmgpLCB2MyhpbnMubCwgaW5zLmgpLCB2MyhpbnMuciwgaW5zLmgpLCB2MyhpbnMudywgaW5zLmgpLCAvLzEyLTE1XHJcblx0XHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0XHR2MyhpbnMuYXgraW5zLmFzLCBpbnMuYXkraW5zLmFzLCAxKSwgdjMoaW5zLmF4LWlucy5hcywgaW5zLmF5K2lucy5hcywgMSksIC8vMTYtMTdcclxuXHRcdFx0XHRcdFx0djMoaW5zLmF4K2lucy5hcywgaW5zLmF5LWlucy5hcywgMSksIHYzKGlucy5heC1pbnMuYXMsIGlucy5heS1pbnMuYXMsIDEpLCAvLzE4LTE5XHJcblx0XHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0XHR2MygwLCBpbnMuaC8yLCAtMSksIHYzKDE2LCBpbnMuaC8yLCAtMSksIHYzKDEsIDAsIC0xKSwgLy8yMC0yMlxyXG5cdFx0XHRcdFx0XSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdG5hbWU6IFwidGFpbFlcIiwgdmVydGljZXM6IFtcclxuXHRcdFx0XHRcdFx0djMoMCwgICAgIDApLCB2MyhpbnMubCwgICAgIDApLCB2MyhpbnMuciwgICAgIDApLCB2MyhpbnMudywgICAgIDApLCAvLzAtM1xyXG5cdFx0XHRcdFx0XHR2MygwLCBpbnMudCksIHYzKGlucy5sLCBpbnMudCksIHYzKGlucy5yLCBpbnMudCksIHYzKGlucy53LCBpbnMudCksIC8vNC03XHJcblx0XHRcdFx0XHRcdHYzKDAsIGlucy5iKSwgdjMoaW5zLmwsIGlucy5iKSwgdjMoaW5zLnIsIGlucy5iKSwgdjMoaW5zLncsIGlucy5iKSwgLy84LTExXHJcblx0XHRcdFx0XHRcdHYzKDAsIGlucy5oKSwgdjMoaW5zLmwsIGlucy5oKSwgdjMoaW5zLnIsIGlucy5oKSwgdjMoaW5zLncsIGlucy5oKSwgLy8xMi0xNVxyXG5cdFx0XHRcdFx0XHRcclxuXHRcdFx0XHRcdFx0djMoaW5zLmF4K2lucy5hcywgaW5zLmF5K2lucy5hcywgMSksIHYzKGlucy5heC1pbnMuYXMsIGlucy5heStpbnMuYXMsIDEpLCAvLzE2LTE3XHJcblx0XHRcdFx0XHRcdHYzKGlucy5heCtpbnMuYXMsIGlucy5heS1pbnMuYXMsIDEpLCB2MyhpbnMuYXgtaW5zLmFzLCBpbnMuYXktaW5zLmFzLCAxKSwgLy8xOC0xOVxyXG5cdFx0XHRcdFx0XHRcclxuXHRcdFx0XHRcdFx0djMoMCwgaW5zLmgvMiwgLTEpLCB2MygxNiwgaW5zLmgvMiwgLTEpLCB2MygwLCAxLCAtMSksIC8vMjAtMjJcclxuXHRcdFx0XHRcdF0sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0XHJcblx0XHR2YXIgbWF0ID0gbmV3IFRIUkVFLk1lc2hGYWNlTWF0ZXJpYWwoW1xyXG5cdFx0XHQoZnVuY3Rpb24oKXtcclxuXHRcdFx0XHR2YXIgbWF0ID0gbmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKCk7XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0dmFyIHRleCA9IG5ldyBUSFJFRS5UZXh0dXJlKCk7XHJcblx0XHRcdFx0dGV4Lm1hZ0ZpbHRlciA9IFRIUkVFLk5lYXJlc3RGaWx0ZXI7XHJcblx0XHRcdFx0dGV4Lm1pbkZpbHRlciA9IFRIUkVFLk5lYXJlc3RGaWx0ZXI7XHJcblx0XHRcdFx0dGV4LmFuaXNvdHJvcHkgPSAxO1xyXG5cdFx0XHRcdHRleC5nZW5lcmF0ZU1pcG1hcHMgPSBmYWxzZTtcclxuXHRcdFx0XHRcclxuXHRcdFx0XHR2YXIgaW1nID0gbmV3IEltYWdlKCk7XHJcblx0XHRcdFx0ZnVuY3Rpb24gZigpe1xyXG5cdFx0XHRcdFx0dGV4LmltYWdlID0gaW1nO1xyXG5cdFx0XHRcdFx0dGV4Lm5lZWRzVXBkYXRlID0gdHJ1ZTtcclxuXHRcdFx0XHRcdGltZy5yZW1vdmVFdmVudExpc3RlbmVyKFwibG9hZFwiLCBmKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0aW1nLm9uKFwibG9hZFwiLCBmKTtcclxuXHRcdFx0XHRcclxuXHRcdFx0XHRpbWcuc3JjID0gQkFTRVVSTCtcIi9pbWcvdWkvXCIrc2VsZi50eXBlK1wiLnBuZ1wiO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdG1hdC5tYXAgPSB0ZXg7XHJcblx0XHRcdFx0bWF0Lm1vcnBoVGFyZ2V0cyA9IHRydWU7XHJcblx0XHRcdFx0bWF0LnRyYW5zcGFyZW50ID0gdHJ1ZTtcclxuXHRcdFx0XHRtYXQuYWxwaGFUZXN0ID0gMC4wNTtcclxuXHRcdFx0XHRyZXR1cm4gbWF0O1xyXG5cdFx0XHR9KSgpLFxyXG5cdFx0XHRcclxuXHRcdFx0KGZ1bmN0aW9uKCl7XHJcblx0XHRcdFx0dmFyIG1hdCA9IG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7XHJcblx0XHRcdFx0XHRjb2xvcjogMHgwMDAwMDAsXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdFx0bWF0Lm1vcnBoVGFyZ2V0cyA9IHRydWU7XHJcblx0XHRcdFx0cmV0dXJuIG1hdDtcclxuXHRcdFx0fSkoKSxcclxuXHRcdF0pO1xyXG5cdFx0XHJcblx0XHR0aGlzLm1vZGVsID0gbmV3IFRIUkVFLk1lc2goZ2VvbSwgbWF0KTtcclxuXHRcdHRoaXMubW9kZWwudmlzaWJsZSA9IGZhbHNlO1xyXG5cdFx0cmV0dXJuIHRoaXMubW9kZWw7XHJcblx0XHRcclxuXHRcdC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0vL1xyXG5cdFx0ZnVuY3Rpb24gdjIoeCwgeSkgeyByZXR1cm4gbmV3IFRIUkVFLlZlY3RvcjIoeCwgeSk7IH1cclxuXHRcdGZ1bmN0aW9uIHYzKHgsIHksIHopIHsgcmV0dXJuIG5ldyBUSFJFRS5WZWN0b3IzKHgsIHksIHogfHwgMCk7IH1cclxuXHRcdGZ1bmN0aW9uIHV2KHYpIHtcclxuXHRcdFx0cmV0dXJuIG5ldyBUSFJFRS5WZWN0b3IyKHYueCAvIGlucy53LCB2LnkgLyBpbnMuaCk7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdGZ1bmN0aW9uIGY0KGcsIGEsIGIsIGMsIGQsIG1hdGkpIHtcclxuXHRcdFx0Zy5mYWNlcy5wdXNoKG5ldyBUSFJFRS5GYWNlMyhhLCBiLCBkLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgbWF0aSkpO1xyXG5cdFx0XHRnLmZhY2VzLnB1c2gobmV3IFRIUkVFLkZhY2UzKGEsIGQsIGMsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCBtYXRpKSk7XHJcblx0XHRcdFxyXG5cdFx0XHRnLmZhY2VWZXJ0ZXhVdnNbMF0ucHVzaChbIHV2KGcudmVydGljZXNbYV0pLCB1dihnLnZlcnRpY2VzW2JdKSwgdXYoZy52ZXJ0aWNlc1tkXSkgXSk7XHJcblx0XHRcdGcuZmFjZVZlcnRleFV2c1swXS5wdXNoKFsgdXYoZy52ZXJ0aWNlc1thXSksIHV2KGcudmVydGljZXNbZF0pLCB1dihnLnZlcnRpY2VzW2NdKSBdKTtcclxuXHRcdH1cclxuXHR9XHJcblx0XHJcbn0pO1xyXG5cclxuXHJcblxyXG5cclxuXHJcbmZ1bmN0aW9uIHNldHVwVHlwZXdyaXRlcih0ZXh0Ym94LCBjYWxsYmFjaykge1xyXG5cdHRleHRib3guYWR2YW5jZSA9IG51bGw7XHJcblx0ZnVuY3Rpb24gc2V0TmV4dChjYikge1xyXG5cdFx0dGV4dGJveC5hZHZhbmNlID0gY2I7XHJcblx0fVxyXG5cdFxyXG5cdHZhciBjb21wbGV0ZWRUZXh0ID0gdGV4dGJveC5lbGVtZW50Lmh0bWwoKTtcclxuXHR0ZXh0Ym94LmNvbXBsZXRlID0gZnVuY3Rpb24oKSB7XHJcblx0XHR0ZXh0Ym94LmVsZW1lbnQuaHRtbChjb21wbGV0ZWRUZXh0KTtcclxuXHRcdHRleHRib3guYWR2YW5jZSA9IGJsaW5rQ3Vyc29yO1xyXG5cdFx0aWYgKGNhbGxiYWNrKSBjYWxsYmFjaygpO1xyXG5cdH07XHJcblx0XHJcblx0dGV4dGJveC5tb2RlbC5tb3JwaFRhcmdldEluZmx1ZW5jZXNbTV9ISURFXSA9IDE7XHJcblx0XHJcblx0Ly9CZWNhdXNlIHRleHRub2RlcyBhcmUgbm90IFwiZWxlbWVudHNcIiwgYW5kIGpxdWVyeSB3b24ndCBoaWRlIHRleHQgbm9kZXMsIGluIFxyXG5cdC8vIG9yZGVyIHRvIGhpZGUgZXZlcnl0aGluZywgd2UgbmVlZCB0byB3cmFwIGV2ZXJ5dGhpbmcgaW4gc3BhbiB0YWdzLi4uXHJcblx0dGV4dGJveC5lbGVtZW50LmNvbnRlbnRzKClcclxuXHRcdC5maWx0ZXIoZnVuY3Rpb24oKXsgcmV0dXJuIHRoaXMubm9kZVR5cGUgPT0gMzsgfSlcclxuXHRcdC53cmFwKFwiPHNwYW4+XCIpO1xyXG5cdFxyXG5cdHZhciBlbGVtZW50cyA9IHRleHRib3guZWxlbWVudC5jb250ZW50cygpO1xyXG5cdCQoZWxlbWVudHMpLmhpZGUoKTtcclxuXHRcclxuXHRcclxuXHQvL0NvcGllZCBhbmQgbW9kaWZpZWQgZnJvbSBodHRwOi8vanNmaWRkbGUubmV0L3k5UEpnLzI0L1xyXG5cdHZhciBpID0gMDtcclxuXHRmdW5jdGlvbiBpdGVyYXRlKCkge1xyXG5cdFx0aWYgKGkgPCBlbGVtZW50cy5sZW5ndGgpIHtcclxuXHRcdFx0JChlbGVtZW50c1tpXSkuc2hvdygpO1xyXG5cdFx0XHRhbmltYXRlTm9kZShlbGVtZW50c1tpXSwgaXRlcmF0ZSk7IFxyXG5cdFx0XHRpKys7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRpZiAoY2FsbGJhY2spIGNhbGxiYWNrKCk7XHJcblx0XHRcdHRleHRib3guYWR2YW5jZSA9IGJsaW5rQ3Vyc29yO1xyXG5cdFx0fVxyXG5cdH1cclxuXHR0ZXh0Ym94LmFkdmFuY2UgPSBpdGVyYXRlO1xyXG5cdFxyXG5cdGZ1bmN0aW9uIGFuaW1hdGVOb2RlKGVsZW1lbnQsIGNhbGxiYWNrKSB7XHJcblx0XHR2YXIgcGllY2VzID0gW107XHJcblx0XHRpZiAoZWxlbWVudC5ub2RlVHlwZT09MSkgeyAvL2VsZW1lbnQgbm9kZVxyXG5cdFx0XHR3aGlsZSAoZWxlbWVudC5oYXNDaGlsZE5vZGVzKCkpIHtcclxuXHRcdFx0XHRwaWVjZXMucHVzaCggZWxlbWVudC5yZW1vdmVDaGlsZChlbGVtZW50LmZpcnN0Q2hpbGQpICk7XHJcblx0XHRcdH1cclxuXHRcdFx0XHJcblx0XHRcdHNldE5leHQoZnVuY3Rpb24gY2hpbGRTdGVwKCkge1xyXG5cdFx0XHRcdGlmIChwaWVjZXMubGVuZ3RoKSB7XHJcblx0XHRcdFx0XHRhbmltYXRlTm9kZShwaWVjZXNbMF0sIGNoaWxkU3RlcCk7IFxyXG5cdFx0XHRcdFx0ZWxlbWVudC5hcHBlbmRDaGlsZChwaWVjZXMuc2hpZnQoKSk7XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdGNhbGxiYWNrKCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHRcdFxyXG5cdFx0fSBlbHNlIGlmIChlbGVtZW50Lm5vZGVUeXBlPT0zKSB7IC8vdGV4dCBub2RlXHJcblx0XHRcdHBpZWNlcyA9IGVsZW1lbnQuZGF0YS5tYXRjaCgvLnswLDJ9L2cpOyAvLyAyOiBOdW1iZXIgb2YgY2hhcnMgcGVyIGZyYW1lXHJcblx0XHRcdGVsZW1lbnQuZGF0YSA9IFwiXCI7XHJcblx0XHRcdChmdW5jdGlvbiBhZGRUZXh0KCl7XHJcblx0XHRcdFx0ZWxlbWVudC5kYXRhICs9IHBpZWNlcy5zaGlmdCgpO1xyXG5cdFx0XHRcdHNldE5leHQocGllY2VzLmxlbmd0aCA/IGFkZFRleHQgOiBjYWxsYmFjayk7XHJcblx0XHRcdH0pKCk7XHJcblx0XHR9XHJcblx0fVxyXG5cdFxyXG5cdHZhciB0aWNrID0gMDtcclxuXHRmdW5jdGlvbiBibGlua0N1cnNvcihkZWx0YSkge1xyXG5cdFx0dGljayAtPSBkZWx0YTtcclxuXHRcdGlmICh0aWNrIDw9IDApIHtcclxuXHRcdFx0dGljayA9IDU7XHJcblx0XHRcdHRleHRib3gubW9kZWwubW9ycGhUYXJnZXRJbmZsdWVuY2VzW01fSElERV0gPSAhdGV4dGJveC5tb2RlbC5tb3JwaFRhcmdldEluZmx1ZW5jZXNbTV9ISURFXTtcclxuXHRcdH1cclxuXHR9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZURFQlVHU2V0dXAoKSB7XHJcblx0dGhpcy5fbWFpbkNhbWVyYSA9IHRoaXMuY2FtZXJhO1xyXG5cdHRoaXMuX2RlYnVnQ2FtZXJhID0gdGhpcy5jYW1lcmEgPSBuZXcgVEhSRUUuUGVyc3BlY3RpdmVDYW1lcmEoNzUsIFxyXG5cdFx0JChcIiNnYW1lc2NyZWVuXCIpLndpZHRoKCkvICQoXCIjZ2FtZXNjcmVlblwiKS5oZWlnaHQoKSxcclxuXHRcdDAuMSwgMTAwMDApO1xyXG5cdHRoaXMuX2RlYnVnQ2FtZXJhLnBvc2l0aW9uLnogPSAxMDtcclxuXHR0aGlzLnNjZW5lLmFkZCh0aGlzLl9kZWJ1Z0NhbWVyYSk7XHJcblx0XHJcblx0XHJcblx0dGhpcy5zY2VuZS5hZGQobmV3IFRIUkVFLkNhbWVyYUhlbHBlcih0aGlzLl9tYWluQ2FtZXJhKSk7XHJcblx0dGhpcy5zY2VuZS5hZGQobmV3IFRIUkVFLkF4aXNIZWxwZXIoNSkpO1xyXG5cdFxyXG5cdHZhciBjb250cm9scyA9IG5ldyBUSFJFRS5PcmJpdENvbnRyb2xzKHRoaXMuX2RlYnVnQ2FtZXJhKTtcclxuXHRjb250cm9scy5kYW1waW5nID0gMC4yO1xyXG5cdFxyXG5cdHZhciBvbGRsb2dpYyA9IHRoaXMubG9naWNMb29wO1xyXG5cdHRoaXMubG9naWNMb29wID0gZnVuY3Rpb24oZGVsdGEpe1xyXG5cdFx0Y29udHJvbHMudXBkYXRlKCk7XHJcblx0XHRvbGRsb2dpYy5jYWxsKHRoaXMsIGRlbHRhKTtcclxuXHR9O1xyXG59XHJcbiIsIi8vIG1hcC5qc1xyXG5cclxudmFyIGluaGVyaXRzID0gcmVxdWlyZShcImluaGVyaXRzXCIpO1xyXG52YXIgZXh0ZW5kID0gcmVxdWlyZShcImV4dGVuZFwiKTtcclxudmFyIG5kYXJyYXkgPSByZXF1aXJlKFwibmRhcnJheVwiKTtcclxudmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoXCJldmVudHNcIikuRXZlbnRFbWl0dGVyO1xyXG5cclxudmFyIEV2ZW50ID0gcmVxdWlyZShcInRwcC1ldmVudFwiKTtcclxudmFyIFBsYXllckNoYXIgPSByZXF1aXJlKFwidHBwLXBjXCIpO1xyXG5cclxudmFyIE9iakxvYWRlciA9IHJlcXVpcmUoXCIuL21vZGVsL29iai1sb2FkZXJcIik7XHJcblxyXG52YXIgbVNldHVwID0gcmVxdWlyZShcIi4vbW9kZWwvbWFwLXNldHVwXCIpO1xyXG5cclxuXHJcbi8vIFRoZXNlIHdvdWxkIGJlIENPTlNUcyBpZiB3ZSB3ZXJlbid0IGluIHRoZSBicm93c2VyXHJcbnZhciBFWFRfTUFQQlVORExFID0gXCIuemlwXCI7IC8vRXh0ZW5zaW9uIGZvciByZXF1ZXN0aW5nIG1hcCBidW5kbGVzXHJcbnZhciBERUZfSEVJR0hUX1NURVAgPSAwLjU7IC8vRGVmYXVsdCBZIHRyYW5zbGF0aW9uIGFtb3VudCBhIGhlaWdodCBzdGVwIHRha2VzLiBUaGlzIGNhbiBiZSBkZWZpbmVkIGluIGEgbWFwIGZpbGUuXHJcbnZhciBHQ19CSU4gPSBcIm1hcFwiO1xyXG5cclxuXHJcbi8vIElmIHlvdSBtYWtlIGFueSBjaGFuZ2VzIGhlcmUsIG1ha2Ugc3VyZSB0byBtaXJyb3IgdGhlbSBpbiBidWlsZC9tYXAtemlwcGVyLmpzIVxyXG5mdW5jdGlvbiBjb252ZXJ0U2hvcnRUb1RpbGVQcm9wcyh2YWwpIHtcclxuXHQvLyBUaWxlRGF0YTogTU1NTUxXMDAgVFRUSEhISEhcclxuXHQvLyBXaGVyZTpcclxuXHQvLyAgICBNID0gTW92ZW1lbnQsIEJpdHMgYXJlOiAoRG93biwgVXAsIExlZnQsIFJpZ2h0KVxyXG5cdC8vICAgIEwgPSBMZWRnZSBiaXQgKHRoaXMgdGlsZSBpcyBhIGxlZGdlOiB5b3UganVtcCBvdmVyIGl0IHdoZW4gZ2l2ZW4gcGVybWlzc2lvbiB0byBlbnRlciBpdClcclxuXHQvLyAgICBXID0gV2F0ZXIgYml0ICh0aGlzIHRpbGUgaXMgd2F0ZXI6IG1vc3QgYWN0b3JzIGFyZSBkZW5pZWQgZW50cnkgb250byB0aGlzIHRpbGUpXHJcblx0Ly8gICAgSCA9IEhlaWdodCAodmVydGljYWwgbG9jYXRpb24gb2YgdGhlIGNlbnRlciBvZiB0aGlzIHRpbGUpXHJcblx0Ly8gICAgVCA9IFRyYW5zaXRpb24gVGlsZSAodHJhbnNpdGlvbiB0byBhbm90aGVyIExheWVyIHdoZW4gc3RlcHBpbmcgb24gdGhpcyB0aWxlKVxyXG5cdHZhciBwcm9wcyA9IHt9O1xyXG5cdFxyXG5cdHZhciBtb3ZlbWVudCA9ICgodmFsID4+IDEyKSAmIDB4Rik7XHJcblx0Ly8gbW92ZW1lbnQgaXMgYmxvY2tlZCBpZiBhIG1vdmVtZW50IGZsYWcgaXMgdHJ1ZTpcclxuXHRwcm9wcy5tb3ZlbWVudCA9IHt9O1xyXG5cdHByb3BzLm1vdmVtZW50W1wiZG93blwiXSAgPSAhIShtb3ZlbWVudCAmIDB4OCk7XHJcblx0cHJvcHMubW92ZW1lbnRbXCJ1cFwiXSAgICA9ICEhKG1vdmVtZW50ICYgMHg0KTtcclxuXHRwcm9wcy5tb3ZlbWVudFtcImxlZnRcIl0gID0gISEobW92ZW1lbnQgJiAweDIpO1xyXG5cdHByb3BzLm1vdmVtZW50W1wicmlnaHRcIl0gPSAhIShtb3ZlbWVudCAmIDB4MSk7XHJcblx0XHJcblx0cHJvcHMuaXNXYWxrYWJsZSA9ICEhKH5tb3ZlbWVudCAmIDB4Rik7XHJcblx0cHJvcHMuaXNMZWRnZSA9ICEhKHZhbCAmICgweDEgPDwgMTEpKTtcclxuXHRwcm9wcy5pc1dhdGVyID0gISEodmFsICYgKDB4MSA8PCAxMCkpO1xyXG5cdFxyXG5cdHByb3BzLnRyYW5zaXRpb24gPSAoKHZhbCA+PiA1KSAmIDB4Nyk7XHJcblx0XHJcblx0cHJvcHMuaGVpZ2h0ID0gKCh2YWwpICYgMHgxRik7XHJcblx0XHJcblx0cHJvcHMubm9OUEMgPSAhISh2YWwgJiAoMHgxIDw8IDkpKTtcclxuXHRcclxuXHRyZXR1cm4gcHJvcHM7XHJcbn1cclxuXHJcblxyXG5cclxuLyoqXHJcbiAqXHJcbiAqXHJcbiAqXHJcbiAqXHJcbiAqL1xyXG5mdW5jdGlvbiBNYXAoaWQsIG9wdHMpe1xyXG5cdHRoaXMuaWQgPSBpZDtcclxuXHRleHRlbmQodGhpcywgb3B0cyk7XHJcblx0XHJcblx0R0MuYWxsb2NhdGVCaW4oR0NfQklOKTtcclxuXHR0aGlzLmdjID0gR0MuZ2V0QmluKEdDX0JJTik7XHJcblx0XHJcblx0dGhpcy5maWxlU3lzID0gbmV3IHppcC5mcy5GUygpO1xyXG59XHJcbmluaGVyaXRzKE1hcCwgRXZlbnRFbWl0dGVyKTtcclxuZXh0ZW5kKE1hcC5wcm90b3R5cGUsIHtcclxuXHRpZCA6IG51bGwsIC8vbWFwJ3MgaW50ZXJuYWwgaWRcclxuXHRcclxuXHRmaWxlOiBudWxsLCAvL1ppcCBmaWxlIGhvbGRpbmcgYWxsIGRhdGFcclxuXHRmaWxlU3lzOiBudWxsLCAvL0N1cnJlbnQgemlwIGZpbGUgc3lzdGVtIGZvciB0aGlzIG1hcFxyXG5cdHhocjogbnVsbCwgLy9hY3RpdmUgeGhyIHJlcXVlc3RcclxuXHRcclxuXHRtZXRhZGF0YSA6IG51bGwsXHJcblx0b2JqZGF0YSA6IG51bGwsXHJcblx0bXRsZGF0YSA6IG51bGwsXHJcblx0XHJcblx0bFNjcmlwdFRhZyA6IG51bGwsXHJcblx0Z1NjcmlwdFRhZyA6IG51bGwsXHJcblx0XHJcblx0Y2FtZXJhOiBudWxsLFxyXG5cdGNhbWVyYXM6IG51bGwsXHJcblx0c2NlbmU6IG51bGwsXHJcblx0bWFwbW9kZWw6IG51bGwsXHJcblx0XHJcblx0c3ByaXRlTm9kZTogbnVsbCxcclxuXHRsaWdodE5vZGU6IG51bGwsXHJcblx0Y2FtZXJhTm9kZTogbnVsbCxcclxuXHRcclxuXHQvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHQvLyBMb2FkIE1hbmFnZW1lbnQgXHJcblx0Ly8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblx0XHJcblx0ZGlzcG9zZSA6IGZ1bmN0aW9uKCl7XHJcblx0XHQkKHRoaXMubFNjcmlwdFRhZykucmVtb3ZlKCk7XHJcblx0XHQkKHRoaXMuZ1NjcmlwdFRhZykucmVtb3ZlKCk7XHJcblx0XHRcclxuXHRcdGRlbGV0ZSB0aGlzLmZpbGU7XHJcblx0XHRkZWxldGUgdGhpcy5maWxlU3lzO1xyXG5cdFx0ZGVsZXRlIHRoaXMueGhyO1xyXG5cdFx0XHJcblx0XHRkZWxldGUgdGhpcy5tZXRhZGF0YTtcclxuXHRcdGRlbGV0ZSB0aGlzLm9iamRhdGE7XHJcblx0XHRkZWxldGUgdGhpcy5tdGxkYXRhO1xyXG5cdFx0XHJcblx0XHRkZWxldGUgdGhpcy5sU2NyaXB0VGFnO1xyXG5cdFx0ZGVsZXRlIHRoaXMuZ1NjcmlwdFRhZztcclxuXHRcdFxyXG5cdFx0ZGVsZXRlIHRoaXMudGlsZWRhdGE7XHJcblx0XHRcclxuXHRcdGRlbGV0ZSB0aGlzLnNjZW5lO1xyXG5cdFx0ZGVsZXRlIHRoaXMubWFwbW9kZWw7XHJcblx0XHRkZWxldGUgdGhpcy5jYW1lcmE7XHJcblx0XHRcclxuXHRcdGRlbGV0ZSB0aGlzLnNwcml0ZU5vZGU7XHJcblx0XHRkZWxldGUgdGhpcy5saWdodE5vZGU7XHJcblx0XHRkZWxldGUgdGhpcy5jYW1lcmFOb2RlO1xyXG5cdFx0XHJcblx0XHRHQy5kaXNwb3NlKEdDX0JJTik7XHJcblx0fSxcclxuXHRcclxuXHQvKiogQmVnaW4gZG93bmxvYWQgb2YgdGhpcyBtYXAncyB6aXAgZmlsZSwgcHJlbG9hZGluZyB0aGUgZGF0YS4gKi9cclxuXHRkb3dubG9hZCA6IGZ1bmN0aW9uKCl7XHJcblx0XHRpZiAodGhpcy5maWxlKSByZXR1cm47IC8vd2UgaGF2ZSB0aGUgZmlsZSBpbiBtZW1vcnkgYWxyZWFkeSwgZG8gbm90aGluZ1xyXG5cdFx0aWYgKHRoaXMueGhyKSByZXR1cm47IC8vYWxyZWFkeSBnb3QgYW4gYWN0aXZlIHJlcXVlc3QsIGRvIG5vdGhpbmdcclxuXHRcdFxyXG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xyXG5cdFx0dmFyIHhociA9IHRoaXMueGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XHJcblx0XHR4aHIub3BlbihcIkdFVFwiLCBCQVNFVVJMK1wiL21hcHMvXCIrdGhpcy5pZCtFWFRfTUFQQlVORExFKTtcclxuXHRcdC8vIGNvbnNvbGUubG9nKFwiWEhSOiBcIiwgeGhyKTtcclxuXHRcdHhoci5yZXNwb25zZVR5cGUgPSBcImJsb2JcIjtcclxuXHRcdHhoci5vbihcImxvYWRcIiwgZnVuY3Rpb24oZSkge1xyXG5cdFx0XHQvLyBjb25zb2xlLmxvZyhcIkxPQUQ6XCIsIGUpO1xyXG5cdFx0XHRzZWxmLmZpbGUgPSB4aHIucmVzcG9uc2U7XHJcblx0XHRcdHNlbGYuZW1pdChcImRvd25sb2FkZWRcIik7XHJcblx0XHR9KTtcclxuXHRcdHhoci5vbihcInByb2dyZXNzXCIsIGZ1bmN0aW9uKGUpe1xyXG5cdFx0XHQvLyBjb25zb2xlLmxvZyhcIlBST0dSRVNTOlwiLCBlKTtcclxuXHRcdFx0aWYgKGUubGVuZ3RoQ29tcHV0YWJsZSkge1xyXG5cdFx0XHRcdHZhciBwZXJjZW50RG9uZSA9IGUubG9hZGVkIC8gZS50b3RhbDtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHQvL21hcnF1ZWUgYmFyXHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cdFx0eGhyLm9uKFwiZXJyb3JcIiwgZnVuY3Rpb24oZSl7XHJcblx0XHRcdGNvbnNvbGUuZXJyb3IoXCJFUlJPUjpcIiwgZSk7XHJcblx0XHR9KTtcclxuXHRcdHhoci5vbihcImNhbmNlbGVkXCIsIGZ1bmN0aW9uKGUpe1xyXG5cdFx0XHRjb25zb2xlLmVycm9yKFwiQ0FOQ0VMRUQ6XCIsIGUpO1xyXG5cdFx0fSk7XHJcblx0XHQvL1RPRE8gb24gZXJyb3IgYW5kIG9uIGNhbmNlbGVkXHJcblx0XHRcclxuXHRcdHhoci5zZW5kKCk7XHJcblx0fSxcclxuXHRcclxuXHQvKipcclxuXHQgKiAgUmVhZHMgdGhlIHRpbGUgZGF0YSBhbmQgYmVnaW5zIGxvYWRpbmcgdGhlIHJlcXVpcmVkIHJlc291cmNlcy5cclxuXHQgKi9cclxuXHRsb2FkIDogZnVuY3Rpb24oKXtcclxuXHRcdHZhciBzZWxmID0gdGhpcztcclxuXHRcdGlmICghdGhpcy5maWxlKSB7IC8vSWYgZmlsZSBpc24ndCBkb3dubG9hZGVkIHlldCwgZGVmZXIgbG9hZGluZ1xyXG5cdFx0XHR0aGlzLm9uY2UoXCJkb3dubG9hZGVkXCIsIGZ1bmN0aW9uKCl7XHJcblx0XHRcdFx0c2VsZi5sb2FkKCk7XHJcblx0XHRcdH0pO1xyXG5cdFx0XHR0aGlzLmRvd25sb2FkKCk7XHJcblx0XHRcdC8vVE9ETyB0aHJvdyB1cCBsb2FkaW5nIGdpZlxyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdHRoaXMubWFya0xvYWRpbmcoXCJNQVBfbWFwZGF0YVwiKTtcclxuXHRcdFxyXG5cdFx0dGhpcy5maWxlU3lzLmltcG9ydEJsb2IodGhpcy5maWxlLCBmdW5jdGlvbiBzdWNjZXNzKCl7XHJcblx0XHRcdC8vbG9hZCB1cCB0aGUgbWFwIVxyXG5cdFx0XHRzZWxmLmZpbGVTeXMucm9vdC5nZXRDaGlsZEJ5TmFtZShcIm1hcC5qc29uXCIpLmdldFRleHQoX19qc29uTG9hZGVkLCBfX2xvZ1Byb2dyZXNzKTtcclxuXHRcdFx0c2VsZi5maWxlU3lzLnJvb3QuZ2V0Q2hpbGRCeU5hbWUoXCJtYXAub2JqXCIpLmdldFRleHQoX19vYmpMb2FkZWQsIF9fbG9nUHJvZ3Jlc3MpO1xyXG5cdFx0XHRzZWxmLmZpbGVTeXMucm9vdC5nZXRDaGlsZEJ5TmFtZShcIm1hcC5tdGxcIikuZ2V0VGV4dChfX210bExvYWRlZCwgX19sb2dQcm9ncmVzcyk7XHJcblx0XHRcdFxyXG5cdFx0fSwgZnVuY3Rpb24gZXJyb3IoZSl7XHJcblx0XHRcdGNvbnNvbGUubG9nKFwiRVJST1I6IFwiLCBlKTtcclxuXHRcdFx0c2VsZi5lbWl0KFwibG9hZC1lcnJvclwiKTsgLy9TZW5kIHRvIHRoZSBkb3JpdG8gZHVuZ2VvblxyXG5cdFx0fSk7XHJcblx0XHRyZXR1cm47IFxyXG5cdFx0XHJcblx0XHRmdW5jdGlvbiBfX2xvZ1Byb2dyZXNzKCkge1xyXG5cdFx0XHRjb25zb2xlLmxvZyhcIlBST0dSRVNTXCIsIGFyZ3VtZW50cyk7XHJcblx0XHR9XHJcblx0XHQvL0NhbGxiYWNrIGNoYWluIGJlbG93XHJcblx0XHRmdW5jdGlvbiBfX2pzb25Mb2FkZWQoZGF0YSkge1xyXG5cdFx0XHRzZWxmLm1ldGFkYXRhID0gSlNPTi5wYXJzZShkYXRhKTtcclxuXHRcdFx0XHJcblx0XHRcdHNlbGYudGlsZWRhdGEgPSBuZGFycmF5KHNlbGYubWV0YWRhdGEubWFwLCBbc2VsZi5tZXRhZGF0YS53aWR0aCwgc2VsZi5tZXRhZGF0YS5oZWlnaHRdLCBbMSwgc2VsZi5tZXRhZGF0YS53aWR0aF0pO1xyXG5cdFx0XHRpZiAoc2VsZi5tZXRhZGF0YVtcImhlaWdodHN0ZXBcIl0gPT09IHVuZGVmaW5lZCkge1xyXG5cdFx0XHRcdHNlbGYubWV0YWRhdGFbXCJoZWlnaHRzdGVwXCJdID0gREVGX0hFSUdIVF9TVEVQO1xyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHRzZWxmLmVtaXQoXCJsb2FkZWQtbWV0YVwiKTtcclxuXHRcdFx0X19sb2FkRG9uZSgpO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHRmdW5jdGlvbiBfX29iakxvYWRlZChkYXRhKSB7XHJcblx0XHRcdHNlbGYub2JqZGF0YSA9IGRhdGE7XHJcblx0XHRcdF9fbW9kZWxMb2FkZWQoKTtcclxuXHRcdH1cclxuXHRcdGZ1bmN0aW9uIF9fbXRsTG9hZGVkKGRhdGEpIHtcclxuXHRcdFx0c2VsZi5tdGxkYXRhID0gZGF0YTtcclxuXHRcdFx0X19tb2RlbExvYWRlZCgpO1xyXG5cdFx0fVxyXG5cdFx0ZnVuY3Rpb24gX19tb2RlbExvYWRlZCgpIHtcclxuXHRcdFx0aWYgKCFzZWxmLm9iamRhdGEgfHwgIXNlbGYubXRsZGF0YSkgcmV0dXJuOyAvL2Rvbid0IGJlZ2luIHBhcnNpbmcgdW50aWwgdGhleSdyZSBib3RoIGxvYWRlZFxyXG5cdFx0XHRcclxuXHRcdFx0ZnVuY3Rpb24gbG9hZFRleHR1cmUoZmlsZW5hbWUsIGNhbGxiYWNrKSB7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coXCJMT0FEIFRFWDpcIiwgZmlsZW5hbWUpO1xyXG5cdFx0XHRcdHZhciBmaWxlID0gc2VsZi5maWxlU3lzLnJvb3QuZ2V0Q2hpbGRCeU5hbWUoZmlsZW5hbWUpO1xyXG5cdFx0XHRcdGlmICghZmlsZSkge1xyXG5cdFx0XHRcdFx0Y29uc29sZS5lcnJvcihcIkVSUk9SIExPQURJTkcgVEVYVFVSRTogTm8gc3VjaCBmaWxlIGluIG1hcCBidW5kbGUhIFwiK2ZpbGVuYW1lKTtcclxuXHRcdFx0XHRcdGNhbGxiYWNrKERFRl9URVhUVVJFKTtcclxuXHRcdFx0XHRcdHJldHVybjtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0ZmlsZS5nZXRCbG9iKFwiaW1hZ2UvcG5nXCIsIGZ1bmN0aW9uKGRhdGEpIHtcclxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKFwiVEVYIExPQURFRDpcIiwgZmlsZW5hbWUsIGRhdGEpO1xyXG5cdFx0XHRcdFx0dmFyIHVybCA9IFVSTC5jcmVhdGVPYmplY3RVUkwoZGF0YSk7XHJcblx0XHRcdFx0XHRHQy5jb2xsZWN0VVJMKHVybCwgR0NfQklOKTtcclxuXHRcdFx0XHRcdGNhbGxiYWNrKHVybCk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHRcdFx0XHJcblx0XHRcdHZhciBvYmpsZHIgPSBuZXcgT2JqTG9hZGVyKHNlbGYub2JqZGF0YSwgc2VsZi5tdGxkYXRhLCBsb2FkVGV4dHVyZSwge1xyXG5cdFx0XHRcdGdjOiBHQ19CSU4sXHJcblx0XHRcdH0pO1xyXG5cdFx0XHRvYmpsZHIub24oXCJsb2FkXCIsIF9fbW9kZWxSZWFkeSk7XHJcblx0XHRcdG9iamxkci5sb2FkKCk7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdGZ1bmN0aW9uIF9fbW9kZWxSZWFkeShvYmopIHtcclxuXHRcdFx0Y29uc29sZS5sb2coXCJfX21vZGVsUmVhZHlcIik7XHJcblx0XHRcdHNlbGYubWFwbW9kZWwgPSBvYmo7XHJcblx0XHRcdC8vIF9fdGVzdF9fb3V0cHV0VHJlZShvYmopO1xyXG5cdFx0XHRzZWxmLm9iamRhdGEgPSBzZWxmLm10bGRhdGEgPSB0cnVlOyAvL3dpcGUgdGhlIGJpZyBzdHJpbmdzIGZyb20gbWVtb3J5XHJcblx0XHRcdHNlbGYuZW1pdChcImxvYWRlZC1tb2RlbFwiKTtcclxuXHRcdFx0X19sb2FkRG9uZSgpO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHRmdW5jdGlvbiBfX2xvYWREb25lKCkge1xyXG5cdFx0XHRjb25zb2xlLmxvZyhcIl9fbG9hZERvbmVcIiwgISFzZWxmLm1hcG1vZGVsLCAhIXNlbGYudGlsZWRhdGEpO1xyXG5cdFx0XHRpZiAoIXNlbGYubWFwbW9kZWwgfHwgIXNlbGYudGlsZWRhdGEpIHJldHVybjsgLy9kb24ndCBjYWxsIG9uIF9pbml0IGJlZm9yZSBib3RoIGFyZSBsb2FkZWRcclxuXHRcdFx0XHJcblx0XHRcdHNlbGYuX2luaXQoKTtcclxuXHRcdFx0c2VsZi5tYXJrTG9hZEZpbmlzaGVkKFwiTUFQX21hcGRhdGFcIik7XHJcblx0XHR9XHJcblx0fSxcclxuXHRcclxuXHQvKipcclxuXHQgKiBDcmVhdGVzIHRoZSBtYXAgZm9yIGRpc3BsYXkgZnJvbSB0aGUgc3RvcmVkIGRhdGEuXHJcblx0ICovXHJcblx0X2luaXQgOiBmdW5jdGlvbigpe1xyXG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xyXG5cdFx0dGhpcy5zY2VuZSA9IG5ldyBUSFJFRS5TY2VuZSgpO1xyXG5cdFx0dGhpcy5jYW1lcmFzID0ge307XHJcblx0XHRcclxuXHRcdGlmICghd2luZG93LnBsYXllcikge1xyXG5cdFx0XHR3aW5kb3cucGxheWVyID0gbmV3IFBsYXllckNoYXIoKTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0dGhpcy5zY2VuZS5hZGQodGhpcy5tYXBtb2RlbCk7XHJcblx0XHRcclxuXHRcdHRoaXMuY2FtZXJhTG9naWNzID0gW107XHJcblx0XHRtU2V0dXAuc2V0dXBSaWdnaW5nLmNhbGwodGhpcyk7XHJcblx0XHQvLyBNYXAgTW9kZWwgaXMgbm93IHJlYWR5XHJcblx0XHRcclxuXHRcdHRoaXMuX2luaXRFdmVudE1hcCgpO1xyXG5cdFx0XHJcblx0XHR0aGlzLmVtaXQoXCJtYXAtcmVhZHlcIik7XHJcblx0XHRcclxuXHR9LFxyXG5cdFxyXG5cdFxyXG5cdC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cdC8vIFRpbGUgSW5mb3JtYXRpb24gXHJcblx0Ly8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblx0XHJcblx0dGlsZWRhdGEgOiBudWxsLFxyXG5cdFxyXG5cdGdldFRpbGVEYXRhIDogZnVuY3Rpb24oeCwgeSkge1xyXG5cdFx0dmFyIHRpbGUgPSBjb252ZXJ0U2hvcnRUb1RpbGVQcm9wcyh0aGlzLnRpbGVkYXRhLmdldCh4LCB5KSk7XHJcblx0XHRyZXR1cm4gdGlsZTtcclxuXHR9LFxyXG5cdFxyXG5cdGdldExheWVyVHJhbnNpdGlvbiA6IGZ1bmN0aW9uKHgsIHksIGN1cnJMYXllcikge1xyXG5cdFx0Y3VyckxheWVyID0gKGN1cnJMYXllciE9PXVuZGVmaW5lZCk/IGN1cnJMYXllciA6IDE7XHJcblx0XHR2YXIgdGlsZSA9IHRoaXMuZ2V0VGlsZURhdGEoeCwgeSk7XHJcblx0XHR2YXIgbGF5ZXIgPSB0aWxlLnRyYW5zaXRpb247XHJcblx0XHR2YXIgb3JpZ2luMSA9IHRoaXMubWV0YWRhdGEubGF5ZXJzW2N1cnJMYXllci0xXVtcIjJkXCJdO1xyXG5cdFx0dmFyIG9yaWdpbjIgPSB0aGlzLm1ldGFkYXRhLmxheWVyc1tsYXllci0xXVtcIjJkXCJdO1xyXG5cdFx0XHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRsYXllcjogbGF5ZXIsXHJcblx0XHRcdHg6IHggLSBvcmlnaW4xWzBdICsgb3JpZ2luMlswXSxcclxuXHRcdFx0eTogeSAtIG9yaWdpbjFbMV0gKyBvcmlnaW4yWzFdLFxyXG5cdFx0fTtcclxuXHR9LFxyXG5cdFxyXG5cdGdldDNEVGlsZUxvY2F0aW9uIDogZnVuY3Rpb24oeCwgeSwgbGF5ZXIsIHRpbGVkYXRhKSB7XHJcblx0XHRpZiAoeCBpbnN0YW5jZW9mIFRIUkVFLlZlY3RvcjIpIHtcclxuXHRcdFx0eSA9IHgueTsgeCA9IHgueDtcclxuXHRcdH1cclxuXHRcdGlmICh4IGluc3RhbmNlb2YgVEhSRUUuVmVjdG9yMykge1xyXG5cdFx0XHRsYXllciA9IHguejsgeSA9IHgueTsgeCA9IHgueDtcclxuXHRcdH1cclxuXHRcdGxheWVyID0gKGxheWVyIHx8IDEpIC0gMTtcclxuXHRcdGlmICghdGlsZWRhdGEpIHRpbGVkYXRhID0gdGhpcy5nZXRUaWxlRGF0YSh4LCB5KTtcclxuXHRcdFxyXG5cdFx0dmFyIGxheWVyZGF0YSA9IHRoaXMubWV0YWRhdGEubGF5ZXJzW2xheWVyXTtcclxuXHRcdHZhciB6ID0gdGlsZWRhdGEuaGVpZ2h0ICogdGhpcy5tZXRhZGF0YS5oZWlnaHRzdGVwO1xyXG5cdFx0XHJcblx0XHR2YXIgbG9jID0gbmV3IFRIUkVFLlZlY3RvcjMoeCwgeiwgeSk7XHJcblx0XHRsb2MueCAtPSBsYXllcmRhdGFbXCIyZFwiXVswXTtcclxuXHRcdGxvYy56IC09IGxheWVyZGF0YVtcIjJkXCJdWzFdO1xyXG5cdFx0XHJcblx0XHR2YXIgbWF0ID0gbmV3IFRIUkVFLk1hdHJpeDQoKTtcclxuXHRcdG1hdC5zZXQuYXBwbHkobWF0LCBsYXllcmRhdGFbXCIzZFwiXSk7XHJcblx0XHRsb2MuYXBwbHlNYXRyaXg0KG1hdCk7XHJcblx0XHRcclxuXHRcdHJldHVybiBsb2M7XHJcblx0fSxcclxuXHQvKlxyXG5cdGdldEFsbFdhbGthYmxlVGlsZXMgOiBmdW5jdGlvbigpIHtcclxuXHRcdHZhciB0aWxlcyA9IFtdO1xyXG5cdFx0Zm9yICh2YXIgbGkgPSAxOyBsaSA8PSA3OyBsaSsrKSB7XHJcblx0XHRcdGlmICghdGhpcy5tZXRhZGF0YS5sYXllcnNbbGktMV0pIGNvbnRpbnVlO1xyXG5cdFx0XHR0aWxlc1tsaV0gPSBbXTtcclxuXHRcdFx0XHJcblx0XHRcdGZvciAodmFyIHkgPSAwOyB5IDwgdGhpcy5tZXRhZGF0YS5oZWlnaHQ7IHkrKykge1xyXG5cdFx0XHRcdGZvciAodmFyIHggPSAwOyB4IDwgdGhpcy5tZXRhZGF0YS53aWR0aDsgeCsrKSB7XHJcblx0XHRcdFx0XHR2YXIgdGRhdGEgPSB0aGlzLmdldFRpbGVEYXRhKHgsIHkpO1xyXG5cdFx0XHRcdFx0aWYgKCF0ZGF0YS5pc1dhbGthYmxlKSBjb250aW51ZTtcclxuXHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0dGRhdGFbXCIzZGxvY1wiXSA9IHRoaXMuZ2V0M0RUaWxlTG9jYXRpb24oeCwgeSwgbGksIHRkYXRhKTtcclxuXHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0dGlsZXNbbGldLnB1c2godGRhdGEpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIHRpbGVzO1xyXG5cdH0sICovXHJcblx0XHJcblx0Z2V0UmFuZG9tTlBDU3Bhd25Qb2ludCA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0aWYgKCF0aGlzLm1ldGFkYXRhLm5wY3NwYXducykge1xyXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJFdmVudCByZXF1ZXN0ZWQgTlBDIFNwYXduIFBvaW50IG9uIGEgbWFwIHdoZXJlIG5vbmUgYXJlIGRlZmluZWQhXCIpO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHR2YXIgcHRzID0gdGhpcy5tZXRhZGF0YS5ucGNzcGF3bnM7XHJcblx0XHR2YXIgaW5kZXggPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBwdHMubGVuZ3RoKTtcclxuXHRcdHJldHVybiBuZXcgVEhSRUUuVmVjdG9yMyhwdHNbaW5kZXhdWzBdLCBwdHNbaW5kZXhdWzFdLCBwdHNbaW5kZXhdWzJdIHx8IDEpO1xyXG5cdFx0XHJcblx0fSxcclxuXHRcclxuXHQvKipcclxuXHQgKiBjYW5XYWxrQmV0d2VlbjogSWYgaXQgaXMgcG9zc2libGUgdG8gd2FsayBmcm9tIG9uZSB0aWxlIHRvIGFub3RoZXIuIFRoZSB0d29cclxuXHQgKiBcdFx0dGlsZXMgbXVzdCBiZSBhZGphY2VudCwgb3IgZmFsc2UgaXMgaW1tZWRlYXRlbHkgcmV0dXJuZWQuXHJcblx0ICogcmV0dXJuczpcclxuXHQgKiBcdFx0ZmFsc2UgPSBjYW5ub3QsIDEgPSBjYW4sIDIgPSBtdXN0IGp1bXAsIDQgPSBtdXN0IHN3aW0vc3VyZlxyXG5cdCAqL1xyXG5cdGNhbldhbGtCZXR3ZWVuIDogZnVuY3Rpb24oc3JjeCwgc3JjeSwgZGVzdHgsIGRlc3R5LCBpZ25vcmVFdmVudHMpe1xyXG5cdFx0aWYgKE1hdGguYWJzKHNyY3ggLSBkZXN0eCkgKyBNYXRoLmFicyhzcmN5IC0gZGVzdHkpICE9IDEpIHJldHVybiBmYWxzZTtcclxuXHRcdFxyXG5cdFx0Ly8gSWYgd2UncmUgc29tZWhvdyBhbHJlYWR5IG91dHNpZGUgdGhlIG1hcCwgdW5jb25kaXRpb25hbGx5IGFsbG93IHRoZW0gdG8gd2FsayBhcm91bmQgdG8gZ2V0IGJhY2sgaW5cclxuXHRcdGlmIChzcmN4IDwgMCB8fCBzcmN4ID49IHRoaXMubWV0YWRhdGEud2lkdGgpIHJldHVybiB0cnVlO1xyXG5cdFx0aWYgKHNyY3kgPCAwIHx8IHNyY3kgPj0gdGhpcy5tZXRhZGF0YS5oZWlnaHQpIHJldHVybiB0cnVlO1xyXG5cdFx0XHJcblx0XHQvLyBTYW5pdHkgY2hlY2sgZWRnZXMgb2YgdGhlIG1hcFxyXG5cdFx0aWYgKGRlc3R4IDwgMCB8fCBkZXN0eCA+PSB0aGlzLm1ldGFkYXRhLndpZHRoKSByZXR1cm4gZmFsc2U7XHJcblx0XHRpZiAoZGVzdHkgPCAwIHx8IGRlc3R5ID49IHRoaXMubWV0YWRhdGEuaGVpZ2h0KSByZXR1cm4gZmFsc2U7XHJcblx0XHRcclxuXHRcdHZhciBzcmN0aWxlID0gdGhpcy5nZXRUaWxlRGF0YShzcmN4LCBzcmN5KTtcclxuXHRcdHZhciBkZXN0dGlsZSA9IHRoaXMuZ2V0VGlsZURhdGEoZGVzdHgsIGRlc3R5KTtcclxuXHRcdFxyXG5cdFx0aWYgKCFkZXN0dGlsZS5pc1dhbGthYmxlKSByZXR1cm4gZmFsc2U7XHJcblx0XHRcclxuXHRcdGlmICghaWdub3JlRXZlbnRzKSB7IC8vY2hlY2sgZm9yIHRoZSBwcmVzZW5zZSBvZiBldmVudHNcclxuXHRcdFx0dmFyIGV2dHMgPSB0aGlzLmV2ZW50TWFwLmdldChkZXN0eCwgZGVzdHkpO1xyXG5cdFx0XHRpZiAoZXZ0cykge1xyXG5cdFx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgZXZ0cy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRcdFx0aWYgKCFldnRzW2ldLmNhbldhbGtPbigpKSByZXR1cm4gZmFsc2U7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdHZhciBjYW5XYWxrID0gdHJ1ZTsgLy9Bc3N1bWUgd2UgY2FuIHRyYXZlbCBiZXR3ZWVuIHVudGlsIHByb3ZlbiBvdGhlcndpc2UuXHJcblx0XHR2YXIgbXVzdEp1bXAsIG11c3RTd2ltLCBtdXN0VHJhbnNpdGlvbjtcclxuXHRcdFxyXG5cdFx0dmFyIGRpciA9IChmdW5jdGlvbigpe1xyXG5cdFx0XHRzd2l0Y2ggKDEpIHtcclxuXHRcdFx0XHRjYXNlIChzcmN5IC0gZGVzdHkpOiByZXR1cm4gW1widXBcIiwgXCJkb3duXCJdO1xyXG5cdFx0XHRcdGNhc2UgKGRlc3R5IC0gc3JjeSk6IHJldHVybiBbXCJkb3duXCIsIFwidXBcIl07XHJcblx0XHRcdFx0Y2FzZSAoc3JjeCAtIGRlc3R4KTogcmV0dXJuIFtcImxlZnRcIiwgXCJyaWdodFwiXTtcclxuXHRcdFx0XHRjYXNlIChkZXN0eCAtIHNyY3gpOiByZXR1cm4gW1wicmlnaHRcIiwgXCJsZWZ0XCJdO1xyXG5cdFx0XHR9IHJldHVybiBudWxsO1xyXG5cdFx0fSkoKTtcclxuXHRcdFxyXG5cdFx0aWYgKHNyY3RpbGUubW92ZW1lbnRbZGlyWzBdXSkgeyAvL2lmIG1vdmVtZW50ID0gdHJ1ZSwgbWVhbnMgd2UgY2FuJ3Qgd2FsayB0aGVyZVxyXG5cdFx0XHRpZiAoc3JjdGlsZS5pc0xlZGdlKSBcclxuXHRcdFx0XHRtdXN0SnVtcCA9IHRydWU7XHJcblx0XHRcdGVsc2UgY2FuV2FsayA9IGZhbHNlO1xyXG5cdFx0fVxyXG5cdFx0Y2FuV2FsayAmPSAhZGVzdHRpbGUubW92ZW1lbnRbZGlyWzFdXTtcclxuXHRcdFxyXG5cdFx0bXVzdFN3aW0gPSBkZXN0dGlsZS5pc1dhdGVyO1xyXG5cdFx0XHJcblx0XHRtdXN0VHJhbnNpdGlvbiA9ICEhZGVzdHRpbGUudHJhbnNpdGlvbjtcclxuXHRcdFxyXG5cdFx0bXVzdEJlUGxheWVyID0gISFkZXN0dGlsZS5ub05QQztcclxuXHRcdFxyXG5cdFx0aWYgKCFjYW5XYWxrKSByZXR1cm4gZmFsc2U7XHJcblx0XHRyZXR1cm4gKGNhbldhbGs/MHgxOjApIHwgKG11c3RKdW1wPzB4MjowKSB8IChtdXN0U3dpbT8weDQ6MCkgfCAobXVzdFRyYW5zaXRpb24/MHg4OjApIHwgKG11c3RCZVBsYXllcj8weDEwOjApO1xyXG5cdH0sXHJcblx0XHJcblx0XHJcblx0Ly8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblx0Ly8gRXZlbnQgSGFuZGxpbmcgXHJcblx0Ly8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblx0XHJcblx0X2xvY2FsSWQgOiAwLFxyXG5cdGV2ZW50TGlzdCA6IG51bGwsXHJcblx0ZXZlbnRNYXAgOiBudWxsLFxyXG5cdFxyXG5cdF9pbml0RXZlbnRNYXAgOiBmdW5jdGlvbigpIHtcclxuXHRcdHZhciBzZWxmID0gdGhpcztcclxuXHRcdFxyXG5cdFx0dGhpcy5ldmVudExpc3QgPSB7fTtcclxuXHRcdHZhciB3ID0gdGhpcy5tZXRhZGF0YS53aWR0aCwgaCA9IHRoaXMubWV0YWRhdGEuaGVpZ2h0O1xyXG5cdFx0dGhpcy5ldmVudE1hcCA9IG5kYXJyYXkobmV3IEFycmF5KHcqaCksIFt3LCBoXSwgWzEsIHddKTtcclxuXHRcdHRoaXMuZXZlbnRNYXAucHV0ID0gZnVuY3Rpb24oeCwgeSwgdmFsKSB7XHJcblx0XHRcdGlmICghdGhpcy5nZXQoeCwgeSkpIHtcclxuXHRcdFx0XHR0aGlzLnNldCh4LCB5LCBbXSk7XHJcblx0XHRcdH1cclxuXHRcdFx0aWYgKHRoaXMuZ2V0KHgsIHkpLmluZGV4T2YodmFsKSA+PSAwKSByZXR1cm47IC8vZG9uJ3QgZG91YmxlIGFkZFxyXG5cdFx0XHR0aGlzLmdldCh4LCB5KS5wdXNoKHZhbCk7XHJcblx0XHR9O1xyXG5cdFx0dGhpcy5ldmVudE1hcC5yZW1vdmUgPSBmdW5jdGlvbih4LCB5LCB2YWwpIHtcclxuXHRcdFx0aWYgKCF0aGlzLmdldCh4LCB5KSkgcmV0dXJuIG51bGw7XHJcblx0XHRcdHZhciBpID0gdGhpcy5nZXQoeCwgeSkuaW5kZXhPZih2YWwpO1xyXG5cdFx0XHRpZiAoaSA9PSAtMSkgcmV0dXJuIG51bGw7XHJcblx0XHRcdHJldHVybiB0aGlzLmdldCh4LCB5KS5zcGxpY2UoaSwgMSk7XHJcblx0XHR9O1xyXG5cdFx0XHJcblx0XHR0aGlzLnNwcml0ZU5vZGUgPSBuZXcgVEhSRUUuT2JqZWN0M0QoKTtcclxuXHRcdHRoaXMuc3ByaXRlTm9kZS5uYW1lID0gXCJTcHJpdGUgUmlnXCI7XHJcblx0XHR0aGlzLnNwcml0ZU5vZGUucG9zaXRpb24ueSA9IDAuMjE7XHJcblx0XHR0aGlzLnNjZW5lLmFkZCh0aGlzLnNwcml0ZU5vZGUpO1xyXG5cdFx0XHJcblx0XHQvLyBMb2FkIGV2ZW50IGpzIGZpbGVzIG5vdzpcclxuXHRcdGxvYWRTY3JpcHQoXCJsXCIpOyAvLyBMb2FkIGxvY2FsbHkgZGVmaW5lZCBldmVudHNcclxuXHRcdGxvYWRTY3JpcHQoXCJnXCIpOyAvLyBMb2FkIGdsb2JhbGx5IGRlZmluZWQgZXZlbnRzXHJcblx0XHRcclxuXHRcdC8vIEFkZCB0aGUgcGxheWVyIGNoYXJhY3RlciBldmVudFxyXG5cdFx0dGhpcy5faW5pdFBsYXllckNoYXJhY3RlcigpO1xyXG5cdFx0XHJcblx0XHRyZXR1cm47XHJcblx0XHRcclxuXHRcdGZ1bmN0aW9uIGxvYWRTY3JpcHQodCkge1xyXG5cdFx0XHR2YXIgZmlsZSA9IHNlbGYuZmlsZVN5cy5yb290LmdldENoaWxkQnlOYW1lKHQrXCJfZXZ0LmpzXCIpO1xyXG5cdFx0XHRpZiAoIWZpbGUpIHtcclxuXHRcdFx0XHRjb25zb2xlLmVycm9yKFwiRVJST1IgTE9BRElORyBFVkVOVFM6IE5vIFwiK3QrXCJfZXZ0LmpzIGZpbGUgaXMgcHJlc2VudCBpbiB0aGUgbWFwIGJ1bmRsZS5cIik7XHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblx0XHRcdGZpbGUuZ2V0QmxvYihcInRleHQvamF2YXNjcmlwdFwiLCBmdW5jdGlvbihkYXRhKXtcclxuXHRcdFx0XHQvLyBOT1RFOiBXZSBjYW5ub3QgdXNlIEpRdWVyeSgpLmFwcGVuZCgpLCBhcyBpdCBkZWxpYnJhdGVseSBjbGVhbnMgdGhlIHNjcmlwdCB0YWdzXHJcblx0XHRcdFx0Ly8gICBvdXQgb2YgdGhlIGRvbSBlbGVtZW50IHdlJ3JlIGFwcGVuZGluZywgbGl0ZXJhbGx5IGRlZmVhdGluZyB0aGUgcHVycG9zZS5cclxuXHRcdFx0XHQvLyBOT1RFMjogV2UgYXBwZW5kIHRvIHRoZSBET00gaW5zdGVhZCBvZiB1c2luZyBldmFsKCkgb3IgbmV3IEZ1bmN0aW9uKCkgYmVjYXVzZVxyXG5cdFx0XHRcdC8vICAgd2hlbiBhcHBlbmRlZCBsaWtlIHNvLCB0aGUgaW4tYnJvd3NlcmRlYnVnZ2VyIHNob3VsZCBiZSBhYmxlIHRvIGZpbmQgaXQgYW5kXHJcblx0XHRcdFx0Ly8gICBicmVha3BvaW50IGluIGl0LlxyXG5cdFx0XHRcdHZhciBzY3JpcHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic2NyaXB0XCIpO1xyXG5cdFx0XHRcdHNjcmlwdC50eXBlID0gXCJ0ZXh0L2phdmFzY3JpcHRcIjtcclxuXHRcdFx0XHRzY3JpcHQuc3JjID0gVVJMLmNyZWF0ZU9iamVjdFVSTChkYXRhKTtcclxuXHRcdFx0XHRkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHNjcmlwdCk7XHJcblx0XHRcdFx0c2VsZlt0K1wiU2NyaXB0VGFnXCJdID0gc2NyaXB0O1xyXG5cdFx0XHRcdC8vIFVwb24gYmVpbmcgYWRkZWQgdG8gdGhlIGJvZHksIGl0IGlzIGV2YWx1YXRlZFxyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdEdDLmNvbGxlY3Qoc2NyaXB0LCBHQ19CSU4pO1xyXG5cdFx0XHRcdEdDLmNvbGxlY3RVUkwoc2NyaXB0LnNyYywgR0NfQklOKTtcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblx0XHRcclxuXHR9LFxyXG5cdFxyXG5cdGFkZEV2ZW50IDogZnVuY3Rpb24oZXZ0KSB7XHJcblx0XHRpZiAoIWV2dCkgcmV0dXJuO1xyXG5cdFx0aWYgKCEoZXZ0IGluc3RhbmNlb2YgRXZlbnQpKSBcclxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiQXR0ZW1wdGVkIHRvIGFkZCBhbiBvYmplY3QgdGhhdCB3YXNuJ3QgYW4gRXZlbnQhIFwiICsgZXZ0KTtcclxuXHRcdFxyXG5cdFx0aWYgKCFldnQuc2hvdWxkQXBwZWFyKCkpIHJldHVybjtcclxuXHRcdGlmICghZXZ0LmlkKVxyXG5cdFx0XHRldnQuaWQgPSBcIkxvY2FsRXZlbnRfXCIgKyAoKyt0aGlzLl9sb2NhbElkKTtcclxuXHRcdFxyXG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xyXG5cdFx0Ly9ub3cgYWRkaW5nIGV2ZW50IHRvIG1hcFxyXG5cdFx0dGhpcy5ldmVudExpc3RbZXZ0LmlkXSA9IGV2dDtcclxuXHRcdGlmIChldnQubG9jYXRpb24pIHtcclxuXHRcdFx0dGhpcy5ldmVudE1hcC5wdXQoZXZ0LmxvY2F0aW9uLngsIGV2dC5sb2NhdGlvbi55LCBldnQpO1xyXG5cdFx0fSBlbHNlIGlmIChldnQubG9jYXRpb25zKSB7XHJcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgZXZ0LmxvY2F0aW9ucy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRcdHZhciBsb2MgPSBldnQubG9jYXRpb25zW2ldO1xyXG5cdFx0XHRcdHRoaXMuZXZlbnRNYXAucHV0KGxvYy54LCBsb2MueSwgZXZ0KTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHQvL3JlZ2lzdGVyaW5nIGxpc3RlbmVycyBvbiB0aGUgZXZlbnRcclxuXHRcdGV2dC5vbihcIm1vdmluZ1wiLCBmdW5jdGlvbihzcmNYLCBzcmNZLCBkZXN0WCwgZGVzdFkpe1xyXG5cdFx0XHQvL1N0YXJ0ZWQgbW92aW5nIHRvIGEgbmV3IHRpbGVcclxuXHRcdFx0c2VsZi5ldmVudE1hcC5wdXQoZGVzdFgsIGRlc3RZLCB0aGlzKTtcclxuXHRcdFx0c2VsZi5ldmVudE1hcC5yZW1vdmUoc3JjWCwgc3JjWSwgdGhpcyk7XHJcblx0XHRcdFxyXG5cdFx0XHR2YXIgZGlyID0gbmV3IFRIUkVFLlZlY3RvcjMoc3JjWC1kZXN0WCwgMCwgZGVzdFktc3JjWSk7XHJcblx0XHRcdHZhciBsc3QgPSBzZWxmLmV2ZW50TWFwLmdldChkZXN0WCwgZGVzdFkpO1xyXG5cdFx0XHRpZiAobHN0KSB7XHJcblx0XHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBsc3QubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0XHRcdGlmICghbHN0W2ldIHx8IGxzdFtpXSA9PSB0aGlzKSBjb250aW51ZTtcclxuXHRcdFx0XHRcdC8vIGNvbnNvbGUubG9nKFwiZW50ZXJpbmctdGlsZVwiLCBkaXIsIGRlc3RYLCBkZXN0WSk7XHJcblx0XHRcdFx0XHRsc3RbaV0uZW1pdChcImVudGVyaW5nLXRpbGVcIiwgZGlyKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdFx0Ly8gZGlyLnNldChzcmNYLWRlc3RYLCAwLCBkZXN0WS1zcmNZKS5uZWdhdGUoKTtcclxuXHRcdFx0bHN0ID0gc2VsZi5ldmVudE1hcC5nZXQoc3JjWCwgc3JjWSk7XHJcblx0XHRcdGlmIChsc3QpIHtcclxuXHRcdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGxzdC5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRcdFx0aWYgKCFsc3RbaV0gfHwgbHN0W2ldID09IHRoaXMpIGNvbnRpbnVlO1xyXG5cdFx0XHRcdFx0Ly8gY29uc29sZS5sb2coXCJsZWF2aW5nLXRpbGVcIiwgZGlyLCBzcmNYLCBzcmNZKTtcclxuXHRcdFx0XHRcdGxzdFtpXS5lbWl0KFwibGVhdmluZy10aWxlXCIsIGRpcik7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHRcdGV2dC5vbihcIm1vdmVkXCIsIGZ1bmN0aW9uKHNyY1gsIHNyY1ksIGRlc3RYLCBkZXN0WSl7XHJcblx0XHRcdC8vRmluaXNoZWQgbW92aW5nIGZyb20gdGhlIG9sZCB0aWxlXHJcblx0XHRcdFxyXG5cdFx0XHR2YXIgZGlyID0gbmV3IFRIUkVFLlZlY3RvcjMoc3JjWC1kZXN0WCwgMCwgZGVzdFktc3JjWSk7XHJcblx0XHRcdHZhciBsc3QgPSBzZWxmLmV2ZW50TWFwLmdldChkZXN0WCwgZGVzdFkpO1xyXG5cdFx0XHRpZiAobHN0KSB7XHJcblx0XHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBsc3QubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0XHRcdGlmICghbHN0W2ldIHx8IGxzdFtpXSA9PSB0aGlzKSBjb250aW51ZTtcclxuXHRcdFx0XHRcdC8vIGNvbnNvbGUubG9nKFwiZW50ZXJlZC10aWxlXCIsIGRpciwgZGVzdFgsIGRlc3RZKTtcclxuXHRcdFx0XHRcdGxzdFtpXS5lbWl0KFwiZW50ZXJlZC10aWxlXCIsIGRpcik7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHRcdC8vIGRpci5zZXQoc3JjWC1kZXN0WCwgMCwgZGVzdFktc3JjWSkubmVnYXRlKCk7XHJcblx0XHRcdGxzdCA9IHNlbGYuZXZlbnRNYXAuZ2V0KHNyY1gsIHNyY1kpO1xyXG5cdFx0XHRpZiAobHN0KSB7XHJcblx0XHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBsc3QubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0XHRcdGlmICghbHN0W2ldIHx8IGxzdFtpXSA9PSB0aGlzKSBjb250aW51ZTtcclxuXHRcdFx0XHRcdC8vIGNvbnNvbGUubG9nKFwibGVmdC10aWxlXCIsIGRpciwgc3JjWCwgc3JjWSk7XHJcblx0XHRcdFx0XHRsc3RbaV0uZW1pdChcImxlZnQtdGlsZVwiLCBkaXIpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblx0XHRcclxuXHRcdHZhciBhdmF0YXIgPSBldnQuZ2V0QXZhdGFyKHRoaXMpO1xyXG5cdFx0aWYgKGF2YXRhcikge1xyXG5cdFx0XHR2YXIgbG9jID0gZXZ0LmxvY2F0aW9uO1xyXG5cdFx0XHR2YXIgbG9jMyA9IHRoaXMuZ2V0M0RUaWxlTG9jYXRpb24obG9jLngsIGxvYy55LCBsb2Mueik7XHJcblx0XHRcdGF2YXRhci5wb3NpdGlvbi5zZXQobG9jMyk7XHJcblx0XHRcdGF2YXRhci51cGRhdGVNYXRyaXgoKTtcclxuXHRcdFx0XHJcblx0XHRcdHRoaXMuc3ByaXRlTm9kZS5hZGQoYXZhdGFyKTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0ZXZ0LmVtaXQoXCJjcmVhdGVkXCIpO1xyXG5cdH0sXHJcblx0XHJcblx0bG9hZFNwcml0ZSA6IGZ1bmN0aW9uKGV2dGlkLCBmaWxlbmFtZSwgY2FsbGJhY2spIHtcclxuXHRcdHZhciBzZWxmID0gdGhpcztcclxuXHRcdHRoaXMubWFya0xvYWRpbmcoXCJTUFJJVEVfXCIrZXZ0aWQpO1xyXG5cdFx0dHJ5IHtcclxuXHRcdFx0dmFyIGRpciA9IHRoaXMuZmlsZVN5cy5yb290LmdldENoaWxkQnlOYW1lKGV2dGlkKTtcclxuXHRcdFx0aWYgKCFkaXIpIHtcclxuXHRcdFx0XHRjYWxsYmFjaygoXCJObyBzdWJmb2xkZXIgZm9yIGV2ZW50IGlkICdcIitldnRpZCtcIichXCIpKTtcclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHRcdFx0XHJcblx0XHRcdHZhciBmaWxlID0gZGlyLmdldENoaWxkQnlOYW1lKGZpbGVuYW1lKTtcclxuXHRcdFx0aWYgKCFmaWxlKSB7XHJcblx0XHRcdFx0Y2FsbGJhY2soKFwiTm8gYXNzZXQgd2l0aCBuYW1lICdcIitmaWxlbmFtZStcIicgZm9yIGV2ZW50IGlkICdcIitldnRpZCtcIichXCIpKTtcclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHRcdFx0XHJcblx0XHRcdGZpbGUuZ2V0QmxvYihcImltYWdlL3BuZ1wiLCBmdW5jdGlvbihkYXRhKXtcclxuXHRcdFx0XHR2YXIgdXJsID0gVVJMLmNyZWF0ZU9iamVjdFVSTChkYXRhKTtcclxuXHRcdFx0XHRHQy5jb2xsZWN0VVJMKHVybCwgR0NfQklOKTtcclxuXHRcdFx0XHRjYWxsYmFjayhudWxsLCB1cmwpO1xyXG5cdFx0XHRcdHNlbGYubWFya0xvYWRGaW5pc2hlZChcIlNQUklURV9cIitldnRpZCk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSBjYXRjaCAoZSkge1xyXG5cdFx0XHRjYWxsYmFjayhlKTtcclxuXHRcdH1cclxuXHR9LFxyXG5cdFxyXG5cdF9pbml0UGxheWVyQ2hhcmFjdGVyIDogZnVuY3Rpb24oKSB7XHJcblx0XHRpZiAoIXdpbmRvdy5wbGF5ZXIpIHtcclxuXHRcdFx0d2luZG93LnBsYXllciA9IG5ldyBQbGF5ZXJDaGFyKCk7XHJcblx0XHR9XHJcblx0XHR2YXIgd2FycCA9IGdhbWVTdGF0ZS5tYXBUcmFuc2l0aW9uLndhcnAgfHwgMDtcclxuXHRcdHdhcnAgPSB0aGlzLm1ldGFkYXRhLndhcnBzW3dhcnBdO1xyXG5cdFx0aWYgKCF3YXJwKSB7XHJcblx0XHRcdGNvbnNvbGUud2FybihcIlJlcXVlc3RlZCB3YXJwIGxvY2F0aW9uIGRvZXNuJ3QgZXhpc3Q6XCIsIHdpbmRvdy50cmFuc2l0aW9uX3dhcnB0byk7XHJcblx0XHRcdHdhcnAgPSB0aGlzLm1ldGFkYXRhLndhcnBzWzBdO1xyXG5cdFx0fVxyXG5cdFx0aWYgKCF3YXJwKSB0aHJvdyBuZXcgRXJyb3IoXCJUaGlzIG1hcCBoYXMgbm8gd2FycHMhIVwiKTtcclxuXHRcdFxyXG5cdFx0cGxheWVyLnJlc2V0KCk7XHJcblx0XHRwbGF5ZXIud2FycFRvKHdhcnApO1xyXG5cdFx0XHJcblx0XHR0aGlzLmFkZEV2ZW50KHBsYXllcik7XHJcblx0XHRcclxuXHR9LFxyXG5cdFxyXG5cdGRpc3BhdGNoIDogZnVuY3Rpb24oeCwgeSkge1xyXG5cdFx0dmFyIGV2dHMgPSB0aGlzLmV2ZW50TWFwLmdldCh4LCB5KTtcclxuXHRcdGlmICghZXZ0cykgcmV0dXJuO1xyXG5cdFx0XHJcblx0XHR2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMik7XHJcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGV2dHMubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0ZXZ0c1tpXS5lbWl0LmFwcGx5KGV2dHNbaV0sIGFyZ3MpO1xyXG5cdFx0fVxyXG5cdH0sXHJcblx0XHJcblx0XHJcblx0XHJcblx0Ly8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblx0Ly9cclxuXHQvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHRfbWFwUnVuU3RhdGUgOiBudWxsLFxyXG5cdFxyXG5cdF9pbml0TWFwUnVuU3RhdGUgOiBmdW5jdGlvbigpIHtcclxuXHRcdGlmICghdGhpcy5fbWFwUnVuU3RhdGUpIHtcclxuXHRcdFx0dGhpcy5fbWFwUnVuU3RhdGUgPSB7XHJcblx0XHRcdFx0bG9hZFRvdGFsIDogMCxcclxuXHRcdFx0XHRsb2FkUHJvZ3Jlc3MgOiAwLFxyXG5cdFx0XHRcdGxvYWRpbmdBc3NldHMgOiB7fSxcclxuXHRcdFx0XHRcclxuXHRcdFx0XHRpc1N0YXJ0ZWQgOiBmYWxzZSxcclxuXHRcdFx0XHRzdGFydFF1ZXVlIDogW10sXHJcblx0XHRcdFx0XHJcblx0XHRcdFx0ZW5kUXVldWUgOiBbXSxcclxuXHRcdFx0fTtcclxuXHRcdH1cclxuXHRcdHJldHVybiB0aGlzLl9tYXBSdW5TdGF0ZTtcclxuXHR9LFxyXG5cdFxyXG5cdG1hcmtMb2FkaW5nIDogZnVuY3Rpb24oYXNzZXRJZCkge1xyXG5cdFx0dmFyIHN0YXRlID0gdGhpcy5faW5pdE1hcFJ1blN0YXRlKCk7XHJcblx0XHRzdGF0ZS5sb2FkVG90YWwrKztcclxuXHRcdGlmIChhc3NldElkKSB7XHJcblx0XHRcdGlmICghc3RhdGUubG9hZGluZ0Fzc2V0c1thc3NldElkXSlcclxuXHRcdFx0XHRzdGF0ZS5sb2FkaW5nQXNzZXRzW2Fzc2V0SWRdID0gMDtcclxuXHRcdFx0c3RhdGUubG9hZGluZ0Fzc2V0c1thc3NldElkXSsrO1xyXG5cdFx0fVxyXG5cdH0sXHJcblx0bWFya0xvYWRGaW5pc2hlZCA6IGZ1bmN0aW9uKGFzc2V0SWQpIHtcclxuXHRcdHZhciBzdGF0ZSA9IHRoaXMuX2luaXRNYXBSdW5TdGF0ZSgpO1xyXG5cdFx0c3RhdGUubG9hZFByb2dyZXNzKys7XHJcblx0XHRpZiAoYXNzZXRJZCkge1xyXG5cdFx0XHRpZiAoIXN0YXRlLmxvYWRpbmdBc3NldHNbYXNzZXRJZF0pXHJcblx0XHRcdFx0c3RhdGUubG9hZGluZ0Fzc2V0c1thc3NldElkXSA9IDA7XHJcblx0XHRcdHN0YXRlLmxvYWRpbmdBc3NldHNbYXNzZXRJZF0tLTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0Ly9UT0RPIGJlZ2luIG1hcCBzdGFydFxyXG5cdFx0aWYgKHN0YXRlLmxvYWRQcm9ncmVzcyA+PSBzdGF0ZS5sb2FkVG90YWwpIHtcclxuXHRcdFx0Y29uc29sZS53YXJuKFwiU1RBUlQgTUFQXCIpO1xyXG5cdFx0XHR0aGlzLl9leGVjdXRlTWFwU3RhcnRDYWxsYmFja3MoKTtcclxuXHRcdH1cclxuXHR9LFxyXG5cdFxyXG5cdHF1ZXVlRm9yTWFwU3RhcnQgOiBmdW5jdGlvbihjYWxsYmFjaykge1xyXG5cdFx0dmFyIHN0YXRlID0gdGhpcy5faW5pdE1hcFJ1blN0YXRlKCk7XHJcblx0XHRcclxuXHRcdGlmICghc3RhdGUuaXNTdGFydGVkKSB7XHJcblx0XHRcdHN0YXRlLnN0YXJ0UXVldWUucHVzaChjYWxsYmFjayk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRjYWxsYmFjaygpO1xyXG5cdFx0fVxyXG5cdH0sXHJcblx0XHJcblx0X2V4ZWN1dGVNYXBTdGFydENhbGxiYWNrcyA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0dmFyIHN0YXRlID0gdGhpcy5faW5pdE1hcFJ1blN0YXRlKCk7XHJcblx0XHRcclxuXHRcdHZhciBjYWxsYmFjaztcclxuXHRcdHdoaWxlIChjYWxsYmFjayA9IHN0YXRlLnN0YXJ0UXVldWUuc2hpZnQoKSkge1xyXG5cdFx0XHRjYWxsYmFjaygpO1xyXG5cdFx0fVxyXG5cdFx0c3RhdGUuaXNTdGFydGVkID0gdHJ1ZTtcclxuXHR9LFxyXG5cdFxyXG5cdF9leGVjdXRlTWFwRW5kQ2FsbGJhY2tzIDogZnVuY3Rpb24oKSB7XHJcblx0XHR2YXIgc3RhdGUgPSB0aGlzLl9pbml0TWFwUnVuU3RhdGUoKTtcclxuXHRcdFxyXG5cdFx0dmFyIGNhbGxiYWNrO1xyXG5cdFx0d2hpbGUgKGNhbGxiYWNrID0gc3RhdGUuZW5kUXVldWUuc2hpZnQoKSkge1xyXG5cdFx0XHRjYWxsYmFjaygpO1xyXG5cdFx0fVxyXG5cdFx0Ly8gc3RhdGUuaXNTdGFydGVkID0gdHJ1ZTtcclxuXHR9LFxyXG5cdFxyXG5cdFxyXG5cdFxyXG5cdFxyXG5cdFxyXG5cdFxyXG5cdC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHQvLyBMb2dpYyBMb29wIGFuZCBNYXAgQmVoYXZpb3JzXHJcblx0Y2FtZXJhTG9naWNzOiBudWxsLFxyXG5cdFxyXG5cdGxvZ2ljTG9vcCA6IGZ1bmN0aW9uKGRlbHRhKXtcclxuXHRcdGlmICh0aGlzLmV2ZW50TGlzdCkge1xyXG5cdFx0XHRmb3IgKHZhciBuYW1lIGluIHRoaXMuZXZlbnRMaXN0KSB7XHJcblx0XHRcdFx0dmFyIGV2dCA9IHRoaXMuZXZlbnRMaXN0W25hbWVdO1xyXG5cdFx0XHRcdGlmICghZXZ0KSBjb250aW51ZTtcclxuXHRcdFx0XHRcclxuXHRcdFx0XHRldnQuZW1pdChcInRpY2tcIiwgZGVsdGEpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdGlmICh0aGlzLmNhbWVyYUxvZ2ljcykge1xyXG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuY2FtZXJhTG9naWNzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdFx0dGhpcy5jYW1lcmFMb2dpY3NbaV0uY2FsbCh0aGlzLCBkZWx0YSk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9LFxyXG59KTtcclxubW9kdWxlLmV4cG9ydHMgPSBNYXA7XHJcblxyXG5cclxuZnVuY3Rpb24gX190ZXN0X19vdXRwdXRUcmVlKG9iaiwgaW5kZW50KSB7XHJcblx0aW5kZW50ID0gKGluZGVudCA9PT0gdW5kZWZpbmVkKT8gMCA6IGluZGVudDtcclxuXHRcclxuXHR2YXIgb3V0ID0gXCJbXCIrb2JqLnR5cGUrXCI6IFwiO1xyXG5cdG91dCArPSAoKCFvYmoubmFtZSk/XCI8VW5uYW1lZD5cIjpvYmoubmFtZSk7XHJcblx0b3V0ICs9IFwiIF1cIjtcclxuXHRcclxuXHRzd2l0Y2ggKG9iai50eXBlKSB7XHJcblx0XHRjYXNlIFwiTWVzaFwiOlxyXG5cdFx0XHRvdXQgKz0gXCIgKHZlcnRzPVwiK29iai5nZW9tZXRyeS52ZXJ0aWNlcy5sZW5ndGg7XHJcblx0XHRcdG91dCArPSBcIiBmYWNlcz1cIitvYmouZ2VvbWV0cnkuZmFjZXMubGVuZ3RoO1xyXG5cdFx0XHRvdXQgKz0gXCIgbWF0PVwiK29iai5tYXRlcmlhbC5uYW1lO1xyXG5cdFx0XHRvdXQgKz0gXCIpXCI7XHJcblx0XHRcdGJyZWFrO1xyXG5cdH1cclxuXHRcclxuXHRmb3IgKHZhciBpID0gMDsgaSA8IGluZGVudDsgaSsrKSB7XHJcblx0XHRvdXQgPSBcInwgXCIgKyBvdXQ7XHJcblx0fVxyXG5cdGNvbnNvbGUubG9nKG91dCk7XHJcblx0XHJcblx0Zm9yICh2YXIgaSA9IDA7IGkgPCBvYmouY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcclxuXHRcdF9fdGVzdF9fb3V0cHV0VHJlZShvYmouY2hpbGRyZW5baV0sIGluZGVudCsxKTtcclxuXHR9XHJcbn1cclxuXHJcblxyXG4iLCIvLyBtYXAtc2V0dXAuanNcclxuLy8gRGVmaW5lcyBzb21lIG9mIHRoZSBzZXR1cCBmdW5jdGlvbnMgZm9yIE1hcC5qcyBpbiBhIHNlcGFyYXRlIGZpbGUsIGZvciBvcmdhbml6YXRpb25cclxuXHJcbnZhciBleHRlbmQgPSByZXF1aXJlKFwiZXh0ZW5kXCIpO1xyXG5cclxudmFyIG1TZXR1cCA9IFxyXG5tb2R1bGUuZXhwb3J0cyA9IHtcclxuXHRcclxuXHRzZXR1cFJpZ2dpbmcgOiBmdW5jdGlvbigpIHtcclxuXHRcdC8vIFNldHVwIExpZ2h0aW5nIFJpZ2dpbmdcclxuXHRcdHtcclxuXHRcdFx0dmFyIGxpZ2h0ZGVmID0gZXh0ZW5kKHsgXCJkZWZhdWx0XCI6IHRydWUgfSwgdGhpcy5tZXRhZGF0YS5saWdodGluZyk7XHJcblx0XHRcdFxyXG5cdFx0XHR2YXIgbGlnaHRzZXR1cCA9IG1TZXR1cC5saWdodGluZ1t0aGlzLm1ldGFkYXRhLmRvbWFpbl07XHJcblx0XHRcdGlmICghbGlnaHRzZXR1cCkgdGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCBNYXAgRG9tYWluIVwiLCB0aGlzLm1ldGFkYXRhLmRvbWFpbik7XHJcblx0XHRcdFxyXG5cdFx0XHR2YXIgbCA9IGxpZ2h0c2V0dXAuY2FsbCh0aGlzLCBsaWdodGRlZik7XHJcblx0XHRcdHRoaXMuc2NlbmUuYWRkKGwpO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHQvLyBTZXR1cCBDYW1lcmEgUmlnZ2luZ1xyXG5cdFx0e1x0Ly8gRm9yIGNhbWVyYSB0eXBlcywgc2VlIHRoZSBDYW1lcmEgdHlwZXMgd2lraSBwYWdlXHJcblx0XHRcdHZhciBjYW1kZWYgPSB0aGlzLm1ldGFkYXRhLmNhbWVyYTtcclxuXHRcdFx0XHJcblx0XHRcdGlmICghY2FtZGVmKSB7IHRocm93IG5ldyBFcnJvcihcIk1hcCBjb250YWlucyBubyBzZXR1cCBmb3IgZG9tYWluIVwiKTsgfVxyXG5cdFx0XHRcclxuXHRcdFx0dmFyIGNhbWZuID0gbVNldHVwLmNhbWVyYVtjYW1kZWYudHlwZV07XHJcblx0XHRcdGlmICghY2FtZm4pIHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgQ2FtZXJhIFR5cGUhXCIsIGNhbWRlZi50eXBlKTtcclxuXHRcdFx0XHJcblx0XHRcdHZhciBjID0gY2FtZm4uY2FsbCh0aGlzLCBjYW1kZWYpO1xyXG5cdFx0XHR0aGlzLnNjZW5lLmFkZChjKTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdH0sXHJcblx0XHJcblx0Y2FtZXJhIDoge1xyXG5cdFx0b3J0aG8gOiBmdW5jdGlvbihjYW1kZWYpIHtcclxuXHRcdFx0dmFyIHNjcldpZHRoID0gJChcIiNnYW1lc2NyZWVuXCIpLndpZHRoKCk7XHJcblx0XHRcdHZhciBzY3JIZWlnaHQgPSAkKFwiI2dhbWVzY3JlZW5cIikuaGVpZ2h0KCk7XHJcblx0XHRcdFxyXG5cdFx0XHR2YXIgbm9kZSA9IG5ldyBUSFJFRS5PYmplY3QzRCgpO1xyXG5cdFx0XHRub2RlLm5hbWUgPSBcIk90aHJvZ3JhcGhpYyBDYW1lcmEgUmlnXCI7XHJcblx0XHRcdFxyXG5cdFx0XHR0aGlzLmNhbWVyYSA9IG5ldyBUSFJFRS5PcnRob2dyYXBoaWNDYW1lcmEoc2NyV2lkdGgvLTIsIHNjcldpZHRoLzIsIHNjckhlaWdodC8yLCBzY3JIZWlnaHQvLTIsIDEsIDEwMDApO1xyXG5cdFx0XHR0aGlzLmNhbWVyYS5wb3NpdGlvbi55ID0gMTAwO1xyXG5cdFx0XHR0aGlzLmNhbWVyYS5yb2F0aW9uLnggPSAtTWF0aC5QSSAvIDI7XHJcblx0XHRcdG5vZGUuYWRkKHRoaXMuY2FtZXJhKTtcclxuXHRcdFx0XHJcblx0XHRcdHJldHVybiBub2RlO1xyXG5cdFx0fSxcclxuXHRcdFxyXG5cdFx0Z2VuNCA6IGZ1bmN0aW9uKGNhbWRlZikge1xyXG5cdFx0XHR2YXIgc2NyV2lkdGggPSAkKFwiI2dhbWVzY3JlZW5cIikud2lkdGgoKTtcclxuXHRcdFx0dmFyIHNjckhlaWdodCA9ICQoXCIjZ2FtZXNjcmVlblwiKS5oZWlnaHQoKTtcclxuXHRcdFx0XHJcblx0XHRcdHZhciBub2RlID0gbmV3IFRIUkVFLk9iamVjdDNEKCk7XHJcblx0XHRcdG5vZGUubmFtZSA9IFwiR2VuIDQgQ2FtZXJhIFJpZ1wiO1xyXG5cdFx0XHRcclxuXHRcdFx0dmFyIGNhbWxpc3QgPSBjYW1kZWZbXCJjYW1lcmFzXCJdO1xyXG5cdFx0XHRpZiAoIWNhbWxpc3QpIHRocm93IG5ldyBFcnJvcihcIk5vIGNhbWVyYXMgZGVmaW5lZCFcIik7XHJcblx0XHRcdGZvciAodmFyIGNuYW1lIGluIGNhbWxpc3QpIHtcclxuXHRcdFx0XHR2YXIgYyA9IG5ldyBUSFJFRS5QZXJzcGVjdGl2ZUNhbWVyYSg1NSwgc2NyV2lkdGggLyBzY3JIZWlnaHQsIDEsIDEwMDApO1xyXG5cdFx0XHRcdGMubmFtZSA9IFwiQ2FtZXJhIFtcIitjbmFtZStcIl1cIjtcclxuXHRcdFx0XHRjLm15X2NhbWVyYSA9IGM7XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0dmFyIGNyb290O1xyXG5cdFx0XHRcdGlmICghY2FtbGlzdFtjbmFtZV0uZml4ZWRDYW1lcmEpIHtcclxuXHRcdFx0XHRcdGNyb290ID0gbmV3IFRIUkVFLk9iamVjdDNEKCk7XHJcblx0XHRcdFx0XHRjcm9vdC5hZGQoYyk7XHJcblx0XHRcdFx0XHRjcm9vdC5teV9jYW1lcmEgPSBjO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRcclxuXHRcdFx0XHR2YXIgY3AgPSBjYW1saXN0W2NuYW1lXS5wb3NpdGlvbiB8fCBbMCwgNS40NSwgNS4zXTtcclxuXHRcdFx0XHRjLnBvc2l0aW9uLnNldChjcFswXSwgY3BbMV0sIGNwWzJdKTtcclxuXHRcdFx0XHRjLmxvb2tBdChuZXcgVEhSRUUuVmVjdG9yMygwLCAwLjgsIDApKTtcclxuXHRcdFx0XHRcclxuXHRcdFx0XHR2YXIgY2IgPSBjYW1saXN0W2NuYW1lXS5iZWhhdmlvciB8fCBcImZvbGxvd1BsYXllclwiO1xyXG5cdFx0XHRcdHZhciBjYiA9IG1TZXR1cC5jYW1CZWhhdmlvcnNbY2JdLmNhbGwodGhpcywgY2FtbGlzdFtjbmFtZV0sIGMsIGNyb290KTtcclxuXHRcdFx0XHRpZiAoY2IpIHtcclxuXHRcdFx0XHRcdHRoaXMuY2FtZXJhTG9naWNzLnB1c2goY2IpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRcclxuXHRcdFx0XHRub2RlLmFkZChjcm9vdCB8fCBjKTtcclxuXHRcdFx0XHR0aGlzLmNhbWVyYXNbY25hbWVdID0gYztcclxuXHRcdFx0XHRpZiAoY25hbWUgPT0gMCkgdGhpcy5jYW1lcmEgPSBjO1xyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHQvLyB0aGlzLmNhbWVyYSA9IG5ldyBUSFJFRS5QZXJzcGVjdGl2ZUNhbWVyYSg3NSwgc2NyV2lkdGggLyBzY3JIZWlnaHQsIDEsIDEwMDApO1xyXG5cdFx0XHQvLyB0aGlzLmNhbWVyYS5wb3NpdGlvbi55ID0gNTtcclxuXHRcdFx0Ly8gdGhpcy5jYW1lcmEucG9zaXRpb24ueiA9IDU7XHJcblx0XHRcdC8vIHRoaXMuY2FtZXJhLnJvdGF0aW9uLnggPSAtNTUgKiAoTWF0aC5QSSAvIDE4MCk7XHJcblx0XHRcdC8vVE9ETyBzZXQgdXAgYSBjYW1lcmEgZm9yIGVhY2ggbGF5ZXJcclxuXHRcdFx0Ly8gbm9kZS5hZGQodGhpcy5jYW1lcmEpO1xyXG5cdFx0XHRcclxuXHRcdFx0cmV0dXJuIG5vZGU7XHJcblx0XHR9LFxyXG5cdFx0XHJcblx0XHRnZW41IDogZnVuY3Rpb24oY2FtZGVmKSB7XHJcblx0XHRcdHZhciBzY3JXaWR0aCA9ICQoXCIjZ2FtZXNjcmVlblwiKS53aWR0aCgpO1xyXG5cdFx0XHR2YXIgc2NySGVpZ2h0ID0gJChcIiNnYW1lc2NyZWVuXCIpLmhlaWdodCgpO1xyXG5cdFx0XHRcclxuXHRcdFx0dmFyIG5vZGUgPSBuZXcgVEhSRUUuT2JqZWN0M0QoKTtcclxuXHRcdFx0bm9kZS5uYW1lID0gXCJHZW4gNSBDYW1lcmEgUmlnXCI7XHJcblx0XHRcdFxyXG5cdFx0XHR0aGlzLmNhbWVyYSA9IG5ldyBUSFJFRS5QZXJzcGVjdGl2ZUNhbWVyYSg3NSwgc2NyV2lkdGggLyBzY3JIZWlnaHQsIDEsIDEwMDApO1xyXG5cdFx0XHQvL3BhcnNlIHVwIHRoZSBnZW4gNSBjYW1lcmEgZGVmaW5pdGlvbnNcclxuXHRcdFx0bm9kZS5hZGQodGhpcy5jYW1lcmEpO1xyXG5cdFx0XHRcclxuXHRcdFx0cmV0dXJuIG5vZGU7XHJcblx0XHR9LFxyXG5cdH0sXHJcblx0XHJcblx0Y2FtQmVoYXZpb3JzIDoge1xyXG5cdFx0Zm9sbG93UGxheWVyIDogZnVuY3Rpb24oY2RlZiwgY2FtLCBjYW1Sb290KSB7XHJcblx0XHRcdHJldHVybiBmdW5jdGlvbihkZWx0YSkge1xyXG5cdFx0XHRcdGNhbVJvb3QucG9zaXRpb24uc2V0KHBsYXllci5hdmF0YXJfbm9kZS5wb3NpdGlvbik7XHJcblx0XHRcdFx0Ly9UT0RPIG5lZ2F0ZSBtb3ZpbmcgdXAgYW5kIGRvd24gd2l0aCBqdW1waW5nXHJcblx0XHRcdH1cclxuXHRcdH0sXHJcblx0fSxcclxuXHRcclxuXHRsaWdodGluZyA6IHtcclxuXHRcdGludGVyaW9yIDogZnVuY3Rpb24obGlnaHRkZWYpIHtcclxuXHRcdFx0dmFyIG5vZGUgPSBuZXcgVEhSRUUuT2JqZWN0M0QoKTtcclxuXHRcdFx0bm9kZS5uYW1lID0gXCJJbnRlcmlvciBMaWdodGluZyBSaWdcIjtcclxuXHRcdFx0XHJcblx0XHRcdHZhciBsaWdodDtcclxuXHRcdFx0XHJcblx0XHRcdGxpZ2h0ID0gbmV3IFRIUkVFLkRpcmVjdGlvbmFsTGlnaHQoKTtcclxuXHRcdFx0bGlnaHQucG9zaXRpb24uc2V0KDAsIDc1LCAxKTtcclxuXHRcdFx0bGlnaHQuY2FzdFNoYWRvdyA9IHRydWU7XHJcblx0XHRcdGxpZ2h0Lm9ubHlTaGFkb3cgPSB0cnVlO1xyXG5cdFx0XHRsaWdodC5zaGFkb3dEYXJrbmVzcyA9IDAuNztcclxuXHRcdFx0bGlnaHQuc2hhZG93QmlhcyA9IDAuMDAxO1xyXG5cdFx0XHRcclxuXHRcdFx0dmFyIHNobSA9IGxpZ2h0ZGVmLnNoYWRvd21hcCB8fCB7fTtcclxuXHRcdFx0bGlnaHQuc2hhZG93Q2FtZXJhTmVhciA9IHNobS5uZWFyIHx8IDE7XHJcblx0XHRcdGxpZ2h0LnNoYWRvd0NhbWVyYUZhciA9IHNobS5mYXIgfHwgMjAwO1xyXG5cdFx0XHRsaWdodC5zaGFkb3dDYW1lcmFUb3AgPSBzaG0udG9wIHx8IDMwO1xyXG5cdFx0XHRsaWdodC5zaGFkb3dDYW1lcmFCb3R0b20gPSBzaG0uYm90dG9tIHx8IC0zMDtcclxuXHRcdFx0bGlnaHQuc2hhZG93Q2FtZXJhTGVmdCA9IHNobS5sZWZ0IHx8IC0zMDtcclxuXHRcdFx0bGlnaHQuc2hhZG93Q2FtZXJhUmlnaHQgPSBzaG0ucmlnaHQgfHwgMzA7XHJcblx0XHRcdFxyXG5cdFx0XHRsaWdodC5zaGFkb3dNYXBXaWR0aCA9IHNobS53aWR0aCB8fCA1MTI7XHJcblx0XHRcdGxpZ2h0LnNoYWRvd01hcEhlaWdodCA9IHNobS5oZWlnaHQgfHwgNTEyO1xyXG5cdFx0XHRcclxuXHRcdFx0Ly8gbGlnaHQuc2hhZG93Q2FtZXJhVmlzaWJsZSA9IHRydWU7XHJcblx0XHRcdG5vZGUuYWRkKGxpZ2h0KTtcclxuXHRcdFx0XHJcblx0XHRcdERFQlVHLl9zaGFkb3dDYW1lcmEgPSBsaWdodDtcclxuXHRcdFx0XHJcblx0XHRcdHZhciBPUklHSU4gPSBuZXcgVEhSRUUuVmVjdG9yMygwLCAwLCAwKTtcclxuXHRcdFx0XHJcblx0XHRcdGxpZ2h0ID0gbmV3IFRIUkVFLkRpcmVjdGlvbmFsTGlnaHQoMHhmZmZmZmYsIDAuOSk7XHJcblx0XHRcdGxpZ2h0LnBvc2l0aW9uLnNldCg0LCA0LCA0KTtcclxuXHRcdFx0bGlnaHQubG9va0F0KE9SSUdJTik7XHJcblx0XHRcdG5vZGUuYWRkKGxpZ2h0KTtcclxuXHRcdFx0XHJcblx0XHRcdGxpZ2h0ID0gbmV3IFRIUkVFLkRpcmVjdGlvbmFsTGlnaHQoMHhmZmZmZmYsIDAuOSk7XHJcblx0XHRcdGxpZ2h0LnBvc2l0aW9uLnNldCgtNCwgNCwgNCk7XHJcblx0XHRcdGxpZ2h0Lmxvb2tBdChPUklHSU4pO1xyXG5cdFx0XHRub2RlLmFkZChsaWdodCk7XHJcblx0XHRcdFxyXG5cdFx0XHRyZXR1cm4gbm9kZTtcclxuXHRcdFx0Ly90aGlzLnNjZW5lLmFkZChub2RlKTtcclxuXHRcdH0sXHJcblx0XHRcclxuXHRcdGV4dGVyaW9yIDogZnVuY3Rpb24obGlnaHRkZWYpIHtcclxuXHRcdFx0dmFyIG5vZGUgPSBuZXcgVEhSRUUuT2JqZWN0M0QoKTtcclxuXHRcdFx0bm9kZS5uYW1lID0gXCJFeHRlcmlvciBMaWdodGluZyBSaWdcIjtcclxuXHRcdFx0XHJcblx0XHRcdHZhciBsaWdodDtcclxuXHRcdFx0XHJcblx0XHRcdGxpZ2h0ID0gbmV3IFRIUkVFLkRpcmVjdGlvbmFsTGlnaHQoKTtcclxuXHRcdFx0bGlnaHQucG9zaXRpb24uc2V0KC0xMCwgNzUsIC0zMCk7XHJcblx0XHRcdGxpZ2h0LmNhc3RTaGFkb3cgPSB0cnVlO1xyXG5cdFx0XHQvLyBsaWdodC5vbmx5U2hhZG93ID0gdHJ1ZTtcclxuXHRcdFx0bGlnaHQuc2hhZG93RGFya25lc3MgPSAwLjc7XHJcblx0XHRcdGxpZ2h0LnNoYWRvd0JpYXMgPSAwLjAwMTtcclxuXHRcdFx0XHJcblx0XHRcdHZhciBzaG0gPSBsaWdodGRlZi5zaGFkb3dtYXAgfHwge307XHJcblx0XHRcdGxpZ2h0LnNoYWRvd0NhbWVyYU5lYXIgPSBzaG0ubmVhciB8fCAxO1xyXG5cdFx0XHRsaWdodC5zaGFkb3dDYW1lcmFGYXIgPSBzaG0uZmFyIHx8IDIwMDtcclxuXHRcdFx0bGlnaHQuc2hhZG93Q2FtZXJhVG9wID0gc2htLnRvcCB8fCAzMDtcclxuXHRcdFx0bGlnaHQuc2hhZG93Q2FtZXJhQm90dG9tID0gc2htLmJvdHRvbSB8fCAtMzA7XHJcblx0XHRcdGxpZ2h0LnNoYWRvd0NhbWVyYUxlZnQgPSBzaG0ubGVmdCB8fCAtMzA7XHJcblx0XHRcdGxpZ2h0LnNoYWRvd0NhbWVyYVJpZ2h0ID0gc2htLnJpZ2h0IHx8IDMwO1xyXG5cdFx0XHRcclxuXHRcdFx0bGlnaHQuc2hhZG93TWFwV2lkdGggPSBzaG0ud2lkdGggfHwgNTEyO1xyXG5cdFx0XHRsaWdodC5zaGFkb3dNYXBIZWlnaHQgPSBzaG0uaGVpZ2h0IHx8IDUxMjtcclxuXHRcdFx0XHJcblx0XHRcdC8vIGxpZ2h0LnNoYWRvd0NhbWVyYVZpc2libGUgPSB0cnVlO1xyXG5cdFx0XHRub2RlLmFkZChsaWdodCk7XHJcblx0XHRcdFxyXG5cdFx0XHRERUJVRy5fc2hhZG93Q2FtZXJhID0gbGlnaHQ7XHJcblx0XHRcdFxyXG5cdFx0XHRyZXR1cm4gbm9kZTtcclxuXHRcdH0sXHJcblx0XHRcclxuXHRcdGhlbGwgOiBmdW5jdGlvbihsaWdodGRlZikge1xyXG5cdFx0XHQvL1RPRE8gRG9ycml0byBEdW5nZW9uXHJcblx0XHR9LFxyXG5cdH0sXHJcblx0XHJcblx0Z2V0RG9yaXRvRHVuZ2VvbiA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0dmFyIG5vZGUgPSBuZXcgVEhSRUUuT2JqZWN0M0QoKTtcclxuXHRcdFxyXG5cdFx0Ly9UT0RPIHNldCB0aGlzLm1ldGFkYXRhXHJcblx0XHQvL1RPRE8gc2V0IHRoaXMubWFwbW9kZWxcclxuXHR9LFxyXG5cdFxyXG59IiwiLy8gbXRsLWxvYWRlci5qc1xyXG4vLyBBIFRIUkVFLmpzIHdhdmVmcm9udCBNYXRlcmlhbCBMaWJyYXJ5IGxvYWRlclxyXG4vLyBDb3BpZWQgbW9zdGx5IHdob2xlc2FsZSBmcm9tIHRoZSB0aHJlZS5qcyBleGFtcGxlcyBmb2xkZXIuXHJcbi8vIE9yaWdpbmFsIGF1dGhvcnM6IG1yZG9vYiwgYW5nZWx4dWFuY2hhbmdcclxuXHJcbnZhciBtb21lbnQgPSByZXF1aXJlKFwibW9tZW50XCIpO1xyXG52YXIgaW5oZXJpdHMgPSByZXF1aXJlKFwiaW5oZXJpdHNcIik7XHJcbnZhciBleHRlbmQgPSByZXF1aXJlKFwiZXh0ZW5kXCIpO1xyXG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZShcImV2ZW50c1wiKS5FdmVudEVtaXR0ZXI7XHJcblxyXG5cclxuZnVuY3Rpb24gTXRsTG9hZGVyKG10bGZpbGUsIGxvYWRUZXh0dXJlLCBvcHRzKSB7XHJcblx0RXZlbnRFbWl0dGVyLmNhbGwodGhpcyk7XHJcblx0ZXh0ZW5kKHRoaXMsIG9wdHMpO1xyXG5cdFxyXG5cdHRoaXMubXRsZmlsZSA9IG10bGZpbGU7XHJcblx0dGhpcy5sb2FkVGV4dHVyZSA9IGxvYWRUZXh0dXJlO1xyXG5cdFxyXG5cdHRoaXMuZ2MgPSBvcHRzLmdjO1xyXG59XHJcbmluaGVyaXRzKE10bExvYWRlciwgRXZlbnRFbWl0dGVyKTtcclxuZXh0ZW5kKE10bExvYWRlci5wcm90b3R5cGUsIHtcclxuXHRsb2FkVGV4dHVyZSA6IG51bGwsXHJcblx0bXRsZmlsZSA6IG51bGwsXHJcblx0XHJcblx0bG9hZDogZnVuY3Rpb24oKSB7XHJcblx0XHRpZiAoIXRoaXMubXRsZmlsZSkgdGhyb3cgbmV3IEVycm9yKFwiTm8gTVRMIGZpbGUgZ2l2ZW4hXCIpO1xyXG5cdFx0aWYgKCF0aGlzLmxvYWRUZXh0dXJlKSB0aHJvdyBuZXcgRXJyb3IoXCJObyBsb2FkVGV4dHVyZSBmdW5jdGlvbiBnaXZlbiFcIik7XHJcblx0XHRcclxuXHRcdHZhciBzY29wZSA9IHRoaXM7XHJcblx0XHR2YXIgcGFyc2VkID0gc2NvcGUucGFyc2UodGhpcy5tdGxmaWxlKTtcclxuXHRcdHRoaXMuZW1pdChcImxvYWRcIiwgcGFyc2VkKTtcclxuXHR9LFxyXG5cdFxyXG5cdHBhcnNlIDogZnVuY3Rpb24odGV4dCkge1xyXG5cdFx0dmFyIGxpbmVzID0gdGV4dC5zcGxpdCggXCJcXG5cIiApO1xyXG5cdFx0dmFyIGluZm8gPSB7fTtcclxuXHRcdHZhciBkZWxpbWl0ZXJfcGF0dGVybiA9IC9cXHMrLztcclxuXHRcdHZhciBtYXRlcmlhbHNJbmZvID0ge307XHJcblx0XHRcclxuXHRcdHRyeSB7XHJcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgbGluZXMubGVuZ3RoOyBpICsrKSB7XHJcblx0XHRcdFx0dmFyIGxpbmUgPSBsaW5lc1tpXTtcclxuXHRcdFx0XHRsaW5lID0gbGluZS50cmltKCk7XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0aWYgKGxpbmUubGVuZ3RoID09PSAwIHx8IGxpbmUuY2hhckF0KCAwICkgPT09ICcjJykgY29udGludWU7IC8vaWdub3JlIGJsYW5rIGxpbmVzIGFuZCBjb21tZW50c1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdC8vIEZpbmQgd2hlcmUgdGhlIGZpcnN0IHNwYWNlIGlzIGluIGEgbGluZSBhbmQgc3BsaXQgb2ZmIGtleSBhbmQgdmFsdWUgYmFzZWQgb24gdGhhdFxyXG5cdFx0XHRcdHZhciBwb3MgPSBsaW5lLmluZGV4T2YoJyAnKTtcclxuXHRcdFx0XHRcclxuXHRcdFx0XHR2YXIga2V5ID0gKHBvcyA+PSAwKSA/IGxpbmUuc3Vic3RyaW5nKDAsIHBvcykgOiBsaW5lO1xyXG5cdFx0XHRcdGtleSA9IGtleS50b0xvd2VyQ2FzZSgpO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdHZhciB2YWx1ZSA9IChwb3MgPj0gMCkgPyBsaW5lLnN1YnN0cmluZyhwb3MgKyAxKSA6IFwiXCI7XHJcblx0XHRcdFx0dmFsdWUgPSB2YWx1ZS50cmltKCk7XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0aWYgKGtleSA9PT0gXCJuZXdtdGxcIikgeyAvLyBOZXcgbWF0ZXJpYWwgZGVmaW5pdGlvblxyXG5cdFx0XHRcdFx0aW5mbyA9IHsgbmFtZTogdmFsdWUgfTtcclxuXHRcdFx0XHRcdG1hdGVyaWFsc0luZm9bIHZhbHVlIF0gPSBpbmZvO1xyXG5cdFx0XHRcdFx0XHJcblx0XHRcdFx0fSBlbHNlIGlmICggaW5mbyApIHsgLy8gSWYgd2UgYXJlIHdvcmtpbmcgd2l0aCBhIG1hdGVyaWFsXHJcblx0XHRcdFx0XHRpZiAoa2V5ID09PSBcImthXCIgfHwga2V5ID09PSBcImtkXCIgfHwga2V5ID09PSBcImtzXCIpIHtcclxuXHRcdFx0XHRcdFx0dmFyIHNzID0gdmFsdWUuc3BsaXQoZGVsaW1pdGVyX3BhdHRlcm4sIDMpO1xyXG5cdFx0XHRcdFx0XHRpbmZvW2tleV0gPSBbcGFyc2VGbG9hdChzc1swXSksIHBhcnNlRmxvYXQoc3NbMV0pLCBwYXJzZUZsb2F0KHNzWzJdKV07XHJcblx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRpbmZvW2tleV0gPSB2YWx1ZTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdFx0Ly8gT25jZSB3ZSd2ZSBwYXJzZWQgb3V0IGFsbCB0aGUgbWF0ZXJpYWxzLCBsb2FkIHRoZW0gaW50byBhIFwiY3JlYXRvclwiXHJcblx0XHRcdFxyXG5cdFx0XHR2YXIgbWF0Q3JlYXRvciA9IG5ldyBNYXRlcmlhbENyZWF0b3IodGhpcy5sb2FkVGV4dHVyZSwgdGhpcy5nYyk7XHJcblx0XHRcdG1hdENyZWF0b3Iuc2V0TWF0ZXJpYWxzKG1hdGVyaWFsc0luZm8pO1xyXG5cdFx0XHRyZXR1cm4gbWF0Q3JlYXRvcjtcclxuXHRcdH0gY2F0Y2ggKGUpIHtcclxuXHRcdFx0dGhpcy5lbWl0KFwiZXJyb3JcIiwgZSk7XHJcblx0XHR9XHJcblx0fSxcclxuXHRcclxufSk7XHJcblxyXG4vKlxyXG5mdW5jdGlvbiBlbnN1cmVQb3dlck9mVHdvXyAoIGltYWdlICkge1xyXG5cdGlmICggISBUSFJFRS5NYXRoLmlzUG93ZXJPZlR3byggaW1hZ2Uud2lkdGggKSB8fCAhIFRIUkVFLk1hdGguaXNQb3dlck9mVHdvKCBpbWFnZS5oZWlnaHQgKSApIHtcclxuXHRcdHZhciBjYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCBcImNhbnZhc1wiICk7XHJcblx0XHRjYW52YXMud2lkdGggPSBuZXh0SGlnaGVzdFBvd2VyT2ZUd29fKCBpbWFnZS53aWR0aCApO1xyXG5cdFx0Y2FudmFzLmhlaWdodCA9IG5leHRIaWdoZXN0UG93ZXJPZlR3b18oIGltYWdlLmhlaWdodCApO1xyXG5cdFx0XHJcblx0XHR2YXIgY3R4ID0gY2FudmFzLmdldENvbnRleHQoXCIyZFwiKTtcclxuXHRcdGN0eC5kcmF3SW1hZ2UoIGltYWdlLCAwLCAwLCBpbWFnZS53aWR0aCwgaW1hZ2UuaGVpZ2h0LCAwLCAwLCBjYW52YXMud2lkdGgsIGNhbnZhcy5oZWlnaHQgKTtcclxuXHRcdHJldHVybiBjYW52YXM7XHJcblx0fVxyXG5cdFxyXG5cdHJldHVybiBpbWFnZTtcclxufVxyXG4qL1xyXG5mdW5jdGlvbiBuZXh0SGlnaGVzdFBvd2VyT2ZUd29fKCB4ICkge1xyXG5cdC0teDtcclxuXHRmb3IgKCB2YXIgaSA9IDE7IGkgPCAzMjsgaSA8PD0gMSApIHtcclxuXHRcdHggPSB4IHwgeCA+PiBpO1xyXG5cdH1cclxuXHRyZXR1cm4geCArIDE7XHJcbn1cclxuXHJcblxyXG4vLyBUaGUgb3JpZ2luYWwgdmVyc2lvbiBjYW1lIHdpdGggc2V2ZXJhbCBvcHRpb25zLCB3aGljaCB3ZSBjYW4gc2ltcGx5IGFzc3VtZSB3aWxsIGJlIHRoZSBkZWZhdWx0c1xyXG4vL1x0XHRzaWRlOiBBbHdheXMgYXBwbHkgdG8gVEhSRUUuRnJvbnRTaWRlXHJcbi8vXHRcdHdyYXA6IFRoaXMgd2lsbCBhY3R1YWxseSBiZSBzcGVjaWZpZWQgSU4gdGhlIE1UTCwgYmVjYXVzZSBpdCBoYXMgdGhhdCBzdXBwb3J0XHJcbi8vXHRcdG5vcm1hbGl6ZVJHQjogZmFsc2UgLSBhc3N1bWVkXHJcbi8vXHRcdGlnbm9yZVplcm9SR0I6IGZhbHNlIFxyXG4vL1x0XHRpbnZlcnRUcmFuc3BhcmVuY3k6IGZhbHNlIC0gZCA9IDEgaXMgb3BhcXVlXHJcbmZ1bmN0aW9uIE1hdGVyaWFsQ3JlYXRvcihsb2FkVGV4dHVyZSwgZ2MpIHtcclxuXHR0aGlzLmxvYWRUZXh0dXJlID0gbG9hZFRleHR1cmU7XHJcblx0dGhpcy5nYyA9IGdjO1xyXG59XHJcbk1hdGVyaWFsQ3JlYXRvci5wcm90b3R5cGUgPSB7XHJcblx0c2V0TWF0ZXJpYWxzIDogZnVuY3Rpb24obWF0SW5mbykge1xyXG5cdFx0dGhpcy5tYXRlcmlhbHNJbmZvID0gbWF0SW5mbztcclxuXHRcdHRoaXMubWF0ZXJpYWxzID0ge307XHJcblx0XHR0aGlzLm1hdGVyaWFsc0FycmF5ID0gW107XHJcblx0XHR0aGlzLm5hbWVMb29rdXAgPSB7fTtcclxuXHR9LFxyXG5cdFxyXG5cdHByZWxvYWQgOiBmdW5jdGlvbigpIHtcclxuXHRcdGZvciAodmFyIG1uIGluIHRoaXMubWF0ZXJpYWxzSW5mbykge1xyXG5cdFx0XHR0aGlzLmNyZWF0ZShtbik7XHJcblx0XHR9XHJcblx0fSxcclxuXHRcclxuXHRnZXRJbmRleCA6IGZ1bmN0aW9uKG1hdE5hbWUpIHtcclxuXHRcdHJldHVybiB0aGlzLm5hbWVMb29rdXBbbWF0TmFtZV07XHJcblx0fSxcclxuXHRcclxuXHRnZXRBc0FycmF5IDogZnVuY3Rpb24oKSB7XHJcblx0XHR2YXIgaW5kZXggPSAwO1xyXG5cdFx0Zm9yICh2YXIgbW4gaW4gdGhpcy5tYXRlcmlhbHNJbmZvKSB7XHJcblx0XHRcdHRoaXMubWF0ZXJpYWxzQXJyYXlbaW5kZXhdID0gdGhpcy5jcmVhdGUobW4pO1xyXG5cdFx0XHR0aGlzLm5hbWVMb29rdXBbbW5dID0gaW5kZXg7XHJcblx0XHRcdGluZGV4Kys7XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gdGhpcy5tYXRlcmlhbHNBcnJheTtcclxuXHR9LFxyXG5cdFxyXG5cdGNyZWF0ZSA6IGZ1bmN0aW9uIChtYXROYW1lKSB7XHJcblx0XHRpZiAodGhpcy5tYXRlcmlhbHNbbWF0TmFtZV0gPT09IHVuZGVmaW5lZCkge1xyXG5cdFx0XHR0aGlzLmNyZWF0ZU1hdGVyaWFsXyhtYXROYW1lKTtcclxuXHRcdH1cclxuXHRcdHJldHVybiB0aGlzLm1hdGVyaWFsc1ttYXROYW1lXTtcclxuXHR9LFxyXG5cdFxyXG5cdGNyZWF0ZU1hdGVyaWFsXyA6IGZ1bmN0aW9uKG1hdE5hbWUpIHtcclxuXHRcdHZhciBzY29wZSA9IHRoaXM7XHJcblx0XHR2YXIgbWF0ID0gdGhpcy5tYXRlcmlhbHNJbmZvW21hdE5hbWVdO1xyXG5cdFx0dmFyIHBhcmFtcyA9IHtcclxuXHRcdFx0bmFtZTogbWF0TmFtZSxcclxuXHRcdFx0c2lkZTogVEhSRUUuRnJvbnRTaWRlLFxyXG5cdFx0fTtcclxuXHRcdFxyXG5cdFx0Zm9yICh2YXIgcHJvcCBpbiBtYXQpIHtcclxuXHRcdFx0dmFyIHZhbHVlID0gbWF0W3Byb3BdO1xyXG5cdFx0XHRzd2l0Y2ggKHByb3AudG9Mb3dlckNhc2UoKSkge1xyXG5cdFx0XHRcdGNhc2UgXCJrZFwiOiAvLyBEaWZmdXNlIGNvbG9yXHJcblx0XHRcdFx0XHRwYXJhbXNbJ2RpZmZ1c2UnXSA9IG5ldyBUSFJFRS5Db2xvcigpLmZyb21BcnJheSh2YWx1ZSk7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcclxuXHRcdFx0XHRjYXNlIFwia2FcIjogLy8gQW1iaWVudCBjb2xvclxyXG5cdFx0XHRcdFx0cGFyYW1zWydhbWJpZW50J10gPSBuZXcgVEhSRUUuQ29sb3IoKS5mcm9tQXJyYXkodmFsdWUpO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0Y2FzZSBcImtzXCI6IC8vIFNwZWN1bGFyIGNvbG9yXHJcblx0XHRcdFx0XHRwYXJhbXNbJ3NwZWN1bGFyJ10gPSBuZXcgVEhSRUUuQ29sb3IoKS5mcm9tQXJyYXkodmFsdWUpO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0Y2FzZSBcImtlXCI6IC8vIEVtaXNzaW9uIChub24tc3RhbmRhcmQpXHJcblx0XHRcdFx0XHRwYXJhbXNbJ2VtaXNzaXZlJ10gPSBuZXcgVEhSRUUuQ29sb3IodmFsdWUsIHZhbHVlLCB2YWx1ZSk7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcclxuXHRcdFx0XHRjYXNlIFwibWFwX2tkXCI6IC8vIERpZmZ1c2UgdGV4dHVyZSBtYXBcclxuXHRcdFx0XHRcdHZhciBhcmdzID0gX19zcGxpdFRleEFyZyh2YWx1ZSk7XHJcblx0XHRcdFx0XHR2YXIgbWFwID0gX190ZXh0dXJlTWFwKGFyZ3MpO1xyXG5cdFx0XHRcdFx0aWYgKG1hcCkgcGFyYW1zWydtYXAnXSA9IG1hcDtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0XHJcblx0XHRcdFx0Y2FzZSBcIm1hcF9rYVwiOiAvLyBBbWJpZW50IHRleHR1cmUgbWFwXHJcblx0XHRcdFx0XHR2YXIgYXJncyA9IF9fc3BsaXRUZXhBcmcodmFsdWUpO1xyXG5cdFx0XHRcdFx0dmFyIG1hcCA9IF9fdGV4dHVyZU1hcChhcmdzKTtcclxuXHRcdFx0XHRcdGlmIChtYXApIHBhcmFtc1snbGlnaHRNYXAnXSA9IG1hcDtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdGNhc2UgXCJtYXBfa3NcIjogLy8gU3BlY3VsYXIgbWFwXHJcblx0XHRcdFx0XHR2YXIgYXJncyA9IF9fc3BsaXRUZXhBcmcodmFsdWUpO1xyXG5cdFx0XHRcdFx0dmFyIG1hcCA9IF9fdGV4dHVyZU1hcChhcmdzKTtcclxuXHRcdFx0XHRcdGlmIChtYXApIHBhcmFtc1snc3BlY3VsYXJNYXAnXSA9IG1hcDtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdGNhc2UgXCJtYXBfZFwiOiAvLyBBbHBoYSB0ZXh0dXJlIG1hcFxyXG5cdFx0XHRcdFx0dmFyIGFyZ3MgPSBfX3NwbGl0VGV4QXJnKHZhbHVlKTtcclxuXHRcdFx0XHRcdHZhciBtYXAgPSBfX3RleHR1cmVNYXAoYXJncyk7XHJcblx0XHRcdFx0XHRpZiAobWFwKSBwYXJhbXNbJ2FscGhhTWFwJ10gPSBtYXA7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcclxuXHRcdFx0XHRjYXNlIFwiYnVtcFwiOlxyXG5cdFx0XHRcdGNhc2UgXCJtYXBfYnVtcFwiOiAvLyBCdW1wIG1hcFxyXG5cdFx0XHRcdFx0dmFyIGFyZ3MgPSBfX3NwbGl0VGV4QXJnKHZhbHVlKTtcclxuXHRcdFx0XHRcdHZhciBtYXAgPSBfX3RleHR1cmVNYXAoYXJncyk7XHJcblx0XHRcdFx0XHRpZiAobWFwKSBwYXJhbXNbJ2J1bXBNYXAnXSA9IG1hcDtcclxuXHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0aWYgKGFyZ3MuYm0pIHBhcmFtc1snYnVtcFNjYWxlJ10gPSBhcmdzLmJtO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0Y2FzZSBcIm5zXCI6IC8vIFNwZWN1bGFyIGV4cG9uZW50XHJcblx0XHRcdFx0XHRwYXJhbXNbJ3NoaW5pbmVzcyddID0gdmFsdWU7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcclxuXHRcdFx0XHRjYXNlIFwiZFwiOiAvLyBUcmFuc3BhcmVuY3lcclxuXHRcdFx0XHRcdGlmICh2YWx1ZSA8IDEpIHtcclxuXHRcdFx0XHRcdFx0cGFyYW1zWyd0cmFuc3BhcmVudCddID0gdHJ1ZTtcclxuXHRcdFx0XHRcdFx0cGFyYW1zWydvcGFjaXR5J10gPSB2YWx1ZTtcclxuXHRcdFx0XHRcdFx0cGFyYW1zWydhbHBoYVRlc3QnXSA9IDAuMDU7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcdFxyXG5cdFx0XHRcdGRlZmF1bHQ6XHJcblx0XHRcdFx0XHRjb25zb2xlLmxvZyhcIlVuaGFuZGxlZCBNVEwgZGF0YTpcIiwgcHJvcCwgXCI9XCIsIHZhbHVlKTtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdC8vIFdIQVQ/IT8hIE5PISEhISEhXHJcblx0XHQvLyBpZiAoIHBhcmFtc1sgJ2RpZmZ1c2UnIF0gKSB7XHJcblx0XHQvLyBcdGlmICggIXBhcmFtc1sgJ2FtYmllbnQnIF0pIHBhcmFtc1sgJ2FtYmllbnQnIF0gPSBwYXJhbXNbICdkaWZmdXNlJyBdO1xyXG5cdFx0Ly8gXHRwYXJhbXNbICdjb2xvcicgXSA9IHBhcmFtc1sgJ2RpZmZ1c2UnIF07XHJcblx0XHQvLyB9XHJcblx0XHRcclxuXHRcdHRoaXMubWF0ZXJpYWxzWyBtYXROYW1lIF0gPSBuZXcgVEhSRUUuTWVzaFBob25nTWF0ZXJpYWwoIHBhcmFtcyApO1xyXG5cdFx0c2NvcGUuZ2MuY29sbGVjdCggdGhpcy5tYXRlcmlhbHNbbWF0TmFtZV0gKTtcclxuXHRcdHJldHVybiB0aGlzLm1hdGVyaWFsc1sgbWF0TmFtZSBdO1xyXG5cdFx0XHJcblx0XHRcclxuXHRcdGZ1bmN0aW9uIF9fdGV4dHVyZU1hcChhcmdzKSB7XHJcblx0XHRcdGlmIChhcmdzLnRpbWVBcHBsaWNhYmxlKSB7XHJcblx0XHRcdFx0dmFyIG5vdyA9IG1vbWVudCgpO1xyXG5cdFx0XHRcdGlmIChtb21lbnQuaXNCZWZvcmUoYXJncy50aW1lQXBwbGljYWJsZVswXSkgfHwgbW9tZW50LmlzQWZ0ZXIoYXJncy50aW1lQXBwbGljYWJsZVsxXSkpIHtcclxuXHRcdFx0XHRcdHJldHVybiBudWxsOyAvL0lnbm9yZSB0aGlzIG1hcCwgaWYgdGltZSBpcyBub3QgYXBwbGljYWJsZSB0byBpdFxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0Ly9UT0RPIGhhbmRsZSBjdWJtYXBzISBuZXcgVEhSRUUuVGV4dHVyZShbc2V0IG9mIDYgaW1hZ2VzXSk7XHJcblx0XHRcdFxyXG5cdFx0XHQvL1RPRE8gbG9vayBpbnRvIGh0dHA6Ly90aHJlZWpzLm9yZy9kb2NzLyNSZWZlcmVuY2UvVGV4dHVyZXMvQ29tcHJlc3NlZFRleHR1cmVcclxuXHRcdFx0Ly8gVXNpbmcgXCIuZGRzXCIgZm9ybWF0P1xyXG5cdFx0XHRcclxuXHRcdFx0dmFyIGltYWdlID0gbmV3IEltYWdlKCk7XHJcblx0XHRcdGltYWdlLnNyYyA9IERFRl9URVhUVVJFO1xyXG5cdFx0XHR2YXIgdGV4dHVyZSA9IG5ldyBUSFJFRS5UZXh0dXJlKGltYWdlKTtcclxuXHRcdFx0c2NvcGUuZ2MuY29sbGVjdCh0ZXh0dXJlKTtcclxuXHRcdFx0XHJcblx0XHRcdGN1cnJlbnRNYXAubWFya0xvYWRpbmcoXCJNVExfXCIrYXJncy5zcmMpO1xyXG5cdFx0XHRzY29wZS5sb2FkVGV4dHVyZShhcmdzLnNyYywgZnVuY3Rpb24odXJsKXtcclxuXHRcdFx0XHQvLyBFdmVuIHRob3VnaCB0aGUgaW1hZ2VzIGFyZSBpbiBtZW1vcnksIGFwcGFyZW50bHkgdGhleSBzdGlsbCBhcmVuJ3QgXCJsb2FkZWRcIlxyXG5cdFx0XHRcdC8vIGF0IHRoZSBwb2ludCB3aGVuIHRoZXkgYXJlIGFzc2lnbmVkIHRvIHRoZSBzcmMgYXR0cmlidXRlLlxyXG5cdFx0XHRcdGltYWdlLm9uKFwibG9hZFwiLCBmdW5jdGlvbigpe1xyXG5cdFx0XHRcdFx0dGV4dHVyZS5uZWVkc1VwZGF0ZSA9IHRydWU7XHJcblx0XHRcdFx0XHRjdXJyZW50TWFwLm1hcmtMb2FkRmluaXNoZWQoXCJNVExfXCIrYXJncy5zcmMpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHRcdGltYWdlLnNyYyA9IHVybDtcclxuXHRcdFx0XHQvLyBpbWFnZSA9IGVuc3VyZVBvd2VyT2ZUd29fKCBpbWFnZSApO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdHRleHR1cmUuaW1hZ2UgPSBpbWFnZTtcclxuXHRcdFx0XHR0ZXh0dXJlLm5lZWRzVXBkYXRlID0gdHJ1ZTtcclxuXHRcdFx0XHRcclxuXHRcdFx0fSk7XHJcblx0XHRcdFxyXG5cdFx0XHRpZiAoIWFyZ3MuY2xhbXApIHsgLy91bmRlZmluZWQgb3IgZmFsc2VcclxuXHRcdFx0XHR0ZXh0dXJlLndyYXBTID0gVEhSRUUuUmVwZWF0V3JhcHBpbmc7XHJcblx0XHRcdFx0dGV4dHVyZS53cmFwVCA9IFRIUkVFLlJlcGVhdFdyYXBwaW5nO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdHRleHR1cmUud3JhcFMgPSBUSFJFRS5DbGFtcFRvRWRnZVdyYXBwaW5nO1xyXG5cdFx0XHRcdHRleHR1cmUud3JhcFQgPSBUSFJFRS5DbGFtcFRvRWRnZVdyYXBwaW5nO1xyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHRpZiAoYXJnc1snb191J10gfHwgYXJnc1snb192J10pIHtcclxuXHRcdFx0XHR0ZXh0dXJlLm9mZnNldCA9IG5ldyBWZWN0b3IyKGFyZ3NbJ29fdSddIHx8IDAsIGFyZ3NbJ29fdiddIHx8IDApO1xyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHQvLyB0ZXh0dXJlLmFuaXNvdHJvcHkgPSAxNjtcclxuXHRcdFx0XHJcblx0XHRcdHJldHVybiB0ZXh0dXJlO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHRmdW5jdGlvbiBfX3NwbGl0VGV4QXJnKGFyZykge1xyXG5cdFx0XHR2YXIgY29tcHMgPSBhcmcuc3BsaXQoXCIgXCIpO1xyXG5cdFx0XHR2YXIgdGV4RGVmID0ge307XHJcblx0XHRcdC8vIGh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvV2F2ZWZyb250Xy5vYmpfZmlsZSNUZXh0dXJlX29wdGlvbnNcclxuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBjb21wcy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRcdHN3aXRjaCAoY29tcHNbaV0pIHtcclxuXHRcdFx0XHRcdGNhc2UgXCItYmxlbmR1XCI6IFxyXG5cdFx0XHRcdFx0XHR0ZXhEZWZbXCJibGVuZHVcIl0gPSAoY29tcHNbaSsxXSAhPSBcIm9mZlwiKTtcclxuXHRcdFx0XHRcdFx0aSArPSAxOyBicmVhazsgLy9jb25zdW1lIHRoZSBhcmd1bWVudFxyXG5cdFx0XHRcdFx0Y2FzZSBcIi1ibGVuZHZcIjpcclxuXHRcdFx0XHRcdFx0dGV4RGVmW1wiYmxlbmR2XCJdID0gKGNvbXBzW2krMV0gIT0gXCJvZmZcIik7XHJcblx0XHRcdFx0XHRcdGkgKz0gMTsgYnJlYWs7XHJcblx0XHRcdFx0XHRjYXNlIFwiLWJvb3N0XCI6XHJcblx0XHRcdFx0XHRcdHRleERlZltcImJvb3N0XCJdID0gcGFyc2VGbG9hdChjb21wc1tpKzFdKTtcclxuXHRcdFx0XHRcdFx0aSArPSAxOyBicmVhaztcclxuXHRcdFx0XHRcdGNhc2UgXCItbW1cIjpcclxuXHRcdFx0XHRcdFx0dGV4RGVmW1wibW1fYmFzZVwiXSA9IHBhcnNlRmxvYXQoY29tcHNbaSsxXSk7XHJcblx0XHRcdFx0XHRcdHRleERlZltcIm1tX2dhaW5cIl0gPSBwYXJzZUZsb2F0KGNvbXBzW2krMl0pO1xyXG5cdFx0XHRcdFx0XHRpICs9IDI7IGJyZWFrO1xyXG5cdFx0XHRcdFx0Y2FzZSBcIi1vXCI6XHJcblx0XHRcdFx0XHRcdHRleERlZltcIm9fdVwiXSA9IHBhcnNlRmxvYXQoY29tcHNbaSsxXSk7XHJcblx0XHRcdFx0XHRcdHRleERlZltcIm9fdlwiXSA9IHBhcnNlRmxvYXQoY29tcHNbaSsyXSk7IC8vdGVjaG5pY2FsbHkgb3B0aW9uYWxcclxuXHRcdFx0XHRcdFx0dGV4RGVmW1wib193XCJdID0gcGFyc2VGbG9hdChjb21wc1tpKzNdKTsgLy90ZWNobmljYWxseSBvcHRpb25hbFxyXG5cdFx0XHRcdFx0XHRpICs9IDM7IGJyZWFrO1xyXG5cdFx0XHRcdFx0Y2FzZSBcIi1zXCI6XHJcblx0XHRcdFx0XHRcdHRleERlZltcInNfdVwiXSA9IHBhcnNlRmxvYXQoY29tcHNbaSsxXSk7XHJcblx0XHRcdFx0XHRcdHRleERlZltcInNfdlwiXSA9IHBhcnNlRmxvYXQoY29tcHNbaSsyXSk7IC8vdGVjaG5pY2FsbHkgb3B0aW9uYWxcclxuXHRcdFx0XHRcdFx0dGV4RGVmW1wic193XCJdID0gcGFyc2VGbG9hdChjb21wc1tpKzNdKTsgLy90ZWNobmljYWxseSBvcHRpb25hbFxyXG5cdFx0XHRcdFx0XHRpICs9IDM7IGJyZWFrO1xyXG5cdFx0XHRcdFx0Y2FzZSBcIi10XCI6XHJcblx0XHRcdFx0XHRcdHRleERlZltcInRfdVwiXSA9IHBhcnNlRmxvYXQoY29tcHNbaSsxXSk7XHJcblx0XHRcdFx0XHRcdHRleERlZltcInRfdlwiXSA9IHBhcnNlRmxvYXQoY29tcHNbaSsyXSk7IC8vdGVjaG5pY2FsbHkgb3B0aW9uYWxcclxuXHRcdFx0XHRcdFx0dGV4RGVmW1widF93XCJdID0gcGFyc2VGbG9hdChjb21wc1tpKzNdKTsgLy90ZWNobmljYWxseSBvcHRpb25hbFxyXG5cdFx0XHRcdFx0XHRpICs9IDM7IGJyZWFrO1xyXG5cdFx0XHRcdFx0Y2FzZSBcIi10ZXhyZXNcIjpcclxuXHRcdFx0XHRcdFx0dGV4RGVmW1widGV4cmVzXCJdID0gY29tcHNbaSsxXTtcclxuXHRcdFx0XHRcdFx0aSArPSAxOyBicmVhaztcclxuXHRcdFx0XHRcdGNhc2UgXCItY2xhbXBcIjpcclxuXHRcdFx0XHRcdFx0dGV4RGVmW1wiY2xhbXBcIl0gPSAoY29tcHNbaSsxXSA9PSBcIm9uXCIpOyAvL2RlZmF1bHQgb2ZmXHJcblx0XHRcdFx0XHRcdGkgKz0gMTsgYnJlYWs7XHJcblx0XHRcdFx0XHRjYXNlIFwiLWJtXCI6XHJcblx0XHRcdFx0XHRcdHRleERlZltcImJtXCJdID0gcGFyc2VGbG9hdChjb21wc1tpKzFdKTtcclxuXHRcdFx0XHRcdFx0aSArPSAxOyBicmVhaztcclxuXHRcdFx0XHRcdGNhc2UgXCItaW1mY2hhblwiOlxyXG5cdFx0XHRcdFx0XHR0ZXhEZWZbXCJpbWZjaGFuXCJdID0gY29tcHNbaSsxXTtcclxuXHRcdFx0XHRcdFx0aSArPSAxOyBicmVhaztcclxuXHRcdFx0XHRcdGNhc2UgXCItdHlwZVwiOlxyXG5cdFx0XHRcdFx0XHR0ZXhEZWZbXCJ0eXBlXCJdID0gY29tcHNbaSsxXTtcclxuXHRcdFx0XHRcdFx0aSArPSAxOyBicmVhaztcclxuXHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0Ly8gQ3VzdG9tIHByb3BlcnRpZXNcclxuXHRcdFx0XHRcdGNhc2UgXCItdGltZWFwcFwiOiAgLy9UaW1lIGFwcGxpY2FibGVcclxuXHRcdFx0XHRcdFx0Ly8gLXRpbWVhcHAgW3N0YXJ0VGltZV0gW2VuZFRpbWVdXHJcblx0XHRcdFx0XHRcdC8vICAgd2hlcmUgdGhlIHRpbWVzIGFyZSBmb3JtYXR0ZWQgYXMgZm9sbG93czogbTAwW2QwMFtoMDBbbTAwXV1dXHJcblx0XHRcdFx0XHRcdC8vICAgZWFjaCBzZWN0aW9uIGluIHNlcXVlbmNlIGlzIG9wdGlvbmFsXHJcblx0XHRcdFx0XHRcdC8vIHN0YXJ0VGltZSA9IHN0YXJ0IG9mIHRoZSB0aW1lLCBpbmNsdXNpdmUsIHdoZW4gdGhlIGdpdmVuIHRleHR1cmUgaXMgYXBwbGljYWJsZVxyXG5cdFx0XHRcdFx0XHQvLyBlbmRUaW1lID0gZW5kIG9mIHRoZSB0aW1lLCBpbmNsdXNpdmUsIHdoZW4gdGhlIGdpdmVuIHRleHR1cmUgaXMgYXBwbGljYWJsZVxyXG5cdFx0XHRcdFx0XHR2YXIgc3RhcnRUaW1lID0gY29tcHNbaSsxXTtcclxuXHRcdFx0XHRcdFx0dmFyIGVuZFRpbWUgPSBjb21wc1tpKzJdO1xyXG5cdFx0XHRcdFx0XHRpICs9IDI7XHJcblx0XHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0XHQvL3RleERlZltcInRpbWVhcHBcIl0gPSBbY29tcHNbaSsxXSwgY29tcHNbaSsyXV07XHJcblx0XHRcdFx0XHRcdHZhciBzdCwgZW5kO1xyXG5cdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0dmFyIHJlcyA9IC9tKFxcZFxcZCkoPzpkKFxcZFxcZCkoPzpoKFxcZFxcZCkoPzptKFxcZFxcZCkpPyk/KT8vaS5leGVjKHN0YXJ0VGltZSk7XHJcblx0XHRcdFx0XHRcdFx0aWYgKCFyZXMpIHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgdGltZXN0YW1wIGZvciAtdGltZWFwcCBzdGFydFRpbWVcIik7XHJcblx0XHRcdFx0XHRcdFx0c3QgPSBtb21lbnQoKS5tb250aChyZXNbMV0pLnN0YXJ0T2YoXCJtb250aFwiKTtcclxuXHRcdFx0XHRcdFx0XHRpZiAocmVzWzJdKSB7IHN0LmRhdGUocmVzWzJdKTsgfVxyXG5cdFx0XHRcdFx0XHRcdGlmIChyZXNbM10pIHsgc3QuaG91cihyZXNbM10pOyB9XHJcblx0XHRcdFx0XHRcdFx0aWYgKHJlc1s0XSkgeyBzdC5taW51dGUocmVzWzRdKTsgfVxyXG5cdFx0XHRcdFx0XHR9e1xyXG5cdFx0XHRcdFx0XHRcdHZhciByZXMgPSAvbShcXGRcXGQpKD86ZChcXGRcXGQpKD86aChcXGRcXGQpKD86bShcXGRcXGQpKT8pPyk/L2kuZXhlYyhlbmRUaW1lKTtcclxuXHRcdFx0XHRcdFx0XHRpZiAoIXJlcykgdGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCB0aW1lc3RhbXAgZm9yIC10aW1lYXBwIGVuZFRpbWVcIik7XHJcblx0XHRcdFx0XHRcdFx0ZW5kID0gbW9tZW50KCkubW9udGgocmVzWzFdKS5lbmRPZihcIm1vbnRoXCIpO1xyXG5cdFx0XHRcdFx0XHRcdGlmIChyZXNbMl0pIHsgZW5kLmRhdGUocmVzWzJdKS5lbmRPZihcImRheVwiKTsgfVxyXG5cdFx0XHRcdFx0XHRcdGlmIChyZXNbM10pIHsgZW5kLmhvdXIocmVzWzNdKS5lbmRPZihcImhvdXJcIik7IH1cclxuXHRcdFx0XHRcdFx0XHRpZiAocmVzWzRdKSB7IGVuZC5taW51dGUocmVzWzRdKS5lbmRPZihcIm1pbnV0ZVwiKTsgfVxyXG5cdFx0XHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0XHRcdGlmIChlbmQuaXNCZWZvcmUoc3QpKSBlbmQuYWRkKDEsIFwieWVhclwiKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHR0ZXhEZWZbXCJ0aW1lQXBwbGljYWJsZVwiXSA9IFtzdCwgZW5kXTtcclxuXHRcdFx0XHRcdFx0XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0XHJcblx0XHRcdFx0XHRkZWZhdWx0OlxyXG5cdFx0XHRcdFx0XHQvL0Fzc3VtZSB0aGUgc291cmNlIGlzIHRoZSBsYXN0IHRoaW5nIHdlJ2xsIGZpbmRcclxuXHRcdFx0XHRcdFx0dGV4RGVmLnNyYyA9IGNvbXBzLnNsaWNlKGkpLmpvaW4oXCIgXCIpO1xyXG5cdFx0XHRcdFx0XHR0ZXhEZWYuYXJncyA9IGNvbXBzLnNsaWNlKDAsIGkpLmpvaW4oXCIgXCIpO1xyXG5cdFx0XHRcdFx0XHRyZXR1cm4gdGV4RGVmO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XHRyZXR1cm4gdGV4RGVmO1xyXG5cdFx0fVxyXG5cdH0sXHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IE10bExvYWRlcjsiLCIvLyBvYmotbG9hZGVyLmpzXHJcbi8vIEEgVEhSRUUuanMgd2F2ZWZyb250IG9iamVjdCBsb2FkZXJcclxuLy8gQ29waWVkIG1vc3RseSB3aG9sZXNhbGUgZnJvbSB0aGUgdGhyZWUuanMgZXhhbXBsZXMgZm9sZGVyLlxyXG4vLyBPcmlnaW5hbCBhdXRob3JzOiBtcmRvb2IsIGFuZ2VseHVhbmNoYW5nXHJcblxyXG52YXIgbW9tZW50ID0gcmVxdWlyZShcIm1vbWVudFwiKTtcclxudmFyIGluaGVyaXRzID0gcmVxdWlyZShcImluaGVyaXRzXCIpO1xyXG52YXIgZXh0ZW5kID0gcmVxdWlyZShcImV4dGVuZFwiKTtcclxudmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoXCJldmVudHNcIikuRXZlbnRFbWl0dGVyO1xyXG5cclxudmFyIE10bExvYWRlciA9IHJlcXVpcmUoXCIuL210bC1sb2FkZXJcIik7XHJcblxyXG5mdW5jdGlvbiBPYmpMb2FkZXIob2JqZmlsZSwgbXRsZmlsZSwgZmlsZVN5cywgb3B0cykge1xyXG5cdEV2ZW50RW1pdHRlci5jYWxsKHRoaXMpO1xyXG5cdGV4dGVuZCh0aGlzLCBvcHRzKTtcclxuXHRcclxuXHR0aGlzLm9iamZpbGUgPSBvYmpmaWxlO1xyXG5cdHRoaXMubXRsZmlsZSA9IG10bGZpbGU7XHJcblx0dGhpcy5maWxlU3lzID0gZmlsZVN5cztcclxuXHRcclxuXHRpZiAob3B0cy5nYykge1xyXG5cdFx0aWYgKHR5cGVvZiBvcHRzLmdjID09IFwic3RyaW5nXCIpXHJcblx0XHRcdHRoaXMuZ2MgPSBHQy5nZXRCaW4ob3B0cy5nYyk7XHJcblx0XHRlbHNlXHJcblx0XHRcdHRoaXMuZ2MgPSBvcHRzLmdjO1xyXG5cdH0gZWxzZSB7XHJcblx0XHR0aGlzLmdjID0gR0MuZ2V0QmluKCk7XHJcblx0fVxyXG5cdFxyXG59O1xyXG5pbmhlcml0cyhPYmpMb2FkZXIsIEV2ZW50RW1pdHRlcik7XHJcbmV4dGVuZChPYmpMb2FkZXIucHJvdG90eXBlLCB7XHJcblx0b2JqZmlsZSA6IG51bGwsXHJcblx0bXRsZmlsZSA6IG51bGwsXHJcblx0ZmlsZVN5cyA6IG51bGwsXHJcblx0XHJcblx0bG9hZDogZnVuY3Rpb24oKSB7XHJcblx0XHRpZiAoISh0aGlzLm9iamZpbGUgJiYgdGhpcy5tdGxmaWxlKSkgXHJcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIk5vIE9CSiBmaWxlIG9yIE1UTCBmaWxlIGdpdmVuIVwiKTtcclxuXHRcdFxyXG5cdFx0dmFyIHNjb3BlID0gdGhpcztcclxuXHRcdHZhciBtdGxMb2FkZXIgPSBuZXcgTXRsTG9hZGVyKHRoaXMubXRsZmlsZSwgdGhpcy5maWxlU3lzLCB7XHJcblx0XHRcdFwiZ2NcIjogdGhpcy5nYyxcclxuXHRcdH0pO1xyXG5cdFx0bXRsTG9hZGVyLm9uKFwibG9hZFwiLCBmdW5jdGlvbihtYXRMaWIpIHtcclxuXHRcdFx0XHJcblx0XHRcdG1hdExpYi5wcmVsb2FkKCk7XHJcblx0XHRcdFxyXG5cdFx0XHR2YXIgb2JqZWN0ID0gc2NvcGUucGFyc2Uoc2NvcGUub2JqZmlsZSk7XHJcblx0XHRcdG9iamVjdC50cmF2ZXJzZShmdW5jdGlvbihvYmplY3Qpe1xyXG5cdFx0XHRcdGlmIChvYmplY3QgaW5zdGFuY2VvZiBUSFJFRS5NZXNoKSB7XHJcblx0XHRcdFx0XHRpZiAob2JqZWN0Lm1hdGVyaWFsLm5hbWUpIHtcclxuXHRcdFx0XHRcdFx0dmFyIG1hdCA9IG1hdExpYi5jcmVhdGUob2JqZWN0Lm1hdGVyaWFsLm5hbWUpO1xyXG5cdFx0XHRcdFx0XHRpZiAobWF0KSBvYmplY3QubWF0ZXJpYWwgPSBtYXQ7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRvYmplY3QucmVjZWl2ZVNoYWRvdyA9IHRydWU7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHRcdFx0b2JqZWN0Lm5hbWUgPSBcIkxvYWRlZCBNZXNoXCI7XHJcblx0XHRcdFxyXG5cdFx0XHRzY29wZS5lbWl0KFwibG9hZFwiLCBvYmplY3QpO1xyXG5cdFx0fSk7XHJcblx0XHRtdGxMb2FkZXIub24oXCJlcnJvclwiLCBmdW5jdGlvbihlKXtcclxuXHRcdFx0c2NvcGUuZW1pdChcImVycm9yXCIsIGUpO1xyXG5cdFx0fSk7XHJcblx0XHRtdGxMb2FkZXIubG9hZCgpO1xyXG5cdH0sXHJcbn0pO1xyXG5cclxuLy9UaGVzZSB3b3VsZCBiZSBDT05TVFMgaW4gbm9kZS5qcywgYnV0IHdlJ3JlIGluIHRoZSBicm93c2VyIG5vdzpcclxuXHJcbi8vIHYgZmxvYXQgZmxvYXQgZmxvYXRcclxudmFyIFZFUlRFWF9QQVRURVJOID0gL3YoICtbXFxkfFxcLnxcXCt8XFwtfGVdKykoICtbXFxkfFxcLnxcXCt8XFwtfGVdKykoICtbXFxkfFxcLnxcXCt8XFwtfGVdKykvO1xyXG5cclxuLy8gdm4gZmxvYXQgZmxvYXQgZmxvYXRcclxudmFyIE5PUk1BTF9QQVRURVJOID0gL3ZuKCArW1xcZHxcXC58XFwrfFxcLXxlXSspKCArW1xcZHxcXC58XFwrfFxcLXxlXSspKCArW1xcZHxcXC58XFwrfFxcLXxlXSspLztcclxuXHJcbi8vIHZ0IGZsb2F0IGZsb2F0XHJcbnZhciBVVl9QQVRURVJOID0gL3Z0KCArW1xcZHxcXC58XFwrfFxcLXxlXSspKCArW1xcZHxcXC58XFwrfFxcLXxlXSspLztcclxuXHJcbi8vIGYgdmVydGV4IHZlcnRleCB2ZXJ0ZXggLi4uXHJcbnZhciBGQUNFX1BBVFRFUk4xID0gL2YoICtcXGQrKSggK1xcZCspKCArXFxkKykoICtcXGQrKT8vO1xyXG5cclxuLy8gZiB2ZXJ0ZXgvdXYgdmVydGV4L3V2IHZlcnRleC91diAuLi5cclxudmFyIEZBQ0VfUEFUVEVSTjIgPSAvZiggKyhcXGQrKVxcLyhcXGQrKSkoICsoXFxkKylcXC8oXFxkKykpKCArKFxcZCspXFwvKFxcZCspKSggKyhcXGQrKVxcLyhcXGQrKSk/LztcclxuXHJcbi8vIGYgdmVydGV4L3V2L25vcm1hbCB2ZXJ0ZXgvdXYvbm9ybWFsIHZlcnRleC91di9ub3JtYWwgLi4uXHJcbnZhciBGQUNFX1BBVFRFUk4zID0gL2YoICsoXFxkKylcXC8oXFxkKylcXC8oXFxkKykpKCArKFxcZCspXFwvKFxcZCspXFwvKFxcZCspKSggKyhcXGQrKVxcLyhcXGQrKVxcLyhcXGQrKSkoICsoXFxkKylcXC8oXFxkKylcXC8oXFxkKykpPy87XHJcblxyXG4vLyBmIHZlcnRleC8vbm9ybWFsIHZlcnRleC8vbm9ybWFsIHZlcnRleC8vbm9ybWFsIC4uLiBcclxudmFyIEZBQ0VfUEFUVEVSTjQgPSAvZiggKyhcXGQrKVxcL1xcLyhcXGQrKSkoICsoXFxkKylcXC9cXC8oXFxkKykpKCArKFxcZCspXFwvXFwvKFxcZCspKSggKyhcXGQrKVxcL1xcLyhcXGQrKSk/L1xyXG5cclxuXHJcbk9iakxvYWRlci5wcm90b3R5cGUucGFyc2UgPSBmdW5jdGlvbihkYXRhKSB7XHJcblx0dmFyIHNlbGYgPSB0aGlzO1xyXG5cdFxyXG5cdHZhciBmYWNlX29mZnNldCA9IDA7XHJcblx0XHJcblx0dmFyIGdyb3VwID0gbmV3IFRIUkVFLk9iamVjdDNEKCk7XHJcblx0dmFyIG9iamVjdCA9IGdyb3VwO1xyXG5cdFxyXG5cdHZhciBnZW9tZXRyeSA9IG5ldyBUSFJFRS5HZW9tZXRyeSgpO1xyXG5cdHZhciBtYXRlcmlhbCA9IG5ldyBUSFJFRS5NZXNoTGFtYmVydE1hdGVyaWFsKCk7XHJcblx0dmFyIG1lc2ggPSBuZXcgVEhSRUUuTWVzaCggZ2VvbWV0cnksIG1hdGVyaWFsICk7XHJcblx0XHJcblx0dmFyIHZlcnRpY2VzID0gW107XHJcblx0dmFyIHZlcnRpY2VzQ291bnQgPSAwO1xyXG5cdHZhciBub3JtYWxzID0gW107XHJcblx0dmFyIHV2cyA9IFtdO1xyXG5cdFxyXG5cdC8vQmVnaW4gcGFyc2luZyBoZXJlXHJcblxyXG5cdHZhciBsaW5lcyA9IGRhdGEuc3BsaXQoIFwiXFxuXCIgKTtcclxuXHRmb3IgKCB2YXIgaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGg7IGkgKysgKSB7XHJcblx0XHR2YXIgbGluZSA9IGxpbmVzWyBpIF07XHJcblx0XHRsaW5lID0gbGluZS50cmltKCk7XHJcblx0XHRcclxuXHRcdHZhciByZXN1bHQ7XHJcblx0XHRcclxuXHRcdGlmIChsaW5lLmxlbmd0aCA9PSAwIHx8IGxpbmUuY2hhckF0KDApID09IFwiI1wiKSBcclxuXHRcdFx0Y29udGludWU7XHJcblx0XHRlbHNlIFxyXG5cdFx0aWYgKChyZXN1bHQgPSBWRVJURVhfUEFUVEVSTi5leGVjKGxpbmUpKSAhPT0gbnVsbCkge1xyXG5cdFx0XHQvLyBbXCJ2IDEuMCAyLjAgMy4wXCIsIFwiMS4wXCIsIFwiMi4wXCIsIFwiMy4wXCJdXHJcblx0XHRcdHZlcnRpY2VzLnB1c2godmVjdG9yKFxyXG5cdFx0XHRcdHBhcnNlRmxvYXQocmVzdWx0WyAxIF0pLFxyXG5cdFx0XHRcdHBhcnNlRmxvYXQocmVzdWx0WyAyIF0pLFxyXG5cdFx0XHRcdHBhcnNlRmxvYXQocmVzdWx0WyAzIF0pXHJcblx0XHRcdCkpO1xyXG5cdFx0fSBlbHNlXHJcblx0XHRpZiAoKHJlc3VsdCA9IE5PUk1BTF9QQVRURVJOLmV4ZWMobGluZSkpICE9PSBudWxsICkge1xyXG5cdFx0XHQvLyBbXCJ2biAxLjAgMi4wIDMuMFwiLCBcIjEuMFwiLCBcIjIuMFwiLCBcIjMuMFwiXVxyXG5cdFx0XHRub3JtYWxzLnB1c2godmVjdG9yKFxyXG5cdFx0XHRcdHBhcnNlRmxvYXQocmVzdWx0WyAxIF0pLFxyXG5cdFx0XHRcdHBhcnNlRmxvYXQocmVzdWx0WyAyIF0pLFxyXG5cdFx0XHRcdHBhcnNlRmxvYXQocmVzdWx0WyAzIF0pXHJcblx0XHRcdCkpO1xyXG5cdFx0fSBlbHNlXHJcblx0XHRpZiAoKHJlc3VsdCA9IFVWX1BBVFRFUk4uZXhlYyhsaW5lKSkgIT09IG51bGwgKSB7XHJcblx0XHRcdC8vIFtcInZ0IDAuMSAwLjJcIiwgXCIwLjFcIiwgXCIwLjJcIl1cclxuXHRcdFx0dXZzLnB1c2godXYoXHJcblx0XHRcdFx0cGFyc2VGbG9hdChyZXN1bHRbIDEgXSksXHJcblx0XHRcdFx0cGFyc2VGbG9hdChyZXN1bHRbIDIgXSlcclxuXHRcdFx0KSk7XHJcblx0XHR9IGVsc2VcclxuXHRcdGlmICgocmVzdWx0ID0gRkFDRV9QQVRURVJOMS5leGVjKGxpbmUpKSAhPT0gbnVsbCApIHtcclxuXHRcdFx0Ly8gW1wiZiAxIDIgM1wiLCBcIjFcIiwgXCIyXCIsIFwiM1wiLCB1bmRlZmluZWRdXHJcblx0XHRcdGhhbmRsZV9mYWNlX2xpbmUoWyByZXN1bHRbIDEgXSwgcmVzdWx0WyAyIF0sIHJlc3VsdFsgMyBdLCByZXN1bHRbIDQgXSBdKTtcclxuXHRcdH0gZWxzZSBcclxuXHRcdGlmICgocmVzdWx0ID0gRkFDRV9QQVRURVJOMi5leGVjKGxpbmUpKSAhPT0gbnVsbCApIHtcclxuXHRcdFx0Ly8gW1wiZiAxLzEgMi8yIDMvM1wiLCBcIiAxLzFcIiwgXCIxXCIsIFwiMVwiLCBcIiAyLzJcIiwgXCIyXCIsIFwiMlwiLCBcIiAzLzNcIiwgXCIzXCIsIFwiM1wiLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgdW5kZWZpbmVkXVxyXG5cdFx0XHRoYW5kbGVfZmFjZV9saW5lKFxyXG5cdFx0XHRcdFsgcmVzdWx0WyAyIF0sIHJlc3VsdFsgNSBdLCByZXN1bHRbIDggXSwgcmVzdWx0WyAxMSBdIF0sIC8vZmFjZXNcclxuXHRcdFx0XHRbIHJlc3VsdFsgMyBdLCByZXN1bHRbIDYgXSwgcmVzdWx0WyA5IF0sIHJlc3VsdFsgMTIgXSBdIC8vdXZcclxuXHRcdFx0KTtcclxuXHRcdH0gZWxzZVxyXG5cdFx0aWYgKChyZXN1bHQgPSBGQUNFX1BBVFRFUk4zLmV4ZWMobGluZSkpICE9PSBudWxsICkge1xyXG5cdFx0XHQvLyBbXCJmIDEvMS8xIDIvMi8yIDMvMy8zXCIsIFwiIDEvMS8xXCIsIFwiMVwiLCBcIjFcIiwgXCIxXCIsIFwiIDIvMi8yXCIsIFwiMlwiLCBcIjJcIiwgXCIyXCIsIFwiIDMvMy8zXCIsIFwiM1wiLCBcIjNcIiwgXCIzXCIsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCB1bmRlZmluZWQsIHVuZGVmaW5lZF1cclxuXHRcdFx0aGFuZGxlX2ZhY2VfbGluZShcclxuXHRcdFx0XHRbIHJlc3VsdFsgMiBdLCByZXN1bHRbIDYgXSwgcmVzdWx0WyAxMCBdLCByZXN1bHRbIDE0IF0gXSwgLy9mYWNlc1xyXG5cdFx0XHRcdFsgcmVzdWx0WyAzIF0sIHJlc3VsdFsgNyBdLCByZXN1bHRbIDExIF0sIHJlc3VsdFsgMTUgXSBdLCAvL3V2XHJcblx0XHRcdFx0WyByZXN1bHRbIDQgXSwgcmVzdWx0WyA4IF0sIHJlc3VsdFsgMTIgXSwgcmVzdWx0WyAxNiBdIF0gLy9ub3JtYWxcclxuXHRcdFx0KTtcclxuXHRcdH0gZWxzZVxyXG5cdFx0aWYgKChyZXN1bHQgPSBGQUNFX1BBVFRFUk40LmV4ZWMobGluZSkpICE9PSBudWxsICkge1xyXG5cdFx0XHQvLyBbXCJmIDEvLzEgMi8vMiAzLy8zXCIsIFwiIDEvLzFcIiwgXCIxXCIsIFwiMVwiLCBcIiAyLy8yXCIsIFwiMlwiLCBcIjJcIiwgXCIgMy8vM1wiLCBcIjNcIiwgXCIzXCIsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCB1bmRlZmluZWRdXHJcblx0XHRcdGhhbmRsZV9mYWNlX2xpbmUoXHJcblx0XHRcdFx0WyByZXN1bHRbIDIgXSwgcmVzdWx0WyA1IF0sIHJlc3VsdFsgOCBdLCByZXN1bHRbIDExIF0gXSwgLy9mYWNlc1xyXG5cdFx0XHRcdFsgXSwgLy91dlxyXG5cdFx0XHRcdFsgcmVzdWx0WyAzIF0sIHJlc3VsdFsgNiBdLCByZXN1bHRbIDkgXSwgcmVzdWx0WyAxMiBdIF0gLy9ub3JtYWxcclxuXHRcdFx0KTtcclxuXHRcdH0gZWxzZVxyXG5cdFx0aWYgKCAvXm8gLy50ZXN0KGxpbmUpKSB7XHJcblx0XHRcdC8vIG9iamVjdFxyXG5cdFx0XHRtZXNoTigpO1xyXG5cdFx0XHRmYWNlX29mZnNldCA9IGZhY2Vfb2Zmc2V0ICsgdmVydGljZXMubGVuZ3RoO1xyXG5cdFx0XHR2ZXJ0aWNlcyA9IFtdO1xyXG5cdFx0XHRvYmplY3QgPSBuZXcgVEhSRUUuT2JqZWN0M0QoKTtcclxuXHRcdFx0b2JqZWN0Lm5hbWUgPSBsaW5lLnN1YnN0cmluZyggMiApLnRyaW0oKTtcclxuXHRcdFx0Z3JvdXAuYWRkKCBvYmplY3QgKTtcclxuXHRcdFx0XHJcblx0XHR9IGVsc2VcclxuXHRcdGlmICggL15nIC8udGVzdChsaW5lKSkge1xyXG5cdFx0XHQvLyBncm91cFxyXG5cdFx0XHQvLyBtZXNoTiggbGluZS5zdWJzdHJpbmcoIDIgKS50cmltKCksIHVuZGVmaW5lZCApO1xyXG5cdFx0XHRtZXNoLm5hbWUgPSBsaW5lLnN1YnN0cmluZyggMiApLnRyaW0oKTtcclxuXHRcdFx0XHJcblx0XHR9IGVsc2UgXHJcblx0XHRpZiAoIC9edXNlbXRsIC8udGVzdChsaW5lKSkge1xyXG5cdFx0XHQvLyBtYXRlcmlhbFxyXG5cdFx0XHRtZXNoTiggdW5kZWZpbmVkLCBsaW5lLnN1YnN0cmluZyggNyApLnRyaW0oKSApO1xyXG5cdFx0XHRcclxuXHRcdFx0Ly8gbWF0ZXJpYWwgPSBuZXcgVEhSRUUuTWVzaExhbWJlcnRNYXRlcmlhbCgpO1xyXG5cdFx0XHQvLyBtYXRlcmlhbC5uYW1lID0gbGluZS5zdWJzdHJpbmcoIDcgKS50cmltKCk7XHJcblx0XHRcdFxyXG5cdFx0XHQvLyBtZXNoLm1hdGVyaWFsID0gbWF0ZXJpYWw7XHJcblxyXG5cdFx0fSBlbHNlIFxyXG5cdFx0aWYgKCAvXm10bGxpYiAvLnRlc3QobGluZSkpIHtcclxuXHRcdFx0Ly8gbXRsIGZpbGVcclxuXHRcdFx0Ly8gaWYgKCBtdGxsaWJDYWxsYmFjayApIHtcclxuXHRcdFx0Ly8gXHR2YXIgbXRsZmlsZSA9IGxpbmUuc3Vic3RyaW5nKCA3ICk7XHJcblx0XHRcdC8vIFx0bXRsZmlsZSA9IG10bGZpbGUudHJpbSgpO1xyXG5cdFx0XHQvLyBcdG10bGxpYkNhbGxiYWNrKCBtdGxmaWxlICk7XHJcblx0XHRcdC8vIH1cclxuXHRcdFx0XHJcblx0XHR9IGVsc2UgXHJcblx0XHRpZiAoIC9ecyAvLnRlc3QobGluZSkpIHtcclxuXHRcdFx0Ly8gU21vb3RoIHNoYWRpbmdcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdGNvbnNvbGUubG9nKCBcIlRIUkVFLk9CSk1UTExvYWRlcjogVW5oYW5kbGVkIGxpbmUgXCIgKyBsaW5lICk7XHJcblx0XHR9XHJcblx0fVxyXG5cdFxyXG5cdG1lc2hOKHVuZGVmaW5lZCwgdW5kZWZpbmVkKTsgLy9BZGQgbGFzdCBvYmplY3RcclxuXHRyZXR1cm4gZ3JvdXA7XHJcblxyXG5cclxuXHRmdW5jdGlvbiBtZXNoTiggbWVzaE5hbWUsIG1hdGVyaWFsTmFtZSApIHtcclxuXHRcdGlmICggdmVydGljZXMubGVuZ3RoID4gMCAmJiBnZW9tZXRyeS5mYWNlcy5sZW5ndGggPiAwICkge1xyXG5cdFx0XHRnZW9tZXRyeS52ZXJ0aWNlcyA9IHZlcnRpY2VzO1xyXG5cdFx0XHRcclxuXHRcdFx0Z2VvbWV0cnkubWVyZ2VWZXJ0aWNlcygpO1xyXG5cdFx0XHRnZW9tZXRyeS5jb21wdXRlRmFjZU5vcm1hbHMoKTtcclxuXHRcdFx0Z2VvbWV0cnkuY29tcHV0ZUJvdW5kaW5nQm94KCk7XHJcblx0XHRcdGdlb21ldHJ5LmNvbXB1dGVCb3VuZGluZ1NwaGVyZSgpO1xyXG5cdFx0XHRcclxuXHRcdFx0b2JqZWN0LmFkZCggbWVzaCApO1xyXG5cdFx0XHRcclxuXHRcdFx0c2VsZi5nYy5jb2xsZWN0KGdlb21ldHJ5KTtcclxuXHRcdFx0XHJcblx0XHRcdGdlb21ldHJ5ID0gbmV3IFRIUkVFLkdlb21ldHJ5KCk7XHJcblx0XHRcdG1lc2ggPSBuZXcgVEhSRUUuTWVzaCggZ2VvbWV0cnksIG1hdGVyaWFsICk7XHJcblx0XHRcdHZlcnRpY2VzQ291bnQgPSAwO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHQvLyBpZiAoIG1lc2hOYW1lICE9PSB1bmRlZmluZWQgKSBtZXNoLm5hbWUgPSBtZXNoTmFtZTtcclxuXHRcdFxyXG5cdFx0aWYgKCBtYXRlcmlhbE5hbWUgIT09IHVuZGVmaW5lZCApIHtcclxuXHRcdFx0bWF0ZXJpYWwgPSBuZXcgVEhSRUUuTWVzaExhbWJlcnRNYXRlcmlhbCgpO1xyXG5cdFx0XHRtYXRlcmlhbC5uYW1lID0gbWF0ZXJpYWxOYW1lO1xyXG5cdFx0XHRcclxuXHRcdFx0bWVzaC5tYXRlcmlhbCA9IG1hdGVyaWFsO1xyXG5cdFx0fVxyXG5cdH1cclxuXHRcclxuXHRmdW5jdGlvbiBhZGRfZmFjZSggYSwgYiwgYywgbm9ybWFsc19pbmRzICkge1xyXG5cdFx0aWYgKCBub3JtYWxzX2luZHMgPT09IHVuZGVmaW5lZCApIHtcclxuXHRcdFx0Z2VvbWV0cnkuZmFjZXMucHVzaCggZmFjZTMoXHJcblx0XHRcdFx0cGFyc2VJbnQoIGEgKSAtIChmYWNlX29mZnNldCArIDEpLFxyXG5cdFx0XHRcdHBhcnNlSW50KCBiICkgLSAoZmFjZV9vZmZzZXQgKyAxKSxcclxuXHRcdFx0XHRwYXJzZUludCggYyApIC0gKGZhY2Vfb2Zmc2V0ICsgMSlcclxuXHRcdFx0KSApO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0Z2VvbWV0cnkuZmFjZXMucHVzaCggZmFjZTMoXHJcblx0XHRcdFx0cGFyc2VJbnQoIGEgKSAtIChmYWNlX29mZnNldCArIDEpLFxyXG5cdFx0XHRcdHBhcnNlSW50KCBiICkgLSAoZmFjZV9vZmZzZXQgKyAxKSxcclxuXHRcdFx0XHRwYXJzZUludCggYyApIC0gKGZhY2Vfb2Zmc2V0ICsgMSksXHJcblx0XHRcdFx0W1xyXG5cdFx0XHRcdFx0bm9ybWFsc1sgcGFyc2VJbnQoIG5vcm1hbHNfaW5kc1sgMCBdICkgLSAxIF0uY2xvbmUoKSxcclxuXHRcdFx0XHRcdG5vcm1hbHNbIHBhcnNlSW50KCBub3JtYWxzX2luZHNbIDEgXSApIC0gMSBdLmNsb25lKCksXHJcblx0XHRcdFx0XHRub3JtYWxzWyBwYXJzZUludCggbm9ybWFsc19pbmRzWyAyIF0gKSAtIDEgXS5jbG9uZSgpXHJcblx0XHRcdFx0XVxyXG5cdFx0XHQpICk7XHJcblx0XHR9XHJcblx0fVxyXG5cdFxyXG5cdGZ1bmN0aW9uIGFkZF91dnMoIGEsIGIsIGMgKSB7XHJcblx0XHRnZW9tZXRyeS5mYWNlVmVydGV4VXZzWyAwIF0ucHVzaCggW1xyXG5cdFx0XHR1dnNbIHBhcnNlSW50KCBhICkgLSAxIF0uY2xvbmUoKSxcclxuXHRcdFx0dXZzWyBwYXJzZUludCggYiApIC0gMSBdLmNsb25lKCksXHJcblx0XHRcdHV2c1sgcGFyc2VJbnQoIGMgKSAtIDEgXS5jbG9uZSgpXHJcblx0XHRdICk7XHJcblx0fVxyXG5cdFxyXG5cdGZ1bmN0aW9uIGhhbmRsZV9mYWNlX2xpbmUoZmFjZXMsIHV2cywgbm9ybWFsc19pbmRzKSB7XHJcblx0XHRpZiAoIGZhY2VzWyAzIF0gPT09IHVuZGVmaW5lZCApIHtcclxuXHRcdFx0YWRkX2ZhY2UoIGZhY2VzWyAwIF0sIGZhY2VzWyAxIF0sIGZhY2VzWyAyIF0sIG5vcm1hbHNfaW5kcyApO1xyXG5cdFx0XHRpZiAoISh1dnMgPT09IHVuZGVmaW5lZCkgJiYgdXZzLmxlbmd0aCA+IDApIHtcclxuXHRcdFx0XHRhZGRfdXZzKCB1dnNbIDAgXSwgdXZzWyAxIF0sIHV2c1sgMiBdICk7XHJcblx0XHRcdH1cclxuXHRcdFx0XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRpZiAoIShub3JtYWxzX2luZHMgPT09IHVuZGVmaW5lZCkgJiYgbm9ybWFsc19pbmRzLmxlbmd0aCA+IDApIHtcclxuXHRcdFx0XHRhZGRfZmFjZSggZmFjZXNbIDAgXSwgZmFjZXNbIDEgXSwgZmFjZXNbIDMgXSwgWyBub3JtYWxzX2luZHNbIDAgXSwgbm9ybWFsc19pbmRzWyAxIF0sIG5vcm1hbHNfaW5kc1sgMyBdIF0pO1xyXG5cdFx0XHRcdGFkZF9mYWNlKCBmYWNlc1sgMSBdLCBmYWNlc1sgMiBdLCBmYWNlc1sgMyBdLCBbIG5vcm1hbHNfaW5kc1sgMSBdLCBub3JtYWxzX2luZHNbIDIgXSwgbm9ybWFsc19pbmRzWyAzIF0gXSk7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0YWRkX2ZhY2UoIGZhY2VzWyAwIF0sIGZhY2VzWyAxIF0sIGZhY2VzWyAzIF0pO1xyXG5cdFx0XHRcdGFkZF9mYWNlKCBmYWNlc1sgMSBdLCBmYWNlc1sgMiBdLCBmYWNlc1sgMyBdKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcclxuXHRcdFx0aWYgKCEodXZzID09PSB1bmRlZmluZWQpICYmIHV2cy5sZW5ndGggPiAwKSB7XHJcblx0XHRcdFx0YWRkX3V2cyggdXZzWyAwIF0sIHV2c1sgMSBdLCB1dnNbIDMgXSApO1xyXG5cdFx0XHRcdGFkZF91dnMoIHV2c1sgMSBdLCB1dnNbIDIgXSwgdXZzWyAzIF0gKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxufTtcclxuXHJcbi8vY29udmllbmNlIGZ1bmN0aW9uc1xyXG5mdW5jdGlvbiB2ZWN0b3IoIHgsIHksIHogKSB7IHJldHVybiBuZXcgVEhSRUUuVmVjdG9yMyggeCwgeSwgeiApOyB9XHJcbmZ1bmN0aW9uIHV2KCB1LCB2ICkgeyByZXR1cm4gbmV3IFRIUkVFLlZlY3RvcjIoIHUsIHYgKTsgfVxyXG5mdW5jdGlvbiBmYWNlMyggYSwgYiwgYywgbm9ybWFscyApIHsgcmV0dXJuIG5ldyBUSFJFRS5GYWNlMyggYSwgYiwgYywgbm9ybWFscyApOyB9XHJcblxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBPYmpMb2FkZXI7IiwiLy8gcmVuZGVybG9vcC5qc1xyXG4vLyBUaGUgbW9kdWxlIHRoYXQgaGFuZGxlcyBhbGwgdGhlIGNvbW1vbiBjb2RlIHRvIHJlbmRlciBhbmQgZG8gZ2FtZSB0aWNrcyBvbiBhIG1hcFxyXG5cclxudmFyIGV4dGVuZCA9IHJlcXVpcmUoXCJleHRlbmRcIik7XHJcbnZhciByYWYgPSByZXF1aXJlKFwicmFmXCIpO1xyXG52YXIgY29udHJvbGxlciA9IHJlcXVpcmUoXCJ0cHAtY29udHJvbGxlclwiKTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0ge1xyXG5cdHN0YXJ0IDogZnVuY3Rpb24ob3B0cykge1xyXG5cdFx0Ly8gU2V0IHRoZSBjYW52YXMncyBhdHRyaWJ1dGVzLCBiZWNhdXNlIHRob3NlIFxyXG5cdFx0Ly8gQUNUVUFMTFkgZGV0ZXJtaW5lIGhvdyBiaWcgdGhlIHJlbmRlcmluZyBhcmVhIGlzLlxyXG5cdFx0dmFyIGNhbnZhcyA9ICQoXCIjZ2FtZXNjcmVlblwiKTtcclxuXHRcdGNhbnZhcy5hdHRyKFwid2lkdGhcIiwgcGFyc2VJbnQoY2FudmFzLmNzcyhcIndpZHRoXCIpKSk7XHJcblx0XHRjYW52YXMuYXR0cihcImhlaWdodFwiLCBwYXJzZUludChjYW52YXMuY3NzKFwiaGVpZ2h0XCIpKSk7XHJcblx0XHRcclxuXHRcdG9wdHMgPSBleHRlbmQoe1xyXG5cdFx0XHRjbGVhckNvbG9yIDogMHgwMDAwMDAsXHJcblx0XHRcdHRpY2tzUGVyU2Vjb25kIDogMzAsXHJcblx0XHR9LCBvcHRzKTtcclxuXHRcdFxyXG5cdFx0d2luZG93LnRocmVlUmVuZGVyZXIgPSBuZXcgVEhSRUUuV2ViR0xSZW5kZXJlcih7XHJcblx0XHRcdGFudGlhbGlhcyA6IHRydWUsXHJcblx0XHRcdGNhbnZhcyA6IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiZ2FtZXNjcmVlblwiKSBcclxuXHRcdH0pO1xyXG5cdFx0dGhyZWVSZW5kZXJlci5zZXRDbGVhckNvbG9ySGV4KCBvcHRzLmNsZWFyQ29sb3IgKTtcclxuXHRcdHRocmVlUmVuZGVyZXIuYXV0b0NsZWFyID0gZmFsc2U7XHJcblx0XHRcclxuXHRcdHRocmVlUmVuZGVyZXIuc2hhZG93TWFwRW5hYmxlZCA9IHRydWU7XHJcblx0XHR0aHJlZVJlbmRlcmVyLnNoYWRvd01hcFR5cGUgPSBUSFJFRS5QQ0ZTaGFkb3dNYXA7XHJcblx0XHRcclxuXHRcdF9yZW5kZXJIYW5kbGUgPSByYWYocmVuZGVyTG9vcCk7XHJcblx0XHRpbml0R2FtZUxvb3AoMzApO1xyXG5cdFx0XHJcblx0fSxcclxuXHRcclxuXHRwYXVzZSA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0cGF1c2VkID0gdHJ1ZTtcclxuXHRcdC8vIF9yZW5kZXJIYW5kbGUgPSBudWxsO1xyXG5cdH0sXHJcblx0dW5wYXVzZSA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0cGF1c2VkID0gZmFsc2U7XHJcblx0XHQvLyBfcmVuZGVySGFuZGxlID0gcmFmKHJlbmRlckxvb3ApO1xyXG5cdH0sXHJcbn07XHJcblxyXG5cclxudmFyIF9yZW5kZXJIYW5kbGU7IFxyXG5mdW5jdGlvbiByZW5kZXJMb29wKCkge1xyXG5cdHRocmVlUmVuZGVyZXIuY2xlYXIoKTtcclxuXHRcclxuXHRpZiAoY3VycmVudE1hcCAmJiBjdXJyZW50TWFwLnNjZW5lICYmIGN1cnJlbnRNYXAuY2FtZXJhKSB7XHJcblx0XHQvL1JlbmRlciB3aXRoIHRoZSBtYXAncyBhY3RpdmUgY2FtZXJhIG9uIGl0cyBhY3RpdmUgc2NlbmVcclxuXHRcdHRocmVlUmVuZGVyZXIucmVuZGVyKGN1cnJlbnRNYXAuc2NlbmUsIGN1cnJlbnRNYXAuY2FtZXJhKTtcclxuXHR9XHJcblx0XHJcblx0aWYgKFVJLnNjZW5lICYmIFVJLmNhbWVyYSkge1xyXG5cdFx0Ly9SZW5kZXIgdGhlIFVJIHdpdGggdGhlIFVJIGNhbWVyYSBhbmQgaXRzIHNjZW5lXHJcblx0XHR0aHJlZVJlbmRlcmVyLmNsZWFyKGZhbHNlLCB0cnVlLCBmYWxzZSk7IC8vQ2xlYXIgZGVwdGggYnVmZmVyXHJcblx0XHR0aHJlZVJlbmRlcmVyLnJlbmRlcihVSS5zY2VuZSwgVUkuY2FtZXJhKTtcclxuXHR9XHJcblx0XHJcblx0aWYgKF9yZW5kZXJIYW5kbGUpXHJcblx0XHRfcmVuZGVySGFuZGxlID0gcmFmKHJlbmRlckxvb3ApO1xyXG59XHJcblxyXG52YXIgcGF1c2VkID0gZmFsc2U7XHJcbmZ1bmN0aW9uIGluaXRHYW1lTG9vcCh0aWNrc1BlclNlYykge1xyXG5cdF9yYXRlID0gMTAwMCAvIHRpY2tzUGVyU2VjO1xyXG5cdFxyXG5cdHZhciBhY2N1bSA9IDA7XHJcblx0dmFyIG5vdyA9IDA7XHJcblx0dmFyIGxhc3QgPSBudWxsO1xyXG5cdHZhciBkdCA9IDA7XHJcblx0dmFyIHdob2xlVGljaztcclxuXHRcclxuXHRzZXRJbnRlcnZhbCh0aW1lclRpY2ssIDApO1xyXG5cdFxyXG5cdGZ1bmN0aW9uIHRpbWVyVGljaygpIHtcclxuXHRcdGlmIChwYXVzZWQpIHtcclxuXHRcdFx0bGFzdCA9IERhdGUubm93KCk7XHJcblx0XHRcdGFjY3VtID0gMDtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHRub3cgPSBEYXRlLm5vdygpO1xyXG5cdFx0ZHQgPSBub3cgLSAobGFzdCB8fCBub3cpO1xyXG5cdFx0bGFzdCA9IG5vdztcclxuXHRcdGFjY3VtICs9IGR0O1xyXG5cdFx0aWYgKGFjY3VtIDwgX3JhdGUpIHJldHVybjtcclxuXHRcdHdob2xlVGljayA9ICgoYWNjdW0gLyBfcmF0ZSl8MCk7XHJcblx0XHRpZiAod2hvbGVUaWNrIDw9IDApIHJldHVybjtcclxuXHRcdHdob2xlVGljayAqPSBfcmF0ZTtcclxuXHRcdFxyXG5cdFx0aWYgKGN1cnJlbnRNYXAgJiYgY3VycmVudE1hcC5sb2dpY0xvb3ApXHJcblx0XHRcdGN1cnJlbnRNYXAubG9naWNMb29wKHdob2xlVGljayAqIDAuMDEpO1xyXG5cdFx0aWYgKFVJICYmIFVJLmxvZ2ljTG9vcClcclxuXHRcdFx0VUkubG9naWNMb29wKHdob2xlVGljayAqIDAuMDEpO1xyXG5cdFx0XHJcblx0XHRpZiAoY29udHJvbGxlciAmJiBjb250cm9sbGVyLl90aWNrKVxyXG5cdFx0XHRjb250cm9sbGVyLl90aWNrKCk7XHJcblx0XHRcclxuXHRcdGFjY3VtIC09IHdob2xlVGljaztcclxuXHR9XHJcbn0iLCIvLyBwb2x5ZmlsbC5qc1xyXG4vLyBEZWZpbmVzIHNvbWUgcG9seWZpbGxzIG5lZWRlZCBmb3IgdGhlIGdhbWUgdG8gZnVuY3Rpb24uXHJcblxyXG4vLyBTdHJpbmcuc3RhcnRzV2l0aCgpXHJcbi8vIFxyXG5pZiAoIVN0cmluZy5wcm90b3R5cGUuc3RhcnRzV2l0aCkge1xyXG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShTdHJpbmcucHJvdG90eXBlLCAnc3RhcnRzV2l0aCcsIHtcclxuXHRcdGVudW1lcmFibGU6IGZhbHNlLFxyXG5cdFx0Y29uZmlndXJhYmxlOiBmYWxzZSxcclxuXHRcdHdyaXRhYmxlOiBmYWxzZSxcclxuXHRcdHZhbHVlOiBmdW5jdGlvbihzZWFyY2hTdHJpbmcsIHBvc2l0aW9uKSB7XHJcblx0XHRcdHBvc2l0aW9uID0gcG9zaXRpb24gfHwgMDtcclxuXHRcdFx0cmV0dXJuIHRoaXMubGFzdEluZGV4T2Yoc2VhcmNoU3RyaW5nLCBwb3NpdGlvbikgPT09IHBvc2l0aW9uO1xyXG5cdFx0fVxyXG5cdH0pO1xyXG59XHJcblxyXG4vLyBFdmVudFRhcmdldC5vbigpIGFuZCBFdmVudFRhcmdldC5lbWl0KClcclxuLy8gQWRkaW5nIHRoaXMgdG8gYWxsb3cgZG9tIGVsZW1lbnRzIGFuZCBvYmplY3RzIHRvIHNpbXBseSBoYXZlIFwib25cIiBhbmQgXCJlbWl0XCIgdXNlZCBsaWtlIG5vZGUuanMgb2JqZWN0cyBjYW5cclxuaWYgKCFFdmVudFRhcmdldC5wcm90b3R5cGUub24pIHtcclxuXHRFdmVudFRhcmdldC5wcm90b3R5cGUub24gPSBFdmVudFRhcmdldC5wcm90b3R5cGUuYWRkRXZlbnRMaXN0ZW5lcjtcclxuXHRFdmVudFRhcmdldC5wcm90b3R5cGUuZW1pdCA9IEV2ZW50VGFyZ2V0LnByb3RvdHlwZS5kaXNwYXRjaEV2ZW50O1xyXG59XHJcblxyXG4vLyBNYXRoLmNsYW1wKClcclxuLy8gXHJcbmlmICghTWF0aC5jbGFtcCkge1xyXG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShNYXRoLCBcImNsYW1wXCIsIHtcclxuXHRcdGVudW1lcmFibGU6IGZhbHNlLFxyXG5cdFx0Y29uZmlndXJhYmxlOiBmYWxzZSxcclxuXHRcdHdyaXRhYmxlOiBmYWxzZSxcclxuXHRcdHZhbHVlOiBmdW5jdGlvbihudW0sIG1pbiwgbWF4KSB7XHJcblx0XHRcdG1pbiA9IChtaW4gIT09IHVuZGVmaW5lZCk/IG1pbjowO1xyXG5cdFx0XHRtYXggPSAobWF4ICE9PSB1bmRlZmluZWQpPyBtYXg6MTtcclxuXHRcdFx0cmV0dXJuIE1hdGgubWluKE1hdGgubWF4KG51bSwgbWluKSwgbWF4KTtcclxuXHRcdH1cclxuXHR9KTtcclxufVxyXG5cclxuLy8gQXJyYXkudG9wXHJcbi8vIFByb3ZpZGVzIGVhc3kgYWNjZXNzIHRvIHRoZSBcInRvcFwiIG9mIGEgc3RhY2ssIG1hZGUgd2l0aCBwdXNoKCkgYW5kIHBvcCgpXHJcbmlmICghQXJyYXkucHJvdG90eXBlLnRvcCkge1xyXG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShBcnJheS5wcm90b3R5cGUsIFwidG9wXCIsIHtcclxuXHRcdGVudW1lcmFibGU6IGZhbHNlLFxyXG5cdFx0Y29uZmlndXJhYmxlOiBmYWxzZSxcclxuXHRcdC8vIHNldDogZnVuY3Rpb24oKXt9LFxyXG5cdFx0Z2V0OiBmdW5jdGlvbigpe1xyXG5cdFx0XHRyZXR1cm4gdGhpc1t0aGlzLmxlbmd0aC0xXTtcclxuXHRcdH0sXHJcblx0fSk7XHJcbn1cclxuXHJcblxyXG4vLyBNb2RpZmljYXRpb25zIHRvIFRIUkVFLmpzXHJcbntcclxuXHQvLyBWZWN0b3IzLnNldCgpLCBtb2RpZmllZCB0byBhY2NlcHQgYW5vdGhlciBWZWN0b3IzXHJcblx0VEhSRUUuVmVjdG9yMy5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24oeCwgeSwgeikge1xyXG5cdFx0aWYgKHggaW5zdGFuY2VvZiBUSFJFRS5WZWN0b3IzKSB7XHJcblx0XHRcdHRoaXMueCA9IHgueDsgdGhpcy55ID0geC55OyB0aGlzLnogPSB4Lno7XHJcblx0XHRcdHJldHVybiB0aGlzO1xyXG5cdFx0fVxyXG5cdFx0aWYgKHggaW5zdGFuY2VvZiBUSFJFRS5WZWN0b3IyKSB7XHJcblx0XHRcdHRoaXMueCA9IHgueDsgdGhpcy55ID0geC55OyB0aGlzLnogPSAwO1xyXG5cdFx0XHRyZXR1cm4gdGhpcztcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0dGhpcy54ID0geDsgdGhpcy55ID0geTsgdGhpcy56ID0gejtcclxuXHRcdHJldHVybiB0aGlzO1xyXG5cdH07XHJcblx0XHJcblx0Ly8gQWxzbyBmb3IgVmVjdG9yMlxyXG5cdFRIUkVFLlZlY3RvcjIucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uKHgsIHkpIHtcclxuXHRcdGlmICh4IGluc3RhbmNlb2YgVEhSRUUuVmVjdG9yMikge1xyXG5cdFx0XHR0aGlzLnggPSB4Lng7IHRoaXMueSA9IHgueTtcclxuXHRcdFx0cmV0dXJuIHRoaXM7XHJcblx0XHR9XHJcblx0XHRpZiAoeCBpbnN0YW5jZW9mIFRIUkVFLlZlY3RvcjMpIHtcclxuXHRcdFx0dGhpcy54ID0geC54OyB0aGlzLnkgPSB4Lnk7XHJcblx0XHRcdHJldHVybiB0aGlzO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHR0aGlzLnggPSB4OyB0aGlzLnkgPSB5O1xyXG5cdFx0cmV0dXJuIHRoaXM7XHJcblx0fTtcclxuXHRcclxufVxyXG5cclxuXHJcbiJdfQ==
