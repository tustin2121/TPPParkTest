(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// game.js

//var THREE = require("three");
//var $ = require("jquery");
//var zip = zip.js

require("./polyfill.js");
var Map = require("./map");
var renderLoop = require("./model/renderloop");

require("./globals");


//On Ready
$(function(){
	
	// currentMap = new Map("iChurchOfHelix");
	// currentMap.load();
	MapManager.transitionTo();
	
	renderLoop.start({
		clearColor : 0xFF0000,
		ticksPerSecond : 20,
	});
	
});

function loadMap(id) {
	if (currentMap) {
		currentMap.dispose();
		_infoParent = null;
		_node_movementGrid = null;
	}
	
	currentMap = new Map(id);
	currentMap.load();
}
window.loadMap = loadMap;

},{"./globals":14,"./map":20,"./model/renderloop":25,"./polyfill.js":26}],2:[function(require,module,exports){
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
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50
Buffer.poolSize = 8192 // not used by this implementation

var kMaxLength = 0x3fffffff
var rootParent = {}

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
    return arr.foo() === 42 && // typed array instances can be augmented
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
  if (type === 'number') {
    length = +subject
  } else if (type === 'string') {
    length = Buffer.byteLength(subject, encoding)
  } else if (type === 'object' && subject !== null) { // assume object is array-like
    if (subject.type === 'Buffer' && isArray(subject.data))
      subject = subject.data
    length = +subject.length
  } else {
    throw new TypeError('must start with number, buffer, array or string')
  }

  if (length > kMaxLength)
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
      'size: 0x' + kMaxLength.toString(16) + ' bytes')

  if (length < 0)
    length = 0
  else
    length >>>= 0 // Coerce to uint32.

  var self = this
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Preferred: Return an augmented `Uint8Array` instance for best performance
    /*eslint-disable consistent-this */
    self = Buffer._augment(new Uint8Array(length))
    /*eslint-enable consistent-this */
  } else {
    // Fallback: Return THIS instance of Buffer (created by `new`)
    self.length = length
    self._isBuffer = true
  }

  var i
  if (Buffer.TYPED_ARRAY_SUPPORT && typeof subject.byteLength === 'number') {
    // Speed optimization -- use set if we're copying from a typed array
    self._set(subject)
  } else if (isArrayish(subject)) {
    // Treat array-ish objects as a byte array
    if (Buffer.isBuffer(subject)) {
      for (i = 0; i < length; i++)
        self[i] = subject.readUInt8(i)
    } else {
      for (i = 0; i < length; i++)
        self[i] = ((subject[i] % 256) + 256) % 256
    }
  } else if (type === 'string') {
    self.write(subject, 0, encoding)
  } else if (type === 'number' && !Buffer.TYPED_ARRAY_SUPPORT && !noZero) {
    for (i = 0; i < length; i++) {
      self[i] = 0
    }
  }

  if (length > 0 && length <= Buffer.poolSize)
    self.parent = rootParent

  return self
}

function SlowBuffer (subject, encoding, noZero) {
  if (!(this instanceof SlowBuffer))
    return new SlowBuffer(subject, encoding, noZero)

  var buf = new Buffer(subject, encoding, noZero)
  delete buf.parent
  return buf
}

Buffer.isBuffer = function (b) {
  return !!(b != null && b._isBuffer)
}

Buffer.compare = function (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b))
    throw new TypeError('Arguments must be Buffers')

  if (a === b) return 0

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
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
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
  if (this === b) return 0
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
  var charsWritten = blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
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
  var charsWritten = blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
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

  if (length < 0 || offset < 0 || offset > this.length)
    throw new RangeError('attempt to write outside buffer bounds')

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
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function binarySlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
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
    start += len
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

  var newBuf
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    newBuf = Buffer._augment(this.subarray(start, end))
  } else {
    var sliceLen = end - start
    newBuf = new Buffer(sliceLen, undefined, true)
    for (var i = 0; i < sliceLen; i++) {
      newBuf[i] = this[i + start]
    }
  }

  if (newBuf.length)
    newBuf.parent = this.parent || this

  return newBuf
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

Buffer.prototype.readUIntLE = function (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert)
    checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100))
    val += this[offset + i] * mul

  return val
}

Buffer.prototype.readUIntBE = function (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert)
    checkOffset(offset, byteLength, this.length)

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100))
    val += this[offset + --byteLength] * mul

  return val
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

Buffer.prototype.readIntLE = function (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert)
    checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100))
    val += this[offset + i] * mul
  mul *= 0x80

  if (val >= mul)
    val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert)
    checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100))
    val += this[offset + --i] * mul
  mul *= 0x80

  if (val >= mul)
    val -= Math.pow(2, 8 * byteLength)

  return val
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
  if (value > max || value < min) throw new RangeError('value is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('index out of range')
}

Buffer.prototype.writeUIntLE = function (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert)
    checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0)

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100))
    this[offset + i] = (value / mul) >>> 0 & 0xFF

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert)
    checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0)

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100))
    this[offset + i] = (value / mul) >>> 0 & 0xFF

  return offset + byteLength
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

Buffer.prototype.writeIntLE = function (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkInt(this,
             value,
             offset,
             byteLength,
             Math.pow(2, 8 * byteLength - 1) - 1,
             -Math.pow(2, 8 * byteLength - 1))
  }

  var i = 0
  var mul = 1
  var sub = value < 0 ? 1 : 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100))
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkInt(this,
             value,
             offset,
             byteLength,
             Math.pow(2, 8 * byteLength - 1) - 1,
             -Math.pow(2, 8 * byteLength - 1))
  }

  var i = byteLength - 1
  var mul = 1
  var sub = value < 0 ? 1 : 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100))
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF

  return offset + byteLength
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
  if (value > max || value < min) throw new RangeError('value is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('index out of range')
  if (offset < 0) throw new RangeError('index out of range')
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
  var self = this // source

  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (target_start >= target.length) target_start = target.length
  if (!target_start) target_start = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || self.length === 0) return 0

  // Fatal error conditions
  if (target_start < 0)
    throw new RangeError('targetStart out of bounds')
  if (start < 0 || start >= self.length) throw new RangeError('sourceStart out of bounds')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

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

  return len
}

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function (value, start, end) {
  if (!value) value = 0
  if (!start) start = 0
  if (!end) end = this.length

  if (end < start) throw new RangeError('end < start')

  // Fill 0 bytes; we're done
  if (end === start) return
  if (this.length === 0) return

  if (start < 0 || start >= this.length) throw new RangeError('start out of bounds')
  if (end < 0 || end > this.length) throw new RangeError('end out of bounds')

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
  arr.readUIntLE = BP.readUIntLE
  arr.readUIntBE = BP.readUIntBE
  arr.readUInt8 = BP.readUInt8
  arr.readUInt16LE = BP.readUInt16LE
  arr.readUInt16BE = BP.readUInt16BE
  arr.readUInt32LE = BP.readUInt32LE
  arr.readUInt32BE = BP.readUInt32BE
  arr.readIntLE = BP.readIntLE
  arr.readIntBE = BP.readIntBE
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
  arr.writeUIntLE = BP.writeUIntLE
  arr.writeUIntBE = BP.writeUIntBE
  arr.writeUInt16LE = BP.writeUInt16LE
  arr.writeUInt16BE = BP.writeUInt16BE
  arr.writeUInt32LE = BP.writeUInt32LE
  arr.writeUInt32BE = BP.writeUInt32BE
  arr.writeIntLE = BP.writeIntLE
  arr.writeIntBE = BP.writeIntBE
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

var INVALID_BASE64_RE = /[^+\/0-9A-z\-]/g

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
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

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []
  var i = 0

  for (; i < length; i++) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (leadSurrogate) {
        // 2 leads in a row
        if (codePoint < 0xDC00) {
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          leadSurrogate = codePoint
          continue
        } else {
          // valid surrogate pair
          codePoint = leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00 | 0x10000
          leadSurrogate = null
        }
      } else {
        // no lead yet

        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else {
          // valid lead
          leadSurrogate = codePoint
          continue
        }
      }
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
      leadSurrogate = null
    }

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x200000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
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
	var PLUS_URL_SAFE = '-'.charCodeAt(0)
	var SLASH_URL_SAFE = '_'.charCodeAt(0)

	function decode (elt) {
		var code = elt.charCodeAt(0)
		if (code === PLUS ||
		    code === PLUS_URL_SAFE)
			return 62 // '+'
		if (code === SLASH ||
		    code === SLASH_URL_SAFE)
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
(function (global){
//! moment.js
//! version : 2.9.0
//! authors : Tim Wood, Iskren Chernev, Moment.js contributors
//! license : MIT
//! momentjs.com

(function (undefined) {
    /************************************
        Constants
    ************************************/

    var moment,
        VERSION = '2.9.0',
        // the global-scope this is NOT the global object in Node.js
        globalScope = (typeof global !== 'undefined' && (typeof window === 'undefined' || window === global.window)) ? global : this,
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

        // timezone chunker '+10:00' > ['10', '00'] or '-1530' > ['-', '15', '30']
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
                var a = this.utcOffset(),
                    b = '+';
                if (a < 0) {
                    a = -a;
                    b = '-';
                }
                return b + leftZeroFill(toInt(a / 60), 2) + ':' + leftZeroFill(toInt(a) % 60, 2);
            },
            ZZ   : function () {
                var a = this.utcOffset(),
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

        lists = ['months', 'monthsShort', 'weekdays', 'weekdaysShort', 'weekdaysMin'],

        updateInProgress = false;

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

    function monthDiff(a, b) {
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

    while (ordinalizeTokens.length) {
        i = ordinalizeTokens.pop();
        formatTokenFunctions[i + 'o'] = ordinalizeToken(formatTokenFunctions[i], i);
    }
    while (paddedTokens.length) {
        i = paddedTokens.pop();
        formatTokenFunctions[i + i] = padToken(formatTokenFunctions[i], 2);
    }
    formatTokenFunctions.DDDD = padToken(formatTokenFunctions.DDD, 3);


    function meridiemFixWrap(locale, hour, meridiem) {
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
            // thie is not supposed to happen
            return hour;
        }
    }

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
        // Prevent infinite loop in case updateOffset creates new moment
        // objects.
        if (updateInProgress === false) {
            updateInProgress = true;
            moment.updateOffset(this);
            updateInProgress = false;
        }
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

    // Return a moment from input, that is local/utc/utcOffset equivalent to
    // model.
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

        firstDayOfWeek : function () {
            return this._week.dow;
        },

        firstDayOfYear : function () {
            return this._week.doy;
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

    function utcOffsetFromString(string) {
        string = string || '';
        var possibleTzMatches = (string.match(parseTokenTimezone) || []),
            tzChunk = possibleTzMatches[possibleTzMatches.length - 1] || [],
            parts = (tzChunk + '').match(parseTimezoneChunker) || ['-', 0, 0],
            minutes = +(parts[1] * 60) + toInt(parts[2]);

        return parts[0] === '+' ? minutes : -minutes;
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
            config._meridiem = input;
            // config._isPm = config._locale.isPM(input);
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
            config._tzm = utcOffsetFromString(input);
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
        // Apply timezone offset from input. The actual utcOffset can be changed
        // with parseZone.
        if (config._tzm != null) {
            config._d.setUTCMinutes(config._d.getUTCMinutes() - config._tzm);
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
        // handle meridiem
        config._a[HOUR] = meridiemFixWrap(config._locale, config._a[HOUR],
                config._meridiem);
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
        } else if (duration == null) {// checks for null or undefined
            duration = {};
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

    moment.isDate = isDate;

    /************************************
        Moment Prototype
    ************************************/


    extend(moment.fn = Moment.prototype, {

        clone : function () {
            return moment(this);
        },

        valueOf : function () {
            return +this._d - ((this._offset || 0) * 60000);
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
            return this.utcOffset(0, keepLocalTime);
        },

        local : function (keepLocalTime) {
            if (this._isUTC) {
                this.utcOffset(0, keepLocalTime);
                this._isUTC = false;

                if (keepLocalTime) {
                    this.subtract(this._dateUtcOffset(), 'm');
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
                zoneDiff = (that.utcOffset() - this.utcOffset()) * 6e4,
                anchor, diff, output, daysAdjust;

            units = normalizeUnits(units);

            if (units === 'year' || units === 'month' || units === 'quarter') {
                output = monthDiff(this, that);
                if (units === 'quarter') {
                    output = output / 3;
                } else if (units === 'year') {
                    output = output / 12;
                }
            } else {
                diff = this - that;
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
            // Getting start-of-today depends on whether we're locat/utc/offset
            // or not.
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
            return (this.utcOffset() > this.clone().month(0).utcOffset() ||
                this.utcOffset() > this.clone().month(5).utcOffset());
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

        isBetween: function (from, to, units) {
            return this.isAfter(from, units) && this.isBefore(to, units);
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

        zone : deprecate(
                'moment().zone is deprecated, use moment().utcOffset instead. ' +
                'https://github.com/moment/moment/issues/1779',
                function (input, keepLocalTime) {
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
        ),

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
        utcOffset : function (input, keepLocalTime) {
            var offset = this._offset || 0,
                localAdjust;
            if (input != null) {
                if (typeof input === 'string') {
                    input = utcOffsetFromString(input);
                }
                if (Math.abs(input) < 16) {
                    input = input * 60;
                }
                if (!this._isUTC && keepLocalTime) {
                    localAdjust = this._dateUtcOffset();
                }
                this._offset = input;
                this._isUTC = true;
                if (localAdjust != null) {
                    this.add(localAdjust, 'm');
                }
                if (offset !== input) {
                    if (!keepLocalTime || this._changeInProgress) {
                        addOrSubtractDurationFromMoment(this,
                                moment.duration(input - offset, 'm'), 1, false);
                    } else if (!this._changeInProgress) {
                        this._changeInProgress = true;
                        moment.updateOffset(this, true);
                        this._changeInProgress = null;
                    }
                }

                return this;
            } else {
                return this._isUTC ? offset : this._dateUtcOffset();
            }
        },

        isLocal : function () {
            return !this._isUTC;
        },

        isUtcOffset : function () {
            return this._isUTC;
        },

        isUtc : function () {
            return this._isUTC && this._offset === 0;
        },

        zoneAbbr : function () {
            return this._isUTC ? 'UTC' : '';
        },

        zoneName : function () {
            return this._isUTC ? 'Coordinated Universal Time' : '';
        },

        parseZone : function () {
            if (this._tzm) {
                this.utcOffset(this._tzm);
            } else if (typeof this._i === 'string') {
                this.utcOffset(utcOffsetFromString(this._i));
            }
            return this;
        },

        hasAlignedHourOffset : function (input) {
            if (!input) {
                input = 0;
            }
            else {
                input = moment(input).utcOffset();
            }

            return (this.utcOffset() - input) % 60 === 0;
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
            var unit;
            if (typeof units === 'object') {
                for (unit in units) {
                    this.set(unit, units[unit]);
                }
            }
            else {
                units = normalizeUnits(units);
                if (typeof this[units] === 'function') {
                    this[units](value);
                }
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

        _dateUtcOffset : function () {
            // On Firefox.24 Date#getTimezoneOffset returns a floating point.
            // https://github.com/moment/moment/pull/1871
            return -Math.round(this._d.getTimezoneOffset() / 15) * 15;
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

    // alias isUtc for dev-friendliness
    moment.fn.isUTC = moment.fn.isUtc;

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
        },

        toJSON : function () {
            return this.toISOString();
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
        define(function (require, exports, module) {
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

},{}],9:[function(require,module,exports){
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

},{"buffer":2,"iota-array":10}],10:[function(require,module,exports){
"use strict"

function iota(n) {
  var result = new Array(n)
  for(var i=0; i<n; ++i) {
    result[i] = i
  }
  return result
}

module.exports = iota
},{}],11:[function(require,module,exports){
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

},{"performance-now":12}],12:[function(require,module,exports){
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

},{"_process":7}],13:[function(require,module,exports){
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
},{}],14:[function(require,module,exports){
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

},{"./gamestate":13,"./managers/actorscheduler":15,"./managers/garbage-collector":16,"./managers/mapmanager":17,"./managers/soundmanager":18,"./managers/ui-manager":19}],15:[function(require,module,exports){
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

},{"extend":"extend","inherits":"inherits"}],16:[function(require,module,exports){
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
},{}],17:[function(require,module,exports){
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
},{"../map.js":20,"../model/dungeon-map.js":21,"events":6,"extend":"extend","inherits":"inherits","tpp-controller":"tpp-controller"}],18:[function(require,module,exports){
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
	
	if (DEBUG.soundAnalyzer) {
		var da = sobj.__debugAnalyser = audioContext.createAnalyser();
		da.fftSize = 1024;//2048;
		this.emit("DEBUG-AnalyserCreated", id, da);
		
		sobj.__muteCtrl.connect(da);
		da.connect(audioContext.destination);
	} else {
		sobj.__muteCtrl.connect(audioContext.destination);
	}
	
	return sobj;
}



///////////////////////////////////////////////////////////////////////////////////
module.exports = new SoundManager();

},{"events":6,"extend":"extend","inherits":"inherits"}],19:[function(require,module,exports){
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
	
	
	openInfodexPage : function(pageid) {
		
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

},{"events":6,"extend":"extend","inherits":"inherits","tpp-controller":"tpp-controller","tpp-spritemodel":"tpp-spritemodel"}],20:[function(require,module,exports){
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
		
		self.queueForMapStart(function(){
			SoundManager.playMusic(musicdef[0].id);
		});
		
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



},{"./model/map-setup":22,"./model/obj-loader":24,"events":6,"extend":"extend","inherits":"inherits","ndarray":9,"tpp-event":"tpp-event","tpp-pc":"tpp-pc"}],21:[function(require,module,exports){
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
},{"../map.js":20,"./map-setup":22,"extend":"extend","inherits":"inherits","tpp-pc":"tpp-pc"}],22:[function(require,module,exports){
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
	}
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



},{"extend":"extend"}],23:[function(require,module,exports){
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

},{"events":6,"extend":"extend","inherits":"inherits","moment":8}],24:[function(require,module,exports){
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
},{"./mtl-loader":23,"events":6,"extend":"extend","inherits":"inherits","moment":8}],25:[function(require,module,exports){
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
},{"extend":"extend","raf":11,"tpp-controller":"tpp-controller"}],26:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlc1xcYnJvd3NlcmlmeVxcbm9kZV9tb2R1bGVzXFxicm93c2VyLXBhY2tcXF9wcmVsdWRlLmpzIiwic3JjXFxqc1xcZ2FtZS5qcyIsIm5vZGVfbW9kdWxlc1xcYnJvd3NlcmlmeVxcbm9kZV9tb2R1bGVzXFxidWZmZXJcXGluZGV4LmpzIiwibm9kZV9tb2R1bGVzXFxicm93c2VyaWZ5XFxub2RlX21vZHVsZXNcXGJ1ZmZlclxcbm9kZV9tb2R1bGVzXFxiYXNlNjQtanNcXGxpYlxcYjY0LmpzIiwibm9kZV9tb2R1bGVzXFxicm93c2VyaWZ5XFxub2RlX21vZHVsZXNcXGJ1ZmZlclxcbm9kZV9tb2R1bGVzXFxpZWVlNzU0XFxpbmRleC5qcyIsIm5vZGVfbW9kdWxlc1xcYnJvd3NlcmlmeVxcbm9kZV9tb2R1bGVzXFxidWZmZXJcXG5vZGVfbW9kdWxlc1xcaXMtYXJyYXlcXGluZGV4LmpzIiwibm9kZV9tb2R1bGVzXFxicm93c2VyaWZ5XFxub2RlX21vZHVsZXNcXGV2ZW50c1xcZXZlbnRzLmpzIiwibm9kZV9tb2R1bGVzXFxicm93c2VyaWZ5XFxub2RlX21vZHVsZXNcXHByb2Nlc3NcXGJyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvbW9tZW50L21vbWVudC5qcyIsIm5vZGVfbW9kdWxlcy9uZGFycmF5L25kYXJyYXkuanMiLCJub2RlX21vZHVsZXNcXG5kYXJyYXlcXG5vZGVfbW9kdWxlc1xcaW90YS1hcnJheVxcaW90YS5qcyIsIm5vZGVfbW9kdWxlc1xccmFmXFxpbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9yYWYvbm9kZV9tb2R1bGVzL3BlcmZvcm1hbmNlLW5vdy9saWIvcGVyZm9ybWFuY2Utbm93LmpzIiwic3JjXFxqc1xcZ2FtZXN0YXRlLmpzIiwic3JjXFxqc1xcZ2xvYmFscy5qcyIsInNyY1xcanNcXG1hbmFnZXJzXFxhY3RvcnNjaGVkdWxlci5qcyIsInNyY1xcanNcXG1hbmFnZXJzXFxnYXJiYWdlLWNvbGxlY3Rvci5qcyIsInNyY1xcanNcXG1hbmFnZXJzXFxtYXBtYW5hZ2VyLmpzIiwic3JjXFxqc1xcbWFuYWdlcnNcXHNvdW5kbWFuYWdlci5qcyIsInNyY1xcanNcXG1hbmFnZXJzXFx1aS1tYW5hZ2VyLmpzIiwic3JjXFxqc1xcbWFwLmpzIiwic3JjXFxqc1xcbW9kZWxcXGR1bmdlb24tbWFwLmpzIiwic3JjXFxqc1xcbW9kZWxcXG1hcC1zZXR1cC5qcyIsInNyY1xcanNcXG1vZGVsXFxtdGwtbG9hZGVyLmpzIiwic3JjXFxqc1xcbW9kZWxcXG9iai1sb2FkZXIuanMiLCJzcmNcXGpzXFxtb2RlbFxccmVuZGVybG9vcC5qcyIsInNyY1xcanNcXHBvbHlmaWxsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOXhDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN1NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDdEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDbitGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUN4VkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ2hGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3BDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcmdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0aUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3A0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDalRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0dBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvLyBnYW1lLmpzXHJcblxyXG4vL3ZhciBUSFJFRSA9IHJlcXVpcmUoXCJ0aHJlZVwiKTtcclxuLy92YXIgJCA9IHJlcXVpcmUoXCJqcXVlcnlcIik7XHJcbi8vdmFyIHppcCA9IHppcC5qc1xyXG5cclxucmVxdWlyZShcIi4vcG9seWZpbGwuanNcIik7XHJcbnZhciBNYXAgPSByZXF1aXJlKFwiLi9tYXBcIik7XHJcbnZhciByZW5kZXJMb29wID0gcmVxdWlyZShcIi4vbW9kZWwvcmVuZGVybG9vcFwiKTtcclxuXHJcbnJlcXVpcmUoXCIuL2dsb2JhbHNcIik7XHJcblxyXG5cclxuLy9PbiBSZWFkeVxyXG4kKGZ1bmN0aW9uKCl7XHJcblx0XHJcblx0Ly8gY3VycmVudE1hcCA9IG5ldyBNYXAoXCJpQ2h1cmNoT2ZIZWxpeFwiKTtcclxuXHQvLyBjdXJyZW50TWFwLmxvYWQoKTtcclxuXHRNYXBNYW5hZ2VyLnRyYW5zaXRpb25UbygpO1xyXG5cdFxyXG5cdHJlbmRlckxvb3Auc3RhcnQoe1xyXG5cdFx0Y2xlYXJDb2xvciA6IDB4RkYwMDAwLFxyXG5cdFx0dGlja3NQZXJTZWNvbmQgOiAyMCxcclxuXHR9KTtcclxuXHRcclxufSk7XHJcblxyXG5mdW5jdGlvbiBsb2FkTWFwKGlkKSB7XHJcblx0aWYgKGN1cnJlbnRNYXApIHtcclxuXHRcdGN1cnJlbnRNYXAuZGlzcG9zZSgpO1xyXG5cdFx0X2luZm9QYXJlbnQgPSBudWxsO1xyXG5cdFx0X25vZGVfbW92ZW1lbnRHcmlkID0gbnVsbDtcclxuXHR9XHJcblx0XHJcblx0Y3VycmVudE1hcCA9IG5ldyBNYXAoaWQpO1xyXG5cdGN1cnJlbnRNYXAubG9hZCgpO1xyXG59XHJcbndpbmRvdy5sb2FkTWFwID0gbG9hZE1hcDtcclxuIiwiLyohXG4gKiBUaGUgYnVmZmVyIG1vZHVsZSBmcm9tIG5vZGUuanMsIGZvciB0aGUgYnJvd3Nlci5cbiAqXG4gKiBAYXV0aG9yICAgRmVyb3NzIEFib3VraGFkaWplaCA8ZmVyb3NzQGZlcm9zcy5vcmc+IDxodHRwOi8vZmVyb3NzLm9yZz5cbiAqIEBsaWNlbnNlICBNSVRcbiAqL1xuXG52YXIgYmFzZTY0ID0gcmVxdWlyZSgnYmFzZTY0LWpzJylcbnZhciBpZWVlNzU0ID0gcmVxdWlyZSgnaWVlZTc1NCcpXG52YXIgaXNBcnJheSA9IHJlcXVpcmUoJ2lzLWFycmF5JylcblxuZXhwb3J0cy5CdWZmZXIgPSBCdWZmZXJcbmV4cG9ydHMuU2xvd0J1ZmZlciA9IFNsb3dCdWZmZXJcbmV4cG9ydHMuSU5TUEVDVF9NQVhfQllURVMgPSA1MFxuQnVmZmVyLnBvb2xTaXplID0gODE5MiAvLyBub3QgdXNlZCBieSB0aGlzIGltcGxlbWVudGF0aW9uXG5cbnZhciBrTWF4TGVuZ3RoID0gMHgzZmZmZmZmZlxudmFyIHJvb3RQYXJlbnQgPSB7fVxuXG4vKipcbiAqIElmIGBCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVGA6XG4gKiAgID09PSB0cnVlICAgIFVzZSBVaW50OEFycmF5IGltcGxlbWVudGF0aW9uIChmYXN0ZXN0KVxuICogICA9PT0gZmFsc2UgICBVc2UgT2JqZWN0IGltcGxlbWVudGF0aW9uIChtb3N0IGNvbXBhdGlibGUsIGV2ZW4gSUU2KVxuICpcbiAqIEJyb3dzZXJzIHRoYXQgc3VwcG9ydCB0eXBlZCBhcnJheXMgYXJlIElFIDEwKywgRmlyZWZveCA0KywgQ2hyb21lIDcrLCBTYWZhcmkgNS4xKyxcbiAqIE9wZXJhIDExLjYrLCBpT1MgNC4yKy5cbiAqXG4gKiBOb3RlOlxuICpcbiAqIC0gSW1wbGVtZW50YXRpb24gbXVzdCBzdXBwb3J0IGFkZGluZyBuZXcgcHJvcGVydGllcyB0byBgVWludDhBcnJheWAgaW5zdGFuY2VzLlxuICogICBGaXJlZm94IDQtMjkgbGFja2VkIHN1cHBvcnQsIGZpeGVkIGluIEZpcmVmb3ggMzArLlxuICogICBTZWU6IGh0dHBzOi8vYnVnemlsbGEubW96aWxsYS5vcmcvc2hvd19idWcuY2dpP2lkPTY5NTQzOC5cbiAqXG4gKiAgLSBDaHJvbWUgOS0xMCBpcyBtaXNzaW5nIHRoZSBgVHlwZWRBcnJheS5wcm90b3R5cGUuc3ViYXJyYXlgIGZ1bmN0aW9uLlxuICpcbiAqICAtIElFMTAgaGFzIGEgYnJva2VuIGBUeXBlZEFycmF5LnByb3RvdHlwZS5zdWJhcnJheWAgZnVuY3Rpb24gd2hpY2ggcmV0dXJucyBhcnJheXMgb2ZcbiAqICAgIGluY29ycmVjdCBsZW5ndGggaW4gc29tZSBzaXR1YXRpb25zLlxuICpcbiAqIFdlIGRldGVjdCB0aGVzZSBidWdneSBicm93c2VycyBhbmQgc2V0IGBCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVGAgdG8gYGZhbHNlYCBzbyB0aGV5IHdpbGxcbiAqIGdldCB0aGUgT2JqZWN0IGltcGxlbWVudGF0aW9uLCB3aGljaCBpcyBzbG93ZXIgYnV0IHdpbGwgd29yayBjb3JyZWN0bHkuXG4gKi9cbkJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUID0gKGZ1bmN0aW9uICgpIHtcbiAgdHJ5IHtcbiAgICB2YXIgYnVmID0gbmV3IEFycmF5QnVmZmVyKDApXG4gICAgdmFyIGFyciA9IG5ldyBVaW50OEFycmF5KGJ1ZilcbiAgICBhcnIuZm9vID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gNDIgfVxuICAgIHJldHVybiBhcnIuZm9vKCkgPT09IDQyICYmIC8vIHR5cGVkIGFycmF5IGluc3RhbmNlcyBjYW4gYmUgYXVnbWVudGVkXG4gICAgICAgIHR5cGVvZiBhcnIuc3ViYXJyYXkgPT09ICdmdW5jdGlvbicgJiYgLy8gY2hyb21lIDktMTAgbGFjayBgc3ViYXJyYXlgXG4gICAgICAgIG5ldyBVaW50OEFycmF5KDEpLnN1YmFycmF5KDEsIDEpLmJ5dGVMZW5ndGggPT09IDAgLy8gaWUxMCBoYXMgYnJva2VuIGBzdWJhcnJheWBcbiAgfSBjYXRjaCAoZSkge1xuICAgIHJldHVybiBmYWxzZVxuICB9XG59KSgpXG5cbi8qKlxuICogQ2xhc3M6IEJ1ZmZlclxuICogPT09PT09PT09PT09PVxuICpcbiAqIFRoZSBCdWZmZXIgY29uc3RydWN0b3IgcmV0dXJucyBpbnN0YW5jZXMgb2YgYFVpbnQ4QXJyYXlgIHRoYXQgYXJlIGF1Z21lbnRlZFxuICogd2l0aCBmdW5jdGlvbiBwcm9wZXJ0aWVzIGZvciBhbGwgdGhlIG5vZGUgYEJ1ZmZlcmAgQVBJIGZ1bmN0aW9ucy4gV2UgdXNlXG4gKiBgVWludDhBcnJheWAgc28gdGhhdCBzcXVhcmUgYnJhY2tldCBub3RhdGlvbiB3b3JrcyBhcyBleHBlY3RlZCAtLSBpdCByZXR1cm5zXG4gKiBhIHNpbmdsZSBvY3RldC5cbiAqXG4gKiBCeSBhdWdtZW50aW5nIHRoZSBpbnN0YW5jZXMsIHdlIGNhbiBhdm9pZCBtb2RpZnlpbmcgdGhlIGBVaW50OEFycmF5YFxuICogcHJvdG90eXBlLlxuICovXG5mdW5jdGlvbiBCdWZmZXIgKHN1YmplY3QsIGVuY29kaW5nLCBub1plcm8pIHtcbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIEJ1ZmZlcikpXG4gICAgcmV0dXJuIG5ldyBCdWZmZXIoc3ViamVjdCwgZW5jb2RpbmcsIG5vWmVybylcblxuICB2YXIgdHlwZSA9IHR5cGVvZiBzdWJqZWN0XG5cbiAgLy8gRmluZCB0aGUgbGVuZ3RoXG4gIHZhciBsZW5ndGhcbiAgaWYgKHR5cGUgPT09ICdudW1iZXInKSB7XG4gICAgbGVuZ3RoID0gK3N1YmplY3RcbiAgfSBlbHNlIGlmICh0eXBlID09PSAnc3RyaW5nJykge1xuICAgIGxlbmd0aCA9IEJ1ZmZlci5ieXRlTGVuZ3RoKHN1YmplY3QsIGVuY29kaW5nKVxuICB9IGVsc2UgaWYgKHR5cGUgPT09ICdvYmplY3QnICYmIHN1YmplY3QgIT09IG51bGwpIHsgLy8gYXNzdW1lIG9iamVjdCBpcyBhcnJheS1saWtlXG4gICAgaWYgKHN1YmplY3QudHlwZSA9PT0gJ0J1ZmZlcicgJiYgaXNBcnJheShzdWJqZWN0LmRhdGEpKVxuICAgICAgc3ViamVjdCA9IHN1YmplY3QuZGF0YVxuICAgIGxlbmd0aCA9ICtzdWJqZWN0Lmxlbmd0aFxuICB9IGVsc2Uge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ211c3Qgc3RhcnQgd2l0aCBudW1iZXIsIGJ1ZmZlciwgYXJyYXkgb3Igc3RyaW5nJylcbiAgfVxuXG4gIGlmIChsZW5ndGggPiBrTWF4TGVuZ3RoKVxuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdBdHRlbXB0IHRvIGFsbG9jYXRlIEJ1ZmZlciBsYXJnZXIgdGhhbiBtYXhpbXVtICcgK1xuICAgICAgJ3NpemU6IDB4JyArIGtNYXhMZW5ndGgudG9TdHJpbmcoMTYpICsgJyBieXRlcycpXG5cbiAgaWYgKGxlbmd0aCA8IDApXG4gICAgbGVuZ3RoID0gMFxuICBlbHNlXG4gICAgbGVuZ3RoID4+Pj0gMCAvLyBDb2VyY2UgdG8gdWludDMyLlxuXG4gIHZhciBzZWxmID0gdGhpc1xuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICAvLyBQcmVmZXJyZWQ6IFJldHVybiBhbiBhdWdtZW50ZWQgYFVpbnQ4QXJyYXlgIGluc3RhbmNlIGZvciBiZXN0IHBlcmZvcm1hbmNlXG4gICAgLyplc2xpbnQtZGlzYWJsZSBjb25zaXN0ZW50LXRoaXMgKi9cbiAgICBzZWxmID0gQnVmZmVyLl9hdWdtZW50KG5ldyBVaW50OEFycmF5KGxlbmd0aCkpXG4gICAgLyplc2xpbnQtZW5hYmxlIGNvbnNpc3RlbnQtdGhpcyAqL1xuICB9IGVsc2Uge1xuICAgIC8vIEZhbGxiYWNrOiBSZXR1cm4gVEhJUyBpbnN0YW5jZSBvZiBCdWZmZXIgKGNyZWF0ZWQgYnkgYG5ld2ApXG4gICAgc2VsZi5sZW5ndGggPSBsZW5ndGhcbiAgICBzZWxmLl9pc0J1ZmZlciA9IHRydWVcbiAgfVxuXG4gIHZhciBpXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCAmJiB0eXBlb2Ygc3ViamVjdC5ieXRlTGVuZ3RoID09PSAnbnVtYmVyJykge1xuICAgIC8vIFNwZWVkIG9wdGltaXphdGlvbiAtLSB1c2Ugc2V0IGlmIHdlJ3JlIGNvcHlpbmcgZnJvbSBhIHR5cGVkIGFycmF5XG4gICAgc2VsZi5fc2V0KHN1YmplY3QpXG4gIH0gZWxzZSBpZiAoaXNBcnJheWlzaChzdWJqZWN0KSkge1xuICAgIC8vIFRyZWF0IGFycmF5LWlzaCBvYmplY3RzIGFzIGEgYnl0ZSBhcnJheVxuICAgIGlmIChCdWZmZXIuaXNCdWZmZXIoc3ViamVjdCkpIHtcbiAgICAgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGkrKylcbiAgICAgICAgc2VsZltpXSA9IHN1YmplY3QucmVhZFVJbnQ4KGkpXG4gICAgfSBlbHNlIHtcbiAgICAgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGkrKylcbiAgICAgICAgc2VsZltpXSA9ICgoc3ViamVjdFtpXSAlIDI1NikgKyAyNTYpICUgMjU2XG4gICAgfVxuICB9IGVsc2UgaWYgKHR5cGUgPT09ICdzdHJpbmcnKSB7XG4gICAgc2VsZi53cml0ZShzdWJqZWN0LCAwLCBlbmNvZGluZylcbiAgfSBlbHNlIGlmICh0eXBlID09PSAnbnVtYmVyJyAmJiAhQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQgJiYgIW5vWmVybykge1xuICAgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgc2VsZltpXSA9IDBcbiAgICB9XG4gIH1cblxuICBpZiAobGVuZ3RoID4gMCAmJiBsZW5ndGggPD0gQnVmZmVyLnBvb2xTaXplKVxuICAgIHNlbGYucGFyZW50ID0gcm9vdFBhcmVudFxuXG4gIHJldHVybiBzZWxmXG59XG5cbmZ1bmN0aW9uIFNsb3dCdWZmZXIgKHN1YmplY3QsIGVuY29kaW5nLCBub1plcm8pIHtcbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFNsb3dCdWZmZXIpKVxuICAgIHJldHVybiBuZXcgU2xvd0J1ZmZlcihzdWJqZWN0LCBlbmNvZGluZywgbm9aZXJvKVxuXG4gIHZhciBidWYgPSBuZXcgQnVmZmVyKHN1YmplY3QsIGVuY29kaW5nLCBub1plcm8pXG4gIGRlbGV0ZSBidWYucGFyZW50XG4gIHJldHVybiBidWZcbn1cblxuQnVmZmVyLmlzQnVmZmVyID0gZnVuY3Rpb24gKGIpIHtcbiAgcmV0dXJuICEhKGIgIT0gbnVsbCAmJiBiLl9pc0J1ZmZlcilcbn1cblxuQnVmZmVyLmNvbXBhcmUgPSBmdW5jdGlvbiAoYSwgYikge1xuICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcihhKSB8fCAhQnVmZmVyLmlzQnVmZmVyKGIpKVxuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FyZ3VtZW50cyBtdXN0IGJlIEJ1ZmZlcnMnKVxuXG4gIGlmIChhID09PSBiKSByZXR1cm4gMFxuXG4gIHZhciB4ID0gYS5sZW5ndGhcbiAgdmFyIHkgPSBiLmxlbmd0aFxuICBmb3IgKHZhciBpID0gMCwgbGVuID0gTWF0aC5taW4oeCwgeSk7IGkgPCBsZW4gJiYgYVtpXSA9PT0gYltpXTsgaSsrKSB7fVxuICBpZiAoaSAhPT0gbGVuKSB7XG4gICAgeCA9IGFbaV1cbiAgICB5ID0gYltpXVxuICB9XG4gIGlmICh4IDwgeSkgcmV0dXJuIC0xXG4gIGlmICh5IDwgeCkgcmV0dXJuIDFcbiAgcmV0dXJuIDBcbn1cblxuQnVmZmVyLmlzRW5jb2RpbmcgPSBmdW5jdGlvbiAoZW5jb2RpbmcpIHtcbiAgc3dpdGNoIChTdHJpbmcoZW5jb2RpbmcpLnRvTG93ZXJDYXNlKCkpIHtcbiAgICBjYXNlICdoZXgnOlxuICAgIGNhc2UgJ3V0ZjgnOlxuICAgIGNhc2UgJ3V0Zi04JzpcbiAgICBjYXNlICdhc2NpaSc6XG4gICAgY2FzZSAnYmluYXJ5JzpcbiAgICBjYXNlICdiYXNlNjQnOlxuICAgIGNhc2UgJ3Jhdyc6XG4gICAgY2FzZSAndWNzMic6XG4gICAgY2FzZSAndWNzLTInOlxuICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgIHJldHVybiB0cnVlXG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiBmYWxzZVxuICB9XG59XG5cbkJ1ZmZlci5jb25jYXQgPSBmdW5jdGlvbiAobGlzdCwgdG90YWxMZW5ndGgpIHtcbiAgaWYgKCFpc0FycmF5KGxpc3QpKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdVc2FnZTogQnVmZmVyLmNvbmNhdChsaXN0WywgbGVuZ3RoXSknKVxuXG4gIGlmIChsaXN0Lmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBuZXcgQnVmZmVyKDApXG4gIH0gZWxzZSBpZiAobGlzdC5sZW5ndGggPT09IDEpIHtcbiAgICByZXR1cm4gbGlzdFswXVxuICB9XG5cbiAgdmFyIGlcbiAgaWYgKHRvdGFsTGVuZ3RoID09PSB1bmRlZmluZWQpIHtcbiAgICB0b3RhbExlbmd0aCA9IDBcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7IGkrKykge1xuICAgICAgdG90YWxMZW5ndGggKz0gbGlzdFtpXS5sZW5ndGhcbiAgICB9XG4gIH1cblxuICB2YXIgYnVmID0gbmV3IEJ1ZmZlcih0b3RhbExlbmd0aClcbiAgdmFyIHBvcyA9IDBcbiAgZm9yIChpID0gMDsgaSA8IGxpc3QubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgaXRlbSA9IGxpc3RbaV1cbiAgICBpdGVtLmNvcHkoYnVmLCBwb3MpXG4gICAgcG9zICs9IGl0ZW0ubGVuZ3RoXG4gIH1cbiAgcmV0dXJuIGJ1ZlxufVxuXG5CdWZmZXIuYnl0ZUxlbmd0aCA9IGZ1bmN0aW9uIChzdHIsIGVuY29kaW5nKSB7XG4gIHZhciByZXRcbiAgc3RyID0gc3RyICsgJydcbiAgc3dpdGNoIChlbmNvZGluZyB8fCAndXRmOCcpIHtcbiAgICBjYXNlICdhc2NpaSc6XG4gICAgY2FzZSAnYmluYXJ5JzpcbiAgICBjYXNlICdyYXcnOlxuICAgICAgcmV0ID0gc3RyLmxlbmd0aFxuICAgICAgYnJlYWtcbiAgICBjYXNlICd1Y3MyJzpcbiAgICBjYXNlICd1Y3MtMic6XG4gICAgY2FzZSAndXRmMTZsZSc6XG4gICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgcmV0ID0gc3RyLmxlbmd0aCAqIDJcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAnaGV4JzpcbiAgICAgIHJldCA9IHN0ci5sZW5ndGggPj4+IDFcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAndXRmOCc6XG4gICAgY2FzZSAndXRmLTgnOlxuICAgICAgcmV0ID0gdXRmOFRvQnl0ZXMoc3RyKS5sZW5ndGhcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgIHJldCA9IGJhc2U2NFRvQnl0ZXMoc3RyKS5sZW5ndGhcbiAgICAgIGJyZWFrXG4gICAgZGVmYXVsdDpcbiAgICAgIHJldCA9IHN0ci5sZW5ndGhcbiAgfVxuICByZXR1cm4gcmV0XG59XG5cbi8vIHByZS1zZXQgZm9yIHZhbHVlcyB0aGF0IG1heSBleGlzdCBpbiB0aGUgZnV0dXJlXG5CdWZmZXIucHJvdG90eXBlLmxlbmd0aCA9IHVuZGVmaW5lZFxuQnVmZmVyLnByb3RvdHlwZS5wYXJlbnQgPSB1bmRlZmluZWRcblxuLy8gdG9TdHJpbmcoZW5jb2RpbmcsIHN0YXJ0PTAsIGVuZD1idWZmZXIubGVuZ3RoKVxuQnVmZmVyLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uIChlbmNvZGluZywgc3RhcnQsIGVuZCkge1xuICB2YXIgbG93ZXJlZENhc2UgPSBmYWxzZVxuXG4gIHN0YXJ0ID0gc3RhcnQgPj4+IDBcbiAgZW5kID0gZW5kID09PSB1bmRlZmluZWQgfHwgZW5kID09PSBJbmZpbml0eSA/IHRoaXMubGVuZ3RoIDogZW5kID4+PiAwXG5cbiAgaWYgKCFlbmNvZGluZykgZW5jb2RpbmcgPSAndXRmOCdcbiAgaWYgKHN0YXJ0IDwgMCkgc3RhcnQgPSAwXG4gIGlmIChlbmQgPiB0aGlzLmxlbmd0aCkgZW5kID0gdGhpcy5sZW5ndGhcbiAgaWYgKGVuZCA8PSBzdGFydCkgcmV0dXJuICcnXG5cbiAgd2hpbGUgKHRydWUpIHtcbiAgICBzd2l0Y2ggKGVuY29kaW5nKSB7XG4gICAgICBjYXNlICdoZXgnOlxuICAgICAgICByZXR1cm4gaGV4U2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAndXRmOCc6XG4gICAgICBjYXNlICd1dGYtOCc6XG4gICAgICAgIHJldHVybiB1dGY4U2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAnYXNjaWknOlxuICAgICAgICByZXR1cm4gYXNjaWlTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBjYXNlICdiaW5hcnknOlxuICAgICAgICByZXR1cm4gYmluYXJ5U2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgICAgcmV0dXJuIGJhc2U2NFNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ3VjczInOlxuICAgICAgY2FzZSAndWNzLTInOlxuICAgICAgY2FzZSAndXRmMTZsZSc6XG4gICAgICBjYXNlICd1dGYtMTZsZSc6XG4gICAgICAgIHJldHVybiB1dGYxNmxlU2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgaWYgKGxvd2VyZWRDYXNlKVxuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1Vua25vd24gZW5jb2Rpbmc6ICcgKyBlbmNvZGluZylcbiAgICAgICAgZW5jb2RpbmcgPSAoZW5jb2RpbmcgKyAnJykudG9Mb3dlckNhc2UoKVxuICAgICAgICBsb3dlcmVkQ2FzZSA9IHRydWVcbiAgICB9XG4gIH1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS5lcXVhbHMgPSBmdW5jdGlvbiAoYikge1xuICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcihiKSkgdGhyb3cgbmV3IFR5cGVFcnJvcignQXJndW1lbnQgbXVzdCBiZSBhIEJ1ZmZlcicpXG4gIGlmICh0aGlzID09PSBiKSByZXR1cm4gdHJ1ZVxuICByZXR1cm4gQnVmZmVyLmNvbXBhcmUodGhpcywgYikgPT09IDBcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5pbnNwZWN0ID0gZnVuY3Rpb24gKCkge1xuICB2YXIgc3RyID0gJydcbiAgdmFyIG1heCA9IGV4cG9ydHMuSU5TUEVDVF9NQVhfQllURVNcbiAgaWYgKHRoaXMubGVuZ3RoID4gMCkge1xuICAgIHN0ciA9IHRoaXMudG9TdHJpbmcoJ2hleCcsIDAsIG1heCkubWF0Y2goLy57Mn0vZykuam9pbignICcpXG4gICAgaWYgKHRoaXMubGVuZ3RoID4gbWF4KVxuICAgICAgc3RyICs9ICcgLi4uICdcbiAgfVxuICByZXR1cm4gJzxCdWZmZXIgJyArIHN0ciArICc+J1xufVxuXG5CdWZmZXIucHJvdG90eXBlLmNvbXBhcmUgPSBmdW5jdGlvbiAoYikge1xuICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcihiKSkgdGhyb3cgbmV3IFR5cGVFcnJvcignQXJndW1lbnQgbXVzdCBiZSBhIEJ1ZmZlcicpXG4gIGlmICh0aGlzID09PSBiKSByZXR1cm4gMFxuICByZXR1cm4gQnVmZmVyLmNvbXBhcmUodGhpcywgYilcbn1cblxuLy8gYGdldGAgd2lsbCBiZSByZW1vdmVkIGluIE5vZGUgMC4xMytcbkJ1ZmZlci5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24gKG9mZnNldCkge1xuICBjb25zb2xlLmxvZygnLmdldCgpIGlzIGRlcHJlY2F0ZWQuIEFjY2VzcyB1c2luZyBhcnJheSBpbmRleGVzIGluc3RlYWQuJylcbiAgcmV0dXJuIHRoaXMucmVhZFVJbnQ4KG9mZnNldClcbn1cblxuLy8gYHNldGAgd2lsbCBiZSByZW1vdmVkIGluIE5vZGUgMC4xMytcbkJ1ZmZlci5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24gKHYsIG9mZnNldCkge1xuICBjb25zb2xlLmxvZygnLnNldCgpIGlzIGRlcHJlY2F0ZWQuIEFjY2VzcyB1c2luZyBhcnJheSBpbmRleGVzIGluc3RlYWQuJylcbiAgcmV0dXJuIHRoaXMud3JpdGVVSW50OCh2LCBvZmZzZXQpXG59XG5cbmZ1bmN0aW9uIGhleFdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgb2Zmc2V0ID0gTnVtYmVyKG9mZnNldCkgfHwgMFxuICB2YXIgcmVtYWluaW5nID0gYnVmLmxlbmd0aCAtIG9mZnNldFxuICBpZiAoIWxlbmd0aCkge1xuICAgIGxlbmd0aCA9IHJlbWFpbmluZ1xuICB9IGVsc2Uge1xuICAgIGxlbmd0aCA9IE51bWJlcihsZW5ndGgpXG4gICAgaWYgKGxlbmd0aCA+IHJlbWFpbmluZykge1xuICAgICAgbGVuZ3RoID0gcmVtYWluaW5nXG4gICAgfVxuICB9XG5cbiAgLy8gbXVzdCBiZSBhbiBldmVuIG51bWJlciBvZiBkaWdpdHNcbiAgdmFyIHN0ckxlbiA9IHN0cmluZy5sZW5ndGhcbiAgaWYgKHN0ckxlbiAlIDIgIT09IDApIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBoZXggc3RyaW5nJylcblxuICBpZiAobGVuZ3RoID4gc3RyTGVuIC8gMikge1xuICAgIGxlbmd0aCA9IHN0ckxlbiAvIDJcbiAgfVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGJ5dGUgPSBwYXJzZUludChzdHJpbmcuc3Vic3RyKGkgKiAyLCAyKSwgMTYpXG4gICAgaWYgKGlzTmFOKGJ5dGUpKSB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgaGV4IHN0cmluZycpXG4gICAgYnVmW29mZnNldCArIGldID0gYnl0ZVxuICB9XG4gIHJldHVybiBpXG59XG5cbmZ1bmN0aW9uIHV0ZjhXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHZhciBjaGFyc1dyaXR0ZW4gPSBibGl0QnVmZmVyKHV0ZjhUb0J5dGVzKHN0cmluZywgYnVmLmxlbmd0aCAtIG9mZnNldCksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG4gIHJldHVybiBjaGFyc1dyaXR0ZW5cbn1cblxuZnVuY3Rpb24gYXNjaWlXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHZhciBjaGFyc1dyaXR0ZW4gPSBibGl0QnVmZmVyKGFzY2lpVG9CeXRlcyhzdHJpbmcpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxuICByZXR1cm4gY2hhcnNXcml0dGVuXG59XG5cbmZ1bmN0aW9uIGJpbmFyeVdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgcmV0dXJuIGFzY2lpV3JpdGUoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxufVxuXG5mdW5jdGlvbiBiYXNlNjRXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHZhciBjaGFyc1dyaXR0ZW4gPSBibGl0QnVmZmVyKGJhc2U2NFRvQnl0ZXMoc3RyaW5nKSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbiAgcmV0dXJuIGNoYXJzV3JpdHRlblxufVxuXG5mdW5jdGlvbiB1dGYxNmxlV3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICB2YXIgY2hhcnNXcml0dGVuID0gYmxpdEJ1ZmZlcih1dGYxNmxlVG9CeXRlcyhzdHJpbmcsIGJ1Zi5sZW5ndGggLSBvZmZzZXQpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxuICByZXR1cm4gY2hhcnNXcml0dGVuXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGUgPSBmdW5jdGlvbiAoc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCwgZW5jb2RpbmcpIHtcbiAgLy8gU3VwcG9ydCBib3RoIChzdHJpbmcsIG9mZnNldCwgbGVuZ3RoLCBlbmNvZGluZylcbiAgLy8gYW5kIHRoZSBsZWdhY3kgKHN0cmluZywgZW5jb2RpbmcsIG9mZnNldCwgbGVuZ3RoKVxuICBpZiAoaXNGaW5pdGUob2Zmc2V0KSkge1xuICAgIGlmICghaXNGaW5pdGUobGVuZ3RoKSkge1xuICAgICAgZW5jb2RpbmcgPSBsZW5ndGhcbiAgICAgIGxlbmd0aCA9IHVuZGVmaW5lZFxuICAgIH1cbiAgfSBlbHNlIHsgIC8vIGxlZ2FjeVxuICAgIHZhciBzd2FwID0gZW5jb2RpbmdcbiAgICBlbmNvZGluZyA9IG9mZnNldFxuICAgIG9mZnNldCA9IGxlbmd0aFxuICAgIGxlbmd0aCA9IHN3YXBcbiAgfVxuXG4gIG9mZnNldCA9IE51bWJlcihvZmZzZXQpIHx8IDBcblxuICBpZiAobGVuZ3RoIDwgMCB8fCBvZmZzZXQgPCAwIHx8IG9mZnNldCA+IHRoaXMubGVuZ3RoKVxuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdhdHRlbXB0IHRvIHdyaXRlIG91dHNpZGUgYnVmZmVyIGJvdW5kcycpXG5cbiAgdmFyIHJlbWFpbmluZyA9IHRoaXMubGVuZ3RoIC0gb2Zmc2V0XG4gIGlmICghbGVuZ3RoKSB7XG4gICAgbGVuZ3RoID0gcmVtYWluaW5nXG4gIH0gZWxzZSB7XG4gICAgbGVuZ3RoID0gTnVtYmVyKGxlbmd0aClcbiAgICBpZiAobGVuZ3RoID4gcmVtYWluaW5nKSB7XG4gICAgICBsZW5ndGggPSByZW1haW5pbmdcbiAgICB9XG4gIH1cbiAgZW5jb2RpbmcgPSBTdHJpbmcoZW5jb2RpbmcgfHwgJ3V0ZjgnKS50b0xvd2VyQ2FzZSgpXG5cbiAgdmFyIHJldFxuICBzd2l0Y2ggKGVuY29kaW5nKSB7XG4gICAgY2FzZSAnaGV4JzpcbiAgICAgIHJldCA9IGhleFdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG4gICAgICBicmVha1xuICAgIGNhc2UgJ3V0ZjgnOlxuICAgIGNhc2UgJ3V0Zi04JzpcbiAgICAgIHJldCA9IHV0ZjhXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICdhc2NpaSc6XG4gICAgICByZXQgPSBhc2NpaVdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG4gICAgICBicmVha1xuICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgICByZXQgPSBiaW5hcnlXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICdiYXNlNjQnOlxuICAgICAgcmV0ID0gYmFzZTY0V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAndWNzMic6XG4gICAgY2FzZSAndWNzLTInOlxuICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgIHJldCA9IHV0ZjE2bGVXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuICAgICAgYnJlYWtcbiAgICBkZWZhdWx0OlxuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVW5rbm93biBlbmNvZGluZzogJyArIGVuY29kaW5nKVxuICB9XG4gIHJldHVybiByZXRcbn1cblxuQnVmZmVyLnByb3RvdHlwZS50b0pTT04gPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB7XG4gICAgdHlwZTogJ0J1ZmZlcicsXG4gICAgZGF0YTogQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwodGhpcy5fYXJyIHx8IHRoaXMsIDApXG4gIH1cbn1cblxuZnVuY3Rpb24gYmFzZTY0U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICBpZiAoc3RhcnQgPT09IDAgJiYgZW5kID09PSBidWYubGVuZ3RoKSB7XG4gICAgcmV0dXJuIGJhc2U2NC5mcm9tQnl0ZUFycmF5KGJ1ZilcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gYmFzZTY0LmZyb21CeXRlQXJyYXkoYnVmLnNsaWNlKHN0YXJ0LCBlbmQpKVxuICB9XG59XG5cbmZ1bmN0aW9uIHV0ZjhTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciByZXMgPSAnJ1xuICB2YXIgdG1wID0gJydcbiAgZW5kID0gTWF0aC5taW4oYnVmLmxlbmd0aCwgZW5kKVxuXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgaSsrKSB7XG4gICAgaWYgKGJ1ZltpXSA8PSAweDdGKSB7XG4gICAgICByZXMgKz0gZGVjb2RlVXRmOENoYXIodG1wKSArIFN0cmluZy5mcm9tQ2hhckNvZGUoYnVmW2ldKVxuICAgICAgdG1wID0gJydcbiAgICB9IGVsc2Uge1xuICAgICAgdG1wICs9ICclJyArIGJ1ZltpXS50b1N0cmluZygxNilcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcmVzICsgZGVjb2RlVXRmOENoYXIodG1wKVxufVxuXG5mdW5jdGlvbiBhc2NpaVNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHJldCA9ICcnXG4gIGVuZCA9IE1hdGgubWluKGJ1Zi5sZW5ndGgsIGVuZClcblxuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7IGkrKykge1xuICAgIHJldCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ1ZltpXSAmIDB4N0YpXG4gIH1cbiAgcmV0dXJuIHJldFxufVxuXG5mdW5jdGlvbiBiaW5hcnlTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciByZXQgPSAnJ1xuICBlbmQgPSBNYXRoLm1pbihidWYubGVuZ3RoLCBlbmQpXG5cbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyBpKyspIHtcbiAgICByZXQgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShidWZbaV0pXG4gIH1cbiAgcmV0dXJuIHJldFxufVxuXG5mdW5jdGlvbiBoZXhTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciBsZW4gPSBidWYubGVuZ3RoXG5cbiAgaWYgKCFzdGFydCB8fCBzdGFydCA8IDApIHN0YXJ0ID0gMFxuICBpZiAoIWVuZCB8fCBlbmQgPCAwIHx8IGVuZCA+IGxlbikgZW5kID0gbGVuXG5cbiAgdmFyIG91dCA9ICcnXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgaSsrKSB7XG4gICAgb3V0ICs9IHRvSGV4KGJ1ZltpXSlcbiAgfVxuICByZXR1cm4gb3V0XG59XG5cbmZ1bmN0aW9uIHV0ZjE2bGVTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciBieXRlcyA9IGJ1Zi5zbGljZShzdGFydCwgZW5kKVxuICB2YXIgcmVzID0gJydcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBieXRlcy5sZW5ndGg7IGkgKz0gMikge1xuICAgIHJlcyArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ5dGVzW2ldICsgYnl0ZXNbaSArIDFdICogMjU2KVxuICB9XG4gIHJldHVybiByZXNcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5zbGljZSA9IGZ1bmN0aW9uIChzdGFydCwgZW5kKSB7XG4gIHZhciBsZW4gPSB0aGlzLmxlbmd0aFxuICBzdGFydCA9IH5+c3RhcnRcbiAgZW5kID0gZW5kID09PSB1bmRlZmluZWQgPyBsZW4gOiB+fmVuZFxuXG4gIGlmIChzdGFydCA8IDApIHtcbiAgICBzdGFydCArPSBsZW5cbiAgICBpZiAoc3RhcnQgPCAwKVxuICAgICAgc3RhcnQgPSAwXG4gIH0gZWxzZSBpZiAoc3RhcnQgPiBsZW4pIHtcbiAgICBzdGFydCA9IGxlblxuICB9XG5cbiAgaWYgKGVuZCA8IDApIHtcbiAgICBlbmQgKz0gbGVuXG4gICAgaWYgKGVuZCA8IDApXG4gICAgICBlbmQgPSAwXG4gIH0gZWxzZSBpZiAoZW5kID4gbGVuKSB7XG4gICAgZW5kID0gbGVuXG4gIH1cblxuICBpZiAoZW5kIDwgc3RhcnQpXG4gICAgZW5kID0gc3RhcnRcblxuICB2YXIgbmV3QnVmXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIG5ld0J1ZiA9IEJ1ZmZlci5fYXVnbWVudCh0aGlzLnN1YmFycmF5KHN0YXJ0LCBlbmQpKVxuICB9IGVsc2Uge1xuICAgIHZhciBzbGljZUxlbiA9IGVuZCAtIHN0YXJ0XG4gICAgbmV3QnVmID0gbmV3IEJ1ZmZlcihzbGljZUxlbiwgdW5kZWZpbmVkLCB0cnVlKVxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2xpY2VMZW47IGkrKykge1xuICAgICAgbmV3QnVmW2ldID0gdGhpc1tpICsgc3RhcnRdXG4gICAgfVxuICB9XG5cbiAgaWYgKG5ld0J1Zi5sZW5ndGgpXG4gICAgbmV3QnVmLnBhcmVudCA9IHRoaXMucGFyZW50IHx8IHRoaXNcblxuICByZXR1cm4gbmV3QnVmXG59XG5cbi8qXG4gKiBOZWVkIHRvIG1ha2Ugc3VyZSB0aGF0IGJ1ZmZlciBpc24ndCB0cnlpbmcgdG8gd3JpdGUgb3V0IG9mIGJvdW5kcy5cbiAqL1xuZnVuY3Rpb24gY2hlY2tPZmZzZXQgKG9mZnNldCwgZXh0LCBsZW5ndGgpIHtcbiAgaWYgKChvZmZzZXQgJSAxKSAhPT0gMCB8fCBvZmZzZXQgPCAwKVxuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdvZmZzZXQgaXMgbm90IHVpbnQnKVxuICBpZiAob2Zmc2V0ICsgZXh0ID4gbGVuZ3RoKVxuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdUcnlpbmcgdG8gYWNjZXNzIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludExFID0gZnVuY3Rpb24gKG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tPZmZzZXQob2Zmc2V0LCBieXRlTGVuZ3RoLCB0aGlzLmxlbmd0aClcblxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXRdXG4gIHZhciBtdWwgPSAxXG4gIHZhciBpID0gMFxuICB3aGlsZSAoKytpIDwgYnl0ZUxlbmd0aCAmJiAobXVsICo9IDB4MTAwKSlcbiAgICB2YWwgKz0gdGhpc1tvZmZzZXQgKyBpXSAqIG11bFxuXG4gIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludEJFID0gZnVuY3Rpb24gKG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tPZmZzZXQob2Zmc2V0LCBieXRlTGVuZ3RoLCB0aGlzLmxlbmd0aClcblxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXQgKyAtLWJ5dGVMZW5ndGhdXG4gIHZhciBtdWwgPSAxXG4gIHdoaWxlIChieXRlTGVuZ3RoID4gMCAmJiAobXVsICo9IDB4MTAwKSlcbiAgICB2YWwgKz0gdGhpc1tvZmZzZXQgKyAtLWJ5dGVMZW5ndGhdICogbXVsXG5cbiAgcmV0dXJuIHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50OCA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tPZmZzZXQob2Zmc2V0LCAxLCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIHRoaXNbb2Zmc2V0XVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MTZMRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tPZmZzZXQob2Zmc2V0LCAyLCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIHRoaXNbb2Zmc2V0XSB8ICh0aGlzW29mZnNldCArIDFdIDw8IDgpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQxNkJFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja09mZnNldChvZmZzZXQsIDIsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gKHRoaXNbb2Zmc2V0XSA8PCA4KSB8IHRoaXNbb2Zmc2V0ICsgMV1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDMyTEUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KVxuICAgIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG5cbiAgcmV0dXJuICgodGhpc1tvZmZzZXRdKSB8XG4gICAgICAodGhpc1tvZmZzZXQgKyAxXSA8PCA4KSB8XG4gICAgICAodGhpc1tvZmZzZXQgKyAyXSA8PCAxNikpICtcbiAgICAgICh0aGlzW29mZnNldCArIDNdICogMHgxMDAwMDAwKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MzJCRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcblxuICByZXR1cm4gKHRoaXNbb2Zmc2V0XSAqIDB4MTAwMDAwMCkgK1xuICAgICAgKCh0aGlzW29mZnNldCArIDFdIDw8IDE2KSB8XG4gICAgICAodGhpc1tvZmZzZXQgKyAyXSA8PCA4KSB8XG4gICAgICB0aGlzW29mZnNldCArIDNdKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnRMRSA9IGZ1bmN0aW9uIChvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KVxuICAgIGNoZWNrT2Zmc2V0KG9mZnNldCwgYnl0ZUxlbmd0aCwgdGhpcy5sZW5ndGgpXG5cbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0XVxuICB2YXIgbXVsID0gMVxuICB2YXIgaSA9IDBcbiAgd2hpbGUgKCsraSA8IGJ5dGVMZW5ndGggJiYgKG11bCAqPSAweDEwMCkpXG4gICAgdmFsICs9IHRoaXNbb2Zmc2V0ICsgaV0gKiBtdWxcbiAgbXVsICo9IDB4ODBcblxuICBpZiAodmFsID49IG11bClcbiAgICB2YWwgLT0gTWF0aC5wb3coMiwgOCAqIGJ5dGVMZW5ndGgpXG5cbiAgcmV0dXJuIHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnRCRSA9IGZ1bmN0aW9uIChvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KVxuICAgIGNoZWNrT2Zmc2V0KG9mZnNldCwgYnl0ZUxlbmd0aCwgdGhpcy5sZW5ndGgpXG5cbiAgdmFyIGkgPSBieXRlTGVuZ3RoXG4gIHZhciBtdWwgPSAxXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldCArIC0taV1cbiAgd2hpbGUgKGkgPiAwICYmIChtdWwgKj0gMHgxMDApKVxuICAgIHZhbCArPSB0aGlzW29mZnNldCArIC0taV0gKiBtdWxcbiAgbXVsICo9IDB4ODBcblxuICBpZiAodmFsID49IG11bClcbiAgICB2YWwgLT0gTWF0aC5wb3coMiwgOCAqIGJ5dGVMZW5ndGgpXG5cbiAgcmV0dXJuIHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQ4ID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja09mZnNldChvZmZzZXQsIDEsIHRoaXMubGVuZ3RoKVxuICBpZiAoISh0aGlzW29mZnNldF0gJiAweDgwKSlcbiAgICByZXR1cm4gKHRoaXNbb2Zmc2V0XSlcbiAgcmV0dXJuICgoMHhmZiAtIHRoaXNbb2Zmc2V0XSArIDEpICogLTEpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDE2TEUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KVxuICAgIGNoZWNrT2Zmc2V0KG9mZnNldCwgMiwgdGhpcy5sZW5ndGgpXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldF0gfCAodGhpc1tvZmZzZXQgKyAxXSA8PCA4KVxuICByZXR1cm4gKHZhbCAmIDB4ODAwMCkgPyB2YWwgfCAweEZGRkYwMDAwIDogdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDE2QkUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KVxuICAgIGNoZWNrT2Zmc2V0KG9mZnNldCwgMiwgdGhpcy5sZW5ndGgpXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldCArIDFdIHwgKHRoaXNbb2Zmc2V0XSA8PCA4KVxuICByZXR1cm4gKHZhbCAmIDB4ODAwMCkgPyB2YWwgfCAweEZGRkYwMDAwIDogdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDMyTEUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KVxuICAgIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG5cbiAgcmV0dXJuICh0aGlzW29mZnNldF0pIHxcbiAgICAgICh0aGlzW29mZnNldCArIDFdIDw8IDgpIHxcbiAgICAgICh0aGlzW29mZnNldCArIDJdIDw8IDE2KSB8XG4gICAgICAodGhpc1tvZmZzZXQgKyAzXSA8PCAyNClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MzJCRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcblxuICByZXR1cm4gKHRoaXNbb2Zmc2V0XSA8PCAyNCkgfFxuICAgICAgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgMTYpIHxcbiAgICAgICh0aGlzW29mZnNldCArIDJdIDw8IDgpIHxcbiAgICAgICh0aGlzW29mZnNldCArIDNdKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRGbG9hdExFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsIG9mZnNldCwgdHJ1ZSwgMjMsIDQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEZsb2F0QkUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KVxuICAgIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiBpZWVlNzU0LnJlYWQodGhpcywgb2Zmc2V0LCBmYWxzZSwgMjMsIDQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZERvdWJsZUxFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja09mZnNldChvZmZzZXQsIDgsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsIG9mZnNldCwgdHJ1ZSwgNTIsIDgpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZERvdWJsZUJFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja09mZnNldChvZmZzZXQsIDgsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsIG9mZnNldCwgZmFsc2UsIDUyLCA4KVxufVxuXG5mdW5jdGlvbiBjaGVja0ludCAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBleHQsIG1heCwgbWluKSB7XG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKGJ1ZikpIHRocm93IG5ldyBUeXBlRXJyb3IoJ2J1ZmZlciBtdXN0IGJlIGEgQnVmZmVyIGluc3RhbmNlJylcbiAgaWYgKHZhbHVlID4gbWF4IHx8IHZhbHVlIDwgbWluKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcigndmFsdWUgaXMgb3V0IG9mIGJvdW5kcycpXG4gIGlmIChvZmZzZXQgKyBleHQgPiBidWYubGVuZ3RoKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignaW5kZXggb3V0IG9mIHJhbmdlJylcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnRMRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggPj4+IDBcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aCksIDApXG5cbiAgdmFyIG11bCA9IDFcbiAgdmFyIGkgPSAwXG4gIHRoaXNbb2Zmc2V0XSA9IHZhbHVlICYgMHhGRlxuICB3aGlsZSAoKytpIDwgYnl0ZUxlbmd0aCAmJiAobXVsICo9IDB4MTAwKSlcbiAgICB0aGlzW29mZnNldCArIGldID0gKHZhbHVlIC8gbXVsKSA+Pj4gMCAmIDB4RkZcblxuICByZXR1cm4gb2Zmc2V0ICsgYnl0ZUxlbmd0aFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludEJFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KVxuICAgIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIE1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoKSwgMClcblxuICB2YXIgaSA9IGJ5dGVMZW5ndGggLSAxXG4gIHZhciBtdWwgPSAxXG4gIHRoaXNbb2Zmc2V0ICsgaV0gPSB2YWx1ZSAmIDB4RkZcbiAgd2hpbGUgKC0taSA+PSAwICYmIChtdWwgKj0gMHgxMDApKVxuICAgIHRoaXNbb2Zmc2V0ICsgaV0gPSAodmFsdWUgLyBtdWwpID4+PiAwICYgMHhGRlxuXG4gIHJldHVybiBvZmZzZXQgKyBieXRlTGVuZ3RoXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50OCA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAxLCAweGZmLCAwKVxuICBpZiAoIUJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB2YWx1ZSA9IE1hdGguZmxvb3IodmFsdWUpXG4gIHRoaXNbb2Zmc2V0XSA9IHZhbHVlXG4gIHJldHVybiBvZmZzZXQgKyAxXG59XG5cbmZ1bmN0aW9uIG9iamVjdFdyaXRlVUludDE2IChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbikge1xuICBpZiAodmFsdWUgPCAwKSB2YWx1ZSA9IDB4ZmZmZiArIHZhbHVlICsgMVxuICBmb3IgKHZhciBpID0gMCwgaiA9IE1hdGgubWluKGJ1Zi5sZW5ndGggLSBvZmZzZXQsIDIpOyBpIDwgajsgaSsrKSB7XG4gICAgYnVmW29mZnNldCArIGldID0gKHZhbHVlICYgKDB4ZmYgPDwgKDggKiAobGl0dGxlRW5kaWFuID8gaSA6IDEgLSBpKSkpKSA+Pj5cbiAgICAgIChsaXR0bGVFbmRpYW4gPyBpIDogMSAtIGkpICogOFxuICB9XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MTZMRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAyLCAweGZmZmYsIDApXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIHRoaXNbb2Zmc2V0XSA9IHZhbHVlXG4gICAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gOClcbiAgfSBlbHNlIG9iamVjdFdyaXRlVUludDE2KHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUpXG4gIHJldHVybiBvZmZzZXQgKyAyXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MTZCRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAyLCAweGZmZmYsIDApXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSA+Pj4gOClcbiAgICB0aGlzW29mZnNldCArIDFdID0gdmFsdWVcbiAgfSBlbHNlIG9iamVjdFdyaXRlVUludDE2KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlKVxuICByZXR1cm4gb2Zmc2V0ICsgMlxufVxuXG5mdW5jdGlvbiBvYmplY3RXcml0ZVVJbnQzMiAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4pIHtcbiAgaWYgKHZhbHVlIDwgMCkgdmFsdWUgPSAweGZmZmZmZmZmICsgdmFsdWUgKyAxXG4gIGZvciAodmFyIGkgPSAwLCBqID0gTWF0aC5taW4oYnVmLmxlbmd0aCAtIG9mZnNldCwgNCk7IGkgPCBqOyBpKyspIHtcbiAgICBidWZbb2Zmc2V0ICsgaV0gPSAodmFsdWUgPj4+IChsaXR0bGVFbmRpYW4gPyBpIDogMyAtIGkpICogOCkgJiAweGZmXG4gIH1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQzMkxFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KVxuICAgIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDQsIDB4ZmZmZmZmZmYsIDApXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIHRoaXNbb2Zmc2V0ICsgM10gPSAodmFsdWUgPj4+IDI0KVxuICAgIHRoaXNbb2Zmc2V0ICsgMl0gPSAodmFsdWUgPj4+IDE2KVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDgpXG4gICAgdGhpc1tvZmZzZXRdID0gdmFsdWVcbiAgfSBlbHNlIG9iamVjdFdyaXRlVUludDMyKHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUpXG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MzJCRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCA0LCAweGZmZmZmZmZmLCAwKVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldF0gPSAodmFsdWUgPj4+IDI0KVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDE2KVxuICAgIHRoaXNbb2Zmc2V0ICsgMl0gPSAodmFsdWUgPj4+IDgpXG4gICAgdGhpc1tvZmZzZXQgKyAzXSA9IHZhbHVlXG4gIH0gZWxzZSBvYmplY3RXcml0ZVVJbnQzMih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSlcbiAgcmV0dXJuIG9mZnNldCArIDRcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludExFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgY2hlY2tJbnQodGhpcyxcbiAgICAgICAgICAgICB2YWx1ZSxcbiAgICAgICAgICAgICBvZmZzZXQsXG4gICAgICAgICAgICAgYnl0ZUxlbmd0aCxcbiAgICAgICAgICAgICBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aCAtIDEpIC0gMSxcbiAgICAgICAgICAgICAtTWF0aC5wb3coMiwgOCAqIGJ5dGVMZW5ndGggLSAxKSlcbiAgfVxuXG4gIHZhciBpID0gMFxuICB2YXIgbXVsID0gMVxuICB2YXIgc3ViID0gdmFsdWUgPCAwID8gMSA6IDBcbiAgdGhpc1tvZmZzZXRdID0gdmFsdWUgJiAweEZGXG4gIHdoaWxlICgrK2kgPCBieXRlTGVuZ3RoICYmIChtdWwgKj0gMHgxMDApKVxuICAgIHRoaXNbb2Zmc2V0ICsgaV0gPSAoKHZhbHVlIC8gbXVsKSA+PiAwKSAtIHN1YiAmIDB4RkZcblxuICByZXR1cm4gb2Zmc2V0ICsgYnl0ZUxlbmd0aFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50QkUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBjaGVja0ludCh0aGlzLFxuICAgICAgICAgICAgIHZhbHVlLFxuICAgICAgICAgICAgIG9mZnNldCxcbiAgICAgICAgICAgICBieXRlTGVuZ3RoLFxuICAgICAgICAgICAgIE1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoIC0gMSkgLSAxLFxuICAgICAgICAgICAgIC1NYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aCAtIDEpKVxuICB9XG5cbiAgdmFyIGkgPSBieXRlTGVuZ3RoIC0gMVxuICB2YXIgbXVsID0gMVxuICB2YXIgc3ViID0gdmFsdWUgPCAwID8gMSA6IDBcbiAgdGhpc1tvZmZzZXQgKyBpXSA9IHZhbHVlICYgMHhGRlxuICB3aGlsZSAoLS1pID49IDAgJiYgKG11bCAqPSAweDEwMCkpXG4gICAgdGhpc1tvZmZzZXQgKyBpXSA9ICgodmFsdWUgLyBtdWwpID4+IDApIC0gc3ViICYgMHhGRlxuXG4gIHJldHVybiBvZmZzZXQgKyBieXRlTGVuZ3RoXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQ4ID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KVxuICAgIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDEsIDB4N2YsIC0weDgwKVxuICBpZiAoIUJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB2YWx1ZSA9IE1hdGguZmxvb3IodmFsdWUpXG4gIGlmICh2YWx1ZSA8IDApIHZhbHVlID0gMHhmZiArIHZhbHVlICsgMVxuICB0aGlzW29mZnNldF0gPSB2YWx1ZVxuICByZXR1cm4gb2Zmc2V0ICsgMVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MTZMRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAyLCAweDdmZmYsIC0weDgwMDApXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIHRoaXNbb2Zmc2V0XSA9IHZhbHVlXG4gICAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gOClcbiAgfSBlbHNlIG9iamVjdFdyaXRlVUludDE2KHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUpXG4gIHJldHVybiBvZmZzZXQgKyAyXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQxNkJFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KVxuICAgIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDIsIDB4N2ZmZiwgLTB4ODAwMClcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgdGhpc1tvZmZzZXRdID0gKHZhbHVlID4+PiA4KVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSB2YWx1ZVxuICB9IGVsc2Ugb2JqZWN0V3JpdGVVSW50MTYodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UpXG4gIHJldHVybiBvZmZzZXQgKyAyXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQzMkxFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KVxuICAgIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDQsIDB4N2ZmZmZmZmYsIC0weDgwMDAwMDAwKVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldF0gPSB2YWx1ZVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDgpXG4gICAgdGhpc1tvZmZzZXQgKyAyXSA9ICh2YWx1ZSA+Pj4gMTYpXG4gICAgdGhpc1tvZmZzZXQgKyAzXSA9ICh2YWx1ZSA+Pj4gMjQpXG4gIH0gZWxzZSBvYmplY3RXcml0ZVVJbnQzMih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlKVxuICByZXR1cm4gb2Zmc2V0ICsgNFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MzJCRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCA0LCAweDdmZmZmZmZmLCAtMHg4MDAwMDAwMClcbiAgaWYgKHZhbHVlIDwgMCkgdmFsdWUgPSAweGZmZmZmZmZmICsgdmFsdWUgKyAxXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSA+Pj4gMjQpXG4gICAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gMTYpXG4gICAgdGhpc1tvZmZzZXQgKyAyXSA9ICh2YWx1ZSA+Pj4gOClcbiAgICB0aGlzW29mZnNldCArIDNdID0gdmFsdWVcbiAgfSBlbHNlIG9iamVjdFdyaXRlVUludDMyKHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlKVxuICByZXR1cm4gb2Zmc2V0ICsgNFxufVxuXG5mdW5jdGlvbiBjaGVja0lFRUU3NTQgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgZXh0LCBtYXgsIG1pbikge1xuICBpZiAodmFsdWUgPiBtYXggfHwgdmFsdWUgPCBtaW4pIHRocm93IG5ldyBSYW5nZUVycm9yKCd2YWx1ZSBpcyBvdXQgb2YgYm91bmRzJylcbiAgaWYgKG9mZnNldCArIGV4dCA+IGJ1Zi5sZW5ndGgpIHRocm93IG5ldyBSYW5nZUVycm9yKCdpbmRleCBvdXQgb2YgcmFuZ2UnKVxuICBpZiAob2Zmc2V0IDwgMCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ2luZGV4IG91dCBvZiByYW5nZScpXG59XG5cbmZ1bmN0aW9uIHdyaXRlRmxvYXQgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KVxuICAgIGNoZWNrSUVFRTc1NChidWYsIHZhbHVlLCBvZmZzZXQsIDQsIDMuNDAyODIzNDY2Mzg1Mjg4NmUrMzgsIC0zLjQwMjgyMzQ2NjM4NTI4ODZlKzM4KVxuICBpZWVlNzU0LndyaXRlKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCAyMywgNClcbiAgcmV0dXJuIG9mZnNldCArIDRcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUZsb2F0TEUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHdyaXRlRmxvYXQodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVGbG9hdEJFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZUZsb2F0KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuZnVuY3Rpb24gd3JpdGVEb3VibGUgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KVxuICAgIGNoZWNrSUVFRTc1NChidWYsIHZhbHVlLCBvZmZzZXQsIDgsIDEuNzk3NjkzMTM0ODYyMzE1N0UrMzA4LCAtMS43OTc2OTMxMzQ4NjIzMTU3RSszMDgpXG4gIGllZWU3NTQud3JpdGUoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIDUyLCA4KVxuICByZXR1cm4gb2Zmc2V0ICsgOFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRG91YmxlTEUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHdyaXRlRG91YmxlKHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRG91YmxlQkUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHdyaXRlRG91YmxlKHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuLy8gY29weSh0YXJnZXRCdWZmZXIsIHRhcmdldFN0YXJ0PTAsIHNvdXJjZVN0YXJ0PTAsIHNvdXJjZUVuZD1idWZmZXIubGVuZ3RoKVxuQnVmZmVyLnByb3RvdHlwZS5jb3B5ID0gZnVuY3Rpb24gKHRhcmdldCwgdGFyZ2V0X3N0YXJ0LCBzdGFydCwgZW5kKSB7XG4gIHZhciBzZWxmID0gdGhpcyAvLyBzb3VyY2VcblxuICBpZiAoIXN0YXJ0KSBzdGFydCA9IDBcbiAgaWYgKCFlbmQgJiYgZW5kICE9PSAwKSBlbmQgPSB0aGlzLmxlbmd0aFxuICBpZiAodGFyZ2V0X3N0YXJ0ID49IHRhcmdldC5sZW5ndGgpIHRhcmdldF9zdGFydCA9IHRhcmdldC5sZW5ndGhcbiAgaWYgKCF0YXJnZXRfc3RhcnQpIHRhcmdldF9zdGFydCA9IDBcbiAgaWYgKGVuZCA+IDAgJiYgZW5kIDwgc3RhcnQpIGVuZCA9IHN0YXJ0XG5cbiAgLy8gQ29weSAwIGJ5dGVzOyB3ZSdyZSBkb25lXG4gIGlmIChlbmQgPT09IHN0YXJ0KSByZXR1cm4gMFxuICBpZiAodGFyZ2V0Lmxlbmd0aCA9PT0gMCB8fCBzZWxmLmxlbmd0aCA9PT0gMCkgcmV0dXJuIDBcblxuICAvLyBGYXRhbCBlcnJvciBjb25kaXRpb25zXG4gIGlmICh0YXJnZXRfc3RhcnQgPCAwKVxuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCd0YXJnZXRTdGFydCBvdXQgb2YgYm91bmRzJylcbiAgaWYgKHN0YXJ0IDwgMCB8fCBzdGFydCA+PSBzZWxmLmxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ3NvdXJjZVN0YXJ0IG91dCBvZiBib3VuZHMnKVxuICBpZiAoZW5kIDwgMCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ3NvdXJjZUVuZCBvdXQgb2YgYm91bmRzJylcblxuICAvLyBBcmUgd2Ugb29iP1xuICBpZiAoZW5kID4gdGhpcy5sZW5ndGgpXG4gICAgZW5kID0gdGhpcy5sZW5ndGhcbiAgaWYgKHRhcmdldC5sZW5ndGggLSB0YXJnZXRfc3RhcnQgPCBlbmQgLSBzdGFydClcbiAgICBlbmQgPSB0YXJnZXQubGVuZ3RoIC0gdGFyZ2V0X3N0YXJ0ICsgc3RhcnRcblxuICB2YXIgbGVuID0gZW5kIC0gc3RhcnRcblxuICBpZiAobGVuIDwgMTAwMCB8fCAhQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICB0YXJnZXRbaSArIHRhcmdldF9zdGFydF0gPSB0aGlzW2kgKyBzdGFydF1cbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgdGFyZ2V0Ll9zZXQodGhpcy5zdWJhcnJheShzdGFydCwgc3RhcnQgKyBsZW4pLCB0YXJnZXRfc3RhcnQpXG4gIH1cblxuICByZXR1cm4gbGVuXG59XG5cbi8vIGZpbGwodmFsdWUsIHN0YXJ0PTAsIGVuZD1idWZmZXIubGVuZ3RoKVxuQnVmZmVyLnByb3RvdHlwZS5maWxsID0gZnVuY3Rpb24gKHZhbHVlLCBzdGFydCwgZW5kKSB7XG4gIGlmICghdmFsdWUpIHZhbHVlID0gMFxuICBpZiAoIXN0YXJ0KSBzdGFydCA9IDBcbiAgaWYgKCFlbmQpIGVuZCA9IHRoaXMubGVuZ3RoXG5cbiAgaWYgKGVuZCA8IHN0YXJ0KSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignZW5kIDwgc3RhcnQnKVxuXG4gIC8vIEZpbGwgMCBieXRlczsgd2UncmUgZG9uZVxuICBpZiAoZW5kID09PSBzdGFydCkgcmV0dXJuXG4gIGlmICh0aGlzLmxlbmd0aCA9PT0gMCkgcmV0dXJuXG5cbiAgaWYgKHN0YXJ0IDwgMCB8fCBzdGFydCA+PSB0aGlzLmxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ3N0YXJ0IG91dCBvZiBib3VuZHMnKVxuICBpZiAoZW5kIDwgMCB8fCBlbmQgPiB0aGlzLmxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ2VuZCBvdXQgb2YgYm91bmRzJylcblxuICB2YXIgaVxuICBpZiAodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJykge1xuICAgIGZvciAoaSA9IHN0YXJ0OyBpIDwgZW5kOyBpKyspIHtcbiAgICAgIHRoaXNbaV0gPSB2YWx1ZVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB2YXIgYnl0ZXMgPSB1dGY4VG9CeXRlcyh2YWx1ZS50b1N0cmluZygpKVxuICAgIHZhciBsZW4gPSBieXRlcy5sZW5ndGhcbiAgICBmb3IgKGkgPSBzdGFydDsgaSA8IGVuZDsgaSsrKSB7XG4gICAgICB0aGlzW2ldID0gYnl0ZXNbaSAlIGxlbl1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpc1xufVxuXG4vKipcbiAqIENyZWF0ZXMgYSBuZXcgYEFycmF5QnVmZmVyYCB3aXRoIHRoZSAqY29waWVkKiBtZW1vcnkgb2YgdGhlIGJ1ZmZlciBpbnN0YW5jZS5cbiAqIEFkZGVkIGluIE5vZGUgMC4xMi4gT25seSBhdmFpbGFibGUgaW4gYnJvd3NlcnMgdGhhdCBzdXBwb3J0IEFycmF5QnVmZmVyLlxuICovXG5CdWZmZXIucHJvdG90eXBlLnRvQXJyYXlCdWZmZXIgPSBmdW5jdGlvbiAoKSB7XG4gIGlmICh0eXBlb2YgVWludDhBcnJheSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICAgIHJldHVybiAobmV3IEJ1ZmZlcih0aGlzKSkuYnVmZmVyXG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBidWYgPSBuZXcgVWludDhBcnJheSh0aGlzLmxlbmd0aClcbiAgICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBidWYubGVuZ3RoOyBpIDwgbGVuOyBpICs9IDEpIHtcbiAgICAgICAgYnVmW2ldID0gdGhpc1tpXVxuICAgICAgfVxuICAgICAgcmV0dXJuIGJ1Zi5idWZmZXJcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQnVmZmVyLnRvQXJyYXlCdWZmZXIgbm90IHN1cHBvcnRlZCBpbiB0aGlzIGJyb3dzZXInKVxuICB9XG59XG5cbi8vIEhFTFBFUiBGVU5DVElPTlNcbi8vID09PT09PT09PT09PT09PT1cblxudmFyIEJQID0gQnVmZmVyLnByb3RvdHlwZVxuXG4vKipcbiAqIEF1Z21lbnQgYSBVaW50OEFycmF5ICppbnN0YW5jZSogKG5vdCB0aGUgVWludDhBcnJheSBjbGFzcyEpIHdpdGggQnVmZmVyIG1ldGhvZHNcbiAqL1xuQnVmZmVyLl9hdWdtZW50ID0gZnVuY3Rpb24gKGFycikge1xuICBhcnIuY29uc3RydWN0b3IgPSBCdWZmZXJcbiAgYXJyLl9pc0J1ZmZlciA9IHRydWVcblxuICAvLyBzYXZlIHJlZmVyZW5jZSB0byBvcmlnaW5hbCBVaW50OEFycmF5IGdldC9zZXQgbWV0aG9kcyBiZWZvcmUgb3ZlcndyaXRpbmdcbiAgYXJyLl9nZXQgPSBhcnIuZ2V0XG4gIGFyci5fc2V0ID0gYXJyLnNldFxuXG4gIC8vIGRlcHJlY2F0ZWQsIHdpbGwgYmUgcmVtb3ZlZCBpbiBub2RlIDAuMTMrXG4gIGFyci5nZXQgPSBCUC5nZXRcbiAgYXJyLnNldCA9IEJQLnNldFxuXG4gIGFyci53cml0ZSA9IEJQLndyaXRlXG4gIGFyci50b1N0cmluZyA9IEJQLnRvU3RyaW5nXG4gIGFyci50b0xvY2FsZVN0cmluZyA9IEJQLnRvU3RyaW5nXG4gIGFyci50b0pTT04gPSBCUC50b0pTT05cbiAgYXJyLmVxdWFscyA9IEJQLmVxdWFsc1xuICBhcnIuY29tcGFyZSA9IEJQLmNvbXBhcmVcbiAgYXJyLmNvcHkgPSBCUC5jb3B5XG4gIGFyci5zbGljZSA9IEJQLnNsaWNlXG4gIGFyci5yZWFkVUludExFID0gQlAucmVhZFVJbnRMRVxuICBhcnIucmVhZFVJbnRCRSA9IEJQLnJlYWRVSW50QkVcbiAgYXJyLnJlYWRVSW50OCA9IEJQLnJlYWRVSW50OFxuICBhcnIucmVhZFVJbnQxNkxFID0gQlAucmVhZFVJbnQxNkxFXG4gIGFyci5yZWFkVUludDE2QkUgPSBCUC5yZWFkVUludDE2QkVcbiAgYXJyLnJlYWRVSW50MzJMRSA9IEJQLnJlYWRVSW50MzJMRVxuICBhcnIucmVhZFVJbnQzMkJFID0gQlAucmVhZFVJbnQzMkJFXG4gIGFyci5yZWFkSW50TEUgPSBCUC5yZWFkSW50TEVcbiAgYXJyLnJlYWRJbnRCRSA9IEJQLnJlYWRJbnRCRVxuICBhcnIucmVhZEludDggPSBCUC5yZWFkSW50OFxuICBhcnIucmVhZEludDE2TEUgPSBCUC5yZWFkSW50MTZMRVxuICBhcnIucmVhZEludDE2QkUgPSBCUC5yZWFkSW50MTZCRVxuICBhcnIucmVhZEludDMyTEUgPSBCUC5yZWFkSW50MzJMRVxuICBhcnIucmVhZEludDMyQkUgPSBCUC5yZWFkSW50MzJCRVxuICBhcnIucmVhZEZsb2F0TEUgPSBCUC5yZWFkRmxvYXRMRVxuICBhcnIucmVhZEZsb2F0QkUgPSBCUC5yZWFkRmxvYXRCRVxuICBhcnIucmVhZERvdWJsZUxFID0gQlAucmVhZERvdWJsZUxFXG4gIGFyci5yZWFkRG91YmxlQkUgPSBCUC5yZWFkRG91YmxlQkVcbiAgYXJyLndyaXRlVUludDggPSBCUC53cml0ZVVJbnQ4XG4gIGFyci53cml0ZVVJbnRMRSA9IEJQLndyaXRlVUludExFXG4gIGFyci53cml0ZVVJbnRCRSA9IEJQLndyaXRlVUludEJFXG4gIGFyci53cml0ZVVJbnQxNkxFID0gQlAud3JpdGVVSW50MTZMRVxuICBhcnIud3JpdGVVSW50MTZCRSA9IEJQLndyaXRlVUludDE2QkVcbiAgYXJyLndyaXRlVUludDMyTEUgPSBCUC53cml0ZVVJbnQzMkxFXG4gIGFyci53cml0ZVVJbnQzMkJFID0gQlAud3JpdGVVSW50MzJCRVxuICBhcnIud3JpdGVJbnRMRSA9IEJQLndyaXRlSW50TEVcbiAgYXJyLndyaXRlSW50QkUgPSBCUC53cml0ZUludEJFXG4gIGFyci53cml0ZUludDggPSBCUC53cml0ZUludDhcbiAgYXJyLndyaXRlSW50MTZMRSA9IEJQLndyaXRlSW50MTZMRVxuICBhcnIud3JpdGVJbnQxNkJFID0gQlAud3JpdGVJbnQxNkJFXG4gIGFyci53cml0ZUludDMyTEUgPSBCUC53cml0ZUludDMyTEVcbiAgYXJyLndyaXRlSW50MzJCRSA9IEJQLndyaXRlSW50MzJCRVxuICBhcnIud3JpdGVGbG9hdExFID0gQlAud3JpdGVGbG9hdExFXG4gIGFyci53cml0ZUZsb2F0QkUgPSBCUC53cml0ZUZsb2F0QkVcbiAgYXJyLndyaXRlRG91YmxlTEUgPSBCUC53cml0ZURvdWJsZUxFXG4gIGFyci53cml0ZURvdWJsZUJFID0gQlAud3JpdGVEb3VibGVCRVxuICBhcnIuZmlsbCA9IEJQLmZpbGxcbiAgYXJyLmluc3BlY3QgPSBCUC5pbnNwZWN0XG4gIGFyci50b0FycmF5QnVmZmVyID0gQlAudG9BcnJheUJ1ZmZlclxuXG4gIHJldHVybiBhcnJcbn1cblxudmFyIElOVkFMSURfQkFTRTY0X1JFID0gL1teK1xcLzAtOUEtelxcLV0vZ1xuXG5mdW5jdGlvbiBiYXNlNjRjbGVhbiAoc3RyKSB7XG4gIC8vIE5vZGUgc3RyaXBzIG91dCBpbnZhbGlkIGNoYXJhY3RlcnMgbGlrZSBcXG4gYW5kIFxcdCBmcm9tIHRoZSBzdHJpbmcsIGJhc2U2NC1qcyBkb2VzIG5vdFxuICBzdHIgPSBzdHJpbmd0cmltKHN0cikucmVwbGFjZShJTlZBTElEX0JBU0U2NF9SRSwgJycpXG4gIC8vIE5vZGUgY29udmVydHMgc3RyaW5ncyB3aXRoIGxlbmd0aCA8IDIgdG8gJydcbiAgaWYgKHN0ci5sZW5ndGggPCAyKSByZXR1cm4gJydcbiAgLy8gTm9kZSBhbGxvd3MgZm9yIG5vbi1wYWRkZWQgYmFzZTY0IHN0cmluZ3MgKG1pc3NpbmcgdHJhaWxpbmcgPT09KSwgYmFzZTY0LWpzIGRvZXMgbm90XG4gIHdoaWxlIChzdHIubGVuZ3RoICUgNCAhPT0gMCkge1xuICAgIHN0ciA9IHN0ciArICc9J1xuICB9XG4gIHJldHVybiBzdHJcbn1cblxuZnVuY3Rpb24gc3RyaW5ndHJpbSAoc3RyKSB7XG4gIGlmIChzdHIudHJpbSkgcmV0dXJuIHN0ci50cmltKClcbiAgcmV0dXJuIHN0ci5yZXBsYWNlKC9eXFxzK3xcXHMrJC9nLCAnJylcbn1cblxuZnVuY3Rpb24gaXNBcnJheWlzaCAoc3ViamVjdCkge1xuICByZXR1cm4gaXNBcnJheShzdWJqZWN0KSB8fCBCdWZmZXIuaXNCdWZmZXIoc3ViamVjdCkgfHxcbiAgICAgIHN1YmplY3QgJiYgdHlwZW9mIHN1YmplY3QgPT09ICdvYmplY3QnICYmXG4gICAgICB0eXBlb2Ygc3ViamVjdC5sZW5ndGggPT09ICdudW1iZXInXG59XG5cbmZ1bmN0aW9uIHRvSGV4IChuKSB7XG4gIGlmIChuIDwgMTYpIHJldHVybiAnMCcgKyBuLnRvU3RyaW5nKDE2KVxuICByZXR1cm4gbi50b1N0cmluZygxNilcbn1cblxuZnVuY3Rpb24gdXRmOFRvQnl0ZXMgKHN0cmluZywgdW5pdHMpIHtcbiAgdW5pdHMgPSB1bml0cyB8fCBJbmZpbml0eVxuICB2YXIgY29kZVBvaW50XG4gIHZhciBsZW5ndGggPSBzdHJpbmcubGVuZ3RoXG4gIHZhciBsZWFkU3Vycm9nYXRlID0gbnVsbFxuICB2YXIgYnl0ZXMgPSBbXVxuICB2YXIgaSA9IDBcblxuICBmb3IgKDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgY29kZVBvaW50ID0gc3RyaW5nLmNoYXJDb2RlQXQoaSlcblxuICAgIC8vIGlzIHN1cnJvZ2F0ZSBjb21wb25lbnRcbiAgICBpZiAoY29kZVBvaW50ID4gMHhEN0ZGICYmIGNvZGVQb2ludCA8IDB4RTAwMCkge1xuICAgICAgLy8gbGFzdCBjaGFyIHdhcyBhIGxlYWRcbiAgICAgIGlmIChsZWFkU3Vycm9nYXRlKSB7XG4gICAgICAgIC8vIDIgbGVhZHMgaW4gYSByb3dcbiAgICAgICAgaWYgKGNvZGVQb2ludCA8IDB4REMwMCkge1xuICAgICAgICAgIGlmICgodW5pdHMgLT0gMykgPiAtMSkgYnl0ZXMucHVzaCgweEVGLCAweEJGLCAweEJEKVxuICAgICAgICAgIGxlYWRTdXJyb2dhdGUgPSBjb2RlUG9pbnRcbiAgICAgICAgICBjb250aW51ZVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIHZhbGlkIHN1cnJvZ2F0ZSBwYWlyXG4gICAgICAgICAgY29kZVBvaW50ID0gbGVhZFN1cnJvZ2F0ZSAtIDB4RDgwMCA8PCAxMCB8IGNvZGVQb2ludCAtIDB4REMwMCB8IDB4MTAwMDBcbiAgICAgICAgICBsZWFkU3Vycm9nYXRlID0gbnVsbFxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBubyBsZWFkIHlldFxuXG4gICAgICAgIGlmIChjb2RlUG9pbnQgPiAweERCRkYpIHtcbiAgICAgICAgICAvLyB1bmV4cGVjdGVkIHRyYWlsXG4gICAgICAgICAgaWYgKCh1bml0cyAtPSAzKSA+IC0xKSBieXRlcy5wdXNoKDB4RUYsIDB4QkYsIDB4QkQpXG4gICAgICAgICAgY29udGludWVcbiAgICAgICAgfSBlbHNlIGlmIChpICsgMSA9PT0gbGVuZ3RoKSB7XG4gICAgICAgICAgLy8gdW5wYWlyZWQgbGVhZFxuICAgICAgICAgIGlmICgodW5pdHMgLT0gMykgPiAtMSkgYnl0ZXMucHVzaCgweEVGLCAweEJGLCAweEJEKVxuICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gdmFsaWQgbGVhZFxuICAgICAgICAgIGxlYWRTdXJyb2dhdGUgPSBjb2RlUG9pbnRcbiAgICAgICAgICBjb250aW51ZVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChsZWFkU3Vycm9nYXRlKSB7XG4gICAgICAvLyB2YWxpZCBibXAgY2hhciwgYnV0IGxhc3QgY2hhciB3YXMgYSBsZWFkXG4gICAgICBpZiAoKHVuaXRzIC09IDMpID4gLTEpIGJ5dGVzLnB1c2goMHhFRiwgMHhCRiwgMHhCRClcbiAgICAgIGxlYWRTdXJyb2dhdGUgPSBudWxsXG4gICAgfVxuXG4gICAgLy8gZW5jb2RlIHV0ZjhcbiAgICBpZiAoY29kZVBvaW50IDwgMHg4MCkge1xuICAgICAgaWYgKCh1bml0cyAtPSAxKSA8IDApIGJyZWFrXG4gICAgICBieXRlcy5wdXNoKGNvZGVQb2ludClcbiAgICB9IGVsc2UgaWYgKGNvZGVQb2ludCA8IDB4ODAwKSB7XG4gICAgICBpZiAoKHVuaXRzIC09IDIpIDwgMCkgYnJlYWtcbiAgICAgIGJ5dGVzLnB1c2goXG4gICAgICAgIGNvZGVQb2ludCA+PiAweDYgfCAweEMwLFxuICAgICAgICBjb2RlUG9pbnQgJiAweDNGIHwgMHg4MFxuICAgICAgKVxuICAgIH0gZWxzZSBpZiAoY29kZVBvaW50IDwgMHgxMDAwMCkge1xuICAgICAgaWYgKCh1bml0cyAtPSAzKSA8IDApIGJyZWFrXG4gICAgICBieXRlcy5wdXNoKFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHhDIHwgMHhFMCxcbiAgICAgICAgY29kZVBvaW50ID4+IDB4NiAmIDB4M0YgfCAweDgwLFxuICAgICAgICBjb2RlUG9pbnQgJiAweDNGIHwgMHg4MFxuICAgICAgKVxuICAgIH0gZWxzZSBpZiAoY29kZVBvaW50IDwgMHgyMDAwMDApIHtcbiAgICAgIGlmICgodW5pdHMgLT0gNCkgPCAwKSBicmVha1xuICAgICAgYnl0ZXMucHVzaChcbiAgICAgICAgY29kZVBvaW50ID4+IDB4MTIgfCAweEYwLFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHhDICYgMHgzRiB8IDB4ODAsXG4gICAgICAgIGNvZGVQb2ludCA+PiAweDYgJiAweDNGIHwgMHg4MCxcbiAgICAgICAgY29kZVBvaW50ICYgMHgzRiB8IDB4ODBcbiAgICAgIClcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGNvZGUgcG9pbnQnKVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBieXRlc1xufVxuXG5mdW5jdGlvbiBhc2NpaVRvQnl0ZXMgKHN0cikge1xuICB2YXIgYnl0ZUFycmF5ID0gW11cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyBpKyspIHtcbiAgICAvLyBOb2RlJ3MgY29kZSBzZWVtcyB0byBiZSBkb2luZyB0aGlzIGFuZCBub3QgJiAweDdGLi5cbiAgICBieXRlQXJyYXkucHVzaChzdHIuY2hhckNvZGVBdChpKSAmIDB4RkYpXG4gIH1cbiAgcmV0dXJuIGJ5dGVBcnJheVxufVxuXG5mdW5jdGlvbiB1dGYxNmxlVG9CeXRlcyAoc3RyLCB1bml0cykge1xuICB2YXIgYywgaGksIGxvXG4gIHZhciBieXRlQXJyYXkgPSBbXVxuICBmb3IgKHZhciBpID0gMDsgaSA8IHN0ci5sZW5ndGg7IGkrKykge1xuICAgIGlmICgodW5pdHMgLT0gMikgPCAwKSBicmVha1xuXG4gICAgYyA9IHN0ci5jaGFyQ29kZUF0KGkpXG4gICAgaGkgPSBjID4+IDhcbiAgICBsbyA9IGMgJSAyNTZcbiAgICBieXRlQXJyYXkucHVzaChsbylcbiAgICBieXRlQXJyYXkucHVzaChoaSlcbiAgfVxuXG4gIHJldHVybiBieXRlQXJyYXlcbn1cblxuZnVuY3Rpb24gYmFzZTY0VG9CeXRlcyAoc3RyKSB7XG4gIHJldHVybiBiYXNlNjQudG9CeXRlQXJyYXkoYmFzZTY0Y2xlYW4oc3RyKSlcbn1cblxuZnVuY3Rpb24gYmxpdEJ1ZmZlciAoc3JjLCBkc3QsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICBpZiAoKGkgKyBvZmZzZXQgPj0gZHN0Lmxlbmd0aCkgfHwgKGkgPj0gc3JjLmxlbmd0aCkpXG4gICAgICBicmVha1xuICAgIGRzdFtpICsgb2Zmc2V0XSA9IHNyY1tpXVxuICB9XG4gIHJldHVybiBpXG59XG5cbmZ1bmN0aW9uIGRlY29kZVV0ZjhDaGFyIChzdHIpIHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gZGVjb2RlVVJJQ29tcG9uZW50KHN0cilcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgcmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUoMHhGRkZEKSAvLyBVVEYgOCBpbnZhbGlkIGNoYXJcbiAgfVxufVxuIiwidmFyIGxvb2t1cCA9ICdBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OSsvJztcblxuOyhmdW5jdGlvbiAoZXhwb3J0cykge1xuXHQndXNlIHN0cmljdCc7XG5cbiAgdmFyIEFyciA9ICh0eXBlb2YgVWludDhBcnJheSAhPT0gJ3VuZGVmaW5lZCcpXG4gICAgPyBVaW50OEFycmF5XG4gICAgOiBBcnJheVxuXG5cdHZhciBQTFVTICAgPSAnKycuY2hhckNvZGVBdCgwKVxuXHR2YXIgU0xBU0ggID0gJy8nLmNoYXJDb2RlQXQoMClcblx0dmFyIE5VTUJFUiA9ICcwJy5jaGFyQ29kZUF0KDApXG5cdHZhciBMT1dFUiAgPSAnYScuY2hhckNvZGVBdCgwKVxuXHR2YXIgVVBQRVIgID0gJ0EnLmNoYXJDb2RlQXQoMClcblx0dmFyIFBMVVNfVVJMX1NBRkUgPSAnLScuY2hhckNvZGVBdCgwKVxuXHR2YXIgU0xBU0hfVVJMX1NBRkUgPSAnXycuY2hhckNvZGVBdCgwKVxuXG5cdGZ1bmN0aW9uIGRlY29kZSAoZWx0KSB7XG5cdFx0dmFyIGNvZGUgPSBlbHQuY2hhckNvZGVBdCgwKVxuXHRcdGlmIChjb2RlID09PSBQTFVTIHx8XG5cdFx0ICAgIGNvZGUgPT09IFBMVVNfVVJMX1NBRkUpXG5cdFx0XHRyZXR1cm4gNjIgLy8gJysnXG5cdFx0aWYgKGNvZGUgPT09IFNMQVNIIHx8XG5cdFx0ICAgIGNvZGUgPT09IFNMQVNIX1VSTF9TQUZFKVxuXHRcdFx0cmV0dXJuIDYzIC8vICcvJ1xuXHRcdGlmIChjb2RlIDwgTlVNQkVSKVxuXHRcdFx0cmV0dXJuIC0xIC8vbm8gbWF0Y2hcblx0XHRpZiAoY29kZSA8IE5VTUJFUiArIDEwKVxuXHRcdFx0cmV0dXJuIGNvZGUgLSBOVU1CRVIgKyAyNiArIDI2XG5cdFx0aWYgKGNvZGUgPCBVUFBFUiArIDI2KVxuXHRcdFx0cmV0dXJuIGNvZGUgLSBVUFBFUlxuXHRcdGlmIChjb2RlIDwgTE9XRVIgKyAyNilcblx0XHRcdHJldHVybiBjb2RlIC0gTE9XRVIgKyAyNlxuXHR9XG5cblx0ZnVuY3Rpb24gYjY0VG9CeXRlQXJyYXkgKGI2NCkge1xuXHRcdHZhciBpLCBqLCBsLCB0bXAsIHBsYWNlSG9sZGVycywgYXJyXG5cblx0XHRpZiAoYjY0Lmxlbmd0aCAlIDQgPiAwKSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgc3RyaW5nLiBMZW5ndGggbXVzdCBiZSBhIG11bHRpcGxlIG9mIDQnKVxuXHRcdH1cblxuXHRcdC8vIHRoZSBudW1iZXIgb2YgZXF1YWwgc2lnbnMgKHBsYWNlIGhvbGRlcnMpXG5cdFx0Ly8gaWYgdGhlcmUgYXJlIHR3byBwbGFjZWhvbGRlcnMsIHRoYW4gdGhlIHR3byBjaGFyYWN0ZXJzIGJlZm9yZSBpdFxuXHRcdC8vIHJlcHJlc2VudCBvbmUgYnl0ZVxuXHRcdC8vIGlmIHRoZXJlIGlzIG9ubHkgb25lLCB0aGVuIHRoZSB0aHJlZSBjaGFyYWN0ZXJzIGJlZm9yZSBpdCByZXByZXNlbnQgMiBieXRlc1xuXHRcdC8vIHRoaXMgaXMganVzdCBhIGNoZWFwIGhhY2sgdG8gbm90IGRvIGluZGV4T2YgdHdpY2Vcblx0XHR2YXIgbGVuID0gYjY0Lmxlbmd0aFxuXHRcdHBsYWNlSG9sZGVycyA9ICc9JyA9PT0gYjY0LmNoYXJBdChsZW4gLSAyKSA/IDIgOiAnPScgPT09IGI2NC5jaGFyQXQobGVuIC0gMSkgPyAxIDogMFxuXG5cdFx0Ly8gYmFzZTY0IGlzIDQvMyArIHVwIHRvIHR3byBjaGFyYWN0ZXJzIG9mIHRoZSBvcmlnaW5hbCBkYXRhXG5cdFx0YXJyID0gbmV3IEFycihiNjQubGVuZ3RoICogMyAvIDQgLSBwbGFjZUhvbGRlcnMpXG5cblx0XHQvLyBpZiB0aGVyZSBhcmUgcGxhY2Vob2xkZXJzLCBvbmx5IGdldCB1cCB0byB0aGUgbGFzdCBjb21wbGV0ZSA0IGNoYXJzXG5cdFx0bCA9IHBsYWNlSG9sZGVycyA+IDAgPyBiNjQubGVuZ3RoIC0gNCA6IGI2NC5sZW5ndGhcblxuXHRcdHZhciBMID0gMFxuXG5cdFx0ZnVuY3Rpb24gcHVzaCAodikge1xuXHRcdFx0YXJyW0wrK10gPSB2XG5cdFx0fVxuXG5cdFx0Zm9yIChpID0gMCwgaiA9IDA7IGkgPCBsOyBpICs9IDQsIGogKz0gMykge1xuXHRcdFx0dG1wID0gKGRlY29kZShiNjQuY2hhckF0KGkpKSA8PCAxOCkgfCAoZGVjb2RlKGI2NC5jaGFyQXQoaSArIDEpKSA8PCAxMikgfCAoZGVjb2RlKGI2NC5jaGFyQXQoaSArIDIpKSA8PCA2KSB8IGRlY29kZShiNjQuY2hhckF0KGkgKyAzKSlcblx0XHRcdHB1c2goKHRtcCAmIDB4RkYwMDAwKSA+PiAxNilcblx0XHRcdHB1c2goKHRtcCAmIDB4RkYwMCkgPj4gOClcblx0XHRcdHB1c2godG1wICYgMHhGRilcblx0XHR9XG5cblx0XHRpZiAocGxhY2VIb2xkZXJzID09PSAyKSB7XG5cdFx0XHR0bXAgPSAoZGVjb2RlKGI2NC5jaGFyQXQoaSkpIDw8IDIpIHwgKGRlY29kZShiNjQuY2hhckF0KGkgKyAxKSkgPj4gNClcblx0XHRcdHB1c2godG1wICYgMHhGRilcblx0XHR9IGVsc2UgaWYgKHBsYWNlSG9sZGVycyA9PT0gMSkge1xuXHRcdFx0dG1wID0gKGRlY29kZShiNjQuY2hhckF0KGkpKSA8PCAxMCkgfCAoZGVjb2RlKGI2NC5jaGFyQXQoaSArIDEpKSA8PCA0KSB8IChkZWNvZGUoYjY0LmNoYXJBdChpICsgMikpID4+IDIpXG5cdFx0XHRwdXNoKCh0bXAgPj4gOCkgJiAweEZGKVxuXHRcdFx0cHVzaCh0bXAgJiAweEZGKVxuXHRcdH1cblxuXHRcdHJldHVybiBhcnJcblx0fVxuXG5cdGZ1bmN0aW9uIHVpbnQ4VG9CYXNlNjQgKHVpbnQ4KSB7XG5cdFx0dmFyIGksXG5cdFx0XHRleHRyYUJ5dGVzID0gdWludDgubGVuZ3RoICUgMywgLy8gaWYgd2UgaGF2ZSAxIGJ5dGUgbGVmdCwgcGFkIDIgYnl0ZXNcblx0XHRcdG91dHB1dCA9IFwiXCIsXG5cdFx0XHR0ZW1wLCBsZW5ndGhcblxuXHRcdGZ1bmN0aW9uIGVuY29kZSAobnVtKSB7XG5cdFx0XHRyZXR1cm4gbG9va3VwLmNoYXJBdChudW0pXG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gdHJpcGxldFRvQmFzZTY0IChudW0pIHtcblx0XHRcdHJldHVybiBlbmNvZGUobnVtID4+IDE4ICYgMHgzRikgKyBlbmNvZGUobnVtID4+IDEyICYgMHgzRikgKyBlbmNvZGUobnVtID4+IDYgJiAweDNGKSArIGVuY29kZShudW0gJiAweDNGKVxuXHRcdH1cblxuXHRcdC8vIGdvIHRocm91Z2ggdGhlIGFycmF5IGV2ZXJ5IHRocmVlIGJ5dGVzLCB3ZSdsbCBkZWFsIHdpdGggdHJhaWxpbmcgc3R1ZmYgbGF0ZXJcblx0XHRmb3IgKGkgPSAwLCBsZW5ndGggPSB1aW50OC5sZW5ndGggLSBleHRyYUJ5dGVzOyBpIDwgbGVuZ3RoOyBpICs9IDMpIHtcblx0XHRcdHRlbXAgPSAodWludDhbaV0gPDwgMTYpICsgKHVpbnQ4W2kgKyAxXSA8PCA4KSArICh1aW50OFtpICsgMl0pXG5cdFx0XHRvdXRwdXQgKz0gdHJpcGxldFRvQmFzZTY0KHRlbXApXG5cdFx0fVxuXG5cdFx0Ly8gcGFkIHRoZSBlbmQgd2l0aCB6ZXJvcywgYnV0IG1ha2Ugc3VyZSB0byBub3QgZm9yZ2V0IHRoZSBleHRyYSBieXRlc1xuXHRcdHN3aXRjaCAoZXh0cmFCeXRlcykge1xuXHRcdFx0Y2FzZSAxOlxuXHRcdFx0XHR0ZW1wID0gdWludDhbdWludDgubGVuZ3RoIC0gMV1cblx0XHRcdFx0b3V0cHV0ICs9IGVuY29kZSh0ZW1wID4+IDIpXG5cdFx0XHRcdG91dHB1dCArPSBlbmNvZGUoKHRlbXAgPDwgNCkgJiAweDNGKVxuXHRcdFx0XHRvdXRwdXQgKz0gJz09J1xuXHRcdFx0XHRicmVha1xuXHRcdFx0Y2FzZSAyOlxuXHRcdFx0XHR0ZW1wID0gKHVpbnQ4W3VpbnQ4Lmxlbmd0aCAtIDJdIDw8IDgpICsgKHVpbnQ4W3VpbnQ4Lmxlbmd0aCAtIDFdKVxuXHRcdFx0XHRvdXRwdXQgKz0gZW5jb2RlKHRlbXAgPj4gMTApXG5cdFx0XHRcdG91dHB1dCArPSBlbmNvZGUoKHRlbXAgPj4gNCkgJiAweDNGKVxuXHRcdFx0XHRvdXRwdXQgKz0gZW5jb2RlKCh0ZW1wIDw8IDIpICYgMHgzRilcblx0XHRcdFx0b3V0cHV0ICs9ICc9J1xuXHRcdFx0XHRicmVha1xuXHRcdH1cblxuXHRcdHJldHVybiBvdXRwdXRcblx0fVxuXG5cdGV4cG9ydHMudG9CeXRlQXJyYXkgPSBiNjRUb0J5dGVBcnJheVxuXHRleHBvcnRzLmZyb21CeXRlQXJyYXkgPSB1aW50OFRvQmFzZTY0XG59KHR5cGVvZiBleHBvcnRzID09PSAndW5kZWZpbmVkJyA/ICh0aGlzLmJhc2U2NGpzID0ge30pIDogZXhwb3J0cykpXG4iLCJleHBvcnRzLnJlYWQgPSBmdW5jdGlvbihidWZmZXIsIG9mZnNldCwgaXNMRSwgbUxlbiwgbkJ5dGVzKSB7XG4gIHZhciBlLCBtLFxuICAgICAgZUxlbiA9IG5CeXRlcyAqIDggLSBtTGVuIC0gMSxcbiAgICAgIGVNYXggPSAoMSA8PCBlTGVuKSAtIDEsXG4gICAgICBlQmlhcyA9IGVNYXggPj4gMSxcbiAgICAgIG5CaXRzID0gLTcsXG4gICAgICBpID0gaXNMRSA/IChuQnl0ZXMgLSAxKSA6IDAsXG4gICAgICBkID0gaXNMRSA/IC0xIDogMSxcbiAgICAgIHMgPSBidWZmZXJbb2Zmc2V0ICsgaV07XG5cbiAgaSArPSBkO1xuXG4gIGUgPSBzICYgKCgxIDw8ICgtbkJpdHMpKSAtIDEpO1xuICBzID4+PSAoLW5CaXRzKTtcbiAgbkJpdHMgKz0gZUxlbjtcbiAgZm9yICg7IG5CaXRzID4gMDsgZSA9IGUgKiAyNTYgKyBidWZmZXJbb2Zmc2V0ICsgaV0sIGkgKz0gZCwgbkJpdHMgLT0gOCk7XG5cbiAgbSA9IGUgJiAoKDEgPDwgKC1uQml0cykpIC0gMSk7XG4gIGUgPj49ICgtbkJpdHMpO1xuICBuQml0cyArPSBtTGVuO1xuICBmb3IgKDsgbkJpdHMgPiAwOyBtID0gbSAqIDI1NiArIGJ1ZmZlcltvZmZzZXQgKyBpXSwgaSArPSBkLCBuQml0cyAtPSA4KTtcblxuICBpZiAoZSA9PT0gMCkge1xuICAgIGUgPSAxIC0gZUJpYXM7XG4gIH0gZWxzZSBpZiAoZSA9PT0gZU1heCkge1xuICAgIHJldHVybiBtID8gTmFOIDogKChzID8gLTEgOiAxKSAqIEluZmluaXR5KTtcbiAgfSBlbHNlIHtcbiAgICBtID0gbSArIE1hdGgucG93KDIsIG1MZW4pO1xuICAgIGUgPSBlIC0gZUJpYXM7XG4gIH1cbiAgcmV0dXJuIChzID8gLTEgOiAxKSAqIG0gKiBNYXRoLnBvdygyLCBlIC0gbUxlbik7XG59O1xuXG5leHBvcnRzLndyaXRlID0gZnVuY3Rpb24oYnVmZmVyLCB2YWx1ZSwgb2Zmc2V0LCBpc0xFLCBtTGVuLCBuQnl0ZXMpIHtcbiAgdmFyIGUsIG0sIGMsXG4gICAgICBlTGVuID0gbkJ5dGVzICogOCAtIG1MZW4gLSAxLFxuICAgICAgZU1heCA9ICgxIDw8IGVMZW4pIC0gMSxcbiAgICAgIGVCaWFzID0gZU1heCA+PiAxLFxuICAgICAgcnQgPSAobUxlbiA9PT0gMjMgPyBNYXRoLnBvdygyLCAtMjQpIC0gTWF0aC5wb3coMiwgLTc3KSA6IDApLFxuICAgICAgaSA9IGlzTEUgPyAwIDogKG5CeXRlcyAtIDEpLFxuICAgICAgZCA9IGlzTEUgPyAxIDogLTEsXG4gICAgICBzID0gdmFsdWUgPCAwIHx8ICh2YWx1ZSA9PT0gMCAmJiAxIC8gdmFsdWUgPCAwKSA/IDEgOiAwO1xuXG4gIHZhbHVlID0gTWF0aC5hYnModmFsdWUpO1xuXG4gIGlmIChpc05hTih2YWx1ZSkgfHwgdmFsdWUgPT09IEluZmluaXR5KSB7XG4gICAgbSA9IGlzTmFOKHZhbHVlKSA/IDEgOiAwO1xuICAgIGUgPSBlTWF4O1xuICB9IGVsc2Uge1xuICAgIGUgPSBNYXRoLmZsb29yKE1hdGgubG9nKHZhbHVlKSAvIE1hdGguTE4yKTtcbiAgICBpZiAodmFsdWUgKiAoYyA9IE1hdGgucG93KDIsIC1lKSkgPCAxKSB7XG4gICAgICBlLS07XG4gICAgICBjICo9IDI7XG4gICAgfVxuICAgIGlmIChlICsgZUJpYXMgPj0gMSkge1xuICAgICAgdmFsdWUgKz0gcnQgLyBjO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YWx1ZSArPSBydCAqIE1hdGgucG93KDIsIDEgLSBlQmlhcyk7XG4gICAgfVxuICAgIGlmICh2YWx1ZSAqIGMgPj0gMikge1xuICAgICAgZSsrO1xuICAgICAgYyAvPSAyO1xuICAgIH1cblxuICAgIGlmIChlICsgZUJpYXMgPj0gZU1heCkge1xuICAgICAgbSA9IDA7XG4gICAgICBlID0gZU1heDtcbiAgICB9IGVsc2UgaWYgKGUgKyBlQmlhcyA+PSAxKSB7XG4gICAgICBtID0gKHZhbHVlICogYyAtIDEpICogTWF0aC5wb3coMiwgbUxlbik7XG4gICAgICBlID0gZSArIGVCaWFzO1xuICAgIH0gZWxzZSB7XG4gICAgICBtID0gdmFsdWUgKiBNYXRoLnBvdygyLCBlQmlhcyAtIDEpICogTWF0aC5wb3coMiwgbUxlbik7XG4gICAgICBlID0gMDtcbiAgICB9XG4gIH1cblxuICBmb3IgKDsgbUxlbiA+PSA4OyBidWZmZXJbb2Zmc2V0ICsgaV0gPSBtICYgMHhmZiwgaSArPSBkLCBtIC89IDI1NiwgbUxlbiAtPSA4KTtcblxuICBlID0gKGUgPDwgbUxlbikgfCBtO1xuICBlTGVuICs9IG1MZW47XG4gIGZvciAoOyBlTGVuID4gMDsgYnVmZmVyW29mZnNldCArIGldID0gZSAmIDB4ZmYsIGkgKz0gZCwgZSAvPSAyNTYsIGVMZW4gLT0gOCk7XG5cbiAgYnVmZmVyW29mZnNldCArIGkgLSBkXSB8PSBzICogMTI4O1xufTtcbiIsIlxuLyoqXG4gKiBpc0FycmF5XG4gKi9cblxudmFyIGlzQXJyYXkgPSBBcnJheS5pc0FycmF5O1xuXG4vKipcbiAqIHRvU3RyaW5nXG4gKi9cblxudmFyIHN0ciA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG5cbi8qKlxuICogV2hldGhlciBvciBub3QgdGhlIGdpdmVuIGB2YWxgXG4gKiBpcyBhbiBhcnJheS5cbiAqXG4gKiBleGFtcGxlOlxuICpcbiAqICAgICAgICBpc0FycmF5KFtdKTtcbiAqICAgICAgICAvLyA+IHRydWVcbiAqICAgICAgICBpc0FycmF5KGFyZ3VtZW50cyk7XG4gKiAgICAgICAgLy8gPiBmYWxzZVxuICogICAgICAgIGlzQXJyYXkoJycpO1xuICogICAgICAgIC8vID4gZmFsc2VcbiAqXG4gKiBAcGFyYW0ge21peGVkfSB2YWxcbiAqIEByZXR1cm4ge2Jvb2x9XG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBpc0FycmF5IHx8IGZ1bmN0aW9uICh2YWwpIHtcbiAgcmV0dXJuICEhIHZhbCAmJiAnW29iamVjdCBBcnJheV0nID09IHN0ci5jYWxsKHZhbCk7XG59O1xuIiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbmZ1bmN0aW9uIEV2ZW50RW1pdHRlcigpIHtcbiAgdGhpcy5fZXZlbnRzID0gdGhpcy5fZXZlbnRzIHx8IHt9O1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSB0aGlzLl9tYXhMaXN0ZW5lcnMgfHwgdW5kZWZpbmVkO1xufVxubW9kdWxlLmV4cG9ydHMgPSBFdmVudEVtaXR0ZXI7XG5cbi8vIEJhY2t3YXJkcy1jb21wYXQgd2l0aCBub2RlIDAuMTAueFxuRXZlbnRFbWl0dGVyLkV2ZW50RW1pdHRlciA9IEV2ZW50RW1pdHRlcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fZXZlbnRzID0gdW5kZWZpbmVkO1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fbWF4TGlzdGVuZXJzID0gdW5kZWZpbmVkO1xuXG4vLyBCeSBkZWZhdWx0IEV2ZW50RW1pdHRlcnMgd2lsbCBwcmludCBhIHdhcm5pbmcgaWYgbW9yZSB0aGFuIDEwIGxpc3RlbmVycyBhcmVcbi8vIGFkZGVkIHRvIGl0LiBUaGlzIGlzIGEgdXNlZnVsIGRlZmF1bHQgd2hpY2ggaGVscHMgZmluZGluZyBtZW1vcnkgbGVha3MuXG5FdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycyA9IDEwO1xuXG4vLyBPYnZpb3VzbHkgbm90IGFsbCBFbWl0dGVycyBzaG91bGQgYmUgbGltaXRlZCB0byAxMC4gVGhpcyBmdW5jdGlvbiBhbGxvd3Ncbi8vIHRoYXQgdG8gYmUgaW5jcmVhc2VkLiBTZXQgdG8gemVybyBmb3IgdW5saW1pdGVkLlxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5zZXRNYXhMaXN0ZW5lcnMgPSBmdW5jdGlvbihuKSB7XG4gIGlmICghaXNOdW1iZXIobikgfHwgbiA8IDAgfHwgaXNOYU4obikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCduIG11c3QgYmUgYSBwb3NpdGl2ZSBudW1iZXInKTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gbjtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBlciwgaGFuZGxlciwgbGVuLCBhcmdzLCBpLCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gSWYgdGhlcmUgaXMgbm8gJ2Vycm9yJyBldmVudCBsaXN0ZW5lciB0aGVuIHRocm93LlxuICBpZiAodHlwZSA9PT0gJ2Vycm9yJykge1xuICAgIGlmICghdGhpcy5fZXZlbnRzLmVycm9yIHx8XG4gICAgICAgIChpc09iamVjdCh0aGlzLl9ldmVudHMuZXJyb3IpICYmICF0aGlzLl9ldmVudHMuZXJyb3IubGVuZ3RoKSkge1xuICAgICAgZXIgPSBhcmd1bWVudHNbMV07XG4gICAgICBpZiAoZXIgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgICB0aHJvdyBlcjsgLy8gVW5oYW5kbGVkICdlcnJvcicgZXZlbnRcbiAgICAgIH1cbiAgICAgIHRocm93IFR5cGVFcnJvcignVW5jYXVnaHQsIHVuc3BlY2lmaWVkIFwiZXJyb3JcIiBldmVudC4nKTtcbiAgICB9XG4gIH1cblxuICBoYW5kbGVyID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIGlmIChpc1VuZGVmaW5lZChoYW5kbGVyKSlcbiAgICByZXR1cm4gZmFsc2U7XG5cbiAgaWYgKGlzRnVuY3Rpb24oaGFuZGxlcikpIHtcbiAgICBzd2l0Y2ggKGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIC8vIGZhc3QgY2FzZXNcbiAgICAgIGNhc2UgMTpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAzOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdLCBhcmd1bWVudHNbMl0pO1xuICAgICAgICBicmVhaztcbiAgICAgIC8vIHNsb3dlclxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICAgICAgYXJncyA9IG5ldyBBcnJheShsZW4gLSAxKTtcbiAgICAgICAgZm9yIChpID0gMTsgaSA8IGxlbjsgaSsrKVxuICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICBoYW5kbGVyLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH1cbiAgfSBlbHNlIGlmIChpc09iamVjdChoYW5kbGVyKSkge1xuICAgIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgYXJncyA9IG5ldyBBcnJheShsZW4gLSAxKTtcbiAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcblxuICAgIGxpc3RlbmVycyA9IGhhbmRsZXIuc2xpY2UoKTtcbiAgICBsZW4gPSBsaXN0ZW5lcnMubGVuZ3RoO1xuICAgIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKylcbiAgICAgIGxpc3RlbmVyc1tpXS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBtO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBUbyBhdm9pZCByZWN1cnNpb24gaW4gdGhlIGNhc2UgdGhhdCB0eXBlID09PSBcIm5ld0xpc3RlbmVyXCIhIEJlZm9yZVxuICAvLyBhZGRpbmcgaXQgdG8gdGhlIGxpc3RlbmVycywgZmlyc3QgZW1pdCBcIm5ld0xpc3RlbmVyXCIuXG4gIGlmICh0aGlzLl9ldmVudHMubmV3TGlzdGVuZXIpXG4gICAgdGhpcy5lbWl0KCduZXdMaXN0ZW5lcicsIHR5cGUsXG4gICAgICAgICAgICAgIGlzRnVuY3Rpb24obGlzdGVuZXIubGlzdGVuZXIpID9cbiAgICAgICAgICAgICAgbGlzdGVuZXIubGlzdGVuZXIgOiBsaXN0ZW5lcik7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgLy8gT3B0aW1pemUgdGhlIGNhc2Ugb2Ygb25lIGxpc3RlbmVyLiBEb24ndCBuZWVkIHRoZSBleHRyYSBhcnJheSBvYmplY3QuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gbGlzdGVuZXI7XG4gIGVsc2UgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgLy8gSWYgd2UndmUgYWxyZWFkeSBnb3QgYW4gYXJyYXksIGp1c3QgYXBwZW5kLlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5wdXNoKGxpc3RlbmVyKTtcbiAgZWxzZVxuICAgIC8vIEFkZGluZyB0aGUgc2Vjb25kIGVsZW1lbnQsIG5lZWQgdG8gY2hhbmdlIHRvIGFycmF5LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IFt0aGlzLl9ldmVudHNbdHlwZV0sIGxpc3RlbmVyXTtcblxuICAvLyBDaGVjayBmb3IgbGlzdGVuZXIgbGVha1xuICBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSAmJiAhdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCkge1xuICAgIHZhciBtO1xuICAgIGlmICghaXNVbmRlZmluZWQodGhpcy5fbWF4TGlzdGVuZXJzKSkge1xuICAgICAgbSA9IHRoaXMuX21heExpc3RlbmVycztcbiAgICB9IGVsc2Uge1xuICAgICAgbSA9IEV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzO1xuICAgIH1cblxuICAgIGlmIChtICYmIG0gPiAwICYmIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGggPiBtKSB7XG4gICAgICB0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkID0gdHJ1ZTtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJyhub2RlKSB3YXJuaW5nOiBwb3NzaWJsZSBFdmVudEVtaXR0ZXIgbWVtb3J5ICcgK1xuICAgICAgICAgICAgICAgICAgICAnbGVhayBkZXRlY3RlZC4gJWQgbGlzdGVuZXJzIGFkZGVkLiAnICtcbiAgICAgICAgICAgICAgICAgICAgJ1VzZSBlbWl0dGVyLnNldE1heExpc3RlbmVycygpIHRvIGluY3JlYXNlIGxpbWl0LicsXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGgpO1xuICAgICAgaWYgKHR5cGVvZiBjb25zb2xlLnRyYWNlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIC8vIG5vdCBzdXBwb3J0ZWQgaW4gSUUgMTBcbiAgICAgICAgY29uc29sZS50cmFjZSgpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbiA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub25jZSA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICB2YXIgZmlyZWQgPSBmYWxzZTtcblxuICBmdW5jdGlvbiBnKCkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgZyk7XG5cbiAgICBpZiAoIWZpcmVkKSB7XG4gICAgICBmaXJlZCA9IHRydWU7XG4gICAgICBsaXN0ZW5lci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgfVxuXG4gIGcubGlzdGVuZXIgPSBsaXN0ZW5lcjtcbiAgdGhpcy5vbih0eXBlLCBnKTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8vIGVtaXRzIGEgJ3JlbW92ZUxpc3RlbmVyJyBldmVudCBpZmYgdGhlIGxpc3RlbmVyIHdhcyByZW1vdmVkXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIGxpc3QsIHBvc2l0aW9uLCBsZW5ndGgsIGk7XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgbGlzdCA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgbGVuZ3RoID0gbGlzdC5sZW5ndGg7XG4gIHBvc2l0aW9uID0gLTE7XG5cbiAgaWYgKGxpc3QgPT09IGxpc3RlbmVyIHx8XG4gICAgICAoaXNGdW5jdGlvbihsaXN0Lmxpc3RlbmVyKSAmJiBsaXN0Lmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcbiAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuXG4gIH0gZWxzZSBpZiAoaXNPYmplY3QobGlzdCkpIHtcbiAgICBmb3IgKGkgPSBsZW5ndGg7IGktLSA+IDA7KSB7XG4gICAgICBpZiAobGlzdFtpXSA9PT0gbGlzdGVuZXIgfHxcbiAgICAgICAgICAobGlzdFtpXS5saXN0ZW5lciAmJiBsaXN0W2ldLmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcbiAgICAgICAgcG9zaXRpb24gPSBpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAocG9zaXRpb24gPCAwKVxuICAgICAgcmV0dXJuIHRoaXM7XG5cbiAgICBpZiAobGlzdC5sZW5ndGggPT09IDEpIHtcbiAgICAgIGxpc3QubGVuZ3RoID0gMDtcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgfSBlbHNlIHtcbiAgICAgIGxpc3Quc3BsaWNlKHBvc2l0aW9uLCAxKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBrZXksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICByZXR1cm4gdGhpcztcblxuICAvLyBub3QgbGlzdGVuaW5nIGZvciByZW1vdmVMaXN0ZW5lciwgbm8gbmVlZCB0byBlbWl0XG4gIGlmICghdGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApXG4gICAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICBlbHNlIGlmICh0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLy8gZW1pdCByZW1vdmVMaXN0ZW5lciBmb3IgYWxsIGxpc3RlbmVycyBvbiBhbGwgZXZlbnRzXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgZm9yIChrZXkgaW4gdGhpcy5fZXZlbnRzKSB7XG4gICAgICBpZiAoa2V5ID09PSAncmVtb3ZlTGlzdGVuZXInKSBjb250aW51ZTtcbiAgICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKGtleSk7XG4gICAgfVxuICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKCdyZW1vdmVMaXN0ZW5lcicpO1xuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgbGlzdGVuZXJzID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGxpc3RlbmVycykpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVycyk7XG4gIH0gZWxzZSB7XG4gICAgLy8gTElGTyBvcmRlclxuICAgIHdoaWxlIChsaXN0ZW5lcnMubGVuZ3RoKVxuICAgICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnNbbGlzdGVuZXJzLmxlbmd0aCAtIDFdKTtcbiAgfVxuICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciByZXQ7XG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0ID0gW107XG4gIGVsc2UgaWYgKGlzRnVuY3Rpb24odGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSBbdGhpcy5fZXZlbnRzW3R5cGVdXTtcbiAgZWxzZVxuICAgIHJldCA9IHRoaXMuX2V2ZW50c1t0eXBlXS5zbGljZSgpO1xuICByZXR1cm4gcmV0O1xufTtcblxuRXZlbnRFbWl0dGVyLmxpc3RlbmVyQ291bnQgPSBmdW5jdGlvbihlbWl0dGVyLCB0eXBlKSB7XG4gIHZhciByZXQ7XG4gIGlmICghZW1pdHRlci5fZXZlbnRzIHx8ICFlbWl0dGVyLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0ID0gMDtcbiAgZWxzZSBpZiAoaXNGdW5jdGlvbihlbWl0dGVyLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IDE7XG4gIGVsc2VcbiAgICByZXQgPSBlbWl0dGVyLl9ldmVudHNbdHlwZV0ubGVuZ3RoO1xuICByZXR1cm4gcmV0O1xufTtcblxuZnVuY3Rpb24gaXNGdW5jdGlvbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdmdW5jdGlvbic7XG59XG5cbmZ1bmN0aW9uIGlzTnVtYmVyKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ251bWJlcic7XG59XG5cbmZ1bmN0aW9uIGlzT2JqZWN0KGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ29iamVjdCcgJiYgYXJnICE9PSBudWxsO1xufVxuXG5mdW5jdGlvbiBpc1VuZGVmaW5lZChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gdm9pZCAwO1xufVxuIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG5cbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxucHJvY2Vzcy5uZXh0VGljayA9IChmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGNhblNldEltbWVkaWF0ZSA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnNldEltbWVkaWF0ZTtcbiAgICB2YXIgY2FuTXV0YXRpb25PYnNlcnZlciA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93Lk11dGF0aW9uT2JzZXJ2ZXI7XG4gICAgdmFyIGNhblBvc3QgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5wb3N0TWVzc2FnZSAmJiB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lclxuICAgIDtcblxuICAgIGlmIChjYW5TZXRJbW1lZGlhdGUpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChmKSB7IHJldHVybiB3aW5kb3cuc2V0SW1tZWRpYXRlKGYpIH07XG4gICAgfVxuXG4gICAgdmFyIHF1ZXVlID0gW107XG5cbiAgICBpZiAoY2FuTXV0YXRpb25PYnNlcnZlcikge1xuICAgICAgICB2YXIgaGlkZGVuRGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgICAgICAgdmFyIG9ic2VydmVyID0gbmV3IE11dGF0aW9uT2JzZXJ2ZXIoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIHF1ZXVlTGlzdCA9IHF1ZXVlLnNsaWNlKCk7XG4gICAgICAgICAgICBxdWV1ZS5sZW5ndGggPSAwO1xuICAgICAgICAgICAgcXVldWVMaXN0LmZvckVhY2goZnVuY3Rpb24gKGZuKSB7XG4gICAgICAgICAgICAgICAgZm4oKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICBvYnNlcnZlci5vYnNlcnZlKGhpZGRlbkRpdiwgeyBhdHRyaWJ1dGVzOiB0cnVlIH0pO1xuXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICAgICAgaWYgKCFxdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBoaWRkZW5EaXYuc2V0QXR0cmlidXRlKCd5ZXMnLCAnbm8nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHF1ZXVlLnB1c2goZm4pO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIGlmIChjYW5Qb3N0KSB7XG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgZnVuY3Rpb24gKGV2KSB7XG4gICAgICAgICAgICB2YXIgc291cmNlID0gZXYuc291cmNlO1xuICAgICAgICAgICAgaWYgKChzb3VyY2UgPT09IHdpbmRvdyB8fCBzb3VyY2UgPT09IG51bGwpICYmIGV2LmRhdGEgPT09ICdwcm9jZXNzLXRpY2snKSB7XG4gICAgICAgICAgICAgICAgZXYuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgICAgaWYgKHF1ZXVlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZuID0gcXVldWUuc2hpZnQoKTtcbiAgICAgICAgICAgICAgICAgICAgZm4oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIHRydWUpO1xuXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICAgICAgcXVldWUucHVzaChmbik7XG4gICAgICAgICAgICB3aW5kb3cucG9zdE1lc3NhZ2UoJ3Byb2Nlc3MtdGljaycsICcqJyk7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZm4sIDApO1xuICAgIH07XG59KSgpO1xuXG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5cbi8vIFRPRE8oc2h0eWxtYW4pXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbiIsIi8vISBtb21lbnQuanNcbi8vISB2ZXJzaW9uIDogMi45LjBcbi8vISBhdXRob3JzIDogVGltIFdvb2QsIElza3JlbiBDaGVybmV2LCBNb21lbnQuanMgY29udHJpYnV0b3JzXG4vLyEgbGljZW5zZSA6IE1JVFxuLy8hIG1vbWVudGpzLmNvbVxuXG4oZnVuY3Rpb24gKHVuZGVmaW5lZCkge1xuICAgIC8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAgICAgICAgQ29uc3RhbnRzXG4gICAgKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG4gICAgdmFyIG1vbWVudCxcbiAgICAgICAgVkVSU0lPTiA9ICcyLjkuMCcsXG4gICAgICAgIC8vIHRoZSBnbG9iYWwtc2NvcGUgdGhpcyBpcyBOT1QgdGhlIGdsb2JhbCBvYmplY3QgaW4gTm9kZS5qc1xuICAgICAgICBnbG9iYWxTY29wZSA9ICh0eXBlb2YgZ2xvYmFsICE9PSAndW5kZWZpbmVkJyAmJiAodHlwZW9mIHdpbmRvdyA9PT0gJ3VuZGVmaW5lZCcgfHwgd2luZG93ID09PSBnbG9iYWwud2luZG93KSkgPyBnbG9iYWwgOiB0aGlzLFxuICAgICAgICBvbGRHbG9iYWxNb21lbnQsXG4gICAgICAgIHJvdW5kID0gTWF0aC5yb3VuZCxcbiAgICAgICAgaGFzT3duUHJvcGVydHkgPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LFxuICAgICAgICBpLFxuXG4gICAgICAgIFlFQVIgPSAwLFxuICAgICAgICBNT05USCA9IDEsXG4gICAgICAgIERBVEUgPSAyLFxuICAgICAgICBIT1VSID0gMyxcbiAgICAgICAgTUlOVVRFID0gNCxcbiAgICAgICAgU0VDT05EID0gNSxcbiAgICAgICAgTUlMTElTRUNPTkQgPSA2LFxuXG4gICAgICAgIC8vIGludGVybmFsIHN0b3JhZ2UgZm9yIGxvY2FsZSBjb25maWcgZmlsZXNcbiAgICAgICAgbG9jYWxlcyA9IHt9LFxuXG4gICAgICAgIC8vIGV4dHJhIG1vbWVudCBpbnRlcm5hbCBwcm9wZXJ0aWVzIChwbHVnaW5zIHJlZ2lzdGVyIHByb3BzIGhlcmUpXG4gICAgICAgIG1vbWVudFByb3BlcnRpZXMgPSBbXSxcblxuICAgICAgICAvLyBjaGVjayBmb3Igbm9kZUpTXG4gICAgICAgIGhhc01vZHVsZSA9ICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGUgJiYgbW9kdWxlLmV4cG9ydHMpLFxuXG4gICAgICAgIC8vIEFTUC5ORVQganNvbiBkYXRlIGZvcm1hdCByZWdleFxuICAgICAgICBhc3BOZXRKc29uUmVnZXggPSAvXlxcLz9EYXRlXFwoKFxcLT9cXGQrKS9pLFxuICAgICAgICBhc3BOZXRUaW1lU3Bhbkpzb25SZWdleCA9IC8oXFwtKT8oPzooXFxkKilcXC4pPyhcXGQrKVxcOihcXGQrKSg/OlxcOihcXGQrKVxcLj8oXFxkezN9KT8pPy8sXG5cbiAgICAgICAgLy8gZnJvbSBodHRwOi8vZG9jcy5jbG9zdXJlLWxpYnJhcnkuZ29vZ2xlY29kZS5jb20vZ2l0L2Nsb3N1cmVfZ29vZ19kYXRlX2RhdGUuanMuc291cmNlLmh0bWxcbiAgICAgICAgLy8gc29tZXdoYXQgbW9yZSBpbiBsaW5lIHdpdGggNC40LjMuMiAyMDA0IHNwZWMsIGJ1dCBhbGxvd3MgZGVjaW1hbCBhbnl3aGVyZVxuICAgICAgICBpc29EdXJhdGlvblJlZ2V4ID0gL14oLSk/UCg/Oig/OihbMC05LC5dKilZKT8oPzooWzAtOSwuXSopTSk/KD86KFswLTksLl0qKUQpPyg/OlQoPzooWzAtOSwuXSopSCk/KD86KFswLTksLl0qKU0pPyg/OihbMC05LC5dKilTKT8pP3woWzAtOSwuXSopVykkLyxcblxuICAgICAgICAvLyBmb3JtYXQgdG9rZW5zXG4gICAgICAgIGZvcm1hdHRpbmdUb2tlbnMgPSAvKFxcW1teXFxbXSpcXF0pfChcXFxcKT8oTW98TU0/TT9NP3xEb3xERERvfEREP0Q/RD98ZGRkP2Q/fGRvP3x3W298d10/fFdbb3xXXT98UXxZWVlZWVl8WVlZWVl8WVlZWXxZWXxnZyhnZ2c/KT98R0coR0dHPyk/fGV8RXxhfEF8aGg/fEhIP3xtbT98c3M/fFN7MSw0fXx4fFh8eno/fFpaP3wuKS9nLFxuICAgICAgICBsb2NhbEZvcm1hdHRpbmdUb2tlbnMgPSAvKFxcW1teXFxbXSpcXF0pfChcXFxcKT8oTFRTfExUfExMP0w/TD98bHsxLDR9KS9nLFxuXG4gICAgICAgIC8vIHBhcnNpbmcgdG9rZW4gcmVnZXhlc1xuICAgICAgICBwYXJzZVRva2VuT25lT3JUd29EaWdpdHMgPSAvXFxkXFxkPy8sIC8vIDAgLSA5OVxuICAgICAgICBwYXJzZVRva2VuT25lVG9UaHJlZURpZ2l0cyA9IC9cXGR7MSwzfS8sIC8vIDAgLSA5OTlcbiAgICAgICAgcGFyc2VUb2tlbk9uZVRvRm91ckRpZ2l0cyA9IC9cXGR7MSw0fS8sIC8vIDAgLSA5OTk5XG4gICAgICAgIHBhcnNlVG9rZW5PbmVUb1NpeERpZ2l0cyA9IC9bK1xcLV0/XFxkezEsNn0vLCAvLyAtOTk5LDk5OSAtIDk5OSw5OTlcbiAgICAgICAgcGFyc2VUb2tlbkRpZ2l0cyA9IC9cXGQrLywgLy8gbm9uemVybyBudW1iZXIgb2YgZGlnaXRzXG4gICAgICAgIHBhcnNlVG9rZW5Xb3JkID0gL1swLTldKlsnYS16XFx1MDBBMC1cXHUwNUZGXFx1MDcwMC1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkVGXSt8W1xcdTA2MDAtXFx1MDZGRlxcL10rKFxccyo/W1xcdTA2MDAtXFx1MDZGRl0rKXsxLDJ9L2ksIC8vIGFueSB3b3JkIChvciB0d28pIGNoYXJhY3RlcnMgb3IgbnVtYmVycyBpbmNsdWRpbmcgdHdvL3RocmVlIHdvcmQgbW9udGggaW4gYXJhYmljLlxuICAgICAgICBwYXJzZVRva2VuVGltZXpvbmUgPSAvWnxbXFwrXFwtXVxcZFxcZDo/XFxkXFxkL2dpLCAvLyArMDA6MDAgLTAwOjAwICswMDAwIC0wMDAwIG9yIFpcbiAgICAgICAgcGFyc2VUb2tlblQgPSAvVC9pLCAvLyBUIChJU08gc2VwYXJhdG9yKVxuICAgICAgICBwYXJzZVRva2VuT2Zmc2V0TXMgPSAvW1xcK1xcLV0/XFxkKy8sIC8vIDEyMzQ1Njc4OTAxMjNcbiAgICAgICAgcGFyc2VUb2tlblRpbWVzdGFtcE1zID0gL1tcXCtcXC1dP1xcZCsoXFwuXFxkezEsM30pPy8sIC8vIDEyMzQ1Njc4OSAxMjM0NTY3ODkuMTIzXG5cbiAgICAgICAgLy9zdHJpY3QgcGFyc2luZyByZWdleGVzXG4gICAgICAgIHBhcnNlVG9rZW5PbmVEaWdpdCA9IC9cXGQvLCAvLyAwIC0gOVxuICAgICAgICBwYXJzZVRva2VuVHdvRGlnaXRzID0gL1xcZFxcZC8sIC8vIDAwIC0gOTlcbiAgICAgICAgcGFyc2VUb2tlblRocmVlRGlnaXRzID0gL1xcZHszfS8sIC8vIDAwMCAtIDk5OVxuICAgICAgICBwYXJzZVRva2VuRm91ckRpZ2l0cyA9IC9cXGR7NH0vLCAvLyAwMDAwIC0gOTk5OVxuICAgICAgICBwYXJzZVRva2VuU2l4RGlnaXRzID0gL1srLV0/XFxkezZ9LywgLy8gLTk5OSw5OTkgLSA5OTksOTk5XG4gICAgICAgIHBhcnNlVG9rZW5TaWduZWROdW1iZXIgPSAvWystXT9cXGQrLywgLy8gLWluZiAtIGluZlxuXG4gICAgICAgIC8vIGlzbyA4NjAxIHJlZ2V4XG4gICAgICAgIC8vIDAwMDAtMDAtMDAgMDAwMC1XMDAgb3IgMDAwMC1XMDAtMCArIFQgKyAwMCBvciAwMDowMCBvciAwMDowMDowMCBvciAwMDowMDowMC4wMDAgKyArMDA6MDAgb3IgKzAwMDAgb3IgKzAwKVxuICAgICAgICBpc29SZWdleCA9IC9eXFxzKig/OlsrLV1cXGR7Nn18XFxkezR9KS0oPzooXFxkXFxkLVxcZFxcZCl8KFdcXGRcXGQkKXwoV1xcZFxcZC1cXGQpfChcXGRcXGRcXGQpKSgoVHwgKShcXGRcXGQoOlxcZFxcZCg6XFxkXFxkKFxcLlxcZCspPyk/KT8pPyhbXFwrXFwtXVxcZFxcZCg/Ojo/XFxkXFxkKT98XFxzKlopPyk/JC8sXG5cbiAgICAgICAgaXNvRm9ybWF0ID0gJ1lZWVktTU0tRERUSEg6bW06c3NaJyxcblxuICAgICAgICBpc29EYXRlcyA9IFtcbiAgICAgICAgICAgIFsnWVlZWVlZLU1NLUREJywgL1srLV1cXGR7Nn0tXFxkezJ9LVxcZHsyfS9dLFxuICAgICAgICAgICAgWydZWVlZLU1NLUREJywgL1xcZHs0fS1cXGR7Mn0tXFxkezJ9L10sXG4gICAgICAgICAgICBbJ0dHR0ctW1ddV1ctRScsIC9cXGR7NH0tV1xcZHsyfS1cXGQvXSxcbiAgICAgICAgICAgIFsnR0dHRy1bV11XVycsIC9cXGR7NH0tV1xcZHsyfS9dLFxuICAgICAgICAgICAgWydZWVlZLURERCcsIC9cXGR7NH0tXFxkezN9L11cbiAgICAgICAgXSxcblxuICAgICAgICAvLyBpc28gdGltZSBmb3JtYXRzIGFuZCByZWdleGVzXG4gICAgICAgIGlzb1RpbWVzID0gW1xuICAgICAgICAgICAgWydISDptbTpzcy5TU1NTJywgLyhUfCApXFxkXFxkOlxcZFxcZDpcXGRcXGRcXC5cXGQrL10sXG4gICAgICAgICAgICBbJ0hIOm1tOnNzJywgLyhUfCApXFxkXFxkOlxcZFxcZDpcXGRcXGQvXSxcbiAgICAgICAgICAgIFsnSEg6bW0nLCAvKFR8IClcXGRcXGQ6XFxkXFxkL10sXG4gICAgICAgICAgICBbJ0hIJywgLyhUfCApXFxkXFxkL11cbiAgICAgICAgXSxcblxuICAgICAgICAvLyB0aW1lem9uZSBjaHVua2VyICcrMTA6MDAnID4gWycxMCcsICcwMCddIG9yICctMTUzMCcgPiBbJy0nLCAnMTUnLCAnMzAnXVxuICAgICAgICBwYXJzZVRpbWV6b25lQ2h1bmtlciA9IC8oW1xcK1xcLV18XFxkXFxkKS9naSxcblxuICAgICAgICAvLyBnZXR0ZXIgYW5kIHNldHRlciBuYW1lc1xuICAgICAgICBwcm94eUdldHRlcnNBbmRTZXR0ZXJzID0gJ0RhdGV8SG91cnN8TWludXRlc3xTZWNvbmRzfE1pbGxpc2Vjb25kcycuc3BsaXQoJ3wnKSxcbiAgICAgICAgdW5pdE1pbGxpc2Vjb25kRmFjdG9ycyA9IHtcbiAgICAgICAgICAgICdNaWxsaXNlY29uZHMnIDogMSxcbiAgICAgICAgICAgICdTZWNvbmRzJyA6IDFlMyxcbiAgICAgICAgICAgICdNaW51dGVzJyA6IDZlNCxcbiAgICAgICAgICAgICdIb3VycycgOiAzNmU1LFxuICAgICAgICAgICAgJ0RheXMnIDogODY0ZTUsXG4gICAgICAgICAgICAnTW9udGhzJyA6IDI1OTJlNixcbiAgICAgICAgICAgICdZZWFycycgOiAzMTUzNmU2XG4gICAgICAgIH0sXG5cbiAgICAgICAgdW5pdEFsaWFzZXMgPSB7XG4gICAgICAgICAgICBtcyA6ICdtaWxsaXNlY29uZCcsXG4gICAgICAgICAgICBzIDogJ3NlY29uZCcsXG4gICAgICAgICAgICBtIDogJ21pbnV0ZScsXG4gICAgICAgICAgICBoIDogJ2hvdXInLFxuICAgICAgICAgICAgZCA6ICdkYXknLFxuICAgICAgICAgICAgRCA6ICdkYXRlJyxcbiAgICAgICAgICAgIHcgOiAnd2VlaycsXG4gICAgICAgICAgICBXIDogJ2lzb1dlZWsnLFxuICAgICAgICAgICAgTSA6ICdtb250aCcsXG4gICAgICAgICAgICBRIDogJ3F1YXJ0ZXInLFxuICAgICAgICAgICAgeSA6ICd5ZWFyJyxcbiAgICAgICAgICAgIERERCA6ICdkYXlPZlllYXInLFxuICAgICAgICAgICAgZSA6ICd3ZWVrZGF5JyxcbiAgICAgICAgICAgIEUgOiAnaXNvV2Vla2RheScsXG4gICAgICAgICAgICBnZzogJ3dlZWtZZWFyJyxcbiAgICAgICAgICAgIEdHOiAnaXNvV2Vla1llYXInXG4gICAgICAgIH0sXG5cbiAgICAgICAgY2FtZWxGdW5jdGlvbnMgPSB7XG4gICAgICAgICAgICBkYXlvZnllYXIgOiAnZGF5T2ZZZWFyJyxcbiAgICAgICAgICAgIGlzb3dlZWtkYXkgOiAnaXNvV2Vla2RheScsXG4gICAgICAgICAgICBpc293ZWVrIDogJ2lzb1dlZWsnLFxuICAgICAgICAgICAgd2Vla3llYXIgOiAnd2Vla1llYXInLFxuICAgICAgICAgICAgaXNvd2Vla3llYXIgOiAnaXNvV2Vla1llYXInXG4gICAgICAgIH0sXG5cbiAgICAgICAgLy8gZm9ybWF0IGZ1bmN0aW9uIHN0cmluZ3NcbiAgICAgICAgZm9ybWF0RnVuY3Rpb25zID0ge30sXG5cbiAgICAgICAgLy8gZGVmYXVsdCByZWxhdGl2ZSB0aW1lIHRocmVzaG9sZHNcbiAgICAgICAgcmVsYXRpdmVUaW1lVGhyZXNob2xkcyA9IHtcbiAgICAgICAgICAgIHM6IDQ1LCAgLy8gc2Vjb25kcyB0byBtaW51dGVcbiAgICAgICAgICAgIG06IDQ1LCAgLy8gbWludXRlcyB0byBob3VyXG4gICAgICAgICAgICBoOiAyMiwgIC8vIGhvdXJzIHRvIGRheVxuICAgICAgICAgICAgZDogMjYsICAvLyBkYXlzIHRvIG1vbnRoXG4gICAgICAgICAgICBNOiAxMSAgIC8vIG1vbnRocyB0byB5ZWFyXG4gICAgICAgIH0sXG5cbiAgICAgICAgLy8gdG9rZW5zIHRvIG9yZGluYWxpemUgYW5kIHBhZFxuICAgICAgICBvcmRpbmFsaXplVG9rZW5zID0gJ0RERCB3IFcgTSBEIGQnLnNwbGl0KCcgJyksXG4gICAgICAgIHBhZGRlZFRva2VucyA9ICdNIEQgSCBoIG0gcyB3IFcnLnNwbGl0KCcgJyksXG5cbiAgICAgICAgZm9ybWF0VG9rZW5GdW5jdGlvbnMgPSB7XG4gICAgICAgICAgICBNICAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLm1vbnRoKCkgKyAxO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIE1NTSAgOiBmdW5jdGlvbiAoZm9ybWF0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMubG9jYWxlRGF0YSgpLm1vbnRoc1Nob3J0KHRoaXMsIGZvcm1hdCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgTU1NTSA6IGZ1bmN0aW9uIChmb3JtYXQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5sb2NhbGVEYXRhKCkubW9udGhzKHRoaXMsIGZvcm1hdCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgRCAgICA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5kYXRlKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgREREICA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5kYXlPZlllYXIoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBkICAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmRheSgpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGRkICAgOiBmdW5jdGlvbiAoZm9ybWF0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMubG9jYWxlRGF0YSgpLndlZWtkYXlzTWluKHRoaXMsIGZvcm1hdCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZGRkICA6IGZ1bmN0aW9uIChmb3JtYXQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5sb2NhbGVEYXRhKCkud2Vla2RheXNTaG9ydCh0aGlzLCBmb3JtYXQpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGRkZGQgOiBmdW5jdGlvbiAoZm9ybWF0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMubG9jYWxlRGF0YSgpLndlZWtkYXlzKHRoaXMsIGZvcm1hdCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdyAgICA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy53ZWVrKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgVyAgICA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5pc29XZWVrKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgWVkgICA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbGVmdFplcm9GaWxsKHRoaXMueWVhcigpICUgMTAwLCAyKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBZWVlZIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBsZWZ0WmVyb0ZpbGwodGhpcy55ZWFyKCksIDQpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFlZWVlZIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBsZWZ0WmVyb0ZpbGwodGhpcy55ZWFyKCksIDUpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFlZWVlZWSA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB2YXIgeSA9IHRoaXMueWVhcigpLCBzaWduID0geSA+PSAwID8gJysnIDogJy0nO1xuICAgICAgICAgICAgICAgIHJldHVybiBzaWduICsgbGVmdFplcm9GaWxsKE1hdGguYWJzKHkpLCA2KTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBnZyAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBsZWZ0WmVyb0ZpbGwodGhpcy53ZWVrWWVhcigpICUgMTAwLCAyKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBnZ2dnIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBsZWZ0WmVyb0ZpbGwodGhpcy53ZWVrWWVhcigpLCA0KTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBnZ2dnZyA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbGVmdFplcm9GaWxsKHRoaXMud2Vla1llYXIoKSwgNSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgR0cgICA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbGVmdFplcm9GaWxsKHRoaXMuaXNvV2Vla1llYXIoKSAlIDEwMCwgMik7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgR0dHRyA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbGVmdFplcm9GaWxsKHRoaXMuaXNvV2Vla1llYXIoKSwgNCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgR0dHR0cgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxlZnRaZXJvRmlsbCh0aGlzLmlzb1dlZWtZZWFyKCksIDUpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGUgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMud2Vla2RheSgpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIEUgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuaXNvV2Vla2RheSgpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGEgICAgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMubG9jYWxlRGF0YSgpLm1lcmlkaWVtKHRoaXMuaG91cnMoKSwgdGhpcy5taW51dGVzKCksIHRydWUpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIEEgICAgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMubG9jYWxlRGF0YSgpLm1lcmlkaWVtKHRoaXMuaG91cnMoKSwgdGhpcy5taW51dGVzKCksIGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBIICAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmhvdXJzKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgaCAgICA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5ob3VycygpICUgMTIgfHwgMTI7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbSAgICA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5taW51dGVzKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcyAgICA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5zZWNvbmRzKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgUyAgICA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdG9JbnQodGhpcy5taWxsaXNlY29uZHMoKSAvIDEwMCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgU1MgICA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbGVmdFplcm9GaWxsKHRvSW50KHRoaXMubWlsbGlzZWNvbmRzKCkgLyAxMCksIDIpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFNTUyAgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxlZnRaZXJvRmlsbCh0aGlzLm1pbGxpc2Vjb25kcygpLCAzKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBTU1NTIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBsZWZ0WmVyb0ZpbGwodGhpcy5taWxsaXNlY29uZHMoKSwgMyk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgWiAgICA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB2YXIgYSA9IHRoaXMudXRjT2Zmc2V0KCksXG4gICAgICAgICAgICAgICAgICAgIGIgPSAnKyc7XG4gICAgICAgICAgICAgICAgaWYgKGEgPCAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGEgPSAtYTtcbiAgICAgICAgICAgICAgICAgICAgYiA9ICctJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGIgKyBsZWZ0WmVyb0ZpbGwodG9JbnQoYSAvIDYwKSwgMikgKyAnOicgKyBsZWZ0WmVyb0ZpbGwodG9JbnQoYSkgJSA2MCwgMik7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgWlogICA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB2YXIgYSA9IHRoaXMudXRjT2Zmc2V0KCksXG4gICAgICAgICAgICAgICAgICAgIGIgPSAnKyc7XG4gICAgICAgICAgICAgICAgaWYgKGEgPCAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGEgPSAtYTtcbiAgICAgICAgICAgICAgICAgICAgYiA9ICctJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGIgKyBsZWZ0WmVyb0ZpbGwodG9JbnQoYSAvIDYwKSwgMikgKyBsZWZ0WmVyb0ZpbGwodG9JbnQoYSkgJSA2MCwgMik7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgeiA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy56b25lQWJicigpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHp6IDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnpvbmVOYW1lKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgeCAgICA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy52YWx1ZU9mKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgWCAgICA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy51bml4KCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgUSA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5xdWFydGVyKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgZGVwcmVjYXRpb25zID0ge30sXG5cbiAgICAgICAgbGlzdHMgPSBbJ21vbnRocycsICdtb250aHNTaG9ydCcsICd3ZWVrZGF5cycsICd3ZWVrZGF5c1Nob3J0JywgJ3dlZWtkYXlzTWluJ10sXG5cbiAgICAgICAgdXBkYXRlSW5Qcm9ncmVzcyA9IGZhbHNlO1xuXG4gICAgLy8gUGljayB0aGUgZmlyc3QgZGVmaW5lZCBvZiB0d28gb3IgdGhyZWUgYXJndW1lbnRzLiBkZmwgY29tZXMgZnJvbVxuICAgIC8vIGRlZmF1bHQuXG4gICAgZnVuY3Rpb24gZGZsKGEsIGIsIGMpIHtcbiAgICAgICAgc3dpdGNoIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAgICAgICBjYXNlIDI6IHJldHVybiBhICE9IG51bGwgPyBhIDogYjtcbiAgICAgICAgICAgIGNhc2UgMzogcmV0dXJuIGEgIT0gbnVsbCA/IGEgOiBiICE9IG51bGwgPyBiIDogYztcbiAgICAgICAgICAgIGRlZmF1bHQ6IHRocm93IG5ldyBFcnJvcignSW1wbGVtZW50IG1lJyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBoYXNPd25Qcm9wKGEsIGIpIHtcbiAgICAgICAgcmV0dXJuIGhhc093blByb3BlcnR5LmNhbGwoYSwgYik7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZGVmYXVsdFBhcnNpbmdGbGFncygpIHtcbiAgICAgICAgLy8gV2UgbmVlZCB0byBkZWVwIGNsb25lIHRoaXMgb2JqZWN0LCBhbmQgZXM1IHN0YW5kYXJkIGlzIG5vdCB2ZXJ5XG4gICAgICAgIC8vIGhlbHBmdWwuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBlbXB0eSA6IGZhbHNlLFxuICAgICAgICAgICAgdW51c2VkVG9rZW5zIDogW10sXG4gICAgICAgICAgICB1bnVzZWRJbnB1dCA6IFtdLFxuICAgICAgICAgICAgb3ZlcmZsb3cgOiAtMixcbiAgICAgICAgICAgIGNoYXJzTGVmdE92ZXIgOiAwLFxuICAgICAgICAgICAgbnVsbElucHV0IDogZmFsc2UsXG4gICAgICAgICAgICBpbnZhbGlkTW9udGggOiBudWxsLFxuICAgICAgICAgICAgaW52YWxpZEZvcm1hdCA6IGZhbHNlLFxuICAgICAgICAgICAgdXNlckludmFsaWRhdGVkIDogZmFsc2UsXG4gICAgICAgICAgICBpc286IGZhbHNlXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcHJpbnRNc2cobXNnKSB7XG4gICAgICAgIGlmIChtb21lbnQuc3VwcHJlc3NEZXByZWNhdGlvbldhcm5pbmdzID09PSBmYWxzZSAmJlxuICAgICAgICAgICAgICAgIHR5cGVvZiBjb25zb2xlICE9PSAndW5kZWZpbmVkJyAmJiBjb25zb2xlLndhcm4pIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybignRGVwcmVjYXRpb24gd2FybmluZzogJyArIG1zZyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkZXByZWNhdGUobXNnLCBmbikge1xuICAgICAgICB2YXIgZmlyc3RUaW1lID0gdHJ1ZTtcbiAgICAgICAgcmV0dXJuIGV4dGVuZChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAoZmlyc3RUaW1lKSB7XG4gICAgICAgICAgICAgICAgcHJpbnRNc2cobXNnKTtcbiAgICAgICAgICAgICAgICBmaXJzdFRpbWUgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICB9LCBmbik7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZGVwcmVjYXRlU2ltcGxlKG5hbWUsIG1zZykge1xuICAgICAgICBpZiAoIWRlcHJlY2F0aW9uc1tuYW1lXSkge1xuICAgICAgICAgICAgcHJpbnRNc2cobXNnKTtcbiAgICAgICAgICAgIGRlcHJlY2F0aW9uc1tuYW1lXSA9IHRydWU7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwYWRUb2tlbihmdW5jLCBjb3VudCkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGEpIHtcbiAgICAgICAgICAgIHJldHVybiBsZWZ0WmVyb0ZpbGwoZnVuYy5jYWxsKHRoaXMsIGEpLCBjb3VudCk7XG4gICAgICAgIH07XG4gICAgfVxuICAgIGZ1bmN0aW9uIG9yZGluYWxpemVUb2tlbihmdW5jLCBwZXJpb2QpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChhKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5sb2NhbGVEYXRhKCkub3JkaW5hbChmdW5jLmNhbGwodGhpcywgYSksIHBlcmlvZCk7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbW9udGhEaWZmKGEsIGIpIHtcbiAgICAgICAgLy8gZGlmZmVyZW5jZSBpbiBtb250aHNcbiAgICAgICAgdmFyIHdob2xlTW9udGhEaWZmID0gKChiLnllYXIoKSAtIGEueWVhcigpKSAqIDEyKSArIChiLm1vbnRoKCkgLSBhLm1vbnRoKCkpLFxuICAgICAgICAgICAgLy8gYiBpcyBpbiAoYW5jaG9yIC0gMSBtb250aCwgYW5jaG9yICsgMSBtb250aClcbiAgICAgICAgICAgIGFuY2hvciA9IGEuY2xvbmUoKS5hZGQod2hvbGVNb250aERpZmYsICdtb250aHMnKSxcbiAgICAgICAgICAgIGFuY2hvcjIsIGFkanVzdDtcblxuICAgICAgICBpZiAoYiAtIGFuY2hvciA8IDApIHtcbiAgICAgICAgICAgIGFuY2hvcjIgPSBhLmNsb25lKCkuYWRkKHdob2xlTW9udGhEaWZmIC0gMSwgJ21vbnRocycpO1xuICAgICAgICAgICAgLy8gbGluZWFyIGFjcm9zcyB0aGUgbW9udGhcbiAgICAgICAgICAgIGFkanVzdCA9IChiIC0gYW5jaG9yKSAvIChhbmNob3IgLSBhbmNob3IyKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGFuY2hvcjIgPSBhLmNsb25lKCkuYWRkKHdob2xlTW9udGhEaWZmICsgMSwgJ21vbnRocycpO1xuICAgICAgICAgICAgLy8gbGluZWFyIGFjcm9zcyB0aGUgbW9udGhcbiAgICAgICAgICAgIGFkanVzdCA9IChiIC0gYW5jaG9yKSAvIChhbmNob3IyIC0gYW5jaG9yKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiAtKHdob2xlTW9udGhEaWZmICsgYWRqdXN0KTtcbiAgICB9XG5cbiAgICB3aGlsZSAob3JkaW5hbGl6ZVRva2Vucy5sZW5ndGgpIHtcbiAgICAgICAgaSA9IG9yZGluYWxpemVUb2tlbnMucG9wKCk7XG4gICAgICAgIGZvcm1hdFRva2VuRnVuY3Rpb25zW2kgKyAnbyddID0gb3JkaW5hbGl6ZVRva2VuKGZvcm1hdFRva2VuRnVuY3Rpb25zW2ldLCBpKTtcbiAgICB9XG4gICAgd2hpbGUgKHBhZGRlZFRva2Vucy5sZW5ndGgpIHtcbiAgICAgICAgaSA9IHBhZGRlZFRva2Vucy5wb3AoKTtcbiAgICAgICAgZm9ybWF0VG9rZW5GdW5jdGlvbnNbaSArIGldID0gcGFkVG9rZW4oZm9ybWF0VG9rZW5GdW5jdGlvbnNbaV0sIDIpO1xuICAgIH1cbiAgICBmb3JtYXRUb2tlbkZ1bmN0aW9ucy5EREREID0gcGFkVG9rZW4oZm9ybWF0VG9rZW5GdW5jdGlvbnMuRERELCAzKTtcblxuXG4gICAgZnVuY3Rpb24gbWVyaWRpZW1GaXhXcmFwKGxvY2FsZSwgaG91ciwgbWVyaWRpZW0pIHtcbiAgICAgICAgdmFyIGlzUG07XG5cbiAgICAgICAgaWYgKG1lcmlkaWVtID09IG51bGwpIHtcbiAgICAgICAgICAgIC8vIG5vdGhpbmcgdG8gZG9cbiAgICAgICAgICAgIHJldHVybiBob3VyO1xuICAgICAgICB9XG4gICAgICAgIGlmIChsb2NhbGUubWVyaWRpZW1Ib3VyICE9IG51bGwpIHtcbiAgICAgICAgICAgIHJldHVybiBsb2NhbGUubWVyaWRpZW1Ib3VyKGhvdXIsIG1lcmlkaWVtKTtcbiAgICAgICAgfSBlbHNlIGlmIChsb2NhbGUuaXNQTSAhPSBudWxsKSB7XG4gICAgICAgICAgICAvLyBGYWxsYmFja1xuICAgICAgICAgICAgaXNQbSA9IGxvY2FsZS5pc1BNKG1lcmlkaWVtKTtcbiAgICAgICAgICAgIGlmIChpc1BtICYmIGhvdXIgPCAxMikge1xuICAgICAgICAgICAgICAgIGhvdXIgKz0gMTI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIWlzUG0gJiYgaG91ciA9PT0gMTIpIHtcbiAgICAgICAgICAgICAgICBob3VyID0gMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBob3VyO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gdGhpZSBpcyBub3Qgc3VwcG9zZWQgdG8gaGFwcGVuXG4gICAgICAgICAgICByZXR1cm4gaG91cjtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAgICAgICAgQ29uc3RydWN0b3JzXG4gICAgKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG4gICAgZnVuY3Rpb24gTG9jYWxlKCkge1xuICAgIH1cblxuICAgIC8vIE1vbWVudCBwcm90b3R5cGUgb2JqZWN0XG4gICAgZnVuY3Rpb24gTW9tZW50KGNvbmZpZywgc2tpcE92ZXJmbG93KSB7XG4gICAgICAgIGlmIChza2lwT3ZlcmZsb3cgIT09IGZhbHNlKSB7XG4gICAgICAgICAgICBjaGVja092ZXJmbG93KGNvbmZpZyk7XG4gICAgICAgIH1cbiAgICAgICAgY29weUNvbmZpZyh0aGlzLCBjb25maWcpO1xuICAgICAgICB0aGlzLl9kID0gbmV3IERhdGUoK2NvbmZpZy5fZCk7XG4gICAgICAgIC8vIFByZXZlbnQgaW5maW5pdGUgbG9vcCBpbiBjYXNlIHVwZGF0ZU9mZnNldCBjcmVhdGVzIG5ldyBtb21lbnRcbiAgICAgICAgLy8gb2JqZWN0cy5cbiAgICAgICAgaWYgKHVwZGF0ZUluUHJvZ3Jlc3MgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICB1cGRhdGVJblByb2dyZXNzID0gdHJ1ZTtcbiAgICAgICAgICAgIG1vbWVudC51cGRhdGVPZmZzZXQodGhpcyk7XG4gICAgICAgICAgICB1cGRhdGVJblByb2dyZXNzID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBEdXJhdGlvbiBDb25zdHJ1Y3RvclxuICAgIGZ1bmN0aW9uIER1cmF0aW9uKGR1cmF0aW9uKSB7XG4gICAgICAgIHZhciBub3JtYWxpemVkSW5wdXQgPSBub3JtYWxpemVPYmplY3RVbml0cyhkdXJhdGlvbiksXG4gICAgICAgICAgICB5ZWFycyA9IG5vcm1hbGl6ZWRJbnB1dC55ZWFyIHx8IDAsXG4gICAgICAgICAgICBxdWFydGVycyA9IG5vcm1hbGl6ZWRJbnB1dC5xdWFydGVyIHx8IDAsXG4gICAgICAgICAgICBtb250aHMgPSBub3JtYWxpemVkSW5wdXQubW9udGggfHwgMCxcbiAgICAgICAgICAgIHdlZWtzID0gbm9ybWFsaXplZElucHV0LndlZWsgfHwgMCxcbiAgICAgICAgICAgIGRheXMgPSBub3JtYWxpemVkSW5wdXQuZGF5IHx8IDAsXG4gICAgICAgICAgICBob3VycyA9IG5vcm1hbGl6ZWRJbnB1dC5ob3VyIHx8IDAsXG4gICAgICAgICAgICBtaW51dGVzID0gbm9ybWFsaXplZElucHV0Lm1pbnV0ZSB8fCAwLFxuICAgICAgICAgICAgc2Vjb25kcyA9IG5vcm1hbGl6ZWRJbnB1dC5zZWNvbmQgfHwgMCxcbiAgICAgICAgICAgIG1pbGxpc2Vjb25kcyA9IG5vcm1hbGl6ZWRJbnB1dC5taWxsaXNlY29uZCB8fCAwO1xuXG4gICAgICAgIC8vIHJlcHJlc2VudGF0aW9uIGZvciBkYXRlQWRkUmVtb3ZlXG4gICAgICAgIHRoaXMuX21pbGxpc2Vjb25kcyA9ICttaWxsaXNlY29uZHMgK1xuICAgICAgICAgICAgc2Vjb25kcyAqIDFlMyArIC8vIDEwMDBcbiAgICAgICAgICAgIG1pbnV0ZXMgKiA2ZTQgKyAvLyAxMDAwICogNjBcbiAgICAgICAgICAgIGhvdXJzICogMzZlNTsgLy8gMTAwMCAqIDYwICogNjBcbiAgICAgICAgLy8gQmVjYXVzZSBvZiBkYXRlQWRkUmVtb3ZlIHRyZWF0cyAyNCBob3VycyBhcyBkaWZmZXJlbnQgZnJvbSBhXG4gICAgICAgIC8vIGRheSB3aGVuIHdvcmtpbmcgYXJvdW5kIERTVCwgd2UgbmVlZCB0byBzdG9yZSB0aGVtIHNlcGFyYXRlbHlcbiAgICAgICAgdGhpcy5fZGF5cyA9ICtkYXlzICtcbiAgICAgICAgICAgIHdlZWtzICogNztcbiAgICAgICAgLy8gSXQgaXMgaW1wb3NzaWJsZSB0cmFuc2xhdGUgbW9udGhzIGludG8gZGF5cyB3aXRob3V0IGtub3dpbmdcbiAgICAgICAgLy8gd2hpY2ggbW9udGhzIHlvdSBhcmUgYXJlIHRhbGtpbmcgYWJvdXQsIHNvIHdlIGhhdmUgdG8gc3RvcmVcbiAgICAgICAgLy8gaXQgc2VwYXJhdGVseS5cbiAgICAgICAgdGhpcy5fbW9udGhzID0gK21vbnRocyArXG4gICAgICAgICAgICBxdWFydGVycyAqIDMgK1xuICAgICAgICAgICAgeWVhcnMgKiAxMjtcblxuICAgICAgICB0aGlzLl9kYXRhID0ge307XG5cbiAgICAgICAgdGhpcy5fbG9jYWxlID0gbW9tZW50LmxvY2FsZURhdGEoKTtcblxuICAgICAgICB0aGlzLl9idWJibGUoKTtcbiAgICB9XG5cbiAgICAvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gICAgICAgIEhlbHBlcnNcbiAgICAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cblxuICAgIGZ1bmN0aW9uIGV4dGVuZChhLCBiKSB7XG4gICAgICAgIGZvciAodmFyIGkgaW4gYikge1xuICAgICAgICAgICAgaWYgKGhhc093blByb3AoYiwgaSkpIHtcbiAgICAgICAgICAgICAgICBhW2ldID0gYltpXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChoYXNPd25Qcm9wKGIsICd0b1N0cmluZycpKSB7XG4gICAgICAgICAgICBhLnRvU3RyaW5nID0gYi50b1N0cmluZztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChoYXNPd25Qcm9wKGIsICd2YWx1ZU9mJykpIHtcbiAgICAgICAgICAgIGEudmFsdWVPZiA9IGIudmFsdWVPZjtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBhO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNvcHlDb25maWcodG8sIGZyb20pIHtcbiAgICAgICAgdmFyIGksIHByb3AsIHZhbDtcblxuICAgICAgICBpZiAodHlwZW9mIGZyb20uX2lzQU1vbWVudE9iamVjdCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHRvLl9pc0FNb21lbnRPYmplY3QgPSBmcm9tLl9pc0FNb21lbnRPYmplY3Q7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGVvZiBmcm9tLl9pICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgdG8uX2kgPSBmcm9tLl9pO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlb2YgZnJvbS5fZiAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHRvLl9mID0gZnJvbS5fZjtcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIGZyb20uX2wgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICB0by5fbCA9IGZyb20uX2w7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGVvZiBmcm9tLl9zdHJpY3QgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICB0by5fc3RyaWN0ID0gZnJvbS5fc3RyaWN0O1xuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlb2YgZnJvbS5fdHptICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgdG8uX3R6bSA9IGZyb20uX3R6bTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIGZyb20uX2lzVVRDICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgdG8uX2lzVVRDID0gZnJvbS5faXNVVEM7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGVvZiBmcm9tLl9vZmZzZXQgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICB0by5fb2Zmc2V0ID0gZnJvbS5fb2Zmc2V0O1xuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlb2YgZnJvbS5fcGYgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICB0by5fcGYgPSBmcm9tLl9wZjtcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIGZyb20uX2xvY2FsZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHRvLl9sb2NhbGUgPSBmcm9tLl9sb2NhbGU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobW9tZW50UHJvcGVydGllcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBmb3IgKGkgaW4gbW9tZW50UHJvcGVydGllcykge1xuICAgICAgICAgICAgICAgIHByb3AgPSBtb21lbnRQcm9wZXJ0aWVzW2ldO1xuICAgICAgICAgICAgICAgIHZhbCA9IGZyb21bcHJvcF07XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiB2YWwgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgIHRvW3Byb3BdID0gdmFsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0bztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBhYnNSb3VuZChudW1iZXIpIHtcbiAgICAgICAgaWYgKG51bWJlciA8IDApIHtcbiAgICAgICAgICAgIHJldHVybiBNYXRoLmNlaWwobnVtYmVyKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBNYXRoLmZsb29yKG51bWJlcik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBsZWZ0IHplcm8gZmlsbCBhIG51bWJlclxuICAgIC8vIHNlZSBodHRwOi8vanNwZXJmLmNvbS9sZWZ0LXplcm8tZmlsbGluZyBmb3IgcGVyZm9ybWFuY2UgY29tcGFyaXNvblxuICAgIGZ1bmN0aW9uIGxlZnRaZXJvRmlsbChudW1iZXIsIHRhcmdldExlbmd0aCwgZm9yY2VTaWduKSB7XG4gICAgICAgIHZhciBvdXRwdXQgPSAnJyArIE1hdGguYWJzKG51bWJlciksXG4gICAgICAgICAgICBzaWduID0gbnVtYmVyID49IDA7XG5cbiAgICAgICAgd2hpbGUgKG91dHB1dC5sZW5ndGggPCB0YXJnZXRMZW5ndGgpIHtcbiAgICAgICAgICAgIG91dHB1dCA9ICcwJyArIG91dHB1dDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gKHNpZ24gPyAoZm9yY2VTaWduID8gJysnIDogJycpIDogJy0nKSArIG91dHB1dDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwb3NpdGl2ZU1vbWVudHNEaWZmZXJlbmNlKGJhc2UsIG90aGVyKSB7XG4gICAgICAgIHZhciByZXMgPSB7bWlsbGlzZWNvbmRzOiAwLCBtb250aHM6IDB9O1xuXG4gICAgICAgIHJlcy5tb250aHMgPSBvdGhlci5tb250aCgpIC0gYmFzZS5tb250aCgpICtcbiAgICAgICAgICAgIChvdGhlci55ZWFyKCkgLSBiYXNlLnllYXIoKSkgKiAxMjtcbiAgICAgICAgaWYgKGJhc2UuY2xvbmUoKS5hZGQocmVzLm1vbnRocywgJ00nKS5pc0FmdGVyKG90aGVyKSkge1xuICAgICAgICAgICAgLS1yZXMubW9udGhzO1xuICAgICAgICB9XG5cbiAgICAgICAgcmVzLm1pbGxpc2Vjb25kcyA9ICtvdGhlciAtICsoYmFzZS5jbG9uZSgpLmFkZChyZXMubW9udGhzLCAnTScpKTtcblxuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG1vbWVudHNEaWZmZXJlbmNlKGJhc2UsIG90aGVyKSB7XG4gICAgICAgIHZhciByZXM7XG4gICAgICAgIG90aGVyID0gbWFrZUFzKG90aGVyLCBiYXNlKTtcbiAgICAgICAgaWYgKGJhc2UuaXNCZWZvcmUob3RoZXIpKSB7XG4gICAgICAgICAgICByZXMgPSBwb3NpdGl2ZU1vbWVudHNEaWZmZXJlbmNlKGJhc2UsIG90aGVyKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlcyA9IHBvc2l0aXZlTW9tZW50c0RpZmZlcmVuY2Uob3RoZXIsIGJhc2UpO1xuICAgICAgICAgICAgcmVzLm1pbGxpc2Vjb25kcyA9IC1yZXMubWlsbGlzZWNvbmRzO1xuICAgICAgICAgICAgcmVzLm1vbnRocyA9IC1yZXMubW9udGhzO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICB9XG5cbiAgICAvLyBUT0RPOiByZW1vdmUgJ25hbWUnIGFyZyBhZnRlciBkZXByZWNhdGlvbiBpcyByZW1vdmVkXG4gICAgZnVuY3Rpb24gY3JlYXRlQWRkZXIoZGlyZWN0aW9uLCBuYW1lKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAodmFsLCBwZXJpb2QpIHtcbiAgICAgICAgICAgIHZhciBkdXIsIHRtcDtcbiAgICAgICAgICAgIC8vaW52ZXJ0IHRoZSBhcmd1bWVudHMsIGJ1dCBjb21wbGFpbiBhYm91dCBpdFxuICAgICAgICAgICAgaWYgKHBlcmlvZCAhPT0gbnVsbCAmJiAhaXNOYU4oK3BlcmlvZCkpIHtcbiAgICAgICAgICAgICAgICBkZXByZWNhdGVTaW1wbGUobmFtZSwgJ21vbWVudCgpLicgKyBuYW1lICArICcocGVyaW9kLCBudW1iZXIpIGlzIGRlcHJlY2F0ZWQuIFBsZWFzZSB1c2UgbW9tZW50KCkuJyArIG5hbWUgKyAnKG51bWJlciwgcGVyaW9kKS4nKTtcbiAgICAgICAgICAgICAgICB0bXAgPSB2YWw7IHZhbCA9IHBlcmlvZDsgcGVyaW9kID0gdG1wO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YWwgPSB0eXBlb2YgdmFsID09PSAnc3RyaW5nJyA/ICt2YWwgOiB2YWw7XG4gICAgICAgICAgICBkdXIgPSBtb21lbnQuZHVyYXRpb24odmFsLCBwZXJpb2QpO1xuICAgICAgICAgICAgYWRkT3JTdWJ0cmFjdER1cmF0aW9uRnJvbU1vbWVudCh0aGlzLCBkdXIsIGRpcmVjdGlvbik7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBhZGRPclN1YnRyYWN0RHVyYXRpb25Gcm9tTW9tZW50KG1vbSwgZHVyYXRpb24sIGlzQWRkaW5nLCB1cGRhdGVPZmZzZXQpIHtcbiAgICAgICAgdmFyIG1pbGxpc2Vjb25kcyA9IGR1cmF0aW9uLl9taWxsaXNlY29uZHMsXG4gICAgICAgICAgICBkYXlzID0gZHVyYXRpb24uX2RheXMsXG4gICAgICAgICAgICBtb250aHMgPSBkdXJhdGlvbi5fbW9udGhzO1xuICAgICAgICB1cGRhdGVPZmZzZXQgPSB1cGRhdGVPZmZzZXQgPT0gbnVsbCA/IHRydWUgOiB1cGRhdGVPZmZzZXQ7XG5cbiAgICAgICAgaWYgKG1pbGxpc2Vjb25kcykge1xuICAgICAgICAgICAgbW9tLl9kLnNldFRpbWUoK21vbS5fZCArIG1pbGxpc2Vjb25kcyAqIGlzQWRkaW5nKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGF5cykge1xuICAgICAgICAgICAgcmF3U2V0dGVyKG1vbSwgJ0RhdGUnLCByYXdHZXR0ZXIobW9tLCAnRGF0ZScpICsgZGF5cyAqIGlzQWRkaW5nKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobW9udGhzKSB7XG4gICAgICAgICAgICByYXdNb250aFNldHRlcihtb20sIHJhd0dldHRlcihtb20sICdNb250aCcpICsgbW9udGhzICogaXNBZGRpbmcpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh1cGRhdGVPZmZzZXQpIHtcbiAgICAgICAgICAgIG1vbWVudC51cGRhdGVPZmZzZXQobW9tLCBkYXlzIHx8IG1vbnRocyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBjaGVjayBpZiBpcyBhbiBhcnJheVxuICAgIGZ1bmN0aW9uIGlzQXJyYXkoaW5wdXQpIHtcbiAgICAgICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChpbnB1dCkgPT09ICdbb2JqZWN0IEFycmF5XSc7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaXNEYXRlKGlucHV0KSB7XG4gICAgICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoaW5wdXQpID09PSAnW29iamVjdCBEYXRlXScgfHxcbiAgICAgICAgICAgIGlucHV0IGluc3RhbmNlb2YgRGF0ZTtcbiAgICB9XG5cbiAgICAvLyBjb21wYXJlIHR3byBhcnJheXMsIHJldHVybiB0aGUgbnVtYmVyIG9mIGRpZmZlcmVuY2VzXG4gICAgZnVuY3Rpb24gY29tcGFyZUFycmF5cyhhcnJheTEsIGFycmF5MiwgZG9udENvbnZlcnQpIHtcbiAgICAgICAgdmFyIGxlbiA9IE1hdGgubWluKGFycmF5MS5sZW5ndGgsIGFycmF5Mi5sZW5ndGgpLFxuICAgICAgICAgICAgbGVuZ3RoRGlmZiA9IE1hdGguYWJzKGFycmF5MS5sZW5ndGggLSBhcnJheTIubGVuZ3RoKSxcbiAgICAgICAgICAgIGRpZmZzID0gMCxcbiAgICAgICAgICAgIGk7XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgaWYgKChkb250Q29udmVydCAmJiBhcnJheTFbaV0gIT09IGFycmF5MltpXSkgfHxcbiAgICAgICAgICAgICAgICAoIWRvbnRDb252ZXJ0ICYmIHRvSW50KGFycmF5MVtpXSkgIT09IHRvSW50KGFycmF5MltpXSkpKSB7XG4gICAgICAgICAgICAgICAgZGlmZnMrKztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZGlmZnMgKyBsZW5ndGhEaWZmO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG5vcm1hbGl6ZVVuaXRzKHVuaXRzKSB7XG4gICAgICAgIGlmICh1bml0cykge1xuICAgICAgICAgICAgdmFyIGxvd2VyZWQgPSB1bml0cy50b0xvd2VyQ2FzZSgpLnJlcGxhY2UoLyguKXMkLywgJyQxJyk7XG4gICAgICAgICAgICB1bml0cyA9IHVuaXRBbGlhc2VzW3VuaXRzXSB8fCBjYW1lbEZ1bmN0aW9uc1tsb3dlcmVkXSB8fCBsb3dlcmVkO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB1bml0cztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBub3JtYWxpemVPYmplY3RVbml0cyhpbnB1dE9iamVjdCkge1xuICAgICAgICB2YXIgbm9ybWFsaXplZElucHV0ID0ge30sXG4gICAgICAgICAgICBub3JtYWxpemVkUHJvcCxcbiAgICAgICAgICAgIHByb3A7XG5cbiAgICAgICAgZm9yIChwcm9wIGluIGlucHV0T2JqZWN0KSB7XG4gICAgICAgICAgICBpZiAoaGFzT3duUHJvcChpbnB1dE9iamVjdCwgcHJvcCkpIHtcbiAgICAgICAgICAgICAgICBub3JtYWxpemVkUHJvcCA9IG5vcm1hbGl6ZVVuaXRzKHByb3ApO1xuICAgICAgICAgICAgICAgIGlmIChub3JtYWxpemVkUHJvcCkge1xuICAgICAgICAgICAgICAgICAgICBub3JtYWxpemVkSW5wdXRbbm9ybWFsaXplZFByb3BdID0gaW5wdXRPYmplY3RbcHJvcF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG5vcm1hbGl6ZWRJbnB1dDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBtYWtlTGlzdChmaWVsZCkge1xuICAgICAgICB2YXIgY291bnQsIHNldHRlcjtcblxuICAgICAgICBpZiAoZmllbGQuaW5kZXhPZignd2VlaycpID09PSAwKSB7XG4gICAgICAgICAgICBjb3VudCA9IDc7XG4gICAgICAgICAgICBzZXR0ZXIgPSAnZGF5JztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChmaWVsZC5pbmRleE9mKCdtb250aCcpID09PSAwKSB7XG4gICAgICAgICAgICBjb3VudCA9IDEyO1xuICAgICAgICAgICAgc2V0dGVyID0gJ21vbnRoJztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIG1vbWVudFtmaWVsZF0gPSBmdW5jdGlvbiAoZm9ybWF0LCBpbmRleCkge1xuICAgICAgICAgICAgdmFyIGksIGdldHRlcixcbiAgICAgICAgICAgICAgICBtZXRob2QgPSBtb21lbnQuX2xvY2FsZVtmaWVsZF0sXG4gICAgICAgICAgICAgICAgcmVzdWx0cyA9IFtdO1xuXG4gICAgICAgICAgICBpZiAodHlwZW9mIGZvcm1hdCA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgICAgICAgICBpbmRleCA9IGZvcm1hdDtcbiAgICAgICAgICAgICAgICBmb3JtYXQgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGdldHRlciA9IGZ1bmN0aW9uIChpKSB7XG4gICAgICAgICAgICAgICAgdmFyIG0gPSBtb21lbnQoKS51dGMoKS5zZXQoc2V0dGVyLCBpKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gbWV0aG9kLmNhbGwobW9tZW50Ll9sb2NhbGUsIG0sIGZvcm1hdCB8fCAnJyk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBpZiAoaW5kZXggIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBnZXR0ZXIoaW5kZXgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IGNvdW50OyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0cy5wdXNoKGdldHRlcihpKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHRzO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHRvSW50KGFyZ3VtZW50Rm9yQ29lcmNpb24pIHtcbiAgICAgICAgdmFyIGNvZXJjZWROdW1iZXIgPSArYXJndW1lbnRGb3JDb2VyY2lvbixcbiAgICAgICAgICAgIHZhbHVlID0gMDtcblxuICAgICAgICBpZiAoY29lcmNlZE51bWJlciAhPT0gMCAmJiBpc0Zpbml0ZShjb2VyY2VkTnVtYmVyKSkge1xuICAgICAgICAgICAgaWYgKGNvZXJjZWROdW1iZXIgPj0gMCkge1xuICAgICAgICAgICAgICAgIHZhbHVlID0gTWF0aC5mbG9vcihjb2VyY2VkTnVtYmVyKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFsdWUgPSBNYXRoLmNlaWwoY29lcmNlZE51bWJlcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZGF5c0luTW9udGgoeWVhciwgbW9udGgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBEYXRlKERhdGUuVVRDKHllYXIsIG1vbnRoICsgMSwgMCkpLmdldFVUQ0RhdGUoKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB3ZWVrc0luWWVhcih5ZWFyLCBkb3csIGRveSkge1xuICAgICAgICByZXR1cm4gd2Vla09mWWVhcihtb21lbnQoW3llYXIsIDExLCAzMSArIGRvdyAtIGRveV0pLCBkb3csIGRveSkud2VlaztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkYXlzSW5ZZWFyKHllYXIpIHtcbiAgICAgICAgcmV0dXJuIGlzTGVhcFllYXIoeWVhcikgPyAzNjYgOiAzNjU7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaXNMZWFwWWVhcih5ZWFyKSB7XG4gICAgICAgIHJldHVybiAoeWVhciAlIDQgPT09IDAgJiYgeWVhciAlIDEwMCAhPT0gMCkgfHwgeWVhciAlIDQwMCA9PT0gMDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjaGVja092ZXJmbG93KG0pIHtcbiAgICAgICAgdmFyIG92ZXJmbG93O1xuICAgICAgICBpZiAobS5fYSAmJiBtLl9wZi5vdmVyZmxvdyA9PT0gLTIpIHtcbiAgICAgICAgICAgIG92ZXJmbG93ID1cbiAgICAgICAgICAgICAgICBtLl9hW01PTlRIXSA8IDAgfHwgbS5fYVtNT05USF0gPiAxMSA/IE1PTlRIIDpcbiAgICAgICAgICAgICAgICBtLl9hW0RBVEVdIDwgMSB8fCBtLl9hW0RBVEVdID4gZGF5c0luTW9udGgobS5fYVtZRUFSXSwgbS5fYVtNT05USF0pID8gREFURSA6XG4gICAgICAgICAgICAgICAgbS5fYVtIT1VSXSA8IDAgfHwgbS5fYVtIT1VSXSA+IDI0IHx8XG4gICAgICAgICAgICAgICAgICAgIChtLl9hW0hPVVJdID09PSAyNCAmJiAobS5fYVtNSU5VVEVdICE9PSAwIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbS5fYVtTRUNPTkRdICE9PSAwIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbS5fYVtNSUxMSVNFQ09ORF0gIT09IDApKSA/IEhPVVIgOlxuICAgICAgICAgICAgICAgIG0uX2FbTUlOVVRFXSA8IDAgfHwgbS5fYVtNSU5VVEVdID4gNTkgPyBNSU5VVEUgOlxuICAgICAgICAgICAgICAgIG0uX2FbU0VDT05EXSA8IDAgfHwgbS5fYVtTRUNPTkRdID4gNTkgPyBTRUNPTkQgOlxuICAgICAgICAgICAgICAgIG0uX2FbTUlMTElTRUNPTkRdIDwgMCB8fCBtLl9hW01JTExJU0VDT05EXSA+IDk5OSA/IE1JTExJU0VDT05EIDpcbiAgICAgICAgICAgICAgICAtMTtcblxuICAgICAgICAgICAgaWYgKG0uX3BmLl9vdmVyZmxvd0RheU9mWWVhciAmJiAob3ZlcmZsb3cgPCBZRUFSIHx8IG92ZXJmbG93ID4gREFURSkpIHtcbiAgICAgICAgICAgICAgICBvdmVyZmxvdyA9IERBVEU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIG0uX3BmLm92ZXJmbG93ID0gb3ZlcmZsb3c7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpc1ZhbGlkKG0pIHtcbiAgICAgICAgaWYgKG0uX2lzVmFsaWQgPT0gbnVsbCkge1xuICAgICAgICAgICAgbS5faXNWYWxpZCA9ICFpc05hTihtLl9kLmdldFRpbWUoKSkgJiZcbiAgICAgICAgICAgICAgICBtLl9wZi5vdmVyZmxvdyA8IDAgJiZcbiAgICAgICAgICAgICAgICAhbS5fcGYuZW1wdHkgJiZcbiAgICAgICAgICAgICAgICAhbS5fcGYuaW52YWxpZE1vbnRoICYmXG4gICAgICAgICAgICAgICAgIW0uX3BmLm51bGxJbnB1dCAmJlxuICAgICAgICAgICAgICAgICFtLl9wZi5pbnZhbGlkRm9ybWF0ICYmXG4gICAgICAgICAgICAgICAgIW0uX3BmLnVzZXJJbnZhbGlkYXRlZDtcblxuICAgICAgICAgICAgaWYgKG0uX3N0cmljdCkge1xuICAgICAgICAgICAgICAgIG0uX2lzVmFsaWQgPSBtLl9pc1ZhbGlkICYmXG4gICAgICAgICAgICAgICAgICAgIG0uX3BmLmNoYXJzTGVmdE92ZXIgPT09IDAgJiZcbiAgICAgICAgICAgICAgICAgICAgbS5fcGYudW51c2VkVG9rZW5zLmxlbmd0aCA9PT0gMCAmJlxuICAgICAgICAgICAgICAgICAgICBtLl9wZi5iaWdIb3VyID09PSB1bmRlZmluZWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG0uX2lzVmFsaWQ7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbm9ybWFsaXplTG9jYWxlKGtleSkge1xuICAgICAgICByZXR1cm4ga2V5ID8ga2V5LnRvTG93ZXJDYXNlKCkucmVwbGFjZSgnXycsICctJykgOiBrZXk7XG4gICAgfVxuXG4gICAgLy8gcGljayB0aGUgbG9jYWxlIGZyb20gdGhlIGFycmF5XG4gICAgLy8gdHJ5IFsnZW4tYXUnLCAnZW4tZ2InXSBhcyAnZW4tYXUnLCAnZW4tZ2InLCAnZW4nLCBhcyBpbiBtb3ZlIHRocm91Z2ggdGhlIGxpc3QgdHJ5aW5nIGVhY2hcbiAgICAvLyBzdWJzdHJpbmcgZnJvbSBtb3N0IHNwZWNpZmljIHRvIGxlYXN0LCBidXQgbW92ZSB0byB0aGUgbmV4dCBhcnJheSBpdGVtIGlmIGl0J3MgYSBtb3JlIHNwZWNpZmljIHZhcmlhbnQgdGhhbiB0aGUgY3VycmVudCByb290XG4gICAgZnVuY3Rpb24gY2hvb3NlTG9jYWxlKG5hbWVzKSB7XG4gICAgICAgIHZhciBpID0gMCwgaiwgbmV4dCwgbG9jYWxlLCBzcGxpdDtcblxuICAgICAgICB3aGlsZSAoaSA8IG5hbWVzLmxlbmd0aCkge1xuICAgICAgICAgICAgc3BsaXQgPSBub3JtYWxpemVMb2NhbGUobmFtZXNbaV0pLnNwbGl0KCctJyk7XG4gICAgICAgICAgICBqID0gc3BsaXQubGVuZ3RoO1xuICAgICAgICAgICAgbmV4dCA9IG5vcm1hbGl6ZUxvY2FsZShuYW1lc1tpICsgMV0pO1xuICAgICAgICAgICAgbmV4dCA9IG5leHQgPyBuZXh0LnNwbGl0KCctJykgOiBudWxsO1xuICAgICAgICAgICAgd2hpbGUgKGogPiAwKSB7XG4gICAgICAgICAgICAgICAgbG9jYWxlID0gbG9hZExvY2FsZShzcGxpdC5zbGljZSgwLCBqKS5qb2luKCctJykpO1xuICAgICAgICAgICAgICAgIGlmIChsb2NhbGUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxvY2FsZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKG5leHQgJiYgbmV4dC5sZW5ndGggPj0gaiAmJiBjb21wYXJlQXJyYXlzKHNwbGl0LCBuZXh0LCB0cnVlKSA+PSBqIC0gMSkge1xuICAgICAgICAgICAgICAgICAgICAvL3RoZSBuZXh0IGFycmF5IGl0ZW0gaXMgYmV0dGVyIHRoYW4gYSBzaGFsbG93ZXIgc3Vic3RyaW5nIG9mIHRoaXMgb25lXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBqLS07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpKys7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbG9hZExvY2FsZShuYW1lKSB7XG4gICAgICAgIHZhciBvbGRMb2NhbGUgPSBudWxsO1xuICAgICAgICBpZiAoIWxvY2FsZXNbbmFtZV0gJiYgaGFzTW9kdWxlKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIG9sZExvY2FsZSA9IG1vbWVudC5sb2NhbGUoKTtcbiAgICAgICAgICAgICAgICByZXF1aXJlKCcuL2xvY2FsZS8nICsgbmFtZSk7XG4gICAgICAgICAgICAgICAgLy8gYmVjYXVzZSBkZWZpbmVMb2NhbGUgY3VycmVudGx5IGFsc28gc2V0cyB0aGUgZ2xvYmFsIGxvY2FsZSwgd2Ugd2FudCB0byB1bmRvIHRoYXQgZm9yIGxhenkgbG9hZGVkIGxvY2FsZXNcbiAgICAgICAgICAgICAgICBtb21lbnQubG9jYWxlKG9sZExvY2FsZSk7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7IH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbG9jYWxlc1tuYW1lXTtcbiAgICB9XG5cbiAgICAvLyBSZXR1cm4gYSBtb21lbnQgZnJvbSBpbnB1dCwgdGhhdCBpcyBsb2NhbC91dGMvdXRjT2Zmc2V0IGVxdWl2YWxlbnQgdG9cbiAgICAvLyBtb2RlbC5cbiAgICBmdW5jdGlvbiBtYWtlQXMoaW5wdXQsIG1vZGVsKSB7XG4gICAgICAgIHZhciByZXMsIGRpZmY7XG4gICAgICAgIGlmIChtb2RlbC5faXNVVEMpIHtcbiAgICAgICAgICAgIHJlcyA9IG1vZGVsLmNsb25lKCk7XG4gICAgICAgICAgICBkaWZmID0gKG1vbWVudC5pc01vbWVudChpbnB1dCkgfHwgaXNEYXRlKGlucHV0KSA/XG4gICAgICAgICAgICAgICAgICAgICtpbnB1dCA6ICttb21lbnQoaW5wdXQpKSAtICgrcmVzKTtcbiAgICAgICAgICAgIC8vIFVzZSBsb3ctbGV2ZWwgYXBpLCBiZWNhdXNlIHRoaXMgZm4gaXMgbG93LWxldmVsIGFwaS5cbiAgICAgICAgICAgIHJlcy5fZC5zZXRUaW1lKCtyZXMuX2QgKyBkaWZmKTtcbiAgICAgICAgICAgIG1vbWVudC51cGRhdGVPZmZzZXQocmVzLCBmYWxzZSk7XG4gICAgICAgICAgICByZXR1cm4gcmVzO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIG1vbWVudChpbnB1dCkubG9jYWwoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAgICAgICAgTG9jYWxlXG4gICAgKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG5cbiAgICBleHRlbmQoTG9jYWxlLnByb3RvdHlwZSwge1xuXG4gICAgICAgIHNldCA6IGZ1bmN0aW9uIChjb25maWcpIHtcbiAgICAgICAgICAgIHZhciBwcm9wLCBpO1xuICAgICAgICAgICAgZm9yIChpIGluIGNvbmZpZykge1xuICAgICAgICAgICAgICAgIHByb3AgPSBjb25maWdbaV07XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBwcm9wID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXNbaV0gPSBwcm9wO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXNbJ18nICsgaV0gPSBwcm9wO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIExlbmllbnQgb3JkaW5hbCBwYXJzaW5nIGFjY2VwdHMganVzdCBhIG51bWJlciBpbiBhZGRpdGlvbiB0b1xuICAgICAgICAgICAgLy8gbnVtYmVyICsgKHBvc3NpYmx5KSBzdHVmZiBjb21pbmcgZnJvbSBfb3JkaW5hbFBhcnNlTGVuaWVudC5cbiAgICAgICAgICAgIHRoaXMuX29yZGluYWxQYXJzZUxlbmllbnQgPSBuZXcgUmVnRXhwKHRoaXMuX29yZGluYWxQYXJzZS5zb3VyY2UgKyAnfCcgKyAvXFxkezEsMn0vLnNvdXJjZSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgX21vbnRocyA6ICdKYW51YXJ5X0ZlYnJ1YXJ5X01hcmNoX0FwcmlsX01heV9KdW5lX0p1bHlfQXVndXN0X1NlcHRlbWJlcl9PY3RvYmVyX05vdmVtYmVyX0RlY2VtYmVyJy5zcGxpdCgnXycpLFxuICAgICAgICBtb250aHMgOiBmdW5jdGlvbiAobSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX21vbnRoc1ttLm1vbnRoKCldO1xuICAgICAgICB9LFxuXG4gICAgICAgIF9tb250aHNTaG9ydCA6ICdKYW5fRmViX01hcl9BcHJfTWF5X0p1bl9KdWxfQXVnX1NlcF9PY3RfTm92X0RlYycuc3BsaXQoJ18nKSxcbiAgICAgICAgbW9udGhzU2hvcnQgOiBmdW5jdGlvbiAobSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX21vbnRoc1Nob3J0W20ubW9udGgoKV07XG4gICAgICAgIH0sXG5cbiAgICAgICAgbW9udGhzUGFyc2UgOiBmdW5jdGlvbiAobW9udGhOYW1lLCBmb3JtYXQsIHN0cmljdCkge1xuICAgICAgICAgICAgdmFyIGksIG1vbSwgcmVnZXg7XG5cbiAgICAgICAgICAgIGlmICghdGhpcy5fbW9udGhzUGFyc2UpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9tb250aHNQYXJzZSA9IFtdO1xuICAgICAgICAgICAgICAgIHRoaXMuX2xvbmdNb250aHNQYXJzZSA9IFtdO1xuICAgICAgICAgICAgICAgIHRoaXMuX3Nob3J0TW9udGhzUGFyc2UgPSBbXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IDEyOyBpKyspIHtcbiAgICAgICAgICAgICAgICAvLyBtYWtlIHRoZSByZWdleCBpZiB3ZSBkb24ndCBoYXZlIGl0IGFscmVhZHlcbiAgICAgICAgICAgICAgICBtb20gPSBtb21lbnQudXRjKFsyMDAwLCBpXSk7XG4gICAgICAgICAgICAgICAgaWYgKHN0cmljdCAmJiAhdGhpcy5fbG9uZ01vbnRoc1BhcnNlW2ldKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2xvbmdNb250aHNQYXJzZVtpXSA9IG5ldyBSZWdFeHAoJ14nICsgdGhpcy5tb250aHMobW9tLCAnJykucmVwbGFjZSgnLicsICcnKSArICckJywgJ2knKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fc2hvcnRNb250aHNQYXJzZVtpXSA9IG5ldyBSZWdFeHAoJ14nICsgdGhpcy5tb250aHNTaG9ydChtb20sICcnKS5yZXBsYWNlKCcuJywgJycpICsgJyQnLCAnaScpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoIXN0cmljdCAmJiAhdGhpcy5fbW9udGhzUGFyc2VbaV0pIHtcbiAgICAgICAgICAgICAgICAgICAgcmVnZXggPSAnXicgKyB0aGlzLm1vbnRocyhtb20sICcnKSArICd8XicgKyB0aGlzLm1vbnRoc1Nob3J0KG1vbSwgJycpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9tb250aHNQYXJzZVtpXSA9IG5ldyBSZWdFeHAocmVnZXgucmVwbGFjZSgnLicsICcnKSwgJ2knKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gdGVzdCB0aGUgcmVnZXhcbiAgICAgICAgICAgICAgICBpZiAoc3RyaWN0ICYmIGZvcm1hdCA9PT0gJ01NTU0nICYmIHRoaXMuX2xvbmdNb250aHNQYXJzZVtpXS50ZXN0KG1vbnRoTmFtZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChzdHJpY3QgJiYgZm9ybWF0ID09PSAnTU1NJyAmJiB0aGlzLl9zaG9ydE1vbnRoc1BhcnNlW2ldLnRlc3QobW9udGhOYW1lKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gaTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCFzdHJpY3QgJiYgdGhpcy5fbW9udGhzUGFyc2VbaV0udGVzdChtb250aE5hbWUpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBfd2Vla2RheXMgOiAnU3VuZGF5X01vbmRheV9UdWVzZGF5X1dlZG5lc2RheV9UaHVyc2RheV9GcmlkYXlfU2F0dXJkYXknLnNwbGl0KCdfJyksXG4gICAgICAgIHdlZWtkYXlzIDogZnVuY3Rpb24gKG0pIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl93ZWVrZGF5c1ttLmRheSgpXTtcbiAgICAgICAgfSxcblxuICAgICAgICBfd2Vla2RheXNTaG9ydCA6ICdTdW5fTW9uX1R1ZV9XZWRfVGh1X0ZyaV9TYXQnLnNwbGl0KCdfJyksXG4gICAgICAgIHdlZWtkYXlzU2hvcnQgOiBmdW5jdGlvbiAobSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3dlZWtkYXlzU2hvcnRbbS5kYXkoKV07XG4gICAgICAgIH0sXG5cbiAgICAgICAgX3dlZWtkYXlzTWluIDogJ1N1X01vX1R1X1dlX1RoX0ZyX1NhJy5zcGxpdCgnXycpLFxuICAgICAgICB3ZWVrZGF5c01pbiA6IGZ1bmN0aW9uIChtKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fd2Vla2RheXNNaW5bbS5kYXkoKV07XG4gICAgICAgIH0sXG5cbiAgICAgICAgd2Vla2RheXNQYXJzZSA6IGZ1bmN0aW9uICh3ZWVrZGF5TmFtZSkge1xuICAgICAgICAgICAgdmFyIGksIG1vbSwgcmVnZXg7XG5cbiAgICAgICAgICAgIGlmICghdGhpcy5fd2Vla2RheXNQYXJzZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuX3dlZWtkYXlzUGFyc2UgPSBbXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IDc7IGkrKykge1xuICAgICAgICAgICAgICAgIC8vIG1ha2UgdGhlIHJlZ2V4IGlmIHdlIGRvbid0IGhhdmUgaXQgYWxyZWFkeVxuICAgICAgICAgICAgICAgIGlmICghdGhpcy5fd2Vla2RheXNQYXJzZVtpXSkge1xuICAgICAgICAgICAgICAgICAgICBtb20gPSBtb21lbnQoWzIwMDAsIDFdKS5kYXkoaSk7XG4gICAgICAgICAgICAgICAgICAgIHJlZ2V4ID0gJ14nICsgdGhpcy53ZWVrZGF5cyhtb20sICcnKSArICd8XicgKyB0aGlzLndlZWtkYXlzU2hvcnQobW9tLCAnJykgKyAnfF4nICsgdGhpcy53ZWVrZGF5c01pbihtb20sICcnKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fd2Vla2RheXNQYXJzZVtpXSA9IG5ldyBSZWdFeHAocmVnZXgucmVwbGFjZSgnLicsICcnKSwgJ2knKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gdGVzdCB0aGUgcmVnZXhcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5fd2Vla2RheXNQYXJzZVtpXS50ZXN0KHdlZWtkYXlOYW1lKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gaTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgX2xvbmdEYXRlRm9ybWF0IDoge1xuICAgICAgICAgICAgTFRTIDogJ2g6bW06c3MgQScsXG4gICAgICAgICAgICBMVCA6ICdoOm1tIEEnLFxuICAgICAgICAgICAgTCA6ICdNTS9ERC9ZWVlZJyxcbiAgICAgICAgICAgIExMIDogJ01NTU0gRCwgWVlZWScsXG4gICAgICAgICAgICBMTEwgOiAnTU1NTSBELCBZWVlZIExUJyxcbiAgICAgICAgICAgIExMTEwgOiAnZGRkZCwgTU1NTSBELCBZWVlZIExUJ1xuICAgICAgICB9LFxuICAgICAgICBsb25nRGF0ZUZvcm1hdCA6IGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgICAgIHZhciBvdXRwdXQgPSB0aGlzLl9sb25nRGF0ZUZvcm1hdFtrZXldO1xuICAgICAgICAgICAgaWYgKCFvdXRwdXQgJiYgdGhpcy5fbG9uZ0RhdGVGb3JtYXRba2V5LnRvVXBwZXJDYXNlKCldKSB7XG4gICAgICAgICAgICAgICAgb3V0cHV0ID0gdGhpcy5fbG9uZ0RhdGVGb3JtYXRba2V5LnRvVXBwZXJDYXNlKCldLnJlcGxhY2UoL01NTU18TU18RER8ZGRkZC9nLCBmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB2YWwuc2xpY2UoMSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgdGhpcy5fbG9uZ0RhdGVGb3JtYXRba2V5XSA9IG91dHB1dDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBvdXRwdXQ7XG4gICAgICAgIH0sXG5cbiAgICAgICAgaXNQTSA6IGZ1bmN0aW9uIChpbnB1dCkge1xuICAgICAgICAgICAgLy8gSUU4IFF1aXJrcyBNb2RlICYgSUU3IFN0YW5kYXJkcyBNb2RlIGRvIG5vdCBhbGxvdyBhY2Nlc3Npbmcgc3RyaW5ncyBsaWtlIGFycmF5c1xuICAgICAgICAgICAgLy8gVXNpbmcgY2hhckF0IHNob3VsZCBiZSBtb3JlIGNvbXBhdGlibGUuXG4gICAgICAgICAgICByZXR1cm4gKChpbnB1dCArICcnKS50b0xvd2VyQ2FzZSgpLmNoYXJBdCgwKSA9PT0gJ3AnKTtcbiAgICAgICAgfSxcblxuICAgICAgICBfbWVyaWRpZW1QYXJzZSA6IC9bYXBdXFwuP20/XFwuPy9pLFxuICAgICAgICBtZXJpZGllbSA6IGZ1bmN0aW9uIChob3VycywgbWludXRlcywgaXNMb3dlcikge1xuICAgICAgICAgICAgaWYgKGhvdXJzID4gMTEpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gaXNMb3dlciA/ICdwbScgOiAnUE0nO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gaXNMb3dlciA/ICdhbScgOiAnQU0nO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG5cbiAgICAgICAgX2NhbGVuZGFyIDoge1xuICAgICAgICAgICAgc2FtZURheSA6ICdbVG9kYXkgYXRdIExUJyxcbiAgICAgICAgICAgIG5leHREYXkgOiAnW1RvbW9ycm93IGF0XSBMVCcsXG4gICAgICAgICAgICBuZXh0V2VlayA6ICdkZGRkIFthdF0gTFQnLFxuICAgICAgICAgICAgbGFzdERheSA6ICdbWWVzdGVyZGF5IGF0XSBMVCcsXG4gICAgICAgICAgICBsYXN0V2VlayA6ICdbTGFzdF0gZGRkZCBbYXRdIExUJyxcbiAgICAgICAgICAgIHNhbWVFbHNlIDogJ0wnXG4gICAgICAgIH0sXG4gICAgICAgIGNhbGVuZGFyIDogZnVuY3Rpb24gKGtleSwgbW9tLCBub3cpIHtcbiAgICAgICAgICAgIHZhciBvdXRwdXQgPSB0aGlzLl9jYWxlbmRhcltrZXldO1xuICAgICAgICAgICAgcmV0dXJuIHR5cGVvZiBvdXRwdXQgPT09ICdmdW5jdGlvbicgPyBvdXRwdXQuYXBwbHkobW9tLCBbbm93XSkgOiBvdXRwdXQ7XG4gICAgICAgIH0sXG5cbiAgICAgICAgX3JlbGF0aXZlVGltZSA6IHtcbiAgICAgICAgICAgIGZ1dHVyZSA6ICdpbiAlcycsXG4gICAgICAgICAgICBwYXN0IDogJyVzIGFnbycsXG4gICAgICAgICAgICBzIDogJ2EgZmV3IHNlY29uZHMnLFxuICAgICAgICAgICAgbSA6ICdhIG1pbnV0ZScsXG4gICAgICAgICAgICBtbSA6ICclZCBtaW51dGVzJyxcbiAgICAgICAgICAgIGggOiAnYW4gaG91cicsXG4gICAgICAgICAgICBoaCA6ICclZCBob3VycycsXG4gICAgICAgICAgICBkIDogJ2EgZGF5JyxcbiAgICAgICAgICAgIGRkIDogJyVkIGRheXMnLFxuICAgICAgICAgICAgTSA6ICdhIG1vbnRoJyxcbiAgICAgICAgICAgIE1NIDogJyVkIG1vbnRocycsXG4gICAgICAgICAgICB5IDogJ2EgeWVhcicsXG4gICAgICAgICAgICB5eSA6ICclZCB5ZWFycydcbiAgICAgICAgfSxcblxuICAgICAgICByZWxhdGl2ZVRpbWUgOiBmdW5jdGlvbiAobnVtYmVyLCB3aXRob3V0U3VmZml4LCBzdHJpbmcsIGlzRnV0dXJlKSB7XG4gICAgICAgICAgICB2YXIgb3V0cHV0ID0gdGhpcy5fcmVsYXRpdmVUaW1lW3N0cmluZ107XG4gICAgICAgICAgICByZXR1cm4gKHR5cGVvZiBvdXRwdXQgPT09ICdmdW5jdGlvbicpID9cbiAgICAgICAgICAgICAgICBvdXRwdXQobnVtYmVyLCB3aXRob3V0U3VmZml4LCBzdHJpbmcsIGlzRnV0dXJlKSA6XG4gICAgICAgICAgICAgICAgb3V0cHV0LnJlcGxhY2UoLyVkL2ksIG51bWJlcik7XG4gICAgICAgIH0sXG5cbiAgICAgICAgcGFzdEZ1dHVyZSA6IGZ1bmN0aW9uIChkaWZmLCBvdXRwdXQpIHtcbiAgICAgICAgICAgIHZhciBmb3JtYXQgPSB0aGlzLl9yZWxhdGl2ZVRpbWVbZGlmZiA+IDAgPyAnZnV0dXJlJyA6ICdwYXN0J107XG4gICAgICAgICAgICByZXR1cm4gdHlwZW9mIGZvcm1hdCA9PT0gJ2Z1bmN0aW9uJyA/IGZvcm1hdChvdXRwdXQpIDogZm9ybWF0LnJlcGxhY2UoLyVzL2ksIG91dHB1dCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgb3JkaW5hbCA6IGZ1bmN0aW9uIChudW1iZXIpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9vcmRpbmFsLnJlcGxhY2UoJyVkJywgbnVtYmVyKTtcbiAgICAgICAgfSxcbiAgICAgICAgX29yZGluYWwgOiAnJWQnLFxuICAgICAgICBfb3JkaW5hbFBhcnNlIDogL1xcZHsxLDJ9LyxcblxuICAgICAgICBwcmVwYXJzZSA6IGZ1bmN0aW9uIChzdHJpbmcpIHtcbiAgICAgICAgICAgIHJldHVybiBzdHJpbmc7XG4gICAgICAgIH0sXG5cbiAgICAgICAgcG9zdGZvcm1hdCA6IGZ1bmN0aW9uIChzdHJpbmcpIHtcbiAgICAgICAgICAgIHJldHVybiBzdHJpbmc7XG4gICAgICAgIH0sXG5cbiAgICAgICAgd2VlayA6IGZ1bmN0aW9uIChtb20pIHtcbiAgICAgICAgICAgIHJldHVybiB3ZWVrT2ZZZWFyKG1vbSwgdGhpcy5fd2Vlay5kb3csIHRoaXMuX3dlZWsuZG95KS53ZWVrO1xuICAgICAgICB9LFxuXG4gICAgICAgIF93ZWVrIDoge1xuICAgICAgICAgICAgZG93IDogMCwgLy8gU3VuZGF5IGlzIHRoZSBmaXJzdCBkYXkgb2YgdGhlIHdlZWsuXG4gICAgICAgICAgICBkb3kgOiA2ICAvLyBUaGUgd2VlayB0aGF0IGNvbnRhaW5zIEphbiAxc3QgaXMgdGhlIGZpcnN0IHdlZWsgb2YgdGhlIHllYXIuXG4gICAgICAgIH0sXG5cbiAgICAgICAgZmlyc3REYXlPZldlZWsgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fd2Vlay5kb3c7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZmlyc3REYXlPZlllYXIgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fd2Vlay5kb3k7XG4gICAgICAgIH0sXG5cbiAgICAgICAgX2ludmFsaWREYXRlOiAnSW52YWxpZCBkYXRlJyxcbiAgICAgICAgaW52YWxpZERhdGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9pbnZhbGlkRGF0ZTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICAgICAgICBGb3JtYXR0aW5nXG4gICAgKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG5cbiAgICBmdW5jdGlvbiByZW1vdmVGb3JtYXR0aW5nVG9rZW5zKGlucHV0KSB7XG4gICAgICAgIGlmIChpbnB1dC5tYXRjaCgvXFxbW1xcc1xcU10vKSkge1xuICAgICAgICAgICAgcmV0dXJuIGlucHV0LnJlcGxhY2UoL15cXFt8XFxdJC9nLCAnJyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGlucHV0LnJlcGxhY2UoL1xcXFwvZywgJycpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG1ha2VGb3JtYXRGdW5jdGlvbihmb3JtYXQpIHtcbiAgICAgICAgdmFyIGFycmF5ID0gZm9ybWF0Lm1hdGNoKGZvcm1hdHRpbmdUb2tlbnMpLCBpLCBsZW5ndGg7XG5cbiAgICAgICAgZm9yIChpID0gMCwgbGVuZ3RoID0gYXJyYXkubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmIChmb3JtYXRUb2tlbkZ1bmN0aW9uc1thcnJheVtpXV0pIHtcbiAgICAgICAgICAgICAgICBhcnJheVtpXSA9IGZvcm1hdFRva2VuRnVuY3Rpb25zW2FycmF5W2ldXTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgYXJyYXlbaV0gPSByZW1vdmVGb3JtYXR0aW5nVG9rZW5zKGFycmF5W2ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAobW9tKSB7XG4gICAgICAgICAgICB2YXIgb3V0cHV0ID0gJyc7XG4gICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBvdXRwdXQgKz0gYXJyYXlbaV0gaW5zdGFuY2VvZiBGdW5jdGlvbiA/IGFycmF5W2ldLmNhbGwobW9tLCBmb3JtYXQpIDogYXJyYXlbaV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gb3V0cHV0O1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vIGZvcm1hdCBkYXRlIHVzaW5nIG5hdGl2ZSBkYXRlIG9iamVjdFxuICAgIGZ1bmN0aW9uIGZvcm1hdE1vbWVudChtLCBmb3JtYXQpIHtcbiAgICAgICAgaWYgKCFtLmlzVmFsaWQoKSkge1xuICAgICAgICAgICAgcmV0dXJuIG0ubG9jYWxlRGF0YSgpLmludmFsaWREYXRlKCk7XG4gICAgICAgIH1cblxuICAgICAgICBmb3JtYXQgPSBleHBhbmRGb3JtYXQoZm9ybWF0LCBtLmxvY2FsZURhdGEoKSk7XG5cbiAgICAgICAgaWYgKCFmb3JtYXRGdW5jdGlvbnNbZm9ybWF0XSkge1xuICAgICAgICAgICAgZm9ybWF0RnVuY3Rpb25zW2Zvcm1hdF0gPSBtYWtlRm9ybWF0RnVuY3Rpb24oZm9ybWF0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBmb3JtYXRGdW5jdGlvbnNbZm9ybWF0XShtKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBleHBhbmRGb3JtYXQoZm9ybWF0LCBsb2NhbGUpIHtcbiAgICAgICAgdmFyIGkgPSA1O1xuXG4gICAgICAgIGZ1bmN0aW9uIHJlcGxhY2VMb25nRGF0ZUZvcm1hdFRva2VucyhpbnB1dCkge1xuICAgICAgICAgICAgcmV0dXJuIGxvY2FsZS5sb25nRGF0ZUZvcm1hdChpbnB1dCkgfHwgaW5wdXQ7XG4gICAgICAgIH1cblxuICAgICAgICBsb2NhbEZvcm1hdHRpbmdUb2tlbnMubGFzdEluZGV4ID0gMDtcbiAgICAgICAgd2hpbGUgKGkgPj0gMCAmJiBsb2NhbEZvcm1hdHRpbmdUb2tlbnMudGVzdChmb3JtYXQpKSB7XG4gICAgICAgICAgICBmb3JtYXQgPSBmb3JtYXQucmVwbGFjZShsb2NhbEZvcm1hdHRpbmdUb2tlbnMsIHJlcGxhY2VMb25nRGF0ZUZvcm1hdFRva2Vucyk7XG4gICAgICAgICAgICBsb2NhbEZvcm1hdHRpbmdUb2tlbnMubGFzdEluZGV4ID0gMDtcbiAgICAgICAgICAgIGkgLT0gMTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBmb3JtYXQ7XG4gICAgfVxuXG5cbiAgICAvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gICAgICAgIFBhcnNpbmdcbiAgICAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cblxuICAgIC8vIGdldCB0aGUgcmVnZXggdG8gZmluZCB0aGUgbmV4dCB0b2tlblxuICAgIGZ1bmN0aW9uIGdldFBhcnNlUmVnZXhGb3JUb2tlbih0b2tlbiwgY29uZmlnKSB7XG4gICAgICAgIHZhciBhLCBzdHJpY3QgPSBjb25maWcuX3N0cmljdDtcbiAgICAgICAgc3dpdGNoICh0b2tlbikge1xuICAgICAgICBjYXNlICdRJzpcbiAgICAgICAgICAgIHJldHVybiBwYXJzZVRva2VuT25lRGlnaXQ7XG4gICAgICAgIGNhc2UgJ0REREQnOlxuICAgICAgICAgICAgcmV0dXJuIHBhcnNlVG9rZW5UaHJlZURpZ2l0cztcbiAgICAgICAgY2FzZSAnWVlZWSc6XG4gICAgICAgIGNhc2UgJ0dHR0cnOlxuICAgICAgICBjYXNlICdnZ2dnJzpcbiAgICAgICAgICAgIHJldHVybiBzdHJpY3QgPyBwYXJzZVRva2VuRm91ckRpZ2l0cyA6IHBhcnNlVG9rZW5PbmVUb0ZvdXJEaWdpdHM7XG4gICAgICAgIGNhc2UgJ1knOlxuICAgICAgICBjYXNlICdHJzpcbiAgICAgICAgY2FzZSAnZyc6XG4gICAgICAgICAgICByZXR1cm4gcGFyc2VUb2tlblNpZ25lZE51bWJlcjtcbiAgICAgICAgY2FzZSAnWVlZWVlZJzpcbiAgICAgICAgY2FzZSAnWVlZWVknOlxuICAgICAgICBjYXNlICdHR0dHRyc6XG4gICAgICAgIGNhc2UgJ2dnZ2dnJzpcbiAgICAgICAgICAgIHJldHVybiBzdHJpY3QgPyBwYXJzZVRva2VuU2l4RGlnaXRzIDogcGFyc2VUb2tlbk9uZVRvU2l4RGlnaXRzO1xuICAgICAgICBjYXNlICdTJzpcbiAgICAgICAgICAgIGlmIChzdHJpY3QpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VUb2tlbk9uZURpZ2l0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLyogZmFsbHMgdGhyb3VnaCAqL1xuICAgICAgICBjYXNlICdTUyc6XG4gICAgICAgICAgICBpZiAoc3RyaWN0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlVG9rZW5Ud29EaWdpdHM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvKiBmYWxscyB0aHJvdWdoICovXG4gICAgICAgIGNhc2UgJ1NTUyc6XG4gICAgICAgICAgICBpZiAoc3RyaWN0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlVG9rZW5UaHJlZURpZ2l0cztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8qIGZhbGxzIHRocm91Z2ggKi9cbiAgICAgICAgY2FzZSAnREREJzpcbiAgICAgICAgICAgIHJldHVybiBwYXJzZVRva2VuT25lVG9UaHJlZURpZ2l0cztcbiAgICAgICAgY2FzZSAnTU1NJzpcbiAgICAgICAgY2FzZSAnTU1NTSc6XG4gICAgICAgIGNhc2UgJ2RkJzpcbiAgICAgICAgY2FzZSAnZGRkJzpcbiAgICAgICAgY2FzZSAnZGRkZCc6XG4gICAgICAgICAgICByZXR1cm4gcGFyc2VUb2tlbldvcmQ7XG4gICAgICAgIGNhc2UgJ2EnOlxuICAgICAgICBjYXNlICdBJzpcbiAgICAgICAgICAgIHJldHVybiBjb25maWcuX2xvY2FsZS5fbWVyaWRpZW1QYXJzZTtcbiAgICAgICAgY2FzZSAneCc6XG4gICAgICAgICAgICByZXR1cm4gcGFyc2VUb2tlbk9mZnNldE1zO1xuICAgICAgICBjYXNlICdYJzpcbiAgICAgICAgICAgIHJldHVybiBwYXJzZVRva2VuVGltZXN0YW1wTXM7XG4gICAgICAgIGNhc2UgJ1onOlxuICAgICAgICBjYXNlICdaWic6XG4gICAgICAgICAgICByZXR1cm4gcGFyc2VUb2tlblRpbWV6b25lO1xuICAgICAgICBjYXNlICdUJzpcbiAgICAgICAgICAgIHJldHVybiBwYXJzZVRva2VuVDtcbiAgICAgICAgY2FzZSAnU1NTUyc6XG4gICAgICAgICAgICByZXR1cm4gcGFyc2VUb2tlbkRpZ2l0cztcbiAgICAgICAgY2FzZSAnTU0nOlxuICAgICAgICBjYXNlICdERCc6XG4gICAgICAgIGNhc2UgJ1lZJzpcbiAgICAgICAgY2FzZSAnR0cnOlxuICAgICAgICBjYXNlICdnZyc6XG4gICAgICAgIGNhc2UgJ0hIJzpcbiAgICAgICAgY2FzZSAnaGgnOlxuICAgICAgICBjYXNlICdtbSc6XG4gICAgICAgIGNhc2UgJ3NzJzpcbiAgICAgICAgY2FzZSAnd3cnOlxuICAgICAgICBjYXNlICdXVyc6XG4gICAgICAgICAgICByZXR1cm4gc3RyaWN0ID8gcGFyc2VUb2tlblR3b0RpZ2l0cyA6IHBhcnNlVG9rZW5PbmVPclR3b0RpZ2l0cztcbiAgICAgICAgY2FzZSAnTSc6XG4gICAgICAgIGNhc2UgJ0QnOlxuICAgICAgICBjYXNlICdkJzpcbiAgICAgICAgY2FzZSAnSCc6XG4gICAgICAgIGNhc2UgJ2gnOlxuICAgICAgICBjYXNlICdtJzpcbiAgICAgICAgY2FzZSAncyc6XG4gICAgICAgIGNhc2UgJ3cnOlxuICAgICAgICBjYXNlICdXJzpcbiAgICAgICAgY2FzZSAnZSc6XG4gICAgICAgIGNhc2UgJ0UnOlxuICAgICAgICAgICAgcmV0dXJuIHBhcnNlVG9rZW5PbmVPclR3b0RpZ2l0cztcbiAgICAgICAgY2FzZSAnRG8nOlxuICAgICAgICAgICAgcmV0dXJuIHN0cmljdCA/IGNvbmZpZy5fbG9jYWxlLl9vcmRpbmFsUGFyc2UgOiBjb25maWcuX2xvY2FsZS5fb3JkaW5hbFBhcnNlTGVuaWVudDtcbiAgICAgICAgZGVmYXVsdCA6XG4gICAgICAgICAgICBhID0gbmV3IFJlZ0V4cChyZWdleHBFc2NhcGUodW5lc2NhcGVGb3JtYXQodG9rZW4ucmVwbGFjZSgnXFxcXCcsICcnKSksICdpJykpO1xuICAgICAgICAgICAgcmV0dXJuIGE7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiB1dGNPZmZzZXRGcm9tU3RyaW5nKHN0cmluZykge1xuICAgICAgICBzdHJpbmcgPSBzdHJpbmcgfHwgJyc7XG4gICAgICAgIHZhciBwb3NzaWJsZVR6TWF0Y2hlcyA9IChzdHJpbmcubWF0Y2gocGFyc2VUb2tlblRpbWV6b25lKSB8fCBbXSksXG4gICAgICAgICAgICB0ekNodW5rID0gcG9zc2libGVUek1hdGNoZXNbcG9zc2libGVUek1hdGNoZXMubGVuZ3RoIC0gMV0gfHwgW10sXG4gICAgICAgICAgICBwYXJ0cyA9ICh0ekNodW5rICsgJycpLm1hdGNoKHBhcnNlVGltZXpvbmVDaHVua2VyKSB8fCBbJy0nLCAwLCAwXSxcbiAgICAgICAgICAgIG1pbnV0ZXMgPSArKHBhcnRzWzFdICogNjApICsgdG9JbnQocGFydHNbMl0pO1xuXG4gICAgICAgIHJldHVybiBwYXJ0c1swXSA9PT0gJysnID8gbWludXRlcyA6IC1taW51dGVzO1xuICAgIH1cblxuICAgIC8vIGZ1bmN0aW9uIHRvIGNvbnZlcnQgc3RyaW5nIGlucHV0IHRvIGRhdGVcbiAgICBmdW5jdGlvbiBhZGRUaW1lVG9BcnJheUZyb21Ub2tlbih0b2tlbiwgaW5wdXQsIGNvbmZpZykge1xuICAgICAgICB2YXIgYSwgZGF0ZVBhcnRBcnJheSA9IGNvbmZpZy5fYTtcblxuICAgICAgICBzd2l0Y2ggKHRva2VuKSB7XG4gICAgICAgIC8vIFFVQVJURVJcbiAgICAgICAgY2FzZSAnUSc6XG4gICAgICAgICAgICBpZiAoaW5wdXQgIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGRhdGVQYXJ0QXJyYXlbTU9OVEhdID0gKHRvSW50KGlucHV0KSAtIDEpICogMztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAvLyBNT05USFxuICAgICAgICBjYXNlICdNJyA6IC8vIGZhbGwgdGhyb3VnaCB0byBNTVxuICAgICAgICBjYXNlICdNTScgOlxuICAgICAgICAgICAgaWYgKGlucHV0ICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICBkYXRlUGFydEFycmF5W01PTlRIXSA9IHRvSW50KGlucHV0KSAtIDE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnTU1NJyA6IC8vIGZhbGwgdGhyb3VnaCB0byBNTU1NXG4gICAgICAgIGNhc2UgJ01NTU0nIDpcbiAgICAgICAgICAgIGEgPSBjb25maWcuX2xvY2FsZS5tb250aHNQYXJzZShpbnB1dCwgdG9rZW4sIGNvbmZpZy5fc3RyaWN0KTtcbiAgICAgICAgICAgIC8vIGlmIHdlIGRpZG4ndCBmaW5kIGEgbW9udGggbmFtZSwgbWFyayB0aGUgZGF0ZSBhcyBpbnZhbGlkLlxuICAgICAgICAgICAgaWYgKGEgIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGRhdGVQYXJ0QXJyYXlbTU9OVEhdID0gYTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uZmlnLl9wZi5pbnZhbGlkTW9udGggPSBpbnB1dDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAvLyBEQVkgT0YgTU9OVEhcbiAgICAgICAgY2FzZSAnRCcgOiAvLyBmYWxsIHRocm91Z2ggdG8gRERcbiAgICAgICAgY2FzZSAnREQnIDpcbiAgICAgICAgICAgIGlmIChpbnB1dCAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgZGF0ZVBhcnRBcnJheVtEQVRFXSA9IHRvSW50KGlucHV0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdEbycgOlxuICAgICAgICAgICAgaWYgKGlucHV0ICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICBkYXRlUGFydEFycmF5W0RBVEVdID0gdG9JbnQocGFyc2VJbnQoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5wdXQubWF0Y2goL1xcZHsxLDJ9LylbMF0sIDEwKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgLy8gREFZIE9GIFlFQVJcbiAgICAgICAgY2FzZSAnREREJyA6IC8vIGZhbGwgdGhyb3VnaCB0byBEREREXG4gICAgICAgIGNhc2UgJ0REREQnIDpcbiAgICAgICAgICAgIGlmIChpbnB1dCAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgY29uZmlnLl9kYXlPZlllYXIgPSB0b0ludChpbnB1dCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAvLyBZRUFSXG4gICAgICAgIGNhc2UgJ1lZJyA6XG4gICAgICAgICAgICBkYXRlUGFydEFycmF5W1lFQVJdID0gbW9tZW50LnBhcnNlVHdvRGlnaXRZZWFyKGlucHV0KTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdZWVlZJyA6XG4gICAgICAgIGNhc2UgJ1lZWVlZJyA6XG4gICAgICAgIGNhc2UgJ1lZWVlZWScgOlxuICAgICAgICAgICAgZGF0ZVBhcnRBcnJheVtZRUFSXSA9IHRvSW50KGlucHV0KTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAvLyBBTSAvIFBNXG4gICAgICAgIGNhc2UgJ2EnIDogLy8gZmFsbCB0aHJvdWdoIHRvIEFcbiAgICAgICAgY2FzZSAnQScgOlxuICAgICAgICAgICAgY29uZmlnLl9tZXJpZGllbSA9IGlucHV0O1xuICAgICAgICAgICAgLy8gY29uZmlnLl9pc1BtID0gY29uZmlnLl9sb2NhbGUuaXNQTShpbnB1dCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgLy8gSE9VUlxuICAgICAgICBjYXNlICdoJyA6IC8vIGZhbGwgdGhyb3VnaCB0byBoaFxuICAgICAgICBjYXNlICdoaCcgOlxuICAgICAgICAgICAgY29uZmlnLl9wZi5iaWdIb3VyID0gdHJ1ZTtcbiAgICAgICAgICAgIC8qIGZhbGxzIHRocm91Z2ggKi9cbiAgICAgICAgY2FzZSAnSCcgOiAvLyBmYWxsIHRocm91Z2ggdG8gSEhcbiAgICAgICAgY2FzZSAnSEgnIDpcbiAgICAgICAgICAgIGRhdGVQYXJ0QXJyYXlbSE9VUl0gPSB0b0ludChpbnB1dCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgLy8gTUlOVVRFXG4gICAgICAgIGNhc2UgJ20nIDogLy8gZmFsbCB0aHJvdWdoIHRvIG1tXG4gICAgICAgIGNhc2UgJ21tJyA6XG4gICAgICAgICAgICBkYXRlUGFydEFycmF5W01JTlVURV0gPSB0b0ludChpbnB1dCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgLy8gU0VDT05EXG4gICAgICAgIGNhc2UgJ3MnIDogLy8gZmFsbCB0aHJvdWdoIHRvIHNzXG4gICAgICAgIGNhc2UgJ3NzJyA6XG4gICAgICAgICAgICBkYXRlUGFydEFycmF5W1NFQ09ORF0gPSB0b0ludChpbnB1dCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgLy8gTUlMTElTRUNPTkRcbiAgICAgICAgY2FzZSAnUycgOlxuICAgICAgICBjYXNlICdTUycgOlxuICAgICAgICBjYXNlICdTU1MnIDpcbiAgICAgICAgY2FzZSAnU1NTUycgOlxuICAgICAgICAgICAgZGF0ZVBhcnRBcnJheVtNSUxMSVNFQ09ORF0gPSB0b0ludCgoJzAuJyArIGlucHV0KSAqIDEwMDApO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIC8vIFVOSVggT0ZGU0VUIChNSUxMSVNFQ09ORFMpXG4gICAgICAgIGNhc2UgJ3gnOlxuICAgICAgICAgICAgY29uZmlnLl9kID0gbmV3IERhdGUodG9JbnQoaW5wdXQpKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAvLyBVTklYIFRJTUVTVEFNUCBXSVRIIE1TXG4gICAgICAgIGNhc2UgJ1gnOlxuICAgICAgICAgICAgY29uZmlnLl9kID0gbmV3IERhdGUocGFyc2VGbG9hdChpbnB1dCkgKiAxMDAwKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAvLyBUSU1FWk9ORVxuICAgICAgICBjYXNlICdaJyA6IC8vIGZhbGwgdGhyb3VnaCB0byBaWlxuICAgICAgICBjYXNlICdaWicgOlxuICAgICAgICAgICAgY29uZmlnLl91c2VVVEMgPSB0cnVlO1xuICAgICAgICAgICAgY29uZmlnLl90em0gPSB1dGNPZmZzZXRGcm9tU3RyaW5nKGlucHV0KTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAvLyBXRUVLREFZIC0gaHVtYW5cbiAgICAgICAgY2FzZSAnZGQnOlxuICAgICAgICBjYXNlICdkZGQnOlxuICAgICAgICBjYXNlICdkZGRkJzpcbiAgICAgICAgICAgIGEgPSBjb25maWcuX2xvY2FsZS53ZWVrZGF5c1BhcnNlKGlucHV0KTtcbiAgICAgICAgICAgIC8vIGlmIHdlIGRpZG4ndCBnZXQgYSB3ZWVrZGF5IG5hbWUsIG1hcmsgdGhlIGRhdGUgYXMgaW52YWxpZFxuICAgICAgICAgICAgaWYgKGEgIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGNvbmZpZy5fdyA9IGNvbmZpZy5fdyB8fCB7fTtcbiAgICAgICAgICAgICAgICBjb25maWcuX3dbJ2QnXSA9IGE7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbmZpZy5fcGYuaW52YWxpZFdlZWtkYXkgPSBpbnB1dDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAvLyBXRUVLLCBXRUVLIERBWSAtIG51bWVyaWNcbiAgICAgICAgY2FzZSAndyc6XG4gICAgICAgIGNhc2UgJ3d3JzpcbiAgICAgICAgY2FzZSAnVyc6XG4gICAgICAgIGNhc2UgJ1dXJzpcbiAgICAgICAgY2FzZSAnZCc6XG4gICAgICAgIGNhc2UgJ2UnOlxuICAgICAgICBjYXNlICdFJzpcbiAgICAgICAgICAgIHRva2VuID0gdG9rZW4uc3Vic3RyKDAsIDEpO1xuICAgICAgICAgICAgLyogZmFsbHMgdGhyb3VnaCAqL1xuICAgICAgICBjYXNlICdnZ2dnJzpcbiAgICAgICAgY2FzZSAnR0dHRyc6XG4gICAgICAgIGNhc2UgJ0dHR0dHJzpcbiAgICAgICAgICAgIHRva2VuID0gdG9rZW4uc3Vic3RyKDAsIDIpO1xuICAgICAgICAgICAgaWYgKGlucHV0KSB7XG4gICAgICAgICAgICAgICAgY29uZmlnLl93ID0gY29uZmlnLl93IHx8IHt9O1xuICAgICAgICAgICAgICAgIGNvbmZpZy5fd1t0b2tlbl0gPSB0b0ludChpbnB1dCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnZ2cnOlxuICAgICAgICBjYXNlICdHRyc6XG4gICAgICAgICAgICBjb25maWcuX3cgPSBjb25maWcuX3cgfHwge307XG4gICAgICAgICAgICBjb25maWcuX3dbdG9rZW5dID0gbW9tZW50LnBhcnNlVHdvRGlnaXRZZWFyKGlucHV0KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRheU9mWWVhckZyb21XZWVrSW5mbyhjb25maWcpIHtcbiAgICAgICAgdmFyIHcsIHdlZWtZZWFyLCB3ZWVrLCB3ZWVrZGF5LCBkb3csIGRveSwgdGVtcDtcblxuICAgICAgICB3ID0gY29uZmlnLl93O1xuICAgICAgICBpZiAody5HRyAhPSBudWxsIHx8IHcuVyAhPSBudWxsIHx8IHcuRSAhPSBudWxsKSB7XG4gICAgICAgICAgICBkb3cgPSAxO1xuICAgICAgICAgICAgZG95ID0gNDtcblxuICAgICAgICAgICAgLy8gVE9ETzogV2UgbmVlZCB0byB0YWtlIHRoZSBjdXJyZW50IGlzb1dlZWtZZWFyLCBidXQgdGhhdCBkZXBlbmRzIG9uXG4gICAgICAgICAgICAvLyBob3cgd2UgaW50ZXJwcmV0IG5vdyAobG9jYWwsIHV0YywgZml4ZWQgb2Zmc2V0KS4gU28gY3JlYXRlXG4gICAgICAgICAgICAvLyBhIG5vdyB2ZXJzaW9uIG9mIGN1cnJlbnQgY29uZmlnICh0YWtlIGxvY2FsL3V0Yy9vZmZzZXQgZmxhZ3MsIGFuZFxuICAgICAgICAgICAgLy8gY3JlYXRlIG5vdykuXG4gICAgICAgICAgICB3ZWVrWWVhciA9IGRmbCh3LkdHLCBjb25maWcuX2FbWUVBUl0sIHdlZWtPZlllYXIobW9tZW50KCksIDEsIDQpLnllYXIpO1xuICAgICAgICAgICAgd2VlayA9IGRmbCh3LlcsIDEpO1xuICAgICAgICAgICAgd2Vla2RheSA9IGRmbCh3LkUsIDEpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZG93ID0gY29uZmlnLl9sb2NhbGUuX3dlZWsuZG93O1xuICAgICAgICAgICAgZG95ID0gY29uZmlnLl9sb2NhbGUuX3dlZWsuZG95O1xuXG4gICAgICAgICAgICB3ZWVrWWVhciA9IGRmbCh3LmdnLCBjb25maWcuX2FbWUVBUl0sIHdlZWtPZlllYXIobW9tZW50KCksIGRvdywgZG95KS55ZWFyKTtcbiAgICAgICAgICAgIHdlZWsgPSBkZmwody53LCAxKTtcblxuICAgICAgICAgICAgaWYgKHcuZCAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgLy8gd2Vla2RheSAtLSBsb3cgZGF5IG51bWJlcnMgYXJlIGNvbnNpZGVyZWQgbmV4dCB3ZWVrXG4gICAgICAgICAgICAgICAgd2Vla2RheSA9IHcuZDtcbiAgICAgICAgICAgICAgICBpZiAod2Vla2RheSA8IGRvdykge1xuICAgICAgICAgICAgICAgICAgICArK3dlZWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmICh3LmUgIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIC8vIGxvY2FsIHdlZWtkYXkgLS0gY291bnRpbmcgc3RhcnRzIGZyb20gYmVnaW5pbmcgb2Ygd2Vla1xuICAgICAgICAgICAgICAgIHdlZWtkYXkgPSB3LmUgKyBkb3c7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIGRlZmF1bHQgdG8gYmVnaW5pbmcgb2Ygd2Vla1xuICAgICAgICAgICAgICAgIHdlZWtkYXkgPSBkb3c7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGVtcCA9IGRheU9mWWVhckZyb21XZWVrcyh3ZWVrWWVhciwgd2Vlaywgd2Vla2RheSwgZG95LCBkb3cpO1xuXG4gICAgICAgIGNvbmZpZy5fYVtZRUFSXSA9IHRlbXAueWVhcjtcbiAgICAgICAgY29uZmlnLl9kYXlPZlllYXIgPSB0ZW1wLmRheU9mWWVhcjtcbiAgICB9XG5cbiAgICAvLyBjb252ZXJ0IGFuIGFycmF5IHRvIGEgZGF0ZS5cbiAgICAvLyB0aGUgYXJyYXkgc2hvdWxkIG1pcnJvciB0aGUgcGFyYW1ldGVycyBiZWxvd1xuICAgIC8vIG5vdGU6IGFsbCB2YWx1ZXMgcGFzdCB0aGUgeWVhciBhcmUgb3B0aW9uYWwgYW5kIHdpbGwgZGVmYXVsdCB0byB0aGUgbG93ZXN0IHBvc3NpYmxlIHZhbHVlLlxuICAgIC8vIFt5ZWFyLCBtb250aCwgZGF5ICwgaG91ciwgbWludXRlLCBzZWNvbmQsIG1pbGxpc2Vjb25kXVxuICAgIGZ1bmN0aW9uIGRhdGVGcm9tQ29uZmlnKGNvbmZpZykge1xuICAgICAgICB2YXIgaSwgZGF0ZSwgaW5wdXQgPSBbXSwgY3VycmVudERhdGUsIHllYXJUb1VzZTtcblxuICAgICAgICBpZiAoY29uZmlnLl9kKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjdXJyZW50RGF0ZSA9IGN1cnJlbnREYXRlQXJyYXkoY29uZmlnKTtcblxuICAgICAgICAvL2NvbXB1dGUgZGF5IG9mIHRoZSB5ZWFyIGZyb20gd2Vla3MgYW5kIHdlZWtkYXlzXG4gICAgICAgIGlmIChjb25maWcuX3cgJiYgY29uZmlnLl9hW0RBVEVdID09IG51bGwgJiYgY29uZmlnLl9hW01PTlRIXSA9PSBudWxsKSB7XG4gICAgICAgICAgICBkYXlPZlllYXJGcm9tV2Vla0luZm8oY29uZmlnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vaWYgdGhlIGRheSBvZiB0aGUgeWVhciBpcyBzZXQsIGZpZ3VyZSBvdXQgd2hhdCBpdCBpc1xuICAgICAgICBpZiAoY29uZmlnLl9kYXlPZlllYXIpIHtcbiAgICAgICAgICAgIHllYXJUb1VzZSA9IGRmbChjb25maWcuX2FbWUVBUl0sIGN1cnJlbnREYXRlW1lFQVJdKTtcblxuICAgICAgICAgICAgaWYgKGNvbmZpZy5fZGF5T2ZZZWFyID4gZGF5c0luWWVhcih5ZWFyVG9Vc2UpKSB7XG4gICAgICAgICAgICAgICAgY29uZmlnLl9wZi5fb3ZlcmZsb3dEYXlPZlllYXIgPSB0cnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBkYXRlID0gbWFrZVVUQ0RhdGUoeWVhclRvVXNlLCAwLCBjb25maWcuX2RheU9mWWVhcik7XG4gICAgICAgICAgICBjb25maWcuX2FbTU9OVEhdID0gZGF0ZS5nZXRVVENNb250aCgpO1xuICAgICAgICAgICAgY29uZmlnLl9hW0RBVEVdID0gZGF0ZS5nZXRVVENEYXRlKCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBEZWZhdWx0IHRvIGN1cnJlbnQgZGF0ZS5cbiAgICAgICAgLy8gKiBpZiBubyB5ZWFyLCBtb250aCwgZGF5IG9mIG1vbnRoIGFyZSBnaXZlbiwgZGVmYXVsdCB0byB0b2RheVxuICAgICAgICAvLyAqIGlmIGRheSBvZiBtb250aCBpcyBnaXZlbiwgZGVmYXVsdCBtb250aCBhbmQgeWVhclxuICAgICAgICAvLyAqIGlmIG1vbnRoIGlzIGdpdmVuLCBkZWZhdWx0IG9ubHkgeWVhclxuICAgICAgICAvLyAqIGlmIHllYXIgaXMgZ2l2ZW4sIGRvbid0IGRlZmF1bHQgYW55dGhpbmdcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IDMgJiYgY29uZmlnLl9hW2ldID09IG51bGw7ICsraSkge1xuICAgICAgICAgICAgY29uZmlnLl9hW2ldID0gaW5wdXRbaV0gPSBjdXJyZW50RGF0ZVtpXTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFplcm8gb3V0IHdoYXRldmVyIHdhcyBub3QgZGVmYXVsdGVkLCBpbmNsdWRpbmcgdGltZVxuICAgICAgICBmb3IgKDsgaSA8IDc7IGkrKykge1xuICAgICAgICAgICAgY29uZmlnLl9hW2ldID0gaW5wdXRbaV0gPSAoY29uZmlnLl9hW2ldID09IG51bGwpID8gKGkgPT09IDIgPyAxIDogMCkgOiBjb25maWcuX2FbaV07XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDaGVjayBmb3IgMjQ6MDA6MDAuMDAwXG4gICAgICAgIGlmIChjb25maWcuX2FbSE9VUl0gPT09IDI0ICYmXG4gICAgICAgICAgICAgICAgY29uZmlnLl9hW01JTlVURV0gPT09IDAgJiZcbiAgICAgICAgICAgICAgICBjb25maWcuX2FbU0VDT05EXSA9PT0gMCAmJlxuICAgICAgICAgICAgICAgIGNvbmZpZy5fYVtNSUxMSVNFQ09ORF0gPT09IDApIHtcbiAgICAgICAgICAgIGNvbmZpZy5fbmV4dERheSA9IHRydWU7XG4gICAgICAgICAgICBjb25maWcuX2FbSE9VUl0gPSAwO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uZmlnLl9kID0gKGNvbmZpZy5fdXNlVVRDID8gbWFrZVVUQ0RhdGUgOiBtYWtlRGF0ZSkuYXBwbHkobnVsbCwgaW5wdXQpO1xuICAgICAgICAvLyBBcHBseSB0aW1lem9uZSBvZmZzZXQgZnJvbSBpbnB1dC4gVGhlIGFjdHVhbCB1dGNPZmZzZXQgY2FuIGJlIGNoYW5nZWRcbiAgICAgICAgLy8gd2l0aCBwYXJzZVpvbmUuXG4gICAgICAgIGlmIChjb25maWcuX3R6bSAhPSBudWxsKSB7XG4gICAgICAgICAgICBjb25maWcuX2Quc2V0VVRDTWludXRlcyhjb25maWcuX2QuZ2V0VVRDTWludXRlcygpIC0gY29uZmlnLl90em0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNvbmZpZy5fbmV4dERheSkge1xuICAgICAgICAgICAgY29uZmlnLl9hW0hPVVJdID0gMjQ7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkYXRlRnJvbU9iamVjdChjb25maWcpIHtcbiAgICAgICAgdmFyIG5vcm1hbGl6ZWRJbnB1dDtcblxuICAgICAgICBpZiAoY29uZmlnLl9kKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBub3JtYWxpemVkSW5wdXQgPSBub3JtYWxpemVPYmplY3RVbml0cyhjb25maWcuX2kpO1xuICAgICAgICBjb25maWcuX2EgPSBbXG4gICAgICAgICAgICBub3JtYWxpemVkSW5wdXQueWVhcixcbiAgICAgICAgICAgIG5vcm1hbGl6ZWRJbnB1dC5tb250aCxcbiAgICAgICAgICAgIG5vcm1hbGl6ZWRJbnB1dC5kYXkgfHwgbm9ybWFsaXplZElucHV0LmRhdGUsXG4gICAgICAgICAgICBub3JtYWxpemVkSW5wdXQuaG91cixcbiAgICAgICAgICAgIG5vcm1hbGl6ZWRJbnB1dC5taW51dGUsXG4gICAgICAgICAgICBub3JtYWxpemVkSW5wdXQuc2Vjb25kLFxuICAgICAgICAgICAgbm9ybWFsaXplZElucHV0Lm1pbGxpc2Vjb25kXG4gICAgICAgIF07XG5cbiAgICAgICAgZGF0ZUZyb21Db25maWcoY29uZmlnKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjdXJyZW50RGF0ZUFycmF5KGNvbmZpZykge1xuICAgICAgICB2YXIgbm93ID0gbmV3IERhdGUoKTtcbiAgICAgICAgaWYgKGNvbmZpZy5fdXNlVVRDKSB7XG4gICAgICAgICAgICByZXR1cm4gW1xuICAgICAgICAgICAgICAgIG5vdy5nZXRVVENGdWxsWWVhcigpLFxuICAgICAgICAgICAgICAgIG5vdy5nZXRVVENNb250aCgpLFxuICAgICAgICAgICAgICAgIG5vdy5nZXRVVENEYXRlKClcbiAgICAgICAgICAgIF07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gW25vdy5nZXRGdWxsWWVhcigpLCBub3cuZ2V0TW9udGgoKSwgbm93LmdldERhdGUoKV07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBkYXRlIGZyb20gc3RyaW5nIGFuZCBmb3JtYXQgc3RyaW5nXG4gICAgZnVuY3Rpb24gbWFrZURhdGVGcm9tU3RyaW5nQW5kRm9ybWF0KGNvbmZpZykge1xuICAgICAgICBpZiAoY29uZmlnLl9mID09PSBtb21lbnQuSVNPXzg2MDEpIHtcbiAgICAgICAgICAgIHBhcnNlSVNPKGNvbmZpZyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25maWcuX2EgPSBbXTtcbiAgICAgICAgY29uZmlnLl9wZi5lbXB0eSA9IHRydWU7XG5cbiAgICAgICAgLy8gVGhpcyBhcnJheSBpcyB1c2VkIHRvIG1ha2UgYSBEYXRlLCBlaXRoZXIgd2l0aCBgbmV3IERhdGVgIG9yIGBEYXRlLlVUQ2BcbiAgICAgICAgdmFyIHN0cmluZyA9ICcnICsgY29uZmlnLl9pLFxuICAgICAgICAgICAgaSwgcGFyc2VkSW5wdXQsIHRva2VucywgdG9rZW4sIHNraXBwZWQsXG4gICAgICAgICAgICBzdHJpbmdMZW5ndGggPSBzdHJpbmcubGVuZ3RoLFxuICAgICAgICAgICAgdG90YWxQYXJzZWRJbnB1dExlbmd0aCA9IDA7XG5cbiAgICAgICAgdG9rZW5zID0gZXhwYW5kRm9ybWF0KGNvbmZpZy5fZiwgY29uZmlnLl9sb2NhbGUpLm1hdGNoKGZvcm1hdHRpbmdUb2tlbnMpIHx8IFtdO1xuXG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCB0b2tlbnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHRva2VuID0gdG9rZW5zW2ldO1xuICAgICAgICAgICAgcGFyc2VkSW5wdXQgPSAoc3RyaW5nLm1hdGNoKGdldFBhcnNlUmVnZXhGb3JUb2tlbih0b2tlbiwgY29uZmlnKSkgfHwgW10pWzBdO1xuICAgICAgICAgICAgaWYgKHBhcnNlZElucHV0KSB7XG4gICAgICAgICAgICAgICAgc2tpcHBlZCA9IHN0cmluZy5zdWJzdHIoMCwgc3RyaW5nLmluZGV4T2YocGFyc2VkSW5wdXQpKTtcbiAgICAgICAgICAgICAgICBpZiAoc2tpcHBlZC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbmZpZy5fcGYudW51c2VkSW5wdXQucHVzaChza2lwcGVkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgc3RyaW5nID0gc3RyaW5nLnNsaWNlKHN0cmluZy5pbmRleE9mKHBhcnNlZElucHV0KSArIHBhcnNlZElucHV0Lmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgdG90YWxQYXJzZWRJbnB1dExlbmd0aCArPSBwYXJzZWRJbnB1dC5sZW5ndGg7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBkb24ndCBwYXJzZSBpZiBpdCdzIG5vdCBhIGtub3duIHRva2VuXG4gICAgICAgICAgICBpZiAoZm9ybWF0VG9rZW5GdW5jdGlvbnNbdG9rZW5dKSB7XG4gICAgICAgICAgICAgICAgaWYgKHBhcnNlZElucHV0KSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbmZpZy5fcGYuZW1wdHkgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbmZpZy5fcGYudW51c2VkVG9rZW5zLnB1c2godG9rZW4pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBhZGRUaW1lVG9BcnJheUZyb21Ub2tlbih0b2tlbiwgcGFyc2VkSW5wdXQsIGNvbmZpZyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChjb25maWcuX3N0cmljdCAmJiAhcGFyc2VkSW5wdXQpIHtcbiAgICAgICAgICAgICAgICBjb25maWcuX3BmLnVudXNlZFRva2Vucy5wdXNoKHRva2VuKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGFkZCByZW1haW5pbmcgdW5wYXJzZWQgaW5wdXQgbGVuZ3RoIHRvIHRoZSBzdHJpbmdcbiAgICAgICAgY29uZmlnLl9wZi5jaGFyc0xlZnRPdmVyID0gc3RyaW5nTGVuZ3RoIC0gdG90YWxQYXJzZWRJbnB1dExlbmd0aDtcbiAgICAgICAgaWYgKHN0cmluZy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25maWcuX3BmLnVudXNlZElucHV0LnB1c2goc3RyaW5nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGNsZWFyIF8xMmggZmxhZyBpZiBob3VyIGlzIDw9IDEyXG4gICAgICAgIGlmIChjb25maWcuX3BmLmJpZ0hvdXIgPT09IHRydWUgJiYgY29uZmlnLl9hW0hPVVJdIDw9IDEyKSB7XG4gICAgICAgICAgICBjb25maWcuX3BmLmJpZ0hvdXIgPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICAgICAgLy8gaGFuZGxlIG1lcmlkaWVtXG4gICAgICAgIGNvbmZpZy5fYVtIT1VSXSA9IG1lcmlkaWVtRml4V3JhcChjb25maWcuX2xvY2FsZSwgY29uZmlnLl9hW0hPVVJdLFxuICAgICAgICAgICAgICAgIGNvbmZpZy5fbWVyaWRpZW0pO1xuICAgICAgICBkYXRlRnJvbUNvbmZpZyhjb25maWcpO1xuICAgICAgICBjaGVja092ZXJmbG93KGNvbmZpZyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdW5lc2NhcGVGb3JtYXQocykge1xuICAgICAgICByZXR1cm4gcy5yZXBsYWNlKC9cXFxcKFxcWyl8XFxcXChcXF0pfFxcWyhbXlxcXVxcW10qKVxcXXxcXFxcKC4pL2csIGZ1bmN0aW9uIChtYXRjaGVkLCBwMSwgcDIsIHAzLCBwNCkge1xuICAgICAgICAgICAgcmV0dXJuIHAxIHx8IHAyIHx8IHAzIHx8IHA0O1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBDb2RlIGZyb20gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8zNTYxNDkzL2lzLXRoZXJlLWEtcmVnZXhwLWVzY2FwZS1mdW5jdGlvbi1pbi1qYXZhc2NyaXB0XG4gICAgZnVuY3Rpb24gcmVnZXhwRXNjYXBlKHMpIHtcbiAgICAgICAgcmV0dXJuIHMucmVwbGFjZSgvWy1cXC9cXFxcXiQqKz8uKCl8W1xcXXt9XS9nLCAnXFxcXCQmJyk7XG4gICAgfVxuXG4gICAgLy8gZGF0ZSBmcm9tIHN0cmluZyBhbmQgYXJyYXkgb2YgZm9ybWF0IHN0cmluZ3NcbiAgICBmdW5jdGlvbiBtYWtlRGF0ZUZyb21TdHJpbmdBbmRBcnJheShjb25maWcpIHtcbiAgICAgICAgdmFyIHRlbXBDb25maWcsXG4gICAgICAgICAgICBiZXN0TW9tZW50LFxuXG4gICAgICAgICAgICBzY29yZVRvQmVhdCxcbiAgICAgICAgICAgIGksXG4gICAgICAgICAgICBjdXJyZW50U2NvcmU7XG5cbiAgICAgICAgaWYgKGNvbmZpZy5fZi5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIGNvbmZpZy5fcGYuaW52YWxpZEZvcm1hdCA9IHRydWU7XG4gICAgICAgICAgICBjb25maWcuX2QgPSBuZXcgRGF0ZShOYU4pO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGNvbmZpZy5fZi5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgY3VycmVudFNjb3JlID0gMDtcbiAgICAgICAgICAgIHRlbXBDb25maWcgPSBjb3B5Q29uZmlnKHt9LCBjb25maWcpO1xuICAgICAgICAgICAgaWYgKGNvbmZpZy5fdXNlVVRDICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICB0ZW1wQ29uZmlnLl91c2VVVEMgPSBjb25maWcuX3VzZVVUQztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRlbXBDb25maWcuX3BmID0gZGVmYXVsdFBhcnNpbmdGbGFncygpO1xuICAgICAgICAgICAgdGVtcENvbmZpZy5fZiA9IGNvbmZpZy5fZltpXTtcbiAgICAgICAgICAgIG1ha2VEYXRlRnJvbVN0cmluZ0FuZEZvcm1hdCh0ZW1wQ29uZmlnKTtcblxuICAgICAgICAgICAgaWYgKCFpc1ZhbGlkKHRlbXBDb25maWcpKSB7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIGlmIHRoZXJlIGlzIGFueSBpbnB1dCB0aGF0IHdhcyBub3QgcGFyc2VkIGFkZCBhIHBlbmFsdHkgZm9yIHRoYXQgZm9ybWF0XG4gICAgICAgICAgICBjdXJyZW50U2NvcmUgKz0gdGVtcENvbmZpZy5fcGYuY2hhcnNMZWZ0T3ZlcjtcblxuICAgICAgICAgICAgLy9vciB0b2tlbnNcbiAgICAgICAgICAgIGN1cnJlbnRTY29yZSArPSB0ZW1wQ29uZmlnLl9wZi51bnVzZWRUb2tlbnMubGVuZ3RoICogMTA7XG5cbiAgICAgICAgICAgIHRlbXBDb25maWcuX3BmLnNjb3JlID0gY3VycmVudFNjb3JlO1xuXG4gICAgICAgICAgICBpZiAoc2NvcmVUb0JlYXQgPT0gbnVsbCB8fCBjdXJyZW50U2NvcmUgPCBzY29yZVRvQmVhdCkge1xuICAgICAgICAgICAgICAgIHNjb3JlVG9CZWF0ID0gY3VycmVudFNjb3JlO1xuICAgICAgICAgICAgICAgIGJlc3RNb21lbnQgPSB0ZW1wQ29uZmlnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZXh0ZW5kKGNvbmZpZywgYmVzdE1vbWVudCB8fCB0ZW1wQ29uZmlnKTtcbiAgICB9XG5cbiAgICAvLyBkYXRlIGZyb20gaXNvIGZvcm1hdFxuICAgIGZ1bmN0aW9uIHBhcnNlSVNPKGNvbmZpZykge1xuICAgICAgICB2YXIgaSwgbCxcbiAgICAgICAgICAgIHN0cmluZyA9IGNvbmZpZy5faSxcbiAgICAgICAgICAgIG1hdGNoID0gaXNvUmVnZXguZXhlYyhzdHJpbmcpO1xuXG4gICAgICAgIGlmIChtYXRjaCkge1xuICAgICAgICAgICAgY29uZmlnLl9wZi5pc28gPSB0cnVlO1xuICAgICAgICAgICAgZm9yIChpID0gMCwgbCA9IGlzb0RhdGVzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgICAgICAgIGlmIChpc29EYXRlc1tpXVsxXS5leGVjKHN0cmluZykpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gbWF0Y2hbNV0gc2hvdWxkIGJlICdUJyBvciB1bmRlZmluZWRcbiAgICAgICAgICAgICAgICAgICAgY29uZmlnLl9mID0gaXNvRGF0ZXNbaV1bMF0gKyAobWF0Y2hbNl0gfHwgJyAnKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm9yIChpID0gMCwgbCA9IGlzb1RpbWVzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgICAgICAgIGlmIChpc29UaW1lc1tpXVsxXS5leGVjKHN0cmluZykpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uZmlnLl9mICs9IGlzb1RpbWVzW2ldWzBdO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoc3RyaW5nLm1hdGNoKHBhcnNlVG9rZW5UaW1lem9uZSkpIHtcbiAgICAgICAgICAgICAgICBjb25maWcuX2YgKz0gJ1onO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbWFrZURhdGVGcm9tU3RyaW5nQW5kRm9ybWF0KGNvbmZpZyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25maWcuX2lzVmFsaWQgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIGRhdGUgZnJvbSBpc28gZm9ybWF0IG9yIGZhbGxiYWNrXG4gICAgZnVuY3Rpb24gbWFrZURhdGVGcm9tU3RyaW5nKGNvbmZpZykge1xuICAgICAgICBwYXJzZUlTTyhjb25maWcpO1xuICAgICAgICBpZiAoY29uZmlnLl9pc1ZhbGlkID09PSBmYWxzZSkge1xuICAgICAgICAgICAgZGVsZXRlIGNvbmZpZy5faXNWYWxpZDtcbiAgICAgICAgICAgIG1vbWVudC5jcmVhdGVGcm9tSW5wdXRGYWxsYmFjayhjb25maWcpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbWFwKGFyciwgZm4pIHtcbiAgICAgICAgdmFyIHJlcyA9IFtdLCBpO1xuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgYXJyLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICByZXMucHVzaChmbihhcnJbaV0sIGkpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG1ha2VEYXRlRnJvbUlucHV0KGNvbmZpZykge1xuICAgICAgICB2YXIgaW5wdXQgPSBjb25maWcuX2ksIG1hdGNoZWQ7XG4gICAgICAgIGlmIChpbnB1dCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBjb25maWcuX2QgPSBuZXcgRGF0ZSgpO1xuICAgICAgICB9IGVsc2UgaWYgKGlzRGF0ZShpbnB1dCkpIHtcbiAgICAgICAgICAgIGNvbmZpZy5fZCA9IG5ldyBEYXRlKCtpbnB1dCk7XG4gICAgICAgIH0gZWxzZSBpZiAoKG1hdGNoZWQgPSBhc3BOZXRKc29uUmVnZXguZXhlYyhpbnB1dCkpICE9PSBudWxsKSB7XG4gICAgICAgICAgICBjb25maWcuX2QgPSBuZXcgRGF0ZSgrbWF0Y2hlZFsxXSk7XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGlucHV0ID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgbWFrZURhdGVGcm9tU3RyaW5nKGNvbmZpZyk7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNBcnJheShpbnB1dCkpIHtcbiAgICAgICAgICAgIGNvbmZpZy5fYSA9IG1hcChpbnB1dC5zbGljZSgwKSwgZnVuY3Rpb24gKG9iaikge1xuICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZUludChvYmosIDEwKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgZGF0ZUZyb21Db25maWcoY29uZmlnKTtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YoaW5wdXQpID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgZGF0ZUZyb21PYmplY3QoY29uZmlnKTtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YoaW5wdXQpID09PSAnbnVtYmVyJykge1xuICAgICAgICAgICAgLy8gZnJvbSBtaWxsaXNlY29uZHNcbiAgICAgICAgICAgIGNvbmZpZy5fZCA9IG5ldyBEYXRlKGlucHV0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG1vbWVudC5jcmVhdGVGcm9tSW5wdXRGYWxsYmFjayhjb25maWcpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbWFrZURhdGUoeSwgbSwgZCwgaCwgTSwgcywgbXMpIHtcbiAgICAgICAgLy9jYW4ndCBqdXN0IGFwcGx5KCkgdG8gY3JlYXRlIGEgZGF0ZTpcbiAgICAgICAgLy9odHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzE4MTM0OC9pbnN0YW50aWF0aW5nLWEtamF2YXNjcmlwdC1vYmplY3QtYnktY2FsbGluZy1wcm90b3R5cGUtY29uc3RydWN0b3ItYXBwbHlcbiAgICAgICAgdmFyIGRhdGUgPSBuZXcgRGF0ZSh5LCBtLCBkLCBoLCBNLCBzLCBtcyk7XG5cbiAgICAgICAgLy90aGUgZGF0ZSBjb25zdHJ1Y3RvciBkb2Vzbid0IGFjY2VwdCB5ZWFycyA8IDE5NzBcbiAgICAgICAgaWYgKHkgPCAxOTcwKSB7XG4gICAgICAgICAgICBkYXRlLnNldEZ1bGxZZWFyKHkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkYXRlO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG1ha2VVVENEYXRlKHkpIHtcbiAgICAgICAgdmFyIGRhdGUgPSBuZXcgRGF0ZShEYXRlLlVUQy5hcHBseShudWxsLCBhcmd1bWVudHMpKTtcbiAgICAgICAgaWYgKHkgPCAxOTcwKSB7XG4gICAgICAgICAgICBkYXRlLnNldFVUQ0Z1bGxZZWFyKHkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkYXRlO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhcnNlV2Vla2RheShpbnB1dCwgbG9jYWxlKSB7XG4gICAgICAgIGlmICh0eXBlb2YgaW5wdXQgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBpZiAoIWlzTmFOKGlucHV0KSkge1xuICAgICAgICAgICAgICAgIGlucHV0ID0gcGFyc2VJbnQoaW5wdXQsIDEwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGlucHV0ID0gbG9jYWxlLndlZWtkYXlzUGFyc2UoaW5wdXQpO1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgaW5wdXQgIT09ICdudW1iZXInKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gaW5wdXQ7XG4gICAgfVxuXG4gICAgLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICAgICAgICBSZWxhdGl2ZSBUaW1lXG4gICAgKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG5cbiAgICAvLyBoZWxwZXIgZnVuY3Rpb24gZm9yIG1vbWVudC5mbi5mcm9tLCBtb21lbnQuZm4uZnJvbU5vdywgYW5kIG1vbWVudC5kdXJhdGlvbi5mbi5odW1hbml6ZVxuICAgIGZ1bmN0aW9uIHN1YnN0aXR1dGVUaW1lQWdvKHN0cmluZywgbnVtYmVyLCB3aXRob3V0U3VmZml4LCBpc0Z1dHVyZSwgbG9jYWxlKSB7XG4gICAgICAgIHJldHVybiBsb2NhbGUucmVsYXRpdmVUaW1lKG51bWJlciB8fCAxLCAhIXdpdGhvdXRTdWZmaXgsIHN0cmluZywgaXNGdXR1cmUpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJlbGF0aXZlVGltZShwb3NOZWdEdXJhdGlvbiwgd2l0aG91dFN1ZmZpeCwgbG9jYWxlKSB7XG4gICAgICAgIHZhciBkdXJhdGlvbiA9IG1vbWVudC5kdXJhdGlvbihwb3NOZWdEdXJhdGlvbikuYWJzKCksXG4gICAgICAgICAgICBzZWNvbmRzID0gcm91bmQoZHVyYXRpb24uYXMoJ3MnKSksXG4gICAgICAgICAgICBtaW51dGVzID0gcm91bmQoZHVyYXRpb24uYXMoJ20nKSksXG4gICAgICAgICAgICBob3VycyA9IHJvdW5kKGR1cmF0aW9uLmFzKCdoJykpLFxuICAgICAgICAgICAgZGF5cyA9IHJvdW5kKGR1cmF0aW9uLmFzKCdkJykpLFxuICAgICAgICAgICAgbW9udGhzID0gcm91bmQoZHVyYXRpb24uYXMoJ00nKSksXG4gICAgICAgICAgICB5ZWFycyA9IHJvdW5kKGR1cmF0aW9uLmFzKCd5JykpLFxuXG4gICAgICAgICAgICBhcmdzID0gc2Vjb25kcyA8IHJlbGF0aXZlVGltZVRocmVzaG9sZHMucyAmJiBbJ3MnLCBzZWNvbmRzXSB8fFxuICAgICAgICAgICAgICAgIG1pbnV0ZXMgPT09IDEgJiYgWydtJ10gfHxcbiAgICAgICAgICAgICAgICBtaW51dGVzIDwgcmVsYXRpdmVUaW1lVGhyZXNob2xkcy5tICYmIFsnbW0nLCBtaW51dGVzXSB8fFxuICAgICAgICAgICAgICAgIGhvdXJzID09PSAxICYmIFsnaCddIHx8XG4gICAgICAgICAgICAgICAgaG91cnMgPCByZWxhdGl2ZVRpbWVUaHJlc2hvbGRzLmggJiYgWydoaCcsIGhvdXJzXSB8fFxuICAgICAgICAgICAgICAgIGRheXMgPT09IDEgJiYgWydkJ10gfHxcbiAgICAgICAgICAgICAgICBkYXlzIDwgcmVsYXRpdmVUaW1lVGhyZXNob2xkcy5kICYmIFsnZGQnLCBkYXlzXSB8fFxuICAgICAgICAgICAgICAgIG1vbnRocyA9PT0gMSAmJiBbJ00nXSB8fFxuICAgICAgICAgICAgICAgIG1vbnRocyA8IHJlbGF0aXZlVGltZVRocmVzaG9sZHMuTSAmJiBbJ01NJywgbW9udGhzXSB8fFxuICAgICAgICAgICAgICAgIHllYXJzID09PSAxICYmIFsneSddIHx8IFsneXknLCB5ZWFyc107XG5cbiAgICAgICAgYXJnc1syXSA9IHdpdGhvdXRTdWZmaXg7XG4gICAgICAgIGFyZ3NbM10gPSArcG9zTmVnRHVyYXRpb24gPiAwO1xuICAgICAgICBhcmdzWzRdID0gbG9jYWxlO1xuICAgICAgICByZXR1cm4gc3Vic3RpdHV0ZVRpbWVBZ28uYXBwbHkoe30sIGFyZ3MpO1xuICAgIH1cblxuXG4gICAgLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICAgICAgICBXZWVrIG9mIFllYXJcbiAgICAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cblxuICAgIC8vIGZpcnN0RGF5T2ZXZWVrICAgICAgIDAgPSBzdW4sIDYgPSBzYXRcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgICB0aGUgZGF5IG9mIHRoZSB3ZWVrIHRoYXQgc3RhcnRzIHRoZSB3ZWVrXG4gICAgLy8gICAgICAgICAgICAgICAgICAgICAgKHVzdWFsbHkgc3VuZGF5IG9yIG1vbmRheSlcbiAgICAvLyBmaXJzdERheU9mV2Vla09mWWVhciAwID0gc3VuLCA2ID0gc2F0XG4gICAgLy8gICAgICAgICAgICAgICAgICAgICAgdGhlIGZpcnN0IHdlZWsgaXMgdGhlIHdlZWsgdGhhdCBjb250YWlucyB0aGUgZmlyc3RcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgICBvZiB0aGlzIGRheSBvZiB0aGUgd2Vla1xuICAgIC8vICAgICAgICAgICAgICAgICAgICAgIChlZy4gSVNPIHdlZWtzIHVzZSB0aHVyc2RheSAoNCkpXG4gICAgZnVuY3Rpb24gd2Vla09mWWVhcihtb20sIGZpcnN0RGF5T2ZXZWVrLCBmaXJzdERheU9mV2Vla09mWWVhcikge1xuICAgICAgICB2YXIgZW5kID0gZmlyc3REYXlPZldlZWtPZlllYXIgLSBmaXJzdERheU9mV2VlayxcbiAgICAgICAgICAgIGRheXNUb0RheU9mV2VlayA9IGZpcnN0RGF5T2ZXZWVrT2ZZZWFyIC0gbW9tLmRheSgpLFxuICAgICAgICAgICAgYWRqdXN0ZWRNb21lbnQ7XG5cblxuICAgICAgICBpZiAoZGF5c1RvRGF5T2ZXZWVrID4gZW5kKSB7XG4gICAgICAgICAgICBkYXlzVG9EYXlPZldlZWsgLT0gNztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChkYXlzVG9EYXlPZldlZWsgPCBlbmQgLSA3KSB7XG4gICAgICAgICAgICBkYXlzVG9EYXlPZldlZWsgKz0gNztcbiAgICAgICAgfVxuXG4gICAgICAgIGFkanVzdGVkTW9tZW50ID0gbW9tZW50KG1vbSkuYWRkKGRheXNUb0RheU9mV2VlaywgJ2QnKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHdlZWs6IE1hdGguY2VpbChhZGp1c3RlZE1vbWVudC5kYXlPZlllYXIoKSAvIDcpLFxuICAgICAgICAgICAgeWVhcjogYWRqdXN0ZWRNb21lbnQueWVhcigpXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLy9odHRwOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0lTT193ZWVrX2RhdGUjQ2FsY3VsYXRpbmdfYV9kYXRlX2dpdmVuX3RoZV95ZWFyLjJDX3dlZWtfbnVtYmVyX2FuZF93ZWVrZGF5XG4gICAgZnVuY3Rpb24gZGF5T2ZZZWFyRnJvbVdlZWtzKHllYXIsIHdlZWssIHdlZWtkYXksIGZpcnN0RGF5T2ZXZWVrT2ZZZWFyLCBmaXJzdERheU9mV2Vlaykge1xuICAgICAgICB2YXIgZCA9IG1ha2VVVENEYXRlKHllYXIsIDAsIDEpLmdldFVUQ0RheSgpLCBkYXlzVG9BZGQsIGRheU9mWWVhcjtcblxuICAgICAgICBkID0gZCA9PT0gMCA/IDcgOiBkO1xuICAgICAgICB3ZWVrZGF5ID0gd2Vla2RheSAhPSBudWxsID8gd2Vla2RheSA6IGZpcnN0RGF5T2ZXZWVrO1xuICAgICAgICBkYXlzVG9BZGQgPSBmaXJzdERheU9mV2VlayAtIGQgKyAoZCA+IGZpcnN0RGF5T2ZXZWVrT2ZZZWFyID8gNyA6IDApIC0gKGQgPCBmaXJzdERheU9mV2VlayA/IDcgOiAwKTtcbiAgICAgICAgZGF5T2ZZZWFyID0gNyAqICh3ZWVrIC0gMSkgKyAod2Vla2RheSAtIGZpcnN0RGF5T2ZXZWVrKSArIGRheXNUb0FkZCArIDE7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHllYXI6IGRheU9mWWVhciA+IDAgPyB5ZWFyIDogeWVhciAtIDEsXG4gICAgICAgICAgICBkYXlPZlllYXI6IGRheU9mWWVhciA+IDAgPyAgZGF5T2ZZZWFyIDogZGF5c0luWWVhcih5ZWFyIC0gMSkgKyBkYXlPZlllYXJcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gICAgICAgIFRvcCBMZXZlbCBGdW5jdGlvbnNcbiAgICAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbiAgICBmdW5jdGlvbiBtYWtlTW9tZW50KGNvbmZpZykge1xuICAgICAgICB2YXIgaW5wdXQgPSBjb25maWcuX2ksXG4gICAgICAgICAgICBmb3JtYXQgPSBjb25maWcuX2YsXG4gICAgICAgICAgICByZXM7XG5cbiAgICAgICAgY29uZmlnLl9sb2NhbGUgPSBjb25maWcuX2xvY2FsZSB8fCBtb21lbnQubG9jYWxlRGF0YShjb25maWcuX2wpO1xuXG4gICAgICAgIGlmIChpbnB1dCA9PT0gbnVsbCB8fCAoZm9ybWF0ID09PSB1bmRlZmluZWQgJiYgaW5wdXQgPT09ICcnKSkge1xuICAgICAgICAgICAgcmV0dXJuIG1vbWVudC5pbnZhbGlkKHtudWxsSW5wdXQ6IHRydWV9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlb2YgaW5wdXQgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBjb25maWcuX2kgPSBpbnB1dCA9IGNvbmZpZy5fbG9jYWxlLnByZXBhcnNlKGlucHV0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChtb21lbnQuaXNNb21lbnQoaW5wdXQpKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IE1vbWVudChpbnB1dCwgdHJ1ZSk7XG4gICAgICAgIH0gZWxzZSBpZiAoZm9ybWF0KSB7XG4gICAgICAgICAgICBpZiAoaXNBcnJheShmb3JtYXQpKSB7XG4gICAgICAgICAgICAgICAgbWFrZURhdGVGcm9tU3RyaW5nQW5kQXJyYXkoY29uZmlnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbWFrZURhdGVGcm9tU3RyaW5nQW5kRm9ybWF0KGNvbmZpZyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBtYWtlRGF0ZUZyb21JbnB1dChjb25maWcpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmVzID0gbmV3IE1vbWVudChjb25maWcpO1xuICAgICAgICBpZiAocmVzLl9uZXh0RGF5KSB7XG4gICAgICAgICAgICAvLyBBZGRpbmcgaXMgc21hcnQgZW5vdWdoIGFyb3VuZCBEU1RcbiAgICAgICAgICAgIHJlcy5hZGQoMSwgJ2QnKTtcbiAgICAgICAgICAgIHJlcy5fbmV4dERheSA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfVxuXG4gICAgbW9tZW50ID0gZnVuY3Rpb24gKGlucHV0LCBmb3JtYXQsIGxvY2FsZSwgc3RyaWN0KSB7XG4gICAgICAgIHZhciBjO1xuXG4gICAgICAgIGlmICh0eXBlb2YobG9jYWxlKSA9PT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgICBzdHJpY3QgPSBsb2NhbGU7XG4gICAgICAgICAgICBsb2NhbGUgPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICAgICAgLy8gb2JqZWN0IGNvbnN0cnVjdGlvbiBtdXN0IGJlIGRvbmUgdGhpcyB3YXkuXG4gICAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9tb21lbnQvbW9tZW50L2lzc3Vlcy8xNDIzXG4gICAgICAgIGMgPSB7fTtcbiAgICAgICAgYy5faXNBTW9tZW50T2JqZWN0ID0gdHJ1ZTtcbiAgICAgICAgYy5faSA9IGlucHV0O1xuICAgICAgICBjLl9mID0gZm9ybWF0O1xuICAgICAgICBjLl9sID0gbG9jYWxlO1xuICAgICAgICBjLl9zdHJpY3QgPSBzdHJpY3Q7XG4gICAgICAgIGMuX2lzVVRDID0gZmFsc2U7XG4gICAgICAgIGMuX3BmID0gZGVmYXVsdFBhcnNpbmdGbGFncygpO1xuXG4gICAgICAgIHJldHVybiBtYWtlTW9tZW50KGMpO1xuICAgIH07XG5cbiAgICBtb21lbnQuc3VwcHJlc3NEZXByZWNhdGlvbldhcm5pbmdzID0gZmFsc2U7XG5cbiAgICBtb21lbnQuY3JlYXRlRnJvbUlucHV0RmFsbGJhY2sgPSBkZXByZWNhdGUoXG4gICAgICAgICdtb21lbnQgY29uc3RydWN0aW9uIGZhbGxzIGJhY2sgdG8ganMgRGF0ZS4gVGhpcyBpcyAnICtcbiAgICAgICAgJ2Rpc2NvdXJhZ2VkIGFuZCB3aWxsIGJlIHJlbW92ZWQgaW4gdXBjb21pbmcgbWFqb3IgJyArXG4gICAgICAgICdyZWxlYXNlLiBQbGVhc2UgcmVmZXIgdG8gJyArXG4gICAgICAgICdodHRwczovL2dpdGh1Yi5jb20vbW9tZW50L21vbWVudC9pc3N1ZXMvMTQwNyBmb3IgbW9yZSBpbmZvLicsXG4gICAgICAgIGZ1bmN0aW9uIChjb25maWcpIHtcbiAgICAgICAgICAgIGNvbmZpZy5fZCA9IG5ldyBEYXRlKGNvbmZpZy5faSArIChjb25maWcuX3VzZVVUQyA/ICcgVVRDJyA6ICcnKSk7XG4gICAgICAgIH1cbiAgICApO1xuXG4gICAgLy8gUGljayBhIG1vbWVudCBtIGZyb20gbW9tZW50cyBzbyB0aGF0IG1bZm5dKG90aGVyKSBpcyB0cnVlIGZvciBhbGxcbiAgICAvLyBvdGhlci4gVGhpcyByZWxpZXMgb24gdGhlIGZ1bmN0aW9uIGZuIHRvIGJlIHRyYW5zaXRpdmUuXG4gICAgLy9cbiAgICAvLyBtb21lbnRzIHNob3VsZCBlaXRoZXIgYmUgYW4gYXJyYXkgb2YgbW9tZW50IG9iamVjdHMgb3IgYW4gYXJyYXksIHdob3NlXG4gICAgLy8gZmlyc3QgZWxlbWVudCBpcyBhbiBhcnJheSBvZiBtb21lbnQgb2JqZWN0cy5cbiAgICBmdW5jdGlvbiBwaWNrQnkoZm4sIG1vbWVudHMpIHtcbiAgICAgICAgdmFyIHJlcywgaTtcbiAgICAgICAgaWYgKG1vbWVudHMubGVuZ3RoID09PSAxICYmIGlzQXJyYXkobW9tZW50c1swXSkpIHtcbiAgICAgICAgICAgIG1vbWVudHMgPSBtb21lbnRzWzBdO1xuICAgICAgICB9XG4gICAgICAgIGlmICghbW9tZW50cy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiBtb21lbnQoKTtcbiAgICAgICAgfVxuICAgICAgICByZXMgPSBtb21lbnRzWzBdO1xuICAgICAgICBmb3IgKGkgPSAxOyBpIDwgbW9tZW50cy5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgaWYgKG1vbWVudHNbaV1bZm5dKHJlcykpIHtcbiAgICAgICAgICAgICAgICByZXMgPSBtb21lbnRzW2ldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfVxuXG4gICAgbW9tZW50Lm1pbiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMCk7XG5cbiAgICAgICAgcmV0dXJuIHBpY2tCeSgnaXNCZWZvcmUnLCBhcmdzKTtcbiAgICB9O1xuXG4gICAgbW9tZW50Lm1heCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMCk7XG5cbiAgICAgICAgcmV0dXJuIHBpY2tCeSgnaXNBZnRlcicsIGFyZ3MpO1xuICAgIH07XG5cbiAgICAvLyBjcmVhdGluZyB3aXRoIHV0Y1xuICAgIG1vbWVudC51dGMgPSBmdW5jdGlvbiAoaW5wdXQsIGZvcm1hdCwgbG9jYWxlLCBzdHJpY3QpIHtcbiAgICAgICAgdmFyIGM7XG5cbiAgICAgICAgaWYgKHR5cGVvZihsb2NhbGUpID09PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICAgIHN0cmljdCA9IGxvY2FsZTtcbiAgICAgICAgICAgIGxvY2FsZSA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgICAgICAvLyBvYmplY3QgY29uc3RydWN0aW9uIG11c3QgYmUgZG9uZSB0aGlzIHdheS5cbiAgICAgICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL21vbWVudC9tb21lbnQvaXNzdWVzLzE0MjNcbiAgICAgICAgYyA9IHt9O1xuICAgICAgICBjLl9pc0FNb21lbnRPYmplY3QgPSB0cnVlO1xuICAgICAgICBjLl91c2VVVEMgPSB0cnVlO1xuICAgICAgICBjLl9pc1VUQyA9IHRydWU7XG4gICAgICAgIGMuX2wgPSBsb2NhbGU7XG4gICAgICAgIGMuX2kgPSBpbnB1dDtcbiAgICAgICAgYy5fZiA9IGZvcm1hdDtcbiAgICAgICAgYy5fc3RyaWN0ID0gc3RyaWN0O1xuICAgICAgICBjLl9wZiA9IGRlZmF1bHRQYXJzaW5nRmxhZ3MoKTtcblxuICAgICAgICByZXR1cm4gbWFrZU1vbWVudChjKS51dGMoKTtcbiAgICB9O1xuXG4gICAgLy8gY3JlYXRpbmcgd2l0aCB1bml4IHRpbWVzdGFtcCAoaW4gc2Vjb25kcylcbiAgICBtb21lbnQudW5peCA9IGZ1bmN0aW9uIChpbnB1dCkge1xuICAgICAgICByZXR1cm4gbW9tZW50KGlucHV0ICogMTAwMCk7XG4gICAgfTtcblxuICAgIC8vIGR1cmF0aW9uXG4gICAgbW9tZW50LmR1cmF0aW9uID0gZnVuY3Rpb24gKGlucHV0LCBrZXkpIHtcbiAgICAgICAgdmFyIGR1cmF0aW9uID0gaW5wdXQsXG4gICAgICAgICAgICAvLyBtYXRjaGluZyBhZ2FpbnN0IHJlZ2V4cCBpcyBleHBlbnNpdmUsIGRvIGl0IG9uIGRlbWFuZFxuICAgICAgICAgICAgbWF0Y2ggPSBudWxsLFxuICAgICAgICAgICAgc2lnbixcbiAgICAgICAgICAgIHJldCxcbiAgICAgICAgICAgIHBhcnNlSXNvLFxuICAgICAgICAgICAgZGlmZlJlcztcblxuICAgICAgICBpZiAobW9tZW50LmlzRHVyYXRpb24oaW5wdXQpKSB7XG4gICAgICAgICAgICBkdXJhdGlvbiA9IHtcbiAgICAgICAgICAgICAgICBtczogaW5wdXQuX21pbGxpc2Vjb25kcyxcbiAgICAgICAgICAgICAgICBkOiBpbnB1dC5fZGF5cyxcbiAgICAgICAgICAgICAgICBNOiBpbnB1dC5fbW9udGhzXG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBpbnB1dCA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgICAgIGR1cmF0aW9uID0ge307XG4gICAgICAgICAgICBpZiAoa2V5KSB7XG4gICAgICAgICAgICAgICAgZHVyYXRpb25ba2V5XSA9IGlucHV0O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBkdXJhdGlvbi5taWxsaXNlY29uZHMgPSBpbnB1dDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICghIShtYXRjaCA9IGFzcE5ldFRpbWVTcGFuSnNvblJlZ2V4LmV4ZWMoaW5wdXQpKSkge1xuICAgICAgICAgICAgc2lnbiA9IChtYXRjaFsxXSA9PT0gJy0nKSA/IC0xIDogMTtcbiAgICAgICAgICAgIGR1cmF0aW9uID0ge1xuICAgICAgICAgICAgICAgIHk6IDAsXG4gICAgICAgICAgICAgICAgZDogdG9JbnQobWF0Y2hbREFURV0pICogc2lnbixcbiAgICAgICAgICAgICAgICBoOiB0b0ludChtYXRjaFtIT1VSXSkgKiBzaWduLFxuICAgICAgICAgICAgICAgIG06IHRvSW50KG1hdGNoW01JTlVURV0pICogc2lnbixcbiAgICAgICAgICAgICAgICBzOiB0b0ludChtYXRjaFtTRUNPTkRdKSAqIHNpZ24sXG4gICAgICAgICAgICAgICAgbXM6IHRvSW50KG1hdGNoW01JTExJU0VDT05EXSkgKiBzaWduXG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2UgaWYgKCEhKG1hdGNoID0gaXNvRHVyYXRpb25SZWdleC5leGVjKGlucHV0KSkpIHtcbiAgICAgICAgICAgIHNpZ24gPSAobWF0Y2hbMV0gPT09ICctJykgPyAtMSA6IDE7XG4gICAgICAgICAgICBwYXJzZUlzbyA9IGZ1bmN0aW9uIChpbnApIHtcbiAgICAgICAgICAgICAgICAvLyBXZSdkIG5vcm1hbGx5IHVzZSB+fmlucCBmb3IgdGhpcywgYnV0IHVuZm9ydHVuYXRlbHkgaXQgYWxzb1xuICAgICAgICAgICAgICAgIC8vIGNvbnZlcnRzIGZsb2F0cyB0byBpbnRzLlxuICAgICAgICAgICAgICAgIC8vIGlucCBtYXkgYmUgdW5kZWZpbmVkLCBzbyBjYXJlZnVsIGNhbGxpbmcgcmVwbGFjZSBvbiBpdC5cbiAgICAgICAgICAgICAgICB2YXIgcmVzID0gaW5wICYmIHBhcnNlRmxvYXQoaW5wLnJlcGxhY2UoJywnLCAnLicpKTtcbiAgICAgICAgICAgICAgICAvLyBhcHBseSBzaWduIHdoaWxlIHdlJ3JlIGF0IGl0XG4gICAgICAgICAgICAgICAgcmV0dXJuIChpc05hTihyZXMpID8gMCA6IHJlcykgKiBzaWduO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGR1cmF0aW9uID0ge1xuICAgICAgICAgICAgICAgIHk6IHBhcnNlSXNvKG1hdGNoWzJdKSxcbiAgICAgICAgICAgICAgICBNOiBwYXJzZUlzbyhtYXRjaFszXSksXG4gICAgICAgICAgICAgICAgZDogcGFyc2VJc28obWF0Y2hbNF0pLFxuICAgICAgICAgICAgICAgIGg6IHBhcnNlSXNvKG1hdGNoWzVdKSxcbiAgICAgICAgICAgICAgICBtOiBwYXJzZUlzbyhtYXRjaFs2XSksXG4gICAgICAgICAgICAgICAgczogcGFyc2VJc28obWF0Y2hbN10pLFxuICAgICAgICAgICAgICAgIHc6IHBhcnNlSXNvKG1hdGNoWzhdKVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBlbHNlIGlmIChkdXJhdGlvbiA9PSBudWxsKSB7Ly8gY2hlY2tzIGZvciBudWxsIG9yIHVuZGVmaW5lZFxuICAgICAgICAgICAgZHVyYXRpb24gPSB7fTtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgZHVyYXRpb24gPT09ICdvYmplY3QnICYmXG4gICAgICAgICAgICAgICAgKCdmcm9tJyBpbiBkdXJhdGlvbiB8fCAndG8nIGluIGR1cmF0aW9uKSkge1xuICAgICAgICAgICAgZGlmZlJlcyA9IG1vbWVudHNEaWZmZXJlbmNlKG1vbWVudChkdXJhdGlvbi5mcm9tKSwgbW9tZW50KGR1cmF0aW9uLnRvKSk7XG5cbiAgICAgICAgICAgIGR1cmF0aW9uID0ge307XG4gICAgICAgICAgICBkdXJhdGlvbi5tcyA9IGRpZmZSZXMubWlsbGlzZWNvbmRzO1xuICAgICAgICAgICAgZHVyYXRpb24uTSA9IGRpZmZSZXMubW9udGhzO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0ID0gbmV3IER1cmF0aW9uKGR1cmF0aW9uKTtcblxuICAgICAgICBpZiAobW9tZW50LmlzRHVyYXRpb24oaW5wdXQpICYmIGhhc093blByb3AoaW5wdXQsICdfbG9jYWxlJykpIHtcbiAgICAgICAgICAgIHJldC5fbG9jYWxlID0gaW5wdXQuX2xvY2FsZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfTtcblxuICAgIC8vIHZlcnNpb24gbnVtYmVyXG4gICAgbW9tZW50LnZlcnNpb24gPSBWRVJTSU9OO1xuXG4gICAgLy8gZGVmYXVsdCBmb3JtYXRcbiAgICBtb21lbnQuZGVmYXVsdEZvcm1hdCA9IGlzb0Zvcm1hdDtcblxuICAgIC8vIGNvbnN0YW50IHRoYXQgcmVmZXJzIHRvIHRoZSBJU08gc3RhbmRhcmRcbiAgICBtb21lbnQuSVNPXzg2MDEgPSBmdW5jdGlvbiAoKSB7fTtcblxuICAgIC8vIFBsdWdpbnMgdGhhdCBhZGQgcHJvcGVydGllcyBzaG91bGQgYWxzbyBhZGQgdGhlIGtleSBoZXJlIChudWxsIHZhbHVlKSxcbiAgICAvLyBzbyB3ZSBjYW4gcHJvcGVybHkgY2xvbmUgb3Vyc2VsdmVzLlxuICAgIG1vbWVudC5tb21lbnRQcm9wZXJ0aWVzID0gbW9tZW50UHJvcGVydGllcztcblxuICAgIC8vIFRoaXMgZnVuY3Rpb24gd2lsbCBiZSBjYWxsZWQgd2hlbmV2ZXIgYSBtb21lbnQgaXMgbXV0YXRlZC5cbiAgICAvLyBJdCBpcyBpbnRlbmRlZCB0byBrZWVwIHRoZSBvZmZzZXQgaW4gc3luYyB3aXRoIHRoZSB0aW1lem9uZS5cbiAgICBtb21lbnQudXBkYXRlT2Zmc2V0ID0gZnVuY3Rpb24gKCkge307XG5cbiAgICAvLyBUaGlzIGZ1bmN0aW9uIGFsbG93cyB5b3UgdG8gc2V0IGEgdGhyZXNob2xkIGZvciByZWxhdGl2ZSB0aW1lIHN0cmluZ3NcbiAgICBtb21lbnQucmVsYXRpdmVUaW1lVGhyZXNob2xkID0gZnVuY3Rpb24gKHRocmVzaG9sZCwgbGltaXQpIHtcbiAgICAgICAgaWYgKHJlbGF0aXZlVGltZVRocmVzaG9sZHNbdGhyZXNob2xkXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGxpbWl0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJldHVybiByZWxhdGl2ZVRpbWVUaHJlc2hvbGRzW3RocmVzaG9sZF07XG4gICAgICAgIH1cbiAgICAgICAgcmVsYXRpdmVUaW1lVGhyZXNob2xkc1t0aHJlc2hvbGRdID0gbGltaXQ7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG5cbiAgICBtb21lbnQubGFuZyA9IGRlcHJlY2F0ZShcbiAgICAgICAgJ21vbWVudC5sYW5nIGlzIGRlcHJlY2F0ZWQuIFVzZSBtb21lbnQubG9jYWxlIGluc3RlYWQuJyxcbiAgICAgICAgZnVuY3Rpb24gKGtleSwgdmFsdWUpIHtcbiAgICAgICAgICAgIHJldHVybiBtb21lbnQubG9jYWxlKGtleSwgdmFsdWUpO1xuICAgICAgICB9XG4gICAgKTtcblxuICAgIC8vIFRoaXMgZnVuY3Rpb24gd2lsbCBsb2FkIGxvY2FsZSBhbmQgdGhlbiBzZXQgdGhlIGdsb2JhbCBsb2NhbGUuICBJZlxuICAgIC8vIG5vIGFyZ3VtZW50cyBhcmUgcGFzc2VkIGluLCBpdCB3aWxsIHNpbXBseSByZXR1cm4gdGhlIGN1cnJlbnQgZ2xvYmFsXG4gICAgLy8gbG9jYWxlIGtleS5cbiAgICBtb21lbnQubG9jYWxlID0gZnVuY3Rpb24gKGtleSwgdmFsdWVzKSB7XG4gICAgICAgIHZhciBkYXRhO1xuICAgICAgICBpZiAoa2V5KSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mKHZhbHVlcykgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgZGF0YSA9IG1vbWVudC5kZWZpbmVMb2NhbGUoa2V5LCB2YWx1ZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgZGF0YSA9IG1vbWVudC5sb2NhbGVEYXRhKGtleSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgbW9tZW50LmR1cmF0aW9uLl9sb2NhbGUgPSBtb21lbnQuX2xvY2FsZSA9IGRhdGE7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbW9tZW50Ll9sb2NhbGUuX2FiYnI7XG4gICAgfTtcblxuICAgIG1vbWVudC5kZWZpbmVMb2NhbGUgPSBmdW5jdGlvbiAobmFtZSwgdmFsdWVzKSB7XG4gICAgICAgIGlmICh2YWx1ZXMgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHZhbHVlcy5hYmJyID0gbmFtZTtcbiAgICAgICAgICAgIGlmICghbG9jYWxlc1tuYW1lXSkge1xuICAgICAgICAgICAgICAgIGxvY2FsZXNbbmFtZV0gPSBuZXcgTG9jYWxlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBsb2NhbGVzW25hbWVdLnNldCh2YWx1ZXMpO1xuXG4gICAgICAgICAgICAvLyBiYWNrd2FyZHMgY29tcGF0IGZvciBub3c6IGFsc28gc2V0IHRoZSBsb2NhbGVcbiAgICAgICAgICAgIG1vbWVudC5sb2NhbGUobmFtZSk7XG5cbiAgICAgICAgICAgIHJldHVybiBsb2NhbGVzW25hbWVdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gdXNlZnVsIGZvciB0ZXN0aW5nXG4gICAgICAgICAgICBkZWxldGUgbG9jYWxlc1tuYW1lXTtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIG1vbWVudC5sYW5nRGF0YSA9IGRlcHJlY2F0ZShcbiAgICAgICAgJ21vbWVudC5sYW5nRGF0YSBpcyBkZXByZWNhdGVkLiBVc2UgbW9tZW50LmxvY2FsZURhdGEgaW5zdGVhZC4nLFxuICAgICAgICBmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgICAgICByZXR1cm4gbW9tZW50LmxvY2FsZURhdGEoa2V5KTtcbiAgICAgICAgfVxuICAgICk7XG5cbiAgICAvLyByZXR1cm5zIGxvY2FsZSBkYXRhXG4gICAgbW9tZW50LmxvY2FsZURhdGEgPSBmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgIHZhciBsb2NhbGU7XG5cbiAgICAgICAgaWYgKGtleSAmJiBrZXkuX2xvY2FsZSAmJiBrZXkuX2xvY2FsZS5fYWJicikge1xuICAgICAgICAgICAga2V5ID0ga2V5Ll9sb2NhbGUuX2FiYnI7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIWtleSkge1xuICAgICAgICAgICAgcmV0dXJuIG1vbWVudC5fbG9jYWxlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFpc0FycmF5KGtleSkpIHtcbiAgICAgICAgICAgIC8vc2hvcnQtY2lyY3VpdCBldmVyeXRoaW5nIGVsc2VcbiAgICAgICAgICAgIGxvY2FsZSA9IGxvYWRMb2NhbGUoa2V5KTtcbiAgICAgICAgICAgIGlmIChsb2NhbGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbG9jYWxlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAga2V5ID0gW2tleV07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gY2hvb3NlTG9jYWxlKGtleSk7XG4gICAgfTtcblxuICAgIC8vIGNvbXBhcmUgbW9tZW50IG9iamVjdFxuICAgIG1vbWVudC5pc01vbWVudCA9IGZ1bmN0aW9uIChvYmopIHtcbiAgICAgICAgcmV0dXJuIG9iaiBpbnN0YW5jZW9mIE1vbWVudCB8fFxuICAgICAgICAgICAgKG9iaiAhPSBudWxsICYmIGhhc093blByb3Aob2JqLCAnX2lzQU1vbWVudE9iamVjdCcpKTtcbiAgICB9O1xuXG4gICAgLy8gZm9yIHR5cGVjaGVja2luZyBEdXJhdGlvbiBvYmplY3RzXG4gICAgbW9tZW50LmlzRHVyYXRpb24gPSBmdW5jdGlvbiAob2JqKSB7XG4gICAgICAgIHJldHVybiBvYmogaW5zdGFuY2VvZiBEdXJhdGlvbjtcbiAgICB9O1xuXG4gICAgZm9yIChpID0gbGlzdHMubGVuZ3RoIC0gMTsgaSA+PSAwOyAtLWkpIHtcbiAgICAgICAgbWFrZUxpc3QobGlzdHNbaV0pO1xuICAgIH1cblxuICAgIG1vbWVudC5ub3JtYWxpemVVbml0cyA9IGZ1bmN0aW9uICh1bml0cykge1xuICAgICAgICByZXR1cm4gbm9ybWFsaXplVW5pdHModW5pdHMpO1xuICAgIH07XG5cbiAgICBtb21lbnQuaW52YWxpZCA9IGZ1bmN0aW9uIChmbGFncykge1xuICAgICAgICB2YXIgbSA9IG1vbWVudC51dGMoTmFOKTtcbiAgICAgICAgaWYgKGZsYWdzICE9IG51bGwpIHtcbiAgICAgICAgICAgIGV4dGVuZChtLl9wZiwgZmxhZ3MpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgbS5fcGYudXNlckludmFsaWRhdGVkID0gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBtO1xuICAgIH07XG5cbiAgICBtb21lbnQucGFyc2Vab25lID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gbW9tZW50LmFwcGx5KG51bGwsIGFyZ3VtZW50cykucGFyc2Vab25lKCk7XG4gICAgfTtcblxuICAgIG1vbWVudC5wYXJzZVR3b0RpZ2l0WWVhciA9IGZ1bmN0aW9uIChpbnB1dCkge1xuICAgICAgICByZXR1cm4gdG9JbnQoaW5wdXQpICsgKHRvSW50KGlucHV0KSA+IDY4ID8gMTkwMCA6IDIwMDApO1xuICAgIH07XG5cbiAgICBtb21lbnQuaXNEYXRlID0gaXNEYXRlO1xuXG4gICAgLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICAgICAgICBNb21lbnQgUHJvdG90eXBlXG4gICAgKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG5cbiAgICBleHRlbmQobW9tZW50LmZuID0gTW9tZW50LnByb3RvdHlwZSwge1xuXG4gICAgICAgIGNsb25lIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIG1vbWVudCh0aGlzKTtcbiAgICAgICAgfSxcblxuICAgICAgICB2YWx1ZU9mIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuICt0aGlzLl9kIC0gKCh0aGlzLl9vZmZzZXQgfHwgMCkgKiA2MDAwMCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgdW5peCA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBNYXRoLmZsb29yKCt0aGlzIC8gMTAwMCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgdG9TdHJpbmcgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jbG9uZSgpLmxvY2FsZSgnZW4nKS5mb3JtYXQoJ2RkZCBNTU0gREQgWVlZWSBISDptbTpzcyBbR01UXVpaJyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgdG9EYXRlIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX29mZnNldCA/IG5ldyBEYXRlKCt0aGlzKSA6IHRoaXMuX2Q7XG4gICAgICAgIH0sXG5cbiAgICAgICAgdG9JU09TdHJpbmcgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgbSA9IG1vbWVudCh0aGlzKS51dGMoKTtcbiAgICAgICAgICAgIGlmICgwIDwgbS55ZWFyKCkgJiYgbS55ZWFyKCkgPD0gOTk5OSkge1xuICAgICAgICAgICAgICAgIGlmICgnZnVuY3Rpb24nID09PSB0eXBlb2YgRGF0ZS5wcm90b3R5cGUudG9JU09TdHJpbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gbmF0aXZlIGltcGxlbWVudGF0aW9uIGlzIH41MHggZmFzdGVyLCB1c2UgaXQgd2hlbiB3ZSBjYW5cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMudG9EYXRlKCkudG9JU09TdHJpbmcoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZm9ybWF0TW9tZW50KG0sICdZWVlZLU1NLUREW1RdSEg6bW06c3MuU1NTW1pdJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZm9ybWF0TW9tZW50KG0sICdZWVlZWVktTU0tRERbVF1ISDptbTpzcy5TU1NbWl0nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICB0b0FycmF5IDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIG0gPSB0aGlzO1xuICAgICAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgICAgICBtLnllYXIoKSxcbiAgICAgICAgICAgICAgICBtLm1vbnRoKCksXG4gICAgICAgICAgICAgICAgbS5kYXRlKCksXG4gICAgICAgICAgICAgICAgbS5ob3VycygpLFxuICAgICAgICAgICAgICAgIG0ubWludXRlcygpLFxuICAgICAgICAgICAgICAgIG0uc2Vjb25kcygpLFxuICAgICAgICAgICAgICAgIG0ubWlsbGlzZWNvbmRzKClcbiAgICAgICAgICAgIF07XG4gICAgICAgIH0sXG5cbiAgICAgICAgaXNWYWxpZCA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBpc1ZhbGlkKHRoaXMpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGlzRFNUU2hpZnRlZCA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLl9hKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuaXNWYWxpZCgpICYmIGNvbXBhcmVBcnJheXModGhpcy5fYSwgKHRoaXMuX2lzVVRDID8gbW9tZW50LnV0Yyh0aGlzLl9hKSA6IG1vbWVudCh0aGlzLl9hKSkudG9BcnJheSgpKSA+IDA7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSxcblxuICAgICAgICBwYXJzaW5nRmxhZ3MgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gZXh0ZW5kKHt9LCB0aGlzLl9wZik7XG4gICAgICAgIH0sXG5cbiAgICAgICAgaW52YWxpZEF0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fcGYub3ZlcmZsb3c7XG4gICAgICAgIH0sXG5cbiAgICAgICAgdXRjIDogZnVuY3Rpb24gKGtlZXBMb2NhbFRpbWUpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnV0Y09mZnNldCgwLCBrZWVwTG9jYWxUaW1lKTtcbiAgICAgICAgfSxcblxuICAgICAgICBsb2NhbCA6IGZ1bmN0aW9uIChrZWVwTG9jYWxUaW1lKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5faXNVVEMpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnV0Y09mZnNldCgwLCBrZWVwTG9jYWxUaW1lKTtcbiAgICAgICAgICAgICAgICB0aGlzLl9pc1VUQyA9IGZhbHNlO1xuXG4gICAgICAgICAgICAgICAgaWYgKGtlZXBMb2NhbFRpbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zdWJ0cmFjdCh0aGlzLl9kYXRlVXRjT2Zmc2V0KCksICdtJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZm9ybWF0IDogZnVuY3Rpb24gKGlucHV0U3RyaW5nKSB7XG4gICAgICAgICAgICB2YXIgb3V0cHV0ID0gZm9ybWF0TW9tZW50KHRoaXMsIGlucHV0U3RyaW5nIHx8IG1vbWVudC5kZWZhdWx0Rm9ybWF0KTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmxvY2FsZURhdGEoKS5wb3N0Zm9ybWF0KG91dHB1dCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgYWRkIDogY3JlYXRlQWRkZXIoMSwgJ2FkZCcpLFxuXG4gICAgICAgIHN1YnRyYWN0IDogY3JlYXRlQWRkZXIoLTEsICdzdWJ0cmFjdCcpLFxuXG4gICAgICAgIGRpZmYgOiBmdW5jdGlvbiAoaW5wdXQsIHVuaXRzLCBhc0Zsb2F0KSB7XG4gICAgICAgICAgICB2YXIgdGhhdCA9IG1ha2VBcyhpbnB1dCwgdGhpcyksXG4gICAgICAgICAgICAgICAgem9uZURpZmYgPSAodGhhdC51dGNPZmZzZXQoKSAtIHRoaXMudXRjT2Zmc2V0KCkpICogNmU0LFxuICAgICAgICAgICAgICAgIGFuY2hvciwgZGlmZiwgb3V0cHV0LCBkYXlzQWRqdXN0O1xuXG4gICAgICAgICAgICB1bml0cyA9IG5vcm1hbGl6ZVVuaXRzKHVuaXRzKTtcblxuICAgICAgICAgICAgaWYgKHVuaXRzID09PSAneWVhcicgfHwgdW5pdHMgPT09ICdtb250aCcgfHwgdW5pdHMgPT09ICdxdWFydGVyJykge1xuICAgICAgICAgICAgICAgIG91dHB1dCA9IG1vbnRoRGlmZih0aGlzLCB0aGF0KTtcbiAgICAgICAgICAgICAgICBpZiAodW5pdHMgPT09ICdxdWFydGVyJykge1xuICAgICAgICAgICAgICAgICAgICBvdXRwdXQgPSBvdXRwdXQgLyAzO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodW5pdHMgPT09ICd5ZWFyJykge1xuICAgICAgICAgICAgICAgICAgICBvdXRwdXQgPSBvdXRwdXQgLyAxMjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGRpZmYgPSB0aGlzIC0gdGhhdDtcbiAgICAgICAgICAgICAgICBvdXRwdXQgPSB1bml0cyA9PT0gJ3NlY29uZCcgPyBkaWZmIC8gMWUzIDogLy8gMTAwMFxuICAgICAgICAgICAgICAgICAgICB1bml0cyA9PT0gJ21pbnV0ZScgPyBkaWZmIC8gNmU0IDogLy8gMTAwMCAqIDYwXG4gICAgICAgICAgICAgICAgICAgIHVuaXRzID09PSAnaG91cicgPyBkaWZmIC8gMzZlNSA6IC8vIDEwMDAgKiA2MCAqIDYwXG4gICAgICAgICAgICAgICAgICAgIHVuaXRzID09PSAnZGF5JyA/IChkaWZmIC0gem9uZURpZmYpIC8gODY0ZTUgOiAvLyAxMDAwICogNjAgKiA2MCAqIDI0LCBuZWdhdGUgZHN0XG4gICAgICAgICAgICAgICAgICAgIHVuaXRzID09PSAnd2VlaycgPyAoZGlmZiAtIHpvbmVEaWZmKSAvIDYwNDhlNSA6IC8vIDEwMDAgKiA2MCAqIDYwICogMjQgKiA3LCBuZWdhdGUgZHN0XG4gICAgICAgICAgICAgICAgICAgIGRpZmY7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gYXNGbG9hdCA/IG91dHB1dCA6IGFic1JvdW5kKG91dHB1dCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZnJvbSA6IGZ1bmN0aW9uICh0aW1lLCB3aXRob3V0U3VmZml4KSB7XG4gICAgICAgICAgICByZXR1cm4gbW9tZW50LmR1cmF0aW9uKHt0bzogdGhpcywgZnJvbTogdGltZX0pLmxvY2FsZSh0aGlzLmxvY2FsZSgpKS5odW1hbml6ZSghd2l0aG91dFN1ZmZpeCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZnJvbU5vdyA6IGZ1bmN0aW9uICh3aXRob3V0U3VmZml4KSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5mcm9tKG1vbWVudCgpLCB3aXRob3V0U3VmZml4KTtcbiAgICAgICAgfSxcblxuICAgICAgICBjYWxlbmRhciA6IGZ1bmN0aW9uICh0aW1lKSB7XG4gICAgICAgICAgICAvLyBXZSB3YW50IHRvIGNvbXBhcmUgdGhlIHN0YXJ0IG9mIHRvZGF5LCB2cyB0aGlzLlxuICAgICAgICAgICAgLy8gR2V0dGluZyBzdGFydC1vZi10b2RheSBkZXBlbmRzIG9uIHdoZXRoZXIgd2UncmUgbG9jYXQvdXRjL29mZnNldFxuICAgICAgICAgICAgLy8gb3Igbm90LlxuICAgICAgICAgICAgdmFyIG5vdyA9IHRpbWUgfHwgbW9tZW50KCksXG4gICAgICAgICAgICAgICAgc29kID0gbWFrZUFzKG5vdywgdGhpcykuc3RhcnRPZignZGF5JyksXG4gICAgICAgICAgICAgICAgZGlmZiA9IHRoaXMuZGlmZihzb2QsICdkYXlzJywgdHJ1ZSksXG4gICAgICAgICAgICAgICAgZm9ybWF0ID0gZGlmZiA8IC02ID8gJ3NhbWVFbHNlJyA6XG4gICAgICAgICAgICAgICAgICAgIGRpZmYgPCAtMSA/ICdsYXN0V2VlaycgOlxuICAgICAgICAgICAgICAgICAgICBkaWZmIDwgMCA/ICdsYXN0RGF5JyA6XG4gICAgICAgICAgICAgICAgICAgIGRpZmYgPCAxID8gJ3NhbWVEYXknIDpcbiAgICAgICAgICAgICAgICAgICAgZGlmZiA8IDIgPyAnbmV4dERheScgOlxuICAgICAgICAgICAgICAgICAgICBkaWZmIDwgNyA/ICduZXh0V2VlaycgOiAnc2FtZUVsc2UnO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZm9ybWF0KHRoaXMubG9jYWxlRGF0YSgpLmNhbGVuZGFyKGZvcm1hdCwgdGhpcywgbW9tZW50KG5vdykpKTtcbiAgICAgICAgfSxcblxuICAgICAgICBpc0xlYXBZZWFyIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIGlzTGVhcFllYXIodGhpcy55ZWFyKCkpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGlzRFNUIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuICh0aGlzLnV0Y09mZnNldCgpID4gdGhpcy5jbG9uZSgpLm1vbnRoKDApLnV0Y09mZnNldCgpIHx8XG4gICAgICAgICAgICAgICAgdGhpcy51dGNPZmZzZXQoKSA+IHRoaXMuY2xvbmUoKS5tb250aCg1KS51dGNPZmZzZXQoKSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZGF5IDogZnVuY3Rpb24gKGlucHV0KSB7XG4gICAgICAgICAgICB2YXIgZGF5ID0gdGhpcy5faXNVVEMgPyB0aGlzLl9kLmdldFVUQ0RheSgpIDogdGhpcy5fZC5nZXREYXkoKTtcbiAgICAgICAgICAgIGlmIChpbnB1dCAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgaW5wdXQgPSBwYXJzZVdlZWtkYXkoaW5wdXQsIHRoaXMubG9jYWxlRGF0YSgpKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5hZGQoaW5wdXQgLSBkYXksICdkJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBkYXk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgbW9udGggOiBtYWtlQWNjZXNzb3IoJ01vbnRoJywgdHJ1ZSksXG5cbiAgICAgICAgc3RhcnRPZiA6IGZ1bmN0aW9uICh1bml0cykge1xuICAgICAgICAgICAgdW5pdHMgPSBub3JtYWxpemVVbml0cyh1bml0cyk7XG4gICAgICAgICAgICAvLyB0aGUgZm9sbG93aW5nIHN3aXRjaCBpbnRlbnRpb25hbGx5IG9taXRzIGJyZWFrIGtleXdvcmRzXG4gICAgICAgICAgICAvLyB0byB1dGlsaXplIGZhbGxpbmcgdGhyb3VnaCB0aGUgY2FzZXMuXG4gICAgICAgICAgICBzd2l0Y2ggKHVuaXRzKSB7XG4gICAgICAgICAgICBjYXNlICd5ZWFyJzpcbiAgICAgICAgICAgICAgICB0aGlzLm1vbnRoKDApO1xuICAgICAgICAgICAgICAgIC8qIGZhbGxzIHRocm91Z2ggKi9cbiAgICAgICAgICAgIGNhc2UgJ3F1YXJ0ZXInOlxuICAgICAgICAgICAgY2FzZSAnbW9udGgnOlxuICAgICAgICAgICAgICAgIHRoaXMuZGF0ZSgxKTtcbiAgICAgICAgICAgICAgICAvKiBmYWxscyB0aHJvdWdoICovXG4gICAgICAgICAgICBjYXNlICd3ZWVrJzpcbiAgICAgICAgICAgIGNhc2UgJ2lzb1dlZWsnOlxuICAgICAgICAgICAgY2FzZSAnZGF5JzpcbiAgICAgICAgICAgICAgICB0aGlzLmhvdXJzKDApO1xuICAgICAgICAgICAgICAgIC8qIGZhbGxzIHRocm91Z2ggKi9cbiAgICAgICAgICAgIGNhc2UgJ2hvdXInOlxuICAgICAgICAgICAgICAgIHRoaXMubWludXRlcygwKTtcbiAgICAgICAgICAgICAgICAvKiBmYWxscyB0aHJvdWdoICovXG4gICAgICAgICAgICBjYXNlICdtaW51dGUnOlxuICAgICAgICAgICAgICAgIHRoaXMuc2Vjb25kcygwKTtcbiAgICAgICAgICAgICAgICAvKiBmYWxscyB0aHJvdWdoICovXG4gICAgICAgICAgICBjYXNlICdzZWNvbmQnOlxuICAgICAgICAgICAgICAgIHRoaXMubWlsbGlzZWNvbmRzKDApO1xuICAgICAgICAgICAgICAgIC8qIGZhbGxzIHRocm91Z2ggKi9cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gd2Vla3MgYXJlIGEgc3BlY2lhbCBjYXNlXG4gICAgICAgICAgICBpZiAodW5pdHMgPT09ICd3ZWVrJykge1xuICAgICAgICAgICAgICAgIHRoaXMud2Vla2RheSgwKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodW5pdHMgPT09ICdpc29XZWVrJykge1xuICAgICAgICAgICAgICAgIHRoaXMuaXNvV2Vla2RheSgxKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gcXVhcnRlcnMgYXJlIGFsc28gc3BlY2lhbFxuICAgICAgICAgICAgaWYgKHVuaXRzID09PSAncXVhcnRlcicpIHtcbiAgICAgICAgICAgICAgICB0aGlzLm1vbnRoKE1hdGguZmxvb3IodGhpcy5tb250aCgpIC8gMykgKiAzKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZW5kT2Y6IGZ1bmN0aW9uICh1bml0cykge1xuICAgICAgICAgICAgdW5pdHMgPSBub3JtYWxpemVVbml0cyh1bml0cyk7XG4gICAgICAgICAgICBpZiAodW5pdHMgPT09IHVuZGVmaW5lZCB8fCB1bml0cyA9PT0gJ21pbGxpc2Vjb25kJykge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuc3RhcnRPZih1bml0cykuYWRkKDEsICh1bml0cyA9PT0gJ2lzb1dlZWsnID8gJ3dlZWsnIDogdW5pdHMpKS5zdWJ0cmFjdCgxLCAnbXMnKTtcbiAgICAgICAgfSxcblxuICAgICAgICBpc0FmdGVyOiBmdW5jdGlvbiAoaW5wdXQsIHVuaXRzKSB7XG4gICAgICAgICAgICB2YXIgaW5wdXRNcztcbiAgICAgICAgICAgIHVuaXRzID0gbm9ybWFsaXplVW5pdHModHlwZW9mIHVuaXRzICE9PSAndW5kZWZpbmVkJyA/IHVuaXRzIDogJ21pbGxpc2Vjb25kJyk7XG4gICAgICAgICAgICBpZiAodW5pdHMgPT09ICdtaWxsaXNlY29uZCcpIHtcbiAgICAgICAgICAgICAgICBpbnB1dCA9IG1vbWVudC5pc01vbWVudChpbnB1dCkgPyBpbnB1dCA6IG1vbWVudChpbnB1dCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuICt0aGlzID4gK2lucHV0O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpbnB1dE1zID0gbW9tZW50LmlzTW9tZW50KGlucHV0KSA/ICtpbnB1dCA6ICttb21lbnQoaW5wdXQpO1xuICAgICAgICAgICAgICAgIHJldHVybiBpbnB1dE1zIDwgK3RoaXMuY2xvbmUoKS5zdGFydE9mKHVuaXRzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBpc0JlZm9yZTogZnVuY3Rpb24gKGlucHV0LCB1bml0cykge1xuICAgICAgICAgICAgdmFyIGlucHV0TXM7XG4gICAgICAgICAgICB1bml0cyA9IG5vcm1hbGl6ZVVuaXRzKHR5cGVvZiB1bml0cyAhPT0gJ3VuZGVmaW5lZCcgPyB1bml0cyA6ICdtaWxsaXNlY29uZCcpO1xuICAgICAgICAgICAgaWYgKHVuaXRzID09PSAnbWlsbGlzZWNvbmQnKSB7XG4gICAgICAgICAgICAgICAgaW5wdXQgPSBtb21lbnQuaXNNb21lbnQoaW5wdXQpID8gaW5wdXQgOiBtb21lbnQoaW5wdXQpO1xuICAgICAgICAgICAgICAgIHJldHVybiArdGhpcyA8ICtpbnB1dDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaW5wdXRNcyA9IG1vbWVudC5pc01vbWVudChpbnB1dCkgPyAraW5wdXQgOiArbW9tZW50KGlucHV0KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gK3RoaXMuY2xvbmUoKS5lbmRPZih1bml0cykgPCBpbnB1dE1zO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIGlzQmV0d2VlbjogZnVuY3Rpb24gKGZyb20sIHRvLCB1bml0cykge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaXNBZnRlcihmcm9tLCB1bml0cykgJiYgdGhpcy5pc0JlZm9yZSh0bywgdW5pdHMpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGlzU2FtZTogZnVuY3Rpb24gKGlucHV0LCB1bml0cykge1xuICAgICAgICAgICAgdmFyIGlucHV0TXM7XG4gICAgICAgICAgICB1bml0cyA9IG5vcm1hbGl6ZVVuaXRzKHVuaXRzIHx8ICdtaWxsaXNlY29uZCcpO1xuICAgICAgICAgICAgaWYgKHVuaXRzID09PSAnbWlsbGlzZWNvbmQnKSB7XG4gICAgICAgICAgICAgICAgaW5wdXQgPSBtb21lbnQuaXNNb21lbnQoaW5wdXQpID8gaW5wdXQgOiBtb21lbnQoaW5wdXQpO1xuICAgICAgICAgICAgICAgIHJldHVybiArdGhpcyA9PT0gK2lucHV0O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpbnB1dE1zID0gK21vbWVudChpbnB1dCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuICsodGhpcy5jbG9uZSgpLnN0YXJ0T2YodW5pdHMpKSA8PSBpbnB1dE1zICYmIGlucHV0TXMgPD0gKyh0aGlzLmNsb25lKCkuZW5kT2YodW5pdHMpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBtaW46IGRlcHJlY2F0ZShcbiAgICAgICAgICAgICAgICAgJ21vbWVudCgpLm1pbiBpcyBkZXByZWNhdGVkLCB1c2UgbW9tZW50Lm1pbiBpbnN0ZWFkLiBodHRwczovL2dpdGh1Yi5jb20vbW9tZW50L21vbWVudC9pc3N1ZXMvMTU0OCcsXG4gICAgICAgICAgICAgICAgIGZ1bmN0aW9uIChvdGhlcikge1xuICAgICAgICAgICAgICAgICAgICAgb3RoZXIgPSBtb21lbnQuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICAgICAgICAgICAgICAgICAgIHJldHVybiBvdGhlciA8IHRoaXMgPyB0aGlzIDogb3RoZXI7XG4gICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICksXG5cbiAgICAgICAgbWF4OiBkZXByZWNhdGUoXG4gICAgICAgICAgICAgICAgJ21vbWVudCgpLm1heCBpcyBkZXByZWNhdGVkLCB1c2UgbW9tZW50Lm1heCBpbnN0ZWFkLiBodHRwczovL2dpdGh1Yi5jb20vbW9tZW50L21vbWVudC9pc3N1ZXMvMTU0OCcsXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKG90aGVyKSB7XG4gICAgICAgICAgICAgICAgICAgIG90aGVyID0gbW9tZW50LmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBvdGhlciA+IHRoaXMgPyB0aGlzIDogb3RoZXI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICApLFxuXG4gICAgICAgIHpvbmUgOiBkZXByZWNhdGUoXG4gICAgICAgICAgICAgICAgJ21vbWVudCgpLnpvbmUgaXMgZGVwcmVjYXRlZCwgdXNlIG1vbWVudCgpLnV0Y09mZnNldCBpbnN0ZWFkLiAnICtcbiAgICAgICAgICAgICAgICAnaHR0cHM6Ly9naXRodWIuY29tL21vbWVudC9tb21lbnQvaXNzdWVzLzE3NzknLFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIChpbnB1dCwga2VlcExvY2FsVGltZSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaW5wdXQgIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBpbnB1dCAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnB1dCA9IC1pbnB1dDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy51dGNPZmZzZXQoaW5wdXQsIGtlZXBMb2NhbFRpbWUpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAtdGhpcy51dGNPZmZzZXQoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgKSxcblxuICAgICAgICAvLyBrZWVwTG9jYWxUaW1lID0gdHJ1ZSBtZWFucyBvbmx5IGNoYW5nZSB0aGUgdGltZXpvbmUsIHdpdGhvdXRcbiAgICAgICAgLy8gYWZmZWN0aW5nIHRoZSBsb2NhbCBob3VyLiBTbyA1OjMxOjI2ICswMzAwIC0tW3V0Y09mZnNldCgyLCB0cnVlKV0tLT5cbiAgICAgICAgLy8gNTozMToyNiArMDIwMCBJdCBpcyBwb3NzaWJsZSB0aGF0IDU6MzE6MjYgZG9lc24ndCBleGlzdCB3aXRoIG9mZnNldFxuICAgICAgICAvLyArMDIwMCwgc28gd2UgYWRqdXN0IHRoZSB0aW1lIGFzIG5lZWRlZCwgdG8gYmUgdmFsaWQuXG4gICAgICAgIC8vXG4gICAgICAgIC8vIEtlZXBpbmcgdGhlIHRpbWUgYWN0dWFsbHkgYWRkcy9zdWJ0cmFjdHMgKG9uZSBob3VyKVxuICAgICAgICAvLyBmcm9tIHRoZSBhY3R1YWwgcmVwcmVzZW50ZWQgdGltZS4gVGhhdCBpcyB3aHkgd2UgY2FsbCB1cGRhdGVPZmZzZXRcbiAgICAgICAgLy8gYSBzZWNvbmQgdGltZS4gSW4gY2FzZSBpdCB3YW50cyB1cyB0byBjaGFuZ2UgdGhlIG9mZnNldCBhZ2FpblxuICAgICAgICAvLyBfY2hhbmdlSW5Qcm9ncmVzcyA9PSB0cnVlIGNhc2UsIHRoZW4gd2UgaGF2ZSB0byBhZGp1c3QsIGJlY2F1c2VcbiAgICAgICAgLy8gdGhlcmUgaXMgbm8gc3VjaCB0aW1lIGluIHRoZSBnaXZlbiB0aW1lem9uZS5cbiAgICAgICAgdXRjT2Zmc2V0IDogZnVuY3Rpb24gKGlucHV0LCBrZWVwTG9jYWxUaW1lKSB7XG4gICAgICAgICAgICB2YXIgb2Zmc2V0ID0gdGhpcy5fb2Zmc2V0IHx8IDAsXG4gICAgICAgICAgICAgICAgbG9jYWxBZGp1c3Q7XG4gICAgICAgICAgICBpZiAoaW5wdXQgIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgaW5wdXQgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgIGlucHV0ID0gdXRjT2Zmc2V0RnJvbVN0cmluZyhpbnB1dCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChNYXRoLmFicyhpbnB1dCkgPCAxNikge1xuICAgICAgICAgICAgICAgICAgICBpbnB1dCA9IGlucHV0ICogNjA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICghdGhpcy5faXNVVEMgJiYga2VlcExvY2FsVGltZSkge1xuICAgICAgICAgICAgICAgICAgICBsb2NhbEFkanVzdCA9IHRoaXMuX2RhdGVVdGNPZmZzZXQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy5fb2Zmc2V0ID0gaW5wdXQ7XG4gICAgICAgICAgICAgICAgdGhpcy5faXNVVEMgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGlmIChsb2NhbEFkanVzdCAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYWRkKGxvY2FsQWRqdXN0LCAnbScpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAob2Zmc2V0ICE9PSBpbnB1dCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIWtlZXBMb2NhbFRpbWUgfHwgdGhpcy5fY2hhbmdlSW5Qcm9ncmVzcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgYWRkT3JTdWJ0cmFjdER1cmF0aW9uRnJvbU1vbWVudCh0aGlzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtb21lbnQuZHVyYXRpb24oaW5wdXQgLSBvZmZzZXQsICdtJyksIDEsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmICghdGhpcy5fY2hhbmdlSW5Qcm9ncmVzcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fY2hhbmdlSW5Qcm9ncmVzcyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBtb21lbnQudXBkYXRlT2Zmc2V0KHRoaXMsIHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fY2hhbmdlSW5Qcm9ncmVzcyA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2lzVVRDID8gb2Zmc2V0IDogdGhpcy5fZGF0ZVV0Y09mZnNldCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIGlzTG9jYWwgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gIXRoaXMuX2lzVVRDO1xuICAgICAgICB9LFxuXG4gICAgICAgIGlzVXRjT2Zmc2V0IDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2lzVVRDO1xuICAgICAgICB9LFxuXG4gICAgICAgIGlzVXRjIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2lzVVRDICYmIHRoaXMuX29mZnNldCA9PT0gMDtcbiAgICAgICAgfSxcblxuICAgICAgICB6b25lQWJiciA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9pc1VUQyA/ICdVVEMnIDogJyc7XG4gICAgICAgIH0sXG5cbiAgICAgICAgem9uZU5hbWUgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5faXNVVEMgPyAnQ29vcmRpbmF0ZWQgVW5pdmVyc2FsIFRpbWUnIDogJyc7XG4gICAgICAgIH0sXG5cbiAgICAgICAgcGFyc2Vab25lIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKHRoaXMuX3R6bSkge1xuICAgICAgICAgICAgICAgIHRoaXMudXRjT2Zmc2V0KHRoaXMuX3R6bSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiB0aGlzLl9pID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgIHRoaXMudXRjT2Zmc2V0KHV0Y09mZnNldEZyb21TdHJpbmcodGhpcy5faSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgaGFzQWxpZ25lZEhvdXJPZmZzZXQgOiBmdW5jdGlvbiAoaW5wdXQpIHtcbiAgICAgICAgICAgIGlmICghaW5wdXQpIHtcbiAgICAgICAgICAgICAgICBpbnB1dCA9IDA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBpbnB1dCA9IG1vbWVudChpbnB1dCkudXRjT2Zmc2V0KCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiAodGhpcy51dGNPZmZzZXQoKSAtIGlucHV0KSAlIDYwID09PSAwO1xuICAgICAgICB9LFxuXG4gICAgICAgIGRheXNJbk1vbnRoIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIGRheXNJbk1vbnRoKHRoaXMueWVhcigpLCB0aGlzLm1vbnRoKCkpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGRheU9mWWVhciA6IGZ1bmN0aW9uIChpbnB1dCkge1xuICAgICAgICAgICAgdmFyIGRheU9mWWVhciA9IHJvdW5kKChtb21lbnQodGhpcykuc3RhcnRPZignZGF5JykgLSBtb21lbnQodGhpcykuc3RhcnRPZigneWVhcicpKSAvIDg2NGU1KSArIDE7XG4gICAgICAgICAgICByZXR1cm4gaW5wdXQgPT0gbnVsbCA/IGRheU9mWWVhciA6IHRoaXMuYWRkKChpbnB1dCAtIGRheU9mWWVhciksICdkJyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgcXVhcnRlciA6IGZ1bmN0aW9uIChpbnB1dCkge1xuICAgICAgICAgICAgcmV0dXJuIGlucHV0ID09IG51bGwgPyBNYXRoLmNlaWwoKHRoaXMubW9udGgoKSArIDEpIC8gMykgOiB0aGlzLm1vbnRoKChpbnB1dCAtIDEpICogMyArIHRoaXMubW9udGgoKSAlIDMpO1xuICAgICAgICB9LFxuXG4gICAgICAgIHdlZWtZZWFyIDogZnVuY3Rpb24gKGlucHV0KSB7XG4gICAgICAgICAgICB2YXIgeWVhciA9IHdlZWtPZlllYXIodGhpcywgdGhpcy5sb2NhbGVEYXRhKCkuX3dlZWsuZG93LCB0aGlzLmxvY2FsZURhdGEoKS5fd2Vlay5kb3kpLnllYXI7XG4gICAgICAgICAgICByZXR1cm4gaW5wdXQgPT0gbnVsbCA/IHllYXIgOiB0aGlzLmFkZCgoaW5wdXQgLSB5ZWFyKSwgJ3knKTtcbiAgICAgICAgfSxcblxuICAgICAgICBpc29XZWVrWWVhciA6IGZ1bmN0aW9uIChpbnB1dCkge1xuICAgICAgICAgICAgdmFyIHllYXIgPSB3ZWVrT2ZZZWFyKHRoaXMsIDEsIDQpLnllYXI7XG4gICAgICAgICAgICByZXR1cm4gaW5wdXQgPT0gbnVsbCA/IHllYXIgOiB0aGlzLmFkZCgoaW5wdXQgLSB5ZWFyKSwgJ3knKTtcbiAgICAgICAgfSxcblxuICAgICAgICB3ZWVrIDogZnVuY3Rpb24gKGlucHV0KSB7XG4gICAgICAgICAgICB2YXIgd2VlayA9IHRoaXMubG9jYWxlRGF0YSgpLndlZWsodGhpcyk7XG4gICAgICAgICAgICByZXR1cm4gaW5wdXQgPT0gbnVsbCA/IHdlZWsgOiB0aGlzLmFkZCgoaW5wdXQgLSB3ZWVrKSAqIDcsICdkJyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgaXNvV2VlayA6IGZ1bmN0aW9uIChpbnB1dCkge1xuICAgICAgICAgICAgdmFyIHdlZWsgPSB3ZWVrT2ZZZWFyKHRoaXMsIDEsIDQpLndlZWs7XG4gICAgICAgICAgICByZXR1cm4gaW5wdXQgPT0gbnVsbCA/IHdlZWsgOiB0aGlzLmFkZCgoaW5wdXQgLSB3ZWVrKSAqIDcsICdkJyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgd2Vla2RheSA6IGZ1bmN0aW9uIChpbnB1dCkge1xuICAgICAgICAgICAgdmFyIHdlZWtkYXkgPSAodGhpcy5kYXkoKSArIDcgLSB0aGlzLmxvY2FsZURhdGEoKS5fd2Vlay5kb3cpICUgNztcbiAgICAgICAgICAgIHJldHVybiBpbnB1dCA9PSBudWxsID8gd2Vla2RheSA6IHRoaXMuYWRkKGlucHV0IC0gd2Vla2RheSwgJ2QnKTtcbiAgICAgICAgfSxcblxuICAgICAgICBpc29XZWVrZGF5IDogZnVuY3Rpb24gKGlucHV0KSB7XG4gICAgICAgICAgICAvLyBiZWhhdmVzIHRoZSBzYW1lIGFzIG1vbWVudCNkYXkgZXhjZXB0XG4gICAgICAgICAgICAvLyBhcyBhIGdldHRlciwgcmV0dXJucyA3IGluc3RlYWQgb2YgMCAoMS03IHJhbmdlIGluc3RlYWQgb2YgMC02KVxuICAgICAgICAgICAgLy8gYXMgYSBzZXR0ZXIsIHN1bmRheSBzaG91bGQgYmVsb25nIHRvIHRoZSBwcmV2aW91cyB3ZWVrLlxuICAgICAgICAgICAgcmV0dXJuIGlucHV0ID09IG51bGwgPyB0aGlzLmRheSgpIHx8IDcgOiB0aGlzLmRheSh0aGlzLmRheSgpICUgNyA/IGlucHV0IDogaW5wdXQgLSA3KTtcbiAgICAgICAgfSxcblxuICAgICAgICBpc29XZWVrc0luWWVhciA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB3ZWVrc0luWWVhcih0aGlzLnllYXIoKSwgMSwgNCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgd2Vla3NJblllYXIgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgd2Vla0luZm8gPSB0aGlzLmxvY2FsZURhdGEoKS5fd2VlaztcbiAgICAgICAgICAgIHJldHVybiB3ZWVrc0luWWVhcih0aGlzLnllYXIoKSwgd2Vla0luZm8uZG93LCB3ZWVrSW5mby5kb3kpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldCA6IGZ1bmN0aW9uICh1bml0cykge1xuICAgICAgICAgICAgdW5pdHMgPSBub3JtYWxpemVVbml0cyh1bml0cyk7XG4gICAgICAgICAgICByZXR1cm4gdGhpc1t1bml0c10oKTtcbiAgICAgICAgfSxcblxuICAgICAgICBzZXQgOiBmdW5jdGlvbiAodW5pdHMsIHZhbHVlKSB7XG4gICAgICAgICAgICB2YXIgdW5pdDtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgdW5pdHMgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgZm9yICh1bml0IGluIHVuaXRzKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0KHVuaXQsIHVuaXRzW3VuaXRdKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB1bml0cyA9IG5vcm1hbGl6ZVVuaXRzKHVuaXRzKTtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHRoaXNbdW5pdHNdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXNbdW5pdHNdKHZhbHVlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSxcblxuICAgICAgICAvLyBJZiBwYXNzZWQgYSBsb2NhbGUga2V5LCBpdCB3aWxsIHNldCB0aGUgbG9jYWxlIGZvciB0aGlzXG4gICAgICAgIC8vIGluc3RhbmNlLiAgT3RoZXJ3aXNlLCBpdCB3aWxsIHJldHVybiB0aGUgbG9jYWxlIGNvbmZpZ3VyYXRpb25cbiAgICAgICAgLy8gdmFyaWFibGVzIGZvciB0aGlzIGluc3RhbmNlLlxuICAgICAgICBsb2NhbGUgOiBmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgICAgICB2YXIgbmV3TG9jYWxlRGF0YTtcblxuICAgICAgICAgICAgaWYgKGtleSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2xvY2FsZS5fYWJicjtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbmV3TG9jYWxlRGF0YSA9IG1vbWVudC5sb2NhbGVEYXRhKGtleSk7XG4gICAgICAgICAgICAgICAgaWYgKG5ld0xvY2FsZURhdGEgIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9sb2NhbGUgPSBuZXdMb2NhbGVEYXRhO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBsYW5nIDogZGVwcmVjYXRlKFxuICAgICAgICAgICAgJ21vbWVudCgpLmxhbmcoKSBpcyBkZXByZWNhdGVkLiBJbnN0ZWFkLCB1c2UgbW9tZW50KCkubG9jYWxlRGF0YSgpIHRvIGdldCB0aGUgbGFuZ3VhZ2UgY29uZmlndXJhdGlvbi4gVXNlIG1vbWVudCgpLmxvY2FsZSgpIHRvIGNoYW5nZSBsYW5ndWFnZXMuJyxcbiAgICAgICAgICAgIGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgICAgICAgICBpZiAoa2V5ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMubG9jYWxlRGF0YSgpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmxvY2FsZShrZXkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgKSxcblxuICAgICAgICBsb2NhbGVEYXRhIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2xvY2FsZTtcbiAgICAgICAgfSxcblxuICAgICAgICBfZGF0ZVV0Y09mZnNldCA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIC8vIE9uIEZpcmVmb3guMjQgRGF0ZSNnZXRUaW1lem9uZU9mZnNldCByZXR1cm5zIGEgZmxvYXRpbmcgcG9pbnQuXG4gICAgICAgICAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vbW9tZW50L21vbWVudC9wdWxsLzE4NzFcbiAgICAgICAgICAgIHJldHVybiAtTWF0aC5yb3VuZCh0aGlzLl9kLmdldFRpbWV6b25lT2Zmc2V0KCkgLyAxNSkgKiAxNTtcbiAgICAgICAgfVxuXG4gICAgfSk7XG5cbiAgICBmdW5jdGlvbiByYXdNb250aFNldHRlcihtb20sIHZhbHVlKSB7XG4gICAgICAgIHZhciBkYXlPZk1vbnRoO1xuXG4gICAgICAgIC8vIFRPRE86IE1vdmUgdGhpcyBvdXQgb2YgaGVyZSFcbiAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIHZhbHVlID0gbW9tLmxvY2FsZURhdGEoKS5tb250aHNQYXJzZSh2YWx1ZSk7XG4gICAgICAgICAgICAvLyBUT0RPOiBBbm90aGVyIHNpbGVudCBmYWlsdXJlP1xuICAgICAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gJ251bWJlcicpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbW9tO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZGF5T2ZNb250aCA9IE1hdGgubWluKG1vbS5kYXRlKCksXG4gICAgICAgICAgICAgICAgZGF5c0luTW9udGgobW9tLnllYXIoKSwgdmFsdWUpKTtcbiAgICAgICAgbW9tLl9kWydzZXQnICsgKG1vbS5faXNVVEMgPyAnVVRDJyA6ICcnKSArICdNb250aCddKHZhbHVlLCBkYXlPZk1vbnRoKTtcbiAgICAgICAgcmV0dXJuIG1vbTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiByYXdHZXR0ZXIobW9tLCB1bml0KSB7XG4gICAgICAgIHJldHVybiBtb20uX2RbJ2dldCcgKyAobW9tLl9pc1VUQyA/ICdVVEMnIDogJycpICsgdW5pdF0oKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiByYXdTZXR0ZXIobW9tLCB1bml0LCB2YWx1ZSkge1xuICAgICAgICBpZiAodW5pdCA9PT0gJ01vbnRoJykge1xuICAgICAgICAgICAgcmV0dXJuIHJhd01vbnRoU2V0dGVyKG1vbSwgdmFsdWUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIG1vbS5fZFsnc2V0JyArIChtb20uX2lzVVRDID8gJ1VUQycgOiAnJykgKyB1bml0XSh2YWx1ZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBtYWtlQWNjZXNzb3IodW5pdCwga2VlcFRpbWUpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgaWYgKHZhbHVlICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICByYXdTZXR0ZXIodGhpcywgdW5pdCwgdmFsdWUpO1xuICAgICAgICAgICAgICAgIG1vbWVudC51cGRhdGVPZmZzZXQodGhpcywga2VlcFRpbWUpO1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmF3R2V0dGVyKHRoaXMsIHVuaXQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIG1vbWVudC5mbi5taWxsaXNlY29uZCA9IG1vbWVudC5mbi5taWxsaXNlY29uZHMgPSBtYWtlQWNjZXNzb3IoJ01pbGxpc2Vjb25kcycsIGZhbHNlKTtcbiAgICBtb21lbnQuZm4uc2Vjb25kID0gbW9tZW50LmZuLnNlY29uZHMgPSBtYWtlQWNjZXNzb3IoJ1NlY29uZHMnLCBmYWxzZSk7XG4gICAgbW9tZW50LmZuLm1pbnV0ZSA9IG1vbWVudC5mbi5taW51dGVzID0gbWFrZUFjY2Vzc29yKCdNaW51dGVzJywgZmFsc2UpO1xuICAgIC8vIFNldHRpbmcgdGhlIGhvdXIgc2hvdWxkIGtlZXAgdGhlIHRpbWUsIGJlY2F1c2UgdGhlIHVzZXIgZXhwbGljaXRseVxuICAgIC8vIHNwZWNpZmllZCB3aGljaCBob3VyIGhlIHdhbnRzLiBTbyB0cnlpbmcgdG8gbWFpbnRhaW4gdGhlIHNhbWUgaG91ciAoaW5cbiAgICAvLyBhIG5ldyB0aW1lem9uZSkgbWFrZXMgc2Vuc2UuIEFkZGluZy9zdWJ0cmFjdGluZyBob3VycyBkb2VzIG5vdCBmb2xsb3dcbiAgICAvLyB0aGlzIHJ1bGUuXG4gICAgbW9tZW50LmZuLmhvdXIgPSBtb21lbnQuZm4uaG91cnMgPSBtYWtlQWNjZXNzb3IoJ0hvdXJzJywgdHJ1ZSk7XG4gICAgLy8gbW9tZW50LmZuLm1vbnRoIGlzIGRlZmluZWQgc2VwYXJhdGVseVxuICAgIG1vbWVudC5mbi5kYXRlID0gbWFrZUFjY2Vzc29yKCdEYXRlJywgdHJ1ZSk7XG4gICAgbW9tZW50LmZuLmRhdGVzID0gZGVwcmVjYXRlKCdkYXRlcyBhY2Nlc3NvciBpcyBkZXByZWNhdGVkLiBVc2UgZGF0ZSBpbnN0ZWFkLicsIG1ha2VBY2Nlc3NvcignRGF0ZScsIHRydWUpKTtcbiAgICBtb21lbnQuZm4ueWVhciA9IG1ha2VBY2Nlc3NvcignRnVsbFllYXInLCB0cnVlKTtcbiAgICBtb21lbnQuZm4ueWVhcnMgPSBkZXByZWNhdGUoJ3llYXJzIGFjY2Vzc29yIGlzIGRlcHJlY2F0ZWQuIFVzZSB5ZWFyIGluc3RlYWQuJywgbWFrZUFjY2Vzc29yKCdGdWxsWWVhcicsIHRydWUpKTtcblxuICAgIC8vIGFkZCBwbHVyYWwgbWV0aG9kc1xuICAgIG1vbWVudC5mbi5kYXlzID0gbW9tZW50LmZuLmRheTtcbiAgICBtb21lbnQuZm4ubW9udGhzID0gbW9tZW50LmZuLm1vbnRoO1xuICAgIG1vbWVudC5mbi53ZWVrcyA9IG1vbWVudC5mbi53ZWVrO1xuICAgIG1vbWVudC5mbi5pc29XZWVrcyA9IG1vbWVudC5mbi5pc29XZWVrO1xuICAgIG1vbWVudC5mbi5xdWFydGVycyA9IG1vbWVudC5mbi5xdWFydGVyO1xuXG4gICAgLy8gYWRkIGFsaWFzZWQgZm9ybWF0IG1ldGhvZHNcbiAgICBtb21lbnQuZm4udG9KU09OID0gbW9tZW50LmZuLnRvSVNPU3RyaW5nO1xuXG4gICAgLy8gYWxpYXMgaXNVdGMgZm9yIGRldi1mcmllbmRsaW5lc3NcbiAgICBtb21lbnQuZm4uaXNVVEMgPSBtb21lbnQuZm4uaXNVdGM7XG5cbiAgICAvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gICAgICAgIER1cmF0aW9uIFByb3RvdHlwZVxuICAgICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuXG4gICAgZnVuY3Rpb24gZGF5c1RvWWVhcnMgKGRheXMpIHtcbiAgICAgICAgLy8gNDAwIHllYXJzIGhhdmUgMTQ2MDk3IGRheXMgKHRha2luZyBpbnRvIGFjY291bnQgbGVhcCB5ZWFyIHJ1bGVzKVxuICAgICAgICByZXR1cm4gZGF5cyAqIDQwMCAvIDE0NjA5NztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB5ZWFyc1RvRGF5cyAoeWVhcnMpIHtcbiAgICAgICAgLy8geWVhcnMgKiAzNjUgKyBhYnNSb3VuZCh5ZWFycyAvIDQpIC1cbiAgICAgICAgLy8gICAgIGFic1JvdW5kKHllYXJzIC8gMTAwKSArIGFic1JvdW5kKHllYXJzIC8gNDAwKTtcbiAgICAgICAgcmV0dXJuIHllYXJzICogMTQ2MDk3IC8gNDAwO1xuICAgIH1cblxuICAgIGV4dGVuZChtb21lbnQuZHVyYXRpb24uZm4gPSBEdXJhdGlvbi5wcm90b3R5cGUsIHtcblxuICAgICAgICBfYnViYmxlIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIG1pbGxpc2Vjb25kcyA9IHRoaXMuX21pbGxpc2Vjb25kcyxcbiAgICAgICAgICAgICAgICBkYXlzID0gdGhpcy5fZGF5cyxcbiAgICAgICAgICAgICAgICBtb250aHMgPSB0aGlzLl9tb250aHMsXG4gICAgICAgICAgICAgICAgZGF0YSA9IHRoaXMuX2RhdGEsXG4gICAgICAgICAgICAgICAgc2Vjb25kcywgbWludXRlcywgaG91cnMsIHllYXJzID0gMDtcblxuICAgICAgICAgICAgLy8gVGhlIGZvbGxvd2luZyBjb2RlIGJ1YmJsZXMgdXAgdmFsdWVzLCBzZWUgdGhlIHRlc3RzIGZvclxuICAgICAgICAgICAgLy8gZXhhbXBsZXMgb2Ygd2hhdCB0aGF0IG1lYW5zLlxuICAgICAgICAgICAgZGF0YS5taWxsaXNlY29uZHMgPSBtaWxsaXNlY29uZHMgJSAxMDAwO1xuXG4gICAgICAgICAgICBzZWNvbmRzID0gYWJzUm91bmQobWlsbGlzZWNvbmRzIC8gMTAwMCk7XG4gICAgICAgICAgICBkYXRhLnNlY29uZHMgPSBzZWNvbmRzICUgNjA7XG5cbiAgICAgICAgICAgIG1pbnV0ZXMgPSBhYnNSb3VuZChzZWNvbmRzIC8gNjApO1xuICAgICAgICAgICAgZGF0YS5taW51dGVzID0gbWludXRlcyAlIDYwO1xuXG4gICAgICAgICAgICBob3VycyA9IGFic1JvdW5kKG1pbnV0ZXMgLyA2MCk7XG4gICAgICAgICAgICBkYXRhLmhvdXJzID0gaG91cnMgJSAyNDtcblxuICAgICAgICAgICAgZGF5cyArPSBhYnNSb3VuZChob3VycyAvIDI0KTtcblxuICAgICAgICAgICAgLy8gQWNjdXJhdGVseSBjb252ZXJ0IGRheXMgdG8geWVhcnMsIGFzc3VtZSBzdGFydCBmcm9tIHllYXIgMC5cbiAgICAgICAgICAgIHllYXJzID0gYWJzUm91bmQoZGF5c1RvWWVhcnMoZGF5cykpO1xuICAgICAgICAgICAgZGF5cyAtPSBhYnNSb3VuZCh5ZWFyc1RvRGF5cyh5ZWFycykpO1xuXG4gICAgICAgICAgICAvLyAzMCBkYXlzIHRvIGEgbW9udGhcbiAgICAgICAgICAgIC8vIFRPRE8gKGlza3Jlbik6IFVzZSBhbmNob3IgZGF0ZSAobGlrZSAxc3QgSmFuKSB0byBjb21wdXRlIHRoaXMuXG4gICAgICAgICAgICBtb250aHMgKz0gYWJzUm91bmQoZGF5cyAvIDMwKTtcbiAgICAgICAgICAgIGRheXMgJT0gMzA7XG5cbiAgICAgICAgICAgIC8vIDEyIG1vbnRocyAtPiAxIHllYXJcbiAgICAgICAgICAgIHllYXJzICs9IGFic1JvdW5kKG1vbnRocyAvIDEyKTtcbiAgICAgICAgICAgIG1vbnRocyAlPSAxMjtcblxuICAgICAgICAgICAgZGF0YS5kYXlzID0gZGF5cztcbiAgICAgICAgICAgIGRhdGEubW9udGhzID0gbW9udGhzO1xuICAgICAgICAgICAgZGF0YS55ZWFycyA9IHllYXJzO1xuICAgICAgICB9LFxuXG4gICAgICAgIGFicyA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMuX21pbGxpc2Vjb25kcyA9IE1hdGguYWJzKHRoaXMuX21pbGxpc2Vjb25kcyk7XG4gICAgICAgICAgICB0aGlzLl9kYXlzID0gTWF0aC5hYnModGhpcy5fZGF5cyk7XG4gICAgICAgICAgICB0aGlzLl9tb250aHMgPSBNYXRoLmFicyh0aGlzLl9tb250aHMpO1xuXG4gICAgICAgICAgICB0aGlzLl9kYXRhLm1pbGxpc2Vjb25kcyA9IE1hdGguYWJzKHRoaXMuX2RhdGEubWlsbGlzZWNvbmRzKTtcbiAgICAgICAgICAgIHRoaXMuX2RhdGEuc2Vjb25kcyA9IE1hdGguYWJzKHRoaXMuX2RhdGEuc2Vjb25kcyk7XG4gICAgICAgICAgICB0aGlzLl9kYXRhLm1pbnV0ZXMgPSBNYXRoLmFicyh0aGlzLl9kYXRhLm1pbnV0ZXMpO1xuICAgICAgICAgICAgdGhpcy5fZGF0YS5ob3VycyA9IE1hdGguYWJzKHRoaXMuX2RhdGEuaG91cnMpO1xuICAgICAgICAgICAgdGhpcy5fZGF0YS5tb250aHMgPSBNYXRoLmFicyh0aGlzLl9kYXRhLm1vbnRocyk7XG4gICAgICAgICAgICB0aGlzLl9kYXRhLnllYXJzID0gTWF0aC5hYnModGhpcy5fZGF0YS55ZWFycyk7XG5cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9LFxuXG4gICAgICAgIHdlZWtzIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIGFic1JvdW5kKHRoaXMuZGF5cygpIC8gNyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgdmFsdWVPZiA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9taWxsaXNlY29uZHMgK1xuICAgICAgICAgICAgICB0aGlzLl9kYXlzICogODY0ZTUgK1xuICAgICAgICAgICAgICAodGhpcy5fbW9udGhzICUgMTIpICogMjU5MmU2ICtcbiAgICAgICAgICAgICAgdG9JbnQodGhpcy5fbW9udGhzIC8gMTIpICogMzE1MzZlNjtcbiAgICAgICAgfSxcblxuICAgICAgICBodW1hbml6ZSA6IGZ1bmN0aW9uICh3aXRoU3VmZml4KSB7XG4gICAgICAgICAgICB2YXIgb3V0cHV0ID0gcmVsYXRpdmVUaW1lKHRoaXMsICF3aXRoU3VmZml4LCB0aGlzLmxvY2FsZURhdGEoKSk7XG5cbiAgICAgICAgICAgIGlmICh3aXRoU3VmZml4KSB7XG4gICAgICAgICAgICAgICAgb3V0cHV0ID0gdGhpcy5sb2NhbGVEYXRhKCkucGFzdEZ1dHVyZSgrdGhpcywgb3V0cHV0KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHRoaXMubG9jYWxlRGF0YSgpLnBvc3Rmb3JtYXQob3V0cHV0KTtcbiAgICAgICAgfSxcblxuICAgICAgICBhZGQgOiBmdW5jdGlvbiAoaW5wdXQsIHZhbCkge1xuICAgICAgICAgICAgLy8gc3VwcG9ydHMgb25seSAyLjAtc3R5bGUgYWRkKDEsICdzJykgb3IgYWRkKG1vbWVudClcbiAgICAgICAgICAgIHZhciBkdXIgPSBtb21lbnQuZHVyYXRpb24oaW5wdXQsIHZhbCk7XG5cbiAgICAgICAgICAgIHRoaXMuX21pbGxpc2Vjb25kcyArPSBkdXIuX21pbGxpc2Vjb25kcztcbiAgICAgICAgICAgIHRoaXMuX2RheXMgKz0gZHVyLl9kYXlzO1xuICAgICAgICAgICAgdGhpcy5fbW9udGhzICs9IGR1ci5fbW9udGhzO1xuXG4gICAgICAgICAgICB0aGlzLl9idWJibGUoKTtcblxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgc3VidHJhY3QgOiBmdW5jdGlvbiAoaW5wdXQsIHZhbCkge1xuICAgICAgICAgICAgdmFyIGR1ciA9IG1vbWVudC5kdXJhdGlvbihpbnB1dCwgdmFsKTtcblxuICAgICAgICAgICAgdGhpcy5fbWlsbGlzZWNvbmRzIC09IGR1ci5fbWlsbGlzZWNvbmRzO1xuICAgICAgICAgICAgdGhpcy5fZGF5cyAtPSBkdXIuX2RheXM7XG4gICAgICAgICAgICB0aGlzLl9tb250aHMgLT0gZHVyLl9tb250aHM7XG5cbiAgICAgICAgICAgIHRoaXMuX2J1YmJsZSgpO1xuXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSxcblxuICAgICAgICBnZXQgOiBmdW5jdGlvbiAodW5pdHMpIHtcbiAgICAgICAgICAgIHVuaXRzID0gbm9ybWFsaXplVW5pdHModW5pdHMpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXNbdW5pdHMudG9Mb3dlckNhc2UoKSArICdzJ10oKTtcbiAgICAgICAgfSxcblxuICAgICAgICBhcyA6IGZ1bmN0aW9uICh1bml0cykge1xuICAgICAgICAgICAgdmFyIGRheXMsIG1vbnRocztcbiAgICAgICAgICAgIHVuaXRzID0gbm9ybWFsaXplVW5pdHModW5pdHMpO1xuXG4gICAgICAgICAgICBpZiAodW5pdHMgPT09ICdtb250aCcgfHwgdW5pdHMgPT09ICd5ZWFyJykge1xuICAgICAgICAgICAgICAgIGRheXMgPSB0aGlzLl9kYXlzICsgdGhpcy5fbWlsbGlzZWNvbmRzIC8gODY0ZTU7XG4gICAgICAgICAgICAgICAgbW9udGhzID0gdGhpcy5fbW9udGhzICsgZGF5c1RvWWVhcnMoZGF5cykgKiAxMjtcbiAgICAgICAgICAgICAgICByZXR1cm4gdW5pdHMgPT09ICdtb250aCcgPyBtb250aHMgOiBtb250aHMgLyAxMjtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gaGFuZGxlIG1pbGxpc2Vjb25kcyBzZXBhcmF0ZWx5IGJlY2F1c2Ugb2YgZmxvYXRpbmcgcG9pbnQgbWF0aCBlcnJvcnMgKGlzc3VlICMxODY3KVxuICAgICAgICAgICAgICAgIGRheXMgPSB0aGlzLl9kYXlzICsgTWF0aC5yb3VuZCh5ZWFyc1RvRGF5cyh0aGlzLl9tb250aHMgLyAxMikpO1xuICAgICAgICAgICAgICAgIHN3aXRjaCAodW5pdHMpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnd2Vlayc6IHJldHVybiBkYXlzIC8gNyArIHRoaXMuX21pbGxpc2Vjb25kcyAvIDYwNDhlNTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnZGF5JzogcmV0dXJuIGRheXMgKyB0aGlzLl9taWxsaXNlY29uZHMgLyA4NjRlNTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnaG91cic6IHJldHVybiBkYXlzICogMjQgKyB0aGlzLl9taWxsaXNlY29uZHMgLyAzNmU1O1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdtaW51dGUnOiByZXR1cm4gZGF5cyAqIDI0ICogNjAgKyB0aGlzLl9taWxsaXNlY29uZHMgLyA2ZTQ7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3NlY29uZCc6IHJldHVybiBkYXlzICogMjQgKiA2MCAqIDYwICsgdGhpcy5fbWlsbGlzZWNvbmRzIC8gMTAwMDtcbiAgICAgICAgICAgICAgICAgICAgLy8gTWF0aC5mbG9vciBwcmV2ZW50cyBmbG9hdGluZyBwb2ludCBtYXRoIGVycm9ycyBoZXJlXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ21pbGxpc2Vjb25kJzogcmV0dXJuIE1hdGguZmxvb3IoZGF5cyAqIDI0ICogNjAgKiA2MCAqIDEwMDApICsgdGhpcy5fbWlsbGlzZWNvbmRzO1xuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiB0aHJvdyBuZXcgRXJyb3IoJ1Vua25vd24gdW5pdCAnICsgdW5pdHMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBsYW5nIDogbW9tZW50LmZuLmxhbmcsXG4gICAgICAgIGxvY2FsZSA6IG1vbWVudC5mbi5sb2NhbGUsXG5cbiAgICAgICAgdG9Jc29TdHJpbmcgOiBkZXByZWNhdGUoXG4gICAgICAgICAgICAndG9Jc29TdHJpbmcoKSBpcyBkZXByZWNhdGVkLiBQbGVhc2UgdXNlIHRvSVNPU3RyaW5nKCkgaW5zdGVhZCAnICtcbiAgICAgICAgICAgICcobm90aWNlIHRoZSBjYXBpdGFscyknLFxuICAgICAgICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnRvSVNPU3RyaW5nKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICksXG5cbiAgICAgICAgdG9JU09TdHJpbmcgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAvLyBpbnNwaXJlZCBieSBodHRwczovL2dpdGh1Yi5jb20vZG9yZGlsbGUvbW9tZW50LWlzb2R1cmF0aW9uL2Jsb2IvbWFzdGVyL21vbWVudC5pc29kdXJhdGlvbi5qc1xuICAgICAgICAgICAgdmFyIHllYXJzID0gTWF0aC5hYnModGhpcy55ZWFycygpKSxcbiAgICAgICAgICAgICAgICBtb250aHMgPSBNYXRoLmFicyh0aGlzLm1vbnRocygpKSxcbiAgICAgICAgICAgICAgICBkYXlzID0gTWF0aC5hYnModGhpcy5kYXlzKCkpLFxuICAgICAgICAgICAgICAgIGhvdXJzID0gTWF0aC5hYnModGhpcy5ob3VycygpKSxcbiAgICAgICAgICAgICAgICBtaW51dGVzID0gTWF0aC5hYnModGhpcy5taW51dGVzKCkpLFxuICAgICAgICAgICAgICAgIHNlY29uZHMgPSBNYXRoLmFicyh0aGlzLnNlY29uZHMoKSArIHRoaXMubWlsbGlzZWNvbmRzKCkgLyAxMDAwKTtcblxuICAgICAgICAgICAgaWYgKCF0aGlzLmFzU2Vjb25kcygpKSB7XG4gICAgICAgICAgICAgICAgLy8gdGhpcyBpcyB0aGUgc2FtZSBhcyBDIydzIChOb2RhKSBhbmQgcHl0aG9uIChpc29kYXRlKS4uLlxuICAgICAgICAgICAgICAgIC8vIGJ1dCBub3Qgb3RoZXIgSlMgKGdvb2cuZGF0ZSlcbiAgICAgICAgICAgICAgICByZXR1cm4gJ1AwRCc7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiAodGhpcy5hc1NlY29uZHMoKSA8IDAgPyAnLScgOiAnJykgK1xuICAgICAgICAgICAgICAgICdQJyArXG4gICAgICAgICAgICAgICAgKHllYXJzID8geWVhcnMgKyAnWScgOiAnJykgK1xuICAgICAgICAgICAgICAgIChtb250aHMgPyBtb250aHMgKyAnTScgOiAnJykgK1xuICAgICAgICAgICAgICAgIChkYXlzID8gZGF5cyArICdEJyA6ICcnKSArXG4gICAgICAgICAgICAgICAgKChob3VycyB8fCBtaW51dGVzIHx8IHNlY29uZHMpID8gJ1QnIDogJycpICtcbiAgICAgICAgICAgICAgICAoaG91cnMgPyBob3VycyArICdIJyA6ICcnKSArXG4gICAgICAgICAgICAgICAgKG1pbnV0ZXMgPyBtaW51dGVzICsgJ00nIDogJycpICtcbiAgICAgICAgICAgICAgICAoc2Vjb25kcyA/IHNlY29uZHMgKyAnUycgOiAnJyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgbG9jYWxlRGF0YSA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9sb2NhbGU7XG4gICAgICAgIH0sXG5cbiAgICAgICAgdG9KU09OIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMudG9JU09TdHJpbmcoKTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgbW9tZW50LmR1cmF0aW9uLmZuLnRvU3RyaW5nID0gbW9tZW50LmR1cmF0aW9uLmZuLnRvSVNPU3RyaW5nO1xuXG4gICAgZnVuY3Rpb24gbWFrZUR1cmF0aW9uR2V0dGVyKG5hbWUpIHtcbiAgICAgICAgbW9tZW50LmR1cmF0aW9uLmZuW25hbWVdID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2RhdGFbbmFtZV07XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZm9yIChpIGluIHVuaXRNaWxsaXNlY29uZEZhY3RvcnMpIHtcbiAgICAgICAgaWYgKGhhc093blByb3AodW5pdE1pbGxpc2Vjb25kRmFjdG9ycywgaSkpIHtcbiAgICAgICAgICAgIG1ha2VEdXJhdGlvbkdldHRlcihpLnRvTG93ZXJDYXNlKCkpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgbW9tZW50LmR1cmF0aW9uLmZuLmFzTWlsbGlzZWNvbmRzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5hcygnbXMnKTtcbiAgICB9O1xuICAgIG1vbWVudC5kdXJhdGlvbi5mbi5hc1NlY29uZHMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmFzKCdzJyk7XG4gICAgfTtcbiAgICBtb21lbnQuZHVyYXRpb24uZm4uYXNNaW51dGVzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5hcygnbScpO1xuICAgIH07XG4gICAgbW9tZW50LmR1cmF0aW9uLmZuLmFzSG91cnMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmFzKCdoJyk7XG4gICAgfTtcbiAgICBtb21lbnQuZHVyYXRpb24uZm4uYXNEYXlzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5hcygnZCcpO1xuICAgIH07XG4gICAgbW9tZW50LmR1cmF0aW9uLmZuLmFzV2Vla3MgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmFzKCd3ZWVrcycpO1xuICAgIH07XG4gICAgbW9tZW50LmR1cmF0aW9uLmZuLmFzTW9udGhzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5hcygnTScpO1xuICAgIH07XG4gICAgbW9tZW50LmR1cmF0aW9uLmZuLmFzWWVhcnMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmFzKCd5Jyk7XG4gICAgfTtcblxuICAgIC8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAgICAgICAgRGVmYXVsdCBMb2NhbGVcbiAgICAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cblxuICAgIC8vIFNldCBkZWZhdWx0IGxvY2FsZSwgb3RoZXIgbG9jYWxlIHdpbGwgaW5oZXJpdCBmcm9tIEVuZ2xpc2guXG4gICAgbW9tZW50LmxvY2FsZSgnZW4nLCB7XG4gICAgICAgIG9yZGluYWxQYXJzZTogL1xcZHsxLDJ9KHRofHN0fG5kfHJkKS8sXG4gICAgICAgIG9yZGluYWwgOiBmdW5jdGlvbiAobnVtYmVyKSB7XG4gICAgICAgICAgICB2YXIgYiA9IG51bWJlciAlIDEwLFxuICAgICAgICAgICAgICAgIG91dHB1dCA9ICh0b0ludChudW1iZXIgJSAxMDAgLyAxMCkgPT09IDEpID8gJ3RoJyA6XG4gICAgICAgICAgICAgICAgKGIgPT09IDEpID8gJ3N0JyA6XG4gICAgICAgICAgICAgICAgKGIgPT09IDIpID8gJ25kJyA6XG4gICAgICAgICAgICAgICAgKGIgPT09IDMpID8gJ3JkJyA6ICd0aCc7XG4gICAgICAgICAgICByZXR1cm4gbnVtYmVyICsgb3V0cHV0O1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICAvKiBFTUJFRF9MT0NBTEVTICovXG5cbiAgICAvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gICAgICAgIEV4cG9zaW5nIE1vbWVudFxuICAgICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuICAgIGZ1bmN0aW9uIG1ha2VHbG9iYWwoc2hvdWxkRGVwcmVjYXRlKSB7XG4gICAgICAgIC8qZ2xvYmFsIGVuZGVyOmZhbHNlICovXG4gICAgICAgIGlmICh0eXBlb2YgZW5kZXIgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgb2xkR2xvYmFsTW9tZW50ID0gZ2xvYmFsU2NvcGUubW9tZW50O1xuICAgICAgICBpZiAoc2hvdWxkRGVwcmVjYXRlKSB7XG4gICAgICAgICAgICBnbG9iYWxTY29wZS5tb21lbnQgPSBkZXByZWNhdGUoXG4gICAgICAgICAgICAgICAgICAgICdBY2Nlc3NpbmcgTW9tZW50IHRocm91Z2ggdGhlIGdsb2JhbCBzY29wZSBpcyAnICtcbiAgICAgICAgICAgICAgICAgICAgJ2RlcHJlY2F0ZWQsIGFuZCB3aWxsIGJlIHJlbW92ZWQgaW4gYW4gdXBjb21pbmcgJyArXG4gICAgICAgICAgICAgICAgICAgICdyZWxlYXNlLicsXG4gICAgICAgICAgICAgICAgICAgIG1vbWVudCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBnbG9iYWxTY29wZS5tb21lbnQgPSBtb21lbnQ7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBDb21tb25KUyBtb2R1bGUgaXMgZGVmaW5lZFxuICAgIGlmIChoYXNNb2R1bGUpIHtcbiAgICAgICAgbW9kdWxlLmV4cG9ydHMgPSBtb21lbnQ7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAgICAgZGVmaW5lKGZ1bmN0aW9uIChyZXF1aXJlLCBleHBvcnRzLCBtb2R1bGUpIHtcbiAgICAgICAgICAgIGlmIChtb2R1bGUuY29uZmlnICYmIG1vZHVsZS5jb25maWcoKSAmJiBtb2R1bGUuY29uZmlnKCkubm9HbG9iYWwgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICAvLyByZWxlYXNlIHRoZSBnbG9iYWwgdmFyaWFibGVcbiAgICAgICAgICAgICAgICBnbG9iYWxTY29wZS5tb21lbnQgPSBvbGRHbG9iYWxNb21lbnQ7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBtb21lbnQ7XG4gICAgICAgIH0pO1xuICAgICAgICBtYWtlR2xvYmFsKHRydWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIG1ha2VHbG9iYWwoKTtcbiAgICB9XG59KS5jYWxsKHRoaXMpO1xuIiwidmFyIGlvdGEgPSByZXF1aXJlKFwiaW90YS1hcnJheVwiKVxuXG52YXIgaGFzVHlwZWRBcnJheXMgID0gKCh0eXBlb2YgRmxvYXQ2NEFycmF5KSAhPT0gXCJ1bmRlZmluZWRcIilcbnZhciBoYXNCdWZmZXIgICAgICAgPSAoKHR5cGVvZiBCdWZmZXIpICE9PSBcInVuZGVmaW5lZFwiKVxuXG5mdW5jdGlvbiBjb21wYXJlMXN0KGEsIGIpIHtcbiAgcmV0dXJuIGFbMF0gLSBiWzBdXG59XG5cbmZ1bmN0aW9uIG9yZGVyKCkge1xuICB2YXIgc3RyaWRlID0gdGhpcy5zdHJpZGVcbiAgdmFyIHRlcm1zID0gbmV3IEFycmF5KHN0cmlkZS5sZW5ndGgpXG4gIHZhciBpXG4gIGZvcihpPTA7IGk8dGVybXMubGVuZ3RoOyArK2kpIHtcbiAgICB0ZXJtc1tpXSA9IFtNYXRoLmFicyhzdHJpZGVbaV0pLCBpXVxuICB9XG4gIHRlcm1zLnNvcnQoY29tcGFyZTFzdClcbiAgdmFyIHJlc3VsdCA9IG5ldyBBcnJheSh0ZXJtcy5sZW5ndGgpXG4gIGZvcihpPTA7IGk8cmVzdWx0Lmxlbmd0aDsgKytpKSB7XG4gICAgcmVzdWx0W2ldID0gdGVybXNbaV1bMV1cbiAgfVxuICByZXR1cm4gcmVzdWx0XG59XG5cbmZ1bmN0aW9uIGNvbXBpbGVDb25zdHJ1Y3RvcihkdHlwZSwgZGltZW5zaW9uKSB7XG4gIHZhciBjbGFzc05hbWUgPSBbXCJWaWV3XCIsIGRpbWVuc2lvbiwgXCJkXCIsIGR0eXBlXS5qb2luKFwiXCIpXG4gIGlmKGRpbWVuc2lvbiA8IDApIHtcbiAgICBjbGFzc05hbWUgPSBcIlZpZXdfTmlsXCIgKyBkdHlwZVxuICB9XG4gIHZhciB1c2VHZXR0ZXJzID0gKGR0eXBlID09PSBcImdlbmVyaWNcIilcbiAgXG4gIGlmKGRpbWVuc2lvbiA9PT0gLTEpIHtcbiAgICAvL1NwZWNpYWwgY2FzZSBmb3IgdHJpdmlhbCBhcnJheXNcbiAgICB2YXIgY29kZSA9IFxuICAgICAgXCJmdW5jdGlvbiBcIitjbGFzc05hbWUrXCIoYSl7dGhpcy5kYXRhPWE7fTtcXFxudmFyIHByb3RvPVwiK2NsYXNzTmFtZStcIi5wcm90b3R5cGU7XFxcbnByb3RvLmR0eXBlPSdcIitkdHlwZStcIic7XFxcbnByb3RvLmluZGV4PWZ1bmN0aW9uKCl7cmV0dXJuIC0xfTtcXFxucHJvdG8uc2l6ZT0wO1xcXG5wcm90by5kaW1lbnNpb249LTE7XFxcbnByb3RvLnNoYXBlPXByb3RvLnN0cmlkZT1wcm90by5vcmRlcj1bXTtcXFxucHJvdG8ubG89cHJvdG8uaGk9cHJvdG8udHJhbnNwb3NlPXByb3RvLnN0ZXA9XFxcbmZ1bmN0aW9uKCl7cmV0dXJuIG5ldyBcIitjbGFzc05hbWUrXCIodGhpcy5kYXRhKTt9O1xcXG5wcm90by5nZXQ9cHJvdG8uc2V0PWZ1bmN0aW9uKCl7fTtcXFxucHJvdG8ucGljaz1mdW5jdGlvbigpe3JldHVybiBudWxsfTtcXFxucmV0dXJuIGZ1bmN0aW9uIGNvbnN0cnVjdF9cIitjbGFzc05hbWUrXCIoYSl7cmV0dXJuIG5ldyBcIitjbGFzc05hbWUrXCIoYSk7fVwiXG4gICAgdmFyIHByb2NlZHVyZSA9IG5ldyBGdW5jdGlvbihjb2RlKVxuICAgIHJldHVybiBwcm9jZWR1cmUoKVxuICB9IGVsc2UgaWYoZGltZW5zaW9uID09PSAwKSB7XG4gICAgLy9TcGVjaWFsIGNhc2UgZm9yIDBkIGFycmF5c1xuICAgIHZhciBjb2RlID1cbiAgICAgIFwiZnVuY3Rpb24gXCIrY2xhc3NOYW1lK1wiKGEsZCkge1xcXG50aGlzLmRhdGEgPSBhO1xcXG50aGlzLm9mZnNldCA9IGRcXFxufTtcXFxudmFyIHByb3RvPVwiK2NsYXNzTmFtZStcIi5wcm90b3R5cGU7XFxcbnByb3RvLmR0eXBlPSdcIitkdHlwZStcIic7XFxcbnByb3RvLmluZGV4PWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMub2Zmc2V0fTtcXFxucHJvdG8uZGltZW5zaW9uPTA7XFxcbnByb3RvLnNpemU9MTtcXFxucHJvdG8uc2hhcGU9XFxcbnByb3RvLnN0cmlkZT1cXFxucHJvdG8ub3JkZXI9W107XFxcbnByb3RvLmxvPVxcXG5wcm90by5oaT1cXFxucHJvdG8udHJhbnNwb3NlPVxcXG5wcm90by5zdGVwPWZ1bmN0aW9uIFwiK2NsYXNzTmFtZStcIl9jb3B5KCkge1xcXG5yZXR1cm4gbmV3IFwiK2NsYXNzTmFtZStcIih0aGlzLmRhdGEsdGhpcy5vZmZzZXQpXFxcbn07XFxcbnByb3RvLnBpY2s9ZnVuY3Rpb24gXCIrY2xhc3NOYW1lK1wiX3BpY2soKXtcXFxucmV0dXJuIFRyaXZpYWxBcnJheSh0aGlzLmRhdGEpO1xcXG59O1xcXG5wcm90by52YWx1ZU9mPXByb3RvLmdldD1mdW5jdGlvbiBcIitjbGFzc05hbWUrXCJfZ2V0KCl7XFxcbnJldHVybiBcIisodXNlR2V0dGVycyA/IFwidGhpcy5kYXRhLmdldCh0aGlzLm9mZnNldClcIiA6IFwidGhpcy5kYXRhW3RoaXMub2Zmc2V0XVwiKStcblwifTtcXFxucHJvdG8uc2V0PWZ1bmN0aW9uIFwiK2NsYXNzTmFtZStcIl9zZXQodil7XFxcbnJldHVybiBcIisodXNlR2V0dGVycyA/IFwidGhpcy5kYXRhLnNldCh0aGlzLm9mZnNldCx2KVwiIDogXCJ0aGlzLmRhdGFbdGhpcy5vZmZzZXRdPXZcIikrXCJcXFxufTtcXFxucmV0dXJuIGZ1bmN0aW9uIGNvbnN0cnVjdF9cIitjbGFzc05hbWUrXCIoYSxiLGMsZCl7cmV0dXJuIG5ldyBcIitjbGFzc05hbWUrXCIoYSxkKX1cIlxuICAgIHZhciBwcm9jZWR1cmUgPSBuZXcgRnVuY3Rpb24oXCJUcml2aWFsQXJyYXlcIiwgY29kZSlcbiAgICByZXR1cm4gcHJvY2VkdXJlKENBQ0hFRF9DT05TVFJVQ1RPUlNbZHR5cGVdWzBdKVxuICB9XG5cbiAgdmFyIGNvZGUgPSBbXCIndXNlIHN0cmljdCdcIl1cbiAgICBcbiAgLy9DcmVhdGUgY29uc3RydWN0b3IgZm9yIHZpZXdcbiAgdmFyIGluZGljZXMgPSBpb3RhKGRpbWVuc2lvbilcbiAgdmFyIGFyZ3MgPSBpbmRpY2VzLm1hcChmdW5jdGlvbihpKSB7IHJldHVybiBcImlcIitpIH0pXG4gIHZhciBpbmRleF9zdHIgPSBcInRoaXMub2Zmc2V0K1wiICsgaW5kaWNlcy5tYXAoZnVuY3Rpb24oaSkge1xuICAgICAgICByZXR1cm4gXCJ0aGlzLnN0cmlkZVtcIiArIGkgKyBcIl0qaVwiICsgaVxuICAgICAgfSkuam9pbihcIitcIilcbiAgdmFyIHNoYXBlQXJnID0gaW5kaWNlcy5tYXAoZnVuY3Rpb24oaSkge1xuICAgICAgcmV0dXJuIFwiYlwiK2lcbiAgICB9KS5qb2luKFwiLFwiKVxuICB2YXIgc3RyaWRlQXJnID0gaW5kaWNlcy5tYXAoZnVuY3Rpb24oaSkge1xuICAgICAgcmV0dXJuIFwiY1wiK2lcbiAgICB9KS5qb2luKFwiLFwiKVxuICBjb2RlLnB1c2goXG4gICAgXCJmdW5jdGlvbiBcIitjbGFzc05hbWUrXCIoYSxcIiArIHNoYXBlQXJnICsgXCIsXCIgKyBzdHJpZGVBcmcgKyBcIixkKXt0aGlzLmRhdGE9YVwiLFxuICAgICAgXCJ0aGlzLnNoYXBlPVtcIiArIHNoYXBlQXJnICsgXCJdXCIsXG4gICAgICBcInRoaXMuc3RyaWRlPVtcIiArIHN0cmlkZUFyZyArIFwiXVwiLFxuICAgICAgXCJ0aGlzLm9mZnNldD1kfDB9XCIsXG4gICAgXCJ2YXIgcHJvdG89XCIrY2xhc3NOYW1lK1wiLnByb3RvdHlwZVwiLFxuICAgIFwicHJvdG8uZHR5cGU9J1wiK2R0eXBlK1wiJ1wiLFxuICAgIFwicHJvdG8uZGltZW5zaW9uPVwiK2RpbWVuc2lvbilcbiAgXG4gIC8vdmlldy5zaXplOlxuICBjb2RlLnB1c2goXCJPYmplY3QuZGVmaW5lUHJvcGVydHkocHJvdG8sJ3NpemUnLHtnZXQ6ZnVuY3Rpb24gXCIrY2xhc3NOYW1lK1wiX3NpemUoKXtcXFxucmV0dXJuIFwiK2luZGljZXMubWFwKGZ1bmN0aW9uKGkpIHsgcmV0dXJuIFwidGhpcy5zaGFwZVtcIitpK1wiXVwiIH0pLmpvaW4oXCIqXCIpLFxuXCJ9fSlcIilcblxuICAvL3ZpZXcub3JkZXI6XG4gIGlmKGRpbWVuc2lvbiA9PT0gMSkge1xuICAgIGNvZGUucHVzaChcInByb3RvLm9yZGVyPVswXVwiKVxuICB9IGVsc2Uge1xuICAgIGNvZGUucHVzaChcIk9iamVjdC5kZWZpbmVQcm9wZXJ0eShwcm90bywnb3JkZXInLHtnZXQ6XCIpXG4gICAgaWYoZGltZW5zaW9uIDwgNCkge1xuICAgICAgY29kZS5wdXNoKFwiZnVuY3Rpb24gXCIrY2xhc3NOYW1lK1wiX29yZGVyKCl7XCIpXG4gICAgICBpZihkaW1lbnNpb24gPT09IDIpIHtcbiAgICAgICAgY29kZS5wdXNoKFwicmV0dXJuIChNYXRoLmFicyh0aGlzLnN0cmlkZVswXSk+TWF0aC5hYnModGhpcy5zdHJpZGVbMV0pKT9bMSwwXTpbMCwxXX19KVwiKVxuICAgICAgfSBlbHNlIGlmKGRpbWVuc2lvbiA9PT0gMykge1xuICAgICAgICBjb2RlLnB1c2goXG5cInZhciBzMD1NYXRoLmFicyh0aGlzLnN0cmlkZVswXSksczE9TWF0aC5hYnModGhpcy5zdHJpZGVbMV0pLHMyPU1hdGguYWJzKHRoaXMuc3RyaWRlWzJdKTtcXFxuaWYoczA+czEpe1xcXG5pZihzMT5zMil7XFxcbnJldHVybiBbMiwxLDBdO1xcXG59ZWxzZSBpZihzMD5zMil7XFxcbnJldHVybiBbMSwyLDBdO1xcXG59ZWxzZXtcXFxucmV0dXJuIFsxLDAsMl07XFxcbn1cXFxufWVsc2UgaWYoczA+czIpe1xcXG5yZXR1cm4gWzIsMCwxXTtcXFxufWVsc2UgaWYoczI+czEpe1xcXG5yZXR1cm4gWzAsMSwyXTtcXFxufWVsc2V7XFxcbnJldHVybiBbMCwyLDFdO1xcXG59fX0pXCIpXG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvZGUucHVzaChcIk9SREVSfSlcIilcbiAgICB9XG4gIH1cbiAgXG4gIC8vdmlldy5zZXQoaTAsIC4uLiwgdik6XG4gIGNvZGUucHVzaChcblwicHJvdG8uc2V0PWZ1bmN0aW9uIFwiK2NsYXNzTmFtZStcIl9zZXQoXCIrYXJncy5qb2luKFwiLFwiKStcIix2KXtcIilcbiAgaWYodXNlR2V0dGVycykge1xuICAgIGNvZGUucHVzaChcInJldHVybiB0aGlzLmRhdGEuc2V0KFwiK2luZGV4X3N0citcIix2KX1cIilcbiAgfSBlbHNlIHtcbiAgICBjb2RlLnB1c2goXCJyZXR1cm4gdGhpcy5kYXRhW1wiK2luZGV4X3N0citcIl09dn1cIilcbiAgfVxuICBcbiAgLy92aWV3LmdldChpMCwgLi4uKTpcbiAgY29kZS5wdXNoKFwicHJvdG8uZ2V0PWZ1bmN0aW9uIFwiK2NsYXNzTmFtZStcIl9nZXQoXCIrYXJncy5qb2luKFwiLFwiKStcIil7XCIpXG4gIGlmKHVzZUdldHRlcnMpIHtcbiAgICBjb2RlLnB1c2goXCJyZXR1cm4gdGhpcy5kYXRhLmdldChcIitpbmRleF9zdHIrXCIpfVwiKVxuICB9IGVsc2Uge1xuICAgIGNvZGUucHVzaChcInJldHVybiB0aGlzLmRhdGFbXCIraW5kZXhfc3RyK1wiXX1cIilcbiAgfVxuICBcbiAgLy92aWV3LmluZGV4OlxuICBjb2RlLnB1c2goXG4gICAgXCJwcm90by5pbmRleD1mdW5jdGlvbiBcIitjbGFzc05hbWUrXCJfaW5kZXgoXCIsIGFyZ3Muam9pbigpLCBcIil7cmV0dXJuIFwiK2luZGV4X3N0citcIn1cIilcblxuICAvL3ZpZXcuaGkoKTpcbiAgY29kZS5wdXNoKFwicHJvdG8uaGk9ZnVuY3Rpb24gXCIrY2xhc3NOYW1lK1wiX2hpKFwiK2FyZ3Muam9pbihcIixcIikrXCIpe3JldHVybiBuZXcgXCIrY2xhc3NOYW1lK1wiKHRoaXMuZGF0YSxcIitcbiAgICBpbmRpY2VzLm1hcChmdW5jdGlvbihpKSB7XG4gICAgICByZXR1cm4gW1wiKHR5cGVvZiBpXCIsaSxcIiE9PSdudW1iZXInfHxpXCIsaSxcIjwwKT90aGlzLnNoYXBlW1wiLCBpLCBcIl06aVwiLCBpLFwifDBcIl0uam9pbihcIlwiKVxuICAgIH0pLmpvaW4oXCIsXCIpK1wiLFwiK1xuICAgIGluZGljZXMubWFwKGZ1bmN0aW9uKGkpIHtcbiAgICAgIHJldHVybiBcInRoaXMuc3RyaWRlW1wiK2kgKyBcIl1cIlxuICAgIH0pLmpvaW4oXCIsXCIpK1wiLHRoaXMub2Zmc2V0KX1cIilcbiAgXG4gIC8vdmlldy5sbygpOlxuICB2YXIgYV92YXJzID0gaW5kaWNlcy5tYXAoZnVuY3Rpb24oaSkgeyByZXR1cm4gXCJhXCIraStcIj10aGlzLnNoYXBlW1wiK2krXCJdXCIgfSlcbiAgdmFyIGNfdmFycyA9IGluZGljZXMubWFwKGZ1bmN0aW9uKGkpIHsgcmV0dXJuIFwiY1wiK2krXCI9dGhpcy5zdHJpZGVbXCIraStcIl1cIiB9KVxuICBjb2RlLnB1c2goXCJwcm90by5sbz1mdW5jdGlvbiBcIitjbGFzc05hbWUrXCJfbG8oXCIrYXJncy5qb2luKFwiLFwiKStcIil7dmFyIGI9dGhpcy5vZmZzZXQsZD0wLFwiK2FfdmFycy5qb2luKFwiLFwiKStcIixcIitjX3ZhcnMuam9pbihcIixcIikpXG4gIGZvcih2YXIgaT0wOyBpPGRpbWVuc2lvbjsgKytpKSB7XG4gICAgY29kZS5wdXNoKFxuXCJpZih0eXBlb2YgaVwiK2krXCI9PT0nbnVtYmVyJyYmaVwiK2krXCI+PTApe1xcXG5kPWlcIitpK1wifDA7XFxcbmIrPWNcIitpK1wiKmQ7XFxcbmFcIitpK1wiLT1kfVwiKVxuICB9XG4gIGNvZGUucHVzaChcInJldHVybiBuZXcgXCIrY2xhc3NOYW1lK1wiKHRoaXMuZGF0YSxcIitcbiAgICBpbmRpY2VzLm1hcChmdW5jdGlvbihpKSB7XG4gICAgICByZXR1cm4gXCJhXCIraVxuICAgIH0pLmpvaW4oXCIsXCIpK1wiLFwiK1xuICAgIGluZGljZXMubWFwKGZ1bmN0aW9uKGkpIHtcbiAgICAgIHJldHVybiBcImNcIitpXG4gICAgfSkuam9pbihcIixcIikrXCIsYil9XCIpXG4gIFxuICAvL3ZpZXcuc3RlcCgpOlxuICBjb2RlLnB1c2goXCJwcm90by5zdGVwPWZ1bmN0aW9uIFwiK2NsYXNzTmFtZStcIl9zdGVwKFwiK2FyZ3Muam9pbihcIixcIikrXCIpe3ZhciBcIitcbiAgICBpbmRpY2VzLm1hcChmdW5jdGlvbihpKSB7XG4gICAgICByZXR1cm4gXCJhXCIraStcIj10aGlzLnNoYXBlW1wiK2krXCJdXCJcbiAgICB9KS5qb2luKFwiLFwiKStcIixcIitcbiAgICBpbmRpY2VzLm1hcChmdW5jdGlvbihpKSB7XG4gICAgICByZXR1cm4gXCJiXCIraStcIj10aGlzLnN0cmlkZVtcIitpK1wiXVwiXG4gICAgfSkuam9pbihcIixcIikrXCIsYz10aGlzLm9mZnNldCxkPTAsY2VpbD1NYXRoLmNlaWxcIilcbiAgZm9yKHZhciBpPTA7IGk8ZGltZW5zaW9uOyArK2kpIHtcbiAgICBjb2RlLnB1c2goXG5cImlmKHR5cGVvZiBpXCIraStcIj09PSdudW1iZXInKXtcXFxuZD1pXCIraStcInwwO1xcXG5pZihkPDApe1xcXG5jKz1iXCIraStcIiooYVwiK2krXCItMSk7XFxcbmFcIitpK1wiPWNlaWwoLWFcIitpK1wiL2QpXFxcbn1lbHNle1xcXG5hXCIraStcIj1jZWlsKGFcIitpK1wiL2QpXFxcbn1cXFxuYlwiK2krXCIqPWRcXFxufVwiKVxuICB9XG4gIGNvZGUucHVzaChcInJldHVybiBuZXcgXCIrY2xhc3NOYW1lK1wiKHRoaXMuZGF0YSxcIitcbiAgICBpbmRpY2VzLm1hcChmdW5jdGlvbihpKSB7XG4gICAgICByZXR1cm4gXCJhXCIgKyBpXG4gICAgfSkuam9pbihcIixcIikrXCIsXCIrXG4gICAgaW5kaWNlcy5tYXAoZnVuY3Rpb24oaSkge1xuICAgICAgcmV0dXJuIFwiYlwiICsgaVxuICAgIH0pLmpvaW4oXCIsXCIpK1wiLGMpfVwiKVxuICBcbiAgLy92aWV3LnRyYW5zcG9zZSgpOlxuICB2YXIgdFNoYXBlID0gbmV3IEFycmF5KGRpbWVuc2lvbilcbiAgdmFyIHRTdHJpZGUgPSBuZXcgQXJyYXkoZGltZW5zaW9uKVxuICBmb3IodmFyIGk9MDsgaTxkaW1lbnNpb247ICsraSkge1xuICAgIHRTaGFwZVtpXSA9IFwiYVtpXCIraStcIl1cIlxuICAgIHRTdHJpZGVbaV0gPSBcImJbaVwiK2krXCJdXCJcbiAgfVxuICBjb2RlLnB1c2goXCJwcm90by50cmFuc3Bvc2U9ZnVuY3Rpb24gXCIrY2xhc3NOYW1lK1wiX3RyYW5zcG9zZShcIithcmdzK1wiKXtcIitcbiAgICBhcmdzLm1hcChmdW5jdGlvbihuLGlkeCkgeyByZXR1cm4gbiArIFwiPShcIiArIG4gKyBcIj09PXVuZGVmaW5lZD9cIiArIGlkeCArIFwiOlwiICsgbiArIFwifDApXCJ9KS5qb2luKFwiO1wiKSxcbiAgICBcInZhciBhPXRoaXMuc2hhcGUsYj10aGlzLnN0cmlkZTtyZXR1cm4gbmV3IFwiK2NsYXNzTmFtZStcIih0aGlzLmRhdGEsXCIrdFNoYXBlLmpvaW4oXCIsXCIpK1wiLFwiK3RTdHJpZGUuam9pbihcIixcIikrXCIsdGhpcy5vZmZzZXQpfVwiKVxuICBcbiAgLy92aWV3LnBpY2soKTpcbiAgY29kZS5wdXNoKFwicHJvdG8ucGljaz1mdW5jdGlvbiBcIitjbGFzc05hbWUrXCJfcGljayhcIithcmdzK1wiKXt2YXIgYT1bXSxiPVtdLGM9dGhpcy5vZmZzZXRcIilcbiAgZm9yKHZhciBpPTA7IGk8ZGltZW5zaW9uOyArK2kpIHtcbiAgICBjb2RlLnB1c2goXCJpZih0eXBlb2YgaVwiK2krXCI9PT0nbnVtYmVyJyYmaVwiK2krXCI+PTApe2M9KGMrdGhpcy5zdHJpZGVbXCIraStcIl0qaVwiK2krXCIpfDB9ZWxzZXthLnB1c2godGhpcy5zaGFwZVtcIitpK1wiXSk7Yi5wdXNoKHRoaXMuc3RyaWRlW1wiK2krXCJdKX1cIilcbiAgfVxuICBjb2RlLnB1c2goXCJ2YXIgY3Rvcj1DVE9SX0xJU1RbYS5sZW5ndGgrMV07cmV0dXJuIGN0b3IodGhpcy5kYXRhLGEsYixjKX1cIilcbiAgICBcbiAgLy9BZGQgcmV0dXJuIHN0YXRlbWVudFxuICBjb2RlLnB1c2goXCJyZXR1cm4gZnVuY3Rpb24gY29uc3RydWN0X1wiK2NsYXNzTmFtZStcIihkYXRhLHNoYXBlLHN0cmlkZSxvZmZzZXQpe3JldHVybiBuZXcgXCIrY2xhc3NOYW1lK1wiKGRhdGEsXCIrXG4gICAgaW5kaWNlcy5tYXAoZnVuY3Rpb24oaSkge1xuICAgICAgcmV0dXJuIFwic2hhcGVbXCIraStcIl1cIlxuICAgIH0pLmpvaW4oXCIsXCIpK1wiLFwiK1xuICAgIGluZGljZXMubWFwKGZ1bmN0aW9uKGkpIHtcbiAgICAgIHJldHVybiBcInN0cmlkZVtcIitpK1wiXVwiXG4gICAgfSkuam9pbihcIixcIikrXCIsb2Zmc2V0KX1cIilcblxuICAvL0NvbXBpbGUgcHJvY2VkdXJlXG4gIHZhciBwcm9jZWR1cmUgPSBuZXcgRnVuY3Rpb24oXCJDVE9SX0xJU1RcIiwgXCJPUkRFUlwiLCBjb2RlLmpvaW4oXCJcXG5cIikpXG4gIHJldHVybiBwcm9jZWR1cmUoQ0FDSEVEX0NPTlNUUlVDVE9SU1tkdHlwZV0sIG9yZGVyKVxufVxuXG5mdW5jdGlvbiBhcnJheURUeXBlKGRhdGEpIHtcbiAgaWYoaGFzQnVmZmVyKSB7XG4gICAgaWYoQnVmZmVyLmlzQnVmZmVyKGRhdGEpKSB7XG4gICAgICByZXR1cm4gXCJidWZmZXJcIlxuICAgIH1cbiAgfVxuICBpZihoYXNUeXBlZEFycmF5cykge1xuICAgIHN3aXRjaChPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoZGF0YSkpIHtcbiAgICAgIGNhc2UgXCJbb2JqZWN0IEZsb2F0NjRBcnJheV1cIjpcbiAgICAgICAgcmV0dXJuIFwiZmxvYXQ2NFwiXG4gICAgICBjYXNlIFwiW29iamVjdCBGbG9hdDMyQXJyYXldXCI6XG4gICAgICAgIHJldHVybiBcImZsb2F0MzJcIlxuICAgICAgY2FzZSBcIltvYmplY3QgSW50OEFycmF5XVwiOlxuICAgICAgICByZXR1cm4gXCJpbnQ4XCJcbiAgICAgIGNhc2UgXCJbb2JqZWN0IEludDE2QXJyYXldXCI6XG4gICAgICAgIHJldHVybiBcImludDE2XCJcbiAgICAgIGNhc2UgXCJbb2JqZWN0IEludDMyQXJyYXldXCI6XG4gICAgICAgIHJldHVybiBcImludDMyXCJcbiAgICAgIGNhc2UgXCJbb2JqZWN0IFVpbnQ4QXJyYXldXCI6XG4gICAgICAgIHJldHVybiBcInVpbnQ4XCJcbiAgICAgIGNhc2UgXCJbb2JqZWN0IFVpbnQxNkFycmF5XVwiOlxuICAgICAgICByZXR1cm4gXCJ1aW50MTZcIlxuICAgICAgY2FzZSBcIltvYmplY3QgVWludDMyQXJyYXldXCI6XG4gICAgICAgIHJldHVybiBcInVpbnQzMlwiXG4gICAgICBjYXNlIFwiW29iamVjdCBVaW50OENsYW1wZWRBcnJheV1cIjpcbiAgICAgICAgcmV0dXJuIFwidWludDhfY2xhbXBlZFwiXG4gICAgfVxuICB9XG4gIGlmKEFycmF5LmlzQXJyYXkoZGF0YSkpIHtcbiAgICByZXR1cm4gXCJhcnJheVwiXG4gIH1cbiAgcmV0dXJuIFwiZ2VuZXJpY1wiXG59XG5cbnZhciBDQUNIRURfQ09OU1RSVUNUT1JTID0ge1xuICBcImZsb2F0MzJcIjpbXSxcbiAgXCJmbG9hdDY0XCI6W10sXG4gIFwiaW50OFwiOltdLFxuICBcImludDE2XCI6W10sXG4gIFwiaW50MzJcIjpbXSxcbiAgXCJ1aW50OFwiOltdLFxuICBcInVpbnQxNlwiOltdLFxuICBcInVpbnQzMlwiOltdLFxuICBcImFycmF5XCI6W10sXG4gIFwidWludDhfY2xhbXBlZFwiOltdLFxuICBcImJ1ZmZlclwiOltdLFxuICBcImdlbmVyaWNcIjpbXVxufVxuXG47KGZ1bmN0aW9uKCkge1xuICBmb3IodmFyIGlkIGluIENBQ0hFRF9DT05TVFJVQ1RPUlMpIHtcbiAgICBDQUNIRURfQ09OU1RSVUNUT1JTW2lkXS5wdXNoKGNvbXBpbGVDb25zdHJ1Y3RvcihpZCwgLTEpKVxuICB9XG59KTtcblxuZnVuY3Rpb24gd3JhcHBlZE5EQXJyYXlDdG9yKGRhdGEsIHNoYXBlLCBzdHJpZGUsIG9mZnNldCkge1xuICBpZihkYXRhID09PSB1bmRlZmluZWQpIHtcbiAgICB2YXIgY3RvciA9IENBQ0hFRF9DT05TVFJVQ1RPUlMuYXJyYXlbMF1cbiAgICByZXR1cm4gY3RvcihbXSlcbiAgfSBlbHNlIGlmKHR5cGVvZiBkYXRhID09PSBcIm51bWJlclwiKSB7XG4gICAgZGF0YSA9IFtkYXRhXVxuICB9XG4gIGlmKHNoYXBlID09PSB1bmRlZmluZWQpIHtcbiAgICBzaGFwZSA9IFsgZGF0YS5sZW5ndGggXVxuICB9XG4gIHZhciBkID0gc2hhcGUubGVuZ3RoXG4gIGlmKHN0cmlkZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgc3RyaWRlID0gbmV3IEFycmF5KGQpXG4gICAgZm9yKHZhciBpPWQtMSwgc3o9MTsgaT49MDsgLS1pKSB7XG4gICAgICBzdHJpZGVbaV0gPSBzelxuICAgICAgc3ogKj0gc2hhcGVbaV1cbiAgICB9XG4gIH1cbiAgaWYob2Zmc2V0ID09PSB1bmRlZmluZWQpIHtcbiAgICBvZmZzZXQgPSAwXG4gICAgZm9yKHZhciBpPTA7IGk8ZDsgKytpKSB7XG4gICAgICBpZihzdHJpZGVbaV0gPCAwKSB7XG4gICAgICAgIG9mZnNldCAtPSAoc2hhcGVbaV0tMSkqc3RyaWRlW2ldXG4gICAgICB9XG4gICAgfVxuICB9XG4gIHZhciBkdHlwZSA9IGFycmF5RFR5cGUoZGF0YSlcbiAgdmFyIGN0b3JfbGlzdCA9IENBQ0hFRF9DT05TVFJVQ1RPUlNbZHR5cGVdXG4gIHdoaWxlKGN0b3JfbGlzdC5sZW5ndGggPD0gZCsxKSB7XG4gICAgY3Rvcl9saXN0LnB1c2goY29tcGlsZUNvbnN0cnVjdG9yKGR0eXBlLCBjdG9yX2xpc3QubGVuZ3RoLTEpKVxuICB9XG4gIHZhciBjdG9yID0gY3Rvcl9saXN0W2QrMV1cbiAgcmV0dXJuIGN0b3IoZGF0YSwgc2hhcGUsIHN0cmlkZSwgb2Zmc2V0KVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHdyYXBwZWROREFycmF5Q3RvciIsIlwidXNlIHN0cmljdFwiXG5cbmZ1bmN0aW9uIGlvdGEobikge1xuICB2YXIgcmVzdWx0ID0gbmV3IEFycmF5KG4pXG4gIGZvcih2YXIgaT0wOyBpPG47ICsraSkge1xuICAgIHJlc3VsdFtpXSA9IGlcbiAgfVxuICByZXR1cm4gcmVzdWx0XG59XG5cbm1vZHVsZS5leHBvcnRzID0gaW90YSIsInZhciBub3cgPSByZXF1aXJlKCdwZXJmb3JtYW5jZS1ub3cnKVxuICAsIGdsb2JhbCA9IHR5cGVvZiB3aW5kb3cgPT09ICd1bmRlZmluZWQnID8ge30gOiB3aW5kb3dcbiAgLCB2ZW5kb3JzID0gWydtb3onLCAnd2Via2l0J11cbiAgLCBzdWZmaXggPSAnQW5pbWF0aW9uRnJhbWUnXG4gICwgcmFmID0gZ2xvYmFsWydyZXF1ZXN0JyArIHN1ZmZpeF1cbiAgLCBjYWYgPSBnbG9iYWxbJ2NhbmNlbCcgKyBzdWZmaXhdIHx8IGdsb2JhbFsnY2FuY2VsUmVxdWVzdCcgKyBzdWZmaXhdXG4gICwgaXNOYXRpdmUgPSB0cnVlXG5cbmZvcih2YXIgaSA9IDA7IGkgPCB2ZW5kb3JzLmxlbmd0aCAmJiAhcmFmOyBpKyspIHtcbiAgcmFmID0gZ2xvYmFsW3ZlbmRvcnNbaV0gKyAnUmVxdWVzdCcgKyBzdWZmaXhdXG4gIGNhZiA9IGdsb2JhbFt2ZW5kb3JzW2ldICsgJ0NhbmNlbCcgKyBzdWZmaXhdXG4gICAgICB8fCBnbG9iYWxbdmVuZG9yc1tpXSArICdDYW5jZWxSZXF1ZXN0JyArIHN1ZmZpeF1cbn1cblxuLy8gU29tZSB2ZXJzaW9ucyBvZiBGRiBoYXZlIHJBRiBidXQgbm90IGNBRlxuaWYoIXJhZiB8fCAhY2FmKSB7XG4gIGlzTmF0aXZlID0gZmFsc2VcblxuICB2YXIgbGFzdCA9IDBcbiAgICAsIGlkID0gMFxuICAgICwgcXVldWUgPSBbXVxuICAgICwgZnJhbWVEdXJhdGlvbiA9IDEwMDAgLyA2MFxuXG4gIHJhZiA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgaWYocXVldWUubGVuZ3RoID09PSAwKSB7XG4gICAgICB2YXIgX25vdyA9IG5vdygpXG4gICAgICAgICwgbmV4dCA9IE1hdGgubWF4KDAsIGZyYW1lRHVyYXRpb24gLSAoX25vdyAtIGxhc3QpKVxuICAgICAgbGFzdCA9IG5leHQgKyBfbm93XG4gICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgY3AgPSBxdWV1ZS5zbGljZSgwKVxuICAgICAgICAvLyBDbGVhciBxdWV1ZSBoZXJlIHRvIHByZXZlbnRcbiAgICAgICAgLy8gY2FsbGJhY2tzIGZyb20gYXBwZW5kaW5nIGxpc3RlbmVyc1xuICAgICAgICAvLyB0byB0aGUgY3VycmVudCBmcmFtZSdzIHF1ZXVlXG4gICAgICAgIHF1ZXVlLmxlbmd0aCA9IDBcbiAgICAgICAgZm9yKHZhciBpID0gMDsgaSA8IGNwLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgaWYoIWNwW2ldLmNhbmNlbGxlZCkge1xuICAgICAgICAgICAgdHJ5e1xuICAgICAgICAgICAgICBjcFtpXS5jYWxsYmFjayhsYXN0KVxuICAgICAgICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7IHRocm93IGUgfSwgMClcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0sIE1hdGgucm91bmQobmV4dCkpXG4gICAgfVxuICAgIHF1ZXVlLnB1c2goe1xuICAgICAgaGFuZGxlOiArK2lkLFxuICAgICAgY2FsbGJhY2s6IGNhbGxiYWNrLFxuICAgICAgY2FuY2VsbGVkOiBmYWxzZVxuICAgIH0pXG4gICAgcmV0dXJuIGlkXG4gIH1cblxuICBjYWYgPSBmdW5jdGlvbihoYW5kbGUpIHtcbiAgICBmb3IodmFyIGkgPSAwOyBpIDwgcXVldWUubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmKHF1ZXVlW2ldLmhhbmRsZSA9PT0gaGFuZGxlKSB7XG4gICAgICAgIHF1ZXVlW2ldLmNhbmNlbGxlZCA9IHRydWVcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihmbikge1xuICAvLyBXcmFwIGluIGEgbmV3IGZ1bmN0aW9uIHRvIHByZXZlbnRcbiAgLy8gYGNhbmNlbGAgcG90ZW50aWFsbHkgYmVpbmcgYXNzaWduZWRcbiAgLy8gdG8gdGhlIG5hdGl2ZSByQUYgZnVuY3Rpb25cbiAgaWYoIWlzTmF0aXZlKSB7XG4gICAgcmV0dXJuIHJhZi5jYWxsKGdsb2JhbCwgZm4pXG4gIH1cbiAgcmV0dXJuIHJhZi5jYWxsKGdsb2JhbCwgZnVuY3Rpb24oKSB7XG4gICAgdHJ5e1xuICAgICAgZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKVxuICAgIH0gY2F0Y2goZSkge1xuICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHsgdGhyb3cgZSB9LCAwKVxuICAgIH1cbiAgfSlcbn1cbm1vZHVsZS5leHBvcnRzLmNhbmNlbCA9IGZ1bmN0aW9uKCkge1xuICBjYWYuYXBwbHkoZ2xvYmFsLCBhcmd1bWVudHMpXG59XG4iLCIvLyBHZW5lcmF0ZWQgYnkgQ29mZmVlU2NyaXB0IDEuNi4zXG4oZnVuY3Rpb24oKSB7XG4gIHZhciBnZXROYW5vU2Vjb25kcywgaHJ0aW1lLCBsb2FkVGltZTtcblxuICBpZiAoKHR5cGVvZiBwZXJmb3JtYW5jZSAhPT0gXCJ1bmRlZmluZWRcIiAmJiBwZXJmb3JtYW5jZSAhPT0gbnVsbCkgJiYgcGVyZm9ybWFuY2Uubm93KSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBwZXJmb3JtYW5jZS5ub3coKTtcbiAgICB9O1xuICB9IGVsc2UgaWYgKCh0eXBlb2YgcHJvY2VzcyAhPT0gXCJ1bmRlZmluZWRcIiAmJiBwcm9jZXNzICE9PSBudWxsKSAmJiBwcm9jZXNzLmhydGltZSkge1xuICAgIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gKGdldE5hbm9TZWNvbmRzKCkgLSBsb2FkVGltZSkgLyAxZTY7XG4gICAgfTtcbiAgICBocnRpbWUgPSBwcm9jZXNzLmhydGltZTtcbiAgICBnZXROYW5vU2Vjb25kcyA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGhyO1xuICAgICAgaHIgPSBocnRpbWUoKTtcbiAgICAgIHJldHVybiBoclswXSAqIDFlOSArIGhyWzFdO1xuICAgIH07XG4gICAgbG9hZFRpbWUgPSBnZXROYW5vU2Vjb25kcygpO1xuICB9IGVsc2UgaWYgKERhdGUubm93KSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBEYXRlLm5vdygpIC0gbG9hZFRpbWU7XG4gICAgfTtcbiAgICBsb2FkVGltZSA9IERhdGUubm93KCk7XG4gIH0gZWxzZSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBuZXcgRGF0ZSgpLmdldFRpbWUoKSAtIGxvYWRUaW1lO1xuICAgIH07XG4gICAgbG9hZFRpbWUgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgfVxuXG59KS5jYWxsKHRoaXMpO1xuXG4vKlxuLy9AIHNvdXJjZU1hcHBpbmdVUkw9cGVyZm9ybWFuY2Utbm93Lm1hcFxuKi9cbiIsIi8vIGdhbWVzdGF0ZS5qc1xyXG4vLyBcclxuXHJcbiQuY29va2llLmpzb24gPSB0cnVlO1xyXG5cclxudmFyIGdhbWVTdGF0ZSA9XHJcbm1vZHVsZS5leHBvcnRzID0ge1xyXG5cdGxvYWQ6IGZ1bmN0aW9uKCkge1xyXG5cdFx0dmFyIHNhdmVkID0gJC5jb29raWUoe3BhdGg6IEJBU0VVUkx9KTtcclxuXHRcdGdhbWVTdGF0ZS5wbGF5ZXJTcHJpdGUgPSBzYXZlZC5wbGF5ZXJTcHJpdGU7XHJcblx0XHRnYW1lU3RhdGUubWFwVHJhbnNpdGlvbiA9IHNhdmVkLm1hcFRyYW5zaXRpb247XHJcblx0XHRcclxuXHRcdGdhbWVTdGF0ZS5pbmZvZGV4LnJlZ2lzdGVyID0gSlNPTi5wYXJzZSgkLmJhc2U2NC5kZWNvZGUoc2F2ZWQuaW5mb2RleCkpO1xyXG5cdH0sXHJcblx0XHJcblx0c2F2ZUxvY2F0aW9uOiBmdW5jdGlvbihvcHRzKSB7XHJcblx0XHQvL0luc2VydCBpdGVtcyB0byBiZSBzYXZlZCBoZXJlXHJcblx0XHR2YXIgbyA9IHtcclxuXHRcdFx0bmV4dE1hcDogb3B0cy5tYXAgfHwgb3B0cy5uZXh0TWFwIHx8IGdhbWVTdGF0ZS5tYXBUcmFuc2l0aW9uLm5leHRNYXAsXHJcblx0XHRcdHdhcnA6IG9wdHMud2FycCB8fCBnYW1lU3RhdGUubWFwVHJhbnNpdGlvbi53YXJwLFxyXG5cdFx0XHRhbmltT3ZlcnJpZGU6IFxyXG5cdFx0XHRcdChvcHRzLmFuaW0gIT09IHVuZGVmaW5lZCk/IG9wdHMuYW5pbSA6IFxyXG5cdFx0XHRcdChvcHRzLmFuaW1PdmVycmlkZSAhPT0gdW5kZWZpbmVkKT8gb3B0cy5hbmltT3ZlcnJpZGUgOiBcclxuXHRcdFx0XHRnYW1lU3RhdGUubWFwVHJhbnNpdGlvbi5hbmltT3ZlcnJpZGUsXHJcblx0XHR9XHJcblx0XHQkLmNvb2tpZShcIm1hcFRyYW5zaXRpb25cIiwgbywge3BhdGg6IEJBU0VVUkx9KTtcclxuXHR9LFxyXG5cdFxyXG5cdC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHQvLyBNYXAgVHJhbnNpdGlvblxyXG5cdG1hcFRyYW5zaXRpb24gOiB7XHJcblx0XHRuZXh0TWFwIDogXCJpQ2h1cmNoT2ZIZWxpeFwiLFxyXG5cdFx0d2FycDogMHgxMCxcclxuXHRcdGFuaW1PdmVycmlkZTogMCxcclxuXHR9LFxyXG5cdFxyXG5cdHBsYXllclNwcml0ZSA6IFwibWVsb2R5W2hnX3ZlcnRtaXgtMzJdLnBuZ1wiLFxyXG5cdFxyXG59O1xyXG5cclxuLy8gSW5mb2RleCBmdW5jdGlvbnNcclxuZ2FtZVN0YXRlLmluZm9kZXggPSB7XHJcblx0cmVnaXN0ZXI6IHt9LFxyXG5cdHNlZW46IDAsXHJcblx0Zm91bmQ6IDAsXHJcblx0XHJcblx0X19tYXJrOiBmdW5jdGlvbihjb250YWluZXIsIHVybCwgbWFyaykge1xyXG5cdFx0dmFyIGNvbXAgPSB1cmwuc2hpZnQoKTtcclxuXHRcdHZhciBvbGQgPSBjb250YWluZXJbY29tcF07XHJcblx0XHRpZiAoIXVybC5sZW5ndGgpIHtcclxuXHRcdFx0Ly8gV2UncmUgYXQgdGhlIGVuZCBvZiB0aGUgVVJMLCB0aGlzIHNob3VsZCBiZSBhIGxlYWYgbm9kZVxyXG5cdFx0XHRpZiAoIW9sZCkgb2xkID0gY29udGFpbmVyW2NvbXBdID0gMDtcclxuXHRcdFx0aWYgKHR5cGVvZiBvbGQgIT09IFwibnVtYmVyXCIpIFxyXG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcihcIlVSTCBkb2VzIG5vdCBwb2ludCB0byBsZWFmIG5vZGUhXCIpO1xyXG5cdFx0XHRjb250YWluZXJbY29tcF0gfD0gbWFyaztcclxuXHRcdFx0cmV0dXJuIG9sZDtcclxuXHRcdFx0XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHQvL1N0aWxsIGdvaW5nIGRvd24gdGhlIHVybFxyXG5cdFx0XHRpZiAoIW9sZCkgb2xkID0gY29udGFpbmVyW2NvbXBdID0ge307XHJcblx0XHRcdHJldHVybiB0aGlzLl9fbWFyayhvbGQsIHVybCwgbWFyayk7IC8vdGFpbCBjYWxsXHJcblx0XHR9XHJcblx0fSxcclxuXHRcclxuXHRtYXJrU2VlbjogZnVuY3Rpb24odXJsKSB7XHJcblx0XHQvLyB2YXIgY29tcCA9IHVybC5zcGxpdChcIi5cIik7XHJcblx0XHQvLyB2YXIgcmVnID0gZ2FtZVN0YXRlLmluZm9kZXgucmVnaXN0ZXI7IC8vW3VybF0gfD0gMTsgLy9zZXQgdG8gYXQgbGVhc3QgMVxyXG5cdFx0XHJcblx0XHQvLyBmb3IgKHZhciBpID0gMDsgaSA8IGNvbXAubGVuZ3RoLTE7IGkrKykge1xyXG5cdFx0Ly8gXHRyZWcgPSByZWdbY29tcFtpXV0gfHwge307XHJcblx0XHQvLyB9XHJcblx0XHQvLyByZWdbXVxyXG5cdFx0dmFyIHJlcyA9IHRoaXMuX19tYXJrKHRoaXMucmVnaXN0ZXIsIHVybC5zcGxpdChcIi5cIiksIDEpO1xyXG5cdFx0aWYgKHJlcyA9PSAwKSB7IHRoaXMuc2VlbisrOyB9XHJcblx0fSxcclxuXHRtYXJrRm91bmQ6IGZ1bmN0aW9uKHVybCkge1xyXG5cdFx0Ly8gZ2FtZVN0YXRlLmluZm9kZXhbdXJsXSB8PSAyOyAvL3NldCB0byBhdCBsZWFzdCAyXHJcblx0XHR2YXIgcmVzID0gdGhpcy5fX21hcmsodGhpcy5yZWdpc3RlciwgdXJsLnNwbGl0KFwiLlwiKSwgMik7XHJcblx0XHRpZiAocmVzID09IDApIHsgdGhpcy5zZWVuKys7IHRoaXMuZm91bmQrKzsgfVxyXG5cdFx0ZWxzZSBpZiAocmVzID09IDEpIHsgdGhpcy5mb3VuZCsrOyB9XHJcblx0fSxcclxuXHRcclxuXHRcclxuXHRcclxufTsiLCIvLyBnbG9iYWxzLmpzXHJcblxyXG53aW5kb3cuQ09ORklHID0ge1xyXG5cdHNwZWVkIDoge1xyXG5cdFx0cGF0aGluZzogMi41LFxyXG5cdFx0YW5pbWF0aW9uOiAzMCxcclxuXHRcdGJ1YmJsZXBvcDogOS41LFxyXG5cdH0sXHJcblx0dGltZW91dCA6IHtcclxuXHRcdHdhbGtDb250cm9sIDogMC4xLFxyXG5cdH1cclxufTtcclxuXHJcbndpbmRvdy5ERUJVRyA9IHt9O1xyXG5cclxuLy9PbiBSZWFkeVxyXG4kKGZ1bmN0aW9uKCl7XHJcblx0XHJcbn0pO1xyXG5cclxud2luZG93LlNvdW5kTWFuYWdlciA9IHJlcXVpcmUoXCIuL21hbmFnZXJzL3NvdW5kbWFuYWdlclwiKTtcclxud2luZG93Lk1hcE1hbmFnZXIgPSByZXF1aXJlKFwiLi9tYW5hZ2Vycy9tYXBtYW5hZ2VyXCIpO1xyXG53aW5kb3cuQWN0b3JTY2hlZHVsZXIgPSByZXF1aXJlKFwiLi9tYW5hZ2Vycy9hY3RvcnNjaGVkdWxlclwiKTtcclxud2luZG93LkdDID0gcmVxdWlyZShcIi4vbWFuYWdlcnMvZ2FyYmFnZS1jb2xsZWN0b3JcIik7XHJcbndpbmRvdy5VSSA9IHJlcXVpcmUoXCIuL21hbmFnZXJzL3VpLW1hbmFnZXJcIik7XHJcbi8vIHdpbmRvdy5DaGF0ID0gcmVxdWlyZShcIi4vY2hhdC9jb3JlLmpzXCIpO1xyXG5cclxud2luZG93LmN1cnJlbnRNYXAgPSBudWxsO1xyXG53aW5kb3cuZ2FtZVN0YXRlID0gcmVxdWlyZShcIi4vZ2FtZXN0YXRlXCIpO1xyXG4iLCIvLyBhY3RvcnNjaGVkdWxlci5qc1xyXG4vLyBEZWZpbmVzIHRoZSBBY3RvciBTY2hlZHVsZXJcclxuXHJcbnZhciBpbmhlcml0cyA9IHJlcXVpcmUoXCJpbmhlcml0c1wiKTtcclxudmFyIGV4dGVuZCA9IHJlcXVpcmUoXCJleHRlbmRcIik7XHJcblxyXG5mdW5jdGlvbiBBY3RvclNjaGVkdWxlcigpIHtcclxuXHRcclxufVxyXG5leHRlbmQoQWN0b3JTY2hlZHVsZXIucHJvdG90eXBlLCB7XHJcblx0YWN0b3JtYXAgOiB7fSxcclxuXHRfX2ZvcmNlRGF0ZTogbnVsbCxcclxuXHRcclxuXHRnZXRUaW1lc3RhbXA6IGZ1bmN0aW9uKCl7XHJcblx0XHR2YXIgZGF0ZSA9IHRoaXMuX19mb3JjZURhdGUgfHwgbmV3IERhdGUoKTtcclxuXHRcdHJldHVybiAoZGF0ZS5nZXRIb3VycygpICogMTAwKSArIChkYXRlLmdldEhvdXJzKCkpO1xyXG5cdH0sXHJcblx0XHJcblx0LyoqIENyZWF0ZXMgYSBzY2hlZHVsZSBmb3IgYW4gYWN0b3IgZ2l2ZW4gYSBsaXN0IG9mIGxvY2F0aW9ucy5cclxuXHQgKiBBIFNjaGVkdWxlIGlzIGEgbGlzdCBvZiB0aW1lcyB0byBsb2NhdGlvbnMgc2hvd2luZyB3aGVuIGEgZ2l2ZW4gYWN0b3JcclxuXHQgKiBpcyBpbiBhIG1hcCBmb3IgdGhpcyBkYXkuIFBhc3NlZCBpcyBhIGxpc3Qgb2YgbG9jYXRpb25zIHRoYXQgdGhlIGFjdG9yXHJcblx0ICogbWlnaHQgdmlzaXQgaW4gYSBub3JtYWwgZGF5LiBOb3QgcGFzc2VkIGFyZSBwbGFjZXMgdGhhdCB0aGUgYWN0b3Igd2lsbCBcclxuXHQgKiBhbHdheXMgYmUgYXQgYSBnaXZlbiB0aW1lICh1bmxlc3MgdGhlIGFjdG9yIHJhbmRvbWx5IHNob3dzIHVwIHRoZXJlIG5vcm1hbGx5KS5cclxuXHQgKiBUaGlzIGZ1bmN0aW9uIGNyZWF0ZXMgYSByYW5kb21pemVkIHNjaGVkdWxlLCB3aXRoIHJhbmRvbWl6ZWQgYW1vdW50cyBvZlxyXG5cdCAqIHRpbWUgc3BlbnQgYXQgYW55IGdpdmVuIHBsYWNlLlxyXG5cdCAqL1xyXG5cdGNyZWF0ZVNjaGVkdWxlOiBmdW5jdGlvbihtZSwgc2NoZWR1bGVEZWYpIHtcclxuXHRcdC8vR3JhYiBtZW1vaXplZCBzY2hlZHVsZVxyXG5cdFx0dmFyIHNjaGVkdWxlID0gdGhpcy5hY3Rvcm1hcFttZS5pZF07XHJcblx0XHRpZiAoIXNjaGVkdWxlKSB7IC8vSWYgbm8gc3VjaCB0aGluZywgb3IgZXhwaXJlZFxyXG5cdFx0XHRzY2hlZHVsZSA9IHt9O1xyXG5cdFx0XHRmb3IgKHZhciB0aW1lUmFuZ2UgaW4gc2NoZWR1bGVEZWYpIHtcclxuXHRcdFx0XHR2YXIgbG9jYXRpb24gPSBzY2hlZHVsZURlZlt0aW1lUmFuZ2VdO1xyXG5cdFx0XHRcdHRpbWVSYW5nZSA9IE51bWJlcih0aW1lUmFuZ2UpO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdC8vUHJvY2Vzc1xyXG5cdFx0XHRcdGlmICh0eXBlb2YgbG9jYXRpb24gPT0gXCJzdHJpbmdcIikge1xyXG5cdFx0XHRcdFx0c2NoZWR1bGVbdGltZVJhbmdlXSA9IGxvY2F0aW9uO1xyXG5cdFx0XHRcdH0gXHJcblx0XHRcdFx0ZWxzZSBpZiAoJC5pc0FycmF5KGxvY2F0aW9uKSkge1xyXG5cdFx0XHRcdFx0dmFyIGkgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBsb2NhdGlvbi5sZW5ndGgpO1xyXG5cdFx0XHRcdFx0c2NoZWR1bGVbdGltZVJhbmdlXSA9IGxvY2F0aW9uW2ldO1xyXG5cdFx0XHRcdH0gXHJcblx0XHRcdFx0ZWxzZSBpZiAobG9jYXRpb24gPT09IG51bGwpIHtcclxuXHRcdFx0XHRcdHNjaGVkdWxlW3RpbWVSYW5nZV0gPSBudWxsO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0Ly8gU3ByZWFkIHRoZSBzY2hlZHVsZSBldmVuXHJcblx0XHRcdHZhciBpZCA9IG51bGw7XHJcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgMjQwMDsgaSsrKSB7XHJcblx0XHRcdFx0aWYgKGkgJSAxMDAgPiA1OSkgeyBpICs9IDEwMCAtIChpJTEwMCk7IH0gLy9za2lwIDYwLTk5IG1pbnV0ZXNcclxuXHRcdFx0XHRpZiAoc2NoZWR1bGVbaV0gIT09IHVuZGVmaW5lZCkge1xyXG5cdFx0XHRcdFx0aWQgPSBzY2hlZHVsZVtpXTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0c2NoZWR1bGVbaV0gPSBpZDtcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0dGhpcy5hY3Rvcm1hcFttZS5pZF0gPSBzY2hlZHVsZTtcclxuXHRcdH1cclxuXHRcdHJldHVybiBzY2hlZHVsZTtcclxuXHR9LFxyXG59KTtcclxubW9kdWxlLmV4cG9ydHMgPSBuZXcgQWN0b3JTY2hlZHVsZXIoKTtcclxuIiwiLy8gZ2FyYmFnZS1jb2xsZWN0b3IuanNcclxuLy8gQWxsb2NhdGVzIGFsbCB0aGUgdmFyaW91cyBkaXNwb3NhYmxlIGl0ZW1zLCBzdWNoIGFzIGdlb21ldHJ5IGFuZCBsaXN0ZW5lcnMsIGZvclxyXG4vLyBsYXRlciBkaXNwb3NhbC5cclxuXHJcbnZhciBSRVZPS0VfVVJMUyA9ICEhVVJMLnJldm9rZU9iamVjdFVSTDtcclxuXHJcblxyXG5mdW5jdGlvbiBHYXJiYWdlQ29sbGVjdG9yKCkge1xyXG5cdHRoaXMuYmlucyA9IHt9O1xyXG5cdHRoaXMuYWxsb2NhdGVCaW4oXCJfZGVmYXVsdFwiKTtcclxufVxyXG5cclxuR2FyYmFnZUNvbGxlY3Rvci5wcm90b3R5cGUuYWxsb2NhdGVCaW4gPSBmdW5jdGlvbihiaW5JZCkge1xyXG5cdHZhciBiaW4gPSB0aGlzLmJpbnNbYmluSWRdID0gbmV3IEdhcmJhZ2VCaW4oKTtcclxufVxyXG5cclxuR2FyYmFnZUNvbGxlY3Rvci5wcm90b3R5cGUuY29sbGVjdCA9IGZ1bmN0aW9uKG9iaiwgYmluSWQpe1xyXG5cdGlmICghYmluSWQpIGJpbklkID0gXCJfZGVmYXVsdFwiO1xyXG5cdHZhciBiaW4gPSB0aGlzLmJpbnNbYmluSWRdO1xyXG5cdGlmICghYmluKSB7XHJcblx0XHRjb25zb2xlLndhcm4oXCJbR0NdIEJpbiBkb2VzIG5vdCBleGlzdCEgUHV0dGluZyBvYmplY3QgaW4gZGVmYXVsdCBiaW4uIEJpbklEOlwiLCBiaW5JRCk7XHJcblx0XHRiaW4gPSB0aGlzLmJpbnNbXCJfZGVmYXVsdFwiXTtcclxuXHR9XHJcblx0YmluLmNvbGxlY3Qob2JqKTtcclxufVxyXG5cclxuR2FyYmFnZUNvbGxlY3Rvci5wcm90b3R5cGUuY29sbGVjdFVSTCA9IGZ1bmN0aW9uKG9iaiwgYmluSWQpe1xyXG5cdGlmICghYmluSWQpIGJpbklkID0gXCJfZGVmYXVsdFwiO1xyXG5cdHZhciBiaW4gPSB0aGlzLmJpbnNbYmluSWRdO1xyXG5cdGlmICghYmluKSB7XHJcblx0XHRjb25zb2xlLndhcm4oXCJbR0NdIEJpbiBkb2VzIG5vdCBleGlzdCEgUHV0dGluZyBvYmplY3QgaW4gZGVmYXVsdCBiaW4uIEJpbklEOlwiLCBiaW5JRCk7XHJcblx0XHRiaW4gPSB0aGlzLmJpbnNbXCJfZGVmYXVsdFwiXTtcclxuXHR9XHJcblx0YmluLmNvbGxlY3RVUkwob2JqKTtcclxufVxyXG5cclxuR2FyYmFnZUNvbGxlY3Rvci5wcm90b3R5cGUuZ2V0QmluID0gZnVuY3Rpb24oYmluSWQpIHtcclxuXHRpZiAoIWJpbklkKSBiaW5JZCA9IFwiX2RlZmF1bHRcIjtcclxuXHR2YXIgYmluID0gdGhpcy5iaW5zW2JpbklkXTtcclxuXHRpZiAoIWJpbikge1xyXG5cdFx0Y29uc29sZS53YXJuKFwiW0dDXSBCaW4gZG9lcyBub3QgZXhpc3QhIEdldHRpbmcgZGVmYXVsdCBiaW4uIEJpbklEOlwiLCBiaW5JRCk7XHJcblx0XHRiaW4gPSB0aGlzLmJpbnNbXCJfZGVmYXVsdFwiXTtcclxuXHR9XHJcblx0cmV0dXJuIGJpbjtcclxufVxyXG5cclxuR2FyYmFnZUNvbGxlY3Rvci5wcm90b3R5cGUuZGlzcG9zZSA9IGZ1bmN0aW9uKGJpbklkKSB7XHJcblx0aWYgKCFiaW5JZCkgYmluSWQgPSBcIl9kZWZhdWx0XCI7XHJcblx0dmFyIGJpbiA9IHRoaXMuYmluc1tiaW5JZF07XHJcblx0aWYgKCFiaW4pIHtcclxuXHRcdGNvbnNvbGUud2FybihcIltHQ10gQmluIGRvZXMgbm90IGV4aXN0ISBDYW5ub3QgZGlzcG9zZSEgQmluSUQ6XCIsIGJpbklEKTtcclxuXHRcdHJldHVybjtcclxuXHR9XHJcblx0XHJcblx0YmluLmRpc3Bvc2UoKTtcclxuXHRcclxuXHRiaW4gPSBudWxsO1xyXG5cdGRlbGV0ZSB0aGlzLmJpbnNbYmluSWRdO1xyXG59XHJcblxyXG5cclxuXHJcbmZ1bmN0aW9uIEdhcmJhZ2VCaW4oKSB7XHJcblx0dGhpcy5kaXNwb3NhbCA9IFtdOyAvL09iamVjdHMgdGhhdCBjYW4gaGF2ZSBcImRpc3Bvc2VcIiBjYWxsZWQgb24gdGhlbVxyXG5cdHRoaXMubGlzdGVuZXJzID0gW107IC8vT2JqZWN0cyB3aXRoIGxpc3RlbmVycyBhdHRhY2hlZCB0byB0aGVtXHJcblx0dGhpcy50YWdzID0gW107IC8vU2NyaXB0IHRhZ3MgYW5kIG90aGVyIGRpc3Bvc2FibGUgdGFnc1xyXG5cdHRoaXMuc3BlY2lmaWNMaXN0ZW5lcnMgPSBbXTsgLy9TcGVjaWZpYyBsaXN0ZW5lcnNcclxuXHRcclxuXHR0aGlzLmJsb2J1cmxzID0gW107IC8vT2JqZWN0IFVSTHMgdGhhdCBjYW4gYmUgcmV2b2tlZCB3aXRoIFVSTC5yZXZva2VPYmplY3RVUkxcclxufVxyXG5HYXJiYWdlQmluLnByb3RvdHlwZSA9IHtcclxuXHRjb2xsZWN0OiBmdW5jdGlvbihvYmopIHtcclxuXHRcdGlmIChvYmouZGlzcG9zZSkge1xyXG5cdFx0XHR0aGlzLmRpc3Bvc2FsLnB1c2gob2JqKTtcclxuXHRcdH1cclxuXHRcdGlmIChvYmoucmVtb3ZlQWxsTGlzdGVuZXJzKSB7XHJcblx0XHRcdHRoaXMubGlzdGVuZXJzLnB1c2gob2JqKTtcclxuXHRcdH1cclxuXHRcdGlmICgob2JqIGluc3RhbmNlb2YgJCkgfHwgb2JqLm5vZGVOYW1lKSB7XHJcblx0XHRcdHRoaXMudGFncy5wdXNoKG9iaik7XHJcblx0XHR9XHJcblx0fSxcclxuXHRcclxuXHRjb2xsZWN0VVJMOiBmdW5jdGlvbih1cmwpIHtcclxuXHRcdGlmICghUkVWT0tFX1VSTFMpIHJldHVybjtcclxuXHRcdGlmICh0eXBlb2YgdXJsICE9IFwic3RyaW5nXCIpIHJldHVybjtcclxuXHRcdHRoaXMuYmxvYnVybHMucHVzaCh1cmwpO1xyXG5cdH0sXHJcblx0XHJcblx0Y29sbGVjdExpc3RlbmVyOiBmdW5jdGlvbihvYmosIGV2dCwgbGlzdGVuZXIpIHtcclxuXHRcdHRoaXMuc3BlY2lmaWNMaXN0ZW5lcnMucHVzaCh7XHJcblx0XHRcdG9iajogb2JqLCAgIGV2dDogZXZ0LCAgIGw6IGxpc3RlbmVyXHJcblx0XHR9KTtcclxuXHR9LFxyXG5cdFxyXG5cdGRpc3Bvc2U6IGZ1bmN0aW9uKCkge1xyXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmRpc3Bvc2FsLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdHRoaXMuZGlzcG9zYWxbaV0uZGlzcG9zZSgpO1xyXG5cdFx0XHR0aGlzLmRpc3Bvc2FsW2ldID0gbnVsbDtcclxuXHRcdH1cclxuXHRcdHRoaXMuZGlzcG9zYWwgPSBudWxsO1xyXG5cdFx0XHJcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMubGlzdGVuZXJzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdHRoaXMubGlzdGVuZXJzW2ldLnJlbW92ZUFsbExpc3RlbmVycygpO1xyXG5cdFx0XHR0aGlzLmxpc3RlbmVyc1tpXSA9IG51bGw7XHJcblx0XHR9XHJcblx0XHR0aGlzLmxpc3RlbmVycyA9IG51bGw7XHJcblx0XHRcclxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy50YWdzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdCQodGhpcy50YWdzW2ldKS5yZW1vdmVBdHRyKFwic3JjXCIpLnJlbW92ZSgpO1xyXG5cdFx0XHR0aGlzLnRhZ3NbaV0gPSBudWxsO1xyXG5cdFx0fVxyXG5cdFx0dGhpcy50YWdzID0gbnVsbDtcclxuXHRcdFxyXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLnNwZWNpZmljTGlzdGVuZXJzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdHZhciBvID0gdGhpcy5zcGVjaWZpY0xpc3RlbmVyc1tpXTtcclxuXHRcdFx0by5vYmoucmVtb3ZlTGlzdGVuZXIoby5ldnQsIG8ubCk7XHJcblx0XHRcdHRoaXMuc3BlY2lmaWNMaXN0ZW5lcnNbaV0gPSBudWxsO1xyXG5cdFx0XHRvID0gbnVsbDtcclxuXHRcdH1cclxuXHRcdHRoaXMuc3BlY2lmaWNMaXN0ZW5lcnMgPSBudWxsO1xyXG5cdFx0XHJcblx0XHRcclxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5ibG9idXJscy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRVUkwucmV2b2tlT2JqZWN0VVJMKHRoaXMuYmxvYnVybHNbaV0pO1xyXG5cdFx0XHR0aGlzLmJsb2J1cmxzW2ldID0gbnVsbDtcclxuXHRcdH1cclxuXHRcdHRoaXMuYmxvYnVybHMgPSBudWxsO1xyXG5cdH0sXHJcbn07XHJcblxyXG5cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gbmV3IEdhcmJhZ2VDb2xsZWN0b3IoKTsiLCIvLyBtYXBtYW5hZ2VyLmpzXHJcbi8vXHJcblxyXG52YXIgaW5oZXJpdHMgPSByZXF1aXJlKFwiaW5oZXJpdHNcIik7XHJcbnZhciBleHRlbmQgPSByZXF1aXJlKFwiZXh0ZW5kXCIpO1xyXG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZShcImV2ZW50c1wiKS5FdmVudEVtaXR0ZXI7XHJcbnZhciBjb250cm9sbGVyID0gcmVxdWlyZShcInRwcC1jb250cm9sbGVyXCIpO1xyXG5cclxudmFyIE1hcCA9IHJlcXVpcmUoXCIuLi9tYXAuanNcIik7XHJcbnZhciBEb3JpdG9EdW5nZW9uID0gcmVxdWlyZShcIi4uL21vZGVsL2R1bmdlb24tbWFwLmpzXCIpO1xyXG5cclxuZnVuY3Rpb24gTWFwTWFuYWdlcigpIHtcclxuXHRcclxufVxyXG5pbmhlcml0cyhNYXBNYW5hZ2VyLCBFdmVudEVtaXR0ZXIpO1xyXG5leHRlbmQoTWFwTWFuYWdlci5wcm90b3R5cGUsIHtcclxuXHRpbl90cmFuc2l0aW9uOiBudWxsLFxyXG5cdG5leHRNYXA6IG51bGwsXHJcblx0bG9hZEVycm9yOiBudWxsLFxyXG5cdFxyXG5cdHRyYW5zaXRpb25UbyA6IGZ1bmN0aW9uKG1hcGlkLCB3YXJwaW5kZXgsIGFuaW1PdmVycmlkZSkge1xyXG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xyXG5cdFx0aWYgKHRoaXMuaW5fdHJhbnNpdGlvbikge1xyXG5cdFx0XHRjb25zb2xlLmVycm9yKFwiQ2FsbGVkIE1hcCBUcmFuc2l0aW9uIHdoaWxlIGFscmVhZHkgaW4gYSBtYXAgdHJhbnNpdGlvbiFcIiwgbWFwaWQsIHdhcnBpbmRleCk7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHRcdHRoaXMuaW5fdHJhbnNpdGlvbiA9IHRydWU7XHJcblxyXG5cdFx0Y29udHJvbGxlci5wdXNoSW5wdXRDb250ZXh0KFwiX21hcF93YXJwaW5nX1wiKTtcclxuXHRcdGlmIChtYXBpZCAhPT0gdW5kZWZpbmVkIHx8IHdhcnBpbmRleCAhPT0gdW5kZWZpbmVkKSB7XHJcblx0XHRcdGdhbWVTdGF0ZS5tYXBUcmFuc2l0aW9uLm5leHRNYXAgPSBtYXBpZCA9IG1hcGlkIHx8IGN1cnJlbnRNYXAuaWQ7XHJcblx0XHRcdGdhbWVTdGF0ZS5tYXBUcmFuc2l0aW9uLndhcnAgPSB3YXJwaW5kZXggfHwgMDtcclxuXHRcdFx0Z2FtZVN0YXRlLm1hcFRyYW5zaXRpb24uYW5pbU92ZXJyaWRlID0gYW5pbU92ZXJyaWRlO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0bWFwaWQgPSBnYW1lU3RhdGUubWFwVHJhbnNpdGlvbi5uZXh0TWFwO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHRjb25zb2xlLndhcm4oXCJCZWdpbm5pbmcgVHJhbnNpdGlvbiB0b1wiLCBtYXBpZCk7XHJcblx0XHR2YXIgbG9hZENhbGwgPSBfX2JlZ2luTG9hZDtcclxuXHRcdHZhciBmYWRlT3V0RG9uZSA9IGZhbHNlO1xyXG5cdFx0dmFyIGZpbmlzaGVkRG93bmxvYWQgPSBmYWxzZTtcclxuXHRcdFxyXG5cdFx0aWYgKGN1cnJlbnRNYXAgJiYgY3VycmVudE1hcC5pZCA9PSBtYXBpZCkge1xyXG5cdFx0XHQvLyBObyBuZWVkIHRvIGRvd25sb2FkIHRoZSBuZXh0IG1hcFxyXG5cdFx0XHRsb2FkQ2FsbCA9IF9faW5NYXBXYXJwO1xyXG5cdFx0XHRmaW5pc2hlZERvd25sb2FkID0gdHJ1ZTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdHZhciBubWFwID0gdGhpcy5uZXh0TWFwID0gbmV3IE1hcChtYXBpZCk7XHJcblx0XHRcdG5tYXAub24oXCJsb2FkLWVycm9yXCIsIF9fbG9hZEVycm9yKTtcclxuXHRcdFx0bm1hcC5vbihcInByb2dyZXNzXCIsIF9fcHJvZ3Jlc3NVcGRhdGUpO1xyXG5cdFx0XHRubWFwLm9uY2UoXCJkb3dubG9hZGVkXCIsIF9fZmluaXNoZWREb3dubG9hZCk7XHJcblx0XHRcdG5tYXAub25jZShcIm1hcC1zdGFydGVkXCIsIF9fbWFwU3RhcnQpO1xyXG5cdFx0XHRcclxuXHRcdFx0bm1hcC5kb3dubG9hZCgpO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHRVSS5mYWRlT3V0KGZ1bmN0aW9uKCl7XHJcblx0XHRcdFVJLnNob3dMb2FkaW5nQWpheCgpO1xyXG5cdFx0XHRmYWRlT3V0RG9uZSA9IHRydWU7XHJcblx0XHRcdGlmIChmaW5pc2hlZERvd25sb2FkICYmIGZhZGVPdXREb25lKSB7XHJcblx0XHRcdFx0bG9hZENhbGwoKTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblx0XHRcclxuXHRcdHJldHVybjtcclxuXHRcdC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cdFx0XHJcblx0XHRmdW5jdGlvbiBfX2luTWFwV2FycCgpIHtcclxuXHRcdFx0Y29uc29sZS5sb2coXCJJbi1tYXAgd2FycCFcIik7XHJcblx0XHRcdHZhciB3YXJwID0gZ2FtZVN0YXRlLm1hcFRyYW5zaXRpb24ud2FycCB8fCAwO1xyXG5cdFx0XHR3YXJwID0gY3VycmVudE1hcC5tZXRhZGF0YS53YXJwc1t3YXJwXTtcclxuXHRcdFx0aWYgKCF3YXJwKSB7XHJcblx0XHRcdFx0Y29uc29sZS53YXJuKFwiUmVxdWVzdGVkIHdhcnAgbG9jYXRpb24gZG9lc24ndCBleGlzdDpcIiwgd2luZG93LnRyYW5zaXRpb25fd2FycHRvKTtcclxuXHRcdFx0XHR3YXJwID0gdGhpcy5tZXRhZGF0YS53YXJwc1swXTtcclxuXHRcdFx0fVxyXG5cdFx0XHRpZiAoIXdhcnApIHRocm93IG5ldyBFcnJvcihcIlRoaXMgbWFwIGhhcyBubyB3YXJwcyEhXCIpO1xyXG5cdFx0XHRcclxuXHRcdFx0cGxheWVyLndhcnBUbyh3YXJwKTtcclxuXHRcdFx0Y3VycmVudE1hcC5ldmVudE1hcC5wdXQocGxheWVyLmxvY2F0aW9uLngsIHBsYXllci5sb2NhdGlvbi55LCBwbGF5ZXIpO1xyXG5cdFx0XHRcclxuXHRcdFx0X19tYXBTdGFydCgpO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHQvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHRcdFxyXG5cdFx0ZnVuY3Rpb24gX19sb2FkRXJyb3IoZSkge1xyXG5cdFx0XHRzZWxmLm5leHRNYXAucmVtb3ZlTGlzdGVuZXIoXCJsb2FkLWVycm9yXCIsIF9fbG9hZEVycm9yKTtcclxuXHRcdFx0c2VsZi5uZXh0TWFwLnJlbW92ZUxpc3RlbmVyKFwicHJvZ3Jlc3NcIiwgX19wcm9ncmVzc1VwZGF0ZSk7XHJcblx0XHRcdHNlbGYubmV4dE1hcC5yZW1vdmVMaXN0ZW5lcihcImRvd25sb2FkZWRcIiwgX19maW5pc2hlZERvd25sb2FkKTtcclxuXHRcdFx0c2VsZi5uZXh0TWFwLnJlbW92ZUxpc3RlbmVyKFwibWFwLXN0YXJ0ZWRcIiwgX19tYXBTdGFydCk7XHJcblx0XHRcdFxyXG5cdFx0XHRzZWxmLm5leHRNYXAgPSBuZXcgRG9yaXRvRHVuZ2VvbigpO1xyXG5cdFx0XHRzZWxmLm5leHRNYXAub24oXCJsb2FkLWVycm9yXCIsIF9fbG9hZEVycm9yKTtcclxuXHRcdFx0c2VsZi5uZXh0TWFwLm9uY2UoXCJtYXAtc3RhcnRlZFwiLCBfX21hcFN0YXJ0KTtcclxuXHRcdFx0XHJcblx0XHRcdGZpbmlzaGVkRG93bmxvYWQgPSB0cnVlO1xyXG5cdFx0XHRpZiAoZmluaXNoZWREb3dubG9hZCAmJiBmYWRlT3V0RG9uZSkge1xyXG5cdFx0XHRcdF9fYmVnaW5Mb2FkKCk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdGZ1bmN0aW9uIF9fcHJvZ3Jlc3NVcGRhdGUobG9hZGVkLCB0b3RhbCkge1xyXG5cdFx0XHRVSS51cGRhdGVMb2FkaW5nUHJvZ3Jlc3MobG9hZGVkLCB0b3RhbCk7XHJcblx0XHR9XHJcblx0XHRmdW5jdGlvbiBfX2ZpbmlzaGVkRG93bmxvYWQoKSB7XHJcblx0XHRcdGZpbmlzaGVkRG93bmxvYWQgPSB0cnVlO1xyXG5cdFx0XHRpZiAoZmluaXNoZWREb3dubG9hZCAmJiBmYWRlT3V0RG9uZSkge1xyXG5cdFx0XHRcdF9fYmVnaW5Mb2FkKCk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdGZ1bmN0aW9uIF9fYmVnaW5Mb2FkKCkge1xyXG5cdFx0XHRpZiAoY3VycmVudE1hcCkgY3VycmVudE1hcC5kaXNwb3NlKCk7XHJcblx0XHRcdGNvbnNvbGUubG9nKFwiPT09PT09PT09PT09QkVHSU4gTE9BRD09PT09PT09PT09PT09XCIpO1xyXG5cdFx0XHRcclxuXHRcdFx0c2VsZi5uZXh0TWFwLnJlbW92ZUxpc3RlbmVyKFwicHJvZ3Jlc3NcIiwgX19wcm9ncmVzc1VwZGF0ZSk7XHJcblx0XHRcdHNlbGYubmV4dE1hcC5yZW1vdmVMaXN0ZW5lcihcImRvd25sb2FkZWRcIiwgX19maW5pc2hlZERvd25sb2FkKTtcclxuXHRcdFx0XHJcblx0XHRcdGN1cnJlbnRNYXAgPSBzZWxmLm5leHRNYXA7IHNlbGYubmV4dE1hcCA9IG51bGw7XHJcblx0XHRcdFxyXG5cdFx0XHRpZiAoREVCVUcgJiYgREVCVUcucnVuT25NYXBSZWFkeSlcclxuXHRcdFx0XHRjdXJyZW50TWFwLm9uY2UoXCJtYXAtcmVhZHlcIiwgREVCVUcucnVuT25NYXBSZWFkeSk7XHJcblx0XHRcdFxyXG5cdFx0XHRjdXJyZW50TWFwLmxvYWQoKTtcclxuXHRcdH1cclxuXHRcdGZ1bmN0aW9uIF9fbWFwU3RhcnQoKSB7XHJcblx0XHRcdGN1cnJlbnRNYXAucmVtb3ZlTGlzdGVuZXIoXCJsb2FkLWVycm9yXCIsIF9fbG9hZEVycm9yKTtcclxuXHRcdFx0XHJcblx0XHRcdFVJLmhpZGVMb2FkaW5nQWpheCgpO1xyXG5cdFx0XHRVSS5mYWRlSW4oKTtcclxuXHRcdFx0Y29udHJvbGxlci5yZW1vdmVJbnB1dENvbnRleHQoXCJfbWFwX3dhcnBpbmdfXCIpO1xyXG5cdFx0XHRzZWxmLmluX3RyYW5zaXRpb24gPSBmYWxzZTtcclxuXHRcdH1cclxuXHR9LFxyXG59KTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gbmV3IE1hcE1hbmFnZXIoKTsiLCIvLyBzb3VuZG1hbmFnZXIuanNcclxuLy8gRGVmaW5lcyB0aGUgU291bmQgTWFuYWdlclxyXG5cclxudmFyIGluaGVyaXRzID0gcmVxdWlyZShcImluaGVyaXRzXCIpO1xyXG52YXIgZXh0ZW5kID0gcmVxdWlyZShcImV4dGVuZFwiKTtcclxudmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoXCJldmVudHNcIikuRXZlbnRFbWl0dGVyO1xyXG5cclxudmFyIGF1ZGlvQ29udGV4dDtcclxuXHJcbnZhciBNQVhfTVVTSUMgPSA4OyAvL01heCBudW1iZXIgb2YgbXVzaWMgdHJhY2tzIGNhY2hlZCBpbiBtZW1vcnlcclxudmFyIE1BWF9TT1VORFMgPSAxNjsgLy9NYXggbnVtYmVyIG9mIHNvdW5kcyBjYWNoZWQgaW4gbWVtb3J5XHJcblxyXG4vKipcclxuICovXHJcbmZ1bmN0aW9uIFNvdW5kTWFuYWdlcigpIHtcclxuXHR0aGlzLnRlc3RTdXBwb3J0KCk7XHJcblx0XHJcblx0dGhpcy5wcmVsb2FkU291bmQoXCJ3YWxrX2J1bXBcIik7XHJcblx0dGhpcy5wcmVsb2FkU291bmQoXCJ3YWxrX2p1bXBcIik7XHJcblx0dGhpcy5wcmVsb2FkU291bmQoXCJ3YWxrX2p1bXBfbGFuZFwiKTtcclxuXHR0aGlzLnByZWxvYWRTb3VuZChcImV4aXRfd2Fsa1wiKTtcclxuXHRcclxuXHR0aGlzLnJlZ2lzdGVyUHJlbG9hZGVkTXVzaWMoXCJtX3Rvcm53b3JsZFwiLCB7XHJcblx0XHR0YWc6IERPUklUT19NVVNJQyxcclxuXHRcdGxvb3BTdGFydDogMTMuMzA0LFxyXG5cdFx0bG9vcEVuZDogMjIuODQyLFxyXG5cdH0pO1xyXG59XHJcbmluaGVyaXRzKFNvdW5kTWFuYWdlciwgRXZlbnRFbWl0dGVyKTtcclxuZXh0ZW5kKFNvdW5kTWFuYWdlci5wcm90b3R5cGUsIHtcclxuXHRzb3VuZHMgOiB7fSxcclxuXHRtdXNpYzoge30sXHJcblx0ZXh0IDogbnVsbCxcclxuXHRjcmVhdGVBdWRpbzogbnVsbCxcclxuXHRcclxuXHRfX211dGVkX211c2ljOiBmYWxzZSxcclxuXHRfX211dGVkX3NvdW5kOiBmYWxzZSxcclxuXHRfX3ZvbF9tdXNpYzogMC41LFxyXG5cdF9fdm9sX3NvdW5kOiAwLjUsXHJcblx0XHJcblx0dGVzdFN1cHBvcnQgOiBmdW5jdGlvbigpIHtcclxuXHRcdHZhciB0ZXN0c291bmQgPSBuZXcgQXVkaW8oKTtcclxuXHRcdHZhciBvZ2cgPSB0ZXN0c291bmQuY2FuUGxheVR5cGUoXCJhdWRpby9vZ2c7IGNvZGVjcz12b3JiaXNcIik7XHJcblx0XHRpZiAob2dnKSB0aGlzLmV4dCA9IFwiLm9nZ1wiO1xyXG5cdFx0ZWxzZSB0aGlzLmV4dCA9IFwiLm1wM1wiO1xyXG5cdFx0XHJcblx0XHR0cnkge1xyXG5cdFx0XHRhdWRpb0NvbnRleHQgPSBuZXcgKHdpbmRvdy5BdWRpb0NvbnRleHQgfHwgd2luZG93LndlYmtpdEF1ZGlvQ29udGV4dCkoKTtcclxuXHRcdFx0aWYgKGF1ZGlvQ29udGV4dCkge1xyXG5cdFx0XHRcdHRoaXMuY3JlYXRlQXVkaW8gPSBjcmVhdGVBdWRpb19XZWJBUEk7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0dGhpcy5jcmVhdGVBdWRpbyA9IGNyZWF0ZUF1ZGlvX1RhZztcclxuXHRcdFx0fVxyXG5cdFx0XHR0aGlzLl9fYXVkaW9Db250ZXh0ID0gYXVkaW9Db250ZXh0O1xyXG5cdFx0fSBjYXRjaCAoZSkge1xyXG5cdFx0XHR0aGlzLmNyZWF0ZUF1ZGlvID0gY3JlYXRlQXVkaW9fVGFnO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0fSxcclxuXHRcclxuXHQvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLyBMb2FkaW5nIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cdFxyXG5cdC8qKiBMb2FkcyBzb3VuZCBmcm9tIHRoZSBzZXJ2ZXIsIHVzZWQgYXMgcGFydCBvZiB0aGUgc3RhcnR1cCBwcm9jZXNzLiAqL1xyXG5cdHByZWxvYWRTb3VuZCA6IGZ1bmN0aW9uKGlkKSB7XHJcblx0XHRpZiAoIXRoaXMuc291bmRzW2lkXSkge1xyXG5cdFx0XHR0aGlzLnNvdW5kc1tpZF0gPSB0aGlzLmNyZWF0ZUF1ZGlvKGlkLCB7XHJcblx0XHRcdFx0dXJsIDogQkFTRVVSTCtcIi9zbmQvXCIgKyBpZCArIHRoaXMuZXh0LFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0dGhpcy5zb3VuZHNbaWRdLm11c3RLZWVwID0gdHJ1ZTtcclxuXHRcdFx0dGhpcy5lbWl0KFwibG9hZF9zb3VuZFwiLCBpZCk7XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gdGhpcy5zb3VuZHNbaWRdO1xyXG5cdH0sXHJcblx0XHJcblx0LyoqIExvYWRzIG11c2ljIGZyb20gdGhlIHNlcnZlciwgdXNlZCBhcyBwYXJ0IG9mIHRoZSBzdGFydHVwIHByb2Nlc3MuICovXHJcblx0cmVnaXN0ZXJQcmVsb2FkZWRNdXNpYzogZnVuY3Rpb24oaWQsIGluZm8pIHtcclxuXHRcdGlmICghdGhpcy5tdXNpY1tpZF0pIHtcclxuXHRcdFx0dGhpcy5tdXNpY1tpZF0gPSBjcmVhdGVBdWRpb19UYWcoaWQsIGluZm8pOyAvL2ZvcmNlIHVzaW5nIHRoaXMga2luZFxyXG5cdFx0XHR0aGlzLm11c2ljW2lkXS5tdXN0S2VlcCA9IHRydWU7XHJcblx0XHRcdHRoaXMuZW1pdChcImxvYWRfbXVzaWNcIiwgaWQpO1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIHRoaXMubXVzaWNbaWRdO1xyXG5cdH0sXHJcblx0XHJcblx0LyoqIExvYWRzIHNvdW5kIGZyb20gZGF0YSBleHRyYWN0ZWQgZnJvbSB0aGUgbWFwIHppcCBmaWxlLiAqL1xyXG5cdGxvYWRTb3VuZDogZnVuY3Rpb24oaWQsIGluZm8pIHtcclxuXHRcdGlmICghdGhpcy5zb3VuZHNbaWRdKSB7XHJcblx0XHRcdHRoaXMuc291bmRzW2lkXSA9IHRoaXMuY3JlYXRlQXVkaW8oaWQsIGluZm8pO1xyXG5cdFx0XHR0aGlzLmVtaXQoXCJsb2FkX3NvdW5kXCIsIGlkKTtcclxuXHRcdH1cclxuXHRcdHJldHVybiB0aGlzLnNvdW5kc1tpZF07XHJcblx0fSxcclxuXHRcclxuXHQvKiogTG9hZHMgbXVzaWMgZnJvbSBkYXRhIGV4dHJhY3RlZCBmcm9tIHRoZSBtYXAgemlwIGZpbGUuICovXHJcblx0bG9hZE11c2ljOiBmdW5jdGlvbihpZCwgaW5mbykge1xyXG5cdFx0aWYgKCF0aGlzLm11c2ljW2lkXSkge1xyXG5cdFx0XHR0aGlzLl9lbnN1cmVSb29tRm9yTXVzaWMoKTtcclxuXHRcdFx0dGhpcy5tdXNpY1tpZF0gPSB0aGlzLmNyZWF0ZUF1ZGlvKGlkLCBpbmZvKTtcclxuXHRcdFx0dGhpcy5lbWl0KFwibG9hZF9tdXNpY1wiLCBpZCk7XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gdGhpcy5tdXNpY1tpZF07XHJcblx0fSxcclxuXHRcclxuXHRcclxuXHRpc011c2ljTG9hZGVkOiBmdW5jdGlvbihpZCkge1xyXG5cdFx0cmV0dXJuICEhdGhpcy5tdXNpY1tpZF07XHJcblx0fSxcclxuXHRpc1NvdW5kTG9hZGVkOiBmdW5jdGlvbihpZCkge1xyXG5cdFx0cmV0dXJuICEhdGhpcy5zb3VuZHNbaWRdO1xyXG5cdH0sXHJcblx0XHJcblx0X2Vuc3VyZVJvb21Gb3JNdXNpYzogZnVuY3Rpb24oKSB7XHJcblx0XHRpZiAoT2JqZWN0LmtleXModGhpcy5tdXNpYykubGVuZ3RoKzEgPD0gTUFYX01VU0lDKSByZXR1cm47XHJcblx0XHRcclxuXHRcdHZhciBvbGRlc3REYXRlID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XHJcblx0XHR2YXIgb2xkZXN0SWQgPSBudWxsO1xyXG5cdFx0Zm9yICh2YXIgaWQgaW4gdGhpcy5tdXNpYykge1xyXG5cdFx0XHR2YXIgbSA9IHRoaXMubXVzaWNbaWRdXHJcblx0XHRcdGlmIChtLm11c3RLZWVwKSBjb250aW51ZTtcclxuXHRcdFx0aWYgKG0ubG9hZERhdGUgPCBvbGRlc3REYXRlKSB7XHJcblx0XHRcdFx0b2xkZXN0RGF0ZSA9IG0ubG9hZERhdGU7XHJcblx0XHRcdFx0b2xkZXN0SWQgPSBpZDtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHR0aGlzLm11c2ljW29sZGVzdElkXS51bmxvYWQoKTtcclxuXHRcdGRlbGV0ZSB0aGlzLm11c2ljW29sZGVzdElkXTtcclxuXHRcdHRoaXMuZW1pdChcInVubG9hZGVkLW11c2ljXCIsIG9sZGVzdElkKTtcclxuXHR9LFxyXG5cdFxyXG5cdC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8gUGxheWluZyAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblx0XHJcblx0cGxheVNvdW5kIDogZnVuY3Rpb24oaWQpIHtcclxuXHRcdGlmICh0aGlzLm11dGVkX3NvdW5kKSByZXR1cm47XHJcblx0XHRpZiAoIXRoaXMuc291bmRzW2lkXSkge1xyXG5cdFx0XHRjb25zb2xlLmVycm9yKFwiU291bmQgaXMgbm90IGxvYWRlZCFcIiwgaWQpO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblx0XHR0aGlzLnNvdW5kc1tpZF0ucGxheSgpO1xyXG5cdH0sXHJcblx0XHJcblx0cGxheU11c2ljOiBmdW5jdGlvbihpZCl7XHJcblx0XHR2YXIgbSA9IHRoaXMubXVzaWNbaWRdO1xyXG5cdFx0aWYgKCFtKSByZXR1cm47XHJcblx0XHRpZiAobS5wbGF5aW5nKSByZXR1cm47IC8vYWxyZWFkeSBwbGF5aW5nXHJcblx0XHRcclxuXHRcdHZhciBzdGFydERlbGF5ID0gMDtcclxuXHRcdGZvciAodmFyIGlkIGluIHRoaXMubXVzaWMpIHtcclxuXHRcdFx0aWYgKHRoaXMubXVzaWNbaWRdLnBsYXlpbmcpIHtcclxuXHRcdFx0XHR0aGlzLnN0b3BNdXNpYyhpZCk7XHJcblx0XHRcdFx0c3RhcnREZWxheSA9IDEwMDA7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0c2V0VGltZW91dChmdW5jdGlvbigpe1xyXG5cdFx0XHRtLnBsYXlpbmcgPSB0cnVlO1xyXG5cdFx0XHRpZiAodGhpcy5tdXRlZF9tdXNpYykgcmV0dXJuO1xyXG5cdFx0XHRtLnBsYXlpbmdfcmVhbCA9IHRydWU7XHJcblx0XHRcdG0ucGxheSgpO1xyXG5cdFx0fSwgc3RhcnREZWxheSk7XHJcblx0fSxcclxuXHRcclxuXHRwYXVzZU11c2ljOiBmdW5jdGlvbihpZCl7XHJcblx0XHR2YXIgbSA9IHRoaXMubXVzaWNbaWRdO1xyXG5cdFx0aWYgKCFtKSByZXR1cm47XHJcblx0XHRtLnBsYXlpbmcgPSBtLnBsYXlpbmdfcmVhbCA9IGZhbHNlO1xyXG5cdFx0bS5wYXVzZSgpO1xyXG5cdH0sXHJcblx0XHJcblx0dG9nZ2xlTXVzaWM6IGZ1bmN0aW9uKGlkKSB7XHJcblx0XHR2YXIgbSA9IHRoaXMubXVzaWNbaWRdO1xyXG5cdFx0aWYgKCFtKSByZXR1cm47XHJcblx0XHRpZiAobS5wbGF5aW5nKSB7XHJcblx0XHRcdG0ucGxheWluZyA9IG0ucGxheWluZ19yZWFsID0gZmFsc2U7XHJcblx0XHRcdG0ucGF1c2UoKTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdG0ucGxheWluZyA9IHRydWU7XHJcblx0XHRcdGlmICh0aGlzLm11dGVkX211c2ljKSByZXR1cm47XHJcblx0XHRcdG0ucGxheWluZ19yZWFsID0gdHJ1ZTtcclxuXHRcdFx0bS5wbGF5KCk7XHJcblx0XHR9XHJcblx0fSxcclxuXHRcclxuXHRzdG9wTXVzaWM6IGZ1bmN0aW9uKGlkKXtcclxuXHRcdHZhciBtID0gdGhpcy5tdXNpY1tpZF07XHJcblx0XHRpZiAoIW0pIHJldHVybjtcclxuXHRcdC8vIG0ucGxheWluZyA9IG0ucGxheWluZ19yZWFsID0gZmFsc2U7XHJcblx0XHQvL20ucGF1c2UoKTtcclxuXHRcdC8vbS5jdXJyZW50VGltZSA9IDA7XHJcblx0XHRtLmZhZGVvdXQgPSB0cnVlO1xyXG5cdH0sXHJcblx0XHJcblx0XHJcblx0X3RpY2s6IGZ1bmN0aW9uKGRlbHRhKSB7XHJcblx0XHRmb3IgKHZhciBpZCBpbiB0aGlzLm11c2ljKSB7XHJcblx0XHRcdHRoaXMubXVzaWNbaWRdLmxvb3BUaWNrKGRlbHRhKTtcclxuXHRcdH1cclxuXHR9LFxyXG59KTtcclxuXHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKFNvdW5kTWFuYWdlci5wcm90b3R5cGUsIHtcclxuXHR2b2xfbXVzaWM6IHtcclxuXHRcdGVudW1lcmFibGU6IHRydWUsXHJcblx0XHRnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5fX3ZvbF9tdXNpYzsgfSxcclxuXHRcdHNldDogZnVuY3Rpb24odm9sKSB7XHJcblx0XHRcdHRoaXMuX192b2xfbXVzaWMgPSBNYXRoLmNsYW1wKHZvbCk7XHJcblx0XHRcdGZvciAodmFyIGlkIGluIHRoaXMubXVzaWMpIHtcclxuXHRcdFx0XHR0aGlzLm11c2ljW2lkXS5zZXRWb2x1bWUodGhpcy5fX3ZvbF9tdXNpYyk7XHJcblx0XHRcdH1cclxuXHRcdH0sXHJcblx0fSxcclxuXHR2b2xfc291bmQ6IHtcclxuXHRcdGVudW1lcmFibGU6IHRydWUsXHJcblx0XHRnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5fX3ZvbF9zb3VuZDsgfSxcclxuXHRcdHNldDogZnVuY3Rpb24odm9sKSB7XHJcblx0XHRcdHRoaXMuX192b2xfc291bmQgPSBNYXRoLmNsYW1wKHZvbCk7XHJcblx0XHRcdGZvciAodmFyIGlkIGluIHRoaXMuc291bmRzKSB7XHJcblx0XHRcdFx0dGhpcy5zb3VuZHNbaWRdLnNldFZvbHVtZSh0aGlzLl9fdm9sX3NvdW5kKTtcclxuXHRcdFx0fVxyXG5cdFx0fSxcclxuXHR9LFxyXG5cdG11dGVkX211c2ljOiB7XHJcblx0XHRlbnVtZXJhYmxlOiB0cnVlLFxyXG5cdFx0Z2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuX19tdXRlZF9tdXNpYzsgfSxcclxuXHRcdHNldDogZnVuY3Rpb24odmFsKSB7XHJcblx0XHRcdHRoaXMuX19tdXRlZF9tdXNpYyA9IHZhbDtcclxuXHRcdFx0Zm9yICh2YXIgaWQgaW4gdGhpcy5tdXNpYykge1xyXG5cdFx0XHRcdHRoaXMubXVzaWNbaWRdLnNldE11dGVkKHZhbCk7XHJcblx0XHRcdH1cclxuXHRcdH0sXHJcblx0fSxcclxuXHRtdXRlZF9zb3VuZDoge1xyXG5cdFx0ZW51bWVyYWJsZTogdHJ1ZSxcclxuXHRcdGdldDogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLl9fbXV0ZWRfc291bmQ7IH0sXHJcblx0XHRzZXQ6IGZ1bmN0aW9uKHZhbCkge1xyXG5cdFx0XHR0aGlzLl9fbXV0ZWRfc291bmQgPSB2YWw7XHJcblx0XHRcdGZvciAodmFyIGlkIGluIHRoaXMuc291bmRzKSB7XHJcblx0XHRcdFx0dGhpcy5zb3VuZHNbaWRdLnNldE11dGVkKHZhbCk7XHJcblx0XHRcdH1cclxuXHRcdH0sXHJcblx0fSxcclxuXHRcclxuXHRfX3ZvbF9tdXNpYzogeyBlbnVtZXJhYmxlOiBmYWxzZSwgd3JpdGFibGU6IHRydWUsIH0sXHJcblx0X192b2xfc291bmQ6IHsgZW51bWVyYWJsZTogZmFsc2UsIHdyaXRhYmxlOiB0cnVlLCB9LFxyXG5cdF9fbXV0ZWRfbXVzaWM6IHsgZW51bWVyYWJsZTogZmFsc2UsIHdyaXRhYmxlOiB0cnVlLCB9LFxyXG5cdF9fbXV0ZWRfc291bmQ6IHsgZW51bWVyYWJsZTogZmFsc2UsIHdyaXRhYmxlOiB0cnVlLCB9LFxyXG59KTtcclxuXHJcblxyXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLyBTb3VuZCBPYmplY3RzIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHJcbmZ1bmN0aW9uIFNvdW5kT2JqZWN0KG9wdHMpIHtcclxuXHRleHRlbmQodGhpcywgb3B0cyk7XHJcblx0dGhpcy5sb2FkRGF0ZSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xyXG59XHJcbmV4dGVuZChTb3VuZE9iamVjdC5wcm90b3R5cGUsIHtcclxuXHRwbGF5aW5nOiBmYWxzZSwgLy9zb3VuZCBpcyBwbGF5aW5nLCB0aGVvcmV0aWNhbGx5IChtaWdodCBiZSBtdXRlZClcclxuXHRwbGF5aW5nX3JlYWw6IGZhbHNlLCAvL3NvdW5kIGlzIGFjdHVhbGx5IHBsYXlpbmcgYW5kIG5vdCBtdXRlZFxyXG5cdFxyXG5cdGxvb3BTdGFydDogMCxcclxuXHRsb29wRW5kOiAwLFxyXG5cdFxyXG5cdGxvYWREYXRlOiAwLCAvL21pbGlzZWNvbmQgZGF0ZXN0YW1wIG9mIHdoZW4gdGhpcyB3YXMgbG9hZGVkLCBmb3IgY2FjaGUgY29udHJvbFxyXG5cdG11c3RLZWVwOiBmYWxzZSwgLy9pZiB3ZSBzaG91bGQgc2tpcCB0aGlzIG9iamVjdCB3aGVuIGRldGVybWluaW5nIHNvdW5kcyB0byB1bmxvYWRcclxuXHRcclxuXHRmYWRlb3V0OiBmYWxzZSxcclxuXHRcclxuXHRwbGF5OiBmdW5jdGlvbigpe30sXHJcblx0cGF1c2U6IGZ1bmN0aW9uKCl7fSxcclxuXHRzZXRWb2x1bWU6IGZ1bmN0aW9uKHZvbCl7fSxcclxuXHRzZXRNdXRlZDogZnVuY3Rpb24obXV0ZWQpe30sXHJcblx0bG9vcFRpY2s6IGZ1bmN0aW9uKGRlbHRhKXt9LFxyXG5cdFxyXG5cdHVubG9hZDogZnVuY3Rpb24oKXt9LFxyXG59KTtcclxuXHJcblxyXG5cclxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLyBBdWRpbyBUYWcgSW1wbGVtZW50YXRpb24gLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cclxuZnVuY3Rpb24gY3JlYXRlQXVkaW9fVGFnKGlkLCBpbmZvKSB7XHJcblx0dmFyIHNuZDtcclxuXHRpZiAoaW5mby50YWcpIHtcclxuXHRcdHNuZCA9IGluZm8udGFnO1xyXG5cdH0gZWxzZSBpZiAoaW5mby51cmwpIHtcclxuXHRcdHNuZCA9IG5ldyBBdWRpbygpO1xyXG5cdFx0c25kLmF1dG9wbGF5ID0gZmFsc2U7XHJcblx0XHRzbmQuYXV0b2J1ZmZlciA9IHRydWU7XHJcblx0XHRzbmQucHJlbG9hZCA9IFwiYXV0b1wiO1xyXG5cdFx0c25kLnNyYyA9IGluZm8udXJsOyBcclxuXHRcdCQoXCJib2R5XCIpLmFwcGVuZCggJChzbmQudGFnKS5jc3Moe2Rpc3BsYXk6XCJub25lXCJ9KSApO1xyXG5cdH0gZWxzZSB7XHJcblx0XHR0aHJvdyBuZXcgRXJyb3IoXCJDYWxsZWQgY3JlYXRlQXVkaW8gd2l0aG91dCBhbnkgaW5mbyFcIik7XHJcblx0fVxyXG5cdFxyXG5cdHZhciBzb2JqID0gbmV3IFNvdW5kT2JqZWN0KHtcclxuXHRcdF9fdGFnOiBzbmQsXHJcblx0XHRfX2Jsb2J1cmw6IGluZm8udXJsLFxyXG5cdFx0XHJcblx0XHRsb29wU3RhcnQ6IGluZm8ubG9vcFN0YXJ0IHx8IDAsXHJcblx0XHRsb29wRW5kOiBpbmZvLmxvb3BFbmQgfHwgMCxcclxuXHRcdFxyXG5cdFx0cGxheTogZnVuY3Rpb24oKSB7XHJcblx0XHRcdHRoaXMuX190YWcucGxheSgpO1xyXG5cdFx0fSxcclxuXHRcdFxyXG5cdFx0cGF1c2U6IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHR0aGlzLl9fdGFnLnBhdXNlKCk7XHJcblx0XHR9LFxyXG5cdFx0XHJcblx0XHRzZXRWb2x1bWU6IGZ1bmN0aW9uKHZvbCkge1xyXG5cdFx0XHR0aGlzLl9fdGFnLnZvbHVtZSA9IHZvbDtcclxuXHRcdH0sXHJcblx0XHRcclxuXHRcdHNldE11dGVkOiBmdW5jdGlvbihtdXRlZCkge1xyXG5cdFx0XHRpZiAobXV0ZWQpIHtcclxuXHRcdFx0XHR0aGlzLnBsYXlpbmdfcmVhbCA9IGZhbHNlO1xyXG5cdFx0XHRcdHRoaXMuX190YWcucGF1c2UoKTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRpZiAodGhpcy5wbGF5aW5nKSB7XHJcblx0XHRcdFx0XHR0aGlzLnBsYXlpbmdfcmVhbCA9IHRydWU7XHJcblx0XHRcdFx0XHR0aGlzLl9fdGFnLnBsYXkoKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH0sXHJcblx0XHRcclxuXHRcdGxvb3BUaWNrOiBmdW5jdGlvbihkZWx0YSkge1xyXG5cdFx0XHRpZiAoIXRoaXMubG9vcEVuZCB8fCAhdGhpcy5wbGF5aW5nX3JlYWwpIHJldHVybjtcclxuXHRcdFx0XHJcblx0XHRcdC8vVE9ETyBzdXBwb3J0IHRoaXMuZmFkZW91dFxyXG5cdFx0XHRpZiAodGhpcy5fX3RhZy5jdXJyZW50VGltZSA+PSB0aGlzLmxvb3BFbmQpIHtcclxuXHRcdFx0XHR0aGlzLl9fdGFnLmN1cnJlbnRUaW1lIC09ICh0aGlzLmxvb3BFbmQgLSB0aGlzLmxvb3BTdGFydCk7XHJcblx0XHRcdH1cclxuXHRcdH0sXHJcblx0XHR1bmxvYWQ6IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRpZiAodGhpcy5fX2Jsb2J1cmwpXHJcblx0XHRcdFx0VVJMLnJldm9rZU9iamVjdFVSTCh0aGlzLl9fYmxvYnVybCk7XHJcblx0XHRcdFxyXG5cdFx0XHQkKHRoaXMudGFnKS5yZW1vdmUoKTtcclxuXHRcdFx0ZGVsZXRlIHRoaXMudGFnO1xyXG5cdFx0fSxcclxuXHR9KTtcclxuXHRzbmQub24oXCJlbmRlZFwiLCBmdW5jdGlvbigpe1xyXG5cdFx0c29iai5wbGF5aW5nID0gZmFsc2U7XHJcblx0XHRzb2JqLnBsYXlpbmdfcmVhbCA9IGZhbHNlO1xyXG5cdFx0c25kLmN1cnJlbnRUaW1lID0gMDtcclxuXHR9KTtcclxuXHRcclxuXHRzbmQubG9hZCgpO1xyXG5cdFxyXG5cdHJldHVybiBzb2JqO1xyXG59XHJcblxyXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLyBXZWIgQXVkaW8gQVBJIEltcGxlbWVudGF0aW9uIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblxyXG5mdW5jdGlvbiBjcmVhdGVBdWRpb19XZWJBUEkoaWQsIGluZm8pIHtcclxuXHR2YXIgc29iaiA9IG5ldyBTb3VuZE9iamVjdCh7XHJcblx0XHRfX2F1ZGlvQnVmZmVyOiBudWxsLFxyXG5cdFx0X190YWc6IG51bGwsXHJcblx0XHRfX2dhaW5DdHJsOiBudWxsLFxyXG5cdFx0X19tdXRlQ3RybDogbnVsbCxcclxuXHRcdF9fYmxvYnVybDogbnVsbCxcclxuXHRcdF9fZGVidWdBbmFseXNlcjogbnVsbCxcclxuXHRcdFxyXG5cdFx0X19jdXJyU3JjOiBudWxsLFxyXG5cdFx0XHJcblx0XHRsb29wU3RhcnQ6IGluZm8ubG9vcFN0YXJ0IHx8IDAsXHJcblx0XHRsb29wRW5kOiBpbmZvLmxvb3BFbmQgfHwgMCxcclxuXHRcdFxyXG5cdFx0cGxheTogZnVuY3Rpb24oKSB7XHJcblx0XHRcdHZhciBzcmM7XHJcblx0XHRcdGlmICh0aGlzLl9fYXVkaW9CdWZmZXIpIHtcclxuXHRcdFx0XHRzcmMgPSBhdWRpb0NvbnRleHQuY3JlYXRlQnVmZmVyU291cmNlKCk7XHJcblx0XHRcdFx0c3JjLmJ1ZmZlciA9IHRoaXMuX19hdWRpb0J1ZmZlcjtcclxuXHRcdFx0fSBlbHNlIGlmICh0aGlzLl9fdGFnKSB7XHJcblx0XHRcdFx0c3JjID0gYXVkaW9Db250ZXh0LmNyZWF0ZU1lZGlhRWxlbWVudFNvdXJjZShpbmZvLnRhZyk7XHJcblx0XHRcdH0gZWxzZSB7IFxyXG5cdFx0XHRcdGNvbnNvbGUubG9nKFwiTm8gYXVkaW8gYnVmZmVyIHJlYWR5IHRvIHBsYXkhXCIpOyBcclxuXHRcdFx0XHRyZXR1cm47IFxyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHRzcmMubG9vcCA9ICEhaW5mby5sb29wRW5kO1xyXG5cdFx0XHRpZiAoISFpbmZvLmxvb3BFbmQpIHtcclxuXHRcdFx0XHRzcmMubG9vcFN0YXJ0ID0gaW5mby5sb29wU3RhcnQ7XHJcblx0XHRcdFx0c3JjLmxvb3BFbmQgPSBpbmZvLmxvb3BFbmQ7XHJcblx0XHRcdH1cclxuXHRcdFx0XHJcblx0XHRcdHNyYy5vbihcImVuZGVkXCIsIGZ1bmN0aW9uKCl7XHJcblx0XHRcdFx0c29iai5wbGF5aW5nID0gZmFsc2U7XHJcblx0XHRcdFx0c29iai5wbGF5aW5nX3JlYWwgPSBmYWxzZTtcclxuXHRcdFx0XHRzb2JqLl9fY3VyclNyYyA9IG51bGw7XHJcblx0XHRcdH0pO1xyXG5cdFx0XHRcclxuXHRcdFx0c3JjLmNvbm5lY3QodGhpcy5fX2dhaW5DdHJsKTtcclxuXHRcdFx0c3JjLnN0YXJ0KCk7XHJcblx0XHRcdHRoaXMuX3BsYXlpbmcgPSB0cnVlO1xyXG5cdFx0XHRcclxuXHRcdFx0dGhpcy5fX2N1cnJTcmMgPSBzcmM7XHJcblx0XHR9LFxyXG5cdFx0XHJcblx0XHRwYXVzZTogZnVuY3Rpb24oKSB7XHJcblx0XHRcdHRoaXMuX19jdXJyU3JjLnN0b3AoKTtcclxuXHRcdFx0dGhpcy5fX2N1cnJTcmMgPSBudWxsO1xyXG5cdFx0fSxcclxuXHRcdFxyXG5cdFx0c2V0Vm9sdW1lOiBmdW5jdGlvbih2b2wpIHtcclxuXHRcdFx0dGhpcy5fX2dhaW5DdHJsLmdhaW4udmFsdWUgPSB2b2w7XHJcblx0XHR9LFxyXG5cdFx0XHJcblx0XHRzZXRNdXRlZDogZnVuY3Rpb24obXV0ZWQpIHtcclxuXHRcdFx0aWYgKHRoaXMuZmFkZW91dCkgcmV0dXJuOyAvL2lnbm9yZSBkdXJpbmcgZmFkZW91dFxyXG5cdFx0XHR0aGlzLl9fbXV0ZUN0cmwuZ2Fpbi52YWx1ZSA9IChtdXRlZCk/IDAgOiAxO1xyXG5cdFx0fSxcclxuXHRcdFxyXG5cdFx0bG9vcFRpY2s6IGZ1bmN0aW9uKGRlbHRhKSB7XHJcblx0XHRcdGlmICh0aGlzLmZhZGVvdXQpIHtcclxuXHRcdFx0XHRpZiAodGhpcy5fX211dGVDdHJsLmdhaW4udmFsdWUgPiAwLjAwMSkge1xyXG5cdFx0XHRcdFx0dGhpcy5fX211dGVDdHJsLmdhaW4udmFsdWUgLT0gZGVsdGEgKiAwLjU7XHJcblx0XHRcdFx0XHQvLyBjb25zb2xlLmxvZyh0aGlzLl9fbXV0ZUN0cmwuZ2Fpbi52YWx1ZSk7XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdHRoaXMuX19jdXJyU3JjLnN0b3AoKTtcclxuXHRcdFx0XHRcdHRoaXMuX19jdXJyU3JjID0gbnVsbDtcclxuXHRcdFx0XHRcdHRoaXMuZmFkZW91dCA9IGZhbHNlO1xyXG5cdFx0XHRcdFx0dGhpcy5wbGF5aW5nID0gdGhpcy5wbGF5aW5nX3JlYWwgPSBmYWxzZTtcclxuXHRcdFx0XHRcdHRoaXMuX19tdXRlQ3RybC5nYWluLnZhbHVlID0gMTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH0sXHJcblx0XHRcclxuXHRcdHVubG9hZDogZnVuY3Rpb24oKXtcclxuXHRcdFx0aWYgKHRoaXMuX19ibG9idXJsKVxyXG5cdFx0XHRcdFVSTC5yZXZva2VPYmplY3RVUkwodGhpcy5fX2Jsb2J1cmwpO1xyXG5cdFx0XHRcclxuXHRcdFx0ZGVsZXRlIHRoaXMuX19ibG9idXJsO1xyXG5cdFx0XHRkZWxldGUgdGhpcy5fX2F1ZGlvQnVmZmVyO1xyXG5cdFx0XHRkZWxldGUgdGhpcy5fX3RhZztcclxuXHRcdFx0ZGVsZXRlIHRoaXMuX19nYWluQ3RybDtcclxuXHRcdFx0ZGVsZXRlIHRoaXMuX19tdXRlQ3RybDtcclxuXHRcdH0sXHJcblx0fSk7XHJcblx0XHJcblx0XHJcblx0aWYgKGluZm8udGFnKSB7XHJcblx0XHRzb2JqLl9fdGFnID0gaW5mby50YWc7XHJcblx0XHRcclxuXHR9IGVsc2UgaWYgKGluZm8uZGF0YSkge1xyXG5cdFx0Y3VycmVudE1hcC5tYXJrTG9hZGluZyhcIkRlY29kZUF1ZGlvX1wiK2lkKTtcclxuXHRcdFxyXG5cdFx0dmFyIGZyID0gbmV3IEZpbGVSZWFkZXIoKTtcclxuXHRcdGZyLm9uKFwibG9hZFwiLCBmdW5jdGlvbigpe1xyXG5cdFx0XHRhdWRpb0NvbnRleHQuZGVjb2RlQXVkaW9EYXRhKGZyLnJlc3VsdCwgZnVuY3Rpb24oYnVmZmVyKXtcclxuXHRcdFx0XHRzb2JqLl9fYXVkaW9CdWZmZXIgPSBidWZmZXI7XHJcblx0XHRcdFx0aWYgKHNvYmoucGxheWluZ19yZWFsKSB7XHJcblx0XHRcdFx0XHRzb2JqLnBsYXkoKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0Y3VycmVudE1hcC5tYXJrTG9hZEZpbmlzaGVkKFwiRGVjb2RlQXVkaW9fXCIraWQpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cdFx0ZnIucmVhZEFzQXJyYXlCdWZmZXIoaW5mby5kYXRhKTtcclxuXHRcdFxyXG5cdH0gZWxzZSBpZiAoaW5mby51cmwpIHtcclxuXHRcdHZhciB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcclxuXHRcdHhoci5vcGVuKFwiR0VUXCIsIGluZm8udXJsKTtcclxuXHRcdHhoci5yZXNwb25zZVR5cGUgPSAnYXJyYXlidWZmZXInO1xyXG5cdFx0eGhyLm9uKFwibG9hZFwiLCBmdW5jdGlvbihlKSB7XHJcblx0XHRcdC8vIGNvbnNvbGUubG9nKFwiTE9BRDpcIiwgZSk7XHJcblx0XHRcdGlmICh4aHIuc3RhdHVzICE9IDIwMCkge1xyXG5cdFx0XHRcdGNvbnNvbGUuZXJyb3IoXCJFUlJPUiBMT0FESU5HIEFVRElPOlwiLCB4aHIuc3RhdHVzVGV4dCk7XHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHR2YXIgZGF0YSA9IHhoci5yZXNwb25zZTtcclxuXHRcdFx0YXVkaW9Db250ZXh0LmRlY29kZUF1ZGlvRGF0YSh4aHIucmVzcG9uc2UsIGZ1bmN0aW9uKGJ1ZmZlcil7XHJcblx0XHRcdFx0c29iai5fX2F1ZGlvQnVmZmVyID0gYnVmZmVyO1xyXG5cdFx0XHRcdGlmIChzb2JqLnBsYXlpbmdfcmVhbCkge1xyXG5cdFx0XHRcdFx0c29iai5wbGF5KCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cdFx0eGhyLm9uKFwiZXJyb3JcIiwgZnVuY3Rpb24oZSl7XHJcblx0XHRcdGNvbnNvbGUuZXJyb3IoXCJFUlJPUiBMT0FESU5HIEFVRElPISFcIiwgZSk7XHJcblx0XHR9KTtcclxuXHRcdFxyXG5cdFx0aWYgKGluZm8udXJsLmluZGV4T2YoXCJibG9iXCIpID4gLTEpIHtcclxuXHRcdFx0dGhpcy5fX2Jsb2J1cmwgPSBpbmZvLnVybDtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0eGhyLnNlbmQoKTtcclxuXHR9IGVsc2Uge1xyXG5cdFx0dGhyb3cgbmV3IEVycm9yKFwiQ2FsbGVkIGNyZWF0ZUF1ZGlvIHdpdGhvdXQgYW55IGluZm8hXCIpO1xyXG5cdH1cclxuXHRcclxuXHRzb2JqLl9fZ2FpbkN0cmwgPSBhdWRpb0NvbnRleHQuY3JlYXRlR2FpbigpO1xyXG5cdC8vVE9ETyBsb29rIGludG8gM2Qgc291bmQgZnVuOiBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9BUEkvQXVkaW9Db250ZXh0LmNyZWF0ZVBhbm5lclxyXG5cdHNvYmouX19tdXRlQ3RybCA9IGF1ZGlvQ29udGV4dC5jcmVhdGVHYWluKCk7XHJcblx0XHJcblx0c29iai5fX2dhaW5DdHJsLmNvbm5lY3Qoc29iai5fX211dGVDdHJsKTtcclxuXHQvL1RPRE9cclxuXHRcclxuXHRpZiAoREVCVUcuc291bmRBbmFseXplcikge1xyXG5cdFx0dmFyIGRhID0gc29iai5fX2RlYnVnQW5hbHlzZXIgPSBhdWRpb0NvbnRleHQuY3JlYXRlQW5hbHlzZXIoKTtcclxuXHRcdGRhLmZmdFNpemUgPSAxMDI0Oy8vMjA0ODtcclxuXHRcdHRoaXMuZW1pdChcIkRFQlVHLUFuYWx5c2VyQ3JlYXRlZFwiLCBpZCwgZGEpO1xyXG5cdFx0XHJcblx0XHRzb2JqLl9fbXV0ZUN0cmwuY29ubmVjdChkYSk7XHJcblx0XHRkYS5jb25uZWN0KGF1ZGlvQ29udGV4dC5kZXN0aW5hdGlvbik7XHJcblx0fSBlbHNlIHtcclxuXHRcdHNvYmouX19tdXRlQ3RybC5jb25uZWN0KGF1ZGlvQ29udGV4dC5kZXN0aW5hdGlvbik7XHJcblx0fVxyXG5cdFxyXG5cdHJldHVybiBzb2JqO1xyXG59XHJcblxyXG5cclxuXHJcbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcbm1vZHVsZS5leHBvcnRzID0gbmV3IFNvdW5kTWFuYWdlcigpO1xyXG4iLCIvLyB1aS1tYW5hZ2VyLmpzXHJcbi8vIERlZmluZXMgdGhlIFVJIG1vZHVsZSwgd2hpY2ggY29udHJvbHMgdGhlIHVzZXIgaW50ZXJmYWNlLlxyXG5cclxudmFyIGluaGVyaXRzID0gcmVxdWlyZShcImluaGVyaXRzXCIpO1xyXG52YXIgZXh0ZW5kID0gcmVxdWlyZShcImV4dGVuZFwiKTtcclxudmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoXCJldmVudHNcIikuRXZlbnRFbWl0dGVyO1xyXG52YXIgY29udHJvbGxlciA9IHJlcXVpcmUoXCJ0cHAtY29udHJvbGxlclwiKTtcclxuXHJcbnZhciBCdWJibGVTcHJpdGUgPSByZXF1aXJlKFwidHBwLXNwcml0ZW1vZGVsXCIpLkJ1YmJsZVNwcml0ZTtcclxuXHJcbnZhciBNX1dJRFRIID0gMCwgTV9IRUlHSFQgPSAxLCBNX0hJREUgPSAyLCBNX1RSSUFOR0xFID0gMywgTV9UQUlMWCA9IDQsIE1fVEFJTFkgPSA1O1xyXG5cclxuLyoqXHJcbiAqXHJcbiAqL1xyXG5mdW5jdGlvbiBVSU1hbmFnZXIoKSB7XHJcblx0dGhpcy5kaWFsb2dzID0ge1xyXG5cdFx0XCJ0ZXh0XCIgOiBuZXcgRGlhbG9nQm94KFwidGV4dGJveF9nb2xkXCIpLFxyXG5cdFx0XCJkaWFsb2dcIiA6IG5ldyBEaWFsb2dCb3goXCJkaWFsb2dfYnViYmxlXCIpLFxyXG5cdH07XHJcblx0dGhpcy5za3JpbSA9IG5ldyBTa3JpbSgpO1xyXG5cdHRoaXMubG9hZGVyID0gbmV3IEFqYXhMb2FkZXIoKTtcclxuXHRcclxuXHR0aGlzLmJ1YmJsZVBvb2wgPSBbXTtcclxuXHR0aGlzLmFsbEJ1YmJsZXMgPSBbXTtcclxuXHRcclxuXHR2YXIgc2VsZiA9IHRoaXM7XHJcblx0JChmdW5jdGlvbigpe1xyXG5cdFx0c2VsZi5faW5pdFVJU2NlbmUoKTtcclxuXHRcdFxyXG5cdFx0JChcIiNwcmVsb2FkU2NyZWVuXCIpLmZhZGVPdXQoODAwLCBmdW5jdGlvbigpe1xyXG5cdFx0XHQkKHRoaXMpLnJlbW92ZSgpO1xyXG5cdFx0fSk7XHJcblx0XHRcclxuXHRcdGZvciAodmFyIHR5cGUgaW4gc2VsZi5kaWFsb2dzKSB7XHJcblx0XHRcdHNlbGYuZGlhbG9nc1t0eXBlXS5lbGVtZW50ID0gJChcIjxkaXY+XCIpXHJcblx0XHRcdFx0LmFkZENsYXNzKFwiZGlhbG9nYm94XCIpLmFkZENsYXNzKHR5cGUpXHJcblx0XHRcdFx0LmFwcGVuZFRvKFwiI2NhbnZhcy11aVwiKTtcclxuXHRcdH1cclxuXHR9KTtcclxufVxyXG5pbmhlcml0cyhVSU1hbmFnZXIsIEV2ZW50RW1pdHRlcik7XHJcbmV4dGVuZChVSU1hbmFnZXIucHJvdG90eXBlLCB7XHJcblx0bG9hZGVyOiBudWxsLFxyXG5cdHNrcmltIDogbnVsbCxcclxuXHRkaWFsb2dzIDogbnVsbCxcclxuXHRcclxuXHRidWJibGVQb29sOiBudWxsLFxyXG5cdGFsbEJ1YmJsZXM6IG51bGwsXHJcblx0XHJcblx0Ly8vLy8vLy8vLy8vLy8vLy8vLy8vLy8gVUkgQWN0aW9ucyAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHRcclxuXHQvKiogU2hvdyBhIHN0YW5kYXJkIHRleHRib3ggb24gc2NyZWVuLiAqL1xyXG5cdHNob3dUZXh0Qm94IDogZnVuY3Rpb24odHlwZSwgaHRtbCwgb3B0cykge1xyXG5cdFx0aWYgKCQuaXNQbGFpbk9iamVjdChodG1sKSAmJiBvcHRzID09PSB1bmRlZmluZWQpIHtcclxuXHRcdFx0b3B0cyA9IGh0bWw7IGh0bWwgPSB1bmRlZmluZWQ7XHJcblx0XHR9XHJcblx0XHRvcHRzID0gZXh0ZW5kKG9wdHMsIHtcclxuXHRcdFx0aHRtbDogaHRtbCxcclxuXHRcdH0pO1xyXG5cdFx0XHJcblx0XHR2YXIgZCA9IHRoaXMuZGlhbG9nc1t0eXBlXTtcclxuXHRcdGlmICghZCkge1xyXG5cdFx0XHRkID0gdGhpcy5kaWFsb2dzW1widGV4dFwiXTtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihcIkludmFsaWQgZGlhbG9nIHR5cGU6IFwiK3R5cGUpO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHRkLnNob3cob3B0cyk7XHJcblx0fSxcclxuXHRcclxuXHQvKiogSW1tZWRlYXRlbHkgaGlkZXMgdGhlIHRleHQgYm94IGFuZCBjbGVhcnMgYW55IHRleHQgdGhhdCB3YXMgaW4gaXQuICovXHJcblx0Y2xvc2VUZXh0Qm94IDogZnVuY3Rpb24odHlwZSkge1xyXG5cdFx0dmFyIGQgPSB0aGlzLmRpYWxvZ3NbdHlwZV07XHJcblx0XHRpZiAoIWQpIHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgZGlhbG9nIHR5cGU6IFwiK3R5cGUpO1xyXG5cdFx0XHJcblx0XHRkLmhpZGUoKTtcclxuXHR9LFxyXG5cdFxyXG5cdC8qKiBTaG93cyBhIHNlbGVjdGFibGUgbWVudSBpbiB0aGUgdG9wLXJpZ2h0IGNvcm5lciBvZiB0aGUgc2NyZWVuLiAqL1xyXG5cdHNob3dNZW51IDogZnVuY3Rpb24oKSB7XHJcblx0XHRcclxuXHR9LFxyXG5cdFxyXG5cdC8qKiBJbW1lZGF0ZWx5IGNsb3NlcyB0aGUgbWVudSBhbmQgY2xlYXJzIGl0IGZvciBmdXJ0aGVyIHVzZS4gKi9cclxuXHRjbG9zZU1lbnUgOiBmdW5jdGlvbigpIHtcclxuXHRcdFxyXG5cdH0sXHJcblx0XHJcblx0LyoqIFxyXG5cdCAqIFNob3dzIGEgWWVzL05vIG1lbnUganVzdCBhYm92ZSB0aGUgdGV4dCBib3guIElmIHRleHQgaXMgY3VycmVudGx5IHByaW50aW5nIG91dCBvbiBhLCBcclxuXHQgKiBkaWFsb2cgYm94IG9yIHRleHQgYm94IG9uIHNjcmVlbiwgdGhpcyB3aWxsIGF1dG9tYXRpY2FsbHkgd2FpdCBmb3IgdGhlIHRleHQgdG8gZmluaXNoXHJcblx0ICogcHJpbnRpbmcgYmVmb3JlIHNob3dpbmcgaXQuIFRoZSBZZXMgYW5kIE5vIGZ1bmN0aW9ucyB3aWxsIGZpcmUgb2ZmIG9uZSB3aGVuIGlzIHNlbGVjdGVkLlxyXG5cdCAqIFRoZSBmdW5jdGlvbnMgd2lsbCBwcmVzdW1hYmx5IHB1c2ggbW9yZSBhY3Rpb25zIGludG8gdGhlIGFjdGlvbiBxdWV1ZS5cclxuXHQgKi9cclxuXHRzaG93Q29uZmlybVByb21wdCA6IGZ1bmN0aW9uKHllc2ZuLCBub2ZuKSB7XHJcblx0XHRcclxuXHR9LFxyXG5cdFxyXG5cdFxyXG5cdG9wZW5JbmZvZGV4UGFnZSA6IGZ1bmN0aW9uKHBhZ2VpZCkge1xyXG5cdFx0XHJcblx0fSxcclxuXHRcclxuXHRcclxuXHRnZXRFbW90ZUJ1YmJsZSA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xyXG5cdFx0dmFyIGVtb3RlID0gdGhpcy5idWJibGVQb29sLnVuc2hpZnQoKTtcclxuXHRcdGlmICghZW1vdGUpIHtcclxuXHRcdFx0ZW1vdGUgPSBuZXcgQnViYmxlU3ByaXRlKCk7XHJcblx0XHRcdGVtb3RlLnJlbGVhc2UgPSBmdW5jdGlvbigpe1xyXG5cdFx0XHRcdHNlbGYucGFyZW50LnJlbW92ZShzZWxmKTtcclxuXHRcdFx0XHRzZWxmLmJ1YmJsZVBvb2wucHVzaChlbW90ZSk7XHJcblx0XHRcdH07XHJcblx0XHRcdHRoaXMuYWxsQnViYmxlcy5wdXNoKGVtb3RlKTtcclxuXHRcdH1cclxuXHRcdC8vIGVtb3RlLnNldFR5cGUodHlwZSk7XHJcblx0XHRyZXR1cm4gZW1vdGU7XHJcblx0fSxcclxuXHRcclxuXHRcclxuXHQvKiogRmFkZSB0aGUgc2NyZWVuIHRvIHdoaXRlIGZvciBhIHRyYW5zaXRpb24gb2Ygc29tZSBzb3J0LiAqL1xyXG5cdGZhZGVUb1doaXRlIDogZnVuY3Rpb24oc3BlZWQsIGNhbGxiYWNrKSB7XHJcblx0XHRpZiAodHlwZW9mIHNwZWVkID09IFwiZnVuY3Rpb25cIikge1xyXG5cdFx0XHRjYWxsYmFjayA9IHNwZWVkOyBzcGVlZCA9IHVuZGVmaW5lZDtcclxuXHRcdH1cclxuXHRcdGlmICghc3BlZWQpIHNwZWVkID0gMTsgLy8xIHNlY29uZFxyXG5cdFx0XHJcblx0XHR0aGlzLnNrcmltLmZhZGVUbyh7XHJcblx0XHRcdGNvbG9yOiAweEZGRkZGRixcclxuXHRcdFx0b3BhY2l0eTogMSxcclxuXHRcdFx0c3BlZWQ6IHNwZWVkLFxyXG5cdFx0fSwgY2FsbGJhY2spO1xyXG5cdFx0Ly8gdGhpcy5za3JpbS5mYWRlSW4oc3BlZWQpO1xyXG5cdH0sXHJcblx0XHJcblx0LyoqIEZhZGUgdGhlIHNjcmVlbiB0byBibGFjayBmb3IgYSB0cmFuc2l0aW9uIG9mIHNvbWUgc29ydC4gKi9cclxuXHRmYWRlVG9CbGFjayA6IGZ1bmN0aW9uKHNwZWVkLCBjYWxsYmFjaykge1xyXG5cdFx0aWYgKHR5cGVvZiBzcGVlZCA9PSBcImZ1bmN0aW9uXCIpIHtcclxuXHRcdFx0Y2FsbGJhY2sgPSBzcGVlZDsgc3BlZWQgPSB1bmRlZmluZWQ7XHJcblx0XHR9XHJcblx0XHRpZiAoIXNwZWVkKSBzcGVlZCA9IDE7IC8vMSBzZWNvbmRcclxuXHRcdFxyXG5cdFx0dGhpcy5za3JpbS5mYWRlVG8oe1xyXG5cdFx0XHRjb2xvcjogMHgwMDAwMDAsXHJcblx0XHRcdG9wYWNpdHk6IDEsXHJcblx0XHRcdHNwZWVkOiBzcGVlZCxcclxuXHRcdH0sIGNhbGxiYWNrKTtcclxuXHRcdC8vIHRoaXMuc2tyaW0uZmFkZUluKHNwZWVkKTtcclxuXHR9LFxyXG5cdFxyXG5cdC8qKiBGYWRlIHRoZSBzY3JlZW4gb3V0IGZvciBhIHRyYW5zaXRpb24gb2Ygc29tZSBzb3J0LiAqL1xyXG5cdGZhZGVPdXQgOiBmdW5jdGlvbihzcGVlZCwgY2FsbGJhY2spIHtcclxuXHRcdGlmICh0eXBlb2Ygc3BlZWQgPT0gXCJmdW5jdGlvblwiKSB7XHJcblx0XHRcdGNhbGxiYWNrID0gc3BlZWQ7IHNwZWVkID0gdW5kZWZpbmVkO1xyXG5cdFx0fVxyXG5cdFx0aWYgKCFzcGVlZCkgc3BlZWQgPSAxOyAvLzEgc2Vjb25kXHJcblx0XHRcclxuXHRcdHRoaXMuc2tyaW0uZmFkZVRvKHtcclxuXHRcdFx0b3BhY2l0eTogMSxcclxuXHRcdFx0c3BlZWQ6IHNwZWVkLFxyXG5cdFx0fSwgY2FsbGJhY2spO1xyXG5cdFx0Ly8gdGhpcy5za3JpbS5mYWRlSW4oc3BlZWQpO1xyXG5cdH0sXHJcblx0XHJcblx0LyoqIEZhZGUgdGhlIHNjcmVlbiBpbiBmcm9tIGEgdHJhbnNpdGlvbi4gKi9cclxuXHRmYWRlSW4gOiBmdW5jdGlvbihzcGVlZCwgY2FsbGJhY2spIHtcclxuXHRcdGlmICh0eXBlb2Ygc3BlZWQgPT0gXCJmdW5jdGlvblwiKSB7XHJcblx0XHRcdGNhbGxiYWNrID0gc3BlZWQ7IHNwZWVkID0gdW5kZWZpbmVkO1xyXG5cdFx0fVxyXG5cdFx0aWYgKCFzcGVlZCkgc3BlZWQgPSAxOyAvLzEgc2Vjb25kXHJcblx0XHRcclxuXHRcdHRoaXMuc2tyaW0uZmFkZVRvKHtcclxuXHRcdFx0b3BhY2l0eTogMCxcclxuXHRcdFx0c3BlZWQ6IHNwZWVkLFxyXG5cdFx0fSwgY2FsbGJhY2spO1xyXG5cdFx0Ly8gdGhpcy5za3JpbS5mYWRlT3V0KHNwZWVkKTtcclxuXHR9LFxyXG5cdFxyXG5cdC8qKiBEaXNwbGF5cyB0aGUgbG9hZGluZyBpY29uIG92ZXIgdGhlIG1haW4gZ2FtZSBzY3JlZW4uIE9wdGlvbmFsbHkgc3VwcGx5IHRleHQuICovXHJcblx0c2hvd0xvYWRpbmdBamF4IDogZnVuY3Rpb24obG9hZGluZ1RleHQpIHtcclxuXHRcdGlmICghbG9hZGluZ1RleHQpIGxvYWRpbmdUZXh0ID0gXCJMb2FkaW5nLi4uXCI7XHJcblx0XHR0aGlzLmxvYWRlci5zaG93KCk7XHJcblx0fSxcclxuXHRcclxuXHRoaWRlTG9hZGluZ0FqYXggOiBmdW5jdGlvbigpIHtcclxuXHRcdHRoaXMubG9hZGVyLmhpZGUoKTtcclxuXHR9LFxyXG5cdFxyXG5cdHVwZGF0ZUxvYWRpbmdQcm9ncmVzczogZnVuY3Rpb24ocHJvZ3Jlc3MsIHRvdGFsKSB7XHJcblx0XHRpZiAocHJvZ3Jlc3MgIT09IHVuZGVmaW5lZCkgdGhpcy5sb2FkZXIucHJvZ3Jlc3MgPSBwcm9ncmVzcztcclxuXHRcdGlmICh0b3RhbCAhPT0gdW5kZWZpbmVkKSB0aGlzLmxvYWRlci5wcm9ncmVzc190b3RhbCA9IHRvdGFsO1xyXG5cdH0sXHJcblx0XHJcblx0XHJcblx0Ly8vLy8vLy8vLy8vLy8vLy8vLy8vLyBBY3Rpb24gUXVldWVzIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHRjdXJyQWN0aW9uIDogbnVsbCxcclxuXHRhY3Rpb25RdWV1ZSA6IFtdLFxyXG5cdFxyXG5cdC8qKiBQYXNzIHRoaXMgYSBzZXQgb2YgZnVuY3Rpb25zIHRvIGJlIHJ1biBvbmUgYWZ0ZXIgdGhlIG90aGVyIHdoZW4gdGhlIHVzZXIgY29uZmlybXMgXHJcblx0ICogIGFuIGFjdGlvbi4gKi9cclxuXHRxdWV1ZUFjdGlvbnM6IGZ1bmN0aW9uKCkge1xyXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0dmFyIGFyZyA9IGFyZ3VtZW50c1tpXTtcclxuXHRcdFx0aWYgKCQuaXNBcnJheShhcmcpKSB7XHJcblx0XHRcdFx0Zm9yICh2YXIgaiA9IDA7IGogPCBhcmcubGVuZ3RoOyBqKyspIHtcclxuXHRcdFx0XHRcdGlmICghJC5pc0Z1bmN0aW9uKGFyZ1tqXSkpIFxyXG5cdFx0XHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJVSSBBY3Rpb25zIG11c3QgYmUgZnVuY3Rpb25zIHRvIGJlIHJ1biFcIik7XHJcblx0XHRcdFx0XHR0aGlzLmFjdGlvblF1ZXVlLnB1c2goYXJnW2pdKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0gZWxzZSBpZiAoJC5pc0Z1bmN0aW9uKGFyZ1tqXSkpIHtcclxuXHRcdFx0XHR0aGlzLmFjdGlvblF1ZXVlLnB1c2goYXJnW2pdKTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJVSSBBY3Rpb25zIG11c3QgYmUgZnVuY3Rpb25zIHRvIGJlIHJ1biFcIik7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9LFxyXG5cdFxyXG5cdC8qKiBDbGVhcnMgYWxsIHF1ZXVlZCBhY3Rpb25zIGZyb20gdGhlIHVpIGFjdGlvbiBxdWV1ZS4gVXNlIHRoaXMgc3BhcmluZ2x5LiBUaGlzIHdpbGwgXHJcblx0ICogIE5PVCB0ZXJtaW5hdGUgYW55IGN1cnJlbnRseSBydW5uaW5nIGFjdGlvbnMgb3IgY2xlYXIgYW55IHRleHQgYm94ZXMuICovXHJcblx0Y2xlYXJBY3Rpb25RdWV1ZSA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHJcblx0fSxcclxuXHRcclxuXHQvLy8vLy8vLy8vLy8vLy8vLy8vLy8vIFVJIFRocmVlLmpzIFNjZW5lIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHRzY2VuZSA6IG51bGwsXHJcblx0Y2FtZXJhIDogbnVsbCxcclxuXHRcclxuXHRfaW5pdFVJU2NlbmUgOiBmdW5jdGlvbigpIHtcclxuXHRcdFxyXG5cdFx0dGhpcy5zY2VuZSA9IG5ldyBUSFJFRS5TY2VuZSgpO1xyXG5cdFx0XHJcblx0XHR2YXIgc3cgPSAkKFwiI2dhbWVzY3JlZW5cIikud2lkdGgoKTtcclxuXHRcdHZhciBzaCA9ICQoXCIjZ2FtZXNjcmVlblwiKS5oZWlnaHQoKTtcclxuXHRcdFxyXG5cdFx0dmFyIGNhbWVyYSA9IHRoaXMuY2FtZXJhID0gbmV3IFRIUkVFLk9ydGhvZ3JhcGhpY0NhbWVyYSgwLCBzdywgc2gsIDAsIDEsIDEwMSk7XHJcblx0XHRjYW1lcmEucG9zaXRpb24uc2V0KDAsIDAsIDUxKTtcclxuXHRcdHRoaXMuc2NlbmUuYWRkKGNhbWVyYSk7XHJcblx0XHRcclxuXHRcdGZvciAodmFyIGRsb2cgaW4gdGhpcy5kaWFsb2dzKSB7XHJcblx0XHRcdC8vIGNvbnNvbGUubG9nKFwiY3JlYXRlTW9kZWw6IFwiLCBkbG9nLCB0aGlzLmRpYWxvZ3NbZGxvZ10pOyBcclxuXHRcdFx0dmFyIG1vZGVsID0gdGhpcy5kaWFsb2dzW2Rsb2ddLmNyZWF0ZU1vZGVsKCk7XHJcblx0XHRcdHRoaXMuc2NlbmUuYWRkKG1vZGVsKTtcclxuXHRcdH1cclxuXHRcdHtcclxuXHRcdFx0dmFyIG1vZGVsID0gdGhpcy5za3JpbS5jcmVhdGVNb2RlbCgpO1xyXG5cdFx0XHR0aGlzLnNjZW5lLmFkZChtb2RlbCk7XHJcblx0XHR9e1xyXG5cdFx0XHR2YXIgbW9kZWwgPSB0aGlzLmxvYWRlci5jcmVhdGVNb2RlbCgpO1xyXG5cdFx0XHR0aGlzLnNjZW5lLmFkZChtb2RlbCk7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdC8vIGNyZWF0ZURFQlVHU2V0dXAuY2FsbCh0aGlzKTtcclxuXHR9LFxyXG5cdFxyXG5cdC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cdFxyXG5cdGxvZ2ljTG9vcCA6IGZ1bmN0aW9uKGRlbHRhKSB7XHJcblx0XHRpZiAodGhpcy5jdXJyQWN0aW9uKSB7XHJcblx0XHRcdFxyXG5cdFx0fSBlbHNlIGlmICh0aGlzLmFjdGlvblF1ZXVlLmxlbmd0aCkge1xyXG5cdFx0XHR0aGlzLmN1cnJBY3Rpb24gPSB0aGlzLmFjdGlvblF1ZXVlLnNoaWZ0KCk7XHJcblx0XHRcdGNvbnRyb2xsZXIucHVzaElucHV0Q29udGV4dChcInVpYWN0aW9uXCIpO1xyXG5cdFx0XHR0aGlzLmN1cnJBY3Rpb24oKTtcclxuXHRcdFx0XHJcblx0XHRcdC8vSWYgdGhlIGFjdGlvbiBjb21wbGV0ZWQgdGhpcyB0dXJuLCBhbmQgZGlkbid0IHB1c2ggaXRzIG93biBjb250ZXh0XHJcblx0XHRcdGlmIChjb250cm9sbGVyLnBvcElucHV0Q29udGV4dChcInVpYWN0aW9uXCIpID09IFwidWlhY3Rpb25cIikge1xyXG5cdFx0XHRcdC8vQ2xlYXIgdGhlIGN1cnJlbnQgYWN0aW9uXHJcblx0XHRcdFx0dGhpcy5jdXJyQWN0aW9uID0gbnVsbDtcclxuXHRcdFx0fVxyXG5cdFx0fSBcclxuXHRcdFxyXG5cdFx0Zm9yICh2YXIgZGxvZyBpbiB0aGlzLmRpYWxvZ3MpIHtcclxuXHRcdFx0aWYgKHRoaXMuZGlhbG9nc1tkbG9nXS5hZHZhbmNlKSB7XHJcblx0XHRcdFx0aWYgKGNvbnRyb2xsZXIuaXNEb3duT25jZShcIkludGVyYWN0XCIsIFwiZGxvZ1ByaW50aW5nXCIpKSB7XHJcblx0XHRcdFx0XHR0aGlzLmRpYWxvZ3NbZGxvZ10uY29tcGxldGUoKTtcclxuXHRcdFx0XHR9IGVsc2UgaWYgKGNvbnRyb2xsZXIuaXNEb3duT25jZShcIkludGVyYWN0XCIsIFwiZGxvZ1dhaXRpbmdcIikpIHtcclxuXHRcdFx0XHRcdHRoaXMuZGlhbG9nc1tkbG9nXS5fZGlzcGxheU5leHQoKTtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0dGhpcy5kaWFsb2dzW2Rsb2ddLmFkdmFuY2UoZGVsdGEpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHR0aGlzLnNrcmltLmFkdmFuY2UoZGVsdGEpO1xyXG5cdFx0dGhpcy5sb2FkZXIuYWR2YW5jZShkZWx0YSk7XHJcblx0XHRcclxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5hbGxCdWJibGVzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdGlmICh0aGlzLmFsbEJ1YmJsZXNbaV0udmlzaWJsZSkge1xyXG5cdFx0XHRcdHRoaXMuYWxsQnViYmxlc1tpXS5fdGljayhkZWx0YSk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9LFxyXG5cdFxyXG5cdF9jb21wbGV0ZUN1cnJBY3Rpb24gOiBmdW5jdGlvbigpIHtcclxuXHRcdGlmICh0aGlzLmFjdGlvblF1ZXVlLmxlbmd0aCkge1xyXG5cdFx0XHR0aGlzLmN1cnJBY3Rpb24gPSB0aGlzLmFjdGlvblF1ZXVlLnNoaWZ0KCk7XHJcblx0XHRcdHRoaXMuY3VyckFjdGlvbigpO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0Y29udHJvbGxlci5wb3BJbnB1dENvbnRleHQoXCJ1aWFjdGlvblwiKTtcclxuXHRcdH1cclxuXHR9LFxyXG5cdFxyXG59KTtcclxuXHJcbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHJcbmZ1bmN0aW9uIERpYWxvZ0JveCh0eXBlKSB7XHJcblx0dGhpcy50eXBlID0gdHlwZTtcclxufVxyXG5leHRlbmQoRGlhbG9nQm94LnByb3RvdHlwZSwge1xyXG5cdG1vZGVsIDogbnVsbCxcclxuXHRlbGVtZW50IDogbnVsbCxcclxuXHRvd25lciA6IG51bGwsXHJcblx0aHRtbCA6IFtdLFxyXG5cdFxyXG5cdGFkdmFuY2UgOiBudWxsLFxyXG5cdGNvbXBsZXRlOiBmdW5jdGlvbigpe30sXHJcblx0X2NvbXBsZXRpb25DYWxsYmFjayA6IG51bGwsIC8vY2FsbGJhY2sgZnJvbSB0aGUgZXZlbnQgc3RhcnRpbmcgdGhpcyBkaWFsb2cuXHJcblx0XHJcblx0c2hvdyA6IGZ1bmN0aW9uKG9wdHMpIHtcclxuXHRcdC8vIGlmICghb3B0cy5odG1sKSB7XHJcblx0XHQvLyBcdHRocm93IG5ldyBFcnJvcihcIk5vIEhUTUwgZ2l2ZW4gdG8gdGhlIGRpYWxvZ2JveCdzIHNob3coKSBtZXRob2QhXCIpO1xyXG5cdFx0Ly8gfVxyXG5cdFx0XHJcblx0XHRvcHRzID0gZXh0ZW5kKHtcclxuXHRcdFx0b3duZXI6IG51bGwsXHJcblx0XHRcdGlzTGFzdCA6IGZhbHNlLFxyXG5cdFx0fSwgb3B0cyk7XHJcblx0XHRcclxuXHRcdHRoaXMub3duZXIgPSBvcHRzLm93bmVyO1xyXG5cdFx0XHJcblx0XHR0aGlzLl9jb21wbGV0aW9uQ2FsbGJhY2sgPSBvcHRzLmNvbXBsZXRlO1xyXG5cdFx0XHJcblx0XHRpZiAodHlwZW9mIG9wdHMuaHRtbCA9PSBcInN0cmluZ1wiKSB7XHJcblx0XHRcdHRoaXMuaHRtbCA9IFtvcHRzLmh0bWxdO1xyXG5cdFx0fSBlbHNlIGlmICgkLmlzQXJyYXkob3B0cy5odG1sKSkge1xyXG5cdFx0XHR0aGlzLmh0bWwgPSBvcHRzLmh0bWwuc2xpY2UoKTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdGNvbnNvbGUuZXJyb3IoXCJEaWFsb2cgZ2l2ZW4gaXMgb2YgdGhlIHdyb25nIHR5cGUhIFwiLCBvcHRzLmh0bWwpO1xyXG5cdFx0XHR0aGlzLmh0bWwgPSBbXCJbRVJST1I6IFRoaXMgZGlhbG9nIHRleHQgY291bGQgbm90IGJlIGxvYWRlZCBwcm9wZXJseSFdXCJdO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHR0aGlzLl9kaXNwbGF5KCk7XHJcblx0fSxcclxuXHRcclxuXHRoaWRlIDogZnVuY3Rpb24oKSB7XHJcblx0XHR0aGlzLm1vZGVsLnZpc2libGUgPSBmYWxzZTtcclxuXHRcdHRoaXMuZWxlbWVudC5oaWRlKCkuY3NzKHsgd2lkdGg6XCJcIiwgaGVpZ2h0OlwiXCIsIGJvdHRvbTpcIlwiLCBsZWZ0OlwiXCIsIHRvcDpcIlwiLCByaWdodDpcIlwiIH0pO1xyXG5cdFx0dGhpcy5odG1sID0gW107XHJcblx0XHR0aGlzLmFkdmFuY2UgPSBudWxsO1xyXG5cdFx0XHJcblx0XHRpZiAodGhpcy5fY29tcGxldGlvbkNhbGxiYWNrKVxyXG5cdFx0XHR0aGlzLl9jb21wbGV0aW9uQ2FsbGJhY2suY2FsbChudWxsKTtcclxuXHR9LFxyXG5cdFxyXG5cdF9kaXNwbGF5OiBmdW5jdGlvbigpIHtcclxuXHRcdC8vIG9wdHMgPSBleHRlbmQob3B0cywge1xyXG5cdFx0Ly8gXHRhbmNob3JZOiBcImJvdHRvbVwiLFxyXG5cdFx0Ly8gXHRhbmNob3JYOiBcImxlZnRcIixcclxuXHRcdC8vIH0pO1xyXG5cdFx0XHJcblx0XHQvLyBTdGVwIDE6IHNpemUgb3V0IHRoZSB0ZXh0Ym94IHNwYWNlXHJcblx0XHR2YXIgZSA9IHRoaXMuZWxlbWVudDtcclxuXHRcdGUuY3NzKHsgd2lkdGg6XCJcIiwgaGVpZ2h0OlwiXCIsIGJvdHRvbTpcIlwiLCBsZWZ0OlwiXCIsIHRvcDpcIlwiLCByaWdodDpcIlwiIH0pOyAvL3Jlc2V0XHJcblx0XHRcclxuXHRcdGUuY3NzKHsgXCJ2aXNpYmlsaXR5XCI6IFwiaGlkZGVuXCIgfSkuc2hvdygpOyAvL05vdGU6ICQuc2hvdygpIGRvZXMgbm90IGFmZmVjdCBcInZpc2liaWxpdHlcIlxyXG5cdFx0dmFyIHdpZHRoID0gMCwgaGVpZ2h0ID0gMDtcclxuXHRcdC8vIHZhciB3LCBoO1xyXG5cdFx0XHJcblx0XHQvL0ZvciBlYWNoIGRpYWxvZyBpbiB0aGUgdGV4dCB0byBkaXNwbGF5LCBzaXplIG91dCB0aGUgYm94IHRvIGZpdCB0aGUgbGFyZ2VzdCBvbmVcclxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5odG1sLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdHZhciBmID0gdGhpcy5odG1sW2ldO1xyXG5cdFx0XHRpZiAodHlwZW9mIGYgIT0gXCJzdHJpbmdcIikgY29udGludWU7XHJcblx0XHRcdGUuaHRtbChmKTtcclxuXHRcdFx0d2lkdGggPSBNYXRoLm1heChlLmlubmVyV2lkdGgoKSwgd2lkdGgpO1xyXG5cdFx0XHRoZWlnaHQgPSBNYXRoLm1heChlLmlubmVySGVpZ2h0KCksIGhlaWdodCk7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdHZhciBkaWZ4ID0gZS5pbm5lcldpZHRoKCkgLSBlLndpZHRoKCk7XHJcblx0XHR2YXIgZGlmeSA9IGUuaW5uZXJIZWlnaHQoKSAtIGUuaGVpZ2h0KCk7XHJcblx0XHRcclxuXHRcdC8vIFN0ZXAgMjogcmVzaXplIGFuZCBwb3NpdGlvbiB0aGUgdGV4dGJveGVzXHJcblx0XHR0aGlzLm1vZGVsLm1vcnBoVGFyZ2V0SW5mbHVlbmNlc1tNX1dJRFRIXSA9IHdpZHRoO1xyXG5cdFx0dGhpcy5tb2RlbC5tb3JwaFRhcmdldEluZmx1ZW5jZXNbTV9IRUlHSFRdID0gaGVpZ2h0O1xyXG5cdFx0ZS5jc3MoeyB3aWR0aDogd2lkdGgtZGlmeCsyLCBoZWlnaHQ6IGhlaWdodC1kaWZ5IH0pO1xyXG5cdFx0XHJcblx0XHQvL1RPRE8gYmFzZSBvbiBhbmNob3IgcG9pbnRzXHJcblx0XHR0aGlzLm1vZGVsLnBvc2l0aW9uLnNldCgxMCwgMTAsIDApO1xyXG5cdFx0ZS5jc3MoeyBib3R0b206IDEwLCBsZWZ0OiAxMCwgdG9wOiBcIlwiIH0pO1xyXG5cdFx0XHJcblx0XHQvL1RPRE8gbW92ZSBpbnRvIGFuIFwiYWR2YW5jZVwiXHJcblx0XHRpZiAodGhpcy5vd25lciAmJiB0aGlzLm93bmVyLmdldFRhbGtpbmdBbmNob3IpIHtcclxuXHRcdFx0Ly9UT0RPIGRldGVybWluZSBhbmNob3IgcG9pbnQgYmFzZWQgb24gd2hlcmUgdGhlIG93bmVyIGlzIG9uLXNjcmVlblxyXG5cdFx0XHQvL1Byb2plY3QgVmVjdG9yID0gM0QgdG8gMkQsIFVucHJvamVjdCBWZWN0b3IgPSAyRCB0byAzRFxyXG5cdFx0XHR2YXIgYW5jaG9yID0gdGhpcy5vd25lci5nZXRUYWxraW5nQW5jaG9yKCk7XHJcblx0XHRcdGFuY2hvci5wcm9qZWN0KGN1cnJlbnRNYXAuY2FtZXJhKTtcclxuXHRcdFx0dGhpcy5tb2RlbC5tb3JwaFRhcmdldEluZmx1ZW5jZXNbTV9UQUlMWF0gPSBhbmNob3IueCAtIHRoaXMubW9kZWwucG9zaXRpb24ueDtcclxuXHRcdFx0dGhpcy5tb2RlbC5tb3JwaFRhcmdldEluZmx1ZW5jZXNbTV9UQUlMWV0gPSBhbmNob3IueSAtIHRoaXMubW9kZWwucG9zaXRpb24ueTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0XHJcblx0XHRcclxuXHRcdC8vIFN0ZXAgMzogc2V0dXAgdHlwZXdyaXRlciBlZmZlY3QgYW5kIHNob3cgZGlhbG9nYm94XHJcblx0XHR0aGlzLl9kaXNwbGF5TmV4dCgpO1xyXG5cdFx0XHJcblx0XHRlLmNzcyh7IFwidmlzaWJpbGl0eVwiOiBcIlwiIH0pO1xyXG5cdFx0dGhpcy5tb2RlbC52aXNpYmxlID0gdHJ1ZTtcclxuXHRcdFxyXG5cdH0sXHJcblx0XHJcblx0LyoqIERpYWxvZyBpcyBhbHJlYWR5IHNob3dpbmcgYW5kIHNpemVkLCBzaG93IG5leHQgZGlhbG9nLCBvciBjbG9zZS4gKi9cclxuXHRfZGlzcGxheU5leHQgOiBmdW5jdGlvbigpIHtcclxuXHRcdHZhciB0eHQ7XHJcblx0XHR3aGlsZSh0aGlzLmh0bWwgJiYgdGhpcy5odG1sLmxlbmd0aCkge1xyXG5cdFx0XHR0eHQgPSB0aGlzLmh0bWwuc2hpZnQoKTtcclxuXHRcdFx0Y29uc29sZS5sb2coXCJzaGlmdDogXCIsIHR4dCk7XHJcblx0XHRcdGlmICh0eXBlb2YgdHh0ID09IFwiZnVuY3Rpb25cIikge1xyXG5cdFx0XHRcdHRyeSB7XHJcblx0XHRcdFx0XHR0eHQgPSB0eHQuY2FsbCh0aGlzLm93bmVyKTtcclxuXHRcdFx0XHR9IGNhdGNoKGUpIHsgY29uc29sZS5lcnJvcihcIkRpYWxvZyBmdW5jdGlvbiB0aHJldyBhbiBlcnJvciFcIiwgZSk7IH1cclxuXHRcdFx0XHRpZiAoIXR4dCkgY29udGludWU7XHJcblx0XHRcdH1cclxuXHRcdFx0YnJlYWs7XHJcblx0XHR9XHJcblx0XHRjb25zb2xlLmxvZyhcImJyZWFrOiBcIiwgdHh0KTtcclxuXHRcdFx0XHJcblx0XHRpZiAodHh0KSB7XHJcblx0XHRcdFxyXG5cdFx0XHRjb250cm9sbGVyLnBvcElucHV0Q29udGV4dChcImRsb2dXYWl0aW5nXCIpO1xyXG5cdFx0XHRjb250cm9sbGVyLnB1c2hJbnB1dENvbnRleHQoXCJkbG9nUHJpbnRpbmdcIik7XHJcblx0XHRcdFxyXG5cdFx0XHRjb25zb2xlLmxvZyhcInB1c2g6IFwiLCB0eHQpO1xyXG5cdFx0XHRcclxuXHRcdFx0dGhpcy5lbGVtZW50Lmh0bWwodHh0KTsgLy9wdXQgaW4gZmlyc3QgZGlhbG9nXHJcblx0XHRcdHRoaXMubW9kZWwubW9ycGhUYXJnZXRJbmZsdWVuY2VzW01fVFJJQU5HTEVdID0gKHRoaXMuaHRtbC5sZW5ndGgpPyAxOiAwO1xyXG5cdFx0XHRcclxuXHRcdFx0c2V0dXBUeXBld3JpdGVyKHRoaXMsIGZ1bmN0aW9uKCl7XHJcblx0XHRcdFx0Y29udHJvbGxlci5wb3BJbnB1dENvbnRleHQoXCJkbG9nUHJpbnRpbmdcIik7XHJcblx0XHRcdFx0Y29udHJvbGxlci5wdXNoSW5wdXRDb250ZXh0KFwiZGxvZ1dhaXRpbmdcIik7XHJcblx0XHRcdH0pO1xyXG5cdFx0XHRcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdGNvbnNvbGUubG9nKFwiZW5kOiBcIiwgdHh0KTtcclxuXHRcdFx0Y29udHJvbGxlci5wb3BJbnB1dENvbnRleHQoXCJkbG9nV2FpdGluZ1wiKTtcclxuXHRcdFx0dGhpcy5oaWRlKCk7XHJcblx0XHR9XHJcblx0XHRcclxuXHR9LFxyXG5cdFxyXG5cdFxyXG5cdGNyZWF0ZU1vZGVsOiBmdW5jdGlvbigpIHtcclxuXHRcdHZhciBzZWxmID0gdGhpcztcclxuXHRcdHZhciBpbnM7IC8vaW5zZXRzXHJcblx0XHRzd2l0Y2ggKHRoaXMudHlwZSkge1xyXG5cdFx0XHRjYXNlIFwiZGlhbG9nX2J1YmJsZVwiOlxyXG5cdFx0XHRcdGlucyA9IHsgLy9yZW1lbWJlciwgbWVhc3VyZWQgZnJvbSBib3R0b20gbGVmdCBjb3JuZXJcclxuXHRcdFx0XHRcdHQ6IDYsIGI6IDEwLCBoOiAxNiwgLy90b3AsIGJvdHRvbSwgaGVpZ2h0XHJcblx0XHRcdFx0XHRsOiA2LCByOiAxMCwgdzogMTYsIC8vbGVmdCwgcmlnaHQsIHdpZHRoXHJcblx0XHRcdFx0XHRhczogNCwgYXg6IDYsIGF5OiAxMCwgLy9hcnJvdyBzaXplLCB4L3kgcG9zaXRpb25cclxuXHRcdFx0XHR9O1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRjYXNlIFwidGV4dGJveF9nb2xkXCI6XHJcblx0XHRcdFx0aW5zID0geyBcclxuXHRcdFx0XHRcdHQ6IDcsIGI6IDEwLCBoOiAxNixcclxuXHRcdFx0XHRcdGw6IDksIHI6IDEyLCB3OiAzMixcclxuXHRcdFx0XHRcdGFzOiA0LCBheDogMjIsIGF5OiAxMCxcclxuXHRcdFx0XHR9O1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHR2YXIgZ2VvbSA9IG5ldyBUSFJFRS5HZW9tZXRyeSgpO1xyXG5cdFx0e1xyXG5cdFx0XHRnZW9tLnZlcnRpY2VzID0gW1xyXG5cdFx0XHRcdHYzKDAsICAgICAwKSwgdjMoaW5zLmwsICAgICAwKSwgdjMoaW5zLnIsICAgICAwKSwgdjMoaW5zLncsICAgICAwKSwgLy8wLTNcclxuXHRcdFx0XHR2MygwLCBpbnMudCksIHYzKGlucy5sLCBpbnMudCksIHYzKGlucy5yLCBpbnMudCksIHYzKGlucy53LCBpbnMudCksIC8vNC03XHJcblx0XHRcdFx0djMoMCwgaW5zLmIpLCB2MyhpbnMubCwgaW5zLmIpLCB2MyhpbnMuciwgaW5zLmIpLCB2MyhpbnMudywgaW5zLmIpLCAvLzgtMTFcclxuXHRcdFx0XHR2MygwLCBpbnMuaCksIHYzKGlucy5sLCBpbnMuaCksIHYzKGlucy5yLCBpbnMuaCksIHYzKGlucy53LCBpbnMuaCksIC8vMTItMTVcclxuXHRcdFx0XHRcclxuXHRcdFx0XHR2MyhpbnMuYXgraW5zLmFzLCBpbnMuYXkraW5zLmFzLCAxKSwgdjMoaW5zLmF4LWlucy5hcywgaW5zLmF5K2lucy5hcywgMSksIC8vMTYtMTdcclxuXHRcdFx0XHR2MyhpbnMuYXgraW5zLmFzLCBpbnMuYXktaW5zLmFzLCAxKSwgdjMoaW5zLmF4LWlucy5hcywgaW5zLmF5LWlucy5hcywgMSksIC8vMTgtMTlcclxuXHRcdFx0XHRcclxuXHRcdFx0XHR2MygwLCBpbnMuaC8yLCAtMSksIHYzKDE2LCBpbnMuaC8yLCAtMSksIHYzKDAsIDAsIC0xKSwgLy8yMC0yMlxyXG5cdFx0XHRdO1xyXG5cdFx0XHRmNChnZW9tLCAwLCAxLCA0LCA1KTsgZjQoZ2VvbSwgMSwgMiwgNSwgNik7IGY0KGdlb20sIDIsIDMsIDYsIDcpO1xyXG5cdFx0XHRmNChnZW9tLCA0LCA1LCA4LCA5KTsgZjQoZ2VvbSwgNSwgNiwgOSwxMCk7IGY0KGdlb20sIDYsIDcsMTAsMTEpO1xyXG5cdFx0XHRmNChnZW9tLCA4LCA5LDEyLDEzKTsgZjQoZ2VvbSwgOSwxMCwxMywxNCk7IGY0KGdlb20sMTAsMTEsMTQsMTUpO1xyXG5cdFx0XHRmNChnZW9tLDE2LDE3LDE4LDE5LCAxKTtcclxuXHRcdFx0XHJcblx0XHRcdHtcclxuXHRcdFx0XHRnZW9tLmZhY2VzLnB1c2gobmV3IFRIUkVFLkZhY2UzKDIyLCAyMCwgMjEsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCAwKSk7XHJcblx0XHRcdFx0Ly8gZ2VvbS5mYWNlcy5wdXNoKG5ldyBUSFJFRS5GYWNlMygyMiwgMjEsIDIwKSk7XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0Z2VvbS5mYWNlVmVydGV4VXZzWzBdLnB1c2goWyBuZXcgVEhSRUUuVmVjdG9yMihpbnMubCwgaW5zLnQpLCBuZXcgVEhSRUUuVmVjdG9yMihpbnMubCwgaW5zLnQpLCBuZXcgVEhSRUUuVmVjdG9yMihpbnMubCwgaW5zLnQpLCBdKTtcclxuXHRcdFx0XHQvLyBnZW9tLmZhY2VWZXJ0ZXhVdnNbMF0ucHVzaChbIG5ldyBUSFJFRS5WZWN0b3IyKGlucy5sLCBpbnMudCksIG5ldyBUSFJFRS5WZWN0b3IyKGlucy5sLCBpbnMudCksIG5ldyBUSFJFRS5WZWN0b3IyKGlucy5sLCBpbnMudCksIF0pO1xyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHRnZW9tLm1vcnBoVGFyZ2V0cyA9IFtcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHRuYW1lOiBcIndpZHRoXCIsIHZlcnRpY2VzOiBbXHJcblx0XHRcdFx0XHRcdHYzKDAsICAgICAwKSwgdjMoaW5zLmwsICAgICAwKSwgdjMoaW5zLnIrMSwgICAgIDApLCB2MyhpbnMudysxLCAgICAgMCksIC8vMC0zXHJcblx0XHRcdFx0XHRcdHYzKDAsIGlucy50KSwgdjMoaW5zLmwsIGlucy50KSwgdjMoaW5zLnIrMSwgaW5zLnQpLCB2MyhpbnMudysxLCBpbnMudCksIC8vNC03XHJcblx0XHRcdFx0XHRcdHYzKDAsIGlucy5iKSwgdjMoaW5zLmwsIGlucy5iKSwgdjMoaW5zLnIrMSwgaW5zLmIpLCB2MyhpbnMudysxLCBpbnMuYiksIC8vOC0xMVxyXG5cdFx0XHRcdFx0XHR2MygwLCBpbnMuaCksIHYzKGlucy5sLCBpbnMuaCksIHYzKGlucy5yKzEsIGlucy5oKSwgdjMoaW5zLncrMSwgaW5zLmgpLCAvLzEyLTE1XHJcblx0XHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0XHR2MyhpbnMuYXgraW5zLmFzKzEsIGlucy5heStpbnMuYXMsIDEpLCB2MyhpbnMuYXgtaW5zLmFzKzEsIGlucy5heStpbnMuYXMsIDEpLCAvLzE2LTE3XHJcblx0XHRcdFx0XHRcdHYzKGlucy5heCtpbnMuYXMrMSwgaW5zLmF5LWlucy5hcywgMSksIHYzKGlucy5heC1pbnMuYXMrMSwgaW5zLmF5LWlucy5hcywgMSksIC8vMTgtMTlcclxuXHRcdFx0XHRcdFx0XHJcblx0XHRcdFx0XHRcdHYzKDArMC41LCAoaW5zLmgpLzIsIC0xKSwgdjMoMTYrMC41LCAoaW5zLmgpLzIsIC0xKSwgdjMoMCwgMCwgLTEpLCAvLzIwLTIyXHJcblx0XHRcdFx0XHRdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0bmFtZTogXCJoZWlnaHRcIiwgdmVydGljZXM6IFtcclxuXHRcdFx0XHRcdFx0djMoMCwgICAgIDAgICksIHYzKGlucy5sLCAgICAgMCAgKSwgdjMoaW5zLnIsICAgICAwICApLCB2MyhpbnMudywgICAgIDAgICksIC8vMC0zXHJcblx0XHRcdFx0XHRcdHYzKDAsIGlucy50ICApLCB2MyhpbnMubCwgaW5zLnQgICksIHYzKGlucy5yLCBpbnMudCAgKSwgdjMoaW5zLncsIGlucy50ICApLCAvLzQtN1xyXG5cdFx0XHRcdFx0XHR2MygwLCBpbnMuYisxKSwgdjMoaW5zLmwsIGlucy5iKzEpLCB2MyhpbnMuciwgaW5zLmIrMSksIHYzKGlucy53LCBpbnMuYisxKSwgLy84LTExXHJcblx0XHRcdFx0XHRcdHYzKDAsIGlucy5oKzEpLCB2MyhpbnMubCwgaW5zLmgrMSksIHYzKGlucy5yLCBpbnMuaCsxKSwgdjMoaW5zLncsIGlucy5oKzEpLCAvLzEyLTE1XHJcblx0XHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0XHR2MyhpbnMuYXgraW5zLmFzLCBpbnMuYXkraW5zLmFzLCAxKSwgdjMoaW5zLmF4LWlucy5hcywgaW5zLmF5K2lucy5hcywgMSksIC8vMTYtMTdcclxuXHRcdFx0XHRcdFx0djMoaW5zLmF4K2lucy5hcywgaW5zLmF5LWlucy5hcywgMSksIHYzKGlucy5heC1pbnMuYXMsIGlucy5heS1pbnMuYXMsIDEpLCAvLzE4LTE5XHJcblx0XHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0XHR2MygwLCAoaW5zLmgrMSkvMiwgLTEpLCB2MygxNiwgKGlucy5oKzEpLzIsIC0xKSwgdjMoMCwgMCwgLTEpLCAvLzIwLTIyXHJcblx0XHRcdFx0XHRdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0bmFtZTogXCJoaWRlU3RvcFwiLCB2ZXJ0aWNlczogW1xyXG5cdFx0XHRcdFx0XHR2MygwLCAgICAgMCksIHYzKGlucy5sLCAgICAgMCksIHYzKGlucy5yLCAgICAgMCksIHYzKGlucy53LCAgICAgMCksIC8vMC0zXHJcblx0XHRcdFx0XHRcdHYzKDAsIGlucy50KSwgdjMoaW5zLmwsIGlucy50KSwgdjMoaW5zLnIsIGlucy50KSwgdjMoaW5zLncsIGlucy50KSwgLy80LTdcclxuXHRcdFx0XHRcdFx0djMoMCwgaW5zLmIpLCB2MyhpbnMubCwgaW5zLmIpLCB2MyhpbnMuciwgaW5zLmIpLCB2MyhpbnMudywgaW5zLmIpLCAvLzgtMTFcclxuXHRcdFx0XHRcdFx0djMoMCwgaW5zLmgpLCB2MyhpbnMubCwgaW5zLmgpLCB2MyhpbnMuciwgaW5zLmgpLCB2MyhpbnMudywgaW5zLmgpLCAvLzEyLTE1XHJcblx0XHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0XHR2MyhpbnMuYXgraW5zLmFzLCBpbnMuYXkraW5zLmFzLC0xKSwgdjMoaW5zLmF4LWlucy5hcywgaW5zLmF5K2lucy5hcywtMSksIC8vMTYtMTdcclxuXHRcdFx0XHRcdFx0djMoaW5zLmF4K2lucy5hcywgaW5zLmF5LWlucy5hcywtMSksIHYzKGlucy5heC1pbnMuYXMsIGlucy5heS1pbnMuYXMsLTEpLCAvLzE4LTE5XHJcblx0XHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0XHR2MygwLCBpbnMuaC8yLCAtMSksIHYzKDE2LCBpbnMuaC8yLCAtMSksIHYzKDAsIDAsIC0xKSwgLy8yMC0yMlxyXG5cdFx0XHRcdFx0XSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdG5hbWU6IFwidHJpYW5nbGVcIiwgdmVydGljZXM6IFtcclxuXHRcdFx0XHRcdFx0djMoMCwgICAgIDApLCB2MyhpbnMubCwgICAgIDApLCB2MyhpbnMuciwgICAgIDApLCB2MyhpbnMudywgICAgIDApLCAvLzAtM1xyXG5cdFx0XHRcdFx0XHR2MygwLCBpbnMudCksIHYzKGlucy5sLCBpbnMudCksIHYzKGlucy5yLCBpbnMudCksIHYzKGlucy53LCBpbnMudCksIC8vNC03XHJcblx0XHRcdFx0XHRcdHYzKDAsIGlucy5iKSwgdjMoaW5zLmwsIGlucy5iKSwgdjMoaW5zLnIsIGlucy5iKSwgdjMoaW5zLncsIGlucy5iKSwgLy84LTExXHJcblx0XHRcdFx0XHRcdHYzKDAsIGlucy5oKSwgdjMoaW5zLmwsIGlucy5oKSwgdjMoaW5zLnIsIGlucy5oKSwgdjMoaW5zLncsIGlucy5oKSwgLy8xMi0xNVxyXG5cdFx0XHRcdFx0XHRcclxuXHRcdFx0XHRcdFx0djMoaW5zLmF4K2lucy5hcywgaW5zLmF5K2lucy5hcywgMSksIHYzKGlucy5heC1pbnMuYXMsIGlucy5heStpbnMuYXMsIDEpLCAvLzE2LTE3XHJcblx0XHRcdFx0XHRcdHYzKGlucy5heCAgICAgICAsIGlucy5heS1pbnMuYXMsIDEpLCB2MyhpbnMuYXggICAgICAgLCBpbnMuYXktaW5zLmFzLCAxKSwgLy8xOC0xOVxyXG5cdFx0XHRcdFx0XHRcclxuXHRcdFx0XHRcdFx0djMoMCwgaW5zLmgvMiwgLTEpLCB2MygxNiwgaW5zLmgvMiwgLTEpLCB2MygwLCAwLCAtMSksIC8vMjAtMjJcclxuXHRcdFx0XHRcdF0sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHRuYW1lOiBcInRhaWxYXCIsIHZlcnRpY2VzOiBbXHJcblx0XHRcdFx0XHRcdHYzKDAsICAgICAwKSwgdjMoaW5zLmwsICAgICAwKSwgdjMoaW5zLnIsICAgICAwKSwgdjMoaW5zLncsICAgICAwKSwgLy8wLTNcclxuXHRcdFx0XHRcdFx0djMoMCwgaW5zLnQpLCB2MyhpbnMubCwgaW5zLnQpLCB2MyhpbnMuciwgaW5zLnQpLCB2MyhpbnMudywgaW5zLnQpLCAvLzQtN1xyXG5cdFx0XHRcdFx0XHR2MygwLCBpbnMuYiksIHYzKGlucy5sLCBpbnMuYiksIHYzKGlucy5yLCBpbnMuYiksIHYzKGlucy53LCBpbnMuYiksIC8vOC0xMVxyXG5cdFx0XHRcdFx0XHR2MygwLCBpbnMuaCksIHYzKGlucy5sLCBpbnMuaCksIHYzKGlucy5yLCBpbnMuaCksIHYzKGlucy53LCBpbnMuaCksIC8vMTItMTVcclxuXHRcdFx0XHRcdFx0XHJcblx0XHRcdFx0XHRcdHYzKGlucy5heCtpbnMuYXMsIGlucy5heStpbnMuYXMsIDEpLCB2MyhpbnMuYXgtaW5zLmFzLCBpbnMuYXkraW5zLmFzLCAxKSwgLy8xNi0xN1xyXG5cdFx0XHRcdFx0XHR2MyhpbnMuYXgraW5zLmFzLCBpbnMuYXktaW5zLmFzLCAxKSwgdjMoaW5zLmF4LWlucy5hcywgaW5zLmF5LWlucy5hcywgMSksIC8vMTgtMTlcclxuXHRcdFx0XHRcdFx0XHJcblx0XHRcdFx0XHRcdHYzKDAsIGlucy5oLzIsIC0xKSwgdjMoMTYsIGlucy5oLzIsIC0xKSwgdjMoMSwgMCwgLTEpLCAvLzIwLTIyXHJcblx0XHRcdFx0XHRdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0bmFtZTogXCJ0YWlsWVwiLCB2ZXJ0aWNlczogW1xyXG5cdFx0XHRcdFx0XHR2MygwLCAgICAgMCksIHYzKGlucy5sLCAgICAgMCksIHYzKGlucy5yLCAgICAgMCksIHYzKGlucy53LCAgICAgMCksIC8vMC0zXHJcblx0XHRcdFx0XHRcdHYzKDAsIGlucy50KSwgdjMoaW5zLmwsIGlucy50KSwgdjMoaW5zLnIsIGlucy50KSwgdjMoaW5zLncsIGlucy50KSwgLy80LTdcclxuXHRcdFx0XHRcdFx0djMoMCwgaW5zLmIpLCB2MyhpbnMubCwgaW5zLmIpLCB2MyhpbnMuciwgaW5zLmIpLCB2MyhpbnMudywgaW5zLmIpLCAvLzgtMTFcclxuXHRcdFx0XHRcdFx0djMoMCwgaW5zLmgpLCB2MyhpbnMubCwgaW5zLmgpLCB2MyhpbnMuciwgaW5zLmgpLCB2MyhpbnMudywgaW5zLmgpLCAvLzEyLTE1XHJcblx0XHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0XHR2MyhpbnMuYXgraW5zLmFzLCBpbnMuYXkraW5zLmFzLCAxKSwgdjMoaW5zLmF4LWlucy5hcywgaW5zLmF5K2lucy5hcywgMSksIC8vMTYtMTdcclxuXHRcdFx0XHRcdFx0djMoaW5zLmF4K2lucy5hcywgaW5zLmF5LWlucy5hcywgMSksIHYzKGlucy5heC1pbnMuYXMsIGlucy5heS1pbnMuYXMsIDEpLCAvLzE4LTE5XHJcblx0XHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0XHR2MygwLCBpbnMuaC8yLCAtMSksIHYzKDE2LCBpbnMuaC8yLCAtMSksIHYzKDAsIDEsIC0xKSwgLy8yMC0yMlxyXG5cdFx0XHRcdFx0XSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRdO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHRcclxuXHRcdHZhciBtYXQgPSBuZXcgVEhSRUUuTWVzaEZhY2VNYXRlcmlhbChbXHJcblx0XHRcdChmdW5jdGlvbigpe1xyXG5cdFx0XHRcdHZhciBtYXQgPSBuZXcgVEhSRUUuTWVzaEJhc2ljTWF0ZXJpYWwoKTtcclxuXHRcdFx0XHRcclxuXHRcdFx0XHR2YXIgdGV4ID0gbmV3IFRIUkVFLlRleHR1cmUoKTtcclxuXHRcdFx0XHR0ZXgubWFnRmlsdGVyID0gVEhSRUUuTmVhcmVzdEZpbHRlcjtcclxuXHRcdFx0XHR0ZXgubWluRmlsdGVyID0gVEhSRUUuTmVhcmVzdEZpbHRlcjtcclxuXHRcdFx0XHR0ZXguYW5pc290cm9weSA9IDE7XHJcblx0XHRcdFx0dGV4LmdlbmVyYXRlTWlwbWFwcyA9IGZhbHNlO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdHZhciBpbWcgPSBuZXcgSW1hZ2UoKTtcclxuXHRcdFx0XHRmdW5jdGlvbiBmKCl7XHJcblx0XHRcdFx0XHR0ZXguaW1hZ2UgPSBpbWc7XHJcblx0XHRcdFx0XHR0ZXgubmVlZHNVcGRhdGUgPSB0cnVlO1xyXG5cdFx0XHRcdFx0aW1nLnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJsb2FkXCIsIGYpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRpbWcub24oXCJsb2FkXCIsIGYpO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdGltZy5zcmMgPSBCQVNFVVJMK1wiL2ltZy91aS9cIitzZWxmLnR5cGUrXCIucG5nXCI7XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0bWF0Lm1hcCA9IHRleDtcclxuXHRcdFx0XHRtYXQubW9ycGhUYXJnZXRzID0gdHJ1ZTtcclxuXHRcdFx0XHRtYXQudHJhbnNwYXJlbnQgPSB0cnVlO1xyXG5cdFx0XHRcdG1hdC5hbHBoYVRlc3QgPSAwLjA1O1xyXG5cdFx0XHRcdHJldHVybiBtYXQ7XHJcblx0XHRcdH0pKCksXHJcblx0XHRcdFxyXG5cdFx0XHQoZnVuY3Rpb24oKXtcclxuXHRcdFx0XHR2YXIgbWF0ID0gbmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHtcclxuXHRcdFx0XHRcdGNvbG9yOiAweDAwMDAwMCxcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0XHRtYXQubW9ycGhUYXJnZXRzID0gdHJ1ZTtcclxuXHRcdFx0XHRyZXR1cm4gbWF0O1xyXG5cdFx0XHR9KSgpLFxyXG5cdFx0XSk7XHJcblx0XHRcclxuXHRcdHRoaXMubW9kZWwgPSBuZXcgVEhSRUUuTWVzaChnZW9tLCBtYXQpO1xyXG5cdFx0dGhpcy5tb2RlbC52aXNpYmxlID0gZmFsc2U7XHJcblx0XHR0aGlzLm1vZGVsLnJlbmRlckRlcHRoID0gMDtcclxuXHRcdHJldHVybiB0aGlzLm1vZGVsO1xyXG5cdFx0XHJcblx0XHQvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLy9cclxuXHRcdGZ1bmN0aW9uIHYyKHgsIHkpIHsgcmV0dXJuIG5ldyBUSFJFRS5WZWN0b3IyKHgsIHkpOyB9XHJcblx0XHRmdW5jdGlvbiB2Myh4LCB5LCB6KSB7IHJldHVybiBuZXcgVEhSRUUuVmVjdG9yMyh4LCB5LCB6IHx8IDApOyB9XHJcblx0XHRmdW5jdGlvbiB1dih2KSB7XHJcblx0XHRcdHJldHVybiBuZXcgVEhSRUUuVmVjdG9yMih2LnggLyBpbnMudywgdi55IC8gaW5zLmgpO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHRmdW5jdGlvbiBmNChnLCBhLCBiLCBjLCBkLCBtYXRpKSB7XHJcblx0XHRcdGcuZmFjZXMucHVzaChuZXcgVEhSRUUuRmFjZTMoYSwgYiwgZCwgdW5kZWZpbmVkLCB1bmRlZmluZWQsIG1hdGkpKTtcclxuXHRcdFx0Zy5mYWNlcy5wdXNoKG5ldyBUSFJFRS5GYWNlMyhhLCBkLCBjLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgbWF0aSkpO1xyXG5cdFx0XHRcclxuXHRcdFx0Zy5mYWNlVmVydGV4VXZzWzBdLnB1c2goWyB1dihnLnZlcnRpY2VzW2FdKSwgdXYoZy52ZXJ0aWNlc1tiXSksIHV2KGcudmVydGljZXNbZF0pIF0pO1xyXG5cdFx0XHRnLmZhY2VWZXJ0ZXhVdnNbMF0ucHVzaChbIHV2KGcudmVydGljZXNbYV0pLCB1dihnLnZlcnRpY2VzW2RdKSwgdXYoZy52ZXJ0aWNlc1tjXSkgXSk7XHJcblx0XHR9XHJcblx0fVxyXG59KTtcclxuXHJcblxyXG5mdW5jdGlvbiBzZXR1cFR5cGV3cml0ZXIodGV4dGJveCwgY2FsbGJhY2spIHtcclxuXHR0ZXh0Ym94LmFkdmFuY2UgPSBudWxsO1xyXG5cdGZ1bmN0aW9uIHNldE5leHQoY2IpIHtcclxuXHRcdHRleHRib3guYWR2YW5jZSA9IGNiO1xyXG5cdH1cclxuXHRcclxuXHR2YXIgY29tcGxldGVkVGV4dCA9IHRleHRib3guZWxlbWVudC5odG1sKCk7XHJcblx0dGV4dGJveC5jb21wbGV0ZSA9IGZ1bmN0aW9uKCl7fTtcclxuXHRmdW5jdGlvbiBfY29tcGxldGUoKSB7XHJcblx0XHR0ZXh0Ym94LmVsZW1lbnQuaHRtbChjb21wbGV0ZWRUZXh0KTtcclxuXHRcdHRleHRib3guYWR2YW5jZSA9IGJsaW5rQ3Vyc29yO1xyXG5cdFx0aWYgKGNhbGxiYWNrKSBjYWxsYmFjaygpO1xyXG5cdH07XHJcblx0XHJcblx0dGV4dGJveC5tb2RlbC5tb3JwaFRhcmdldEluZmx1ZW5jZXNbTV9ISURFXSA9IDE7XHJcblx0XHJcblx0Ly9CZWNhdXNlIHRleHRub2RlcyBhcmUgbm90IFwiZWxlbWVudHNcIiwgYW5kIGpxdWVyeSB3b24ndCBoaWRlIHRleHQgbm9kZXMsIGluIFxyXG5cdC8vIG9yZGVyIHRvIGhpZGUgZXZlcnl0aGluZywgd2UgbmVlZCB0byB3cmFwIGV2ZXJ5dGhpbmcgaW4gc3BhbiB0YWdzLi4uXHJcblx0dGV4dGJveC5lbGVtZW50LmNvbnRlbnRzKClcclxuXHRcdC5maWx0ZXIoZnVuY3Rpb24oKXsgcmV0dXJuIHRoaXMubm9kZVR5cGUgPT0gMzsgfSlcclxuXHRcdC53cmFwKFwiPHNwYW4+XCIpO1xyXG5cdFxyXG5cdHZhciBlbGVtZW50cyA9IHRleHRib3guZWxlbWVudC5jb250ZW50cygpO1xyXG5cdCQoZWxlbWVudHMpLmhpZGUoKTtcclxuXHRcclxuXHRcclxuXHQvL0NvcGllZCBhbmQgbW9kaWZpZWQgZnJvbSBodHRwOi8vanNmaWRkbGUubmV0L3k5UEpnLzI0L1xyXG5cdHZhciBpID0gMDtcclxuXHRmdW5jdGlvbiBpdGVyYXRlKCkge1xyXG5cdFx0dGV4dGJveC5jb21wbGV0ZSA9IF9jb21wbGV0ZTtcclxuXHRcdGlmIChpIDwgZWxlbWVudHMubGVuZ3RoKSB7XHJcblx0XHRcdCQoZWxlbWVudHNbaV0pLnNob3coKTtcclxuXHRcdFx0YW5pbWF0ZU5vZGUoZWxlbWVudHNbaV0sIGl0ZXJhdGUpOyBcclxuXHRcdFx0aSsrO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0aWYgKGNhbGxiYWNrKSBjYWxsYmFjaygpO1xyXG5cdFx0XHR0ZXh0Ym94LmFkdmFuY2UgPSBibGlua0N1cnNvcjtcclxuXHRcdH1cclxuXHR9XHJcblx0dGV4dGJveC5hZHZhbmNlID0gaXRlcmF0ZTtcclxuXHRcclxuXHRmdW5jdGlvbiBhbmltYXRlTm9kZShlbGVtZW50LCBjYWxsYmFjaykge1xyXG5cdFx0dmFyIHBpZWNlcyA9IFtdO1xyXG5cdFx0aWYgKGVsZW1lbnQubm9kZVR5cGU9PTEpIHsgLy9lbGVtZW50IG5vZGVcclxuXHRcdFx0d2hpbGUgKGVsZW1lbnQuaGFzQ2hpbGROb2RlcygpKSB7XHJcblx0XHRcdFx0cGllY2VzLnB1c2goIGVsZW1lbnQucmVtb3ZlQ2hpbGQoZWxlbWVudC5maXJzdENoaWxkKSApO1xyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHRzZXROZXh0KGZ1bmN0aW9uIGNoaWxkU3RlcCgpIHtcclxuXHRcdFx0XHRpZiAocGllY2VzLmxlbmd0aCkge1xyXG5cdFx0XHRcdFx0YW5pbWF0ZU5vZGUocGllY2VzWzBdLCBjaGlsZFN0ZXApOyBcclxuXHRcdFx0XHRcdGVsZW1lbnQuYXBwZW5kQ2hpbGQocGllY2VzLnNoaWZ0KCkpO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRjYWxsYmFjaygpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblx0XHRcclxuXHRcdH0gZWxzZSBpZiAoZWxlbWVudC5ub2RlVHlwZT09MykgeyAvL3RleHQgbm9kZVxyXG5cdFx0XHRwaWVjZXMgPSBlbGVtZW50LmRhdGEubWF0Y2goLy57MCwyfS9nKTsgLy8gMjogTnVtYmVyIG9mIGNoYXJzIHBlciBmcmFtZVxyXG5cdFx0XHRlbGVtZW50LmRhdGEgPSBcIlwiO1xyXG5cdFx0XHQoZnVuY3Rpb24gYWRkVGV4dCgpe1xyXG5cdFx0XHRcdGVsZW1lbnQuZGF0YSArPSBwaWVjZXMuc2hpZnQoKTtcclxuXHRcdFx0XHRzZXROZXh0KHBpZWNlcy5sZW5ndGggPyBhZGRUZXh0IDogY2FsbGJhY2spO1xyXG5cdFx0XHR9KSgpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHRcclxuXHR2YXIgdGljayA9IDA7XHJcblx0ZnVuY3Rpb24gYmxpbmtDdXJzb3IoZGVsdGEpIHtcclxuXHRcdHRpY2sgLT0gZGVsdGE7XHJcblx0XHRpZiAodGljayA8PSAwKSB7XHJcblx0XHRcdHRpY2sgPSAwLjc7XHJcblx0XHRcdHRleHRib3gubW9kZWwubW9ycGhUYXJnZXRJbmZsdWVuY2VzW01fSElERV0gPSAhdGV4dGJveC5tb2RlbC5tb3JwaFRhcmdldEluZmx1ZW5jZXNbTV9ISURFXTtcclxuXHRcdH1cclxuXHR9XHJcbn1cclxuXHJcbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcbmZ1bmN0aW9uIFNrcmltKCkge1xyXG5cdHRoaXMuX2NyZWF0ZUFuaW1Qcm9wKFwib3BhY2l0eVwiLCAxKTtcclxuXHR0aGlzLl9jcmVhdGVBbmltUHJvcChcImNvbG9yX3JcIiwgMCk7XHJcblx0dGhpcy5fY3JlYXRlQW5pbVByb3AoXCJjb2xvcl9nXCIsIDApO1xyXG5cdHRoaXMuX2NyZWF0ZUFuaW1Qcm9wKFwiY29sb3JfYlwiLCAwKTtcclxuXHRcclxufVxyXG5leHRlbmQoU2tyaW0ucHJvdG90eXBlLCB7XHJcblx0bW9kZWwgOiBudWxsLFxyXG5cdGFuaW1hdGluZyA6IGZhbHNlLFxyXG5cdGNhbGxiYWNrIDogbnVsbCxcclxuXHRzcGVlZDogMSxcclxuXHRfbmV4dE9wdHM6IG51bGwsXHJcblx0XHJcblx0X2NyZWF0ZUFuaW1Qcm9wOiBmdW5jdGlvbihwcm9wLCBkZWYpIHtcclxuXHRcdHRoaXNbcHJvcF0gPSB7XHJcblx0XHRcdGN1cnI6IGRlZixcclxuXHRcdFx0c3JjIDogZGVmLFxyXG5cdFx0XHRkZXN0OiBkZWYsXHJcblx0XHRcdGFscGhhOiAxLFxyXG5cdFx0fTtcclxuXHR9LFxyXG5cdFxyXG5cdGZhZGVUbyA6IGZ1bmN0aW9uKG9wdHMsIGNhbGxiYWNrKSB7XHJcblx0XHR2YXIgc2VsZiA9IHRoaXM7XHJcblx0XHRcclxuXHRcdG9wdHMgPSBleHRlbmQob3B0cywgdGhpcy5fbmV4dE9wdHMpO1xyXG5cdFx0dGhpcy5fbmV4dE9wdHMgPSBudWxsO1xyXG5cdFx0XHJcblx0XHRpZiAob3B0c1tcImNvbG9yXCJdICE9PSB1bmRlZmluZWQpIHtcclxuXHRcdFx0dmFyIGhleCA9IE1hdGguZmxvb3Iob3B0c1tcImNvbG9yXCJdKTtcclxuXHRcdFx0b3B0c1tcImNvbG9yX3JcIl0gPSAoKGhleCA+PiAxNikgJiAyNTUpIC8gMjU1O1xyXG5cdFx0XHRvcHRzW1wiY29sb3JfZ1wiXSA9ICgoaGV4ID4+ICA4KSAmIDI1NSkgLyAyNTU7XHJcblx0XHRcdG9wdHNbXCJjb2xvcl9iXCJdID0gKChoZXggICAgICApICYgMjU1KSAvIDI1NTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0aWYgKHRoaXMuY2FsbGJhY2spIHtcclxuXHRcdFx0dmFyIGNiID0gdGhpcy5jYWxsYmFjaztcclxuXHRcdFx0dGhpcy5jYWxsYmFjayA9IG51bGw7IC8vTWFrZSBzdXJlIHRvIHJlbW92ZSB0aGUgc3RvcmVkIGNhbGxiYWNrIElNTUVERUFURUxZIGxlc3QgaXQgYmUgY2FsbGVkIHR3aWNlIHNvbWVob3cuXHJcblx0XHRcdGNiKCk7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdHZhciB3aWxsQW5pbSA9IGZhbHNlO1xyXG5cdFx0XHJcblx0XHR3aWxsQW5pbSB8PSBzZXRGYWRlKFwib3BhY2l0eVwiLCBvcHRzKTtcclxuXHRcdHdpbGxBbmltIHw9IHNldEZhZGUoXCJjb2xvcl9yXCIsIG9wdHMpO1xyXG5cdFx0d2lsbEFuaW0gfD0gc2V0RmFkZShcImNvbG9yX2dcIiwgb3B0cyk7XHJcblx0XHR3aWxsQW5pbSB8PSBzZXRGYWRlKFwiY29sb3JfYlwiLCBvcHRzKTtcclxuXHRcdFxyXG5cdFx0dGhpcy5zcGVlZCA9IG9wdHNbXCJzcGVlZFwiXSB8fCAxO1xyXG5cdFx0XHJcblx0XHRpZiAod2lsbEFuaW0pIHtcclxuXHRcdFx0dGhpcy5jYWxsYmFjayA9IGNhbGxiYWNrO1xyXG5cdFx0XHR0aGlzLmFuaW1hdGluZyA9IHRydWU7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHQvL1dvbid0IGFuaW1hdGUsIGRvIHRoZSBjYWxsYmFjayBpbW1lZGVhdGVseVxyXG5cdFx0XHRpZiAoY2FsbGJhY2spIGNhbGxiYWNrKCk7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdHJldHVybjtcclxuXHRcdFxyXG5cdFx0ZnVuY3Rpb24gc2V0RmFkZShwcm9wLCBvcHRzKSB7XHJcblx0XHRcdGlmIChvcHRzW3Byb3BdID09PSB1bmRlZmluZWQpIHJldHVybjtcclxuXHRcdFx0c2VsZltwcm9wXS5zcmMgPSBzZWxmW3Byb3BdLmN1cnI7XHJcblx0XHRcdHNlbGZbcHJvcF0uZGVzdCA9IG9wdHNbcHJvcF07XHJcblx0XHRcdGlmIChzZWxmW3Byb3BdLnNyYyAtIHNlbGZbcHJvcF0uZGVzdCA9PSAwKSB7XHJcblx0XHRcdFx0c2VsZltwcm9wXS5hbHBoYSA9IDE7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0c2VsZltwcm9wXS5hbHBoYSA9IDA7XHJcblx0XHRcdH1cclxuXHRcdFx0XHJcblx0XHRcdHJldHVybiBzZWxmW3Byb3BdLmFscGhhID09IDA7XHJcblx0XHR9XHJcblx0fSxcclxuXHRcclxuXHRhZHZhbmNlIDogZnVuY3Rpb24oZGVsdGEpIHtcclxuXHRcdGlmICghdGhpcy5hbmltYXRpbmcpIHJldHVybjtcclxuXHRcdHZhciBzZWxmID0gdGhpcztcclxuXHRcdFxyXG5cdFx0dmFyIHVwZGF0ZWQgPSBmYWxzZTtcclxuXHRcdFxyXG5cdFx0dXBkYXRlZCB8PSBfYW5pbShcIm9wYWNpdHlcIik7XHJcblx0XHR1cGRhdGVkIHw9IF9hbmltKFwiY29sb3JfclwiKTtcclxuXHRcdHVwZGF0ZWQgfD0gX2FuaW0oXCJjb2xvcl9nXCIpO1xyXG5cdFx0dXBkYXRlZCB8PSBfYW5pbShcImNvbG9yX2JcIik7XHJcblx0XHRcclxuXHRcdGlmICh1cGRhdGVkKSB7XHJcblx0XHRcdHRoaXMubW9kZWwubWF0ZXJpYWwub3BhY2l0eSA9IHRoaXMub3BhY2l0eS5jdXJyO1xyXG5cdFx0XHR0aGlzLm1vZGVsLm1hdGVyaWFsLmNvbG9yLnIgPSBNYXRoLmNsYW1wKHRoaXMuY29sb3Jfci5jdXJyKTtcclxuXHRcdFx0dGhpcy5tb2RlbC5tYXRlcmlhbC5jb2xvci5nID0gTWF0aC5jbGFtcCh0aGlzLmNvbG9yX2cuY3Vycik7XHJcblx0XHRcdHRoaXMubW9kZWwubWF0ZXJpYWwuY29sb3IuYiA9IE1hdGguY2xhbXAodGhpcy5jb2xvcl9iLmN1cnIpO1xyXG5cdFx0XHR0aGlzLm1vZGVsLm1hdGVyaWFsLm5lZWRzVXBkYXRlID0gdHJ1ZTtcclxuXHRcdFx0XHJcblx0XHRcdC8vVGhpcyBmaXhlcyBhIHByb2JsZW0gd2hlcmUgdGhlIFNrcmltIGJsb2NrcyByZW5kZXJpbmcgdGhlIGRpYWxvZyBib3hlcyBiZWhpbmQgaXRcclxuXHRcdFx0dGhpcy5tb2RlbC52aXNpYmxlID0gISF0aGlzLm1vZGVsLm1hdGVyaWFsLm9wYWNpdHk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHR0aGlzLmFuaW1hdGluZyA9IGZhbHNlO1xyXG5cdFx0XHRpZiAodGhpcy5jYWxsYmFjaykge1xyXG5cdFx0XHRcdHZhciBjYiA9IHRoaXMuY2FsbGJhY2s7XHJcblx0XHRcdFx0dGhpcy5jYWxsYmFjayA9IG51bGw7XHJcblx0XHRcdFx0Y2IoKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHRyZXR1cm47XHJcblx0XHRcclxuXHRcdGZ1bmN0aW9uIF9hbmltKHByb3ApIHtcclxuXHRcdFx0dmFyIHVwZGF0ZWQgPSBzZWxmW3Byb3BdLmFscGhhIDwgMTtcclxuXHRcdFx0XHJcblx0XHRcdHNlbGZbcHJvcF0uYWxwaGEgKz0gZGVsdGEgKiBzZWxmLnNwZWVkO1xyXG5cdFx0XHRpZiAoc2VsZltwcm9wXS5hbHBoYSA+IDEpIHtcclxuXHRcdFx0XHRzZWxmW3Byb3BdLmFscGhhID0gMTtcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0c2VsZltwcm9wXS5jdXJyID0gc2VsZltwcm9wXS5zcmMgKyAoc2VsZltwcm9wXS5kZXN0IC0gc2VsZltwcm9wXS5zcmMpICogc2VsZltwcm9wXS5hbHBoYTtcclxuXHRcdFx0cmV0dXJuIHVwZGF0ZWQ7XHJcblx0XHR9XHJcblx0fSxcclxuXHRcclxuXHRjcmVhdGVNb2RlbDogZnVuY3Rpb24oKSB7XHJcblx0XHR2YXIgc2VsZiA9IHRoaXM7XHJcblx0XHRcclxuXHRcdHZhciBzdyA9ICQoXCIjZ2FtZXNjcmVlblwiKS53aWR0aCgpKzE7XHJcblx0XHR2YXIgc2ggPSAkKFwiI2dhbWVzY3JlZW5cIikuaGVpZ2h0KCkrMTtcclxuXHRcdFxyXG5cdFx0dmFyIGdlb20gPSBuZXcgVEhSRUUuR2VvbWV0cnkoKTtcclxuXHRcdHtcclxuXHRcdFx0Z2VvbS52ZXJ0aWNlcyA9IFtcclxuXHRcdFx0XHRuZXcgVEhSRUUuVmVjdG9yMygtMSwgLTEsIDMwKSxcclxuXHRcdFx0XHRuZXcgVEhSRUUuVmVjdG9yMyhzdywgLTEsIDMwKSxcclxuXHRcdFx0XHRuZXcgVEhSRUUuVmVjdG9yMyhzdywgc2gsIDMwKSxcclxuXHRcdFx0XHRuZXcgVEhSRUUuVmVjdG9yMygtMSwgc2gsIDMwKSxcclxuXHRcdFx0XTtcclxuXHRcdFx0Z2VvbS5mYWNlcyA9IFtcclxuXHRcdFx0XHRuZXcgVEhSRUUuRmFjZTMoMCwgMSwgMiksXHJcblx0XHRcdFx0bmV3IFRIUkVFLkZhY2UzKDIsIDMsIDApLFxyXG5cdFx0XHRdO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHR2YXIgbWF0ID0gbmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHtcclxuXHRcdFx0Y29sb3I6IDB4MDAwMDAwLFxyXG5cdFx0XHR0cmFuc3BhcmVudDogdHJ1ZSxcclxuXHRcdH0pO1xyXG5cdFx0Ly8gbWF0Lm1vcnBoVGFyZ2V0cyA9IHRydWU7XHJcblx0XHRcclxuXHRcdHRoaXMubW9kZWwgPSBuZXcgVEhSRUUuTWVzaChnZW9tLCBtYXQpO1xyXG5cdFx0dGhpcy5tb2RlbC5yZW5kZXJEZXB0aCA9IC0zMDtcclxuXHRcdHJldHVybiB0aGlzLm1vZGVsO1xyXG5cdH0sXHJcbn0pO1xyXG5cclxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5mdW5jdGlvbiBBamF4TG9hZGVyKCkge1xyXG5cdFxyXG59XHJcbmV4dGVuZChBamF4TG9hZGVyLnByb3RvdHlwZSwge1xyXG5cdG5vZGUgOiBudWxsLFxyXG5cdG1faGVsaXggOiBudWxsLFxyXG5cdG1fcHJvZ3Jlc3MgOiBbXSxcclxuXHRtX3NwaW5uZXIgOiBbXSxcclxuXHRcclxuXHRwcm9ncmVzczogMCxcclxuXHRwcm9ncmVzc190b3RhbDogMTAwLFxyXG5cdG9wYWNpdHk6IDAsXHJcblx0X29wYWNpdHlfc3BlZWQ6IDIsXHJcblx0c3BpbjogMCxcclxuXHRfc3Bpbl9zcGVlZDogOTAwLFxyXG5cdF9zcGluX2ZhbGxvZmY6IDUwMCxcclxuXHRcclxuXHRsZXR0ZXJkZWZzIDogW1xyXG5cdFx0LypcIkFcIiA6Ki8gWzMsIDNdLFxyXG5cdFx0LypcIkJcIiA6Ki8gWzQsIDNdLFxyXG5cdFx0LypcIlhcIiA6Ki8gWzMsIDJdLFxyXG5cdFx0LypcIllcIiA6Ki8gWzQsIDJdLFxyXG5cdFx0LypcIkxcIiA6Ki8gWzAsIDBdLFxyXG5cdFx0LypcIlJcIiA6Ki8gWzEsIDBdLFxyXG5cdFx0LypcIlNcIiA6Ki8gWzIsIDBdLFxyXG5cdFx0LypcIlVBXCI6Ki8gWzMsIDFdLFxyXG5cdFx0LypcIkRBXCI6Ki8gWzQsIDFdLFxyXG5cdFx0LypcIkxBXCI6Ki8gWzMsIDBdLFxyXG5cdFx0LypcIlJBXCI6Ki8gWzQsIDBdLFxyXG5cdF0sXHJcblx0XHJcblx0c2hvdzogZnVuY3Rpb24oKSB7XHJcblx0XHR0aGlzLm9wYWNpdHkgPSAxO1xyXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLm1fcHJvZ3Jlc3MubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0dmFyIHJuZCA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIHRoaXMubGV0dGVyZGVmcy5sZW5ndGgpO1xyXG5cdFx0XHR0aGlzLm1fcHJvZ3Jlc3NbaV0ubWF0ZXJpYWwubWFwLm9mZnNldC5zZXQoXHJcblx0XHRcdFx0KHRoaXMubGV0dGVyZGVmc1tybmRdWzBdICogMTYpIC8gMTI4LCBcclxuXHRcdFx0XHQodGhpcy5sZXR0ZXJkZWZzW3JuZF1bMV0gKiAxNikgLyA2NFxyXG5cdFx0XHQpXHJcblx0XHR9XHJcblx0fSxcclxuXHRcclxuXHRoaWRlOiBmdW5jdGlvbigpIHtcclxuXHRcdHRoaXMub3BhY2l0eSA9IDA7XHJcblx0fSxcclxuXHRcclxuXHRhZHZhbmNlOiBmdW5jdGlvbihkZWx0YSkge1xyXG5cdFx0aWYgKHRoaXMub3BhY2l0eSA9PSAwICYmIHRoaXMubV9oZWxpeC5tYXRlcmlhbC5vcGFjaXR5IDw9IDApIHJldHVybjtcclxuXHRcdFxyXG5cdFx0aWYgKHRoaXMub3BhY2l0eSA+IHRoaXMubV9oZWxpeC5tYXRlcmlhbC5vcGFjaXR5KSB7XHJcblx0XHRcdHRoaXMubV9oZWxpeC5tYXRlcmlhbC5vcGFjaXR5ID1cclxuXHRcdFx0XHRNYXRoLmNsYW1wKHRoaXMubV9oZWxpeC5tYXRlcmlhbC5vcGFjaXR5ICsgZGVsdGEgKiB0aGlzLl9vcGFjaXR5X3NwZWVkKTtcclxuXHRcdH0gZWxzZSBpZiAodGhpcy5vcGFjaXR5IDwgdGhpcy5tX2hlbGl4Lm1hdGVyaWFsLm9wYWNpdHkpIHtcclxuXHRcdFx0dGhpcy5tX2hlbGl4Lm1hdGVyaWFsLm9wYWNpdHkgPSBcclxuXHRcdFx0XHRNYXRoLmNsYW1wKHRoaXMubV9oZWxpeC5tYXRlcmlhbC5vcGFjaXR5IC0gZGVsdGEgKiB0aGlzLl9vcGFjaXR5X3NwZWVkKTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0dmFyIG5sID0gdGhpcy5tX3Byb2dyZXNzLmxlbmd0aDsgLy9udW1iZXIgb2YgbGV0dGVyc1xyXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBubDsgaSsrKSB7XHJcblx0XHRcdC8vdmFyIG8gPSAodGhpcy5wcm9ncmVzcyAvIHRoaXMucHJvZ3Jlc3NfdG90YWwpICogbmw7XHJcblx0XHRcdHZhciBvID0gKHRoaXMucHJvZ3Jlc3NfdG90YWwgLyBubCk7XHJcblx0XHRcdHRoaXMubV9wcm9ncmVzc1tpXS5tYXRlcmlhbC5vcGFjaXR5ID0gdGhpcy5tX2hlbGl4Lm1hdGVyaWFsLm9wYWNpdHkgKiBNYXRoLmNsYW1wKCh0aGlzLnByb2dyZXNzLShvKmkpKSAvIG8pO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHR0aGlzLnNwaW4gKz0gZGVsdGEgKiB0aGlzLl9zcGluX3NwZWVkO1xyXG5cdFx0aWYgKHRoaXMuc3BpbiA+IDgwMCkgdGhpcy5zcGluIC09IDgwMDtcclxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5tX3NwaW5uZXIubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0dmFyIG8gPSB0aGlzLnNwaW4gLSAoaSAqIDEwMCk7XHJcblx0XHRcdGlmIChvIDwgMCkgbyArPSA4MDA7XHJcblx0XHRcdG8gPSAoLW8gKyB0aGlzLl9zcGluX2ZhbGxvZmYpIC8gdGhpcy5fc3Bpbl9mYWxsb2ZmO1xyXG5cdFx0XHR0aGlzLm1fc3Bpbm5lcltpXS5tYXRlcmlhbC5vcGFjaXR5ID0gdGhpcy5tX2hlbGl4Lm1hdGVyaWFsLm9wYWNpdHkgKiBNYXRoLmNsYW1wKG8pO1xyXG5cdFx0XHRcclxuXHRcdFx0aWYgKG8gPCAwKSB7XHJcblx0XHRcdFx0dmFyIHJuZCA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIHRoaXMubGV0dGVyZGVmcy5sZW5ndGgpO1xyXG5cdFx0XHRcdHRoaXMubV9zcGlubmVyW2ldLm1hdGVyaWFsLm1hcC5vZmZzZXQuc2V0KFxyXG5cdFx0XHRcdFx0KHRoaXMubGV0dGVyZGVmc1tybmRdWzBdICogMTYpIC8gMTI4LCBcclxuXHRcdFx0XHRcdCh0aGlzLmxldHRlcmRlZnNbcm5kXVsxXSAqIDE2KSAvIDY0XHJcblx0XHRcdFx0KVxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fSxcclxuXHRcclxuXHRjcmVhdGVNb2RlbDogZnVuY3Rpb24oKXtcclxuXHRcdHZhciBzZWxmID0gdGhpcztcclxuXHRcdHZhciBzdyA9ICQoXCIjZ2FtZXNjcmVlblwiKS53aWR0aCgpO1xyXG5cdFx0dmFyIHNoID0gJChcIiNnYW1lc2NyZWVuXCIpLmhlaWdodCgpO1xyXG5cdFx0XHJcblx0XHR0aGlzLm5vZGUgPSBuZXcgVEhSRUUuT2JqZWN0M0QoKTtcclxuXHRcdFxyXG5cdFx0dmFyIGdlb20gPSBuZXcgVEhSRUUuUGxhbmVCdWZmZXJHZW9tZXRyeSg4LCA4KTtcclxuXHRcdFxyXG5cdFx0dmFyIHRleCA9IG5ldyBUSFJFRS5UZXh0dXJlKEFKQVhfVEVYVFVSRV9JTUcpO1xyXG5cdFx0dGV4Lm1hZ0ZpbHRlciA9IFRIUkVFLk5lYXJlc3RGaWx0ZXI7XHJcblx0XHR0ZXgubWluRmlsdGVyID0gVEhSRUUuTmVhcmVzdEZpbHRlcjtcclxuXHRcdHRleC5yZXBlYXQgPSBuZXcgVEhSRUUuVmVjdG9yMig0OC8xMjgsIDQ4LzY0KTtcclxuXHRcdHRleC5vZmZzZXQgPSBuZXcgVEhSRUUuVmVjdG9yMigwLCAxNi82NCk7IC8vUmVtZW1iZXIsIGJvdHRvbSByaWdodCBpcyBvcmlnaW5cclxuXHRcdHRleC5nZW5lcmF0ZU1pcG1hcHMgPSBmYWxzZTtcclxuXHRcdF9lbnN1cmVVcGRhdGUodGV4KTtcclxuXHRcdFxyXG5cdFx0dmFyIG1hdCA9IG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7XHJcblx0XHRcdG1hcDogdGV4LFxyXG5cdFx0XHR0cmFuc3BhcmVudDogdHJ1ZSxcclxuXHRcdFx0b3BhY2l0eTogMCxcclxuXHRcdH0pO1xyXG5cdFx0XHJcblx0XHR0aGlzLm1faGVsaXggPSBuZXcgVEhSRUUuTWVzaChnZW9tLCBtYXQpO1xyXG5cdFx0dGhpcy5tX2hlbGl4LnNjYWxlLnNldCgzLCAzLCAzKTtcclxuXHRcdHRoaXMubV9oZWxpeC5wb3NpdGlvbi5zZXQoMTYrMjQsIHNoLTI0LTE2LCA0MCk7XHJcblx0XHR0aGlzLm1faGVsaXgucmVuZGVyRGVwdGggPSAtNDA7XHJcblx0XHR0aGlzLm5vZGUuYWRkKHRoaXMubV9oZWxpeCk7XHJcblx0XHRcclxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgODsgaSsrKSB7XHJcblx0XHRcdHRoaXMubV9zcGlubmVyW2ldID0gX2NyZWF0ZUxldHRlcigpO1xyXG5cdFx0XHR0aGlzLm1fc3Bpbm5lcltpXS5wb3NpdGlvbi5zZXQoXHJcblx0XHRcdFx0dGhpcy5tX2hlbGl4LnBvc2l0aW9uLnggKyAoTWF0aC5zaW4oaSooTWF0aC5QSS80KSkgKiAyNCksXHJcblx0XHRcdFx0dGhpcy5tX2hlbGl4LnBvc2l0aW9uLnkgKyAoTWF0aC5jb3MoaSooTWF0aC5QSS80KSkgKiAyNCksIFxyXG5cdFx0XHRcdDM5KTtcclxuXHRcdFx0dGhpcy5tX3NwaW5uZXJbaV0ucmVuZGVyRGVwdGggPSAtNDA7XHJcblx0XHRcdFxyXG5cdFx0XHR2YXIgcm5kID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogdGhpcy5sZXR0ZXJkZWZzLmxlbmd0aCk7XHJcblx0XHRcdHRoaXMubV9zcGlubmVyW2ldLm1hdGVyaWFsLm1hcC5vZmZzZXQuc2V0KFxyXG5cdFx0XHRcdCh0aGlzLmxldHRlcmRlZnNbcm5kXVswXSAqIDE2KSAvIDEyOCwgXHJcblx0XHRcdFx0KHRoaXMubGV0dGVyZGVmc1tybmRdWzFdICogMTYpIC8gNjRcclxuXHRcdFx0KVxyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IDEwOyBpKyspIHtcclxuXHRcdFx0dGhpcy5tX3Byb2dyZXNzW2ldID0gX2NyZWF0ZUxldHRlcigpO1xyXG5cdFx0XHR0aGlzLm1fcHJvZ3Jlc3NbaV0ucG9zaXRpb24uc2V0KFxyXG5cdFx0XHRcdHRoaXMubV9oZWxpeC5wb3NpdGlvbi54KzQ0KyhpKjE2KSwgXHJcblx0XHRcdFx0dGhpcy5tX2hlbGl4LnBvc2l0aW9uLnksIDQwKTtcclxuXHRcdFx0dGhpcy5tX3Byb2dyZXNzW2ldLnJlbmRlckRlcHRoID0gLTQwO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHRyZXR1cm4gdGhpcy5ub2RlO1xyXG5cdFx0XHJcblx0XHRmdW5jdGlvbiBfY3JlYXRlTGV0dGVyKCkge1xyXG5cdFx0XHR2YXIgdGV4ID0gbmV3IFRIUkVFLlRleHR1cmUoQUpBWF9URVhUVVJFX0lNRyk7XHJcblx0XHRcdHRleC5tYWdGaWx0ZXIgPSBUSFJFRS5OZWFyZXN0RmlsdGVyO1xyXG5cdFx0XHR0ZXgubWluRmlsdGVyID0gVEhSRUUuTmVhcmVzdEZpbHRlcjtcclxuXHRcdFx0dGV4LndyYXBTID0gVEhSRUUuUmVwZWF0V3JhcHBpbmc7XHJcblx0XHRcdHRleC53cmFwVCA9IFRIUkVFLlJlcGVhdFdyYXBwaW5nO1xyXG5cdFx0XHR0ZXgucmVwZWF0ID0gbmV3IFRIUkVFLlZlY3RvcjIoMTYvMTI4LCAxNi82NCk7XHJcblx0XHRcdHRleC5vZmZzZXQgPSBuZXcgVEhSRUUuVmVjdG9yMigwLCAwKTtcclxuXHRcdFx0dGV4LmdlbmVyYXRlTWlwbWFwcyA9IGZhbHNlO1xyXG5cdFx0XHRfZW5zdXJlVXBkYXRlKHRleCk7XHJcblx0XHRcdFxyXG5cdFx0XHR2YXIgbWF0ID0gbmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHtcclxuXHRcdFx0XHRtYXA6IHRleCxcclxuXHRcdFx0XHR0cmFuc3BhcmVudDogdHJ1ZSxcclxuXHRcdFx0XHRvcGFjaXR5OiAwLFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0XHJcblx0XHRcdHZhciBtZXNoID0gbmV3IFRIUkVFLk1lc2goZ2VvbSwgbWF0KTtcclxuXHRcdFx0c2VsZi5ub2RlLmFkZChtZXNoKTtcclxuXHRcdFx0cmV0dXJuIG1lc2g7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdGZ1bmN0aW9uIF9lbnN1cmVVcGRhdGUodGV4KSB7XHJcblx0XHRcdEFKQVhfVEVYVFVSRV9JTUcub24oXCJsb2FkXCIsIGZ1bmN0aW9uKCl7XHJcblx0XHRcdFx0dGV4Lm5lZWRzVXBkYXRlID0gdHJ1ZTtcclxuXHRcdFx0fSk7XHJcblx0XHRcdHRleC5uZWVkc1VwZGF0ZSA9IHRydWU7XHJcblx0XHR9XHJcblx0fSxcclxufSk7XHJcblxyXG5cclxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cclxuZnVuY3Rpb24gY3JlYXRlREVCVUdTZXR1cCgpIHtcclxuXHR0aGlzLl9tYWluQ2FtZXJhID0gdGhpcy5jYW1lcmE7XHJcblx0dGhpcy5fZGVidWdDYW1lcmEgPSB0aGlzLmNhbWVyYSA9IG5ldyBUSFJFRS5QZXJzcGVjdGl2ZUNhbWVyYSg3NSwgXHJcblx0XHQkKFwiI2dhbWVzY3JlZW5cIikud2lkdGgoKS8gJChcIiNnYW1lc2NyZWVuXCIpLmhlaWdodCgpLFxyXG5cdFx0MC4xLCAxMDAwMCk7XHJcblx0dGhpcy5fZGVidWdDYW1lcmEucG9zaXRpb24ueiA9IDEwO1xyXG5cdHRoaXMuc2NlbmUuYWRkKHRoaXMuX2RlYnVnQ2FtZXJhKTtcclxuXHRcclxuXHRcclxuXHR0aGlzLnNjZW5lLmFkZChuZXcgVEhSRUUuQ2FtZXJhSGVscGVyKHRoaXMuX21haW5DYW1lcmEpKTtcclxuXHR0aGlzLnNjZW5lLmFkZChuZXcgVEhSRUUuQXhpc0hlbHBlcig1KSk7XHJcblx0XHJcblx0dmFyIGNvbnRyb2xzID0gbmV3IFRIUkVFLk9yYml0Q29udHJvbHModGhpcy5fZGVidWdDYW1lcmEpO1xyXG5cdGNvbnRyb2xzLmRhbXBpbmcgPSAwLjI7XHJcblx0XHJcblx0dmFyIG9sZGxvZ2ljID0gdGhpcy5sb2dpY0xvb3A7XHJcblx0dGhpcy5sb2dpY0xvb3AgPSBmdW5jdGlvbihkZWx0YSl7XHJcblx0XHRjb250cm9scy51cGRhdGUoKTtcclxuXHRcdG9sZGxvZ2ljLmNhbGwodGhpcywgZGVsdGEpO1xyXG5cdH07XHJcbn1cclxuXHJcbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxubW9kdWxlLmV4cG9ydHMgPSBuZXcgVUlNYW5hZ2VyKCk7XHJcbiIsIi8vIG1hcC5qc1xyXG5cclxudmFyIGluaGVyaXRzID0gcmVxdWlyZShcImluaGVyaXRzXCIpO1xyXG52YXIgZXh0ZW5kID0gcmVxdWlyZShcImV4dGVuZFwiKTtcclxudmFyIG5kYXJyYXkgPSByZXF1aXJlKFwibmRhcnJheVwiKTtcclxudmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoXCJldmVudHNcIikuRXZlbnRFbWl0dGVyO1xyXG5cclxudmFyIEV2ZW50ID0gcmVxdWlyZShcInRwcC1ldmVudFwiKTtcclxudmFyIFBsYXllckNoYXIgPSByZXF1aXJlKFwidHBwLXBjXCIpO1xyXG5cclxudmFyIE9iakxvYWRlciA9IHJlcXVpcmUoXCIuL21vZGVsL29iai1sb2FkZXJcIik7XHJcblxyXG52YXIgc2V0dXBNYXBSaWdnaW5nID0gcmVxdWlyZShcIi4vbW9kZWwvbWFwLXNldHVwXCIpO1xyXG5cclxuXHJcbi8vIFRoZXNlIHdvdWxkIGJlIENPTlNUcyBpZiB3ZSB3ZXJlbid0IGluIHRoZSBicm93c2VyXHJcbnZhciBFWFRfTUFQQlVORExFID0gXCIuemlwXCI7IC8vRXh0ZW5zaW9uIGZvciByZXF1ZXN0aW5nIG1hcCBidW5kbGVzXHJcbnZhciBERUZfSEVJR0hUX1NURVAgPSAwLjU7IC8vRGVmYXVsdCBZIHRyYW5zbGF0aW9uIGFtb3VudCBhIGhlaWdodCBzdGVwIHRha2VzLiBUaGlzIGNhbiBiZSBkZWZpbmVkIGluIGEgbWFwIGZpbGUuXHJcblxyXG5cclxuLy8gSWYgeW91IG1ha2UgYW55IGNoYW5nZXMgaGVyZSwgbWFrZSBzdXJlIHRvIG1pcnJvciB0aGVtIGluIGJ1aWxkL21hcC16aXBwZXIuanMhXHJcbmZ1bmN0aW9uIGNvbnZlcnRTaG9ydFRvVGlsZVByb3BzKHZhbCkge1xyXG5cdC8vIFRpbGVEYXRhOiBNTU1NTFcwMCBUVFRISEhISFxyXG5cdC8vIFdoZXJlOlxyXG5cdC8vICAgIE0gPSBNb3ZlbWVudCwgQml0cyBhcmU6IChEb3duLCBVcCwgTGVmdCwgUmlnaHQpXHJcblx0Ly8gICAgTCA9IExlZGdlIGJpdCAodGhpcyB0aWxlIGlzIGEgbGVkZ2U6IHlvdSBqdW1wIG92ZXIgaXQgd2hlbiBnaXZlbiBwZXJtaXNzaW9uIHRvIGVudGVyIGl0KVxyXG5cdC8vICAgIFcgPSBXYXRlciBiaXQgKHRoaXMgdGlsZSBpcyB3YXRlcjogbW9zdCBhY3RvcnMgYXJlIGRlbmllZCBlbnRyeSBvbnRvIHRoaXMgdGlsZSlcclxuXHQvLyAgICBIID0gSGVpZ2h0ICh2ZXJ0aWNhbCBsb2NhdGlvbiBvZiB0aGUgY2VudGVyIG9mIHRoaXMgdGlsZSlcclxuXHQvLyAgICBUID0gVHJhbnNpdGlvbiBUaWxlICh0cmFuc2l0aW9uIHRvIGFub3RoZXIgTGF5ZXIgd2hlbiBzdGVwcGluZyBvbiB0aGlzIHRpbGUpXHJcblx0dmFyIHByb3BzID0ge307XHJcblx0XHJcblx0dmFyIG1vdmVtZW50ID0gKCh2YWwgPj4gMTIpICYgMHhGKTtcclxuXHQvLyBtb3ZlbWVudCBpcyBibG9ja2VkIGlmIGEgbW92ZW1lbnQgZmxhZyBpcyB0cnVlOlxyXG5cdHByb3BzLm1vdmVtZW50ID0ge307XHJcblx0cHJvcHMubW92ZW1lbnRbXCJkb3duXCJdICA9ICEhKG1vdmVtZW50ICYgMHg4KTtcclxuXHRwcm9wcy5tb3ZlbWVudFtcInVwXCJdICAgID0gISEobW92ZW1lbnQgJiAweDQpO1xyXG5cdHByb3BzLm1vdmVtZW50W1wibGVmdFwiXSAgPSAhIShtb3ZlbWVudCAmIDB4Mik7XHJcblx0cHJvcHMubW92ZW1lbnRbXCJyaWdodFwiXSA9ICEhKG1vdmVtZW50ICYgMHgxKTtcclxuXHRcclxuXHRwcm9wcy5pc1dhbGthYmxlID0gISEofm1vdmVtZW50ICYgMHhGKTtcclxuXHRwcm9wcy5pc0xlZGdlID0gISEodmFsICYgKDB4MSA8PCAxMSkpO1xyXG5cdHByb3BzLmlzV2F0ZXIgPSAhISh2YWwgJiAoMHgxIDw8IDEwKSk7XHJcblx0XHJcblx0cHJvcHMudHJhbnNpdGlvbiA9ICgodmFsID4+IDUpICYgMHg3KTtcclxuXHRcclxuXHRwcm9wcy5oZWlnaHQgPSAoKHZhbCkgJiAweDFGKTtcclxuXHRcclxuXHRwcm9wcy5ub05QQyA9ICEhKHZhbCAmICgweDEgPDwgOSkpO1xyXG5cdFxyXG5cdHJldHVybiBwcm9wcztcclxufVxyXG5cclxuXHJcblxyXG4vKipcclxuICpcclxuICpcclxuICpcclxuICpcclxuICovXHJcbmZ1bmN0aW9uIE1hcChpZCwgb3B0cyl7XHJcblx0dGhpcy5pZCA9IGlkO1xyXG5cdGV4dGVuZCh0aGlzLCBvcHRzKTtcclxuXHRcclxuXHRHQy5hbGxvY2F0ZUJpbihcIm1hcF9cIitpZCk7XHJcblx0dGhpcy5nYyA9IEdDLmdldEJpbihcIm1hcF9cIitpZCk7XHJcblx0XHJcblx0dGhpcy5maWxlU3lzID0gbmV3IHppcC5mcy5GUygpO1xyXG59XHJcbmluaGVyaXRzKE1hcCwgRXZlbnRFbWl0dGVyKTtcclxuZXh0ZW5kKE1hcC5wcm90b3R5cGUsIHtcclxuXHRpZCA6IG51bGwsIC8vbWFwJ3MgaW50ZXJuYWwgaWRcclxuXHRcclxuXHRmaWxlOiBudWxsLCAvL1ppcCBmaWxlIGhvbGRpbmcgYWxsIGRhdGFcclxuXHRmaWxlU3lzOiBudWxsLCAvL0N1cnJlbnQgemlwIGZpbGUgc3lzdGVtIGZvciB0aGlzIG1hcFxyXG5cdHhocjogbnVsbCwgLy9hY3RpdmUgeGhyIHJlcXVlc3RcclxuXHRsb2FkRXJyb3IgOiBudWxsLFxyXG5cdFxyXG5cdG1ldGFkYXRhIDogbnVsbCxcclxuXHRvYmpkYXRhIDogbnVsbCxcclxuXHRtdGxkYXRhIDogbnVsbCxcclxuXHRcclxuXHRsU2NyaXB0VGFnIDogbnVsbCxcclxuXHRnU2NyaXB0VGFnIDogbnVsbCxcclxuXHRcclxuXHRjYW1lcmE6IG51bGwsXHJcblx0Y2FtZXJhczogbnVsbCxcclxuXHRzY2VuZTogbnVsbCxcclxuXHRtYXBtb2RlbDogbnVsbCxcclxuXHRcclxuXHRzcHJpdGVOb2RlOiBudWxsLFxyXG5cdGxpZ2h0Tm9kZTogbnVsbCxcclxuXHRjYW1lcmFOb2RlOiBudWxsLFxyXG5cdFxyXG5cdC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cdC8vIExvYWQgTWFuYWdlbWVudCBcclxuXHQvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHRcclxuXHRkaXNwb3NlIDogZnVuY3Rpb24oKXtcclxuXHRcdCQodGhpcy5sU2NyaXB0VGFnKS5yZW1vdmUoKTtcclxuXHRcdCQodGhpcy5nU2NyaXB0VGFnKS5yZW1vdmUoKTtcclxuXHRcdFxyXG5cdFx0aWYgKHBsYXllciAmJiBwbGF5ZXIucGFyZW50KSBwbGF5ZXIucGFyZW50LnJlbW92ZShwbGF5ZXIpO1xyXG5cdFx0XHJcblx0XHRkZWxldGUgdGhpcy5maWxlO1xyXG5cdFx0ZGVsZXRlIHRoaXMuZmlsZVN5cztcclxuXHRcdGRlbGV0ZSB0aGlzLnhocjtcclxuXHRcdGRlbGV0ZSB0aGlzLmxvYWRFcnJvcjtcclxuXHRcdFxyXG5cdFx0ZGVsZXRlIHRoaXMubWV0YWRhdGE7XHJcblx0XHRkZWxldGUgdGhpcy5vYmpkYXRhO1xyXG5cdFx0ZGVsZXRlIHRoaXMubXRsZGF0YTtcclxuXHRcdFxyXG5cdFx0ZGVsZXRlIHRoaXMubFNjcmlwdFRhZztcclxuXHRcdGRlbGV0ZSB0aGlzLmdTY3JpcHRUYWc7XHJcblx0XHRcclxuXHRcdGRlbGV0ZSB0aGlzLnRpbGVkYXRhO1xyXG5cdFx0XHJcblx0XHRkZWxldGUgdGhpcy5zY2VuZTtcclxuXHRcdGRlbGV0ZSB0aGlzLm1hcG1vZGVsO1xyXG5cdFx0ZGVsZXRlIHRoaXMuY2FtZXJhO1xyXG5cdFx0XHJcblx0XHRkZWxldGUgdGhpcy5zcHJpdGVOb2RlO1xyXG5cdFx0ZGVsZXRlIHRoaXMubGlnaHROb2RlO1xyXG5cdFx0ZGVsZXRlIHRoaXMuY2FtZXJhTm9kZTtcclxuXHRcdFxyXG5cdFx0dGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoKTtcclxuXHRcdHRoaXMuZ2MuZGlzcG9zZSgpO1xyXG5cdFx0ZGVsZXRlIHRoaXMuZ2M7XHJcblx0fSxcclxuXHRcclxuXHQvKiogQmVnaW4gZG93bmxvYWQgb2YgdGhpcyBtYXAncyB6aXAgZmlsZSwgcHJlbG9hZGluZyB0aGUgZGF0YS4gKi9cclxuXHRkb3dubG9hZCA6IGZ1bmN0aW9uKCl7XHJcblx0XHRpZiAodGhpcy5maWxlKSByZXR1cm47IC8vd2UgaGF2ZSB0aGUgZmlsZSBpbiBtZW1vcnkgYWxyZWFkeSwgZG8gbm90aGluZ1xyXG5cdFx0aWYgKHRoaXMueGhyKSByZXR1cm47IC8vYWxyZWFkeSBnb3QgYW4gYWN0aXZlIHJlcXVlc3QsIGRvIG5vdGhpbmdcclxuXHRcdFxyXG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xyXG5cdFx0dmFyIHhociA9IHRoaXMueGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XHJcblx0XHR4aHIub3BlbihcIkdFVFwiLCBCQVNFVVJMK1wiL21hcHMvXCIrdGhpcy5pZCtFWFRfTUFQQlVORExFKTtcclxuXHRcdC8vIGNvbnNvbGUubG9nKFwiWEhSOiBcIiwgeGhyKTtcclxuXHRcdHhoci5yZXNwb25zZVR5cGUgPSBcImJsb2JcIjtcclxuXHRcdHhoci5vbihcImxvYWRcIiwgZnVuY3Rpb24oZSkge1xyXG5cdFx0XHQvLyBjb25zb2xlLmxvZyhcIkxPQUQ6XCIsIGUpO1xyXG5cdFx0XHRpZiAoeGhyLnN0YXR1cyA9PSAyMDApIHtcclxuXHRcdFx0XHRzZWxmLmZpbGUgPSB4aHIucmVzcG9uc2U7XHJcblx0XHRcdFx0c2VsZi5lbWl0KFwiZG93bmxvYWRlZFwiKTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRjb25zb2xlLmVycm9yKFwiRVJST1I6XCIsIHhoci5zdGF0dXNUZXh0KTtcclxuXHRcdFx0XHRzZWxmLmxvYWRFcnJvciA9IHhoci5zdGF0dXNUZXh0O1xyXG5cdFx0XHRcdHNlbGYuZW1pdChcImxvYWQtZXJyb3JcIiwgeGhyLnN0YXR1c1RleHQpO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHRcdHhoci5vbihcInByb2dyZXNzXCIsIGZ1bmN0aW9uKGUpe1xyXG5cdFx0XHQvLyBjb25zb2xlLmxvZyhcIlBST0dSRVNTOlwiLCBlKTtcclxuXHRcdFx0aWYgKGUubGVuZ3RoQ29tcHV0YWJsZSkge1xyXG5cdFx0XHRcdC8vIHZhciBwZXJjZW50RG9uZSA9IGUubG9hZGVkIC8gZS50b3RhbDtcclxuXHRcdFx0XHRzZWxmLmVtaXQoXCJwcm9ncmVzc1wiLCBlLmxvYWRlZCwgZS50b3RhbCk7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0Ly9tYXJxdWVlIGJhclxyXG5cdFx0XHRcdHNlbGYuZW1pdChcInByb2dyZXNzXCIsIC0xKTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblx0XHR4aHIub24oXCJlcnJvclwiLCBmdW5jdGlvbihlKXtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihcIkVSUk9SOlwiLCBlKTtcclxuXHRcdFx0c2VsZi5sb2FkRXJyb3IgPSBlO1xyXG5cdFx0XHR0aGlzLmVtaXQoXCJsb2FkLWVycm9yXCIsIGUpO1xyXG5cdFx0fSk7XHJcblx0XHR4aHIub24oXCJjYW5jZWxlZFwiLCBmdW5jdGlvbihlKXtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihcIkNBTkNFTEVEOlwiLCBlKTtcclxuXHRcdFx0c2VsZi5sb2FkRXJyb3IgPSBlO1xyXG5cdFx0XHR0aGlzLmVtaXQoXCJsb2FkLWVycm9yXCIsIGUpO1xyXG5cdFx0fSk7XHJcblx0XHQvL1RPRE8gb24gZXJyb3IgYW5kIG9uIGNhbmNlbGVkXHJcblx0XHRcclxuXHRcdHhoci5zZW5kKCk7XHJcblx0fSxcclxuXHRcclxuXHQvKipcclxuXHQgKiAgUmVhZHMgdGhlIHRpbGUgZGF0YSBhbmQgYmVnaW5zIGxvYWRpbmcgdGhlIHJlcXVpcmVkIHJlc291cmNlcy5cclxuXHQgKi9cclxuXHRsb2FkIDogZnVuY3Rpb24oKXtcclxuXHRcdHZhciBzZWxmID0gdGhpcztcclxuXHRcdGlmICghdGhpcy5maWxlKSB7IC8vSWYgZmlsZSBpc24ndCBkb3dubG9hZGVkIHlldCwgZGVmZXIgbG9hZGluZ1xyXG5cdFx0XHR0aGlzLm9uY2UoXCJkb3dubG9hZGVkXCIsIGZ1bmN0aW9uKCl7XHJcblx0XHRcdFx0c2VsZi5sb2FkKCk7XHJcblx0XHRcdH0pO1xyXG5cdFx0XHR0aGlzLmRvd25sb2FkKCk7XHJcblx0XHRcdC8vVE9ETyB0aHJvdyB1cCBsb2FkaW5nIGdpZlxyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdHRoaXMubWFya0xvYWRpbmcoXCJNQVBfbWFwZGF0YVwiKTtcclxuXHRcdHZhciBfdGV4c0xvYWRlZCA9IGZhbHNlO1xyXG5cdFx0XHJcblx0XHR0aGlzLmZpbGVTeXMuaW1wb3J0QmxvYih0aGlzLmZpbGUsIGZ1bmN0aW9uIHN1Y2Nlc3MoKXtcclxuXHRcdFx0Ly9sb2FkIHVwIHRoZSBtYXAhXHJcblx0XHRcdHNlbGYuZmlsZVN5cy5yb290LmdldENoaWxkQnlOYW1lKFwibWFwLmpzb25cIikuZ2V0VGV4dChfX2pzb25Mb2FkZWQsIF9fbG9nUHJvZ3Jlc3MpO1xyXG5cdFx0XHRzZWxmLmZpbGVTeXMucm9vdC5nZXRDaGlsZEJ5TmFtZShcIm1hcC5vYmpcIikuZ2V0VGV4dChfX29iakxvYWRlZCwgX19sb2dQcm9ncmVzcyk7XHJcblx0XHRcdHNlbGYuZmlsZVN5cy5yb290LmdldENoaWxkQnlOYW1lKFwibWFwLm10bFwiKS5nZXRUZXh0KF9fbXRsTG9hZGVkLCBfX2xvZ1Byb2dyZXNzKTtcclxuXHRcdFx0XHJcblx0XHR9LCBmdW5jdGlvbiBlcnJvcihlKXtcclxuXHRcdFx0Y29uc29sZS5sb2coXCJFUlJPUjogXCIsIGUpO1xyXG5cdFx0XHRzZWxmLmVtaXQoXCJsb2FkLWVycm9yXCIpOyAvL1NlbmQgdG8gdGhlIGRvcml0byBkdW5nZW9uXHJcblx0XHR9KTtcclxuXHRcdHJldHVybjsgXHJcblx0XHRcclxuXHRcdGZ1bmN0aW9uIF9fbG9nUHJvZ3Jlc3MoKSB7XHJcblx0XHRcdGNvbnNvbGUubG9nKFwiUFJPR1JFU1NcIiwgYXJndW1lbnRzKTtcclxuXHRcdH1cclxuXHRcdC8vQ2FsbGJhY2sgY2hhaW4gYmVsb3dcclxuXHRcdGZ1bmN0aW9uIF9fanNvbkxvYWRlZChkYXRhKSB7XHJcblx0XHRcdHNlbGYubWV0YWRhdGEgPSBKU09OLnBhcnNlKGRhdGEpO1xyXG5cdFx0XHRcclxuXHRcdFx0c2VsZi50aWxlZGF0YSA9IG5kYXJyYXkoc2VsZi5tZXRhZGF0YS5tYXAsIFtzZWxmLm1ldGFkYXRhLndpZHRoLCBzZWxmLm1ldGFkYXRhLmhlaWdodF0sIFsxLCBzZWxmLm1ldGFkYXRhLndpZHRoXSk7XHJcblx0XHRcdGlmIChzZWxmLm1ldGFkYXRhW1wiaGVpZ2h0c3RlcFwiXSA9PT0gdW5kZWZpbmVkKSB7XHJcblx0XHRcdFx0c2VsZi5tZXRhZGF0YVtcImhlaWdodHN0ZXBcIl0gPSBERUZfSEVJR0hUX1NURVA7XHJcblx0XHRcdH1cclxuXHRcdFx0XHJcblx0XHRcdGlmIChzZWxmLm1ldGFkYXRhW1wiYmdtdXNpY1wiXSAhPT0gdW5kZWZpbmVkKSB7XHJcblx0XHRcdFx0c2VsZi5fbG9hZE11c2ljKHNlbGYubWV0YWRhdGFbXCJiZ211c2ljXCJdKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0c2VsZi5lbWl0KFwibG9hZGVkLW1ldGFcIik7XHJcblx0XHRcdF9fbG9hZERvbmUoKTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0ZnVuY3Rpb24gX19vYmpMb2FkZWQoZGF0YSkge1xyXG5cdFx0XHRzZWxmLm9iamRhdGEgPSBkYXRhO1xyXG5cdFx0XHRfX21vZGVsTG9hZGVkKCk7XHJcblx0XHR9XHJcblx0XHRmdW5jdGlvbiBfX210bExvYWRlZChkYXRhKSB7XHJcblx0XHRcdHNlbGYubXRsZGF0YSA9IGRhdGE7XHJcblx0XHRcdF9fbW9kZWxMb2FkZWQoKTtcclxuXHRcdH1cclxuXHRcdGZ1bmN0aW9uIF9fbW9kZWxMb2FkZWQoKSB7XHJcblx0XHRcdGlmICghc2VsZi5vYmpkYXRhIHx8ICFzZWxmLm10bGRhdGEpIHJldHVybjsgLy9kb24ndCBiZWdpbiBwYXJzaW5nIHVudGlsIHRoZXkncmUgYm90aCBsb2FkZWRcclxuXHRcdFx0XHJcblx0XHRcdHNlbGYub25Bc3NldFR5cGVMb2FkZWQoXCJNQVBURVhcIiwgZnVuY3Rpb24oKXtcclxuXHRcdFx0XHRfdGV4c0xvYWRlZCA9IHRydWU7XHJcblx0XHRcdFx0X19sb2FkRG9uZSgpO1xyXG5cdFx0XHR9KTtcclxuXHRcdFx0XHJcblx0XHRcdGZ1bmN0aW9uIGxvYWRUZXh0dXJlKGZpbGVuYW1lLCBjYWxsYmFjaykge1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKFwibG9hZFRleCEgXCIsIGZpbGVuYW1lKTtcclxuXHRcdFx0XHR2YXIgZmlsZSA9IHNlbGYuZmlsZVN5cy5yb290LmdldENoaWxkQnlOYW1lKGZpbGVuYW1lKTtcclxuXHRcdFx0XHRpZiAoIWZpbGUpIHtcclxuXHRcdFx0XHRcdGNvbnNvbGUuZXJyb3IoXCJFUlJPUiBMT0FESU5HIFRFWFRVUkU6IE5vIHN1Y2ggZmlsZSBpbiBtYXAgYnVuZGxlISBcIitmaWxlbmFtZSk7XHJcblx0XHRcdFx0XHRjYWxsYmFjayhERUZfVEVYVFVSRSk7XHJcblx0XHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGZpbGUuZ2V0QmxvYihcImltYWdlL3BuZ1wiLCBmdW5jdGlvbihkYXRhKSB7XHJcblx0XHRcdFx0XHRjb25zb2xlLmxvZyhcImxvYWRUZXghIEZJTklTSCBcIiwgZmlsZW5hbWUpO1xyXG5cdFx0XHRcdFx0dmFyIHVybCA9IFVSTC5jcmVhdGVPYmplY3RVUkwoZGF0YSk7XHJcblx0XHRcdFx0XHRzZWxmLmdjLmNvbGxlY3RVUkwodXJsKTtcclxuXHRcdFx0XHRcdGNhbGxiYWNrKHVybCk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHRcdFx0XHJcblx0XHRcdHZhciBvYmpsZHIgPSBuZXcgT2JqTG9hZGVyKHNlbGYub2JqZGF0YSwgc2VsZi5tdGxkYXRhLCBsb2FkVGV4dHVyZSwge1xyXG5cdFx0XHRcdGdjOiBzZWxmLmdjLFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0b2JqbGRyLm9uKFwibG9hZFwiLCBfX21vZGVsUmVhZHkpO1xyXG5cdFx0XHRvYmpsZHIubG9hZCgpO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHRmdW5jdGlvbiBfX21vZGVsUmVhZHkob2JqKSB7XHJcblx0XHRcdHNlbGYubWFwbW9kZWwgPSBvYmo7XHJcblx0XHRcdC8vIF9fdGVzdF9fb3V0cHV0VHJlZShvYmopO1xyXG5cdFx0XHRzZWxmLm9iamRhdGEgPSBzZWxmLm10bGRhdGEgPSB0cnVlOyAvL3dpcGUgdGhlIGJpZyBzdHJpbmdzIGZyb20gbWVtb3J5XHJcblx0XHRcdHNlbGYuZW1pdChcImxvYWRlZC1tb2RlbFwiKTtcclxuXHRcdFx0X19sb2FkRG9uZSgpO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHRmdW5jdGlvbiBfX2xvYWREb25lKCkge1xyXG5cdFx0XHQvLyBjb25zb2xlLmxvZyhcIl9fbG9hZERvbmVcIiwgISFzZWxmLm1hcG1vZGVsLCAhIXNlbGYudGlsZWRhdGEpO1xyXG5cdFx0XHRpZiAoIXNlbGYubWFwbW9kZWwgfHwgIXNlbGYudGlsZWRhdGEgfHwgIV90ZXhzTG9hZGVkKSByZXR1cm47IC8vZG9uJ3QgY2FsbCBvbiBfaW5pdCBiZWZvcmUgYm90aCBhcmUgbG9hZGVkXHJcblx0XHRcdFxyXG5cdFx0XHRzZWxmLl9pbml0KCk7XHJcblx0XHRcdHNlbGYubWFya0xvYWRGaW5pc2hlZChcIk1BUF9tYXBkYXRhXCIpO1xyXG5cdFx0fVxyXG5cdH0sXHJcblx0XHJcblx0XHJcblx0X2xvYWRNdXNpYzogZnVuY3Rpb24obXVzaWNkZWYpIHtcclxuXHRcdHZhciBzZWxmID0gdGhpcztcclxuXHRcdFxyXG5cdFx0aWYgKCFtdXNpY2RlZikgcmV0dXJuO1xyXG5cdFx0aWYgKCEkLmlzQXJyYXkobXVzaWNkZWYpKSBtdXNpY2RlZiA9IFttdXNpY2RlZl07XHJcblx0XHRcclxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgbXVzaWNkZWYubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0aWYgKFNvdW5kTWFuYWdlci5pc011c2ljTG9hZGVkKG11c2ljZGVmW2ldLmlkKSkgY29udGludWU7IC8vbXVzaWMgYWxyZWFkeSBsb2FkZWRcclxuXHRcdFx0X19sb2FkTXVzaWNGcm9tRmlsZShtdXNpY2RlZltpXS5pZCwgaSwgZnVuY3Rpb24oaWR4LCB1cmwsIGRhdGEpe1xyXG5cdFx0XHRcdFNvdW5kTWFuYWdlci5sb2FkTXVzaWMobXVzaWNkZWZbaWR4XS5pZCwge1xyXG5cdFx0XHRcdFx0ZGF0YTogZGF0YSxcclxuXHRcdFx0XHRcdHVybDogdXJsLFxyXG5cdFx0XHRcdFx0bG9vcFN0YXJ0OiBtdXNpY2RlZltpZHhdLmxvb3BTdGFydCxcclxuXHRcdFx0XHRcdGxvb3BFbmQ6IG11c2ljZGVmW2lkeF0ubG9vcEVuZCxcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdHNlbGYucXVldWVGb3JNYXBTdGFydChmdW5jdGlvbigpe1xyXG5cdFx0XHRTb3VuZE1hbmFnZXIucGxheU11c2ljKG11c2ljZGVmWzBdLmlkKTtcclxuXHRcdH0pO1xyXG5cdFx0XHJcblx0XHRyZXR1cm47XHJcblx0XHRcclxuXHRcdGZ1bmN0aW9uIF9fbG9hZE11c2ljRnJvbUZpbGUobXVzaWNpZCwgaWR4LCBjYWxsYmFjaykge1xyXG5cdFx0XHRzZWxmLm1hcmtMb2FkaW5nKFwiQkdNVVNJQ19cIittdXNpY2lkKTtcclxuXHRcdFx0dHJ5IHtcclxuXHRcdFx0XHR2YXIgZGlyID0gc2VsZi5maWxlU3lzLnJvb3QuZ2V0Q2hpbGRCeU5hbWUoXCJiZ211c2ljXCIpO1xyXG5cdFx0XHRcdGlmICghZGlyKSB7XHJcblx0XHRcdFx0XHRjb25zb2xlLmVycm9yKFwiTm8gYmdtdXNpYyBmb2xkZXIgaW4gdGhlIG1hcCBmaWxlIVwiKTtcclxuXHRcdFx0XHRcdHJldHVybjtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0dmFyIGZpbGUgPSBkaXIuZ2V0Q2hpbGRCeU5hbWUobXVzaWNpZCtcIi5tcDNcIik7XHJcblx0XHRcdFx0aWYgKCFmaWxlKSB7XHJcblx0XHRcdFx0XHRjb25zb2xlLmVycm9yKFwiTm8gYmdtdXNpYyB3aXRoIG5hbWUgJ1wiK211c2ljaWQrXCIubXAzXCIrXCInICFcIik7XHJcblx0XHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdGZ1bmN0aW9uIG9uUHJvZ3Jlc3MoaW5kZXgsIHRvdGFsKXtcclxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKFwiTXVzaWMgTG9hZCBQcm9ncmVzczogXCIsIGluZGV4LCB0b3RhbCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdGZpbGUuZ2V0QmxvYihcImF1ZGlvL21wZWdcIiwgZnVuY3Rpb24oZGF0YSl7XHJcblx0XHRcdFx0XHR2YXIgdXJsID0gVVJMLmNyZWF0ZU9iamVjdFVSTChkYXRhKTtcclxuXHRcdFx0XHRcdHNlbGYuZ2MuY29sbGVjdFVSTCh1cmwpO1xyXG5cdFx0XHRcdFx0Y2FsbGJhY2soaWR4LCB1cmwsIGRhdGEpO1xyXG5cdFx0XHRcdFx0c2VsZi5tYXJrTG9hZEZpbmlzaGVkKFwiQkdNVVNJQ19cIittdXNpY2lkKTtcclxuXHRcdFx0XHR9LCBvblByb2dyZXNzKTtcclxuXHRcdFx0fSBjYXRjaCAoZSkge1xyXG5cdFx0XHRcdGNhbGxiYWNrKGUpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHRcclxuXHR9LFxyXG5cdFxyXG5cdC8qKlxyXG5cdCAqIENyZWF0ZXMgdGhlIG1hcCBmb3IgZGlzcGxheSBmcm9tIHRoZSBzdG9yZWQgZGF0YS5cclxuXHQgKi9cclxuXHRfaW5pdCA6IGZ1bmN0aW9uKCl7XHJcblx0XHR2YXIgc2VsZiA9IHRoaXM7XHJcblx0XHR0aGlzLnNjZW5lID0gbmV3IFRIUkVFLlNjZW5lKCk7XHJcblx0XHR0aGlzLmNhbWVyYXMgPSB7fTtcclxuXHRcdFxyXG5cdFx0aWYgKCF3aW5kb3cucGxheWVyKSB7XHJcblx0XHRcdHdpbmRvdy5wbGF5ZXIgPSBuZXcgUGxheWVyQ2hhcigpO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHR0aGlzLnNjZW5lLmFkZCh0aGlzLm1hcG1vZGVsKTtcclxuXHRcdFxyXG5cdFx0dGhpcy5jYW1lcmFMb2dpY3MgPSBbXTtcclxuXHRcdHNldHVwTWFwUmlnZ2luZyh0aGlzKTtcclxuXHRcdC8vIE1hcCBNb2RlbCBpcyBub3cgcmVhZHlcclxuXHRcdFxyXG5cdFx0aWYgKHRoaXMubWV0YWRhdGEuY2xlYXJDb2xvcilcclxuXHRcdFx0dGhyZWVSZW5kZXJlci5zZXRDbGVhckNvbG9ySGV4KCB0aGlzLm1ldGFkYXRhLmNsZWFyQ29sb3IgKTtcclxuXHRcdFxyXG5cdFx0dGhpcy5faW5pdEV2ZW50TWFwKCk7XHJcblx0XHRcclxuXHRcdHRoaXMuZW1pdChcIm1hcC1yZWFkeVwiKTtcclxuXHRcdFxyXG5cdH0sXHJcblx0XHJcblx0XHJcblx0Ly8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblx0Ly8gVGlsZSBJbmZvcm1hdGlvbiBcclxuXHQvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHRcclxuXHR0aWxlZGF0YSA6IG51bGwsXHJcblx0XHJcblx0Z2V0VGlsZURhdGEgOiBmdW5jdGlvbih4LCB5KSB7XHJcblx0XHR2YXIgdGlsZSA9IGNvbnZlcnRTaG9ydFRvVGlsZVByb3BzKHRoaXMudGlsZWRhdGEuZ2V0KHgsIHkpKTtcclxuXHRcdHJldHVybiB0aWxlO1xyXG5cdH0sXHJcblx0XHJcblx0Z2V0TGF5ZXJUcmFuc2l0aW9uIDogZnVuY3Rpb24oeCwgeSwgY3VyckxheWVyKSB7XHJcblx0XHRjdXJyTGF5ZXIgPSAoY3VyckxheWVyIT09dW5kZWZpbmVkKT8gY3VyckxheWVyIDogMTtcclxuXHRcdHZhciB0aWxlID0gdGhpcy5nZXRUaWxlRGF0YSh4LCB5KTtcclxuXHRcdHZhciBsYXllciA9IHRpbGUudHJhbnNpdGlvbjtcclxuXHRcdHZhciBvcmlnaW4xID0gdGhpcy5tZXRhZGF0YS5sYXllcnNbY3VyckxheWVyLTFdW1wiMmRcIl07XHJcblx0XHR2YXIgb3JpZ2luMiA9IHRoaXMubWV0YWRhdGEubGF5ZXJzW2xheWVyLTFdW1wiMmRcIl07XHJcblx0XHRcclxuXHRcdHJldHVybiB7XHJcblx0XHRcdGxheWVyOiBsYXllcixcclxuXHRcdFx0eDogeCAtIG9yaWdpbjFbMF0gKyBvcmlnaW4yWzBdLFxyXG5cdFx0XHR5OiB5IC0gb3JpZ2luMVsxXSArIG9yaWdpbjJbMV0sXHJcblx0XHR9O1xyXG5cdH0sXHJcblx0XHJcblx0Z2V0M0RUaWxlTG9jYXRpb24gOiBmdW5jdGlvbih4LCB5LCBsYXllciwgdGlsZWRhdGEpIHtcclxuXHRcdGlmICh4IGluc3RhbmNlb2YgVEhSRUUuVmVjdG9yMikge1xyXG5cdFx0XHR5ID0geC55OyB4ID0geC54O1xyXG5cdFx0fVxyXG5cdFx0aWYgKHggaW5zdGFuY2VvZiBUSFJFRS5WZWN0b3IzKSB7XHJcblx0XHRcdGxheWVyID0geC56OyB5ID0geC55OyB4ID0geC54O1xyXG5cdFx0fVxyXG5cdFx0bGF5ZXIgPSAobGF5ZXIgfHwgMSkgLSAxO1xyXG5cdFx0aWYgKCF0aWxlZGF0YSkgdGlsZWRhdGEgPSB0aGlzLmdldFRpbGVEYXRhKHgsIHkpO1xyXG5cdFx0XHJcblx0XHR2YXIgbGF5ZXJkYXRhID0gdGhpcy5tZXRhZGF0YS5sYXllcnNbbGF5ZXJdO1xyXG5cdFx0dmFyIHogPSB0aWxlZGF0YS5oZWlnaHQgKiB0aGlzLm1ldGFkYXRhLmhlaWdodHN0ZXA7XHJcblx0XHRcclxuXHRcdHZhciBsb2MgPSBuZXcgVEhSRUUuVmVjdG9yMyh4LCB6LCB5KTtcclxuXHRcdGxvYy54IC09IGxheWVyZGF0YVtcIjJkXCJdWzBdO1xyXG5cdFx0bG9jLnogLT0gbGF5ZXJkYXRhW1wiMmRcIl1bMV07XHJcblx0XHRcclxuXHRcdHZhciBtYXQgPSBuZXcgVEhSRUUuTWF0cml4NCgpO1xyXG5cdFx0bWF0LnNldC5hcHBseShtYXQsIGxheWVyZGF0YVtcIjNkXCJdKTtcclxuXHRcdGxvYy5hcHBseU1hdHJpeDQobWF0KTtcclxuXHRcdFxyXG5cdFx0cmV0dXJuIGxvYztcclxuXHR9LFxyXG5cdC8qXHJcblx0Z2V0QWxsV2Fsa2FibGVUaWxlcyA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0dmFyIHRpbGVzID0gW107XHJcblx0XHRmb3IgKHZhciBsaSA9IDE7IGxpIDw9IDc7IGxpKyspIHtcclxuXHRcdFx0aWYgKCF0aGlzLm1ldGFkYXRhLmxheWVyc1tsaS0xXSkgY29udGludWU7XHJcblx0XHRcdHRpbGVzW2xpXSA9IFtdO1xyXG5cdFx0XHRcclxuXHRcdFx0Zm9yICh2YXIgeSA9IDA7IHkgPCB0aGlzLm1ldGFkYXRhLmhlaWdodDsgeSsrKSB7XHJcblx0XHRcdFx0Zm9yICh2YXIgeCA9IDA7IHggPCB0aGlzLm1ldGFkYXRhLndpZHRoOyB4KyspIHtcclxuXHRcdFx0XHRcdHZhciB0ZGF0YSA9IHRoaXMuZ2V0VGlsZURhdGEoeCwgeSk7XHJcblx0XHRcdFx0XHRpZiAoIXRkYXRhLmlzV2Fsa2FibGUpIGNvbnRpbnVlO1xyXG5cdFx0XHRcdFx0XHJcblx0XHRcdFx0XHR0ZGF0YVtcIjNkbG9jXCJdID0gdGhpcy5nZXQzRFRpbGVMb2NhdGlvbih4LCB5LCBsaSwgdGRhdGEpO1xyXG5cdFx0XHRcdFx0XHJcblx0XHRcdFx0XHR0aWxlc1tsaV0ucHVzaCh0ZGF0YSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gdGlsZXM7XHJcblx0fSwgKi9cclxuXHRcclxuXHRnZXRSYW5kb21OUENTcGF3blBvaW50IDogZnVuY3Rpb24oKSB7XHJcblx0XHRpZiAoIXRoaXMubWV0YWRhdGEubnBjc3Bhd25zKSB7XHJcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIkV2ZW50IHJlcXVlc3RlZCBOUEMgU3Bhd24gUG9pbnQgb24gYSBtYXAgd2hlcmUgbm9uZSBhcmUgZGVmaW5lZCFcIik7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdHZhciBwdHMgPSB0aGlzLm1ldGFkYXRhLl9ucGNTcGF3bnNBdmFpbDtcclxuXHRcdGlmICghcHRzIHx8ICFwdHMubGVuZ3RoKSB7XHJcblx0XHRcdHB0cyA9IHRoaXMubWV0YWRhdGEuX25wY1NwYXduc0F2YWlsID0gdGhpcy5tZXRhZGF0YS5ucGNzcGF3bnMuc2xpY2UoKTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0dmFyIGluZGV4ID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogcHRzLmxlbmd0aCk7XHJcblx0XHR2YXIgdmVjID0gbmV3IFRIUkVFLlZlY3RvcjMocHRzW2luZGV4XVswXSwgcHRzW2luZGV4XVsxXSwgcHRzW2luZGV4XVsyXSB8fCAxKTtcclxuXHRcdHB0cy5zcGxpY2UoaW5kZXgsIDEpO1xyXG5cdFx0cmV0dXJuIHZlYztcclxuXHRcdFxyXG5cdH0sXHJcblx0XHJcblx0LyoqXHJcblx0ICogY2FuV2Fsa0JldHdlZW46IElmIGl0IGlzIHBvc3NpYmxlIHRvIHdhbGsgZnJvbSBvbmUgdGlsZSB0byBhbm90aGVyLiBUaGUgdHdvXHJcblx0ICogXHRcdHRpbGVzIG11c3QgYmUgYWRqYWNlbnQsIG9yIGZhbHNlIGlzIGltbWVkZWF0ZWx5IHJldHVybmVkLlxyXG5cdCAqIHJldHVybnM6XHJcblx0ICogXHRcdGZhbHNlID0gY2Fubm90LCAxID0gY2FuLCAyID0gbXVzdCBqdW1wLCA0ID0gbXVzdCBzd2ltL3N1cmZcclxuXHQgKi9cclxuXHRjYW5XYWxrQmV0d2VlbiA6IGZ1bmN0aW9uKHNyY3gsIHNyY3ksIGRlc3R4LCBkZXN0eSwgaWdub3JlRXZlbnRzKXtcclxuXHRcdGlmIChNYXRoLmFicyhzcmN4IC0gZGVzdHgpICsgTWF0aC5hYnMoc3JjeSAtIGRlc3R5KSAhPSAxKSByZXR1cm4gZmFsc2U7XHJcblx0XHRcclxuXHRcdC8vIElmIHdlJ3JlIHNvbWVob3cgYWxyZWFkeSBvdXRzaWRlIHRoZSBtYXAsIHVuY29uZGl0aW9uYWxseSBhbGxvdyB0aGVtIHRvIHdhbGsgYXJvdW5kIHRvIGdldCBiYWNrIGluXHJcblx0XHRpZiAoc3JjeCA8IDAgfHwgc3JjeCA+PSB0aGlzLm1ldGFkYXRhLndpZHRoKSByZXR1cm4gdHJ1ZTtcclxuXHRcdGlmIChzcmN5IDwgMCB8fCBzcmN5ID49IHRoaXMubWV0YWRhdGEuaGVpZ2h0KSByZXR1cm4gdHJ1ZTtcclxuXHRcdFxyXG5cdFx0Ly8gU2FuaXR5IGNoZWNrIGVkZ2VzIG9mIHRoZSBtYXBcclxuXHRcdGlmIChkZXN0eCA8IDAgfHwgZGVzdHggPj0gdGhpcy5tZXRhZGF0YS53aWR0aCkgcmV0dXJuIGZhbHNlO1xyXG5cdFx0aWYgKGRlc3R5IDwgMCB8fCBkZXN0eSA+PSB0aGlzLm1ldGFkYXRhLmhlaWdodCkgcmV0dXJuIGZhbHNlO1xyXG5cdFx0XHJcblx0XHR2YXIgc3JjdGlsZSA9IHRoaXMuZ2V0VGlsZURhdGEoc3JjeCwgc3JjeSk7XHJcblx0XHR2YXIgZGVzdHRpbGUgPSB0aGlzLmdldFRpbGVEYXRhKGRlc3R4LCBkZXN0eSk7XHJcblx0XHRcclxuXHRcdGlmICghZGVzdHRpbGUuaXNXYWxrYWJsZSkgcmV0dXJuIGZhbHNlO1xyXG5cdFx0XHJcblx0XHRpZiAoIWlnbm9yZUV2ZW50cykgeyAvL2NoZWNrIGZvciB0aGUgcHJlc2Vuc2Ugb2YgZXZlbnRzXHJcblx0XHRcdHZhciBldnRzID0gdGhpcy5ldmVudE1hcC5nZXQoZGVzdHgsIGRlc3R5KTtcclxuXHRcdFx0aWYgKGV2dHMpIHtcclxuXHRcdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGV2dHMubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0XHRcdGlmICghZXZ0c1tpXS5jYW5XYWxrT24oKSkgcmV0dXJuIGZhbHNlO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHR2YXIgY2FuV2FsayA9IHRydWU7IC8vQXNzdW1lIHdlIGNhbiB0cmF2ZWwgYmV0d2VlbiB1bnRpbCBwcm92ZW4gb3RoZXJ3aXNlLlxyXG5cdFx0dmFyIG11c3RKdW1wLCBtdXN0U3dpbSwgbXVzdFRyYW5zaXRpb247XHJcblx0XHRcclxuXHRcdHZhciBkaXIgPSAoZnVuY3Rpb24oKXtcclxuXHRcdFx0c3dpdGNoICgxKSB7XHJcblx0XHRcdFx0Y2FzZSAoc3JjeSAtIGRlc3R5KTogcmV0dXJuIFtcInVwXCIsIFwiZG93blwiXTtcclxuXHRcdFx0XHRjYXNlIChkZXN0eSAtIHNyY3kpOiByZXR1cm4gW1wiZG93blwiLCBcInVwXCJdO1xyXG5cdFx0XHRcdGNhc2UgKHNyY3ggLSBkZXN0eCk6IHJldHVybiBbXCJsZWZ0XCIsIFwicmlnaHRcIl07XHJcblx0XHRcdFx0Y2FzZSAoZGVzdHggLSBzcmN4KTogcmV0dXJuIFtcInJpZ2h0XCIsIFwibGVmdFwiXTtcclxuXHRcdFx0fSByZXR1cm4gbnVsbDtcclxuXHRcdH0pKCk7XHJcblx0XHRcclxuXHRcdGlmIChzcmN0aWxlLm1vdmVtZW50W2RpclswXV0pIHsgLy9pZiBtb3ZlbWVudCA9IHRydWUsIG1lYW5zIHdlIGNhbid0IHdhbGsgdGhlcmVcclxuXHRcdFx0aWYgKHNyY3RpbGUuaXNMZWRnZSkgXHJcblx0XHRcdFx0bXVzdEp1bXAgPSB0cnVlO1xyXG5cdFx0XHRlbHNlIGNhbldhbGsgPSBmYWxzZTtcclxuXHRcdH1cclxuXHRcdGNhbldhbGsgJj0gIWRlc3R0aWxlLm1vdmVtZW50W2RpclsxXV07XHJcblx0XHRcclxuXHRcdG11c3RTd2ltID0gZGVzdHRpbGUuaXNXYXRlcjtcclxuXHRcdFxyXG5cdFx0bXVzdFRyYW5zaXRpb24gPSAhIWRlc3R0aWxlLnRyYW5zaXRpb247XHJcblx0XHRcclxuXHRcdG11c3RCZVBsYXllciA9ICEhZGVzdHRpbGUubm9OUEM7XHJcblx0XHRcclxuXHRcdGlmICghY2FuV2FsaykgcmV0dXJuIGZhbHNlO1xyXG5cdFx0cmV0dXJuIChjYW5XYWxrPzB4MTowKSB8IChtdXN0SnVtcD8weDI6MCkgfCAobXVzdFN3aW0/MHg0OjApIHwgKG11c3RUcmFuc2l0aW9uPzB4ODowKSB8IChtdXN0QmVQbGF5ZXI/MHgxMDowKTtcclxuXHR9LFxyXG5cdFxyXG5cdFxyXG5cdC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cdC8vIEV2ZW50IEhhbmRsaW5nIFxyXG5cdC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cdFxyXG5cdF9sb2NhbElkIDogMCxcclxuXHRldmVudExpc3QgOiBudWxsLFxyXG5cdGV2ZW50TWFwIDogbnVsbCxcclxuXHRcclxuXHRfaW5pdEV2ZW50TWFwIDogZnVuY3Rpb24oKSB7XHJcblx0XHR2YXIgc2VsZiA9IHRoaXM7XHJcblx0XHRcclxuXHRcdHRoaXMuZXZlbnRMaXN0ID0ge307XHJcblx0XHR2YXIgdyA9IHRoaXMubWV0YWRhdGEud2lkdGgsIGggPSB0aGlzLm1ldGFkYXRhLmhlaWdodDtcclxuXHRcdHRoaXMuZXZlbnRNYXAgPSBuZGFycmF5KG5ldyBBcnJheSh3KmgpLCBbdywgaF0sIFsxLCB3XSk7XHJcblx0XHR0aGlzLmV2ZW50TWFwLnB1dCA9IGZ1bmN0aW9uKHgsIHksIHZhbCkge1xyXG5cdFx0XHRpZiAoIXRoaXMuZ2V0KHgsIHkpKSB7XHJcblx0XHRcdFx0dGhpcy5zZXQoeCwgeSwgW10pO1xyXG5cdFx0XHR9XHJcblx0XHRcdGlmICh0aGlzLmdldCh4LCB5KS5pbmRleE9mKHZhbCkgPj0gMCkgcmV0dXJuOyAvL2Rvbid0IGRvdWJsZSBhZGRcclxuXHRcdFx0dGhpcy5nZXQoeCwgeSkucHVzaCh2YWwpO1xyXG5cdFx0fTtcclxuXHRcdHRoaXMuZXZlbnRNYXAucmVtb3ZlID0gZnVuY3Rpb24oeCwgeSwgdmFsKSB7XHJcblx0XHRcdGlmICghdGhpcy5nZXQoeCwgeSkpIHJldHVybiBudWxsO1xyXG5cdFx0XHR2YXIgaSA9IHRoaXMuZ2V0KHgsIHkpLmluZGV4T2YodmFsKTtcclxuXHRcdFx0aWYgKHRoaXMuZ2V0KHgsIHkpLmxlbmd0aC0xID4gMCkge1xyXG5cdFx0XHRcdC8vVHJ5aW5nIHRvIGZpbmQgdGhlIEJ1ZyBvZiB0aGUgUGhhbnRvbSBTcHJpdGVzIVxyXG5cdFx0XHRcdGNvbnNvbGUud2FybihcIlJFTU9WSU5HIEVWRU5UIEZST00gTk9OLUVNUFRZIExJU1Q6IFwiLCB0aGlzLmdldCh4LCB5KSwgXCJpbmRleDpcIiwgaSk7XHJcblx0XHRcdH1cclxuXHRcdFx0aWYgKGkgPT0gLTEpIHJldHVybiBudWxsO1xyXG5cdFx0XHRyZXR1cm4gdGhpcy5nZXQoeCwgeSkuc3BsaWNlKGksIDEpO1xyXG5cdFx0fTtcclxuXHRcdFxyXG5cdFx0dGhpcy5zcHJpdGVOb2RlID0gbmV3IFRIUkVFLk9iamVjdDNEKCk7XHJcblx0XHR0aGlzLnNwcml0ZU5vZGUubmFtZSA9IFwiU3ByaXRlIFJpZ1wiO1xyXG5cdFx0dGhpcy5zcHJpdGVOb2RlLnBvc2l0aW9uLnkgPSAwLjIxO1xyXG5cdFx0dGhpcy5zY2VuZS5hZGQodGhpcy5zcHJpdGVOb2RlKTtcclxuXHRcdFxyXG5cdFx0Ly8gTG9hZCBldmVudCBqcyBmaWxlcyBub3c6XHJcblx0XHR0aGlzLl9fbG9hZFNjcmlwdChcImxcIik7IC8vIExvYWQgbG9jYWxseSBkZWZpbmVkIGV2ZW50c1xyXG5cdFx0dGhpcy5fX2xvYWRTY3JpcHQoXCJnXCIpOyAvLyBMb2FkIGdsb2JhbGx5IGRlZmluZWQgZXZlbnRzXHJcblx0XHRcclxuXHRcdC8vIEFkZCB0aGUgcGxheWVyIGNoYXJhY3RlciBldmVudFxyXG5cdFx0dGhpcy5faW5pdFBsYXllckNoYXJhY3RlcigpO1xyXG5cdFx0XHJcblx0fSxcclxuXHRcclxuXHRfX2xvYWRTY3JpcHQgOiBmdW5jdGlvbih0KSB7XHJcblx0XHR2YXIgc2VsZiA9IHRoaXM7XHJcblx0XHR2YXIgZmlsZSA9IHRoaXMuZmlsZVN5cy5yb290LmdldENoaWxkQnlOYW1lKHQrXCJfZXZ0LmpzXCIpO1xyXG5cdFx0aWYgKCFmaWxlKSB7XHJcblx0XHRcdGNvbnNvbGUuZXJyb3IoXCJFUlJPUiBMT0FESU5HIEVWRU5UUzogTm8gXCIrdCtcIl9ldnQuanMgZmlsZSBpcyBwcmVzZW50IGluIHRoZSBtYXAgYnVuZGxlLlwiKTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cdFx0ZmlsZS5nZXRCbG9iKFwidGV4dC9qYXZhc2NyaXB0XCIsIGZ1bmN0aW9uKGRhdGEpe1xyXG5cdFx0XHQvLyBOT1RFOiBXZSBjYW5ub3QgdXNlIEpRdWVyeSgpLmFwcGVuZCgpLCBhcyBpdCBkZWxpYnJhdGVseSBjbGVhbnMgdGhlIHNjcmlwdCB0YWdzXHJcblx0XHRcdC8vICAgb3V0IG9mIHRoZSBkb20gZWxlbWVudCB3ZSdyZSBhcHBlbmRpbmcsIGxpdGVyYWxseSBkZWZlYXRpbmcgdGhlIHB1cnBvc2UuXHJcblx0XHRcdC8vIE5PVEUyOiBXZSBhcHBlbmQgdG8gdGhlIERPTSBpbnN0ZWFkIG9mIHVzaW5nIGV2YWwoKSBvciBuZXcgRnVuY3Rpb24oKSBiZWNhdXNlXHJcblx0XHRcdC8vICAgd2hlbiBhcHBlbmRlZCBsaWtlIHNvLCB0aGUgaW4tYnJvd3NlcmRlYnVnZ2VyIHNob3VsZCBiZSBhYmxlIHRvIGZpbmQgaXQgYW5kXHJcblx0XHRcdC8vICAgYnJlYWtwb2ludCBpbiBpdC5cclxuXHRcdFx0dmFyIHNjcmlwdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzY3JpcHRcIik7XHJcblx0XHRcdHNjcmlwdC50eXBlID0gXCJ0ZXh0L2phdmFzY3JpcHRcIjtcclxuXHRcdFx0c2NyaXB0LnNyYyA9IFVSTC5jcmVhdGVPYmplY3RVUkwoZGF0YSk7XHJcblx0XHRcdGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoc2NyaXB0KTtcclxuXHRcdFx0dGhpc1t0K1wiU2NyaXB0VGFnXCJdID0gc2NyaXB0O1xyXG5cdFx0XHQvLyBVcG9uIGJlaW5nIGFkZGVkIHRvIHRoZSBib2R5LCBpdCBpcyBldmFsdWF0ZWRcclxuXHRcdFx0XHJcblx0XHRcdHNlbGYuZ2MuY29sbGVjdChzY3JpcHQpO1xyXG5cdFx0XHRzZWxmLmdjLmNvbGxlY3RVUkwoc2NyaXB0LnNyYyk7XHJcblx0XHR9KTtcclxuXHR9LFxyXG5cdFxyXG5cdGFkZEV2ZW50IDogZnVuY3Rpb24oZXZ0KSB7XHJcblx0XHRpZiAoIWV2dCkgcmV0dXJuO1xyXG5cdFx0aWYgKCEoZXZ0IGluc3RhbmNlb2YgRXZlbnQpKSBcclxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiQXR0ZW1wdGVkIHRvIGFkZCBhbiBvYmplY3QgdGhhdCB3YXNuJ3QgYW4gRXZlbnQhIFwiICsgZXZ0KTtcclxuXHRcdFxyXG5cdFx0aWYgKCFldnQuc2hvdWxkQXBwZWFyKCkpIHJldHVybjtcclxuXHRcdGlmICghZXZ0LmlkKVxyXG5cdFx0XHRldnQuaWQgPSBcIkxvY2FsRXZlbnRfXCIgKyAoKyt0aGlzLl9sb2NhbElkKTtcclxuXHRcdFxyXG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xyXG5cdFx0Ly9ub3cgYWRkaW5nIGV2ZW50IHRvIG1hcFxyXG5cdFx0dGhpcy5ldmVudExpc3RbZXZ0LmlkXSA9IGV2dDtcclxuXHRcdGlmIChldnQubG9jYXRpb24pIHtcclxuXHRcdFx0dGhpcy5ldmVudE1hcC5wdXQoZXZ0LmxvY2F0aW9uLngsIGV2dC5sb2NhdGlvbi55LCBldnQpO1xyXG5cdFx0fSBlbHNlIGlmIChldnQubG9jYXRpb25zKSB7XHJcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgZXZ0LmxvY2F0aW9ucy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRcdHZhciBsb2MgPSBldnQubG9jYXRpb25zW2ldO1xyXG5cdFx0XHRcdHRoaXMuZXZlbnRNYXAucHV0KGxvYy54LCBsb2MueSwgZXZ0KTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHQvL3JlZ2lzdGVyaW5nIGxpc3RlbmVycyBvbiB0aGUgZXZlbnRcclxuXHRcdGV2dC5vbihcIm1vdmluZ1wiLCBfbW92aW5nID0gZnVuY3Rpb24oc3JjWCwgc3JjWSwgZGVzdFgsIGRlc3RZKXtcclxuXHRcdFx0Ly9TdGFydGVkIG1vdmluZyB0byBhIG5ldyB0aWxlXHJcblx0XHRcdHNlbGYuZXZlbnRNYXAucHV0KGRlc3RYLCBkZXN0WSwgdGhpcyk7XHJcblx0XHRcdHNlbGYuZXZlbnRNYXAucmVtb3ZlKHNyY1gsIHNyY1ksIHRoaXMpO1xyXG5cdFx0XHRcclxuXHRcdFx0dmFyIGRpciA9IG5ldyBUSFJFRS5WZWN0b3IzKHNyY1gtZGVzdFgsIDAsIGRlc3RZLXNyY1kpO1xyXG5cdFx0XHR2YXIgbHN0ID0gc2VsZi5ldmVudE1hcC5nZXQoZGVzdFgsIGRlc3RZKTtcclxuXHRcdFx0aWYgKGxzdCkge1xyXG5cdFx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgbHN0Lmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdFx0XHRpZiAoIWxzdFtpXSB8fCBsc3RbaV0gPT0gdGhpcykgY29udGludWU7XHJcblx0XHRcdFx0XHQvLyBjb25zb2xlLmxvZyhcImVudGVyaW5nLXRpbGVcIiwgZGlyLCBkZXN0WCwgZGVzdFkpO1xyXG5cdFx0XHRcdFx0bHN0W2ldLmVtaXQoXCJlbnRlcmluZy10aWxlXCIsIGRpcik7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHRpZiAoc3JjWCA9PSBkZXN0WCAmJiBzcmNZID09IGRlc3RZKSByZXR1cm47IC8vc2tpcCBcImxlYXZpbmdcIiBpZiB3ZSdyZSB3YXJwaW5nIGluXHJcblx0XHRcdC8vIGRpci5zZXQoc3JjWC1kZXN0WCwgMCwgZGVzdFktc3JjWSkubmVnYXRlKCk7XHJcblx0XHRcdGxzdCA9IHNlbGYuZXZlbnRNYXAuZ2V0KHNyY1gsIHNyY1kpO1xyXG5cdFx0XHRpZiAobHN0KSB7XHJcblx0XHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBsc3QubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0XHRcdGlmICghbHN0W2ldIHx8IGxzdFtpXSA9PSB0aGlzKSBjb250aW51ZTtcclxuXHRcdFx0XHRcdC8vIGNvbnNvbGUubG9nKFwibGVhdmluZy10aWxlXCIsIGRpciwgc3JjWCwgc3JjWSk7XHJcblx0XHRcdFx0XHRsc3RbaV0uZW1pdChcImxlYXZpbmctdGlsZVwiLCBkaXIpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblx0XHR0aGlzLmdjLmNvbGxlY3RMaXN0ZW5lcihldnQsIFwibW92aW5nXCIsIF9tb3ZpbmcpO1xyXG5cdFx0XHJcblx0XHRldnQub24oXCJtb3ZlZFwiLCBfbW92ZWQgPSBmdW5jdGlvbihzcmNYLCBzcmNZLCBkZXN0WCwgZGVzdFkpe1xyXG5cdFx0XHQvL0ZpbmlzaGVkIG1vdmluZyBmcm9tIHRoZSBvbGQgdGlsZVxyXG5cdFx0XHRcclxuXHRcdFx0dmFyIGRpciA9IG5ldyBUSFJFRS5WZWN0b3IzKHNyY1gtZGVzdFgsIDAsIGRlc3RZLXNyY1kpO1xyXG5cdFx0XHR2YXIgbHN0ID0gc2VsZi5ldmVudE1hcC5nZXQoZGVzdFgsIGRlc3RZKTtcclxuXHRcdFx0aWYgKGxzdCkge1xyXG5cdFx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgbHN0Lmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdFx0XHRpZiAoIWxzdFtpXSB8fCBsc3RbaV0gPT0gdGhpcykgY29udGludWU7XHJcblx0XHRcdFx0XHQvLyBjb25zb2xlLmxvZyhcImVudGVyZWQtdGlsZVwiLCBkaXIsIGRlc3RYLCBkZXN0WSk7XHJcblx0XHRcdFx0XHRsc3RbaV0uZW1pdChcImVudGVyZWQtdGlsZVwiLCBkaXIpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0aWYgKHNyY1ggPT0gZGVzdFggJiYgc3JjWSA9PSBkZXN0WSkgcmV0dXJuOyAvL3NraXAgXCJsZWZ0XCIgaWYgd2UncmUgd2FycGluZyBpblxyXG5cdFx0XHQvLyBkaXIuc2V0KHNyY1gtZGVzdFgsIDAsIGRlc3RZLXNyY1kpLm5lZ2F0ZSgpO1xyXG5cdFx0XHRsc3QgPSBzZWxmLmV2ZW50TWFwLmdldChzcmNYLCBzcmNZKTtcclxuXHRcdFx0aWYgKGxzdCkge1xyXG5cdFx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgbHN0Lmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdFx0XHRpZiAoIWxzdFtpXSB8fCBsc3RbaV0gPT0gdGhpcykgY29udGludWU7XHJcblx0XHRcdFx0XHQvLyBjb25zb2xlLmxvZyhcImxlZnQtdGlsZVwiLCBkaXIsIHNyY1gsIHNyY1kpO1xyXG5cdFx0XHRcdFx0bHN0W2ldLmVtaXQoXCJsZWZ0LXRpbGVcIiwgZGlyKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cdFx0dGhpcy5nYy5jb2xsZWN0TGlzdGVuZXIoZXZ0LCBcIm1vdmVkXCIsIF9tb3ZlZCk7XHJcblx0XHRcclxuXHRcdHZhciBnYyA9IChldnQgPT0gcGxheWVyKT8gR0MuZ2V0QmluKCkgOiB0aGlzLmdjOyAvL2Rvbid0IHB1dCB0aGUgcGxheWVyIGluIHRoaXMgbWFwJ3MgYmluXHJcblx0XHR2YXIgYXZhdGFyID0gZXZ0LmdldEF2YXRhcih0aGlzLCBnYyk7XHJcblx0XHRpZiAoYXZhdGFyKSB7XHJcblx0XHRcdHZhciBsb2MgPSBldnQubG9jYXRpb247XHJcblx0XHRcdHZhciBsb2MzID0gdGhpcy5nZXQzRFRpbGVMb2NhdGlvbihsb2MueCwgbG9jLnksIGxvYy56KTtcclxuXHRcdFx0YXZhdGFyLnBvc2l0aW9uLnNldChsb2MzKTtcclxuXHRcdFx0YXZhdGFyLnVwZGF0ZU1hdHJpeCgpO1xyXG5cdFx0XHRcclxuXHRcdFx0dGhpcy5zcHJpdGVOb2RlLmFkZChhdmF0YXIpO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHRldnQuZW1pdChcImNyZWF0ZWRcIik7XHJcblx0fSxcclxuXHRcclxuXHRsb2FkU3ByaXRlIDogZnVuY3Rpb24oZXZ0aWQsIGZpbGVuYW1lLCBjYWxsYmFjaykge1xyXG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xyXG5cdFx0dGhpcy5tYXJrTG9hZGluZyhcIlNQUklURV9cIitldnRpZCk7XHJcblx0XHR0cnkge1xyXG5cdFx0XHR2YXIgZGlyID0gdGhpcy5maWxlU3lzLnJvb3QuZ2V0Q2hpbGRCeU5hbWUoZXZ0aWQpO1xyXG5cdFx0XHRpZiAoIWRpcikge1xyXG5cdFx0XHRcdGNhbGxiYWNrKChcIk5vIHN1YmZvbGRlciBmb3IgZXZlbnQgaWQgJ1wiK2V2dGlkK1wiJyFcIikpO1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0dmFyIGZpbGUgPSBkaXIuZ2V0Q2hpbGRCeU5hbWUoZmlsZW5hbWUpO1xyXG5cdFx0XHRpZiAoIWZpbGUpIHtcclxuXHRcdFx0XHRjYWxsYmFjaygoXCJObyBhc3NldCB3aXRoIG5hbWUgJ1wiK2ZpbGVuYW1lK1wiJyBmb3IgZXZlbnQgaWQgJ1wiK2V2dGlkK1wiJyFcIikpO1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0ZmlsZS5nZXRCbG9iKFwiaW1hZ2UvcG5nXCIsIGZ1bmN0aW9uKGRhdGEpe1xyXG5cdFx0XHRcdHZhciB1cmwgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKGRhdGEpO1xyXG5cdFx0XHRcdHNlbGYuZ2MuY29sbGVjdFVSTCh1cmwpO1xyXG5cdFx0XHRcdGNhbGxiYWNrKG51bGwsIHVybCk7XHJcblx0XHRcdFx0c2VsZi5tYXJrTG9hZEZpbmlzaGVkKFwiU1BSSVRFX1wiK2V2dGlkKTtcclxuXHRcdFx0fSk7XHJcblx0XHR9IGNhdGNoIChlKSB7XHJcblx0XHRcdGNhbGxiYWNrKGUpO1xyXG5cdFx0fVxyXG5cdH0sXHJcblx0XHJcblx0X2luaXRQbGF5ZXJDaGFyYWN0ZXIgOiBmdW5jdGlvbigpIHtcclxuXHRcdGlmICghd2luZG93LnBsYXllcikge1xyXG5cdFx0XHR3aW5kb3cucGxheWVyID0gbmV3IFBsYXllckNoYXIoKTtcclxuXHRcdH1cclxuXHRcdHZhciB3YXJwID0gZ2FtZVN0YXRlLm1hcFRyYW5zaXRpb24ud2FycCB8fCAwO1xyXG5cdFx0d2FycCA9IHRoaXMubWV0YWRhdGEud2FycHNbd2FycF07XHJcblx0XHRpZiAoIXdhcnApIHtcclxuXHRcdFx0Y29uc29sZS53YXJuKFwiUmVxdWVzdGVkIHdhcnAgbG9jYXRpb24gZG9lc24ndCBleGlzdDpcIiwgd2luZG93LnRyYW5zaXRpb25fd2FycHRvKTtcclxuXHRcdFx0d2FycCA9IHRoaXMubWV0YWRhdGEud2FycHNbMF07XHJcblx0XHR9XHJcblx0XHRpZiAoIXdhcnApIHRocm93IG5ldyBFcnJvcihcIlRoaXMgbWFwIGhhcyBubyB3YXJwcyEhXCIpO1xyXG5cdFx0XHJcblx0XHRwbGF5ZXIucmVzZXQoKTtcclxuXHRcdHBsYXllci53YXJwVG8od2FycCk7XHJcblx0XHRcclxuXHRcdHRoaXMuYWRkRXZlbnQocGxheWVyKTtcclxuXHRcdFxyXG5cdH0sXHJcblx0XHJcblx0ZGlzcGF0Y2ggOiBmdW5jdGlvbih4LCB5KSB7XHJcblx0XHR2YXIgZXZ0cyA9IHRoaXMuZXZlbnRNYXAuZ2V0KHgsIHkpO1xyXG5cdFx0aWYgKCFldnRzKSByZXR1cm47XHJcblx0XHRcclxuXHRcdHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAyKTtcclxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgZXZ0cy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRldnRzW2ldLmVtaXQuYXBwbHkoZXZ0c1tpXSwgYXJncyk7XHJcblx0XHR9XHJcblx0fSxcclxuXHRcclxuXHRcclxuXHQvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHQvL1xyXG5cdC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cdF9tYXBSdW5TdGF0ZSA6IG51bGwsXHJcblx0XHJcblx0X2luaXRNYXBSdW5TdGF0ZSA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0aWYgKCF0aGlzLl9tYXBSdW5TdGF0ZSkge1xyXG5cdFx0XHR0aGlzLl9tYXBSdW5TdGF0ZSA9IHtcclxuXHRcdFx0XHRsb2FkVG90YWwgOiAwLFxyXG5cdFx0XHRcdGxvYWRQcm9ncmVzcyA6IDAsXHJcblx0XHRcdFx0bG9hZGluZ0Fzc2V0cyA6IHt9LFxyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdHR5cGVzTG9hZGluZzoge30sXHJcblx0XHRcdFx0dHlwZXNMb2FkZWQ6IHt9LFxyXG5cdFx0XHRcdHR5cGVzRmluYWxpemVkOiB7fSxcclxuXHRcdFx0XHRcclxuXHRcdFx0XHRpc1N0YXJ0ZWQgOiBmYWxzZSxcclxuXHRcdFx0XHRzdGFydFF1ZXVlIDogW10sXHJcblx0XHRcdFx0XHJcblx0XHRcdFx0ZW5kUXVldWUgOiBbXSxcclxuXHRcdFx0fTtcclxuXHRcdH1cclxuXHRcdHJldHVybiB0aGlzLl9tYXBSdW5TdGF0ZTtcclxuXHR9LFxyXG5cdFxyXG5cdG1hcmtMb2FkaW5nIDogZnVuY3Rpb24oYXNzZXRJZCwgYXNzZXRUeXBlKSB7XHJcblx0XHR2YXIgc3RhdGUgPSB0aGlzLl9pbml0TWFwUnVuU3RhdGUoKTtcclxuXHRcdHN0YXRlLmxvYWRUb3RhbCsrO1xyXG5cdFx0aWYgKGFzc2V0SWQpIHtcclxuXHRcdFx0aWYgKCFzdGF0ZS5sb2FkaW5nQXNzZXRzW2Fzc2V0SWRdKVxyXG5cdFx0XHRcdHN0YXRlLmxvYWRpbmdBc3NldHNbYXNzZXRJZF0gPSAwO1xyXG5cdFx0XHRzdGF0ZS5sb2FkaW5nQXNzZXRzW2Fzc2V0SWRdKys7XHJcblx0XHR9XHJcblx0XHRpZiAoYXNzZXRUeXBlKSB7XHJcblx0XHRcdGlmICghc3RhdGUudHlwZXNMb2FkaW5nW2Fzc2V0VHlwZV0pXHJcblx0XHRcdFx0c3RhdGUudHlwZXNMb2FkaW5nW2Fzc2V0VHlwZV0gPSAwO1xyXG5cdFx0XHRzdGF0ZS50eXBlc0xvYWRpbmdbYXNzZXRUeXBlXSsrO1xyXG5cdFx0fVxyXG5cdH0sXHJcblx0bWFya0xvYWRGaW5pc2hlZCA6IGZ1bmN0aW9uKGFzc2V0SWQsIGFzc2V0VHlwZSkge1xyXG5cdFx0dmFyIHN0YXRlID0gdGhpcy5faW5pdE1hcFJ1blN0YXRlKCk7XHJcblx0XHRzdGF0ZS5sb2FkUHJvZ3Jlc3MrKztcclxuXHRcdGlmIChhc3NldElkKSB7XHJcblx0XHRcdGlmICghc3RhdGUubG9hZGluZ0Fzc2V0c1thc3NldElkXSlcclxuXHRcdFx0XHRzdGF0ZS5sb2FkaW5nQXNzZXRzW2Fzc2V0SWRdID0gMDtcclxuXHRcdFx0c3RhdGUubG9hZGluZ0Fzc2V0c1thc3NldElkXS0tO1xyXG5cdFx0fVxyXG5cdFx0aWYgKGFzc2V0VHlwZSkge1xyXG5cdFx0XHRpZiAoIXN0YXRlLnR5cGVzTG9hZGVkW2Fzc2V0VHlwZV0pXHJcblx0XHRcdFx0c3RhdGUudHlwZXNMb2FkZWRbYXNzZXRUeXBlXSA9IDA7XHJcblx0XHRcdHN0YXRlLnR5cGVzTG9hZGVkW2Fzc2V0VHlwZV0rKztcclxuXHRcdFx0XHJcblx0XHRcdGlmIChzdGF0ZS50eXBlc0xvYWRpbmdbYXNzZXRUeXBlXSA9PSBzdGF0ZS50eXBlc0xvYWRlZFthc3NldFR5cGVdXHJcblx0XHRcdFx0JiYgc3RhdGUudHlwZXNGaW5hbGl6ZWRbYXNzZXRUeXBlXSkgXHJcblx0XHRcdHtcclxuXHRcdFx0XHRzdGF0ZS50eXBlc0ZpbmFsaXplZFthc3NldFR5cGVdKCk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0Ly9UT0RPIGJlZ2luIG1hcCBzdGFydFxyXG5cdFx0aWYgKHN0YXRlLmxvYWRQcm9ncmVzcyA+PSBzdGF0ZS5sb2FkVG90YWwpIHtcclxuXHRcdFx0Y29uc29sZS53YXJuKFwiU1RBUlQgTUFQXCIpO1xyXG5cdFx0XHR0aGlzLl9leGVjdXRlTWFwU3RhcnRDYWxsYmFja3MoKTtcclxuXHRcdH1cclxuXHR9LFxyXG5cdHNldEFzc2V0VHlwZU1heDogZnVuY3Rpb24oYXNzZXRUeXBlLCBudW0pIHtcclxuXHRcdHN0YXRlLnR5cGVzTG9hZGluZ1thc3NldFR5cGVdID0gbnVtO1xyXG5cdH0sXHJcblx0b25Bc3NldFR5cGVMb2FkZWQ6IGZ1bmN0aW9uKGFzc2V0VHlwZSwgZm4pIHtcclxuXHRcdHZhciBzdGF0ZSA9IHRoaXMuX2luaXRNYXBSdW5TdGF0ZSgpO1xyXG5cdFx0aWYgKHR5cGVvZiBmbiAhPT0gXCJmdW5jdGlvblwiKVxyXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJvbkFzc2V0VHlwZUxvYWRlZCBtdXN0IHN1cHBseSBhIGZ1bmN0aW9uIVwiKTtcclxuXHRcdHN0YXRlLnR5cGVzRmluYWxpemVkW2Fzc2V0VHlwZV0gPSBmbjtcclxuXHR9LFxyXG5cdFxyXG5cdHF1ZXVlRm9yTWFwU3RhcnQgOiBmdW5jdGlvbihjYWxsYmFjaykge1xyXG5cdFx0dmFyIHN0YXRlID0gdGhpcy5faW5pdE1hcFJ1blN0YXRlKCk7XHJcblx0XHRcclxuXHRcdGlmICghc3RhdGUuaXNTdGFydGVkKSB7XHJcblx0XHRcdHN0YXRlLnN0YXJ0UXVldWUucHVzaChjYWxsYmFjayk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRjYWxsYmFjaygpO1xyXG5cdFx0fVxyXG5cdH0sXHJcblx0XHJcblx0X2V4ZWN1dGVNYXBTdGFydENhbGxiYWNrcyA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0dmFyIHN0YXRlID0gdGhpcy5faW5pdE1hcFJ1blN0YXRlKCk7XHJcblx0XHRcclxuXHRcdHZhciBjYWxsYmFjaztcclxuXHRcdHdoaWxlIChjYWxsYmFjayA9IHN0YXRlLnN0YXJ0UXVldWUuc2hpZnQoKSkge1xyXG5cdFx0XHRjYWxsYmFjaygpO1xyXG5cdFx0fVxyXG5cdFx0c3RhdGUuaXNTdGFydGVkID0gdHJ1ZTtcclxuXHRcdHRoaXMuZW1pdChcIm1hcC1zdGFydGVkXCIpO1xyXG5cdH0sXHJcblx0XHJcblx0X2V4ZWN1dGVNYXBFbmRDYWxsYmFja3MgOiBmdW5jdGlvbigpIHtcclxuXHRcdHZhciBzdGF0ZSA9IHRoaXMuX2luaXRNYXBSdW5TdGF0ZSgpO1xyXG5cdFx0XHJcblx0XHR2YXIgY2FsbGJhY2s7XHJcblx0XHR3aGlsZSAoY2FsbGJhY2sgPSBzdGF0ZS5lbmRRdWV1ZS5zaGlmdCgpKSB7XHJcblx0XHRcdGNhbGxiYWNrKCk7XHJcblx0XHR9XHJcblx0XHQvLyBzdGF0ZS5pc1N0YXJ0ZWQgPSB0cnVlO1xyXG5cdH0sXHJcblx0XHJcblx0Ly8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cdFxyXG5cdGNoYW5nZUNhbWVyYTogZnVuY3Rpb24oY2FtbGJsKSB7XHJcblx0XHR2YXIgY2FtID0gdGhpcy5jYW1lcmFzW2NhbWxibF07XHJcblx0XHRpZiAoIWNhbSkge1xyXG5cdFx0XHRjb25zb2xlLmxvZyhcIkF0dGVtcHQgdG8gY2hhbmdlIHRvIGNhbWVyYVwiLCBjYW1sYmwsIFwiZmFpbGVkISBObyBzdWNoIGNhbWVyYSFcIik7XHJcblx0XHR9XHJcblx0XHR0aGlzLmNhbWVyYSA9IGNhbTtcclxuXHR9LFxyXG5cdFxyXG5cdFxyXG5cdC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHQvLyBMb2dpYyBMb29wIGFuZCBNYXAgQmVoYXZpb3JzXHJcblx0Y2FtZXJhTG9naWNzOiBudWxsLFxyXG5cdFxyXG5cdGxvZ2ljTG9vcCA6IGZ1bmN0aW9uKGRlbHRhKXtcclxuXHRcdGlmICh0aGlzLmV2ZW50TGlzdCkge1xyXG5cdFx0XHRmb3IgKHZhciBuYW1lIGluIHRoaXMuZXZlbnRMaXN0KSB7XHJcblx0XHRcdFx0dmFyIGV2dCA9IHRoaXMuZXZlbnRMaXN0W25hbWVdO1xyXG5cdFx0XHRcdGlmICghZXZ0KSBjb250aW51ZTtcclxuXHRcdFx0XHRcclxuXHRcdFx0XHRldnQuZW1pdChcInRpY2tcIiwgZGVsdGEpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdGlmICh0aGlzLmNhbWVyYUxvZ2ljcykge1xyXG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuY2FtZXJhTG9naWNzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdFx0dGhpcy5jYW1lcmFMb2dpY3NbaV0uY2FsbCh0aGlzLCBkZWx0YSk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9LFxyXG59KTtcclxubW9kdWxlLmV4cG9ydHMgPSBNYXA7XHJcblxyXG5cclxuZnVuY3Rpb24gX190ZXN0X19vdXRwdXRUcmVlKG9iaiwgaW5kZW50KSB7XHJcblx0aW5kZW50ID0gKGluZGVudCA9PT0gdW5kZWZpbmVkKT8gMCA6IGluZGVudDtcclxuXHRcclxuXHR2YXIgb3V0ID0gXCJbXCIrb2JqLnR5cGUrXCI6IFwiO1xyXG5cdG91dCArPSAoKCFvYmoubmFtZSk/XCI8VW5uYW1lZD5cIjpvYmoubmFtZSk7XHJcblx0b3V0ICs9IFwiIF1cIjtcclxuXHRcclxuXHRzd2l0Y2ggKG9iai50eXBlKSB7XHJcblx0XHRjYXNlIFwiTWVzaFwiOlxyXG5cdFx0XHRvdXQgKz0gXCIgKHZlcnRzPVwiK29iai5nZW9tZXRyeS52ZXJ0aWNlcy5sZW5ndGg7XHJcblx0XHRcdG91dCArPSBcIiBmYWNlcz1cIitvYmouZ2VvbWV0cnkuZmFjZXMubGVuZ3RoO1xyXG5cdFx0XHRvdXQgKz0gXCIgbWF0PVwiK29iai5tYXRlcmlhbC5uYW1lO1xyXG5cdFx0XHRvdXQgKz0gXCIpXCI7XHJcblx0XHRcdGJyZWFrO1xyXG5cdH1cclxuXHRcclxuXHRmb3IgKHZhciBpID0gMDsgaSA8IGluZGVudDsgaSsrKSB7XHJcblx0XHRvdXQgPSBcInwgXCIgKyBvdXQ7XHJcblx0fVxyXG5cdGNvbnNvbGUubG9nKG91dCk7XHJcblx0XHJcblx0Zm9yICh2YXIgaSA9IDA7IGkgPCBvYmouY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcclxuXHRcdF9fdGVzdF9fb3V0cHV0VHJlZShvYmouY2hpbGRyZW5baV0sIGluZGVudCsxKTtcclxuXHR9XHJcbn1cclxuXHJcblxyXG4iLCIvLyBkdW5nZW9uLW1hcC5qc1xyXG4vLyBEZWZpbml0aW9uIG9mIHRoZSBEb3JpdG8gRHVuZ2VvblxyXG5cclxuLy8gJiM5NjYwOyAmIzk2Njg7ICYjOTY1MDsgJiM5NjU4OyAmIzk2NjA7ICYjOTY2ODsgJiM5NjUwOyAmIzk2NTg7ICYjOTY2MDsgJiM5NjY4OyAmIzk2NTA7ICYjOTY1ODsgJiM5NjYwOyAmIzk2Njg7ICYjOTY1MDsgJiM5NjU4OyAmIzk2NjA7ICYjOTY2ODsgJiM5NjUwOyAmIzk2NjA7ICYjOTY2ODsgJiM5NjUwOyAmIzk2NTg7ICYjOTY2MDsgJiM5NjY4OyAmIzk2NTA7ICYjOTY1ODsgJiM5NjYwOyAmIzk2Njg7ICYjOTY2MDsgJiM5NjY4OyAmIzk2NTA7ICYjOTY1ODsgJiM5NjYwOyAmIzk2Njg7ICYjOTY1MDtcclxuLy8g4pa8IOKXhCDilrIg4pa6IOKWvCDil4Qg4payIOKWuiDilrwg4peEIOKWsiDilrog4pa8IOKXhCDilrIg4pa6IOKWvCDil4Qg4payIOKWvCDil4Qg4payIOKWuiDilrwg4peEIOKWsiDilrog4pa8IOKXhCDilrwg4peEIOKWsiDilrog4pa8IOKXhCDilrJcclxuXHJcbnZhciBpbmhlcml0cyA9IHJlcXVpcmUoXCJpbmhlcml0c1wiKTtcclxudmFyIGV4dGVuZCA9IHJlcXVpcmUoXCJleHRlbmRcIik7XHJcblxyXG52YXIgTWFwID0gcmVxdWlyZShcIi4uL21hcC5qc1wiKTtcclxudmFyIFBsYXllckNoYXIgPSByZXF1aXJlKFwidHBwLXBjXCIpO1xyXG52YXIgc2V0dXBNYXBSaWdnaW5nID0gcmVxdWlyZShcIi4vbWFwLXNldHVwXCIpO1xyXG5cclxuXHJcbmZ1bmN0aW9uIERvcml0b0R1bmdlb24oKSB7XHJcblx0TWFwLmNhbGwodGhpcywgXCJ4RHVuZ2VvblwiKTtcclxufVxyXG5pbmhlcml0cyhEb3JpdG9EdW5nZW9uLCBNYXApO1xyXG5leHRlbmQoRG9yaXRvRHVuZ2Vvbi5wcm90b3R5cGUsIHtcclxuXHQvLyBPdmVycmlkZSB0byBkbyBub3RoaW5nXHJcblx0ZG93bmxvYWQ6IGZ1bmN0aW9uKCkge30sIFxyXG5cdFxyXG5cdC8vIExvYWQgbW9kZWwgaW50byB0aGUgbWFwbW9kZWwgcHJvcGVydHlcclxuXHRsb2FkOiBmdW5jdGlvbigpIHtcclxuXHRcdHRoaXMubWFya0xvYWRpbmcoXCJNQVBfbWFwZGF0YVwiKTtcclxuXHRcdFxyXG5cdFx0dGhpcy5tZXRhZGF0YSA9IHtcclxuXHRcdFx0YXJlYW5hbWUgOiBcIlRoZSBEb3JpdG8gRHVuZ2VvblwiLFxyXG5cdFx0XHR3aWR0aDogNTAsXHJcblx0XHRcdGhlaWdodDogNTAsXHJcblx0XHRcdFxyXG5cdFx0XHRcImxheWVyc1wiIDogW1xyXG5cdFx0XHRcdHtcImxheWVyXCI6IDEsIFwiM2RcIjogWzEsIDAsIDAsIC0yNS41LCAgIDAsIDEsIDAsIDAsICAgMCwgMCwgMSwgLTI1LjUsICAgMCwgMCwgMCwgMV0sIFwiMmRcIjogWzUsIDEwXSB9LFxyXG5cdFx0XHRdLFxyXG5cdFx0XHRcIndhcnBzXCIgOiBbXHJcblx0XHRcdFx0eyBcImxvY1wiIDogWzI1LCAyNV0sIFwiYW5pbVwiIDogMCB9LFxyXG5cdFx0XHRdLFxyXG5cdFx0XHRcclxuXHRcdFx0XCJjYW1lcmFzXCI6IHtcclxuXHRcdFx0XHQwOiB7IGZhcjogMzAwLCB9LFxyXG5cdFx0XHR9XHJcblx0XHRcdC8vIGNsZWFyQ29sb3I6IDB4MDAwMDAwLFxyXG5cdFx0fTtcclxuXHRcdFxyXG5cdFx0dGhpcy50aWxlZGF0YSA9IHtcclxuXHRcdFx0Z2V0OiBmdW5jdGlvbigpeyByZXR1cm4gMDsgfSxcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0dmFyIGRvcml0b2RlZnMgPSBbXHJcblx0XHRcdFs1LCAwXSwgWzUsIDFdLCBbNSwgMl0sIFs1LCAzXSxcclxuXHRcdFx0WzYsIDBdLCBbNiwgMV0sIFs2LCAyXSwgWzYsIDNdLFxyXG5cdFx0XHRbNywgMF0sIFs3LCAxXSwgWzcsIDJdLCBbNywgM10sXHJcblx0XHRdO1xyXG5cdFx0XHJcblx0XHR2YXIgbW9kZWwgPSBuZXcgVEhSRUUuT2JqZWN0M0QoKTtcclxuXHRcdHsgLy8gRG9yaXRvIEJHXHJcblx0XHRcdHZhciBvZmZzZXRzID0gW107XHJcblx0XHRcdHZhciBnZW9tID0gbmV3IFRIUkVFLkdlb21ldHJ5KCk7XHJcblx0XHRcdHRoaXMuZ2MuY29sbGVjdChnZW9tKTtcclxuXHRcdFx0Zm9yICh2YXIgayA9IDA7IGsgPCA1MCAqIGRvcml0b2RlZnMubGVuZ3RoOyBrICsrICkge1xyXG5cdFx0XHRcdHZhciB2ZXJ0ZXggPSBuZXcgVEhSRUUuVmVjdG9yMygpO1xyXG5cdFx0XHRcdHZlcnRleC54ID0gTWF0aC5yYW5kb20oKSAqIDIwMCAtIDEwMDtcclxuXHRcdFx0XHR2ZXJ0ZXgueSA9IE1hdGgucmFuZG9tKCkgKiAtNTAgLSAxO1xyXG5cdFx0XHRcdHZlcnRleC56ID0gTWF0aC5yYW5kb20oKSAqIDIwMCAtIDE4MDtcclxuXHJcblx0XHRcdFx0Z2VvbS52ZXJ0aWNlcy5wdXNoKCB2ZXJ0ZXggKTtcclxuXHRcdFx0XHRcclxuXHRcdFx0XHR2YXIgZGkgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBkb3JpdG9kZWZzLmxlbmd0aCk7XHJcblx0XHRcdFx0b2Zmc2V0cy5wdXNoKG5ldyBUSFJFRS5WZWN0b3IyKFxyXG5cdFx0XHRcdFx0KGRvcml0b2RlZnNbZGldWzBdICogMTYpIC8gMTI4LCBcclxuXHRcdFx0XHRcdChkb3JpdG9kZWZzW2RpXVsxXSAqIDE2KSAvIDY0KSk7XHJcblx0XHRcdH1cclxuXHRcdFx0XHJcblx0XHRcdHZhciB0ZXggPSBuZXcgVEhSRUUuVGV4dHVyZShBSkFYX1RFWFRVUkVfSU1HKTtcclxuXHRcdFx0dGV4Lm1hZ0ZpbHRlciA9IFRIUkVFLk5lYXJlc3RGaWx0ZXI7XHJcblx0XHRcdHRleC5taW5GaWx0ZXIgPSBUSFJFRS5OZWFyZXN0RmlsdGVyO1xyXG5cdFx0XHR0ZXgud3JhcFMgPSBUSFJFRS5SZXBlYXRXcmFwcGluZztcclxuXHRcdFx0dGV4LndyYXBUID0gVEhSRUUuUmVwZWF0V3JhcHBpbmc7XHJcblx0XHRcdHRleC5yZXBlYXQgPSBuZXcgVEhSRUUuVmVjdG9yMigxNi8xMjgsIDE2LzY0KTtcclxuXHRcdFx0Ly8gdGV4Lm9mZnNldCA9IG5ldyBUSFJFRS5WZWN0b3IyKFxyXG5cdFx0XHQvLyBcdChkb3JpdG9kZWZzW2ldWzBdICogMTYpIC8gMTI4LFxyXG5cdFx0XHQvLyBcdChkb3JpdG9kZWZzW2ldWzFdICogMTYpIC8gNjQpO1xyXG5cdFx0XHR0ZXguZ2VuZXJhdGVNaXBtYXBzID0gZmFsc2U7XHJcblx0XHRcdHRleC5uZWVkc1VwZGF0ZSA9IHRydWU7XHJcblx0XHRcdFxyXG5cdFx0XHQvLyB2YXIgbWF0ID0gbmV3IFRIUkVFLlBvaW50Q2xvdWRNYXRlcmlhbCh7XHJcblx0XHRcdC8vIFx0c2l6ZTogTWF0aC5yYW5kb20oKSoyKzEsIHRyYW5zcGFyZW50OiB0cnVlLFxyXG5cdFx0XHQvLyBcdG1hcDogdGV4LFxyXG5cdFx0XHQvLyB9KTtcclxuXHRcdFx0XHJcblx0XHRcdHZhciBtYXQgPSBuZXcgRG9yaXRvQ2xvdWRNYXRlcmlhbCh7XHJcblx0XHRcdFx0bWFwOiB0ZXgsIHNpemU6IDEwLCBzY2FsZTogMTAwLFxyXG5cdFx0XHRcdG9mZnNldHM6IG9mZnNldHMsXHJcblx0XHRcdH0pO1xyXG5cdFx0XHRcclxuXHRcdFx0dmFyIGNsb3VkID0gbmV3IFRIUkVFLlBvaW50Q2xvdWQoZ2VvbSwgbWF0KTtcclxuXHRcdFx0Y2xvdWQuc29ydFBhcnRpY2xlcyA9IHRydWVcclxuXHRcdFx0bW9kZWwuYWRkKGNsb3VkKTtcclxuXHRcdH17XHJcblx0XHRcdHZhciBoZWlnaHQgPSA2MDtcclxuXHRcdFx0XHJcblx0XHRcdHZhciBnZW9tID0gbmV3IFRIUkVFLkN5bGluZGVyR2VvbWV0cnkoNDAwLCA1MCwgaGVpZ2h0KTtcclxuXHRcdFx0Ly8gZm9yICh2YXIgaSA9IDA7IGkgPCBnZW9tLnZlcnRpY2VzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdC8vIFx0dmFyIGMgPSAoZ2VvbS52ZXJ0aWNlc1tpXS55ICsgKGhlaWdodC8yKSkgLyBoZWlnaHQ7XHJcblx0XHRcdC8vIFx0Z2VvbS5jb2xvcnMucHVzaChuZXcgVEhSRUUuQ29sb3IoIGMsIGMgKiAwLjUsIDAgKSk7XHJcblx0XHRcdC8vIH1cclxuXHRcdFx0dmFyIGZhY2VpZHggPSBbJ2EnLCAnYicsICdjJ107XHJcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgZ2VvbS5mYWNlcy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRcdHZhciBmYWNlID0gZ2VvbS5mYWNlc1tpXTtcclxuXHRcdFx0XHRmb3IgKHZhciBqID0gMDsgaiA8IGZhY2VpZHgubGVuZ3RoOyBqKyspIHtcclxuXHRcdFx0XHRcdHZhciB2ZXJ0ID0gZ2VvbS52ZXJ0aWNlc1sgZmFjZVtmYWNlaWR4W2pdXSBdO1xyXG5cdFx0XHRcdFx0XHJcblx0XHRcdFx0XHR2YXIgYyA9ICh2ZXJ0LnkgKyAoaGVpZ2h0LzIpKSAvIGhlaWdodDtcclxuXHRcdFx0XHRcdGZhY2UudmVydGV4Q29sb3JzW2pdID0gbmV3IFRIUkVFLkNvbG9yKGMsIGMgKiAwLjUsIDApO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0Y29uc29sZS5sb2coZ2VvbS5jb2xvcnMpO1xyXG5cdFx0XHRnZW9tLmNvbG9yc05lZWRVcGRhdGUgPSB0cnVlO1xyXG5cdFx0XHRcclxuXHRcdFx0dmFyIG1hdCA9IG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7XHJcblx0XHRcdFx0c2lkZTogVEhSRUUuQmFja1NpZGUsXHJcblx0XHRcdFx0dmVydGV4Q29sb3JzOiBUSFJFRS5WZXJ0ZXhDb2xvcnMsXHJcblx0XHRcdFx0ZGVwdGhXcml0ZTogZmFsc2UsXHJcblx0XHRcdH0pO1xyXG5cdFx0XHRcclxuXHRcdFx0dmFyIGJnID0gbmV3IFRIUkVFLk1lc2goZ2VvbSwgbWF0KTtcclxuXHRcdFx0YmcucmVuZGVyRGVwdGggPSAxMDtcclxuXHRcdFx0YmcucG9zaXRpb24ueSA9IC01MDtcclxuXHRcdFx0bW9kZWwuYWRkKGJnKTtcclxuXHRcdH1cclxuXHRcdHRoaXMubWFwbW9kZWwgPSBtb2RlbDtcclxuXHRcdFxyXG5cdFx0dGhpcy5faW5pdCgpO1xyXG5cdFx0dGhpcy5tYXJrTG9hZEZpbmlzaGVkKFwiTUFQX21hcGRhdGFcIik7XHJcblx0fSxcclxuXHRcclxuXHRfaW5pdCA6IGZ1bmN0aW9uKCl7XHJcblx0XHR2YXIgc2VsZiA9IHRoaXM7XHJcblx0XHR0aGlzLnNjZW5lID0gbmV3IFRIUkVFLlNjZW5lKCk7XHJcblx0XHR0aGlzLmNhbWVyYXMgPSB7fTtcclxuXHRcdFxyXG5cdFx0aWYgKCF3aW5kb3cucGxheWVyKSB7XHJcblx0XHRcdHdpbmRvdy5wbGF5ZXIgPSBuZXcgUGxheWVyQ2hhcigpO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHR0aGlzLnNjZW5lLmFkZCh0aGlzLm1hcG1vZGVsKTtcclxuXHRcdFxyXG5cdFx0dGhpcy5jYW1lcmFMb2dpY3MgPSBbXTtcclxuXHRcdHNldHVwTWFwUmlnZ2luZyh0aGlzKTtcclxuXHRcdC8vTk9URTogTm8gbGlnaHRzXHJcblx0XHRcclxuXHRcdC8vIHRoaXMuc2NlbmUuYWRkKFxyXG5cdFx0Ly8gXHQvLyBtU2V0dXAuY2FtZXJhLmdlbjQuY2FsbCh0aGlzLCB7XHJcblx0XHQvLyBcdC8vIFx0XCJ0eXBlXCIgOiBcImdlbjRcIixcclxuXHRcdFx0XHRcclxuXHRcdC8vIFx0Ly8gfSlcclxuXHRcdC8vICk7XHJcblx0XHRcclxuXHRcdHRoaXMucXVldWVGb3JNYXBTdGFydChmdW5jdGlvbigpIHtcclxuXHRcdFx0U291bmRNYW5hZ2VyLnBsYXlNdXNpYyhcIm1fdG9ybndvcmxkXCIpO1xyXG5cdFx0XHRVSS5za3JpbS5fbmV4dE9wdHMgPSB7XHJcblx0XHRcdFx0c3BlZWQgOiAwLjIsIC8vVGhpcyB3aWxsIG92ZXJyaWRlIHRoZSBzcGVlZCBvZiB0aGUgZmFkZWluIGRvbmUgYnkgdGhlIG1hcCBtYW5hZ2VyLlxyXG5cdFx0XHR9OyBcclxuXHRcdFx0Ly8gVUkuZmFkZU91dCgwLjIpO1xyXG5cdFx0fSk7XHJcblx0XHRcclxuXHRcdHRocmVlUmVuZGVyZXIuc2V0Q2xlYXJDb2xvckhleCggMHgwMDAwMDAgKTtcclxuXHRcdFxyXG5cdFx0Ly8gTWFwIE1vZGVsIGlzIG5vdyByZWFkeVxyXG5cdFx0XHJcblx0XHR0aGlzLl9pbml0RXZlbnRNYXAoKTtcclxuXHRcdFxyXG5cdFx0dGhpcy5lbWl0KFwibWFwLXJlYWR5XCIpO1xyXG5cdFx0XHJcblx0fSxcclxuXHRcclxuXHRfX2xvYWRTY3JpcHQgOiBmdW5jdGlvbih0KSB7XHJcblx0XHRpZiAodCAhPSBcImxcIikgcmV0dXJuOyAvL0xvY2FsIG9ubHlcclxuXHRcdFxyXG5cdFx0Ly8gQWRkIGxvY2FsIGV2ZW50c1xyXG5cdFx0Ly9UT0RPIEFkZCBHbWFubiBoZXJlIHRvIHRha2UgeW91IGJhY2sgdG8gdGhlIG1haW4gd29ybGRcclxuXHR9LFxyXG5cdFxyXG5cdGNhbldhbGtCZXR3ZWVuIDogZnVuY3Rpb24oc3JjeCwgc3JjeSwgZGVzdHgsIGRlc3R5LCBpZ25vcmVFdmVudHMpIHtcclxuXHRcdGlmIChNYXRoLmFicyhzcmN4IC0gZGVzdHgpICsgTWF0aC5hYnMoc3JjeSAtIGRlc3R5KSAhPSAxKSByZXR1cm4gZmFsc2U7XHJcblx0XHRcclxuXHRcdGlmIChkZXN0eCA8IDAgfHwgZGVzdHggPj0gdGhpcy5tZXRhZGF0YS53aWR0aCkgcmV0dXJuIGZhbHNlO1xyXG5cdFx0aWYgKGRlc3R5IDwgMCB8fCBkZXN0eSA+PSB0aGlzLm1ldGFkYXRhLmhlaWdodCkgcmV0dXJuIGZhbHNlO1xyXG5cdFx0XHJcblx0XHRpZiAoIWlnbm9yZUV2ZW50cykgeyAvL2NoZWNrIGZvciB0aGUgcHJlc2Vuc2Ugb2YgZXZlbnRzXHJcblx0XHRcdHZhciBldnRzID0gdGhpcy5ldmVudE1hcC5nZXQoZGVzdHgsIGRlc3R5KTtcclxuXHRcdFx0aWYgKGV2dHMpIHtcclxuXHRcdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGV2dHMubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0XHRcdGlmICghZXZ0c1tpXS5jYW5XYWxrT24oKSkgcmV0dXJuIGZhbHNlO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHRyZXR1cm4gdHJ1ZTtcclxuXHR9LFxyXG59KTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gRG9yaXRvRHVuZ2VvbjtcclxuXHJcblxyXG5mdW5jdGlvbiBEb3JpdG9DbG91ZE1hdGVyaWFsKHRleHR1cmUsIG9wdHMpIHtcclxuXHRpZiAoJC5pc1BsYWluT2JqZWN0KHRleHR1cmUpICYmIG9wdHMgPT09IHVuZGVmaW5lZCkge1xyXG5cdFx0b3B0cyA9IHRleHR1cmU7IHRleHR1cmUgPSBudWxsO1xyXG5cdH1cclxuXHRcclxuXHR0aGlzLm1hcCA9IHRleHR1cmUgfHwgb3B0cy50ZXh0dXJlIHx8IG9wdHMubWFwIHx8IG5ldyBUSFJFRS5UZXh0dXJlKCk7XHJcblx0dGhpcy5vZmZzZXRzID0gb3B0cy5vZmZzZXRzIHx8IFtdO1xyXG5cdHRoaXMucmVwZWF0ID0gb3B0cy5yZXBlYXQgfHwgdGhpcy5tYXAucmVwZWF0O1xyXG5cdFxyXG5cdHRoaXMuc2l6ZSA9IG9wdHMuc2l6ZSB8fCAxO1xyXG5cdHRoaXMuc2NhbGUgPSBvcHRzLnNjYWxlIHx8IDE7XHJcblx0XHJcblx0dmFyIHBhcmFtcyA9IHRoaXMuX2NyZWF0ZU1hdFBhcmFtcyhvcHRzKTtcclxuXHRUSFJFRS5TaGFkZXJNYXRlcmlhbC5jYWxsKHRoaXMsIHBhcmFtcyk7XHJcblx0dGhpcy50eXBlID0gXCJEb3JpdG9DbG91ZE1hdGVyaWFsXCI7XHJcblx0XHJcblx0dGhpcy50cmFuc3BhcmVudCA9IChvcHRzLnRyYW5zcGFyZW50ICE9PSB1bmRlZmluZWQpPyBvcHRzLnRyYW5zcGFyZW50IDogdHJ1ZTtcclxuXHR0aGlzLmFscGhhVGVzdCA9IDAuMDU7XHJcbn1cclxuaW5oZXJpdHMoRG9yaXRvQ2xvdWRNYXRlcmlhbCwgVEhSRUUuU2hhZGVyTWF0ZXJpYWwpO1xyXG5leHRlbmQoRG9yaXRvQ2xvdWRNYXRlcmlhbC5wcm90b3R5cGUsIHtcclxuXHRtYXAgOiBudWxsLFxyXG5cdFxyXG5cdF9jcmVhdGVNYXRQYXJhbXMgOiBmdW5jdGlvbigpIHtcclxuXHRcdHZhciBwYXJhbXMgPSB7XHJcblx0XHRcdGF0dHJpYnV0ZXM6IHtcclxuXHRcdFx0XHRvZmZzZXQ6XHRcdHsgdHlwZTogJ3YyJywgdmFsdWU6IHRoaXMub2Zmc2V0cyB9LFxyXG5cdFx0XHR9LFxyXG5cdFx0XHRcclxuXHRcdFx0dW5pZm9ybXMgOiB7XHJcblx0XHRcdFx0cmVwZWF0OiAgICAgeyB0eXBlOiAndjInLCB2YWx1ZTogdGhpcy5yZXBlYXQgfSxcclxuXHRcdFx0XHRtYXA6XHRcdHsgdHlwZTogXCJ0XCIsIHZhbHVlOiB0aGlzLm1hcCB9LFxyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdHNpemU6XHRcdHsgdHlwZTogXCJmXCIsIHZhbHVlOiB0aGlzLnNpemUgfSxcclxuXHRcdFx0XHRzY2FsZTpcdFx0eyB0eXBlOiBcImZcIiwgdmFsdWU6IHRoaXMuc2NhbGUgfSxcclxuXHRcdFx0fSxcclxuXHRcdH07XHJcblx0XHRcclxuXHRcdHBhcmFtcy52ZXJ0ZXhTaGFkZXIgPSB0aGlzLl92ZXJ0U2hhZGVyO1xyXG5cdFx0cGFyYW1zLmZyYWdtZW50U2hhZGVyID0gdGhpcy5fZnJhZ1NoYWRlcjtcclxuXHRcdHJldHVybiBwYXJhbXM7XHJcblx0fSxcclxuXHRcclxuXHRfdmVydFNoYWRlcjogW1xyXG5cdFx0XCJ1bmlmb3JtIGZsb2F0IHNpemU7XCIsXHJcblx0XHRcInVuaWZvcm0gZmxvYXQgc2NhbGU7XCIsXHJcblx0XHJcblx0XHRcImF0dHJpYnV0ZSB2ZWMyIG9mZnNldDtcIixcclxuXHRcdFxyXG5cdFx0XCJ2YXJ5aW5nIHZlYzIgdk9mZnNldDtcIixcclxuXHRcdFxyXG5cdFx0XCJ2b2lkIG1haW4oKSB7XCIsXHJcblx0XHRcdFwidk9mZnNldCA9IG9mZnNldDtcIixcclxuXHRcdFx0XCJ2ZWM0IG12UG9zaXRpb24gPSBtb2RlbFZpZXdNYXRyaXggKiB2ZWM0KCBwb3NpdGlvbiwgMS4wICk7XCIsXHJcblxyXG5cdFx0XHRcImdsX1BvaW50U2l6ZSA9IHNpemUgKiAoIHNjYWxlIC8gbGVuZ3RoKCBtdlBvc2l0aW9uLnh5eiApICk7XCIsXHJcblx0XHRcdFwiZ2xfUG9zaXRpb24gPSBwcm9qZWN0aW9uTWF0cml4ICogbXZQb3NpdGlvbjtcIixcclxuXHRcdFwifVwiLFxyXG5cdF0uam9pbihcIlxcblwiKSxcclxuXHRcclxuXHRfZnJhZ1NoYWRlcjogW1xyXG5cdFx0XCJ1bmlmb3JtIHNhbXBsZXIyRCBtYXA7XCIsXHJcblx0XHRcInVuaWZvcm0gdmVjMiByZXBlYXQ7XCIsXHJcblx0XHRcclxuXHRcdFwidmFyeWluZyB2ZWMyIHZPZmZzZXQ7XCIsXHJcblx0XHRcclxuXHRcdFwidm9pZCBtYWluKCkge1wiLFxyXG5cdFx0XHRcInZlYzIgdXYgPSB2ZWMyKCBnbF9Qb2ludENvb3JkLngsIDEuMCAtIGdsX1BvaW50Q29vcmQueSApO1wiLFxyXG5cdFx0XHRcInZlYzQgdGV4ID0gdGV4dHVyZTJEKCBtYXAsIHV2ICogcmVwZWF0ICsgdk9mZnNldCApO1wiLFxyXG5cdFx0XHRcclxuXHRcdFx0JyNpZmRlZiBBTFBIQVRFU1QnLFxyXG5cdFx0XHRcdCdpZiAoIHRleC5hIDwgQUxQSEFURVNUICkgZGlzY2FyZDsnLFxyXG5cdFx0XHQnI2VuZGlmJyxcclxuXHRcdFx0XHJcblx0XHRcdFwiZ2xfRnJhZ0NvbG9yID0gdGV4O1wiLFxyXG5cdFx0XCJ9XCIsXHJcblx0XS5qb2luKFwiXFxuXCIpLFxyXG5cdFxyXG59KTsiLCIvLyBtYXAtc2V0dXAuanNcclxuLy8gRGVmaW5lcyBzb21lIG9mIHRoZSBzZXR1cCBmdW5jdGlvbnMgZm9yIE1hcC5qcyBpbiBhIHNlcGFyYXRlIGZpbGUsIGZvciBvcmdhbml6YXRpb25cclxuXHJcbnZhciBleHRlbmQgPSByZXF1aXJlKFwiZXh0ZW5kXCIpO1xyXG5cclxuZnVuY3Rpb24gc2V0dXBNYXBSaWdnaW5nKG1hcCkge1xyXG5cdHtcdC8vIFNldHVwIExpZ2h0aW5nIFJpZ2dpbmdcclxuXHRcdHZhciBsaWdodGRlZiA9IGV4dGVuZCh7IFwidHlwZVwiOiBcImludFwiLCBcImRlZmF1bHRcIjoge30gfSwgbWFwLm1ldGFkYXRhLmxpZ2h0aW5nKTtcclxuXHRcdFxyXG5cdFx0dmFyIHJpZyA9IHNldHVwTGlnaHRpbmcobWFwLCBsaWdodGRlZik7XHJcblx0XHRtYXAuc2NlbmUuYWRkKHJpZyk7XHJcblx0fVxyXG5cdFxyXG5cdHtcdC8vIFNldHVwIFNoYWRvdyBNYXAgUmlnZ2luZ1xyXG5cdFx0dmFyIHNoYWRvd2RlZiA9IGV4dGVuZCh7fSwgbWFwLm1ldGFkYXRhLnNoYWRvd21hcCk7XHJcblx0XHRcclxuXHRcdGlmICgkLmlzUGxhaW5PYmplY3Qoc2hhZG93ZGVmKSkge1xyXG5cdFx0XHRzaGFkb3dkZWYgPSBbc2hhZG93ZGVmXTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0dmFyIHJpZyA9IHNldHVwU2hhZG93TWFwcyhtYXAsIHNoYWRvd2RlZik7XHJcblx0XHRtYXAuc2NlbmUuYWRkKHJpZyk7XHJcblx0fVxyXG5cdFxyXG5cdHtcdC8vIFNldHVwIENhbWVyYSBSaWdnaW5nXHJcblx0XHR2YXIgY2FtZGVmID0gZXh0ZW5kKHsgXCIwXCI6IHt9IH0sIG1hcC5tZXRhZGF0YS5jYW1lcmFzKTtcclxuXHRcdFxyXG5cdFx0dmFyIHJpZyA9IHNldHVwQ2FtZXJhcyhtYXAsIGNhbWRlZik7XHJcblx0XHRtYXAuc2NlbmUuYWRkKHJpZyk7XHJcblx0fVxyXG5cdFxyXG59XHJcbm1vZHVsZS5leHBvcnRzID0gc2V0dXBNYXBSaWdnaW5nO1xyXG5cclxuXHJcbmZ1bmN0aW9uIHNldHVwTGlnaHRpbmcobWFwLCBkZWYpIHtcclxuXHR2YXIgbm9kZSA9IG5ldyBUSFJFRS5PYmplY3QzRCgpO1xyXG5cdG5vZGUubmFtZSA9IFwiTGlnaHRpbmcgUmlnXCI7XHJcblx0XHJcblx0dmFyIGxpZ2h0O1xyXG5cdHZhciBPUklHSU4gPSBuZXcgVEhSRUUuVmVjdG9yMygwLCAwLCAwKTtcclxuXHRcclxuXHRpZiAoZGVmLnR5cGUgPT0gXCJpbnRcIikge1xyXG5cdFx0Ly8gU2V0dXAgZGVmYXVsdCBpbnRlcmlvciBsaWdodGluZyByaWdcclxuXHRcdHZhciBpbnRlbnNpdHkgPSBkZWZbXCJkZWZhdWx0XCJdLmludGVuc2l0eSB8fCAxLjQ7XHJcblx0XHR2YXIgc2t5Q29sb3IgPSBkZWZbXCJkZWZhdWx0XCJdLnNreUNvbG9yIHx8IDB4RkZGRkZGO1xyXG5cdFx0dmFyIGdyb3VuZENvbG9yID0gZGVmW1wiZGVmYXVsdFwiXS5ncm91bmRDb2xvciB8fCAweDExMTExMTtcclxuXHRcdFxyXG5cdFx0bGlnaHQgPSBuZXcgVEhSRUUuSGVtaXNwaGVyZUxpZ2h0KHNreUNvbG9yLCBncm91bmRDb2xvciwgaW50ZW5zaXR5KTtcclxuXHRcdFxyXG5cdFx0dmFyIGNwID0gZGVmW1wiZGVmYXVsdFwiXS5wb3NpdGlvbiB8fCBbLTQsIDQsIDRdO1xyXG5cdFx0bGlnaHQucG9zaXRpb24uc2V0KGNwWzBdLCBjcFsxXSwgY3BbMl0pO1xyXG5cdFx0XHJcblx0XHRsaWdodC5sb29rQXQoT1JJR0lOKTtcclxuXHRcdG5vZGUuYWRkKGxpZ2h0KTtcclxuXHR9XHJcblx0ZWxzZSBpZiAoZGVmLnR5cGUgPT0gXCJleHRcIikge1xyXG5cdFx0Ly8gU2V0dXAgZGVmYXVsdCBleHRlcmlvciBsaWdodGluZyByaWcsIHdpdGggc3VuIG1vdmVtZW50XHJcblx0XHR2YXIgaW50ZW5zaXR5ID0gZGVmW1wiZGVmYXVsdFwiXS5pbnRlbnNpdHkgfHwgMS40O1xyXG5cdFx0dmFyIHNreUNvbG9yID0gZGVmW1wiZGVmYXVsdFwiXS5za3lDb2xvciB8fCAweEZGRkZGRjtcclxuXHRcdHZhciBncm91bmRDb2xvciA9IGRlZltcImRlZmF1bHRcIl0uZ3JvdW5kQ29sb3IgfHwgMHgxMTExMTE7XHJcblx0XHRcclxuXHRcdGxpZ2h0ID0gbmV3IFRIUkVFLkhlbWlzcGhlcmVMaWdodChza3lDb2xvciwgZ3JvdW5kQ29sb3IsIGludGVuc2l0eSk7XHJcblx0XHRcclxuXHRcdHZhciBjcCA9IGRlZltcImRlZmF1bHRcIl0ucG9zaXRpb24gfHwgWy00LCA0LCA0XTtcclxuXHRcdGxpZ2h0LnBvc2l0aW9uLnNldChjcFswXSwgY3BbMV0sIGNwWzJdKTtcclxuXHRcdFxyXG5cdFx0bGlnaHQubG9va0F0KE9SSUdJTik7XHJcblx0XHRub2RlLmFkZChsaWdodCk7XHJcblx0XHRcclxuXHRcdC8vVE9ETyBzZXR1cCBzdW4gbW92ZW1lbnRcclxuXHR9XHJcblx0XHJcblx0cmV0dXJuIG5vZGU7XHJcbn1cclxuXHJcblxyXG5cclxuZnVuY3Rpb24gc2V0dXBTaGFkb3dNYXBzKG1hcCwgc2hhZG93TWFwcykge1xyXG5cdHZhciBub2RlID0gbmV3IFRIUkVFLk9iamVjdDNEKCk7XHJcblx0bm9kZS5uYW1lID0gXCJTaGFkb3cgQ2FzdGluZyBSaWdcIjtcclxuXHRcclxuXHRmb3IgKHZhciBpID0gMDsgaSA8IHNoYWRvd01hcHMubGVuZ3RoOyBpKyspIHtcclxuXHRcdHZhciBzaG0gPSBzaGFkb3dNYXBzW2ldO1xyXG5cdFx0XHJcblx0XHRsaWdodCA9IG5ldyBUSFJFRS5EaXJlY3Rpb25hbExpZ2h0KCk7XHJcblx0XHRsaWdodC5wb3NpdGlvbi5zZXQoMCwgNzUsIDEpO1xyXG5cdFx0bGlnaHQuY2FzdFNoYWRvdyA9IHRydWU7XHJcblx0XHRsaWdodC5vbmx5U2hhZG93ID0gdHJ1ZTtcclxuXHRcdGxpZ2h0LnNoYWRvd0RhcmtuZXNzID0gMC43O1xyXG5cdFx0bGlnaHQuc2hhZG93QmlhcyA9IDAuMDAxO1xyXG5cdFx0XHJcblx0XHRsaWdodC5zaGFkb3dDYW1lcmFOZWFyID0gc2htLm5lYXIgfHwgMTtcclxuXHRcdGxpZ2h0LnNoYWRvd0NhbWVyYUZhciA9IHNobS5mYXIgfHwgMjAwO1xyXG5cdFx0bGlnaHQuc2hhZG93Q2FtZXJhVG9wID0gc2htLnRvcCB8fCAzMDtcclxuXHRcdGxpZ2h0LnNoYWRvd0NhbWVyYUJvdHRvbSA9IHNobS5ib3R0b20gfHwgLTMwO1xyXG5cdFx0bGlnaHQuc2hhZG93Q2FtZXJhTGVmdCA9IHNobS5sZWZ0IHx8IC0zMDtcclxuXHRcdGxpZ2h0LnNoYWRvd0NhbWVyYVJpZ2h0ID0gc2htLnJpZ2h0IHx8IDMwO1xyXG5cdFx0XHJcblx0XHRsaWdodC5zaGFkb3dNYXBXaWR0aCA9IHNobS53aWR0aCB8fCA1MTI7XHJcblx0XHRsaWdodC5zaGFkb3dNYXBIZWlnaHQgPSBzaG0uaGVpZ2h0IHx8IDUxMjtcclxuXHRcdFxyXG5cdFx0Ly8gbGlnaHQuc2hhZG93Q2FtZXJhVmlzaWJsZSA9IHRydWU7XHJcblx0XHRub2RlLmFkZChsaWdodCk7XHJcblx0XHRcclxuXHRcdERFQlVHLl9zaGFkb3dDYW1lcmEgPSBsaWdodDtcclxuXHR9IFxyXG5cdFxyXG5cdHJldHVybiBub2RlO1xyXG59XHJcblxyXG5cclxuXHJcbnZhciBjYW1CZWhhdmlvcnMgPSB7XHJcblx0bm9uZTogZnVuY3Rpb24oKXt9LFxyXG5cdGZvbGxvd1BsYXllciA6IGZ1bmN0aW9uKGNkZWYsIGNhbSwgY2FtUm9vdCkge1xyXG5cdFx0cmV0dXJuIGZ1bmN0aW9uKGRlbHRhKSB7XHJcblx0XHRcdGNhbVJvb3QucG9zaXRpb24uc2V0KHBsYXllci5hdmF0YXJfbm9kZS5wb3NpdGlvbik7XHJcblx0XHRcdC8vVE9ETyBuZWdhdGUgbW92aW5nIHVwIGFuZCBkb3duIHdpdGgganVtcGluZ1xyXG5cdFx0fTtcclxuXHR9LFxyXG5cdGZvbGxvd1BsYXllclg6IGZ1bmN0aW9uKGNkZWYsIGNhbWUsIGNhbVJvb3QpIHtcclxuXHRcdHZhciB6YXhpcyA9IGNkZWZbXCJ6YXhpc1wiXSB8fCAwO1xyXG5cdFx0dmFyIHhtYXggPSBjZGVmW1wieG1heFwiXSB8fCAxMDAwO1xyXG5cdFx0dmFyIHhtaW4gPSBjZGVmW1wieG1pblwiXSB8fCAtMTAwMDtcclxuXHRcdFxyXG5cdFx0cmV0dXJuIGZ1bmN0aW9uKGRlbHRhKSB7XHJcblx0XHRcdGNhbVJvb3QucG9zaXRpb24ueCA9IE1hdGgubWF4KHhtaW4sIE1hdGgubWluKHhtYXgsIHBsYXllci5hdmF0YXJfbm9kZS5wb3NpdGlvbi54KSk7XHJcblx0XHRcdGNhbVJvb3QucG9zaXRpb24ueSA9IHBsYXllci5hdmF0YXJfbm9kZS5wb3NpdGlvbi55O1xyXG5cdFx0XHRjYW1Sb290LnBvc2l0aW9uLnogPSB6YXhpcztcclxuXHRcdH07XHJcblx0fVxyXG59O1xyXG5cclxuZnVuY3Rpb24gc2V0dXBDYW1lcmFzKG1hcCwgY2FtbGlzdCkge1xyXG5cdHZhciBzY3JXaWR0aCA9ICQoXCIjZ2FtZXNjcmVlblwiKS53aWR0aCgpO1xyXG5cdHZhciBzY3JIZWlnaHQgPSAkKFwiI2dhbWVzY3JlZW5cIikuaGVpZ2h0KCk7XHJcblx0XHJcblx0dmFyIG5vZGUgPSBuZXcgVEhSRUUuT2JqZWN0M0QoKTtcclxuXHRub2RlLm5hbWUgPSBcIkNhbWVyYSBSaWdcIjtcclxuXHJcblx0Zm9yICh2YXIgY25hbWUgaW4gY2FtbGlzdCkge1xyXG5cdFx0dmFyIGM7XHJcblx0XHRcclxuXHRcdGlmIChjYW1saXN0W2NuYW1lXS50eXBlID09IFwib3J0aG9cIikge1xyXG5cdFx0XHRjID0gbmV3IFRIUkVFLk9ydGhvZ3JhcGhpY0NhbWVyYShcclxuXHRcdFx0XHRzY3JXaWR0aC8tMiwgc2NyV2lkdGgvMiwgc2NySGVpZ2h0LzIsIHNjckhlaWdodC8tMiwgMC4xLCAxNTApO1xyXG5cdFx0XHRcclxuXHRcdFx0dmFyIGNwID0gY2FtbGlzdFtjbmFtZV0ucG9zaXRpb24gfHwgWzAsIDEwMCwgMF07XHJcblx0XHRcdGMucG9zaXRpb24uc2V0KGNwWzBdLCBjcFsxXSwgY3BbMl0pO1xyXG5cdFx0XHRcclxuXHRcdFx0Yy5yb2F0aW9uLnggPSAtTWF0aC5QSSAvIDI7IC8vVE9ETyBsb29rQXQ/XHJcblx0XHRcdFxyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0YyA9IG5ldyBUSFJFRS5QZXJzcGVjdGl2ZUNhbWVyYShcclxuXHRcdFx0XHRcdGNhbWxpc3RbY25hbWVdLmZvdiB8fCA1NSwgXHJcblx0XHRcdFx0XHRzY3JXaWR0aCAvIHNjckhlaWdodCwgXHJcblx0XHRcdFx0XHRjYW1saXN0W2NuYW1lXS5uZWFyIHx8IDAuMSwgXHJcblx0XHRcdFx0XHRjYW1saXN0W2NuYW1lXS5mYXIgfHwgMTUwKTtcclxuXHRcdFx0XHJcblx0XHRcdHZhciBjcCA9IGNhbWxpc3RbY25hbWVdLnBvc2l0aW9uIHx8IFswLCA1LjQ1LCA1LjNdO1xyXG5cdFx0XHRjLnBvc2l0aW9uLnNldChjcFswXSwgY3BbMV0sIGNwWzJdKTtcclxuXHRcdFx0XHJcblx0XHRcdGlmIChjYW1saXN0W2NuYW1lXS5yb3RhdGlvbikge1xyXG5cdFx0XHRcdHZhciBjbCA9IGNhbWxpc3RbY25hbWVdLnJvdGF0aW9uIHx8IFstNDUsIDAsIDBdO1xyXG5cdFx0XHRcdGNsWzBdICo9IE1hdGguUEkgLyAxODA7XHJcblx0XHRcdFx0Y2xbMV0gKj0gTWF0aC5QSSAvIDE4MDtcclxuXHRcdFx0XHRjbFsyXSAqPSBNYXRoLlBJIC8gMTgwO1xyXG5cdFx0XHRcdGMucm90YXRpb24uc2V0KGNsWzBdLCBjbFsxXSwgY2xbMl0pO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdHZhciBjbCA9IGNhbWxpc3RbY25hbWVdLmxvb2thdCB8fCBbMCwgMC44LCAwXTtcclxuXHRcdFx0XHRjLmxvb2tBdChuZXcgVEhSRUUuVmVjdG9yMyhjbFswXSwgY2xbMV0sIGNsWzJdKSk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0Yy5uYW1lID0gXCJDYW1lcmEgW1wiK2NuYW1lK1wiXVwiO1xyXG5cdFx0Yy5teV9jYW1lcmEgPSBjO1xyXG5cdFx0XHJcblx0XHR2YXIgY3Jvb3Q7XHJcblx0XHRpZiAoIWNhbWxpc3RbY25hbWVdLmZpeGVkQ2FtZXJhKSB7XHJcblx0XHRcdGNyb290ID0gbmV3IFRIUkVFLk9iamVjdDNEKCk7XHJcblx0XHRcdGNyb290LmFkZChjKTtcclxuXHRcdFx0Y3Jvb3QubXlfY2FtZXJhID0gYztcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0dmFyIGNiID0gY2FtbGlzdFtjbmFtZV0uYmVoYXZpb3IgfHwgXCJmb2xsb3dQbGF5ZXJcIjtcclxuXHRcdHZhciBjYiA9IGNhbUJlaGF2aW9yc1tjYl0uY2FsbChtYXAsIGNhbWxpc3RbY25hbWVdLCBjLCBjcm9vdCk7XHJcblx0XHRpZiAoY2IpIHtcclxuXHRcdFx0bWFwLmNhbWVyYUxvZ2ljcy5wdXNoKGNiKTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0bm9kZS5hZGQoY3Jvb3QgfHwgYyk7XHJcblx0XHRtYXAuY2FtZXJhc1tjbmFtZV0gPSBjO1xyXG5cdFx0aWYgKGNuYW1lID09IDApIG1hcC5jYW1lcmEgPSBjO1xyXG5cdH1cclxuXHRcclxuXHRpZiAoIW1hcC5jYW1lcmEpIHRocm93IG5ldyBFcnJvcihcIk5vIGNhbWVyYXMgZGVmaW5lZCFcIik7XHJcblx0XHJcblx0cmV0dXJuIG5vZGU7XHJcbn1cclxuXHJcblxyXG4iLCIvLyBtdGwtbG9hZGVyLmpzXHJcbi8vIEEgVEhSRUUuanMgd2F2ZWZyb250IE1hdGVyaWFsIExpYnJhcnkgbG9hZGVyXHJcbi8vIENvcGllZCBtb3N0bHkgd2hvbGVzYWxlIGZyb20gdGhlIHRocmVlLmpzIGV4YW1wbGVzIGZvbGRlci5cclxuLy8gT3JpZ2luYWwgYXV0aG9yczogbXJkb29iLCBhbmdlbHh1YW5jaGFuZ1xyXG5cclxudmFyIG1vbWVudCA9IHJlcXVpcmUoXCJtb21lbnRcIik7XHJcbnZhciBpbmhlcml0cyA9IHJlcXVpcmUoXCJpbmhlcml0c1wiKTtcclxudmFyIGV4dGVuZCA9IHJlcXVpcmUoXCJleHRlbmRcIik7XHJcbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKFwiZXZlbnRzXCIpLkV2ZW50RW1pdHRlcjtcclxuXHJcblxyXG5mdW5jdGlvbiBNdGxMb2FkZXIobXRsZmlsZSwgbG9hZFRleHR1cmUsIG9wdHMpIHtcclxuXHRFdmVudEVtaXR0ZXIuY2FsbCh0aGlzKTtcclxuXHRleHRlbmQodGhpcywgb3B0cyk7XHJcblx0XHJcblx0dGhpcy5tdGxmaWxlID0gbXRsZmlsZTtcclxuXHR0aGlzLmxvYWRUZXh0dXJlID0gbG9hZFRleHR1cmU7XHJcblx0XHJcblx0dGhpcy5nYyA9IG9wdHMuZ2M7XHJcbn1cclxuaW5oZXJpdHMoTXRsTG9hZGVyLCBFdmVudEVtaXR0ZXIpO1xyXG5leHRlbmQoTXRsTG9hZGVyLnByb3RvdHlwZSwge1xyXG5cdGxvYWRUZXh0dXJlIDogbnVsbCxcclxuXHRtdGxmaWxlIDogbnVsbCxcclxuXHRcclxuXHRsb2FkOiBmdW5jdGlvbigpIHtcclxuXHRcdGlmICghdGhpcy5tdGxmaWxlKSB0aHJvdyBuZXcgRXJyb3IoXCJObyBNVEwgZmlsZSBnaXZlbiFcIik7XHJcblx0XHRpZiAoIXRoaXMubG9hZFRleHR1cmUpIHRocm93IG5ldyBFcnJvcihcIk5vIGxvYWRUZXh0dXJlIGZ1bmN0aW9uIGdpdmVuIVwiKTtcclxuXHRcdFxyXG5cdFx0dmFyIHNjb3BlID0gdGhpcztcclxuXHRcdHZhciBwYXJzZWQgPSBzY29wZS5wYXJzZSh0aGlzLm10bGZpbGUpO1xyXG5cdFx0dGhpcy5lbWl0KFwibG9hZFwiLCBwYXJzZWQpO1xyXG5cdH0sXHJcblx0XHJcblx0cGFyc2UgOiBmdW5jdGlvbih0ZXh0KSB7XHJcblx0XHR2YXIgbGluZXMgPSB0ZXh0LnNwbGl0KCBcIlxcblwiICk7XHJcblx0XHR2YXIgaW5mbyA9IHt9O1xyXG5cdFx0dmFyIGRlbGltaXRlcl9wYXR0ZXJuID0gL1xccysvO1xyXG5cdFx0dmFyIG1hdGVyaWFsc0luZm8gPSB7fTtcclxuXHRcdFxyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGg7IGkgKyspIHtcclxuXHRcdFx0XHR2YXIgbGluZSA9IGxpbmVzW2ldO1xyXG5cdFx0XHRcdGxpbmUgPSBsaW5lLnRyaW0oKTtcclxuXHRcdFx0XHRcclxuXHRcdFx0XHRpZiAobGluZS5sZW5ndGggPT09IDAgfHwgbGluZS5jaGFyQXQoIDAgKSA9PT0gJyMnKSBjb250aW51ZTsgLy9pZ25vcmUgYmxhbmsgbGluZXMgYW5kIGNvbW1lbnRzXHJcblx0XHRcdFx0XHJcblx0XHRcdFx0Ly8gRmluZCB3aGVyZSB0aGUgZmlyc3Qgc3BhY2UgaXMgaW4gYSBsaW5lIGFuZCBzcGxpdCBvZmYga2V5IGFuZCB2YWx1ZSBiYXNlZCBvbiB0aGF0XHJcblx0XHRcdFx0dmFyIHBvcyA9IGxpbmUuaW5kZXhPZignICcpO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdHZhciBrZXkgPSAocG9zID49IDApID8gbGluZS5zdWJzdHJpbmcoMCwgcG9zKSA6IGxpbmU7XHJcblx0XHRcdFx0a2V5ID0ga2V5LnRvTG93ZXJDYXNlKCk7XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0dmFyIHZhbHVlID0gKHBvcyA+PSAwKSA/IGxpbmUuc3Vic3RyaW5nKHBvcyArIDEpIDogXCJcIjtcclxuXHRcdFx0XHR2YWx1ZSA9IHZhbHVlLnRyaW0oKTtcclxuXHRcdFx0XHRcclxuXHRcdFx0XHRpZiAoa2V5ID09PSBcIm5ld210bFwiKSB7IC8vIE5ldyBtYXRlcmlhbCBkZWZpbml0aW9uXHJcblx0XHRcdFx0XHRpbmZvID0geyBuYW1lOiB2YWx1ZSB9O1xyXG5cdFx0XHRcdFx0bWF0ZXJpYWxzSW5mb1sgdmFsdWUgXSA9IGluZm87XHJcblx0XHRcdFx0XHRcclxuXHRcdFx0XHR9IGVsc2UgaWYgKCBpbmZvICkgeyAvLyBJZiB3ZSBhcmUgd29ya2luZyB3aXRoIGEgbWF0ZXJpYWxcclxuXHRcdFx0XHRcdGlmIChrZXkgPT09IFwia2FcIiB8fCBrZXkgPT09IFwia2RcIiB8fCBrZXkgPT09IFwia3NcIikge1xyXG5cdFx0XHRcdFx0XHR2YXIgc3MgPSB2YWx1ZS5zcGxpdChkZWxpbWl0ZXJfcGF0dGVybiwgMyk7XHJcblx0XHRcdFx0XHRcdGluZm9ba2V5XSA9IFtwYXJzZUZsb2F0KHNzWzBdKSwgcGFyc2VGbG9hdChzc1sxXSksIHBhcnNlRmxvYXQoc3NbMl0pXTtcclxuXHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdGluZm9ba2V5XSA9IHZhbHVlO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XHQvLyBPbmNlIHdlJ3ZlIHBhcnNlZCBvdXQgYWxsIHRoZSBtYXRlcmlhbHMsIGxvYWQgdGhlbSBpbnRvIGEgXCJjcmVhdG9yXCJcclxuXHRcdFx0Y29uc29sZS5sb2coXCJQYXJzZWQgTWF0ZXJpYWxzOlwiLCBPYmplY3Qua2V5cyhtYXRlcmlhbHNJbmZvKS5sZW5ndGgsIG1hdGVyaWFsc0luZm8ubGVuZ3RoLCBtYXRlcmlhbHNJbmZvKTtcclxuXHRcdFx0dmFyIG1hdENyZWF0b3IgPSBuZXcgTWF0ZXJpYWxDcmVhdG9yKHRoaXMubG9hZFRleHR1cmUsIHRoaXMuZ2MpO1xyXG5cdFx0XHRtYXRDcmVhdG9yLnNldE1hdGVyaWFscyhtYXRlcmlhbHNJbmZvKTtcclxuXHRcdFx0cmV0dXJuIG1hdENyZWF0b3I7XHJcblx0XHR9IGNhdGNoIChlKSB7XHJcblx0XHRcdGNvbnNvbGUuZXJyb3IoXCJNVExcIiwgZSk7XHJcblx0XHRcdHRoaXMuZW1pdChcImVycm9yXCIsIGUpO1xyXG5cdFx0fVxyXG5cdH0sXHJcblx0XHJcbn0pO1xyXG5cclxuLypcclxuZnVuY3Rpb24gZW5zdXJlUG93ZXJPZlR3b18gKCBpbWFnZSApIHtcclxuXHRpZiAoICEgVEhSRUUuTWF0aC5pc1Bvd2VyT2ZUd28oIGltYWdlLndpZHRoICkgfHwgISBUSFJFRS5NYXRoLmlzUG93ZXJPZlR3byggaW1hZ2UuaGVpZ2h0ICkgKSB7XHJcblx0XHR2YXIgY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCggXCJjYW52YXNcIiApO1xyXG5cdFx0Y2FudmFzLndpZHRoID0gbmV4dEhpZ2hlc3RQb3dlck9mVHdvXyggaW1hZ2Uud2lkdGggKTtcclxuXHRcdGNhbnZhcy5oZWlnaHQgPSBuZXh0SGlnaGVzdFBvd2VyT2ZUd29fKCBpbWFnZS5oZWlnaHQgKTtcclxuXHRcdFxyXG5cdFx0dmFyIGN0eCA9IGNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIik7XHJcblx0XHRjdHguZHJhd0ltYWdlKCBpbWFnZSwgMCwgMCwgaW1hZ2Uud2lkdGgsIGltYWdlLmhlaWdodCwgMCwgMCwgY2FudmFzLndpZHRoLCBjYW52YXMuaGVpZ2h0ICk7XHJcblx0XHRyZXR1cm4gY2FudmFzO1xyXG5cdH1cclxuXHRcclxuXHRyZXR1cm4gaW1hZ2U7XHJcbn1cclxuKi9cclxuZnVuY3Rpb24gbmV4dEhpZ2hlc3RQb3dlck9mVHdvXyggeCApIHtcclxuXHQtLXg7XHJcblx0Zm9yICggdmFyIGkgPSAxOyBpIDwgMzI7IGkgPDw9IDEgKSB7XHJcblx0XHR4ID0geCB8IHggPj4gaTtcclxuXHR9XHJcblx0cmV0dXJuIHggKyAxO1xyXG59XHJcblxyXG5cclxuLy8gVGhlIG9yaWdpbmFsIHZlcnNpb24gY2FtZSB3aXRoIHNldmVyYWwgb3B0aW9ucywgd2hpY2ggd2UgY2FuIHNpbXBseSBhc3N1bWUgd2lsbCBiZSB0aGUgZGVmYXVsdHNcclxuLy9cdFx0c2lkZTogQWx3YXlzIGFwcGx5IHRvIFRIUkVFLkZyb250U2lkZVxyXG4vL1x0XHR3cmFwOiBUaGlzIHdpbGwgYWN0dWFsbHkgYmUgc3BlY2lmaWVkIElOIHRoZSBNVEwsIGJlY2F1c2UgaXQgaGFzIHRoYXQgc3VwcG9ydFxyXG4vL1x0XHRub3JtYWxpemVSR0I6IGZhbHNlIC0gYXNzdW1lZFxyXG4vL1x0XHRpZ25vcmVaZXJvUkdCOiBmYWxzZSBcclxuLy9cdFx0aW52ZXJ0VHJhbnNwYXJlbmN5OiBmYWxzZSAtIGQgPSAxIGlzIG9wYXF1ZVxyXG5mdW5jdGlvbiBNYXRlcmlhbENyZWF0b3IobG9hZFRleHR1cmUsIGdjKSB7XHJcblx0dGhpcy5sb2FkVGV4dHVyZSA9IGxvYWRUZXh0dXJlO1xyXG5cdHRoaXMuZ2MgPSBnYztcclxufVxyXG5NYXRlcmlhbENyZWF0b3IucHJvdG90eXBlID0ge1xyXG5cdHNldE1hdGVyaWFscyA6IGZ1bmN0aW9uKG1hdEluZm8pIHtcclxuXHRcdHRoaXMubWF0ZXJpYWxzSW5mbyA9IG1hdEluZm87XHJcblx0XHR0aGlzLm1hdGVyaWFscyA9IHt9O1xyXG5cdFx0dGhpcy5tYXRlcmlhbHNBcnJheSA9IFtdO1xyXG5cdFx0dGhpcy5uYW1lTG9va3VwID0ge307XHJcblx0fSxcclxuXHRcclxuXHRwcmVsb2FkIDogZnVuY3Rpb24oKSB7XHJcblx0XHR0cnkge1xyXG5cdFx0Zm9yICh2YXIgbW4gaW4gdGhpcy5tYXRlcmlhbHNJbmZvKSB7XHJcblx0XHRcdHRoaXMuY3JlYXRlKG1uKTtcclxuXHRcdH1cclxuXHRcdH0gY2F0Y2ggKGUpIHtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihlKTtcclxuXHRcdH1cclxuXHR9LFxyXG5cdFxyXG5cdGdldEluZGV4IDogZnVuY3Rpb24obWF0TmFtZSkge1xyXG5cdFx0cmV0dXJuIHRoaXMubmFtZUxvb2t1cFttYXROYW1lXTtcclxuXHR9LFxyXG5cdFxyXG5cdGdldEFzQXJyYXkgOiBmdW5jdGlvbigpIHtcclxuXHRcdHZhciBpbmRleCA9IDA7XHJcblx0XHRmb3IgKHZhciBtbiBpbiB0aGlzLm1hdGVyaWFsc0luZm8pIHtcclxuXHRcdFx0dGhpcy5tYXRlcmlhbHNBcnJheVtpbmRleF0gPSB0aGlzLmNyZWF0ZShtbik7XHJcblx0XHRcdHRoaXMubmFtZUxvb2t1cFttbl0gPSBpbmRleDtcclxuXHRcdFx0aW5kZXgrKztcclxuXHRcdH1cclxuXHRcdHJldHVybiB0aGlzLm1hdGVyaWFsc0FycmF5O1xyXG5cdH0sXHJcblx0XHJcblx0Y3JlYXRlIDogZnVuY3Rpb24gKG1hdE5hbWUpIHtcclxuXHRcdGlmICh0aGlzLm1hdGVyaWFsc1ttYXROYW1lXSA9PT0gdW5kZWZpbmVkKSB7XHJcblx0XHRcdGNvbnNvbGUubG9nKFwiQ3JlYXRpbmcgTWF0ZXJpYWw6IFwiLCBtYXROYW1lKTtcclxuXHRcdFx0dGhpcy5jcmVhdGVNYXRlcmlhbF8obWF0TmFtZSk7XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gdGhpcy5tYXRlcmlhbHNbbWF0TmFtZV07XHJcblx0fSxcclxuXHRcclxuXHRjcmVhdGVNYXRlcmlhbF8gOiBmdW5jdGlvbihtYXROYW1lKSB7XHJcblx0XHR2YXIgc2NvcGUgPSB0aGlzO1xyXG5cdFx0dmFyIG1hdCA9IHRoaXMubWF0ZXJpYWxzSW5mb1ttYXROYW1lXTtcclxuXHRcdHZhciBwYXJhbXMgPSB7XHJcblx0XHRcdG5hbWU6IG1hdE5hbWUsXHJcblx0XHRcdHNpZGU6IFRIUkVFLkZyb250U2lkZSxcclxuXHRcdH07XHJcblx0XHRcclxuXHRcdGZvciAodmFyIHByb3AgaW4gbWF0KSB7XHJcblx0XHRcdHZhciB2YWx1ZSA9IG1hdFtwcm9wXTtcclxuXHRcdFx0c3dpdGNoIChwcm9wLnRvTG93ZXJDYXNlKCkpIHtcclxuXHRcdFx0XHRjYXNlIFwibmFtZVwiOlxyXG5cdFx0XHRcdFx0cGFyYW1zWyduYW1lJ10gPSB2YWx1ZTtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdGNhc2UgXCJrZFwiOiAvLyBEaWZmdXNlIGNvbG9yXHJcblx0XHRcdFx0XHRwYXJhbXNbJ2RpZmZ1c2UnXSA9IG5ldyBUSFJFRS5Db2xvcigpLmZyb21BcnJheSh2YWx1ZSk7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcclxuXHRcdFx0XHRjYXNlIFwia2FcIjogLy8gQW1iaWVudCBjb2xvclxyXG5cdFx0XHRcdFx0cGFyYW1zWydhbWJpZW50J10gPSBuZXcgVEhSRUUuQ29sb3IoKS5mcm9tQXJyYXkodmFsdWUpO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0Y2FzZSBcImtzXCI6IC8vIFNwZWN1bGFyIGNvbG9yXHJcblx0XHRcdFx0XHRwYXJhbXNbJ3NwZWN1bGFyJ10gPSBuZXcgVEhSRUUuQ29sb3IoKS5mcm9tQXJyYXkodmFsdWUpO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0Y2FzZSBcImtlXCI6IC8vIEVtaXNzaW9uIChub24tc3RhbmRhcmQpXHJcblx0XHRcdFx0XHRwYXJhbXNbJ2VtaXNzaXZlJ10gPSBuZXcgVEhSRUUuQ29sb3IodmFsdWUsIHZhbHVlLCB2YWx1ZSk7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcclxuXHRcdFx0XHRjYXNlIFwibWFwX2tkXCI6IC8vIERpZmZ1c2UgdGV4dHVyZSBtYXBcclxuXHRcdFx0XHRcdHZhciBhcmdzID0gX19zcGxpdFRleEFyZyh2YWx1ZSk7XHJcblx0XHRcdFx0XHR2YXIgbWFwID0gX190ZXh0dXJlTWFwKGFyZ3MpO1xyXG5cdFx0XHRcdFx0aWYgKG1hcCkgcGFyYW1zWydtYXAnXSA9IG1hcDtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0XHJcblx0XHRcdFx0Y2FzZSBcIm1hcF9rYVwiOiAvLyBBbWJpZW50IHRleHR1cmUgbWFwXHJcblx0XHRcdFx0XHR2YXIgYXJncyA9IF9fc3BsaXRUZXhBcmcodmFsdWUpO1xyXG5cdFx0XHRcdFx0dmFyIG1hcCA9IF9fdGV4dHVyZU1hcChhcmdzKTtcclxuXHRcdFx0XHRcdGlmIChtYXApIHBhcmFtc1snbGlnaHRNYXAnXSA9IG1hcDtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdGNhc2UgXCJtYXBfa3NcIjogLy8gU3BlY3VsYXIgbWFwXHJcblx0XHRcdFx0XHR2YXIgYXJncyA9IF9fc3BsaXRUZXhBcmcodmFsdWUpO1xyXG5cdFx0XHRcdFx0dmFyIG1hcCA9IF9fdGV4dHVyZU1hcChhcmdzKTtcclxuXHRcdFx0XHRcdGlmIChtYXApIHBhcmFtc1snc3BlY3VsYXJNYXAnXSA9IG1hcDtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdGNhc2UgXCJtYXBfZFwiOiAvLyBBbHBoYSB0ZXh0dXJlIG1hcFxyXG5cdFx0XHRcdFx0dmFyIGFyZ3MgPSBfX3NwbGl0VGV4QXJnKHZhbHVlKTtcclxuXHRcdFx0XHRcdHZhciBtYXAgPSBfX3RleHR1cmVNYXAoYXJncyk7XHJcblx0XHRcdFx0XHRpZiAobWFwKSBwYXJhbXNbJ2FscGhhTWFwJ10gPSBtYXA7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcclxuXHRcdFx0XHRjYXNlIFwiYnVtcFwiOlxyXG5cdFx0XHRcdGNhc2UgXCJtYXBfYnVtcFwiOiAvLyBCdW1wIG1hcFxyXG5cdFx0XHRcdFx0dmFyIGFyZ3MgPSBfX3NwbGl0VGV4QXJnKHZhbHVlKTtcclxuXHRcdFx0XHRcdHZhciBtYXAgPSBfX3RleHR1cmVNYXAoYXJncyk7XHJcblx0XHRcdFx0XHRpZiAobWFwKSBwYXJhbXNbJ2J1bXBNYXAnXSA9IG1hcDtcclxuXHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0aWYgKGFyZ3MuYm0pIHBhcmFtc1snYnVtcFNjYWxlJ10gPSBhcmdzLmJtO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0Y2FzZSBcIm5zXCI6IC8vIFNwZWN1bGFyIGV4cG9uZW50XHJcblx0XHRcdFx0XHRwYXJhbXNbJ3NoaW5pbmVzcyddID0gdmFsdWU7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcclxuXHRcdFx0XHRjYXNlIFwiZFwiOiAvLyBUcmFuc3BhcmVuY3lcclxuXHRcdFx0XHRcdGlmICh2YWx1ZSA8IDEpIHtcclxuXHRcdFx0XHRcdFx0cGFyYW1zWyd0cmFuc3BhcmVudCddID0gdHJ1ZTtcclxuXHRcdFx0XHRcdFx0cGFyYW1zWydvcGFjaXR5J10gPSB2YWx1ZTtcclxuXHRcdFx0XHRcdFx0cGFyYW1zWydhbHBoYVRlc3QnXSA9IDAuMDU7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcdFxyXG5cdFx0XHRcdGRlZmF1bHQ6XHJcblx0XHRcdFx0XHQvLyBjb25zb2xlLmxvZyhcIlVuaGFuZGxlZCBNVEwgZGF0YTpcIiwgcHJvcCwgXCI9XCIsIHZhbHVlKTtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdGlmICggcGFyYW1zWyAnZGlmZnVzZScgXSApIHtcclxuXHRcdFx0aWYgKCAhcGFyYW1zWyAnYW1iaWVudCcgXSkgcGFyYW1zWyAnYW1iaWVudCcgXSA9IHBhcmFtc1sgJ2RpZmZ1c2UnIF07XHJcblx0XHRcdHBhcmFtc1sgJ2NvbG9yJyBdID0gcGFyYW1zWyAnZGlmZnVzZScgXTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0Y29uc29sZS5sb2coXCJNQVROYW1lXCIsIG1hdE5hbWUpO1xyXG5cdFx0dGhpcy5tYXRlcmlhbHNbIG1hdE5hbWUgXSA9IG5ldyBUSFJFRS5NZXNoUGhvbmdNYXRlcmlhbCggcGFyYW1zICk7IC8vcGVyIHBpeGVsIGxpZ2h0aW5nXHJcblx0XHQvLyB0aGlzLm1hdGVyaWFsc1sgbWF0TmFtZSBdID0gbmV3IFRIUkVFLk1lc2hMYW1iZXJ0TWF0ZXJpYWwoIHBhcmFtcyApOyAvL3BlciB2ZXJ0ZXggbGlnaHRpbmdcclxuXHRcdHNjb3BlLmdjLmNvbGxlY3QoIHRoaXMubWF0ZXJpYWxzW21hdE5hbWVdICk7XHJcblx0XHRyZXR1cm4gdGhpcy5tYXRlcmlhbHNbIG1hdE5hbWUgXTtcclxuXHRcdFxyXG5cdFx0XHJcblx0XHRmdW5jdGlvbiBfX3RleHR1cmVNYXAoYXJncykge1xyXG5cdFx0XHRjb25zb2xlLmxvZyhcIlRFWCBNQVBcIiwgYXJncy5tYXApO1xyXG5cdFx0XHRcclxuXHRcdFx0aWYgKGFyZ3MudGltZUFwcGxpY2FibGUpIHtcclxuXHRcdFx0XHR2YXIgbm93ID0gbW9tZW50KCk7XHJcblx0XHRcdFx0aWYgKG1vbWVudC5pc0JlZm9yZShhcmdzLnRpbWVBcHBsaWNhYmxlWzBdKSB8fCBtb21lbnQuaXNBZnRlcihhcmdzLnRpbWVBcHBsaWNhYmxlWzFdKSkge1xyXG5cdFx0XHRcdFx0cmV0dXJuIG51bGw7IC8vSWdub3JlIHRoaXMgbWFwLCBpZiB0aW1lIGlzIG5vdCBhcHBsaWNhYmxlIHRvIGl0XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHQvL1RPRE8gaGFuZGxlIGN1Ym1hcHMhIG5ldyBUSFJFRS5UZXh0dXJlKFtzZXQgb2YgNiBpbWFnZXNdKTtcclxuXHRcdFx0XHJcblx0XHRcdC8vVE9ETyBsb29rIGludG8gaHR0cDovL3RocmVlanMub3JnL2RvY3MvI1JlZmVyZW5jZS9UZXh0dXJlcy9Db21wcmVzc2VkVGV4dHVyZVxyXG5cdFx0XHQvLyBVc2luZyBcIi5kZHNcIiBmb3JtYXQ/XHJcblx0XHRcdFxyXG5cdFx0XHR2YXIgaW1hZ2UgPSBuZXcgSW1hZ2UoKTtcclxuXHRcdFx0aW1hZ2Uuc3JjID0gREVGX1RFWFRVUkU7XHJcblx0XHRcdHZhciB0ZXh0dXJlID0gbmV3IFRIUkVFLlRleHR1cmUoaW1hZ2UpO1xyXG5cdFx0XHR0ZXh0dXJlLm5hbWUgPSBhcmdzLnNyYztcclxuXHRcdFx0c2NvcGUuZ2MuY29sbGVjdCh0ZXh0dXJlKTtcclxuXHRcdFx0XHJcblx0XHRcdGNvbnNvbGUubG9nKFwiQ1JFQVRFIElNRzogXCIsIGFyZ3Muc3JjKTtcclxuXHRcdFx0Y3VycmVudE1hcC5tYXJrTG9hZGluZyhcIk1UTF9cIithcmdzLnNyYywgXCJNQVBURVhcIik7XHJcblx0XHRcdHNjb3BlLmxvYWRUZXh0dXJlKGFyZ3Muc3JjLCBmdW5jdGlvbih1cmwpe1xyXG5cdFx0XHRcdC8vIEV2ZW4gdGhvdWdoIHRoZSBpbWFnZXMgYXJlIGluIG1lbW9yeSwgYXBwYXJlbnRseSB0aGV5IHN0aWxsIGFyZW4ndCBcImxvYWRlZFwiXHJcblx0XHRcdFx0Ly8gYXQgdGhlIHBvaW50IHdoZW4gdGhleSBhcmUgYXNzaWduZWQgdG8gdGhlIHNyYyBhdHRyaWJ1dGUuXHJcblx0XHRcdFx0Y29uc29sZS5sb2coXCJGSU5JU0ggQ1JFQVRFIElNRzogXCIsIGFyZ3Muc3JjKTtcclxuXHRcdFx0XHRpbWFnZS5vbihcImxvYWRcIiwgZnVuY3Rpb24oKXtcclxuXHRcdFx0XHRcdHRleHR1cmUubmVlZHNVcGRhdGUgPSB0cnVlO1xyXG5cdFx0XHRcdFx0Y3VycmVudE1hcC5tYXJrTG9hZEZpbmlzaGVkKFwiTVRMX1wiK2FyZ3Muc3JjLCBcIk1BUFRFWFwiKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0XHRpbWFnZS5zcmMgPSB1cmw7XHJcblx0XHRcdFx0Ly8gaW1hZ2UgPSBlbnN1cmVQb3dlck9mVHdvXyggaW1hZ2UgKTtcclxuXHRcdFx0XHRcclxuXHRcdFx0XHR0ZXh0dXJlLmltYWdlID0gaW1hZ2U7XHJcblx0XHRcdFx0dGV4dHVyZS5uZWVkc1VwZGF0ZSA9IHRydWU7XHJcblx0XHRcdFx0XHJcblx0XHRcdH0pO1xyXG5cdFx0XHRcclxuXHRcdFx0aWYgKCFhcmdzLmNsYW1wKSB7IC8vdW5kZWZpbmVkIG9yIGZhbHNlXHJcblx0XHRcdFx0dGV4dHVyZS53cmFwUyA9IFRIUkVFLlJlcGVhdFdyYXBwaW5nO1xyXG5cdFx0XHRcdHRleHR1cmUud3JhcFQgPSBUSFJFRS5SZXBlYXRXcmFwcGluZztcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHR0ZXh0dXJlLndyYXBTID0gVEhSRUUuQ2xhbXBUb0VkZ2VXcmFwcGluZztcclxuXHRcdFx0XHR0ZXh0dXJlLndyYXBUID0gVEhSRUUuQ2xhbXBUb0VkZ2VXcmFwcGluZztcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0dGV4dHVyZS5tYWdGaWx0ZXIgPSBUSFJFRS5OZWFyZXN0RmlsdGVyO1xyXG5cdFx0XHR0ZXh0dXJlLm1pbkZpbHRlciA9IFRIUkVFLk5lYXJlc3RNaXBNYXBMaW5lYXJGaWx0ZXI7XHJcblx0XHRcdFxyXG5cdFx0XHRpZiAoYXJnc1snb191J10gfHwgYXJnc1snb192J10pIHtcclxuXHRcdFx0XHR0ZXh0dXJlLm9mZnNldCA9IG5ldyBWZWN0b3IyKGFyZ3NbJ29fdSddIHx8IDAsIGFyZ3NbJ29fdiddIHx8IDApO1xyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHQvLyB0ZXh0dXJlLmFuaXNvdHJvcHkgPSAxNjtcclxuXHRcdFx0XHJcblx0XHRcdHJldHVybiB0ZXh0dXJlO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHRmdW5jdGlvbiBfX3NwbGl0VGV4QXJnKGFyZykge1xyXG5cdFx0XHR2YXIgY29tcHMgPSBhcmcuc3BsaXQoXCIgXCIpO1xyXG5cdFx0XHR2YXIgdGV4RGVmID0ge307XHJcblx0XHRcdC8vIGh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvV2F2ZWZyb250Xy5vYmpfZmlsZSNUZXh0dXJlX29wdGlvbnNcclxuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBjb21wcy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRcdHN3aXRjaCAoY29tcHNbaV0pIHtcclxuXHRcdFx0XHRcdGNhc2UgXCItYmxlbmR1XCI6IFxyXG5cdFx0XHRcdFx0XHR0ZXhEZWZbXCJibGVuZHVcIl0gPSAoY29tcHNbaSsxXSAhPSBcIm9mZlwiKTtcclxuXHRcdFx0XHRcdFx0aSArPSAxOyBicmVhazsgLy9jb25zdW1lIHRoZSBhcmd1bWVudFxyXG5cdFx0XHRcdFx0Y2FzZSBcIi1ibGVuZHZcIjpcclxuXHRcdFx0XHRcdFx0dGV4RGVmW1wiYmxlbmR2XCJdID0gKGNvbXBzW2krMV0gIT0gXCJvZmZcIik7XHJcblx0XHRcdFx0XHRcdGkgKz0gMTsgYnJlYWs7XHJcblx0XHRcdFx0XHRjYXNlIFwiLWJvb3N0XCI6XHJcblx0XHRcdFx0XHRcdHRleERlZltcImJvb3N0XCJdID0gcGFyc2VGbG9hdChjb21wc1tpKzFdKTtcclxuXHRcdFx0XHRcdFx0aSArPSAxOyBicmVhaztcclxuXHRcdFx0XHRcdGNhc2UgXCItbW1cIjpcclxuXHRcdFx0XHRcdFx0dGV4RGVmW1wibW1fYmFzZVwiXSA9IHBhcnNlRmxvYXQoY29tcHNbaSsxXSk7XHJcblx0XHRcdFx0XHRcdHRleERlZltcIm1tX2dhaW5cIl0gPSBwYXJzZUZsb2F0KGNvbXBzW2krMl0pO1xyXG5cdFx0XHRcdFx0XHRpICs9IDI7IGJyZWFrO1xyXG5cdFx0XHRcdFx0Y2FzZSBcIi1vXCI6XHJcblx0XHRcdFx0XHRcdHRleERlZltcIm9fdVwiXSA9IHBhcnNlRmxvYXQoY29tcHNbaSsxXSk7XHJcblx0XHRcdFx0XHRcdHRleERlZltcIm9fdlwiXSA9IHBhcnNlRmxvYXQoY29tcHNbaSsyXSk7IC8vdGVjaG5pY2FsbHkgb3B0aW9uYWxcclxuXHRcdFx0XHRcdFx0dGV4RGVmW1wib193XCJdID0gcGFyc2VGbG9hdChjb21wc1tpKzNdKTsgLy90ZWNobmljYWxseSBvcHRpb25hbFxyXG5cdFx0XHRcdFx0XHRpICs9IDM7IGJyZWFrO1xyXG5cdFx0XHRcdFx0Y2FzZSBcIi1zXCI6XHJcblx0XHRcdFx0XHRcdHRleERlZltcInNfdVwiXSA9IHBhcnNlRmxvYXQoY29tcHNbaSsxXSk7XHJcblx0XHRcdFx0XHRcdHRleERlZltcInNfdlwiXSA9IHBhcnNlRmxvYXQoY29tcHNbaSsyXSk7IC8vdGVjaG5pY2FsbHkgb3B0aW9uYWxcclxuXHRcdFx0XHRcdFx0dGV4RGVmW1wic193XCJdID0gcGFyc2VGbG9hdChjb21wc1tpKzNdKTsgLy90ZWNobmljYWxseSBvcHRpb25hbFxyXG5cdFx0XHRcdFx0XHRpICs9IDM7IGJyZWFrO1xyXG5cdFx0XHRcdFx0Y2FzZSBcIi10XCI6XHJcblx0XHRcdFx0XHRcdHRleERlZltcInRfdVwiXSA9IHBhcnNlRmxvYXQoY29tcHNbaSsxXSk7XHJcblx0XHRcdFx0XHRcdHRleERlZltcInRfdlwiXSA9IHBhcnNlRmxvYXQoY29tcHNbaSsyXSk7IC8vdGVjaG5pY2FsbHkgb3B0aW9uYWxcclxuXHRcdFx0XHRcdFx0dGV4RGVmW1widF93XCJdID0gcGFyc2VGbG9hdChjb21wc1tpKzNdKTsgLy90ZWNobmljYWxseSBvcHRpb25hbFxyXG5cdFx0XHRcdFx0XHRpICs9IDM7IGJyZWFrO1xyXG5cdFx0XHRcdFx0Y2FzZSBcIi10ZXhyZXNcIjpcclxuXHRcdFx0XHRcdFx0dGV4RGVmW1widGV4cmVzXCJdID0gY29tcHNbaSsxXTtcclxuXHRcdFx0XHRcdFx0aSArPSAxOyBicmVhaztcclxuXHRcdFx0XHRcdGNhc2UgXCItY2xhbXBcIjpcclxuXHRcdFx0XHRcdFx0dGV4RGVmW1wiY2xhbXBcIl0gPSAoY29tcHNbaSsxXSA9PSBcIm9uXCIpOyAvL2RlZmF1bHQgb2ZmXHJcblx0XHRcdFx0XHRcdGkgKz0gMTsgYnJlYWs7XHJcblx0XHRcdFx0XHRjYXNlIFwiLWJtXCI6XHJcblx0XHRcdFx0XHRcdHRleERlZltcImJtXCJdID0gcGFyc2VGbG9hdChjb21wc1tpKzFdKTtcclxuXHRcdFx0XHRcdFx0aSArPSAxOyBicmVhaztcclxuXHRcdFx0XHRcdGNhc2UgXCItaW1mY2hhblwiOlxyXG5cdFx0XHRcdFx0XHR0ZXhEZWZbXCJpbWZjaGFuXCJdID0gY29tcHNbaSsxXTtcclxuXHRcdFx0XHRcdFx0aSArPSAxOyBicmVhaztcclxuXHRcdFx0XHRcdGNhc2UgXCItdHlwZVwiOlxyXG5cdFx0XHRcdFx0XHR0ZXhEZWZbXCJ0eXBlXCJdID0gY29tcHNbaSsxXTtcclxuXHRcdFx0XHRcdFx0aSArPSAxOyBicmVhaztcclxuXHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0Ly8gQ3VzdG9tIHByb3BlcnRpZXNcclxuXHRcdFx0XHRcdGNhc2UgXCItdGltZWFwcFwiOiAgLy9UaW1lIGFwcGxpY2FibGVcclxuXHRcdFx0XHRcdFx0Ly8gLXRpbWVhcHAgW3N0YXJ0VGltZV0gW2VuZFRpbWVdXHJcblx0XHRcdFx0XHRcdC8vICAgd2hlcmUgdGhlIHRpbWVzIGFyZSBmb3JtYXR0ZWQgYXMgZm9sbG93czogbTAwW2QwMFtoMDBbbTAwXV1dXHJcblx0XHRcdFx0XHRcdC8vICAgZWFjaCBzZWN0aW9uIGluIHNlcXVlbmNlIGlzIG9wdGlvbmFsXHJcblx0XHRcdFx0XHRcdC8vIHN0YXJ0VGltZSA9IHN0YXJ0IG9mIHRoZSB0aW1lLCBpbmNsdXNpdmUsIHdoZW4gdGhlIGdpdmVuIHRleHR1cmUgaXMgYXBwbGljYWJsZVxyXG5cdFx0XHRcdFx0XHQvLyBlbmRUaW1lID0gZW5kIG9mIHRoZSB0aW1lLCBpbmNsdXNpdmUsIHdoZW4gdGhlIGdpdmVuIHRleHR1cmUgaXMgYXBwbGljYWJsZVxyXG5cdFx0XHRcdFx0XHR2YXIgc3RhcnRUaW1lID0gY29tcHNbaSsxXTtcclxuXHRcdFx0XHRcdFx0dmFyIGVuZFRpbWUgPSBjb21wc1tpKzJdO1xyXG5cdFx0XHRcdFx0XHRpICs9IDI7XHJcblx0XHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0XHQvL3RleERlZltcInRpbWVhcHBcIl0gPSBbY29tcHNbaSsxXSwgY29tcHNbaSsyXV07XHJcblx0XHRcdFx0XHRcdHZhciBzdCwgZW5kO1xyXG5cdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0dmFyIHJlcyA9IC9tKFxcZFxcZCkoPzpkKFxcZFxcZCkoPzpoKFxcZFxcZCkoPzptKFxcZFxcZCkpPyk/KT8vaS5leGVjKHN0YXJ0VGltZSk7XHJcblx0XHRcdFx0XHRcdFx0aWYgKCFyZXMpIHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgdGltZXN0YW1wIGZvciAtdGltZWFwcCBzdGFydFRpbWVcIik7XHJcblx0XHRcdFx0XHRcdFx0c3QgPSBtb21lbnQoKS5tb250aChyZXNbMV0pLnN0YXJ0T2YoXCJtb250aFwiKTtcclxuXHRcdFx0XHRcdFx0XHRpZiAocmVzWzJdKSB7IHN0LmRhdGUocmVzWzJdKTsgfVxyXG5cdFx0XHRcdFx0XHRcdGlmIChyZXNbM10pIHsgc3QuaG91cihyZXNbM10pOyB9XHJcblx0XHRcdFx0XHRcdFx0aWYgKHJlc1s0XSkgeyBzdC5taW51dGUocmVzWzRdKTsgfVxyXG5cdFx0XHRcdFx0XHR9e1xyXG5cdFx0XHRcdFx0XHRcdHZhciByZXMgPSAvbShcXGRcXGQpKD86ZChcXGRcXGQpKD86aChcXGRcXGQpKD86bShcXGRcXGQpKT8pPyk/L2kuZXhlYyhlbmRUaW1lKTtcclxuXHRcdFx0XHRcdFx0XHRpZiAoIXJlcykgdGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCB0aW1lc3RhbXAgZm9yIC10aW1lYXBwIGVuZFRpbWVcIik7XHJcblx0XHRcdFx0XHRcdFx0ZW5kID0gbW9tZW50KCkubW9udGgocmVzWzFdKS5lbmRPZihcIm1vbnRoXCIpO1xyXG5cdFx0XHRcdFx0XHRcdGlmIChyZXNbMl0pIHsgZW5kLmRhdGUocmVzWzJdKS5lbmRPZihcImRheVwiKTsgfVxyXG5cdFx0XHRcdFx0XHRcdGlmIChyZXNbM10pIHsgZW5kLmhvdXIocmVzWzNdKS5lbmRPZihcImhvdXJcIik7IH1cclxuXHRcdFx0XHRcdFx0XHRpZiAocmVzWzRdKSB7IGVuZC5taW51dGUocmVzWzRdKS5lbmRPZihcIm1pbnV0ZVwiKTsgfVxyXG5cdFx0XHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0XHRcdGlmIChlbmQuaXNCZWZvcmUoc3QpKSBlbmQuYWRkKDEsIFwieWVhclwiKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHR0ZXhEZWZbXCJ0aW1lQXBwbGljYWJsZVwiXSA9IFtzdCwgZW5kXTtcclxuXHRcdFx0XHRcdFx0XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0XHJcblx0XHRcdFx0XHRkZWZhdWx0OlxyXG5cdFx0XHRcdFx0XHQvL0Fzc3VtZSB0aGUgc291cmNlIGlzIHRoZSBsYXN0IHRoaW5nIHdlJ2xsIGZpbmRcclxuXHRcdFx0XHRcdFx0dGV4RGVmLnNyYyA9IGNvbXBzLnNsaWNlKGkpLmpvaW4oXCIgXCIpO1xyXG5cdFx0XHRcdFx0XHR0ZXhEZWYuYXJncyA9IGNvbXBzLnNsaWNlKDAsIGkpLmpvaW4oXCIgXCIpO1xyXG5cdFx0XHRcdFx0XHRyZXR1cm4gdGV4RGVmO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XHRyZXR1cm4gdGV4RGVmO1xyXG5cdFx0fVxyXG5cdH0sXHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IE10bExvYWRlcjtcclxuIiwiLy8gb2JqLWxvYWRlci5qc1xyXG4vLyBBIFRIUkVFLmpzIHdhdmVmcm9udCBvYmplY3QgbG9hZGVyXHJcbi8vIENvcGllZCBtb3N0bHkgd2hvbGVzYWxlIGZyb20gdGhlIHRocmVlLmpzIGV4YW1wbGVzIGZvbGRlci5cclxuLy8gT3JpZ2luYWwgYXV0aG9yczogbXJkb29iLCBhbmdlbHh1YW5jaGFuZ1xyXG5cclxudmFyIG1vbWVudCA9IHJlcXVpcmUoXCJtb21lbnRcIik7XHJcbnZhciBpbmhlcml0cyA9IHJlcXVpcmUoXCJpbmhlcml0c1wiKTtcclxudmFyIGV4dGVuZCA9IHJlcXVpcmUoXCJleHRlbmRcIik7XHJcbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKFwiZXZlbnRzXCIpLkV2ZW50RW1pdHRlcjtcclxuXHJcbnZhciBNdGxMb2FkZXIgPSByZXF1aXJlKFwiLi9tdGwtbG9hZGVyXCIpO1xyXG5cclxuZnVuY3Rpb24gT2JqTG9hZGVyKG9iamZpbGUsIG10bGZpbGUsIGZpbGVTeXMsIG9wdHMpIHtcclxuXHRFdmVudEVtaXR0ZXIuY2FsbCh0aGlzKTtcclxuXHRleHRlbmQodGhpcywgb3B0cyk7XHJcblx0XHJcblx0dGhpcy5vYmpmaWxlID0gb2JqZmlsZTtcclxuXHR0aGlzLm10bGZpbGUgPSBtdGxmaWxlO1xyXG5cdHRoaXMuZmlsZVN5cyA9IGZpbGVTeXM7XHJcblx0XHJcblx0aWYgKG9wdHMuZ2MpIHtcclxuXHRcdGlmICh0eXBlb2Ygb3B0cy5nYyA9PSBcInN0cmluZ1wiKVxyXG5cdFx0XHR0aGlzLmdjID0gR0MuZ2V0QmluKG9wdHMuZ2MpO1xyXG5cdFx0ZWxzZVxyXG5cdFx0XHR0aGlzLmdjID0gb3B0cy5nYztcclxuXHR9IGVsc2Uge1xyXG5cdFx0dGhpcy5nYyA9IEdDLmdldEJpbigpO1xyXG5cdH1cclxuXHRcclxufTtcclxuaW5oZXJpdHMoT2JqTG9hZGVyLCBFdmVudEVtaXR0ZXIpO1xyXG5leHRlbmQoT2JqTG9hZGVyLnByb3RvdHlwZSwge1xyXG5cdG9iamZpbGUgOiBudWxsLFxyXG5cdG10bGZpbGUgOiBudWxsLFxyXG5cdGZpbGVTeXMgOiBudWxsLFxyXG5cdFxyXG5cdGxvYWQ6IGZ1bmN0aW9uKCkge1xyXG5cdFx0aWYgKCEodGhpcy5vYmpmaWxlICYmIHRoaXMubXRsZmlsZSkpIFxyXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJObyBPQkogZmlsZSBvciBNVEwgZmlsZSBnaXZlbiFcIik7XHJcblx0XHRcclxuXHRcdHZhciBzY29wZSA9IHRoaXM7XHJcblx0XHR2YXIgbXRsTG9hZGVyID0gbmV3IE10bExvYWRlcih0aGlzLm10bGZpbGUsIHRoaXMuZmlsZVN5cywge1xyXG5cdFx0XHRcImdjXCI6IHRoaXMuZ2MsXHJcblx0XHR9KTtcclxuXHRcdG10bExvYWRlci5vbihcImxvYWRcIiwgZnVuY3Rpb24obWF0TGliKSB7XHJcblx0XHRcdFxyXG5cdFx0XHRtYXRMaWIucHJlbG9hZCgpO1xyXG5cdFx0XHRcclxuXHRcdFx0dmFyIG9iamVjdCA9IHNjb3BlLnBhcnNlKHNjb3BlLm9iamZpbGUpO1xyXG5cdFx0XHRvYmplY3QudHJhdmVyc2UoZnVuY3Rpb24ob2JqZWN0KXtcclxuXHRcdFx0XHRpZiAob2JqZWN0IGluc3RhbmNlb2YgVEhSRUUuTWVzaCkge1xyXG5cdFx0XHRcdFx0aWYgKG9iamVjdC5tYXRlcmlhbC5uYW1lKSB7XHJcblx0XHRcdFx0XHRcdHZhciBtYXQgPSBtYXRMaWIuY3JlYXRlKG9iamVjdC5tYXRlcmlhbC5uYW1lKTtcclxuXHRcdFx0XHRcdFx0aWYgKG1hdCkgb2JqZWN0Lm1hdGVyaWFsID0gbWF0O1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0b2JqZWN0LnJlY2VpdmVTaGFkb3cgPSB0cnVlO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblx0XHRcdG9iamVjdC5uYW1lID0gXCJMb2FkZWQgTWVzaFwiO1xyXG5cdFx0XHRcclxuXHRcdFx0c2NvcGUuZW1pdChcImxvYWRcIiwgb2JqZWN0KTtcclxuXHRcdH0pO1xyXG5cdFx0bXRsTG9hZGVyLm9uKFwiZXJyb3JcIiwgZnVuY3Rpb24oZSl7XHJcblx0XHRcdHNjb3BlLmVtaXQoXCJlcnJvclwiLCBlKTtcclxuXHRcdH0pO1xyXG5cdFx0bXRsTG9hZGVyLmxvYWQoKTtcclxuXHR9LFxyXG59KTtcclxuXHJcbi8vVGhlc2Ugd291bGQgYmUgQ09OU1RTIGluIG5vZGUuanMsIGJ1dCB3ZSdyZSBpbiB0aGUgYnJvd3NlciBub3c6XHJcblxyXG4vLyB2IGZsb2F0IGZsb2F0IGZsb2F0XHJcbnZhciBWRVJURVhfUEFUVEVSTiA9IC92KCArW1xcZHxcXC58XFwrfFxcLXxlXSspKCArW1xcZHxcXC58XFwrfFxcLXxlXSspKCArW1xcZHxcXC58XFwrfFxcLXxlXSspLztcclxuXHJcbi8vIHZuIGZsb2F0IGZsb2F0IGZsb2F0XHJcbnZhciBOT1JNQUxfUEFUVEVSTiA9IC92biggK1tcXGR8XFwufFxcK3xcXC18ZV0rKSggK1tcXGR8XFwufFxcK3xcXC18ZV0rKSggK1tcXGR8XFwufFxcK3xcXC18ZV0rKS87XHJcblxyXG4vLyB2dCBmbG9hdCBmbG9hdFxyXG52YXIgVVZfUEFUVEVSTiA9IC92dCggK1tcXGR8XFwufFxcK3xcXC18ZV0rKSggK1tcXGR8XFwufFxcK3xcXC18ZV0rKS87XHJcblxyXG4vLyBmIHZlcnRleCB2ZXJ0ZXggdmVydGV4IC4uLlxyXG52YXIgRkFDRV9QQVRURVJOMSA9IC9mKCArXFxkKykoICtcXGQrKSggK1xcZCspKCArXFxkKyk/LztcclxuXHJcbi8vIGYgdmVydGV4L3V2IHZlcnRleC91diB2ZXJ0ZXgvdXYgLi4uXHJcbnZhciBGQUNFX1BBVFRFUk4yID0gL2YoICsoXFxkKylcXC8oXFxkKykpKCArKFxcZCspXFwvKFxcZCspKSggKyhcXGQrKVxcLyhcXGQrKSkoICsoXFxkKylcXC8oXFxkKykpPy87XHJcblxyXG4vLyBmIHZlcnRleC91di9ub3JtYWwgdmVydGV4L3V2L25vcm1hbCB2ZXJ0ZXgvdXYvbm9ybWFsIC4uLlxyXG52YXIgRkFDRV9QQVRURVJOMyA9IC9mKCArKFxcZCspXFwvKFxcZCspXFwvKFxcZCspKSggKyhcXGQrKVxcLyhcXGQrKVxcLyhcXGQrKSkoICsoXFxkKylcXC8oXFxkKylcXC8oXFxkKykpKCArKFxcZCspXFwvKFxcZCspXFwvKFxcZCspKT8vO1xyXG5cclxuLy8gZiB2ZXJ0ZXgvL25vcm1hbCB2ZXJ0ZXgvL25vcm1hbCB2ZXJ0ZXgvL25vcm1hbCAuLi4gXHJcbnZhciBGQUNFX1BBVFRFUk40ID0gL2YoICsoXFxkKylcXC9cXC8oXFxkKykpKCArKFxcZCspXFwvXFwvKFxcZCspKSggKyhcXGQrKVxcL1xcLyhcXGQrKSkoICsoXFxkKylcXC9cXC8oXFxkKykpPy9cclxuXHJcblxyXG5PYmpMb2FkZXIucHJvdG90eXBlLnBhcnNlID0gZnVuY3Rpb24oZGF0YSkge1xyXG5cdHZhciBzZWxmID0gdGhpcztcclxuXHRcclxuXHR2YXIgZmFjZV9vZmZzZXQgPSAwO1xyXG5cdFxyXG5cdHZhciBncm91cCA9IG5ldyBUSFJFRS5PYmplY3QzRCgpO1xyXG5cdHZhciBvYmplY3QgPSBncm91cDtcclxuXHRcclxuXHR2YXIgZ2VvbWV0cnkgPSBuZXcgVEhSRUUuR2VvbWV0cnkoKTtcclxuXHR2YXIgbWF0ZXJpYWwgPSBuZXcgVEhSRUUuTWVzaExhbWJlcnRNYXRlcmlhbCgpO1xyXG5cdHZhciBtZXNoID0gbmV3IFRIUkVFLk1lc2goIGdlb21ldHJ5LCBtYXRlcmlhbCApO1xyXG5cdFxyXG5cdHZhciB2ZXJ0aWNlcyA9IFtdO1xyXG5cdHZhciB2ZXJ0aWNlc0NvdW50ID0gMDtcclxuXHR2YXIgbm9ybWFscyA9IFtdO1xyXG5cdHZhciB1dnMgPSBbXTtcclxuXHRcclxuXHQvL0JlZ2luIHBhcnNpbmcgaGVyZVxyXG5cclxuXHR2YXIgbGluZXMgPSBkYXRhLnNwbGl0KCBcIlxcblwiICk7XHJcblx0Zm9yICggdmFyIGkgPSAwOyBpIDwgbGluZXMubGVuZ3RoOyBpICsrICkge1xyXG5cdFx0dmFyIGxpbmUgPSBsaW5lc1sgaSBdO1xyXG5cdFx0bGluZSA9IGxpbmUudHJpbSgpO1xyXG5cdFx0XHJcblx0XHR2YXIgcmVzdWx0O1xyXG5cdFx0XHJcblx0XHRpZiAobGluZS5sZW5ndGggPT0gMCB8fCBsaW5lLmNoYXJBdCgwKSA9PSBcIiNcIikgXHJcblx0XHRcdGNvbnRpbnVlO1xyXG5cdFx0ZWxzZSBcclxuXHRcdGlmICgocmVzdWx0ID0gVkVSVEVYX1BBVFRFUk4uZXhlYyhsaW5lKSkgIT09IG51bGwpIHtcclxuXHRcdFx0Ly8gW1widiAxLjAgMi4wIDMuMFwiLCBcIjEuMFwiLCBcIjIuMFwiLCBcIjMuMFwiXVxyXG5cdFx0XHR2ZXJ0aWNlcy5wdXNoKHZlY3RvcihcclxuXHRcdFx0XHRwYXJzZUZsb2F0KHJlc3VsdFsgMSBdKSxcclxuXHRcdFx0XHRwYXJzZUZsb2F0KHJlc3VsdFsgMiBdKSxcclxuXHRcdFx0XHRwYXJzZUZsb2F0KHJlc3VsdFsgMyBdKVxyXG5cdFx0XHQpKTtcclxuXHRcdH0gZWxzZVxyXG5cdFx0aWYgKChyZXN1bHQgPSBOT1JNQUxfUEFUVEVSTi5leGVjKGxpbmUpKSAhPT0gbnVsbCApIHtcclxuXHRcdFx0Ly8gW1widm4gMS4wIDIuMCAzLjBcIiwgXCIxLjBcIiwgXCIyLjBcIiwgXCIzLjBcIl1cclxuXHRcdFx0bm9ybWFscy5wdXNoKHZlY3RvcihcclxuXHRcdFx0XHRwYXJzZUZsb2F0KHJlc3VsdFsgMSBdKSxcclxuXHRcdFx0XHRwYXJzZUZsb2F0KHJlc3VsdFsgMiBdKSxcclxuXHRcdFx0XHRwYXJzZUZsb2F0KHJlc3VsdFsgMyBdKVxyXG5cdFx0XHQpKTtcclxuXHRcdH0gZWxzZVxyXG5cdFx0aWYgKChyZXN1bHQgPSBVVl9QQVRURVJOLmV4ZWMobGluZSkpICE9PSBudWxsICkge1xyXG5cdFx0XHQvLyBbXCJ2dCAwLjEgMC4yXCIsIFwiMC4xXCIsIFwiMC4yXCJdXHJcblx0XHRcdHV2cy5wdXNoKHV2KFxyXG5cdFx0XHRcdHBhcnNlRmxvYXQocmVzdWx0WyAxIF0pLFxyXG5cdFx0XHRcdHBhcnNlRmxvYXQocmVzdWx0WyAyIF0pXHJcblx0XHRcdCkpO1xyXG5cdFx0fSBlbHNlXHJcblx0XHRpZiAoKHJlc3VsdCA9IEZBQ0VfUEFUVEVSTjEuZXhlYyhsaW5lKSkgIT09IG51bGwgKSB7XHJcblx0XHRcdC8vIFtcImYgMSAyIDNcIiwgXCIxXCIsIFwiMlwiLCBcIjNcIiwgdW5kZWZpbmVkXVxyXG5cdFx0XHRoYW5kbGVfZmFjZV9saW5lKFsgcmVzdWx0WyAxIF0sIHJlc3VsdFsgMiBdLCByZXN1bHRbIDMgXSwgcmVzdWx0WyA0IF0gXSk7XHJcblx0XHR9IGVsc2UgXHJcblx0XHRpZiAoKHJlc3VsdCA9IEZBQ0VfUEFUVEVSTjIuZXhlYyhsaW5lKSkgIT09IG51bGwgKSB7XHJcblx0XHRcdC8vIFtcImYgMS8xIDIvMiAzLzNcIiwgXCIgMS8xXCIsIFwiMVwiLCBcIjFcIiwgXCIgMi8yXCIsIFwiMlwiLCBcIjJcIiwgXCIgMy8zXCIsIFwiM1wiLCBcIjNcIiwgdW5kZWZpbmVkLCB1bmRlZmluZWQsIHVuZGVmaW5lZF1cclxuXHRcdFx0aGFuZGxlX2ZhY2VfbGluZShcclxuXHRcdFx0XHRbIHJlc3VsdFsgMiBdLCByZXN1bHRbIDUgXSwgcmVzdWx0WyA4IF0sIHJlc3VsdFsgMTEgXSBdLCAvL2ZhY2VzXHJcblx0XHRcdFx0WyByZXN1bHRbIDMgXSwgcmVzdWx0WyA2IF0sIHJlc3VsdFsgOSBdLCByZXN1bHRbIDEyIF0gXSAvL3V2XHJcblx0XHRcdCk7XHJcblx0XHR9IGVsc2VcclxuXHRcdGlmICgocmVzdWx0ID0gRkFDRV9QQVRURVJOMy5leGVjKGxpbmUpKSAhPT0gbnVsbCApIHtcclxuXHRcdFx0Ly8gW1wiZiAxLzEvMSAyLzIvMiAzLzMvM1wiLCBcIiAxLzEvMVwiLCBcIjFcIiwgXCIxXCIsIFwiMVwiLCBcIiAyLzIvMlwiLCBcIjJcIiwgXCIyXCIsIFwiMlwiLCBcIiAzLzMvM1wiLCBcIjNcIiwgXCIzXCIsIFwiM1wiLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCB1bmRlZmluZWRdXHJcblx0XHRcdGhhbmRsZV9mYWNlX2xpbmUoXHJcblx0XHRcdFx0WyByZXN1bHRbIDIgXSwgcmVzdWx0WyA2IF0sIHJlc3VsdFsgMTAgXSwgcmVzdWx0WyAxNCBdIF0sIC8vZmFjZXNcclxuXHRcdFx0XHRbIHJlc3VsdFsgMyBdLCByZXN1bHRbIDcgXSwgcmVzdWx0WyAxMSBdLCByZXN1bHRbIDE1IF0gXSwgLy91dlxyXG5cdFx0XHRcdFsgcmVzdWx0WyA0IF0sIHJlc3VsdFsgOCBdLCByZXN1bHRbIDEyIF0sIHJlc3VsdFsgMTYgXSBdIC8vbm9ybWFsXHJcblx0XHRcdCk7XHJcblx0XHR9IGVsc2VcclxuXHRcdGlmICgocmVzdWx0ID0gRkFDRV9QQVRURVJONC5leGVjKGxpbmUpKSAhPT0gbnVsbCApIHtcclxuXHRcdFx0Ly8gW1wiZiAxLy8xIDIvLzIgMy8vM1wiLCBcIiAxLy8xXCIsIFwiMVwiLCBcIjFcIiwgXCIgMi8vMlwiLCBcIjJcIiwgXCIyXCIsIFwiIDMvLzNcIiwgXCIzXCIsIFwiM1wiLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgdW5kZWZpbmVkXVxyXG5cdFx0XHRoYW5kbGVfZmFjZV9saW5lKFxyXG5cdFx0XHRcdFsgcmVzdWx0WyAyIF0sIHJlc3VsdFsgNSBdLCByZXN1bHRbIDggXSwgcmVzdWx0WyAxMSBdIF0sIC8vZmFjZXNcclxuXHRcdFx0XHRbIF0sIC8vdXZcclxuXHRcdFx0XHRbIHJlc3VsdFsgMyBdLCByZXN1bHRbIDYgXSwgcmVzdWx0WyA5IF0sIHJlc3VsdFsgMTIgXSBdIC8vbm9ybWFsXHJcblx0XHRcdCk7XHJcblx0XHR9IGVsc2VcclxuXHRcdGlmICggL15vIC8udGVzdChsaW5lKSkge1xyXG5cdFx0XHQvLyBvYmplY3RcclxuXHRcdFx0bWVzaE4oKTtcclxuXHRcdFx0ZmFjZV9vZmZzZXQgPSBmYWNlX29mZnNldCArIHZlcnRpY2VzLmxlbmd0aDtcclxuXHRcdFx0dmVydGljZXMgPSBbXTtcclxuXHRcdFx0b2JqZWN0ID0gbmV3IFRIUkVFLk9iamVjdDNEKCk7XHJcblx0XHRcdG9iamVjdC5uYW1lID0gbGluZS5zdWJzdHJpbmcoIDIgKS50cmltKCk7XHJcblx0XHRcdGdyb3VwLmFkZCggb2JqZWN0ICk7XHJcblx0XHRcdFxyXG5cdFx0fSBlbHNlXHJcblx0XHRpZiAoIC9eZyAvLnRlc3QobGluZSkpIHtcclxuXHRcdFx0Ly8gZ3JvdXBcclxuXHRcdFx0Ly8gbWVzaE4oIGxpbmUuc3Vic3RyaW5nKCAyICkudHJpbSgpLCB1bmRlZmluZWQgKTtcclxuXHRcdFx0bWVzaC5uYW1lID0gbGluZS5zdWJzdHJpbmcoIDIgKS50cmltKCk7XHJcblx0XHRcdFxyXG5cdFx0fSBlbHNlIFxyXG5cdFx0aWYgKCAvXnVzZW10bCAvLnRlc3QobGluZSkpIHtcclxuXHRcdFx0Ly8gbWF0ZXJpYWxcclxuXHRcdFx0bWVzaE4oIHVuZGVmaW5lZCwgbGluZS5zdWJzdHJpbmcoIDcgKS50cmltKCkgKTtcclxuXHRcdFx0XHJcblx0XHRcdC8vIG1hdGVyaWFsID0gbmV3IFRIUkVFLk1lc2hMYW1iZXJ0TWF0ZXJpYWwoKTtcclxuXHRcdFx0Ly8gbWF0ZXJpYWwubmFtZSA9IGxpbmUuc3Vic3RyaW5nKCA3ICkudHJpbSgpO1xyXG5cdFx0XHRcclxuXHRcdFx0Ly8gbWVzaC5tYXRlcmlhbCA9IG1hdGVyaWFsO1xyXG5cclxuXHRcdH0gZWxzZSBcclxuXHRcdGlmICggL15tdGxsaWIgLy50ZXN0KGxpbmUpKSB7XHJcblx0XHRcdC8vIG10bCBmaWxlXHJcblx0XHRcdC8vIGlmICggbXRsbGliQ2FsbGJhY2sgKSB7XHJcblx0XHRcdC8vIFx0dmFyIG10bGZpbGUgPSBsaW5lLnN1YnN0cmluZyggNyApO1xyXG5cdFx0XHQvLyBcdG10bGZpbGUgPSBtdGxmaWxlLnRyaW0oKTtcclxuXHRcdFx0Ly8gXHRtdGxsaWJDYWxsYmFjayggbXRsZmlsZSApO1xyXG5cdFx0XHQvLyB9XHJcblx0XHRcdFxyXG5cdFx0fSBlbHNlIFxyXG5cdFx0aWYgKCAvXnMgLy50ZXN0KGxpbmUpKSB7XHJcblx0XHRcdC8vIFNtb290aCBzaGFkaW5nXHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRjb25zb2xlLmxvZyggXCJUSFJFRS5PQkpNVExMb2FkZXI6IFVuaGFuZGxlZCBsaW5lIFwiICsgbGluZSApO1xyXG5cdFx0fVxyXG5cdH1cclxuXHRcclxuXHRtZXNoTih1bmRlZmluZWQsIHVuZGVmaW5lZCk7IC8vQWRkIGxhc3Qgb2JqZWN0XHJcblx0cmV0dXJuIGdyb3VwO1xyXG5cclxuXHJcblx0ZnVuY3Rpb24gbWVzaE4oIG1lc2hOYW1lLCBtYXRlcmlhbE5hbWUgKSB7XHJcblx0XHRpZiAoIHZlcnRpY2VzLmxlbmd0aCA+IDAgJiYgZ2VvbWV0cnkuZmFjZXMubGVuZ3RoID4gMCApIHtcclxuXHRcdFx0Z2VvbWV0cnkudmVydGljZXMgPSB2ZXJ0aWNlcztcclxuXHRcdFx0XHJcblx0XHRcdGdlb21ldHJ5Lm1lcmdlVmVydGljZXMoKTtcclxuXHRcdFx0Z2VvbWV0cnkuY29tcHV0ZUZhY2VOb3JtYWxzKCk7XHJcblx0XHRcdGdlb21ldHJ5LmNvbXB1dGVCb3VuZGluZ0JveCgpO1xyXG5cdFx0XHRnZW9tZXRyeS5jb21wdXRlQm91bmRpbmdTcGhlcmUoKTtcclxuXHRcdFx0XHJcblx0XHRcdG9iamVjdC5hZGQoIG1lc2ggKTtcclxuXHRcdFx0XHJcblx0XHRcdHNlbGYuZ2MuY29sbGVjdChnZW9tZXRyeSk7XHJcblx0XHRcdFxyXG5cdFx0XHRnZW9tZXRyeSA9IG5ldyBUSFJFRS5HZW9tZXRyeSgpO1xyXG5cdFx0XHRtZXNoID0gbmV3IFRIUkVFLk1lc2goIGdlb21ldHJ5LCBtYXRlcmlhbCApO1xyXG5cdFx0XHR2ZXJ0aWNlc0NvdW50ID0gMDtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0Ly8gaWYgKCBtZXNoTmFtZSAhPT0gdW5kZWZpbmVkICkgbWVzaC5uYW1lID0gbWVzaE5hbWU7XHJcblx0XHRcclxuXHRcdGlmICggbWF0ZXJpYWxOYW1lICE9PSB1bmRlZmluZWQgKSB7XHJcblx0XHRcdG1hdGVyaWFsID0gbmV3IFRIUkVFLk1lc2hMYW1iZXJ0TWF0ZXJpYWwoKTtcclxuXHRcdFx0bWF0ZXJpYWwubmFtZSA9IG1hdGVyaWFsTmFtZTtcclxuXHRcdFx0XHJcblx0XHRcdG1lc2gubWF0ZXJpYWwgPSBtYXRlcmlhbDtcclxuXHRcdH1cclxuXHR9XHJcblx0XHJcblx0ZnVuY3Rpb24gYWRkX2ZhY2UoIGEsIGIsIGMsIG5vcm1hbHNfaW5kcyApIHtcclxuXHRcdGlmICggbm9ybWFsc19pbmRzID09PSB1bmRlZmluZWQgKSB7XHJcblx0XHRcdGdlb21ldHJ5LmZhY2VzLnB1c2goIGZhY2UzKFxyXG5cdFx0XHRcdHBhcnNlSW50KCBhICkgLSAoZmFjZV9vZmZzZXQgKyAxKSxcclxuXHRcdFx0XHRwYXJzZUludCggYiApIC0gKGZhY2Vfb2Zmc2V0ICsgMSksXHJcblx0XHRcdFx0cGFyc2VJbnQoIGMgKSAtIChmYWNlX29mZnNldCArIDEpXHJcblx0XHRcdCkgKTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdGdlb21ldHJ5LmZhY2VzLnB1c2goIGZhY2UzKFxyXG5cdFx0XHRcdHBhcnNlSW50KCBhICkgLSAoZmFjZV9vZmZzZXQgKyAxKSxcclxuXHRcdFx0XHRwYXJzZUludCggYiApIC0gKGZhY2Vfb2Zmc2V0ICsgMSksXHJcblx0XHRcdFx0cGFyc2VJbnQoIGMgKSAtIChmYWNlX29mZnNldCArIDEpLFxyXG5cdFx0XHRcdFtcclxuXHRcdFx0XHRcdG5vcm1hbHNbIHBhcnNlSW50KCBub3JtYWxzX2luZHNbIDAgXSApIC0gMSBdLmNsb25lKCksXHJcblx0XHRcdFx0XHRub3JtYWxzWyBwYXJzZUludCggbm9ybWFsc19pbmRzWyAxIF0gKSAtIDEgXS5jbG9uZSgpLFxyXG5cdFx0XHRcdFx0bm9ybWFsc1sgcGFyc2VJbnQoIG5vcm1hbHNfaW5kc1sgMiBdICkgLSAxIF0uY2xvbmUoKVxyXG5cdFx0XHRcdF1cclxuXHRcdFx0KSApO1xyXG5cdFx0fVxyXG5cdH1cclxuXHRcclxuXHRmdW5jdGlvbiBhZGRfdXZzKCBhLCBiLCBjICkge1xyXG5cdFx0Z2VvbWV0cnkuZmFjZVZlcnRleFV2c1sgMCBdLnB1c2goIFtcclxuXHRcdFx0dXZzWyBwYXJzZUludCggYSApIC0gMSBdLmNsb25lKCksXHJcblx0XHRcdHV2c1sgcGFyc2VJbnQoIGIgKSAtIDEgXS5jbG9uZSgpLFxyXG5cdFx0XHR1dnNbIHBhcnNlSW50KCBjICkgLSAxIF0uY2xvbmUoKVxyXG5cdFx0XSApO1xyXG5cdH1cclxuXHRcclxuXHRmdW5jdGlvbiBoYW5kbGVfZmFjZV9saW5lKGZhY2VzLCB1dnMsIG5vcm1hbHNfaW5kcykge1xyXG5cdFx0aWYgKCBmYWNlc1sgMyBdID09PSB1bmRlZmluZWQgKSB7XHJcblx0XHRcdGFkZF9mYWNlKCBmYWNlc1sgMCBdLCBmYWNlc1sgMSBdLCBmYWNlc1sgMiBdLCBub3JtYWxzX2luZHMgKTtcclxuXHRcdFx0aWYgKCEodXZzID09PSB1bmRlZmluZWQpICYmIHV2cy5sZW5ndGggPiAwKSB7XHJcblx0XHRcdFx0YWRkX3V2cyggdXZzWyAwIF0sIHV2c1sgMSBdLCB1dnNbIDIgXSApO1xyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0aWYgKCEobm9ybWFsc19pbmRzID09PSB1bmRlZmluZWQpICYmIG5vcm1hbHNfaW5kcy5sZW5ndGggPiAwKSB7XHJcblx0XHRcdFx0YWRkX2ZhY2UoIGZhY2VzWyAwIF0sIGZhY2VzWyAxIF0sIGZhY2VzWyAzIF0sIFsgbm9ybWFsc19pbmRzWyAwIF0sIG5vcm1hbHNfaW5kc1sgMSBdLCBub3JtYWxzX2luZHNbIDMgXSBdKTtcclxuXHRcdFx0XHRhZGRfZmFjZSggZmFjZXNbIDEgXSwgZmFjZXNbIDIgXSwgZmFjZXNbIDMgXSwgWyBub3JtYWxzX2luZHNbIDEgXSwgbm9ybWFsc19pbmRzWyAyIF0sIG5vcm1hbHNfaW5kc1sgMyBdIF0pO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdGFkZF9mYWNlKCBmYWNlc1sgMCBdLCBmYWNlc1sgMSBdLCBmYWNlc1sgMyBdKTtcclxuXHRcdFx0XHRhZGRfZmFjZSggZmFjZXNbIDEgXSwgZmFjZXNbIDIgXSwgZmFjZXNbIDMgXSk7XHJcblx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHJcblx0XHRcdGlmICghKHV2cyA9PT0gdW5kZWZpbmVkKSAmJiB1dnMubGVuZ3RoID4gMCkge1xyXG5cdFx0XHRcdGFkZF91dnMoIHV2c1sgMCBdLCB1dnNbIDEgXSwgdXZzWyAzIF0gKTtcclxuXHRcdFx0XHRhZGRfdXZzKCB1dnNbIDEgXSwgdXZzWyAyIF0sIHV2c1sgMyBdICk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcbn07XHJcblxyXG4vL2NvbnZpZW5jZSBmdW5jdGlvbnNcclxuZnVuY3Rpb24gdmVjdG9yKCB4LCB5LCB6ICkgeyByZXR1cm4gbmV3IFRIUkVFLlZlY3RvcjMoIHgsIHksIHogKTsgfVxyXG5mdW5jdGlvbiB1diggdSwgdiApIHsgcmV0dXJuIG5ldyBUSFJFRS5WZWN0b3IyKCB1LCB2ICk7IH1cclxuZnVuY3Rpb24gZmFjZTMoIGEsIGIsIGMsIG5vcm1hbHMgKSB7IHJldHVybiBuZXcgVEhSRUUuRmFjZTMoIGEsIGIsIGMsIG5vcm1hbHMgKTsgfVxyXG5cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gT2JqTG9hZGVyOyIsIi8vIHJlbmRlcmxvb3AuanNcclxuLy8gVGhlIG1vZHVsZSB0aGF0IGhhbmRsZXMgYWxsIHRoZSBjb21tb24gY29kZSB0byByZW5kZXIgYW5kIGRvIGdhbWUgdGlja3Mgb24gYSBtYXBcclxuXHJcbnZhciBleHRlbmQgPSByZXF1aXJlKFwiZXh0ZW5kXCIpO1xyXG52YXIgcmFmID0gcmVxdWlyZShcInJhZlwiKTtcclxudmFyIGNvbnRyb2xsZXIgPSByZXF1aXJlKFwidHBwLWNvbnRyb2xsZXJcIik7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHtcclxuXHRzdGFydCA6IGZ1bmN0aW9uKG9wdHMpIHtcclxuXHRcdC8vIFNldCB0aGUgY2FudmFzJ3MgYXR0cmlidXRlcywgYmVjYXVzZSB0aG9zZSBcclxuXHRcdC8vIEFDVFVBTExZIGRldGVybWluZSBob3cgYmlnIHRoZSByZW5kZXJpbmcgYXJlYSBpcy5cclxuXHRcdGlmICghb3B0cy5fZGlzYWJsZVRocmVlKSB7XHJcblx0XHRcdHZhciBjYW52YXMgPSAkKFwiI2dhbWVzY3JlZW5cIik7XHJcblx0XHRcdGNhbnZhcy5hdHRyKFwid2lkdGhcIiwgcGFyc2VJbnQoY2FudmFzLmNzcyhcIndpZHRoXCIpKSk7XHJcblx0XHRcdGNhbnZhcy5hdHRyKFwiaGVpZ2h0XCIsIHBhcnNlSW50KGNhbnZhcy5jc3MoXCJoZWlnaHRcIikpKTtcclxuXHRcdFx0XHJcblx0XHRcdG9wdHMgPSBleHRlbmQoe1xyXG5cdFx0XHRcdGNsZWFyQ29sb3IgOiAweDAwMDAwMCxcclxuXHRcdFx0XHR0aWNrc1BlclNlY29uZCA6IDMwLFxyXG5cdFx0XHR9LCBvcHRzKTtcclxuXHRcdFx0XHJcblx0XHRcdHdpbmRvdy50aHJlZVJlbmRlcmVyID0gbmV3IFRIUkVFLldlYkdMUmVuZGVyZXIoe1xyXG5cdFx0XHRcdGFudGlhbGlhcyA6IHRydWUsXHJcblx0XHRcdFx0Y2FudmFzIDogZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJnYW1lc2NyZWVuXCIpIFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0dGhyZWVSZW5kZXJlci5zZXRDbGVhckNvbG9ySGV4KCBvcHRzLmNsZWFyQ29sb3IgKTtcclxuXHRcdFx0dGhyZWVSZW5kZXJlci5hdXRvQ2xlYXIgPSBmYWxzZTtcclxuXHRcdFx0XHJcblx0XHRcdHRocmVlUmVuZGVyZXIuc2hhZG93TWFwRW5hYmxlZCA9IHRydWU7XHJcblx0XHRcdHRocmVlUmVuZGVyZXIuc2hhZG93TWFwVHlwZSA9IFRIUkVFLlBDRlNoYWRvd01hcDtcclxuXHRcdFx0XHJcblx0XHRcdF9yZW5kZXJIYW5kbGUgPSByYWYocmVuZGVyTG9vcCk7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdGluaXRHYW1lTG9vcCgzMCk7XHJcblx0XHRcclxuXHR9LFxyXG5cdFxyXG5cdHBhdXNlIDogZnVuY3Rpb24oKSB7XHJcblx0XHRwYXVzZWQgPSB0cnVlO1xyXG5cdFx0Ly8gX3JlbmRlckhhbmRsZSA9IG51bGw7XHJcblx0fSxcclxuXHR1bnBhdXNlIDogZnVuY3Rpb24oKSB7XHJcblx0XHRwYXVzZWQgPSBmYWxzZTtcclxuXHRcdC8vIF9yZW5kZXJIYW5kbGUgPSByYWYocmVuZGVyTG9vcCk7XHJcblx0fSxcclxufTtcclxuXHJcblxyXG52YXIgX3JlbmRlckhhbmRsZTsgXHJcbmZ1bmN0aW9uIHJlbmRlckxvb3AoKSB7XHJcblx0dGhyZWVSZW5kZXJlci5jbGVhcigpO1xyXG5cdFxyXG5cdGlmICh3aW5kb3cuY3VycmVudE1hcCAmJiBjdXJyZW50TWFwLnNjZW5lICYmIGN1cnJlbnRNYXAuY2FtZXJhKSB7XHJcblx0XHQvL1JlbmRlciB3aXRoIHRoZSBtYXAncyBhY3RpdmUgY2FtZXJhIG9uIGl0cyBhY3RpdmUgc2NlbmVcclxuXHRcdHRocmVlUmVuZGVyZXIucmVuZGVyKGN1cnJlbnRNYXAuc2NlbmUsIGN1cnJlbnRNYXAuY2FtZXJhKTtcclxuXHR9XHJcblx0XHJcblx0aWYgKFVJLnNjZW5lICYmIFVJLmNhbWVyYSkge1xyXG5cdFx0Ly9SZW5kZXIgdGhlIFVJIHdpdGggdGhlIFVJIGNhbWVyYSBhbmQgaXRzIHNjZW5lXHJcblx0XHR0aHJlZVJlbmRlcmVyLmNsZWFyKGZhbHNlLCB0cnVlLCBmYWxzZSk7IC8vQ2xlYXIgZGVwdGggYnVmZmVyXHJcblx0XHR0aHJlZVJlbmRlcmVyLnJlbmRlcihVSS5zY2VuZSwgVUkuY2FtZXJhKTtcclxuXHR9XHJcblx0XHJcblx0aWYgKF9yZW5kZXJIYW5kbGUpXHJcblx0XHRfcmVuZGVySGFuZGxlID0gcmFmKHJlbmRlckxvb3ApO1xyXG59XHJcblxyXG52YXIgcGF1c2VkID0gZmFsc2U7XHJcbmZ1bmN0aW9uIGluaXRHYW1lTG9vcCh0aWNrc1BlclNlYykge1xyXG5cdHZhciBfcmF0ZSA9IDEwMDAgLyB0aWNrc1BlclNlYztcclxuXHRcclxuXHR2YXIgYWNjdW0gPSAwO1xyXG5cdHZhciBub3cgPSAwO1xyXG5cdHZhciBsYXN0ID0gbnVsbDtcclxuXHR2YXIgZHQgPSAwO1xyXG5cdHZhciB3aG9sZVRpY2s7XHJcblx0XHJcblx0c2V0SW50ZXJ2YWwodGltZXJUaWNrLCAwKTtcclxuXHRcclxuXHRmdW5jdGlvbiB0aW1lclRpY2soKSB7XHJcblx0XHRpZiAocGF1c2VkKSB7XHJcblx0XHRcdGxhc3QgPSBEYXRlLm5vdygpO1xyXG5cdFx0XHRhY2N1bSA9IDA7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0bm93ID0gRGF0ZS5ub3coKTtcclxuXHRcdGR0ID0gbm93IC0gKGxhc3QgfHwgbm93KTtcclxuXHRcdGxhc3QgPSBub3c7XHJcblx0XHRhY2N1bSArPSBkdDtcclxuXHRcdGlmIChhY2N1bSA8IF9yYXRlKSByZXR1cm47XHJcblx0XHR3aG9sZVRpY2sgPSAoKGFjY3VtIC8gX3JhdGUpfDApO1xyXG5cdFx0aWYgKHdob2xlVGljayA8PSAwKSByZXR1cm47XHJcblx0XHRcclxuXHRcdHZhciBkZWx0YSA9IHdob2xlVGljayAvIHRpY2tzUGVyU2VjO1xyXG5cdFx0aWYgKHdpbmRvdy5jdXJyZW50TWFwICYmIGN1cnJlbnRNYXAubG9naWNMb29wKVxyXG5cdFx0XHRjdXJyZW50TWFwLmxvZ2ljTG9vcChkZWx0YSk7XHJcblx0XHRpZiAod2luZG93LlVJICYmIFVJLmxvZ2ljTG9vcClcclxuXHRcdFx0VUkubG9naWNMb29wKGRlbHRhKTtcclxuXHRcdFxyXG5cdFx0aWYgKHdpbmRvdy5jb250cm9sbGVyICYmIGNvbnRyb2xsZXIuX3RpY2spXHJcblx0XHRcdGNvbnRyb2xsZXIuX3RpY2soZGVsdGEpO1xyXG5cdFx0aWYgKHdpbmRvdy5Tb3VuZE1hbmFnZXIgJiYgU291bmRNYW5hZ2VyLl90aWNrKVxyXG5cdFx0XHRTb3VuZE1hbmFnZXIuX3RpY2soZGVsdGEpO1xyXG5cdFx0XHJcblx0XHR3aG9sZVRpY2sgKj0gX3JhdGU7XHJcblx0XHRhY2N1bSAtPSB3aG9sZVRpY2s7XHJcblx0fVxyXG59IiwiLy8gcG9seWZpbGwuanNcclxuLy8gRGVmaW5lcyBzb21lIHBvbHlmaWxscyBuZWVkZWQgZm9yIHRoZSBnYW1lIHRvIGZ1bmN0aW9uLlxyXG5cclxuLy8gU3RyaW5nLnN0YXJ0c1dpdGgoKVxyXG4vLyBcclxuaWYgKCFTdHJpbmcucHJvdG90eXBlLnN0YXJ0c1dpdGgpIHtcclxuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkoU3RyaW5nLnByb3RvdHlwZSwgJ3N0YXJ0c1dpdGgnLCB7XHJcblx0XHRlbnVtZXJhYmxlOiBmYWxzZSxcclxuXHRcdGNvbmZpZ3VyYWJsZTogZmFsc2UsXHJcblx0XHR3cml0YWJsZTogZmFsc2UsXHJcblx0XHR2YWx1ZTogZnVuY3Rpb24oc2VhcmNoU3RyaW5nLCBwb3NpdGlvbikge1xyXG5cdFx0XHRwb3NpdGlvbiA9IHBvc2l0aW9uIHx8IDA7XHJcblx0XHRcdHJldHVybiB0aGlzLmxhc3RJbmRleE9mKHNlYXJjaFN0cmluZywgcG9zaXRpb24pID09PSBwb3NpdGlvbjtcclxuXHRcdH1cclxuXHR9KTtcclxufVxyXG5cclxuaWYgKCFTdHJpbmcucHJvdG90eXBlLmVuZHNXaXRoKSB7XHJcblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KFN0cmluZy5wcm90b3R5cGUsICdlbmRzV2l0aCcsIHtcclxuXHRcdGVudW1lcmFibGU6IGZhbHNlLFxyXG5cdFx0Y29uZmlndXJhYmxlOiBmYWxzZSxcclxuXHRcdHdyaXRhYmxlOiBmYWxzZSxcclxuXHRcdHZhbHVlOiBmdW5jdGlvbihzZWFyY2hTdHJpbmcsIHBvc2l0aW9uKSB7XHJcblx0XHRcdHZhciBzdWJqZWN0U3RyaW5nID0gdGhpcy50b1N0cmluZygpO1xyXG5cdFx0XHRpZiAocG9zaXRpb24gPT09IHVuZGVmaW5lZCB8fCBwb3NpdGlvbiA+IHN1YmplY3RTdHJpbmcubGVuZ3RoKSB7XHJcblx0XHRcdFx0cG9zaXRpb24gPSBzdWJqZWN0U3RyaW5nLmxlbmd0aDtcclxuXHRcdFx0fVxyXG5cdFx0XHRwb3NpdGlvbiAtPSBzZWFyY2hTdHJpbmcubGVuZ3RoO1xyXG5cdFx0XHR2YXIgbGFzdEluZGV4ID0gc3ViamVjdFN0cmluZy5pbmRleE9mKHNlYXJjaFN0cmluZywgcG9zaXRpb24pO1xyXG5cdFx0XHRyZXR1cm4gbGFzdEluZGV4ICE9PSAtMSAmJiBsYXN0SW5kZXggPT09IHBvc2l0aW9uO1xyXG5cdFx0fVxyXG5cdH0pO1xyXG59XHJcblxyXG4vLyBFdmVudFRhcmdldC5vbigpIGFuZCBFdmVudFRhcmdldC5lbWl0KClcclxuLy8gQWRkaW5nIHRoaXMgdG8gYWxsb3cgZG9tIGVsZW1lbnRzIGFuZCBvYmplY3RzIHRvIHNpbXBseSBoYXZlIFwib25cIiBhbmQgXCJlbWl0XCIgdXNlZCBsaWtlIG5vZGUuanMgb2JqZWN0cyBjYW5cclxuaWYgKCFFdmVudFRhcmdldC5wcm90b3R5cGUub24pIHtcclxuXHRFdmVudFRhcmdldC5wcm90b3R5cGUub24gPSBFdmVudFRhcmdldC5wcm90b3R5cGUuYWRkRXZlbnRMaXN0ZW5lcjtcclxuXHRFdmVudFRhcmdldC5wcm90b3R5cGUuZW1pdCA9IEV2ZW50VGFyZ2V0LnByb3RvdHlwZS5kaXNwYXRjaEV2ZW50O1xyXG59XHJcblxyXG4vLyBNYXRoLmNsYW1wKClcclxuLy8gXHJcbmlmICghTWF0aC5jbGFtcCkge1xyXG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShNYXRoLCBcImNsYW1wXCIsIHtcclxuXHRcdGVudW1lcmFibGU6IGZhbHNlLFxyXG5cdFx0Y29uZmlndXJhYmxlOiBmYWxzZSxcclxuXHRcdHdyaXRhYmxlOiBmYWxzZSxcclxuXHRcdHZhbHVlOiBmdW5jdGlvbihudW0sIG1pbiwgbWF4KSB7XHJcblx0XHRcdG1pbiA9IChtaW4gIT09IHVuZGVmaW5lZCk/IG1pbjowO1xyXG5cdFx0XHRtYXggPSAobWF4ICE9PSB1bmRlZmluZWQpPyBtYXg6MTtcclxuXHRcdFx0cmV0dXJuIE1hdGgubWluKE1hdGgubWF4KG51bSwgbWluKSwgbWF4KTtcclxuXHRcdH1cclxuXHR9KTtcclxufVxyXG5cclxuLy8gQXJyYXkudG9wXHJcbi8vIFByb3ZpZGVzIGVhc3kgYWNjZXNzIHRvIHRoZSBcInRvcFwiIG9mIGEgc3RhY2ssIG1hZGUgd2l0aCBwdXNoKCkgYW5kIHBvcCgpXHJcbmlmICghQXJyYXkucHJvdG90eXBlLnRvcCkge1xyXG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShBcnJheS5wcm90b3R5cGUsIFwidG9wXCIsIHtcclxuXHRcdGVudW1lcmFibGU6IGZhbHNlLFxyXG5cdFx0Y29uZmlndXJhYmxlOiBmYWxzZSxcclxuXHRcdC8vIHNldDogZnVuY3Rpb24oKXt9LFxyXG5cdFx0Z2V0OiBmdW5jdGlvbigpe1xyXG5cdFx0XHRyZXR1cm4gdGhpc1t0aGlzLmxlbmd0aC0xXTtcclxuXHRcdH0sXHJcblx0fSk7XHJcbn1cclxuXHJcblxyXG4vLyBNb2RpZmljYXRpb25zIHRvIFRIUkVFLmpzXHJcbmlmICh3aW5kb3cuVEhSRUUpIHtcclxuXHQvLyBWZWN0b3IzLnNldCgpLCBtb2RpZmllZCB0byBhY2NlcHQgYW5vdGhlciBWZWN0b3IzXHJcblx0VEhSRUUuVmVjdG9yMy5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24oeCwgeSwgeikge1xyXG5cdFx0aWYgKHggaW5zdGFuY2VvZiBUSFJFRS5WZWN0b3IzKSB7XHJcblx0XHRcdHRoaXMueCA9IHgueDsgdGhpcy55ID0geC55OyB0aGlzLnogPSB4Lno7XHJcblx0XHRcdHJldHVybiB0aGlzO1xyXG5cdFx0fVxyXG5cdFx0aWYgKHggaW5zdGFuY2VvZiBUSFJFRS5WZWN0b3IyKSB7XHJcblx0XHRcdHRoaXMueCA9IHgueDsgdGhpcy55ID0geC55OyB0aGlzLnogPSAwO1xyXG5cdFx0XHRyZXR1cm4gdGhpcztcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0dGhpcy54ID0geDsgdGhpcy55ID0geTsgdGhpcy56ID0gejtcclxuXHRcdHJldHVybiB0aGlzO1xyXG5cdH07XHJcblx0XHJcblx0Ly8gQWxzbyBmb3IgVmVjdG9yMlxyXG5cdFRIUkVFLlZlY3RvcjIucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uKHgsIHkpIHtcclxuXHRcdGlmICh4IGluc3RhbmNlb2YgVEhSRUUuVmVjdG9yMikge1xyXG5cdFx0XHR0aGlzLnggPSB4Lng7IHRoaXMueSA9IHgueTtcclxuXHRcdFx0cmV0dXJuIHRoaXM7XHJcblx0XHR9XHJcblx0XHRpZiAoeCBpbnN0YW5jZW9mIFRIUkVFLlZlY3RvcjMpIHtcclxuXHRcdFx0dGhpcy54ID0geC54OyB0aGlzLnkgPSB4Lnk7XHJcblx0XHRcdHJldHVybiB0aGlzO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHR0aGlzLnggPSB4OyB0aGlzLnkgPSB5O1xyXG5cdFx0cmV0dXJuIHRoaXM7XHJcblx0fTtcclxufVxyXG5cclxuXHJcbiJdfQ==
